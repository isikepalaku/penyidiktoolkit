-- =====================================================
-- SUPABASE SECURITY ROLLBACK SCRIPT
-- Gunakan script ini jika ada masalah setelah menjalankan security fixes
-- =====================================================

-- 1. ROLLBACK: Disable RLS untuk tabel yang bermasalah
-- HANYA GUNAKAN JIKA BENAR-BENAR DIPERLUKAN DAN SEMENTARA

-- Disable RLS untuk upsertion_records (SEMENTARA)
-- ALTER TABLE public.upsertion_records DISABLE ROW LEVEL SECURITY;

-- Disable RLS untuk n8n_chat_histories (SEMENTARA)
-- ALTER TABLE public.n8n_chat_histories DISABLE ROW LEVEL SECURITY;

-- Disable RLS untuk user_profiles_backup (SEMENTARA)
-- ALTER TABLE public.user_profiles_backup DISABLE ROW LEVEL SECURITY;

-- 2. ROLLBACK: Hapus policies yang bermasalah
DROP POLICY IF EXISTS "Users can only access their own upsertion records" ON public.upsertion_records;
DROP POLICY IF EXISTS "Users can only access their own chat histories" ON public.n8n_chat_histories;
DROP POLICY IF EXISTS "Users can only access their own profile backup" ON public.user_profiles_backup;

-- 3. ROLLBACK: Kembalikan akses anon jika diperlukan aplikasi
-- HATI-HATI: Ini akan membuka akses ke semua user anonymous
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.upsertion_records TO anon;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.n8n_chat_histories TO anon;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles_backup TO anon;

-- 4. ROLLBACK: Hapus functions keamanan
DROP FUNCTION IF EXISTS public.is_owner(text);
DROP FUNCTION IF EXISTS public.is_admin();

-- 5. ROLLBACK: Buat ulang view users_with_status jika diperlukan
-- HATI-HATI: Ini akan mengekspos data auth.users
-- CREATE VIEW public.users_with_status AS
-- SELECT * FROM auth.users;

-- =====================================================
-- VERIFIKASI ROLLBACK
-- =====================================================

-- Cek status RLS setelah rollback
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS Enabled (Secure)'
    ELSE '⚠️ RLS Disabled (Insecure)'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Cek policies yang tersisa
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- CATATAN ROLLBACK
-- =====================================================

/*
SETELAH ROLLBACK:

1. ⚠️ KEAMANAN BERKURANG - Database kembali ke state tidak aman
2. Peringatan Supabase akan muncul kembali
3. Data user bisa diakses oleh role anon
4. Segera implementasikan solusi keamanan yang tepat

LANGKAH SELANJUTNYA:
1. Identifikasi masalah spesifik yang menyebabkan rollback
2. Perbaiki kode aplikasi untuk kompatibel dengan RLS
3. Test security fixes di environment development
4. Re-implement security fixes secara bertahap
5. Monitor aplikasi untuk memastikan tidak ada breaking changes

JANGAN BIARKAN DATABASE TANPA RLS DALAM PRODUCTION!
*/ 