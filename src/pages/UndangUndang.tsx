import { useState, useEffect } from 'react';
import { Search, BookOpen, Scale, Shield, Building2, Heart, Smartphone, Briefcase, ChevronRight, Sparkles, Users, Clock } from 'lucide-react';
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
  category: string;
  popularity?: number;
  lastUpdated?: string;
}

// Categories untuk grouping
const categories = [
  {
    id: 'pidana',
    name: 'Hukum Pidana',
    description: 'Undang-undang terkait hukum pidana dan acara pidana',
    icon: Scale,
    color: 'from-red-500 to-rose-600',
    bgColor: 'from-red-50 to-rose-50'
  },
  {
    id: 'ekonomi',
    name: 'Hukum Ekonomi',
    description: 'Regulasi sektor ekonomi dan keuangan',
    icon: Building2,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'from-blue-50 to-indigo-50'
  },
  {
    id: 'teknologi',
    name: 'Teknologi & Digital',
    description: 'Undang-undang teknologi informasi dan digital',
    icon: Smartphone,
    color: 'from-cyan-500 to-teal-600',
    bgColor: 'from-cyan-50 to-teal-50'
  },
  {
    id: 'sosial',
    name: 'Kesejahteraan Sosial',
    description: 'Regulasi kesehatan dan kesejahteraan masyarakat',
    icon: Heart,
    color: 'from-emerald-500 to-green-600',
    bgColor: 'from-emerald-50 to-green-50'
  },
  {
    id: 'ketenagakerjaan',
    name: 'Ketenagakerjaan',
    description: 'Undang-undang tenaga kerja dan investasi',
    icon: Briefcase,
    color: 'from-slate-500 to-gray-600',
    bgColor: 'from-slate-50 to-gray-50'
  }
];

export default function UndangUndang() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
      category: 'pidana',
      popularity: 95,
      lastUpdated: '2024-01-15'
    },
    {
      id: 'kuhap',
      name: 'KUHAP AI',
      description: 'Asisten AI untuk memahami Kitab Undang-Undang Hukum Acara Pidana (KUHAP)',
      icon: 'brain',
      color: 'amber',
      type: 'kuhap_chat',
      status: 'on',
      category: 'pidana',
      popularity: 88,
      lastUpdated: '2024-01-10'
    },
    {
      id: 'p2sk',
      name: 'P2SK AI',
      description: 'Asisten AI untuk memahami Undang-Undang Sektor Jasa Keuangan',
      icon: 'brain',
      color: 'blue',
      type: 'undang_chat',
      status: 'on',
      category: 'ekonomi',
      popularity: 82,
      lastUpdated: '2024-01-12'
    },
    {
      id: 'ite',
      name: 'ITE AI',
      description: 'Asisten AI untuk memahami Undang-Undang Informasi dan Transaksi Elektronik',
      icon: 'brain',
      color: 'cyan',
      type: 'ite_chat',
      status: 'on',
      category: 'teknologi',
      popularity: 90,
      lastUpdated: '2024-01-14'
    },
    {
      id: 'ciptakerja',
      name: 'Cipta Kerja AI',
      description: 'Asisten AI untuk memahami Undang-Undang Cipta Kerja',
      icon: 'brain',
      color: 'slate',
      type: 'ciptakerja_chat',
      status: 'on',
      category: 'ketenagakerjaan',
      popularity: 75,
      lastUpdated: '2024-01-08'
    },
    {
      id: 'kesehatan',
      name: 'Kesehatan AI',
      description: 'Asisten AI untuk memahami Undang-Undang Kesehatan',
      icon: 'brain',
      color: 'emerald',
      type: 'kesehatan_chat',
      status: 'on',
      category: 'sosial',
      popularity: 79,
      lastUpdated: '2024-01-11'
    },
    {
      id: 'perbankan',
      name: 'Perbankan AI',
      description: 'Asisten AI untuk memahami Undang-Undang Perbankan',
      icon: 'brain',
      color: 'indigo',
      type: 'perbankan_chat',
      status: 'on',
      category: 'ekonomi',
      popularity: 84,
      lastUpdated: '2024-01-13'
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
  }, {} as Record<string, UndangAgent[]>);

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'kuhp_chat':
      case 'kuhap_chat':
        return <Scale className="w-8 h-8" />;
      case 'undang_chat':
      case 'perbankan_chat':
        return <Building2 className="w-8 h-8" />;
      case 'ite_chat':
        return <Smartphone className="w-8 h-8" />;
      case 'kesehatan_chat':
        return <Heart className="w-8 h-8" />;
      case 'ciptakerja_chat':
        return <Briefcase className="w-8 h-8" />;
      default:
        return <BookOpen className="w-8 h-8" />;
    }
  };

  const getAgentGradient = (agentType: string) => {
    switch (agentType) {
      case 'kuhp_chat':
        return "from-rose-500 to-pink-600";
      case 'kuhap_chat':
        return "from-amber-500 to-orange-600";
      case 'undang_chat':
        return "from-blue-500 to-indigo-600";
      case 'ite_chat':
        return "from-cyan-500 to-teal-600";
      case 'ciptakerja_chat':
        return "from-slate-500 to-gray-600";
      case 'kesehatan_chat':
        return "from-emerald-500 to-green-600";
      case 'perbankan_chat':
        return "from-indigo-500 to-purple-600";
      default:
        return "from-gray-500 to-slate-600";
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
                <span className="text-white text-xs font-medium">AI Legal Assistant</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              Undang-Undang AI
            </h1>
            
            <p className="text-base text-white/90 max-w-xl">
              Pilih asisten AI untuk membantu memahami berbagai peraturan perundang-undangan
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
                placeholder="Cari undang-undang atau topik..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  !selectedCategory
                    ? 'bg-blue-600 text-white shadow-lg'
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
                      ? 'bg-blue-600 text-white shadow-lg'
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
                        onClick={() => setSelectedAgentId(agent.id)}
                        className="group cursor-pointer"
                      >
                        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200 p-6 h-full transform group-hover:-translate-y-1">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 bg-gradient-to-r ${getAgentGradient(agent.type)} rounded-xl text-white`}>
                              {getAgentIcon(agent.type)}
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-gray-500">Online</span>
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {agent.name}
                          </h3>
                          
                          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                            {agent.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-1 bg-blue-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${agent.popularity}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{agent.popularity}%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                              Mulai Chat
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                          </div>
                        </div>
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
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
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
                        onClick={() => setSelectedAgentId(agent.id)}
                        className="group cursor-pointer"
                      >
                        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200 p-6 h-full transform group-hover:-translate-y-1">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 bg-gradient-to-r ${getAgentGradient(agent.type)} rounded-xl text-white`}>
                              {getAgentIcon(agent.type)}
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-gray-500">Online</span>
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {agent.name}
                          </h3>
                          
                          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                            {agent.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-1 bg-blue-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${agent.popularity}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{agent.popularity}%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                              Mulai Chat
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                          </div>
                        </div>
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
