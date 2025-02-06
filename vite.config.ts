import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { ProxyOptions } from 'vite';

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
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
      maxAge: 86400,
    },
    proxy: {
      // Localhost API proxies
      '/v1': {
        target: 'https://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'https://localhost:8000');
          });
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET,HEAD,PUT,PATCH,POST,DELETE';
            proxyRes.headers['access-control-max-age'] = '86400';
          });
        }
      } as ProxyOptions,
      '/api': {
        target: 'https://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {

          proxy.on('error', (err) => {
            console.log('Local API proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'https://localhost:8000');
            proxyReq.setHeader('Access-Control-Allow-Origin', '*');
            proxyReq.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
            proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          });

          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET,HEAD,PUT,PATCH,POST,DELETE';
            proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
            proxyRes.headers['access-control-max-age'] = '86400';
          });
        }
      } as ProxyOptions,
      // Flowise API proxy - using a different path to avoid conflicts
      '/flowise/': {
        target: process.env.VITE_PERKABA_API_URL || 'https://flow.reserse.id',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/flowise/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Flowise proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Flowise Request:', req.method, req.url);
            // Add CORS headers to the proxy request
            proxyReq.setHeader('Access-Control-Allow-Origin', '*');
            proxyReq.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
            proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            // Add CORS headers
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,HEAD,PUT,PATCH,POST,DELETE';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
            console.log('Received Flowise Response:', proxyRes.statusCode, req.url);
          });
        },
      } as ProxyOptions
    },
    host: '0.0.0.0',
    port: 3000
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  },
  assetsInclude: ['**/*.svg'],
});
