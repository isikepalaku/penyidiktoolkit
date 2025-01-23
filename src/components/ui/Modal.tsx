import { LegalDocument } from '../../types';
import { Copy, Download, X } from 'lucide-react';
import { useState } from 'react';

interface ModalProps {
  document: LegalDocument;
  onClose: () => void;
}

export function Modal({ document, onClose }: ModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(document.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    if (document.metadata?.link_gdrive) {
      window.open(document.metadata.link_gdrive, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden relative mt-8">
        <div className="sticky top-0 left-0 right-0 z-10 bg-gray-800 border-b border-gray-700 shadow-lg">
          <div className="p-4 pr-12">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-lg sm:text-2xl font-bold text-white break-words">
              {document.title || document.metadata?.nomor_putusan || 'Untitled Document'}
            </h2>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-5rem)]">
          <div className="p-4">
            <div className="flex flex-col gap-2 mb-6">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Putusan</span>
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>{isCopied ? 'Tersalin!' : 'Salin Konten'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {document.metadata && Object.entries(document.metadata).map(([key, value]) => {
                if (key === 'link_gdrive' || !value) return null;
                
                const formattedKey = key
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');

                return (
                  <div key={key} className="text-gray-300">
                    <h3 className="font-semibold text-white mb-2">{formattedKey}</h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                      <div className="whitespace-pre-wrap break-words">
                        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
