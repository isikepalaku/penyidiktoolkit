import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';
import { isIOS, isSafari } from '../utils/browserDetect';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<User | null>;
  logIn: (email: string, password: string) => Promise<User | null>;
  logOut: () => Promise<void>;
  signInWithGoogle: () => Promise<User | null>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  return useContext(AuthContext) as AuthContextType;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function signUp(email: string, password: string, displayName?: string) {
    try {
      // Pastikan persistence diatur dengan baik
      await setPersistence(auth, browserLocalPersistence);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile jika displayName disediakan
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      console.log("User berhasil mendaftar:", userCredential.user);
      return userCredential.user;
    } catch (error: any) {
      console.error("Error saat mendaftar:", error.message);
      throw error;
    }
  }

  async function logIn(email: string, password: string) {
    try {
      // Pastikan persistence diatur dengan baik
      await setPersistence(auth, browserLocalPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("User berhasil login:", userCredential.user);
      return userCredential.user;
    } catch (error: any) {
      console.error("Error saat login:", error.message);
      throw error;
    }
  }

  async function signInWithGoogle() {
    try {
      // Pastikan persistence diatur dengan baik
      await setPersistence(auth, browserLocalPersistence);
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Gunakan redirect untuk Safari/iOS dan popup untuk browser lainnya
      if (isIOS() || isSafari()) {
        console.log("Menggunakan signInWithRedirect untuk Safari/iOS");
        await signInWithRedirect(auth, provider);
        return null;
      } else {
        const result = await signInWithPopup(auth, provider);
        console.log("User berhasil login dengan Google (popup):", result.user);
        return result.user;
      }
    } catch (error: any) {
      console.error("Error saat login dengan Google:", error);
      throw error;
    }
  }

  async function logOut() {
    try {
      await signOut(auth);
      console.log("User berhasil logout");
    } catch (error: any) {
      console.error("Error saat logout:", error.message);
      throw error;
    }
  }

  async function resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("Email reset password berhasil dikirim ke:", email);
    } catch (error: any) {
      console.error("Error saat mengirim email reset password:", error.message);
      throw error;
    }
  }

  useEffect(() => {
    // Atur persistence saat inisialisasi
    setPersistence(auth, browserLocalPersistence)
      .catch(error => {
        console.error("Error saat mengatur persistence:", error);
      });
    
    // Cek hasil redirect jika ada
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          console.log("User berhasil login dengan Google (redirect):", result.user);
          setCurrentUser(result.user);
        }
      })
      .catch((error) => {
        console.error("Error saat mendapatkan hasil redirect:", error);
      });
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription saat komponen unmount
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    signUp,
    logIn,
    logOut,
    signInWithGoogle,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 