// Service worker Fanos ERP: menerima Web Push (pengumuman sistem) walau tab/browser tidak sedang dibuka.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Fanos ERP', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Fanos ERP';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/logo-fanos.png',
      badge: '/logo-fanos.png',
      tag: data.tag || 'fanos-announcement',
      data: { url: data.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { c.navigate && c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
