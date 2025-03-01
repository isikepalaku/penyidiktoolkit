import type { ExtendedAgent } from '../../types';

export const caseResearchAgent: ExtendedAgent = {
  id: 'case_001',
  name: 'Penelitian Kasus',
  description: 'Analisis kasus menggunakan LLM dengan data pencarian Google Scholar mendalam',
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