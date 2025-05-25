// Service untuk Intelkam AI - Analisis Intelijen Kepolisian
// Implementasi lengkap dengan Gemini API untuk laporan dan pencarian produk intelijen

import { GoogleGenAI, GenerateContentResponse, Part, GroundingChunk } from "@google/genai";
import { supabase } from '@/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Interface untuk data input laporan intelejen
interface ReportInputData {
  issue: string;
  category: string;
  sumber: string;
  caraMendapatkanBaket: string;
  hubunganDenganSasaran: string;
  waktuMendapatkanInformasi: string;
  nilaiInformasi: string;
}

// Interface untuk hasil generasi
interface GeneratedReport {
  reportText: string;
  sources: GroundingChunk[];
}

// Interface untuk web source
interface WebSource {
  uri: string;
  title: string;
}

// Interface untuk hasil analisis intelligence yang terstruktur
interface IntelligenceAnalysisResult {
  analysis: string;
  executiveSummary: string;
  reportMetadata: {
    wilayahHukum: string;
    kategori: string;
    tanggalPencarian: string;
    mode: 'REPORT' | 'SEARCH';
  };
  intelligenceIssues: Array<{
    title: string;
    summary: string;
    potentialInvestigation: string[];
    sources: string[];
  }>;
  searchQueries: string[];
  webSources: WebSource[];
}

// Constants
const GEMINI_MODEL_NAME = 'gemini-2.0-flash';
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

// Fungsi untuk mendapatkan waktu terkini dalam format Indonesia
export const getCurrentDateTime = (): string => {
  const now = new Date();
  return now.toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }) + " WIB";
};

// Fungsi untuk mendapatkan rentang waktu pencarian yang relevan
const getSearchTimeRange = (): { 
  currentDate: string; 
  oneMonthAgo: string; 
  threeMonthsAgo: string; 
  sixMonthsAgo: string;
  oneYearAgo: string;
} => {
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const formatDate = (date: Date) => date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    currentDate: formatDate(now),
    oneMonthAgo: formatDate(oneMonthAgo),
    threeMonthsAgo: formatDate(threeMonthsAgo),
    sixMonthsAgo: formatDate(sixMonthsAgo),
    oneYearAgo: formatDate(oneYearAgo)
  };
};

// Label untuk input fields
export const REPORT_INPUT_LABELS: { [key: string]: string } = {
  issue: "Pokok Permasalahan/Isu Utama",
  category: "Kategori Isu (misalnya: Keamanan Publik, Narkotika, Terorisme)",
  sumber: "Sumber Informasi (Pelapor)",
  caraMendapatkanBaket: "Cara Mendapatkan Informasi",
  hubunganDenganSasaran: "Hubungan dengan Sasaran/Target",
  waktuMendapatkanInformasi: "Waktu Mendapatkan Informasi",
  nilaiInformasi: "Nilai Informasi (contoh: A1, B2)",
};

// Data default untuk laporan
export const INITIAL_REPORT_DATA = {
  issue: "",
  category: "",
  sumber: "Pelapor",
  caraMendapatkanBaket: "Monitoring Media",
  hubunganDenganSasaran: "Tidak Langsung",
  waktuMendapatkanInformasi: getCurrentDateTime(),
  nilaiInformasi: "A1",
};

// Fungsi untuk membangun prompt laporan intelejen
const buildIntelligenceReportPrompt = (inputs: ReportInputData): string => {
  const timeRange = getSearchTimeRange();
  const currentDateTime = getCurrentDateTime();
  
  return `
Anda adalah analis intelijen kepolisian yang bertugas menyusun laporan intelijen komprehensif dalam Bahasa Indonesia berdasarkan isu utama: "${inputs.issue}" dalam kategori: "${inputs.category}".

**KONTEKS WAKTU TERKINI:**
- Tanggal dan waktu saat ini: ${currentDateTime}
- Rentang pencarian prioritas: ${timeRange.threeMonthsAgo} hingga ${timeRange.currentDate}
- Untuk konteks historis: maksimal hingga ${timeRange.oneYearAgo}

**PRIORITAS PENCARIAN:**
Prioritaskan informasi dari:
1. Berita dan laporan dari 3 bulan terakhir (${timeRange.threeMonthsAgo} - ${timeRange.currentDate})
2. Data statistik terbaru dari institusi resmi (Polri, BPS, Kemenkumham)
3. Perkembangan tren dan pola kejadian terkini
4. Informasi real-time yang dapat mempengaruhi analisis

Susun laporan intelijen lengkap dengan format berikut:

I. PENDAHULUAN
Sumber : ${inputs.sumber}
Cara Mendapatkan Baket : ${inputs.caraMendapatkanBaket}
Hubungan dengan sasaran : ${inputs.hubunganDenganSasaran}
Waktu mendapatkan informasi : ${inputs.waktuMendapatkanInformasi}
Nilai Informasi : ${inputs.nilaiInformasi}

II. FAKTA-FAKTA
[Hasilkan narasi kejadian atau serangkaian fakta yang konkret dan spesifik berdasarkan informasi terkait isu "${inputs.issue}" dan kategori "${inputs.category}". Sertakan:
- Perkiraan tanggal dan waktu kejadian (jika spesifik)
- Lokasi kejadian yang masuk akal sesuai konteks
- Jumlah orang yang terlibat atau terdampak
- Deskripsi singkat namun jelas mengenai aktivitas utama, peristiwa, atau temuan
- Aktor-aktor kunci yang terlibat (jika ada)
Fakta-fakta ini harus menjadi dasar yang kuat untuk analisa dan prediksi di bagian selanjutnya.]

III. PENDAPAT PELAPOR
Berdasarkan FAKTA-FAKTA yang telah dikumpulkan pada Bagian II, berikan pendapat pelapor yang mendalam dan terstruktur:

I. ANALISA :
[Berikan analisa mendalam mengenai Fakta-Fakta yang telah disajikan. Hubungkan fakta-fakta tersebut dengan isu utama "${inputs.issue}". Jelaskan potensi implikasi, modus operandi (jika ada), dan faktor-faktor penyebab atau pendukung dari situasi yang dilaporkan.]

II. PREDIKSI :
[Berdasarkan analisa, buat prediksi mengenai kemungkinan perkembangan situasi di masa mendatang. Apa saja skenario yang mungkin terjadi? Apa potensi eskalasi atau dampak lebih lanjut jika tidak ada intervensi?]

III. LANGKAH – LANGKAH INTELIJEN :
[Rekomendasikan langkah-langkah intelijen spesifik yang perlu segera diambil untuk merespons situasi. Contoh: "Melakukan koordinasi dengan unit XYZ.", "Melakukan pendalaman dan pengumpulan bukti tambahan (Pulbaket) terhadap subjek A.", "Melakukan pemantauan tertutup (Pamtup) di lokasi B."]

IV. REKOMENDASI :
[Berikan rekomendasi tindakan konkret atau kebijakan strategis yang disarankan kepada pimpinan atau unit terkait untuk mengatasi isu atau situasi berdasarkan keseluruhan analisa dan prediksi. Rekomendasi harus jelas, dapat ditindaklanjuti, dan bertujuan untuk mitigasi risiko atau penyelesaian masalah.]

Tulis seluruh laporan dalam Bahasa Indonesia formal yang baik dan benar, dengan struktur yang rapi dan jelas sesuai format yang diminta. Fokus pada kualitas, akurasi, dan relevansi informasi.
`;
};

// Fungsi untuk membangun prompt pencarian produk intelejen
const buildIntelligenceProductSearchPrompt = (wilayahHukum: string, category?: string): string => {
  const timeRange = getSearchTimeRange();
  const currentDateTime = getCurrentDateTime();
  
  let prompt = `
Anda adalah analis intelijen AI yang bertugas mengidentifikasi isu-isu terkini dan relevan di wilayah hukum "${wilayahHukum}" yang berpotensi menjadi objek penyelidikan intelijen.

**KONTEKS WAKTU TERKINI:**
- Tanggal dan waktu saat ini: ${currentDateTime}
- Fokus pencarian: ${timeRange.oneMonthAgo} hingga ${timeRange.currentDate} (prioritas utama)
- Rentang maksimal: ${timeRange.sixMonthsAgo} hingga ${timeRange.currentDate}
`;

  if (category && category.trim() !== "") {
    prompt += `\n**KATEGORI FOKUS:** ${category}\n`;
  } else {
    prompt += `\n**KATEGORI YANG DIPERTIMBANGKAN:** Ancaman keamanan nasional, kejahatan terorganisir, terorisme, spionase, kejahatan siber tingkat lanjut, potensi konflik sosial signifikan, atau aktivitas lain yang mengganggu stabilitas dan ketertiban umum.\n`;
  }

  prompt += `
**PRIORITAS PENCARIAN:**
1. **PRIORITAS TINGGI** - Kejadian dari 1 bulan terakhir (${timeRange.oneMonthAgo} - ${timeRange.currentDate})
2. **PRIORITAS SEDANG** - Tren dari 3 bulan terakhir (${timeRange.threeMonthsAgo} - ${timeRange.currentDate})
3. **KONTEKS TAMBAHAN** - Pola dari 6 bulan terakhir (${timeRange.sixMonthsAgo} - ${timeRange.currentDate})

Identifikasi dan sajikan setiap potensi isu dalam format berikut:

---
**JUDUL ISU/POTENSI PENYELIDIKAN:** [Berikan judul singkat yang menggambarkan isu, contoh: "Peningkatan Aktivitas Penipuan Online dengan Modus Baru di ${wilayahHukum}"]

**RINGKASAN ISU:** [Jelaskan secara singkat isu tersebut, mengapa ini relevan untuk intelijen, apa indikasinya, dan perkiraan waktu kejadian atau periode trennya. Sebutkan jika ada pola atau aktor yang mencurigakan.]

**POTENSI AWAL PENYELIDIKAN:** [Sebutkan beberapa pertanyaan awal atau arah penyelidikan yang bisa dilakukan. Contoh: "Siapa aktor utama di balik modus ini?", "Bagaimana jaringan mereka beroperasi?", "Apa dampak kerugian yang ditimbulkan?"]

**SUMBER INFORMASI AWAL:** [Jika ada, sebutkan sumber URL yang relevan dan dapat diakses publik yang Anda gunakan untuk informasi ini. Format sebagai daftar jika lebih dari satu.]
---

Jika menemukan beberapa potensi isu, daftarkan semuanya. Jika tidak menemukan isu spesifik yang sangat menonjol untuk penyelidikan baru, berikan ringkasan tren keamanan umum yang paling relevan dan terkini di wilayah tersebut, beserta sumbernya.

Pastikan semua informasi berdasarkan hasil pencarian yang faktual dan relevan dengan timestamp yang jelas.
`;
  return prompt;
};

// Fungsi untuk parsing response intelligence dengan struktur yang lebih baik
function parseIntelligenceResponse(responseText: string, mode: 'REPORT' | 'SEARCH'): IntelligenceAnalysisResult | null {
  try {
    // Extract metadata dari header
    const wilayahHukumMatch = responseText.match(/\*\*Wilayah Hukum:\*\*\s*([^\n]*)/i);
    const kategoriMatch = responseText.match(/\*\*Kategori:\*\*\s*([^\n]*)/i);
    const tanggalMatch = responseText.match(/\*\*Tanggal (?:Pencarian|Laporan):\*\*\s*([^\n]*)/i);
    
    // Extract intelligence issues untuk mode SEARCH
    const intelligenceIssues: Array<{
      title: string;
      summary: string;
      potentialInvestigation: string[];
      sources: string[];
    }> = [];
    
    if (mode === 'SEARCH') {
      // Parse intelligence issues dengan format actual dari Gemini
      // Split by sections and parse each
      const sections = responseText.split(/---\s*\n?\*\*JUDUL ISU\/POTENSI PENYELIDIKAN:\*\*/);
      
      sections.forEach((section, index) => {
        if (index === 0) return; // Skip content before first issue
        
        // Extract title
        const titleMatch = section.match(/^([^\n]*)/);
        const title = titleMatch ? titleMatch[1].trim() : 'Unknown Issue';
        
        // Extract summary
        const summaryMatch = section.match(/\*\*RINGKASAN ISU:\*\*\s*([\s\S]*?)(?=\*\*POTENSI AWAL PENYELIDIKAN:\*\*|$)/i);
        const summary = summaryMatch ? summaryMatch[1].trim() : '';
        
        // Extract potential investigation
        const potensiMatch = section.match(/\*\*POTENSI AWAL PENYELIDIKAN:\*\*([\s\S]*?)(?=\*\*SUMBER INFORMASI AWAL:\*\*|$)/i);
        const potentialInvestigation: string[] = [];
        if (potensiMatch && potensiMatch[1]) {
          const bulletPoints = potensiMatch[1].match(/^\s*\*\s+([^\n]+)/gm);
          if (bulletPoints) {
            potentialInvestigation.push(...bulletPoints.map(point => 
              point.replace(/^\s*\*\s+/, '').trim()
            ));
          }
        }
        
        // Extract sources
        const sumberMatch = section.match(/\*\*SUMBER INFORMASI AWAL:\*\*([\s\S]*?)(?=---|\*\*JUDUL ISU|$)/i);
        const sources: string[] = [];
        if (sumberMatch && sumberMatch[1]) {
          const urlMatches = sumberMatch[1].match(/https?:\/\/[^\s\]]+/g);
          if (urlMatches) {
            sources.push(...urlMatches);
          }
        }
        
        if (title) {
          intelligenceIssues.push({
            title,
            summary,
            potentialInvestigation,
            sources
          });
        }
      });
    }
    
    // Extract executive summary
    let executiveSummary = '';
    if (mode === 'SEARCH') {
      // Untuk search mode, gunakan paragraf pertama setelah metadata
      const contentAfterMetadata = responseText.split('WIB\n\n')[1];
      if (contentAfterMetadata) {
        const firstParagraph = contentAfterMetadata.split('\n\n')[0];
        executiveSummary = firstParagraph?.replace(/^Tentu,?\s*/, '').trim() || '';
      }
    } else {
      // Untuk report mode, extract dari section PENDAHULUAN atau awal dokumen
      const pendahuluanMatch = responseText.match(/I\.\s*PENDAHULUAN([\s\S]*?)(?=II\.|$)/i);
      executiveSummary = pendahuluanMatch ? pendahuluanMatch[1].trim() : '';
    }
    
    console.log('Parsing intelligence response:', {
      mode,
      issuesFound: intelligenceIssues.length,
      executiveSummaryLength: executiveSummary.length,
      hasMetadata: !!(wilayahHukumMatch || kategoriMatch || tanggalMatch)
    });
    
    return {
      analysis: responseText,
      executiveSummary,
      reportMetadata: {
        wilayahHukum: wilayahHukumMatch ? wilayahHukumMatch[1].trim() : '',
        kategori: kategoriMatch ? kategoriMatch[1].trim() : '',
        tanggalPencarian: tanggalMatch ? tanggalMatch[1].trim() : '',
        mode
      },
      intelligenceIssues,
      searchQueries: [],
      webSources: []
    };
  } catch (error) {
    console.error('Error parsing intelligence response:', error);
    return null;
  }
}

// Fungsi utama untuk generate laporan intelejen
export const generateIntelligenceReport = async (inputs: ReportInputData): Promise<string> => {
  try {
    // Log untuk debugging
    const user_id = await getCurrentUserId();
    const session_id = await getSessionId();
    
    console.log('Generating intelligence report for issue:', inputs.issue);
    console.log('Category:', inputs.category);
    console.log('User ID:', user_id);
    console.log('Session ID:', session_id);

    const prompt = buildIntelligenceReportPrompt(inputs);

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: prompt }] as Part[] }],
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    const reportText = response.text;
    if (!reportText || reportText.trim() === "") {
      throw new Error("Generated report text is empty. The model might not have found relevant information or encountered an issue.");
    }

    console.log('Raw Gemini intelligence report response:', reportText);

    // Ekstrak sumber web dari grounding metadata
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources: WebSource[] = [];
    
    if (groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
      groundingMetadata.groundingChunks.forEach((chunk: GroundingChunk) => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          sources.push({ 
            uri: chunk.web.uri, 
            title: chunk.web.title 
          });
        }
      });
    }

    // Handle web search queries yang digunakan
    let webSearchQueries: string[] = [];
    if (groundingMetadata?.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
      webSearchQueries = groundingMetadata.webSearchQueries;
    }

    // Parse structured result
    const parsedAnalysis = parseIntelligenceResponse(reportText, 'REPORT');
    if (parsedAnalysis) {
      parsedAnalysis.searchQueries = webSearchQueries;
      parsedAnalysis.webSources = sources;
      console.log('Intelligence report parsed successfully:', {
        issuesFound: parsedAnalysis.intelligenceIssues.length,
        sourcesFound: sources.length,
        queriesUsed: webSearchQueries.length
      });
    }

    // Format hasil akhir dengan enhanced structure
    let finalResult = `# LAPORAN INTELIJEN KEPOLISIAN\n\n`;
    finalResult += `**Tanggal Laporan:** ${getCurrentDateTime()}\n`;
    finalResult += `**Kategori:** ${inputs.category}\n`;
    finalResult += `**Pokok Permasalahan:** ${inputs.issue}\n\n`;
    
    finalResult += reportText;
    
    // Tambahkan web search queries jika ada
    if (webSearchQueries.length > 0) {
      finalResult += `\n---\n**QUERY PENCARIAN:** ${webSearchQueries.join(', ')}\n`;
    }

    // Tambahkan referensi web dengan numbering yang lebih baik
    if (sources.length > 0) {
      finalResult += `\n## SUMBER REFERENSI ONLINE\n`;
      sources.forEach((source, index) => {
        finalResult += `${index + 1}. [${source.title}](${source.uri})\n`;
      });
      finalResult += `\n`;
    }

    // Tambahkan catatan dengan metadata
    if (sources.length > 0) {
      const timeRange = getSearchTimeRange();
      finalResult += `*Laporan intelijen ini berdasarkan data dan informasi terkini yang diperoleh melalui pencarian web pada ${getCurrentDateTime()}. `;
      finalResult += `Prioritas pencarian: ${timeRange.threeMonthsAgo} - ${timeRange.currentDate}. `;
      finalResult += `Total ${sources.length} sumber referensi dan ${webSearchQueries.length} query pencarian digunakan.*`;
    }

    console.log('Intelligence report generated successfully');
    console.log(`Found ${sources.length} grounding sources and ${webSearchQueries.length} search queries`);
    
    return finalResult;

  } catch (error) {
    console.error("Error in generateIntelligenceReport:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('API_KEY_INVALID')) {
        throw new Error("Konfigurasi API key Gemini tidak valid. Silakan periksa pengaturan VITE_GEMINI_API_KEY.");
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error("Batas penggunaan API tercapai. Silakan coba lagi nanti.");
      }
      if (error.message.includes('grounding') || error.message.includes('search')) {
        throw new Error("Layanan Google Search grounding sedang tidak tersedia. Silakan coba lagi nanti.");
      }
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    
    throw new Error("Terjadi kesalahan tidak diketahui saat menghasilkan laporan intelijen.");
  }
};

// Fungsi untuk pencarian produk intelejen berdasarkan wilayah hukum
export const searchIntelligenceProductsByArea = async (wilayahHukum: string, category?: string): Promise<string> => {
  try {
    // Log untuk debugging
    const user_id = await getCurrentUserId();
    const session_id = await getSessionId();
    
    console.log('Searching intelligence products for area:', wilayahHukum);
    console.log('Category filter:', category || 'All categories');
    console.log('User ID:', user_id);
    console.log('Session ID:', session_id);

    const prompt = buildIntelligenceProductSearchPrompt(wilayahHukum, category);

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: prompt }] as Part[] }],
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    const reportText = response.text;
    if (!reportText || reportText.trim() === "") {
      throw new Error("Search for intelligence products returned empty. The model might not have found relevant information or encountered an issue.");
    }

    console.log('Raw Gemini intelligence search response:', reportText);

    // Ekstrak sumber web dari grounding metadata
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources: WebSource[] = [];
    
    if (groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
      groundingMetadata.groundingChunks.forEach((chunk: GroundingChunk) => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          sources.push({ 
            uri: chunk.web.uri, 
            title: chunk.web.title 
          });
        }
      });
    }

    // Handle web search queries yang digunakan
    let webSearchQueries: string[] = [];
    if (groundingMetadata?.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
      webSearchQueries = groundingMetadata.webSearchQueries;
    }

    // Parse structured result untuk search mode
    const parsedAnalysis = parseIntelligenceResponse(reportText, 'SEARCH');
    if (parsedAnalysis) {
      parsedAnalysis.searchQueries = webSearchQueries;
      parsedAnalysis.webSources = sources;
      console.log('Intelligence search parsed successfully:', {
        issuesFound: parsedAnalysis.intelligenceIssues.length,
        sourcesFound: sources.length,
        queriesUsed: webSearchQueries.length
      });
    }

    // Format hasil akhir dengan enhanced structure
    let finalResult = `# PENCARIAN PRODUK INTELIJEN\n\n`;
    finalResult += `**Wilayah Hukum:** ${wilayahHukum}\n`;
    if (category) {
      finalResult += `**Kategori:** ${category}\n`;
    }
    finalResult += `**Tanggal Pencarian:** ${getCurrentDateTime()}\n\n`;
    
    // Jika ada parsed analysis dengan intelligence issues, format secara terstruktur
    if (parsedAnalysis && parsedAnalysis.intelligenceIssues.length > 0) {
      finalResult += `${parsedAnalysis.executiveSummary}\n\n`;
      
      parsedAnalysis.intelligenceIssues.forEach((issue) => {
        finalResult += `---\n`;
        finalResult += `**JUDUL ISU/POTENSI PENYELIDIKAN:** ${issue.title}\n\n`;
        finalResult += `**RINGKASAN ISU:** ${issue.summary}\n\n`;
        
        if (issue.potentialInvestigation.length > 0) {
          finalResult += `**POTENSI AWAL PENYELIDIKAN:**\n\n`;
          issue.potentialInvestigation.forEach(point => {
            finalResult += `* ${point}\n`;
          });
          finalResult += `\n`;
        }
        
        if (issue.sources.length > 0) {
          finalResult += `**SUMBER INFORMASI AWAL:**\n\n`;
          issue.sources.forEach(source => {
            finalResult += `* ${source}\n`;
          });
          finalResult += `\n`;
        }
      });
    } else {
      // Fallback ke raw output jika parsing gagal
      finalResult += reportText;
    }
    
    // Tambahkan web search queries jika ada
    if (webSearchQueries.length > 0) {
      finalResult += `\n---\n**QUERY PENCARIAN:** ${webSearchQueries.join(', ')}\n`;
    }

    // Tambahkan referensi web dengan enhanced formatting
    if (sources.length > 0) {
      finalResult += `\n## SUMBER REFERENSI ONLINE\n`;
      sources.forEach((source, index) => {
        // Extract domain for better readability
        const domain = source.uri.match(/https?:\/\/([^\/]+)/)?.[1] || 'Unknown';
        finalResult += `${index + 1}. [${domain}](${source.uri})\n`;
      });
      finalResult += `\n`;
    }

    // Tambahkan catatan dengan metadata yang lebih detail
    if (sources.length > 0 || webSearchQueries.length > 0) {
      const timeRange = getSearchTimeRange();
      finalResult += `*Pencarian produk intelijen ini berdasarkan informasi publik terkini yang diperoleh melalui pencarian web pada ${getCurrentDateTime()}. `;
      finalResult += `Fokus pencarian: ${timeRange.oneMonthAgo} - ${timeRange.currentDate} (prioritas), maksimal ${timeRange.sixMonthsAgo} - ${timeRange.currentDate}. `;
      if (parsedAnalysis && parsedAnalysis.intelligenceIssues.length > 0) {
        finalResult += `Ditemukan ${parsedAnalysis.intelligenceIssues.length} potensi isu intelijen `;
      }
      finalResult += `dari ${sources.length} sumber referensi menggunakan ${webSearchQueries.length} query pencarian.*`;
    }

    console.log('Intelligence products search completed successfully');
    console.log(`Found ${sources.length} grounding sources, ${webSearchQueries.length} search queries, and ${parsedAnalysis?.intelligenceIssues.length || 0} intelligence issues`);
    
    return finalResult;

  } catch (error) {
    console.error("Error in searchIntelligenceProductsByArea:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('API_KEY_INVALID')) {
        throw new Error("Konfigurasi API key Gemini tidak valid. Silakan periksa pengaturan VITE_GEMINI_API_KEY.");
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error("Batas penggunaan API tercapai. Silakan coba lagi nanti.");
      }
      if (error.message.includes('grounding') || error.message.includes('search')) {
        throw new Error("Layanan Google Search grounding sedang tidak tersedia. Silakan coba lagi nanti.");
      }
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    
    throw new Error("Terjadi kesalahan tidak diketahui saat mencari produk intelijen.");
  }
};

// Fungsi utama yang akan dipanggil dari useAgentForm
export const submitLaporanInteljenAnalysis = async (message: string): Promise<string> => {
  try {
    // Parse input message untuk menentukan mode
    // Format: "MODE:REPORT|SEARCH\nDATA:{json_data}" atau fallback ke mode report dengan message sebagai issue
    
    let mode = 'REPORT';
    let data: any = {};
    
    if (message.includes('MODE:')) {
      const lines = message.split('\n');
      const modeLine = lines.find(line => line.startsWith('MODE:'));
      const dataLine = lines.find(line => line.startsWith('DATA:'));
      
      if (modeLine) {
        mode = modeLine.replace('MODE:', '').trim();
      }
      
      if (dataLine) {
        try {
          data = JSON.parse(dataLine.replace('DATA:', '').trim());
        } catch (e) {
          console.warn('Failed to parse data JSON, using fallback');
        }
      }
    }
    
    if (mode === 'SEARCH') {
      // Mode pencarian produk intelejen
      const wilayahHukum = data.wilayahHukum || message.trim();
      const category = data.category;
      
      return await searchIntelligenceProductsByArea(wilayahHukum, category);
    } else {
      // Mode laporan intelejen (default)
      const reportData: ReportInputData = {
        issue: data.issue || message.trim(),
        category: data.category || '',
        sumber: data.sumber || INITIAL_REPORT_DATA.sumber,
        caraMendapatkanBaket: data.caraMendapatkanBaket || INITIAL_REPORT_DATA.caraMendapatkanBaket,
        hubunganDenganSasaran: data.hubunganDenganSasaran || INITIAL_REPORT_DATA.hubunganDenganSasaran,
        waktuMendapatkanInformasi: data.waktuMendapatkanInformasi || INITIAL_REPORT_DATA.waktuMendapatkanInformasi,
        nilaiInformasi: data.nilaiInformasi || INITIAL_REPORT_DATA.nilaiInformasi,
      };
      
      return await generateIntelligenceReport(reportData);
    }
    
  } catch (error) {
    console.error('Error in submitLaporanInteljenAnalysis:', error);
    throw error;
  }
};

// Export structured version untuk analisis lebih lanjut atau canvas component
export const getStructuredIntelligenceAnalysis = async (mode: 'REPORT' | 'SEARCH', data: any) => {
  let rawResult: string;
  
  if (mode === 'SEARCH') {
    const wilayahHukum = data.wilayahHukum || '';
    const category = data.category;
    rawResult = await searchIntelligenceProductsByArea(wilayahHukum, category);
  } else {
    const reportData: ReportInputData = {
      issue: data.issue || '',
      category: data.category || '',
      sumber: data.sumber || INITIAL_REPORT_DATA.sumber,
      caraMendapatkanBaket: data.caraMendapatkanBaket || INITIAL_REPORT_DATA.caraMendapatkanBaket,
      hubunganDenganSasaran: data.hubunganDenganSasaran || INITIAL_REPORT_DATA.hubunganDenganSasaran,
      waktuMendapatkanInformasi: data.waktuMendapatkanInformasi || INITIAL_REPORT_DATA.waktuMendapatkanInformasi,
      nilaiInformasi: data.nilaiInformasi || INITIAL_REPORT_DATA.nilaiInformasi,
    };
    rawResult = await generateIntelligenceReport(reportData);
  }
  
  // Parse the result
  const parsedAnalysis = parseIntelligenceResponse(rawResult, mode);
  
  // Extract sources and queries from result
  const sourcesMatch = rawResult.match(/## SUMBER REFERENSI ONLINE\n([\s\S]*?)(?=\n\*|$)/);
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
  
  // Extract search queries
  const queryMatch = rawResult.match(/\*\*QUERY PENCARIAN:\*\*\s*([^\n]*)/);
  const searchQueries = queryMatch ? queryMatch[1].split(',').map(q => q.trim()) : [];
  
  return {
    rawContent: rawResult,
    analysis: parsedAnalysis,
    sources,
    searchQueries,
    mode,
    metadata: parsedAnalysis ? parsedAnalysis.reportMetadata : null
  };
};

// Export types untuk use di komponen lain
export type { ReportInputData, GeneratedReport, WebSource, IntelligenceAnalysisResult }; 