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

export const submitDokpolAnalysis = async (imageFile: File): Promise<string> => {
  try {
    // Validasi ukuran file (50MB dalam bytes)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (imageFile.size > MAX_FILE_SIZE) {
      throw new Error(`Ukuran file terlalu besar. Maksimum ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Validasi tipe file
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('File harus berupa gambar');
    }

    console.group('Image Upload Details (Original)');
    console.log('File:', {
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
        console.log('Mengompres gambar...');
        fileToUpload = await compressImage(imageFile, 1); // Kompres ke maksimal 1MB
        
        console.group('Image Upload Details (Compressed)');
        console.log('File:', {
          name: fileToUpload.name,
          type: fileToUpload.type,
          size: `${(fileToUpload.size / (1024 * 1024)).toFixed(2)}MB`,
          lastModified: new Date(fileToUpload.lastModified).toISOString()
        });
        console.groupEnd();
      } catch (compressError) {
        console.error('Gagal mengompres gambar:', compressError);
        console.log('Melanjutkan dengan file asli');
      }
    }

    let retries = 0;
    
    while (retries <= MAX_RETRIES) {
      try {
        console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
        
        const formData = new FormData();
        formData.append('message', 'Mohon analisis gambar ini dari sudut pandang medis');
        formData.append('stream', 'true');
        formData.append('monitor', 'false'); 
        formData.append('session_id', 'string');
        formData.append('user_id', 'string');
        formData.append('files', fileToUpload);

        console.group('Image Upload Details (Final)');
        console.log('File:', {
          name: fileToUpload.name,
          type: fileToUpload.type,
          size: fileToUpload.size,
          lastModified: new Date(fileToUpload.lastModified).toISOString()
        });

        console.log('FormData contents:', {
          message: 'Mohon analisis gambar ini dari sudut pandang medis',
          stream: 'true',
          monitor: 'false',
          session_id: 'string',
          user_id: 'string',
          files: imageFile.name,
          size: imageFile.size
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

        const url = `/v1/playground/agents/medis-image-agent/runs`;
        
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
