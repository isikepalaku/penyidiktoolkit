const API_KEY = "phi-oHzWmyg4SJ6jOI29Fg15iQhABYWqhNeM-zmrNxbkgwo";
const API_URL = "http://localhost:8000";

export const submitImageAnalysis = async (
  imageFile: File, 
  description?: string
): Promise<string> => {
  try {
    // Convert image file to base64
    const reader = new FileReader();
    const imagePromise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
    reader.readAsDataURL(imageFile);
    const imageBase64 = await imagePromise;

    // Prepare payload
    const payload = {
      message: imageBase64,
      agent_id: 'gambar-agent',
      stream: false,
      monitor: false,
      description: description || ''
    };

    // Send request to image analysis endpoint
    const response = await fetch(`${API_URL}/v1/playground/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
  } catch (error) {
    console.error('Error in submitImageAnalysis:', error);
    throw new Error(`Gagal mengirim gambar untuk dianalisis: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
      return 'police-agent';
  }
};
