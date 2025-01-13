import React from 'react';
import { 
  Brain, 
  Settings,
  ShieldCheck,
  ChevronRight,
  FileText,
  Search
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export default function Sidebar({ isOpen, setIsOpen, currentPage, setCurrentPage }: SidebarProps) {
  const menuItems = [
    { icon: <Brain size={24} />, label: 'Agen AI', id: 'agents' },
    { icon: <FileText size={24} />, label: 'Laporan', id: 'reports' },
    { icon: <Settings size={24} />, label: 'Pengaturan', id: 'settings' },
  ];

  const handleMenuClick = (pageId: string) => {
    setCurrentPage(pageId);
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        className={`fixed top-1/2 -translate-y-1/2 z-50 p-2 bg-blue-900 rounded-md hover:bg-blue-800 transition-colors ${
          isOpen ? 'left-[248px] lg:left-[248px]' : 'left-4'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ChevronRight 
          size={24} 
          className={`text-white transform transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-blue-900 text-white transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col p-6">
          <h1 className="text-2xl font-bold mb-8 flex items-center gap-2 whitespace-nowrap">
            <ShieldCheck size={32} className="text-amber-400 shrink-0" />
            InvestigasiAI
          </h1>
          
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Cari..."
              className="w-full bg-blue-800 text-white placeholder-blue-300 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <Search size={20} className="absolute left-3 top-2.5 text-blue-300" />
          </div>

          <nav className="space-y-2 flex-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
                  currentPage === item.id 
                    ? 'bg-blue-800 text-white' 
                    : 'hover:bg-blue-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}