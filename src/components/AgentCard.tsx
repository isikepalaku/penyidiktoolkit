import { Brain, User, TestTube, PieChart, Image, ClipboardList, FileText } from 'lucide-react';
import type { Agent } from '../types/index';
import { getTypeDisplay } from '../utils/agentUtils';

export default function AgentCard({ agent }: { agent: Agent }) {
  const getAgentIcon = () => {
    switch (agent.type) {
      case 'spkt':
        return <FileText className="text-green-500" size={24} />;
      case 'image':
        return <Image className="text-indigo-500" size={24} />;
      case 'witness':
        return <User className="text-blue-500" size={24} />;
      case 'behavioral':
        return <Brain className="text-amber-500" size={24} />;
      case 'forensic':
        return <TestTube className="text-purple-500" size={24} />;
      case 'report':
        return <ClipboardList className="text-green-500" size={24} />;
      default:
        return <PieChart className="text-gray-500" size={24} />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
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
        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
          Analisis {getTypeDisplay(agent.type)}
        </span>
      </div>
    </div>
  );
}