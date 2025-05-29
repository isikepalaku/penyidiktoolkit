import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { LaporanInformasiData } from '@/types/spktTypes';

// Fungsi untuk convert markdown ke HTML untuk print
export const markdownToHtml = (markdownText: string): string => {
  let html = markdownText;
  
  // Headers
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
};

// Fungsi untuk convert LaporanInformasiData ke HTML untuk print
export const generateLaporanInformasiHTML = (data: LaporanInformasiData): string => {
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

  return `
    <div class="laporan-container">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div style="font-size: 11pt; font-weight: bold;">KOPSTUK</div>
        <div style="font-size: 11pt; font-weight: bold;">S-1.2</div>
      </div>
      <hr style="border: 1px solid #000; margin-bottom: 20px;" />

      <!-- Logo and Title -->
      <div class="laporan-header">
        <div class="logo-placeholder">
          LOGO POLRI
        </div>
        <h1>LAPORAN INFORMASI</h1>
        <p style="margin: 5px 0;">tentang</p>
        <p style="font-weight: bold; text-decoration: underline; margin: 5px 0;">
          ${tentang || '........................................................................'}
        </p>
        <p style="margin: 10px 0;">Nomor: ${nomorLaporan || 'LI/......../..../RES...../..../................'}</p>
      </div>
      <hr style="border-top: 2px solid #000; margin-bottom: 20px;" />

      <!-- PENDAHULUAN -->
      <div class="laporan-section">
        <h2>PENDAHULUAN:</h2>
        <div class="detail-item">
          <span class="detail-label">1. Sumber</span>
          <span>:</span>
          <span class="detail-value">${pendahuluan.sumber || '................................................'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">2. Cara mendapatkan</span>
          <span>:</span>
          <span class="detail-value">${pendahuluan.caraMendapatkan || '................................................'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">3. Waktu mendapatkan</span>
          <span>:</span>
          <span class="detail-value">${pendahuluan.waktuMendapatkan || '................................................'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">4. Tempat baket didapat</span>
          <span>:</span>
          <span class="detail-value">${pendahuluan.tempatBaketDidapat || '................................................'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">5. Objek (dugaan perkara)</span>
          <span>:</span>
          <span class="detail-value">${pendahuluan.objekDugaanPerkara || '................................................'}</span>
        </div>
      </div>
      <hr style="border: 1px solid #000; margin: 15px 0;" />

      <!-- FAKTA-FAKTA -->
      <div class="laporan-section">
        <h2>FAKTA-FAKTA:</h2>
        <div class="subyek-section">
          <div class="subyek-title">1. Subyek I:</div>
          ${faktaFakta.subyek1 ? `
            <div class="subyek-item">
              <div class="detail-item">
                <span class="detail-label">a. nama</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek1.nama || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">b. nomor identitas</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek1.nomorIdentitas || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">c. kewarganegaraan</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek1.kewarganegaraan || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">d. jenis kelamin</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek1.jenisKelamin || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">e. tempat/tanggal lahir</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek1.tempatTanggalLahir || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">f. pekerjaan</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek1.pekerjaan || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">g. agama</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek1.agama || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">h. alamat</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek1.alamat || '................................................'}</span>
              </div>
            </div>
          ` : `
            <div class="subyek-item">
              <div class="detail-item">
                <span class="detail-label">a. nama</span>
                <span class="detail-value">- Tidak Ada Data -</span>
              </div>
            </div>
          `}
        </div>
        
        <div class="subyek-section">
          <div class="subyek-title">2. Subyek II:</div>
          ${faktaFakta.subyek2 && faktaFakta.subyek2.nama ? `
            <div class="subyek-item">
              <div class="detail-item">
                <span class="detail-label">a. nama</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek2.nama}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">b. nomor identitas</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek2.nomorIdentitas || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">c. kewarganegaraan</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek2.kewarganegaraan || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">d. jenis kelamin</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek2.jenisKelamin || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">e. tempat/tanggal lahir</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek2.tempatTanggalLahir || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">f. pekerjaan</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek2.pekerjaan || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">g. agama</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek2.agama || '................................................'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">h. alamat</span>
                <span>:</span>
                <span class="detail-value">${faktaFakta.subyek2.alamat || '................................................'}</span>
              </div>
            </div>
          ` : `
            <div class="subyek-item">
              <div class="detail-item">
                <span class="detail-label">a. nama</span>
                <span class="detail-value">-</span>
              </div>
            </div>
          `}
        </div>
      </div>
      <hr style="border: 1px solid #000; margin: 15px 0;" />

      <!-- URAIAN PERKARA -->
      <div class="laporan-section">
        <h2>URAIAN PERKARA:</h2>
        <div class="numbered-list">
          ${uraianPerkara.length > 0 ? 
            uraianPerkara.map((item, index) => `
              <div class="numbered-item">
                <span class="number">${index + 1}.</span>
                <span>${item}</span>
              </div>
            `).join('')
            : '<div class="numbered-item"><span class="number">1.</span><span>................................................</span></div>'
          }
        </div>
      </div>
      <hr style="border: 1px solid #000; margin: 15px 0;" />

      <!-- KESIMPULAN -->
      <div class="laporan-section">
        <h2>KESIMPULAN:</h2>
        <div class="numbered-list">
          ${kesimpulan.length > 0 ? 
            kesimpulan.map((item, index) => `
              <div class="numbered-item">
                <span class="number">${index + 1}.</span>
                <span>${item}</span>
              </div>
            `).join('')
            : '<div class="numbered-item"><span class="number">1.</span><span>................................................</span></div>'
          }
        </div>
      </div>
      <hr style="border: 1px solid #000; margin: 15px 0;" />

      <!-- SARAN -->
      <div class="laporan-section">
        <h2>SARAN:</h2>
        <div class="numbered-list">
          ${saran.length > 0 ? 
            saran.map((item, index) => `
              <div class="numbered-item">
                <span class="number">${index + 1}.</span>
                <span>${item}</span>
              </div>
            `).join('')
            : '<div class="numbered-item"><span class="number">1.</span><span>................................................</span></div>'
          }
        </div>
      </div>
      <hr style="border: 1px solid #000; margin: 15px 0;" />
      
      <!-- PENUTUP -->
      <div class="laporan-section">
        <h2>PENUTUP:</h2>
        <p style="line-height: 1.6; text-align: justify;">${penutupFullText}</p>
      </div>
      
      <!-- Signature -->
      <div class="signature-section">
        <p style="margin-bottom: 60px;">${kotaTanggalLapor || 'Kota, dd mmmm yyyy'}</p>
        <p style="margin-bottom: 5px; font-weight: bold;">Pelapor</p>
        <div class="signature-space"></div>
        <p style="font-weight: bold; text-decoration: underline; margin-bottom: 5px;">
          ${(pelapor.nama || 'NAMA LENGKAP').toUpperCase()}
        </p>
        <p>${pelapor.pangkatNrp || 'PANGKAT NRP XXXXXXXX'}</p>
      </div>
    </div>
  `;
};

// Print document function
export const printDocument = (documentContent?: string, laporanInformasiData?: LaporanInformasiData | null) => {
  if (!documentContent && !laporanInformasiData) return;
  
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const currentTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let htmlContent = '';
  
  if (laporanInformasiData) {
    // Convert LaporanInformasiData to HTML for printing
    htmlContent = generateLaporanInformasiHTML(laporanInformasiData);
  } else if (documentContent) {
    // Convert markdown to HTML
    htmlContent = markdownToHtml(documentContent);
  }
  
  // Create hidden iframe untuk print
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return;
  
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Dokumen SPKT - ${currentDate}</title>
        <style>
          @page {
            size: A4;
            margin: 2cm 2.5cm 2cm 2.5cm;
          }
          
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            margin: 0;
            padding: 0;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
            page-break-after: avoid;
          }
          
          .header h1 {
            font-size: 16pt;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
          }
          
          .header h2 {
            font-size: 14pt;
            font-weight: normal;
            margin: 5px 0;
          }
          
          .header .date-time {
            font-size: 11pt;
            margin-top: 10px;
          }
          
          .content {
            text-align: justify;
          }
          
          .content h1 {
            font-size: 14pt;
            font-weight: bold;
            margin: 20px 0 10px 0;
            page-break-after: avoid;
          }
          
          .content h2 {
            font-size: 13pt;
            font-weight: bold;
            margin: 15px 0 8px 0;
            page-break-after: avoid;
          }
          
          .content h3 {
            font-size: 12pt;
            font-weight: bold;
            margin: 12px 0 6px 0;
            page-break-after: avoid;
          }
          
          .content p {
            margin: 10px 0;
            text-indent: 1cm;
          }
          
          .content ul {
            margin: 10px 0;
            padding-left: 2cm;
          }
          
          .content li {
            margin: 5px 0;
          }
          
          .content strong {
            font-weight: bold;
          }
          
          .content em {
            font-style: italic;
          }
          
          .content a {
            color: #000;
            text-decoration: underline;
          }
          
          /* Laporan Informasi specific styles */
          .laporan-container {
            font-family: 'Roboto Mono', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.4;
            color: #000;
            background: white;
            padding: 32px;
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #000;
          }
          
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          
          .kopstuk, .s-code {
            font-size: 14px;
            font-weight: bold;
          }
          
          .header-line {
            border: none;
            border-top: 1px solid #000;
            margin-bottom: 24px;
          }
          
          .title-section {
            text-align: center;
            margin-bottom: 24px;
          }
          
          .logo-placeholder {
            width: 80px;
            height: 80px;
            margin: 0 auto 8px;
            border: 1px solid #666;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #000;
          }
          
          .main-title {
            font-size: 14px;
            font-weight: bold;
            margin: 0;
            letter-spacing: 2px;
          }
          
          .about-text {
            font-size: 14px;
            margin: 4px 0;
          }
          
          .subject-text {
            font-size: 14px;
            font-weight: bold;
            text-decoration: underline;
            text-decoration-style: dotted;
            text-underline-offset: 4px;
            margin: 4px 0;
          }
          
          .number-text {
            font-size: 14px;
            margin: 4px 0;
          }
          
          .title-separator {
            border: none;
            border-top: 2px solid #000;
            margin-bottom: 16px;
          }
          
          .report-section {
            margin-bottom: 16px;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 8px 0;
          }
          
          .detail-item {
            display: flex;
            font-size: 14px;
            margin-bottom: 2px;
            align-items: flex-start;
          }
          
          .detail-item.indent {
            margin-left: 16px;
          }
          
          .detail-label {
            width: 192px;
            flex-shrink: 0;
          }
          
          .colon {
            margin-right: 8px;
            flex-shrink: 0;
          }
          
          .detail-value {
            flex-grow: 1;
            word-break: break-words;
          }
          
          .subyek-section {
            margin: 8px 0;
          }
          
          .subyek-title {
            font-size: 14px;
            font-weight: bold;
            margin: 8px 0 4px 0;
          }
          
          .subyek-details {
            margin-bottom: 8px;
          }
          
          .numbered-list {
            margin: 8px 0;
          }
          
          .numbered-item {
            display: flex;
            font-size: 14px;
            margin-bottom: 2px;
            align-items: flex-start;
          }
          
          .numbered-item .number {
            margin-right: 8px;
            flex-shrink: 0;
          }
          
          .numbered-item .content {
            flex-grow: 1;
            word-break: break-words;
          }
          
          .section-separator {
            border: none;
            border-top: 1px solid #000;
            margin: 16px 0;
          }
          
          .penutup-text {
            font-size: 14px;
            line-height: 1.6;
            text-align: justify;
          }
          
          .signature-section {
            text-align: right;
            margin-top: 48px;
            font-size: 14px;
          }
          
          .signature-date {
            margin-bottom: 48px;
          }
          
          .signature-label {
            margin-bottom: 4px;
            font-weight: bold;
          }
          
          .signature-space {
            height: 64px;
          }
          
          .signature-name {
            font-weight: bold;
            text-decoration: underline;
            text-decoration-style: dotted;
            text-underline-offset: 4px;
            margin-bottom: 4px;
          }
          
          .signature-rank {
            margin: 0;
          }
          
          @media print {
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>KEPOLISIAN NEGARA REPUBLIK INDONESIA</h1>
          <h2>DOKUMEN SPKT (SENTRA PELAYANAN KEPOLISIAN TERPADU)</h2>
          <div class="date-time">
            Dicetak pada: ${currentDate} pukul ${currentTime} WIB
          </div>
        </div>
        
        <div class="content">
          ${htmlContent}
        </div>
        
        <div class="footer">
          Sumber: Piket SPKT AI Assistant | ${currentDate}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();
  
  // Wait for content to load then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };
};

// Convert markdown to DOCX paragraphs
export const markdownToDocxParagraphs = (markdownText: string): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  const lines = markdownText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }
    
    // Headers
    if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(2),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 }
      }));
      continue;
    }
    
    if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(3),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }));
      continue;
    }
    
    if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(4),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 80 }
      }));
      continue;
    }
    
    // Process text with bold, italic, and links
    const textRuns: TextRun[] = [];
    let currentText = line;
    
    // Simple processing for bold and italic
    const parts = currentText.split(/(\*\*.*?\*\*|\*.*?\*)/);
    
    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        textRuns.push(new TextRun({
          text: part.slice(2, -2),
          bold: true
        }));
      } else if (part.startsWith('*') && part.endsWith('*')) {
        textRuns.push(new TextRun({
          text: part.slice(1, -1),
          italics: true
        }));
      } else if (part.trim()) {
        textRuns.push(new TextRun(part));
      }
    }
    
    paragraphs.push(new Paragraph({
      children: textRuns.length > 0 ? textRuns : [new TextRun(line)],
      spacing: { after: 120 }
    }));
  }
  
  return paragraphs;
};

// Convert LaporanInformasiData to DOCX format - improved consistency
export const laporanInformasiToDocx = (data: LaporanInformasiData): Paragraph[] => {
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

  const paragraphs: Paragraph[] = [];

  // Header (KOPSTUK dan S-1.2) with proper tab alignment - consistent with display (text-xs)
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'KOPSTUK', bold: true, font: 'Times New Roman', size: 20 }), // 10pt = text-xs equivalent
        new TextRun({ text: '\t\t\t\t\t\t\t\t\t\t', font: 'Times New Roman' }), // Reduced from 20 tabs to 10 tabs
        new TextRun({ text: 'S-1.2', bold: true, font: 'Times New Roman', size: 20 })
      ],
      spacing: { after: 120 }
    }),
    new Paragraph({ 
      text: '_______________________________________________________________________________',
      spacing: { after: 240 }
    })
  );

  // Logo area placeholder - consistent with display (w-16 h-16)
  paragraphs.push(
    new Paragraph({
      text: 'LOGO POLRI',
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    })
  );

  // Title section - consistent sizing with display (text-xs)
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ 
        text: 'LAPORAN INFORMASI', 
        bold: true, 
        font: 'Times New Roman', 
        size: 20 // 10pt equivalent to text-xs
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 }
    }),
    new Paragraph({
      children: [new TextRun({ 
        text: 'tentang', 
        font: 'Times New Roman', 
        size: 20 
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 }
    }),
    new Paragraph({
      children: [new TextRun({ 
        text: tentang || '........................................................................', 
        bold: true, 
        underline: {},
        font: 'Times New Roman', 
        size: 20 
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [new TextRun({ 
        text: `Nomor: ${nomorLaporan || 'LI/......../..../RES...../..../................'}`,
        font: 'Times New Roman', 
        size: 20 
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({ 
      text: '_______________________________________________________________________________',
      spacing: { after: 200 }
    })
  );

  // PENDAHULUAN
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'PENDAHULUAN:', bold: true, font: 'Times New Roman', size: 20 })],
      spacing: { before: 200, after: 120 }
    })
  );

  // Detail items for PENDAHULUAN with consistent tab alignment and width (w-48 = 192px equivalent)
  const pendahuluanItems = [
    { label: '1. Sumber', value: pendahuluan.sumber },
    { label: '2. Cara mendapatkan', value: pendahuluan.caraMendapatkan },
    { label: '3. Waktu mendapatkan', value: pendahuluan.waktuMendapatkan },
    { label: '4. Tempat baket didapat', value: pendahuluan.tempatBaketDidapat },
    { label: '5. Objek (dugaan perkara)', value: pendahuluan.objekDugaanPerkara }
  ];

  pendahuluanItems.forEach(item => {
    paragraphs.push(
      new Paragraph({ 
        children: [
          new TextRun({ text: item.label, font: 'Times New Roman', size: 20 }),
          new TextRun({ text: '\t\t\t: ', font: 'Times New Roman', size: 20 }),
          new TextRun({ text: item.value || '................................................', font: 'Times New Roman', size: 20 })
        ],
        spacing: { after: 60 }
      })
    );
  });

  paragraphs.push(
    new Paragraph({ 
      text: '_______________________________________________________________________________',
      spacing: { before: 120, after: 200 }
    })
  );

  // FAKTA-FAKTA
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'FAKTA-FAKTA:', bold: true, font: 'Times New Roman', size: 20 })],
      spacing: { before: 200, after: 120 }
    })
  );

  // Subyek I
  paragraphs.push(
    new Paragraph({ 
      children: [new TextRun({ text: '1. Subyek I:', bold: true, font: 'Times New Roman', size: 20 })],
      spacing: { after: 80 }
    })
  );

  if (faktaFakta.subyek1) {
    const subyek1Items = [
      { label: 'a. nama', value: faktaFakta.subyek1.nama },
      { label: 'b. nomor identitas', value: faktaFakta.subyek1.nomorIdentitas },
      { label: 'c. kewarganegaraan', value: faktaFakta.subyek1.kewarganegaraan },
      { label: 'd. jenis kelamin', value: faktaFakta.subyek1.jenisKelamin },
      { label: 'e. tempat/tanggal lahir', value: faktaFakta.subyek1.tempatTanggalLahir },
      { label: 'f. pekerjaan', value: faktaFakta.subyek1.pekerjaan },
      { label: 'g. agama', value: faktaFakta.subyek1.agama },
      { label: 'h. alamat', value: faktaFakta.subyek1.alamat }
    ];

    subyek1Items.forEach(item => {
      paragraphs.push(
        new Paragraph({ 
          children: [
            new TextRun({ text: `    ${item.label}`, font: 'Times New Roman', size: 20 }),
            new TextRun({ text: '\t\t: ', font: 'Times New Roman', size: 20 }),
            new TextRun({ text: item.value || '................................................', font: 'Times New Roman', size: 20 })
          ],
          spacing: { after: 60 }
        })
      );
    });
  } else {
    paragraphs.push(
      new Paragraph({ 
        children: [
          new TextRun({ text: '    a. nama', font: 'Times New Roman', size: 20 }),
          new TextRun({ text: '\t\t: ', font: 'Times New Roman', size: 20 }),
          new TextRun({ text: '- Tidak Ada Data -', font: 'Times New Roman', size: 20 })
        ]
      })
    );
  }

  // Subyek II
  paragraphs.push(
    new Paragraph({ 
      children: [new TextRun({ text: '2. Subyek II:', bold: true, font: 'Times New Roman', size: 20 })],
      spacing: { before: 120, after: 80 }
    })
  );

  if (faktaFakta.subyek2?.nama) {
    const subyek2Items = [
      { label: 'a. nama', value: faktaFakta.subyek2.nama },
      { label: 'b. nomor identitas', value: faktaFakta.subyek2.nomorIdentitas },
      { label: 'c. kewarganegaraan', value: faktaFakta.subyek2.kewarganegaraan },
      { label: 'd. jenis kelamin', value: faktaFakta.subyek2.jenisKelamin },
      { label: 'e. tempat/tanggal lahir', value: faktaFakta.subyek2.tempatTanggalLahir },
      { label: 'f. pekerjaan', value: faktaFakta.subyek2.pekerjaan },
      { label: 'g. agama', value: faktaFakta.subyek2.agama },
      { label: 'h. alamat', value: faktaFakta.subyek2.alamat }
    ];

    subyek2Items.forEach(item => {
      paragraphs.push(
        new Paragraph({ 
          children: [
            new TextRun({ text: `    ${item.label}`, font: 'Times New Roman', size: 20 }),
            new TextRun({ text: '\t\t: ', font: 'Times New Roman', size: 20 }),
            new TextRun({ text: item.value || '................................................', font: 'Times New Roman', size: 20 })
          ],
          spacing: { after: 60 }
        })
      );
    });
  } else {
    paragraphs.push(
      new Paragraph({ 
        children: [
          new TextRun({ text: '    a. nama', font: 'Times New Roman', size: 20 }),
          new TextRun({ text: '\t\t: ', font: 'Times New Roman', size: 20 }),
          new TextRun({ text: '-', font: 'Times New Roman', size: 20 })
        ]
      })
    );
  }

  paragraphs.push(
    new Paragraph({ 
      text: '_______________________________________________________________________________',
      spacing: { before: 120, after: 200 }
    })
  );

  // URAIAN PERKARA
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'URAIAN PERKARA:', bold: true, font: 'Times New Roman', size: 20 })],
      spacing: { before: 200, after: 120 }
    })
  );
  
  if (uraianPerkara.length > 0) {
    uraianPerkara.forEach((item, index) => {
      paragraphs.push(
        new Paragraph({ 
          children: [
            new TextRun({ text: `${index + 1}. `, font: 'Times New Roman', size: 20 }),
            new TextRun({ text: item, font: 'Times New Roman', size: 20 })
          ],
          spacing: { after: 80 }
        })
      );
    });
  } else {
    paragraphs.push(
      new Paragraph({ 
        children: [
          new TextRun({ text: '1. ', font: 'Times New Roman', size: 20 }),
          new TextRun({ text: '................................................', font: 'Times New Roman', size: 20 })
        ]
      })
    );
  }

  paragraphs.push(
    new Paragraph({ 
      text: '_______________________________________________________________________________',
      spacing: { before: 120, after: 200 }
    })
  );

  // KESIMPULAN
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'KESIMPULAN:', bold: true, font: 'Times New Roman', size: 20 })],
      spacing: { before: 200, after: 120 }
    })
  );
  
  if (kesimpulan.length > 0) {
    kesimpulan.forEach((item, index) => {
      paragraphs.push(
        new Paragraph({ 
          children: [
            new TextRun({ text: `${index + 1}. `, font: 'Times New Roman', size: 20 }),
            new TextRun({ text: item, font: 'Times New Roman', size: 20 })
          ],
          spacing: { after: 80 }
        })
      );
    });
  } else {
    paragraphs.push(
      new Paragraph({ 
        children: [
          new TextRun({ text: '1. ', font: 'Times New Roman', size: 20 }),
          new TextRun({ text: '................................................', font: 'Times New Roman', size: 20 })
        ]
      })
    );
  }

  paragraphs.push(
    new Paragraph({ 
      text: '_______________________________________________________________________________',
      spacing: { before: 120, after: 200 }
    })
  );

  // SARAN
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'SARAN:', bold: true, font: 'Times New Roman', size: 20 })],
      spacing: { before: 200, after: 120 }
    })
  );
  
  if (saran.length > 0) {
    saran.forEach((item, index) => {
      paragraphs.push(
        new Paragraph({ 
          children: [
            new TextRun({ text: `${index + 1}. `, font: 'Times New Roman', size: 20 }),
            new TextRun({ text: item, font: 'Times New Roman', size: 20 })
          ],
          spacing: { after: 80 }
        })
      );
    });
  } else {
    paragraphs.push(
      new Paragraph({ 
        children: [
          new TextRun({ text: '1. ', font: 'Times New Roman', size: 20 }),
          new TextRun({ text: '................................................', font: 'Times New Roman', size: 20 })
        ]
      })
    );
  }

  paragraphs.push(
    new Paragraph({ 
      text: '_______________________________________________________________________________',
      spacing: { before: 120, after: 200 }
    })
  );

  // PENUTUP
  const penutupFullText = `Demikian laporan informasi ini dibuat untuk dapat digunakan sebagai bahan penyelidikan dan atau penyidikan dugaan Tindak Pidana ${penutupDetails.dugaanTindakPidana || '[dugaan tindak pidana]'} sebagaimana dimaksud dalam ${penutupDetails.pasalUuYangRelevan || '[Pasal UU]'}, yang terjadi di ${penutupDetails.tempatKejadianPerkara || '[TKP]'}, ${penutupDetails.waktuKejadianLengkap || '[waktu kejadian]'} dalam kurun waktu ${penutupDetails.kurunWaktuSpesifik || '[kurun waktu]'}.`;

  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'PENUTUP:', bold: true, font: 'Times New Roman', size: 20 })],
      spacing: { before: 200, after: 120 }
    }),
    new Paragraph({ 
      children: [new TextRun({ text: penutupFullText, font: 'Times New Roman', size: 20 })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 400 }
    })
  );

  // Signature section - consistent with display
  paragraphs.push(
    new Paragraph({ 
      children: [new TextRun({ text: kotaTanggalLapor || 'Kota, dd mmmm yyyy', font: 'Times New Roman', size: 20 })],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 400, after: 600 }
    }),
    new Paragraph({ 
      children: [new TextRun({ text: 'Pelapor', bold: true, font: 'Times New Roman', size: 20 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 800 }
    }),
    new Paragraph({ 
      children: [new TextRun({ 
        text: (pelapor.nama || 'NAMA LENGKAP').toUpperCase(), 
        bold: true, 
        underline: {},
        font: 'Times New Roman', 
        size: 20 
      })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 80 }
    }),
    new Paragraph({ 
      children: [new TextRun({ text: pelapor.pangkatNrp || 'PANGKAT NRP XXXXXXXX', font: 'Times New Roman', size: 20 })],
      alignment: AlignmentType.RIGHT
    })
  );

  return paragraphs;
};

// Download document function
export const downloadDocument = async (documentContent?: string, laporanInformasiData?: LaporanInformasiData | null) => {
  if (!documentContent && !laporanInformasiData) return;
  
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  let paragraphs: Paragraph[] = [];
  let fileName = '';
  
  if (laporanInformasiData) {
    // Convert LaporanInformasiData to DOCX
    paragraphs = laporanInformasiToDocx(laporanInformasiData);
    fileName = `Laporan_Informasi_${currentDate.replace(/\s/g, '_')}.docx`;
  } else if (documentContent) {
    // Convert markdown to DOCX
    paragraphs = markdownToDocxParagraphs(documentContent);
    fileName = `Analisis_SPKT_${currentDate.replace(/\s/g, '_')}.docx`;
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });
  
  try {
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    alert('Terjadi error saat membuat dokumen DOCX. Silakan coba lagi.');
  }
}; 