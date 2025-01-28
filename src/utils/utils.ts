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
    default:
      return type;
  }
};
