import { PieChart, BarChart3, TrendingUp, AlertTriangle, DollarSign, FileText } from 'lucide-react';
import type { Agent, ExtendedAgent } from '../types/index';
import { getTypeDisplay } from '@/utils/utils';

interface AgentCardProps {
  agent: Agent | ExtendedAgent;
  bgColor?: string;
  className?: string;
}

export default function AgentCard({ agent, bgColor = 'bg-white', className = '' }: AgentCardProps) {
  const getAgentIcon = () => {
    // Jika agent adalah ExtendedAgent dan memiliki icon yang sudah didefinisikan
    if ('iconClassName' in agent && 'icon' in agent && agent.icon) {
      const Icon = agent.icon;
      return <Icon className={agent.iconClassName || 'text-gray-700'} size={40} />;
    }

    // Fallback ke icon berdasarkan type
    switch (agent.type) {
      case 'spkt':
        return <img src="/img/ai.svg" alt="laporan polisi" className="h-10 w-10" />;
      case 'image':
        return <img src="/img/vision.svg" alt="laporan polisi" className="h-10 w-10" />;
      case 'case_research':
        return <img src="/img/google-scholar.svg" alt="Google Scholar" className="h-10 w-10" />;
      case 'hoax_checker':
        return <img src="/img/news.svg" alt="ai hoax" className="h-10 w-10" />;
      case 'perkaba_chat':
        return <img src="/img/pdf.svg" alt="perkaba ai" className="h-10 w-10" />;
      case 'perkaba_search':
        return <img src="/img/pdf.svg" alt="perkaba ai" className="h-10 w-10" />;
      case 'bantek_chat':
        return <img src="/img/pdf.svg" alt="perkaba ai" className="h-10 w-10" />;
      case 'wassidik_chat':
        return <img src="/img/pdf.svg" alt="perkaba ai" className="h-10 w-10" />;
      case 'emp_chat':
        return <img src="/img/pdf.svg" alt="perkaba ai" className="h-10 w-10" />;
      case 'modus_kejahatan':
        return <img src="/img/moduskejahatan.svg" alt="Modus Kejahatab" className="h-10 w-10" />;
      case 'image_processor':
        return <img src="/img/maps.svg" alt="Google Scholar" className="h-10 w-10" />;
      case 'medical_image':
        return <img src="/img/dokpol.svg" alt="Dokpol Medis" className="h-10 w-10" />;
      case 'crime_trend_analyst':
        return <BarChart3 className="text-indigo-500" size={40} />;
      case 'undang_chat':
        return <img src="/img/book.svg" alt="Google Scholar" className="h-10 w-10" />;
      case 'kuhp_chat':
        return <img src="/img/book.svg" alt="Google Scholar" className="h-10 w-10" />;
      case 'ite_chat':
        return <img src="/img/book.svg" alt="Google Scholar" className="h-10 w-10" />;
      case 'sentiment_analyst':
        return <TrendingUp className="text-purple-500" size={40} />;
      case 'tipidkor_chat':
        return <img src="/img/bareskrim.svg" alt="Tipidkor ai" className="h-10 w-10" />;
      case 'tipidter_chat':
        return <img src="/img/bareskrim.svg" alt="Tipidter ai" className="h-10 w-10" />;
      case 'tipikor_analyst':
        return <img src="/img/pngegg.png" alt="tipidkor analyst" className="h-10 w-10" />;
      case 'ciptakerja_chat':
        return <img src="/img/book.svg" alt="Google Scholar" className="h-10 w-10" />;
      case 'kesehatan_chat':
        return <img src="/img/book.svg" alt="Google Scholar" className="h-10 w-10" />;
      case 'penyidik_chat':
        return <img src="/img/bareskrim.svg" alt="Tipidkor ai" className="h-10 w-10" />;
      case 'fismondev_chat':
        return <img src="/img/bareskrim.svg" alt="Fismondev AI" className="h-10 w-10" />;
      case 'siber_chat':
        return <img src="/img/siber.svg" alt="Siber AI" className="h-10 w-10" />;
      case 'perbankan_chat':
        return <img src="/img/book.svg" alt="Perbankan" className="h-10 w-10" />;
      default:
        // Jika agent memiliki icon sebagai string
        if (agent.icon === 'brain') {
          return <img src="/img/ai.svg" alt="AI" className="h-10 w-10" />;
        } else if (agent.icon === 'dollar') {
          return <DollarSign className="text-blue-600" size={40} />;
        } else if (agent.icon === 'shield') {
          return <img src="/img/bareskrim.svg" alt="Shield" className="h-10 w-10" />;
        } else if (agent.icon === 'file-text') {
          return <FileText className="text-green-600" size={40} />;
        } else if (agent.icon === 'alert-triangle') {
          return <AlertTriangle className="text-orange-600" size={40} />;
        }
        return <PieChart className="text-gray-500" size={24} />;
    }
  };

  // Render khusus untuk agen UU
  if (agent.type === 'undang_chat' || agent.type === 'kuhp_chat' || agent.type === 'ciptakerja_chat' || agent.type === 'kesehatan_chat' || agent.type === 'perbankan_chat') {
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
        
        {/* Display warning if exists */}
        {'warning' in agent && agent.warning && (
          <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
            <AlertTriangle className="text-amber-500 h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-amber-700 text-xs">{agent.warning}</p>
          </div>
        )}
        </div>
        <div className="flex items-center gap-2 mt-auto">
          <span className="px-3 py-1 bg-white/80 text-blue-600 rounded-full text-sm font-medium">
            {agent.type === 'undang_chat' ? 'UU P2SK' : 
             agent.type === 'kuhp_chat' ? 'KUHP' : 
             agent.type === 'kesehatan_chat' ? 'UU Kesehatan' :
             agent.type === 'perbankan_chat' ? 'UU Perbankan' :
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
            <div>
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
        
        {/* Display warning if exists */}
        {'warning' in agent && agent.warning && (
          <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
            <AlertTriangle className="text-amber-500 h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-amber-700 text-xs">{agent.warning}</p>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 mt-auto">
        <span className="px-3 py-1 bg-white/80 text-blue-600 rounded-full text-sm font-medium">
          Analisis {getTypeDisplay(agent.type)}
        </span>
      </div>
    </div>
  );
}
