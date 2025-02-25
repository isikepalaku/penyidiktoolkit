import type { ExtendedAgent } from '../../types';

export const tipikorAnalystAgent: ExtendedAgent = {
  id: 'polri-tipikor-analyst',
  name: 'Analisis Tipidkor',
  description: 'Membantu menganalisis kasus-kasus tindak pidana korupsi',
  type: 'tipikor_analyst',
  status: 'on',
  fields: [
    {
      id: 'message',
      label: 'Deskripsi Kasus',
      type: 'textarea' as const,
      placeholder: 'Masukkan kasus atau topik yang ingin dianalisis...'
    }
  ]
};

export default tipikorAnalystAgent;