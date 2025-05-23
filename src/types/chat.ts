/**
 * Types dan interfaces untuk chat components
 */

export interface Message {
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  sourceDocuments?: Array<{
    pageContent: string;
    metadata: Record<string, string>;
  }>;
  error?: boolean;
  isAnimating?: boolean;
  isRateLimit?: boolean;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  name: string;
  size: number;
  type: string;
}

export interface ChatPageProps {
  onBack?: () => void;
}

export interface ProgressInfo {
  status: 'preparing' | 'uploading' | 'processing' | 'completed';
  percent: number;
}

export interface FileUploadState {
  selectedFiles: File[];
  progress: ProgressInfo;
  showProgress: boolean;
}

export interface ChatState {
  messages: Message[];
  inputMessage: string;
  isProcessing: boolean;
  hasError: boolean;
  isConnectionError: boolean;
  showInfo: boolean;
  copied: string | null;
} 