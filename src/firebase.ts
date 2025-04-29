import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, logEvent } from "firebase/analytics";

// Deteksi environment
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCMvKkbh4MvoRJzc9oVxKWdE-WUwTw4knc",
  authDomain: "reserse-7b7bc.firebaseapp.com",
  projectId: "reserse-7b7bc",
  storageBucket: "reserse-7b7bc.firebasestorage.app",
  messagingSenderId: "201560378144",
  appId: "1:201560378144:web:5a9aeaae20fe33c5e22545",
  measurementId: "G-PFBE72WFDK"
};

// Inisialisasi Firebase dengan nama instance unik jika di development
const instanceName = isLocalhost ? `app-${new Date().getTime()}` : undefined;
const app = initializeApp(firebaseConfig, instanceName);

// Inisialisasi Firebase Authentication
export const auth = getAuth(app);

// Inisialisasi Firebase Analytics hanya jika bukan di localhost
export const analytics = !isLocalhost ? getAnalytics(app) : null;

// Fungsi untuk log event analytics dengan pengecekan
export const logAnalyticsEvent = (eventName: string, eventParams: Record<string, any> = {}) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
    console.log(`Analytics event logged: ${eventName}`, eventParams);
  } else {
    console.log(`Analytics disabled in development: ${eventName}`, eventParams);
  }
};

// Ubah persistensi ke session untuk menghindari cache jangka panjang di development
if (isLocalhost) {
  setPersistence(auth, browserSessionPersistence)
    .then(() => {
      console.log("Firebase auth persistence set to browserSessionPersistence");
    })
    .catch((error) => {
      console.error("Error setting persistence:", error);
    });
}

// Inisialisasi Firestore
export const db = getFirestore(app);

// Fungsi untuk membersihkan cache autentikasi
export function resetAuthCache() {
  // Hapus data IndexedDB Firebase
  const dbName = "firebaseLocalStorageDb";
  const request = indexedDB.deleteDatabase(dbName);
  
  request.onsuccess = function() {
    console.log("Berhasil menghapus database IndexedDB Firebase");
    
    // Hapus juga semua localStorage terkait Firebase
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("firebase:") || key.includes("firebaseui")) {
        localStorage.removeItem(key);
      }
    });
    
    // Hapus semua sessionStorage terkait Firebase
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith("firebase:") || key.includes("firebaseui")) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Refresh halaman setelah database dihapus
    window.location.reload();
  };
  
  request.onerror = function(event) {
    console.error("Error menghapus database:", event);
  };
}

export default app; 