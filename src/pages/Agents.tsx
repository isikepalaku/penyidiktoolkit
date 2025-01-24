import React, { useEffect, useState } from 'react';
import AgentCard from '../components/AgentCard';
import ThinkingAnimation from '../components/ThinkingAnimation';
import ResultArtifact from '../components/ResultArtifact';
import { ArrowLeft } from 'lucide-react';
import type { ExtendedAgent } from '../types';
import { agents } from '../data/agents';
import { BaseAgentForm } from '../components/agent-forms/BaseAgentForm';
import { ImageAgentForm } from '../components/agent-forms/ImageAgentForm';
import { useAgentForm } from '../hooks/useAgentForm';

export default function Agents() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showArtifact, setShowArtifact] = useState(false);
  const {
    formData,
    imagePreview,
    error,
    isProcessing,
    result,
    setResult,
    handleInputChange,
    handleSubmit,
    reset
  } = useAgentForm();

  useEffect(() => {
    if (result) {
      setShowArtifact(true);
    }
  }, [result]);

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentData) return;
    await handleSubmit(selectedAgentData.type);
  };

  const handleBack = () => {
    setSelectedAgent(null);
    reset();
    setShowArtifact(false);
  };

  const renderAgentForm = () => {
    if (!selectedAgentData) return null;

    const commonProps = {
      agent: selectedAgentData,
      formData,
      onInputChange: handleInputChange,
      error,
      isProcessing
    };

    switch (selectedAgentData.type) {
      case 'image':
        return <ImageAgentForm {...commonProps} imagePreview={imagePreview} />;
      default:
        return <BaseAgentForm {...commonProps} />;
    }
  };

  if (selectedAgent && selectedAgentData) {
    return (
      <>
        <div className={`p-6 lg:p-8 transition-all duration-300 ${showArtifact ? 'lg:mr-[50%]' : ''}`}>
          <header className="mb-8">
            <div className="max-w-5xl mx-auto px-2 md:px-6 space-y-6">
              <button 
                onClick={handleBack} 
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 border border-gray-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Kembali</span>
              </button>
              
              <div className="border-b pb-4">
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight mb-2">
                  {selectedAgentData.name}
                </h1>
                <p className="text-base text-gray-600">
                  {selectedAgentData.description}
                </p>
              </div>
            </div>
          </header>

          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleFormSubmit}>
              {renderAgentForm()}
            </form>

            {isProcessing && (
              <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
                <ThinkingAnimation />
              </div>
            )}
          </div>
        </div>

        {showArtifact && result && (
          <ResultArtifact 
            content={result}
            onClose={() => {
              setShowArtifact(false);
              setResult(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-8 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-2xl">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Agen AI</h1>
            </div>
            <p className="text-base md:text-lg text-gray-600 ml-11">
              Pilih agen AI untuk membantu investigasi Anda
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {agents.map((agent: ExtendedAgent) => (
          <div 
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className="cursor-pointer"
          >
            <AgentCard agent={agent} />
          </div>
        ))}
      </div>
    </div>
  );
}