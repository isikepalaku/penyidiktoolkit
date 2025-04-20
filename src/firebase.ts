import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Deteksi environment
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Gunakan secara eksplisit domain Firebase untuk autentikasi
  authDomain: "reserse-7b7bc.firebaseapp.com", // Ganti dari VITE_FIREBASE_AUTH_DOMAIN untuk mengatasi masalah cache
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inisialisasi Firebase dengan nama instance unik jika di development
const instanceName = isLocalhost ? `app-${new Date().getTime()}` : undefined;
const app = initializeApp(firebaseConfig, instanceName);

// Inisialisasi Firebase Authentication
export const auth = getAuth(app);

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