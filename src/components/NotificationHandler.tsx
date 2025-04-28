import { useEffect } from 'react';
import { sendNotification } from '../registerSW';

interface NotificationHandlerProps {
  title?: string;
  message?: string;
  showNotification?: boolean;
}

export function NotificationHandler({ 
  title = 'Penyidik Toolkit', 
  message = 'Selamat datang di Penyidik Toolkit!',
  showNotification = false 
}: NotificationHandlerProps) {
  useEffect(() => {
    if (showNotification) {
      sendNotification(title, {
        body: message,
        tag: 'welcome-notification',
        requireInteraction: true
      });
    }
  }, [showNotification, title, message]);

  return null;
} 