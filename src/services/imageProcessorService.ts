import { env } from '@/config/env';
import { imageProcessorAgent } from '@/data/agents/imageProcessorAgent';

interface Message {
  role: string;
  content: string;
}

interface StreamEvent {
  event: string;
  content?: string;
  messages?: Message[];
}

const API_KEY = env.apiKey;
const MAX_RETRIES = 1;
const RETRY_DELAY = 1000;
const API_BASE_URL = env.apiUrl || 'https://api.reserse.id'; // Gunakan HTTPS API URL dari environment atau fallback ke production URL

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
        
        if (response.status >= 500 && retries < MAX_RETRIES) {
          retries++;
          await wait(RETRY_DELAY * retries);
          continue;
        }
        
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const responseText = await response.text();
      const events = responseText.split('}').map(event => {
        if (!event.trim()) return null;
        try {
          return JSON.parse(event + '}') as StreamEvent;
        } catch {
          try {
            return JSON.parse(event.trim() + '}') as StreamEvent;
          } catch {
            return null;
          }
        }
      }).filter((event): event is StreamEvent => event !== null);

      // Cari RunCompleted event
      const completedEvent = events.find(event => event.event === 'RunCompleted');
      if (completedEvent?.content) {
        return completedEvent.content;
      }

      // Jika tidak ada RunCompleted, gabungkan semua RunResponse
      const responseContent = events
        .filter(event => event.event === 'RunResponse')
        .map(event => event.content)
        .filter((content): content is string => content !== undefined)
        .join('');

      if (responseContent) {
        return responseContent;
      }

      // Jika masih tidak ada, coba ambil dari messages
      const messagesEvent = events.find(event => event.messages && Array.isArray(event.messages) && event.messages.length > 0);
      if (messagesEvent?.messages) {
        const modelMessages = messagesEvent.messages
          .filter((msg: Message) => msg.role === 'model')
          .map((msg: Message) => msg.content);
        
        if (modelMessages.length > 0) {
          return modelMessages[modelMessages.length - 1];
        }
      }

      console.error('No valid content found in events:', events);
      throw new Error('Tidak ada konten yang valid dari response');

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
  
  throw new Error('Gagal setelah mencoba maksimum retries');
};
