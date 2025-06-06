/**
 * P2SK Service (Ahli OJK)
 * Service untuk menangani chat AI untuk bidang Otoritas Jasa Keuangan
 * Menggunakan backend API untuk manajemen session dengan dukungan file upload
 */

import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;
const FETCH_TIMEOUT = 1800000; // 30 menit untuk file sangat besar
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
      console.log('P2SK: Detected RunResponse format, processing...');
      
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
        console.log('P2SK: Successfully extracted content from RunResponse');
        return {
          content: content,
          sourceDocuments: jsonData.sourceDocuments
        };
      } else {
        console.log('P2SK: Could not extract content from RunResponse, returning full response');
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
    console.log('P2SK: Response is not JSON, processing as text:', text);
    console.error('P2SK: JSON parse error:', error);
    
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
    console.log('P2SK: Using authenticated user ID:', currentUserId);
  } 
  // Jika tidak ada session Supabase, gunakan UUID
  else if (!currentUserId) {
    currentUserId = `anon_${uuidv4()}`;
    console.log('P2SK: Created new anonymous user ID:', currentUserId);
  }
  
  // Buat session ID baru untuk percakapan jika belum ada
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    console.log('P2SK: Created new session ID:', currentSessionId);
    console.log('P2SK: User ID:', currentUserId, 'Session ID:', currentSessionId);
  } else {
    console.log('P2SK: Using existing session ID:', currentSessionId);
    console.log('P2SK: User ID:', currentUserId, 'Session ID:', currentSessionId);
  }
};

/**
 * Menghapus session ID untuk memulai percakapan baru
 */
export const clearChatHistory = () => {
  console.log('P2SK: Clearing chat history and session');
  currentSessionId = null;
  // Tetap mempertahankan user ID untuk konsistensi
  console.log('P2SK: Kept user ID:', currentUserId);
};

/**
 * Mengirim pesan chat ke API dan menangani respons dengan file besar
 * @param message Pesan teks yang dikirim pengguna
 * @param files File opsional yang ingin diupload (misalnya PDF, gambar)
 * @returns Promise dengan respons dari API
 */
export const sendChatMessage = async (message: string, files?: File[]): Promise<ChatResponse> => {
  let retries = 0;
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
    
    while (retries <= MAX_RETRIES) {
      try {
        console.log(`P2SK: Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
        
        const formData = new FormData();
        
        // Pastikan selalu ada pesan yang dikirim, bahkan jika pengguna hanya mengirim file
        const messageToSend = message.trim() || 
          (files && files.length > 0 ? "Tolong analisis file yang saya kirimkan." : "");
        
        formData.append('message', messageToSend);
        formData.append('agent_id', 'p2sk-chat');
        formData.append('stream', 'false');
        formData.append('monitor', 'false');
        formData.append('session_id', currentSessionId);
        formData.append('user_id', currentUserId);
        
        // Tambahkan file ke formData jika disediakan
        if (files && files.length > 0) {
          // Log info tentang file untuk debugging
          let totalSize = 0;
          files.forEach((file, index) => {
            totalSize += file.size;
            console.log(`P2SK: File ${index + 1}: Name=${file.name}, Size=${(file.size / 1024 / 1024).toFixed(2)}MB, Type=${file.type}`);
            formData.append('files', file);
          });
          console.log(`P2SK: Adding ${files.length} files to the request. Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
          
          // Update progress - mulai upload
          emitProgress('uploading', 10);
        }

        console.log('P2SK: Sending request with FormData:', {
          message: messageToSend.substring(0, 50) + (messageToSend.length > 50 ? '...' : ''),
          agent_id: 'p2sk-chat',
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
          console.log('P2SK: Using API key for authentication');
        } else {
          console.warn('P2SK: No API key provided, request may fail');
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
        const url = `${API_BASE_URL}/v1/playground/agents/p2sk-chat/${endpoint}`;
        console.log('P2SK: Sending request to:', url);

        // Special handling for large files - simulasi progress berbasis waktu
        if (hasLargeFiles) {
          try {
            // Inisialisasi progress simulasi
            emitProgress('uploading', 20);
            console.log('P2SK: Large file detected, using progress simulation...');
            
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
            console.log('P2SK: Starting upload for large file...');
            
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
              console.log('P2SK: Received response for large file:', data);
              
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
            console.error('P2SK: Error with large file upload:', error);
            throw error;
          }
        } else {
          // Standard handling for normal requests
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT);
          
          try {
            // Bungkus fetch dalam blok try-catch terpisah untuk menangkap error jaringan
            requestOptions.signal = abortController.signal;
            console.log('P2SK: Starting fetch request...');
            const response = await fetch(url, requestOptions);
            console.log('P2SK: Fetch request completed with status:', response.status);
            
            clearTimeout(timeoutId);
      
            if (abortController.signal.aborted) {
              console.error('P2SK: Request timed out after', FETCH_TIMEOUT / 60000, 'minutes');
              throw new Error('Request timed out. Ukuran file mungkin terlalu besar atau koneksi terlalu lambat.');
            }
      
            if (!response.ok) {
              const errorText = await response.text();
              console.error('P2SK: Error response:', response.status, errorText);
              
              if (response.status === 429) {
                throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
              }
              
              if (response.status >= 500 && retries < MAX_RETRIES) {
                console.log('P2SK: Server error, retrying...');
                retries++;
                await wait(RETRY_DELAY * retries);
                continue;
              }
              
              if (response.status === 413) {
                throw new Error('File terlalu besar. Harap gunakan file dengan ukuran lebih kecil.');
              }
              
              throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }
      
            const data = await parseResponse(response);
            console.log('P2SK: Parsed response data:', data);
      
            return {
              text: data.content || data.message || 'No response received',
              sourceDocuments: data.sourceDocuments
            };
          } catch (fetchError) {
            clearTimeout(timeoutId);
            console.error('P2SK: Fetch error:', fetchError);
            throw fetchError; // Re-throw untuk ditangani oleh catch di luar
          }
        }
      } catch (error) {
        console.error('P2SK: Error in sendChatMessage:', error);
        
        // Deteksi error jaringan yang lebih baik
        const isNetworkError = 
          error instanceof TypeError ||
          (error as Error).message.includes('network') ||
          (error as Error).message.includes('connection') ||
          (error as Error).message.includes('abort') ||
          (error as Error).message.includes('Failed to fetch') ||
          (error as Error).message.includes('timeout') ||
          (error as Error).message.includes('Network request failed') ||
          !navigator.onLine;
        
        if (isNetworkError && retries < MAX_RETRIES) {
          console.log(`P2SK: Network error detected, retrying attempt ${retries + 1}...`);
          retries++;
          // Gunakan exponential backoff untuk retry
          const backoffDelay = RETRY_DELAY * Math.pow(2, retries - 1);
          console.log(`P2SK: Waiting ${backoffDelay}ms before retry...`);
          await wait(backoffDelay);
          continue;
        }
        
        // Jika ini error ukuran file atau batasan server, jangan retry
        if ((error as Error).message.includes('File terlalu besar') || 
            (error as Error).message.includes('Terlalu banyak permintaan')) {
          throw error;
        }
        
        // Untuk error lain, jika masih belum mencapai batas retry, coba lagi
        if (retries < MAX_RETRIES) {
          console.log('P2SK: Generic error, retrying...');
          retries++;
          await wait(RETRY_DELAY * retries);
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Failed after maximum retries. Silakan periksa koneksi internet dan coba lagi nanti.');
  } catch (error) {
    console.error('P2SK: Error in sendChatMessage:', error);
    throw error;
  }
}; 