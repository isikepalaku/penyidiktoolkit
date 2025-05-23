import { GoogleGenAI, GenerateContentResponse, Part, GroundingChunk } from "@google/genai";
import { supabase } from '@/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

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

export const submitAgentAnalysis = async (
  message: string
): Promise<string> => {
  try {
    // Log untuk debugging
    const user_id = await getCurrentUserId();
    const session_id = await getSessionId();
    
    console.log('Sending request to Gemini API with message:', message);
    console.log('User ID:', user_id);
    console.log('Session ID:', session_id);

    const systemPrompt = `PERINTAH SISTEM PENTING:
Anda adalah Reserse AI, sebuah sistem investigasi kepolisian canggih yang dikembangkan oleh ibrahim sandre. 

PENTING: Gunakan format berikut untuk setiap bagian:

1. Analisis Kronologi:
* [Tanggal/Waktu]:
  - Tempat: [lokasi]
  - Kejadian: [deskripsi kejadian]
  - Pihak Terlibat:
    > [nama pihak]: [tindakan yang dilakukan]
    > [nama pihak]: [tindakan yang dilakukan]

Contoh:
* 28 Desember 2017:
  - Tempat: Via SMS Banking
  - Kejadian: Transfer uang sebesar Rp700.000
  - Pihak Terlibat:
    > Pelapor: Melakukan transfer uang
    > Terlapor: Menerima transfer uang

2. Analisis Pihak yang Terlibat:
* [Nama/Identitas]:
  - Peran: [peran dalam kejadian]
  - Tindakan: [tindakan yang dilakukan]

3. Identifikasi Barang Bukti dan Kerugian:
A. Barang Bukti:
* Bukti 1: [deskripsi bukti]
* Bukti 2: [deskripsi bukti]
* Bukti 3: [deskripsi bukti]

B. Kerugian:
* Kerugian Material:
  - [deskripsi kerugian material]
* Kerugian Non-Material:
  - [deskripsi kerugian non-material]

PENTING:
- JANGAN gunakan format tabel
- Gunakan format bullet points dan indentasi seperti contoh di atas
- Pastikan setiap poin terstruktur dengan jelas
- Gunakan tanda * untuk bullet points level 1
- Gunakan tanda - untuk bullet points level 2
- Gunakan tanda > untuk bullet points level 3`;

    const prompt = systemPrompt + `

Analisis kasus berikut secara mendalam dan sistematis:

${message}

Lakukan analisis dengan format berikut:

1. **Analisis Kronologi:**
   - Dokumentasikan secara rinci waktu (tempus), lokasi (locus), dan urutan kejadian.
   - Identifikasi semua tindakan yang dilakukan oleh setiap pihak yang terlibat.

2. **Analisis Pihak yang Terlibat:**
   - Catat identitas dan peran pelapor, terlapor, serta saksi.
   - Dokumentasikan kontribusi setiap pihak terhadap kejadian.

3. **Analisis Aspek Hukum:**
   - Kajian fakta berdasarkan tindakan dan peristiwa.
   - Hubungkan fakta dengan keterlibatan masing-masing pihak.

4. **Identifikasi Permasalahan Hukum Utama:**
    - Tentukan permasalahan hukum utama dari perspektif hukum.
    - Analisis dampak hukum dari setiap tindakan.

5. **Analisis Latar Belakang dan Motif:**
    - Selidiki hubungan antara pihak-pihak yang terlibat.
    - Identifikasi motif yang mungkin melatarbelakangi kejadian.

6. **Rekomendasi Penanganan:**
    - Verifikasi semua informasi hukum, objek, alat, dan lokasi untuk menentukan:
        - **Lex Spesialis**: Kasus yang perlu ditangani oleh Direktorat Reserse Kriminal Khusus.
        - **Tindak Pidana Umum**: Kasus yang perlu ditangani oleh Direktorat Reserse Kriminal Umum.

---

Berikan analisis terstruktur dan terperinci untuk setiap poin di atas. Pastikan semua bagian terisi dengan lengkap dan akurat. Gunakan format yang telah disediakan untuk barang bukti dan kerugian. Pertahankan nada yang jelas dan objektif sepanjang analisis.`;

    // Generate content dengan konfigurasi baru
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        temperature: 1.0,
        topP: 0.95,
      },
    });

    if (!response.text) {
      throw new Error('Tidak ada respons yang valid dari AI');
    }

    console.log('Received response from Gemini API');
    return response.text;

  } catch (error) {
    console.error('Error in submitAgentAnalysis:', error);
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('401')) {
        throw new Error('API key Gemini tidak valid. Silakan periksa konfigurasi VITE_GEMINI_API_KEY.');
      }
      if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
        throw new Error('Terlalu banyak permintaan analisis. Silakan tunggu beberapa saat sebelum mencoba lagi.');
      }
      if (error.message.includes('403')) {
        throw new Error('Forbidden: Tidak memiliki akses ke layanan Gemini API.');
      }
      if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Rate limit terlampaui. Silakan tunggu beberapa menit sebelum mencoba lagi.');
      }
      
      // Generic error with original message
      throw new Error(`Gagal menganalisis kasus: ${error.message}`);
    }
    
    throw new Error('Gagal menganalisis kasus. Silakan coba lagi nanti.');
  }
};
