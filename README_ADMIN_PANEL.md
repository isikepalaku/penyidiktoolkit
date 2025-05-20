# Sistem Admin Panel - PenyidikToolkit

Dokumen ini berisi petunjuk implementasi sistem admin panel yang mengelola pengguna dengan status pendaftaran "pending" yang memerlukan persetujuan admin.

## Masalah Umum dan Solusi

### Database Error Saving New User

Jika Anda melihat error "Database error saving new user" saat login dengan OAuth, ini disebabkan oleh masalah saat Supabase mencoba menyimpan data pengguna baru ke database. Berikut cara mengatasinya:

1. Pastikan tabel dan trigger dibuat dengan benar di database Supabase:
   - Eksekusi file SQL migration `20240520_create_admin_tables.sql`
   - Eksekusi file SQL untuk membuat tabel `user_profiles` dan trigger

2. Pastikan file `AuthCallback.tsx` menangani error dengan benar

3. Periksa pengaturan OAuth Provider di Supabase:
   - Pastikan Redirect URL = `http://localhost:3000/auth/callback` (untuk development)
   - Pastikan Client ID dan Secret diisi dengan benar

## Komponen Sistem

1. **Panel Admin (AdminPanel.tsx)**: 
   - Interface untuk melihat pengguna yang menunggu persetujuan dan yang telah disetujui
   - Tombol untuk menyetujui atau menolak pendaftaran

2. **Edge Functions**:
   - `admin/list-users.ts`: Mengambil daftar pengguna berdasarkan status
   - `admin/approve-user.ts`: Menyetujui pendaftaran pengguna
   - `admin/reject-user.ts`: Menolak pendaftaran pengguna

3. **SQL Functions**:
   - `get_users_with_status()`: Mendapatkan semua pengguna dengan status pendaftaran
   - `is_admin(user_id)`: Memeriksa apakah pengguna adalah admin

4. **Tabel Database**:
   - `admins`: Menyimpan daftar ID pengguna yang memiliki akses admin
   - `user_profiles`: Menyimpan informasi tambahan pengguna (opsional)

## Petunjuk Implementasi

### 1. Setup Database

1. Jalankan file migrasi SQL untuk membuat tabel dan fungsi:
   ```bash
   cd supabase
   supabase db reset
   # Atau eksekusi manual SQL di Supabase Dashboard
   ```

2. Tambahkan admin pertama:
   - Edit `supabase/migrations/20240520_add_first_admin.sql` dan ganti `admin@penyidiktoolkit.id` dengan email admin yang sudah terdaftar
   - Jalankan file SQL tersebut

### 2. Deploy Edge Functions

1. Setiap folder dalam `supabase/functions` perlu memiliki file `index.ts`:
   ```
   supabase/functions/admin/
   ├── approve-user.ts
   ├── index.ts
   ├── list-users.ts
   └── reject-user.ts
   ```

2. File `index.ts` harus mengekspor semua handler:
   ```typescript
   export * from './approve-user';
   export * from './list-users';
   export * from './reject-user';
   ```

3. Deploy fungsi menggunakan Supabase CLI:
   ```bash
   supabase login
   supabase functions deploy admin --project-ref YOUR_PROJECT_REF
   ```

   Atau gunakan Supabase Dashboard > Edge Functions > New Function

### 3. Konfigurasi Environment Variables

1. Tambahkan di file `.env`:
   ```
   VITE_SUPABASE_FUNCTIONS_URL=https://[your-project-id].supabase.co/functions/v1
   ```

2. Tetapkan variabel di Edge Functions:
   - Supabase Dashboard > Project Settings > API
   - Copy `anon public` dan `service_role` keys
   - Supabase Dashboard > Edge Functions > Settings
   - Tambahkan:
     ```
     SUPABASE_URL=https://[your-project-id].supabase.co
     SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
     ```

## Pengujian

1. Mendaftar pengguna baru:
   - Gunakan formulir pendaftaran atau OAuth
   - Status registrasi akan otomatis diset ke "pending"

2. Login sebagai admin:
   - Gunakan akun yang telah ditambahkan ke tabel `admins`
   - Akses `/admin` untuk melihat panel admin

3. Menyetujui/menolak pengguna:
   - Dalam panel admin, klik tombol "Setujui" atau "Tolak"

## Troubleshooting

- **Edge Functions Tidak Bisa Diakses**: Periksa nilai `VITE_SUPABASE_FUNCTIONS_URL` dan pastikan fungsi sudah di-deploy
- **Error Database**: Pastikan semua tabel dan trigger sudah dibuat dengan benar
- **Auth Error**: Periksa pengaturan OAuth dan redirect URLs di Supabase Dashboard

## Struktur Database

```sql
-- Tabel admin
CREATE TABLE public.admins (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_admin_user UNIQUE (user_id)
);

-- Tabel profil pengguna (opsional)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  registration_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Cara Deployment

### 1. Migrasi Database

1. Jalankan file SQL migrasi untuk membuat:
   - Tabel `admins`
   - Function `get_users_by_status`
   - Tipe `user_with_status`

```bash
cd supabase
supabase db push
```

### 2. Deploy Edge Functions

1. Deploy semua Edge Functions ke Supabase:

```bash
cd supabase
supabase functions deploy admin --project-ref YOUR_PROJECT_REF
```

Ganti `YOUR_PROJECT_REF` dengan referensi proyek Supabase Anda (dapat dilihat di dashboard).

### 3. Konfigurasi Environment Variables

1. Setup variable berikut di file `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_SUPABASE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1
```

2. Pastikan juga variable berikut dikonfigurasi di Supabase Dashboard (Project Settings > Functions):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (service role key)
```

### 4. Menambahkan Admin Pertama

Untuk menambahkan admin pertama, ada dua opsi:

#### Opsi 1: Melalui SQL

1. Edit file `supabase/migrations/20240518_add_first_admin.sql`
2. Ganti `'admin@penyidiktoolkit.id'` dengan email admin yang sebenarnya
3. Jalankan migrasi:

```bash
cd supabase
supabase db push
```

#### Opsi 2: Melalui Supabase Dashboard

1. Buka Supabase Dashboard
2. Buka tabel `admins` di Database
3. Tambahkan entri baru dengan user_id pengguna yang akan dijadikan admin
4. Update `raw_user_meta_data` pada pengguna tersebut di auth.users:

```json
{
  "role": "admin",
  "registration_status": "approved"
}
```

## Troubleshooting

### Error "Failed to fetch"

1. **Edge Function belum di-deploy**: 
   - Pastikan semua Edge Functions telah di-deploy dengan benar
   - Periksa Console untuk melihat apakah URL yang digunakan sudah benar

2. **Variabel lingkungan salah**:
   - Pastikan `VITE_SUPABASE_FUNCTIONS_URL` diatur dengan benar di `.env`
   - Format yang benar: `https://your-project.supabase.co/functions/v1`

3. **CORS Issues**:
   - Edge Functions sudah dikonfigurasi dengan CORS, tetapi pastikan domain aplikasi diizinkan

4. **Service Role Key tidak diatur**:
   - Periksa apakah `SUPABASE_SERVICE_ROLE_KEY` diatur dengan benar di Project Settings

### Menggunakan Fallback RPC

Jika Edge Functions belum tersedia, sistem otomatis menggunakan fungsi RPC `get_users_by_status` sebagai fallback.

Untuk memastikan ini berfungsi:
1. Pastikan file migrasi sudah dijalankan
2. Pengguna admin sudah diatur
3. Tabel `admins` berisi entri yang benar

## Keamanan

Sistem ini mengimplementasikan kontrol keamanan berikut:

1. **Row Level Security (RLS)** pada tabel `admins`
2. **Service Role Key** hanya digunakan di Edge Functions, tidak di klien
3. **Otorisasi admin** diverifikasi di setiap endpoint Edge Function
4. **Error handling** yang tidak mengungkapkan informasi sensitif ke klien

## Alur kerja pengguna

1. Pengguna mendaftar → Status otomatis diatur "pending"
2. Admin melihat pengguna dengan status "pending" di AdminPanel
3. Admin menyetujui/menolak pengguna
4. Pengguna dapat masuk hanya setelah disetujui

## Pengembangan Selanjutnya

Fitur yang bisa ditambahkan di masa depan:

1. Notifikasi email ke pengguna saat pendaftaran disetujui/ditolak
2. Panel khusus untuk manajemen admin (tambah/hapus admin)
3. Logging aktivitas admin untuk audit trail
4. Filter dan pencarian untuk pengguna di AdminPanel 