import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});