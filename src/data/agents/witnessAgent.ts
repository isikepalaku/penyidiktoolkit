import type { ExtendedAgent } from '../../types';

export const witnessAgent: ExtendedAgent = {
  id: '3',
  name: 'Analisis Pernyataan',
  type: 'witness',
  status: 'on',
  description: 'Menganalisis pernyataan untuk konsistensi dan kredibilitas menggunakan NLP',
  fields: [
    { 
      id: 'statement', 
      label: 'Pernyataan', 
      type: 'textarea', 
      placeholder: 'Masukkan pernyataan lengkap...' 
    },
    { 
      id: 'context', 
      label: 'Konteks Pernyataan', 
      type: 'text', 
      placeholder: 'Berikan konteks kapan/dimana pernyataan dibuat' 
    }
  ]
};