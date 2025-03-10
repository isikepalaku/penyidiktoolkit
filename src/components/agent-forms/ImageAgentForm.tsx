import React, { useState } from 'react';
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
import ThinkingAnimation from '../ThinkingAnimation';

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

type ImageAgentFormProps = Omit<BaseAgentFormProps, 'agent'> & {
  agent?: ExtendedAgent;
  isDisabled?: boolean;
};

export const ImageAgentForm: React.FC<ImageAgentFormProps> = ({
  agent,
  formData,
  onInputChange,
  error,
  isProcessing,
  onSubmit,
  isDisabled = false
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showThinking, setShowThinking] = useState(false);
  
  // Helper function untuk type checking
  const getImageFiles = (): File[] => {
    if (!formData.image_files) return [];
    if (Array.isArray(formData.image_files)) return formData.image_files;
    if (formData.image_files instanceof File) return [formData.image_files];
    return [];
  };
  
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File terlalu besar. Maksimal ukuran file adalah ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    
    if (!file.type.startsWith('image/')) {
      return 'Format file tidak didukung. Gunakan format gambar seperti JPG, PNG, atau GIF';
    }
    
    return null;
  };
  
  const handleFileChange = (files: File[]) => {
    try {
      if (files.length === 0) {
        onInputChange('image_files', []);
        return;
      }

      console.log('Selected files:', files.map(file => ({
        name: file.name,
        type: file.type,
        size: formatFileSize(file.size)
      })));
      
      // Validate each file
      for (let i = 0; i < files.length; i++) {
        const validationError = validateFile(files[i]);
        if (validationError) {
          onInputChange('error', `File ${files[i].name}: ${validationError}`);
          onInputChange('image_files', []);
          return;
        }
      }
      
      onInputChange('image_files', files);
      onInputChange('error', null);
    } catch (err) {
      console.error('Error handling image files:', err);
      onInputChange('error', err instanceof Error ? err.message : 'Gagal memproses file gambar');
      onInputChange('image_files', []);
    }
  };
  
  // Function to trigger file input click
  const handleUploadClick = () => {
    if (!isDisabled && !isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Message */}
      {agent?.warning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
          <AlertTriangle className="text-amber-500 h-5 w-5 mt-0.5 flex-shrink-0" />
          <p className="text-amber-700 text-sm">{agent.warning}</p>
        </div>
      )}
      
      {/* Image Upload */}
      <div>
        <Label htmlFor="field-image_file">Upload Gambar</Label>
        <div 
          onClick={handleUploadClick}
          className={cn(
            "mt-2 p-6 border-2 border-dashed rounded-lg",
            !isDisabled && !isProcessing ? "cursor-pointer hover:border-blue-500 hover:bg-blue-50/50" : "cursor-not-allowed",
            "transition-colors",
            isDisabled && "opacity-50"
          )}
        >
          <input
            ref={fileInputRef}
            id="field-image_file"
            name="image_file"
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={(e) => {
              const fileList = e.target.files;
              if (!fileList) return;
              
              const files = Array.from(fileList);
              if (files.length > 3) {
                onInputChange('error', 'Maksimal 3 gambar yang dapat diupload');
                return;
              }
              
              handleFileChange(files);
            }}
            multiple
            disabled={isDisabled || isProcessing}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            {getImageFiles().length > 0 ? (
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
                <FileImage className="w-8 h-8 text-blue-600" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full">
                <Camera className="w-8 h-8 text-blue-500" />
              </div>
            )}
            
            <div className="text-sm text-gray-600 text-center">
            {getImageFiles().length > 0 ? (
              <span className="text-blue-600 font-medium">
                {getImageFiles().length} gambar dipilih
              </span>
            ) : (
              <>
                <span className="font-medium">Klik untuk upload</span> atau ambil foto
                <br />
                JPG, PNG, GIF (max. 3 file, {formatFileSize(MAX_FILE_SIZE)}/file)
              </>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Previews */}
      {getImageFiles().length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {getImageFiles().map((file, index) => (
            <div key={index} className="relative">
              <img
                src={URL.createObjectURL(file)}
                alt={`Preview ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg shadow-md border border-gray-200"
              />
              <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                <FileImage className="w-3 h-3" />
                {file.name} ({formatFileSize(file.size)})
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Type Selection for Medical Image */}
      {agent?.type === 'medical_image' && (
        <div className="space-y-2">
          <Label htmlFor="service-type-select">Jenis Layanan Dokpol</Label>
          <Select
            value={(formData.service_type as string) || ''}
            onValueChange={(value) => onInputChange('service_type', value)}
            disabled={isDisabled || isProcessing}
          >
            <SelectTrigger
              id="service-type-select"
              className={cn(
                "ps-2 [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span_[data-square]]:shrink-0",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <SelectValue placeholder="Pilih jenis layanan" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="umum">
                  <Square className="bg-blue-400/20 text-blue-500">
                    <FileImage className="h-3 w-3" />
                  </Square>
                  <span className="truncate">Dokpol Umum</span>
                </SelectItem>
                <SelectItem value="forensik">
                  <Square className="bg-purple-400/20 text-purple-500">
                    <Microscope className="h-3 w-3" />
                  </Square>
                  <span className="truncate">Dokpol Forensik</span>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Only show these fields for regular image agent */}
      {agent?.type === 'image' && (
        <>
          {/* Prompt Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="prompt-type-select">Jenis Analisis</Label>
            <Select 
              value={(formData.prompt_type as string) || 'default'}
              onValueChange={(value) => onInputChange('prompt_type', value as keyof typeof imagePrompts)}
              disabled={isDisabled || isProcessing}
            >
              <SelectTrigger 
                id="prompt-type-select"
                className={cn(
                  "ps-2 [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span_[data-square]]:shrink-0",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <SelectValue placeholder="Pilih jenis analisis" />
              </SelectTrigger>
              <SelectContent>
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
              disabled={isDisabled || isProcessing}
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

      {/* Thinking Animation */}
      {showThinking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <ThinkingAnimation />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing || isDisabled || getImageFiles().length === 0 || (agent?.type === 'medical_image' && !formData.service_type)}
        onClick={async (e) => {
          e.preventDefault();
          if (onSubmit && !isProcessing && !isDisabled) {
            try {
              setShowThinking(true);
              await onSubmit(e);
            } catch (err) {
              console.error('Error submitting form:', err);
            } finally {
              setShowThinking(false);
            }
          }
        }}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium",
          (isProcessing || isDisabled)
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700",
          isDisabled && "opacity-50"
        )}
      >
        {isProcessing ? (
          <>
            <span className="animate-spin">⏳</span>
            Memproses...
          </>
        ) : (
          'Analisis Gambar'
        )}
      </button>
    </div>
  );
};

export default ImageAgentForm;
