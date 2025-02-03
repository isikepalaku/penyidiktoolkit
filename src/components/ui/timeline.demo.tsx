import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine,
} from "@/components/ui/timeline";

export function TimelineDemo() {
  return (
    <Timeline>
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
        <TimelineHeading>Pencarian Lokasi dari Gambar</TimelineHeading>
        <TimelineDot status="done" />
        <TimelineLine done/>
        <TimelineContent>
          Agen khusus untuk menganalisis dan mencari lokasi berdasarkan gambar yang diberikan.
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
    </Timeline>
  );
}