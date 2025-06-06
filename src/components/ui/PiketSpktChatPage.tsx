import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, X, ChevronDown, FileText, MessageSquare, Paperclip, File, XIcon, Printer, Download } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { AnimatedBotIcon } from './animated-bot-icon';
import { SkeletonMessage } from '@/components/chat/SkeletonMessage';
import ReactMarkdown from 'react-markdown';
import { analysisMarkdownConfig } from '@/utils/markdownFormatter';
import { printDocument, downloadDocument } from '@/utils/documentExport';

import { sendChatMessage, clearChatHistory, initializeSession } from '@/services/piketSpktService';
import { sendAnalysisChatMessage, clearAnalysisChatHistory, initializeAnalysisSession } from '@/services/piketSpktAnalysisService';
import { generateReportFromChronology } from '@/services/spkt/laporanInformasiService';
import type { LaporanInformasiData } from '@/types/spktTypes';
import LaporanInformasiDisplay from '@/components/spkt/LaporanInformasiDisplay';

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
  const [laporanInformasiData, setLaporanInformasiData] = useState<LaporanInformasiData | null>(null);
  const [hasNewDocument, setHasNewDocument] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'general'>('analysis');
  const [activeGeneralTool, setActiveGeneralTool] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress] = useState<{status: string, percent: number}>({
    status: 'preparing',
    percent: 0
  });
  const [showProgress, setShowProgress] = useState(false);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  
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
  }, [activeTab, messages.length]);

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
    
    // Clear document content and laporan informasi when switching tabs
    setDocumentContent('');
    setLaporanInformasiData(null);
    setActiveGeneralTool(null);
    setHasNewDocument(false);
  }, [activeTab]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (!userScrolled || messages.length <= 2) {
      scrollToBottom();
    }
  }, [messages, userScrolled, messages.length]);

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
    if (activeTab === 'analysis') {
      return selectedFiles.length > 0 || inputMessage.trim();
    } else {
      // General tab - only show input if laporan informasi is selected
      if (activeGeneralTool === 'laporanInformasi') {
        return inputMessage.trim(); // Only text input for laporan informasi
      } else {
        return false; // No input allowed until tool is selected
      }
    }
  }, [activeTab, activeGeneralTool, inputMessage, selectedFiles]);

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
        
      } else if (activeGeneralTool === 'laporanInformasi') {
        // Generate laporan informasi
        const laporanData = await generateReportFromChronology(userMessage.content);
        
        // Update laporan informasi data
        setLaporanInformasiData(laporanData);
        setHasNewDocument(true);
        
        // Add confirmation message to chat
        const botMessage: Message = {
          content: `✅ Laporan Informasi telah dibuat dan ditampilkan di area dokumen ${isDesktopRef.current ? '(panel kiri)' : '(tekan tombol dokumen)'}`,
          type: 'bot',
          timestamp: new Date(),
          isAnimating: true
        };

        setMessages(prev => [...prev, botMessage]);
        
        // Mark task as completed but keep the tool for task context
        setIsTaskCompleted(true);
        
      } else {
        // General chat: support file upload
        response = await sendChatMessage(
          userMessage.content, 
          selectedFiles.length > 0 ? selectedFiles : undefined
        );

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
      }
        
      // Reset selected files for both tabs
      setSelectedFiles([]);
      setShowProgress(false);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const getErrorMessage = (error: Error | { message?: string } | unknown): string => {
        if (!navigator.onLine) {
          return 'Perangkat Anda sedang offline. Silakan periksa koneksi internet dan coba lagi.';
        }
        
        // Check if error is an object with a message property
        const errorWithMessage = error as { message?: string };
        
        if (errorWithMessage && typeof errorWithMessage.message === 'string') {
          const errorMsg = errorWithMessage.message;
          
          if (errorMsg.includes('File terlalu besar')) {
            return 'File terlalu besar. Harap gunakan file dengan ukuran lebih kecil (maksimal 50MB).';
          }
          
          if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
            return 'Permintaan timeout. File mungkin terlalu besar atau koneksi terlalu lambat.';
          }
          
          if (errorMsg.includes('Terlalu banyak permintaan')) {
            return 'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu beberapa saat dan coba lagi.';
          }
          
          return errorMsg;
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

  const exampleQuestions = [
    "Kemarin pukul 14.00 terjadi kecelakaan lalu lintas di Jl. Sudirman antara motor dan mobil, korban mengalami luka ringan",
    "Pagi ini ada laporan pencurian HP di warnet, pelaku remaja berusia sekitar 17 tahun kabur setelah mengambil HP korban",
    "Malam ini terjadi perkelahian antar warga di RT 05, dipicu masalah batas tanah, ada 3 orang terluka",
    "Analisis dokumen laporan polisi yang saya upload",
    "Tolong analisis foto TKP dan kronologi kejadian yang saya lampirkan"
  ];

  // Komponen reusable untuk rendering markdown analisis menggunakan konfigurasi dari markdownFormatter.ts
  const AnalysisMarkdown: React.FC<{ content: string }> = ({ content }) => (
    <div className={analysisMarkdownConfig.containerClassName}>
      <ReactMarkdown
        remarkPlugins={analysisMarkdownConfig.remarkPlugins}
        className={analysisMarkdownConfig.className}
        components={{
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2 border-b-2 border-blue-200 pb-2 mt-8 first:mt-0" {...props}>
              {children}
            </h1>
          ),
          a: ({ children, ...props }) => (
            <a className="text-blue-600 hover:text-blue-800 underline font-medium" target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          ),
          p: ({ children, ...props }) => (
            <p className="text-gray-700 leading-relaxed mb-4" {...props}>
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="text-gray-900 font-semibold" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="text-gray-600 italic" {...props}>
              {children}
            </em>
          ),
          hr: ({ children, ...props }) => (
            <hr className="border-blue-200 my-8" {...props} />
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
          {(documentContent || laporanInformasiData) && (
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
                onClick={() => printDocument(documentContent, laporanInformasiData)}
                className="text-gray-600 hover:text-blue-600"
              >
                <Printer className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadDocument(documentContent, laporanInformasiData)}
                className="text-gray-600 hover:text-blue-600"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Document Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Document Display */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 min-h-[600px]">
              {laporanInformasiData ? (
                <LaporanInformasiDisplay data={laporanInformasiData} />
              ) : documentContent ? (
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
                      Agen SPKT tidak dibekali dengan Knowledge Base, Hanya untuk analisis dasar dan sebagai referensi penerimaan awal laporan.
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
              <h2 className="text-lg font-semibold text-gray-900">Piket SPKT</h2>
            </div>
            <div className="flex items-center space-x-2">
            {/* Mobile Document View Button */}
            {(documentContent || laporanInformasiData) && (
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
              📊 Analisis Kronologi
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
              💬 Otomatisasi
            </button>
          </div>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="bg-blue-50 border-b border-blue-200 p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Piket SPKT</h3>
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
          {/* Show welcome screen only when no messages (excluding empty welcome message) and no task completed */}
          {messages.length === 1 && messages[0].content === '' && !isTaskCompleted && !isProcessing ? (
            // Welcome screen
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {activeTab === 'analysis' 
                    ? 'Analisis Kasus SPKT' 
                    : 'Otomatisasi Tugas'
                  }
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  {activeTab === 'analysis'
                    ? 'Silahkan masukkan kronologis singkat kejadian atau upload dokumen untuk dilakukan analisis awal'
                    : 'Penggunaan Ai untuk membantu tugas administrasi dan pelayanan SPKT Anda'
                  }
                </p>
              </div>
              
              {/* Tool Selection for General Tab */}
              {activeTab === 'general' && !activeGeneralTool && (
                <div className="w-full max-w-md space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-3">Pilih jenis bantuan:</p>
                  <button
                    onClick={() => setActiveGeneralTool('laporanInformasi')}
                    className="w-full text-left p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                  >
                    <div className="font-medium text-blue-900">📄 Laporan Informasi</div>
                    <div className="text-sm text-blue-700 mt-1">Generate laporan informasi dari kronologi kejadian</div>
                  </button>
                </div>
              )}

              {/* Example Questions for Analysis Tab */}
              {activeTab === 'analysis' && (
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
              )}

              {/* Laporan Informasi Input */}
              {activeTab === 'general' && activeGeneralTool === 'laporanInformasi' && (
                <div className="w-full max-w-md space-y-4">
                  <div className="text-left">
                    <button
                      onClick={() => setActiveGeneralTool(null)}
                      className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center"
                    >
                      ← Kembali ke menu utama
                    </button>
                    <h4 className="font-medium text-gray-900 mb-2">Laporan Informasi</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Masukkan kronologi kejadian untuk dibuat menjadi laporan informasi resmi.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : isTaskCompleted && activeTab === 'general' ? (
            // Task Completion UI
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Tugas Selesai
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Laporan Informasi telah berhasil dibuat dan tersedia di panel dokumen.
                </p>
                <Button
                  onClick={() => {
                    setActiveGeneralTool(null);
                    setIsTaskCompleted(false);
                    // Reset messages to just the welcome message
                    setMessages([
                      {
                        content: '',
                        type: 'bot',
                        timestamp: new Date(),
                      },
                    ]);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
                >
                  Kembali ke Daftar Tugas
                </Button>
              </div>
            </div>
          ) : (
            // Chat messages container
            <div className="space-y-4">
              {/* Chat messages - skip the first empty welcome message */}
              {messages.slice(1).map((message, index) => (
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
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Processing indicator - separate from messages */}
              {isProcessing && (
                <div className="flex items-start space-x-3">
                  <SkeletonMessage fullWidth={true} />
                </div>
              )}
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

        {/* Input Area - Only show for Analysis tab or when Laporan Informasi is selected in General tab */}
        {(activeTab === 'analysis' || (activeTab === 'general' && activeGeneralTool === 'laporanInformasi')) && (
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
                  : "Masukkan kronologi kejadian untuk dibuat laporan informasi..."
                }
                className={cn(
                  "py-3 min-h-[50px] max-h-[200px] resize-none pr-20",
                  activeTab === 'general' && activeGeneralTool === 'laporanInformasi' 
                    ? "pl-4" // No file upload button for laporan informasi
                    : "pl-12" // With file upload button for analysis
                )}
                disabled={isProcessing}
              />
              
              {/* File Upload Button - Only for Analysis tab */}
              {activeTab === 'analysis' && (
                <button
                  type="button"
                  onClick={handleOpenFileDialog}
                  disabled={isProcessing}
                  className="absolute left-2 bottom-3 p-2 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors z-20"
                  aria-label="Upload file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              )}

              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.html,.css,.md,.xml,.rtf,.js,.py"
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
        )}
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
                      onClick={() => printDocument(documentContent, laporanInformasiData)}
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
              {laporanInformasiData ? (
                <LaporanInformasiDisplay data={laporanInformasiData} />
              ) : documentContent ? (
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