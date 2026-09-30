// SchoolLinx Push Notification & Comprehensive Offline PWA Service Worker
const CACHE_NAME = 'schoollinx-v4';
const DATA_CACHE_NAME = 'schoollinx-data-v4';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache non-fatal error:', err);
      });
    }).then(() => {
      // Notify active clients that a new SW version is installed
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATE_AVAILABLE' });
        });
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log('[SW] Purging stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass WebSockets (/ws/chat, /ws/*) and static upload files
  if (url.pathname.startsWith('/ws') || url.pathname.startsWith('/uploads')) {
    return;
  }

  // 1. Navigation Requests (SPA Page Routes: /dashboard, /students, etc.)
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return new Response('Offline: Page not cached.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // 2. API Requests: Network-First with Data Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'Offline network error' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 3. Static Assets (Scripts, Styles, Fonts, Images)
  // Use Network-First for JS/CSS chunks to avoid stale chunk 404 mismatches after new deploys
  const isCodeChunk = url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs') || url.pathname.endsWith('.css');

  if (isCodeChunk) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response('', { status: 404 });
        })
    );
    return;
  }

  // Other static assets (images, fonts, etc.): Cache-First with background revalidation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() => new Response('', { status: 404 }));
    })
  );
});

// Push Notification Handling
self.addEventListener('push', (event) => {
  let data = {
    title: 'SchoolLinx Notification',
    body: 'You have a new institutional alert.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: data.data || { url: '/' },
    actions: data.actions || [],
    vibrate: data.vibrate || [100, 50, 100],
    requireInteraction: false,
    tag: (data.data && data.data.id) ? data.data.id : 'schoollinx-push-' + Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SchoolLinx Notification', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  // If a specific notification action button was clicked with a target URL
  if (event.action && event.action.startsWith('/')) {
    targetUrl = event.action;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Prefer an already-open window
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then((focusedClient) => {
            if ('navigate' in focusedClient && targetUrl !== '/') {
              return focusedClient.navigate(targetUrl);
            }
          });
        }
      }
      // No open window — open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
