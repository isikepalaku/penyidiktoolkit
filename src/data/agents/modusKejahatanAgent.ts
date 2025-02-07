import type { ExtendedAgent } from '../../types';

export const modusKejahatanAgent: ExtendedAgent = {
  id: 'modus-kejahatan-agent',
  name: 'Pencari Modus Kejahatan',
  type: 'modus_kejahatan',
  status: 'on',
  description: 'Menganalisis dan mengidentifikasi pola modus kejahatan berdasarkan kategori yang diberikan.',
  fields: [
    { 
      id: 'kategori_kejahatan', 
      label: 'Masukkan kategori kejahatan', 
      type: 'textarea', 
      placeholder: 'Contoh: perampokan bank, penipuan online, pencurian kendaraan...' 
    }
  ]
}; 