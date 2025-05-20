import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();

  // Tambahkan logging untuk debug
  console.log("TIPIDTER ROUTE: ProtectedRoute rendering", {
    loading,
    isAuthenticated: !!currentUser,
    userId: currentUser?.id,
    registrationStatus: currentUser?.user_metadata?.registration_status
  });

  if (loading) {
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
  
  // Periksa status registrasi dari user_metadata
  try {
    const registrationStatus = currentUser.user_metadata?.registration_status;
    console.log(`TIPIDTER ROUTE: User registration status: ${registrationStatus}`);
    
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
  } catch (error) {
    console.error("TIPIDTER ROUTE: Error checking user status", error);
    // Fallback ke halaman login jika ada error dalam pengecekan status
    return <Navigate to="/login" replace />;
  }
} 