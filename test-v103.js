/* Testreeks v103 — node test-v103.js
   Vraag van Jan: "Zodat iets nooit stilzwijgend kwijtraakt in de database"
   en "check de complete app ook op andere zulk soort problemen van data of
   andere dingen die opeens stilzwijgend weg/onvindbaar worden".
   Harde eis: nooit gegevens kwijt. Alles wat niet lukt, moet je zien.

   Elk onderdeel hieronder begint met de echte situatie, de belofte en wat
   er tot v102 misging. De meeste fouten zijn gevonden bij de controle van
   de hele app voor v103.

   Wat deze opstelling aanneemt (TESTEN.md, vraag 5):
   - De database is nagebootst in node (S.db). Hij filtert, sorteert,
     begrenst en TELT zoals PostgREST (count: 'exact' = het aantal vóór de
     grens).
   - "Geen bereik" = de database is onbereikbaar: elk verzoek geeft de fout
     die supabase-js dan geeft ("TypeError: Failed to fetch"). De bestanden
     van de app komen in het echt uit de cache van de service worker; hier
     uit de testserver, die bereikbaar blijft. Wat de app met de database
     doet, is daardoor gelijk aan het echte geval.
   - "Niet meer ingelogd" = getSession geeft geen sessie, en de database
     laat dan niets zien en niets wijzigen (zo doet de beveiliging (RLS)
     het in Supabase: geen fout, maar 0 rijen).
   - "Database vol" = de fout die Postgres geeft als Supabase hem op
     alleen-lezen zet (25006, read-only transaction).
   - De klok van het apparaat wordt verzet met een eigen Date; de 'server'
     rekent met de echte tijd.

   Proef op de som: MUTATIE=<naam> node test-v103.js zet een reparatie
   terug in de kopie die de testbrowser krijgt (zie MUTATIES onderaan de
   kop). Dan moet de reeks rood worden; `node test-v103.js --mutaties`
   draait ze allemaal na elkaar en controleert dat.                       */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  // 1. De link wacht niet op eigen werk (zoals tot v102).
  link: ['cloud.js', "if (uitHash !== projectId && projectId && localStorage.getItem(LS_PENDING) === '1' &&",
                     "if (false && uitHash !== projectId && projectId && localStorage.getItem(LS_PENDING) === '1' &&"],
  // 2. Geen controle van wiens inhoud er op het scherm staat.
  basis: ['cloud.js', 'if (basisVan !== projectId) {\n      status(', 'if (false) {\n      status('],
  // 3. Een kopie van een ander project wint gewoon (zoals tot v102).
  kopie: ['cloud.js', "if (localStorage.getItem(LS_PENDING) === '1' && kopieVan(projectId) === 'nee') {",
                      "if (false) {"],
  // 4. Lokaal bewaren dat mislukt, wordt stil ingeslikt.
  lokaal: ['cloud.js', "      try { localStorage.removeItem(LS_STATE); } catch (e2) {}\n      if (!lokaalGemeld",
                       "      return false;\n      if (!lokaalGemeld"],
  // 5. Geen sessiecontrole: 0 rijen = 'project bestaat niet meer'.
  sessie: ['cloud.js', "      if (s === 'weg') { sessieKwijt(); return; }\n      if (s === 'onbekend') { mislukt('sessie nagaan'); return; }",
                       "      s = 'ok';"],
  // 6. Een verwijderd project neemt het eigen werk mee.
  weg: ['cloud.js', "if (openWerk && reddingBewaar(", "if (false && reddingBewaar("],
  // 7. Een taak die niet opgeslagen wordt, verdwijnt stil.
  taak: ['cloud.js', "      if (!res || res.error || !res.data) return taakFout(wat)((res && res.error) || null);",
                     "      if (!res || res.error || !res.data) return null;"],
  // 8. Taken ophalen mislukt = 'nog geen taken'.
  takenlijst: ['cloud.js', "          if (!takenTabel) return null;\n          throw res.error;", "          return null;"],
  // 9. Logboek ophalen mislukt = 'nog geen wijzigingen'.
  logboek: ['project.js', "if (uit[0] === null || uit[1] === null) throw new Error('logboek niet opgehaald');",
                          "uit[0] = uit[0] || []; uit[1] = uit[1] || [];"],
  // 10. Geen telling: meer dan 1000 projecten valt niet op.
  telling: ['start.js', "var totaal = (typeof res.totaal === 'number' && res.totaal > lijst.length) ? res.totaal : lijst.length;",
                        "var totaal = lijst.length;"],
  // 11. De prullenbak op de klok van het apparaat (zoals tot v102).
  klok: ['cloud.js', "return Promise.resolve(sb.rpc('prullenbak_opruimbaar', { dagen: PRULLENBAK_DAGEN })).then(function (res) {",
                     "return window.glasPrullenbak().then(function (l) { var g = Date.now() - PRULLENBAK_DAGEN * 864e5; return { data: l.filter(function (p) { return new Date(p.verwijderd_op).getTime() < g; }) }; }).then(function (res) {"],
  // 12. Database vol = een gewone fout zonder uitleg.
  vol: ['cloud.js', '        if (databaseVol(res.error)) {\n          vuil = true;', '        if (false) {\n          vuil = true;'],
  // 13. Geen waarschuwing voor ruimte op het startscherm.
  ruimte: ['start.js', '    prul.then(vulPrullenbak);\n    vulWaarschuwing();', '    prul.then(vulPrullenbak);'],
  // 14. Eén foto die niet lukt, houdt de rest tegen (zoals tot v102).
  wachtrij: ['wachtrij.js', 'if (opslagVol(e) || (!blijvend(e) && geenVerbinding(e))) stop = true;',
                            'if (!blijvend(e)) stop = true;'],
  // 15. Een volle cloudopslag krijgt de verkeerde raad.
  opslagvol: ['wachtrij.js', '    if (opslagVol(e)) return false;     // gaat over zodra er ruimte is (v103)', '']
};

if (process.argv.indexOf('--mutaties') >= 0) {
  let goed = 0;
  Object.keys(MUTATIES).forEach(function (naam) {
    const r = spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { MUTATIE: naam }),
                                                         encoding: 'utf8', timeout: 600000 });
    const uit = (r.stdout || '') + (r.stderr || '');
    const rood = r.status !== 0;
    const regels = uit.split('\n').filter(l => /^\s+FOUT /.test(l)).map(l => l.trim());
    console.log((rood ? '  ok   ' : '  FOUT ') + 'mutatie ' + naam + (rood ? ' wordt gevangen: ' : ' wordt NIET gevangen') +
                (regels[0] ? regels[0].slice(0, 110) : (/mutatie past niet/.test(uit) ? '(past niet!)' : '')));
    if (rood && !/mutatie past niet/.test(uit)) goed++;
  });
  const n = Object.keys(MUTATIES).length;
  console.log('\n' + (goed === n ? 'Alles goed.' : (n - goed) + ' mutatie(s) niet gevangen.'));
  process.exit(goed === n ? 0 : 1);
}

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
const WACHTWOORD = { 'julian@voorbeeld.test': 'geheim' };
const P = n => '00000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');
const GEEN_BEREIK = { message: 'TypeError: Failed to fetch', code: '', details: '', hint: '' };

const S = {};
function ruit(id, merk, b, h, extra) {
  return Object.assign({ id: id, aantal: 1, merk: merk, maatsoort: 'Sponningmaat', breedte: b, hoogte: h, glasType: '',
           opbouw: '', rooster: 'Nee', glasbewerking: 'Helder (standaard)', roedenverdeling: 'Geen roedenverdeling',
           opmerking: '' }, extra || {});
}
function project(n, naam, rijen, extra) {
  return Object.assign({
    id: P(n), naam: naam, datum: '', status: 'aangemaakt', aantal_ruiten: rijen.length, adres: '',
    open_taken: 0, gewijzigd_naam: '', updated_at: '2026-10-01T09:00:00Z', created_at: '2026-09-01T09:00:00Z',
    verwijderd_op: null,
    data: { rijen: rijen, volgendId: rijen.length + 1, fotos: [], info: {}, taken: [], project: naam,
            datum: '', speling: '4', bijtelling: '11', _versieNr: 103 }
  }, extra || {});
}
function resetDb() {
  S.db = {
    projecten: [
      project(1, 'Kerkstraat 1', [ruit(1, 'A1', '1000', '800')]),
      project(2, 'Molenweg 2', [ruit(1, 'B1', '1200', '600'), ruit(2, 'B2', '700', '1400')])
    ],
    taken: [], projectgeschiedenis: [], mailverzonden: [], app_data: [],
    gebruikers: [{ id: 'u1', naam: 'julian', email: IK.email, actief: true }], mailadressen: []
  };
  S.offline = false; S.wie = IK; S.fout = {}; S.opslag = new Map(); S.uploadFout = {}; S.uploads = [];
  S.rpcWeg = false; S.gebruik = null; S.rpcExtra = [];
  S.nieuwId = 0;
}
resetDb();
const bewaarB = () => JSON.stringify(S.db.projecten.find(p => p.id === P(2)).data);

function dbVraag(st) {
  if (S.offline) return { data: null, error: GEEN_BEREIK };
  const sleutel = st.tabel + ':' + st.op;
  if (S.fout[sleutel]) return { data: null, error: S.fout[sleutel] };
  const lijst = S.db[st.tabel] || (S.db[st.tabel] = []);
  const past = r => Object.keys(st.filters).every(k => r[k] === st.filters[k]) &&
    st.leeg.every(k => r[k] == null) && st.gevuld.every(k => r[k] != null);
  // Niet ingelogd: de beveiliging laat niets zien en niets wijzigen (RLS).
  if (!S.wie) {
    if (st.op === 'insert') return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
    return { data: st.enkel ? null : [], error: null };
  }
  if (st.op === 'insert') {
    const nieuw = (Array.isArray(st.nieuw) ? st.nieuw : [st.nieuw]).map(v => {
      const r = Object.assign({ id: 'nieuw-' + (++S.nieuwId), updated_at: new Date().toISOString(),
                                created_at: new Date().toISOString(), verwijderd_op: null }, JSON.parse(JSON.stringify(v)));
      lijst.push(r);
      return r;
    });
    return { data: st.enkel ? nieuw[0] : nieuw, error: null };
  }
  if (st.op === 'update') {
    const geraakt = lijst.filter(past);
    geraakt.forEach(r => Object.assign(r, JSON.parse(JSON.stringify(st.velden)), { updated_at: new Date().toISOString() }));
    if (st.enkel) return geraakt.length ? { data: geraakt[0], error: null }
                                        : { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
    return { data: st.terug ? geraakt.map(r => ({ id: r.id })) : null, error: null };
  }
  if (st.op === 'delete') {
    const weg = lijst.filter(past);
    S.db[st.tabel] = lijst.filter(r => weg.indexOf(r) < 0);
    return { data: st.terug ? weg.map(r => ({ id: r.id })) : null, error: null };
  }
  let r = lijst.filter(past);
  if (st.of) {
    const delen = st.of.split(',').map(d => { const m = /^(\w+)\.ilike\.%(.*)%$/.exec(d); return m && [m[1], m[2].toLowerCase()]; }).filter(Boolean);
    r = r.filter(rij => delen.some(([k, t]) => String(rij[k] || '').toLowerCase().indexOf(t) >= 0));
  }
  (st.orde || []).slice().reverse().forEach(([k, op]) => {
    r = r.slice().sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (op ? 1 : -1));
  });
  const totaal = r.length;
  if (st.limiet) r = r.slice(0, st.limiet);
  const uit = { data: st.enkel ? JSON.parse(JSON.stringify(r[0] || null)) : JSON.parse(JSON.stringify(r)), error: null };
  if (st.telling) uit.count = totaal;
  return uit;
}

function rpcVraag(v) {
  if (S.offline) return { data: null, error: GEEN_BEREIK };
  if (S.rpcWeg) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.' + v.naam } };
  if (v.naam === 'prullenbak_opruimbaar') {
    // Met de klok van de server (de echte tijd), niet die van het apparaat.
    const grens = Date.now() - ((v.args && v.args.dagen) || 30) * 864e5;
    const ids = S.db.projecten.filter(p => p.verwijderd_op && new Date(p.verwijderd_op).getTime() < grens).map(p => ({ id: p.id }));
    return { data: ids.concat(S.rpcExtra.map(id => ({ id: id }))), error: null };
  }
  if (v.naam === 'glas_gebruik') {
    if (!S.gebruik) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.glas_gebruik' } };
    return { data: S.gebruik, error: null };
  }
  return { data: null, error: { message: 'onbekend' } };
}

function opslagVraag(v) {
  if (v.actie === 'upload') {
    if (S.offline) return { data: null, error: { name: 'StorageUnknownError', message: 'Failed to fetch' } };
    S.uploads.push(v.pad);
    if (S.uploadFout[v.pad]) return { data: null, error: S.uploadFout[v.pad] };
    if (S.opslag.has(v.pad)) return { data: null, error: { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' } };
    S.opslag.set(v.pad, { grootte: v.grootte, type: v.type });
    return { data: { path: v.pad }, error: null };
  }
  if (v.actie === 'list') return { data: [], error: null };
  if (v.actie === 'remove') { (v.paden || []).forEach(p => S.opslag.delete(p)); return { data: [], error: null }; }
  if (v.actie === 'link') return { data: null, error: { statusCode: '404', message: 'Object not found' } };
  return { data: null, error: { message: 'onbekend' } };
}

// De namaak die de pagina krijgt in plaats van lib/supabase-js.
const NAMAAK = `(function () {
  function bouwer(tabel) {
    var st = { tabel: tabel, op: null, filters: {}, leeg: [], gevuld: [], terug: false };
    var b = {};
    b.select = function (k, o) {
      if (!st.op) st.op = 'select'; else st.terug = true;
      if (o && o.count) st.telling = true;
      return b;
    };
    b.insert = function (v) { st.op = 'insert'; st.nieuw = v; return b; };
    b.update = function (v) { st.op = 'update'; st.velden = v; return b; };
    b.delete = function () { st.op = 'delete'; return b; };
    b.eq = function (k, v) { st.filters[k] = v; return b; };
    b.is = function (k) { st.leeg.push(k); return b; };
    b.not = function (k) { st.gevuld.push(k); return b; };
    b.order = function (k, o) { (st.orde = st.orde || []).push([k, !(o && o.ascending === false)]); return b; };
    b.limit = function (n) { st.limiet = n; return b; };
    b.or = function (s) { st.of = String(s); return b; };
    b.filter = b.match = b.range = b.in = function () { return b; };
    function vraag(enkel) { st.enkel = enkel; return window.__db(JSON.stringify(st)).then(JSON.parse); }
    b.single = function () { return vraag(true); };
    b.maybeSingle = function () { return vraag(true); };
    b.then = function (g, f) { return vraag(false).then(g, f); };
    return b;
  }
  function b64(blob) {
    return blob.arrayBuffer().then(function (buf) { return buf.byteLength; });
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
    rpc: function (naam, args) { return window.__rpc(JSON.stringify({ naam: naam, args: args || {} })).then(JSON.parse); },
    functions: { invoke: function () { return Promise.resolve({ data: { ok: true }, error: null }); } },
    channel: function () { var k = { state: 'joined' }; k.on = function () { return k; };
      k.subscribe = function (cb) { if (cb) cb('SUBSCRIBED'); return k; }; return k; },
    removeChannel: function () {},
    storage: { from: function () { return {
      upload: function (pad, blob, o) {
        return b64(blob).then(function (n) {
          return opslag({ actie: 'upload', pad: pad, grootte: n, type: (o && o.contentType) || blob.type });
        });
      },
      list: function (p) { return opslag({ actie: 'list', pad: p }); },
      remove: function (paden) { return opslag({ actie: 'remove', paden: paden }); },
      createSignedUrl: function (pad) { return opslag({ actie: 'link', pad: pad }); }
    }; } }
  }; } };
})();`;

/* ─── de app serveren ─────────────────────────────────────────── */
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v103-'));
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
  const tekst = fs.readFileSync(doel, 'utf8');
  if (tekst.indexOf(m[1]) < 0) { console.log('mutatie past niet: ' + process.env.MUTATIE); process.exit(3); }
  fs.writeFileSync(doel, tekst.replace(m[1], m[2]));
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
    serviceWorkers: 'block' }, opties || {}));
  await ctx.exposeFunction('__db', s => JSON.stringify(dbVraag(JSON.parse(s))));
  await ctx.exposeFunction('__rpc', s => JSON.stringify(rpcVraag(JSON.parse(s))));
  await ctx.exposeFunction('__opslag', s => JSON.stringify(opslagVraag(JSON.parse(s))));
  await ctx.exposeFunction('__sessie', () => JSON.stringify(
    { data: { session: S.wie ? { access_token: 't0k', user: S.wie } : null }, error: null }));
  await ctx.exposeFunction('__login', s => {
    const g = JSON.parse(s);
    if (WACHTWOORD[g.email] && WACHTWOORD[g.email] === g.password) {
      S.wie = IK;
      return JSON.stringify({ data: { user: IK, session: { access_token: 't0k', user: IK } }, error: null });
    }
    return JSON.stringify({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } });
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
  await page.goto('about:blank');
  await page.goto(adres + '#project=' + P(n));
  await page.waitForFunction(id => {
    const v = document.getElementById('projectNaam');
    return v && v.value && window.glasProjectId === id;
  }, P(n), { timeout: 15000 });
  await wacht(700);
}
function rijVan(n) { return S.db.projecten.find(p => p.id === P(n)); }
// Alle meldingen die nu op het scherm staan, als tekst.
async function meldingen(page) {
  return page.$$eval('.melding-laag', ls => ls.map(l => l.innerText.replace(/\s+/g, ' ')));
}
async function wachtOpMelding(page, re, ms) {
  let tekst = '';
  const ok = await wachtTot(async () => {
    tekst = (await meldingen(page)).join(' | ');
    return re.test(tekst);
  }, ms || 8000);
  return { ok: ok, tekst: tekst };
}
async function sluitMeldingen(page) {
  for (let i = 0; i < 6; i++) {
    const n = await page.$$eval('.melding-laag', l => l.length);
    if (!n) return;
    await page.locator('.melding-laag').last().locator('.melding-knoppen button').last().click();
    await wacht(150);
  }
}
async function knop(page, tekst) {
  await page.locator('.melding-laag').last().locator('.melding-knoppen button', { hasText: tekst }).click();
  await wacht(200);
}
// Iets intikken zoals de app het verwerkt: in de gegevens, dan opslaan()
// (de invoervelden doen hetzelfde via setVal; test-v93 klikt echt).
async function typ(page, code) {
  await page.evaluate(c => { (new Function(c))(); window.opslaan(); }, code);
  await wacht(400);
}
// Echt typen in het opmerkingenveld van de eerste regel (het invoer-event
// zelf, zoals een toetsenbord het geeft): zo weet de app dat de gebruiker
// iets deed, en dat telt bij een project dat nog niet geladen is.
async function typOpmerking(page, tekst) {
  await page.evaluate(t => {
    const v = document.querySelector('.opm-input');
    v.value = t;
    v.dispatchEvent(new Event('input', { bubbles: true }));
  }, tekst);
  await wacht(400);
}
async function ls(page, k) { return page.evaluate(k => localStorage.getItem(k), k); }
const apartBewaard = () => S.db.projecten.filter(p => /apart bewaard/.test(p.naam));

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* ══ 1 ════════════════════════════════════════════════════════ */
  console.log('\n1. Een link openen terwijl eigen werk nog niet op de server staat');
  // Echte situatie: Julian meet in een kelder zonder bereik aan de
  // Kerkstraat. Hij krijgt een taakmail over de Molenweg en tikt op de
  // link. Tot v102: de app sprong naar de Molenweg en gooide de vlag
  // 'moet nog omhoog' weg; het werk van de Kerkstraat ging nooit meer
  // omhoog. Belofte: eerst het eigen werk, dan pas de link.
  resetDb();
  let ctx = await nieuweContext();
  let page = await nieuwePagina(ctx);
  await open(page, 1);
  S.offline = true;
  await typ(page, "rijen[0].opmerking = 'kelder'; rijen[0].breedte = '1010';");
  check('het werk staat op het apparaat, met de vlag "moet nog omhoog"',
    await ls(page, 'glasopname_pending') === '1' && /kelder/.test(await ls(page, 'glasopname_v2')));
  await page.goto('about:blank');
  await page.goto(adres + '#project=' + P(2));
  let m = await wachtOpMelding(page, /Eerst je eigen werk/);
  // Hij werkt intussen door (nog steeds zonder bereik).
  await sluitMeldingen(page);
  await typOpmerking(page, 'kelder, nameten');
  check('de app zegt waarom de link nog niet opent', m.ok, m.tekst.slice(0, 120));
  check('het eigen project blijft open', await page.evaluate(() => window.glasProjectId) === P(1) &&
    /project=00000000-0000-4000-8000-000000000001/.test(await page.evaluate(() => location.hash)));
  check('met het werk nog op het scherm', await page.evaluate(() => rijen[0].opmerking) === 'kelder, nameten');
  check('de vlag "moet nog omhoog" staat er nog', await ls(page, 'glasopname_pending') === '1');
  await sluitMeldingen(page);
  const bVoor = bewaarB();
  S.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await wachtTot(() => rijVan(1).data.rijen[0].opmerking === 'kelder, nameten', 15000);
  check('zodra er bereik is, staat het werk in de Kerkstraat', rijVan(1).data.rijen[0].opmerking === 'kelder, nameten' &&
    rijVan(1).data.rijen[0].breedte === '1010');
  check('de Molenweg is niet aangeraakt', bewaarB() === bVoor);
  m = await wachtOpMelding(page, /Verder naar de link/);
  check('en dan pas de vraag of de link nu open mag', m.ok, m.tekst.slice(0, 120));
  if (m.ok) await knop(page, 'Openen');
  await wachtTot(() => page.evaluate(id => window.glasProjectId === id, P(2)), 8000);
  check('"Openen" opent de Molenweg', await page.evaluate(() => window.glasProjectId) === P(2) &&
    await page.evaluate(() => rijen.some(r => r.merk === 'B1')));
  check('met de inhoud van de Molenweg zelf', bewaarB() === bVoor);
  await ctx.close();

  console.log('\n1b. Zelfde, maar met bereik: het werk gaat meteen omhoog en de link opent vanzelf');
  // Echte situatie: kantoor, wifi. Het werk van de Kerkstraat stond nog
  // net niet op de server (de opslag wacht een seconde) en hij tikt op de
  // link naar de Molenweg. Geen vragen nodig: eerst de Kerkstraat
  // opslaan, dan de Molenweg openen.
  resetDb();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  S.offline = true;
  await typ(page, "rijen[0].opmerking = 'net getypt';");
  S.offline = false;
  await page.goto('about:blank');
  await page.goto(adres + '#project=' + P(2));
  await wachtTot(() => page.evaluate(id => window.glasProjectId === id, P(2)), 12000);
  check('de Molenweg opent vanzelf', await page.evaluate(() => window.glasProjectId) === P(2) &&
    await page.evaluate(() => rijen.some(r => r.merk === 'B1')));
  check('het werk van de Kerkstraat staat op de server', rijVan(1).data.rijen[0].opmerking === 'net getypt');
  check('zonder vraag of melding ertussen', (await meldingen(page)).length === 0, (await meldingen(page)).join(' | ').slice(0, 100));
  await ctx.close();

  /* ══ 2 ════════════════════════════════════════════════════════ */
  console.log('\n2. Een project openen zonder bereik, en toch typen');
  // Echte situatie: zonder bereik opent iemand via een link de Molenweg.
  // De app kan die niet ophalen; op het scherm staat nog de Kerkstraat.
  // Wie dan typt, typt in de Kerkstraat. Tot v102 ging dat bij bereik als
  // 'Molenweg' naar de server: de Molenweg werd overschreven met de ruiten
  // van de Kerkstraat. Belofte: de Molenweg blijft heel, en wat er getypt
  // is, gaat apart (nooit weg).
  resetDb();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  S.offline = true;
  await page.goto('about:blank');
  await page.goto(adres + '#project=' + P(2));
  await wachtTot(() => page.evaluate(id => window.glasProjectId === id, P(2)), 8000);
  await wacht(800);
  check('de app staat op de Molenweg (uit de link)', await page.evaluate(() => window.glasProjectId) === P(2));
  await typOpmerking(page, 'getypt zonder bereik');
  const kopie = JSON.parse(await ls(page, 'glasopname_v2') || '{}');
  check('de kopie op het apparaat zegt van wie de inhoud is (de Kerkstraat)', kopie._projectId === P(1), kopie._projectId);
  const bVoor2 = bewaarB();
  S.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await wachtTot(() => apartBewaard().length > 0, 15000);
  await wacht(1000);
  check('de Molenweg is NIET overschreven', bewaarB() === bVoor2, JSON.stringify(rijVan(2).data.rijen.map(r => r.merk)));
  const apart2 = apartBewaard();
  check('het getypte staat als apart project op de server', apart2.length === 1 &&
    apart2[0].data.rijen.some(r => r.opmerking === 'getypt zonder bereik'), apart2.map(p => p.naam).join(', '));
  check('met een naam die zegt wat het is', apart2[0] && /^Kerkstraat 1 \(apart bewaard \d\d-\d\d \d\d:\d\d( - [^)]+)?\)$/.test(apart2[0].naam),
    apart2[0] && apart2[0].naam);
  check('het scherm toont nu de Molenweg zelf', await page.evaluate(() => rijen.some(r => r.merk === 'B1') &&
    !rijen.some(r => r.opmerking === 'getypt zonder bereik')));
  m = await wachtOpMelding(page, /Werk apart bewaard/);
  check('en de app zegt het, met de naam', m.ok && /apart bewaard \d/.test(m.tekst), m.tekst.slice(0, 160));
  check('niets meer op het apparaat dat nog weg moet', !(await ls(page, 'glasopname_redding')) &&
    await ls(page, 'glasopname_pending') !== '1');
  await ctx.close();

  console.log('\n2b. Zelfde, maar het bereik komt terug zonder dat de telefoon het merkt');
  // Echte situatie: zwak signaal. De telefoon denkt al die tijd dat hij
  // online is (geen 'online'-gebeurtenis), het bereik komt terug terwijl
  // hij doortypt. Dan gaat het opslaan vóór het opnieuw laden: precies
  // daar moet de app weigeren om de inhoud van de Kerkstraat als Molenweg
  // te versturen (de controle in synchroniseer).
  resetDb();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  S.offline = true;
  await page.goto('about:blank');
  await page.goto(adres + '#project=' + P(2));
  await wachtTot(() => page.evaluate(id => window.glasProjectId === id, P(2)), 8000);
  await wacht(800);
  await typOpmerking(page, 'zwak signaal 1');
  const bVoor2b = bewaarB();
  // Wisselvallig bereik: het ophalen van het project mislukt nog, een
  // opslag komt wél door. (Zo is het ook vast te leggen in welke volgorde
  // het gebeurt; anders hangt het af van welke klok het eerst afgaat.)
  S.offline = false;
  S.fout['projecten:select'] = GEEN_BEREIK;
  await typOpmerking(page, 'zwak signaal 2');
  await wacht(4000);
  check('terwijl hij doortypt: de Molenweg blijft heel', bewaarB() === bVoor2b,
    JSON.stringify(rijVan(2).data.rijen.map(r => r.merk + ':' + (r.opmerking || ''))));
  delete S.fout['projecten:select'];
  await wachtTot(() => apartBewaard().length > 0, 40000);
  await wacht(800);
  check('en zodra het project geladen is, gaat het getypte apart', apartBewaard().length === 1 &&
    apartBewaard()[0].data.rijen.some(r => r.opmerking === 'zwak signaal 2'));
  check('de Molenweg is ook daarna heel', bewaarB() === bVoor2b);
  await ctx.close();

  /* ══ 3 ════════════════════════════════════════════════════════ */
  console.log('\n3. De kopie op het apparaat hoort bij een ander project (twee tabbladen)');
  // Echte situatie: op de Mac staan twee tabbladen open, zonder bereik.
  // Ze delen de opslag van de browser; het ene tabblad schrijft de
  // Kerkstraat weg, het andere zette de Molenweg als 'open project'. Bij
  // de volgende start staat er werk van de Kerkstraat met de vlag 'moet
  // nog omhoog', terwijl de Molenweg open gaat. Tot v102 won dat werk:
  // de Molenweg werd de Kerkstraat.
  resetDb();
  ctx = await nieuweContext();
  await ctx.addInitScript(([a, b]) => {
    if (localStorage.getItem('__gezet')) return;
    localStorage.setItem('__gezet', '1');
    localStorage.setItem('glasopname_project', b);
    localStorage.setItem('glasopname_pending', '1');
    localStorage.setItem('glasopname_v2', JSON.stringify({
      rijen: [{ id: 1, aantal: 1, merk: 'A1', breedte: '1000', hoogte: '800', opmerking: 'uit tabblad Kerkstraat' }],
      volgendId: 2, fotos: [], info: {}, taken: [], project: 'Kerkstraat 1', datum: '', _projectId: a }));
  }, [P(1), P(2)]);
  page = await nieuwePagina(ctx);
  const bVoor3 = bewaarB();
  await page.goto(adres + '#project=' + P(2));
  await wachtTot(() => apartBewaard().length > 0, 15000);
  await wacht(1000);
  check('de Molenweg is NIET overschreven', bewaarB() === bVoor3);
  check('het werk uit het andere tabblad staat apart op de server', apartBewaard().length === 1 &&
    apartBewaard()[0].data.rijen.some(r => r.opmerking === 'uit tabblad Kerkstraat'));
  check('de Molenweg staat op het scherm', await page.evaluate(() => rijen.some(r => r.merk === 'B1')));
  await ctx.close();

  /* ══ 4 ════════════════════════════════════════════════════════ */
  console.log('\n4. Apart bewaren lukt (nog) niet: het blijft op het apparaat en de app zegt het');
  // Zelfde als 3, maar de server neemt het nieuwe project (nog) niet aan.
  // Belofte: niets weg; het staat op het apparaat, het startscherm zegt
  // het, en zodra het kan gaat het alsnog omhoog.
  resetDb();
  S.fout['projecten:insert'] = GEEN_BEREIK;
  ctx = await nieuweContext();
  await ctx.addInitScript(([a, b]) => {
    if (localStorage.getItem('__gezet')) return;
    localStorage.setItem('__gezet', '1');
    localStorage.setItem('glasopname_project', b);
    localStorage.setItem('glasopname_pending', '1');
    localStorage.setItem('glasopname_v2', JSON.stringify({
      rijen: [{ id: 1, aantal: 1, merk: 'A1', breedte: '1000', hoogte: '800', opmerking: 'wacht nog' }],
      volgendId: 2, fotos: [], info: {}, taken: [], project: 'Kerkstraat 1', datum: '', _projectId: a }));
  }, [P(1), P(2)]);
  page = await nieuwePagina(ctx);
  await page.goto(adres + '#project=' + P(2));
  await wachtTot(async () => !!(await ls(page, 'glasopname_redding')), 10000);
  await wacht(2500);
  const red = JSON.parse(await ls(page, 'glasopname_redding') || '[]');
  check('het werk staat apart op het apparaat', red.length === 1 && red[0].data.rijen[0].opmerking === 'wacht nog');
  check('nog niet op de server', apartBewaard().length === 0);
  await sluitMeldingen(page);
  await page.evaluate(() => window.glasNaarStart && glasNaarStart());
  await wacht(1500);
  let waarsch = await page.$eval('#startWaarschuwing', e => ({ zicht: !e.hidden, tekst: e.innerText }));
  check('het startscherm zegt dat er werk wacht', waarsch.zicht && /apart bewaard/.test(waarsch.tekst), waarsch.tekst.slice(0, 100));
  delete S.fout['projecten:insert'];
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await wachtTot(() => apartBewaard().length === 1, 10000);
  check('zodra het kan, staat het alsnog op de server', apartBewaard().length === 1 &&
    apartBewaard()[0].data.rijen[0].opmerking === 'wacht nog');
  await wacht(500);
  check('en pas dan is het van het apparaat', !(await ls(page, 'glasopname_redding')));
  await ctx.close();

  /* ══ 5 ════════════════════════════════════════════════════════ */
  console.log('\n5. Het apparaat kan niets meer bewaren (opslag van de browser vol)');
  // Echte situatie: een iPad met een volle opslag, of Safari privé. Tot
  // v102 werd dat stil ingeslikt; de oude kopie bleef staan en kon na een
  // herstart als 'werk van nu' naar de server. Belofte: één duidelijke
  // melding, de oude kopie weg, en het werk gaat gewoon naar de server.
  resetDb();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await page.evaluate(() => {
    const echt = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'glasopname_v2') throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      return echt.call(this, k, v);
    };
  });
  await typ(page, "rijen[0].opmerking = 'vol geheugen';");
  m = await wachtOpMelding(page, /Niet bewaard op dit apparaat/);
  check('de app zegt dat het apparaat niets kan bewaren', m.ok, m.tekst.slice(0, 100));
  check('de oude kopie is weg (kan nooit als "werk van nu" gelden)', !(await ls(page, 'glasopname_v2')));
  await sluitMeldingen(page);
  await typ(page, "rijen[0].opmerking = 'vol geheugen 2';");
  check('één keer melden, niet bij elke toets', (await meldingen(page)).filter(t => /Niet bewaard/.test(t)).length === 0);
  await wachtTot(() => rijVan(1).data.rijen[0].opmerking === 'vol geheugen 2', 8000);
  check('het werk staat gewoon op de server', rijVan(1).data.rijen[0].opmerking === 'vol geheugen 2');
  await ctx.close();

  /* ══ 6 ════════════════════════════════════════════════════════ */
  console.log('\n6. Niet meer ingelogd (sessie verlopen of ingetrokken)');
  // Echte situatie: na weken op de bouwplaats is de sessie van de iPad
  // verlopen. De database weigert dan niet met een fout maar laat niets
  // zien: 0 rijen. Tot v102 zei de app "Dit project bestaat niet meer",
  // en wie daarna een ander project opende, was het werk kwijt.
  // Belofte: inlogscherm, het werk blijft, en na inloggen gaat het omhoog.
  resetDb();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  S.wie = null;
  await typ(page, "rijen[0].opmerking = 'na verlopen sessie';");
  await wachtTot(() => page.$eval('#cloudLogin', e => getComputedStyle(e).display !== 'none'), 8000);
  const login = await page.$eval('#cloudLogin', e => ({ zicht: getComputedStyle(e).display !== 'none', tekst: e.innerText }));
  check('het inlogscherm komt', login.zicht, '');
  check('met de uitleg dat het werk er nog is', /niet meer ingelogd/i.test(login.tekst) && /werk/.test(login.tekst), login.tekst.slice(0, 120));
  check('géén "project bestaat niet meer"', !(await meldingen(page)).some(t => /bestaat niet meer/.test(t)));
  check('de vlag "moet nog omhoog" staat er nog', await ls(page, 'glasopname_pending') === '1');
  check('niets apart bewaard (het project is er gewoon)', apartBewaard().length === 0);
  await page.fill('#cloudEmail', IK.email);
  await page.fill('#cloudWachtwoord', 'geheim');
  await page.click('#cloudLoginKnop');
  await wachtTot(() => rijVan(1).data.rijen[0].opmerking === 'na verlopen sessie', 12000);
  check('na inloggen staat het werk op de server', rijVan(1).data.rijen[0].opmerking === 'na verlopen sessie');
  await ctx.close();

  /* ══ 7 ════════════════════════════════════════════════════════ */
  console.log('\n7. Een collega verwijdert het project definitief terwijl jij nog werk had');
  // Echte situatie: de Kerkstraat wordt op kantoor definitief verwijderd
  // (prullenbak geleegd), terwijl er op een iPad nog werk aan zat dat net
  // omhoog wilde. Tot v102 bleef dat alleen op het scherm; wie een ander
  // project opende, was het kwijt. Belofte: het werk gaat apart naar de
  // server.
  resetDb();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  S.db.projecten = S.db.projecten.filter(p => p.id !== P(1));
  await typ(page, "rijen[0].opmerking = 'nog niet verstuurd';");
  await wachtTot(() => apartBewaard().length > 0, 10000);
  check('het werk staat apart op de server', apartBewaard().length === 1 &&
    apartBewaard()[0].data.rijen.some(r => r.opmerking === 'nog niet verstuurd'));
  await wacht(500);
  check('en de app staat op het startscherm (niet verder typen in iets dat weg is)',
    await page.evaluate(() => !document.getElementById('startScherm').hidden && !window.glasProjectId));
  await ctx.close();

  /* ══ 8 ════════════════════════════════════════════════════════ */
  console.log('\n8. Taken zonder bereik of met een fout');
  // Echte situatie: op de bouwplaats een taak toevoegen ('sleutel ophalen
  // bij buurman') zonder bereik. Tot v102 verscheen hij even en verdween
  // dan zonder melding. En als ophalen mislukte, stond er "Nog geen
  // taken" — terwijl er wel taken waren.
  resetDb();
  S.db.taken.push({ id: 't1', project_id: P(1), tekst: 'rooster bestellen', klaar: false, volgorde: 1,
                    eigenaar: 'u1', eigenaar_naam: 'julian', aangemaakt_op: '2026-10-01T09:00:00Z' });
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await wachtTot(() => page.$eval('#takenLijst', e => /rooster bestellen/.test(e.innerText + Array.from(e.querySelectorAll('input')).map(i => i.value).join(' '))), 6000);
  S.fout['taken:insert'] = GEEN_BEREIK;
  await page.evaluate(() => { document.getElementById('taakNieuw').value = 'sleutel ophalen bij buurman'; taakToevoegen(); });
  m = await wachtOpMelding(page, /taak is niet opgeslagen/);
  check('een taak die niet opgeslagen wordt: melding', m.ok, m.tekst.slice(0, 100));
  check('de tekst staat weer in het invoerveld', await page.$eval('#taakNieuw', e => e.value) === 'sleutel ophalen bij buurman');
  await sluitMeldingen(page);
  delete S.fout['taken:insert'];
  S.fout['taken:select'] = GEEN_BEREIK;
  await page.evaluate(() => takenLaden());
  await wacht(800);
  let tl = await page.$eval('#takenLijst', e => e.innerText);
  check('ophalen mislukt: "konden niet opgehaald worden", niet "Nog geen taken"',
    /konden niet opgehaald/.test(tl) && !/Nog geen taken/.test(tl), tl.slice(0, 100));
  delete S.fout['taken:select'];
  await page.evaluate(() => takenLaden());
  await wachtTot(() => page.$eval('#takenLijst', e => /rooster bestellen/.test(e.innerText + Array.from(e.querySelectorAll('input')).map(i => i.value).join(' '))), 6000);
  S.fout['taken:update'] = GEEN_BEREIK;
  await page.evaluate(() => taakKlaar('t1', true));
  m = await wachtOpMelding(page, /taak is niet bijgewerkt/);
  check('afvinken dat niet lukt: melding', m.ok, m.tekst.slice(0, 100));
  await wacht(800);
  const open8 = await page.evaluate(() => {
    const vak = document.querySelector('#takenLijst input[type=checkbox]');
    const l = document.querySelector('#takenLijst');
    return { tekst: l.innerText + Array.from(l.querySelectorAll('input')).map(i => i.value).join(' '), vink: vak ? vak.checked : null };
  });
  check('en de taak staat weer als open (op het scherm én in de database)',
    /rooster bestellen/.test(open8.tekst) && open8.vink === false && S.db.taken[0].klaar === false,
    JSON.stringify(open8).slice(0, 120) + ' db:' + S.db.taken[0].klaar);
  await sluitMeldingen(page);
  delete S.fout['taken:update'];
  // Startscherm: Mijn taken
  S.fout['taken:select'] = GEEN_BEREIK;
  await page.evaluate(() => glasNaarStart());
  await wacht(1500);
  tl = await page.$eval('#startTaken', e => e.innerText);
  check('startscherm: mijn taken niet op te halen → dat staat er', /konden niet opgehaald/.test(tl) &&
    !/Geen openstaande taken/.test(tl), tl.slice(0, 100));
  delete S.fout['taken:select'];
  for (let i = 0; i < 520; i++) {
    S.db.taken.push({ id: 'tt' + i, project_id: P(2), tekst: 'taak ' + i, klaar: false, volgorde: i,
                      eigenaar: 'u1', eigenaar_naam: 'julian', aangemaakt_op: new Date(Date.UTC(2026, 0, 1) + i * 6e4).toISOString() });
  }
  await page.evaluate(() => startVernieuwen());
  await wachtTot(() => page.$eval('#startTaken', e => /van 521/.test(e.innerText)), 8000);
  tl = await page.$eval('#startTaken', e => e.innerText);
  check('meer dan 500 open taken: de app zegt het', /De oudste 500 van 521 open taken/.test(tl), tl.slice(-120));
  check('en de teller noemt het echte aantal', /521 open/.test(await page.$eval('#startTakenTelling', e => e.innerText)));
  await ctx.close();

  /* ══ 9 ════════════════════════════════════════════════════════ */
  console.log('\n9. Logboek: mislukt is niet leeg, en wat er niet getoond wordt, staat er');
  resetDb();
  for (let i = 0; i < 45; i++) {
    S.db.projectgeschiedenis.push({ id: 'g' + i, project_id: P(1), wie_naam: 'julian', samenvatting: 'wijziging ' + i,
      moment: new Date(Date.UTC(2026, 8, 1) + i * 36e5).toISOString() });
  }
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await wachtTot(() => page.$eval('#logboekLijst', e => /wijziging/.test(e.innerText)), 6000);
  let lb = await page.$eval('#logboekLijst', e => ({ tekst: e.innerText, n: e.querySelectorAll('.log-regel').length }));
  check('de laatste 30 staan er', lb.n === 30, String(lb.n));
  check('met "de laatste 30 van 45"', /De laatste 30 van 45/.test(lb.tekst), lb.tekst.slice(-80));
  await page.click('.tab-btn:has-text("Project info")');
  await wacht(300);
  await page.click('#logboekLijst button:has-text("Alles tonen")');
  await wachtTot(() => page.$eval('#logboekLijst', e => e.querySelectorAll('.log-regel').length === 45), 6000);
  check('"Alles tonen" toont ze alle 45', await page.$eval('#logboekLijst', e => e.querySelectorAll('.log-regel').length) === 45);
  S.fout['projectgeschiedenis:select'] = GEEN_BEREIK;
  await page.evaluate(() => logboekLaden());
  await wacht(800);
  lb = await page.$eval('#logboekLijst', e => ({ tekst: e.innerText }));
  check('ophalen mislukt: dat staat er, niet "Nog geen wijzigingen"', /kon niet opgehaald/.test(lb.tekst) &&
    !/Nog geen wijzigingen/.test(lb.tekst), lb.tekst.slice(0, 100));
  S.fout['projectgeschiedenis:select'] = { code: '42P01', message: 'relation "public.projectgeschiedenis" does not exist' };
  await page.evaluate(() => logboekLaden());
  await wacht(800);
  lb = await page.$eval('#logboekLijst', e => ({ tekst: e.innerText }));
  check('tabel bestaat nog niet (script niet gedraaid): gewoon leeg, geen fout', /Nog geen wijzigingen/.test(lb.tekst), lb.tekst.slice(0, 80));
  delete S.fout['projectgeschiedenis:select'];
  // Is er al besteld? Twaalf taakberichten na de bestelling.
  S.db.mailverzonden.push({ project_id: P(1), soort: 'bestelling', gelukt: true, aan: 'glas@leverancier.nl',
                            moment: '2026-09-01T10:00:00Z', wie_naam: 'julian' });
  for (let i = 0; i < 12; i++) {
    S.db.mailverzonden.push({ project_id: P(1), soort: 'taak', gelukt: true, aan: 'bart@voorbeeld.test',
                              moment: new Date(Date.UTC(2026, 8, 2) + i * 36e5).toISOString(), wie_naam: 'julian' });
  }
  const best = await page.evaluate(() => glasMailLog(null, 'bestelling'));
  check('"al besteld?" vindt de bestelling ook achter twaalf taakberichten',
    best.length === 1 && best[0].soort === 'bestelling', JSON.stringify(best).slice(0, 80));
  await ctx.close();

  /* ══ 10 ═══════════════════════════════════════════════════════ */
  console.log('\n10. Meer dan 1000 projecten');
  // Belofte (vraag van Jan): nooit stil een project uit de lijst. De lijst
  // toont er 1000; zijn het er meer, dan staat dat er, met hoe je de rest
  // vindt.
  resetDb();
  for (let i = 3; i <= 1205; i++) {
    const p = project(i, 'Woning ' + String(i).padStart(4, '0'), []);
    p.id = 'w' + i;
    p.updated_at = new Date(Date.UTC(2026, 0, 1) + i * 6e4).toISOString();
    S.db.projecten.push(p);
  }
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await page.goto(adres);
  await wachtTot(() => page.$eval('#startProjecten', e => e.querySelectorAll('.start-project').length > 0), 10000);
  let st = await page.evaluate(() => ({ n: document.querySelectorAll('#startProjecten .start-project').length,
    tekst: document.getElementById('startProjecten').innerText.slice(0, 300),
    teller: document.getElementById('startProjectTelling').innerText }));
  check('1000 getoond', st.n === 1000, String(st.n));
  check('bovenaan: "1000 van 1205 projecten getoond" en hoe je de rest vindt',
    /1000 van 1205 projecten getoond/.test(st.tekst) && /Zoek op naam/.test(st.tekst), st.tekst.slice(0, 120));
  check('de teller noemt het echte aantal', /1205 projecten/.test(st.teller), st.teller);
  await page.fill('#startZoek', 'Woning 0003');
  await wachtTot(() => page.$eval('#startProjecten', e => e.querySelectorAll('.start-project').length === 1), 8000);
  check('zoeken vindt een project dat buiten de 1000 viel',
    /Woning 0003/.test(await page.$eval('#startProjecten', e => e.innerText)));
  await ctx.close();

  /* ══ 11 ═══════════════════════════════════════════════════════ */
  console.log('\n11. De prullenbak rekent met de klok van de server');
  // Echte situatie: een iPad waarvan de klok een maand vooruit staat
  // (handmatig verzet, of een lege batterij). Tot v102 maakte het
  // startscherm dan de hele prullenbak definitief leeg, met foto's.
  resetDb();
  const dag = 864e5;
  S.db.projecten.push(project(3, 'Vijf dagen weg', [], { verwijderd_op: new Date(Date.now() - 5 * dag).toISOString() }));
  S.db.projecten.push(project(4, 'Veertig dagen weg', [], { verwijderd_op: new Date(Date.now() - 40 * dag).toISOString() }));
  S.db.projecten.push(project(5, 'Net teruggezet', [], { verwijderd_op: null }));
  S.rpcExtra = [P(5)];     // stond op de lijst, maar is intussen teruggezet
  ctx = await nieuweContext();
  await ctx.addInitScript(() => {
    const Echt = Date, voor = 60 * 864e5;
    function Nep(...a) { return a.length ? new Echt(...a) : new Echt(Echt.now() + voor); }
    Nep.now = () => Echt.now() + voor; Nep.UTC = Echt.UTC; Nep.parse = Echt.parse; Nep.prototype = Echt.prototype;
    window.Date = Nep;
  });
  page = await nieuwePagina(ctx);
  await page.goto(adres);
  await wachtTot(() => !S.db.projecten.find(p => p.id === P(4)), 10000);
  await wacht(800);
  check('wat 40 dagen in de prullenbak stond, is opgeruimd', !S.db.projecten.find(p => p.id === P(4)));
  check('wat 5 dagen in de prullenbak staat, blijft (ook al zegt de klok van de iPad 65)',
    !!S.db.projecten.find(p => p.id === P(3)));
  check('wat intussen is teruggezet, blijft staan', !!S.db.projecten.find(p => p.id === P(5)));
  await ctx.close();
  resetDb();
  S.db.projecten.push(project(4, 'Veertig dagen weg', [], { verwijderd_op: new Date(Date.now() - 40 * dag).toISOString() }));
  S.rpcWeg = true;
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await page.goto(adres);
  await wacht(3000);
  check('script 22 nog niet gedraaid: niets opgeruimd (liever te laat dan te vroeg)',
    !!S.db.projecten.find(p => p.id === P(4)));
  await ctx.close();

  /* ══ 12 ═══════════════════════════════════════════════════════ */
  console.log('\n12. De database is vol (alleen-lezen)');
  // Echte situatie: het gratis plan raakt over de 500 MB; Supabase zet de
  // database op alleen-lezen. Elke opslag wordt geweigerd. Belofte: dat
  // zie je, met wat je moet doen, en het werk blijft op het apparaat.
  resetDb();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  S.fout['projecten:update'] = { code: '25006', message: 'cannot execute UPDATE in a read-only transaction' };
  await typ(page, "rijen[0].opmerking = 'database vol';");
  m = await wachtOpMelding(page, /Database vol/);
  check('melding "Database vol"', m.ok && /NIET weg/.test(m.tekst), m.tekst.slice(0, 120));
  check('de status zegt het ook', /Database vol/.test(await page.$eval('#cloudStatus', e => e.innerText)));
  check('het werk staat op het apparaat, met de vlag', await ls(page, 'glasopname_pending') === '1' &&
    /database vol/.test(await ls(page, 'glasopname_v2')));
  await sluitMeldingen(page);
  delete S.fout['projecten:update'];
  await typ(page, "rijen[0].breedte = '1001';");
  await wachtTot(() => rijVan(1).data.rijen[0].opmerking === 'database vol', 10000);
  check('weer ruimte: het werk gaat alsnog omhoog', rijVan(1).data.rijen[0].opmerking === 'database vol' &&
    rijVan(1).data.rijen[0].breedte === '1001');
  await ctx.close();

  /* ══ 13 ═══════════════════════════════════════════════════════ */
  console.log('\n13. Ruimte bijna op: waarschuwing op het startscherm');
  const MB = 1048576;
  resetDb();
  S.gebruik = { database_bytes: 425 * MB, opslag_bytes: 300 * MB, opslag_bestanden: 1200 };
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await page.goto(adres);
  await wachtTot(() => page.$eval('#startWaarschuwing', e => !e.hidden), 8000);
  waarsch = await page.$eval('#startWaarschuwing', e => ({ zicht: !e.hidden, tekst: e.innerText, rood: e.classList.contains('rood') }));
  check('85% van de database: waarschuwing', waarsch.zicht && /Database.*85%/.test(waarsch.tekst), waarsch.tekst.slice(0, 120));
  check('nog oranje, niet rood', !waarsch.rood);
  check('de foto-opslag (29%) staat er niet bij', !/Foto-opslag/.test(waarsch.tekst));
  S.gebruik = { database_bytes: 100 * MB, opslag_bytes: 990 * MB, opslag_bestanden: 5000 };
  await page.evaluate(() => glasGebruik(true).then(() => startWaarschuwing()));
  await wacht(800);
  waarsch = await page.$eval('#startWaarschuwing', e => ({ zicht: !e.hidden, tekst: e.innerText, rood: e.classList.contains('rood') }));
  check('foto-opslag 97%: rood, met advies', waarsch.zicht && waarsch.rood && /Foto-opslag bijna vol: 97%/.test(waarsch.tekst) &&
    /prullenbak/.test(waarsch.tekst), waarsch.tekst.slice(0, 140));
  S.gebruik = { database_bytes: 100 * MB, opslag_bytes: 100 * MB, opslag_bestanden: 50 };
  await page.evaluate(() => glasGebruik(true).then(() => startWaarschuwing()));
  await wacht(800);
  check('ruim genoeg: geen waarschuwing', await page.$eval('#startWaarschuwing', e => e.hidden));
  S.gebruik = null;    // script 22 niet gedraaid
  await page.evaluate(() => glasGebruik(true).then(() => startWaarschuwing()));
  await wacht(800);
  check('functie bestaat (nog) niet: geen waarschuwing en geen fout', await page.$eval('#startWaarschuwing', e => e.hidden));
  await ctx.close();

  /* ══ 14 ═══════════════════════════════════════════════════════ */
  console.log("\n14. Foto's in de wachtrij: één die niet lukt, houdt de rest niet tegen");
  // Echte situatie: drie foto's wachten op de iPad. De eerste wordt door
  // de opslag geweigerd (bijvoorbeeld een beveiligingsregel). Tot v102
  // stopte elke ronde bij die eerste: de andere twee gingen nooit omhoog.
  resetDb();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  const pad = n => P(1) + '/foto-' + n + '.jpg';
  S.uploadFout[pad(1)] = { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' };
  S.offline = true;   // eerst alle drie in de wachtrij, zonder bereik
  await page.evaluate(async (paden) => {
    for (const p of paden) await glasWachtrij.zet(p, new Blob([new Uint8Array(2000)], { type: 'image/jpeg' }), {});
  }, [pad(1), pad(2), pad(3)]);
  S.offline = false;
  await page.evaluate(() => glasWachtrij.verwerk());
  await wachtTot(() => S.opslag.has(pad(2)) && S.opslag.has(pad(3)), 10000);
  check('foto 2 en 3 staan in de cloud', S.opslag.has(pad(2)) && S.opslag.has(pad(3)), JSON.stringify(S.uploads));
  check('foto 1 wacht nog op het apparaat (niet weggegooid)', await page.evaluate(p => glasWachtrij.wacht(p), pad(1)));
  // Opslag vol
  S.uploadFout[pad(1)] = { statusCode: '400', error: 'Bad Request', message: 'Storage quota exceeded for this project' };
  await page.evaluate(() => glasWachtrij.verwerk());
  await wacht(800);
  await page.evaluate(() => wachtrijUitleg());
  m = await wachtOpMelding(page, /Wachten op uploaden/);
  check('cloudopslag vol: de uitleg zegt dat', /opslag in de cloud is VOL/.test(m.tekst), m.tekst.slice(0, 200));
  check('en niet de verkeerde raad over 19_originelen', !/19_originelen/.test(m.tekst));
  await sluitMeldingen(page);
  // Al twee dagen in de wachtrij
  await page.evaluate(p => glasWachtrij._open().then(d => new Promise(ok => {
    const t = d.transaction('meta', 'readwrite'); const s = t.objectStore('meta');
    const r = s.get(p); r.onsuccess = () => { const m = r.result; m.gemaakt = Date.now() - 2 * 864e5; s.put(m); };
    t.oncomplete = ok;
  })), pad(1));
  await page.evaluate(() => glasWachtrij.lijst());
  await page.evaluate(() => glasNaarStart());
  await wachtTot(() => page.$eval('#startWaarschuwing', e => /Foto/.test(e.innerText)), 6000);
  waarsch = await page.$eval('#startWaarschuwing', e => ({ zicht: !e.hidden, tekst: e.innerText }));
  check('al twee dagen niet omhoog: het startscherm zegt het', waarsch.zicht && /langer dan een dag/.test(waarsch.tekst),
    waarsch.tekst.slice(0, 140));
  check('en de teller is rood', await page.$eval('#wachtrijTeller', e => e.classList.contains('probleem')));
  await ctx.close();

  /* ══ 15 ═══════════════════════════════════════════════════════ */
  console.log('\n15. Gewoon werken blijft gewoon werken');
  // Een normale dag: project openen, typen, opslaan. Geen meldingen, niets
  // apart bewaard, niets in de console.
  resetDb();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 2);
  await typ(page, "rijen[0].opmerking = 'gewone dag';");
  await wachtTot(() => rijVan(2).data.rijen[0].opmerking === 'gewone dag', 8000);
  check('opgeslagen', rijVan(2).data.rijen[0].opmerking === 'gewone dag');
  check('de kopie op het apparaat hoort bij de Molenweg', JSON.parse(await ls(page, 'glasopname_v2'))._projectId === P(2));
  check('geen meldingen', (await meldingen(page)).length === 0, (await meldingen(page)).join(' | ').slice(0, 100));
  check('niets apart bewaard', apartBewaard().length === 0);
  await page.evaluate(() => cloudOpen('00000000-0000-4000-8000-000000000001'));
  await wachtTot(() => page.evaluate(id => window.glasProjectId === id, P(1)), 6000);
  await typ(page, "rijen[0].opmerking = 'ander project';");
  await wachtTot(() => rijVan(1).data.rijen[0].opmerking === 'ander project', 8000);
  check('wisselen via de lijst en typen: gaat naar het juiste project',
    rijVan(1).data.rijen[0].opmerking === 'ander project' && rijVan(2).data.rijen[0].opmerking === 'gewone dag');
  check('niets apart bewaard', apartBewaard().length === 0);
  await ctx.close();

  check('geen fouten in de console', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' | '));

  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
