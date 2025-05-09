/**
 * TIPIDKOR AI Service
 * Service untuk menangani chat AI untuk bidang tindak pidana korupsi
 * Menggunakan backend API untuk manajemen session
 */

import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { getAuth } from 'firebase/auth';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const FETCH_TIMEOUT = 600000; // 10 minutes timeout - matching nginx server timeout
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

// Store session ID
let currentSessionId: string | null = null;

// Rate limit info
let rateLimitRemaining: number | null = null;
let rateLimitReset: number | null = null;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mendapatkan Firebase auth token jika user sudah login
 */
const getFirebaseToken = async (): Promise<string | null> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('TIPIDKOR: No authenticated user found');
      return null;
    }
    
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('TIPIDKOR: Error getting Firebase token:', error);
    return null;
  }
};

/**
 * Mendapatkan pesan rate limit yang informatif
 */
const getRateLimitMessage = (): string => {
  if (rateLimitRemaining === 0 && rateLimitReset) {
    // Konversi waktu reset ke dalam format yang mudah dibaca
    const resetDate = new Date(rateLimitReset * 1000);
    const now = new Date();
    const diffSeconds = Math.floor((resetDate.getTime() - now.getTime()) / 1000);
    
    if (diffSeconds <= 0) {
      return 'Batas permintaan tercapai. Silakan coba lagi.';
    }
    
    if (diffSeconds < 60) {
      return `Batas permintaan tercapai. Silakan coba lagi dalam ${diffSeconds} detik.`;
    }
    
    const minutes = Math.floor(diffSeconds / 60);
    return `Batas permintaan tercapai. Silakan coba lagi dalam ${minutes} menit.`;
  }
  
  return 'Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.';
};

/**
 * Ekstrak informasi rate limit dari header respons
 */
const extractRateLimitInfo = (response: Response): void => {
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');
  
  if (remaining) {
    rateLimitRemaining = parseInt(remaining, 10);
    console.log('TIPIDKOR: Rate limit remaining:', rateLimitRemaining);
  }
  
  if (reset) {
    rateLimitReset = parseInt(reset, 10);
    console.log('TIPIDKOR: Rate limit reset timestamp:', rateLimitReset);
  }
};

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
export const initializeSession = () => {
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    console.log('TIPIDKOR: Created new session ID:', currentSessionId);
  } else {
    console.log('TIPIDKOR: Using existing session ID:', currentSessionId);
  }
};

/**
 * Menghapus session ID untuk memulai percakapan baru
 */
export const clearChatHistory = () => {
  console.log('TIPIDKOR: Clearing chat history and session');
  currentSessionId = null;
};

export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  let retries = 0;

  // Generate or retrieve session ID
  if (!currentSessionId) {
    initializeSession();
  }
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('agent_id', 'tipidkor-chat');
      formData.append('stream', 'false');
      formData.append('monitor', 'false');
      formData.append('session_id', currentSessionId as string);
      formData.append('user_id', currentSessionId as string);

      console.log('Sending request with FormData:', {
        message: message.trim(),
        agent_id: 'tipidkor-chat',
        session_id: currentSessionId,
        user_id: currentSessionId,
      });

      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Origin': window.location.origin,
      };
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }
      
      // Tambahkan Firebase auth token jika tersedia
      const firebaseToken = await getFirebaseToken();
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
        console.log('TIPIDKOR: Firebase token added to request');
      }

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formData,
        mode: 'cors',
        credentials: 'include'
      };

      // Use relative URL instead of full URL to leverage vite proxy
      let url = '/v1/playground/agents/tipidkor-chat/runs';
      if (API_BASE_URL !== 'http://localhost:8000' && !API_BASE_URL.includes('localhost')) {
        // Use full URL only when not in development
        url = `${API_BASE_URL}/v1/playground/agents/tipidkor-chat/runs`;
      }
      console.log('Sending request to:', url);

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT);
      
      requestOptions.signal = abortController.signal;
      const response = await fetch(url, requestOptions);
      
      clearTimeout(timeoutId);

      // Ekstrak informasi rate limit
      extractRateLimitInfo(response);

      if (abortController.signal.aborted) {
        throw new Error('Request timed out after 10 minutes');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        if (response.status === 429) {
          // Gunakan pesan rate limit yang lebih informatif
          throw new Error(getRateLimitMessage());
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
      
      if (error instanceof TypeError && retries < MAX_RETRIES) {
        retries++;
        await wait(RETRY_DELAY * retries);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Failed after maximum retries');
};