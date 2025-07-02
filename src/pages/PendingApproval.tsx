import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const { logOut, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monitor currentUser changes untuk auto-redirect setelah logout
  useEffect(() => {
    if (!currentUser && !isLoggingOut) {
      console.log('PendingApproval: User logged out, redirecting to login...');
      navigate('/login', { replace: true });
    }
  }, [currentUser, isLoggingOut, navigate]);

  const clearAllStorages = () => {
    try {
      // Clear localStorage items yang berkaitan dengan session
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('supabase.') ||
          key.startsWith('wassidik_') ||
          key.startsWith('tipidter_') ||
          key.includes('session') ||
          key.includes('auth')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        console.log(`PendingApproval: Clearing localStorage key: ${key}`);
        localStorage.removeItem(key);
      });

      // Clear sessionStorage
      sessionStorage.clear();
      console.log('PendingApproval: All storage cleared');
    } catch (err) {
      console.error('PendingApproval: Error clearing storage:', err);
    }
  };

  const handleLogout = async () => {
    console.log('PendingApproval: Logout button clicked');
    setIsLoggingOut(true);
    setError(null);
    
    try {
      console.log('PendingApproval: Calling logOut function...');
      const result = await logOut();
      
      if (result?.error) {
        console.error('PendingApproval: Logout error:', result.error);
        setError(`Gagal logout: ${result.error.message || 'Error tidak diketahui'}`);
        setIsLoggingOut(false);
        return;
      }

      console.log('PendingApproval: Logout successful, cleaning up storage...');
      
      // Force cleanup semua storage
      clearAllStorages();
      
      // Multiple fallback redirect strategies
      console.log('PendingApproval: Initiating redirect...');
      
      // Strategy 1: React Router navigate
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 500);
      
      // Strategy 2: Fallback dengan window.location jika navigate gagal
      setTimeout(() => {
        console.log('PendingApproval: Fallback redirect via window.location...');
        window.location.href = '/login';
      }, 1500);
      
      // Strategy 3: Hard refresh sebagai last resort
      setTimeout(() => {
        console.log('PendingApproval: Last resort - force refresh...');
        window.location.reload();
      }, 3000);
      
    } catch (err: any) {
      console.error('PendingApproval: Unexpected logout error:', err);
      setError(`Error tidak terduga: ${err.message || 'Silakan coba lagi'}`);
      setIsLoggingOut(false);
    }
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

        {/* Error message display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-600">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="pt-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full px-4 py-2 text-white transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isLoggingOut 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoggingOut ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Mengeluarkan...
              </div>
            ) : (
              'Keluar'
            )}
          </button>

          {/* Debug info untuk development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 border rounded text-xs text-gray-600">
              <p><strong>Debug Info:</strong></p>
              <p>User ID: {currentUser?.id || 'null'}</p>
              <p>Email: {currentUser?.email || 'null'}</p>
              <p>Status: {currentUser?.user_metadata?.registration_status || 'null'}</p>
              <p>Logging Out: {isLoggingOut ? 'true' : 'false'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 