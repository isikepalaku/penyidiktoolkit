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

// Helper untuk membersihkan teks
const cleanText = (text: string): string => {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

// Format URL panjang
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

// Fungsi untuk merender token inline dalam teks
const renderInlineContent = (text: string): React.ReactNode => {
  // Handle teks biasa
  return <Text>{cleanText(text)}</Text>;
};

// Fungsi baru: Mengonversi token marked.js ke komponen React-PDF
const renderTokensToPdf = (tokens: marked.Token[]): React.ReactNode[] => {
  const result: React.ReactNode[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    switch (token.type) {
      case 'heading':
        const headingToken = token as marked.Tokens.Heading;
        const headingText = cleanText(headingToken.text);
        
        // Pilih style berdasarkan level heading
        let headingStyle;
        switch (headingToken.depth) {
          case 1:
            headingStyle = styles.title;
            break;
          case 2:
            headingStyle = styles.heading2;
            break;
          case 3:
            headingStyle = styles.heading3;
            break;
          default:
            headingStyle = styles.heading3;
        }
        
        result.push(
          <Text key={`heading-${i}`} style={headingStyle}>{headingText}</Text>,
          <View key={`heading-space-${i}`} style={{ marginBottom: headingToken.depth === 1 ? 5 : 3 }} />
        );
        break;
        
      case 'paragraph':
        const paragraphToken = token as marked.Tokens.Paragraph;
        const paragraphText = cleanText(paragraphToken.text);
        
        // Jangan tambahkan paragraf kosong
        if (paragraphText.trim()) {
          result.push(
            <Text key={`para-${i}`} style={{...styles.paragraph, marginBottom: 8}}>
              {paragraphText}
            </Text>
          );
        }
        break;
        
      case 'list':
        const listToken = token as marked.Tokens.List;
        const listItems = listToken.items.map((item, itemIndex) => {
          const itemText = cleanText(item.text);
          return (
            <View key={`list-item-${i}-${itemIndex}`} style={{ flexDirection: 'row', marginBottom: 3 }}>
              <Text style={{ width: 10, marginRight: 5 }}>•</Text>
              <Text style={{ flex: 1, ...styles.listItem }}>{itemText}</Text>
            </View>
          );
        });
        
        result.push(
          <View key={`list-${i}`} style={{ marginVertical: 5 }}>
            {listItems}
          </View>
        );
        break;
        
      case 'code':
        const codeToken = token as marked.Tokens.Code;
        const codeText = codeToken.text;
        
        result.push(
          <View key={`code-${i}`} style={{ backgroundColor: '#F5F5F5', padding: 5, marginVertical: 5, borderRadius: 3 }}>
            <Text style={styles.codeBlock}>{codeText}</Text>
          </View>
        );
        break;
        
      case 'table':
        const tableToken = token as marked.Tokens.Table;
        
        // Buat baris header
        const headerCells = tableToken.header.map((cell, cellIndex) => (
          <View 
            key={`header-cell-${cellIndex}`} 
            style={styles.tableHeaderCell}
          >
            <Text style={styles.tableHeaderText}>
              {typeof cell === 'string' ? cleanText(cell) : cleanText(String(cell))}
            </Text>
          </View>
        ));
        
        const headerRow = (
          <View key={`header-row`} style={{...styles.tableRow, backgroundColor: '#F5F5F5'}}>
            {headerCells}
          </View>
        );
        
        // Buat baris data
        const dataRows = tableToken.rows.map((row, rowIndex) => {
          const cells = row.map((cell, cellIndex) => (
            <View 
              key={`cell-${rowIndex}-${cellIndex}`} 
              style={styles.tableCell}
            >
              <Text style={styles.tableCellText}>
                {typeof cell === 'string' ? cleanText(cell) : cleanText(String(cell))}
              </Text>
            </View>
          ));
          
          return (
            <View 
              key={`row-${rowIndex}`} 
              style={{...styles.tableRow, backgroundColor: rowIndex % 2 === 0 ? '#FAFAFA' : '#FFFFFF'}}
            >
              {cells}
            </View>
          );
        });
        
        result.push(
          <View key={`table-${i}`} style={{...styles.table, marginVertical: 10, borderWidth: 1, borderColor: '#E5E7EB'}}>
            {headerRow}
            {dataRows}
          </View>
        );
        break;
        
      case 'hr':
        result.push(
          <View key={`hr-${i}`} style={styles.sectionDivider} />
        );
        break;
        
      case 'blockquote':
        const blockquoteToken = token as marked.Tokens.Blockquote;
        const blockquoteText = cleanText(blockquoteToken.text);
        
        result.push(
          <View key={`blockquote-${i}`} style={{ marginVertical: 5, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: '#E5E7EB' }}>
            <Text style={{...styles.paragraph, fontStyle: 'italic', color: '#4B5563'}}>{blockquoteText}</Text>
          </View>
        );
        break;
        
      case 'space':
        result.push(
          <View key={`space-${i}`} style={{ marginVertical: 5 }} />
        );
        break;
        
      default:
        // Untuk token yang tidak dikenali, coba ambil teks jika ada
        if ('text' in token) {
          const textContent = (token as any).text;
          if (textContent && typeof textContent === 'string' && textContent.trim()) {
            result.push(
              <Text key={`unknown-${i}`} style={styles.paragraph}>{cleanText(textContent)}</Text>
            );
          }
        }
    }
  }
  
  return result;
};

// Fungsi untuk memproses konten menjadi komponen React-PDF
const processContent = (content: string): React.ReactNode[] => {
  // Pemrosesan khusus untuk struktur analisis perkara
  if (content.includes("Analisis Perkara:") || content.includes("Hasil Analisis Penelitian Kasus")) {
    // Biarkan pemrosesan khusus ini seperti sebelumnya
    const sections = content.split(/\n(?=(?:[A-Z][a-z]+ )+[A-Z][a-z]+:)|(?=.*Hasil Analisis Penelitian Kasus)/g);
    
    const result: React.ReactNode[] = [];
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
      
      // Cek apakah line pertama adalah heading
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
    
    return result;
  }
  
  try {
    // Coba parse sebagai JSON jika memungkinkan
    const parsedJson = JSON.parse(content);
    
    if (parsedJson && typeof parsedJson === 'object' && parsedJson.ringkasan_kasus) {
      // Render struktur JSON sesuai formatnya
      const result = [
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
      
    // Parse markdown menjadi tokens
    const tokens = marked.lexer(processedContent);
    
    // Gunakan fungsi baru untuk merender tokens ke komponen React-PDF
    return renderTokensToPdf(tokens);
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

    // Gabungkan konten transkripsi dengan format markdown
    const processedContent = `# Hasil Transkripsi\n\n${formattedTranscript}${metadata}`;
    
    // Parse ke tokens
    const tokens = marked.lexer(processedContent);
    
    // Render tokens ke komponen React-PDF
    return renderTokensToPdf(tokens);
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
  
  // Parse markdown ke tokens dan pertahankan urutan struktur dokumen
  const tokens = marked.lexer(processedContent);
  
  // Render tokens ke komponen React-PDF
  return renderTokensToPdf(tokens);
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