import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, RefreshCw, Paperclip, File, X as XIcon, Database, Trash2 } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { DotBackground } from './DotBackground';
import { formatMessage } from '@/utils/markdownFormatter';
import useAIChatStreamHandler from '@/hooks/playground/useAIChatStreamHandler';
import { usePlaygroundStore } from '@/stores/PlaygroundStore';
import { PlaygroundChatMessage } from '@/types/playground';
import StreamingStatus from './StreamingStatus';
import { 
  clearStreamingChatHistory,
  initializeStreamingSession
} from '@/services/wassidikPenyidikStreamingService';
import { getStorageStats, forceCleanup } from '@/stores/PlaygroundStore';

interface WassidikPenyidikChatPageProps {
  onBack: () => void;
}

export default function WassidikPenyidikChatPage({ onBack }: WassidikPenyidikChatPageProps) {
  // Use streaming hooks and store
  const { handleStreamResponse } = useAIChatStreamHandler();
  const { messages, isStreaming: isLoading, streamingStatus } = usePlaygroundStore();
  
  const [inputMessage, setInputMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

  // Effect untuk inisialisasi session sekali saat komponen di-mount
  useEffect(() => {
    if (isSessionInitialized.current) {
      console.log('Session already initialized, skipping');
      return;
    }

    try {
      initializeStreamingSession();
      isSessionInitialized.current = true;
      console.log('Session initialized successfully');
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }, []);

  // Load storage stats when showing storage info
  useEffect(() => {
    if (showStorageInfo) {
      const stats = getStorageStats();
      setStorageStats(stats);
    }
  }, [showStorageInfo]);

  // Setup progress tracking for file uploads (simplified)
  useEffect(() => {
    // Progress tracking akan dihandle internal oleh streaming hooks
    // Hanya perlu setup state untuk UI feedback
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

  const handleStorageCleanup = () => {
    if (window.confirm('Apakah Anda yakin ingin membersihkan data lama? Data yang sudah dihapus tidak bisa dikembalikan.')) {
      const newStats = forceCleanup();
      setStorageStats(newStats);
      alert(`Cleanup selesai! Storage yang dibebaskan: ${newStats.usage}`);
    }
  };

  // Progress Bar Component
  const ProgressBar = ({ percent = 0, status = 'uploading' }) => {
    const getStatusText = () => {
      switch (status) {
        case 'preparing': return 'Mempersiapkan...';
        case 'uploading': return 'Mengunggah file...';
        case 'processing': return 'Memproses dokumen...';
        case 'completed': return 'Selesai!';
        default: return 'Memproses...';
      }
    };
    
    const getColor = () => {
      switch (status) {
        case 'completed': return 'bg-green-500';
        case 'processing': return 'bg-blue-500';
        case 'uploading': return 'bg-amber-500';
        default: return 'bg-blue-500';
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

  // Storage Stats Component
  const StorageStatsDisplay = () => {
    if (!storageStats) return null;
    
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-4 shadow-sm rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <Database className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">Statistik Penyimpanan</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-2">
              <div className="flex justify-between">
                <span>Penggunaan Storage:</span>
                <span className="font-medium">{storageStats.usage} / {storageStats.limit}</span>
              </div>
              <div className="flex justify-between">
                <span>Persentase:</span>
                <span className={cn("font-medium", 
                  storageStats.percentage > 80 ? "text-red-600" : "text-blue-600"
                )}>
                  {storageStats.percentage}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Session Tersimpan:</span>
                <span className="font-medium">{storageStats.sessionCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Pesan Saat Ini:</span>
                <span className="font-medium">{messages.length}</span>
              </div>
              
              {/* Progress bar for storage usage */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className={cn("h-2 rounded-full transition-all duration-300",
                    storageStats.percentage > 80 ? "bg-red-500" : 
                    storageStats.percentage > 60 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                ></div>
              </div>
              
              {storageStats.isNearLimit && (
                <div className="text-red-600 text-xs mt-2 font-medium">
                  ⚠️ Storage hampir penuh! Pertimbangkan untuk membersihkan data lama.
                </div>
              )}
            </div>
            
            <div className="mt-3 flex gap-2">
              <button 
                onClick={handleStorageCleanup}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
              >
                <Trash2 className="w-3 h-3" />
                Bersihkan Data Lama
              </button>
              <button 
                className="text-xs font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                onClick={() => setShowStorageInfo(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSendMessage = async () => {
    // Enhanced validation: check message length and content quality
    const trimmedMessage = inputMessage.trim();
    
    // Allow submission if there are files selected, even if inputMessage is empty
    if ((selectedFiles.length === 0 && !trimmedMessage) || isLoading) return;
    
    // Validate message length if no files
    if (selectedFiles.length === 0 && trimmedMessage.length < 3) {
      alert('Pesan terlalu pendek. Minimal 3 karakter.');
      return;
    }

    // Prepare final message content
    let userMessageContent = trimmedMessage;
    if (!userMessageContent && selectedFiles.length > 0) {
      userMessageContent = "Tolong analisis file yang saya kirimkan.";
    }
    
    // Final validation: ensure we have meaningful content
    if (!userMessageContent || userMessageContent.length < 3) {
      alert('Pesan tidak valid. Harap masukkan pertanyaan yang jelas.');
      return;
    }
    
    // Clear input and reset height immediately
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.blur();
    }

    // Check if any file is large (> 5MB) for progress indication
    const hasLargeFile = selectedFiles.some(file => file.size > 5 * 1024 * 1024);
    if (hasLargeFile) {
      setShowProgress(true);
      setProgress({ status: 'uploading', percent: 10 });
    }

    // Log file sizes if files are selected
    if (selectedFiles.length > 0) {
      console.log('Uploading files:');
      selectedFiles.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      });
    }

    try {
      // Prepare FormData for streaming
      const formData = new FormData();
      formData.append('message', userMessageContent);
      
      // Add files to FormData if any
      if (selectedFiles.length > 0) {
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });
      }

      // Debug FormData sebelum send
      console.log('📤 Sending FormData from UI:', {
        message: userMessageContent.substring(0, 100) + (userMessageContent.length > 100 ? '...' : ''),
        message_length: userMessageContent.length,
        files_count: selectedFiles.length,
        has_files: selectedFiles.length > 0
      });

      // Use streaming handler
      await handleStreamResponse(formData);
      
      // Reset selected files after successful send
      setSelectedFiles([]);
      setShowProgress(false);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Reset files on error too
      setSelectedFiles([]);
      setShowProgress(false);
    } finally {
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
        clearStreamingChatHistory();
        initializeStreamingSession();
        console.log('Session reinitialized with fresh session_id but same user_id');
        
        // Clear messages using store
        const { setMessages } = usePlaygroundStore.getState();
        setMessages([]);
        setSelectedFiles([]);
        setShowProgress(false);
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
            onClick={() => setShowStorageInfo(!showStorageInfo)}
            className="text-gray-500"
            title="Storage Info"
          >
            <Database className="h-5 w-5" />
          </Button>
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
      
      {showStorageInfo && <StorageStatsDisplay />}
      
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
                <p className="mt-2 text-xs">
                  💡 Tip: Gunakan tombol database untuk melihat penggunaan storage dan membersihkan data lama.
                </p>
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
        data-chat-container="true"
      >
        <DotBackground>
          <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-6">
            {/* Welcome Message - Bold WASSIDIK AI in center */}
            {messages.length === 0 && (
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
            {messages.length === 0 && (
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

            {/* Progress Bar */}
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
            {messages.map((message, index) => {
              // Check if this is an agent message that is currently streaming
              // A message is streaming if it's the last agent message and either:
              // 1. Content is empty/very short AND isLoading is true, OR
              // 2. It's the last message and streaming status indicates active processing
              const isLastMessage = index === messages.length - 1;
              const hasMinimalContent = !message.content || message.content.trim().length < 50;
              const isStreamingMessage = message.role === 'agent' && 
                                       isLastMessage && 
                                       isLoading &&
                                       (hasMinimalContent || 
                                        streamingStatus.isThinking || 
                                        streamingStatus.isCallingTool || 
                                        streamingStatus.isUpdatingMemory);
              
                             return (message.content || isStreamingMessage) && (
                <div
                  key={message.id}
                  className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div className={cn("flex gap-4", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    {message.role === 'agent' && (
                      <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <img src="/img/wassidik.svg" alt="Wassidik AI" className="h-5 w-5" />
                      </div>
                    )}
                    <div className={cn("max-w-[80%]", message.role === 'user' ? "order-first" : "")}>
                      <div
                        className={cn(
                          "px-4 py-3 rounded-xl break-words",
                          message.role === 'user'
                            ? 'bg-purple-600 text-white ml-auto'
                            : 'bg-white border border-gray-200 text-gray-900'
                        )}
                      >
                        {message.role === 'agent' ? (
                          <div className="relative group">
                            {/* Streaming Status for this specific message */}
                            {isStreamingMessage && (
                              <div className="mb-3">
                                <StreamingStatus 
                                  isStreaming={true} 
                                  currentStatus={streamingStatus} 
                                />
                              </div>
                            )}
                            
                            {message.content ? (
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
                            ) : (
                              // Placeholder for empty streaming message
                              <div className="text-gray-400 text-sm italic">
                                Sedang memproses...
                              </div>
                            )}
                            {message.content && (
                              <div className="flex justify-end mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-3"
                                  onClick={() => handleCopy(message.content, message.id || '')}
                                >
                                  {copied === message.id ? (
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                  <span className="ml-2 text-xs">{copied === message.id ? "Disalin" : "Salin"}</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 px-1">
                        {message.created_at ? new Date(message.created_at * 1000).toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : ''}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-sm font-medium">U</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}


            
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
              data-chat-input="true"
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