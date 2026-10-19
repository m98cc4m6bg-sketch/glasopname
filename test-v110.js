/* Testreeks v110 — node test-v110.js   (en: node test-v110.js --mutaties)

   Onderwerp: het AANTAL en de BOLLETJES in een fotoblok (keuze van Jan,
   19 oktober 2026: optie A), de controle vóór de bestellijst, en de
   aanvulling als alleen het aantal anders is ("+1 extra" / "1 annuleren").

   Echte situatie: Bart meet op de bouwplaats een gevel in met de iPad. Hij
   tikt de ruiten aan op de foto. Drie gelijke ruiten (B) zijn één regel ×3,
   met drie bolletjes B. Kantoor heeft eerder een maatstaat ingelezen (D ×2,
   nog zonder plek op de foto); Bart wijst die later aan. Na de bestelling
   komt er bij B nog een ruit bij, of valt er een af.

   Belofte (Jans woorden en de harde eisen):
   - In een fotoblok lopen het aantal en de bolletjes nooit stil uit elkaar:
     het aantal is niet te typen zodra een regel bolletjes heeft; een ruit
     erbij of eraf gaat via het bolletje, en dan veranderen ze samen.
   - Maatvoering en aantallen uit een sponningmatenlijst zijn de absolute
     waarheid: nooit stil gewijzigd, ook niet bij het aanwijzen.
   - Bestaande projecten waar het niet klopt: niets stil veranderen; de app
     laat het zien en de gebruiker kiest per regel.
   - Vóór de bestellijst zegt de app het als aantal en bolletjes niet kloppen.
   - Na een bestelling: alleen een ander aantal = "+1 extra" of "1 annuleren",
     niet "VERVANGT" (dan annuleert de leverancier alles en maakt het opnieuw).

   Wat er mis gaat voor de gebruiker als het niet klopt:
   - er worden te veel of te weinig ruiten besteld (geld);
   - de monteur vindt op de foto niet waar elke ruit hoort;
   - een ingelezen aantal verandert stil.

   Wat er halverwege kan gebeuren, en hier getest wordt:
   - ‹Klaar› tikken tijdens het aanwijzen van een extra ruit;
   - Cmd+Z na een ruit erbij;
   - een besteld project (op slot) en een collega die meekijkt;
   - doorvoeren (⤓) en gelijktrekken over regels met en zonder bolletjes;
   - een oud project met meer bolletjes dan het aantal.

   Wat deze opstelling aanneemt (TESTEN.md, vraag 5):
   - De database is nagebootst in node (zoals test-v104/105.js), met een
     nabootsing van 23_bestellingen.sql. De foto is een plaatje uit de
     nagebootste opslag; tikken op de foto is een echte klik in Chromium.
   - De pdf wordt teruggelezen met pdfplumber (tekst); de bolletjes in de
     PDF invoer worden geteld via de tekenopdrachten van jsPDF (circle).
   - Echte Safari op iPad (aanraken, slepen) is hier niet te testen. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  teller: ["fotos.js", "      var telling = window.ruitenTelling ? ruitenTelling(rijenVan(f.id), 'nog geen ruiten')", "      var telling = 0 ? ruitenTelling(rijenVan(f.id), 'nog geen ruiten')"],
  strookAanwijzen: ["fotos.js", "      if (x.bol < x.aantal && aanwijzen && aanwijzen.fotoId === fotoId &&", "      if (0 &&"],
  vrijVak: ["index.html", "  if (!bol) {\n    return `<td><input type=\"number\" inputmode=\"numeric\" class=\"aantal-input\"", "  if (true) {\n    return `<td><input type=\"number\" inputmode=\"numeric\" class=\"aantal-input\""],
  vangnet: ["index.html", "  if (r && veld === 'aantal' && aantalVolgtBolletjes(r)) {\n", "  if (0) {\n"],
  vangnetScherm: ["index.html", "    // Het vak terugzetten op wat er echt staat (het kon net getypt zijn).\n    if (window.renderTabel) renderTabel();\n", ""],
  uitleg: ["index.html", "       title=\"${esc(titel)}\" onclick=\"aantalVastUitleg(${id})\"></td>`;", "       title=\"${esc(titel)}\"></td>`;"],
  menuErbij: ["fotos.js", "      (rij && !teveel ? '<button onclick=\"markErbij(\\'' + fotoId + '\\',' + index + ')\">' +", "      (0 ? '<button onclick=\"markErbij(\\'' + fotoId + '\\',' + index + ')\">' +"],
  erbijAantal: ["fotos.js", "        erbijRij.aantal = was + 1;\n", ""],
  erbijModus: ["fotos.js", "    if (aanwijzen && aanwijzen.erbij && aanwijzen.fotoId === fotoId) {", "    if (0) {"],
  erbijStap: ["fotos.js", "        foto.markeringen.push({ rijId: erbijRij.id, x: x, y: y });\n        herbereken();", "        herbereken(); opslaan(); if (window.bewaarStap) bewaarStap('tussen');\n        foto.markeringen.push({ rijId: erbijRij.id, x: x, y: y });\n        herbereken();"],
  erbijBlijft: ["fotos.js", "    if (aanwijzen && (aanwijzen.erbij || !fotoVan(aanwijzen.fotoId))) aanwijzen = null;", "    if (aanwijzen && !fotoVan(aanwijzen.fotoId)) aanwijzen = null;"],
  markWegLos: ["fotos.js", "    // renderTabel (v110): zonder bolletje is het aantal weer vrij, ook als de\n    // regel in de losse tabel staat.\n    renderTabel();", "    renderFotoTabellen();"],
  menuTeveel: ["fotos.js", "    var meer = rij && st.aantal > 1 && !teveel;", "    var meer = rij && st.aantal > 1;"],
  strook: ["fotos.js", "    if (!lijst.length) return '';\n    return '<div class=\"foto-scheef\">'", "    return '';\n    return '<div class=\"foto-scheef\">'"],
  naarBollen: ["fotos.js", "    rij.aantal = n;\n", ""],
  verlagenVraag: ["fotos.js", "    if (n < was && window.appVraag && !await appVraag(", "    if (0 && !await appVraag("],
  teveelWeg: ["fotos.js", "        return ++n <= max;", "        return ++n <= max + 1;"],
  welkeWeg: ["fotos.js", "        if (mk.rijId !== rijId) return true;\n        return ++n <= max;", "        if (mk.rijId !== rijId) return true;\n        return n++ >= 1;"],
  aanwijzenRij: ["fotos.js", "    for (var i = 0; i < open; i++) rij2.push(rijId);", ""],
  bulk: ["bulk.js", "        if (veld.mag && !veld.mag(r)) { vast++; return; }\n", ""],
  bulkMelding: ["bulk.js", "    if (vast && window.appMelding) {", "    if (0) {"],
  gelijk: ["kopie.js", "      var houdAantal = !!(window.aantalVolgtBolletjes && aantalVolgtBolletjes(r));", "      var houdAantal = false;"],
  controle: ["pdf.js", "      return k === 'door' ? aantalControle(bm) : k;", "      return k;"],
  controleBol: ["pdf.js", "    }).filter(function (x) { return x.bol > 0 && x.bol !== x.aantal; });", "    }).filter(function (x) { return x.bol !== x.aantal; });"],
  controleStop: ["pdf.js", "      [{ tekst: 'Stoppen', waarde: null },\n       { tekst: 'Doorgaan met deze aantallen', waarde: 'door' }],", "      [{ tekst: 'Stoppen', waarde: 'door' },\n       { tekst: 'Doorgaan met deze aantallen', waarde: 'door' }],"],
  controleMinder: ["pdf.js", "      ? bm.t.regels.concat((bm.t.minder || []).map(function (m) { return m.rij; }))", "      ? bm.t.regels"],
  extra: ["index.html", "  if (!oud || typeof oud !== 'object' || oud.aantal === undefined || !rij) return null;", "  return null;"],
  anderVeld: ["index.html", "  if (ruitKenmerk(Object.assign({}, rij, { aantal: oud.aantal })) !== kenmerkVan(oud)) return null;\n", ""],
  glasmaat: ["index.html", "  if (('glasBreedte' in oud || 'glasHoogte' in oud) &&\n      (maatGetal(oud.glasBreedte) !== maatGetal(rij.glasBreedte) ||\n       maatGetal(oud.glasHoogte) !== maatGetal(rij.glasHoogte))) return null;\n", ""],
  minderOpLijst: ["index.html", "    if (v && v.soort === 'minder') { minder.push({ rij: g.rij, oud: g.oud, nr: g.nr, nrTekst: g.nrTekst, was: v.was, nu: v.nu }); return; }", "    if (v && v.soort === 'minder') { minder.push({ rij: g.rij, oud: g.oud, nr: g.nr, nrTekst: g.nrTekst, was: v.was, nu: v.nu }); }"],
  minderMoment: ["index.html", "      if (!verschil || verschil.soort !== 'minder') return;\n      const om", "      return;\n      const om"],
  extraMoment: ["index.html", "      o.extra = verschil.was;\n", "      o.vervangt = 1;\n"],
  stuks: ["index.html", "      return n + (o && o.extra ? (parseInt(r.aantal) || 1) - o.extra : (parseInt(r.aantal) || 1));", "      return n + (parseInt(r.aantal) || 1);"],
  kolomAantal: ["pdf.js", "    return v ? v.verschil : n;", "    return n;"],
  label: ["pdf.js", "    if (v) return 'EXTRA bij '", "    if (0) return 'EXTRA bij '"],
  annMinder: ["pdf.js", "          .concat((t.minder || []).map(function (m) {", "          .concat([].map(function (m) {"],
  annExtra: ["pdf.js", "filter(function (g) { return g.oud && !(t.extra || {})[g.rij.id]; })", "filter(function (g) { return g.oud; })"],
  kopExtra: ["pdf.js", "            (Object.keys(t.extra || {}).length ? ' EXTRA = maak er zoveel bij", "            (0 ? ' EXTRA = maak er zoveel bij"],
  totaalAnn: ["pdf.js", "      var nAnnuleren = annuleren.length + (modus === 'aanvulling' ? (t.minder || []).length : 0);", "      var nAnnuleren = annuleren.length;"],
  blokHint: ["index.html", "          esc(g.verschil.join('; ')) + (g.nr ? ' (besteld in de ' + esc(g.nrTekst || g.nr + 'e') + ')' : '') + esc(hoe) +", "          esc(g.verschil.join('; ')) + (g.nr ? ' (besteld in de ' + esc(g.nrTekst || g.nr + 'e') + ')' : '') +"],
  blokTelt: ["index.html", "          ((t.vervallen.length + t.minder.length) ? (t.vervallen.length + t.minder.length) + ' te annuleren' : '') +", "          (t.vervallen.length ? t.vervallen.length + ' te annuleren' : '') +"],
  blokMinder: ["index.html", "      ? ', ' + Object.keys(b.ruiten).filter(id => b.ruiten[id] && b.ruiten[id].minder).length + ' met een lager aantal' : '') +", "      ? '' : '') +"],
  besteldIn: ["pdf.js", "    if (h.length > 1) tekst += ' (' + h.map(", "    if (0) tekst += ' (' + h.map("],
  gevraagdMinder: ["pdf.js", "        if (o && o.opLijst && o.minder) {", "        if (0) {"],
  kort: ["index.html", "  ['extra', 'extraBij', 'minder', 'minderUit', 'vervangtUit'].forEach(v => { if (o[v] !== undefined) kort[v] = o[v]; });\n", ""],
  alleenMinder: ["pdf.js", "    if (!lijst.length && !(aanvulling && moment.vervallen && Object.keys(moment.vervallen).length) && !alleenMinder) {", "    if (!lijst.length && !(aanvulling && moment.vervallen && Object.keys(moment.vervallen).length)) {"],
  nietsTeBestellen: ["pdf.js", "    if (!lijst.length && !annuleren.length && !minder.length) {", "    if (!lijst.length && !annuleren.length) {"],
  herkomst: ["index.html", "        herkomst[id] = herkomst[id].concat([{ nr: dezeNr, n: stuks != null ? stuks - o.extra : null }]);", "        herkomst[id] = [{ nr: dezeNr, n: stuks }];"],
  uitTekst: ["pdf.js", "    var uitTekst = (window.besteldInTekst ? besteldInTekst(r.id, st) : '') || nr + 'e';", "    var uitTekst = nr + 'e';"],
  annNrTekst: ["pdf.js", "                r.nrTekst || ((r.nr || 1) + 'e'), r.reden].map(schoon);", "                ((r.nr || 1) + 'e'), r.reden].map(schoon);"],
  vervangtUit: ["index.html", "      o.vervangtUit = besteldInTekst(r.id, st) || (o.vervangt + 'e');\n", ""],
  oudLos: ["index.html", "      Date.parse(rij.gewOp) >= Date.parse(oud.g)) return false;", "      false) return false;"],
  oudStempel: ["index.html", "      Date.parse(rij.gewOp) >= Date.parse(oud.g)) return false;", "      true) return false;"],
  zelfdemaat: ["pdf.js", "            String(was.glasHoogte) === String(o.glasHoogte) && was.glasType === o.glasType && was.opbouw === o.opbouw) return;", "            false) return;"],
  blokBollen: ["blokbalk.js", "      if (zelfdeRegels(toenBlok, nu) && zelfdeBollen) continue;", "      if (zelfdeRegels(toenBlok, nu)) continue;"],
  slot: ["index.html", "  'markErbij', 'markAantalNaarBollen', 'markTeveelWeg', 'markAanwijzenRij',\n", ""],
  telefoon: ["index.html", "    flex: 1; min-width: 0; padding: 7px 10px;", "    flex: 1; padding: 7px 10px;"],
  oudOffline: ["index.html", "      Date.parse(rij.gewOp) >= Date.parse(oud.g)) return false;", "      Date.parse(rij.gewOp) > Date.parse(oud.g)) return false;"],
  andereBasis: ["index.html", "      if (basis && stuks != null && vorig > 0 && vorig !== basis && !o.kort) {", "      if (0) {"],
  menuOpenPlek: ["fotos.js", "      (rij && !teveel && bollenVan(rij.id) < st.aantal\n", "      (0\n"],
  aanwijzenRijStrook: ["fotos.js", "    aanwijzen = { fotoId: fotoId, wachtrij: rij2 };\n    tekenAanwijsbalk();\n    voetBijwerken(fotoId);\n", "    aanwijzen = { fotoId: fotoId, wachtrij: rij2 };\n    tekenAanwijsbalk();\n"],
};
// Welke onderdelen een mutatie moeten vangen (de proef draait alleen die).
const WAAR = {
  aanwijzenRijStrook: '5',
  menuOpenPlek: '4',
  andereBasis: '13',
  oudOffline: '13',
  teller: '1',
  strookAanwijzen: '1',
  vrijVak: '4',
  vangnet: '4',
  vangnetScherm: '4',
  uitleg: '4',
  menuErbij: '4',
  erbijAantal: '4,8',
  erbijModus: '4',
  erbijStap: '4',
  erbijBlijft: '4',
  markWegLos: '4',
  menuTeveel: '5',
  strook: '5',
  naarBollen: '5',
  verlagenVraag: '5',
  teveelWeg: '5',
  welkeWeg: '5',
  aanwijzenRij: '5',
  bulk: '6',
  bulkMelding: '6',
  gelijk: '6',
  controle: '7',
  controleBol: '7',
  controleStop: '7',
  controleMinder: '12',
  extra: '8',
  anderVeld: '11',
  glasmaat: '11',
  minderOpLijst: '8',
  minderMoment: '8',
  extraMoment: '8',
  stuks: '8',
  kolomAantal: '8',
  label: '8',
  annMinder: '8',
  annExtra: '8',
  kopExtra: '8',
  totaalAnn: '8',
  blokHint: '8',
  blokTelt: '8',
  blokMinder: '8',
  besteldIn: '8',
  gevraagdMinder: '8',
  kort: '11',
  alleenMinder: '8',
  nietsTeBestellen: '8',
  herkomst: '11',
  uitTekst: '11',
  annNrTekst: '11',
  vervangtUit: '11',
  oudLos: '8,11,13',
  oudStempel: '11',
  zelfdemaat: '9',
  blokBollen: '5',
  slot: '10',
  telefoon: '10',
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
const IK = { id: 'u1', email: 'julian@jelierbouw.nl' };
const WACHTWOORD = { 'julian@jelierbouw.nl': 'geheim' };
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v110-'));
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
  fs.writeFileSync(doel, tekst.replace(m[1], () => m[2]));   // als functie: een $ in de vervanging blijft letterlijk
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v110-pdf-'));
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

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, m, t, r;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Vangnet (gedrag dat al goed was): aanwijzen, nieuwe ruit, telling');
    ({ ctx, page } = await gevelOpen());
    t = await page.$eval('#blok-' + FOTO + ' .blok-telling', e => e.textContent);
    // Tot v110 stond hier bij het openen het aantal REGELS ("5 ruiten"); pas
    // na een wijziging kwam de echte telling. Gevonden met deze test.
    check('de telling in de balk telt ruiten, niet regels (A1+B3+C2+E1+F1 = 8 ruiten · 5 regels)', /^8 ruiten · 5 regels$/.test(t), t);
    t = await page.$eval('#tabel-' + FOTO + ' .foto-voet', e => e.innerText);
    check('🎯 Ruiten aanwijzen (4): één van C, twee van D en F', /Ruiten aanwijzen \(4\)/.test(t), t);
    check('vóór het aanwijzen noemt de strook C (nog 1 aan te wijzen)', /C: aantal 2/.test(await strook(page)), await strook(page));
    await page.locator('#tabel-' + FOTO + ' .foto-voet button', { hasText: 'Ruiten aanwijzen' }).click();
    await wacht(300);
    t = await strook(page);
    check('tijdens het aanwijzen niet (dat is geen fout; een misser zou een ingelezen aantal verlagen), E wel', !/C: aantal/.test(t) &&
      /E: aantal 1/.test(t), t);
    t = await page.$eval('#aanwijs-' + FOTO, e => e.innerText.replace(/\s+/g, ' '));
    check('de balk vraagt om C, ruit 2 van 2', /^C .*ruit 2 van 2 · nog 4 te gaan/.test(t), t);
    await tikFoto(page, 0.62, 0.6);
    await tikFoto(page, 0.12, 0.7);
    await tikFoto(page, 0.12, 0.85);
    await tikFoto(page, 0.87, 0.85);
    check('na vier tikken: C heeft 2 bolletjes, D 2 (en zit nu in de groep), F 1', await opgeslagenAls(() =>
      dbBollen('C') === 2 && dbBollen('D') === 2 && dbRij('D').fotoId === FOTO && dbBollen('F') === 1),
      dbBollen('C') + ' / ' + dbBollen('D') + ' / ' + dbBollen('F'));
    check('het aanwijzen veranderde geen aantal (C 2, D 2: de ingelezen maatstaat is de waarheid)',
      dbRij('C').aantal === 2 && dbRij('D').aantal === 2, dbRij('C').aantal + ' / ' + dbRij('D').aantal);
    check('de aanwijsbalk is weg als alles een plek heeft', await page.$eval('#aanwijs-' + FOTO, e => e.style.display === 'none'));
    await tikFoto(page, 0.5, 0.95);
    check('een tik buiten het aanwijzen: een nieuwe ruit G ×1 met één bolletje', await opgeslagenAls(() =>
      dbRij('G').aantal === 1 && dbBollen('G') === 1 && dbRij('G').fotoId === FOTO));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Vangnet: één ruit minder via het bolletje van B ×3');
    ({ ctx, page } = await gevelOpen());
    t = await bolMenu(page, 'B', 2);
    check('het menu van B: ruit 2 van 3, met "Één ruit minder (aantal 3 → 2)"', /ruit 2 van 3/.test(t) && /Één ruit minder \(aantal 3 → 2\)/.test(t), t);
    await menuKnop(page, 'Één ruit minder');
    check('B: aantal 2 en 2 bolletjes', await opgeslagenAls(() => dbRij('B').aantal === 2 && dbBollen('B') === 2),
      dbRij('B').aantal + ' / ' + dbBollen('B'));
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    check('Cmd+Z: B weer ×3 met 3 bolletjes', await opgeslagenAls(() => dbRij('B').aantal === 3 && dbBollen('B') === 3),
      dbRij('B').aantal + ' / ' + dbBollen('B'));
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Vangnet: de bestellijst en de PDF invoer');
    ({ ctx, page } = await gevelOpen());
    const pi = await bestellijstPdf(page, ONVOLLEDIG, 'PDF invoer');
    const bol = telLetters(pdfBollen(pi));
    check('PDF invoer: de bolletjes zoals op de foto, met hun letter (A 1, B 3, C 1)',
      bol.A === 1 && bol.B === 3 && bol.C === 1, JSON.stringify(bol));
    check('en bij E (aantal 1, twee bolletjes) maar één: het papier hoort bij de bestelling', bol.E === 1, JSON.stringify(bol));
    const pb = await bestellijstPdf(page, Object.assign({}, ONVOLLEDIG, TOCH));
    t = plat(pdfTekst(pb));
    check('de bestellijst: B één regel met aantal 3, C 2, D 2', /2 3 B 892 1492/.test(t) && /3 2 C 692 692/.test(t) && /4 2 D 592 1192/.test(t),
      t.slice(0, 400));
    check('en de totalen tellen ruiten: 6 posities | 10 ruiten', /6 posities \| 10 ruiten/.test(t), (t.match(/\d+ posities.{0,30}/) || [''])[0]);
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Optie A: het aantal staat vast zodra er bolletjes zijn; een ruit erbij via het bolletje');
    ({ ctx, page } = await gevelOpen());
    const voorOpen = JSON.stringify(rijVan(1).data);
    await wacht(1500);
    check('openen verandert niets aan een project waar het niet klopt (E 1 met 2 bolletjes, C 2 met 1)',
      JSON.stringify(rijVan(1).data) === voorOpen && dbRij('E').aantal === 1 && dbBollen('E') === 2 && dbRij('C').aantal === 2);
    let vak = await vakVan(page, 'B');
    check('B (3 bolletjes): het aantal-vak staat vast (readonly), A en E ook; D (los, ingelezen) en F (geen bolletje) zijn vrij',
      await vak.evaluate(e => e.readOnly && e.classList.contains('aantal-vast')) &&
      await (await vakVan(page, 'E')).evaluate(e => e.readOnly) &&
      !(await (await vakVan(page, 'D')).evaluate(e => e.readOnly)) && !(await (await vakVan(page, 'F')).evaluate(e => e.readOnly)));
    check('C (aantal 2, 1 bolletje) krijgt de rand "open", E (1, 2 bolletjes) de rand "te veel"',
      await (await vakVan(page, 'C')).evaluate(e => e.classList.contains('aantal-open')) &&
      await (await vakVan(page, 'E')).evaluate(e => e.classList.contains('aantal-teveel')));
    await vak.click();
    m = await wachtOpMelding(page, /Het aantal volgt de bolletjes/, 3000);
    check('tikken op het vaste vak geeft de uitleg: via het bolletje', m.ok && /＋ Nog een ruit met deze letter/.test(m.tekst) &&
      /Één ruit minder/.test(m.tekst), m.tekst.slice(0, 200));
    await sluitMeldingen(page);
    await vak.focus();
    await page.keyboard.type('5');
    await page.keyboard.press('Tab');
    await page.evaluate(() => { const r = rijen.find(x => x.merk === 'B'); setVal(r.id, 'aantal', 7); opslaan(); });
    await sluitMeldingen(page);
    await wacht(600);
    check('typen in het vak en setVal (het vangnet) veranderen het aantal niet: B blijft 3',
      dbRij('B').aantal === 3 && (await schermRij(page, 'B')).aantal === 3, dbRij('B').aantal + ' / ' + (await schermRij(page, 'B')).aantal);
    await (await vakVan(page, 'D')).fill('3');
    await (await vakVan(page, 'D')).dispatchEvent('change');
    check('D (zonder bolletjes) is gewoon te typen: 3', await opgeslagenAls(() => dbRij('D').aantal === 3), dbRij('D').aantal);
    // F krijgt een bolletje (bijvoorbeeld van een collega) terwijl zijn vak
    // nog vrij op het scherm staat; dan typt iemand 4.
    await page.evaluate(() => { const f = rijen.find(r => r.merk === 'F'); fotos[0].markeringen.push({ rijId: f.id, x: 0.95, y: 0.95 }); });
    await (await vakVan(page, 'F')).fill('4');
    await (await vakVan(page, 'F')).dispatchEvent('change');
    await wachtOpMelding(page, /Het aantal volgt de bolletjes/, 3000);
    await sluitMeldingen(page);
    check('geweigerd, en het vak toont weer 1 (niet de getypte 4)', (await schermRij(page, 'F')).aantal === 1 &&
      await (await vakVan(page, 'F')).evaluate(e => e.value === '1' && e.readOnly), await (await vakVan(page, 'F')).evaluate(e => e.value));
    // Een losse regel (D, op Invoer) met een bolletje uit een oud project: weg
    // met "Alleen het bolletje weghalen" maakt zijn vak op Invoer weer vrij.
    await page.evaluate(() => { const d = rijen.find(r => r.merk === 'D'); fotos[0].markeringen.push({ rijId: d.id, x: 0.05, y: 0.95 }); renderTabel(); });
    check('losse D met een bolletje: vak vast', await (await vakVan(page, 'D')).evaluate(e => e.readOnly));
    await bolMenu(page, 'D', 1);
    await menuKnop(page, 'Alleen het bolletje');
    check('bolletje weg: het vak van D op Invoer is weer vrij', await (await vakVan(page, 'D')).evaluate(e => !e.readOnly));

    t = await bolMenu(page, 'B', 1);
    check('het menu van B: "＋ Nog een ruit met deze letter (aantal 3 → 4)" en "Alleen het bolletje weghalen (aantal blijft 3)"',
      /＋ Nog een ruit met deze letter \(aantal 3 → 4\)/.test(t) && /Alleen het bolletje weghalen \(aantal blijft 3\)/.test(t), t);
    await menuKnop(page, 'Nog een ruit');
    t = await page.$eval('#aanwijs-' + FOTO, e => e.innerText.replace(/\s+/g, ' '));
    check('de balk: tik waar de extra ruit B zit, het aantal wordt 4', /extra ruit B zit — het aantal wordt dan 4/.test(t), t);
    check('nog niets veranderd voor de tik', dbRij('B').aantal === 3 && dbBollen('B') === 3);
    // Na het aanraken van een bolletje negeert de foto even elke tik (de
    // naklik van iOS, fotos.js pauzeerFototik); een mens tikt nooit zo snel.
    await wacht(800);
    await tikFoto(page, 0.45, 0.9);
    check('na de tik: B 4 en 4 bolletjes, samen', await opgeslagenAls(() => dbRij('B').aantal === 4 && dbBollen('B') === 4),
      dbRij('B').aantal + ' / ' + dbBollen('B'));
    check('en er kwam geen nieuwe regel bij (de lege invulregels op Invoer tellen niet)', (rijVan(1).data.rijen || []).filter(r => r.merk).length === 6, (rijVan(1).data.rijen || []).map(r => r.merk + ':' + r.aantal).join(' '));
    check('de balk is weg', await page.$eval('#aanwijs-' + FOTO, e => e.style.display === 'none'));
    await ongedaan(page);
    check('Cmd+Z in één keer terug: B 3 en 3 bolletjes', await opgeslagenAls(() => dbRij('B').aantal === 3 && dbBollen('B') === 3),
      dbRij('B').aantal + ' / ' + dbBollen('B'));
    // Het hele fotoscherm wordt opnieuw opgebouwd (renderFotos: bijvoorbeeld
    // een wijziging van een collega die binnenkomt). Tot de beoordeling
    // verdween dan de balk, maar bleef "nog een ruit" stil aan staan.
    // (Een ander tabblad bouwt niets opnieuw op: daar blijft de balk staan.)
    await bolMenu(page, 'B', 1);
    await menuKnop(page, 'Nog een ruit');
    await page.evaluate(() => renderFotos());
    await page.waitForSelector('#img-' + FOTO, { timeout: 8000 });
    await wacht(900);
    check('na het opnieuw opbouwen: geen balk "extra ruit B" meer', await page.$eval('#aanwijs-' + FOTO, e => e.style.display === 'none'));
    await tikFoto(page, 0.3, 0.9);
    check('en de volgende tik is een nieuwe ruit, geen stille B +1', await opgeslagenAls(() =>
      (rijVan(1).data.rijen || []).filter(r => r.merk).length === 7) && dbRij('B').aantal === 3 && dbBollen('B') === 3,
      (rijVan(1).data.rijen || []).filter(r => r.merk).map(r => r.merk + r.aantal).join(' '));
    await ongedaan(page);
    await opgeslagenAls(() => (rijVan(1).data.rijen || []).filter(r => r.merk).length === 6);
    await bolMenu(page, 'B', 1);
    await menuKnop(page, 'Nog een ruit');
    await page.locator('#aanwijs-' + FOTO + ' button', { hasText: 'Annuleren' }).click();
    await wacht(300);
    await tikFoto(page, 0.45, 0.9);
    check('Annuleren: B blijft 3, en de volgende tik is gewoon een nieuwe ruit G',
      await opgeslagenAls(() => dbRij('G').aantal === 1 && dbBollen('G') === 1) && dbRij('B').aantal === 3 && dbBollen('B') === 3,
      dbRij('B').aantal + ' / ' + dbBollen('B'));
    await bolMenu(page, 'B', 3);
    await menuKnop(page, 'Alleen het bolletje');
    check('"Alleen het bolletje weghalen": B blijft 3, met 2 bolletjes (een open plek)', await opgeslagenAls(() =>
      dbRij('B').aantal === 3 && dbBollen('B') === 2));
    t = await strook(page);
    t = await bolMenu(page, 'B', 1);
    check('het menu van B (open plek) biedt eerst "🎯 De ontbrekende ruit aanwijzen"', /🎯 De ontbrekende ruit aanwijzen/.test(t) &&
      t.indexOf('De ontbrekende') < t.indexOf('Nog een ruit'), t);
    await menuKnop(page, 'De ontbrekende');
    t = await page.$eval('#aanwijs-' + FOTO, e => e.innerText.replace(/\s+/g, ' '));
    check('en dat is gewoon aanwijzen: "ruit 3 van 3"', /^B .*ruit 3 van 3/.test(t), t);
    await page.locator('#aanwijs-' + FOTO + ' button', { hasText: 'Klaar' }).click();
    await wacht(300);
    t = await strook(page);
    check('en onder de foto staat het: "B: aantal 3, 2 bolletjes op de foto: nog 1 aan te wijzen"',
      /B: aantal 3, 2 bolletjes op de foto: nog 1 aan te wijzen/.test(t), t);
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Een oud project waar het niet klopt: per regel zelf kiezen');
    ({ ctx, page } = await gevelOpen());
    t = await strook(page);
    check('onder de foto: E (1, maar 2 bolletjes) en C (2, 1 bolletje), en verder niets',
      /E: aantal 1, maar 2 bolletjes op de foto\. Wat klopt\?/.test(t) && /C: aantal 2, één bolletje op de foto: nog 1 aan te wijzen/.test(t) &&
      !/\b[ABDF]: aantal/.test(t), t);
    check('E heeft de knoppen "Er zijn er 2 (aantal wordt 2)" en "Er is er 1 (het bolletje met de rode stippelrand weg)"',
      /Er zijn er 2 \(aantal wordt 2\)/.test(t) && /Er is er 1 \(het bolletje met de rode stippelrand weg\)/.test(t), t);
    t = await bolMenu(page, 'E', 2);
    check('het menu van het tweede E-bolletje (te veel): alleen weghalen, geen "＋" of "Één ruit minder"',
      /Dit bolletje weghalen \(het is er een te veel\)/.test(t) && !/Nog een ruit/.test(t) && !/Één ruit minder/.test(t) &&
      !/Ruit verwijderen/.test(t), t);
    await menuKnop(page, 'Annuleren');
    await strookKnop(page, 'E', 'Er zijn er 2');
    check('"Er zijn er 2": E aantal 2, bolletjes blijven 2', await opgeslagenAls(() => dbRij('E').aantal === 2 && dbBollen('E') === 2));
    check('en de regel E staat niet meer in de strook', !/E: aantal/.test(await strook(page)), await strook(page));
    await ongedaan(page);
    check('Cmd+Z: E weer 1 met 2 bolletjes', await opgeslagenAls(() => dbRij('E').aantal === 1 && dbBollen('E') === 2));
    await strookKnop(page, 'E', 'Er is er 1');
    check('"Er is er 1": E 1 met 1 bolletje, en dat is het eerste (dat met de stippelrand is weg)', await opgeslagenAls(() =>
      dbRij('E').aantal === 1 && dbBollen('E') === 1) &&
      rijVan(1).data.fotos[0].markeringen.some(mk => mk.rijId === 5 && mk.y === 0.3));
    // ↶ in de balk van de tabel (op de iPad de gewone weg terug): dit
    // veranderde alleen een bolletje. Tot v110 sloeg ↶ zo'n stap over en
    // draaide het een oudere wijziging terug.
    await page.locator('#tabel-' + FOTO + ' button[onclick^="blokOngedaan"]').click();
    check('↶ in de tabel zet het bolletje van E terug (en verder niets)', await opgeslagenAls(() =>
      dbRij('E').aantal === 1 && dbBollen('E') === 2), dbRij('E').aantal + ' / ' + dbBollen('E'));
    await strookKnop(page, 'E', 'Er is er 1');
    await opgeslagenAls(() => dbBollen('E') === 1);
    await strookKnop(page, 'C', 'Aanwijzen');
    check('na ‹Aanwijzen› staat C meteen niet meer in de strook (geen "aantal wordt 1" onder je vinger)',
      !/C: aantal/.test(await strook(page)), await strook(page));
    await wacht(800);
    await tikFoto(page, 0.62, 0.6);
    check('C "Aanwijzen": één tik en C heeft 2 bolletjes, aantal blijft 2', await opgeslagenAls(() =>
      dbRij('C').aantal === 2 && dbBollen('C') === 2));
    check('de strook is weg: alles klopt', (await strook(page)) === '', await strook(page));
    await ctx.close();
    // B ×2 met 3 bolletjes (een oud project): het derde bolletje is er te veel.
    ({ ctx, page } = await gevelOpen(p => { p.data.rijen.find(r => r.merk === 'B').aantal = 2; }));
    t = await bolMenu(page, 'B', 3);
    check('het menu van het derde B-bolletje (B ×2): alleen weghalen, geen "Één ruit minder" (dat maakt het verschil groter)',
      /Dit bolletje weghalen/.test(t) && !/Één ruit minder/.test(t) && !/Nog een ruit/.test(t) && !/Hele regel/.test(t), t);
    await menuKnop(page, 'Dit bolletje weghalen');
    check('weg: B 2 met 2 bolletjes', await opgeslagenAls(() => dbRij('B').aantal === 2 && dbBollen('B') === 2));
    await ctx.close();
    ({ ctx, page } = await gevelOpen());
    await strookKnop(page, 'C', 'Er is er maar 1');
    m = await wachtOpMelding(page, /Aantal verlagen/, 3000);
    check('lager: eerst de vraag (het aantal kan uit een maatstaat komen)', m.ok && /Het aantal van C van 2 naar 1\?/.test(m.tekst) &&
      /ingelezen maatstaat/.test(m.tekst), m.tekst.slice(0, 160));
    await knop(page, 'Annuleren');
    await wacht(400);
    check('Annuleren: C blijft 2', dbRij('C').aantal === 2 && (await schermRij(page, 'C')).aantal === 2);
    await strookKnop(page, 'C', 'Er is er maar 1');
    await wachtOpMelding(page, /Aantal verlagen/, 3000);
    await knop(page, 'Ja, 1');
    check('C "Er is er maar 1 (aantal wordt 1)", Ja: C 1 met 1 bolletje', await opgeslagenAls(() =>
      dbRij('C').aantal === 1 && dbBollen('C') === 1));
    await ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Doorvoeren (⤓) en gelijktrekken over regels met en zonder bolletjes');
    ({ ctx, page } = await gevelOpen());
    await page.locator('#tabel-' + FOTO + ' .bulk-vul[title*="Aantal"]').first().click();
    await page.fill('#bulkVeld', '5');
    await page.locator('.bulk-pop button', { hasText: 'Doorvoeren' }).click();
    m = await wachtOpMelding(page, /Aantal doorgevoerd op 1 regel/, 4000);
    check('⤓ Aantal 5 in het fotoblok: de app zegt dat 4 regels met bolletjes niet veranderd zijn', m.ok &&
      /4 regels hebben bolletjes op de foto; daar is het aantal niet veranderd/.test(m.tekst), m.tekst.slice(0, 200));
    await sluitMeldingen(page);
    check('alleen F (geen bolletje) is 5; A 1, B 3, C 2, E 1 blijven', await opgeslagenAls(() => dbRij('F').aantal === 5) &&
      dbRij('A').aantal === 1 && dbRij('B').aantal === 3 && dbRij('C').aantal === 2 && dbRij('E').aantal === 1,
      ['A', 'B', 'C', 'E', 'F'].map(x => x + dbRij(x).aantal).join(' '));
    await vinkAan(page, 'A');
    await vinkAan(page, 'B');
    await page.click('#bulkBalk button:has-text("Gelijktrekken")');
    await wachtOpMelding(page, /Ruiten gelijktrekken/, 3000);
    await knop(page, 'Overschrijven');
    await wacht(600);
    t = await page.$eval('#statusBar', e => e.textContent);
    check('gelijktrekken A → B: B houdt aantal 3 (bolletjes), en de app zegt het', await opgeslagenAls(() => dbRij('B').aantal === 3 &&
      dbBollen('B') === 3) && /het aantal niet bij B: dat volgt de bolletjes op de foto/.test(t), t);
    await vinkAan(page, 'B');
    await vinkAan(page, 'F');
    await page.click('#bulkBalk button:has-text("Gelijktrekken")');
    await wachtOpMelding(page, /Ruiten gelijktrekken/, 3000);
    await knop(page, 'Overschrijven');
    check('gelijktrekken B → F (geen bolletje): F neemt het aantal van B over (3)', await opgeslagenAls(() =>
      dbRij('F').aantal === 3), dbRij('F').aantal);
    await ctx.close();
  }

  /* ══ 7 ════════════════════════════════════════════════════════ */
  if (doe('7')) {
    console.log('\n7. Vóór de bestellijst: klopt het aantal met de bolletjes?');
    ({ ctx, page } = await gevelOpen());
    let pad = await bestellijstPdf(page, { 'Klopt het aantal?': 'Stoppen' });
    m = { tekst: gevraagd.join(' / ') };
    check('de vraag "Klopt het aantal?" komt, en na Stoppen komt er geen pdf', gevraagd.indexOf('Klopt het aantal?') >= 0 && !pad);
    check('en er is niets als bestelling vastgelegd', !(info().bestellingen || []).length && rijVan(1).status !== 'besteld');
    // De tekst van de vraag zelf (nog een keer, en dan lezen).
    await page.click('button:has-text("⬇ Exporteren")');
    await page.click('button:has-text("Bestellijst als PDF")');
    m = await wachtOpMelding(page, /Klopt het aantal\?/, 5000);
    check('de vraag noemt C (aantal 2, één bolletje: nog 1 niet aangewezen) en E (aantal 1, 2 bolletjes)',
      /C \(aantal 2, één bolletje: nog 1 niet aangewezen\)/.test(m.tekst) && /E \(aantal 1, 2 bolletjes\)/.test(m.tekst), m.tekst.slice(0, 300));
    check('en niet A, B (kloppen), D (ingelezen, nog geen bolletje) of F (geen bolletje)',
      !/\b[ABDF] \(aantal/.test(m.tekst), m.tekst.slice(0, 300));
    check('met de knoppen Stoppen en "Doorgaan met deze aantallen"', /Stoppen/.test(m.tekst) && /Doorgaan met deze aantallen/.test(m.tekst));
    await knop(page, 'Stoppen');
    // Alles exporteren: na Stoppen geen enkel bestand.
    let dl = 0;
    page.on('download', () => { dl++; });
    await page.evaluate(() => { try { window.showDirectoryPicker = undefined; } catch (e) {} });
    await page.click('button:has-text("⬇ Exporteren")');
    await page.click('button:has-text("Alles exporteren")');
    await wachtOpMelding(page, /Klopt het aantal\?/, 5000);
    await knop(page, 'Stoppen');
    await wacht(1500);
    check('Alles exporteren, Stoppen bij "Klopt het aantal?": geen enkel bestand', dl === 0, dl + ' downloads');
    // Rechtzetten onder de foto, dan geen vraag meer.
    await strookKnop(page, 'E', 'Er is er 1');
    await strookKnop(page, 'C', 'Er is er maar 1');
    await wachtOpMelding(page, /Aantal verlagen/, 3000);
    await knop(page, 'Ja, 1');
    await opgeslagenAls(() => dbBollen('E') === 1 && dbRij('C').aantal === 1);
    pad = await bestellijstPdf(page, { 'Klopt het aantal?': 'Stoppen' });
    check('na het rechtzetten onder de foto: geen vraag meer, wel een pdf', pad && gevraagd.indexOf('Klopt het aantal?') < 0, gevraagd.join(' / '));
    t = plat(pdfTekst(pad));
    check('met C 1 en E 1', /3 1 C 692 692/.test(t) && /5 1 E 492 492/.test(t), t.slice(0, 300));
    await sluitMeldingen(page);
    await ctx.close();
  }

  /* ══ 8 ════════════════════════════════════════════════════════ */
  if (doe('8')) {
    console.log('\n8. Na de bestelling: B +1 (via het bolletje), D 2 → 1, C nagemeten en +1');
    ({ ctx, page } = await gevelOpen(gevelKlopt));
    await eersteBestelling(page);
    check('de 1e is vastgelegd (B 3, C 1, D 2)', (info().bestellingen || []).length === 1 &&
      info().bestellingen[0].ruiten[2].aantal === 3);
    await ontgrendel(page);
    await bolMenu(page, 'B', 1);
    await menuKnop(page, 'Nog een ruit');
    await wacht(800);
    await tikFoto(page, 0.45, 0.9);
    await (await vakVan(page, 'D')).fill('1');
    await (await vakVan(page, 'D')).dispatchEvent('change');
    await bolMenu(page, 'C', 1);
    await menuKnop(page, 'Nog een ruit');
    await wacht(800);
    await tikFoto(page, 0.7, 0.9);
    const idC = (await schermRij(page, 'C')).id;
    await page.locator('#rij-' + idC + ' input.breedte-input').fill('710');
    await wacht(500);
    check('B 4 met 4 bolletjes, C 2 met 2, D 1', await opgeslagenAls(() => dbRij('B').aantal === 4 && dbBollen('B') === 4 &&
      dbRij('C').aantal === 2 && dbBollen('C') === 2 && dbRij('D').aantal === 1 && dbRij('C').breedte === '710'),
      ['B', 'C', 'D'].map(x => x + dbRij(x).aantal + '/' + dbBollen(x)).join(' '));
    let bt = await bestelTekst(page);
    check('op Bestellijst: B "op de aanvulling als 1 extra; de 3 bestelde blijven"',
      /B: aantal 3 → 4 \(besteld in de 1e\) — op de aanvulling als 1 extra; de 3 bestelde blijven/.test(bt), bt.slice(0, 700));
    check('D "op de aanvulling: 1 annuleren; de andere 1 blijven"',
      /D: aantal 2 → 1 \(besteld in de 1e\) — op de aanvulling: 1 annuleren; de andere 1 blijven/.test(bt), bt.slice(0, 700));
    check('C (maat én aantal anders) zonder zo\'n zin: dat blijft VERVANGT', /C: aantal 1 → 2; breedte 700 → 710/.test(bt) &&
      !/C: [^●]*op de aanvulling als/.test(bt), (bt.match(/C: aantal.{0,120}/) || [''])[0]);
    check('en wat de volgende pdf wordt: 2 nieuwe of gewijzigde ruiten en 1 te annuleren',
      /een aanvulling met alleen 2 nieuwe of gewijzigde ruiten en 1 te annuleren/.test(bt), (bt.match(/Maak de bestellijst.{0,160}/) || [''])[0]);
    const p8 = await bestellijstPdf(page);
    t = plat(pdfTekst(p8));
    check('de pdf legt EXTRA uit bovenaan', /EXTRA = maak er zoveel bij \(kolom Aantal\); de eerder bestelde blijven/.test(t), t.slice(0, 600));
    check('B: Aantal 1, "EXTRA bij B uit de 1e: +1 (samen 4x)"', /\d 1 B EXTRA bij B uit de 1e: \+1 \(samen 4x\) 892 1492/.test(t),
      (t.match(/.{0,6}B EXTRA.{0,60}/) || [''])[0]);
    check('C: VERVANGT C uit de 1e (1x 692 x 692), Aantal 2, nieuwe maat 702', /\d 2 C VERVANGT C uit de 1e \(1x 692 x 692\) 702 692/.test(t),
      (t.match(/.{0,6}C VERV.{0,60}/) || [''])[0]);
    check('D staat niet in de tabel (er komt er geen bij)', !/\d \d D (NIEUW|VERV|EXTRA)/.test(t));
    const a8 = ann(t);
    check('ANNULEREN: D 1× met zijn maat, "aantal van 2 naar 1: 1 annuleren, de andere 1 blijven"',
      /D 1 592 1192 HR\+\+ glas 4-15-4 1e aantal van 2 naar 1: 1 annuleren, de andere 1 blijven/.test(a8), a8);
    check('en de oude C (vervangen door C), maar NIET B (de bestelde B blijven)', /C 1 692 692 HR\+\+ glas 4-15-4 1e vervangen door C op deze lijst/.test(a8) &&
      !/\bB \d/.test(a8), a8);
    check('totalen: 2 posities | 3 ruiten (B +1, C 2); 0 NIEUW, 1 VERVANGT, 1 EXTRA, 1 ANNULEREN',
      /2 posities \| 3 ruiten/.test(t) && /alleen deze aanvulling: 0 NIEUW, 1 VERVANGT, 1 EXTRA, 1 ANNULEREN/.test(t),
      (t.match(/\d+ posities.{0,120}/) || [''])[0]);
    await vraagOpScherm(page);
    await knop(page, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
    const b2 = (info().bestellingen || [])[1] || { ruiten: {} };
    const rB = b2.ruiten[2] || {}, rC = b2.ruiten[3] || {}, rD = b2.ruiten[4] || {};
    check('vastgelegd: B extra (was 3, nu 4, geen "vervangt")', rB.opLijst && rB.extra === 3 && rB.extraBij === '1e' && +rB.aantal === 4 && !rB.vervangt,
      JSON.stringify(rB).slice(0, 160));
    check('D minder (was 2, nu 1), telt als besteld', rD.opLijst && rD.minder === 2 && rD.minderUit === '1e' && +rD.aantal === 1 && !rD.vervangt,
      JSON.stringify(rD).slice(0, 160));
    check('C vervangt de 1e', rC.opLijst && rC.vervangt === 1 && !rC.extra, JSON.stringify(rC).slice(0, 160));
    check('stuks = wat de leverancier erbij maakt: 3 (B 1 + C 2)', b2.stuks === 3 && b2.aantal === 2, b2.stuks + ' / ' + b2.aantal);
    check('niets meer geel, en de database (script 23) kent B 4 en D 1', await page.evaluate(() => rijen.every(r => !naBestellingGewijzigd(r))) &&
      info().besteld.ruiten[2] === rB.k && info().besteld.ruiten[4] === rD.k);
    bt = await bestelTekst(page);
    check('op Bestellijst: in totaal 10 ruiten (A1 B4 C2 D1 E1 F1) en "1 met een lager aantal" bij de 2e',
      /in totaal 10 ruiten in 6 posities/.test(bt) && /2e bestellijst \(aanvulling\)[^·]*2 posities, 1 met een lager aantal/.test(bt),
      (bt.match(/1e bestellijst.{0,260}/) || [''])[0]);

    console.log('\n8b. Het overzicht (niets meer te bestellen)');
    const p8b = await bestellijstPdf(page);
    t = plat(pdfTekst(p8b));
    check('kolom Besteld: B "1e + 2e (3 + 1)", D "1e; 2e: 1 geannuleerd"', /B 1e \+ 2e \(3 \+ 1\)/.test(t) &&
      /D 1e; 2e: 1 geannuleerd/.test(t), (t.match(/Pos.{0,400}/) || [''])[0]);
    const gv = (t.match(/GEVRAAGD TE ANNULEREN \(kan toch geleverd zijn\) Merk.{0,500}/) || [''])[0];
    check('gevraagd te annuleren: D 1×, "aantal van 2 naar 1, gevraagd in de 2e (de andere 1 NIET annuleren)"',
      /D 1 592 1192 .{0,30}1e aantal van 2 naar 1, gevraagd in de 2e \(de andere 1 NIET annuleren\)/.test(gv), gv);
    check('en de oude C, niet B', /C 1 692 692/.test(gv) && !/\bB \d/.test(gv), gv);

    console.log('\n8c. Alleen een ruit minder: een aanvulling zonder tabel');
    await ontgrendel(page);
    // C (nagemeten in de 2e, ×2): één eraf. (B 4 → 3 zou precies de stand
    // uit de 1e zijn; dan vraagt de app sinds v105 eerst "Oudere stand?".)
    await bolMenu(page, 'C', 2);
    await menuKnop(page, 'Één ruit minder');
    check('C 1 met 1 bolletje', await opgeslagenAls(() => dbRij('C').aantal === 1 && dbBollen('C') === 1));
    // C gaat terug naar een eerder besteld aantal (×1 in de 1e). Tot de
    // beoordeling van v110 vroeg de app dan "Oudere stand?"; nu niet meer,
    // want C is gewijzigd ná de laatste bestelling (zie onderdeel 11 voor een
    // oud apparaat, dat wél de vraag geeft).
    const p8c = await bestellijstPdf(page);
    check('geen vraag "Oudere stand?"', gevraagd.indexOf('Oudere stand?') < 0 && !!p8c, gevraagd.join(' / '));
    t = plat(pdfTekst(p8c));
    check('de 3e is een aanvulling: "Geen nieuwe of gewijzigde ruiten", en ANNULEREN B 1×',
      /3e BESTELLIJST = AANVULLING/.test(t) && /Geen nieuwe of gewijzigde ruiten op deze aanvulling/.test(t) &&
      /C 1 702 692 HR\+\+ glas 4-15-4 2e aantal van 2 naar 1: 1 annuleren, de andere 1 blijven/.test(ann(t)), ann(t) || t.slice(0, 400));
    m = await vraagOpScherm(page);
    check('en de app vraagt of hij verstuurd is', m.ok, m.tekst.slice(0, 100));
    await knop(page, 'Ja, verstuurd');
    check('vastgelegd als 3e: C minder (was 2)', await wachtTot(() => (info().bestellingen || []).length === 3 &&
      (info().bestellingen[2].ruiten[3] || {}).minder === 2, 10000), JSON.stringify((info().bestellingen || [])[2] || {}).slice(0, 200));
    // De 2e is nu een oudere bestelling en wordt ingekort; wat er toen
    // minder gevraagd is (D), moet het overzicht nog weten.
    check('de 2e is ingekort, en weet nog dat D minder was', !!info().bestellingen[1].kort &&
      (info().bestellingen[1].ruiten[4] || {}).minder === 2, JSON.stringify(info().bestellingen[1].ruiten[4] || {}).slice(0, 160));
    const p8d = await bestellijstPdf(page);
    const gv8 = (plat(pdfTekst(p8d)).match(/GEVRAAGD TE ANNULEREN \(kan toch geleverd zijn\) Merk.{0,700}/) || [''])[0];
    check('het overzicht noemt beide: D (gevraagd in de 2e) en C (gevraagd in de 3e)',
      /D 1 592 1192 .{0,30}1e aantal van 2 naar 1, gevraagd in de 2e/.test(gv8) &&
      /C 1 702 692 .{0,30}2e aantal van 2 naar 1, gevraagd in de 3e/.test(gv8), gv8);
    await ctx.close();
  }

  /* ══ 9 ════════════════════════════════════════════════════════ */
  if (doe('9')) {
    console.log('\n9. Een bestelling uit v105–v109: alleen het aantal was toen nog VERVANGT');
    // Zo legde v109 het vast: K3 1 → 2 als VERVANGT, met dezelfde maat.
    resetDb();
    const p = rijVan(1);
    const k = Object.assign({}, KOMPLEET, INGEMETEN);
    p.data.rijen = [ruit(1, 'K1', '1200', '600', k), ruit(3, 'K3', '900', '900', Object.assign({ aantal: 2 }, k))];
    p.data.volgendId = 4;
    p.data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'besteld' };
    p.status = 'besteld';
    ctx = await nieuweContext();
    await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    page = await nieuwePagina(ctx);
    await open(page, 1);
    // De bestellingen zoals v109 ze maakte, met de momentopnames van de app.
    await page.evaluate(() => {
      const r3 = rijen.find(r => r.merk === 'K3');
      const een = { nr: 1, op: '2026-10-02T09:00:00.000Z', door: 'julian', via: 'pdf', soort: 'volledig', aantal: 2, stuks: 2,
        ruiten: {} };
      rijen.forEach(r => { een.ruiten[r.id] = ruitMomentopname(Object.assign({}, r, r.merk === 'K3' ? { aantal: 1 } : {}), true); });
      const twee = { nr: 2, op: '2026-10-03T09:00:00.000Z', door: 'julian', via: 'pdf', soort: 'aanvulling', aantal: 1, stuks: 2,
        ruiten: { 3: Object.assign(ruitMomentopname(r3, true), { vervangt: 1 }) } };
      projectInfo.bestellingen = [een, twee];
      besteldBijwerken();
      renderTabel(); opslaan();
    });
    await wacht(800);
    const p9 = await bestellijstPdf(page);
    t = plat(pdfTekst(p9));
    check('het overzicht toont K3 2× "2e"', /Overzicht bestelde ruiten - GEEN BESTELLING/.test(t) && /\d 2 K3 2e 892 892/.test(t),
      (t.match(/Pos.{0,200}/) || [''])[0]);
    check('en K3 staat NIET onder "gevraagd te annuleren" (zelfde maat: dan annuleerde de leverancier de geldige)',
      !/GEVRAAGD TE ANNULEREN/.test(t) || !/K3 1 892 892/.test(t), (t.match(/GEVRAAGD.{0,200}/) || [''])[0]);
    await ctx.close();
  }

  /* ══ 10 ═══════════════════════════════════════════════════════ */
  if (doe('10')) {
    console.log('\n10. Besteld (op slot): ook via het bolletje en de strook verandert er niets');
    ({ ctx, page } = await gevelOpen());
    await bestellijstPdf(page, TOCH);
    await vraagOpScherm(page);
    await knop(page, 'Ja, verstuurd');
    await wachtTot(() => rijVan(1).status === 'besteld', 10000);
    await wacht(500);
    check('op slot: de knoppen in de strook staan uit', await page.$$eval('#tabel-' + FOTO + ' .foto-scheef button',
      bs => bs.length > 0 && bs.every(b => b.disabled)));
    const voor = JSON.stringify(rijVan(1).data.rijen) + JSON.stringify(rijVan(1).data.fotos);
    for (const code of [
      "markAantalNaarBollen(rijen.find(r => r.merk === 'E').id)",
      "markTeveelWeg(rijen.find(r => r.merk === 'E').id)",
      "markErbij('f1', 1)",
      "markAanwijzenRij('f1', rijen.find(r => r.merk === 'C').id)"]) {
      await page.evaluate(c => { try { (new Function(c))(); } catch (e) {} }, code);
      await sluitMeldingen(page);
    }
    await page.evaluate(() => window.opslaan && opslaan());
    await wacht(1200);
    check('markAantalNaarBollen, markTeveelWeg, markErbij, markAanwijzenRij: geweigerd, niets veranderd',
      JSON.stringify(rijVan(1).data.rijen) + JSON.stringify(rijVan(1).data.fotos) === voor &&
      await page.$eval('#aanwijs-' + FOTO, e => e.style.display === 'none'));
    await ctx.close();

    console.log('\n10b. Telefoon (390 breed): de strook en het menu passen');
    gevelProject();
    ctx = await nieuweContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    page = await nieuwePagina(ctx);
    await open(page, 1);
    await page.waitForSelector('#img-' + FOTO, { timeout: 10000 });
    await wacht(400);
    if (process.env.BREED) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > 392 && getComputedStyle(e).position !== 'fixed').slice(0, 8).map(e => e.tagName + '.' + e.className + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().right) + ' [' + (e.innerText || '').slice(0, 20) + '] in ' + (e.parentElement.className)).join('\n')));
    const breed = await page.evaluate(() => {
      const s = document.querySelector('.foto-scheef');
      const r = s ? s.getBoundingClientRect() : null;
      const knoppen = s ? [...s.querySelectorAll('button')].map(b => b.getBoundingClientRect()) : [];
      return { pagina: document.documentElement.scrollWidth, scherm: innerWidth, rechts: r ? r.right : 999,
               knop: knoppen.every(k => k.right <= innerWidth + 0.5 && k.height >= 28) };
    });
    // Vergelijk met 390, niet met innerWidth: met isMobile groeit die mee
    // met te brede inhoud (TESTEN.md, les bij test-v110.js).
    check('geen horizontaal scrollen (pagina 390 breed), de strook en zijn knoppen binnen het scherm', breed.pagina <= 390 &&
      breed.scherm <= 390 && breed.rechts <= 390.5 && breed.knop, JSON.stringify(breed));
    t = await bolMenu(page, 'B', 1);
    const menu = await page.$eval('.mark-menu', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
    check('het menu met "＋ Nog een ruit" past op het scherm', /Nog een ruit/.test(t) && menu.l >= 0 && menu.r <= 390.5, JSON.stringify(menu));
    if (PLAATJES) {
      await page.locator('.mark-menu').screenshot({ path: path.join(PLAATJES, 'v110-menu.png') });
      await page.keyboard.press('Escape'); await page.evaluate(() => markMenuSluit());
      await page.locator('#tabel-' + FOTO + ' .foto-scheef').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(PLAATJES, 'v110-telefoon.png'), fullPage: false });
    }
    await ctx.close();
  }

  /* ══ 11 ═══════════════════════════════════════════════════════ */
  if (doe('11')) {
    console.log('\n11. Meer lijsten na elkaar: EXTRA, daarna een andere maat (uit welke lijsten?), minder, een oud apparaat');
    bestelProject();
    ctx = await nieuweContext();
    await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    page = await nieuwePagina(ctx);
    await open(page, 1);
    await eersteBestelling(page);
    await ontgrendel(page);
    const vak = n => page.locator('#invoerBody .aantal-input').nth(n);
    await vak(0).fill('3'); await vak(0).dispatchEvent('change');                 // K1 1 → 3: alleen het aantal
    await vak(1).fill('2'); await vak(1).dispatchEvent('change');                 // K2 1 → 2, en een opmerking
    const opm2 = page.locator('#rij-2 input.opm-input[oninput*="\'opmerking\'"]');
    await opm2.fill('achterzijde');
    await wacht(600);
    let t11 = plat(pdfTekst(await bestellijstPdf(page)));
    // (De kolom Opmerking maakt de kolom Wijz. smal: de tekst loopt door op
    // de volgende regel, vandaar de losse stukken.)
    check('2e: K1 EXTRA +2 (samen 3x), aantal 2; K2 (aantal én opmerking) VERVANGT', /\d 2 K1 EXTRA bij K1 uit de 1e: \+2/.test(t11) &&
      /\(samen 3x\)/.test(t11) && /\d 2 K2 VERVANGT K2 uit de 1e \(1x 792 x/.test(t11) && !/K2 EXTRA/.test(t11), (t11.match(/Pos Aantal.{0,300}/) || [''])[0]);
    await vraagOpScherm(page); await knop(page, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
    await ontgrendel(page);
    await page.locator('#invoerBody input.breedte-input').first().fill('1210');   // K1 nagemeten
    await vak(1).fill('1'); await vak(1).dispatchEvent('change');                 // K2 2 → 1
    await wacht(600);
    t11 = plat(pdfTekst(await bestellijstPdf(page)));
    check('3e: K1 VERVANGT "uit de 1e en 2e (3x 1192 x 592)": de leverancier moet ze in beide lijsten vinden',
      /\d 3 K1 VERVANGT K1 uit de 1e en 2e \(3x 1192 x/.test(t11), (t11.match(/.{0,8}K1 VERV.{0,70}/) || [''])[0]);
    const a11 = ann(t11);
    check('ANNULEREN: K1 3× "1e en 2e" (vervangen), K2 1× "2e" (van 2 naar 1)',
      /K1 3 1192 592 HR\+\+ glas 4-15-4 1e en 2e vervangen door K1 op deze lijst/.test(a11) &&
      /K2 1 792 1392 HR\+\+ glas 4-15-4 2e aantal van 2 naar 1: 1 annuleren, de andere 1 blijven/.test(a11), a11);
    await vraagOpScherm(page); await knop(page, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === 3, 10000);
    check('vastgelegd: K1 vervangt, "uit de 1e en 2e"', (info().bestellingen[2].ruiten[1] || {}).vervangtUit === '1e en 2e',
      JSON.stringify(info().bestellingen[2].ruiten[1] || {}).slice(0, 200));
    await ontgrendel(page);
    await vak(1).fill('2'); await vak(1).dispatchEvent('change');                 // K2 1 → 2 (dat aantal was al eens besteld)
    await wacht(600);
    t11 = plat(pdfTekst(await bestellijstPdf(page)));
    check('4e: K2 terug naar 2 (bewust, net gewijzigd): geen "Oudere stand?", wel EXTRA +1', gevraagd.indexOf('Oudere stand?') < 0 &&
      /\d 1 K2 EXTRA bij K2 uit de 2e: \+1/.test(t11), gevraagd.join(' / ') + ' | ' + (t11.match(/.{0,8}K2 .{0,60}/) || [''])[0]);
    await vraagOpScherm(page); await knop(page, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === 4, 10000);
    check('de 3e is ingekort en weet nog dat K2 daar minder was', !!info().bestellingen[2].kort &&
      (info().bestellingen[2].ruiten[2] || {}).minder === 2, JSON.stringify(info().bestellingen[2].ruiten[2] || {}).slice(0, 160));
    t11 = plat(pdfTekst(await bestellijstPdf(page)));
    const gv11 = (t11.match(/GEVRAAGD TE ANNULEREN \(kan toch geleverd zijn\) Merk.{0,900}/) || [''])[0];
    check('het overzicht: K1 3× uit de "1e en 2e" (oude maat), en K2 1× (gevraagd in de 3e)',
      /K1 3 1192 592 .{0,30}1e en 2e oude maat, vervangen in de 3e; geldig is nu K1 1202 x 592 uit de 3e/.test(gv11) &&
      /K2 1 792 1392 .{0,30}2e aantal van 2 naar 1, gevraagd in de 3e/.test(gv11), gv11);
    check('kolom Besteld: K2 "2e + 4e (2 + 1); 3e: 1 geannuleerd" (2 besteld, 1 eraf, 1 erbij)', /K2 2e \+ 4e \(2 \+ 1\); 3e: 1/.test(t11) &&
      /geannuleerd/.test(t11),
      (t11.match(/Pos Aantal.{0,300}/) || [''])[0]);
    await ctx.close();

    console.log('\n11b. Een oud apparaat zet K2 terug op 1 (met een oud stempel): wél "Oudere stand?"');
    const k2 = rijVan(1).data.rijen.find(r => r.merk === 'K2');
    k2.aantal = 1; k2.gewOp = '2026-10-01T09:00:00.000Z';
    ctx = await nieuweContext();
    await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    page = await nieuwePagina(ctx);
    await open(page, 1);
    await page.click('button:has-text("⬇ Exporteren")');
    await page.click('button:has-text("Bestellijst als PDF")');
    m = await wachtOpMelding(page, /Oudere stand\?/, 5000);
    check('de vraag "Oudere stand?" voor K2 komt', m.ok && /K2/.test(m.tekst), m.tekst.slice(0, 160));
    await knop(page, 'Stoppen');
    await ctx.close();

    console.log('\n11c. Alleen het aantal en een andere speling: de glasmaat verandert, dus VERVANGT');
    bestelProject();
    ctx = await nieuweContext();
    await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    page = await nieuwePagina(ctx);
    await open(page, 1);
    await eersteBestelling(page);
    await ontgrendel(page);
    await vak(2).fill('2'); await vak(2).dispatchEvent('change');                 // K3 1 → 2
    await page.selectOption('#spelingGlobal', '6');
    await wacht(500);
    if ((await meldingen(page)).length) await sluitMeldingen(page);
    const gm = await page.evaluate(() => rijen.find(r => r.merk === 'K3').glasBreedte);
    t11 = plat(pdfTekst(await bestellijstPdf(page)));
    check('K3 (aantal 2, glasmaat ' + gm + ' i.p.v. 892): VERVANGT, niet EXTRA', gm !== 892 && /\d 2 K3 VERVANGT K3 uit de 1e/.test(t11) &&
      !/K3 EXTRA/.test(t11), (t11.match(/.{0,8}K3 .{0,60}/) || [''])[0]);
    await ctx.close();
  }

  /* ══ 12 ═══════════════════════════════════════════════════════ */
  if (doe('12')) {
    console.log('\n12. Na de bestelling: B op 2 gezet door een apparaat met v109 (3 bolletjes blijven): "Klopt het aantal?"');
    ({ ctx, page } = await gevelOpen(gevelKlopt));
    await eersteBestelling(page);
    await ctx.close();
    const b = rijVan(1).data.rijen.find(r => r.merk === 'B');
    b.aantal = 2; b.gewOp = new Date().toISOString();
    ({ ctx, page } = await (async () => {
      const c = await nieuweContext();
      await c.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
      const p = await nieuwePagina(c);
      await open(p, 1);
      return { ctx: c, page: p };
    })());
    const p12 = await bestellijstPdf(page, { 'Klopt het aantal?': 'Stoppen' });
    check('"1 annuleren" van B gaat niet zonder vraag: "Klopt het aantal?" (B aantal 2, 3 bolletjes)', !p12 &&
      gevraagd.indexOf('Klopt het aantal?') >= 0);
    await ctx.close();
  }

  /* ══ 13 ═══════════════════════════════════════════════════════ */
  if (doe('13')) {
    console.log('\n13. Een EXTRA op een andere basis dan bedoeld (ingetrokken, of een tussenbestelling), en een wijziging zonder bereik');
    // B: 1e ×3. Een collega bestelt +2 (2e, B 5) terwijl deze iPad nog een pdf
    // had met +1 (gemaakt vanaf 3); daarna "Ja, verstuurd" (3e, B 4, extra 3).
    // De leverancier maakt 3 + 2 + 1 = 6.
    async function metBestellingen(lijst) {
      gevelProject(gevelKlopt);
      ctx = await nieuweContext();
      await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
      page = await nieuwePagina(ctx);
      await open(page, 1);
      await page.evaluate(l => {
        const b = rijen.find(r => r.merk === 'B');
        const versie = (aantal, extra) => Object.assign(ruitMomentopname(Object.assign({}, b, { aantal: aantal }), true),
          extra ? { extra: extra, extraBij: '1e' } : {});
        const een = { nr: 1, op: '2026-10-02T09:00:00.000Z', door: 'julian', via: 'pdf', soort: 'volledig', aantal: 6, stuks: 10, ruiten: {} };
        rijen.forEach(r => { if (r.merk) een.ruiten[r.id] = ruitMomentopname(Object.assign({}, r, r.merk === 'B' ? { aantal: 3 } : {}), true); });
        const lijst = [een].concat(l.map((x, i) => Object.assign({ nr: i + 2, op: '2026-10-0' + (i + 3) + 'T09:00:00.000Z', door: 'julian',
          via: 'pdf', soort: 'aanvulling', aantal: 1, stuks: x.n - x.extra, ruiten: { [b.id]: versie(x.n, x.extra) } },
          x.weg ? { ingetrokken: { op: '2026-10-09T09:00:00.000Z', door: 'julian' } } : {})));
        projectInfo.bestellingen = lijst;
        b.aantal = l.length ? l[l.length - 1].nu : 3;
        besteldBijwerken(); renderTabel(); opslaan();
      }, lijst);
      await wacht(500);
    }
    await metBestellingen([{ n: 5, extra: 3, nu: 4 }, { n: 4, extra: 3, nu: 4 }]);
    let st13 = await page.evaluate(() => { const b = rijen.find(r => r.merk === 'B'); const st = besteldeStand();
      return { aantal: st.ruiten[b.id].aantal, geel: naBestellingGewijzigd(b), tekst: besteldInTekst(b.id, st) }; });
    check('tussenbestelling: de app rekent wat de leverancier maakt: 6 (3 + 2 + 1), niet 4', st13.aantal === 6, JSON.stringify(st13));
    check('B (4 in het project) staat geel: anders dan besteld', st13.geel, JSON.stringify(st13));
    let bt13 = await bestelTekst(page);
    check('op Bestellijst: "aantal 6 → 4" en "2 annuleren; de andere 4 blijven"', /B: aantal 6 → 4/.test(bt13) &&
      /2 annuleren; de andere 4 blijven/.test(bt13), (bt13.match(/B: aantal.{0,140}/) || [''])[0]);
    await ctx.close();
    // De 2e (+1, B 4) is ingetrokken; de 3e (+1 vanaf 4, B 5) geldt: de
    // leverancier maakt 3 + 1 = 4.
    await metBestellingen([{ n: 4, extra: 3, nu: 4, weg: true }, { n: 5, extra: 4, nu: 5 }]);
    st13 = await page.evaluate(() => { const b = rijen.find(r => r.merk === 'B'); const st = besteldeStand();
      return { aantal: st.ruiten[b.id].aantal, geel: naBestellingGewijzigd(b) }; });
    check('2e ingetrokken: besteld is 4 (3 + 1), en B (5) staat geel', st13.aantal === 4 && st13.geel, JSON.stringify(st13));
    await ctx.close();

    console.log('\n13b. Zonder bereik één ruit minder, terug naar een eerder besteld aantal: geen "Oudere stand?"');
    ({ ctx, page } = await gevelOpen(gevelKlopt));
    await eersteBestelling(page);
    await ontgrendel(page);
    await bolMenu(page, 'B', 1);
    await menuKnop(page, 'Nog een ruit');
    await wacht(800);
    await tikFoto(page, 0.45, 0.9);
    await opgeslagenAls(() => dbRij('B').aantal === 4);
    await bestellijstPdf(page);
    await vraagOpScherm(page); await knop(page, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
    await ctx.close();
    // Op een iPad zonder bereik: B 4 → 3. Het stempel blijft dat van de
    // bestelde versie (het komt pas bij het versturen).
    const p13 = rijVan(1);
    const b13 = p13.data.rijen.find(r => r.merk === 'B');
    const g13 = p13.data.info.bestellingen[1].ruiten[b13.id].g;
    b13.aantal = 3; b13.gewOp = g13;
    const mk = p13.data.fotos[0].markeringen; mk.splice(mk.map(x => x.rijId).lastIndexOf(b13.id), 1);
    ctx = await nieuweContext();
    await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    page = await nieuwePagina(ctx);
    await open(page, 1);
    t = plat(pdfTekst(await bestellijstPdf(page)));
    check('geen "Oudere stand?", wel ANNULEREN B 1× ("van 4 naar 3")', gevraagd.indexOf('Oudere stand?') < 0 &&
      /B 1 892 1492 HR\+\+ glas 4-15-4 1e en 2e aantal van 4 naar 3: 1 annuleren, de andere 3 blijven/.test(ann(t)), gevraagd.join(' / ') + ' | ' + ann(t));
    await ctx.close();
  }

  /* ══ ═══════════════════════════════════════════════════════════ */
  console.log('\nGeen fouten in de console');
  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log(fouten ? '\n' + fouten + ' FOUT(EN).' : '\nAlles goed.');
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
