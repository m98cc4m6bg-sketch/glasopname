/* Testreeks v93 — node test-v93.js
   In een echte browser (Chromium), met echte kliks op de echte knoppen en
   de echte vensters uit melding.js. Dat is de les van v93: de knop
   ‹Ontgrendelen› werkte sinds v90 niet, en alle tests waren groen omdat
   ze slotOntgrendel() rechtstreeks aanriepen in plaats van op de knop te
   klikken.

   Supabase wordt nagebootst: in plaats van lib/supabase-js krijgt de
   pagina een namaak die elke vraag doorgeeft aan dit script. De database
   en de opslag (Storage) leven hier, in node; zo blijven ze bestaan als de
   pagina herladen wordt, en kan de test er rechtstreeks in kijken.

     1. Ontgrendelen — echte klik, echt wachtwoordvenster
     2. 'Opgenomen door' — vast na de eerste ruit, wijzigen met wachtwoord
     3. Foto zonder bereik — wachtrij, tonen, pdf, draaien, herladen, uploaden
     4. Een ander apparaat ziet de foto nog niet
     5. Originele foto's exporteren als zip
     6. De opslag weigert een origineel (19_originelen.sql niet gedraaid)
     7. Een tekening heeft geen origineel
     8. Definitief verwijderen ruimt ook de originelen en de wachtrij op
     9. Zonder IndexedDB: uploaden zoals vroeger                          */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { chromium } = require('/home/claude/node_modules/playwright');
const JSZip = require('./lib/jszip-3.10.1/jszip.min.js');

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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v93-'));
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
  const fotoMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v93-fotos-'));
  const JPG = path.join(fotoMap, 'IMG_0001.JPG');
  fs.writeFileSync(JPG, Buffer.from(jpg64, 'base64'));
  const PNG = path.join(fotoMap, 'inrit.png');
  fs.copyFileSync('icon-512.png', PNG);
  const jpgBytes = fs.readFileSync(JPG), pngBytes = fs.readFileSync(PNG);
  console.log('   (testfoto: ' + Math.round(jpgBytes.length / 1024) + ' kB, 3000 × 2000)');

  const ctx = await nieuweContext();
  let page = await nieuwePagina(ctx);

  /* ─── 1 ─────────────────────────────────────────────────────── */
  console.log('\n1. Ontgrendelen — met een echte klik op de echte knop');
  await open(page, 1);
  const wissels = await page.evaluate(() => new Promise(ok => {
    let n = 0, vorig = document.querySelector('#slotBalk button');
    const t0 = performance.now();
    (function kijk() {
      const nu = document.querySelector('#slotBalk button');
      if (nu !== vorig) { n++; vorig = nu; }
      if (performance.now() - t0 < 1500) setTimeout(kijk, 0); else ok(n);
    })();
  }));
  check('de knop blijft staan (tot v92: zo\'n 200 keer per seconde vervangen)', wissels === 0, wissels + ' keer in 1,5 s');
  check('de maten staan op slot', await page.locator('#invoerBody input.breedte-input').first().isDisabled());
  await page.click('#slotBalk button', { timeout: 3000 });
  check('een klik opent het wachtwoordvenster', await page.locator('.melding-laag input[type=password]').count() === 1);
  await page.fill('.melding-laag input[type=password]', 'verkeerd');
  await vensterKnop(page, 'Ontgrendelen');
  check('fout wachtwoord: melding, en het slot blijft', /klopt niet/.test(await vensterTekst(page)));
  await vensterKnop(page, 'Oké');
  check('… de balk staat nog op dicht', await page.locator('#slotBalk.dicht').count() === 1);
  await page.click('#slotBalk button', { timeout: 3000 });
  await page.fill('.melding-laag input[type=password]', 'geheim');
  await vensterKnop(page, 'Ontgrendelen');
  await page.waitForSelector('#slotBalk.open', { timeout: 5000 }).catch(() => {});
  check('goed wachtwoord: ontgrendeld door julian', /Ontgrendeld door julian/.test(await page.locator('#slotBalk').innerText()));
  check('de maten zijn weer te wijzigen', !(await page.locator('#invoerBody input.breedte-input').first().isDisabled()));
  await page.locator('#invoerBody input.breedte-input').first().fill('810');
  await page.locator('#invoerBody input.hoogte-input').first().click();
  await wachtOpOpslaan(page);
  check('de wijziging staat in de database', rij(1).data.rijen[0].breedte === '810', rij(1).data.rijen[0].breedte);
  check('het logboek zegt wie ontgrendelde', S.sporen.some(s => /slot geopend door julian/.test(s)), S.sporen.join(' | '));
  const wissels2 = await page.evaluate(() => new Promise(ok => {
    let n = 0, vorig = document.querySelector('#slotBalk button'); const t0 = performance.now();
    (function kijk() { const nu = document.querySelector('#slotBalk button'); if (nu !== vorig) { n++; vorig = nu; }
      if (performance.now() - t0 < 800) setTimeout(kijk, 0); else ok(n); })();
  }));
  check('ook de knop ‹Weer vastzetten› blijft staan', wissels2 === 0, wissels2);
  await page.click('#slotBalk button', { timeout: 3000 });
  await wacht(300);
  check('‹Weer vastzetten› werkt met een klik', await page.locator('#slotBalk.dicht').count() === 1);
  check('… en de maten staan weer vast', await page.locator('#invoerBody input.breedte-input').first().isDisabled());

  /* ─── 2 ─────────────────────────────────────────────────────── */
  console.log('\n2. \'Opgenomen door\' — vast na de eerste ruit, wijzigen met wachtwoord');
  await open(page, 2);
  await wachtOpOpslaan(page);
  check('openen vult niets in (tot v92: wie het project opende)', !rij(2).data.info.opnemer,
        JSON.stringify(rij(2).data.info.opnemer));
  await page.click('button.tab-btn:has-text("Project info")');
  check('het veld staat op alleen-lezen', await page.locator('#pi-opnemer').getAttribute('readonly') !== null);
  check('… en zegt wanneer het ingevuld wordt', /eerste ingevulde ruit/.test(await page.locator('#pi-opnemer').getAttribute('placeholder')));
  await page.click('button.tab-btn:has-text("Invoer")');
  await page.locator('#invoerBody input.breedte-input').first().fill('1000');
  await page.locator('#invoerBody input.hoogte-input').first().click();
  await wachtOpOpslaan(page);
  check('de eerste ruit vult de naam in', rij(2).data.info.opnemer === 'julian', rij(2).data.info.opnemer);
  await page.click('button.tab-btn:has-text("Project info")');
  check('… en het veld laat hem zien', await page.locator('#pi-opnemer').inputValue() === 'julian');
  await page.locator('#pi-opnemer').click();
  await page.keyboard.type('bart');
  check('typen in het veld doet niets', await page.locator('#pi-opnemer').inputValue() === 'julian');
  await page.evaluate(() => projectVeld('opnemer', 'bart'));
  check('ook niet langs projectVeld (het slot zit op de gegevens)',
        await page.evaluate(() => projectInfo.opnemer) === 'julian');
  await page.evaluate(() => window.ongedaan && ongedaan());
  check('Cmd+Z maakt hem niet leeg', await page.evaluate(() => projectInfo.opnemer) === 'julian');
  await page.click('button:has-text("Wijzigen…")');
  await page.fill('.melding-laag input[type=password]', 'fout');
  await vensterKnop(page, 'Verder');
  check('fout wachtwoord: melding', /klopt niet/.test(await vensterTekst(page)));
  await vensterKnop(page, 'Oké');
  check('… en de naam blijft', await page.evaluate(() => projectInfo.opnemer) === 'julian');
  await page.click('button:has-text("Wijzigen…")');
  await page.fill('.melding-laag input[type=password]', 'geheim');
  await vensterKnop(page, 'Verder');
  check('goed wachtwoord: vraagt de nieuwe naam, met de huidige al ingevuld',
        await page.locator('.melding-laag input.melding-invoer').inputValue() === 'julian');
  await page.fill('.melding-laag input.melding-invoer', 'Bart');
  await vensterKnop(page, 'Opslaan');
  await wachtOpOpslaan(page);
  check('de nieuwe naam staat in de database', rij(2).data.info.opnemer === 'Bart', rij(2).data.info.opnemer);
  check('het veld laat hem zien', await page.locator('#pi-opnemer').inputValue() === 'Bart');
  check('het logboek zegt van wie naar wie, en door wie',
        S.sporen.some(s => /"opgenomen door" gewijzigd van julian naar Bart door julian/.test(s)), S.sporen.slice(-2).join(' | '));
  // Een collega opent het project en meet verder.
  S.wie = BART;
  await open(page, 2);
  await page.locator('#invoerBody input.breedte-input').nth(1).fill('700');
  await page.locator('#invoerBody input.hoogte-input').nth(1).click();
  await wachtOpOpslaan(page);
  check('een collega die verder meet, verandert de naam niet', rij(2).data.info.opnemer === 'Bart', rij(2).data.info.opnemer);
  S.wie = IK;
  await open(page, 4);
  await wachtOpOpslaan(page);
  check('een ouder project met ruiten: openen vult niets in', !rij(4).data.info.opnemer, JSON.stringify(rij(4).data.info));

  /* ─── 3 ─────────────────────────────────────────────────────── */
  console.log('\n3. Een foto zonder bereik');
  S.offline = true;
  await open(page, 3);
  await page.setInputFiles('#fotoBestand', JPG);
  await wachtTot(() => page.evaluate(() => fotos.length === 1 && !!fotos[0].pad && !!fotos[0].origineel), 15000);
  let foto = await page.evaluate(() => JSON.parse(JSON.stringify(fotos[0] || {})));
  check('de foto staat in het project (tot v92: "Mislukt", en weg)', !!foto.pad, foto.pad);
  check('verkleind naar 1600 breed', foto.breedte === 1600 && foto.hoogte === 1067, foto.breedte + '×' + foto.hoogte);
  check('het origineel hoort erbij, in de map origineel/',
        !!(foto.origineel && foto.origineel.pad.indexOf(P(3) + '/origineel/') === 0), JSON.stringify(foto.origineel));
  check('… met naam, soort en grootte van het echte bestand',
        foto.origineel && foto.origineel.naam === 'IMG_0001.JPG' && foto.origineel.type === 'image/jpeg' &&
        foto.origineel.grootte === jpgBytes.length && /\.jpg$/.test(foto.origineel.pad));
  await page.waitForSelector('#img-' + foto.id, { timeout: 5000 }).catch(() => {});
  const beeld = await page.evaluate(id => { const i = document.getElementById('img-' + id);
    return i ? { src: i.src.slice(0, 5), b: i.naturalWidth } : null; }, foto.id);
  check('de foto is te zien, uit de wachtrij op het apparaat', beeld && beeld.src === 'blob:' && beeld.b === 1600, JSON.stringify(beeld));
  let rijtje = await page.evaluate(() => glasWachtrij.lijst());
  check('er wachten twee bestanden: de verkleinde foto en het origineel',
        rijtje.length === 2 && rijtje.some(m => m.soort === 'origineel' && m.grootte === jpgBytes.length));
  check('niets in de cloud (geen bereik)', ![...S.opslag.keys()].some(k => k.indexOf(P(3)) === 0));
  check('de teller bovenaan zegt het', /2 te uploaden/.test(await page.locator('#wachtrijTeller').innerText()));
  await page.click('#wachtrijTeller');
  check('… en tikken legt het uit', /2 bestand\(en\).*1 originele/.test(await vensterTekst(page)), (await vensterTekst(page)).slice(0, 120));
  await vensterKnop(page, 'Oké');
  await wachtOpOpslaan(page);
  check('het project zelf is opgeslagen, met het pad en het origineel',
        (rij(3).data.fotos || []).length === 1 && !!rij(3).data.fotos[0].origineel);

  // De pdf zonder bereik.
  await page.evaluate(() => new Promise(ok => {
    const s = document.createElement('script'); s.src = 'lib/jspdf-2.5.2/jspdf.umd.min.js'; s.onload = ok;
    document.head.appendChild(s);
  }));
  await page.evaluate(() => {
    window.__plaatjes = 0;
    const orig = window.jspdf.jsPDF.API.addImage;
    window.jspdf.jsPDF.API.addImage = function (d) {
      if (typeof d === 'string' && d.length > 20000) window.__plaatjes++;
      return orig.apply(this, arguments);
    };
  });
  const pdfDownload = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await page.evaluate(() => exportFotoPdf());
  // De controle op de levergegevens: hier niet van belang.
  await page.click('[data-actie="toch"]', { timeout: 3000 }).catch(() => {});
  const pdfD = await pdfDownload;
  check('de pdf invoer wordt gemaakt zonder bereik', !!pdfD);
  check('… mét de foto erin (tot v92: zonder)', await page.evaluate(() => window.__plaatjes) >= 1,
        await page.evaluate(() => window.__plaatjes));
  if (await page.locator('.melding-laag').count()) await vensterKnop(page, 'Oké');

  // Draaien zonder bereik.
  await page.click('#blok-' + foto.id + ' button[title="Foto een kwartslag draaien"]');
  await wachtTot(() => page.evaluate(p => fotos[0].pad !== p, foto.pad), 10000);
  const gedraaid = await page.evaluate(() => JSON.parse(JSON.stringify(fotos[0])));
  check('draaien kan nu ook zonder bereik (tot v92: alleen met internet)',
        gedraaid.pad !== foto.pad && gedraaid.breedte === 1067 && gedraaid.hoogte === 1600, gedraaid.breedte + '×' + gedraaid.hoogte);
  check('het origineel draait niet mee', gedraaid.origineel.pad === foto.origineel.pad);
  rijtje = await page.evaluate(() => glasWachtrij.lijst());
  check('de gedraaide versie wacht ook', rijtje.length === 3, rijtje.length);
  await wachtOpOpslaan(page);

  // Herladen, nog steeds zonder bereik: de foto staat er nog.
  await open(page, 3);
  await page.waitForSelector('#img-' + foto.id, { timeout: 8000 }).catch(() => {});
  const naHerladen = await page.evaluate(id => { const i = document.getElementById('img-' + id);
    return i ? { src: i.src.slice(0, 5), b: i.naturalWidth } : null; }, foto.id);
  check('na herladen nog te zien, uit de wachtrij', naHerladen && naHerladen.src === 'blob:' && naHerladen.b === 1067, JSON.stringify(naHerladen));
  await wachtTot(async () => /3 te uploaden/.test(await page.locator('#wachtrijTeller').innerText()), 5000);
  check('de teller staat er na herladen nog', /3 te uploaden/.test(await page.locator('#wachtrijTeller').innerText()));

  // Weer bereik.
  S.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  const leeg = await wachtTot(async () => (await page.evaluate(() => glasWachtrij.lijst())).length === 0, 20000);
  check('met bereik gaat alles vanzelf omhoog', leeg);
  const og = S.opslag.get(foto.origineel.pad);
  check('het origineel staat in de cloud, byte voor byte gelijk', !!og && Buffer.compare(og.buf, jpgBytes) === 0 && og.type === 'image/jpeg',
        og ? og.buf.length + ' bytes, ' + og.type : 'niet gevonden');
  check('de verkleinde en de gedraaide foto ook', S.opslag.has(foto.pad) && S.opslag.has(gedraaid.pad));
  const volgorde = S.uploads.filter(p => p.indexOf(P(3)) === 0);
  check('eerst de foto\'s, dan het origineel', volgorde.length === 3 && /origineel/.test(volgorde[2]), volgorde.join(', '));
  check('de teller is weg', await page.locator('#wachtrijTeller').isHidden());

  /* ─── 4 ─────────────────────────────────────────────────────── */
  console.log('\n4. Een ander apparaat ziet de foto nog niet');
  const ctx2 = await nieuweContext();
  const ander = await nieuwePagina(ctx2);
  await open(ander, 6);
  await wacht(800);
  const tekst4 = await ander.locator('#fotoHouder .foto-leeg').first().innerText().catch(() => '');
  check('de melding zegt dat hij nog op een ander apparaat wacht', /nog niet in de cloud/.test(tekst4), tekst4.replace(/\s+/g, ' ').slice(0, 90));
  check('… met een knop om het opnieuw te proberen', await ander.locator('#fotoHouder button:has-text("Opnieuw proberen")').count() === 1);
  await ctx2.close();

  /* ─── 5 ─────────────────────────────────────────────────────── */
  console.log('\n5. Originele foto\'s exporteren');
  // Een titel met tekens die niet in een bestandsnaam mogen, een oude foto
  // zonder origineel, een tekening, en de leverlocatie.
  S.opslag.set(P(3) + '/oud.jpg', { buf: S.opslag.get(foto.pad).buf, type: 'image/jpeg' });
  await page.evaluate(p => {
    fotos[0].titel = 'Voorgevel / links: "boven"';
    fotos.push({ id: 'foud', pad: p + '/oud.jpg', titel: '', breedte: 1600, hoogte: 1067, markeringen: [] });
    fotos.push({ id: 'ftek', pad: p + '/oud.jpg', titel: 'Tekening', bron: 'tekening', breedte: 1600, hoogte: 1067, markeringen: [] });
    opslaan(); renderFotos();
  }, P(3));
  await page.click('button.tab-btn:has-text("Project info")');
  await page.setInputFiles('#leverFotoBlok input[type=file]', PNG);
  await wachtTot(() => page.evaluate(() => !!(window.leverFoto() && leverFoto().origineel)), 10000);
  const lever = await page.evaluate(() => JSON.parse(JSON.stringify(leverFoto() || {})));
  check('de leverfoto krijgt ook een origineel', lever.origineel && lever.origineel.type === 'image/png' && /\.png$/.test(lever.origineel.pad),
        JSON.stringify(lever.origineel));
  await wachtTot(async () => (await page.evaluate(() => glasWachtrij.lijst())).length === 0, 15000);
  const zipD = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await page.evaluate(() => exportKies('originelen'));
  const d5 = await zipD;
  check('er komt een zip', !!d5 && /^Fotoproject - Originele fotos - \d\d-\d\d-\d{4}\.zip$/.test(d5.suggestedFilename()),
        d5 && d5.suggestedFilename());
  if (d5) {
    const zip = await JSZip.loadAsync(fs.readFileSync(await d5.path()));
    const namen = Object.keys(zip.files).sort();
    check('met de juiste bestanden', JSON.stringify(namen) === JSON.stringify(
      ['01 Voorgevel links boven.jpg', '02 Foto 2 (verkleind).jpg', 'Leverlocatie.png', 'overzicht.txt']), namen.join(', '));
    const a = await zip.file('01 Voorgevel links boven.jpg').async('nodebuffer');
    check('de foto is het origineel, byte voor byte', Buffer.compare(a, jpgBytes) === 0, a.length + ' / ' + jpgBytes.length);
    const l = await zip.file('Leverlocatie.png').async('nodebuffer');
    check('de leverlocatie ook', Buffer.compare(l, pngBytes) === 0);
    const o = await zip.file('overzicht.txt').async('string');
    check('het overzicht noemt de oorspronkelijke bestandsnaam', /IMG_0001\.JPG/.test(o) && /vóór v93/.test(o));
    check('de tekening zit er niet in', !namen.some(n => /Tekening/.test(n)));
  }
  await wacht(300);
  check('een melding over de foto zonder origineel', (await page.locator('.melding-laag').count()) &&
        /vóór v93/.test(await vensterTekst(page)));
  if (await page.locator('.melding-laag').count()) await vensterKnop(page, 'Oké');

  // Leverfoto weghalen: origineel mee, ook uit de cloud.
  await page.evaluate(() => { window.__oudAppVraag = window.appVraag; window.appVraag = () => Promise.resolve(true); });
  await page.evaluate(() => leverFotoWeg());
  await wacht(500);
  await page.evaluate(() => { window.appVraag = window.__oudAppVraag; });
  check('leverfoto weg: het origineel gaat mee uit de cloud', !S.opslag.has(lever.origineel.pad) && !S.opslag.has(lever.pad));

  /* ─── 6 ─────────────────────────────────────────────────────── */
  console.log('\n6. De opslag weigert het origineel (19_originelen.sql nog niet gedraaid)');
  S.limiet = 8388608; S.soorten = ['image/jpeg', 'image/png', 'image/webp'];
  const groot = path.join(fotoMap, 'IMG_0002.HEIC');
  // Een groot bestand van een soort die de map nog niet kent. Chromium kan
  // geen HEIC lezen, dus de inhoud is een jpeg; het gaat om naam en grootte.
  fs.writeFileSync(groot, Buffer.concat([jpgBytes, Buffer.alloc(9 * 1024 * 1024)]));
  await open(page, 5);
  await page.setInputFiles('#fotoBestand', { name: 'IMG_0002.HEIC', mimeType: 'image/heic', buffer: fs.readFileSync(groot) });
  await wachtTot(() => page.evaluate(() => fotos.length === 1 && !!fotos[0].origineel), 15000);
  const f6 = await page.evaluate(() => JSON.parse(JSON.stringify(fotos[0] || {})));
  check('de foto staat erin', !!f6.pad && f6.origineel && f6.origineel.type === 'image/heic' && /\.heic$/.test(f6.origineel.pad),
        JSON.stringify(f6.origineel));
  await wachtTot(async () => S.opslag.has(f6.pad) && (await page.evaluate(() => glasWachtrij.lijst())).length === 1, 15000);
  check('de verkleinde foto gaat gewoon omhoog', S.opslag.has(f6.pad));
  rijtje = await page.evaluate(() => glasWachtrij.lijst());
  check('het origineel blijft op het apparaat, met de reden', rijtje.length === 1 && /maximum allowed size|413/.test(rijtje[0].fout), rijtje[0] && rijtje[0].fout);
  check('de teller wordt rood', await page.locator('#wachtrijTeller.probleem').count() === 1);
  const pogingen = S.uploads.length;
  await page.evaluate(() => glasWachtrij.verwerk());
  await wacht(500);
  check('deze sessie niet steeds opnieuw proberen', S.uploads.length === pogingen, (S.uploads.length - pogingen) + ' extra');
  await page.click('#wachtrijTeller');
  check('de uitleg wijst naar 19_originelen.sql', /19_originelen\.sql/.test(await vensterTekst(page)));
  await vensterKnop(page, 'Oké');
  // Jan draait het script, de app start opnieuw.
  S.limiet = 52428800; S.soorten = null;
  await open(page, 5);
  const gelukt6 = await wachtTot(async () => (await page.evaluate(() => glasWachtrij.lijst())).length === 0, 15000);
  check('na het script en een herstart gaat hij alsnog', gelukt6 && S.opslag.has(f6.origineel.pad) &&
        S.opslag.get(f6.origineel.pad).type === 'image/heic');

  /* ─── 7 ─────────────────────────────────────────────────────── */
  console.log('\n7. Een tekening heeft geen origineel');
  await page.setInputFiles('#tekeningBestand', PNG);
  await wachtTot(() => page.evaluate(() => fotos.length === 2), 10000);
  const tek = await page.evaluate(() => JSON.parse(JSON.stringify(fotos[1] || {})));
  check('de tekening staat erin, zonder origineel', tek.bron === 'tekening' && !!tek.pad && !tek.origineel, JSON.stringify(tek).slice(0, 120));

  // Een nieuwe foto in een bestaande groep: nieuw origineel, niet dat van
  // de vorige foto.
  const groep = await page.evaluate(() => fotos[0].id);
  const oudOrigineel = await page.evaluate(() => fotos[0].origineel.pad);
  const kiezer = page.waitForEvent('filechooser', { timeout: 5000 });
  await page.evaluate(id => fotoAanGroep(id), groep);
  await (await kiezer).setFiles(PNG);
  await wachtTot(() => page.evaluate(o => fotos[0].origineel && fotos[0].origineel.pad !== o, oudOrigineel), 10000);
  const vervangen = await page.evaluate(() => JSON.parse(JSON.stringify(fotos[0])));
  check('nieuwe foto in een bestaande groep: het nieuwe origineel hoort erbij',
        vervangen.id === groep && vervangen.origineel && vervangen.origineel.naam === 'inrit.png' &&
        vervangen.breedte === 512, JSON.stringify(vervangen.origineel));

  /* ─── 8 ─────────────────────────────────────────────────────── */
  console.log('\n8. Definitief verwijderen');
  // Nog iets in de wachtrij van dit project, zonder bereik.
  S.offline = true;
  await open(page, 3);
  await page.setInputFiles('#fotoBestand', JPG);
  await wachtTot(async () => (await page.evaluate(() => glasWachtrij.lijst())).length === 2, 10000);
  S.offline = false;
  check('voor het verwijderen: originelen in de cloud', [...S.opslag.keys()].some(k => k.indexOf(P(3) + '/origineel/') === 0));
  // Even geen upload: de wachtrij mag niet vóór het verwijderen leeglopen.
  await page.evaluate(() => { window.__echtVerwerk = glasWachtrij.verwerk; glasWachtrij.verwerk = () => Promise.resolve(); });
  await page.evaluate(id => { window.appVraag = () => Promise.resolve(true); return glasNuDefinitief(id, 'Fotoproject'); }, P(3));
  await wacht(800);
  const over = [...S.opslag.keys()].filter(k => k.indexOf(P(3)) === 0);
  check('alles van het project is uit de cloud, ook de map origineel/', over.length === 0, over.join(', '));
  rijtje = await page.evaluate(() => glasWachtrij.lijst());
  check('en wat nog wachtte, gaat niet meer omhoog', !rijtje.some(m => m.projectId === P(3)), rijtje.length);
  check('het project zelf is weg', !rij(3));

  /* ─── 9 ─────────────────────────────────────────────────────── */
  console.log('\n9. Zonder IndexedDB (bijvoorbeeld Safari privé)');
  const ctx3 = await nieuweContext();
  await ctx3.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { get: () => undefined }); });
  const zonder = await nieuwePagina(ctx3);
  await open(zonder, 6);
  await zonder.setInputFiles('#fotoBestand', JPG);
  await wachtTot(() => zonder.evaluate(() => fotos.length === 2 && !!fotos[1].origineel), 15000);
  const f9 = await zonder.evaluate(() => JSON.parse(JSON.stringify(fotos[1] || {})));
  check('met bereik: meteen geüpload, zoals vroeger', !!f9.pad && S.opslag.has(f9.pad));
  check('… en het origineel ook', f9.origineel && S.opslag.has(f9.origineel.pad) &&
        Buffer.compare(S.opslag.get(f9.origineel.pad).buf, jpgBytes) === 0);
  S.offline = true;
  await zonder.setInputFiles('#fotoBestand', JPG);
  await wacht(2500);
  check('zonder bereik: "Mislukt", en geen kapotte foto in het project',
        /Mislukt/.test(await zonder.locator('#fotoMelding').innerText()) && await zonder.evaluate(() => fotos.length) === 2);
  S.offline = false;
  await ctx3.close();

  /* ─── 10 ────────────────────────────────────────────────────── */
  // De tekst van een taak staat in een invoerveld; dat telt mee.
  const takenTekst = () => page.evaluate(() => {
    const h = document.getElementById('takenLijst');
    return h ? h.innerText + ' ' + [...h.querySelectorAll('input, textarea')].map(i => i.value).join(' ') : '';
  });
  console.log('\n10. Nieuw project: geen taken en logboek van het vorige (v95)');
  S.offline = false;
  S.db.projectgeschiedenis.push({ id: 'g-oud', project_id: P(1), moment: '2026-10-12T10:58:00Z',
                                  wie_naam: 'julian', samenvatting: 'OUDPROJECT-LOGREGEL' });
  S.db.taken.push({ id: 't-oud', project_id: P(1), tekst: 'OUDPROJECT-TAAK', klaar: false, volgorde: 1 });
  await open(page, 1);
  await page.click('button.tab-btn:has-text("Project info")');
  await wachtTot(async () => /OUDPROJECT-LOGREGEL/.test(await page.locator('#logboekLijst').innerText()), 5000);
  check('vooraf: project 1 toont zijn logboek en taak',
        /OUDPROJECT-LOGREGEL/.test(await page.locator('#logboekLijst').innerText()) &&
        /OUDPROJECT-TAAK/.test(await takenTekst()));
  page.evaluate(() => { cloudNieuw(); });
  await page.waitForSelector('.melding-laag input.melding-invoer', { timeout: 5000 });
  await page.fill('.melding-laag input.melding-invoer', 'Nieuw na project 1');
  await vensterKnop(page, 'Aanmaken');
  await wachtTot(() => page.evaluate(p1 => !!window.glasProjectId && window.glasProjectId !== p1, P(1)), 8000);
  await wacht(1500);
  const log10 = await page.locator('#logboekLijst').innerText();
  const tak10 = await takenTekst();
  check('het logboek van het vorige project is weg', !/OUDPROJECT-LOGREGEL/.test(log10), log10.replace(/\s+/g, ' ').slice(0, 80));
  check('de taken van het vorige project zijn weg', !/OUDPROJECT-TAAK/.test(tak10), tak10.replace(/\s+/g, ' ').slice(0, 80));
  await open(page, 1);
  await page.click('button.tab-btn:has-text("Project info")');
  await wachtTot(async () => /OUDPROJECT-LOGREGEL/.test(await page.locator('#logboekLijst').innerText()), 5000);
  check('terug in project 1: logboek en taak er weer',
        /OUDPROJECT-LOGREGEL/.test(await page.locator('#logboekLijst').innerText()) &&
        /OUDPROJECT-TAAK/.test(await takenTekst()));

  /* ─── 11 ────────────────────────────────────────────────────── */
  console.log('\n11. Opbouwlijsten (v96): oude lijst in de database, oude waarde in een project');
  // De database heeft nog de lijst van vóór v96 (20_opbouwlijsten.sql niet gedraaid).
  S.db.app_data = [{ key: 'glas_data', waarde: {
    opbouw_per_type: { 'HR++ glas': ['4-13-4', '4-13-5', '5-13-4', '8-13-4', '4-24-4'] },
    lookup: { 'HR++ glas|8-13-4': { glasOnly: 12, totaal: 25, kg_m2: 30 } } } }];
  await open(page, 7);
  await wacht(800);
  const d11 = await page.evaluate(() => ({
    hr: DATA.opbouw_per_type['HR++ glas'], l48: DATA.lookup['HR++ glas|4-13-8'],
    l84: DATA.lookup['HR++ glas|8-13-4'], l44: DATA.lookup['HR++ glas|4-13-4'] }));
  check('oude lijst in de database: de app houdt zijn eigen lijst',
        d11.hr.indexOf('5-13-4') < 0 && d11.hr.indexOf('4-24-4') < 0 && d11.hr.indexOf('4-13-8') >= 0, d11.hr.length + ' opbouwen');
  check('dikte en gewicht van 4-13-8 zijn er, ook al kent de database ze niet', !!d11.l48 && !!d11.l44);
  check('wat de database wél heeft, wint (8-13-4)', d11.l84 && d11.l84.kg_m2 === 30);
  const opties = await page.evaluate(() => {
    const s = document.querySelector('#invoerBody select[id^="opb-"]');
    return s ? { waarde: s.value, opties: [...s.options].map(o => o.value) } : null;
  });
  check('een project met 5-13-4 houdt die waarde, als oude waarde in de lijst',
        !!opties && opties.waarde === '5-13-4' && opties.opties.indexOf('5-13-4') >= 0, JSON.stringify(opties && opties.waarde));
  // Na het script: de database heeft de nieuwe lijst en wint weer.
  S.db.app_data = [{ key: 'glas_data', waarde: {
    opbouw_per_type: { 'HR++ glas': ['4-13-4', '4-13-5', '4-13-8', '4-15-4'] }, lookup: {} } }];
  await open(page, 7);
  await wacht(800);
  const d11b = await page.evaluate(() => DATA.opbouw_per_type['HR++ glas']);
  check('nieuwe lijst in de database: die wint', JSON.stringify(d11b) === JSON.stringify(['4-13-4', '4-13-5', '4-13-8', '4-15-4']), JSON.stringify(d11b));
  S.db.app_data = [];

  check('geen fouten in de pagina', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' | '));

  await browser.close();
  server.close();
  fs.rmSync(map, { recursive: true, force: true });
  fs.rmSync(fotoMap, { recursive: true, force: true });
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
