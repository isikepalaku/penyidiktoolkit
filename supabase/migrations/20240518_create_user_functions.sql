-- Create type for user result
CREATE TYPE public.user_with_status AS (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  registration_status TEXT,
  full_name TEXT
);

-- Create function to get users by status
-- Ini membutuhkan tabel 'admins' yang berisi ID admin
CREATE OR REPLACE FUNCTION public.get_users_by_status(status_param TEXT)
RETURNS SETOF public.user_with_status
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  calling_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Get ID pengguna yang memanggil
  calling_user_id := auth.uid();
  
  -- Periksa apakah pengguna adalah admin
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = calling_user_id
  ) INTO is_admin;
  
  -- Jika bukan admin, kembalikan set kosong
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya admin yang dapat mengakses data pengguna';
  END IF;
  
  -- Mengembalikan pengguna dengan status yang ditentukan
  -- Karena auth.users tidak dapat diakses langsung melalui RPC,
  -- kita menggunakan view users_with_status yang dibuat lebih awal
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    COALESCE(u.raw_user_meta_data->>'registration_status', 'unknown')::TEXT,
    COALESCE(u.raw_user_meta_data->>'full_name', '')::TEXT
  FROM
    auth.users u
  WHERE
    u.raw_user_meta_data->>'registration_status' = status_param
  ORDER BY
    u.created_at DESC;
END;
$$;

-- Berikan hak akses sesuai kebutuhan
GRANT EXECUTE ON FUNCTION public.get_users_by_status(TEXT) TO authenticated;

-- Membuat tabel admins jika belum ada
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Tambahkan RLS pada tabel admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Izinkan admin melihat pengguna admin lain
CREATE POLICY "Admins can see other admins" ON public.admins
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Izinkan admin menambah/menghapus admin lain
CREATE POLICY "Admins can insert/delete other admins" ON public.admins
  FOR ALL
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  ); 