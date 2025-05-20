-- CATATAN: Ini adalah contoh cara menambahkan admin pertama ke sistem
-- Ganti EMAIL_ADMIN_PERTAMA dengan email admin yang sebenarnya
-- Pastikan user dengan email tersebut sudah terdaftar terlebih dahulu di auth.users

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Dapatkan ID pengguna dari email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@penyidiktoolkit.id' -- Ganti dengan email admin yang sebenarnya
  LIMIT 1;

  -- Jika pengguna ditemukan, tambahkan sebagai admin
  IF admin_user_id IS NOT NULL THEN
    -- Tambahkan ke tabel admins jika belum ada
    INSERT INTO public.admins (user_id)
    VALUES (admin_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Update user_metadata untuk mengatur role admin
    UPDATE auth.users
    SET raw_user_meta_data = 
      CASE WHEN raw_user_meta_data IS NULL 
        THEN jsonb_build_object('role', 'admin')
        ELSE raw_user_meta_data || jsonb_build_object('role', 'admin')
      END,
      raw_user_meta_data = 
      CASE WHEN raw_user_meta_data IS NULL 
        THEN jsonb_build_object('registration_status', 'approved')
        ELSE raw_user_meta_data || jsonb_build_object('registration_status', 'approved')
      END
    WHERE id = admin_user_id;

    RAISE NOTICE 'Admin berhasil ditambahkan: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Pengguna dengan email tersebut tidak ditemukan';
  END IF;
END
$$; 