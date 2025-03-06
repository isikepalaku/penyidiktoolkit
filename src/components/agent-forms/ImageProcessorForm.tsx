import React from 'react';
import type { BaseAgentFormProps } from './BaseAgentForm';
import { FileImage, Camera } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export interface ImageProcessorFormProps extends BaseAgentFormProps {
  imagePreview?: string | null;
}

export const ImageProcessorForm: React.FC<ImageProcessorFormProps> = ({
  formData,
  onInputChange,
  error,
  isProcessing,
  imagePreview
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File terlalu besar. Maksimal ukuran file adalah ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    
    if (!file.type.startsWith('image/')) {
      return 'Format file tidak didukung. Gunakan format gambar seperti JPG, PNG, atau GIF';
    }
    
    return null;
  };

  const handleFileChange = (file: File | null) => {
    try {
      if (!file) {
        onInputChange('image_file', null);
        return;
      }

      console.log('Selected file:', {
        name: file.name,
        type: file.type,
        size: formatFileSize(file.size)
      });
      
      const validationError = validateFile(file);
      if (validationError) {
        onInputChange('error', validationError);
        onInputChange('image_file', null);
        return;
      }
      
      // Just store the file, don't process it yet
      onInputChange('image_file', file);
      onInputChange('error', null);
      
    } catch (err) {
      console.error('Error handling image file:', err);
      onInputChange('error', err instanceof Error ? err.message : 'Gagal memproses file gambar');
      onInputChange('image_file', null);
    }
  };
  
  const handleUploadClick = () => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <div>
        <Label htmlFor="field-image_file">Upload Gambar</Label>
        <div 
          onClick={handleUploadClick}
          className={cn(
            "mt-2 p-6 border-2 border-dashed rounded-lg",
            !isProcessing ? "cursor-pointer hover:border-blue-500 hover:bg-blue-50/50" : "cursor-not-allowed",
            "transition-colors"
          )}
        >
          <input
            ref={fileInputRef}
            id="field-image_file"
            name="image_file"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            disabled={isProcessing}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            {formData.image_file ? (
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
                <FileImage className="w-8 h-8 text-blue-600" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full">
                <Camera className="w-8 h-8 text-blue-500" />
              </div>
            )}
            
            <div className="text-sm text-gray-600 text-center">
            {formData.image_file && formData.image_file instanceof File ? (
              <span className="text-blue-600 font-medium">
                {formData.image_file.name}
              </span>
            ) : (
              <>
                <span className="font-medium">Klik untuk upload</span> atau ambil foto
                <br />
                JPG, PNG, GIF (max. {formatFileSize(MAX_FILE_SIZE)})
              </>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="mt-4 relative">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full max-w-2xl h-auto rounded-lg shadow-md border border-gray-200"
          />
          {formData.image_file && formData.image_file instanceof File && (
            <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
              <FileImage className="w-3 h-3" />
              {formData.image_file.name} ({formatFileSize(formData.image_file.size)})
            </div>
          )}
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isProcessing || !formData.image_file}
        className="w-full"
      >
        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isProcessing ? 'Memproses...' : 'Analisis Gambar'}
      </Button>
    </div>
  );
};
