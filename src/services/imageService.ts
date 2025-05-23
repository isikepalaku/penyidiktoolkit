import { GoogleGenAI, GenerateContentResponse, Part, GroundingChunk } from "@google/genai";
import { supabase } from '@/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { imagePrompts } from "../data/agents/imageAgent";

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

// Fungsi untuk membuat prompt yang memanfaatkan web search
const createEnhancedImagePrompt = (basePrompt: string, description?: string) => {
  const enhancedPrompt = `${basePrompt}

INSTRUKSI ANALISIS GAMBAR DENGAN KONTEKS WEB:
- Analisis gambar dengan memanfaatkan informasi terkini dari web untuk memberikan konteks yang lebih kaya
- Cari informasi relevan tentang objek, lokasi, atau konsep yang teridentifikasi dalam gambar
- Berikan analisis yang komprehensif dengan menggabungkan visual analysis dan knowledge dari web
- Fokus pada memberikan insight yang akurat dan informatif
- PENTING: Jangan sertakan referensi link atau URL dalam jawaban final

${description ? `\nKonteks tambahan: ${description}` : ''}

CATATAN: Berikan analisis dalam bahasa Indonesia yang jelas dan profesional, tanpa menyebutkan sumber web secara eksplisit.`;

  return enhancedPrompt;
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
  
  // Log untuk debugging
  const user_id = await getCurrentUserId();
  const session_id = await getSessionId();
  
  console.log('Starting enhanced image analysis with web search for files:', files.map(f => f.name));
  console.log('User ID:', user_id);
  console.log('Session ID:', session_id);
  console.log('Prompt type:', promptType);
  
  while (retries < MAX_RETRIES) {
    try {
      // Proses setiap file
      for (const imageFile of files) {
        console.log(`Processing image: ${imageFile.name} (${(imageFile.size / 1024 / 1024).toFixed(2)}MB)`);
        
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

        // Get selected prompt and enhance with web search capabilities
        const selectedPrompt = imagePrompts[promptType] || imagePrompts.default;
        
        console.log(`Selected prompt type: ${promptType}`);
        console.log(`Selected prompt preview: ${selectedPrompt.substring(0, 100)}...`);
        console.log(`Available prompt types: ${Object.keys(imagePrompts).join(', ')}`);
        
        const enhancedPrompt = createEnhancedImagePrompt(selectedPrompt, description);

        // Convert base64 to data for Gemini
        const base64Data = imageBase64.split(',')[1];

        // Create parts array sesuai dokumentasi resmi
        const parts: Part[] = [
          { text: enhancedPrompt },
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Data
            }
          }
        ];

        // Generate content dengan web search capabilities
        const model = useFallbackModel ? "gemini-2.0-flash-exp" : "gemini-2.0-flash";
        
        console.log(`Using model: ${model} with web search capabilities for ${imageFile.name}`);
        
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: model,
          contents: [{ role: "user", parts: parts }],
          config: {
            maxOutputTokens: 8192,
            temperature: 1.0,
            topP: 0.95,
            tools: [{ googleSearch: {} }], // Enable web search for enhanced context
          },
        });

        let analysisText = response.text;
        
        if (!analysisText) {
          throw new Error(`Tidak ada hasil analisis dari model untuk file ${imageFile.name}`);
        }

        // Process grounding metadata to remove explicit references
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
          console.log(`Web search queries used for ${imageFile.name}:`, groundingMetadata.webSearchQueries);
        }

        // Clean up any URLs or explicit web references that might appear in the response
        analysisText = analysisText
          .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
          .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
          .replace(/Sumber:.*$/gm, '') // Remove source lines
          .replace(/Referensi:.*$/gm, '') // Remove reference lines
          .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up extra line breaks
          .trim();

        console.log(`Successfully analyzed image with web search: ${imageFile.name}`);
        results.push(`Analisis untuk ${imageFile.name}:\n${analysisText}`);
      }

      // Gabungkan semua hasil
      console.log(`Enhanced image analysis completed successfully for ${files.length} files`);
      return results.join('\n\n---\n\n');
      
    } catch (error) {
      console.error('Error in enhanced image analysis:', error);
      
      // Enhanced error handling
      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID') || error.message.includes('401')) {
          throw new Error('API key Gemini tidak valid. Silakan periksa konfigurasi VITE_GEMINI_API_KEY.');
        }
        
        if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
          throw new Error('Terlalu banyak permintaan analisis gambar. Silakan tunggu beberapa saat sebelum mencoba lagi.');
        }
        
        if (error.message.includes('403')) {
          throw new Error('Forbidden: Tidak memiliki akses ke layanan Gemini API.');
        }
        
        // Cek apakah error karena model overload
        if (error.message.includes('overloaded') || error.message.includes('503')) {
          if (!useFallbackModel) {
            // Coba gunakan model fallback
            useFallbackModel = true;
            console.log('Switching to fallback model due to overload');
            continue;
          }
        }
        
        if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
          throw new Error('Rate limit terlampaui. Silakan tunggu beberapa menit sebelum mencoba lagi.');
        }

        if (error.message.includes('grounding') || error.message.includes('search')) {
          throw new Error('Layanan pencarian web sedang tidak tersedia. Analisis gambar akan dilakukan tanpa konteks web tambahan.');
        }
      }
      
      if (retries < MAX_RETRIES - 1) {
        retries++;
        console.log(`Retrying enhanced image analysis (attempt ${retries + 1}/${MAX_RETRIES})`);
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
