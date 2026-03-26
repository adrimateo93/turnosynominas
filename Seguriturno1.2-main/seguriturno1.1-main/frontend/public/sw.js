// SeguriTurno Service Worker for Push Notifications

const CACHE_NAME = 'seguriturno-v1';
const OFFLINE_URL = '/offline.html';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response for caching
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'SeguriTurno',
    body: 'Tienes una notificación',
    icon: 'https://customer-assets.emergentagent.com/job_7ef7a8b4-f925-49e3-b2a6-713ab2418e30/artifacts/u2v9fpdi_seguriturnos%20icono.png',
    badge: 'https://customer-assets.emergentagent.com/job_7ef7a8b4-f925-49e3-b2a6-713ab2418e30/artifacts/u2v9fpdi_seguriturnos%20icono.png',
    vibrate: [200, 100, 200],
    tag: 'seguriturno-alarm',
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Abrir App' },
      { action: 'dismiss', title: 'Cerrar' }
    ]
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      actions: data.actions,
      data: data
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if no existing window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Background sync for offline alarm scheduling
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-alarms') {
    console.log('[SW] Syncing alarms...');
    event.waitUntil(syncAlarms());
  }
});

async function syncAlarms() {
  // This would sync with backend when online
  console.log('[SW] Alarms synced');
}

// Message handler for scheduling local notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_ALARM') {
    const { shiftDate, shiftTime, message } = event.data;
    scheduleAlarm(shiftDate, shiftTime, message);
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function scheduleAlarm(shiftDate, shiftTime, message) {
  const shiftDateTime = new Date(`${shiftDate}T${shiftTime}`);
  const alarmTime = new Date(shiftDateTime.getTime() - 60 * 60 * 1000); // 1 hour before
  const now = new Date();
  
  const delay = alarmTime.getTime() - now.getTime();
  
  if (delay > 0) {
    setTimeout(() => {
      self.registration.showNotification('SeguriTurno - Alarma', {
        body: message || `Tu turno comienza en 1 hora (${shiftTime})`,
        icon: 'https://customer-assets.emergentagent.com/job_7ef7a8b4-f925-49e3-b2a6-713ab2418e30/artifacts/u2v9fpdi_seguriturnos%20icono.png',
        badge: 'https://customer-assets.emergentagent.com/job_7ef7a8b4-f925-49e3-b2a6-713ab2418e30/artifacts/u2v9fpdi_seguriturnos%20icono.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: `alarm-${shiftDate}-${shiftTime}`,
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Ver Turno' },
          { action: 'dismiss', title: 'Cerrar' }
        ]
      });
    }, delay);
    
    console.log(`[SW] Alarm scheduled for ${alarmTime.toISOString()}`);
  }
}
