import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, X, RefreshCw, Paperclip, File, X as XIcon } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { AnimatedBotIcon } from './animated-bot-icon';
import { DotBackground } from './DotBackground';
import { sendChatMessage, initializeSession, clearChatHistory, onProgress } from '@/services/siberService';
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
  ADD_TAGS: ['a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code'],
  ADD_ATTR: ['target', 'rel', 'class', 'id'],
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

interface SiberChatPageProps {
  onBack?: () => void;
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

// Progress bar component untuk file processing
const ProgressBar = ({ percent = 0, status = 'uploading' }) => {
  const getStatusText = () => {
    switch (status) {
      case 'preparing':
        return 'Mempersiapkan...';
      case 'uploading':
        return 'Mengunggah file...';
      case 'processing':
        return 'Memproses dokumen...';
      case 'completed':
        return 'Selesai!';
      default:
        return 'Memproses...';
    }
  };

  const getColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'uploading':
        return 'bg-amber-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="w-full mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
        <span className="text-sm font-medium text-gray-700">{percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${getColor()} transition-all duration-500 ease-in-out`} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
};

const SiberChatPage: React.FC<SiberChatPageProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([{
    content: '',
    type: 'bot',
    timestamp: new Date(),
  }]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isConnectionError, setIsConnectionError] = useState(false);
  // State untuk upload file
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // State untuk progress
  const [progress, setProgress] = useState<{status: string, percent: number}>({
    status: 'preparing',
    percent: 0
  });
  const [showProgress, setShowProgress] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSessionInitialized = useRef<boolean>(false);
  // Add focus ref for auto-focusing the textarea
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Setup progress listener
  useEffect(() => {
    const unsubscribe = onProgress((progressInfo) => {
      setProgress({
        status: progressInfo.status,
        percent: progressInfo.percent || 0
      });
      
      if (progressInfo.status === 'completed') {
        // Hide progress after completion + delay
        setTimeout(() => {
          setShowProgress(false);
        }, 1000);
      } else {
        setShowProgress(true);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Effect untuk inisialisasi session sekali saat komponen di-mount
  useEffect(() => {
    // Jangan inisialisasi ulang jika sudah dilakukan
    if (isSessionInitialized.current) {
      console.log('Session already initialized, skipping');
      return;
    }

    try {
      // Inisialisasi session hanya sekali
      initializeSession();
      isSessionInitialized.current = true;
      console.log('Session initialized successfully');
      
      // Focus pada textarea setelah inisialisasi
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
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
    };
    // Jangan hapus session saat unmount agar memory tetap terjaga
  }, []);

  // Add focus on component mount with delay
  useEffect(() => {
    focusTimeoutRef.current = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 500);

    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
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
    // Adjust height dynamically
    const textarea = e.target;
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

  // Fungsi untuk menampilkan error yang lebih spesifik
  const getErrorMessage = (error: any): string => {
    if (!navigator.onLine) {
      return 'Perangkat Anda sedang offline. Silakan periksa koneksi internet dan coba lagi.';
    }
    
    if (error.message) {
      // Jika error spesifik tentang ukuran file
      if (error.message.includes('File terlalu besar')) {
        return 'File terlalu besar. Harap gunakan file dengan ukuran lebih kecil (maksimal 50MB).';
      }
      
      // Jika error timeout
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return 'Permintaan timeout. File mungkin terlalu besar atau koneksi terlalu lambat.';
      }
      
      // Jika error spesifik tentang rate limit
      if (error.message.includes('Terlalu banyak permintaan')) {
        return 'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu beberapa saat dan coba lagi.';
      }
      
      // Jika ada pesan error spesifik lainnya, tampilkan
      return error.message;
    }
    
    // Default error message
    return 'Permintaan Terlalu banyak, coba lagi dalam 2 menit. (dengan bertumbuhnya pengguna, saat ini kami membatasi permintaan untuk menjaga kualitas layanan)';
  };

  const handleSubmit = async () => {
    if ((selectedFiles.length === 0 && !inputMessage.trim()) || isProcessing) return;

    const userMessageContent = inputMessage.trim() || (selectedFiles.length > 0 ? "Analisis file berikut" : "");
    const userMessage: Message = {
      content: userMessageContent,
      type: "user",
      timestamp: new Date(),
    };

    // Clear input and reset height immediately
    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.blur(); // Remove focus to hide keyboard on mobile
    }
    
    // Add user message to state
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);
    setIsConnectionError(false);
    
    // Reset progress display
    setProgress({ status: 'preparing', percent: 0 });
    
    // Check if any file is large (> 5MB)
    const hasLargeFile = selectedFiles.some(file => file.size > 5 * 1024 * 1024);
    if (hasLargeFile) {
      setShowProgress(true);
    }

    try {
      // Add a placeholder bot message with animation
      setMessages((prev) => [
        ...prev,
        {
          content: '', // Content is empty for the skeleton/placeholder
          type: 'bot',
          timestamp: new Date(),
          isAnimating: true,
        },
      ]);

      // Log file sizes sebelum upload
      if (selectedFiles.length > 0) {
        console.log('Uploading files:');
        selectedFiles.forEach((file, index) => {
          console.log(`File ${index + 1}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        });
      }

      // Kirim pesan dengan file jika ada
      const response = await sendChatMessage(
        userMessage.content, 
        selectedFiles.length > 0 ? selectedFiles : undefined
      );

      // Reset selected files setelah berhasil mengirim
      setSelectedFiles([]);
      setShowProgress(false);

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
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Check if it's a network error
      const isNetworkError = error instanceof TypeError && 
        (error.message.includes('network') || 
         error.message.includes('fetch') || 
         error.message.includes('Failed to fetch'));
      
      if (isNetworkError) {
        setIsConnectionError(true);
      }
      
      // Reset progress display
      setShowProgress(false);
      
      // Replace the placeholder with an error message
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the last message (placeholder)
        newMessages.pop();
        
        // Add error message with specific details
        newMessages.push({
          content: getErrorMessage(error),
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatMessage = (content: string) => {
    try {
      // Pastikan content ada dan bukan string kosong
      if (!content) return '';
      
      // Preprocessor sederhana: hanya ganti karakter newline
      // Terlalu banyak preprocessing bisa mengubah format asli
      let processedContent = content.replace(/\\n/g, '\n');
      
      // Parse markdown menjadi HTML
      const rawHtml = marked.parse(processedContent);
      
      // Sanitasi HTML untuk mencegah XSS
      const sanitizedHtml = DOMPurify.sanitize(rawHtml);
      
      return sanitizedHtml;
    } catch (error) {
      console.error('Error formatting message:', error);
      return 'Error formatting message.';
    }
  };

  const handleChatReset = () => {
    try {
      console.log('Resetting chat history but maintaining user identity');
      clearChatHistory(); // Ini hanya akan menghapus session_id, tapi mempertahankan user_id
      
      // Inisialisasi ulang session dengan user_id yang sama
      initializeSession();
      console.log('Session reinitialized with fresh session_id but same user_id');
      
      // Reset UI state
      setMessages([{
        content: '',
        type: 'bot',
        timestamp: new Date(),
      }]);
      setHasError(false);
      setIsConnectionError(false);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error resetting chat:', error);
    }
  };

  // Example questions yang relevan dengan kejahatan siber
  const exampleQuestions = [
    "Pasal apa yang dapat diterapkan untuk pelaku penipuan online?",
    "Bagaimana cara menangani kasus pencurian data pribadi?",
    "Apakah menyebarkan screenshot percakapan WhatsApp seseorang tanpa izin termasuk pelanggaran UU ITE?",
    "Apa batasan antara kritik dan penghinaan dalam konteks tindak pidana UU ITE?"
  ];

  const handleSelectQuestion = (question: string) => {
    setInputMessage(question);
    if (textareaRef.current) {
      textareaRef.current.focus();
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
              <h1 className="font-semibold">SIBER AI</h1>
              <p className="text-sm text-gray-600 hidden sm:block">Asisten untuk tindak pidana cyber</p>
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
            <h1 className="font-semibold">SIBER AI</h1>
            <p className="text-sm text-gray-600 hidden sm:block">Asisten untuk tindak pidana cyber</p>
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
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-4 shadow-sm rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Informasi SIBER AI</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>SIBER AI merupakan asisten kepolisian yang membantu dalam penanganan tindak pidana cyber. Asisten ini dapat menjawab pertanyaan terkait hukum cyber, teknik penyelidikan digital, dan penanganan kasus-kasus kejahatan siber.</p>
              </div>
              <button 
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
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
            {/* Welcome Message - Bold SIBER AI in center */}
            {messages.length <= 1 && messages[0].content === '' && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <img 
                    src="/img/siber.svg"
                    alt="Krimsus"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <h1 className="text-4xl font-bold text-blue-600 mb-4">SIBER AI</h1>
                <p className="text-gray-600 max-w-md">
                  Asisten untuk membantu Anda dengan pertanyaan seputar tindak pidana cyber.
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
                      className="text-left p-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-blue-50 transition-colors shadow-sm"
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

            {/* Progress Bar for file uploads and processing - only show when active */}
            {showProgress && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
                <ProgressBar 
                  percent={progress.percent} 
                  status={progress.status}
                />
                <p className="text-xs text-gray-500 italic">
                  {progress.status === 'uploading' 
                    ? 'Mengunggah file besar memerlukan waktu, mohon jangan refresh halaman.' 
                    : progress.status === 'processing'
                    ? 'AI sedang menganalisis dokumen, proses ini mungkin memerlukan beberapa menit untuk file besar.'
                    : 'Sedang memproses...'}
                </p>
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
                                    prose-headings:font-bold prose-headings:text-blue-800 prose-headings:my-4
                                    prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                                    prose-p:my-2 prose-p:text-gray-700
                                    prose-ul:pl-6 prose-ul:my-2 prose-ol:pl-6 prose-ol:my-2
                                    prose-li:my-1
                                    prose-table:border-collapse prose-table:my-4
                                    prose-th:bg-blue-50 prose-th:p-2 prose-th:border prose-th:border-gray-300
                                    prose-td:p-2 prose-td:border prose-td:border-gray-300
                                    prose-strong:font-bold prose-strong:text-gray-800
                                    prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800"
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
                      // Render Skeleton component with AnimatedBotIcon when animating
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

      {/* Input area fixed at bottom */}
      <div className="border-t border-gray-200 bg-white p-4 md:px-8 pb-safe">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          {/* File Preview Area */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 flex items-center gap-2 text-sm text-blue-700"
                >
                  <File className="w-4 h-4" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button 
                    onClick={() => handleRemoveFile(index)}
                    className="text-blue-500 hover:text-blue-700"
                    aria-label="Hapus file"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              rows={1} // Start with one row
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan Anda atau upload file..."
              className="resize-none pr-12 py-3 pl-10 max-h-[200px] rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm overflow-y-auto z-10"
              disabled={isProcessing}
              readOnly={false}
              autoComplete="off"
            />
            
            {/* File upload button */}
            <button
              type="button"
              onClick={handleOpenFileDialog}
              disabled={isProcessing}
              className="absolute left-2 bottom-3 p-2 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors z-20"
              aria-label="Upload file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            {/* Hidden file input */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={(selectedFiles.length === 0 && !inputMessage.trim()) || isProcessing}
              className={cn(
                "absolute right-2 bottom-3 p-2 rounded-lg z-20",
                (selectedFiles.length === 0 && !inputMessage.trim()) || isProcessing
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
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
            SIBER AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SiberChatPage; 