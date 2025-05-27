import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, X, ChevronDown, FileText, MessageSquare, Paperclip, File, XIcon, Printer } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { AnimatedBotIcon } from './animated-bot-icon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { sendChatMessage, clearChatHistory, initializeSession } from '@/services/piketSpktService';
import { sendAnalysisChatMessage, clearAnalysisChatHistory, initializeAnalysisSession } from '@/services/piketSpktAnalysisService';

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

// Progress bar component untuk file upload
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

// Skeleton component for loading state
const SkeletonMessage = () => (
  <div className="flex items-start space-x-3">
    <AnimatedBotIcon className="w-5 h-5 flex-shrink-0 mt-1" />
    <div className="flex-1 space-y-3 py-1">
      <p className="text-xs text-gray-500 italic mb-1">Sedang menyusun respons...</p>
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

interface PiketSpktChatPageProps {
  onBack?: () => void;
}

const PiketSpktChatPage: React.FC<PiketSpktChatPageProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isDocumentExpanded, setIsDocumentExpanded] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [hasNewDocument, setHasNewDocument] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'general'>('analysis');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress] = useState<{status: string, percent: number}>({
    status: 'preparing',
    percent: 0
  });
  const [showProgress, setShowProgress] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDesktopRef = useRef<boolean>(window.innerWidth >= 1024);

  // Fungsi untuk menyesuaikan tinggi textarea secara dinamis
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

  // Initialize session
  useEffect(() => {
    if (activeTab === 'analysis') {
      initializeAnalysisSession();
    } else {
      initializeSession();
    }
    
    // Set empty welcome message to trigger welcome UI
    setMessages([
      {
        content: '',
        type: 'bot',
        timestamp: new Date(),
      },
    ]);
    
    // Focus textarea after component mounts
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        adjustTextareaHeight(textareaRef.current);
      }
    }, 500);
    
    // Check if we're on desktop
    const handleResize = () => {
      isDesktopRef.current = window.innerWidth >= 1024;
    };
    
    window.addEventListener('resize', handleResize);
    
    // Set up scroll detection
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
      if (activeTab === 'analysis') {
        clearAnalysisChatHistory();
      } else {
        clearChatHistory();
      }
      window.removeEventListener('resize', handleResize);
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [activeTab]);

  // Handle tab change - reset messages and initialize appropriate session
  useEffect(() => {
    // Reset messages when tab changes
    setMessages([
      {
        content: '',
        type: 'bot',
        timestamp: new Date(),
      },
    ]);
    
    // Clear document content when switching tabs
    setDocumentContent('');
    setHasNewDocument(false);
  }, [activeTab]);

  // Scroll to bottom when messages change
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    adjustTextareaHeight(e.target);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && isDesktopRef.current) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // File handling functions
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

  // Check if input is valid based on active tab
  const hasValidInput = useMemo(() => {
    // Both tabs now support file upload with Gemini API
    return selectedFiles.length > 0 || inputMessage.trim();
  }, [inputMessage, selectedFiles]);

  const handleSubmit = async () => {
    if (!hasValidInput || isProcessing) return;

    const userMessage: Message = {
      content: inputMessage.trim() || (selectedFiles.length > 0 ? "Tolong analisis file yang saya kirimkan." : ""),
      type: 'user',
      timestamp: new Date()
    };

    setUserScrolled(false);
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    // Check if any file is large (> 5MB)
    const hasLargeFile = selectedFiles.some(file => file.size > 5 * 1024 * 1024);
    if (hasLargeFile) {
      setShowProgress(true);
    }

    // Log file sizes
    if (selectedFiles.length > 0) {
      console.log('Uploading files:');
      selectedFiles.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      });
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      let response: string;
      
      if (activeTab === 'analysis') {
        // Analysis tab: no file upload, only text
        response = await sendAnalysisChatMessage(userMessage.content);
      } else {
        // General tab: support file upload
        response = await sendChatMessage(
          userMessage.content, 
          selectedFiles.length > 0 ? selectedFiles : undefined
        );
      }

      // Update document content with the latest response
      setDocumentContent(response);
      setHasNewDocument(true);
      
            // Add a simple confirmation message to chat instead of full response
      const botMessage: Message = {
        content: `✅ Respons telah ditampilkan di area dokumen ${isDesktopRef.current ? '(panel kiri)' : '(tekan tombol dokumen)'}`,
        type: 'bot',
        timestamp: new Date(),
        isAnimating: true
      };

        setMessages(prev => [...prev, botMessage]);
        
        // Reset selected files for both tabs
      setSelectedFiles([]);
      setShowProgress(false);

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
        
        return 'Permintaan Terlalu banyak, coba lagi dalam 2 menit. (dengan bertumbuhnya pengguna, saat ini kami membatasi permintaan untuk menjaga kualitas layanan)';
      };

      const errorMessage: Message = {
        content: getErrorMessage(error),
        type: 'bot',
        timestamp: new Date(),
        error: true,
        isRateLimit: (error as Error)?.message?.includes('Terlalu banyak permintaan') || (error as Error)?.message?.includes('Rate limit')
      };

      setMessages(prev => [...prev, errorMessage]);
      setSelectedFiles([]);
      setShowProgress(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(content);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  const handleExampleClick = (question: string) => {
    setInputMessage(question);
    if (textareaRef.current) {
      textareaRef.current.focus();
      adjustTextareaHeight(textareaRef.current);
    }
  };

  const getExampleQuestions = () => {
    if (activeTab === 'analysis') {
      return [
        "Kemarin pukul 14.00 terjadi kecelakaan lalu lintas di Jl. Sudirman antara motor dan mobil, korban mengalami luka ringan",
        "Pagi ini ada laporan pencurian HP di warnet, pelaku remaja berusia sekitar 17 tahun kabur setelah mengambil HP korban",
        "Malam ini terjadi perkelahian antar warga di RT 05, dipicu masalah batas tanah, ada 3 orang terluka",
        "Analisis dokumen laporan polisi yang saya upload",
        "Tolong analisis foto TKP dan kronologi kejadian yang saya lampirkan"
      ];
    } else {
      return [
        "Bagaimana cara membuat laporan polisi yang benar?",
        "Apa saja dokumen yang diperlukan untuk pelayanan SIM?",
        "Bagaimana prosedur penanganan pengaduan masyarakat?",
        "Template surat keterangan kehilangan",
        "SOP pelayanan SPKT untuk kasus kecelakaan lalu lintas"
      ];
    }
  };

  const exampleQuestions = getExampleQuestions();

  // Komponen reusable untuk rendering markdown analisis
  const AnalysisMarkdown: React.FC<{ content: string }> = ({ content }) => (
    <div className="max-w-none break-words text-gray-800 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        className="prose prose-lg max-w-none
          prose-headings:text-blue-800 prose-headings:font-bold prose-headings:border-b-2 prose-headings:border-blue-200 prose-headings:pb-2
          prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
          prose-strong:text-gray-900 prose-strong:font-semibold
          prose-em:text-gray-600 prose-em:italic
          prose-a:text-blue-600 prose-a:hover:text-blue-800 prose-a:underline
          prose-ul:text-gray-700 prose-ol:text-gray-700
          prose-li:mb-2 prose-li:leading-relaxed
          prose-hr:border-blue-200 prose-hr:my-8"
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2 border-b-2 border-blue-200 pb-2 mt-8 first:mt-0">
              {children}
            </h1>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              {children}
            </a>
          ),
          p: ({ children }) => (
            <p className="text-gray-700 leading-relaxed mb-4">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="text-gray-900 font-semibold">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-gray-600 italic">
              {children}
            </em>
          ),
          hr: () => (
            <hr className="border-blue-200 my-8" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Document Area - Left Panel (Desktop Only) */}
      <div className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 flex-col",
        "hidden lg:flex lg:w-3/5"
      )}>
        {/* Document Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Area Dokumen</h2>
          </div>
          {documentContent && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(documentContent)}
                className="text-gray-600 hover:text-blue-600"
              >
                {copied === documentContent ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.print()}
                className="text-gray-600 hover:text-blue-600"
              >
                <Printer className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Document Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Document Display */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 min-h-[600px]">
              {documentContent ? (
                <AnalysisMarkdown content={documentContent} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Area Dokumen
                    </h3>
                    <p className="text-gray-600 max-w-md">
                      Hasil respons dari Piket SPKT AI akan ditampilkan di sini dalam format dokumen yang mudah dibaca dan dapat dicetak.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area - Right Panel (Desktop) / Full Screen (Mobile) */}
      <div className="flex flex-col w-full lg:w-2/5 bg-white">
        {/* Chat Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Piket SPKT AI</h2>
            </div>
            <div className="flex items-center space-x-2">
            {/* Mobile Document View Button */}
            {documentContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsDocumentExpanded(!isDocumentExpanded);
                  setHasNewDocument(false);
                }}
                className={cn(
                  "lg:hidden relative",
                  hasNewDocument && "animate-pulse"
                )}
              >
                <FileText className="w-4 h-4" />
                {hasNewDocument && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('analysis')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === 'analysis'
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              📊 Analisis SPKT
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === 'general'
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              💬 Chat Umum
            </button>
          </div>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="bg-blue-50 border-b border-blue-200 p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Piket SPKT AI Assistant</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Asisten digital untuk petugas piket SPKT yang membantu dalam administrasi, dokumentasi, dan pelayanan masyarakat.
                </p>
                <div className="text-xs text-blue-700">
                  <p className="mb-1">• Bantuan penyusunan laporan dan dokumen</p>
                  <p className="mb-1">• Panduan SOP dan prosedur</p>
                  <p className="mb-1">• Template dokumen resmi</p>
                  <p>• Informasi regulasi kepolisian</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfo(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 1 && messages[0].content === '' ? (
            // Welcome screen
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {activeTab === 'analysis' 
                    ? 'Analisis Kasus SPKT' 
                    : 'Selamat datang di Piket SPKT AI'
                  }
                </h3>
                                    <p className="text-gray-600 mb-6 max-w-md">
                      {activeTab === 'analysis'
                        ? 'Silahkan masukkan kronologis singkat kejadian atau upload dokumen untuk dilakukan analisis awal'
                        : 'Asisten digital untuk membantu tugas administrasi dan pelayanan SPKT Anda'
                      }
                    </p>
              </div>
              
              {/* Example Questions */}
              <div className="w-full max-w-md space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-3">Contoh pertanyaan:</p>
                {exampleQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(question)}
                    className="w-full text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Chat messages
            messages.slice(1).map((message, index) => (
              <div key={index} className="chat-message">
                {message.type === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[85%] lg:max-w-[75%] break-words">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-3">
                    <AnimatedBotIcon className="w-5 h-5 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      {isProcessing && index === messages.slice(1).length - 1 ? (
                        <SkeletonMessage />
                      ) : (
                        <div className="space-y-2">
                          <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-700">
                            {message.content}
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs text-gray-400">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-start space-x-3">
              <SkeletonMessage />
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mx-4 mb-2">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
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
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <div className="absolute bottom-24 right-8">
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToBottom}
              className="rounded-full shadow-lg"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
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
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={activeTab === 'analysis' 
                ? "Masukkan kronologis singkat kejadian untuk analisis awal (dapat disertai file dokumen)..."
                : "Tanyakan tentang administrasi SPKT, SOP, atau minta bantuan dokumentasi..."
              }
              className="py-3 min-h-[50px] max-h-[200px] resize-none pr-20 pl-12"
              disabled={isProcessing}
            />
            
            {/* File Upload Button - Available for Both Tabs */}
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
              onClick={handleSubmit}
              disabled={isProcessing || !hasValidInput}
              className="absolute right-2 bottom-2 p-2 h-8 w-8"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            {isDesktopRef.current ? 'Tekan Enter untuk kirim, Shift+Enter untuk baris baru' : 'Ketuk tombol kirim untuk mengirim pesan'}
          </p>
        </div>
      </div>

      {/* Mobile Document Modal */}
      {isDocumentExpanded && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full h-full max-w-4xl max-h-full flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Dokumen</h2>
              </div>
              <div className="flex items-center space-x-2">
                {documentContent && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(documentContent)}
                      className="text-gray-600 hover:text-blue-600"
                    >
                      {copied === documentContent ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.print()}
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDocumentExpanded(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {documentContent ? (
                <AnalysisMarkdown content={documentContent} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Belum Ada Dokumen
                    </h3>
                    <p className="text-gray-600 max-w-md">
                      Mulai chat dengan AI untuk melihat hasil dalam format dokumen.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PiketSpktChatPage; 