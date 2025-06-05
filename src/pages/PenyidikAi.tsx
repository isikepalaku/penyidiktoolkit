import { useState, useEffect } from 'react';
import { Search, Shield, Users, Pill, User, ChevronRight, Sparkles, Target } from 'lucide-react';
import AgentCard from '@/components/AgentCard';
import { penyidikAiAgent } from '@/data/agents/penyidikAiAgent';
import { tipidkorAiAgent } from '@/data/agents/tipidkorAiAgent';
import { fismondevAgent } from '@/data/agents/fismondevAgent';
import { siberAgent } from '@/data/agents/siberAgent';
import { tipidterAiAgent } from '@/data/agents/tipidterAiAgent';
import { narkotikaAgent } from '@/data/agents/narkotikaAgent';
import { ppaPpoAgent } from '@/data/agents/ppaPpoAgent';
import { reskrimumAgent } from '@/data/agents/reskrimumAgent';
import SiberChatPage from '@/components/ui/SiberChatPage';
import FismondevChatPage from '@/components/ui/FismondevChatPage';
import IndagsiChatPage from '@/components/ui/IndagsiChatPage';
import TipidkorChatPage from '@/components/ui/TipidkorChatPage';
import TipidterChatPage from '@/components/ui/TipidterChatPage';
import NarkotikaChatPage from '@/components/ui/NarkotikaChatPage';
import PpaPpoChatPage from '@/components/ui/PpaPpoChatPage';
import ReskrimumChatPage from '@/components/ui/ReskrimumChatPage';
import WassidikPenyidikChatPage from '@/components/ui/WassidikPenyidikChatPage';
import { wassidikPenyidikAgent } from '@/data/agents/wassidikPenyidikAgent';

// Key untuk menyimpan data di localStorage
const SELECTED_AGENT_KEY = 'penyidikai-selected-agent';

// Definisikan tipe untuk agent di PenyidikAi
interface PenyidikAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: string;
  status: string;
  category: string;
  popularity?: number;
  lastUpdated?: string;
}

// Categories untuk grouping
const categories = [
  {
    id: 'khusus',
    name: 'Tindak Pidana Khusus',
    description: 'Asisten Penyidik tindak pidana khusus (Lex Specialis)',
    icon: Shield,
    color: 'from-purple-500 to-indigo-600',
    bgColor: 'from-purple-50 to-indigo-50'
  },
  {
    id: 'umum',
    name: 'Tindak Pidana Umum',
    description: 'Asisten Penyidik tindak pidana Umum (Lex Generalis)',
    icon: Users,
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'from-blue-50 to-cyan-50'
  },
  {
    id: 'narkotika',
    name: 'Tindak Pidana Narkotika',
    description: 'Penanganan khusus kasus narkotika dan obat-obatan terlarang',
    icon: Pill,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'from-amber-50 to-orange-50'
  },
  {
    id: 'internal',
    name: 'Internal',
    description: 'Pengawasan internal dan audit kepatuhan institusi',
    icon: User,
    color: 'from-teal-500 to-emerald-600',
    bgColor: 'from-teal-50 to-emerald-50'
  }
];

export default function PenyidikAi() {
  // Menggunakan localStorage untuk mempertahankan status saat reload
  const [selectedAgent, setSelectedAgent] = useState<string | null>(() => {
    try {
      // Gunakan URL parameter untuk memeriksa apakah ini adalah navigasi langsung ke halaman
      const urlParams = new URLSearchParams(window.location.search);
      const isDirectNavigation = urlParams.get('direct') === 'true';
      
      // Jika ini adalah navigasi langsung ke halaman (bukan dari dalam aplikasi),
      // hapus data agent yang tersimpan dan mulai dari halaman pilihan
      if (!isDirectNavigation) {
        localStorage.removeItem(SELECTED_AGENT_KEY);
        return null;
      }
      
      // Jika ini navigasi internal, ambil data dari localStorage
      const savedAgent = localStorage.getItem(SELECTED_AGENT_KEY);
      return savedAgent ? savedAgent : null;
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Simpan selectedAgent ke localStorage setiap kali nilainya berubah
  useEffect(() => {
    try {
      if (selectedAgent) {
        localStorage.setItem(SELECTED_AGENT_KEY, selectedAgent);
        
        // Tambahkan parameter direct=true ke URL saat agent dipilih
        const url = new URL(window.location.href);
        url.searchParams.set('direct', 'true');
        window.history.replaceState({}, '', url.toString());
      } else {
        localStorage.removeItem(SELECTED_AGENT_KEY);
        
        // Hapus parameter direct dari URL saat kembali ke halaman pilihan
        const url = new URL(window.location.href);
        url.searchParams.delete('direct');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [selectedAgent]);

  // Tambahkan error boundary state
  const [hasError, setHasError] = useState(false);

  // Error boundary untuk menangkap error yang tidak tertangani
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setHasError(true);
      // Jangan reload otomatis, biarkan user yang memilih untuk refresh
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

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

  const agents: PenyidikAgent[] = [
    {
      id: penyidikAiAgent.id,
      name: penyidikAiAgent.name,
      description: penyidikAiAgent.description,
      type: penyidikAiAgent.type,
      status: penyidikAiAgent.status,
      color: 'purple',
      icon: 'brain',
      category: 'khusus',
      popularity: 95,
      lastUpdated: '2024-01-15'
    },
    {
      id: tipidkorAiAgent.id,
      name: tipidkorAiAgent.name,
      description: tipidkorAiAgent.description,
      type: tipidkorAiAgent.type,
      status: tipidkorAiAgent.status,
      color: 'blue',
      icon: 'shield',
      category: 'khusus',
      popularity: 92,
      lastUpdated: '2024-01-14'
    },
    {
      id: fismondevAgent.id,
      name: fismondevAgent.name,
      description: fismondevAgent.description,
      type: fismondevAgent.type,
      status: fismondevAgent.status,
      color: 'green',
      icon: 'dollar',
      category: 'khusus',
      popularity: 88,
      lastUpdated: '2024-01-13'
    },
    {
      id: siberAgent.id,
      name: siberAgent.name,
      description: siberAgent.description,
      type: siberAgent.type,
      status: siberAgent.status,
      color: 'cyan',
      icon: 'shield',
      category: 'khusus',
      popularity: 90,
      lastUpdated: '2024-01-12'
    },
    {
      id: tipidterAiAgent.id,
      name: tipidterAiAgent.name,
      description: tipidterAiAgent.description,
      type: tipidterAiAgent.type,
      status: tipidterAiAgent.status,
      color: 'orange',
      icon: 'alert-triangle',
      category: 'khusus',
      popularity: 85,
      lastUpdated: '2024-01-11'
    },
    {
      id: narkotikaAgent.id,
      name: narkotikaAgent.name,
      description: narkotikaAgent.description,
      type: narkotikaAgent.type,
      status: narkotikaAgent.status,
      color: 'amber',
      icon: 'pill',
      category: 'narkotika',
      popularity: 87,
      lastUpdated: '2024-01-10'
    },
    {
      id: ppaPpoAgent.id,
      name: ppaPpoAgent.name,
      description: ppaPpoAgent.description,
      type: ppaPpoAgent.type,
      status: ppaPpoAgent.status,
      color: 'pink',
      icon: 'users',
      category: 'umum',
      popularity: 83,
      lastUpdated: '2024-01-09'
    },
    {
      id: reskrimumAgent.id,
      name: reskrimumAgent.name,
      description: reskrimumAgent.description,
      type: reskrimumAgent.type,
      status: reskrimumAgent.status,
      color: 'indigo',
      icon: 'file-text',
      category: 'umum',
      popularity: 80,
      lastUpdated: '2024-01-08'
    },
    {
      id: wassidikPenyidikAgent.id,
      name: wassidikPenyidikAgent.name,
      description: wassidikPenyidikAgent.description,
      type: wassidikPenyidikAgent.type,
      status: wassidikPenyidikAgent.status,
      color: 'teal',
      icon: 'user',
      category: 'internal',
      popularity: 78,
      lastUpdated: '2024-01-07'
    }
  ];

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  // Filter agents based on search and category
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || agent.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group agents by category
  const agentsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = filteredAgents.filter(agent => agent.category === category.id);
    return acc;
  }, {} as Record<string, PenyidikAgent[]>);



  const handleBack = () => {
    // Pesan tersimpan otomatis, tidak perlu konfirmasi
    setSelectedAgent(null);
  };



  // Render error state jika terjadi error
  if (hasError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="max-w-md p-6 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Terjadi Kesalahan</h2>
          <p className="mb-4">Maaf, terjadi kesalahan dalam aplikasi. Ini mungkin disebabkan oleh masalah koneksi atau server.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!selectedAgentData) return null;

    try {
      switch (selectedAgentData.type) {
        case 'penyidik_chat':
          return (
            <div className="fixed inset-0 z-20">
              <IndagsiChatPage onBack={handleBack} />
            </div>
          );
        case 'tipidkor_chat':
          return (
            <div className="fixed inset-0 z-20">
              <TipidkorChatPage onBack={handleBack} />
            </div>
          );
        case 'fismondev_chat':
          return (
            <div className="fixed inset-0 z-20">
              <FismondevChatPage onBack={handleBack} />
            </div>
          );
        case 'siber_chat':
          return (
            <div className="fixed inset-0 z-20">
              <SiberChatPage onBack={handleBack} />
            </div>
          );
        case 'tipidter_chat':
          return (
            <div className="fixed inset-0 z-20">
              <TipidterChatPage onBack={handleBack} />
            </div>
          );
        case 'narkotika_chat':
          return (
            <div className="fixed inset-0 z-20">
              <NarkotikaChatPage onBack={handleBack} />
            </div>
          );
        case 'ppa_ppo_chat':
          return (
            <div className="fixed inset-0 z-20">
              <PpaPpoChatPage onBack={handleBack} />
            </div>
          );
        case 'reskrimum_chat':
          return (
            <div className="fixed inset-0 z-20">
              <ReskrimumChatPage onBack={handleBack} />
            </div>
          );
        case 'wassidik_penyidik_chat':
          return (
            <div className="fixed inset-0 z-20">
              <WassidikPenyidikChatPage onBack={handleBack} />
            </div>
          );
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering chat page:', error);
      setHasError(true);
      return (
        <div className="p-8 bg-red-50 rounded-lg">
          <h3 className="text-lg font-medium text-red-800">Terjadi kesalahan saat memuat chat</h3>
          <p className="mt-2 text-sm text-red-700">
            Silakan coba kembali ke halaman utama dan pilih agen lagi.
          </p>
        </div>
      );
    }
  };

  if (selectedAgent) {
    return renderContent();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Compact Header with Background Image */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="container mx-auto px-6 py-6 relative">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
                <Sparkles className="w-3 h-3 text-white" />
                <span className="text-white text-xs font-medium">AI Investigation Assistant</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              Penyidik AI
            </h1>
            
            <p className="text-base text-white/90 max-w-xl">
              AI Assistant untuk membantu proses penyidikan dengan menyediakan analisis dan insight yang mendalam
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari asisten AI atau topik..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  !selectedCategory
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Semua Kategori
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-6 pb-12">
        {selectedCategory ? (
          // Show selected category
          (() => {
            const category = categories.find(c => c.id === selectedCategory);
            const categoryAgents = agentsByCategory[selectedCategory] || [];
            
            if (!category) return null;

            return (
              <div className="space-y-8">
                {/* Category Header */}
                <div className={`bg-gradient-to-r ${category.bgColor} rounded-2xl p-8 border border-white/50`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 bg-gradient-to-r ${category.color} rounded-xl text-white`}>
                      <category.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">{category.name}</h2>
                      <p className="text-gray-600 mt-1">{category.description}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {categoryAgents.length} AI Assistant tersedia
                  </div>
                </div>

                {/* Category Agents */}
                {categoryAgents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryAgents.map((agent) => (
                      <div
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent.id)}
                        className="cursor-pointer"
                      >
                        <AgentCard 
                          agent={agent as any}
                          popularity={agent.popularity}
                          lastUpdated={agent.lastUpdated}
                          className="hover:-translate-y-1"
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
                    <p className="text-gray-500">Coba ubah kata kunci pencarian atau pilih kategori lain.</p>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          // Show all categories
          <div className="space-y-12">
            {categories.map((category) => {
              const categoryAgents = agentsByCategory[category.id] || [];
              if (categoryAgents.length === 0) return null;

              return (
                <div key={category.id} className="space-y-6">
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 bg-gradient-to-r ${category.color} rounded-xl text-white`}>
                        <category.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                        <p className="text-gray-600">{category.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCategory(category.id)}
                      className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                    >
                      Lihat Semua
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Category Agents */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryAgents.slice(0, 3).map((agent) => (
                      <div
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent.id)}
                        className="cursor-pointer"
                      >
                        <AgentCard 
                          agent={agent as any}
                          popularity={agent.popularity}
                          lastUpdated={agent.lastUpdated}
                          className="hover:-translate-y-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
