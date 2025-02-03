import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getTypeDisplay = (type: string) => {
  switch(type) {
    case 'spkt':
      return 'SPKT';
    case 'image':
      return 'Gambar';
    case 'case_research':
      return 'Penelitian Kasus';
    case 'hoax_checker':
      return 'Pemeriksaan Hoax';
    case 'perkaba_chat':
      return 'Chat Perkaba';
    case 'perkaba_search':
      return 'Pencarian Perkaba';
    case 'modus_kejahatan':
      return 'Modus Kejahatan';
    case 'image_processor':
      return 'Lokasi';
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
  MODUS_KEJAHATAN: 'modus_001'
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
    default:
      return null;
  }
};
