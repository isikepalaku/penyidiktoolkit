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
  const chatflowId = 'e7f8d446-2fa1-433e-b29e-790b820fb83a'; // You'll need to replace this with your actual Wassidik chatflow ID
  const apiUrl = `/flowise/api/v1/prediction/${chatflowId}`;

  try {
    // Add user message to history
    chatHistory.push({
      role: 'userMessage',
      content: message
    });

    // Prepare the request body with history
    const requestBody: ChatRequest = {
      question: message,
      history: chatHistory
    };

    // Log the request details
    console.group('Wassidik Chat API Request');
    console.log('URL:', apiUrl);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.groupEnd();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Add AI response to history
    chatHistory.push({
      role: 'apiMessage',
      content: data.text
    });

    return data;
  } catch (error) {
    console.error('Error in Wassidik chat:', error);
    return {
      text: 'Maaf, terjadi kesalahan dalam memproses permintaan Anda. Silakan coba lagi.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Add a function to clear chat history if needed
export const clearChatHistory = () => {
  chatHistory = [];
};
