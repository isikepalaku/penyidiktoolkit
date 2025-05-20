import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const API_BASE_URL = process.env.NODE_ENV === 'production' ? env.apiUrl : '';
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Create AbortController for timeout
const createTimeoutController = (timeoutMs: number): { controller: AbortController; timeout: NodeJS.Timeout } => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
};

// Variabel global untuk menyimpan session_id dan user_id
let currentSessionId = '';
let currentUserId = '';

// Fungsi untuk inisialisasi session baru
export const initializeSession = async (): Promise<string> => {
  try {
    // Dapatkan session Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    // Generate session ID baru
    currentSessionId = `hoax_${uuidv4()}`;
    
    // Gunakan user ID dari Supabase jika login, atau buat ID anonim
    currentUserId = session?.user?.id || `anon_${uuidv4()}`;
    
    console.log('Hoax Checker: Initialized new session:', currentSessionId);
    console.log('Hoax Checker: Using user ID:', currentUserId);
    
    return currentSessionId;
  } catch (error) {
    console.error('Error initializing session:', error);
    // Fallback jika terjadi error
    currentSessionId = `hoax_${uuidv4()}`;
    currentUserId = `anon_${uuidv4()}`;
    return currentSessionId;
  }
};

// Fungsi untuk clear session history
export const clearChatHistory = async (): Promise<void> => {
  try {
    // Simpan user ID yang ada
    const existingUserId = currentUserId;
    
    // Inisialisasi session baru tapi pertahankan user ID
    currentSessionId = `hoax_${uuidv4()}`;
    
    // Gunakan user ID yang sama jika sudah ada
    if (existingUserId) {
      currentUserId = existingUserId;
    } else {
      // Dapatkan session Supabase jika tidak ada user ID yang disimpan
      const { data: { session } } = await supabase.auth.getSession();
      currentUserId = session?.user?.id || `anon_${uuidv4()}`;
    }
    
    console.log('Hoax Checker: Chat history cleared, new session:', currentSessionId);
  } catch (error) {
    console.error('Error clearing chat history:', error);
    // Fallback jika terjadi error
    currentSessionId = `hoax_${uuidv4()}`;
  }
};

export const submitAgentAnalysis = async (
  message: string
): Promise<string> => {
  let retries = 0;
  
  try {
    // Inisialisasi session jika belum ada
    if (!currentSessionId) {
      await initializeSession();
    }
    
    // Dapatkan session Supabase untuk token autentikasi
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthenticated = !!session?.user?.id;
    
    while (retries <= MAX_RETRIES) {
      try {
        console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);

        // Ensure message is not empty and is a string
        const trimmedMessage = message?.trim() || '';
        if (!trimmedMessage) {
          throw new Error('Message cannot be empty');
        }

        // Use URL parameters instead of FormData
        // Convert parameters to URLSearchParams
        const params = new URLSearchParams();
        params.append('message', trimmedMessage);
        params.append('agent_id', 'hoax-checker-agent');
        params.append('stream', 'false');
        params.append('monitor', 'false');
        params.append('session_id', currentSessionId);
        params.append('user_id', currentUserId);
        params.append('is_authenticated', String(isAuthenticated));

        // Log request details
        console.group('Request Details');
        params.forEach((value, key) => {
          if (key !== 'X-API-Key') { // Jangan log API key
            console.log(`${key}:`, key === 'user_id' ? '[REDACTED]' : value);
          }
        });

        const headers: HeadersInit = {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': window.location.origin,
          'X-User-ID': currentUserId
        };
        
        // Tambahkan token autentikasi jika user login
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log('Using authentication token from Supabase');
        }
        
        if (API_KEY) {
          headers['X-API-Key'] = API_KEY;
        }

        console.log('Headers keys:', Object.keys(headers));
        console.groupEnd();

        // Use relative URL in dev, full URL in production
        const url = API_BASE_URL ? `${API_BASE_URL}/v1/playground/agents/hoax-checker-agent/runs` : '/v1/playground/agents/hoax-checker-agent/runs';
        console.log('Sending request to:', url);

        const { controller, timeout } = createTimeoutController(30000); // 30 second timeout
        
        const requestOptions: RequestInit = {
          method: 'POST',
          headers,
          body: params.toString(),
          signal: controller.signal
        };

        const response = await fetch(url, requestOptions);
        clearTimeout(timeout);

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          
          if (response.status === 429) {
            throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
          }
          
          if (response.status === 401) {
            throw new Error('Unauthorized: API key tidak valid');
          }

          if (response.status === 403) {
            throw new Error('Forbidden: Tidak memiliki akses');
          }
          
          if (response.status >= 500 && retries < MAX_RETRIES) {
            retries++;
            await wait(RETRY_DELAY * retries);
            continue;
          }
          
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        console.log('Response content type:', contentType);

        const responseText = await response.text();
        console.log('Raw response length:', responseText.length);

        try {
          if (!responseText) {
            throw new Error('Empty response received');
          }

          let parsedResponse = JSON.parse(responseText);
          
          // Handle nested JSON string case
          if (typeof parsedResponse === 'string' && parsedResponse.startsWith('{')) {
            parsedResponse = JSON.parse(parsedResponse);
          }
          
          if (parsedResponse.content) {
            return parsedResponse.content;
          }

          if (parsedResponse.message) {
            return parsedResponse.message;
          }

          console.error('Unexpected response format:', parsedResponse);
          throw new Error('Format respon tidak sesuai');
        } catch (error) {
          console.error('Error parsing response:', error);
          console.error('Raw response preview:', responseText.substring(0, 100) + '...');
          return responseText || 'Format respons tidak valid';
        }
      } catch (error) {
        console.error('Error in submitAgentAnalysis request:', error);
        
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
        
        if ((isNetworkError || error instanceof Error) && retries < MAX_RETRIES) {
          retries++;
          await wait(RETRY_DELAY * retries);
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Failed after maximum retries');
  } catch (error) {
    console.error('Error in submitAgentAnalysis:', error);
    throw error;
  }
};
