/**
 * TIPIDKOR AI Streaming Service
 * Service untuk menangani streaming chat AI untuk bidang tindak pidana korupsi
 * Menggunakan AGNO streaming API dengan real-time response
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
const API_BASE_URL = env.apiUrl || 'https://api.reserse.id';
const AGENT_ID = 'tipidkor-chat';
const FETCH_TIMEOUT = 1800000; // 30 menit untuk file sangat besar

// Store session ID
let currentSessionId: string | null = null;
// Store user ID yang persisten
let currentUserId: string | null = null;

// Event emitter untuk streaming events
type StreamEventCallback = (event: RunResponse) => void;
let streamEventCallbacks: StreamEventCallback[] = [];

export const onStreamEvent = (callback: StreamEventCallback) => {
  streamEventCallbacks.push(callback);
  return () => {
    streamEventCallbacks = streamEventCallbacks.filter(cb => cb !== callback);
  };
};

const emitStreamEvent = (event: RunResponse) => {
  streamEventCallbacks.forEach(callback => {
    callback(event);
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

/**
 * Membuat session ID baru jika belum ada
 */
export const initializeTipidkorStreamingSession = async () => {
  // Cek apakah pengguna login dengan Supabase
  const { data: { session } } = await supabase.auth.getSession();
  
  // Jika pengguna login, gunakan Supabase user ID
  if (session?.user?.id) {
    currentUserId = session.user.id;
    console.log('TIPIDKOR STREAMING: Using authenticated user ID:', currentUserId);
  } 
  // Jika tidak ada session Supabase, gunakan UUID
  else if (!currentUserId) {
    currentUserId = `anon_${uuidv4()}`;
    console.log('TIPIDKOR STREAMING: Created new anonymous user ID:', currentUserId);
  }
  
  // Buat session ID baru untuk percakapan jika belum ada
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    console.log('TIPIDKOR STREAMING: Created new session ID:', currentSessionId);
  }
};

/**
 * Menghapus session ID untuk memulai percakapan baru
 */
export const clearTipidkorStreamingChatHistory = () => {
  console.log('TIPIDKOR STREAMING: Clearing chat history and session');
  currentSessionId = null;
  // Tetap mempertahankan user ID untuk konsistensi
  console.log('TIPIDKOR STREAMING: Kept user ID:', currentUserId);
};

/**
 * Interface untuk respon streaming chat
 */
export interface TipidkorStreamingChatResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * Mengirim pesan chat ke API menggunakan streaming
 * @param message Pesan teks yang dikirim pengguna
 * @param onEvent Callback untuk menangani streaming events
 * @returns Promise dengan respons dari API
 */
export const sendTipidkorStreamingChatMessage = async (
  message: string, 
  onEvent?: (event: RunResponse) => void
): Promise<TipidkorStreamingChatResponse> => {
  try {
    // Generate or retrieve user ID (required)
    if (!currentUserId) {
      await initializeTipidkorStreamingSession();
    }
    
    // Double-check user ID after initialization
    if (!currentUserId) {
      throw new Error('Tidak dapat menginisialisasi user ID');
    }
    
    // Session ID can be empty for new sessions, following Agent UI pattern
    if (!currentSessionId) {
      console.log('No session ID found, will be created by API');
    }
    
    console.log('Starting TIPIDKOR streaming chat request');
    
    const formData = new FormData();
    
    // Pastikan selalu ada pesan yang dikirim
    const messageToSend = message.trim();
    if (!messageToSend) {
      throw new Error('Pesan tidak boleh kosong');
    }
    
    // Append FormData parameters - chat only mode
    formData.append('message', messageToSend);
    formData.append('agent_id', AGENT_ID);
    formData.append('stream', 'true'); // Always streaming for chat
    formData.append('session_id', currentSessionId || '');
    formData.append('user_id', currentUserId);
    formData.append('monitor', 'false');

    // Set headers untuk streaming
    const headers: HeadersInit = {
      'X-User-ID': currentUserId,
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    };
    
    // Menambahkan informasi autentikasi
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
      console.log('Using API key for authentication');
    } else {
      console.warn('No API key provided, request may fail');
    }

    // Gunakan endpoint streaming untuk chat
    const url = `${API_BASE_URL}/v1/playground/agents/${AGENT_ID}/runs`;
    
    console.log('Sending TIPIDKOR streaming request to:', url);
    
    // Debug message info
    console.log('Request summary:', {
      message_length: messageToSend.length,
      session_id: currentSessionId || '[EMPTY]',
      user_id: currentUserId,
      is_authenticated: currentUserId.startsWith('anon_') ? false : true,
      mode: 'tipidkor_chat_streaming'
    });

    // Setup AbortController untuk timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        
        if (response.status === 429) {
          throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
        }
        
        if (response.status === 413) {
          throw new Error('File terlalu besar. Harap gunakan file dengan ukuran lebih kecil.');
        }
        
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}. ${errorText}`);
      }

      // Handle streaming response only (no file uploads)

      if (!response.body) {
        throw new Error('Response body is null - streaming not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      console.log('TIPIDKOR stream connection established, starting to read chunks...');

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('TIPIDKOR stream completed normally');
            break;
          }

          // Decode chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Parse complete JSON objects from buffer
          buffer = parseStreamBuffer(buffer, (parsedChunk: RunResponse) => {
            console.log('TIPIDKOR streaming chunk received:', {
              event: parsedChunk.event,
              content_preview: typeof parsedChunk.content === 'string' 
                ? parsedChunk.content.substring(0, 50)
                : typeof parsedChunk.content,
              session_id: parsedChunk.session_id
            });

            // Emit to internal handlers
            emitStreamEvent(parsedChunk);

            // Call external handler if provided
            if (onEvent) {
              onEvent(parsedChunk);
            }

            // Update session ID if provided
            if (parsedChunk.session_id && parsedChunk.session_id !== currentSessionId) {
              currentSessionId = parsedChunk.session_id;
            }
          });
        }
      } finally {
        reader.releaseLock();
      }

      // Process any remaining buffer content
      if (buffer.trim()) {
        parseStreamBuffer(buffer, (parsedChunk: RunResponse) => {
          emitStreamEvent(parsedChunk);
          if (onEvent) {
            onEvent(parsedChunk);
          }
        });
      }

      return {
        success: true,
        sessionId: currentSessionId || undefined
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('TIPIDKOR stream fetch error:', fetchError);
      
      if (controller.signal.aborted) {
        throw new Error('Request timed out. File mungkin terlalu besar atau koneksi terlalu lambat.');
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Error in sendTipidkorStreamingChatMessage:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Utility function untuk konversi PlaygroundChatMessage dari streaming events
 */
export const convertTipidkorStreamingEventsToMessages = (
  events: RunResponse[]
): PlaygroundChatMessage[] => {
  const messages: PlaygroundChatMessage[] = [];
  let currentAgentMessage: PlaygroundChatMessage | null = null;

  events.forEach(event => {
    switch (event.event) {
      case RunEvent.RunStarted:
      case RunEvent.ReasoningStarted:
        // Initialize new agent message
        currentAgentMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'agent',
          content: '',
          tool_calls: [],
          streamingError: false,
          created_at: event.created_at || Math.floor(Date.now() / 1000),
        };
        break;

      case RunEvent.RunResponse:
        if (currentAgentMessage && typeof event.content === 'string') {
          currentAgentMessage.content += event.content;
          
          // Update metadata
          if (event.tools) currentAgentMessage.tool_calls = [...event.tools];
          if (event.images) currentAgentMessage.images = event.images;
          if (event.videos) currentAgentMessage.videos = event.videos;
          if (event.audio) currentAgentMessage.audio = event.audio;
          if (event.response_audio) currentAgentMessage.response_audio = event.response_audio;
          if (event.extra_data) {
            currentAgentMessage.extra_data = {
              ...currentAgentMessage.extra_data,
              ...event.extra_data
            };
          }
        }
        break;

      case RunEvent.RunCompleted:
      case RunEvent.ReasoningCompleted:
        if (currentAgentMessage) {
          // Finalize message content
          if (typeof event.content === 'string') {
            currentAgentMessage.content = event.content;
          }
          
          // Final metadata update
          if (event.tools) currentAgentMessage.tool_calls = [...event.tools];
          if (event.images) currentAgentMessage.images = event.images;
          if (event.videos) currentAgentMessage.videos = event.videos;
          if (event.audio) currentAgentMessage.audio = event.audio;
          if (event.response_audio) currentAgentMessage.response_audio = event.response_audio;
          if (event.extra_data) {
            currentAgentMessage.extra_data = {
              ...currentAgentMessage.extra_data,
              ...event.extra_data
            };
          }
          
          messages.push(currentAgentMessage);
          currentAgentMessage = null;
        }
        break;

      case RunEvent.RunError:
        if (currentAgentMessage) {
          currentAgentMessage.streamingError = true;
          currentAgentMessage.content = event.content as string || event.error || 'Unknown error occurred';
          messages.push(currentAgentMessage);
          currentAgentMessage = null;
        }
        break;

      case RunEvent.ToolCallStarted:
      case RunEvent.ToolCallCompleted:
        if (currentAgentMessage && event.tools) {
          currentAgentMessage.tool_calls = [...event.tools];
        }
        break;

      case RunEvent.ReasoningStep:
        if (currentAgentMessage && event.extra_data?.reasoning_steps) {
          currentAgentMessage.extra_data = {
            ...currentAgentMessage.extra_data,
            reasoning_steps: event.extra_data.reasoning_steps
          };
        }
        break;
    }
  });

  return messages;
};

/**
 * Get current session info
 */
export const getCurrentTipidkorStreamingSession = () => ({
  sessionId: currentSessionId,
  userId: currentUserId
}); 