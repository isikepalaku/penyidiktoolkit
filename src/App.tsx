import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Agents from './pages/Agents';
import Reports from './pages/Reports';
import PencarianPutusan from './pages/PencarianPutusan';
import PerkabaChat from './pages/PerkabaChat';
import UndangUndang from './pages/UndangUndang';

// Lazy load components dengan path yang benar
const ImageProcessor = lazy(() => import('./pages/ImageProcessor')); // Pindahkan ke pages
const EmpChat = lazy(() => import('./pages/EmpChat')); // Pindahkan ke pages

function App() {
  // Tambahkan loading fallback yang lebih menarik
  const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        
        <main className="lg:ml-64 overflow-x-hidden">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/perkaba-chat" element={<PerkabaChat />} />
              <Route path="/undang-undang" element={<UndangUndang />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/pencarian-putusan" element={<PencarianPutusan />} />
              <Route path="/image-processor" element={<ImageProcessor />} />
              <Route path="/emp-chat" element={<EmpChat />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;