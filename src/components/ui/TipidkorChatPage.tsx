import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, X, RefreshCw } from 'lucide-react';
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
}

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initialize chat session
    try {
      initializeSession();
      console.log('TipidkorChatPage: Session initialized');
      
      // Set empty welcome message to trigger welcome UI if tidak ada messages yang disimpan
      if (messages.length === 0) {
        setMessages([
          {
            content: '',
            type: 'bot',
            timestamp: new Date(),
          }
        ]);
      }
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
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    try {
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      });
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
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

  // Example questions yang relevan dengan tindak pidana korupsi
  const exampleQuestions = [
    "Apa definisi korupsi menurut UU Tipikor?",
    "Jelaskan tentang gratifikasi dan risikonya bagi pejabat",
    "Bagaimana proses penyelidikan kasus korupsi?",
    "Apa sanksi untuk tindak pidana korupsi di Indonesia?"
  ];

  const handleSelectQuestion = (question: string) => {
    setInputMessage(question);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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
    setIsProcessing(true);
    setIsConnectionError(false);

    try {
      // Add a placeholder bot message with animation
      setMessages((prev) => [
        ...prev,
        {
          content: 'Sedang mengetik...',
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
            ? 'Terjadi masalah koneksi. Silakan periksa koneksi internet Anda dan coba lagi.' 
            : 'Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.',
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
              <h1 className="font-semibold">TIPIDKOR AI</h1>
              <p className="text-sm text-gray-600 hidden sm:block">Asisten untuk tindak pidana korupsi</p>
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
            <p className="text-sm text-gray-600 hidden sm:block">Asisten untuk tindak pidana korupsi</p>
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
                <p>TIPIDKOR AI merupakan asisten kepolisian yang membantu dalam penanganan tindak pidana korupsi. Asisten ini dapat menjawab pertanyaan terkait UU Tipikor, penyelidikan kasus korupsi, dan penanganan kasus-kasus tipikor.</p>
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
          <div className="max-w-3xl mx-auto px-4 md:px-8 space-y-6">
            {/* Welcome Message - Bold TIPIDKOR AI in center */}
            {messages.length <= 1 && messages[0].content === '' && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <img 
                    src="/img/tipidkor.svg"
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
                      "flex flex-col max-w-[85%] sm:max-w-[75%] rounded-xl p-4 shadow-sm",
                      message.type === "user"
                        ? "bg-gray-100 text-gray-900 rounded-tr-none"
                        : message.error
                        ? "bg-red-50 text-gray-800 rounded-tl-none border border-red-200"
                        : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                    )}
                  >
                    {message.type === "bot" && !message.isAnimating ? (
                      <>
                        <div 
                          className="prose prose-sm max-w-none"
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
                      <div className="flex items-center">
                        <AnimatedBotIcon className="w-5 h-5 mr-3" />
                        <span>Sedang mengetik...</span>
                      </div>
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

      {/* Input area fixed at bottom */}
      <div className="border-t border-gray-200 bg-white p-4 md:px-8 pb-safe">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="relative">
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan..."
              className="pl-4 pr-12 py-3 min-h-[56px] max-h-[200px] rounded-xl border border-gray-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
              disabled={isProcessing}
            />
            <Button 
              type="submit"
              size="icon"
              className="absolute bottom-2.5 right-2.5 h-8 w-8 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              disabled={isProcessing || !inputMessage.trim()}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TipidkorChatPage; 