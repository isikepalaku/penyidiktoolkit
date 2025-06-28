import { BarChart3, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';
import type { Agent, ExtendedAgent } from '../types/index';

interface AgentCardProps {
  agent: Agent | ExtendedAgent;
  bgColor?: string;
  className?: string;
  popularity?: number;
}

export default function AgentCard({ agent, bgColor = '', className = '', popularity = 0 }: AgentCardProps) {
  

  const getAgentIcon = () => {
    switch (agent.type) {
      case 'spkt':
        return <img src="/img/ai.svg" alt="laporan polisi" className="h-12 w-12" />;
      case 'image':
        return <img src="/img/vision.svg" alt="laporan polisi" className="h-12 w-12" />;
      case 'case_research':
        return <img src="/img/google-scholar.svg" alt="Google Scholar" className="h-12 w-12" />;
      case 'hoax_checker':
        return <img src="/img/news.svg" alt="ai hoax" className="h-12 w-12" />;
      case 'perkaba_chat':
        return <img src="/img/pdf.svg" alt="perkaba ai" className="h-12 w-12" />;
      case 'perkaba_search':
        return <img src="/img/pdf.svg" alt="perkaba ai" className="h-12 w-12" />;
      case 'bantek_chat':
        return <img src="/img/pdf.svg" alt="perkaba ai" className="h-12 w-12" />;
      case 'wassidik_chat':
        return <img src="/img/pdf.svg" alt="perkaba ai" className="h-12 w-12" />;
            case 'emp_chat':
        return <img src="/img/pdf.svg" alt="perkaba ai" className="h-12 w-12" />;
      case 'image_processor':
        return <img src="/img/maps.svg" alt="Google Scholar" className="h-12 w-12" />;
      case 'medical_image':
        return <img src="/img/dokpol.svg" alt="Dokpol Medis" className="h-12 w-12" />;
      case 'crime_trend_analyst':
        return <BarChart3 className="text-gray-600" size={32} />;
      case 'undang_chat':
        return <img src="/img/book.svg" alt="Google Scholar" className="h-12 w-12" />;
      case 'kuhp_chat':
        return <img src="/img/ahli.svg" alt="Ahli Pidana" className="h-12 w-12" />;
      case 'kuhap_chat':
        return <img src="/img/book.svg" alt="KUHAP AI" className="h-12 w-12" />;
      case 'ite_chat':
        return <img src="/img/book.svg" alt="Google Scholar" className="h-12 w-12" />;
      case 'sentiment_analyst':
        return <TrendingUp className="text-gray-600" size={32} />;
      case 'tipidkor_chat':
        return <img src="/img/bareskrim.svg" alt="Tipidkor ai" className="h-12 w-12" />;
      case 'tipikor_analyst':
        return <img src="/img/pngegg.png" alt="tipidkor analyst" className="h-12 w-12" />;
            case 'ciptakerja_chat':
        return <img src="/img/book.svg" alt="Google Scholar" className="h-12 w-12" />;
      case 'penyidik_chat':
        return <img src="/img/bareskrim.svg" alt="Tipidkor ai" className="h-12 w-12" />;
      case 'siber_chat':
        return <img src="/img/siber.svg" alt="Siber AI" className="h-12 w-12" />;
      case 'wassidik_penyidik_chat':
        return <img src="/img/wassidik.svg" alt="Wassidik AI" className="h-12 w-12" />;
      case 'fismondev_chat':
        return <img src="/img/bareskrim.svg" alt="Fismondev AI" className="h-12 w-12" />;
            case 'tipidter_chat':
        return <img src="/img/bareskrim.svg" alt="Tipidter AI" className="h-12 w-12" />;
      case 'narkotika_chat':
        return <img src="/img/narkoba.svg" alt="Narkotika AI" className="h-12 w-12" />;
      case 'ppa_ppo_chat':
        return <img src="/img/krimum.svg" alt="PPA PPO AI" className="h-12 w-12" />;
      case 'reskrimum_chat':
        return <img src="/img/krimum.svg" alt="Reskrimum AI" className="h-12 w-12" />;
      case 'encyclopedia_police':
        return <img src="/img/Wikipedia.svg" alt="Encyclopedia" className="h-12 w-12" />;
      case 'laporan_intelejen':
        return <img src="/img/LOGO_INTELKAM_POLRI.svg" alt="Intelkam Polri" className="h-12 w-12" />;
      case 'p2sk_chat':
        return <img src="/img/ojk.svg" alt="OJK" className="h-12 w-12" />;
    }
  };

  return (
    <div className={`${bgColor} ${className} group cursor-pointer`}>
      <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200 p-6 h-full transform group-hover:-translate-y-1">
        
        {/* Icon and Status Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
              {getAgentIcon()}
            </div>
            {/* Professional status badge */}
            <div className={`absolute -top-1 -right-1 w-4 h-4 ${
              agent.status === 'on' ? 'bg-green-500' : 'bg-gray-400'
            } rounded-full border-2 border-white shadow-sm`}></div>
          </div>
          
          {/* Modern status badge */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
            <div className={`w-1.5 h-1.5 ${agent.status === 'on' ? 'bg-green-500' : 'bg-gray-400'} rounded-full`}></div>
            <span className="text-xs font-medium text-gray-600">
              {agent.status === 'on' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {agent.name}
        </h3>
        
        {/* Description */}
        <p className="text-gray-600 mb-4 text-sm leading-relaxed">
          {agent.description}
        </p>

        {/* Display warning if exists */}
        {'warning' in agent && (agent as any).warning && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="text-amber-500 h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-amber-700 text-xs leading-relaxed">{(agent as any).warning}</p>
          </div>
        )}

        {/* Professional badges section */}
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <span className="text-xs font-medium text-blue-700">AI Assistant</span>
          </div>
          
          {popularity > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
              <div className="w-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-600 rounded-full transition-all duration-300"
                  style={{ width: `${popularity}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-gray-600">{popularity}%</span>
            </div>
          )}
        </div>

        {/* Action Section */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-1.5 text-blue-600 text-sm font-medium group-hover:text-blue-700 group-hover:translate-x-1 transition-all">
            <span>Mulai Chat</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
