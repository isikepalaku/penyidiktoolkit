import { useEffect, useState } from 'react';
import { sendNotification } from '../registerSW';

interface NotificationHandlerProps {
  title?: string;
  message?: string;
  showNotification?: boolean;
}

// Deteksi apakah ini perangkat mobile
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export function NotificationHandler({ 
  title = 'Penyidik Toolkit', 
  message = 'Selamat datang di Penyidik Toolkit!',
  showNotification = false 
}: NotificationHandlerProps) {
  const [isReady, setIsReady] = useState(false);
  
  // Tunggu sebentar sebelum mencoba menampilkan notifikasi
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 3000); // Tunggu 3 detik
    
    return () => clearTimeout(timer);
  }, []);
  
  // Tampilkan notifikasi hanya jika semua syarat terpenuhi
  useEffect(() => {
    if (showNotification && isReady && !isMobile()) {
      console.log('Menampilkan notifikasi selamat datang...');
      
      // Wrapper async function untuk menangani error
      const showWelcomeNotification = async () => {
        try {
          await sendNotification(title, {
            body: message,
            tag: 'welcome-notification',
            requireInteraction: false // Jangan memaksa interaksi user
          });
        } catch (error) {
          console.warn('Error menampilkan notifikasi, tapi tidak kritis:', error);
        }
      };
      
      showWelcomeNotification();
    } else if (showNotification && isMobile()) {
      console.log('Tidak menampilkan notifikasi di perangkat mobile');
    }
  }, [showNotification, title, message, isReady]);

  return null;
} 