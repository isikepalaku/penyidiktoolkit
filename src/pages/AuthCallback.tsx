import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Parse URL hash dan handle OAuth callback
    const handleOAuthCallback = async () => {
      try {
        setLoading(true);
        
        // Tambahkan logging untuk debug
        console.log("AuthCallback: Starting callback handling", window.location.href);
        
        // Parse URL parameters untuk debugging
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorParam = urlParams.get('error') || hashParams.get('error');
        
        // Jika ada error dalam URL, tampilkan
        if (errorParam) {
          const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
          const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');
          console.error('Error in URL parameters:', { error: errorParam, error_code: errorCode, error_description: errorDesc });
          setError(`${errorParam}: ${errorDesc}`);
          return;
        }
        
        // Tambahkan delay untuk memastikan session tersimpan di browser
        // Perbaikan: Tambahkan delay yang lebih lama untuk memastikan semua database operations selesai
        console.log("Waiting for session to be fully established...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Ambil session dari browser storage
        const { data, error } = await supabase.auth.getSession();
        console.log("AuthCallback: Session check result", data, error);
        
        if (error) {
          console.error('Error during OAuth callback:', error);
          setError(error.message);
          return;
        }
        
        if (!data?.session?.user) {
          console.error('No session found after OAuth callback');
          setError('No session found after OAuth callback');
          return;
        }
        
        const { user } = data.session;
        console.log("AuthCallback: User data from session", user);
        
        // Periksa apakah user sudah memiliki status registrasi
        // Jika belum, tetapkan ke 'pending'
        if (!user.user_metadata?.registration_status) {
          console.log('Setting OAuth user registration_status to pending...');
          
          try {
            // Perbaikan: Tambahkan delay sebelum update untuk memastikan trigger database telah selesai
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
              data: { 
                registration_status: 'pending',
                // Pastikan nama pengguna juga disimpan
                ...(user.user_metadata?.name && !user.user_metadata?.full_name
                    ? { full_name: user.user_metadata.name }
                    : {})
              }
            });
            
            if (updateError) {
              console.error('Error updating user metadata:', updateError);
              // Tambahkan retry logic jika update gagal
              console.log('Retrying update after delay...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const { data: retryData, error: retryError } = await supabase.auth.updateUser({
                data: { registration_status: 'pending' }
              });
              
              if (retryError) {
                console.error('Retry update failed:', retryError);
              } else {
                console.log('Retry update successful:', retryData);
              }
            } else {
              console.log('User metadata updated successfully:', updateData);
            }
            
            // Tambahkan fallback untuk memastikan user_profiles dibuat
            try {
              // Coba akses RPC untuk memastikan profile ada
              const { error: rpcError } = await supabase.rpc('ensure_user_profile', {
                user_id_param: user.id,
                status_param: 'pending'
              });
              
              if (rpcError) {
                console.log('RPC not available or error:', rpcError);
                // Jika RPC tidak tersedia, tidak masalah, lanjutkan saja
              }
            } catch (profileErr) {
              console.log('Profile fallback error (non-critical):', profileErr);
            }
            
          } catch (updateErr) {
            console.error('Exception updating user metadata:', updateErr);
            // Tetap lanjutkan proses meskipun ada error
          }
        }
        
        // Tambahkan delay akhir untuk memastikan semua operasi database selesai
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Tunda navigasi ke halaman yang sesuai berdasarkan status
        // Gunakan metadata yang sudah ada di user object
        const registrationStatus = user.user_metadata?.registration_status || 'pending';
        console.log(`AuthCallback: Redirecting based on status: ${registrationStatus}`);
        
        if (registrationStatus === 'pending') {
          navigate('/pending-approval');
        } else if (registrationStatus === 'approved') {
          navigate('/');
        } else {
          // Fallback jika status tidak dikenal
          navigate('/pending-approval');
        }
      } catch (err: any) {
        console.error('Unexpected error in OAuth callback:', err);
        setError('Terjadi kesalahan tak terduga. Silakan coba lagi.');
      } finally {
        setLoading(false);
      }
    };
    
    handleOAuthCallback();
  }, [navigate]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-600">Sedang memproses autentikasi...</p>
        <p className="mt-2 text-sm text-gray-500">Mohon tunggu sebentar...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600">Error Autentikasi</h2>
          <p className="text-gray-700">{error}</p>
          <div className="p-3 bg-gray-100 rounded-md text-sm overflow-x-auto">
            <pre>URL: {window.location.href}</pre>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Kembali ke Login
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full mt-2 px-4 py-2 font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }
  
  return null;
} 