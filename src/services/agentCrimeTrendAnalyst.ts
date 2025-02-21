import { env } from '@/config/env';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 1;
const RETRY_DELAY = 1000;
const API_BASE_URL = env.apiUrl || 'http://localhost:8001';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitCrimeTrendAnalysis = async (
  message: string
): Promise<string> => {
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('agent_id', 'polri-crime-trend-analyst');
      formData.append('stream', 'false');
      formData.append('monitor', 'false');
      formData.append('session_id', 'string');
      formData.append('user_id', 'string');

      console.log('Sending request with FormData');

      const headers: HeadersInit = {
        'Accept': 'application/json',
      };
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      console.log('Request headers:', headers);

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formData
      };

      const url = `${API_BASE_URL}/v1/playground/agents/polri-crime-trend-analyst/runs`;
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
          retries++;
          await wait(RETRY_DELAY * retries);
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
        throw new Error('Format respon tidak valid');
      }
    } catch (error) {
      console.error('Error in submitCrimeTrendAnalysis:', error);
      
      if (error instanceof TypeError && retries < MAX_RETRIES) {
        console.log(`Retrying after network error (attempt ${retries + 2} of ${MAX_RETRIES + 1})`);
        retries++;
        await wait(RETRY_DELAY * retries);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Failed after maximum retries');
}; 