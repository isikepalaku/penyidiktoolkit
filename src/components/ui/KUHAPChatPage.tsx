import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, RefreshCw, Paperclip, File, XIcon, AlertCircle, Database, Trash2 } from 'lucide-react';
import { Button } from './button';
import { DotBackground } from './DotBackground';
import { formatMessage } from '@/utils/markdownFormatter';
import { usePlaygroundStore } from '@/stores/PlaygroundStore';
import StreamingStatus from '@/hooks/streaming/StreamingStatus';
import useAIChatStreamHandler from '@/hooks/playground/useAIChatStreamHandler';
import { 
  clearStreamingChatHistory,
  initializeStreamingSession
} from '@/services/kuhapService';
import { getStorageStats, forceCleanup } from '@/stores/PlaygroundStore';
import { 
  getUserMessageClasses, 
  getAgentMessageClasses, 
  getProseClasses 
} from '@/styles/chatStyles';

// Constants for KUHAP
const KUHAP_EXAMPLE_QUESTIONS = [
  "Jelaskan tentang proses penyidikan dalam KUHAP",
  "Apa saja hak tersangka dalam proses hukum acara pidana?",
  "Bagaimana prosedur penangkapan menurut KUHAP?",
  "Kapan seorang tersangka dapat mengajukan praperadilan?"
];

// Supported file types - limited to TXT, PDF, and Images only
const ACCEPTED_FILE_TYPES = ".pdf,.txt,.png,.jpg,.jpeg,.webp";

// File size limit (20MB for Gemini API)
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

// Supported MIME types for validation - limited to TXT, PDF, and Images only
const SUPPORTED_MIME_TYPES = [
  // Document formats
  'application/pdf',
  'text/plain',
  // Image formats
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

interface KUHAPChatPageProps {
  onBack?: () => void;
}

// File validation utilities
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File "${file.name}" terlalu besar (${sizeMB}MB). Maksimal ukuran file adalah 20MB.`
    };
  }

  // Check MIME type
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    // Check by file extension as fallback for mobile compatibility
    const extension = file.name.toLowerCase().split('.').pop();
    const extensionMimeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp'
    };

    if (!extension || !extensionMimeMap[extension]) {
      return {
        isValid: false,
        error: `Format file "${file.name}" tidak didukung. Format yang didukung: PDF, TXT, PNG, JPG, JPEG, WEBP.`
      };
    }
  }

  return { isValid: true };
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const KUHAPChatPage: React.FC<KUHAPChatPageProps> = ({ onBack }) => {
  // Use modern streaming hooks and store
  const { 
    messages, 
    isStreaming: isLoading, 
    streamingStatus, 
    currentChunk, 
    setMessages, 
    resetStreamingStatus 
  } = usePlaygroundStore();
  
  // Use modern streaming handler
  const { handleStreamResponse } = useAIChatStreamHandler();
  
  // Component state with storage stats tracking
  const [inputMessage, setInputMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileValidationErrors, setFileValidationErrors] = useState<string[]>([]);
  const [storageStatsKey, setStorageStatsKey] = useState(0); // For forcing storage stats refresh
  const [isCleaningStorage, setIsCleaningStorage] = useState(false); // Loading state for cleanup
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingStatusRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSessionInitialized = useRef<boolean>(false);

  // Effect untuk inisialisasi session sekali saat komponen di-mount
  useEffect(() => {
    if (isSessionInitialized.current) {
      console.log('KUHAP session already initialized, skipping');
      return;
    }

    try {
      // Clear any existing messages from other agents untuk proper isolation
      setMessages([]);
      resetStreamingStatus();
      console.log('🧹 KUHAP: Cleared existing messages from store');
      
      // Initialize KUHAP session
      initializeStreamingSession();
      isSessionInitialized.current = true;
      console.log('KUHAP session initialized successfully');
    } catch (error) {
      console.error('Error initializing KUHAP session:', error);
    }
  }, [setMessages, resetStreamingStatus]);

  // Auto-focus management for better UX
  useEffect(() => {
    const isAnyStreamingActive = streamingStatus.isThinking || 
                                streamingStatus.isCallingTool || 
                                streamingStatus.isAccessingKnowledge || 
                                streamingStatus.isMemoryUpdateStarted;

    if (isLoading && isAnyStreamingActive) {
      // Focus on streaming status area when streaming is active
      const timer = setTimeout(() => {
        if (streamingStatusRef.current) {
          streamingStatusRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          console.log('🎯 Auto-focus: Scrolled to streaming status area');
        }
      }, 800);
      
      return () => clearTimeout(timer);
    } else if (!isLoading && streamingStatus.hasCompleted) {
      // Return focus to input area when completed
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          });
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }, 300);
          console.log('🎯 Auto-focus: Returned focus to input area after completion');
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [
    isLoading, 
    streamingStatus.isThinking, 
    streamingStatus.isCallingTool, 
    streamingStatus.isAccessingKnowledge, 
    streamingStatus.isMemoryUpdateStarted, 
    streamingStatus.hasCompleted
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputMessage(newValue);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleStorageCleanup = async () => {
    // Show confirmation dialog
    if (!window.confirm('Apakah Anda yakin ingin membersihkan data lama? Data yang sudah dihapus tidak bisa dikembalikan.')) {
      return;
    }

    try {
      console.log('🧹 Starting manual storage cleanup...');
      
      // Get stats before cleanup
      const beforeStats = getStorageStats();
      console.log('📊 Storage before cleanup:', beforeStats);
      
      // Perform cleanup
      setIsCleaningStorage(true);
      const afterStats = await forceCleanup();
      
      // Log results
      console.log('📊 Storage after cleanup:', afterStats);
      
      // Force refresh storage stats display
      setStorageStatsKey(prev => prev + 1);
      
      // Show success message with details
      const sessionsCleaned = beforeStats.sessionCount - afterStats.sessionCount;
      alert(`✅ Cleanup berhasil!\n\nStorage sebelum: ${beforeStats.usage}\nStorage sesudah: ${afterStats.usage}\nSesi dihapus: ${sessionsCleaned}\nPersentase storage: ${afterStats.percentage}%`);
      
    } catch (error) {
      console.error('❌ Error during storage cleanup:', error);
      alert('❌ Terjadi error saat membersihkan storage. Silakan coba lagi.');
    } finally {
      setIsCleaningStorage(false);
    }
  };

  const handleCopy = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(messageId);
      setTimeout(() => setCopied(null), 2000);
    }).catch((err) => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const errors: string[] = [];
    const validFiles: File[] = [];

    // Validate each file
    files.forEach((file, index) => {
      console.log(`📄 File ${index + 1}: ${file.name} (${formatFileSize(file.size)}, ${file.type})`);
      
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    // Update error state
    setFileValidationErrors(errors);

    // If we have valid files, process them
    if (validFiles.length > 0) {
      // Create new DataTransfer with only valid files
      const dataTransfer = new DataTransfer();
      validFiles.forEach(file => dataTransfer.items.add(file));
      
      // Update input with valid files only
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
      }
      
      // Add valid files to state
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
    
    // Clear input value to allow re-selection
    e.target.value = '';
    
    // Auto-clear errors after 5 seconds
    if (errors.length > 0) {
      setTimeout(() => {
        setFileValidationErrors([]);
      }, 5000);
    }
  };

  // Storage stats component
  const StorageStatsDisplay = () => {
    // Force re-calculation when storageStatsKey changes
    const storageStats = getStorageStats();
    
    return (
      <div className="bg-sky-50 border-l-4 border-sky-500 p-4 m-4 shadow-sm rounded-md" key={storageStatsKey}>
        <div className="flex">
          <Database className="h-5 w-5 text-sky-500" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-sky-800">Statistik Penyimpanan</h3>
            <div className="mt-2 text-sm text-sky-700 space-y-2">
              <div className="flex justify-between">
                <span>Penggunaan Storage:</span>
                <span className="font-medium">{storageStats.usage} / {storageStats.limit}</span>
              </div>
              <div className="flex justify-between">
                <span>Sesi Tersimpan:</span>
                <span className="font-medium">{storageStats.sessionCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Persentase:</span>
                <span className="font-medium">{storageStats.percentage}%</span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    storageStats.percentage > 80 ? 'bg-red-500' : 
                    storageStats.percentage > 60 ? 'bg-yellow-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                />
              </div>
              
              {storageStats.isNearLimit && (
                <div className="text-red-600 text-xs mt-2 font-medium">
                  ⚠️ Storage hampir penuh! Pertimbangkan untuk membersihkan data lama.
                </div>
              )}
            </div>
            
            <button 
              onClick={handleStorageCleanup}
              disabled={isCleaningStorage}
              className={`mt-3 inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                isCleaningStorage 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-sky-600 hover:text-sky-800'
              }`}
              title={isCleaningStorage ? "Sedang membersihkan..." : "Hapus data lama dan sesi yang tidak digunakan"}
            >
              {isCleaningStorage ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Membersihkan...
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3" />
                  Bersihkan Data Lama
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    // Simple validation with files or text
    const trimmedMessage = inputMessage.trim();
    
    if ((selectedFiles.length === 0 && !trimmedMessage) || isLoading) return;
    
    // Validate message length if message provided
    if (trimmedMessage && trimmedMessage.length < 3) {
      alert('Pesan terlalu pendek. Minimal 3 karakter.');
      return;
    }

    const userMessageContent = trimmedMessage || (selectedFiles.length > 0 ? "Analisis file berikut" : "");

    // Clear input and reset height immediately
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.blur();
    }

    try {
      // Log file sizes jika ada
      if (selectedFiles.length > 0) {
        console.log('📁 KUHAP: Uploading files:');
        selectedFiles.forEach((file, index) => {
          console.log(`File ${index + 1}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        });
      }

      // Use modern streaming handler with agent ID
      await handleStreamResponse(
        userMessageContent,
        selectedFiles.length > 0 ? selectedFiles : undefined,
        'kuhap-chat' // Agent ID for KUHAP
      );

      // Reset selected files setelah berhasil mengirim
      setSelectedFiles([]);
      setFileValidationErrors([]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Reset files on error
      setSelectedFiles([]);
    }
  };

  const handleChatReset = () => {
    if (!window.confirm('Apakah Anda yakin ingin mereset percakapan ini? Riwayat chat untuk sesi ini akan dihapus.')) {
      return;
    }

    try {
      // Panggil fungsi yang sudah diperbaiki untuk membersihkan history dan state
      clearStreamingChatHistory();
      
      // Inisialisasi sesi baru untuk memulai dari awal
      initializeStreamingSession();
      
      console.log('♻️ KUHAP: Chat reset completed and new session initialized.');
    } catch (error) {
      console.error('❌ Error resetting chat:', error);
      alert('❌ Terjadi error saat mereset chat. Silakan coba lagi.');
    }
  };

  const handleSelectQuestion = (question: string) => {
    setInputMessage(question);
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize for the selected question
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
      }, 0);
    }
  };

  return (
    <div className="fixed inset-0 z-20 bg-white lg:pl-64 flex flex-col">
      <DotBackground />
      
      {/* Header */}
      <header className="relative bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 bg-sky-100 rounded-full">
              <img 
                src="/img/krimsus.png"
                alt="KUHAP"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">KUHAP AI</h1>
              <p className="text-xs text-gray-500">Kitab Undang-Undang Hukum Acara Pidana</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleChatReset}
            className="text-gray-500"
            title="Reset Chat"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
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
            title={showInfo ? 'Tutup informasi' : 'Tampilkan informasi'}
          >
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Storage Info Panel */}
      {showStorageInfo && <StorageStatsDisplay />}

      {/* Info Panel */}
      {showInfo && (
        <div className="relative p-4 bg-gray-50 border-b border-gray-200 z-10">
          <div className="flex justify-between items-start">
            <h2 className="text-sm font-medium text-gray-800">Tentang KUHAP AI</h2>
            <button
              onClick={() => setShowInfo(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Tutup informasi"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-700">
            KUHAP AI adalah asisten berbasis kecerdasan buatan untuk membantu memahami Kitab Undang-Undang Hukum Acara Pidana (KUHAP). 
            Asisten ini dapat membantu menjawab pertanyaan umum dan memberikan informasi tentang prosedur peradilan pidana, hak-hak tersangka, proses penyidikan, dan ketentuan-ketentuan hukum acara pidana lainnya. 
            Informasi yang diberikan bersifat umum dan sebaiknya dikonfirmasi dengan sumber resmi atau konsultasi dengan ahli hukum yang berkualifikasi.
          </p>
        </div>
      )}

      {/* File Validation Errors */}
      {fileValidationErrors.length > 0 && (
        <div className="relative bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4 rounded-md z-10">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Validasi File</h3>
              <div className="mt-2 text-sm text-red-700 space-y-1">
                {fileValidationErrors.map((error, index) => (
                  <p key={index}>• {error}</p>
                ))}
              </div>
              <div className="mt-3 text-xs text-red-600">
                <p><strong>Format yang didukung:</strong> PDF, TXT, PNG, JPG, JPEG, WEBP</p>
                <p><strong>Ukuran maksimal:</strong> 20MB per file</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={chatContainerRef}
          className="h-full overflow-y-auto pb-32"
        >
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
              <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mb-4">
                <img 
                  src="/img/krimsus.png"
                  alt="KUHAP"
                  className="w-16 h-16 object-contain"
                />
              </div>
              <h1 className="text-4xl font-bold text-sky-600 mb-4">KUHAP AI</h1>
              <p className="text-gray-600 max-w-md mb-6">
                Asisten untuk membantu Anda dengan pertanyaan seputar Kitab Undang-Undang Hukum Acara Pidana.
              </p>
              
              {/* Example Questions */}
              <div className="w-full max-w-2xl">
                <p className="text-sm text-gray-500 mb-3">Contoh pertanyaan yang dapat Anda ajukan:</p>
                <div className="grid gap-2">
                  {KUHAP_EXAMPLE_QUESTIONS.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectQuestion(question)}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-left hover:bg-gray-100 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="space-y-6">
              {messages.map((message, index) => {
                // Check if this is an agent message that is currently streaming
                const isLastMessage = index === messages.length - 1;
                const hasMinimalContent = !message.content || message.content.trim().length < 50;
                const isStreamingMessage = message.role === 'agent' && 
                                         isLastMessage && 
                                         isLoading &&
                                         (hasMinimalContent || 
                                          streamingStatus.isThinking || 
                                          streamingStatus.isCallingTool || 
                                          streamingStatus.isAccessingKnowledge ||
                                          streamingStatus.isMemoryUpdateStarted);
                
                return (
                <div key={message.id || index} className="group">
                  {message.role === 'user' ? (
                    /* User Message */
                    <div className="flex justify-end">
                      <div className={getUserMessageClasses()}>
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                        
                        {/* File attachments display */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((file, fileIndex) => (
                              <div key={fileIndex} className="flex items-center gap-2 text-xs text-sky-700 bg-sky-50 rounded p-2">
                                <File className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                                <span className="text-sky-500">({formatFileSize(file.size)})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Agent Message */
                    <div className="flex justify-start">
                      <div className="flex gap-3 max-w-[85%]">
                        <div className="flex-shrink-0">
                          <div className="rounded-full flex items-center justify-center shadow-sm w-8 h-8" style={{ backgroundColor: '#f3f4f6' }}>
                            <img 
                              src="/img/krimsus.png"
                              alt="KUHAP"
                              className="w-6 h-6 object-contain"
                            />
                          </div>
                        </div>
                        
                        <div className={getAgentMessageClasses()}>
                          {/* Streaming Status for current message */}
                          {isStreamingMessage && (
                            <div ref={streamingStatusRef} className="mb-3" data-streaming-status="active">
                              <StreamingStatus 
                                isStreaming={isLoading}
                                streamingStatus={streamingStatus} 
                                compact={true}
                                currentChunk={currentChunk}
                                containerWidth="message"
                              />
                            </div>
                          )}
                          
                          {/* Message content */}
                          {message.content ? (
                            <div className={getProseClasses()}>
                              <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
                            </div>
                          ) : isStreamingMessage ? (
                            <p className="text-gray-500 italic text-sm">Sedang memproses...</p>
                          ) : null}
                          
                          {/* Copy button */}
                          {message.content && (
                            <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopy(message.content, message.id || index.toString())}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-md inline-flex items-center text-xs gap-1"
                                aria-label="Salin ke clipboard"
                              >
                                {copied === (message.id || index.toString()) ? (
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
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Input area with modern chatbot styling */}
      <div className="border-t border-gray-200 bg-white p-4 md:px-6 pb-safe">
        <div className="max-w-2xl mx-auto">
          {/* File preview area */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="text-xs text-gray-600 font-medium">
                File terpilih ({selectedFiles.length}):
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <File className="w-4 h-4 text-sky-600 flex-shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-sky-900 truncate">{file.name}</span>
                      <span className="text-xs text-sky-600">
                        {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="text-sky-400 hover:text-sky-600 flex-shrink-0"
                      aria-label="Hapus file"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modern input container with border and shadow */}
          <div className="relative flex w-full cursor-text flex-col rounded-xl border border-gray-300 px-4 py-3 duration-150 ease-in-out shadow-sm focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 bg-white">
            {/* File upload button inside input */}
            <button
              type="button"
              onClick={handleOpenFileDialog}
              disabled={isLoading}
              className="absolute left-3 bottom-3 p-2 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition-colors z-20"
              aria-label="Upload file"
            >
              <Paperclip className="w-4 h-4" />
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
            
            {/* Modern textarea without borders */}
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan Anda..."
              className="w-full border-0 bg-transparent pl-8 pr-12 py-1 text-sm placeholder:text-gray-500 focus:outline-none resize-none min-h-[40px] max-h-[200px] text-gray-800"
              disabled={isLoading}
              rows={2}
            />
            
            {/* Send button inside input container */}
            <button
              onClick={() => handleSendMessage()}
              disabled={(!inputMessage.trim() && selectedFiles.length === 0) || isLoading}
              className={`absolute right-3 bottom-3 p-2.5 rounded-lg flex items-center justify-center transition-colors ${
                (!inputMessage.trim() && selectedFiles.length === 0) || isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
              aria-label="Kirim pesan"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Help text and disclaimer */}
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500 text-center">
              Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
            </p>
            <p className="text-xs text-center text-gray-500">
              KUHAP AI memberikan informasi umum dan tidak bisa menggantikan nasihat hukum profesional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KUHAPChatPage; 