// Follow this setup guide to integrate the Deno runtime successfully: https://docs.supabase.com/reference/javascript/installing-and-importing
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
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
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          }
        })
      }
    }

    // Parse request body
    const { userId } = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId diperlukan' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
        }
      })
    }

    // Update user metadata untuk mengubah status
    // PENTING: Gunakan supabase admin client dengan service role key
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: { registration_status: 'approved' } }
    )

    if (updateError) {
      console.error('Error updating user:', updateError)
      return new Response(JSON.stringify({ error: 'Gagal menyetujui pengguna' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
        }
      })
    }

    // Opsional: Kirim email ke user bahwa akun mereka telah disetujui
    // Implementasi pengiriman email di sini

    return new Response(
      JSON.stringify({ 
        message: 'Pengguna berhasil disetujui', 
        user: { 
          id: updatedUser.user.id,
          email: updatedUser.user.email,
          user_metadata: updatedUser.user.user_metadata
        } 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
        }
      }
    )
  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan server' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      }
    })
  }
})

/* To invoke:
  1. Install Supabase CLI (https://supabase.com/docs/guides/cli)
  2. Run: supabase functions serve admin
  3. Use curl or a client to make a POST request:
     curl -i --location --request POST 'http://localhost:54321/functions/v1/admin/approve-user' \
       --header 'Authorization: Bearer [USER_TOKEN]' \
       --header 'Content-Type: application/json' \
       --data '{"userId":"[USER_ID]"}'
*/ 