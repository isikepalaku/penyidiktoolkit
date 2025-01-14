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
          <header>
            <div className="max-w-5xl mx-auto pl-14 pr-4 sm:pl-14 sm:pr-4 lg:pl-14 lg:pr-4 py-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <button 
                  onClick={handleBack} 
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-7">{selectedAgentData.name}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedAgentData.description}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleFormSubmit}>
              {renderAgentForm()}
            </form>

            {isProcessing && (
              <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                  <ThinkingAnimation />
                </div>
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
      <header>
        <div className="max-w-5xl mx-auto pl-14 pr-4 sm:pl-14 sm:pr-4 lg:pl-14 lg:pr-4 py-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-7">Agen AI</h1>
            <p className="text-sm text-gray-500 mt-0.5">Pilih agen AI untuk membantu investigasi Anda</p>
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