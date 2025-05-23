import { GoogleGenAI, GenerateContentResponse, Part, GroundingChunk } from "@google/genai";
import { supabase } from '@/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Interface untuk hasil analisis modus kejahatan
interface ModusKejahatanResult {
  analysis: string;
  crimeTypes: {
    unique: string[];
    common: string[];
    moderate: string[];
  };
}

interface WebSource {
  uri: string;
  title: string;
}

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
function parseModusKejahatanResponse(responseText: string): ModusKejahatanResult | null {
  const analysisBlockMatch = responseText.match(/\[ANALYSIS_START\]([\s\S]*?)\[ANALYSIS_END\]/);
  if (!analysisBlockMatch || !analysisBlockMatch[1]) {
    console.error("Could not find [ANALYSIS_START]...[ANALYSIS_END] block in response.");
    return null;
  }
  const content = analysisBlockMatch[1].trim();

  // Extract the analysis content (everything before crime types)
  const analysisMatch = content.match(/ANALYSIS:\s*([\s\S]*?)(?=UNIQUE_CRIMES:|$)/i);
  const uniqueMatch = content.match(/UNIQUE_CRIMES:\s*([\s\S]*?)(?=MODERATE_CRIMES:|$)/i);
  const moderateMatch = content.match(/MODERATE_CRIMES:\s*([\s\S]*?)(?=COMMON_CRIMES:|$)/i);
  const commonMatch = content.match(/COMMON_CRIMES:\s*([\s\S]*?)$/i);

  if (!analysisMatch || !analysisMatch[1]) {
    console.error("Could not parse analysis from content:", content);
    return null;
  }

  // Parse crime types from lists
  const parseList = (text: string): string[] => {
    if (!text) return [];
    return text
      .split('\n')
      .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
      .filter(line => line.length > 0);
  };

  const analysis = analysisMatch[1].trim();
  const unique = uniqueMatch ? parseList(uniqueMatch[1]) : [];
  const moderate = moderateMatch ? parseList(moderateMatch[1]) : [];
  const common = commonMatch ? parseList(commonMatch[1]) : [];

  return {
    analysis,
    crimeTypes: {
      unique,
      moderate,
      common
    }
  };
}

export const submitModusKejahatanAnalysis = async (
  kategori_kejahatan: string
): Promise<string> => {
  try {
    // Log untuk debugging
    const user_id = await getCurrentUserId();
    const session_id = await getSessionId();
    
    console.log('Analyzing crime patterns for category:', kategori_kejahatan);
    console.log('User ID:', user_id);
    console.log('Session ID:', session_id);

    // Menggunakan Gemini 2.0 Flash sesuai dokumentasi resmi untuk grounding
    const model = "gemini-2.0-flash";
    
    const prompt = `
Lakukan analisis komprehensif mengenai modus kejahatan untuk kategori: "${kategori_kejahatan}".

PEDOMAN PENELUSURAN WEB:
- Penelusuran mendalam konten web untuk analisis modus kejahatan:
  1. Cari 10-15 sumber dan identifikasi 5-7 yang paling relevan dan otoritatif
  2. Fokus pada data kriminalitas terkini, laporan kepolisian, dan studi kriminologi
  3. Prioritaskan sumber resmi seperti Polri, BPS, KemenKumHAM, dan institusi penelitian
  4. Identifikasi berbagai modus operandi dari yang unik hingga yang umum terjadi
  5. Catat URL, judul, platform, dan kredibilitas dari setiap sumber
- Hindari sumber yang tidak otoritatif atau spekulatif tanpa dasar data
- Evaluasi pola, tren, dan karakteristik dari setiap jenis kejahatan
- Pertahankan akurasi dalam terminologi hukum dan kriminologi
- Struktur konten secara logis dengan kategorisasi yang jelas
- Tangani konten yang memerlukan verifikasi dengan hati-hati

Buat laporan analisis modus kejahatan komprehensif dengan struktur berikut:

[ANALYSIS_START]
ANALYSIS:

## 1. Ringkasan Eksekutif
Sajikan gambaran umum dari kategori kejahatan "${kategori_kejahatan}" berdasarkan data dan riset web terkini. Soroti karakteristik utama, pola yang teridentifikasi, dan insight penting.

## 2. Analisis Pola dan Tren
Berikan penjelasan mendalam mengenai pola kejahatan yang teridentifikasi, termasuk:
- Metode dan modus operandi yang umum digunakan
- Target dan korban yang biasa menjadi sasaran
- Lokasi dan waktu kejadian yang sering terjadi
- Faktor-faktor yang mempengaruhi kejahatan jenis ini

## 3. Profil Pelaku dan Korban
Jelaskan karakteristik pelaku dan korban berdasarkan data yang ditemukan:
- Profil demografis pelaku
- Motivasi dan latar belakang
- Karakteristik korban yang rentan
- Pola hubungan antara pelaku dan korban

## 4. Dampak dan Konsekuensi
Analisis dampak kejahatan terhadap masyarakat dan sistem hukum:
- Kerugian ekonomi dan sosial
- Dampak psikologis pada korban
- Beban sistem peradilan pidana
- Efek terhadap keamanan lingkungan

## 5. Upaya Pencegahan dan Penanganan
Rekomendasi berdasarkan best practices dan studi yang ditemukan:
- Strategi pencegahan yang efektif
- Metode deteksi dini
- Pendekatan penanganan yang direkomendasikan
- Peran masyarakat dalam pencegahan

## 6. Metodologi dan Sumber Data
Jelaskan metode analisis yang digunakan dan karakteristik sumber data yang ditemukan.

UNIQUE_CRIMES:
[Daftar 3-5 jenis kejahatan unik/langka dalam kategori ini - satu item per baris dengan bullet point]

MODERATE_CRIMES:
[Daftar 4-6 jenis kejahatan dengan frekuensi sedang - satu item per baris dengan bullet point]

COMMON_CRIMES:
[Daftar 5-7 jenis kejahatan yang paling sering terjadi - satu item per baris dengan bullet point]
[ANALYSIS_END]

INSTRUKSI TEKNIS:
- Pastikan kategorisasi kejahatan berdasarkan frekuensi kejadian dari data riset web
- Jangan sertakan teks apapun di luar marker [ANALYSIS_START] dan [ANALYSIS_END] untuk konten laporan utama
- Analisis harus dalam bahasa Indonesia yang jelas dan profesional
- Gunakan data dari sumber web yang otoritatif dan dapat diverifikasi
- Sertakan konteks hukum dan kriminologi yang relevan
- Fokus pada modus operandi yang spesifik dan dapat diidentifikasi
- Hindari sensasionalisme dan tetap objektif dalam analisis
`;

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

    console.log('Raw Gemini response:', responseText);

    const parsedAnalysis = parseModusKejahatanResponse(responseText);
    if (!parsedAnalysis) {
      throw new Error("Gagal memparsing analisis modus kejahatan dari respons Gemini");
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

    // Format hasil akhir dengan informasi sumber dan metadata
    let finalResult = parsedAnalysis.analysis;
    
    // Tambahkan informasi kategorisasi kejahatan
    if (parsedAnalysis.crimeTypes.unique.length > 0) {
      finalResult += `\n\n**KEJAHATAN UNIK/LANGKA:**\n`;
      parsedAnalysis.crimeTypes.unique.forEach((crime, index) => {
        finalResult += `${index + 1}. ${crime}\n`;
      });
    }

    if (parsedAnalysis.crimeTypes.moderate.length > 0) {
      finalResult += `\n**KEJAHATAN FREKUENSI SEDANG:**\n`;
      parsedAnalysis.crimeTypes.moderate.forEach((crime, index) => {
        finalResult += `${index + 1}. ${crime}\n`;
      });
    }

    if (parsedAnalysis.crimeTypes.common.length > 0) {
      finalResult += `\n**KEJAHATAN SERING TERJADI:**\n`;
      parsedAnalysis.crimeTypes.common.forEach((crime, index) => {
        finalResult += `${index + 1}. ${crime}\n`;
      });
    }

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

    // Tambahkan catatan tentang grounding
    if (sources.length > 0) {
      finalResult += `\n*Analisis ini berdasarkan data kriminalitas dan riset web terkini yang diperoleh melalui Google Search. Sumber akan tetap dapat diakses selama 30 hari.*`;
    }

    console.log('Crime pattern analysis completed successfully with grounding');
    console.log(`Found ${sources.length} grounding sources`);
    
    return finalResult;

  } catch (error) {
    console.error("Error in submitModusKejahatanAnalysis:", error);
    
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
    
    throw new Error("Terjadi kesalahan tidak diketahui saat menganalisis modus kejahatan.");
  }
}; 