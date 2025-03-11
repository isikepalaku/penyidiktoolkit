import { env } from '@/config/env';

interface Message {
  role: string;
  content: string;
}

interface StreamEvent {
  event: string;
  content?: string;
  messages?: Message[];
}

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 1;
const RETRY_DELAY = 1000;
const API_BASE_URL = env.apiUrl || 'https://api.reserse.id';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi untuk mengompres gambar sebelum dikirim
const compressImage = async (file: File, maxSizeMB: number = 1): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Jika gambar terlalu besar, kurangi ukurannya
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;
        
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
        
        if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height));
          height = MAX_HEIGHT;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal membuat konteks canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Mulai dengan kualitas tinggi dan turunkan jika masih terlalu besar
        const quality = 0.9;
        let compressedFile: File | null = null;
        
        const compressWithQuality = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Gagal mengompres gambar'));
                return;
              }
              
              compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              
              // Jika masih terlalu besar dan kualitas masih bisa diturunkan
              if (compressedFile.size > maxSizeMB * 1024 * 1024 && q > 0.5) {
                // Coba lagi dengan kualitas lebih rendah
                compressWithQuality(q - 0.1);
              } else {
                console.log(`Gambar berhasil dikompresi: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB dengan kualitas ${q.toFixed(1)}`);
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            q
          );
        };
        
        compressWithQuality(quality);
      };
      
      img.onerror = () => {
        reject(new Error('Gagal memuat gambar'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Gagal membaca file'));
    };
  });
};

export type DokpolServiceType = 'umum' | 'forensik';

interface DokpolAnalysisParams {
  imageFiles: File[];
  serviceType: DokpolServiceType;
  clinicalSymptoms?: string;
  medicalHistory?: string;
}

export const submitDokpolAnalysis = async ({
  imageFiles,
  serviceType,
  clinicalSymptoms,
  medicalHistory
}: DokpolAnalysisParams): Promise<string> => {
  try {
    // Validasi jumlah file
    if (imageFiles.length === 0) {
      throw new Error('Mohon pilih minimal 1 gambar');
    }
    if (imageFiles.length > 3) {
      throw new Error('Maksimal 3 gambar yang dapat diupload');
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    // Validasi dan kompresi semua file
    const filesToUpload = await Promise.all(imageFiles.map(async (imageFile, i) => {
      // Validasi ukuran file
      if (imageFile.size > MAX_FILE_SIZE) {
        throw new Error(`File ${i + 1} terlalu besar. Maksimum ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      // Validasi tipe file
      if (!imageFile.type.startsWith('image/')) {
        throw new Error(`File ${i + 1} harus berupa gambar`);
      }

      console.group('Image Upload Details (Original)');
      console.log(`File ${i + 1}:`, {
        name: imageFile.name,
        type: imageFile.type,
        size: `${(imageFile.size / (1024 * 1024)).toFixed(2)}MB`,
        lastModified: new Date(imageFile.lastModified).toISOString()
      });
      console.groupEnd();

      // Kompres gambar jika ukurannya lebih dari 1MB
      let fileToUpload = imageFile;
      if (imageFile.size > 1 * 1024 * 1024) {
        try {
          console.log(`Mengompres gambar ${i + 1}...`);
          fileToUpload = await compressImage(imageFile, 1); // Kompres ke maksimal 1MB

          console.group('Image Upload Details (Compressed)');
          console.log(`File ${i + 1}:`, {
            name: fileToUpload.name,
            type: fileToUpload.type,
            size: `${(fileToUpload.size / (1024 * 1024)).toFixed(2)}MB`,
            lastModified: new Date(fileToUpload.lastModified).toISOString()
          });
          console.groupEnd();
        } catch (compressError) {
          console.error(`Gagal mengompres gambar ${i + 1}:`, compressError);
          console.log('Melanjutkan dengan file asli');
        }
      }

      return fileToUpload;
    }));

    let retries = 0;
    
    while (retries <= MAX_RETRIES) {
      try {
        console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
        
        const formData = new FormData();
        
        // Buat pesan yang lebih informatif jika ada informasi tambahan
        let message = serviceType === 'umum' 
          ? 'Mohon analisis gambar ini dari sudut pandang medis'
          : 'Mohon analisis gambar ini dari sudut pandang forensik';
        
        // Tambahkan informasi gejala klinis dan riwayat medis jika tersedia
        if (serviceType === 'umum') {
          const additionalInfo = [];
          
          if (clinicalSymptoms && clinicalSymptoms.trim()) {
            additionalInfo.push(`Gejala klinis: ${clinicalSymptoms.trim()}`);
          }
          
          if (medicalHistory && medicalHistory.trim()) {
            additionalInfo.push(`Riwayat medis: ${medicalHistory.trim()}`);
          }
          
          if (additionalInfo.length > 0) {
            message += `. Informasi tambahan: ${additionalInfo.join('. ')}`;
          }
        }
        
        formData.append('message', message);
        formData.append('stream', 'true');
        formData.append('monitor', 'false'); 
        formData.append('session_id', 'string');
        formData.append('user_id', 'string');
        
        // Append all files to formData
        filesToUpload.forEach(file => {
          formData.append('files', file);
        });

        console.group('Image Upload Details (Final)');
        console.log('Files:', filesToUpload.map(file => ({
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString()
        })));

        console.log('FormData contents:', {
          message: message,
          stream: 'true',
          monitor: 'false',
          session_id: 'string',
          user_id: 'string',
          files: filesToUpload.map(file => file.name),
          totalSize: filesToUpload.reduce((acc, file) => acc + file.size, 0),
          hasClinicSymptoms: !!clinicalSymptoms,
          hasMedicalHistory: !!medicalHistory
        });
        console.groupEnd();

        const headers: HeadersInit = {
          'Accept': 'application/json',
          'X-API-Key': API_KEY || ''
        };

        const requestOptions: RequestInit = {
          method: 'POST',
          headers,
          body: formData
        };

        const agentType = serviceType === 'umum' ? 'medis-image-agent' : 'forensic-image-agent';
        const url = `/v1/playground/agents/${agentType}/runs`;
        
        console.group('Request Details');
        console.log('API URL:', API_BASE_URL);
        console.log('Full URL:', url);
        console.log('Headers:', {
          ...headers,
          'X-API-Key': API_KEY ? '[REDACTED]' : 'missing'
        });
        console.groupEnd();

        const response = await fetch(url, requestOptions);

        console.group('Response Details');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        console.groupEnd();

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          
          if (response.status === 429) {
            throw new Error('Terlalu banyak permintaan analisis gambar. Silakan tunggu beberapa saat sebelum mencoba lagi.');
          }
          
          if (response.status === 401) {
            throw new Error('Unauthorized: API key tidak valid');
          }

          if (response.status === 403) {
            throw new Error('Forbidden: Tidak memiliki akses');
          }
          
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const responseText = await response.text();
        const events = responseText.split('}').map(event => {
          if (!event.trim()) return null;
          try {
            return JSON.parse(event + '}') as StreamEvent;
          } catch {
            try {
              return JSON.parse(event.trim() + '}') as StreamEvent;
            } catch {
              return null;
            }
          }
        }).filter((event): event is StreamEvent => event !== null);

        const completedEvent = events.find(event => event.event === 'RunCompleted');
        if (completedEvent?.content) {
          return completedEvent.content;
        }

        const responseContent = events
          .filter(event => event.event === 'RunResponse')
          .map(event => event.content)
          .filter((content): content is string => content !== undefined)
          .join('');

        if (responseContent) {
          return responseContent;
        }

        const messagesEvent = events.find(event => event.messages && Array.isArray(event.messages) && event.messages.length > 0);
        if (messagesEvent?.messages) {
          const modelMessages = messagesEvent.messages
            .filter((msg: Message) => msg.role === 'model')
            .map((msg: Message) => msg.content);
          
          if (modelMessages.length > 0) {
            return modelMessages[modelMessages.length - 1];
          }
        }

        console.error('No valid content found in events:', events);
        throw new Error('Tidak ada konten yang valid dari response');

      } catch (error) {
        console.error('Error in submitDokpolAnalysis:', error);
        
        if ((error instanceof TypeError || error instanceof Error) && retries < MAX_RETRIES) {
          retries++;
          await wait(RETRY_DELAY * retries);
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Gagal setelah mencoba maksimum retries');
  } catch (error) {
    console.error('Error in submitDokpolAnalysis:', error);
    throw error;
  }
};
