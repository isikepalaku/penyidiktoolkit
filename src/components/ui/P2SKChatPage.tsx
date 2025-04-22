import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Banknote, Info, X, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/utils';
import { AnimatedBotIcon } from './animated-bot-icon';
import { sendChatMessage, clearChatHistory, initializeSession } from '../../services/undangService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Textarea } from './textarea';

// Konfigurasi marked dan DOMPurify untuk safe link handling
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

DOMPurify.setConfig({
  ADD_TAGS: ['a'],
  ADD_ATTR: ['target', 'rel', 'class'],
  FORBID_TAGS: ['style', 'script'],
  FORBID_ATTR: ['style', 'onerror', 'onload']
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

// Skeleton component for loading state - improved with more realistic patterns
const SkeletonMessage = () => (
  <div className="flex items-start space-x-3 w-full">
    <AnimatedBotIcon className="w-5 h-5 flex-shrink-0 mt-1" />
    <div className="flex-1 space-y-3 py-1">
      <p className="text-xs text-gray-500 italic mb-2">Sedang menyusun hasil...</p>
      <div className="space-y-3 animate-pulse">
        {/* Simulate paragraphs with varying widths */}
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 rounded w-5/6"></div>
        <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        
        {/* Simulate gap between paragraphs */}
        <div className="h-2"></div>
        
        {/* Simulate second paragraph */}
        <div className="h-4 bg-gray-300 rounded w-4/5"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        
        {/* Simulate a list with bullets */}
        <div className="pl-5 space-y-2 mt-1">
          <div className="flex items-start">
            <div className="h-3 w-3 bg-gray-300 rounded-full flex-shrink-0 mt-0.5 mr-2"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3 flex-grow"></div>
          </div>
          <div className="flex items-start">
            <div className="h-3 w-3 bg-gray-300 rounded-full flex-shrink-0 mt-0.5 mr-2"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 flex-grow"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface P2SKChatPageProps {
  onBack?: () => void;
}

const P2SKChatPage: React.FC<P2SKChatPageProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPositionRef = useRef<number>(0);

  // Reusable function to adjust textarea height
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
  };

  // Initialize session
  useEffect(() => {
    initializeSession();
    
    // Add welcome message
    setMessages([
      {
        content: '',
        type: 'bot',
        timestamp: new Date()
      }
    ]);
    
    // Focus the textarea with a slight delay for better UX
    focusTimeoutRef.current = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 500);
    
    return () => {
      // Clear chat history and timeout when component unmounts
      clearChatHistory();
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Reset user scroll state when new message is added
    if (messages.length > 0 && !messages[messages.length-1].isAnimating) {
      scrollToBottom();
    }
  }, [messages]);

  // Setup scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (!chatContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      // Show the scroll button if not near bottom
      setShowScrollButton(!isScrolledToBottom);
      
      // Remember the last scroll position
      lastScrollPositionRef.current = scrollTop;
    };
    
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToBottom = () => {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
        
        // Fallback mechanism in case the smooth scroll doesn't work
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 500);
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // Adjust height using the reusable function
    if (e.target) {
      adjustTextareaHeight(e.target);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check if device is probably desktop by looking at screen size
    const isLikelyDesktop = window.innerWidth >= 768;
    
    // Only enable Enter key submission on desktop devices
    if (isLikelyDesktop && e.key === 'Enter' && !e.shiftKey) {
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
    // Reset textarea height after clearing input
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // On mobile, blur the textarea to hide the keyboard
      if (window.innerWidth < 768) {
        textareaRef.current.blur();
      }
    }
    
    // Reset scroll state to enable auto-scrolling for the new message
    setShowScrollButton(false);
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
        newMessages.pop(); // Remove placeholder
        
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
      // Pastikan content ada dan bukan string kosong
      if (!content) return { __html: '' };
      
      // Parse markdown menjadi HTML
      const rawHtml = marked.parse(content);
      
      // Sanitasi HTML untuk mencegah XSS
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
    "Apa saja bentuk tindak pidana di bidang perbankan?",
    "Jelaskan tentang UU TPPU",
    "Apa sanksi terkait tindak pidana pencucian uang?",
    "Bagaimana prosedur penanganan kasus pidana perbankan?"
  ];

  const handleSelectQuestion = (question: string) => {
    setInputMessage(question);
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Manually adjust the height after setting content
      setTimeout(() => {
        if (textareaRef.current) {
          adjustTextareaHeight(textareaRef.current);
        }
      }, 0);
    }
  };

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
            <div className="flex items-center justify-center w-9 h-9 bg-blue-100 rounded-full">
              <Banknote className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">P2SK AI</h1>
              <p className="text-xs text-gray-500">Perbankan, Sistem Keuangan, dan Perpajakan</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={showInfo ? 'Tutup informasi' : 'Tampilkan informasi'}
        >
          <Info className="w-5 h-5 text-gray-700" />
        </button>
      </header>

      {/* Info Panel */}
      {showInfo && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <h2 className="text-sm font-medium text-gray-800">Tentang P2SK AI</h2>
            <button
              onClick={() => setShowInfo(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Tutup informasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-700">
            P2SK AI adalah asisten berbasis kecerdasan buatan yang berfokus pada bidang Perbankan, Sistem Pembayaran, dan Kejahatan Keuangan.
            Asisten ini dapat membantu menjawab pertanyaan tentang tindak pidana perbankan, tindak pidana pencucian uang, dan kejahatan keuangan lainnya.
            Informasi yang diberikan bersifat umum dan sebaiknya dikonfirmasi dengan sumber resmi atau konsultasi dengan ahli hukum yang berkualifikasi.
          </p>
        </div>
      )}

      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto pb-32"
      >
        {/* Welcome Message - Bold AI NAME in center */}
        {messages.length <= 1 && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <img 
                src="/img/krimsus.png"
                alt="Krimsus"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold text-blue-600 mb-4">P2SK AI</h1>
            <p className="text-gray-600 max-w-md">
              Asisten untuk membantu Anda dengan pertanyaan seputar Perbankan, Sistem Keuangan, dan Perpajakan.
            </p>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Example Questions */}
          {messages.length <= 1 && (
            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-3">Contoh pertanyaan yang dapat Anda ajukan:</p>
              <div className="space-y-2">
                {exampleQuestions.map((question, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectQuestion(question)}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    {question}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((message, index) => (
              message.content || message.isAnimating ? (
                <div 
                  key={index} 
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end ${message.isAnimating ? 'w-full' : 'max-w-[85%] sm:max-w-[75%]'} group`}
                  >
                    {message.type === 'bot' && (
                      <div className="flex-shrink-0 mr-2 mb-1">
                        {message.isAnimating ? (
                          <div className="w-8 h-8 text-gray-600">
                            <AnimatedBotIcon />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                            <Banknote className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div 
                      className={cn(
                        "rounded-2xl px-4 py-3 shadow-sm",
                        message.type === 'user' 
                          ? "bg-gray-100 text-gray-900 rounded-tr-none" 
                          : message.error 
                            ? "bg-red-50 text-red-800 rounded-tl-none border border-red-200" 
                            : message.isAnimating
                            ? "bg-white text-gray-800 rounded-tl-none border border-gray-200 w-full"
                            : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                      )}
                    >
                      {message.isAnimating ? (
                        <SkeletonMessage />
                      ) : message.type === 'bot' ? (
                        <div className="space-y-0">
                          <div 
                            className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-li:marker:text-gray-500 prose-strong:text-gray-900 prose-em:text-gray-700 prose-p:my-0.5 prose-headings:my-0.5 prose-headings:mb-0 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0.5 prose-pre:my-1 leading-tight [&_p]:!my-0.5 [&_br]:leading-none [&_h1+p]:!mt-0.5 [&_h2+p]:!mt-0.5 [&_h3+p]:!mt-0.5 [&_table]:overflow-x-auto [&_table]:max-w-full"
                            dangerouslySetInnerHTML={formatMessage(message.content)}
                          />
                          
                          {/* Source documents */}
                          {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 font-medium mb-1">Sumber:</p>
                              <ul className="text-xs text-gray-500 space-y-1">
                                {message.sourceDocuments.map((doc, i) => (
                                  <li key={i} className="flex items-start">
                                    <span className="inline-block w-4 flex-shrink-0">•</span>
                                    <span>{doc.metadata.title || 'Untitled Document'}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Copy button */}
                          <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyToClipboard(message.content)}
                              className="text-gray-400 hover:text-gray-600 p-1 rounded-md inline-flex items-center text-xs gap-1"
                              aria-label="Salin ke clipboard"
                            >
                              {copied === message.content ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        // User message
                        <div className="text-white break-words">{message.content}</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null
            ))}
            
            {/* Invisible div to anchor scrolling to bottom */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute right-4 bottom-32 z-10">
          <button
            onClick={scrollToBottom}
            className="bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition-colors"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 lg:pl-64 bg-white border-t border-gray-200 p-4 z-10">
        <div className="max-w-3xl mx-auto relative">
          <Textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan Anda..."
            className="resize-none pr-12 py-3 min-h-[52px] max-h-[200px] rounded-xl focus:border-blue-500 focus:ring-blue-500 overflow-y-auto"
            readOnly={false}
            autoComplete="off"
            rows={1}
            disabled={isProcessing}
          />
          
          <button
            onClick={handleSubmit}
            disabled={!inputMessage.trim() || isProcessing}
            type="button"
            className="absolute right-3 bottom-3 p-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors z-20"
            aria-label="Kirim pesan"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="max-w-3xl mx-auto mt-2">
          <p className="text-xs text-center text-gray-500">
            P2SK AI memberikan informasi umum dan tidak bisa menggantikan nasihat hukum profesional.
          </p>
        </div>
      </div>
    </div>
  );
};

export default P2SKChatPage; 