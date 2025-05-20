/// <reference types="https://deno.land/x/deno_types@0.168.0/index.d.ts" />
/// <reference no-default-lib="true" />
/// <reference lib="deno.ns" />
/// <reference lib="dom" />

// @ts-nocheck - File ini menggunakan Deno bukan Node.js

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// PENTING: Untuk produksi, ENV vars harus dikonfigurasi dengan benar
// di Supabase Dashboard > Project Settings > Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  // CORS headers untuk memungkinkan permintaan dari frontend
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }

  try {
    // Hanya izinkan metode POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method tidak diizinkan' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // Buat Supabase client dengan service role key
    // PENTING: Service role key memberikan akses penuh ke database
    // dan harus digunakan HANYA di backend yang aman seperti Edge Function ini
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Ambil auth token dari header Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header diperlukan' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // Format header: Bearer <token>
    const token = authHeader.replace('Bearer ', '')
    
    // Verifikasi token dan dapatkan user
    const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Token tidak valid' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // Verifikasi apakah pengguna yang memanggil fungsi ini adalah admin
    const isAdmin = callerUser.user_metadata?.role === 'admin'
    
    // Alternatif: cek dari tabel admin
    if (!isAdmin) {
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', callerUser.id)
        .single()
      
      if (adminError || !adminData) {
        return new Response(JSON.stringify({ error: 'Akses ditolak. Hanya admin yang dapat melakukan operasi ini.' }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        })
      }
    }

    // Parse request body untuk mendapatkan status yang diminta
    const { status } = await req.json()
    if (!status || !['pending', 'approved'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Parameter status diperlukan dan harus "pending" atau "approved"' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    console.log(`Fetching users with status: ${status}`);

    // Dapatkan daftar pengguna berdasarkan status dari tabel auth.users
    // CATATAN: Ini menggunakan Admin API, bukan kueri database biasa
    // karena auth.users tidak dapat diakses langsung melalui kueri biasa
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error("Error fetching users:", listError);
      return new Response(JSON.stringify({ error: 'Gagal mengambil daftar pengguna' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // Filter pengguna berdasarkan status registrasi dalam user_metadata
    const filteredUsers = users.filter(user => 
      user.user_metadata?.registration_status === status
    );

    console.log(`Found ${filteredUsers.length} users with status ${status}`);

    return new Response(JSON.stringify({ 
      users: filteredUsers.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata || {}
      }))
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })

  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan server' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
})

/* To invoke:
  1. Install Supabase CLI (https://supabase.com/docs/guides/cli)
  2. Run: supabase functions serve admin
  3. Use curl or a client to make a POST request:
     curl -i --location --request POST 'http://localhost:54321/functions/v1/admin/list-users' \
       --header 'Authorization: Bearer [USER_TOKEN]' \
       --header 'Content-Type: application/json' \
       --data '{"status":"pending"}'
*/ 