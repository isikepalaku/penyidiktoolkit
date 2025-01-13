import type { ExtendedAgent } from '../../types';

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