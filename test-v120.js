/* Testreeks v120 — node test-v120.js   (en: node test-v120.js --mutaties)

   Onderwerp: alles wat de grote proef van v119 vond, met Jans keuzes van
   22-10-2026 (v120 bevat v118 en v119). Per onderdeel een echte situatie:
   1. Invoer: een komma in een maat, een aantal van 0, −5 of 2,7, en een
      tikfout (12117 mm, 120 stuks) vóór de bestellijst.
   2. Twee tabbladen op één apparaat, zonder bereik: het werk blijft.
   3. Twee apparaten bestellen vanaf dezelfde stand (iPad offline "Ja,
      verstuurd", een collega neemt over en bestelt ook): luid gemeld; de
      nummering na intrekken.
   4. Importeren: kolomkoppen (Opmerking, Maatsoort), een merk dat al
      bestaat (keuze, bolletjes gaan mee), Alles vervangen, max glaspakket
      met halve mm of tekst, lege cellen aan het eind, ✕.
   5. Latten en Toebehoren: A5 1 mm te krap = nood, vlak ook onderin buiten,
      strook "vlak", zaagplan + 1 reserve, ⧉ dupliceren neemt de keuzes mee,
      "Alle ruiten" met vraag en Terugzetten (aanvinken: test-v121), Enter naar
      de volgende ruit, lengte onder 1 m.
   6. Pdf en scherm: kop van de bestellijst (besteller met telefoon,
      contact op het werk, referentie), opmerking op de werkvloer, "na de
      laatste bestelling gewijzigd", samenvatting, ✕ met Terugzetten,
      selectie, 📷, kleuren, tik-plek op een iPad.
   7. Beveiliging in de app: vreemde nummers van ruiten en foto's, tekst
      uit een project op het scherm.
   8. Telefoon en back-up.
   9. Versie.

   Wat deze opstelling aanneemt: een nagebootste database in node (met het
   bewerkslot, het versieslot en de bestellingen-trigger zoals de scripts
   21, 23 en 24), echte Chromium, pdf's teruggelezen met pdfplumber. Script
   26 (rechten) wordt apart getest tegen een echte PostgreSQL (zie de nota).
   Echte Safari, iPad, Android en Windows: niet hier. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  // 2 (🔴 A): het werk van een tweede tabblad
  pendingWeg: ['cloud.js', "        if (!pendNu || vanWie === 'geen') {", "        if (true) {"],
  tabRedding: ['cloud.js', "        if (oud && oud._projectId && oud._projectId !== (basisVan || null) && localStorage.getItem(LS_PENDING) === '1') {", "        if (0) {"],
  // 3 (🔴 B): dubbel besteld, nummering
  dubbelMelding: ['index.html', "  const d = dubbeleBestellingen();\n  if (!d.length || !window.appFout) return false;", "  const d = [];\n  if (!d.length || !window.appFout) return false;"],
  basisVast: ['index.html', "    basis: laatsteGeldig,", ""],
  nummering: ['index.html', "b && !b.ingetrokken ? Math.max(m, b.nr || i + 1) : m", "b ? Math.max(m, b.nr || i + 1) : m"],
  // 1: invoer
  kommaMaat: ['index.html', "oninput=\"setVal(${id},'breedte',leesMaat(this.value));", "oninput=\"setVal(${id},'breedte',this.value.replace(/[^0-9]/g, ''));"],
  aantalNul: ['index.html', "  if (t === '' || !Number.isInteger(n) || n < 1 || n > 999) {", "  if (t === '') {"],
  vreemdVraag: ['pdf.js', "      return k === 'door' ? vreemdeControle(bm) : k;", "      return k;"],
  // 4: import
  kolomKop: ['import.js', "(d.indexOf(w) === 0 || d.slice(-w.length) === w)", "d.indexOf(w) >= 0"],
  merkVraag: ['import.js', "    if (bots.length && window.appKeuze) {", "    if (0) {"],
  vervangenTelt: ['import.js', "    nieuw = verwerkMerken(nieuw, [], 'nieuw');", "    nieuw = verwerkMerken(nieuw, rijen.filter(function (r) { return !echtLeeg(r); }), 'nieuw');"],
  letters: ['import.js', "    if (!opCijfer(k)) return String(n);", "    return String(n);"],
  pakketHalf: ['import.js', "          var mp = pakketLees(v);", "          var mp = maatLees(v);"],
  legeCellen: ['import.js', "      if (gevuld > tabel.kop.length) {", "      if (r.length > tabel.kop.length) {"],
  // 5: latten
  a5Krap: ['latten.js', "over >= -MARGE_MM && over < speling", "over >= 0 && over < speling"],
  onderVlak: ['latten.js', "      : 'vlak';", "      : uit.plek === 'onder' && (uit.zijde === 'buiten' || uit.zijde === 'beide') ? 'past' : 'vlak';"],
  vlakStrook: ['toebehoren.js', "    if (vlak.length) {", "    if (0) {"],
  reserve: ['toebehoren.js', "      var nodig = plan.staven.length + reserve;", "      var nodig = Math.max(Math.ceil(totaal * 1.1 / staaf - 1e-9), plan.staven.length + plan.teLang.length);"],
  kopieKeuzes: ['kopie.js', "    meegenomen = window.toebehorenKopieerRuit ? toebehorenKopieerRuit(bron.id, id) : [];", "    meegenomen = [];"],
  alleVraag: ['toebehoren.js', "    if (window.appVraag && !await appVraag((alleen", "    if (false && !await appVraag((alleen"],
  // v121: alleenGekozen staat nu in test-v121 (de actiebalk).
  enterVolgende: ['toebehoren.js', "    if (volgende) { volgende.focus();", "    if (0) { volgende.focus();"],
  staafVraag: ['toebehoren.js', "    if (sleutel === 'STAAF_MM' && n != null && n < 1000 && window.appKeuze) {", "    if (0) {"],
  // 6: pdf en scherm
  kopContact: ['pdf.js', "      if (wieRegel) doc.text(", "      if (0) doc.text("],
  werkvloerOpm: ['pdf.js', "    var met = function (t) { return [t, opm].filter(Boolean).join(' · '); };", "    var met = function (t) { return t; };"],
  nietBesteld: ['pdf.js', "    if (!w || !w.bestelling || !w.aantal) return '';", "    return '';"],
  samenvattingOpm: ['index.html', "${esc([r.opmerking, r.roedenopmerking ? 'roeden: ' + r.roedenopmerking : ''].filter(Boolean).join(' · '))}", "${esc(r.roedenopmerking)}"],
  terugzetten: ['index.html', "  kortBericht('Regel ' + (kopie.merk", "  if (0) kortBericht('Regel ' + (kopie.merk"],
  bolTik: ['index.html', ".foto-mark::before { content: '';", ".foto-mark::before { content: none;"],
  selectieWeg: ['index.html', "  if (tabNaam !== 'invoer' && window.bulkSelectieWissen", "  if (0 && window.bulkSelectieWissen"],
  // 7: beveiliging
  veiligeIds: ['cloud.js', "    if (window.glasVeiligeIds && glasVeiligeIds()) {", "    if (false) {"],
  escSamenvatting: ['index.html', "      <td class=\"num\">${esc(r.breedte)}</td>", "      <td class=\"num\">${r.breedte}</td>"],
  // 8: telefoon en back-up
  telefoonPdf: ['pdf.js', "g && g.telefoon ? 'tel. ' + g.telefoon : ''", "''"],
  backupFotos: ['backup.js', "              zip.file('fotos/' + pad,", "              if (0) zip.file('fotos/' + pad,"],
};
const WAAR = { pendingWeg: '2', tabRedding: '2', dubbelMelding: '3', basisVast: '3', nummering: '3',
  kommaMaat: '1', aantalNul: '1', vreemdVraag: '1',
  kolomKop: '4', merkVraag: '4', vervangenTelt: '4', letters: '4', pakketHalf: '4', legeCellen: '4',
  a5Krap: '5', onderVlak: '5', vlakStrook: '5', reserve: '5', kopieKeuzes: '5', alleVraag: '5', enterVolgende: '5', staafVraag: '5',
  kopContact: '6', werkvloerOpm: '6', nietBesteld: '6', samenvattingOpm: '6', terugzetten: '6', bolTik: '6', selectieWeg: '6',
  veiligeIds: '7', escSamenvatting: '7', telefoonPdf: '6', backupFotos: '8' };

if (process.argv.indexOf('--mutaties') >= 0) {
  let goed = 0;
  const alleen = process.argv[process.argv.indexOf('--mutaties') + 1];
  const namen = Object.keys(MUTATIES).filter(n => !alleen || alleen.split(',').indexOf(n) >= 0);
  namen.forEach(function (naam) {
    const r = spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { MUTATIE: naam, ALLEEN: WAAR[naam] || '' }),
                                                         encoding: 'utf8', timeout: 600000 });
    const uit = (r.stdout || '') + (r.stderr || '');
    const regels = uit.split('\n').filter(l => /^\s+FOUT /.test(l)).map(l => l.trim());
    // Alleen een eigen FOUT-regel telt als gevangen (geen crash of time-out).
    const gevangen = regels.length > 0 && !/mutatie past niet/.test(uit) && !/FOUT \(crash\)/.test(regels[0]);
    console.log((gevangen ? '  ok   ' : '  FOUT ') + 'mutatie ' + naam + (gevangen ? ' wordt gevangen: ' : ' wordt NIET gevangen ') +
                (regels[0] ? regels[0].slice(0, 110) : (/mutatie past niet/.test(uit) ? '(past niet!)' : uit.slice(-200))));
    if (gevangen) goed++;
  });
  const n = namen.length;
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
  S.nieuwId = 0; S.weg = {}; S.zonderTrigger = false; S.slot = {}; S.geenLive = {}; S.log = []; S.zonderSlot = false;
}
resetDb();
const bewaarB = () => JSON.stringify(S.db.projecten.find(p => p.id === P(2)).data);


function bewaken(r, d) {
  if (JSON.stringify(d) === JSON.stringify(r.data)) return null;
  const versie = parseInt(d._versieNr, 10) || 0;
  if (versie < (parseInt(r.data._versieNr, 10) || 0)) {
    return { code: 'P0001', message: 'Verouderde app-versie: tik op ↻ Bijwerken. Je werk blijft op dit apparaat staan.' };
  }
  if (S.zonderSlot) return null;
  const revOud = /^\d+$/.test(String(r.data._rev == null ? '' : r.data._rev)) ? parseInt(r.data._rev, 10) : null;
  d._rev = (revOud || 0) + 1;
  const van = d._apparaat;
  if (versie < 106 || !van) return null;
  const nu = new Date().toISOString();
  const sl = S.slot[r.id];
  if (sl && sl.apparaat && sl.apparaat !== van) {
    S.log.push({ wat: 'geweigerd', wie: d._apparaatNaam, waarom: 'houder' });
    return { code: 'P0001', message: 'Bewerkslot: ' + (sl.naam || 'een collega') + ' bewerkt dit project nu. ' +
             'Je werk blijft op dit apparaat en wordt apart bewaard.', details: '', hint: '' };
  }
  const schrijver = (r.data._apparaat || '') + '/' + (r.data._sessie || '');
  const ik = van + '/' + (d._sessie || '');
  const basis = d._basis;
  if (revOud != null && schrijver !== ik && (basis == null || !/^\d+$/.test(String(basis)) || parseInt(basis, 10) !== revOud)) {
    S.log.push({ wat: 'geweigerd', wie: d._apparaatNaam, waarom: 'basis ' + basis + ' ≠ ' + revOud });
    return { code: 'P0001', message: 'Bewerkslot: ' + (r.data._apparaatNaam || 'een collega') + ' heeft dit project ' +
             'intussen gewijzigd. Je werk blijft op dit apparaat en wordt apart bewaard.', details: '', hint: '' };
  }
  if (!sl || !sl.apparaat) {
    S.slot[r.id] = Object.assign(sl || { project_id: r.id, overname_apparaat: null, overname_naam: null, overname_op: null },
      { apparaat: van, naam: d._apparaatNaam, omschrijving: d._apparaatSoort, sinds: nu, gezien: nu });
    live('bewerkslot', S.slot[r.id]);
    return null;
  }
  sl.gezien = nu;
  live('bewerkslot', sl);
  return null;
}
function glasBewerken(a) {
  if (!a.p_apparaat) return { data: null, error: { message: 'glas_bewerken: geen apparaat' } };
  const r = S.slot[a.p_project] || (S.slot[a.p_project] = { project_id: a.p_project, apparaat: null, naam: null,
    omschrijving: null, sinds: null, gezien: null, overname_apparaat: null, overname_naam: null, overname_op: null });
  const voor = JSON.stringify(r);
  const vorige = r.naam;
  const nu = new Date().toISOString();
  const leeg = { overname_apparaat: null, overname_naam: null, overname_op: null };
  const act = a.p_actie;
  if (act === 'claim' || act === 'vraag') {
    if (!r.apparaat || r.apparaat === a.p_apparaat) {
      const mijnVraag = r.overname_apparaat === a.p_apparaat;
      Object.assign(r, { sinds: r.apparaat === a.p_apparaat ? r.sinds : nu, apparaat: a.p_apparaat, naam: a.p_naam,
                         omschrijving: a.p_omschrijving, gezien: nu });
      if (mijnVraag) Object.assign(r, leeg);
    } else if (act === 'vraag') {
      Object.assign(r, { overname_apparaat: a.p_apparaat, overname_naam: a.p_naam, overname_op: nu });
    }
  } else if (act === 'hartslag') {
    if (r.apparaat === a.p_apparaat) r.gezien = nu;
  } else if (act === 'forceer') {
    Object.assign(r, { apparaat: a.p_apparaat, naam: a.p_naam, omschrijving: a.p_omschrijving, sinds: nu, gezien: nu }, leeg);
  } else if (act === 'vrijgeven') {
    if (r.apparaat === a.p_apparaat) Object.assign(r, { apparaat: null, naam: null, omschrijving: null, sinds: null, gezien: null });
  } else if (act === 'intrekken') {
    if (r.overname_apparaat === a.p_apparaat) Object.assign(r, leeg);
  } else if (act !== 'stand') {
    return { data: null, error: { message: 'glas_bewerken: onbekende actie ' + act } };
  }
  if (act !== 'stand' && act !== 'hartslag') S.log.push({ wat: act, wie: a.p_naam, houder: r.naam });
  if (JSON.stringify(r) !== voor) live('bewerkslot', r);
  return { data: Object.assign({}, r, { vorige: vorige, nu: nu }), error: null };
}
const PAGINAS = [];
function live(tabel, rij) {
  const kopie = JSON.parse(JSON.stringify(rij));
  setTimeout(() => {
    PAGINAS.forEach(p => {
      if (p.dicht || S.offline || S.weg[p.apparaat] || S.geenLive[p.apparaat]) return;
      p.page.evaluate(([t, r]) => window.__live && window.__live(t, r), [tabel, kopie]).catch(() => {});
    });
  }, 30);
}
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
    if (st.tabel === 'projecten' && st.velden.data) {
      for (const r of geraakt) { const f = bewaken(r, st.velden.data); if (f) { delete st.velden.data._rev; return { data: null, error: f }; } }
    }
    geraakt.forEach(r => {
      const oud = JSON.parse(JSON.stringify(r));
      Object.assign(r, JSON.parse(JSON.stringify(st.velden)), { updated_at: new Date().toISOString() });
      if (st.tabel === 'projecten' && st.velden.data && !S.zonderTrigger) triggerBestellingen(oud, r);
      if (st.tabel === 'projecten') { S.log.push({ wat: 'opslaan', wie: (st.velden.data || {})._apparaatNaam || '?' }); live('projecten', r); }
    });
    if (st.terug && st.kols && /bestellingen:data->info->bestellingen/.test(st.kols)) {
      return { data: geraakt.map(r => ({ id: r.id, status: r.status,
        bestellingen: JSON.parse(JSON.stringify(((r.data || {}).info || {}).bestellingen || null)),
        rev: /rev:data->_rev/.test(st.kols) ? (r.data._rev == null ? null : r.data._rev) : undefined })), error: null };
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
  if (v.naam === 'glas_bewerken') {
    if (S.zonderSlot) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.glas_bewerken' } };
    return glasBewerken(v.args);
  }
  if (v.naam === 'glas_bestellingen_erbij') {
    if (S.zonderSlot) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } };
    const r = S.db.projecten.find(p => p.id === v.args.p_project);
    if (!r) return { data: null, error: null };
    const oud = JSON.parse(JSON.stringify(r));
    r.data.info = r.data.info || {};
    r.data.info.bestellingen = v.args.p_bestellingen;
    if (v.args.p_besteld) r.data.info.besteld = v.args.p_besteld; else delete r.data.info.besteld;
    if ((RANG[v.args.p_status] || 0) > (RANG[r.status] || 0)) {
      r.status = v.args.p_status; r.data.info.status = v.args.p_status; r.data.info.slot = v.args.p_slot || null;
    }
    triggerBestellingen(oud, r);
    S.log.push({ wat: 'bestellingen erbij', wie: '?' });
    live('projecten', r);
    return { data: { rev: r.data._rev, status: r.status, aantal: r.data.info.bestellingen.length }, error: null };
  }
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
  if (v.actie === 'list') {
    // v120: wat er in een map staat (bestanden en submappen), zoals Supabase.
    const pre = String(v.pad || '') + '/';
    const namen = {};
    [...S.opslag.keys()].filter(k => k.indexOf(pre) === 0).forEach(k => {
      const rest = k.slice(pre.length); const d = rest.split('/');
      if (d.length > 1) namen[d[0]] = { name: d[0], id: null }; else namen[rest] = { name: rest, id: 'b-' + rest };
    });
    return { data: Object.values(namen), error: null };
  }
  if (v.actie === 'download') {
    if (S.offline) return { data: null, error: { message: 'Failed to fetch' } };
    if (!S.opslag.has(v.pad)) return { data: null, error: { statusCode: '404', message: 'Object not found' } };
    return { data: { b64: (S.opslag.get(v.pad).b64 || Buffer.from('foto ' + v.pad).toString('base64')) }, error: null };
  }
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
  var kanalen = [];
  window.__live = function (tabel, rij) {
    kanalen.slice().forEach(function (k) {
      k.h.forEach(function (h) {
        if (h.f.table !== tabel) return;
        var m = /^(\\w+)=eq\\.(.*)$/.exec(h.f.filter || '');
        if (m && String(rij[m[1]]) !== m[2]) return;
        h.cb({ new: JSON.parse(JSON.stringify(rij)) });
      });
    });
  };
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
    channel: function () {
      var k = { state: 'joined', h: [] };
      k.on = function (soort, f, cb) { k.h.push({ f: f || {}, cb: cb }); return k; };
      k.subscribe = function (cb) { kanalen.push(k); if (cb) cb('SUBSCRIBED'); return k; };
      return k;
    },
    removeChannel: function (k) { kanalen = kanalen.filter(function (x) { return x !== k; }); },
    storage: { from: function () { return {
      upload: function (pad, blob, o) {
        return b64(blob).then(function (n) {
          return opslag({ actie: 'upload', pad: pad, grootte: n, type: (o && o.contentType) || blob.type });
        });
      },
      list: function (p) { return opslag({ actie: 'list', pad: p }); },
      download: function (p) { return opslag({ actie: 'download', pad: p }).then(function (r) {
        if (r.error) return r;
        var bin = atob(r.data.b64), a = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
        return { data: new Blob([a]), error: null };
      }); },
      remove: function (paden) { return opslag({ actie: 'remove', paden: paden }); },
      createSignedUrl: function (pad) { return opslag({ actie: 'link', pad: pad }); }
    }; } }
  }; } };
})();`;

/* ─── de app serveren ─────────────────────────────────────────── */
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v120-'));
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
let ctxTeller = 0;
async function nieuweContext(opties, apparaat) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block', acceptDownloads: true }, opties || {}));
  await ctx.exposeFunction('__db', s => JSON.stringify(apparaat && S.weg && S.weg[apparaat]
    ? { data: null, error: GEEN_BEREIK } : dbVraag(JSON.parse(s))));
  await ctx.exposeFunction('__rpc', s => JSON.stringify(apparaat && S.weg && S.weg[apparaat]
    ? { data: null, error: GEEN_BEREIK } : rpcVraag(JSON.parse(s))));
  await ctx.exposeFunction('__opslag', s => JSON.stringify(apparaat && S.weg && S.weg[apparaat]
    ? { data: null, error: { name: 'StorageUnknownError', message: 'Failed to fetch' } } : opslagVraag(JSON.parse(s))));
  ctx.__apparaat = apparaat || ('ctx' + (++ctxTeller));
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
  const pr = { page: page, apparaat: ctx.__apparaat, dicht: false };
  PAGINAS.push(pr); page.on('close', () => { pr.dicht = true; });
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v120-pdf-'));
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
async function openProject(opties, apparaat) {
  const c = await nieuweContext(opties, apparaat);
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




/* ─── hulp voor v120 ──────────────────────────────────────────── */
// (uit test-v119) X binnen met een A5 in 41 mm (nood), Y binnen met een A4 in
// 44 mm (precies vlak), D binnen met een A4 in 50 mm (6 mm in zicht).
const LATTEN119 = p => { p.data.info.toebehoren = { perRuit: {
  1: { latZijde: 'binnen', sponningDiepte: 41, glaslat: 'A5' },
  2: { latZijde: 'binnen', sponningDiepte: 44 },
  3: { latZijde: 'binnen', sponningDiepte: 50 } } }; };
const IPAD = { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true };
async function apparaat(opties, naam, n) {
  const c = await nieuweContext(opties, naam);
  await c.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  const p = await nieuwePagina(c);
  if (n) await open(p, n);
  return { ctx: c, page: p };
}
// Een vak in de rij van een merk invullen zoals een mens: klik, typ, Tab.
async function vul(page, merk, klasse, waarde, toets) {
  const id = await page.evaluate(m => (rijen.find(r => r.merk === m) || {}).id, merk);
  const v = page.locator('#rij-' + id + ' .' + klasse).first();
  await v.click();
  await v.fill('');
  await page.keyboard.type(String(waarde));
  await page.keyboard.press(toets || 'Tab');
  await wacht(500);
  return v;
}
// Bestellijst maken en "Ja, verstuurd" (of "Nee, alleen bekeken").
async function bestel(page, antwoorden, ja) {
  const pad = await bestellijstPdf(page, antwoorden);
  const v = await vraagOpScherm(page);
  if (!v.ok) return { pad, verstuurd: false, tekst: pdfTekst(pad), vraag: v.tekst };
  await knop(page, ja === false ? 'Nee, alleen bekeken' : 'Ja, verstuurd');
  await wacht(800);
  return { pad, verstuurd: ja !== false, tekst: pdfTekst(pad), na: await meldingen(page) };
}
async function tochBewerken(page) {
  await page.locator('button:visible:has-text("Toch bewerken")').first().click();
  await wachtTot(async () => (await page.locator('button:has-text("Overnemen")').count()) > 0 ||
    !(await page.evaluate(() => window.glasAlleenKijken && glasAlleenKijken())), 40000);
  if ((await page.locator('button:has-text("Overnemen")').count()) > 0) await page.locator('button:has-text("Overnemen")').first().click();
  await wachtTot(async () => !(await page.evaluate(() => window.glasAlleenKijken && glasAlleenKijken())), 10000);
  await wacht(1500);
}
const bestellingenDb = () => ((rijVan(1).data.info || {}).bestellingen || []);
const kortBer = page => page.$eval('#kortBericht', e => e.hidden ? '' : e.innerText.replace(/\s+/g, ' ')).catch(() => '');
// Het importvenster: tekst plakken en inlezen (echte kliks).
async function importPlak(page, tekst) {
  await page.click('button:has-text("⬆ Importeren")');
  await page.click('.veld-menu button:has-text("Sponningmaten")');
  await page.waitForSelector('#impPlak', { state: 'visible' });
  await page.fill('#impPlak', tekst);
  await page.click('#impStap1 button:has-text("Tekst inlezen")');
  await page.waitForSelector('#impStap2', { state: 'visible' });
}
const mapping = page => page.$$eval('#impVoorbeeld th select', s => s.map(x => x.value));
async function importControleer(page) { await page.click('#impControleren'); await page.waitForSelector('#impStap3', { state: 'visible' }); await wacht(200); }
const stap3 = page => page.$eval('#impControle', e => e.innerText.replace(/\s+/g, ' '));
const ruitenDb = () => rijVan(1).data.rijen.filter(r => r.breedte || r.hoogte || r.merk);
const gevelLabels = page => page.$$eval('#doek-' + FOTO + ' .foto-mark', l => l.map(x => x.textContent.trim()));
const statusVan = (page, merk, opties, onder) => R(page, merk, new Function('r', 'G', 'var x = G.' + (onder ? 'pakketOnder(r)' : 'pakket(r, ' + JSON.stringify(opties || {}) + ')') +
  '; return x.status + ":" + G.kort(x);'));

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, m, t, u;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Invoer: een komma in een maat, aantallen, tikfouten vóór de bestellijst');
    bestelProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    const vak = await vul(page, 'K1', 'breedte-input', '1212,5');
    m = await schermRij(page, 'K1');
    t = await kortBer(page);
    check('1212,5 getypt: 1212 bewaard (niet 12125), het vak toont 1212', m.breedte === '1212' && (await vak.inputValue()) === '1212',
      JSON.stringify([m.breedte, await vak.inputValue()]));
    check('met een melding: afgerond naar beneden', /1212,5 mm afgerond naar 1212 mm/.test(t), t);
    await opgeslagen(page, () => rijVan(1).data.rijen[0].breedte === '1212');
    check('in de database: 1212', rijVan(1).data.rijen[0].breedte === '1212', rijVan(1).data.rijen[0].breedte);
    await vul(page, 'K1', 'hoogte-input', '600 mm');
    check('"600 mm" getypt: 600', (await schermRij(page, 'K1')).hoogte === '600', (await schermRij(page, 'K1')).hoogte);
    // Aantallen: 0, −5 en 2,7 worden geweigerd; het oude aantal blijft.
    const geweigerd = [];
    for (const a of ['0', '-5', '2.7']) {
      await vul(page, 'K2', 'aantal-input', a);
      geweigerd.push([a, (await schermRij(page, 'K2')).aantal, await kortBer(page)]);
    }
    check('aantal 0, −5 en 2,7: geweigerd, het aantal blijft 1, met een melding', geweigerd.every(g => String(g[1]) === '1' &&
      /heel getal zijn van 1 tot 999/.test(g[2])), JSON.stringify(geweigerd));
    await vul(page, 'K2', 'aantal-input', '3');
    check('aantal 3: gewoon goed', String((await schermRij(page, 'K2')).aantal) === '3');
    // Tikfouten: 12117 breed, 120 stuks → eerst een vraag.
    await vul(page, 'K2', 'breedte-input', '12117');
    await vul(page, 'K3', 'aantal-input', '120');
    await page.click('button:has-text("⬇ Exporteren")');
    await page.click('button:has-text("Bestellijst als PDF")');
    let vr = await wachtOpMelding(page, /Klopt dit\?/, 8000);
    if (!vr.ok) { await sluitMeldingen(page); vr = await wachtOpMelding(page, /Klopt dit\?/, 4000); }
    check('vóór de bestellijst: "Klopt dit?" met K2 (12117 mm) en K3 (120 stuks)', vr.ok && /K2: glas 12109 x 1392 mm is groter dan de grootste glasplaat/.test(vr.tekst) &&
      /K3: aantal 120 \(meer dan 99\)/.test(vr.tekst), vr.tekst.slice(0, 400));
    if (vr.ok) await knop(page, 'Stoppen');
    await wacht(800);
    check('Stoppen: geen bestelling', !bestellingenDb().length && !(await meldingen(page)).some(x => /Naar de leverancier/.test(x)));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Twee tabbladen op één apparaat, zonder bereik');
    // a. A = Kerkstraat, B = Molenweg (alleen open). Zonder bereik iets typen
    //    in A, dan A herladen (Safari doet dat zelf ook). Bereik terug.
    resetDb();
    ctx = await nieuweContext(null, 'laptop');
    const A = await nieuwePagina(ctx); await open(A, 1);
    const B = await nieuwePagina(ctx); await open(B, 2);
    await wacht(1000);
    S.weg.laptop = true;
    await A.bringToFront();
    await A.locator('.opm-input').first().fill('WERK-A offline');
    await A.keyboard.press('Tab');
    await wacht(1500);
    await A.reload();
    await wacht(2500);
    S.weg.laptop = false;
    await wachtTot(() => JSON.stringify(S.db.projecten.map(p => p.data)).includes('WERK-A'), 15000);
    const waar = S.db.projecten.filter(p => JSON.stringify(p.data).includes('WERK-A')).map(p => p.naam);
    check('herladen terwijl een tweede tabblad een ander project open had: het werk staat in de database',
      waar.length > 0, JSON.stringify(waar) + ' | projecten: ' + S.db.projecten.map(p => p.naam).join(', '));
    check('… in de Kerkstraat zelf', waar.indexOf('Kerkstraat 1') >= 0, JSON.stringify(waar));
    await ctx.close();
    // b. Allebei typen zonder bereik, A sluiten, later opnieuw openen.
    resetDb();
    ctx = await nieuweContext(null, 'laptop');
    const A2 = await nieuwePagina(ctx); await open(A2, 1);
    const B2 = await nieuwePagina(ctx); await open(B2, 2);
    await wacht(1000);
    S.weg.laptop = true;
    await A2.bringToFront();
    await A2.locator('.opm-input').first().fill('WERK-A offline'); await A2.keyboard.press('Tab'); await wacht(800);
    await B2.bringToFront();
    await B2.locator('.opm-input').first().fill('WERK-B offline'); await B2.keyboard.press('Tab'); await wacht(800);
    await A2.close({ runBeforeUnload: true });
    S.weg.laptop = false;
    await wacht(6000);
    const C = await nieuwePagina(ctx); await open(C, 1); await wacht(4000);
    const db = JSON.stringify(S.db.projecten.map(p => p.data));
    check('allebei getypt, A dicht: het werk van A én B staat in de database (A eventueel apart bewaard)',
      db.includes('WERK-A') && db.includes('WERK-B'), 'projecten: ' + S.db.projecten.map(p => p.naam).join(' | '));
    await ctx.close();
    // c. Hetzelfde project in twee tabbladen: de app zegt het.
    resetDb();
    ctx = await nieuweContext(null, 'laptop');
    const D1 = await nieuwePagina(ctx); await open(D1, 1);
    const D2 = await nieuwePagina(ctx); await open(D2, 1);
    const twee = await wachtTot(async () => /ook open in een ander tabblad/.test((await kortBer(D1)) + (await kortBer(D2))), 9000);
    check('hetzelfde project in twee tabbladen: berichtje "Twee tabbladen" (geen venster: dat zou het bewerkslot ophouden)', twee &&
      !(await meldingen(D1)).concat(await meldingen(D2)).some(x => /tabblad/.test(x)));
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Twee apparaten bestellen vanaf dezelfde stand; nummering na intrekken');
    bestelProject();
    const bart = await apparaat(IPAD, 'ipad', 1);
    await wacht(1500);
    const jul = await apparaat(null, 'pc', 1);
    await wacht(1500);
    S.weg.ipad = true;
    await bestel(bart.page);
    await sluitMeldingen(bart.page);
    await tochBewerken(jul.page);
    await bestel(jul.page);
    await sluitMeldingen(jul.page);
    S.weg.ipad = false;
    const dub = await wachtTot(async () => (await meldingen(bart.page)).some(x => /DUBBEL BESTELD/.test(x)), 15000);
    const tekst = (await meldingen(bart.page)).join(' | ');
    check('de iPad krijgt bereik: "DUBBEL BESTELD … bel de leverancier"', dub && /Bel de leverancier en laat de dubbele annuleren/.test(tekst), tekst.slice(0, 300));
    check('niet de geruststellende melding "zodat niemand hem nog een keer bestelt"', !/zodat niemand hem nog een keer bestelt/.test(tekst), tekst.slice(0, 200));
    check('in de database: twee bestellingen vanaf dezelfde stand', bestellingenDb().length === 2 &&
      bestellingenDb().every(b => b.basis === ''), JSON.stringify(bestellingenDb().map(b => [b.nr, b.basis, b.door])));
    await sluitMeldingen(bart.page);
    await jul.page.reload(); await wacht(4000);
    await sluitMeldingen(jul.page);
    t = await jul.page.evaluate(() => { renderBestellijst(); const e = document.querySelector('.bestel-dubbel'); return e ? e.innerText : ''; });
    check('op de pc (na herladen): een rode balk "Dubbel besteld" op Bestellijst', /dubbel/i.test(t), t.slice(0, 200));
    await bart.ctx.close(); await jul.ctx.close();
    // Nummering: 1e, dan een aanvulling die per ongeluk "Ja" kreeg en is
    // ingetrokken, dan de echte aanvulling: die heet weer "2e".
    bestelProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await bestel(page); await sluitMeldingen(page);
    await ontgrendel(page); await sluitMeldingen(page);
    await vul(page, 'K1', 'breedte-input', '1210');
    await bestel(page); await sluitMeldingen(page);
    await page.click('.tab-btn:has-text("Bestellijst")'); await wacht(400);
    await page.locator('button:has-text("Intrekken")').first().click();
    await page.fill('.melding-laag input[type=password]', 'geheim');
    await knop(page, 'Intrekken');
    await wacht(1000); await sluitMeldingen(page);
    await naarInvoer(page);
    if (await page.evaluate(() => invoerOpSlot())) { await ontgrendel(page); await sluitMeldingen(page); }
    await vul(page, 'K2', 'breedte-input', '810');
    const r3 = await bestel(page, null, false);
    t = plat(r3.tekst);
    check('na een ingetrokken 2e: de volgende lijst is weer de 2e (pdf en bestandsnaam)', /2e BESTELLIJST/i.test(t) && !/3e BESTELLIJST/i.test(t) &&
      /2e/.test(laatsteNaam), (t.match(/.{0,40}BESTELLIJST.{0,40}/i) || [''])[0] + ' | ' + laatsteNaam);
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Importeren');
    // a. Een maatstaat met Opmerking, Maatsoort, Max glaspakket en lege cellen aan het eind.
    resetDb();
    rijVan(1).data.rijen = [];
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await importPlak(page, 'Merk;Breedte;Hoogte;Opmerking;Maatsoort;Max glaspakket;;\n' +
      'K7;1000;800;let op schuin;Glasmaat;27,5;;\nK8;900;700;;Dagmaat;max 26 mm;;\nK9;500;600;;;past;;');
    m = await mapping(page);
    check('kolom "Opmerking" → Opmerking (niet Merk), "Maatsoort" → Maatsoort (niet Glas type)', m[0] === 'merk' && m[3] === 'opmerking' && m[4] === 'maatsoort' &&
      m[5] === 'maxPakket' && m.indexOf('glasType') < 0, JSON.stringify(m));
    await importControleer(page);
    t = await stap3(page);
    check('lege cellen aan het eind: geen regel geweigerd', !/NIET overgenomen/.test(t), t.slice(0, 300));
    check('stap 3 toont het max pakket: 27 mm (stond er als «27,5»), 26 mm (stond er als «max 26 mm»)',
      /27 mm \(stond er als «27,5»\)/.test(t) && /26 mm \(stond er als «max 26 mm»\)/.test(t), t.slice(0, 500));
    check('«past» niet te lezen: gemeld (niet stil weg)', /max glaspakket niet te lezen \(bijv\. «past»\): niet overgenomen/.test(t), t.slice(-300));
    await page.click('#impToevoegen'); await wacht(600);
    await opgeslagen(page, () => ruitenDb().length === 3);
    u = ruitenDb().map(r => [r.merk, r.maatsoort, r.maxPakket || '', r.opmerking || '']);
    check('overgenomen: maatsoort per regel, max pakket 27 en 26, opmerking', JSON.stringify(u) === JSON.stringify([
      ['K7', 'Glasmaat (direct)', 27, 'let op schuin'], ['K8', 'Dagmaat', 26, ''], ['K9', 'Sponningmaat', '', '']]) ||
      JSON.stringify(u) === JSON.stringify([['K7', 'Glasmaat (direct)', '27', 'let op schuin'], ['K8', 'Dagmaat', '26', ''], ['K9', 'Sponningmaat', '', '']]),
      JSON.stringify(u));
    // a2. Een lijst zonder kolom Merk, met "Opmerkingen" (meervoud), en lege
    //     cellen aan het eind van de regels (niet in de kop).
    rijVan(1).data.rijen = [];
    await importPlak(page, 'Pos;Breedte;Hoogte;Opmerkingen\n1;500;600;bovenlicht;;\n2;700;800;;;;');
    m = await mapping(page);
    check('kolom "Opmerkingen" (zonder kolom Merk) → Opmerking, niet Merk', m[3] === 'opmerking' && m.indexOf('merk') < 0, JSON.stringify(m));
    await importControleer(page);
    t = await stap3(page);
    check('regels met lege cellen achteraan (de kop heeft ze niet): niet geweigerd', !/NIET overgenomen/.test(t) && /2 regels/.test(t), t.slice(0, 300));
    await page.click('#impSluitKnop').catch(() => page.click('#impVenster header .sluit-x'));
    await ctx.close();
    // b. Een merk dat al bestaat, op de foto: "Bestaande ook nummeren"; het bolletje gaat mee.
    ({ ctx, page } = await gevelOpen());
    await importPlak(page, 'Merk;Breedte;Hoogte\nA;500;500\nG;600;600');
    await importControleer(page);
    await page.click('#impToevoegen');
    const v4 = await wachtOpMelding(page, /Merk bestaat al/, 5000);
    check('A bestaat al: de app vraagt het, met wat elk antwoord oplevert', v4.ok && /Alleen de nieuwe nummeren — bestaand: A; nieuw: A1/.test(v4.tekst) &&
      /Bestaande ook nummeren — bestaand: A1; nieuw: A2/.test(v4.tekst), v4.tekst.slice(0, 400));
    if (v4.ok) await knop(page, 'Bestaande ook nummeren');
    await wacht(800);
    check('de bestaande A heet nu A1, de nieuwe A2, G blijft G', (await schermRij(page, 'A1')).id === 1 && !!(await schermRij(page, 'A2')).id &&
      !!(await schermRij(page, 'G')).id && !(await schermRij(page, 'A')).id, JSON.stringify(await page.evaluate(() => rijen.map(r => r.merk))));
    const labels = await gevelLabels(page);
    check('het bolletje van de oude A op de foto heet nu A1', labels.indexOf('A1') >= 0 && labels.indexOf('A') < 0, JSON.stringify(labels));
    await opgeslagen(page, () => (rijVan(1).data.rijen.find(r => r.id === 1) || {}).merk === 'A1');
    check('in de database: ruit 1 = A1, zijn bolletje wijst er nog naar', rijVan(1).data.rijen.find(r => r.id === 1).merk === 'A1' &&
      rijVan(1).data.fotos[0].markeringen.some(x => x.rijId === 1));
    await ctx.close();
    // c. Cijfers: 1 en 11 bestaan; twee keer 1 inlezen → 1a en 1b (niet 11 en 12).
    resetDb();
    rijVan(1).data.rijen = [ruit(1, '1', '400', '400'), ruit(2, '11', '400', '400')]; rijVan(1).data.volgendId = 3;
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await importPlak(page, 'Merk;Breedte;Hoogte\n1;500;500\n1;600;600');
    await importControleer(page);
    await page.click('#impToevoegen');
    if ((await wachtOpMelding(page, /Merk bestaat al/, 5000)).ok) await knop(page, 'Alleen de nieuwe nummeren');
    await wacht(800);
    u = await page.evaluate(() => rijen.filter(r => r.breedte).map(r => r.merk));
    check('1 en 11 bestonden; twee keer 1 ingelezen: 1a en 1b, de oude 1 en 11 blijven', JSON.stringify(u) === JSON.stringify(['1', '11', '1a', '1b']), JSON.stringify(u));
    await ctx.close();
    // d. Alles vervangen: niet doortellen op wat weggaat.
    resetDb();
    rijVan(1).data.rijen = [ruit(1, 'A1', '400', '400'), ruit(2, 'A2', '400', '400')]; rijVan(1).data.volgendId = 3;
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await importPlak(page, 'Merk;Breedte;Hoogte\nA;500;500\nA;600;600');
    await importControleer(page);
    await page.click('#impVervangen');
    await wachtOpMelding(page, /vervangen/i, 4000); await knop(page, 'Vervangen');
    await wacht(800);
    u = await page.evaluate(() => rijen.filter(r => r.breedte).map(r => r.merk));
    check('Alles vervangen: A1 en A2 (niet A3 en A4)', JSON.stringify(u) === JSON.stringify(['A1', 'A2']), JSON.stringify(u));
    // e. ✕ en Escape in stap 2 en 3.
    await importPlak(page, 'Merk;Breedte;Hoogte\nB;500;500');
    const x = page.locator('#impVenster header .sluit-x');
    check('stap 2: een ✕ rechtsboven', await x.isVisible());
    await importControleer(page);
    await x.click(); await wacht(200);
    check('✕ in stap 3 sluit het venster', !(await page.locator('#impVenster').isVisible()));
    await importPlak(page, 'Merk;Breedte;Hoogte\nB;500;500');
    await page.keyboard.press('Escape'); await wacht(200);
    check('Escape sluit het venster ook', !(await page.locator('#impVenster').isVisible()));
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Latten en Toebehoren');
    latProject(p => { p.data.rijen[0].opmerking = ''; });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await zetPR(page, 'X', { latZijde: 'binnen' });
    // X: 4-15-4 (23) + 3 + 3 band = 29; A5 neemt 12 in (+3 sponninkje).
    u = await statusVan(page, 'X', { lat: 'A5', sponningDiepte: 40 });
    check('A5 in 40 mm (1 mm te krap): "nood: steekt 4 mm uit" (niet het mildere "krap")', u === 'nood:nood: steekt 4 mm uit', u);
    await zetPR(page, 'X', { latZijde: 'buiten', sponningDiepte: 50, diepteOnder: 44, onderlat: 'ZELFDE' });
    u = await statusVan(page, 'X', null, true);
    check('onderin buiten precies vlak: ook oranje "vlak met kozijn" (keuze Jan)', u === 'vlak:past · vlak met kozijn', u);
    u = await R(page, 'X', (r, G) => G.adviezen(r, 'onder').join(' | '));
    check('het advies daar: eerst een neuslat (water loopt af)', /^Onderin een neuslat .* \(het water loopt af\)/.test(u), u.slice(0, 200));
    // De C1 (Jan, 22-10): Jongeneel noemt 26 en 23. Rekenen met 26, geen tweede
    // tekening met een andere maat, en "nog niet nagemeten" met de uitleg.
    u = await page.evaluate(() => { const l = GlasLatten.latVan('C1'); return { s: l.inSponning, zeker: l.zeker, tek: l.tekening || '', opm: l.opm || '' }; });
    check('C1: rekent met 26, zonder de tekening van 23, "nog niet nagemeten" met uitleg', u.s === 26 && u.zeker === false && !u.tek &&
      /26.*23|23.*26/.test(u.opm), JSON.stringify(u));
    await page.evaluate(() => GlasLatten.groot('C1')); await wacht(300);
    t = await page.$eval('.lat-groot', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
    check('C1 groot: één plaatje, met de uitleg over de twee maten', (await page.locator('.lat-groot img.lat-tek').count()) === 0 && /meet één lat na/.test(t), t.slice(0, 200));
    await page.keyboard.press('Escape'); await wacht(200);
    await ctx.close();
    // Strook "vlak", zaagplan + 1 reserve.
    latProject(LATTEN119);
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page);
    if (await page.locator('#tbStap3 .tb-reken-knop[aria-pressed="false"]').count()) { await page.click('#tbStap3 .tb-reken-knop'); await wacht(300); }   // v124: de rekenregels staan eerst dicht
    t = await tbTekst(page);
    check('strook: "Bij 1 ruit komt de lat precies vlak met het kozijn: Y"', /Bij 1 ruit komt de lat precies vlak met het kozijn: Y\./.test(t), (t.match(/.{0,20}precies vlak.{0,80}/) || [''])[0]);
    u = await page.evaluate(() => JSON.parse(JSON.stringify(toebehorenBerekenen().latten)));
    check('elk lattype: zaagplan + 1 reserve', u.length > 0 && u.every(l => l.staven === l.zaagplanStaven + 1 && l.reserve === 1),
      JSON.stringify(u.map(l => [l.type, l.zaagplanStaven, l.staven])));
    check('de rekenregel zegt het: "zaagplan N lengtes van 4,0 m + 1 reserve = N+1 lengtes"',
      u.every(l => new RegExp('zaagplan ' + l.zaagplanStaven + ' lengtes? van 4,0 m \\+ 1 reserve = ' + l.staven + ' lengtes?').test(t)), t.slice(0, 300));
    await ctx.close();
    // Een lat langer dan de lengte (instelling 2 m, ruit 2 m hoog): apart, niet ook nog als gewone lengte.
    latProject(p => { LATTEN119(p); p.data.info.toebehoren.afwijkingen = { STAAF_MM: 2000 }; });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page);
    u = await page.evaluate(() => JSON.parse(JSON.stringify(toebehorenBerekenen().latten)));
    check('latten langer dan de lengte: apart, niet dubbel geteld (lengtes = zaagplan + 1)', u.some(l => l.teLang.length) &&
      u.every(l => l.staven === l.zaagplanStaven + (l.zaagplanStaven ? 1 : 0)), JSON.stringify(u.map(l => [l.type, l.zaagplanStaven, l.teLang.length, l.staven])));
    const scherm = await page.$$eval('details.tb-zaag summary', s => s.map(x => x.textContent));
    await naarInvoer(page);
    const pdfW = await bestellijstPdf(page, { 'Past het in de sponning?': 'Toch doorgaan' }, 'PDF werkvloer');
    const tw = plat(pdfTekst(pdfW));
    check('scherm en werkvloer zeggen hetzelfde: "+ 1 reserve" en "waarvan 1 reserve"', scherm.every(s => /\+ 1 reserve/.test(s)) &&
      /besteld \d+, waarvan 1 reserve\)/.test(tw) && !/extra voor zaagverlies/.test(tw), JSON.stringify(scherm) + ' | ' + (tw.match(/Zaagplan .{0,80}/) || [''])[0]);
    await ctx.close();
    // ⧉ dupliceren: de keuzes van Toebehoren gaan mee, met "Controleer …".
    latProject(LATTEN119);
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    const idX = await idOp(page, 'X');
    await page.locator('#rij-' + idX + ' .btn-kopie').first().click();
    await wacht(500);
    t = await kortBer(page);
    const kopie = await page.evaluate(() => { const r = rijen[1]; return { merk: r.merk, e: toebehorenRuit(r) }; });
    check('⧉ bij X: de kopie heeft sponningdiepte 41, latzijde binnen en glaslat A5', kopie.e.sponningDiepte === 41 && kopie.e.latZijde === 'binnen' &&
      kopie.e.glaslat === 'A5', JSON.stringify(kopie));
    check('melding "Controleer sponningdiepte, latzijde en glaslat: die zijn meegekopieerd"', /Controleer sponningdiepte, latzijde en glaslat: die zijn meegekopieerd/.test(t), t);
    await ctx.close();
    // Ruiten aanvinken, "Alle ruiten" met vraag, en terugzetten.
    latProject(LATTEN119);
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page);
    // v121 (P3): aangevinkte ruiten gaan via de actiebalk (test-v121); dit
    // blok is voor alle ruiten, met eerst de vraag.
    t = await page.$eval('.tb-alles-blok', e => e.innerText.replace(/\s+/g, ' '));
    // v124: het blok heet "Alle ruiten tegelijk wijzigen" (in stap 1 "Voor het hele project").
    check('niets aangevinkt: het blok is "Alle ruiten tegelijk wijzigen"', /Alle ruiten tegelijk wijzigen/.test(t) &&
      /Toepassen op alle ruiten/.test(t), t.slice(0, 200));
    await page.selectOption('#tbAlleZijde', 'buiten');
    await page.click('.tb-alles button:has-text("Toepassen")');
    const va = await wachtOpMelding(page, /Bij alle 3 ruiten \(X, Y, D\)/, 4000);
    check('eerst de vraag, met de ruiten en wat er verandert', va.ok && /zijde: buiten/.test(va.tekst), va.tekst.slice(0, 300));
    if (va.ok) await knop(page, 'Toepassen');
    await wacht(500);
    u = await page.evaluate(() => ['X', 'Y', 'D'].map(mk => GlasLatten.zijde(rijen.find(r => r.merk === mk))));
    check('alle drie zijn nu buiten', JSON.stringify(u) === JSON.stringify(['buiten', 'buiten', 'buiten']), JSON.stringify(u));
    t = await kortBer(page);
    check('melding "Toegepast op 3 ruiten" met ↶ Terugzetten', /Toegepast op 3 ruiten/.test(t) && /Terugzetten/.test(t), t);
    await page.click('#kortBericht button:has-text("Terugzetten")'); await wacht(600);
    u = await page.evaluate(() => ['X', 'Y', 'D'].map(mk => GlasLatten.zijde(rijen.find(r => r.merk === mk))));
    check('Terugzetten: weer binnen', JSON.stringify(u) === JSON.stringify(['binnen', 'binnen', 'binnen']), JSON.stringify(u));
    // Enter in een dieptevak: naar hetzelfde vak van de volgende ruit.
    const dX = tbR(page, 'X').locator('input[data-sleutel^="diepte-"]');
    await dX.click(); await dX.fill('45'); await page.keyboard.press('Enter'); await wacht(600);
    u = await page.evaluate(() => [document.activeElement && document.activeElement.getAttribute('data-sleutel'),
      toebehorenRuit(rijen.find(r => r.merk === 'X')).sponningDiepte]);
    const idY = await idOp(page, 'Y');
    check('Enter in de diepte van X: 45 bewaard, de cursor staat in de diepte van Y', u[0] === 'diepte-' + idY && u[1] === 45, JSON.stringify(u));
    // Lengte 5,4 (in het vak voor mm): eerst een vraag.
    await page.evaluate(() => { toebehorenGetal('STAAF_MM', '5,4'); });
    const vl = await wachtOpMelding(page, /Een glaslat van 5,4 mm lang\?/, 3000);
    check('lengte "5,4": de app vraagt het, en biedt 5.400 mm aan', vl.ok && /5\.400 mm \(5,4 m\)/.test(vl.tekst), vl.tekst.slice(0, 200));
    if (vl.ok) await knop(page, '5.400 mm');
    await wacht(400);
    check('gekozen: 5400 mm', await page.evaluate(() => projectInfo.toebehoren.afwijkingen.STAAF_MM) === 5400);
    await ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Pdf en scherm');
    bestelProject();
    Object.assign(rijVan(1).data.info, { contact: 'Piet de Vries', telefoon: '06 11111111', referentie: 'OPD-77' });
    rijVan(1).data.rijen[0].opmerking = 'achterdeur, let op hoogte';
    rijVan(1).data.rijen[0].kgM2 = 20;
    S.db.gebruikers[0].telefoon = '06 22222222';
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await wacht(800);
    let pdf = await bestellijstPdf(page);
    t = plat(pdfTekst(pdf));
    check('bestellijst: "Besteld door: julian, tel. 06 22222222", contact op het werk en ons referentienummer',
      /Besteld door: julian, tel\. 06 22222222 Contact op het werk: Piet de Vries, tel\. 06 11111111 Ons ref\.: OPD-77/.test(t), (t.match(/Besteld door.{0,120}/) || [t.slice(0, 200)])[0]);
    if ((await vraagOpScherm(page)).ok) await knop(page, 'Nee, alleen bekeken');
    await sluitMeldingen(page);
    pdf = await bestellijstPdf(page, {}, 'PDF werkvloer');
    t = plat(pdfTekst(pdf));
    check('werkvloer: de opmerking bij Let op', /K1 .{0,120}achterdeur, let op hoogte/.test(t), (t.match(/K1 .{0,160}/) || [''])[0]);
    check('nog niet besteld: geen "na de laatste bestelling gewijzigd"', !/na de laatste bestelling gewijzigd/.test(t));
    // Samenvatting: de opmerking (niet de roedenopmerking), een komma in de getallen.
    await page.click('.tab-btn:has-text("Samenvatting")'); await wacht(300);
    t = await page.$eval('#samenvattingInhoud', e => e.innerText.replace(/\s+/g, ' '));
    check('samenvatting: de opmerking van de ruit staat erin', /achterdeur, let op hoogte/.test(t), t.slice(0, 200));
    check('samenvatting: getallen met een komma (0,706 m², 14,1 kg)', /0,706/.test(t) && !/0\.706/.test(t) && /14,1/.test(t), (t.match(/0[.,]70\d.{0,30}/) || [''])[0]);
    await naarInvoer(page);
    // Besteld, daarna iets gewijzigd: de werkvloer en PDF invoer zeggen het.
    await eersteBestelling(page); await sluitMeldingen(page);
    await ontgrendel(page); await sluitMeldingen(page);
    await vul(page, 'K2', 'breedte-input', '810');
    pdf = await bestellijstPdf(page, {}, 'PDF werkvloer');
    t = plat(pdfTekst(pdf));
    check('werkvloer na een wijziging: "LET OP: na de laatste bestelling gewijzigd, nog niet besteld (1 gewijzigd)"',
      /LET OP: na de laatste bestelling gewijzigd, nog niet besteld \(1 gewijzigd\)/.test(t), t.slice(-300));
    pdf = await bestellijstPdf(page, {}, 'PDF invoer');
    t = plat(pdfTekst(pdf));
    check('PDF invoer ook', /na de laatste bestelling gewijzigd, nog niet besteld/.test(t));
    await ctx.close();
    // ✕ verwijderen met Terugzetten (B heeft drie bolletjes op de foto).
    ({ ctx, page } = await gevelOpen());
    const idB = await idOp(page, 'B');
    await page.locator('#rij-' + idB + ' .btn-del').first().click();
    await wacht(500);
    t = await kortBer(page);
    check('✕ bij B: weg, met "Regel B verwijderd" en ↶ Terugzetten', !(await schermRij(page, 'B')).id && (await schermBollen(page, 'B')) === -1 &&
      /Regel B verwijderd/.test(t) && /Terugzetten/.test(t), t);
    await page.click('#kortBericht button:has-text("Terugzetten")'); await wacht(600);
    check('Terugzetten: B terug, op zijn plek, met zijn drie bolletjes', (await schermRij(page, 'B')).id === idB && (await schermBollen(page, 'B')) === 3 &&
      (await page.evaluate(() => rijen[1].merk)) === 'B', JSON.stringify(await page.evaluate(() => rijen.map(r => r.merk))));
    await opgeslagen(page, () => dbBollen('B') === 3);
    check('in de database: B met drie bolletjes', dbRij('B').id === idB && dbBollen('B') === 3);
    // De selectie hoort bij Invoer.
    await vinkAan(page, 'A');
    const balkAan = await page.locator('#bulkBalk').isVisible();
    await naarToebehoren(page);
    const balkNa = await page.locator('#bulkBalk').isVisible();
    check('een ruit geselecteerd, dan naar Toebehoren: de selectiebalk is weg', balkAan && !balkNa, JSON.stringify([balkAan, balkNa]));
    await naarInvoer(page);
    // 📷 Foto toevoegen: een vaste knop die de bestandskiezer opent.
    const kiezer = page.waitForEvent('filechooser', { timeout: 4000 }).then(() => true, () => false);
    await page.click('#actieBalk button:has-text("📷 Foto toevoegen")');
    check('📷 Foto toevoegen opent de bestandskiezer', await kiezer);
    // Kleuren: Exporteren niet rood.
    u = await page.$eval('#actieBalk button:has-text("Exporteren")', b => getComputedStyle(b).backgroundColor);
    check('⬇ Exporteren is niet rood (rood = hoofdknop en fouten)', u === 'rgb(67, 66, 63)', u);
    u = await page.evaluate(() => { const th = [...document.querySelectorAll('#invoerTabel thead tr:last-child th')].find(x => /Aantal/.test(x.textContent)); return th ? getComputedStyle(th).position : '?'; });
    check('kolomkop "Aantal" blijft niet staan bij zijwaarts vegen', u === 'static', u);
    await ctx.close();
    // Een iPad: tik-plek van een bolletje en de knoppen 44 px.
    gevelProject();
    ({ ctx, page } = await apparaat(IPAD, 'ipad', 1));
    await page.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(400);
    // Tikken net naast het bolletje (binnen 22 px van het midden) raakt het bolletje.
    u = await page.evaluate(() => {
      const b = document.querySelector('.foto-mark');
      const rb = b.getBoundingClientRect();
      const x = rb.left + rb.width / 2 + Math.min(21, rb.width / 2 + 3), y = rb.top + rb.height / 2;
      const raak = document.elementFromPoint(x, y);
      return { raak: !!(raak && raak.closest && raak.closest('.foto-mark') === b), r: Math.round(rb.width / 2) };
    });
    check('iPad: een tik net naast het bolletje (' + (u.r + 3) + ' px van het midden) raakt het bolletje', u.raak, JSON.stringify(u));
    u = await page.evaluate(() => {
      const b = document.querySelector('.foto-mark');
      const voor = getComputedStyle(b, '::before');
      const knop = document.querySelector('#actieBalk .btn');
      return { voor: voor.width + 'x' + voor.height, bol: Math.round(b.getBoundingClientRect().height), knop: Math.round(knop.getBoundingClientRect().height),
               grof: matchMedia('(pointer: coarse)').matches };
    });
    check('iPad: bolletje minstens 22 px met een tik-plek van 44 × 44, knoppen 44 px hoog', u.grof && u.voor === '44pxx44px' &&
      u.bol >= 22 && u.knop >= 44, JSON.stringify(u));
    await ctx.close();
  }

  /* ══ 7 ════════════════════════════════════════════════════════ */
  if (doe('7')) {
    console.log('\n7. Beveiliging in de app');
    gevelProject(p => {
      const r = p.data.rijen;
      r[0].id = '1" onmouseover="window.__x=1';          // A: een ruit met een tekst als nummer
      r[1].id = '2';                                      // B: een getal als tekst (oud, onschuldig)
      r[2].merk = '<img src=x onerror="window.__x=3">';  // C: HTML in het merk
      r[3].breedte = '"><img src=x onerror="window.__x=4">';
      p.data.fotos[0].id = "f1' onclick='window.__x=2";
      r.forEach(x => { if (x.fotoId) x.fotoId = p.data.fotos[0].id; });
      p.data.fotos[0].markeringen.forEach(x => { if (x.rijId === 1) x.rijId = r[0].id; if (x.rijId === 2) x.rijId = '2'; });
    });
    ctx = await nieuweContext(null, 'pc');
    page = await nieuwePagina(ctx);
    await open(page, 1);
    await wacht(800);
    for (const tab of ['Samenvatting', 'Toebehoren', 'Bestellijst', 'Invoer']) { await page.click('.tab-btn:has-text("' + tab + '")'); await wacht(400); }
    await page.mouse.move(300, 300); await page.mouse.move(600, 500);
    u = await page.evaluate(() => ({ x: window.__x || null, ids: rijen.map(r => r.id), foto: fotos[0].id,
      fotoRijen: rijen.filter(r => r.fotoId === fotos[0].id).length, bollen: fotos[0].markeringen.map(m => m.rijId),
      merkC: (rijen.find(r => /img/.test(r.merk)) || {}).merk, merken: rijen.filter(r => r.merk).length }));
    check('niets uit het project is als code uitgevoerd', u.x === null, JSON.stringify(u.x));
    check('nummers hersteld: ruit-nummers zijn getallen, de foto heeft een gewoon nummer', u.ids.every(i => Number.isSafeInteger(i)) &&
      /^[A-Za-z0-9_-]+$/.test(u.foto), JSON.stringify(u));
    check('er gaat niets verloren: zes ruiten, de ruiten bij de foto blijven bij de foto, het merk staat er als tekst',
      u.ids.length >= 6 && u.merken === 6 && u.fotoRijen === 5 && u.merkC === '<img src=x onerror="window.__x=3">', JSON.stringify(u));
    check('de bolletjes gaan mee: A (nieuw nummer) en B ("2" als tekst) houden hun bolletjes', u.bollen.filter(x => x === 2).length === 3 &&
      u.bollen.filter(x => x === u.ids[0]).length === 1 && u.bollen.length === 7 && u.bollen.every(x => Number.isSafeInteger(x)), JSON.stringify(u.bollen));
    // Zonder iets te doen: de herstelde stand gaat vanzelf naar de server.
    await wachtTot(() => rijVan(1).data.rijen.every(r => Number.isSafeInteger(r.id)), 8000);
    check('vanzelf opgeslagen: de database heeft weer gewone nummers', rijVan(1).data.rijen.every(r => Number.isSafeInteger(r.id)) &&
      /^[A-Za-z0-9_-]+$/.test(rijVan(1).data.fotos[0].id));
    u = await page.evaluate(() => esc('<a href=\'x\' title="y">'));
    check('esc maakt ook \' en > onschadelijk', u === '&lt;a href=&#39;x&#39; title=&quot;y&quot;&gt;', u);
    await ctx.close();
  }

  /* ══ 8 ════════════════════════════════════════════════════════ */
  if (doe('8')) {
    console.log('\n8. Telefoon en back-up');
    gevelProject();
    S.opslag.set(P(1) + '/gevel.jpg', { grootte: 10 });
    S.opslag.set(P(1) + '/origineel/gevel.jpg', { grootte: 20 });
    ctx = await nieuweContext(null, 'pc');
    await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    page = await nieuwePagina(ctx);
    await page.goto(adres);
    await page.waitForSelector('#startScherm:not([hidden])', { timeout: 10000 }); await wacht(800);
    check('startscherm zonder telefoon: "📞 Telefoon toevoegen"', /Telefoon toevoegen/.test(await page.locator('#startTelefoon').innerText()));
    await page.click('#startTelefoon');
    await page.waitForSelector('.melding-laag input');
    await page.fill('.melding-laag input', 'abc');
    await knop(page, 'Opslaan');
    const fout = await wachtOpMelding(page, /lijkt geen telefoonnummer/, 3000);
    check('"abc": geen telefoonnummer, niet bewaard', fout.ok && !S.db.gebruikers[0].telefoon);
    await sluitMeldingen(page);
    await page.click('#startTelefoon');
    await page.waitForSelector('.melding-laag input');
    await page.fill('.melding-laag input', '06 12345678');
    await knop(page, 'Opslaan');
    await wacht(600);
    check('06 12345678: bewaard bij de gebruiker (database), de knop is nu 📞', S.db.gebruikers[0].telefoon === '06 12345678' &&
      (await page.locator('#startTelefoon').innerText()).trim() === '📞', JSON.stringify(S.db.gebruikers[0]));
    // Back-up met foto's.
    check('startscherm: "💾 Back-up maken" (nog nooit gedaan)', /Back-up maken/.test(await page.locator('#startBackup').innerText()));
    const dl = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    await page.click('#startBackup');
    await wachtOpMelding(page, /Back-up maken/, 3000);
    await knop(page, 'Met foto\'s');
    const d = await dl;
    let inhoud = null;
    if (d) {
      const doel = path.join(pdfMap, 'backup.zip');
      await d.saveAs(doel);
      const JSZip = require(path.join(__dirname, 'lib/jszip-3.10.1/jszip.min.js'));
      const zip = await JSZip.loadAsync(fs.readFileSync(doel));
      inhoud = { namen: Object.keys(zip.files).sort(), projecten: JSON.parse(await zip.file('projecten.json').async('string')),
                 leesmij: await zip.file('LEESMIJ.txt').async('string'), naam: d.suggestedFilename() };
    }
    check('een zip-bestand "Glasopname-backup_…_met-fotos.zip"', inhoud && /^Glasopname-backup_\d{4}-\d\d-\d\d_\d{4}_met-fotos\.zip$/.test(inhoud.naam), inhoud && inhoud.naam);
    check('erin: projecten.json (alle 2, met de ruiten), taken, gebruikers, LEESMIJ', inhoud && inhoud.projecten.length === 2 &&
      inhoud.projecten.some(p => (p.data.rijen || []).length === 6) && ['taken.json', 'gebruikers.json', 'LEESMIJ.txt'].every(n => inhoud.namen.indexOf(n) >= 0),
      inhoud && JSON.stringify(inhoud.namen));
    check('en de foto én het origineel, in de map van het project', inhoud && inhoud.namen.indexOf('fotos/' + P(1) + '/gevel.jpg') >= 0 &&
      inhoud.namen.indexOf('fotos/' + P(1) + '/origineel/gevel.jpg') >= 0, inhoud && JSON.stringify(inhoud.namen));
    await wacht(500);
    check('daarna: de knop is gewoon 💾 (back-up van vandaag)', (await page.locator('#startBackup').innerText()).trim() === '💾');
    await ctx.close();
  }

  /* ══ 9 ════════════════════════════════════════════════════════ */
  if (doe('9')) {
    console.log('\n9. Versie');
    const lees = n => fs.readFileSync(path.join(map, n), 'utf8');
    const versies = [lees('index.html').match(/APP_VERSIE = 'v(\d+)'/), lees('pdf.js').match(/PDF_VERSIE = 'v(\d+)'/),
                     lees('sw.js').match(/const VERSIE = 'v(\d+)'/)].map(x => x ? +x[1] : 0);
    check('versie v120 of later, gelijk in index.html, pdf.js en sw.js', versies.every(v => v === versies[0] && v >= 120), JSON.stringify(versies));
    check('backup.js staat in de pagina en in de service worker', /<script src="backup\.js"><\/script>/.test(lees('index.html')) && /'\.\/backup\.js'/.test(lees('sw.js')));
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
