-- Hapus terlebih dahulu fungsi yang ada
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Kemudian buat ulang fungsi is_admin dengan parameter berbeda nama
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