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

        .no-print {
          display: none !important;
        }

        .watermark-container {
          position: fixed !important;
          bottom: 0mm !important;
          right: 0mm !important;
          z-index: 9999 !important;
          pointer-events: none !important;
          display: block !important;
        }

        .watermark-image {
          width: 15mm !important;
          height: auto !important;
          opacity: 0.7 !important;
          display: block !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        #watermark {
          display: block !important;
          visibility: visible !important;
        }
      }
    `,
  });

  const printRef = useCallback(() => contentRef.current, []);

  const processContent = (rawContent: string) => {
    // Check if content contains speaker markers
    if (rawContent.includes('[Pembicara')) {
      // Split content into sections (transcript and metadata if present)
      const [transcript, ...rest] = rawContent.split(/\n(?=Metadata)/);

      // Format transcript with reduced spacing
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

      // Format metadata if present
      const metadata = rest.length > 0 
        ? '\n\n## Metadata\n\n' + rest[0]
            .replace(/^\s*Metadata\s*\n*/i, '')
            .replace(/\[([^\]]+)\]/g, '**$1**')
            .trim()
        : '';

      return `# Hasil Transkripsi\n\n${formattedTranscript}${metadata}`;
    }

    // For case analysis content, preserve numbered lists and structure
    if (rawContent.match(/^\d+\./m)) {
      return rawContent
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        // Add proper spacing for numbered lists
        .replace(/^(\d+\.)\s*/gm, '$1 ')
        // Add newlines before and after numbered lists
        .replace(/(\n\d+\.)(?!\n\d)/g, '\n\n$1')
        .replace(/(\n\d+\.[^\n]+)(?!\n\d+\.)/g, '$1\n')
        // Handle nested content under numbered items
        .replace(/^(\d+\.[^\n]+)\n([^\d\n][^\n]+)/gm, '$1\n\n$2')
        .replace(/^([^\d\n][^\n]+)\n(\d+\.)/gm, '$1\n\n$2')
        .trim();
    }

    // For other content types (e.g., sentiment analysis)
    return rawContent
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\*\s+\*\*([^:]+):\*\*\s*(.*)/gm, '* **$1:** $2')
      .replace(/^(\*\s+[^\n]+\n)(?=\*\s+[^\n]+)/gm, '$1\n')
      .replace(/^\*\s+([^\n]+)(?=\n*\s+[^*])/gm, '* $1')
      .replace(/^\*\s+([^\n]+)(?=\n\s+\*)/gm, '* $1')
      .replace(/^(\s*)\*\s+([^\n]+)/gm, '$1* $2')
      .replace(/^(\*\s+\*\*[^:]+:\*\*[^\n]+)\n\*\s+/gm, '$1\n    * ')
      .replace(/^(\s+\*\s+[^\n]+)\n\*\s+/gm, '$1\n    * ')
      .replace(/\n{2,}\*/g, '\n\n*')
      .replace(/\n{2,}\s+\*/g, '\n\n    *')
      .replace(/(\*\s+[^\n]+)\n(?=[^\s*])/g, '$1\n\n')
      .trim();
  };

  useEffect(() => {
    const event = new CustomEvent('analysisComplete');
    window.dispatchEvent(event);
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

        <div ref={contentRef} className="w-full">
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
              prose-ul:my-2 prose-ul:list-none prose-ul:pl-0
              [&_ul>li]:relative [&_ul>li]:pl-5 [&_ul>li]:mb-2
              [&_ul>li:before]:content-['*'] 
              [&_ul>li:before]:absolute 
              [&_ul>li:before]:left-0
              [&_ul>li:before]:text-gray-500
              [&_ul>li>ul]:mt-2 [&_ul>li>ul]:ml-4
              [&_ul>li>ul>li]:relative [&_ul>li>ul>li]:pl-5 [&_ul>li>ul>li]:mb-1
              [&_ul>li>ul>li:before]:content-['*']
              [&_ul>li>ul>li:before]:absolute
              [&_ul>li>ul>li:before]:left-0
              [&_ul>li>ul>li:before]:text-gray-500
              prose-strong:text-gray-900 prose-strong:font-bold"
            >
              <div>
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