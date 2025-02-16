import type { ExtendedAgent } from '../../types';

export const sentimentAnalystAgent: ExtendedAgent = {
  id: 'polri-sentiment-analyst',
  name: 'Analis Sentimen',
  description: 'Membantu menganalisis sentimen dan opini masyarakat terhadap suatu isu atau topik tertentu',
  type: 'sentiment_analyst',
  status: 'on',
  fields: [
    {
      id: 'message',
      label: 'Deskripsi Isu',
      type: 'textarea' as const,
      placeholder: 'Masukkan isu atau topik yang ingin dianalisis sentimen masyarakatnya...'
    }
  ]
};

export default sentimentAnalystAgent; 