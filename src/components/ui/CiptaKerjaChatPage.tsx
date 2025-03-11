import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, BookOpen, Info, X } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { AnimatedBotIcon } from './animated-bot-icon';
import { DotBackground } from './DotBackground';
import { sendChatMessage, clearChatHistory, initializeSession } from '@/services/ciptakerjaService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Konfigurasi marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

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

interface CiptaKerjaChatPageProps {
  onBack?: () => void;
}

const CiptaKerjaChatPage: React.FC<CiptaKerjaChatPageProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize session
  useEffect(() => {
    initializeSession();
    
    // Add welcome message
    setMessages([
      {
        content: 'Selamat datang di Cipta Kerja AI. Saya adalah asisten AI yang dapat membantu Anda dengan pertanyaan seputar Undang-Undang Cipta Kerja (UU No. 11 Tahun 2020) dan regulasi terkait ketenagakerjaan.',
        type: 'bot',
        timestamp: new Date()
      }
    ]);
    
    return () => {
      // Clear chat history when component unmounts
      clearChatHistory();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: Message = {
      content: inputMessage.trim(),
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Add a placeholder bot message with animation
      setMessages(prev => [
        ...prev,
        {
          content: 'Sedang mengetik...',
          type: 'bot',
          timestamp: new Date(),
          isAnimating: true
        }
      ]);
      
      // Send message to API
      const response = await sendChatMessage(userMessage.content);
      
      // Replace the placeholder with the actual response
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Remove the placeholder
        
        return [
          ...newMessages,
          {
            content: response.text,
            type: 'bot',
            timestamp: new Date(),
            sourceDocuments: response.sourceDocuments,
            error: !!response.error,
            isAnimating: false
          }
        ];
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove placeholder message and add error message
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Remove placeholder
        
        return [
          ...newMessages,
          {
            content: 'Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.',
            type: 'bot',
            timestamp: new Date(),
            error: true,
            isAnimating: false
          }
        ];
      });
    } finally {
      setIsProcessing(false);
      
      // Focus textarea after sending message
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(
      () => {
        setCopied(content);
        setTimeout(() => {
          setCopied(null);
        }, 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  const formatMessage = (content: string) => {
    try {
      // Convert markdown to HTML
      const html = marked(content);
      
      // Sanitize HTML to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(html);
      
      return sanitizedHtml;
    } catch (error) {
      console.error('Error formatting message:', error);
      return content;
    }
  };

  const handleBack = () => {
    // Bersihkan riwayat chat sebelum kembali
    clearChatHistory();
    
    // Panggil fungsi onBack jika disediakan
    if (onBack) {
      onBack();
    }
  };

  // Example questions for the user
  const exampleQuestions = [
    "Apa saja perubahan utama dalam UU Cipta Kerja terkait ketenagakerjaan?",
    "Bagaimana aturan tentang pesangon dalam UU Cipta Kerja?",
    "Jelaskan tentang perubahan aturan PKWT dalam UU Cipta Kerja",
    "Apa dampak UU Cipta Kerja terhadap upah minimum?"
  ];

  return (
    <div className="fixed inset-0 z-20 bg-white lg:pl-64">
      {/* Main Content */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 bg-slate-100 rounded-full">
                <BookOpen className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Cipta Kerja AI</h2>
                <p className="text-xs text-gray-500">Asisten UU Cipta Kerja</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
            aria-label={showInfo ? "Tutup informasi" : "Tampilkan informasi"}
          >
            {showInfo ? <X className="w-5 h-5 text-gray-700" /> : <Info className="w-5 h-5 text-gray-700" />}
          </button>
        </header>

        {/* Info Panel */}
        {showInfo && (
          <div className="bg-slate-50 border-b border-slate-200 p-3 text-sm text-slate-800">
            <div className="max-w-3xl mx-auto">
              <p className="mb-2"><strong>Tentang Cipta Kerja AI:</strong></p>
              <p>Cipta Kerja AI adalah asisten yang membantu Anda memahami Undang-Undang Cipta Kerja (UU No. 11 Tahun 2020) dan regulasi terkait ketenagakerjaan di Indonesia.</p>
              <p className="mt-2 text-xs text-slate-600">Catatan: Cipta Kerja AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting.</p>
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 md:px-8 relative"
        >
          <div className="absolute inset-0 opacity-50">
            <DotBackground />
          </div>
          <div className="max-w-3xl mx-auto relative z-10 space-y-6">
            {/* Example questions at the beginning */}
            {messages.length === 1 && (
              <div className="mt-6 mb-8">
                <p className="text-sm text-gray-500 mb-3">Anda dapat mencoba pertanyaan berikut:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exampleQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInputMessage(question);
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                        }
                      }}
                      className="text-left p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex items-start gap-3 transition-opacity group",
                  message.type === 'user' ? "justify-end" : "justify-start",
                  message.isAnimating && "animate-pulse"
                )}
              >
                {message.type === 'bot' && (
                  <div className="flex-shrink-0 mt-1">
                    {message.isAnimating ? (
                      <div className="w-8 h-8 text-slate-600">
                        <AnimatedBotIcon />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-slate-600" />
                      </div>
                    )}
                  </div>
                )}
                
                <div 
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-[85%] shadow-sm",
                    message.type === 'user' 
                      ? "bg-slate-600 text-white rounded-tr-none" 
                      : message.error 
                        ? "bg-red-50 text-red-800 rounded-tl-none border border-red-200" 
                        : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                  )}
                >
                  {message.isAnimating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                      <span className="text-gray-500">Cipta Kerja AI sedang mengetik...</span>
                    </div>
                  ) : message.type === 'bot' ? (
                    <div className="space-y-0">
                      <div 
                        className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-a:text-slate-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-li:marker:text-gray-500 prose-strong:text-gray-900 prose-em:text-gray-700 prose-p:my-0.5 prose-headings:my-0.5 prose-headings:mb-0 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0.5 prose-pre:my-1 leading-tight [&_p]:!my-0.5 [&_br]:leading-none [&_h1+p]:!mt-0.5 [&_h2+p]:!mt-0.5 [&_h3+p]:!mt-0.5"
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      />
                      
                      {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 font-medium mb-1">Sumber:</p>
                          <ul className="text-xs text-gray-500 space-y-1">
                            {message.sourceDocuments.map((doc, idx) => (
                              <li key={idx} className="truncate">
                                {doc.metadata.title || doc.metadata.source || 'Dokumen'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  )}
                </div>
                
                {message.type === 'bot' && !message.isAnimating && !message.error && (
                  <button
                    onClick={() => copyToClipboard(message.content)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
                    aria-label="Salin pesan"
                  >
                    {copied === message.content ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik pesan Anda..."
                  className="min-h-[2.5rem] max-h-[8rem] resize-none pr-10 py-3 rounded-xl"
                  disabled={isProcessing}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!inputMessage.trim() || isProcessing}
                className="rounded-full p-3 h-auto aspect-square"
                aria-label="Kirim pesan"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Cipta Kerja AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CiptaKerjaChatPage; 