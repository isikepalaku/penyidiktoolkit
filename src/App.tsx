import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Agents from './pages/Agents';
import Reports from './pages/Reports';
import PencarianPutusan from './pages/PencarianPutusan';
import PerkabaChat from './pages/PerkabaChat';
import UndangUndang from './pages/UndangUndang';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        
        <main className="lg:ml-64 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/perkaba-chat" element={<PerkabaChat />} />
            <Route path="/undang-undang" element={<UndangUndang />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/pencarian-putusan" element={<PencarianPutusan />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;