import { env } from '@/config/env';

const API_KEY = env.apiKey;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        // Log request details for debugging
        console.log('Making request to:', `/v1/playground/agent/run`);
        console.log('With payload:', payload);

        const response = await fetch(`/v1/playground/agent/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': stream ? 'text/event-stream' : 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify(payload)
        });

        // Log response status
        console.log('Response status:', response.status);
        console.log('Response type:', response.headers.get('content-type'));
    
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response headers:', Object.fromEntries(response.headers.entries()));
          console.error('Error response details:', errorText);
          
          // Only retry if it's a network error or 5xx server error
          if (response.status >= 500 && retries < MAX_RETRIES - 1) {
            retries++;
            await wait(RETRY_DELAY * retries);
            continue;
          }
          
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
    
        return await handleSSEResponse(response);
      } catch (error) {
        console.error('Error in submitAgentAnalysis:', error);
        
        // Retry on network errors
        if (retries < MAX_RETRIES - 1 && 
            (error instanceof TypeError || error instanceof Error && error.message.includes('Failed to fetch'))) {
          retries++;
          await wait(RETRY_DELAY * retries);
          continue;
        }

        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          throw new Error('Tidak dapat terhubung ke API. Mohon periksa koneksi anda.');
        } else if (error instanceof Error) {
          throw error;
        } else {
          throw new Error('Terjadi kesalahan yang tidak diketahui');
        }
      }
    }

    throw new Error('Gagal terhubung ke API setelah beberapa percobaan');
  };
  
  const handleSSEResponse = async (response: Response): Promise<string> => {
    const contentType = response.headers.get('content-type');
    
    // Handle JSON response
    if (contentType?.includes('application/json')) {
      const responseText = await response.text();
      console.log('Raw JSON response:', responseText);
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
        console.error('Raw response that failed to parse:', responseText);
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
