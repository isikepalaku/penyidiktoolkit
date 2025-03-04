import React, { useState } from 'react';
import { FileAudio, ArrowLeft } from 'lucide-react';
import { processAudioTranscript } from '../services/audioTranscriptService';
import { AudioAgentForm } from '@/components/agent-forms/AudioAgentForm';
import ResultArtifact from '@/components/ResultArtifact';
import type { FormData, FormDataValue } from '@/types';
import type { AudioPromptType } from '@/data/agents/audioAgent';

type ToolType = {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
};

const toolTypes: ToolType[] = [
  {
    id: 'transcript',
    name: 'Audio Processor',
    description: 'Transkripsi dan analisis audio dengan teknologi AI',
    icon: <FileAudio size={24} className="text-blue-500" />
  }
];

export default function Toolkit() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    audio_file: null,
    task_type: 'transcribe'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool || !formData.audio_file || isProcessing || result) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await processAudioTranscript({
        audio: formData.audio_file as File,
        task_type: formData.task_type as AudioPromptType
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to process audio');
      }

      setResult(response.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (fieldId: string, value: FormDataValue) => {
    if (fieldId === 'error') {
      setError(value as string);
      return;
    }
    
    // Jika mengubah file atau task, reset hasil sebelumnya
    if (fieldId === 'audio_file' || fieldId === 'task_type') {
      setResult(null);
    }
    
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const resetForm = () => {
    setSelectedTool(null);
    setFormData({
      audio_file: null,
      task_type: 'transcribe'
    });
    setResult(null);
    setError(null);
  };

  const selectedToolData = toolTypes.find(tool => tool.id === selectedTool);

  if (selectedTool && selectedToolData) {
    return (
      <div className="p-6 lg:p-8">
        <header>
          <div className="max-w-5xl mx-auto pl-14 pr-4 sm:pl-14 sm:pr-4 lg:pl-14 lg:pr-4 py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={resetForm}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-7">{selectedToolData.name}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{selectedToolData.description}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto relative">
          <form onSubmit={handleSubmit} className="space-y-6">
            <AudioAgentForm
              formData={formData}
              onInputChange={handleInputChange}
              error={error}
              isProcessing={isProcessing}
              isDisabled={!!result} // Disable form ketika ada hasil
            />

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {result && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                <button
                  onClick={() => setResult(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Proses Audio Baru
                </button>
              </div>
            )}
          </form>
        </div>

        {result && (
          <ResultArtifact 
            content={result}
            onClose={() => setResult(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Toolkit
              </h1>
            </div>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 ml-11">
              Kumpulan alat bantu untuk investigasi Anda
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {toolTypes.map(tool => (
              <div 
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all cursor-pointer border border-gray-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        {tool.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{tool.name}</h3>
                    </div>
                    <p className="text-gray-600">{tool.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}