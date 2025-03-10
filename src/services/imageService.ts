import { GoogleGenerativeAI } from "@google/generative-ai";
import { imagePrompts } from "../data/agents/imageAgent";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY tidak ditemukan dalam environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Update model fallback ke gemini-2.0-flash
const models = {
  primary: genAI.getGenerativeModel({ model: "gemini-1.5-flash" }),
  fallback: genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitImageAnalysis = async (
  imageFiles: File | File[],
  description?: string,
  promptType: keyof typeof imagePrompts = 'default'
): Promise<string> => {
  // Konversi input menjadi array
  const files = Array.isArray(imageFiles) ? imageFiles : [imageFiles];
  
  let retries = 0;
  let useFallbackModel = false;
  let results: string[] = [];
  
  while (retries < MAX_RETRIES) {
    try {
      // Proses setiap file
      for (const imageFile of files) {
        // Convert image to base64
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to convert image to base64'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read image file'));
          reader.readAsDataURL(imageFile);
        });

        if (!imageBase64.startsWith('data:image/')) {
          throw new Error(`Invalid image format untuk file ${imageFile.name}`);
        }

        // Get selected prompt and add description if provided
        const selectedPrompt = imagePrompts[promptType] || imagePrompts.default;
        const prompt = description 
          ? `${selectedPrompt}\n\nKonteks tambahan: ${description}`
          : selectedPrompt;

        // Convert base64 to data for Gemini
        const base64Data = imageBase64.split(',')[1];

        // Create parts array for Gemini
        const parts = [
          { text: prompt },
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Data
            }
          }
        ];

        // Pilih model berdasarkan status
        const selectedModel = useFallbackModel ? models.fallback : models.primary;

        // Generate content using Gemini
        const result = await selectedModel.generateContent(parts);
        const response = await result.response;
        const analysisText = response.text();

        if (!analysisText) {
          throw new Error(`Tidak ada hasil analisis dari model untuk file ${imageFile.name}`);
        }

        results.push(`Analisis untuk ${imageFile.name}:\n${analysisText}`);
      }

      // Gabungkan semua hasil
      return results.join('\n\n---\n\n');
      
    } catch (error) {
      console.error('Error in submitImageAnalysis:', error);
      
      if (error instanceof Error && error.message.includes('429')) {
        throw new Error('Terlalu banyak permintaan analisis gambar. Silakan tunggu beberapa saat sebelum mencoba lagi.');
      }
      
      // Cek apakah error karena model overload
      if (error instanceof Error && 
          (error.message.includes('overloaded') || error.message.includes('503'))) {
        if (!useFallbackModel) {
          // Coba gunakan model fallback
          useFallbackModel = true;
          continue;
        }
      }
      
      if (retries < MAX_RETRIES - 1) {
        retries++;
        await wait(RETRY_DELAY * retries);
        continue;
      }

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Tidak dapat terhubung ke layanan AI. Mohon periksa koneksi anda.');
      } else if (error instanceof Error) {
        throw new Error(`Gagal menganalisis gambar: ${error.message}`);
      } else {
        throw new Error('Terjadi kesalahan yang tidak diketahui');
      }
    }
  }

  throw new Error('Gagal terhubung ke layanan AI setelah beberapa percobaan');
};
