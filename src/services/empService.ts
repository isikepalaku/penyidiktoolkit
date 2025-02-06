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
  sessionId?: string;
  memoryKey?: string;
  history?: ChatMessage[];
}

// Store chat history in memory
let chatHistory: ChatMessage[] = [];

export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  const chatflowId = 'ffa7dc02-dc42-4302-8058-5933e49f407e';
  // Gunakan URL lengkap di production (Vercel), proxy hanya untuk development
  const baseUrl = import.meta.env.PROD 
    ? (import.meta.env.VITE_PERKABA_API_URL || 'https://flow.reserse.id')
    : '/flowise';
  const apiUrl = `${baseUrl}/api/v1/prediction/${chatflowId}`;

  try {
    // Add user message to history
    chatHistory.push({
      role: 'userMessage',
      content: message
    });

    const requestBody: ChatRequest = {
      question: message,
      history: chatHistory
    };

    // Log request details
    console.group('Chat API Request');
    console.log('Environment:', import.meta.env.PROD ? 'Production' : 'Development');
    console.log('Base URL:', baseUrl);
    console.log('Full URL:', apiUrl);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.groupEnd();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_PERKABA_API_KEY}`
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

    // Keep only the last N messages to prevent history from growing too large
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

// Add a function to clear chat history if needed
export const clearChatHistory = () => {
  chatHistory = [];
};
