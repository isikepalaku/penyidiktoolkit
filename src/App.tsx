import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Agents from './pages/Agents';
import Toolkit from './pages/Toolkit';
import PencarianPutusan from './pages/PencarianPutusan';
import PerkabaChat from './pages/PerkabaChat';
import UndangUndang from './pages/UndangUndang';
import PenyidikAi from './pages/PenyidikAi';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PendingApproval from './pages/PendingApproval';
import AdminPanel from './pages/AdminPanel';
import AuthCallback from './pages/AuthCallback';
import PiketSpkt from './pages/PiketSpkt';
import ProtectedRoute from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { NotificationHandler } from './components/NotificationHandler';
import { PWAInstallButton } from './components/PWAInstallButton';
import ErrorBoundary from './components/ErrorBoundary';

// Deteksi apakah ini perangkat mobile
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Komponen untuk tracking route changes
function RouteTracker() {
  const location = useLocation();
  
  useEffect(() => {
    // Track setiap kali path berubah
    const pageName = location.pathname === '/' ? 'home' : location.pathname.substring(1);
    console.log(`TIPIDTER NAVIGATION: Navigating to ${pageName}`);
    
    // Simpan halaman ini untuk digunakan di pageview berikutnya
    sessionStorage.setItem('lastPage', pageName);
  }, [location]);
  
  return null;
}

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [isDesktop] = useState(!isMobile());
  
  console.log('TIPIDTER APP: Rendering App content', { 
    isAuthenticated: !!currentUser,
    userEmail: currentUser?.email,
    userStatus: currentUser?.user_metadata?.registration_status,
    authLoading: loading,
    isDesktop
  });

  // Show loading indicator if auth is still loading
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-600">Memuat sesi pengguna...</p>
      </div>
    );
  }

  return (
    <>
      {/* Tampilkan notifikasi hanya jika ini adalah perangkat desktop */}
      {isDesktop && <NotificationHandler showNotification={true} />}
      
      <PWAInstallButton />
      <Router>
        <RouteTracker />
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
          {/* Tampilkan Sidebar hanya jika user sudah login */}
          {currentUser && <Sidebar />}
          
          <main className={currentUser ? "lg:ml-64 overflow-x-hidden" : "overflow-x-hidden"}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/agents" element={
                <ProtectedRoute>
                  <Agents />
                </ProtectedRoute>
              } />
              <Route path="/sop-penyidik" element={
                <ProtectedRoute>
                  <PerkabaChat />
                </ProtectedRoute>
              } />
              <Route path="/undang-undang" element={
                <ProtectedRoute>
                  <UndangUndang />
                </ProtectedRoute>
              } />
              <Route path="/penyidik-ai" element={
                <ProtectedRoute>
                  <PenyidikAi />
                </ProtectedRoute>
              } />
              <Route path="/toolkit" element={
                <ProtectedRoute>
                  <Toolkit />
                </ProtectedRoute>
              } />
              <Route path="/pencarian-putusan" element={
                <ProtectedRoute>
                  <PencarianPutusan />
                </ProtectedRoute>
              } />
              <Route path="/piket-spkt" element={
                <ProtectedRoute>
                  <PiketSpkt />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              {/* Admin Route - akan diperiksa di dalam komponen AdminPanel */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;