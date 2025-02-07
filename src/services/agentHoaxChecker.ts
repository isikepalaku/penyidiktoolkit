import { env } from '@/config/env';

const API_KEY = env.apiKey;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitAgentAnalysis = async (
  message: string
): Promise<string> => {
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('agent_id', 'hoax-checker-agent');
      formData.append('stream', 'false');
      formData.append('monitor', 'false');
      formData.append('session_id', 'string');
      formData.append('user_id', 'string');

      console.group('Request Details');
      console.log('FormData:', {
        message: message.trim(),
        agent_id: 'hoax-checker-agent',
        stream: 'false',
        monitor: 'false',
        session_id: 'string',
        user_id: 'string'
      });

      const headers: HeadersInit = {
        'Accept': 'application/json'
      };
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      console.log('Headers:', headers);
      console.groupEnd();

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formData
      };

      const url = `${API_BASE_URL}/v1/playground/agents/hoax-checker-agent/runs`;
      console.log('Sending request to:', url);
      
      const response = await fetch(url, requestOptions);

      console.group('Response Details');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.groupEnd();

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const responseText = await response.text();
      console.group('Response Content');
      console.log('Raw response:', responseText);
      console.groupEnd();

      try {
        const data = JSON.parse(responseText);
        
        if (data.content) return data.content;
        if (data.message) return data.message;
        if (data.text) return data.text;
        
        console.error('Unexpected response format:', data);
        return 'Format respons tidak sesuai yang diharapkan';
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
