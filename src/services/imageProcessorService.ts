import { env } from '@/config/env';

const API_KEY = env.apiKey;
const MAX_RETRIES = 1; // Only retry once
const RETRY_DELAY = 1000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitImageProcessorAnalysis = async (imageFile: File): Promise<string> => {
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);

      const formData = new FormData();
      formData.append('message', 'Please analyze the geographic location and details shown in this image.');
      formData.append('agent_id', 'geo-expert-agent');
      formData.append('stream', 'false');
      formData.append('monitor', 'false');
      formData.append('session_id', 'string');
      formData.append('user_id', 'string');
      formData.append('files', imageFile);

      console.log('Sending request with FormData');

      const headers: HeadersInit = {
        'Accept': 'application/json'
      };
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      console.log('Request headers:', headers);

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include' as RequestCredentials
      };

      console.log('Sending request to API proxy');

      const response = await fetch('/api/v1/playground/agent/run', requestOptions);

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      return data.response || data.result || '';

    } catch (error) {
      console.error(`Error in attempt ${retries + 1}:`, error);
      
      if (retries === MAX_RETRIES) {
        throw new Error('Failed to process image after maximum retries');
      }
      
      retries++;
      await wait(RETRY_DELAY * retries);
    }
  }

  throw new Error('Failed to process image');
};
