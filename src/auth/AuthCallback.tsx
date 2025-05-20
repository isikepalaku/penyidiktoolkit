import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Tambahkan debug info
    console.log("Auth callback executed. URL:", window.location.href);
    
    const handleAuthCallback = async () => {
      try {
        // Parse URL fragment atau query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Periksa apakah ada error
        const hashError = hashParams.get('error');
        const queryError = queryParams.get('error');
        
        if (hashError || queryError) {
          const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
          console.error("Auth error:", hashError || queryError, errorDescription);
          
          // Redirect ke halaman error atau login
          navigate('/login?error=' + encodeURIComponent(errorDescription || 'Authentication failed'));
          return;
        }
        
        // Pastikan session telah berhasil disimpan oleh Supabase Auth
        const { data, error } = await supabase.auth.getSession();
        console.log("Session check result:", data, error);
        
        if (error) throw error;
        
        if (data.session) {
          console.log("Session found, user authenticated");
          // Redirect ke home page atau protected route
          navigate('/');
        } else {
          console.warn("No session found in callback");
          // Coba ambil sesi dari URL langsung (kadang dibutuhkan)
          const { error: signInError } = await supabase.auth.signInWithOAuth({
            provider: 'google', // atau provider yang relevan
            options: {
              redirectTo: window.location.origin + '/auth/callback',
            }
          });
          
          if (signInError) {
            console.error("Error signing in:", signInError);
            navigate('/login?error=' + encodeURIComponent(signInError.message));
          }
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        navigate('/login?error=' + encodeURIComponent('Authentication failed, please try again'));
      }
    };
    
    handleAuthCallback();
  }, [navigate]);
  
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Mengautentikasi pengguna...</p>
      </div>
    </div>
  );
} 