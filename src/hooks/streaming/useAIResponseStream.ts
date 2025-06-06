import { useCallback } from 'react';
import { RunResponse, StreamOptions } from '@/types/playground';
import { supabase } from '@/supabaseClient';

/**
 * Fungsi untuk mem-parse buffer streaming dan mengekstrak JSON RunResponse yang lengkap
 * @param buffer - Buffer string dari streaming response
 * @param onChunk - Callback untuk memproses setiap chunk RunResponse yang valid
 * @returns Remaining buffer yang belum bisa di-parse
 */
function parseBuffer(buffer: string, onChunk: (chunk: RunResponse) => void): string {
  let jsonStartIndex = buffer.indexOf('{');
  let jsonEndIndex = -1;
  
  while (jsonStartIndex !== -1) {
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = jsonStartIndex; i < buffer.length; i++) {
      const char = buffer[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      if (braceCount === 0) {
        jsonEndIndex = i;
        break;
      }
    }
    
    if (jsonEndIndex !== -1) {
      const jsonString = buffer.slice(jsonStartIndex, jsonEndIndex + 1);
      
      try {
        const parsed = JSON.parse(jsonString) as RunResponse;
        processChunk(parsed, onChunk);
      } catch (parseError) {
        console.warn('Failed to parse JSON chunk:', parseError);
        console.warn('Invalid JSON:', jsonString.substring(0, 100));
        break;
      }
      
      buffer = buffer.slice(jsonEndIndex + 1).trim();
      jsonStartIndex = buffer.indexOf('{');
      jsonEndIndex = -1;
    } else {
      break;
    }
  }
  
  return buffer;
}

/**
 * Memproses chunk RunResponse yang sudah di-parse
 * @param chunk - RunResponse chunk yang valid
 * @param onChunk - Callback untuk memproses chunk
 */
function processChunk(chunk: RunResponse, onChunk: (chunk: RunResponse) => void) {
  // Validasi basic chunk
  if (!chunk || typeof chunk !== 'object') {
    console.warn('Invalid chunk received:', chunk);
    return;
  }
  
  // Log chunk dengan detail event untuk debugging StreamingStatus sync
  console.log('Processing chunk:', {
    event: chunk.event,
    event_type: typeof chunk.event,
    content_preview: typeof chunk.content === 'string' 
      ? chunk.content.substring(0, 50) + (chunk.content.length > 50 ? '...' : '')
      : typeof chunk.content,
    session_id: chunk.session_id,
    has_tools: chunk.tools && chunk.tools.length > 0,
    tool_names: chunk.tools?.map(t => t.function?.name).join(', '),
    has_extra_data: !!chunk.extra_data,
    has_reasoning: chunk.extra_data?.reasoning_steps && chunk.extra_data.reasoning_steps.length > 0
  });
  
  // Log specific events for StreamingStatus synchronization
  switch (chunk.event) {
    case 'RunStarted':
    case 'ReasoningStarted':
      console.log('🧠 Thinking phase detected:', chunk.event);
      break;
    case 'ToolCallStarted':
      console.log('🔧 Tool call phase detected:', chunk.tools?.map(t => t.function?.name).join(', '));
      break;
    case 'AccessingKnowledge':
      console.log('📚 Knowledge access phase detected');
      break;
    case 'UpdatingMemory':
      console.log('💾 Memory update phase detected');
      break;
    case 'RunResponse':
      console.log('📝 Content generation phase:', chunk.content?.length || 0, 'chars');
      break;
    case 'RunCompleted':
      console.log('✅ Completion phase detected');
      break;
    case 'ToolCallCompleted':
      console.log('🔧✅ Tool call completed');
      break;
    case 'ReasoningStep':
      console.log('🤔 Reasoning step received');
      break;
    case 'ReasoningCompleted':
      console.log('🤔✅ Reasoning completed');
      break;
    case 'RunError':
      console.log('❌ Error phase detected:', chunk.content);
      break;
    default:
      console.log('❓ Unknown event detected:', chunk.event);
      break;
  }
  
  onChunk(chunk);
}

/**
 * Hook untuk menangani streaming response dari AGNO API
 * Menggunakan fetch + ReadableStream untuk mem-parse SSE-like streaming
 */
export default function useAIResponseStream() {
  
  /**
   * Mengirim request streaming ke API dan memproses response secara real-time
   * @param options - Konfigurasi streaming termasuk URL, body, dan callbacks
   */
  const streamResponse = useCallback(async (options: StreamOptions) => {
    const { apiUrl, requestBody, onChunk, onError, onComplete } = options;
    
    let buffer = '';
    let controller: AbortController | null = null;
    
    try {
      console.log('Starting stream request to:', apiUrl);
      
      // Setup AbortController untuk timeout dan cleanup
      controller = new AbortController();
      const timeoutId = setTimeout(() => {
        if (controller) {
          controller.abort();
        }
      }, 1800000); // 30 menit timeout
      
      // Setup headers dengan API key dan authentication
      const headers: HeadersInit = {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      };
      
      // Add API key authentication
      const API_KEY = import.meta.env.VITE_API_KEY;
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
        console.log('Using API key for streaming authentication');
      } else {
        console.warn('No API key provided for streaming, request may fail');
      }
      
      // Add Supabase authentication if available
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: requestBody,
        signal: controller.signal,
        headers,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}. ${errorText}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null - streaming not supported');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      console.log('Stream connection established, starting to read chunks...');
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream completed normally');
            break;
          }
          
          // Decode chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Parse complete JSON objects from buffer
          buffer = parseBuffer(buffer, onChunk);
        }
      } finally {
        reader.releaseLock();
      }
      
      // Process any remaining buffer content
      if (buffer.trim()) {
        console.log('Processing remaining buffer:', buffer.substring(0, 100));
        parseBuffer(buffer, onChunk);
      }
      
      onComplete();
      
    } catch (error) {
      console.error('Stream error:', error);
      
      if (controller?.signal.aborted) {
        onError(new Error('Stream request timed out'));
      } else if (error instanceof Error && error.message.includes('ERR_INCOMPLETE_CHUNKED_ENCODING')) {
        // Ini bukan error fatal - server sudah selesai mengirim data tapi connection tidak ditutup gracefully
        console.log('Stream completed with incomplete chunked encoding (normal for this API)');
        onComplete(); // Treat sebagai completion normal
      } else if (error instanceof Error) {
        onError(error);
      } else {
        onError(new Error(String(error)));
      }
    }
  }, []);
  
  return {
    streamResponse
  };
} 