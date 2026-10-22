/* Testreeks v117 — node test-v117.js   (en: node test-v117.js --mutaties)

   Onderwerp: het to-do-lijstje van Jan (21-10-2026), de punten die na v116
   nog open stonden:
   - de dikte van het pakket op Toebehoren (zonder en met lat);
   - "max glaspakket (incl. band)" uit een maatstaat: controleren (rood als
     glas + band te dik is) en te dikke opbouwen grijs in de keuzelijst
     (keuze Jan); niet meer in de opmerking (die gaat naar de leverancier);
   - latzijde binnen: nooit een neuslat of ventilatielat; een eerdere keuze
     wordt rood, niet stil veranderd (keuze Jan);
   - de uitsteek van de neuslat in de knop;
   - een voorbeeld van de glaslat bij "Alle ruiten";
   - het zaagplan als tekening, op Toebehoren en in de PDF invoer;
   - bediening "standaard" ook op de bestellijst;
   - in de Naslag: de leverancier doet de glasaftrek altijd zelf.

   Echte situatie: Jan leest een maatstaat van de kozijnfabriek in, met een
   kolom "Max glaspakket incl band". Daarna kiest hij het glas: de app moet
   zeggen welke opbouw te dik is. Bij een renovatie met latten binnen kiest
   hij onderin per ongeluk een neuslat (of had dat al): dat moet opvallen.

   Wat deze opstelling aanneemt: zoals test-v115 (nagebootste database in
   node, echte Chromium, pdf teruggelezen met pdfplumber). PLAATJES=map voor
   schermafdrukken (pc, iPad 820, telefoon 390). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');


/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  maxOordeel: ["latten.js", "    if (mx && ERNST[mx.status] > ERNST[slechtste.status]) { slechtste = mx; waar = 'max'; }", ""],
  maxGeen: ["latten.js", "      if (mx && mx.status === 'past niet') { og.slechtste = mx; og.waar = 'max'; }", ""],
  binnenNeus: ["latten.js", "    var binnen = zijde(r) === 'binnen';\n    if (keuze === 'NEUS') {", "    var binnen = false;\n    if (keuze === 'NEUS') {"],
  kiesOnderBinnen: ["latten.js", "    if (!onderMagBij(r, w)) {", "    if (0) {"],
  kiezerBinnen: ["latten.js", "      (binnen ? '' : andere(['ventilatie']", "      (0 ? '' : andere(['ventilatie']"],
  alleOverslaan: ["toebehoren.js", "        if (GL() && !GL().onderMagBij(r, w, zNa)) overgeslagen.push", "        if (0) overgeslagen.push"],
  uitsteek: ["latten.js", "' · uitst. ' + nl(ol.neus.uitsteek)", "''"],
  pakketMet: ["toebehoren.js", "      (pd.met != null && pd.met !== pd.zonder ?", "      (false ?"],
  pakketMax: ["toebehoren.js", "(mx && mx.status === 'past niet' ? ' te-dik' : '')", "''"],
  voorbeeld: ["toebehoren.js", "    if (wat === 'lat') { var v = el('tbAlleVoorbeeld');", "    if (0) { var v = el('tbAlleVoorbeeld');"],
  opbouwGrijs: ["naslag.js", "    if (!G || !G.maxPakket(rij)) return false;", "    return false;"],
  importOpmerking: ["import.js", "      if (o.maxPakket) r.maxPakket = o.maxPakket;", "      if (o.maxPakket) { r.maxPakket = o.maxPakket; onbekend.push('max pakket ' + o.maxPakket + ' mm'); }"],
  bedieningStd: ["index.html", "  return roosterJa ? 'standaard' : '';", "  return '';"],
  zaagScherm: ["toebehoren.js", "  function zaagHTML(l) {\n    var plan = l.plan || [];\n", "  function zaagHTML(l) {\n    var plan = l.plan || []; return '';\n"],
  zaagOpen: ["toebehoren.js", "(zaagOpen[l.type] ? ' open' : '')", "''"],
  zaagPdf: ["pdf.js", "          if (w > 9) { doc.setTextColor(58, 42, 26);", "          if (0) { doc.setTextColor(58, 42, 26);"],
  aftrekZin: ["naslag.js", "'<b>Je bestelt de totale glasmaat incl. rooster; de hoogte-aftrek (speling) voor het rooster trekt de leverancier er zelf af.</b> ' +", "'<b></b> ' +"],
};
const WAAR = { maxOordeel: '1', maxGeen: '1', binnenNeus: '1', kiesOnderBinnen: '1', kiezerBinnen: '2', alleOverslaan: '2', uitsteek: '1',
  pakketMet: '2', pakketMax: '2', voorbeeld: '2', opbouwGrijs: '3', importOpmerking: '3', bedieningStd: '4', zaagScherm: '2', zaagOpen: '2',
  zaagPdf: '4', aftrekZin: '5' };

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
  // Bij de mutatieproef is de eerste FOUT genoeg: de mutatie is gevangen.
  if (!ok && process.env.MUTATIE) process.exit(1);
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
// De foto van de gevel: een echt jpeg-plaatje (800 × 600, vier kozijnen),
// zodat ook de pdf hem kan plaatsen.
const GEVEL = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'test-gevel.jpg')).toString('base64');
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
  S.nieuwId = 0; S.weg = {}; S.zonderTrigger = false;
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
    geraakt.forEach(r => {
      const oud = JSON.parse(JSON.stringify(r));
      Object.assign(r, JSON.parse(JSON.stringify(st.velden)), { updated_at: new Date().toISOString() });
      if (st.tabel === 'projecten' && st.velden.data && !S.zonderTrigger) triggerBestellingen(oud, r);
    });
    if (st.terug && st.kols && /bestellingen:data->info->bestellingen/.test(st.kols)) {
      return { data: geraakt.map(r => ({ id: r.id, status: r.status,
        bestellingen: JSON.parse(JSON.stringify(((r.data || {}).info || {}).bestellingen || null)) })), error: null };
    }
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
  // PostgREST: een kolom als 'bestellingen:data->info->bestellingen' geeft
  // dat stuk van de JSON terug onder die naam.
  if (st.kols && /bestellingen:data->info->bestellingen/.test(st.kols)) {
    r = r.map(x => Object.assign({}, x, { bestellingen: ((x.data || {}).info || {}).bestellingen || null }));
  }
  const uit = { data: st.enkel ? JSON.parse(JSON.stringify(r[0] || null)) : JSON.parse(JSON.stringify(r)), error: null };
  if (st.telling) uit.count = totaal;
  return uit;
}

// Nabootsing van 23_bestellingen.sql (die zelf wordt getest in test-sql.sql
// §20, tegen een echte PostgreSQL): een bestelling die in de database stond
// en in de nieuwe stand ontbreekt, komt terug; een intrekking wint; status
// en slot zakken niet onder 'besteld' door een apparaat dat hem niet kende.
const RANG = { besteld: 2, geleverd: 3, gemonteerd: 4, afgerond: 5, 'bezig met inmeten/verwerken': 1 };
function triggerBestellingen(oudRij, r) {
  const oud = ((oudRij.data || {}).info || {}).bestellingen;
  if (!Array.isArray(oud) || !oud.length) return;
  r.data.info = r.data.info || {};
  const nieuw = Array.isArray(r.data.info.bestellingen) ? r.data.info.bestellingen : [];
  const opN = {}; nieuw.forEach(b => { opN[b.op] = b; });
  const ontbrak = oud.some(o => !opN[o.op] || (o.ingetrokken && !opN[o.op].ingetrokken));
  const geldigTerug = oud.some(o => !o.ingetrokken && !opN[o.op]);
  const intrekkingOnbekend = oud.some(o => o.ingetrokken && opN[o.op] && !opN[o.op].ingetrokken);
  if (!ontbrak) return;
  const per = {};
  nieuw.forEach(b => { per[b.op] = b; });
  oud.forEach(o => { if (!per[o.op] || (o.ingetrokken && !per[o.op].ingetrokken)) per[o.op] = o; });
  const samen = Object.keys(per).map(k => per[k])
    .sort((x, y) => String(x.op).localeCompare(String(y.op)))
    .map((b, i) => Object.assign({}, b, { nr: i + 1 }));
  r.data.info.bestellingen = samen;
  const laatste = samen.filter(b => !b.ingetrokken).pop();
  if (laatste) {
    // v105: wat er in totaal besteld is (1e + aanvullingen, min geannuleerd),
    // plus wat bij de laatste bekend was maar niet besteld. Zoals het script.
    let k = {};
    samen.filter(b => !b.ingetrokken).forEach(b => {
      if (b.soort !== 'aanvulling') k = {};
      Object.keys(b.ruiten || {}).forEach(id => {
        const v = b.ruiten[id];
        if (typeof v !== 'object') k[id] = v; else if (v && v.opLijst) k[id] = v.k;
      });
      Object.keys(b.vervallen || {}).forEach(id => { delete k[id]; });
    });
    const aantal = Object.keys(k).length;
    Object.keys(laatste.ruiten || {}).forEach(id => {
      const v = laatste.ruiten[id];
      if (v && typeof v === 'object' && !v.opLijst && !(id in k)) k[id] = v.k;
    });
    r.data.info.besteld = { op: laatste.op, door: laatste.door || '', aantal: aantal, ruiten: k };
  } else delete r.data.info.besteld;
  const rang = x => RANG[x] || 0;
  if (geldigTerug) {
    if (rang(r.status) < rang(oudRij.status)) { r.status = oudRij.status; r.data.info.status = oudRij.status; }
    r.data.info.slot = ((oudRij.data || {}).info || {}).slot || null;
  }
  if (intrekkingOnbekend && !laatste && rang(oudRij.status) < 2 && rang(r.status) >= 2) {
    r.status = oudRij.status; r.data.info.status = oudRij.status;
    r.data.info.slot = ((oudRij.data || {}).info || {}).slot || null;
  }
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
  if (v.naam === 'glas_status_rang') {
    // Bestaat alleen als script 23 gedraaid is.
    if (S.zonderTrigger) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.glas_status_rang' } };
    return { data: 2, error: null };
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
  if (v.actie === 'link') {
    // De foto van de gevel (v110): een plaatje van 800 × 600 met vier kozijnen.
    if (/gevel/.test(v.pad)) return { data: { signedUrl: GEVEL }, error: null };
    return { data: null, error: { statusCode: '404', message: 'Object not found' } };
  }
  return { data: null, error: { message: 'onbekend' } };
}

// De namaak die de pagina krijgt in plaats van lib/supabase-js.
const NAMAAK = `(function () {
  function bouwer(tabel) {
    var st = { tabel: tabel, op: null, filters: {}, leeg: [], gevuld: [], terug: false };
    var b = {};
    b.select = function (k, o) {
      if (!st.op) { st.op = 'select'; st.kols = k; } else { st.terug = true; st.kols = k; }
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v117-'));
fs.readdirSync('.').forEach(function (naam) {
  if (fs.statSync(naam).isDirectory()) return;
  fs.copyFileSync(naam, path.join(map, naam));
});
fs.cpSync('lib', path.join(map, 'lib'), { recursive: true });
// v114: de foto's en tekeningen van de latten (de app laat ze zien).
fs.cpSync('latten', path.join(map, 'latten'), { recursive: true });
fs.writeFileSync(path.join(map, 'config.js'),
  'window.GLASOPNAME_CONFIG = { url: "https://test.supabase.co", anonKey: "sb_publishable_test" };\n');
if (process.env.MUTATIE) {
  const m = MUTATIES[process.env.MUTATIE];
  if (!m) { console.log('onbekende mutatie'); process.exit(2); }
  const doel = path.join(map, m[0]);
  let tekst = fs.readFileSync(doel, 'utf8');
  // v111: een mutatie mag meer dan één paar (van, naar) hebben, voor een
  // bewaking die op twee plekken zit (bijv. SLOT_FUNCTIES én de functie zelf).
  for (let i = 1; i < m.length; i += 2) {
    if (tekst.indexOf(m[i]) < 0) { console.log('mutatie past niet: ' + process.env.MUTATIE); process.exit(3); }
    tekst = tekst.replace(m[i], () => m[i + 1]);   // als functie: een $ in de vervanging blijft letterlijk
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
// apparaat: een naam, zodat één apparaat offline kan zijn terwijl een
// ander online is (S.weg[naam] = true).
async function nieuweContext(opties, apparaat) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block', acceptDownloads: true }, opties || {}));
  await ctx.exposeFunction('__db', s => JSON.stringify(apparaat && S.weg && S.weg[apparaat]
    ? { data: null, error: GEEN_BEREIK } : dbVraag(JSON.parse(s))));
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
  // Ook console.error: een fout in de pdf-stroom komt via mislukt() in de
  // console, niet als pageerror (opmerking bij de beoordeling).
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|sandboxed/.test(m.text())) consoleFouten.push('[console] ' + m.text()); });
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
/* ─── hulp voor v104 ──────────────────────────────────────────── */
const KOMPLEET = { glasType: 'HR++ glas', opbouw: '4-15-4' };
// v105: met het stempel dat elke ruit bij het inmeten krijgt (gewOp, door
// cloud.js bij het opslaan). Daaraan herkent de app een oudere stand.
const INGEMETEN = { gewOp: '2026-10-01T09:00:00.000Z', gewDoor: 'julian' };
function bestelProject() {
  resetDb();
  const p = rijVan(1);
  p.data.rijen = [ruit(1, 'K1', '1200', '600', Object.assign({}, KOMPLEET, INGEMETEN)),
                  ruit(2, 'K2', '800', '1400', Object.assign({}, KOMPLEET, INGEMETEN)),
                  ruit(3, 'K3', '900', '900', Object.assign({}, KOMPLEET, INGEMETEN))];
  p.data.volgendId = 4;
  // Een instructie voor de chauffeur, anders komt eerst de vraag om de
  // leverpagina aan te vullen (die hoort niet bij deze test).
  p.data.info = { leverInstructie: 'achterom, sleutel bij buren', opnemer: 'julian',
                  status: 'bezig met inmeten/verwerken' };
  p.status = 'bezig met inmeten/verwerken';
}
const info = () => rijVan(1).data.info || {};
// De bestellijst-pdf maken zoals Jan het doet: ⬇ Exporteren → Bestellijst
// als PDF (echte kliks). Vragen die onderweg komen, krijgen het antwoord uit
// 'antwoorden' (kop → knop). Standaard (v105): een vervallen ruit is echt
// verwijderd ("Ja, laten annuleren"). Geeft het pad van de download, of
// null als er geen pdf kwam (gestopt of teruggezet); 'gevraagd' = welke
// vragen er kwamen.
const STANDAARD_ANTWOORDEN = { 'Laten annuleren?': 'Ja, laten annuleren', 'Oudere stand?': 'Stoppen' };
let gevraagd = [];
async function bestellijstPdf(page, antwoorden, welke) {
  const a = Object.assign({}, STANDAARD_ANTWOORDEN, antwoorden || {});
  gevraagd = [];
  await page.click('button:has-text("⬇ Exporteren")');
  let klaar = null;
  const dl = page.waitForEvent('download', { timeout: 20000 }).then(d => { klaar = d; }, () => { klaar = false; });
  await page.click('button:has-text("' + (welke || 'Bestellijst als PDF') + '")');
  const eind = Date.now() + 20000;
  let gestopt = false;
  while (klaar === null && Date.now() < eind) {
    const tekst = (await meldingen(page)).join(' | ');
    const kop = Object.keys(a).find(k => tekst.indexOf(k) >= 0 && gevraagd.indexOf(k) < 0);
    if (kop) {
      gevraagd.push(kop);
      await knop(page, a[kop]);
      if (/Zet terug|Stoppen|Eerst aanvullen/.test(a[kop])) { gestopt = true; break; }   // dan komt er geen pdf
    }
    await wacht(150);
  }
  if (klaar === null) await Promise.race([dl, wacht(1500)]);
  if (!klaar) {
    // Geen pdf terwijl er niet gestopt is: dat is de fout zelf.
    if (!gestopt) check('er komt een bestellijst-pdf', false, 'vragen: ' + gevraagd.join(' / ') + ' | ' +
      (await meldingen(page)).join(' | ').slice(0, 400));
    return null;
  }
  laatsteNaam = klaar.suggestedFilename();
  const doel = path.join(pdfMap, 'best-' + (++pdfTeller) + '.pdf');
  await klaar.saveAs(doel);
  return doel;
}
let pdfTeller = 0;
let laatsteNaam = '';
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v117-pdf-'));
function pdfTekst(bestand) {
  if (!bestand) return '';
  const r = spawnSync('python3', ['-I', '-c',
    'import sys,pdfplumber\nwith pdfplumber.open(sys.argv[1]) as p:\n print("\\n".join((x.extract_text() or "") for x in p.pages))',
    bestand], { encoding: 'utf8' });
  return (r.stdout || '') + (r.stderr ? '\n[fout] ' + r.stderr : '');
}
async function vraagOpScherm(page) {
  return wachtOpMelding(page, /Naar de leverancier\?/, 8000);
}
async function opgeslagen(page, voorwaarde) {
  await page.evaluate(() => window.opslaan && window.opslaan());
  return wachtTot(voorwaarde, 10000);
}
async function opSlot(page) { return page.evaluate(() => invoerOpSlot()); }
async function ontgrendel(page) {
  await page.click('#slotBalk button', { timeout: 3000 });
  await page.fill('.melding-laag input[type=password]', 'geheim');
  await knop(page, 'Ontgrendelen');
  await page.waitForSelector('#slotBalk.open', { timeout: 5000 }).catch(() => {});
}
async function bestelTekst(page) {
  await page.evaluate(() => renderBestellijst());
  return page.$eval('#bestellijstInhoud', e => e.innerText.replace(/\s+/g, ' '));
}
/* ─── hulp voor v105 ──────────────────────────────────────────── */
async function eersteBestelling(page) {
  await bestellijstPdf(page);
  await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 1 && rijVan(1).status === 'besteld', 10000);
}
// Een ruit erbij zoals "+ Regel" het doet, met de gegevens erin.
async function ruitErbij(page, velden) {
  await page.evaluate(v => {
    const r = nieuweRij(); Object.assign(r, v); rijen.push(r);
    herbereken(); renderTabel(); opslaan();
  }, velden);
  await wacht(400);
}
// Bij "Niet alles gaat mee" (een half ingevulde ruit): toch doorgaan.
const ONVOLLEDIG = { 'Niet alles gaat mee': 'Toch doorgaan' };
const plat = t => t.replace(/\s+/g, ' ');
// De controle vóór de bestellijst (v110): aantal en bolletjes kloppen niet.
const TOCH = { 'Klopt het aantal?': 'Doorgaan met deze aantallen' };
// Het id van een ruit in de database, op merk (de app kiest de ids zelf).
const idVan = merk => String((rijVan(1).data.rijen.find(r => r.merk === merk) || {}).id);


/* ─── hulp voor v110 ──────────────────────────────────────────── */
const ALLEEN = process.env.ALLEEN ? process.env.ALLEEN.split(',') : null;
const doe = n => !ALLEEN || ALLEEN.indexOf(n) >= 0;
const FOTO = 'f1';
// Het project van de gevel: A ×1 (één bolletje), B ×3 (drie bolletjes),
// C ×2 (één bolletje: nog één aan te wijzen), D ×2 ingelezen uit een
// maatstaat (los, nog niet op de foto), E ×1 met twee bolletjes (een oud
// project: het aantal is ooit verlaagd), F ×1 in het fotoblok zonder bolletje.
function gevelProject(extra) {
  resetDb();
  const p = rijVan(1);
  const k = Object.assign({}, KOMPLEET, INGEMETEN);
  p.data.rijen = [
    ruit(1, 'A', '1000', '800', Object.assign({ fotoId: FOTO }, k)),
    ruit(2, 'B', '900', '1500', Object.assign({ fotoId: FOTO, aantal: 3 }, k)),
    ruit(3, 'C', '700', '700', Object.assign({ fotoId: FOTO, aantal: 2 }, k)),
    ruit(4, 'D', '600', '1200', Object.assign({ aantal: 2 }, k)),
    ruit(5, 'E', '500', '500', Object.assign({ fotoId: FOTO }, k)),
    ruit(6, 'F', '400', '400', Object.assign({ fotoId: FOTO }, k))
  ];
  p.data.volgendId = 7;
  p.data.fotos = [{ id: FOTO, pad: P(1) + '/gevel.jpg', titel: 'Voorgevel', breedte: 800, hoogte: 600, inkt: [],
    markeringen: [
      { rijId: 1, x: 0.12, y: 0.3 },
      { rijId: 2, x: 0.37, y: 0.3 }, { rijId: 2, x: 0.37, y: 0.5 }, { rijId: 2, x: 0.37, y: 0.7 },
      { rijId: 3, x: 0.62, y: 0.3 },
      { rijId: 5, x: 0.87, y: 0.3 }, { rijId: 5, x: 0.87, y: 0.6 }
    ] }];
  p.data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
  p.status = 'bezig met inmeten/verwerken';
  if (extra) extra(p);
}
const dbRij = merk => (rijVan(1).data.rijen || []).find(r => r.merk === merk) || {};
const dbBollen = merk => {
  const r = dbRij(merk);
  return ((rijVan(1).data.fotos || [])[0] || { markeringen: [] }).markeringen.filter(m => m.rijId === r.id).length;
};
const schermRij = (page, merk) => page.evaluate(m => JSON.parse(JSON.stringify(rijen.find(r => r.merk === m) || {})), merk);
const schermBollen = (page, merk) => page.evaluate(m => {
  const r = rijen.find(x => x.merk === m); if (!r) return -1;
  return fotos.reduce((n, f) => n + (f.markeringen || []).filter(x => x.rijId === r.id).length, 0);
}, merk);
// Tik op de foto, op een plek in verhoudingen (0–1), met een echte klik.
async function tikFoto(page, x, y) {
  const img = page.locator('#img-' + FOTO);
  const b = await img.boundingBox();
  // Een echte klik; Playwright schuift de foto eerst in beeld.
  await img.click({ position: { x: b.width * x, y: b.height * y } });
  await wacht(350);
}
// Het menu van het n-de bolletje van een regel openen (echte klik).
async function bolMenu(page, merk, n) {
  const idx = await page.evaluate(([m, n]) => {
    const r = rijen.find(x => x.merk === m); let k = 0;
    const lijst = fotos[0].markeringen;
    for (let i = 0; i < lijst.length; i++) if (lijst[i].rijId === r.id && ++k === n) return i;
    return -1;
  }, [merk, n || 1]);
  const bol = page.locator('#doek-' + FOTO + ' .foto-mark').nth(idx);
  await bol.click();
  await page.waitForSelector('.mark-menu', { timeout: 3000 });
  return page.$eval('.mark-menu', e => e.innerText.replace(/\s+/g, ' '));
}
async function menuKnop(page, tekst) {
  await page.locator('.mark-menu button', { hasText: tekst }).first().click();
  await wacht(300);
}
async function opgeslagenAls(voorwaarde) { return wachtTot(async () => voorwaarde(), 10000); }
// De bolletjes in een pdf tellen: oranje cirkels (jsPDF tekent ze als
// krommen met vulkleur 240,165,0). Per pagina, met de letter erin.
function pdfBollen(bestand) {
  const r = spawnSync('python3', ['-I', '-c', [
    'import sys,json,pdfplumber',
    'uit=[]',
    'with pdfplumber.open(sys.argv[1]) as p:',
    ' for pg in p.pages:',
    '  for c in pg.curves:',
    '   k=c.get("non_stroking_color")',
    '   if k and len(k)==3 and abs(k[0]-240/255)<0.02 and abs(k[1]-165/255)<0.02 and abs(k[2])<0.02:',
    '    w=pg.within_bbox((c["x0"],c["top"],c["x1"],c["bottom"])).extract_text() or ""',
    '    uit.append(w.strip())',
    'print(json.dumps(uit))'].join('\n'), bestand], { encoding: 'utf8' });
  try { return JSON.parse(r.stdout); } catch (e) { return ['[fout] ' + r.stderr]; }
}
const PLAATJES = process.env.PLAATJES || '';
const telLetters = lijst => lijst.reduce((o, l) => { o[l] = (o[l] || 0) + 1; return o; }, {});

// Het aantal-vak van een regel (in de tabel onder de foto, of op Invoer).
async function vakVan(page, merk) {
  const id = await page.evaluate(m => (rijen.find(r => r.merk === m) || {}).id, merk);
  return page.locator('#rij-' + id + ' .aantal-input').first();
}
async function vinkAan(page, merk) {
  const id = await page.evaluate(m => (rijen.find(r => r.merk === m) || {}).id, merk);
  await page.locator('#rij-' + id + ' .rijnr input[type=checkbox]').first().check();
  await wacht(150);
}
const strook = page => page.$eval('#tabel-' + FOTO, e => {
  const s = e.querySelector('.foto-scheef'); return s ? s.innerText.replace(/\s+/g, ' ') : '';
}).catch(() => '');
async function strookKnop(page, merk, tekst) {
  await page.locator('#tabel-' + FOTO + ' .foto-scheef-regel', { hasText: new RegExp('^' + merk + ':') })
    .locator('button', { hasText: tekst }).click();
  await wacht(400);
}
const ongedaan = page => page.keyboard.press('Control+z').then(() => wacht(500));
// Het gevelproject waar alles klopt (voor de bestellingen): E met één
// bolletje, C ×1.
function gevelKlopt(p) {
  p.data.fotos[0].markeringen = p.data.fotos[0].markeringen.filter((m, i) => !(m.rijId === 5 && m.y === 0.6));
  p.data.rijen.find(r => r.merk === 'C').aantal = 1;
}
const ann = t => (t.match(/ANNULEREN, als dat nog kan Merk.{0,400}/) || [''])[0];
async function gevelOpen(extra, apparaat) {
  gevelProject(extra);
  const ctx = await nieuweContext(apparaat);
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  const page = await nieuwePagina(ctx);
  await open(page, 1);
  await page.waitForSelector('#img-' + FOTO, { timeout: 10000 });
  await wacht(300);
  return { ctx, page };
}



/* ─── hulp voor v114 ──────────────────────────────────────────── */
const tbRij = (page, merk) => page.locator('.tb-tabel tbody tr').filter({ has: page.locator('td:first-child', { hasText: new RegExp('^' + merk + '$') }) });
const tbTekst = page => page.$eval('#toebehorenInhoud', e => e.innerText.replace(/\s+/g, ' '));
async function naarToebehoren(page) { await page.click('.tab-btn:has-text("Toebehoren")'); await wacht(300); }
async function naarInvoer(page) { await page.click('.tab-btn:has-text("Invoer")'); await wacht(300); }
const perRuitDb = merk => ((info().toebehoren || {}).perRuit || {})[idVan(merk)] || {};
async function openProject(opties) {
  const c = await nieuweContext(opties);
  await c.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  const p = await nieuwePagina(c);
  await open(p, 1);
  return { ctx: c, page: p };
}
// X 4-15-4 (23 mm), Y ×2 4-15-4, D 4-13-5 (22 mm). Geen zijde gekozen.
function latProject(extra) {
  resetDb();
  const p = rijVan(1);
  const k = Object.assign({}, KOMPLEET, INGEMETEN);
  p.data.rijen = [
    ruit(1, 'X', '1000', '2000', k),
    ruit(2, 'Y', '900', '1500', Object.assign({ aantal: 2 }, k)),
    ruit(3, 'D', '800', '2000', Object.assign({ glasType: 'HR++ glas', opbouw: '4-13-5' }, INGEMETEN))
  ];
  p.data.volgendId = 4;
  p.data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
  p.status = 'bezig met inmeten/verwerken';
  if (extra) extra(p);
}
// Roosters: K1 (DucoTon 10, RAL 9010), K2 (idem), K3 zonder rooster.
const WIT = 'RAL 9010 - Zuiverwit', ZWART = 'RAL 9005 - Gitzwart', CREME = 'RAL 9001 - Crèmewit';
const ROOSTER = { rooster: 'Ja', ducoType: 'DucoTon 10', ralKleur: WIT };
function roosterProject(extra) {
  resetDb();
  const p = rijVan(1);
  const k = Object.assign({}, KOMPLEET, INGEMETEN);
  p.data.rijen = [
    ruit(1, 'K1', '1200', '1400', Object.assign({}, k, ROOSTER)),
    // K2 met 22 mm glas (4-13-5): dat past ook in een DucoTon 18 (18–22 mm), zodat
    // alleen de glasaftrek het verschil maakt (proef ducoAftrek).
    ruit(2, 'K2', '800', '1400', Object.assign({ aantal: 2 }, k, { opbouw: '4-13-5' }, ROOSTER)),
    ruit(3, 'K3', '900', '900', k)
  ];
  p.data.volgendId = 4;
  p.data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
  p.status = 'bezig met inmeten/verwerken';
  if (extra) extra(p);
}
const G = (page, merk, wat) => page.evaluate(([m, w]) => {
  const r = rijen.find(x => x.merk === m);
  const o = GlasLatten.oordeelRuit(r), ol = GlasLatten.onderlatVoorRuit(r);
  return { zijde: GlasLatten.zijde(r), onder: ol.id, isNeus: ol.isNeus, slechtste: o.slechtste.status, waar: o.waar,
           kort: GlasLatten.kortRuit(o), boven: GlasLatten.kort(o.boven), keer: GlasLatten.pakket(r).keer || null, w: w };
}, [merk, wat || null]);
const zetPR = (page, merk, velden) => page.evaluate(([m, v]) => {
  const r = rijen.find(x => x.merk === m);
  Object.keys(v).forEach(k => toebehorenZetRuit(r.id, k, v[k] === null ? '' : v[k]));
  return true;
}, [merk, velden]);

/* ─── hulp voor v115 ──────────────────────────────────────────── */
const R = (page, merk, fn) => page.evaluate(([m, f]) => {
  const r = rijen.find(x => x.merk === m);
  return (new Function('r', 'G', 'return (' + f + ')(r, G);'))(r, GlasLatten);
}, [merk, fn.toString()]);
const idOp = (page, merk) => page.evaluate(m => (rijen.find(r => r.merk === m) || {}).id, merk);
// Het gevelproject met keuzes voor de latten (Toebehoren, per ruit).
const LATTEN_GEVEL = p => { p.data.info.toebehoren = { perRuit: {
  1: { sponningDiepte: 45, latZijde: 'binnen' },
  2: { sponningDiepte: 44, diepteOnder: 52, latZijde: 'buiten' },
  3: { sponningDiepte: 35, latZijde: 'binnen' } } }; };
async function invoerScherm(page) { await naarInvoer(page); await wacht(300); }

/* ─── hulp voor v117 ──────────────────────────────────────────── */
// Het gevelproject met latten; C (binnen) had al een neuslat onderin (oud),
// D (los) komt uit een maatstaat met max glaspakket 28 mm (4-15-4 + band = 29).
const GEVEL117 = p => {
  LATTEN_GEVEL(p);
  p.data.info.toebehoren.perRuit[3].onderlat = 'N30';
  p.data.rijen.find(r => r.merk === 'D').maxPakket = 28;
};
// Een rij op Toebehoren; het merk kan "D ×2" zijn (aantal).
const tbR = (page, merk) => page.locator('.tb-tabel tbody tr.tb-ruit').filter({ has: page.locator('td.tb-merk', { hasText: new RegExp('^' + merk + '(\\s*×\\d+)?$') }) });
const tbCel = (page, merk, kl) => tbR(page, merk).locator('td.' + kl).innerText();

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, m, t, u, id;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Wat de app rekent: pakket, max glaspakket, binnen, uitsteek');
    latProject();
    ({ ctx, page } = await openProject());
    await zetPR(page, 'X', { latZijde: 'binnen', sponningDiepte: 45 });
    u = await R(page, 'X', (r, G) => G.pakketDikte(r));
    check('pakket X (4-15-4 = 23): zonder lat 23 + 3 + 3 = 29, met A4 (15 in de sponning) 44', u && u.zonder === 29 && u.met === 44 && u.max === null, JSON.stringify(u));
    await page.evaluate(() => { rijen.find(r => r.merk === 'X').maxPakket = 28; });
    m = await G(page, 'X');
    check('max glaspakket 28: te dik (−1), dat is het slechtste van de ruit', m.waar === 'max' && m.slechtste === 'past niet' && m.kort === 'te dik −1 (max 28)', JSON.stringify(m));
    u = await R(page, 'X', (r, G) => G.oordeelRuit(r).max.tekst);
    check('… met de rekensom: "glas 23 + band 3 + 3 = 29 mm; max glaspakket (maatstaat) 28 mm: te dik, 1 mm"', /glas 23 \+ band 3 \+ 3 = 29 mm; max glaspakket \(maatstaat\) 28 mm: te dik, 1 mm/.test(u), u);
    await page.evaluate(() => { rijen.find(r => r.merk === 'X').maxPakket = 30; });
    m = await G(page, 'X');
    check('max 30: past, het oordeel gaat weer over de lat (past · 1 mm in zicht)', m.waar === 'boven' && m.kort === 'past · 1 mm in zicht', JSON.stringify(m));
    // Latten meegeleverd (csv): dan juist wel controleren.
    await zetPR(page, 'Y', { latZijde: 'geen' });
    await page.evaluate(() => { rijen.find(r => r.merk === 'Y').maxPakket = 28; });
    m = await G(page, 'Y');
    check('latzijde "geen (meegeleverd)" met max 28: ook dan te dik', m.waar === 'max' && m.kort === 'te dik −1 (max 28)', JSON.stringify(m));
    u = await R(page, 'Y', (r, G) => [G.opbouwTeDik(r, 23), G.opbouwTeDik(r, 22), G.opbouwTeDik(r, 20)]);
    check('opbouw te dik bij max 28: 23 ja, 22 nee (precies 28), 20 nee', JSON.stringify(u) === '[true,false,false]', JSON.stringify(u));
    // Binnen: geen neus- of ventilatielat.
    await zetPR(page, 'X', { onderlat: 'N30' });
    m = await G(page, 'X');
    u = await R(page, 'X', (r, G) => G.keuzeNaam(r));
    check('binnen met een (oude) neuslat N30 onderin: rood "onder: N30 alleen buiten", niet stil veranderd',
      m.slechtste === 'past niet' && m.kort === 'onder: N30 alleen buiten' && u === 'N30 · alleen buiten!', JSON.stringify([m, u]));
    await zetPR(page, 'X', { onderlat: 'C1' });
    m = await G(page, 'X');
    check('binnen met ventilatielat C1: ook rood', m.slechtste === 'past niet' && m.kort === 'onder: C1 alleen buiten', JSON.stringify(m));
    await zetPR(page, 'X', { onderlat: 'NEUS' });
    m = await G(page, 'X');
    check('binnen met "passende neuslat (automatisch)": ook rood', m.slechtste === 'past niet' && /alleen buiten/.test(m.kort), JSON.stringify(m));
    await zetPR(page, 'X', { onderlat: null });
    id = await idOp(page, 'X');
    await page.evaluate(i => latOnderKies(i, 'N35'), id); await wacht(200);
    m = await page.evaluate(i => GlasLatten.ruit(rijen.find(r => r.id === i)).onderlat || '', id);
    t = (await meldingen(page)).join(' | ');
    check('een neuslat kiezen bij binnen: geweigerd, met uitleg', m === '' && /alleen voor buiten/i.test(t), JSON.stringify([m, t.slice(0, 120)]));
    await sluitMeldingen(page);
    u = await R(page, 'X', (r, G) => [G.onderMagBij(r, 'N30'), G.onderMagBij(r, 'C1'), G.onderMagBij(r, 'A4'), G.onderMagBij(r, 'N30', 'buiten')]);
    check('onderMagBij: binnen N30 nee, C1 nee, A4 ja; buiten N30 ja', JSON.stringify(u) === '[false,false,true,true]', JSON.stringify(u));
    // Buiten: de neuslat met ventilatie én uitsteek in de knop.
    await zetPR(page, 'X', { latZijde: 'buiten', diepteOnder: 52 });
    u = await R(page, 'X', (r, G) => { const o = G.onderlatVoorRuit(r); return [G.keuzeNaam(r), o.neus && o.neus.ventilatie, o.neus && o.neus.uitsteek]; });
    check('buiten, onder 52: knop "N30 · vent. 7 · uitst. 16" (uitsteek = ventilatie + 9)', u[0] === 'N30 · vent. 7 · uitst. 16' && u[2] === u[1] + 9, JSON.stringify(u));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Toebehoren: kolom Pakket, voorbeeld bij "Alle ruiten", binnen, zaagplan');
    ({ ctx, page } = await gevelOpen(GEVEL117));
    await naarToebehoren(page);
    // v118: per foto een eigen tabel; kopteksten langer (wens Jan).
    m = await page.evaluate(() => [...document.querySelector('.tb-tabel').querySelectorAll('thead th')].map(th => th.textContent.trim()).filter(Boolean));
    check('kolom Pakket dikte naast Glas dikte', m.indexOf('Pakket dikte') === m.indexOf('Glas dikte') + 1, JSON.stringify(m));
    t = (await tbCel(page, 'A', 'tb-pakket')).replace(/\s+/g, ' ');
    check('A: pakket 29, met lat 44', /^29 met lat 44$/.test(t), t);
    t = (await tbCel(page, 'D', 'tb-pakket')).replace(/\s+/g, ' ');
    m = await tbR(page, 'D').locator('td.tb-pakket small.te-dik').count();
    check('D (max 28 uit de maatstaat): "max 28" in rood', /max 28/.test(t) && m === 1, t + ' rood:' + m);
    t = await tbR(page, 'D').locator('td.tb-oordeel .pk-chip').innerText();
    m = await tbR(page, 'D').locator('td.tb-oordeel .pk-chip.pk-past-niet').count();
    check('D: oordeel "te dik −1 (max 28)", rood', /te dik −1 \(max 28\)/.test(t) && m === 1, t);
    // C (binnen) had al een neuslat: rood, de knop zegt het.
    t = await tbR(page, 'C').locator('td.tb-oordeel .pk-chip').innerText();
    u = await tbR(page, 'C').locator('[data-sleutel^="olat-"]').innerText();
    check('C (binnen, oude neuslat N30): oordeel "onder: N30 alleen buiten", knop "N30 · alleen buiten!"',
      /onder: N30 alleen buiten/.test(t) && /N30 · alleen buiten!/.test(u), t + ' | ' + u);
    await tbR(page, 'C').locator('td.tb-oordeel .pk-chip').click(); await wacht(300);
    t = await page.$eval('.lat-venster', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
    check('het venster legt het uit', /alleen voor buiten; bij latzijde binnen kies je een lat voor binnen/.test(t), t.slice(0, 200));
    await page.keyboard.press('Escape'); await wacht(200);
    // Het onderlat-venster bij binnen: geen neus- en ventilatielatten.
    await tbR(page, 'A').locator('[data-sleutel^="olat-"]').click(); await wacht(300);
    t = await page.$eval('.lat-venster', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
    m = await page.evaluate(() => document.querySelectorAll('.lat-venster [data-onder^="N"], .lat-venster [data-onder^="C"]').length);
    check('onderlat bij A (binnen): geen neuslatten en geen ventilatielatten te kiezen, wel de uitleg', m === 0 &&
      !/Ventilatielatten|Neuslatten die passen/.test(t) && /neuslatten en ventilatielatten horen bij buitenbeglazing/.test(t), m + ' | ' + t.slice(0, 200));
    await page.keyboard.press('Escape'); await wacht(200);
    await tbR(page, 'B').locator('[data-sleutel^="olat-"]').click(); await wacht(300);
    m = await page.evaluate(() => document.querySelectorAll('.lat-venster [data-onder^="N"]').length);
    check('bij B (buiten) wel neuslatten', m > 0, m);
    await page.keyboard.press('Escape'); await wacht(200);
    // Alle ruiten → glaslat: een voorbeeld.
    check('nog geen voorbeeld zolang "niet wijzigen"', await page.locator('#tbAlleVoorbeeld').isHidden());
    await page.selectOption('#tbAlleLat', 'E22|om'); await wacht(200);
    t = await page.locator('#tbAlleVoorbeeld').innerText().catch(() => '');
    m = await page.locator('#tbAlleVoorbeeld .lat-plaatje, #tbAlleVoorbeeld img, #tbAlleVoorbeeld svg').count();
    check('glaslat E22 omgekeerd gekozen: voorbeeld met plaatje, maat en "omgekeerd"', await page.locator('#tbAlleVoorbeeld').isVisible() &&
      /E22/.test(t) && /omgekeerd/.test(t) && m >= 1, t.replace(/\s+/g, ' ') + ' | ' + m);
    await page.click('#tbAlleVoorbeeld'); await wacht(300);
    t = await page.$eval('.lat-groot', e => e.innerText).catch(() => '');
    check('tik op het voorbeeld: groot, met de maten', /E22/.test(t), t.slice(0, 80));
    await page.click('.lat-groot').catch(() => {}); await wacht(200);
    await page.evaluate(() => renderToebehoren()); await wacht(300);
    check('het voorbeeld blijft na opnieuw tekenen', /E22/.test(await page.locator('#tbAlleVoorbeeld').innerText().catch(() => '')));
    await page.selectOption('#tbAlleLat', '-'); await wacht(200);
    // Alle ruiten → onderlat N30: niet bij binnen, en zeggen welke.
    await page.selectOption('#tbAlleOnderlat', 'N30');
    await page.click('.tb-alles button:has-text("Toepassen")'); /* v120: eerst een vraag */ await page.click('.melding-laag button:has-text("Toepassen")'); await wacht(500);
    t = (await meldingen(page)).join(' | ');
    check('melding: niet gewijzigd bij 2 ruiten met latzijde binnen (A, C)', /niet gewijzigd bij 2 ruiten met latzijde binnen \(A, C\)/.test(t), t.slice(0, 200));
    await sluitMeldingen(page);
    m = await page.evaluate(() => rijen.filter(r => r.merk).map(r => r.merk + ':' + (GlasLatten.ruit(r).onderlat || '')).join(' '));
    check('A niets, B N30, C bleef N30 (oud), D E F N30', m === 'A: B:N30 C:N30 D:N30 E:N30 F:N30', m);
    // Zaagplan als tekening.
    u = await page.evaluate(() => toebehorenBerekenen().latten.map(l => ({ type: l.type, n: l.plan.length, eerste: l.plan[0] && l.plan[0].stukken })));
    const a4 = u.find(l => l.type === 'A4') || {};
    const blok = page.locator('.tb-blok', { has: page.locator('.tb-wat', { hasText: 'A4 glaslat' }) });
    check('per lattype een uitklapbaar zaagplan', await blok.locator('details.tb-zaag summary').count() === 1 &&
      /Zaagplan: \d+ × 4,0 m/.test(await blok.locator('details.tb-zaag summary').innerText()), JSON.stringify(a4));
    await blok.locator('details.tb-zaag summary').click(); await wacht(300);
    m = await blok.evaluate(b => ({ rijen: b.querySelectorAll('.tb-zaag-rij').length, stukken: [...b.querySelectorAll('.tb-zaag-rij:first-child .tb-zaag-stuk')].map(s => s.textContent),
      breed: b.offsetWidth, totaal: b.parentNode.offsetWidth }));
    check('open: per lengte een balk, de stukken in mm (zoals het zaagplan), over de hele breedte', m.rijen === a4.n &&
      JSON.stringify(m.stukken) === JSON.stringify(a4.eerste.map(x => x.toLocaleString('nl-NL'))) && m.breed > m.totaal * 0.9, JSON.stringify(m));
    await page.evaluate(() => renderToebehoren()); await wacht(300);
    check('blijft open na opnieuw tekenen', await blok.locator('details.tb-zaag[open]').count() === 1);
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v117-toebehoren-pc.png'), fullPage: true });
    // Invoer: de opbouw van D (max 28): te dikke opbouwen apart, grijs.
    await naarInvoer(page);
    id = await idOp(page, 'D');
    m = await page.evaluate(i => {
      const r = rijen.find(x => x.id === i);
      const div = document.createElement('select'); div.innerHTML = opbouwKeuzeHTML(r);
      const g = [...div.querySelectorAll('optgroup')].find(o => /Te dik voor max glaspakket 28 mm/.test(o.label));
      const los = [...div.querySelectorAll(':scope > option')].map(o => o.value).filter(Boolean);
      return { groep: g ? [...g.querySelectorAll('option')].map(o => o.value) : null, klasse: g ? g.querySelector('option').className : '',
               losTeDik: los.filter(o => GlasLatten.opbouwTeDik(r, (DATA.lookup[r.glasType + '|' + o] || {}).totaal)) };
    }, id);
    check('keuzelijst opbouw bij D: "Te dik voor max glaspakket 28 mm" met o.a. 4-15-4, grijs; daarboven geen te dikke',
      m.groep && m.groep.indexOf('4-15-4') >= 0 && m.klasse === 'niet-lever' && !m.losTeDik.length, JSON.stringify(m));
    await ctx.close();
    // iPad en telefoon: de kolom past, niets schuift opzij.
    for (const [naam, opt] of [['pc 1600', { viewport: { width: 1600, height: 900 } }], ['pc 1440', { viewport: { width: 1440, height: 900 } }], ['laptop 1280', { viewport: { width: 1280, height: 800 } }],
                               ['ipad', { viewport: { width: 820, height: 1180 }, hasTouch: true }],
                               ['telefoon', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
      ({ ctx, page } = await gevelOpen(GEVEL117, opt));
      await naarToebehoren(page);
      if (naam === 'telefoon') { await tbR(page, 'D').locator('.tb-kort-knop').click(); await wacht(300); }
      m = await page.evaluate(() => {
        const w = document.querySelector('.tb-wrap'); const c = [...document.querySelectorAll('td.tb-pakket')].find(td => /max 28/.test(td.innerText));
        const b = c && c.getBoundingClientRect();
        return { schuif: w.scrollWidth - w.clientWidth, pagina: document.documentElement.scrollWidth - window.innerWidth,
                 zicht: !!b && b.width > 0 && b.right <= window.innerWidth + 1 && b.left >= -1 };
      });
      check(naam + ': kolom Pakket in beeld, niets schuift opzij', m.schuif <= 1 && m.pagina <= 1 && m.zicht, JSON.stringify(m));
      if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v117-toebehoren-' + naam.replace(' ', '') + '.png'), fullPage: true });
      await ctx.close();
    }
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Een maatstaat met "Max glaspakket incl band"');
    bestelProject();
    ({ ctx, page } = await openProject());
    await page.evaluate(() => impOpen());
    await page.setInputFiles('#impBestand', { name: 'kozijnfabriek.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Merk;Breedte;Hoogte;Glas type;Opbouw;Max glaspakket incl band\nN1;1000;1200;HR++ glas;4-15-4;28\nN2;800;900;HR++ glas;4-15-4;30 mm\n', 'utf8') });
    await page.waitForFunction(() => document.getElementById('impStap2') && document.getElementById('impStap2').style.display !== 'none', null, { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => impControleren()); await wacht(300);
    await page.evaluate(() => impToevoegen()); await wacht(500);
    m = await page.evaluate(() => rijen.filter(r => /^N/.test(r.merk)).map(r => ({ merk: r.merk, max: r.maxPakket, opm: r.opmerking || '', dikte: r.totaalDikte })));
    check('de kolom is herkend: max 28 en 30 bij de ruiten', m.length === 2 && +m[0].max === 28 && +m[1].max === 30, JSON.stringify(m));
    check('niet meer in de opmerking (die gaat naar de leverancier)', m.every(x => !/max pakket/i.test(x.opm)), JSON.stringify(m.map(x => x.opm)));
    u = await page.evaluate(() => rijen.filter(r => /^N/.test(r.merk)).map(r => { const o = GlasLatten.oordeelRuit(r); return r.merk + ':' + o.waar + ':' + GlasLatten.kortRuit(o); }));
    check('N1 (23 + 6 = 29 > 28): "te dik −1 (max 28)"; N2 (max 30): geen melding', u[0] === 'N1:max:te dik −1 (max 28)' && !/te dik/.test(u[1]), JSON.stringify(u));
    m = await page.evaluate(() => {
      const grijs = mk => { const s = document.createElement('select'); s.innerHTML = opbouwKeuzeHTML(rijen.find(r => r.merk === mk));
        const g = s.querySelector('optgroup[label^="Te dik voor max glaspakket"]'); return g ? [...g.querySelectorAll('option')].map(o => o.value) : []; };
      return { n1: grijs('N1'), n2: grijs('N2') };
    });
    check('keuzelijst opbouw: bij N1 (max 28) staat 4-15-4 bij de te dikke, bij N2 (max 30) niet', m.n1.indexOf('4-15-4') >= 0 && m.n2.indexOf('4-15-4') < 0, JSON.stringify(m));
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Bestellijst en PDF invoer: bediening "standaard", te dik, zaagplan');
    roosterProject(p => {
      p.data.info.toebehoren = { perRuit: { 1: { sponningDiepte: 45, latZijde: 'binnen' }, 2: { sponningDiepte: 45, latZijde: 'binnen' },
        3: { sponningDiepte: 45, latZijde: 'binnen' } } };
      p.data.rijen.find(r => r.merk === 'K3').maxPakket = 28;
    });
    ({ ctx, page } = await openProject());
    m = await page.evaluate(() => glasPakketScheef().map(x => x.rij.merk + ':' + GlasLatten.kortRuit(x.o)));
    check('vóór de bestellijst: K3 is te dik voor het max glaspakket (zelfde vraag als "past niet")', JSON.stringify(m) === '["K3:te dik −1 (max 28)"]', JSON.stringify(m));
    const pdf = await bestellijstPdf(page, Object.assign({ 'Past het in de sponning?': 'Toch doorgaan' }, ONVOLLEDIG));
    t = pdfTekst(pdf);
    const regel = mk => t.split('\n').find(l => new RegExp('\\b' + mk + '\\b').test(l) && /\d{3,4}/.test(l)) || '';
    // v118: "Helder (standaard)" staat nu ook op de lijst; de bediening via het model (zelfde als de pdf).
    u = await page.evaluate(() => { const mo = bestellijstModel(); const i = mo.kolommen.indexOf('Bediening'); return mo.regels.map(g => g.cellen[i]); });
    check('bestellijst: kolom Bediening, bij K1 en K2 (rooster) "standaard", bij K3 (geen rooster) niets',
      /Bediening/.test(t) && JSON.stringify(u) === '["standaard","standaard",""]' && /RAL 9010 - Zuiverwit standaard/.test(regel('K1')),
      JSON.stringify(u) + ' / ' + regel('K1'));
    m = await page.evaluate(() => { const e = exportTabel(); const i = e.koppen.indexOf('Bediening'); return e.regels.map(r => r[i]); });
    check('export (xlsx/csv): Bediening "standaard", "standaard", ""', JSON.stringify(m) === '["standaard","standaard",""]', JSON.stringify(m));
    await vraagOpScherm(page); await sluitMeldingen(page); await wacht(300);
    const pi = await bestellijstPdf(page, ONVOLLEDIG, 'PDF invoer');
    t = pdfTekst(pi).replace(/\s+/g, ' ');
    u = await page.evaluate(() => toebehorenBerekenen().latten.find(l => l.type === 'A4').plan);
    const verwacht = '1 ' + u[0].stukken.map(x => x.toLocaleString('nl-NL')).join(' ') + ' rest';
    check('PDF invoer: het zaagplan als tekening (nr, de stukken in mm, rest)', /Zaagplan A4 glaslat schuin 17x15 \(\d+ x 4,0 m; besteld \d+/.test(t) &&
      t.indexOf(verwacht) >= 0, (t.match(/Zaagplan.{0,160}/) || [''])[0] + ' | verwacht: ' + verwacht);
    check('PDF invoer: kolom Bediening met "standaard"', /Bediening/.test(t) && /standaard/.test(t));
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Naslag: totale glasmaat incl. rooster, de leverancier trekt de speling eraf');
    latProject();
    ({ ctx, page } = await openProject());
    await page.click('.tab-btn:has-text("Naslag")'); await wacht(400);
    await page.click('.nsl-kop:has-text("Duco ventilatieroosters")'); await wacht(400);
    t = await page.$eval('#naslagInhoud', e => e.innerText.replace(/\s+/g, ' '));
    check('bij de roosters: totale glasmaat incl. rooster bestellen, de leverancier trekt de speling eraf',
      /Je bestelt de totale glasmaat incl\. rooster; de hoogte-aftrek \(speling\) voor het rooster trekt de leverancier er zelf af\./.test(t), (t.match(/Glasaftrek: .{0,160}/) || [''])[0]);
    await ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Versie');
    const lees = n => fs.readFileSync(path.join(map, n), 'utf8');
    const versies = [lees('index.html').match(/APP_VERSIE = 'v(\d+)'/), lees('pdf.js').match(/PDF_VERSIE = 'v(\d+)'/),
                     lees('sw.js').match(/const VERSIE = 'v(\d+)'/)].map(m => m ? +m[1] : 0);
    check('versie v117 of later, gelijk in index.html, pdf.js en sw.js', versies.every(v => v === versies[0] && v >= 117), JSON.stringify(versies));
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
