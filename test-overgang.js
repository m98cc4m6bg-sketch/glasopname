/* Testreeks overgang — OUD=/map/van/live node test-overgang.js
   De echte situatie (13 oktober 2026, gemeld door Jan): v98 stond live, Jan
   zet v100 online. Op de Mac en de iPhone (app op het beginscherm) komt er
   geen melding, en de iPhone blijft op v98 staan.

   Dat zagen de andere tests niet: test-v99.js test het bijwerken van de
   nieuwe versie naar een nóg nieuwere. Maar wat er gebeurt als je een versie
   online zet, bepaalt de code van de versie die op het apparaat draait, dus
   de OUDE. Deze test begint daarom met de versie die nu live staat en zet
   dan deze nieuwe versie 'online'.

   Belofte: elk apparaat komt op de nieuwe versie, zonder gegevens te
   verliezen, ook een app op het beginscherm die niet herladen kan worden.     */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { chromium } = require('/home/claude/node_modules/playwright');

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra !== undefined && extra !== '' ? '  → ' + extra : ''));
  if (!ok) fouten++;
}
const wacht = ms => new Promise(r => setTimeout(r, ms));
async function wachtTot(voorwaarde, maximaal) {
  const eind = Date.now() + (maximaal || 10000);
  while (Date.now() < eind) { if (await voorwaarde()) return true; await wacht(150); }
  return false;
}

/* ─── de nagebootste Supabase (node-kant) ─────────────────────── */
const IK = { id: 'u1', email: 'julian@jelierbouw.nl' };
const BART = { id: 'u2', email: 'bart@jelierbouw.nl' };
const WACHTWOORD = { 'julian@jelierbouw.nl': 'geheim', 'bart@jelierbouw.nl': 'bart123' };
const P = n => '00000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');

const S = {
  db: {}, opslag: new Map(), offline: false, geweigerd: 0, wie: IK, sporen: [], uploads: [],
  limiet: 52428800, soorten: null
};
function leegProject(n, naam, extra) {
  return Object.assign({
    id: P(n), naam: naam, datum: '', status: 'aangemaakt', aantal_ruiten: 0, adres: '',
    open_taken: 0, gewijzigd_naam: '', updated_at: '2026-10-01T09:00:00Z', verwijderd_op: null,
    data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: naam,
            datum: '', speling: '4', bijtelling: '11' }
  }, extra || {});
}
function ruit(id, merk, b, h) {
  return { id: id, aantal: 1, merk: merk, maatsoort: 'Sponningmaat', breedte: b, hoogte: h, glasType: '',
           opbouw: '', rooster: 'Nee', glasbewerking: 'Helder (standaard)', roedenverdeling: 'Geen roedenverdeling' };
}
function resetDb() {
  const besteld = leegProject(1, 'Besteld project', { status: 'besteld', besteld_op: '2026-10-10T10:00:00Z' });
  besteld.data.rijen = [ruit(1, 'A', '800', '600')];
  besteld.data.volgendId = 2;
  besteld.data.info = { status: 'besteld', besteld: { op: '2026-10-10T10:00:00Z', door: 'julian' }, opnemer: 'bart',
                        klant: 'Fam. Besteld', straat: 'Kade 2', postcode: '3311 AA', plaats: 'Dordrecht',
                        leverAdres: 'werkplaats', leverInstructie: 'Bij de poort' };
  const vol = leegProject(8, 'Klantproject');
  vol.data.rijen = [ruit(1, 'K', '1000', '1200')];
  vol.data.volgendId = 2;
  vol.data.info = { klant: 'Fam. de Vries', contact: 'Anna de Vries', telefoon: '06-12345678',
                    straat: 'Voorstraat 12', postcode: '3311 ER', plaats: 'Dordrecht',
                    email: 'anna@voorbeeld.nl', soortKlant: 'Particulier',
                    referentie: 'OPD-2026-114', status: 'bezig met inmeten/verwerken', opnemer: 'julian',
                    bereikbaar: 'Sleutel bij de buren (nr 14)', notities: 'Klant wil graag voor de kerst klaar.\nHond in de tuin.',
                    leverAdres: 'werk', leverSoort: 'week', leverWeek: 46,
                    leverWeekTekst: 'week 46 (09-11 t/m 15-11)', leverInstructie: 'Glas in de garage zetten, code 4411.' };
  vol.data.fotos = [{ id: 'fl', soort: 'lever', pad: P(8) + '/lever.jpg', breedte: 600, hoogte: 400, markeringen: [],
                      inkt: [{ t: 'lijn', k: '#ff0000', d: 6, p: [[100, 100], [900, 600]] }] }];
  // Project 9: veel van alles, zodat de projectgegevens over pagina's lopen.
  const lang = leegProject(9, 'Lang project');
  lang.data.rijen = [ruit(1, 'L', '700', '700')];
  lang.data.volgendId = 2;
  lang.data.info = Object.assign({}, vol.data.info, {
    notities: Array.from({ length: 45 }, (_, i) => 'Notitieregel ' + (i + 1) + ': kozijn ' + (i + 1) + ' controleren.').join('\n') });
  lang.data.fotos = [Object.assign({}, vol.data.fotos[0], { pad: P(9) + '/lever.jpg' })];
  S.db = {
    projecten: [besteld, leegProject(2, 'Nieuw project'), vol, lang],
    taken: [{ id: 't1', project_id: P(8), tekst: 'Rooster nameten', klaar: false, eigenaar: 'u2', eigenaar_naam: 'bart', volgorde: 1 },
            { id: 't2', project_id: P(8), tekst: 'Sleutel ophalen', klaar: true, eigenaar: 'u1', eigenaar_naam: 'julian', volgorde: 2 }],
    projectgeschiedenis: [
      { id: 'g1', project_id: P(8), moment: '2026-10-11T08:15:00Z', wie_naam: 'julian', samenvatting: '1 ruit toegevoegd' },
      { id: 'g2', project_id: P(8), moment: '2026-10-12T14:40:00Z', wie_naam: 'bart', samenvatting: 'leverweek gekozen' }],
    // Project 9: dertig regels, de grens van glasGeschiedenis.
    // (De twee hierboven horen bij project 8.)
    mailverzonden: [{ id: 'm1', project_id: P(8), moment: '2026-10-12T15:00:00Z', wie_naam: 'julian', gelukt: true,
                      soort: 'bestel', aan: 'orders@noordenne.nl' }],
    app_data: [],
    gebruikers: [{ id: 'u1', naam: 'julian', email: IK.email, actief: true },
                 { id: 'u2', naam: 'bart', email: BART.email, actief: true }],
    mailadressen: []
  };
}
resetDb();

function dbVraag(st) {
  const lijst = S.db[st.tabel] || (S.db[st.tabel] = []);
  const past = r => Object.keys(st.filters).every(k => r[k] === st.filters[k]) &&
    st.leeg.every(k => r[k] == null) && st.gevuld.every(k => r[k] != null);
  if (st.op === 'insert') {
    const nieuw = (Array.isArray(st.nieuw) ? st.nieuw : [st.nieuw]).map((v, i) => {
      const r = Object.assign({ id: 'n' + Date.now() + i, updated_at: new Date().toISOString() }, v);
      lijst.push(r);
      return r;
    });
    return { data: st.enkel ? nieuw[0] : nieuw, error: null };
  }
  if (st.op === 'update') {
    // Zoals 21_versieslot.sql: een lager versienummer dan er staat, weigeren.
    if (st.tabel === 'projecten' && st.velden && st.velden.data) {
      const nr = d => (/^[0-9]+$/.test(String((d || {})._versieNr)) ? +d._versieNr : 0);
      const fout = lijst.filter(r => Object.keys(st.filters).every(k => r[k] === st.filters[k]))
        .some(r => nr(st.velden.data) < nr(r.data));
      if (fout) {
        S.geweigerd++;
        return { data: null, error: { code: 'P0001',
          message: 'Verouderde app-versie: tik op ↻ Bijwerken. Je werk blijft op dit apparaat staan.' } };
      }
    }
    if (st.tabel === 'projecten' && st.velden && st.velden.samenvatting) S.sporen.push(st.velden.samenvatting);
    const geraakt = lijst.filter(past);
    geraakt.forEach(r => Object.assign(r, JSON.parse(JSON.stringify(st.velden))));
    return { data: st.terug ? geraakt.map(r => ({ id: r.id })) : null, error: null };
  }
  if (st.op === 'delete') {
    const weg = lijst.filter(past);
    S.db[st.tabel] = lijst.filter(r => weg.indexOf(r) < 0);
    return { data: st.terug ? weg.map(r => ({ id: r.id })) : null, error: null };
  }
  const r = lijst.filter(past);
  return { data: st.enkel ? (JSON.parse(JSON.stringify(r[0] || null))) : JSON.parse(JSON.stringify(r)), error: null };
}

function opslagVraag(v) {
  if (v.actie === 'upload') {
    if (S.offline) return { data: null, error: { name: 'StorageUnknownError', message: 'Failed to fetch' } };
    S.uploads.push(v.pad);
    if (S.opslag.has(v.pad)) return { data: null, error: { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' } };
    if (v.grootte > S.limiet) {
      return { data: null, error: { statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' } };
    }
    if (S.soorten && S.soorten.indexOf(v.type) < 0) {
      return { data: null, error: { statusCode: '415', error: 'invalid_mime_type', message: 'mime type ' + v.type + ' is not supported' } };
    }
    S.opslag.set(v.pad, { buf: Buffer.from(v.data, 'base64'), type: v.type });
    return { data: { path: v.pad }, error: null };
  }
  if (v.actie === 'link') {
    if (S.offline) return { data: null, error: { name: 'StorageUnknownError', message: 'Failed to fetch' } };
    const f = S.opslag.get(v.pad);
    if (!f) return { data: null, error: { statusCode: '404', error: 'not_found', message: 'Object not found' } };
    return { data: { signedUrl: 'data:' + f.type + ';base64,' + f.buf.toString('base64') }, error: null };
  }
  if (v.actie === 'list') {
    if (S.offline) return { data: null, error: { message: 'Failed to fetch' } };
    const voor = v.pad + '/';
    const namen = new Map();
    for (const p of S.opslag.keys()) {
      if (p.indexOf(voor) !== 0) continue;
      const rest = p.slice(voor.length);
      const deel = rest.split('/')[0];
      if (rest.indexOf('/') >= 0) namen.set(deel, { name: deel, id: null, metadata: null });
      else namen.set(deel, { name: deel, id: 'id-' + deel, metadata: {} });
    }
    return { data: Array.from(namen.values()).slice(0, 500), error: null };
  }
  if (v.actie === 'remove') {
    (v.paden || []).forEach(p => S.opslag.delete(p));
    return { data: (v.paden || []).map(p => ({ name: p })), error: null };
  }
  return { data: null, error: { message: 'onbekend' } };
}

// De namaak die de pagina krijgt in plaats van lib/supabase-js.
const NAMAAK = `(function () {
  function b64(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var s = '', u = new Uint8Array(buf);
      for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return btoa(s);
    });
  }
  function bouwer(tabel) {
    var st = { tabel: tabel, op: null, filters: {}, leeg: [], gevuld: [], terug: false };
    var b = {};
    b.select = function () { if (!st.op) st.op = 'select'; else st.terug = true; return b; };
    b.insert = function (v) { st.op = 'insert'; st.nieuw = v; return b; };
    b.update = function (v) { st.op = 'update'; st.velden = v; return b; };
    b.delete = function () { st.op = 'delete'; return b; };
    b.eq = function (k, v) { st.filters[k] = v; return b; };
    b.is = function (k) { st.leeg.push(k); return b; };
    b.not = function (k) { st.gevuld.push(k); return b; };
    b.or = b.order = b.limit = b.filter = b.match = b.range = b.in = function () { return b; };
    function vraag(enkel) { st.enkel = enkel; return window.__db(JSON.stringify(st)).then(JSON.parse); }
    b.single = function () { return vraag(true); };
    b.maybeSingle = function () { return vraag(true); };
    b.then = function (g, f) { return vraag(false).then(g, f); };
    return b;
  }
  function opslag(v) { return window.__opslag(JSON.stringify(v)).then(JSON.parse); }
  window.supabase = { createClient: function () { return {
    auth: {
      getSession: function () { return window.__sessie().then(JSON.parse); },
      signInWithPassword: function (g) { return window.__login(JSON.stringify(g)).then(JSON.parse); },
      signOut: function () { return Promise.resolve({ error: null }); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
    },
    from: bouwer,
    functions: { invoke: function () { return Promise.resolve({ data: { ok: true }, error: null }); } },
    channel: function () { var k = { state: 'joined' }; k.on = function () { return k; };
      k.subscribe = function (cb) { if (cb) cb('SUBSCRIBED'); return k; }; return k; },
    removeChannel: function () {},
    storage: { from: function () { return {
      upload: function (pad, blob, o) {
        return b64(blob).then(function (d) {
          return opslag({ actie: 'upload', pad: pad, data: d, grootte: blob.size,
                          type: (o && o.contentType) || blob.type });
        });
      },
      list: function (p) { return opslag({ actie: 'list', pad: p }); },
      remove: function (paden) { return opslag({ actie: 'remove', paden: paden }); },
      createSignedUrl: function (pad) { return opslag({ actie: 'link', pad: pad }); }
    }; } }
  }; } };
})();`;

/* ─── de app serveren ─────────────────────────────────────────── */
// De versie die nu live staat (OUD) en deze nieuwe versie (de map waar
// deze test in staat). OUD haal je met git uit de repo, bijvoorbeeld:
//   git -C <repo> archive <commit-van-wat-live-staat> | tar -x -C /tmp/oud
//   OUD=/tmp/oud node test-overgang.js
// Zonder OUD slaat deze test zichzelf over (de oude versie zit niet in de zip).
const OUD = process.env.OUD || '';
if (!OUD || !fs.existsSync(path.join(OUD, 'index.html'))) {
  console.log('OVERGESLAGEN: geef met OUD=… de map van de versie die nu live staat (zie de kop van dit bestand).');
  process.exit(0);
}
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-overgang-'));
function zetBestanden(bron) {
  fs.readdirSync(bron).forEach(function (naam) {
    const p = path.join(bron, naam);
    if (naam === 'config.js' || naam.startsWith('.')) return;
    if (fs.statSync(p).isDirectory()) {
      if (['lib', 'catalogus', 'roosters', 'supabase'].indexOf(naam) >= 0)
        fs.cpSync(p, path.join(map, naam), { recursive: true });
      return;
    }
    fs.copyFileSync(p, path.join(map, naam));
  });
}
zetBestanden(OUD);
fs.writeFileSync(path.join(map, 'config.js'),
  'window.GLASOPNAME_CONFIG = { url: "https://test.supabase.co", anonKey: "sb_publishable_test",\n' +
  '  updateTijden: { aftellen: 4000, leeg: 2000, stil: 1500 } };\n');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg',
                '.webmanifest': 'application/manifest+json' };
const server = http.createServer(function (req, res) {
  let naam = decodeURIComponent(req.url.split('?')[0]);
  if (naam === '/') naam = '/index.html';
  // Geen bereik: de server is onbereikbaar. Alleen ctx.setOffline is niet
  // genoeg, want dat raakt de service worker niet: die haalde dan gewoon
  // van de server en de test bewees niets over de cache.
  if (S.serverUit) { req.socket.destroy(); return; }
  // Een download die halverwege mislukt (bouwplaats, slecht bereik).
  if (S.weiger && S.weiger.has(naam)) { res.writeHead(500); res.end(); return; }
  if (naam.indexOf('/lib/supabase-js') === 0) {
    res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(NAMAAK); return;
  }
  const bestand = path.join(map, naam);
  if (!bestand.startsWith(map) || !fs.existsSync(bestand) || fs.statSync(bestand).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(bestand)] || 'application/octet-stream' });
  res.end(fs.readFileSync(bestand));
});

let adres, browser;
async function nieuweContext(opties) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 },
    serviceWorkers: 'allow', acceptDownloads: true }, opties || {}));
  await ctx.exposeFunction('__db', s => JSON.stringify(dbVraag(JSON.parse(s))));
  await ctx.exposeFunction('__opslag', s => JSON.stringify(opslagVraag(JSON.parse(s))));
  await ctx.exposeFunction('__sessie', () => JSON.stringify(
    { data: { session: S.wie ? { access_token: 't0k', user: S.wie } : null }, error: null }));
  await ctx.exposeFunction('__login', s => {
    const g = JSON.parse(s);
    if (WACHTWOORD[g.email] && WACHTWOORD[g.email] === g.password) {
      const u = g.email === BART.email ? BART : IK;
      return JSON.stringify({ data: { user: u, session: { access_token: 't0k', user: u } }, error: null });
    }
    return JSON.stringify({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } });
  });
  // Geen echt opslagvenster in een test: dan downloadt de app gewoon.
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  return ctx;
}
const consoleFouten = [];
async function nieuwePagina(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', e => consoleFouten.push(String(e)));
  return page;
}
async function open(page, n) {
  // Eerst weg: alleen het #-deel veranderen is geen nieuwe pagina, en dan
  // blijft het vorige project staan.
  await page.goto('about:blank');
  await page.goto(adres + '#project=' + P(n));
  await page.waitForFunction(id => {
    const v = document.getElementById('projectNaam');
    return v && v.value && window.glasProjectId === id;
  }, P(n), { timeout: 15000 });
  await wacht(600);
}
function rij(n) { return S.db.projecten.find(p => p.id === P(n)); }
async function venster(page) {
  await page.waitForSelector('.melding-laag', { timeout: 5000 });
  return page.locator('.melding-laag').last();
}
async function vensterTekst(page) {
  return (await (await venster(page)).locator('.melding-tekst').innerText()).replace(/\s+/g, ' ');
}
async function vensterKnop(page, tekst) {
  await (await venster(page)).locator('.melding-knoppen button', { hasText: tekst }).click();
  await wacht(150);
}
async function wachtOpOpslaan(page) {
  await page.evaluate(() => window.opslaan && window.opslaan());
  await wacht(2500);
}

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  // Een echte foto: 3000 × 2000, gemaakt in de browser, als JPEG met
  // camera-achtige naam. De app verkleint naar 1600; het origineel moet
  // byte voor byte gelijk blijven.
  const ctx0 = await nieuweContext();
  const p0 = await ctx0.newPage();
  await p0.goto('about:blank');
  const jpg64 = await p0.evaluate(() => new Promise(ok => {
    const c = document.createElement('canvas'); c.width = 3000; c.height = 2000;
    const g = c.getContext('2d');
    const k = g.createLinearGradient(0, 0, 3000, 2000); k.addColorStop(0, '#2a6'); k.addColorStop(1, '#14c');
    g.fillStyle = k; g.fillRect(0, 0, 3000, 2000);
    for (let i = 0; i < 400; i++) { g.fillStyle = 'hsl(' + (i * 37 % 360) + ',70%,50%)'; g.fillRect((i * 131) % 3000, (i * 71) % 2000, 60, 40); }
    c.toBlob(b => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.readAsDataURL(b); }, 'image/jpeg', 0.95);
  }));
  await ctx0.close();
  const fotoMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v99-fotos-'));
  const JPG = path.join(fotoMap, 'IMG_0001.JPG');
  fs.writeFileSync(JPG, Buffer.from(jpg64, 'base64'));
  const PNG = path.join(fotoMap, 'inrit.png');
  fs.copyFileSync('icon-512.png', PNG);
  const jpgBytes = fs.readFileSync(JPG), pngBytes = fs.readFileSync(PNG);
  console.log('   (testfoto: ' + Math.round(jpgBytes.length / 1024) + ' kB, 3000 × 2000)');

  const versieVan = async pg => { try { return await pg.evaluate(() => APP_VERSIE); } catch (e) { return null; } };
  const evalVeilig = async (pg, f, a) => { try { return await pg.evaluate(f, a); } catch (e) { return undefined; } };
  const NIEUW = 'v' + fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').match(/const APP_VERSIE = 'v(\d+)'/)[1];
  const OUDV = 'v' + fs.readFileSync(path.join(OUD, 'index.html'), 'utf8').match(/const APP_VERSIE = 'v(\d+)'/)[1];
  console.log('   (van ' + OUDV + ' naar ' + NIEUW + ')');
  // Wat de oude versie zelf doet bij openen en bij terugkeer in beeld: kijken
  // of er een nieuwe service worker is.
  const controle = pg => evalVeilig(pg, () => navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {}));

  /* ─── 1 ─────────────────────────────────────────────────────── */
  console.log('\n1. De app staat open op het startscherm (iPhone, app op het beginscherm)');
  let ctx = await nieuweContext();
  let page = await nieuwePagina(ctx);
  await page.goto(adres);
  await page.waitForFunction(() => document.body.classList.contains('op-start'), null, { timeout: 15000 });
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 });
  await wacht(1500);
  check('het apparaat draait ' + OUDV, (await versieVan(page)) === OUDV);
  zetBestanden(__dirname);
  await controle(page);
  check('zonder iets aan te raken komt het apparaat op ' + NIEUW + ' (tot nu: bleef op ' + OUDV + ')',
        await wachtTot(async () => (await versieVan(page)) === NIEUW, 40000), await versieVan(page));
  check('… en staat het gewoon op het startscherm',
        await wachtTot(async () => await evalVeilig(page, () => document.body.classList.contains('op-start')), 10000));
  await ctx.close();

  /* ─── 2 ─────────────────────────────────────────────────────── */
  console.log('\n2. Midden in het werk op de oude versie (iPad op de steiger)');
  zetBestanden(OUD);
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await page.goto('about:blank');
  await page.goto(adres + '#project=' + P(8));
  await page.waitForFunction(id => window.glasProjectId === id, P(8), { timeout: 15000 });
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 });
  await wacht(1500);
  check('het apparaat draait ' + OUDV + ', project open', (await versieVan(page)) === OUDV);
  await page.evaluate(() => { if (window.klantBlokOpen) klantBlokOpen(); });
  await page.click('#pi-contact');
  await page.keyboard.press('End');
  await page.keyboard.type(' (overgang)');
  const getypt = await page.evaluate(() => projectInfo.contact);
  zetBestanden(__dirname);
  await controle(page);
  check('het apparaat komt op ' + NIEUW, await wachtTot(async () => (await versieVan(page)) === NIEUW, 40000));
  check('wat er getypt was, staat in de database (harde eis)',
        await wachtTot(async () => rij(8).data.info.contact === getypt, 20000), rij(8).data.info.contact);
  // Vanaf v99 gaat de app na het opslaan naar het startscherm, met 'Verder
  // met …' (keuze van Jan); bij een oudere versie gaat het project meteen
  // weer open. Beide goed, zolang het werk terug te vinden is.
  await wachtTot(async () => (await evalVeilig(page, () => !!window.glasProjectId)) ||
    (await page.locator('.melding-laag button', { hasText: 'Verder met' }).count()) > 0, 15000);
  if (await page.locator('.melding-laag button', { hasText: 'Verder met' }).count()) {
    await page.locator('.melding-laag button', { hasText: 'Verder met' }).click();
  }
  check('… en na het herladen terug te vinden in het project',
        await wachtTot(async () => (await evalVeilig(page, () => typeof projectInfo !== 'undefined' && window.glasProjectId &&
          projectInfo.contact)) === getypt, 15000));
  await ctx.close();

  check('geen fouten in de pagina', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  fs.rmSync(map, { recursive: true, force: true });
  fs.rmSync(fotoMap, { recursive: true, force: true });
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
