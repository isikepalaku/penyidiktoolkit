import React, { useState, useRef, useEffect } from 'react';
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
  const componentRef = useRef<HTMLDivElement>(null);

  // Prevent scroll refresh
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      document.body.style.overflow = 'auto';
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

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
          -webkit-print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
      }
    `,
    contentRef: componentRef
  });

  const handlePrintClick = () => {
    if (componentRef.current) {
      handlePrint();
    }
  };

  // Process content function...
  const processContent = (rawContent: string) => {
    const content = rawContent
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\|[-\s|]+\|/g, '')
      .replace(
        /Tabel[^|]*\|\s*([^|\n]+)\s*\|\s*([^|\n]+)\s*\|/g,
        (_, header1, header2) => `\n| ${header1.trim()} | ${header2.trim()} |\n|---|---|\n`
      )
      .replace(
        /\|\s*([^|\n]+)\s*\|\s*([^|\n]+)\s*\|/g,
        (_, col1, col2) => `| ${col1.trim()} | ${col2.trim()} |\n`
      )
      .replace(/([^\n])\n\|/g, '$1\n\n|')
      .replace(/\|\n([^\n|])/g, '|\n\n$1')
      .trim();

    return content;
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      <div className="fixed top-0 right-0 h-full w-full lg:w-[50%] bg-white dark:bg-gray-900 shadow-xl z-50 
        overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Hasil Analisis
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintClick}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {isCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable area */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto p-6"
        >
          <div ref={componentRef} className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {processContent(content)}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResultArtifact;