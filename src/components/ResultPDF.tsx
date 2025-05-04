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
      .replace(/<\/?[^>]+(>|$)/g, '');

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
      result.push(<Text key={`h1-${i}`} style={styles.title}>{content}</Text>);
    });
  }
  
  if (h2 && h2.length > 0) {
    h2.forEach((match, i) => {
      const content = cleanHtml(match);
      result.push(<Text key={`h2-${i}`} style={styles.heading2}>{content}</Text>);
    });
  }
  
  if (h3 && h3.length > 0) {
    h3.forEach((match, i) => {
      const content = cleanHtml(match);
      result.push(<Text key={`h3-${i}`} style={styles.heading3}>{content}</Text>);
    });
  }
  
  if (paragraphs && paragraphs.length > 0) {
    paragraphs.forEach((match, i) => {
      const content = cleanHtml(match);
      result.push(<Text key={`p-${i}`} style={styles.paragraph}>{content}</Text>);
    });
  }
  
  if (listItems && listItems.length > 0) {
    listItems.forEach((match, i) => {
      const content = cleanHtml(match);
      result.push(
        <Text key={`li-${i}`} style={styles.listItem}>• {content}</Text>
      );
    });
  }
  
  if (codeBlocks && codeBlocks.length > 0) {
    codeBlocks.forEach((match, i) => {
      const content = cleanHtml(match);
      result.push(
        <Text key={`code-${i}`} style={styles.codeBlock}>{content}</Text>
      );
    });
  }
  
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
            <View key={`row-${rowIndex}`} style={styles.tableRow}>
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
          <View key={`table-${tableIndex}`} style={styles.table}>
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
  
  try {
    // Coba parse sebagai JSON jika memungkinkan
    const parsedJson = JSON.parse(content);
    
    if (parsedJson && typeof parsedJson === 'object') {
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
  
  // Konversi markdown ke HTML - minimize calls
  const html = marked(content);
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
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          {title && <Text style={styles.title}>{title}</Text>}
          
          {processContent(content)}
          
          {citations && citations.length > 0 && (
            <>
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
          
          {/* Footer dengan nomor halaman - gunakan View dengan margin daripada <br> tags */}
          <View style={{ marginTop: 20 }} />
          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) => (
              `Halaman ${pageNumber} dari ${totalPages} | Penyidik Toolkit`
            )}
            fixed
          />
        </View>
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