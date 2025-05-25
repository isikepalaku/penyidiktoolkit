import { Eye } from 'lucide-react';
import type { ExtendedAgent } from '../../types';

export const laporanInteljenAgent: ExtendedAgent = {
  id: 'laporan_intelejen_001',
  name: 'Intelkam AI',
  type: 'laporan_intelejen',
  status: 'on',
  description: 'Asisten AI analisis intelijen dan penyusunan produk intelkam yang mendukung operasi keamanan kepolisian',
  icon: Eye,
  iconClassName: 'text-indigo-600',
  fields: [
    {
      id: 'mode',
      label: 'Mode Analisis',
      type: 'select',
      placeholder: 'Pilih mode analisis',
      required: true,
      options: [
        { value: 'REPORT', label: 'Analisis Mendalam - Buat laporan lengkap dari isu tertentu' },
        { value: 'SEARCH', label: 'Pencarian Produk Intelijen - Cari isu potensial di wilayah hukum' }
      ]
    },
    {
      id: 'issue',
      label: 'Pokok Permasalahan/Isu Utama',
      type: 'textarea',
      placeholder: 'Masukkan isu utama yang akan dianalisis secara mendalam...',
      required: true,
      rows: 3
    },
    {
      id: 'category',
      label: 'Kategori Isu',
      type: 'text',
      placeholder: 'Contoh: Keamanan Publik, Narkotika, Terorisme, Kejahatan Siber, dll.',
      required: false
    },
    {
      id: 'wilayahHukum',
      label: 'Wilayah Hukum (untuk Pencarian Produk Intelijen)',
      type: 'text',
      placeholder: 'Contoh: Jakarta Selatan, Surabaya, Medan, dll.',
      required: false
    },
    {
      id: 'sumber',
      label: 'Sumber Informasi (Pelapor)',
      type: 'text',
      placeholder: 'Masukkan sumber informasi',
      required: false
    },
    {
      id: 'caraMendapatkanBaket',
      label: 'Cara Mendapatkan Informasi',
      type: 'text',
      placeholder: 'Contoh: Monitoring Media, Laporan Masyarakat, Pengamatan Langsung',
      required: false
    },
    {
      id: 'hubunganDenganSasaran',
      label: 'Hubungan dengan Sasaran/Target',
      type: 'text',
      placeholder: 'Contoh: Langsung, Tidak Langsung, Melalui Pihak Ketiga',
      required: false
    },
    {
      id: 'waktuMendapatkanInformasi',
      label: 'Waktu Mendapatkan Informasi',
      type: 'text',
      placeholder: 'Contoh: Senin, 15 Januari 2024, 14:30 WIB',
      required: false
    },
    {
      id: 'nilaiInformasi',
      label: 'Nilai Informasi',
      type: 'select',
      placeholder: 'Pilih nilai informasi',
      required: false,
      options: [
        { value: 'A1', label: 'A1 - Sumber dapat dipercaya, Informasi dikonfirmasi' },
        { value: 'A2', label: 'A2 - Sumber dapat dipercaya, Informasi mungkin benar' },
        { value: 'A3', label: 'A3 - Sumber dapat dipercaya, Informasi mungkin salah' },
        { value: 'B1', label: 'B1 - Sumber agak dapat dipercaya, Informasi dikonfirmasi' },
        { value: 'B2', label: 'B2 - Sumber agak dapat dipercaya, Informasi mungkin benar' },
        { value: 'B3', label: 'B3 - Sumber agak dapat dipercaya, Informasi mungkin salah' },
        { value: 'C1', label: 'C1 - Sumber tidak dapat dipercaya, Informasi dikonfirmasi' },
        { value: 'C2', label: 'C2 - Sumber tidak dapat dipercaya, Informasi mungkin benar' },
        { value: 'C3', label: 'C3 - Sumber tidak dapat dipercaya, Informasi mungkin salah' },
        { value: 'D', label: 'D - Tidak dapat dinilai' },
        { value: 'E', label: 'E - Informasi tidak dapat dipercaya' },
        { value: 'F', label: 'F - Kebenaran tidak dapat ditentukan' }
      ]
    }
  ]
}; 