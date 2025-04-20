import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, BookOpen, Info, X } from 'lucide-react';
import { cn } from '@/utils/utils';
import { AnimatedBotIcon } from './animated-bot-icon';
import { DotBackground } from './DotBackground';
import { sendChatMessage, clearChatHistory, initializeSession } from '@/services/kuhapService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Textarea } from './textarea';
import { Button } from './button';

// Konfigurasi marked dan DOMPurify untuk safe link handling
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

// Skeleton component for loading state - using AnimatedBotIcon, text, and pulse
const SkeletonMessage = () => (
  <div className="flex items-start space-x-3 w-full">
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

interface KUHAPChatPageProps {
  onBack?: () => void;
}

const KUHAPChatPage: React.FC<KUHAPChatPageProps> = ({ onBack }) => {
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
    
    // Add welcome message
    setMessages([
      {
        content: '',
        type: 'bot',
        timestamp: new Date()
      }
    ]);
    
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
          behavior: 'smooth'
        });
      }
    });
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
      setMessages(prev => [
        ...prev,
        {
          content: '', // Gunakan content kosong untuk skeleton
          type: 'bot',
          timestamp: new Date(),
          isAnimating: true
        }
      ]);
      
      // Send message to API
      const response = await sendChatMessage(userMessage.content);
      
      // Replace the placeholder with the actual response
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Remove the placeholder
        
        return [
          ...newMessages,
          {
            content: response.text,
            type: 'bot',
            timestamp: new Date(),
            sourceDocuments: response.sourceDocuments,
            error: !!response.error,
            isAnimating: false
          }
        ];
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove placeholder message and add error message
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Remove placeholder
        
        return [
          ...newMessages,
          {
            content: 'Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.',
            type: 'bot',
            timestamp: new Date(),
            error: true,
            isAnimating: false
          }
        ];
      });
    } finally {
      setIsProcessing(false);
      
      // Focus textarea after sending message
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

  const formatMessage = (content: string) => {
    try {
      // Pastikan content ada dan bukan string kosong
      if (!content) return { __html: '' };
      
      // Parse markdown menjadi HTML
      const rawHtml = marked.parse(content);
      
      // Sanitasi HTML untuk mencegah XSS
      const sanitizedHtml = DOMPurify.sanitize(rawHtml);
      
      return { __html: sanitizedHtml };
    } catch (error) {
      console.error('Error formatting message:', error);
      return { __html: content };
    }
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
    "Apa yang dimaksud dengan upaya paksa dalam KUHAP?",
    "Bagaimana prosedur penahanan menurut KUHAP?",
    "Apa hak-hak tersangka menurut KUHAP?",
    "Bagaimana proses pemeriksaan perkara pidana di pengadilan?"
  ];

  return (
    <div className="fixed inset-0 z-20 bg-white lg:pl-64 flex flex-col">
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
            <div className="flex items-center justify-center w-9 h-9 bg-gray-100 rounded-full">
              <BookOpen className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">KUHAP AI</h1>
              <p className="text-xs text-gray-500">Kitab Undang-Undang Hukum Acara Pidana</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={showInfo ? 'Tutup informasi' : 'Tampilkan informasi'}
        >
          <Info className="w-5 h-5 text-gray-700" />
        </button>
      </header>

      {/* Info Panel */}
      {showInfo && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <h2 className="text-sm font-medium text-gray-800">Tentang KUHAP AI</h2>
            <button
              onClick={() => setShowInfo(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Tutup informasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-700">
            KUHAP AI adalah asisten berbasis kecerdasan buatan untuk membantu memahami Kitab Undang-Undang Hukum Acara Pidana (KUHAP). 
            Asisten ini dapat membantu menjawab pertanyaan umum dan memberikan informasi tentang ketentuan-ketentuan dalam KUHAP. 
            Informasi yang diberikan bersifat umum dan sebaiknya dikonfirmasi dengan sumber resmi atau konsultasi dengan ahli hukum yang berkualifikasi.
          </p>
        </div>
      )}

      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto pb-32"
      >
        {/* Welcome Message - Bold AI NAME in center */}
        {messages.length <= 1 && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <img 
                src="/img/krimsus.png"
                alt="Krimsus"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-700 mb-4">KUHAP AI</h1>
            <p className="text-gray-600 max-w-md">
              Asisten untuk membantu Anda dengan pertanyaan seputar Kitab Undang-Undang Hukum Acara Pidana.
            </p>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Example Questions */}
          {messages.length <= 1 && (
            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-3">Contoh pertanyaan yang dapat Anda ajukan:</p>
              <div className="space-y-2">
                {exampleQuestions.map((question, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setInputMessage(question);
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                        // Set height based on new content
                        textareaRef.current.style.height = 'auto';
                        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                      }
                    }}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    {question}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((message, index) => (
              message.content || message.isAnimating ? (
                <div 
                  key={index} 
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end ${message.isAnimating ? 'w-full' : 'max-w-[85%] sm:max-w-[75%]'} group`}
                  >
                    {message.type === 'bot' && (
                      <div className="flex-shrink-0 mr-2 mb-1">
                        {message.isAnimating ? (
                          <div className="w-8 h-8 text-gray-600">
                            <AnimatedBotIcon />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
                            <BookOpen className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div 
                      className={cn(
                        "rounded-2xl px-4 py-3 shadow-sm",
                        message.type === 'user' 
                          ? "bg-gray-700 text-white rounded-tr-none" // User bubble now grey
                          : message.error 
                            ? "bg-red-50 text-red-800 rounded-tl-none border border-red-200" 
                            : message.isAnimating
                            ? "bg-white text-gray-800 rounded-tl-none border border-gray-200 w-full"
                            : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                      )}
                    >
                      {message.isAnimating ? (
                        <SkeletonMessage />
                      ) : message.type === 'bot' ? (
                        <div className="space-y-0">
                          <div 
                            className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-li:marker:text-gray-500 prose-strong:text-gray-900 prose-em:text-gray-700 prose-p:my-0.5 prose-headings:my-0.5 prose-headings:mb-0 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0.5 prose-pre:my-1 leading-tight [&_p]:!my-0.5 [&_br]:leading-none [&_h1+p]:!mt-0.5 [&_h2+p]:!mt-0.5 [&_h3+p]:!mt-0.5"
                            dangerouslySetInnerHTML={formatMessage(message.content)}
                          />
                          
                          {/* Source documents */}
                          {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 font-medium mb-1">Sumber:</p>
                              <ul className="text-xs text-gray-500 space-y-1">
                                {message.sourceDocuments.map((doc, i) => (
                                  <li key={i} className="truncate">
                                    {doc.metadata.title || doc.metadata.source || 'Dokumen'}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      )}
                    </div>
                    
                    {message.type === 'bot' && !message.isAnimating && !message.error && (
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 ml-2"
                        aria-label="Salin pesan"
                      >
                        {copied === message.content ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : null
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <DotBackground className="fixed inset-0 -z-10" dotColor="text-gray-300/20" />

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 p-4">
        <div className="max-w-3xl mx-auto relative">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="relative">
            <Textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan Anda..."
              className="resize-none pl-3 pr-12 py-3 max-h-[200px] rounded-xl border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 overflow-y-auto"
              autoComplete="off"
              disabled={isProcessing}
            />
            <Button
              type="submit"
              size="icon"
              className={cn(
                "absolute right-2.5 bottom-2.5 h-8 w-8 rounded-lg",
                inputMessage.trim() && !isProcessing
                  ? "bg-gray-700 text-white hover:bg-gray-800" // Send button now grey
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
              disabled={!inputMessage.trim() || isProcessing}
              aria-label="Kirim pesan"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-center text-gray-500 mt-2">
            KUHAP AI memberikan informasi umum dan tidak menggantikan nasihat hukum profesional.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KUHAPChatPage; 