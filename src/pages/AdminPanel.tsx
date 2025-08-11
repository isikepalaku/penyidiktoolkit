import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../supabaseClient';

// Interface untuk data pengguna yang diperluas dengan status registrasi
// @ts-ignore - Digunakan untuk type checking
interface ExtendedUser extends User {
  user_metadata: {
    registration_status: string;
    full_name?: string;
    [key: string]: any;
  }
}

// Interface untuk data pengguna dari database RPC function
interface DBUserWithStatus {
  id: string;
  email: string;
  created_at: string;
  registration_status: string;
  full_name: string;
}

// Error boundary component untuk menangkap error rendering
function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-red-600">Kesalahan Aplikasi</h1>
        <p className="mb-4">Terjadi kesalahan saat menampilkan halaman ini.</p>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-60 mb-4">
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { currentUser, session } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<DBUserWithStatus[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<DBUserWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renderKey, setRenderKey] = useState(0); // Key untuk force re-render jika terjadi error

  // Reset error state jika terjadi error
  const handleRenderError = useCallback(() => {
    console.log("Handling render error, forcing re-render");
    setRenderKey(prev => prev + 1);
    setConfirmDelete(null); // Reset confirm state yang mungkin menyebabkan error
  }, []);

  // Periksa apakah pengguna saat ini adalah admin
  useEffect(() => {
    let isMounted = true;
    
    async function checkAdminStatus() {
      if (!currentUser) {
        console.log("No current user, cannot check admin status");
        return;
      }
      
      try {
        console.log("Checking admin status for user:", currentUser.id);
        console.log("User metadata:", currentUser.user_metadata);
        
        // BYPASS: Hard-coded override for specific user ID
        if (currentUser.id === '24115401-3163-4c0a-8b2f-ebe7f19c46ed') {
          console.log("BYPASS: Setting admin status to TRUE for specific user");
          if (isMounted) setIsAdmin(true);
          return;
        }
        
        // Log auth status info untuk debugging
        console.log("Auth session:", session?.access_token ? "Valid" : "Invalid");
        
        // Cek dulu dari metadata (lebih cepat)
        if (currentUser.user_metadata?.role === 'admin') {
          console.log("User is admin based on metadata");
          if (isMounted) setIsAdmin(true);
          return;
        }
        
        // Jika tidak ada di metadata, periksa di database
        console.log("Checking admin status in database");
        
        // Menggunakan Supabase RPC untuk memeriksa admin
        const { data, error } = await supabase.rpc('is_admin', {
          p_user_id: currentUser.id
        });
        
        console.log("RPC is_admin raw response:", { data, error });
        
        if (error) {
          console.error("Error checking admin status:", error);
          
          // Fallback: cek langsung dari tabel admins
          console.log("Using fallback check");
          const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', currentUser.id);
            
          console.log("Fallback check result:", { adminData, adminError });
          
          if (!adminError && adminData && adminData.length > 0) {
            console.log("User is admin based on direct table query");
            if (isMounted) setIsAdmin(true);
            return;
          }
          
          if (isMounted) setIsAdmin(false);
          return;
        }
        
        console.log("Admin check result:", data);
        if (isMounted) setIsAdmin(data === true);
      } catch (err) {
        console.error("Error checking admin status:", err);
        if (isMounted) setIsAdmin(false);
      }
    }
    
    checkAdminStatus();
    
    return () => {
      isMounted = false;
    };
  }, [currentUser, session]);

  // Dapatkan daftar pengguna jika pengguna saat ini adalah admin
  useEffect(() => {
    if (!isAdmin) return;
    
    let isMounted = true;
    
    const fetchUsers = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      
      try {
        console.log("Fetching users...");
        
        // Debugging: Log user UID dan admin status
        const { data: userData } = await supabase.auth.getUser();
        console.log("Current user:", userData?.user?.id);
        console.log("Email:", userData?.user?.email);
        
        // PENDEKATAN 1: Coba akses view langsung (tanpa RPC)
        console.log("Fetching users directly from view...");
        const { data: viewData, error: viewError } = await supabase
          .from('users_with_status')
          .select('*');
          
        if (viewError) {
          console.error("Error fetching from view:", viewError);
        } else {
          console.log("Users data from view:", viewData);
          
          // Pisahkan pengguna berdasarkan status pendaftaran
          const pending: DBUserWithStatus[] = [];
          const approved: DBUserWithStatus[] = [];
          
          if (viewData && Array.isArray(viewData)) {
            viewData.forEach((user: DBUserWithStatus) => {
              if (user.registration_status === 'pending') {
                pending.push(user);
              } else if (user.registration_status === 'approved') {
                approved.push(user);
              }
            });
            
            if (isMounted) {
              setPendingUsers(pending);
              setApprovedUsers(approved);
              setLoading(false);
            }
            return;
          }
        }
        
        // PENDEKATAN 2: Fallback ke RPC jika view tidak bisa diakses
        console.log("Trying RPC method...");
        let { data, error } = await supabase.rpc('get_users_with_status');
        
        if (error) {
          console.error("Error fetching users via RPC:", error);
          
          // PENDEKATAN 3: Fallback ke query mentah dari auth.users
          console.log("Using raw query fallback...");
          const { data: rawData, error: rawError } = await supabase.auth.admin.listUsers();
          
          if (rawError) {
            console.error("Raw query error:", rawError);
            if (isMounted) {
              setError(`Gagal mengambil data pengguna: ${error.message}`);
              setLoading(false);
            }
            return;
          }
          
          console.log("Raw user data:", rawData);
          
          // Transform data ke format yang diharapkan
          if (rawData && rawData.users) {
            const transformedData = rawData.users.map((user: any) => ({
              id: user.id,
              email: user.email,
              created_at: user.created_at,
              registration_status: user.user_metadata?.registration_status || 'pending',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || ''
            }));
            
            console.log("Transformed data:", transformedData);
            data = transformedData;
          } else {
            if (isMounted) {
              setError('Tidak bisa mendapatkan data pengguna');
              setLoading(false);
            }
            return;
          }
        } else {
          console.log("Users data from RPC:", data);
        }
        
        // Pisahkan pengguna berdasarkan status pendaftaran
        const pending: DBUserWithStatus[] = [];
        const approved: DBUserWithStatus[] = [];
        
        if (data && Array.isArray(data)) {
          data.forEach((user: DBUserWithStatus) => {
            if (user.registration_status === 'pending') {
              pending.push(user);
            } else if (user.registration_status === 'approved') {
              approved.push(user);
            }
          });
        } else {
          console.warn("Data is not an array or is null:", data);
        }
        
        if (isMounted) {
          setPendingUsers(pending);
          setApprovedUsers(approved);
        }
      } catch (error: any) {
        console.error("Error fetching users:", error);
        if (isMounted) {
          setError(`Terjadi kesalahan: ${error.message}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchUsers();
    
    return () => {
      isMounted = false;
    };
  }, [isAdmin, success]); // Re-fetch jika status isAdmin berubah atau ada perubahan status sukses

  // Approve pengguna
  const approveUser = async (userId: string) => {
    try {
      setSuccess(null);
      setError(null);
      
      console.log("Approving user:", userId);
      
      // PENDEKATAN 1: Gunakan fungsi SQL baru
      console.log("Using SQL function for approval");
      const { data, error } = await supabase.rpc('approve_user', {
        p_user_id: userId
      });
      
      if (error) {
        console.error("Error approving user with SQL function:", error);
        
        // PENDEKATAN 2 (FALLBACK): Coba fungsi Edge jika tersedia
        console.log("Trying Edge Function fallback...");
        try {
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin/approve-user', {
            body: { userId },
            headers: {
              Authorization: `Bearer ${session?.access_token}`
            }
          });
          
          if (edgeError) {
            console.error("Edge Function error:", edgeError);
            throw new Error(edgeError.message);
          }
          
          console.log("Edge Function result:", edgeData);
          setSuccess("Pengguna berhasil disetujui");
          
          // Update status lokal untuk UI
          setPendingUsers(prev => prev.filter(user => user.id !== userId));
          setApprovedUsers(prev => [...prev, {
            ...pendingUsers.find(user => user.id === userId)!,
            registration_status: 'approved'
          }]);
          
          return;
        } catch (edgeErr: any) {
          console.error("Edge Function approach failed:", edgeErr);
          
          // PENDEKATAN 3 (FALLBACK TERAKHIR): Update metadata langsung
          console.log("Using direct metadata update as last resort");
          try {
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
              user_metadata: { registration_status: 'approved' }
            });
            
            if (updateError) {
              console.error("Direct update error:", updateError);
              throw new Error(updateError.message);
            }
            
            console.log("Direct update successful");
            setSuccess("Pengguna berhasil disetujui");
            
            // Update status lokal untuk UI
            setPendingUsers(prev => prev.filter(user => user.id !== userId));
            setApprovedUsers(prev => [...prev, {
              ...pendingUsers.find(user => user.id === userId)!,
              registration_status: 'approved'
            }]);
            
            return;
          } catch (updateErr: any) {
            console.error("All approaches failed:", updateErr);
            setError(`Gagal menyetujui pengguna: ${updateErr.message}`);
            return;
          }
        }
      }
      
      console.log("SQL function result:", data);
      
      if (!data.success) {
        setError(`Gagal menyetujui pengguna: ${data.message}`);
        return;
      }
      
      setSuccess("Pengguna berhasil disetujui");
      
      // Update status lokal untuk UI
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      setApprovedUsers(prev => [...prev, {
        ...pendingUsers.find(user => user.id === userId)!,
        registration_status: 'approved'
      }]);
    } catch (error: any) {
      console.error("Error approving user:", error);
      setError(`Terjadi kesalahan: ${error.message}`);
    }
  };

  // Reject pengguna
  const rejectUser = async (userId: string) => {
    try {
      setSuccess(null);
      setError(null);
      
      console.log("Rejecting user:", userId);
      
      // PENDEKATAN 1: Gunakan fungsi SQL baru
      console.log("Using SQL function for rejection");
      const { data, error } = await supabase.rpc('reject_user', {
        p_user_id: userId
      });
      
      if (error) {
        console.error("Error rejecting user with SQL function:", error);
        
        // PENDEKATAN 2 (FALLBACK): Coba fungsi Edge jika tersedia
        console.log("Trying Edge Function fallback...");
        try {
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin/reject-user', {
            body: { userId },
            headers: {
              Authorization: `Bearer ${session?.access_token}`
            }
          });
          
          if (edgeError) {
            console.error("Edge Function error:", edgeError);
            throw new Error(edgeError.message);
          }
          
          console.log("Edge Function result:", edgeData);
          setSuccess("Pengguna berhasil ditolak");
          
          // Update status lokal untuk UI
          setPendingUsers(prev => prev.filter(user => user.id !== userId));
          
          return;
        } catch (edgeErr: any) {
          console.error("Edge Function approach failed:", edgeErr);
          
          // PENDEKATAN 3 (FALLBACK TERAKHIR): Update metadata langsung
          console.log("Using direct metadata update as last resort");
          try {
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
              user_metadata: { registration_status: 'rejected' }
            });
            
            if (updateError) {
              console.error("Direct update error:", updateError);
              throw new Error(updateError.message);
            }
            
            console.log("Direct update successful");
            setSuccess("Pengguna berhasil ditolak");
            
            // Update status lokal untuk UI
            setPendingUsers(prev => prev.filter(user => user.id !== userId));
            
            return;
          } catch (updateErr: any) {
            console.error("All approaches failed:", updateErr);
            setError(`Gagal menolak pengguna: ${updateErr.message}`);
            return;
          }
        }
      }
      
      console.log("SQL function result:", data);
      
      if (!data.success) {
        setError(`Gagal menolak pengguna: ${data.message}`);
        return;
      }
      
      setSuccess("Pengguna berhasil ditolak");
      
      // Update status lokal untuk UI
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      setError(`Terjadi kesalahan: ${error.message}`);
    }
  };

  // Hapus pengguna
  const deleteUser = async (userId: string) => {
    try {
      setSuccess(null);
      setError(null);
      setConfirmDelete(null);
      
      console.log("Deleting user:", userId);
      
      // PENDEKATAN 1: Gunakan fungsi Edge
      console.log("Using Edge Function for deletion");
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin-delete-user', {
          body: { userId },
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        });
        
        if (edgeError) {
          console.error("Edge Function error:", edgeError);
          throw new Error(edgeError.message);
        }
        
        console.log("Edge Function result:", edgeData);
        setSuccess("Pengguna berhasil dihapus");
        
        // Update status lokal untuk UI
        setApprovedUsers(prev => prev.filter(user => user.id !== userId));
        return;
      } catch (edgeErr: any) {
        console.error("Edge Function approach failed:", edgeErr);
        
        // PENDEKATAN 2 (FALLBACK): Gunakan admin API
        console.log("Using admin API as fallback");
        try {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
          
          if (deleteError) {
            console.error("Admin API delete error:", deleteError);
            throw new Error(deleteError.message);
          }
          
          console.log("User deletion successful");
          setSuccess("Pengguna berhasil dihapus");
          
          // Update status lokal untuk UI
          setApprovedUsers(prev => prev.filter(user => user.id !== userId));
          return;
        } catch (deleteErr: any) {
          console.error("All deletion approaches failed:", deleteErr);
          setError(`Gagal menghapus pengguna: ${deleteErr.message}`);
          return;
        }
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      setError(`Terjadi kesalahan: ${error.message}`);
    }
  };

  // Tampilkan pesan akses ditolak jika bukan admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-red-600">Akses Ditolak</h1>
          <p className="mb-4">Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <p>Halaman ini hanya dapat diakses oleh administrator sistem.</p>
        </div>
      </div>
    );
  }

  // Wrap render dalam try-catch untuk menangkap error render
  try {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8" key={renderKey}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Panel Admin</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Pengguna yang menunggu persetujuan */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Menunggu Persetujuan ({pendingUsers.length})</h2>
                
                {pendingUsers.length === 0 ? (
                  <p>Tidak ada pengguna yang menunggu persetujuan.</p>
                ) : (
                  <div className="bg-white shadow overflow-x-auto overflow-y-hidden rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nama
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tanggal Daftar
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingUsers.map(user => (
                          <tr key={`pending-${user.id}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.full_name || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => approveUser(user.id)}
                                className="bg-green-600 text-white py-1 px-3 rounded mr-2 hover:bg-green-700"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => rejectUser(user.id)}
                                className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700"
                              >
                                Tolak
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pengguna yang disetujui */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Pengguna Disetujui ({approvedUsers.length})</h2>
                
                {approvedUsers.length === 0 ? (
                  <p>Belum ada pengguna yang disetujui.</p>
                ) : (
                  <div className="bg-white shadow overflow-x-auto overflow-y-hidden rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nama
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tanggal Daftar
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {approvedUsers.map(user => (
                          <tr key={`approved-${user.id}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.full_name || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {confirmDelete === user.id ? (
                                <div className="flex flex-wrap gap-1 items-center">
                                  <span className="text-sm text-red-600 mr-1">Yakin?</span>
                                  <button
                                    onClick={() => deleteUser(user.id)}
                                    className="bg-red-600 text-white py-1 px-3 rounded mr-1 hover:bg-red-700"
                                  >
                                    Ya
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="bg-gray-500 text-white py-1 px-3 rounded hover:bg-gray-600"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDelete(user.id)}
                                  className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700"
                                >
                                  Hapus
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (renderError) {
    console.error("Render error caught:", renderError);
    handleRenderError();
    
    return (
      <ErrorFallback 
        error={renderError instanceof Error ? renderError : new Error("Terjadi kesalahan saat render")} 
        resetErrorBoundary={handleRenderError} 
      />
    );
  }
} 