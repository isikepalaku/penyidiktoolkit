import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './auth/AuthContext';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerSW';

// Register service worker
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
