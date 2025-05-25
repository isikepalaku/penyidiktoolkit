import { useState, useRef } from 'react';
import type { FormData, FormDataValue } from '../types';
import { submitImageAnalysis } from '../services/imageService';
import { submitAgentAnalysis as submitSpktAnalysis } from '../services/agentSpkt';
import { submitAgentAnalysis as submitCaseAnalysis } from '../services/agentCaseResearch.ts';
import { submitAgentAnalysis as submitHoaxAnalysis } from '../services/agentHoaxChecker';
import { submitImageProcessorAnalysis } from '../services/imageProcessorService';
import { submitDokpolAnalysis } from '../services/dokpolService';
import { imagePrompts } from '../data/agents/imageAgent';
import { agents } from '../data/agents';
import { submitModusKejahatanAnalysis } from '@/services/agentModusKejahatan';
import { submitCrimeTrendAnalysis } from '@/services/agentCrimeTrendAnalyst';
import { submitAgentAnalysis as submitSentimentAnalysis } from '@/services/agentSentimentAnalyst';
import { submitAgentAnalysis as submitTipikorAnalysis } from '@/services/agentTipikorAnalyst';
import { submitAgentAnalysis as submitEncyclopediaPoliceAnalysis } from '@/services/agentEncyclopediaPolice';


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

const API_TIMEOUT = 600000; // 600 seconds (10 minutes) timeout

export const useAgentForm = (): UseAgentFormResult => {
  const [formData, setFormData] = useState<FormData>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const handleInputChange = (fieldId: string, value: FormDataValue) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Handle preview for single file
    if (value instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(value);
    }
    
    // Handle preview for multiple files
    if (Array.isArray(value) && value.every(file => file instanceof File)) {
      // Just preview the first file for now
      if (value.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(value[0]);
      } else {
        setImagePreview(null);
      }
    }

    setError(null);
  };

  const handleSubmit = async (agentType: string) => {
    // Clear any existing timeouts
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Set timeout
    timeoutRef.current = window.setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setError('Permintaan timeout setelah 10 menit. Silakan coba lagi.');
      setIsProcessing(false);
    }, API_TIMEOUT);

    try {
      let response: string;
      if (agentType === 'image_processor') {
        const imageFile = formData.image_file;
        if (!imageFile || !(imageFile instanceof File)) {
          throw new Error('Mohon pilih file gambar');
        }
        response = await submitImageProcessorAnalysis(imageFile);
      } else if (agentType === 'medical_image') {
        const serviceType = formData.service_type as ('umum' | 'forensik');
        if (!serviceType) {
          throw new Error('Mohon pilih jenis layanan Dokpol');
        }
        
        const imageFiles = formData.image_files as File[];
        if (!imageFiles || !Array.isArray(imageFiles) || imageFiles.length === 0) {
          throw new Error('Mohon pilih minimal 1 gambar');
        }
        if (imageFiles.length > 3) {
          throw new Error('Maksimal 3 gambar yang dapat diupload');
        }
        
        // Ambil informasi tambahan jika tersedia
        const clinicalSymptoms = formData.clinical_symptoms as string | undefined;
        const medicalHistory = formData.medical_history as string | undefined;
        
        response = await submitDokpolAnalysis({
          imageFiles,
          serviceType,
          clinicalSymptoms,
          medicalHistory
        });
      } else if (agentType === 'image' || agentType === 'gemini_image') {
        if (agentType === 'gemini_image') {
          response = '';
        } else {
          const imageFiles = formData.image_files;
          if (!imageFiles || !Array.isArray(imageFiles) || imageFiles.length === 0) {
            throw new Error('Mohon pilih minimal 1 gambar');
          }
          if (imageFiles.length > 3) {
            throw new Error('Maksimal 3 gambar yang dapat diupload');
          }
          
          const promptType = (formData.prompt_type as keyof typeof imagePrompts) || 'default';
          
          response = await submitImageAnalysis(
            imageFiles,
            typeof formData.image_description === 'string' ? formData.image_description : undefined,
            promptType
          );
        }
      } else {
        const agent = agents.find(a => a.type === agentType);
        if (!agent) {
          throw new Error('Tipe agen tidak ditemukan');
        }

        const textField = agent.fields.find(f => f.type === 'textarea');
        if (!textField) {
          throw new Error('Konfigurasi agen tidak valid');
        }

        const message = formData[textField.id] as string;
        if (!message?.trim()) {
          throw new Error(`Mohon isi ${textField.label.toLowerCase()}`);
        }

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
          case 'modus_kejahatan':
            response = await submitModusKejahatanAnalysis(message.trim());
            break;
          case 'crime_trend_analyst':
            response = await submitCrimeTrendAnalysis(message.trim());
            break;
          case 'sentiment_analyst':
            response = await submitSentimentAnalysis(message.trim());
            break;
          case 'tipikor_analyst':
            response = await submitTipikorAnalysis(message.trim());
            break;
          case 'encyclopedia_police':
            response = await submitEncyclopediaPoliceAnalysis(message.trim());
            break;

          default:
            throw new Error('Tipe agen tidak dikenali');
        }
      }

      // Clear timeout since request completed successfully
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      setResult(response);
    } catch (err) {
      // Don't set error if it was caused by the timeout
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui');
      }
      throw err; // Re-throw to let the form component handle it
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    }
  };

  const reset = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
