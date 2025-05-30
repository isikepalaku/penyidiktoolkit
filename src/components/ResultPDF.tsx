import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, Link, PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { Citation } from './ResultArtifact';

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

// Fungsi untuk memproses teks dengan format inline
const processInlineFormatting = (text: string): React.ReactNode[] => {
  // Pastikan text adalah string
  if (!text || typeof text !== 'string') {
    return [<Text key="empty"></Text>];
  }

  // Pra-proses: Bersihkan format bold yang tidak standar
  let processedText = text
    // Perbaiki format * * * menjadi **
    .replace(/\*\s*\*\s*\*\s*([^*]+)\s*\*\s*\*(\s*\*)?/g, '**$1**');
    
  // Proses bold: **text**
  
  // Cari semua bold text
  const segments: {text: string, isBold: boolean, isItalic: boolean}[] = [];
  let remainingText = processedText;
  
  // Proses bold (**text**)
  let boldMatches = [...remainingText.matchAll(/\*\*(.*?)\*\*/g)];
  for (const match of boldMatches) {
    if (match.index !== undefined) {
      // Tambahkan teks sebelum bold
      if (match.index > 0) {
        segments.push({
          text: remainingText.substring(0, match.index),
          isBold: false,
          isItalic: false
        });
      }
      
      // Tambahkan teks bold
      segments.push({
        text: match[1],
        isBold: true,
        isItalic: false
      });
      
      // Update remaining text
      remainingText = remainingText.substring(match.index + match[0].length);
    }
  }
  
  // Proses italic (*text*)
  remainingText = segments.length > 0 ? remainingText : processedText;
  if (remainingText) {
    segments.push({
      text: remainingText,
      isBold: false,
      isItalic: false
    });
  }
  
  // Proses semua segmen untuk italic
  const finalSegments: {text: string, isBold: boolean, isItalic: boolean}[] = [];
  for (const segment of segments) {
    if (segment.isBold) {
      finalSegments.push(segment);
      continue;
    }
    
    let italicRemainingText = segment.text;
    let italicMatches = [...italicRemainingText.matchAll(/\*(.*?)\*/g)];
    
    if (italicMatches.length === 0) {
      finalSegments.push(segment);
      continue;
    }
    
    let lastItalicIndex = 0;
    for (const italicMatch of italicMatches) {
      if (italicMatch.index !== undefined) {
        // Tambahkan teks sebelum italic
        if (italicMatch.index > lastItalicIndex) {
          finalSegments.push({
            text: italicRemainingText.substring(lastItalicIndex, italicMatch.index),
            isBold: segment.isBold,
            isItalic: false
          });
        }
        
        // Tambahkan teks italic
        finalSegments.push({
          text: italicMatch[1],
          isBold: segment.isBold,
          isItalic: true
        });
        
        lastItalicIndex = italicMatch.index + italicMatch[0].length;
      }
    }
    
    // Tambahkan sisa teks
    if (lastItalicIndex < italicRemainingText.length) {
      finalSegments.push({
        text: italicRemainingText.substring(lastItalicIndex),
        isBold: segment.isBold,
        isItalic: false
      });
    }
  }
  
  // Render semua segmen
  return finalSegments.map((segment, i) => {
    const style: any = {};
    if (segment.isBold) style.fontWeight = 700;
    if (segment.isItalic) style.fontStyle = 'italic';
    
    return <Text key={`inline-${i}`} style={style}>{cleanText(segment.text)}</Text>;
  });
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
        // Untuk paragraf, gunakan processInlineFormatting untuk menangani format dalam paragraf
        if (paragraphToken.text && paragraphToken.text.trim()) {
          result.push(
            <Text key={`para-${i}`} style={styles.paragraph}>
              {processInlineFormatting(paragraphToken.text)}
            </Text>
          );
        }
        break;
        
      case 'list':
        const listToken = token as marked.Tokens.List;
        const listItems = listToken.items.map((item, itemIndex) => {
          // Gunakan processInlineFormatting untuk format dalam list items
          let prefix = '•';
          if (listToken.ordered) {
            // Pastikan start adalah number atau default ke 1
            const start = typeof listToken.start === 'number' ? listToken.start : 1;
            prefix = `${start + itemIndex}.`;
          }
          
          return (
            <View key={`list-item-${i}-${itemIndex}`} style={{ flexDirection: 'row', marginBottom: 3 }}>
              <Text style={{ width: listToken.ordered ? 15 : 10, marginRight: 5 }}>{prefix}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItem}>
                  {/* Support untuk format inline dalam list items */}
                  {processInlineFormatting(item.text)}
                </Text>
                
                {/* Jika ada task list atau sublist */}
                {item.task && (
                  <View style={{ flexDirection: 'row', marginTop: 2 }}>
                    <Text style={{ width: 15, marginRight: 5 }}>{item.checked ? '☑' : '☐'}</Text>
                    <Text style={styles.listItem}>{item.text}</Text>
                  </View>
                )}
              </View>
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
        
        // Fungsi untuk memproses sel tabel dengan benar
        const processCellContent = (cell: any): React.ReactNode => {
          if (cell === null || cell === undefined) {
            return <Text></Text>;
          }
          if (typeof cell === 'string') {
            // Gunakan processInlineFormatting untuk format dalam sel tabel
            return <>{processInlineFormatting(cell)}</>;
          }
          if (typeof cell === 'number' || typeof cell === 'boolean') {
            return <Text>{String(cell)}</Text>;
          }
          if (typeof cell === 'object') {
            // Jika sel adalah token marked.js
            if (cell.text) {
              return <>{processInlineFormatting(cell.text)}</>;
            }
            if (cell.tokens) {
              // Gabungkan semua teks dari token
              const textContent = cell.tokens.map((token: any) => 
                token.text ? token.text : ''
              ).join(' ');
              return <>{processInlineFormatting(textContent)}</>;
            }
            // Jika sel adalah array
            if (Array.isArray(cell)) {
              const textContent = cell.map(item => {
                if (typeof item === 'string') return item;
                if (item && item.text) return item.text;
                return String(item);
              }).join(' ');
              return <>{processInlineFormatting(textContent)}</>;
            }
          }
          // Fallback jika tidak ada cara lain untuk mendapatkan teks
          try {
            return <Text>{cleanText(JSON.stringify(cell))}</Text>;
          } catch (e) {
            return <Text></Text>;
          }
        };

        // Buat baris header
        const headerCells = tableToken.header.map((cell, cellIndex) => (
          <View 
            key={`header-cell-${cellIndex}`} 
            style={styles.tableHeaderCell}
          >
            <Text style={styles.tableHeaderText}>
              {processCellContent(cell)}
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
                {processCellContent(cell)}
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
        // Gunakan processInlineFormatting untuk format dalam blockquote
        
        result.push(
          <View key={`blockquote-${i}`} style={{ marginVertical: 5, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: '#E5E7EB' }}>
            <Text style={{...styles.paragraph, fontStyle: 'italic', color: '#4B5563'}}>
              {processInlineFormatting(blockquoteToken.text)}
            </Text>
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
              <Text key={`unknown-${i}`} style={styles.paragraph}>
                {processInlineFormatting(textContent)}
              </Text>
            );
          }
        }
    }
  }
  
  return result;
};

// Fungsi untuk memproses konten menjadi komponen React-PDF
const processContent = (content: string): React.ReactNode[] => {
  // Pra-pemrosesan konten - perbaikan untuk masalah PDF
  // Potong konten yang terlalu panjang untuk mencegah kegagalan PDF
  const MAX_CONTENT_LENGTH = 50000; // Pembatasan karakter
  let safeContent = content;
  
  if (content.length > MAX_CONTENT_LENGTH) {
    console.warn(`Konten terlalu panjang (${content.length} karakter). Memotong ke ${MAX_CONTENT_LENGTH} karakter.`);
    safeContent = content.substring(0, MAX_CONTENT_LENGTH) + 
      "\n\n... (Konten terlalu panjang. Beberapa bagian tidak ditampilkan.)";
  }
  
  // Pembersihan konten untuk pastikan kompatibilitas dengan PDF
  safeContent = safeContent
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')  // Normalize multiple line breaks
    .replace(/[\uD800-\uDFFF]/g, '') // Remove surrogate pairs (emoji)
    .replace(/[\u0000-\u001F]/g, '') // Remove control characters
    .replace(/[\u2028\u2029]/g, '\n') // Replace line/paragraph separators
    .replace(/\*\s*\*\s*\*\s*([^*]+)\s*\*\s*\*(\s*\*)?/g, '**$1**'); // Fix bold formatting

  // Deteksi format output Gemini (dari agentSpkt.ts)
  if (content.includes("Analisis Kronologi:") && (content.includes("Analisis Pihak yang Terlibat:") || content.includes("Identifikasi Barang Bukti dan Kerugian:"))) {
    // Preprocessing untuk format bullet points berjenjang dari Gemini
    console.log("Mendeteksi format output Gemini, melakukan preprocessing khusus");
    
    // Pre-process konten untuk menangani format bold yang tidak standar
    const cleanedContent = content
      // Menormalkan format bold * * * menjadi **
      .replace(/\*\s*\*\s*\*\s*([^*]+)\s*\*\s*\*(\s*\*)?/g, '**$1**')
      // Pastikan bold diikuti spasi setelah colon
      .replace(/\*\*([^:*]+):\*\*(?!\s)/g, '**$1:** ')
      // Perbaiki format list yang tidak konsisten
      .replace(/^([•○◦◉◯])\s+/gm, '* ');
    
    // Parse format bullet points berjenjang (* - >)
    const sections = cleanedContent.split(/\n(?=\d+\.\s+\*\*[^:]+:\*\*|\n(?=\*\s+))/g);
    const result: React.ReactNode[] = [];
    
    // Tambahkan judul utama
    result.push(<Text key="main-title" style={styles.title}>Hasil Analisis Kasus</Text>);
    
    sections.forEach((section, sectionIndex) => {
      const lines = section.trim().split('\n');
      let currentLine = 0;
      
      // Cek jika section dimulai dengan header (1. **Judul:**)
      if (lines[0].match(/^\d+\.\s+\*\*([^:]+):\*\*/)) {
        const headerMatch = lines[0].match(/^\d+\.\s+\*\*([^:]+):\*\*/);
        if (headerMatch && headerMatch[1]) {
          result.push(
            <Text key={`section-header-${sectionIndex}`} style={styles.heading2}>
              {headerMatch[1]}
            </Text>
          );
          currentLine = 1; // Lanjutkan dari baris berikutnya
        }
      }
      
      // Proses baris-baris bullet points
      while (currentLine < lines.length) {
        const line = lines[currentLine].trim();
        
        // Level 1 bullet (* item)
        if (line.startsWith('* ')) {
          const level1Content = line.substring(2);
          result.push(
            <View key={`level1-${sectionIndex}-${currentLine}`} style={{ flexDirection: 'row', marginBottom: 3, marginLeft: 5 }}>
              <Text style={{ width: 10 }}>•</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItem}>
                  {processInlineFormatting(level1Content)}
                </Text>
              </View>
            </View>
          );
          currentLine++;
          
          // Proses sub-bullet jika ada
          let hasSubItems = false;
          while (currentLine < lines.length && (lines[currentLine].trim().startsWith('- ') || lines[currentLine].trim().startsWith('> '))) {
            hasSubItems = true;
            const subLine = lines[currentLine].trim();
            
            // Level 2 bullet (- item)
            if (subLine.startsWith('- ')) {
              const level2Content = subLine.substring(2);
              result.push(
                <View key={`level2-${sectionIndex}-${currentLine}`} style={{ flexDirection: 'row', marginBottom: 3, marginLeft: 20 }}>
                  <Text style={{ width: 10 }}>-</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listItem}>
                      {processInlineFormatting(level2Content)}
                    </Text>
                  </View>
                </View>
              );
            } 
            // Level 3 bullet (> item)
            else if (subLine.startsWith('> ')) {
              const level3Content = subLine.substring(2);
              result.push(
                <View key={`level3-${sectionIndex}-${currentLine}`} style={{ flexDirection: 'row', marginBottom: 3, marginLeft: 35 }}>
                  <Text style={{ width: 10 }}>›</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listItem}>
                      {processInlineFormatting(level3Content)}
                    </Text>
                  </View>
                </View>
              );
            }
            
            currentLine++;
          }
          
          // Tambahkan sedikit space setelah grup bullet
          if (hasSubItems) {
            result.push(
              <View key={`space-after-group-${sectionIndex}-${currentLine}`} style={{ marginBottom: 5 }} />
            );
          }
        } 
        // Paragraf biasa
        else {
          if (line && !line.startsWith('#')) {
            result.push(
              <Text key={`para-${sectionIndex}-${currentLine}`} style={styles.paragraph}>
                {processInlineFormatting(line)}
              </Text>
            );
          }
          currentLine++;
        }
      }
      
      // Tambahkan divider antar section kecuali section terakhir
      if (sectionIndex < sections.length - 1) {
        result.push(
          <View key={`divider-${sectionIndex}`} style={styles.sectionDivider} />
        );
      }
    });
    
    return result;
  }
  
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
export const ResultPDFDownloadLink: React.FC<ResultPDFProps & { 
  fileName?: string;
  onError?: (error: Error) => void;
}> = ({ 
  fileName, 
  onError,
  ...props 
}) => {
  const safeFileName = fileName || 'hasil-analisis.pdf';
  const [error, setError] = React.useState<Error | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [forceTxtDownload, setForceTxtDownload] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const MAX_RETRIES = 2;
  
  // Reset error when props change
  React.useEffect(() => {
    setError(null);
    setForceTxtDownload(false);
    setRetryCount(0);
  }, [props.content]);

  // Notify parent when error occurs
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);
  
  // Handle direct download
  const handleManualDownload = async () => {
    try {
      if (isDownloading) return;
      setIsDownloading(true);
      console.log('Attempting PDF download...');
      
      // Jika mode txt dipaksa, langsung unduh sebagai txt
      if (forceTxtDownload) {
        downloadAsTxt();
        return;
      }
      
      try {
        // Import PDFRenderer dynamically to prevent render errors
        const { pdf } = await import('@react-pdf/renderer');
        
        console.log(`PDF generation attempt ${retryCount + 1}/${MAX_RETRIES + 1}...`);
        
        // Tambahkan timeout untuk menghindari blocking UI
        const pdfPromise = new Promise<Blob>((resolve, reject) => {
          // Buat timeout untuk mencegah blocking terlalu lama
          const timeout = setTimeout(() => {
            reject(new Error('PDF generation timed out'));
          }, 10000); // 10 detik timeout
          
          pdf(<ResultPDFContent {...props} />)
            .toBlob()
            .then(blob => {
              clearTimeout(timeout);
              resolve(blob);
            })
            .catch(error => {
              clearTimeout(timeout);
              reject(error);
            });
        });
        
        // Generate PDF blob
        const blob = await pdfPromise;
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = safeFileName;
        link.click();
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
        setError(null);
      } catch (pdfErr) {
        console.error('PDF generation failed:', pdfErr);
        
        // Coba retry jika belum mencapai batas
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying PDF generation (${retryCount + 1}/${MAX_RETRIES})...`);
          setRetryCount(prevCount => prevCount + 1);
          setIsDownloading(false);
          // Tunggu 1 detik sebelum retry
          setTimeout(() => handleManualDownload(), 1000);
          return;
        }
        
        // Fallback to text download jika sudah mencoba beberapa kali
        console.warn('PDF generation failed after retries, falling back to text download');
        downloadAsTxt();
      }
    } catch (err) {
      console.error('Error during download:', err);
      const newError = err instanceof Error ? err : new Error('Gagal membuat PDF');
      setError(newError);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Fungsi untuk download sebagai txt
  const downloadAsTxt = () => {
    try {
      // Pastikan konten diformat dengan baik untuk txt
      const cleanContent = props.content
        .replace(/\r\n/g, '\n')
        .replace(/\u00A0/g, ' '); // Ganti non-breaking space dengan space biasa
      
      const textBlob = new Blob([cleanContent], { type: 'text/plain;charset=utf-8' });
      const textUrl = URL.createObjectURL(textBlob);
      const link = document.createElement('a');
      link.href = textUrl;
      link.download = safeFileName.replace('.pdf', '.txt');
      link.click();
      setTimeout(() => URL.revokeObjectURL(textUrl), 100);
      
      // Tampilkan pesan informatif
      const fallbackError = new Error(
        `PDF tidak dapat dibuat setelah ${retryCount} kali percobaan. Dokumen telah diunduh dalam format teks (.txt).`
      );
      setError(fallbackError);
      if (onError) onError(fallbackError);
    } catch (textErr) {
      console.error('Text download failed:', textErr);
      setError(new Error('Gagal mengunduh dokumen dalam format apapun. Silakan coba lagi nanti.'));
    }
  };
  
  // Jika ada error, tampilkan opsi untuk download sebagai TXT
  if (error) {
    return (
      <button
        onClick={() => {
          setForceTxtDownload(true);
          handleManualDownload();
        }}
        disabled={isDownloading}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm 
          rounded-lg transition-all duration-200
          ${isDownloading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} 
          text-white`}
      >
        <Download className="w-4 h-4" />
        <span>{isDownloading ? 'Mengunduh...' : 'Unduh Sebagai Teks (.txt)'}</span>
      </button>
    );
  }
  
  // Tombol unduh PDF normal
  return (
    <button
      onClick={handleManualDownload}
      disabled={isDownloading}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm 
        rounded-lg transition-all duration-200
        ${isDownloading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} 
        text-white`}
      title="Download hasil analisis sebagai PDF"
    >
      <Download className="w-4 h-4" />
      <span>{isDownloading ? `Mengunduh${'.'.repeat((retryCount % 3) + 1)}` : 'Unduh PDF'}</span>
    </button>
  );
};

export default ResultPDFContent; 