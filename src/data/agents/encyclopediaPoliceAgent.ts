import { BookOpen } from 'lucide-react';
import type { ExtendedAgent } from '../../types';

export const encyclopediaPoliceAgent: ExtendedAgent = {
  id: 'encyclopedia_police_001',
  name: 'Ensiklopedia Kepolisian',
  type: 'encyclopedia_police',
  status: 'on',
  description: 'Asisten AI yang menyediakan informasi komprehensif tentang terminologi, prosedur, dan pengetahuan kepolisian Indonesia',
  icon: BookOpen,
  iconClassName: 'text-blue-600',
  fields: [
    {
      id: 'query',
      label: 'Pertanyaan tentang Kepolisian',
      type: 'textarea',
      placeholder: 'Contoh: Apa itu reserse? Bagaimana prosedur penyelidikan? Jelaskan tentang Brimob...',
      required: true,
      rows: 4
    }
  ]
}; 