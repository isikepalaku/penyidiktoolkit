import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

// API Configuration untuk Gemini
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" });
const model = 'gemini-2.5-flash-preview-04-17';

// Store session ID
let currentSessionId: string | null = null;
// Store user ID yang persisten
let currentUserId: string | null = null;

// Types untuk analisis
export interface CaseAnalysis {
  chronology: string;
  relevantArticles: string;
  deepLegalAnalysis: string;
  recommendedUnit: string;
  requiredEvidence: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
  sourceId?: string;
}

export interface AnalysisResult {
  analysis: CaseAnalysis;
  sources: GroundingSource[];
}

export interface ApiError {
  message: string;
  details?: string;
}

/**
 * Membuat session ID baru jika belum ada
 * Session ID digunakan oleh backend untuk mengelola konteks percakapan
 */
export const initializeAnalysisSession = async () => {
  // Cek apakah pengguna login dengan Supabase
  const { data: { session } } = await supabase.auth.getSession();
  
  // Jika pengguna login, gunakan Supabase user ID
  if (session?.user?.id) {
    currentUserId = session.user.id;
    console.log('SPKT Analysis: Using authenticated user ID:', currentUserId);
  } 
  // Jika tidak ada session Supabase, gunakan UUID
  else if (!currentUserId) {
    currentUserId = `anon_${uuidv4()}`;
    console.log('SPKT Analysis: Created new anonymous user ID:', currentUserId);
  }
  
  // Buat session ID baru untuk percakapan jika belum ada
  if (!currentSessionId) {
    currentSessionId = `session_${uuidv4()}`;
    console.log('SPKT Analysis: Created new session ID:', currentSessionId);
    console.log('SPKT Analysis: User ID:', currentUserId, 'Session ID:', currentSessionId);
  } else {
    console.log('SPKT Analysis: Using existing session ID:', currentSessionId);
    console.log('SPKT Analysis: User ID:', currentUserId, 'Session ID:', currentSessionId);
  }
};

/**
 * Menghapus session ID untuk memulai percakapan baru
 */
export const clearAnalysisChatHistory = () => {
  console.log('SPKT Analysis: Clearing chat history and session');
  currentSessionId = null;
  // Tetap mempertahankan user ID untuk konsistensi
  console.log('SPKT Analysis: Kept user ID:', currentUserId);
};

// Helper function to convert File to GenerativePart
const fileToGenerativePart = async (file: File) => {
  const base64EncodedString = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve((reader.result as string).split(',')[1]);
      } else {
        reject(new Error("Failed to read file content."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      mimeType: file.type,
      data: base64EncodedString,
    },
  };
};

const PROMPT_TEMPLATE = (reportText: string, isFileAttached: boolean) => `
Anda adalah asisten AI canggih untuk petugas SPKT (Sentra Pelayanan Kepolisian Terpadu) Kepolisian Indonesia.
Tugas Anda adalah menganalisis laporan masyarakat secara komprehensif.
Gunakan kemampuan pencarian Google untuk mendapatkan konteks dan informasi terbaru yang relevan dengan kasus yang dilaporkan.

Laporan Masyarakat (Teks):
---
${reportText || (isFileAttached ? "[Tidak ada teks laporan, analisis berdasarkan file terlampir]" : "[Tidak ada teks laporan]")}
---
${isFileAttached ? "INFORMASI TAMBAHAN DARI FILE DOKUMEN PENDUKUNG:\n[Konten dari file dokumen yang dilampirkan akan dianalisis secara otomatis oleh AI bersama dengan teks laporan ini (jika ada). Harap pertimbangkan semua sumber informasi yang tersedia.]\n---" : ""}

Berdasarkan laporan di atas (teks ${reportText ? 'dan/atau' : 'atau'} file terlampir) ${isFileAttached ? "DAN KONTEN FILE DOKUMEN PENDUKUNG YANG TERLAMPIR," : ""} serta informasi yang Anda peroleh dari pencarian Google, berikan analisis mendalam dalam format berikut.
Pastikan setiap bagian memiliki judul yang jelas dan isi yang informatif.
Gunakan Bahasa Indonesia yang baik dan benar.

KRONOLOGI PERKARA:
[Uraikan kronologi kejadian secara detail dan runtut berdasarkan laporan yang diberikan (teks dan/atau file). Fokus pada fakta-fakta penting.]

PASAL-PASAL YANG RELEVAN:
[Untuk bagian ini, lakukan pencarian web yang bervariasi dan mendalam menggunakan Google Search. Fokus pada identifikasi pasal-pasal dalam hukum Indonesia (KUHP, UU ITE, UU Narkotika, UU Perlindungan Konsumen, UU Tipikor, UU lainnya yang spesifik) yang paling tepat dan relevan dengan setiap detail dan aspek dalam kronologi perkara yang telah diuraikan dari teks dan/atau file. Jelaskan mengapa setiap pasal yang Anda sebutkan relevan dengan kasus tersebut, kaitkan langsung dengan fakta-fakta dari kronologi. Pertimbangkan berbagai kemungkinan tindak pidana yang mungkin terjadi.]

ANALISIS HUKUM MENDALAM:
[Berikan analisis hukum yang lebih mendalam berdasarkan informasi dari teks dan/atau file. Ingat bahwa dalam hukum Indonesia, Kitab Undang-Undang Hukum Pidana (KUHP) berfungsi sebagai lex generalis (hukum umum). Undang-Undang (UU) lain di luar KUHP yang mengatur tindak pidana secara spesifik (misalnya UU ITE, UU Perlindungan Konsumen, UU Tipikor, dll.) berfungsi sebagai lex specialis (hukum khusus). Terapkan asas lex specialis derogat legi generali, di mana hukum khusus akan mengesampingkan hukum umum jika suatu perbuatan diatur oleh keduanya. Jelaskan secara rinci jika ada UU khusus yang lebih tepat diterapkan daripada pasal dalam KUHP.
Untuk kasus narkotika, UU Narkotika adalah lex specialis utama. Untuk kasus yang berindikasi terorisme, UU Anti-Terorisme adalah lex specialis utama.
Uraikan juga kemungkinan penerapan beberapa pasal secara bersamaan (juncto) jika relevan dengan kompleksitas kasus. Berikan justifikasi yang kuat untuk setiap argumen hukum yang diajukan.]

UNIT PENYIDIK YANG DIREKOMENDASIKAN:
[Berdasarkan analisis hukum dan penerapan asas lex specialis dari teks dan/atau file, rekomendasikan unit penyidik internal kepolisian yang paling tepat untuk menangani kasus ini. Gunakan definisi berikut:
- Direktorat Reserse Kriminal Umum (Ditreskrimum): Menangani tindak pidana yang diatur dalam Kitab Undang-Undang Hukum Pidana (KUHP) sebagai lex generalis.
- Direktorat Reserse Kriminal Khusus (Ditreskrimsus): Menangani tindak pidana yang memiliki undang-undang pidana khusus di luar KUHP (contoh: UU ITE, UU Tipikor, UU Perlindungan Konsumen), yang berfungsi sebagai lex specialis. Unit ini TIDAK menangani kasus Narkotika atau Terorisme yang memiliki unit/penanganan spesifik tersendiri.
- Direktorat Reserse Narkoba (Ditresnarkoba): Menangani tindak pidana terkait Narkotika dan Psikotropika, sesuai dengan Undang-Undang Narkotika sebagai lex specialis utama.
- Penanganan Terorisme (BNPT/Densus 88): Jika kasus berindikasi kuat tindak pidana terorisme, yang diatur oleh Undang-Undang Anti-Terorisme sebagai lex specialis utama. Untuk pelaporan awal di SPKT, arahkan ke Ditreskrimum atau Ditreskrimsus dengan catatan bahwa kasus ini memerlukan koordinasi dan penanganan lebih lanjut oleh unit anti-teror spesialis (BNPT/Densus 88).
- Bukan Pidana / Kasus Perdata: Jika analisis menunjukkan bahwa kasus ini lebih merupakan sengketa perdata dan bukan merupakan tindak pidana yang menjadi kewenangan Kepolisian.
Berikan alasan singkat untuk rekomendasi Anda, jelaskan mengapa unit tersebut paling sesuai berdasarkan sifat tindak pidana dan UU yang relevan.]

BUKTI-BUKTI YANG DIPERLUKAN:
[Daftar bukti-bukti awal yang penting dan relevan yang perlu dikumpulkan atau diamankan oleh petugas untuk mendukung proses penyelidikan lebih lanjut, berdasarkan informasi dari teks dan/atau file. Contoh: rekaman CCTV, keterangan saksi, dokumen terkait, barang bukti fisik, dll.]
`;

function parseAnalysisText(text: string): CaseAnalysis {
  const analysis: CaseAnalysis = {
    chronology: "Informasi tidak ditemukan.",
    relevantArticles: "Informasi tidak ditemukan.",
    deepLegalAnalysis: "Informasi tidak ditemukan.",
    recommendedUnit: "Informasi tidak ditemukan.",
    requiredEvidence: "Informasi tidak ditemukan.",
  };

  const sections: { key: keyof CaseAnalysis; heading: string }[] = [
    { key: 'chronology', heading: 'KRONOLOGI PERKARA:' },
    { key: 'relevantArticles', heading: 'PASAL-PASAL YANG RELEVAN:' },
    { key: 'deepLegalAnalysis', heading: 'ANALISIS HUKUM MENDALAM:' },
    { key: 'recommendedUnit', heading: 'UNIT PENYIDIK YANG DIREKOMENDASIKAN:' },
    { key: 'requiredEvidence', heading: 'BUKTI-BUKTI YANG DIPERLUKAN:' },
  ];

  let remainingText = text;
  for (const section of sections) {
    const startIndex = remainingText.toUpperCase().indexOf(section.heading.toUpperCase());
    if (startIndex !== -1) {
        let contentStart = startIndex + section.heading.length;
        let contentEnd = remainingText.length; 

        let earliestNextHeadingIndex = remainingText.length;
        for (const nextSection of sections) {
            if (nextSection.key === section.key) continue; 

            const nextSectionActualIndex = remainingText.toUpperCase().indexOf(nextSection.heading.toUpperCase(), contentStart);
            if (nextSectionActualIndex !== -1 && nextSectionActualIndex < earliestNextHeadingIndex) {
                earliestNextHeadingIndex = nextSectionActualIndex;
            }
        }
        contentEnd = earliestNextHeadingIndex;
        let sectionContent = remainingText.substring(contentStart, contentEnd).trim();
        
        // Clean up unwanted markdown formatting at the beginning and end
        sectionContent = sectionContent
          .replace(/^\*\*\s*/, '') // Remove opening **
          .replace(/\s*\*\*$/, '') // Remove closing **
          .replace(/^\*\*\n/, '') // Remove ** at start of new line
          .replace(/\n\*\*$/, '') // Remove ** at end of line
          .trim();
        
        analysis[section.key] = sectionContent;
    }
  }
  
  (Object.keys(analysis) as Array<keyof CaseAnalysis>).forEach(key => {
    if (analysis[key] === "") {
      analysis[key] = "Informasi tidak ditemukan.";
    }
  });
  
  return analysis;
}

// Fungsi utama untuk analisis dengan Gemini API
const analyzeReportWithGemini = async (reportText: string, file?: File | null): Promise<AnalysisResult> => {
  if (!API_KEY || API_KEY === "MISSING_API_KEY") {
    throw { message: "Kunci API Google AI tidak dikonfigurasi dengan benar." } as ApiError;
  }

  const promptString = PROMPT_TEMPLATE(reportText, !!file);
  const textPart = { text: promptString };
  const requestParts: any[] = [textPart];

  if (file) {
    try {
      const filePart = await fileToGenerativePart(file);
      requestParts.push(filePart);
    } catch (e: any) {
      console.error("Error processing file:", e);
      throw { message: "Gagal memproses file yang diunggah.", details: e.message || String(e) } as ApiError;
    }
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: requestParts },
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const responseText = response.text;
    if (!responseText) {
      throw { message: "Gagal mendapatkan respons teks dari AI." } as ApiError;
    }

    const parsedAnalysis = parseAnalysisText(responseText);
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: GroundingSource[] = groundingChunks
      ?.map((chunk: any) => ({ 
        uri: chunk.web?.uri || chunk.retrievedContext?.uri || '', 
        title: chunk.web?.title || chunk.retrievedContext?.title || 'Sumber tidak berjudul',
      }))
      .filter((source: GroundingSource) => source.uri) 
      .reduce((acc: GroundingSource[], current: GroundingSource) => { 
        if (!acc.find(item => item.uri === current.uri)) {
          acc.push(current);
        }
        return acc;
      }, []) || [];

    return {
      analysis: parsedAnalysis,
      sources: sources,
    };

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    let errorMessage = "Terjadi kesalahan saat menghubungi layanan AI Gemini.";
    if (error.message) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    
    if (error.toString().includes("API_KEY_INVALID") || error.toString().includes("PERMISSION_DENIED")) {
        errorMessage = "Kunci API tidak valid atau tidak memiliki izin yang diperlukan. Harap periksa konfigurasi API Key Anda.";
    } else if (error.toString().includes("Quota exceeded")) {
        errorMessage = "Kuota penggunaan API telah terlampaui. Silakan coba lagi nanti atau tingkatkan kuota Anda.";
    } else if (error.toString().includes("Request payload size exceeds the limit")) {
        errorMessage = "Ukuran file yang diunggah terlalu besar. Mohon unggah file yang lebih kecil.";
    }

    throw { message: errorMessage, details: error.toString() } as ApiError;
  }
};

// Fungsi untuk format output sebagai Markdown untuk ditampilkan di dokumen
const formatAnalysisAsMarkdown = (analysisResult: AnalysisResult): string => {
  const { analysis, sources } = analysisResult;
  
  // Helper function untuk clean dan format text content
  const formatContent = (content: string): string => {
    if (!content || content === "Informasi tidak ditemukan.") {
      return "*Informasi tidak ditemukan.*";
    }
    
    // Clean up content and ensure proper formatting
    return content
      .replace(/^\*\*\s*/, '') // Remove opening **
      .replace(/\s*\*\*$/, '') // Remove closing **
      .replace(/^\*\*\n/, '') // Remove ** at start of new line
      .replace(/\n\*\*$/, '') // Remove ** at end of line
      .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
      .trim();
  };
  
  // Helper function untuk extract domain dari URL
  const extractDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  };
  
  let markdown = `# 📋 Kronologi Perkara

${formatContent(analysis.chronology)}

---

# 📖 Pasal-Pasal yang Relevan

${formatContent(analysis.relevantArticles)}

---

# ⚖️ Analisis Hukum Mendalam

${formatContent(analysis.deepLegalAnalysis)}

---

# 🏛️ Unit Penyidik yang Direkomendasikan

${formatContent(analysis.recommendedUnit)}

---

# 🔍 Bukti-Bukti yang Diperlukan

${formatContent(analysis.requiredEvidence)}`;
  
  if (sources && sources.length > 0) {
    markdown += `

---

# 🔗 Sumber Internet yang Digunakan

`;
    
    sources.forEach((source: GroundingSource, index: number) => {
      const domain = extractDomain(source.uri);
      const title = source.title || domain;
      markdown += `${index + 1}. [${title}](${source.uri}) - *${domain}*\n`;
    });
  }
  
  return markdown;
};

export const sendAnalysisChatMessage = async (
  message: string,
  files?: File[]
): Promise<string> => {
  try {
    // Generate or retrieve session ID
    if (!currentSessionId || !currentUserId) {
      await initializeAnalysisSession();
    }
    
    // Double-check after initialization
    if (!currentSessionId || !currentUserId) {
      throw new Error('Tidak dapat menginisialisasi session atau user ID');
    }
    
    console.log('SPKT Analysis: Starting Gemini analysis...');
    console.log('SPKT Analysis: Message:', message.trim().substring(0, 100) + (message.length > 100 ? '...' : ''));
    console.log('SPKT Analysis: Files count:', files?.length || 0);
    
    // Hanya ambil file pertama jika ada multiple files
    const file = files && files.length > 0 ? files[0] : null;
    
    if (file) {
      console.log('SPKT Analysis: Processing file:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
    }

    const startTime = Date.now();
    const analysisResult = await analyzeReportWithGemini(message.trim(), file);
    const duration = Date.now() - startTime;
    
    console.log(`SPKT Analysis: Gemini analysis completed in ${duration}ms`);
    console.log('SPKT Analysis: Sources found:', analysisResult.sources.length);

    // Format hasil analisis sebagai Markdown untuk ditampilkan di area dokumen
    const formattedMarkdown = formatAnalysisAsMarkdown(analysisResult);
    
    return formattedMarkdown;

  } catch (error) {
    console.error('Error in sendAnalysisChatMessage:', error);
    
    // Enhanced error handling
    if (error && typeof error === 'object' && 'message' in error) {
      throw new Error((error as ApiError).message);
    }
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        throw new Error('Permintaan analisis timeout. Proses analisis mungkin memerlukan waktu lebih lama.');
      }
      
      if (error.message.includes('Failed to fetch') || !navigator.onLine) {
        throw new Error('Koneksi internet bermasalah. Silakan periksa koneksi dan coba lagi.');
      }
      
      // Return original error message
      throw error;
    }
    
    throw new Error('Gagal melakukan analisis. Silakan coba lagi nanti.');
  }
}; 