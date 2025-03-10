import type { ExtendedAgent } from '../../types';
import { DollarSign } from 'lucide-react';

export const fismondevAgent: ExtendedAgent = {
  id: 'fismondev_001',
  name: 'Fismondev AI',
  type: 'fismondev_chat',
  status: 'on',
  description: 'Asisten AI yang fokus pada tindak pidana di bidang Fiskal, Moneter, dan Devisa',
  icon: DollarSign,
  iconClassName: 'text-green-600',
  fields: []
}; 