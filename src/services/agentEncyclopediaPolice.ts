import { GoogleGenAI, GenerateContentResponse, GroundingChunk } from "@google/genai";
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// API Configuration
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Wikipedia API Configuration
const WIKIPEDIA_API_BASE_URL = 'https://id.wikipedia.org/w/api.php';

interface WikipediaPageInfo {
  pageid?: number;
  title?: string;
  extract?: string;
  fullurl?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  missing?: boolean;
}

interface WikipediaAPIResponse {
  query?: {
    pages?: { [key: string]: WikipediaPageInfo };
  };
}

interface WebSource {
  uri: string;
  title: string;
}

interface WebSearchResult {
  summary: string;
  sources: WebSource[];
}

// Session management
let currentSessionId = '';
let currentUserId = '';

// User session functions
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || uuidv4();
};

const getSessionId = (): string => {
  if (!currentSessionId) {
    currentSessionId = `encyclopedia_${uuidv4()}`;
  }
  return currentSessionId;
};

// Initialize session
export const initializeSession = async (): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentSessionId = `encyclopedia_${uuidv4()}`;
    currentUserId = session?.user?.id || `anon_${uuidv4()}`;
    
    console.log('Encyclopedia Police: Initialized new session:', currentSessionId);
    console.log('Encyclopedia Police: Using user ID:', currentUserId);
    
    return currentSessionId;
  } catch (error) {
    console.error('Error initializing session:', error);
    currentSessionId = `encyclopedia_${uuidv4()}`;
    currentUserId = `anon_${uuidv4()}`;
    return currentSessionId;
  }
};

// Clear chat history
export const clearChatHistory = async (): Promise<void> => {
  try {
    const existingUserId = currentUserId;
    currentSessionId = `encyclopedia_${uuidv4()}`;
    
    if (existingUserId) {
      currentUserId = existingUserId;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      currentUserId = session?.user?.id || `anon_${uuidv4()}`;
    }
    
    console.log('Encyclopedia Police: Chat history cleared, new session:', currentSessionId);
  } catch (error) {
    console.error('Error clearing chat history:', error);
    currentSessionId = `encyclopedia_${uuidv4()}`;
  }
};

// Wikipedia API function
const fetchWikipediaData = async (query: string): Promise<WikipediaPageInfo | null> => {
  // Try original query first
  let result = await tryWikipediaSearch(query);
  
  if (!result) {
    // Try alternative search terms for common police abbreviations
    const alternatives = generateAlternativeQueries(query);
    for (const altQuery of alternatives) {
      console.log(`Trying alternative Wikipedia search: "${altQuery}"`);
      result = await tryWikipediaSearch(altQuery);
      if (result) break;
    }
  }
  
  return result;
};

// Helper function to generate alternative search queries
const generateAlternativeQueries = (query: string): string[] => {
  const alternatives: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  // Common police abbreviation mappings
  const mappings: { [key: string]: string[] } = {
    'polda': ['Kepolisian Daerah'],
    'polres': ['Kepolisian Resort'],
    'polsek': ['Kepolisian Sektor'],
    'kapolda': ['Kepala Kepolisian Daerah'],
    'kapolres': ['Kepala Kepolisian Resort'],
    'kapolsek': ['Kepala Kepolisian Sektor'],
    'polri': ['Kepolisian Negara Republik Indonesia'],
    'brimob': ['Brigade Mobil'],
    'densus': ['Detasemen Khusus'],
    'reskrim': ['Reserse Kriminal'],
    'lantas': ['Lalu Lintas'],
    'sulsel': ['Sulawesi Selatan'],
    'sulut': ['Sulawesi Utara'],
    'sulteng': ['Sulawesi Tengah'],
    'sulbar': ['Sulawesi Barat'],
    'jabar': ['Jawa Barat'],
    'jateng': ['Jawa Tengah'],
    'jatim': ['Jawa Timur']
  };
  
  // Find and expand abbreviations
  for (const [abbrev, expansions] of Object.entries(mappings)) {
    if (lowerQuery.includes(abbrev)) {
      for (const expansion of expansions) {
        alternatives.push(query.replace(new RegExp(abbrev, 'gi'), expansion));
      }
    }
  }
  
  // Add specific common searches
  if (lowerQuery.includes('polda sulsel')) {
    alternatives.push('Kepolisian Daerah Sulawesi Selatan');
    alternatives.push('Polda Sulawesi Selatan');
  }
  
  return alternatives;
};

// Helper function to perform actual Wikipedia search
const tryWikipediaSearch = async (searchQuery: string): Promise<WikipediaPageInfo | null> => {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'extracts|pageimages|info',
    exintro: 'true',
    explaintext: 'true',
    redirects: '1',
    piprop: 'thumbnail',
    pithumbsize: '300',
    inprop: 'url',
    titles: searchQuery,
    origin: '*',
  });

  try {
    console.log(`Wikipedia search for: "${searchQuery}"`);
    const response = await fetch(`${WIKIPEDIA_API_BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.statusText}`);
    }
    const data = await response.json() as WikipediaAPIResponse;

    if (data.query && data.query.pages) {
      const pages = data.query.pages;
      const pageId = Object.keys(pages)[0];

      if (pageId && pages[pageId] && pages[pageId].pageid && !pages[pageId].hasOwnProperty('missing')) {
        const pageData = pages[pageId];
        if (!pageData.fullurl && pageData.title) {
          pageData.fullurl = `https://id.wikipedia.org/wiki/${encodeURIComponent(pageData.title)}`;
        }
        console.log(`Wikipedia found: "${pageData.title}"`);
        return pageData;
      } else {
        console.log(`Wikipedia search "${searchQuery}" - no valid page found`);
      }
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch Wikipedia data for "${searchQuery}":`, error);
    return null;
  }
};

// Gemini Web Search function
const fetchWebSearchData = async (query: string): Promise<WebSearchResult> => {
  if (!API_KEY) {
    console.error("Gemini API key not configured");
    return { 
      summary: "Layanan AI tidak tersedia saat ini karena kunci API tidak dikonfigurasi.", 
      sources: [] 
    };
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = 'gemini-2.0-flash';
  
  const prompt = `Sebagai ensiklopedia kepolisian Indonesia, berikan informasi lengkap dan komprehensif tentang "${query}" dalam konteks kepolisian Indonesia. 

PENTING: Jawab HANYA dalam bahasa Indonesia. Jangan gunakan bahasa lain.

Berikan dua bagian:

1. INFORMASI ENSIKLOPEDIA: Informasi mendalam seperti ensiklopedia meliputi:
- Latar belakang dan sejarah
- Peran dan fungsi dalam sistem kepolisian
- Struktur organisasi (jika berlaku)
- Tugas dan tanggung jawab
- Prestasi atau pencapaian penting
- Konteks dalam sistem kepolisian Indonesia

2. BERITA TERBARU: Cari dan berikan berita terbaru, perkembangan, atau informasi terkini terkait "${query}" dalam 1-2 tahun terakhir.

Berikan informasi yang faktual, objektif, dan komprehensif. Gunakan HANYA bahasa Indonesia yang profesional dan jelas. Tidak boleh menggunakan bahasa asing atau campuran bahasa.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    let summaryText = response.text || '';

    // Remove markdown fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = summaryText.match(fenceRegex);
    if (match && match[2]) {
      summaryText = match[2].trim();
    }
    
    let sources: WebSource[] = [];

    if (response.candidates && response.candidates[0] && response.candidates[0].groundingMetadata) {
      const chunks = response.candidates[0].groundingMetadata.groundingChunks as GroundingChunk[];
      if (chunks) {
        sources = chunks
          .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
          .map(chunk => ({
            uri: chunk.web!.uri!,
            title: chunk.web!.title!,
          }));
      }
    }
    
    return { summary: summaryText, sources };

  } catch (error) {
    console.error('Failed to fetch web search data from Gemini:', error);
    let errorMessage = "Gagal mengambil informasi tambahan dari web.";
    if (error instanceof Error) {
      errorMessage += ` Detail: ${error.message}`;
    }
    return { 
      summary: `Terjadi kesalahan saat mengambil data dari AI: ${errorMessage}`, 
      sources: [] 
    };
  }
};

// Main analysis function
export const submitAgentAnalysis = async (message: string): Promise<string> => {
  let retries = 0;
  
  if (!currentSessionId) {
    await initializeSession();
  }

  const userId = await getCurrentUserId();
  const sessionId = getSessionId();
  
  console.log(`Encyclopedia Police Analysis - User: ${userId}, Session: ${sessionId}`);
  console.log(`Query: ${message}`);

  while (retries <= MAX_RETRIES) {
    try {
      // Fetch data from both sources in parallel
      const [webSearchResult, wikipediaData] = await Promise.allSettled([
        fetchWebSearchData(message),
        fetchWikipediaData(message)
      ]);

      let finalResponse = `# Ensiklopedia Kepolisian: ${message}\n\n`;

      // Process Wikipedia data
      if (wikipediaData.status === 'fulfilled' && wikipediaData.value) {
        const wiki = wikipediaData.value;
        finalResponse += `## Data Wikipedia\n\n`;
        
        if (wiki.extract) {
          finalResponse += `${wiki.extract}\n\n`;
        } else {
          finalResponse += `Tidak ditemukan data Wikipedia untuk "${message}".\n\n`;
        }
        
        if (wiki.fullurl) {
          finalResponse += `**Sumber**: [Wikipedia Indonesia](${wiki.fullurl})\n\n`;
        }
      } else {
        finalResponse += `## Data Wikipedia\n\n`;
        finalResponse += `Tidak ditemukan data Wikipedia untuk "${message}".\n\n`;
      }

      // Process Web Search data (comprehensive encyclopedia + recent news)
      if (webSearchResult.status === 'fulfilled' && webSearchResult.value && webSearchResult.value.summary) {
        const webData = webSearchResult.value;
        if (!webData.summary.includes('Terjadi kesalahan')) {
          finalResponse += `## Informasi Ensiklopedia Lengkap\n\n`;
          finalResponse += `${webData.summary}\n\n`;

          if (webData.sources && webData.sources.length > 0) {
            finalResponse += `## Sumber Referensi & Berita Terbaru\n\n`;
            webData.sources.forEach((source, index) => {
              finalResponse += `${index + 1}. [${source.title}](${source.uri})\n`;
            });
            finalResponse += `\n`;
          }
        }
      }

      // Add disclaimer and additional info
      finalResponse += `---\n\n`;
      finalResponse += `**Informasi**: Data dikumpulkan dari Wikipedia dan sumber web terpercaya. `;
      finalResponse += `Selalu verifikasi dengan sumber resmi untuk keperluan operasional.\n\n`;
      finalResponse += `**Ensiklopedia Kepolisian AI** | ${new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`;

      return finalResponse;

    } catch (error) {
      console.error(`Encyclopedia Police Analysis error (attempt ${retries + 1}):`, error);
      
      if (retries < MAX_RETRIES) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
        continue;
      }
      
      // Final error handling
      let errorMessage = 'Terjadi kesalahan dalam menganalisis pertanyaan Anda.';
      
      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          errorMessage = 'API key Gemini tidak valid. Silakan periksa konfigurasi.';
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
          errorMessage = 'Kuota API Gemini telah habis. Silakan coba lagi nanti.';
        } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
          errorMessage = 'Terlalu banyak permintaan. Silakan tunggu beberapa saat dan coba lagi.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }
  
  throw new Error('Gagal setelah beberapa kali percobaan. Silakan coba lagi nanti.');
}; 