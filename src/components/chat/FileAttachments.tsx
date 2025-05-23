import React from 'react';
import { File, FileText, Image, FileSpreadsheet } from 'lucide-react';
import { FileAttachment } from '@/types/chat';

interface FileAttachmentsProps {
  attachments: FileAttachment[];
  className?: string;
}

/**
 * Komponen untuk menampilkan file attachments di chat message
 * Menampilkan daftar file yang diupload dengan icon yang sesuai
 */
export const FileAttachments: React.FC<FileAttachmentsProps> = ({ 
  attachments, 
  className = "" 
}) => {
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="w-4 h-4" />;
    } else if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) {
      return <FileSpreadsheet className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-xs text-gray-500 font-medium">File yang diupload:</div>
      <div className="space-y-1">
        {attachments.map((file, index) => (
          <div 
            key={index}
            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="text-gray-600">
              {getFileIcon(file.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">
                {file.name}
              </div>
              <div className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 