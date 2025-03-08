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
  compare: {
    id: 'compare',
    prompt: `Bandingkan dokumen-dokumen ini dengan memperhatikan:
- Persamaan dan perbedaan utama
- Perubahan spesifik antar dokumen
- Implikasi dari perbedaan yang ditemukan
- Rekomendasi berdasarkan analisis

Output dalam format Markdown:

# Analisis Perbandingan Dokumen

## Persamaan Utama
${Array(3).fill('- [persamaan]').join('\n')}

## Perbedaan Signifikan
${Array(5).fill('- [perbedaan]').join('\n')}

## Analisis Perubahan
[analisis mendalam tentang perubahan antar dokumen]

## Implikasi
[implikasi dari perbedaan yang ditemukan]

## Rekomendasi
[rekomendasi berdasarkan analisis]`,
    description: 'Perbandingan antar dokumen'
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
  chat: {
    id: 'chat',
    prompt: `Jawab pertanyaan pengguna tentang dokumen ini dengan:
- Informasi akurat berdasarkan isi dokumen
- Kutipan langsung jika relevan
- Penjelasan yang jelas dan ringkas
- Pengakuan jika informasi tidak tersedia dalam dokumen

Berikan jawaban dalam format yang mudah dibaca dan informatif.`,
    description: 'Tanya jawab tentang dokumen'
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
        { value: 'compare', label: 'Perbandingan Dokumen' },
        { value: 'analyze', label: 'Analisis Mendalam' },
        { value: 'chat', label: 'Tanya Jawab' }
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