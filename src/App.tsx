import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Agents from './pages/Agents';
import Reports from './pages/Reports';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState('agents');
  
  const renderPage = () => {
    switch (currentPage) {
      case 'agents':
        return <Agents />;
      case 'reports':
        return <Reports />;
      default:
        return <Agents />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : ''}`}>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;