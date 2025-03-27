import React, { useEffect, useState } from 'react';
import AgentCard from '../components/AgentCard';
import ThinkingAnimation from '../components/ThinkingAnimation';
import ResultArtifact from '../components/ResultArtifact';
import { ArrowLeft, CircuitBoard, Cpu } from 'lucide-react';
import type { ExtendedAgent, Agent } from '../types';
import { agents } from '../data/agents';
import { BaseAgentForm } from '../components/agent-forms/BaseAgentForm';
import { ImageAgentForm } from '../components/agent-forms/ImageAgentForm';
import { ImageProcessorForm, ImageProcessorFormProps } from '../components/agent-forms/ImageProcessorForm';
import { useAgentForm } from '../hooks/useAgentForm';
import { DotBackground } from '../components/ui/DotBackground';

// Convert ExtendedAgent to Agent type by omitting extended properties
const toAgent = (extendedAgent: ExtendedAgent): Agent => {
  const agentProps: Agent = {
    id: extendedAgent.id,
    name: extendedAgent.name,
    description: extendedAgent.description,
    type: extendedAgent.type,
    status: extendedAgent.status,
    fields: extendedAgent.fields
  };
  return agentProps;
};

export default function Agents() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showArtifact, setShowArtifact] = useState(false);
  const [progress, setProgress] = useState(0);
  const {
    formData,
    error,
    isProcessing,
    result,
    setResult,
    handleInputChange,
    handleSubmit,
    reset,
    imagePreview
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
    try {
      setProgress(0);
      
      if (selectedAgentData.type === 'tipikor_analyst') {
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 5;
          });
        }, 1000);
        
        setTimeout(() => clearInterval(progressInterval), 30000);
      }
      
      await handleSubmit(selectedAgentData.type);
      
      setProgress(100);
    } catch (err) {
      console.error('Error submitting form:', err);
      setProgress(0);
    }
  };

  const handleBack = () => {
    setSelectedAgent(null);
    reset();
    setShowArtifact(false);
  };

  // Enhanced navigation protection for both desktop and mobile
  useEffect(() => {
    // Handle page refreshes and tab closing
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing || result) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    // Handle back button/gesture navigation
    const handlePopState = (e: PopStateEvent) => {
      if (isProcessing || result) {
        // Prevent the default action
        e.preventDefault();
        
        // Push a new state to prevent the back action
        window.history.pushState(null, '', window.location.pathname);
        
        // Show a confirmation dialog
        const confirmed = window.confirm(
          'Berhenti sekarang akan menghilangkan hasil dan percakapan Anda. Yakin ingin keluar?'
        );
        
        // If confirmed, manually navigate back to agent selection
        if (confirmed) {
          setSelectedAgent(null);
          reset();
          setShowArtifact(false);
        }
      }
    };

    // When component mounts, add a history entry to enable back navigation handling
    window.history.pushState(null, '', window.location.pathname);

    // Register event handlers
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isProcessing, result, reset]);

  const renderAgentForm = () => {
    if (!selectedAgentData) return null;

    const commonProps = {
      agent: selectedAgentData,
      formData,
      onInputChange: handleInputChange,
      onSubmit: handleFormSubmit,
      error,
      isProcessing,
      imagePreview
    };

    switch (selectedAgentData.type) {
      case 'image_processor':
        return <ImageProcessorForm {...commonProps as ImageProcessorFormProps} />;
      case 'medical_image':
        return <ImageAgentForm {...commonProps} />;
      case 'crime_trend_analyst':
        return <BaseAgentForm {...commonProps} textareaHeight="h-32" />;
      case 'hoax_checker':
      case 'case_research':
      case 'spkt':
      case 'modus_kejahatan':
      case 'sentiment_analyst':
      case 'tipikor_analyst':
        return <BaseAgentForm {...commonProps} />;
      default:
        return null;
    }
  };

  if (selectedAgent && selectedAgentData) {
    return (
      <DotBackground className="min-h-screen">
        <div className={`p-6 lg:p-8 transition-all duration-300 ${showArtifact ? 'lg:mr-[50%]' : ''}`}>
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
                <ThinkingAnimation 
                  status={
                    selectedAgentData?.type === 'tipikor_analyst' ? 
                      (progress < 20 ? 'preparing' : 
                       progress < 40 ? 'processing' : 
                       progress < 60 ? 'searching' : 
                       progress < 80 ? 'collecting' : 
                       progress < 100 ? 'finalizing' : 'complete') : 
                      undefined
                  }
                  progress={selectedAgentData?.type === 'tipikor_analyst' ? progress : undefined}
                />
              </div>
            )}
          </div>
        </div>

        {showArtifact && result && selectedAgentData && (
          <ResultArtifact 
            content={result}
            title={`Hasil Analisis ${selectedAgentData.name}`}
            onClose={() => {
              setShowArtifact(false);
              setResult(null);
            }}
          />
        )}
      </DotBackground>
    );
  }

  return (
    <DotBackground className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="max-w-4xl">
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
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {agents.map((agent: ExtendedAgent) => (
            <div 
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className="cursor-pointer transform transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <AgentCard agent={toAgent(agent)} />
            </div>
          ))}
        </div>
      </div>
    </DotBackground>
  );
}
