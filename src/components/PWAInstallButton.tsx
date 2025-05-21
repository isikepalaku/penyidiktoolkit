import { useEffect, useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { X, Download, Share2, PlusCircle } from 'lucide-react';

export function PWAInstallButton() {
  const { isInstallable, promptInstall, dismissInstallPrompt, platform, showIOSGuide } = usePWAInstall();
  const [isMobile, setIsMobile] = useState(false);

  // Deteksi perangkat mobile
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      setIsMobile(/android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent));
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Jika tidak installable, jangan render apa-apa
  if (!isInstallable) return null;

  // Tampilkan posisi yang berbeda untuk mobile vs desktop
  const positionClasses = isMobile
    ? "fixed bottom-16 inset-x-4 z-50" // Di mobile, tampilkan di bagian bawah (di atas chat input)
    : "fixed bottom-4 right-4 z-50"; // Di desktop, tampilkan di pojok kanan bawah

  return (
    <div className={`${positionClasses} animate-fade-in transition-all duration-300`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 pr-10 border border-gray-200 dark:border-gray-700 relative">
        {/* Tombol close */}
        <button
          onClick={dismissInstallPrompt}
          className="absolute top-1 right-1 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          aria-label="Tutup notifikasi"
        >
          <X size={16} />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Pasang Aplikasi
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {platform === 'iOS' 
                ? "Untuk pengalaman lebih baik" 
                : "Akses lebih cepat tanpa browser"}
            </p>
          </div>
          <button 
            onClick={promptInstall}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            {platform === 'iOS' ? 'Cara Install' : 'Install'}
          </button>
        </div>

        {/* Panduan khusus iOS */}
        {platform === 'iOS' && showIOSGuide && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ikuti langkah-langkah berikut untuk install:
            </p>
            <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 rounded-full p-1 flex-shrink-0">
                  <Share2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </span>
                <span>Tap tombol <strong>Share</strong> di browser Safari</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 rounded-full p-1 flex-shrink-0">
                  <PlusCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </span>
                <span>Pilih <strong>Add to Home Screen</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 rounded-full p-1 flex-shrink-0">
                  <Download className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </span>
                <span>Tap <strong>Add</strong> di pojok kanan atas</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
} 