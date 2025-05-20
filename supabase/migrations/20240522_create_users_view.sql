-- Membuat view untuk mencegah masalah struktur pada fungsi
CREATE OR REPLACE VIEW public.users_with_status AS
SELECT 
  u.id,
  u.email,
  u.created_at,
  COALESCE(u.raw_user_meta_data->>'registration_status', 'pending')::TEXT as registration_status,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')::TEXT as full_name
FROM auth.users u
ORDER BY u.created_at DESC;

-- Grant akses ke view
GRANT SELECT ON public.users_with_status TO PUBLIC;

-- Hapus fungsi kompleks yang menyebabkan masalah
DROP FUNCTION IF EXISTS public.get_users_with_status();

-- Membuat fungsi sangat sederhana yang mengembalikan data dari view
CREATE OR REPLACE FUNCTION public.get_users_with_status()
RETURNS SETOF public.users_with_status
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.users_with_status;
END;
$$ LANGUAGE plpgsql;

-- Grant akses ke fungsi
GRANT EXECUTE ON FUNCTION public.get_users_with_status() TO PUBLIC; 