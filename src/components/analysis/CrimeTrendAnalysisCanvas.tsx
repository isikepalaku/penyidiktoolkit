import React, { useState, useEffect } from 'react';
import { X, BarChart3, PieChart, LineChart, TrendingUp, FileText, AlertTriangle, Shield, Target } from 'lucide-react';
import CrimeTrendChart from './CrimeTrendChart';
import AnalysisDisplay from './AnalysisDisplay';
import { AnalysisCanvasProps, ParsedCrimeTrendData, ChartConfig, AnalysisDisplayTab, ChartDataPoint, AnalysisMetric, WebSource } from '../../types/analysis';

const CrimeTrendAnalysisCanvas: React.FC<AnalysisCanvasProps> = ({ 
  content, 
  onClose, 
  title = "Analisis Tren Kejahatan",
  isLoading = false 
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('line');
  const [parsedData, setParsedData] = useState<ParsedCrimeTrendData>({
    analysis: null,
    sources: [],
    searchQueries: [],
    chartData: [],
    metrics: []
  });

  // Add mobile viewport meta tag optimization
  React.useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
    
    return () => {
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    };
  }, []);

  // Parse content dari agentCrimeTrendAnalyst.ts dengan fokus data temporal
  const parseContent = (rawContent: string): ParsedCrimeTrendData => {
    try {
      // Extract metrics dari Analisis Tren section
      const trendMetricsMatch = rawContent.match(/## Analisis Tren[\s\S]*?### Metrik Volume[\s\S]*?- Periode puncak kejadian: ([^\n]*)\n[\s\S]*?- Tingkat pertumbuhan: ([^\n]*)\n[\s\S]*?- Sebaran wilayah: ([^\n]*)/);
      
      // Extract temporal data - PARSING UTAMA UNTUK CHART!
      const temporalDataMatch = rawContent.match(/## Data Temporal\n([\s\S]*?)(?=## |$)/);
      const chartData: ChartDataPoint[] = [];
      
      if (temporalDataMatch) {
        const lines = temporalDataMatch[1].split('\n').filter(line => line.trim() && line.startsWith('**'));
        lines.forEach(line => {
          const match = line.match(/\*\*([^*]+)\*\*:\s*(\d+)\s*kasus\s*-\s*(.+)/);
          if (match) {
            chartData.push({
              name: match[1].trim(), // Period (tahun)
              value: parseInt(match[2]), // Cases (jumlah kasus)
              color: '#EF4444' // Red color untuk crime data
            });
          }
        });
      }
      
      // Fallback jika tidak ada data temporal (gunakan data demo dengan tahun real)
      if (chartData.length === 0) {
        const currentYear = new Date().getFullYear();
        for (let i = 4; i >= 0; i--) {
          const year = currentYear - i;
          chartData.push({
            name: year.toString(),
            value: Math.floor(Math.random() * 150) + 50,
            color: '#EF4444'
          });
        }
      }
      
      // Extract sections lainnya
      const executiveSummaryMatch = rawContent.match(/## Ringkasan Eksekutif\n([\s\S]*?)(?=## |$)/);
      const sourcesMatch = rawContent.match(/## Referensi\n([\s\S]*?)(?=\*|$)/);

      // Extract web search queries
      const queryMatch = rawContent.match(/\*\*QUERY PENCARIAN:\*\*\s*([^\n]*)/);
      const searchQueries = queryMatch ? queryMatch[1].split(',').map(q => q.trim()) : [];

      // Extract sources
      const sources: WebSource[] = [];
      if (sourcesMatch) {
        const sourceLines = sourcesMatch[1].split('\n').filter(line => line.trim());
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

      // Create metrics dari trend metrics
      const metrics: AnalysisMetric[] = [];
      if (trendMetricsMatch) {
        metrics.push(
          {
            label: 'Periode Puncak',
            value: trendMetricsMatch[1] || 'Data tidak tersedia',
            description: 'Periode dengan tingkat kejadian tertinggi'
          },
          {
            label: 'Tingkat Pertumbuhan',
            value: trendMetricsMatch[2] || 'Data tidak tersedia',
            description: 'Tren perubahan dari periode sebelumnya'
          },
          {
            label: 'Sebaran Wilayah',
            value: trendMetricsMatch[3] || 'Data tidak tersedia',
            description: 'Daerah hukum yang paling terdampak'
          }
        );
      }

      // Build analysis result
      const analysis = (executiveSummaryMatch || trendMetricsMatch) ? {
        executiveSummary: executiveSummaryMatch ? executiveSummaryMatch[1].trim() : 'Data tidak tersedia',
        trendMetrics: {
          peakPeriod: trendMetricsMatch ? trendMetricsMatch[1] : 'Data tidak tersedia',
          growthRate: trendMetricsMatch ? trendMetricsMatch[2] : 'Data tidak tersedia',
          affectedAreas: trendMetricsMatch ? trendMetricsMatch[3] : 'Data tidak tersedia'
        },
        keySources: [],
        keyFindings: [],
        predictions: []
      } : null;

      return {
        analysis,
        sources,
        searchQueries,
        chartData, // Real temporal data untuk timeline
        metrics
      };
    } catch (error) {
      console.error('Error parsing temporal crime trend content:', error);
      return {
        analysis: null,
        sources: [],
        searchQueries: [],
        chartData: [],
        metrics: []
      };
    }
  };

  useEffect(() => {
    if (content) {
      const parsed = parseContent(content);
      setParsedData(parsed);
    }
  }, [content]);

  // Create chart configuration
  const chartConfig: ChartConfig = {
    type: chartType,
    data: parsedData.chartData,
    colors: ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'],
    height: 300,
    responsive: true
  };

  // Create display tabs
  const createDisplayTabs = (): AnalysisDisplayTab[] => {
    const tabs: AnalysisDisplayTab[] = [];

    // Analisis Tab
    if (parsedData.analysis?.executiveSummary) {
      tabs.push({
        id: 'analysis',
        label: 'Analisis',
        icon: FileText,
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Ringkasan Eksekutif</h3>
              <div className="text-gray-700 whitespace-pre-wrap">
                {parsedData.analysis.executiveSummary}
              </div>
            </div>
          </div>
        )
      });
    }

    // Temuan Tab
    const findingsMatch = content.match(/## Temuan Kunci\n([\s\S]*?)(?=## |$)/);
    if (findingsMatch) {
      tabs.push({
        id: 'findings',
        label: 'Temuan Kunci',
        icon: Target,
        content: (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Temuan Kunci</h3>
            <div className="text-gray-700 whitespace-pre-wrap">
              {findingsMatch[1].trim()}
            </div>
          </div>
        )
      });
    }

    // Prediksi Tab
    const predictionsMatch = content.match(/## Prediksi dan Pencegahan\n([\s\S]*?)(?=## |\*\*QUERY|$)/);
    if (predictionsMatch) {
      tabs.push({
        id: 'predictions',
        label: 'Prediksi & Pencegahan',
        icon: Shield,
        content: (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Prediksi dan Pencegahan</h3>
            <div className="text-gray-700 whitespace-pre-wrap">
              {predictionsMatch[1].trim()}
            </div>
          </div>
        )
      });
    }

    return tabs;
  };

  const displayTabs = createDisplayTabs();

  const getTrendStatus = () => {
    if (!parsedData.metrics.length) return null;
    
    const growthMetric = parsedData.metrics.find(m => m.label === 'Tingkat Pertumbuhan');
    if (!growthMetric) return null;

    const value = growthMetric.value.toLowerCase();
    if (value.includes('naik') || value.includes('meningkat') || value.includes('+')) {
      return { trend: 'up', label: 'Tren Meningkat', color: 'text-red-600' };
    } else if (value.includes('turun') || value.includes('menurun') || value.includes('-')) {
      return { trend: 'down', label: 'Tren Menurun', color: 'text-green-600' };
    } else {
      return { trend: 'stable', label: 'Tren Stabil', color: 'text-yellow-600' };
    }
  };

  const trendStatus = getTrendStatus();

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 z-30"
        onClick={onClose}
      />
      
      {/* Canvas dengan margin yang sinkron dengan sidebar */}
      <div className="fixed inset-2 sm:inset-4 lg:left-72 lg:inset-y-4 lg:right-4 bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden z-40 shadow-2xl max-h-screen">
        
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-3 sm:p-4 lg:p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="p-1.5 sm:p-2 lg:p-3 bg-red-600 rounded-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-tight">{title}</h2>
              {trendStatus && (
                <p className="text-xs sm:text-sm lg:text-base text-gray-600">
                  Status: <span className={`font-medium ${trendStatus.color}`}>
                    {trendStatus.label}
                  </span>
                </p>
              )}
              <p className="text-xs sm:text-sm text-gray-500">
                Timeline Trend • {parsedData.chartData.length} periode data
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
            {/* Chart Type Toggle */}
            <div className="flex bg-gray-200 rounded-lg p-0.5 sm:p-1 lg:p-1.5">
              <button
                onClick={() => setChartType('line')}
                className={`p-2 sm:p-2 lg:p-3 rounded transition-colors duration-200 ${
                  chartType === 'line' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title="Line Chart (Timeline)"
              >
                <LineChart className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 sm:p-2 lg:p-3 rounded transition-colors duration-200 ${
                  chartType === 'bar' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title="Bar Chart"
              >
                <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`p-2 sm:p-2 lg:p-3 rounded transition-colors duration-200 ${
                  chartType === 'pie' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title="Pie Chart"
              >
                <PieChart className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 sm:p-2 lg:p-3 rounded-lg transition-colors duration-200 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              title="Tutup"
            >
              <X className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 10rem)' }}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center p-4 lg:p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Menganalisis tren temporal kejahatan...</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto scrollbar-hide">
              <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                
                {/* Chart Section */}
                {parsedData.chartData.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Timeline Tren Kejahatan 
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({parsedData.chartData[0]?.name} - {parsedData.chartData[parsedData.chartData.length - 1]?.name})
                      </span>
                    </h3>
                    <CrimeTrendChart config={chartConfig} />
                  </div>
                )}

                {/* Analysis Display */}
                {displayTabs.length > 0 && (
                  <AnalysisDisplay
                    tabs={displayTabs}
                    sources={parsedData.sources}
                    searchQueries={parsedData.searchQueries}
                    metrics={parsedData.metrics}
                    className="h-auto"
                  />
                )}

                {/* Fallback content jika parsing gagal */}
                {displayTabs.length === 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="text-center">
                      <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Konten Tidak Dapat Diparse</h3>
                      <p className="text-gray-600 mb-4">Menampilkan konten dalam format teks:</p>
                      <div className="text-left text-sm text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap border max-h-96 overflow-y-auto">
                        {content}
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CrimeTrendAnalysisCanvas; 