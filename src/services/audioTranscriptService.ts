import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAudioPrompt, type AudioPromptType } from '@/data/agents/audioAgent';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY tidak ditemukan dalam environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Update model fallback ke gemini-2.0-flash
const models = {
  primary: genAI.getGenerativeModel({ model: "gemini-2.0-flash" }),
  fallback: genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface TranscriptResponse {
  text: string;
  error?: string;
  success: boolean;
}

interface TranscriptRequest {
  audio: File;
  task_type?: AudioPromptType;
}

/**
 * Process audio file for transcription
 */
export const processAudioTranscript = async (request: TranscriptRequest): Promise<TranscriptResponse> => {
  let retries = 0;
  let useFallbackModel = false;

  while (retries < MAX_RETRIES) {
    try {
      // Validate audio file
      if (!request.audio) {
        throw new Error('No audio file provided');
      }

      // Validate file size
      if (!validateFileSize(request.audio)) {
        throw new Error(`File size exceeds limit of ${formatFileSize(MAX_FILE_SIZE)}`);
      }

      // Validate file type
      if (!isSupportedFormat(request.audio)) {
        throw new Error('Invalid audio format. Supported formats: MP3, WAV, M4A');
      }

      // Convert audio to base64
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert audio to base64'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read audio file'));
        reader.readAsDataURL(request.audio);
      });

      // Get selected prompt
      const prompt = getAudioPrompt(request.task_type || 'transcribe');

      // Convert base64 to data for Gemini
      const base64Data = audioBase64.split(',')[1];

      // Create parts array for Gemini
      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType: request.audio.type,
            data: base64Data
          }
        }
      ];

      // Pilih model berdasarkan status
      const selectedModel = useFallbackModel ? models.fallback : models.primary;

      // Generate content using Gemini
      const result = await selectedModel.generateContent(parts);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('No transcription result from model');
      }

      return {
        text,
        success: true
      };

    } catch (error) {
      console.error('Error in processAudioTranscript:', error);

      if (error instanceof Error && error.message.includes('429')) {
        throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
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
        return {
          text: '',
          error: 'Tidak dapat terhubung ke layanan AI. Mohon periksa koneksi anda.',
          success: false
        };
      } else if (error instanceof Error) {
        return {
          text: '',
          error: `Gagal memproses audio: ${error.message}`,
          success: false
        };
      } else {
        return {
          text: '',
          error: 'Terjadi kesalahan yang tidak diketahui',
          success: false
        };
      }
    }
  }

  return {
    text: '',
    error: 'Gagal terhubung ke layanan AI setelah beberapa percobaan',
    success: false
  };
};

/**
 * Validate file size
 */
export const validateFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Get supported audio formats
 */
export const getSupportedFormats = (): string[] => {
  return ['mp3', 'wav', 'm4a'];
};

/**
 * Check if a file type is supported
 */
export const isSupportedFormat = (file: File): boolean => {
  const supportedTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg'];
  return supportedTypes.includes(file.type);
};