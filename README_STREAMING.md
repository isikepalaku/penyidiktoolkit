# AGNO Streaming Integration untuk WassidikPenyidik

Dokumentasi lengkap untuk implementasi streaming AGNO di frontend PenyidikToolkit.

## Overview

Implementasi ini menyediakan real-time streaming chat dengan AGNO API, termasuk:
- Real-time response streaming
- File upload dengan progress tracking
- Tool call monitoring
- Reasoning step visualization
- Session management
- Error handling yang komprehensif

## Architecture

### 1. Types & Interfaces (`src/types/playground.ts`)

```typescript
// Event types untuk streaming
export enum RunEvent {
  RunStarted = 'run_started',
  RunResponse = 'run_response', 
  RunCompleted = 'run_completed',
  RunError = 'run_error',
  ToolCallStarted = 'tool_call_started',
  ToolCallCompleted = 'tool_call_completed',
  ReasoningStarted = 'reasoning_started',
  ReasoningStep = 'reasoning_step',
  ReasoningCompleted = 'reasoning_completed'
}

// Response structure dari streaming
export interface RunResponse {
  event: RunEvent;
  content?: string | any;
  session_id?: string;
  tools?: ToolCall[];
  images?: MediaContent[];
  videos?: MediaContent[];
  audio?: MediaContent[];
  extra_data?: ExtraData;
  created_at?: number;
}
```

### 2. State Management (`src/stores/PlaygroundStore.ts`)

```typescript
import { usePlaygroundStore } from '@/stores/PlaygroundStore';

// Menggunakan Zustand untuk state management
const {
  messages,
  isStreaming,
  sessionId,
  setMessages,
  setIsStreaming,
  setSessionId
} = usePlaygroundStore();
```

### 3. Streaming Hooks

#### useAIResponseStream (`src/hooks/streaming/useAIResponseStream.ts`)
Hook untuk menangani koneksi streaming dan parsing buffer.

#### useAIChatStreamHandler (`src/hooks/playground/useAIChatStreamHandler.ts`)
Hook utama untuk mengelola semua event streaming dan state updates.

#### useChatActions (`src/hooks/playground/useChatActions.ts`)
Helper functions untuk operasi chat seperti focus input, scroll, dll.

## Usage Examples

### 1. Basic Streaming Chat

```typescript
import useAIChatStreamHandler from '@/hooks/playground/useAIChatStreamHandler';
import { usePlaygroundStore } from '@/stores/PlaygroundStore';

function ChatComponent() {
  const { handleStreamResponse } = useAIChatStreamHandler();
  const { messages, isStreaming } = usePlaygroundStore();
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    
    await handleStreamResponse(input);
    setInput('');
  };

  return (
    <div>
      {/* Messages */}
      {messages.map(message => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      
      {/* Input */}
      <input 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isStreaming}
      />
      <button onClick={sendMessage} disabled={isStreaming}>
        Send
      </button>
    </div>
  );
}
```

### 2. File Upload dengan Streaming

```typescript
function FileUploadChat() {
  const { handleStreamResponse } = useAIChatStreamHandler();
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');

  const sendWithFiles = async () => {
    const formData = new FormData();
    formData.append('message', message || 'Analisis file ini');
    
    files.forEach(file => {
      formData.append('files', file);
    });

    await handleStreamResponse(formData);
    setFiles([]);
    setMessage('');
  };

  return (
    <div>
      <input 
        type="file" 
        multiple 
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />
      <input 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Optional message..."
      />
      <button onClick={sendWithFiles}>
        Send with Files
      </button>
    </div>
  );
}
```

### 3. Monitoring Tool Calls dan Reasoning

```typescript
function AdvancedChat() {
  const { messages } = usePlaygroundStore();

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          <div>{message.content}</div>
          
          {/* Tool calls */}
          {message.tool_calls && message.tool_calls.length > 0 && (
            <div className="tools">
              🔧 Tools: {message.tool_calls.map(tool => tool.function?.name).join(', ')}
            </div>
          )}
          
          {/* Reasoning steps */}
          {message.extra_data?.reasoning_steps && (
            <div className="reasoning">
              🧠 Reasoning: {message.extra_data.reasoning_steps.length} steps
            </div>
          )}
          
          {/* References */}
          {message.extra_data?.references && (
            <div className="references">
              📚 References: {message.extra_data.references.length} sources
            </div>
          )}
          
          {/* Media */}
          {message.images && message.images.length > 0 && (
            <div>🖼️ Images: {message.images.length}</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Event Handling

### RunEvent Types

1. **RunStarted**: Streaming dimulai
   - Initialize session
   - Set loading state
   - Save session to storage

2. **RunResponse**: Chunk response diterima
   - Append content ke message
   - Update metadata (tools, reasoning, references)
   - Prevent content duplication

3. **RunCompleted**: Streaming selesai
   - Finalize message content
   - Complete metadata
   - Stop loading state

4. **RunError**: Error terjadi
   - Mark message as error
   - Display error message
   - Cleanup session

5. **ToolCallStarted/Completed**: Tool execution
   - Show tool indicators
   - Update tool results

6. **ReasoningStep**: Reasoning progress
   - Live reasoning updates
   - Step-by-step visualization

## Error Handling

```typescript
// Network errors dengan retry
if (isNetworkError && retries < MAX_RETRIES) {
  console.log(`Network error detected, retrying attempt ${retries + 1}...`);
  retries++;
  await wait(backoffDelay);
  continue;
}

// Timeout handling
const controller = new AbortController();
const timeoutId = setTimeout(() => {
  controller.abort();
}, FETCH_TIMEOUT);

// Parse errors
try {
  const parsed = JSON.parse(jsonString) as RunResponse;
  processChunk(parsed, onChunk);
} catch (parseError) {
  console.warn('Failed to parse JSON chunk:', parseError);
  break;
}
```

## Session Management

```typescript
// Initialize session
await initializeStreamingSession();

// Clear chat history
clearStreamingChatHistory();

// Get current session
const { sessionId, userId } = getCurrentStreamingSession();
```

## Progress Tracking

```typescript
// Setup progress listener
useEffect(() => {
  const unsubscribe = onProgress((progressInfo) => {
    setProgress({
      status: progressInfo.status,
      percent: progressInfo.percent || 0
    });
  });
  
  return unsubscribe;
}, []);
```

## Best Practices

1. **Always check streaming state** sebelum mengirim message baru
2. **Handle file size limits** untuk upload yang besar
3. **Implement proper cleanup** untuk event listeners
4. **Use proper TypeScript typing** untuk semua interfaces
5. **Monitor network status** untuk retry logic
6. **Provide user feedback** untuk loading states
7. **Handle session persistence** dengan localStorage

## Troubleshooting

### Common Issues

1. **"Element type is invalid"**: Pastikan semua components adalah React components yang valid
2. **Network timeout**: Increase FETCH_TIMEOUT untuk file besar
3. **Parse errors**: Check JSON format dari streaming response
4. **Session not found**: Ensure proper session initialization
5. **Memory leaks**: Always cleanup event listeners di useEffect

### Debug Tips

```typescript
// Enable debug logging
console.log('Streaming chunk received:', {
  event: chunk.event,
  content_preview: typeof chunk.content === 'string' 
    ? chunk.content.substring(0, 50)
    : typeof chunk.content,
  session_id: chunk.session_id
});
```

## Dependencies

```json
{
  "zustand": "^4.x.x",
  "uuid": "^9.x.x"
}
```

## Environment Variables

```env
VITE_API_KEY=your_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Integration dengan WassidikPenyidikChatPage

Komponen WassidikPenyidikChatPage sudah enhanced dengan:
- Progress tracking untuk file uploads
- Real-time streaming indicators
- Enhanced error messages
- File preview dan removal
- Data attributes untuk DOM integration

Implementasi ini siap untuk production dengan comprehensive error handling, type safety, dan modular architecture. 