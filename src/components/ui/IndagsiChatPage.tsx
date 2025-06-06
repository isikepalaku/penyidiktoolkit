import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, X, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { AnimatedBotIcon } from './animated-bot-icon';
import { DotBackground } from './DotBackground';
import { sendChatMessage, initializeSession, clearChatHistory } from '@/services/indagsiService';
import { formatMessage } from '@/utils/markdownFormatter';

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

// Skeleton component for loading state - improved with more realistic structure
const SkeletonMessage = () => (
  <div className="flex items-start space-x-3">
    <AnimatedBotIcon className="w-5 h-5 flex-shrink-0 mt-1" />
    <div className="flex-1 space-y-3 py-1">
      <p className="text-xs text-gray-500 italic mb-2">Sedang menyusun hasil...</p>
      <div className="space-y-3 animate-pulse">
        {/* First paragraph-like block */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-[90%]"></div>
          <div className="h-4 bg-gray-300 rounded w-[95%]"></div>
        </div>
        
        {/* Second paragraph with space between */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-[85%]"></div>
          <div className="h-4 bg-gray-300 rounded w-[70%]"></div>
        </div>
        
        {/* Simulated list items */}
        <div className="pl-4 space-y-2">
          <div className="flex items-start">
            <div className="h-3 w-3 mt-0.5 rounded-full bg-gray-300 mr-2 flex-shrink-0"></div>
            <div className="h-4 flex-grow bg-gray-300 rounded w-[90%]"></div>
          </div>
          <div className="flex items-start">
            <div className="h-3 w-3 mt-0.5 rounded-full bg-gray-300 mr-2 flex-shrink-0"></div>
            <div className="h-4 flex-grow bg-gray-300 rounded w-[80%]"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface IndagsiChatPageProps {
  onBack?: () => void;
}

const IndagsiChatPage: React.FC<IndagsiChatPageProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      content: '',
      type: 'bot',
      timestamp: new Date(),
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDesktopRef = useRef<boolean>(false);

  // Reusable function to adjust textarea height
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    
    // Reset the height temporarily to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set the height to match content
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    // Initialize chat session
    try {
      initializeSession();
      
      // Set empty welcome message to trigger welcome UI if tidak ada messages
      if (messages.length === 0) {
        setMessages([
          {
            content: '',
            type: 'bot',
            timestamp: new Date(),
          }
        ]);
      }
      
      // Detect if desktop (for Enter key handling)
      isDesktopRef.current = window.innerWidth >= 1024;
      
      // Focus textarea after component mounts with slight delay for mobile
      focusTimeoutRef.current = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Also initialize height
          adjustTextareaHeight(textareaRef.current);
        }
      }, 500);
    } catch (error) {
      console.error('Error initializing session:', error);
      setHasError(true);
    }

    // Error boundary untuk komponen ini
    const handleError = (event: ErrorEvent) => {
      console.error('Chat component error caught:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);

    // Clean up on unmount
    return () => {
      window.removeEventListener('error', handleError);
      try {
        clearChatHistory();
      } catch (error) {
        console.error('Error clearing chat history:', error);
      }
      // Clear any hanging timeouts
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  // Handle scroll detection
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      if (!container) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (!isScrolledToBottom && !userHasScrolled) {
        setUserHasScrolled(true);
      }
      
      setShowScrollButton(!isScrolledToBottom);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [userHasScrolled]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Reset scroll state when sending a new message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'user') {
        setUserHasScrolled(false);
      }
      
      // Only auto-scroll if user hasn't manually scrolled up
      if (!userHasScrolled) {
        scrollToBottom();
      }
    }
  }, [messages, userHasScrolled]);

  const scrollToBottom = (forceScroll = false) => {
    try {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (chatContainerRef.current && (forceScroll || !userHasScrolled)) {
          const { scrollHeight } = chatContainerRef.current;
          
          chatContainerRef.current.scrollTo({
            top: scrollHeight,
            behavior: 'smooth',
          });
          
          // Fallback mechanism in case smooth scrolling doesn't work
          if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current);
          }
          
          scrollTimerRef.current = setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 300);
          
          // Reset user scroll state if forced
          if (forceScroll) {
            setUserHasScrolled(false);
            setShowScrollButton(false);
          }
        }
      });
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
      // Fallback direct scrolling
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // Use the reusable function to adjust height
    adjustTextareaHeight(e.target);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Only use Enter to submit on desktop, not on mobile
    if (isDesktopRef.current && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleScrollToBottom = () => {
    scrollToBottom(true); // Force scroll to bottom
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsConnectionError(false);
    
    // Reinitialize session
    try {
      initializeSession();
    } catch (error) {
      console.error('Error reinitializing session:', error);
    }
  };

  const handleChatReset = () => {
    try {
      clearChatHistory();
      setMessages([{
        content: '',
        type: 'bot',
        timestamp: new Date(),
      }]);
      setHasError(false);
      setIsConnectionError(false);
    } catch (error) {
      console.error('Error resetting chat:', error);
    }
  };

  // Example questions for Indagsi
  const exampleQuestions = [
    "Apakah menjual barang dengan merek palsu (tiruan) termasuk tindak pidana perdagangan?",
    "Jelaskan pasal yang mengatur penjualan pakaian bekas (thrift) atau barang lama dari luar negeri?",
    "Apa sanksi pidana bagi penjual pestisida tanpa ijin edar?",
    "Jelaskan tindak pidana bagi produsen atau penjual kosmetik yang tidak memiliki izin edar (BPOM)?",
  ];

  const handleSelectQuestion = (question: string) => {
    setInputMessage(question);
    // Focus and adjust height after setting content
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        adjustTextareaHeight(textareaRef.current);
      }
    }, 10);
  };

  const handleSubmit = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: Message = {
      content: inputMessage.trim(),
      type: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    // Reset textarea height after clearing input
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.blur(); // Hide keyboard on mobile
    }
    setIsProcessing(true);
    setIsConnectionError(false);
    // Reset scroll position state
    setUserHasScrolled(false);

    try {
      // Add a placeholder bot message with animation
      setMessages((prev) => [
        ...prev,
        {
          content: '',
          type: 'bot',
          timestamp: new Date(),
          isAnimating: true,
        },
      ]);

      const response = await sendChatMessage(userMessage.content);

      // Replace the placeholder with the actual response
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the last message (placeholder)
        newMessages.pop();
        
        // Add the actual response
        newMessages.push({
          content: response.text,
          type: 'bot',
          timestamp: new Date(),
          sourceDocuments: response.sourceDocuments,
          error: !!response.error,
        });
        
        return newMessages;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if it's a network error
      const isNetworkError = error instanceof TypeError && 
        (error.message.includes('network') || 
         error.message.includes('fetch') || 
         error.message.includes('Failed to fetch'));
      
      if (isNetworkError) {
        setIsConnectionError(true);
      }
      
      // Replace the placeholder with an error message
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the last message (placeholder)
        newMessages.pop();
        
        // Add error message
        newMessages.push({
          content: isNetworkError 
            ? 'Permintaan Terlalu banyak, coba lagi dalam 2 menit. (dengan bertumbuhnya pengguna, saat ini kami membatasi permintaan untuk menjaga kualitas layanan)' 
            : 'Dengan bertumbuhnya pengguna, saat ini kami membatasi permintaan (1 permintaan dalam 2 menit) untuk menjaga kualitas layanan',
          type: 'bot',
          timestamp: new Date(),
          error: true,
        });
        
        return newMessages;
      });
    } finally {
      setIsProcessing(false);
      // Focus the textarea after sending
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Render error states
  if (hasError) {
    return (
      <div className="fixed inset-0 z-20 bg-white lg:pl-64 flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">INDAGSI AI</h1>
              <p className="text-sm text-gray-600 hidden sm:block">Asisten untuk Tindak Pidana Perdagangan</p>
            </div>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center flex-1 p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Terjadi Kesalahan</h2>
            <p className="text-gray-700 mb-4">
              Mohon maaf, terjadi kesalahan dalam sistem chat. Ini mungkin karena masalah server atau koneksi.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </Button>
              <Button variant="outline" onClick={handleChatReset}>
                Mulai Baru
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-20 bg-white lg:pl-64 flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">INDAGSI AI</h1>
            <p className="text-sm text-gray-600 hidden sm:block">Asisten untuk Tindak Pidana Perdagangan</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowInfo(!showInfo)}
            className="text-gray-500"
          >
            <Info className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleChatReset}
            className="text-gray-500"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      {showInfo && (
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 m-4 shadow-sm rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-purple-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-purple-800">Informasi INDAGSI AI</h3>
              <div className="mt-2 text-sm text-purple-700">
                <p>INDAGSI AI merupakan asisten kepolisian yang membantu dalam penanganan tindak pidana di bidang perdagangan, industri, dan investasi. Asisten ini dapat menjawab pertanyaan terkait peraturan perdagangan, ekspor-impor, dan pelanggaran di bidang perdagangan.</p>
              </div>
              <button 
                className="mt-2 text-sm font-medium text-purple-600 hover:text-purple-500 focus:outline-none"
                onClick={() => setShowInfo(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain pb-32 pt-4"
      >
        <DotBackground>
          <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-6">
            {/* Welcome Message - Bold INDAGSI AI in center */}
            {messages.length <= 1 && messages[0].content === '' && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <img 
                    src="/img/krimsus.png"
                    alt="Krimsus"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <h1 className="text-4xl font-bold text-purple-600 mb-4">INDAGSI AI</h1>
                <p className="text-gray-600 max-w-md">
                  Asisten untuk membantu Anda dengan pertanyaan seputar tindak pidana perdagangan, industri, dan investasi.
                </p>
              </div>
            )}

            {/* Example Questions - only show at the beginning */}
            {messages.length <= 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500">Contoh pertanyaan:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exampleQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      className="text-left p-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-purple-50 transition-colors shadow-sm"
                      onClick={() => handleSelectQuestion(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Connection Error Banner */}
            {isConnectionError && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Terdeteksi masalah koneksi. Pastikan Anda terhubung ke internet dan coba lagi.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message, index) => (
              // Hanya tampilkan message dengan content (kecuali animating placeholder)
              (message.content || message.isAnimating) && (
                <div
                  key={index}
                  className={cn("flex", message.type === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "flex flex-col max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] rounded-xl p-4 shadow-sm",
                      message.type === "user"
                        ? "bg-gray-100 text-gray-900 rounded-tr-none"
                        : message.error
                        ? "bg-red-50 text-gray-800 rounded-tl-none border border-red-200"
                        : message.isAnimating
                        ? "bg-white text-gray-800 rounded-tl-none border border-gray-200 w-full"
                        : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                    )}
                  >
                    {message.type === "bot" && !message.isAnimating ? (
                      <>
                        <div 
                          className="prose prose-sm max-w-none md:prose-base lg:prose-lg overflow-x-auto
                                    prose-headings:font-bold prose-headings:text-purple-800 prose-headings:my-4
                                    prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                                    prose-p:my-2 prose-p:text-gray-700
                                    prose-ul:pl-6 prose-ul:my-2 prose-ol:pl-6 prose-ol:my-2
                                    prose-li:my-1
                                    prose-table:border-collapse prose-table:my-4
                                    prose-th:bg-purple-50 prose-th:p-2 prose-th:border prose-th:border-gray-300
                                    prose-td:p-2 prose-td:border prose-td:border-gray-300
                                    prose-strong:font-bold prose-strong:text-gray-800
                                    prose-a:text-purple-600 prose-a:underline hover:prose-a:text-purple-800"
                          dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3"
                            onClick={() => handleCopy(message.content)}
                          >
                            {copied === message.content ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-2 text-xs">{copied === message.content ? "Disalin" : "Salin"}</span>
                          </Button>
                        </div>
                      </>
                    ) : message.isAnimating ? (
                      <SkeletonMessage />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                </div>
              )
            ))}
            <div ref={messagesEndRef} />
          </div>
        </DotBackground>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={handleScrollToBottom}
          className="fixed bottom-28 right-4 md:right-8 z-20 bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700 transition-all duration-200 flex items-center justify-center"
          aria-label="Scroll ke bawah"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Input area fixed at bottom */}
      <div className="border-t border-gray-200 bg-white p-4 md:px-8 pb-safe">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="relative">
            <Textarea
              ref={textareaRef}
              rows={1} // Start with one row
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan..."
              className="resize-none pl-4 pr-12 py-3 max-h-[200px] rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 overflow-y-auto z-10"
              disabled={isProcessing}
              readOnly={false}
              autoComplete="off"
            />
            <Button 
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing || !inputMessage.trim()}
              className={cn(
                "absolute bottom-3 right-2.5 h-8 w-8 p-0 rounded-lg z-20",
                isProcessing || !inputMessage.trim()
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              )}
              aria-label="Kirim pesan"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            INDAGSI AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IndagsiChatPage; 