import { useState, useEffect } from 'react';
import AgentCard from '../components/AgentCard';
import { ArrowLeft } from 'lucide-react';
import { DotBackground } from '@/components/ui/DotBackground';
import { Agent } from '@/types';
import { penyidikAiAgent } from '@/data/agents/penyidikAiAgent';
import { tipidkorAiAgent } from '@/data/agents/tipidkorAiAgent';
import { fismondevAgent } from '@/data/agents/fismondevAgent';
import { siberAgent } from '@/data/agents/siberAgent';
import { tipidterAiAgent } from '@/data/agents/tipidterAiAgent';
import { narkotikaAgent } from '@/data/agents/narkotikaAgent';
import { ppaPpoAgent } from '@/data/agents/ppaPpoAgent';
import { reskrimumAgent } from '@/data/agents/reskrimumAgent';
import SiberChatPage from '@/components/ui/SiberChatPage';
import FismondevChatPage from '@/components/ui/FismondevChatPage';
import IndagsiChatPage from '@/components/ui/IndagsiChatPage';
import TipidkorChatPage from '@/components/ui/TipidkorChatPage';
import TipidterChatPage from '@/components/ui/TipidterChatPage';
import NarkotikaChatPage from '@/components/ui/NarkotikaChatPage';
import PpaPpoChatPage from '@/components/ui/PpaPpoChatPage';
import ReskrimumChatPage from '@/components/ui/ReskrimumChatPage';
import WassidikPenyidikChatPage from '@/components/ui/WassidikPenyidikChatPage';
import { wassidikPenyidikAgent } from '@/data/agents/wassidikPenyidikAgent';

// Key untuk menyimpan data di localStorage
const SELECTED_AGENT_KEY = 'penyidikai-selected-agent';

export default function PenyidikAi() {
  // Menggunakan localStorage untuk mempertahankan status saat reload
  const [selectedAgent, setSelectedAgent] = useState<string | null>(() => {
    try {
      // Gunakan URL parameter untuk memeriksa apakah ini adalah navigasi langsung ke halaman
      const urlParams = new URLSearchParams(window.location.search);
      const isDirectNavigation = urlParams.get('direct') === 'true';
      
      // Jika ini adalah navigasi langsung ke halaman (bukan dari dalam aplikasi),
      // hapus data agent yang tersimpan dan mulai dari halaman pilihan
      if (!isDirectNavigation) {
        localStorage.removeItem(SELECTED_AGENT_KEY);
        return null;
      }
      
      // Jika ini navigasi internal, ambil data dari localStorage
      const savedAgent = localStorage.getItem(SELECTED_AGENT_KEY);
      return savedAgent ? savedAgent : null;
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  });

  // Simpan selectedAgent ke localStorage setiap kali nilainya berubah
  useEffect(() => {
    try {
      if (selectedAgent) {
        localStorage.setItem(SELECTED_AGENT_KEY, selectedAgent);
        
        // Tambahkan parameter direct=true ke URL saat agent dipilih
        const url = new URL(window.location.href);
        url.searchParams.set('direct', 'true');
        window.history.replaceState({}, '', url.toString());
      } else {
        localStorage.removeItem(SELECTED_AGENT_KEY);
        
        // Hapus parameter direct dari URL saat kembali ke halaman pilihan
        const url = new URL(window.location.href);
        url.searchParams.delete('direct');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [selectedAgent]);

  // Tambahkan error boundary state
  const [hasError, setHasError] = useState(false);

  // Error boundary untuk menangkap error yang tidak tertangani
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setHasError(true);
      // Jangan reload otomatis, biarkan user yang memilih untuk refresh
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (selectedAgent) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // Handle browser's back button
    const handlePopState = (e: PopStateEvent) => {
      if (selectedAgent) {
        e.preventDefault();
        if (window.confirm('Apakah Anda yakin ingin meninggalkan percakapan ini? Semua percakapan akan hilang.')) {
          setSelectedAgent(null);
        } else {
          // Stay on the current page
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Add state to browser history when selecting an agent
    if (selectedAgent) {
      window.history.pushState(null, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedAgent]);

  const agents: Agent[] = [
    {
      id: penyidikAiAgent.id,
      name: penyidikAiAgent.name,
      description: penyidikAiAgent.description,
      type: penyidikAiAgent.type,
      status: penyidikAiAgent.status,
      color: 'purple',
      icon: 'brain'
    },
    {
      id: tipidkorAiAgent.id,
      name: tipidkorAiAgent.name,
      description: tipidkorAiAgent.description,
      type: tipidkorAiAgent.type,
      status: tipidkorAiAgent.status,
      color: 'blue',
      icon: 'shield'
    },
    {
      id: fismondevAgent.id,
      name: fismondevAgent.name,
      description: fismondevAgent.description,
      type: fismondevAgent.type,
      status: fismondevAgent.status,
      color: 'green',
      icon: 'dollar'
    },
    {
      id: siberAgent.id,
      name: siberAgent.name,
      description: siberAgent.description,
      type: siberAgent.type,
      status: siberAgent.status,
      color: 'cyan',
      icon: 'shield'
    },
    {
      id: tipidterAiAgent.id,
      name: tipidterAiAgent.name,
      description: tipidterAiAgent.description,
      type: tipidterAiAgent.type,
      status: tipidterAiAgent.status,
      color: 'orange',
      icon: 'alert-triangle'
    },
    {
      id: narkotikaAgent.id,
      name: narkotikaAgent.name,
      description: narkotikaAgent.description,
      type: narkotikaAgent.type,
      status: narkotikaAgent.status,
      color: 'amber',
      icon: 'pill'
    },
    {
      id: ppaPpoAgent.id,
      name: ppaPpoAgent.name,
      description: ppaPpoAgent.description,
      type: ppaPpoAgent.type,
      status: ppaPpoAgent.status,
      color: 'pink',
      icon: 'users'
    },
    {
      id: reskrimumAgent.id,
      name: reskrimumAgent.name,
      description: reskrimumAgent.description,
      type: reskrimumAgent.type,
      status: reskrimumAgent.status,
      color: 'indigo',
      icon: 'file-text'
    },
    {
      id: wassidikPenyidikAgent.id,
      name: wassidikPenyidikAgent.name,
      description: wassidikPenyidikAgent.description,
      type: wassidikPenyidikAgent.type,
      status: wassidikPenyidikAgent.status,
      color: 'teal',
      icon: 'user'
    }
  ];

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  const handleBack = () => {
    // Pesan tersimpan otomatis, tidak perlu konfirmasi
    setSelectedAgent(null);
  };

  const handleReset = () => {
    // Konfirmasi jika user ingin memulai percakapan baru
    if (window.confirm('Apakah Anda yakin ingin memulai percakapan baru? Semua percakapan sebelumnya akan hilang.')) {
      // Simpan agent yang dipilih
      const currentAgent = selectedAgent;

      // Reset state
      setSelectedAgent(null);

      // Re-set agent setelah jeda pendek untuk memicu reset komponen
      setTimeout(() => {
        setSelectedAgent(currentAgent);
      }, 50);
    }
  };

  // Render error state jika terjadi error
  if (hasError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="max-w-md p-6 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Terjadi Kesalahan</h2>
          <p className="mb-4">Maaf, terjadi kesalahan dalam aplikasi. Ini mungkin disebabkan oleh masalah koneksi atau server.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!selectedAgentData) return null;

    try {
      switch (selectedAgentData.type) {
        case 'penyidik_chat':
          return (
            <div className="fixed inset-0 z-20">
              <IndagsiChatPage onBack={handleBack} />
            </div>
          );
        case 'tipidkor_chat':
          return (
            <div className="fixed inset-0 z-20">
              <TipidkorChatPage onBack={handleBack} />
            </div>
          );
        case 'fismondev_chat':
          return (
            <div className="fixed inset-0 z-20">
              <FismondevChatPage onBack={handleBack} />
            </div>
          );
        case 'siber_chat':
          return (
            <div className="fixed inset-0 z-20">
              <SiberChatPage onBack={handleBack} />
            </div>
          );
        case 'tipidter_chat':
          return (
            <div className="fixed inset-0 z-20">
              <TipidterChatPage onBack={handleBack} />
            </div>
          );
        case 'narkotika_chat':
          return (
            <div className="fixed inset-0 z-20">
              <NarkotikaChatPage onBack={handleBack} />
            </div>
          );
        case 'ppa_ppo_chat':
          return (
            <div className="fixed inset-0 z-20">
              <PpaPpoChatPage onBack={handleBack} />
            </div>
          );
        case 'reskrimum_chat':
          return (
            <div className="fixed inset-0 z-20">
              <ReskrimumChatPage onBack={handleBack} />
            </div>
          );
        case 'wassidik_penyidik_chat':
          return (
            <div className="fixed inset-0 z-20">
              <WassidikPenyidikChatPage onBack={handleBack} />
            </div>
          );
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering chat page:', error);
      setHasError(true);
      return (
        <div className="p-8 bg-red-50 rounded-lg">
          <h3 className="text-lg font-medium text-red-800">Terjadi kesalahan saat memuat chat</h3>
          <p className="mt-2 text-sm text-red-700">
            Silakan coba kembali ke halaman utama dan pilih agen lagi.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="relative min-h-screen">
      <DotBackground className="absolute inset-0" />
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8 min-h-screen">
          {selectedAgent ? (
            <div className="max-w-5xl mx-auto">
              <div className="mb-8">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center px-4 py-2 text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  <span className="font-medium">Kembali</span>
                </button>
                
                {/* Tambahkan tombol Pilih Agent Lain yang tidak menghapus percakapan */}
                <button
                  onClick={handleReset}
                  className="inline-flex items-center px-4 py-2 ml-2 text-blue-600 bg-blue-50 rounded-lg shadow-sm hover:bg-blue-100 transition-all duration-200 border border-blue-100"
                >
                  <span className="font-medium">Pilih Agent Lain</span>
                </button>
                
                {selectedAgentData && (
                  <div className="mt-6">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedAgentData.name}</h1>
                    <p className="text-gray-600 mt-2">{selectedAgentData.description}</p>
                  </div>
                )}
              </div>
              {renderContent()}
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-1 bg-purple-500 rounded-full"></div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Penyidik AI
                  </h1>
                </div>
                <p className="text-base md:text-lg text-gray-600 ml-11">
                  AI Assistant untuk membantu proses penyidikan dengan menyediakan analisis dan insight yang mendalam
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className="cursor-pointer transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <AgentCard 
                      agent={agent}
                      bgColor="bg-white"
                      className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
