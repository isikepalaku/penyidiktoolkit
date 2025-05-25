import React, { useState } from 'react';
import { X, Copy, Printer, Download, Check, MoreVertical } from 'lucide-react';
import { formatMessage } from '@/utils/markdownFormatter';

interface IntelligenceResultDisplayProps {
  result: string;
  onClose: () => void;
}

const IntelligenceResultDisplay: React.FC<IntelligenceResultDisplayProps> = ({ result, onClose }) => {
  const [showToast, setShowToast] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Function untuk copy hasil ke clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setShowMobileMenu(false);
    } catch (error) {
      console.error('Gagal menyalin:', error);
      // Fallback untuk browser yang tidak support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = result;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setShowMobileMenu(false);
    }
  };

  // Function untuk print hasil
  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Laporan Intelijen</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              h1, h2, h3 { color: #333; }
              strong { font-weight: bold; }
              ul, ol { margin-left: 20px; }
              ol[style*="list-style-type: upper-roman"] { 
                list-style-type: upper-roman; 
                margin-left: 30px; 
                padding-left: 10px;
              }
              ol[style*="list-style-type: lower-roman"] { 
                list-style-type: lower-roman; 
                margin-left: 40px; 
                padding-left: 10px;
              }
              pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            ${formatMessage(result)}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    setShowMobileMenu(false);
  };

  // Function untuk download hasil sebagai file
  const handleDownload = () => {
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-intelijen-${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMobileMenu(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 font-semibold text-xs sm:text-sm">🔍</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">Hasil Laporan Intelijen</h2>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Analisis intelijen kepolisian komprehensif</p>
            </div>
          </div>
          
          {/* Desktop Action buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              aria-label="Salin ke clipboard"
            >
              <Copy className="w-4 h-4" />
              Salin
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              aria-label="Cetak laporan"
            >
              <Printer className="w-4 h-4" />
              Cetak
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              aria-label="Unduh laporan"
            >
              <Download className="w-4 h-4" />
              Unduh
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Action buttons */}
          <div className="flex md:hidden items-center gap-1 relative">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              aria-label="Menu aksi"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Mobile dropdown menu */}
            {showMobileMenu && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-[140px]">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Salin
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Cetak
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Unduh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-4 sm:p-6">
            <div 
              className="prose prose-gray max-w-none text-sm sm:text-base
                prose-headings:text-gray-800 prose-headings:font-semibold
                prose-h1:text-xl sm:prose-h1:text-2xl prose-h1:mb-3 sm:prose-h1:mb-4 prose-h1:mt-0
                prose-h2:text-lg sm:prose-h2:text-xl prose-h2:mb-2 sm:prose-h2:mb-3 prose-h2:mt-4 sm:prose-h2:mt-6
                prose-h3:text-base sm:prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-3 sm:prose-h3:mt-4
                prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-2 sm:prose-p:mb-3
                prose-strong:text-gray-800 prose-strong:font-semibold
                prose-ul:mb-3 sm:prose-ul:mb-4 prose-ol:mb-3 sm:prose-ol:mb-4
                prose-li:text-gray-700 prose-li:mb-1 prose-li:leading-relaxed
                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-50 prose-blockquote:p-3 sm:prose-blockquote:p-4 prose-blockquote:rounded-r-lg
                prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-gray-100 prose-pre:p-3 sm:prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:text-sm
                prose-table:border-collapse prose-table:w-full prose-table:text-sm
                prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2 prose-th:text-left prose-th:text-xs sm:prose-th:text-sm
                prose-td:border prose-td:border-gray-300 prose-td:p-2 prose-td:text-xs sm:prose-td:text-sm
                chat-message
                [&_ol]:list-decimal [&_ol]:ml-6 sm:[&_ol]:ml-8
                [&_ol[style*='upper-roman']]:list-[upper-roman] [&_ol[style*='upper-roman']]:ml-8 sm:[&_ol[style*='upper-roman']]:ml-10
                [&_ol[style*='lower-roman']]:list-[lower-roman] [&_ol[style*='lower-roman']]:ml-10 sm:[&_ol[style*='lower-roman']]:ml-12
                [&_ol_ol]:mt-2 [&_ol_ol]:mb-2
                [&_ol_li]:mb-2 [&_ol_li]:pl-2
                [&_ol_li_ol_li]:mb-1 [&_ol_li_ol_li]:pl-1"
              dangerouslySetInnerHTML={{ __html: formatMessage(result) }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-gray-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <span className="flex items-center gap-1">📊 Laporan dihasilkan oleh AI Intelijen</span>
              <span className="flex items-center gap-1">🔒 Klasifikasi: Rahasia</span>
            </div>
            <div className="text-xs">
              Generated at {new Date().toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop untuk mobile menu */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-60 text-sm">
          <Check className="w-4 h-4" />
          Berhasil disalin ke clipboard!
        </div>
      )}
    </div>
  );
};

export default IntelligenceResultDisplay;