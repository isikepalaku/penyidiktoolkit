import { v4 as uuidv4 } from 'uuid';

interface ChatResponse {
  text: string;
  sourceDocuments?: Array<{
    pageContent: string;
    metadata: Record<string, string>;
  }>;
  error?: string;
}

interface ChatMessage {
  role: 'apiMessage' | 'userMessage';
  content: string;
}

interface ChatRequest {
  question: string;
  overrideConfig?: {
    sessionId: string;
    memoryKey: string;
  };
  history?: ChatMessage[];
}

// Store chat history and session in memory
let chatHistory: ChatMessage[] = [];
let currentSessionId: string | null = null;

export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  const chatflowId = 'f6333f3e-e689-4b23-a303-9faddc0a1fe5';
  const apiUrl = `/flowise/api/v1/prediction/${chatflowId}`;

  // Generate or retrieve session ID
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    // Reset chat history when creating new session
    chatHistory = [];
  }

  try {
    // Add user message to history
    chatHistory.push({
      role: 'userMessage',
      content: message
    });

    const requestBody: ChatRequest = {
      question: message,
      overrideConfig: {
        sessionId: currentSessionId,
        memoryKey: currentSessionId
      },
      history: chatHistory
    };

    // Log request details
    console.group('Chat API Request');
    console.log('URL:', apiUrl);
    console.log('Session ID:', currentSessionId);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.groupEnd();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_PERKABA_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Log the response details
    console.group('Chat API Response');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.groupEnd();

    if (!response.ok) {
      const text = await response.text();
      console.error('API Error Response:', text);
      throw new Error(`API Error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    
    // Add API response to history
    chatHistory.push({
      role: 'apiMessage',
      content: data.text || 'No response text received'
    });

    // Keep only the last N messages
    const MAX_HISTORY = 10;
    if (chatHistory.length > MAX_HISTORY) {
      chatHistory = chatHistory.slice(-MAX_HISTORY);
    }
    
    // Log the successful response
    console.group('Chat API Success');
    console.log('Response Data:', JSON.stringify(data, null, 2));
    console.log('Current History:', JSON.stringify(chatHistory, null, 2));
    console.groupEnd();

    return {
      text: data.text || 'No response text received',
      sourceDocuments: data.sourceDocuments,
    };
  } catch (err) {
    // Log the error details
    console.group('Chat API Error');
    const error = err as Error;
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.groupEnd();

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        text: 'Network error: Unable to connect to the chat service. Please check if the Flowise server is running and accessible.',
        error: error.message
      };
    }

    // Handle other errors
    return {
      text: 'Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan coba lagi dalam beberapa saat.',
      error: error.message || 'Unknown error occurred'
    };
  }
};

// Add a function to clear chat history and session
export const clearChatHistory = () => {
  chatHistory = [];
  currentSessionId = null;
};

// Add function to persist session between page reloads
export const initializeSession = () => {
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    chatHistory = [];
  }
}; 