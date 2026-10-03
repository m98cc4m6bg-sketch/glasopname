/* Rooktest v83 — node test-rook.js
   Start de app in een echte browser (Chromium) zonder Supabase en kijkt
   of alles laadt, rekent en tekent zonder fouten in de console. Bedoeld
   om te merken dat een wijziging in één bestand iets anders sloopt.     */
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

// Een kopie van de map met een lege config: dan blijft de app lokaal en
// wordt er niets naar Supabase gestuurd.
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-'));
fs.readdirSync('.').forEach(function (naam) {
  if (fs.statSync(naam).isDirectory()) return;
  fs.copyFileSync(naam, path.join(map, naam));
});
fs.writeFileSync(path.join(map, 'config.js'),
  'window.GLASOPNAME_CONFIG = { url: "VUL_IN", anonKey: "VUL_IN" };\n');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png',
                '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(function (req, res) {
  var naam = decodeURIComponent(req.url.split('?')[0]);
  if (naam === '/') naam = '/index.html';
  var bestand = path.join(map, naam);
  if (!bestand.startsWith(map) || !fs.existsSync(bestand)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(bestand)] || 'application/octet-stream' });
  res.end(fs.readFileSync(bestand));
});

(async function () {
  await new Promise(function (r) { server.listen(0, r); });
  const adres = 'http://127.0.0.1:' + server.address().port + '/index.html';

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

  const consoleFouten = [];
  // Netwerkfouten horen erbij in deze opstelling: de Supabase-bibliotheek
  // is geblokkeerd en de fotomappen zijn niet meegekopieerd. Het gaat hier
  // om fouten in de app zelf.
  page.on('console', function (m) {
    if (m.type() !== 'error') return;
    var t = m.text();
    if (t.indexOf('Failed to load resource') >= 0) return;
    consoleFouten.push(t);
  });
  page.on('pageerror', function (e) { consoleFouten.push(String(e)); });

  // De bibliotheek van Supabase komt van een CDN; die blokkeren we, zodat
  // de test ook zonder internet draait.
  await page.route('**/cdn.jsdelivr.net/**', function (route) { route.abort(); });

  await page.goto(adres, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  console.log('\n1. De app start');
  check('de kopbalk staat er', await page.locator('header h1').innerText() === 'Glasopname');
  check('de invoertabel is opgebouwd', await page.locator('#invoerBody tr').count() >= 5,
    (await page.locator('#invoerBody tr').count()) + ' regels');
  check('geen fouten in de console', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' | '));

  console.log('\n2. Een ruit invullen en narekenen');
  await page.fill('#invoerBody tr:first-child .merk-input', 'A');
  await page.fill('#invoerBody tr:first-child .breedte-input', '1000');
  await page.fill('#invoerBody tr:first-child .hoogte-input', '2000');
  await page.selectOption('#invoerBody tr:first-child .kol-type select', 'HR++ glas');
  await page.waitForTimeout(100);
  await page.selectOption('#invoerBody tr:first-child .kol-opbouw select', '4-15-4');
  await page.waitForTimeout(200);
  const br = await page.locator('#invoerBody tr:first-child td.berekend').first().innerText();
  check('glasmaat 1000 − 2×4 = 992', br.trim() === '992', br.trim());

  console.log('\n3. De tabbladen doen het');
  await page.click('.tab-btn:has-text("Bestellijst")');
  await page.waitForTimeout(200);
  const bestel = await page.locator('#bestellijstInhoud').innerText();
  check('de ruit staat op de bestellijst', bestel.indexOf('992') >= 0);
  await page.click('.tab-btn:has-text("Samenvatting")');
  await page.waitForTimeout(200);
  check('de samenvatting is gevuld',
    (await page.locator('#samenvattingInhoud').innerText()).indexOf('992') >= 0);
  await page.click('.tab-btn:has-text("Naslag")');
  await page.waitForTimeout(400);
  check('de naslag is gevuld', (await page.locator('#naslagInhoud').innerText()).length > 200);
  await page.click('.tab-btn:has-text("Project info")');
  await page.waitForTimeout(200);
  check('project info is gevuld', (await page.locator('#panel-project').innerText()).length > 100);

  console.log('\n4. De lokale kopie');
  const kopie = await page.evaluate(function () { return localStorage.getItem('glasopname_v2'); });
  const staat = JSON.parse(kopie || '{}');
  check('de ruit is lokaal bewaard', (staat.rijen || []).some(function (r) { return r.merk === 'A'; }));
  check('met een plek voor foto\'s, info en taken',
    Array.isArray(staat.fotos) && !!staat.info && Array.isArray(staat.taken));

  console.log('\n5. De bestelmail met de bestellijst als bijlage (v88)');
  // Hier draait echte jsPDF, dus dit is de plek om na te gaan dat er
  // werkelijk een pdf in de mail belandt. De mailfunctie zelf wordt
  // onderschept; er gaat niets de deur uit.
  // De pdf-bibliotheek komt normaal van een CDN, en dat is hier geblokkeerd.
  // In plaats van blokkeren geven we de plaatselijke kopie terug; zo maakt
  // de app een échte pdf, ook zonder internet. (Een later toegevoegde route
  // gaat in Playwright vóór de eerdere.)
  await page.route('**/jspdf.umd.min.js', function (route) {
    route.fulfill({ path: '/home/claude/node_modules/jspdf/dist/jspdf.umd.min.js',
                    contentType: 'text/javascript' });
  });
  await page.route('**/jspdf.plugin.autotable.min.js', function (route) {
    route.fulfill({ path: '/home/claude/node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js',
                    contentType: 'text/javascript' });
  });
  await page.evaluate(function () {
    window.__mail = null;
    window.glasProjectId = 'rook-1234';
    window.glasMailAdressen = function () {
      return Promise.resolve([{ id: 'm1', soort: 'leverancier', naam: 'Test',
                                adres: 'verkoop@test.invalid', standaard: true, actief: true }]);
    };
    window.glasGebruiker = function () { return { id: 'u1', naam: 'tester', email: 't@test.invalid' }; };
    window.glasMail = function (bericht) {
      window.__mail = bericht;
      return Promise.resolve({ ok: true, id: 'test' });
    };
    bestelmailVenster();
  });
  await page.waitForSelector('#mailVerstuur', { timeout: 5000 });
  check('het bestelmailvenster opent', await page.locator('#mailVerstuur').isVisible());
  check('het vaste adres staat aangevinkt',
    await page.locator('.mail-adres input[value="verkoop@test.invalid"]').isChecked());
  await page.click('#mailVerstuur');
  await page.waitForFunction(function () { return !!window.__mail; }, null, { timeout: 20000 });
  const post = await page.evaluate(function () {
    var m = window.__mail;
    return { soort: m.soort, aan: m.aan, naam: m.bijlage && m.bijlage.naam,
             lengte: (m.bijlage && m.bijlage.inhoud || '').length,
             begin: (m.bijlage && m.bijlage.inhoud || '').slice(0, 8),
             tekst: (m.tekst || '').slice(0, 40) };
  });
  check('de mail gaat naar het gekozen adres', (post.aan || [])[0] === 'verkoop@test.invalid');
  check('er zit een pdf bij', /\.pdf$/.test(post.naam || ''), post.naam);
  check('en die pdf heeft inhoud', post.lengte > 20000, post.lengte + ' tekens base64');
  check('het is echt een pdf (JVBERi0 = %PDF-)', (post.begin || '').indexOf('JVBERi0') === 0, post.begin);
  check('het bestelmoment is vastgelegd',
    await page.evaluate(function () { return !!(projectInfo.besteld && projectInfo.besteld.op); }));

  console.log('\n6. Herstart met openstaand werk');
  await page.evaluate(function () { localStorage.setItem('glasopname_pending', '1'); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const naHerstart = await page.evaluate(function () {
    return { rijen: rijen.length, merk: (rijen[0] || {}).merk, fotos: fotos.length };
  });
  check('de ruit is er na de herstart nog', naHerstart.merk === 'A', JSON.stringify(naHerstart));
  check('nog steeds geen fouten in de console', consoleFouten.length === 0,
    consoleFouten.slice(0, 3).join(' | '));

  await browser.close();
  server.close();
  fs.rmSync(map, { recursive: true, force: true });

  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})();
