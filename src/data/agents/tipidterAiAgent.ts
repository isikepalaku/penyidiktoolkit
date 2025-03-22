import { ExtendedAgent } from '@/types';
import { AlertTriangle } from 'lucide-react';

export const tipidterAiAgent: ExtendedAgent = {
    id: 'tipidter-chat',
    name: 'Tipidter AI',
    description: 'AI Assistant untuk membantu analisis tindak pidana tertentu (Tipidter) dengan menyediakan insight yang mendalam',
    type: 'tipidter_chat',
    status: 'on',
    icon: AlertTriangle,
    iconClassName: 'text-orange-600',
    fields: [
        {
            id: 'message',
            label: 'Pertanyaan',
            type: 'textarea' as const,
            placeholder: 'Masukkan pertanyaan Anda tentang kasus tindak pidana tertentu...'
        }
    ]
}; 