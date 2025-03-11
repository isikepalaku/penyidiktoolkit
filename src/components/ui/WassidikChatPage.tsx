import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, X } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { AnimatedBotIcon } from './animated-bot-icon';
import { DotBackground } from './DotBackground';
import { sendChatMessage, clearChatHistory, initializeSession } from '@/services/wassidikService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Konfigurasi marked
marked.setOptions({
  breaks: true,
  gfm: true,
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
    
    // Set empty welcome message to trigger welcome UI
    setMessages([
      {
        content: '',
        type: 'bot',
        timestamp: new Date(),
      },
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
          behavior: 'smooth',
        });
      }
    });
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
      // Add a placeholder bot message with animation
      setMessages((prev) => [
        ...prev,
        {
          content: 'Sedang mengetik...',
          type: 'bot',
          timestamp: new Date(),
          isAnimating: true,
        },
      ]);
      
      // Send message to API
      const response = await sendChatMessage(userMessage.content);
      
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
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Replace the placeholder with an error message
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the last message (placeholder)
        newMessages.pop();
        
        // Add error message
        newMessages.push({
          content: 'Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.',
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
      // Convert markdown to HTML
      const html = marked(content);
      
      // Sanitize HTML to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(html);
      
      return sanitizedHtml;
    } catch (error) {
      console.error('Error formatting message:', error);
      return content;
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
    "Apa yang dimaksud dengan pengawasan penyidikan?",
    "Bagaimana prosedur pengawasan penyidikan menurut Perkaba?",
    "Jelaskan tahapan pengawasan penyidikan menurut SOP",
    "Apa saja persyaratan untuk melakukan pengawasan penyidikan?"
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
                <img 
                  src="/img/book.svg"
                  alt="Book"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Wassidik AI</h2>
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
              <p className="mb-2"><strong>Tentang Wassidik AI:</strong></p>
              <p>Wassidik AI adalah asisten yang memberikan informasi tentang SOP Pengawasan Penyidikan berdasarkan Perkaba Polri.</p>
              <p className="mt-2 text-xs text-blue-600">Catatan: Wassidik AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.</p>
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
            {/* Welcome Message - Bold WASSIDIK AI in center */}
            {messages.length <= 1 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <img 
                    src="/img/book.svg"
                    alt="Book"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <h1 className="text-4xl font-bold text-blue-600 mb-4">WASSIDIK AI</h1>
                <p className="text-gray-600 max-w-md">
                  Asisten untuk membantu Anda dengan pertanyaan seputar SOP Pengawasan Penyidikan berdasarkan Perkaba Polri.
                </p>
              </div>
            )}

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
              message.content && (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.type === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex max-w-[80%]",
                      message.type === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {message.type === 'bot' && (
                      <div className="flex-shrink-0 mr-2">
                        {message.isAnimating ? (
                          <div className="w-8 h-8 text-blue-600">
                            <AnimatedBotIcon />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <img 
                              src="/img/book.svg"
                              alt="Bot Icon"
                              className="w-6 h-6 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  
                    <div 
                      className={cn(
                        "rounded-2xl px-4 py-3",
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
                          <span className="text-gray-500">Wassidik AI sedang mengetik...</span>
                        </div>
                      ) : message.type === 'bot' ? (
                        <div>
                          <div 
                            className="prose prose-sm max-w-none break-words prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-li:marker:text-gray-500 prose-strong:text-gray-900 prose-em:text-gray-700 prose-p:my-0.5 prose-headings:my-0.5 prose-headings:mb-0 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0.5 prose-pre:my-1 leading-tight [&_p]:!my-0.5 [&_br]:leading-none [&_h1+p]:!mt-0.5 [&_h2+p]:!mt-0.5 [&_h3+p]:!mt-0.5"
                            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                          />
                          
                          {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                Sumber:
                              </p>
                              <ul className="text-xs text-gray-500 space-y-1">
                                {message.sourceDocuments.map((doc, idx) => (
                                  <li key={idx} className="truncate">
                                    {doc.metadata.title || doc.metadata.source || 'Dokumen Perkaba'}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {message.type === 'bot' && !message.isAnimating && (
                            <button
                              onClick={() => copyToClipboard(message.content)}
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
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4 md:px-8 pb-6 md:pb-4">
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
              Wassidik AI dapat memberikan informasi yang tidak akurat. Verifikasi fakta penting dengan dokumen resmi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WassidikChatPage; 