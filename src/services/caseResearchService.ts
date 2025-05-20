import { caseResearchAgent } from '@/data/agents/caseResearchAgent';
import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_API_KEY;
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

export const submitCaseResearch = async (caseDescription: string): Promise<string> => {
  try {
    // Generate session ID dan dapatkan user ID jika login
    const sessionId = `session_${uuidv4()}`;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    
    // Gunakan Supabase user ID atau buat anonymous ID
    const userId = user?.id || `anon_${uuidv4()}`;
    
    // Gunakan path relatif, nginx akan handle proxy
    const url = `${API_BASE_URL}/v1/playground/agents/${caseResearchAgent.id}/runs`;

    console.group('Case Research API Request');
    console.log('Full URL:', url);
    console.log('User ID:', userId);
    console.log('Session ID:', sessionId);
    console.groupEnd();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-User-ID': userId
    };
    
    // Tambahkan API Key jika tersedia
    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }
    
    // Tambahkan token autentikasi jika user login
    if (authSession?.access_token) {
      headers['Authorization'] = `Bearer ${authSession.access_token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: caseDescription,
        agent_id: caseResearchAgent.id,
        stream: false,
        monitor: false,
        session_id: sessionId,
        user_id: userId,
        is_authenticated: user ? true : false
      })
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

    // Deteksi error jaringan yang lebih baik
    const isNetworkError = 
      error instanceof TypeError ||
      (error instanceof Error && (
        error.message.includes('network') ||
        error.message.includes('connection') ||
        error.message.includes('abort') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('timeout') ||
        error.message.includes('Network request failed') ||
        !navigator.onLine
      ));
    
    if (isNetworkError) {
      throw new Error('Terjadi masalah koneksi. Silakan periksa koneksi internet Anda dan coba lagi.');
    }

    throw error;
  }
}; 