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
        <TimelineHeading>Case Research Agent</TimelineHeading>
        <TimelineDot status="done" />
        <TimelineLine done />
        <TimelineContent>
          Agen untuk melakukan penelitian kasus. Membantu investigasi dengan menganalisis dan mencari informasi terkait kasus.
        </TimelineContent>
      </TimelineItem>
      
      <TimelineItem status="done">
        <TimelineHeading>Hoax Checker Agent</TimelineHeading>
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
        <TimelineHeading>Bantek Agent</TimelineHeading>
        <TimelineDot status="done" />
        <TimelineLine done />
        <TimelineContent>
          Agen dengan pengetahuan SOP bantuan teknis sesuai perkaba. Memberikan panduan teknis sesuai prosedur.
        </TimelineContent>
      </TimelineItem>

      <TimelineItem>
        <TimelineHeading>Image Processor Agent</TimelineHeading>
        <TimelineDot status="current" />
        <TimelineLine />
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
        <TimelineHeading>Search Putusan Agent</TimelineHeading>
        <TimelineDot status="done" />
        <TimelineLine done />
        <TimelineContent>
          Agen untuk pencarian putusan pengadilan berdasarkan kasus. Membantu referensi kasus serupa.
        </TimelineContent>
      </TimelineItem>

      <TimelineItem status="done">
        <TimelineHeading>Wassidik Agent</TimelineHeading>
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