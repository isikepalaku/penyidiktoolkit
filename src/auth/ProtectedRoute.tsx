import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  redirectPath = '/login'
}: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    // Tampilkan loading spinner atau skeleton
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
} 