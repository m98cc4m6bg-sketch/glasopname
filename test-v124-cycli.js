/* Testreeks v124 (echte werkgangen) — node test-v124-cycli.js
   (en: --mutaties, of --mutaties naam1,naam2; ALLEEN=1,3 voor een paar
   werkgangen; PLAATJES=map voor schermafdrukken en de pdf's als afbeelding)

   Onderwerp: de losse onderdelen van v124 zijn elk getest (test-v124-rechten,
   -werkpunten, -herstel, -tekeningen, -toebehoren). Deze reeks loopt complete
   werkgangen door zoals ze in de praktijk gebeuren: over meerdere
   onderdelen heen, met meerdere apparaten en personen tegelijk, en met
   storingen (geen bereik, herladen, rechten die veranderen, een oude
   versie). De tester repareert niets: wat hier rood wordt, is een melding.

   De vijf vragen (skill grondig-testen):
   1. De echte situatie. Jan (beheerder) op de pc op kantoor en op de iPad;
      Kees en Bart (collega's) op een pc of iPad; Wim (werkvloer) met een
      iPhone op de bouw, vaak zonder bereik. Script 30 is gedraaid. Een
      project gaat van aanmaken via import (maatstaat + pdf), aanwijzen,
      toebehoren en bestellen naar ontgrendelen en een tweede bestelling;
      intussen gooit iemand iets weg, verandert de beheerder rechten, ruimt
      de app de prullenbak op, en draait er nog een apparaat op v123.
   2. De belofte (in Jans woorden): nooit gegevens kwijt; wie iets niet mag,
      hoort waarom en verliest zijn werk niet; per ongeluk weggegooid komt
      met één tik terug, ook na een bestelling; de werkvloer zit niemand in
      de weg; de bestellijst klopt (één regel per ruit, spacer, VERVANGT).
   3. Wat er misgaat als het niet klopt: werk van kantoor overschreven door
      een oude ↶-stapel, een foto die terugkomt na bewust weghalen of juist
      verdwijnt, een bestelling die stil niet doorgaat, een geblokkeerde
      collega die werk kwijtraakt, een wees in de opslag, een v123-apparaat
      dat zijn werk niet kwijt kan.
   4. Wat er halverwege kan gebeuren: herladen tussen de stappen, geen bereik
      bij het maken van een foto, rechten die veranderen terwijl iemand bezig
      is, een project dat definitief weg is terwijl een ander apparaat nog
      een foto in de wachtrij heeft, een update midden in openstaand werk,
      twee tabbladen met elk een eigen ↶.
   5. Wat de opstelling aanneemt: de nagebootste database van
      test-v124-rechten.js (script 21/23/24/30 in JavaScript), hier met de
      inhoud van geüploade bestanden (zoals test-v124-tekeningen) en met
      "geblokkeerd" (actief uit) zoals de echte database het doet: is_lid()
      is dan onwaar, dus de rijbeveiliging laat niets zien en een update
      raakt 0 rijen (geen fout). De klok van de server = de klok van node;
      "31 dagen later" = verwijderd_op 31 dagen terug. Echte Chromium; de
      iPad en iPhone als Chromium-profiel met aanraken; v123 =
      /tmp/live123 (git archive van live, commit b9296d7) op hetzelfde adres
      (zelfde opslag op het apparaat), een update = de server geeft daarna
      v124 en het apparaat herlaadt (de service worker zelf test
      test-overgang.js). Echte Safari, iPad, Android, Windows en de echte
      Supabase: niet hier. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');




/* ─── de app expres stukmaken (bewijs dat deze reeks kan falen) ─── */
// Per mutatie: bestand, dan paren (van, naar). WAAR: welke werkgang hem moet vangen.
const MUTATIES = {
  // 2 en 7: een oude ↶-stapel wordt toch overgenomen na een wijziging elders.
  undoOudeStapel: ['undo.js', "var past = s.wie === ik && a && a.wie === ik && a.afdruk === afdrukVan(JSON.parse(json)) && staat() === json;", "var past = s.wie === ik;",
                   "    if (wasHier) {\n      // Zelfde project", "    if (false) {\n      // Zelfde project"],
  // 1: de kolom Spacer weg van de bestellijst.
  spacerLijst: ['pdf.js', "      { kop: 'Spacer',     w: 13, haal: function (r) { return window.spacerZwart && spacerZwart(r) ? 'zwart' : ''; } },\n", ''],
  // 3: de foto van de werkvloer slaat het hele project op (in plaats van glas_foto_erbij).
  werkvloerFoto: ['fotos.js', "if (!(window.glasWerkvloerFoto && glasWerkvloerFoto(doel, pid))) opslaan();", "opslaan();"],
  // 3: een foto van de werkvloer in een stand die binnenkomt, niet op het scherm van kantoor.
  erbijScherm: ['cloud.js', "    if (rij.id === projectId && window.glasErbijFotosErbij) glasErbijFotosErbij(rij.data);\n", ''],
  // 4 en 6: een weigering "Geen recht" niet apart bewaren.
  geenRechtApart: ['cloud.js', "if (/^Geen recht:/.test(String(res.error.message || ''))) {", "if (false) {"],
  // 5: de wachtrij uploadt ook foto's van een project dat weg is.
  wachtrijGat: ['wachtrij.js', "return alleMeta().then(zonderVerdwenen).then(function (lijst) {", "return alleMeta().then(function (lijst) {"],
  // 5: "Nu definitief verwijderen" ook voor een collega.
  definitiefKnop: ['index.html', '  body.geen-beheer button[onclick^="startDefinitief"],\n', ''],
};
const WAAR = { undoOudeStapel: '2,7', spacerLijst: '1', werkvloerFoto: '3', erbijScherm: '3', geenRechtApart: '4,6', wachtrijGat: '5', definitiefKnop: '5' };

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
  // v122: een kolom die (nog) niet bestaat, zoals de echte database: een
  // vraag die hem noemt, geeft een fout (bij '*' niet, en zonder het veld).
  if (S.zonderKolom && st.kols && st.kols !== '*' && String(st.kols).indexOf(S.zonderKolom) >= 0)
    return { data: null, error: { code: '42703', message: 'column gebruikers.' + S.zonderKolom + ' does not exist' } };
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
      const r = Object.assign({ id: '00000000-0000-4000-8000-' + String(100000000000 + (++S.nieuwId)), updated_at: new Date().toISOString(),
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
    // v123: ook een veld in de JSON (data->info->>klant), zoals PostgREST.
    (S.ofVragen = S.ofVragen || []).push(st.of);
    // Een oudere PostgREST die zo'n pad in or() niet leest (S.geenJsonPad).
    if (S.geenJsonPad && /->/.test(st.of)) return { data: null, error: { code: 'PGRST100', message: 'failed to parse logic tree' } };
    const delen = st.of.split(',').map(d => { const m = /^([\w>-]+)\.ilike\.%(.*)%$/.exec(d); return m && [m[1], m[2].toLowerCase()]; }).filter(Boolean);
    const veldVan = (rij, k) => { const p = k.split(/->>?/); let v = rij[p[0]]; for (let i = 1; i < p.length; i++) v = v == null ? v : v[p[i]]; return v; };
    r = r.filter(rij => delen.some(([k, t]) => String(veldVan(rij, k) || '').toLowerCase().indexOf(t) >= 0));
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
  if (v.naam === 'glas_zoek_projecten') {
    // v123: script 29. Zonder het script bestaat de functie niet (PGRST202).
    S.zoekRpc = (S.zoekRpc || 0) + 1;
    if (!S.zoek29) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.glas_zoek_projecten(sortering, zoek) in the schema cache' } };
    const plat = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const woorden = plat(v.args.zoek).replace(/[%_\\]/g, ' ').split(/\s+/).filter(Boolean);
    const r = S.db.projecten.filter(p => !p.verwijderd_op).filter(p => {
      const hooi = plat([p.naam, p.datum, p.adres, ((p.data || {}).info || {}).klant].filter(Boolean).join(' '));
      return woorden.every(w => hooi.indexOf(w) >= 0);
    });
    return { data: r.map(p => ({ id: p.id, naam: p.naam, datum: p.datum, status: p.status, aantal_ruiten: p.aantal_ruiten,
      adres: p.adres, open_taken: p.open_taken, updated_at: p.updated_at, created_at: p.created_at,
      gewijzigd_naam: p.gewijzigd_naam, totaal: r.length })), error: null };
  }
  return { data: null, error: { message: 'onbekend' } };
}

function opslagVraag(v) {
  if (v.actie === 'upload') {
    if (S.offline) return { data: null, error: { name: 'StorageUnknownError', message: 'Failed to fetch' } };
    S.uploads.push(v.pad);
    if (S.uploadFout[v.pad]) return { data: null, error: S.uploadFout[v.pad] };
    if (S.opslag.has(v.pad)) return { data: null, error: { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' } };
    S.opslag.set(v.pad, { grootte: v.grootte, type: v.type, b64: v.b64 });
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
    // v123: een foto die de app zelf uploadde (bijv. gedraaid) is er daarna ook.
    if (S.opslag.has(v.pad)) { const o = S.opslag.get(v.pad); return { data: { signedUrl: o.b64 ? 'data:' + (o.type || 'image/jpeg') + ';base64,' + o.b64 : GEVEL }, error: null }; }
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
    return blob.arrayBuffer().then(function (buf) {
      var b = new Uint8Array(buf), s = '';
      for (var i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
      return { n: buf.byteLength, b64: btoa(s) };
    });
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
        return b64(blob).then(function (x) {
          return opslag({ actie: 'upload', pad: pad, grootte: x.n, b64: x.b64, type: (o && o.contentType) || blob.type });
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v124c-'));
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
// v124 cycli: de server kan ook de oude versie (v123) geven, op hetzelfde
// adres (zelfde opslag op het apparaat), zoals een update het doet.
let wortel = map;
const server = http.createServer(function (req, res) {
  let naam = decodeURIComponent(req.url.split('?')[0]);
  if (naam === '/') naam = '/index.html';
  if (naam.indexOf('/lib/supabase-js') === 0) {
    res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(NAMAAK); return;
  }
  const bestand = path.join(wortel, naam);
  if (!bestand.startsWith(wortel) || !fs.existsSync(bestand) || fs.statSync(bestand).isDirectory()) {
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
  // v123: "geen link voor …/kwijt.jpg" is de bedoeling (onderdeel 12: een foto die niet op te halen is).
  // v124: zonder bereik (S.weg) kan een foto niet geladen worden; dat is de bedoeling.
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|sandboxed|kwijt\.jpg|geen link voor .*Failed to fetch/.test(m.text())) consoleFouten.push('[console] ' + m.text()); });
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v124r-pdf-'));
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

/* ─── hulp voor v123 ──────────────────────────────────────────── */
const JSPDF = require('/home/claude/node_modules/jspdf');
async function startScherm(page) {
  await page.goto('about:blank');
  await page.goto(adres);
  await page.waitForSelector('#startScherm:not([hidden])', { timeout: 10000 });
  await wacht(800);
}
const startLijst = page => page.$eval('#startProjecten', e => e.innerText.replace(/\s+/g, ' '));
async function zoekOpStart(page, tekst) {
  await page.fill('#startZoek', tekst);
  await wacht(900);
  return startLijst(page);
}
const taakRegels = page => page.$$eval('#takenLijst .taak', l => l.map(t => ({
  tekst: (t.querySelector('.taak-tekst') || {}).value, wees: (t.querySelector('.taak-wees') || {}).textContent || '',
  keuze: (t.querySelector('select.taak-eigenaar-keuze option:checked') || {}).textContent || '' })));
// Een pdf met een tabel zoals een kozijnfabriek hem maakt: elke kolom op een
// vaste plek, een lege cel is gewoon niets.
function maakPdfLijst(rijen) {
  const doc = new JSPDF.jsPDF({ unit: 'pt', format: 'a4' });
  const x = [40, 110, 180, 260, 340];
  doc.setFontSize(10);
  ['Merk', 'Aantal', 'Breedte', 'Hoogte', 'Opmerking'].forEach((k, i) => doc.text(k, x[i], 60));
  rijen.forEach((r, j) => r.forEach((c, i) => { if (c !== '') doc.text(String(c), x[i], 80 + j * 18); }));
  return Buffer.from(doc.output('arraybuffer'));
}
const drieDecimalen = v => Math.round(v * 1000) / 1000;


/* ─── v124: script 30 nagebootst ──────────────────────────────── */
const WIE = {
  jan: { id: 'u1', email: 'julian@voorbeeld.test' },
  kees: { id: 'u2', email: 'kees@voorbeeld.test' },
  wim: { id: 'u3', email: 'wim@voorbeeld.test' },
  bart: { id: 'u4', email: 'bart@voorbeeld.test' }
};
function gebruiker(id, naam, email, rol, extra) {
  return Object.assign({ id: id, naam: naam, email: email, actief: true, alleen_lezen: false, telefoon: null, rol: rol,
    mag_bestellen: true, mag_ontgrendelen: true, mag_nieuw: true, mag_weggooien: true, gezien_op: null, app_versie: null,
    apparaat: null }, extra || {});
}
// Na script 30: Jan beheerder, Kees collega met vier rechten uit, Wim
// werkvloer, Bart collega, het back-upaccount op alleen lezen.
function metRollen() {
  S.db.gebruikers = [
    gebruiker('u1', 'julian', WIE.jan.email, 'beheerder'),
    gebruiker('u2', 'kees', WIE.kees.email, 'collega', { mag_bestellen: false, mag_ontgrendelen: false, mag_nieuw: false, mag_weggooien: false }),
    gebruiker('u3', 'wim', WIE.wim.email, 'werkvloer'),
    gebruiker('u4', 'bart', WIE.bart.email, 'collega'),
    gebruiker('u9', 'backup', 'backup@voorbeeld.test', 'collega', { alleen_lezen: true })
  ];
  S.s30 = true;
}
const gRij = id => (S.db.gebruikers || []).find(g => g.id === id) || null;
function rolVan(id) { const g = gRij(id); return S.s30 && g && g.actief !== false && g.rol ? g.rol : null; }
function magM(id, recht) {
  const g = gRij(id), r = rolVan(id);
  if (!r || r === 'beheerder') return true;
  if (r !== 'collega') return false;
  return g['mag_' + recht] !== false;
}
const geenRecht = m => ({ data: null, error: { code: 'P0001', message: 'Geen recht: ' + m, details: '', hint: '' } });
const naamVan = id => (gRij(id) || {}).naam || '';

// fotos_erbij_houden: een foto van de werkvloer die een apparaat niet kende
// (oudere basis), komt terug; het merkje _erbijVan gaat weg.
function erbijHouden(st) {
  const d = st.velden.data;
  const r = S.db.projecten.find(p => p.id === st.filters.id);
  if (!r || !d) return;
  const b = /^\d+$/.test(String(d._basis == null ? '' : d._basis)) ? parseInt(d._basis, 10) : null;
  d.fotos = Array.isArray(d.fotos) ? d.fotos : [];
  (r.data.fotos || []).filter(f => f && f._erbij).forEach(f => {
    const frev = parseInt(f._erbij.rev, 10) || 0;
    if (b != null && b >= frev) return;
    const nu = d.fotos.find(x => x.id === f.id);
    // Teruggezet = nieuw na deze opslag (zoals script 30): het volgnummer
    // van de foto gaat mee omhoog (d._rev zet bewaken pas daarna: +1 nu).
    const later = Object.assign({}, f._erbij, { rev: (parseInt(r.data._rev, 10) || 0) + 2 });
    if (!nu) d.fotos.push(Object.assign(JSON.parse(JSON.stringify(f)), { _erbij: later }));
    else if (f.origineel && !nu.origineel) Object.assign(nu, { origineel: JSON.parse(JSON.stringify(f.origineel)), _erbij: later });
  });
  delete d._erbijVan;
}
// De bewaking van script 24 met de aanvulling van 30: alleen foto's van de
// werkvloer ertussen = niet weigeren.
const echtBewaken = bewaken;
bewaken = function (r, d) {
  const ev = r.data && r.data._erbijVan, b = d._basis, rev = parseInt(r.data && r.data._rev, 10) || 0;
  if (ev != null && /^\d+$/.test(String(b)) && +b >= +ev && +b <= rev) {
    const bewaar = d._basis; d._basis = String(rev);
    const f = echtBewaken(r, d); d._basis = bewaar; return f;
  }
  return echtBewaken(r, d);
};

const echteDbVraag = dbVraag;
dbVraag = function (st) {
  if (!S.s30 || !S.wie || S.offline) return echteDbVraag(st);
  const uid = S.wie.id, r = rolVan(uid);
  (S.dbLog = S.dbLog || []).push({ wie: uid, tabel: st.tabel, op: st.op });
  if (st.tabel === 'projecten') {
    if (st.op === 'insert' && r && r !== 'beheerder') {
      const l = Array.isArray(st.nieuw) ? st.nieuw : [st.nieuw];
      if (l.some(v => !(v.data && v.data._apart === true)) && !magM(uid, 'nieuw')) {
        return geenRecht('je account mag geen nieuwe projecten maken. Vraag de beheerder.');
      }
    }
    if (st.op === 'update' && r && r !== 'beheerder') {
      const geraakt = S.db.projecten.filter(p => Object.keys(st.filters).every(k => p[k] === st.filters[k]));
      for (const p of geraakt) {
        if (r === 'werkvloer') return geenRecht('je account staat op werkvloer (kijken, foto\'s toevoegen en je eigen taken afvinken). Je werk blijft op dit apparaat staan.');
        if (st.velden.verwijderd_op && !p.verwijderd_op && !magM(uid, 'weggooien')) return geenRecht('je account mag geen projecten weggooien. Vraag de beheerder.');
        if (st.velden.data) {
          const oud = ((p.data || {}).info || {}).bestellingen || [], nieuw = ((st.velden.data || {}).info || {}).bestellingen || [];
          const erbij = nieuw.some(n => !oud.some(o => o.op === n.op)) || nieuw.some(n => n.ingetrokken && oud.some(o => o.op === n.op && !o.ingetrokken));
          if (erbij && !magM(uid, 'bestellen')) return geenRecht('je account mag geen bestelling vastleggen of intrekken. Vraag de beheerder.');
          const open = d => !!(((d || {}).info || {}).slot || {}).open;
          if (open(st.velden.data) && !open(p.data) && !magM(uid, 'ontgrendelen')) return geenRecht('je account mag een besteld project niet ontgrendelen. Vraag de beheerder.');
        }
      }
    }
    if (st.op === 'update' && st.velden.data) erbijHouden(st);
    if (st.op === 'delete') {
      const grens = Date.now() - 30 * 864e5;
      const weg = S.db.projecten.filter(p => Object.keys(st.filters).every(k => p[k] === st.filters[k]) &&
        st.gevuld.every(k => p[k] != null) && p.verwijderd_op &&
        (r === 'beheerder' || (r === 'collega' && new Date(p.verwijderd_op).getTime() < grens)));
      S.db.projecten = S.db.projecten.filter(p => weg.indexOf(p) < 0);
      S.db.taken = (S.db.taken || []).filter(t => !weg.some(p => p.id === t.project_id));
      (S.verwijderd = S.verwijderd || []).push(...weg.map(p => ({ id: p.id, wie: uid })));
      return { data: st.terug ? weg.map(p => ({ id: p.id })) : null, error: null };
    }
  }
  if (st.tabel === 'taken' && r === 'werkvloer' && st.op !== 'select') {
    if (st.op !== 'update') return geenRecht('je account staat op werkvloer; taken toevoegen of verwijderen kan niet.');
    const geraakt = S.db.taken.filter(t => Object.keys(st.filters).every(k => t[k] === st.filters[k]));
    if (geraakt.some(t => t.eigenaar !== uid)) return geenRecht('je account staat op werkvloer; je kunt alleen je eigen taken afvinken.');
    if (Object.keys(st.velden).some(k => ['klaar', 'afgerond_op', 'afgerond_door'].indexOf(k) < 0)) return geenRecht('je kunt een taak alleen afvinken.');
  }
  if (st.tabel === 'gebruikers' && st.op === 'update' && Object.keys(st.velden).some(k => ['naam', 'telefoon'].indexOf(k) < 0)) {
    return { data: null, error: { code: '42501', message: 'permission denied for table gebruikers' } };
  }
  return echteDbVraag(st);
};

const NIEUW_30 = ['glas_foto_erbij', 'glas_beheer_gebruikers', 'glas_beheer_zet', 'glas_aanwezig', 'glas_beheer_opslag',
                  'glas_beheer_wees', 'glas_project_bestaat', 'glas_foto_nog_nodig', 'glas_mijn_status'];
// v124 (reparatieronde, zoals script 30 en test-v124-rechten): noemt een
// project (ook in de prullenbak, ook een apart bewaarde kopie) dit pad?
const genoemdDoor = pad => S.db.projecten.filter(p => JSON.stringify(p.data || {}).indexOf('"' + pad + '"') >= 0);
const inGebruik = pad => genoemdDoor(pad).length > 0;
const echteRpc = rpcVraag;
rpcVraag = function (v) {
  if (S.offline) return echteRpc(v);
  const uid = S.wie && S.wie.id, r = rolVan(uid), a = v.args || {};
  (S.rpcLog = S.rpcLog || []).push({ naam: v.naam, wie: uid, actie: a.p_actie });
  if (NIEUW_30.indexOf(v.naam) >= 0 && !S.s30) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.' + v.naam } };
  const alleenBeheer = () => r === 'beheerder' ? null : geenRecht('alleen voor beheerders.');
  if (v.naam === 'glas_bewerken' && r === 'werkvloer') {
    const sl = S.slot[a.p_project] || {};
    return { data: Object.assign({ apparaat: null, naam: null, omschrijving: null, sinds: null, gezien: null, overname_apparaat: null,
      overname_naam: null, overname_op: null }, JSON.parse(JSON.stringify(sl)), { vorige: sl.naam || null, nu: new Date().toISOString() }), error: null };
  }
  if (v.naam === 'glas_bestellingen_erbij' && S.s30 && r && r !== 'beheerder') {
    const p = S.db.projecten.find(x => x.id === a.p_project);
    const oud = (((p || {}).data || {}).info || {}).bestellingen || [];
    const erbij = (a.p_bestellingen || []).some(n => !oud.some(o => o.op === n.op));
    if (r === 'werkvloer' || (erbij && !magM(uid, 'bestellen'))) return geenRecht('je account mag geen bestelling vastleggen of intrekken. Vraag de beheerder.');
  }
  if (v.naam === 'glas_foto_erbij') {
    if (!r) return geenRecht('je kunt geen foto\'s toevoegen.');
    const f = a.p_foto || {}, pid = a.p_project;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(f.id || '')) || String(f.pad || '').indexOf(pid + '/') !== 0 || /\.\./.test(f.pad)) {
      return { data: null, error: { code: 'P0001', message: 'Foto onleesbaar.' } };
    }
    const p = S.db.projecten.find(x => x.id === pid);
    if (!p) return { data: null, error: { code: 'P0001', message: 'Dit project bestaat niet meer.' } };
    if (p.verwijderd_op) return { data: null, error: { code: 'P0001', message: 'Dit project staat in de prullenbak.' } };
    p.data.fotos = p.data.fotos || [];
    const rev = parseInt(p.data._rev, 10) || 0;
    const er = p.data.fotos.find(x => x.id === f.id);
    if (er) {
      if (er._erbij && !er.origineel && f.origineel && er.pad === f.pad) { er.origineel = f.origineel; er._erbij.rev = rev + 1; }
      else return { data: { ok: true, al: true, rev: rev }, error: null };
    } else {
      p.data.fotos.push({ id: f.id, pad: f.pad, titel: f.titel || '', bron: 'foto', breedte: f.breedte, hoogte: f.hoogte, markeringen: [],
        origineel: f.origineel, _erbij: { door: naamVan(uid), op: new Date().toISOString(), rev: rev + 1 } });
    }
    p.data._rev = rev + 1;
    if (p.data._erbijVan == null) p.data._erbijVan = rev;
    p.gewijzigd_naam = naamVan(uid);
    S.log.push({ wat: 'foto erbij', wie: naamVan(uid) });
    live('projecten', p);
    return { data: { ok: true, al: false, rev: rev + 1 }, error: null };
  }
  if (v.naam === 'glas_beheer_gebruikers') {
    const f = alleenBeheer(); if (f) return f;
    return { data: S.db.gebruikers.map(g => Object.assign({}, g, { laatst_ingelogd: g.id === 'u1' ? new Date().toISOString() : null,
      bezig_in: Object.keys(S.slot).filter(k => S.slot[k].apparaat && S.slot[k].wie === g.id).map(k => (S.db.projecten.find(p => p.id === k) || {}).naam).join(', ') || null })), error: null };
  }
  if (v.naam === 'glas_beheer_zet') {
    const f = alleenBeheer(); if (f) return f;
    if (a.p_id === uid) return { data: null, error: { code: 'P0001', message: 'Je eigen rol en rechten kun je niet zelf veranderen; vraag een andere beheerder.' } };
    const g = gRij(a.p_id);
    if (!g) return { data: null, error: { code: 'P0001', message: 'Deze gebruiker bestaat niet.' } };
    if (g.alleen_lezen) return { data: null, error: { code: 'P0001', message: 'Het back-upaccount (alleen lezen) wijzig je in de SQL Editor.' } };
    if (a.p_veld === 'rol') {
      if (['beheerder', 'collega', 'werkvloer'].indexOf(a.p_waarde) < 0) return { data: null, error: { code: 'P0001', message: 'Onbekende rol.' } };
      g.rol = a.p_waarde;
    } else if (['actief', 'mag_bestellen', 'mag_ontgrendelen', 'mag_nieuw', 'mag_weggooien'].indexOf(a.p_veld) >= 0) {
      if (['true', 'false'].indexOf(a.p_waarde) < 0) return { data: null, error: { code: 'P0001', message: 'Kies aan of uit.' } };
      g[a.p_veld] = a.p_waarde === 'true';
    } else return { data: null, error: { code: 'P0001', message: 'Onbekend veld.' } };
    S.beheerLog = (S.beheerLog || []).concat([[a.p_id, a.p_veld, a.p_waarde]]);
    return { data: JSON.parse(JSON.stringify(g)), error: null };
  }
  if (v.naam === 'glas_aanwezig') {
    const g = gRij(uid);
    if (g && !g.alleen_lezen) Object.assign(g, { gezien_op: new Date().toISOString(), app_versie: a.p_versie, apparaat: a.p_apparaat });
    return { data: null, error: null };
  }
  if (v.naam === 'glas_mijn_status') {
    const g = gRij(uid);
    return { data: g ? { actief: g.actief !== false, rol: g.rol, alleen_lezen: !!g.alleen_lezen } : null, error: null };
  }
  if (v.naam === 'glas_foto_nog_nodig') {
    if (!r) return { data: null, error: null };
    return { data: (a.paden || []).filter(inGebruik), error: null };
  }
  if (v.naam === 'glas_beheer_opslag' || v.naam === 'glas_beheer_wees') {
    const f = alleenBeheer(); if (f) return f;
    const soorten = {};
    const wees = [];
    [...S.opslag.keys()].forEach(k => {
      const p = S.db.projecten.find(x => x.id === k.split('/')[0]);
      const door = genoemdDoor(k);
      const s = door.some(q => !q.verwijderd_op) ? 5 : door.length ? 2 : !p ? 1 : p.verwijderd_op ? 2 : 3;
      soorten[s] = soorten[s] || { soort: s, bestanden: 0, bytes: 0 };
      soorten[s].bestanden++; soorten[s].bytes += S.opslag.get(k).grootte || 0;
      if (s === 1) wees.push({ naam: k, bytes: S.opslag.get(k).grootte || 0, aangemaakt: null });
    });
    return { data: v.naam === 'glas_beheer_wees' ? wees : Object.values(soorten), error: null };
  }
  if (v.naam === 'glas_project_bestaat') {
    if (!r) return { data: null, error: null };
    return { data: { bestaan: (a.p_ids || []).filter(id => S.db.projecten.some(p => p.id === id)) }, error: null };
  }
  if (v.naam === 'prullenbak_opruimbaar' && S.s30) (S.opruimDoor = S.opruimDoor || []).push(uid);
  const uit = echteRpc(v);
  // Wie het slot nam (bewerkslot.wie, voor Beheer).
  if (v.naam === 'glas_bewerken' && S.slot[a.p_project] && S.slot[a.p_project].apparaat === a.p_apparaat) S.slot[a.p_project].wie = uid;
  return uit;
};
const echteOpslag = opslagVraag;
opslagVraag = function (v) {
  // Script 30: de werkvloer haalt niets uit de opslag weg (stil: zoals RLS).
  if (v.actie === 'remove' && S.s30 && S.wie && rolVan(S.wie.id) === 'werkvloer') return { data: [], error: null };
  // v124 (S2): een foto die een project nog noemt, haalt alleen de beheerder weg.
  if (v.actie === 'remove' && S.s30 && S.wie && rolVan(S.wie.id) !== 'beheerder') {
    return echteOpslag(Object.assign({}, v, { paden: (v.paden || []).filter(pd => !inGebruik(pd)) }));
  }
  return echteOpslag(v);
};

// Een apparaat van een bepaalde gebruiker (elk apparaat zijn eigen inlog).
async function nieuweContextAls(opties, apparaat, wie) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block', acceptDownloads: true }, opties || {}));
  const als = f => s => { S.wie = wie; return f(s); };
  await ctx.exposeFunction('__db', als(s => JSON.stringify(S.weg[apparaat] ? { data: null, error: GEEN_BEREIK } : dbVraag(JSON.parse(s)))));
  await ctx.exposeFunction('__rpc', als(s => JSON.stringify(S.weg[apparaat] ? { data: null, error: GEEN_BEREIK } : rpcVraag(JSON.parse(s)))));
  await ctx.exposeFunction('__opslag', als(s => JSON.stringify(S.weg[apparaat]
    ? { data: null, error: { name: 'StorageUnknownError', message: 'Failed to fetch' } } : opslagVraag(JSON.parse(s)))));
  await ctx.exposeFunction('__sessie', () => JSON.stringify({ data: { session: { access_token: 't0k', user: wie } }, error: null }));
  await ctx.exposeFunction('__login', () => JSON.stringify({ data: { user: wie, session: { access_token: 't0k', user: wie } }, error: null }));
  ctx.__apparaat = apparaat;
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  return ctx;
}
async function als(wie, opties, apparaat, n) {
  const ctx = await nieuweContextAls(opties, apparaat, WIE[wie]);
  const page = await nieuwePagina(ctx);
  if (n) await open(page, n);
  else await startScherm(page);
  return { ctx, page };
}
const zichtbaar = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);
const lichaam = page => page.evaluate(() => document.body.className);
const GEVEL_JPG = path.join(__dirname, 'test-gevel.jpg');
const meldTekst = async page => (await meldingen(page)).join(' | ');
// Met een tik op "📷 Foto toevoegen" een foto kiezen (true = de kiezer ging open).
async function fotoViaKnop(page) {
  const kiezer = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
  await page.locator('#slotBalk button:has-text("Foto toevoegen")').tap({ timeout: 8000 }).catch(() => {});
  const k = await kiezer;
  if (k) await k.setFiles(GEVEL_JPG);
  return !!k;
}
const erbijFotos = n => ((rijVan(n).data || {}).fotos || []).filter(f => f._erbij);


/* ─── v124 cycli: geblokkeerd (actief uit) zoals de echte database ─── */
// is_lid() (script 26) is onwaar voor een geblokkeerde gebruiker: elke regel
// van de rijbeveiliging faalt. Lezen geeft niets, een update of delete raakt
// 0 rijen zonder fout, een insert geeft 42501. Ook live-berichten komen niet.
const isLid = id => { if (!S.s30) return true; const g = gRij(id); return !!(g && g.actief !== false); };
const RLS = t => ({ code: '42501', message: 'new row violates row-level security policy for table "' + t + '"', details: '', hint: '' });
const vorigeDb = dbVraag;
dbVraag = function (st) {
  // Script 22: verwijderd_op zet de database zelf (now(), de klok van de
  // server), niet de klok van het apparaat; een tweede keer verandert hem niet.
  if (st.tabel === 'projecten' && st.op === 'update' && st.velden && st.velden.verwijderd_op && !S.offline) {
    const doel = (S.db.projecten || []).filter(p => Object.keys(st.filters).every(k => p[k] === st.filters[k]));
    st.velden.verwijderd_op = doel[0] && doel[0].verwijderd_op ? doel[0].verwijderd_op : new Date().toISOString();
  }
  if (S.s30 && S.wie && !S.offline && !isLid(S.wie.id)) {
    (S.geblokkeerdLog = S.geblokkeerdLog || []).push(st.tabel + ':' + st.op);
    if (st.op === 'insert') return { data: null, error: RLS(st.tabel) };
    if (st.op === 'select') { const u = { data: st.enkel ? null : [], error: null }; if (st.telling) u.count = 0; return u; }
    if (st.enkel) return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
    return { data: st.terug ? [] : null, error: null };
  }
  return vorigeDb(st);
};
const vorigeRpc = rpcVraag;
rpcVraag = function (v) {
  if (S.s30 && S.wie && !S.offline && !isLid(S.wie.id)) {
    (S.geblokkeerdLog = S.geblokkeerdLog || []).push('rpc:' + v.naam);
    if (v.naam === 'prullenbak_opruimbaar' || v.naam === 'glas_zoek_projecten') return { data: [], error: null };
    if (v.naam === 'glas_aanwezig' || v.naam === 'glas_project_bestaat' || v.naam === 'glas_foto_nog_nodig') return { data: null, error: null };
    if (v.naam === 'glas_foto_erbij') return geenRecht('je kunt geen foto\'s toevoegen.');
    // v124 (A6): glas_mijn_status werkt ook zonder toegang (security definer).
    if (v.naam === 'glas_mijn_status') { const g = gRij(S.wie.id); return { data: g ? { actief: false, rol: g.rol, alleen_lezen: !!g.alleen_lezen } : null, error: null }; }
    return { data: null, error: RLS(v.naam === 'glas_bewerken' ? 'bewerkslot' : 'projecten') };
  }
  return vorigeRpc(v);
};
const vorigeOpslag = opslagVraag;
opslagVraag = function (v) {
  if (S.s30 && S.wie && !S.offline && !isLid(S.wie.id)) {
    if (v.actie === 'upload') return { data: null, error: { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' } };
    if (v.actie === 'list' || v.actie === 'remove') return { data: [], error: null };
    return { data: null, error: { statusCode: '400', message: 'Object not found' } };
  }
  return vorigeOpslag(v);
};

/* ─── v124 cycli: hulp ────────────────────────────────────────── */
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'v124c-werk-'));
const IPHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const PC = { viewport: { width: 1280, height: 900 } };
const TRIPLE = 'HR+++ glas (Triple)';
const PLAATJES_MAP = process.env.PLAATJES || path.join(SCRATCH, 'plaatjes');
fs.mkdirSync(PLAATJES_MAP, { recursive: true });
async function plaatje(page, naam, heel) {
  await page.screenshot({ path: path.join(PLAATJES_MAP, 'cyclus-' + naam + '.png'), fullPage: !!heel }).catch(() => {});
}
function pdfAlsPlaatje(pdf, blad, naam) {
  if (!pdf) return '';
  const doel = path.join(PLAATJES_MAP, 'cyclus-' + naam);
  try { fs.copyFileSync(pdf, doel + '.pdf'); } catch (e) {}
  spawnSync('pdftoppm', ['-f', String(blad), '-l', String(blad), '-r', '60', '-png', '-singlefile', pdf, doel]);
  return doel + '.png';
}
// Een project op id openen (een nieuw project heeft een id van de database).
async function openId(page, id) {
  await page.goto('about:blank');
  await page.goto(adres + '#project=' + id);
  await page.waitForFunction(i => { const v = document.getElementById('projectNaam'); return v && v.value && window.glasProjectId === i; }, id, { timeout: 15000 });
  await wacht(700);
}
const rij = id => S.db.projecten.find(p => p.id === id);
const ruitenIn = id => ((rij(id) || {}).data || { rijen: [] }).rijen.filter(r => r.merk || r.breedte || r.hoogte);
const ruitIn = (id, merk) => ruitenIn(id).find(r => r.merk === merk) || {};
const werkIn = id => (((rij(id) || {}).data || {}).fotos || []).filter(f => f.soort !== 'lever');
const bolIn = (id, merk) => { const r = ruitIn(id, merk); return werkIn(id).map(f => (f.markeringen || []).filter(m => m.rijId === r.id).length); };
const bestellingenIn = id => ((((rij(id) || {}).data || {}).info || {}).bestellingen || []);
const perRuitIn = (id, merk) => (((((rij(id) || {}).data || {}).info || {}).toebehoren || {}).perRuit || {})[String(ruitIn(id, merk).id)] || {};
const wegIn = id => ((((rij(id) || {}).data || {}).info || {}).onlangsVerwijderd || []);
const opslaanDoor = naam => S.log.filter(x => x.wat === 'opslaan' && x.wie === naam).length;

// De maatstaat van de kozijnfabriek (opbouw van Jans voorbeeld, verzonnen
// namen), met de kop "Max incl. band" en waarde "28mm".
function maatstaatXlsx() {
  const doel = path.join(SCRATCH, 'SPONNINGMATEN_999002.xlsx');
  const r = spawnSync('python3', ['-I', '-c', [
    'import sys, openpyxl',
    'wb = openpyxl.Workbook(); ws = wb.active; ws.title = "SPONNINGMATEN 999002"',
    'for rij in [("SPONNINGMATEN LIJST",), (" van project: 999002",), ("Fam. Proef",), ("Bouwbedrijf Voorbeeld B.V.",),',
    '            ("Aantal", "Breedte (mm)", "Hoogte (mm)", "Merk", "Max incl. band"),',
    '            (3, 976, 572, "A", "28mm"), (3, 977, 1079, "A", "28mm"), (1, 988, 572, "B", "28mm"), (1, 989, 1094, "B", "28mm"),',
    '            ("===",), (8,)]:',
    '    ws.append(list(rij))',
    'wb.save(sys.argv[1])'].join('\n'), doel], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('xlsx maken: ' + r.stderr);
  return fs.readFileSync(doel);
}
// De pdf van de kozijnfabriek, nagemaakt: 3 pagina's (A, B, doorsnede).
function tekeningPdf() {
  const doc = new JSPDF.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const kozijn = (merk, getek) => {
    doc.setFontSize(18); doc.setTextColor(200, 60, 40); doc.text('Merk: ' + merk, 14, 16);
    doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.text(getek + ' getek., Kleur: RAL 9001', 14, 22);
    doc.setLineWidth(1.2); doc.rect(40, 30, 90, 160);
    doc.setLineWidth(0.8); doc.rect(46, 36, 78, 52); doc.rect(46, 96, 78, 88);
    doc.line(40, 92, 130, 92);
    doc.setLineWidth(0.3); doc.line(46, 36, 85, 88); doc.line(124, 36, 85, 88);
    doc.rect(190, 150, 95, 50); doc.setFontSize(9); doc.text('Project 999002 - Proef', 194, 158);
  };
  kozijn('A', 3);
  doc.addPage('a4', 'landscape'); kozijn('B', 1);
  doc.addPage('a4', 'landscape');
  doc.setFontSize(16); doc.text('Doorsnede', 14, 16);
  doc.setLineWidth(0.8); doc.rect(60, 60, 60, 30); doc.rect(140, 60, 40, 70); doc.line(60, 75, 120, 75);
  return Buffer.from(doc.output('arraybuffer'));
}
async function importMaatstaat(page) {
  await page.click('button:has-text("⬆ Importeren")');
  await page.click('.veld-menu button:has-text("Sponningmaten")');
  await page.setInputFiles('#impBestand', { name: 'SPONNINGMATEN_999002.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: maatstaatXlsx() });
  await page.waitForSelector('#impStap2', { state: 'visible', timeout: 15000 });
  await importControleer(page);
  const tekst = await stap3(page);
  await page.click('#impToevoegen');
  await wacht(900);
  return tekst;
}
async function importTekening(page, nummers) {
  const voor = await page.evaluate(() => werkFotos().length);
  await page.click('button:has-text("⬆ Importeren")');
  const [kiezer] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }),
    page.click('.veld-menu button:has-text("Tekening")')]);
  await kiezer.setFiles({ name: 'D999002.pdf', mimeType: 'application/pdf', buffer: tekeningPdf() });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('pdfKiezer')).display === 'flex', null, { timeout: 15000 });
  for (const n of nummers) await page.check('#pdfPaginas input[value="' + n + '"]');
  await page.click('#pdfKiezerKnop');
  await wachtTot(() => page.evaluate(([v, n]) => werkFotos().length === v + n && !glasFotoBezig(), [voor, nummers.length]), 20000);
  await wacht(600);
}
const fotoIds = page => page.evaluate(() => werkFotos().map(f => f.id));
async function tik(page, fotoId, x, y, hoe) {
  const img = page.locator('#img-' + fotoId);
  await img.scrollIntoViewIfNeeded();
  let b = await img.boundingBox();
  const vh = page.viewportSize().height;
  await page.evaluate(d => window.scrollBy(0, d), Math.round(b.y + b.height * y - vh / 2));
  await wacht(250);
  b = await img.boundingBox();
  const px = b.x + b.width * x, py = b.y + b.height * y;
  if (hoe === 'vinger') await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
  await wacht(450);
}
const balkTekst = (page, f) => page.$eval('#aanwijs-' + f, e => e.style.display === 'none' ? '' : e.innerText.replace(/\s+/g, ' ')).catch(() => '');
async function drukOp(page, loc, hoe) { await loc.scrollIntoViewIfNeeded(); if (hoe === 'vinger') await loc.tap(); else await loc.click(); await wacht(350); }
const kiesRuit = (page, f, merk, hoe) => drukOp(page, page.locator('#aanwijs-' + f + ' .aanwijs-ruit').filter({ has: page.locator('b', { hasText: new RegExp('^' + merk + '$') }) }), hoe);
const balkKnop = (page, f, tekst, hoe) => drukOp(page, page.locator('#aanwijs-' + f + ' button', { hasText: tekst }).first(), hoe);
const routeTekst = page => page.$eval('#aanwijsRoute', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
const stappen = page => page.evaluate(() => undoStapels().terug.length);
// "Onlangs verwijderd" (herstel.js): het venster openen en een item terugzetten.
async function venster(page) {
  const k = page.locator('.verwijderd-knop:visible, #projectVerwijderdKnop:visible:not([disabled])').first();
  if (!(await k.count())) return '';
  await k.click();
  await page.waitForSelector('#verwijderdVenster .vw-lijst', { timeout: 4000 }).catch(() => {});
  return page.$eval('#verwijderdVenster', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
}
async function terugzetten(page, tekst, tik) {
  const k = page.locator('#verwijderdVenster .vw-item', { hasText: tekst }).locator('button.vw-terug').first();
  if (!(await k.count())) return false;
  if (await k.isDisabled()) return 'uit';
  if (tik) await k.tap(); else await k.click();
  await wacht(800);
  return true;
}
async function herlaad(page, id) {
  await wacht(600);
  await page.reload();
  await page.waitForFunction(i => { const v = document.getElementById('projectNaam'); return v && v.value && window.glasProjectId === i; }, id, { timeout: 15000 });
  await wacht(1500);
}
async function naarStart(page) {
  // Op de iPad en telefoon zit "📁 Projecten" achter ☰.
  if (!(await page.locator('#cloudProjectKnop').isVisible())) { await page.click('.kop-menu-knop'); await wacht(300); }
  await page.click('#cloudProjectKnop');
  await wacht(300);
  if ((await meldingen(page)).length) await sluitMeldingen(page);
  await page.waitForSelector('#startScherm:not([hidden])', { timeout: 10000 }).catch(() => {});
  await wacht(600);
}
const opties = (page, sel) => page.$$eval(sel + ' option', l => l.map(o => ({ v: o.value, t: o.textContent, uit: o.disabled,
  grijs: o.classList.contains('niet-lever'), groep: o.parentNode.tagName === 'OPTGROUP' ? o.parentNode.label : '' })));
const idOpM = (page, merk) => page.evaluate(m => (rijen.find(r => r.merk === m) || {}).id, merk);
async function zonderBereikVan(page, naam, aan) {
  S.weg[naam] = aan;
  await page.evaluate(a => window.dispatchEvent(new Event(a ? 'offline' : 'online')), aan).catch(() => {});
  await wacht(300);
}
const syncTekst = page => page.$eval('#syncMelding', e => e.style.display === 'none' ? '' : e.innerText.replace(/\s+/g, ' ')).catch(() => '');
// Een project dat klaar is om te bestellen: tekeningen met bolletjes, alles ingevuld.
const GEVEL_B64 = fs.readFileSync(path.join(__dirname, 'test-gevel.jpg')).toString('base64');
function blokProject2(n, extra) {
  const p = rijVan(n);
  const k = Object.assign({}, KOMPLEET, INGEMETEN);
  p.data.rijen = ['A', 'B', 'C', 'D', 'E', 'F'].map((m, i) => ruit(i + 1, m, String(900 + i * 10), '1200', Object.assign({ fotoId: FOTO }, k)))
    .concat([ruit(7, 'L1', '600', '600', k)]);
  p.data.volgendId = 8;
  p.data.fotos = [{ id: FOTO, pad: P(n) + '/gevel.jpg', titel: 'Voorgevel', breedte: 800, hoogte: 600,
    inkt: [{ t: 'lijn', k: '#c62828', d: 4, p: [[100, 100], [300, 120]] }],
    markeringen: [1, 2, 3, 4, 5, 6].map(i => ({ rijId: i, x: 0.1 + (i - 1) * 0.15, y: 0.4 })) }];
  p.data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
  p.data._rev = 5;
  p.status = 'bezig met inmeten/verwerken';
  S.opslag.set(P(n) + '/gevel.jpg', { grootte: 1000, type: 'image/jpeg', b64: GEVEL_B64 });
  if (extra) extra(p);
}
const dbStand = n => {
  const d = rijVan(n).data;
  return { merken: (d.rijen || []).filter(r => r.merk).map(r => r.id + ':' + r.merk + (r.fotoId ? '@' + r.fotoId : '')).join(' '),
           bollen: (d.fotos || []).map(f => f.id + ':' + (f.markeringen || []).length).join(' ') };
};
async function ontgrendelMet(page) {
  await page.locator('#slotBalk button:has-text("Ontgrendelen")').first().click({ timeout: 4000 });
  await wacht(300);
  const pw = page.locator('.melding-laag input[type=password]');
  if (await pw.count()) { await pw.fill('geheim'); await knop(page, 'Ontgrendelen'); }
  await page.waitForSelector('#slotBalk.open', { timeout: 5000 }).catch(() => {});
  await wacht(500);
}
const ANTW = Object.assign({}, ONVOLLEDIG, TOCH, { 'Past het in de sponning?': 'Toch doorgaan' });
const fouteMeldingen = [];
// Iets wat verwarrend is of een vraag voor Jan (geen harde fout): het komt in
// het verslag, maar maakt de reeks niet rood.
const letOpLijst = [];
function letop(naam, ok, extra) {
  if (ok) { console.log('  ok   ' + naam); return; }
  console.log('  LET OP ' + naam + (extra !== undefined && extra !== '' ? '  → ' + extra : ''));
  letOpLijst.push(naam);
}

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let t, u, v, w;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Een project van begin tot eind (Jan: pc en iPad)');
    resetDb(); metRollen();
    const pc = await als('jan', PC, 'pc');
    await pc.page.click('#startScherm button:has-text("+ Nieuw project")');
    await pc.page.waitForSelector('.melding-laag input', { timeout: 5000 });
    await pc.page.fill('.melding-laag input', 'Cyclusstraat 1');
    await knop(pc.page, 'Aanmaken');
    await pc.page.waitForFunction(() => window.glasProjectId && /^0{8}-/.test(glasProjectId), null, { timeout: 10000 });
    const PID = await pc.page.evaluate(() => glasProjectId);
    check('+ Nieuw project (echte klik): het project staat in de database', !!rij(PID) && rij(PID).naam === 'Cyclusstraat 1', PID);
    t = await importMaatstaat(pc.page);
    check('maatstaat met "Max incl. band": stap 3 rekent het max glaspakket uit (28 mm)', /Max glaspakket 28 mm/.test(t), t.slice(0, 300));
    await sluitMeldingen(pc.page);
    check('… vier ruiten met max 28 in de database (A1 3×, A2 3×, B1, B2)', await wachtTot(() => ruitenIn(PID).length === 4 &&
      ruitenIn(PID).every(r => String(r.maxPakket) === '28') && ruitIn(PID, 'A1').aantal == 3 && ruitIn(PID, 'A2').aantal == 3, 8000),
      JSON.stringify(ruitenIn(PID).map(r => [r.merk, r.aantal, r.breedte, r.hoogte, r.maxPakket])));
    await importTekening(pc.page, [1, 2, 3]);
    let T = await fotoIds(pc.page);
    check('pdf van 3 pagina\'s: drie tekeningen in de database, de bestanden in de opslag', await wachtTot(() => werkIn(PID).length === 3 &&
      werkIn(PID).every(f => f.pad && S.opslag.has(f.pad) && S.opslag.get(f.pad).b64), 15000), JSON.stringify(werkIn(PID).map(f => f.pad)));
    // Glastype op de pc (echte keuzelijsten): HR++ 4-13-4 (21 + 6 = 27 ≤ 28).
    for (const m of ['A1', 'A2', 'B1', 'B2']) {
      const id = await idOpM(pc.page, m);
      await pc.page.selectOption('#typ-' + id, 'HR++ glas'); await wacht(250);
      await pc.page.selectOption('#opb-' + id, '4-13-4'); await wacht(250);
    }
    check('glastype HR++ 4-13-4 bij alle vier (database)', await wachtTot(() => ['A1', 'A2', 'B1', 'B2'].every(m => ruitIn(PID, m).glasType === 'HR++ glas' &&
      ruitIn(PID, m).opbouw === '4-13-4'), 8000), JSON.stringify(ruitenIn(PID).map(r => [r.merk, r.glasType, r.opbouw])));
    await typ(pc.page, "projectInfo.leverInstructie = 'achterom, sleutel bij buren';");
    await naarStart(pc.page);
    check('Jan gaat op de pc naar Projecten: het bewerkslot is vrij', await wachtTot(() => !(S.slot[PID] && S.slot[PID].apparaat), 5000), JSON.stringify(S.slot[PID] || null));

    // De iPad (Jan): aanwijzen op tekening 1 en 2, A2 verdeeld.
    const ipad = await als('jan', IPAD, 'ipad');
    await openId(ipad.page, PID);
    await ipad.page.waitForFunction(() => werkFotos().every(f => document.getElementById('img-' + f.id)), null, { timeout: 15000 }).catch(() => {});
    await wacht(500);
    T = await fotoIds(ipad.page);
    check('iPad: de route staat er (nog 8 ruiten zonder plek)', /nog 8 ruiten zonder plek/.test(await routeTekst(ipad.page)), await routeTekst(ipad.page));
    await drukOp(ipad.page, ipad.page.locator('#aanwijsRoute .ar-stap').first(), 'vinger');
    await balkKnop(ipad.page, T[0], 'Alle 3 op één plek', 'vinger');
    await tik(ipad.page, T[0], 0.3, 0.3, 'vinger');
    await tik(ipad.page, T[0], 0.3, 0.6, 'vinger');
    await tik(ipad.page, T[0], 0.34, 0.6, 'vinger');
    await balkKnop(ipad.page, T[0], 'Volgende tekening', 'vinger');
    await kiesRuit(ipad.page, T[1], 'A2', 'vinger');
    await tik(ipad.page, T[1], 0.3, 0.6, 'vinger');
    await tik(ipad.page, T[1], 0.3, 0.3, 'vinger');
    await tik(ipad.page, T[1], 0.3, 0.7, 'vinger');
    check('aangewezen: A1 3× op tekening 1, A2 2× op 1 en 1× op 2 (bij tekening 1), B1/B2 op 2', await wachtTot(() =>
      JSON.stringify(bolIn(PID, 'A1')) === '[3,0,0]' && JSON.stringify(bolIn(PID, 'A2')) === '[2,1,0]' && ruitIn(PID, 'A2').fotoId === T[0] &&
      JSON.stringify(bolIn(PID, 'B1')) === '[0,1,0]' && JSON.stringify(bolIn(PID, 'B2')) === '[0,1,0]', 10000),
      JSON.stringify(['A1', 'A2', 'B1', 'B2'].map(m => [m, bolIn(PID, m), ruitIn(PID, m).fotoId])));
    check('… aanwijzen veranderde geen aantal, en het werk van kantoor (glastype) bleef', ruitIn(PID, 'A2').aantal == 3 &&
      ['A1', 'A2', 'B1', 'B2'].every(m => ruitIn(PID, m).opbouw === '4-13-4'));
    // Triple grijs en niet te kiezen (max 28).
    let id = await idOpM(ipad.page, 'A1');
    u = await opties(ipad.page, '#typ-' + id);
    const tr = u.find(o => o.v === TRIPLE) || {};
    check('iPad: triple grijs en niet te kiezen (max 28)', tr.uit === true && tr.grijs === true, JSON.stringify(tr));
    let gelukt = true;
    await ipad.page.locator('#typ-' + id).selectOption(TRIPLE, { timeout: 1500 }).catch(() => { gelukt = false; });
    await wacht(300);
    check('… triple tikken lukt niet; A1 blijft HR++ (scherm en database)', ruitIn(PID, 'A1').glasType === 'HR++ glas' &&
      (await schermRij(ipad.page, 'A1')).glasType === 'HR++ glas', gelukt ? 'selectOption ging door' : 'geweigerd');
    // Spacer zwart bij B1 (iPad).
    id = await idOpM(ipad.page, 'B1');
    await ipad.page.locator('#sp-' + id + ' select').selectOption('zwart'); await wacht(400);
    check('spacer zwart bij B1 (database), de rest zonder', await wachtTot(() => ruitIn(PID, 'B1').spacer === 'zwart', 6000) &&
      ['A1', 'A2', 'B2'].every(m => !ruitIn(PID, m).spacer), JSON.stringify(ruitenIn(PID).map(r => [r.merk, r.spacer || ''])));
    // Toebehoren: met de latkiezer een glaslat voor alle ruiten.
    await ipad.page.locator('.tab-btn:has-text("Toebehoren")').tap(); await wacht(600);
    await ipad.page.locator('#tbAlleLat').tap(); await wacht(400);
    await ipad.page.locator('.tb-lk-optie[data-waarde="E22"]').tap(); await wacht(300);
    await ipad.page.locator('.tb-alles button:has-text("Toepassen")').tap();
    v = await wachtOpMelding(ipad.page, /Alle ruiten wijzigen/, 4000);
    check('latkiezer: de vraag noemt de lat (E22)', v.ok && /E22/.test(v.tekst), v.tekst.slice(0, 200));
    // v124 (na de werkgangen-test): na de import staat de latzijde op "geen
    // (meegeleverd)"; het venster zegt dat en biedt binnen/buiten aan.
    check('… en zegt dat de latzijde op "geen (meegeleverd)" staat', /geen \(meegeleverd\)/.test(v.tekst), v.tekst.slice(0, 300));
    await knop(ipad.page, 'Latzijde binnen en toepassen');
    check('… alle vier de ruiten E22 (database, info.toebehoren.perRuit)', await wachtTot(() => ['A1', 'A2', 'B1', 'B2'].every(m => perRuitIn(PID, m).glaslat === 'E22'), 8000),
      JSON.stringify(['A1', 'B2'].map(m => perRuitIn(PID, m))));
    check('… en de ruiten zelf zijn niet veranderd (spacer, glas, bolletjes)', ruitIn(PID, 'B1').spacer === 'zwart' && JSON.stringify(bolIn(PID, 'A2')) === '[2,1,0]');
    await plaatje(ipad.page, '1-ipad-toebehoren');
    await naarStart(ipad.page);

    // Kantoor bestelt.
    await openId(pc.page, PID);
    await pc.page.waitForFunction(() => werkFotos().every(f => document.getElementById('img-' + f.id)), null, { timeout: 15000 }).catch(() => {});
    u = await pc.page.evaluate(() => { const m = bestellijstModel(); const k = m.kolommen;
      return { k: k, r: m.regels.map(g => ({ merk: String(g.cellen[k.indexOf('Merk')]), n: String(g.cellen[k.indexOf('Aantal')]), sp: k.indexOf('Spacer') >= 0 ? String(g.cellen[k.indexOf('Spacer')] || '') : '-' })) }; });
    check('bestellijst (model): vier regels, A2 één regel ×3, kolom Spacer met alleen B1 zwart', u.r.length === 4 &&
      (u.r.find(x => x.merk === 'A2') || {}).n === '3' && u.r.filter(x => x.sp === 'zwart').map(x => x.merk).join() === 'B1', JSON.stringify(u));
    const b1 = await bestel(pc.page, ANTW);
    check('bestellen (Ja, verstuurd): status besteld, één bestelling', b1.verstuurd && await wachtTot(() => rij(PID).status === 'besteld' &&
      bestellingenIn(PID).length === 1, 8000), JSON.stringify(b1.vraag || b1.na || '').slice(0, 300));
    t = plat(b1.tekst || '');
    check('bestel-pdf: A2 één keer, met 3 stuks; kolom Spacer, "zwart" één keer', (t.match(/\bA2\b/g) || []).length === 1 && /\b3 A2\b/.test(t) &&
      /Spacer/.test(t) && (t.match(/zwart/g) || []).length === 1, t.slice(0, 400));
    check('… geen toebehoren (latten) op de bestellijst voor de leverancier', !/E22|glaslat/i.test(t));
    w = pdfAlsPlaatje(b1.pad, 1, '1-bestel-pdf');
    const pi = await bestellijstPdf(pc.page, ANTW, 'PDF invoer');
    const pit = plat(pdfTekst(pi));
    const pip = pdfPaginas(pi);
    check('PDF invoer: kolom Spacer met zwart (bij B1)', !!pi && /Spacer/.test(pit) && /\bB1\b.{0,80}zwart/.test(pit),
      (pi ? pip.length + ' pagina\'s ' : 'geen pdf ') + (pit.match(/Merk.{0,500}/) || [pit.slice(0, 300)])[0]);
    check('… met de drie tekeningen (5 pagina\'s of meer)', pip.length >= 5, pip.length);
    check('… en de gekozen glaslat (E22) telt mee in de PDF invoer (toebehoren)', /E22/.test(pit), (pit.match(/[Tt]oebehoren.{0,400}/) || ['(geen toebehoren-pagina)'])[0]);
    pdfAlsPlaatje(pi, 1, '1-pdf-invoer-1'); pdfAlsPlaatje(pi, 2, '1-pdf-invoer-2');
    // Ontgrendelen en een maat veranderen: VERVANGT.
    await ontgrendelMet(pc.page);
    check('ontgrendelen (wachtwoord): het slot staat open', await pc.page.evaluate(() => !invoerOpSlot()));
    await vul(pc.page, 'A1', 'breedte-input', '970');
    check('A1 976 → 970 (database)', await wachtTot(() => String(ruitIn(PID, 'A1').breedte) === '970', 6000), String(ruitIn(PID, 'A1').breedte));
    const b2 = await bestel(pc.page, ANTW);
    t = plat(b2.tekst || '');
    check('tweede bestelling: VERVANGT A1 uit de 1e; de rest niet opnieuw', b2.verstuurd && /VERVANGT A1 uit de 1e/.test(t) && !/\bB1\b/.test(t.replace(/VERVANGT A1[^)]*\)/, '')),
      t.slice(0, 400));
    check('… twee bestellingen in de database', await wachtTot(() => bestellingenIn(PID).length === 2, 6000));
    pdfAlsPlaatje(b2.pad, 1, '1-bestel-2-pdf');
    check('niets apart bewaard in de hele werkgang', !apartBewaard().length, apartBewaard().map(p => p.naam).join());
    await pc.ctx.close(); await ipad.ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Per ongeluk weggegooid (Bart op de iPad, Jan op de pc), vóór en ná de bestelling');
    resetDb(); metRollen(); blokProject2(1);
    // a. Vóór de bestelling. Bart heeft het project open op de iPad.
    const ipad = await als('bart', IPAD, 'ipad', 1);
    await ipad.page.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(300);
    await ipad.page.locator('#blok-' + FOTO + ' button:has-text("🗑 Groep")').tap(); await wacht(300);
    await ipad.page.locator('.melding-laag .melding-knoppen button', { hasText: 'Ruiten ook weg' }).tap();
    check('iPad: blok met 6 ruiten weg; in de database één item "Onlangs verwijderd"', await wachtTot(() =>
      !ruitIn(P(1), 'A').id && wegIn(P(1)).length === 1 && (wegIn(P(1))[0].ruiten || []).length === 6, 8000), JSON.stringify(dbStand(1)));
    const ipadStappen = await stappen(ipad.page);
    // Jan op de pc: hij kijkt mee (Bart heeft het project).
    const pc = await als('jan', PC, 'pc', 1);
    check('pc: alleen kijken (Bart bewerkt)', await pc.page.evaluate(() => glasAlleenKijken()));
    await pc.page.click('.tab-btn:has-text("Project info")'); await wacht(300);
    t = await venster(pc.page);
    check('pc ziet "Onlangs verwijderd" met het blok van Bart', /Voorgevel/.test(t) && /6 ruiten/.test(t) && /bart/.test(t), t.slice(0, 200));
    const revVoor = rijVan(1).data._rev;
    u = await terugzetten(pc.page, 'Voorgevel');
    check('terugzetten in alleen kijken: de knop staat uit, met uitleg ("Je kijkt alleen mee"); de database onveranderd', u === 'uit' &&
      /Je kijkt alleen mee/.test(t) && !ruitIn(P(1), 'A').id && rijVan(1).data._rev === revVoor, String(u));
    await pc.page.keyboard.press('Escape').catch(() => {}); await wacht(300);
    await sluitMeldingen(pc.page);
    // Jan neemt het over en zet het terug, na herladen.
    await tochBewerken(pc.page);
    check('Jan neemt het project over (Toch bewerken → Overnemen)', !(await pc.page.evaluate(() => glasAlleenKijken())));
    await herlaad(pc.page, P(1));
    await pc.page.click('.tab-btn:has-text("Project info")'); await wacht(300);
    await venster(pc.page);
    check('… herladen; het item staat er nog en gaat terug', await terugzetten(pc.page, 'Voorgevel'));
    await pc.page.click('.tab-btn:has-text("Invoer")'); await wacht(300);
    check('terug in de database: 6 ruiten met hun nummers, bolletjes en foto', await wachtTot(() => dbStand(1).merken === '1:A@f1 2:B@f1 3:C@f1 4:D@f1 5:E@f1 6:F@f1 7:L1' &&
      dbStand(1).bollen === 'f1:6' && !wegIn(P(1)).length, 8000), JSON.stringify(dbStand(1)));
    // Kantoor werkt verder.
    await vul(pc.page, 'L1', 'opm-input', 'kantoor na terugzetten');
    check('kantoor typt verder (L1 opmerking, database)', await wachtTot(() => ruitIn(P(1), 'L1').opmerking === 'kantoor na terugzetten', 6000));
    // De iPad van Bart: zijn ↶-stapel (Cmd+Z op een iPad-toetsenbord) mag niets overschrijven.
    await wachtTot(async () => await ipad.page.evaluate(() => glasAlleenKijken()), 8000);
    check('iPad: na de overname kijkt Bart alleen', await ipad.page.evaluate(() => glasAlleenKijken()));
    await ipad.page.evaluate(() => ongedaan()); await wacht(800);
    await sluitMeldingen(ipad.page);
    check('iPad ↶ in alleen kijken: de database blijft (blok terug, opmerking van kantoor)', dbStand(1).bollen === 'f1:6' &&
      ruitIn(P(1), 'L1').opmerking === 'kantoor na terugzetten' && !apartBewaard().length, JSON.stringify(dbStand(1)) + ' ' + apartBewaard().length);
    // Jan sluit; Bart herlaadt, neemt weer en drukt ↶ (zijn oude stapel).
    await naarStart(pc.page);
    await herlaad(ipad.page, P(1));
    await wachtTot(async () => !(await ipad.page.evaluate(() => glasAlleenKijken())), 8000);
    u = [await stappen(ipad.page)];
    await ipad.page.evaluate(() => ongedaan()); await wacht(1200);
    await ipad.page.evaluate(() => ongedaan()); await wacht(1200);
    await sluitMeldingen(ipad.page);
    u.push(dbStand(1).bollen, ruitIn(P(1), 'L1').opmerking || '');
    check('iPad weer open (herladen): zijn oude ↶ haalt het teruggezette blok niet weg en wist het werk van kantoor niet',
      await wachtTot(() => dbStand(1).bollen === 'f1:6' && ruitIn(P(1), 'L1').opmerking === 'kantoor na terugzetten', 3000),
      'stappen vóór: ' + ipadStappen + ', na herladen: ' + u[0] + ', db: ' + JSON.stringify(u.slice(1)));
    await naarStart(ipad.page);

    // b. Ná de bestelling.
    await openId(pc.page, P(1));
    const bb = await bestel(pc.page, ANTW);
    check('Jan bestelt (Ja, verstuurd)', bb.verstuurd && await wachtTot(() => bestellingenIn(P(1)).length === 1 && rijVan(1).status === 'besteld', 8000),
      JSON.stringify(bb.vraag || '').slice(0, 200));
    await ontgrendelMet(pc.page);
    check('… en ontgrendelt (er moet nog iets gebeuren)', await wachtTot(() => !!(((rijVan(1).data.info || {}).slot || {}).open), 6000));
    await naarStart(pc.page);
    await openId(ipad.page, P(1));
    await ipad.page.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(300);
    await ipad.page.locator('#blok-' + FOTO + ' button:has-text("🗑 Groep")').tap(); await wacht(300);
    await ipad.page.locator('.melding-laag .melding-knoppen button', { hasText: 'Ruiten ook weg' }).tap();
    check('na de bestelling: Bart gooit het blok weer weg (database)', await wachtTot(() => !ruitIn(P(1), 'A').id && wegIn(P(1)).length === 1, 8000));
    u = await ipad.page.evaluate(() => { const t = teBestellen(); return { vervallen: t.vervallen.length, aantal: t.aantal }; });
    check('… de iPad ziet 6 ruiten "vervallen" (annuleren)', u.vervallen === 6, JSON.stringify(u));
    await herlaad(ipad.page, P(1));
    await naarStart(ipad.page);
    // Jan op de pc, herladen, terugzetten.
    await openId(pc.page, P(1));
    await herlaad(pc.page, P(1));
    await pc.page.click('.tab-btn:has-text("Project info")'); await wacht(300);
    await venster(pc.page);
    check('pc: na herladen staat het item er, en het gaat terug', await terugzetten(pc.page, 'Voorgevel'));
    await pc.page.click('.tab-btn:has-text("Invoer")'); await wacht(300);
    check('… terug in de database (nummers, bolletjes)', await wachtTot(() => dbStand(1).bollen === 'f1:6' &&
      dbStand(1).merken === '1:A@f1 2:B@f1 3:C@f1 4:D@f1 5:E@f1 6:F@f1 7:L1', 8000), JSON.stringify(dbStand(1)));
    u = await pc.page.evaluate(() => { const t = teBestellen(); return { vervallen: t.vervallen.length, gewijzigd: t.gewijzigd.length, regels: t.regels.map(r => r.merk), aantal: t.aantal,
      geel: rijen.filter(r => naBestellingGewijzigd(r)).map(r => r.merk) }; });
    check('… niets te bestellen of te annuleren: alles weer zoals besteld', !u.vervallen && !u.gewijzigd && !u.regels.length && !u.geel.length, JSON.stringify(u));
    check('… de bestelling zelf bleef (1, niet ingetrokken), status besteld', bestellingenIn(P(1)).length === 1 && !bestellingenIn(P(1))[0].ingetrokken &&
      rijVan(1).status === 'besteld');
    await vul(pc.page, 'L1', 'opm-input', 'kantoor na de bestelling');
    await wachtTot(() => ruitIn(P(1), 'L1').opmerking === 'kantoor na de bestelling', 6000);
    await naarStart(pc.page);
    // Bart weer op de iPad; zijn ↶ (de stap van het weggooien) staat nog op het apparaat.
    await openId(ipad.page, P(1));
    u = [await stappen(ipad.page)];
    await ipad.page.evaluate(() => ongedaan()); await wacht(1200);
    await sluitMeldingen(ipad.page);
    check('iPad ↶ na het terugzetten door kantoor: het blok blijft, de opmerking van kantoor blijft', await wachtTot(() => dbStand(1).bollen === 'f1:6' &&
      ruitIn(P(1), 'L1').opmerking === 'kantoor na de bestelling', 3000), 'stappen ' + u[0] + ' ' + JSON.stringify(dbStand(1)));
    check('… nergens werk apart bewaard', !apartBewaard().length, apartBewaard().map(p => p.naam).join());
    await ipad.ctx.close(); await pc.ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Werkvloer op de bouw (Wim, iPhone) terwijl kantoor (Jan, pc) bewerkt');
    resetDb(); metRollen(); blokProject2(1);
    S.db.taken = [
      { id: 't1', project_id: P(1), tekst: 'sleutel ophalen', klaar: false, eigenaar: 'u3', eigenaar_naam: 'wim', volgorde: 1, aangemaakt_op: '2026-10-20T08:00:00Z' },
      { id: 't2', project_id: P(1), tekst: 'rooster nameten', klaar: false, eigenaar: 'u4', eigenaar_naam: 'bart', volgorde: 2, aangemaakt_op: '2026-10-20T08:00:00Z' }];
    S.dbLog = []; S.rpcLog = [];
    const pc = await als('jan', PC, 'pc', 1);
    const ph = await als('wim', IPHONE, 'iphone', 1);
    check('iPhone: werkvloer, alleen kijken; kantoor houdt het project', await ph.page.evaluate(() => glasAlleenKijken()) &&
      !(await pc.page.evaluate(() => glasAlleenKijken())) && S.slot[P(1)].wie === 'u1');
    await plaatje(ph.page, '3-iphone-werkvloer');
    // Zonder bereik een foto.
    await zonderBereikVan(ph.page, 'iphone', true);
    check('zonder bereik: de knop 📷 opent de fotokiezer', await fotoViaKnop(ph.page));
    await wachtTot(async () => JSON.parse((await ls(ph.page, 'glasopname_erbij')) || '[]').length === 1, 8000);
    u = await ph.page.evaluate(() => glasWachtrij.lijst().then(l => l.map(m => m.pad)));
    check('… de foto wacht op de iPhone (rij werkvloer + bestand in de wachtrij)', JSON.parse((await ls(ph.page, 'glasopname_erbij')) || '[]').length === 1 &&
      u.length >= 1 && !erbijFotos(1).length, JSON.stringify(u));
    await wachtTot(async () => /wacht op bereik/.test(await ph.page.$eval('#slotBalk', e => e.innerText)), 5000);
    check('… de balk zegt "1 foto wacht op bereik"', /1 foto wacht op bereik/.test(await ph.page.$eval('#slotBalk', e => e.innerText)));
    // Kantoor slaat intussen twee keer op.
    await vul(pc.page, 'L1', 'opm-input', 'kantoor 1');
    await vul(pc.page, 'A', 'opm-input', 'kantoor 2');
    check('kantoor slaat op (database)', await wachtTot(() => ruitIn(P(1), 'L1').opmerking === 'kantoor 1' && ruitIn(P(1), 'A').opmerking === 'kantoor 2', 6000));
    // Bereik terug.
    await zonderBereikVan(ph.page, 'iphone', false);
    check('bereik terug: de foto staat in het project (van wim), het bestand en het origineel in de opslag', await wachtTot(() =>
      erbijFotos(1).length === 1 && S.opslag.has(erbijFotos(1)[0].pad) && !!erbijFotos(1)[0].origineel && S.opslag.has(erbijFotos(1)[0].origineel.pad), 20000),
      JSON.stringify(erbijFotos(1)).slice(0, 200));
    const wvFoto = (erbijFotos(1)[0] || {}).id;
    check('… zonder dat de iPhone het hele project probeerde op te slaan, en zonder venster', !S.dbLog.some(x => x.wie === 'u3' && x.tabel === 'projecten' && x.op !== 'select') &&
      !(await meldingen(ph.page)).length, JSON.stringify(S.dbLog.filter(x => x.wie === 'u3' && x.op !== 'select')) + ' ' + (await meldTekst(ph.page)).slice(0, 160));
    check('… het werk van kantoor bleef (opmerkingen)', ruitIn(P(1), 'L1').opmerking === 'kantoor 1' && ruitIn(P(1), 'A').opmerking === 'kantoor 2');
    check('… niets van de iPhone wacht nog', await wachtTot(async () => !(await ls(ph.page, 'glasopname_erbij')), 8000));
    // Kantoor slaat weer op: de foto blijft.
    await vul(pc.page, 'L1', 'opm-input', 'kantoor 3');
    await wachtTot(() => ruitIn(P(1), 'L1').opmerking === 'kantoor 3', 6000);
    check('kantoor slaat daarna op: de foto blijft (database en scherm van kantoor)', erbijFotos(1).length === 1 &&
      await wachtTot(() => pc.page.evaluate(id => fotos.some(f => f.id === id), wvFoto), 6000));
    check('de iPhone van Wim staat er rustig bij: geen venster, geen opslagpoging door Wim', !(await meldingen(ph.page)).length &&
      !S.dbLog.some(x => x.wie === 'u3' && x.tabel === 'projecten' && x.op !== 'select'), (await meldTekst(ph.page)).slice(0, 200));
    // Wim vinkt zijn eigen taak af (tik).
    await ph.page.locator('.tab-btn', { hasText: 'Project info' }).tap();
    await ph.page.waitForSelector('#takenLijst .taak', { timeout: 8000 });
    await wacht(400);
    await ph.page.locator('#takenLijst .taak').first().locator('input[type=checkbox]').tap();
    check('Wim vinkt zijn eigen taak af (database); die van Bart niet', await wachtTot(() => S.db.taken.find(x => x.id === 't1').klaar === true, 8000) &&
      S.db.taken.find(x => x.id === 't2').klaar === false);
    // Kantoor haalt de foto bewust weg.
    await pc.page.waitForSelector('#blok-' + wvFoto, { timeout: 8000 });
    await pc.page.locator('#blok-' + wvFoto + ' button:has-text("🗑")').first().click(); await wacht(300);
    t = await meldTekst(pc.page);
    {
      const k = pc.page.locator('.melding-laag').last().locator('.melding-knoppen button', { hasText: /Verwijderen|Ruiten ook weg|weg/ }).first();
      if (await k.count()) await k.click();
      await wacht(500);
    }
    check('kantoor haalt de foto van Wim weg (database), en hij staat in "Onlangs verwijderd"', await wachtTot(() => !erbijFotos(1).length &&
      wegIn(P(1)).some(x => /foto/i.test(x.wat || '')), 8000), t.slice(0, 160) + ' | ' + JSON.stringify(wegIn(P(1)).map(x => x.wat)));
    await vul(pc.page, 'L1', 'opm-input', 'kantoor 4');
    await wachtTot(() => ruitIn(P(1), 'L1').opmerking === 'kantoor 4', 6000);
    check('… kantoor slaat daarna op: de foto komt niet terug', !(rijVan(1).data.fotos || []).some(f => f.id === wvFoto));
    await herlaad(ph.page, P(1));
    await wacht(1500);
    check('… de iPhone herlaadt: de foto is weg, er wacht niets', !(await ph.page.evaluate(id => fotos.some(f => f.id === id), wvFoto)) &&
      !(await ls(ph.page, 'glasopname_erbij')));
    await vul(pc.page, 'L1', 'opm-input', 'kantoor 5');
    await wachtTot(() => ruitIn(P(1), 'L1').opmerking === 'kantoor 5', 6000);
    check('… en ook na nog een opslag van kantoor (na het herladen van de iPhone) niet terug', !(rijVan(1).data.fotos || []).some(f => f.id === wvFoto));
    // De werkvloer kan niets anders wijzigen: ↶, "Onlangs verwijderd", een maat.
    const revNu = rijVan(1).data._rev;
    await ph.page.evaluate(() => ongedaan()); await wacht(600); await sluitMeldingen(ph.page);
    await ph.page.locator('.tab-btn', { hasText: 'Project info' }).tap(); await wacht(400);
    t = await venster(ph.page);
    u = await terugzetten(ph.page, 'foto', true);
    check('iPhone: "Onlangs verwijderd" te zien, terugzetten staat uit', /Onlangs verwijderd/.test(t) && u === 'uit', String(u) + ' ' + t.slice(0, 120));
    await ph.page.keyboard.press('Escape').catch(() => {}); await sluitMeldingen(ph.page);
    await ph.page.evaluate(() => { try { glasVerwijderdTerug(projectInfo.onlangsVerwijderd[0].id); } catch (e) {} });
    await ph.page.evaluate(() => { try { rijen[0].opmerking = 'wim was hier'; opslaan(); } catch (e) {} });
    await wacht(2000); await sluitMeldingen(ph.page);
    check('… ↶, terugzetten of een wijziging langs een andere weg: de database blijft gelijk, geen opslag door Wim',
      rijVan(1).data._rev === revNu && !(rijVan(1).data.fotos || []).some(f => f.id === wvFoto) && ruitIn(P(1), 'A').opmerking === 'kantoor 2' &&
      !S.dbLog.some(x => x.wie === 'u3' && x.tabel === 'projecten' && x.op !== 'select'), JSON.stringify(S.dbLog.filter(x => x.wie === 'u3' && x.op !== 'select')));
    check('… en niets apart bewaard', !apartBewaard().length, apartBewaard().map(p => p.naam).join());
    u = await syncTekst(ph.page);
    letop('… de iPhone zegt niets verontrustends ("niet opgeslagen") na die poging', !/niet opgeslagen|Niet opgeslagen/.test(u), u);
    await ph.ctx.close(); await pc.ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Rechten veranderen terwijl Kees bezig is (Jan in Beheer op zijn eigen pc)');
    bestelProject(); metRollen();
    Object.assign(gRij('u2'), { mag_bestellen: true, mag_ontgrendelen: true, mag_nieuw: true, mag_weggooien: true });
    const kees = await als('kees', PC, 'pc-kees', 1);
    const jan = await als('jan', PC, 'pc-jan');
    await jan.page.click('#startTabBeheer');
    await jan.page.waitForSelector('#beheerGebruikers tr[data-wie="u2"] input[data-recht="bestellen"]', { timeout: 8000 });
    // Kees bereidt de bestelling voor.
    await vul(kees.page, 'K1', 'opm-input', 'Kees voorbereid');
    let id = await idOpM(kees.page, 'K2');
    await kees.page.selectOption('#sp-' + id + ' select', 'zwart'); await wacht(400);
    check('Kees werkt (database: opmerking K1, spacer K2 zwart)', await wachtTot(() => ruitIn(P(1), 'K1').opmerking === 'Kees voorbereid' && ruitIn(P(1), 'K2').spacer === 'zwart', 6000));
    // Jan zet het bestelrecht van Kees uit (echte klik).
    await jan.page.locator('#beheerGebruikers tr[data-wie="u2"] input[data-recht="bestellen"]').click();
    check('Jan zet bij Kees "bestellen" uit (database)', await wachtTot(() => gRij('u2').mag_bestellen === false, 5000));
    // Kees typt nog iets en bestelt meteen daarna.
    await kees.page.evaluate(() => { const r = rijen.find(x => x.merk === 'K3'); r.opmerking = 'laatste wijziging'; renderTabel(); opslaan(); });
    // v124 (reparatie A5): vlak vóór de bestellijst voor de leverancier haalt
    // de app de rechten vers op; zonder bestelrecht komt er geen pdf.
    await kees.page.click('button:has-text("⬇ Exporteren")');
    let pdfK = false;
    const dlK = kees.page.waitForEvent('download', { timeout: 8000 }).then(() => { pdfK = true; }, () => {});
    await kees.page.click('button:has-text("Bestellijst als PDF")');
    v = await wachtOpMelding(kees.page, /Naar de leverancier|niet vastgelegd|Bestellijst niet gemaakt/);
    if (/Naar de leverancier/.test(v.tekst)) await knop(kees.page, 'Ja, verstuurd');
    await Promise.race([dlK, wacht(2500)]);
    check('Jan zette bestellen net uit: geen bestellijst voor de leverancier (rechten vers opgehaald)', !pdfK && /Bestellijst niet gemaakt/.test(v.tekst), v.tekst.slice(0, 160));
    const apart1 = apartBewaard();
    const inProject = ruitIn(P(1), 'K3').opmerking === 'laatste wijziging';
    const inApart = apart1.some(p => (p.data.rijen || []).some(r => r.merk === 'K3' && r.opmerking === 'laatste wijziging'));
    check('Kees\' werk is niet weg: de laatste wijziging staat in het project of apart', inProject || inApart, JSON.stringify({ inProject, inApart, apart: apart1.length }));
    letop('… de laatste wijziging (vóór de bestelling) staat in het project zelf, niet alleen in de aparte kopie', inProject, JSON.stringify({ inProject, inApart }));
    check('… het project is niet besteld; zijn eerdere werk staat erin', !bestellingenIn(P(1)).length && rijVan(1).status !== 'besteld' &&
      ruitIn(P(1), 'K1').opmerking === 'Kees voorbereid' && ruitIn(P(1), 'K2').spacer === 'zwart');
    t = await meldTekst(kees.page);
    check('… de melding is duidelijk (geen recht om te bestellen)', /mag niet bestellen/.test(t), t.slice(0, 300));
    await sluitMeldingen(kees.page);
    check('… niets blijft hangen als "moet nog omhoog"', await wachtTot(async () => !(await ls(kees.page, 'glasopname_pending')), 8000));
    await plaatje(kees.page, '4-kees-na-weigering');
    // Jan zet het recht terug; Kees probeert opnieuw zonder te herladen.
    await jan.page.locator('#beheerGebruikers tr[data-wie="u2"] input[data-recht="bestellen"]').click();
    check('Jan zet "bestellen" weer aan (database)', await wachtTot(() => gRij('u2').mag_bestellen === true, 5000));
    await kees.page.click('.tab-btn:has-text("Invoer")').catch(() => {});
    await bestellijstPdf(kees.page, TOCH);
    v = await wachtOpMelding(kees.page, /Naar de leverancier|niet vastgelegd/);
    letop('Kees probeert direct opnieuw (zonder herladen): de app weet dat het weer mag', /Naar de leverancier/.test(v.tekst), v.tekst.slice(0, 200));
    if (/Naar de leverancier/.test(v.tekst)) await knop(kees.page, 'Ja, verstuurd'); else await sluitMeldingen(kees.page);
    await wacht(1500);
    if (!bestellingenIn(P(1)).length) {
      // Via Projecten (de app vraagt de rechten opnieuw op) en weer open.
      await naarStart(kees.page);
      await openId(kees.page, P(1));
      const b = await bestel(kees.page, TOCH);
      check('na Projecten en opnieuw openen: Kees bestelt (Ja, verstuurd)', b.verstuurd, JSON.stringify(b.vraag || '').slice(0, 200));
    }
    check('… de bestelling staat in het project zelf (één, status besteld)', await wachtTot(() => bestellingenIn(P(1)).length === 1 && rijVan(1).status === 'besteld', 8000),
      JSON.stringify(bestellingenIn(P(1)).map(b => b.door)));
    check('… met al het werk van Kees (K1, K2 zwart, K3)', ruitIn(P(1), 'K1').opmerking === 'Kees voorbereid' && ruitIn(P(1), 'K2').spacer === 'zwart' &&
      (ruitIn(P(1), 'K3').opmerking === 'laatste wijziging' || !inProject));
    u = apartBewaard().map(p => ({ naam: p.naam, status: p.status, best: ((p.data.info || {}).bestellingen || []).length }));
    letop('de aparte kopie van de geweigerde bestelling staat niet als "besteld" in de lijst (anders lijkt het dubbel besteld)', u.every(x => x.status !== 'besteld' && !x.best), JSON.stringify(u));

    // b. Kees helemaal geblokkeerd terwijl hij werkt.
    S.slot = {};
    await openId(kees.page, P(2));
    await vul(kees.page, 'B1', 'opm-input', 'voor de blokkade');
    check('Kees werkt in Molenweg 2 (database)', await wachtTot(() => ruitIn(P(2), 'B1').opmerking === 'voor de blokkade', 6000));
    await jan.page.click('#startTabBeheer');
    await jan.page.waitForSelector('#beheerGebruikers tr[data-wie="u2"] button:has-text("Blokkeren")', { timeout: 8000 });
    await jan.page.locator('#beheerGebruikers tr[data-wie="u2"] button:has-text("Blokkeren")').click();
    await wachtOpMelding(jan.page, /blokkeren/i);
    await knop(jan.page, 'Blokkeren');
    check('Jan blokkeert Kees (database: actief uit)', await wachtTot(() => gRij('u2').actief === false, 5000));
    S.geenLive['pc-kees'] = true;
    S.geblokkeerdLog = [];
    await vul(kees.page, 'B2', 'opm-input', 'na de blokkade');
    await wacht(6000);
    t = await meldTekst(kees.page);
    const sync = await syncTekst(kees.page);
    const lsK = await kees.page.evaluate(() => Object.keys(localStorage).filter(k => /redding|pending|glasopname_v2/.test(k)).map(k => k + '=' + String(localStorage.getItem(k)).length));
    const werkOpApparaat = await kees.page.evaluate(() => JSON.stringify(Object.keys(localStorage).map(k => localStorage.getItem(k))).indexOf('na de blokkade') >= 0);
    check('geblokkeerd: de wijziging na de blokkade staat (nog) op het apparaat van Kees', werkOpApparaat, JSON.stringify(lsK));
    check('… de database is niet veranderd (de blokkade houdt het tegen)', ruitIn(P(2), 'B2').opmerking !== 'na de blokkade' && !!rijVan(2));
    letop('… de melding zegt dat zijn account geblokkeerd is (niet "project bestaat niet meer")', !/bestaat niet meer/.test(t + sync) && /geblokkeerd|toegang/i.test(t + sync),
      (t + ' || ' + sync).slice(0, 300));
    const n1 = S.geblokkeerdLog.length;
    await wacht(10000);
    const n2 = S.geblokkeerdLog.length;
    check('… de app bestookt de server niet (hoogstens een paar vragen in 10 s)', n2 - n1 <= 12, (n2 - n1) + ' vragen: ' + S.geblokkeerdLog.slice(n1, n1 + 12).join(', '));
    await plaatje(kees.page, '4-kees-geblokkeerd');
    await sluitMeldingen(kees.page);
    // Jan geeft Kees weer vrij; Kees herlaadt.
    await jan.page.locator('#beheerGebruikers tr[data-wie="u2"] button:has-text("Vrijgeven")').click();
    check('Jan geeft Kees weer vrij (database)', await wachtTot(() => gRij('u2').actief === true, 5000));
    S.geenLive['pc-kees'] = false;
    await kees.page.reload();
    await wacht(5000);
    await sluitMeldingen(kees.page);
    const terug = ruitIn(P(2), 'B2').opmerking === 'na de blokkade' ||
      S.db.projecten.some(p => (p.data.rijen || []).some(r => r.opmerking === 'na de blokkade'));
    check('na vrijgeven en herladen: de wijziging van Kees staat op de server (in het project of apart)', await wachtTot(() =>
      ruitIn(P(2), 'B2').opmerking === 'na de blokkade' || S.db.projecten.some(p => (p.data.rijen || []).some(r => r.opmerking === 'na de blokkade')), 10000),
      JSON.stringify(S.db.projecten.map(p => p.naam)) + ' ' + terug);
    check('… Molenweg 2 bestaat nog, met het werk van vóór de blokkade', !!rijVan(2) && ruitIn(P(2), 'B1').opmerking === 'voor de blokkade');
    await kees.ctx.close(); await jan.ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Prullenbak en opruimen (Bart weg, 31 dagen later, een foto in de wachtrij van een ander apparaat)');
    resetDb(); metRollen(); blokProject2(1);
    rijVan(1).data.fotos[0].origineel = { pad: P(1) + '/origineel/gevel.heic', type: 'image/heic', grootte: 2000 };
    S.opslag.set(P(1) + '/origineel/gevel.heic', { grootte: 2000, type: 'image/heic' });
    // Een wees van vroeger (een apparaat van vóór v124 uploadde na het opruimen).
    S.opslag.set(P(77) + '/oud.jpg', { grootte: 3000, type: 'image/jpeg' });
    // Twee apparaten met werk in project 1, allebei straks lang zonder bereik.
    const ph = await als('wim', IPHONE, 'iphone', 1);
    await zonderBereikVan(ph.page, 'iphone', true);
    check('Wim (iPhone, geen bereik): een foto wacht op het apparaat', await fotoViaKnop(ph.page) &&
      await wachtTot(async () => JSON.parse((await ls(ph.page, 'glasopname_erbij')) || '[]').length === 1, 8000));
    const wimPaden = await ph.page.evaluate(() => glasWachtrij.lijst().then(l => l.map(m => m.pad)));
    const ipad = await als('jan', IPAD, 'ipad', 1);
    await zonderBereikVan(ipad.page, 'ipad', true);
    await vul(ipad.page, 'L1', 'opm-input', 'iPad zonder bereik');
    {
      const k = ipad.page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
      await ipad.page.locator('#actieBalk button:has-text("Foto toevoegen")').tap({ timeout: 8000 }).catch(() => {});
      const kz = await k; if (kz) await kz.setFiles(GEVEL_JPG);
      await wachtTot(() => ipad.page.evaluate(() => !glasFotoBezig() && fotos.length === 2), 15000);
    }
    const ipadPaden = await ipad.page.evaluate(() => glasWachtrij.lijst().then(l => l.map(m => m.pad)));
    check('Jan (iPad, geen bereik): een opmerking en een foto; alles op het apparaat', ipadPaden.length >= 1 && await ls(ipad.page, 'glasopname_pending') === '1',
      JSON.stringify(ipadPaden));
    await ipad.page.evaluate(() => window.dispatchEvent(new Event('pagehide'))).catch(() => {});
    // Bart (collega) gooit het project weg, op een pc met een klok die 40 dagen achterloopt.
    const bctx = await nieuweContextAls(PC, 'pc-bart', WIE.bart);
    await bctx.clock.install({ time: new Date(Date.now() - 40 * 864e5) });
    const bpage = await nieuwePagina(bctx);
    await startScherm(bpage);
    await bpage.locator('#startProjecten button[onclick*="cloudVerwijder(\'' + P(1) + '\')"]').click();
    await wachtOpMelding(bpage, /prullenbak/);
    await knop(bpage, 'Naar de prullenbak');
    check('Bart gooit het project weg (database: verwijderd_op met de klok van de server)', await wachtTot(() => !!rijVan(1).verwijderd_op, 6000) &&
      Math.abs(new Date(rijVan(1).verwijderd_op).getTime() - Date.now()) < 60000, rijVan(1).verwijderd_op);
    await bpage.click('#startPrullenbakBlok .start-blokkop'); await wacht(400);
    check('Bart: in de prullenbak "Terugzetten", maar "Nu definitief verwijderen" staat er niet', await zichtbaar(bpage, '#startPrullenbak button:has-text("Terugzetten")') &&
      !(await zichtbaar(bpage, '#startPrullenbak button:has-text("Nu definitief")')));
    await bctx.close();
    // 31 dagen later (de klok van de server): de app van Bart ruimt op.
    rijVan(1).verwijderd_op = new Date(Date.now() - 31 * 864e5).toISOString();
    const b2 = await als('bart', PC, 'pc-bart');
    check('31 dagen later: de app van Bart ruimt het project automatisch op', await wachtTot(() => !rijVan(1), 10000));
    check('… met alle foto\'s, ook het origineel', await wachtTot(() => ![...S.opslag.keys()].some(k => k.indexOf(P(1) + '/') === 0), 6000),
      JSON.stringify([...S.opslag.keys()].filter(k => k.indexOf(P(1)) === 0)));
    await b2.ctx.close();
    // Wim krijgt weer bereik.
    const uploadsVoor = S.uploads.length;
    await zonderBereikVan(ph.page, 'iphone', false);
    await ph.page.evaluate(() => glasWachtrij.verwerk()).catch(() => {});
    await wacht(5000);
    check('Wim weer bereik: zijn foto gaat niet als wees de opslag in', !wimPaden.some(p => S.opslag.has(p)) && !S.uploads.slice(uploadsVoor).some(p => p.indexOf(P(1)) === 0),
      JSON.stringify(S.uploads.slice(uploadsVoor)));
    check('… en de iPhone blijft niet eindeloos proberen (wachtrij en rij werkvloer leeg)', await wachtTot(async () => !(await ls(ph.page, 'glasopname_erbij')) &&
      (await ph.page.evaluate(() => glasWachtrij.lijst().then(l => l.length))) === 0, 8000));
    // Jan op de iPad krijgt weer bereik: zijn werk (opmerking) mag niet weg.
    await zonderBereikVan(ipad.page, 'ipad', false);
    await ipad.page.evaluate(() => { glasWachtrij.verwerk(); if (window.opslaan) opslaan(); }).catch(() => {});
    await wachtTot(() => apartBewaard().length > 0, 15000);
    await wacht(3000);
    const ap = apartBewaard();
    check('Jan (iPad) weer bereik: zijn opmerking staat apart op de server (project bestond niet meer)', ap.some(p => (p.data.rijen || []).some(r => r.opmerking === 'iPad zonder bereik')),
      JSON.stringify(ap.map(p => p.naam)));
    const apFotos = ap.flatMap(p => (p.data.fotos || []).filter(f => f.pad && f.pad.indexOf(P(1)) === 0 && !S.opslag.has(f.pad)).map(f => f.pad));
    letop('… en zijn nieuwe foto ook (niet weggegooid door de wachtrij terwijl de rest apart bewaard wordt)', !apFotos.length && !ipadPaden.some(p => !S.opslag.has(p) && ap.some(x => JSON.stringify(x.data).indexOf(p) >= 0)),
      'apart project verwijst naar ' + apFotos.length + ' foto(\'s) zonder bestand: ' + apFotos.join(', '));
    // v124 (reparatie A3): een foto die de aparte kopie noemt, is geen wees.
    check('… geen wees in de opslag van het weggegooide project (een foto die de aparte kopie noemt, is er geen)',
      ![...S.opslag.keys()].some(k => k.indexOf(P(1) + '/') === 0 && !inGebruik(k)),
      JSON.stringify([...S.opslag.keys()].filter(k => k.indexOf(P(1)) === 0 && !inGebruik(k))));
    await sluitMeldingen(ipad.page);
    // Opslag nakijken (Jan, Beheer op de pc).
    const pc = await als('jan', PC, 'pc');
    await pc.page.click('#startTabBeheer');
    await pc.page.click('button:has-text("Opslag nakijken")');
    await pc.page.waitForSelector('#beheerOpslag table', { timeout: 8000 });
    t = await pc.page.$eval('#beheerOpslag tr[data-soort="1"]', e => e.innerText.replace(/\s+/g, ' '));
    check('Opslag nakijken: precies 1 foto zonder project (de oude wees, niet die uit de wachtrij)', /Zonder project.* 1 /.test(t + ' '), t);
    await plaatje(pc.page, '5-opslag-nakijken', true);
    await pc.page.click('#beheerOpslag button:has-text("zonder project opruimen")');
    await wachtOpMelding(pc.page, /Ze horen nergens meer bij/);
    await knop(pc.page, 'Opruimen');
    check('… opruimen: de wees is weg', await wachtTot(() => !S.opslag.has(P(77) + '/oud.jpg'), 8000));
    check('… het nakijken zegt daarna: geen', await wachtTot(async () => /geen foto's zonder project/.test(await pc.page.$eval('#beheerOpslag', e => e.innerText)), 6000));
    await ph.ctx.close(); await ipad.ctx.close(); await pc.ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Update van v123 naar v124 met openstaand werk (script 30 staat al op de server)');
    const OUD = process.env.OUD123 || '/tmp/live123';
    const oudMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v124c-oud-'));
    fs.cpSync(OUD, oudMap, { recursive: true });
    fs.writeFileSync(path.join(oudMap, 'config.js'), 'window.GLASOPNAME_CONFIG = { url: "https://test.supabase.co", anonKey: "sb_publishable_test" };\n');
    const opMet = async (page, id) => { await page.goto('about:blank'); await page.goto(adres + '#project=' + id);
      await page.waitForFunction(i => window.glasProjectId === i && document.getElementById('projectNaam') && document.getElementById('projectNaam').value, id, { timeout: 15000 });
      await wacht(900); };
    const ergens = tekst => S.db.projecten.filter(p => JSON.stringify(p.data || {}).indexOf(tekst) >= 0).map(p => p.naam);

    // a. Bart (collega) op v123, zonder bereik aan het werk; intussen neemt Jan
    //    (v124) het project over en slaat op.
    resetDb(); metRollen(); blokProject2(1);
    rijVan(1).data._versieNr = 123;
    wortel = oudMap;
    const bart = await als('bart', PC, 'pc-bart');
    await opMet(bart.page, P(1));
    check('Bart draait v123 (de echte oude code)', await bart.page.evaluate(() => APP_VERSIE) === 'v123');
    await zonderBereikVan(bart.page, 'pc-bart', true);
    await vul(bart.page, 'L1', 'opm-input', 'v123 zonder bereik');
    await vul(bart.page, 'A', 'breedte-input', '905');
    check('… zijn werk staat op het apparaat ("moet nog omhoog")', await ls(bart.page, 'glasopname_pending') === '1' &&
      /v123 zonder bereik/.test(await ls(bart.page, 'glasopname_v2') || ''));
    wortel = map;
    S.slot[P(1)].gezien = new Date(Date.now() - 10 * 60000).toISOString();
    const jan = await als('jan', PC, 'pc-jan', 1);
    if (await jan.page.evaluate(() => glasAlleenKijken())) await tochBewerken(jan.page);
    await vul(jan.page, 'B', 'opm-input', 'Jan op v124');
    check('Jan (v124) slaat op: het project heeft nu versie 124', await wachtTot(() => ruitIn(P(1), 'B').opmerking === 'Jan op v124' && +rijVan(1).data._versieNr === 124, 8000),
      String(rijVan(1).data._versieNr));
    // Bart krijgt weer bereik, nog op v123.
    await zonderBereikVan(bart.page, 'pc-bart', false);
    await bart.page.evaluate(() => window.opslaan && opslaan()).catch(() => {});
    await wacht(6000);
    const sync123 = await syncTekst(bart.page) + ' ' + await meldTekst(bart.page);
    check('v123 met bereik: zijn werk overschrijft dat van Jan niet', ruitIn(P(1), 'B').opmerking === 'Jan op v124' && +rijVan(1).data._versieNr === 124);
    check('… en is niet weg (in een apart project, of nog op het apparaat)', ergens('v123 zonder bereik').length > 0 ||
      /v123 zonder bereik/.test(await ls(bart.page, 'glasopname_v2') || '') || /v123 zonder bereik/.test(await ls(bart.page, 'glasopname_redding') || ''),
      JSON.stringify(ergens('v123 zonder bereik')) + ' | ' + sync123.slice(0, 160));
    await plaatje(bart.page, '6-v123-na-bereik');
    // De update: de server geeft v124; het apparaat herlaadt.
    await sluitMeldingen(bart.page);
    await naarStart(jan.page);
    await bart.page.reload();
    await wacht(5000);
    await sluitMeldingen(bart.page);
    check('na de update draait Bart v124', await bart.page.evaluate(() => APP_VERSIE) === 'v124');
    check('… zijn werk van v123 staat op de server (apart of in het project), niets weg', await wachtTot(() => ergens('v123 zonder bereik').length > 0, 12000),
      JSON.stringify(S.db.projecten.map(p => p.naam)));
    check('… de maat 905 van Bart ook', S.db.projecten.some(p => (p.data.rijen || []).some(r => r.merk === 'A' && String(r.breedte) === '905')));
    check('… het werk van Jan staat nog in het project', ruitIn(P(1), 'B').opmerking === 'Jan op v124');
    check('… niets meer "moet nog omhoog" op het apparaat van Bart', await wachtTot(async () => !(await ls(bart.page, 'glasopname_pending')), 8000));
    await opMet(bart.page, P(1));
    await vul(bart.page, 'C', 'opm-input', 'Bart op v124');
    check('Bart werkt daarna gewoon op v124 (in het project zelf)', await wachtTot(() => ruitIn(P(1), 'C').opmerking === 'Bart op v124', 8000));
    await bart.ctx.close(); await jan.ctx.close();

    // b. Wim op v123 was collega en werkt zonder bereik; intussen zet Jan hem
    //    op werkvloer (een versie die v123 niet kent).
    resetDb(); metRollen(); blokProject2(1);
    gRij('u3').rol = 'collega';
    rijVan(1).data._versieNr = 123;
    wortel = oudMap;
    const wim = await als('wim', IPAD, 'ipad-wim');
    await opMet(wim.page, P(1));
    check('Wim draait v123 (nog collega)', await wim.page.evaluate(() => APP_VERSIE) === 'v123' && !(await wim.page.evaluate(() => glasAlleenKijken())));
    await zonderBereikVan(wim.page, 'ipad-wim', true);
    await vul(wim.page, 'L1', 'opm-input', 'wim op v123');
    {
      const k = wim.page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
      await wim.page.locator('#actieBalk button:has-text("Foto toevoegen"), button:visible:has-text("Foto toevoegen")').first().tap({ timeout: 8000 }).catch(() => {});
      const kz = await k; if (kz) await kz.setFiles(GEVEL_JPG);
      await wachtTot(() => wim.page.evaluate(() => !(window.glasFotoBezig && glasFotoBezig()) && fotos.length === 2), 15000);
    }
    const wimPad = await wim.page.evaluate(() => (fotos[1] || {}).pad || '');
    check('v123 (Wim, geen bereik): opmerking en foto op het apparaat', !!wimPad && await ls(wim.page, 'glasopname_pending') === '1', wimPad);
    gRij('u3').rol = 'werkvloer';
    S.rpcLog = []; S.dbLog = [];
    await zonderBereikVan(wim.page, 'ipad-wim', false);
    await wacht(20000);
    const pogingen = S.dbLog.filter(x => x.wie === 'u3' && x.tabel === 'projecten' && x.op === 'update').length;
    t = await syncTekst(wim.page) + ' ' + await meldTekst(wim.page);
    check('v123 met bereik: de database weigert (werkvloer), het project is niet veranderd', ruitIn(P(1), 'L1').opmerking !== 'wim op v123');
    check('… het werk blijft op het apparaat', /wim op v123/.test(await ls(wim.page, 'glasopname_v2') || '') ||
      /wim op v123/.test(await ls(wim.page, 'glasopname_redding') || '') || ergens('wim op v123').length > 0);
    letop('… v123 blijft niet elke paar seconden opnieuw proberen (20 s)', pogingen <= 3, pogingen + ' keer opslaan geprobeerd; scherm: ' + t.slice(0, 160));
    // Update naar v124.
    wortel = map;
    await sluitMeldingen(wim.page);
    await wim.page.reload();
    await wacht(6000);
    await sluitMeldingen(wim.page);
    check('na de update draait Wim v124, als werkvloer', await wim.page.evaluate(() => APP_VERSIE) === 'v124' && /rol-werkvloer/.test(await lichaam(wim.page)));
    check('… zijn opmerking van v123 is niet weg (apart op de server)', await wachtTot(() => ergens('wim op v123').length > 0, 12000), JSON.stringify(S.db.projecten.map(p => p.naam)));
    check('… zijn foto ook: het bestand in de opslag', await wachtTot(() => S.opslag.has(wimPad), 12000), wimPad);
    check('… het project zelf is niet door de werkvloer veranderd', ruitIn(P(1), 'L1').opmerking !== 'wim op v123' && dbStand(1).bollen === 'f1:6');
    check('… er blijft niets hangen als "moet nog omhoog"', await wachtTot(async () => !(await ls(wim.page, 'glasopname_pending')), 8000));
    // Daarna werkt alles: een foto als werkvloer gaat via glas_foto_erbij in het project.
    await opMet(wim.page, P(1));
    check('na de update: Wim voegt een foto toe en die staat in het project', await fotoViaKnop(wim.page) && await wachtTot(() => erbijFotos(1).length === 1, 15000));
    await wim.ctx.close();
  }

  /* ══ 7 ════════════════════════════════════════════════════════ */
  if (doe('7')) {
    console.log('\n7. Twee tabbladen op dezelfde pc, hetzelfde project, ↶ in beide');
    const opm = (page) => page.evaluate(() => rijen.map(r => r.opmerking || ''));
    const dbOpm = () => rijVan(1).data.rijen.map(r => r.opmerking || '');
    for (const variant of ['klikt ernaast', 'cursor blijft in een vak']) {
      console.log('   (' + variant + ')');
      resetDb(); metRollen(); blokProject2(1);
      const ctx = await nieuweContextAls(PC, 'pc', WIE.jan);
      const A = await nieuwePagina(ctx);
      await openId(A, P(1));
      const B = await nieuwePagina(ctx);
      await openId(B, P(1));
      await wacht(1000);
      if (variant === 'klikt ernaast') {
        t = await kortBer(B) + ' ' + await meldTekst(B);
        check('tabblad B: een kort bericht dat het project ook in een ander tabblad open is (geen venster)', /tabblad/i.test(t) && !(await meldingen(B)).length, t.slice(0, 160));
        check('beide tabbladen mogen bewerken (zelfde apparaat)', !(await A.evaluate(() => glasAlleenKijken())) && !(await B.evaluate(() => glasAlleenKijken())));
      }
      await A.bringToFront();
      await vul(A, 'L1', 'opm-input', 'tab A');
      if (variant === 'klikt ernaast') { await A.mouse.click(5, 5); await wacht(300); }
      await wachtTot(() => ruitIn(P(1), 'L1').opmerking === 'tab A', 6000);
      check('A typt (database) en B ziet het', await wachtTot(() => B.evaluate(() => (rijen.find(r => r.merk === 'L1') || {}).opmerking === 'tab A'), 8000));
      await B.bringToFront();
      await vul(B, 'A', 'opm-input', 'tab B');
      await B.mouse.click(5, 5); await wacht(300);
      await wachtTot(() => ruitIn(P(1), 'A').opmerking === 'tab B', 6000);
      const aZiet = await wachtTot(() => A.evaluate(() => (rijen.find(r => r.merk === 'A') || {}).opmerking === 'tab B'), 8000);
      const aMeld = await syncTekst(A);
      if (variant === 'klikt ernaast') check('B typt (database) en A ziet het', aZiet && ruitIn(P(1), 'L1').opmerking === 'tab A', JSON.stringify(await opm(A)));
      else check('B typt; A (cursor nog in een vak) neemt het niet stil over maar zegt het', !aZiet && /gewijzigd/.test(aMeld), aZiet + ' ' + aMeld);
      if (variant !== 'klikt ernaast') letop('… die melding in tabblad A noemt "een collega", terwijl het Jan zelf is in een ander tabblad', !/collega/.test(aMeld), aMeld);
      // ↶ in A.
      await A.bringToFront();
      await A.mouse.click(5, 5); await ongedaan(A); await wacht(2000);
      const meldA = await meldTekst(A) + ' ' + await kortBer(A);
      await sluitMeldingen(A);
      const naA = { L1: ruitIn(P(1), 'L1').opmerking || '', A: ruitIn(P(1), 'A').opmerking || '' };
      check('↶ in A: de wijziging van B blijft staan (database)', naA.A === 'tab B', JSON.stringify(naA));
      if (variant === 'klikt ernaast') {
        check('… A draait zijn eigen wijziging terug, of zegt duidelijk waarom niet; niets apart', (naA.L1 === '' || /kan niet verder terug.*intussen/.test(meldA)) && !apartBewaard().length,
          JSON.stringify(naA) + ' apart: ' + apartBewaard().length + ' ' + meldA.slice(0, 160));
        letop('… die uitleg zegt "op een ander apparaat", terwijl het een ander tabblad op deze pc is', naA.L1 === '' || !/ander apparaat/.test(meldA), meldA.slice(0, 120));
      }
      else letop('… ↶ in A (op een verouderd scherm) maakt geen apart bewaard project', !apartBewaard().length,
        apartBewaard().map(p => p.naam + ' ' + JSON.stringify(p.data.rijen.map(r => r.opmerking || ''))).join(' | ') + ' | ' + meldA.slice(0, 200));
      await wacht(1500);
      // ↶ in B.
      await B.bringToFront();
      await B.mouse.click(5, 5); await ongedaan(B); await wacht(2000); await sluitMeldingen(B);
      const naB = { L1: ruitIn(P(1), 'L1').opmerking || '', A: ruitIn(P(1), 'A').opmerking || '' };
      check('↶ in B: wat A terugdraaide komt niet terug (database)', naB.L1 === naA.L1, JSON.stringify({ naA, naB }));
      check('… B draait zijn eigen wijziging terug (database), of laat hem staan; niets anders', naB.A === '' || naB.A === 'tab B', JSON.stringify(naB));
      // Allebei nog een keer ↶, A eerst herladen.
      await herlaad(A, P(1));
      await A.mouse.click(5, 5); await ongedaan(A); await wacht(1200); await sluitMeldingen(A);
      await B.bringToFront();
      await B.mouse.click(5, 5); await ongedaan(B); await wacht(1200); await sluitMeldingen(B);
      const eind = { L1: ruitIn(P(1), 'L1').opmerking || '', A: ruitIn(P(1), 'A').opmerking || '', stand: dbStand(1) };
      const terugUitNiets = (naB.L1 === '' && eind.L1 === 'tab A') || (naB.A === '' && eind.A === 'tab B');
      check('na herladen en nog eens ↶ in beide: niets komt uit het niets terug, het blok compleet', !terugUitNiets &&
        eind.stand.merken === '1:A@f1 2:B@f1 3:C@f1 4:D@f1 5:E@f1 6:F@f1 7:L1' && eind.stand.bollen === 'f1:6', JSON.stringify({ naB, eind }));
      check('… de twee tabbladen tonen daarna hetzelfde als de database', await wachtTot(async () =>
        JSON.stringify(await opm(A)) === JSON.stringify(dbOpm()) && JSON.stringify(await opm(B)) === JSON.stringify(dbOpm()), 8000),
        JSON.stringify([await opm(A), await opm(B), dbOpm()]));
      await ctx.close();
    }
  }

  /* ══ 8 ════════════════════════════════════════════════════════ */
  if (doe('8')) {
    console.log('\n8. Erbij bedacht: een foto van de werkvloer terwijl het project even in de prullenbak staat');
    resetDb(); metRollen(); blokProject2(1);
    const ph = await als('wim', IPHONE, 'iphone', 1);
    await zonderBereikVan(ph.page, 'iphone', true);
    check('Wim (geen bereik): een foto wacht op de iPhone', await fotoViaKnop(ph.page) &&
      await wachtTot(async () => JSON.parse((await ls(ph.page, 'glasopname_erbij')) || '[]').length === 1, 8000));
    // Bart gooit het project per ongeluk weg.
    const bart = await als('bart', PC, 'pc-bart');
    await bart.page.locator('#startProjecten button[onclick*="cloudVerwijder(\'' + P(1) + '\')"]').click();
    await wachtOpMelding(bart.page, /prullenbak/);
    await knop(bart.page, 'Naar de prullenbak');
    check('Bart gooit het project weg (prullenbak)', await wachtTot(() => !!rijVan(1).verwijderd_op, 6000));
    await zonderBereikVan(ph.page, 'iphone', false);
    v = await wachtOpMelding(ph.page, /prullenbak/, 15000);
    check('Wim weer bereik: hij hoort dat zijn foto nog niet in het project kan (prullenbak), en dat hij bewaard blijft', v.ok && /bewaard/.test(v.tekst), v.tekst.slice(0, 200));
    check('… de foto staat nog op de iPhone, het bestand al in de opslag', !!(await ls(ph.page, 'glasopname_erbij')) &&
      [...S.opslag.keys()].some(k => k.indexOf(P(1) + '/') === 0 && k !== P(1) + '/gevel.jpg'));
    await sluitMeldingen(ph.page);
    // Bart zet het project terug.
    await bart.page.click('#startPrullenbakBlok .start-blokkop'); await wacht(400);
    await bart.page.locator('#startPrullenbak button:has-text("Terugzetten")').first().click();
    await wacht(500);
    if ((await meldingen(bart.page)).length) await knop(bart.page, 'Terugzetten').catch(() => {});
    check('Bart zet het project terug', await wachtTot(() => !rijVan(1).verwijderd_op, 6000));
    // Het bereik van de iPhone hapert even (zoals op de bouw): de foto gaat er alsnog in.
    await zonderBereikVan(ph.page, 'iphone', true);
    await zonderBereikVan(ph.page, 'iphone', false);
    check('… de foto van Wim gaat er alsnog in, vanzelf', await wachtTot(() => erbijFotos(1).length === 1, 15000) &&
      await wachtTot(async () => !(await ls(ph.page, 'glasopname_erbij')), 8000));
    check('… en de rest van het project is heel (6 ruiten met bolletjes)', dbStand(1).bollen.indexOf('f1:6') === 0);
    await ph.ctx.close(); await bart.ctx.close();
  }

  /* ══ 9 ════════════════════════════════════════════════════════ */
  if (doe('9')) {
    console.log('\n9. Erbij bedacht: een apart bewaard project houdt zijn foto\'s, ook als het origineel later wordt opgeruimd');
    resetDb(); metRollen(); blokProject2(1);
    // Bart werkt zonder bereik op de iPad; Jan neemt het project over en slaat op.
    const bart = await als('bart', IPAD, 'ipad-bart', 1);
    await bart.page.waitForSelector('#img-' + FOTO, { timeout: 10000 });
    await zonderBereikVan(bart.page, 'ipad-bart', true);
    await vul(bart.page, 'L1', 'opm-input', 'Bart zonder bereik');
    S.slot[P(1)].gezien = new Date(Date.now() - 10 * 60000).toISOString();
    const jan = await als('jan', PC, 'pc-jan', 1);
    if (await jan.page.evaluate(() => glasAlleenKijken())) await tochBewerken(jan.page);
    await vul(jan.page, 'B', 'opm-input', 'Jan nam over');
    await wachtTot(() => ruitIn(P(1), 'B').opmerking === 'Jan nam over', 8000);
    await zonderBereikVan(bart.page, 'ipad-bart', false);
    await bart.page.evaluate(() => window.opslaan && opslaan()).catch(() => {});
    check('Bart weer bereik: zijn werk staat apart (met de gevelfoto en de bolletjes)', await wachtTot(() => apartBewaard().length === 1, 12000) &&
      (apartBewaard()[0].data.fotos || []).some(f => f.pad === P(1) + '/gevel.jpg' && (f.markeringen || []).length === 6), JSON.stringify(apartBewaard().map(p => p.naam)));
    const apartId = (apartBewaard()[0] || {}).id;
    await sluitMeldingen(bart.page);
    await bart.ctx.close();
    await naarStart(jan.page);
    // Jan gooit het origineel weg (hij werkt verder in de aparte kopie); 31 dagen later wordt het opgeruimd.
    await jan.page.locator('#startProjecten button[onclick*="cloudVerwijder(\'' + P(1) + '\')"]').click();
    await wachtOpMelding(jan.page, /prullenbak/);
    await knop(jan.page, 'Naar de prullenbak');
    await wachtTot(() => !!rijVan(1).verwijderd_op, 6000);
    rijVan(1).verwijderd_op = new Date(Date.now() - 31 * 864e5).toISOString();
    await jan.ctx.close();
    const kees = await als('kees', PC, 'pc-kees');
    await wachtTot(() => !rijVan(1), 10000);
    check('31 dagen later: het origineel is opgeruimd', !rijVan(1));
    check('… de aparte kopie bestaat nog', !!rij(apartId));
    check('… en haar gevelfoto staat nog in de opslag (gegevensverlies als hij mee weg is)', S.opslag.has(P(1) + '/gevel.jpg'),
      'opslag: ' + JSON.stringify([...S.opslag.keys()].filter(k => k.indexOf(P(1)) === 0)) + ', de kopie verwijst naar ' + P(1) + '/gevel.jpg');
    await kees.ctx.close();
    // En "Opslag nakijken": een foto die een aparte kopie gebruikt, is geen wees.
    S.opslag.set(P(1) + '/gevel.jpg', { grootte: 1000, type: 'image/jpeg', b64: GEVEL_B64 });
    const pc = await als('jan', PC, 'pc');
    await pc.page.click('#startTabBeheer');
    await pc.page.click('button:has-text("Opslag nakijken")');
    await pc.page.waitForSelector('#beheerOpslag table', { timeout: 8000 });
    t = await pc.page.$eval('#beheerOpslag tr[data-soort="1"] td:nth-child(2)', e => e.innerText.trim());
    check('Opslag nakijken: de foto die de aparte kopie gebruikt, telt niet als "zonder project" (anders ruimt Jan hem op)', t === '0',
      t + ' foto(\'s) zonder project; knop: ' + await pc.page.$eval('#beheerOpslag', e => (e.querySelector('button') || {}).innerText || '(geen)'));
    await pc.ctx.close();
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 4).join(' | '));
  await browser.close();
  server.close();
  if (letOpLijst.length) console.log('\nLET OP (geen harde fout): ' + letOpLijst.length + '\n  - ' + letOpLijst.join('\n  - '));
  console.log('\nSchermafdrukken en pdf-plaatjes: ' + PLAATJES_MAP);
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
