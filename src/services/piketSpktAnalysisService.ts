import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

// API Configuration untuk Gemini
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" });
const model = 'gemini-2.0-flash';

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

// Types untuk Gemini API content parts
export interface TextPart {
  text: string;
}

export interface InlineDataPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export type ContentPart = TextPart | InlineDataPart;

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

// Fungsi untuk mendapatkan tanggal dan waktu saat ini dalam format Indonesia
const getCurrentIndonesianDateTime = (): string => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const now = new Date();
  const day = days[now.getDay()];
  const date = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  return `${day} tanggal ${date} bulan ${month} tahun ${year}`;
};

// Helper function to convert File to GenerativePart sesuai dokumentasi resmi
const fileToGenerativePart = async (file: File) => {
  try {
    console.log('SPKT Analysis: Processing file:', file.name, 'Type:', file.type, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
    
    // Validasi ukuran file (maksimal 20MB untuk inline data sesuai dokumentasi)
    const maxSizeInBytes = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSizeInBytes) {
      throw new Error(`File terlalu besar (${(file.size / 1024 / 1024).toFixed(2)}MB). Maksimal ukuran file adalah 20MB untuk pemrosesan inline.`);
    }
    
    // Validasi tipe MIME yang didukung sesuai dokumentasi
    const supportedMimeTypes = [
      'application/pdf',
      'application/x-javascript',
      'text/javascript',
      'application/x-python',
      'text/x-python',
      'text/plain',
      'text/html',
      'text/css',
      'text/md',
      'text/csv',
      'text/xml',
      'text/rtf',
      // Tambahan untuk file Office yang umum
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/msword', // .doc
      'application/vnd.ms-excel', // .xls
    ];
    
    if (!supportedMimeTypes.includes(file.type)) {
      console.warn('SPKT Analysis: Unsupported file type:', file.type, '. Proceeding anyway...');
    }
    
    const base64EncodedString = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result && typeof reader.result === 'string') {
          // Remove data URL prefix untuk mendapatkan base64 string murni
          const base64Data = reader.result.split(',')[1];
          if (base64Data) {
            resolve(base64Data);
          } else {
            reject(new Error("Gagal mengekstrak data base64 dari file."));
          }
        } else {
          reject(new Error("Gagal membaca konten file."));
        }
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error(`Gagal membaca file: ${error}`));
      };
      reader.readAsDataURL(file);
    });
    
    console.log('SPKT Analysis: File encoded to base64, length:', base64EncodedString.length, 'characters');
    
    // Return format sesuai dokumentasi resmi Google Gemini API
    return {
      inlineData: {
        mimeType: file.type,
        data: base64EncodedString,
      },
    };
  } catch (error) {
    console.error('SPKT Analysis: Error in fileToGenerativePart:', error);
    throw error;
  }
};

const PROMPT_TEMPLATE = (reportText: string, isFileAttached: boolean) => {
  const currentDate = getCurrentIndonesianDateTime();
  const currentYear = new Date().getFullYear();
  
  return `
Anda adalah asisten AI canggih untuk petugas SPKT (Sentra Pelayanan Kepolisian Terpadu) Kepolisian Indonesia.
Tugas Anda adalah menganalisis laporan masyarakat secara komprehensif.

🚨 WAJIB MELAKUKAN PENCARIAN WEB TERBARU - TIDAK BOLEH DILEWATI:
SEBELUM memberikan analisis, Anda HARUS melakukan pencarian Google untuk mendapatkan informasi TERBARU dan TERKINI yang relevan dengan kasus yang dilaporkan.
Ini adalah PERSYARATAN MUTLAK - tidak ada pengecualian.

Prioritaskan sumber-sumber dari tahun ${currentYear} dan ${currentYear - 1}.
Gunakan kata kunci pencarian yang spesifik dengan menambahkan:
- "Indonesia ${currentYear}" untuk regulasi terbaru
- "KUHP terbaru ${currentYear}" untuk pasal-pasal KUHP yang berlaku
- "UU terbaru Indonesia ${currentYear}" untuk undang-undang terkini
- "putusan mahkamah agung ${currentYear}" untuk yurisprudensi terbaru
- "peraturan kepolisian ${currentYear}" untuk SOP dan regulasi internal terbaru

PENTING: Jika Anda tidak melakukan pencarian web, analisis Anda akan dianggap TIDAK VALID dan TIDAK DAPAT DITERIMA.

Hari ini ${currentDate}.

Laporan Masyarakat (Teks):
---
${reportText || (isFileAttached ? "[Tidak ada teks laporan, analisis berdasarkan file terlampir]" : "[Tidak ada teks laporan]")}
---
${isFileAttached ? "INFORMASI TAMBAHAN DARI FILE DOKUMEN PENDUKUNG:\n[Konten dari file dokumen yang dilampirkan akan dianalisis secara otomatis oleh AI bersama dengan teks laporan ini (jika ada). Harap pertimbangkan semua sumber informasi yang tersedia.]\n---" : ""}

LANGKAH WAJIB SEBELUM ANALISIS:
1. LAKUKAN PENCARIAN WEB untuk informasi terbaru tentang jenis kasus ini
2. CARI regulasi dan undang-undang terkini yang relevan
3. VERIFIKASI informasi dengan sumber-sumber terpercaya
4. PASTIKAN menggunakan informasi yang paling up-to-date

Berdasarkan laporan di atas (teks ${reportText ? 'dan/atau' : 'atau'} file terlampir) ${isFileAttached ? "DAN KONTEN FILE DOKUMEN PENDUKUNG YANG TERLAMPIR," : ""} serta informasi TERBARU yang Anda peroleh dari pencarian Google (YANG WAJIB DILAKUKAN), berikan analisis mendalam dalam format berikut.
Pastikan setiap bagian memiliki judul yang jelas dan isi yang informatif.
Gunakan Bahasa Indonesia yang baik dan benar.

KRONOLOGI PERKARA:
[Uraikan kronologi kejadian secara detail dan runtut berdasarkan laporan yang diberikan (teks dan/atau file). Fokus pada fakta-fakta penting.]

PASAL-PASAL YANG RELEVAN:
[WAJIB melakukan pencarian web terbaru untuk bagian ini - TIDAK BOLEH DILEWATI. Cari informasi terkini tentang:
1. Pasal-pasal KUHP yang berlaku saat ini (${currentYear})
2. Undang-undang khusus terbaru yang relevan (UU ITE, UU Narkotika, UU Perlindungan Konsumen, UU Tipikor, dll.)
3. Perubahan atau pembaruan regulasi terbaru
4. Putusan pengadilan atau yurisprudensi terkini yang relevan

GUNAKAN KATA KUNCI PENCARIAN SPESIFIK:
- "pasal [nomor pasal] KUHP ${currentYear} Indonesia"
- "UU [nama UU] terbaru ${currentYear} Indonesia"
- "perubahan [nama UU] ${currentYear}"
- "putusan mahkamah agung [jenis kasus] ${currentYear}"

Fokus pada identifikasi pasal-pasal dalam hukum Indonesia yang paling tepat dan relevan dengan setiap detail dan aspek dalam kronologi perkara. Jelaskan mengapa setiap pasal yang Anda sebutkan relevan dengan kasus tersebut, kaitkan langsung dengan fakta-fakta dari kronologi. Pertimbangkan berbagai kemungkinan tindak pidana yang mungkin terjadi. Sertakan informasi tentang kapan regulasi tersebut berlaku dan apakah ada perubahan terbaru.]

ANALISIS HUKUM MENDALAM:
[Berikan analisis hukum yang lebih mendalam berdasarkan informasi dari teks dan/atau file serta hasil pencarian web terbaru yang WAJIB dilakukan. 

WAJIB cari informasi terkini tentang:
- Perkembangan interpretasi hukum terbaru untuk kasus serupa
- Putusan pengadilan tinggi atau MA terbaru yang relevan
- Perubahan atau klarifikasi regulasi terbaru
- Praktik penegakan hukum terkini di Indonesia

Ingat bahwa dalam hukum Indonesia, Kitab Undang-Undang Hukum Pidana (KUHP) berfungsi sebagai lex generalis (hukum umum). Undang-Undang (UU) lain di luar KUHP yang mengatur tindak pidana secara spesifik (misalnya UU ITE, UU Perlindungan Konsumen, UU Tipikor, dll.) berfungsi sebagai lex specialis (hukum khusus). Terapkan asas lex specialis derogat legi generali, di mana hukum khusus akan mengesampingkan hukum umum jika suatu perbuatan diatur oleh keduanya. 

Jelaskan secara rinci jika ada UU khusus yang lebih tepat diterapkan daripada pasal dalam KUHP. Untuk kasus narkotika, UU Narkotika adalah lex specialis utama. Untuk kasus yang berindikasi terorisme, UU Anti-Terorisme adalah lex specialis utama.

Uraikan juga kemungkinan penerapan beberapa pasal secara bersamaan (juncto) jika relevan dengan kompleksitas kasus. Berikan justifikasi yang kuat untuk setiap argumen hukum yang diajukan berdasarkan sumber-sumber terbaru.]

UNIT PENYIDIK YANG DIREKOMENDASIKAN:
[Berdasarkan analisis hukum dan penerapan asas lex specialis dari teks dan/atau file, serta informasi terbaru tentang struktur organisasi kepolisian yang WAJIB dicari, rekomendasikan unit penyidik internal kepolisian yang paling tepat untuk menangani kasus ini.

WAJIB cari informasi terbaru tentang:
- Struktur organisasi Polri terkini (${currentYear})
- Pembagian tugas dan fungsi unit-unit penyidik terbaru
- Perubahan kewenangan atau reorganisasi terbaru

Gunakan definisi berikut (verifikasi dengan pencarian web untuk informasi terbaru):
- Direktorat Reserse Kriminal Umum (Ditreskrimum): Menangani tindak pidana yang diatur dalam Kitab Undang-Undang Hukum Pidana (KUHP) sebagai lex generalis.
- Direktorat Reserse Kriminal Khusus (Ditreskrimsus): Menangani tindak pidana yang memiliki undang-undang pidana khusus di luar KUHP (contoh: UU ITE, UU Tipikor, UU Perlindungan Konsumen), yang berfungsi sebagai lex specialis. Unit ini TIDAK menangani kasus Narkotika atau Terorisme yang memiliki unit/penanganan spesifik tersendiri.
- Direktorat Reserse Narkoba (Ditresnarkoba): Menangani tindak pidana terkait Narkotika dan Psikotropika, sesuai dengan Undang-Undang Narkotika sebagai lex specialis utama.
- Penanganan Terorisme (BNPT/Densus 88): Jika kasus berindikasi kuat tindak pidana terorisme, yang diatur oleh Undang-Undang Anti-Terorisme sebagai lex specialis utama. Untuk pelaporan awal di SPKT, arahkan ke Ditreskrimum atau Ditreskrimsus dengan catatan bahwa kasus ini memerlukan koordinasi dan penanganan lebih lanjut oleh unit anti-teror spesialis (BNPT/Densus 88).
- Bukan Pidana / Kasus Perdata: Jika analisis menunjukkan bahwa kasus ini lebih merupakan sengketa perdata dan bukan merupakan tindak pidana yang menjadi kewenangan Kepolisian.

Berikan alasan singkat untuk rekomendasi Anda, jelaskan mengapa unit tersebut paling sesuai berdasarkan sifat tindak pidana dan UU yang relevan serta struktur organisasi terbaru.]

BUKTI-BUKTI YANG DIPERLUKAN:
[Daftar bukti-bukti awal yang penting dan relevan yang perlu dikumpulkan atau diamankan oleh petugas untuk mendukung proses penyelidikan lebih lanjut, berdasarkan informasi dari teks dan/atau file.

WAJIB cari informasi terbaru tentang:
- Standar pembuktian terkini untuk jenis kasus ini
- Teknologi forensik terbaru yang dapat digunakan
- Prosedur pengumpulan barang bukti digital terbaru
- Persyaratan pembuktian berdasarkan regulasi terbaru

Contoh: rekaman CCTV, keterangan saksi, dokumen terkait, barang bukti fisik, bukti digital, dll. Sertakan juga metode pengumpulan dan pengamanan bukti yang sesuai dengan standar terbaru.]

CATATAN PENTING: 
- Pastikan semua informasi yang digunakan berasal dari sumber-sumber terpercaya dan terbaru (prioritas ${currentYear}-${currentYear - 1})
- Jika ada informasi yang mungkin sudah usang, berikan catatan tentang hal tersebut
- WAJIB menyertakan referensi dari pencarian web yang telah dilakukan
- Analisis tanpa pencarian web akan dianggap TIDAK VALID
`;
};

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

  const remainingText = text;
  for (const section of sections) {
    const startIndex = remainingText.toUpperCase().indexOf(section.heading.toUpperCase());
    if (startIndex !== -1) {
        const contentStart = startIndex + section.heading.length;
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

  console.log('SPKT Analysis: Starting analysis...');
  console.log('SPKT Analysis: Report text length:', reportText?.length || 0, 'characters');
  console.log('SPKT Analysis: File provided:', !!file);

  // Prepare content parts sesuai dokumentasi resmi
  const contentParts: ContentPart[] = [];
  
  // Tambahkan text prompt terlebih dahulu
  const promptString = PROMPT_TEMPLATE(reportText, !!file);
  contentParts.push({ text: promptString });

  // Tambahkan file jika ada (sesuai dokumentasi: text prompt sebelum file untuk hasil terbaik)
  if (file) {
    try {
      console.log('SPKT Analysis: Processing file for analysis...');
      const filePart = await fileToGenerativePart(file);
      contentParts.push(filePart);
      console.log('SPKT Analysis: File successfully added to content parts');
    } catch (e: unknown) {
      console.error("SPKT Analysis: Error processing file:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      throw { message: "Gagal memproses file yang diunggah.", details: errorMessage } as ApiError;
    }
  }

  try {
    // API call structure sesuai dokumentasi resmi Google Gemini API
    console.log('SPKT Analysis: Calling Gemini API with', contentParts.length, 'content parts');
    console.log('SPKT Analysis: Using model:', model);
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: [{ parts: contentParts }],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1, // Low temperature untuk konsistensi analisis
      },
    });
    
    console.log('SPKT Analysis: API call completed, checking response...');
    
    const responseText = response.text;
    if (!responseText) {
      throw { message: "Gagal mendapatkan respons teks dari AI." } as ApiError;
    }

    console.log('SPKT Analysis: Response received, parsing grounding metadata...');
    console.log('SPKT Analysis: Response length:', responseText.length, 'characters');
    
    const parsedAnalysis = parseAnalysisText(responseText);
    
    // Updated grounding metadata access sesuai dokumentasi resmi
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources: GroundingSource[] = [];
    
    if (groundingMetadata?.groundingChunks) {
      console.log('SPKT Analysis: Found grounding chunks:', groundingMetadata.groundingChunks.length);
      
      const uniqueSources = new Map<string, GroundingSource>();
      
      groundingMetadata.groundingChunks.forEach((chunk) => {
        if (chunk.web?.uri) {
          const uri = chunk.web.uri;
          const title = chunk.web.title || 'Sumber tidak berjudul';
          
          if (!uniqueSources.has(uri)) {
            uniqueSources.set(uri, { uri, title });
          }
        }
      });
      
      sources.push(...uniqueSources.values());
    }
    
    // Log search entry point jika tersedia
    if (groundingMetadata?.searchEntryPoint) {
      console.log('SPKT Analysis: Search entry point available');
    }
    
    console.log('SPKT Analysis: Extracted', sources.length, 'unique sources');

    // Peringatan jika tidak ada sources - ini menandakan grounding tidak bekerja
    if (sources.length === 0) {
      console.warn('🚨 PERINGATAN: Tidak ada sumber web yang ditemukan dari grounding!');
      console.warn('Ini menandakan bahwa pencarian web mungkin tidak dilakukan atau tidak berhasil.');
      console.warn('Analisis mungkin tidak menggunakan informasi terbaru yang diperlukan.');
    } else {
      console.log('✅ Grounding berhasil - menggunakan', sources.length, 'sumber web terpercaya');
    }

    return {
      analysis: parsedAnalysis,
      sources: sources,
    };

  } catch (error: unknown) {
    console.error('Gemini API Error:', error);
    let errorMessage = "Terjadi kesalahan saat menghubungi layanan AI Gemini.";
    
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    
    const errorString = String(error);
    if (errorString.includes("API_KEY_INVALID") || errorString.includes("PERMISSION_DENIED")) {
        errorMessage = "Kunci API tidak valid atau tidak memiliki izin yang diperlukan. Harap periksa konfigurasi API Key Anda.";
    } else if (errorString.includes("Quota exceeded")) {
        errorMessage = "Kuota penggunaan API telah terlampaui. Silakan coba lagi nanti atau tingkatkan kuota Anda.";
    } else if (errorString.includes("Request payload size exceeds the limit")) {
        errorMessage = "Ukuran file yang diunggah terlalu besar. Mohon unggah file yang lebih kecil.";
    } else if (errorString.includes("SAFETY")) {
        errorMessage = "Konten ditolak karena alasan keamanan. Silakan coba dengan konten yang berbeda.";
    }

    throw { message: errorMessage, details: errorString } as ApiError;
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
  } else {
    // Peringatan jika tidak ada sources
    markdown += `

---

# ⚠️ Peringatan: Sumber Internet

**PERHATIAN**: Tidak ada sumber internet yang terdeteksi dalam analisis ini. 
Analisis mungkin tidak menggunakan informasi hukum terbaru yang diperlukan untuk akurasi maksimal.
Disarankan untuk melakukan verifikasi manual terhadap pasal-pasal dan regulasi yang disebutkan.

`;
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
    console.log('SPKT Analysis: Using model:', model);
    console.log('SPKT Analysis: API Key status:', API_KEY ? 'Available' : 'Missing');
    
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
    
    if (analysisResult.sources.length > 0) {
      console.log('SPKT Analysis: Source domains:', analysisResult.sources.map(s => {
        try {
          return new URL(s.uri).hostname;
        } catch {
          return 'invalid-url';
        }
      }));
    } else {
      console.warn('SPKT Analysis: No grounding sources found - grounding may not be working properly');
    }

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