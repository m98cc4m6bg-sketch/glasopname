/* Glasopname – service worker
   Doel: de app start ook zonder internet, maar een gepubliceerde
   update wint altijd zodra er wél internet is.
   Data gaat via cloud.js naar Supabase en wordt nooit gecachet. */
const VERSIE = 'v10';
const CACHE = 'glasopname-' + VERSIE;
const SHELL = [
  './',
  './index.html',
  './config.js',
  './cloud.js',
  './import.js',
  './bulk.js',
  './undo.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'reload' omzeilt de browsercache, anders belandt een
      // net vervangen bestand alsnog als oude versie in de cache
      .then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('.supabase.co')) return;        // altijd live

  // Bibliotheken van de CDN veranderen niet: eerst uit de cache
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(e.request).then(hit => hit || fetch(e.request)
        .then(res => { c.put(e.request, res.clone()); return res; })))
    );
    return;
  }

  // Eigen bestanden: eerst het net, cache alleen als terugval.
  // Zo zie je een gepubliceerde wijziging meteen, en werkt offline nog steeds.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const kopie = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, kopie));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
