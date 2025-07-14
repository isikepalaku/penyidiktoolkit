import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  File,
  MoreVertical,
  Download,
  Trash2,
  Share2,
  Loader2,
} from 'lucide-react';
import { UserFile, UserFileManagementService } from '@/services/userFileManagementService';
import { useAuth } from '@/auth/AuthContext';
import ShareModal from './ShareModal'; // Import the new modal


interface FileCardProps {
  file: UserFile;
  onFileDeleted?: (fileId: string) => void;
}

const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

const FileCard: React.FC<FileCardProps> = ({ file, onFileDeleted }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false); // State for share modal
    const menuRef = useRef<HTMLDivElement>(null);
    const { currentUser } = useAuth();
    const fileService = useMemo(() => new UserFileManagementService(), []);


    const getFileIcon = (category: string, extension: string) => {
        switch (category) {
            case 'document':
                if (extension === 'pdf') return <FileText className="h-10 w-10 text-red-500" />;
                if (['xlsx', 'csv'].includes(extension)) return <FileSpreadsheet className="h-10 w-10 text-green-500" />;
                return <FileText className="h-10 w-10 text-blue-500" />;
            case 'image':
                return <FileImage className="h-10 w-10 text-purple-500" />;
            case 'video':
                return <FileVideo className="h-10 w-10 text-orange-500" />;
            case 'audio':
                return <FileAudio className="h-10 w-10 text-sky-500" />;
            default:
                return <File className="h-10 w-10 text-gray-500" />;
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuRef]);

    const handleDownload = async () => {
        if (!currentUser) return alert("Please log in.");
        setIsActionLoading(true);
        const res = await fileService.generateDownloadUrl(file.id, currentUser.id);
        if (res.success && res.downloadUrl) {
            window.open(res.downloadUrl, '_blank');
        } else {
            alert(`Failed to get download link: ${res.error}`);
        }
        setIsActionLoading(false);
        setIsMenuOpen(false);
    };

    const handleDelete = async () => {
        if (!currentUser) return alert("Please log in.");
        if (window.confirm(`Are you sure you want to delete "${file.original_filename}"? This action cannot be undone.`)) {
            setIsActionLoading(true);
            const res = await fileService.deleteFile(file.id, currentUser.id);
            if (res.success) {
                onFileDeleted?.(file.id);
            } else {
                alert(`Failed to delete file: ${res.error}`);
            }
            setIsActionLoading(false);
        }
        setIsMenuOpen(false);
    };

  return (
    <>
      <div className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col group">
        <div className="flex-grow p-4 flex flex-col items-center text-center">
          <div className="mb-4">
              {getFileIcon(file.category, file.file_extension)}
          </div>
          <p className="font-semibold text-sm text-gray-800 break-words w-full px-2" title={file.original_filename}>
            {file.original_filename}
          </p>
        </div>
        <div className="border-t bg-gray-50 p-3 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <span>{formatFileSize(file.file_size)}</span>
            <span>{new Date(file.created_at).toLocaleDateString()}</span>
            <div className="relative" ref={menuRef}>
              <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isActionLoading}
              >
                  {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreVertical className="h-4 w-4" />}
              </button>
              {isMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-40 bg-white border rounded-md shadow-lg z-10">
                      <ul>
                          <li onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                              <Download className="w-4 h-4"/> Download
                          </li>
                          <li onClick={() => {setIsShareModalOpen(true); setIsMenuOpen(false);}} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                              <Share2 className="w-4 h-4"/> Share
                          </li>
                          <li onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer">
                              <Trash2 className="w-4 h-4"/> Delete
                          </li>
                      </ul>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        file={file}
      />
    </>
  );
};

export default FileCard; 