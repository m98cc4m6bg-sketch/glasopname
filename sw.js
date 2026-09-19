/* Glasopname – service worker
   Doel: de app start ook zonder internet, maar een gepubliceerde
   update wint altijd zodra er wél internet is.
   Data gaat via cloud.js naar Supabase en wordt nooit gecachet. */
const VERSIE = 'v79';
const CACHE = 'glasopname-' + VERSIE;
const SHELL = [
  './',
  './index.html',
  './config.js',
  './melding.js',
  './cloud.js',
  './import.js',
  './bulk.js',
  './undo.js',
  './blokbalk.js',
  './fotos.js',
  './kopie.js',
  './teken.js',
  './project.js',
  './logo.png',
  './logo-wit.png',
  './merken.js',
  './naslag.js',
  './pdf.js',
  './manifest.webmanifest',
  './favicon.ico',
  './favicon.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

// De foto's van de glascatalogus. Ze staan apart omdat ze samen een paar
// megabyte zijn: ze horen wél bij de app (het naslagwerk moet het zonder
// bereik doen), maar een ontbrekende foto mag de installatie nooit laten
// mislukken. Daarom worden ze los ingeladen, na de shell.
const CATALOGUS_FOTOS = [
  './catalogus/byzanthijn-fijn-blank.jpg',
  './catalogus/byzanthijn-grof-blank.jpg',
  './catalogus/canale-blank.jpg',
  './catalogus/canale-mat-blank.jpg',
  './catalogus/carre-blank-13x13.jpg',
  './catalogus/cathedraal-groot-gehamerd.jpg',
  './catalogus/cathedraal-klein-duits.jpg',
  './catalogus/chinchilla-blank.jpg',
  './catalogus/cotswold-blank.jpg',
  './catalogus/crepi-blank.jpg',
  './catalogus/deltha-blank.jpg',
  './catalogus/gothic-blank.jpg',
  './catalogus/guss-antiek-blank.jpg',
  './catalogus/ijsbloemglas.jpg',
  './catalogus/jan-hagel-blank.jpg',
  './catalogus/master-carre.jpg',
  './catalogus/master-ligne.jpg',
  './catalogus/master-point.jpg',
  './catalogus/moire-blank.jpg',
  './catalogus/niagara-blank.jpg',
  './catalogus/nylon-blank.jpg',
  './catalogus/rochelino-alt-deutch-k.jpg',
  './catalogus/silvit-blank.jpg',
  './catalogus/draadglas-brute.jpg',
  './catalogus/draadglas-engels-blank.jpg',
  './catalogus/spiegeldraadglas.jpg',
  './catalogus/satijnglas.jpg',
  './catalogus/satijnglas-extra-helder.jpg',
  './catalogus/float-brons.jpg',
  './catalogus/float-dark-blue.jpg',
  './catalogus/float-grijs.jpg',
  './catalogus/float-groen.jpg',
  './catalogus/kristal-extra-helder.jpg',
  './catalogus/gelaagd-33-1-blank.jpg',
  './catalogus/gelaagd-33-1-matte-folie.jpg',
  './catalogus/gelaagd-33-1-silence.jpg',
  './catalogus/gelaagd-33-1-brons.jpg',
  './catalogus/gelaagd-33-1-grijs.jpg',
  './catalogus/gelaagd-33-1-groen.jpg',
  './catalogus/gelaagd-33-1-2z-brons.jpg',
  './catalogus/gelaagd-33-1-2z-brons-mat.jpg',
  './catalogus/gelaagd-33-1-2z-grijs.jpg',
  './catalogus/gelaagd-33-1-2z-grijs-mat.jpg',
  './catalogus/gelaagd-44-2-1z-brons.jpg',
  './catalogus/gelaagd-44-2-1z-grijs.jpg',
  './catalogus/gelaagd-44-2-1z-groen.jpg',
  './catalogus/gelaagd-44-2-2z-brons.jpg',
  './catalogus/gelaagd-44-2-2z-grijs.jpg',
  './catalogus/gelaagd-44-2-2z-groen.jpg',
  './catalogus/verzilverd-blank.jpg',
  './catalogus/verzilverd-brons.jpg',
  './catalogus/verzilverd-grijs.jpg',
  './catalogus/verzilverd-milano.jpg',
  './catalogus/pyroguard-ew30-impact.jpg',
  './catalogus/pyroguard-ew30-maxi-impact.jpg',
  './catalogus/pyroguard-ew60-c1060.jpg',
  './catalogus/pyroguard-satijn-ew30-impact.jpg',
  './catalogus/robax.jpg',
  './catalogus/starglass-donkerblauw.jpg',
  './catalogus/starglass-groen.jpg',
  './catalogus/starglass-oranje.jpg',
  './catalogus/starglass-rood.jpg',
];

// De foto's van de Duco-roosters bij het tabblad Naslag. Zes bestanden voor
// acht roosters: DucoTon 10 en 10 ZR zijn hetzelfde profiel, en GlasMax ZR
// en SR ook.
const ROOSTER_FOTOS = [
  './roosters/ducoton-10.jpg',
  './roosters/ducoton-18.jpg',
  './roosters/ducosmart-60.jpg',
  './roosters/ducoklep-15.jpg',
  './roosters/ducoflat-12.jpg',
  './roosters/ducoglasmax.jpg',
];

function inCache(c, lijst) {
  // cache:'reload' omzeilt de browsercache, anders belandt een
  // net vervangen bestand alsnog als oude versie in de cache
  return Promise.all(lijst.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => inCache(c, SHELL)
        .then(() => inCache(c, CATALOGUS_FOTOS))
        .then(() => inCache(c, ROOSTER_FOTOS)))
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

  // De catalogusfoto's veranderen niet binnen een versie: eerst de cache.
  // Scheelt op locatie een hoop wachten en verkeer.
  if (url.pathname.indexOf('/catalogus/') >= 0 || url.pathname.indexOf('/roosters/') >= 0) {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(e.request).then(hit => hit || fetch(e.request)
        .then(res => { if (res && res.ok) c.put(e.request, res.clone()); return res; })
        .catch(() => hit)))
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
