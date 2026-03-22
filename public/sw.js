/**
 * Service Worker for Zeiterfassung React App
 * Provides offline support and background sync
 *
 * Cache strategies:
 * - Cache-first: static assets (CSS, JS, fonts, icons)
 * - Network-first: API calls (Supabase)
 * - Stale-while-revalidate: HTML
 */

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  STATIC: `static-${CACHE_VERSION}`,
  API: `api-${CACHE_VERSION}`,
  HTML: `html-${CACHE_VERSION}`,
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
];

const API_PATTERNS = [
  /^https:\/\/.*\.supabase\.co/,
];

const STATIC_EXTENSIONS = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
];

/**
 * Install event - cache essential files
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAMES.STATIC);

        // Cache static assets
        for (const asset of STATIC_ASSETS) {
          try {
            await cache.add(asset);
          } catch (error) {
            console.warn(`[SW] Failed to cache ${asset}:`, error);
          }
        }

        console.log('[SW] Installation complete');
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
      }
    })()
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const currentCaches = Object.values(CACHE_NAMES);

        // Delete old cache versions
        await Promise.all(
          cacheNames.map((name) => {
            if (!currentCaches.includes(name)) {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            }
          })
        );

        console.log('[SW] Activation complete');
        await self.clients.claim();
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other non-http(s)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests (Network-first)
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (Cache-first)
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML (Stale-while-revalidate)
  if (isHtmlRequest(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default to network
  event.respondWith(
    fetch(request).catch(() => {
      // Return offline page or fallback
      return new Response('Offline - service unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'text/plain',
        }),
      });
    })
  );
});

/**
 * Background sync event - sync offline changes when back online
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      (async () => {
        try {
          // Send message to client to flush offline queue
          const clients = await self.clients.matchAll();
          for (const client of clients) {
            client.postMessage({
              type: 'FLUSH_OFFLINE_QUEUE',
            });
          }
          console.log('[SW] Background sync completed');
        } catch (error) {
          console.error('[SW] Background sync failed:', error);
          throw error; // Retry
        }
      })()
    );
  }
});

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      (async () => {
        const urls = event.data.urls || [];
        const cache = await caches.open(CACHE_NAMES.STATIC);
        await cache.addAll(urls);
        console.log('[SW] Cached URLs:', urls);
      })()
    );
  }
});

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAMES.STATIC);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Cache-first failed:', error);
    throw error;
  }
}

/**
 * Network-first strategy
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAMES.API);

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network request failed, using cache:', request.url);

    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'Network request failed and no cache available',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }
    );
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAMES.HTML);
  const cached = await cache.match(request);

  // Return cached version immediately
  if (cached) {
    // Update cache in background
    fetch(request).then((response) => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
    });

    return cached;
  }

  // No cache, fetch from network
  try {
    const response = await fetch(request);

    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Stale-while-revalidate failed:', error);
    throw error;
  }
}

/**
 * Check if request is for API
 */
function isApiRequest(url) {
  for (const pattern of API_PATTERNS) {
    if (pattern.test(url.href)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(url) {
  // Check file extension
  const path = url.pathname;
  for (const ext of STATIC_EXTENSIONS) {
    if (path.endsWith(ext)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if request is for HTML
 */
function isHtmlRequest(url) {
  const path = url.pathname;
  return !path.includes('.') || path.endsWith('.html');
}
