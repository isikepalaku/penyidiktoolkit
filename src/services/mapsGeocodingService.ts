import { env } from '@/config/env';

const API_KEY = import.meta.env.VITE_API_KEY;
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

export const submitMapsGeocoding = async (searchQuery: string): Promise<string> => {
  try {
    // Gunakan path relatif, nginx akan handle proxy
    const url = `${API_BASE_URL}/v1/playground/agents/maps-agent/runs`;

    console.group('Maps Geocoding API Request');
    console.log('Full URL:', url);
    console.groupEnd();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': API_KEY || ''
      },
      body: new URLSearchParams({
        message: searchQuery,
        agent_id: 'maps-agent',
        stream: 'false',
        monitor: 'false',
        session_id: 'string',
        user_id: 'string'
      }).toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      if (response.status === 429) {
        throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
      }
      
      if (response.status === 401) {
        throw new Error('Unauthorized: API key tidak valid');
      }

      if (response.status === 403) {
        throw new Error('Forbidden: Tidak memiliki akses');
      }
      
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.group('Maps Geocoding API Success');
    console.log('Response:', data);
    console.groupEnd();

    return data.text || data.content || 'No response received';

  } catch (error) {
    console.group('Maps Geocoding API Error');
    console.error('Error Type:', error instanceof Error ? error.constructor.name : 'Unknown');
    console.error('Error Message:', error instanceof Error ? error.message : String(error));
    console.groupEnd();

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Tidak dapat terhubung ke server. Periksa koneksi Anda.');
    }

    throw error;
  }
};
