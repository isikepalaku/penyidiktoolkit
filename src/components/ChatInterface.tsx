import { useState, useRef, useEffect } from 'react';
import { User } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIInputWithLoading } from './ui/ai-input-with-loading';
import { AnimatedMessage } from './AnimatedMessage';
import StaticBotIcon from './ui/static-bot-icon';

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

const formatToolCall = (text: string) => {
  if (!text.includes('Running:')) return text;

  const parts = text.split('Running: ');
  return parts.map((part, index) => {
    if (index === 0) return part;

    const toolMatch = part.match(/^(\w+)\((.*?)\)/);
    if (!toolMatch) return part;

    const [, toolName, params] = toolMatch;
    const restOfText = part.slice(toolMatch[0].length);

    return `\`\`\`tool
${toolName}(${params})
\`\`\`${restOfText}`;
  }).join('');
};

const renderMessage = (message: string): string => {
  return formatToolCall(message);
};

const components: Components = {
  table: ({ children }) => (
    <div className="w-full my-4">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 break-words">
        {children}
      </table>
    </div>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-4 md:pl-6 my-2 space-y-1 break-words">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-4 md:pl-6 my-2 space-y-1 break-words">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="my-0.5 break-words">{children}</li>
  ),
  code: ({ node, children, ...props }) => {
    const isInline = node?.position?.start.line === node?.position?.end.line;
    return isInline ? (
      <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded break-words" {...props}>
        {children}
      </code>
    ) : (
      <div className="relative">
        <pre className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg whitespace-pre-wrap break-words">
          <code {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  p: ({ children }) => (
    <p className="my-2 break-words whitespace-pre-wrap">{children}</p>
  ),
  h1: ({ children }) => (
    <h1 className="text-xl md:text-2xl font-bold my-4 break-words">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg md:text-xl font-bold my-3 break-words">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base md:text-lg font-bold my-2 break-words">{children}</h3>
  ),
  a: ({ children, href }) => (
    <a 
      href={href}
      className="text-blue-600 hover:text-blue-800 break-all underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

export default function ChatInterface({ sendMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Handle component mount
  useEffect(() => {
    setIsComponentMounted(true);
  }, []);

  // Trigger custom event when chat starts
  useEffect(() => {
    // Check if this is the first user message (i.e., when length changes from 0 to 1 or from 1 to 2 if there's a welcome message)
    if ((messages.length === 1 && messages[0].type === 'user') || 
        (messages.length === 2 && messages[0].type === 'bot' && messages[1].type === 'user')) {
      // Dispatch custom event for PWA install button to listen to
      window.dispatchEvent(new CustomEvent('chatStarted'));
      console.log('Chat started event dispatched');
    }
  }, [messages]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        const { scrollHeight, clientHeight } = chatContainerRef.current;
        chatContainerRef.current.scrollTo({
          top: scrollHeight - clientHeight,
          behavior: 'smooth'
        });
      }
    });
  };

  useEffect(() => {
    if (isComponentMounted) {
      scrollToBottom();
    }
  }, [messages, isComponentMounted]);

  const handleSubmit = async (inputMessage: string) => {
    if (!inputMessage.trim() || isLoading || !isComponentMounted) return;

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

      // Delay animation to prevent layout shifts
      setTimeout(() => {
        if (isComponentMounted) {
          setMessages(prev =>
            prev.map(msg =>
              msg === botMessage ? { ...msg, isAnimating: false } : msg
            )
          );
        }
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

  if (!isComponentMounted) {
    return (
      <div className="flex flex-col h-full min-h-[600px] items-center justify-center bg-gray-50">
        <StaticBotIcon />
        <p className="mt-4 text-gray-600">Memuat chat interface...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[600px] max-h-screen relative">
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto pb-32"
      >
        <div className="w-full mb-safe space-y-2">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`py-4 md:py-6 px-3 md:px-4 ${
                message.type === 'bot' ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex gap-3 md:gap-4">
                <div className="flex-shrink-0">
                  {message.type === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-[#8E1616] flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 flex items-center justify-center">
                      <StaticBotIcon />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className={`prose max-w-none chat-message break-words ${
                    message.error ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {message.type === 'user' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className="text-sm md:text-base leading-relaxed prose-pre:max-w-full prose-pre:overflow-x-auto"
                        components={components}
                      >
                        {renderMessage(message.content)}
                      </ReactMarkdown>
                    ) : (
                      <AnimatedMessage
                        content={message.content}
                        isAnimating={message.isAnimating || false}
                        className="text-sm md:text-base leading-relaxed break-words"
                      />
                    )}
                  </div>
                  {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                    <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-white text-xs md:text-sm">
                      <div className="flex flex-col space-y-2">
                        <p className="text-[#8E1616] font-semibold">Informasi:</p>
                        <div className="flex items-start gap-2">
                          <span>LLM kadang memberikan informasi yang keliru, lakukan verifikasi untuk akurasi data</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="py-4 md:py-6 px-3 md:px-4 bg-gray-50">
              <div className="flex space-x-3 md:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <StaticBotIcon />
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

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 md:p-3 shadow-lg safe-area-bottom">
        <div className="max-w-5xl mx-auto">
          <AIInputWithLoading
            onSubmit={handleSubmit}
            loadingDuration={3000}
            placeholder="Ketik pesan Anda..."
            className="px-2 md:px-4"
            disabled={!isComponentMounted || isLoading}
          />
        </div>
      </div>
    </div>
  );
}
