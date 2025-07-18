/**
 * Hukum Perdata Streaming Service
 * Service untuk menangani streaming chat AI untuk bidang hukum perdata dengan support file upload
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
import { usePlaygroundStore } from '@/stores/PlaygroundStore';
import { SimpleDatabaseUploadService } from './simpleDatabaseUploadService';
import type { 
  SimpleUploadProgress,
  SimpleUploadResult,
  DeduplicationSummary,
  SimpleUploadOptions 
} from './simpleDatabaseUploadService';

const API_KEY = import.meta.env.VITE_API_KEY;

const FETCH_TIMEOUT = 1800000; // 30 menit untuk file besar
const API_BASE_URL = env.apiUrl || 'https://api.reserse.id';
const AGENT_ID = 'ahli-hukum-perdata';

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

// Enhanced progress tracking untuk deduplication
type EnhancedProgressCallback = (progress: SimpleUploadProgress) => void;
let enhancedProgressCallbacks: EnhancedProgressCallback[] = [];

// Initialize database upload service
const databaseUploadService = new SimpleDatabaseUploadService();

export const onStreamEvent = (callback: StreamEventCallback) => {
  streamEventCallbacks.push(callback);
  return () => {
    streamEventCallbacks = streamEventCallbacks.filter(cb => cb !== callback);
  };
};

export const onEnhancedProgress = (callback: EnhancedProgressCallback) => {
  enhancedProgressCallbacks.push(callback);
  return () => {
    enhancedProgressCallbacks = enhancedProgressCallbacks.filter(cb => cb !== callback);
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

const emitEnhancedProgress = (progress: SimpleUploadProgress) => {
  enhancedProgressCallbacks.forEach(callback => {
    callback(progress);
  });
  
  // Also emit to legacy progress callbacks for backward compatibility
  emitProgress({ 
    status: progress.status, 
    percent: progress.percent 
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
  console.log('🔍 HUKUM PERDATA: Raw response text:', text.substring(0, 200) + '...');
  
  try {
    // First try to parse as JSON
    const parsed = JSON.parse(text);
    console.log('🔍 HUKUM PERDATA: Parsed JSON response:', parsed);
    
    // If response contains a 'response' field with RunResponse format, extract content
    if (parsed.response && typeof parsed.response === 'string') {
      const runResponseContent = extractContentFromRunResponse(parsed.response);
      if (runResponseContent) {
        console.log('🔍 HUKUM PERDATA: Extracted content from RunResponse:', runResponseContent.substring(0, 100) + '...');
        return { content: runResponseContent, ...parsed };
      }
    }
    
    return parsed;
  } catch (error) {
    // If JSON parsing fails, handle text response
    console.log('🔍 HUKUM PERDATA: Response is not JSON, processing as text:', text.substring(0, 100) + '...');
    console.error('JSON parse error:', error);
    
    // Try to extract content from RunResponse format directly
    const runResponseContent = extractContentFromRunResponse(text);
    if (runResponseContent) {
      console.log('🔍 HUKUM PERDATA: Extracted content from text RunResponse:', runResponseContent.substring(0, 100) + '...');
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
      console.log('🔍 HUKUM PERDATA: Content extraction successful, length:', content.length);
      return content;
    }
    
    // Fallback: try with double quotes
    const doubleQuoteMatch = runResponseStr.match(/content="([^"]*(?:\\"[^"]*)*)"/);
    if (doubleQuoteMatch && doubleQuoteMatch[1]) {
      const content = doubleQuoteMatch[1].replace(/\\"/g, '"');
      console.log('🔍 HUKUM PERDATA: Content extraction (double quotes) successful, length:', content.length);
      return content;
    }
    
    console.warn('🔍 HUKUM PERDATA: Could not extract content from RunResponse format');
    return null;
  } catch (error) {
    console.error('🔍 HUKUM PERDATA: Error extracting content from RunResponse:', error);
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

/**
 * Interface untuk respon streaming chat
 */
export interface StreamingChatResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * Membuat session ID baru jika belum ada untuk streaming
 */
export const initializeStreamingSession = async () => {
  // Cek apakah pengguna login dengan Supabase
  const { data: { session } } = await supabase.auth.getSession();
  
  // Jika pengguna login, gunakan Supabase user ID
  if (session?.user?.id) {
    currentUserId = session.user.id;
    console.log('HUKUM PERDATA STREAMING: Using authenticated user ID:', currentUserId);
  } 
  // Jika tidak ada session Supabase, gunakan UUID
  else if (!currentUserId) {
    currentUserId = `anon_${uuidv4()}`;
    console.log('HUKUM PERDATA STREAMING: Created new anonymous user ID:', currentUserId);
  }
  
  // Buat session ID baru untuk percakapan jika belum ada
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    console.log('HUKUM PERDATA STREAMING: Created new session ID:', currentSessionId);
  }
};

/**
 * Backward compatibility - keep old function name for non-streaming usage
 */
export const initializeSession = initializeStreamingSession;

/**
 * Clear chat history from both localStorage and state
 */
export const clearStreamingChatHistory = () => {
  try {
    // 1. Get current session ID from state
    const { sessionId, setMessages, resetStreamingStatus } = usePlaygroundStore.getState();

    // 2. Clear messages for the current session from localStorage
    if (sessionId && typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`wassidik_session_${sessionId}`);
      console.log(`🗑️ HUKUM PERDATA: Removed session ${sessionId} from localStorage.`);
    }

    // 3. Clear messages and reset status in the Zustand store
    setMessages([]);
    resetStreamingStatus();

    console.log('♻️ HUKUM PERDATA: Chat history cleared and streaming status reset.');
  } catch (error) {
    console.error('❌ HUKUM PERDATA: Error clearing chat history:', error);
  }
};

/**
 * Backward compatibility - keep old function name
 */
export const clearChatHistory = clearStreamingChatHistory;

/**
 * Enhanced file upload dengan deduplication menggunakan SimpleDatabaseUploadService
 * @param files Array of files to upload
 * @param userId User ID for the upload
 * @param options Upload options
 * @returns Promise dengan upload results dan summary
 */
export const uploadFilesWithDeduplication = async (
  files: File[],
  userId: string,
  options: SimpleUploadOptions = {}
): Promise<{
  success: boolean;
  results: SimpleUploadResult[];
  summary: DeduplicationSummary;
  error?: string;
}> => {
  console.log('🔄 HUKUM PERDATA: Starting enhanced file upload with deduplication');
  
  const enhancedOptions: SimpleUploadOptions = {
    ...options,
    category: 'document',
    folder: '/hukum-perdata',
    onProgress: (progress) => {
      console.log(`📊 Upload Progress: ${progress.percent}% - ${progress.status}`, {
        currentFile: progress.currentFile,
        isDuplicate: progress.isDuplicate,
        spaceSaved: progress.spaceSaved
      });
      
      // Emit enhanced progress
      emitEnhancedProgress(progress);
      
      // Call original callback if provided
      if (options.onProgress) {
        options.onProgress(progress);
      }
    },
    onFileComplete: (result) => {
      console.log(`✅ File completed: ${result.isDuplicate ? 'Duplicate' : 'New'} - ${result.message}`);
      
      // Call original callback if provided
      if (options.onFileComplete) {
        options.onFileComplete(result);
      }
    },
    onAllComplete: (summary) => {
      console.log('📋 Upload Summary:', {
        totalFiles: summary.totalFiles,
        uniqueFiles: summary.uniqueFiles,
        referencedFiles: summary.referencedFiles,
        spaceSaved: `${(summary.spaceSaved / 1024 / 1024).toFixed(2)} MB`,
        spaceSavedPercent: `${summary.spaceSavedPercent.toFixed(1)}%`
      });
      
      // Call original callback if provided
      if (options.onAllComplete) {
        options.onAllComplete(summary);
      }
    }
  };
  
  try {
    const result = await databaseUploadService.uploadFiles(files, userId, enhancedOptions);
    return result;
  } catch (error: any) {
    console.error('❌ Enhanced upload failed:', error);
    return {
      success: false,
      results: [],
      summary: {
        totalFiles: files.length,
        uniqueFiles: 0,
        referencedFiles: 0,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        actualSize: 0,
        spaceSaved: 0,
        spaceSavedPercent: 0
      },
      error: error.message
    };
  }
};

/**
 * Mengirim pesan chat ke API menggunakan streaming dengan support file upload
 * @param message Pesan teks yang dikirim pengguna  
 * @param files File opsional yang ingin diupload
 * @param onEvent Callback untuk menangani streaming events
 * @param enhanced Optional: menggunakan enhanced upload dengan deduplication
 * @returns Promise dengan respons dari API
 */
export const sendStreamingChatMessage = async (
  message: string, 
  files?: File[],
  onEvent?: (event: RunResponse) => void,
  enhanced?: boolean
): Promise<StreamingChatResponse> => {
  try {
    // Generate or retrieve user ID (required)
    if (!currentUserId) {
      await initializeStreamingSession();
    }
    
    // Double-check user ID after initialization
    if (!currentUserId) {
      throw new Error('Tidak dapat menginisialisasi user ID');
    }
    
    // Session ID can be empty for new sessions
    if (!currentSessionId) {
      console.log('No session ID found, will be created by API');
    }
    
    const hasFiles = files && files.length > 0;
    console.log('Starting request with files:', hasFiles ? files.length : 0);
    
    // Log file details if any
    if (hasFiles) {
      console.log('Uploading files:');
      files!.forEach((file, index) => {
        console.log(`📄 File ${index + 1}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB - ${file.type}`);
      });
      
      // Emit progress untuk file upload preparation
      emitProgress({ status: 'preparing', percent: 10 });
      
      // Check if any file is large (> 5MB)
      const hasLargeFile = files!.some(file => file.size > 5 * 1024 * 1024);
      if (hasLargeFile) {
        console.log('Large file detected, progress tracking enabled');
      }
    }
    
    const formData = new FormData();
    
    // Pastikan selalu ada pesan yang dikirim (atau default untuk file upload)
    const messageToSend = message.trim() || (hasFiles ? "Tolong analisis file yang saya kirimkan." : "");
    if (!messageToSend) {
      throw new Error('Pesan tidak boleh kosong');
    }
    
    // Append FormData parameters
    formData.append('message', messageToSend);
    formData.append('agent_id', AGENT_ID);
    formData.append('session_id', currentSessionId || '');
    formData.append('user_id', currentUserId);
    formData.append('monitor', 'false');
    
    // Handle file upload berdasarkan mode
    if (hasFiles) {
      if (enhanced) {
        // Enhanced mode: gunakan deduplication service
        console.log('🔄 HUKUM PERDATA: Using enhanced upload with deduplication');
        
        const uploadResult = await uploadFilesWithDeduplication(files!, currentUserId, {
          onProgress: (progress) => {
            console.log(`📊 Enhanced Upload Progress: ${progress.percent}% - ${progress.status}`, {
              currentFile: progress.currentFile,
              isDuplicate: progress.isDuplicate,
              spaceSaved: progress.spaceSaved ? `${(progress.spaceSaved / 1024 / 1024).toFixed(2)} MB` : undefined
            });
          },
          onFileComplete: (result) => {
            console.log(`✅ Enhanced File completed: ${result.isDuplicate ? 'Duplicate' : 'New'} - ${result.message}`);
          },
          onAllComplete: (summary) => {
            console.log('📋 Enhanced Upload Summary:', {
              totalFiles: summary.totalFiles,
              uniqueFiles: summary.uniqueFiles,
              referencedFiles: summary.referencedFiles,
              spaceSaved: `${(summary.spaceSaved / 1024 / 1024).toFixed(2)} MB`,
              spaceSavedPercent: `${summary.spaceSavedPercent.toFixed(1)}%`
            });
          }
        });
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Enhanced upload failed');
        }
        
        // Siapkan file references untuk API
        const fileReferences = uploadResult.results.map(result => ({
          file_id: result.fileId,
          original_file_id: result.originalFileId,
          is_duplicate: result.isDuplicate,
          space_saved: result.spaceSaved
        }));
        
        formData.append('enhanced_mode', 'true');
        formData.append('file_references', JSON.stringify(fileReferences));
        
        // Enhanced mode: JSON response  
        formData.append('stream', 'false');
        
        emitProgress({ status: 'processing', percent: 80 });
      } else {
        // Standard mode: direct file upload
        files!.forEach((file) => {
          formData.append(`files`, file);
        });
        
        // File upload mode: JSON response  
        formData.append('stream', 'false');
        
        emitProgress({ status: 'uploading', percent: 30 });
      }
    } else {
      // Chat mode: streaming response
      formData.append('stream', 'true');
    }

    // Set headers
    const headers: HeadersInit = {
      'X-User-ID': currentUserId,
    };
    
    if (hasFiles) {
      headers['Accept'] = 'application/json';
    } else {
      headers['Accept'] = 'text/event-stream';
      headers['Cache-Control'] = 'no-cache';
    }
    
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

    // Use appropriate endpoint
    const endpoint = hasFiles ? 'runs-with-files' : 'runs';
    const url = `${API_BASE_URL}/v1/playground/agents/${AGENT_ID}/${endpoint}`;
    
    console.log('Sending request to:', url);
    
    // Debug request info
    console.log('Request summary:', {
      message_length: messageToSend.length,
      file_count: hasFiles ? files!.length : 0,
      session_id: currentSessionId || '[EMPTY]',
      user_id: currentUserId,
      is_authenticated: currentUserId.startsWith('anon_') ? false : true,
      mode: hasFiles ? 'file_upload_json' : 'chat_streaming'
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
        
        throw new Error(`Request failed: ${response.status} ${response.statusText}. ${errorText}`);
      }

      if (hasFiles) {
        // Handle JSON response for file uploads
        emitProgress({ status: 'processing', percent: 70 });
        
        const data = await parseResponse(response);
        console.log('🔍 HUKUM PERDATA: File upload response received:', {
          hasContent: !!data.content,
          contentLength: data.content?.length || 0,
          hasExtraData: !!data.extra_data,
          hasReferences: !!(data.references || data.extra_data?.references),
          referencesCount: (data.references || data.extra_data?.references)?.length || 0,
          sessionId: data.session_id
        });
        
        // Convert JSON response to streaming events for consistency
        const runStartedEvent: RunResponse = {
          event: RunEvent.RunStarted,
          content: '',
          session_id: data.session_id || currentSessionId,
          created_at: Math.floor(Date.now() / 1000)
        };
        
        // Preserve extra_data (including citations) from backend response
        const extra_data = data.extra_data || data.references ? {
          ...(data.extra_data || {}),
          ...(data.references ? { references: data.references } : {})
        } : undefined;
        
        const runResponseEvent: RunResponse = {
          event: RunEvent.RunResponse,
          content: data.content || data.message || 'No response received',
          session_id: data.session_id || currentSessionId,
          created_at: Math.floor(Date.now() / 1000),
          extra_data: extra_data
        };
        
        const runCompletedEvent: RunResponse = {
          event: RunEvent.RunCompleted,
          content: data.content || data.message || 'No response received',
          session_id: data.session_id || currentSessionId,
          created_at: Math.floor(Date.now() / 1000),
          extra_data: extra_data
        };

        // Emit events with delay for smooth UX
        console.log('🔄 HUKUM PERDATA: About to emit synthetic events for file upload');
        console.log('🔄 onEvent callback provided:', typeof onEvent);
        
        // Debug synthetic events data
        console.log('🔄 Synthetic events citations debug:', {
          runResponseHasCitations: !!(runResponseEvent.extra_data?.references),
          runCompletedHasCitations: !!(runCompletedEvent.extra_data?.references),
          citationsCount: runResponseEvent.extra_data?.references?.length || 0
        });
        
        setTimeout(() => {
          console.log('📤 HUKUM PERDATA: Emitting RunStarted event');
          emitStreamEvent(runStartedEvent);
          if (onEvent) {
            console.log('📤 Calling onEvent with RunStarted');
            onEvent(runStartedEvent);
          }
        }, 100);
        
        setTimeout(() => {
          console.log('📤 HUKUM PERDATA: Emitting RunResponse event with content:', runResponseEvent.content?.substring(0, 50) + '...');
          emitStreamEvent(runResponseEvent);
          if (onEvent) {
            console.log('📤 Calling onEvent with RunResponse');
            onEvent(runResponseEvent);
          }
        }, 200);
        
        setTimeout(() => {
          console.log('📤 HUKUM PERDATA: Emitting RunCompleted event');
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
        if (!response.body) {
          throw new Error('Response body is null - streaming not supported');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

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
            buffer = parseStreamBuffer(buffer, (parsedChunk: RunResponse) => {
              console.log('📡 HUKUM PERDATA: Streaming chunk received:', {
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
                console.log('📡 Calling onEvent with streaming chunk:', parsedChunk.event);
                onEvent(parsedChunk);
              } else {
                console.warn('📡 No onEvent callback provided for streaming chunk');
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
      }

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Fetch error:', fetchError);
      
      // Mark progress as completed even on error
      if (hasFiles) {
        emitProgress({ status: 'completed', percent: 100 });
      }
      
      if (controller.signal.aborted) {
        throw new Error('Request timed out. File mungkin terlalu besar atau koneksi terlalu lambat.');
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Error in sendStreamingChatMessage:', error);
    
    // Mark progress as completed even on error
    emitProgress({ status: 'completed', percent: 100 });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Backward compatibility - keep old function name for legacy usage
 */
export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  const response = await sendStreamingChatMessage(message);
  
  if (response.success) {
    return {
      text: 'Message sent successfully via streaming',
      sourceDocuments: []
    };
  } else {
    return {
      text: response.error || 'Unknown error occurred',
      error: true
    };
  }
};

/**
 * Utility function untuk konversi PlaygroundChatMessage dari streaming events
 */
export const convertStreamingEventsToMessages = (
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
export const getCurrentStreamingSession = () => ({
  sessionId: currentSessionId,
  userId: currentUserId
});

/**
 * Get deduplication statistics for current user or all users
 * @param userId Optional: specific user ID, if not provided uses current user
 * @returns Promise dengan deduplication statistics
 */
export const getDeduplicationStats = async (userId?: string): Promise<{
  success: boolean;
  stats?: DeduplicationSummary;
  error?: string;
}> => {
  try {
    const targetUserId = userId || currentUserId;
    if (!targetUserId) {
      return {
        success: false,
        error: 'User ID tidak tersedia'
      };
    }
    
    const result = await databaseUploadService.getDeduplicationStats(targetUserId);
    return result;
  } catch (error: any) {
    console.error('❌ Failed to get deduplication stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Enhanced sendStreamingChatMessage dengan better progress tracking dan deduplication
 * @param message Pesan teks yang dikirim pengguna
 * @param files File opsional yang ingin diupload
 * @param onEvent Callback untuk menangani streaming events
 * @param onEnhancedProgress Optional: enhanced progress callback dengan deduplication info
 * @returns Promise dengan respons dari API
 */
export const sendEnhancedStreamingChatMessage = async (
  message: string,
  files?: File[],
  onEvent?: (event: RunResponse) => void,
  progressCallback?: (progress: SimpleUploadProgress) => void
): Promise<StreamingChatResponse> => {
  // Register enhanced progress callback if provided
  let unsubscribe: (() => void) | undefined;
  if (progressCallback) {
    unsubscribe = onEnhancedProgress(progressCallback);
  }
  
  try {
    const result = await sendStreamingChatMessage(message, files, onEvent, true);
    return result;
  } finally {
    // Cleanup callback
    if (unsubscribe) {
      unsubscribe();
    }
  }
}; 