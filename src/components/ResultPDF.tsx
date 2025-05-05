import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, Link, PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { Citation } from './ResultArtifact';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Download } from 'lucide-react';

// Daftarkan font default
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

// Definisikan styles dengan StyleSheet.create
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontFamily: 'Roboto',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 10,
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 700,
    marginTop: 5,
    marginBottom: 15,
    color: '#444444',
  },
  heading2: {
    fontSize: 16,
    fontWeight: 700,
    marginTop: 15,
    marginBottom: 8,
    color: '#333333',
  },
  heading3: {
    fontSize: 14,
    fontWeight: 500,
    marginTop: 12,
    marginBottom: 6,
    color: '#444444',
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    marginVertical: 5,
    textAlign: 'justify',
  },
  listItem: {
    fontSize: 10,
    lineHeight: 1.5,
    marginVertical: 3,
  },
  referenceItem: {
    fontSize: 8,
    lineHeight: 1.5,
    color: '#444444',
    marginVertical: 2,
    textAlign: 'left',
  },
  link: {
    fontSize: 8,
    lineHeight: 1.5,
    color: '#2563EB',
    textDecoration: 'none',
  },
  citationsTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 20,
    marginBottom: 8,
    color: '#333333',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },
  citationItem: {
    fontSize: 8,
    marginBottom: 5,
    color: '#555555',
  },
  watermark: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    width: 15,
    height: 15,
    opacity: 0.7,
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    fontSize: 8,
    textAlign: 'center',
    color: '#777777',
  },
  // Styles tambahan untuk konten yang lebih baik
  table: { 
    width: '100%', 
    marginVertical: 10 
  },
  tableRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderColor: '#EEEEEE',
    minHeight: 20
  },
  tableHeaderCell: { 
    width: '25%', 
    padding: 5, 
    backgroundColor: '#F5F5F5' 
  },
  tableHeaderText: { 
    fontSize: 9, 
    fontWeight: 'bold', 
    color: '#333333' 
  },
  tableCell: { 
    width: '25%', 
    padding: 5 
  },
  tableCellText: { 
    fontSize: 8, 
    color: '#333333' 
  },
  codeBlock: {
    backgroundColor: '#F5F5F5',
    padding: 5,
    marginVertical: 5,
    fontSize: 8,
    fontFamily: 'Courier',
    color: '#333333',
  },
  sectionDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderTopStyle: 'solid',
    marginVertical: 12,
  },
  listBullet: {
    width: 10,
    marginRight: 5,
  },
  listContainer: {
    marginVertical: 8,
  },
});

// Perbaikan #1: Cache hasil regex untuk mengurangi beban komputasi
const cleanHtmlCache = new Map<string, string>();
const cleanHtml = (html: string) => {
  if (cleanHtmlCache.has(html)) {
    return cleanHtmlCache.get(html) as string;
  }
  
  const result = html
    .replace(/<.*?>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
  
  cleanHtmlCache.set(html, result);
  return result;
};

// Perbaikan #2: Optimasi Penanganan URL panjang
const formatLongUrl = (url: string) => {
  if (url.length <= 50) return url;
  
  return (
    <View wrap={false}>
      <Text style={styles.link}>
        {url.substring(0, 47)}...
      </Text>
    </View>
  );
};

// Helper function yang dioptimalkan untuk mengubah HTML ke komponen React-PDF
const htmlMatchCache = new Map<string, {
  h1: RegExpMatchArray | null;
  h2: RegExpMatchArray | null;
  h3: RegExpMatchArray | null;
  paragraphs: RegExpMatchArray | null;
  listItems: RegExpMatchArray | null;
  tables: RegExpMatchArray | null;
  codeBlocks: RegExpMatchArray | null;
}>();

const convertHtmlToReactPdf = (html: string) => {
  // Gunakan cache untuk menghindari operasi regex yang berulang
  if (!htmlMatchCache.has(html)) {
    // Ekstrak komponen HTML dengan regex yang dioptimalkan
    htmlMatchCache.set(html, {
      h1: html.match(/<h1[^>]*>(.*?)<\/h1>/gi),
      h2: html.match(/<h2[^>]*>(.*?)<\/h2>/gi),
      h3: html.match(/<h3[^>]*>(.*?)<\/h3>/gi),
      paragraphs: html.match(/<p[^>]*>(.*?)<\/p>/gi),
      listItems: html.match(/<li[^>]*>(.*?)<\/li>/gi),
      tables: html.match(/<table[^>]*>(.*?)<\/table>/gi),
      codeBlocks: html.match(/<pre[^>]*>(.*?)<\/pre>/gi)
    });
  }
  
  const matches = htmlMatchCache.get(html)!;
  const { h1, h2, h3, paragraphs, listItems, tables, codeBlocks } = matches;
  
  // Jika tidak ada matches apapun, kembalikan teks polos
  if ((!h1 || h1.length === 0) && 
      (!h2 || h2.length === 0) && 
      (!h3 || h3.length === 0) &&
      (!paragraphs || paragraphs.length === 0) && 
      (!listItems || listItems.length === 0) && 
      (!tables || tables.length === 0) && 
      (!codeBlocks || codeBlocks.length === 0)) {
    // Fallback ke implementasi sederhana lebih efisien
    const cleanText = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?p>/gi, '\n')
      .replace(/<\/?h[1-6]>/gi, '\n')
      .replace(/<li>(.*?)<\/li>/gi, '• $1\n')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();

    return cleanText.split('\n').filter(Boolean).map((line, i) => (
      <Text key={i} style={styles.paragraph}>{line.trim()}</Text>
    ));
  }
  
  // Hasil konversi
  const result: React.ReactNode[] = [];
  
  // Proses headings, paragraf, dll secara efisien
  if (h1 && h1.length > 0) {
    h1.forEach((match, i) => {
      const content = cleanHtml(match);
      result.push(
        <Text key={`h1-${i}`} style={styles.title}>{content}</Text>,
        // Tambahkan sedikit spasi setelah heading
        <View key={`h1-space-${i}`} style={{ marginBottom: 5 }} />
      );
    });
  }
  
  if (h2 && h2.length > 0) {
    h2.forEach((match, i) => {
      const content = cleanHtml(match);
      result.push(
        <Text key={`h2-${i}`} style={styles.heading2}>{content}</Text>,
        // Tambahkan sedikit spasi setelah heading
        <View key={`h2-space-${i}`} style={{ marginBottom: 3 }} />
      );
    });
  }
  
  if (h3 && h3.length > 0) {
    h3.forEach((match, i) => {
      const content = cleanHtml(match);
      result.push(
        <Text key={`h3-${i}`} style={styles.heading3}>{content}</Text>,
        // Tambahkan sedikit spasi setelah heading
        <View key={`h3-space-${i}`} style={{ marginBottom: 2 }} />
      );
    });
  }
  
  // Proses paragraphs dengan spasi yang benar
  if (paragraphs && paragraphs.length > 0) {
    paragraphs.forEach((match, i) => {
      const content = cleanHtml(match);
      // Jangan tambahkan paragraf kosong
      if (content.trim()) {
        result.push(
          <Text key={`p-${i}`} style={{...styles.paragraph, marginBottom: 8}}>{content}</Text>
        );
      }
    });
  }
  
  // Proses list dengan bullets yang benar
  let inList = false;
  let currentListItems: React.ReactNode[] = [];
  
  if (listItems && listItems.length > 0) {
    listItems.forEach((match, i) => {
      const content = cleanHtml(match);
      
      if (!inList) {
        // Mulai list baru
        inList = true;
        currentListItems = [];
      }
      
      currentListItems.push(
        <View key={`list-item-${i}`} style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={{ width: 10, marginRight: 5 }}>•</Text>
          <Text style={{ flex: 1, ...styles.listItem }}>{content}</Text>
        </View>
      );
      
      // Jika ini item terakhir atau berikutnya bukan list item, tutup list
      if (i === listItems.length - 1) {
        result.push(
          <View key={`list-${i}`} style={{ marginVertical: 5 }}>
            {currentListItems}
          </View>
        );
        inList = false;
      }
    });
  }
  
  // Proses code blocks dengan styling yang benar
  if (codeBlocks && codeBlocks.length > 0) {
    codeBlocks.forEach((match, i) => {
      const content = cleanHtml(match);
      result.push(
        <View key={`code-${i}`} style={{ backgroundColor: '#F5F5F5', padding: 5, marginVertical: 5, borderRadius: 3 }}>
          <Text style={styles.codeBlock}>{content}</Text>
        </View>
      );
    });
  }
  
  // Proses tables dengan layout yang lebih baik
  if (tables && tables.length > 0) {
    tables.forEach((tableHtml, tableIndex) => {
      // Ekstrak rows - Gunakan regex yang lebih efisien
      const rowsMatch = tableHtml.match(/<tr[^>]*>(.*?)<\/tr>/gi);
      
      if (rowsMatch && rowsMatch.length > 0) {
        const tableRows = rowsMatch.map((rowHtml, rowIndex) => {
          // Ekstrak cells - Gunakan regex yang lebih efisien
          const cellsMatch = rowHtml.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi);
          
          if (!cellsMatch) return null;
          
          return (
            <View key={`row-${rowIndex}`} style={{
              ...styles.tableRow,
              backgroundColor: rowIndex === 0 ? '#F5F5F5' : (rowIndex % 2 === 0 ? '#FAFAFA' : '#FFFFFF')
            }}>
              {cellsMatch.map((cellHtml, cellIndex) => {
                const isTh = cellHtml.startsWith('<th');
                const content = cleanHtml(cellHtml);
                
                return (
                  <View 
                    key={`cell-${cellIndex}`} 
                    style={isTh ? styles.tableHeaderCell : styles.tableCell}
                  >
                    <Text style={isTh ? styles.tableHeaderText : styles.tableCellText}>
                      {content}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }).filter(Boolean);
        
        result.push(
          <View key={`table-${tableIndex}`} style={{...styles.table, marginVertical: 10, borderWidth: 1, borderColor: '#E5E7EB'}}>
            {tableRows}
          </View>
        );
      }
    });
  }
  
  return result;
};

// Optimasi: Gunakan memoization untuk fungsi processContent
const processContentCache = new Map<string, React.ReactNode[]>();

// Fungsi untuk memproses konten menjadi komponen React-PDF
const processContent = (content: string) => {
  // Gunakan cache jika sudah pernah memproses konten ini
  if (processContentCache.has(content)) {
    return processContentCache.get(content);
  }
  
  let result: React.ReactNode[] = [];
  
  // Deteksi pola Analisis Perkara
  if (content.includes("Analisis Perkara:") || content.includes("Hasil Analisis Penelitian Kasus")) {
    // Split konten berdasarkan heading yang bisa diidentifikasi
    const sections = content.split(/\n(?=(?:[A-Z][a-z]+ )+[A-Z][a-z]+:)|(?=.*Hasil Analisis Penelitian Kasus)/g);
    
    let title = "Hasil Analisis Penelitian Kasus";
    
    // Jika bagian pertama adalah judul (Hasil Analisis)
    if (sections[0].trim().startsWith("Hasil Analisis")) {
      title = sections[0].trim();
      sections.shift(); // Hapus judul dari sections
    }
    
    // Tambahkan judul utama
    result.push(<Text key="main-title" style={styles.title}>{title}</Text>);
    
    // Proses setiap bagian
    sections.forEach((section, index) => {
      const lines = section.trim().split("\n");
      
      // Cek apakah line pertama adalah heading (seperti "Analisis Perkara:", "Ringkasan Eksekutif:", dll)
      if (lines[0].match(/^[A-Z][\w\s]+:/) || lines[0].includes("Analisis Perkara:")) {
        const heading = lines[0].trim();
        result.push(
          <Text key={`section-heading-${index}`} style={styles.heading2}>{heading}</Text>
        );
        
        // Gabungkan sisa teks sebagai paragraf
        const paragraphText = lines.slice(1).join("\n").trim();
        if (paragraphText) {
          // Split menjadi paragraf individual berdasarkan blank lines
          const paragraphs = paragraphText.split(/\n\s*\n/);
          paragraphs.forEach((para, paraIndex) => {
            if (para.trim()) {
              result.push(
                <Text key={`para-${index}-${paraIndex}`} style={{...styles.paragraph, marginBottom: 8}}>
                  {para.trim()}
                </Text>
              );
            }
          });
        }
        
        // Tambahkan divider setelah setiap bagian kecuali yang terakhir
        if (index < sections.length - 1) {
          result.push(
            <View key={`divider-${index}`} style={styles.sectionDivider} />
          );
        }
      } else {
        // Jika tidak ada heading, perlakukan seluruh bagian sebagai satu paragraf
        if (section.trim()) {
          result.push(
            <Text key={`plain-para-${index}`} style={styles.paragraph}>
              {section.trim()}
            </Text>
          );
        }
      }
    });
    
    // Cache dan return hasilnya
    processContentCache.set(content, result);
    return result;
  }
  
  try {
    // Coba parse sebagai JSON jika memungkinkan
    const parsedJson = JSON.parse(content);
    
    if (parsedJson && typeof parsedJson === 'object' && parsedJson.ringkasan_kasus) {
      // Render struktur JSON sesuai formatnya
      result = [
        ...(parsedJson.ringkasan_kasus ? [
          <Text key="ringkasan-title" style={styles.heading2}>Ringkasan Kasus</Text>,
          <Text key="ringkasan-content" style={styles.paragraph}>{parsedJson.ringkasan_kasus}</Text>
        ] : []),
        
        ...(parsedJson.temuan_utama && Array.isArray(parsedJson.temuan_utama) ? [
          <Text key="temuan-title" style={styles.heading2}>Temuan Utama</Text>,
          ...(parsedJson.temuan_utama.map((item: string, index: number) => (
            <Text key={`temuan-${index}`} style={styles.listItem}>• {item}</Text>
          )))
        ] : []),
        
        ...(parsedJson.analisis_hukum ? [
          <Text key="analisis-title" style={styles.heading2}>Analisis Hukum</Text>,
          <Text key="analisis-content" style={styles.paragraph}>{parsedJson.analisis_hukum}</Text>
        ] : []),
        
        ...(parsedJson.referensi && Array.isArray(parsedJson.referensi) ? [
          <Text key="referensi-title" style={styles.heading2}>Referensi</Text>,
          ...(parsedJson.referensi.map((item: string, index: number) => (
            <View key={`ref-${index}`} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Text style={styles.referenceItem}>• </Text>
              {item.startsWith('http') ? (
                <Link src={item} style={styles.link}>
                  {formatLongUrl(item)}
                </Link>
              ) : (
                <Text style={styles.referenceItem}>{item}</Text>
              )}
            </View>
          )))
        ] : []),
        
        ...(parsedJson.modus_operandi ? [
          <Text key="modus-title" style={styles.heading2}>Modus Operandi</Text>,
          <Text key="modus-content" style={styles.paragraph}>{parsedJson.modus_operandi}</Text>
        ] : [])
      ];
      
      // Simpan hasil ke cache sebelum mengembalikan
      processContentCache.set(content, result);
      return result;
    }
  } catch (e) {
    // Bukan JSON, lanjutkan dengan konversi markdown
  }
  
  // Handle analisis medis
  if (content.startsWith('Tentu, berikut adalah analisis gambar medis')) {
    const processedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^(#{1,6} .+)/gm, '$1\n')
      .replace(/^(\d+\.\s+.+)\n(?=\d+\.)/gm, '$1\n\n')
      .replace(/^(\*{3} \d+\. .+ \*{3})/gm, '$1\n')
      .replace(/^([^-*].+)\n(?=\*{3} \d+\.)/gm, '$1\n\n')
      .replace(/(\*\*[^:]+:\*\*)(?!\s)/g, '$1 ')
      .replace(/^(\s{4}\*)/gm, '    *')
      .replace(/(\d+\.)\s+/g, '$1 ')
      .replace(/(\n)(?=[^\n])/g, '$1')
      .trim();
      
    const html = marked(processedContent);
    const sanitizedHtml = DOMPurify.sanitize(html);
    result = convertHtmlToReactPdf(sanitizedHtml);
    processContentCache.set(content, result);
    return result;
  }
  
  // Handle transkrip
  if (content.includes('[Pembicara')) {
    const parts = content.split(/\n(?=Metadata)/);
    const transcript = parts[0];
    const rest = parts.slice(1);
    
    const formattedTranscript = transcript
      .split(/(\[Pembicara \d+\]:)/)
      .map((part, index) => {
        if (part.match(/^\[Pembicara \d+\]:$/)) {
          return index > 0 ? `\n${part} ` : `${part} `;
        }
        return part;
      })
      .join('')
      .trim()
      .replace(/\n{2,}/g, '\n');
    
    const metadata = rest.length > 0 
      ? '\n\n## Metadata\n\n' + rest[0]
          .replace(/^\s*Metadata\s*\n*/i, '')
          .replace(/\[([^\]]+)\]/g, '**$1**')
          .trim()
      : '';

    const processedContent = `# Hasil Transkripsi\n\n${formattedTranscript}${metadata}`;
    const html = marked(processedContent);
    const sanitizedHtml = DOMPurify.sanitize(html);
    result = convertHtmlToReactPdf(sanitizedHtml);
    processContentCache.set(content, result);
    return result;
  }
  
  // Standarisasi format teks untuk kasus umum
  const processedContent = content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^(\d+\.)\s*/gm, '$1 ')
    .replace(/(\n\d+\.)(?!\n\d)/g, '\n\n$1')
    .replace(/(\n\d+\.[^\n]+)(?!\n\d+\.)/g, '$1\n')
    .replace(/^(\d+\.[^\n]+)\n([^\d\n][^\n]+)/gm, '$1\n\n$2')
    .replace(/^([^\d\n][^\n]+)\n(\d+\.)/gm, '$1\n\n$2')
    .trim();
  
  // Konversi markdown ke HTML
  const html = marked(processedContent);
  const sanitizedHtml = DOMPurify.sanitize(html);
  
  // Konversi HTML ke komponen React-PDF
  result = convertHtmlToReactPdf(sanitizedHtml);
  
  // Cache result
  processContentCache.set(content, result);
  return result;
};

interface ResultPDFProps {
  content: string;
  title?: string;
  citations?: Citation[];
}

// Komponen PDF utama dengan optimasi
const ResultPDFContent: React.FC<ResultPDFProps> = React.memo(({ content, title, citations }) => {
  // Dapatkan tanggal dan waktu saat ini untuk header
  const currentDate = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(currentDate);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header dokumen dengan tanggal/waktu */}
        <View style={{ 
          position: 'absolute', 
          top: 10, 
          right: 20, 
          fontSize: 8, 
          color: '#777777',
          textAlign: 'right'
        }}>
          <Text>Dibuat pada: {formattedDate}</Text>
        </View>
        
        <View style={{...styles.section, paddingHorizontal: 10, paddingVertical: 15}}>
          {title && <Text style={styles.title}>{title}</Text>}
          
          {processContent(content)}
          
          {citations && citations.length > 0 && (
            <>
              <View style={{ marginTop: 20 }} />
              <Text style={styles.citationsTitle}>Sumber Dokumen</Text>
              {citations.map((citation, index) => (
                <Text key={index} style={styles.citationItem}>
                  {index + 1}. {citation.fileName} ({citation.fileType}) - {citation.fileSize}
                </Text>
              ))}
            </>
          )}
          
          {/* Logo watermark */}
          <Image src="/1.png" style={styles.watermark} />
          
          {/* Area kosong untuk footer - pastikan tidak tertimpa konten */}
          <View style={{ marginTop: 40 }} />
        </View>
        
        {/* Footer dengan nomor halaman dan info lembaga */}
        <Text
          style={{
            ...styles.footer,
            paddingBottom: 10,
            borderTopWidth: 0.5,
            borderTopColor: '#DDDDDD',
            paddingTop: 7,
          }}
          render={({ pageNumber, totalPages }) => (
            `Halaman ${pageNumber} dari ${totalPages} | Penyidik Toolkit`
          )}
          fixed
        />
      </Page>
    </Document>
  );
});

// Komponen PDFViewer untuk menampilkan preview PDF
export const ResultPDFViewer: React.FC<ResultPDFProps> = (props) => {
  return (
    <PDFViewer style={{ width: '100%', height: '100%' }}>
      <ResultPDFContent {...props} />
    </PDFViewer>
  );
};

// Komponen untuk download link PDF
export const ResultPDFDownloadLink: React.FC<ResultPDFProps & { fileName?: string }> = ({ 
  fileName, 
  ...props 
}) => {
  const safeFileName = fileName || 'hasil-analisis.pdf';
  
  return (
    <PDFDownloadLink 
      document={<ResultPDFContent {...props} />} 
      fileName={safeFileName}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm 
        rounded-lg transition-all duration-200
        bg-blue-600 text-white
        hover:bg-blue-700"
    >
      {({ loading }) => (
        <>
          <Download className="w-4 h-4" />
          <span>{loading ? 'Menyiapkan PDF...' : 'Unduh PDF'}</span>
        </>
      )}
    </PDFDownloadLink>
  );
};

export default ResultPDFContent; 