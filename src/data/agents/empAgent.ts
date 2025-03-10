import { DollarSign } from 'lucide-react';
import type { ExtendedAgent } from '../../types';

export const empAgent: ExtendedAgent = {
  id: 'emp-agent',
  name: 'EMP AI',
  type: 'emp_chat',
  status: 'on',
  description: 'Asisten AI yang fokus pada tindak pidana di bidang Ekonomi, Moneter, dan Perbankan',
  icon: DollarSign,
  iconClassName: 'text-blue-600',
  fields: []
}; 