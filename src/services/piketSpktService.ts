import { GoogleGenAI } from "@google/genai";
import { supabase } from '@/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Ambil API key dari environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY tidak ditemukan. Silakan set environment variable VITE_GEMINI_API_KEY.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Session management
let currentSessionId = uuidv4();

// Fungsi untuk mendapatkan user ID yang saat ini login
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || uuidv4();
};

// Fungsi untuk mendapatkan session ID
const getSessionId = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? currentSessionId : currentSessionId;
};

// Initialize session
export const initializeSession = () => {
  currentSessionId = uuidv4();
  console.log('Piket SPKT session initialized:', currentSessionId);
};

// Clear chat history
export const clearChatHistory = () => {
  currentSessionId = uuidv4();
  console.log('Piket SPKT chat history cleared, new session:', currentSessionId);
};

export const sendChatMessage = async (
  message: string,
  files?: File[]
): Promise<string> => {
  try {
    // Log untuk debugging
    const user_id = await getCurrentUserId();
    const session_id = await getSessionId();
    
    console.log('Sending request to Gemini API with message:', message);
    console.log('User ID:', user_id);
    console.log('Session ID:', session_id);
    
    if (files && files.length > 0) {
      console.log('Files attached:', files.map(f => f.name));
    }

    const systemPrompt = `PERINTAH SISTEM PENTING:
Anda adalah Piket SPKT AI, sebuah sistem asisten digital untuk petugas piket SPKT (Sentra Pelayanan Kepolisian Terpadu) yang dikembangkan oleh ibrahim sandre.

TUGAS UTAMA:
1. Membantu petugas piket dalam menyusun laporan dan dokumentasi
2. Memberikan panduan prosedur operasional standar (SOP) SPKT
3. Membantu dalam penanganan administrasi dan pelayanan masyarakat
4. Menyediakan template dan format dokumen yang diperlukan
5. Memberikan informasi terkait regulasi dan ketentuan kepolisian

FORMAT RESPONS:
- Gunakan format yang jelas dan terstruktur
- Berikan informasi yang akurat dan sesuai dengan SOP
- Sertakan referensi regulasi jika diperlukan
- Gunakan bahasa formal namun mudah dipahami
- Berikan contoh praktis jika memungkinkan

AREA KEAHLIAN:
- Administrasi SPKT
- Pelayanan masyarakat
- Dokumentasi dan pelaporan
- SOP kepolisian
- Regulasi dan ketentuan hukum
- Template dokumen resmi

PENTING:
- Selalu berikan informasi yang akurat dan terkini
- Jika tidak yakin dengan informasi tertentu, sampaikan dengan jelas
- Prioritaskan kebutuhan operasional petugas piket
- Berikan solusi praktis dan aplikatif`;

    const prompt = systemPrompt + `

Pertanyaan/Permintaan dari petugas piket:

${message}

Berikan respons yang membantu dan sesuai dengan kebutuhan operasional SPKT. Pastikan informasi yang diberikan akurat dan dapat diterapkan langsung dalam tugas sehari-hari.`;

    // Generate content dengan konfigurasi yang optimal
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    if (!response.text) {
      throw new Error('Tidak ada respons yang valid dari AI');
    }

    console.log('Received response from Gemini API');
    return response.text;

  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('401')) {
        throw new Error('API key Gemini tidak valid. Silakan periksa konfigurasi VITE_GEMINI_API_KEY.');
      }
      if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
        throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
      }
      if (error.message.includes('403')) {
        throw new Error('Forbidden: Tidak memiliki akses ke layanan Gemini API.');
      }
      if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Rate limit terlampaui. Silakan tunggu beberapa menit sebelum mencoba lagi.');
      }
      
      // Generic error with original message
      throw new Error(`Gagal mengirim pesan: ${error.message}`);
    }
    
    throw new Error('Gagal mengirim pesan. Silakan coba lagi nanti.');
  }
}; 