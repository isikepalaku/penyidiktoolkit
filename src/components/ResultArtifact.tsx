import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X } from 'lucide-react';

interface ResultArtifactProps {
  content: string;
  onClose: () => void;
}

const ResultArtifact: React.FC<ResultArtifactProps> = ({ content, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content - Full screen on mobile, side panel on desktop */}
      <div className="fixed inset-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:h-screen w-full lg:w-[60%] xl:w-[40%] bg-white shadow-2xl lg:rounded-none flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Hasil Analisis</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Tutup hasil analisis"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="prose prose-sm sm:prose-base max-w-full px-4 pt-3 pb-6 sm:px-6 sm:py-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: (props) => <h1 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2" {...props} />,
                h2: (props) => <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4 border-b pb-2" {...props} />,
                h3: (props) => <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3" {...props} />,
                ul: (props) => <ul className="list-disc pl-5 space-y-2 mb-4" {...props} />,
                ol: (props) => <ol className="list-decimal pl-5 space-y-2 mb-4" {...props} />,
                li: (props) => <li className="text-gray-700 leading-relaxed" {...props} />,
                p: (props) => <p className="text-gray-700 leading-relaxed mb-4" {...props} />,
                strong: (props) => <strong className="font-medium text-gray-900" {...props} />,
                // Custom component for timestamp lines
                span: (props) => {
                  if (Array.isArray(props.children) && props.children.length > 0 && typeof props.children[0] === 'string' && props.children[0].match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                    return <span className="text-sm text-gray-600 mb-2" {...props} />;
                  }
                  return <span {...props} />;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Mobile handle */}
        <div className="lg:hidden py-2">
          <div className="mx-auto w-10 h-1.5 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default ResultArtifact;
