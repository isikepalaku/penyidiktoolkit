import React from 'react';
import { Brain, Wrench, Database, CheckCircle, Loader2 } from 'lucide-react';

interface StreamingStatusProps {
  isStreaming: boolean;
  currentStatus: {
    isThinking?: boolean;
    isCallingTool?: boolean;
    toolName?: string;
    isUpdatingMemory?: boolean;
    hasCompleted?: boolean;
  };
}

export default function StreamingStatus({ isStreaming, currentStatus }: StreamingStatusProps) {
  if (!isStreaming && !currentStatus.hasCompleted) return null;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Thinking Animation */}
        {currentStatus.isThinking && (
          <div className="flex items-center gap-2 text-purple-600">
            <Brain className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-medium">Menganalisis pertanyaan...</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {/* Tool Call Animation */}
        {currentStatus.isCallingTool && (
          <div className="flex items-center gap-2 text-blue-600">
            <Wrench className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium">
              {currentStatus.toolName ? `Menggunakan ${currentStatus.toolName}...` : 'Mengakses knowledge base...'}
            </span>
            <Loader2 className="w-3 h-3 animate-spin" />
          </div>
        )}

        {/* Memory Update Animation */}
        {currentStatus.isUpdatingMemory && (
          <div className="flex items-center gap-2 text-green-600">
            <Database className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-medium">Menyimpan informasi ke memori...</span>
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
              <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
            </div>
          </div>
        )}

        {/* Completion Animation */}
        {currentStatus.hasCompleted && !isStreaming && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Respons selesai</span>
          </div>
        )}

        {/* Default Streaming */}
        {isStreaming && !currentStatus.isThinking && !currentStatus.isCallingTool && !currentStatus.isUpdatingMemory && (
          <div className="flex items-center gap-2 text-purple-600">
            <img src="/img/wassidik.svg" alt="Wassidik AI" className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-medium">Menyusun respons...</span>
            <Loader2 className="w-3 h-3 animate-spin" />
          </div>
        )}
      </div>
      
      {/* Compact Progress indicators */}
      {isStreaming && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={`w-1.5 h-1.5 rounded-full ${currentStatus.isThinking ? 'bg-purple-400' : 'bg-gray-300'}`}></div>
            <span className="text-xs">Thinking</span>
            
            <div className={`w-1.5 h-1.5 rounded-full ${currentStatus.isCallingTool ? 'bg-blue-400' : 'bg-gray-300'}`}></div>
            <span className="text-xs">Knowledge</span>
            
            <div className={`w-1.5 h-1.5 rounded-full ${currentStatus.isUpdatingMemory ? 'bg-green-400' : 'bg-gray-300'}`}></div>
            <span className="text-xs">Memory</span>
          </div>
        </div>
      )}
    </div>
  );
} 