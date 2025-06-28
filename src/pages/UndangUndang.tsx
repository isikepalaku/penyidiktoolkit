import { useState, useEffect } from 'react';
import { Search, Scale, Sparkles } from 'lucide-react';
import AgentCard from '../components/AgentCard';
import KUHPChatPage from '../components/ui/KUHPChatPage';
import UndangChatPage from '../components/ui/UndangChatPage';
import P2SKChatPage from '../components/ui/P2SKChatPage';
import ITEChatPage from '../components/ui/ITEChatPage';
import CiptaKerjaChatPage from '../components/ui/CiptaKerjaChatPage';
import KUHAPChatPage from '../components/ui/KUHAPChatPage';
import type { ExtendedAgent } from '../types/index';

export default function UndangUndang() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const agents: ExtendedAgent[] = [
    {
      id: 'kuhp_001',
      name: 'Ahli Pidana',
      description: 'Ahli hukum AI untuk memahami Kitab Undang-Undang Hukum Pidana (KUHP)',
      type: 'kuhp_chat',
      status: 'on',
      fields: []
    },
    {
      id: 'kuhap_001',
      name: 'KUHAP AI',
      description: 'Ahli hukum AI untuk memahami Kitab Undang-Undang Hukum Acara Pidana (KUHAP)',
      type: 'kuhap_chat',
      status: 'on',
      fields: []
    },
    {
      id: 'p2sk_001',
      name: 'Ahli OJK',
      description: 'Ahli hukum AI untuk memahami regulasi Otoritas Jasa Keuangan dan sektor keuangan',
      type: 'p2sk_chat',
      status: 'on',
      fields: []
    },
    {
      id: 'ite_001',
      name: 'ITE AI',
      description: 'Ahli hukum AI untuk memahami Undang-Undang Informasi dan Transaksi Elektronik',
      type: 'ite_chat',
      status: 'on',
      fields: []
    },
    {
      id: 'ciptakerja_001',
      name: 'Cipta Kerja AI',
      description: 'Ahli hukum AI untuk memahami Undang-Undang Cipta Kerja',
      type: 'ciptakerja_chat',
      status: 'on',
      fields: []
          }
    ];

  const selectedAgentData = selectedAgentId
    ? agents.find((agent) => agent.id === selectedAgentId)
    : null;

  const handleBack = () => {
    setSelectedAgentId(null);
  };

  // Filter agents based on search only
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
      case 'p2sk_chat':
        return (
          <div className="fixed inset-0 z-20">
            <P2SKChatPage onBack={handleBack} />
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
      default:
        return null;
    }
  };

  if (selectedAgentId) {
    return renderContent();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Compact Header with Background Image */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="container mx-auto px-6 py-6 relative">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
                <Sparkles className="w-3 h-3 text-white" />
                <span className="text-white text-xs font-medium">AI Legal Expert</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              Ahli Hukum AI
            </h1>
            
            <p className="text-base text-white/90 max-w-xl">
              Konsultasi dengan ahli hukum AI untuk berbagai peraturan perundang-undangan
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari ahli hukum atau bidang hukum..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-6 pb-12">
        {filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className="cursor-pointer"
              >
                <AgentCard
                  agent={agent as ExtendedAgent}
                  popularity={Math.floor(Math.random() * 40) + 60} // Random popularity between 60-100%
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada hasil</h3>
            <p className="text-gray-500">Coba ubah kata kunci pencarian untuk menemukan ahli hukum yang sesuai.</p>
          </div>
        )}
      </div>
    </div>
  );
}
