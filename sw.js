// Bump VERSION whenever you change any app file so installed copies refresh.
const VERSION = 'timegrid-v18';
const SHELL = ['./','./index.html','./styles.css','./app.js','./native.js','./config.js','./vendor/supabase.js',
  './manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Supabase + fonts go straight to network
  // network first (so updates show up), fall back to cache when offline.
  // no-cache: ask the server every time instead of reusing the browser's 10-minute copy.
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
    if (list.length) return list[0].focus();
    return clients.openWindow('./');
  }));
});
