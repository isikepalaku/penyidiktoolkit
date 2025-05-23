import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

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
  const safeSetState = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
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
        safeSetState(setError, `Gagal login dengan Google: ${authError}`);
        // Gunakan history API dengan lebih aman
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (err) {
      console.error("Error parsing URL hash:", err);
    }
  }, [safeSetState]);

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
      safeSetState(setError, '');
      safeSetState(setLoading, true);
      
      const { user, error: loginError } = await logIn(email, password);
      
      if (!isMounted.current) return; // Stop jika component unmounted
      
      if (loginError) {
        console.error('Login error (Supabase):', loginError);
        safeSetState(setError, loginError.message || 'Email atau password salah. Silakan coba lagi.');
      } else if (user) {
        // Navigasi dilakukan di useEffect saat currentUser berubah
        console.log('Login successful, updating state...');
      } else {
        safeSetState(setError, 'Terjadi kesalahan saat login. Silakan coba lagi.');
      }
    } catch (error: any) {
      console.error('Unexpected Login error:', error);
      if (isMounted.current) {
        safeSetState(setError, 'Gagal masuk. Terjadi kesalahan tak terduga.');
      }
    } finally {
      if (isMounted.current) {
        safeSetState(setLoading, false);
      }
    }
  }, [logIn, email, password, loading, safeSetState]);

  // Google sign in
  const handleGoogleSignIn = useCallback(async () => {
    if (googleLoading) return;
    
    try {
      safeSetState(setError, '');
      safeSetState(setGoogleLoading, true);
      
      const { error: googleError } = await signInWithGoogle();
      
      if (!isMounted.current) return;
      
      if (googleError) {
        console.error('Google sign-in error (Supabase):', googleError);
        safeSetState(setError, googleError.message || 'Gagal masuk dengan Google. Silakan coba lagi.');
      }
      // Jika sukses, akan ada redirect, jadi tidak perlu melakukan apa-apa
    } catch (error: any) {
      console.error('Unexpected Google sign-in error:', error);
      if (isMounted.current) {
        safeSetState(setError, 'Gagal masuk dengan Google. Terjadi kesalahan tak terduga.');
      }
    } finally {
      if (isMounted.current) {
        safeSetState(setGoogleLoading, false);
      }
    }
  }, [googleLoading, signInWithGoogle, safeSetState]);

  // Render dengan error boundary
  try {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-800 dark:via-gray-900 dark:to-black py-12 px-4 sm:px-6 lg:px-8" key={renderKey}>
        <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
          <div className="flex justify-center">
            <img src="/logo.svg" alt="App Logo" className="h-12 w-auto" />
          </div>
          <div>
            <h2 className="mt-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
              Masuk ke akun Anda
            </h2>
          </div>
          
          {renderError && (
            <ErrorFallback error={renderError} resetError={resetRenderError} />
          )}
          
          {error && !renderError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Oops! </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Alamat Email
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
                <label htmlFor="password" className="sr-only">
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
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Ingat saya
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline">
                  Lupa password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </div>
          </form>
          
          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Atau masuk dengan
              </span>
            </div>
          </div>
          
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" width="24" height="24">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
              {googleLoading ? 'Memproses...' : 'Masuk dengan Google'}
            </button>
          </div>

          <div className="mt-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
            <p className="text-center text-xs text-gray-600 dark:text-gray-300">
              Login diperlukan untuk mencegah akses tidak sah dan membatasi beban pada server kami, bukan untuk mengumpulkan data pribadi Anda.
            </p>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Belum punya akun?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline">
                Daftar disini
              </Link>
            </p>
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