import React, { useState, useRef } from 'react';
import type { ExtendedAgent, FormData } from '../../types';
import AutosizeTextarea from '../AutosizeTextarea';
import { FileImage, Loader2 } from 'lucide-react';
import { submitImageAnalysis } from '../../services/imageService';
import { Label } from "@/components/ui/label";

export interface BaseAgentFormProps {
  agent: ExtendedAgent;
  formData: FormData;
  onInputChange: (fieldId: string, value: string | File | null) => void;
  error?: string | null;
  isProcessing: boolean;
}

export const BaseAgentForm: React.FC<BaseAgentFormProps> = ({
  agent,
  formData,
  onInputChange,
  error,
  isProcessing
}) => {
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

  return (
    <div className="space-y-6">
      {agent.fields.map((field) => (
        <div key={field.id}>
          <Label htmlFor={field.id}>
            {field.label}
          </Label>
          {field.type === 'textarea' ? (
            <div className="relative mt-2">
              <AutosizeTextarea
                id={field.id}
                name={field.id}
                value={(formData[field.id] as string) || ''}
                onChange={(value) => onInputChange(field.id, value)}
                placeholder={field.placeholder}
                minRows={3}
                maxRows={12}
                className="shadow-sm"
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
              id={field.id}
              name={field.id}
              type="text"
              value={(formData[field.id] as string) || ''}
              onChange={(e) => onInputChange(field.id, e.target.value)}
              className="mt-2 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={field.placeholder}
            />
          )}
        </div>
      ))}

      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isProcessing}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium
          ${isProcessing 
            ? 'bg-blue-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
          }`}
      >
        {isProcessing && <span className="animate-spin">⏳</span>}
        {isProcessing ? 'Memproses...' : 'Kirim'}
      </button>
    </div>
  );
};

export default BaseAgentForm;
