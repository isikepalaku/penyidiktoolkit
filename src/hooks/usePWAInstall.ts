import { useState, useEffect } from 'react';

// Fungsi untuk mendeteksi platform
const detectPlatform = () => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Deteksi iOS (iPhone, iPad, iPod)
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'iOS';
  }
  
  // Deteksi Android
  if (/android/i.test(userAgent)) {
    return 'Android';
  }
  
  // Default: desktop
  return 'Desktop';
};

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [platform, setPlatform] = useState<'iOS' | 'Android' | 'Desktop'>('Desktop');
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  
  // Tambahkan state untuk menyimpan preferensi penampilan
  const [hideInstallPrompt, setHideInstallPrompt] = useState(() => {
    // Cek apakah user pernah menutup prompt sebelumnya
    return localStorage.getItem('hideInstallPrompt') === 'true';
  });

  useEffect(() => {
    // Deteksi platform saat komponen mount
    setPlatform(detectPlatform());
    
    // Cek apakah PWA sudah diinstall (menggunakan display-mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone || 
                         document.referrer.includes('android-app://');
    
    if (isStandalone) {
      // PWA sudah diinstall, jangan tampilkan prompt
      setIsInstallable(false);
      localStorage.setItem('hideInstallPrompt', 'true');
      return;
    }

    // Jika iOS dan prompt belum disembunyikan, tampilkan panduan iOS setelah 2 detik
    if (detectPlatform() === 'iOS' && !localStorage.getItem('hideInstallPrompt')) {
      const timer = setTimeout(() => {
        setShowIOSGuide(true);
        setIsInstallable(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      // Mencegah browser menampilkan prompt instalasi secara otomatis
      e.preventDefault();
      // Simpan event untuk digunakan nanti
      setDeferredPrompt(e);
      
      // Hanya tampilkan jika user belum pernah menutup prompt
      if (!localStorage.getItem('hideInstallPrompt')) {
        // Pada mobile, tunda sedikit pemberitahuan install
        setTimeout(() => {
          setIsInstallable(true);
        }, 1500);
      }
      
      console.log('PWA installable event fired');
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Event installasi selesai
    const handleAppInstalled = () => {
      console.log('PWA has been installed');
      
      // Reset state setelah aplikasi diinstall
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowIOSGuide(false);
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
    // Untuk Android/Chrome
    if (deferredPrompt) {
      console.log('Prompting user to install PWA (Android/Chrome)');

      // Tampilkan prompt instalasi
      deferredPrompt.prompt();

      // Tunggu user merespons prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User menerima instalasi PWA');
      } else {
        console.log('User menolak instalasi PWA');
        
        // User menolak, simpan preferensi untuk tidak menampilkan lagi dalam waktu dekat
        localStorage.setItem('hideInstallPrompt', 'true');
      }

      // Reset state
      setDeferredPrompt(null);
      setIsInstallable(false);
    } 
    // Untuk iOS, hanya toggle guide karena tidak bisa trigger install secara programatik
    else if (platform === 'iOS') {
      setShowIOSGuide(!showIOSGuide);
    }
  };
  
  // Fungsi untuk menutup tombol install secara manual
  const dismissInstallPrompt = () => {
    setIsInstallable(false);
    setHideInstallPrompt(true);
    setShowIOSGuide(false);
    localStorage.setItem('hideInstallPrompt', 'true');
    
    console.log('User dismissed PWA install prompt');
  };

  // Reset prompt after some days
  useEffect(() => {
    // Cek timestamp terakhir prompt ditutup
    const lastDismissedTime = localStorage.getItem('installPromptDismissedTime');
    
    if (lastDismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(lastDismissedTime)) / (1000 * 60 * 60 * 24);
      
      // Jika sudah lebih dari 7 hari, reset preferensi
      if (daysSinceDismissed > 7) {
        localStorage.removeItem('hideInstallPrompt');
        localStorage.removeItem('installPromptDismissedTime');
      }
    }
    
    // Update timestamp saat dismiss
    if (hideInstallPrompt) {
      localStorage.setItem('installPromptDismissedTime', Date.now().toString());
    }
  }, [hideInstallPrompt]);

  return {
    // Hanya kembalikan isInstallable=true jika memenuhi semua kondisi
    isInstallable: isInstallable && !hideInstallPrompt,
    promptInstall,
    dismissInstallPrompt,
    platform,
    showIOSGuide
  };
} 