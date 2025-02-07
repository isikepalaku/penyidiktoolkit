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
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.text || data.content || 'No response received';

  } catch (error) {
    console.error('Case Research Error:', error);
    throw error;
  }
}; 