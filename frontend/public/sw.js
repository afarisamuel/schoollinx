// SchoolLinx Push Notification & Comprehensive Offline PWA Service Worker
const CACHE_NAME = 'schoollinx-v2';
const DATA_CACHE_NAME = 'schoollinx-data-v2';

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
        console.warn('[SW] Precache asset registration non-fatal error:', err);
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

  // 1. All Page Navigation Requests (SPA Client-Side Routes)
  // Ensures all pages (/dashboard, /students, /teachers, /attendance/mark, etc.) load offline
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
        .catch(() => {
          // Serve cached root index.html when offline so Angular Router activates the requested page
          return caches.match('/').then((cachedRoot) => {
            if (cachedRoot) return cachedRoot;
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 2. API Requests: Network-First with Data Cache Fallback (for viewing rosters, marks, etc. offline)
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
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. Static Assets (Scripts, Styles, Fonts, Images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Stale-while-revalidate in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
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
      });
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
