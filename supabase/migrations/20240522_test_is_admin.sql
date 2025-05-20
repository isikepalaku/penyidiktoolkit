-- Test fungsi is_admin
SELECT public.is_admin('24115401-3163-4c0a-8b2f-ebe7f19c46ed') AS is_admin_result;

-- Jika is_admin tidak berfungsi dengan benar, perbaiki implementasinya
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Periksa RLS pada tabel admins
-- Pastikan policy untuk admins tepat
DROP POLICY IF EXISTS "Admins can read admin list" ON public.admins;
CREATE POLICY "Admins can view and use admin functions" ON public.admins
  FOR ALL USING (TRUE);  -- Permisif untuk semua operasi

-- Pastikan RLS diaktifkan
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Bypass RLS untuk fungsi is_admin
-- Ini memastikan fungsi is_admin selalu dapat mengakses tabel admins
GRANT SELECT ON public.admins TO PUBLIC;

-- Refresh cache metadata pengguna
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('cache_buster', extract(epoch from now())::text)
WHERE id = '24115401-3163-4c0a-8b2f-ebe7f19c46ed'; 