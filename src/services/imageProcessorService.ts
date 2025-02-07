import { env } from '@/config/env';
import { imageProcessorAgent } from '@/data/agents/imageProcessorAgent';

interface StreamEvent {
  event: string;
  content: string;
  content_type: string;
  model: string;
  run_id: string;
  agent_id: string;
  session_id: string;
  created_at: number;
  messages?: Array<{
    role: string;
    content: string;
  }>;
}

const API_KEY = env.apiKey;
const MAX_RETRIES = 1;
const RETRY_DELAY = 1000;
const API_BASE_URL = env.apiUrl || 'http://localhost:8000'; // Menggunakan localhost Docker container

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitImageProcessorAnalysis = async (imageFile: File): Promise<string> => {
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const formData = new FormData();
      formData.append('message', 'string');
      formData.append('agent_id', imageProcessorAgent.id);
      formData.append('stream', 'true');
      formData.append('monitor', 'false'); 
      formData.append('session_id', 'string');
      formData.append('user_id', 'string');
      formData.append('image', imageFile);

      console.log('FormData contents:', {
        message: 'string',
        agent_id: imageProcessorAgent.id,
        stream: 'true',
        monitor: 'false',
        session_id: 'string',
        user_id: 'string',
        image: imageFile.name,
        size: imageFile.size
      });

      const headers: HeadersInit = {
        'Accept': 'application/json'
      };
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formData
      };

      // Gunakan URL lengkap untuk debugging
      const url = `${API_BASE_URL}/v1/playground/agents/${imageProcessorAgent.id}/runs`;
      console.log('Sending request to:', url);

      const response = await fetch(url, requestOptions);

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      // Cek content type
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      // Split the response into individual JSON objects
      const events = responseText.split('}{').map((event, index, array) => {
        let jsonStr = event;
        if (index > 0) jsonStr = '{' + jsonStr;
        if (index < array.length - 1) jsonStr = jsonStr + '}';
        try {
          return JSON.parse(jsonStr) as StreamEvent;
        } catch (e) {
          console.error('Failed to parse event:', jsonStr);
          return null;
        }
      }).filter((event): event is StreamEvent => event !== null);

      // Find the RunCompleted event
      const completedEvent = events.find(event => event.event === 'RunCompleted');
      if (completedEvent?.content) {
        return completedEvent.content;
      }

      // If no RunCompleted, combine all RunResponse events
      const responseContent = events
        .filter(event => event.event === 'RunResponse')
        .map(event => event.content)
        .join('');

      if (responseContent) {
        return responseContent;
      }

      // If still no content, try to get from the last event's messages
      const lastEvent = events[events.length - 1];
      const messages = lastEvent?.messages;
      
      if (messages && messages.length > 0) {
        const modelMessages = messages
          .filter(msg => msg.role === 'model')
          .map(msg => msg.content);
        
        if (modelMessages.length > 0) {
          return modelMessages[modelMessages.length - 1];
        }
      }

      console.error('No valid content found in events:', events);
      return 'Tidak dapat memproses respons dari server';

    } catch (error) {
      console.error('Error in submitImageProcessorAnalysis:', error);
      
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
