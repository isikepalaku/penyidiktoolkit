import React, { useState } from 'react';
import type { BaseAgentFormProps } from './BaseAgentForm';
import { imagePrompts } from '../../data/agents/imageAgent';
import { submitImageAnalysis } from '../../services/imageService';
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
import { FileImage, Microscope } from "lucide-react";
import ThinkingAnimation from '../ThinkingAnimation';

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

type GeminiImageFormProps = Omit<BaseAgentFormProps, 'agent'> & {
  agent: NonNullable<BaseAgentFormProps['agent']>;
  imagePreview: string | null;
  onResult?: (result: string) => void;
};

export const GeminiImageForm: React.FC<GeminiImageFormProps> = ({
  agent,
  formData,
  onInputChange,
  error,
  isProcessing,
  imagePreview,
  onSubmit,
  onResult
}) => {
  const [showThinking, setShowThinking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const isImageProcessor = agent.type === 'image_processor';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi file
    if (!formData.image_file || !(formData.image_file instanceof File)) {
      setLocalError('Mohon pilih file gambar');
      return;
    }
    
    if (!isProcessing) {
      try {
        setShowThinking(true);
        setLocalError(null);
        
        // Jika onSubmit tersedia, panggil terlebih dahulu
        if (onSubmit) {
          await onSubmit(e);
        }
        
        // Panggil submitImageAnalysis dari imageService
        const promptType = (formData.prompt_type as keyof typeof imagePrompts) || 'default';
        console.log('Submitting image analysis with prompt type:', promptType);
        
        const result = await submitImageAnalysis(
          formData.image_file as File,
          formData.image_description as string,
          promptType
        );

        // Kirim hasil ke parent component
        if (onResult) {
          onResult(result);
        }

        // Reset form jika berhasil
        onInputChange('image_file', null);
        onInputChange('image_description', '');
        onInputChange('prompt_type', 'default');
        
      } catch (err) {
        console.error('Error analyzing image:', err);
        setLocalError(err instanceof Error ? err.message : 'Gagal menganalisis gambar');
      } finally {
        setShowThinking(false);
      }
    }
  };

  // Gabungkan error dari props dan local error
  const displayError = error || localError;

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <div>
        <Label htmlFor="field-image_file">Upload Gambar</Label>
        <input
          id="field-image_file"
          name="image_file"
          type="file"
          accept="image/jpeg,image/png,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // Validasi ukuran file (10MB)
              if (file.size > 10 * 1024 * 1024) {
                setLocalError('Ukuran file terlalu besar (maksimal 10MB)');
                return;
              }
              
              // Validasi tipe file
              if (!file.type.startsWith('image/')) {
                setLocalError('Format file tidak didukung. Gunakan format gambar seperti JPG, PNG, atau GIF');
                return;
              }

              onInputChange('image_file', file);
              setLocalError(null);
            }
          }}
          disabled={isProcessing}
          className="mt-2 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="mt-4 relative">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full max-w-2xl h-auto rounded-lg shadow-lg"
          />
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
              onValueChange={(value) => {
                onInputChange('prompt_type', value as keyof typeof imagePrompts);
                console.log('Selected prompt type:', value);
              }}
              disabled={isProcessing}
            >
              <SelectTrigger 
                id="prompt-type-select"
                className={cn(
                  "ps-2 [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span_[data-square]]:shrink-0",
                  isProcessing && "opacity-50 cursor-not-allowed"
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
                  <SelectItem value="text_extraction">
                    <Square className="bg-green-400/20 text-green-500">
                      <FileImage className="h-3 w-3" />
                    </Square>
                    <span className="truncate">Ekstraksi Teks</span>
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
              placeholder="Berikan deskripsi atau konteks tambahan tentang gambar..."
              className="mt-2 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
              disabled={isProcessing}
            />
          </div>
        </>
      )}

      {/* Thinking Animation */}
      {showThinking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <ThinkingAnimation />
          </div>
        </div>
      )}

      {/* Error Display */}
      {displayError && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg">
          {displayError}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isProcessing || !formData.image_file}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium",
          isProcessing 
            ? "bg-blue-400 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700 cursor-pointer",
          isProcessing && "opacity-50"
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

export default GeminiImageForm; 