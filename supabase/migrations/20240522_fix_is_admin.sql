-- Hapus terlebih dahulu fungsi yang ada
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Kemudian buat ulang fungsi is_admin
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins a WHERE a.user_id = uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test fungsi is_admin
SELECT public.is_admin('24115401-3163-4c0a-8b2f-ebe7f19c46ed') AS is_admin_result;

-- Pastikan RLS pada tabel admins dikonfigurasi dengan benar
-- Hapus semua policy yang ada untuk menghindari konflik
DROP POLICY IF EXISTS "Admins can read admin list" ON public.admins;
DROP POLICY IF EXISTS "Admins can view and use admin functions" ON public.admins;

-- Buat policy baru yang permisif
CREATE POLICY "Anyone can view admins" ON public.admins
  FOR SELECT USING (TRUE);
  
-- Policy untuk operasi insert/update/delete hanya untuk admin
CREATE POLICY "Admins can modify admins" ON public.admins
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Pastikan RLS diaktifkan
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Grant select pada tabel admins ke semua user (public)
GRANT SELECT ON public.admins TO PUBLIC; 