import { useState } from 'react';
import type { FormData, FormDataValue } from '../types';
import { submitImageAnalysis, submitAgentAnalysis } from '../services/agentService';

interface UseAgentFormResult {
  formData: FormData;
  imagePreview: string | null;
  error: string | null;
  isProcessing: boolean;
  result: string | null;
  setResult: (result: string | null) => void;
  handleInputChange: (fieldId: string, value: FormDataValue) => void;
  handleSubmit: (agentType: string) => Promise<void>;
  reset: () => void;
}

export const useAgentForm = (): UseAgentFormResult => {
  const [formData, setFormData] = useState<FormData>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleInputChange = (fieldId: string, value: FormDataValue) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    if (value instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(value);
    }

    setError(null);
  };

  const handleSubmit = async (agentType: string) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      let response: string;

      if (agentType === 'image') {
        const imageFile = formData.image_file;
        if (!imageFile || !(imageFile instanceof File)) {
          throw new Error('Mohon pilih file gambar');
        }
        response = await submitImageAnalysis(
          imageFile, 
          typeof formData.image_description === 'string' ? formData.image_description : undefined
        );
      } else {
        // Find the first non-empty string value in formData
        const messageField = Object.entries(formData)
          .find(([, value]) => typeof value === 'string' && value.length > 0);
        
        if (!messageField) {
          throw new Error('Mohon isi deskripsi terlebih dahulu');
        }
        
        response = await submitAgentAnalysis(messageField[1] as string, agentType);
      }

      setResult(response);
      // Reset form after successful submission
      setFormData({});
      setImagePreview(null);
    } catch (err) {
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFormData({});
    setImagePreview(null);
    setError(null);
    setResult(null);
    setIsProcessing(false);
  };

  return {
    formData,
    imagePreview,
    error,
    isProcessing,
    result,
    setResult,
    handleInputChange,
    handleSubmit,
    reset
  };
};

export default useAgentForm;