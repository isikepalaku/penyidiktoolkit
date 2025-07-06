/**
 * Tipidter Streaming Service
 * Service untuk menangani streaming chat AI untuk tindak pidana tertentu dengan support file upload
 * Menggunakan AGNO streaming API dengan real-time response dan mixed mode untuk file upload
 */

import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';
import {
  RunEvent,
  RunResponse,
  PlaygroundChatMessage
} from '@/types/playground';

const API_KEY = import.meta.env.VITE_API_KEY;

const FETCH_TIMEOUT = 1800000; // 30 menit untuk file besar
const API_BASE_URL = env.apiUrl || 'https://api.reserse.id';
const AGENT_ID = 'tipidter-chat';

// Store session ID
let currentSessionId: string | null = null;
// Store user ID yang persisten
let currentUserId: string | null = null;

// Event emitter untuk streaming events
type StreamEventCallback = (event: RunResponse) => void;
let streamEventCallbacks: StreamEventCallback[] = [];

// Progress tracking untuk file upload
type ProgressCallback = (progress: { status: string; percent: number }) => void;
let progressCallbacks: ProgressCallback[] = [];



export const onStreamEvent = (callback: StreamEventCallback) => {
  streamEventCallbacks.push(callback);
  return () => {
    streamEventCallbacks = streamEventCallbacks.filter(cb => cb !== callback);
  };
};

export const onProgress = (callback: ProgressCallback) => {
  progressCallbacks.push(callback);
  return () => {
    progressCallbacks = progressCallbacks.filter(cb => cb !== callback);
  };
};

const emitStreamEvent = (event: RunResponse) => {
  streamEventCallbacks.forEach(callback => {
    callback(event);
  });
};

const emitProgress = (progress: { status: string; percent: number }) => {
  progressCallbacks.forEach(callback => {
    callback(progress);
  });
};

/**
 * Fungsi untuk mem-parse buffer streaming dan mengekstrak JSON RunResponse yang lengkap
 */
function parseStreamBuffer(buffer: string, onChunk: (chunk: RunResponse) => void): string {
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
        onChunk(parsed);
      } catch (parseError) {
        console.warn('Failed to parse JSON chunk:', parseError);
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

const parseResponse = async (response: Response) => {
  const text = await response.text();
  console.log('🔍 TIPIDTER: Raw response text:', text.substring(0, 200) + '...');
  
  try {
    // First try to parse as JSON
    const parsed = JSON.parse(text);
    console.log('🔍 TIPIDTER: Parsed JSON response:', parsed);
    
    // If response contains a 'response' field with RunResponse format, extract content
    if (parsed.response && typeof parsed.response === 'string') {
      const runResponseContent = extractContentFromRunResponse(parsed.response);
      if (runResponseContent) {
        console.log('🔍 TIPIDTER: Extracted content from RunResponse:', runResponseContent.substring(0, 100) + '...');
        return { content: runResponseContent, ...parsed };
      }
    }
    
    return parsed;
  } catch (error) {
    // If JSON parsing fails, handle text response
    console.log('🔍 TIPIDTER: Response is not JSON, processing as text:', text.substring(0, 100) + '...');
    console.error('JSON parse error:', error);
    
    // Try to extract content from RunResponse format directly
    const runResponseContent = extractContentFromRunResponse(text);
    if (runResponseContent) {
      console.log('🔍 TIPIDTER: Extracted content from text RunResponse:', runResponseContent.substring(0, 100) + '...');
      return { content: runResponseContent };
    }
    
    // If the text contains multiple JSON objects, try to parse the first one
    const jsonMatch = text.match(/\{.*?\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error('Failed to parse matched JSON:', error);
      }
    }
    
    // If all parsing fails, return text as content
    return { content: text };
  }
};

// Helper function to extract content from RunResponse(content='...') format
const extractContentFromRunResponse = (runResponseStr: string): string | null => {
  try {
    // Match content='...' pattern, handling escaped quotes
    const contentMatch = runResponseStr.match(/content='([^']*(?:\\'[^']*)*)'/);
    if (contentMatch && contentMatch[1]) {
      // Unescape any escaped quotes
      const content = contentMatch[1].replace(/\\'/g, "'");
      console.log('🔍 TIPIDTER: Content extraction successful, length:', content.length);
      return content;
    }
    
    // Fallback: try with double quotes
    const doubleQuoteMatch = runResponseStr.match(/content="([^"]*(?:\\"[^']*)*)"/);
    if (doubleQuoteMatch && doubleQuoteMatch[1]) {
      const content = doubleQuoteMatch[1].replace(/\\"/g, '"');
      console.log('🔍 TIPIDTER: Content extraction (double quotes) successful, length:', content.length);
      return content;
    }
    
    console.warn('🔍 TIPIDTER: Could not extract content from RunResponse format');
    return null;
  } catch (error) {
    console.error('🔍 TIPIDTER: Error extracting content from RunResponse:', error);
    return null;
  }
};

// Interface untuk respon pesan chat
export interface ChatResponse {
  text: string;
  sourceDocuments?: Array<{
    pageContent: string;
    metadata: Record<string, string>;
  }>;
  error?: boolean | string;
}

// Interface untuk respon streaming chat
export interface StreamingChatResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

// Inisialisasi session streaming
export const initializeStreamingSession = async () => {
  try {
    // Get current user dari Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Use user.id sebagai consistent user identifier
      currentUserId = user.id;
      console.log('🔑 TIPIDTER: Using Supabase user ID as currentUserId:', currentUserId);
    } else {
      // Fallback jika tidak ada user, gunakan stored ID atau generate baru
      const storedUserId = localStorage.getItem('tipidter_user_id');
      if (storedUserId) {
        currentUserId = storedUserId;
        console.log('🔑 TIPIDTER: Using stored user ID:', currentUserId);
      } else {
        currentUserId = uuidv4();
        localStorage.setItem('tipidter_user_id', currentUserId);
        console.log('🔑 TIPIDTER: Generated new user ID:', currentUserId);
      }
    }

    // Generate new session ID setiap kali initialize
    currentSessionId = uuidv4();
    console.log('🎯 TIPIDTER: Session initialized', { 
      sessionId: currentSessionId, 
      userId: currentUserId?.substring(0, 8) + '...',  // Log partial ID for privacy
      timestamp: new Date().toISOString()
    });
    
    // Store session creation time untuk cleanup
    localStorage.setItem('tipidter_session_created', Date.now().toString());
    
    return { sessionId: currentSessionId, userId: currentUserId };
  } catch (error) {
    console.error('Error initializing TIPIDTER session:', error);
    throw error;
  }
};

// Hapus history chat tapi pertahankan user ID
export const clearStreamingChatHistory = () => {
  // Hanya generate session ID baru, pertahankan user ID yang sama
  currentSessionId = uuidv4();
  console.log('🧹 TIPIDTER: Chat history cleared, new session ID generated:', currentSessionId);
  
  // Update session creation time
  localStorage.setItem('tipidter_session_created', Date.now().toString());
};

// Kirim pesan chat dengan streaming
export const sendStreamingChatMessage = async (
  message: string, 
  files?: File[],
  onEvent?: (event: RunResponse) => void
): Promise<StreamingChatResponse> => {
  try {
    if (!currentSessionId || !currentUserId) {
      console.log('🔄 TIPIDTER: Session not initialized, initializing now...');
      await initializeStreamingSession();
    }

    if (!API_KEY) {
      throw new Error('API key tidak ditemukan');
    }

    console.log('📤 TIPIDTER: Sending streaming message', {
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      message_length: message.length,
      files_count: files?.length || 0,
      session_id: currentSessionId,
      user_id: currentUserId?.substring(0, 8) + '...',  // Log partial ID for privacy
      agent_id: AGENT_ID
    });

    const isFileUpload = files && files.length > 0;
    
    let requestUrl: string;
    let requestBody: BodyInit;
    
    console.log('📤 TIPIDTER: Preparing request...', {
      messageLength: message.trim().length,
      hasFiles: isFileUpload,
      fileCount: isFileUpload ? files!.length : 0,
      sessionId: currentSessionId || '[EMPTY]',
      userId: currentUserId
    });

    // Set base headers
    const headers: HeadersInit = {
      'X-API-Key': API_KEY || '',
      'X-User-ID': currentUserId || '',
    };

    // Authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    if (isFileUpload && files && files.length > 0) {
      // Mode 1: File upload dengan JSON response
      console.log('📁 TIPIDTER: Using file upload mode (JSON response)');
      
      // Use runs-with-files endpoint
      requestUrl = `${API_BASE_URL}/v1/playground/agents/${AGENT_ID}/runs-with-files`;
      
      const formData = new FormData();
      
      // Add required fields
      formData.append('message', message.trim());
      formData.append('agent_id', AGENT_ID);
      formData.append('stream', 'false'); // JSON response for file upload
      formData.append('monitor', 'false');
      formData.append('session_id', currentSessionId || '');
      formData.append('user_id', currentUserId || '');

      console.log('📁 TIPIDTER: Attaching files to FormData:');
      for (const file of files) {
        console.log(`📎 File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, ${file.type})`);
        formData.append('files', file);
      }

      requestBody = formData;
      
      // Set headers for JSON response
      headers['Accept'] = 'application/json';
      
      // Emit progress for file upload
      emitProgress({ status: 'uploading', percent: 30 });
      
      // Note: Don't set Content-Type for FormData, let browser handle it
    } else {
      // Mode 2: Streaming chat tanpa file
      console.log('💬 TIPIDTER: Using streaming chat mode (no files)');
      
      // Use regular runs endpoint
      requestUrl = `${API_BASE_URL}/v1/playground/agents/${AGENT_ID}/runs`;
      
      const formData = new FormData();
      
      // Pastikan selalu ada pesan yang dikirim
      const messageToSend = message.trim();
      if (!messageToSend) {
        throw new Error('Pesan tidak boleh kosong');
      }
      
      // Append FormData parameters untuk chat streaming
      formData.append('message', messageToSend);
      formData.append('agent_id', AGENT_ID);
      formData.append('stream', 'true'); // Streaming response for chat
      formData.append('monitor', 'false');
      formData.append('session_id', currentSessionId || '');
      formData.append('user_id', currentUserId || '');

      requestBody = formData;
      
      // Set headers for streaming
      headers['Accept'] = 'text/event-stream';
      headers['Cache-Control'] = 'no-cache';
      
      // Note: Don't set Content-Type for FormData, let browser handle it
    }

    console.log('🌐 TIPIDTER: Making request to:', requestUrl);
    console.log('📋 TIPIDTER: Request headers:', {
      ...headers,
      'X-API-Key': headers['X-API-Key'] ? '***masked***' : 'missing',
      'X-User-ID': headers['X-User-ID']?.substring(0, 8) + '...' || 'missing'
    });

    // Timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('⏰ TIPIDTER: Request timeout after', FETCH_TIMEOUT / 1000, 'seconds');
      controller.abort();
    }, FETCH_TIMEOUT);

    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📨 TIPIDTER: Response received', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        isStreamingResponse: response.headers.get('content-type')?.includes('text/plain')
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ TIPIDTER: API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      if (isFileUpload) {
        // Handle JSON response for file uploads
        console.log('📁 TIPIDTER: Processing JSON response for file upload...');
        emitProgress({ status: 'processing', percent: 70 });
        
        const data = await parseResponse(response);
        console.log('📁 TIPIDTER: File upload response:', data);
        
        // Convert JSON response to streaming events for consistency
        const runStartedEvent: RunResponse = {
          event: RunEvent.RunStarted,
          content: '',
          session_id: data.session_id || currentSessionId,
          created_at: Math.floor(Date.now() / 1000)
        };
        
        const runResponseEvent: RunResponse = {
          event: RunEvent.RunResponse,
          content: data.content || data.message || 'No response received',
          session_id: data.session_id || currentSessionId,
          created_at: Math.floor(Date.now() / 1000),
          extra_data: data.extra_data || undefined
        };
        
        const runCompletedEvent: RunResponse = {
          event: RunEvent.RunCompleted,
          content: data.content || data.message || 'No response received',
          session_id: data.session_id || currentSessionId,
          created_at: Math.floor(Date.now() / 1000),
          extra_data: data.extra_data || undefined
        };

        // Emit events with delay for smooth UX
        console.log('🔄 TIPIDTER: About to emit synthetic events for file upload');
        console.log('🔄 onEvent callback provided:', typeof onEvent);
        
        setTimeout(() => {
          console.log('📤 TIPIDTER: Emitting RunStarted event');
          emitStreamEvent(runStartedEvent);
          if (onEvent) {
            console.log('📤 Calling onEvent with RunStarted');
            onEvent(runStartedEvent);
          }
        }, 100);
        
        setTimeout(() => {
          console.log('📤 TIPIDTER: Emitting RunResponse event with content:', runResponseEvent.content?.substring(0, 50) + '...');
          emitStreamEvent(runResponseEvent);
          if (onEvent) {
            console.log('📤 Calling onEvent with RunResponse');
            onEvent(runResponseEvent);
          }
        }, 200);
        
        setTimeout(() => {
          console.log('📤 TIPIDTER: Emitting RunCompleted event');
          emitStreamEvent(runCompletedEvent);
          if (onEvent) {
            console.log('📤 Calling onEvent with RunCompleted');
            onEvent(runCompletedEvent);
          }
          emitProgress({ status: 'completed', percent: 100 });
        }, 300);

        // Update session ID if provided
        if (data.session_id && data.session_id !== currentSessionId) {
          currentSessionId = data.session_id;
        }

        return {
          success: true,
          sessionId: currentSessionId || undefined
        };
        
      } else {
        // Handle streaming response for chat
        console.log('💬 TIPIDTER: Processing streaming response for chat...');
        
        if (!response.body) {
          throw new Error('Response body is null - streaming not supported');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let hasReceivedData = false;

        console.log('🌊 TIPIDTER: Stream connection established, starting to read chunks...');

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('✅ TIPIDTER: Streaming completed normally');
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            hasReceivedData = true;

            // Parse buffer dan emit events
            buffer = parseStreamBuffer(buffer, (parsedChunk) => {
              console.log('🎯 TIPIDTER: Parsed streaming chunk:', {
                event: parsedChunk.event,
                contentType: typeof parsedChunk.content,
                contentLength: typeof parsedChunk.content === 'string' ? parsedChunk.content.length : 0,
                hasExtraData: !!parsedChunk.extra_data,
                sessionId: parsedChunk.session_id
              });

              // Emit to internal handlers
              emitStreamEvent(parsedChunk);

              // Call external handler if provided
              if (onEvent) {
                console.log('🎯 Calling onEvent with streaming chunk:', parsedChunk.event);
                onEvent(parsedChunk);
              }

              // Update session ID if provided
              if (parsedChunk.session_id && parsedChunk.session_id !== currentSessionId) {
                currentSessionId = parsedChunk.session_id;
              }
            });
          }
          
          // Process any remaining buffer content
          if (buffer.trim()) {
            parseStreamBuffer(buffer, (parsedChunk) => {
              emitStreamEvent(parsedChunk);
              if (onEvent) {
                onEvent(parsedChunk);
              }
            });
          }
          
          if (!hasReceivedData) {
            console.warn('⚠️ TIPIDTER: No data received from streaming response');
          }
          
          return { 
            success: true, 
            sessionId: currentSessionId || undefined 
          };
        } finally {
          reader.releaseLock();
        }
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('⏰ TIPIDTER: Request aborted due to timeout');
        throw new Error('Request timeout - silakan coba lagi dengan file yang lebih kecil atau koneksi yang lebih stabil');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ TIPIDTER: Error in sendStreamingChatMessage:', error);
    
    if (error instanceof Error) {
      // Handle specific errors
      if (error.message.includes('timeout') || error.message.includes('aborted')) {
        throw new Error('Request timeout. Silakan coba lagi dengan file yang lebih kecil atau periksa koneksi internet Anda.');
      }
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network error. Silakan periksa koneksi internet Anda dan coba lagi.');
      }
      
      throw error;
    }
    
    throw new Error('Unknown error occurred');
  }
};

// Legacy function untuk backward compatibility
export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  console.warn('⚠️ TIPIDTER: Using legacy sendChatMessage, consider migrating to streaming');
  
  try {
    await sendStreamingChatMessage(message);
    return { text: 'Streaming response - check stream events for actual content' };
  } catch (error) {
    console.error('Error in legacy sendChatMessage:', error);
    throw error;
  }
};

// Utilitas untuk mengkonversi streaming events ke format messages
export const convertStreamingEventsToMessages = (
  _events: RunResponse[]
): PlaygroundChatMessage[] => {
  const messages: PlaygroundChatMessage[] = [];
  
  // TODO: Process events dan convert ke messages
  // Implementation would depend on specific event structure
  // For now, return empty array as this is a utility function for future use
  
  return messages;
};

// Get current session info
export const getCurrentStreamingSession = () => ({
  sessionId: currentSessionId,
  userId: currentUserId,
  agentId: AGENT_ID
}); 