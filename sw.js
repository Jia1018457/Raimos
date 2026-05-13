const CACHE_NAME = 'raimos-v3-settings-anim-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/db.js',
  './js/app.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // 网络优先，失败回退缓存
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── Web Push ──
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data?.json() || {}; } catch(err) { d = { body: e.data?.text() || '' }; }
  e.waitUntil(
    self.registration.showNotification(d.title || 'Raimos', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || 'raimos',
      renotify: true,
      data: d,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wClients => {
      const open = wClients.find(c => c.url.includes(self.location.origin));
      return open ? open.focus() : clients.openWindow('/');
    })
  );
});
