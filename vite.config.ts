import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-API-Key', 'Accept'],
      exposedHeaders: ['Content-Type', 'X-API-Key']
    },
    proxy: {
      '/v1': {
        target: 'http://147.79.70.246:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('Proxy error:', err);
          });

          proxy.on('proxyReq', (proxyReq) => {
            // Set required headers
            proxyReq.setHeader('origin', 'http://147.79.70.246:8000');
            proxyReq.setHeader('Access-Control-Request-Method', 'POST');
            proxyReq.setHeader('Access-Control-Request-Headers', 'content-type, x-api-key');
            
            // Log request headers
            console.log('Outgoing request headers:', proxyReq.getHeaders());
          });

          proxy.on('proxyRes', (proxyRes) => {
            // Set CORS headers
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Accept, X-API-Key';
            proxyRes.headers['access-control-max-age'] = '86400';
            proxyRes.headers['access-control-allow-credentials'] = 'true';

            // Handle streaming response
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['connection'] = 'keep-alive';
              proxyRes.headers['x-accel-buffering'] = 'no';
            }

            // Log response details
            console.log('Response status:', proxyRes.statusCode);
            console.log('Response headers:', proxyRes.headers);
          });
        }
      }
    }
  }
});
