-- =====================================================
-- SUPABASE SECURITY FIXES
-- Memperbaiki peringatan keamanan dari dashboard Supabase
-- =====================================================

-- 1. PERBAIKAN: Exposed Auth Users (users_with_status view)
-- Menghapus view yang mengekspos data auth.users ke role anon
DROP VIEW IF EXISTS public.users_with_status;

-- Jika view ini diperlukan, buat ulang dengan RLS yang proper
-- CREATE VIEW public.users_with_status AS
-- SELECT 
--   id,
--   email,
--   created_at,
--   -- Jangan ekspos data sensitif seperti encrypted_password, email_confirmed_at, dll
--   CASE 
--     WHEN auth.uid() = id THEN 'active'
--     ELSE 'unknown'
--   END as status
-- FROM auth.users
-- WHERE auth.uid() = id; -- Hanya user yang login bisa lihat data sendiri

-- 2. PERBAIKAN: RLS Disabled - Enable RLS untuk semua tabel public
-- Enable RLS untuk tabel upsertion_records
ALTER TABLE public.upsertion_records ENABLE ROW LEVEL SECURITY;

-- Enable RLS untuk tabel n8n_chat_histories  
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Enable RLS untuk tabel user_profiles_backup
ALTER TABLE public.user_profiles_backup ENABLE ROW LEVEL SECURITY;

-- 3. BUAT RLS POLICIES YANG AMAN

-- Policy untuk upsertion_records - hanya user yang login bisa akses data sendiri
CREATE POLICY "Users can only access their own upsertion records" 
ON public.upsertion_records 
FOR ALL 
USING (auth.uid()::text = user_id);

-- Policy untuk n8n_chat_histories - hanya user yang login bisa akses data sendiri
CREATE POLICY "Users can only access their own chat histories" 
ON public.n8n_chat_histories 
FOR ALL 
USING (auth.uid()::text = user_id);

-- Policy untuk user_profiles_backup - hanya user yang login bisa akses data sendiri
CREATE POLICY "Users can only access their own profile backup" 
ON public.user_profiles_backup 
FOR ALL 
USING (auth.uid() = id);

-- 4. TAMBAHAN KEAMANAN: Revoke akses anon dari tabel sensitif
-- Revoke semua akses anon dari tabel yang mengandung data user
REVOKE ALL ON public.upsertion_records FROM anon;
REVOKE ALL ON public.n8n_chat_histories FROM anon;
REVOKE ALL ON public.user_profiles_backup FROM anon;

-- Grant akses hanya untuk authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upsertion_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.n8n_chat_histories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles_backup TO authenticated;

-- 5. AUDIT: Cek tabel lain yang mungkin perlu RLS
-- Jalankan query ini untuk melihat tabel public lain yang belum ada RLS:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND rowsecurity = false;

-- 6. KEAMANAN TAMBAHAN: Buat function untuk validasi user
CREATE OR REPLACE FUNCTION public.is_owner(user_id text)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid()::text = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. KEAMANAN TAMBAHAN: Buat function untuk validasi admin (jika diperlukan)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Ganti dengan logic admin yang sesuai
  RETURN auth.jwt() ->> 'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFIKASI KEAMANAN
-- =====================================================

-- Cek apakah RLS sudah enabled untuk semua tabel
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Cek policies yang ada
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- CATATAN PENTING
-- =====================================================

/*
SETELAH MENJALANKAN SCRIPT INI:

1. Verifikasi bahwa aplikasi masih berfungsi normal
2. Test login/logout functionality
3. Test akses data user
4. Pastikan tidak ada error di console browser
5. Cek dashboard Supabase untuk konfirmasi peringatan hilang

JIKA ADA MASALAH:
- Backup database sebelum menjalankan script ini
- Test di environment development dulu
- Siapkan rollback plan jika diperlukan

UNTUK TABEL BARU DI MASA DEPAN:
- Selalu enable RLS: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
- Buat policy yang sesuai untuk setiap tabel
- Revoke akses anon jika tidak diperlukan
- Grant akses authenticated sesuai kebutuhan
*/ 