import { BookOpen } from 'lucide-react';
import { ExtendedAgent } from '@/types';

export const kuhapAgent: ExtendedAgent = {
  id: 'kuhap_001',
  name: 'KUHAP AI',
  type: 'kuhap_chat',
  status: 'on',
  description: 'Asisten AI untuk memahami Kitab Undang-Undang Hukum Acara Pidana (KUHAP)',
  icon: BookOpen,
  iconClassName: 'text-amber-600',
  fields: []
}; 