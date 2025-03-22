export const pdfImagePrompts = {
  summarize: {
    id: 'summarize',
    prompt: `Ringkasan dokumen ini dengan memperhatikan:
- Poin-poin utama dari setiap bagian
- Informasi penting seperti tanggal, nama, dan angka
- Struktur dokumen secara keseluruhan
- Kesimpulan atau rekomendasi yang ada

Output dalam format Markdown:

# Ringkasan Dokumen

## Informasi Umum
- Judul: [judul dokumen]
- Jenis: [jenis dokumen, misalnya laporan, surat, kontrak, dll]
- Tanggal: [tanggal dokumen jika ada]

## Poin-poin Utama
${Array(5).fill('- [poin utama]').join('\n')}

## Ringkasan Isi
[ringkasan isi dokumen dalam 3-5 paragraf]

## Kesimpulan
[kesimpulan dari dokumen]`,
    description: 'Ringkasan isi dokumen PDF atau gambar'
  },
  extract: {
    id: 'extract',
    prompt: `Ekstrak informasi spesifik dari dokumen ini sesuai instruksi pengguna.
Fokus pada:
- Akurasi data yang diekstrak
- Format yang terstruktur dan mudah dibaca
- Konteks dari informasi yang diekstrak
- Penjelasan jika informasi tidak ditemukan

Output dalam format Markdown:

# Hasil Ekstraksi Informasi

## Informasi yang Diekstrak
[Informasi yang diekstrak sesuai permintaan]

## Konteks
[Konteks dari informasi yang diekstrak]

## Catatan
[Catatan tambahan jika diperlukan]`,
    description: 'Ekstraksi informasi spesifik dari dokumen'
  },
  analyze: {
    id: 'analyze',
    prompt: `Analisis mendalam dokumen ini dengan memperhatikan:
- Struktur dan organisasi dokumen
- Argumen atau klaim utama
- Bukti pendukung yang disajikan
- Kesenjangan atau kelemahan dalam dokumen
- Implikasi dan signifikansi

Output dalam format Markdown:

# Analisis Dokumen

## Struktur Dokumen
[analisis struktur dokumen]

## Argumen/Klaim Utama
${Array(3).fill('- [argumen/klaim]').join('\n')}

## Bukti Pendukung
${Array(3).fill('- [bukti]').join('\n')}

## Kesenjangan/Kelemahan
${Array(2).fill('- [kesenjangan/kelemahan]').join('\n')}

## Implikasi
[implikasi dari dokumen]

## Kesimpulan Analisis
[kesimpulan dari analisis]`,
    description: 'Analisis mendalam dokumen'
  },
  qa: {
    id: 'qa',
    prompt: `Jawab pertanyaan pengguna tentang dokumen ini dengan:
- Informasi HANYA berdasarkan isi dokumen yang diberikan
- Kutipan langsung dari dokumen jika relevan
- Jangan gunakan pengetahuan umum yang tidak ada dalam dokumen
- Jika informasi tidak tersedia dalam dokumen, nyatakan dengan jelas: "Informasi ini tidak tersedia dalam dokumen yang diberikan" 
- Jangan mencoba menebak atau memberikan informasi yang tidak ada dalam dokumen

Proses dokumen dengan teliti:
1. Perhatikan semua bagian dokumen termasuk metadata, header, footer, dan bagian kecil lainnya
2. Pertimbangkan konteks keseluruhan dokumen
3. Sertakan halaman atau bagian dokumen tertentu saat mengutip jika memungkinkan

Berikan jawaban dalam format yang mudah dibaca dan informatif.`,
    description: 'Tanya jawab tentang dokumen'
  },
  translate: {
    id: 'translate',
    prompt: `Terjemahkan dokumen ini ke dalam bahasa Indonesia (atau bahasa lain sesuai instruksi pengguna) dengan:
- Keakuratan tinggi dalam penerjemahan
- Mempertahankan format dan struktur dokumen asli
- Mempertahankan terminologi khusus dan istilah teknis
- Catatan tambahan untuk konteks budaya jika diperlukan

Output dalam format Markdown:

# Hasil Terjemahan

## Dokumen Asli
[ringkasan singkat dokumen asli]

## Terjemahan
[terjemahan lengkap dokumen]

## Catatan Penerjemah
[catatan tentang istilah khusus atau konteks budaya jika diperlukan]`,
    description: 'Terjemahan dokumen ke bahasa Indonesia'
  }
} as const;

export type PdfImagePromptType = keyof typeof pdfImagePrompts;

export const getPdfImagePrompt = (type: PdfImagePromptType): string => {
  return pdfImagePrompts[type].prompt;
};

import type { ExtendedAgent } from '@/types';

export const pdfImageAgent: ExtendedAgent = {
  id: 'pdf-image-analyzer',
  name: 'Analisis Dokumen 🔥',
  description: 'Teknologi OCR dan AI, melakukan analisis, perbandingan dan ekstraksi dokumen dengan akurasi tinggi.',
  type: 'pdf_image_analyzer',
  status: 'on',
  fields: [
    {
      id: 'files',
      label: 'Upload File',
      type: 'file',
      placeholder: 'Pilih file PDF atau gambar...',
      accept: 'application/pdf,image/*',
      multiple: true
    },
    {
      id: 'task_type',
      label: 'Jenis Tugas',
      type: 'select',
      options: [
        { value: 'summarize', label: 'Ringkasan Dokumen' },
        { value: 'extract', label: 'Ekstraksi Informasi' },
        { value: 'analyze', label: 'Analisis Mendalam' },
        { value: 'qa', label: 'Tanya Jawab' },
        { value: 'translate', label: 'Terjemahan Dokumen' }
      ],
      placeholder: 'Pilih jenis tugas'
    },
    {
      id: 'instruction',
      label: 'Instruksi',
      type: 'textarea' as const,
      placeholder: 'Berikan instruksi spesifik untuk analisis dokumen...'
    }
  ]
}; 