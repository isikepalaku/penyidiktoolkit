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
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

export const submitImageProcessorAnalysis = async (imageFile: File): Promise<string> => {
  try {
    console.log('Starting image analysis with file:', {
      name: imageFile.name,
      type: imageFile.type,
      size: imageFile.size
    });

    if (!imageFile.type.startsWith('image/')) {
      throw new Error('File harus berupa gambar');
    }

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

    const url = `${API_BASE_URL}/v1/playground/agents/${imageProcessorAgent.id}/runs`;
    console.log('Sending request to:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response details:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('Raw response:', responseText);

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
        .filter(msg => msg.role === 'model')
        .map(msg => msg.content);
      
      if (modelMessages.length > 0) {
        return modelMessages[modelMessages.length - 1];
      }
    }

    console.error('No valid content found in events:', events);
    throw new Error('Tidak ada konten yang valid dari response');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Full error details:', {
      message: errorMessage,
      error
    });
    throw new Error(errorMessage);
  }
};