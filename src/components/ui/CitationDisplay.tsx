import React, { useState } from 'react';
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

  if (!references || references.length === 0) {
    return null;
  }

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
      compact ? "text-xs" : "text-sm",
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200/60 bg-gray-100/50">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-gray-700">
            Sumber Knowledge Base
          </span>
          <span className="text-gray-600">
            ({totalReferences} referensi dari {uniqueSources.length} dokumen)
          </span>
        </div>
        
        {/* Source documents summary */}
        <div className="mt-2 flex flex-wrap gap-1">
          {uniqueSources.map((source, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded-md text-gray-600 shadow-sm"
            >
              <FileText className="w-3 h-3" />
              {source}
            </span>
          ))}
        </div>
      </div>

      {/* Citation Groups */}
      <div className="divide-y divide-gray-200/60">
        {references.map((group, groupIndex) => (
          <div key={groupIndex} className="p-4">
            {/* Query Section */}
            {group.query && (
              <div className="mb-3">
                <button
                  onClick={() => toggleGroup(groupIndex)}
                  className="flex items-center gap-2 w-full text-left hover:bg-gray-50 rounded-md p-2 transition-colors"
                >
                  {expandedGroups.has(groupIndex) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <Search className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-gray-700">
                    Query: {group.query}
                  </span>
                  {group.time && (
                    <span className="text-xs text-gray-600 ml-auto flex items-center gap-1">
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
                    className="border border-gray-200/60 rounded-md bg-white/80 backdrop-blur-sm shadow-sm"
                  >
                    {/* Reference Header */}
                    <div className="p-3 border-b border-gray-200/60 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-700">
                            {ref.name}
                          </span>
                          {ref.meta_data?.chunk && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              Chunk {ref.meta_data.chunk}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleReference(refId)}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              Tutup
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-3 h-3" />
                              Lihat Isi
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Metadata */}
                      {ref.meta_data && (
                        <div className="mt-2 flex gap-4 text-xs text-gray-600">
                          {ref.meta_data.chunk && (
                            <span>Chunk: {ref.meta_data.chunk}</span>
                          )}
                          {ref.meta_data.chunk_size && (
                            <span>Size: {ref.meta_data.chunk_size} chars</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reference Content */}
                    {isExpanded && (
                      <div className="p-3">
                        <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {ref.content.length > 1000 ? (
                            <>
                              {ref.content.substring(0, 1000)}
                              <span className="text-blue-600 italic">
                                ... (konten dipotong, total {ref.content.length} karakter)
                              </span>
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