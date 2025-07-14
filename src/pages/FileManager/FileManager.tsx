import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, ListFilter, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FileCard from './FileCard';
import UploadModal from './UploadModal'; // Import the modal
import { UserFileManagementService, UserFile } from '@/services/userFileManagementService';
import { useAuth } from '@/auth/AuthContext';

// Utility to format file size, as the one in service is not exported
const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // State for modal
  
  const { currentUser } = useAuth();
  const fileService = useMemo(() => new UserFileManagementService(), []);

  const fetchFiles = useCallback(async () => {
    if (!currentUser) {
      setError("User not authenticated.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fileService.getUserFiles(currentUser.id);
      if (response.success && response.files) {
        setFiles(response.files);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch files.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, fileService]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = files.filter(file =>
    file.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileDeleted = (fileId: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-gray-500">Memuat file Anda...</p>
        </div>
      );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-16 bg-red-50 rounded-lg">
              <AlertTriangle className="h-12 w-12 text-red-500" />
              <p className="mt-4 font-semibold text-red-700">Gagal memuat data</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          );
    }
    
    if (filteredFiles.length > 0) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredFiles.map(file => (
                    <FileCard key={file.id} file={file} onFileDeleted={handleFileDeleted} />
                ))}
            </div>
        );
    }

    return (
        <div className="text-center py-16">
            <p className="text-gray-500">Tidak ada file yang ditemukan.</p>
            <p className="text-sm text-gray-400 mt-2">Mulai dengan mengunggah file pertama Anda.</p>
        </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-gray-50/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
              <h1 className="text-2xl font-bold text-gray-800">File Manager</h1>
              <p className="text-sm text-gray-500">Kelola semua dokumen dan file Anda di satu tempat.</p>
          </div>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Cari file berdasarkan nama..."
              className="pl-10 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button variant="outline" className="bg-white" disabled={isLoading}>
            <ListFilter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Files Grid */}
        <div className="flex-1 overflow-y-auto rounded-lg">
            {renderContent()}
        </div>
      </div>
      
      <UploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={fetchFiles}
      />
    </>
  );
};

export default FileManager; 