import type { ExtendedAgent } from '../types';

export const perkabaAgents: ExtendedAgent[] = [
  {
    id: 'perkaba_chat',
    name: 'Chat dengan Perkaba',
    description: 'Ajukan pertanyaan dan dapatkan informasi dari database Perkaba menggunakan AI',
    type: 'perkaba_chat',
    status: 'on',
    fields: [
      {
        id: 'query',
        label: 'Pertanyaan Anda',
        type: 'textarea',
        placeholder: 'Masukkan pertanyaan Anda tentang Perkaba...'
      }
    ]
  },
  {
    id: 'perkaba_search',
    name: 'Pencarian Perkaba',
    description: 'Cari dan analisis dokumen Perkaba berdasarkan kata kunci atau topik',
    type: 'perkaba_search',
    status: 'on',
    fields: [
      {
        id: 'keywords',
        label: 'Kata Kunci',
        type: 'text',
        placeholder: 'Masukkan kata kunci pencarian...'
      },
      {
        id: 'filters',
        label: 'Filter Tambahan',
        type: 'textarea',
        placeholder: 'Tambahkan filter pencarian (opsional)...'
      }
    ]
  }
];
