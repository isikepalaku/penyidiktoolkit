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
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.5;
        }
        /* Hide header when printing */
        .no-print {
          display: none !important;
        }
        /* Ensure tables print well */
        table {
          break-inside: avoid;
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
        }
        th {
          background-color: #f9fafb;
        }
      }
    `,
  });

  const printRef = useCallback(() => contentRef.current, []);

  // Process content to fix table formatting
  const processContent = (rawContent: string) => {
    // Fix table formatting by ensuring proper spacing
    return rawContent.replace(
      /\|(.*?)\|/g, 
      (match) => match.replace(/\s*\|\s*/g, ' | ').trim()
    );
  };

  return (
    <>
      {/* Blurred backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 z-30"
        onClick={onClose}
      />
      
      {/* Result panel with smooth slide-in animation */}
      <div className="fixed right-0 top-0 h-full lg:w-1/2 w-full bg-white border-l border-gray-200 overflow-auto z-40 shadow-xl animate-slide-left">
        <div className="p-4 flex justify-between items-center border-b border-gray-200 no-print">
          <h2 className="text-xl font-semibold text-gray-900">Hasil Analisis</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint(printRef)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-gray-100 text-gray-700"
              title="Cetak hasil analisis"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-gray-100 text-gray-700"
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
              className="text-gray-500 hover:text-gray-700 focus:outline-none p-1.5 hover:bg-gray-100 rounded-lg"
              title="Tutup"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div ref={contentRef}>
          <div className="p-4 lg:p-6">
            <div className="prose prose-sm lg:prose-base max-w-none px-2 lg:px-4 
              prose-headings:font-semibold prose-headings:text-gray-900
              prose-ul:list-disc prose-ul:pl-5 
              prose-ol:list-none prose-ol:pl-6
              prose-ol:counter-reset-[section]
              [&_ol>li]:relative [&_ol>li]:pl-6 [&_ol>li]:mb-2
              [&_ol>li:before]:content-['-'] [&_ol>li:before]:absolute
              [&_ol>li:before]:left-0 [&_ol>li:before]:top-0
              [&_ol>li:before]:text-blue-500 [&_ol>li:before]:font-bold
              prose-li:text-gray-600 prose-li:my-1
              prose-p:text-gray-600 prose-p:leading-relaxed 
              prose-strong:text-gray-800
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
              [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:p-3 [&_th]:text-left [&_th]:font-medium
              [&_td]:border [&_td]:border-gray-300 [&_td]:p-3 [&_td]:align-top
              [&_thead]:bg-gray-50">
              <div className="space-y-4 pr-4">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                >{processContent(content)}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResultArtifact;