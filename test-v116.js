/* Testreeks v116 — node test-v116.js   (en: node test-v116.js --mutaties)

   Onderwerp: originele foto's gingen in Safari niet omhoog (Jan,
   20-10-2026). De console zei "No content provided (code 400)": Safari
   stuurt een bestand dat uit IndexedDB komt als 0 bytes mee, terwijl de
   inhoud op het apparaat er nog is (zelf inlezen gaf 4.063.089 bytes). De
   app bleef het elke halve minuut opnieuw proberen, en het venster zei pas
   na een dag iets.

   Echte situatie: Jan zet op zijn Mac (Safari) een foto in een project. De
   verkleinde foto gaat omhoog (die maakt de app zelf), het origineel blijft
   hangen. Op de iPad gaat het net zo.

   Belofte:
   - uploaden stuurt de inhoud zelf (een kopie in het geheugen), niet het
     bestand uit IndexedDB; wat er van v115 nog op het apparaat staat, gaat
     na het bijwerken vanzelf omhoog;
   - een nieuw origineel wordt als kopie bewaard, niet als verwijzing naar
     het bestand (File);
   - een bestand dat op het apparaat echt leeg is, gaat niet als leeg
     bestand omhoog en wordt nooit weggegooid; het venster zegt het;
   - een fout bij het lezen op het apparaat houdt de andere bestanden niet
     tegen;
   - lukt een bestand 3 keer niet, dan zegt het venster het meteen, met de
     foutmelding, en wordt de teller rood.

   Wat deze opstelling aanneemt: Safari zelf is hier niet (Chromium). De
   test bootst het Safari-gedrag na: elk bestand dat uit IndexedDB gelezen
   wordt, gaat in de namaak van Supabase leeg mee, en de namaak antwoordt
   dan zoals Supabase ("No content provided", 400). §1 toont dat deze
   nabootsing Jans fout geeft. Of echte Safari een kopie in het geheugen wel
   goed verstuurt, is niet getest; de verkleinde foto's (ook in het geheugen
   gemaakt) gingen bij Jan wel goed. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  uploadKopie: ["wachtrij.js", "        return sb().storage.from(BUCKET).upload(meta.pad, inhoud,", "        return sb().storage.from(BUCKET).upload(meta.pad, blob,"],
  zetKopie: ["wachtrij.js", "    if (typeof File === 'undefined' || !(blob instanceof File)) return Promise.resolve(blob);", "    return Promise.resolve(blob);"],
  leegNietOp: ["wachtrij.js", "        if (!inhoud.size) {", "        if (false) {"],
  leesFoutDoor: ["wachtrij.js", "    if (e && e.lokaal) return false;       // v116: fout op het apparaat zelf", ""],
  vastMelden: ["wachtrij.js", "  var VAST_NA = 3;", "  var VAST_NA = 999;"],
  vastRood: ["wachtrij.js", "!!(t.geweigerd || t.vol || t.lang || t.vast)", "!!(t.geweigerd || t.vol || t.lang)"],
  leegTekst: ["wachtrij.js", "    if (leeg) {\n      // v116", "    if (0) {\n      // v116"],
  oudeSafari: ["wachtrij.js", "      lezer.readAsArrayBuffer(blob);", "      lezer.readAsText(blob);"],
  grootte: ["wachtrij.js", "        if (meta.grootte && inhoud.size !== meta.grootte) {", "        if (false) {"],
};
const WAAR = { uploadKopie: '1', zetKopie: '2', leegNietOp: '3', leesFoutDoor: '4', vastMelden: '5', vastRood: '5', leegTekst: '3',
               oudeSafari: '7', grootte: '8' };

if (process.argv.indexOf('--mutaties') >= 0) {
  let goed = 0;
  Object.keys(MUTATIES).forEach(function (naam) {
    const r = spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { MUTATIE: naam, ALLEEN: WAAR[naam] || '' }),
                                                         encoding: 'utf8', timeout: 600000 });
    const uit = (r.stdout || '') + (r.stderr || '');
    const regels = uit.split('\n').filter(l => /^\s+FOUT /.test(l)).map(l => l.trim());
    // Alleen een eigen FOUT-regel telt als gevangen (geen crash of time-out).
    const gevangen = regels.length > 0 && !/mutatie past niet/.test(uit);
    console.log((gevangen ? '  ok   ' : '  FOUT ') + 'mutatie ' + naam + (gevangen ? ' wordt gevangen: ' : ' wordt NIET gevangen ') +
                (regels[0] ? regels[0].slice(0, 110) : (/mutatie past niet/.test(uit) ? '(past niet!)' : uit.slice(-200))));
    if (gevangen) goed++;
  });
  const n = Object.keys(MUTATIES).length;
  console.log('\n' + (goed === n ? 'Alles goed.' : (n - goed) + ' mutatie(s) niet gevangen.'));
  process.exit(goed === n ? 0 : 1);
}

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra !== undefined && extra !== '' ? '  → ' + extra : ''));
  if (!ok) fouten++;
  if (!ok && process.env.MUTATIE) process.exit(1);
}
const wacht = ms => new Promise(r => setTimeout(r, ms));
async function wachtTot(voorwaarde, maximaal) {
  const eind = Date.now() + (maximaal || 10000);
  while (Date.now() < eind) { if (await voorwaarde()) return true; await wacht(150); }
  return false;
}
const ALLEEN = process.env.ALLEEN ? process.env.ALLEEN.split(',') : null;
const doe = n => !ALLEEN || ALLEEN.indexOf(String(n)) >= 0;

/* ─── de nagebootste Supabase (node-kant) ─────────────────────── */
const IK = { id: 'u1', email: 'julian@voorbeeld.test' };
const BART = { id: 'u2', email: 'bart@voorbeeld.test' };
const WACHTWOORD = { 'julian@voorbeeld.test': 'geheim', 'bart@voorbeeld.test': 'bart123' };
const P = n => '00000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');

const S = {
  db: {}, opslag: new Map(), offline: false, wie: IK, sporen: [], uploads: [], weiger400: new Set(),
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
  besteld.data.info = { status: 'besteld', besteld: { op: '2026-10-10T10:00:00Z', door: 'julian' }, opnemer: 'bart' };
  const oud = leegProject(4, 'Oud project');
  oud.data.rijen = [ruit(1, 'B', '500', '500')];
  oud.data.volgendId = 2;
  S.db = {
    projecten: [besteld, leegProject(2, 'Nieuw project'), leegProject(3, 'Fotoproject'), oud,
                leegProject(5, 'Weigerproject'), leegProject(6, 'Ander apparaat'),
                (function () {
                  // Project 7: een ruit met een opbouw die in v96 uit de lijst ging.
                  const p = leegProject(7, 'Oude opbouw');
                  const r = ruit(1, 'C', '900', '900');
                  r.glasType = 'HR++ glas'; r.opbouw = '5-13-4';
                  p.data.rijen = [r]; p.data.volgendId = 2;
                  return p;
                })()],
    taken: [], projectgeschiedenis: [], mailverzonden: [], app_data: [],
    gebruikers: [{ id: 'u1', naam: 'julian', email: IK.email, actief: true },
                 { id: 'u2', naam: 'bart', email: BART.email, actief: true }],
    mailadressen: []
  };
  // Project 6: de foto staat in de opname, maar het bestand is (nog) niet
  // in de cloud — hij wacht op een ander apparaat.
  S.db.projecten[5].data.fotos = [{ id: 'fx', pad: P(6) + '/wacht-nog.jpg', titel: '', breedte: 400,
                                    hoogte: 300, markeringen: [] }];
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
    // v116: zoals Supabase bij een lege upload (wat Safari stuurde).
    if (!v.grootte || S.weiger400.has(v.pad)) return { data: null, error: { statusCode: '400', error: 'Error', message: 'No content provided' } };
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
    // Met FileReader: §7 haalt Blob.arrayBuffer weg (oude Safari).
    return new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.readAsArrayBuffer(blob); }).then(function (buf) {
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
        // v116: Safari stuurt een bestand dat uit IndexedDB komt leeg mee
        // (gezien bij Jan, 20-10-2026). De test merkt zulke bestanden (zie
        // SAFARI in nieuweContext) en stuurt dan 0 bytes, net als Safari.
        if (window.__uitIdb && window.__uitIdb.has(blob)) blob = new Blob([], { type: blob.type });
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v116-'));
fs.readdirSync('.').forEach(function (naam) {
  if (fs.statSync(naam).isDirectory()) return;
  fs.copyFileSync(naam, path.join(map, naam));
});
fs.cpSync('lib', path.join(map, 'lib'), { recursive: true });
fs.writeFileSync(path.join(map, 'config.js'),
  'window.GLASOPNAME_CONFIG = { url: "https://test.supabase.co", anonKey: "sb_publishable_test" };\n');

if (process.env.MUTATIE) {
  const m = MUTATIES[process.env.MUTATIE];
  if (!m) { console.log('onbekende mutatie'); process.exit(2); }
  const doel = path.join(map, m[0]);
  let tekst = fs.readFileSync(doel, 'utf8');
  for (let i = 1; i < m.length; i += 2) {
    if (tekst.indexOf(m[i]) < 0) { console.log('mutatie past niet: ' + process.env.MUTATIE); process.exit(3); }
    tekst = tekst.replace(m[i], () => m[i + 1]);
  }
  fs.writeFileSync(doel, tekst);
  console.log('   (mutatie ' + process.env.MUTATIE + ' in ' + m[0] + ')');
}

const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg',
                '.webmanifest': 'application/manifest+json' };
const server = http.createServer(function (req, res) {
  let naam = decodeURIComponent(req.url.split('?')[0]);
  if (naam === '/') naam = '/index.html';
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
    serviceWorkers: 'block', acceptDownloads: true }, opties || {}));
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
  // Safari nabootsen (v116): onthoud elk bestand dat uit IndexedDB gelezen
  // wordt. De namaak van Supabase stuurt zo'n bestand leeg mee.
  await ctx.addInitScript(() => {
    window.__uitIdb = new WeakSet();
    const d = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'result');
    Object.defineProperty(IDBRequest.prototype, 'result', { configurable: true, get: function () {
      const v = d.get.call(this);
      if (v instanceof Blob) window.__uitIdb.add(v);
      return v;
    } });
  });
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

// Een bestand in de wachtrij zetten zoals v115 dat deed: het bestand (File)
// zelf, met de meta erbij. Zo staat het nu bij Jan op de Mac.
async function zetZoalsV115(page, pad, b64, opties) {
  return page.evaluate(async ([pad, b64, o]) => {
    const bin = atob(b64 || ''); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const blob = o.leeg ? new Blob([], { type: 'image/jpeg' }) : new File([u], o.naam || 'IMG_0002.JPG', { type: 'image/jpeg' });
    const d = await glasWachtrij._open();
    await new Promise((ok, fout) => {
      const t = d.transaction(['meta', 'blobs'], 'readwrite');
      t.objectStore('blobs').put(blob, pad);
      t.objectStore('meta').put({ pad: pad, projectId: pad.split('/')[0], soort: o.soort || 'origineel', type: 'image/jpeg',
        grootte: o.grootte || blob.size, naam: o.naam || '', gemaakt: o.gemaakt || Date.now(), pogingen: o.pogingen || 0, fout: o.fout || '' });
      t.oncomplete = ok; t.onerror = () => fout(t.error);
    });
    await glasWachtrij.lijst();
  }, [pad, b64, opties || {}]);
}
async function inWachtrij(page) {
  return page.evaluate(() => glasWachtrij.lijst().then(l => l.map(m => ({ pad: m.pad, pogingen: m.pogingen, fout: m.fout, soort: m.soort }))));
}
async function ronde(page) { await page.evaluate(() => glasWachtrij.verwerk()); await wacht(200); }
// v117: de app uploadt vanzelf (bij de start, elke halve minuut). Om de
// beginstand te kunnen bekijken zonder dat hij intussen al omhoog ging: de
// browser even offline (navigator.onLine = false; dan probeert de wachtrij
// niets). De nagebootste Supabase loopt via exposeFunction en werkt gewoon.
async function stil(ctx, aan) { await ctx.setOffline(!!aan); await wacht(50); }
const gelijk = (pad, buf) => S.opslag.has(pad) && Buffer.compare(S.opslag.get(pad).buf, buf) === 0;

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  // Een echte foto (JPEG, 2000 × 1500), zoals uit een camera.
  const ctx0 = await nieuweContext();
  const p0 = await ctx0.newPage();
  await p0.goto('about:blank');
  const jpg64 = await p0.evaluate(() => new Promise(ok => {
    const c = document.createElement('canvas'); c.width = 2000; c.height = 1500;
    const g = c.getContext('2d');
    const k = g.createLinearGradient(0, 0, 2000, 1500); k.addColorStop(0, '#2a6'); k.addColorStop(1, '#14c');
    g.fillStyle = k; g.fillRect(0, 0, 2000, 1500);
    for (let i = 0; i < 300; i++) { g.fillStyle = 'hsl(' + (i * 37 % 360) + ',70%,50%)'; g.fillRect((i * 131) % 2000, (i * 71) % 1500, 60, 40); }
    c.toBlob(b => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.readAsDataURL(b); }, 'image/jpeg', 0.95);
  }));
  await ctx0.close();
  const jpgBytes = Buffer.from(jpg64, 'base64');
  const fotoMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v116-fotos-'));
  const JPG = path.join(fotoMap, 'IMG_0001.JPG');
  fs.writeFileSync(JPG, jpgBytes);
  console.log('   (testfoto: ' + Math.round(jpgBytes.length / 1024) + ' kB)');

  const ctx = await nieuweContext();
  const page = await nieuwePagina(ctx);
  let m, t;

  if (doe(1)) {
    console.log('\n1. Wat er van v115 nog op het apparaat staat (Jans Mac), gaat nu omhoog');
    await open(page, 3);
    const pad = P(3) + '/origineel/1792503642937-03g2kp.jpg';
    await stil(ctx, true);
    await zetZoalsV115(page, pad, jpg64, { pogingen: 7, fout: 'No content provided (code 400)', gemaakt: Date.now() - 600000 });
    // Eerst bewijzen dat de nabootsing Jans fout geeft: het bestand uit
    // IndexedDB rechtstreeks uploaden, zoals v115 deed.
    m = await page.evaluate(async p => {
      const b = await glasWachtrij.blob(p);
      const r = await glasSupabase.storage.from('projectfotos').upload('proef/v115.jpg', b, { contentType: 'image/jpeg', upsert: false });
      return r.error ? r.error.message + ' (' + r.error.statusCode + ')' : 'gelukt';
    }, pad);
    check('nabootsing: het bestand uit IndexedDB zoals v115 uploaden geeft Jans fout', m === 'No content provided (400)', m);
    t = await page.evaluate(() => glasWachtrij.telling());
    check('na 7 mislukte pogingen: geteld als "lukt niet"', t.vast === 1, JSON.stringify(t));
    await stil(ctx, false);
    await ronde(page);
    await wachtTot(async () => (await inWachtrij(page)).length === 0, 8000);
    check('v116 uploadt het: byte voor byte gelijk aan de foto', gelijk(pad, jpgBytes),
          S.opslag.has(pad) ? S.opslag.get(pad).buf.length + ' bytes' : 'niet in de cloud');
    check('… en hij staat niet meer in de wachtrij', (await inWachtrij(page)).length === 0, JSON.stringify(await inWachtrij(page)));
    check('de teller is weg', await page.locator('#wachtrijTeller').isHidden());
  }

  if (doe(2)) {
    console.log('\n2. Een nieuwe foto: het origineel wordt als kopie bewaard en gaat omhoog');
    S.offline = true;
    await open(page, 2);
    await page.setInputFiles('#fotoBestand', JPG);
    await wachtTot(() => page.evaluate(() => fotos.length === 1 && !!fotos[0].pad && !!fotos[0].origineel), 15000);
    const foto = await page.evaluate(() => JSON.parse(JSON.stringify(fotos[0] || {})));
    check('de foto en het origineel staan in het project', !!(foto.pad && foto.origineel), JSON.stringify(foto.origineel));
    m = await page.evaluate(async p => {
      const d = await glasWachtrij._open();
      const b = await new Promise(ok => { const v = d.transaction('blobs').objectStore('blobs').get(p); v.onsuccess = () => ok(v.result); });
      return { file: b instanceof File, grootte: b && b.size, type: b && b.type };
    }, foto.origineel && foto.origineel.pad);
    check('in IndexedDB staat een kopie, geen verwijzing naar het bestand (File)', m.file === false && m.grootte === jpgBytes.length,
          JSON.stringify(m));
    check('… met het goede soort bestand', m.type === 'image/jpeg', m.type);
    S.offline = false;
    await ronde(page);
    await wachtTot(async () => (await inWachtrij(page)).length === 0, 10000);
    check('na bereik: de verkleinde foto en het origineel staan in de cloud (met Safari-gedrag)',
          S.opslag.has(foto.pad) && S.opslag.get(foto.pad).buf.length > 1000 && gelijk(foto.origineel.pad, jpgBytes),
          [S.opslag.has(foto.pad), S.opslag.has(foto.origineel.pad)].join(','));
    check('de wachtrij is leeg', (await inWachtrij(page)).length === 0);
  }

  if (doe(3)) {
    console.log('\n3. Een bestand dat op het apparaat leeg is: niet omhoog, niet weg, en het venster zegt het');
    await open(page, 5);
    const leeg = P(5) + '/origineel/leeg.jpg', goed = P(5) + '/origineel/goed.jpg';
    await stil(ctx, true);
    await zetZoalsV115(page, leeg, '', { leeg: true, grootte: 5000, gemaakt: Date.now() - 2000 });
    await zetZoalsV115(page, goed, jpg64, { gemaakt: Date.now() - 1000 });
    S.uploads = [];
    await stil(ctx, false);
    await ronde(page);
    await wachtTot(async () => S.opslag.has(goed), 8000);
    const rij = await inWachtrij(page);
    check('het lege bestand is niet geüpload (geen leeg bestand in de cloud)', S.uploads.indexOf(leeg) < 0 && !S.opslag.has(leeg), S.uploads.join(','));
    check('… en niet weggegooid', rij.some(x => x.pad === leeg), JSON.stringify(rij));
    check('het volgende bestand gaat gewoon omhoog', gelijk(goed, jpgBytes));
    await page.click('#wachtrijTeller');
    t = await vensterTekst(page);
    check('het venster: "leeg op dit apparaat", en wat je kunt doen', /1 bestand\(en\) zijn op dit apparaat leeg/.test(t) && /opnieuw in het project/.test(t), t.slice(0, 260));
    check('… en niet de raad over de opslag in Supabase', !/19_originelen/.test(t), t.slice(0, 200));
    await vensterKnop(page, 'Oké');
    check('de teller is rood', await page.locator('#wachtrijTeller.probleem').count() === 1);
    // Opruimen voor de volgende onderdelen.
    await page.evaluate(p => glasWachtrij.vergeetPad(p), leeg);
  }

  if (doe(4)) {
    console.log('\n4. Lezen op het apparaat mislukt: de andere bestanden gaan wel door');
    await open(page, 4);
    const kapot = P(4) + '/origineel/kapot.jpg', goed = P(4) + '/origineel/goed2.jpg';
    await stil(ctx, true);
    await zetZoalsV115(page, kapot, jpg64.slice(0, 1036), { gemaakt: Date.now() - 2000 });   // 777 bytes
    await zetZoalsV115(page, goed, jpg64, { gemaakt: Date.now() - 1000 });
    await page.evaluate(() => {
      window.__arrayBuffer = Blob.prototype.arrayBuffer;
      Blob.prototype.arrayBuffer = function () {
        if (this.size === 777) return Promise.reject(new DOMException('The requested file could not be read', 'NotReadableError'));
        return window.__arrayBuffer.call(this);
      };
    });
    await stil(ctx, false);
    await ronde(page);
    await wachtTot(async () => S.opslag.has(goed), 8000);
    const rij = await inWachtrij(page);
    const k = rij.find(x => x.pad === kapot) || {};
    check('het onleesbare bestand blijft in de wachtrij, met de reden', k.pogingen >= 1 && /lezen op dit apparaat mislukt/.test(k.fout), JSON.stringify(k));
    check('het volgende bestand gaat gewoon omhoog (tot v115 stopte de ronde)', gelijk(goed, jpgBytes));
    await page.evaluate(() => { Blob.prototype.arrayBuffer = window.__arrayBuffer; });
    await ronde(page);
    await wachtTot(async () => S.opslag.has(kapot), 8000);
    check('weer leesbaar: dan gaat hij alsnog omhoog', S.opslag.has(kapot) && S.opslag.get(kapot).buf.length === 777,
          S.opslag.has(kapot) ? S.opslag.get(kapot).buf.length : 'niet');
  }

  if (doe(5)) {
    console.log('\n5. Lukt het 3 keer niet: het venster zegt het meteen (niet pas na een dag)');
    await open(page, 6);
    const pad = P(6) + '/origineel/weigert.jpg';
    S.weiger400.add(pad);
    await stil(ctx, true);
    await zetZoalsV115(page, pad, jpg64, { pogingen: 2, fout: 'No content provided (code 400)' });
    t = await page.evaluate(() => glasWachtrij.telling());
    check('na 2 keer: nog geen melding', t.vast === 0, JSON.stringify(t));
    await stil(ctx, false);
    await ronde(page);
    await wachtTot(async () => ((await inWachtrij(page))[0] || {}).pogingen >= 3, 5000);
    t = await page.evaluate(() => glasWachtrij.telling());
    check('na 3 keer: geteld als "lukt niet"', t.vast === 1, JSON.stringify(t));
    check('de teller is rood', await page.locator('#wachtrijTeller.probleem').count() === 1);
    await page.click('#wachtrijTeller');
    t = await vensterTekst(page);
    check('het venster noemt het, met de foutmelding', /lukken al 3 keer of vaker niet/.test(t) && /No content provided/.test(t), t.slice(0, 300));
    await vensterKnop(page, 'Oké');
    S.weiger400.delete(pad);
    await ronde(page);
    await wachtTot(async () => (await inWachtrij(page)).length === 0, 8000);
    check('lukt het daarna wel, dan is alles weg (teller en melding)', gelijk(pad, jpgBytes) && await page.locator('#wachtrijTeller').isHidden());
  }

  if (doe(7)) {
    console.log('\n7. Safari ouder dan 14 (geen Blob.arrayBuffer): via FileReader');
    await open(page, 7);
    const pad = P(7) + '/origineel/oude-ipad.jpg';
    await stil(ctx, true);
    await page.evaluate(() => { window.__ab = Blob.prototype.arrayBuffer; delete Blob.prototype.arrayBuffer; });
    m = await page.evaluate(() => typeof new Blob([]).arrayBuffer);
    check('(opstelling: arrayBuffer bestaat niet meer)', m === 'undefined', m);
    await zetZoalsV115(page, pad, jpg64, {});
    await stil(ctx, false);
    await ronde(page);
    await wachtTot(async () => S.opslag.has(pad), 8000);
    check('het origineel gaat omhoog, byte voor byte gelijk', gelijk(pad, jpgBytes),
          S.opslag.has(pad) ? S.opslag.get(pad).buf.length + ' bytes' : JSON.stringify(await inWachtrij(page)));
    await page.evaluate(() => { Blob.prototype.arrayBuffer = window.__ab; });
  }

  if (doe(8)) {
    console.log('\n8. Minder gelezen dan bewaard: niet uploaden, niet weggooien');
    await open(page, 7);
    const pad = P(7) + '/origineel/half.jpg';
    await stil(ctx, true);
    await zetZoalsV115(page, pad, jpg64, { grootte: jpgBytes.length + 100 });
    S.uploads = [];
    await stil(ctx, false);
    await ronde(page);
    const rij = (await inWachtrij(page)).find(x => x.pad === pad) || {};
    check('niet geüpload', S.uploads.indexOf(pad) < 0 && !S.opslag.has(pad), S.uploads.join(','));
    check('blijft in de wachtrij, met de reden', /niet goed gelezen/.test(rij.fout || ''), JSON.stringify(rij));
    await page.evaluate(p => glasWachtrij.vergeetPad(p), pad);
  }

  if (doe(6)) {
    console.log('\n6. Versie');
    const v = f => (fs.readFileSync(f, 'utf8').match(/VERSIE = '(v\d+)'/) || [])[1];
    check('index.html, pdf.js en sw.js op v116 of later (gelijk)', +v('index.html').slice(1) >= 116 && v('pdf.js') === v('index.html') && v('sw.js') === v('index.html'),
          [v('index.html'), v('pdf.js'), v('sw.js')].join(' '));
  }

  check('geen fouten in de console', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' FOUT(EN)' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
