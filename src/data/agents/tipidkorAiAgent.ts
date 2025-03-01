import { ExtendedAgent } from '@/types';

export const tipidkorAiAgent: ExtendedAgent = {
    id: 'tipidkor-chat',
    name: 'Tipidkor AI',
    description: 'AI Assistant untuk membantu analisis kasus tindak pidana korupsi dengan menyediakan insight yang mendalam',
    type: 'tipidkor_chat',
    status: 'on',
    fields: [
        {
            id: 'message',
            label: 'Pertanyaan',
            type: 'textarea' as const,
            placeholder: 'Masukkan pertanyaan Anda tentang kasus tipikor...'
        }
    ]
};