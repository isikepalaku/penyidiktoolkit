/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Precache semua asset yang di-build
precacheAndRoute(self.__WB_MANIFEST);

// Cache untuk API requests
registerRoute(
  ({ url }) => url.pathname.startsWith('/v1/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 // 24 hours
      })
    ]
  })
);

// Cache untuk static assets
registerRoute(
  ({ request }) => request.destination === 'image' ||
    request.destination === 'script' ||
    request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
      })
    ]
  })
);

// Cache untuk fonts
registerRoute(
  ({ request }) => request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'fonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
      })
    ]
  })
);

// Handle install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Skip waiting to activate the new service worker immediately
      self.skipWaiting(),
      // Claim clients to ensure the service worker controls all pages
      self.clients.claim()
    ])
  );
});

// Handle activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== 'api-cache' && 
                cacheName !== 'static-assets' && 
                cacheName !== 'fonts') {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Handle offline fallback
self.addEventListener('install', (event) => {
  const offlineFallbackPage = '/offline.html';
  event.waitUntil(
    caches.open('offline-cache').then((cache) => {
      return cache.add(offlineFallbackPage);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html') as Promise<Response>;
      })
    );
  }
});

// Handle notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() ?? 'No payload',
    icon: '/pwa/manifest-icon-192.maskable.png',
    badge: '/pwa/manifest-icon-192.maskable.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1',
    },
  };

  event.waitUntil(
    self.registration.showNotification('Penyidik Toolkit', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/')
  );
}); 