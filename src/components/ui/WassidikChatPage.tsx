import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Shield, Info, X } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { AnimatedBotIcon } from './animated-bot-icon';
import { DotBackground } from './DotBackground';
import { sendChatMessage, clearChatHistory, initializeSession } from '@/services/wassidikService';

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

interface WassidikChatPageProps {
  onBack?: () => void;
}

const WassidikChatPage: React.FC<WassidikChatPageProps> = ({ onBack }) => {
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
        content: 'Selamat datang di SOP Wassidik AI. Saya adalah asisten AI yang fokus pada informasi seputar SOP Pengawasan Penyidikan berdasarkan Perkaba Polri. Apa yang ingin Anda tanyakan?',
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
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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
    setIsProcessing(true);

    try {
      // Add a temporary bot message with loading animation
      const tempBotMessage: Message = {
        content: '',
        type: 'bot',
        timestamp: new Date(),
        isAnimating: true
      };
      
      setMessages(prev => [...prev, tempBotMessage]);
      
      // Send message to API
      const response = await sendChatMessage(userMessage.content);
      
      // Remove temporary message and add actual response
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Remove temporary message
        
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
      
      // Remove temporary message and add error message
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Remove temporary message
        
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

  const copyToClipboard = (content: string, messageIndex: number) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        setCopied(`${messageIndex}`);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const formatMessage = (content: string) => {
    // Fungsi untuk mengubah markdown menjadi HTML yang tepat
    
    // 1. Tangani kode blok dengan ```
    let formattedContent = content.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto my-2 text-sm font-mono"><code>$1</code></pre>'
    );
    
    // 2. Tangani kode inline dengan `
    formattedContent = formattedContent.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>'
    );
    
    // 3. Tangani heading dengan margin yang lebih kecil
    formattedContent = formattedContent.replace(/^### (.*?)$/gm, '<h3 class="text-lg font-semibold my-0.5 mb-0">$1</h3>');
    formattedContent = formattedContent.replace(/^## (.*?)$/gm, '<h2 class="text-xl font-semibold my-0.5 mb-0">$1</h2>');
    formattedContent = formattedContent.replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold my-1 mb-0">$1</h1>');
    
    // 4. Tangani list dengan margin yang lebih kecil
    formattedContent = formattedContent.replace(/^\* (.*?)$/gm, '<li class="ml-4 list-disc my-0.5">$1</li>');
    formattedContent = formattedContent.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc my-0.5">$1</li>');
    formattedContent = formattedContent.replace(/^\d+\. (.*?)$/gm, '<li class="ml-4 list-decimal my-0.5">$1</li>');
    
    // Wrap list items with ul/ol
    formattedContent = formattedContent.replace(/<li class="ml-4 list-disc my-0.5">(.*?)<\/li>/g, function(match) {
      return '<ul class="my-0.5">'+match+'</ul>';
    });
    formattedContent = formattedContent.replace(/<\/ul><ul class="my-0.5">/g, '');
    
    formattedContent = formattedContent.replace(/<li class="ml-4 list-decimal my-0.5">(.*?)<\/li>/g, function(match) {
      return '<ol class="my-0.5">'+match+'</ol>';
    });
    formattedContent = formattedContent.replace(/<\/ol><ol class="my-0.5">/g, '');
    
    // 5. Tangani bold dan italic
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 6. Tangani link
    formattedContent = formattedContent.replace(
      /\[(.*?)\]\((https?:\/\/[^\s]+)\)/g, 
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
    );
    
    // 7. Tangani URL biasa
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formattedContent = formattedContent.replace(
      urlRegex, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
    );
    
    // 8. Tangani line breaks
    // Ganti double line breaks dengan paragraf
    formattedContent = formattedContent.replace(/\n\n+/g, '</p><p class="my-0.5">');
    
    // Ganti single line breaks dengan <br> dengan class khusus
    formattedContent = formattedContent.replace(/\n/g, '<br class="leading-none">');
    
    // Tangani paragraf setelah heading dengan margin lebih kecil
    formattedContent = formattedContent.replace(/<\/h[1-3]>\s*<p/g, '</h$1><p class="mt-0.5"');
    
    // Bungkus dengan paragraf jika belum dibungkus
    if (!formattedContent.startsWith('<h') && !formattedContent.startsWith('<p') && !formattedContent.startsWith('<ul') && !formattedContent.startsWith('<ol') && !formattedContent.startsWith('<pre')) {
      formattedContent = '<p class="my-0.5">' + formattedContent + '</p>';
    }
    
    return formattedContent;
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
    "Apa yang dimaksud dengan pengawasan penyidikan?",
    "Bagaimana prosedur pengawasan penyidikan menurut SOP?",
    "Jelaskan tahapan pengawasan penyidikan menurut Perkaba Polri",
    "Apa saja bentuk pengawasan penyidikan yang dilakukan?"
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
              <div className="flex items-center justify-center w-9 h-9 bg-blue-100 rounded-full">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">SOP Wassidik AI</h2>
                <p className="text-xs text-gray-500">Asisten SOP Pengawasan Penyidikan Perkaba Polri</p>
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
          <div className="bg-blue-50 border-b border-blue-200 p-3 text-sm text-blue-800">
            <div className="max-w-3xl mx-auto">
              <p className="mb-2"><strong>Tentang SOP Wassidik AI:</strong></p>
              <p>SOP Wassidik AI adalah asisten yang memberikan informasi tentang Standar Operasional Prosedur (SOP) Pengawasan Penyidikan berdasarkan Perkaba Polri.</p>
              <p className="mt-2 text-xs text-blue-600">Catatan: SOP Wassidik AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.</p>
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 md:px-8 relative"
        >
          <div className="absolute inset-0 opacity-50">
            <DotBackground />
          </div>
          <div className="max-w-3xl mx-auto relative z-10 space-y-6">
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
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex items-start gap-3 transition-opacity group",
                  message.type === 'user' ? "justify-end" : "justify-start",
                  message.isAnimating && "animate-pulse"
                )}
              >
                {message.type === 'bot' && (
                  <div className="flex-shrink-0 mt-1">
                    {message.isAnimating ? (
                      <div className="w-8 h-8 text-blue-600">
                        <AnimatedBotIcon />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                  </div>
                )}
                
                <div 
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-[85%] shadow-sm",
                    message.type === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : message.error 
                        ? "bg-red-50 text-red-800 rounded-tl-none border border-red-200" 
                        : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                  )}
                >
                  {message.isAnimating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-gray-500">SOP Wassidik AI sedang mengetik...</span>
                    </div>
                  ) : message.type === 'bot' ? (
                    <div className="space-y-0">
                      <div 
                        className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-li:marker:text-gray-500 prose-strong:text-gray-900 prose-em:text-gray-700 prose-p:my-0.5 prose-headings:my-0.5 prose-headings:mb-0 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0.5 prose-pre:my-1 leading-tight [&_p]:!my-0.5 [&_br]:leading-none [&_h1+p]:!mt-0.5 [&_h2+p]:!mt-0.5 [&_h3+p]:!mt-0.5"
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      />
                      
                      {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 font-medium mb-1">Sumber:</p>
                          <ul className="text-xs text-gray-500 space-y-1">
                            {message.sourceDocuments.map((doc, idx) => (
                              <li key={idx} className="truncate">
                                {doc.metadata.title || doc.metadata.source || 'Dokumen Perkaba'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                
                {message.type === 'bot' && !message.isAnimating && (
                  <button
                    onClick={() => copyToClipboard(message.content, index)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100"
                    aria-label="Copy message"
                  >
                    {copied === `${index}` ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan Anda..."
                className="resize-none pr-12 py-3 min-h-[56px] max-h-[200px] rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                disabled={isProcessing}
              />
              <Button
                onClick={handleSubmit}
                disabled={!inputMessage.trim() || isProcessing}
                className={cn(
                  "absolute right-2 bottom-2 p-2 rounded-lg",
                  !inputMessage.trim() || isProcessing
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
              SOP Wassidik AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WassidikChatPage; 