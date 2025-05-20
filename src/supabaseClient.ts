import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Tambahkan logging untuk debugging
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("SUPABASE CONFIG ERROR: Missing Supabase URL or Anon Key");
}

console.log("SUPABASE: Initializing client with URL:", supabaseUrl ? "URL exists" : "URL missing");

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}); 