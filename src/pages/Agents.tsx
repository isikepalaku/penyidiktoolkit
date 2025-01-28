import React, { useEffect, useState } from 'react';
import AgentCard from '../components/AgentCard';
import ThinkingAnimation from '../components/ThinkingAnimation';
import ResultArtifact from '../components/ResultArtifact';
import { ArrowLeft, CircuitBoard, Cpu } from 'lucide-react';
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
      case 'hoax_checker':
      case 'case_research':
      case 'spkt':
        return <BaseAgentForm {...commonProps} />;
      default:
        return null;
    }
  };

  if (selectedAgent && selectedAgentData) {
    return (
      <div className="min-h-screen dark:bg-black bg-white dark:bg-dot-white/[0.2] bg-dot-black/[0.2] relative">
        {/* Radial gradient for the container to give a faded look */}
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        
        <div className={`relative z-10 p-6 lg:p-8 transition-all duration-300 ${showArtifact ? 'lg:mr-[50%]' : ''}`}>
          <header>
            <div className="max-w-5xl mx-auto px-6 py-8">
              <button 
                onClick={handleBack} 
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700 mb-6"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Kembali</span>
              </button>
              
              <div className="max-w-2xl">
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedAgentData.name}
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-300">
                  {selectedAgentData.description}
                </p>
              </div>
            </div>
          </header>

          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {renderAgentForm()}
            </form>

            {isProcessing && (
              <div className="fixed inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-black bg-white dark:bg-dot-white/[0.2] bg-dot-black/[0.2] relative">
      {/* Radial gradient for the container to give a faded look */}
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      
      <div className="relative z-10 p-6 lg:p-8">
        <header>
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  Agen AI
                  <div className="inline-flex items-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-2 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                    <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                    <CircuitBoard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
                  </div>
                </h1>
              </div>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 ml-11">
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
              className="cursor-pointer transform transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <AgentCard agent={agent} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}