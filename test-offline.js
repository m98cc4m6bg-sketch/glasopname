/* Testreeks v91 — node test-offline.js
   De service worker in een echte Chromium: na de eerste keer laden, zonder
   bereik opnieuw openen. Dan moeten de app én de bibliotheken uit de cache
   komen. Tot v90 kwamen jsPDF, xlsx en pdf.js van de CDN en stonden ze
   daardoor na een update niet in de cache: de eerste pdf of import kon dan
   alleen online.
   Let op: Chromium, niet Safari. Safari heeft eigen grenzen aan de cache van
   een service worker; dat kan hier niet nagebootst worden.               */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { chromium } = require('/home/claude/node_modules/playwright');

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}

// Een kopie met een config die nergens heen wijst (poort 1 weigert meteen):
// de service worker wordt alleen geregistreerd als er een config is, maar
// er mag niets naar het echte Supabase gaan.
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-offline-'));
fs.readdirSync('.').forEach(function (naam) {
  if (fs.statSync(naam).isDirectory()) return;
  fs.copyFileSync(naam, path.join(map, naam));
});
fs.cpSync('lib', path.join(map, 'lib'), { recursive: true });
fs.writeFileSync(path.join(map, 'config.js'),
  'window.GLASOPNAME_CONFIG = { url: "http://127.0.0.1:1", anonKey: "sb_publishable_test" };\n');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png',
                '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
let verzoeken = [];
const sockets = new Set();
const server = http.createServer(function (req, res) {
  var naam = decodeURIComponent(req.url.split('?')[0]);
  verzoeken.push(naam);
  if (naam === '/') naam = '/index.html';
  var bestand = path.join(map, naam);
  if (!bestand.startsWith(map) || !fs.existsSync(bestand) || fs.statSync(bestand).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(bestand)] || 'application/octet-stream' });
  res.end(fs.readFileSync(bestand));
});

server.on('connection', function (s) { sockets.add(s); s.on('close', function () { sockets.delete(s); }); });

(async function () {
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  const adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n1. Eerste keer laden, met bereik');
  await page.goto(adres, { waitUntil: 'load' });
  const klaar = await page.evaluate(function () {
    return Promise.race([
      navigator.serviceWorker.ready.then(function (reg) { return !!reg.active; }),
      new Promise(function (r) { setTimeout(function () { r('geen service worker na 20 s'); }, 20000); })
    ]);
  });
  check('de service worker is actief', klaar);
  // Bij de allereerste keer neemt de service worker de pagina over en
  // herlaadt cloud.js hem één keer (controllerchange). Daarop wachten.
  await page.waitForTimeout(2500);
  await page.waitForLoadState('load');
  // Wachten tot alles in de cache staat (install wacht op de shell).
  const inCache = await page.evaluate(async function () {
    const namen = await caches.keys();
    const c = await caches.open(namen.find(n => /^glasopname-/.test(n)));
    const sleutels = (await c.keys()).map(r => new URL(r.url).pathname);
    return { cache: namen.join(','), lib: sleutels.filter(p => p.indexOf('/lib/') >= 0) };
  });
  check('de cache heet naar de versie', /glasopname-v\d+/.test(inCache.cache), inCache.cache);
  check('alle zes de bibliotheken staan er meteen in, ook zonder ze te gebruiken',
    inCache.lib.length === 6, inCache.lib.length + ': ' + inCache.lib.join(', '));

  console.log('\n2. Zonder bereik opnieuw openen');
  // Echt geen net: de server gaat uit. (Het offline-knopje van de browser
  // geldt in Chromium niet voor de verzoeken van de service worker zelf,
  // dus daarmee bewijs je niets.)
  await new Promise(function (r) { server.close(r); for (const s of sockets) s.destroy(); });
  verzoeken = [];
  await page.reload({ waitUntil: 'load' });
  check('de app start', (await page.locator('header h1').innerText()) === 'Glasopname');
  check('Supabase is er (uit de cache)', await page.evaluate(() => !!(window.supabase && window.supabase.createClient)));
  const pdfLezer = await page.evaluate(async function () {
    try { const lib = await window.pdfBibliotheek(); return !!(lib && lib.getDocument); }
    catch (e) { return 'fout: ' + e.message; }
  });
  check('de pdf-lezer laadt zonder bereik (import en kozijntekening)', pdfLezer === true, String(pdfLezer));
  const jspdf = await page.evaluate(function () {
    return new Promise(function (ok) {
      const s = document.createElement('script');
      s.src = 'lib/jspdf-2.5.2/jspdf.umd.min.js';
      s.onload = function () { ok(!!(window.jspdf && window.jspdf.jsPDF)); };
      s.onerror = function () { ok('kon niet laden'); };
      document.head.appendChild(s);
    });
  });
  check('jsPDF laadt zonder bereik (de pdf\'s)', jspdf === true, String(jspdf));
  check('en de server kreeg niets binnen (hij stond uit)', verzoeken.length === 0, verzoeken.join(', '));

  await browser.close();
  fs.rmSync(map, { recursive: true, force: true });
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})();
