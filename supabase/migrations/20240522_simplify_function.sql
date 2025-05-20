-- Perbaiki fungsi get_users_with_status dengan membuat versi yang paling sederhana
DROP FUNCTION IF EXISTS public.get_users_with_status();

CREATE OR REPLACE FUNCTION public.get_users_with_status()
RETURNS SETOF JSONB
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'created_at', u.created_at,
      'registration_status', COALESCE(u.raw_user_meta_data->>'registration_status', 'pending'),
      'full_name', COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
    )
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Berikan izin eksekusi ke semua peran
GRANT EXECUTE ON FUNCTION public.get_users_with_status() TO PUBLIC; 