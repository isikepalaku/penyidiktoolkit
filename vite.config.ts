import { defineConfig, loadEnv } from 'vite';
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  console.log('Loaded environment:', {
    VITE_API_URL: env.VITE_API_URL,
    VITE_API_KEY: env.VITE_API_KEY ? '[REDACTED]' : undefined
  });

  return {
    base: '/',
    plugins: [react(), tsconfigPaths()],
    optimizeDeps: {
      exclude: ['lucide-react'],
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@radix-ui/react-slot',
        'class-variance-authority'
      ]
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      cors: true,
      proxy: {
        '/v1': {
          target: 'https://api.reserse.id',
          changeOrigin: true,
          secure: true,
          maxBodySize: '50mb',
          timeout: 300000,
          filter: (path: string) => {
            return path.startsWith('/v1/playground/agents/');
          }
        },
        '/api': {
          target: 'https://flow.reserse.id',
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/api/, '')
        },
        '/flowise': {
          target: 'https://flow.reserse.id',
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/flowise/, '')
        }
      },
      watch: {
        usePolling: true
      },
      hmr: {
        clientPort: 3000
      }
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      cors: true
    },
    assetsInclude: ['**/*.svg'],
    build: {
      sourcemap: true,
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: {
            'vendor': [
              'react',
              'react-dom',
              'react-router-dom',
              'lucide-react',
              '@radix-ui/react-slot',
              'class-variance-authority'
            ],
            'ui': [
              '@/components/ui/ai-input-with-loading',
              '@/components/ui/button',
              '@/components/ui/card',
              '@/components/ui/label',
              '@/components/ui/timeline'
            ]
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      minify: 'esbuild',
      target: 'esnext'
    },
    define: {
      'process.env': env
    }
  };
});
