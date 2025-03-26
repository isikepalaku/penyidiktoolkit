import { env } from '@/config/env';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Ensure Gemini API key is available
if (!env.geminiApiKey) {
  throw new Error('Gemini API key is not configured');
}

// Initialize the model
const genAI = new GoogleGenerativeAI(env.geminiApiKey);

export const submitAgentAnalysis = async (
  message: string
): Promise<string> => {
  try {
    console.log('Sending request to Gemini API with message:', message);

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 1.0,
        topP: 0.95,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

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

    const prompt = systemPrompt + `Analisis kasus berikut secara mendalam dan sistematis:

${message}

Lakukan analisis dengan format berikut:

1. **Analisis Kronologi:**
   - Dokumentasikan secara rinci waktu (tempus), lokasi (locus), dan urutan kejadian.
   - Identifikasi semua tindakan yang dilakukan oleh setiap pihak yang terlibat.

2. **Analisis Pihak yang Terlibat:**
   - Catat identitas dan peran pelapor, terlapor, serta saksi.
   - Dokumentasikan kontribusi setiap pihak terhadap kejadian.

4. **Analisis Aspek Hukum:**
   - Kajian fakta berdasarkan tindakan dan peristiwa.
   - Hubungkan fakta dengan keterlibatan masing-masing pihak.

5. **Identifikasi Permasalahan Hukum Utama:**
    - Tentukan permasalahan hukum utama dari perspektif hukum.
    - Analisis dampak hukum dari setiap tindakan.

6. **Analisis Latar Belakang dan Motif:**
    - Selidiki hubungan antara pihak-pihak yang terlibat.
    - Identifikasi motif yang mungkin melatarbelakangi kejadian.

7. **Rekomendasi Penanganan:**
    - Verifikasi semua informasi hukum, objek, alat, dan lokasi untuk menentukan:
        - **Lex Spesialis**: Kasus yang perlu ditangani oleh Direktorat Reserse Kriminal Khusus.
        - **Tindak Pidana Umum**: Kasus yang perlu ditangani oleh Direktorat Reserse Kriminal Umum.

---

Berikan analisis terstruktur dan terperinci untuk setiap poin di atas. Pastikan semua bagian terisi dengan lengkap dan akurat. Gunakan tabel yang disediakan untuk barang bukti dan kerugian. Pertahankan nada yang jelas dan objektif sepanjang analisis..`;

    // Generate content with streaming
    const result = await model.generateContentStream(prompt);
    let fullResponse = '';

    // Process the stream
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      console.log(chunkText);
    }

    if (!fullResponse) {
      throw new Error('Tidak ada respons yang valid dari AI');
    }

    return fullResponse;

  } catch (error) {
    console.error('Error in submitAgentAnalysis:', error);
    
    // Add rate limit error handling
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('Terlalu banyak permintaan analisis. Silakan tunggu beberapa saat sebelum mencoba lagi.');
      }
      if (error.message.includes('401')) {
        throw new Error('Unauthorized: API key tidak valid');
      }
      if (error.message.includes('403')) {
        throw new Error('Forbidden: Tidak memiliki akses');
      }
      throw new Error(`Gagal menganalisis kasus: ${error.message}`);
    }
    throw new Error('Gagal menganalisis kasus. Silakan coba lagi.');
  }
};
