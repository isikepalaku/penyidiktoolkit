import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Email reset password telah dikirim. Silakan periksa kotak masuk Anda.');
    } catch (error: any) {
      console.error('Forgot Password error:', error);
      setError(
        error.code === 'auth/user-not-found'
          ? 'Tidak ada pengguna yang terdaftar dengan email ini.'
          : error.code === 'auth/invalid-email'
          ? 'Format email tidak valid.'
          : 'Gagal mengirim email reset password. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-800 dark:via-gray-900 dark:to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
        <div className="flex justify-center">
          <img src="/logo.svg" alt="App Logo" className="h-12 w-auto" />
        </div>
        <div>
          <h2 className="mt-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Lupa Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Masukkan alamat email Anda di bawah ini untuk menerima link reset password.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Oops! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Sukses! </strong>
            <span className="block sm:inline">{message}</span>
          </div>
        )}
        
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm">
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
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-sm">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline">
              Kembali ke Halaman Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 