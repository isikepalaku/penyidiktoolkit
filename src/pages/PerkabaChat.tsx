import { useState } from 'react';
import AgentCard from '../components/AgentCard';
import ChatInterface from '../components/ChatInterface';
import { ArrowLeft } from 'lucide-react';
import { sendChatMessage as sendPerkabaChatMessage } from '../services/perkabaService';
import { sendChatMessage as sendBantekChatMessage } from '../services/bantekService';
import { DotBackground } from '@/components/ui/DotBackground';

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  fields: never[];
}

export default function PerkabaChat() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const agents: Agent[] = [
    {
      id: 'perkaba_chat',
      name: 'Perkaba Chat',
      description: 'Ajukan pertanyaan dan dapatkan informasi dari database Perkaba menggunakan AI',
      type: 'perkaba_chat',
      status: 'on',
      fields: []
    },
    {
      id: 'bantek_chat',
      name: 'Bantek Chat',
      description: 'Ajukan pertanyaan seputar bantuan teknis dan panduan penggunaan sistem',
      type: 'bantek_chat',
      status: 'on',
      fields: []
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
      default:
        return null;
    }
  };

  const pageContent = !selectedAgent ? (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Pilih Jenis Chat</h1>
            </div>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 ml-11 mb-8">
              Pilih jenis chat yang sesuai dengan kebutuhan Anda
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {agents.map((agent) => (
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
    </div>
  ) : (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Kembali</span>
            </button>
          </div>

          {selectedAgentData && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedAgentData.name}</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">{selectedAgentData.description}</p>
            </div>
          )}

          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DotBackground>
      <div className="relative z-10">
        {pageContent}
      </div>
    </DotBackground>
  );
}
