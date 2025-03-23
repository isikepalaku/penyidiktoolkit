import { useState } from 'react';
import AgentCard from '../components/AgentCard';
import { ArrowLeft } from 'lucide-react';
import { DotBackground } from '@/components/ui/DotBackground';
import { Agent, AgentType } from '@/types';
import EMPChatPage from '@/components/ui/EMPChatPage';
import BantekChatPage from '@/components/ui/BantekChatPage';
import PerkabaChatPage from '@/components/ui/PerkabaChatPage';
import WassidikChatPage from '@/components/ui/WassidikChatPage';

export default function PerkabaChat() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const agents: Agent[] = [
    {
      id: 'perkaba_chat',
      name: 'SOP Lidik Sidik',
      description: 'Ajukan pertanyaan dan dapatkan informasi seputar SOP Lidik sidik berdasarkan Perkaba',
      type: 'perkaba_chat' as AgentType,
      status: 'on',
      icon: 'brain',
      color: 'blue'
    },
    {
      id: 'bantek_chat',
      name: 'SOP Bantek',
      description: 'Ajukan pertanyaan seputar SOP bantuan teknis berdasarkan Perkaba',
      type: 'bantek_chat' as AgentType,
      status: 'on',
      icon: 'file-text',
      color: 'green'
    },
    {
      id: 'wassidik_chat',
      name: 'SOP Wassidik',
      description: 'Ajukan pertanyaan seputar pengawasan penyidikan Internal berdasarkan Perkaba',
      type: 'wassidik_chat' as AgentType,
      status: 'on',
      icon: 'brain',
      color: 'blue'
    },
    {
      id: 'emp_chat',
      name: 'EMP AI',
      description: 'Asisten AI EMP berdasarkan perkaba polri',
      type: 'emp_chat' as AgentType,
      status: 'on',
      icon: 'dollar',
      color: 'blue'
    }
  ];

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  const handleBack = () => {
    setSelectedAgent(null);
  };

  const renderContent = () => {
    if (!selectedAgentData) return null;

    switch (selectedAgentData.type) {
      case 'perkaba_chat':
        return (
          <div className="fixed inset-0 z-20 bg-white">
            <PerkabaChatPage onBack={handleBack} />
          </div>
        );
      case 'bantek_chat':
        return (
          <div className="fixed inset-0 z-20 bg-white">
            <BantekChatPage onBack={handleBack} />
          </div>
        );
      case 'wassidik_chat':
        return (
          <div className="fixed inset-0 z-20 bg-white">
            <WassidikChatPage onBack={handleBack} />
          </div>
        );
      case 'emp_chat':
        return (
          <div className="fixed inset-0 z-20 bg-white">
            <EMPChatPage onBack={handleBack} />
          </div>
        );
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
                  <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    SOP Penyidik
                  </h1>
                </div>
                <p className="text-base md:text-lg text-gray-600 ml-11">
                  Melakukan percakapan dengan agen AI yang terkait dengan SOP Penyidik
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className="cursor-pointer transform transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <AgentCard 
                      agent={agent} 
                      bgColor={
                        agent.type === 'perkaba_chat' 
                          ? 'bg-purple-50' 
                          : agent.type === 'bantek_chat'
                          ? 'bg-green-50'
                          : agent.type === 'wassidik_chat'
                          ? 'bg-blue-50'
                          : agent.type === 'emp_chat'
                          ? 'bg-amber-50'
                          : 'bg-white'
                      }
                      className={
                        agent.type === 'perkaba_chat'
                          ? 'border border-purple-100 hover:border-purple-200 hover:shadow-purple-100'
                          : agent.type === 'bantek_chat'
                          ? 'border border-green-100 hover:border-green-200 hover:shadow-green-100'
                          : agent.type === 'wassidik_chat'
                          ? 'border border-blue-100 hover:border-blue-200 hover:shadow-blue-100'
                          : agent.type === 'emp_chat'
                          ? 'border border-amber-100 hover:border-amber-200 hover:shadow-amber-100'
                          : 'border border-gray-100 hover:border-gray-200 hover:shadow-gray-100'
                      }
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
