import type { ExtendedAgent } from '../../types';

export const imagePrompts = {
  default: `PENTING: Berikan analisis dalam Bahasa Indonesia yang formal dan profesional.

Lakukan analisis gambar berikut:

A. Analisis Umum:
1. Identifikasi dan deskripsi semua objek dalam gambar
2. Pembacaan teks atau tulisan (jika ada)
3. Identifikasi pola dan elemen visual penting
4. Perkiraan usia objek dan kondisinya
5. Temuan penting lainnya

B. Analisis Investigatif:
1. Identifikasi objek utama dan sekunder
2. Indikasi waktu dan lokasi
3. Kondisi pencahayaan dan sudut pengambilan gambar
4. Detail penting untuk investigasi
5. Anomali atau hal mencurigakan
6. Rekomendasi tindak lanjut

Format hasil analisis harus terstruktur dan mudah dibaca.`,
  
  forensic: `PENTING: Berikan analisis dalam Bahasa Indonesia yang formal dan profesional.

Lakukan analisis forensik berikut:

A. Analisis Dasar:
1. Identifikasi objek dan detailnya
2. Pembacaan teks dan tulisan
3. Pola dan elemen visual penting
4. Kondisi dan usia perkiraan objek
5. Temuan penting lainnya

B. Analisis Forensik:
1. Kualitas dan Resolusi:
   - Detail resolusi gambar
   - Noise dan artifak
   - Area terdistorsi

2. Metadata dan Teknis:
   - Indikasi manipulasi
   - Pola kompresi
   - Detail EXIF
   - Pencahayaan dan bayangan

3. Analisis Detail:
   - Anomali visual
   - Pola tidak biasa
   - Tanda modifikasi
   - Ketidaksesuaian visual

4. Konteks:
   - Analisis lingkungan sekitar
   - Hubungan antar objek
   - Indikator waktu dan lokasi
   - Kondisi pencahayaan

5. Rekomendasi:
   - Pengumpulan bukti tambahan
   - Analisis lanjutan yang diperlukan
   - Area yang perlu pemeriksaan detail
   - Langkah verifikasi

Format hasil analisis harus terstruktur dengan penekanan pada aspek forensik.`,

  // Tambahkan jenis prompt lain sesuai kebutuhan
};

export const imageAgent: ExtendedAgent = {
  id: '4',
  name: 'Analisis Gambar',
  type: 'image',
  status: 'on',
  description: 'Menganalisis gambar menggunakan computer vision dan AI untuk mendapatkan informasi detail',
  fields: [
    {
      id: 'image_file',
      label: 'Upload Gambar',
      type: 'file',
      placeholder: 'Pilih file gambar untuk dianalisis...',
      accept: 'image/*'  // Hanya menerima file gambar
    },
    {
      id: 'image_description',
      label: 'Deskripsi Tambahan (Opsional)',
      type: 'textarea',
      placeholder: 'Berikan deskripsi atau konteks tambahan tentang gambar...'
    }
  ]
};