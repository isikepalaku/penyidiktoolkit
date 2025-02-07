import { env } from '@/config/env';
import { imageProcessorAgent } from '@/data/agents/imageProcessorAgent';

const API_KEY = env.apiKey;
const API_BASE_URL = env.apiUrl || 'http://host.docker.internal:8000';

export const submitImageProcessorAnalysis = async (imageFile: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('message', 'string');
    formData.append('agent_id', imageProcessorAgent.id);
    formData.append('stream', 'true');
    formData.append('monitor', 'false'); 
    formData.append('session_id', 'string');
    formData.append('user_id', 'string');
    formData.append('image', imageFile);

    const headers: HeadersInit = {
      'Accept': 'application/json'
    };
    
    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    console.log('Sending request to:', `${API_BASE_URL}/v1/playground/agents/${imageProcessorAgent.id}/runs`);
    console.log('Headers:', headers);
    console.log('FormData entries:', Object.fromEntries(formData.entries()));

    const response = await fetch(`${API_BASE_URL}/v1/playground/agents/${imageProcessorAgent.id}/runs`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);
    return data.content || data.message || 'No content received';
    
  } catch (error) {
    console.error('Error in submitImageProcessorAnalysis:', error);
    throw error;
  }
};
