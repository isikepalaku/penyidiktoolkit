import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import useAIChatStreamHandler from '@/hooks/playground/useAIChatStreamHandler';
import { usePlaygroundStore } from '@/stores/PlaygroundStore';
import { Button } from './button';
import { Textarea } from './textarea';

/**
 * Contoh sederhana implementasi streaming untuk Wassidik AI
 * Menunjukkan cara menggunakan hooks dan store yang sudah dibuat
 */
export default function WassidikStreamingExample() {
  const { handleStreamResponse } = useAIChatStreamHandler();
  const { messages, isStreaming } = usePlaygroundStore();
  const [input, setInput] = useState('');

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    
    // Prepare FormData for streaming
    const formData = new FormData();
    formData.append('message', input.trim());
    
    // Clear input
    setInput('');
    
    try {
      // Use streaming handler - this will:
      // 1. Add user message to store
      // 2. Create empty agent message
      // 3. Stream response chunks and update agent message in real-time
      await handleStreamResponse(formData);
    } catch (error) {
      console.error('Error in streaming:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-purple-600">
        Wassidik Streaming Example
      </h2>
      
      {/* Messages Display */}
      <div className="border rounded-lg p-4 mb-4 h-96 overflow-y-auto bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-gray-500 italic text-center">
            Belum ada pesan. Kirim pesan untuk melihat streaming bekerja!
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Show tool calls if any */}
                  {message.tool_calls && message.tool_calls.length > 0 && (
                    <div className="mt-2 text-xs opacity-70">
                      🔧 Tools: {message.tool_calls.map(tool => tool.function?.name).join(', ')}
                    </div>
                  )}
                  
                  {/* Show reasoning steps if any */}
                  {message.extra_data?.reasoning_steps && message.extra_data.reasoning_steps.length > 0 && (
                    <div className="mt-2 text-xs opacity-70">
                      🧠 Reasoning: {message.extra_data.reasoning_steps.length} steps
                    </div>
                  )}
                  
                  {/* Show if streaming error */}
                  {message.streamingError && (
                    <div className="mt-2 text-xs text-red-500">
                      ⚠️ Streaming error occurred
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">AI sedang mengetik...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ketik pesan Anda di sini..."
          className="flex-1 resize-none"
          rows={3}
          disabled={isStreaming}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!input.trim() || isStreaming}
          className="self-end"
        >
          {isStreaming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {/* Info */}
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Fitur Streaming:</strong></p>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Real-time response streaming</li>
          <li>Tool call monitoring</li>
          <li>Reasoning step visualization</li>
          <li>Error handling</li>
          <li>Session persistence</li>
          <li>State management dengan Zustand</li>
        </ul>
      </div>
    </div>
  );
}
