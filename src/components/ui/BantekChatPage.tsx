import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, X, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { AnimatedBotIcon } from './animated-bot-icon';
import { DotBackground } from './DotBackground';
import { sendChatMessage, clearChatHistory, initializeSession } from '@/services/bantekService';
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
  isRateLimit?: boolean;
}

// Skeleton component for loading state - using AnimatedBotIcon, text, and pulse
const SkeletonMessage = () => (
  <div className="flex items-start space-x-3">
    <AnimatedBotIcon className="w-5 h-5 flex-shrink-0 mt-1" />
    <div className="flex-1 space-y-2 py-1">
      <p className="text-xs text-gray-500 italic mb-1">Sedang menyusun hasil...</p>
      <div className="space-y-2 animate-pulse"> {/* Add animate-pulse here */}
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        <div className="h-4 bg-gray-300 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

interface BantekChatPageProps {
  onBack?: () => void;
}

const BantekChatPage: React.FC<BantekChatPageProps> = ({ onBack }) => {
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
    
    // Set empty welcome message to trigger welcome UI
    setMessages([
      {
        content: '',
        type: 'bot',
        timestamp: new Date(),
      },
    ]);
    
    // Focus textarea after component mounts with slight delay for mobile
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 500);
    
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
          behavior: 'smooth',
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
      setMessages((prev) => [
        ...prev,
        {
          content: '', // Konten kosong untuk skeleton
          type: 'bot',
          timestamp: new Date(),
          isAnimating: true, // Tandai sebagai animasi
        },
      ]);
      
      // Send message to API
      const response = await sendChatMessage(userMessage.content);
      
      // Replace the placeholder with the actual response
      setMessages((prev) => {
        const newMessages = [...prev];
        const placeholderIndex = newMessages.findIndex(
          (msg) => msg.type === 'bot' && msg.isAnimating
        );

        if (placeholderIndex !== -1) {
          newMessages[placeholderIndex] = {
            content: response.text,
            type: 'bot',
            timestamp: new Date(),
            sourceDocuments: response.sourceDocuments,
            error: !!response.error,
          };
        }
        
        return newMessages;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if it's a rate limit error
      const isRateLimitError = error instanceof Error && 
        (error.message.includes('Terlalu banyak permintaan') || 
         error.message.includes('429'));
      
      // Replace the placeholder with an error message
      setMessages((prev) => {
        const newMessages = [...prev];
        const placeholderIndex = newMessages.findIndex(
          (msg) => msg.type === 'bot' && msg.isAnimating
        );
        
        if (placeholderIndex !== -1) {
          newMessages[placeholderIndex] = {
            content: 'rate_limit_error', // Special marker for rate limit errors
            type: 'bot',
            timestamp: new Date(),
            error: true,
            isRateLimit: isRateLimitError,
          };
        }
        
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
    "Apa yang dimaksud dengan bantuan teknis dalam Perkaba Polri?",
    "Bagaimana prosedur permintaan bantuan teknis dari satuan wilayah?",
    "Jelaskan tahapan pelaksanaan bantuan teknis menurut SOP",
    "Apa saja persyaratan untuk mengajukan bantuan teknis forensik digital?"
  ];

  return (
    <div className="flex h-screen bg-gray-50 lg:pl-64">
      {/* Main Content */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
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
              <div className="flex items-center justify-center w-9 h-9 bg-green-100 rounded-full">
                <img 
                  src="/img/book.svg"
                  alt="Book"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bantek AI</h2>
                <p className="text-xs text-gray-500">Asisten SOP Bantuan Teknis Perkaba Polri</p>
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
          <div className="bg-green-50 border-b border-green-200 p-3 text-sm text-green-800">
            <div className="max-w-3xl mx-auto">
              <p className="mb-2"><strong>Tentang Bantek AI:</strong></p>
              <p>Bantek AI adalah asisten yang memberikan informasi tentang SOP Bantuan Teknis berdasarkan Perkaba Polri.</p>
              <p className="mt-2 text-xs text-green-600">Catatan: Bantek AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.</p>
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8 relative pb-32"
        >
          <div className="absolute inset-0 opacity-50">
            <DotBackground />
          </div>
          <div className="max-w-3xl mx-auto relative z-10 space-y-6">
            {/* Welcome Message - Bold BANTEK AI in center */}
            {messages.length <= 1 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <img 
                    src="/img/book.svg"
                    alt="Book"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <h1 className="text-4xl font-bold text-green-600 mb-4">BANTEK AI</h1>
                <p className="text-gray-600 max-w-md">
                  Asisten untuk membantu Anda dengan pertanyaan seputar SOP Bantuan Teknis berdasarkan Perkaba Polri.
                </p>
              </div>
            )}

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
            <div className="space-y-6">
              {messages.map((message, index) => (
                message.content || message.isAnimating ? ( // Tampilkan jika ada konten atau sedang animasi
                  <div
                    key={index}
                    className={`flex ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`flex items-end ${message.isAnimating ? 'w-full' : 'max-w-[85%] sm:max-w-[75%]'} ${
                        message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {message.type === 'bot' && (
                        <div className="flex-shrink-0 mr-2 mb-1">
                          {/* Gunakan AnimatedBotIcon atau ikon statis - sesuaikan warna */}
                          {message.isAnimating ? (
                            <AnimatedBotIcon className="w-8 h-8 text-green-600" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white shadow-sm">
                              {/* Ganti ikon jika perlu */}
                              <img src="/img/book.svg" alt="Book" className="w-5 h-5 object-contain" />
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.type === 'user'
                            ? 'bg-gray-100 text-gray-900 rounded-tr-none shadow-sm' // Sesuaikan warna user
                            : message.error
                            ? 'bg-amber-50 text-amber-800 rounded-tl-none border border-amber-200'
                            : message.isAnimating // Style khusus untuk skeleton
                            ? 'bg-white text-gray-800 rounded-tl-none border border-gray-200 w-full' 
                            : 'bg-white text-gray-800 rounded-tl-none border border-gray-200 shadow-sm'
                        }`}
                      >
                        {/* Tampilkan SkeletonMessage jika sedang animasi */}
                        {message.isAnimating ? (
                          <SkeletonMessage />
                        ) : message.content === 'rate_limit_error' ? (
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
                            
                            {message.type === 'bot' && !message.isAnimating && (
                              <button
                                onClick={() => copyToClipboard(
                                  "Batas permintaan tercapai. Silakan coba lagi dalam 2 menit."
                                )}
                                className="mt-1 text-xs text-gray-500 hover:text-gray-700 flex items-center"
                                aria-label="Salin pesan"
                              >
                                {copied === message.content ? (
                                  <>
                                    <Check className="w-3 h-3 mr-1" />
                                    Disalin
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-1" />
                                    Salin
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div
                              className="prose prose-sm max-w-none break-words prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-a:text-green-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-li:marker:text-gray-500 prose-strong:text-gray-900 prose-em:text-gray-700 prose-p:my-0.5 prose-headings:my-0.5 prose-headings:mb-0 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0.5 prose-pre:my-1 leading-tight [&_p]:!my-0.5 [&_br]:leading-none [&_h1+p]:!mt-0.5 [&_h2+p]:!mt-0.5 [&_h3+p]:!mt-0.5" // Sesuaikan warna link
                              dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                            />

                            {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-500 mb-1">
                                  Sumber:
                                </p>
                                <ul className="text-xs text-gray-500 space-y-1">
                                  {message.sourceDocuments.map((doc, idx) => (
                                    <li key={idx} className="break-all">
                                      {doc.metadata.source || doc.metadata.title || 'Dokumen Perkaba Bantek'}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {message.type === 'bot' && !message.isAnimating && (
                              <button
                                onClick={() => copyToClipboard(message.content)}
                                className="mt-1 text-xs text-gray-500 hover:text-gray-700 flex items-center"
                                aria-label="Salin pesan"
                              >
                                {copied === message.content ? (
                                  <>
                                    <Check className="w-3 h-3 mr-1" />
                                    Disalin
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-1" />
                                    Salin
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null // Jangan render jika konten kosong dan tidak animasi
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4 md:px-8 pb-safe">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="relative">
              <Textarea
                ref={textareaRef}
                rows={1} // Start with one row
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan Anda..."
                className="resize-none pl-4 pr-12 py-3 max-h-[200px] rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500 shadow-sm overflow-y-auto z-10"
                disabled={isProcessing}
                readOnly={false}
                autoComplete="off"
              />
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!inputMessage.trim() || isProcessing}
                className={cn(
                  "absolute bottom-3 right-2.5 h-8 w-8 p-0 rounded-lg z-20",
                  !inputMessage.trim() || isProcessing
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                )}
                aria-label="Kirim pesan"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Bantek AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BantekChatPage; 