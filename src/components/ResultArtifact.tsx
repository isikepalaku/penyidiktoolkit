import React, { useState, useRef, useCallback, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { X, Copy, Check, Printer, FileText, Info, Eye, FileType, FileImage, File as FileIconGeneric } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { ResultPDFDownloadLink } from './ResultPDF';

// Konfigurasi marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

export interface Citation {
  fileName: string;
  fileType: string;
  fileSize: string;
  timestamp: string;
}

interface ResultArtifactProps {
  content: string;
  onClose: () => void;
  citations?: Citation[];
  title?: string;
}

/**
 * ResultArtifact Component
 * A reusable component for displaying analysis results with optional citations
 */
const ResultArtifact: React.FC<ResultArtifactProps> = ({ content, onClose, citations, title }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showCitations, setShowCitations] = useState(true); // Default tampilkan citation
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handlePrint = useReactToPrint({
    documentTitle: 'Hasil Analisis',
    onAfterPrint: () => {
      console.log('Print completed');
    },
    pageStyle: `
      /* Pastikan semua aturan @import berada di awal, jika diperlukan */
      @page {
        margin: 10mm;
        size: A4;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.5;
        position: relative;
      }

      .no-print {
        display: none !important;
      }

      /* Watermark styling */
      #watermark {
        position: fixed !important;
        bottom: 10mm !important;
        right: 10mm !important;
        z-index: 9999 !important;
        display: block !important;
        opacity: 0.7 !important;
        width: 15mm !important;
        height: 15mm !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      #watermark img {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
      }

      /* URL breaking */
      a {
        word-break: break-all !important;
        overflow-wrap: anywhere !important;
      }

      /* Allow tables to extend to full width */
      table {
        width: 100% !important;
        table-layout: fixed !important;
      }

      /* Make sure URLs in links break properly */
      a, p, li {
        max-width: 100% !important;
        word-break: break-word !important;
      }

      /* Citations section for printing */
      .citations-print-section {
        display: block !important;
        margin-top: 2em !important;
        padding-top: 1em !important;
        border-top: 1px solid #e5e7eb !important;
      }

      /* Add page numbers */
      .content-wrapper::after {
        content: "Halaman " counter(page) " dari " counter(pages);
        position: fixed;
        bottom: 10mm;
        left: 0;
        right: 0;
        font-size: 8pt;
        text-align: center;
        color: #666;
      }

      /* Footer text */
      .content-wrapper::before {
        content: "Penyidik Toolkit";
        position: fixed;
        bottom: 10mm;
        right: 25mm;
        font-size: 10pt;
        color: #999;
      }
    `,
  });

  const printRef = useCallback(() => contentRef.current, []);

  // Function to format the specific JSON structure into Markdown
  const formatJsonToMarkdown = (jsonData: any): string => {
    let markdown = '';

    if (jsonData.ringkasan_kasus) {
      markdown += `## Ringkasan Kasus\n\n${jsonData.ringkasan_kasus}\n\n`;
    }
    if (jsonData.temuan_utama && Array.isArray(jsonData.temuan_utama)) {
      markdown += `## Temuan Utama\n\n`;
      jsonData.temuan_utama.forEach((item: string) => {
        markdown += `- ${item}\n`;
      });
      markdown += `\n`;
    }
    if (jsonData.analisis_hukum) {
      markdown += `## Analisis Hukum\n\n${jsonData.analisis_hukum}\n\n`;
    }
    if (jsonData.referensi && Array.isArray(jsonData.referensi)) {
      markdown += `## Referensi\n\n`;
      jsonData.referensi.forEach((item: string) => {
        // Format links to be text only if too long (untuk mencegah URLs panjang)
        if (item.startsWith('http://') || item.startsWith('https://')) {
          const displayUrl = item.length > 60 ? item.substring(0, 57) + '...' : item;
          markdown += `- [${displayUrl}](${item})\n`;
        } else {
          markdown += `- ${item}\n`;
        }
      });
      markdown += `\n`;
    }
    if (jsonData.modus_operandi) {
      markdown += `## Modus Operandi\n\n${jsonData.modus_operandi}\n\n`;
    }

    return markdown.trim();
  };


  const processContent = (rawContent: string): string => {
    // 1. Attempt to parse as JSON and format if it matches the expected structure
    try {
      const parsedJson = JSON.parse(rawContent);
      if (parsedJson && typeof parsedJson === 'object' && parsedJson.ringkasan_kasus) {
        // Assume it's the target JSON structure if ringkasan_kasus exists
        return formatJsonToMarkdown(parsedJson);
      }
    } catch (e) {
      // Not JSON or doesn't match structure, proceed to other checks
    }

    // 2. Handle medical analysis markdown content (existing logic)
    if (rawContent.startsWith('Tentu, berikut adalah analisis gambar medis')) {
      return rawContent
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Reduce excessive newlines
        .replace(/^(#{1,6} .+)/gm, '$1\n') // Add spacing after headers
        .replace(/^(\d+\.\s+.+)\n(?=\d+\.)/gm, '$1\n\n') // Add spacing between numbered sections
        .replace(/^(\*{3} \d+\. .+ \*{3})/gm, '$1\n') // Format ### numbered headers
        .replace(/^([^-*].+)\n(?=\*{3} \d+\.)/gm, '$1\n\n') // Add spacing before headers
        .replace(/(\*\*[^:]+:\*\*)(?!\s)/g, '$1 ') // Ensure colon spacing after bold headers
        .replace(/^(\s{4}\*)/gm, '    *') // Fix nested list indentation
        .replace(/(\d+\.)\s+/g, '$1 ') // Normalize numbered list spacing
        .replace(/(\n)(?=[^\n])/g, '$1') // Remove trailing newlines
        .trim();
    }

    // Preserve original processing for other content types
    if (rawContent.includes('[Pembicara')) {
      const [transcript, ...rest] = rawContent.split(/\n(?=Metadata)/);
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

      return `# Hasil Transkripsi\n\n${formattedTranscript}${metadata}`;
    }

    return rawContent
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^(\d+\.)\s*/gm, '$1 ')
      .replace(/(\n\d+\.)(?!\n\d)/g, '\n\n$1')
      .replace(/(\n\d+\.[^\n]+)(?!\n\d+\.)/g, '$1\n')
      .replace(/^(\d+\.[^\n]+)\n([^\d\n][^\n]+)/gm, '$1\n\n$2')
      .replace(/^([^\d\n][^\n]+)\n(\d+\.)/gm, '$1\n\n$2')
      .trim();
  };

  // Original formatTimestamp function (ensure it's correctly placed and not duplicated)
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(date);
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return timestamp; // Return original timestamp on error
    }
  };


  const getFileTypeDisplay = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return `Gambar ${fileType.replace('image/', '').toUpperCase()}`;
    } else if (fileType === 'application/pdf') {
      return 'Dokumen PDF';
    } else {
      return fileType;
    }
  };

  const getFileIcon = (fileType: string, size: 'sm' | 'md' = 'sm') => {
    const iconSize = size === 'sm' ? "w-4 h-4" : "w-5 h-5";
    
    if (fileType === 'application/pdf') {
      return <FileType className={`${iconSize} text-red-500`} />;
    } else if (fileType.startsWith('image/')) {
      return <FileImage className={`${iconSize} text-blue-500`} />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText className={`${iconSize} text-blue-600`} />;
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return <FileText className={`${iconSize} text-green-600`} />;
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return <FileText className={`${iconSize} text-orange-600`} />;
    } else {
      return <FileIconGeneric className={`${iconSize} text-gray-500`} />;
    }
  };

  const formatMarkdown = (content: string) => {
    try {
      // Pre-process teks untuk URL panjang
      const processedText = content
        // Deteksi URL panjang dalam markdown dan tambahkan soft hyphens untuk word breaking
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]{50,})\)/g, (_, text, url) => {
          // Wrap URL dengan kode khusus yang akan diproses oleh CSS
          return `[${text}](${url.replace(/\//g, '\\/').replace(/\./g, '\\.')})`; 
        })
        // Deteksi URL langsung di teks (bukan dalam markdown link)
        .replace(/(https?:\/\/[^\s]{50,})/g, (url) => {
          // Buat URL dapat wrap
          return url.replace(/\//g, '\\/').replace(/\./g, '\\.');
        });

      // Convert markdown to HTML
      const html = marked(processedText);
      
      // Sanitize HTML to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(html);
      
      // Tambahkan beberapa perbaikan untuk URL yang panjang
      const enhancedHtml = sanitizedHtml
        // Tambahkan class khusus untuk URL panjang
        .replace(/<a\s+href="([^"]+)"/g, '<a href="$1" class="break-all overflow-wrap-anywhere"')
        // Untuk pre dan code blocks, tambahkan class overflow-x-auto
        .replace(/<pre>/g, '<pre class="overflow-x-auto whitespace-pre-wrap">')
        // Untuk tabel, tambahkan container dengan overflow-x-auto
        .replace(/<table>/g, '<div class="overflow-x-auto w-full"><table class="min-w-full">') 
        .replace(/<\/table>/g, '</table></div>');
      
      return enhancedHtml;
    } catch (error) {
      console.error('Error formatting markdown:', error);
      return content;
    }
  };

  useEffect(() => {
    const event = new CustomEvent('analysisComplete');
    window.dispatchEvent(event);
    
    // Setup watermark dan pastikan siap untuk print/export
    const watermark = document.getElementById('watermark');
    if (watermark) {
      console.log('Watermark element initialized');
      
      // Preload logo image untuk memastikan tersedia saat export
      const logoImg = new Image();
      logoImg.src = '/1.png';
      logoImg.onload = () => console.log('Logo image loaded successfully');
      logoImg.onerror = (e) => console.error('Failed to load logo image', e);
    }
  }, []);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 z-30"
        onClick={onClose}
      />
      
      <div className="fixed right-0 top-0 h-full lg:w-1/2 w-full 
        bg-white
        border-l border-gray-200 
        overflow-auto z-40 
        shadow-2xl 
        animate-slide-left">
        
        <div className="sticky top-0 z-50 bg-white p-4 
          flex justify-between items-center 
          border-b border-gray-200 
          no-print
          shadow-sm"
        >
          <h2 className="text-xl font-semibold text-gray-800">{title || 'Hasil Analisis'}</h2>
          <div className="flex items-center gap-2">
            {citations && citations.length > 0 && (
              <button
                onClick={() => setShowCitations(!showCitations)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm 
                  rounded-lg transition-all duration-200
                  ${showCitations ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}
                  hover:bg-blue-100 hover:text-blue-700`}
                title="Tampilkan sumber dokumen"
              >
                <Info className="w-4 h-4" />
                <span>Sumber</span>
              </button>
            )}
            <button
              onClick={() => handlePrint(printRef)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm 
                rounded-lg transition-all duration-200
                bg-gray-100 text-gray-700
                hover:bg-gray-200"
              title="Cetak hasil analisis"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
            
            {/* PDF Download Link dengan React-PDF */}
            <ResultPDFDownloadLink 
              content={content}
              title={title}
              citations={citations}
              fileName={`${title || 'Hasil-Analisis'}.pdf`}
            />
            
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm 
                rounded-lg transition-all duration-200
                bg-gray-100 text-gray-700
                hover:bg-gray-200"
              title={isCopied ? "Tersalin!" : "Salin teks"}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all duration-200
                text-gray-500 hover:text-gray-700 
                hover:bg-gray-100"
              title="Tutup"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div ref={contentRef} className="w-full">
          {/* Watermark container - tersembunyi secara default, hanya ditampilkan saat export/print */}
          <div 
            id="watermark" 
            style={{ 
              position: 'fixed', 
              bottom: '10mm', 
              right: '10mm', 
              zIndex: 9999, 
              opacity: 0.7,
              width: '15mm',
              height: '15mm',
              display: 'none',
              pointerEvents: 'none'
            }}
          >
            <img 
              src="/1.png" 
              alt="Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain' 
              }} 
            />
          </div>
          
          <div className="p-4 lg:p-6 content-wrapper">
            {showCitations && citations && citations.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Sumber Dokumen
                </h3>
                <div className="space-y-3">
                  {citations.map((citation, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md relative"
                      onMouseEnter={() => setHoveredCitation(index)}
                      onMouseLeave={() => setHoveredCitation(null)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 bg-gray-50 rounded-md">
                          {getFileIcon(citation.fileType, 'md')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 mb-1">{citation.fileName}</p>
                          <p className="text-gray-600 text-sm">
                            {getFileTypeDisplay(citation.fileType)} • {citation.fileSize}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            Diproses pada {formatTimestamp(citation.timestamp)}
                          </p>
                        </div>
                        {hoveredCitation === index && (
                          <div className="absolute top-3 right-3 bg-blue-500 text-white p-1.5 rounded-full shadow-md transition-opacity duration-200 opacity-90 hover:opacity-100">
                            <Eye className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="prose prose-sm lg:prose-base w-full px-2
              prose-headings:font-semibold 
              prose-h1:text-2xl prose-h1:mb-6
              prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
              prose-h2:text-gray-800
              prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2
              prose-h3:text-gray-700
              prose-h3:font-bold
              prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-2
              prose-p:whitespace-pre-wrap
              prose-ol:my-4 prose-ol:pl-6
              prose-ol:list-decimal
              [&_ol>li]:mb-4 [&_ol>li]:pl-2
              [&_ol>li>p]:my-2
              prose-ul:my-2 prose-ul:pl-5
              prose-ul:list-disc
              [&_ul>li]:relative [&_ul>li]:pl-1 [&_ul>li]:mb-2
              [&_ul>li]:marker:text-gray-500
              [&_ul>li>ul]:mt-2 [&_ul>li>ul]:ml-4
              [&_ul>li>ul>li]:relative [&_ul>li>ul>li]:pl-1 [&_ul>li>ul>li]:mb-1
              [&_ul>li>ul>li]:marker:text-gray-500
              prose-strong:text-gray-900 prose-strong:font-bold
              [&_a]:break-words [&_a]:overflow-wrap-anywhere [&_a]:word-break-all
              [&_a]:text-blue-600 [&_a]:no-underline hover:[&_a]:underline"
            >
              {/* processContent now returns ready-to-format Markdown */}
              <div dangerouslySetInnerHTML={{ __html: formatMarkdown(processContent(content)) }} />
            </div>
          
            {/* Citations section for printing only - hidden in UI but visible in print */}
            {citations && citations.length > 0 && (
              <div className="hidden citations-print-section">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Sumber Dokumen</h2>
                <div className="space-y-4">
                  {citations.map((citation, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div>
                          <p className="font-medium text-gray-800">{citation.fileName}</p>
                          <p className="text-gray-600">
                            {getFileTypeDisplay(citation.fileType)} • {citation.fileSize}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            Diproses pada {formatTimestamp(citation.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ResultArtifact;
