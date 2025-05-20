-- Cek apakah tabel user_profiles ada
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    -- Jika tabel ada, cek struktur kolom
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles' 
      AND column_name = 'user_id'
    ) THEN
      -- Jika kolom user_id tidak ada tapi kolom id ada, atur ulang dengan benar
      ALTER TABLE public.user_profiles 
      ADD COLUMN user_id UUID NOT NULL DEFAULT gen_random_uuid();
      
      -- Jika id ada, setelkan nilai user_id = id
      UPDATE public.user_profiles SET user_id = id;
      
      -- Tambahkan foreign key
      ALTER TABLE public.user_profiles 
      ADD CONSTRAINT user_profiles_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  ELSE
    -- Jika tabel tidak ada, buat dengan struktur yang benar
    CREATE TABLE public.user_profiles (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT,
      registration_status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_user_profile UNIQUE (user_id)
    );
  END IF;
END
$$;

-- Perbaiki trigger untuk auth.users -> user_profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, registration_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'registration_status', 'pending')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', EXCLUDED.full_name),
    registration_status = COALESCE(NEW.raw_user_meta_data->>'registration_status', EXCLUDED.registration_status),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Jalankan trigger untuk semua user yang sudah ada
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM auth.users
  LOOP
    INSERT INTO public.user_profiles (user_id, full_name, registration_status)
    VALUES (
      r.id,
      COALESCE(r.raw_user_meta_data->>'full_name', r.raw_user_meta_data->>'name', ''),
      COALESCE(r.raw_user_meta_data->>'registration_status', 'pending')
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = COALESCE(r.raw_user_meta_data->>'full_name', r.raw_user_meta_data->>'name', EXCLUDED.full_name),
      registration_status = COALESCE(r.raw_user_meta_data->>'registration_status', EXCLUDED.registration_status),
      updated_at = NOW();
  END LOOP;
END
$$; 