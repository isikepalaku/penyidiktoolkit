import { getPdfImagePrompt, type PdfImagePromptType } from '@/data/agents/pdfImageAgent';
import { getDefaultPrompt } from '@/data/prompts/pdfImagePrompts';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/types/pdfImage';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * PENTING: Keterbatasan API Gemini untuk Document Understanding
 * 
 * Fitur Gemini Document Understanding memiliki keterbatasan berikut:
 * 1. File PDF dan gambar TIDAK disimpan dalam konteks model antar pesan
 * 2. Setiap pesan baru harus menyertakan kembali semua file yang ingin dianalisis
 * 3. Setiap file PDF dibaca sebagai gambar terpisah untuk setiap halaman
 * 
 * Untuk itu, implementasi sendChatMessage harus menyertakan file yang sama pada setiap pesan,
 * bukan hanya pada pesan pertama. Hal ini meningkatkan penggunaan bandwidth dan performa,
 * tapi diperlukan agar model tetap memiliki akses ke dokumen untuk setiap pesan.
 * 
 * Dokumentasi resmi: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/document-understanding
 */

// Ambil API key dari environment variable
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!API_KEY) {
  console.error('VITE_GEMINI_API_KEY tidak ditemukan. Silakan set environment variable VITE_GEMINI_API_KEY.');
}

// Log hanya status ketersediaan API key (tidak expose nilai)
console.log('Gemini API Key status:', API_KEY ? 'Available' : 'Missing');

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (Gemini limit)
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_DOCUMENTS = 10; // Maksimal 10 dokumen
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 menit dalam milidetik

// Inisialisasi Gemini API client
const genAI = new GoogleGenerativeAI(API_KEY);

// Supported file types
export const SUPPORTED_FILE_TYPES = [
  'application/pdf'
];

export const SUPPORTED_EXTENSIONS = ['.pdf'];

// Chat history management
let chatHistory: ChatMessage[] = [];
let currentSessionId: string | null = null;
let sessionTimeoutId: number | null = null; // ID timeout untuk pembersihan sesi
const MAX_HISTORY = 10;
let processedFiles: File[] = [];
let processedContents: { fileName: string; content: string }[] = []; 
let fileObjectUrls: string[] = []; 

// Definisi tipe untuk content yang dikirim ke Gemini API
interface TextPart {
  text: string;
}

interface InlineDataPart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

// Union type untuk semua jenis part yang didukung
type ContentPart = TextPart | InlineDataPart;

// Helper type untuk chat history
interface HistoryEntry {
  role: 'user' | 'model';
  parts: ContentPart[];
}

// Types for the response
interface PdfImageResponse {
  text: string;
  error?: string;
  success: boolean;
  citations?: {
    fileName: string;
    fileType: string;
    fileSize: string;
    timestamp: string;
  }[];
}

// Types for the request
interface PdfImageRequest {
  files: File[];
  task_type: PdfImagePromptType;
  instruction: string;
}

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
 * Check if file type is supported
 */
export const isSupportedFormat = (file: File): boolean => {
  // Check MIME type
  if (SUPPORTED_FILE_TYPES.includes(file.type)) {
    return true;
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(extension);
};

/**
 * Convert file to base64
 */
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (reader.result) {
        // Hasil readAsDataURL memiliki format: data:application/pdf;base64,XXXX
        // Kita hanya butuh bagian XXXX (base64 content)
        const base64Result = reader.result.toString();
        const base64 = base64Result.substring(base64Result.indexOf(',') + 1);
        console.log(`Converted ${file.name} to base64, length: ${base64.length} chars`);
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Membersihkan sumber daya file
 */
const cleanupFileResources = () => {
  console.log('Membersihkan sumber daya file...');
  
  // Revoke object URLs
  fileObjectUrls.forEach(url => {
    try {
      URL.revokeObjectURL(url);
      console.log('Revoked object URL:', url);
    } catch (error) {
      console.error('Error revoking object URL:', error);
    }
  });
  
  // Reset array
  fileObjectUrls = [];
  processedFiles = [];
  processedContents = [];
  
  console.log('Pembersihan sumber daya file selesai');
};

/**
 * Memperbarui timestamp sesi dan mengatur timeout pembersihan
 */
const refreshSessionTimeout = () => {
  // Batalkan timeout sebelumnya jika ada
  if (sessionTimeoutId !== null) {
    window.clearTimeout(sessionTimeoutId);
  }
  
  // Atur timeout baru
  sessionTimeoutId = window.setTimeout(() => {
    console.log('Sesi kadaluarsa, membersihkan sumber daya...');
    clearChatHistory();
  }, SESSION_TIMEOUT);
  
  console.log('Timeout sesi diperbarui, akan kadaluarsa dalam', SESSION_TIMEOUT / 1000 / 60, 'menit');
};

/**
 * Process files using Gemini API
 */
const processFiles = async (files: File[], prompt: string, instruction: string): Promise<string> => {
  console.log('Processing files using Gemini API');
  console.log('Files:', files.map(f => ({ name: f.name, type: f.type, size: formatFileSize(f.size) })));

  try {
    // Initialize session if needed
    if (!currentSessionId) {
      currentSessionId = `session_${uuidv4()}`;
      chatHistory = [];
      processedFiles = [];
      processedContents = [];
      fileObjectUrls = [];
    }
    
    // Perbarui timeout sesi
    refreshSessionTimeout();
    
    // Tambahkan file baru ke daftar file yang diproses
    const newFiles = files.filter(file => 
      !processedFiles.some(existingFile => 
        existingFile.name === file.name && 
        existingFile.size === file.size && 
        existingFile.type === file.type
      )
    );
    
    // Periksa batas maksimum dokumen
    if (processedFiles.length + newFiles.length > MAX_DOCUMENTS) {
      throw new Error(`Maksimal ${MAX_DOCUMENTS} dokumen yang dapat diproses. Anda sudah memiliki ${processedFiles.length} dokumen dan mencoba menambahkan ${newFiles.length} dokumen baru.`);
    }
    
    // Simpan file baru yang diproses
    processedFiles = [...processedFiles, ...newFiles];
    
    // Siapkan array untuk menyimpan file parts untuk Gemini API
    const parts: ContentPart[] = [{ text: `${prompt}\n\nInstruksi pengguna: ${instruction}` }];
    
    // Proses semua file baru dan konversi ke base64
    for (const file of newFiles) {
      try {
        // Buat object URL untuk file dan simpan untuk dibersihkan nanti
        const objectUrl = URL.createObjectURL(file);
        fileObjectUrls.push(objectUrl);
        
        // Konversi file ke base64
        const base64Data = await fileToBase64(file);
        console.log(`Adding ${file.name} as inlineData part`);
        
        // Tambahkan file sebagai part ke array parts
        const filePart: InlineDataPart = {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        };
        parts.push(filePart);
        
        // Tambahkan ke daftar konten yang diproses
        processedContents.push({
          fileName: file.name,
          content: `Content dari file ${file.name}` // Placeholder
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        throw new Error(`Gagal memproses file ${file.name}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }
    
    // Pilih model Gemini yang sesuai untuk pemrosesan PDF
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      }
    });
    
    // Kirim request ke Gemini API menggunakan file yang sudah dikonversi ke base64
    console.log('Sending request to Gemini API with files:', processedFiles.map(f => f.name));
    console.log('Using prompt:', prompt);
    console.log('Using instruction:', instruction);
    
    const result = await model.generateContent(parts);
    console.log('Received response from Gemini API');
    
    const responseText = result.response.text();
    return responseText;
  } catch (error) {
    console.error('Error processing files:', error);
    throw error;
  }
};

/**
 * Verifikasi API key
 */
const verifyApiKey = async (): Promise<boolean> => {
  if (!API_KEY) {
    console.error('API key tidak tersedia. Pastikan VITE_GEMINI_API_KEY telah ditambahkan ke file .env');
    return false;
  }
  
  try {
    // Coba panggil API sederhana untuk memverifikasi API key
    console.log('Memverifikasi API key Gemini...');
    
    // Buat request sederhana untuk verifikasi
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Hello, this is a test request.");
    
    console.log('API key valid. Response:', result.response.text());
    return true;
  } catch (error) {
    console.error('Verifikasi API key gagal:', error);
    
    // Log detail error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    
    return false;
  }
};

/**
 * Process PDF and image files
 */
export const processPdfImage = async (request: PdfImageRequest): Promise<PdfImageResponse> => {
  try {
    console.log('Processing PDF/Image request:', {
      files: request.files.map(f => ({
        name: f.name,
        type: f.type,
        size: formatFileSize(f.size)
      })),
      task_type: request.task_type,
      instruction: request.instruction
    });

    // Verifikasi API key terlebih dahulu
    const isApiKeyValid = await verifyApiKey();
    if (!isApiKeyValid) {
      throw new Error('API key Gemini tidak valid atau tidak tersedia. Pastikan Anda telah menambahkan API key yang benar ke file .env');
    }

    // Validate files
    for (const file of request.files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} terlalu besar. Maksimal ukuran file adalah ${formatFileSize(MAX_FILE_SIZE)}`);
      }

      // Validate format
      if (!isSupportedFormat(file)) {
        throw new Error(`Format file ${file.name} tidak didukung. Gunakan PDF.`);
      }
    }

    // Validate total size
    const totalSize = request.files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new Error(`Total ukuran file terlalu besar. Maksimal total ukuran adalah ${formatFileSize(MAX_TOTAL_SIZE)}`);
    }

    // Get the appropriate prompt
    // Gunakan prompt dari pdfImageAgent jika ada, jika tidak gunakan prompt default
    const agentPrompt = getPdfImagePrompt(request.task_type);
    const defaultPrompt = getDefaultPrompt(request.task_type);
    const prompt = agentPrompt || defaultPrompt;
    
    // Gunakan instruksi dari pengguna jika ada, jika tidak gunakan prompt saja
    const instruction = request.instruction && request.instruction.trim() 
      ? request.instruction 
      : 'Analisis dokumen ini sesuai dengan jenis tugas yang dipilih.';

    // Process the files
    const text = await processFiles(request.files, prompt, instruction);

    // Buat citations untuk setiap file
    const citations = request.files.map(file => ({
      fileName: file.name,
      fileType: file.type,
      fileSize: formatFileSize(file.size),
      timestamp: new Date().toISOString()
    }));

    return {
      text,
      success: true,
      citations
    };

  } catch (error) {
    console.error('PDF/Image processing error:', error);

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        text: '',
        error: 'Tidak dapat terhubung ke layanan AI. Mohon periksa koneksi anda dan pastikan API key Gemini valid.',
        success: false
      };
    }

    return {
      text: '',
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses file',
      success: false
    };
  }
};

/**
 * Send chat message about uploaded documents
 * 
 * KETERBATASAN API GEMINI:
 * Berbeda dengan API lain, Gemini TIDAK menyimpan file yang dikirim dalam konteks model
 * antar pesan dalam chat. Setiap pesan baru (termasuk pertanyaan lanjutan tentang dokumen)
 * harus menyertakan kembali semua file PDF. Fungsi ini mengatasi hal tersebut dengan
 * selalu menyertakan semua file di setiap pesan, bukan hanya pada pesan pertama.
 * 
 * Ini meningkatkan penggunaan bandwidth tapi diperlukan agar dokumen tetap dapat dianalisis
 * oleh model pada setiap pesan dalam percakapan.
 */
export const sendChatMessage = async (message: string): Promise<string> => {
  try {
    console.log('Sending chat message:', message);
    console.log('Current Session ID:', currentSessionId);
    console.log('Processed Files:', processedFiles.map(f => f.name));
    console.log('Processed Contents:', processedContents.map(c => c.fileName));
    
    // Initialize session if needed
    if (!currentSessionId || processedFiles.length === 0) {
      console.error('Session not initialized or no processed files');
      return 'Silakan upload dokumen terlebih dahulu sebelum memulai chat.';
    }
    
    // Perbarui timeout sesi
    refreshSessionTimeout();
    
    // Pilih model Gemini yang sesuai
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      }
    });
    
    // Konversi chat history ke format Gemini
    const history: HistoryEntry[] = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    // Buat chat session
    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      }
    });
    
    // Siapkan pesan untuk dikirim
    let messageParts: ContentPart[] = [];
    
    // Untuk semua pesan, sertakan system message dan file dalam base64
    // Penting: File PDF harus disertakan dalam SETIAP pesan, bukan hanya pesan pertama
    // karena Gemini tidak menyimpan context files antar pesan
    
    // Tambahkan system prompt dan instruksi
    const textPart: TextPart = { 
      text: `Anda adalah asisten AI yang membantu menjawab pertanyaan tentang dokumen. 
      Gunakan HANYA informasi dari dokumen yang diunggah untuk menjawab pertanyaan dengan akurat.
      Jika jawaban tidak ditemukan dalam dokumen, nyatakan dengan jelas bahwa informasi tersebut tidak ada dalam dokumen.
      Jangan mencoba menebak atau memberikan informasi yang tidak ada dalam dokumen.
      
      Anda memiliki akses ke ${processedContents.length} dokumen: ${processedContents.map(c => c.fileName).join(', ')}.
      
      Instruksi: 
      1. Baca dokumen dengan seksama
      2. Perhatikan seluruh isi dokumen
      3. Hanya jawab berdasarkan informasi yang tersedia dalam dokumen
      4. Sertakan bagian dokumen yang relevan sebagai kutipan jika memungkinkan
      
      Pertanyaan pengguna: ${message}` 
    };
    messageParts = [textPart];
    
    // Tambahkan semua file dalam base64 - untuk SETIAP pesan, bukan hanya pesan pertama
    console.log(`Menambahkan ${processedFiles.length} file ke dalam pesan`);
    for (const file of processedFiles) {
      try {
        const base64Data = await fileToBase64(file);
        console.log(`Adding ${file.name} to chat message as inlineData, base64 length: ${base64Data.length}`);
        
        const filePart: InlineDataPart = {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        };
        messageParts.push(filePart);
      } catch (err) {
        console.error(`Error converting file ${file.name} to base64:`, err);
      }
    }
    
    // Kirim pesan ke model
    console.log('Sending message to Gemini model with files included');
    const result = await chat.sendMessage(messageParts);
    const responseText = result.response.text();
    
    // Update chat history
    chatHistory.push({
      role: 'user',
      content: message
    });
    
    chatHistory.push({
      role: 'assistant',
      content: responseText
    });
    
    // Limit history size
    if (chatHistory.length > MAX_HISTORY * 2) {
      chatHistory = chatHistory.slice(-MAX_HISTORY * 2);
    }
    
    return responseText;
  } catch (error) {
    console.error('Chat error:', error);
    return error instanceof Error 
      ? `Error: ${error.message}` 
      : 'Terjadi kesalahan saat mengirim pesan.';
  }
};

/**
 * Clear chat history and session
 */
export const clearChatHistory = () => {
  chatHistory = [];
  currentSessionId = null;
  
  // Batalkan timeout sesi jika ada
  if (sessionTimeoutId !== null) {
    window.clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
  
  // Bersihkan sumber daya file
  cleanupFileResources();
  
  console.log('Chat history dan sesi dibersihkan');
};

/**
 * Initialize session
 */
export const initializeSession = () => {
  if (!currentSessionId) {
    console.log('Creating new session ID');
    currentSessionId = `session_${uuidv4()}`;
    chatHistory = [];
    
    // Bersihkan sumber daya file dari sesi sebelumnya jika ada
    cleanupFileResources();
  } else {
    console.log('Using existing session ID:', currentSessionId);
  }
  
  // Perbarui timeout sesi
  refreshSessionTimeout();
}; 