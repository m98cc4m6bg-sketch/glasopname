/* Testreeks v113 — node test-v113.js   (en: node test-v113.js --mutaties)

   Onderwerp: glaslatten (de typen van Jongeneel, met maat en foto), de
   sponningdiepte per ruit en "past het pakket in de sponning?", de neuslat,
   het glasband (buiten nooit 2 mm), één getal voor de lengtes op
   Toebehoren, en het uiterlijk zoals de offerte-app (kleuren, chips,
   lettertype).

   Echte situatie: Jan meet een renovatie in. Bij X (4-15-4) meet hij de
   sponning: te krap. Hij kijkt in het venster wat wel kan (andere lat,
   dunner band, uitfrezen). Bij een deur (4-13-5, sponning 27 mm) past
   alleen een opdeklat. Onderin komt een neuslat; welke maat rekent de app
   uit. Daarna telt Toebehoren de latten per soort, in lengtes van 4 m.

   Belofte (keuzes van Jan, 19-10-2026):
   - nodig = glas + band binnen + band buiten + lat in de sponning; tot 1 mm
     te krap of te ruim past nog, maar meldt "krap" of "ruim";
   - glaslat 17x15 = 15 mm in de sponning; A5 (met sponninkje) 12 mm;
     opdeklat 0 mm en zijn eigen sponning erbij; latten aan twee kanten =
     de lat twee keer;
   - neuslat: de kleinste die past (ruimte vóór het glas + 5 ≤ S), hij
     neemt niet zijn hele breedte in;
   - band buiten 3 of 4 mm, nooit 2; binnen 2, 3 of 4 (per ruit);
   - uitfrezen naar nodig − eigen sponning;
   - Toebehoren: groot getal = klein getal (incl. 10 % zaagverlies), tenzij
     het zaagplan er meer nodig heeft (dan staat dat erbij);
   - de bestellijst waarschuwt bij "past niet" en "te ruim", maar de
     leverancier ziet geen latten; de pdf invoer en de export wel;
   - op slot na een bestelling, wel te bekijken.

   Wat deze opstelling aanneemt: zoals test-v111/v112 (nagebootste database
   in node, echte Chromium, pdf teruggelezen met pdfplumber). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  marge: ["latten.js", "  var MARGE_MM = 1;", "  var MARGE_MM = 0;"],
  neusVrij: ["latten.js", "  var NEUS_VRIJ_MM = 5;", "  var NEUS_VRIJ_MM = 0;"],
  neusKleinste: ["latten.js", ".sort(function (a, b) { return a.eigenSponning - b.eigenSponning; });", ".sort(function (a, b) { return b.eigenSponning - a.eigenSponning; });"],
  neusTweeKanten: ["latten.js", "      (u.keer === 2 ? u.inSponning / 2 : 0)) * 100) / 100;", "      0) * 100) / 100;"],
  tweeKeer: ["latten.js", "zijde(r) === 'beide') ? 2 : 1;", "zijde(r) === 'beide') ? 1 : 1;"],
  opdekExtra: ["latten.js", "    var extra = (lat && lat.soort === 'opdek' ? getal(lat.eigenSponning) || 0 : 0) * keer;", "    var extra = 0;"],
  a5: ["latten.js", "hoogte: 17, inSponning: 12,", "hoogte: 17, inSponning: 15,"],
  uitfrezen: ["latten.js", "    var beschikbaar = (uitfrezen ? Math.max(diepte, uit.uitfrezenNaar) : diepte) + extra;", "    var beschikbaar = diepte + extra;"],
  adviesCombi: ["latten.js", "var x = pakket(r, { lat: l.id, bandBinnen: b });", "var x = pakket(r, { lat: l.id });"],
  oudeNamen: ["latten.js", "  var OUDE_NAMEN = { 'Glaslat': STANDAARD_LAT, 'Neuslat': 'NEUS', 'Ventilatielat': 'C1', 'B2': 'B1', 'GL13': 'B13' };", "  var OUDE_NAMEN = {};"],
  diepteGeldig: ["latten.js", "    return n > 0 && n < 200 ? Math.round(n * 10) / 10 : undefined;", "    return Math.round(n * 10) / 10;"],
  komma: ["latten.js", "    var t = String(waarde == null ? '' : waarde).trim().replace(',', '.');", "    var t = String(waarde == null ? '' : waarde).trim();"],
  kiezerTerug: ["latten.js", "      if (terug) pakketVenster(id);\n", ""],
  vakVrij: ["latten.js", "s.status.replace(' ', '-')) + ' vrij-bij-slot',", "s.status.replace(' ', '-')),"],
  opRuit: ["latten.js", "  function zetRw(id, veld, waarde) { if (window.toebehorenZetRuit) toebehorenZetRuit(id, veld, waarde); }",
           "  function zetRw(id, veld, waarde) { var r = getRij(id); if (waarde === '') delete r[veld]; else r[veld] = waarde; if (window.toebehorenZetRuit) toebehorenZetRuit(id, veld, waarde); }"],
  vakLaten: ["latten.js", "      if (vakLaten) {", "      if (0) {"],
  escGroot: ["latten.js", "    if (!grootWeg()) sluit();", "    sluit();"],
  passend: ["latten.js", "    var passend = e.sponningDiepte ? kiesbaar", "    var passend = 0 ? kiesbaar"],
  hoogte17: ["latten.js", "        !(u.glas > 8 && l.soort !== 'opdek' && l.hoogte < 17); })", "        true; })"],
  neusGlas: ["latten.js", "    if (rest < -MARGE_MM) return {", "    if (0) return {"],
  frezenNiets: ["latten.js", "    uit.frezen = uitfrezen && uit.uitfrezenNaar > diepte;", "    uit.frezen = uitfrezen;"],
  undoVenster: ["melding.js", "    return !!document.querySelector('.melding-laag, .lat-laag, .lat-groot');", "    return !!document.querySelector('.melding-laag');"],
  slotBulk: ["index.html", "  'bulkPasToe', 'bulkVerwijderSelectie',", "  'bulkVerwijderSelectie',"],
  bulkControle: ["bulk.js", "      if (fout) { if (window.appFout) appFout(fout, { kop: veld.titel }); return; }", ""],
  // v114: de onderlat bepaalt latten.js (onderlatVoorRuit); daar zit de omzetting van 'Glaslat'.
  oudGlaslatOnder: ["latten.js", "    var eigen = e.onderlat === 'Glaslat' ? '' : normaal(e.onderlat);", "    var eigen = normaal(e.onderlat);"],
  misStrook: ["toebehoren.js", "    if (mis.length) {", "    if (0) {"],
  onderPast: ["toebehoren.js", "      var pkOnder = oo && oo.onder && !ol.isNeus ? oo.onder : null;", "      var pkOnder = null;"],
  staven: ["toebehoren.js", "      var nodig = Math.max(metVerlies, plan.staven.length + plan.teLang.length);", "      var nodig = plan.staven.length + plan.teLang.length;"],
  bandPerRuit: ["toebehoren.js", "        if (kant === 'binnen' && [2, 3, 4].indexOf(+eigen.bandBinnen) >= 0) c =", "        if (0) c ="],
  buitenNooit2: ["toebehoren.js", "      if (kant === 'buiten' && BAND_DIKTES_BUITEN.indexOf(d) < 0) d = 3;", ""],
  neusMaat: ["toebehoren.js", "      var onder = ol.id, neus", "      var onder = ol.isNeus ? 'NEUS' : ol.id, neus"],
  onderEenKeer: ["toebehoren.js", "      lat(onder, sp.b + t, n, 'onder', n);", "      lat(onder, sp.b + t, n * dubbel, 'onder', n);"],
  latPerRuit: ["toebehoren.js", "      var boven = GL() ? GL().latVoorRuit(r).id : k.standaardLat;", "      var boven = GL() ? GL().normaal(k.standaardLat) : k.standaardLat;"],
  chipsMee: ["toebehoren.js", "    if (window.latPakketBijwerken) latPakketBijwerken();\n  }", "  }"],
  pakketControle: ["pdf.js", "      return k === 'door' ? pakketControle(bm) : k;", "      return k;"],
  pdfKolom: ["pdf.js", "      { kop: 'Spon.',     w: 11, haal: function (r) { return window.GlasLatten ? GlasLatten.ruit(r).sponningDiepte : ''; } },\n", ""],
  exportKolom: ["index.html", "      G ? getal(G.ruit(r).sponningDiepte) : '', lat ? lat.naam : '', pk,\n", "      '', '', '',\n"],
  accent: ["index.html", "    --accent: #c1121c;", "    --accent: #d00243;"],
  bulkDiepte: ["bulk.js", "          if (n !== undefined && window.toebehorenZetRuit) toebehorenZetRuit(r.id, 'sponningDiepte', n == null ? '' : n);", ""],
  swShell: ["sw.js", "  './latten.js',", "  './latten-x.js',"],
};
const WAAR = {
  marge: '1', neusVrij: '1', neusKleinste: '1', neusTweeKanten: '1', tweeKeer: '1', opdekExtra: '1', a5: '1', uitfrezen: '1',
  adviesCombi: '1', oudeNamen: '3', diepteGeldig: '2', komma: '2', kiezerTerug: '2', staven: '3', bandPerRuit: '3',
  buitenNooit2: '3', neusMaat: '3', onderEenKeer: '3', latPerRuit: '3', chipsMee: '3', pakketControle: '4', pdfKolom: '4',
  exportKolom: '4', accent: '5', bulkDiepte: '2', swShell: '5', vakVrij: '4', opRuit: '2', vakLaten: '2', escGroot: '2', passend: '2',
  hoogte17: '1', neusGlas: '1', frezenNiets: '1', undoVenster: '2', slotBulk: '4', bulkControle: '2', oudGlaslatOnder: '3', misStrook: '3',
  onderPast: '3',
};


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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v113-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v113-pdf-'));
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
// De rij van één ruit op Toebehoren. Niet met hasText: dat zoekt zonder
// hoofdletters, en sinds v113 staat "18x40" in de keuzelijst (x = X).
const tbRij = (page, merk) => page.locator('.tb-tabel tbody tr').filter({ has: page.locator('td:first-child', { hasText: new RegExp('^' + merk + '$') }) });
const tbTekst = page => page.$eval('#toebehorenInhoud', e => e.innerText.replace(/\s+/g, ' '));
async function naarToebehoren(page) {
  await page.click('.tab-btn:has-text("Toebehoren")');
  await wacht(300);
}

/* ─── hulp voor v113 ──────────────────────────────────────────── */
// Eén ruit ophalen zoals hij op het scherm staat.
const R = (page, merk) => page.evaluate(m => JSON.parse(JSON.stringify(rijen.find(r => r.merk === m) || {})), merk);
// Het oordeel van latten.js voor een ruit, met wat er anders mag.
const oordeel = (page, merk, anders) => page.evaluate(([m, a]) => {
  const r = rijen.find(x => x.merk === m);
  const u = GlasLatten.pakket(r, a || undefined);
  return { status: u.status, over: u.over, nodig: u.nodig, kort: GlasLatten.kort(u), tekst: u.tekst || '', uitfrezenNaar: u.uitfrezenNaar,
           beschikbaar: u.beschikbaar, maxGlas: u.maxGlas };
}, [merk, anders || null]);
// Waarden op de ruit zetten zonder het scherm (rekenregels los testen).
// v113: sponningdiepte, glaslat, band binnen en uitfrezen staan bij het
// project (info.toebehoren.perRuit), niet op de ruit; de rest wel.
const PER_RUIT = ['sponningDiepte', 'glaslat', 'bandBinnen', 'uitfrezen'];
const zet = (page, merk, velden) => page.evaluate(([m, v, pr]) => {
  const r = rijen.find(x => x.merk === m);
  Object.keys(v).forEach(k => {
    if (pr.indexOf(k) >= 0) toebehorenZetRuit(r.id, k, v[k] === null ? '' : v[k]);
    else if (v[k] === null) delete r[k]; else r[k] = v[k];
  });
  berekenGlasMaat(r); berekenDikte(r);
  return r.totaalDikte;
}, [merk, velden, PER_RUIT]);
// De keuzes per ruit zoals de app ze ziet (scherm) en zoals ze bewaard zijn (database).
const PR = (page, merk) => page.evaluate(m => JSON.parse(JSON.stringify(GlasLatten.ruit(rijen.find(r => r.merk === m)))), merk);
const chip = (page, merk) => page.evaluate(m => {
  const r = rijen.find(x => x.merk === m);
  const c = document.querySelector('#pk-' + r.id + ' .pk-chip');
  return c ? { tekst: c.textContent, klas: c.className } : null;
}, merk);
async function diepteTypen(page, merk, waarde) {
  const id = await page.evaluate(m => rijen.find(x => x.merk === m).id, merk);
  const vak = page.locator('#pk-' + id + ' .spon-input');
  await vak.click();
  await vak.fill(waarde);
  await vak.press('Tab');
  await wacht(250);
  return id;
}
// Een project met de glasdiktes die we nodig hebben:
// X 4-15-4 = 23 mm, Y ×2 (wienersprossen), D = deur met 4-13-5 = 22 mm.
function latProject(extra) {
  tbProject(p => {
    p.data.rijen.push(ruit(3, 'D', '800', '2000', Object.assign({ glasType: 'HR++ glas', opbouw: '4-13-5' }, INGEMETEN)));
    p.data.volgendId = 4;
    if (extra) extra(p);
  });
}

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, m, t, u;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Past het pakket in de sponning? (met de hand nagerekend)');
    latProject();
    ({ ctx, page } = await openProject());
    const dX = await zet(page, 'X', {});
    check('4-15-4 is 23 mm, 4-13-5 is 22 mm (de dikte die de app al rekent)', dX === 23 && await zet(page, 'D', {}) === 22, dX);
    // A4 (15 in de sponning) + 3 + 3 band + 23 glas = 44.
    const reeks = {};
    for (const d of [44, 45, 43, 42, 46]) { await zet(page, 'X', { sponningDiepte: d }); reeks[d] = (await oordeel(page, 'X')).kort; }
    check('X, A4, band 3+3: 44 past, 45 ruim +1, 43 krap −1, 42 past niet −2, 46 te ruim +2',
      reeks[44] === 'past' && reeks[45] === 'ruim +1' && reeks[43] === 'krap −1' && reeks[42] === 'past niet −2' && reeks[46] === 'te ruim +2',
      JSON.stringify(reeks));
    await zet(page, 'X', { sponningDiepte: 44 });
    u = await oordeel(page, 'X');
    check('de uitleg rekent het voor: "23 glas + 3 + 3 band + 15 lat (A4) = 44 mm; sponning 44 mm → past precies"',
      u.tekst === '23 glas + 3 + 3 band + 15 lat (A4) = 44 mm; sponning 44 mm → past precies', u.tekst);
    // A5 met sponninkje: 12 mm in de sponning (Jan) → 41.
    u = await oordeel(page, 'X', { lat: 'A5', sponningDiepte: 41 });
    check('A5 (glaslat met sponninkje) neemt 12 mm in: 23 + 6 + 12 = 41 past', u.status === 'past' && u.nodig === 41, JSON.stringify(u));
    // Uitfrezen: 40 → nodig 44, dus uitfrezen naar 44.
    u = await oordeel(page, 'X', { sponningDiepte: 40 });
    const uf = await oordeel(page, 'X', { sponningDiepte: 40, uitfrezen: true });
    check('sponning 40: past niet −4, uitfrezen naar 44; met uitfrezen aan: "past (frezen 44)"',
      u.kort === 'past niet −4' && u.uitfrezenNaar === 44 && uf.kort === 'past (frezen 44)', u.kort + ' / ' + uf.kort);
    u = await oordeel(page, 'X', { sponningDiepte: 47, uitfrezen: true });
    check('uitfrezen aan terwijl 47 al diep genoeg is: "te ruim +3" zonder "(frezen …)"', u.kort === 'te ruim +3', u.kort);
    // Te ruim: de lat ligt terug; geen latjes lager dan 17 mm bij dubbel glas.
    await zet(page, 'X', { sponningDiepte: 61 });
    m = await page.evaluate(() => GlasLatten.adviezen(rijen.find(x => x.merk === 'X')));
    u = await oordeel(page, 'X');
    check('sponning 61 met A4: "te ruim: 17 mm over, de lat ligt 17 mm terug"', /te ruim: 17 mm over, de lat ligt 17 mm terug/.test(u.tekst), u.tekst);
    check('het advies noemt geen A16 (15 hoog) of grenen latje (9 hoog), wel de breedste lat die erin past (B13, v114: was GL13; ligt 4 mm terug)',
      !m.some(a => /A16|G91/.test(a)) && m.some(a => /^Breedste lat die erin past: B13 .*\+ band binnen 4 mm: ligt 4 mm terug$/.test(a)), JSON.stringify(m));
    await zet(page, 'X', { sponningDiepte: 44 });
    // Band binnen per ruit.
    u = await oordeel(page, 'X', { sponningDiepte: 43, bandBinnen: 2 });
    check('band binnen 2 mm bij deze ruit: 43 past', u.kort === 'past', u.kort);
    // Jans deur: 27 mm sponning, 22 mm glas, 3 + 3 band.
    await zet(page, 'D', { sponningDiepte: 27 });
    const deur = {};
    for (const l of ['A4', 'E6', 'E7', 'GLD1']) deur[l] = (await oordeel(page, 'D', { lat: l })).kort;
    check('Jans deur (27 mm, 22 mm glas): met een glaslat past niet, vlakke opdeklat krap −1, E7 (3 mm eigen sponning) te ruim +2',
      deur.A4 === 'past niet −16' && deur.E6 === 'krap −1' && deur.E7 === 'te ruim +2' && deur.GLD1 === 'te ruim +6,5', JSON.stringify(deur));
    m = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'D'); toebehorenZetRuit(r.id, 'glaslat', 'GLD1'); const a = GlasLatten.adviezen(r);
      toebehorenZetRuit(r.id, 'glaslat', ''); return a; });
    check('het advies bij GLD1 (te ruim) noemt E7 met band binnen 4 mm: ruim +1',
      m.some(a => /^Lat E7 .* \+ band binnen 4 mm: ruim \+1$/.test(a)), JSON.stringify(m));
    // Gelaagd: 33.1 = 6,38 mm.
    // Gelaagd: de app neemt de dikte uit de glaslijst (33.1 → 6 mm, de folie
    // van 0,38 telt daar niet mee; dat valt binnen de marge van 1 mm).
    const gl = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'D'); const was = [r.glasType, r.opbouw];
      const typ = Object.keys(DATA.opbouw_per_type).find(tp => (DATA.opbouw_per_type[tp] || []).some(o => /^33\.1$/.test(o)));
      if (!typ) return null; r.glasType = typ; r.opbouw = '33.1'; berekenDikte(r); const d = r.totaalDikte;
      toebehorenZetRuit(r.id, 'sponningDiepte', 28); const u = GlasLatten.pakket(r); r.glasType = was[0]; r.opbouw = was[1]; berekenDikte(r); toebehorenZetRuit(r.id, 'sponningDiepte', 27);
      return [d, u.nodig, GlasLatten.kort(u)]; });
    check('gelaagd 33.1: de dikte uit de glaslijst (6) + 6 band + 15 lat = 27 → bij 28 "ruim +1"', !!gl && gl[0] === 6 && gl[1] === 27 &&
      gl[2] === 'ruim +1', JSON.stringify(gl));
    // Neuslat: de kleinste die past, en hij neemt niet zijn hele breedte in.
    const neus = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'X'); const uit = {};
      [25, 45, 50, 52, 80].forEach(d => { toebehorenZetRuit(r.id, 'sponningDiepte', d); const n = GlasLatten.neuslatVoor(r);
        uit[d] = { lat: n.lat ? n.lat.id : null, rest: n.rest, uitsteek: n.uitsteek, reden: n.reden }; });
      toebehorenZetRuit(r.id, 'sponningDiepte', 44); return uit; });
    check('neuslat: sponning 45 → ruimte vóór het glas 16 + 5 = 21 → N25; 50 → 26 → N30; 52 → 28 → N30; 80 → te breed (geen)',
      neus[45].lat === 'N25' && neus[45].rest === 16 && neus[50].lat === 'N30' && neus[52].lat === 'N30' && neus[80].lat === null, JSON.stringify(neus));
    check('sponning 25: het glas met band (29) past er al niet in → geen neuslat', neus[25].lat === null, JSON.stringify(neus[25]));
    // v114: de neus is volgens de tekening van Jongeneel 9 mm breed (was 15).
    check('een N30 bij sponning 50 steekt 30 − 21 + 9 = 18 mm voorbij het glas uit, niet 45',
      neus[50].uitsteek === 18, JSON.stringify(neus[50]));
    // Latten aan twee kanten (binnen en buiten): de lat telt twee keer.
    m = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'X'); toebehorenZetRuit(r.id, 'sponningDiepte', 59);
      const een = GlasLatten.pakket(r, { tweeKanten: false }), twee = GlasLatten.pakket(r, { tweeKanten: true });
      toebehorenZetRuit(r.id, 'sponningDiepte', 64); const n = GlasLatten.neuslatVoor(r); toebehorenZetRuit(r.id, 'sponningDiepte', 44);
      return [GlasLatten.kort(een), GlasLatten.kort(twee), twee.tekst, n.rest]; });
    check('latten aan twee kanten: 23 + 6 + 2 × 15 = 59 past (met één lat: te ruim +15)', m[0] === 'te ruim +15' && m[1] === 'past' &&
      /2 × 15 lat \(A4, twee kanten\)/.test(m[2]), JSON.stringify(m));
    await page.evaluate(() => { toebehorenTweeKanten(rijen.find(x => x.merk === 'X').id, true); toebehorenZetRuit(rijen.find(x => x.merk === 'X').id, 'sponningDiepte', 64); });
    m = await page.evaluate(() => { const n = GlasLatten.neuslatVoor(rijen.find(x => x.merk === 'X')); return [n.rest, n.lat && n.lat.id]; });
    check('en onderin aan de 2e kant zit een gewone lat: sponning 64 − 29 − 15 = 20 vóór het glas → N25', m[0] === 20 && m[1] === 'N25', JSON.stringify(m));
    await page.evaluate(() => { toebehorenTweeKanten(rijen.find(x => x.merk === 'X').id, false); toebehorenZetRuit(rijen.find(x => x.merk === 'X').id, 'sponningDiepte', 44); });
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Op Invoer: sponningdiepte typen, glaslat kiezen met foto, het venster per ruit');
    latProject();
    // Een foto voor A4 (de rest heeft er nog geen: dan de tekening).
    fs.mkdirSync(path.join(map, 'latten'), { recursive: true });
    fs.copyFileSync(path.join(__dirname, 'test-gevel.jpg'), path.join(map, 'latten', 'A4.jpg'));
    ({ ctx, page } = await openProject());
    const koppen = await page.$$eval('#invoerTabel thead tr:last-child th', l => l.map(th => th.childNodes[0] && th.childNodes[0].textContent.trim()));
    check('de kolommen Diepte en Glaslat staan na de glasspecificatie, onder "Sponning"', koppen.indexOf('Diepte') > 0 &&
      koppen.indexOf('Glaslat') === koppen.indexOf('Diepte') + 1 && await page.$('#invoerTabel th.groep-spon') !== null, JSON.stringify(koppen));
    // Alleen wat zichtbaar is: zonder rooster in het project zijn Duco, RAL en Bediening verborgen.
    const cellen = await page.$$eval('#invoerBody tr', l => l.map(tr => Array.from(tr.querySelectorAll('td'))
      .filter(td => getComputedStyle(td).display !== 'none').reduce((n, td) => n + td.colSpan, 0)));
    const kolommen = await page.$$eval('#invoerTabel thead tr:first-child th', l => l.filter(th => getComputedStyle(th).display !== 'none')
      .reduce((n, th) => n + th.colSpan, 0));
    check('elke rij heeft net zoveel cellen als koppen', cellen.length >= 3 && cellen.every(n => n === kolommen), JSON.stringify([kolommen, cellen]));
    let ch = await chip(page, 'X');
    check('zonder sponningdiepte: een grijs "?"', ch && ch.tekst === '?' && /pk-leeg/.test(ch.klas), JSON.stringify(ch));
    await diepteTypen(page, 'X', '43');
    ch = await chip(page, 'X');
    check('43 typen: "krap −1" in oranje', ch && ch.tekst === 'krap −1' && /pk-krap/.test(ch.klas), JSON.stringify(ch));
    await page.evaluate(() => ongedaan());
    await wacht(300);
    check('ongedaan maken na het typen in de tabel: de diepte is weer leeg (een eigen stap)', !('sponningDiepte' in (await PR(page, 'X'))) &&
      (await chip(page, 'X')).tekst === '?', JSON.stringify(await PR(page, 'X')));
    // Typen en meteen op het oordeel tikken (zonder Tab): het venster komt in één keer.
    {
      const vak = page.locator('#pk-' + idVan('X') + ' .spon-input');
      await vak.click(); await vak.fill('43');
      await page.click('#pk-' + idVan('X') + ' .pk-chip');
      check('typen en meteen op het oordeel tikken: het venster opent in één keer', await page.waitForSelector('.lat-venster', { timeout: 1500 })
        .then(() => true, () => false));
      await page.keyboard.press('Escape');
    }
    check('bewaard bij het project (perRuit), niet op de ruit: geen nieuw stempel', await opgeslagenAls(() => perRuitDb('X').sponningDiepte === 43) &&
      !('sponningDiepte' in dbRij('X')) && dbRij('X').gewOp === INGEMETEN.gewOp, JSON.stringify([info().toebehoren, dbRij('X').gewOp]));
    await diepteTypen(page, 'X', '44,5');
    check('een komma: "44,5" wordt 44,5 → "ruim +0,5"', (await PR(page, 'X')).sponningDiepte === 44.5 && (await chip(page, 'X')).tekst === 'ruim +0,5');
    await diepteTypen(page, 'X', 'abc');
    m = (await meldingen(page)).join(' | ');
    check('"abc": een melding, en de diepte blijft 44,5', /geen sponningdiepte/.test(m) && (await PR(page, 'X')).sponningDiepte === 44.5, m.slice(0, 200));
    await sluitMeldingen(page);
    // Het venster per ruit.
    await page.click('#pk-' + idVan('X') + ' .pk-chip');
    await page.waitForSelector('.lat-venster .pakket-svg', { timeout: 3000 });
    t = await page.$eval('.lat-venster', e => e.innerText.replace(/\s+/g, ' '));
    check('het venster: tekening met namen, de uitleg, sponningdiepte, glaslat, band binnen; geen uitfrezen als het al past',
      /ruim: 0,5 mm over/.test(t) && /aanslag/.test(t) && await page.$('.lat-venster .pk-diepte') !== null &&
      await page.$('.lat-venster .pk-band') !== null && await page.$('.lat-venster .pk-uitfrezen') === null && /nooit 2 mm/.test(t), t.slice(0, 300));
    await page.fill('.lat-venster .pk-diepte', '40');
    await page.dispatchEvent('.lat-venster .pk-diepte', 'change');
    await wacht(250);
    t = await page.$eval('.lat-venster', e => e.innerText.replace(/\s+/g, ' '));
    check('40 in het venster: "past niet: 4 mm te weinig", advies met uitfrezen naar 44 mm', /past niet: 4 mm te weinig/.test(t) &&
      /Zo past het wel:/.test(t) && /Sponning uitfrezen naar 44 mm \(4 mm dieper\)/.test(t), t.slice(0, 600));
    check('de chip in de tabel loopt mee (rood)', /pk-past-niet/.test((await chip(page, 'X')).klas));
    const vak = await page.$eval('#pk-' + idVan('X') + ' .spon-input', e => Math.round(e.getBoundingClientRect().width));
    check('het vak voor de diepte blijft 46 px breed naast "past niet −4" (krimpt niet weg)', vak >= 44, vak);
    await page.check('.lat-venster .pk-uitfrezen');
    await wacht(250);
    check('uitfrezen aan: "past (frezen 44)", bewaard als uitfrezen: true', (await chip(page, 'X')).tekst === 'past (frezen 44)' &&
      await opgeslagenAls(() => perRuitDb('X').uitfrezen === true), JSON.stringify(await chip(page, 'X')));
    await page.keyboard.press('Control+z');
    await wacht(300);
    check('Ctrl+Z terwijl het venster open is: er wordt niets teruggedraaid onder het venster', (await PR(page, 'X')).uitfrezen === true,
      JSON.stringify(await PR(page, 'X')));
    await page.uncheck('.lat-venster .pk-uitfrezen');
    await page.selectOption('.lat-venster .pk-band', '2');
    await wacht(250);
    check('band binnen 2 mm bij deze ruit: bewaard (bandBinnen 2)', await opgeslagenAls(() => perRuitDb('X').bandBinnen === 2 && !perRuitDb('X').uitfrezen));
    // Glaslat kiezen vanuit het venster: de kiezer, daarna terug in het venster.
    await page.click('.lat-venster .pk-lat');
    await page.waitForSelector('.lat-venster .lat-item[data-kies="A12"]', { timeout: 3000 });
    m = await page.$$eval('.lat-venster .lat-groep h4', l => l.map(h => h.textContent));
    const eerst = await page.$$eval('.lat-venster .lat-passend .lat-item', l => l.map(e => e.getAttribute('data-kies')));
    check('de kiezer: bovenaan "Past bij deze ruit" (bij 40 mm met band 2: A5), daarna glaslat en opdeklat',
      JSON.stringify(m) === '["Past bij deze ruit","Glaslat","Opdeklat"]' && JSON.stringify(eerst) === '["A5"]', JSON.stringify([m, eerst]));
    m = await page.evaluate(() => ({ foto: !!document.querySelector('.lat-venster .lat-item[data-kies="A4"] .lat-plaatje.met-foto img'),
      teken: !!document.querySelector('.lat-venster .lat-item[data-kies="A12"] .lat-plaatje svg') &&
             !document.querySelector('.lat-venster .lat-item[data-kies="A12"] .lat-plaatje img') }));
    check('A4 met foto, A12 zonder foto: de tekening van het profiel', m.foto && m.teken, JSON.stringify(m));
    m = await page.$eval('.lat-venster .lat-item[data-kies="A12"]', e => e.innerText.replace(/\s+/g, ' '));
    check('per lat de maat, hoeveel hij in de sponning inneemt, en of hij past (A12 bij 40: past niet)', /A12 17x26/.test(m) &&
      /26 mm in de sponning/.test(m) && /past niet/.test(m), m);
    await page.click('.lat-venster .lat-item[data-kies="A4"] .lat-plaatje');
    await page.waitForSelector('.lat-groot', { timeout: 2000 });
    t = await page.$eval('.lat-groot', e => e.innerText.replace(/\s+/g, ' '));
    check('tik op de foto: groot, met naam, hout, lengte en artikelnummer', /A4 glaslat schuin 17x15/.test(t) && /Meranti, 4 m/.test(t) &&
      /B7601017015400\.FVG/.test(t) && await page.$('.lat-venster') !== null, t);
    await page.click('.lat-groot');
    check('en weer weg met een tik; de kiezer staat er nog', await page.$('.lat-groot') === null && await page.$('.lat-venster .lat-item') !== null);
    await page.click('.lat-venster .lat-item[data-kies="A12"] .lat-plaatje');
    await page.waitForSelector('.lat-groot', { timeout: 2000 });
    await page.keyboard.press('Escape');
    check('Escape bij de grote foto: eerst alleen de foto weg, de kiezer blijft', await page.$('.lat-groot') === null &&
      await page.$('.lat-venster .lat-item') !== null);
    await page.click('.lat-venster .lat-item[data-kies="E7"]');
    check('na het kiezen terug in het pakketvenster', await page.waitForSelector('.lat-venster .pakket-svg', { timeout: 3000 }).then(() => true, () => false));
    t = await page.$eval('.lat-venster', e => e.innerText.replace(/\s+/g, ' '));
    // v114: de maten van E7 zijn nagemeten (tekening Jongeneel): geen "nog niet nagemeten" meer.
    check('E7 gekozen: terug in het venster, met de opdeklat in de som en "het glas klemt niet"', /opdeklat E7/.test(t) &&
      /het glas klemt niet/.test(t) && !/nog niet nagemeten/.test(t), t.slice(0, 500));
    check('bewaard (glaslat E7), de knop in de tabel zegt E7', await opgeslagenAls(() => perRuitDb('X').glaslat === 'E7') &&
      await page.$eval('#lat-' + idVan('X') + ' .lat-knop', e => e.textContent) === 'E7');
    await page.keyboard.press('Escape');
    check('Escape sluit het venster', await page.$('.lat-laag') === null);
    // Ongedaan maken.
    await page.evaluate(() => ongedaan());
    await wacht(300);
    check('ongedaan maken: de glaslat is weer de projectstandaard', !('glaslat' in (await PR(page, 'X'))) &&
      /std/.test(await page.$eval('#lat-' + idVan('X') + ' .lat-knop', e => e.textContent)), JSON.stringify(await PR(page, 'X')));
    // Rechtstreeks via de knop in de tabel: Projectstandaard terug.
    await page.click('#lat-' + idVan('Y') + ' .lat-knop');
    await page.click('.lat-venster .lat-item[data-kies="B5"]');
    await wacht(250);
    check('Y: B5 gekozen via de knop in de tabel; het venster is dicht', (await PR(page, 'Y')).glaslat === 'B5' && await page.$('.lat-laag') === null);
    await page.click('#lat-' + idVan('Y') + ' .lat-knop');
    await page.click('.lat-venster .lat-item[data-kies=""]');
    await wacht(250);
    check('en weer "Projectstandaard"', !('glaslat' in (await PR(page, 'Y'))));
    // Doorvoeren (bulk) van Diepte en Glaslat.
    await page.click('#invoerTabel th.kol-spon .bulk-vul');
    await page.fill('#bulkVeld', '50');
    await page.click('button:has-text("Doorvoeren")');
    await wacht(300);
    m = await page.evaluate(() => rijen.map(r => GlasLatten.ruit(r).sponningDiepte));
    check('doorvoeren: sponningdiepte 50 op alle ruiten', m.every(d => d === 50), JSON.stringify(m));
    // v114: de controle bij doorvoeren (stond tot v113 in het slot-blok, dat nu weigert).
    await page.click('#invoerTabel th.kol-spon .bulk-vul');
    await page.fill('#bulkVeld', 'abc');
    await page.click('button:has-text("Doorvoeren")');
    await wacht(300);
    m = (await meldingen(page)).join(' | ');
    check('doorvoeren "abc": een melding, en er verandert niets (blijft 50)', /geen sponningdiepte/.test(m) &&
      await page.evaluate(() => rijen.every(r => GlasLatten.ruit(r).sponningDiepte === 50)), m.slice(0, 150));
    await sluitMeldingen(page);
    await page.evaluate(() => window.bulkAnnuleer && bulkAnnuleer());
    await page.click('#invoerTabel th.kol-lat .bulk-vul');
    await page.selectOption('#bulkVeld', 'A12');
    await page.click('button:has-text("Doorvoeren")');
    await wacht(300);
    m = await page.evaluate(() => rijen.map(r => GlasLatten.ruit(r).glaslat));
    check('doorvoeren: glaslat A12 op alle ruiten (de keuzelijst kent geen neuslat)', m.every(d => d === 'A12') &&
      true, JSON.stringify(m));
    if (PLAATJES) {
      await page.screenshot({ path: path.join(PLAATJES, 'v113-invoer.png'), fullPage: false });
      await page.click('#pk-' + idVan('D') + ' .pk-chip'); await wacht(300);
      await page.screenshot({ path: path.join(PLAATJES, 'v113-venster.png') });
      await page.click('.lat-venster .pk-lat'); await wacht(300);
      await page.screenshot({ path: path.join(PLAATJES, 'v113-kiezer.png') });
      await page.keyboard.press('Escape');
    }
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Toebehoren: één waarheid, de lat per ruit, neuslat, band, oude namen');
    // 4 latten van 980 mm: met zaagsnede 4 × 985 = 3940, dus in één lengte van 4 m (zaagplan 1). Maar
    // met 10 % zaagverlies is het 4,31 m → 2 lengtes. Dat is het getal (Jan: "er is maar één waarheid").
    latProject(p => { p.data.rijen = [ruit(1, 'K', '960', '960', Object.assign({ aantal: 1 }, KOMPLEET, INGEMETEN))]; p.data.volgendId = 2;
      p.data.info.toebehoren = { standaardOnderlat: '' }; });
    ({ ctx, page } = await openProject());
    await naarToebehoren(page);
    u = await page.evaluate(() => JSON.parse(JSON.stringify(toebehorenBerekenen().latten)));
    t = await tbTekst(page);
    const groot = (t.match(/(\d+) × 4,0 m A4 glaslat/) || [])[1], klein = (t.match(/÷ 4,0 m → (\d+) lengtes?/) || [])[1];
    check('4 latten van 0,98 m (3,92 m + 10 % = 4,31 m): zaagplan 1, maar groot getal = klein getal = 2', u[0].zaagplanStaven === 1 &&
      u[0].staven === 2 && groot === '2' && klein === '2',
      JSON.stringify([u[0].staven, u[0].zaagplanStaven, groot, klein]));
    await ctx.close();
    // En andersom: lange latten, het zaagplan heeft er meer nodig dan 10 % zegt.
    latProject(p => { p.data.rijen = [ruit(1, 'L', '2080', '2080', Object.assign({ aantal: 1 }, KOMPLEET, INGEMETEN))]; p.data.volgendId = 2;
      p.data.info.toebehoren = { standaardOnderlat: '' }; });
    ({ ctx, page } = await openProject());
    await naarToebehoren(page);
    u = await page.evaluate(() => JSON.parse(JSON.stringify(toebehorenBerekenen().latten)));
    t = await tbTekst(page);
    check('4 latten van 2,1 m: 10 % zegt 3, het zaagplan 4 (er past er maar één per lengte) → overal 4, met uitleg',
      u[0].metVerlies === 3 && u[0].staven === 4 && /^4 × 4,0 m A4/.test((t.match(/\d+ × 4,0 m A4.*/) || [''])[0]) &&
      /→ 3 lengtes; maar de latten zijn lang: volgens het zaagplan zijn er 4 nodig/.test(t), JSON.stringify(u[0]).slice(0, 200));
    await ctx.close();

    // Lat per ruit, neuslat automatisch, band per ruit.
    latProject(p => {
      p.data.info.toebehoren = { perRuit: {
        // v114: latten buiten (onderin de neuslat); er is geen standaardzijde meer.
        1: { sponningDiepte: 50, latZijde: 'buiten' },                  // X: rest 21 → N30
        2: { glaslat: 'B5', sponningDiepte: 48, bandBinnen: 2, latZijde: 'buiten' },   // Y ×2
        3: { sponningDiepte: 40, latZijde: 'buiten' } } };              // D: 22 glas, rest 12 → N25
    });
    ({ ctx, page } = await openProject());
    await naarToebehoren(page);
    u = await page.evaluate(() => JSON.parse(JSON.stringify(toebehorenBerekenen())));
    const types = u.latten.map(l => l.type).sort();
    check('latten per soort: A4 (X, D), B5 (Y), N30 (onder X), N25 (onder D) en N30/N25 voor Y', JSON.stringify(types) ===
      JSON.stringify(['A4', 'B5', 'N25', 'N30'].filter(x => types.indexOf(x) >= 0).sort()) && types.indexOf('B5') >= 0 &&
      types.indexOf('N30') >= 0 && types.indexOf('N25') >= 0 && types.indexOf('NEUS') < 0, JSON.stringify(types));
    const yRij = u.perRuit.find(p => p.rij.merk === 'Y');
    check('Y: lat B5, onderlat de passende neuslat (48 − 23 − 2 − 3 = 20 → N25)', yRij.lat === 'B5' && yRij.onderlat === 'N25', JSON.stringify(yRij).slice(0, 200));
    check('band: Y heeft binnen 2 mm, de rest 3 mm', u.band.some(b => b.dikte === 2 && b.kleur === 'wit') && u.band.some(b => b.dikte === 3),
      JSON.stringify(u.band));
    t = await tbTekst(page);
    check('bovenaan: "Bij 2 ruiten past het niet goed in de sponning: X, D" (X te ruim +6, D past niet −3)',
      /Bij 2 ruiten past het niet goed in de sponning: X, D\./.test(t), (t.match(/Bij \d+ ruit.{0,80}/) || [''])[0]);
    check('in de tabel per ruit het oordeel bij de lat (X: te ruim +6)', /te ruim \+6/.test(await tbRij(page, 'X').locator('td.tb-lat').innerText()));
    // v114: de kolom Latten (zijde) met een keuzelijst, in plaats van de vink "twee kanten".
    check('de tabel per ruit: kolom Latten (zijde, X: buiten), kolom Lat, neuslat met maat',
      await tbRij(page, 'X').locator('select.tb-zijde-sel').inputValue() === 'buiten' && await page.$('.tb-tabel th:has-text("Lat")') !== null &&
      /N30/.test(await tbRij(page, 'X').innerText()), (await tbRij(page, 'X').innerText()).replace(/\s+/g, ' '));
    // Standaardlat van het project → de chips op Invoer lopen mee (zonder het tabblad te wisselen).
    await page.click('.tb-inst-kop'); await wacht(200);
    await page.selectOption('select[onchange*="standaardLat"]', 'A12');
    await wacht(300);
    m = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'X'); const c = document.querySelector('#pk-' + r.id + ' .pk-chip');
      return [projectInfo.toebehoren.standaardLat, c && c.textContent]; });
    check('standaardlat A12: X (50 mm) wordt 23 + 6 + 26 = 55 → "past niet −5", ook in de tabel op Invoer', m[0] === 'A12' && m[1] === 'past niet −5',
      JSON.stringify(m));
    // Band buiten: nooit 2.
    m = await page.$$eval('select[onchange*="buiten.dikte"] option', l => l.map(o => o.value));
    const mb = await page.$$eval('select[onchange*="binnen.dikte"] option', l => l.map(o => o.value));
    await page.evaluate(() => toebehorenKeuze('buiten.dikte', '2'));
    check('band buiten: alleen 3 en 4 te kiezen (binnen 2, 3, 4); "2" wordt geweigerd', JSON.stringify(m) === '["3","4"]' &&
      JSON.stringify(mb) === '["2","3","4"]' && await page.evaluate(() => GlasLatten.project().bandBuiten) === 3,
      JSON.stringify([m, mb]));
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v113-toebehoren.png'), fullPage: true });
    await ctx.close();

    // Een project van v111/v112 met de oude namen.
    latProject(p => { p.data.info.toebehoren = { standaardLat: 'Glaslat', standaardOnderlat: 'Neuslat', buiten: { kleur: 'wit', dikte: 2 },
      perRuit: { [p.data.rijen[1].id]: { onderlat: 'Ventilatielat' } } }; });
    ({ ctx, page } = await openProject());
    await naarToebehoren(page);
    u = await page.evaluate(() => JSON.parse(JSON.stringify(toebehorenBerekenen())));
    m = await page.evaluate(() => GlasLatten.project());
    // v114 (keuze Jan): geen standaardzijde en geen standaard onderlat meer. De
    // oude "Neuslat" voor het hele project telt niet: zonder zijde onderin dezelfde lat.
    check('oude namen (v111): Glaslat → A4, Ventilatielat → C1, een oude 2 mm buiten telt als 3 (de oude standaard Neuslat geldt niet meer)',
      JSON.stringify(u.latten.map(l => l.type).sort()) === '["A4","C1"]' && m.lat === 'A4' && m.bandBuiten === 3 &&
      u.band.every(b => b.dikte === 3), JSON.stringify([u.latten.map(l => l.type), m, u.band]));
    check('en er is niets in het project veranderd door alleen te kijken', JSON.stringify(info().toebehoren.perRuit) ===
      JSON.stringify({ [idVan('Y')]: { onderlat: 'Ventilatielat' } }), JSON.stringify(info().toebehoren));
    // Y met diepte 45: A4 boven past (+1), de ventilatielat C1 (26 mm) onderin niet.
    await page.evaluate(() => { toebehorenZetRuit(rijen.find(x => x.merk === 'Y').id, 'sponningDiepte', 45); renderToebehoren(); });
    t = await tbRij(page, 'Y').locator('td.tb-breed').innerText();
    check('onderlat C1 bij 45 mm: "onderin: past niet −10" (de lat onderin wordt apart beoordeeld)', /onderin: past niet −10/.test(t), t);
    await page.evaluate(() => { toebehorenZetRuit(rijen.find(x => x.merk === 'Y').id, 'sponningDiepte', ''); });
    // Een oude onderlat "Glaslat" (v111: dezelfde als boven) volgt de lat van boven, ook als die nu anders is.
    m = await page.evaluate(() => { const was = JSON.stringify(projectInfo.toebehoren);
      projectInfo.toebehoren = { standaardLat: 'Glaslat', standaardOnderlat: 'Glaslat', perRuit: { [rijen[0].id]: { glaslat: 'B5', onderlat: 'Glaslat' } } };
      const x = toebehorenBerekenen(); projectInfo.toebehoren = JSON.parse(was);
      return x.perRuit.map(p => p.rij.merk + ':' + p.lat + '/' + p.onderlat); });
    check('oude onderlat "Glaslat" = dezelfde lat als boven (X met B5: onder ook B5, de rest A4)', JSON.stringify(m) === '["X:B5/B5","Y:A4/A4","D:A4/A4"]',
      JSON.stringify(m));
    // Twee kanten: één neuslat, onderin aan de andere kant de gewone lat.
    // v114: X latten "beide", D "buiten" (de neuslat onder D).
    await tbRij(page, 'X').locator('select.tb-zijde-sel').selectOption('beide');
    await wacht(300);
    await tbRij(page, 'D').locator('select.tb-zijde-sel').selectOption('buiten');
    await wacht(300);
    u = await page.evaluate(() => JSON.parse(JSON.stringify(toebehorenBerekenen().latten.map(l => [l.type, l.stukken, l.totaalMm, l.rol]))));
    const a4 = u.find(l => l[0] === 'A4'), ns = u.find(l => l[0] === 'NEUS');
    // A4: X 2 × (1020 + 2 × 2020) + 1020 onder 2e kant; D 820 + 2 × 2020; Y 2 × (920 + 2 × 1520). NEUS: X 1020, D 820.
    check('X latten aan twee kanten: A4 krijgt onderin de 2e kant erbij, de neuslat blijft één (X 1020 + D 820)',
      ns && ns[2] === 1840 && ns[1] === 2 && a4 && a4[2] === 2 * 5060 + 1020 + 4860 + 2 * 3960 && /onder aan de 2e kant/.test(a4[3]),
      JSON.stringify(u));
    await ctx.close();

    // Telefoon: de tabel per ruit is compact.
    latProject();
    const tc = await nieuweContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const tp = await nieuwePagina(tc);
    await open(tp, 1);
    await naarToebehoren(tp);
    const breed = await tp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    const tabel = await tp.$eval('.tb-tabel', e => [Math.round(e.getBoundingClientRect().width), e.closest('.invoer-wrap').clientWidth,
      Math.round(e.querySelector('tbody tr').getBoundingClientRect().height), e.querySelector('thead').offsetHeight,
      Math.round(e.querySelector('select.tb-onderlat').getBoundingClientRect().right)]);
    check('telefoon (390): per ruit een kaartje (geen koprij), alles binnen beeld, niet hoger dan 150 px',
      breed[0] <= 390 && tabel[0] <= tabel[1] && tabel[3] === 0 && tabel[2] <= 150 && tabel[4] <= 380, JSON.stringify([breed, tabel]));
    // v114: dicht één regel; tik erop voor de rest (de zijde, onderlat, getallen).
    await tbRij(tp, 'Y').locator('.tb-kort-knop').click(); await wacht(300);
    t = await tbRij(tp, 'Y').innerText();
    check('het kaartje van Y (open getikt): "Y ×2", de maat, de lat, de onderlat, de latzijde en de getallen met kopje',
      await tbRij(tp, 'Y').locator('td.tb-merk').getAttribute('data-aant') === '×2' && /900 × 1\.500/.test(t) && /A4/.test(t) &&
      await tbRij(tp, 'Y').locator('select.tb-zijde-sel').isVisible() &&
      await tbRij(tp, 'Y').locator('td.tb-num').first().evaluate(e => getComputedStyle(e, '::before').content) === '"Latten m"' &&
      await tbRij(tp, 'Y').locator('td.tb-aant').evaluate(e => getComputedStyle(e).display) === 'none',
      t.replace(/\s+/g, ' '));
    if (PLAATJES) await tp.screenshot({ path: path.join(PLAATJES, 'v113-telefoon-toebehoren.png'), fullPage: true });
    await tp.click('.tab-btn:has-text("Invoer")'); await wacht(300);
    const iv = await tp.evaluate(() => [document.documentElement.scrollWidth]);
    check('telefoon: Invoer met de twee nieuwe kolommen schuift ook niet opzij (de tabel schuift in zijn vak)', iv[0] <= 390, JSON.stringify(iv));
    await tp.click('#pk-' + idVan('X') + ' .pk-chip'); await wacht(300);
    const v = await tp.$eval('.lat-venster', e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right), Math.round(b.height)]; });
    check('telefoon: het venster past op het scherm', v[0] >= 0 && v[1] <= 390 && v[2] <= 844, JSON.stringify(v));
    if (PLAATJES) await tp.screenshot({ path: path.join(PLAATJES, 'v113-telefoon-venster.png') });
    await tc.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Bestellijst, PDF invoer, export, slot');
    latProject(p => { p.data.info.toebehoren = { perRuit: { 1: { sponningDiepte: 40 }, 2: { sponningDiepte: 45 } } }; });   // X past niet −4, Y ruim +1
    ({ ctx, page } = await openProject());
    let pb = await bestellijstPdf(page, Object.assign({ 'Past het in de sponning?': 'Stoppen' }, ONVOLLEDIG));
    check('bestellijst: eerst de vraag "Past het in de sponning?" met X (past niet −4); Stoppen = geen pdf',
      gevraagd.indexOf('Past het in de sponning?') >= 0 && pb === null, JSON.stringify(gevraagd));
    pb = await bestellijstPdf(page, Object.assign({ 'Past het in de sponning?': 'Toch doorgaan' }, ONVOLLEDIG));
    await vraagOpScherm(page);
    await knop(page, 'Nee, alleen bekeken');
    t = plat(pdfTekst(pb));
    check('Toch doorgaan: de pdf komt; de leverancier ziet geen sponning of glaslat', !!pb && !/Spon\./.test(t) && !/Lat\/pakket/.test(t) &&
      !/A4/.test(t), t.slice(0, 300));
    await sluitMeldingen(page);
    m = await page.evaluate(() => glasPakketScheef().map(x => x.rij.merk));
    check('Y (ruim +1) en D (geen diepte) worden niet genoemd', JSON.stringify(m) === '["X"]', JSON.stringify(m));
    const pi = await bestellijstPdf(page, ONVOLLEDIG, 'PDF invoer');
    t = plat(pdfTekst(pi));
    check('PDF invoer (eigen archief): kolommen Spon. en Lat/pakket, "A4: past niet -4" en "A4: ruim +1"', /Spon\./.test(t) &&
      /Lat\/pakket/.test(t) && /A4: past niet -4/.test(t) && /A4: ruim \+1/.test(t), (t.match(/Spon\..{0,200}/) || [''])[0]);
    m = await page.evaluate(() => { const x = exportTabel(); const i = x.koppen.indexOf('Sponningdiepte (mm)');
      return [x.koppen.slice(i, i + 3), x.regels.map(r => r.slice(i))]; });   // v114: daarachter nog zijde, onderdorpel, bi-color
    check('export (xlsx/csv): achteraan Sponningdiepte, Glaslat en Pakket', JSON.stringify(m[0]) === '["Sponningdiepte (mm)","Glaslat","Pakket"]' &&
      m[1][0][0] === 40 && m[1][0][1] === 'A4 glaslat schuin 17x15' && /past niet: 4 mm te weinig/.test(m[1][0][2]) && m[1][2][0] === '',
      JSON.stringify(m).slice(0, 400));
    if (PLAATJES) fs.copyFileSync(pi, path.join(PLAATJES, 'v113-pdf-invoer.pdf'));
    // Besteld → op slot. v114 (keuze Jan: "Mee op slot", was in v113 vrij):
    // sponning, glaslat, band, uitfrezen en latzijde staan dan vast, net als de maten.
    await page.evaluate(() => { delete projectInfo.toebehoren; renderTabel(); opslaan(); });
    await wacht(500);
    await eersteBestelling(page);
    check('besteld en op slot', await opSlot(page));
    const vX = JSON.stringify(dbRij('X'));
    m = await page.evaluate(() => { const id = rijen.find(x => x.merk === 'X').id;
      return [document.querySelector('#pk-' + id + ' .spon-input').disabled, document.querySelector('#pk-' + id + ' .pk-chip').disabled,
              document.querySelector('#lat-' + id + ' .lat-knop').disabled, document.querySelector('#zijde-' + id + ' select').disabled,
              document.querySelector('#rij-' + id + ' select').disabled]; });
    check('op slot (v114): ook het vak, de latknop en de latzijde staan uit; het oordeel is wel te openen',
      m[0] && !m[1] && m[2] && m[3] && m[4], JSON.stringify(m));
    await page.evaluate(() => { const id = rijen.find(x => x.merk === 'X').id;
      latDiepte(id, '40'); latKies(id, 'B5'); latBand(id, '2'); latZijde(id, 'buiten'); latUitfrezen(id, true); latOnderDiepte(id, '30'); });
    await wacht(500);
    const slotMelding = (await meldingen(page)).join(' | ');
    check('en de functies weigeren: niets bewaard, de ruit zelf niet veranderd', JSON.stringify(perRuitDb('X')) === '{}' &&
      JSON.stringify(dbRij('X')) === vX, JSON.stringify([perRuitDb('X'), dbRij('X').gewOp]));
    check('met de melding "Op slot"', /besteld/.test(slotMelding), slotMelding.slice(0, 150));
    await sluitMeldingen(page);
    await page.click('#pk-' + idVan('X') + ' .pk-chip');
    await page.waitForSelector('.lat-venster', { timeout: 2000 });
    m = await page.$$eval('.lat-venster input, .lat-venster select, .lat-venster .pk-lat', l => l.map(e => e.disabled));
    check('op slot: het venster is te bekijken, maar alles staat uit', m.length >= 3 && m.every(Boolean), JSON.stringify(m));
    await page.keyboard.press('Escape');
    await wacht(200);
    // Doorvoeren op slot: geweigerd.
    await page.click('#invoerTabel th.kol-spon .bulk-vul');
    await page.fill('#bulkVeld', '44,5');
    await page.click('button:has-text("Doorvoeren")');
    await wacht(400);
    check('op slot: Diepte doorvoeren wordt geweigerd', await page.evaluate(() =>
      rijen.filter(r => r.merk).every(r => !(GlasLatten.ruit(r).sponningDiepte > 0))));
    await sluitMeldingen(page);
    await page.evaluate(() => window.bulkAnnuleer && bulkAnnuleer());
    // Alleen meekijken: niets wijzigen.
    await page.evaluate(() => { window._echt = window.glasAlleenKijken; window.glasAlleenKijken = () => true; renderTabel(); });
    await page.evaluate(() => { const id = rijen.find(x => x.merk === 'X').id; latDiepte(id, '30'); latKies(id, 'A12'); latBand(id, '4'); latUitfrezen(id, true); });
    await wacht(300);
    await sluitMeldingen(page);
    // (Bij meekijken laat de app de stand uit de cloud zien; daarom geen vaste waarden, alleen: niets van wat hier geprobeerd is.)
    const pr = await PR(page, 'X');
    check('alleen meekijken: diepte, glaslat, band en uitfrezen worden geweigerd', pr.sponningDiepte !== 30 && pr.glaslat !== 'A12' &&
      pr.bandBinnen !== 4 && !pr.uitfrezen, JSON.stringify(pr));
    m = await page.evaluate(() => { const id = rijen.find(x => x.merk === 'X').id; return document.querySelector('#pk-' + id + ' .spon-input').disabled; });
    check('alleen meekijken: het vak staat uit', m === true);
    await page.click('#pk-' + idVan('X') + ' .pk-chip');
    await page.waitForSelector('.lat-venster', { timeout: 2000 });
    m = await page.$$eval('.lat-venster input, .lat-venster select, .lat-venster .pk-lat', l => l.map(e => e.disabled));
    check('en in het venster staat alles uit (wel te bekijken)', m.length >= 3 && m.every(Boolean), JSON.stringify(m));
    await page.keyboard.press('Escape');
    await page.evaluate(() => { window.glasAlleenKijken = window._echt; renderTabel(); });
    const w = await page.evaluate(() => { const x = teBestellen(); return { g: x.gewijzigd.length, r: x.regels.length }; });
    check('niets nieuws te bestellen (de velden staan niet op de ruit)', w.g === 0 && w.r === 0, JSON.stringify(w));
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Uiterlijk (als de offerte-app) en de bestanden');
    latProject();
    ({ ctx, page } = await openProject());
    m = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); const b = getComputedStyle(document.body);
      return [cs.getPropertyValue('--accent').trim().toLowerCase(), cs.getPropertyValue('--ink').trim().toLowerCase(),
              cs.getPropertyValue('--ok').trim(), cs.getPropertyValue('--warn').trim(), cs.getPropertyValue('--err').trim(),
              b.fontFamily, cs.getPropertyValue('--merk').trim().toLowerCase()]; });
    check('kleuren met namen: accent #c1121c (als het logo), ink, ok, warn, err; de oude namen wijzen erheen', m[0] === '#c1121c' &&
      m[1] === '#1d1d1b' && m[2] && m[3] && m[4] && /var\(--accent\)|#c1121c/.test(m[6]), JSON.stringify(m));
    check('vast lettertype: het systeemlettertype (-apple-system …)', /^-apple-system/.test(m[5]), m[5]);
    const r = await page.evaluate(() => { const c = document.querySelector('.pk-chip'); const s = getComputedStyle(c);
      return [parseFloat(s.borderTopLeftRadius), s.display]; });
    check('de oordelen zijn chips (rond)', r[0] >= 8, JSON.stringify(r));
    const pdfjs = fs.readFileSync(path.join(map, 'pdf.js'), 'utf8');
    check('de pdf gebruikt hetzelfde rood (193, 18, 28), niet meer het oude (208, 2, 67)', /193, 18, 28/.test(pdfjs) && !/208, 2, 67/.test(pdfjs));
    await ctx.close();
    const html = fs.readFileSync(path.join(map, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(map, 'sw.js'), 'utf8');
    const lj = fs.readFileSync(path.join(map, 'latten.js'), 'utf8');
    const ids = (lj.match(/\{ id: '([A-Z0-9]+)'/g) || []).map(x => x.slice(7, -1));
    const txt = fs.readFileSync(path.join(map, 'latfotos.txt'), 'utf8').split('\n').filter(l => l && l[0] !== '#').map(l => l.split(' '));
    check('latten.js in index.html (vóór toebehoren.js) en in de offline-lijst', html.indexOf('<script src="latten.js') > 0 &&
      html.indexOf('<script src="latten.js') < html.indexOf('<script src="toebehoren.js') && /'\.\/latten\.js'/.test(sw));
    check('alle ' + ids.length + ' latten: een foto in de offline-lijst (mag ontbreken) en een Jongeneel-pagina in latfotos.txt',
      ids.length === 28 && ids.every(id => sw.indexOf("'./latten/" + id + ".jpg'") >= 0) &&
      ids.every(id => txt.some(l => l[0] === id && /^https:\/\/www\.jongeneel\.nl\//.test(l[1]))), ids.length + ' / ' + txt.length);
    const versies = [html.match(/APP_VERSIE = '(v\d+)'/)[1], pdfjs.match(/PDF_VERSIE = '(v\d+)'/)[1], sw.match(/VERSIE = '(v\d+)'/)[1]];
    // v114: de nummers gaan mee omhoog; hier alleen dat ze gelijk zijn.
    check('de drie versienummers zijn gelijk', versies.every(v => v === versies[0]), JSON.stringify(versies));
    // v114 (keuze Jan): het fotoscript is weg (Jongeneel blokkeert scripts); de foto's staan in latten/.
    check('GLASLATTEN.md staat erbij, latfotos-ophalen.sh niet meer', fs.existsSync(path.join(map, 'GLASLATTEN.md')) && !fs.existsSync(path.join(map, 'latfotos-ophalen.sh')));
  }

  /* ══ ═══════════════════════════════════════════════════════════ */
  console.log('\nGeen fouten in de console');
  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log(fouten ? '\n' + fouten + ' FOUT(EN).' : '\nAlles goed.');
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
