import type { ExtendedAgent } from '../../types';

export const forensicAgent: ExtendedAgent = {
  id: '6',
  name: 'Analisis Forensik',
  type: 'forensic',
  status: 'on',
  description: 'Menganalisis bukti fisik dan data forensik menggunakan pengenalan pola tingkat lanjut',
  fields: [
    { 
      id: 'evidence', 
      label: 'Deskripsi Bukti', 
      type: 'textarea', 
      placeholder: 'Jelaskan bukti fisik yang ditemukan di TKP...' 
    }
  ]
};