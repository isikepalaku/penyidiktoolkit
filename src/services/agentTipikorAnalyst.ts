import { env } from '@/config/env';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 1; // Total 2 percobaan (initial + 1 retry)
const RETRY_DELAY = 30000; // Base delay 30 detik dengan exponential backoff
const API_BASE_URL = process.env.NODE_ENV === 'production' ? env.apiUrl : '';
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitAgentAnalysis = async (
  message: string
): Promise<string> => {
  let retries = 0;
  
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
      params.append('session_id', 'string');
      params.append('user_id', 'string');

      // Log request details
      console.group('Request Details');
      params.forEach((value, key) => {
        console.log(`${key}:`, value);
      });

      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': window.location.origin
      };
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      console.log('Headers:', headers);
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
        
        if (response.status >= 500 && retries < MAX_RETRIES) {
          retries++;
        await wait(RETRY_DELAY * Math.pow(2, retries));
          continue;
        }
        
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      console.log('Response content type:', contentType);

      const responseText = await response.text();
      console.log('Raw response:', responseText);

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
        console.error('Raw response was:', responseText);
        return responseText || 'Format respons tidak valid';
      }
    } catch (error) {
      console.error('Error in submitAgentAnalysis:', error);
      
      if ((error instanceof TypeError || error instanceof Error) && retries < MAX_RETRIES) {
        retries++;
        await wait(RETRY_DELAY * retries);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Failed after maximum retries');
};
