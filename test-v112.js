/* Testreeks v112 — node test-v112.js   (en: node test-v112.js --mutaties)

   Onderwerp: na een bestelling alleen een andere bediening (stang of koord)
   bij een ruit die al besteld is.

   Echte situatie: Jan heeft de 1e bestellijst gestuurd. Daarna blijkt bij Z
   (3 ruiten met een Duco-rooster, hoog) een bedieningsstang nodig, bij K2
   hoeft het koord niet meer, en bij W komt er een ruit bij (3 → 4) en krijgen
   ze alle vier een stang.

   Belofte (keuze van Jan, 19-10-2026): "nooit glas vervangen alleen om de
   bediening toe te voegen; dat levert zeker fouten op met dubbele leveringen
   en onduidelijkheid". Dus:
   - alleen de bediening anders: NIET in de glastabel (geen VERVANGT), maar in
     een eigen blok "ALLEEN BEDIENING - glas NIET opnieuw maken", met per ruit
     erbij / vervalt / wordt, en het totaal aantal stangen of koorden;
   - aantal én bediening anders: EXTRA in de tabel (de nieuwe ruit krijgt de
     stang), en de stang voor de al bestelde ruiten in het blok;
   - na "Ja, verstuurd" telt het als besteld; het glas blijft "uit de 1e";
   - terug naar een eerder bestelde bediening geeft geen "Oudere stand?";
   - een maat erbij veranderen blijft gewoon VERVANGT.
   Plus: een koker glaskit is helemaal bruikbaar (290 ml), in test-v111.js.

   Wat deze opstelling aanneemt: zoals test-v110/v111 (nagebootste database
   in node, echte Chromium, pdf teruggelezen met pdfplumber). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  apartBlok: ["index.html", "    else if (b) return;            // alleen de bediening en/of het rooster: het glas blijft\n", ""],
  extraMetBediening: ["index.html", "  if (ruitKenmerk(Object.assign(metBedieningVan(rij, oud), { aantal: oud.aantal })) !== kenmerkVan(oud)) return null;",
                      "  if (ruitKenmerk(Object.assign({}, rij, { aantal: oud.aantal })) !== kenmerkVan(oud)) return null;"],
  glasGelijk: ["index.html", "  if (ruitKenmerk(test) !== kenmerkVan(oud)) return null;\n", ""],
  blokPdf: ["pdf.js", "        if ((t.bediening || []).length) bedieningTabel(doc, titel, t.bediening);\n", ""],
  totaal: ["pdf.js", "      var tal = parseInt(m[1], 10) * n;", "      var tal = parseInt(m[1], 10);"],
  herkomst: ["index.html", "      } else if (typeof o === 'object' && (o.bedieningVan || o.roosterVan) && herkomst[id]) {", "      } else if (0) {"],
  kort: ["index.html", "'vervangtUit', 'bedieningVan', 'bedieningUit',   // bediening: v112", "'vervangtUit',"],
  vastleggen: ["pdf.js", "(moment.ruiten[id].minder || moment.ruiten[id].bedieningVan || moment.ruiten[id].roosterVan)", "(moment.ruiten[id].minder || moment.ruiten[id].roosterVan)"],
  nietsTeBestellen: ["pdf.js", "!minder.length && !alleenBed.length && !alleenRooster.length) {", "!minder.length && !alleenRooster.length) {"],
  momentopname: ["index.html", "      } else if (bv || rv) {\n", "      } else if (rv) {\n"],
  ouderStand: ["index.html", "(aantalVerschil(oud, rij) || bedieningVerschil(oud, rij))", "aantalVerschil(oud, rij)"],
  uitleg: ["pdf.js", "((t.bediening || []).length ? ' Onder de tabel: ALLEEN BEDIENING", "(0 ? ' Onder de tabel: ALLEEN BEDIENING"],
  tabTekst: ["index.html", "(!b ? '' : (v ? '; en' : ' — op de aanvulling') + ' onder ' +", "(1 ? '' : (v ? '; en' : ' — op de aanvulling') + ' onder ' +"],
  wasBediening: ["pdf.js", "    if (bedOud !== bedNu) was += ', ' + (bedOud || 'standaard bediening');", ""],
  collega: ["index.html", "        if (vorigO && typeof vorigO === 'object' && !vorigO.kort && !o.kort) {", "        if (0) {"],
  bedIn: ["index.html", "        if (o.bediening) bedieningIn[id] = dezeNr; else delete bedieningIn[id];", ""],
  bedInTabel: ["pdf.js", "(b.was && b.bedTekst ? '; bediening: ' + b.bedTekst : '')", "''"],
  annBed: ["pdf.js", "          return (n ? ' (en de bediening uit de ' + n + ')' : '') +", "          return '' +"],
  overzichtGlas: ["pdf.js", "return (h.length ? h[0].nr : nr) + 'e' + (bed ? '; bediening ' + bed : '') + (roo ? '; rooster ' + roo : '');", "return nr + 'e' + (roo ? '; rooster ' + roo : '');"],
  stuksLengte: ["pdf.js", "      return tal + ' ' + m[2] + (tal === 1 ? '' : 'en') + ' ' + m[3];", "      return tal + ' ' + m[2] + (tal === 1 ? '' : 'en');"],
  bijExtra: ["index.html", "      o.extraBij = besteldInTekst(r.id, st) || '1e';\n      metBediening(o);", "      o.extraBij = besteldInTekst(r.id, st) || '1e';"],
};
const WAAR = {};
Object.keys(MUTATIES).forEach(k => { WAAR[k] = ''; });


if (process.argv.indexOf('--mutaties') >= 0) {
  let goed = 0;
  Object.keys(MUTATIES).forEach(function (naam) {
    const r = spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { MUTATIE: naam, ALLEEN: WAAR[naam] || '' }),
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v112-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v112-pdf-'));
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


/* ─── hulp voor v111 ──────────────────────────────────────────── */
// Een renovatieproject: X 1000 × 2000 en Y 900 × 1500 (×2, met wiener-
// sprossen 2H × 2V), sponningmaat, speling 4 mm. Z met rooster (DucoTon 10).
function tbProject(extra) {
  resetDb();
  const p = rijVan(1);
  const k = Object.assign({}, KOMPLEET, INGEMETEN);
  p.data.rijen = [
    ruit(1, 'X', '1000', '2000', k),
    ruit(2, 'Y', '900', '1500', Object.assign({ aantal: 2, roedenverdeling: 'Wienersprossen - 2H x 2V (raster)', roedenbreedte: '26 mm' }, k))
  ];
  p.data.volgendId = 3;
  p.data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
  p.status = 'bezig met inmeten/verwerken';
  if (extra) extra(p);
}
async function openProject() {
  const c = await nieuweContext();
  await c.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  const p = await nieuwePagina(c);
  await open(p, 1);
  return { ctx: c, page: p };
}
const perRuitDb = merk => ((info().toebehoren || {}).perRuit || {})[idVan(merk)] || {};
const tbTekst = page => page.$eval('#toebehorenInhoud', e => e.innerText.replace(/\s+/g, ' '));
async function naarToebehoren(page) {
  await page.click('.tab-btn:has-text("Toebehoren")');
  await wacht(300);
}


/* ─── hulp voor v112 ──────────────────────────────────────────── */
const ROOSTER = { rooster: 'Ja', ducoType: 'DucoTon 10', ralKleur: 'RAL 9010' };
// X zonder rooster; Z ×3 met rooster; K2 ×1 met rooster en 1× koord; W ×3 met rooster.
function bedProject() {
  resetDb();
  const p = rijVan(1);
  const k = Object.assign({}, KOMPLEET, INGEMETEN);
  p.data.rijen = [
    ruit(1, 'X', '1000', '2000', k),
    ruit(2, 'Z', '800', '1200', Object.assign({ aantal: 3 }, k, ROOSTER)),
    ruit(3, 'K2', '700', '900', Object.assign({ bediening: 'koord', bedieningAantal: 1 }, k, ROOSTER)),
    ruit(4, 'W', '600', '1000', Object.assign({ aantal: 3 }, k, ROOSTER))
  ];
  p.data.volgendId = 5;
  p.data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
  p.status = 'bezig met inmeten/verwerken';
}
const tb = page => page.evaluate(() => { const t = teBestellen();
  return { regels: t.regels.map(r => r.merk), gewijzigd: t.gewijzigd.map(g => g.rij.merk), minder: t.minder.map(m => m.rij.merk),
           extra: Object.keys(t.extra).map(id => rijen.find(r => String(r.id) === id).merk),
           bediening: (t.bediening || []).map(b => [b.rij.merk, b.was, b.nu, b.stuks]), aantal: t.aantal }; });
// Wijzigen zoals op Invoer (na ontgrendelen): via de keuzelijst en het vak.
async function kiesBediening(page, merk, waarde, lengte) {
  const id = idVan(merk);
  await page.selectOption('#bed-' + id + ' select.bed-soort', waarde);
  await wacht(200);
  if (lengte !== undefined) {
    await page.fill('#bed-' + id + ' input.bed-lengte', String(lengte));
    await page.dispatchEvent('#bed-' + id + ' input.bed-lengte', 'change');
    await wacht(200);
  }
}
async function verstuurd(page, n) {
  await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  return wachtTot(() => (info().bestellingen || []).length === n, 10000);
}

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, m, t;

  console.log('\n1. Na de bestelling: alleen de bediening anders → apart blok, geen VERVANGT');
  bedProject();
  ({ ctx, page } = await openProject());
  await eersteBestelling(page);
  check('1e bestelling vastgelegd, op slot', (info().bestellingen || []).length === 1 && await opSlot(page));
  await ontgrendel(page);
  await kiesBediening(page, 'Z', '2|stang', 1500);       // Z: stang erbij
  await kiesBediening(page, 'K2', '');                   // K2: koord vervalt
  // W: een ruit erbij (3 → 4) én een stang (zonder bolletjes: het vak is vrij).
  await page.fill('#rij-' + idVan('W') + ' input.aantal-input', '4');
  await page.dispatchEvent('#rij-' + idVan('W') + ' input.aantal-input', 'change');
  await wacht(200);
  await kiesBediening(page, 'W', '1|stang');
  await opgeslagenAls(() => dbRij('W').bediening === 'stang' && dbRij('W').aantal === 4 && dbRij('Z').bedieningLengte === 1500);
  m = await tb(page);
  check('teBestellen: in de tabel alleen W (EXTRA), geen VERVANGT', JSON.stringify(m.regels) === '["W"]' &&
    JSON.stringify(m.extra) === '["W"]' && JSON.stringify(m.gewijzigd) === '["W"]', JSON.stringify(m));
  check('en drie keer ALLEEN BEDIENING: Z erbij (3 ruiten), K2 vervalt, W erbij voor de 3 bestelde',
    JSON.stringify(m.bediening) === JSON.stringify([['Z', '', '2× bedieningsstang 1500 mm', 3],
      ['K2', '1× bedieningskoord std. lengte', '', 1], ['W', '', '1× bedieningsstang std. lengte', 3]]), JSON.stringify(m.bediening));
  t = await bestelTekst(page);
  check('tabblad Bestellijst: Z "onder ALLEEN BEDIENING, het glas wordt niet opnieuw gemaakt"',
    /Z: bediening \(geen\) → 2× bedieningsstang 1500 mm \(besteld in de 1e\) — op de aanvulling onder ALLEEN BEDIENING, het glas wordt niet opnieuw gemaakt/.test(t),
    (t.match(/Z: .{0,200}/) || [''])[0]);
  check('W: "1 extra; de 3 bestelde blijven; en onder ALLEEN BEDIENING"',
    /W: aantal 3 → 4; bediening \(geen\) → 1× bedieningsstang std\. lengte .{0,70}1 extra; de 3 bestelde blijven; en onder ALLEEN BEDIENING/.test(t),
    (t.match(/W: .{0,240}/) || [''])[0]);
  check('"Maak de bestellijst-pdf": 1 nieuwe of gewijzigde ruit en 3 ruiten met alleen een andere bediening',
    /een aanvulling<\/b> met alleen 1 nieuwe of gewijzigde ruit en 3 ruiten met alleen een andere bediening|aanvulling met alleen 1 nieuwe of gewijzigde ruit en 3 ruiten met alleen een andere bediening/.test(t),
    (t.match(/Maak de bestellijst.{0,200}/) || [''])[0]);

  const p2 = await bestellijstPdf(page);
  t = plat(pdfTekst(p2));
  check('pdf: nergens VERVANGT, en geen tabel ANNULEREN (geen glas weg)', !/VERVANGT \w+ uit/.test(t) && !/ANNULEREN, als dat nog kan/.test(t),
    (t.match(/VERVANGT \w+ uit.{0,60}/) || [''])[0]);
  check('pdf: W als EXTRA (+1, samen 4x) in de tabel', /W EXTRA bij W uit de 1e: \+1 592 992/.test(t) && /\(samen 4x\)/.test(t), (t.match(/Pos.{0,300}/) || [''])[0]);
  check('pdf: het blok "ALLEEN BEDIENING - glas NIET opnieuw maken" met de uitleg bovenaan',
    /ALLEEN BEDIENING - glas NIET opnieuw maken/.test(t) && /Onder de tabel: ALLEEN BEDIENING = bij een ruit die al besteld is/.test(t),
    (t.match(/ALLEEN BEDIENING.{0,200}/) || [''])[0]);
  check('Z: 3 ruiten, 792 x 1192, DucoTon 10 RAL 9010, 1e, "erbij: 2x bedieningsstang 1500 mm", 6 bedieningsstangen',
    /Z 3 792 1192 DucoTon 10 RAL 9010 1e erbij: 2x bedieningsstang 1500 mm 6 bedieningsstangen 1500 mm/.test(t) &&
    /ALLEEN BEDIENING - glas NIET opnieuw maken en NIET annuleren/.test(t),
    (t.match(/Z 3 .{0,160}/) || [''])[0]);
  check('K2: "vervalt: 1x bedieningskoord std. lengte (alleen de bediening annuleren; glas en rooster blijven)", 1 koord annuleren',
    /K2 1 692 892 DucoTon 10 RAL 9010 1e vervalt: 1x bedieningskoord std\. lengte \(alleen de 1 bedieningskoord std\. lengte bediening annuleren; glas en rooster blijven\) annuleren/.test(t),
    (t.match(/K2 1 .{0,160}/) || [''])[0]);
  check('W: de 3 al bestelde krijgen elk een stang: 3 bedieningsstangen',
    /W 3 592 992 DucoTon 10 RAL 9010 1e erbij: 1x bedieningsstang std\. lengte 3 bedieningsstangen/.test(t),
    (t.match(/W 3 .{0,160}/) || [''])[0]);
  check('totalen: 0 NIEUW, 0 VERVANGT, 1 EXTRA, 3 ALLEEN BEDIENING', /alleen deze aanvulling: 0 NIEUW, 0 VERVANGT, 1 EXTRA, 3 ALLEEN BEDIENING/.test(t),
    (t.match(/alleen deze aanvulling.{0,80}/) || [''])[0]);
  check('LET OP-kader: de nieuwe W (+1) met 1 bedieningsstang', /Extra bediening: 1 bedieningsstang \(zie kolom/.test(t),
    (t.match(/Extra bediening.{0,60}/) || [''])[0]);

  await verstuurd(page, 2);
  const b2 = info().bestellingen[1];
  check('vastgelegd: Z en K2 als besteld (op de lijst) met bedieningVan, zonder "vervangt"',
    b2.ruiten[idVan('Z')].opLijst && JSON.stringify(b2.ruiten[idVan('Z')].bedieningVan) === '{}' && !b2.ruiten[idVan('Z')].vervangt &&
    b2.ruiten[idVan('Z')].bedieningUit === '1e' &&
    JSON.stringify(b2.ruiten[idVan('K2')].bedieningVan) === '{"bediening":"koord","bedieningAantal":1}' && !b2.ruiten[idVan('K2')].vervangt,
    JSON.stringify([b2.ruiten[idVan('Z')], b2.ruiten[idVan('K2')]]).slice(0, 400));
  check('W: extra 3 én bedieningVan {}', b2.ruiten[idVan('W')].extra === 3 && JSON.stringify(b2.ruiten[idVan('W')].bedieningVan) === '{}',
    JSON.stringify(b2.ruiten[idVan('W')]));
  m = await page.evaluate(() => ({ Z: besteldInTekst(rijen[1].id), W: besteldInTekst(rijen[3].id), K2: besteldInTekst(rijen[2].id),
    geel: rijen.filter(r => naBestellingGewijzigd(r)).map(r => r.merk), aantal: teBestellen().aantal }));
  check('daarna: het glas van Z en K2 is nog "uit de 1e", W "1e en 2e"; niets meer geel of te bestellen',
    m.Z === '1e' && m.K2 === '1e' && m.W === '1e en 2e' && !m.geel.length && m.aantal === 0, JSON.stringify(m));

  console.log('\n2. Alleen de bediening, zonder iets anders op de lijst; terug naar een eerder bestelde bediening');
  await ontgrendel(page);
  await kiesBediening(page, 'Z', '');                    // Z: de stang uit de 2e vervalt weer
  await opgeslagenAls(() => !('bediening' in dbRij('Z')));
  const p3 = await bestellijstPdf(page);                  // STANDAARD: "Oudere stand?" → Stoppen
  check('geen "Oudere stand?" (de bediening van de 1e was "geen", maar dit is een bewuste wijziging)',
    gevraagd.indexOf('Oudere stand?') < 0 && !!p3, 'gevraagd: ' + gevraagd.join(' / '));
  t = plat(pdfTekst(p3));
  check('pdf: geen tabel, wel het blok met Z "1e; bediening: 2e", "vervalt: 2x bedieningsstang 1500 mm", 6 stangen 1500 mm annuleren',
    /Geen nieuwe of gewijzigde ruiten op deze aanvulling/.test(t) &&
    // De stang komt uit de 2e (het glas uit de 1e): beide genoemd, anders zoekt de leverancier hem in de 1e.
    /Z 3 792 1192 DucoTon 10 RAL 9010 1e; bediening: 2e vervalt: 2x bedieningsstang 1500 mm \(alleen de 6 bedieningsstangen 1500 mm bediening annuleren/.test(t),
    (t.match(/Z 3 .{0,160}/) || [t.slice(0, 300)])[0]);
  check('en de app vraagt of hij verstuurd is (een lijst met alleen bediening is een bestelling)', (await vraagOpScherm(page)).ok);
  await knop(page, 'Ja, verstuurd');
  check('3e bestelling vastgelegd', await wachtTot(() => (info().bestellingen || []).length === 3, 10000));
  m = await page.evaluate(() => ({ Z: besteldInTekst(rijen[1].id), geel: rijen.filter(r => naBestellingGewijzigd(r)).map(r => r.merk),
    kort2: !!(projectInfo.bestellingen[1].ruiten[rijen[1].id] || {}).kort }));
  check('Z blijft "uit de 1e", ook nu de 2e is ingekort', m.Z === '1e' && m.kort2 && !m.geel.length, JSON.stringify(m));

  console.log('\n3. Bediening én iets aan het glas of rooster: dat blijft VERVANGT');
  // Overzicht eerst (er is niets te bestellen): kolom Besteld = waar het glas zit.
  const pov = await bestellijstPdf(page);
  t = plat(pdfTekst(pov));
  check('overzicht: Z "Besteld" = 1e (het glas), niet de 3e (alleen bediening)', /OVERZICHT/.test(t) &&
    / 3 Z 1e 792 1192 /.test(t) && /4 W 1e \+ 2e \(3 \+ 1\) 592 992/.test(t), (t.match(/Pos Aantal.{0,300}/) || [t.slice(0, 300)])[0]);
  await ontgrendel(page);
  await kiesBediening(page, 'K2', '2|koord');
  await kiesBediening(page, 'Z', '1|stang');
  await page.evaluate(() => {
    const k2 = rijen.find(r => r.merk === 'K2'); k2.breedte = '710';          // K2: andere maat + koord
    // v114: een andere RAL alleen is nu ALLEEN ROOSTER (test-v114.js); hier een
    // andere opmerking: die verandert het glas-kenmerk zonder de glasmaat.
    const z = rijen.find(r => r.merk === 'Z'); z.opmerking = 'gehard glas, zie tekening';   // Z: andere opmerking + stang
    const w = rijen.find(r => r.merk === 'W'); w.breedte = '610';             // W: andere maat (stang uit de 2e)
    herbereken(); renderTabel(); opslaan(); });
  await wacht(400);
  m = await tb(page);
  check('K2 (maat), Z (opmerking) en W (maat): alle drie in de tabel, niets in het blok', JSON.stringify(m.regels) === '["Z","K2","W"]' &&
    !m.bediening.length, JSON.stringify(m));
  const p4 = await bestellijstPdf(page);
  t = plat(pdfTekst(p4));
  // (v114: de regel kan anders afbreken, nu Z een opmerking heeft; daarom los gezocht.)
  // v117: "standaard bediening" (was: "zonder bediening"; Jan: bij een rooster heet dat standaard).
  check('pdf: "K2 VERVANGT K2 uit de 1e (1x 692 x 892, standaard bediening)", nieuwe breedte 702',
    /VERVANGT K2 uit de 1e (\(1x )?702/.test(t) && /692 x 892, standaard [^)]{0,20}bediening\)/.test(t), (t.match(/VERVANGT K2.{0,200}/) || [''])[0]);
  check('pdf: Z met een andere opmerking = VERVANGT, en geen blok ALLEEN BEDIENING', /VERVANGT Z uit de 1e/.test(t) && !/ALLEEN BEDIENING - glas/.test(t),
    (t.match(/VERVANGT Z.{0,80}/) || [''])[0]);
  check('ANNULEREN: de oude W "(en de bediening uit de 2e)"', /vervangen door W op deze lijst \(en de bediening uit de 2e\)/.test(t),
    (t.match(/vervangen door W.{0,60}/) || [''])[0]);
  await vraagOpScherm(page); await knop(page, 'Nee, alleen bekeken');
  await ctx.close();

  console.log('\n4. Een collega bestelt tussen de pdf en ‹Ja, verstuurd›');
  bedProject();
  ({ ctx, page } = await openProject());
  m = await page.evaluate(() => {
    // 1e: Z ×3 zonder stang. 2e (collega): EXTRA, Z ×4. 3e (dit apparaat, pdf van vóór de 2e): alleen een stang, met aantal 3.
    const z = rijen.find(r => r.merk === 'Z');
    const een = { nr: 1, op: '2026-10-19T08:00:00Z', soort: 'volledig', ruiten: { [z.id]: ruitMomentopname(z, true) } };
    const vier = Object.assign({}, z, { aantal: 4 });
    const o2 = ruitMomentopname(vier, true); o2.extra = 3; o2.extraBij = '1e';
    const twee = { nr: 2, op: '2026-10-19T09:00:00Z', soort: 'aanvulling', ruiten: { [z.id]: o2 } };
    const met = Object.assign({}, z, { bediening: 'stang', bedieningAantal: 1 });
    const o3 = ruitMomentopname(met, true); o3.bedieningVan = {}; o3.bedieningUit = '1e';
    const drie = { nr: 3, op: '2026-10-19T10:00:00Z', soort: 'aanvulling', ruiten: { [z.id]: o3 } };
    const st = standVan([een, twee, drie]);
    const g = st.ruiten[z.id];
    return { aantal: g.aantal, bediening: g.bediening || '', k: g.k === ruitKenmerk(Object.assign({}, vier, { bediening: 'stang', bedieningAantal: 1 })),
             glas: besteldInTekst(z.id, st), bed: bedieningInTekst(z.id, st) };
  });
  check('de app rekent wat de leverancier maakt: 4 (van de collega), met de stang; glas "1e en 2e", bediening 3e',
    m.aantal === 4 && m.bediening === 'stang' && m.k && m.glas === '1e en 2e' && m.bed === '3e', JSON.stringify(m));
  await ctx.close();

  /* ══ ═══════════════════════════════════════════════════════════ */
  console.log('\nGeen fouten in de console');
  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log(fouten ? '\n' + fouten + ' FOUT(EN).' : '\nAlles goed.');
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
