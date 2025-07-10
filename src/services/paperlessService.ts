import { env } from '@/config/env';

// Paperless NGX API configuration
const PAPERLESS_BASE_URL = env.paperlessUrl || 'http://localhost:8000';
const PAPERLESS_API_TOKEN = env.paperlessApiToken;

// Paperless NGX API interfaces untuk pencarian dokumen
export interface PaperlessDocument {
  id: number;
  title: string;
  content: string;
  tags: number[];
  document_type?: number;
  correspondent?: number;
  created: string;
  created_date: string;
  modified: string;
  added: string;
  archive_serial_number?: string;
  original_file_name: string;
  archived_file_name?: string;
  page_count?: number; // Add page_count
  download_url: string;
  thumbnail_url: string;
  custom_fields: PaperlessCustomField[];
  search_hit?: {
    score: number;
    highlights: string;
    rank: number;
  };
}

export interface PaperlessCustomField {
  field: number;
  value: string;
}

export interface PaperlessTag {
  id: number;
  name: string;
  colour: number;
  text_colour: string;
  is_inbox_tag: boolean;
  matching_algorithm: number;
  match: string;
  is_insensitive: boolean;
}

export interface PaperlessDocumentType {
  id: number;
  name: string;
  matching_algorithm: number;
  match: string;
  is_insensitive: boolean;
}

export interface PaperlessCorrespondent {
  id: number;
  name: string;
  matching_algorithm: number;
  match: string;
  is_insensitive: boolean;
}

export interface PaperlessSearchParams {
  query?: string;
  search?: string;
  title_content?: string;
  more_like_id?: number;
  page?: number;
  page_size?: number;
  ordering?: string;
  tags__id__in?: number[];
  document_type__id?: number;
  correspondent__id?: number;
  created__after?: string;
  created__before?: string;
  title__icontains?: string;
  content__icontains?: string;
  custom_field_query?: string;
}

export interface PaperlessSearchResponse {
  count: number;
  next?: string;
  previous?: string;
  results: PaperlessDocument[];
}

export interface AutocompleteResponse {
  results: string[];
}

class PaperlessService {
  private baseURL: string;
  private apiToken: string;
  private defaultHeaders: HeadersInit;

  constructor() {
    this.baseURL = PAPERLESS_BASE_URL;
    this.apiToken = PAPERLESS_API_TOKEN || '';
    
    // Development proxy logging
    if (import.meta.env.DEV && this.baseURL === '/paperless') {
      console.log('🔧 Using development proxy for Paperless NGX API');
      console.log('📍 Proxy will redirect /paperless → https://dokumen.reserse.id');
    }
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.apiToken}`,
      'Accept': 'application/json; version=9', // Use latest API version
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;
    
    // Debug logging
    console.log('🌐 Paperless API Request:', {
      baseURL: this.baseURL,
      endpoint: endpoint,
      fullURL: url,
      isDev: import.meta.env.DEV,
      usingProxy: this.baseURL === '/paperless'
    });
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Paperless API Error (${response.status}):`, errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Paperless service error:', error);
      throw error;
    }
  }

  // Core search functionality
  async searchDocuments(searchParams: PaperlessSearchParams): Promise<PaperlessSearchResponse> {
    const queryParams = new URLSearchParams();
    
    // Build query parameters
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const endpoint = `/documents/?${queryParams.toString()}`;
    return this.makeRequest<PaperlessSearchResponse>(endpoint);
  }

  // Full text search
  async searchFullText(query: string, options?: {
    page?: number;
    page_size?: number;
    ordering?: string;
  }): Promise<PaperlessSearchResponse> {
    const searchParams: PaperlessSearchParams = {
      query: query,
      page: options?.page || 1,
      page_size: options?.page_size || 20,
      ordering: options?.ordering || '-created',
    };

    return this.searchDocuments(searchParams);
  }

  // Search for similar documents
  async searchSimilar(documentId: number, options?: {
    page?: number;
    page_size?: number;
  }): Promise<PaperlessSearchResponse> {
    const searchParams: PaperlessSearchParams = {
      more_like_id: documentId,
      page: options?.page || 1,
      page_size: options?.page_size || 20,
    };

    return this.searchDocuments(searchParams);
  }

  // Autocomplete search terms
  async autocomplete(term: string, limit: number = 10): Promise<string[]> {
    const queryParams = new URLSearchParams({
      term: term,
      limit: limit.toString(),
    });

    const endpoint = `/search/autocomplete/?${queryParams.toString()}`;
    const response = await this.makeRequest<string[]>(endpoint);
    return response;
  }

  // Get single document
  async getDocument(documentId: number): Promise<PaperlessDocument> {
    const endpoint = `/documents/${documentId}/`;
    return this.makeRequest<PaperlessDocument>(endpoint);
  }

  // Download document
  async downloadDocument(documentId: number): Promise<Blob> {
    const url = `${this.baseURL}/api/documents/${documentId}/download/`;
    
    console.log('📥 Downloading document:', {
      documentId,
      url,
      hasToken: !!this.apiToken,
      usingProxy: this.baseURL === '/paperless'
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Accept': 'application/pdf, application/octet-stream, */*',
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important untuk proxy
    });

    console.log('📥 Download response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('Content-Type'),
      contentLength: response.headers.get('Content-Length')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Download error details:', errorText);
      throw new Error(`Failed to download document: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  // Get document preview (usually a PDF)
  async getPreview(documentId: number): Promise<Blob> {
    const url = `${this.baseURL}/api/documents/${documentId}/preview/`;
    
    console.log('📄 Getting preview:', {
      documentId,
      url,
      hasToken: !!this.apiToken,
      usingProxy: this.baseURL === '/paperless'
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Accept': 'application/pdf, */*',
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for proxy
    });

    console.log('📄 Preview response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('Content-Type'),
      contentLength: response.headers.get('Content-Length')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Preview error details:', errorText);
      throw new Error(`Failed to get preview: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  // Get document thumbnail dengan proper authentication
  async getThumbnail(documentId: number): Promise<Blob> {
    const url = `${this.baseURL}/api/documents/${documentId}/thumb/`;
    
    console.log('🖼️ Getting thumbnail:', {
      documentId,
      url,
      hasToken: !!this.apiToken,
      usingProxy: this.baseURL === '/paperless'
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Accept': 'image/png, image/jpeg, image/webp, */*',
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important untuk proxy
    });

    console.log('🖼️ Thumbnail response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('Content-Type'),
      contentLength: response.headers.get('Content-Length')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Thumbnail error details:', errorText);
      throw new Error(`Failed to get thumbnail: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  // Metadata operations untuk filtering
  async getTags(): Promise<PaperlessTag[]> {
    const endpoint = '/tags/';
    const response = await this.makeRequest<{ results: PaperlessTag[] }>(endpoint);
    return response.results;
  }

  async getDocumentTypes(): Promise<PaperlessDocumentType[]> {
    const endpoint = '/document_types/';
    const response = await this.makeRequest<{ results: PaperlessDocumentType[] }>(endpoint);
    return response.results;
  }

  async getCorrespondents(): Promise<PaperlessCorrespondent[]> {
    const endpoint = '/correspondents/';
    const response = await this.makeRequest<{ results: PaperlessCorrespondent[] }>(endpoint);
    return response.results;
  }

  // Health check
  async ping(): Promise<{ status: string; version?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/documents/?page_size=1`, {
        headers: this.defaultHeaders,
      });
      
      if (response.ok) {
        // Check for API version headers
        const apiVersion = response.headers.get('X-Api-Version');
        const version = response.headers.get('X-Version');
        
        return { 
          status: 'ok',
          version: version || 'unknown'
        };
      } else {
        throw new Error(`API responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Paperless ping failed:', error);
      return { status: 'error' };
    }
  }

  // Wrapper for legal document search with specific filters
  async searchLegalDocuments(query: string, filters?: {
    tagId?: number | string;
    documentTypeId?: number | string;
    page?: number;
    page_size?: number;
  }): Promise<PaperlessSearchResponse> {
    const searchParams: PaperlessSearchParams = {
      page: filters?.page || 1,
      page_size: filters?.page_size || 20,
      ordering: '-created', // Default sort by newest
    };

    // Use 'title_content' for combined title and content search
    if (query) {
      searchParams.title_content = query;
    }

    // Add tag filter if provided and not 'all'
    if (filters?.tagId && filters.tagId !== 'all') {
      searchParams.tags__id__in = [parseInt(filters.tagId.toString())];
    }
    
    // Add document type filter if provided and not 'all'
    if (filters?.documentTypeId && filters.documentTypeId !== 'all') {
      searchParams.document_type__id = parseInt(filters.documentTypeId.toString());
    }

    console.log('🔍 Executing search with params:', searchParams);

    return this.searchDocuments(searchParams);
  }

  // Helper method untuk convert Paperless document ke DocumentResult format
  convertToDocumentResult(paperlessDoc: PaperlessDocument): any {
    // Generate URLs untuk download dan thumbnail
    const downloadUrl = this.generateDownloadUrl(paperlessDoc.id);
    const thumbnailUrl = this.generateThumbnailUrl(paperlessDoc.id);
    
    // Calculate relevance score dari search_hit atau fallback
    const relevanceScore = this.calculateRelevanceScore(paperlessDoc);
    
    // Extract metadata dari content atau fallback ke default values
    const nomor = this.extractFromContent(paperlessDoc.content, 'nomor') || paperlessDoc.archive_serial_number || `DOC-${paperlessDoc.id}`;
    const tentang = this.extractFromContent(paperlessDoc.content, 'tentang') || this.extractSummary(paperlessDoc.content);
    const tahun = this.extractYearFromContent(paperlessDoc.content) || new Date(paperlessDoc.created).getFullYear();
    const status = this.extractStatusFromContent(paperlessDoc.content);
    const bidang = this.extractBidangFromContent(paperlessDoc.content);
    const ringkasan = this.extractSummary(paperlessDoc.content);
    
    console.log(`📋 Converting document ${paperlessDoc.id}:`, {
      id: paperlessDoc.id,
      title: paperlessDoc.title,
      tags: paperlessDoc.tags,
      document_type: paperlessDoc.document_type,
      originalContent: paperlessDoc.content?.substring(0, 200) + '...',
      extractedData: { nomor, tentang, tahun, status, bidang: bidang.length },
      searchHit: paperlessDoc.search_hit,
      relevanceScore,
      downloadUrl,
      thumbnailUrl
    });

    return {
      id: paperlessDoc.id.toString(),
      title: paperlessDoc.title,
      nomor,
      tahun,
      tentang,
      status: status as 'berlaku' | 'dicabut' | 'direvisi',
      tanggal_upload: paperlessDoc.added, // Use 'added' for upload date
      bidang,
      ringkasan,
      file_url: downloadUrl,
      thumbnail_url: thumbnailUrl,
      link_external: undefined,
      relevansi_score: relevanceScore,
      tags: paperlessDoc.tags || [], // Include tags array dari API
      document_type: paperlessDoc.document_type, // Include document_type ID dari API
      page_count: paperlessDoc.page_count, // Include page_count
      _debug: import.meta.env.DEV ? {
        originalDocument: paperlessDoc,
        searchHit: paperlessDoc.search_hit,
        extractedMetadata: { nomor, tentang, tahun, status, bidang },
        urls: { downloadUrl, thumbnailUrl },
        paperlessFields: {
          tags: paperlessDoc.tags,
          document_type: paperlessDoc.document_type,
          correspondent: paperlessDoc.correspondent,
          added: paperlessDoc.added, // Add 'added' to debug
          created: paperlessDoc.created, // Add 'created' to debug
        }
      } : undefined
    };
  }

  // Generate download URL berdasarkan document ID
  private generateDownloadUrl(documentId: number): string {
    return `${this.baseURL}/api/documents/${documentId}/download/`;
  }

  // Generate thumbnail URL berdasarkan document ID  
  private generateThumbnailUrl(documentId: number): string {
    return `${this.baseURL}/api/documents/${documentId}/thumb/`;
  }

  // Calculate relevance score berdasarkan Paperless API search_hit data
  private calculateRelevanceScore(paperlessDoc: PaperlessDocument): number {
    // Strategy 1: Use search hit score dari API (nilai 0.0 - 1.0)
    if (paperlessDoc.search_hit?.score !== undefined) {
      // Convert dari float score (0.0-1.0) ke percentage (0-100)
      const normalizedScore = Math.round(paperlessDoc.search_hit.score * 100);
      console.log('📊 Using API search hit score:', {
        originalScore: paperlessDoc.search_hit.score,
        normalizedScore: normalizedScore,
        rank: paperlessDoc.search_hit.rank
      });
      return Math.min(Math.max(normalizedScore, 1), 100); // Clamp between 1-100
    }
    
    // Strategy 2: Use search hit rank (rank 0 = first result = highest score)
    if (paperlessDoc.search_hit?.rank !== undefined) {
      // Convert rank ke score (rank 0 = score 95, rank 1 = score 90, etc.)
      const rankBasedScore = Math.max(95 - (paperlessDoc.search_hit.rank * 5), 30);
      console.log('📊 Using rank-based score:', {
        rank: paperlessDoc.search_hit.rank,
        calculatedScore: rankBasedScore
      });
      return rankBasedScore;
    }
    
    // Strategy 3: Fallback - use creation date (newer = higher score)
    const createdDate = new Date(paperlessDoc.created);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const dateBasedScore = Math.max(85 - Math.floor(daysDiff / 30), 40); // Decrease by time
    
    console.log('📊 Using date-based fallback score:', {
      documentId: paperlessDoc.id,
      createdDate: paperlessDoc.created,
      daysDiff: daysDiff,
      calculatedScore: dateBasedScore
    });
    return dateBasedScore;
  }

  // Clean highlights HTML dari Paperless API untuk display
  private cleanHighlights(highlights: string): string {
    if (!highlights) return '';
    
    // Remove HTML tags tapi keep content dan match indicators
    let cleaned = highlights
      .replace(/<span class="match">/g, '**') // Convert match spans to markdown bold
      .replace(/<\/span>/g, '**')
      .replace(/<[^>]*>/g, '') // Remove other HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Limit length untuk display
    if (cleaned.length > 300) {
      cleaned = cleaned.substring(0, 297) + '...';
    }
    
    console.log('🧹 Cleaned highlights:', {
      original: highlights.substring(0, 100) + '...',
      cleaned: cleaned.substring(0, 100) + '...',
      originalLength: highlights.length,
      cleanedLength: cleaned.length
    });
    
    return cleaned;
  }

  // Helper methods untuk extract information dari content
  private extractFromContent(content: string, field: string): string {
    if (!content) return '';
    
    // Simple keyword extraction - bisa diimprove dengan regex yang lebih sophisticated
    const lowerContent = content.toLowerCase();
    const lowerField = field.toLowerCase();
    
    if (lowerContent.includes(lowerField)) {
      // Extract text setelah keyword
      const index = lowerContent.indexOf(lowerField);
      const afterKeyword = content.substring(index + field.length, index + field.length + 100);
      return afterKeyword.trim().split('\n')[0];
    }
    
    return '';
  }

  private extractYearFromContent(content: string): number | null {
    if (!content) return null;
    
    // Look for 4-digit years (2000-2099)
    const yearMatch = content.match(/20\d{2}/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
  }

  private extractStatusFromContent(content: string): string {
    if (!content) return 'berlaku';
    
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('dicabut')) return 'dicabut';
    if (lowerContent.includes('direvisi')) return 'direvisi';
    return 'berlaku';
  }

  private extractBidangFromContent(content: string): string[] {
    if (!content) return ['hukum'];
    
    const lowerContent = content.toLowerCase();
    const bidangKeywords = ['pidana', 'perdata', 'administrasi', 'ketenagakerjaan', 'keuangan', 'pajak'];
    
    const foundBidang = bidangKeywords.filter(bidang => 
      lowerContent.includes(bidang)
    );
    
    return foundBidang.length > 0 ? foundBidang : ['hukum'];
  }

  private extractSummary(content: string): string {
    if (!content) return '';
    
    // Clean HTML tags dari highlights jika ada
    const cleanContent = content.replace(/<[^>]*>/g, '');
    
    // Extract first 200 characters as summary
    const summary = cleanContent.substring(0, 200);
    return summary + (cleanContent.length > 200 ? '...' : '');
  }
}

// Create and export singleton instance
const paperlessService = new PaperlessService();

// Export service dan main functions
export { paperlessService };

export const searchLegalDocuments = paperlessService.searchLegalDocuments.bind(paperlessService);
export const searchFullText = paperlessService.searchFullText.bind(paperlessService);
export const searchSimilar = paperlessService.searchSimilar.bind(paperlessService);
export const autocomplete = paperlessService.autocomplete.bind(paperlessService);
export const downloadDocument = paperlessService.downloadDocument.bind(paperlessService);
export const getDocument = paperlessService.getDocument.bind(paperlessService);
export const getThumbnail = paperlessService.getThumbnail.bind(paperlessService);

export default paperlessService; 