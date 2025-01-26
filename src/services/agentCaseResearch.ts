const API_KEY = "phi-oHzWmyg4SJ6jOI29Fg15iQhABYWqhNeM-zmrNxbkgwo";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const submitAgentAnalysis = async (
  message: string
): Promise<string> => {
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const payload = {
        message: message.trim(),
        agent_id: 'web_search_agent',
        stream: false,
        monitor: false
      };

      console.log('Sending request with payload:', payload);

      const response = await fetch('/v1/playground/agent/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        if (response.status >= 500 && retries < MAX_RETRIES) {
          console.log(`Retrying after server error (attempt ${retries + 2} of ${MAX_RETRIES + 1})`);
          retries++;
          await wait(RETRY_DELAY * retries);
          continue;
        }
        
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      console.log('Response content type:', contentType);

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      try {
        if (!responseText) {
          throw new Error('Empty response received');
        }

        let parsedResponse = JSON.parse(responseText);
        
        // Handle nested JSON string case
        if (typeof parsedResponse === 'string' && parsedResponse.startsWith('{')) {
          parsedResponse = JSON.parse(parsedResponse);
        }
        
        if (parsedResponse.content) {
          return parsedResponse.content;
        }

        if (parsedResponse.message) {
          return parsedResponse.message;
        }

        console.error('Unexpected response format:', parsedResponse);
        throw new Error('Format respon tidak sesuai');
      } catch (error) {
        console.error('Error parsing response:', error);
        console.error('Raw response was:', responseText);
        throw new Error('Format respon tidak valid');
      }
    } catch (error) {
      console.error('Error in submitAgentAnalysis:', error);
      
      if (error instanceof TypeError && retries < MAX_RETRIES) {
        console.log(`Retrying after network error (attempt ${retries + 2} of ${MAX_RETRIES + 1})`);
        retries++;
        await wait(RETRY_DELAY * retries);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Failed after maximum retries');
};
