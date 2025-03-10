import type { ExtendedAgent } from '../../types';
import { Shield } from 'lucide-react';

export const siberAgent: ExtendedAgent = {
  id: 'siber_001',
  name: 'Siber AI',
  type: 'siber_chat',
  status: 'on',
  description: 'Asisten AI yang fokus pada tindak pidana di bidang Informasi dan Transaksi Elektronik (ITE)',
  icon: Shield,
  iconClassName: 'text-cyan-600',
  fields: []
}; 