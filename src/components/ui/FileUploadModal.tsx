import React, { useState, useRef } from 'react';
import { X, Upload, Cloud, HardDrive, File, Folder, Search, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { UserFile } from '@/services/userFileManagementService';
import useCloudFileManager from '@/hooks/useCloudFileManager';
import { useAuth } from '@/auth/AuthContext';

// ================================
// TYPES & INTERFACES
// ================================

export interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: File[] | UserFile[]) => void;
  acceptedTypes?: string;
  maxFileSize?: number;
  supportedMimeTypes?: string[];
  title?: string;
  description?: string;
  allowMultiple?: boolean;
}

export interface CloudFile extends UserFile {
  isSelected?: boolean;
}

interface CloudFileBrowserProps {
  onFilesSelected: (files: UserFile[]) => void;
  onBack: () => void;
  allowMultiple: boolean;
  acceptedTypes: string[];
}

// ================================
// UTILITY FUNCTIONS
// ================================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const validateFile = (file: File, maxSize: number, supportedTypes: string[]): { isValid: boolean; error?: string } => {
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File "${file.name}" terlalu besar (${sizeMB}MB). Maksimal ${maxSizeMB}MB.`
    };
  }

  if (!supportedTypes.includes(file.type)) {
    const extension = file.name.toLowerCase().split('.').pop();
    const extensionMimeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    if (!extension || !extensionMimeMap[extension] || !supportedTypes.includes(extensionMimeMap[extension])) {
      return {
        isValid: false,
        error: `Format file "${file.name}" tidak didukung.`
      };
    }
  }

  return { isValid: true };
};

// ================================
// CLOUD FILE BROWSER COMPONENT
// ================================

const CloudFileBrowser: React.FC<CloudFileBrowserProps> = ({
  onFilesSelected,
  onBack,
  allowMultiple,
  acceptedTypes
}) => {
  const [selectedFiles, setSelectedFiles] = useState<UserFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState('/');

  // Get current user ID from authentication context
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || null;

  // Early return if user is not logged in
  if (!currentUserId) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center p-8">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Authentication Required
        </h3>
        <p className="text-gray-600 mb-4">
          Anda perlu login untuk mengakses file di cloud storage.
        </p>
        <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700">
          Kembali
        </Button>
      </div>
    );
  }

  // Use cloud file manager hook
  const {
    files,
    isLoading,
    error,
    searchFiles,
    loadFiles
  } = useCloudFileManager(currentUserId, {
    autoLoad: true,
    pageSize: 50,
    filter: {
      folder_path: currentFolder
    }
  });

    // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchFiles(query);
    } else {
      loadFiles();
    }
  };

  const filteredFiles = files.filter(file =>
    file.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) &&
    file.folder_path.startsWith(currentFolder)
  );

  const handleFileSelect = (file: UserFile) => {
    if (allowMultiple) {
      setSelectedFiles(prev => {
        const isAlreadySelected = prev.some(f => f.id === file.id);
        if (isAlreadySelected) {
          return prev.filter(f => f.id !== file.id);
        } else {
          return [...prev, file];
        }
      });
    } else {
      setSelectedFiles([file]);
    }
  };

  const handleConfirmSelection = () => {
    onFilesSelected(selectedFiles);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    return '📁';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat file dari cloud storage...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => loadFiles()} variant="outline" size="sm">
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">Pilih dari Cloud Storage</h3>
          <p className="text-sm text-gray-600">Folder: {currentFolder}</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Cari file..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* File list */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Folder className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Tidak ada file ditemukan</p>
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isSelected = selectedFiles.some(f => f.id === file.id);
            return (
              <div
                key={file.id}
                onClick={() => handleFileSelect(file)}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <div className="text-2xl">{getFileIcon(file.file_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {file.original_filename}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                {isSelected && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Selection summary and confirm button */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {selectedFiles.length} file dipilih
          </p>
          <Button
            onClick={handleConfirmSelection}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Gunakan File Terpilih
          </Button>
        </div>
      )}
    </div>
  );
};

// ================================
// MAIN MODAL COMPONENT
// ================================

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onFilesSelected,
  acceptedTypes = ".pdf,.txt,.png,.jpg,.jpeg,.webp",
  maxFileSize = 20 * 1024 * 1024, // 20MB
  supportedMimeTypes = [
    'application/pdf',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ],
  title = "Upload File",
  description = "Pilih file dari komputer atau cloud storage",
  allowMultiple = true
}) => {
  const [currentView, setCurrentView] = useState<'selection' | 'computer' | 'cloud'>('selection');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentView('selection');
      setValidationErrors([]);
    }
  }, [isOpen]);

  const handleComputerUpload = () => {
    setCurrentView('computer');
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const errors: string[] = [];
    const validFiles: File[] = [];

    files.forEach((file) => {
      const validation = validateFile(file, maxFileSize, supportedMimeTypes);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(validation.error!);
      }
    });

    setValidationErrors(errors);

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
      onClose();
    }

    // Clear input
    e.target.value = '';
  };

  const handleCloudSelection = (files: UserFile[]) => {
    onFilesSelected(files);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error Validasi File</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selection View */}
          {currentView === 'selection' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Computer Upload Option */}
                <button
                  onClick={handleComputerUpload}
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                >
                  <HardDrive className="w-12 h-12 text-gray-400 group-hover:text-blue-500 mb-4" />
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-700 mb-2">
                    Upload dari Komputer
                  </h3>
                  <p className="text-sm text-gray-600 text-center">
                    Pilih file dari perangkat Anda
                  </p>
                </button>

                {/* Cloud Storage Option */}
                <button
                  onClick={() => setCurrentView('cloud')}
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
                >
                  <Cloud className="w-12 h-12 text-gray-400 group-hover:text-green-500 mb-4" />
                  <h3 className="font-medium text-gray-900 group-hover:text-green-700 mb-2">
                    Pilih dari Cloud Storage
                  </h3>
                  <p className="text-sm text-gray-600 text-center">
                    Gunakan file yang sudah tersimpan
                  </p>
                </button>
              </div>

              <div className="text-xs text-gray-500 text-center mt-4">
                <p><strong>Format yang didukung:</strong> {acceptedTypes.replace(/\./g, '').toUpperCase()}</p>
                <p><strong>Ukuran maksimal:</strong> {(maxFileSize / (1024 * 1024)).toFixed(0)}MB per file</p>
              </div>
            </div>
          )}

          {/* Cloud Browser View */}
          {currentView === 'cloud' && (
            <CloudFileBrowser
              onFilesSelected={handleCloudSelection}
              onBack={() => setCurrentView('selection')}
              allowMultiple={allowMultiple}
              acceptedTypes={supportedMimeTypes}
            />
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple={allowMultiple}
            accept={acceptedTypes}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal; 