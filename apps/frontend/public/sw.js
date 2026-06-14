const CACHE_NAME = 'cars-manager-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install Service Worker and Cache Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Service Worker and Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache Intercept Fetches
self.addEventListener('fetch', (event) => {
  // Only intercept HTTP/HTTPS requests (skip chrome-extension, etc.)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache successful GET requests for local assets
        const url = new URL(event.request.url);
        if (
          event.request.method === 'GET' &&
          (url.origin === self.location.origin) &&
          !url.pathname.startsWith('/api') // Do not cache API requests
        ) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback can be added here if needed
    })
  );
});
