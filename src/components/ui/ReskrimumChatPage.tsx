import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, X, ChevronDown, Paperclip, File, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { AnimatedBotIcon } from './animated-bot-icon';
import { DotBackground } from './DotBackground';
import { sendChatMessage, clearChatHistory, initializeSession } from '@/services/reskrimumService';
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

// Skeleton component for loading state
const SkeletonMessage = () => (
  <div className="flex items-start space-x-3">
    <AnimatedBotIcon className="w-5 h-5 flex-shrink-0 mt-1" />
    <div className="flex-1 space-y-3 py-1">
      <p className="text-xs text-gray-500 italic mb-1">Sedang menyusun hasil...</p>
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-full"></div>
        <div className="h-4 bg-gray-300 rounded w-5/6"></div>
        <div className="h-4 bg-gray-300 rounded w-11/12"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-2"></div>
        <div className="pl-3 space-y-2">
          <div className="h-3 bg-gray-300 rounded w-11/12"></div>
          <div className="h-3 bg-gray-300 rounded w-4/5"></div>
        </div>
        <div className="h-2"></div>
        <div className="h-4 bg-gray-300 rounded w-full"></div>
        <div className="h-4 bg-gray-300 rounded w-2/3"></div>
      </div>
    </div>
  </div>
);

// Header Component
const ChatHeader = ({ onBack, showInfo, setShowInfo }: {
  onBack: () => void;
  showInfo: boolean;
  setShowInfo: (show: boolean) => void;
}) => (
  <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="inline-flex items-center p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Kembali"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-9 h-9 bg-indigo-100 rounded-full">
          <img 
            src="/img/krimsus.png"
            alt="Reskrimum"
            className="w-7 h-7 object-contain"
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reskrimum AI</h2>
          <p className="text-xs text-gray-500">Asisten Tindak Pidana Kriminal Umum</p>
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
);

// Info Panel Component
const InfoPanel = ({ show }: { show: boolean }) => {
  if (!show) return null;
  
  return (
    <div className="bg-indigo-50 border-b border-indigo-200 p-3 text-sm text-indigo-800">
      <div className="max-w-3xl mx-auto">
        <p className="mb-2"><strong>Tentang Reskrimum AI:</strong></p>
        <p>Reskrimum AI adalah asisten yang memberikan informasi tentang tindak pidana konvensional seperti pencurian, pembunuhan, penganiayaan dan lainnya berdasarkan KUHP dan perundang-undangan terkait.</p>
        <p className="mt-2 text-xs text-indigo-600">Catatan: Reskrimum AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.</p>
      </div>
    </div>
  );
};

// Welcome Screen Component
const WelcomeScreen = () => (
  <div className="flex flex-col items-center justify-center h-[50vh] text-center">
    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
      <img 
        src="/img/krimsus.png"
        alt="Reskrimum"
        className="w-16 h-16 object-contain"
      />
    </div>
    <h1 className="text-4xl font-bold text-indigo-600 mb-4">RESKRIMUM AI</h1>
    <p className="text-gray-600 max-w-md">
      Asisten Ai yang memahami konteks undang-undang tindak pidana umum, pemilu, agraria dan terorisme.
    </p>
  </div>
);

// Example Questions Component
const ExampleQuestions = ({ onQuestionClick }: {
  onQuestionClick: (question: string) => void;
}) => {
  const exampleQuestions = [
    "Bagaimana prosedur teknis pengumpulan dan analisis sidik jari di tempat kejadian perkara (TKP) untuk menguatkan pasal-pasal pembobolan?",
    "Apa langkah-langkah pemeriksaan barang bukti digital (chat, e-mail, metadata) dan cara memelihara integritas rantai penguasaan (chain of custody) untuk mendukung dakwaan penipuan",
    "Prosedur apa yang diterapkan untuk menelusuri perubahan data di Kantor Pertanahan (e-registry) guna mengungkap dugaan pemalsuan akta jual beli?",
    "Prosedur apa saja dalam pemeriksaan dan pengujian bahan peledak di laboratorium forensik (BI-PTK) agar hasil analisis dapat dipertanggungjawabkan secara ilmiah?"
  ];

  return (
    <div className="mt-6 mb-8">
      <p className="text-sm text-gray-500 mb-3">Anda dapat mencoba pertanyaan berikut:</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {exampleQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className="text-left p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
};

// File Preview Component
const FilePreview = ({ files, onRemoveFile }: {
  files: File[];
  onRemoveFile: (index: number) => void;
}) => {
  if (files.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {files.map((file, index) => (
        <div 
          key={index}
          className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1 flex items-center gap-2 text-sm text-indigo-700"
        >
          <File className="w-4 h-4" />
          <span className="truncate max-w-[150px]">{file.name}</span>
          <button 
            onClick={() => onRemoveFile(index)}
            className="text-indigo-500 hover:text-indigo-700"
            aria-label="Hapus file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

// Rate Limit Error Component
const RateLimitError = ({ onCopy, copied }: {
  onCopy: () => void;
  copied: boolean;
}) => (
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
    
    <button
      onClick={onCopy}
      className="mt-1 text-xs text-gray-500 hover:text-gray-700 flex items-center"
      aria-label="Salin pesan"
    >
      {copied ? (
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
  </div>
);

// Message Item Component
const MessageItem = ({ message, copied, onCopy, formatMessage }: {
  message: Message;
  copied: string | null;
  onCopy: (content: string) => void;
  formatMessage: (content: string) => string;
}) => (
  <div
    className={`flex ${
      message.type === 'user' ? 'justify-end' : 'justify-start'
    }`}
  >
    <div
      className={`flex items-end ${message.isAnimating ? 'w-full' : 'max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%]'} ${
        message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {message.type === 'bot' && (
        <div className="flex-shrink-0 mr-2 mb-1">
          {message.isAnimating ? (
            <AnimatedBotIcon className="w-8 h-8 text-indigo-600" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <img src="/img/krimsus.png" alt="Reskrimum" className="w-5 h-5 object-contain" />
            </div>
          )}
        </div>
      )}

      <div
        className={`rounded-2xl px-4 py-3 ${
          message.type === 'user'
            ? 'bg-gray-100 text-gray-900 rounded-tr-none shadow-sm'
            : message.error
            ? 'bg-red-50 text-red-800 rounded-tl-none border border-red-200'
            : message.isAnimating
            ? 'bg-white text-gray-800 rounded-tl-none border border-gray-200 w-full' 
            : 'bg-white text-gray-800 rounded-tl-none border border-gray-200 shadow-sm'
        }`}
      >
        {message.isAnimating ? (
          <SkeletonMessage />
        ) : message.content === 'rate_limit_error' ? (
          <RateLimitError 
            onCopy={() => onCopy("Batas permintaan tercapai. Silakan coba lagi dalam 2 menit.")}
            copied={copied === message.content}
          />
        ) : (
          <div>
            <div
              className="prose prose-sm max-w-none md:prose-base lg:prose-lg overflow-x-auto
                        prose-headings:font-bold prose-headings:text-indigo-800 prose-headings:my-4
                        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                        prose-p:my-2 prose-p:text-gray-700
                        prose-ul:pl-6 prose-ul:my-2 prose-ol:pl-6 prose-ol:my-2
                        prose-li:my-1
                        prose-table:border-collapse prose-table:my-4
                        prose-th:bg-indigo-50 prose-th:p-2 prose-th:border prose-th:border-gray-300
                        prose-td:p-2 prose-td:border prose-td:border-gray-300
                        prose-strong:font-bold prose-strong:text-gray-800
                        prose-a:text-indigo-600 prose-a:underline hover:prose-a:text-indigo-800"
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
                      {doc.metadata.source || doc.metadata.title || 'Dokumen Tindak Pidana Umum'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {message.type === 'bot' && !message.isAnimating && (
              <button
                onClick={() => onCopy(message.content)}
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
);

// Message Input Component
const MessageInput = ({ 
  inputMessage, 
  setInputMessage, 
  selectedFiles, 
  onFileChange, 
  onRemoveFile, 
  onOpenFileDialog, 
  onSubmit, 
  isProcessing,
  textareaRef,
  fileInputRef 
}: {
  inputMessage: string;
  setInputMessage: (value: string) => void;
  selectedFiles: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onOpenFileDialog: () => void;
  onSubmit: () => void;
  isProcessing: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) => {
  const isDesktopRef = useRef<boolean>(window.innerWidth >= 1024);

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    
    if (textarea.scrollHeight > 200) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    adjustTextareaHeight(e.target);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && isDesktopRef.current) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4 md:px-8 pb-6 md:pb-4">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <FilePreview files={selectedFiles} onRemoveFile={onRemoveFile} />
      
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="relative">
          <Textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan Anda..."
            className="resize-none pr-12 py-3 pl-10 max-h-[200px] rounded-xl border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm overflow-y-auto z-10"
            disabled={isProcessing}
            readOnly={false}
            autoComplete="off"
          />
          
          <button
            type="button"
            onClick={onOpenFileDialog}
            disabled={isProcessing}
            className="absolute left-2 bottom-3 p-2 rounded-lg text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 transition-colors z-20"
            aria-label="Upload file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={onFileChange}
            className="hidden"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
          />
          
          <Button
            type="button"
            onClick={onSubmit}
            disabled={(selectedFiles.length === 0 && !inputMessage.trim()) || isProcessing}
            className={cn(
              "absolute bottom-3 right-2.5 h-8 w-8 p-0 rounded-lg z-20",
              (selectedFiles.length === 0 && !inputMessage.trim()) || isProcessing
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
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
          Reskrimum AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.
        </p>
      </div>
    </div>
  );
};

interface ReskrimumChatPageProps {
  onBack?: () => void;
}

const ReskrimumChatPage: React.FC<ReskrimumChatPageProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize session
  useEffect(() => {
    initializeSession();
    
    setMessages([
      {
        content: '',
        type: 'bot',
        timestamp: new Date(),
      },
    ]);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 500);
    
    const handleScroll = () => {
      if (!chatContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      setUserScrolled(!isAtBottom && messages.length > 1);
      setShowScrollButton(!isAtBottom && messages.length > 1);
    };
    
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      clearChatHistory();
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    if (!userScrolled || messages.length <= 2) {
      scrollToBottom();
    }
  }, [messages, userScrolled]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        try {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
          
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        } catch (e) {
          console.error('Smooth scroll failed, using fallback:', e);
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };
  
  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async () => {
    if ((selectedFiles.length === 0 && !inputMessage.trim()) || isProcessing) return;

    const userMessage: Message = {
      content: inputMessage.trim() || (selectedFiles.length > 0 ? "Tolong analisis file yang saya kirimkan." : ""),
      type: 'user',
      timestamp: new Date()
    };

    setUserScrolled(false);
    setShowScrollButton(false);
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    setIsProcessing(true);

    try {
      setMessages((prev) => [
        ...prev,
        {
          content: '',
          type: 'bot',
          timestamp: new Date(),
          isAnimating: true,
        },
      ]);
      
      if (selectedFiles.length > 0) {
        console.log('Uploading files:');
        selectedFiles.forEach((file, index) => {
          console.log(`File ${index + 1}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        });
      }
      
      const response = await sendChatMessage(
        userMessage.content, 
        selectedFiles.length > 0 ? selectedFiles : undefined
      );
      
      setSelectedFiles([]);
      
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
      
      setSelectedFiles([]);
      
      const getErrorMessage = (error: any): string => {
        if (!navigator.onLine) {
          return 'Perangkat Anda sedang offline. Silakan periksa koneksi internet dan coba lagi.';
        }
        
        if (error.message) {
          if (error.message.includes('File terlalu besar')) {
            return 'File terlalu besar. Harap gunakan file dengan ukuran lebih kecil (maksimal 50MB).';
          }
          
          if (error.message.includes('timeout') || error.message.includes('timed out')) {
            return 'Permintaan timeout. File mungkin terlalu besar atau koneksi terlalu lambat.';
          }
          
          if (error.message.includes('Terlalu banyak permintaan') || error.message.includes('429')) {
            return 'rate_limit_error';
          }
          
          return error.message;
        }
        
        return 'rate_limit_error';
      };
      
      setMessages((prev) => {
        const newMessages = [...prev];
        const placeholderIndex = newMessages.findIndex(
          (msg) => msg.type === 'bot' && msg.isAnimating
        );
        
        if (placeholderIndex !== -1) {
          const errorMsg = getErrorMessage(error);
          const isRateLimitError = errorMsg === 'rate_limit_error';
          
          newMessages[placeholderIndex] = {
            content: errorMsg,
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
    clearChatHistory();
    
    if (onBack) {
      onBack();
    }
  };

  const handleExampleClick = (question: string) => {
    setInputMessage(question);
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }, 0);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 lg:pl-64">
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <ChatHeader onBack={handleBack} showInfo={showInfo} setShowInfo={setShowInfo} />
        <InfoPanel show={showInfo} />

        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 md:px-8 relative pb-32"
        >
          <div className="absolute inset-0">
            <DotBackground />
          </div>
          <div className="max-w-5xl mx-auto relative z-10 space-y-6">
            {messages.length <= 1 && <WelcomeScreen />}

            {messages.length === 1 && (
              <ExampleQuestions onQuestionClick={handleExampleClick} />
            )}

            <div className="space-y-6">
              {messages.map((message, index) => (
                message.content || message.isAnimating ? (
                  <MessageItem
                    key={index}
                    message={message}
                    copied={copied}
                    onCopy={copyToClipboard}
                    formatMessage={formatMessage}
                  />
                ) : null
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-6 md:right-10 bg-indigo-600 text-white p-2 rounded-full shadow-lg z-30 hover:bg-indigo-700 transition-colors animate-bounce"
            aria-label="Scroll ke bawah"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}

        <MessageInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          selectedFiles={selectedFiles}
          onFileChange={handleFileChange}
          onRemoveFile={handleRemoveFile}
          onOpenFileDialog={handleOpenFileDialog}
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
        />
      </div>
    </div>
  );
};

export default ReskrimumChatPage; 