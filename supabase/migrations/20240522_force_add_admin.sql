-- Force add admin dengan SQL sederhana
-- Langsung insert ke tabel admins, jika sudah ada abaikan
INSERT INTO public.admins (user_id) 
VALUES ('24115401-3163-4c0a-8b2f-ebe7f19c46ed')
ON CONFLICT (user_id) DO NOTHING;

-- Set role admin dan status approved di user_metadata
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      '{"role": "admin", "registration_status": "approved"}'::jsonb
    ELSE 
      raw_user_meta_data || 
      '{"role": "admin", "registration_status": "approved"}'::jsonb
  END
WHERE id = '24115401-3163-4c0a-8b2f-ebe7f19c46ed';

-- Cek hasilnya
SELECT id, email, raw_user_meta_data FROM auth.users 
WHERE id = '24115401-3163-4c0a-8b2f-ebe7f19c46ed';

SELECT * FROM public.admins 
WHERE user_id = '24115401-3163-4c0a-8b2f-ebe7f19c46ed'; 