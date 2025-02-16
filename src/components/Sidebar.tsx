import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, FileText, PanelLeft, PanelRightClose, Search, MessageSquare, Home, Scale } from 'lucide-react';
import logo from '../static/logo.svg';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const menuItems = [
    {
      path: '/',
      icon: <Home className="w-5 h-5" />,
      text: 'Home'
    },
    {
      path: '/agents',
      icon: <Users className="w-5 h-5" />,
      text: 'Agen AI'
    },
    {
      path: '/perkaba-chat',
      icon: <MessageSquare className="w-5 h-5" />,
      text: 'Perkaba Chat'
    },
    {
      path: '/undang-undang',
      icon: <Scale className="w-5 h-5" />,
      text: 'Ahli Undang-Undang'
    },
    {
      path: '/reports',
      icon: <FileText className="w-5 h-5" />,
      text: 'Laporan'
    },
    {
      path: '/pencarian-putusan',
      icon: <Search className="w-5 h-5" />,
      text: 'Pencarian Putusan'
    }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed left-4 top-4 z-[200] p-2.5 rounded-lg bg-gradient-to-r from-indigo-950 to-slate-900 text-white shadow-lg hover:from-slate-900 hover:to-slate-950 transition-all"
      >
        {isOpen ? <PanelRightClose size={20} /> : <PanelLeft size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/60 z-[150] backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-indigo-950 to-slate-900 shadow-xl z-[175] transition-transform duration-300 ease-in-out`}
      >
        {/* Logo Container with Border */}
        <div className="relative flex items-center justify-center py-6 border-b border-indigo-900/50">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-transparent"></div>
          <div className="relative p-3 rounded-2xl bg-gradient-to-br from-indigo-900/50 to-slate-900/50 ring-1 ring-white/10">
            <img src={logo} alt="Logo" className="w-14 h-14" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-6">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                >
                  {({ isActive }: { isActive: boolean }) => (
                    <div
                      className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-900/90 to-slate-800/90 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-700/50'
                          : 'text-slate-300 hover:bg-indigo-900/20 hover:text-white hover:ring-1 hover:ring-indigo-800/25'
                      }`}
                    >
                      <span 
                        className={`transition-all duration-200 ${
                          isActive 
                            ? 'text-indigo-400' 
                            : 'group-hover:text-indigo-400'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className={`text-sm font-medium tracking-wide ${
                        isActive 
                          ? 'text-indigo-100' 
                          : 'group-hover:text-indigo-100'
                      }`}>
                        {item.text}
                      </span>
                      {isActive && (
                        <span className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600"></span>
                      )}
                    </div>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
