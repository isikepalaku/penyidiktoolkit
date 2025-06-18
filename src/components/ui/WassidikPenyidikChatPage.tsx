import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, RefreshCw, Database, Trash2, FileText, Image, Video, Volume2, BarChart3, CheckCircle, ExternalLink, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { DotBackground } from './DotBackground';
import { formatMessage } from '@/utils/markdownFormatter';
import useAIChatStreamHandler from '@/hooks/playground/useAIChatStreamHandler';
import { usePlaygroundStore } from '@/stores/PlaygroundStore';
import StreamingStatus from '@/hooks/streaming/StreamingStatus';
import { 
  clearStreamingChatHistory,
  initializeStreamingSession
} from '@/services/wassidikPenyidikStreamingService';
import { getStorageStats, forceCleanup } from '@/stores/PlaygroundStore';
import { Citation } from '@/types/playground';

interface WassidikPenyidikChatPageProps {
  onBack: () => void;
}

export default function WassidikPenyidikChatPage({ onBack }: WassidikPenyidikChatPageProps) {
  // Use streaming hooks and store
  const { handleStreamResponse } = useAIChatStreamHandler();
  const { messages, isStreaming: isLoading, streamingStatus, currentChunk } = usePlaygroundStore();
  
  const [inputMessage, setInputMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [completedMessageIds, setCompletedMessageIds] = useState<Set<string>>(new Set());
  const [collapsedSummaries, setCollapsedSummaries] = useState<Set<string>>(new Set());
  const [completionData, setCompletionData] = useState<Record<string, {
    processingTime?: number;
    reasoningMessages?: string[];
    references?: Array<{title: string; url?: string; content?: string}>;
    citationsCount?: number;
    metadata?: Record<string, any>;
    citations?: Citation[];
  }>>({});
  const [storageStats, setStorageStats] = useState<{
    usage: string | number;
    limit: string | number;
    percentage: number;
    sessionCount: number;
    isNearLimit?: boolean;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingStatusRef = useRef<HTMLDivElement>(null);
  const isSessionInitialized = useRef<boolean>(false);

  // Effect untuk inisialisasi session sekali saat komponen di-mount
  useEffect(() => {
    if (isSessionInitialized.current) {
      console.log('WASSIDIK session already initialized, skipping');
      return;
    }

    try {
      // Clear any existing messages from other agents
      const { setMessages, resetStreamingStatus } = usePlaygroundStore.getState();
      setMessages([]);
      resetStreamingStatus();
      console.log('🧹 WASSIDIK: Cleared existing messages from store');
      
      // Initialize WASSIDIK session
      initializeStreamingSession();
      isSessionInitialized.current = true;
      console.log('WASSIDIK session initialized successfully');
    } catch (error) {
      console.error('Error initializing WASSIDIK session:', error);
    }
  }, []);

  // Enhanced auto-focus management for streaming events
  useEffect(() => {
    const isAnyStreamingActive = streamingStatus.isThinking || 
                                streamingStatus.isReasoningActive ||
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
      }, 500);
      
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
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, [
    isLoading, 
    streamingStatus.isThinking,
    streamingStatus.isReasoningActive,
    streamingStatus.isCallingTool, 
    streamingStatus.isAccessingKnowledge, 
    streamingStatus.isMemoryUpdateStarted, 
    streamingStatus.hasCompleted
  ]);

  // Load storage stats when showing storage info
  useEffect(() => {
    if (showStorageInfo) {
      const stats = getStorageStats();
      setStorageStats(stats);
    }
  }, [showStorageInfo]);

  // Track completion status for showing summary
  useEffect(() => {
    if (streamingStatus.hasCompleted && !isLoading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'agent' && lastMessage.id) {
        setCompletedMessageIds(prev => new Set(prev).add(lastMessage.id!));
        
        // Debug logging for completion data
        console.log('💾 Saving completion data:', {
          messageId: lastMessage.id,
          processingTime: streamingStatus.processingMetrics?.processingTime,
          citationsCount: streamingStatus.citationsCount,
          citations: streamingStatus.citations,
          references: streamingStatus.references,
          hasStreamingStatusCitations: !!streamingStatus.citations?.length,
          hasReferences: !!streamingStatus.references?.length,
          hasMessageExtraData: !!lastMessage.extra_data,
          messageExtraDataReferences: lastMessage.extra_data?.references,
          streamingStatusData: streamingStatus,
          lastMessageExtraData: lastMessage.extra_data
        });
        
        // Extract citations from multiple sources with priority
        let finalCitations = streamingStatus.citations || [];
        let finalReferences = streamingStatus.references || [];
        let finalCitationsCount = streamingStatus.citationsCount || 0;
        
        // Fallback: Use message extra_data if streaming status doesn't have citations
        if (finalCitations.length === 0 && lastMessage.extra_data?.references) {
          console.log('📚 Fallback: Using message extra_data.references as citations');
          finalCitations = lastMessage.extra_data.references.map((ref: any, index: number) => ({
            id: `msg-citation-${index}`,
            title: ref.title || `Reference ${index + 1}`,
            url: ref.url,
            source: ref.url ? new URL(ref.url).hostname : 'Knowledge Base',
            excerpt: ref.content || ref.text,
            metadata: ref.metadata
          }));
          finalReferences = lastMessage.extra_data.references;
          finalCitationsCount = finalCitations.length;
        }
        
        console.log('📚 Final citations for completion:', {
          source: finalCitations.length > 0 ? 'streaming_status' : 'message_extra_data',
          count: finalCitations.length,
          citations_preview: finalCitations.slice(0, 2)
        });
        
        // Save completion data for this message
        setCompletionData(prev => ({
          ...prev,
          [lastMessage.id!]: {
            processingTime: streamingStatus.processingMetrics?.processingTime,
            reasoningMessages: streamingStatus.reasoningMessages,
            references: finalReferences,
            citationsCount: finalCitationsCount,
            metadata: streamingStatus.metadata,
            citations: finalCitations
          }
        }));
      }
    }
  }, [streamingStatus.hasCompleted, isLoading, messages, streamingStatus.processingMetrics, streamingStatus.reasoningMessages, streamingStatus.references, streamingStatus.citationsCount, streamingStatus.metadata, streamingStatus.citations]);

  // Auto-scroll to latest message (but don't interfere with streaming focus)
  useEffect(() => {
    const isAnyStreamingActive = streamingStatus.isThinking || 
                                streamingStatus.isReasoningActive ||
                                streamingStatus.isCallingTool || 
                                streamingStatus.isAccessingKnowledge || 
                                streamingStatus.isMemoryUpdateStarted;
    
    // Only auto-scroll if not actively streaming (to avoid interfering with focus management)
    if (!isLoading || !isAnyStreamingActive) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [messages, isLoading, streamingStatus.isThinking, streamingStatus.isReasoningActive,
      streamingStatus.isCallingTool, streamingStatus.isAccessingKnowledge, streamingStatus.isMemoryUpdateStarted]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // Adjust height dynamically
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleStorageCleanup = () => {
    if (window.confirm('Apakah Anda yakin ingin membersihkan data lama? Data yang sudah dihapus tidak bisa dikembalikan.')) {
      const newStats = forceCleanup();
      setStorageStats(newStats);
      alert(`Cleanup selesai! Storage yang dibebaskan: ${newStats.usage}`);
    }
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
                <span className="font-medium">
                  {typeof storageStats.usage === 'string' ? `${storageStats.usage} / ${storageStats.limit}` : 'Tidak tersedia'}
                </span>
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
                <span>Jumlah Sesi:</span>
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
    // Simple validation - only text messages now
    const trimmedMessage = inputMessage.trim();
    
    if (!trimmedMessage || isLoading) return;
    
    // Validate message length
    if (trimmedMessage.length < 3) {
      alert('Pesan terlalu pendek. Minimal 3 karakter.');
      return;
    }

    // Clear input and reset height immediately
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.blur();
    }

    try {
      // Debug message sebelum send
      console.log('📤 Sending message from UI:', {
        message: trimmedMessage.substring(0, 100) + (trimmedMessage.length > 100 ? '...' : ''),
        message_length: trimmedMessage.length
      });

      // Use streaming handler with simple text message
      await handleStreamResponse(trimmedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      // Focus the textarea after sending (but streaming focus will take over during processing)
      setTimeout(() => {
        if (textareaRef.current && !isLoading) {
          textareaRef.current.focus();
        }
      }, 100);
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
        const { setMessages, resetStreamingStatus } = usePlaygroundStore.getState();
        setMessages([]);
        resetStreamingStatus();
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

  // Toggle collapse state for completion summary
  const toggleCompletionSummary = (messageId: string) => {
    setCollapsedSummaries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId); // Expand
      } else {
        newSet.add(messageId); // Collapse
      }
      return newSet;
    });
  };

  // Auto-collapse completion summaries when they first appear (default collapsed)
  useEffect(() => {
    // Automatically collapse all completed message summaries by default
    if (completedMessageIds.size > 0) {
      const newCollapsedSummaries = new Set(collapsedSummaries);
      let hasChanges = false;
      
      completedMessageIds.forEach(messageId => {
        if (!newCollapsedSummaries.has(messageId)) {
          newCollapsedSummaries.add(messageId);
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        setCollapsedSummaries(newCollapsedSummaries);
      }
    }
  }, [completedMessageIds]);

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
            {/* Welcome Message */}
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

            {/* Example Questions */}
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

            {/* Chat Messages with Professional Streaming Animation */}
            {messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1;
              const hasMinimalContent = !message.content || message.content.trim().length < 50;
              const isStreamingMessage = message.role === 'agent' && 
                                       isLastMessage && 
                                       isLoading &&
                                       (hasMinimalContent || 
                                        streamingStatus.isThinking || 
                                        streamingStatus.isReasoningActive ||
                                        streamingStatus.isCallingTool || 
                                        streamingStatus.isAccessingKnowledge ||
                                        streamingStatus.isMemoryUpdateStarted);
              
              // Check if this message should show completion summary
              const shouldShowCompletionSummary = message.role === 'agent' && 
                                                 message.id && 
                                                 completedMessageIds.has(message.id) && 
                                                 isLastMessage &&
                                                 !isLoading;
              
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
                            ? 'bg-gray-100 text-gray-900 ml-auto'
                            : 'bg-white border border-gray-200 text-gray-800'
                        )}
                      >
                        {message.role === 'agent' ? (
                          <div className="relative group">
                            {/* Professional Streaming Status Animation */}
                            {isStreamingMessage && (
                              <div 
                                ref={streamingStatusRef} 
                                className="mb-3 scroll-mt-4 transition-all duration-300"
                              >
                                <StreamingStatus 
                                  isStreaming={true} 
                                  streamingStatus={streamingStatus}
                                  compact={true}
                                  currentChunk={currentChunk}
                                  containerWidth="message"
                                />
                              </div>
                            )}
                            
                            {/* Enhanced Content Indicators (without model info) */}
                            {(streamingStatus.hasImages || streamingStatus.hasVideos || streamingStatus.hasAudio || streamingStatus.citationsCount) && (
                              <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                                {streamingStatus.citationsCount && streamingStatus.citationsCount > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-orange-600">
                                    <FileText className="w-3 h-3" />
                                    <span>{streamingStatus.citationsCount} citations</span>
                                  </div>
                                )}
                                {streamingStatus.hasImages && (
                                  <div className="flex items-center gap-1 text-xs text-pink-600">
                                    <Image className="w-3 h-3" />
                                    <span>Images</span>
                                  </div>
                                )}
                                {streamingStatus.hasVideos && (
                                  <div className="flex items-center gap-1 text-xs text-indigo-600">
                                    <Video className="w-3 h-3" />
                                    <span>Videos</span>
                                  </div>
                                )}
                                {streamingStatus.hasAudio && (
                                  <div className="flex items-center gap-1 text-xs text-green-600">
                                    <Volume2 className="w-3 h-3" />
                                    <span>Audio</span>
                                  </div>
                                )}
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
                            
                            {/* Processing Metrics Display (optional, without model info) */}
                            {streamingStatus.processingMetrics && (
                              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-4 text-xs text-gray-600">
                                  <BarChart3 className="w-3 h-3" />
                                  {streamingStatus.processingMetrics.tokensUsed && (
                                    <span>{streamingStatus.processingMetrics.tokensUsed} tokens</span>
                                  )}
                                  {streamingStatus.processingMetrics.processingTime && (
                                    <span>{streamingStatus.processingMetrics.processingTime}ms</span>
                                  )}
                                </div>
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

                      {/* Completion Summary - Shows for completed agent messages */}
                      {shouldShowCompletionSummary && (
                        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          {/* Debug logging for completion summary */}
                          {(() => {
                            console.log('🎯 Completion Summary Debug:', {
                              messageId: message.id,
                              shouldShow: shouldShowCompletionSummary,
                              hasCompletionData: !!completionData[message.id!],
                              completionData: completionData[message.id!],
                              hasCitations: !!completionData[message.id!]?.citations?.length,
                              citations: completionData[message.id!]?.citations,
                              isCollapsed: collapsedSummaries.has(message.id!)
                            });
                            return null;
                          })()}
                          
                          {/* Processing Summary Header - Always visible */}
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">
                              Selesai berpikir
                              {message.id && completionData[message.id]?.processingTime && (
                                <span className="text-gray-500">
                                  {' '}selama {Math.round(completionData[message.id].processingTime! / 1000)} detik
                                </span>
                              )}
                            </span>
                            <button 
                              className="ml-auto text-gray-400 hover:text-gray-600 transition-transform duration-200"
                              onClick={() => toggleCompletionSummary(message.id!)}
                              title={collapsedSummaries.has(message.id!) ? "Expand details" : "Collapse details"}
                            >
                              <ChevronDown 
                                className={cn(
                                  "w-4 h-4 transition-transform duration-200",
                                  collapsedSummaries.has(message.id!) ? "rotate-0" : "rotate-180"
                                )} 
                              />
                            </button>
                          </div>

                          {/* Collapsible Content */}
                          {!collapsedSummaries.has(message.id!) && (
                            <div className="space-y-4">
                              {/* Reasoning Steps */}
                              {message.id && completionData[message.id]?.reasoningMessages && completionData[message.id].reasoningMessages!.length > 0 && (
                                <div className="space-y-2">
                                  {completionData[message.id].reasoningMessages!.map((reasoning, idx) => (
                                    <div key={idx} className="flex gap-2 text-sm">
                                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                      <p className="text-gray-700 leading-relaxed">{reasoning}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Knowledge Base Sources */}
                              {message.id && completionData[message.id]?.references && completionData[message.id].references!.length > 0 && (
                                <div className="border-t border-gray-200 pt-3">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Database className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-gray-700">
                                      Sudah mencari di knowledge base
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {completionData[message.id].references!.slice(0, 6).map((ref, idx) => (
                                      <div 
                                        key={idx}
                                        className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-md hover:border-purple-300 transition-colors"
                                      >
                                        <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-sm flex-shrink-0 flex items-center justify-center">
                                          <span className="text-white text-xs font-bold">W</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="text-xs font-medium text-gray-800 truncate">
                                            {ref.title || 'Knowledge Base'}
                                          </div>
                                          {ref.url && (
                                            <div className="text-xs text-gray-500 truncate">
                                              {ref.url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {completionData[message.id].references!.length > 6 && (
                                    <div className="mt-2 text-xs text-gray-500 text-center">
                                      + {completionData[message.id].references!.length - 6} sumber lainnya
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Citations Count */}
                              {message.id && completionData[message.id]?.citationsCount && completionData[message.id].citationsCount! > 0 && (
                                <div className="border-t border-gray-200 pt-3">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <FileText className="w-4 h-4" />
                                    <span>{completionData[message.id].citationsCount} referensi digunakan dalam respons</span>
                                  </div>
                                </div>
                              )}

                              {/* Enhanced Citations Display */}
                              {message.id && completionData[message.id]?.citations && completionData[message.id].citations!.length > 0 && (
                                <div className="border-t border-gray-200 pt-3">
                                  <div className="flex items-center gap-2 mb-3">
                                    <ExternalLink className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-gray-700">
                                      Sitasi ({completionData[message.id].citations!.length})
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {completionData[message.id].citations!.slice(0, 3).map((citation, idx) => (
                                      <div key={citation.id || idx} className="p-3 bg-white border border-gray-200 rounded-md hover:border-blue-300 transition-colors">
                                        <div className="flex items-start gap-3">
                                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex-shrink-0 flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">{idx + 1}</span>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-800 mb-1">
                                              {citation.title}
                                            </div>
                                            <div className="text-xs text-gray-500 mb-2">
                                              {citation.source || 'Knowledge Base'}
                                            </div>
                                            {citation.excerpt && (
                                              <div className="text-xs text-gray-600 italic line-clamp-2 mb-2">
                                                "{citation.excerpt.length > 120 ? citation.excerpt.substring(0, 120) + '...' : citation.excerpt}"
                                              </div>
                                            )}
                                            {citation.url && (
                                              <a 
                                                href={citation.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                                Lihat Sumber
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {completionData[message.id].citations!.length > 3 && (
                                    <div className="mt-2 text-xs text-gray-500 text-center">
                                      + {completionData[message.id].citations!.length - 3} sitasi lainnya
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Additional Metadata */}
                              {message.id && completionData[message.id]?.metadata && Object.keys(completionData[message.id].metadata!).length > 0 && (
                                <div className="border-t border-gray-200 pt-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">Informasi Tambahan</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {Object.entries(completionData[message.id].metadata!).slice(0, 4).map(([key, value]) => (
                                      <div key={key} className="flex gap-1">
                                        <span className="font-medium text-gray-600">{key}:</span>
                                        <span className="text-gray-700 truncate">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2 px-1">
                        {message.created_at ? new Date(message.created_at * 1000).toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : ''}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-gray-700 text-sm font-medium">U</span>
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
          <div className="relative">
            <Textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={handleInputChange}
              placeholder="Ketik pesan Anda..."
              className="resize-none pr-14 py-3 pl-4 max-h-[200px] rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500 shadow-sm overflow-y-auto"
              disabled={isLoading}
              data-chat-input="true"
            />
            
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className={cn(
                "absolute right-2 bottom-3 p-2 rounded-lg",
                isLoading || !inputMessage.trim()
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