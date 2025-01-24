const API_KEY = "phi-oHzWmyg4SJ6jOI29Fg15iQhABYWqhNeM-zmrNxbkgwo";
const API_URL = "http://localhost:8000";

export const submitAgentAnalysis = async (
    message: string,
    _agentType: string, // Not used since we always use web-search-agent
    stream: boolean = false
  ): Promise<string> => {
    const payload = {
      message,
      agent_id: 'hoax-checker-agent',
      stream,
      monitor: false
    };
  
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