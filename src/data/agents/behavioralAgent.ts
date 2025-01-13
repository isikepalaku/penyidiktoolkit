import type { ExtendedAgent } from '../../types';

export const behavioralAgent: ExtendedAgent = {
  id: '2',
  name: 'Analisis Perilaku',
  type: 'behavioral',
  status: 'on',
  description: 'Menganalisis perilaku kriminal dan memprediksi pola potensial',
  fields: [
    { 
      id: 'behavior', 
      label: 'Pola Perilaku', 
      type: 'textarea', 
      placeholder: 'Jelaskan pola perilaku subjek...' 
    },
    { 
      id: 'timeline', 
      label: 'Urutan Kejadian', 
      type: 'textarea', 
      placeholder: 'Berikan urutan kronologis kejadian...' 
    }
  ]
};