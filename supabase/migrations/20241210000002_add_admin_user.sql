-- Add admin user to admins table
-- This migration adds the hard-coded admin user from AdminPanel.tsx

-- Insert admin user (user ID from AdminPanel.tsx hard-coded bypass)
INSERT INTO admins (user_id) 
VALUES ('24115401-3163-4c0a-8b2f-ebe7f19c46ed'::uuid)
ON CONFLICT (user_id) DO NOTHING;

-- Also update the user metadata to include admin role
UPDATE auth.users 
SET user_metadata = COALESCE(user_metadata, '{}'::jsonb) || '{"role": "admin", "registration_status": "approved"}'::jsonb
WHERE id = '24115401-3163-4c0a-8b2f-ebe7f19c46ed'::uuid; 