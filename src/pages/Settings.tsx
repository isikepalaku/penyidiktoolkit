import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  sendEmailVerification
} from 'firebase/auth';

export default function Settings() {
  const { currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Password baru tidak cocok' });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password harus minimal 6 karakter' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      // Re-authenticate terlebih dahulu
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      
      // Perbarui password
      await updatePassword(currentUser, newPassword);
      
      setMessage({ type: 'success', text: 'Password berhasil diperbarui' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      setMessage({ 
        type: 'error', 
        text: error.code === 'auth/wrong-password'
          ? 'Password saat ini salah'
          : error.code === 'auth/requires-recent-login'
          ? 'Silakan login ulang untuk melakukan perubahan ini'
          : 'Gagal mengubah password'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!currentUser) return;
    
    try {
      await sendEmailVerification(currentUser);
      setVerificationSent(true);
      setMessage({ type: 'success', text: 'Email verifikasi telah dikirim' });
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      setMessage({ 
        type: 'error', 
        text: error.code === 'auth/too-many-requests'
          ? 'Terlalu banyak permintaan. Silakan coba lagi nanti'
          : 'Gagal mengirim email verifikasi'
      });
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
          <div className={`px-4 py-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}
        
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Verifikasi Email
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            <p>Status: {currentUser?.emailVerified ? 'Terverifikasi' : 'Belum diverifikasi'}</p>
          </div>
          {!currentUser?.emailVerified && (
            <div className="mt-5">
              <button
                onClick={handleSendVerification}
                disabled={verificationSent || loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {verificationSent ? 'Email verifikasi terkirim' : 'Kirim email verifikasi'}
              </button>
              {verificationSent && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Email verifikasi telah dikirim. Periksa inbox Anda dan klik tautan verifikasi.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
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
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password Saat Ini
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                placeholder="Masukkan password saat ini"
              />
            </div>

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
                placeholder="Masukkan password baru"
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
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Ubah Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}