import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient'; // Mengimpor supabase client

interface AuthContextType {
  currentUser: User | null;
  session: Session | null; // Supabase menggunakan session
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ user: User | null, error: any | null }>;
  logIn: (email: string, password: string) => Promise<{ user: User | null, error: any | null }>;
  logOut: () => Promise<{ error: any | null }>;
  signInWithGoogle: () => Promise<{ user: User | null, session: Session | null, error: any | null }>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
  // Fungsi untuk pengguna saat ini mengubah status registrasinya sendiri
  updateMyRegistrationStatus: (newStatus: string) => Promise<{ user: User | null, error: any | null }>;
}

// Inisialisasi dengan nilai default untuk menghindari null
const defaultAuthContext: AuthContextType = {
  currentUser: null,
  session: null,
  loading: true,
  signUp: async () => ({ user: null, error: new Error('Auth context not initialized') }),
  logIn: async () => ({ user: null, error: new Error('Auth context not initialized') }),
  logOut: async () => ({ error: new Error('Auth context not initialized') }),
  signInWithGoogle: async () => ({ user: null, session: null, error: new Error('Auth context not initialized') }),
  resetPassword: async () => ({ error: new Error('Auth context not initialized') }),
  updateMyRegistrationStatus: async () => ({ user: null, error: new Error('Auth context not initialized') }),
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    console.error('useAuth harus digunakan di dalam AuthProvider');
    return defaultAuthContext;
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Reset loading state dengan force after timeout untuk mencegah infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log("TIPIDTER AUTH: Force ending loading state after timeout");
        setLoading(false);
      }
    }, 5000); // 5 detik timeout

    return () => clearTimeout(timer);
  }, [loading]);

  async function signUp(email: string, password: string, displayName?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName, // Simpan displayName di user_metadata
            registration_status: 'pending' // Tambahkan status registrasi awal
            // Anda bisa menambahkan metadata lain di sini
          },
        },
      });

      if (error) {
        console.error("Error saat mendaftar (Supabase):", error.message);
        return { user: null, error };
      }
      
      console.log("User berhasil mendaftar (Supabase):", data.user);
      return { user: data.user, error: null };
    } catch (error: any) {
      console.error("Error tidak terduga saat mendaftar (Supabase):", error.message);
      return { user: null, error };
    }
  }

  async function logIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Error saat login (Supabase):", error.message);
        return { user: null, error };
      }
      
      console.log("User berhasil login (Supabase):", data.user);
      return { user: data.user, error: null };
    } catch (error: any) {
      console.error("Error tidak terduga saat login (Supabase):", error.message);
      return { user: null, error };
    }
  }

  async function signInWithGoogle() {
    try {
      console.log("TIPIDTER AUTH: Starting Google OAuth sign in process");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            // Parameter tambahan untuk Google Auth
            access_type: 'offline',
            prompt: 'consent'
          },
          // Redirect ke rute khusus setelah login
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error("TIPIDTER AUTH: Error saat login dengan Google (Supabase):", error.message);
        return { user: null, session: null, error };
      }
      
      console.log("TIPIDTER AUTH: Proses login dengan Google dimulai (Supabase). URL:", data?.url);
      console.log("TIPIDTER AUTH: Menunggu redirect...");
      return { user: null, session: null, error: null }; 
    } catch (error: any) {
      console.error("TIPIDTER AUTH: Error tidak terduga saat login dengan Google (Supabase):", error.message);
      return { user: null, session: null, error };
    }
  }

  async function logOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error saat logout (Supabase):", error.message);
        return { error };
      }
      console.log("User berhasil logout (Supabase)");
      return { error: null };
    } catch (error: any) {
      console.error("Error tidak terduga saat logout (Supabase):", error.message);
      return { error };
    }
  }

  async function resetPassword(email: string) {
    try {
      const redirectUrl = window.location.origin + '/update-password'; 
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("Error saat mengirim email reset password (Supabase):", error.message);
        return { error };
      }
      
      console.log("Email reset password berhasil dikirim ke (Supabase):", email, data);
      return { error: null };
    } catch (error: any) {
      console.error("Error tidak terduga saat mengirim email reset password (Supabase):", error.message);
      return { error };
    }
  }

  // Fungsi untuk PENGGUNA SAAT INI mengubah status registrasinya sendiri.
  // PENTING: Untuk seorang ADMIN mengubah status registrasi PENGGUNA LAIN,
  // operasi tersebut HARUS dilakukan melalui backend yang aman (misalnya, Edge Function atau API route)
  // yang menggunakan Supabase Admin Client dengan service_role key untuk memanggil
  // supabase.auth.admin.updateUserById(targetUserId, { user_metadata: { registration_status: newStatus } })
  async function updateMyRegistrationStatus(newStatus: string) {
    if (!currentUser) {
      console.error("TIPIDTER AUTH: Cannot update registration status, no user is currently logged in.");
      return { user: null, error: { message: "No user logged in." } };
    }
    try {
      console.log(`TIPIDTER AUTH: Attempting to update current user (${currentUser.id}) registration status to ${newStatus}`);
      const { data, error } = await supabase.auth.updateUser({
        data: { registration_status: newStatus } // Ini akan merge dengan user_metadata yang ada
      });

      if (error) {
        console.error("TIPIDTER AUTH: Error updating current user's registration status (Supabase):", error.message);
        return { user: null, error };
      }
      
      console.log("TIPIDTER AUTH: Current user's registration status updated (Supabase). User data:", data.user);
      setCurrentUser(data.user);
      return { user: data.user, error: null };
    } catch (error: any) {
      console.error("TIPIDTER AUTH: Unexpected error updating current user's registration status (Supabase):", error.message);
      return { user: null, error };
    }
  }
  
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    console.log("TIPIDTER AUTH: Initializing auth context");
    
    // Jangan gunakan try-catch tingkat tinggi, menggunakan .catch pada promise sebagai gantinya
    // untuk memastikan state diupdate dengan benar

    // Dapatkan sesi awal
    const sessionPromise = supabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log("TIPIDTER AUTH: Initial session", session ? "exists" : "null");
        
        if (session) {
          console.log("TIPIDTER AUTH: User logged in:", session.user.email);
          console.log("TIPIDTER AUTH: Registration status:", session.user.user_metadata?.registration_status || "undefined");
        }
        
        setSession(session);
        setCurrentUser(session?.user ?? null);
      })
      .catch(error => {
        console.error("TIPIDTER AUTH: Error getting initial session:", error);
        setError(error instanceof Error ? error : new Error('Unknown error during session fetch'));
      })
      .finally(() => {
        console.log("TIPIDTER AUTH: Finished get session call");
        // Tidak mengubah loading state di sini, akan diubah setelah pasang listener
      });

    // Pasang listener untuk perubahan state autentikasi
    let authListener: { data?: { subscription: { unsubscribe: () => void } } } = {};
    
    // Jalankan langsung tanpa menyimpan Promise ke variabel
    sessionPromise.then(() => {
      console.log("TIPIDTER AUTH: Setting up auth state listener");
      
      try {
        const listener = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('TIPIDTER AUTH: Auth event:', event, session ? "session exists" : "no session");
            
            // Rest of the auth state change handler...
            // Tampilkan detail user jika ada session
            if (session?.user) {
              console.log("TIPIDTER AUTH: User data:", {
                id: session.user.id,
                email: session.user.email,
                provider: session.user.app_metadata?.provider,
                registration_status: session.user.user_metadata?.registration_status
              });
            }
            
            // Saat signin dengan OAuth provider seperti Google selesai,
            // cek apakah ini adalah user baru dan perlu status pending
            if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider !== 'email' && session !== null) {
              // Cek jika user belum memiliki status registrasi
              if (!session.user.user_metadata?.registration_status) {
                console.log('TIPIDTER AUTH: OAuth user logged in, setting registration_status to pending...');
                try {
                  // Update user metadata dengan status pending
                  const { data, error } = await supabase.auth.updateUser({
                    data: { 
                      registration_status: 'pending',
                      // Juga simpan displayName jika tersedia dari OAuth provider
                      ...(session.user.user_metadata?.name ? { full_name: session.user.user_metadata.name } : {})
                    }
                  });
                  
                  if (error) {
                    console.error("TIPIDTER AUTH: Error setting registration status for OAuth user:", error);
                  } else {
                    console.log("TIPIDTER AUTH: OAuth user registration status set to pending:", data.user);
                    // Update state dengan user yang sudah diperbarui
                    setCurrentUser(data.user);
                    if (session) {
                      // Buat objek session baru dengan user yang diperbarui
                      const updatedSession: Session = {
                        ...session,
                        user: data.user
                      };
                      setSession(updatedSession);
                    }
                    return; // Keluar dari function karena state sudah diupdate
                  }
                } catch (err) {
                  console.error("TIPIDTER AUTH: Unexpected error setting OAuth user status:", err);
                }
              }
            }
            
            setSession(session);
            setCurrentUser(session?.user ?? null);
          }
        );
        
        authListener = listener;
        return listener;
      } catch (listenerError) {
        console.error("TIPIDTER AUTH: Error setting up auth listener", listenerError);
        setError(listenerError instanceof Error ? listenerError : new Error('Error setting up auth listener'));
        throw listenerError; // Rethrow untuk .finally handler
      }
    })
    .catch(error => {
      console.error("TIPIDTER AUTH: Fatal error during auth setup:", error);
    })
    .finally(() => {
      console.log("TIPIDTER AUTH: Complete auth initialization");
      setLoading(false); // Sangat penting: selalu akhiri loading state
    });

    // Cleanup function
    return () => {
      console.log("TIPIDTER AUTH: Cleaning up auth listeners");
      if (authListener?.data?.subscription) {
        try {
          authListener.data.subscription.unsubscribe();
        } catch (err) {
          console.error("TIPIDTER AUTH: Error unsubscribing:", err);
        }
      }
    };
  }, []);

  // Tambahkan fallback rendering yang muncul jika error terjadi
  if (error) {
    console.error("TIPIDTER AUTH: Rendering error fallback UI due to:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Kesalahan Autentikasi</h2>
          <p className="text-gray-700 mb-4">
            Terjadi masalah saat menginisialisasi autentikasi. Silakan refresh halaman.
          </p>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-48 mb-4">
            {error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Halaman
          </button>
        </div>
      </div>
    );
  }

  const value = {
    currentUser,
    session,
    loading,
    signUp,
    logIn,
    logOut,
    signInWithGoogle,
    resetPassword,
    updateMyRegistrationStatus
  };

  // Tentatif render fallback content sederhana selama loading
  if (loading) {
    console.log("TIPIDTER AUTH: Rendering loading fallback UI");
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-600">Memuat sesi pengguna...</p>
        {/* Sembunyikan children selama loading */}
      </div>
    );
  }

  console.log("TIPIDTER AUTH: Rendering actual content");
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 