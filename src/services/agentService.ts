import { GoogleGenerativeAI } from "@google/generative-ai";
import { imagePrompts } from "../data/agents/imageAgent";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_KEY = "phi-oHzWmyg4SJ6jOI29Fg15iQhABYWqhNeM-zmrNxbkgwo";
const API_URL = "http://localhost:8000";

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY tidak ditemukan dalam environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitImageAnalysis = async (
  imageFile: File,
  description?: string,
  promptType: keyof typeof imagePrompts = 'default'
): Promise<string> => {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      // Convert image to base64
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert image to base64'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(imageFile);
      });

      if (!imageBase64.startsWith('data:image/')) {
        throw new Error('Invalid image format');
      }

      // Get selected prompt and add description if provided
      const selectedPrompt = imagePrompts[promptType] || imagePrompts.default;
      const prompt = description 
        ? `${selectedPrompt}\n\nKonteks tambahan: ${description}`
        : selectedPrompt;

      // Convert base64 to data for Gemini
      const base64Data = imageBase64.split(',')[1];

      // Create parts array for Gemini
      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType: imageFile.type,
            data: base64Data
          }
        }
      ];

      // Generate content using Gemini
      const result = await model.generateContent(parts);
      const response = await result.response;
      const analysisText = response.text();

      if (!analysisText) {
        throw new Error('Tidak ada hasil analisis dari model');
      }

      return analysisText;
      
    } catch (error) {
      console.error('Error in submitImageAnalysis:', error);
      
      if (retries < MAX_RETRIES - 1 && 
          (error instanceof TypeError || 
           error instanceof Error && error.message.includes('model'))) {
        retries++;
        await wait(RETRY_DELAY * retries);
        continue;
      }

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Tidak dapat terhubung ke layanan AI. Mohon periksa koneksi anda.');
      } else if (error instanceof Error) {
        throw new Error(`Gagal menganalisis gambar: ${error.message}`);
      } else {
        throw new Error('Terjadi kesalahan yang tidak diketahui');
      }
    }
  }

  throw new Error('Gagal terhubung ke layanan AI setelah beberapa percobaan');
};
export const submitAgentAnalysis = async (
  message: string,
  agentType: string,
  stream: boolean = false
): Promise<string> => {
  const agentId = getAgentId(agentType);
  
  const payload = {
    message,
    agent_id: agentId,
    stream,
    monitor: false
  };

  // Endpoint untuk SPKT dan agent lainnya
  const response = await fetch(`${API_URL}/v1/playground/agent/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': stream ? 'text/event-stream' : 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Response headers:', response.headers);
    console.error('Response details:', errorText);
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  return await handleSSEResponse(response);
};

const handleSSEResponse = async (response: Response): Promise<string> => {
  const contentType = response.headers.get('content-type');
  
  // Handle JSON response
  if (contentType?.includes('application/json')) {
    const responseText = await response.text();
    try {
      let parsedResponse = JSON.parse(responseText);
      
      // Handle nested JSON string case
      if (typeof parsedResponse === 'string' && parsedResponse.startsWith('{')) {
        parsedResponse = JSON.parse(parsedResponse);
      }
      
      if (parsedResponse.content) {
        return parsedResponse.content;
      }
      throw new Error('Format respon tidak sesuai');
    } catch (error) {
      console.error('Error parsing JSON:', error);
      throw new Error('Format respon tidak valid');
    }
  }
  
  // Handle SSE streaming response
  if (contentType?.includes('text/event-stream')) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let result = '';

    if (!reader) {
      throw new Error('Failed to read response stream');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(Boolean);

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace('data: ', '');
            try {
              const data = JSON.parse(jsonStr);
              if (data.content) {
                result += data.content;
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading SSE stream:', error);
      throw new Error('Gagal membaca aliran respon');
    }

    if (!result) {
      return '**Tidak ada konten dalam respon**\n\nSilakan coba lagi atau periksa input Anda.';
    }
    return result;
  }

  throw new Error('Format respon tidak dikenali');
};

const getAgentId = (type: string): string => {
  switch (type) {
    case 'spkt':
      return 'police-agent';
    case 'image':
      return 'gambar-agent';
    default:
      throw new Error('Tipe agen tidak didukung');
  }
};