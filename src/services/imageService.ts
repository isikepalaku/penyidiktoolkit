import { GoogleGenerativeAI } from "@google/generative-ai";
import { imagePrompts } from "../data/agents/imageAgent";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY tidak ditemukan dalam environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitImageAnalysis = async (
  imageFile: File,
  description?: string,
  promptType: keyof typeof imagePrompts = 'default'
): Promise<string> => {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
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
        throw new Error('Invalid image format');
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

      // Generate content using Gemini
      const result = await model.generateContent(parts);
      const response = await result.response;
      const analysisText = response.text();

      if (!analysisText) {
        throw new Error('Tidak ada hasil analisis dari model');
      }

      return analysisText;
      
    } catch (error) {
      console.error('Error in submitImageAnalysis:', error);
      
      if (retries < MAX_RETRIES - 1 && 
          (error instanceof TypeError || 
           error instanceof Error && error.message.includes('model'))) {
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
