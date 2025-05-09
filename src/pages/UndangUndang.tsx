import { useState, useEffect } from 'react';
import AgentCard from '../components/AgentCard';
import KUHPChatPage from '../components/ui/KUHPChatPage';
import UndangChatPage from '../components/ui/UndangChatPage';
import ITEChatPage from '../components/ui/ITEChatPage';
import CiptaKerjaChatPage from '../components/ui/CiptaKerjaChatPage';
import KesehatanChatPage from '../components/ui/KesehatanChatPage';
import PerbankanChatPage from '../components/ui/PerbankanChatPage';
import KUHAPChatPage from '../components/ui/KUHAPChatPage';

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
      id: 'kuhap',
      name: 'KUHAP AI',
      description: 'Asisten AI untuk memahami Kitab Undang-Undang Hukum Acara Pidana (KUHAP)',
      icon: 'brain',
      color: 'amber',
      type: 'kuhap_chat',
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
      case 'kuhap_chat':
        return (
          <div className="fixed inset-0 z-20">
            <KUHAPChatPage onBack={handleBack} />
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
    <div className="container mx-auto px-4 py-12">
      {selectedAgentId ? (
        renderContent()
      ) : (
        <>
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Undang-Undang AI</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Pilih Asisten AI untuk membantu Anda memahami berbagai peraturan perundang-undangan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className="cursor-pointer rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out overflow-hidden"
              >
                <AgentCard
                  agent={agent as any}
                  bgColor={
                    agent.type === 'kuhp_chat'
                      ? "bg-gradient-to-br from-rose-50 to-orange-50"
                      : agent.type === 'kuhap_chat'
                      ? "bg-gradient-to-br from-amber-50 to-yellow-50"
                      : agent.type === 'undang_chat'
                      ? "bg-gradient-to-br from-blue-50 to-indigo-50"
                      : agent.type === 'ite_chat'
                      ? "bg-gradient-to-br from-cyan-50 to-sky-50"
                      : agent.type === 'ciptakerja_chat'
                      ? "bg-gradient-to-br from-slate-50 to-gray-50"
                      : agent.type === 'kesehatan_chat'
                      ? "bg-gradient-to-br from-emerald-50 to-green-50"
                      : agent.type === 'perbankan_chat'
                      ? "bg-gradient-to-br from-indigo-50 to-purple-50"
                      : "bg-gradient-to-br from-gray-50 to-slate-50"
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
