/**
 * RESKRIMUM AI Service
 * Service untuk menangani chat AI untuk bidang reserse kriminal umum
 * Menggunakan backend API untuk manajemen session
 */

import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // Meningkatkan delay antar retry
const FETCH_TIMEOUT = 180000; // 3 minutes timeout
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

// Store session ID
let currentSessionId: string | null = null;
// Store user ID yang persisten
let currentUserId: string | null = null;

// Event emitter sederhana untuk progress update
type ProgressCallback = (progress: {status: string, percent?: number}) => void;
let progressCallbacks: ProgressCallback[] = [];

export const onProgress = (callback: ProgressCallback) => {
  progressCallbacks.push(callback);
  return () => {
    progressCallbacks = progressCallbacks.filter(cb => cb !== callback);
  };
};

const emitProgress = (status: string, percent?: number) => {
  progressCallbacks.forEach(callback => {
    callback({status, percent});
  });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const parseResponse = async (response: Response) => {
  const text = await response.text();
  try {
    // First try to parse as JSON
    const jsonData = JSON.parse(text);
    
    // Handle the new response format from runs-with-files endpoint
    if (jsonData.response && typeof jsonData.response === 'string' && jsonData.response.includes('RunResponse')) {
      console.log('Detected RunResponse format, processing...');
      
      // Extract content from RunResponse format - use simpler approach
      let content = null;
      
      if (jsonData.response.includes("content='") && jsonData.response.includes("', content_type")) {
        // Extract content between content=' and ', content_type
        const startIdx = jsonData.response.indexOf("content='") + 9;
        const endIdx = jsonData.response.indexOf("', content_type");
        if (startIdx > 0 && endIdx > startIdx) {
          content = jsonData.response.substring(startIdx, endIdx);
        }
      } else {
        // Fallback to regex
        const simpleContentMatch = jsonData.response.match(/content=['"](.+?)['"]/s);
        if (simpleContentMatch && simpleContentMatch[1]) {
          content = simpleContentMatch[1];
        }
      }
      
      if (content) {
        console.log('Successfully extracted content from RunResponse');
        return {
          content: content,
          sourceDocuments: jsonData.sourceDocuments
        };
      } else {
        console.log('Could not extract content from RunResponse, returning full response');
        return {
          content: jsonData.response,
          sourceDocuments: jsonData.sourceDocuments
        };
      }
    }
    
    // Return content directly if available
    if (jsonData.content) {
      return jsonData;
    }
    
    // Return message directly if available (for compatibility)
    if (jsonData.message) {
      return jsonData;
    }
    
    return jsonData;
  } catch (error) {
    // If JSON parsing fails, handle text response
    console.log('Response is not JSON, processing as text:', text);
    console.error('JSON parse error:', error);
    
    // If all parsing fails, return text as content
    return { content: text };
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
 * Membuat session ID baru jika belum ada
 * Session ID digunakan oleh backend untuk mengelola konteks percakapan
 */
export const initializeSession = async () => {
  // Cek apakah pengguna login dengan Supabase
  const { data: { session } } = await supabase.auth.getSession();
  
  // Jika pengguna login, gunakan Supabase user ID
  if (session?.user?.id) {
    currentUserId = session.user.id;
    console.log('RESKRIMUM: Using authenticated user ID:', currentUserId);
  } 
  // Jika tidak ada session Supabase, gunakan UUID
  else if (!currentUserId) {
    currentUserId = `anon_${uuidv4()}`;
    console.log('RESKRIMUM: Created new anonymous user ID:', currentUserId);
  }
  
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    console.log('RESKRIMUM: Created new session ID:', currentSessionId);
    console.log('RESKRIMUM: User ID:', currentUserId, 'Session ID:', currentSessionId);
  } else {
    console.log('RESKRIMUM: Using existing session ID:', currentSessionId);
    console.log('RESKRIMUM: User ID:', currentUserId, 'Session ID:', currentSessionId);
  }
};

/**
 * Menghapus session ID untuk memulai percakapan baru
 */
export const clearChatHistory = () => {
  console.log('RESKRIMUM: Clearing chat history and session');
  currentSessionId = null;
  // Tetap mempertahankan user ID untuk konsistensi
  console.log('RESKRIMUM: Kept user ID:', currentUserId);
};

/**
 * Mengirim pesan chat ke API dan menangani respons dengan file besar
 * @param message Pesan teks yang dikirim pengguna
 * @param files File opsional yang ingin diupload (misalnya PDF, gambar)
 * @returns Promise dengan respons dari API
 */
export const sendChatMessage = async (message: string, files?: File[]): Promise<ChatResponse> => {
  let retryCount = 0;
  const hasLargeFiles = files && files.some(file => file.size > 5 * 1024 * 1024); // Files > 5MB

  try {
    // Generate or retrieve session ID
    if (!currentSessionId || !currentUserId) {
      await initializeSession();
    }
    
    // Double-check after initialization
    if (!currentSessionId || !currentUserId) {
      throw new Error('Tidak dapat menginisialisasi session atau user ID');
    }
    
    // Reset progress
    emitProgress('preparing', 0);
    
    // Function to determine if we should retry based on the error
    const shouldRetry = (error: any) => {
      const errorMessage = error?.message || '';
      
      // Network errors and certain status codes should be retried
      const isNetworkError = errorMessage.includes('NetworkError') || 
                             errorMessage.includes('network') ||
                             errorMessage.includes('Failed to fetch') || 
                             !navigator.onLine;
                             
      const isServerError = error.status >= 500 && error.status < 600;
      
      // Don't retry client errors except for 429 (too many requests)
      const isRateLimitError = error.status === 429;
      
      // Debug log
      console.log(`RESKRIMUM: Should retry? Network error: ${isNetworkError}, Server error: ${isServerError}, Rate limit: ${isRateLimitError}`);
      
      return isNetworkError || isServerError || isRateLimitError;
    };
    
    try {
      while (retryCount <= MAX_RETRIES) {
        try {
          console.log(`RESKRIMUM: Sending message (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, { messageLength: message.length });
          
          const formData = new FormData();
          
          // Pastikan selalu ada pesan yang dikirim, bahkan jika pengguna hanya mengirim file
          const messageToSend = message.trim() || 
            (files && files.length > 0 ? "Tolong analisis file yang saya kirimkan." : "");
          
          formData.append('message', messageToSend);
          formData.append('agent_id', 'dit-reskrimum-chat');
          formData.append('stream', 'false');
          formData.append('monitor', 'false');
          formData.append('session_id', currentSessionId as string);
          formData.append('user_id', currentUserId as string); // Gunakan user ID yang konsisten
          
          // Tambahkan file ke formData jika disediakan
          if (files && files.length > 0) {
            // Log info tentang file untuk debugging
            let totalSize = 0;
            files.forEach((file, index) => {
              totalSize += file.size;
              console.log(`File ${index + 1}: Name=${file.name}, Size=${(file.size / 1024 / 1024).toFixed(2)}MB, Type=${file.type}`);
              formData.append('files', file);
            });
            console.log(`Adding ${files.length} files to the request. Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
            
            // Start progress simulation in the background for large files
            if (totalSize > 1024 * 1024) { // > 1MB
              simulateProgress(totalSize);
            }
          }

          console.log('Sending request with FormData:', {
            message: messageToSend.substring(0, 50) + (messageToSend.length > 50 ? '...' : ''),
            agent_id: 'dit-reskrimum-chat',
            session_id: currentSessionId,
            user_id: currentUserId,
            is_authenticated: currentUserId.startsWith('anon_') ? false : true,
            hasFiles: files && files.length > 0,
            hasLargeFiles
          });

          const headers: HeadersInit = {
            'Accept': 'application/json',
            'X-User-ID': currentUserId,
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
          
          const requestOptions: RequestInit = {
            method: 'POST',
            headers,
            body: formData
          };

          // Gunakan endpoint baru yang mendukung file
          const endpoint = files && files.length > 0 
            ? 'runs-with-files' 
            : 'runs';
          const url = `${API_BASE_URL}/v1/playground/agents/dit-reskrimum-chat/${endpoint}`;
          console.log('Sending request to:', url);

          // Special handling for large files - simulasi progress berbasis waktu
          if (hasLargeFiles) {
            try {
              // Inisialisasi progress simulasi
              emitProgress('uploading', 20);
              console.log('Large file detected, using progress simulation...');
              
              // Setup simulasi progress upload
              const simulateUploadProgress = () => {
                let currentProgress = 20;
                const uploadInterval = setInterval(() => {
                  // Increment progress sampai 50%
                  currentProgress += 2;
                  if (currentProgress >= 50) {
                    clearInterval(uploadInterval);
                    // Beralih ke fase processing setelah upload selesai
                    emitProgress('processing', 50);
                    simulateProcessingProgress();
                  } else {
                    emitProgress('uploading', currentProgress);
                  }
                }, 500); // Update setiap 500ms
                
                return uploadInterval;
              };
              
              // Simulasi progress processing
              const simulateProcessingProgress = () => {
                let currentProgress = 50;
                const processInterval = setInterval(() => {
                  // Increment progress dengan lebih lambat selama fase processing
                  currentProgress += 1;
                  if (currentProgress >= 90) {
                    clearInterval(processInterval);
                    emitProgress('processing', 90);
                  } else {
                    emitProgress('processing', currentProgress);
                  }
                }, 1000); // Update setiap 1000ms
                
                return processInterval;
              };
              
              // Mulai simulasi upload progress
              const uploadInterval = simulateUploadProgress();
              
              // Kirim request sebenarnya
              const abortController = new AbortController();
              const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT);
              
              requestOptions.signal = abortController.signal;
              console.log('Starting upload for large file...');
              
              try {
                // Menunggu respons langsung dari API
                const response = await fetch(url, requestOptions);
                clearTimeout(timeoutId);
                
                // Hentikan simulasi progress ketika respons diterima
                clearInterval(uploadInterval);
                
                if (!response.ok) {
                  emitProgress('completed', 100); // Tandai selesai meski error
                  const errorText = await response.text();
                  throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
                }
                
                // Tandai sebagai selesai
                emitProgress('completed', 100);
                
                // Parse dan return respons
                const data = await parseResponse(response);
                console.log('Received response for large file:', data);
                
                return {
                  text: data.content || data.message || 'No response received',
                  sourceDocuments: data.sourceDocuments
                };
              } catch (fetchError) {
                // Hentikan simulasi progress jika terjadi error
                clearInterval(uploadInterval);
                throw fetchError;
              }
            } catch (error) {
              console.error('Error with large file upload:', error);
              throw error;
            }
          } else {
            // Standard handling for normal requests
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT);
            
            try {
              // Bungkus fetch dalam blok try-catch terpisah untuk menangkap error jaringan
              requestOptions.signal = abortController.signal;
              console.log('Starting fetch request...');
              const response = await fetch(url, requestOptions);
              console.log('Fetch request completed with status:', response.status);
              
              clearTimeout(timeoutId);
        
              if (abortController.signal.aborted) {
                console.error('Request timed out after', FETCH_TIMEOUT / 60000, 'minutes');
                throw new Error('Request timed out. Ukuran file mungkin terlalu besar atau koneksi terlalu lambat.');
              }
        
              if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', response.status, errorText);
                
                if (response.status === 429) {
                  throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
                }
                
                if (response.status >= 500 && retryCount < MAX_RETRIES) {
                  console.log('Server error, retrying...');
                  retryCount++;
                  await wait(RETRY_DELAY * retryCount);
                  continue;
                }
                
                if (response.status === 413) {
                  throw new Error('File terlalu besar. Harap gunakan file dengan ukuran lebih kecil.');
                }
                
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
              }
        
              const data = await parseResponse(response);
              console.log('Parsed response data:', data);
        
              return {
                text: data.content || data.message || 'No response received',
                sourceDocuments: data.sourceDocuments
              };
            } catch (fetchError) {
              clearTimeout(timeoutId);
              console.error('Fetch error:', fetchError);
              throw fetchError; // Re-throw untuk ditangani oleh catch di luar
            }
          }
        } catch (error: any) {
          console.error(`RESKRIMUM: Error on attempt ${retryCount + 1}/${MAX_RETRIES + 1}:`, error);
          
          // If abort due to timeout
          if (error.name === 'AbortError') {
            console.error('RESKRIMUM: Request timed out after', FETCH_TIMEOUT / 1000, 'seconds');
            throw new Error('Permintaan memakan waktu terlalu lama. Periksa koneksi Anda atau coba lagi nanti.');
          }
          
          // Check if we should retry
          if (retryCount < MAX_RETRIES && shouldRetry(error)) {
            retryCount++;
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000); // Exponential backoff, max 10 seconds
            console.log(`RESKRIMUM: Retrying in ${delay}ms...`);
            await wait(delay);
            continue;
          }
          
          // If we shouldn't retry or have exhausted retries, reset progress and throw
          emitProgress('completed', 100);
          throw error;
        }
      }
      
      // This should never be reached due to the while loop conditions, but TypeScript wants a return
      throw new Error('RESKRIMUM: Exceeded maximum retries');
    } catch (error: any) {
      console.error('RESKRIMUM: Final error:', error);
      
      // Final error handling with user-friendly messages
      let errorMessage = 'Terjadi kesalahan saat menghubungi server.';
      
      if (!navigator.onLine) {
        errorMessage = 'Anda sedang offline. Silakan periksa koneksi internet Anda.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        text: errorMessage,
        error: true
      };
    }
  } catch (error: any) {
    console.error('RESKRIMUM: Final error:', error);
    
    // Final error handling with user-friendly messages
    let errorMessage = 'Terjadi kesalahan saat menghubungi server.';
    
    if (!navigator.onLine) {
      errorMessage = 'Anda sedang offline. Silakan periksa koneksi internet Anda.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      text: errorMessage,
      error: true
    };
  }
};

/**
 * Simulates progress for file upload and processing
 * @param fileSize The size of the file being uploaded in bytes
 */
const simulateProgress = async (fileSize: number) => {
  // Only simulate progress for files larger than 1MB
  if (fileSize < 1024 * 1024) return;
  
  const totalDuration = Math.min(Math.max(fileSize / (1024 * 1024) * 500, 3000), 20000);
  const uploadDuration = totalDuration * 0.6; // 60% of time for upload
  const processingDuration = totalDuration * 0.4; // 40% of time for processing
  
  // Preparation phase - quick
  emitProgress('preparing', 0);
  await wait(300);
  
  // Upload phase
  emitProgress('uploading', 5);
  
  const uploadSteps = 10;
  const uploadStepTime = uploadDuration / uploadSteps;
  
  for (let i = 1; i <= uploadSteps; i++) {
    await wait(uploadStepTime);
    const percent = Math.round(5 + (i / uploadSteps) * 60); // 5% to 65%
    emitProgress('uploading', percent);
  }
  
  // Processing phase
  emitProgress('processing', 70);
  
  const processingSteps = 6;
  const processingStepTime = processingDuration / processingSteps;
  
  for (let i = 1; i <= processingSteps; i++) {
    await wait(processingStepTime);
    const percent = Math.round(70 + (i / processingSteps) * 25); // 70% to 95%
    emitProgress('processing', percent);
  }
  
  // Final stage
  emitProgress('completed', 100);
}; 