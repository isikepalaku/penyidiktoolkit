-- =================================================================
-- 1. Enable necessary extensions
-- =================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- 2. Recreate Tables with IF NOT EXISTS to be safe
-- =================================================================

-- Table: user_files
CREATE TABLE IF NOT EXISTS public.user_files (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_filename text NOT NULL,
    stored_filename text NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL CHECK (file_size > 0),
    file_type text NOT NULL,
    file_extension text NOT NULL,
    s3_bucket text NOT NULL DEFAULT 'dokumen',
    s3_key text NOT NULL UNIQUE,
    s3_url text NOT NULL,
    etag text,
    category text DEFAULT 'document'::text CHECK (category = ANY (ARRAY['document'::text, 'image'::text, 'video'::text, 'audio'::text, 'other'::text])),
    folder_path text DEFAULT '/'::text,
    tags text[],
    description text,
    upload_status text DEFAULT 'uploading'::text CHECK (upload_status = ANY (ARRAY['uploading'::text, 'completed'::text, 'failed'::text, 'processing'::text])),
    processing_status text DEFAULT 'pending'::text CHECK (processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
    thumbnail_url text,
    is_public boolean DEFAULT false,
    access_level text DEFAULT 'private'::text CHECK (access_level = ANY (ARRAY['private'::text, 'shared'::text, 'public'::text])),
    password_protected boolean DEFAULT false,
    password_hash text,
    share_token text UNIQUE,
    share_expires_at timestamptz,
    download_count integer DEFAULT 0,
    view_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    processing_metadata jsonb DEFAULT '{}'::jsonb,
    access_log jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_accessed_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.user_files IS 'Stores metadata for user uploaded files with S3 integration';

-- Table: file_shares
CREATE TABLE IF NOT EXISTS public.file_shares (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL REFERENCES public.user_files(id) ON DELETE CASCADE,
    shared_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    share_type text DEFAULT 'private'::text CHECK (share_type = ANY (ARRAY['private'::text, 'public'::text, 'password'::text, 'link'::text])),
    share_token text NOT NULL UNIQUE,
    share_password_hash text,
    permissions jsonb DEFAULT '{"read": true, "comment": false, "download": true}'::jsonb,
    max_downloads integer DEFAULT 0 CHECK (max_downloads >= 0),
    download_count integer DEFAULT 0 CHECK (download_count >= 0),
    expires_at timestamptz,
    is_active boolean DEFAULT true,
    access_log jsonb DEFAULT '[]'::jsonb,
    last_accessed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.file_shares IS 'Manages file sharing between users with access control';

-- Table: user_storage_quotas
CREATE TABLE IF NOT EXISTS public.user_storage_quotas (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    total_quota bigint DEFAULT 1073741824, -- 1GB
    used_storage bigint DEFAULT 0 CHECK (used_storage >= 0),
    max_files integer DEFAULT 1000 CHECK (max_files > 0),
    current_file_count integer DEFAULT 0 CHECK (current_file_count >= 0),
    quota_type text DEFAULT 'basic'::text CHECK (quota_type = ANY (ARRAY['basic'::text, 'premium'::text, 'enterprise'::text, 'unlimited'::text])),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.user_storage_quotas IS 'Tracks storage usage and limits per user';

-- Table: upload_sessions
CREATE TABLE IF NOT EXISTS public.upload_sessions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token text NOT NULL UNIQUE,
    total_files integer NOT NULL,
    completed_files integer DEFAULT 0,
    failed_files integer DEFAULT 0,
    total_size bigint DEFAULT 0,
    uploaded_size bigint DEFAULT 0,
    status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'uploading'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])),
    progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);
COMMENT ON TABLE public.upload_sessions IS 'Monitors file upload sessions for progress tracking';


-- =================================================================
-- 3. RLS Policies (Idempotent: DROP IF EXISTS, then CREATE)
-- =================================================================

-- RLS for user_files
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own files" ON public.user_files;
CREATE POLICY "Users can manage their own files" ON public.user_files
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public access for shared files" ON public.user_files;
CREATE POLICY "Allow public access for shared files" ON public.user_files
    FOR SELECT
    USING (is_public = true AND access_level = 'public'::text);

-- RLS for file_shares
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage shares they created" ON public.file_shares;
CREATE POLICY "Users can manage shares they created" ON public.file_shares
    FOR ALL
    USING (auth.uid() = shared_by_user_id)
    WITH CHECK (auth.uid() = shared_by_user_id);

DROP POLICY IF EXISTS "Users can view files shared with them" ON public.file_shares;
CREATE POLICY "Users can view files shared with them" ON public.file_shares
    FOR SELECT
    USING (auth.uid() = shared_with_user_id);

-- RLS for user_storage_quotas
ALTER TABLE public.user_storage_quotas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own storage quota" ON public.user_storage_quotas;
CREATE POLICY "Users can view their own storage quota" ON public.user_storage_quotas
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS for upload_sessions
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own upload sessions" ON public.upload_sessions;
CREATE POLICY "Users can manage their own upload sessions" ON public.upload_sessions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =================================================================
-- 4. Helper Functions and Triggers
-- =================================================================

-- Function to create a storage quota entry for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_storage_quotas (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Function to update storage usage
CREATE OR REPLACE FUNCTION public.update_storage_usage()
RETURNS TRIGGER AS $$
DECLARE
    file_size_delta bigint;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        file_size_delta := NEW.file_size;
        UPDATE public.user_storage_quotas
        SET 
            used_storage = used_storage + file_size_delta,
            current_file_count = current_file_count + 1
        WHERE user_id = NEW.user_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        file_size_delta := OLD.file_size;
        UPDATE public.user_storage_quotas
        SET 
            used_storage = used_storage - file_size_delta,
            current_file_count = current_file_count - 1
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update storage quota on file insert/delete
DROP TRIGGER IF EXISTS on_user_file_change ON public.user_files;
CREATE TRIGGER on_user_file_change
    AFTER INSERT OR DELETE ON public.user_files
    FOR EACH ROW EXECUTE FUNCTION public.update_storage_usage(); 