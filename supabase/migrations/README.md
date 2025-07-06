# Admin Functions Migration

## Overview
This migration creates the required RPC functions for the AdminPanel.tsx component to work properly.

## Files Created
- `20241210000001_create_admin_functions.sql` - Creates RPC functions and admin table
- `20241210000002_add_admin_user.sql` - Adds the initial admin user

## What This Migration Does

### 1. Creates RPC Functions
- `is_admin(p_user_id uuid)` - Checks if a user is an admin
- `approve_user(p_user_id uuid)` - Approves a user registration
- `reject_user(p_user_id uuid)` - Rejects a user registration
- `get_users_with_status()` - Gets all users with their registration status

### 2. Creates Admin Table
- Creates `admins` table with proper RLS policies
- Only admins can access admin records

### 3. Adds Initial Admin User
- Adds the hard-coded admin user from AdminPanel.tsx
- Sets proper user metadata for admin role

## How to Apply

### Method 1: Using Supabase CLI (Recommended)
```bash
# Apply migrations
supabase db push

# Or apply specific migration
supabase db push --include-all
```

### Method 2: Using Supabase Dashboard
1. Go to Supabase Dashboard > SQL Editor
2. Copy and paste the content of `20241210000001_create_admin_functions.sql`
3. Run the SQL
4. Copy and paste the content of `20241210000002_add_admin_user.sql`
5. Run the SQL

## What Gets Fixed

### Before Migration
- ❌ `reject_user` function not found (404 error)
- ❌ CORS error for Edge Functions
- ❌ Auth API forbidden (403 error)

### After Migration
- ✅ RPC functions available and working
- ✅ CORS headers fixed in Edge Functions
- ✅ Admin user properly configured
- ✅ User approval/rejection flow working

## Security Features

### RLS Policies
- `admins` table has Row Level Security enabled
- Only admins can access admin records
- Functions use SECURITY DEFINER for proper permissions

### Function Permissions
- Functions granted to `authenticated` role only
- No anonymous access to admin functions
- Proper error handling for unauthorized access

## Testing

After applying the migration, test the following:

1. **Admin Check**: Admin panel should load properly
2. **User Approval**: Should be able to approve pending users
3. **User Rejection**: Should be able to reject pending users
4. **User Listing**: Should see proper user lists with status

## Troubleshooting

### Function Not Found Error
- Ensure migration was applied successfully
- Check function exists: `SELECT * FROM pg_proc WHERE proname = 'reject_user';`

### CORS Error
- Edge Functions have been updated with proper CORS headers
- Ensure functions are deployed: `supabase functions deploy`

### Permission Denied
- Check user is in `admins` table
- Verify user metadata has `role: admin`

## Migration Rollback

If needed, you can rollback by:
```sql
-- Drop functions
DROP FUNCTION IF EXISTS is_admin(uuid);
DROP FUNCTION IF EXISTS approve_user(uuid);
DROP FUNCTION IF EXISTS reject_user(uuid);
DROP FUNCTION IF EXISTS get_users_with_status();

-- Drop admin table
DROP TABLE IF EXISTS admins;
```

## Environment Variables

Ensure these are set in your Supabase Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Support

If you encounter issues:
1. Check Supabase logs for detailed error messages
2. Verify migration was applied correctly
3. Test functions individually in SQL Editor
4. Check Edge Function deployment status 