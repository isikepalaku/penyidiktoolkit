import { Brain, User, PieChart, Image, FileText, MessageSquare, Search, Database } from 'lucide-react';
import type { Agent } from '../types/index';
import { getTypeDisplay } from '@/utils/utils';

interface AgentCardProps {
  agent: Agent;
  bgColor?: string;
}

export default function AgentCard({ agent, bgColor = 'bg-white' }: AgentCardProps) {
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
      default:
        return <PieChart className="text-gray-500" size={24} />;
    }
  };

  return (
    <div className={`${bgColor} rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 group`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/80 rounded-lg group-hover:bg-white transition-colors">
            {getAgentIcon()}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          agent.status === 'on' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {agent.status === 'on' ? 'Siap' : 'Bekerja'}
        </span>
      </div>
      
      <p className="text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
      
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 bg-white/80 text-blue-600 rounded-full text-sm font-medium">
          Analisis {getTypeDisplay(agent.type)}
        </span>
      </div>
    </div>
  );
}