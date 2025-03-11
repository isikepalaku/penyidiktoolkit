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
    <div className="fixed inset-0 z-20 bg-white lg:pl-64">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">UU Kesehatan</h1>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <Info className="w-4 h-4" />
          <span>{showInfo ? 'Sembunyikan Info' : 'Tampilkan Info'}</span>
        </button>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="p-4 bg-emerald-50 border-b border-emerald-100">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-medium text-emerald-800">Tentang UU Kesehatan</h2>
            <button
              onClick={() => setShowInfo(false)}
              className="text-emerald-500 hover:text-emerald-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-emerald-700">
            Asisten ini dapat membantu Anda dengan pertanyaan seputar Undang-Undang Kesehatan di Indonesia, 
            termasuk UU No. 36 Tahun 2009 tentang Kesehatan dan peraturan terkait lainnya. 
            Anda dapat bertanya tentang hak dan kewajiban dalam pelayanan kesehatan, 
            standar fasilitas kesehatan, praktik kedokteran, dan aspek hukum kesehatan lainnya.
          </p>
        </div>
      )}

      {/* Chat Container */}
      <div
        ref={containerRef}
        className="h-[calc(100vh-8rem)] overflow-y-auto pb-32"
      >
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <DotBackground />

          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex max-w-[80%] ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {message.type === 'bot' && (
                    <div className="flex-shrink-0 mr-2">
                      {message.isAnimating ? (
                        <AnimatedBotIcon className="w-8 h-8 text-emerald-600" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      message.type === 'user'
                        ? 'bg-emerald-600 text-white'
                        : message.error
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.isAnimating ? (
                      <div className="flex items-center justify-center h-6">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span className="ml-2 text-emerald-600">Sedang mengetik...</span>
                      </div>
                    ) : (
                      <div>
                        <div
                          className="prose prose-sm max-w-none break-words"
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
                    'Apa saja hak pasien menurut UU Kesehatan?',
                    'Bagaimana regulasi tentang praktik dokter di Indonesia?',
                    'Jelaskan tentang perubahan dalam UU Kesehatan terbaru',
                    'Apa sanksi bagi rumah sakit yang melanggar standar pelayanan?'
                  ].map((question, idx) => (
                    <button
                      key={idx}
                      className="text-sm bg-white border border-emerald-200 rounded-lg p-3 text-left hover:bg-emerald-50 transition-colors"
                      onClick={() => {
                        setInputMessage(question);
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 lg:pl-64">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <div className="flex-grow">
            <textarea
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan Anda..."
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={1}
              disabled={isProcessing}
            />
            <p className="text-xs text-gray-500 mt-1">
              Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!inputMessage.trim() || isProcessing}
            className={`p-2 rounded-full ${
              !inputMessage.trim() || isProcessing
                ? 'bg-gray-200 text-gray-500'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
            aria-label="Kirim pesan"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default KesehatanChatPage; 