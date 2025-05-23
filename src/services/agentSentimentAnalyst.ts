import { GoogleGenAI, GenerateContentResponse, Part, GroundingChunk } from "@google/genai";
import { supabase } from '@/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Interface untuk hasil analisis sentimen
interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
}

interface SentimentAnalysisResult {
  summary: string;
  sentimentData: SentimentData;
  timeContext?: string;
  periodAnalysis?: string;
}

interface WebSource {
  uri: string;
  title: string;
}

// Fungsi untuk mendapatkan waktu saat ini dan konteks temporal
const getCurrentTimeInfo = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  
  // Generate periode analisis (3 bulan terakhir untuk analisis sentimen)
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const recentMonths = [];
  for (let i = 2; i >= 0; i--) {
    const monthIndex = (currentMonth - 1 - i + 12) % 12;
    const year = currentMonth - i <= 0 ? currentYear - 1 : currentYear;
    recentMonths.push(`${monthNames[monthIndex]} ${year}`);
  }
  
  return {
    currentDate: now.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    }),
    currentYear,
    currentMonth,
    currentQuarter,
    monthNames: monthNames[currentMonth - 1],
    recentMonths,
    timeContext: `Analisis sentimen dilakukan pada ${now.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    })}`
  };
};

// Fungsi untuk membuat prompt dengan konteks waktu
const createTemporalSentimentPrompt = (topic: string) => {
  const timeInfo = getCurrentTimeInfo();
  
  return `
Lakukan analisis sentimen komprehensif mengenai topik: "${topic}".

KONTEKS WAKTU ANALISIS:
- Tanggal analisis: ${timeInfo.currentDate}
- Periode fokus: ${timeInfo.recentMonths.join(', ')} (3 bulan terakhir)
- Konteks temporal: Sentimen publik terkini dan perkembangan opini
- Target: Identifikasi tren sentimen dalam periode waktu recent

PEDOMAN PENELUSURAN WEB TEMPORAL:
- Penelusuran mendalam konten web untuk analisis sentimen terkini:
  1. Prioritaskan konten dari ${timeInfo.recentMonths[2]} hingga saat ini (${timeInfo.currentDate})
  2. Cari 10-15 sumber dan identifikasi 5-7 yang paling relevan dan otoritatif
  3. Fokus pada sumber berita terkini, media sosial, dan diskusi publik recent
  4. Prioritaskan sumber dengan timestamp/tanggal publikasi yang jelas
  5. Identifikasi perubahan sentimen dari waktu ke waktu dalam periode ini
  6. Catat URL, judul, platform, tanggal publikasi, dan kredibilitas dari setiap sumber
- Hindari sumber yang outdated atau tidak relevan dengan konteks waktu saat ini
- Evaluasi tone, konteks, dan nuansa pembahasan dari periode ${timeInfo.currentYear}
- Pertahankan akurasi teknis dalam terminologi dan konteks temporal
- Struktur konten secara logis dengan fokus pada sentimen terkini
- Identifikasi faktor temporal yang mempengaruhi sentimen (events, berita, dll)

Buat laporan analisis sentimen komprehensif dengan struktur berikut:

[ANALYSIS_START]
SUMMARY:

## 1. Ringkasan Eksekutif
Sajikan gambaran umum dari temuan analisis sentimen mengenai "${topic}" berdasarkan data dan opini publik terkini (${timeInfo.recentMonths.join(', ')}). Soroti informasi kunci dan insight utama yang diperoleh dari riset web periode ${timeInfo.currentYear}.

## 2. Analisis Detail Sentimen Terkini
Berikan penjelasan mendalam mengenai distribusi sentimen (positif, negatif, dan netral) dengan dukungan data kuantitatif dari periode recent. Sertakan contoh atau kutipan penting dari data terkini (misalnya, komentar, artikel, atau review ${timeInfo.currentYear}) yang mendukung hasil analisis.

## 3. Gambaran Tren dan Pola Sentimen Temporal
Jelaskan tren dan pola sentimen yang muncul dalam periode ${timeInfo.recentMonths.join(' hingga ')} berdasarkan data web yang ditemukan. Identifikasi faktor-faktor temporal dan event yang mempengaruhi perubahan sentimen di ${timeInfo.currentYear}.

## 4. Rekomendasi Berdasarkan Analisis Terkini
Berikan rekomendasi strategis yang dapat diambil berdasarkan hasil analisis sentimen periode terkini. Fokus pada actionable insights yang relevan dengan kondisi ${timeInfo.currentDate} dan prediksi jangka pendek.

## 5. Metodologi dan Sumber Data Temporal
Jelaskan metode analisis yang digunakan dengan fokus pada data temporal ${timeInfo.currentYear}. Sebutkan karakteristik sumber data yang diambil (platform, kredibilitas, jangkauan, dan timestamp publikasi).

POSITIVE_PERCENTAGE: [Angka antara 0-100, bisa desimal]
NEGATIVE_PERCENTAGE: [Angka antara 0-100, bisa desimal]
NEUTRAL_PERCENTAGE: [Angka antara 0-100, bisa desimal]
[ANALYSIS_END]

INSTRUKSI TEKNIS TEMPORAL:
- Pastikan persentase mewakili distribusi sentimen berdasarkan data web terkini yang kredibel
- Prioritaskan sumber dengan timestamp ${timeInfo.currentYear} dan konten recent
- Jangan sertakan teks apapun di luar marker [ANALYSIS_START] dan [ANALYSIS_END] untuk konten laporan utama
- Jumlah persentase idealnya harus 100
- Analisis harus dalam bahasa Indonesia yang jelas dan profesional
- Gunakan data dari sumber web yang otoritatif dan dapat diverifikasi dengan tanggal publikasi
- Sertakan konteks temporal dan nuansa yang relevan dari berbagai sudut pandang periode ${timeInfo.currentYear}
- Identifikasi dan jelaskan faktor temporal yang mempengaruhi sentimen saat ini
`;
};

// Ambil API key dari environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY tidak ditemukan. Silakan set environment variable VITE_GEMINI_API_KEY.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Fungsi untuk mendapatkan user ID yang saat ini login
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || uuidv4();
};

// Fungsi untuk mendapatkan session ID
const getSessionId = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? uuidv4() : uuidv4();
};

// Fungsi untuk parsing response text dari Gemini
function parseSentimentTextResponse(responseText: string): SentimentAnalysisResult | null {
  const analysisBlockMatch = responseText.match(/\[ANALYSIS_START\]([\s\S]*?)\[ANALYSIS_END\]/);
  if (!analysisBlockMatch || !analysisBlockMatch[1]) {
    console.error("Could not find [ANALYSIS_START]...[ANALYSIS_END] block in response.");
    return null;
  }
  const content = analysisBlockMatch[1].trim();

  // Extract the summary content (everything before percentages)
  const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)(?=POSITIVE_PERCENTAGE:|$)/i);
  const positiveMatch = content.match(/POSITIVE_PERCENTAGE:\s*(\d+(\.\d+)?)/i);
  const negativeMatch = content.match(/NEGATIVE_PERCENTAGE:\s*(\d+(\.\d+)?)/i);
  const neutralMatch = content.match(/NEUTRAL_PERCENTAGE:\s*(\d+(\.\d+)?)/i);

  if (!positiveMatch || !positiveMatch[1] || !negativeMatch || !negativeMatch[1] || !neutralMatch || !neutralMatch[1]) {
    console.error("Could not parse sentiment percentages from content:", content);
    return null;
  }

  // Get the full summary content, including all sections
  const summary = summaryMatch && summaryMatch[1] ? summaryMatch[1].trim() : content.split(/POSITIVE_PERCENTAGE:/i)[0].trim();
  const positive = parseFloat(positiveMatch[1]);
  const negative = parseFloat(negativeMatch[1]);
  const neutral = parseFloat(neutralMatch[1]);

  // Validasi dasar untuk memastikan nilai adalah angka
  if (isNaN(positive) || isNaN(negative) || isNaN(neutral)) {
    console.error("Parsed sentiment values are not numbers.");
    return null;
  }

  return {
    summary,
    sentimentData: { positive, negative, neutral },
  };
}

export const submitAgentAnalysis = async (
  topic: string
): Promise<string> => {
  try {
    // Log untuk debugging dengan konteks temporal
    const user_id = await getCurrentUserId();
    const session_id = await getSessionId();
    const timeInfo = getCurrentTimeInfo();
    
    console.log('Analyzing sentiment for topic:', topic);
    console.log('Time context:', timeInfo.timeContext);
    console.log('Recent analysis period:', timeInfo.recentMonths.join(' - '));
    console.log('User ID:', user_id);
    console.log('Session ID:', session_id);

    // Menggunakan Gemini 2.0 Flash sesuai dokumentasi resmi untuk grounding
    const model = "gemini-2.0-flash";
    
    // Gunakan prompt temporal baru
    const prompt = createTemporalSentimentPrompt(topic);

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: prompt }] as Part[] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Tidak ada respons teks dari Gemini API");
    }

    console.log('Raw Gemini temporal sentiment response:', responseText);

    const parsedAnalysis = parseSentimentTextResponse(responseText);
    if (!parsedAnalysis) {
      throw new Error("Gagal memparsing analisis sentimen temporal dari respons Gemini");
    }

    // Ekstrak sumber web dari grounding metadata
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources: WebSource[] = [];
    
    if (groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
      groundingMetadata.groundingChunks.forEach((chunk: GroundingChunk) => {
        // Handle grounding chunks sesuai dokumentasi resmi
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          sources.push({ 
            uri: chunk.web.uri, 
            title: chunk.web.title 
          });
        }
      });
    }

    // Handle web search queries yang digunakan
    let webSearchQueries = '';
    if (groundingMetadata?.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
      webSearchQueries = `\n**QUERY PENCARIAN:** ${groundingMetadata.webSearchQueries.join(', ')}\n`;
    }

    // Format hasil akhir dengan informasi temporal dan sumber
    let finalResult = `# Laporan Analisis Sentimen Temporal\n\n`;
    finalResult += `**${timeInfo.timeContext}**\n`;
    finalResult += `**Periode analisis:** ${timeInfo.recentMonths.join(' → ')}\n\n`;
    
    // Tambahkan konten analisis
    finalResult += parsedAnalysis.summary;
    
    // Tambahkan informasi persentase sentimen
    finalResult += `\n\n**DISTRIBUSI SENTIMEN:**\n`;
    finalResult += `• Positif: ${parsedAnalysis.sentimentData.positive}%\n`;
    finalResult += `• Negatif: ${parsedAnalysis.sentimentData.negative}%\n`;
    finalResult += `• Netral: ${parsedAnalysis.sentimentData.neutral}%\n`;

    // Tambahkan web search queries jika ada
    if (webSearchQueries) {
      finalResult += webSearchQueries;
    }

    // Tambahkan sumber referensi jika ada
    if (sources.length > 0) {
      finalResult += `\n**SUMBER REFERENSI:**\n`;
      sources.forEach((source, index) => {
        finalResult += `${index + 1}. [${source.title}](${source.uri})\n`;
      });
    }

    // Tambahkan catatan tentang grounding temporal
    if (sources.length > 0) {
      finalResult += `\n*Analisis sentimen temporal ini berdasarkan data web periode ${timeInfo.recentMonths.join(' hingga ')} yang diperoleh melalui Google Search pada ${timeInfo.currentDate}.*`;
    }

    console.log('Temporal sentiment analysis completed successfully');
    console.log(`Found ${sources.length} grounding sources for period ${timeInfo.recentMonths.join(' - ')}`);
    
    return finalResult;

  } catch (error) {
    console.error("Error in submitAgentAnalysis:", error);
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('API key')) {
        throw new Error("Konfigurasi API key tidak valid. Silakan periksa pengaturan VITE_GEMINI_API_KEY.");
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error("Batas penggunaan API tercapai. Silakan coba lagi nanti. (1,500 grounding queries gratis per hari)");
      }
      if (error.message.includes('grounding') || error.message.includes('search')) {
        throw new Error("Layanan Google Search grounding sedang tidak tersedia. Silakan coba lagi nanti.");
      }
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    
    throw new Error("Terjadi kesalahan tidak diketahui saat menganalisis sentimen temporal.");
  }
};

// Export structured version for the new canvas component
export const getStructuredSentimentAnalysis = async (topic: string) => {
  const rawResult = await submitAgentAnalysis(topic);
  
  // Parse the result to extract structured data
  const positiveMatch = rawResult.match(/• Positif: ([\d.]+)%/);
  const negativeMatch = rawResult.match(/• Negatif: ([\d.]+)%/);
  const neutralMatch = rawResult.match(/• Netral: ([\d.]+)%/);
  
  // Extract summary (everything before DISTRIBUSI SENTIMEN) with temporal context
  const summaryMatch = rawResult.split('**DISTRIBUSI SENTIMEN:**')[0];
  
  // Extract timeline context
  const timeContext = rawResult.match(/\*\*Analisis sentimen dilakukan pada ([^*]+)\*\*/);
  const periodAnalysis = rawResult.match(/\*\*Periode analisis:\*\* ([^\n]+)/);
  
  // Extract sources
  const sourcesSection = rawResult.match(/\*\*SUMBER REFERENSI:\*\*([\s\S]*?)(?=\*\*|$)/);
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
  const queryMatch = rawResult.match(/\*\*QUERY PENCARIAN:\*\*\s*([^\n]*)/);
  const searchQueries = queryMatch ? queryMatch[1].split(',').map(q => q.trim()) : [];
  
  return {
    rawContent: rawResult,
    analysis: positiveMatch && negativeMatch && neutralMatch ? {
      summary: summaryMatch.trim(),
      sentimentData: {
        positive: parseFloat(positiveMatch[1]),
        negative: parseFloat(negativeMatch[1]),
        neutral: parseFloat(neutralMatch[1])
      },
      timeContext: timeContext ? timeContext[1] : null,
      periodAnalysis: periodAnalysis ? periodAnalysis[1] : null
    } : null,
    sources,
    searchQueries
  };
}; 