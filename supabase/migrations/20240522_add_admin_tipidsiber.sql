-- Menambahkan user dengan ID spesifik sebagai admin
DO $$
DECLARE
  admin_user_id UUID := '24115401-3163-4c0a-8b2f-ebe7f19c46ed'; -- ID user tipidsiber@gmail.com
  user_exists BOOLEAN;
BEGIN
  -- Periksa apakah user dengan ID tersebut ada
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = admin_user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE NOTICE 'User dengan ID % tidak ditemukan', admin_user_id;
    RETURN;
  END IF;
  
  -- Tambahkan ke tabel admins
  INSERT INTO public.admins (user_id)
  VALUES (admin_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update user_metadata untuk role admin
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN 
        jsonb_build_object('role', 'admin', 'registration_status', 'approved')
      ELSE 
        raw_user_meta_data || 
        jsonb_build_object('role', 'admin', 'registration_status', 'approved')
    END
  WHERE id = admin_user_id;
  
  RAISE NOTICE 'Admin berhasil ditambahkan: %', admin_user_id;
END
$$; 