-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_admin_user UNIQUE (user_id)
);

-- Initialize the RLS for the admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Policy untuk admin melihat tabel admin
CREATE POLICY "Admins can read admin list" ON public.admins
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get users with their registration status
CREATE OR REPLACE FUNCTION public.get_users_with_status()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  registration_status TEXT,
  full_name TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    COALESCE(u.raw_user_meta_data->>'registration_status', 'pending')::TEXT as registration_status,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')::TEXT as full_name
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql; 