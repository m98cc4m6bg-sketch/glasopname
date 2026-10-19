/* Testreeks v111 — node test-v111.js   (en: node test-v111.js --mutaties)

   Onderwerp: de bediening bij een ventilatierooster (stang of koord, gaat
   naar de leverancier), het tabblad Toebehoren (glaslatten met zaagplan,
   glasband, glaskit, wienersprossen-tape; alleen intern) en de favicon.

   Echte situatie: Jan meet een renovatie in. Een paar ruiten krijgen een
   Duco-rooster; bij één ervan moet een bedieningsstang mee (hoog raam).
   Daarna wil de werkplaats weten hoeveel glaslatten (lengtes van 4 m),
   band, kit en tape er nodig zijn, met een neuslat onder.

   Belofte (keuzes van Jan, 19-10-2026):
   - de bediening staat op de bestellijst (Van Noordenne), met het aantal per
     rooster en de lengte (leeg = standaard), en telt na een bestelling als
     wijziging; ruiten zonder bediening veranderen niet (kenmerk);
   - Toebehoren rekent zoals afgesproken (sponningmaat + 20 mm verstek,
     zaagplan over 4 m met 5 mm zaagsnede, 10 % als controle; band 2 ×
     omtrek + 4 × breedte bij rooster; kit 4 × 5 mm binnen en buiten,
     265 ml per koker; tape 1 strook per kant per roede);
   - instellingen per project aan te passen, afwijkingen zichtbaar, terug
     naar standaard;
   - Toebehoren staat in de PDF invoer, NIET op de bestellijst;
   - onderlat en "latten aan twee kanten" mogen ook na een bestelling (gaat
     niet naar de leverancier), maar niet bij alleen kijken; ze staan in
     info.toebehoren.perRuit, niet op de ruit (geen nieuw stempel);
   - uit de controle: rooster Nee via doorvoeren haalt de bediening weg;
     de aanvulling noemt de oude bediening; ongedaan maken; een komma in
     een instelling; een emoji verminkt de pdf niet meer.

   Wat deze opstelling aanneemt: zoals test-v110.js (nagebootste database
   in node, echte Chromium, pdf teruggelezen met pdfplumber). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  verstek: ["toebehoren.js", "      var t = g.VERSTEK_TOESLAG_MM;", "      var t = 0;"],
  zaagsnede: ["toebehoren.js", "      var nodig = l + snede;", "      var nodig = l;"],
  zaagpast: ["toebehoren.js", "        if (staven[i].rest >= l) {", "        if (staven[i].rest >= l + snede) {"],
  controle: ["toebehoren.js", "      var controle = Math.ceil(totaal * (1 + g.CONTROLE_VERLIES_PROCENT / 100) / g.STAAF_MM);", "      var controle = Math.ceil(totaal / g.STAAF_MM);"],
  sponning: ["toebehoren.js", "    if (r.maatsoort === 'Sponningmaat' && getal(r.breedte) > 0 && getal(r.hoogte) > 0) {", "    if (0) {"],
  onderlatRuit: ["toebehoren.js", "      var onder = eigen.onderlat || k.standaardOnderlat || k.standaardLat;", "      var onder = k.standaardOnderlat || k.standaardLat;"],
  tweeKanten: ["toebehoren.js", "      var dubbel = eigen.tweeKanten ? 2 : 1;", "      var dubbel = 1;"],
  opDeRuit: ["toebehoren.js", "    zetPerRuit(p, r.id, 'onderlat', LATTYPES.indexOf(waarde) >= 0 ? waarde : '');", "    r.onderlat = waarde; r.gewOp = new Date().toISOString(); zetPerRuit(p, r.id, 'onderlat', LATTYPES.indexOf(waarde) >= 0 ? waarde : '');"],
  latRol: ["toebehoren.js", "alsOnder === perRuit.length ? 'rondom' :", "0 ? 'rondom' :"],
  komma: ["toebehoren.js", "    if (t.indexOf(',') >= 0) t = t.replace(/\\./g, '').replace(',', '.');", ""],
  geenGetal: ["toebehoren.js", "    if (tekst !== '' && (n == null || (n === 0", "    if (tekst !== '' && ((n === 0"],
  roosterBand: ["toebehoren.js", "      var roosterM = r.rooster === 'Ja' ? g.BAND_ROOSTER_FACTOR * gb / 1000 / 2 : 0;", "      var roosterM = r.rooster === 'Ja' ? g.BAND_ROOSTER_FACTOR * gb / 1000 : 0;"],
  kitRooster: ["toebehoren.js", "        var ml = omtrekM * n * mlPerM;", "        var ml = (omtrekM + roosterM) * n * mlPerM;"],
  tapeAftrek: ["toebehoren.js", "        var hoog = Math.max(0, gh - roosterAftrek(r));", "        var hoog = gh;"],
  bandKleur: ["toebehoren.js", "        var c = k[kant];", "        var c = k.binnen;"],
  deler: ["toebehoren.js", "      var minimaal = DELERS.indexOf(k) >= 0 ? v > 0 : v >= 0;", "      var minimaal = v >= 0;"],
  delerTypen: ["toebehoren.js", " || (n === 0 && DELERS.indexOf(sleutel) >= 0))) { renderToebehoren(); return; }", ")) { renderToebehoren(); return; }"],
  afwijkingBewaard: ["toebehoren.js", "    else p.afwijkingen[sleutel] = n;", "    else {}"],
  standaardKnop: ["toebehoren.js", "    delete p.afwijkingen;\n", ""],
  alleOnderlat: ["toebehoren.js", "    (rijen || []).filter(heeftInhoud).forEach(function (r) { zetPerRuit(p, r.id, 'onderlat', w); });", ""],
  kijken: ["toebehoren.js", "  function magNiet() { return window.kijkWeigert ? kijkWeigert() : false; }", "  function magNiet() { return false; }"],
  kijkenScherm: ["toebehoren.js", "    var uit = kijken ? ' disabled' : '';", "    var uit = '';"],
  waardeTekst: ["toebehoren.js", "' ' + nlWaarde(g[s]) + ' ' + esc(UITLEG[s][1])", "' ' + nl(g[s], 1) + ' ' + esc(UITLEG[s][1])"],
  pdfInvoer: ["pdf.js", "        toebehorenPagina(doc);\n\n        spoorregel(doc);", "        spoorregel(doc);"],
  kenmerkAltijd: ["index.html", "    (rij.bediening && rij.rooster === 'Ja' ? '|bed:' + rij.bediening", "    ('|bed:' + rij.bediening"],
  kenmerkNooit: ["index.html", "    (rij.bediening && rij.rooster === 'Ja' ? '|bed:' + rij.bediening", "    (0 ? '|bed:' + rij.bediening"],
  bulkRooster: ["bulk.js", "          delete r.bediening; delete r.bedieningAantal; delete r.bedieningLengte; } },", "          } },"],
  zonderRooster: ["index.html", "  if (!r || !roosterJa || !r.bediening", "  if (!r || !r.bediening"],
  wasBediening: ["pdf.js", "    if (bedOud !== bedNu) was += ', ' + (bedOud || 'zonder bediening');", ""],
  undoBediening: ["undo.js", "    omhul('setBediening', 'Bediening gewijzigd');", ""],
  kortRooster: ["index.html", " || (r.kort && !('rooster' in r))", ""],
  kenmerkRooster: ["index.html", "    (rij.bediening && rij.rooster === 'Ja' ? '|bed:'", "    (rij.bediening ? '|bed:'"],
  terugRooster: ["index.html", "    if (doel.rooster !== 'Ja') BEDIENING_VELDEN.forEach(v => { delete doel[v]; });", ""],
  lengteControle: ["index.html", "  else if (!(n >= 100 && n <= 9999)) {", "  else if (!(n >= 1)) {"],
  duizendtal: ["index.html", "  const n = /^\\d{1,3}(\\.\\d{3})+$/.test(tekst) ? parseInt(tekst.replace(/\\./g, ''), 10) :", "  const n = 0 ? 0 :"],
  omzetten: ["pdf.js", "      .replace(/\\u0142/g, 'l')", "      .replace(/\\u0142/g, '')"],
  winAnsi: ["pdf.js", "\\u0160\\u0161", ""],
  emoji: ["pdf.js", "|(?![\\u00a9\\u00ae\\u2122])\\p{Extended_Pictographic}/gu, '')", "/gu, '')"],
  roosterNee: ["index.html", "    if (r && r.bediening && !invoerOpSlot()) { delete r.bediening; delete r.bedieningAantal; delete r.bedieningLengte; }", ""],
  lengteLeeg: ["index.html", "  if (tekst === '') delete r.bedieningLengte;", "  if (tekst === '') {}"],
  slotBediening: ["index.html", "function setBediening(id, waarde) {\n  if (slotWeigert()) return;", "function setBediening(id, waarde) {",
                  "  'setBediening', 'setBedieningLengte',", ""],
  letOp: ["pdf.js", "        var bedRegel = (stangen || koorden) ?", "        var bedRegel = 0 ?"],
  bestelKolom: ["pdf.js", "      { kop: 'Bediening',  w: 30, haal: function (r) { return window.bedieningTekst ? bedieningTekst(r) : ''; } },\n", ""],
  invoerKolom: ["pdf.js", "      { kop: 'Bediening', w: 26, haal: function (r) { return window.bedieningTekst ? bedieningTekst(r, true) : ''; } },\n", ""],
  samenvatting: ["index.html", "      <td>${esc(r.ralKleur)}</td>\n      <td>${esc(bedieningTekst(r))}</td>\n      <td>${esc(r.glasbewerking)}</td>", "      <td>${esc(r.ralKleur)}</td>\n      <td></td>\n      <td>${esc(r.glasbewerking)}</td>"],
  bestelTab: ["index.html", "    <td>${esc(bedieningTekst(r))}</td>\n    <td>${esc(r.glasbewerking !== 'Helder (standaard)'", "    <td></td>\n    <td>${esc(r.glasbewerking !== 'Helder (standaard)'"],
  export: ["index.html", "      isStrijdig(r) ? (window.STRIJDIG_NOOT || '') : '',\n      bedieningTekst(r)\n", "      isStrijdig(r) ? (window.STRIJDIG_NOOT || '') : '',\n      ''\n"],
  verschil: ["index.html", "    if (bo !== bn) uit.push('bediening ' + (bo || '(geen)') + ' → ' + (bn || '(geen)'));", ""],
  favicon: ["sw.js", "'./favicon-v3.ico'", "'./favicon.ico'"],
  pijl: ["pdf.js", "      .replace(/\\u2192/g, '->')", ""],
  metRooster: ["toebehoren.js", "g.BAND_ROOSTER_FACTOR && u.metRooster ?", "g.BAND_ROOSTER_FACTOR ?"],
};
const WAAR = {
  verstek: '1', zaagsnede: '1', zaagpast: '1', controle: '1', sponning: '1', onderlatRuit: '2', tweeKanten: '2', roosterBand: '4',
  kitRooster: '4', tapeAftrek: '4', bandKleur: '2', deler: '2', delerTypen: '2', afwijkingBewaard: '2', standaardKnop: '2',
  alleOnderlat: '2', kijken: '6', kijkenScherm: '6', waardeTekst: '2', pdfInvoer: '3', kenmerkAltijd: '4', kenmerkNooit: '5',
  roosterNee: '4', lengteLeeg: '4', slotBediening: '5', letOp: '4', bestelKolom: '4', invoerKolom: '4', samenvatting: '4',
  bestelTab: '4', export: '4', verschil: '5', favicon: '6', pijl: '3', metRooster: '3', opDeRuit: '2', latRol: '2', komma: '2',
  geenGetal: '2', bulkRooster: '4', zonderRooster: '4', wasBediening: '5', undoBediening: '4', emoji: '3',
  kortRooster: '4', kenmerkRooster: '4', terugRooster: '5', lengteControle: '4', duizendtal: '4', omzetten: '3', winAnsi: '3',
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v111-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v111-pdf-'));
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

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, m, t, u;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Toebehoren rekent zoals afgesproken (met de hand nagerekend)');
    tbProject();
    ({ ctx, page } = await openProject());
    await naarToebehoren(page);
    u = await page.evaluate(() => { const x = toebehorenBerekenen(); return JSON.parse(JSON.stringify(x)); });
    const lat = u.latten.find(l => l.type === 'Glaslat') || {}, neus = u.latten.find(l => l.type === 'Neuslat') || {};
    // Latten = sponning + 20 mm. X: 1020 (boven), 2× 2020; Y ×2: 2× 920, 4× 1520. Onder: 1020 + 2× 920.
    check('glaslatten: de stukken zijn sponningmaat + 20 mm verstek', JSON.stringify(lat.plan && lat.plan.map(s => s.stukken)) ===
      JSON.stringify([[2020, 1520], [2020, 1520], [1520, 1520, 920], [1020, 920]]), JSON.stringify(lat.plan && lat.plan.map(s => s.stukken)));
    check('zaagplan: 4 lengtes glaslat, controle (12,98 m + 10 %) ook 4', lat.staven === 4 && lat.controle === 4 && lat.totaalMm === 12980,
      lat.staven + ' / ' + lat.controle + ' / ' + lat.totaalMm);
    check('neuslat onder: 1020 + 920 + 920 in 1 lengte', neus.staven === 1 && neus.totaalMm === 2860, JSON.stringify(neus).slice(0, 120));
    const band = u.band[0] || {}, kit = u.kit[0] || {};
    // Omtrek glas: X 2×(992+1992) = 5,968 m; Y 2×(892+1492) × 2 = 9,536 m → 15,504 m per kant, 2 kanten.
    check('glasband wit 3 mm: 2 × 15,504 = 31,008 m, 1 rol (100 m)', u.band.length === 1 && Math.abs(band.meters - 31.008) < 1e-6 &&
      band.rollen === 1 && band.kleur === 'wit' && band.dikte === 3, JSON.stringify(u.band));
    check('glaskit: 31,008 m × 20 ml/m = 620,16 ml ÷ 265 → 3 kokers', u.kit.length === 1 && Math.abs(kit.ml - 620.16) < 1e-6 &&
      kit.kokers === 3, JSON.stringify(u.kit));
    // Tape: Y heeft 2 horizontale (892) en 2 verticale (1492) roeden, 1 strook per kant, ×2 ruiten.
    check('tape: (2×892 + 2×1492) × 2 kanten × 2 ruiten = 19,072 m, 1 rol', Math.abs(u.tape.meters - 19.072) < 1e-6 && u.tape.rollen === 1,
      JSON.stringify(u.tape));
    t = await tbTekst(page);
    check('op het tabblad: "4 × 4,0 m Glaslat", "1 × 4,0 m Neuslat", "31,0 m Glasband wit 3 mm", "3 kokers"',
      /4 × 4,0 m Glaslat \(boven en zijkanten\)/.test(t) && /1 × 4,0 m Neuslat \(onder\)/.test(t) && /31,0 m Glasband wit 3 mm/.test(t) &&
      /3 kokers Glaskit wit/.test(t), t.slice(0, 400));
    check('met de rekenregel eronder (narekenbaar)', /620 ml ÷ 265 ml bruikbaar per koker → 3 kokers/.test(t) &&
      /Controle: 13,0 m \+ 10 % = 14,3 m → 4 lengtes/.test(t), t.slice(0, 900));
    check('en "Gerekend met de standaardwaarden"', /Gerekend met de standaardwaarden/.test(t));
    // Randgevallen van het zaagplan en de sponningmaat (los gerekend, dan het project terug).
    u = await page.evaluate(() => {
      const bewaard = rijen;
      const r = (merk, b, h, extra) => Object.assign({ id: 900 + merk.length, merk: merk, aantal: 1, maatsoort: 'Sponningmaat', breedte: b, hoogte: h,
        glasType: 'HR++ glas', opbouw: '4-15-4', rooster: 'Nee', roedenverdeling: 'Geen roedenverdeling' }, extra || {});
      const uit = {};
      const reken = (naam, rij) => { berekenGlasMaat(rij); rijen = [rij]; const x = toebehorenBerekenen(); rijen = bewaard;
        const gl = x.latten.find(l => l.type === 'Glaslat') || {};
        uit[naam] = { plan: (gl.plan || []).map(s => s.stukken), staven: gl.staven, controle: gl.controle, sponning: x.perRuit[0].sponning }; };
      reken('A', r('A', '980', '980', { aantal: 4 }));     // 12 latten van 1000: met zaagsnede 3 per staaf
      reken('B', r('B', '1975', '1980'));                  // 2000, 2000, 1995: de 1995 past precies achter een 2000
      reken('C', r('C', '1000', '2000', { correctie: '6' }));   // eigen correctie: de sponning blijft de ingevoerde maat
      return uit;
    });
    check('zaagsnede telt: 12 latten van 1,0 m → 4 lengtes (3 per lengte), controle 12 m + 10 % → 4',
      u.A.staven === 4 && u.A.plan.every(p => p.length === 3) && u.A.controle === 4, JSON.stringify(u.A));
    check('de laatste lat mag precies tot het eind: 2.000 + 1.995 in één lengte (de laatste zaagsnede valt eraf)',
      JSON.stringify(u.B.plan) === '[[2000,1995],[2000]]', JSON.stringify(u.B));
    check('sponningmaat met eigen correctie: de lat volgt de ingevoerde maat (1000 × 2000), niet glas + speling',
      u.C.sponning.b === 1000 && u.C.sponning.h === 2000, JSON.stringify(u.C));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Instellingen per project, onderlat per ruit, latten aan twee kanten');
    tbProject();
    ({ ctx, page } = await openProject());
    await naarToebehoren(page);
    await page.click('.tb-inst-kop');
    await wacht(200);
    // Kitvoeg 5 × 6 mm (in de praktijk uitproberen): 31,008 m × 30 ml = 930,24 ml → 4 kokers.
    let inv = page.locator('.tb-getallen label', { hasText: 'Kitvoeg breedte' }).locator('input');
    await inv.fill('5'); await inv.dispatchEvent('change'); await wacht(300);
    inv = page.locator('.tb-getallen label', { hasText: 'Kitvoeg diepte' }).locator('input');
    await inv.fill('6'); await inv.dispatchEvent('change'); await wacht(300);
    t = await tbTekst(page);
    check('kitvoeg 5 × 6: 930 ml → 4 kokers', /4 kokers Glaskit wit/.test(t) && /= 930 ml/.test(t), (t.match(/kokers Glaskit.{0,160}/) || [''])[0]);
    check('de balk zegt "Gerekend met 2 afwijkende waarden: kitvoeg breedte 5 mm, kitvoeg diepte 6 mm"',
      /Gerekend met 2 afwijkende waarden: kitvoeg breedte 5 mm, kitvoeg diepte 6 mm/.test(t), (t.match(/Gerekend met.{0,120}/) || [''])[0]);
    check('in het project bewaard: alleen de afwijkingen', await opgeslagenAls(() => JSON.stringify((info().toebehoren || {}).afwijkingen) ===
      JSON.stringify({ KITVOEG_BREEDTE_MM: 5, KITVOEG_DIEPTE_MM: 6 })), JSON.stringify(info().toebehoren));
    // Band buiten grijs 4 mm.
    await page.selectOption('select[onchange*="buiten.kleur"]', 'grijs');
    await wacht(300);
    await page.selectOption('select[onchange*="buiten.dikte"]', '4');
    await wacht(300);
    u = await page.evaluate(() => JSON.parse(JSON.stringify(toebehorenBerekenen())));
    check('buiten grijs 4 mm: twee soorten band (15,5 m elk) en kit in twee kleuren', u.band.length === 2 &&
      u.band.every(b => Math.abs(b.meters - 15.504) < 1e-6) && u.band.some(b => b.kleur === 'grijs' && b.dikte === 4) &&
      u.kit.length === 2 && u.kit.some(k => k.kleur === 'grijs'), JSON.stringify([u.band, u.kit]));
    // Onderlat van Y: ventilatielat.
    await page.locator('.tb-tabel tbody tr', { hasText: 'Y' }).locator('select.tb-onderlat').selectOption('Ventilatielat');
    await wacht(300);
    u = await page.evaluate(() => JSON.parse(JSON.stringify(toebehorenBerekenen())));
    const vent = u.latten.find(l => l.type === 'Ventilatielat') || {};
    check('Y met ventilatielat: 2 × 920 als ventilatielat, neuslat alleen X (1020)', vent.stukken === 2 && vent.totaalMm === 1840 &&
      (u.latten.find(l => l.type === 'Neuslat') || {}).totaalMm === 1020, JSON.stringify(u.latten.map(l => l.type + ':' + l.totaalMm)));
    check('bewaard bij het project (perRuit), niet op de ruit: geen nieuw stempel', await opgeslagenAls(() =>
      perRuitDb('Y').onderlat === 'Ventilatielat') && !('onderlat' in dbRij('Y')) && dbRij('Y').gewOp === INGEMETEN.gewOp,
      JSON.stringify([info().toebehoren, dbRij('Y').gewOp]));
    t = await tbTekst(page);
    check('de tekst bij de latten klopt: "Glaslat (boven en zijkanten)", "Neuslat (onder)", "Ventilatielat (onder)"',
      /Glaslat \(boven en zijkanten\)/.test(t) && /Neuslat \(onder\)/.test(t) && /Ventilatielat \(onder\)/.test(t), t.slice(0, 300));
    await page.locator('.tb-tabel tbody tr', { hasText: 'X' }).locator('input.tb-tweekanten').check();
    await wacht(300);
    u = await page.evaluate(() => JSON.parse(JSON.stringify(toebehorenBerekenen())));
    check('X latten aan twee kanten: glaslat 12,98 + 1,02 + 2 × 2,02 = 18,04 m', (u.latten.find(l => l.type === 'Glaslat') || {}).totaalMm === 18040,
      JSON.stringify(u.latten.map(l => l.type + ':' + l.totaalMm)));
    // Alle ruiten in één keer terug naar de standaard.
    await page.selectOption('#tbAlleOnderlat', '');
    await page.click('button:has-text("Toepassen")');
    check('"Onderlat voor alle ruiten: standaard" → Y weer neuslat', await opgeslagenAls(() => perRuitDb('Y').onderlat === undefined &&
      perRuitDb('X').tweeKanten === true), JSON.stringify(info().toebehoren));
    await page.selectOption('#tbAlleOnderlat', 'Glaslat');
    await page.click('button:has-text("Toepassen")');
    await wacht(300);
    t = await tbTekst(page);
    m = await page.evaluate(() => toebehorenBerekenen().latten.map(l => l.type));
    check('alle onderlatten = glaslat: één soort, "Glaslat (rondom)"', /Glaslat \(rondom\)/.test(t) && JSON.stringify(m) === '["Glaslat"]',
      JSON.stringify(m) + ' ' + t.slice(0, 100));
    await page.selectOption('#tbAlleOnderlat', '');
    await page.click('button:has-text("Toepassen")');
    await wacht(300);
    // Een komma (zoals op een Nederlands toetsenbord) en iets wat geen getal is.
    inv = page.locator('.tb-getallen label', { hasText: 'Kitvoeg breedte' }).locator('input');
    await inv.fill('4,5'); await inv.dispatchEvent('change'); await wacht(300);
    check('"4,5" typen → kitvoeg 4,5 mm', await page.evaluate(() => projectInfo.toebehoren.afwijkingen.KITVOEG_BREEDTE_MM) === 4.5);
    inv = page.locator('.tb-getallen label', { hasText: 'Kitvoeg breedte' }).locator('input');
    await inv.fill('abc'); await inv.dispatchEvent('change'); await wacht(300);
    check('"abc" typen → er verandert niets (blijft 4,5)', await page.evaluate(() => projectInfo.toebehoren.afwijkingen.KITVOEG_BREEDTE_MM) === 4.5 &&
      await page.locator('.tb-getallen label', { hasText: 'Kitvoeg breedte' }).locator('input').inputValue() === '4,5');
    const kit0 = await page.evaluate(() => { toebehorenGetal('KITVOEG_DIEPTE_MM', '0'); return [projectInfo.toebehoren.afwijkingen.KITVOEG_DIEPTE_MM,
      /NaN/.test(document.getElementById('toebehorenInhoud').innerText)]; });
    check('kitvoeg 0 wordt niet bewaard (gaf "NaN m voeg")', kit0[0] === 6 && !kit0[1], JSON.stringify(kit0));
    await page.evaluate(() => toebehorenGetal('KITVOEG_BREEDTE_MM', '5'));
    // Een staaflengte van 0 (getypt, of van een ander apparaat) telt niet: anders "oneindig veel lengtes".
    const nulBewaard = await page.evaluate(() => { toebehorenGetal('STAAF_MM', '0'); return 'STAAF_MM' in ((projectInfo.toebehoren || {}).afwijkingen || {}); });
    check('staaflengte 0 typen: wordt niet bewaard', !nulBewaard);
    u = await page.evaluate(() => { const kort = x => JSON.stringify([x.latten.map(l => l.staven + '/' + l.controle), x.tape.rollen]);
      const gewoon = kort(toebehorenBerekenen());
      projectInfo.toebehoren.afwijkingen.STAAF_MM = 0; projectInfo.toebehoren.afwijkingen.TAPE_ROL_M = 0;
      const nul = kort(toebehorenBerekenen()); delete projectInfo.toebehoren.afwijkingen.STAAF_MM; delete projectInfo.toebehoren.afwijkingen.TAPE_ROL_M;
      return { gewoon: gewoon, nul: nul }; });
    check('en 0 in het project (ander apparaat) → gewoon 4 m en 25 m', u.gewoon === u.nul && /^\[\["\d+\/\d+"/.test(u.nul), JSON.stringify(u));
    await ctx.close();
    // Opnieuw openen: de instellingen zijn er nog.
    ({ ctx, page } = await openProject());
    await naarToebehoren(page);
    t = await tbTekst(page);
    check('na opnieuw openen: nog steeds 2 afwijkende waarden en grijs 4 mm buiten', /Gerekend met 2 afwijkende waarden/.test(t) &&
      /Glasband grijs 4 mm/.test(t), t.slice(0, 300));
    await page.click('.tb-inst-kop');
    await page.click('button:has-text("Alles terug naar standaard")');
    check('Alles terug naar standaard: geen afwijkingen meer', await opgeslagenAls(() => !(info().toebehoren || {}).afwijkingen) &&
      /Gerekend met de standaardwaarden/.test(await tbTekst(page)));
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. In de PDF invoer wel, op de bestellijst niet');
    // Een opmerking van een iPhone met een emoji en een lang streepje.
    tbProject(p => { p.data.rijen[0].opmerking = 'achter — boven 🙂 links, dikte ≥ 6 mm'; p.data.rijen[1].opmerking = 'Łódź, Żółkiewskiego, Škoda™'; });
    ({ ctx, page } = await openProject());
    const pi = await bestellijstPdf(page, ONVOLLEDIG, 'PDF invoer');
    t = plat(pdfTekst(pi));
    check('PDF invoer: pagina "Toebehoren - intern, niet voor de leverancier" met de totalen', /Toebehoren - intern, niet voor de leverancier/.test(t) &&
      /4 x 4,0 m Glaslat \(boven en zijkanten\)/.test(t) && /Glasband wit 3 mm: 31,0 m \(1 rol\)/.test(t) &&
      /Glaskit wit: 3 kokers \(290 ml\)/.test(t) && /Wienersprossen-tape \(dubbelzijdig\): 19,1 m \(1 rol\)/.test(t),
      (t.match(/Toebehoren - intern.{0,500}/) || [''])[0]);
    check('met de gebruikte instellingen en de zaaglijst', /Gerekend met: lengte glaslat 4\.000 mm/.test(t) &&
      /Zaaglijst Glaslat \(4 x 4,0 m\) 1: 2\.020 \+ 1\.520/.test(t), (t.match(/Gerekend met.{0,200}/) || [''])[0] + ' | ' +
      (t.match(/Zaaglijst.{0,120}/) || [''])[0]);
    if (process.env.PLAATJES) {
      fs.copyFileSync(pi, path.join(process.env.PLAATJES, 'v111-pdf-invoer.pdf'));
      await naarToebehoren(page); await page.click('.tb-inst-kop'); await wacht(300);
      await page.screenshot({ path: path.join(process.env.PLAATJES, 'v111-toebehoren.png'), fullPage: true });
      await page.click('.tab-btn:has-text("Invoer")'); await wacht(300);
    }
    check('de rekenregels zijn leesbaar (pijl als "->", geen rare tekens)', /zaagsnede -> 4 x 4,0 m/.test(t) && /-> 3 kokers/.test(t) &&
      !/!'|\u2192/.test(t), (t.match(/zaagsnede.{0,40}/) || [''])[0]);
    check('zonder rooster in het project: geen regel over band bij een rooster', !/bij een rooster/.test(t.replace(/extra band bij rooster/g, '')),
      (t.match(/.{0,40}bij een rooster.{0,40}/) || [''])[0]);
    const pb = await bestellijstPdf(page);
    t = plat(pdfTekst(pb));
    check('een emoji verminkt de regel niet meer: "achter — boven links" leesbaar', /achter — boven +links/.test(t) && !/\(cid:0\)/.test(t) &&
      />= 6 mm/.test(t) && /Lódz, Zólkiewskiego/.test(t) && /Škoda™/.test(t),
      (t.match(/.{0,30}achter.{0,60}/) || [t.slice(0, 300)])[0]);
    check('de bestellijst heeft niets van toebehoren', /Bestellijst glas/.test(t) && !/Toebehoren|Glasband|Glaskit|Zaaglijst|glaslat/i.test(t),
      t.slice(0, 200));
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Bediening bij een rooster (stang of koord, 1 of 2, lengte)');
    const ZR = { rooster: 'Ja', ducoType: 'DucoTon 10', ralKleur: 'RAL 9010' };
    tbProject(p => { p.data.rijen.push(ruit(3, 'Z', '800', '1200', Object.assign({}, KOMPLEET, INGEMETEN, ZR,
      { roedenverdeling: 'Wienersprossen - 2H x 2V (raster)', roedenbreedte: '26 mm' }))); p.data.volgendId = 4; });
    ({ ctx, page } = await openProject());
    // Toebehoren van Z (glas 792 × 1192, DucoTon 10 met glasaftrek 80 mm):
    // band per kant 2 × (0,792 + 1,192) + 2 × 0,792 = 5,552 m (binnen + buiten 11,104);
    // kit alleen de omtrek: 2 × 3,968 m × 20 ml = 158,72 ml; tape (2 × 792 + 2 × (1192 − 80)) × 2 = 7,616 m.
    const pz = await page.evaluate(() => { const p = toebehorenBerekenen().perRuit.find(x => x.rij.merk === 'Z');
      return { band: p.bandM, kit: p.kitMl, tape: p.tapeM }; });
    check('Z met rooster: band 11,104 m (2 × de breedte extra per kant), kit 158,72 ml, tape 7,616 m (rooster eraf)',
      Math.abs(pz.band - 11.104) < 1e-6 && Math.abs(pz.kit - 158.72) < 1e-6 && Math.abs(pz.tape - 7.616) < 1e-6, JSON.stringify(pz));
    await naarToebehoren(page);
    t = await tbTekst(page);
    check('met een rooster: de rekenregel noemt "plus bij een rooster 2 × de breedte; binnen en buiten samen 4 ×"',
      /plus bij een rooster 2 × de breedte; binnen en buiten samen 4 ×/.test(t), (t.match(/omtrek van elke ruit.{0,120}/) || [''])[0]);
    await page.click('.tab-btn:has-text("Invoer")'); await wacht(300);
    // Het kenmerk van een ruit zonder bediening is precies wat v109 (live) uitrekent: geen bestaande bestelling raakt "gewijzigd".
    const live = fs.readFileSync(path.join(process.env.OUD || '/tmp/live109', 'index.html'), 'utf8');
    const velden = live.match(/const KENMERK_VELDEN = [\s\S]*?\];/)[0];
    const fn = live.match(/function ruitKenmerk\(rij\) \{[\s\S]*?\n\}/)[0];
    const oudKenmerk = new Function('rij', velden + '\n' + fn + '\nreturn ruitKenmerk(rij);');
    const zonder = await page.evaluate(() => rijen.map(r => [JSON.parse(JSON.stringify(r)), ruitKenmerk(r)]));
    check('kenmerk zonder bediening = het kenmerk van v109 (alle drie de ruiten)', zonder.every(([r, k]) => oudKenmerk(r) === k),
      zonder.map(([r, k]) => r.merk + ' ' + k + '/' + oudKenmerk(r)).join(' '));
    m = await page.evaluate(() => { const r = Object.assign({}, rijen[0], { rooster: 'Nee', bediening: 'stang', bedieningAantal: 2 });
      return [JSON.parse(JSON.stringify(r)), ruitKenmerk(r)]; });
    check('een overgebleven bediening zonder rooster (oud apparaat) verandert het kenmerk niet', oudKenmerk(m[0]) === m[1], m[1]);
    m = await page.evaluate(() => bedieningTekst({ kort: true, merk: 'Q', aantal: 1, bediening: 'stang', bedieningAantal: 1 }));
    check('een ingekorte momentopname (zonder rooster) met een stang: "1× bedieningsstang std. lengte"', m === '1× bedieningsstang std. lengte', m);
    check('de kolom Bediening staat er (er is een rooster)', await page.isVisible('#bed-3 select.bed-soort') &&
      await page.isVisible('th.kol-bed'));
    check('het vak voor de lengte is er pas na een keuze', !(await page.isVisible('#bed-3 input.bed-lengte:not(.verborgen)')));
    await page.selectOption('#bed-3 select.bed-soort', '2|stang');
    await wacht(200);
    // Eerst iets wat geen lengte is: niets bewaren, wel zeggen.
    await page.fill('#bed-3 input.bed-lengte', '12');
    await page.dispatchEvent('#bed-3 input.bed-lengte', 'change');
    m = await wachtOpMelding(page, /geen lengte die we kunnen bestellen/, 3000);
    check('lengte "12": geweigerd met uitleg, het vak weer leeg', m.ok && await page.evaluate(() => !('bedieningLengte' in rijen[2])) &&
      await page.inputValue('#bed-3 input.bed-lengte') === '', m.tekst && m.tekst.slice(0, 120));
    await sluitMeldingen(page);
    await page.fill('#bed-3 input.bed-lengte', '1.500');
    await page.dispatchEvent('#bed-3 input.bed-lengte', 'change');
    check('2× stang van 1500 mm bewaard op de ruit ("1.500" getypt)', await opgeslagenAls(() => { const r = rijVan(1).data.rijen.find(x => x.merk === 'Z');
      return r.bediening === 'stang' && r.bedieningAantal === 2 && r.bedieningLengte === 1500; }), JSON.stringify(rijVan(1).data.rijen[2]));
    const kMet = await page.evaluate(() => ruitKenmerk(rijen[2]));
    check('met bediening verandert het kenmerk van Z wel (het gaat naar de leverancier)', kMet !== zonder[2][1]);
    // Samenvatting en Bestellijst-tabblad
    await page.click('.tab-btn:has-text("Samenvatting")'); await wacht(300);
    t = await page.$eval('#samenvattingInhoud', e => e.innerText.replace(/\s+/g, ' '));
    check('Samenvatting: kolom Bediening met "2× bedieningsstang 1500 mm"', /Bediening/.test(t) && /2× bedieningsstang 1500 mm/.test(t), t.slice(0, 300));
    t = await bestelTekst(page);
    check('tabblad Bestellijst: "2× bedieningsstang 1500 mm"', /2× bedieningsstang 1500 mm/.test(t), t.slice(0, 300));
    await page.click('.tab-btn:has-text("Invoer")'); await wacht(300);
    const pb = await bestellijstPdf(page, ONVOLLEDIG);
    t = plat(pdfTekst(pb));
    check('bestellijst-pdf: kolom Bediening met "2x bedieningsstang 1500 mm"', /Bediening/.test(t) && /RAL 9010 2x bedieningsstang 1500 /.test(t),
      (t.match(/Z .{0,200}/) || [''])[0]);
    check('en in het LET OP-kader: "Extra bediening: 2 bedieningsstangen"', /Extra bediening: 2 bedieningsstangen \(zie kolom Bediening/.test(t),
      (t.match(/LET OP.{0,300}/) || [''])[0]);
    await vraagOpScherm(page); await knop(page, 'Nee, alleen bekeken');
    const pi = await bestellijstPdf(page, ONVOLLEDIG, 'PDF invoer');
    t = plat(pdfTekst(pi));
    check('PDF invoer: "2x stang 1500 mm"', /DucoTon 10 RAL 9010 2x stang 1500 /.test(t), (t.match(/ Z 1 .{0,300}/) || [t.slice(-600)])[0]);
    // Lengte leeg = standaardlengte; koord
    await page.click('.tab-btn:has-text("Invoer")'); await wacht(300);
    await page.selectOption('#bed-3 select.bed-soort', '1|koord');
    await page.fill('#bed-3 input.bed-lengte', '');
    await page.dispatchEvent('#bed-3 input.bed-lengte', 'change');
    check('1× koord, lengte leeg → standaardlengte (veld weg)', await opgeslagenAls(() => { const r = rijVan(1).data.rijen.find(x => x.merk === 'Z');
      return r.bediening === 'koord' && r.bedieningAantal === 1 && !('bedieningLengte' in r); }), JSON.stringify(rijVan(1).data.rijen[2]));
    check('tekst "1× bedieningskoord std. lengte"', await page.evaluate(() => bedieningTekst(rijen[2])) === '1× bedieningskoord std. lengte');
    // Ongedaan maken (Cmd+Z), na het verlaten van het vak: de lengte terug, dan de keuze terug.
    await page.evaluate(() => { document.activeElement && document.activeElement.blur(); ongedaan(); });
    await wacht(300);
    m = await page.evaluate(() => [rijen[2].bediening, rijen[2].bedieningLengte]);
    check('ongedaan maken: eerst de lengte terug (koord, 1500)', m[0] === 'koord' && m[1] === 1500, JSON.stringify(m));
    await page.evaluate(() => { ongedaan(); });
    await wacht(300);
    m = await page.evaluate(() => [rijen[2].bediening, rijen[2].bedieningAantal, rijen[2].bedieningLengte]);
    check('nog eens: weer 2× stang 1500 (de keuze was één eigen stap)', m[0] === 'stang' && m[1] === 2 && m[2] === 1500, JSON.stringify(m));
    await page.evaluate(() => { opnieuw(); opnieuw(); });
    await wacht(300);
    // Een bediening die (van vroeger) blijft staan bij rooster Nee, komt nergens op.
    m = await page.evaluate(() => bedieningTekst(Object.assign({}, rijen[2], { rooster: 'Nee', bediening: 'stang' })));
    check('zonder rooster telt een overgebleven bediening niet (lege tekst)', m === '', m);
    // Rooster Nee doorvoeren (⤓ in de kop) haalt de bediening ook weg.
    await page.evaluate(() => { rijen[0].rooster = 'Ja'; rijen[0].ducoType = 'DucoTon 10'; rijen[0].bediening = 'stang';
      rijen[0].bedieningAantal = 1; renderTabel(); opslaan(); });
    await wacht(300);
    await page.locator('#invoerTabel thead th', { hasText: /^Rooster/ }).locator('.bulk-vul').first().click();
    await page.selectOption('#bulkVeld', 'Nee');
    await page.click('.bulk-pop button:has-text("Doorvoeren")');
    await wacht(300);
    m = await page.evaluate(() => rijen.filter(r => r.merk).map(r => [r.merk, r.rooster, r.bediening || ''].join(':')).join(' '));
    check('rooster Nee doorvoeren naar alle ruiten: geen bediening meer bij X en Z', m === 'X:Nee: Y:Nee: Z:Nee:', m);
    await page.evaluate(() => { ongedaan(); });
    await wacht(300);
    // Rooster op Nee: bediening weg
    await page.evaluate(() => { rijen[0].rooster = 'Nee'; rijen[0].ducoType = ''; delete rijen[0].bediening; delete rijen[0].bedieningAantal;
      renderTabel(); opslaan(); });
    await page.selectOption('#rij-3 select[onchange*="\'rooster\'"]', 'Nee');
    check('rooster op Nee → de bediening is weg', await opgeslagenAls(() => { const r = rijVan(1).data.rijen.find(x => x.merk === 'Z');
      return r.rooster === 'Nee' && !('bediening' in r) && !('bedieningAantal' in r); }), JSON.stringify(rijVan(1).data.rijen[2]));
    check('en dan is de kolom weer weg (geen enkel rooster)', !(await page.isVisible('th.kol-bed')));
    // Excel: kolom Bediening
    const xl = await page.evaluate(() => { rijen[1].rooster = 'Ja'; rijen[1].ducoType = 'DucoTon 10'; rijen[1].bediening = 'stang';
      rijen[1].bedieningAantal = 1; const t = exportTabel(); return JSON.parse(JSON.stringify(t)); });
    const kopRij = (xl.kop || xl[0] || []);
    check('export (xlsx/csv): kolom Bediening met "1× bedieningsstang std. lengte"', JSON.stringify(xl).indexOf('Bediening') >= 0 &&
      JSON.stringify(xl).indexOf('1× bedieningsstang std. lengte') >= 0, JSON.stringify(kopRij).slice(0, 300));
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Na een bestelling: toebehoren mag, bediening is een wijziging');
    const ZR = { rooster: 'Ja', ducoType: 'DucoTon 10', ralKleur: 'RAL 9010' };
    tbProject(p => { p.data.rijen.push(ruit(3, 'Z', '800', '1200', Object.assign({}, KOMPLEET, INGEMETEN, ZR))); p.data.volgendId = 4; });
    ({ ctx, page } = await openProject());
    await eersteBestelling(page);
    check('besteld en op slot', await opSlot(page));
    await naarToebehoren(page);
    await page.locator('.tb-tabel tbody tr', { hasText: 'Y' }).locator('select.tb-onderlat').selectOption('Ventilatielat');
    await page.locator('.tb-tabel tbody tr', { hasText: 'X' }).locator('input.tb-tweekanten').check();
    check('op slot mag de onderlat en "twee kanten" nog wel (het gaat niet naar de leverancier)', await opgeslagenAls(() =>
      perRuitDb('Y').onderlat === 'Ventilatielat' && perRuitDb('X').tweeKanten === true), JSON.stringify(info().toebehoren));
    check('en de ruiten zelf houden hun stempel (geen "Gewijzigd", "Oudere stand?" blijft werken)',
      ['X', 'Y'].every(m => dbRij(m).gewOp === INGEMETEN.gewOp && !('onderlat' in dbRij(m))), JSON.stringify([dbRij('X').gewOp, dbRij('Y').gewOp]));
    let w = await page.evaluate(() => { const x = teBestellen(); return { a: x.aanvulling, g: x.gewijzigd.length, r: x.regels.length }; });
    check('en dat is géén wijziging voor de leverancier (niets te bestellen)', w.a && w.g === 0 && w.r === 0, JSON.stringify(w));
    const dVoor = rijVan(1).data.rijen.map(r => r.merk + (r.gewOp || '')).join();
    await page.click('.tab-btn:has-text("Invoer")'); await wacht(300);
    await page.selectOption('#bed-3 select.bed-soort', '2|stang').catch(() => {});
    const opScherm = await page.evaluate(() => { setBediening(rijen[2].id, '2|stang'); setBedieningLengte(rijen[2].id, '900');
      return JSON.stringify([rijen[2].bediening, rijen[2].bedieningLengte]); });
    await wacht(500);
    check('bediening op slot: niet te veranderen zonder ontgrendelen', opScherm === '[null,null]' && !('bediening' in dbRij('Z')), opScherm);
    await sluitMeldingen(page);
    await ontgrendel(page);
    await page.selectOption('#bed-3 select.bed-soort', '2|stang');
    check('na ontgrendelen: 2× stang bewaard', await opgeslagenAls(() => dbRij('Z').bediening === 'stang'));
    t = await bestelTekst(page);
    check('Bestellijst: Z gewijzigd met "bediening (geen) → 2× bedieningsstang std. lengte"',
      /Z: bediening \(geen\) → 2× bedieningsstang std\. lengte/.test(t), (t.match(/Z:.{0,120}/) || [''])[0] || t.slice(0, 300));
    w = await page.evaluate(() => { const x = teBestellen(); return { g: x.gewijzigd.map(g => g.rij.merk), r: x.regels.length }; });
    check('de aanvulling: alleen Z (de toebehoren van X en Y tellen niet)', JSON.stringify(w.g) === '["Z"]' && w.r === 1, JSON.stringify(w));
    m = await page.evaluate(() => { const echt = window.oudereStand; window.oudereStand = () => ['rooster'];
      const x = rijen[0]; x.rooster = 'Ja'; x.ducoType = 'DucoTon 10'; x.bediening = 'stang'; x.bedieningAantal = 1;
      try { ruitenTerugZoalsBesteld([x.id]); } finally { window.oudereStand = echt; }
      const r = rijen.find(y => y.merk === 'X'); return [r.rooster, r.bediening || ''];
    });
    check('alleen het rooster terug zoals besteld (Nee): dan ook geen bediening meer', m[0] === 'Nee' && m[1] === '', JSON.stringify(m));
    const pb = await bestellijstPdf(page, ONVOLLEDIG);
    t = plat(pdfTekst(pb));
    check('pdf: Z VERVANGT Z uit de 1e (… zonder bediening), met 2x bedieningsstang',
      /Z VERVANGT Z uit de 1e \(1x 792/.test(t) && /792 x 1192, zonder (lengte )?bediening\)/.test(t) && /2x bedieningsstang std\./.test(t),
      (t.match(/Z VERVANGT.{0,200}/) || [''])[0] || t.slice(0, 400));
    await ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Alleen kijken, telefoon, favicon');
    tbProject();
    ({ ctx, page } = await openProject());
    await naarToebehoren(page);
    await page.evaluate(() => { window._echtKijken = window.glasAlleenKijken; window.glasAlleenKijken = () => true; renderToebehoren(); });
    check('alleen kijken: de keuzes op Toebehoren staan uit', await page.$$eval('#toebehorenInhoud select, #toebehorenInhoud input',
      l => l.length > 0 && l.every(e => e.disabled)));
    await page.evaluate(() => { toebehorenOnderlat(rijen[1].id, 'Ventilatielat'); toebehorenGetal('STAAF_MM', '3000');
      toebehorenKeuze('binnen.kleur', 'grijs'); toebehorenTweeKanten(rijen[0].id, true); toebehorenStandaard(); });
    await wacht(600);
    await sluitMeldingen(page);
    const st = await page.evaluate(() => JSON.stringify([projectInfo.toebehoren]));
    check('en de functies weigeren (niets veranderd, ook niet op het scherm)', st === '[null]' &&
      !info().toebehoren, st);
    await page.evaluate(() => { window.glasAlleenKijken = window._echtKijken; renderToebehoren(); });
    await ctx.close();
    // Telefoon: niets schuift de pagina opzij.
    const tc = await nieuweContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const tp = await nieuwePagina(tc);
    await open(tp, 1);
    await naarToebehoren(tp);
    await tp.click('.tb-inst-kop'); await wacht(200);
    const breed = await tp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    // Vergelijk met 390, niet met innerWidth: met isMobile rekt Chromium de pagina op tot de inhoud (TESTEN.md, v110).
    check('telefoon (390 breed): Toebehoren past, de pagina schuift niet opzij', breed[0] <= 390 && breed[1] <= 390, JSON.stringify(breed));
    const blokken = await tp.$$eval('.tb-blok', l => l.map(b => Math.round(b.getBoundingClientRect().width)));
    check('de blokken met totalen staan onder elkaar, volle breedte', blokken.length >= 4 && blokken.every(w => w > 300), JSON.stringify(blokken));
    if (process.env.PLAATJES) {
      await tp.screenshot({ path: path.join(process.env.PLAATJES, 'v111-telefoon-toebehoren.png'), fullPage: true });
    }
    await tc.close();
    // Favicon: nieuwe naam (Safari hield de oude vast), ook in de offline-lijst.
    const html = fs.readFileSync(path.join(map, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(map, 'sw.js'), 'utf8');
    check('favicon-v3.ico en favicon-v3.png in index.html en sw.js, de oude namen niet meer',
      /href="favicon-v3\.ico"/.test(html) && /href="favicon-v3\.png"/.test(html) && !/href="favicon\.(ico|png)/.test(html) &&
      /'\.\/favicon-v3\.ico'/.test(sw) && /'\.\/favicon-v3\.png'/.test(sw) && !/'\.\/favicon\.(ico|png)'/.test(sw) &&
      fs.existsSync(path.join(map, 'favicon-v3.ico')) && fs.existsSync(path.join(map, 'favicon-v3.png')));
    check('toebehoren.js staat in index.html én in de offline-lijst', /<script src="toebehoren\.js/.test(html) && /'\.\/toebehoren\.js'/.test(sw));
  }

  /* ══ ═══════════════════════════════════════════════════════════ */
  console.log('\nGeen fouten in de console');
  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log(fouten ? '\n' + fouten + ' FOUT(EN).' : '\nAlles goed.');
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
