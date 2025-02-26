import { useState, useRef, useEffect, useCallback } from 'react';
import { User } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIInputWithLoading } from './ui/ai-input-with-loading';
import { AnimatedMessage } from './AnimatedMessage';
import { AnimatedBotIcon } from './ui/animated-bot-icon';

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

interface UndangChatInterfaceProps {
  sendMessage: (message: string) => Promise<{
    text: string;
    sourceDocuments?: Array<{
      pageContent: string;
      metadata: Record<string, string>;
    }>;
    error?: string;
  }>;
}

const components: Components = {
  table: ({ children }) => (
    <div className="overflow-x-auto max-w-full my-4">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
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
        <pre className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto whitespace-pre-wrap break-words">
          <code {...props} className="break-words">
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
  )
};

const LoadingView = () => (
  <div className="flex items-center justify-center h-full">
    <div className="flex items-center space-x-2">
      <div className="w-2 h-2 bg-[#D84040] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-[#D84040] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-[#D84040] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

export default function UndangChatInterface({ sendMessage }: UndangChatInterfaceProps) {
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = sessionStorage.getItem('chatMessages');
      return savedMessages ? JSON.parse(savedMessages) : [];
    } catch (error) {
      console.error('Error loading saved messages:', error);
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    setIsComponentMounted(true);
    return () => {
      setIsComponentMounted(false);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (messages.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (messages.length > 0) {
        e.preventDefault();
        if (window.confirm('Yakin ingin keluar? Percakapan akan hilang.')) {
          sessionStorage.removeItem('chatMessages');
          setMessages([]);
        } else {
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [messages.length]);

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

  if (!isComponentMounted) {
    return <LoadingView />;
  }

  return (
    <div className="flex flex-col h-[600px] max-h-screen">
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="w-full">
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
                      <AnimatedBotIcon />
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
                        {message.content}
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
                          <span>AI dapat memberikan informasi yang keliru, silahkan melakukan pengecekan ulang untuk memastikan keakuratan informasi.</span>
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
                    <AnimatedBotIcon />
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

      <div className="mt-auto">
        <AIInputWithLoading
          onSubmit={handleSubmit}
          disabled={!isComponentMounted || isLoading}
          loadingDuration={3000}
          placeholder="Silahkan menulis pertanyaan Anda..."
          className="px-3 md:px-4"
        />
      </div>
    </div>
  );
}