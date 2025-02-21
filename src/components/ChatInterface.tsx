import { useState, useRef, useEffect } from 'react';
import { User, Bot } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIInputWithLoading } from './ui/ai-input-with-loading';
import { AnimatedMessage } from './AnimatedMessage';

interface Message {
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  sourceDocuments?: Array<{
    pageContent: string;
    metadata: Record<string, string>;
  }>;
  error?: boolean;
  isAnimating?: boolean;
}

interface ChatInterfaceProps {
  sendMessage: (message: string) => Promise<{
    text: string;
    sourceDocuments?: Array<{
      pageContent: string;
      metadata: Record<string, string>;
    }>;
    error?: string;
  }>;
}

// Function to format tool calls
const formatToolCall = (text: string) => {
  if (!text.includes('Running:')) return text;

  const parts = text.split('Running: ');
  return parts.map((part, index) => {
    if (index === 0) return part;

    const toolMatch = part.match(/^(\w+)\((.*?)\)/);
    if (!toolMatch) return part;

    const [_, toolName, params] = toolMatch;
    const restOfText = part.slice(toolMatch[0].length);

    return `\`\`\`tool
${toolName}(${params})
\`\`\`${restOfText}`;
  }).join('');
};

// Update the message rendering
const renderMessage = (message: string): string => {
  return formatToolCall(message);
};

// Update components definition with proper types
const components: Components = {
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="my-0.5">{children}</li>
  ),
  code: ({ node, className, children, ...props }) => {
    const isInline = node?.position?.start.line === node?.position?.end.line;
    return isInline ? (
      <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded" {...props}>
        {children}
      </code>
    ) : (
      <pre className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto">
        <code {...props}>{children}</code>
      </pre>
    );
  }
};

export default function ChatInterface({ sendMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (inputMessage: string) => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      content: inputMessage.trim(),
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage(userMessage.content);

      if (response.error) {
        throw new Error(response.error);
      }

      const botMessage: Message = {
        content: response.text,
        type: 'bot',
        timestamp: new Date(),
        sourceDocuments: response.sourceDocuments,
        isAnimating: true
      };

      setMessages(prev => [...prev, botMessage]);

      // After a short delay, set isAnimating to false
      setTimeout(() => {
        setMessages(prev =>
          prev.map(msg =>
            msg === botMessage ? { ...msg, isAnimating: false } : msg
          )
        );
      }, 50);
    } catch (error) {
      const errorMessage: Message = {
        content: error instanceof Error ? error.message : 'Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan coba lagi dalam beberapa saat.',
        type: 'bot',
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Chat container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="w-full">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`py-6 px-4 ${
                message.type === 'bot' ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex gap-4 flex-wrap">
                <div className="flex-grow min-w-0">
                  <div className="flex space-x-4">
                    <div className="flex-shrink-0">
                      {message.type === 'user' ? (
                        <div className="w-8 h-8 rounded-full bg-[#8E1616] flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#D84040] flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className={`prose max-w-none chat-message ${
                        message.error ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {message.type === 'user' ? (
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            className="text-base leading-relaxed prose-ul:list-disc prose-ul:pl-6 prose-ul:my-2 prose-li:my-0.5 prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-2"
                            components={components}
                          >
                            {renderMessage(message.content)}
                          </ReactMarkdown>
                        ) : (
                          <AnimatedMessage
                            content={message.content}
                            isAnimating={message.isAnimating || false}
                            className="text-base leading-relaxed"
                          />
                        )}
                      </div>
                      {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                        <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-white text-sm">
                          <div className="flex flex-col space-y-2">
                            <p className="text-[#8E1616] font-semibold">Sumber Referensi:</p>
                            <div className="flex items-start gap-2">
                              <span>Perkaba Polri Polri Nomor 1 Tahun 2022 tentang Standar Operasional Prosedur (SOP) pelaksanaan penyidikan tindak pidana</span>
                              <a 
                                href="https://celebesbot.com/pdf/LAMPIRANISOPLIDIKSIDIKPERKABA1THN2022TGL27DES2022.pdf" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#D84040] hover:text-[#8E1616] underline transition-colors whitespace-nowrap"
                              >
                                [1]
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="py-6 px-4 bg-gray-50">
              <div className="flex space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#D84040] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-[#D84040] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#D84040] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#D84040] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input form */}
      <div>
        <AIInputWithLoading
          onSubmit={handleSubmit}
          loadingDuration={3000}
          placeholder="Ketik pesan Anda..."
          className="px-4"
        />
      </div>
    </div>
  );
}
