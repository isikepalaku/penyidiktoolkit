import type { ExtendedAgent } from '../../types';

export const dokpolAgent: ExtendedAgent = {
  id: 'dokpol_001',
  name: 'Dokpol',
  type: 'medical_image',
  status: 'on',
  description: 'Menganalisis gambar dari sudut pandang medis untuk keperluan investigasi.',
  warning: 'PERHATIAN: Ini adalah prototype sehingga bukan mewakili ilmu kedokteran yang sebenarnya, memerlukan pengembangan lebih spesifik dan tidak menggantikan peran profesi Dokter.',
  fields: [
    {
      id: 'service_type',
      label: 'Jenis Layanan',
      type: 'select',
      placeholder: 'Pilih jenis layanan...',
      options: [
        { value: 'umum', label: 'Dokpol Umum' },
        { value: 'forensik', label: 'Dokpol Forensik' }
      ],
      required: true
    },
    {
      id: 'image_file',
      label: 'Upload Gambar',
      type: 'file',
      placeholder: 'Pilih file gambar untuk dianalisis...',
      accept: 'image/*'  // Hanya menerima file gambar
    }
  ]
};
