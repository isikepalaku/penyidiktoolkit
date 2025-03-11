import { useState, useEffect } from 'react';
import AgentCard from '../components/AgentCard';
import KUHPChatPage from '../components/ui/KUHPChatPage';
import UndangChatPage from '../components/ui/UndangChatPage';
import ITEChatPage from '../components/ui/ITEChatPage';
import CiptaKerjaChatPage from '../components/ui/CiptaKerjaChatPage';
import KesehatanChatPage from '../components/ui/KesehatanChatPage';
import PerbankanChatPage from '../components/ui/PerbankanChatPage';

// Definisikan tipe untuk agent di UndangUndang
interface UndangAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: string;
  status: string;
}

export default function UndangUndang() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (selectedAgentId) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (selectedAgentId) {
        e.preventDefault();
        if (confirm('Yakin ingin keluar? Percakapan akan hilang.')) {
          setSelectedAgentId(null);
        } else {
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedAgentId]);

  const agents: UndangAgent[] = [
    {
      id: 'kuhp',
      name: 'KUHP AI',
      description: 'Asisten AI untuk memahami Kitab Undang-Undang Hukum Pidana (KUHP)',
      icon: 'brain',
      color: 'rose',
      type: 'kuhp_chat',
      status: 'on',
    },
    {
      id: 'p2sk',
      name: 'P2SK AI',
      description: 'Asisten AI untuk memahami Undang-Undang Sektor Jasa Keuangan',
      icon: 'brain',
      color: 'blue',
      type: 'undang_chat',
      status: 'on',
    },
    {
      id: 'ite',
      name: 'ITE AI',
      description: 'Asisten AI untuk memahami Undang-Undang Informasi dan Transaksi Elektronik',
      icon: 'brain',
      color: 'cyan',
      type: 'ite_chat',
      status: 'on',
    },
    {
      id: 'ciptakerja',
      name: 'Cipta Kerja AI',
      description: 'Asisten AI untuk memahami Undang-Undang Cipta Kerja',
      icon: 'brain',
      color: 'slate',
      type: 'ciptakerja_chat',
      status: 'on',
    },
    {
      id: 'kesehatan',
      name: 'Kesehatan AI',
      description: 'Asisten AI untuk memahami Undang-Undang Kesehatan',
      icon: 'brain',
      color: 'emerald',
      type: 'kesehatan_chat',
      status: 'on',
    },
    {
      id: 'perbankan',
      name: 'Perbankan AI',
      description: 'Asisten AI untuk memahami Undang-Undang Perbankan',
      icon: 'brain',
      color: 'indigo',
      type: 'perbankan_chat',
      status: 'on',
    }
  ];

  const selectedAgentData = selectedAgentId
    ? agents.find((agent) => agent.id === selectedAgentId)
    : null;

  const handleBack = () => {
    if (window.confirm('Yakin ingin kembali? Percakapan akan hilang.')) {
      setSelectedAgentId(null);
    }
  };

  const renderContent = () => {
    if (!selectedAgentData) return null;

    switch (selectedAgentData.type) {
      case 'kuhp_chat':
        return (
          <div className="fixed inset-0 z-20">
            <KUHPChatPage onBack={handleBack} />
          </div>
        );
      case 'undang_chat':
        return (
          <div className="fixed inset-0 z-20">
            <UndangChatPage onBack={handleBack} />
          </div>
        );
      case 'ite_chat':
        return (
          <div className="fixed inset-0 z-20">
            <ITEChatPage onBack={handleBack} />
          </div>
        );
      case 'ciptakerja_chat':
        return (
          <div className="fixed inset-0 z-20">
            <CiptaKerjaChatPage onBack={handleBack} />
          </div>
        );
      case 'kesehatan_chat':
        return (
          <div className="fixed inset-0 z-20">
            <KesehatanChatPage onBack={handleBack} />
          </div>
        );
      case 'perbankan_chat':
        return (
          <div className="fixed inset-0 z-20">
            <PerbankanChatPage onBack={handleBack} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {selectedAgentId ? (
        renderContent()
      ) : (
        <>
          <div className="flex items-center mb-6">
            <h1 className="text-2xl font-bold">Undang-Undang AI</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className="cursor-pointer"
              >
                <AgentCard
                  agent={agent as any}
                  bgColor={
                    agent.type === 'kuhp_chat'
                      ? "bg-gradient-to-br from-rose-50 to-orange-50 hover:from-rose-100 hover:to-orange-100"
                      : agent.type === 'undang_chat'
                      ? "bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100"
                      : agent.type === 'ite_chat'
                      ? "bg-gradient-to-br from-cyan-50 to-sky-50 hover:from-cyan-100 hover:to-sky-100"
                      : agent.type === 'ciptakerja_chat'
                      ? "bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100"
                      : agent.type === 'kesehatan_chat'
                      ? "bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100"
                      : agent.type === 'perbankan_chat'
                      ? "bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100"
                      : "bg-gradient-to-br from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100"
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
