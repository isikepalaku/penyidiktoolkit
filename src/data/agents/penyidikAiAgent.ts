import { ExtendedAgent } from '@/types';

export const penyidikAiAgent: ExtendedAgent = {
  id: 'penyidik_chat',
  name: 'Indagsi Ai',
  type: 'penyidik_chat',
  status: 'on',
  description: 'AI Assistant yang berfokus pada tanya jawab bidang hukum Industri Perdagangan dan Investasi',
  fields: [
    {
      id: 'message',
      label: 'Pertanyaan',
      type: 'textarea' as const,
      placeholder: 'Masukkan pertanyaan atau konteks investigasi Anda...'
    }
  ]
};