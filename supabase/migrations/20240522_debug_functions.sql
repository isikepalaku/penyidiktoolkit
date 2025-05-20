-- Fungsi debug untuk memeriksa struktur yang diharapkan oleh aplikasi
CREATE OR REPLACE FUNCTION public.debug_get_users()
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
  function_def TEXT;
  result_sample JSONB;
BEGIN
  -- Dapatkan definisi fungsi get_users_with_status
  SELECT pg_get_functiondef(oid)
  INTO function_def
  FROM pg_proc
  WHERE proname = 'get_users_with_status' AND pronargs = 0;
  
  -- Ambil contoh data dari auth.users untuk debug
  SELECT jsonb_agg(row_to_json(u))
  INTO result_sample
  FROM (
    SELECT 
      id,
      email,
      created_at,
      raw_user_meta_data
    FROM auth.users
    LIMIT 3
  ) u;
  
  -- Return informasi debug
  RETURN format(
    'Function Definition: %s
    
    Sample Data: %s',
    function_def,
    result_sample::TEXT
  );
END;
$$ LANGUAGE plpgsql;

-- Berikan izin eksekusi untuk fungsi debug
GRANT EXECUTE ON FUNCTION public.debug_get_users() TO PUBLIC;

-- Fungsi yang menyerupai get_users_with_status tapi dengan nama berbeda
-- untuk mengurangi kemungkinan konflik
CREATE OR REPLACE FUNCTION public.get_all_users_debug()
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

-- Berikan izin eksekusi
GRANT EXECUTE ON FUNCTION public.get_all_users_debug() TO PUBLIC; 