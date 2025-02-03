import type { ExtendedAgent } from '../../types';

export const imageProcessorAgent: ExtendedAgent = {
  id: 'geo-image-agent',
  name: 'Pencari Lokasi dari Foto',
  type: 'image_processor',
  status: 'on',
  description: 'Menganalisis foto dan menentukan lokasi berdasarkan foto yang diberikan.',
  fields: [
    {
      id: 'image',
      label: 'Upload Foto',
      type: 'file',
      accept: 'image/*',
      placeholder: 'Pilih file foto untuk dianalisis...'
    }
  ]
};
