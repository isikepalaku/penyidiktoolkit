import { useState, useEffect } from 'react';
import AgentCard from '../components/AgentCard';
import ChatInterface from '../components/ChatInterface';
import { ArrowLeft } from 'lucide-react';
import { sendChatMessage as sendPenyidikChatMessage } from '../services/penyidikService';
import { sendChatMessage as sendTipidkorChatMessage } from '../services/tipidkorService';
import { sendChatMessage as sendFismondevChatMessage } from '../services/fismondevService';
import { DotBackground } from '@/components/ui/DotBackground';
import { Agent } from '@/types';
import { penyidikAiAgent } from '@/data/agents/penyidikAiAgent';
import { tipidkorAiAgent } from '@/data/agents/tipidkorAiAgent';
import { fismondevAgent } from '@/data/agents/fismondevAgent';

export default function PenyidikAi() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (selectedAgent) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // Handle browser's back button
    const handlePopState = (e: PopStateEvent) => {
      if (selectedAgent) {
        e.preventDefault();
        if (window.confirm('Apakah Anda yakin ingin meninggalkan percakapan ini? Semua percakapan akan hilang.')) {
          setSelectedAgent(null);
        } else {
          // Stay on the current page
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Add state to browser history when selecting an agent
    if (selectedAgent) {
      window.history.pushState(null, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedAgent]);

  const agents: Agent[] = [
    {
      id: penyidikAiAgent.id,
      name: penyidikAiAgent.name,
      description: penyidikAiAgent.description,
      type: penyidikAiAgent.type,
      status: penyidikAiAgent.status,
      color: 'purple',
      icon: 'brain'
    },
    {
      id: tipidkorAiAgent.id,
      name: tipidkorAiAgent.name,
      description: tipidkorAiAgent.description,
      type: tipidkorAiAgent.type,
      status: tipidkorAiAgent.status,
      color: 'blue',
      icon: 'shield'
    },
    {
      id: fismondevAgent.id,
      name: fismondevAgent.name,
      description: fismondevAgent.description,
      type: fismondevAgent.type,
      status: fismondevAgent.status,
      color: 'green',
      icon: 'dollar'
    }
  ];

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  const handleBack = () => {
    if (window.confirm('Apakah Anda yakin ingin kembali? Semua percakapan akan hilang.')) {
      setSelectedAgent(null);
    }
  };

  const renderContent = () => {
    if (!selectedAgentData) return null;

    switch (selectedAgentData.type) {
      case 'penyidik_chat':
        return <ChatInterface sendMessage={sendPenyidikChatMessage} />;
      case 'tipidkor_chat':
        return <ChatInterface sendMessage={sendTipidkorChatMessage} />;
      case 'fismondev_chat':
        return <ChatInterface sendMessage={sendFismondevChatMessage} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen">
      <DotBackground className="absolute inset-0" />
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8 min-h-screen">
          {selectedAgent ? (
            <div className="max-w-5xl mx-auto">
              <div className="mb-8">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center px-4 py-2 text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  <span className="font-medium">Kembali</span>
                </button>
                {selectedAgentData && (
                  <div className="mt-6">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedAgentData.name}</h1>
                    <p className="text-gray-600 mt-2">{selectedAgentData.description}</p>
                  </div>
                )}
              </div>
              {renderContent()}
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-1 bg-purple-500 rounded-full"></div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Penyidik AI
                  </h1>
                </div>
                <p className="text-base md:text-lg text-gray-600 ml-11">
                  AI Assistant untuk membantu proses penyidikan dengan menyediakan analisis dan insight yang mendalam
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className="cursor-pointer transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <AgentCard 
                      agent={agent}
                      bgColor={
                        agent.type === 'tipidkor_chat'
                          ? "bg-gradient-to-br from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100"
                          : agent.type === 'fismondev_chat'
                            ? "bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100"
                            : "bg-gradient-to-br from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100"
                      }
                      className={`
                        border border-transparent
                        ${agent.type === 'tipidkor_chat' 
                          ? 'hover:border-blue-200 hover:shadow-blue-100'
                          : agent.type === 'fismondev_chat'
                            ? 'hover:border-green-200 hover:shadow-green-100'
                            : 'hover:border-purple-200 hover:shadow-purple-100'
                        }
                        shadow-lg hover:shadow-xl transition-all duration-300
                        rounded-xl overflow-hidden
                      `}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}