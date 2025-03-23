import { DollarSign } from 'lucide-react';
import type { ExtendedAgent } from '../../types';

export const empAgent: ExtendedAgent = {
  id: 'emp-agent',
  name: 'EMP AI',
  type: 'emp_chat',
  status: 'on',
  description: 'Asisten AI aplikasi EMP berdasarkan perkaba polri',
  icon: DollarSign,
  iconClassName: 'text-blue-600',
  fields: []
}; 