import React, { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Copy, Check, ExternalLink, Search, Globe, Clock } from 'lucide-react';
import { SentimentAnalysisResult, WebSource } from '../../types/sentiment';

interface SentimentDisplayProps {
  analysis: SentimentAnalysisResult | null;
  sources: WebSource[] | null;
  searchQueries?: string[] | null;
}

const SentimentDisplay: React.FC<SentimentDisplayProps> = ({ analysis, sources, searchQueries }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'sources' | 'queries'>('summary');

  // Configure marked for Gemini-style output
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false,
  });

  const formatMarkdown = (content: string) => {
    try {
      // Process content to handle Gemini formatting
      const processedContent = content
        // Handle bold formatting
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-gray-900 font-semibold">$1</strong>')
        // Handle headers
        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-3 border-b border-gray-300 pb-2">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>')
        // Handle bullet points
        .replace(/^• (.+)$/gm, '<li class="text-gray-700 ml-4 mb-1">$1</li>')
        .replace(/^- (.+)$/gm, '<li class="text-gray-700 ml-4 mb-1">$1</li>')
        // Wrap lists
        .replace(/(<li[^>]*>.*<\/li>)/s, '<ul class="list-disc space-y-1 my-3">$1</ul>')
        // Handle line breaks
        .replace(/\n\n/g, '</p><p class="text-gray-700 leading-relaxed mb-3">')
        .replace(/\n/g, '<br>');

      // Wrap in paragraph if not already wrapped
      if (!processedContent.includes('<h1') && !processedContent.includes('<h2') && !processedContent.includes('<ul')) {
        return `<p class="text-gray-700 leading-relaxed mb-3">${processedContent}</p>`;
      }

      return processedContent;
    } catch (error) {
      console.error('Error formatting markdown:', error);
      return `<pre class="text-gray-700 whitespace-pre-wrap">${content}</pre>`;
    }
  };

  const handleCopy = async () => {
    if (!analysis) return;
    
    try {
      await navigator.clipboard.writeText(analysis.summary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (!analysis) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-xl min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] flex items-center justify-center border border-gray-200">
        <p className="text-sm sm:text-base lg:text-lg text-gray-500 text-center">Analisis sentimen akan muncul setelah permintaan selesai.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Tab Navigation - Desktop optimized */}
      <div className="bg-white rounded-lg shadow-xl border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-hide">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 font-medium transition-colors duration-200 text-sm sm:text-base lg:text-lg whitespace-nowrap touch-manipulation ${
              activeTab === 'summary'
                ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              <span className="hidden sm:inline">Analisis Sentimen</span>
              <span className="sm:hidden">Analisis</span>
            </div>
          </button>
          
          {sources && sources.length > 0 && (
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-3 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 font-medium transition-colors duration-200 text-sm sm:text-base lg:text-lg whitespace-nowrap touch-manipulation ${
                activeTab === 'sources'
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                <span>Sumber ({sources.length})</span>
              </div>
            </button>
          )}
          
          {searchQueries && searchQueries.length > 0 && (
            <button
              onClick={() => setActiveTab('queries')}
              className={`px-3 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 font-medium transition-colors duration-200 text-sm sm:text-base lg:text-lg whitespace-nowrap touch-manipulation ${
                activeTab === 'queries'
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                <Search className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                <span className="hidden sm:inline">Query Pencarian</span>
                <span className="sm:hidden">Query</span>
              </div>
            </button>
          )}
        </div>

        {/* Tab Content - Desktop optimized */}
        <div className="p-3 sm:p-6 lg:p-8">
          {activeTab === 'summary' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 lg:mb-6 gap-2 sm:gap-0">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800">Laporan Analisis Sentimen</h3>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 text-sm sm:text-base lg:text-lg bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 border border-gray-300 touch-manipulation self-start sm:self-auto"
                  title={isCopied ? "Tersalin!" : "Salin teks"}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                      <span className="text-green-600">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 lg:w-5 lg:h-5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
              
              <div 
                className="prose prose-gray max-w-none prose-sm sm:prose-base lg:prose-lg"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(formatMarkdown(analysis.summary))
                }}
              />
            </div>
          )}

          {activeTab === 'sources' && sources && sources.length > 0 && (
            <div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 lg:mb-6">Sumber Referensi Web</h3>
              <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                {sources.map((source, index) => (
                  <div 
                    key={index} 
                    className="p-3 sm:p-4 lg:p-6 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg line-clamp-2">
                          {source.title}
                        </h4>
                        <a
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm lg:text-base break-all hover:underline"
                        >
                          {source.uri}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 sm:mt-4 lg:mt-6 p-2 sm:p-3 lg:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 lg:gap-3 text-blue-700 text-xs sm:text-sm lg:text-base">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  <span>Sumber akan tetap dapat diakses selama 30 hari.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'queries' && searchQueries && searchQueries.length > 0 && (
            <div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 lg:mb-6">Query Pencarian yang Digunakan</h3>
              <div className="space-y-2 lg:space-y-3">
                {searchQueries.map((query, index) => (
                  <div 
                    key={index} 
                    className="p-2 sm:p-3 lg:p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2 lg:gap-3">
                      <Search className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-blue-500" />
                      <span className="text-gray-700 font-medium text-sm sm:text-base lg:text-lg">{query}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SentimentDisplay; 