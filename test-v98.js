/* Testreeks v98 — node test-v98.js
   In Chromium, met echte kliks, net als test-v93.js (waar de nagebootste
   Supabase vandaan komt). Wat v98 belooft:

     1. Klant en werkadres bovenaan Invoer; e-mail en soort opdrachtgever weg
     2. Invullen, en het blok klapt dicht zodra het ingevuld is
     3. Levering onderaan Invoer; Project info toont het alleen
     4. Slot: klant, adres en levering gaan mee op slot na bestellen
     5. Naslag vanaf het startscherm, zonder project
     6. De pdf invoer begint met een pagina projectgegevens
     7. 'Aanvullen' bij de exportcontrole springt naar Invoer           */
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
  db: {}, opslag: new Map(), offline: false, wie: IK, sporen: [], uploads: [],
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v98-'));
fs.readdirSync('.').forEach(function (naam) {
  if (fs.statSync(naam).isDirectory()) return;
  fs.copyFileSync(naam, path.join(map, naam));
});
fs.cpSync('lib', path.join(map, 'lib'), { recursive: true });
fs.writeFileSync(path.join(map, 'config.js'),
  'window.GLASOPNAME_CONFIG = { url: "https://test.supabase.co", anonKey: "sb_publishable_test" };\n');
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
  const fotoMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v98-fotos-'));
  const JPG = path.join(fotoMap, 'IMG_0001.JPG');
  fs.writeFileSync(JPG, Buffer.from(jpg64, 'base64'));
  const PNG = path.join(fotoMap, 'inrit.png');
  fs.copyFileSync('icon-512.png', PNG);
  const jpgBytes = fs.readFileSync(JPG), pngBytes = fs.readFileSync(PNG);
  console.log('   (testfoto: ' + Math.round(jpgBytes.length / 1024) + ' kB, 3000 × 2000)');

  const ctx = await nieuweContext();
  let page = await nieuwePagina(ctx);

  S.opslag.set(P(8) + '/lever.jpg', { buf: jpgBytes, type: 'image/jpeg' });
  S.opslag.set(P(9) + '/lever.jpg', { buf: jpgBytes, type: 'image/jpeg' });
  for (let i = 1; i <= 30; i++) {
    S.db.projectgeschiedenis.push({ id: 'l' + i, project_id: P(9), wie_naam: i % 2 ? 'julian' : 'bart',
      moment: '2026-10-0' + (1 + (i % 9)) + 'T' + String(8 + (i % 10)).padStart(2, '0') + ':00:00Z',
      samenvatting: 'logregel ' + i });
  }
  for (let i = 1; i <= 12; i++) {
    S.db.taken.push({ id: 'lt' + i, project_id: P(9), tekst: 'Taak nummer ' + i, klaar: i % 3 === 0,
                      eigenaar: 'u1', eigenaar_naam: 'julian', volgorde: i });
  }
  const ids = sel => page.evaluate(s => [...document.querySelectorAll(s)].map(e => e.id), sel);
  const klik = async sel => { await page.click(sel); await wacht(200); };
  // SCHERM=map node test-v98.js maakt onderweg schermafdrukken om naar te kijken.
  const foto = async naam => { if (process.env.SCHERM) await page.screenshot({ path: path.join(process.env.SCHERM, naam + '.png'), fullPage: false }); };
  const opInvoer = () => page.evaluate(() => document.getElementById('panel-invoer').classList.contains('active'));
  const klantDicht = () => page.evaluate(() => document.getElementById('blok-klant').classList.contains('dicht'));

  /* ─── 1 ─────────────────────────────────────────────────────── */
  console.log('\n1. Klant en werkadres bovenaan Invoer');
  await open(page, 2);
  check('Invoer staat open bij een nieuw project', await opInvoer());
  const volgorde = await page.evaluate(() => {
    const c = document.querySelector('#panel-invoer > .container');
    return [...c.children].map(e => e.id).filter(Boolean);
  });
  check('volgorde: slotbalk, klant, foto\'s, losse maten, levering',
        // bestelVerschil (v104): de balk 'Anders dan besteld', direct onder de slotbalk.
        JSON.stringify(volgorde) === JSON.stringify(['slotBalk', 'bestelVerschil', 'blok-klant', 'fotoHouder', 'blok-los', 'blok-lever']),
        volgorde.join(' > '));
  const velden = await ids('#klantVelden input');
  check('klantblok: zoeken + klantnaam, contact, telefoon, straat, postcode, plaats',
        JSON.stringify(velden) === JSON.stringify(['adresZoek', 'pi-klant', 'pi-contact', 'pi-telefoon',
          'pi-straat', 'pi-postcode', 'pi-plaats']), velden.join(','));
  check('het eerste veld heet "Klantnaam"',
        (await page.locator('#klantVelden .pi-veld span').first().innerText()) === 'Klantnaam');
  check('e-mail en soort opdrachtgever zijn als veld verdwenen',
        await page.evaluate(() => !document.getElementById('pi-email') && !document.getElementById('pi-soortKlant')));
  check('nieuw (leeg) project: het blok staat open', !(await klantDicht()));
  await foto('1-leeg-open');
  // Een element met hidden dat tóch in beeld staat, omdat de opmaak
  // display:flex zet. Zo stond de lege slotbalk er sinds v90 (gevonden in v98).
  const verborgenZichtbaar = () => page.evaluate(() => [...document.querySelectorAll('[hidden]')]
    .filter(e => getComputedStyle(e).display !== 'none').map(e => e.id || e.className).join(', '));
  check('niets met hidden staat toch in beeld (o.a. geen lege slotbalk)', (await verborgenZichtbaar()) === '',
        await verborgenZichtbaar());
  check('op Project info zijn klant en adres geen invoer meer',
        await page.evaluate(() => !document.querySelector('#panel-project #projectKlant input')));
  check('Uitvoering blijft op Project info (referentie, status, opgenomen door, bereikbaar)',
        JSON.stringify(await ids('#projectVelden input, #projectVelden select')) ===
        JSON.stringify(['pi-referentie', 'pi-status', 'pi-opnemer', 'pi-bereikbaar']),
        (await ids('#projectVelden input, #projectVelden select')).join(','));
  check('maar één veld met id pi-klant in de hele pagina', (await page.locator('#pi-klant').count()) === 1);

  /* ─── 2 ─────────────────────────────────────────────────────── */
  console.log('\n2. Invullen, dichtklappen, en Project info leest mee');
  await page.click('#pi-klant'); await page.keyboard.type('Fam. Jansen');
  await page.click('#pi-straat'); await page.keyboard.type('Dorpsstraat 1');
  await page.click('#pi-plaats'); await page.keyboard.type('Dordrecht');
  check('wat je typt staat in de gegevens',
        await page.evaluate(() => projectInfo.klant === 'Fam. Jansen' && projectInfo.straat === 'Dorpsstraat 1'));
  check('tijdens het typen klapt het blok niet dicht', !(await klantDicht()));
  // Een wijziging van buitenaf (zoals een collega via cloud.js) tekent het
  // blok opnieuw; de cursor moet in het veld blijven.
  await page.click('#pi-contact'); await page.keyboard.type('Pi');
  await page.evaluate(() => { projectInfo.telefoon = '010-1234567'; renderProject(); });
  await page.keyboard.type('et');
  check('opnieuw tekenen terwijl je typt: cursor blijft, niets kwijt',
        await page.evaluate(() => projectInfo.contact === 'Piet' && document.activeElement.id === 'pi-contact'),
        await page.evaluate(() => projectInfo.contact + ' / ' + document.activeElement.id));
  await klik('.tab-btn:has-text("Project info")');
  const lees = await page.locator('#projectKlant').innerText();
  check('Project info toont klantnaam, contact, telefoon en adres',
        /Fam\. Jansen/.test(lees) && /Piet/.test(lees) && /010-1234567/.test(lees) && /Dorpsstraat 1, Dordrecht/.test(lees),
        lees.replace(/\s+/g, ' ').slice(0, 140));
  await klik('#projectKlant .pi-naar');
  check('de knop springt naar Invoer…', await opInvoer());
  check('… met het klantblok open', !(await klantDicht()));
  check('… en het tabblad Invoer is het actieve tabblad',
        await page.evaluate(() => document.querySelector('.tab-btn.active').textContent.indexOf('Invoer') >= 0));
  await klik('.tab-btn:has-text("Samenvatting")');
  await klik('.tab-btn:has-text("Invoer")');
  check('terug naar Invoer: ingevuld, dus dicht', await klantDicht());
  const regel = await page.locator('#klantRegel').innerText();
  check('dicht: één regel met klantnaam en adres', regel === 'Fam. Jansen · Dorpsstraat 1, Dordrecht', regel);
  check('… en de velden zijn weg', !(await page.locator('#pi-klant').isVisible()));
  await foto('2-dicht');
  await klik('#blok-klant .blok-balk');
  check('een tik op de balk klapt het open', !(await klantDicht()) && await page.locator('#pi-klant').isVisible());
  await wachtOpOpslaan(page);
  check('opgeslagen in de cloud', (rij(2).data.info || {}).klant === 'Fam. Jansen');
  await open(page, 2);
  check('opnieuw openen: ingevuld project begint dicht', await klantDicht());

  /* ─── 3 ─────────────────────────────────────────────────────── */
  console.log('\n3. Levering onderaan Invoer');
  check('de leverknoppen staan op Invoer',
        await page.evaluate(() => !!document.querySelector('#panel-invoer #blok-lever #leverBlok .lever-keuze button')));
  check('niets van de levering meer als invoer op Project info',
        await page.evaluate(() => !document.querySelector('#panel-project #leverBlok, #panel-project textarea#leverInstructie')));
  await page.click('#leverBlok button:has-text("Werkadres")');
  await page.click('#leverInstructie'); await page.keyboard.type('Achterom, poort open');
  check('werkadres gekozen en instructie bewaard',
        await page.evaluate(() => projectInfo.leverAdres === 'werk' && projectInfo.leverInstructie === 'Achterom, poort open'));
  check('de foto-knop voor de leverlocatie staat er',
        await page.locator('#blok-lever #leverFotoBlok input[type=file]').count() === 1);
  await klik('.tab-btn:has-text("Project info")');
  await foto('3-projectinfo');
  const leesL = (await page.locator('#projectLever').innerText()).replace(/\s+/g, ' ');
  check('Project info leest de levering mee',
        /Dorpsstraat 1/.test(leesL) && /Achterom, poort open/.test(leesL) && /Eerste levermogelijkheid/.test(leesL), leesL.slice(0, 160));
  await klik('#projectLever .pi-naar');
  const zicht = await page.evaluate(() => { const r = document.getElementById('blok-lever').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
  check('"Invullen op Invoer" bij levering: naar Invoer, blok in beeld', (await opInvoer()) && zicht);
  await wacht(500); await foto('3-levering');

  /* ─── 4 ─────────────────────────────────────────────────────── */
  console.log('\n4. Slot: klant, adres en levering mee op slot');
  await open(page, 1);
  const uit = await page.evaluate(() => ({
    klant: ['pi-klant', 'pi-straat', 'adresZoek', 'leverInstructie'].every(id => document.getElementById(id).disabled),
    lever: [...document.querySelectorAll('#leverBlok button')].every(b => b.disabled),
    foto: [...document.querySelectorAll('#leverFotoBlok input')].every(b => b.disabled)
  }));
  check('klantvelden en adres zoeken staan uit', uit.klant);
  check('leverknoppen en -foto staan uit', uit.lever && uit.foto);
  await klik('#blok-klant .blok-balk');
  check('in- en uitklappen kan wel (alleen kijken)', !(await klantDicht()));
  await foto('4-slot');
  check('"Adres in kaarten" blijft bruikbaar', await page.evaluate(() => {
    const k = document.getElementById('klantKaart'); return !!k && !k.hidden && !k.disabled; }));
  const voor = await page.evaluate(() => JSON.stringify(projectInfo));
  await page.evaluate(() => {
    projectVeld('klant', 'Iemand anders'); leverAdresWijzig('werk'); leverInstructie('weg ermee');
    leverDatumZet('01-12-2026'); leverWeekZet(50, 'week 50'); leverDatumSoort('spoed');
  });
  check('ook langs de functies verandert er niets (slot op de gegevens)',
        await page.evaluate(() => JSON.stringify(projectInfo)) === voor);
  check('… en dat wordt gemeld', /besteld/.test(await vensterTekst(page)));
  await vensterKnop(page, 'Oké');
  check('na het weigeren staat het scherm weer goed',
        await page.evaluate(() => document.getElementById('pi-klant').value === 'Fam. Besteld' &&
                                  document.getElementById('leverInstructie').value === 'Bij de poort'));
  await klik('.tab-btn:has-text("Project info")');
  check('Project info: status en notities blijven te wijzigen',
        await page.evaluate(() => !document.getElementById('pi-status').disabled && !document.getElementById('projectNotitie').disabled));
  check('de knop zegt "Bekijken" in plaats van "Invullen"',
        /Bekijken op Invoer/.test(await page.locator('#projectKlant .pi-naar').innerText()));
  await klik('.tab-btn:has-text("Invoer")');
  await page.click('#slotBalk button:has-text("Ontgrendelen")');
  await page.locator('.melding-laag input[type=password]').fill('geheim');
  await vensterKnop(page, 'Ontgrendelen');
  await wacht(300);
  if (await page.locator('.melding-laag').count()) await vensterKnop(page, 'Oké');
  check('na ‹Ontgrendelen› kun je weer invullen',
        await page.evaluate(() => !document.getElementById('pi-klant').disabled &&
                                  !document.querySelector('#leverBlok button').disabled));
  await page.evaluate(() => klantBlokOpen());
  await page.fill('#pi-klant', 'Fam. Besteld BV');
  check('… en het komt in de gegevens', await page.evaluate(() => projectInfo.klant === 'Fam. Besteld BV'));

  /* ─── 5 ─────────────────────────────────────────────────────── */
  console.log('\n5. Naslag vanaf het startscherm');
  // Het laatst geopende project gaat bij herladen weer open; via ‹Projecten›
  // terug naar het startscherm, zoals Jan dat doet.
  await page.click('#cloudProjectKnop');
  await page.waitForFunction(() => document.body.classList.contains('op-start'), null, { timeout: 15000 });
  await wacht(500);
  check('het startscherm toont Start', await page.locator('#startInhoud').isVisible() &&
        !(await page.locator('#startNaslag').isVisible()));
  await klik('#startTabNaslag');
  check('tabblad Naslag: de naslag staat er, zonder project',
        await page.locator('#startNaslag #naslagInhoud .nsl-zoek').isVisible() && !(await page.evaluate(() => window.glasProjectId)));
  check('… en Start is weg', !(await page.locator('#startInhoud').isVisible()));
  await page.fill('#naslagZoekVeld', 'chinchilla');
  await wacht(300);
  const telling = await page.locator('.nsl-telling').innerText();
  await foto('5-naslag');
  check('ook op het startscherm: niets met hidden in beeld', (await verborgenZichtbaar()) === '', await verborgenZichtbaar());
  check('zoeken werkt op het startscherm', /^\d+ van de \d+ soorten$/.test(telling) && !/^0 /.test(telling), telling);
  check('er is maar één naslag (geen dubbele ids)', (await page.locator('#naslagInhoud').count()) === 1 &&
        (await page.locator('#naslagZoekVeld').count()) === 1);
  await klik('#startTabStart');
  check('terug naar Start: lijsten weer in beeld, naslag terug in de app',
        await page.locator('#startInhoud').isVisible() &&
        await page.evaluate(() => document.getElementById('naslagInhoud').parentNode.id === 'panel-naslag'));
  await klik('#startTabNaslag');
  check('in de stand Naslag zijn de projecten niet aan te tikken (Start is echt weg)',
        !(await page.locator('.start-project-info').first().isVisible()));
  await klik('#startTabStart');
  await page.locator('.start-project-info').first().click();
  await page.waitForFunction(() => !document.body.classList.contains('op-start') && window.glasProjectId, null, { timeout: 15000 });
  await wacht(500);
  await klik('.tab-btn:has-text("Naslag")');
  check('project geopend vanuit Naslag-stand: het tabblad Naslag in de app werkt gewoon',
        await page.locator('#panel-naslag #naslagInhoud .nsl-zoek').isVisible());
  await page.evaluate(() => glasToonStart());
  await wacht(300);
  check('terug naar het startscherm begint weer op Start',
        await page.locator('#startInhoud').isVisible() &&
        await page.evaluate(() => document.getElementById('startTabStart').classList.contains('aan')));

  /* ─── 6 ─────────────────────────────────────────────────────── */
  console.log('\n6. De pdf invoer begint met de projectgegevens');
  await open(page, 8);
  await klik('.tab-btn:has-text("Invoer")');
  check('ingevuld project: klantblok dicht met de regel', (await klantDicht()) &&
        /Fam\. de Vries · Voorstraat 12, 3311 ER Dordrecht/.test(await page.locator('#klantRegel').innerText()));
  {
    // Telefoonbreedte (iPhone): de leverfoto-knoppen moeten binnen beeld.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => scrollTo(0, 0)); await wacht(300);
    await foto('6-telefoon-dicht');
    await klik('#blok-klant .blok-balk'); await foto('6-telefoon-open');
    await klik('#blok-klant .blok-balk');
    await page.evaluate(() => document.getElementById('blok-lever').scrollIntoView()); await wacht(500);
    await foto('6-telefoon-levering');
    check('telefoon: alle knoppen bij de leverfoto binnen het scherm', await page.evaluate(() =>
      [...document.querySelectorAll('#leverFotoBlok .foto-zoombalk button')].every(b => b.getBoundingClientRect().right <= innerWidth)));
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  const pdfD = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
  await page.evaluate(() => exportFotoPdf());
  await page.click('[data-actie="toch"]', { timeout: 3000 }).catch(() => {});
  const pdfBestand = await pdfD;
  check('de pdf invoer is gemaakt', !!pdfBestand);
  if (pdfBestand) {
    const doel = path.join(__dirname, 'uit-projectinfo.pdf');
    await pdfBestand.saveAs(doel);
    check('… en bewaard als uit-projectinfo.pdf voor test-v98.py', fs.existsSync(doel));
  }
  if (await page.locator('.melding-laag').count()) await vensterKnop(page, 'Oké');

  await open(page, 9);
  const pdfL = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
  await page.evaluate(() => exportFotoPdf());
  await page.click('[data-actie="toch"]', { timeout: 3000 }).catch(() => {});
  const pdfLang = await pdfL;
  check('ook met veel notities, 12 taken en 30 logregels komt de pdf er', !!pdfLang);
  if (pdfLang) await pdfLang.saveAs(path.join(__dirname, 'uit-projectinfo-lang.pdf'));
  if (await page.locator('.melding-laag').count()) await vensterKnop(page, 'Oké');

  /* ─── 7 ─────────────────────────────────────────────────────── */
  console.log('\n7. ‹Aanvullen› bij de exportcontrole springt naar Invoer');
  await open(page, 2);
  await page.evaluate(() => { projectInfo.leverAdres = 'werk'; projectInfo.straat = ''; projectInfo.plaats = '';
                              projectInfo.leverInstructie = ''; renderProject(); });
  await klik('.tab-btn:has-text("Project info")');
  await page.evaluate(() => exportFotoPdf());
  await page.click('[data-actie="aanvullen"]', { timeout: 5000 });
  await wacht(400);
  check('Aanvullen bij een ontbrekend werkadres: Invoer, klantblok open',
        (await opInvoer()) && !(await klantDicht()));

  check('geen fouten in de pagina', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' | '));

  await browser.close();
  server.close();
  fs.rmSync(map, { recursive: true, force: true });
  fs.rmSync(fotoMap, { recursive: true, force: true });
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
