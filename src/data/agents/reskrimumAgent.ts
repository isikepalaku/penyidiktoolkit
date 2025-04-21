import { ExtendedAgent } from '@/types';
import { FileText } from 'lucide-react';

export const reskrimumAgent: ExtendedAgent = {
  id: 'reskrimum_001',
  name: 'Reskrimum AI',
  type: 'reskrimum_chat',
  status: 'on',
  description: 'Asisten AI untuk penyidik reserse kriminal umum dengan fokus pada tindak pidana konvensional',
  icon: FileText,
  iconClassName: 'text-indigo-600',
  fields: []
}; 