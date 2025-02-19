import { useState } from 'react';
import AgentCard from '../components/AgentCard';
import ChatInterface from '../components/ChatInterface';
import { ArrowLeft } from 'lucide-react';
import { sendChatMessage as sendPerkabaChatMessage } from '../services/perkabaService';
import { sendChatMessage as sendBantekChatMessage } from '../services/bantekService';
import { sendChatMessage as sendWassidikChatMessage } from '../services/wassidikService';
import { sendChatMessage as sendEmpChatMessage } from '../services/empService';
import { DotBackground } from '@/components/ui/DotBackground';
import { Agent, AgentType } from '@/types';

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
      icon: 'brain',
      color: 'blue'
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
      name: 'EMP',
      description: 'Ajukan pertanyaan seputar E-Manajemen Penyidikan (EMP) berdasarkan Perkaba',
      type: 'emp_chat' as AgentType,
      status: 'on',
      icon: 'brain',
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
        return <ChatInterface sendMessage={sendPerkabaChatMessage} />;
      case 'bantek_chat':
        return <ChatInterface sendMessage={sendBantekChatMessage} />;
      case 'wassidik_chat':
        return <ChatInterface sendMessage={sendWassidikChatMessage} />;
      case 'emp_chat':
        return <ChatInterface sendMessage={sendEmpChatMessage} />;
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
                    SOP Perkaba Polri 🫰
                  </h1>
                </div>
                <p className="text-base md:text-lg text-gray-600 ml-11">
                  Melakukan percakapan dengan agen AI dapat membantu memahami SOP berdasarkan Perkaba Polri
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
                          ? 'bg-blue-50'
                          : agent.type === 'wassidik_chat'
                          ? 'bg-green-50'
                          : agent.type === 'emp_chat'
                          ? 'bg-amber-50'
                          : 'bg-white'
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
