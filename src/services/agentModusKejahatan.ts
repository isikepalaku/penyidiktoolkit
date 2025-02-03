import { env } from '@/config/env';

const API_KEY = env.apiKey;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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

      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        credentials: 'include' as RequestCredentials
      };

      const response = await fetch('/v1/playground/workflows/analisis-modus-kejahatan/runs', requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
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