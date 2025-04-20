import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Konfigurasi Firebase - ganti dengan nilai dari Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Log config sebelum inisialisasi (tanpa menampilkan apiKey di konsol)
console.log('Firebase config:', {
  ...firebaseConfig, 
  apiKey: firebaseConfig.apiKey ? '[REDACTED]' : undefined
});

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Inisialisasi Firebase Authentication dengan opsi kustom
const auth = getAuth(app);
auth.useDeviceLanguage(); // Gunakan bahasa perangkat

// Inisialisasi Firestore
const db = getFirestore(app);

// Cek jika kita dalam mode development, gunakan emulator
if (import.meta.env.DEV) {
  const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
  if (useEmulator) {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Using Firebase emulators for local development');
  }
}

export { auth, db }; 