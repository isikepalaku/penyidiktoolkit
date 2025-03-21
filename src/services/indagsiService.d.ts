declare module '@/services/indagsiService' {
  interface ChatResponse {
    text: string;
    sourceDocuments?: Array<{
      pageContent: string;
      metadata: Record<string, string>;
    }>;
    error?: boolean | string;
  }
  
  export function initializeSession(): void;
  export function clearChatHistory(): void;
  export function sendChatMessage(message: string): Promise<ChatResponse>;
  export { ChatResponse };
} 