import { useState, useRef, useEffect } from 'react';
import { User, Bot } from 'lucide-react';
import { sendChatMessage } from '../services/perkabaService';
import ReactMarkdown from 'react-markdown';
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

export default function ChatInterface() {
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
      const response = await sendChatMessage(userMessage.content);
      
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

      // After animation is complete, mark it as done
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg === botMessage ? { ...msg, isAnimating: false } : msg
        ));
      }, response.text.length * 50); // Adjust timing based on text length
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        content: error instanceof Error ? error.message : 'An unexpected error occurred',
        type: 'bot',
        timestamp: new Date(),
        error: true,
        isAnimating: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg border border-gray-200">
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
                  <div className={`prose max-w-none ${
                    message.error ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {message.type === 'user' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className="text-base leading-relaxed prose-ul:list-disc prose-ul:pl-6 prose-ul:my-2 prose-li:my-0.5 prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-2"
                        components={{
                          ul: ({ children }) => (
                            <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="my-0.5">{children}</li>
                          ),
                        }}
                      >
                        {message.content}
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
      <div className="bg-white">
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
