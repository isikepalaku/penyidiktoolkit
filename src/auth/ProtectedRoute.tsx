import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tambahkan logging untuk debug
  useEffect(() => {
    console.log("TIPIDTER ROUTE: ProtectedRoute initializing", {
      loading,
      isAuthenticated: !!currentUser,
      userId: currentUser?.id,
      registrationStatus: currentUser?.user_metadata?.registration_status || 'unknown'
    });

    // Safety timeout untuk kasus ekstrim
    const timer = setTimeout(() => {
      setInternalLoading(false);
    }, 3000);

    // Cek sekali lagi setelah komponen mount
    if (!loading) {
      setInternalLoading(false);
      clearTimeout(timer);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [loading, currentUser]);

  console.log("TIPIDTER ROUTE: ProtectedRoute rendering", {
    loading,
    internalLoading,
    isAuthenticated: !!currentUser,
    userId: currentUser?.id,
    registrationStatus: currentUser?.user_metadata?.registration_status || 'unknown',
    error
  });

  // Menampilkan state loading jika auth context masih memuat
  if (loading || internalLoading) {
    console.log("TIPIDTER ROUTE: Loading state active");
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Memuat sesi pengguna...</p>
        </div>
      </div>
    );
  }

  // Jika user belum login, arahkan ke halaman login
  if (!currentUser) {
    console.log("TIPIDTER ROUTE: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  // Jika ada error dalam pemeriksaan status, tampilkan UI error
  if (error) {
    console.error("TIPIDTER ROUTE: Error checking user status", error);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error Otentikasi</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-700"
            >
              Login Ulang
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Periksa status registrasi dari user_metadata dengan penanganan error yang lebih baik
  try {
    // Periksa apakah user_metadata ada dan dapat diakses
    if (!currentUser.user_metadata) {
      console.error("TIPIDTER ROUTE: User metadata not available");
      // Set state error dan return loading sampai effect berikutnya memperbarui state
      setError("Metadata pengguna tidak tersedia. Silakan coba login ulang.");
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Memeriksa data pengguna...</p>
          </div>
        </div>
      );
    }
    
    const registrationStatus = currentUser.user_metadata?.registration_status;
    console.log(`TIPIDTER ROUTE: User registration status: ${registrationStatus || 'unknown'}`);
    
    // Jika pending, arahkan ke halaman khusus untuk menunggu persetujuan
    if (registrationStatus === 'pending') {
      console.log("TIPIDTER ROUTE: User status is pending, redirecting to pending-approval");
      // Opsi 1: Redirect ke halaman khusus untuk status pending
      return <Navigate to="/pending-approval" replace />;
    }
    
    // Periksa juga apakah user adalah admin untuk halaman admin
    const isAdmin = currentUser.user_metadata?.role === 'admin';
    const isAdminRoute = window.location.pathname === '/admin';
    
    if (isAdminRoute && !isAdmin) {
      console.log("TIPIDTER ROUTE: Non-admin user trying to access admin page, redirecting");
      return <Navigate to="/" replace />;
    }
    
    // Jika statusnya tidak pending dan akses diizinkan, tampilkan konten yang dilindungi
    console.log("TIPIDTER ROUTE: Rendering protected content");
    return <>{children}</>;
  } catch (error: any) {
    console.error("TIPIDTER ROUTE: Error checking user status", error);
    // Set state error and render loading UI - effect will handle update
    setError(`Terjadi kesalahan saat memeriksa status pengguna: ${error.message || 'Unknown error'}`);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-red-600">Memeriksa data pengguna...</p>
        </div>
      </div>
    );
  }
} 