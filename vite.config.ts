import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

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
    plugins: [
      react(), 
      tsconfigPaths(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'reserse.png', 'logo.svg'],
        manifest: {
          name: 'Penyidik Toolkit',
          short_name: 'Penyidik',
          description: 'Toolkit untuk penyidik dalam penanganan kasus',
          theme_color: '#1e40af',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'img/reserse.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'img/reserse.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          start_url: '/',
          scope: '/',
          orientation: 'portrait',
          prefer_related_applications: false,
          categories: ['productivity', 'utilities'],
          screenshots: [
            {
              src: 'screenshot1.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.reserse\.id\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                },
                networkTimeoutSeconds: 10,
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/flow\.reserse\.id\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'flow-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                },
                networkTimeoutSeconds: 10,
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ],
          cleanupOutdatedCaches: true,
          sourcemap: true
        },
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html'
        },
        injectRegister: 'auto',
        strategies: 'generateSW',
        srcDir: 'src',
        filename: 'sw.ts',
        injectManifest: {
          swSrc: 'src/sw.ts',
          swDest: 'dist/sw.js',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}']
        }
      })
    ],
    optimizeDeps: {
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
      cors: true,
      port: 3000,
      strictPort: true,
      host: true,
      fs: {
        strict: false,
        allow: ['.', 'node_modules']
      },
      hmr: {
        overlay: false // Disable HMR overlay to prevent k8s config errors
      },
      proxy: {
        '/v1': {
          target: 'https://api.reserse.id',
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: {
            '*': ''
          },
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Log outgoing request for debugging
              console.log('Proxying request:', req.method, req.url);
              
              // Add origin header to help with CORS
              const origin = req.headers.origin || 'http://localhost:3000';
              proxyReq.setHeader('Origin', origin);
            });
            
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              // Log response headers for debugging
              console.log('Proxy response status:', proxyRes.statusCode, 'for', req.url);
              
              // Ensure CORS headers are present
              proxyRes.headers['access-control-allow-origin'] = req.headers.origin || '*';
              proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-API-Key';
              proxyRes.headers['access-control-allow-credentials'] = 'true';
              proxyRes.headers['access-control-max-age'] = '86400'; // 24 hours
            });
          }
        },
        '/api': {
          target: 'https://flow.reserse.id',
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              // Ensure CORS headers are present
              proxyRes.headers['access-control-allow-origin'] = req.headers.origin || '*';
              proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-API-Key';
              proxyRes.headers['access-control-allow-credentials'] = 'true';
            });
          }
        },
        '/flowise': {
          target: 'https://flow.reserse.id',
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/flowise/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              // Ensure CORS headers are present
              proxyRes.headers['access-control-allow-origin'] = req.headers.origin || '*';
              proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-API-Key';
              proxyRes.headers['access-control-allow-credentials'] = 'true';
            });
          }
        }
      },
      allowedHosts: [
        'localhost',
        'api.reserse.id',
        'flow.reserse.id',
        'app.reserse.id',
        '.reserse.id'
      ]
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      cors: true,
      allowedHosts: [
        'localhost',
        'api.reserse.id',
        'flow.reserse.id',
        'app.reserse.id',
        '.reserse.id'
      ]
    },
    assetsInclude: ['**/*.svg'],
    build: {
      sourcemap: true,
      outDir: 'dist',
      assetsDir: 'assets',
      cssCodeSplit: true,
      modulePreload: {
        polyfill: true
      },
      rollupOptions: {
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
              '@/components/ui',
            ],
            'agents': [
              '@/data/agents'
            ]
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      minify: 'esbuild',
      target: 'esnext',
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000
    },
    define: {
      'process.env': env
    }
  };
});
