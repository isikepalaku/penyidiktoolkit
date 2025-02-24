import { useState } from 'react';
import AgentCard from '../components/AgentCard';
import ChatInterface from '../components/ChatInterface';
import { ArrowLeft } from 'lucide-react';
import { sendChatMessage as sendUndangChatMessage } from '../services/undangService';
import { sendChatMessage as sendKuhpChatMessage } from '../services/kuhpService';
import { sendChatMessage as sendIteChatMessage } from '../services/iteService';
import { sendChatMessage as sendFidusiaChatMessage } from '../services/fidusiaService';
import { DotBackground } from '@/components/ui/DotBackground';
import { Agent, AgentType } from '@/types';

export default function UndangUndang() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const agents: Agent[] = [
    {
      id: 'undang_chat',
      name: 'Sektor jasa Keuangan (P2SK)',
      description: 'Agen ai spesialisasi Undang-undang (UU) Nomor 4 Tahun 2023 tentang Pengembangan dan Penguatan sektor jasa keuangan',
      type: 'undang_chat' as AgentType,
      status: 'on',
      icon: 'brain',
      color: 'blue'
    },
    {
      id: 'kuhp_chat',
      name: 'KUHP',
      description: 'Agen ai yang memiliki konteks seputar Undang-undang (UU) Nomor 1 Tahun 2023 tentang Kitab Undang-Undang Hukum Pidana (KUHP)',
      type: 'kuhp_chat' as AgentType,
      status: 'on',
      icon: 'brain',
      color: 'blue'
    },
    {
      id: 'ite_chat',
      name: 'UU ITE',
      description: 'Ajukan pertanyaan seputar UU ITE',
      type: 'ite_chat' as AgentType,
      status: 'on',
      icon: 'brain',
      color: 'blue'
    },
    {
      id: 'tipidkor_chat',
      name: 'Tindak Pidana Korupsi',
      description: 'Agen ai untuk Penelitian tindak pidana korupsi secara khusus',
      type: 'tipidkor_chat' as AgentType,
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
      case 'undang_chat':
        return <ChatInterface sendMessage={sendUndangChatMessage} />;
      case 'kuhp_chat':
        return <ChatInterface sendMessage={sendKuhpChatMessage} />;
      case 'ite_chat':
        return <ChatInterface sendMessage={sendIteChatMessage} />;
      case 'tipidkor_chat':
        return <ChatInterface sendMessage={sendFidusiaChatMessage} />;
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
                    Ahli Undang-Undang
                  </h1>
                </div>
                <p className="text-base md:text-lg text-gray-600 ml-11">
                  Melakukan percakapan dengan agen AI untuk memahami Undang-Undang dan peraturan yang berlaku
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className="cursor-pointer transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <AgentCard 
                      agent={agent} 
                      bgColor={
                        agent.type === 'undang_chat'
                          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100'
                          : agent.type === 'kuhp_chat'
                          ? 'bg-gradient-to-br from-rose-50 to-orange-50 hover:from-rose-100 hover:to-orange-100'
                          : 'bg-gradient-to-br from-green-50 to-lime-50 hover:from-green-100 hover:to-lime-100'
                      }
                      className={`
                        border border-transparent
                        ${agent.type === 'undang_chat' 
                          ? 'hover:border-blue-200 hover:shadow-blue-100'
                          : agent.type === 'kuhp_chat'
                          ? 'hover:border-rose-200 hover:shadow-rose-100'
                          : 'hover:border-green-200 hover:shadow-green-100'
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