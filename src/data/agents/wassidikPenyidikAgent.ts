import { ExtendedAgent } from '@/types';
import { Eye } from 'lucide-react';

export const wassidikPenyidikAgent: ExtendedAgent = {
  id: 'wassidik_penyidik_001',
  name: 'Wassidik AI',
  type: 'wassidik_penyidik_chat',
  status: 'on',
  description: 'Asisten Wassidik (Pengawasan Penyidikan) Polri yang bertugas untuk melakukan koordinasi dan pengawasan terhadap proses penyelidikan dan penyidikan tindak pidana',
  icon: Eye,
  iconClassName: 'text-purple-600',
  fields: []
}; 