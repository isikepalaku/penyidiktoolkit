import type { ExtendedAgent } from '../../types';

export const spktAgent: ExtendedAgent = {
  id: '1',
  name: 'Analisis Laporan SPKT',
  type: 'spkt',
  status: 'on',
  description: 'Membuat ulang kronologis kasus dengan memecah dan mengelompokkan berdasarkan objek, subjek, locus dan tempus untuk laporan yang terstruktur.',
  fields: [
    { 
      id: 'report', 
      label: 'Berikan kronologis singkat kasus', 
      type: 'textarea', 
      placeholder: 'Masukkan kronologis singkat kasus atau copy paste laporan...' 
    }
  ]
};