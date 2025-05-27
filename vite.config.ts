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
        registerType: 'prompt',
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
          categories: ['productivity', 'utilities']
        },
        workbox: {
          globPatterns: [
            '**/*.{js,css,html}', 
            '**/assets/*.{png,svg,jpg,jpeg,webp}'
          ],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 30 * 24 * 60 * 60
                }
              }
            },
            {
              urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 24 * 60 * 60
                }
              }
            },
            {
              urlPattern: /\.(?:js|css)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'assets-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 3 * 24 * 60 * 60
                }
              }
            },
            {
              urlPattern: /^https:\/\/api\.reserse\.id\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60
                },
                networkTimeoutSeconds: 5
              }
            },
            {
              urlPattern: /^https:\/\/flow\.reserse\.id\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'flow-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60
                },
                networkTimeoutSeconds: 5
              }
            }
          ],
          cleanupOutdatedCaches: true,
          sourcemap: mode === 'development'
        },
        devOptions: {
          enabled: false,
          type: 'module',
          navigateFallback: 'index.html'
        },
        disable: mode !== 'production',
        strategies: 'generateSW'
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
        overlay: false
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
              console.log('Proxying request:', req.method, req.url);
              
              const origin = req.headers.origin || 'http://localhost:3000';
              proxyReq.setHeader('Origin', origin);
            });
            
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Proxy response status:', proxyRes.statusCode, 'for', req.url);
              
              proxyRes.headers['access-control-allow-origin'] = req.headers.origin || '*';
              proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-API-Key';
              proxyRes.headers['access-control-allow-credentials'] = 'true';
              proxyRes.headers['access-control-max-age'] = '86400';
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
