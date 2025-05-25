import type { ExtendedAgent } from '../../types';

export const imageProcessorAgent: ExtendedAgent = {
  id: 'geo-image-agent',
  name: 'Geo Lokasi Gambar',
  type: 'image_processor',
  status: 'on',
  description: 'Menganalisis foto dan lokasi (Tahap pencarian fungsi api serta logika, masih dalam perkembangan dan belum memberikan hasil yang baik) .',
  fields: [
    {
      id: 'image',
      label: 'Upload Foto',
      type: 'file',
      accept: 'image/*',
      placeholder: 'Pilih file foto untuk dianalisis lokasi...'
    }
  ]
};
