import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AgentType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getTypeDisplay = (type: AgentType): string => {
  switch (type) {
    case 'spkt':
      return 'SPKT';
    case 'case_research':
      return 'Kasus';
    case 'image':
      return 'Gambar';
    case 'hoax_checker':
      return 'Hoax';
    case 'image_processor':
      return 'Lokasi';
    case 'modus_kejahatan':
      return 'Modus';
    case 'crime_trend_analyst':
      return 'Tren';
    case 'sentiment_analyst':
      return 'Sentimen';
    case 'tipikor_analyst':
      return 'Tipikor';
    default:
      return type;
  }
};

export const AGENT_IDS = {
  SPKT: 'spkt_001',
  CASE_RESEARCH: 'case_001',
  IMAGE: 'img_001',
  HOAX_CHECKER: 'hoax_001',
  IMAGE_PROCESSOR: 'geo-image-agent',
  MODUS_KEJAHATAN: 'modus_001',
  SENTIMENT_ANALYST: 'polri-sentiment-analyst',
  TIPIKOR_ANALYST: 'polri-tipikor-analyst',
  // Chat agents
  P2SK_CHAT: 'p2sk-chat',
  KUHP_CHAT: 'kuhp-chat',
  ITE_CHAT: 'ite-chat',
  TIPIDKOR_CHAT: 'tipidkor-chat',
  CIPTAKERJA_CHAT: 'ciptakerja-chat',
  KESEHATAN_CHAT: 'kesehatan-chat',
  PENYIDIK_CHAT: 'penyidik-chat'
} as const;

export const isValidAgentId = (id: string): boolean => {
  return Object.values(AGENT_IDS).includes(id as typeof AGENT_IDS[keyof typeof AGENT_IDS]);
};

export const getAgentTypeFromId = (id: string): AgentType | null => {
  switch (id) {
    case AGENT_IDS.SPKT:
      return 'spkt';
    case AGENT_IDS.CASE_RESEARCH:
      return 'case_research';
    case AGENT_IDS.IMAGE:
      return 'image';
    case AGENT_IDS.HOAX_CHECKER:
      return 'hoax_checker';
    case AGENT_IDS.IMAGE_PROCESSOR:
      return 'image_processor';
    case AGENT_IDS.MODUS_KEJAHATAN:
      return 'modus_kejahatan';
    case AGENT_IDS.SENTIMENT_ANALYST:
      return 'sentiment_analyst';
    case AGENT_IDS.TIPIKOR_ANALYST:
      return 'tipikor_analyst';
    // Chat agents
    case AGENT_IDS.P2SK_CHAT:
      return 'undang_chat';
    case AGENT_IDS.KUHP_CHAT:
      return 'kuhp_chat';
    case AGENT_IDS.ITE_CHAT:
      return 'ite_chat';
    case AGENT_IDS.TIPIDKOR_CHAT:
      return 'tipidkor_chat';
    case AGENT_IDS.CIPTAKERJA_CHAT:
      return 'ciptakerja_chat';
    case AGENT_IDS.KESEHATAN_CHAT:
      return 'kesehatan_chat';
    case AGENT_IDS.PENYIDIK_CHAT:
      return 'penyidik_chat';
    default:
      return null;
  }
};
