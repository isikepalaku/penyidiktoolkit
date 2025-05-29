import React from 'react';
import { LaporanInformasiData, Subyek } from '@/types/spktTypes';

interface ReportDisplayProps {
  data: LaporanInformasiData;
}

const DetailItem: React.FC<{ label: string; value: string | undefined | null; indent?: boolean; noColon?: boolean }> = ({ label, value, indent = false, noColon = false }) => (
  <div className={`flex text-sm ${indent ? 'ml-4' : ''}`}>
    <span className="w-48 flex-shrink-0">{label}</span>
    {!noColon && <span className="mr-2 flex-shrink-0">:</span>}
    <span className="flex-grow break-words">{value || '................................................'}</span>
  </div>
);

const SubyekDisplay: React.FC<{ subyek: Subyek | null | undefined; title: string }> = ({ subyek, title }) => {
  if (!subyek || !subyek.nama) return <div className="mt-2 text-sm">{title}: - Tidak Ada Data -</div>;
  return (
    <div className="mt-2">
      <p className="text-sm font-semibold">{title}:</p>
      <DetailItem label="a. nama" value={subyek.nama} indent />
      <DetailItem label="b. nomor identitas" value={subyek.nomorIdentitas} indent />
      <DetailItem label="c. kewarganegaraan" value={subyek.kewarganegaraan} indent />
      <DetailItem label="d. jenis kelamin" value={subyek.jenisKelamin} indent />
      <DetailItem label="e. tempat/tanggal lahir" value={subyek.tempatTanggalLahir} indent />
      <DetailItem label="f. pekerjaan" value={subyek.pekerjaan} indent />
      <DetailItem label="g. agama" value={subyek.agama} indent />
      <DetailItem label="h. alamat" value={subyek.alamat} indent />
    </div>
  );
};


const LaporanInformasiDisplay: React.FC<ReportDisplayProps> = ({ data }) => {
  const {
    nomorLaporan,
    tentang,
    pendahuluan,
    faktaFakta,
    uraianPerkara,
    kesimpulan,
    saran,
    penutupDetails,
    kotaTanggalLapor,
    pelapor,
  } = data;

  const penutupFullText = `Demikian laporan informasi ini dibuat untuk dapat digunakan sebagai bahan penyelidikan dan atau penyidikan dugaan Tindak Pidana ${penutupDetails.dugaanTindakPidana || '[dugaan tindak pidana]'} sebagaimana dimaksud dalam ${penutupDetails.pasalUuYangRelevan || '[Pasal UU]'}, yang terjadi di ${penutupDetails.tempatKejadianPerkara || '[TKP]'}, ${penutupDetails.waktuKejadianLengkap || '[waktu kejadian]'} dalam kurun waktu ${penutupDetails.kurunWaktuSpesifik || '[kurun waktu]'}.`;

  return (
    // Menggunakan font-family yang lebih standar jika Roboto Mono tidak tersedia secara global
    // Kelas 'print-container' bisa berguna untuk styling print khusus via CSS global jika diperlukan
    <div className="bg-white p-6 shadow-md print-container font-sans text-black text-xs">
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div className="text-xs font-semibold">KOPSTUK</div>
        <div className="text-xs font-semibold">S-1.2</div>
      </div>
      <hr className="border-black mb-4" />

      {/* Logo and Title */}
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto border border-gray-400 flex items-center justify-center text-black text-xxs mb-1">
          LOGO POLRI
        </div>
        <h1 className="text-xs font-bold tracking-wider">LAPORAN INFORMASI</h1>
        <p className="text-xs">tentang</p>
        <p className="text-xs font-semibold underline decoration-dotted decoration-black underline-offset-2">
          {tentang || '........................................................................'}
        </p>
        <p className="text-xs mt-0.5">Nomor: {nomorLaporan || 'LI/......../..../RES...../..../................'}</p>
      </div>
      <hr className="border-t-2 border-black mb-3" />

      {/* PENDAHULUAN */}
      <section className="mb-3">
        <h2 className="text-xs font-bold mb-1">PENDAHULUAN:</h2>
        <DetailItem label="1. Sumber" value={pendahuluan.sumber} />
        <DetailItem label="2. Cara mendapatkan" value={pendahuluan.caraMendapatkan} />
        <DetailItem label="3. Waktu mendapatkan" value={pendahuluan.waktuMendapatkan} />
        <DetailItem label="4. Tempat baket didapat" value={pendahuluan.tempatBaketDidapat} />
        <DetailItem label="5. Objek (dugaan perkara)" value={pendahuluan.objekDugaanPerkara} />
      </section>
      <hr className="border-black mb-3" />

      {/* FAKTA-FAKTA */}
      <section className="mb-3">
        <h2 className="text-xs font-bold mb-1">FAKTA-FAKTA:</h2>
        <SubyekDisplay subyek={faktaFakta.subyek1} title="1. Subyek I" />
        {faktaFakta.subyek2 && faktaFakta.subyek2.nama ? (
            <SubyekDisplay subyek={faktaFakta.subyek2} title="2. Subyek II" />
        ) : (
            <div className="mt-1">
                <p className="text-xs font-semibold">2. Subyek II:</p>
                <DetailItem label="a. nama" value="-" indent noColon />
            </div>
        )}
      </section>
      <hr className="border-black mb-3" />

      {/* URAIAN PERKARA */}
      <section className="mb-3">
        <h2 className="text-xs font-bold mb-1">URAIAN PERKARA:</h2>
        {uraianPerkara.length > 0 ? (
          uraianPerkara.map((item, index) => (
            <div key={index} className="flex text-xs mb-0.5">
              <span className="mr-1.5">{index + 1}.</span>
              <p className="flex-grow break-words">{item}</p>
            </div>
          ))
        ) : (
          <p className="text-xs">1. ................................................</p>
        )}
      </section>
      <hr className="border-black mb-3" />

      {/* KESIMPULAN */}
      <section className="mb-3">
        <h2 className="text-xs font-bold mb-1">KESIMPULAN:</h2>
        {kesimpulan.length > 0 ? (
          kesimpulan.map((item, index) => (
            <div key={index} className="flex text-xs mb-0.5">
              <span className="mr-1.5">{index + 1}.</span>
              <p className="flex-grow break-words">{item}</p>
            </div>
          ))
        ) : (
           <p className="text-xs">1. ................................................</p>
        )}
      </section>
      <hr className="border-black mb-3" />

      {/* SARAN */}
      <section className="mb-3">
        <h2 className="text-xs font-bold mb-1">SARAN:</h2>
        {saran.length > 0 ? (
          saran.map((item, index) => (
            <div key={index} className="flex text-xs mb-0.5">
              <span className="mr-1.5">{index + 1}.</span>
              <p className="flex-grow break-words">{item}</p>
            </div>
          ))
        ) : (
           <p className="text-xs">1. ................................................</p>
        )}
      </section>
      <hr className="border-black mb-3" />
      
      {/* PENUTUP */}
      <section className="mb-6">
        <h2 className="text-xs font-bold mb-1">PENUTUP:</h2>
        <p className="text-xs leading-relaxed">{penutupFullText}</p>
      </section>
      
      {/* Signature */}
      <section className="flex flex-col items-end text-xs mt-10">
        <p className="mb-10">{kotaTanggalLapor || 'Kota, dd mmmm yyyy'}</p>
        <p className="mb-1 font-semibold">Pelapor</p>
        <div className="h-12"></div> {/* Space for signature */}
        <p className="font-semibold underline decoration-dotted decoration-black underline-offset-2">
          {(pelapor.nama || 'NAMA LENGKAP').toUpperCase()}
        </p>
        <p>{pelapor.pangkatNrp || 'PANGKAT NRP XXXXXXXX'}</p>
      </section>
    </div>
  );
};

export default LaporanInformasiDisplay; 