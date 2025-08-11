import type { SearchResult } from '../types';
import { supabase } from './supabase';

interface OpenAIError {
  error?: {
    message: string;
  };
}

interface SupabaseDocument {
  id: string;
  title: string;
  content: string;
  category: 'contract' | 'policy' | 'agreement' | 'regulation';
  date_added: string;
  tags: string[];
  file_path: string;
  file_url?: string;
  link_gdrive?: string;
  similarity: number;
  metadata: {
    nomor_putusan: string | null;
    tanggal_putusan: string | null;
    pasal_disangkakan: string | null;
    hukuman_penjara: string | null;
    hukuman_denda: string | null;
    kronologis_singkat: string | null;
    file_url?: string | null;
    link_gdrive?: string | null;
  };
}

async function getEmbedding(query: string): Promise<number[]> {
  const processedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
  
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  // Debug logging (show more characters for verification)
  console.log('OpenAI API Key loaded:', apiKey ? `${apiKey.slice(0, 12)}...${apiKey.slice(-8)}` : 'MISSING');
  console.log('Full environment check:', {
    hasKey: !!apiKey,
    keyLength: apiKey?.length,
    startsWithSkProj: apiKey?.startsWith('sk-proj-')
  });
  
  if (!apiKey) {
    throw new Error('OpenAI API key tidak ditemukan. Pastikan VITE_OPENAI_API_KEY sudah diset di file .env');
  }
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: processedQuery,
      model: "text-embedding-3-small",
      dimensions: 1536,
      encoding_format: "float"
    })
  });

  if (!response.ok) {
    console.error('Error response status:', response.status);
    
    if (response.status === 429) {
      throw new Error('Terlalu banyak permintaan API. Silakan tunggu beberapa saat sebelum mencoba lagi.');
    }
    
    try {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      let errorMessage = 'Unknown error';
      try {
        const error = JSON.parse(errorText) as OpenAIError;
        errorMessage = error.error?.message || errorMessage;
      } catch {
        // If it's not JSON, use the raw text
        errorMessage = errorText;
      }
      
      if (response.status === 401) {
        throw new Error('API key tidak valid. Periksa konfigurasi VITE_OPENAI_API_KEY di file .env');
      }
      
      throw new Error(`Failed to generate embedding: ${errorMessage}`);
    } catch (parseError) {
      throw new Error(`API request failed with status ${response.status}`);
    }
  }

  const result = await response.json();
  return result.data[0].embedding;
}

export const searchPutusan = async (query: string): Promise<SearchResult[]> => {
  try {
    if (!query.trim()) return [];

    const embedding = await getEmbedding(query);
    let documents = null;
    
    // Try with higher threshold first
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.6,
      match_count: 10
    });

    if (error) throw error;
    documents = data;

    // Fallback to lower threshold if no results
    if (!documents?.length) {
      const { data: fallbackDocuments, error: fallbackError } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.4,
        match_count: 5
      });

      if (fallbackError) throw fallbackError;
      documents = fallbackDocuments || [];
    }

    const results: SearchResult[] = documents.map((doc: SupabaseDocument) => {
      const fileUrl = doc.file_url?.startsWith('http') 
        ? doc.file_url 
        : doc.file_url 
          ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${doc.file_url}`
          : null;

      let matchedSegment = '';
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
      const content = doc.content.toLowerCase();
      let bestMatchIndex = -1;
      let bestMatchScore = 0;

      const windowSize = 300;
      for (let i = 0; i < content.length - windowSize; i += 50) {
        const window = content.substring(i, i + windowSize);
        const matchScore = searchTerms.reduce((score, term) => {
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedTerm, 'g');
          const matches = window.match(regex);
          return score + (matches ? matches.length : 0);
        }, 0);

        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatchIndex = i;
        }
      }

      matchedSegment = bestMatchIndex !== -1 
        ? doc.content.substring(bestMatchIndex, bestMatchIndex + windowSize)
        : doc.content.substring(0, windowSize);

      const highlightedSegment = searchTerms.reduce((text, term) => {
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
      }, matchedSegment);

      return {
        document: {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          category: doc.category,
          dateAdded: doc.date_added,
          tags: doc.tags,
          file_path: doc.file_path,
          file_url: fileUrl,
          link_gdrive: doc.link_gdrive,
          metadata: {
            ...doc.metadata,
            file_url: fileUrl,
            link_gdrive: doc.link_gdrive
          }
        },
        relevanceScore: Math.round(doc.similarity * 100),
        matchedSegments: [highlightedSegment + '...']
      };
    });

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
};