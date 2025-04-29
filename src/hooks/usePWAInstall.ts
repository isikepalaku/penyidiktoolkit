import { useState, useEffect } from 'react';
import { trackPWA, ANALYTICS_EVENTS } from '../services/analytics';

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
      
      // Track bahwa prompt install tersedia
      trackPWA('pwa_installable', {
        platform: navigator.platform,
        userAgent: navigator.userAgent
      });
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Track event installasi selesai
    const handleAppInstalled = () => {
      trackPWA(ANALYTICS_EVENTS.PWA_INSTALLED, {
        method: 'browser_prompt',
        platform: navigator.platform,
        userAgent: navigator.userAgent
      });
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;

    // Track bahwa user memulai proses instalasi
    trackPWA('pwa_install_prompted', {
      source: 'install_button'
    });

    // Tampilkan prompt instalasi
    deferredPrompt.prompt();

    // Tunggu user merespons prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User menerima instalasi PWA');
      // Track bahwa user menerima instalasi
      trackPWA('pwa_install_accepted', {
        platform: navigator.platform
      });
    } else {
      console.log('User menolak instalasi PWA');
      // Track bahwa user menolak instalasi
      trackPWA('pwa_install_rejected', {
        platform: navigator.platform
      });
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