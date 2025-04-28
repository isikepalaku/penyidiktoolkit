/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    console.log('Service Worker didukung di browser ini');
    
    // Register service worker
    const updateSW = registerSW({
      onNeedRefresh() {
        // A new content is available, please refresh
        if (confirm('Versi baru tersedia. Muat ulang sekarang?')) {
          updateSW();
        }
      },
      onOfflineReady() {
        // App is ready to work offline
        console.log('App siap digunakan secara offline');
      },
      onRegistered(registration: ServiceWorkerRegistration | undefined) {
        if (registration) {
          console.log('Service Worker berhasil didaftarkan:', registration);
          
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
          
          // Request notification permission
          if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                console.log('Izin notifikasi diberikan');
              } else {
                console.log('Izin notifikasi ditolak');
              }
            });
          }
        }
      },
      onRegisterError(error: Error) {
        console.error('Error saat mendaftarkan Service Worker:', error);
      }
    });

    // Debug PWA installation
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('beforeinstallprompt event fired');
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      (window as any).deferredPrompt = e;
    });

    // Debug PWA installation success
    window.addEventListener('appinstalled', (e) => {
      console.log('PWA berhasil diinstal:', e);
    });
  } else {
    console.log('Service Worker tidak didukung di browser ini');
  }
}

// Fungsi untuk mengirim notifikasi
export async function sendNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) {
    console.log('Browser ini tidak mendukung notifikasi desktop');
    return;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/img/reserse.png',
      badge: '/img/reserse.png',
      ...options
    });

    notification.onclick = function() {
      window.focus();
      this.close();
    };
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      sendNotification(title, options);
    }
  }
} 