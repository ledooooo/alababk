const CACHE_NAME = 'alababak-pwa-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/icon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  try {
    const url = new URL(event.request.url);

    // Completely ignore requests that are not http/https (e.g. chrome-extension://, moz-extension://)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return;
    }

    // Ignore API calls and Supabase realtime/REST queries from SW static cache
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
      return;
    }

    const isHtmlRequest =
      event.request.mode === 'navigate' ||
      (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) ||
      url.pathname === '/' ||
      url.pathname.endsWith('.html');

    if (isHtmlRequest) {
      // Network-first, falling back to cache for HTML documents
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {});
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request).then((cached) => {
              return cached || caches.match('/index.html');
            });
          })
      );
    } else {
      // Cache-first, falling back to network for static assets (JS, CSS, images, etc.)
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((response) => {
            if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {});
              });
            }
            return response;
          });
        })
      );
    }
  } catch {
    // If URL parsing fails, let the browser handle the fetch natively
    return;
  }
});
