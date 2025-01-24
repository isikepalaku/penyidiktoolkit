import type { ExtendedAgent } from '../../types';

export const caseResearchAgent: ExtendedAgent = {
  id: 'case_001',
  name: 'Penelitian Kasus',
  type: 'case_research',
  status: 'on',
  description: 'Membantu menganalisis dan meneliti kasus untuk menemukan pola dan insight penting',
  fields: [
    { 
      id: 'case_description', 
      label: 'Deskripsi Kasus', 
      type: 'textarea', 
      placeholder: 'Jelaskan kronologi dan detail kasus yang ingin diteliti...' 
    }
  ]
};