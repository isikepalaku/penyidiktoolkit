import { caseResearchAgent } from '@/data/agents/caseResearchAgent';

// Gunakan URL tetap untuk case research
const BASE_URL = 'https://api.reserse.id';

export const submitCaseResearch = async (caseDescription: string): Promise<string> => {
  try {
    const url = `${BASE_URL}/v1/playground/agents/${caseResearchAgent.id}/runs`;

    console.group('Case Research API Request');
    console.log('Base URL:', BASE_URL);
    console.log('Full URL:', url);
    console.groupEnd();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': import.meta.env.VITE_API_KEY || ''
      },
      body: JSON.stringify({
        message: caseDescription,
        agent_id: caseResearchAgent.id,
        stream: false,
        monitor: false,
        session_id: 'string',
        user_id: 'string'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.status === 400) {
        throw new Error('Bad Request: Periksa kembali input Anda');
      }
      if (response.status === 401) {
        throw new Error('Unauthorized: API key tidak valid');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: Tidak memiliki akses');
      }
      
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.group('Case Research API Success');
    console.log('Response:', data);
    console.groupEnd();

    return data.text || data.content || 'No response received';

  } catch (error) {
    console.group('Case Research API Error');
    console.error('Error Type:', error instanceof Error ? error.constructor.name : 'Unknown');
    console.error('Error Message:', error instanceof Error ? error.message : String(error));
    console.groupEnd();

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Tidak dapat terhubung ke server. Periksa koneksi Anda.');
    }

    throw error;
  }
}; 