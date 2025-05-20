import { createRoot } from 'react-dom/client';
import { AuthProvider } from './auth/AuthContext';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerSW';
import { useEffect, useState } from 'react';
import { SplashScreen } from './components/SplashScreen';

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

// Pasang MutationObserver untuk mencegah penghapusan root element
function setupRootNodeProtection() {
  const targetNode = document.body;
  
  // Options for the observer
  const config = { childList: true, subtree: true };
  
  // Callback function to execute when mutations are observed
  const callback = function(mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
        // Check if root node was removed
        const rootElement = document.getElementById('root');
        if (!rootElement) {
          console.error('TIPIDTER APP: Root element was removed unexpectedly');
          
          // Recreate root if needed
          const newRoot = document.createElement('div');
          newRoot.id = 'root';
          document.body.appendChild(newRoot);
          
          console.log('TIPIDTER APP: Root element recreated');
          
          // Force page reload for clean state
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
    }
  };
  
  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);
  
  // Start observing the target node for configured mutations
  observer.observe(targetNode, config);
  
  console.log('TIPIDTER APP: Root node protection enabled');
}

// Komponen pembungkus untuk render dua tahap
function AppBootstrap() {
  const [stage, setStage] = useState<'splash'|'bootstrap'|'app'>('splash');
  
  // Menangani root element class untuk PWA transitions
  useEffect(() => {
    const rootElement = document.getElementById('root');
    if (rootElement && rootElement.classList.contains('pwa-loading')) {
      // Hapus class pwa-loading setelah komponen di-mount untuk menampilkan UI
      setTimeout(() => {
        console.log('TIPIDTER APP: Removing pwa-loading class');
        rootElement.classList.remove('pwa-loading');
        document.documentElement.classList.remove('pwa-initializing');
      }, 300);
    }
  }, []);
  
  useEffect(() => {
    // Tahap 1: Tampilkan hanya splash screen
    console.log('TIPIDTER BOOTSTRAP: Splash stage started');
    
    // Tahap 2: Bootstrap auth (setelah 500ms)
    const bootstrapTimer = setTimeout(() => {
      console.log('TIPIDTER BOOTSTRAP: Moving to bootstrap stage');
      setStage('bootstrap');
    }, 500);
    
    // Tahap 3: Render aplikasi penuh (setelah total 3000ms)
    const appTimer = setTimeout(() => {
      console.log('TIPIDTER BOOTSTRAP: Moving to app stage');
      setStage('app');
    }, 3000); // Waktu total lebih lama dari durasi splash screen
    
    return () => {
      clearTimeout(bootstrapTimer);
      clearTimeout(appTimer);
    };
  }, []);
  
  // Tahap 1: Hanya splash screen
  if (stage === 'splash') {
    return <SplashScreen />;
  }
  
  // Tahap 2: Bootstrap loading
  if (stage === 'bootstrap') {
    return (
      <>
        <SplashScreen />
        <div style={{ position: 'fixed', opacity: 0, visibility: 'hidden', pointerEvents: 'none' }}>
          <AuthProvider>
            <div>Preloading auth</div>
          </AuthProvider>
        </div>
      </>
    );
  }
  
  // Tahap 3: Aplikasi penuh
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

// Safety wrapper untuk render
try {
  console.log('TIPIDTER APP: Starting render');
  
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found!');
  }
  
  // Setup protection for root node
  setupRootNodeProtection();
  
  const root = createRoot(rootElement);
  
  // Render dengan pendekatan bertahap
  root.render(<AppBootstrap />);
  
  console.log('TIPIDTER APP: Render complete');
} catch (error) {
  console.error('TIPIDTER APP: Fatal render error:', error);
  displayErrorUI('Error saat render aplikasi: ' + (error instanceof Error ? error.message : 'Unknown error'));
}
