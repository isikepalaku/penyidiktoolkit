import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, BookOpen, Info, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { DotBackground } from './DotBackground';
import { sendChatMessage, clearChatHistory, initializeSession } from '@/services/kesehatanService';
import { AnimatedBotIcon } from './animated-bot-icon';

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

interface KesehatanChatPageProps {
  onBack?: () => void;
}

const KesehatanChatPage: React.FC<KesehatanChatPageProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initialize chat session
    initializeSession();

    // Set welcome message
    setMessages([
      {
        content: 'Selamat datang di Asisten UU Kesehatan. Saya dapat membantu Anda dengan pertanyaan seputar Undang-Undang Kesehatan di Indonesia. Apa yang ingin Anda ketahui?',
        type: 'bot',
        timestamp: new Date(),
      },
    ]);

    // Clean up on unmount
    return () => {
      clearChatHistory();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
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
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    // Add a placeholder for the bot's response with animation
    setMessages((prev) => [
      ...prev,
      {
        content: '',
        type: 'bot',
        timestamp: new Date(),
        isAnimating: true,
      },
    ]);

    try {
      const response = await sendChatMessage(userMessage.content);

      // Replace the placeholder with the actual response
      setMessages((prev) => {
        const newMessages = [...prev];
        const placeholderIndex = newMessages.findIndex(
          (msg) => msg.type === 'bot' && msg.isAnimating
        );

        if (placeholderIndex !== -1) {
          newMessages[placeholderIndex] = {
            content: response.text,
            type: 'bot',
            timestamp: new Date(),
            sourceDocuments: response.sourceDocuments,
          };
        }

        return newMessages;
      });
    } catch (error) {
      console.error('Error sending message:', error);

      // Replace the placeholder with an error message
      setMessages((prev) => {
        const newMessages = [...prev];
        const placeholderIndex = newMessages.findIndex(
          (msg) => msg.type === 'bot' && msg.isAnimating
        );

        if (placeholderIndex !== -1) {
          newMessages[placeholderIndex] = {
            content:
              'Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi nanti.',
            type: 'bot',
            timestamp: new Date(),
            error: true,
          };
        }

        return newMessages;
      });
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

  const formatMessage = (content: string) => {
    // Use marked to convert markdown to HTML
    const rawHtml = marked(content, { breaks: true });
    
    // Sanitize HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    
    return { __html: sanitizedHtml };
  };

  const handleBack = () => {
    if (onBack) {
      clearChatHistory();
      onBack();
    }
  };

  return (
    <div className="fixed inset-0 z-20 bg-white lg:pl-64 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">UU Kesehatan</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Asisten untuk pertanyaan seputar UU Kesehatan</p>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={showInfo ? "Sembunyikan Info" : "Tampilkan Info"}
        >
          {showInfo ? <X className="w-5 h-5 text-gray-700" /> : <Info className="w-5 h-5 text-gray-700" />}
        </button>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="p-4 bg-emerald-50 border-b border-emerald-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-medium text-emerald-800 mb-2">Tentang UU Kesehatan</h2>
            <p className="text-sm text-emerald-700">
              Asisten ini dapat membantu Anda dengan pertanyaan seputar Undang-Undang Kesehatan di Indonesia, 
              termasuk UU No. 36 Tahun 2009 tentang Kesehatan dan peraturan terkait lainnya. 
              Anda dapat bertanya tentang hak dan kewajiban dalam pelayanan kesehatan, 
              standar fasilitas kesehatan, praktik kedokteran, dan aspek hukum kesehatan lainnya.
            </p>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="max-w-3xl mx-auto p-4 space-y-6">
          <DotBackground />

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex max-w-[85%] sm:max-w-[75%] ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  } items-end`}
                >
                  {message.type === 'bot' && (
                    <div className="flex-shrink-0 mr-2 mb-1">
                      {message.isAnimating ? (
                        <AnimatedBotIcon className="w-8 h-8 text-emerald-600" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
                        : message.error
                        ? 'bg-red-50 text-red-800 rounded-tl-none border border-red-200'
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-200 shadow-sm'
                    }`}
                  >
                    {message.isAnimating ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span className="text-gray-500">Sedang mengetik...</span>
                      </div>
                    ) : (
                      <div>
                        <div
                          className="prose prose-sm max-w-none break-words prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-li:marker:text-gray-500 prose-strong:text-gray-900 prose-em:text-gray-700 prose-p:my-0.5 prose-headings:my-0.5 prose-headings:mb-0 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0.5 prose-pre:my-1 leading-tight [&_p]:!my-0.5 [&_br]:leading-none [&_h1+p]:!mt-0.5 [&_h2+p]:!mt-0.5 [&_h3+p]:!mt-0.5"
                          dangerouslySetInnerHTML={formatMessage(message.content)}
                        />

                        {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              Sumber:
                            </p>
                            <ul className="text-xs text-gray-500 space-y-1">
                              {message.sourceDocuments.map((doc, idx) => (
                                <li key={idx}>
                                  {doc.metadata.source || 'Dokumen UU Kesehatan'}
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
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Example questions when no messages */}
            {messages.length <= 1 && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-gray-500 text-center">
                  Contoh pertanyaan yang dapat Anda ajukan:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    'Apa yang dimaksud dengan hak atas kesehatan?',
                    'Bagaimana regulasi praktik kedokteran di Indonesia?',
                    'Jelaskan standar fasilitas kesehatan menurut UU',
                    'Apa sanksi bagi pelanggaran UU Kesehatan?'
                  ].map((question, idx) => (
                    <button
                      key={idx}
                      className="text-sm bg-white border border-emerald-200 rounded-lg p-3 text-left hover:bg-emerald-50 transition-colors shadow-sm"
                      onClick={() => {
                        setInputMessage(question);
                        textareaRef.current?.focus();
                      }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4 md:px-8 pb-safe">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex w-full cursor-text flex-col rounded-xl border border-gray-300 px-4 py-3 duration-150 ease-in-out shadow-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 bg-white">
            <textarea
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan Anda..."
              className="w-full border-0 bg-transparent px-0 py-1 text-sm placeholder:text-gray-500 focus:outline-none resize-none pr-12 min-h-[40px] max-h-[200px] text-gray-800"
              disabled={isProcessing}
              ref={textareaRef}
              rows={2}
            />
            
            {/* Tombol kirim di dalam textarea */}
            <button
              onClick={handleSubmit}
              disabled={!inputMessage.trim() || isProcessing}
              className={`absolute right-3 bottom-3 p-2.5 rounded-lg flex items-center justify-center transition-colors ${
                !inputMessage.trim() || isProcessing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
              aria-label="Kirim pesan"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
          </p>
        </div>
      </div>
    </div>
  );
};

export default KesehatanChatPage; 