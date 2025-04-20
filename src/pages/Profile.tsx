import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { updateProfile, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function Profile() {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      // Jika email berubah, perlu re-authenticate dulu
      if (email !== currentUser.email && currentPassword) {
        const credential = EmailAuthProvider.credential(
          currentUser.email!,
          currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
        await updateEmail(currentUser, email);
      }
      
      // Update displayName
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName });
      }
      
      setMessage({ type: 'success', text: 'Profil berhasil diperbarui' });
      setIsEditing(false);
      setCurrentPassword('');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: error.code === 'auth/requires-recent-login'
          ? 'Silakan masukkan password Anda untuk mengkonfirmasi perubahan'
          : error.code === 'auth/invalid-credential'
          ? 'Password salah'
          : 'Gagal memperbarui profil' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-blue-600 to-indigo-700">
          <h2 className="text-lg leading-6 font-medium text-white">
            Profil Pengguna
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-blue-100">
            Detail dan pengaturan akun Anda
          </p>
        </div>
        
        {message && (
          <div className={`px-4 py-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}
        
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-medium">
              {currentUser?.displayName 
                ? currentUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                : 'U'}
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                {currentUser?.displayName || 'Pengguna'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {currentUser?.email}
              </p>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="ml-auto px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Edit
              </button>
            )}
          </div>
          
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nama
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Nama Anda"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Email Anda"
                />
              </div>
              
              {email !== currentUser?.email && (
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password Saat Ini (diperlukan untuk mengubah email)
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Masukkan password saat ini"
                    required={email !== currentUser?.email}
                  />
                </div>
              )}
              
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(currentUser?.displayName || '');
                    setEmail(currentUser?.email || '');
                    setCurrentPassword('');
                    setMessage(null);
                  }}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
              <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Nama Lengkap</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {currentUser?.displayName || 'Belum diatur'}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {currentUser?.email}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Akun dibuat pada</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {currentUser?.metadata.creationTime 
                      ? new Date(currentUser.metadata.creationTime).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Login terakhir</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {currentUser?.metadata.lastSignInTime 
                      ? new Date(currentUser.metadata.lastSignInTime).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email diverifikasi</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {currentUser?.emailVerified ? 'Ya' : 'Tidak'}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 