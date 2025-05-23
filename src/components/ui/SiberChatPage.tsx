import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, RefreshCw, Paperclip, File, X as XIcon, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { DotBackground } from './DotBackground';
import { sendChatMessage, initializeSession, clearChatHistory, onProgress } from '@/services/siberService';
import { formatMessage } from '@/utils/markdownFormatter';

// Imports untuk refactoring
import { Message, ChatPageProps, FileAttachment } from '@/types/chat';
import { SkeletonMessage } from '@/components/chat/SkeletonMessage';
import { ProgressBar } from '@/components/chat/ProgressBar';
import { ErrorScreen } from '@/components/chat/ErrorScreen';
import { FileAttachments } from '@/components/chat/FileAttachments';
import { 
  scrollToBottom, 
  adjustTextareaHeight, 
  focusTextareaWithDelay, 
  copyToClipboard, 
  getErrorMessage 
} from '@/utils/chatHelpers';
import { useFileUpload } from '@/hooks/useFileUpload';
import { 
  SIBER_EXAMPLE_QUESTIONS, 
  ACCEPTED_FILE_TYPES,
  FOCUS_DELAY_MS
} from '@/constants/chatConstants';

const SiberChatPage: React.FC<ChatPageProps> = ({ onBack }) => {
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

  // File upload dengan custom hook
  const {
    selectedFiles,
    progress,
    showProgress,
    fileInputRef,
    handleFileChange,
    handleRemoveFile,
    handleOpenFileDialog,
    resetFiles,
    logFilesSizes
  } = useFileUpload();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSessionInitialized = useRef<boolean>(false);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Setup progress listener untuk service
  useEffect(() => {
    const unsubscribe = onProgress(() => {
      // Progress akan dihandle oleh service, tidak perlu update di sini
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
      focusTextareaWithDelay(textareaRef, FOCUS_DELAY_MS);
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
    }, FOCUS_DELAY_MS);

    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom(chatContainerRef);
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // Adjust height dynamically menggunakan utility function
    adjustTextareaHeight(e.target, e.target.value);
  };

  const handleKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Remove Enter key submission for mobile compatibility
    // Submission is handled by the Send button
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

  const handleSubmit = async () => {
    if ((selectedFiles.length === 0 && !inputMessage.trim()) || isProcessing) return;

    const userMessageContent = inputMessage.trim() || (selectedFiles.length > 0 ? "Analisis file berikut" : "");
    
    // Simpan informasi file untuk ditampilkan di message
    const fileAttachments: FileAttachment[] = selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type
    }));
    
    const userMessage: Message = {
      content: userMessageContent,
      type: "user",
      timestamp: new Date(),
      attachments: fileAttachments.length > 0 ? fileAttachments : undefined
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

      // Log file sizes sebelum upload menggunakan utility function
      logFilesSizes();

      // Kirim pesan dengan file jika ada
      const response = await sendChatMessage(
        userMessage.content, 
        selectedFiles.length > 0 ? selectedFiles : undefined
      );

      // Reset selected files setelah berhasil mengirim
      resetFiles();

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
      resetFiles();
      
      // Check if it's a rate limit error
      const errorMsg = getErrorMessage(error);
      const isRateLimitError = errorMsg === 'rate_limit_error';
      
      // Replace the placeholder with an error message
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the last message (placeholder)
        newMessages.pop();
        
        // Add error message with specific details
        newMessages.push({
          content: errorMsg,
          type: 'bot',
          timestamp: new Date(),
          error: true,
          isRateLimit: isRateLimitError,
        });
        
        return newMessages;
      });
    } finally {
      setIsProcessing(false);
      // Focus the textarea after sending
      focusTextareaWithDelay(textareaRef, 100);
    }
  };

  const handleCopy = (text: string) => {
    copyToClipboard(text, setCopied);
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
      resetFiles();
    } catch (error) {
      console.error('Error resetting chat:', error);
    }
  };

  const handleSelectQuestion = (question: string) => {
    setInputMessage(question);
    focusTextareaWithDelay(textareaRef, 100);
  };

  // Render error states menggunakan ErrorScreen component
  if (hasError) {
    return (
      <ErrorScreen
        title="SIBER AI"
        subtitle="Asisten untuk tindak pidana cyber"
        onBack={onBack}
        onRetry={handleRetry}
        onReset={handleChatReset}
      />
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
                  {SIBER_EXAMPLE_QUESTIONS.map((question, idx) => (
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
                        ? "bg-amber-50 text-gray-800 rounded-tl-none border border-amber-200"
                        : message.isAnimating
                        ? "bg-white text-gray-800 rounded-tl-none border border-gray-200 w-full"
                        : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
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
                        )}
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3"
                            onClick={() => handleCopy(message.content === 'rate_limit_error' ? 
                              "Batas permintaan tercapai. Silakan coba lagi dalam 2 menit." : 
                              message.content)}
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
                      <>
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        {message.attachments && message.attachments.length > 0 && (
                          <FileAttachments 
                            attachments={message.attachments} 
                            className="mt-3" 
                          />
                        )}
                      </>
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
              accept={ACCEPTED_FILE_TYPES}
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