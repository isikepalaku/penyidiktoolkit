import { env } from '@/config/env';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const API_BASE_URL = env.apiUrl || 'http://localhost:8001';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitModusKejahatanAnalysis = async (
  kategori_kejahatan: string
): Promise<string> => {
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const requestBody = {
        input: {
          kategori_kejahatan: kategori_kejahatan.trim()
        },
        user_id: "string",
        session_id: "string"
      };

      console.group('Request Details');
      console.log('Request Body:', requestBody);

      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      console.log('Headers:', headers);
      console.groupEnd();

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      };

      // Ubah URL fetch untuk menggunakan API_BASE_URL
      const url = `${API_BASE_URL}/v1/playground/workflows/analisis-modus-kejahatan/runs`;
      console.log('Sending request to:', url);
      
      const response = await fetch(url, requestOptions);

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

      const responseText = await response.text();

      try {
        if (!responseText) {
          throw new Error('Empty response received');
        }

        let parsedResponse = JSON.parse(responseText);
        
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
      console.error('Error in submitModusKejahatanAnalysis:', error);
      
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