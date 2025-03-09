import { getPdfImagePrompt, type PdfImagePromptType } from '@/data/agents/pdfImageAgent';
import { getDefaultPrompt } from '@/data/prompts/pdfImagePrompts';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/types/pdfImage';
import { Mistral } from '@mistralai/mistralai';

// Ambil API key dari environment variable
const API_KEY = import.meta.env.VITE_MISTRAL_API_KEY || '';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Mistral limit)
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_DOCUMENTS = 5; // Maksimal 5 dokumen
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 menit dalam milidetik

// Log API key (hanya untuk debugging, hapus di production)
console.log('Mistral API Key tersedia:', !!API_KEY);
console.log('Mistral API Key length:', API_KEY.length);
console.log('Mistral API Key prefix:', API_KEY.substring(0, 5) + '...');

// Inisialisasi klien Mistral dengan API key yang benar
const mistralClient = new Mistral({
  apiKey: API_KEY
});

// Supported file types
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/bmp'
];

export const SUPPORTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp'];

// Chat history management
let chatHistory: ChatMessage[] = [];
let currentSessionId: string | null = null;
let sessionTimeoutId: number | null = null; // ID timeout untuk pembersihan sesi
const MAX_HISTORY = 10;
let uploadedFileIds: string[] = [];
let processedFiles: File[] = [];
let processedContents: { fileName: string; content: string }[] = []; // Menyimpan konten dokumen yang sudah diproses
let fileObjectUrls: string[] = []; // Menyimpan URL objek file untuk dibersihkan nanti

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

// Definisi tipe untuk OCR page
interface OcrPage {
  index: number;
  markdown: string;
  images: any[];
  dimensions: {
    dpi: number;
    height: number;
    width: number;
  };
}

// Definisi tipe untuk OCR result
interface OcrResult {
  pages: OcrPage[];
}

// Definisi tipe untuk file result
interface FileResult {
  fileName: string;
  ocrResult: OcrResult;
}

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
 * Converts a File object to ArrayBuffer
 */
const fileToArrayBuffer = async (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to ArrayBuffer'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Upload file to Mistral
 */
const uploadFile = async (file: File): Promise<string> => {
  try {
    console.log(`Uploading file: ${file.name} (${formatFileSize(file.size)})`);
    
    const arrayBuffer = await fileToArrayBuffer(file);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('Attempting to upload file to Mistral API...');
    
    try {
      const uploadedFile = await mistralClient.files.upload({
        file: {
          fileName: file.name,
          content: uint8Array,
        },
        purpose: "ocr" as any // Type cast untuk mengatasi error
      });
      
      console.log(`File uploaded successfully. ID: ${uploadedFile.id}`);
      return uploadedFile.id;
    } catch (apiError) {
      console.error('Mistral API Error:', apiError);
      
      // Log detail error untuk debugging
      if (apiError instanceof Error) {
        console.error('Error message:', apiError.message);
        console.error('Error stack:', apiError.stack);
        
        // Cek apakah error berisi response
        const anyError = apiError as any;
        if (anyError.response) {
          console.error('Response status:', anyError.response.status);
          console.error('Response data:', anyError.response.data);
        }
      }
      
      // Gunakan file ID dummy untuk fallback
      const dummyFileId = `dummy_${uuidv4()}`;
      console.log(`Using dummy file ID: ${dummyFileId} for fallback`);
      return dummyFileId;
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Gagal mengupload file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get OCR results for a file
 */
const getOcrResults = async (fileId: string): Promise<OcrResult> => {
  try {
    console.log(`Getting signed URL for file ID: ${fileId}`);
    
    // Cek apakah ini file ID dummy
    if (fileId.startsWith('dummy_')) {
      console.log('Using fallback OCR for dummy file ID');
      return {
        pages: [
          {
            index: 1,
            markdown: "# Fallback Content\n\nMaaf, kami tidak dapat memproses dokumen Anda saat ini karena layanan OCR sedang tidak tersedia. Ini adalah konten fallback untuk memungkinkan Anda tetap menggunakan mode tanya jawab.\n\nSilakan coba lagi nanti atau hubungi administrator sistem jika masalah berlanjut.",
            images: [],
            dimensions: {
              dpi: 200,
              height: 1000,
              width: 800
            }
          }
        ]
      };
    }
    
    // Get signed URL
    const signedUrl = await mistralClient.files.getSignedUrl({
      fileId: fileId,
    });
    
    console.log(`Processing OCR for file ID: ${fileId}`);
    
    // Process OCR
    try {
      const ocrResponse = await mistralClient.ocr.process({
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          documentUrl: signedUrl.url,
        }
      });
      
      return ocrResponse as OcrResult;
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      
      // Log detail error untuk debugging
      if (ocrError instanceof Error) {
        console.error('Error message:', ocrError.message);
        console.error('Error stack:', ocrError.stack);
        
        // Cek apakah error berisi response
        const anyError = ocrError as any;
        if (anyError.response) {
          console.error('Response status:', anyError.response.status);
          console.error('Response data:', anyError.response.data);
        }
      }
      
      // Gunakan fallback OCR result
      return {
        pages: [
          {
            index: 1,
            markdown: `# Error Processing Document\n\nMaaf, kami tidak dapat memproses dokumen Anda saat ini. Error: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}\n\nIni adalah konten fallback untuk memungkinkan Anda tetap menggunakan mode tanya jawab.`,
            images: [],
            dimensions: {
              dpi: 200,
              height: 1000,
              width: 800
            }
          }
        ]
      };
    }
  } catch (error) {
    console.error('Error getting OCR results:', error);
    throw new Error(`Gagal mendapatkan hasil OCR: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  
  // Hapus file dari memori
  processedFiles = [];
  uploadedFileIds = [];
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
 * Process files using Mistral API
 */
const processFiles = async (files: File[], prompt: string, instruction: string): Promise<string> => {
  console.log('Processing files using Mistral API');
  console.log('Files:', files.map(f => ({ name: f.name, type: f.type, size: formatFileSize(f.size) })));

  try {
    // Initialize session if needed
    if (!currentSessionId) {
      currentSessionId = `session_${uuidv4()}`;
      chatHistory = [];
      uploadedFileIds = [];
      processedFiles = [];
      processedContents = [];
      fileObjectUrls = [];
    }
    
    // Perbarui timeout sesi
    refreshSessionTimeout();
    
    // Upload files and get OCR results
    const fileResults: FileResult[] = [];
    
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
    
    // Hanya proses file baru
    for (const file of newFiles) {
      // Buat object URL untuk file dan simpan untuk dibersihkan nanti
      const objectUrl = URL.createObjectURL(file);
      fileObjectUrls.push(objectUrl);
      
      const fileId = await uploadFile(file);
      uploadedFileIds.push(fileId);
      const ocrResult = await getOcrResults(fileId);
      fileResults.push({
        fileName: file.name,
        ocrResult
      });
    }
    
    // Combine OCR results dari file baru
    for (const result of fileResults) {
      const pages = result.ocrResult.pages || [];
      const content = `# ${result.fileName}\n\n${pages.map((page: OcrPage) => page.markdown || '').join('\n\n')}`;
      
      // Tambahkan ke daftar konten yang diproses
      processedContents.push({
        fileName: result.fileName,
        content
      });
    }
    
    // Gabungkan semua konten untuk diproses oleh LLM
    const combinedContent = processedContents.map(item => item.content).join('\n\n---\n\n');
    
    // Process with LLM
    console.log('Processing OCR results with LLM');
    console.log('Session ID:', currentSessionId);
    console.log('Uploaded File IDs:', uploadedFileIds);
    console.log('Processed Files:', processedFiles.map(f => f.name));
    console.log('Processed Contents:', processedContents.map(c => c.fileName));
    
    const chatResponse = await mistralClient.chat.complete({
      model: "mistral-large-latest",
      messages: [
        {
          role: "system",
          content: `${prompt}\n\nInstruksi pengguna: ${instruction}`
        },
        {
          role: "user",
          content: combinedContent
        }
      ]
    });
    
    const responseText = (chatResponse.choices?.[0]?.message?.content || 'Maaf, saya tidak dapat memproses dokumen Anda.') as string;
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
    console.error('API key tidak tersedia. Pastikan VITE_MISTRAL_API_KEY telah ditambahkan ke file .env');
    return false;
  }
  
  try {
    // Coba panggil API sederhana untuk memverifikasi API key
    console.log('Memverifikasi API key Mistral...');
    
    // Gunakan models.list sebagai endpoint sederhana untuk verifikasi
    const models = await mistralClient.models.list();
    
    console.log('API key valid. Model tersedia:', models?.data?.map(m => m.id).join(', ') || 'Tidak ada model yang tersedia');
    return true;
  } catch (error) {
    console.error('Verifikasi API key gagal:', error);
    
    // Log detail error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Cek apakah error berisi response
      const anyError = error as any;
      if (anyError.response) {
        console.error('Response status:', anyError.response.status);
        console.error('Response data:', anyError.response.data);
      }
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
      throw new Error('API key Mistral tidak valid atau tidak tersedia. Pastikan Anda telah menambahkan API key yang benar ke file .env');
    }

    // Validate files
    for (const file of request.files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} terlalu besar. Maksimal ukuran file adalah ${formatFileSize(MAX_FILE_SIZE)}`);
      }

      // Validate format
      if (!isSupportedFormat(file)) {
        throw new Error(`Format file ${file.name} tidak didukung. Gunakan PDF atau gambar (JPG, PNG, etc.)`);
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
        error: 'Tidak dapat terhubung ke layanan AI. Mohon periksa koneksi anda dan pastikan API key Mistral valid.',
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
 */
export const sendChatMessage = async (message: string): Promise<string> => {
  try {
    console.log('Sending chat message:', message);
    console.log('Current Session ID:', currentSessionId);
    console.log('Uploaded File IDs:', uploadedFileIds);
    console.log('Processed Files:', processedFiles.map(f => f.name));
    console.log('Processed Contents:', processedContents.map(c => c.fileName));
    
    // Initialize session if needed
    if (!currentSessionId || (uploadedFileIds.length === 0 && processedContents.length === 0)) {
      console.error('Session not initialized, no files uploaded, or no processed content');
      return 'Silakan upload dokumen terlebih dahulu sebelum memulai chat.';
    }
    
    // Perbarui timeout sesi
    refreshSessionTimeout();
    
    // Prepare chat history for Mistral format
    const mistralMessages: Array<{role: 'system' | 'user' | 'assistant'; content: string}> = [
      {
        role: 'system',
        content: `Anda adalah asisten AI yang membantu menjawab pertanyaan tentang dokumen. Gunakan informasi dari dokumen untuk menjawab pertanyaan dengan akurat. Anda memiliki akses ke ${processedContents.length} dokumen: ${processedContents.map(c => c.fileName).join(', ')}.`
      }
    ];
    
    // Add document content if available
    if (processedContents.length > 0) {
      // Gabungkan semua konten dokumen
      const combinedContent = processedContents.map(item => item.content).join('\n\n---\n\n');
      
      mistralMessages.push({
        role: 'user',
        content: combinedContent
      });
      
      // Add system message acknowledging the document
      mistralMessages.push({
        role: 'assistant',
        content: `Saya telah menerima ${processedContents.length} dokumen: ${processedContents.map(c => c.fileName).join(', ')}. Silakan ajukan pertanyaan tentang dokumen tersebut.`
      });
    } else {
      // Add fallback content
      mistralMessages.push({
        role: 'user',
        content: 'Dokumen tidak dapat diproses, tetapi saya ingin bertanya tentang topik umum.'
      });
      
      // Add system message acknowledging the issue
      mistralMessages.push({
        role: 'assistant',
        content: 'Maaf, dokumen Anda tidak dapat diproses. Saya akan mencoba menjawab pertanyaan Anda berdasarkan pengetahuan umum saya.'
      });
    }
    
    // Add chat history
    chatHistory.forEach(msg => {
      mistralMessages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add current message
    mistralMessages.push({
      role: 'user',
      content: message
    });
    
    // Send chat request
    try {
      const chatResponse = await mistralClient.chat.complete({
        model: "mistral-large-latest",
        messages: mistralMessages
      });
      
      const responseText = chatResponse.choices?.[0]?.message?.content || 'Maaf, saya tidak dapat memproses pesan Anda.';
      
      // Update chat history
      chatHistory.push({
        role: 'user',
        content: message
      });
      
      chatHistory.push({
        role: 'assistant',
        content: responseText as string
      });
      
      // Limit history size
      if (chatHistory.length > MAX_HISTORY * 2) {
        chatHistory = chatHistory.slice(-MAX_HISTORY * 2);
      }
      
      return responseText as string;
    } catch (chatError) {
      console.error('Chat API error:', chatError);
      
      // Log detail error untuk debugging
      if (chatError instanceof Error) {
        console.error('Error message:', chatError.message);
        console.error('Error stack:', chatError.stack);
        
        // Cek apakah error berisi response
        const anyError = chatError as any;
        if (anyError.response) {
          console.error('Response status:', anyError.response.status);
          console.error('Response data:', anyError.response.data);
        }
      }
      
      // Fallback response
      const fallbackResponse = 'Maaf, saya mengalami masalah saat memproses pesan Anda. Layanan AI mungkin sedang tidak tersedia. Silakan coba lagi nanti.';
      
      // Update chat history
      chatHistory.push({
        role: 'user',
        content: message
      });
      
      chatHistory.push({
        role: 'assistant',
        content: fallbackResponse
      });
      
      return fallbackResponse;
    }
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