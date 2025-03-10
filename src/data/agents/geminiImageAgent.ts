import type { ExtendedAgent } from '../../types';
import { imagePrompts } from './imageAgent';

export const geminiImageAgent: ExtendedAgent = {
  id: 'gemini_img_001',
  name: 'Analisis Gambar (Gemini)',
  type: 'gemini_image',
  status: 'on',
  description: 'Menganalisis gambar menggunakan Gemini AI untuk mendapatkan informasi detail',
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
    },
    {
      id: 'prompt_type',
      label: 'Jenis Analisis',
      type: 'select',
      options: [
        { value: 'default', label: 'Analisis Standar' },
        { value: 'forensic', label: 'Analisis Forensik' },
        { value: 'text_extraction', label: 'Ekstraksi Teks' }
      ]
    }
  ]
}; 