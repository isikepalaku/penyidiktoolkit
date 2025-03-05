import React from 'react';
import type { BaseAgentFormProps } from './BaseAgentForm';
import type { ExtendedAgent } from '../../types';
import { imagePrompts } from '../../data/agents/imageAgent';
import { AlertTriangle, FileImage, Microscope, Camera } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const Square = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span
    data-square
    className={cn(
      "flex size-5 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground",
      className,
    )}
    aria-hidden="true"
  >
    {children}
  </span>
);

export const ImageAgentForm: React.FC<BaseAgentFormProps & { 
  imagePreview: string | null 
}> = ({
  agent,
  formData,
  onInputChange,
  error,
  isProcessing,
  imagePreview
}) => {
  const isImageProcessor = agent?.type === 'image_processor' || agent?.type === 'medical_image';
  const extendedAgent = agent as ExtendedAgent;
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
      
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        onInputChange('error', validationError);
        onInputChange('image_file', null);
        return;
      }
      
      onInputChange('image_file', file);
      onInputChange('error', null);
    } catch (err) {
      console.error('Error handling image file:', err);
      onInputChange('error', err instanceof Error ? err.message : 'Gagal memproses file gambar');
      onInputChange('image_file', null);
    }
  };
  
  // Function to trigger file input click
  const handleUploadClick = (captureMode?: string) => {
    if (!isProcessing) {
      if (fileInputRef.current) {
        if (captureMode) {
          fileInputRef.current.setAttribute('capture', captureMode);
        } else {
          fileInputRef.current.removeAttribute('capture');
        }
        fileInputRef.current.click();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Message */}
      {extendedAgent.warning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
          <AlertTriangle className="text-amber-500 h-5 w-5 mt-0.5 flex-shrink-0" />
          <p className="text-amber-700 text-sm">{extendedAgent.warning}</p>
        </div>
      )}
      
      {/* Image Upload */}
      <div>
        <Label htmlFor="field-image_file">Upload Gambar</Label>
        <div 
          onClick={() => handleUploadClick()}
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

      {/* Only show these fields for regular image agent */}
      {!isImageProcessor && (
        <>
          {/* Prompt Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="prompt-type-select">Jenis Analisis</Label>
            <Select 
              value={(formData.prompt_type as string) || 'default'}
              onValueChange={(value) => onInputChange('prompt_type', value as keyof typeof imagePrompts)}
            >
              <SelectTrigger 
                id="prompt-type-select"
                className="ps-2 [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span_[data-square]]:shrink-0"
              >
                <SelectValue placeholder="Pilih jenis analisis" />
              </SelectTrigger>
              <SelectContent className="[&_*[role=option]>span]:end-2 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:flex [&_*[role=option]>span]:items-center [&_*[role=option]>span]:gap-2 [&_*[role=option]]:pe-8 [&_*[role=option]]:ps-2">
                <SelectGroup>
                  <SelectItem value="default">
                    <Square className="bg-blue-400/20 text-blue-500">
                      <FileImage className="h-3 w-3" />
                    </Square>
                    <span className="truncate">Analisis Standar</span>
                  </SelectItem>
                  <SelectItem value="forensic">
                    <Square className="bg-purple-400/20 text-purple-500">
                      <Microscope className="h-3 w-3" />
                    </Square>
                    <span className="truncate">Analisis Forensik</span>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Description Textarea */}
          <div>
            <Label htmlFor="field-image_description">Deskripsi Gambar (Opsional)</Label>
            <textarea
              id="field-image_description"
              name="image_description"
              value={(formData.image_description as string) || ''}
              onChange={(e) => onInputChange('image_description', e.target.value)}
              placeholder="Berikan deskripsi tambahan tentang gambar..."
              className="mt-2 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
            />
          </div>
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing || !formData.image_file}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium
          ${isProcessing 
            ? 'bg-blue-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
          }`}
      >
        {isProcessing && <span className="animate-spin">⏳</span>}
        {isProcessing ? 'Memproses...' : 'Analisis Gambar'}
      </button>
    </div>
  );
};

export default ImageAgentForm;
