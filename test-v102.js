/* Testreeks v102 — node test-v102.js
   Sorteren van de projectenlijst op het startscherm (keuze van Jan):
   laatst gewijzigd, aanmaakdatum, alfabet.

   Echte situatie: Jan of een collega opent de app (Mac, iPad, iPhone,
   straks ook Android/Windows) en zoekt een project in een lijst die met
   de jaren lang wordt — honderden projecten.

   Belofte: de gekozen volgorde klopt, er valt geen project uit de lijst,
   de keuze blijft onthouden op dit apparaat, en sorteren verandert niets
   in de database.

   Valkuilen die hier expres getest worden:
   - meer dan 200 projecten (tot v101 haalde de lijst er 200 op, de laatst
     gewijzigde): een oud project hoort op naam toch bovenaan te staan;
   - de database sorteert tekst in bytevolgorde ('Zuid' vóór 'appel',
     'Project 10' vóór 'Project 2', 'Éénhoorn' achteraan); de app moet het
     zoals een mens doen;
   - geen localStorage (privémodus): terug naar laatst gewijzigd, geen fout;
   - snel achter elkaar wisselen: het laatste antwoord wint;
   - telefoon: 16 px in de keuzelijst (anders zoomt iOS in), niets buiten
     het scherm.                                                            */
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
  db: {}, opslag: new Map(), offline: false, vragen: [], wie: IK, sporen: [], uploads: [],
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
// 250 projecten, met namen waar sorteren lastig is, en tijden die zo
// gekozen zijn dat 'Aardbei' het láátst gewijzigd is (valt buiten de
// laatste 200) maar op naam bovenaan hoort.
const NAMEN = ['appel', 'Bakker', 'Project 2', 'Project 10', 'Éénhoorn', 'zuid', '', 'Aardbei', 'bakker 2'];
function tijd(min) { return new Date(Date.UTC(2026, 0, 1) + min * 60000).toISOString(); }
function resetDb() {
  const projecten = [];
  for (let i = 1; i <= 250; i++) {
    const naam = i <= NAMEN.length ? NAMEN[i - 1] : 'Woning ' + String(i).padStart(3, '0');
    const p = leegProject(i, naam);
    p.id = 'p' + String(i).padStart(3, '0');
    // aangemaakt: oplopend met i; gewijzigd: door elkaar, Aardbei het oudst
    p.created_at = tijd(i * 10);
    p.updated_at = naam === 'Aardbei' ? tijd(1) : tijd(100000 + ((i * 7919) % 250) * 5);
    projecten.push(p);
  }
  S.db = { projecten: projecten, taken: [], projectgeschiedenis: [], mailverzonden: [], app_data: [],
           gebruikers: [{ id: 'u1', naam: 'julian', email: IK.email, actief: true }], mailadressen: [] };
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
  S.vragen.push({ tabel: st.tabel, op: st.op, orde: st.orde, limiet: st.limiet });
  let r = lijst.filter(past);
  if (st.of) {
    const delen = st.of.split(',').map(d => { const m = /^(\w+)\.ilike\.%(.*)%$/.exec(d); return m && [m[1], m[2].toLowerCase()]; }).filter(Boolean);
    r = r.filter(rij => delen.some(([k, t]) => String(rij[k] || '').toLowerCase().indexOf(t) >= 0));
  }
  (st.orde || []).slice().reverse().forEach(([k, op]) => {
    r = r.slice().sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (op ? 1 : -1));
  });
  if (st.limiet) r = r.slice(0, st.limiet);
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
    // De volgorde en de grens écht uitvoeren, zoals PostgreSQL: tekst in
    // bytevolgorde (zoals de collatie "C"), zodat te zien is dat de app
    // zelf nog netjes op naam sorteert.
    b.order = function (k, o) { (st.orde = st.orde || []).push([k, !(o && o.ascending === false)]); return b; };
    b.limit = function (n) { st.limiet = n; return b; };
    // Zoeken: 'naam.ilike.%x%,datum.ilike.%x%,…' — elk veld dat de tekst
    // bevat (hoofdletters tellen niet), net als ilike in PostgreSQL.
    b.or = function (s) { st.of = String(s); return b; };
    b.filter = b.match = b.range = b.in = function () { return b; };
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v102-'));
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
  const fotoMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v102-fotos-'));
  const JPG = path.join(fotoMap, 'IMG_0001.JPG');
  fs.writeFileSync(JPG, Buffer.from(jpg64, 'base64'));
  const PNG = path.join(fotoMap, 'inrit.png');
  fs.copyFileSync('icon-512.png', PNG);
  const jpgBytes = fs.readFileSync(JPG), pngBytes = fs.readFileSync(PNG);
  console.log('   (testfoto: ' + Math.round(jpgBytes.length / 1024) + ' kB, 3000 × 2000)');


  const namenOpScherm = pg => pg.$$eval('#startProjecten .start-project-info strong', els =>
    els.map(e => e.childNodes[0] ? e.childNodes[0].textContent : e.textContent));
  const startscherm = async pg => {
    await pg.goto('about:blank');
    await pg.goto(adres);
    await pg.waitForFunction(() => document.body.classList.contains('op-start'), null, { timeout: 15000 });
    await pg.waitForFunction(() => document.querySelectorAll('#startProjecten .start-project').length > 0, null, { timeout: 15000 });
    await wacht(400);
  };
  const kies = async (pg, waarde) => {
    await pg.selectOption('#startSortering', waarde);
    await pg.waitForFunction(() => !/ophalen/.test(document.getElementById('startProjecten').textContent), null, { timeout: 10000 });
    await wacht(300);
  };
  const ctx = await nieuweContext();
  let page = await nieuwePagina(ctx);
  const updatesVoor = () => S.vragen.filter(v => v.tabel === 'projecten' && v.op !== 'select').length;

  /* ─── 1 ─────────────────────────────────────────────────────── */
  console.log('\n1. Standaard: laatst gewijzigd');
  await startscherm(page);
  if (process.env.SCHERM) await page.screenshot({ path: path.join(process.env.SCHERM, '102-start.png') });
  check('de keuzelijst staat er, op "Laatst gewijzigd"',
        (await page.locator('#startSortering').inputValue()) === 'gewijzigd');
  const verwacht1 = S.db.projecten.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(p => p.naam || '(naamloos)');
  const scherm1 = await namenOpScherm(page);
  check('volgorde: laatst gewijzigd bovenaan', JSON.stringify(scherm1.slice(0, 20)) === JSON.stringify(verwacht1.slice(0, 20)),
        scherm1.slice(0, 4).join(' | '));
  check('alle 250 projecten staan erin (tot v101: hooguit 200)', scherm1.length === 250, scherm1.length);
  check('Aardbei (het langst niet gewijzigd) staat onderaan', scherm1[scherm1.length - 1] === 'Aardbei');

  /* ─── 2 ─────────────────────────────────────────────────────── */
  console.log('\n2. Alfabet');
  const voor = updatesVoor();
  await kies(page, 'alfabet');
  const scherm2 = await namenOpScherm(page);
  check('Aardbei bovenaan, ook al is hij het langst niet gewijzigd', scherm2[0] === 'Aardbei', scherm2.slice(0, 3).join(' | '));
  const pos = n => scherm2.indexOf(n);
  check('hoofdletters tellen niet mee (appel, Bakker, bakker 2)',
        pos('appel') < pos('Bakker') && pos('Bakker') < pos('bakker 2'), [pos('appel'), pos('Bakker'), pos('bakker 2')].join(','));
  check('getallen als getal: Project 2 vóór Project 10', pos('Project 2') < pos('Project 10'));
  check('Éénhoorn bij de E, niet achteraan', pos('Éénhoorn') < pos('Project 2') && pos('Éénhoorn') > pos('bakker 2'));
  check('zuid (kleine letter) na Woning…, niet vóór appel', pos('zuid') > pos('Woning 250') && pos('zuid') > pos('appel'));
  check('naamloos achteraan', scherm2[scherm2.length - 1] === '(naamloos)', scherm2[scherm2.length - 1]);
  check('nog steeds alle 250', scherm2.length === 250);
  const laatsteVraag = S.vragen.filter(v => v.tabel === 'projecten' && v.op === 'select').pop();
  check('de volgorde zit in de vraag aan de database (op naam, grens 1000)',
        laatsteVraag && JSON.stringify(laatsteVraag.orde) === JSON.stringify([['naam', true]]) && laatsteVraag.limiet === 1000,
        JSON.stringify(laatsteVraag));

  /* ─── 3 ─────────────────────────────────────────────────────── */
  console.log('\n3. Aanmaakdatum');
  await kies(page, 'aangemaakt');
  const scherm3 = await namenOpScherm(page);
  const verwacht3 = S.db.projecten.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map(p => p.naam || '(naamloos)');
  check('nieuwste eerst', JSON.stringify(scherm3) === JSON.stringify(verwacht3), scherm3.slice(0, 3).join(' | '));
  check('bij deze sortering staat de aanmaakdatum in de regel',
        /aangemaakt \d/.test(await page.locator('#startProjecten .start-project span').first().innerText()));
  check('sorteren schrijft niets in de database', updatesVoor() === voor, updatesVoor() - voor);

  /* ─── 4 ─────────────────────────────────────────────────────── */
  console.log('\n4. Onthouden, zoeken, snel wisselen');
  await startscherm(page);
  check('na herladen staat de keuze er nog (aanmaakdatum)',
        (await page.locator('#startSortering').inputValue()) === 'aangemaakt' &&
        JSON.stringify(await namenOpScherm(page)) === JSON.stringify(verwacht3));
  await kies(page, 'alfabet');
  await page.fill('#startZoek', 'bakker');
  await wacht(900);
  check('zoeken houdt de sortering aan', JSON.stringify(await namenOpScherm(page)) === JSON.stringify(['Bakker', 'bakker 2']),
        (await namenOpScherm(page)).join(' | '));
  await page.fill('#startZoek', '');
  await wacht(900);
  // Snel achter elkaar: het laatste wint.
  await page.evaluate(() => { startSorteer('gewijzigd'); startSorteer('alfabet'); startSorteer('aangemaakt'); });
  await wacht(1200);
  check('snel wisselen: de laatste keuze staat op het scherm',
        JSON.stringify(await namenOpScherm(page)) === JSON.stringify(verwacht3) &&
        (await page.locator('#startSortering').inputValue()) === 'aangemaakt');

  /* ─── 5 ─────────────────────────────────────────────────────── */
  console.log('\n5. Zonder localStorage (privémodus)');
  const ctx2 = await nieuweContext();
  await ctx2.addInitScript(() => {
    const fout = () => { throw new Error('SecurityError'); };
    try {
      Object.defineProperty(Storage.prototype, 'getItem', { value: function (k) { if (k === 'glasopname_sortering') fout(); return null; } });
      Object.defineProperty(Storage.prototype, 'setItem', { value: function (k) { if (k === 'glasopname_sortering') fout(); } });
    } catch (e) {}
  });
  const p2 = await nieuwePagina(ctx2);
  await startscherm(p2);
  check('valt terug op laatst gewijzigd', (await p2.locator('#startSortering').inputValue()) === 'gewijzigd');
  await kies(p2, 'alfabet');
  check('kiezen werkt toch (alleen niet onthouden)', (await namenOpScherm(p2))[0] === 'Aardbei');
  await ctx2.close();

  /* ─── 6 ─────────────────────────────────────────────────────── */
  console.log('\n6. Telefoon en tablet');
  const ctx3 = await nieuweContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p3 = await nieuwePagina(ctx3);
  await startscherm(p3);
  const maat = await p3.evaluate(() => {
    const s = document.getElementById('startSortering');
    const r = s.getBoundingClientRect();
    return { font: parseFloat(getComputedStyle(s).fontSize), rechts: r.right, breed: innerWidth,
             scroll: document.documentElement.scrollWidth };
  });
  if (process.env.SCHERM) await p3.screenshot({ path: path.join(process.env.SCHERM, '102-telefoon.png') });
  check('telefoon: 16 px in de keuzelijst (anders zoomt iOS in)', maat.font >= 16, maat.font);
  check('telefoon: binnen het scherm, niets schuift opzij', maat.rechts <= maat.breed && maat.scroll <= maat.breed, JSON.stringify(maat));
  await ctx3.close();
  const ctx4 = await nieuweContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true });
  const p4 = await nieuwePagina(ctx4);
  await startscherm(p4);
  check('iPad liggend (breder dan 820 px, aanraakscherm): ook 16 px',
        (await p4.evaluate(() => parseFloat(getComputedStyle(document.getElementById('startSortering')).fontSize))) >= 16);
  await ctx4.close();

  check('geen fouten in de pagina', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  fs.rmSync(map, { recursive: true, force: true });
  fs.rmSync(fotoMap, { recursive: true, force: true });
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
