/* Testreeks v115 — node test-v115.js   (en: node test-v115.js --mutaties)

   Onderwerp: de latten op Toebehoren in plaats van Invoer (Jan, 20-10-2026).
   Op Invoer alleen Diepte (zij en boven) en Onder; op Toebehoren per foto
   (met de foto en de merkletters) glastype, opbouw, dikte, de diepten en de
   keuzes voor de latten. Opdeklatten kunnen omgekeerd; een gewone glaslat
   met ruimte over is "past · N mm in zicht" (niet "te ruim"); neuslatten op
   ventilatie en uitsteek; latzijde "geen (meegeleverd)", ook na een
   csv-import; lege kolommen niet op de bestellijst; bediening "standaard";
   de glasaftrek per rooster en de glaslatten in de Naslag.

   Echte situatie: Jan meet een renovatie in met een foto van de gevel. Bij
   de ene ruit zitten de latten binnen, bij de andere buiten; onderin is de
   dorpel dieper (geen scharniersponning). Bij één ruit past de gewone lat
   niet, maar een opdeklat omgekeerd wel. Een tweede deel komt als csv uit
   de kozijnfabriek: daar worden de latten meegeleverd.

   Belofte (keuzes van Jan):
   - Invoer: alleen Diepte en Onder (leeg = gelijk, grijs het getal van Diepte);
   - Toebehoren: per foto, met de foto en de merkletters; glastype en opbouw
     daar te wijzigen en gelijk met Invoer; de focus blijft staan bij Tab;
   - opdeklat met eigen sponning normaal (+c) of omgekeerd (−c), met tekening;
   - gewone glaslat met ruimte over: "past · N mm in zicht", geen waarschuwing;
   - neuslat: alleen die passen, met ventilatie (S − rest) en uitsteek (+9);
     automatisch de kleinste; "beide" = onderin dezelfde lat;
   - latzijde "geen (meegeleverd)": geen latten, wel band/kit/tape; standaard
     na een csv-import;
   - bestellijst: een kolom zonder waarden komt er niet op; bediening
     "standaard"; Naslag: glasaftrek per rooster en alle glaslatten (één bron).

   Wat deze opstelling aanneemt: zoals test-v111 … v114 (nagebootste database
   in node, echte Chromium, pdf teruggelezen met pdfplumber). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  zicht: ["latten.js", "      : !opdek ? (uit.zicht > 0 ? 'zicht' : 'past') : over", "      : !opdek ? 'past' : over"],
  omgekeerd: ["latten.js", "    var extra = (opdek && !om ? c : 0) * keer;", "    var extra = (opdek ? c : 0) * keer;"],
  uitsteek: ["latten.js", "    return { lat: l, ventilatie: v, uitsteek: rond(v + l.neus), past: v >= NEUS_VRIJ_MM };", "    return { lat: l, ventilatie: v, uitsteek: rond(l.eigenSponning + l.neus), past: v >= NEUS_VRIJ_MM };"],
  neusAuto: ["latten.js", "    var keuze = gekozen ? neusMaten(gekozen, o.rest) : o.passend[0];", "    var keuze = gekozen ? neusMaten(gekozen, o.rest) : o.passend[o.passend.length - 1];"],
  alleenPassend: ["latten.js", "      nh = no.passend.map(function (x) {", "      nh = (no.lijst || []).map(function (x) {"],
  beideOnder: ["latten.js", "eigen || (zijde(r) === 'buiten' ? 'NEUS' : boven.id);", "eigen || (zijde(r) === 'buiten' || zijde(r) === 'beide' ? 'NEUS' : boven.id);"],
  geenLatten: ["toebehoren.js", "      if (!geen) {\n        lat(boven", "      if (1) {\n        lat(boven", "      var latMm = geen ? 0 :", "      var latMm = 0 ? 0 :"],
  importGeen: ["import.js", "    geenLatten(nieuw);\n    afronden(nieuw.length + ' regels toegevoegd');", "    afronden(nieuw.length + ' regels toegevoegd');"],
  oudGlaslat: ["latten.js", "    if (w === 'Glaslat' || w === 'ZELFDE') return 'ZELFDE';", "    if (w === 'ZELFDE') return 'ZELFDE';"],
  buitenRecht: ["latten.js", "    if ((z === 'buiten' || z === 'beide') && (l.vorm === 'recht' || l.vorm === 'rond')) return false;", ""],
  onderVak: ["latten.js", "'\" title=\"Leeg = gelijk aan zij en boven\" onchange=\"latOnderDiepte(' + r.id + ', this.value)\"'", "'\" title=\"Leeg = gelijk aan zij en boven\" onchange=\"latDiepte(' + r.id + ', this.value)\"'"],
  onderGrijs: ["latten.js", "'\" placeholder=\"' + esc(vakWaarde(e.sponningDiepte) || 'mm') + '\" aria-label=\"Sponningdiepte onder '", "'\" placeholder=\"mm\" aria-label=\"Sponningdiepte onder '"],
  glasSync: ["toebehoren.js", "    else if (veld === 'opbouw' && typeof wijzigOpbouw === 'function') wijzigOpbouw(id, waarde);", "    else if (veld === 'opbouw') getRijVan(id).opbouw = waarde;"],
  glasSlotUit: ["toebehoren.js", "'\" onchange=\"toebehorenGlas(' + id + ', \\'glasType\\', this.value)\"' + glasUit + '>' +", "'\" onchange=\"toebehorenGlas(' + id + ', \\'glasType\\', this.value)\"' + '>' +"],
  focus: ["toebehoren.js", "    if (act && oud.contains(act) && act.getAttribute('data-sleutel')) {", "    if (0) {"],
  klikNaTypen: ["toebehoren.js", "    if (druk) { naDruk = true; return; }", ""],
  blokDiepte: ["blokbalk.js", "      zetDieptenTerug(toenDiepte);\n", ""],
  a5Zicht: ["latten.js", "    var speling = lat && lat.soort === 'glaslat-sponning' ? (getal(lat.hoogteSponninkje) || 3) : 0;", "    var speling = 0;"],
  onderMontage: ["latten.js", "      var standen = !draaibaar(l) ? [false] : onder ? [l.id === boven.id && omgekeerd(r)] : [false, true];", "      var standen = !draaibaar(l) ? [false] : [false, true];"],
  fotoGroep: ["toebehoren.js", "      var g = p.rij.fotoId && bekend[p.rij.fotoId] ? per[p.rij.fotoId] : los;", "      var g = los;"],
  merkletters: ["fotos.js", "    return '<img src=\"' + esc(url) + '\" alt=\"\">' + (window.inktSVGHTML ? inktSVGHTML(f) : '') + marks;", "    return '<img src=\"' + esc(url) + '\" alt=\"\">' + (window.inktSVGHTML ? inktSVGHTML(f) : '');"],
  merkLicht: ["fotos.js", "      var licht = opties.rijId != null && m.rijId === opties.rijId;", "      var licht = false;"],
  groepZijde: ["toebehoren.js", "    lijst.forEach(function (r) { zetPerRuit(p, r.id, 'latZijde', w);", "    lijst.slice(0, 1).forEach(function (r) { zetPerRuit(p, r.id, 'latZijde', w);"],
  kiezerOm: ["latten.js", "      (draaibaar(l) ? [false, true] : [false]).forEach(function (om) { opties.push({ lat: l, om: om }); });", "      [false].forEach(function (om) { opties.push({ lat: l, om: om }); });"],
  kiesOm: ["latten.js", "    zetRw(id, 'latOmgekeerd', om && draaibaar(wordt) ? true : '');", "    zetRw(id, 'latOmgekeerd', '');"],
  bestelMerk: ["pdf.js", "      { kop: 'Merk',       w: 14, haal: function (r) { return r.merk; } },", "      { kop: 'Merk',       w: 14, haal: function (r) { return r.merk; }, altijd: true },"],
  bediening: ["index.html", "  const keuzes = [['', 'standaard'],", "  const keuzes = [['', '—'],"],
  glasaftrek: ["naslag.js", "        '<td>' + (aftrek != null ? aftrek + ' mm' : '\\u2014') + '</td>' +", "        '<td>\\u2014</td>' +"],
  naslagLatten: ["naslag.js", "    var lijst = G.LATTEN.filter(function (l) { return l.soort === s && getoond.indexOf(l) >= 0; });", "    var lijst = G.LATTEN.filter(function (l) { return l.soort === s && getoond.indexOf(l) >= 0; }).slice(1);"],
  zichtControle: ["pdf.js", ".filter(function (x) { return x.u.status === 'past niet' || x.u.status === 'te ruim'; });", ".filter(function (x) { return x.u.status === 'past niet' || x.u.status === 'te ruim' || x.u.status === 'zicht'; });"],
  gitignore: [".gitignore", "Claude outputs/\n", ""],
  // Toebehoren → Invoer: het vak op Invoer loopt mee (latten.js bijwerken).
  invoerMeeloop: ["latten.js", "        if (vak && document.activeElement !== vak && vak.value !== x[1]) vak.value = x[1];", ""],
  ipad: ["index.html", "  @media (min-width: 641px) and (max-width: 1360px) {\n    .tb-wrap { display: block; }", "  @media (min-width: 9641px) and (max-width: 1360px) {\n    .tb-wrap { display: block; }"],
  naslagZoek: ["naslag.js", "    if (naslagZoek && latGevonden) { naslagOpen['Glaslatten'] = true; gevonden += latGevonden; }\n    if (!naslagZoek || latGevonden) {", "    if (naslagZoek && latGevonden) { naslagOpen['Glaslatten'] = true; gevonden += latGevonden; }\n    if (!naslagZoek) {"],
  telefoonDicht: ["index.html", "    table.samenvatting.tb-tabel tr.tb-ruit.dicht td:not(.tb-merk):not(.tb-oordeel):not(.tb-kort) { display: none; }", ""],
};
const WAAR = {
  zicht: '1', omgekeerd: '1', uitsteek: '1', neusAuto: '1', alleenPassend: '4', beideOnder: '1', geenLatten: '1', importGeen: '6',
  oudGlaslat: '1', buitenRecht: '1', onderVak: '2', onderGrijs: '2', glasSync: '3', glasSlotUit: '5', focus: '3', fotoGroep: '3',
  merkletters: '3', merkLicht: '4', groepZijde: '3', kiezerOm: '4', kiesOm: '4', bestelMerk: '7', bediening: '7', glasaftrek: '8',
  naslagLatten: '8', zichtControle: '7', gitignore: '9', telefoonDicht: '3', ipad: '3', naslagZoek: '8', invoerMeeloop: '3', klikNaTypen: '3', blokDiepte: '2', a5Zicht: '1', onderMontage: '1',
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v115-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v115-pdf-'));
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

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, m, t, u, id;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Wat de app rekent: zicht, omgekeerd, neuslat, beide, geen');
    latProject();
    ({ ctx, page } = await openProject());
    await zetPR(page, 'X', { latZijde: 'binnen', sponningDiepte: 45 });   // 23 + 6 + 15 = 44: 1 mm over
    m = await G(page, 'X');
    check('gewone glaslat met 1 mm over: "past · 1 mm in zicht" (geen "ruim")', m.slechtste === 'zicht' && m.kort === 'past · 1 mm in zicht', JSON.stringify(m));
    await zetPR(page, 'X', { sponningDiepte: 50 });
    m = await G(page, 'X');
    u = await R(page, 'X', (r, G) => G.adviezen(r));
    check('6 mm over: "past · 6 mm in zicht", geen waarschuwing en geen advies (tot v114: "te ruim +6")',
      m.kort === 'past · 6 mm in zicht' && !u.length, JSON.stringify([m.kort, u]));
    // Opdeklat E22 (eigen sponning 5): normaal +5, omgekeerd −5.
    await zetPR(page, 'X', { sponningDiepte: 35, glaslat: 'E22', latOmgekeerd: true });
    m = await G(page, 'X');
    check('sponning 35, 23 mm glas: E22 omgekeerd (dikke deel 5 mm de sponning in) = 34 → "ruim +1"', m.kort === 'ruim +1', JSON.stringify(m));
    await zetPR(page, 'X', { latOmgekeerd: null });
    m = await G(page, 'X');
    check('E22 normaal = 29 tegen 40 → "te ruim +11" (een opdeklat ligt vast: blijft een melding)', m.kort === 'te ruim +11', JSON.stringify(m));
    u = await R(page, 'X', (r, G) => G.adviezen(r));
    check('advies bij de normale E22: omgekeerd monteren', u.some(a => /E22 omgekeerd monteren .*: ruim \+1/.test(a)), JSON.stringify(u));
    await zetPR(page, 'X', { glaslat: null });
    u = await R(page, 'X', (r, G) => G.adviezen(r));
    check('A4 past niet (−9): advies "E22 … omgekeerd: ruim +1"', u.some(a => /^Lat E22 .*omgekeerd: ruim \+1/.test(a)), JSON.stringify(u));
    // Jans deur: 4-13-5 (22 mm) in 27 mm met E7.
    await zetPR(page, 'D', { latZijde: 'binnen', sponningDiepte: 27, glaslat: 'E7' });
    u = await R(page, 'D', (r, G) => [G.kort(G.pakket(r)), G.adviezen(r)]);
    check('deur 22 mm in 27 mm met E7: "te ruim +2", advies band binnen 4 mm (ruim +1)', u[0] === 'te ruim +2' &&
      u[1].some(a => /^Band binnen 4 mm: ruim \+1/.test(a)), JSON.stringify(u));
    // A5 (sponninkje 3 mm over de kozijnrand): kan 3 mm verder in zonder zicht.
    u = await R(page, 'X', (r, G) => [44, 43, 45].map(d => G.kort(G.pakket(r, { lat: 'A5', sponningDiepte: d }))));
    check('A5 (12 mm, sponninkje 3): 43 → past (sponninkje valt minder over), 44 → past · 0 … 45 → past · 1 mm in zicht',
      u[1] === 'past' && u[2] === 'past · 1 mm in zicht', JSON.stringify(u));
    // Onderin: een opdeklat zit zoals boven; het advies belooft geen andere montage.
    await zetPR(page, 'X', { latZijde: 'binnen', sponningDiepte: 35, diepteOnder: 41, glaslat: 'E22', latOmgekeerd: true });
    u = await R(page, 'X', (r, G) => [G.kortRuit(G.oordeelRuit(r)), G.adviezen(r, 'onder')]);
    check('onderin (41) dezelfde E22 omgekeerd: "onder: te ruim +7"; het advies onderin noemt geen andere montage',
      u[0] === 'onder: te ruim +7' && u[1].length > 0 && !u[1].some(a => /omgekeerd/.test(a)), JSON.stringify(u));
    await zetPR(page, 'X', { latZijde: null, sponningDiepte: null, diepteOnder: null, glaslat: null, latOmgekeerd: null });
    // Neuslat: 52 onder − 23 glas − 6 band = 23 mm; N25 geeft 2 mm (te klein), N30 7 mm ventilatie, steekt 16 uit.
    await zetPR(page, 'X', { latZijde: 'buiten', sponningDiepte: 44, diepteOnder: 52 });
    u = await R(page, 'X', (r, G) => { const o = G.neuslatOpties(r); const ol = G.onderlatVoorRuit(r);
      return { passend: o.passend.map(x => x.lat.id + ':' + x.ventilatie + '/' + x.uitsteek), teKlein: o.teKlein.map(x => x.lat.id), auto: ol.id }; });
    check('neuslatten bij onder 52: N25 te klein; N30 7 mm ventilatie en 16 mm uitsteek … N55 32/41',
      JSON.stringify(u.teKlein) === '["N25"]' && u.passend[0] === 'N30:7/16' && u.passend[5] === 'N55:32/41', JSON.stringify(u));
    check('automatisch de kleinste die past (N30): ventilatie zo dicht mogelijk bij 5 mm', u.auto === 'N30', u.auto);
    // Beide: onderin dezelfde lat (keuze Jan), geen neuslat.
    await zetPR(page, 'X', { latZijde: 'beide', sponningDiepte: 59, diepteOnder: null });
    m = await G(page, 'X');
    check('beide: glas tussen twee latten (59 past), onderin dezelfde lat A4, geen neuslat', m.boven === 'past' && m.onder === 'A4' && !m.isNeus, JSON.stringify(m));
    // Een onderlat 'Glaslat' uit v111 = dezelfde als boven.
    await zetPR(page, 'X', { latZijde: 'buiten', glaslat: 'A10', onderlat: 'Glaslat' });
    m = await G(page, 'X');
    check('een oude onderlat "Glaslat" (v111) = dezelfde lat als boven (A10), ook buiten', m.onder === 'A10' && !m.isNeus, JSON.stringify(m));
    // Per zijde: buiten geen rechte latten in het advies.
    await zetPR(page, 'X', { onderlat: null, glaslat: 'B17', sponningDiepte: 52, latZijde: 'binnen' });
    const advBinnen = await R(page, 'X', (r, G) => G.adviezen(r));
    await zetPR(page, 'X', { latZijde: 'buiten' });
    const advBuiten = await R(page, 'X', (r, G) => G.adviezen(r));
    check('advies per zijde: binnen ook rechte latten (B5), buiten alleen schuine (water)', advBinnen.some(a => /Lat B5 /.test(a)) &&
      !advBuiten.some(a => /Lat B\d/.test(a)) && advBuiten.some(a => /Lat A10 /.test(a)), JSON.stringify([advBinnen, advBuiten]));
    // Geen (meegeleverd): geen latten, wel band en kit.
    await zetPR(page, 'Y', { latZijde: 'geen', sponningDiepte: 30 });
    u = await page.evaluate(() => { const b = toebehorenBerekenen(); const y = b.perRuit.find(p => p.rij.merk === 'Y');
      return { latM: y.latM, bandM: y.bandM, kitMl: y.kitMl, kort: GlasLatten.kortRuit(y.oordeel), stukken: b.latten.reduce((n, l) => n + l.stukken, 0) }; });
    check('latzijde "geen (meegeleverd)": 0 m latten, wel band en kit; oordeel "meegeleverd"', u.latM === 0 && u.bandM > 0 && u.kitMl > 0 &&
      u.kort === 'meegeleverd', JSON.stringify(u));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Invoer: alleen Diepte en Onder');
    ({ ctx, page } = await gevelOpen(LATTEN_GEVEL));
    m = await page.evaluate(i => { const o = document.querySelector('#pko-' + i + ' input'); return [o.value, o.placeholder]; }, await idOp(page, 'C'));
    check('bij het openen: Onder leeg met grijs de diepte (C: 35)', m[0] === '' && m[1] === '35', JSON.stringify(m));
    await page.locator('#invoerTabel').scrollIntoViewIfNeeded();
    m = await page.evaluate(() => {
      const kop = [...document.querySelectorAll('#invoerTabel thead tr:last-child th')].map(th => th.childNodes[0] && th.childNodes[0].textContent.trim());
      const groep = [...document.querySelectorAll('#invoerTabel thead tr:first-child th')].find(th => /Sponning/.test(th.textContent));
      const p = document.getElementById('panel-invoer');
      return { kop, span: groep && groep.colSpan, lat: p.querySelectorAll('.lat-knop, .zijde-sel, .pk-chip').length };
    });
    check('kop: onder "Sponning" alleen Diepte en Onder; geen Glaslat of Latzijde', m.span === 2 && m.kop.indexOf('Diepte') >= 0 && m.kop.indexOf('Onder') >= 0 &&
      m.kop.indexOf('Glaslat') < 0 && m.kop.indexOf('Latzijde') < 0, JSON.stringify(m));
    check('op Invoer geen latknop, zijde of oordeel meer', m.lat === 0, m.lat);
    id = await idOp(page, 'A');
    const diepteVak = page.locator('#pk-' + id + ' input');
    await diepteVak.click(); await diepteVak.fill('44'); await page.keyboard.press('Tab');
    await wacht(400);
    m = await page.$eval('#pko-' + id + ' input', e => ({ ph: e.placeholder, v: e.value, focus: document.activeElement === e }));
    check('Diepte 44 getypt: Onder is leeg met grijs "44" (= gelijk), en Tab gaat naar Onder', m.ph === '44' && m.v === '' && m.focus, JSON.stringify(m));
    await page.keyboard.type('52'); await page.keyboard.press('Tab');
    check('bewaard bij het project (Toebehoren per ruit): diepte 44, onder 52', await opgeslagen(page, () => {
      const e = perRuitDb('A'); return e.sponningDiepte === 44 && e.diepteOnder === 52; }), JSON.stringify(perRuitDb('A')));
    await ongedaan(page);
    m = await page.evaluate(i => [document.querySelector('#pko-' + i + ' input').value, GlasLatten.ruit(rijen.find(r => r.id === i)).diepteOnder || ''], id);
    check('ongedaan maken: Onder weer leeg', m[0] === '' && m[1] === '', JSON.stringify(m));
    // ↶ van de tabel onder de foto: ook Diepte en Onder (staan bij het project, niet op de ruit).
    await page.click('#pko-' + id + ' input'); await page.fill('#pko-' + id + ' input', '50'); await page.keyboard.press('Tab'); await wacht(300);
    await page.evaluate(() => blokOngedaan('f1')); await wacht(300);
    m = await page.evaluate(i => [document.querySelector('#pko-' + i + ' input').value, GlasLatten.ruit(rijen.find(r => r.id === i)).diepteOnder || ''], id);
    check('↶ van de tabel draait de diepte onder terug (niet een oudere wijziging)', m[0] === '' && m[1] === '', JSON.stringify(m));
    m = await page.evaluate(() => !!document.querySelector('#invoerTabel th.kol-sponon .bulk-vul'));
    check('Onder is ook door te voeren naar meer regels (⤓)', m);
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Toebehoren: per foto, glas gelijk met Invoer, focus, zijde voor alle ruiten');
    ({ ctx, page } = await gevelOpen(LATTEN_GEVEL));
    await naarToebehoren(page);
    await wacht(600);
    m = await page.evaluate(() => [...document.querySelectorAll('.tb-groep')].map(g => ({
      t: g.querySelector('.tb-groep-tekst b').textContent, img: !!g.querySelector('.fv img'),
      marks: [...g.querySelectorAll('.fv-mark')].map(x => x.textContent).join('') })));
    check('per foto een kopje met de foto en de merkletters (A, B ×3, C, E ×2), daarna de losse regels',
      m.length === 2 && m[0].t === 'Voorgevel' && m[0].img && m[0].marks === 'ABBBCEE' && /Losse regels/.test(m[1].t), JSON.stringify(m));
    m = await page.evaluate(() => [...document.querySelectorAll('.tb-tabel thead th')].map(th => th.textContent.trim()).filter(Boolean));
    // v117: kolom Pakket erbij (wens Jan).
    check('kolommen: Merk, Glastype, Opbouw, Dikte, Pakket, Diepte, Onder, Latzijde, Glaslat, Onderlat, Band, Oordeel, Nodig',
      JSON.stringify(m) === '["Merk","Glastype","Opbouw","Dikte","Pakket","Diepte","Onder","Latzijde","Glaslat","Onderlat","Band binnen","Oordeel","Nodig"]', JSON.stringify(m));
    id = await idOp(page, 'A');
    // Glastype en opbouw hier wijzigen: dezelfde gegevens als op Invoer.
    await page.selectOption('[data-sleutel="type-' + id + '"]', 'HR+ glas'); await wacht(400);
    await page.selectOption('[data-sleutel="opb-' + id + '"]', '4-12-4'); await wacht(400);
    m = await page.evaluate(i => { const r = rijen.find(x => x.id === i);
      const rij = document.getElementById('rij-' + i);
      return { type: r.glasType, opb: r.opbouw, dikte: r.totaalDikte, invType: rij.querySelector('.kol-type select').value,
               invOpb: rij.querySelector('.kol-opbouw select').value, invDikte: document.getElementById('dk-' + i).textContent,
               tbDikte: document.querySelector('[data-sleutel="type-' + i + '"]').closest('tr').querySelector('.tb-dikte').textContent }; }, id);
    check('Toebehoren → Invoer: HR+ glas 4-12-4 (20 mm) staat ook op Invoer, dikte overal 20', m.type === 'HR+ glas' && m.opb === '4-12-4' && m.dikte === 20 &&
      m.invType === 'HR+ glas' && m.invOpb === '4-12-4' && m.invDikte === '20' && m.tbDikte === '20', JSON.stringify(m));
    check('en bewaard (database)', await opgeslagen(page, () => dbRij('A').opbouw === '4-12-4' && dbRij('A').glasType === 'HR+ glas'), JSON.stringify(dbRij('A')));
    await ongedaan(page);
    m = await page.evaluate(i => [rijen.find(x => x.id === i).opbouw, document.querySelector('[data-sleutel="opb-' + i + '"]').value], id);
    check('ongedaan maken op Toebehoren: opbouw weer leeg (zoals na het wisselen van type)', m[0] === '' && m[1] === '', JSON.stringify(m));
    await ongedaan(page);
    m = await page.evaluate(i => [rijen.find(x => x.id === i).glasType, rijen.find(x => x.id === i).opbouw], id);
    check('nog één keer: weer HR++ glas 4-15-4 (het glastype is één stap)', m[0] === 'HR++ glas' && m[1] === '4-15-4', JSON.stringify(m));
    // Invoer → Toebehoren.
    await invoerScherm(page);
    await page.selectOption('#rij-' + id + ' .kol-opbouw select', '4-14-4'); await wacht(300);
    await naarToebehoren(page);
    m = await page.$eval('[data-sleutel="opb-' + id + '"]', e => e.value);
    check('Invoer → Toebehoren: opbouw 4-14-4 staat ook hier', m === '4-14-4', m);
    // Focus: Tab van Diepte naar Onder blijft staan, ook al wordt de tabel opnieuw getekend.
    const idB = await idOp(page, 'B');
    await page.click('[data-sleutel="diepte-' + idB + '"]');
    await page.fill('[data-sleutel="diepte-' + idB + '"]', '40');
    await page.keyboard.press('Tab'); await wacht(500);
    m = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-sleutel'));
    check('Diepte 40 + Tab: de cursor staat in Onder (de tabel is opnieuw getekend)', m === 'onder-' + idB, m);
    m = await page.evaluate(i => document.querySelector('#pk-' + i + ' input').value, idB);
    check('en Invoer toont ook 40', m === '40', m);
    // Typen en meteen op het oordeel klikken (zonder Tab): de klik gaat niet verloren.
    await page.click('[data-sleutel="diepte-' + idB + '"]');
    await page.fill('[data-sleutel="diepte-' + idB + '"]', '45');
    await page.locator('[data-sleutel="diepte-' + idB + '"]').locator('xpath=ancestor::tr//td[contains(@class,"tb-oordeel")]//button').click({ delay: 150 }); // vinger 150 ms op het scherm, zoals een echte tik
    m = await page.waitForSelector('.lat-venster', { timeout: 2000 }).then(() => true, () => false);
    check('typen en meteen op het oordeel klikken: het venster opent, met de nieuwe diepte', m &&
      /diepte 45/.test(await page.$eval('.lat-venster', e => e.innerText)));
    await page.keyboard.press('Escape'); await wacht(200);
    // Latzijde voor de hele foto.
    await page.selectOption('.tb-groep:first-of-type .tb-groep-zijde select', 'binnen'); await wacht(500);
    m = await page.evaluate(() => rijen.filter(r => r.merk).map(r => r.merk + ':' + GlasLatten.zijde(r)).join(' '));
    check('"latzijde hier" bij de foto: A B C E F binnen, D (los) niet', m === 'A:binnen B:binnen C:binnen D: E:binnen F:binnen', m);
    // Alle ruiten: E22 omgekeerd.
    await page.selectOption('#tbAlleLat', 'E22|om');
    await page.click('button:has-text("Toepassen")'); await wacht(500);
    m = await page.evaluate(() => rijen.filter(r => r.merk).every(r => GlasLatten.ruit(r).glaslat === 'E22' && GlasLatten.omgekeerd(r)));
    check('"Alle ruiten": glaslat E22 omgekeerd voor elke ruit', m);
    await ongedaan(page);
    m = await page.evaluate(() => rijen.some(r => GlasLatten.ruit(r).glaslat === 'E22'));
    check('één keer ongedaan maken: weer de oude latten', !m);
    await ctx.close();
    // Telefoon: kaartjes, dicht één regel, niets schuift opzij.
    ({ ctx, page } = await gevelOpen(LATTEN_GEVEL, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
    await naarToebehoren(page);
    id = await idOp(page, 'B');
    m = await page.evaluate(i => { const s = document.querySelector('[data-sleutel="type-' + i + '"]'); const w = document.querySelector('.tb-wrap');
      return { zicht: !!(s.offsetWidth || s.offsetHeight), schuif: w.scrollWidth - w.clientWidth }; }, id);
    check('telefoon: kaartje dicht = alleen merk, oordeel en een regel; niets schuift opzij', !m.zicht && m.schuif <= 1, JSON.stringify(m));
    await page.click('[data-sleutel="type-' + id + '"] >> xpath=ancestor::tr//button[contains(@class,"tb-kort-knop")]');
    await wacht(300);
    m = await page.evaluate(i => { const s = document.querySelector('[data-sleutel="type-' + i + '"]'); const w = document.querySelector('.tb-wrap');
      return { zicht: !!(s.offsetWidth || s.offsetHeight), schuif: w.scrollWidth - w.clientWidth }; }, id);
    check('tik: open, met glastype, diepten, latzijde, latten en band; nog steeds niets opzij', m.zicht && m.schuif <= 1, JSON.stringify(m));
    await ctx.close();
    // iPad staand (820 px): per ruit twee regels, het oordeel in beeld, niets schuift opzij (controle v115).
    ({ ctx, page } = await gevelOpen(LATTEN_GEVEL, { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true }));
    await naarToebehoren(page);
    id = await idOp(page, 'B');
    m = await page.evaluate(i => { const tr = document.querySelector('[data-sleutel="type-' + i + '"]').closest('tr');
      const c = tr.querySelector('.tb-oordeel button').getBoundingClientRect(); const w = document.querySelector('.tb-wrap');
      return { rechts: Math.round(c.right), breed: window.innerWidth, schuif: w.scrollWidth - w.clientWidth, hoog: Math.round(tr.getBoundingClientRect().height),
               kop: getComputedStyle(document.querySelector('.tb-tabel thead')).display }; }, id);
    check('iPad (820): het oordeel staat in beeld, de tabel schuift niet opzij, per ruit twee regels zonder koprij', m.rechts <= m.breed && m.schuif <= 1 &&
      m.kop === 'none' && m.hoog < 140, JSON.stringify(m));
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Glaslat en onderlat kiezen (met de foto), het venster per ruit');
    ({ ctx, page } = await gevelOpen(LATTEN_GEVEL));
    await naarToebehoren(page);
    id = await idOp(page, 'C');
    await page.click('[data-sleutel="lat-' + id + '"]'); await wacht(500);
    m = await page.evaluate(() => ({ licht: [...document.querySelectorAll('.lat-ruitkop .fv-mark.licht')].map(x => x.textContent).join(''),
      e22: document.querySelectorAll('.lat-venster [data-kies="E22"]').length,
      tek: document.querySelectorAll('.lat-venster [data-kies="E22"] .lat-montage').length,
      past: [...document.querySelectorAll('.lat-passend .lat-item')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' | ') }));
    check('kiezer: bovenin de foto met merk C opgelicht', m.licht === 'C', JSON.stringify(m.licht));
    check('E22 staat er twee keer in (normaal en omgekeerd), elk met een tekening van de montage', m.e22 === 2 && m.tek === 2, JSON.stringify(m));
    check('"Past bij deze ruit" (sponning 35): E22 omgekeerd, ruim +1', /E22 12x33 met sponning · omgekeerd .*ruim \+1/.test(m.past), m.past);
    await page.click('.lat-venster [data-kies="E22"][data-om="1"]'); await wacht(500);
    m = await page.evaluate(i => { const r = rijen.find(x => x.id === i); return [GlasLatten.ruit(r).glaslat, GlasLatten.omgekeerd(r),
      document.querySelector('[data-sleutel="lat-' + i + '"]').textContent, document.querySelector('[data-sleutel="lat-' + i + '"]').closest('tr').querySelector('.tb-oordeel').textContent]; }, id);
    check('gekozen: E22 omgekeerd, in de tabel "E22 omgekeerd −5", oordeel "ruim +1"', m[0] === 'E22' && m[1] === true && /E22 omgekeerd −5/.test(m[2]) && m[3] === 'ruim +1',
      JSON.stringify(m));
    check('bewaard', await opgeslagen(page, () => perRuitDb('C').latOmgekeerd === true && perRuitDb('C').glaslat === 'E22'), JSON.stringify(perRuitDb('C')));
    // Onderlat van B (buiten, onder 52): alleen de neuslatten die passen.
    const idB = await idOp(page, 'B');
    await page.click('[data-sleutel="olat-' + idB + '"]'); await wacht(500);
    m = await page.evaluate(() => ({ ids: [...document.querySelectorAll('.lat-passend [data-onder]')].map(x => x.getAttribute('data-onder')),
      n30: (document.querySelector('[data-onder="N30"]') || {}).innerText, klein: document.querySelector('.lat-passend').innerText,
      licht: [...document.querySelectorAll('.lat-ruitkop .fv-mark.licht')].map(x => x.textContent).join('') }));
    check('onderlat: alleen N30 … N55 (N25 is te klein en staat apart genoemd)', JSON.stringify(m.ids) === '["N30","N35","N40","N45","N50","N55"]' &&
      /Te klein .*N25/.test(m.klein), JSON.stringify(m.ids));
    check('bij elke neuslat ventilatie en uitsteek (N30: 7 mm ventilatie, steekt 16 mm uit)', /7 mm ventilatie · steekt 16 mm voor het kozijn uit/.test(m.n30), m.n30);
    check('en de foto met de drie B\'s opgelicht', m.licht === 'BBB', m.licht);
    await page.click('[data-onder="N35"]'); await wacht(500);
    m = await page.evaluate(i => [GlasLatten.ruit(rijen.find(x => x.id === i)).onderlat, document.querySelector('[data-sleutel="olat-' + i + '"]').textContent], idB);
    // v117: ook de uitsteek in de knop (wens Jan).
    check('N35 gekozen: in de tabel "N35 · vent. 12 · uitst. 21"', m[0] === 'N35' && /N35 · vent\. 12 · uitst\. 21/.test(m[1]), JSON.stringify(m));
    // Het venster van B: boven en onderin met tekening.
    await page.click('[data-sleutel="olat-' + idB + '"] >> xpath=ancestor::tr//td[contains(@class,"tb-oordeel")]//button'); await wacht(500);
    m = await page.evaluate(() => { const v = document.querySelector('.lat-venster'); return { t: v.innerText.replace(/\s+/g, ' '), neus: !!v.querySelector('svg.neus-svg') }; });
    check('venster: "Boven en zijkanten" en "Onderin" met de neuslat getekend (ventilatie 12, uitsteek 21)',
      /Boven en zijkanten/.test(m.t) && /Onderin · N35/.test(m.t) && m.neus && /12 mm ventilatie, steekt 21 mm/.test(m.t), m.t.slice(0, 300));
    await page.evaluate(() => latVensterSluiten());
    // Venster van C: montage omzetten en terug via het advies.
    await page.evaluate(i => latPakket(i), id); await wacht(400);
    await page.selectOption('.lat-venster select.pk-montage', ''); await wacht(400);
    m = await page.evaluate(i => [GlasLatten.omgekeerd(rijen.find(x => x.id === i)), document.querySelector('.lat-venster').innerText], id);
    check('montage op normaal: E22 geeft dan +5 → "te ruim" (het glas klemt niet)', m[0] === false && /te ruim: 11 mm over/.test(m[1]), m[1].slice(0, 200));
    await page.click('.lat-venster .pk-advies-knop:has-text("omgekeerd monteren")'); await wacht(400);
    m = await page.evaluate(i => GlasLatten.omgekeerd(rijen.find(x => x.id === i)), id);
    check('advies "E22 omgekeerd monteren" aangetikt: weer omgekeerd', m === true);
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Na de bestelling: op slot, ook glastype en opbouw op Toebehoren');
    bestelProject();
    rijVan(1).data.info.toebehoren = { perRuit: { 1: { sponningDiepte: 44, latZijde: 'binnen' }, 2: { latZijde: 'geen' }, 3: { latZijde: 'geen' } } };
    ({ ctx, page } = await openProject());
    await eersteBestelling(page);
    await naarToebehoren(page);
    id = await idOp(page, 'K1');
    m = await page.evaluate(i => ['type-', 'opb-', 'diepte-', 'onder-', 'zijde-', 'lat-', 'olat-', 'band-'].map(k => {
      const e = document.querySelector('[data-sleutel="' + k + i + '"]'); return e ? e.disabled : 'weg'; }).concat(
      [document.querySelector('[data-sleutel="type-' + i + '"]').closest('tr').querySelector('.tb-oordeel button').disabled]), id);
    check('op slot: glastype, opbouw, diepten, zijde, latten en band uit; het oordeel blijft aan te tikken',
      JSON.stringify(m) === '[true,true,true,true,true,true,true,true,false]', JSON.stringify(m));
    m = await page.evaluate(i => { toebehorenGlas(i, 'glasType', 'HR glas'); return rijen.find(x => x.id === i).glasType; }, id);
    await sluitMeldingen(page);
    check('en via de functie geweigerd (glas blijft HR++)', m === 'HR++ glas', m);
    await naarInvoer(page);
    m = await page.evaluate(i => document.querySelector('#pk-' + i + ' input').disabled && document.querySelector('#pko-' + i + ' input').disabled, id);
    check('op Invoer Diepte en Onder ook op slot', m);
    await ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Csv-import: latten meegeleverd');
    bestelProject();
    ({ ctx, page } = await openProject());
    await page.evaluate(() => impOpen());
    await page.setInputFiles('#impBestand', { name: 'kozijnfabriek.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Merk;Breedte;Hoogte\nN1;1000;1200\nN2;800;900\n', 'utf8') });
    await page.waitForFunction(() => document.getElementById('impStap2') && document.getElementById('impStap2').style.display !== 'none', null, { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => impControleren()); await wacht(300);
    await page.evaluate(() => impToevoegen()); await wacht(500);
    m = await page.evaluate(() => rijen.filter(r => r.merk).map(r => r.merk + ':' + GlasLatten.zijde(r)).join(' '));
    check('ingelezen ruiten: latzijde "geen (meegeleverd)"; de ruiten die er al waren niet', m === 'K1: K2: K3: N1:geen N2:geen', m);
    await page.evaluate(() => rijen.filter(r => /^N/.test(r.merk)).forEach(r => { r.glasType = 'HR++ glas'; r.opbouw = '4-15-4'; berekenDikte(r); }));
    u = await page.evaluate(() => toebehorenBerekenen().perRuit.filter(p => /^N/.test(p.rij.merk)).map(p => [p.latM, p.bandM > 0, p.kitMl > 0]));
    check('Toebehoren telt daar geen latten, wel band en kit', JSON.stringify(u) === '[[0,true,true],[0,true,true]]', JSON.stringify(u));
    await ctx.close();
  }

  /* ══ 7 ════════════════════════════════════════════════════════ */
  if (doe('7')) {
    console.log('\n7. Bestellijst: lege kolommen weg, bediening "standaard", zicht geen vraag');
    bestelProject();
    rijVan(1).data.rijen.forEach(r => { r.merk = ''; });
    Object.assign(rijVan(1).data.rijen[0], { rooster: 'Ja', ducoType: 'DucoTon 10', ralKleur: 'RAL 9010 - Zuiverwit' });
    rijVan(1).data.info.toebehoren = { perRuit: { 1: { sponningDiepte: 50, latZijde: 'binnen' }, 2: { sponningDiepte: 35, latZijde: 'binnen', glaslat: 'E22', latOmgekeerd: true },
      3: { latZijde: 'geen' } } };
    ({ ctx, page } = await openProject());
    id = await page.evaluate(() => rijen[0].id);
    m = await page.evaluate(i => { const s = document.querySelector('#bed-' + i + ' select'); return s.options[s.selectedIndex].text; }, id);
    check('bediening bij een rooster: standaard "standaard" (was leeg "—")', m === 'standaard', m);
    const pdf = await bestellijstPdf(page, Object.assign({ 'Past het in de sponning?': 'Toch doorgaan' }, ONVOLLEDIG));
    t = pdfTekst(pdf);
    check('geen vraag "Past het in de sponning?" bij 6 mm sponning in zicht', gevraagd.indexOf('Past het in de sponning?') < 0, gevraagd.join(' / '));
    check('ruiten zonder merk: geen lege kolom "Merk" op de bestellijst', !/\bMerk\b/.test(t.split('\n').find(l => /Glasbreedte/.test(l)) || ''),
      (t.split('\n').find(l => /Glasbreedte/.test(l)) || '').slice(0, 120));
    // v117 (Jan): bij een rooster zonder extra bediening staat er "standaard", dus de kolom blijft.
    check('geen lege kolom Glasbewerking; Bediening wel, met "standaard" (rooster)', !/Glasbewerking/.test(t) && /Bediening/.test(t) && /standaard/.test(t), '');
    await vraagOpScherm(page); await sluitMeldingen(page); await wacht(300);
    const pi = await bestellijstPdf(page, ONVOLLEDIG, 'PDF invoer');
    t = plat(pdfTekst(pi));
    check('PDF invoer, toebehoren: "E22 omgekeerd" en "geen (meegeleverd)", diepte en oordeel', / E22 binnen .*omgekeerd/.test(t) && /geen .*\(meegeleverd\)/.test(t) &&
      /past · 6 mm/.test(t) && / 35 E22 /.test(t), (t.match(/Merk Aantal Sponningmaat.{0,300}/) || [''])[0]);
    await ctx.close();
  }

  /* ══ 8 ════════════════════════════════════════════════════════ */
  if (doe('8')) {
    console.log('\n8. Naslag: glasaftrek per rooster, alle glaslatten');
    latProject();
    ({ ctx, page } = await openProject());
    await page.click('.tab-btn:has-text("Naslag")'); await wacht(400);
    await page.click('.nsl-kop:has-text("Glaslatten (Jongeneel)")'); await wacht(400);
    m = await page.evaluate(() => ({ rijen: document.querySelectorAll('table.nsl-latten tbody tr').length, aantal: GlasLatten.LATTEN.length,
      ids: [...document.querySelectorAll('table.nsl-latten tbody tr td:nth-child(3) b')].map(b => b.textContent).join(','),
      montage: document.querySelectorAll('table.nsl-latten .lat-montage').length,
      tek: document.querySelectorAll('table.nsl-latten img[src*="-tek.jpg"]').length }));
    check('alle ' + m.aantal + ' latten uit latten.js (één bron) met foto en maattekening', m.rijen === m.aantal && m.aantal === 28 &&
      m.ids.split(',').length === 28 && m.tek >= 20, JSON.stringify(m));
    check('bij E7, E22, GLD1, GLD2 de tekening normaal en omgekeerd', m.montage === 8, m.montage);
    await page.click('table.nsl-latten .nsl-lat-foto >> nth=0'); await wacht(300);
    check('tik op een foto: groot met de maten', await page.$eval('.lat-groot', e => /A4 glaslat schuin 17x15/.test(e.innerText)).catch(() => false));
    await page.click('.lat-groot'); await wacht(200);
    await page.click('.nsl-kop:has-text("Duco ventilatieroosters")'); await wacht(400);
    m = await page.evaluate(() => { const t = [...document.querySelectorAll('table.legenda-foto')].find(x => /Roostertype/.test(x.innerText));
      const kop = [...t.querySelectorAll('thead th')].map(th => th.textContent);
      const i = kop.indexOf('Glasaftrek');
      const rij = n => [...t.querySelectorAll('tbody tr')].find(tr => tr.children[1].textContent === n);
      return { i, ton10: rij('DucoTon 10').children[i].textContent, ton18: rij('DucoTon 18').children[i].textContent,
               smart: rij('DucoSmart 60').children[i].textContent, uitleg: [...t.querySelectorAll('tbody tr')].some(tr => /glasaftrek/i.test(tr.lastElementChild.textContent)) }; });
    check('rooster-tabel: kolom Glasaftrek (DucoTon 10: 80 mm, DucoTon 18: 120 mm, DucoSmart 60: 60 mm)', m.i > 0 && m.ton10 === '80 mm' &&
      m.ton18 === '120 mm' && m.smart === '60 mm', JSON.stringify(m));
    check('en niet nog eens in de toelichting', !m.uitleg);
    // Zoeken in de Naslag vindt ook de latten (controle v115).
    await page.fill('#naslagZoekVeld', 'neuslat'); await wacht(400);
    m = await page.evaluate(() => document.querySelectorAll('table.nsl-latten tbody tr').length);
    check('zoeken op "neuslat": de 7 neuslatten', m === 7, m);
    await page.fill('#naslagZoekVeld', ''); await wacht(200);
    await ctx.close();
  }

  /* ══ 9 ════════════════════════════════════════════════════════ */
  if (doe('9')) {
    console.log('\n9. Versie en .gitignore');
    const lees = n => fs.readFileSync(path.join(map, n), 'utf8');
    check('.gitignore: "Claude outputs/" (de map van de Claude-app, in v114 per ongeluk mee gepusht)', /^Claude outputs\/$/m.test(lees('.gitignore')));
    // v116: "v115 of later" (een latere versie mag deze reeks niet rood maken).
    const versies = [lees('index.html').match(/APP_VERSIE = 'v(\d+)'/), lees('pdf.js').match(/PDF_VERSIE = 'v(\d+)'/),
                     lees('sw.js').match(/const VERSIE = 'v(\d+)'/)].map(m => m ? +m[1] : 0);
    check('versie v115 of later, gelijk in index.html, pdf.js en sw.js', versies.every(v => v === versies[0] && v >= 115), JSON.stringify(versies));
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
