import { ExtendedAgent } from '@/types';

export const mapsGeocodingAgent: ExtendedAgent = {
  id: 'maps-agent',
  name: 'Maps Geocoding',
  type: 'maps_geocoding',
  status: 'on',
  description: 'Alat untuk mencari dan mengkonversi alamat ke koordinat geografis',
  fields: [
    {
      id: 'message',
      label: 'Masukkan Alamat',
      type: 'textarea' as const,
      placeholder: 'Masukkan alamat yang ingin dicari...'
    }
  ]
};
