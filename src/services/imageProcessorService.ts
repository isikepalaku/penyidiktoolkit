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
const compressImage = async (file: File): Promise<File> => {
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
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal mengompres gambar'));
              return;
            }
            
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            console.log(`Gambar berhasil dikompresi: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);
            resolve(compressedFile);
          },
          'image/jpeg',
          0.8
        );
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

export const submitImageProcessorAnalysis = async (imageFile: File): Promise<string> => {
  try {
    // Validasi ukuran file (50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (imageFile.size > MAX_FILE_SIZE) {
      throw new Error(`File terlalu besar. Maksimum ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Validasi tipe file
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('File harus berupa gambar');
    }

    // Log original file details
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
        fileToUpload = await compressImage(imageFile);
      } catch (error) {
        console.error('Gagal mengompres gambar:', error);
        console.log('Melanjutkan dengan file asli');
      }
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('message', 'Mohon analisis gambar ini dan berikan lokasi yang terlihat beserta penjelasannya');
    formData.append('stream', 'true');
    formData.append('monitor', 'false');
    formData.append('session_id', 'string');
    formData.append('user_id', 'string');
    formData.append('files', fileToUpload);

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'X-API-Key': API_KEY || ''
    };

    let retries = 0;
    while (retries <= MAX_RETRIES) {
      try {
        const url = `${API_BASE_URL}/v1/playground/agents/geo-image-agent/runs`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          if (response.status === 429) {
            throw new Error('Terlalu banyak permintaan analisis gambar. Silakan tunggu beberapa saat sebelum mencoba lagi.');
          }
          
          if (response.status === 401) {
            throw new Error('API key tidak valid');
          }

          if (response.status === 403) {
            throw new Error('Akses ditolak');
          }
          
          throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
        }

        const responseText = await response.text();
        if (!responseText.trim()) {
          throw new Error('Server mengembalikan response kosong');
        }

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

        // Find completed event or get last message content
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

        throw new Error('Tidak ada konten yang valid dari response');

      } catch (error) {
        console.error('Error in submitImageProcessorAnalysis:', error);
        
        if (retries < MAX_RETRIES) {
          retries++;
          await wait(RETRY_DELAY * retries);
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Gagal setelah mencoba beberapa kali');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  }
};
