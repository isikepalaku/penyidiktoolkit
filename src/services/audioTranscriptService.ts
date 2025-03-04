import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAudioPrompt, type AudioPromptType } from '@/data/agents/audioAgent';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY tidak ditemukan dalam environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (Gemini limit)

// Supported audio MIME types and extensions
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/aac',
  'video/mp4',  // Some mobile devices use this for audio
  'application/octet-stream'  // Fallback type
];

export const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];

// Types for the transcript response
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
 * Check if file type is supported
 */
export const isSupportedFormat = (file: File): boolean => {
  // Check MIME type
  if (SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    return true;
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(extension);
};

/**
 * Converts a File object to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/mp3;base64,")
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Process audio using inline data
 */
const processAudio = async (file: File, prompt: string): Promise<string> => {
  console.log('Processing audio file using inline data');

  try {
    const base64Audio = await fileToBase64(file);
    console.log('Audio converted to base64, sending to model...');

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: file.type || 'audio/mpeg',
          data: base64Audio
        }
      }
    ]);

    const response = await result.response;
    console.log('Received response from model');
    
    return response.text();

  } catch (error) {
    console.error('Error in processAudio:', error);
    throw error;
  }
};

/**
 * Process audio file for transcription
 */
export const processAudioTranscript = async (request: TranscriptRequest): Promise<TranscriptResponse> => {
  try {
    console.log('Processing audio request:', {
      filename: request.audio.name,
      type: request.audio.type,
      size: formatFileSize(request.audio.size)
    });

    // Validate file size
    if (request.audio.size > MAX_FILE_SIZE) {
      throw new Error(`File terlalu besar. Maksimal ukuran file adalah ${formatFileSize(MAX_FILE_SIZE)}`);
    }

    // Validate format
    if (!isSupportedFormat(request.audio)) {
      throw new Error('Format file tidak didukung. Gunakan MP3, WAV, atau M4A');
    }

    // Get the appropriate prompt
    const prompt = getAudioPrompt(request.task_type || 'transcribe');

    // Process the audio
    const text = await processAudio(request.audio, prompt);

    return {
      text,
      success: true
    };

  } catch (error) {
    console.error('Audio transcript error:', error);

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        text: '',
        error: 'Tidak dapat terhubung ke layanan AI. Mohon periksa koneksi anda dan pastikan file audio tidak rusak.',
        success: false
      };
    }

    return {
      text: '',
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses audio',
      success: false
    };
  }
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