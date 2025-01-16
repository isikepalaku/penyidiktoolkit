import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, FileText, PanelLeft, PanelRightClose, Search } from 'lucide-react';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const menuItems = [
    {
      path: '/',
      icon: <Users className="w-6 h-6" />,
      text: 'Agen AI'
    },
    {
      path: '/reports',
      icon: <FileText className="w-6 h-6" />,
      text: 'Laporan'
    },
    {
      path: '/pencarian-putusan',
      icon: <Search className="w-6 h-6" />,
      text: 'Pencarian Putusan'
    }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed left-4 top-1/2 -translate-y-1/2 z-[60] p-2.5 rounded-lg bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
      >
        {isOpen ? <PanelRightClose size={20} /> : <PanelLeft size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[45]"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out z-[50] w-64
          lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold">Police Investigator</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }: { isActive: boolean }) =>
                      `flex items-center space-x-3 p-3 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'}`
                    }
                  >
                    {item.icon}
                    <span>{item.text}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <p className="text-sm text-gray-600"> 2024 PHIData Indonesia</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;