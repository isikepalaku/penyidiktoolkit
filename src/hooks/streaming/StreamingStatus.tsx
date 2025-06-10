import React from 'react';
import { Brain, Wrench, Database, CheckCircle, BookOpen, PauseCircle, PlayCircle, XCircle, Cpu, FileText, Image, Video, Volume2, BarChart3, MessageSquare } from 'lucide-react';

interface StreamingStatusProps {
  isStreaming: boolean;
  streamingStatus: {
    isThinking?: boolean;           // from RunStarted/ReasoningStarted
    isCallingTool?: boolean;        // from ToolCallStarted
    toolName?: string;              // tool name from ToolCallStarted
    isAccessingKnowledge?: boolean; // from AccessingKnowledge (custom)
    isMemoryUpdateStarted?: boolean; // from MemoryUpdateStarted (updated from isUpdatingMemory)
    hasCompleted?: boolean;         // from RunCompleted
    isPaused?: boolean;             // from RunPaused (new)
    isCancelled?: boolean;          // from RunCancelled (new)
    // Enhanced properties from Agno documentation
    currentModel?: string;          // from RunResponseStartedEvent.model
    modelProvider?: string;         // from RunResponseStartedEvent.model_provider
    reasoningSteps?: Array<{ step: number; description: string; content?: string; }>;
    isReasoningActive?: boolean;    // from ReasoningStartedEvent
    currentReasoningStep?: string;  // from ReasoningStepEvent.reasoning_content
    citationsCount?: number;        // from RunResponseContentEvent.citations
    hasImages?: boolean;            // from RunResponseContentEvent.image
    hasVideos?: boolean;            // from RunResponseCompletedEvent.videos
    hasAudio?: boolean;             // from RunResponseCompletedEvent.audio
    contentType?: string;           // from RunResponseContentEvent.content_type
    errorMessage?: string;          // from RunResponseErrorEvent.content
    cancelReason?: string;          // from RunResponseCancelledEvent.reason
    processingMetrics?: {
      tokensUsed?: number;
      processingTime?: number;
    };
  };
  compact?: boolean;
}

export default function StreamingStatus({ 
  isStreaming, 
  streamingStatus, 
  compact = false 
}: StreamingStatusProps) {
  // Only show if there's an active streaming status or completion
  if (!isStreaming && !streamingStatus.hasCompleted && !streamingStatus.isPaused && !streamingStatus.isCancelled) return null;

  const containerClass = compact 
    ? "max-w-xs bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-xs"
    : "max-w-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs space-y-2";

  return (
    <div className={containerClass}>
      {/* Main Status Display */}
      <div className="flex items-center gap-2">
        {/* Cancelled State - from RunResponseCancelledEvent */}
        {streamingStatus.isCancelled && (
          <>
            <XCircle className="w-3 h-3 text-red-400" />
            <span className="text-red-300 font-mono">Cancelled</span>
            {streamingStatus.cancelReason && (
              <span className="text-red-200 text-xs">({streamingStatus.cancelReason})</span>
            )}
          </>
        )}

        {/* Paused State - from RunResponsePausedEvent */}
        {streamingStatus.isPaused && (
          <>
            <PauseCircle className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-300 font-mono">Paused</span>
          </>
        )}

        {/* Thinking/Reasoning Phase - from RunStarted/ReasoningStartedEvent */}
        {(streamingStatus.isThinking || streamingStatus.isReasoningActive) && !streamingStatus.isPaused && !streamingStatus.isCancelled && (
          <>
            <Brain className="w-3 h-3 text-green-400 animate-pulse" />
            <span className="text-green-300 font-mono">
              {streamingStatus.isReasoningActive ? 'Reasoning...' : 'Thinking...'}
            </span>
            <div className="flex gap-0.5 ml-auto">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
            </div>
          </>
        )}

        {/* Tool Call Phase - from ToolCallStartedEvent */}
        {streamingStatus.isCallingTool && !streamingStatus.isPaused && !streamingStatus.isCancelled && (
          <>
            <Wrench className="w-3 h-3 text-yellow-400 animate-spin" style={{ animationDuration: '2s' }} />
            <span className="text-yellow-300 font-mono">
              {streamingStatus.toolName ? `Using ${streamingStatus.toolName}` : 'Calling tools'}
            </span>
            <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse ml-auto"></div>
          </>
        )}

        {/* Knowledge Access Phase - from AccessingKnowledge */}
        {streamingStatus.isAccessingKnowledge && !streamingStatus.isPaused && !streamingStatus.isCancelled && (
          <>
            <BookOpen className="w-3 h-3 text-blue-400 animate-pulse" />
            <span className="text-blue-300 font-mono">Accessing knowledge...</span>
            <div className="flex gap-0.5 ml-auto">
              <div className="w-1 h-2 bg-blue-400 animate-pulse"></div>
              <div className="w-1 h-3 bg-blue-400 animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-blue-400 animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          </>
        )}

        {/* Memory Update Phase - from MemoryUpdateStartedEvent */}
        {streamingStatus.isMemoryUpdateStarted && !streamingStatus.isPaused && !streamingStatus.isCancelled && (
          <>
            <Database className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-mono">Updating memory...</span>
            <div className="flex gap-0.5 ml-auto">
              <div className="w-0.5 h-2 bg-cyan-400 animate-pulse"></div>
              <div className="w-0.5 h-3 bg-cyan-400 animate-pulse" style={{ animationDelay: '200ms' }}></div>
              <div className="w-0.5 h-2 bg-cyan-400 animate-pulse" style={{ animationDelay: '400ms' }}></div>
            </div>
          </>
        )}

        {/* Error State - from RunResponseErrorEvent */}
        {streamingStatus.errorMessage && (
          <>
            <XCircle className="w-3 h-3 text-red-400" />
            <span className="text-red-300 font-mono">Error</span>
            {!compact && (
              <span className="text-red-200 text-xs truncate">({streamingStatus.errorMessage})</span>
            )}
          </>
        )}

        {/* Completed Phase - from RunResponseCompletedEvent */}
        {streamingStatus.hasCompleted && !isStreaming && (
          <>
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-green-300 font-mono">Complete</span>
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
            <div className="w-3 h-3 border border-green-400 rounded-full animate-spin"></div>
            <span className="text-green-300 font-mono">Processing...</span>
          </>
        )}
      </div>

      {/* Enhanced Information Display (only in non-compact mode) */}
      {!compact && (
        <>
          {/* Model Information - from RunResponseStartedEvent */}
          {(streamingStatus.currentModel || streamingStatus.modelProvider) && (
            <div className="flex items-center gap-2 text-xs">
              <Cpu className="w-3 h-3 text-blue-400" />
              <span className="text-blue-300">
                {streamingStatus.currentModel}
                {streamingStatus.modelProvider && ` (${streamingStatus.modelProvider})`}
              </span>
            </div>
          )}

          {/* Current Reasoning Step - from ReasoningStepEvent */}
          {streamingStatus.currentReasoningStep && (
            <div className="flex items-center gap-2 text-xs">
              <MessageSquare className="w-3 h-3 text-purple-400" />
              <span className="text-purple-300 truncate">{streamingStatus.currentReasoningStep}</span>
            </div>
          )}

          {/* Content Indicators - from various RunResponse events */}
          <div className="flex items-center gap-3">
            {/* Citations - from RunResponseContentEvent.citations */}
            {streamingStatus.citationsCount && streamingStatus.citationsCount > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-orange-400" />
                <span className="text-orange-300 text-xs">{streamingStatus.citationsCount}</span>
              </div>
            )}

            {/* Media Indicators - from RunResponseCompletedEvent */}
            {streamingStatus.hasImages && (
              <div className="flex items-center gap-1">
                <Image className="w-3 h-3 text-pink-400" />
                <span className="text-pink-300 text-xs">IMG</span>
              </div>
            )}

            {streamingStatus.hasVideos && (
              <div className="flex items-center gap-1">
                <Video className="w-3 h-3 text-indigo-400" />
                <span className="text-indigo-300 text-xs">VID</span>
              </div>
            )}

            {streamingStatus.hasAudio && (
              <div className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-green-400" />
                <span className="text-green-300 text-xs">AUD</span>
              </div>
            )}
          </div>

          {/* Processing Metrics - from RunResponse.metrics */}
          {streamingStatus.processingMetrics && (
            <div className="flex items-center gap-2 text-xs">
              <BarChart3 className="w-3 h-3 text-gray-400" />
              <span className="text-gray-300">
                {streamingStatus.processingMetrics.tokensUsed && `${streamingStatus.processingMetrics.tokensUsed} tokens`}
                {streamingStatus.processingMetrics.processingTime && ` • ${streamingStatus.processingMetrics.processingTime}ms`}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
} 