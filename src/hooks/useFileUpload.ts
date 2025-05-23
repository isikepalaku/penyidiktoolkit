import { useState, useRef, useEffect } from 'react';
import { ProgressInfo } from '@/types/chat';

interface UseFileUploadOptions {
  onProgress?: (progressInfo: ProgressInfo) => (() => void) | void;
}

/**
 * Custom hook untuk mengelola file upload state dan logic
 * Menyediakan state management dan handlers untuk file upload functionality
 */
export const useFileUpload = (options?: UseFileUploadOptions) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<ProgressInfo>({
    status: 'preparing',
    percent: 0
  });
  const [showProgress, setShowProgress] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Setup progress listener jika ada onProgress callback
  useEffect(() => {
    if (options?.onProgress) {
      const result = options.onProgress(progress);
      
      if (progress.status === 'completed') {
        // Hide progress after completion + delay
        setTimeout(() => {
          setShowProgress(false);
        }, 1000);
      } else {
        setShowProgress(true);
      }
      
      return () => {
        // Cleanup jika result adalah function
        if (typeof result === 'function') {
          result();
        }
      };
    }
  }, [progress, options]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetFiles = () => {
    setSelectedFiles([]);
    setShowProgress(false);
    setProgress({ status: 'preparing', percent: 0 });
  };

  const updateProgress = (newProgress: Partial<ProgressInfo>) => {
    setProgress(prev => ({ ...prev, ...newProgress }));
  };

  const hasLargeFile = (threshold: number = 5 * 1024 * 1024) => {
    return selectedFiles.some(file => file.size > threshold);
  };

  const logFilesSizes = () => {
    if (selectedFiles.length > 0) {
      console.log('Uploading files:');
      selectedFiles.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      });
    }
  };

  return {
    // State
    selectedFiles,
    progress,
    showProgress,
    fileInputRef,
    
    // Handlers
    handleFileChange,
    handleRemoveFile,
    handleOpenFileDialog,
    resetFiles,
    updateProgress,
    
    // Utilities
    hasLargeFile,
    logFilesSizes,
  };
}; 