// Service Worker CSP LFB — Push Notifications
const CACHE_NAME = 'csp-lfb-v1';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Réception d'une notification push
self.addEventListener('push', function(e) {
  if(!e.data) return;
  let data;
  try { data = e.data.json(); } catch(err) { data = {title:'CSP LFB', body: e.data.text()}; }

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: data.tag || 'csp-lfb',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: data.actions || []
  };

  e.waitUntil(self.registration.showNotification(data.title || 'CSP LFB', options));
});

// Clic sur la notification → ouvrir l'app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list) {
      for(const client of list){
        if(client.url.includes(self.location.origin) && 'focus' in client)
          return client.focus();
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
