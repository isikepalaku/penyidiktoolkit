/**
 * Ahli Hukum Pidana Streaming Service
 * Service untuk menangani streaming chat AI untuk ahli hukum pidana dengan support file upload
 * Menggunakan AGNO streaming API dengan real-time response dan Enhanced Upload Service
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

const FETCH_TIMEOUT = 1800000; // 30 menit untuk file besar
const API_BASE_URL = env.apiUrl || 'https://api.reserse.id';
const AGENT_ID = 'ahli-hukum-pidana';

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
  console.log('🔍 AHLI_HUKUM_PIDANA: Raw response text:', text.substring(0, 200) + '...');
  
  try {
    // First try to parse as JSON
    const parsed = JSON.parse(text);
    console.log('🔍 AHLI_HUKUM_PIDANA: Parsed JSON response:', parsed);
    
    // If response contains a 'response' field with RunResponse format, extract content
    if (parsed.response && typeof parsed.response === 'string') {
      const runResponseContent = extractContentFromRunResponse(parsed.response);
      if (runResponseContent) {
        console.log('🔍 AHLI_HUKUM_PIDANA: Extracted content from RunResponse:', runResponseContent.substring(0, 100) + '...');
        return { content: runResponseContent, ...parsed };
      }
    }
    
    return parsed;
  } catch (error) {
    // If JSON parsing fails, handle text response
    console.log('🔍 AHLI_HUKUM_PIDANA: Response is not JSON, processing as text:', text.substring(0, 100) + '...');
    console.error('JSON parse error:', error);
    
    // Try to extract content from RunResponse format directly
    const runResponseContent = extractContentFromRunResponse(text);
    if (runResponseContent) {
      console.log('🔍 AHLI_HUKUM_PIDANA: Extracted content from text RunResponse:', runResponseContent.substring(0, 100) + '...');
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
      console.log('🔍 AHLI_HUKUM_PIDANA: Content extraction successful, length:', content.length);
      return content;
    }
    
    // Fallback: try with double quotes
    const doubleQuoteMatch = runResponseStr.match(/content="([^"]*(?:\\"[^"]*)*)"/);
    if (doubleQuoteMatch && doubleQuoteMatch[1]) {
      const content = doubleQuoteMatch[1].replace(/\\"/g, '"');
      console.log('🔍 AHLI_HUKUM_PIDANA: Content extraction (double quotes) successful, length:', content.length);
      return content;
    }
    
    console.warn('🔍 AHLI_HUKUM_PIDANA: Could not extract content from RunResponse format');
    return null;
  } catch (error) {
    console.error('🔍 AHLI_HUKUM_PIDANA: Error extracting content from RunResponse:', error);
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
    console.log('AHLI_HUKUM_PIDANA STREAMING: Using authenticated user ID:', currentUserId);
  } 
  // Jika tidak ada session Supabase, gunakan UUID
  else if (!currentUserId) {
    currentUserId = `anon_${uuidv4()}`;
    console.log('AHLI_HUKUM_PIDANA STREAMING: Created new anonymous user ID:', currentUserId);
  }
  
  // Buat session ID baru untuk percakapan jika belum ada
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    console.log('AHLI_HUKUM_PIDANA STREAMING: Created new session ID:', currentSessionId);
  }
};

/**
 * Backward compatibility - keep old function name for non-streaming usage
 */
export const initializeSession = initializeStreamingSession;

/**
 * Menghapus session ID untuk memulai percakapan baru
 */
export const clearStreamingChatHistory = () => {
  console.log('AHLI_HUKUM_PIDANA STREAMING: Clearing chat history and session');
  currentSessionId = null;
  // Tetap mempertahankan user ID untuk konsistensi
  console.log('AHLI_HUKUM_PIDANA STREAMING: Kept user ID:', currentUserId);
};

/**
 * Backward compatibility - keep old function name
 */
export const clearChatHistory = clearStreamingChatHistory;

/**
 * Mengirim pesan chat ke API menggunakan streaming dengan support file upload
 * @param message Pesan teks yang dikirim pengguna  
 * @param files File opsional yang ingin diupload
 * @param onEvent Callback untuk menangani streaming events
 * @returns Promise dengan respons dari API
 */
export const sendStreamingChatMessage = async (
  message: string, 
  files?: File[],
  onEvent?: (event: RunResponse) => void
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
    console.log('🚀 Starting enhanced chat request:', { 
      messageLength: message.length,
      fileCount: hasFiles ? files!.length : 0,
      sessionId: currentSessionId,
      userId: currentUserId
    });
    
    let uploadedFiles: UserFile[] = [];
    
    // Enhanced File Upload Process
    if (hasFiles) {
      console.log('📁 Processing files with Enhanced Upload Service:');
      files!.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, ${file.type})`);
      });
      
      // Setup enhanced upload options
      const uploadOptions: EnhancedUploadOptions = {
        category: 'document',
        tags: ['chat-upload', 'ahli-hukum-pidana'],
        description: `Uploaded via Ahli Hukum Pidana chat - ${new Date().toISOString()}`,
        usePresignedUrl: true,
        generateThumbnails: true,
        extractMetadata: true,
        chatContext: {
          sessionId: currentSessionId || 'new-session',
          agentType: 'ahli-hukum-pidana',
          messageId: uuidv4()
        },
        onProgress: (progress: UploadProgress) => {
          // Emit enhanced progress
          emitEnhancedProgress(progress);
          
          // Emit legacy progress for backward compatibility
          emitProgress({
            status: progress.status,
            percent: progress.percent
          });
          
          console.log(`📊 Upload Progress: ${progress.percent}% - ${progress.status}`, {
            currentFile: progress.currentFile,
            fileIndex: progress.fileIndex,
            totalFiles: progress.totalFiles,
            speed: progress.speed ? `${(progress.speed / 1024 / 1024).toFixed(2)} MB/s` : undefined,
            eta: progress.eta ? `${Math.round(progress.eta)}s remaining` : undefined
          });
        },
        onFileComplete: (file: UserFile, index: number) => {
          console.log(`✅ File ${index + 1} uploaded successfully:`, {
            filename: file.original_filename,
            fileId: file.id,
            s3Url: file.s3_url
          });
        },
        onAllComplete: (files: UserFile[]) => {
          console.log(`🎉 All ${files.length} files uploaded successfully`);
        },
        onError: (error: string, fileIndex?: number) => {
          console.error(`❌ Upload error ${fileIndex !== undefined ? `for file ${fileIndex + 1}` : ''}:`, error);
        }
      };
      
      // Upload files using Enhanced Upload Service
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
      
      console.log('📤 Enhanced upload completed:', {
        successful: uploadedFiles.length,
        failed: uploadResult.failedFiles?.length || 0,
        sessionToken: uploadResult.session?.session_token
      });
      
      // Emit processing status
      emitProgress({ status: 'processing', percent: 90 });
    }
    
    // Prepare chat message
    const messageToSend = message.trim() || (hasFiles ? "Tolong analisis file yang saya kirimkan." : "");
    if (!messageToSend) {
      throw new Error('Pesan tidak boleh kosong');
    }
    
    const formData = new FormData();
    
    // Append basic parameters
    formData.append('message', messageToSend);
    formData.append('agent_id', AGENT_ID);
    formData.append('session_id', currentSessionId || '');
    formData.append('user_id', currentUserId);
    formData.append('monitor', 'false');
    
    // Handle file upload based on mode
    if (uploadedFiles.length > 0) {
      // Optimized S3-to-API approach: Download and send files efficiently
      console.log('📁 Converting S3 files for API endpoint compatibility');
      
      // Use Promise.all for parallel downloads (faster)
      const filePromises = uploadedFiles.map(async (uploadedFile) => {
        try {
          console.log(`⬇️ Generating fresh download URL for ${uploadedFile.original_filename}...`);
          
          // Generate fresh presigned URL instead of using stored URL
          if (!currentUserId) {
            throw new Error('User ID not available for download URL generation');
          }
          
          const downloadResult = await userFileManagementService.generateDownloadUrl(
            uploadedFile.id, 
            currentUserId
          );
          
          if (!downloadResult.success || !downloadResult.downloadUrl) {
            throw new Error(`Failed to generate download URL: ${downloadResult.error}`);
          }
          
          console.log(`🔗 Fresh presigned URL generated for ${uploadedFile.original_filename}`);
          
          // Download file with fresh presigned URL
          const fileResponse = await fetch(downloadResult.downloadUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(30000) // 30 second timeout per file
          });
          
          if (!fileResponse.ok) {
            throw new Error(`S3 download failed: ${fileResponse.status} ${fileResponse.statusText}`);
          }
          
          const fileBlob = await fileResponse.blob();
          
          // Verify file size matches
          if (fileBlob.size !== uploadedFile.file_size) {
            console.warn(`⚠️ Size mismatch for ${uploadedFile.original_filename}: expected ${uploadedFile.file_size}, got ${fileBlob.size}`);
          }
          
          // Create File object with correct metadata
          const file = new File([fileBlob], uploadedFile.original_filename, {
            type: uploadedFile.file_type,
            lastModified: new Date(uploadedFile.created_at).getTime()
          });
          
          console.log(`✅ Downloaded ${uploadedFile.original_filename}: ${formatFileSize(fileBlob.size)}`);
          return file;
          
        } catch (error) {
          console.error(`❌ Failed to download ${uploadedFile.original_filename}:`, error);
          throw new Error(`File download failed: ${uploadedFile.original_filename} - ${error}`);
        }
      });
      
      // Wait for all downloads to complete
      emitProgress({ status: 'processing', percent: 85 });
      const downloadedFiles = await Promise.all(filePromises);
      emitProgress({ status: 'processing', percent: 90 });
      
      // Append all files to FormData
      downloadedFiles.forEach((file, index) => {
        formData.append('files', file);
        console.log(`📎 File ${index + 1} ready for API: ${file.name} (${formatFileSize(file.size)})`);
      });
      
      // Set parameters matching successful Swagger call
      formData.append('upload_mode', 'traditional');
      formData.append('file_references', ''); // Backend expects this field
      formData.append('stream', 'false');
      
      console.log('📋 Ready to send to runs-with-files endpoint:', {
        fileCount: downloadedFiles.length,
        totalSize: downloadedFiles.reduce((sum, file) => sum + file.size, 0),
        endpoint: 'runs-with-files'
      });
    } else {
      // Chat mode: streaming response
      formData.append('stream', 'true');
      
      console.log('💬 Text-only chat mode - using streaming endpoint');
    }

    // Set headers
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

    // Add API key for authenticated requests
    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    // Determine endpoint based on upload mode
    const endpoint = uploadedFiles.length > 0 
      ? `${API_BASE_URL}/v1/playground/agents/ahli-hukum-pidana/runs-with-files`
      : `${API_BASE_URL}/v1/playground/agents/ahli-hukum-pidana/runs`;

    console.log('🌐 Making API request:', {
      url: endpoint,
      hasFiles: uploadedFiles.length > 0,
      streamMode: uploadedFiles.length === 0,
      enhancedMode: uploadedFiles.length > 0
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
      signal: AbortSignal.timeout(FETCH_TIMEOUT)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle response based on upload mode
    if (uploadedFiles.length > 0) {
      // Enhanced upload mode: Handle JSON response
      emitProgress({ status: 'processing', percent: 95 });
      
      // Use the same parseResponse function as kuhapService for consistency
      const data = await parseResponse(response);
      console.log('📨 Enhanced upload response received:', {
        hasContent: !!data.content,
        contentLength: data.content?.length || 0,
        hasExtraData: !!data.extra_data,
        hasReferences: !!(data.references || data.extra_data?.references),
        referencesCount: (data.references || data.extra_data?.references)?.length || 0,
        sessionId: data.session_id
      });

      // Update session ID if provided
      if (data.session_id) {
        currentSessionId = data.session_id;
      }

      // Create synthetic streaming events for consistency
      const events: RunResponse[] = [];

      // RunStarted event
      events.push({
        event: RunEvent.RunStarted,
        session_id: data.session_id || currentSessionId!,
        created_at: Math.floor(Date.now() / 1000)
      });

      // Preserve extra_data (including citations) from backend response
      const extra_data = data.extra_data || data.references ? {
        ...(data.extra_data || {}),
        ...(data.references ? { references: data.references } : {}),
        enhanced_upload: {
          file_count: uploadedFiles.length,
          uploaded_files: uploadedFiles.map(f => ({
            id: f.id,
            filename: f.original_filename,
            size: f.file_size,
            type: f.file_type
          }))
        }
      } : undefined;

      // Use parsed content from parseResponse function
      const responseContent = data.content || data.message || 'No response received';

      console.log('🔍 AHLI_HUKUM_PIDANA: Content parsing result:', {
        contentLength: responseContent?.length || 0,
        hasExtraData: !!extra_data,
        citationsCount: extra_data?.references?.length || 0
      });

      if (!responseContent || responseContent === 'No response received') {
        console.warn('⚠️ No content found in response, available fields:', Object.keys(data));
      }

      const runResponseEvent: RunResponse = {
        event: RunEvent.RunResponse,
        content: responseContent,
        session_id: data.session_id || currentSessionId!,
        created_at: Math.floor(Date.now() / 1000),
        extra_data: extra_data
      };

      events.push(runResponseEvent);

      // RunCompleted event
      events.push({
        event: RunEvent.RunCompleted,
        content: responseContent,
        session_id: data.session_id || currentSessionId!,
        created_at: Math.floor(Date.now() / 1000),
        extra_data: extra_data
      });

      // Emit events with delay for smooth UX
      console.log('🔄 AHLI_HUKUM_PIDANA: About to emit synthetic events for file upload');
      console.log('🔄 onEvent callback provided:', typeof onEvent);
      
      // Debug synthetic events data
      console.log('🔄 Synthetic events citations debug:', {
        runResponseHasCitations: !!(runResponseEvent.extra_data?.references),
        runCompletedHasCitations: !!(events[2]?.extra_data?.references),
        citationsCount: runResponseEvent.extra_data?.references?.length || 0
      });
      
      setTimeout(() => {
        console.log('📤 AHLI_HUKUM_PIDANA: Emitting RunStarted event');
        emitStreamEvent(events[0]);
        if (onEvent) {
          console.log('📤 Calling onEvent with RunStarted');
          onEvent(events[0]);
        }
      }, 100);
      
      setTimeout(() => {
        console.log('📤 AHLI_HUKUM_PIDANA: Emitting RunResponse event with content:', runResponseEvent.content?.substring(0, 50) + '...');
        emitStreamEvent(runResponseEvent);
        if (onEvent) {
          console.log('📤 Calling onEvent with RunResponse');
          onEvent(runResponseEvent);
        }
      }, 200);
      
      setTimeout(() => {
        console.log('📤 AHLI_HUKUM_PIDANA: Emitting RunCompleted event');
        emitStreamEvent(events[2]);
        if (onEvent) {
          console.log('📤 Calling onEvent with RunCompleted');
          onEvent(events[2]);
        }
        emitProgress({ status: 'completed', percent: 100 });
             }, 300);

      return {
        success: true,
        sessionId: data.session_id || currentSessionId!
      };

    } else {
      // Regular streaming mode
      console.log('📡 Processing streaming response...');
      
      if (!response.body) {
        throw new Error('Response body tidak tersedia untuk streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Streaming completed');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer = parseStreamBuffer(buffer + chunk, (event) => {
            // Update session ID from events
            if (event.session_id) {
              currentSessionId = event.session_id;
            }
            
            emitStreamEvent(event);
            if (onEvent) onEvent(event);
          });
        }
      } finally {
        reader.releaseLock();
      }

      return {
        success: true,
        sessionId: currentSessionId!
      };
    }

  } catch (error) {
    console.error('❌ Enhanced chat error:', error);
    
    // Emit error progress
    emitProgress({ status: 'failed', percent: 0 });
    
    // Emit error event
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