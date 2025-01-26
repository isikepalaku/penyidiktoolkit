import { useState } from 'react';
import type { FormData, FormDataValue } from '../types';
import { submitImageAnalysis } from '../services/imageService';
import { submitAgentAnalysis as submitSpktAnalysis } from '../services/agentSpkt';
import { submitAgentAnalysis as submitCaseAnalysis } from '../services/agentCaseResearch';
import { submitAgentAnalysis as submitHoaxAnalysis } from '../services/agentHoaxChecker';
import { imagePrompts } from '../data/agents/imageAgent';
import { agents } from '../data/agents';

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
        
        const promptType = (formData.prompt_type as keyof typeof imagePrompts) || 'default';
        
        response = await submitImageAnalysis(
          imageFile,
          typeof formData.image_description === 'string' ? formData.image_description : undefined,
          promptType
        );
      } else {
        // Handle non-image agents
        const agent = agents.find(a => a.type === agentType);
        if (!agent) {
          throw new Error('Tipe agen tidak ditemukan');
        }

        // Get the first textarea field from the agent's fields
        const textField = agent.fields.find(f => f.type === 'textarea');
        if (!textField) {
          throw new Error('Konfigurasi agen tidak valid');
        }

        const message = formData[textField.id] as string;
        if (!message?.trim()) {
          throw new Error(`Mohon isi ${textField.label.toLowerCase()}`);
        }

        // Use the appropriate service based on agent type
        switch (agentType) {
          case 'case_research':
            response = await submitCaseAnalysis(message.trim());
            break;
          case 'spkt':
            response = await submitSpktAnalysis(message.trim());
            break;
          case 'hoax_checker':
            response = await submitHoaxAnalysis(message.trim());
            break;
          default:
            throw new Error('Tipe agen tidak dikenali');
        }
      }

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFormData({});
    setImagePreview(null);
    setError(null);
    setResult(null);
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
