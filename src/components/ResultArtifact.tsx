import React, { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
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
      }
    `,
  });

  const printRef = useCallback(() => contentRef.current, []);

  return (
    <div className="fixed right-0 top-0 h-full lg:w-1/2 w-full bg-white border-l border-gray-200 overflow-auto z-40">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center no-print">
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
          <div className="prose prose-sm lg:prose-base max-w-none px-2 lg:px-4">
            <div className="space-y-4 pr-4">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      <div className="h-6 lg:h-8" />
    </div>
  );
};

export default ResultArtifact;