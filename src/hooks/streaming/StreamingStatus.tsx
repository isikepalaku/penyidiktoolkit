import React, { useState, useEffect } from 'react';
import { Brain, Wrench, Database, CheckCircle, BookOpen, PauseCircle, PlayCircle, XCircle, Cpu, FileText, Image, Video, Volume2, BarChart3, MessageSquare, ExternalLink, History, MessageCircle } from 'lucide-react';
import { Citation } from '@/types/playground';

interface StreamingStatusProps {
  isStreaming: boolean;
  streamingStatus: {
    isThinking?: boolean;           // from RunStarted/ReasoningStarted
    isCallingTool?: boolean;        // from ToolCallStarted
    toolName?: string;              // tool name from ToolCallStarted
    isAccessingKnowledge?: boolean; // from AccessingKnowledge (custom)
    isMemoryUpdateStarted?: boolean; // from MemoryUpdateStarted (updated from isUpdatingMemory)
    hasCompleted?: boolean;         // from RunCompleted
    isPaused?: boolean;             // from RunPaused
    isCancelled?: boolean;          // from RunCancelled
    // Enhanced status based on Agno documentation
    currentModel?: string;          // from RunResponseStartedEvent.model
    modelProvider?: string;         // from RunResponseStartedEvent.model_provider
    reasoningSteps?: Array<{        // from ReasoningStepEvent
      step: number;
      description: string;
      content?: string;
    }>;
    isReasoningActive?: boolean;    // from ReasoningStarted/ReasoningCompleted
    currentReasoningStep?: string;  // from ReasoningStepEvent.reasoning_content
    citationsCount?: number;        // from RunResponseContentEvent.citations.count
    hasImages?: boolean;            // from RunResponseContentEvent.images
    hasVideos?: boolean;            // from RunResponseContentEvent.videos
    hasAudio?: boolean;             // from RunResponseContentEvent.audio
    contentType?: string;           // from RunResponseContentEvent.content_type
    errorMessage?: string;          // from RunResponseErrorEvent.content
    cancelReason?: string;          // from RunResponseCancelledEvent.reason
    processingMetrics?: {           // from RunResponse.metrics
      tokensUsed?: number;
      processingTime?: number;
    };
    // Extra data fields from RunResponse.extra_data
    references?: Array<{title: string; url?: string; content?: string}>; // from extra_data.references
    addMessages?: Array<{role: string; content: string}>; // from extra_data.add_messages
    historyEntries?: Array<{role: string; content: string}>; // from extra_data.history
    reasoningMessages?: string[];   // from extra_data.reasoning_messages
    metadata?: Record<string, any>; // from extra_data.metadata
    citations?: Citation[];
  };
  compact?: boolean;
  currentChunk?: string;           // Current content chunk from RunResponseContentEvent
  containerWidth?: 'auto' | 'full' | 'message'; // Width synchronization option
}

export default function StreamingStatus({ 
  isStreaming, 
  streamingStatus, 
  compact = false,
  currentChunk,
  containerWidth = 'message'
}: StreamingStatusProps) {
  const [displayChunk, setDisplayChunk] = useState<string>('');
  const [chunkTransitioning, setChunkTransitioning] = useState(false);

  // Only show if there's an active streaming status or completion
  if (!isStreaming && !streamingStatus.hasCompleted && !streamingStatus.isPaused && !streamingStatus.isCancelled) return null;

  // Handle chunk transitions
  useEffect(() => {
    if (currentChunk && currentChunk !== displayChunk) {
      setChunkTransitioning(true);
      setTimeout(() => {
        setDisplayChunk(currentChunk);
        setChunkTransitioning(false);
      }, 150);
    }
  }, [currentChunk, displayChunk]);

  // Clear chunk when moving to different events
  useEffect(() => {
    if (streamingStatus.isThinking || streamingStatus.isCallingTool || 
        streamingStatus.isMemoryUpdateStarted || streamingStatus.hasCompleted) {
      if (displayChunk) {
        setChunkTransitioning(true);
        setTimeout(() => {
          setDisplayChunk('');
          setChunkTransitioning(false);
        }, 300);
      }
    }
  }, [streamingStatus.isThinking, streamingStatus.isCallingTool, streamingStatus.isMemoryUpdateStarted, streamingStatus.hasCompleted, displayChunk]);

  // Dynamic width classes based on containerWidth prop
  const getContainerClasses = () => {
    const baseClasses = "bg-gray-50/80 backdrop-blur-sm border border-gray-200/60 rounded-lg text-xs transition-all duration-300 shadow-sm";
    
    if (compact) {
      switch (containerWidth) {
        case 'full':
          return `${baseClasses} w-full px-3 py-2`;
        case 'auto':
          return `${baseClasses} max-w-xs px-2 py-1`;
        case 'message':
        default:
          return `${baseClasses} w-full max-w-2xl px-3 py-2`; // Match typical message width
      }
    } else {
      switch (containerWidth) {
        case 'full':
          return `${baseClasses} w-full px-4 py-3 space-y-2`;
        case 'auto':
          return `${baseClasses} max-w-sm px-3 py-2 space-y-2`;
        case 'message':
        default:
          return `${baseClasses} w-full max-w-2xl px-4 py-3 space-y-2`; // Match message bubble width
      }
    }
  };

  return (
    <div className={getContainerClasses()}>
      {/* Main Status Display */}
      <div className="flex items-center gap-2">
        {/* Cancelled State - from RunResponseCancelledEvent */}
        {streamingStatus.isCancelled && (
          <>
            <XCircle className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700 font-medium">Dibatalkan</span>
            {streamingStatus.cancelReason && (
              <span className="text-gray-500 text-xs">({streamingStatus.cancelReason})</span>
            )}
          </>
        )}

        {/* Paused State - from RunResponsePausedEvent */}
        {streamingStatus.isPaused && (
          <>
            <PauseCircle className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700 font-medium">Dijeda</span>
          </>
        )}

        {/* Thinking/Reasoning Phase - from RunStarted/ReasoningStartedEvent */}
        {(streamingStatus.isThinking || streamingStatus.isReasoningActive) && !streamingStatus.isPaused && !streamingStatus.isCancelled && (
          <>
            <Brain className="w-4 h-4 text-gray-600 animate-pulse" />
            <span className="text-gray-700 font-medium">
              {streamingStatus.isReasoningActive ? 'Bernalar...' : 'Berpikir...'}
            </span>
            <div className="flex gap-1 ml-auto">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
            </div>
          </>
        )}

        {/* Tool Call Phase - from ToolCallStartedEvent */}
        {streamingStatus.isCallingTool && !streamingStatus.isPaused && !streamingStatus.isCancelled && (
          <>
            <Wrench className="w-4 h-4 text-blue-600 animate-spin" style={{ animationDuration: '2s' }} />
            <span className="text-gray-700 font-medium">
              {streamingStatus.toolName ? `Menggunakan ${streamingStatus.toolName}` : 'Mengakses tools...'}
            </span>
            <div className="w-2 h-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin ml-auto"></div>
          </>
        )}

        {/* Knowledge Access Phase - from AccessingKnowledge */}
        {streamingStatus.isAccessingKnowledge && !streamingStatus.isPaused && !streamingStatus.isCancelled && (
          <>
            <BookOpen className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-gray-700 font-medium">Mengakses pengetahuan...</span>
            <div className="flex gap-1 ml-auto">
              <div className="w-1 h-3 bg-blue-400 animate-pulse"></div>
              <div className="w-1 h-4 bg-blue-500 animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-2 bg-blue-400 animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          </>
        )}

        {/* Memory Update Phase - from MemoryUpdateStartedEvent */}
        {streamingStatus.isMemoryUpdateStarted && !streamingStatus.isPaused && !streamingStatus.isCancelled && (
          <>
            <Database className="w-4 h-4 text-gray-600 animate-pulse" />
            <span className="text-gray-700 font-medium">Memperbarui memori...</span>
            <div className="flex gap-0.5 ml-auto">
              <div className="w-0.5 h-3 bg-gray-400 animate-pulse"></div>
              <div className="w-0.5 h-4 bg-gray-500 animate-pulse" style={{ animationDelay: '200ms' }}></div>
              <div className="w-0.5 h-3 bg-gray-400 animate-pulse" style={{ animationDelay: '400ms' }}></div>
            </div>
          </>
        )}

        {/* Error State - from RunResponseErrorEvent */}
        {streamingStatus.errorMessage && (
          <>
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-600 font-medium">Error</span>
            {!compact && (
              <span className="text-red-500 text-xs truncate">({streamingStatus.errorMessage})</span>
            )}
          </>
        )}

        {/* Completed Phase - from RunResponseCompletedEvent */}
        {streamingStatus.hasCompleted && !isStreaming && (
          <>
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-gray-700 font-medium">Selesai</span>
          </>
        )}

        {/* Default Processing - during RunResponseContentEvent */}
        {isStreaming && 
         !streamingStatus.isThinking && 
         !streamingStatus.isCallingTool && 
         !streamingStatus.isAccessingKnowledge && 
         !streamingStatus.isMemoryUpdateStarted &&
         !streamingStatus.isReasoningActive &&
         !streamingStatus.isPaused &&
         !streamingStatus.isCancelled && (
          <>
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">Memproses respons...</span>
            <div className="flex gap-1 ml-auto">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '100ms' }}></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
            </div>
          </>
        )}
      </div>

      {/* Current Chunk Display - Real-time content preview */}
      {displayChunk && !streamingStatus.hasCompleted && (
        <div className={`transition-all duration-300 ${chunkTransitioning ? 'opacity-0 transform -translate-y-1' : 'opacity-100 transform translate-y-0'}`}>
          <div className="bg-white border border-gray-200 rounded-md px-3 py-2 mt-2 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mt-1 flex-shrink-0"></div>
              <div className="text-gray-700 text-sm leading-relaxed max-h-20 overflow-hidden">
                <span className="text-blue-600 text-xs font-medium uppercase tracking-wide block mb-1">
                  Content Preview
                </span>
                <p className="line-clamp-3">{displayChunk}</p>
                {displayChunk.length > 100 && (
                  <div className="text-xs text-gray-500 mt-1">...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Information Display (only in non-compact mode) */}
      {!compact && (
        <>
          {/* Model Information - from RunResponseStartedEvent */}
          {(streamingStatus.currentModel || streamingStatus.modelProvider) && (
            <div className="flex items-center gap-2 text-xs bg-white rounded-md px-2 py-1 border border-gray-200">
              <Cpu className="w-3 h-3 text-gray-500" />
              <span className="text-gray-700 font-medium">
                {streamingStatus.currentModel}
                {streamingStatus.modelProvider && ` (${streamingStatus.modelProvider})`}
              </span>
            </div>
          )}

          {/* Current Reasoning Step - from ReasoningStepEvent */}
          {streamingStatus.currentReasoningStep && (
            <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-md px-2 py-1 border border-gray-200">
              <MessageSquare className="w-3 h-3 text-gray-600" />
              <span className="text-gray-700 truncate font-medium">{streamingStatus.currentReasoningStep}</span>
            </div>
          )}

          {/* Content Indicators - from various RunResponse events */}
          {(streamingStatus.citationsCount || streamingStatus.hasImages || streamingStatus.hasVideos || streamingStatus.hasAudio) && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Citations - from RunResponseContentEvent.citations */}
              {streamingStatus.citationsCount && streamingStatus.citationsCount > 0 && (
                <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1 border border-gray-200">
                  <FileText className="w-3 h-3 text-gray-600" />
                  <span className="text-gray-700 text-xs font-medium">{streamingStatus.citationsCount} referensi</span>
                </div>
              )}

              {/* Media Indicators - from RunResponseCompletedEvent */}
              {streamingStatus.hasImages && (
                <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1 border border-gray-200">
                  <Image className="w-3 h-3 text-gray-600" />
                  <span className="text-gray-700 text-xs font-medium">Gambar</span>
                </div>
              )}

              {streamingStatus.hasVideos && (
                <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1 border border-gray-200">
                  <Video className="w-3 h-3 text-gray-600" />
                  <span className="text-gray-700 text-xs font-medium">Video</span>
                </div>
              )}

              {streamingStatus.hasAudio && (
                <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1 border border-gray-200">
                  <Volume2 className="w-3 h-3 text-gray-600" />
                  <span className="text-gray-700 text-xs font-medium">Audio</span>
                </div>
              )}
            </div>
          )}

          {/* Processing Metrics - from RunResponse.metrics */}
          {streamingStatus.processingMetrics && (
            <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-md px-2 py-1 border border-gray-200">
              <BarChart3 className="w-3 h-3 text-gray-500" />
              <span className="text-gray-600">
                {streamingStatus.processingMetrics.tokensUsed && `${streamingStatus.processingMetrics.tokensUsed} token`}
                {streamingStatus.processingMetrics.processingTime && ` • ${streamingStatus.processingMetrics.processingTime}ms`}
              </span>
            </div>
          )}

          {/* Extra Data Display - from RunResponse.extra_data */}
          {(streamingStatus.references?.length || 
            streamingStatus.reasoningMessages?.length || 
            streamingStatus.historyEntries?.length ||
            streamingStatus.addMessages?.length ||
            streamingStatus.citations?.length ||
            Object.keys(streamingStatus.metadata || {}).length) > 0 && (
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Informasi Tambahan
              </div>
              
              <div className="space-y-2">
                {/* Citations Display */}
                {streamingStatus.citations && streamingStatus.citations.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <div className="flex items-center gap-1 mb-1">
                      <ExternalLink className="w-3 h-3" />
                      <span className="font-medium">Citations ({streamingStatus.citations.length})</span>
                    </div>
                    <div className="space-y-1 ml-4">
                      {streamingStatus.citations.slice(0, 3).map((citation, index) => (
                        <div key={citation.id || index} className="bg-white border border-gray-200 rounded p-2">
                          <div className="font-medium text-gray-800 text-xs">
                            {citation.title}
                          </div>
                          {citation.source && (
                            <div className="text-gray-500 text-xs mt-1">
                              📍 {citation.source}
                            </div>
                          )}
                          {citation.excerpt && (
                            <div className="text-gray-600 text-xs mt-1 line-clamp-2">
                              "{citation.excerpt.length > 100 
                                ? citation.excerpt.substring(0, 100) + '...' 
                                : citation.excerpt}"
                            </div>
                          )}
                          {citation.url && (
                            <a 
                              href={citation.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 text-xs underline mt-1 inline-block hover:text-blue-800"
                            >
                              Lihat Sumber
                            </a>
                          )}
                        </div>
                      ))}
                      {streamingStatus.citations.length > 3 && (
                        <div className="text-gray-500 text-xs">
                          +{streamingStatus.citations.length - 3} citations lainnya
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* References Display */}
                {streamingStatus.references && streamingStatus.references.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <div className="flex items-center gap-1 mb-1">
                      <ExternalLink className="w-3 h-3" />
                      <span className="font-medium">References ({streamingStatus.references.length})</span>
                    </div>
                    <div className="space-y-1 ml-4">
                      {streamingStatus.references.slice(0, 2).map((ref, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span>📄</span>
                          <span className="truncate">{ref.title}</span>
                          {ref.url && (
                            <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              ↗
                            </a>
                          )}
                        </div>
                      ))}
                      {streamingStatus.references.length > 2 && (
                        <div className="text-gray-500">+{streamingStatus.references.length - 2} lainnya</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 