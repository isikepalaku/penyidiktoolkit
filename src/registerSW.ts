/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register';

// Variable to store service worker registration
let swRegistration: ServiceWorkerRegistration | null = null;

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
          
          // Store registration for later use with notifications
          swRegistration = registration;
          
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

// Store SW registration when available
const storeRegistration = (registration: ServiceWorkerRegistration) => {
  swRegistration = registration;
};

// Fungsi untuk mengirim notifikasi - menggunakan ServiceWorkerRegistration jika tersedia
export async function sendNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) {
    console.log('Browser ini tidak mendukung notifikasi desktop');
    return;
  }

  // Pastikan permission diberikan
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Izin notifikasi ditolak');
      return;
    }
  }
  
  const notificationOptions = {
    icon: '/img/reserse.png',
    badge: '/img/reserse.png',
    ...options
  };
  
  try {
    // Cara 1: Gunakan registration yang telah disimpan
    if (swRegistration) {
      await swRegistration.showNotification(title, notificationOptions);
      return;
    }
    
    // Cara 2: Dapatkan registration dari navigator.serviceWorker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Simpan untuk penggunaan berikutnya
        storeRegistration(registration);
        await registration.showNotification(title, notificationOptions);
        return;
      } catch (err) {
        console.warn('Tidak dapat menggunakan service worker untuk notifikasi:', err);
      }
    }
    
    // Cara 3: Fallback ke non-service worker notification (hanya desktop)
    console.log('Fallback ke notifikasi tanpa service worker (mungkin tidak berfungsi di mobile)');
    // Perlu cek tambahan karena ini bisa gagal di mobile
    if (typeof Notification === 'function') {
      try {
        const notification = new Notification(title, notificationOptions);
        notification.onclick = function() {
          window.focus();
          this.close();
        };
      } catch (err) {
        console.error('Gagal menampilkan notifikasi:', err);
      }
    }
  } catch (error) {
    console.error('Error saat menampilkan notifikasi:', error);
  }
} 