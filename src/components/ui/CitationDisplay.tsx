import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileText, Search, Clock, Database } from 'lucide-react';
import { cn } from '@/utils/utils';

// Interface untuk citation structure berdasarkan response JSON dari API
interface CitationReference {
  content: string;
  meta_data?: {
    chunk?: number;
    chunk_size?: number;
    [key: string]: any;
  };
  name: string;
}

interface CitationGroup {
  query?: string;
  references?: CitationReference[];
  time?: number;
}

interface CitationDisplayProps {
  references?: CitationGroup[];
  compact?: boolean;
  className?: string;
}

const CitationDisplay: React.FC<CitationDisplayProps> = ({ 
  references = [], 
  compact = false,
  className = ""
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [expandedReferences, setExpandedReferences] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Auto-detect mobile untuk adaptive behavior
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!references || references.length === 0) {
    return null;
  }

  // Force compact mode di mobile
  const isCompactMode = compact || isMobile;

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleReference = (refId: string) => {
    setExpandedReferences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(refId)) {
        newSet.delete(refId);
      } else {
        newSet.add(refId);
      }
      return newSet;
    });
  };

  // Get unique source documents
  const allSources = references.flatMap(group => 
    group.references?.map(ref => ref.name) || []
  );
  const uniqueSources = [...new Set(allSources)];
  const totalReferences = references.reduce((acc, group) => 
    acc + (group.references?.length || 0), 0
  );

  return (
    <div className={cn(
      "border border-gray-200/60 rounded-lg bg-gray-50/80 backdrop-blur-sm shadow-sm",
      // Responsive text size
      isCompactMode ? "text-xs" : "text-sm",
      // Responsive margin untuk mobile
      "mx-2 sm:mx-0",
      // Max width untuk mobile
      "max-w-full overflow-hidden",
      className
    )}>
      {/* Header dengan responsive layout */}
      <div className="px-3 sm:px-4 py-3 border-b border-gray-200/60 bg-gray-100/50">
        {/* Main title - responsive flex */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Database className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-medium text-gray-700 truncate">
              Sumber Knowledge Base
            </span>
          </div>
          
          {/* Stats - wrap to new line on mobile */}
          <span className="text-gray-600 text-xs sm:text-sm">
            ({totalReferences} referensi dari {uniqueSources.length} dokumen)
          </span>
        </div>
        
        {/* Source documents - responsive grid */}
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {uniqueSources.map((source, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded-md text-gray-600 shadow-sm truncate"
            >
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate" title={source}>{source}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Citation Groups */}
      <div className="divide-y divide-gray-200/60">
        {references.map((group, groupIndex) => (
          <div key={groupIndex} className="p-3 sm:p-4">
            {/* Query Section dengan responsive button */}
            {group.query && (
              <div className="mb-3">
                <button
                  onClick={() => toggleGroup(groupIndex)}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 w-full text-left hover:bg-gray-50 rounded-md p-2 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {expandedGroups.has(groupIndex) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <Search className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700 break-words word-wrap-break-word">
                      Query: {group.query}
                    </span>
                  </div>
                  
                  {/* Time display - separate line on mobile */}
                  {group.time && (
                    <span className="text-xs text-gray-600 flex items-center gap-1 self-start sm:self-auto">
                      <Clock className="w-3 h-3" />
                      {group.time.toFixed(2)}s
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* References List */}
            <div className={cn(
              "space-y-3",
              group.query && !expandedGroups.has(groupIndex) && "hidden"
            )}>
              {group.references?.map((ref, refIndex) => {
                const refId = `${groupIndex}-${refIndex}`;
                const isExpanded = expandedReferences.has(refId);
                
                return (
                  <div 
                    key={refIndex}
                    className="border border-gray-200/60 rounded-md bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden"
                  >
                    {/* Reference Header - stacked on mobile */}
                    <div className="p-3 border-b border-gray-200/60 bg-gray-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="font-medium text-gray-700 break-words word-wrap-break-word" title={ref.name}>
                            {ref.name}
                          </span>
                          {ref.meta_data?.chunk && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                              Chunk {ref.meta_data.chunk}
                            </span>
                          )}
                        </div>
                        
                        {/* Expand button - full width touch target on mobile */}
                        <button
                          onClick={() => toggleReference(refId)}
                          className="flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors p-2 sm:p-1 rounded bg-gray-100 sm:bg-transparent hover:bg-gray-200 min-h-[44px] sm:min-h-0"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              <span className="sm:hidden">Tutup Konten</span>
                              <span className="hidden sm:inline">Tutup</span>
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-3 h-3" />
                              <span className="sm:hidden">Lihat Konten</span>
                              <span className="hidden sm:inline">Lihat Isi</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Metadata - responsive layout */}
                      {ref.meta_data && (
                        <div className="mt-2 flex flex-wrap gap-2 sm:gap-4 text-xs text-gray-600">
                          {ref.meta_data.chunk && (
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              Chunk: {ref.meta_data.chunk}
                            </span>
                          )}
                          {ref.meta_data.chunk_size && (
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              Size: {ref.meta_data.chunk_size} chars
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reference Content - mobile optimized */}
                    {isExpanded && (
                      <div className="p-3">
                        <div className="text-gray-700 text-sm leading-relaxed break-words word-wrap-break-word overflow-wrap-break-word whitespace-pre-wrap">
                          {ref.content.length > (isMobile ? 500 : 1000) ? (
                            <>
                              {ref.content.substring(0, isMobile ? 500 : 1000)}
                              <div className="mt-2 text-blue-600 italic text-xs">
                                ... (konten dipotong untuk optimasi {isMobile ? 'mobile' : 'desktop'}, total {ref.content.length} karakter)
                              </div>
                            </>
                          ) : (
                            ref.content
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CitationDisplay; 