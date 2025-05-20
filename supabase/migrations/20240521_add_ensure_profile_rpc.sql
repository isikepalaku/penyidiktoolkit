-- Membuat RPC function untuk memastikan profil pengguna ada
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id_param UUID, status_param TEXT DEFAULT 'pending')
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Ambil ID pengguna saat ini
  current_user_id := auth.uid();
  
  -- Pastikan pengguna yang dimaksud sama dengan pengguna yang sedang login
  -- atau pengguna adalah admin
  IF user_id_param <> current_user_id AND NOT public.is_admin(current_user_id) THEN
    RAISE EXCEPTION 'Permission denied: Cannot ensure profile for other users';
  END IF;
  
  -- Periksa apakah pengguna ada di auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id_param) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Insert atau update profil
  INSERT INTO public.user_profiles (user_id, registration_status)
  VALUES (user_id_param, status_param)
  ON CONFLICT (user_id) DO UPDATE SET
    registration_status = status_param,
    updated_at = NOW();
    
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error ensuring user profile: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 