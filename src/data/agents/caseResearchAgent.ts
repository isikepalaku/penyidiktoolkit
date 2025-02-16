import type { ExtendedAgent } from '../../types';

export const caseResearchAgent: ExtendedAgent = {
  id: 'case_001',
  name: 'Penelitian Kasus',
  description: 'Membantu menganalisis dan meneliti kasus berdasarkan data historis',
  type: 'case_research',
  status: 'on',
  fields: [
    {
      id: 'message',
      label: 'Deskripsi Kasus',
      type: 'textarea' as const,
      placeholder: 'Masukkan deskripsi kasus yang ingin dianalisis...'
    }
  ]
};