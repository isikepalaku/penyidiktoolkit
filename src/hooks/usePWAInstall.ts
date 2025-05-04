import { useState, useEffect } from 'react';
import { trackPWA, ANALYTICS_EVENTS } from '../services/analytics';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  // Tambahkan state untuk menyimpan preferensi penampilan
  const [hideInstallPrompt, setHideInstallPrompt] = useState(() => {
    // Cek apakah user pernah menutup prompt sebelumnya
    return localStorage.getItem('hideInstallPrompt') === 'true';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      // Mencegah browser menampilkan prompt instalasi secara otomatis
      e.preventDefault();
      // Simpan event untuk digunakan nanti
      setDeferredPrompt(e);
      
      // Hanya tampilkan jika user belum pernah menutup prompt
      if (!localStorage.getItem('hideInstallPrompt')) {
        setIsInstallable(true);
      }
      
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
      
      // Reset state setelah aplikasi diinstall
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.setItem('hideInstallPrompt', 'true');
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Event listener untuk mendeteksi ketika pengguna memulai percakapan
    const handleChatStarted = () => {
      // Pengguna memulai percakapan, sembunyikan tombol install
      setHideInstallPrompt(true);
      // Simpan preferensi untuk sementara dalam session storage
      sessionStorage.setItem('hideInstallPromptTemporary', 'true');
    };
    
    window.addEventListener('chatStarted', handleChatStarted);
    
    // Cek apakah user sedang dalam percakapan (dari session storage)
    if (sessionStorage.getItem('hideInstallPromptTemporary') === 'true') {
      setHideInstallPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('chatStarted', handleChatStarted);
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
      
      // User menolak, simpan preferensi untuk tidak menampilkan lagi dalam waktu dekat
      localStorage.setItem('hideInstallPrompt', 'true');
    }

    // Reset state
    setDeferredPrompt(null);
    setIsInstallable(false);
  };
  
  // Fungsi untuk menutup tombol install secara manual
  const dismissInstallPrompt = () => {
    setIsInstallable(false);
    setHideInstallPrompt(true);
    localStorage.setItem('hideInstallPrompt', 'true');
    
    // Track bahwa user menutup prompt
    trackPWA('pwa_install_dismissed', {
      platform: navigator.platform
    });
  };

  return {
    // Hanya kembalikan isInstallable=true jika memenuhi semua kondisi
    isInstallable: isInstallable && !hideInstallPrompt,
    promptInstall,
    dismissInstallPrompt
  };
} 