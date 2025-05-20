import { createRoot } from 'react-dom/client';
import { AuthProvider } from './auth/AuthContext';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerSW';

// Menambahkan global error handler
window.addEventListener('error', (event) => {
  console.error('FATAL APP ERROR:', event.error);
  displayErrorUI('Terjadi kesalahan fatal: ' + (event.error?.message || 'Unknown error'));
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
  displayErrorUI('Terjadi kesalahan async: ' + (event.reason?.message || 'Unknown promise error'));
});

// Fungsi untuk menampilkan UI error minimal
function displayErrorUI(message: string) {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center;">
        <h2 style="color: #e53e3e; margin-bottom: 16px;">Aplikasi Tidak Dapat Dimuat</h2>
        <p style="margin-bottom: 16px;">${message}</p>
        <div style="background: #f7fafc; padding: 16px; border-radius: 8px; max-width: 500px; overflow-x: auto; margin-bottom: 16px;">
          <code>${message}</code>
        </div>
        <button onclick="window.location.reload()" style="background: #3182ce; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          Coba Lagi
        </button>
      </div>
    `;
  }
}

// Register service worker
try {
  registerServiceWorker();
} catch (error) {
  console.error('Error registering service worker:', error);
}

// Safety wrapper untuk render
try {
  console.log('TIPIDTER APP: Starting render');
  
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found!');
  }
  
  const root = createRoot(rootElement);
  
  root.render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
  
  console.log('TIPIDTER APP: Render complete');
} catch (error) {
  console.error('TIPIDTER APP: Fatal render error:', error);
  displayErrorUI('Error saat render aplikasi: ' + (error instanceof Error ? error.message : 'Unknown error'));
}
