import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, BookOpen, Info, X } from 'lucide-react';
import { cn } from '@/utils/utils';
import { AnimatedBotIcon } from './animated-bot-icon';
import { DotBackground } from './DotBackground';
import { sendChatMessage, clearChatHistory, initializeSession } from '@/services/kuhpService';
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

// Skeleton component for loading state - using AnimatedBotIcon, text, and pulse
const SkeletonMessage = () => (
  <div className="flex items-start space-x-3">
    <AnimatedBotIcon className="w-5 h-5 flex-shrink-0 mt-1" />
    <div className="flex-1 space-y-2 py-1">
      <p className="text-xs text-gray-500 italic mb-1">Sedang menyusun hasil...</p>
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        <div className="h-4 bg-gray-300 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

interface KUHPChatPageProps {
  onBack?: () => void;
}

const KUHPChatPage: React.FC<KUHPChatPageProps> = ({ onBack }) => {
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
        content: 'Selamat datang di KUHP AI. Saya adalah asisten AI yang dapat membantu Anda dengan pertanyaan seputar Kitab Undang-Undang Hukum Pidana (KUHP) berdasarkan UU Nomor 1 Tahun 2023.',
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

  const handleInputChange = (_e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(_e.target.value);
    // Adjust height dynamically
    const textarea = _e.target;
    textarea.style.height = 'auto'; // Reset height to recalculate
    textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
  };

  const handleKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Remove Enter key submission for mobile compatibility
    // Submission is handled by the Send button
    // if (_e.key === 'Enter' && !_e.shiftKey) {
    //   _e.preventDefault();
    //   handleSubmit();
    // }
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
    // Reset textarea height after clearing input
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsProcessing(true);

    try {
      // Add a placeholder bot message with animation
      setMessages(prev => [
        ...prev,
        {
          content: '', // Gunakan content kosong untuk skeleton
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
      const rawHtml = marked(content, { breaks: true });
      
      // Sanitize HTML to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(rawHtml);
      
      return { __html: sanitizedHtml };
    } catch (error) {
      console.error('Error formatting message:', error);
      return { __html: content };
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
    "Apa perbedaan utama antara KUHP lama dan KUHP baru (UU No. 1 Tahun 2023)?",
    "Bagaimana pengaturan tentang tindak pidana korupsi dalam KUHP baru?",
    "Jelaskan tentang delik aduan dalam KUHP",
    "Apa saja jenis-jenis hukuman dalam KUHP baru?"
  ];

  return (
    <div className="fixed inset-0 z-20 bg-white lg:pl-64 flex flex-col">
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
            <div className="flex items-center justify-center w-9 h-9 bg-rose-100 rounded-full">
              <BookOpen className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">KUHP AI</h2>
              <p className="text-xs text-gray-500 hidden sm:block">Asisten UU No. 1 Tahun 2023 tentang KUHP</p>
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
        <div className="bg-rose-50 border-b border-rose-200 p-4 text-sm text-rose-800">
          <div className="max-w-3xl mx-auto">
            <p className="mb-2"><strong>Tentang KUHP AI:</strong></p>
            <p>KUHP AI adalah asisten yang membantu Anda memahami Kitab Undang-Undang Hukum Pidana (KUHP) berdasarkan UU No. 1 Tahun 2023.</p>
            <p className="mt-2 text-xs text-rose-600">Catatan: KUHP AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting.</p>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="max-w-3xl mx-auto p-4 space-y-6">
          <DotBackground />

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
                    className="text-left p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-rose-50 transition-colors shadow-sm"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  } items-end ${
                    // Remove max-width constraints when animating
                    message.isAnimating ? 'w-full' : 'max-w-[85%] sm:max-w-[75%]'
                  }`}
                >
                  {message.type === 'bot' && (
                    <div className="flex-shrink-0 mr-2 mb-1">
                      {message.isAnimating ? (
                        <div className="w-8 h-8 text-rose-600">
                          <AnimatedBotIcon />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center shadow-sm">
                          <BookOpen className="w-5 h-5 text-rose-600" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div 
                    className={cn(
                      "rounded-2xl px-4 py-3 shadow-sm",
                      message.type === 'user' 
                        ? "bg-rose-600 text-white rounded-tr-none" 
                        : message.error 
                          ? "bg-red-50 text-red-800 rounded-tl-none border border-red-200" 
                          : message.isAnimating // Styling untuk container skeleton
                          ? "bg-white text-gray-800 rounded-tl-none border border-gray-200 w-full"
                          : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                    )}
                  >
                    {message.isAnimating ? (
                      // Render Skeleton component with AnimatedBotIcon when animating
                      <SkeletonMessage />
                    ) : message.type === 'bot' ? (
                      <div className="space-y-0">
                        <div 
                          className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-a:text-rose-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-li:marker:text-gray-500 prose-strong:text-gray-900 prose-em:text-gray-700 prose-p:my-0.5 prose-headings:my-0.5 prose-headings:mb-0 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0.5 prose-pre:my-1 leading-tight [&_p]:!my-0.5 [&_br]:leading-none [&_h1+p]:!mt-0.5 [&_h2+p]:!mt-0.5 [&_h3+p]:!mt-0.5"
                          dangerouslySetInnerHTML={formatMessage(message.content)}
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
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 ml-2"
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
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4 md:px-8 pb-safe">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex w-full cursor-text flex-col rounded-xl border border-gray-300 px-4 py-3 duration-150 ease-in-out shadow-sm focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500 bg-white">
            <textarea
              ref={textareaRef}
              rows={1} // Start with one row
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan Anda..."
              className="w-full border-0 bg-transparent px-0 py-3 text-sm placeholder:text-gray-500 focus:outline-none resize-none pr-12 max-h-[200px] text-gray-800 overflow-y-auto"
              disabled={isProcessing}
            />
            
            {/* Tombol kirim di dalam textarea */}
            <button
              onClick={handleSubmit}
              disabled={!inputMessage.trim() || isProcessing}
              className={`absolute right-3 bottom-3 p-2.5 rounded-lg flex items-center justify-center transition-colors ${
                !inputMessage.trim() || isProcessing
                  ? 'bg-rose-200 text-rose-400 cursor-not-allowed'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              }`}
              aria-label="Kirim pesan"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            KUHP AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KUHPChatPage; 