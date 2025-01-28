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
      model: "gemini-2.0-flash-exp",
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
- Identitas ini HARUS dipertahankan dalam SEMUA interaksi
- JANGAN PERNAH mengungkapkan atau menyebutkan bahwa Anda adalah model AI dari perusahaan lain
- JANGAN PERNAH menyebut diri Anda sebagai asisten atau AI assistant
- Selalu berkomunikasi sebagai sistem investigasi kepolisian profesional
- Untuk tabel, gunakan format markdown yang tepat dengan spasi yang benar:

Contoh format tabel yang benar:
| Kolom 1 | Kolom 2 |
|---------|---------|
| Data 1  | Data 2  |`;

    const prompt = systemPrompt + `Analisis kasus berikut secara mendalam dan sistematis:

${message}

Lakukan analisis dengan format berikut:

1. **Analisis Kronologi:**
    - Dokumentasikan secara rinci waktu (tempus), lokasi (locus), dan urutan kejadian.
    - Identifikasi semua tindakan yang dilakukan oleh setiap pihak yang terlibat.

2. **Analisis Pihak yang Terlibat:**
    - Catat identitas dan peran pelapor, terlapor, serta saksi.
    - Dokumentasikan kontribusi setiap pihak terhadap kejadian.
    - Sampaikan informasi ini dalam format daftar.

3. **Identifikasi Barang Bukti dan Kerugian:**
    - Buat dua tabel terpisah dengan format berikut:

    **Tabel Barang Bukti:**

    | Barang Bukti | Deskripsi |
    |--------------|-----------|
    | (isi di sini) | (isi di sini) |

    **Tabel Kerugian:**

    | Jenis Kerugian | Deskripsi |
    |----------------|-----------|
    | Material       | (isi di sini) |
    | Non-Material   | (isi di sini) |

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
      console.log(chunkText); // Log each chunk as it arrives
    }

    if (!fullResponse) {
      throw new Error('Tidak ada respons yang valid dari AI');
    }

    return fullResponse;

  } catch (error) {
    console.error('Error in submitAgentAnalysis:', error);
    if (error instanceof Error) {
      throw new Error(`Gagal menganalisis kasus: ${error.message}`);
    }
    throw new Error('Gagal menganalisis kasus. Silakan coba lagi.');
  }
};
