-- Hapus fungsi yang ada terlebih dahulu
DROP FUNCTION IF EXISTS public.approve_user(UUID);
DROP FUNCTION IF EXISTS public.reject_user(UUID);

-- Fungsi untuk menyetujui pengguna (alternatif untuk Edge Function)
CREATE OR REPLACE FUNCTION public.approve_user(user_id UUID)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  target_user RECORD;
BEGIN
  -- Periksa apakah user ada
  SELECT id, email, raw_user_meta_data INTO target_user
  FROM auth.users
  WHERE id = user_id;
  
  IF target_user.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Update user metadata
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN 
        '{"registration_status": "approved"}'::jsonb
      ELSE 
        raw_user_meta_data || '{"registration_status": "approved"}'::jsonb
    END
  WHERE id = user_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'User approved successfully',
    'user', jsonb_build_object(
      'id', user_id,
      'email', target_user.email
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk menolak pengguna (alternatif untuk Edge Function)
CREATE OR REPLACE FUNCTION public.reject_user(user_id UUID)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  target_user RECORD;
BEGIN
  -- Periksa apakah user ada
  SELECT id, email, raw_user_meta_data INTO target_user
  FROM auth.users
  WHERE id = user_id;
  
  IF target_user.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Update user metadata
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN 
        '{"registration_status": "rejected"}'::jsonb
      ELSE 
        raw_user_meta_data || '{"registration_status": "rejected"}'::jsonb
    END
  WHERE id = user_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'User rejected successfully',
    'user', jsonb_build_object(
      'id', user_id,
      'email', target_user.email
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Izinkan akses ke fungsi (hanya untuk admin)
-- Pengecekan admin akan dilakukan di dalam kode aplikasi
GRANT EXECUTE ON FUNCTION public.approve_user(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_user(UUID) TO PUBLIC; 