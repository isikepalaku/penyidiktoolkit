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