import { env } from '@/config/env';

const API_KEY = env.apiKey;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitAgentAnalysis = async (
  message: string
): Promise<string> => {
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const payload = {
        message: message.trim(),
        agent_id: 'police-agent',
        stream: false,
        monitor: false
      };

      console.log('Sending request with payload:', payload);

      const response = await fetch('/v1/playground/agent/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Accept': 'text/plain'  // Request plain text response instead of JSON
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        if (response.status >= 500 && retries < MAX_RETRIES) {
          console.log(`Retrying after server error (attempt ${retries + 2} of ${MAX_RETRIES + 1})`);
          retries++;
          await wait(RETRY_DELAY);
          continue;
        }
        
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      try {
        // First try to parse as JSON
        if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
          try {
            const parsedResponse = JSON.parse(responseText);
            if (parsedResponse.content) return parsedResponse.content;
            if (parsedResponse.message) return parsedResponse.message;
            if (parsedResponse.result) return parsedResponse.result;
            if (typeof parsedResponse === 'string') return parsedResponse;
            return JSON.stringify(parsedResponse);
          } catch (e) {
            console.warn('Failed to parse JSON response:', e);
          }
        }
        
        // If not JSON or JSON parsing failed, return as plain text
        return responseText;
      } catch (error) {
        console.error('Error handling response:', error);
        throw new Error('Gagal memproses respon dari server');
      }
    } catch (error) {
      console.error('Error in submitAgentAnalysis:', error);
      
      if (error instanceof TypeError && retries < MAX_RETRIES) {
        console.log(`Retrying after network error (attempt ${retries + 2} of ${MAX_RETRIES + 1})`);
        retries++;
        await wait(RETRY_DELAY);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Failed after maximum retries');
};
