import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Mencegah browser menampilkan prompt instalasi secara otomatis
      e.preventDefault();
      // Simpan event untuk digunakan nanti
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;

    // Tampilkan prompt instalasi
    deferredPrompt.prompt();

    // Tunggu user merespons prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User menerima instalasi PWA');
    } else {
      console.log('User menolak instalasi PWA');
    }

    // Reset state
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return {
    isInstallable,
    promptInstall
  };
} 