import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const FETCH_TIMEOUT = 600000; // 10 minutes timeout
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

// Store session ID
let currentSessionId: string | null = null;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const parseResponse = async (response: Response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    console.log('Response is not JSON, processing as text:', text);
    console.error('JSON parse error:', error);
    
    const jsonMatch = text.match(/\{.*?\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error('Failed to parse matched JSON:', error);
      }
    }
    
    return { content: text };
  }
};

interface SourceDocument {
  pageContent: string;
  metadata: Record<string, string>;
}

interface ChatResponse {
  text: string;
  sourceDocuments: SourceDocument[];
  error: boolean;
}

export const initializeSession = () => {
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    console.log('Initializing Fismondev session:', currentSessionId);
  }
};

export const clearChatHistory = () => {
  console.log('Clearing Fismondev chat history');
  currentSessionId = null;
};

export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  let retries = 0;

  if (!currentSessionId) {
    initializeSession();
  }
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('agent_id', 'fismondev-chat');
      formData.append('stream', 'false');
      formData.append('monitor', 'false');
      formData.append('session_id', currentSessionId as string);
      formData.append('user_id', currentSessionId as string);

      console.log('Sending request with FormData:', {
        message: message.trim(),
        agent_id: 'fismondev-chat',
        session_id: currentSessionId
      });

      const headers: HeadersInit = {
        'Accept': 'application/json',
      };
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formData
      };

      const url = `${API_BASE_URL}/v1/playground/agents/fismondev-chat/runs`;
      console.log('Sending request to:', url);

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT);
      
      requestOptions.signal = abortController.signal;
      const response = await fetch(url, requestOptions);
      
      clearTimeout(timeoutId);

      if (abortController.signal.aborted) {
        throw new Error('Request timed out after 10 minutes');
      }

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

      const data = await parseResponse(response);
      console.log('Parsed response data:', data);

      return {
        text: data.content || data.message || 'No response received',
        sourceDocuments: data.sourceDocuments || [],
        error: false
      };

    } catch (error) {
      console.error('Error in sendChatMessage:', error);
      
      if (error instanceof TypeError && retries < MAX_RETRIES) {
        retries++;
        await wait(RETRY_DELAY * retries);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Failed after maximum retries');
};
