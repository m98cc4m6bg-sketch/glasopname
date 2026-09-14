/* Glasopname – service worker
   Doel: de app start ook zonder internet, maar een gepubliceerde
   update wint altijd zodra er wél internet is.
   Data gaat via cloud.js naar Supabase en wordt nooit gecachet. */
const VERSIE = 'v57';
const CACHE = 'glasopname-' + VERSIE;
const SHELL = [
  './',
  './index.html',
  './config.js',
  './cloud.js',
  './import.js',
  './bulk.js',
  './undo.js',
  './fotos.js',
  './kopie.js',
  './teken.js',
  './project.js',
  './logo.png',
  './logo-wit.png',
  './merken.js',
  './pdf.js',
  './manifest.webmanifest',
  './favicon.ico',
  './favicon.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'reload' omzeilt de browsercache, anders belandt een
      // net vervangen bestand alsnog als oude versie in de cache
      .then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
  );
  // Bewust géén skipWaiting: de nieuwe versie blijft klaarstaan tot de
  // pagina zegt dat het mag. Anders zou de app kunnen omschakelen terwijl
  // er nog werk openstaat.
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') { self.skipWaiting(); return; }
  // De pagina vraagt welke versie hier klaarstaat, zodat hij alleen meldt
  // dat er iets nieuws is als dat ook werkelijk zo is.
  if (e.data && e.data.vraag === 'versie' && e.ports && e.ports[0]) {
    e.ports[0].postMessage({ versie: VERSIE });
  }
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
  // Let op: een gewone fetch gaat door de browsercache, en die houdt
  // bestanden van GitHub Pages tien minuten vast. Dan krijg je 'vers van
  // het net' terwijl het de oude versie is. Daarom expliciet langs de
  // browsercache heen vragen.
  let verzoek = e.request;
  try { verzoek = new Request(e.request, { cache: 'no-cache' }); } catch (err) {}

  e.respondWith(
    fetch(verzoek)
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
