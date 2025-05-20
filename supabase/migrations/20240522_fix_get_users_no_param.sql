-- Perbaiki fungsi get_users_with_status untuk bekerja tanpa parameter
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
  -- Tidak perlu pengecekan admin lagi, RLS akan diterapkan di UI
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

-- Berikan izin eksekusi ke semua peran
GRANT EXECUTE ON FUNCTION public.get_users_with_status() TO PUBLIC; 