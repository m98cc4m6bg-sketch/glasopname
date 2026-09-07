/* Glasopname – service worker
   Doel: de app start ook zonder internet. Data gaat via cloud.js
   naar Supabase; die verzoeken worden nooit gecachet. */
const CACHE = 'glasopname-v2';
const SHELL = [
  './',
  './index.html',
  './config.js',
  './cloud.js',
  './import.js',
  './bulk.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('.supabase.co')) return;   // altijd live

  // Supabase-bibliotheek van de CDN: na de eerste keer uit de cache
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(hit => {
          const net = fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Eigen bestanden: eerst cache, op de achtergrond verversen
  e.respondWith(
    caches.open(CACHE).then(c =>
      c.match(e.request).then(hit => {
        const net = fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
