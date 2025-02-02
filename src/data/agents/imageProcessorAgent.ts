import type { ExtendedAgent } from '../../types';

export const imageProcessorAgent: ExtendedAgent = {
  id: 'image-processor-agent',
  name: 'Image Processor',
  type: 'image_processor',
  status: 'on',
  description: 'Menganalisis gambar untuk investigasi dan ekstraksi informasi menggunakan AI.',
  fields: [
    {
      id: 'image_file',
      label: 'Upload Gambar',
      type: 'file',
      accept: 'image/*',
      placeholder: 'Pilih file gambar untuk dianalisis...'
    }
  ]
};
