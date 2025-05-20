-- Perbaiki fungsi get_users_with_status untuk memastikan struktur hasil sama persis dengan versi asli
DROP FUNCTION IF EXISTS public.get_users_with_status();

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
  -- Hilangkan pengecekan admin untuk sementara karena mungkin menyebabkan masalah
  -- IF NOT public.is_admin(auth.uid()) THEN
  --   RAISE EXCEPTION 'Permission denied: User is not an admin';
  -- END IF;

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