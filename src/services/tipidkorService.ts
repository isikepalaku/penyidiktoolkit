/**
 * TIPIDKOR AI Service
 * Service untuk menangani chat AI untuk bidang tindak pidana korupsi
 * Menggunakan backend API untuk manajemen session
 */

import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const FETCH_TIMEOUT = 600000; // 10 minutes timeout - matching nginx server timeout
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

// Store session ID
let currentSessionId: string | null = null;
// Store user ID yang persisten
let currentUserId: string | null = null;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const parseResponse = async (response: Response) => {
  const text = await response.text();
  try {
    // First try to parse as JSON
    return JSON.parse(text);
  } catch (error) {
    // If JSON parsing fails, handle text response
    console.log('Response is not JSON, processing as text:', text);
    console.error('JSON parse error:', error);
    
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
    console.log('TIPIDKOR: Using authenticated user ID:', currentUserId);
  } 
  // Jika tidak ada session Supabase, gunakan UUID
  else if (!currentUserId) {
    currentUserId = `anon_${uuidv4()}`;
    console.log('TIPIDKOR: Created new anonymous user ID:', currentUserId);
  }
  
  // Buat session ID baru untuk percakapan jika belum ada
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    console.log('TIPIDKOR: Created new session ID:', currentSessionId);
    console.log('TIPIDKOR: User ID:', currentUserId, 'Session ID:', currentSessionId);
  } else {
    console.log('TIPIDKOR: Using existing session ID:', currentSessionId);
    console.log('TIPIDKOR: User ID:', currentUserId, 'Session ID:', currentSessionId);
  }
};

/**
 * Menghapus session ID untuk memulai percakapan baru
 */
export const clearChatHistory = () => {
  console.log('TIPIDKOR: Clearing chat history and session');
  currentSessionId = null;
  // Tetap mempertahankan user ID untuk konsistensi
  console.log('TIPIDKOR: Kept user ID:', currentUserId);
};

export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  let retries = 0;

  try {
    // Generate or retrieve session ID
    if (!currentSessionId || !currentUserId) {
      await initializeSession();
    }
    
    // Double-check after initialization
    if (!currentSessionId || !currentUserId) {
      throw new Error('Tidak dapat menginisialisasi session atau user ID');
    }
    
    while (retries <= MAX_RETRIES) {
      try {
        console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
        
        const formData = new FormData();
        formData.append('message', message.trim());
        formData.append('agent_id', 'tipidkor-chat');
        formData.append('stream', 'false');
        formData.append('monitor', 'false');
        formData.append('session_id', currentSessionId);
        formData.append('user_id', currentUserId);

        console.log('Sending request with FormData:', {
          message: message.trim().substring(0, 50) + (message.length > 50 ? '...' : ''),
          agent_id: 'tipidkor-chat',
          session_id: currentSessionId,
          user_id: currentUserId,
          is_authenticated: currentUserId.startsWith('anon_') ? false : true,
        });

        const headers: HeadersInit = {
          'Accept': 'application/json',
          // Tambahkan header X-User-ID untuk rate limiting
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

        // Use full URL, like in tipidterService
        const url = `${API_BASE_URL}/v1/playground/agents/tipidkor-chat/runs`;
        console.log('Sending request to:', url);

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT);
        
        requestOptions.signal = abortController.signal;
        const response = await fetch(url, requestOptions);
        
        clearTimeout(timeoutId);

        if (abortController.signal.aborted) {
          throw new Error('Request timed out after 10 minutes');
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          
          if (response.status === 429) {
            throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
          }
          
          if (response.status >= 500 && retries < MAX_RETRIES) {
            retries++;
            await wait(RETRY_DELAY * retries);
            continue;
          }
          
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const data = await parseResponse(response);
        console.log('Parsed response data:', data);

        return {
          text: data.content || data.message || 'No response received',
          sourceDocuments: data.sourceDocuments
        };

      } catch (error) {
        console.error('Error in sendChatMessage:', error);
        
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
          console.log(`Network error detected, retrying attempt ${retries + 1}...`);
          retries++;
          await wait(RETRY_DELAY * retries);
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Failed after maximum retries');
  } catch (error) {
    console.error('Error in sendChatMessage outer:', error);
    throw error;
  }
};