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
  },
  global: {
    fetch: async (url, options = {}) => {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Supabase Error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });

          if (response.status === 429) {
            throw new Error('Terlalu banyak permintaan ke database. Silakan tunggu beberapa saat.');
          }

          if (response.status === 401) {
            throw new Error('Unauthorized: Token tidak valid atau kadaluarsa');
          }

          if (response.status === 403) {
            throw new Error('Forbidden: Tidak memiliki akses ke resource ini');
          }

          throw new Error(`Database error: ${response.status} - ${errorText}`);
        }

        return response;
      } catch (error) {
        console.error('Supabase Request Error:', error);
        throw error;
      }
    }
  }
});

// Add error handler for auth state changes
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || 
      event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
    console.log('Auth state changed:', event);
  }
});