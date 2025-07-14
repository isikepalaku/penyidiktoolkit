/**
 * TIPIDKOR AI Streaming Service
 * Service untuk menangani streaming chat AI untuk bidang tindak pidana korupsi
 * Menggunakan AGNO streaming API dengan real-time response dan support file upload
 */

import { env, formatFileSize } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';
import {
  RunEvent,
  RunResponse,
  PlaygroundChatMessage
} from '@/types/playground';
import { 
  enhancedUploadService, 
  UploadProgress, 
  EnhancedUploadOptions 
} from './enhancedUploadService';
import { UserFile, UserFileManagementService } from './userFileManagementService';

const API_KEY = import.meta.env.VITE_API_KEY;
const API_BASE_URL = env.apiUrl || 'https://api.reserse.id';
const AGENT_ID = 'tipidkor-chat';
const FETCH_TIMEOUT = 1800000; // 30 menit untuk file sangat besar

// Store session ID
let currentSessionId: string | null = null;
// Store user ID yang persisten
let currentUserId: string | null = null;

// Create instance of UserFileManagementService
const userFileManagementService = new UserFileManagementService();

// Event emitter untuk streaming events
type StreamEventCallback = (event: RunResponse) => void;
let streamEventCallbacks: StreamEventCallback[] = [];

// Enhanced progress tracking untuk file upload
type EnhancedProgressCallback = (progress: UploadProgress) => void;
let enhancedProgressCallbacks: EnhancedProgressCallback[] = [];

// Legacy progress callback untuk backward compatibility
type ProgressCallback = (progress: { status: string; percent: number }) => void;
let progressCallbacks: ProgressCallback[] = [];

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
    try {
      callback(event);
    } catch (error) {
      console.error('Error in stream event callback:', error);
    }
  });
};

const emitEnhancedProgress = (progress: UploadProgress) => {
  enhancedProgressCallbacks.forEach(callback => {
    try {
      callback(progress);
    } catch (error) {
      console.error('Error in enhanced progress callback:', error);
    }
  });
};

const emitProgress = (progress: { status: string; percent: number }) => {
  progressCallbacks.forEach(callback => {
    try {
      callback(progress);
    } catch (error) {
      console.error('Error in progress callback:', error);
    }
  });

  // Also emit to enhanced progress for backward compatibility
  emitEnhancedProgress({
    status: progress.status as any,
    percent: progress.percent,
    uploadedBytes: 0,
    totalBytes: 100
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
  console.log('🔍 TIPIDKOR: Raw response text:', text.substring(0, 200) + '...');
  
  try {
    // First try to parse as JSON
    const parsed = JSON.parse(text);
    console.log('🔍 TIPIDKOR: Parsed JSON response:', parsed);
    
    // If response contains a 'response' field with RunResponse format, extract content
    if (parsed.response && typeof parsed.response === 'string') {
      const runResponseContent = extractContentFromRunResponse(parsed.response);
      if (runResponseContent) {
        console.log('🔍 TIPIDKOR: Extracted content from RunResponse:', runResponseContent.substring(0, 100) + '...');
        return { content: runResponseContent, ...parsed };
      }
    }
    
    return parsed;
  } catch (error) {
    // If JSON parsing fails, handle text response
    console.log('🔍 TIPIDKOR: Response is not JSON, processing as text:', text.substring(0, 100) + '...');
    console.error('JSON parse error:', error);
    
    // Try to extract content from RunResponse format directly
    const runResponseContent = extractContentFromRunResponse(text);
    if (runResponseContent) {
      console.log('🔍 TIPIDKOR: Extracted content from text RunResponse:', runResponseContent.substring(0, 100) + '...');
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
      console.log('🔍 TIPIDKOR: Content extraction successful, length:', content.length);
      return content;
    }
    
    // Fallback: try with double quotes
    const doubleQuoteMatch = runResponseStr.match(/content="([^"]*(?:\\"[^"]*)*)"/);
    if (doubleQuoteMatch && doubleQuoteMatch[1]) {
      const content = doubleQuoteMatch[1].replace(/\\"/g, '"');
      console.log('🔍 TIPIDKOR: Content extraction (double quotes) successful, length:', content.length);
      return content;
    }
    
    console.warn('🔍 TIPIDKOR: Could not extract content from RunResponse format');
    return null;
  } catch (error) {
    console.error('🔍 TIPIDKOR: Error extracting content from RunResponse:', error);
    return null;
  }
};

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
 * @param files File opsional yang ingin diupload
 * @param onEvent Callback untuk menangani streaming events
 * @returns Promise dengan respons dari API
 */
export const sendTipidkorStreamingChatMessage = async (
  message: string, 
  files?: File[],
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
    
    // Session ID can be empty for new sessions
    if (!currentSessionId) {
      console.log('No session ID found, will be created by API');
    }
    
    const hasFiles = files && files.length > 0;
    console.log('🚀 Starting Tipidkor enhanced chat request:', { 
      messageLength: message.length,
      fileCount: hasFiles ? files!.length : 0,
      sessionId: currentSessionId,
      userId: currentUserId
    });
    
    let uploadedFiles: UserFile[] = [];
    
    // Enhanced File Upload Process
    if (hasFiles) {
      console.log('📁 Processing files with Enhanced Upload Service for Tipidkor:');
      files!.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, ${file.type})`);
      });
      
      // Setup enhanced upload options
      const uploadOptions: EnhancedUploadOptions = {
        category: 'document',
        tags: ['chat-upload', 'tipidkor-chat'],
        description: `Uploaded via Tipidkor chat - ${new Date().toISOString()}`,
        usePresignedUrl: true,
        generateThumbnails: true,
        extractMetadata: true,
        chatContext: {
          sessionId: currentSessionId || 'new-session',
          agentType: 'tipidkor-chat',
          messageId: uuidv4()
        },
        onProgress: (progress: UploadProgress) => {
          emitEnhancedProgress(progress);
          emitProgress({
            status: progress.status,
            percent: progress.percent
          });
          console.log(`📊 Tipidkor Upload Progress: ${progress.percent}% - ${progress.status}`);
        },
        onFileComplete: (file: UserFile, index: number) => {
          console.log(`✅ Tipidkor File ${index + 1} uploaded: ${file.original_filename}`);
        },
        onAllComplete: (files: UserFile[]) => {
          console.log(`🎉 Tipidkor: All ${files.length} files uploaded.`);
        },
        onError: (error: string, fileIndex?: number) => {
          console.error(`❌ Tipidkor Upload error ${fileIndex !== undefined ? `for file ${fileIndex + 1}` : ''}:`, error);
        }
      };
      
      const uploadResult = await enhancedUploadService.uploadFiles(
        files!,
        currentUserId,
        uploadOptions
      );
      
      if (!uploadResult.success) {
        throw new Error(`File upload failed: ${uploadResult.error}`);
      }
      
      if (!uploadResult.files || uploadResult.files.length === 0) {
        throw new Error('No files were uploaded successfully');
      }
      
      uploadedFiles = uploadResult.files;
      emitProgress({ status: 'processing', percent: 90 });
    }
    
    const messageToSend = message.trim() || (hasFiles ? "Tolong analisis file yang saya kirimkan." : "");
    if (!messageToSend) {
      throw new Error('Pesan tidak boleh kosong');
    }
    
    const formData = new FormData();
    formData.append('message', messageToSend);
    formData.append('agent_id', AGENT_ID);
    formData.append('session_id', currentSessionId || '');
    formData.append('user_id', currentUserId);
    formData.append('monitor', 'false');

    if (uploadedFiles.length > 0) {
      const filePromises = uploadedFiles.map(async (uploadedFile) => {
        if (!currentUserId) throw new Error('User ID not available for download URL generation');
        const downloadResult = await userFileManagementService.generateDownloadUrl(uploadedFile.id, currentUserId);
        if (!downloadResult.success || !downloadResult.downloadUrl) throw new Error(`Failed to generate download URL: ${downloadResult.error}`);
        const fileResponse = await fetch(downloadResult.downloadUrl, { signal: AbortSignal.timeout(30000) });
        if (!fileResponse.ok) throw new Error(`S3 download failed: ${fileResponse.statusText}`);
        const fileBlob = await fileResponse.blob();
        return new File([fileBlob], uploadedFile.original_filename, { type: uploadedFile.file_type, lastModified: new Date(uploadedFile.created_at).getTime() });
      });
      
      emitProgress({ status: 'processing', percent: 85 });
      const downloadedFiles = await Promise.all(filePromises);
      emitProgress({ status: 'processing', percent: 90 });
      
      downloadedFiles.forEach(file => formData.append('files', file));
      
      formData.append('upload_mode', 'traditional');
      formData.append('file_references', '');
      formData.append('stream', 'false');
    } else {
      formData.append('stream', 'true');
    }

    const headers: HeadersInit = {
      'X-User-ID': currentUserId,
    };
    
    if (uploadedFiles.length > 0) {
      headers['Accept'] = 'application/json';
      headers['X-Upload-Mode'] = 'enhanced';
    } else {
      headers['Accept'] = 'text/event-stream';
      headers['Cache-Control'] = 'no-cache';
    }
    
    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    const endpoint = uploadedFiles.length > 0 
      ? `${API_BASE_URL}/v1/playground/agents/${AGENT_ID}/runs-with-files`
      : `${API_BASE_URL}/v1/playground/agents/${AGENT_ID}/runs`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
      signal: AbortSignal.timeout(FETCH_TIMEOUT)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API request failed:', { status: response.status, error: errorText });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    if (uploadedFiles.length > 0) {
      emitProgress({ status: 'processing', percent: 95 });
      const data = await parseResponse(response);
      
      if (data.session_id) currentSessionId = data.session_id;

      const extra_data = data.extra_data || data.references ? {
        ...(data.extra_data || {}),
        ...(data.references ? { references: data.references } : {}),
        enhanced_upload: {
          file_count: uploadedFiles.length,
          uploaded_files: uploadedFiles.map(f => ({ id: f.id, filename: f.original_filename, size: f.file_size, type: f.file_type }))
        }
      } : undefined;

      const responseContent = data.content || data.message || 'No response received';
      
      const events: RunResponse[] = [
        { event: RunEvent.RunStarted, session_id: data.session_id || currentSessionId!, created_at: Math.floor(Date.now() / 1000) },
        { event: RunEvent.RunResponse, content: responseContent, session_id: data.session_id || currentSessionId!, created_at: Math.floor(Date.now() / 1000), extra_data },
        { event: RunEvent.RunCompleted, content: responseContent, session_id: data.session_id || currentSessionId!, created_at: Math.floor(Date.now() / 1000), extra_data }
      ];
      
      events.forEach((event, index) => {
        setTimeout(() => {
          emitStreamEvent(event);
          if (onEvent) onEvent(event);
          if (event.event === RunEvent.RunCompleted) {
            emitProgress({ status: 'completed', percent: 100 });
          }
        }, (index + 1) * 100);
      });

      return { success: true, sessionId: data.session_id || currentSessionId! };
    } else {
      if (!response.body) throw new Error('Response body tidak tersedia untuk streaming');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer = parseStreamBuffer(buffer + decoder.decode(value, { stream: true }), (event) => {
            if (event.session_id) currentSessionId = event.session_id;
            emitStreamEvent(event);
            if (onEvent) onEvent(event);
          });
        }
      } finally {
        reader.releaseLock();
      }
      return { success: true, sessionId: currentSessionId! };
    }
  } catch (error) {
    console.error('Error in sendTipidkorStreamingChatMessage:', error);
    emitProgress({ status: 'failed', percent: 0 });
    const errorEvent: RunResponse = {
      event: RunEvent.RunError,
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      session_id: currentSessionId || 'unknown',
      created_at: Math.floor(Date.now() / 1000)
    };
    emitStreamEvent(errorEvent);
    if (onEvent) onEvent(errorEvent);
    throw error;
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