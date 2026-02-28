const CACHE_NAME = 'zeiterfassung-v3.5.4';
const ASSETS = [
  './',
  './Zeiterfassung_V3.5.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: Cache alle Assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Alte Caches löschen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first, dann Netzwerk
self.addEventListener('fetch', event => {
  // Nur GET-Requests cachen
  if (event.request.method !== 'GET') return;

  // Google Fonts immer vom Netz laden
  if (event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(event.request).then(response => {
          cache.put(event.request, response.clone());
          return response;
        }).catch(() => caches.match(event.request))
      )
    );
    return;
  }

  // Alles andere: Cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./Zeiterfassung_V3.5.html'))
  );
});
