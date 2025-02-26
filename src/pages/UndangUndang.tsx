import { useState, useEffect } from 'react';
import AgentCard from '../components/AgentCard';
import ChatInterface from '../components/ChatInterface';
import { ArrowLeft } from 'lucide-react';
import { sendChatMessage as sendUndangChatMessage } from '../services/undangService';
import { sendChatMessage as sendKuhpChatMessage } from '../services/kuhpService';
import { sendChatMessage as sendIteChatMessage } from '../services/iteService';
import { sendChatMessage as sendFidusiaChatMessage } from '../services/fidusiaService';
import { sendChatMessage as sendCiptakerjaChatMessage } from '../services/ciptakerjaService';
import { sendChatMessage as sendKesehatanChatMessage } from '../services/kesehatanService';
import { DotBackground } from '@/components/ui/DotBackground';
import { Agent, AgentType } from '@/types';

export default function UndangUndang() {
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
      name: 'Ai Tipidkor',
      description: 'Agen ai untuk Penelitian tindak pidana korupsi secara khusus',
      type: 'tipidkor_chat' as AgentType,
      status: 'on',
      icon: 'brain',
      color: 'blue'
    },
    {
      id: 'ciptakerja_chat',
      name: 'Cipta Kerja',
      description: 'Agen ai spesialisasi UU Cipta Kerja untuk memahami regulasi ketenagakerjaan dan iklim usaha',
      type: 'ciptakerja_chat' as AgentType,
      status: 'on',
      icon: 'brain',
      color: 'blue'
    },
    {
      id: 'kesehatan_chat',
      name: 'UU Kesehatan',
      description: 'Agen ai spesialisasi UNDANG-UNDANG REPUBLIK INDONESIA NOMOR 17 TAHUN 2023 TENTANG KESEHATAN',
      type: 'kesehatan_chat' as AgentType,
      status: 'on',
      icon: 'brain',
      color: 'green'
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
      case 'undang_chat':
        return <ChatInterface sendMessage={sendUndangChatMessage} />;
      case 'kuhp_chat':
        return <ChatInterface sendMessage={sendKuhpChatMessage} />;
      case 'ite_chat':
        return <ChatInterface sendMessage={sendIteChatMessage} />;
      case 'tipidkor_chat':
        return <ChatInterface sendMessage={sendFidusiaChatMessage} />;
      case 'ciptakerja_chat':
        return <ChatInterface sendMessage={sendCiptakerjaChatMessage} />;
      case 'kesehatan_chat':
        return <ChatInterface sendMessage={sendKesehatanChatMessage} />;
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
                          : agent.type === 'ciptakerja_chat'
                          ? 'bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100'
                          : agent.type === 'ite_chat'
                          ? 'bg-gradient-to-br from-cyan-50 to-sky-50 hover:from-cyan-100 hover:to-sky-100'
                          : agent.type === 'kesehatan_chat'
                          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100'
                          : 'bg-gradient-to-br from-green-50 to-lime-50 hover:from-green-100 hover:to-lime-100'
                      }
                      className={`
                        border border-transparent
                        ${agent.type === 'undang_chat' 
                          ? 'hover:border-blue-200 hover:shadow-blue-100'
                          : agent.type === 'kuhp_chat'
                          ? 'hover:border-rose-200 hover:shadow-rose-100'
                          : agent.type === 'ciptakerja_chat'
                          ? 'hover:border-slate-200 hover:shadow-slate-100'
                          : agent.type === 'ite_chat'
                          ? 'hover:border-cyan-200 hover:shadow-cyan-100'
                          : agent.type === 'kesehatan_chat'
                          ? 'hover:border-emerald-200 hover:shadow-emerald-100'
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
