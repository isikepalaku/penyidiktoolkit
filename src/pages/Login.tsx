import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import GoogleIcon from '../components/icons/GoogleIcon';

// Error boundary component sederhana
function ErrorFallback({ error, resetError }: { error: Error, resetError: () => void }) {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong className="font-bold">Terjadi kesalahan: </strong>
      <span className="block sm:inline">{error.message}</span>
      <button
        onClick={resetError}
        className="mt-2 bg-red-200 hover:bg-red-300 text-red-800 py-1 px-3 rounded text-xs"
      >
        Coba Lagi
      </button>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [renderKey, setRenderKey] = useState(0); // Key untuk force re-render
  const isMounted = useRef(true);
  const navigate = useNavigate();
  const { logIn, signInWithGoogle, currentUser } = useAuth();

  // Fungsi untuk reset render errors
  const resetRenderError = useCallback(() => {
    setRenderError(null);
    setRenderKey(prev => prev + 1);
  }, []);

  // Ensure isMounted is set appropriately
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Safely update state only if component is still mounted (fixed TypeScript issue)
  const safeSetStateString = useCallback((setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    if (isMounted.current) {
      setter(value);
    }
  }, []);

  const safeSetStateBoolean = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>, value: boolean) => {
    if (isMounted.current) {
      setter(value);
    }
  }, []);

  // Cek error dari URL hash (Google login)
  useEffect(() => {
    try {
      // Lebih aman menggunakan fungsi setter untuk mengakses state terbaru
      const urlParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      const authError = urlParams.get('error_description') || urlParams.get('error');
      
      if (authError && isMounted.current) {
        safeSetStateString(setError, `Gagal login dengan Google: ${authError}`);
        // Gunakan history API dengan lebih aman
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (err) {
      console.error("Error parsing URL hash:", err);
    }
  }, [safeSetStateString]);

  // Redirect jika user sudah login
  useEffect(() => {
    let navigationTimeout: NodeJS.Timeout;
    
    if (currentUser && isMounted.current) {
      // Gunakan timeout untuk memastikan UI dirender dengan benar sebelum navigasi
      navigationTimeout = setTimeout(() => {
        if (isMounted.current) {
          navigate('/');
        }
      }, 100);
    }
    
    return () => {
      if (navigationTimeout) clearTimeout(navigationTimeout);
    };
  }, [currentUser, navigate]);

  // Form submission handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return; // Hindari multiple submit
    
    try {
      safeSetStateString(setError, '');
      safeSetStateBoolean(setLoading, true);
      
      const { user, error: loginError } = await logIn(email, password);
      
      if (!isMounted.current) return; // Stop jika component unmounted
      
      if (loginError) {
        console.error('Login error (Supabase):', loginError);
        safeSetStateString(setError, loginError.message || 'Email atau password salah. Silakan coba lagi.');
      } else if (user) {
        // Navigasi dilakukan di useEffect saat currentUser berubah
        console.log('Login successful, updating state...');
      } else {
        safeSetStateString(setError, 'Terjadi kesalahan saat login. Silakan coba lagi.');
      }
    } catch (error: unknown) {
      console.error('Unexpected Login error:', error);
      if (isMounted.current) {
        safeSetStateString(setError, 'Gagal masuk. Terjadi kesalahan tak terduga.');
      }
    } finally {
      if (isMounted.current) {
        safeSetStateBoolean(setLoading, false);
      }
    }
  }, [logIn, email, password, loading, safeSetStateString, safeSetStateBoolean]);

  // Google sign in
  const handleGoogleSignIn = useCallback(async () => {
    if (googleLoading) return;
    
    try {
      safeSetStateString(setError, '');
      safeSetStateBoolean(setGoogleLoading, true);
      
      const { error: googleError } = await signInWithGoogle();
      
      if (!isMounted.current) return;
      
      if (googleError) {
        console.error('Google sign-in error (Supabase):', googleError);
        safeSetStateString(setError, googleError.message || 'Gagal masuk dengan Google. Silakan coba lagi.');
      }
      // Jika sukses, akan ada redirect, jadi tidak perlu melakukan apa-apa
    } catch (error: unknown) {
      console.error('Unexpected Google sign-in error:', error);
      if (isMounted.current) {
        safeSetStateString(setError, 'Gagal masuk dengan Google. Terjadi kesalahan tak terduga.');
      }
    } finally {
      if (isMounted.current) {
        safeSetStateBoolean(setGoogleLoading, false);
      }
    }
  }, [googleLoading, signInWithGoogle, safeSetStateString, safeSetStateBoolean]);

  // Render dengan error boundary
  try {
    return (
      <div className="min-h-screen flex flex-col md:flex-row" key={renderKey}>
        {/* Left side - Login form */}
        <div className="w-full md:w-1/2 flex flex-col min-h-screen bg-white dark:bg-gray-800 p-8 z-10">
          <div className="flex items-center mb-10">
            <img src="/reserseid.svg" alt="App Logo" className="h-10 w-auto mr-2" />
            <span className="text-xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: '"Poppins", sans-serif' }}>PenyidikToolkit</span>
          </div>
          
          <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3" style={{ fontFamily: '"Playfair Display", serif', letterSpacing: '-0.5px' }}>
                Masuk ke akun Anda
              </h1>
              <p className="text-gray-600 dark:text-gray-400" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300 }}>
                Belum punya akun?{' '}
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline">
                  Daftar disini
                </Link>
              </p>
            </div>
            
            {renderError && (
              <ErrorFallback error={renderError} resetError={resetRenderError} />
            )}
            
            {error && !renderError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert" style={{ fontFamily: '"Poppins", sans-serif' }}>
                <strong className="font-bold">Oops! </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}
              >
                <GoogleIcon className="h-5 w-5 mr-2" />
                {googleLoading ? 'Memproses...' : 'Masuk dengan Google'}
              </button>
            </div>
            
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <div className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300 }}>
                  atau masuk dengan email
                </div>
              </div>
            </div>
            
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500 }}>
                    Email
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    placeholder="Alamat email"
                    disabled={loading || googleLoading}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500 }}>
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    placeholder="Password"
                    disabled={loading || googleLoading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                    disabled={loading || googleLoading}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300 }}>
                    Ingat saya
                  </label>
                </div>

                <div className="text-sm">
                  <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300 }}>
                    Lupa password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}
                >
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>
              </div>
            </form>
          </div>
          
          <div className="mt-auto pt-6">
            <p className="text-center text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300 }}>
              &copy; {new Date().getFullYear()} PenyidikToolkit. Login diperlukan untuk mencegah akses tidak sah.
            </p>
          </div>
        </div>
        
        {/* Right side - Background image */}
        <div 
          className="w-full md:w-1/2 bg-cover bg-center hidden md:block" 
          style={{ 
            backgroundImage: 'url(/img/bg.jpg)'
          }}
        >
          <div className="w-full h-full flex items-center justify-center bg-black bg-opacity-50 p-8">
            <div className="text-center text-white max-w-md">
              <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: '"Playfair Display", serif', letterSpacing: '-0.5px' }}>Reserse Ai Toolkit</h2>
              <p className="text-lg" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300, letterSpacing: '0.3px' }}>Asisten investigasi virtual dan otomatisasi produk penyelidikan.</p>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error("Render error in Login component:", err);
    setRenderError(err instanceof Error ? err : new Error("Terjadi kesalahan rendering"));
    
    // Fallback UI jika terjadi error saat render
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-4">Kesalahan Aplikasi</h2>
          <p className="mb-4">Terjadi kesalahan saat menampilkan halaman login.</p>
          <button
            onClick={resetRenderError}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }
} 