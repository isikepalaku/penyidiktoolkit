export interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentAnalysisResult {
  summary: string;
  sentimentData: SentimentData;
}

export interface WebSource {
  uri: string;
  title: string;
}

export interface SentimentAnalysisDisplay {
  analysis: SentimentAnalysisResult | null;
  sources: WebSource[] | null;
  searchQueries?: string[] | null;
  isLoading?: boolean;
  error?: string | null;
} 