import type { ExtendedAgent } from '../../types';

export const hoaxCheckerAgent: ExtendedAgent = {
  id: 'hoax_001',
  name: 'Pemeriksaan Hoax',
  type: 'hoax_checker',
  status: 'on',
  description: 'Menganalisis dan memeriksa kebenaran informasi untuk mengidentifikasi potensi hoax atau disinformasi.',
  fields: [
    { 
      id: 'content', 
      label: 'Masukkan informasi yang ingin diperiksa', 
      type: 'textarea', 
      placeholder: 'Masukkan teks, berita, atau informasi yang ingin diperiksa kebenarannya...' 
    }
  ]
};
