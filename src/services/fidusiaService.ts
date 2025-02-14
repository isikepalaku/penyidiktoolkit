import { getOrCreateSessionData } from '@/utils/session';

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

// Store chat history in memory
let chatHistory: ChatMessage[] = [];

export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  try {
    // Get session and user data
    const { sessionId, userId } = getOrCreateSessionData();

    // Add user message to history
    chatHistory.push({
      role: 'userMessage',
      content: message
    });

    // Prepare form data with session ID and user ID
    const formData = new FormData();
    formData.append('message', message);
    formData.append('stream', 'false');
    formData.append('monitor', 'false');
    formData.append('session_id', sessionId);
    formData.append('user_id', userId);

    // Log the request details
    console.group('Fidusia Chat API Request');
    console.log('Message:', message);
    console.log('Session ID:', sessionId);
    console.log('User ID:', userId);
    console.groupEnd();

    const response = await fetch('/v1/playground/agents/fidusia-agent/runs', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': import.meta.env.VITE_API_KEY || ''
      },
      body: formData
    });

    // Log the response details
    console.group('Fidusia Chat API Response');
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
      content: data.content || data.text || 'No response text received'
    });

    // Keep only the last N messages
    const MAX_HISTORY = 10;
    if (chatHistory.length > MAX_HISTORY) {
      chatHistory = chatHistory.slice(-MAX_HISTORY);
    }
    
    // Log the successful response
    console.group('Fidusia Chat API Success');
    console.log('Response Data:', JSON.stringify(data, null, 2));
    console.log('Current History:', JSON.stringify(chatHistory, null, 2));
    console.groupEnd();

    return {
      text: data.content || data.text || 'No response text received',
      sourceDocuments: data.sourceDocuments,
    };
  } catch (err) {
    // Log the error details
    console.group('Fidusia Chat API Error');
    const error = err as Error;
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.groupEnd();

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        text: 'Network error: Unable to connect to the chat service. Please check your connection.',
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

// Add a function to clear chat history if needed
export const clearChatHistory = () => {
  chatHistory = [];
}; 