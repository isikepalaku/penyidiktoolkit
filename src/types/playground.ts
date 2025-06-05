export enum RunEvent {
  RunStarted = 'RunStarted',
  RunResponse = 'RunResponse', 
  RunCompleted = 'RunCompleted',
  RunError = 'RunError',
  ToolCallStarted = 'ToolCallStarted',
  ToolCallCompleted = 'ToolCallCompleted',
  ReasoningStarted = 'ReasoningStarted',
  ReasoningStep = 'ReasoningStep',
  ReasoningCompleted = 'ReasoningCompleted',
  UpdatingMemory = 'UpdatingMemory'
}

export interface ToolCall {
  id: string;
  type: string;
  function?: {
    name: string;
    arguments: string;
  };
  result?: any;
}

export interface ReasoningStep {
  step: number;
  description: string;
  content?: string;
}

export interface Reference {
  title: string;
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface MediaContent {
  type: 'image' | 'video' | 'audio';
  url: string;
  metadata?: Record<string, any>;
}

export interface ExtraData {
  reasoning_steps?: ReasoningStep[];
  references?: Reference[];
  metadata?: Record<string, any>;
}

export interface RunResponse {
  event: RunEvent;
  content?: string | any;
  session_id?: string;
  agent_id?: string;
  tools?: ToolCall[];
  tool_calls?: ToolCall[];
  images?: MediaContent[];
  videos?: MediaContent[];
  audio?: MediaContent[];
  response_audio?: MediaContent;
  extra_data?: ExtraData;
  created_at?: number;
  error?: string;
  message?: string;
}

export interface PlaygroundChatMessage {
  id?: string;
  role: 'user' | 'agent' | 'assistant';
  content: string;
  tool_calls?: ToolCall[];
  images?: MediaContent[];
  videos?: MediaContent[];
  audio?: MediaContent[];
  response_audio?: MediaContent;
  extra_data?: ExtraData;
  streamingError?: boolean;
  created_at: number;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

export interface StreamOptions {
  apiUrl: string;
  requestBody: FormData;
  onChunk: (chunk: RunResponse) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export interface SessionEntry {
  session_id: string;
  title: string;
  created_at: number;
  lastActivity?: number; // Timestamp of last activity for cleanup purposes
}

export interface StreamingStatus {
  isThinking: boolean;
  isCallingTool: boolean;
  toolName?: string;
  isUpdatingMemory: boolean;
  hasCompleted: boolean;
}

export interface PlaygroundStore {
  messages: PlaygroundChatMessage[];
  isStreaming: boolean;
  streamingErrorMessage: string | null;
  sessionId: string | null;
  sessionsData: SessionEntry[] | null;
  hasStorage: boolean;
  selectedEndpoint: string;
  streamingStatus: StreamingStatus;
  setMessages: (messages: PlaygroundChatMessage[] | ((prev: PlaygroundChatMessage[]) => PlaygroundChatMessage[])) => void;
  addMessage: (message: PlaygroundChatMessage) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setStreamingErrorMessage: (message: string | null) => void;
  setSessionId: (sessionId: string | null) => void;
  setSessionsData: (data: SessionEntry[] | null | ((prev: SessionEntry[] | null) => SessionEntry[] | null)) => void;
  setSelectedEndpoint: (endpoint: string) => void;
  setStreamingStatus: (status: Partial<StreamingStatus>) => void;
  resetStreamingStatus: () => void;
} 