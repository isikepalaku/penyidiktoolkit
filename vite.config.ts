import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { IncomingMessage } from 'http';

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
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Origin', 'Accept'],
      exposedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
    },
    proxy: {
      '/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req: IncomingMessage & { body?: any }, _res) => {
            if (req.body && typeof req.body === 'object') {
              const bodyData = JSON.stringify(req.body);
              proxyReq.setHeader('Content-Type', 'application/json');
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
              proxyReq.write(bodyData);
            }
          });
        }
      },
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
    },
    watch: {
      usePolling: true,
    },
    hmr: {
      overlay: true,
      clientPort: 3000,
      host: '0.0.0.0'
    },
    host: true,
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
