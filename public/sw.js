const CACHE_NAME = 'claude-pwa-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Não fazer cache de requisições à API
  if (event.request.url.includes('/flow-llm-proxy') || 
      event.request.url.includes('flow.ciandt.com')) {
    return;
  }

  // Ignora requisições de extensões e protocolos inválidos
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache).catch(() => {
            // Silenciosamente ignora erros de cache
          });
        });
        return response;
      }).catch(() => {
        // Offline fallback
        return null;
      });
    })
  );
});
