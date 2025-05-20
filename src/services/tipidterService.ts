/**
 * TIPIDTER AI Service
 * Service untuk menangani chat AI untuk bidang tindak pidana tertentu
 * Menggunakan backend API untuk manajemen session dan [TODO: Migrasi ke Supabase DB] untuk persistensi data
 */

import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
// import { auth, db } from '../firebase'; // Dikomentari - TODO: Ganti dengan Supabase
import { supabase } from '../supabaseClient'; // Tambahkan ini, sesuaikan path jika perlu

// Impor Firestore spesifik dikomentari - TODO: Ganti dengan operasi Supabase DB
/*
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  increment,
  serverTimestamp
} from 'firebase/firestore';
*/

// TODO: Definisikan interface untuk data sesi dan pesan dari Supabase
// export interface SupabaseSession { ... }
// export interface SupabaseMessage { ... }

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const FETCH_TIMEOUT = 600000; // 10 minutes timeout - matching nginx server timeout
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

// Interface untuk informasi sesi yang akan ditampilkan di UI
export interface SessionInfo {
  id: string;
  title: string; 
  updatedAt: string; // ISO string date
  createdAt: string; // ISO string date
  isAnonymous: boolean;
  agentType: string;
  // messageCount?: number; // Bisa ditambahkan jika ada di tabel sessions
}

// Interface untuk struktur data pesan yang akan digunakan di UI
export interface Message {
  id: string;
  sessionId: string; 
  userId: string | null; 
  content: string;
  role: 'user' | 'assistant'; 
  createdAt: string; // ISO string date
  metadata?: any; 
}

// Fungsi mapper untuk mengubah data sesi dari Supabase ke SessionInfo
const mapSupabaseSessionToSessionInfo = (session: any): SessionInfo => ({
  id: session.id,
  // Memberikan judul default jika tidak ada, atau bisa lebih deskriptif
  title: session.title || `Sesi Tipidter (${new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
  updatedAt: session.updated_at,
  createdAt: session.created_at,
  isAnonymous: session.is_anonymous || false, // Default ke false jika null/undefined
  agentType: session.agent_type,
});

// Fungsi mapper untuk mengubah data pesan dari Supabase ke interface Message
const mapSupabaseMessageToMessage = (msg: any): Message => ({
  id: msg.id,
  sessionId: msg.session_id,
  userId: msg.user_id,
  content: msg.content,
  role: msg.role as ('user' | 'assistant'), // Pastikan tipe 'role' sesuai dari DB
  createdAt: msg.created_at,
  metadata: msg.metadata, // Bisa berisi sourceDocuments dll.
});

// Menyimpan sesi aktif untuk user saat ini
let activeSessionId: string | null = null; // TODO: Pertimbangkan ulang manajemen state sesi aktif ini

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const parseResponse = async (response: Response) => {
  const text = await response.text();
  try {
    // First try to parse as JSON
    return JSON.parse(text);
  } catch (error) {
    // If JSON parsing fails, handle text response
    console.log('Response is not JSON, processing as text:', text);
    console.error('JSON parse error:', error);
    
    // If the text contains multiple JSON objects, try to parse the first one
    const jsonMatch = text.match(/\{.*?\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error('Failed to parse matched JSON:', error);
      }
    }
    
    // If all parsing fails, return text as content
    return { content: text };
  }
};

// Interface untuk respon pesan chat
export interface ChatResponse {
  text: string;
  sourceDocuments?: Array<{
    pageContent: string;
    metadata: Record<string, string>;
  }>;
  error?: boolean | string;
}

/**
 * [TODO: Refaktor untuk Supabase]
 * Membuat atau mendapatkan sesi untuk user
 * Session ID digunakan oleh backend untuk mengelola konteks percakapan
 * dan akan disimpan di Supabase DB untuk persistensi
 */
export const initializeSession = async (): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const agentType = 'tipidter-chat'; // Spesifik untuk layanan ini
    let determinedSessionId: string; // Variabel lokal untuk memastikan return type string

    if (user) {
      // Pengguna terautentikasi
      console.log('TIPIDTER: User authenticated, fetching or creating session for user:', user.id);
      try {
        const { data: existingSessions, error: fetchError } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('agent_type', agentType)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (fetchError) {
          console.error('TIPIDTER: Error fetching existing sessions for user:', fetchError);
          // FALLBACK: Gunakan session ID lokal jika database tidak tersedia
          console.warn('TIPIDTER: Using local session ID as fallback since DB fetch failed');
          determinedSessionId = `local_${uuidv4()}`;
        } else if (existingSessions && existingSessions.length > 0) {
          determinedSessionId = existingSessions[0].id;
        } else {
          // Tidak ada sesi yang ditemukan, coba buat baru
          try {
            const newSessionId = uuidv4(); 
            const { error: insertError } = await supabase
              .from('sessions')
              .insert({
                id: newSessionId,
                user_id: user.id,
                agent_type: agentType,
                is_anonymous: false,
              });
            
            if (insertError) {
              console.error('TIPIDTER: Error creating new session for user (no existing):', insertError);
              // FALLBACK: Gunakan session ID lokal jika database insert gagal
              console.warn('TIPIDTER: Using local session ID as fallback since DB insert failed');
              determinedSessionId = `local_${uuidv4()}`;
            } else {
              determinedSessionId = newSessionId;
            }
          } catch (insertCatchError) {
            console.error('TIPIDTER: Caught error creating new session:', insertCatchError);
            // FALLBACK: Gunakan session ID lokal jika ada exception
            determinedSessionId = `local_${uuidv4()}`;
          }
        }
      } catch (dbOperationError) {
        console.error('TIPIDTER: Database operation failed completely:', dbOperationError);
        // FALLBACK: Gunakan session ID lokal jika semua operasi database gagal
        determinedSessionId = `local_${uuidv4()}`;
      }
      console.log('TIPIDTER: Using session for user:', determinedSessionId);
    } else {
      // Pengguna anonim
      console.log('TIPIDTER: User not authenticated, creating new anonymous session.');
      const newAnonSessionId = uuidv4();
      try {
        const { error: insertAnonError } = await supabase
          .from('sessions')
          .insert({
            id: newAnonSessionId,
            user_id: null, 
            agent_type: agentType,
            is_anonymous: true, 
          });
        
        if (insertAnonError) {
          console.error('TIPIDTER: Error creating new anonymous session in DB:', insertAnonError);
          console.warn('TIPIDTER: Anonymous session FAILED to save to DB. Using local session ID.');
        }
      } catch (anonInsertError) {
        console.error('TIPIDTER: Caught error creating anonymous session:', anonInsertError);
      }
      
      determinedSessionId = newAnonSessionId;
      console.log('TIPIDTER: Created anonymous session with ID:', determinedSessionId);
    }

    activeSessionId = determinedSessionId; // Update state global service
    return determinedSessionId; // Return variabel lokal yang pasti string
  } catch (error) {
    // FALLBACK utama jika semua operasi gagal
    console.error('TIPIDTER: Complete initialization failure:', error);
    const fallbackSessionId = `fallback_${uuidv4()}`;
    activeSessionId = fallbackSessionId;
    console.warn('TIPIDTER: Using completely local fallback session ID:', fallbackSessionId);
    return fallbackSessionId;
  }
};

/**
 * [TODO: Refaktor untuk Supabase]
 * Menghapus sesi aktif dan memulai percakapan baru
 */
export const clearChatHistory = async () => {
  const oldSessionId = activeSessionId;
  activeSessionId = null;
  // TODO: Implementasi logika untuk menandai sesi tidak aktif atau menghapusnya di Supabase jika perlu
  // Tidak ada direct equivalent untuk `activeSession: { tipidter: null }` di user doc.
  // Anda mungkin ingin mengupdate tabel 'user_preferences' atau menghapus sesi dari tabel 'sessions'.
  console.log('TIPIDTER: Chat history cleared, old session:', oldSessionId);
};

/**
 * [TODO: Refaktor untuk Supabase]
 * Mengirim pesan chat ke API dan menyimpan di Supabase DB
 */
export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  let retries = 0;
  let sessionId: string;
  
  try {
    sessionId = await initializeSession(); // Mendapatkan atau membuat sesi
  } catch (sessionError) {
    console.error('TIPIDTER: Failed to initialize session, using emergency fallback:', sessionError);
    sessionId = `emergency_${uuidv4()}`;
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user ? user.id : null;

  // 1. Simpan pesan pengguna ke Supabase jika memungkinkan
  let userMessageSaved = false;
  try {
    const userMessageId = uuidv4();
    const { error: userMessageError } = await supabase.from('messages').insert({
      id: userMessageId,
      session_id: sessionId,
      user_id: currentUserId,
      content: message.trim(),
      role: 'user',
      // created_at akan diisi otomatis oleh DB
    });
    
    if (userMessageError) {
      console.error('TIPIDTER: Error saving user message to Supabase:', userMessageError);
      // Tetap lanjutkan API call meskipun penyimpanan pesan gagal
    } else {
      userMessageSaved = true;
      // 2. Update timestamp sesi di tabel 'sessions' Supabase - hanya jika pesan berhasil disimpan
      try {
        const { error: updateSessionError } = await supabase
          .from('sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sessionId);
        
        if (updateSessionError) {
          console.error('TIPIDTER: Error updating session timestamp after user message:', updateSessionError);
        }
      } catch (sessionUpdateError) {
        console.error('TIPIDTER: Session update error caught:', sessionUpdateError);
      }
    }
  } catch (dbError) {
    console.error('TIPIDTER: Database operation failed before sending message to API:', dbError);
    // Tetap lanjutkan ke panggilan API meskipun operasi DB gagal
  }
  
  // Bagian pemanggilan API tetap sama
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`TIPIDTER: API Call Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('agent_id', 'tipidter-chat');
      formData.append('stream', 'false');
      formData.append('monitor', 'false');
      formData.append('session_id', sessionId); // sessionId sudah pasti string dari initializeSession
      
      // user_id untuk API bisa jadi user_id asli atau sessionId jika anonim (tergantung kebutuhan API)
      // Untuk konsistensi dengan logika sebelumnya dan tipidkorService:
      const userIdForApi = currentUserId || sessionId; 
      formData.append('user_id', userIdForApi);

      console.log('TIPIDTER: Sending request to API with FormData:', {
        message: message.trim().substring(0, 50) + (message.length > 50 ? '...' : ''),
        agent_id: 'tipidter-chat',
        session_id: sessionId,
        user_id: userIdForApi,
        is_authenticated: currentUserId ? true : false,
      });

      const headers: HeadersInit = {
        'Accept': 'application/json',
        'X-User-ID': userIdForApi, // Untuk rate limiting atau tracking di API backend
      };
      
      // Menambahkan token autentikasi Supabase ke header
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
        console.log('TIPIDTER: Using API key for authentication');
      } else {
        console.warn('TIPIDTER: No API key provided, request may fail');
      }

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formData
      };

      const url = `${API_BASE_URL}/v1/playground/agents/tipidter-chat/runs`;
      console.log('TIPIDTER: Sending API request to:', url);

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT);
      
      requestOptions.signal = abortController.signal;
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (abortController.signal.aborted) {
        throw new Error('TIPIDTER: API Request timed out after 10 minutes');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TIPIDTER: API Error response:', errorText);
        if (response.status === 429) {
          throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
        }
        if (response.status >= 500 && retries < MAX_RETRIES) {
          retries++;
          await wait(RETRY_DELAY * retries);
          continue;
        }
        throw new Error(`TIPIDTER: API HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await parseResponse(response);
      console.log('TIPIDTER: Parsed API response data:', data);

      // 3. Simpan pesan bot ke Supabase jika memungkinkan
      let botMessageSaved = false;
      try {
        const botMessageId = uuidv4();
        const { error: botMessageError } = await supabase.from('messages').insert({
          id: botMessageId,
          session_id: sessionId,
          user_id: null, // Pesan dari asisten/bot tidak memiliki user_id
          content: data.content || data.message || 'No response content from API',
          role: 'assistant',
          metadata: data.sourceDocuments ? { sourceDocuments: data.sourceDocuments } : undefined,
          // created_at akan diisi otomatis oleh DB
        });
        
        if (botMessageError) {
          console.error('TIPIDTER: Error saving bot message to Supabase:', botMessageError);
        } else {
          botMessageSaved = true;
          // 4. Update timestamp sesi lagi setelah pesan bot - hanya jika pesan berhasil disimpan
          try {
            const { error: updateSessionAfterBotError } = await supabase
              .from('sessions')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', sessionId);
              
            if (updateSessionAfterBotError) {
              console.error('TIPIDTER: Error updating session timestamp after bot message:', updateSessionAfterBotError);
            }
          } catch (sessionUpdateError) {
            console.error('TIPIDTER: Session update error after bot message caught:', sessionUpdateError);
          }
        }
      } catch (dbError) {
        console.error('TIPIDTER: Database operation failed after receiving message from API:', dbError);
      }

      // Log status akhir operasi
      console.log('TIPIDTER: Operation completed. User message saved:', userMessageSaved, 'Bot message saved:', botMessageSaved);

      return {
        text: data.content || data.message || 'No response received',
        sourceDocuments: data.sourceDocuments
      };

    } catch (error) {
      console.error('TIPIDTER: Error in sendChatMessage API call loop:', error);
      
      // Deteksi error jaringan yang lebih baik
      const isNetworkError = 
        error instanceof TypeError || 
        (error instanceof Error && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('network') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('abort') ||
          !navigator.onLine
        ));
      
      if (isNetworkError && retries < MAX_RETRIES) {
        retries++;
        const backoffDelay = RETRY_DELAY * Math.pow(2, retries - 1);
        console.log(`TIPIDTER: Network error detected, retrying in ${backoffDelay}ms...`);
        await wait(backoffDelay);
        continue;
      }
      
      throw error; // Rethrow error jika bukan TypeError/network error yang bisa di-retry atau sudah max retries
    }
  }
  
  throw new Error('TIPIDTER: Failed to send message after maximum retries');
};

/**
 * [Telah Direfaktor untuk Supabase]
 * Mengambil semua sesi untuk pengguna saat ini dari Supabase DB
 */
export const getUserSessions = async (): Promise<SessionInfo[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const agentType = 'tipidter-chat'; // Hanya ambil sesi untuk agen ini

    if (user) {
      // Pengguna terautentikasi
      console.log('TIPIDTER: Fetching sessions for authenticated user:', user.id);
      try {
        const { data: sessionsData, error } = await supabase
          .from('sessions')
          .select('*') // Ambil semua kolom yang relevan untuk SessionInfo
          .eq('user_id', user.id)
          .eq('agent_type', agentType) // Filter berdasarkan agent_type
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('TIPIDTER: Error fetching user sessions from Supabase:', error);
          // FALLBACK: Kembalikan activeSessionId jika ada
          if (activeSessionId) {
            console.warn('TIPIDTER: Using active session as fallback for getUserSessions');
            return [{
              id: activeSessionId,
              title: `Sesi Tipidter (${new Date().toLocaleTimeString()})`,
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              isAnonymous: !user,
              agentType: 'tipidter-chat'
            }];
          }
          return []; 
        }

        if (!sessionsData) {
          console.log('TIPIDTER: No sessions data array found for user (sessionsData is null/undefined).');
          return [];
        }

        console.log(`TIPIDTER: Found ${sessionsData.length} sessions for user ${user.id}`);
        return sessionsData.map(mapSupabaseSessionToSessionInfo);
      } catch (dbError) {
        console.error('TIPIDTER: Database error in getUserSessions:', dbError);
        // FALLBACK: Kembalikan activeSessionId jika ada
        if (activeSessionId) {
          console.warn('TIPIDTER: Using active session as fallback for getUserSessions after DB error');
          return [{
            id: activeSessionId,
            title: `Sesi Tipidter (${new Date().toLocaleTimeString()})`,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isAnonymous: !user,
            agentType: 'tipidter-chat'
          }];
        }
        return [];
      }
    } else {
      // Pengguna tidak terautentikasi, coba ambil sesi anonim aktif jika ada
      console.log('TIPIDTER: No authenticated user. Checking for active anonymous session...');
      if (activeSessionId) { // activeSessionId adalah variabel global service
        try {
          const { data: anonSessionData, error: anonError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', activeSessionId)
            .eq('is_anonymous', true) // Pastikan itu sesi anonim
            .eq('agent_type', agentType) // Dan untuk agen yang tepat
            .maybeSingle(); // Menggunakan maybeSingle karena ID mungkin tidak (lagi) valid atau bukan anonim

          if (anonError) {
            console.error('TIPIDTER: Error fetching active anonymous session:', anonError);
            // FALLBACK: Buat objek sesi dummy dari activeSessionId
            console.warn('TIPIDTER: Using dummy session object as fallback for anonymous session');
            return [{
              id: activeSessionId,
              title: `Sesi Tipidter Anonim (${new Date().toLocaleTimeString()})`,
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              isAnonymous: true,
              agentType: 'tipidter-chat'
            }];
          }
          if (anonSessionData) {
            console.log('TIPIDTER: Found active anonymous session to display:', anonSessionData);
            return [mapSupabaseSessionToSessionInfo(anonSessionData)];
          }
          console.log('TIPIDTER: No matching active anonymous session found in DB for ID:', activeSessionId);
          
          // FALLBACK: Buat objek sesi dummy dari activeSessionId
          return [{
            id: activeSessionId,
            title: `Sesi Tipidter Anonim (${new Date().toLocaleTimeString()})`,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isAnonymous: true,
            agentType: 'tipidter-chat'
          }];
        } catch (dbError) {
          console.error('TIPIDTER: Database error in getUserSessions for anonymous user:', dbError);
          // FALLBACK: Buat objek sesi dummy dari activeSessionId
          return [{
            id: activeSessionId,
            title: `Sesi Tipidter Anonim (${new Date().toLocaleTimeString()})`,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isAnonymous: true,
            agentType: 'tipidter-chat'
          }];
        }
      }
      console.log('TIPIDTER: No authenticated user and no active/valid anonymous session found.');
      return [];
    }
  } catch (error) {
    console.error('TIPIDTER: Unexpected error in getUserSessions:', error);
    // FALLBACK: Kembalikan sesi default jika ada activeSessionId
    if (activeSessionId) {
      return [{
        id: activeSessionId,
        title: `Sesi Tipidter (Fallback)`,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isAnonymous: true,
        agentType: 'tipidter-chat'
      }];
    }
    return [];
  }
};

/**
 * [Telah Direfaktor untuk Supabase]
 * Mengambil semua pesan untuk sesi tertentu dari Supabase DB
 */
export const getSessionMessages = async (sessionId: string): Promise<Message[]> => {
  console.log(`TIPIDTER: Fetching messages for session ID: ${sessionId}`);

  try {
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select('*') // Ambil semua kolom yang relevan untuk interface Message
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`TIPIDTER: Error fetching messages for session ${sessionId} from Supabase:`, error);
      // FALLBACK: Kembalikan array kosong - UI akan menampilkan status "Tidak ada pesan" atau serupa
      return [];
    }

    if (!messagesData) {
      console.log(`TIPIDTER: No messages data array found for session ${sessionId} (messagesData is null/undefined).`);
      return [];
    }

    console.log(`TIPIDTER: Found ${messagesData.length} messages for session ${sessionId}`);
    return messagesData.map(mapSupabaseMessageToMessage);
  } catch (dbError) {
    console.error(`TIPIDTER: Database error in getSessionMessages for session ${sessionId}:`, dbError);
    // FALLBACK: Kembalikan array kosong - UI akan menampilkan status "Tidak ada pesan" atau serupa
    return [];
  }
};

/**
 * [Telah Direfaktor untuk Supabase]
 * Mengganti sesi aktif pengguna dengan validasi kepemilikan sesi.
 */
export const switchSession = async (sessionId: string): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  console.log(`TIPIDTER: Attempting to switch to session: ${sessionId}`);

  const { data: sessionToActivate, error: fetchError } = await supabase
    .from('sessions')
    .select('id, user_id, is_anonymous, agent_type') // Ambil field yang diperlukan untuk validasi
    .eq('id', sessionId)
    .single(); // Harusnya hanya ada satu sesi dengan ID tersebut

  if (fetchError || !sessionToActivate) {
    console.error('TIPIDTER: Error fetching session to activate or session not found:', fetchError);
    return null; // Sesi tidak ditemukan
  }
  
  // Pastikan sesi yang akan diaktifkan adalah untuk agent 'tipidter-chat'
  if (sessionToActivate.agent_type !== 'tipidter-chat') {
    console.warn(`TIPIDTER: Attempted to switch to a session with incorrect agent_type: ${sessionToActivate.agent_type}. Required: tipidter-chat`);
    return null;
  }

  if (user) {
    // Pengguna terautentikasi
    // Boleh mengaktifkan sesi miliknya ATAU sesi anonim manapun
    if (sessionToActivate.user_id !== user.id && !sessionToActivate.is_anonymous) {
      console.error('TIPIDTER: Authenticated user attempting to switch to a session not owned by them and not anonymous.');
      return null; // Tidak diizinkan
    }
    console.log('TIPIDTER: Authenticated user, session validated.');
  } else {
    // Pengguna tidak terautentikasi
    // Hanya boleh mengaktifkan sesi anonim
    if (!sessionToActivate.is_anonymous) {
      console.error('TIPIDTER: Anonymous user attempting to switch to a non-anonymous session.');
      return null; // Tidak diizinkan
    }
    console.log('TIPIDTER: Anonymous user, anonymous session validated.');
  }

  activeSessionId = sessionToActivate.id;
  console.log('TIPIDTER: Successfully switched to session:', activeSessionId);
  
  // Jika Anda menyimpan sesi aktif di preferensi user di DB (misalnya tabel 'user_preferences'),
  // Anda bisa menambahkannya di sini:
  // if (user) { 
  //   await supabase.from('user_preferences').upsert({ user_id: user.id, active_tipidter_session_id: activeSessionId }, { onConflict: 'user_id' });
  // }
  return activeSessionId;
};

/**
 * [Telah Direfaktor untuk Supabase]
 * Menghapus sesi tertentu dari Supabase DB (hard delete) dengan validasi kepemilikan.
 */
export const deleteSession = async (sessionId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  console.log(`TIPIDTER: Attempting to delete session: ${sessionId}`);

  const { data: sessionToDelete, error: fetchError } = await supabase
    .from('sessions')
    .select('id, user_id, is_anonymous, agent_type') // Ambil field yang diperlukan untuk validasi
    .eq('id', sessionId)
    .single();

  if (fetchError || !sessionToDelete) {
    console.error('TIPIDTER: Error fetching session to delete or session not found:', fetchError);
    return false; // Sesi tidak ditemukan atau error
  }
  
  // Verifikasi agent_type sebelum menghapus
  if (sessionToDelete.agent_type !== 'tipidter-chat') {
    console.warn(`TIPIDTER: Attempted to delete a session with incorrect agent_type: ${sessionToDelete.agent_type}. Session ID: ${sessionId}`);
    return false; // Jangan hapus sesi milik agen lain
  }

  if (user) {
    // Pengguna terautentikasi
    // Hanya boleh menghapus sesi miliknya. Tidak boleh menghapus sesi anonim milik orang lain (jika skenario itu ada).
    // Sesi anonim yang dibuat oleh pengguna ini (user_id null saat pembuatan) tidak akan cocok di sini,
    // karena sessionToDelete.user_id akan null.
    if (sessionToDelete.user_id !== user.id) {
      console.error('TIPIDTER: Authenticated user attempting to delete a session not owned by them.');
      return false; // Tidak diizinkan
    }
    console.log('TIPIDTER: Authenticated user, session ownership validated for deletion.');
  } else {
    // Pengguna tidak terautentikasi
    // Seharusnya tidak bisa menghapus sesi apapun, termasuk sesi anonim.
    // Jika ada kebutuhan menghapus sesi anonim, itu harus dari mekanisme lain (misalnya admin, atau logic internal)
    // atau jika sesi anonim tersebut secara eksplisit "dimiliki" oleh ID klien anonim saat ini.
    // Untuk keamanan default, pengguna anonim tidak diizinkan menghapus.
    console.warn('TIPIDTER: Anonymous user attempting to delete a session. Operation not permitted.');
    return false; // Tidak diizinkan untuk pengguna anonim
  }

  // Lanjutkan dengan penghapusan
  const { error: deleteError } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (deleteError) {
    console.error('TIPIDTER: Error deleting session from Supabase:', deleteError);
    return false;
  }

  console.log(`TIPIDTER: Session ${sessionId} successfully deleted from Supabase.`);
  if (activeSessionId === sessionId) {
    activeSessionId = null; // Reset sesi aktif jika yang dihapus adalah yang aktif
  }
  
  // Tidak ada lagi userDoc.activeSession untuk diupdate seperti di Firebase
  // UI biasanya akan di-refresh dengan memanggil ulang getUserSessions setelah delete
  return true;
};

// Fungsi checkFirestoreConnection, mapDocumentToSessionInfo, dan mapDocumentToMessage telah dihapus.

// Memberikan tipe 'any' untuk parameter 'doc' sebagai placeholder
// Anda harus mengganti 'any' dengan tipe data Supabase yang sesuai
/*
const mapDocumentToSessionInfo = (doc: any) => ({
  id: doc.id,
  name: doc.data().title || 'Percakapan tanpa judul',
  date: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate().toLocaleDateString() : new Date().toLocaleDateString(),
  messageCount: doc.data().messageCount || 0
});

const mapDocumentToMessage = (doc: any) => ({
  id: doc.id,
  content: doc.data().content,
  type: doc.data().type,
  timestamp: doc.data().timestamp?.toDate(),
  userId: doc.data().userId
});
*/ 