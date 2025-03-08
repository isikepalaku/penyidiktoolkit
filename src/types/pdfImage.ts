// Types for PDF and image processing
export interface PdfImageFormData extends Record<string, unknown> {
  files: File[] | null;
  task_type: string;
  instruction: string;
}

export interface PdfImageTaskMetadata {
  fileCount: number;
  totalSize: string;
  fileTypes: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PdfImageChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
} 