import React from 'react';
import ReactMarkdown from 'react-markdown';
import { X } from 'lucide-react';

interface ResultArtifactProps {
  content: string;
  onClose: () => void;
}

const ResultArtifact: React.FC<ResultArtifactProps> = ({ content, onClose }) => {
  return (
    <div className="fixed right-0 top-0 h-full lg:w-1/2 w-full bg-white border-l border-gray-200 overflow-auto z-40">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Hasil Analisis</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <X size={24} />
        </button>
      </div>

      <div className="p-4 lg:p-6">
        {/* Tambahkan padding/margin khusus untuk konten */}
        <div className="prose prose-sm lg:prose-base max-w-none px-2 lg:px-4">
          <div className="space-y-4 pr-4">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Tambahkan padding bottom untuk menghindari konten terpotong */}
      <div className="h-6 lg:h-8" />
    </div>
  );
};

export default ResultArtifact;