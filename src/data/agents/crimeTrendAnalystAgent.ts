import type { ExtendedAgent } from '@/types';

export const crimeTrendAnalystAgent: ExtendedAgent = {
  id: 'polri-crime-trend-analyst',
  name: 'Analis Tren Kejahatan',
  description: 'Membantu menganalisis tren dan pola kejahatan berdasarkan data historis',
  type: 'crime_trend_analyst',
  status: 'on',
  fields: [
    {
      id: 'message',
      label: 'Deskripsi Kasus',
      type: 'textarea',
      placeholder: 'Masukkan deskripsi atau pertanyaan tentang tren kejahatan yang ingin dianalisis...'
    }
  ]
};

export default crimeTrendAnalystAgent; 