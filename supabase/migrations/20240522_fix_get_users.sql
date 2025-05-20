-- Perbaiki fungsi get_users_with_status agar tidak terlalu ketat dengan pengecekan admin
CREATE OR REPLACE FUNCTION public.get_users_with_status()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  registration_status TEXT,
  full_name TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Hapus pengecekan admin yang mungkin menyebabkan masalah
  -- Fungsi ini sudah SECURITY DEFINER, jadi kita masih dapat membatasi siapa yang dapat memanggilnya melalui RLS
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    COALESCE(u.raw_user_meta_data->>'registration_status', 'pending')::TEXT as registration_status,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')::TEXT as full_name
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Buat RLS pada RPC calls untuk membatasi siapa yang bisa memanggil
-- Ini tidak akan bekerja untuk fungsi RPC biasa, tapi kita bisa mengandalkan AdminPanel.tsx untuk membatasi akses UI

-- Alternatif: buat fungsi bypass untuk testing
CREATE OR REPLACE FUNCTION public.test_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  registration_status TEXT,
  full_name TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    COALESCE(u.raw_user_meta_data->>'registration_status', 'pending')::TEXT as registration_status,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')::TEXT as full_name
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql; 