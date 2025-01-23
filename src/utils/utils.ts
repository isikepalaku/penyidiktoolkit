import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getTypeDisplay = (type: string) => {
  switch(type) {
    case 'spkt':
      return 'SPKT';
    case 'witness':
      return 'Saksi';
    case 'behavioral':
      return 'Perilaku';
    case 'evidence':
      return 'Bukti';
    case 'forensic':
      return 'Forensik';
    case 'image':
      return 'Gambar';
    case 'report':
      return 'Laporan';
    default:
      return type;
  }
};
