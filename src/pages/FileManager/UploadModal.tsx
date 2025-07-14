import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { EnhancedUploadService, UploadProgress } from '@/services/enhancedUploadService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [error, setError] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const uploadService = useMemo(() => new EnhancedUploadService(), []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Basic validation
    const validatedFiles = acceptedFiles.filter(file => {
        if (file.size > 50 * 1024 * 1024) { // 50MB
            alert(`File ${file.name} is too large. Max size is 50MB.`);
            return false;
        }
        return true;
    });
    setSelectedFiles(prev => [...prev, ...validatedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, disabled: isUploading });

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleUpload = async () => {
      if (!currentUser) {
          setError("You must be logged in to upload files.");
          return;
      }
      setIsUploading(true);
      setError(null);
      setUploadProgress({}); // Reset progress on new upload

      const onProgress = (progress: UploadProgress) => {
          if (progress.currentFile) {
            setUploadProgress(prev => ({
                ...prev,
                [progress.currentFile!]: progress,
            }));
          }
      };

      try {
        await uploadService.uploadFiles(selectedFiles, currentUser.id, { onProgress });
        
        // On success
        setTimeout(() => {
            onUploadSuccess?.();
            handleClose();
        }, 1000); // Give time for user to see "Completed" status

      } catch (err: any) {
        setError(err.message || "An unknown error occurred during upload.");
        setIsUploading(false); // Stop upload on error
      } 
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setUploadProgress({});
    setIsUploading(false);
    setError(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col h-full max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Upload Files</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" disabled={isUploading}>&times;</button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {!isUploading && (
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
              <input {...getInputProps()} />
              <div className="flex flex-col items-center text-gray-500">
                  <UploadCloud className="w-12 h-12 mb-4"/>
                  {isDragActive ?
                  <p>Jatuhkan file di sini...</p> :
                  <p>Seret & jatuhkan file di sini, atau klik untuk memilih file</p>
                  }
                  <p className="text-xs mt-2">Ukuran file maks: 50MB</p>
              </div>
            </div>
          )}
          
          {selectedFiles.length > 0 && (
            <div className="mt-6">
                <h3 className="font-semibold mb-2">{isUploading ? 'Upload Progress' : 'File Terpilih'}:</h3>
                <div className="space-y-3 max-h-[calc(90vh-350px)] overflow-y-auto pr-2">
                    {selectedFiles.map((file, index) => {
                        const progress = uploadProgress[file.name];
                        const isCompleted = progress?.status === 'completed';
                        const isFailed = progress?.status === 'failed';

                        return (
                            <div key={index} className="bg-gray-100 p-3 rounded-lg">
                               <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {isCompleted ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0"/> : isFailed ? <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0"/> : <FileIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                                        <span className="truncate text-sm font-medium">{file.name}</span>
                                    </div>
                                    {!isUploading && (
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                                            <button onClick={() => handleRemoveFile(index)} className="text-gray-400 hover:text-red-500">
                                                <X className="w-4 h-4" />
                                            </button>
                                       </div>
                                    )}
                               </div>
                               {isUploading && progress && (
                                 <div className="mt-2">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>{progress.status} - {progress.percent.toFixed(0)}%</span>
                                        <span>{formatFileSize(progress.speed || 0)}/s</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{width: `${progress.percent}%`}}
                                        ></div>
                                    </div>
                                 </div>
                               )}
                               {isFailed && <p className="text-xs text-red-500 mt-1">{progress.error}</p>}
                            </div>
                        )
                    })}
                </div>
            </div>
          )}
        </div>
        
        {error && <div className="p-4 bg-red-50 text-red-700 text-sm m-6 mt-0 rounded-lg">{error}</div>}

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
          <button onClick={handleClose} disabled={isUploading} className="px-4 py-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={handleUpload} disabled={selectedFiles.length === 0 || isUploading} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed">
            {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal; 