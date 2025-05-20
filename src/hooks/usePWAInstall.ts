import { useState, useEffect } from 'react';

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
      
      console.log('PWA installable event fired');
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Event installasi selesai
    const handleAppInstalled = () => {
      console.log('PWA has been installed');
      
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

    console.log('Prompting user to install PWA');

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
  };
  
  // Fungsi untuk menutup tombol install secara manual
  const dismissInstallPrompt = () => {
    setIsInstallable(false);
    setHideInstallPrompt(true);
    localStorage.setItem('hideInstallPrompt', 'true');
    
    console.log('User dismissed PWA install prompt');
  };

  return {
    // Hanya kembalikan isInstallable=true jika memenuhi semua kondisi
    isInstallable: isInstallable && !hideInstallPrompt,
    promptInstall,
    dismissInstallPrompt
  };
} 