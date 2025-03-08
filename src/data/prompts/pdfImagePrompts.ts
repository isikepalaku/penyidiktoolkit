/**
 * Prompt default untuk setiap jenis tugas analisis PDF dan gambar
 */

export const defaultPrompts = {
  summarize: {
    title: 'Ringkasan Dokumen',
    prompt: `Buatkan ringkasan komprehensif dari dokumen ini dengan memperhatikan:
- Poin-poin utama dari setiap bagian
- Informasi penting seperti tanggal, nama, dan angka
- Struktur dokumen secara keseluruhan
- Kesimpulan atau rekomendasi yang ada

Ringkasan harus mencakup:
1. Informasi umum (judul, jenis dokumen, tanggal)
2. Poin-poin utama (minimal 5 poin)
3. Ringkasan isi (3-5 paragraf)
4. Kesimpulan

Format output dalam Markdown yang terstruktur dan mudah dibaca.`
  },
  extract: {
    title: 'Ekstraksi Informasi',
    prompt: `Ekstrak informasi spesifik dari dokumen ini dengan fokus pada:
- Akurasi data yang diekstrak
- Format yang terstruktur dan mudah dibaca
- Konteks dari informasi yang diekstrak
- Penjelasan jika informasi tidak ditemukan

Informasi yang perlu diekstrak:
1. Nama-nama orang dan organisasi
2. Tanggal dan waktu
3. Lokasi
4. Angka dan statistik penting
5. Terminologi khusus
6. Referensi dan kutipan

Format output dalam tabel Markdown yang terstruktur dengan kolom untuk jenis informasi, nilai, dan konteks.`
  },
  compare: {
    title: 'Perbandingan Dokumen',
    prompt: `Bandingkan dokumen-dokumen ini dengan memperhatikan:
- Persamaan dan perbedaan utama
- Perubahan spesifik antar dokumen
- Implikasi dari perbedaan yang ditemukan
- Rekomendasi berdasarkan analisis

Analisis perbandingan harus mencakup:
1. Persamaan utama (minimal 3)
2. Perbedaan signifikan (minimal 5)
3. Analisis mendalam tentang perubahan
4. Implikasi dari perbedaan
5. Rekomendasi

Format output dalam Markdown yang terstruktur dengan bagian yang jelas untuk setiap aspek perbandingan.`
  },
  analyze: {
    title: 'Analisis Mendalam',
    prompt: `Lakukan analisis mendalam terhadap dokumen ini dengan memperhatikan:
- Struktur dan organisasi dokumen
- Argumen atau klaim utama
- Bukti pendukung yang disajikan
- Kesenjangan atau kelemahan dalam dokumen
- Implikasi dan signifikansi

Analisis harus mencakup:
1. Struktur dokumen
2. Argumen/klaim utama (minimal 3)
3. Bukti pendukung (minimal 3)
4. Kesenjangan/kelemahan (minimal 2)
5. Implikasi
6. Kesimpulan analisis

Format output dalam Markdown yang terstruktur dengan bagian yang jelas untuk setiap aspek analisis.`
  },
  chat: {
    title: 'Tanya Jawab',
    prompt: `Jawab pertanyaan pengguna tentang dokumen ini dengan:
- Informasi akurat berdasarkan isi dokumen
- Kutipan langsung jika relevan
- Penjelasan yang jelas dan ringkas
- Pengakuan jika informasi tidak tersedia dalam dokumen

Berikan jawaban dalam format yang mudah dibaca dan informatif.`
  }
};

/**
 * Mendapatkan prompt default berdasarkan jenis tugas
 */
export const getDefaultPrompt = (taskType: keyof typeof defaultPrompts): string => {
  return defaultPrompts[taskType]?.prompt || '';
};

/**
 * Mendapatkan judul prompt default berdasarkan jenis tugas
 */
export const getDefaultPromptTitle = (taskType: keyof typeof defaultPrompts): string => {
  return defaultPrompts[taskType]?.title || '';
}; 