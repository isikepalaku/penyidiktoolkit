import { useAuth } from '../auth/AuthContext';

export default function PendingApproval() {
  const { logOut } = useAuth();

  const handleLogout = async () => {
    await logOut();
    // Logout sudah otomatis redirect ke halaman login karena perubahan state di AuthContext
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center">
          <svg 
            className="w-16 h-16 mx-auto text-yellow-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white">Akun Menunggu Persetujuan</h2>
        </div>
        
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <p>
            Terima kasih telah mendaftar di Penyidik Toolkit. Akun Anda saat ini <span className="font-semibold text-yellow-600 dark:text-yellow-400">sedang menunggu persetujuan administrator</span>.
          </p>
          <p>
            Hal ini dilakukan sebagai bagian dari proses verifikasi untuk memastikan bahwa hanya pengguna yang berwenang yang dapat mengakses sistem.
          </p>
          <p>
            Anda akan diberi tahu melalui email saat akun Anda telah disetujui. Setelah itu, Anda dapat masuk kembali untuk mengakses semua fitur.
          </p>
        </div>
        
        <div className="pt-4">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
} 