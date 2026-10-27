/* Glasopname – service worker
   Doel: de app start ook zonder internet, maar een gepubliceerde
   update wint altijd zodra er wél internet is.
   Data gaat via cloud.js naar Supabase en wordt nooit gecachet. */
const VERSIE = 'v124';
const CACHE = 'glasopname-' + VERSIE;
const SHELL = [
  './',
  './index.html',
  './config.js',
  './melding.js',
  './cloud.js',
  // Wie een project mag bewerken (v106).
  './bewerkslot.js',
  './start.js',
  './import.js',
  './bulk.js',
  './undo.js',
  './herstel.js',       // v124: onlangs verwijderd
  './blokbalk.js',
  './fotos.js',
  './kopie.js',
  './latten.js',        // v113: glaslatten en het pakket in de sponning
  './toebehoren.js',    // v111: tabblad Toebehoren
  './teken.js',
  './project.js',
  './logo.png',
  './logo-wit.png',
  './merken.js',
  './naslag.js',
  './pdf.js',
  // De wachtrij voor foto's zonder bereik en het exporteren van de
  // originelen (v93). Zonder deze regels werkt juist het offline bewaren
  // van foto's niet offline.
  './wachtrij.js',
  './originelen.js',
  './backup.js',
  './rechten.js',
  './manifest.webmanifest',
  './favicon-v3.ico',   // v111: nieuwe naam i.p.v. ?v=2 (Safari-faviconopslag)
  './favicon-v3.png',
  './apple-touch-icon.png?v=2',
  './icon-192.png?v=2',
  './icon-512.png?v=2',
  // De bibliotheken staan sinds v91 in de repo, op een vaste versie. Tot
  // v90 kwamen ze van de CDN en werden ze pas bij het eerste gebruik
  // bewaard — in de cache van díe versie, die bij elke update weggegooid
  // wordt. Na een update kon de eerste pdf of import dus alleen online.
  './lib/supabase-js-2.117.2/supabase.js',
  './lib/jspdf-2.5.2/jspdf.umd.min.js',
  './lib/jspdf-autotable-3.8.4/jspdf.plugin.autotable.min.js',
  './lib/xlsx-0.18.5/xlsx.full.min.js',
  './lib/pdfjs-3.11.174/pdf.min.js',
  './lib/pdfjs-3.11.174/pdf.worker.min.js',
  './lib/jszip-3.10.1/jszip.min.js'
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

// De foto's van de glaslatten (v113) en sinds v114 de maattekeningen
// (<id>-tek.jpg), van jongeneel.nl (bron: latfotos.txt). Ontbreekt er een,
// dan tekent de app het profiel. Daarom net als de catalogus: los ingeladen,
// mag ontbreken.
const LAT_FOTOS = [
  './latten/A4.jpg',
  './latten/A4-tek.jpg',
  './latten/A5.jpg',
  './latten/A5-tek.jpg',
  './latten/A10.jpg',
  './latten/A10-tek.jpg',
  './latten/A12.jpg',
  './latten/A12-tek.jpg',
  './latten/A16.jpg',
  './latten/A16-tek.jpg',
  './latten/B1.jpg',
  './latten/B1-tek.jpg',
  './latten/B5.jpg',
  './latten/B5-tek.jpg',
  './latten/B13.jpg',
  './latten/B13-tek.jpg',
  './latten/B14.jpg',
  './latten/B14-tek.jpg',
  './latten/B17.jpg',
  './latten/B17-tek.jpg',
  './latten/C1.jpg',
  './latten/C1-tek.jpg',
  './latten/C2.jpg',
  './latten/C3.jpg',
  './latten/E6.jpg',
  './latten/E7.jpg',
  './latten/E8.jpg',
  './latten/E22.jpg',
  './latten/E22-tek.jpg',
  './latten/GLD1.jpg',
  './latten/GLD1-tek.jpg',
  './latten/GLD2.jpg',
  './latten/GLD2-tek.jpg',
  './latten/N25.jpg',
  './latten/N25-tek.jpg',
  './latten/N30.jpg',
  './latten/N30-tek.jpg',
  './latten/N35.jpg',
  './latten/N35-tek.jpg',
  './latten/N40.jpg',
  './latten/N40-tek.jpg',
  './latten/N45.jpg',
  './latten/N45-tek.jpg',
  './latten/N50.jpg',
  './latten/N50-tek.jpg',
  './latten/N55.jpg',
  './latten/N55-tek.jpg',
  './latten/G915.jpg',
  './latten/G915-tek.jpg',
  './latten/G916.jpg',
  './latten/G916-tek.jpg'
];

function inCache(c, lijst) {
  // cache:'reload' omzeilt de browsercache, anders belandt een
  // net vervangen bestand alsnog als oude versie in de cache
  return Promise.all(lijst.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
}

// De app zelf moet compleet in de cache, anders géén nieuwe versie (v99).
// Tot v98 werd een bestand dat niet binnenkwam stil overgeslagen. Viel de
// verbinding weg tijdens het ophalen (bouwplaats!), dan was de nieuwe versie
// tóch 'klaar', verving hij de oude cache, en ontbrak er offline een stuk
// van de app. Met het verplichte bijwerken van v99 zou dat vaker gebeuren.
// Nu mislukt de installatie dan; de oude versie blijft gewoon werken en de
// app probeert het bij de volgende controle opnieuw (binnen 5 minuten).
function allesInCache(c, lijst) {
  return Promise.all(lijst.map(u => c.add(new Request(u, { cache: 'reload' }))));
}

// Redding voor apparaten die nog v98 of ouder draaien (v101).
// Die oude versies tonen de melding 'Nu bijwerken' niet op het startscherm
// en wissen hem bij het openen van een project (gemeld door Jan: na v100
// bleef zijn iPhone op v98 staan). Wachten tot de gebruiker zelf bijwerkt
// werkt daar dus niet. Draait er zo'n oude versie, dan neemt deze versie
// meteen over. De oude pagina herlaadt dan vanzelf; wat er getypt was staat
// al op het apparaat (elke toetsaanslag) met de vlag 'moet nog omhoog', en
// gaat na het herladen naar de server. Vanaf v99 regelt de pagina het
// bijwerken zelf, veilig en met aftellen; dan doet de service worker niets.
const EERSTE_MET_EIGEN_BIJWERKEN = 99;
function draaitOudeVersie() {
  return caches.keys().then(namen => namen.some(n => {
    const m = /^glasopname-v(\d+)$/.exec(n);
    return !!m && +m[1] < EERSTE_MET_EIGEN_BIJWERKEN;
  }));
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => allesInCache(c, SHELL)
        // De foto's van de catalogus mogen ontbreken: die staan niet altijd
        // in de repo (Jan haalt ze zelf op) en de app werkt zonder.
        .then(() => inCache(c, CATALOGUS_FOTOS))
        .then(() => inCache(c, ROOSTER_FOTOS))
        .then(() => inCache(c, LAT_FOTOS)))
      // Pas als alles binnen is: anders zou een halve versie overnemen.
      .then(() => draaitOudeVersie())
      .then(oud => { if (oud) return self.skipWaiting(); })
    // Geen opruimen bij een mislukking: heeft een versie per ongeluk
    // hetzelfde nummer als de draaiende, dan zou dat juist de werkende
    // cache weggooien. Een halve cache onder een nieuwe naam doet niets;
    // de volgende poging vult hem aan.
  );
  // Verder bewust géén skipWaiting: de nieuwe versie blijft klaarstaan tot
  // de pagina zegt dat het mag (v99: verplicht en veilig bijwerken). Alleen
  // voor apparaten op v98 of ouder neemt hij zelf over, zie hierboven.
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
  // Zelfde voor de bibliotheken in lib/: het versienummer staat in de
  // mapnaam, dus binnen een map verandert er nooit iets (v91).
  // v113: de foto's van de glaslatten (latten/) net zo; zonder deze regel
  // vroeg de kiezer elke keer alle foto's opnieuw aan het net (controle v113).
  if (url.pathname.indexOf('/catalogus/') >= 0 || url.pathname.indexOf('/roosters/') >= 0 ||
      url.pathname.indexOf('/latten/') >= 0 || url.pathname.indexOf('/lib/') >= 0) {
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
          return res;
        }
        // De server antwoordt wel, maar met een fout (500, 404, een
        // storing bij GitHub): dan de versie uit de cache, als die er is.
        // Tot v98 kreeg de pagina de fout, en ontbrak er een stuk van de
        // app terwijl het gewoon in de cache stond (v99).
        return caches.match(e.request).then(hit => hit || res);
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
