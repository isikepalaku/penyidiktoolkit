/**
 * TIPIDTER AI Service
 * Service untuk menangani chat AI untuk bidang tindak pidana tertentu
 * Menggunakan backend API untuk manajemen session dan Firebase untuk persistensi data
 */

import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { auth, db } from '../firebase';
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

const API_KEY = import.meta.env.VITE_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const FETCH_TIMEOUT = 600000; // 10 minutes timeout - matching nginx server timeout
const API_BASE_URL = env.apiUrl || 'http://localhost:8000';

// Menyimpan sesi aktif untuk user saat ini
let activeSessionId: string | null = null;

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
 * Membuat atau mendapatkan sesi untuk user
 * Session ID digunakan oleh backend untuk mengelola konteks percakapan
 * dan disimpan di Firestore untuk persistensi
 */
export const initializeSession = async () => {
  // Cek apakah Firestore tersedia
  const firestoreAvailable = await checkFirestoreConnection().catch(() => false);
  if (!firestoreAvailable) {
    console.warn('Firestore not available, using local session mode');
    activeSessionId = `offline_${uuidv4()}`;
    return activeSessionId;
  }
  
  // Fallback untuk mode anonymous jika user belum login
  if (!auth.currentUser) {
    if (!activeSessionId) {
      activeSessionId = `anonymous_tipidter_${uuidv4()}`;
      console.log('TIPIDTER: Created new anonymous session ID:', activeSessionId);
    }
    return activeSessionId;
  }
  
  const userId = auth.currentUser.uid;
  
  if (!activeSessionId) {
    try {
      // Cek apakah ada sesi aktif di Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists() && userDoc.data().activeSession?.tipidter) {
        // Gunakan sesi yang sudah ada
        activeSessionId = userDoc.data().activeSession.tipidter;
        console.log('TIPIDTER: Menggunakan sesi yang sudah ada:', activeSessionId);
      } else {
        // Buat sesi baru
        const newSessionId = `tipidter_${uuidv4()}`;
        
        // Simpan di Firestore
        const sessionRef = doc(db, 'sessions', newSessionId);
        await setDoc(sessionRef, {
          userId,
          agentType: 'tipidter-chat',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          messageCount: 0,
          title: 'Percakapan baru tentang Tipidter' // Default title
        });
        
        // Update sesi aktif user
        await setDoc(userRef, { 
          activeSession: { tipidter: newSessionId } 
        }, { merge: true });
        
        activeSessionId = newSessionId;
        console.log('TIPIDTER: Membuat sesi baru:', activeSessionId);
      }
    } catch (error) {
      console.error('Error initializing Firebase session:', error);
      // Fallback to local session if Firebase fails
      activeSessionId = `fallback_tipidter_${uuidv4()}`;
      console.log('TIPIDTER: Created fallback session ID:', activeSessionId);
    }
  }
  
  return activeSessionId;
};

/**
 * Menghapus sesi aktif dan memulai percakapan baru
 */
export const clearChatHistory = async () => {
  // Reset sesi aktif
  const oldSessionId = activeSessionId;
  activeSessionId = null;
  
  // Update Firestore hanya jika user terautentikasi
  if (auth.currentUser) {
    try {
      // Hapus referensi sesi aktif di Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { 
        activeSession: { tipidter: null } 
      }, { merge: true });
      
      console.log('TIPIDTER: Sesi berhasil dihapus dari Firestore');
    } catch (error) {
      console.error('Error clearing chat history in Firestore:', error);
    }
  }
  
  console.log('TIPIDTER: Chat history cleared, old session:', oldSessionId);
};

/**
 * Mengirim pesan chat ke API dan menyimpan di Firestore
 */
export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  let retries = 0;

  // Inisialisasi atau dapatkan sesi
  const sessionId = await initializeSession();
  
  // Simpan pesan di Firestore jika user terautentikasi
  if (auth.currentUser && sessionId) {
    try {
      const userId = auth.currentUser.uid;
      const messagesRef = collection(db, 'sessions', sessionId, 'messages');
      const newMessageRef = doc(messagesRef);
      
      await setDoc(newMessageRef, {
        content: message,
        type: 'user',
        timestamp: Timestamp.now(),
        userId
      });
      
      // Perbarui timestamp sesi
      const sessionRef = doc(db, 'sessions', sessionId);
      await setDoc(sessionRef, { 
        updatedAt: Timestamp.now(),
        messageCount: increment(1)
      }, { merge: true });
      
      console.log('TIPIDTER: User message saved to Firestore');
    } catch (error) {
      console.error('Error saving message to Firestore:', error);
    }
  }
  
  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1} of ${MAX_RETRIES + 1}`);
      
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('agent_id', 'tipidter-chat');
      formData.append('stream', 'false');
      formData.append('monitor', 'false');
      formData.append('session_id', sessionId || `fallback_${uuidv4()}`);
      
      // Kirim Firebase UID jika user terautentikasi, jika tidak gunakan session ID
      const userId = auth.currentUser ? auth.currentUser.uid : (sessionId || `anonymous_${uuidv4()}`);
      formData.append('user_id', userId);

      console.log('Sending request with FormData:', {
        message: message.trim().substring(0, 50) + (message.length > 50 ? '...' : ''),
        agent_id: 'tipidter-chat',
        session_id: sessionId,
        user_id: userId,
      });

      const headers: HeadersInit = {
        'Accept': 'application/json',
      };
      
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formData
      };

      const url = `${API_BASE_URL}/v1/playground/agents/tipidter-chat/runs`;
      console.log('Sending request to:', url);

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT);
      
      requestOptions.signal = abortController.signal;
      const response = await fetch(url, requestOptions);
      
      clearTimeout(timeoutId);

      if (abortController.signal.aborted) {
        throw new Error('Request timed out after 10 minutes');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        if (response.status === 429) {
          throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
        }
        
        if (response.status >= 500 && retries < MAX_RETRIES) {
          retries++;
          await wait(RETRY_DELAY * retries);
          continue;
        }
        
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await parseResponse(response);
      console.log('Parsed response data:', data);
      
      const responseText = data.content || data.message || 'No response received';

      // Simpan respon AI di Firestore jika user terautentikasi
      if (auth.currentUser && sessionId) {
        try {
          const messagesRef = collection(db, 'sessions', sessionId, 'messages');
          const newResponseRef = doc(messagesRef);
          
          await setDoc(newResponseRef, {
            content: responseText,
            type: 'bot',
            timestamp: Timestamp.now(),
            userId: 'system',
            sourceDocuments: data.sourceDocuments || []
          });
          
          // Perbarui timestamp dan jumlah pesan sesi
          const sessionRef = doc(db, 'sessions', sessionId);
          
          // Buat objek update
          const updateData: Record<string, any> = {
            updatedAt: Timestamp.now(),
            messageCount: increment(1)
          };
          
          // Tambahkan title hanya jika ada nilainya
          if (data.title) {
            updateData.title = data.title;
          }
          
          // Update dokumen
          await setDoc(sessionRef, updateData, { merge: true });
          
          console.log('TIPIDTER: Bot response saved to Firestore');
        } catch (error) {
          console.error('Error saving response to Firestore:', error);
        }
      }

      return {
        text: responseText,
        sourceDocuments: data.sourceDocuments
      };

    } catch (error) {
      console.error('Error in sendChatMessage:', error);
      
      if (error instanceof TypeError && retries < MAX_RETRIES) {
        retries++;
        await wait(RETRY_DELAY * retries);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Failed after maximum retries');
};

/**
 * Mendapatkan semua sesi untuk user saat ini
 */
export const getUserSessions = async () => {
  if (!auth.currentUser) {
    throw new Error('User harus login terlebih dahulu');
  }
  
  try {
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef, 
      where('userId', '==', auth.currentUser.uid),
      where('agentType', '==', 'tipidter-chat'),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    throw new Error('Gagal mengambil riwayat percakapan');
  }
};

/**
 * Mendapatkan semua pesan untuk sesi tertentu
 */
export const getSessionMessages = async (sessionId: string) => {
  if (!auth.currentUser) {
    throw new Error('User harus login terlebih dahulu');
  }
  
  try {
    const messagesRef = collection(db, 'sessions', sessionId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching session messages:', error);
    throw new Error('Gagal mengambil pesan');
  }
};

/**
 * Mengalihkan ke sesi lain
 */
export const switchSession = async (sessionId: string) => {
  if (!auth.currentUser) {
    throw new Error('User harus login terlebih dahulu');
  }
  
  try {
    // Validasi bahwa sesi ini milik user
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists() || sessionDoc.data().userId !== auth.currentUser.uid) {
      throw new Error('Sesi tidak valid');
    }
    
    // Set sebagai sesi aktif
    activeSessionId = sessionId;
    
    // Update di Firestore
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, { 
      activeSession: { tipidter: sessionId } 
    }, { merge: true });
    
    console.log('TIPIDTER: Beralih ke sesi:', sessionId);
    
    // Kembalikan pesan dari sesi ini
    return getSessionMessages(sessionId);
  } catch (error) {
    console.error('Error switching session:', error);
    throw new Error('Gagal beralih sesi');
  }
};

/**
 * Menghapus sesi
 */
export const deleteSession = async (sessionId: string) => {
  if (!auth.currentUser) {
    throw new Error('User harus login terlebih dahulu');
  }
  
  try {
    // Validasi bahwa sesi ini milik user
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists() || sessionDoc.data().userId !== auth.currentUser.uid) {
      throw new Error('Sesi tidak valid');
    }
    
    // Jika ini sesi aktif, reset activeSessionId
    if (activeSessionId === sessionId) {
      activeSessionId = null;
      
      // Update di Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { 
        activeSession: { tipidter: null } 
      }, { merge: true });
    }
    
    // Tandai sesi sebagai dihapus (soft delete)
    await setDoc(sessionRef, { 
      deleted: true,
      deletedAt: Timestamp.now()
    }, { merge: true });
    
    console.log('TIPIDTER: Sesi dihapus:', sessionId);
    
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw new Error('Gagal menghapus sesi');
  }
};

// Cek apakah Firestore tersedia
export const checkFirestoreConnection = async (): Promise<boolean> => {
  try {
    // Coba akses dokumen dummy untuk memverifikasi koneksi
    const testRef = doc(db, '_connection_test', 'test');
    await setDoc(testRef, { timestamp: serverTimestamp() }, { merge: true });
    console.log('Firestore connection verified');
    return true;
  } catch (error) {
    console.error('Firestore connection error:', error);
    return false;
  }
}; 