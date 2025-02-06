import React, { useState, useRef, useCallback, useEffect } from 'react';
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
    let content = rawContent
      // Normalisasi line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      
      // Format headings dengan bold
      .replace(/^\*\s+\*\*([^:]+):\*\*\s*(.*)/gm, '* **$1:** $2')
      
      // Format nested lists dengan indentasi yang benar
      .replace(/^(\*\s+[^\n]+\n)(?=\*\s+[^\n]+)/gm, '$1\n')
      .replace(/^\*\s+([^\n]+)(?=\n\*\s+[^\*])/gm, '* $1')
      .replace(/^\*\s+([^\n]+)(?=\n\s+\*)/gm, '* $1')
      .replace(/^(\s*)\*\s+([^\n]+)/gm, '$1* $2')
      
      // Format sub-bullets dengan indentasi
      .replace(/^(\*\s+\*\*[^:]+:\*\*[^\n]+)\n\*\s+/gm, '$1\n    * ')
      .replace(/^(\s+\*\s+[^\n]+)\n\*\s+/gm, '$1\n    * ')
      
      // Pastikan spacing yang konsisten
      .replace(/\n{2,}\*/g, '\n\n*')
      .replace(/\n{2,}\s+\*/g, '\n\n    *')
      
      // Tambahkan line breaks yang tepat
      .replace(/(\*\s+[^\n]+)\n(?=[^\s\*])/g, '$1\n\n')
      .trim();

    return content;
  };

  console.log('Logo exists:', !!document.querySelector('.watermark-image')); // Cek elemen watermark

  useEffect(() => {
    // Ketika komponen dimount, set progress di ThinkingAnimation ke 100%
    const event = new CustomEvent('analysisComplete');
    window.dispatchEvent(event);
  }, []);

  return (
    <>
      {/* Blurred backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 z-30"
        onClick={onClose}
      />
      
      {/* Result panel */}
      <div className="fixed right-0 top-0 h-full lg:w-1/2 w-full 
        bg-white
        border-l border-gray-200 
        overflow-auto z-40 
        shadow-2xl 
        animate-slide-left">
        
        {/* Header section - solid background */}
        <div className="sticky top-0 z-50 bg-white p-4 
          flex justify-between items-center 
          border-b border-gray-200 
          no-print
          shadow-sm"
        >
          <h2 className="text-xl font-semibold text-gray-800">Hasil Analisis</h2>
          <div className="flex items-center gap-2">
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

        {/* Content section - update max-width dan padding */}
        <div ref={contentRef} className="w-full">
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
          
          <div className="p-4 lg:p-6 content-wrapper">
            <div className="prose prose-sm lg:prose-base w-full px-2
              prose-headings:font-semibold 
              
              prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
              prose-h2:text-gray-800
              
              prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2
              prose-h3:text-gray-700
              prose-h3:font-bold
              
              prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-2
              
              prose-ul:my-1 prose-ul:list-none prose-ul:pl-0
              
              [&_ul>li]:relative [&_ul>li]:pl-5 [&_ul>li]:mb-2
              [&_ul>li:before]:content-['*'] 
              [&_ul>li:before]:absolute 
              [&_ul>li:before]:left-0
              [&_ul>li:before]:text-gray-500
              
              [&_ul>li>ul]:mt-2 [&_ul>li>ul]:ml-4 [&_ul>li>ul]:mb-0
              [&_ul>li>ul>li]:relative [&_ul>li>ul>li]:pl-5 [&_ul>li>ul>li]:mb-1
              [&_ul>li>ul>li:before]:content-['*']
              [&_ul>li>ul>li:before]:absolute
              [&_ul>li>ul>li:before]:left-0
              [&_ul>li>ul>li:before]:text-gray-500
              
              prose-strong:text-gray-900 prose-strong:font-bold
              
              [&_p+ul]:mt-2
              [&_ul+p]:mt-4
              [&_li>p]:my-0
              [&_li>p+ul]:mt-2"
            >
              <div className="space-y-2">
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