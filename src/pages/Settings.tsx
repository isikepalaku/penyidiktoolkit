import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../supabaseClient';

export default function Settings() {
  const { currentUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    if (currentUser?.email_confirmed_at) {
      setVerificationSent(false);
    }
  }, [currentUser?.email_confirmed_at]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Password baru tidak cocok' });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password baru harus minimal 6 karakter' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (updateError) {
        console.error('Error changing password (Supabase):', updateError);
        if (updateError.message.includes("requires a recent login")) {
            setMessage({ type: 'error', text: 'Sesi Anda telah berakhir. Silakan login ulang untuk mengubah password.' });
        } else if (updateError.message.includes("same as the existing password")) {
            setMessage({ type: 'error', text: 'Password baru tidak boleh sama dengan password lama.' });
        } else {
            setMessage({ 
                type: 'error', 
                text: updateError.message || 'Gagal mengubah password.'
            });
        }
      } else {
        setMessage({ type: 'success', text: 'Password berhasil diperbarui. Anda mungkin perlu login ulang dengan password baru Anda.' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error('Unexpected error changing password:', error);
      setMessage({ 
        type: 'error', 
        text: 'Gagal mengubah password. Terjadi kesalahan tak terduga.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!currentUser || !currentUser.email) {
        setMessage({ type: 'error', text: 'Tidak ada pengguna atau email pengguna tidak ditemukan.' });
        return;
    }
    if (currentUser.email_confirmed_at) {
        setMessage({ type: 'info', text: 'Email Anda sudah terverifikasi.' });
        return;
    }
    
    setVerificationLoading(true);
    setMessage(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: currentUser.email,
      });

      if (resendError) {
        console.error('Error sending verification email (Supabase):', resendError);
        setMessage({ 
          type: 'error', 
          text: resendError.message || 'Gagal mengirim email verifikasi.'
        });
      } else {
        setVerificationSent(true);
        setMessage({ type: 'success', text: 'Email verifikasi telah dikirim. Silakan periksa inbox Anda.' });
      }
    } catch (error: any) {
      console.error('Unexpected error sending verification email:', error);
      setMessage({ 
        type: 'error', 
        text: 'Gagal mengirim email verifikasi. Terjadi kesalahan tak terduga.'
      });
    } finally {
        setVerificationLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-8">
        <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-indigo-600 to-purple-700">
          <h2 className="text-lg leading-6 font-medium text-white">
            Pengaturan Akun
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-indigo-100">
            Kelola pengaturan keamanan dan preferensi akun Anda
          </p>
        </div>
        
        {message && (
          <div className={`px-4 py-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            {message.text}
          </div>
        )}
        
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Verifikasi Email
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            <p>Status: {currentUser?.email_confirmed_at ? `Terverifikasi pada ${new Date(currentUser.email_confirmed_at).toLocaleDateString('id-ID')}` : 'Belum diverifikasi'}</p>
          </div>
          {!currentUser?.email_confirmed_at && (
            <div className="mt-5">
              <button
                onClick={handleSendVerification}
                disabled={verificationSent || verificationLoading || loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {verificationLoading ? 'Mengirim...' : verificationSent ? 'Email verifikasi terkirim' : 'Kirim ulang email verifikasi'}
              </button>
              {verificationSent && !verificationLoading && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Email verifikasi telah dikirim. Periksa inbox Anda dan klik tautan verifikasi.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {currentUser?.email_confirmed_at && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-indigo-600 to-purple-700">
            <h2 className="text-lg leading-6 font-medium text-white">
              Ubah Password
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-indigo-100">
              Update password akun Anda
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password Baru
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  placeholder="Masukkan password baru (min. 6 karakter)"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  placeholder="Konfirmasi password baru"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || verificationLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Ubah Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}