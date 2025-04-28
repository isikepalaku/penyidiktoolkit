import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, promptInstall } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <button
      onClick={promptInstall}
      className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
    >
      Install Aplikasi
    </button>
  );
} 