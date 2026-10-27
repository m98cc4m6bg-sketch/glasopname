/* Testreeks v118 — node test-v118.js   (en: node test-v118.js --mutaties)

   Onderwerp: de lijst van Jan na de eerste proef met v117 (21-10-2026):
   1. een aparte pdf voor de werkvloer: per foto/tekening de foto met de
      merkletters en per ruit wat erin moet (met de stuklengtes van de
      latten), daarna benodigdheden en zaagplan; geen prijzen;
   2. glasbewerking "Helder (standaard)" ook op de bestellijst;
   3. max glaspakket (incl. band) uit een maatstaat: ook op Invoer rood
      (kiesbaar blijft het), gerekend met band 3 + 3 (projectstandaard);
   4. lege kolommen (roedenverdeling, opmerking, …) niet op de bestellijst;
   5. het tabblad Bestellijst zoals de pdf (zelfde kolommen en blokken);
   6. Toebehoren: per tabel van Invoer een eigen tabel met een eigen
      kopregel, ónder de foto;
   7. een kruisje (✕) op alles wat openklapt: menu's, foto's, tekeningen,
      zaagplan, instellingen, naslag;
   8. langere kopteksten, en een kolom Band dikte buiten (3, 4, 5);
   9. band van 5 mm = een rol 2 mm en een rol 3 mm op elkaar;
   10. de balk "Alle ruiten" los en duidelijk voor het hele project.

   Echte situatie: Jan meet een gevel in (foto met merkletters, één ruit los
   uit een maatstaat), kiest latten en band, stuurt de bestellijst en geeft
   de werkplaats een pdf om mee te werken. Later komt er een ruit bij en
   verandert er een maat (aanvulling).

   Wat deze opstelling aanneemt: zoals test-v117 (nagebootste database in
   node, echte Chromium, pdf teruggelezen met pdfplumber). PLAATJES=map voor
   schermafdrukken. Echte Safari/iPad: niet hier. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');


/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  bandBuitenRuit: ["latten.js", "    return BAND_BUITEN.indexOf(b) >= 0 ? b : (p || project()).bandBuiten;", "    return (p || project()).bandBuiten;"],
  bandBuitenKies: ["latten.js", "window.latBandBuiten = zetBandBuiten", "window.latBandBuiten = function () {}"],
  vijfRollen: ["toebehoren.js", "(c.dikte === 5 ? [2, 3] : [c.dikte])", "[c.dikte]"],
  vijfMeters: ["toebehoren.js", "bandM += m * (c.dikte === 5 ? 2 : 1);", "bandM += m;"],
  invoerRood: ["index.html", "const teDikMx = mxR && mxR.status === 'past niet' ? mxR : null;", "const teDikMx = null;"],
  helder: ["pdf.js", "          var t = r.glasbewerking || '';", "          var t = r.glasbewerking === 'Helder (standaard)' ? '' : (r.glasbewerking || '');"],
  legeKolom: ["pdf.js", "      return lijst.some(function (r) { return !leegWaarde(k.haal(r, 0)); });", "      return true;"],
  appModel: ["index.html", "const m = window.bestellijstModel ? bestellijstModel() :", "const m = 0 ? bestellijstModel() :"],
  perTabelKop: ["toebehoren.js", "<table class=\"samenvatting tb-tabel\">' + kop + '<tbody>'", "<table class=\"samenvatting tb-tabel\">' + '<tbody>'"],
  kopBuiten: ["toebehoren.js", "'<th class=\"tb-smal\">Band dikte buiten</th>", "'<th class=\"tb-smal\">Band</th>"],
  allesBlok: ["toebehoren.js", "<b>Voor het hele project (alle ruiten)</b>", "<b>Alle ruiten</b>"],
  kruisMenu: ["index.html", "  sluitKruis(menu, exportSluit, 'Menu sluiten');", ""],
  kruisMark: ["fotos.js", "    if (window.sluitKruis) sluitKruis(d, sluitMenu, 'Menu sluiten');   // v118", ""],
  kruisZaag: ["toebehoren.js", "'<button type=\"button\" class=\"sluit-x\" aria-label=\"Zaagplan inklappen\" onclick=\"this.parentNode.open = false\">✕</button>' +", "'' +"],
  kruisKalender: ["project.js", "    if (window.sluitKruis) sluitKruis(menu, sluitKalender, 'Kalender sluiten');   // v118", ""],
  werkvloerFoto: ["pdf.js", "          if (plaatjes[i]) y = tekenFoto(doc, plaatjes[i], f, eigen, y);", "          if (0) y = tekenFoto(doc, plaatjes[i], f, eigen, y);"],
  werkvloerZaag: ["pdf.js", "        toebehorenPagina(doc, 'Werkvloer - benodigdheden en zaagplan');", ""],
  werkvloerGeenControle: ["pdf.js", "    if (wat === 'werkvloer') { exportVerder(wat); return Promise.resolve(); }", ""],
};
const WAAR = { bandBuitenRuit: '1', bandBuitenKies: '2', vijfRollen: '1', vijfMeters: '1', invoerRood: '3', helder: '4', legeKolom: '4',
  appModel: '4', perTabelKop: '2', kopBuiten: '2', allesBlok: '2', kruisMenu: '6', kruisMark: '6', kruisZaag: '6', kruisKalender: '6',
  werkvloerFoto: '5', werkvloerZaag: '5', werkvloerGeenControle: '5' };

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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v118-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v118-pdf-'));
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


/* ─── hulp voor v118 ──────────────────────────────────────────── */
// De tekst per pagina (pdfTekst plakt alles aan elkaar).
function pdfPaginas(bestand) {
  const r = spawnSync('python3', ['-I', '-c',
    'import sys,json,pdfplumber\nwith pdfplumber.open(sys.argv[1]) as p:\n print(json.dumps([(x.extract_text() or "") for x in p.pages]))',
    bestand], { encoding: 'utf8' });
  try { return JSON.parse(r.stdout); } catch (e) { return ['[fout] ' + r.stderr]; }
}
// Het tabblad Bestellijst naast het model van de pdf (bestellijstModel).
const appEnModel = page => page.evaluate(() => {
  renderBestellijst();
  const el = document.getElementById('bestellijstInhoud');
  const mo = bestellijstModel();
  const tekst = x => (x || '').replace(/\s+/g, ' ').trim();
  const tab = el.querySelector('table.bl-hoofd');
  return {
    app: {
      kop: tab ? [...tab.querySelectorAll('thead th')].map(t => tekst(t.textContent)) : [],
      cellen: tab ? [...tab.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => tekst(td.textContent))) : [],
      blokken: [...el.querySelectorAll('h4.bl-blok-kop')].map(h => tekst(h.textContent)),
      blokTab: [...el.querySelectorAll('table.bl-tabel:not(.bl-hoofd)')].map(t => ({ kop: [...t.querySelectorAll('thead th')].map(x => tekst(x.textContent)),
        n: t.querySelectorAll('tbody tr').length })),
      totaal: tekst((el.querySelector('.bl-totaal') || {}).textContent),
      kader: tekst((el.querySelector('.bl-kader b') || {}).textContent),
      titel: tekst((el.querySelector('.bl-titel') || {}).firstChild && el.querySelector('.bl-titel').firstChild.textContent)
    },
    model: {
      kop: mo.kolommen.slice(),
      cellen: mo.regels.map(g => g.cellen.map(c => tekst(String(c == null ? '' : c)))),
      blokken: mo.blokken.map(b => tekst(b.kop)),
      blokTab: mo.blokken.map(b => ({ kop: b.head.map(tekst), n: b.body.length })),
      totaal: tekst(mo.totaal),
      kader: mo.kop ? tekst(mo.kop.kopje) : '',
      titel: tekst(mo.titel)
    }
  };
});
// Een kruisje in een open venster/menu: staat rechtsboven, en sluit het.
async function kruis(page, sel, naam, dicht) {
  const vak = page.locator(sel).first();
  const zicht = await vak.isVisible().catch(() => false);
  const x = page.locator(sel + ' .sluit-x').first();
  const heeft = await x.isVisible().catch(() => false);
  let plek = null;
  if (zicht && heeft) {
    const a = await vak.boundingBox(), b = await x.boundingBox();
    plek = { rechts: Math.round(a.x + a.width - (b.x + b.width)), boven: Math.round(b.y - a.y), w: Math.round(b.width), h: Math.round(b.height) };
    if (PLAATJES) await vak.screenshot({ path: path.join(PLAATJES, 'v118-kruis-' + naam.replace(/[^a-z0-9]+/gi, '-') + '.png') }).catch(() => {});
    await x.click();
    await wacht(350);
  }
  const weg = dicht ? await dicht() : !(await page.locator(sel).first().isVisible().catch(() => false));
  check(naam + ': ✕ rechtsboven (32 × 32), sluit', zicht && heeft && weg && plek && plek.rechts >= -1 && plek.rechts <= 14 &&
    plek.boven >= -1 && plek.boven <= 14 && plek.w === 32 && plek.h === 32, JSON.stringify({ zicht, heeft, weg, plek }));
}
const geenScroll = page => page.evaluate(() => {
  const w = [...document.querySelectorAll('.tb-wrap')].filter(x => x.offsetParent);
  return { tabel: Math.max(0, ...w.map(x => x.scrollWidth - x.clientWidth)), pagina: document.documentElement.scrollWidth - window.innerWidth };
});
// Het gevelproject met latten (zoals v115/v117) en een ruit los uit een
// maatstaat: D, max glaspakket 28 (4-15-4 + 3 + 3 = 29 → te dik).
const GEVEL118 = p => { LATTEN_GEVEL(p); p.data.rijen.find(r => r.merk === 'D').maxPakket = 28; };

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, m, t, u, id;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Rekenen: band buiten per ruit, 5 mm = 2 + 3');
    latProject();
    ({ ctx, page } = await openProject());
    u = await page.evaluate(() => [GlasLatten.BAND_BINNEN, GlasLatten.BAND_BUITEN]);
    check('band binnen 2, 3, 4, 5; band buiten 3, 4, 5', JSON.stringify(u) === '[[2,3,4,5],[3,4,5]]', JSON.stringify(u));
    await zetPR(page, 'X', { latZijde: 'binnen', sponningDiepte: 50 });
    u = await R(page, 'X', (r, G) => { const p = G.pakket(r); return [p.bandBinnen, p.bandBuiten, G.pakketDikte(r).zonder]; });
    check('zonder keuze: band 3 + 3 (projectstandaard), pakket X 23 + 6 = 29', JSON.stringify(u) === '[3,3,29]', JSON.stringify(u));
    id = await idOp(page, 'X');
    await page.evaluate(i => latBandBuiten(i, '5'), id); await wacht(200);
    u = await R(page, 'X', (r, G) => { const p = G.pakket(r); return [p.bandBinnen, p.bandBuiten, G.pakketDikte(r).zonder, G.ruit(r).bandBuiten]; });
    check('band buiten 5 bij X: pakket 23 + 3 + 5 = 31, bewaard bij de ruit', JSON.stringify(u) === '[3,5,31,5]', JSON.stringify(u));
    m = await R(page, 'Y', (r, G) => G.pakket(r).bandBuiten);
    check('de andere ruiten blijven op 3', m === 3, m);
    await page.evaluate(i => latBand(i, '2'), id); await wacht(200);
    u = await R(page, 'X', (r, G) => G.pakketDikte(r).zonder);
    check('band binnen 2 + buiten 5: pakket 30', u === 30, u);
    await page.evaluate(i => rijen.find(r => r.id === i).maxPakket = 29, id);
    u = await R(page, 'X', (r, G) => [G.oordeelRuit(r).max && G.oordeelRuit(r).max.status, G.kortRuit(G.oordeelRuit(r))]);
    check('max glaspakket 29 met band 2 + 5 (30): te dik −1', u[0] === 'past niet' && /te dik −1 \(max 29\)/.test(u[1]), JSON.stringify(u));
    await page.evaluate(i => { delete rijen.find(r => r.id === i).maxPakket; }, id);
    await page.evaluate(i => latBandBuiten(i, '6'), id); await wacht(200);
    u = await R(page, 'X', (r, G) => [G.ruit(r).bandBuiten || '', G.pakket(r).bandBuiten]);
    check('een onzinwaarde (6) wordt niet bewaard: terug naar de standaard 3', JSON.stringify(u) === '["",3]', JSON.stringify(u));
    // 5 mm: rollen 2 en 3.
    await page.evaluate(i => { latBand(i, '5'); latBandBuiten(i, '5'); }, id); await wacht(200);
    u = await page.evaluate(() => {
      const b = toebehorenBerekenen();
      const x = b.perRuit.find(p => p.rij.merk === 'X');
      const r = x.rij, om = 2 * (+r.glasBreedte + +r.glasHoogte) / 1000;
      return { band: b.band.map(v => v.dikte + ':' + Math.round(v.meters * 100) / 100), vijf: b.vijfmm, om: Math.round(om * 100) / 100,
               bandM: Math.round(x.bandM * 100) / 100, uitleg: Object.values(toebehorenUitleg(b)).join(' ') };
    });
    const bij = d => +((u.band.find(s => +s.split(':')[0] === d) || ':0').split(':')[1]);
    // X binnen en buiten 5 mm: per kant de omtrek op rol 2 én op rol 3.
    // Y (×2) en D: 3 mm aan beide kanten.
    check('band 5 mm (X, binnen en buiten) telt mee op de rol van 2 mm (2 × de omtrek) en 3 mm; geen rol van 5 mm',
      Math.abs(bij(2) - 2 * u.om) < 0.02 && bij(3) > 2 * u.om && !u.band.some(s => /^5:/.test(s)), JSON.stringify(u.band) + ' omtrek ' + u.om);
    check('per ruit "m band": twee lagen bij 5 mm (4 × de omtrek)', Math.abs(u.bandM - 4 * u.om) < 0.02, u.bandM + ' / ' + u.om);
    check('in de uitleg: "Band van 5 mm telt hier mee: dat is 2 mm en 3 mm op elkaar."', !!u.vijf && Object.keys(u.vijf).length === 1 &&
      /Band van 5 mm telt hier mee: dat is 2 mm en 3 mm op elkaar\./.test(u.uitleg), u.uitleg.slice(0, 160));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Toebehoren: Alle ruiten apart, per tabel een kop onder de foto, nieuwe koppen, band buiten');
    ({ ctx, page } = await gevelOpen(GEVEL118));
    await naarToebehoren(page);
    m = await page.evaluate(() => {
      const w = document.getElementById('toebehorenInhoud');
      const blok = w.querySelector('.tb-alles-blok');
      const secties = [...w.querySelectorAll('section.tb-groep')];
      return {
        blok: !!blok, blokTekst: blok ? blok.innerText.replace(/\s+/g, ' ') : '',
        blokInTabel: !!(blok && blok.closest('table, section.tb-groep')),
        blokVoor: !!(blok && secties[0] && (blok.compareDocumentPosition(secties[0]) & Node.DOCUMENT_POSITION_FOLLOWING)),
        knop: blok ? [...blok.querySelectorAll('button')].map(b => b.textContent.trim()) : [],
        secties: secties.map(s => {
          const tab = s.querySelector('table.tb-tabel'), kopVak = s.querySelector('.tb-groep-in');
          return { titel: (s.querySelector('.tb-groep-tekst b') || {}).textContent, foto: !!s.querySelector('.tb-groep-in .fv, .tb-groep-in img, .tb-groep-in [class*="foto"]'),
            kopVoorTabel: !!(kopVak && tab && (kopVak.compareDocumentPosition(tab) & Node.DOCUMENT_POSITION_FOLLOWING)),
            kop: tab ? [...tab.querySelectorAll('thead th')].map(t => t.textContent.trim()).filter(Boolean) : [],
            merken: tab ? [...tab.querySelectorAll('tbody td.tb-merk b')].map(b => b.textContent) : [] };
        })
      };
    });
    check('"Voor het hele project (alle ruiten)" staat los, boven de tabellen, met "Toepassen op alle ruiten"', m.blok && !m.blokInTabel && m.blokVoor &&
      /Alle ruiten tegelijk wijzigen/.test(m.blokTekst)   // v124: kop van het blok (was "Voor het hele project (alle ruiten)"; nu stap 1 "Voor het hele project")
      && m.knop.indexOf('Toepassen op alle ruiten') >= 0, JSON.stringify(m).slice(0, 300));
    check('twee tabellen, zoals op Invoer: de foto "Voorgevel" (A B C E F) en de losse regels (D)', m.secties.length === 2 &&
      m.secties[0].titel === 'Voorgevel' && m.secties[0].merken.join('') === 'ABCEF' && /Losse regels/.test(m.secties[1].titel) &&
      m.secties[1].merken.join('') === 'D', JSON.stringify(m.secties.map(s => [s.titel, s.merken.join('')])));
    check('bij de foto: het plaatje en de naam boven de tabel (merk, glastype, opbouw … eronder)', m.secties[0].foto && m.secties.every(s => s.kopVoorTabel),
      JSON.stringify(m.secties.map(s => [s.foto, s.kopVoorTabel])));
    const KOP = ['Merk', 'Glastype', 'Opbouw', 'Glas dikte', 'Pakket dikte', 'Sponning diepte', 'Sponning diepte onder', 'Latzijde',
                 'Glaslat type', 'Onderlat type', 'Band dikte binnen', 'Band dikte buiten', 'Oordeel', 'Nodig'];
    check('elke tabel een eigen kopregel met de nieuwe namen (Glas dikte … Band dikte buiten)', m.secties.every(s => JSON.stringify(s.kop) === JSON.stringify(KOP)),
      JSON.stringify(m.secties.map(s => s.kop)));
    // Band buiten kiezen in de tabel (echte keuze).
    const selA = tbR(page, 'A').locator('select[data-sleutel^="bandb-"]');
    u = await selA.evaluate(s => [...s.options].map(o => o.textContent));
    check('keuzelijst band buiten: std 3, 3 mm, 4 mm, 5 mm (2+3)', JSON.stringify(u) === '["std 3","3 mm","4 mm","5 mm (2+3)"]', JSON.stringify(u));
    await selA.selectOption('5'); await wacht(500);
    t = (await tbCel(page, 'A', 'tb-pakket')).replace(/\s+/g, ' ');
    check('A band buiten 5: pakket 23 + 3 + 5 = 31 (met lat 46)', /^31 met lat 46$/.test(t), t);
    await opgeslagenAls(() => perRuitDb('A').bandBuiten === 5);
    check('bewaard in het project (toebehoren per ruit)', perRuitDb('A').bandBuiten === 5, JSON.stringify(perRuitDb('A')));
    // Het venster van de ruit kent het ook.
    await tbR(page, 'A').locator('td.tb-oordeel .pk-chip').click(); await wacht(300);
    u = await page.$eval('.lat-venster select.pk-band-buiten', s => [s.value, [...s.options].map(o => o.textContent)]).catch(() => null);
    check('in het venster van de ruit: band buiten 5 (2 + 3)', u && u[0] === '5' && u[1].some(o => /5 mm \(2 \+ 3\)/.test(o)), JSON.stringify(u));
    await page.keyboard.press('Escape'); await wacht(200);
    // De cursor blijft staan, ook in de tweede tabel (het scherm wordt na elke wijziging bijgewerkt).
    id = await idOp(page, 'D');
    await page.click('[data-sleutel="diepte-' + id + '"]');
    await page.keyboard.press('Control+a'); await page.keyboard.type('40');
    await page.keyboard.press('Tab'); await wacht(500);
    u = await page.evaluate(() => (document.activeElement || {}).dataset ? document.activeElement.dataset.sleutel : '');
    check('tweede tabel: diepte D typen en Tab → de cursor staat in "onder" van D', u === 'onder-' + id, u);
    await page.keyboard.type('48'); await page.keyboard.press('Tab'); await wacht(500);
    u = await page.evaluate(() => document.activeElement && document.activeElement.dataset.sleutel);
    await opgeslagenAls(() => perRuitDb('D').sponningDiepte === 40 && perRuitDb('D').diepteOnder === 48);
    check('… en verder naar latzijde van D; 40 en 48 bewaard', u === 'zijde-' + id && perRuitDb('D').sponningDiepte === 40 && perRuitDb('D').diepteOnder === 48,
      u + ' ' + JSON.stringify(perRuitDb('D')));
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v118-toebehoren-pc.png'), fullPage: true });
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Invoer: te dik voor het max glaspakket (maatstaat) in rood, wel kiesbaar');
    ({ ctx, page } = await gevelOpen(GEVEL118));
    await naarInvoer(page);
    id = await idOp(page, 'D');
    const rood = () => page.evaluate(i => {
      const dk = document.getElementById('dk-' + i), o = document.getElementById('opb-' + i);
      return { dk: dk.className, tekst: dk.textContent.trim(), titel: dk.title, opb: o.className, opbTitel: o.title, waarde: o.value };
    }, id);
    m = await rood();
    check('D (4-15-4, max 28, band 3 + 3 = 29): dikte rood "· te dik", opbouw rood, met uitleg', /te-dik/.test(m.dk) && /te dik/.test(m.tekst) &&
      /te-dik/.test(m.opb) && /max glaspakket \(maatstaat\) 28 mm: te dik, 1 mm/.test(m.opbTitel), JSON.stringify(m));
    u = await page.evaluate(() => rijen.filter(r => r.merk && r.merk !== 'D').map(r => document.getElementById('dk-' + r.id).className).join(' '));
    check('de andere ruiten (geen max): niet rood', !/te-dik/.test(u), u);
    // Kiesbaar: een te dikke opbouw blijft te kiezen (grijs in de lijst), maar rood.
    await page.selectOption('#opb-' + id, '4-16-4'); await wacht(400);
    m = await rood();
    check('4-16-4 (te dik) blijft te kiezen, en is dan rood', m.waarde === '4-16-4' && /te-dik/.test(m.dk) && /te-dik/.test(m.opb), JSON.stringify(m));
    await page.selectOption('#opb-' + id, '4-13-4'); await wacht(400);
    m = await rood();
    check('4-13-4 (21 + 6 = 27, past): niet meer rood', m.waarde === '4-13-4' && !/te-dik/.test(m.dk) && !/te-dik/.test(m.opb) && !/te dik/.test(m.tekst), JSON.stringify(m));
    // Band buiten op Toebehoren telt mee (max 30 met 4-15-4: 29 past; met band 5: 31 te dik).
    await page.selectOption('#opb-' + id, '4-15-4'); await wacht(300);
    await page.evaluate(i => { rijen.find(r => r.id === i).maxPakket = 30; renderTabel(); }, id); await wacht(300);
    check('max 30 met band 3 + 3 (29): niet rood', !/te-dik/.test((await rood()).dk));
    await page.evaluate(i => latBandBuiten(i, '5'), id); await wacht(300);
    await naarToebehoren(page); await naarInvoer(page);
    m = await rood();
    check('band buiten 5 bij D (23 + 3 + 5 = 31 > 30): op Invoer rood', /te-dik/.test(m.dk) && /te-dik/.test(m.opb), JSON.stringify(m));
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v118-invoer-tedik.png'), fullPage: false });
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Bestellijst: Helder (standaard), geen lege kolommen, tabblad = pdf');
    bestelProject();
    ({ ctx, page } = await openProject());
    m = await appEnModel(page);
    check('kolommen: Glasbewerking wel (Helder (standaard)), geen Roedenverdeling, Opmerking, Rooster of Duco', m.model.kop.indexOf('Glasbewerking') >= 0 &&
      !m.model.kop.some(k => /Roeden|Opmerking|Rooster|Duco|RAL|Bediening|Wijz/.test(k)), JSON.stringify(m.model.kop));
    check('het tabblad heeft precies dezelfde kolommen als de pdf', JSON.stringify(m.app.kop) === JSON.stringify(m.model.kop), JSON.stringify([m.app.kop, m.model.kop]));
    check('… en dezelfde regels en waarden', JSON.stringify(m.app.cellen) === JSON.stringify(m.model.cellen), JSON.stringify(m.app.cellen[0]) + ' / ' + JSON.stringify(m.model.cellen[0]));
    check('… en hetzelfde totaal', m.app.totaal && m.app.totaal === m.model.totaal, m.app.totaal + ' / ' + m.model.totaal);
    let pdf = await bestellijstPdf(page, ONVOLLEDIG);
    t = plat(pdfTekst(pdf));
    check('pdf: Glasbewerking met "Helder (standaard)" bij elke ruit', /Glasbewerking/.test(t) && (t.match(/Helder \(standaard\)/g) || []).length === 3,
      (t.match(/Helder \(standaard\)/g) || []).length + ' | ' + t.slice(0, 300));
    check('pdf: geen lege kolommen (Roedenverdeling, Opmerking)', !/Roedenverdeling|Opmerking/.test(t), (t.match(/(Roedenverdeling|Opmerking).{0,60}/) || [''])[0]);
    check('pdf: alle kolommen van het tabblad staan erop', m.model.kop.every(k => t.indexOf(k.split(' ')[0]) >= 0), JSON.stringify(m.model.kop));
    await vraagOpScherm(page); await knop(page, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
    // Een opmerking bij één ruit: dan staat de kolom er wél, op beide.
    await ontgrendel(page);
    await page.evaluate(() => {
      const k2 = rijen.find(r => r.merk === 'K2'); k2.breedte = '850'; k2.opmerking = 'gezandstraald randje';
      herbereken(); renderTabel(); opslaan();
    });
    await ruitErbij(page, Object.assign({ merk: 'K4', breedte: '700', hoogte: '700' }, KOMPLEET, INGEMETEN));
    await opgeslagenAls(() => (rijVan(1).data.rijen || []).some(r => r.merk === 'K4'));
    m = await appEnModel(page);
    check('aanvulling: titel en kader gelijk aan de pdf', m.app.titel === m.model.titel && /AANVULLING/.test(m.app.titel) && m.app.kader && m.app.kader === m.model.kader,
      JSON.stringify([m.app.titel, m.app.kader, m.model.kader]));
    check('aanvulling: kolom Opmerking (bij K2) en Wijz. erbij, zelfde als de pdf', m.model.kop.indexOf('Opmerking') >= 0 && m.model.kop.indexOf('Wijz.') >= 0 &&
      JSON.stringify(m.app.kop) === JSON.stringify(m.model.kop), JSON.stringify([m.app.kop, m.model.kop]));
    check('aanvulling: dezelfde regels (K2 VERVANGT, K4 NIEUW)', JSON.stringify(m.app.cellen) === JSON.stringify(m.model.cellen) && m.app.cellen.length === 2,
      JSON.stringify(m.app.cellen));
    check('aanvulling: dezelfde blokken (o.a. ANNULEREN), met dezelfde koppen en aantallen', m.model.blokken.length >= 1 &&
      JSON.stringify(m.app.blokken) === JSON.stringify(m.model.blokken) && JSON.stringify(m.app.blokTab) === JSON.stringify(m.model.blokTab) &&
      m.app.blokken.some(b => /ANNULEREN/.test(b)), JSON.stringify([m.app.blokken, m.app.blokTab, m.model.blokTab]));
    // Lege kolommen in het annuleren-blok ook niet.
    check('annuleren-blok: geen lege kolommen (Roedenverdeling)', m.model.blokTab.every(b => !b.kop.some(k => /Roeden/.test(k))), JSON.stringify(m.model.blokTab));
    pdf = await bestellijstPdf(page, ONVOLLEDIG);
    t = plat(pdfTekst(pdf));
    check('pdf aanvulling: de blokken en de opmerking staan er net zo op', m.model.blokken.every(b => t.indexOf(b.slice(0, 25)) >= 0) &&
      /gezandstraald randje/.test(t), m.model.blokken.join(' / ') + ' | ' + t.slice(0, 200));
    await sluitMeldingen(page);
    await page.click('.tab-btn:has-text("Bestellijst")'); await wacht(300);
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v118-bestellijst-pc.png'), fullPage: true });
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. PDF werkvloer');
    // Zonder leverinstructie: de werkvloer-pdf gaat niet naar de leverancier,
    // dus geen vraag om de leverpagina aan te vullen.
    ({ ctx, page } = await gevelOpen(p => { GEVEL118(p); delete p.data.info.leverInstructie; }));
    await page.click('button:has-text("⬇ Exporteren")'); await wacht(300);
    t = await page.$eval('.veld-menu', e => e.innerText.replace(/\s+/g, ' '));
    check('in het menu Exporteren: "PDF werkvloer"', /PDF werkvloer/.test(t), t.slice(0, 200));
    await page.click('.veld-menu .sluit-x'); await wacht(200);
    const verwacht = await page.evaluate(() => {
      const b = toebehorenBerekenen();
      const a = b.perRuit.find(p => p.rij.merk === 'A');
      // Per lengte opgeteld, langste eerst (zo staat het op papier).
      const per = {}; a.stukken.forEach(s => { per[s.mm] = (per[s.mm] || 0) + s.n; });
      return { stukken: Object.keys(per).sort((x, y) => y - x).map(mm => per[mm] + ' x ' + Number(mm).toLocaleString('nl-NL')), type: GlasLatten.latVoorRuit(a.rij).id };
    });
    const pdf = await bestellijstPdf(page, {}, 'PDF werkvloer');
    check('geen vragen over de levering (niet voor de leverancier)', pdf && gevraagd.length === 0, gevraagd.join(' / '));
    check('bestandsnaam begint met "Werkvloer"', /^Werkvloer/.test(laatsteNaam), laatsteNaam);
    t = pdfTekst(pdf);
    const vlak = plat(t);
    check('pagina 1: "Werkvloer - foto 1 - Voorgevel"', /Werkvloer - foto 1 - Voorgevel/.test(vlak), vlak.slice(0, 160));
    check('kolommen: merk, aantal, glasmaat, opbouw, latzijde, glaslat, onderlat, band, latten met stuklengtes',
      /Merk/.test(vlak) && /Glasmaat b x h/.test(vlak) && /Latzijde/.test(vlak) && /Glaslat/.test(vlak) && /Onderlat/.test(vlak) && /Band/.test(vlak) && /bi\/bu/.test(vlak) && /stuks x mm/.test(vlak),
      vlak.slice(0, 400));
    check('A: 1 × 992 x 792, 4-15-4 (23), binnen, A4', /A 1 992 x 792 4-15-4 \(23\) binnen A4/.test(vlak), (vlak.match(/A 1 992.{0,120}/) || [''])[0]);
    check('A: de stukken van de latten (zelfde als het zaagplan): ' + verwacht.type + ': ' + verwacht.stukken.join(', '),
      vlak.indexOf(verwacht.type + ': ') >= 0 && vlak.indexOf(verwacht.type + ': ' + verwacht.stukken.join(', ')) >= 0, (vlak.match(/A 1 992.{0,200}/) || [''])[0]);
    // D (los) past nog onder de foto: "Zonder foto (losse regels)" op dezelfde pagina.
    const pag1 = plat(pdfPaginas(pdf)[0] || '');
    // v120: bij Let op staat nu ook "vlak met kozijn"; in de platte tekst van
    // de pdf loopt dat woord door de regel van de latten heen.
    check('B ×3: de latten samen, met "(samen, 3 ruiten)"', /\bB 3 892 x 1492.{0,160}\(samen, 3 (kozijn )?ruiten\)/.test(vlak), (vlak.match(/\bB 3 892.{0,200}/) || [''])[0]);
    check('kolom "Let op": E en F "LATZIJDE NOG KIEZEN", C "past niet" (rood), A niets', /\bE 1 492 x 492.{0,120}LATZIJDE NOG KIEZEN/.test(vlak) &&
      /\bF 1 392 x 392.{0,120}LATZIJDE NOG KIEZEN/.test(vlak) && /\bC 2 692 x 692.{0,140}past niet/.test(vlak) && !/\bA 1 992 x 792.{0,100}(LATZIJDE|past niet|te dik)/.test(vlak.split(' B 3 ')[0]),
      (vlak.match(/\bC 2 692.{0,160}/) || [''])[0]);
    check('B ×3, C, E en F bij de foto; D (los) onder "Zonder foto (losse regels)", nog op pagina 1', /\bB 3 892 x 1492/.test(vlak) && /\bF 1 392 x 392/.test(vlak) &&
      /Zonder foto \(losse regels\).{0,200}\bD 2 592 x 1192/.test(pag1), (pag1.match(/Zonder foto.{0,120}/) || [''])[0]);
    const bollen = pdfBollen(pdf);
    // Zoals in de PDF invoer: niet meer bolletjes dan het aantal (E ×1 heeft er twee; oud project).
    check('de foto met de merkletters (oranje bolletjes): A, B×3, C, E', JSON.stringify(telLetters(bollen)) === JSON.stringify({ A: 1, B: 3, C: 1, E: 1 }),
      JSON.stringify(bollen));
    check('achteraan: benodigdheden en zaagplan', /Werkvloer - benodigdheden en zaagplan/.test(vlak) && /Zaagplan/.test(vlak) && /glasband|Glasband/.test(vlak),
      (vlak.match(/benodigdheden.{0,160}/) || [''])[0]);
    check('geen prijzen en geen leveranciersgegevens', !/€|prijs|Leverlocatie|ANNULEREN/i.test(vlak), (vlak.match(/.{0,40}(€|prijs|Leverlocatie).{0,40}/i) || [''])[0]);
    check('niets is als besteld vastgelegd', !(info().bestellingen || []).length && rijVan(1).status !== 'besteld', JSON.stringify(info().bestellingen || []));
    if (PLAATJES) fs.copyFileSync(pdf, path.join(PLAATJES, 'v118-werkvloer.pdf'));
    await ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Een kruisje op alles wat openklapt');
    ({ ctx, page } = await gevelOpen(GEVEL118));
    // Exporteren.
    await page.click('button:has-text("⬇ Exporteren")'); await wacht(300);
    await kruis(page, '.veld-menu', 'menu Exporteren');
    await page.click('button:has-text("⬇ Exporteren")'); await wacht(300);
    await page.keyboard.press('Escape'); await wacht(250);
    check('menu Exporteren: ook Escape sluit', !(await page.locator('.veld-menu').count()));
    // Uitleg (i).
    await naarInvoer(page);
    await page.locator('.info-icon:visible').first().click(); await wacht(300);
    await kruis(page, '.info-tip', 'uitleg (i)');
    // Doorvoeren (⤓) in een kolomkop.
    await page.locator('.bulk-vul:visible').first().click(); await wacht(400);
    await kruis(page, '.bulk-pop', 'doorvoeren ⤓');
    // Datum.
    await page.evaluate(() => datumKeuze(document.getElementById('projectDatum'))); await wacht(300);
    await kruis(page, '.veld-menu', 'datum kiezen');
    // Leverkalender.
    await page.evaluate(() => leverKalender(document.getElementById('projectNaam'), true)); await wacht(300);
    await kruis(page, '.kalender', 'leverkalender');
    // Bolletje op de foto.
    await page.click('.tab-btn:has-text("Foto")').catch(() => {}); await wacht(300);
    await bolMenu(page, 'A', 1);
    await kruis(page, '.mark-menu', 'menu van een bolletje');
    // Foto groot.
    await page.evaluate(f => fotoGroot(f), FOTO); await wacht(400);
    await kruis(page, '.fv-groot .lat-groot-inhoud', 'foto groot', async () => !(await page.locator('.fv-groot').count()));
    // Toebehoren: tekening groot, zaagplan, instellingen, venster.
    await naarToebehoren(page);
    await page.click('#tbAlleLat'); await page.click('.tb-lk-optie[data-waarde="E22|om"]'); await wacht(300);   // v124: latkiezer
    await page.click('#tbAlleVoorbeeld'); await wacht(300);
    await kruis(page, '.lat-groot .lat-groot-inhoud', 'tekening van de lat groot', async () => !(await page.locator('.lat-groot').count()));
    await page.click('#tbAlleLat'); await page.click('.tb-lk-optie[data-waarde="-"]'); await wacht(200);   // v124: latkiezer
    const zaag = page.locator('details.tb-zaag').first();
    await zaag.locator('summary').click(); await wacht(300);
    await kruis(page, 'details.tb-zaag[open]', 'zaagplan', async () => !(await zaag.evaluate(d => d.open)));
    await page.locator('.tb-inst-kop').click(); await wacht(300);
    await kruis(page, '.tb-instellingen-open', 'instellingen', async () => !(await page.locator('.tb-instellingen-open').count()));
    await tbR(page, 'B').locator('[data-sleutel^="olat-"]').click(); await wacht(300);
    m = await page.locator('.lat-venster .lat-sluit').isVisible().catch(() => false);
    const groep = page.locator('.lat-venster details.lat-groep').first();
    if (!(await groep.evaluate(d => d.open))) { await groep.locator('summary').click(); await wacht(200); }
    await kruis(page, '.lat-venster details.lat-groep[open]', 'groep in het latvenster', async () => !(await groep.evaluate(d => d.open)));
    check('het latvenster zelf heeft al een ✕', m);
    await page.keyboard.press('Escape'); await wacht(200);
    // Naslag.
    await page.click('.tab-btn:has-text("Naslag")'); await wacht(400);
    await page.click('.nsl-kop:has-text("Duco ventilatieroosters")'); await wacht(400);
    await kruis(page, 'section.nsl-sectie.nsl-open', 'naslag-onderdeel', async () => !(await page.locator('section.nsl-sectie.nsl-open').count()));
    // Alle kruisjes zien er hetzelfde uit.
    await ctx.close();
    // Telefoon: het kaartje van een ruit op Toebehoren.
    ({ ctx, page } = await gevelOpen(GEVEL118, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
    await naarToebehoren(page);
    await tbR(page, 'A').locator('.tb-kort-knop').click(); await wacht(300);
    t = await tbR(page, 'A').locator('.tb-kort-knop').innerText();
    await tbR(page, 'A').locator('.tb-kort-knop').click(); await wacht(300);
    u = await tbR(page, 'A').evaluate(tr => tr.classList.contains('dicht'));
    check('telefoon: open kaartje heeft "✕ inklappen", en dat klapt hem dicht', /✕ inklappen/.test(t) && u, t + ' ' + u);
    await ctx.close();
  }

  /* ══ 7 ════════════════════════════════════════════════════════ */
  if (doe('7')) {
    console.log('\n7. Schermen: niets schuift opzij');
    for (const [naam, opt] of [['pc 1600', { viewport: { width: 1600, height: 900 } }], ['pc 1440', { viewport: { width: 1440, height: 900 } }],
                               ['laptop 1280', { viewport: { width: 1280, height: 800 } }],
                               ['ipad', { viewport: { width: 820, height: 1180 }, hasTouch: true }],
                               ['ipad liggend', { viewport: { width: 1180, height: 820 }, hasTouch: true }],
                               ['telefoon', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
      ({ ctx, page } = await gevelOpen(GEVEL118, opt));
      await naarToebehoren(page);
      m = await geenScroll(page);
      u = await page.evaluate(() => [...document.querySelectorAll('section.tb-groep')].map(s => {
        const a = s.querySelector('.tb-groep-in').getBoundingClientRect(), b = s.querySelector('table').getBoundingClientRect();
        return a.bottom <= b.top + 1;
      }));
      check(naam + ': Toebehoren past (tabellen en pagina), kop van de groep boven de tabel', m.tabel <= 1 && m.pagina <= 1 && u.every(Boolean), JSON.stringify([m, u]));
      if (/pc|laptop/.test(naam)) {
        // Een laptop en groter: een echte kopregel per tabel, en de kolommen van de tabellen onder elkaar.
        u = await page.evaluate(() => {
          const t = [...document.querySelectorAll('section.tb-groep table.tb-tabel')];
          const links = tab => [...tab.querySelectorAll('thead th')].filter(th => th.offsetWidth).map(th => Math.round(th.getBoundingClientRect().left));
          return { zicht: t.map(x => getComputedStyle(x.querySelector('thead')).display !== 'none' && x.querySelector('thead').offsetHeight > 0),
                   gelijk: JSON.stringify(links(t[0])) === JSON.stringify(links(t[1])), n: links(t[0]).length,
                   overloop: [...document.querySelectorAll('.tb-tabel td')].filter(td => td.offsetWidth && td.scrollWidth > td.offsetWidth + 1).length };
        });
        check(naam + ': elke tabel met kopregel, de kolommen van beide tabellen recht onder elkaar, niets steekt uit een vak',
          u.zicht.every(Boolean) && u.gelijk && u.n === 14 && u.overloop === 0, JSON.stringify(u));
      }
      if (naam === 'telefoon') {
        // Een kaartje open, met band buiten 5 mm (2+3): de langste keuzelijst.
        await tbR(page, 'A').locator('.tb-kort-knop').click(); await wacht(300);
        await tbR(page, 'A').locator('select[data-sleutel^="bandb-"]').selectOption('5'); await wacht(400);
        m = await geenScroll(page);
        check('telefoon: open kaartje met band 5 mm (2+3), niets schuift opzij', m.tabel <= 1 && m.pagina <= 1, JSON.stringify(m));
      }
      if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v118-toebehoren-' + naam.replace(' ', '') + '.png'), fullPage: true });
      await page.click('.tab-btn:has-text("Bestellijst")'); await wacht(400);
      m = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(naam + ': Bestellijst, de pagina schuift niet opzij', m <= 1, m);
      if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v118-bestellijst-' + naam.replace(' ', '') + '.png'), fullPage: true });
      await ctx.close();
    }
  }

  /* ══ 8 ════════════════════════════════════════════════════════ */
  if (doe('8')) {
    console.log('\n8. Versie');
    const lees = n => fs.readFileSync(path.join(map, n), 'utf8');
    const versies = [lees('index.html').match(/APP_VERSIE = 'v(\d+)'/), lees('pdf.js').match(/PDF_VERSIE = 'v(\d+)'/),
                     lees('sw.js').match(/const VERSIE = 'v(\d+)'/)].map(m => m ? +m[1] : 0);
    check('versie v118 of later, gelijk in index.html, pdf.js en sw.js', versies.every(v => v === versies[0] && v >= 118), JSON.stringify(versies));
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
