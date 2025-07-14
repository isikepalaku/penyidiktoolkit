import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import SimpleDatabaseUploadService, { 
  SimpleUploadProgress, 
  SimpleUploadResult, 
  DeduplicationSummary 
} from '@/services/simpleDatabaseUploadService';
import DeduplicationInfo from '@/components/ui/DeduplicationInfo';

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
  const [uploadProgress, setUploadProgress] = useState<Record<string, SimpleUploadProgress>>({});
  const [error, setError] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<SimpleUploadResult[]>([]);
  const [finalSummary, setFinalSummary] = useState<DeduplicationSummary | undefined>(undefined);

  const { currentUser } = useAuth();
  const uploadService = useMemo(() => new SimpleDatabaseUploadService(), []);

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
    setFinalSummary(undefined); // Reset summary when new files are added
    setUploadResults([]); // Reset results
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, disabled: isUploading });

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setFinalSummary(undefined); // Reset summary when files are removed
    setUploadResults([]); // Reset results
  };
  
  const handleUpload = async () => {
      if (!currentUser) {
          setError("You must be logged in to upload files.");
          return;
      }
      setIsUploading(true);
      setError(null);
      setUploadProgress({}); // Reset progress on new upload
      setUploadResults([]); // Reset results
      setFinalSummary(undefined); // Reset summary

      const onProgress = (progress: SimpleUploadProgress) => {
          console.log('📊 Upload Progress:', progress);
          setUploadProgress(prev => ({
              ...prev,
              [progress.currentFile]: progress,
          }));
      };

      const onFileComplete = (result: SimpleUploadResult) => {
        console.log('✅ File Complete:', result);
        setUploadResults(prev => [...prev, result]);
      };

      const onAllComplete = (summary: DeduplicationSummary) => {
        console.log('🎉 All Complete - Summary:', summary);
        setFinalSummary(summary);
        setIsUploading(false);
      };

      try {
        const result = await uploadService.uploadFiles(selectedFiles, currentUser.id, { 
          onProgress,
          onFileComplete,
          onAllComplete,
          category: 'document', // Default category
          folder: '/' // Default folder
        });
        
        if (!result.success) {
          setError(result.error || 'Upload failed');
          setIsUploading(false);
          return;
        }

        // Success handled by onAllComplete callback

      } catch (err: any) {
        console.error('Upload error:', err);
        setError(err.message || "An unknown error occurred during upload.");
        setIsUploading(false); // Stop upload on error
      } 
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setUploadProgress({});
    setIsUploading(false);
    setError(null);
    setUploadResults([]);
    setFinalSummary(undefined);
    onClose();
  }

  // Auto-close modal after successful upload with delay
  React.useEffect(() => {
    if (finalSummary && !isUploading) {
      const timer = setTimeout(() => {
        onUploadSuccess?.();
        handleClose();
      }, 3000); // 3 second delay to show summary

      return () => clearTimeout(timer);
    }
  }, [finalSummary, isUploading, onUploadSuccess]);

  if (!isOpen) return null;

  const isProcessing = Object.values(uploadProgress).some(p => 
    p.status === 'hashing' || p.status === 'checking'
  );

  const currentStep = isProcessing ? (
    Object.values(uploadProgress).some(p => p.status === 'hashing') ? 'hashing' :
    Object.values(uploadProgress).some(p => p.status === 'checking') ? 'checking' : 'completed'
  ) : 'completed';

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
                  <p className="text-xs mt-1 text-blue-600">🔄 Database deduplication otomatis aktif - file duplikat akan dideteksi</p>
              </div>
            </div>
          )}

          {/* Deduplication Info Component */}
          {isUploading && (
            <div className="mb-4">
              <DeduplicationInfo 
                isProcessing={isProcessing}
                currentStep={currentStep}
                stats={finalSummary}
                showStats={!!finalSummary}
                compact={false}
              />
            </div>
          )}
          
          {selectedFiles.length > 0 && (
            <div className="mt-6">
                <h3 className="font-semibold mb-2">{isUploading ? 'Upload Progress' : 'File Terpilih'}:</h3>
                <div className="space-y-3 max-h-[calc(90vh-350px)] overflow-y-auto pr-2">
                    {selectedFiles.map((file, index) => {
                        const progress = uploadProgress[file.name];
                        const result = uploadResults.find(r => r.fileId && r.originalFileId);
                        const isCompleted = progress?.status === 'completed';
                        const isFailed = progress?.status === 'failed';
                        const isDuplicate = progress?.isDuplicate || false;
                        const isHashing = progress?.status === 'hashing';
                        const isChecking = progress?.status === 'checking';
                        const isUploading = progress?.status === 'uploading';

                        return (
                            <div key={index} className="bg-gray-100 p-3 rounded-lg">
                               <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {isCompleted ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0"/> : 
                                         isDuplicate ? <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0"/> :
                                         isFailed ? <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0"/> : 
                                         <FileIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                                        <span className="truncate text-sm font-medium">{file.name}</span>
                                        {isDuplicate && (
                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                            Duplikat - {formatFileSize(progress?.spaceSaved || 0)} Saved
                                          </span>
                                        )}
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
                               {progress && (
                                 <div className="mt-2">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>
                                          {isHashing ? '🔐 Menghitung hash...' :
                                           isChecking ? '🔍 Memeriksa duplikasi...' :
                                           isUploading ? '📤 Uploading ke S3...' :
                                           isDuplicate ? '🔄 Referensi dibuat' :
                                           progress.message || `${progress.status} - ${progress.percent.toFixed(0)}%`}
                                        </span>
                                        {isCompleted && isDuplicate && (
                                          <span className="text-blue-600 font-medium">Space Saved!</span>
                                        )}
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                              isCompleted ? (isDuplicate ? 'bg-blue-500' : 'bg-green-500') : 
                                              isFailed ? 'bg-red-500' :
                                              'bg-blue-500'
                                            }`}
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

          {/* Final Deduplication Summary */}
          {finalSummary && !isUploading && (
            <div className="mt-6">
              <DeduplicationInfo 
                isProcessing={false}
                currentStep="completed"
                stats={finalSummary}
                showStats={true}
                compact={false}
              />
              <div className="mt-3 text-center">
                <p className="text-sm text-green-600 font-medium">
                  🎉 Upload completed! Modal akan otomatis tutup dalam 3 detik...
                </p>
              </div>
            </div>
          )}
        </div>
        
        {error && <div className="p-4 bg-red-50 text-red-700 text-sm m-6 mt-0 rounded-lg">{error}</div>}

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
          <button onClick={handleClose} disabled={isUploading} className="px-4 py-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={handleUpload} disabled={selectedFiles.length === 0 || isUploading} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed">
            {isUploading ? 'Processing...' : `Upload ${selectedFiles.length} File(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal; 