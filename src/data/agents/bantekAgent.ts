import { FileText } from 'lucide-react';
import type { ExtendedAgent } from '@/types';

export const bantekAgent: ExtendedAgent = {
  id: 'bantek_001',
  name: 'Bantek AI',
  type: 'bantek_chat',
  status: 'on',
  description: 'Asisten AI yang fokus pada SOP Bantuan Teknis berdasarkan Perkaba Polri',
  icon: FileText,
  iconClassName: 'text-green-600',
  fields: []
}; 