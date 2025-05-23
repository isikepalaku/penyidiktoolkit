import React, { useState, useEffect } from 'react';
import { X, BarChart3, PieChart, RefreshCw, TrendingUp } from 'lucide-react';
import SentimentChart from './SentimentChart';
import SentimentDisplay from './SentimentDisplay';
import { SentimentAnalysisResult, WebSource } from '../../types/sentiment';

interface SentimentAnalysisCanvasProps {
  content: string;
  onClose: () => void;
  title?: string;
  isLoading?: boolean;
}

interface ParsedSentimentData {
  analysis: SentimentAnalysisResult | null;
  sources: WebSource[];
  searchQueries: string[];
}

const SentimentAnalysisCanvas: React.FC<SentimentAnalysisCanvasProps> = ({ 
  content, 
  onClose, 
  title = "Analisis Sentimen",
  isLoading = false 
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [parsedData, setParsedData] = useState<ParsedSentimentData>({
    analysis: null,
    sources: [],
    searchQueries: []
  });

  // Add mobile viewport meta tag optimization
  React.useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
    
    // Cleanup on unmount
    return () => {
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    };
  }, []);

  // Parse content dari agentSentimentAnalyst.ts
  const parseContent = (rawContent: string): ParsedSentimentData => {
    try {
      // Extract distribusi sentimen
      const positiveMatch = rawContent.match(/• Positif: ([\d.]+)%/);
      const negativeMatch = rawContent.match(/• Negatif: ([\d.]+)%/);
      const neutralMatch = rawContent.match(/• Netral: ([\d.]+)%/);

      // Extract summary (everything before DISTRIBUSI SENTIMEN)
      const summaryMatch = rawContent.split('**DISTRIBUSI SENTIMEN:**')[0].trim();

      // Extract sources
      const sourcesSection = rawContent.match(/\*\*SUMBER REFERENSI:\*\*([\s\S]*?)(?=\*\*|$)/);
      const sources: WebSource[] = [];
      if (sourcesSection) {
        const sourceLines = sourcesSection[1].split('\n').filter(line => line.trim());
        sourceLines.forEach(line => {
          const match = line.match(/\d+\.\s+\[([^\]]+)\]\(([^)]+)\)/);
          if (match) {
            sources.push({
              title: match[1],
              uri: match[2]
            });
          }
        });
      }

      // Extract search queries
      const queryMatch = rawContent.match(/\*\*QUERY PENCARIAN:\*\*\s*([^\n]*)/);
      const searchQueries = queryMatch ? queryMatch[1].split(',').map(q => q.trim()) : [];

      // Build analysis result
      let analysis: SentimentAnalysisResult | null = null;
      if (positiveMatch && negativeMatch && neutralMatch && summaryMatch) {
        analysis = {
          summary: summaryMatch,
          sentimentData: {
            positive: parseFloat(positiveMatch[1]),
            negative: parseFloat(negativeMatch[1]),
            neutral: parseFloat(neutralMatch[1])
          }
        };
      }

      return {
        analysis,
        sources,
        searchQueries
      };
    } catch (error) {
      console.error('Error parsing sentiment content:', error);
      return {
        analysis: null,
        sources: [],
        searchQueries: []
      };
    }
  };

  useEffect(() => {
    if (content) {
      const parsed = parseContent(content);
      setParsedData(parsed);
    }
  }, [content]);

  const getSentimentTrend = () => {
    if (!parsedData.analysis) return null;
    
    const { positive, negative, neutral } = parsedData.analysis.sentimentData;
    if (positive > negative && positive > neutral) {
      return { trend: 'positive', dominant: positive, label: 'Dominan Positif' };
    } else if (negative > positive && negative > neutral) {
      return { trend: 'negative', dominant: negative, label: 'Dominan Negatif' };
    } else {
      return { trend: 'neutral', dominant: neutral, label: 'Dominan Netral' };
    }
  };

  const trend = getSentimentTrend();

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 z-30"
        onClick={onClose}
      />
      
      {/* Canvas dengan margin yang lebih kecil di mobile dan sinkron dengan sidebar di desktop */}
      <div className="fixed inset-2 sm:inset-4 lg:left-72 lg:inset-y-4 lg:right-4 bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden z-40 shadow-2xl max-h-screen">
        
        {/* Header - Optimized for mobile */}
        <div className="bg-gray-50 border-b border-gray-200 p-3 sm:p-4 lg:p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="p-1.5 sm:p-2 lg:p-3 bg-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-tight">{title}</h2>
              {trend && (
                <p className="text-xs sm:text-sm lg:text-base text-gray-600">
                  Status: <span className={`font-medium ${
                    trend.trend === 'positive' ? 'text-green-600' : 
                    trend.trend === 'negative' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {trend.label} ({trend.dominant.toFixed(1)}%)
                  </span>
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
            {/* Chart Type Toggle - Desktop friendly */}
            <div className="flex bg-gray-200 rounded-lg p-0.5 sm:p-1 lg:p-1.5">
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 sm:p-2 lg:p-3 rounded transition-colors duration-200 touch-manipulation min-w-[40px] min-h-[40px] lg:min-w-[48px] lg:min-h-[48px] flex items-center justify-center ${
                  chartType === 'bar' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title="Bar Chart"
              >
                <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`p-2 sm:p-2 lg:p-3 rounded transition-colors duration-200 touch-manipulation min-w-[40px] min-h-[40px] lg:min-w-[48px] lg:min-h-[48px] flex items-center justify-center ${
                  chartType === 'pie' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title="Pie Chart"
              >
                <PieChart className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 sm:p-2 lg:p-3 rounded-lg transition-colors duration-200 text-gray-600 hover:text-gray-800 hover:bg-gray-100 touch-manipulation min-w-[44px] min-h-[44px] lg:min-w-[52px] lg:min-h-[52px] flex items-center justify-center"
              title="Tutup"
            >
              <X className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </div>
        </div>

        {/* Content - Mobile optimized height and scrolling */}
        <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 10rem)' }}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center p-4 lg:p-8">
              <div className="flex flex-col items-center gap-4 lg:gap-6">
                <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-blue-600 animate-spin" />
                <p className="text-sm sm:text-base lg:text-lg text-gray-600 text-center">Menganalisis sentimen...</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col lg:flex-row">
              {/* Chart Panel - Padding lebih besar untuk desktop */}
              <div className="w-full flex-shrink-0 p-3 sm:p-4 lg:p-8 border-b border-gray-200 lg:border-b-0 lg:border-r lg:w-2/5 lg:flex-shrink lg:flex-grow-0 overflow-y-auto">
                <SentimentChart 
                  data={parsedData.analysis?.sentimentData || null} 
                  chartType={chartType}
                />
              </div>
              
              {/* Analysis Panel - Padding lebih besar untuk desktop */}
              <div className="w-full flex-1 p-3 sm:p-4 lg:p-8 lg:w-3/5 overflow-y-auto overscroll-contain">
                <SentimentDisplay 
                  analysis={parsedData.analysis}
                  sources={parsedData.sources}
                  searchQueries={parsedData.searchQueries}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer - Lebih besar untuk desktop */}
        <div className="bg-gray-50 border-t border-gray-200 p-2 sm:p-3 lg:p-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs lg:text-sm text-gray-500 gap-1 sm:gap-0">
            <span className="text-center sm:text-left">Powered by Google Gemini AI & Google Search</span>
            <span className="text-center sm:text-right">Data web terkini • Analisis real-time</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default SentimentAnalysisCanvas; 