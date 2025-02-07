import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Log environment variables for debugging
console.log('Environment variables loaded:', {
  API_URL: process.env.VITE_API_URL,
  API_KEY: process.env.VITE_API_KEY ? '[REDACTED]' : 'undefined'
});

export default defineConfig({
  base: '/',
  plugins: [react(), tsconfigPaths()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    cors: {
      origin: '*',
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      exposedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
      maxAge: 86400,
    },
    proxy: {
      '/api': {
        target: 'https://flow.reserse.id',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/flowise': {
        target: 'https://flow.reserse.id',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/flowise/, ''),
      },
      '/v1': {
        target: 'https://api.reserse.id',
        changeOrigin: true,
        secure: false,
      }
    },
    watch: {
      usePolling: true,
    },
    hmr: {
      overlay: true,
      clientPort: 3000,
      host: '0.0.0.0'
    },
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: [
      'localhost',
      '.reserse.id',  // Ini akan mengizinkan semua subdomain .reserse.id
      '0.0.0.0'
    ]
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
  },
  assetsInclude: ['**/*.svg'],
  build: {
    sourcemap: true,
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  define: {
    'process.env': process.env
  },
});
