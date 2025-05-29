export interface Subyek {
  nama: string;
  nomorIdentitas: string;
  kewarganegaraan: string;
  jenisKelamin: string;
  tempatTanggalLahir: string;
  pekerjaan: string;
  agama: string;
  alamat: string;
}

export interface Pelapor {
  nama: string;
  pangkatNrp: string;
}

export interface PenutupDetails {
  dugaanTindakPidana: string;
  pasalUuYangRelevan: string;
  tempatKejadianPerkara: string;
  waktuKejadianLengkap: string;
  kurunWaktuSpesifik: string;
}

export interface LaporanInformasiData {
  nomorLaporan: string;
  tentang: string;
  pendahuluan: {
    sumber: string;
    caraMendapatkan: string;
    waktuMendapatkan: string;
    tempatBaketDidapat: string;
    objekDugaanPerkara: string;
  };
  faktaFakta: {
    subyek1: Subyek | null;
    subyek2?: Subyek | null;
  };
  uraianPerkara: string[];
  kesimpulan: string[];
  saran: string[];
  penutupDetails: PenutupDetails;
  kotaTanggalLapor: string;
  pelapor: Pelapor;
}

// For Gemini API interaction specifically
export interface GeminiReportResponse extends LaporanInformasiData {} 