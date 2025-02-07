// Gunakan chatflow ID dari Flowise
const CHATFLOW_ID = '88ab6381-6ee6-47c1-8835-e2c057151e81'; // Gunakan ID yang sama dengan empService
// Gunakan PERKABA_API_KEY seperti di empService
const API_KEY = import.meta.env.VITE_PERKABA_API_KEY;

// Import dengan type assertion jika type declarations tidak tersedia
import imageCompression from 'browser-image-compression';
// atau
// const imageCompression = require('browser-image-compression') as any;

export const submitImageProcessorAnalysis = async (imageFile: File): Promise<string> => {
  try {
    console.log('Starting image analysis with file:', {
      name: imageFile.name,
      type: imageFile.type,
      size: imageFile.size
    });

    if (!imageFile.type.startsWith('image/')) {
      throw new Error('File harus berupa gambar');
    }

    // Tambahkan kompresi gambar sebelum upload
    const compressedImage = await compressImage(imageFile);

    // Convert file to base64
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedImage);
      reader.onload = () => {
        console.log('File successfully converted to base64');
        resolve(reader.result as string);
      };
      reader.onerror = error => {
        console.error('Error reading file:', error);
        reject(error);
      };
    });

    // Format payload sesuai dokumentasi Flowise
    const payload = {
      question: "Can you describe the image?",
      uploads: [
        {
          data: base64Image,
          type: "file",
          name: compressedImage.name,
          mime: compressedImage.type
        }
      ]
    };

    // Gunakan proxy path seperti empService
    const baseUrl = '/flowise';
    const apiUrl = `${baseUrl}/api/v1/prediction/${CHATFLOW_ID}`;

    // Log request details seperti empService
    console.group('Image Analysis API Request');
    console.log('Environment:', import.meta.env.PROD ? 'Production' : 'Development');
    console.log('Base URL:', baseUrl);
    console.log('Full URL:', apiUrl);
    console.log('Payload Size:', JSON.stringify(payload).length);
    console.groupEnd();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    // Log response seperti empService
    console.group('Image Analysis API Response');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.groupEnd();

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      
      if (response.status === 502) {
        throw new Error('Layanan Flowise sedang tidak tersedia. Mohon coba beberapa saat lagi.');
      }
      
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.group('Image Analysis API Success');
    console.log('Response Data:', JSON.stringify(data, null, 2));
    console.groupEnd();

    return data.text || 'No response text received';
    
  } catch (error) {
    console.group('Image Analysis API Error');
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error Type:', error instanceof Error ? error.constructor.name : 'Unknown');
    console.error('Error Message:', errorMessage);
    console.groupEnd();

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to connect to the Flowise service. Please check if the server is running and accessible.');
    }

    throw new Error(errorMessage);
  }
};

// Tambahkan kompresi gambar sebelum upload
const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type // Tambahkan file type untuk memastikan output yang benar
  };
  
  try {
    console.log('Starting image compression...');
    console.log('Original file:', {
      size: file.size / 1024 / 1024 + 'MB',
      type: file.type
    });

    const compressedFile = await imageCompression(file, options);
    
    console.log('Compression complete:', {
      originalSize: file.size / 1024 / 1024 + 'MB',
      compressedSize: compressedFile.size / 1024 / 1024 + 'MB',
      type: compressedFile.type
    });

    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file;
  }
};