-- Add first admin
-- CATATAN: Ganti email di bawah dengan email admin yang sudah terdaftar

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Dapatkan ID dari email admin (ganti dengan email admin yang sebenarnya)
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@penyidiktoolkit.id'; -- GANTI DENGAN EMAIL ADMIN YANG BENAR
  
  -- Jika user dengan email tersebut ditemukan
  IF admin_user_id IS NOT NULL THEN
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
  ELSE
    RAISE NOTICE 'User dengan email tersebut tidak ditemukan';
  END IF;
END
$$; 