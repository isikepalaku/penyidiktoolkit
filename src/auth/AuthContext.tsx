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
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';

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
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      console.log("User berhasil login dengan Google:", result.user);
      return result.user;
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