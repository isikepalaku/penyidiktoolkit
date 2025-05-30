import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 3; // Total 4 percobaan (initial + 3 retries)
const INITIAL_RETRY_DELAY = 5000; // Initial delay 5 detik
const MAX_RETRY_DELAY = 30000; // Maximum delay 30 detik
const API_BASE_URL = process.env.NODE_ENV === 'production' ? env.apiUrl : '';
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
    
    console.log('Agent Tipikor Analyst: Using session ID:', sessionId);
    console.log('Agent Tipikor Analyst: Using user ID:', userId, 'is_authenticated:', isAuthenticated);
    
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
        params.append('agent_id', 'penyidik-tipikor');
        params.append('stream', 'false');
        params.append('monitor', 'false');
        params.append('session_id', sessionId);
        params.append('user_id', userId);
        params.append('is_authenticated', String(isAuthenticated));

        // Log request details
        console.group('Request Details');
        params.forEach((value, key) => {
          console.log(`${key}:`, value);
        });

        const headers: HeadersInit = {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': window.location.origin,
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

        console.log('Headers keys:', Object.keys(headers));
        console.groupEnd();

        // Use relative URL in dev, full URL in production
        const url = API_BASE_URL ? `${API_BASE_URL}/v1/playground/agents/penyidik-tipikor/runs` : '/v1/playground/agents/penyidik-tipikor/runs';
        console.log('Sending request to:', url);
        
        const requestOptions: RequestInit = {
          method: 'POST',
          headers,
          body: params.toString()
        };

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
          
          // Handle various error status codes
          if ((response.status >= 500 || response.status === 504) && retries < MAX_RETRIES) {
            retries++;
            // Exponential backoff with jitter and max delay
            const delay = Math.min(
              INITIAL_RETRY_DELAY * Math.pow(2, retries) * (0.5 + Math.random()),
              MAX_RETRY_DELAY
            );
            console.log(`Retrying in ${Math.round(delay/1000)} seconds...`);
            await wait(delay);
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
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, retries) * (0.5 + Math.random()),
            MAX_RETRY_DELAY
          );
          console.log(`Retrying in ${Math.round(delay/1000)} seconds...`);
          await wait(delay);
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
