// Firebase Cloud Messaging Background Service Worker for SchoolLinx
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAXi5xL5GbN_oZOrhFTIDwDFL0o0OVXKnE',
  authDomain: 'school-linx.firebaseapp.com',
  projectId: 'school-linx',
  storageBucket: 'school-linx.firebasestorage.app',
  messagingSenderId: '32565188498',
  appId: '1:32565188498:web:9fc11f63a722b3ae37d34b',
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'SchoolLinx Notification';
  const targetUrl = payload.data?.url || payload.fcmOptions?.link || '/notifications';
  const icon = payload.notification?.icon || payload.data?.logo_url || payload.data?.icon || '/favicon.ico';

  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new institutional alert.',
    icon: icon,
    badge: icon,
    image: payload.notification?.image || payload.data?.image_url,
    data: {
      url: targetUrl,
      id: payload.data?.id || 'fcm-' + Date.now(),
      type: payload.data?.type || 'SYSTEM',
    },
    vibrate: [100, 50, 100],
    actions: [
      { action: targetUrl, title: '🔔 View Alert' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Deep-linking click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  if (event.action && event.action.startsWith('/')) {
    targetUrl = event.action;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then((focusedClient) => {
            if ('navigate' in focusedClient && targetUrl !== '/') {
              return focusedClient.navigate(targetUrl);
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
