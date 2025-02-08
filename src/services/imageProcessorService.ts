import { env } from '@/config/env';

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
const API_BASE_URL = env.apiUrl || 'https://api.reserse.id';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitImageProcessorAnalysis = async (imageFile: File): Promise<string> => {
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const formData = new FormData();
      formData.append('message', 'Mohon analisis gambar ini dan berikan lokasi yang terlihat beserta penjelasannya');
      formData.append('stream', 'true');
      formData.append('monitor', 'false'); 
      formData.append('session_id', 'string');
      formData.append('user_id', 'string');
      formData.append('files', imageFile);

      console.group('Image Upload Details');
      console.log('File:', {
        name: imageFile.name,
        type: imageFile.type,
        size: imageFile.size,
        lastModified: new Date(imageFile.lastModified).toISOString()
      });

      console.log('FormData contents:', {
        message: 'Mohon analisis gambar ini dan berikan lokasi yang terlihat beserta penjelasannya',
        stream: 'true',
        monitor: 'false',
        session_id: 'string',
        user_id: 'string',
        files: imageFile.name,
        size: imageFile.size
      });
      console.groupEnd();

      const headers: HeadersInit = {
        'Accept': 'application/json',
        'X-API-Key': API_KEY || ''
      };

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formData
      };

      const url = `/v1/playground/agents/geo-image-agent/runs`;
      
      console.group('Request Details');
      console.log('API URL:', API_BASE_URL);
      console.log('Full URL:', url);
      console.log('Headers:', {
        ...headers,
        'X-API-Key': API_KEY ? '[REDACTED]' : 'missing'
      });
      console.groupEnd();

      const response = await fetch(url, requestOptions);

      console.group('Response Details');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.groupEnd();

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

      const completedEvent = events.find(event => event.event === 'RunCompleted');
      if (completedEvent?.content) {
        return completedEvent.content;
      }

      const responseContent = events
        .filter(event => event.event === 'RunResponse')
        .map(event => event.content)
        .filter((content): content is string => content !== undefined)
        .join('');

      if (responseContent) {
        return responseContent;
      }

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