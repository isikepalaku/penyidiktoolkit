import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 1;
const RETRY_DELAY = 1000;
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitAgentAnalysis = async (
  message: string
): Promise<string> => {
  let retries = 0;
  
  try {
    // Dapatkan session Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    // Generate session ID dan user ID
    const sessionId = `session_${uuidv4()}`;
    
    // Gunakan user ID dari Supabase jika login, atau buat ID anonim
    const userId = session?.user?.id || `anon_${uuidv4()}`;
    const isAuthenticated = !!session?.user?.id;
    
    console.log('Agent Case Research: Using session ID:', sessionId);
    console.log('Agent Case Research: Using user ID:', userId, 'is_authenticated:', isAuthenticated);
    
    while (retries <= MAX_RETRIES) {
      try {
        console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
        
        const formData = new FormData();
        formData.append('message', message.trim());
        formData.append('agent_id', 'penyidik-polri-agent');
        formData.append('stream', 'false');
        formData.append('monitor', 'false');
        formData.append('session_id', sessionId);
        formData.append('user_id', userId);
        formData.append('is_authenticated', String(isAuthenticated));

        console.log('Sending request with FormData', {
          agent_id: 'penyidik-polri-agent',
          session_id: sessionId,
          user_id: userId,
          is_authenticated: isAuthenticated
        });

        const headers: HeadersInit = {
          'Accept': 'application/json',
          'X-User-ID': userId
        };
        
        // Tambahkan token autentikasi jika user login
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log('Using authentication token from Supabase');
        }
        
        if (API_KEY) {
          headers['X-API-Key'] = API_KEY;
        }

        console.log('Request headers:', Object.keys(headers));

        const requestOptions: RequestInit = {
          method: 'POST',
          headers,
          body: formData
        };

        const url = `${API_BASE_URL}/v1/playground/agents/penyidik-polri-agent/runs`;
        console.log('Sending request to:', url);

        const response = await fetch(url, requestOptions);

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
            console.log(`Retrying after server error (attempt ${retries + 2} of ${MAX_RETRIES + 1})`);
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
          throw new Error('Format respon tidak valid');
        }
      } catch (error) {
        console.error('Error in submitAgentAnalysis request:', error);
        
        // Deteksi error jaringan
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
          console.log(`Retrying after network error (attempt ${retries + 2} of ${MAX_RETRIES + 1})`);
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