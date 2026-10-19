/* Testreeks v99 — node test-v99.js
   Bijwerken naar een nieuwe versie, in Chromium mét service worker. De
   server krijgt halverwege een hoger versienummer, net als wanneer Jan
   een nieuwe versie online zet. Harde eis van Jan: nooit gegevens kwijt.

     1. Op het startscherm: de balk is te zien en de app werkt vanzelf bij
     2. In een project, midden in het typen: wacht tot je stil bent, slaat
        op, gaat naar het startscherm, werkt bij, 'Verder met …'
     3. Zonder bereik: het werk blijft op het apparaat en gaat erna omhoog
     4. Een oudere versie mag een nieuwer project niet overschrijven
     5. Twee tabbladen: het andere tabblad stelt eerst zijn werk veilig
     6. ↻ Bijwerken zonder nieuwe versie: eerst opslaan, dan herladen
     7. Zonder bereik: de controle op een nieuwe versie doet niets kapot
     8. Een nieuwe versie die maar half binnenkomt, wordt niet geïnstalleerd

   De aftel- en wachttijden zijn hier kort (config.js, updateTijden); in de
   app zijn ze 60 s (10 s zonder project) en 10 s stil.                     */
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
const IK = { id: 'u1', email: 'julian@voorbeeld.test' };
const BART = { id: 'u2', email: 'bart@voorbeeld.test' };
const WACHTWOORD = { 'julian@voorbeeld.test': 'geheim', 'bart@voorbeeld.test': 'bart123' };
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
                      soort: 'bestel', aan: 'bestel@voorbeeld.test' }],
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v99-'));
fs.readdirSync('.').forEach(function (naam) {
  if (fs.statSync(naam).isDirectory()) return;
  fs.copyFileSync(naam, path.join(map, naam));
});
fs.cpSync('lib', path.join(map, 'lib'), { recursive: true });
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
  page.on('pageerror', e => { if (!/sandboxed/.test(String(e))) consoleFouten.push(String(e)); });  // v109: het afgeschermde inlogkader, zie TESTEN.md
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

  // Nieuwe versie 'online zetten': de drie versienummers in de bestanden
  // die de server uitdeelt.
  function zetVersie(n) {
    const v = 'v' + n;
    const pas = (bestand, re, nieuw) => {
      const p = path.join(map, bestand);
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(re, nieuw));
    };
    pas('index.html', /const APP_VERSIE = '[^']*'/, "const APP_VERSIE = '" + v + "'");
    pas('pdf.js', /var PDF_VERSIE = '[^']*'/, "var PDF_VERSIE = '" + v + "'");
    pas('sw.js', /const VERSIE = '[^']*'/, "const VERSIE = '" + v + "'");
  }
  const versieVan = async pg => { try { return await pg.evaluate(() => APP_VERSIE); } catch (e) { return null; } };
  const wachtOpVersie = (pg, v, ms) => wachtTot(async () => (await versieVan(pg)) === v, ms || 30000);
  const balk = async pg => {
    try {
      return await pg.evaluate(() => {
        const b = document.getElementById('updateBalk');
        if (!b || b.hidden) return null;
        const r = b.getBoundingClientRect();
        const bovenop = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { tekst: b.innerText, stand: b.className, bovenop: !!bovenop && b.contains(bovenop) };
      });
    } catch (e) { return null; }
  };
  const offline = async aan => { S.serverUit = aan; await ctx.setOffline(aan); };
  const evalVeilig = async (pg, f, a) => { try { return await pg.evaluate(f, a); } catch (e) { return undefined; } };
  // De versie die nu in de bestanden staat, en de 'nieuwe' versies erna.
  const N0 = +fs.readFileSync('index.html', 'utf8').match(/const APP_VERSIE = 'v(\d+)'/)[1];
  const [N1, N2, N3] = [N0 + 1, N0 + 2, N0 + 3];
  const [V0, V1, V2, V3] = [N0, N1, N2, N3].map(n => 'v' + n);
  const ctx = await nieuweContext();
  let page = await nieuwePagina(ctx);
  // SCHERM=map node test-v99.js maakt onderweg schermafdrukken.
  const foto = async naam => { if (process.env.SCHERM) await page.screenshot({ path: path.join(process.env.SCHERM, naam + '.png') }); };

  /* ─── 1 ─────────────────────────────────────────────────────── */
  console.log('\n1. Op het startscherm');
  await page.goto(adres);
  await page.waitForFunction(() => document.body.classList.contains('op-start'), null, { timeout: 15000 });
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 });
  await wacht(800);
  check('de eerste keer (nieuwe service worker) herlaadt de app niet voor niets',
        (await versieVan(page)) === V0 && !(await balk(page)));
  zetVersie(N1);
  await page.evaluate(() => glasZoekUpdate());
  await wachtTot(async () => !!(await balk(page)), 15000);
  const b1 = await balk(page);
  await foto('99-1-start');
  check('nieuwe versie online: de balk staat óp het startscherm (tot v98 verborgen)',
        !!b1 && b1.bovenop && new RegExp('Nieuwe versie \\(' + V1 + '\\)').test(b1.tekst), b1 && b1.tekst);
  check('… met aftellen en een knop Nu bijwerken, zonder ✕',
        !!b1 && /over \d+ s/.test(b1.tekst) && /Nu bijwerken/.test(b1.tekst) && !/✕/.test(b1.tekst));
  check('de balk is niet weg te tikken (geen sluitknop)',
        (await page.locator('#updateBalk button').count()) === 1);
  check('na het aftellen werkt de app vanzelf bij naar ' + V1, await wachtOpVersie(page, V1));
  await wachtTot(async () => new RegExp('Bijgewerkt naar ' + V1).test(((await balk(page)) || {}).tekst || ''), 10000);
  check('… op het startscherm, met "Bijgewerkt naar ' + V1 + '" kort in de balk',
        await evalVeilig(page, () => document.body.classList.contains('op-start')) &&
        new RegExp('Bijgewerkt naar ' + V1).test(((await balk(page)) || {}).tekst || ''));
  await wachtTot(async () => !(await balk(page)), 10000);
  check('… en de balk is weg', !(await balk(page)));

  /* ─── 2 ─────────────────────────────────────────────────────── */
  console.log('\n2. In een project, midden in het typen');
  await open(page, 8);
  await page.evaluate(() => klantBlokOpen());
  zetVersie(N2);
  await page.evaluate(() => glasZoekUpdate());
  await wachtTot(async () => !!(await balk(page)), 15000);
  const b2 = await balk(page);
  check('de balk staat ook in een project, bovenop', !!b2 && b2.bovenop, b2 && b2.tekst);
  // Blijven typen, langer dan het aftellen duurt.
  await page.click('#pi-contact');
  await page.keyboard.press('End');
  const getypt = ' en Piet';
  let wachtGezien = false;
  for (let i = 0; i < 18; i++) {
    await page.keyboard.type(getypt[i % getypt.length]);
    await wacht(350);
    const b = await balk(page);
    if (b && /wachten/.test(b.stand)) wachtGezien = true;
  }
  await foto('99-2-wachten');
  const contactGetypt = await page.evaluate(() => projectInfo.contact);
  check('wie typt wordt niet onderbroken: na het aftellen wacht de app ("zodra je even niets doet")',
        wachtGezien && (await versieVan(page)) === V1);
  check('bijwerken zodra het stil is', await wachtOpVersie(page, V2));
  check('alles wat getypt is staat in de database (harde eis)',
        rij(8).data.info.contact === contactGetypt, rij(8).data.info.contact);
  check('… opgeslagen door ' + V1 + ', met versienummer ' + N1, rij(8).data._versieNr === N1, rij(8).data._versieNr);
  await wachtTot(async () => (await page.locator('.melding-laag').count()) > 0, 10000);
  check('terug op het startscherm (keuze van Jan)',
        await evalVeilig(page, () => document.body.classList.contains('op-start') && !window.glasProjectId));
  await foto('99-2-melding');
  const m2 = (await vensterTekst(page));
  check('melding: bijgewerkt naar ' + V2 + ', werk opgeslagen', new RegExp('bijgewerkt naar ' + V2).test(m2) && /opgeslagen/.test(m2), m2.slice(0, 120));
  await vensterKnop(page, 'Verder met "Klantproject"');
  await page.waitForFunction(id => window.glasProjectId === id, P(8), { timeout: 15000 });
  await wacht(600);
  check('"Verder met …" opent het project, met wat je typte',
        (await page.evaluate(() => projectInfo.contact)) === contactGetypt);

  /* ─── 3 ─────────────────────────────────────────────────────── */
  console.log('\n3. Zonder bereik');
  zetVersie(N3);
  await page.evaluate(() => glasZoekUpdate());
  await wachtTot(async () => !!(await balk(page)), 15000);
  const telVoor = rij(8).data.info.telefoon;
  await offline(true);
  await page.evaluate(() => klantBlokOpen());
  await page.click('#pi-telefoon');
  await page.keyboard.press('End');
  await page.keyboard.type(' (mobiel)');
  check('zonder bereik gaat er niets naar de server', rij(8).data.info.telefoon === telVoor);
  check('… en toch werkt de app bij (uit de cache van de service worker)', await wachtOpVersie(page, V3));
  await wachtTot(async () => (await evalVeilig(page, () => window.glasProjectId)) === P(8), 15000);
  check('het project gaat meteen weer open, met het werk van dit apparaat',
        (await evalVeilig(page, () => projectInfo.telefoon)) === telVoor + ' (mobiel)');
  check('… met de vlag "moet nog omhoog"',
        (await evalVeilig(page, () => localStorage.getItem('glasopname_pending'))) === '1');
  await wachtTot(async () => (await page.locator('.melding-laag').count()) > 0, 10000);
  const m3 = await vensterTekst(page);
  check('melding: nog niet op de server, staat veilig op dit apparaat', /veilig op dit apparaat/.test(m3), m3.slice(0, 120));
  await vensterKnop(page, 'Oké');
  await offline(false);
  check('weer bereik: het werk gaat alsnog omhoog',
        await wachtTot(async () => rij(8).data.info.telefoon === telVoor + ' (mobiel)', 20000),
        rij(8).data.info.telefoon);
  check('… door ' + V3, rij(8).data._versieNr === N3);

  /* ─── 4 ─────────────────────────────────────────────────────── */
  console.log('\n4. Een oudere versie mag een nieuwer project niet overschrijven');
  // Een collega met een nieuwere app (v500) heeft het project opgeslagen;
  // die versie staat op dit apparaat nog niet klaar.
  rij(8).data._versieNr = 500;
  rij(8).data.info.referentie = 'van de nieuwe app';
  await open(page, 8);
  check('een project van een nieuwere versie: de app merkt het meteen',
        await wachtTot(async () => /nieuwere versie/.test(await evalVeilig(page, () => document.getElementById('cloudStatus').textContent) || ''), 8000),
        await evalVeilig(page, () => document.getElementById('cloudStatus').textContent));
  const geweigerdVoor = S.geweigerd;
  await page.evaluate(() => klantBlokOpen());
  await page.click('#pi-klant');
  await page.keyboard.press('End');
  await page.keyboard.type(' X');
  await wachtTot(async () => S.geweigerd > geweigerdVoor, 10000);
  check('de opslag van de oude versie (' + V3 + ') wordt geweigerd', S.geweigerd > geweigerdVoor);
  check('… de database blijft zoals de nieuwe versie hem achterliet',
        rij(8).data._versieNr === 500 && rij(8).data.info.referentie === 'van de nieuwe app' && !/ X$/.test(rij(8).data.info.klant));
  check('… het werk blijft op het apparaat, met de vlag "moet nog omhoog"',
        await page.evaluate(() => / X$/.test(projectInfo.klant) && localStorage.getItem('glasopname_pending') === '1'));
  check('… en de statusbalk zegt: eerst bijwerken',
        /Eerst bijwerken/.test(await page.evaluate(() => document.getElementById('cloudStatus').textContent)));
  await wacht(2500);
  const pogingen = S.geweigerd;
  await wacht(4000);
  check('… zonder de server te bestoken (hooguit één poging per paar seconden)', S.geweigerd - pogingen <= 2,
        (S.geweigerd - pogingen) + ' pogingen in 4 s');
  zetVersie(500);
  await page.evaluate(() => glasZoekUpdate());
  check('de nieuwe versie komt binnen en de app werkt bij', await wachtOpVersie(page, 'v500', 40000));
  check('daarna gaat het werk alsnog omhoog', await wachtTot(async () => / X$/.test(rij(8).data.info.klant), 20000),
        rij(8).data.info.klant);
  check('… zonder het werk van de nieuwe app weg te gooien (referentie blijft)',
        rij(8).data.info.referentie === 'van de nieuwe app' && rij(8).data._versieNr === 500, rij(8).data.info.referentie);
  if (await page.locator('.melding-laag').count()) await vensterKnop(page, 'Oké');

  /* ─── 5 ─────────────────────────────────────────────────────── */
  console.log('\n5. Twee tabbladen');
  const page2 = await nieuwePagina(ctx);
  await page2.goto('about:blank');
  await page2.goto(adres + '#project=' + P(2));
  await page2.waitForFunction(id => window.glasProjectId === id, P(2), { timeout: 15000 });
  await open(page, 8);
  await wacht(600);
  zetVersie(501);
  await page.evaluate(() => glasZoekUpdate());
  await wachtTot(async () => !!(await balk(page)), 15000);
  // In het andere tabblad blijven typen. Dat tabblad wacht dus zelf (je bent
  // bezig); het eerste werkt bij, en dan moet het andere eerst zijn werk
  // veiligstellen voordat het mee herlaadt. window.name overleeft het
  // herladen: daarin houden we bij wat er in het veld stond.
  await page2.evaluate(() => {
    klantBlokOpen();
    document.addEventListener('input', e => { if (e.target.id === 'pi-telefoon') window.name = e.target.value; }, true);
  });
  await page2.click('#pi-telefoon');
  let typen = true;
  const typer = (async () => {
    const reeks = '070-7654321 toestel 12';
    for (let i = 0; typen && i < 200; i++) {
      try { await page2.keyboard.type(reeks[i % reeks.length]); } catch (e) { break; }
      await wacht(300);
    }
  })();
  await page.click('#updateBalk button', { timeout: 3000 }).catch(() => {});
  const t5 = Date.now();
  check('het eerste tabblad werkt bij', await wachtOpVersie(page, 'v501'));
  check('… meteen: het wacht niet op het typen in het andere tabblad', Date.now() - t5 < 8000,
        Math.round((Date.now() - t5) / 1000) + ' s');
  check('het andere tabblad, waar nog getypt wordt, werkt mee bij', await wachtOpVersie(page2, 'v501'));
  typen = false;
  await typer;
  const inVeld = await page2.evaluate(() => window.name);
  check('alles wat in het andere tabblad in het veld stond, staat in de database',
        inVeld.length >= 3 && (rij(2).data.info || {}).telefoon === inVeld,
        JSON.stringify(inVeld) + ' / ' + JSON.stringify((rij(2).data.info || {}).telefoon));
  check('het eerste tabblad ging netjes naar het startscherm (zijn werk was opgeslagen)',
        await wachtTot(async () => await evalVeilig(page, () => document.body.classList.contains('op-start') && !window.glasProjectId), 8000));
  for (const pg of [page, page2]) if (await pg.locator('.melding-laag').count()) await vensterKnop(pg, 'Sluiten').catch(() => {});
  await page2.close();

  /* ─── 6 ─────────────────────────────────────────────────────── */
  console.log('\n6. ↻ Bijwerken zonder nieuwe versie');
  await open(page, 8);
  await page.evaluate(() => klantBlokOpen());
  await page.click('#pi-contact');
  await page.keyboard.press('End');
  await page.keyboard.type('!');
  const nav = page.waitForNavigation({ timeout: 15000 }).catch(() => null);
  await page.click('button:has-text("↻ Bijwerken")');
  await nav;
  check('↻ Bijwerken slaat eerst op en herlaadt dan', /!$/.test(rij(8).data.info.contact), rij(8).data.info.contact);
  await wacht(1500);
  check('… en meldt geen "bijgewerkt" (er was niets nieuws)', (await page.locator('.melding-laag').count()) === 0);

  /* ─── 7 ─────────────────────────────────────────────────────── */
  console.log('\n7. Zonder bereik: de controle op een nieuwe versie');
  await open(page, 8);
  await offline(true);
  for (let i = 0; i < 3; i++) { await page.evaluate(() => glasZoekUpdate()); await wacht(400); }
  await wacht(1500);
  check('geen balk, geen herladen, dezelfde versie', !(await balk(page)) && (await versieVan(page)) === 'v501');
  await page.evaluate(() => klantBlokOpen());
  await page.click('#pi-contact');
  await page.keyboard.press('End');
  await page.keyboard.type('?');
  await wacht(1800);
  check('gewoon doorwerken: het werk staat op het apparaat, met de vlag',
        await page.evaluate(() => /\?$/.test(projectInfo.contact) && localStorage.getItem('glasopname_pending') === '1'));
  await offline(false);
  check('met bereik gaat het omhoog', await wachtTot(async () => /\?$/.test(rij(8).data.info.contact), 15000));

  /* ─── 8 ─────────────────────────────────────────────────────── */
  console.log('\n8. Een nieuwe versie die maar half binnenkomt');
  S.weiger = new Set(['/teken.js']);
  zetVersie(600);
  await page.evaluate(() => glasZoekUpdate());
  await wacht(5000);
  check('één bestand komt niet binnen: geen nieuwe versie klaar, geen balk (tot v98: wel)',
        !(await balk(page)) && !(await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => !!(r && r.waiting)))));
  await offline(true);
  await page.reload();
  await page.waitForFunction(() => typeof APP_VERSIE !== 'undefined', null, { timeout: 15000 });
  await wacht(1000);
  check('zonder bereik draait de vorige versie gewoon verder, compleet',
        (await versieVan(page)) === 'v501' && await page.evaluate(() => typeof window.tekenModus === 'function'),
        (await versieVan(page)) + ' / ' + await page.evaluate(() => typeof window.tekenModus));
  await offline(false);
  S.weiger.clear();
  await page.evaluate(() => glasZoekUpdate());
  check('de volgende controle, met alles binnen: wél bijwerken', await wachtOpVersie(page, 'v600', 40000));
  if (await page.locator('.melding-laag').count()) await vensterKnop(page, 'Sluiten').catch(() => {});
  await offline(true);
  await page.reload();
  await page.waitForFunction(() => typeof APP_VERSIE !== 'undefined', null, { timeout: 15000 });
  await wacht(1000);
  check('… en die nieuwe versie werkt ook zonder bereik, compleet',
        (await versieVan(page)) === 'v600' && await page.evaluate(() => typeof window.tekenModus === 'function'));
  await offline(false);

  check('geen fouten in de pagina', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' | '));

  await browser.close();
  server.close();
  fs.rmSync(map, { recursive: true, force: true });
  fs.rmSync(fotoMap, { recursive: true, force: true });
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
