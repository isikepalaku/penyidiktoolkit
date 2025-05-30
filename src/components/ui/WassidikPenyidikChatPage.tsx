import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, RefreshCw, Paperclip, File, X as XIcon } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { DotBackground } from './DotBackground';
import { 
  sendChatMessage as sendWassidikPenyidikChatMessage, 
  clearChatHistory, 
  initializeSession
} from '@/services/wassidikPenyidikService';
import { formatMessage } from '@/utils/markdownFormatter';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

interface WassidikPenyidikChatPageProps {
  onBack: () => void;
}

export default function WassidikPenyidikChatPage({ onBack }: WassidikPenyidikChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    content: '',
    type: 'assistant',
    timestamp: new Date(),
  }]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSessionInitialized = useRef<boolean>(false);

  // Effect untuk inisialisasi session sekali saat komponen di-mount
  useEffect(() => {
    if (isSessionInitialized.current) {
      console.log('Session already initialized, skipping');
      return;
    }

    try {
      initializeSession();
      isSessionInitialized.current = true;
      console.log('Session initialized successfully');
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // Adjust height dynamically
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
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

  const handleSendMessage = async () => {
    // Allow submission if there are files selected, even if inputMessage is empty
    if ((selectedFiles.length === 0 && !inputMessage.trim()) || isLoading) return;

    const userMessageContent = inputMessage.trim() || (selectedFiles.length > 0 ? "Tolong analisis file yang saya kirimkan." : "");
    
    // Create file attachments info for display
    const fileAttachments = selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type
    }));

    const userMessage: Message = {
      id: Date.now().toString(),
      content: userMessageContent,
      type: 'user',
      timestamp: new Date(),
      attachments: fileAttachments.length > 0 ? fileAttachments : undefined
    };

    // Clear input and reset height immediately
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.blur();
    }
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Log file sizes if files are selected
    if (selectedFiles.length > 0) {
      console.log('Uploading files:');
      selectedFiles.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      });
    }

    try {
      const response = await sendWassidikPenyidikChatMessage(
        userMessage.content, 
        selectedFiles.length > 0 ? selectedFiles : undefined
      );
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.text,
        type: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Reset selected files after successful send
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error sending message:', error);
      
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
          
          if (error.message.includes('Terlalu banyak permintaan')) {
            return 'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu beberapa saat dan coba lagi.';
          }
          
          return error.message;
        }
        
        return 'Dengan bertumbuhnya pengguna, saat ini kami membatasi permintaan (1 permintaan dalam 2 menit) untuk menjaga kualitas layanan';
      };
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Maaf, terjadi kesalahan: ${getErrorMessage(error)}`,
        type: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      // Reset files on error too
      setSelectedFiles([]);
    } finally {
      setIsLoading(false);
      // Focus the textarea after sending
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleCopy = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(messageId);
        setTimeout(() => {
          setCopied(null);
        }, 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  const handleChatReset = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua riwayat percakapan?')) {
      try {
        console.log('Resetting chat history but maintaining user identity');
        clearChatHistory();
        initializeSession();
        console.log('Session reinitialized with fresh session_id but same user_id');
        
        setMessages([{
          id: '0',
          content: '',
          type: 'assistant',
          timestamp: new Date(),
        }]);
        setSelectedFiles([]);
      } catch (error) {
        console.error('Error resetting chat:', error);
      }
    }
  };

  const exampleQuestions = [
    "Apa yang menjadi indikator untuk melaksanakan gelar perkara khusus?",
    "Siapa yang berwenang melaksanakan pemeriksaan pendahuluan di tingkat Polda?",
    "Apa yang harus dilakukan penyidik setelah menerima SP3D hasil gelar perkara?",
    "Apa saja objek yang diawasi dalam kegiatan supervisi terhadap penyidik?"
  ];

  const handleSelectQuestion = (question: string) => {
    setInputMessage(question);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 100);
  };

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
            <h1 className="font-semibold">Wassidik AI</h1>
            <p className="text-sm text-gray-600 hidden sm:block">Asisten Pengawasan Penyidikan</p>
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
              <h3 className="text-sm font-medium text-purple-800">Informasi Wassidik AI</h3>
              <div className="mt-2 text-sm text-purple-700">
                <p>Wassidik AI merupakan asisten kepolisian yang membantu dalam pengawasan dan koordinasi proses penyelidikan dan penyidikan tindak pidana.</p>
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
            {/* Welcome Message - Bold WASSIDIK AI in center */}
            {messages.length <= 1 && messages[0].content === '' && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <img src="/img/wassidik.svg" alt="Wassidik AI" className="h-8 w-8" />
                </div>
                <h2 className="text-4xl font-bold text-purple-600 mb-4">WASSIDIK AI</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Saya siap membantu Anda dalam hal pengawasan dan koordinasi proses penyelidikan dan penyidikan.
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

            {/* Chat Messages */}
            {messages.map((message) => (
              message.content && (
                <div
                  key={message.id}
                  className={cn("flex", message.type === "user" ? "justify-end" : "justify-start")}
                >
                  <div className={cn("flex gap-4", message.type === "user" ? "flex-row-reverse" : "flex-row")}>
                    {message.type === 'assistant' && (
                      <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <img src="/img/wassidik.svg" alt="Wassidik AI" className="h-5 w-5" />
                      </div>
                    )}
                    <div className={cn("max-w-[80%]", message.type === 'user' ? "order-first" : "")}>
                      <div
                        className={cn(
                          "px-4 py-3 rounded-xl break-words",
                          message.type === 'user'
                            ? 'bg-purple-600 text-white ml-auto'
                            : 'bg-white border border-gray-200 text-gray-900'
                        )}
                      >
                        {message.type === 'assistant' ? (
                          <div className="relative group">
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
                                onClick={() => handleCopy(message.content, message.id)}
                              >
                                {copied === message.id ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                                <span className="ml-2 text-xs">{copied === message.id ? "Disalin" : "Salin"}</span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {message.attachments.map((file, idx) => (
                                  <div 
                                    key={idx}
                                    className="bg-purple-100 border border-purple-200 rounded-lg px-2 py-1 flex items-center gap-1 text-xs text-purple-700"
                                  >
                                    <File className="w-3 h-3" />
                                    <span className="truncate max-w-[100px]">{file.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 px-1">
                        {message.timestamp.toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    {message.type === 'user' && (
                      <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-sm font-medium">U</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}

            {/* Simple loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-4">
                  <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <img src="/img/wassidik.svg" alt="Wassidik AI" className="h-5 w-5" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">Wassidik AI sedang mengetik...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
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
                  className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-1 flex items-center gap-2 text-sm text-purple-700"
                >
                  <File className="w-4 h-4" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button 
                    onClick={() => handleRemoveFile(index)}
                    className="text-purple-500 hover:text-purple-700"
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
              rows={1}
              value={inputMessage}
              onChange={handleInputChange}
              placeholder="Ketik pesan Anda atau upload file..."
              className="resize-none pr-20 py-3 pl-12 max-h-[200px] rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500 shadow-sm overflow-y-auto"
              disabled={isLoading}
            />
            
            {/* File Upload Button */}
            <button
              type="button"
              onClick={handleOpenFileDialog}
              disabled={isLoading}
              className="absolute left-2 bottom-3 p-2 rounded-lg text-gray-500 hover:text-purple-500 hover:bg-purple-50 transition-colors"
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
              accept=".pdf,.jpg,.jpeg,.png"
            />
            
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || (selectedFiles.length === 0 && !inputMessage.trim())}
              className={cn(
                "absolute right-2 bottom-3 p-2 rounded-lg",
                isLoading || (selectedFiles.length === 0 && !inputMessage.trim())
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              )}
              aria-label="Kirim pesan"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Wassidik AI dapat membuat kesalahan. Pastikan untuk memverifikasi informasi penting.
          </p>
        </div>
      </div>
    </div>
  );
} 