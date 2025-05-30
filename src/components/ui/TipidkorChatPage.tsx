import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, X, RefreshCw, ChevronDown, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { AnimatedBotIcon } from './animated-bot-icon';
import { DotBackground } from './DotBackground';
import { sendChatMessage, initializeSession, clearChatHistory } from '@/services/tipidkorService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Konfigurasi marked dan DOMPurify for safe link handling
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
  isRateLimit?: boolean;
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

interface TipidkorChatPageProps {
  onBack?: () => void;
}

const TipidkorChatPage: React.FC<TipidkorChatPageProps> = ({ onBack }) => {
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

  const formatMessage = (content: string) => {
    try {
      // Pastikan content ada dan bukan string kosong
      if (!content) return '';
      
      // Parse markdown menjadi HTML
      const rawHtml = marked.parse(content);
      
      // Sanitasi HTML untuk mencegah XSS
      const sanitizedHtml = DOMPurify.sanitize(rawHtml);
      
      return sanitizedHtml;
    } catch (error) {
      console.error('Error formatting message:', error);
      return 'Error formatting message.';
    }
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

  // Example questions for Tipidkor
  const exampleQuestions = [
    "Apakah tindakan pejabat pertanahan yang menerbitkan SHM kawasan hutan merupakan tindak pidana korupsi?",
    "Dalam kasus pengadaan barang/jasa pemerintah, kapan tindakan mark-up harga bisa dikategorikan sebagai perbuatan melawan hukum menurut UU Tipikor?",
    "Jelaskan bagaimana membedakan tindak pidana suap (Pasal 5 atau Pasal 12 UU Tipikor) dengan gratifikasi (Pasal 12B UU Tipikor) dalam penyidikan kasus pemberian uang kepada pejabat negara?",
    "Apakah tindakan pejabat pemerintah yang menyetujui pembayaran proyek sebelum pekerjaan selesai dapat dijerat dengan Pasal 2 atau Pasal 3 UU Tipikor?"
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
      
      // Check if it's a rate limit error
      const isRateLimitError = error instanceof Error && 
        (error.message.includes('Terlalu banyak permintaan') || 
         error.message.includes('429'));
      
      // Replace the placeholder with an error message
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the last message (placeholder)
        newMessages.pop();
        
        // Add error message with enhanced styling
        newMessages.push({
          content: 'rate_limit_error', // Special marker for rate limit errors
          type: 'bot',
          timestamp: new Date(),
          error: true,
          isRateLimit: isRateLimitError || (!isNetworkError), // Assume rate limit unless clearly network error
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
              <h1 className="font-semibold">TIPIDKOR AI</h1>
              <p className="text-sm text-gray-600 hidden sm:block">Asisten untuk Tindak Pidana Korupsi</p>
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
            <h1 className="font-semibold">TIPIDKOR AI</h1>
            <p className="text-sm text-gray-600 hidden sm:block">Asisten untuk Tindak Pidana Korupsi</p>
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
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 shadow-sm rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Informasi TIPIDKOR AI</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>TIPIDKOR AI merupakan asisten kepolisian yang membantu dalam penanganan tindak pidana korupsi. Asisten ini dapat menjawab pertanyaan terkait pencegahan dan penindakan korupsi, regulasi anti-korupsi, dan terminologi korupsi.</p>
              </div>
              <button 
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none"
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
            {/* Welcome Message - Bold TIPIDKOR AI in center */}
            {messages.length <= 1 && messages[0].content === '' && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <img 
                    src="/img/krimsus.png"
                    alt="Krimsus"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <h1 className="text-4xl font-bold text-red-600 mb-4">TIPIDKOR AI</h1>
                <p className="text-gray-600 max-w-md">
                  Asisten untuk membantu Anda dengan pertanyaan seputar tindak pidana korupsi.
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
                      className="text-left p-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-red-50 transition-colors shadow-sm"
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
                      "flex flex-col max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%]",
                      message.type === "user"
                        ? "bg-gray-100 text-gray-900 rounded-2xl px-4 py-3"
                        : message.error
                        ? "bg-red-50 text-gray-800 rounded-2xl px-4 py-3 border border-red-200"
                        : message.isAnimating
                        ? "text-gray-800 w-full"
                        : "text-gray-800"
                    )}
                  >
                    {message.type === "bot" && !message.isAnimating ? (
                      <>
                        {message.content === 'rate_limit_error' ? (
                          // Tampilan khusus untuk error rate limit
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <h3 className="font-medium text-amber-800">Batas Permintaan Tercapai</h3>
                                <p className="text-amber-700 mt-1">
                                  Dengan bertumbuhnya pengguna, kami membatasi permintaan untuk menjaga kualitas layanan.
                                </p>
                              </div>
                            </div>
                            
                            <div className="bg-amber-100 rounded-lg p-3 flex items-center gap-2 text-amber-800">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span className="text-sm">Silakan coba lagi dalam 2 menit.</span>
                            </div>
                            
                            <p className="text-sm text-gray-600 italic pt-1">
                              Terima kasih atas pengertian Anda. Kami terus meningkatkan infrastruktur kami untuk melayani Anda lebih baik.
                            </p>
                          </div>
                        ) : (
                          <div 
                            className="prose prose-sm max-w-none
                                      prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:my-3
                                      prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                                      prose-p:my-2 prose-p:text-gray-800 prose-p:leading-relaxed
                                      prose-ul:my-2 prose-ol:my-2 prose-li:my-1
                                      prose-strong:font-semibold prose-strong:text-gray-900
                                      prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                                      prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                                      [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse
                                      [&_th]:border-b [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-900 [&_th]:bg-gray-50
                                      [&_td]:border-b [&_td]:border-gray-100 [&_td]:px-3 [&_td]:py-2 [&_td]:text-gray-800 [&_td]:align-top
                                      [&_td]:break-words [&_td]:max-w-[300px]
                                      [&_tr:last-child_td]:border-b-0"
                            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                          />
                        )}
                        <div className="flex justify-start mt-3 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            onClick={() => handleCopy(message.content === 'rate_limit_error' ? 
                              "Batas permintaan tercapai. Silakan coba lagi dalam 2 menit." : 
                              message.content)}
                          >
                            {copied === message.content ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
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
          className="fixed bottom-28 right-4 md:right-8 z-20 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-all duration-200 flex items-center justify-center"
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
              className="resize-none pl-4 pr-12 py-3 max-h-[200px] rounded-xl border border-gray-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 overflow-y-auto z-10"
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
                  : "bg-red-600 text-white hover:bg-red-700"
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
            TIPIDKOR AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TipidkorChatPage; 