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
  const apiUrl = 'https://flow.reserse.id/api/v1/prediction/' + chatflowId;

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

    // Log request untuk debugging
    console.group('EMP Chat API Request');
    console.log('API URL:', apiUrl);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.groupEnd();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    // Add AI response to history
    chatHistory.push({
      role: 'apiMessage',
      content: data.text
    });

    return data;
  } catch (error) {
    console.error('Error in EMP chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      text: `Maaf, terjadi kesalahan dalam memproses permintaan Anda: ${errorMessage}. Silakan coba lagi.`,
      error: errorMessage
    };
  }
};

// Add a function to clear chat history if needed
export const clearChatHistory = () => {
  chatHistory = [];
};
