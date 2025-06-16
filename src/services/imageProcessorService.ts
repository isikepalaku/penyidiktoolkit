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

// Detect iOS Safari
const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
};

// Check if device has limited memory (iOS detection)
const hasLimitedMemory = (): boolean => {
  return isIOSSafari() || ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4);
};

// Safe file type detection for iOS
const getSafeFileType = (file: File): string => {
  // iOS might not provide correct MIME type for HEIC/HEIF
  if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    return 'image/heic';
  }
  return file.type || 'image/jpeg';
};

// Create blob-based file for iOS compatibility
const createCompatibleFile = (blob: Blob, originalFile: File): File => {
  try {
    // Try modern File constructor
    return new File([blob], originalFile.name, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  } catch (error) {
    console.warn('File constructor not supported, using Blob fallback');
    // Fallback: Create a blob with file-like properties
    const fileBlob = blob as any;
    fileBlob.name = originalFile.name;
    fileBlob.lastModified = Date.now();
    return fileBlob;
  }
};

// Enhanced image compression with iOS-specific optimizations
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const isIOS = isIOSSafari();
    const limitedMemory = hasLimitedMemory();
    
    console.log(`🍎 iOS Safari detected: ${isIOS}, Limited Memory: ${limitedMemory}`);
    
    // Skip compression for very large files on iOS to prevent crashes
    if (isIOS && file.size > 10 * 1024 * 1024) {
      console.log('📱 Skipping compression on iOS for large file to prevent crash');
      resolve(file);
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          
          // More conservative limits for iOS
          const MAX_WIDTH = isIOS ? 1200 : 1600;
          const MAX_HEIGHT = isIOS ? 1200 : 1600;
          
          // Calculate new dimensions
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
          
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.warn('Canvas context not available, using original file');
            resolve(file);
            return;
          }
          
          // Clear canvas and set white background for JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          
          // Draw image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Use different compression strategies for iOS
          if (isIOS) {
            // For iOS, use more conservative compression
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  console.warn('Canvas toBlob failed on iOS, using original file');
                  resolve(file);
                  return;
                }
                
                try {
                  const compressedFile = createCompatibleFile(blob, file);
                  console.log(`✅ iOS compression successful: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);
                  resolve(compressedFile);
                } catch (error) {
                  console.error('Failed to create compressed file on iOS:', error);
                  resolve(file);
                }
              },
              'image/jpeg',
              0.9  // Higher quality for iOS to reduce processing time
            );
          } else {
            // Standard compression for other platforms
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  console.warn('Canvas toBlob failed, using original file');
                  resolve(file);
                  return;
                }
                
                try {
                  const compressedFile = createCompatibleFile(blob, file);
                  console.log(`✅ Compression successful: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);
                  resolve(compressedFile);
                } catch (error) {
                  console.error('Failed to create compressed file:', error);
                  resolve(file);
                }
              },
              'image/jpeg',
              0.8
            );
          }
        } catch (error) {
          console.error('Canvas processing failed:', error);
          resolve(file);
        }
      };
      
      img.onerror = () => {
        console.error('Failed to load image for compression');
        resolve(file);
      };
      
      // Set cross-origin for better compatibility
      img.crossOrigin = 'anonymous';
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      console.error('FileReader failed');
      resolve(file);
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('FileReader readAsDataURL failed:', error);
      resolve(file);
    }
  });
};

export const submitImageProcessorAnalysis = async (imageFile: File): Promise<string> => {
  try {
    // Enhanced file validation with iOS-specific checks
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (imageFile.size > MAX_FILE_SIZE) {
      throw new Error(`File terlalu besar. Maksimum ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Enhanced file type validation with iOS HEIC support
    const safeFileType = getSafeFileType(imageFile);
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const isValidType = supportedTypes.some(type => safeFileType.toLowerCase().includes(type.split('/')[1])) || 
                       imageFile.type.startsWith('image/');
    
    if (!isValidType) {
      throw new Error('File harus berupa gambar (JPEG, PNG, WebP, HEIC)');
    }

    // Log device and file details
    console.group('📱 Device & File Analysis');
    console.log('Device Info:', {
      isIOSSafari: isIOSSafari(),
      hasLimitedMemory: hasLimitedMemory(),
      userAgent: navigator.userAgent,
      deviceMemory: (navigator as any).deviceMemory || 'unknown'
    });
    console.log('Original File:', {
      name: imageFile.name,
      type: imageFile.type,
      safeType: safeFileType,
      size: `${(imageFile.size / (1024 * 1024)).toFixed(2)}MB`,
      lastModified: new Date(imageFile.lastModified).toISOString()
    });
    console.groupEnd();

    // Smart compression strategy based on device and file size
    let fileToUpload = imageFile;
    const shouldCompress = imageFile.size > 1 * 1024 * 1024;
    const isLargeFileOnIOS = isIOSSafari() && imageFile.size > 5 * 1024 * 1024;
    
    if (shouldCompress && !isLargeFileOnIOS) {
      try {
        console.log('🔄 Starting smart compression...');
        fileToUpload = await compressImage(imageFile);
        
        // Verify compression was beneficial
        if (fileToUpload.size >= imageFile.size * 0.9) {
          console.log('📊 Compression not beneficial, using original file');
          fileToUpload = imageFile;
        }
      } catch (error) {
        console.error('❌ Compression failed:', error);
        console.log('📁 Using original file');
        fileToUpload = imageFile;
      }
    } else if (isLargeFileOnIOS) {
      console.log('📱 Large file on iOS detected, skipping compression to prevent crash');
    }

    // Prepare FormData with proper file handling
    const formData = new FormData();
    formData.append('message', 'Mohon analisis gambar ini dan berikan lokasi yang terlihat beserta penjelasannya');
    formData.append('stream', 'true');
    formData.append('monitor', 'false');
    formData.append('session_id', 'string');
    formData.append('user_id', 'string');
    
    // Handle file append with proper type
    try {
      formData.append('files', fileToUpload);
      console.log(`📤 File prepared for upload: ${fileToUpload.name} (${(fileToUpload.size / (1024 * 1024)).toFixed(2)}MB)`);
    } catch (error) {
      console.error('❌ Failed to append file to FormData:', error);
      throw new Error('Gagal mempersiapkan file untuk upload');
    }

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'X-API-Key': API_KEY || ''
    };

    let retries = 0;
    while (retries <= MAX_RETRIES) {
      try {
        const url = `${API_BASE_URL}/v1/playground/agents/geo-image-agent/runs`;
        
        console.log(`🌐 Making API request (attempt ${retries + 1}/${MAX_RETRIES + 1})`);
        
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
          
          if (response.status === 413) {
            throw new Error('File terlalu besar untuk diproses server');
          }
          
          throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
        }

        const responseText = await response.text();
        if (!responseText.trim()) {
          throw new Error('Server mengembalikan response kosong');
        }

        // Enhanced response parsing with better error handling
        const events = responseText.split('}').map(event => {
          if (!event.trim()) return null;
          try {
            return JSON.parse(event + '}') as StreamEvent;
          } catch {
            try {
              return JSON.parse(event.trim() + '}') as StreamEvent;
            } catch {
              console.warn('Failed to parse event:', event.substring(0, 100) + '...');
              return null;
            }
          }
        }).filter((event): event is StreamEvent => event !== null);

        console.log(`📋 Parsed ${events.length} events from response`);

        // Find completed event or get last message content
        const completedEvent = events.find(event => event.event === 'RunCompleted');
        if (completedEvent?.content) {
          console.log('✅ Found completed event with content');
          return completedEvent.content;
        }

        const responseContent = events
          .filter(event => event.event === 'RunResponse')
          .map(event => event.content)
          .filter((content): content is string => content !== undefined)
          .join('');

        if (responseContent) {
          console.log('✅ Found response content from RunResponse events');
          return responseContent;
        }

        const messagesEvent = events.find(event => event.messages && Array.isArray(event.messages) && event.messages.length > 0);
        if (messagesEvent?.messages) {
          const modelMessages = messagesEvent.messages
            .filter((msg: Message) => msg.role === 'model')
            .map((msg: Message) => msg.content);
          
          if (modelMessages.length > 0) {
            console.log('✅ Found content from messages array');
            return modelMessages[modelMessages.length - 1];
          }
        }

        throw new Error('Tidak ada konten yang valid dari response');

      } catch (error) {
        console.error(`❌ Error in submitImageProcessorAnalysis (attempt ${retries + 1}):`, error);
        
        if (retries < MAX_RETRIES) {
          retries++;
          const delayMs = RETRY_DELAY * retries;
          console.log(`⏳ Retrying in ${delayMs}ms...`);
          await wait(delayMs);
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Gagal setelah mencoba beberapa kali');
  } catch (error) {
    console.error('🚨 Final error in submitImageProcessorAnalysis:', error);
    
    if (error instanceof Error) {
      // Provide user-friendly error messages for common iOS issues
      if (error.message.includes('out of memory') || error.message.includes('quota')) {
        throw new Error('Gambar terlalu besar untuk diproses di perangkat ini. Silakan gunakan gambar yang lebih kecil.');
      }
      
      if (error.message.includes('canvas') || error.message.includes('toBlob')) {
        throw new Error('Terjadi masalah saat memproses gambar. Silakan coba lagi atau gunakan gambar dengan format berbeda.');
      }
      
      throw error;
    }
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  }
};
