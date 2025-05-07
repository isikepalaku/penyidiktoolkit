import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { trackAuth, ANALYTICS_EVENTS } from '../services/analytics';
import { isIOS, isSafari } from '../utils/browserDetect';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigate = useNavigate();
  const { logIn, signInWithGoogle } = useAuth();

  // Cek jika pengguna baru kembali dari redirect Google
  useEffect(() => {
    // Parameter URL yang menunjukkan error dari redirect
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('error');
    
    if (authError) {
      setError('Gagal login dengan Google. Silakan coba lagi atau gunakan login manual.');
    }
    
    // Handle proses login setelah redirect (jika ada)
    if (urlParams.has('googleRedirect')) {
      setIsRedirecting(false);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await logIn(email, password);
      
      // Track successful login
      trackAuth(ANALYTICS_EVENTS.LOGIN, 'email');
      
      navigate('/'); // Redirect ke homepage setelah login
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Track login error
      trackAuth(ANALYTICS_EVENTS.LOGIN, 'email', { 
        success: false, 
        error_code: error.code 
      });
      
      setError(
        error.code === 'auth/invalid-credential'
          ? 'Email atau password salah'
          : error.code === 'auth/too-many-requests'
          ? 'Terlalu banyak percobaan gagal. Silakan coba lagi nanti'
          : error.code === 'auth/network-request-failed'
          ? 'Kesalahan jaringan. Periksa koneksi internet Anda'
          : 'Gagal masuk. Silakan coba lagi'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setError('');
      setGoogleLoading(true);
      
      // Jika pada Safari/iOS, tampilkan indikator redirect
      if (isIOS() || isSafari()) {
        setIsRedirecting(true);
      }
      
      await signInWithGoogle();
      
      // Track successful Google login
      trackAuth(ANALYTICS_EVENTS.LOGIN, 'google');
      
      // Untuk browser non-Safari, redirect langsung
      if (!(isIOS() || isSafari())) {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      setIsRedirecting(false);
      
      // Track Google login error
      trackAuth(ANALYTICS_EVENTS.LOGIN, 'google', { 
        success: false, 
        error_code: error.code 
      });
      
      setError(
        error.code === 'auth/popup-closed-by-user'
          ? 'Login dibatalkan'
          : error.code === 'auth/cancelled-popup-request'
          ? 'Permintaan popup dibatalkan'
          : error.code === 'auth/network-request-failed'
          ? 'Kesalahan jaringan. Periksa koneksi internet Anda'
          : error.code === 'auth/popup-blocked'
          ? 'Browser memblokir popup. Silakan izinkan popup atau gunakan login email'
          : 'Gagal masuk dengan Google. Silakan coba lagi'
      );
    } finally {
      if (!(isIOS() || isSafari())) {
        setGoogleLoading(false);
      }
    }
  }

  // Content untuk status "sedang dialihkan" pada Safari/iOS
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-800 dark:via-gray-900 dark:to-black py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mengalihkan ke Google</h2>
          <p className="text-gray-600 dark:text-gray-300">Harap tunggu, Anda sedang dialihkan ke halaman login Google...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Jika Anda tidak dialihkan dalam beberapa detik, <button onClick={() => setIsRedirecting(false)} className="text-blue-500 hover:underline">klik disini</button> untuk kembali.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-800 dark:via-gray-900 dark:to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
        <div className="flex justify-center">
          <img src="/logo.svg" alt="App Logo" className="h-12 w-auto" />
        </div>
        <div>
          <h2 className="mt-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Masuk ke akun Anda
          </h2>
        </div>
        
        {error && (
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
              disabled={loading}
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
            disabled={googleLoading}
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

        {/* Disclaimer */}
        <div className="mt-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
          <p className="text-center text-xs text-gray-600 dark:text-gray-300">
            Login diperlukan untuk mencegah akses tidak sah dan membatasi beban pada server kami, bukan untuk mengumpulkan data pribadi Anda.
          </p>
        </div>
        
        {/* Browser compatibility warning for Safari/iOS */}
        {(isIOS() || isSafari()) && (
          <div className="mt-2 bg-yellow-50 dark:bg-yellow-900 p-3 rounded-md">
            <p className="text-center text-xs text-yellow-700 dark:text-yellow-300">
              Jika Anda mengalami masalah login di browser Safari, coba gunakan Chrome atau browser lain.
            </p>
          </div>
        )}
        
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
} 