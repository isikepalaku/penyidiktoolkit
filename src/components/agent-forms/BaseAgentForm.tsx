import React, { useState, useRef } from 'react';
import type { ExtendedAgent, FormData, FormDataValue } from '@/types';
import AutosizeTextarea from '../AutosizeTextarea';
import { FileImage, Loader2 } from 'lucide-react';
import { submitImageAnalysis } from '../../services/imageService';
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';

export interface BaseAgentFormProps {
  agent: ExtendedAgent;
  formData: FormData;
  onInputChange: (fieldId: string, value: FormDataValue) => void;
  error: string | null;
  isProcessing: boolean;
  textareaHeight?: string;
}

export function BaseAgentForm({ 
  agent, 
  formData, 
  onInputChange, 
  error, 
  isProcessing,
  textareaHeight = 'h-64'
}: BaseAgentFormProps) {
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error state
    setImageError(null);

    try {
      setIsProcessingImage(true);
      const extractedText = await submitImageAnalysis(file, undefined, 'text_extraction');
      
      // Find the first textarea field
      const textareaField = agent.fields.find(field => field.type === 'textarea');
      if (textareaField) {
        onInputChange(textareaField.id, extractedText || '');
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setImageError(err instanceof Error ? err.message : 'Gagal memproses gambar');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Fungsi untuk menentukan ukuran textarea berdasarkan tipe agen
  const getTextareaSize = (agentType: string) => {
    switch (agentType) {
      case 'modus_kejahatan':
        return {
          minRows: 2,
          maxRows: 3,
          className: "w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
        };
      default:
        return {
          minRows: 3,
          maxRows: 12,
          className: "w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        };
    }
  };

  return (
    <div className="space-y-4">
      {agent.fields.map(field => (
        <div key={field.id}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.label}
          </label>
          {field.type === 'textarea' ? (
            <div className="relative mt-2">
              <AutosizeTextarea
                id={field.id}
                name={field.id}
                value={(formData[field.id] as string) || ''}
                onChange={(value) => onInputChange(field.id, value)}
                placeholder={field.placeholder}
                {...getTextareaSize(agent.type)}
              />
              {(agent.type === 'spkt' || agent.type === 'hoax_checker') && (
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  {isProcessingImage && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Memproses gambar...</span>
                    </div>
                  )}
                  <Label
                    htmlFor={`image-upload-${field.id}`}
                    className="cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Upload gambar untuk ekstrak teks"
                  >
                    <FileImage className="w-5 h-5 text-gray-500" />
                    <input
                      type="file"
                      id={`image-upload-${field.id}`}
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isProcessingImage}
                    />
                  </Label>
                </div>
              )}
              {imageError && (
                <div className="text-red-500 text-sm mt-2">
                  Error saat memproses gambar: {imageError}
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              id={field.id}
              value={formData[field.id] as string || ''}
              onChange={(e) => onInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={`w-full ${textareaHeight} p-3 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent`}
            />
          )}
        </div>
      ))}

      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memproses...
          </>
        ) : (
          'Kirim'
        )}
      </Button>
    </div>
  );
}

export default BaseAgentForm;
