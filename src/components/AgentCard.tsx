import { Brain, User, PieChart, Image, FileText, MessageSquare, Search, Database, Target, MapPin, BarChart3, Scale, Gavel, BookOpen, TrendingUp, ScrollText, Heart } from 'lucide-react';
import type { Agent } from '../types/index';
import { getTypeDisplay } from '@/utils/utils';

interface AgentCardProps {
  agent: Agent;
  bgColor?: string;
  className?: string;
}

export default function AgentCard({ agent, bgColor = 'bg-white', className = '' }: AgentCardProps) {
  const getAgentIcon = () => {
    switch (agent.type) {
      case 'spkt':
        return <FileText className="text-green-500" size={24} />;
      case 'image':
        return <Image className="text-indigo-500" size={24} />;
      case 'case_research':
        return <User className="text-blue-500" size={24} />;
      case 'hoax_checker':
        return <Brain className="text-amber-500" size={24} />;
      case 'perkaba_chat':
        return <MessageSquare className="text-purple-500" size={24} />;
      case 'perkaba_search':
        return <Search className="text-cyan-500" size={24} />;
      case 'bantek_chat':
        return <MessageSquare className="text-blue-500" size={24} />;
      case 'wassidik_chat':
        return <MessageSquare className="text-green-500" size={24} />;
      case 'emp_chat':
        return <Database className="text-amber-500" size={24} />;
      case 'modus_kejahatan':
        return <Target className="text-red-500" size={24} />;
      case 'image_processor':
        return <MapPin className="text-blue-500" size={24} />;
      case 'crime_trend_analyst':
        return <BarChart3 className="text-indigo-500" size={24} />;
      case 'undang_chat':
        return <Scale className="text-blue-500" size={24} />;
      case 'kuhp_chat':
        return <Gavel className="text-rose-500" size={24} />;
      case 'ite_chat':
        return <BookOpen className="text-green-500" size={24} />;
      case 'sentiment_analyst':
        return <TrendingUp className="text-purple-500" size={24} />;
      case 'tipidkor_chat':
        return <Scale className="text-indigo-500" size={24} />;
      case 'tipikor_analyst':
        return <Scale className="text-rose-600" size={24} />;
      case 'ciptakerja_chat':
        return <ScrollText className="text-gray-700" size={24} />;
      case 'kesehatan_chat':
        return <Heart className="text-emerald-500" size={24} />;
      default:
        return <PieChart className="text-gray-500" size={24} />;
    }
  };

  // Render khusus untuk agen UU
  if (agent.type === 'undang_chat' || agent.type === 'kuhp_chat' || agent.type === 'ciptakerja_chat' || agent.type === 'kesehatan_chat') {
    return (
      <div className={`${bgColor} rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 group h-[200px] flex flex-col justify-between ${className}`}>
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/80 rounded-lg group-hover:bg-white transition-colors">
                {getAgentIcon()}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{agent.name}</h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              agent.status === 'on' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {agent.status === 'on' ? 'Online' : 'Bekerja'}
            </span>
          </div>
          <p className="text-gray-600 mb-3 line-clamp-2 text-sm">{agent.description}</p>
        </div>
        <div className="flex items-center gap-2 mt-auto">
          <span className="px-3 py-1 bg-white/80 text-blue-600 rounded-full text-sm font-medium">
            {agent.type === 'undang_chat' ? 'UU P2SK' : 
             agent.type === 'kuhp_chat' ? 'KUHP' : 
             agent.type === 'kesehatan_chat' ? 'UU Kesehatan' :
             'UU Cipta Kerja'}
          </span>
        </div>
      </div>
    );
  }

  // Render untuk agen lainnya (tampilan original)
  return (
    <div className={`${bgColor} rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 group h-[200px] flex flex-col justify-between`}>
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/80 rounded-lg group-hover:bg-white transition-colors">
              {getAgentIcon()}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{agent.name}</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            agent.status === 'on' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {agent.status === 'on' ? 'Online' : 'Bekerja'}
          </span>
        </div>
        
        <p className="text-gray-600 mb-3 line-clamp-2 text-sm">{agent.description}</p>
      </div>
      
      <div className="flex items-center gap-2 mt-auto">
        <span className="px-3 py-1 bg-white/80 text-blue-600 rounded-full text-sm font-medium">
          Analisis {getTypeDisplay(agent.type)}
        </span>
      </div>
    </div>
  );
}