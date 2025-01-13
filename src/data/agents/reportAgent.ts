import type { ExtendedAgent } from '../../types';

export const reportAgent: ExtendedAgent = {
  id: '5',
  name: 'Pembuat Laporan',
  type: 'report',
  status: 'on',
  description: 'Menghasilkan laporan investigasi komprehensif dengan visualisasi',
  fields: [
    { 
      id: 'summary', 
      label: 'Ringkasan Kasus', 
      type: 'textarea', 
      placeholder: 'Berikan ringkasan singkat kasus...' 
    },
    { 
      id: 'findings', 
      label: 'Temuan Utama', 
      type: 'textarea', 
      placeholder: 'Daftar temuan dan kesimpulan utama...' 
    }
  ]
};