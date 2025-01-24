import React, { useState, useRef } from 'react';
import type { ExtendedAgent, FormData } from '../../types';
import AutosizeTextarea from '../AutosizeTextarea';
import { FileImage, Loader2 } from 'lucide-react';
import { submitImageAnalysis } from '../../services/imageService';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
          <label htmlFor={`field-${field.id}`} className="block text-sm font-medium text-gray-700 mb-2">
            {field.label}
          </label>
          {field.type === 'textarea' ? (
            <div className="relative">
              <AutosizeTextarea
                id={`field-${field.id}`}
                name={field.id}
                value={(formData[field.id] as string) || ''}
                onChange={(value) => onInputChange(field.id, value)}
                placeholder={field.placeholder}
                minRows={3}
                maxRows={12}
                className="shadow-sm"
              />
              {agent.type === 'spkt' && (
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  {isProcessingImage && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Memproses gambar...</span>
                    </div>
                  )}
                  <label
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
                  </label>
                </div>
              )}
            </div>
          ) : (
            <input
              id={`field-${field.id}`}
              name={field.id}
              type="text"
              value={(formData[field.id] as string) || ''}
              onChange={(e) => onInputChange(field.id, e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        disabled={isProcessing || isProcessingImage}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
          ${isProcessing || isProcessingImage
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
          } text-white transition-colors`}
      >
        {(isProcessing || isProcessingImage) && <Loader2 className="w-4 h-4 animate-spin" />}
        {isProcessing ? 'Memproses...' : 'Proses'}
      </button>
    </div>
  );
};

export default BaseAgentForm;