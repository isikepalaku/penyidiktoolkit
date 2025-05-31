import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import GoogleIcon from '../components/icons/GoogleIcon';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const authError = urlParams.get('error_description') || urlParams.get('error');
    
    if (authError) {
      setError(`Gagal daftar dengan Google: ${authError}`);
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError('Password tidak cocok');
    }
    
    if (password.length < 6) {
      return setError('Password harus minimal 6 karakter');
    }
    
    try {
      setError('');
      setLoading(true);
      const { user, error: signUpError } = await signUp(email, password, displayName);
      
      if (signUpError) {
        console.error('Register error (Supabase):', signUpError);
        setError(signUpError.message || 'Gagal membuat akun. Silakan coba lagi.');
      } else if (user) {
        navigate('/');
      } else {
        setError('Pendaftaran berhasil! Silakan cek email Anda untuk melanjutkan.');
        setDisplayName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error: unknown) {
      console.error('Unexpected registration error:', error);
      setError('Pendaftaran gagal. Terjadi kesalahan yang tidak terduga.');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setError('');
      setGoogleLoading(true);
      const { error: googleError } = await signInWithGoogle();
      
      if (googleError) {
        console.error('Google sign-in error (Supabase) for Register:', googleError);
        setError(googleError.message || 'Gagal mendaftar dengan Google. Silakan coba lagi.');
        setGoogleLoading(false);
      }
    } catch (error: unknown) {
      console.error('Unexpected Google sign-in error:', error);
      setError('Pendaftaran dengan Google gagal. Terjadi kesalahan tak terduga.');
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Registration form */}
      <div className="w-full md:w-1/2 flex flex-col min-h-screen bg-white dark:bg-gray-800 p-8 z-10">
        <div className="flex items-center mb-10">
          <img src="/reserseid.svg" alt="App Logo" className="h-10 w-auto mr-2" />
          <span className="text-xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: '"Poppins", sans-serif' }}>PenyidikToolkit</span>
        </div>
        
        <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3" style={{ fontFamily: '"Playfair Display", serif', letterSpacing: '-0.5px' }}>
              Buat akun baru
            </h1>
            <p className="text-gray-600 dark:text-gray-400" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300 }}>
              Sudah punya akun?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline">
                Masuk disini
              </Link>
            </p>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert" style={{ fontFamily: '"Poppins", sans-serif' }}>
              <strong className="font-bold">Oops! </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}
            >
              <GoogleIcon className="h-5 w-5 mr-2" />
              {googleLoading ? 'Memproses...' : 'Daftar dengan Google'}
            </button>
          </div>
          
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300 }}>
                atau daftar dengan email
              </span>
            </div>
          </div>
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500 }}>
                  Nama Pengguna
                </label>
                <input
                  id="display-name"
                  name="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Nama Pengguna"
                />
              </div>
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Password (minimal 6 karakter)"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500 }}>
                  Konfirmasi Password
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Konfirmasi password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}
              >
                {loading ? 'Memproses...' : 'Daftar'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-auto pt-6">
          <p className="text-center text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300 }}>
            © {new Date().getFullYear()} PenyidikToolkit. Registrasi diperlukan untuk mencegah akses tidak sah.
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
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: '"Playfair Display", serif', letterSpacing: '-0.5px' }}>Buat Akun</h2>
            <p className="text-lg" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300, letterSpacing: '0.3px' }}>Asisten investigasi virtual dan otomatisasi produk penyelidikan.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 