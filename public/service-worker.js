const CACHE_NAME = 'b2ks-daily-routines-v19';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './animals.json',
  './icon.svg',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache Firebase RTDB or translation/wiki APIs aggressively; network-first with fallback
  if (
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('wikipedia.org') ||
    url.hostname.includes('mymemory.translated.net') ||
    url.hostname.includes('dictionaryapi.dev')
  ) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkResp) => {
          if (networkResp && networkResp.status === 200 && url.origin === self.location.origin) {
            const copy = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
