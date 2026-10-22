/* Testreeks v114 — node test-v114.js   (en: node test-v114.js --mutaties)

   Onderwerp: de latzijde per ruit (binnen / buiten / beide, geen standaard),
   de diepte van de onderdorpel, het oordeel over de hele ruit, advies
   aantikken, de merk-kolom die meeschuift, Toebehoren op de telefoon
   inklappen, de latten na een bestelling mee op slot; bi-color roosters,
   het blok ALLEEN ROOSTER, de vaste zin op een aanvulling, en de maten van
   de latten volgens de tekeningen van Jongeneel.

   Echte situatie: Jan meet een renovatie in. In één kozijn zitten de latten
   bij de ene ruit binnen en bij de andere buiten; de onderdorpel is minder
   diep. Een paar ruiten krijgen een Duco rooster, één bi-color (buiten wit,
   binnen zwart). Na de bestelling wordt bij één ruit alleen de kleur van het
   rooster anders: het glas mag NIET opnieuw gemaakt worden.

   Belofte (keuzes van Jan, 20-10-2026):
   - geen standaardzijde: een nieuwe ruit staat op "?" en moet gekozen
     worden; Toebehoren en de bestellijstcontrole melden ruiten zonder zijde;
   - buiten = onderin de passende neuslat; binnen = onderin dezelfde lat;
     beide = glas tussen twee latten (de lat telt twee keer); onderlat per
     ruit aan te passen;
   - diepte onderdorpel apart; het oordeel is het slechtste van boven/onder;
   - na een bestelling: sponning, glaslat, band, uitfrezen, zijde en onderlat
     mee op slot (v113: vrij);
   - bi-color: kolom Bi-color (standaard Nee); bij Ja de kolom RAL binnen, de
     kolom RAL heet dan "RAL buiten"; op de bestellijst "buiten: … / binnen: …";
   - alleen het rooster (type, kleur, bi-color) anders na een bestelling =
     blok ALLEEN ROOSTER, geen VERVANGT;
   - bovenaan elke aanvulling: "Graag bevestigen dat u deze aanvulling
     verwerkt, met name VERVANGT en ANNULEREN.";
   - E8 zonder eigen sponning, C2 20x27, GLD1 7,5 en GLD2 14 eigen sponning,
     neus 9 mm; B2 vervallen (→ B1), GL13 heet B13; geen fotoscript meer.

   Wat deze opstelling aanneemt: zoals test-v111/v112/v113 (nagebootste
   database in node, echte Chromium, pdf teruggelezen met pdfplumber). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  zijdeBuiten: ["latten.js", "    var keuze = eigen === 'ZELFDE' ? boven.id : eigen || (zijde(r) === 'buiten' ? 'NEUS' : boven.id);", "    var keuze = eigen === 'ZELFDE' ? boven.id : eigen || 'NEUS';"],
  zijdeBeide: ["latten.js", "zijde(r) === 'beide') ? 2 : 1;", "zijde(r) === 'beide') ? 1 : 1;"],
  oudeVink: ["latten.js", "    return e.tweeKanten ? 'beide' : '';", "    return '';"],
  onderDiepte: ["latten.js", "      : anders.plek === 'onder' && getal(e.diepteOnder) > 0 ? e.diepteOnder : e.sponningDiepte);", "      : e.sponningDiepte);"],
  slechtste: ["latten.js", "    if (onder && ERNST[onder.status] > ERNST[boven.status]) { slechtste = onder; waar = 'onder'; }", ""],
  adviesActie: ["latten.js", "      zetRw(id, 'glaslat', actie.lat === project().lat ? '' : actie.lat);\n      zetRw(id, 'latOmgekeerd'", "      zetRw(id, 'latOmgekeerd'"],
  merkLabel: ["index.html", "merkInRijnr(this); ", ""],
  // Twee bewakingen (SLOT_FUNCTIES en magKiezen); allebei weg = de zijde mag op slot.
  zijdeSlot: ["latten.js", "  function magKiezen() {\n    if (window.slotWeigert && slotWeigert()) return false;", "  function magKiezen() {\n    if (0) return false;"],
  onderlatSlot: ["toebehoren.js", "    if (magNiet() || latSlot()) { renderToebehoren(); return; }\n    var r = typeof getRij", "    if (magNiet()) { renderToebehoren(); return; }\n    var r = typeof getRij"],
  zonderZijdeControle: ["pdf.js", "    var zonder = zonderZijde(bm);", "    var zonder = [];"],
  zonderZijdeStrook: ["toebehoren.js", "    if (zonderZijde.length && u.perRuit.some(", "    if (0 && u.perRuit.some("],
  inklappen: ["toebehoren.js", "    return '<tr class=\"tb-ruit' + (open ? '' : ' dicht')", "    return '<tr class=\"tb-ruit' + (0 ? '' : '')"],
  exportZijde: ["index.html", "      G ? G.zijde(r) : '', G ? getal(G.ruit(r).diepteOnder) : '',", "      '', '',"],
  biKenmerk: ["index.html", "    (rij.biColor === 'Ja' && rij.rooster === 'Ja' ? '|bi:' + (rij.ralBinnen || '') : '');", "    '';"],
  biPdf: ["pdf.js", "      { kop: 'RAL kleur',  w: 30, haal: function (r) { return window.ralTekst ? ralTekst(r) : r.ralKleur; } },", "      { kop: 'RAL kleur',  w: 30, haal: function (r) { return r.ralKleur; } },"],
  biKolom: ["index.html", "  if (groep) groep.colSpan = tonen ? (bi ? 6 : 5) : 1;", "  if (groep) groep.colSpan = tonen ? 5 : 1;"],
  biKop: ["index.html", "  const watTekst = bi ? ' buiten' : ' Kleur';", "  const watTekst = ' Kleur';"],
  biRoosterNee: ["index.html", "    if (r && (r.biColor || r.ralBinnen) && !invoerOpSlot()) { delete r.biColor; delete r.ralBinnen; }", ""],
  roosterBlok: ["index.html", "    if (b && b.roosterWas !== b.roosterNu) rooster.push(", "    if (0) rooster.push("],
  roosterTabel: ["pdf.js", "        if ((t.rooster || []).length) roosterTabel(doc, titel, t.rooster);   // v114", ""],
  roosterMoment: ["index.html", "        ROOSTER_VELDEN.forEach(v => { if (oud[v] !== undefined) o.roosterVan[v] = oud[v]; });", ""],
  roosterIn: ["index.html", "        if (o.rooster === 'Ja') roosterIn[id] = dezeNr; else delete roosterIn[id];", ""],
  kortGuard: ["index.html", "  return KORT_VELDEN_V114.indexOf(v) < 0 || oud.kort >= 2;", "  return true;"],
  bevestig: ["pdf.js", "var bevestigRegels = modus === 'aanvulling' ?", "var bevestigRegels = 0 ?"],
  bevestigOveral: ["pdf.js", "var bevestigRegels = modus === 'aanvulling' ?", "var bevestigRegels = modus !== 'volledig' ?"],
  e8: ["latten.js", "inSponning: 0, eigenSponning: 0, artikel: 'B7651013032400.FVG'", "inSponning: 0, eigenSponning: 3, artikel: 'B7651013032400.FVG'"],
  neus9: ["latten.js", "{ id: 'N30', soort: 'neuslat', maat: '18x45', hoogte: 18, eigenSponning: 30, neus: 9,", "{ id: 'N30', soort: 'neuslat', maat: '18x45', hoogte: 18, eigenSponning: 30, neus: 15,"],
  swFoto: ["sw.js", "  './latten/B13.jpg',", "  './latten/GL13.jpg',"],
  stickyKolom: ["index.html", "    border-radius: var(--radius);\n    /* v114 (controle): geen overflow: hidden meer.", "    border-radius: var(--radius);\n    overflow: hidden;\n    /* v114 (controle): geen overflow: hidden meer."],
  ducoAftrek: ["index.html", "  if (a == null || b == null || a !== b) return false;", "  if (0) return false;"],
  biControle: ["pdf.js", "      return k === 'door' ? kleurControle(bm) : k;   // v114: bi-color zonder kleur", "      return k;"],
  neusGekozen: ["latten.js", "    if (l.soort === 'neuslat') {\n      var ng", "    if (0) {\n      var ng"],
  standaardSlot: ["toebehoren.js", "    if ((veld === 'standaardLat' || veld === 'standaardOnderlat') && latSlot()) { renderToebehoren(); return; }", ""],
  roosterSchermTekst: ["index.html", "           (t.rooster || []).length ? t.rooster.length + (t.rooster.length === 1 ? ' ruit' : ' ruiten') + ' met alleen een ander rooster (type of kleur)' : '']", "           '']"],
};
const WAAR = {
  zijdeBuiten: '1', zijdeBeide: '1', oudeVink: '1', onderDiepte: '1', slechtste: '1', adviesActie: '2', merkLabel: '2',
  zijdeSlot: '4', onderlatSlot: '4', zonderZijdeControle: '3', zonderZijdeStrook: '3', inklappen: '2', exportZijde: '3',
  biKenmerk: '6', biPdf: '5', biKolom: '5', biKop: '5', biRoosterNee: '5', roosterBlok: '6', roosterTabel: '6',
  roosterMoment: '6', roosterIn: '6', kortGuard: '6', bevestig: '6', bevestigOveral: '6', e8: '8', neus9: '8', swFoto: '8',
  stickyKolom: '2', ducoAftrek: '6', biControle: '5', neusGekozen: '1', standaardSlot: '4', roosterSchermTekst: '6',
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v114-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v114-pdf-'));
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
// v115: het merk staat vet in de eerste cel (met ×2 erachter), en er zijn kopregels per foto.
const tbRij = (page, merk) => page.locator('.tb-tabel tbody tr.tb-ruit').filter({ has: page.locator('td.tb-merk b', { hasText: new RegExp('^' + merk + '$') }) });
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

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, m, t, u;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Latzijde en onderdorpel: wat de app rekent');
    latProject();
    ({ ctx, page } = await openProject());
    await zetPR(page, 'X', { sponningDiepte: 44 });          // 23 + 6 + 15 (A4) = 44: past
    m = await G(page, 'X');
    check('geen standaardzijde: een ruit zonder keuze staat op "" (?), onderin dezelfde lat (A4)', m.zijde === '' && m.onder === 'A4' && !m.isNeus,
      JSON.stringify(m));
    await zetPR(page, 'X', { latZijde: 'buiten', sponningDiepte: 50 });
    m = await G(page, 'X');
    check('buiten: onderin de passende neuslat (sponning 50 → N30)', m.zijde === 'buiten' && m.isNeus && m.onder === 'N30', JSON.stringify(m));
    await zetPR(page, 'X', { latZijde: 'binnen' });
    m = await G(page, 'X');
    check('binnen: onderin dezelfde lat als boven (A4), geen neuslat', m.onder === 'A4' && !m.isNeus, JSON.stringify(m));
    await zetPR(page, 'X', { latZijde: 'beide', sponningDiepte: 59 });   // 23 + 6 + 2 × 15 = 59
    m = await G(page, 'X');
    // v115 (keuze Jan): bij beide onderin dezelfde lat, geen neuslat.
    check('beide: glas tussen twee latten, de lat telt twee keer (59 past; v119: vlak met kozijn), onderin dezelfde lat (v115)', m.boven === 'past · vlak met kozijn' && !m.isNeus && m.onder === 'A4', JSON.stringify(m));
    // Een bepaalde neuslat gekozen als onderlat (Toebehoren): als neuslat beoordeeld (controle v114).
    await zetPR(page, 'X', { latZijde: 'buiten', sponningDiepte: 45, onderlat: 'N30' });
    m = await G(page, 'X');
    check('onderlat N30 gekozen (sponning 45): beoordeeld als neuslat, past', m.isNeus && m.onder === 'N30' && /past|ruim|zicht/.test(m.slechtste),
      JSON.stringify(m));
    await zetPR(page, 'X', { sponningDiepte: 50, onderlat: 'N25' });
    m = await G(page, 'X');
    check('onderlat N25 bij sponning 50 (nodig 26 mm over de dorpel): "onder: N25 te klein"', m.isNeus && m.kort === 'onder: N25 te klein', JSON.stringify(m));
    await zetPR(page, 'X', { onderlat: null, latZijde: null, sponningDiepte: null });
    // Een oude vink "latten twee kanten" (v111–v113) telt als beide.
    m = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'Y'); toebehorenZetRuit(r.id, 'tweeKanten', true);
      return GlasLatten.zijde(r); });
    check('een oude vink "twee kanten" (v113) = beide', m === 'beide', m);
    // De onderdorpel minder diep: het oordeel neemt het slechtste.
    await zetPR(page, 'X', { latZijde: 'binnen', sponningDiepte: 44, diepteOnder: 40 });
    m = await G(page, 'X');
    check('onderdorpel 40 (boven 44): boven past, onderin "past niet −4"; het oordeel is "onder: past niet −4"',
      m.boven === 'past · vlak met kozijn' && m.slechtste === 'past niet' && m.waar === 'onder' && m.kort === 'onder: past niet −4', JSON.stringify(m));
    await zetPR(page, 'X', { diepteOnder: null });
    m = await G(page, 'X');
    check('diepte onderdorpel leeg = gelijk aan boven: weer "past" (v119: vlak met kozijn)', m.slechtste === 'vlak' && m.waar === 'boven', JSON.stringify(m));
    // Toebehoren telt de latten volgens de zijde.
    u = await page.evaluate(() => { const uit = {};
      const x = rijen.find(r => r.merk === 'X');
      ['binnen', 'buiten', 'beide'].forEach(z => { toebehorenZetRuit(x.id, 'latZijde', z); toebehorenZetRuit(x.id, 'sponningDiepte', 50);
        const b = toebehorenBerekenen(); const p = b.perRuit.find(q => q.rij.merk === 'X');
        uit[z] = { latM: Math.round(p.latM * 100) / 100, onder: p.onderlat, zijde: p.zijde }; });
      return uit; });
    // X 1000 × 2000: boven 1020 + 2 × 2020 + onder 1020 = 6,08 m. Buiten: onder is de neuslat (niet in latM? wel: alle latten).
    check('Toebehoren: binnen = onder dezelfde lat (A4), buiten = N30, beide = onderin A4 (v115) en alle latten twee keer',
      u.binnen.onder === 'A4' && u.buiten.onder === 'N30' && u.beide.onder === 'A4' && u.beide.latM === u.buiten.latM * 2 &&
      u.binnen.zijde === 'binnen' && u.beide.zijde === 'beide', JSON.stringify(u));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Latzijde (v115: op Toebehoren), merk in beeld, advies aantikken, telefoon');
    latProject(p => { p.data.info.toebehoren = { perRuit: { 1: { sponningDiepte: 40 } } }; });   // X past niet −4
    ({ ctx, page } = await openProject());
    const idX = idVan('X');
    await naarToebehoren(page);
    const zijdeSel = '[data-sleutel="zijde-' + idX + '"]';
    m = await page.evaluate(sel => { const s = document.querySelector(sel);
      return [s.value, s.classList.contains('leeg'), [...s.options].map(o => o.text)]; }, zijdeSel);
    check('kolom Latzijde: "?" (leeg, opvallend), te kiezen binnen / buiten / beide / geen (v115)', m[0] === '' && m[1] &&
      JSON.stringify(m[2]) === '["?","binnen","buiten","beide","geen (meegeleverd)"]', JSON.stringify(m));
    const zijdeVak = page.locator(zijdeSel);
    await zijdeVak.selectOption('buiten'); await wacht(400);
    check('gekozen: bewaard bij het project (perRuit), de ruit zelf houdt zijn stempel', await opgeslagenAls(() =>
      perRuitDb('X').latZijde === 'buiten') && dbRij('X').gewOp === INGEMETEN.gewOp && !('latZijde' in dbRij('X')),
      JSON.stringify([perRuitDb('X'), dbRij('X').gewOp]));
    check('en niet meer "leeg"', !(await page.$eval(zijdeSel, s => s.classList.contains('leeg'))));
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Control+z'); await wacht(500);
    check('ongedaan maken (Ctrl+Z): weer "?"', await page.evaluate(id => GlasLatten.zijde(rijen.find(r => String(r.id) === id)), idX) === '');
    // Merk in beeld: in de vaste eerste kolom.
    await naarInvoer(page);
    m = await page.evaluate(id => { const c = document.querySelector('#rij-' + id + ' td.rijnr');
      return [c.querySelector('.rijnr-merk').textContent, getComputedStyle(c).position]; }, idX);
    check('het merk staat ook in de vaste eerste kolom (schuift niet weg)', m[0] === 'X' && m[1] === 'sticky', JSON.stringify(m));
    // Zijwaarts vegen: de eerste kolom blijft staan (controle v114: overflow op de tabel brak dat).
    m = await page.evaluate(id => { const wrap = document.querySelector('#invoerTabel').closest('.invoer-wrap');
      wrap.scrollLeft = 600; const c = document.querySelector('#rij-' + id + ' td.rijnr');
      const uit = [Math.round(c.getBoundingClientRect().left - wrap.getBoundingClientRect().left), wrap.scrollLeft];
      wrap.scrollLeft = 0; return uit; }, idX);
    check('zijwaarts geveegd (600 px): de kolom met het merk blijft links in beeld', m[1] > 100 && Math.abs(m[0]) <= 2, JSON.stringify(m));
    const merkVak = page.locator('#rij-' + idX + ' input.merk-input');
    await merkVak.fill('X1'); await wacht(300);
    check('merk wijzigen: de eerste kolom loopt mee', await page.$eval('#rij-' + idX + ' .rijnr-merk', e => e.textContent) === 'X1');
    await merkVak.fill('X'); await merkVak.press('Tab'); await wacht(300);
    // Het venster (v115: via het oordeel op Toebehoren): advies aantikken.
    await naarToebehoren(page);
    await tbRij(page, 'X').locator('td.tb-oordeel button').click();
    await page.waitForSelector('.lat-venster', { timeout: 3000 });
    m = await page.$$eval('.lat-venster .pk-advies-knop', l => l.map(b => b.textContent));
    check('het venster: adviezen als knoppen (bijv. "Band binnen 2 mm" of een andere lat)', m.length >= 2, JSON.stringify(m));
    const adv = m.findIndex(x => /^Lat /.test(x));
    const latAdv = (m[adv].match(/^Lat ([A-Z0-9]+) /) || [])[1];
    await page.click('.lat-venster .pk-advies-knop[data-advies="' + await page.$$eval('.lat-venster .pk-advies-knop', (l, i) => l[i].dataset.advies, adv) + '"]');
    await wacht(400);
    check('advies aantikken: die lat is gekozen (' + latAdv + '), het oordeel past nu', await opgeslagenAls(() => perRuitDb('X').glaslat === latAdv) &&
      // v120: een A5 die 1 mm te krap zit, heet nu "nood" (steekt uit); hier past alleen die.
      /past|krap|ruim|nood/.test((await G(page, 'X')).boven) && !/niet|te ruim/.test((await G(page, 'X')).boven), JSON.stringify([perRuitDb('X'), await G(page, 'X')]));
    await page.keyboard.press('Escape'); await wacht(200);
    await page.keyboard.press('Control+z'); await wacht(500);
    check('ongedaan maken: één stap terug (weer de standaardlat)', await page.evaluate(id => !GlasLatten.ruit(rijen.find(r => String(r.id) === id)).glaslat, idX));
    // Onderdorpel in het venster.
    await tbRij(page, 'X').locator('td.tb-oordeel button').click();
    await page.waitForSelector('.lat-venster .pk-onderdiepte', { timeout: 3000 });
    await page.fill('.lat-venster .pk-onderdiepte', '38');
    await page.dispatchEvent('.lat-venster .pk-onderdiepte', 'change');
    await wacht(400);
    check('diepte onderdorpel in het venster: bewaard (38)', await opgeslagenAls(() => perRuitDb('X').diepteOnder === 38), JSON.stringify(perRuitDb('X')));
    await page.fill('.lat-venster .pk-onderdiepte', 'abc');
    await page.dispatchEvent('.lat-venster .pk-onderdiepte', 'change');
    await wacht(300);
    m = (await meldingen(page)).join(' | ');
    check('"abc" als diepte onderdorpel: een melding, de 38 blijft', /geen diepte/.test(m) && perRuitDb('X').diepteOnder === 38, m.slice(0, 120));
    await sluitMeldingen(page);
    await page.keyboard.press('Escape');
    await ctx.close();
    // Telefoon: Toebehoren ingeklapt, één regel per ruit; tik = open.
    latProject(p => { p.data.info.toebehoren = { perRuit: { 1: { latZijde: 'buiten', sponningDiepte: 50 }, 2: { latZijde: 'binnen' } } }; });
    ({ ctx, page } = await openProject({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
    await naarToebehoren(page);
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v114-telefoon-toebehoren-dicht.png'), fullPage: true });
    m = await page.evaluate(() => [...document.querySelectorAll('.tb-tabel tbody tr.tb-ruit')].map(tr => [tr.className, Math.round(tr.getBoundingClientRect().height)]));
    check('telefoon: elke ruit dicht, kort (≤ 120 px: merk, maat, lat en oordeel, dan een tikregel van 44 px)', m.length === 3 && m.every(x => /dicht/.test(x[0]) && x[1] <= 120), JSON.stringify(m));
    t = await tbRij(page, 'X').locator('.tb-kort-knop').innerText();
    // v117: met de uitsteek erbij.
    check('de regel zegt de zijde, de lat en de onderlat ("buiten · A4 · onder N30 · vent. 9 · uitst. 18")', /buiten · A4 · onder N30 · vent\. 9 · uitst\. 18/.test(t), t);
    await tbRij(page, 'X').locator('.tb-kort-knop').click(); await wacht(300);
    m = await tbRij(page, 'X').evaluate(tr => [tr.className, tr.querySelector('[data-sleutel^="olat-"]').offsetParent !== null]);
    check('tik: open, met de keuzes', !/dicht/.test(m[0]) && m[1], JSON.stringify(m));
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v114-telefoon-toebehoren-open.png'), fullPage: true });
    const breed = await page.evaluate(() => document.documentElement.scrollWidth);
    check('telefoon: niets schuift de pagina opzij', breed <= 390, breed);
    await naarInvoer(page);
    const iv = await page.evaluate(() => document.documentElement.scrollWidth);
    check('telefoon: Invoer met de nieuwe kolommen (Latten, Bi-color) schuift ook niet opzij', iv <= 390, iv);
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Melden: ruiten zonder zijde (Toebehoren, bestellijst), pdf invoer, export');
    latProject(p => { p.data.info.toebehoren = { perRuit: { 1: { sponningDiepte: 44, latZijde: 'binnen' }, 2: { sponningDiepte: 44 } } }; });
    ({ ctx, page } = await openProject());
    await naarToebehoren(page);
    t = await tbTekst(page);
    check('Toebehoren: "Bij 2 ruiten is nog niet gekozen of de latten binnen of buiten zitten: Y, D"',
      /Bij 2 ruiten is nog niet gekozen of de latten binnen of buiten zitten: Y, D\./.test(t), (t.match(/Bij \d+ ruit.{0,90}/g) || []).join(' / '));
    m = await page.evaluate(() => [...document.querySelectorAll('.tb-tabel td.tb-zijde')].map(td => [td.classList.contains('leeg'), td.querySelector('select').value]));
    check('in de tabel: de zijde te kiezen, zonder keuze opvallend', JSON.stringify(m) === '[[false,"binnen"],[true,""],[true,""]]', JSON.stringify(m));
    await tbRij(page, 'D').locator('select.tb-zijde-sel').selectOption('buiten');
    check('op Toebehoren gekozen: bewaard', await opgeslagenAls(() => perRuitDb('D').latZijde === 'buiten'));
    await naarInvoer(page);
    let pb = await bestellijstPdf(page, Object.assign({ 'Latzijde nog niet gekozen': 'Stoppen' }, ONVOLLEDIG));
    check('bestellijst: de vraag "Latzijde nog niet gekozen" (alles past: niet "Past het in de sponning?"); Stoppen = geen pdf',
      gevraagd.indexOf('Latzijde nog niet gekozen') >= 0 && gevraagd.indexOf('Past het in de sponning?') < 0 && pb === null, JSON.stringify(gevraagd));
    m = await page.evaluate(() => window.glasZonderZijde ? glasZonderZijde() : null);
    check('… en precies Y', JSON.stringify(m) === '["Y"]', JSON.stringify(m));
    await sluitMeldingen(page);
    // Een project zonder latten (geen diepte, geen zijde) krijgt die vraag niet.
    m = await page.evaluate(() => { const was = projectInfo.toebehoren; projectInfo.toebehoren = {}; const z = glasZonderZijde(); projectInfo.toebehoren = was; return z; });
    check('zonder sponningmaten en zijden: geen vraag (anders kreeg elk project hem)', JSON.stringify(m) === '[]', JSON.stringify(m));
    // PDF invoer: zijde en oordeel.
    await zetPR(page, 'Y', { latZijde: 'buiten' });
    const pi = await bestellijstPdf(page, ONVOLLEDIG, 'PDF invoer');
    t = plat(pdfTekst(pi));
    check('PDF invoer: kolom Lat/pakket met de zijde ("A4 binnen: past", "A4 buiten: past")', /A4 binnen: past/.test(t) && /A4 buiten: past/.test(t),
      (t.match(/Lat\/pakket.{0,300}/) || [''])[0]);
    m = await page.evaluate(() => { const x = exportTabel(); const i = x.koppen.indexOf('Latzijde');
      return [x.koppen.slice(i, i + 2), x.regels.map(r => r.slice(i, i + 2))]; });
    check('export: kolommen "Latzijde" en "Diepte onderdorpel (mm)"', JSON.stringify(m[0]) === '["Latzijde","Diepte onderdorpel (mm)"]' &&
      JSON.stringify(m[1]) === '[["binnen",""],["buiten",""],["buiten",""]]', JSON.stringify(m));
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Na een bestelling: de latten mee op slot');
    latProject(p => { p.data.info.toebehoren = { perRuit: { 1: { latZijde: 'binnen' }, 2: { latZijde: 'binnen' }, 3: { latZijde: 'binnen' } } }; });
    ({ ctx, page } = await openProject());
    await eersteBestelling(page);
    check('besteld en op slot', await opSlot(page));
    const idX = idVan('X');
    // v115: Diepte en Onder op Invoer; zijde, latknop en oordeel op Toebehoren.
    m = await page.evaluate(id => [document.querySelector('#pk-' + id + ' .spon-input').disabled, document.querySelector('#pko-' + id + ' .spon-input').disabled], idX);
    await naarToebehoren(page);
    m = m.concat(await page.evaluate(id => { const k = s => document.querySelector('[data-sleutel="' + s + id + '"]');
      return [k('zijde-').disabled, k('lat-').disabled, k('lat-').closest('tr').querySelector('td.tb-oordeel button').disabled]; }, idX));
    check('op slot: Diepte, Onder, Latzijde en Glaslat staan uit; het oordeel is te openen', m[0] && m[1] && m[2] && m[3] && !m[4], JSON.stringify(m));
    await page.evaluate(id => { latZijde(id, 'buiten'); latOnderDiepte(id, '30'); latAdvies(id, { lat: 'A12' }); latDiepte(id, '40'); }, idX);
    await wacht(500);
    // In de app zelf kijken (de database loopt achter op opslaan).
    const prX = () => page.evaluate(id => JSON.parse(JSON.stringify(GlasLatten.ruit(rijen.find(r => String(r.id) === id)))), idX);
    m = await prX();
    check('de functies weigeren (zijde, onderdorpel, advies, diepte)', JSON.stringify(m) === '{"latZijde":"binnen"}' &&
      JSON.stringify(perRuitDb('X')) === '{"latZijde":"binnen"}', JSON.stringify([m, perRuitDb('X')]));
    check('met de melding dat het besteld is', /besteld/.test((await meldingen(page)).join(' ')));
    await sluitMeldingen(page);
    // Een venster dat nog open stond (of een oud scherm): de keuze in het venster wordt ook geweigerd.
    await tbRij(page, 'X').locator('td.tb-oordeel button').click();
    await page.waitForSelector('.lat-venster .pk-zijde', { timeout: 3000 });
    m = await page.$$eval('.lat-venster .pk-zijde, .lat-venster .pk-onderdiepte', l => l.map(e => e.disabled));
    check('in het venster: zijde en onderdorpel staan uit', m.length === 2 && m.every(Boolean), JSON.stringify(m));
    await page.evaluate(() => { const s = document.querySelector('.lat-venster .pk-zijde'); s.disabled = false; s.value = 'beide';
      s.dispatchEvent(new Event('change', { bubbles: true })); });
    await wacht(500);
    m = await prX();
    check('en ook als het vak toch verandert: geweigerd', m.latZijde === 'binnen', JSON.stringify(m));
    await sluitMeldingen(page);
    await page.keyboard.press('Escape'); await wacht(200);
    // Toebehoren: de onderlat en de zijde per ruit ook.
    await naarToebehoren(page);
    m = await page.evaluate(() => [...document.querySelectorAll('.tb-tabel [data-sleutel^="olat-"], .tb-tabel select.tb-zijde-sel, #tbAlleOnderlat')].map(s => s.disabled));
    check('Toebehoren: onderlat en zijde per ruit staan uit', m.length >= 7 && m.every(Boolean), JSON.stringify(m));
    await page.evaluate(() => { toebehorenOnderlat(rijen[1].id, 'C1'); });
    await wacht(500);
    m = await page.evaluate(() => JSON.parse(JSON.stringify(GlasLatten.ruit(rijen[1]))));
    check('toebehorenOnderlat weigert', m.onderlat === undefined, JSON.stringify(m));
    await sluitMeldingen(page);
    await page.click('.tb-inst-kop'); await wacht(200);   // de instellingen open
    m = await page.evaluate(() => { toebehorenKeuze('standaardLat', 'B13');
      return [GlasLatten.project().lat, document.querySelector('select[onchange*="standaardLat"]').disabled]; });
    check('de standaardlat van het project ook op slot (die bepaalt de lat van elke ruit)', m[0] === 'A4' && m[1], JSON.stringify(m));
    await sluitMeldingen(page);
    m = await page.evaluate(() => [...document.querySelectorAll('.tb-getallen input, select[onchange*="binnen.kleur"]')].every(e => !e.disabled));
    check('de instellingen van het project (band, kit) blijven vrij', m);
    await naarInvoer(page);
    await ontgrendel(page);
    await naarToebehoren(page);
    await page.selectOption('[data-sleutel="zijde-' + idX + '"]', 'buiten');
    check('na ontgrendelen: de zijde te kiezen', await opgeslagenAls(() => perRuitDb('X').latZijde === 'buiten'));
    const w = await page.evaluate(() => { const x = teBestellen(); return { g: x.gewijzigd.length, r: x.regels.length }; });
    check('en dat is geen wijziging voor de leverancier (de latten gaan niet mee)', w.g === 0 && w.r === 0, JSON.stringify(w));
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Bi-color rooster (binnen een andere kleur dan buiten)');
    roosterProject();
    ({ ctx, page } = await openProject());
    const id1 = idVan('K1');
    m = await page.evaluate(() => { const t = document.getElementById('invoerTabel');
      return [getComputedStyle(t.querySelector('th.kol-bi')).display, getComputedStyle(t.querySelector('th.kol-ralbin')).display,
              t.querySelector('th.groep-vent').colSpan, t.querySelector('th.kol-ral').textContent.trim()]; });
    check('kolom Bi-color staat er (standaard Nee); RAL binnen nog niet; de kop heet "RAL Kleur"', m[0] !== 'none' && m[1] === 'none' &&
      m[2] === 5 && /^RAL Kleur/.test(m[3]), JSON.stringify(m));
    check('Bi-color staat op Nee', await page.$eval('#bi-' + id1 + ' select', s => s.value) === 'Nee');
    const kVoor = await page.evaluate(() => rijen.map(r => ruitKenmerk(r)));
    await page.selectOption('#bi-' + id1 + ' select', 'Ja');
    await wacht(300);
    m = await page.evaluate(() => { const t = document.getElementById('invoerTabel');
      return [getComputedStyle(t.querySelector('th.kol-ralbin')).display, t.querySelector('th.groep-vent').colSpan,
              t.querySelector('th.kol-ral').textContent.trim()]; });
    check('Ja: de kolom RAL binnen gaat open, de kop RAL heet nu "RAL buiten"', m[0] !== 'none' && m[1] === 6 && /^RAL buiten/.test(m[2]), JSON.stringify(m));
    m = await page.$eval('#ralb-' + id1 + ' select', s => [s.value, s.classList.contains('leeg'), s.title]);
    check('RAL binnen: nog te kiezen (opvallend), met de titel "Kleur binnen"', m[0] === '' && m[1] && m[2] === 'Kleur binnen', JSON.stringify(m));
    check('bij K2 (geen bi-color) staat "= buiten"', /= buiten/.test(await page.$eval('#ralb-' + idVan('K2'), e => e.textContent)));
    const pZonder = await bestellijstPdf(page, Object.assign({ 'Bi-color zonder kleur': 'Stoppen' }, ONVOLLEDIG));
    check('bestellijst met bi-color zonder kleur binnen: de vraag "Bi-color zonder kleur" (K1); Stoppen = geen pdf',
      gevraagd.indexOf('Bi-color zonder kleur') >= 0 && pZonder === null && JSON.stringify(await page.evaluate(() => glasBiZonderKleur())) === '["K1"]',
      JSON.stringify(gevraagd));
    await sluitMeldingen(page);
    await page.selectOption('#ralb-' + id1 + ' select', ZWART);
    check('bewaard: biColor Ja, ralBinnen zwart', await opgeslagenAls(() => dbRij('K1').biColor === 'Ja' && dbRij('K1').ralBinnen === ZWART), JSON.stringify(dbRij('K1')));
    const kNa = await page.evaluate(() => rijen.map(r => ruitKenmerk(r)));
    check('het kenmerk van K1 is anders, dat van K2 en K3 niet (geen "gewijzigd" bij bestaande ruiten)',
      kVoor[0] !== kNa[0] && kVoor[1] === kNa[1] && kVoor[2] === kNa[2], JSON.stringify([kVoor, kNa]));
    t = await bestelTekst(page);
    check('Bestellijst op het scherm: "Bi-color buiten: RAL 9010 - Zuiverwit / binnen: RAL 9005 - Gitzwart"',
      t.indexOf('Bi-color buiten: ' + WIT + ' / binnen: ' + ZWART) >= 0, (t.match(/buiten:.{0,80}/) || [''])[0]);
    const pb = await bestellijstPdf(page, ONVOLLEDIG);
    t = plat(pdfTekst(pb));
    check('bestellijst-pdf: "Bi-color", de kleur buiten en binnen', /Bi-color/.test(t) && /buiten: RAL 9010/.test(t) && /binnen: RAL 9005/.test(t),
      (t.match(/buiten: RAL.{0,80}/) || [t.slice(0, 300)])[0]);
    await vraagOpScherm(page); await knop(page, 'Nee, alleen bekeken');
    m = await page.evaluate(() => { const x = exportTabel(); const i = x.koppen.indexOf('Bi-color'); return [x.koppen.slice(i, i + 2), x.regels.map(r => r.slice(i, i + 2))]; });   // v115: daarachter nog Onderlat
    check('export: kolommen Bi-color en RAL binnen', JSON.stringify(m[0]) === '["Bi-color","RAL binnen"]' &&
      JSON.stringify(m[1]) === JSON.stringify([['Ja', ZWART], ['Nee', ''], ['Nee', '']]), JSON.stringify(m));
    // Rooster op Nee: bi-color weg.
    await page.selectOption('#rij-' + id1 + ' select[onchange*="\'rooster\'"]', 'Nee');
    check('rooster op Nee: bi-color en de kleur binnen gaan mee weg', await opgeslagenAls(() => !('biColor' in dbRij('K1')) && !('ralBinnen' in dbRij('K1'))),
      JSON.stringify(dbRij('K1')));
    m = await page.evaluate(() => [document.getElementById('invoerTabel').classList.contains('zonder-bicolor'), document.querySelector('#invoerTabel th.groep-vent').colSpan]);
    check('en de kolom RAL binnen is weer dicht', m[0] && m[1] === 5, JSON.stringify(m));
    // Doorvoeren: Bi-color Ja voor K1 en K2 (K1 heeft nu geen rooster: blijft zonder).
    await page.evaluate(() => { const r = rijen.find(x => x.merk === 'K2'); zetBiColor(r.id, 'Ja'); zetRalBinnen(r.id, 'RAL 9005 - Gitzwart'); });
    await page.selectOption('#bi-' + idVan('K2') + ' select', 'Nee');
    check('Bi-color terug op Nee: de kleur binnen gaat weg', await opgeslagenAls(() => !('biColor' in dbRij('K2')) && !('ralBinnen' in dbRij('K2'))));
    await ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Alleen het rooster anders na de bestelling: blok ALLEEN ROOSTER, en de zin op de aanvulling');
    roosterProject();
    ({ ctx, page } = await openProject());
    const pEerst = await bestellijstPdf(page, ONVOLLEDIG);
    t = plat(pdfTekst(pEerst));
    check('de 1e bestelling: geen zin "Graag bevestigen" (dat is voor aanvullingen)', !/Graag bevestigen/.test(t));
    await vraagOpScherm(page); await knop(page, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
    await ontgrendel(page);
    await page.evaluate(([w, z]) => { const k1 = rijen.find(r => r.merk === 'K1'); k1.ralKleur = w;          // K1: andere kleur
      const k2 = rijen.find(r => r.merk === 'K2'); k2.biColor = 'Ja'; k2.ralBinnen = z;                        // K2: bi-color
      herbereken(); renderTabel(); opslaan(); }, [CREME, ZWART]);
    await wacht(400);
    m = await page.evaluate(() => { const x = teBestellen(); return { regels: x.regels.map(r => r.merk), rooster: x.rooster.map(b => [b.rij.merk, b.was, b.nu, b.stuks]),
      bed: x.bediening.length, gew: x.gewijzigd.length }; });
    check('K1 (kleur) en K2 (bi-color): niet in de glastabel, wel in het blok rooster (met was en wordt)',
      m.regels.length === 0 && m.gew === 0 && m.bed === 0 && JSON.stringify(m.rooster) === JSON.stringify([
        ['K1', 'DucoTon 10 ' + WIT, 'DucoTon 10 ' + CREME, 1], ['K2', 'DucoTon 10 ' + WIT, 'DucoTon 10 Bi-color buiten: ' + WIT + ' / binnen: ' + ZWART, 2]]),
      JSON.stringify(m));
    t = await bestelTekst(page);
    check('Bestellijst op het scherm: "onder ALLEEN ROOSTER" en "2 ruiten met alleen een ander rooster"', /onder ALLEEN ROOSTER, het glas wordt niet opnieuw gemaakt/.test(t) &&
      /2 ruiten met alleen een ander rooster/.test(t) && !/ALLEEN BEDIENING/.test(t), (t.match(/Maak de bestellijst.{0,200}/) || [t.slice(0, 300)])[0]);
    const pa = await bestellijstPdf(page, ONVOLLEDIG);
    t = plat(pdfTekst(pa));
    check('pdf: bovenaan "Graag bevestigen dat u deze aanvulling verwerkt, met name VERVANGT en ANNULEREN."',
      /Graag bevestigen dat u deze aanvulling verwerkt, met name VERVANGT en ANNULEREN\./.test(t), t.slice(0, 400));
    check('pdf: blok "ALLEEN ROOSTER - glas NIET opnieuw maken" met K1 en K2, geen VERVANGT', /ALLEEN ROOSTER - glas NIET opnieuw maken/.test(t) &&
      !/VERVANGT K/.test(t) && /K1 1 1192 1392/.test(t) && /binnen: RAL 9005/.test(t), (t.match(/ALLEEN ROOSTER.{0,400}/) || [t.slice(-400)])[0]);
    check('pdf: onderaan geteld "2 ALLEEN ROOSTER"', /2 ALLEEN ROOSTER/.test(t), (t.match(/posities.{0,200}/) || [''])[0]);
    await vraagOpScherm(page); await knop(page, 'Ja, verstuurd');
    check('verstuurd: vastgelegd als alleen rooster (roosterVan), niet als vervangt', await wachtTot(() => {
      const b = (info().bestellingen || [])[1]; if (!b) return false;
      const k1 = b.ruiten[idVan('K1')], k2 = b.ruiten[idVan('K2')];
      return k1 && k1.roosterVan && k1.roosterVan.ralKleur === WIT && !k1.vervangt && k2 && k2.roosterVan && k2.biColor === 'Ja' && !k2.vervangt;
    }, 10000), JSON.stringify((info().bestellingen || [])[1]).slice(0, 500));
    m = await page.evaluate(() => { const st = besteldeStand(); const k1 = rijen.find(r => r.merk === 'K1');
      return [besteldInTekst(k1.id, st), roosterInTekst(k1.id, st), teBestellen().aantal, st.ruiten[k1.id].ralKleur]; });
    check('daarna: het glas van K1 uit de 1e, het rooster uit de 2e; niets meer te bestellen', m[0] === '1e' && m[1] === '2e' && m[2] === 0 && m[3] === CREME,
      JSON.stringify(m));
    // Niets te bestellen: het overzicht. Daar hoort de zin niet bij (geen aanvulling).
    const pov = await bestellijstPdf(page, ONVOLLEDIG);
    t = plat(pdfTekst(pov));
    check('het overzicht (geen bestelling): geen "Graag bevestigen"', /OVERZICHT/.test(t) && !/Graag bevestigen/.test(t), t.slice(0, 200));
    await sluitMeldingen(page);
    // Nu toch een andere maat voor K1: VERVANGT, en annuleren noemt het rooster uit de 2e.
    await ontgrendel(page);
    await page.evaluate(() => { const k1 = rijen.find(r => r.merk === 'K1'); k1.breedte = '1210'; herbereken(); renderTabel(); opslaan(); });
    await wacht(400);
    const pv = await bestellijstPdf(page, ONVOLLEDIG);
    t = plat(pdfTekst(pv));
    check('andere maat: VERVANGT K1, en bij annuleren "(en het rooster uit de 2e)"', /VERVANGT K1 uit de 1e/.test(t) &&
      /vervangen door K1 op deze lijst \(en het rooster uit de 2e\)/.test(t), (t.match(/vervangen door K1.{0,60}/) || [t.slice(-300)])[0]);
    await vraagOpScherm(page); await knop(page, 'Nee, alleen bekeken');
    // Een ander Duco type (controle v114): met een andere glasaftrek is het glas al verkeerd besteld → VERVANGT.
    await page.evaluate(() => { const k1 = rijen.find(r => r.merk === 'K1'); k1.breedte = '1200'; const k2 = rijen.find(r => r.merk === 'K2');
      k2.ducoType = 'DucoTon 18'; herbereken(); renderTabel(); opslaan(); });
    await wacht(400);
    m = await page.evaluate(() => { const x = teBestellen(); return [x.regels.map(r => r.merk), x.rooster.map(b => b.rij.merk), ducoAftrek('DucoTon 10'), ducoAftrek('DucoTon 18')]; });
    check('DucoTon 10 → 18 (glasaftrek 80 → 120 mm; het glas van 22 mm past er wel in): het glas opnieuw (VERVANGT), geen ALLEEN ROOSTER', JSON.stringify(m) === '[["K2"],[],80,120]', JSON.stringify(m));
    // Zelfde glasaftrek en het glas past (4-15-4 = 23 mm in DucoKlep 15 ZR, 18–46): wel alleen het rooster.
    await page.evaluate(() => { const k2 = rijen.find(r => r.merk === 'K2'); k2.ducoType = 'DucoKlep 15 ZR'; herbereken(); renderTabel(); opslaan(); });
    await wacht(400);
    const pd = await bestellijstPdf(page, ONVOLLEDIG);
    t = plat(pdfTekst(pd));
    check('DucoTon 10 → DucoKlep 15 ZR (beide 80 mm): ALLEEN ROOSTER, "met dezelfde glasaftrek: het bestelde glas blijft passen"', /ALLEEN ROOSTER/.test(t) &&
      /Ander Duco type, met dezelfde glasaftrek: het bestelde glas blijft passen/.test(t) && !/VERVANGT K2/.test(t), (t.match(/ALLEEN ROOSTER.{0,300}/) || [''])[0]);
    await vraagOpScherm(page); await knop(page, 'Nee, alleen bekeken');
    // Rooster Ja → Nee is wél het glas (VERVANGT).
    await page.evaluate(() => { const k2 = rijen.find(r => r.merk === 'K2'); k2.ducoType = 'DucoTon 10'; k2.rooster = 'Nee'; herbereken(); renderTabel(); opslaan(); });
    await wacht(300);
    m = await page.evaluate(() => { const x = teBestellen(); return [x.regels.map(r => r.merk), x.rooster.map(b => b.rij.merk)]; });
    check('rooster eraf: dat is ander glas (VERVANGT), geen ALLEEN ROOSTER', JSON.stringify(m) === '[["K2"],[]]', JSON.stringify(m));
    await ctx.close();
    // Een ingekorte bestelling van vóór v114 (kort: 1) kent de roostervelden niet.
    roosterProject();
    ({ ctx, page } = await openProject());
    m = await page.evaluate(([w, c]) => {
      const k1 = rijen.find(r => r.merk === 'K1');
      const o = ruitMomentopname(k1, true);
      const kort1 = { k: o.k, opLijst: true, kort: 1, aantal: o.aantal, merk: o.merk, breedte: o.breedte, hoogte: o.hoogte,
        glasBreedte: o.glasBreedte, glasHoogte: o.glasHoogte, glasType: o.glasType, opbouw: o.opbouw };
      const nu = Object.assign({}, k1, { ralKleur: c });
      return { gelijk: ruitVerschil(kort1, k1), kleur: ruitVerschil(kort1, nu), alleenRooster: !!bedieningVerschil(kort1, nu),
               terug: (() => { const r = Object.assign({}, k1); return metBedieningVan(r, kort1).ralKleur; })() };
    }, [WIT, CREME]);
    check('oude ingekorte bestelling (vóór v114): geen "rooster (leeg) → Ja" (de roostervelden zijn daar onbekend, niet leeg)',
      !m.gelijk.concat(m.kleur).some(x => /rooster|Duco|RAL/.test(x)), JSON.stringify(m));
    check('… een andere kleur is daar niet zeker "alleen rooster" (onbekend wat er besteld is): gewoon gewijzigd',
      !m.alleenRooster && m.kleur.length > 0 && m.terug === WIT, JSON.stringify(m));
    await ctx.close();
  }

  /* ══ 7 ════════════════════════════════════════════════════════ */
  if (doe('7')) {
    console.log('\n7. De overgang: een project van v113 opent goed');
    latProject(p => { p.data.info.toebehoren = { standaardLat: 'A4', standaardOnderlat: 'NEUS', latPositie: 'buiten',
      perRuit: { 1: { sponningDiepte: 50, tweeKanten: true }, 2: { glaslat: 'GL13' }, 3: { glaslat: 'B2', onderlat: 'Glaslat' } } }; });
    ({ ctx, page } = await openProject());
    m = await page.evaluate(() => rijen.filter(r => r.merk).map(r => [r.merk, GlasLatten.zijde(r), GlasLatten.latVoorRuit(r).id, GlasLatten.onderlatVoorRuit(r).id]));
    // v115: bij beide onderin dezelfde lat (A4), geen neuslat.
    check('oude vink twee kanten = beide (onderin dezelfde lat, v115); GL13 → B13; B2 → B1; onderlat "Glaslat" = dezelfde lat',
      JSON.stringify(m.slice(1)) === JSON.stringify([['Y', '', 'B13', 'B13'], ['D', '', 'B1', 'B1']]) && m[0][1] === 'beide' && m[0][3] === 'A4',
      JSON.stringify(m));
    await naarToebehoren(page);
    t = await tbTekst(page);
    check('Toebehoren rekent en meldt de ruiten zonder zijde (Y, D)', /nog niet gekozen of de latten binnen of buiten zitten: Y, D/.test(t), t.slice(0, 300));
    check('en er is niets in het project veranderd door alleen te openen', JSON.stringify(info().toebehoren.perRuit) ===
      JSON.stringify({ 1: { sponningDiepte: 50, tweeKanten: true }, 2: { glaslat: 'GL13' }, 3: { glaslat: 'B2', onderlat: 'Glaslat' } }), JSON.stringify(info().toebehoren));
    await ctx.close();
  }

  /* ══ 8 ════════════════════════════════════════════════════════ */
  if (doe('8')) {
    console.log('\n8. De latten volgens de tekeningen van Jongeneel, en de bestanden');
    latProject();
    ({ ctx, page } = await openProject());
    m = await page.evaluate(() => { const L = id => GlasLatten.latVan(id) || {};
      return { e8: L('E8').eigenSponning, c2: [L('C2').maat, L('C2').inSponning], gld1: [L('GLD1').hoogte, L('GLD1').eigenSponning], gld2: L('GLD2').eigenSponning,
               neus: GlasLatten.LATTEN.filter(l => l.soort === 'neuslat').map(l => l.neus), b2: GlasLatten.LATTEN.some(l => l.id === 'B2'),
               gl13: GlasLatten.latVan('GL13') && GlasLatten.latVan('GL13').id, b2naar: GlasLatten.latVan('B2') && GlasLatten.latVan('B2').id,
               zeker: GlasLatten.LATTEN.filter(l => !l.zeker).map(l => l.id),
               tek: GlasLatten.LATTEN.filter(l => l.tekening).map(l => l.tekening) }; });
    check('E8 zonder eigen sponning; C2 20x27 (27 in de sponning); GLD1 34,5 hoog met 7,5; GLD2 14',
      m.e8 === 0 && m.c2[0] === '20x27' && m.c2[1] === 27 && m.gld1[0] === 34.5 && m.gld1[1] === 7.5 && m.gld2 === 14, JSON.stringify(m));
    check('neuslatten: neus 9 mm (tekening)', m.neus.length === 7 && m.neus.every(n => n === 9), JSON.stringify(m.neus));
    check('B2 vervallen (oude naam → B1), GL13 heet B13', !m.b2 && m.gl13 === 'B13' && m.b2naar === 'B1', JSON.stringify(m));
    // v120: de C1 niet (Jongeneel geeft twee maten, 26 en 23; Jan meet hem na).
    check('alle latten nagemeten (zeker), behalve de C1', JSON.stringify(m.zeker) === '["C1"]', JSON.stringify(m.zeker));
    check('de tekeningen staan erbij', m.tek.length >= 20 && m.tek.every(p => fs.existsSync(path.join(map, p))), m.tek.length + ' ' + m.tek.filter(p => !fs.existsSync(path.join(map, p))).join(','));
    // Grote foto met de tekening eronder.
    await naarToebehoren(page);   // v115: de latknop staat op Toebehoren
    await page.click('[data-sleutel="lat-' + idVan('X') + '"]');
    await page.click('.lat-venster .lat-item[data-kies="A4"] .lat-plaatje');
    await page.waitForSelector('.lat-groot', { timeout: 2000 });
    m = await page.$$eval('.lat-groot img', l => l.map(i => [i.getAttribute('src'), i.naturalWidth > 0]));
    check('tik op de foto: foto en tekening (allebei geladen)', m.length === 2 && /A4\.jpg$/.test(m[0][0]) && /A4-tek\.jpg$/.test(m[1][0]) && m.every(x => x[1]),
      JSON.stringify(m));
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await ctx.close();
    const html = fs.readFileSync(path.join(map, 'index.html'), 'utf8');
    const pdfjs = fs.readFileSync(path.join(map, 'pdf.js'), 'utf8');
    const sw = fs.readFileSync(path.join(map, 'sw.js'), 'utf8');
    const versies = [html.match(/APP_VERSIE = '(v\d+)'/)[1], pdfjs.match(/PDF_VERSIE = '(v\d+)'/)[1], sw.match(/VERSIE = '(v\d+)'/)[1]];
    // v115: de nummers gaan mee omhoog; hier alleen dat ze gelijk zijn en minstens v114.
    check('de drie versienummers zijn gelijk (v114 of later)', versies.every(v => v === versies[0] && +v.slice(1) >= 114), JSON.stringify(versies));
    const fotos = (sw.match(/const LAT_FOTOS = \[([\s\S]*?)\];/) || ['', ''])[1].match(/'\.\/latten\/[^']+'/g) || [];
    const map2 = fs.readdirSync(path.join(map, 'latten'));
    check('de offline-lijst: alle ' + fotos.length + ' foto\'s en tekeningen, en die staan er ook', fotos.length === 51 &&
      fotos.every(f => map2.indexOf(f.slice(10, -1)) >= 0) && map2.length === 51, fotos.length + ' / ' + map2.length);
    check('geen GL13.jpg en geen fotoscript meer', map2.indexOf('GL13.jpg') < 0 && !fs.existsSync(path.join(map, 'latfotos-ophalen.sh')));
  }

  /* ══ ═══════════════════════════════════════════════════════════ */
  console.log('\nGeen fouten in de console');
  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log(fouten ? '\n' + fouten + ' FOUT(EN).' : '\nAlles goed.');
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
