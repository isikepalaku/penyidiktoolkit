import React from 'react';
import { Brain, Wrench, Database, CheckCircle, BookOpen } from 'lucide-react';

interface StreamingStatusProps {
  isStreaming: boolean;
  streamingStatus: {
    isThinking?: boolean;
    isCallingTool?: boolean;
    toolName?: string;
    isAccessingKnowledge?: boolean;
    isUpdatingMemory?: boolean;
    hasCompleted?: boolean;
  };
  compact?: boolean;
}

export default function StreamingStatus({ 
  isStreaming, 
  streamingStatus, 
  compact = false 
}: StreamingStatusProps) {
  // Only show if there's an active streaming status or completion
  if (!isStreaming && !streamingStatus.hasCompleted) return null;

  const containerClass = compact 
    ? "max-w-xs bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-xs"
    : "max-w-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs";

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2">
        {/* Thinking Phase - from RunStarted/ReasoningStarted */}
        {streamingStatus.isThinking && (
          <>
            <Brain className="w-3 h-3 text-green-400 animate-pulse" />
            <span className="text-green-300 font-mono">Thinking...</span>
            <div className="flex gap-0.5 ml-auto">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
            </div>
          </>
        )}

        {/* Tool Call Phase - from ToolCallStarted */}
        {streamingStatus.isCallingTool && (
          <>
            <Wrench className="w-3 h-3 text-yellow-400 animate-spin" style={{ animationDuration: '2s' }} />
            <span className="text-yellow-300 font-mono">
              {streamingStatus.toolName ? `Using ${streamingStatus.toolName}` : 'Calling tools'}
            </span>
            <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse ml-auto"></div>
          </>
        )}

        {/* Knowledge Access Phase - from AccessingKnowledge */}
        {streamingStatus.isAccessingKnowledge && (
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

        {/* Memory Update Phase - from UpdatingMemory */}
        {streamingStatus.isUpdatingMemory && (
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

        {/* Completed Phase - from RunCompleted */}
        {streamingStatus.hasCompleted && !isStreaming && (
          <>
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-green-300 font-mono">Complete</span>
          </>
        )}

        {/* Default Processing - during RunResponse */}
        {isStreaming && 
         !streamingStatus.isThinking && 
         !streamingStatus.isCallingTool && 
         !streamingStatus.isAccessingKnowledge && 
         !streamingStatus.isUpdatingMemory && (
          <>
            <div className="w-3 h-3 border border-green-400 rounded-full animate-spin"></div>
            <span className="text-green-300 font-mono">Processing...</span>
          </>
        )}
      </div>
    </div>
  );
} 