import React, { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Copy, Check, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

interface ResultArtifactProps {
  content: string;
  onClose: () => void;
}

const ResultArtifact: React.FC<ResultArtifactProps> = ({ content, onClose }) => {
  const [isCopied, setIsCopied] = useState(false);
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
      @media print {
        @page {
          margin: 20mm;
          size: A4;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.5;
          position: relative;
        }

        /* Hide header when printing */
        .no-print {
          display: none !important;
        }

        /* Watermark styling */
        .watermark-container {
          position: fixed !important;
          bottom: 0mm !important;
          right: 0mm !important;
          z-index: 9999 !important;
          pointer-events: none !important;
          display: block !important;
        }

        /* Watermark image */
        .watermark-image {
          width: 15mm !important;
          height: auto !important;
          opacity: 0.7 !important;
          display: block !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        /* Force watermark to show */
        #watermark {
          display: block !important;
          visibility: visible !important;
        }
      }
    `,
  });

  const printRef = useCallback(() => contentRef.current, []);

  // Process content to fix table formatting
  const processContent = (rawContent: string) => {
    // Langkah 1: Normalisasi dasar
    let content = rawContent
      .replace(/\r\n/g, '\n')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    // Langkah 2: Strukturisasi konten
    content = content
      // Format heading utama
      .replace(/^([IVX]+)\.\s+([^\n]+)/gm, '\n## $1. $2\n')
      
      // Format sub-heading dengan nomor
      .replace(/^(\d+)\.\s+([^\n]+)/gm, '\n### $1. $2\n')
      
      // Format kesimpulan dan penjelasan dengan style khusus
      .replace(/^Kesimpulan:?\s*(.*)/gm, '\n### Kesimpulan\n\n**$1**\n')
      .replace(/^Penjelasan:?\s*/gm, '\n### Penjelasan\n\n')
      
      // Format kategori dan label dengan bold
      .replace(/^(Kategori|Label|Status):\s*(.*)/gm, '\n**$1:** $2\n')
      
      // Format sumber dan referensi
      .replace(/^(Sumber|Referensi):\s*/gm, '\n#### $1\n')
      
      // Format bullet points dengan dash
      .replace(/^[•●]\s*(.*)/gm, '- $1')
      
      // Format nested points
      .replace(/^(\s+)[•●]\s*(.*)/gm, '$1- $2')
      
      // Format sections dengan label khusus
      .replace(/(Deskripsi|Target|Contoh Kasus|Tren Modus|Faktor Pendorong|Pola Musiman|Prediksi Perkembangan|Strategi Pencegahan|Rekomendasi|Taktik|Pendekatan|Analisis):\s*/g, '\n\n#### $1\n\n')
      
      // Format quotes atau kutipan
      .replace(/^>\s*(.*)/gm, '\n> $1\n')
      
      // Tambahkan bold pada kata-kata penting
      .replace(/\b(HOAX|FAKTA|DISINFORMASI|MISINFORMASI)\b/g, '**$1**')
      
      // Pastikan ada baris kosong sebelum dan sesudah list
      .replace(/([^-\n])\n-/g, '$1\n\n-')
      .replace(/(-[^\n]+)\n([^-\n])/g, '$1\n\n$2')
      
      // Perbaiki spacing
      .replace(/\n{3,}/g, '\n\n')
      
      // Format hyperlinks yang belum di-format
      .replace(/(?<![\[\(])(https?:\/\/[^\s]+)(?![\]\)])/g, '[$1]($1)')
      
      // Format hyperlinks dengan nama domain
      .replace(/\b(Kompas\.com|IDN Times|Suara\.com|Detik\.com)\b(?!\])/g, '[$1](https://$1)')
      
      // Pastikan link dalam list tetap terformat dengan benar
      .replace(/^(-\s+.*?)(https?:\/\/[^\s]+)/gm, '$1[$2]($2)')
      
      .trim();

    return content;
  };

  console.log('Logo exists:', !!document.querySelector('.watermark-image')); // Cek elemen watermark

  return (
    <>
      {/* Blurred backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 z-30"
        onClick={onClose}
      />
      
      {/* Result panel with improved styling */}
      <div className="fixed right-0 top-0 h-full lg:w-1/2 w-full 
        bg-gradient-to-br from-white to-gray-50
        border-l border-gray-200 
        overflow-auto z-40 
        shadow-2xl 
        animate-slide-left">
        
        {/* Header section with improved styling */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm p-4 
          flex justify-between items-center 
          border-b border-gray-200 
          no-print">
          <h2 className="text-xl font-semibold text-primary-700">Hasil Analisis</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint(printRef)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm 
                rounded-lg transition-all duration-200
                bg-primary-50 text-primary-600
                hover:bg-primary-100"
              title="Cetak hasil analisis"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm 
                rounded-lg transition-all duration-200
                bg-primary-50 text-primary-600
                hover:bg-primary-100"
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
                text-gray-500 hover:text-primary-600 
                hover:bg-primary-50"
              title="Tutup"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content section with improved padding and max-width */}
        <div ref={contentRef} className="max-w-3xl mx-auto">
          {/* Watermark container */}
          <div className="watermark-container" style={{ position: 'fixed', bottom: '0mm', right: '0mm', zIndex: 9999 }}>
            <img 
              src="/1.png"
              alt=""
              className="watermark-image"
              id="watermark"
              style={{ 
                width: '15mm',
                height: 'auto',
                opacity: 0.7,
                display: 'none'
              }}
            />
          </div>
          
          <div className="p-6 lg:p-8 content-wrapper">
            <div className="prose prose-sm lg:prose-base max-w-none px-2 lg:px-4 
              prose-headings:font-semibold 
              
              prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 
              prose-h2:text-gray-900
              prose-h2:border-b prose-h2:border-gray-100 
              prose-h2:pb-2
              
              prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 
              prose-h3:text-primary-600
              
              prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-2 
              prose-h4:text-primary-500
              prose-h4:font-medium
              
              prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-3
              
              prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5
              prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5
              prose-li:text-gray-700 prose-li:my-1
              
              prose-strong:text-primary-700 prose-strong:font-semibold
              
              prose-blockquote:border-l-4 prose-blockquote:border-primary-500 
              prose-blockquote:bg-primary-50 prose-blockquote:p-4 
              prose-blockquote:my-4 prose-blockquote:text-gray-700
              
              prose-a:text-primary-600 
              prose-a:border-b 
              prose-a:border-primary-200
              prose-a:no-underline 
              hover:prose-a:text-primary-800
              hover:prose-a:border-primary-500
              prose-a:transition-all
              prose-a:duration-200
              prose-a:font-medium
              
              [&_hr]:my-6 [&_hr]:border-gray-100
              
              [&_.conclusion]:text-primary-700 [&_.conclusion]:font-semibold
              [&_.explanation]:mt-4 [&_.explanation]:text-gray-700
              
              [&_.source]:text-sm [&_.source]:text-gray-500 [&_.source]:mt-4
              [&_.source]:border-t [&_.source]:border-gray-100 [&_.source]:pt-2
              
              [&_a:hover]:text-primary-800">
              <div className="space-y-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {processContent(content)}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResultArtifact;