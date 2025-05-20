-- Fungsi untuk mengambil users berdasarkan status registrasi
CREATE OR REPLACE FUNCTION public.get_users_with_status(status_param TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  user_metadata JSONB,
  registration_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data AS user_metadata,
    COALESCE(au.raw_user_meta_data->>'registration_status', 'pending') AS registration_status
  FROM
    auth.users au
  WHERE
    COALESCE(au.raw_user_meta_data->>'registration_status', 'pending') = status_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Berikan akses ke anon dan service_role untuk memanggil fungsi ini
GRANT EXECUTE ON FUNCTION public.get_users_with_status(TEXT) TO anon, service_role;

-- Test fungsi
SELECT * FROM public.get_users_with_status('pending') LIMIT 5;
SELECT * FROM public.get_users_with_status('approved') LIMIT 5; 