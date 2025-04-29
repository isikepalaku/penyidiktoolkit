import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
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
import ProtectedRoute from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { NotificationHandler } from './components/NotificationHandler';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SplashScreen } from './components/SplashScreen';
import { trackPageView } from './services/analytics';

// Komponen untuk tracking route changes
function RouteTracker() {
  const location = useLocation();
  
  useEffect(() => {
    // Track setiap kali path berubah
    const pageName = location.pathname === '/' ? 'home' : location.pathname.substring(1);
    trackPageView(pageName, {
      previous_page: sessionStorage.getItem('lastPage') || 'none',
      search_params: location.search
    });
    
    // Simpan halaman ini untuk digunakan di pageview berikutnya
    sessionStorage.setItem('lastPage', pageName);
  }, [location]);
  
  return null;
}

function App() {
  const { currentUser } = useAuth();

  return (
    <>
      <SplashScreen />
      <NotificationHandler showNotification={true} />
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
            </Routes>
          </main>
        </div>
      </Router>
    </>
  );
}

export default App;