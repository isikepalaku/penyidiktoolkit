// Shared types for modular analysis components

export interface WebSource {
  uri: string;
  title: string;
}

export interface AnalysisMetric {
  label: string;
  value: string;
  description?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface SourceDetail {
  source: string;
  details: string;
  additionalInfo: string;
}

export interface FindingDetail {
  finding: string;
  modusOperandi: string;
  characteristics: string;
  recommendations: string;
}

export interface PredictionDetail {
  prediction: string;
  analysisBase: string;
  preventiveSteps: string;
}

// Crime Trend Analysis specific types
export interface CrimeTrendAnalysisResult {
  executiveSummary: string;
  trendMetrics: {
    peakPeriod: string;
    growthRate: string;
    affectedAreas: string;
  };
  keySources: SourceDetail[];
  keyFindings: FindingDetail[];
  predictions: PredictionDetail[];
  temporalData?: Array<{
    period: string;
    cases: number;
    description: string;
  }>;
}

export interface ParsedCrimeTrendData {
  analysis: CrimeTrendAnalysisResult | null;
  sources: WebSource[];
  searchQueries: string[];
  chartData: ChartDataPoint[];
  metrics: AnalysisMetric[];
  temporalData?: Array<{
    period: string;
    cases: number;
    description: string;
  }>;
}

// Sentiment Analysis types (moved here for consistency)
export interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentAnalysisResult {
  summary: string;
  sentimentData: SentimentData;
}

export interface ParsedSentimentData {
  analysis: SentimentAnalysisResult | null;
  sources: WebSource[];
  searchQueries: string[];
}

// Generic analysis canvas props
export interface AnalysisCanvasProps {
  content: string;
  onClose: () => void;
  title?: string;
  isLoading?: boolean;
}

// Chart configuration types
export interface ChartConfig {
  type: 'bar' | 'pie' | 'line' | 'area';
  data: ChartDataPoint[];
  colors?: string[];
  height?: number;
  responsive?: boolean;
}

export interface AnalysisDisplayTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
} 