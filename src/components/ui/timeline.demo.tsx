import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine,
} from "@/components/ui/timeline";

export default function TimelineDemo() {
  return (
    <div className="w-full h-[500px] overflow-y-auto border rounded-md p-4 bg-background">
      <Timeline>
      <TimelineItem status="done">
          <TimelineHeading>Toolkit Ai CDR analisis</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
          Analisis data tanpa software i2 analyst, flexibel dengan graph visual dan otomatisasi analisis node hanya dengan perintah via chat.
          </TimelineContent>
        </TimelineItem>
      <TimelineItem status="done">
          <TimelineHeading>Penyidik Narkotika dan Krimum</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Penambahan asisten penyidik narkotika dan krimum, menggunakan model ai reasoning dan tehnik RAG yang lebih efektif dari versi sebelumnya.
          </TimelineContent>
        </TimelineItem>
      <TimelineItem status="done">
          <TimelineHeading>Analisis Dokumen</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Automatisasi analisis dokumen, melakukan ringkasan, ekstraksi informasi penting, melakukan perbandingan antar dokumen dengan akurasi tinggi (BETA).
          </TimelineContent>
        </TimelineItem>
      <TimelineItem status="done">
          <TimelineHeading>Agen Dokpol</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Prototype Agen Ai menganalisis gambar pada bidang kedokteran forensik
          </TimelineContent>
        </TimelineItem>
      <TimelineItem status="done">
          <TimelineHeading>Analisis Audio</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen ai mengekstrak file audio menjadi teks dan melakukan analisis sentimen dari file audio.
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>Analisis Sentimen</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen ai yang memahami analisis sentimen sebuah isu atau topik tertentu.
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>Penyidik Ditreskrimsus</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Prototype Agen ai pada bidang tindak pidana khsusus seperti Industri perdagangan, Tindak pidana Korupsi dll (proses penambahan agen lainnya).
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>Ahli KUHP 2023</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen ai yang memahami undang-undang mengenai Kitab Undang-Undang Hukum Pidana (KUHP) Nomor 1 Tahun 2023.
          </TimelineContent>
        </TimelineItem>
          <TimelineItem status="done">
          <TimelineHeading>Ahli UU P2SK 2023</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen ai yang memahami undang-undang mengenai Undang-undang (UU) Nomor 4 Tahun 2023 tentang Pengembangan dan Penguatan sektor jasa keuangan.
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>Peneliti Hukum</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen untuk melakukan penelitian hukum. Membantu menganalisis kasus secara Akademis.
          </TimelineContent>
        </TimelineItem>
        
        <TimelineItem status="done">
          <TimelineHeading>Pemeriksa Hoax</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen khusus untuk melakukan verifikasi dan pencarian berita hoax. Membantu memvalidasi kebenaran informasi.
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="done">
          <TimelineHeading>SPKT Agent</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen yang bertugas memecah kronologis kasus menjadi detail lebih terperinci untuk analisis mendalam.
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="done">
          <TimelineHeading>SOP Bantek</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen dengan pengetahuan SOP bantuan teknis sesuai perkaba. Memberikan panduan teknis sesuai prosedur.
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="done">
          <TimelineHeading>Pencarian Geo Lokasi dari Gambar</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done/>
          <TimelineContent>
            Agen khusus untuk menganalisis dan mencari prediksi tempat berdasarkan geolokasi.
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="done">
          <TimelineHeading>Perkaba Agent</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen yang memahami SOP lidik sidik sesuai perkaba. Memastikan investigasi sesuai dengan prosedur standar.
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="done">
          <TimelineHeading>Pencari Putusan Peradilan</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen untuk pencarian putusan pengadilan berdasarkan kronologis kasus. Membantu referensi kasus serupa.
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="done">
          <TimelineHeading>SOP Wassidik</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            Agen dengan pengetahuan SOP Wassidik. Membantu pengawasan proses penyidikan.
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="done">
          <TimelineHeading>Image Forensic Agent</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineContent>
            Ahli forensik gambar. Melakukan analisis mendalam terhadap bukti berupa gambar.
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="done">
          <TimelineHeading>Pembuat Laporan</TimelineHeading>
          <TimelineDot status="error" />
          <TimelineContent>
            Agen pembuat laporan ke pimpinan. Membantu menyusun dan mengorganisir laporan untuk disampaikan kepada pimpinan.
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="done">
          <TimelineHeading>Ahli ITE</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineContent>
          Agen AI yang dirancang untuk membantu memahami undang-undang mengenai Undang-undang (UU) Nomor 1 Tahun 2024.
          </TimelineContent>
        </TimelineItem>
      </Timeline>
    </div>
  );
}