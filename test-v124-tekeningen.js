/* Testreeks v124 — meerdere tekeningen bij één maatstaat
   node test-v124-tekeningen.js            (en: --mutaties, of --mutaties naam1,naam2)
   PLAATJES=map  → schermafdrukken (1280, iPad 820, telefoon 390) en de pdf als afbeelding.

   Onderwerp (wens en keuze Jan, 26-10-2026): een sponningmatenlijst met
   meerdere tekeningen. "Eén ruit, bolletjes verdeeld": een regel (A, 3 stuks)
   blijft één ruit en één regel op de bestellijst; zijn bolletjes mogen op
   verschillende tekeningen staan.

   De vijf vragen (TESTEN.md):
   1. Echte situatie. Kantoor (pc) leest een maatstaat in (xlsx, kop "Aantal |
      Breedte (mm) | Hoogte (mm) | Merk | Max incl. band", 3×A, 3×A, 1×B,
      1×B) en een pdf van de kozijnfabriek van 3 pagina's (A, B, doorsnede).
      Op de bouw (iPad, vinger en Apple Pencil) wijst iemand de ruiten aan op
      tekening 1 en 2; soms staan 3 ruiten van één regel in 2 kozijnen. Een
      collega op de pc kijkt mee of neemt over; daarna wordt er besteld en
      gaat de pdf invoer in het archief. Ook op een telefoon.
   2. Belofte. Aanwijzen werkt op elke tekening, uit álle ruiten van het
      project; samen nooit meer bolletjes dan het aantal. Een ruit staat in
      het blok van de tekening met de meeste bolletjes (gelijk: de eerste);
      elders een verwijzing die je kunt aantikken. Na de import een korte
      route per tekening. De bestellijst blijft één regel per ruit; verhuizen
      is geen wijziging van de bestelling. ↶ (ook per tabel) zet elke stap
      terug zonder iets kwijt te raken. Op slot en bij alleen kijken: niet.
   3. Wat gaat er mis? Een ruit verdwijnt of staat dubbel (↶ per tabel na een
      verhuizing); te veel bolletjes, ook op papier; een tik op een andere
      tekening maakt stil een nieuwe ruit; de ruit staat in het verkeerde blok;
      verhuizen geeft "gewijzigd na bestelling"; de route blijft hangen of
      komt bij alleen kijken; een nummer in een vorm die script 28 weigert.
   4. Wat kan er halverwege gebeuren? Herladen midden in het aanwijzen; een
      tweede apparaat opent het project; eerst de pdf en dan pas de maatstaat
      (andere volgorde); de route met ✕ dicht en later nog een import;
      bestellen, ontgrendelen en dan pas verhuizen.
   5. Wat neemt de opstelling aan? De nagebootste database van test-v123
      (node), nu met de echte inhoud van geüploade bestanden; echte Chromium,
      een iPad-profiel (aanraken) en een telefoon; de Pencil als pen-invoer
      via het DevTools-protocol (geen echte Pencil). De maatstaat en de pdf
      zijn nagemaakt (verzonnen namen), met de opbouw van Jans voorbeelden.
      Echte Safari, iPad, Android en Windows: niet hier. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de nieuwe functies kapotmaken (proef op de som) ──────────── */
const MUTATIES = {
  // aanwijzen op elke tekening, uit alle ruiten (fotos.js zonderMarkering)
  alleRuiten: ['fotos.js', "      if ((geteld[r.id] || 0) >= aantalVan(r)) return false;\n      return !!(r.merk",
                           "      if ((geteld[r.id] || 0) >= aantalVan(r)) return false;\n      if (r.fotoId && r.fotoId !== fotoId) return false;\n      return !!(r.merk"],
  kiezen: ['fotos.js', "    if (!zijn.length) return;", "    return;"],
  alleOpEen: ['fotos.js', "var erbij = aanwijzen.alle ? aantalVan(bestaande)", "var erbij = false ? aantalVan(bestaande)"],
  andereTekening: ['fotos.js', "      aanwijzen.fotoId = fotoId;\n", ""],
  // de ruit in het blok van de tekening met de meeste bolletjes
  meesteBolletjes: ['fotos.js', "        naarBolletjes(bestaande);", "        bestaande.fotoId = fotoId;"],
  gelijkEerste: ['fotos.js', "if (!beste || x.n > beste.n) beste = x;", "if (!beste || x.n >= beste.n) beste = x;"],
  wegVerhuist: ['fotos.js', "    if (weg) naarBolletjes(getRij(weg.rijId));", ""],
  // verwijzingen en telling
  verwijzing: ['fotos.js', "    if (!v.elders.length && !v.ookElders.length) return '';", "    return '';"],
  eldersTelling: ['fotos.js', "    return n ? t + ' \\u00b7 ' + n + ' van elders' : t;", "    return t;"],
  strookThuis: ['fotos.js', "      if (thuisVan(x.rij.id) !== fotoId) return false;",
    "      if ((werkFotos().find(function (f) { return (f.markeringen || []).some(function (m) { return m.rijId === x.rij.id; }); }) || {}).id !== fotoId) return false;"],
  // de route
  routeImport: ['import.js', "    if (window.aanwijsRouteNaImport) window.aanwijsRouteNaImport();", ""],
  routeTekening: ['fotos.js', "      if (zelfdeProject(pid)) window.aanwijsRouteNaImport();", ""],
  routeOpen: ['fotos.js', "      route = { pid: window.glasProjectId };", "      route = null;"],
  routeVolgende: ['fotos.js', "        (volgende ? '<button", "        (false ? '<button"],
  routeSlot: ['fotos.js', "    if (window.invoerOpSlot && invoerOpSlot()) return '';\n    if (!meerTekeningen()) return '';", "    if (!meerTekeningen()) return '';"],
  // ↶ per tabel bij een verhuizing (blokbalk.js)
  blokTerug: ['blokbalk.js', "        verhuisd.push({ rij: t, bollen: bollenIn(r.id, toenStaat.fotos) });", ""],
  blokVreemd: ['blokbalk.js', "      if (doelFoto) doelFoto.markeringen = doelFoto.markeringen.concat(vreemd);     // v124", ""],
  blokHouden: ['blokbalk.js', "      .concat(houden)\n", ""],
  // samenvoeging met het herstel van de stapel (zetDeelIn)
  deelVerhuisd: ['blokbalk.js', "      deel.verhuisd = verhuisd.map(", "      deel.verhuisd = [].map("],
  ongedaanStempel: ['undo.js', "          if (k === 'gewOp' || k === 'gewDoor') return false;\n", ""],
  deelBlijf: ['blokbalk.js', ".concat(JSON.parse(JSON.stringify(regels))).concat(blijvend).concat(", ".concat(JSON.parse(JSON.stringify(regels))).concat("],
  fotoWeg: ['blokbalk.js', "        if (t.fotoId && !fotos.some(function (f) { return f.id === t.fotoId; })) return;\n", ""],
  vergelijkNiet: ['blokbalk.js', "        if (t && isHier(t) !== isHier(r) && !vastId[r.id]) nietTerug[r.id] = true;", ""],
  deelVreemd: ['blokbalk.js', "        if (!elders[m.rijId] || vast[m.rijId]) return true;\n        return ruimteVan(m.rijId) > 0 && ruimte[m.rijId]-- > 0;", "        return !elders[m.rijId] || vast[m.rijId];"],
  // papier (pdf.js)
  pdfTotaal: ['pdf.js', "      if ((nrVan.get(m) || 1) > max) return;", "      if (1 > max) return;"],
  pdfVerwijzing: ['pdf.js', "    return [hier.length ? 'Ook op deze '", "    return [false ? 'Ook op deze '"],
  werkvloerVerw: ['pdf.js', "          if (!eigen.length && !verwW) return;", "          if (!eigen.length) return;"]
};
const WAAR = { alleRuiten: '1,3', kiezen: '1,3', alleOpEen: '1,3', andereTekening: '6', meesteBolletjes: '1,3', gelijkEerste: '1,3',
  wegVerhuist: '1,3', verwijzing: '1,3', eldersTelling: '1,3', strookThuis: '6', routeImport: '2', routeTekening: '2', routeOpen: '1,3',
  routeVolgende: '1,3', routeSlot: '1,3,4', blokTerug: '6', blokVreemd: '6', blokHouden: '6', deelVerhuisd: '6', deelVreemd: '6', ongedaanStempel: '6', deelBlijf: '6', vergelijkNiet: '6', fotoWeg: '6', pdfTotaal: '7', pdfVerwijzing: '1,3,5',
  werkvloerVerw: '7' };

if (process.argv.indexOf('--mutaties') >= 0) {
  let goed = 0;
  const alleen = process.argv[process.argv.indexOf('--mutaties') + 1];
  const namen = Object.keys(MUTATIES).filter(n => !alleen || alleen.split(',').indexOf(n) >= 0);
  namen.forEach(function (naam) {
    const r = spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { MUTATIE: naam, ALLEEN: WAAR[naam] || '' }),
                                                         encoding: 'utf8', timeout: 900000 });
    const uit = (r.stdout || '') + (r.stderr || '');
    const regels = uit.split('\n').filter(l => /^\s+FOUT /.test(l)).map(l => l.trim());
    const gevangen = regels.length > 0 && !/mutatie past niet/.test(uit) && !/FOUT \(crash\)/.test(regels[0]);
    console.log((gevangen ? '  ok   ' : '  FOUT ') + 'mutatie ' + naam + (gevangen ? ' wordt gevangen: ' : ' wordt NIET gevangen ') +
                (regels[0] ? regels[0].slice(0, 130) : (/mutatie past niet/.test(uit) ? '(past niet!)' : uit.slice(-300))));
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
    // v124: wat de app uploadde, komt terug zoals het was (de tekening).
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v124-'));
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
  // v124: welke aanwijzer het laatst drukte (muis, aanraking, pen).
  await page.addInitScript(() => { document.addEventListener('pointerdown', e => { window.__laatstePen = e.pointerType; }, true); });
  const pr = { page: page, apparaat: ctx.__apparaat, dicht: false };
  PAGINAS.push(pr); page.on('close', () => { pr.dicht = true; });
  page.on('pageerror', e => { if (!/sandboxed/.test(String(e))) consoleFouten.push(String(e)); });  // v109: het afgeschermde inlogkader, zie TESTEN.md
  // Ook console.error: een fout in de pdf-stroom komt via mislukt() in de
  // console, niet als pageerror (opmerking bij de beoordeling).
  // v123: "geen link voor …/kwijt.jpg" is de bedoeling (onderdeel 12: een foto die niet op te halen is).
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|sandboxed|kwijt\.jpg/.test(m.text())) consoleFouten.push('[console] ' + m.text()); });
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v124-pdf-'));
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

/* ─── hulp voor v124 ──────────────────────────────────────────── */
const werkMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v124-werk-'));
// De maatstaat zoals Jans voorbeeld (SPONNINGMATEN_…xlsx), met verzonnen
// namen: titelregels, de kop, vier regels, "===" en een totaal.
function maatstaatXlsx() {
  const doel = path.join(werkMap, 'SPONNINGMATEN_999001.xlsx');
  const r = spawnSync('python3', ['-I', '-c', [
    'import sys, openpyxl',
    'wb = openpyxl.Workbook(); ws = wb.active; ws.title = "SPONNINGMATEN 999001"',
    'for rij in [("SPONNINGMATEN LIJST",), (" van project: 999001",), ("Fam. Voorbeeld",), ("Bouwbedrijf Voorbeeld B.V.",),',
    '            ("Aantal", "Breedte (mm)", "Hoogte (mm)", "Merk", "Max incl. band"),',
    '            (3, 976, 572, "A", "28mm"), (3, 977, 1079, "A", "28mm"), (1, 988, 572, "B", "28mm"), (1, 989, 1094, "B", "28mm"),',
    '            ("===",), (8,)]:',
    '    ws.append(list(rij))',
    'wb.save(sys.argv[1])'].join('\n'), doel], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('xlsx maken: ' + r.stderr);
  return fs.readFileSync(doel);
}
// De pdf van de kozijnfabriek, nagemaakt: 3 pagina's liggend, pagina 1 merk A
// (één kozijn met bovenraam en onderraam, "3 getek."), pagina 2 merk B, pagina
// 3 een doorsnede. Alleen lijnen en tekst, zoals een scan zonder tekstlaag
// voor de app niets herkenbaars heeft.
function tekeningPdf() {
  const doc = new JSPDF.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const kozijn = (merk, getek) => {
    doc.setFontSize(18); doc.setTextColor(200, 60, 40); doc.text('Merk: ' + merk, 14, 16);
    doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.text(getek + ' getek., Kleur: RAL 9001', 14, 22);
    doc.setLineWidth(1.2); doc.rect(40, 30, 90, 160);                 // kozijn
    doc.setLineWidth(0.8); doc.rect(46, 36, 78, 52); doc.rect(46, 96, 78, 88);   // bovenraam, onderraam
    doc.line(40, 92, 130, 92);                                        // tussenstijl
    doc.setLineWidth(0.3); doc.line(46, 36, 85, 88); doc.line(124, 36, 85, 88);   // draairichting
    doc.rect(190, 150, 95, 50); doc.setFontSize(9); doc.text('Project 999001 - Voorbeeld', 194, 158);
  };
  kozijn('A', 3);
  doc.addPage('a4', 'landscape'); kozijn('B', 1);
  doc.addPage('a4', 'landscape');
  doc.setFontSize(16); doc.text('Doorsnede', 14, 16);
  doc.setLineWidth(0.8); doc.rect(60, 60, 60, 30); doc.rect(140, 60, 40, 70); doc.line(60, 75, 120, 75);
  return Buffer.from(doc.output('arraybuffer'));
}
// houden: de rest van de database laten staan (onderdeel 2 gebruikt project 2,
// onderdeel 3 gaat verder met project 1 uit onderdeel 1).
function leegProject(n, houden) {
  if (!houden) resetDb(); else S.slot = {};
  const p = rijVan(n || 1);
  p.data.rijen = []; p.data.volgendId = 1; p.data.fotos = [];
  p.data.info = { leverInstructie: 'achterom, sleutel bij buren', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
  p.status = 'bezig met inmeten/verwerken';
}
async function importMaatstaat(page, buf) {
  await page.click('button:has-text("⬆ Importeren")');
  await page.click('.veld-menu button:has-text("Sponningmaten")');
  await page.setInputFiles('#impBestand', { name: 'SPONNINGMATEN_999001.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf || maatstaatXlsx() });
  await page.waitForSelector('#impStap2', { state: 'visible', timeout: 15000 });
  await importControleer(page);
  await page.click('#impToevoegen');
  await wacht(900);
}
// De tekening zoals Jan het doet: ⬆ Importeren → Tekening, het bestand kiezen
// (de bestandskiezer van de browser), pagina's aanvinken, Toevoegen.
async function importTekening(page, nummers) {
  const voor = await page.evaluate(() => werkFotos().length);
  await page.click('button:has-text("⬆ Importeren")');
  const [kiezer] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }),
    page.click('.veld-menu button:has-text("Tekening")')]);
  await kiezer.setFiles({ name: 'D999001.pdf', mimeType: 'application/pdf', buffer: tekeningPdf() });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('pdfKiezer')).display === 'flex', null, { timeout: 15000 });
  for (const n of nummers) await page.check('#pdfPaginas input[value="' + n + '"]');
  await page.click('#pdfKiezerKnop');
  await wachtTot(() => page.evaluate(([v, n]) => werkFotos().length === v + n && !glasFotoBezig(), [voor, nummers.length]), 20000);
  await wacht(600);
}
const fotoIds = page => page.evaluate(() => werkFotos().map(f => f.id));
const dbRijM = (merk, n) => (rijVan(n || 1).data.rijen || []).find(r => r.merk === merk) || {};
const dbWerk = n => (rijVan(n || 1).data.fotos || []).filter(f => f.soort !== 'lever');
// Per tekening het aantal bolletjes van een merk, in de database: [2, 1, 0].
const dbBol = (merk, n) => { const id = dbRijM(merk, n).id; return dbWerk(n).map(f => (f.markeringen || []).filter(m => m.rijId === id).length); };
const schermBol = (page, merk) => page.evaluate(m => { const r = rijen.find(x => x.merk === m);
  return werkFotos().map(f => (f.markeringen || []).filter(x => r && x.rijId === r.id).length); }, merk);
const blokVanM = (page, merk) => page.evaluate(m => (rijen.find(x => x.merk === m) || {}).fotoId || 'los', merk);
// Een tik of klik op de tekening, op een plek in verhoudingen. Eerst die plek
// midden in beeld (de gele balk staat onderin over de tekening heen), dan een
// echte aanraking of muisklik op die plek.
async function tik(page, fotoId, x, y, hoe) {
  const img = page.locator('#img-' + fotoId);
  await img.scrollIntoViewIfNeeded();
  let b = await img.boundingBox();
  const vh = page.viewportSize().height;
  await page.evaluate(d => window.scrollBy(0, d), Math.round(b.y + b.height * y - vh / 2));
  await wacht(250);
  b = await img.boundingBox();
  const px = b.x + b.width * x, py = b.y + b.height * y;
  if (hoe === 'vinger') await page.touchscreen.tap(px, py);
  else if (hoe === 'pen') {
    // Apple Pencil: een pen-aanwijzer (pointerType "pen") via het DevTools-protocol.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px, y: py, pointerType: 'pen' });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: px, y: py, button: 'left', clickCount: 1, pointerType: 'pen' });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: px, y: py, button: 'left', clickCount: 1, pointerType: 'pen' });
    await cdp.detach();
  } else await page.mouse.click(px, py);
  await wacht(450);
}
const balkTekst = (page, f) => page.$eval('#aanwijs-' + f, e => e.style.display === 'none' ? '' : e.innerText.replace(/\s+/g, ' ')).catch(() => '');
const keuzeLijst = (page, f) => page.$$eval('#aanwijs-' + f + ' .aanwijs-ruit', l => l.map(k => (k.querySelector('b') || {}).textContent + (k.classList.contains('nu') ? '*' : '')));
async function drukOp(page, loc, hoe) { await loc.scrollIntoViewIfNeeded(); if (hoe === 'vinger') await loc.tap(); else await loc.click(); await wacht(350); }
const kiesRuit = (page, f, merk, hoe) => drukOp(page, page.locator('#aanwijs-' + f + ' .aanwijs-ruit').filter({ has: page.locator('b', { hasText: new RegExp('^' + merk + '$') }) }), hoe);
const balkKnop = (page, f, tekst, hoe) => drukOp(page, page.locator('#aanwijs-' + f + ' button', { hasText: tekst }).first(), hoe);
const routeTekst = page => page.$eval('#aanwijsRoute', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
const verwijzing = (page, f) => page.$$eval('#tabel-' + f + ' .foto-elders .elders-knop', l => l.map(k => k.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
const telling = (page, f) => page.$eval('#blok-' + f + ' .blok-telling', e => e.textContent).catch(() => '');
const stappen = page => page.evaluate(() => undoStapels().terug.length);
// Het n-de bolletje (1, 2 …) van een merk op een foto aantikken en een knop in het menu.
async function bolKnop(page, fotoId, merk, n, tekst, hoe) {
  const idx = await page.evaluate(([f, m, n]) => {
    const r = rijen.find(x => x.merk === m); let k = 0;
    const lijst = werkFotos().find(x => x.id === f).markeringen;
    for (let i = 0; i < lijst.length; i++) if (lijst[i].rijId === r.id && ++k === n) return i;
    return -1;
  }, [fotoId, merk, n]);
  const bol = page.locator('#doek-' + fotoId + ' .foto-mark').nth(idx);
  await drukOp(page, bol, hoe);
  await page.waitForSelector('.mark-menu', { timeout: 3000 });
  await drukOp(page, page.locator('.mark-menu button', { hasText: tekst }).first(), hoe);
}
const tabelOngedaan = (page, f, hoe) => drukOp(page, page.locator('#tabel-' + f + ' .blok-bediening button:has-text("↶ Ongedaan")'), hoe);
const tabelOpnieuw = (page, f, hoe) => drukOp(page, page.locator('#tabel-' + f + ' .blok-bediening button:has-text("↷")'), hoe);
const rijIn = (page, merk) => page.evaluate(m => { const r = rijen.find(x => x.merk === m); const tr = r && document.getElementById('rij-' + r.id);
  const w = tr && tr.closest('.foto-tabelwrap, #blok-los'); return w ? w.id : ''; }, merk);
// Script 28 (glas_ids_fout) weigert een project met een nummer dat geen heel getal is.
const dbWeigert = d => {
  const nr = v => typeof v === 'number' && /^[0-9]{1,9}$/.test(String(v));
  if ((d.rijen || []).some(e => !e || !nr(e.id) || (e.fotoId != null && e.fotoId !== '' && !/^[A-Za-z0-9_-]{1,64}$/.test(String(e.fotoId))))) return 'ruit';
  if ((d.fotos || []).some(f => !/^[A-Za-z0-9_-]{1,64}$/.test(String(f.id)) || (f.markeringen || []).some(m => !nr(m.rijId)))) return 'foto';
  return null;
};
// Per pagina van een pdf: de bolletjes (oranje cirkels met hun letter).
function pdfBollenPerPagina(bestand) {
  const r = spawnSync('python3', ['-I', '-c', [
    'import sys,json,pdfplumber',
    'uit=[]',
    'with pdfplumber.open(sys.argv[1]) as p:',
    ' for pg in p.pages:',
    '  d=[]',
    '  for c in pg.curves:',
    '   k=c.get("non_stroking_color")',
    '   if k and len(k)==3 and abs(k[0]-240/255)<0.02 and abs(k[1]-165/255)<0.02 and abs(k[2])<0.02:',
    '    w=pg.within_bbox((c["x0"],c["top"],c["x1"],c["bottom"])).extract_text() or ""',
    '    d.append(w.strip())',
    '  uit.append(d)',
    'print(json.dumps(uit))'].join('\n'), bestand], { encoding: 'utf8' });
  try { return JSON.parse(r.stdout); } catch (e) { return [['[fout] ' + r.stderr]]; }
}
function pdfPlaatje(bestand, pagina, naam) {
  const doel = path.join(PLAATJES || werkMap, naam);
  spawnSync('pdftoppm', ['-f', String(pagina), '-l', String(pagina), '-r', '70', '-png', '-singlefile', bestand, doel]);
  return doel + '.png';
}
async function plaatje(page, naam) {
  if (!PLAATJES) return;
  await page.screenshot({ path: path.join(PLAATJES, 'v124-' + naam + '.png'), fullPage: false }).catch(() => {});
}
const TELEFOON = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
// Een project zoals na het aanwijzen, rechtstreeks in de database (voor de
// onderdelen die één ding toetsen): drie tekeningen met een echt plaatje.
const GEVEL_B64 = fs.readFileSync(path.join(__dirname, 'test-gevel.jpg')).toString('base64');
function tekeningProject(rijenLijst, bollen) {
  resetDb();
  const p = rijVan(1);
  p.data.rijen = rijenLijst;
  p.data.volgendId = rijenLijst.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  p.data.fotos = ['t1', 't2', 't3'].map((id, i) => {
    const pad = P(1) + '/tek-' + id + '.jpg';
    S.opslag.set(pad, { grootte: 1000, type: 'image/jpeg', b64: GEVEL_B64 });
    return { id: id, pad: pad, titel: 'D999001 — pagina ' + (i + 1), bron: 'tekening', breedte: 800, hoogte: 600, inkt: [],
             markeringen: (bollen[id] || []).map(([rijId, x, y]) => ({ rijId: rijId, x: x, y: y })) };
  });
  p.data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
  p.status = 'bezig met inmeten/verwerken';
}
async function projectOpen(opties, naam, n) {
  const r = await apparaat(opties, naam, n || 1);
  await r.page.waitForFunction(() => werkFotos().every(f => !f.pad || document.getElementById('img-' + f.id)), null, { timeout: 15000 }).catch(() => {});
  await wacht(400);
  return r;
}

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, t, u, v, T;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Kantoor (pc): eerst de maatstaat, dan de pdf van 3 pagina\'s → de route');
    leegProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await importMaatstaat(page);
    await sluitMeldingen(page);
    check('vier regels uit de maatstaat, als één ruit per regel: A1 3×976×572, A2 3×977×1079, B1, B2', await opgeslagenAls(() =>
      dbRijM('A1').aantal == 3 && dbRijM('A1').breedte == 976 && dbRijM('A2').aantal == 3 && dbRijM('A2').hoogte == 1079 &&
      dbRijM('B1').aantal == 1 && dbRijM('B2').hoogte == 1094), JSON.stringify(ruitenDb().map(r => [r.merk, r.aantal, r.breedte, r.hoogte])));
    check('… nog zonder tekening (bij de losse maten), en geen route zonder tekeningen', ruitenDb().every(r => !r.fotoId) && !(await routeTekst(page)));
    await importTekening(page, [1, 2, 3]);
    T = await fotoIds(page);
    check('drie tekeningen, elk een eigen blok', T.length === 3 && await opgeslagenAls(() => dbWerk().length === 3 &&
      dbWerk().every(f => f.bron === 'tekening' && f.pad)), JSON.stringify(dbWerk().map(f => f.titel)));
    t = await routeTekst(page);
    check('bovenaan de route: "Wijs de ruiten aan op de tekeningen", nog 8 ruiten zonder plek, drie knoppen',
      /Wijs de ruiten aan op de tekeningen/.test(t) && /nog 8 ruiten zonder plek/.test(t) &&
      await page.locator('#aanwijsRoute .ar-stap').count() === 3, t);
    check('… de route staat in beeld (bovenaan)', await page.locator('#aanwijsRoute').isVisible());
    await plaatje(page, '1-route-pc');
    // Op elke tekening is nu aanwijzen te kiezen, met alle 8 ruiten van het project.
    t = await page.$$eval('.foto-voet button', l => l.map(b => b.textContent).filter(x => /aanwijzen/.test(x)));
    check('op elke tekening "🎯 Ruiten aanwijzen (8)"', t.length === 3 && t.every(x => /\(8\)/.test(x)), JSON.stringify(t));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Andere volgorde: eerst de pdf, dan de maatstaat; de route met ✕ dicht en later nog een import');
    leegProject(2, true);
    ({ ctx, page } = await apparaat(null, 'pc', 2));
    await importTekening(page, [1, 2]);
    check('na alleen de pdf: twee tekeningen, nog geen ruiten, dus geen route', !(await routeTekst(page)));
    await importMaatstaat(page);
    await sluitMeldingen(page);
    t = await routeTekst(page);
    check('na de maatstaat: de route, nog 8 ruiten zonder plek, twee knoppen', /nog 8 ruiten zonder plek/.test(t) &&
      await page.locator('#aanwijsRoute .ar-stap').count() === 2, t);
    await page.click('#aanwijsRoute .sluit-x');
    await wacht(300);
    check('✕ sluit de route (en hij komt niet vanzelf terug bij het volgende tekenen)', !(await routeTekst(page)) &&
      await page.evaluate(() => { renderFotos(); return !document.getElementById('aanwijsRoute'); }));
    // Nog een maatstaat erbij (een aanvulling van de kozijnfabriek): de route is er weer.
    await importMaatstaat(page);
    if ((await meldingen(page)).some(x => /Merk bestaat al/.test(x))) await knop(page, 'Alleen de nieuwe nummeren');
    await wacht(600);
    await sluitMeldingen(page);
    t = await routeTekst(page);
    check('na een volgende import: de route komt terug (nu 16 ruiten zonder plek)', /nog 16 ruiten zonder plek/.test(t), t);
    // En na ✕ een tekening erbij (de doorsnede toch nog): ook dan weer de route.
    await page.click('#aanwijsRoute .sluit-x');
    await wacht(300);
    await importTekening(page, [3]);
    t = await routeTekst(page);
    check('na ✕ en een tekening erbij: de route is er weer, met drie knoppen', /nog 16 ruiten zonder plek/.test(t) &&
      await page.locator('#aanwijsRoute .ar-stap').count() === 3, t);
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Op de bouw (iPad, vinger en Pencil): aanwijzen op tekening 1 en 2, één ruit verdeeld, ↶, herladen');
    // Vervolg op 1 (de stand in de database). Kantoor heeft het project
    // gesloten (terug naar het startscherm geeft het bewerkslot vrij).
    S.slot = {};
    ({ ctx, page } = await projectOpen(Object.assign({}, IPAD), 'ipad', 1));
    T = await fotoIds(page);
    t = await routeTekst(page);
    check('bij het openen op de iPad staat de route er ook (de werkvloer opent wat kantoor inlas)', /nog 8 ruiten zonder plek/.test(t), t);
    await drukOp(page, page.locator('#aanwijsRoute .ar-stap').first(), 'vinger');
    t = await balkTekst(page, T[0]);
    check('tik op "1": de gele balk op tekening 1, eerst A1 (976 × 572), ruit 1 van 3', /^A1 Tik op de tekening waar deze ruit zit \(976 × 572\) — ruit 1 van 3 · nog 8 te gaan/.test(t), t);
    u = await keuzeLijst(page, T[0]);
    check('… met de keuze uit alle ruiten van het project: A1 (nu), A2, B1, B2', JSON.stringify(u) === '["A1*","A2","B1","B2"]', JSON.stringify(u));
    const s0 = await stappen(page);
    await balkKnop(page, T[0], 'Alle 3 op één plek', 'vinger');
    check('"Alle 3 op één plek" staat aan', /alle 3 ruiten A1 komen op die plek/.test(await balkTekst(page, T[0])), await balkTekst(page, T[0]));
    await tik(page, T[0], 0.3, 0.3, 'vinger');
    check('één tik: A1 heeft 3 bolletjes op tekening 1 en staat in dat blok (één stap voor ↶)', await opgeslagenAls(() =>
      JSON.stringify(dbBol('A1')) === '[3,0,0]' && dbRijM('A1').fotoId === T[0]) && await stappen(page) === s0 + 1,
      JSON.stringify(dbBol('A1')) + ' ' + dbRijM('A1').fotoId + ' stappen ' + (await stappen(page) - s0));
    check('… het aanwijzen veranderde geen aantal (A1 blijft 3)', dbRijM('A1').aantal == 3);
    t = await balkTekst(page, T[0]);
    check('daarna vraagt de balk A2 (977 × 1079), ruit 1 van 3', /^A2 .*\(977 × 1079\) — ruit 1 van 3 · nog 5 te gaan/.test(t), t);
    await tik(page, T[0], 0.3, 0.6, 'vinger');
    await tik(page, T[0], 0.34, 0.6, 'pen');
    u = await page.evaluate(() => window.__laatstePen || '');
    check('twee ruiten A2 op tekening 1 (één met de vinger, één met de Pencil)', await opgeslagenAls(() => JSON.stringify(dbBol('A2')) === '[2,0,0]'),
      JSON.stringify(dbBol('A2')));
    check('… de Pencil kwam echt als pen binnen (pointerType "pen")', u === 'pen', u);
    check('in de balk op tekening 1 staat "Volgende tekening →"', /Volgende tekening →/.test(await balkTekst(page, T[0])), await balkTekst(page, T[0]));
    await balkKnop(page, T[0], 'Volgende tekening', 'vinger');
    t = await balkTekst(page, T[1]);
    u = await keuzeLijst(page, T[1]);
    check('"Volgende tekening →": de balk op tekening 2, eerst de losse (B1, B2), dan A2 van tekening 1', /^B1 /.test(t) &&
      JSON.stringify(u) === '["B1*","B2","A2"]' && !(await balkTekst(page, T[0])), t + ' ' + JSON.stringify(u));
    await kiesRuit(page, T[1], 'A2', 'vinger');
    t = await balkTekst(page, T[1]);
    check('tik op A2 in de balk: A2 is aan de beurt, ruit 3 van 3, "staat nu bij tekening 1"', /^A2 .*ruit 3 van 3 · staat nu bij tekening 1/.test(t), t);
    await tik(page, T[1], 0.3, 0.6, 'vinger');
    check('A2: 2 op tekening 1 en 1 op tekening 2; de ruit blijft bij tekening 1 (de meeste)', await opgeslagenAls(() =>
      JSON.stringify(dbBol('A2')) === '[2,1,0]' && dbRijM('A2').fotoId === T[0]), JSON.stringify(dbBol('A2')) + ' ' + dbRijM('A2').fotoId);
    check('… samen precies het aantal (3), en nog steeds één regel A2', dbBol('A2').reduce((a, b) => a + b) === 3 &&
      ruitenDb().filter(r => r.merk === 'A2').length === 1);
    await tik(page, T[1], 0.3, 0.3, 'vinger');
    await tik(page, T[1], 0.3, 0.7, 'vinger');
    check('B1 en B2 op tekening 2, in het blok van tekening 2', await opgeslagenAls(() =>
      JSON.stringify(dbBol('B1')) === '[0,1,0]' && dbRijM('B1').fotoId === T[1] && dbRijM('B2').fotoId === T[1]));
    check('alles heeft een plek: de gele balk is weg, de route zegt "alle ruiten hebben een plek"',
      !(await balkTekst(page, T[1])) && /alle ruiten hebben een plek/.test(await routeTekst(page)), await routeTekst(page));
    u = await verwijzing(page, T[1]);
    check('onder tekening 2: "A2 ×1 hier, staat bij tekening 1 →"', JSON.stringify(u) === '["A2 ×1 hier, staat bij tekening 1 →"]', JSON.stringify(u));
    u = await verwijzing(page, T[0]);
    check('onder tekening 1: "A2 ook ×1 op tekening 2 →"', JSON.stringify(u) === '["A2 ook ×1 op tekening 2 →"]', JSON.stringify(u));
    check('de telling van tekening 2: "2 ruiten · 1 van elders"', await telling(page, T[1]) === '2 ruiten · 1 van elders', await telling(page, T[1]));
    check('A2 staat in de tabel van tekening 1, B1 en B2 in die van tekening 2', await rijIn(page, 'A2') === 'tabel-' + T[0] &&
      await rijIn(page, 'B1') === 'tabel-' + T[1] && await rijIn(page, 'B2') === 'tabel-' + T[1]);
    await drukOp(page, page.locator('#tabel-' + T[1] + ' .elders-knop').first(), 'vinger');
    await wacht(600);
    u = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'A2'); const tr = document.getElementById('rij-' + r.id);
      const b = tr.getBoundingClientRect(); return { licht: tr.classList.contains('gemarkeerd'), inBeeld: b.top >= 0 && b.bottom <= innerHeight }; });
    check('tik op de verwijzing: naar de regel A2 bij tekening 1 (in beeld, licht op)', u.licht && u.inBeeld, JSON.stringify(u));
    await plaatje(page, '3-ipad-verwijzing');
    // Een bolletje van A2 weghalen op tekening 1: gelijk (1 en 1) = de eerste
    // tekening; nog één weg = alles op tekening 2, dus de ruit verhuist.
    await bolKnop(page, T[0], 'A2', 2, 'Alleen het bolletje weghalen', 'vinger');
    check('één bolletje van A2 weg op tekening 1: 1 en 1, gelijk → blijft bij tekening 1 (de eerste)', await opgeslagenAls(() =>
      JSON.stringify(dbBol('A2')) === '[1,1,0]' && dbRijM('A2').fotoId === T[0]), JSON.stringify(dbBol('A2')) + ' ' + dbRijM('A2').fotoId);
    await bolKnop(page, T[0], 'A2', 1, 'Alleen het bolletje weghalen', 'vinger');
    check('het tweede weg: A2 staat alleen nog op tekening 2 en verhuist naar dat blok', await opgeslagenAls(() =>
      JSON.stringify(dbBol('A2')) === '[0,1,0]' && dbRijM('A2').fotoId === T[1]), JSON.stringify(dbBol('A2')) + ' ' + dbRijM('A2').fotoId);
    check('… het aantal bleef 3 (de strook zegt: nog 2 aan te wijzen), in de tabel van tekening 2', dbRijM('A2').aantal == 3 &&
      /A2: aantal 3, één bolletje op de foto: nog 2 aan te wijzen/.test(await page.$eval('#tabel-' + T[1], e => e.innerText.replace(/\s+/g, ' '))) &&
      await rijIn(page, 'A2') === 'tabel-' + T[1]);
    // ↶ in de tabel van tekening 1 (een iPad heeft geen Cmd+Z): het bolletje
    // komt terug en de ruit ook.
    await tabelOngedaan(page, T[0], 'vinger');
    check('↶ in de tabel van tekening 1: het bolletje is terug en A2 staat weer bij tekening 1', await opgeslagenAls(() =>
      JSON.stringify(dbBol('A2')) === '[1,1,0]' && dbRijM('A2').fotoId === T[0]), JSON.stringify(dbBol('A2')) + ' ' + dbRijM('A2').fotoId);
    await tabelOngedaan(page, T[0], 'vinger');
    check('nog eens ↶: ook het eerste bolletje terug (2 en 1, bij tekening 1)', await opgeslagenAls(() =>
      JSON.stringify(dbBol('A2')) === '[2,1,0]' && dbRijM('A2').fotoId === T[0]), JSON.stringify(dbBol('A2')) + ' ' + dbRijM('A2').fotoId);
    check('… niets dubbel of kwijt: 4 regels, elk nummer één keer', await page.evaluate(() => {
      const ids = rijen.filter(r => r.merk).map(r => r.id); return ids.length === 4 && new Set(ids).size === 4; }));
    // Herladen midden in het werk: alles staat er nog, ook de verwijzing.
    await page.reload();
    await page.waitForFunction(() => window.glasProjectId && werkFotos().length === 3, null, { timeout: 15000 });
    await wacht(1200);
    check('na herladen: dezelfde bolletjes en blokken', JSON.stringify(await schermBol(page, 'A2')) === '[2,1,0]' &&
      await blokVanM(page, 'A2') === T[0] && await blokVanM(page, 'B1') === T[1]);
    check('… en de verwijzing onder tekening 2', JSON.stringify(await verwijzing(page, T[1])) === '["A2 ×1 hier, staat bij tekening 1 →"]');
    check('… alles heeft een plek, dus geen route meer bij het openen', !(await routeTekst(page)));
    check('nummers zoals script 28 ze wil (heel getal, ook in de bolletjes)', !dbWeigert(rijVan(1).data) &&
      dbWerk().every(f => (f.markeringen || []).every(m => Number.isInteger(m.rijId))), dbWeigert(rijVan(1).data));
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Een tweede apparaat ziet hetzelfde; wie alleen kijkt, kan niet aanwijzen');
    // Vervolg op 1 en 3.
    S.slot = {};
    let pc, ph;
    ({ ctx: pc, page } = await projectOpen(null, 'pc', 1));
    T = await fotoIds(page);
    check('de pc ziet dezelfde bolletjes en blokken (A2 bij tekening 1, 2 + 1)', JSON.stringify(await schermBol(page, 'A2')) === '[2,1,0]' &&
      await rijIn(page, 'A2') === 'tabel-' + T[0] && await rijIn(page, 'B2') === 'tabel-' + T[1]);
    check('… en de verwijzing onder tekening 2', JSON.stringify(await verwijzing(page, T[1])) === '["A2 ×1 hier, staat bij tekening 1 →"]');
    // De telefoon opent hetzelfde project terwijl de pc het open heeft: alleen kijken.
    ({ ctx: ph, page: v } = await projectOpen(Object.assign({}, TELEFOON), 'telefoon', 1));
    await wachtTot(() => v.evaluate(() => window.glasAlleenKijken && glasAlleenKijken()), 8000);
    check('de telefoon kijkt alleen mee', await v.evaluate(() => glasAlleenKijken()));
    // Een ruit zonder plek erbij (op de pc), zodat aanwijzen iets zou kunnen.
    await page.evaluate(() => { bewaarStap('erbij'); const r = nieuweRij(); Object.assign(r, { merk: 'D', breedte: '500', hoogte: '500' }); rijen.push(r); renderTabel(); opslaan(); });
    await wachtTot(() => v.evaluate(() => rijen.some(r => r.merk === 'D')), 10000);
    check('alleen kijken: geen route, geen 🎯 (knoppen dicht)', !(await routeTekst(v)) &&
      await v.$$eval('.foto-voet button', l => l.filter(b => /aanwijzen/.test(b.textContent)).every(b => b.disabled)));
    await v.evaluate(id => window.fotoAanwijzen(id), T[0]);
    await wacht(400);
    check('… ook rechtstreeks: aanwijzen wordt geweigerd (melding "Alleen kijken"), geen gele balk', (await meldingen(v)).some(x => /alleen kijken/i.test(x)) &&
      !(await balkTekst(v, T[0])), (await meldingen(v)).join(' | '));
    await sluitMeldingen(v);
    const nRij = await v.evaluate(() => rijen.length);
    await tik(v, T[0], 0.6, 0.5, 'vinger');
    check('… een tik op de tekening maakt geen ruit', await v.evaluate(() => rijen.length) === nRij);
    await sluitMeldingen(v);
    check('de verwijzing werkt wel (alleen kijken): niet dicht', await v.$eval('#tabel-' + T[1] + ' .elders-knop', b => !b.disabled));
    await ph.close();
    await page.evaluate(() => { bewaarStap('weg'); rijen = rijen.filter(r => r.merk !== 'D'); renderTabel(); opslaan(); });
    await opgeslagenAls(() => !dbRijM('D').id);
    await pc.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Bestellen: één regel per ruit, pdf invoer per tekening, slot, verhuizen na de bestelling');
    // Vervolg op 1 en 3: glastype erbij (kantoor), dan bestellen.
    S.slot = {};
    ({ ctx, page } = await projectOpen(null, 'pc', 1));
    T = await fotoIds(page);
    await typ(page, "rijen.forEach(r => { if (r.merk) Object.assign(r, { glasType: 'HR++ glas', opbouw: '4-15-4' }); }); herbereken(); renderTabel();");
    u = await page.evaluate(() => { const m = bestellijstModel(); const im = m.kolommen.indexOf('Merk'), ia = m.kolommen.indexOf('Aantal');
      return m.regels.map(g => [String(g.cellen[im]), String(g.cellen[ia])]); });
    check('de bestellijst: vier regels, A2 één regel ×3 (niet per tekening gesplitst)', u.length === 4 &&
      JSON.stringify(u.map(x => x[0]).sort()) === '["A1","A2","B1","B2"]' && (u.find(x => x[0] === 'A2') || [])[1] === '3', JSON.stringify(u));
    // Sinds de samenvoeging van v124 leest de import ook "Max incl. band" (28 mm);
    // 4-15-4 + band is 29, dus de vraag "Past het in de sponning?" (hier: toch doorgaan).
    check('de maatstaat gaf het max glaspakket mee (28 mm)', dbRijM('A1').maxPakket == 28, JSON.stringify(dbRijM('A1').maxPakket));
    const b = await bestel(page, Object.assign({}, ONVOLLEDIG, { 'Past het in de sponning?': 'Toch doorgaan' }));
    check('besteld (Ja, verstuurd): status besteld, één bestelling', b.verstuurd && await opgeslagenAls(() =>
      rijVan(1).status === 'besteld' && bestellingenDb().length === 1));
    check('… op de pdf staat A2 één keer, met 3 stuks', (b.tekst.match(/\bA2\b/g) || []).length === 1 && /\b3 A2\b/.test(b.tekst), b.tekst.replace(/\s+/g, ' ').slice(0, 160));
    // De pdf invoer (archief), lezen en bekijken.
    const pi = await bestellijstPdf(page, ONVOLLEDIG, 'PDF invoer');
    const pag = pdfPaginas(pi), bol = pdfBollenPerPagina(pi);
    const p1 = pag.findIndex(x => /Foto 1 . D999001/.test(x)), p2 = pag.findIndex(x => /Foto 2 . D999001/.test(x));
    check('pdf invoer: tekening 1 met A1 ×3 en A2 ×2 als bolletjes', p1 >= 0 && JSON.stringify(telLetters((bol[p1] || []).slice().sort())) === '{"A1":3,"A2":2}',
      JSON.stringify(bol.map(telLetters)));
    check('… tekening 2 met B1, B2 en A2 ×1 (samen precies 3 × A2 op papier)', p2 >= 0 && JSON.stringify(telLetters((bol[p2] || []).slice().sort())) === '{"A2":1,"B1":1,"B2":1}', JSON.stringify(bol[p2]));
    check('… onder tekening 2: "Ook op deze tekening: A2 x1 hier (de regel staat bij Foto 1)"',
      /Ook op deze tekening: A2 x1 hier \(de regel staat bij Foto 1\)/.test((pag[p2] || '').replace(/\s+/g, ' ')), (pag[p2] || '').replace(/\s+/g, ' ').slice(-160));
    check('… onder tekening 1: "Verdeeld: A2 ook x1 op Foto 2.", en de regel A2 in de tabel van tekening 1', /Verdeeld: A2 ook x1 op Foto 2\./.test((pag[p1] || '').replace(/\s+/g, ' ')) &&
      /\bA2\b/.test(pag[p1] || ''), (pag[p1] || '').replace(/\s+/g, ' ').slice(-160));
    if (PLAATJES) { pdfPlaatje(pi, p2 + 1, 'v124-6-pdf-invoer-tekening2'); pdfPlaatje(pi, p1 + 1, 'v124-6-pdf-invoer-tekening1'); }
    // Op slot: geen route, geen aanwijzen.
    check('na de bestelling op slot: geen route, aanwijzen geweigerd', await page.evaluate(() => invoerOpSlot()) && !(await routeTekst(page)));
    await page.evaluate(id => window.aanwijsOpTekening(id), T[1]);
    await wacht(300);
    check('… "Op slot" en geen gele balk', (await meldingen(page)).some(x => /Op slot/.test(x)) && !(await balkTekst(page, T[1])));
    await sluitMeldingen(page);
    // Ontgrendelen en A2 verhuizen naar tekening 2 (bolletjes weg op 1, erbij op 2):
    // alleen het blok verandert, dus geen "gewijzigd na bestelling".
    await ontgrendel(page);
    const k0 = await page.evaluate(() => ruitKenmerk(rijen.find(r => r.merk === 'A2')));
    const gm0 = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'A2'); return [r.glasBreedte, r.glasHoogte]; });
    await bolKnop(page, T[0], 'A2', 2, 'Alleen het bolletje weghalen');
    await bolKnop(page, T[0], 'A2', 1, 'Alleen het bolletje weghalen');
    await page.click('#tabel-' + T[1] + ' .foto-scheef button:has-text("Aanwijzen")');
    await wacht(300);
    await tik(page, T[1], 0.32, 0.62);
    await tik(page, T[1], 0.36, 0.62);
    check('A2 staat nu met 3 bolletjes op tekening 2, in dat blok', await opgeslagenAls(() =>
      JSON.stringify(dbBol('A2')) === '[0,3,0]' && dbRijM('A2').fotoId === T[1]), JSON.stringify(dbBol('A2')));
    u = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'A2'); const tb = teBestellen();
      return { k: ruitKenmerk(r), gw: naBestellingGewijzigd(r), regels: tb.regels.length, verschil: !document.getElementById('bestelVerschil').hidden,
               geel: document.querySelector('#rij-' + r.id + ' td.rijnr').classList.contains('na-bestelling'), gm: [r.glasBreedte, r.glasHoogte] }; });
    check('… geen "gewijzigd na bestelling": zelfde kenmerk, niets te bestellen, geen gele markering, geen balk', u.k === k0 && !u.gw &&
      u.regels === 0 && !u.verschil && !u.geel, JSON.stringify(u) + ' k0 ' + k0);
    check('… en dezelfde glasmaat', JSON.stringify(u.gm) === JSON.stringify(gm0), JSON.stringify(u.gm) + ' / ' + JSON.stringify(gm0));
    await page.click('#slotBalk button:has-text("Weer vastzetten")').catch(() => {});
    await wacht(400);
    check('nummers zoals script 28 ze wil', !dbWeigert(rijVan(1).data), dbWeigert(rijVan(1).data));
    await ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Een tik op een andere tekening, ↶ en ↷ per tabel bij een verhuizing (pc, muis)');
    // A1 ×3: 2 op tekening 1, 1 op tekening 2 (staat bij 1). B ×1 nog los, C ×4: 1 op t1, 2 op t2.
    const K = Object.assign({}, KOMPLEET, INGEMETEN);
    tekeningProject([ruit(1, 'A1', '976', '572', Object.assign({ aantal: 3, fotoId: 't1' }, K)), ruit(2, 'B', '988', '572', K),
                     ruit(3, 'C', '700', '700', Object.assign({ aantal: 4, fotoId: 't2' }, K))],
      { t1: [[1, 0.3, 0.3], [1, 0.35, 0.3], [3, 0.8, 0.8]], t2: [[1, 0.3, 0.3], [3, 0.5, 0.5], [3, 0.55, 0.5]] });
    ({ ctx, page } = await projectOpen(null, 'pc', 1));
    t = await page.$eval('#tabel-t2', e => (e.querySelector('.foto-scheef') || {}).innerText || '');
    check('de strook "nog aan te wijzen" van C (1 + 2 van 4) staat bij tekening 2, waar C thuishoort, niet bij 1',
      /C: aantal 4, 3 bolletjes op 2 tekeningen: nog 1 aan te wijzen/.test(t.replace(/\s+/g, ' ')) &&
      !(await page.$eval('#tabel-t1', e => !!e.querySelector('.foto-scheef'))), t);
    await page.click('#tabel-t1 .foto-voet button:has-text("Ruiten aanwijzen")');
    await wacht(300);
    t = await balkTekst(page, 't1');
    check('🎯 op tekening 1: eerst B (los), ook C (van tekening 2) is te kiezen', /^B /.test(t) && JSON.stringify(await keuzeLijst(page, 't1')) === '["B*","C"]',
      t + ' ' + JSON.stringify(await keuzeLijst(page, 't1')));
    const n0 = await page.evaluate(() => rijen.length);
    await tik(page, 't2', 0.7, 0.3);
    check('een klik op tekening 2 tijdens het aanwijzen: B staat op tekening 2 (geen nieuwe ruit met een nieuwe letter)', await opgeslagenAls(() =>
      JSON.stringify(dbBol('B')) === '[0,1,0]' && dbRijM('B').fotoId === 't2') && await page.evaluate(() => rijen.length) === n0,
      JSON.stringify(dbBol('B')) + ' ' + (await page.evaluate(() => rijen.map(r => r.merk))));
    check('… de gele balk ging mee naar tekening 2 (nu C)', /^C /.test(await balkTekst(page, 't2')) && !(await balkTekst(page, 't1')));
    await balkKnop(page, 't2', 'Klaar');
    // ↶ in de tabel van tekening 2: B gaat terug naar de losse maten (tot v123
    // was hij dan weg, met zijn maten); het bolletje van A1 op 2 blijft.
    await tabelOngedaan(page, 't2');
    check('↶ in de tabel van tekening 2: B staat weer bij de losse maten, met zijn maat, zonder bolletje', await opgeslagenAls(() =>
      dbRijM('B').breedte === '988' && !dbRijM('B').fotoId && JSON.stringify(dbBol('B')) === '[0,0,0]'),
      JSON.stringify(dbRijM('B')) + ' ' + JSON.stringify(dbBol('B')));
    check('… A1 houdt zijn bolletje op tekening 2 (2 + 1) en C zijn 1 + 2', JSON.stringify(dbBol('A1')) === '[2,1,0]' &&
      JSON.stringify(dbBol('C')) === '[1,2,0]' && dbRijM('A1').fotoId === 't1', JSON.stringify(dbBol('A1')) + ' ' + JSON.stringify(dbBol('C')));
    check('… niets dubbel: elke ruit één keer', await page.evaluate(() => { const ids = rijen.filter(r => r.merk).map(r => r.id);
      return ids.length === 3 && new Set(ids).size === 3; }));
    await tabelOpnieuw(page, 't2');
    check('↷ in de tabel van tekening 2: B weer op tekening 2, met zijn bolletje', await opgeslagenAls(() =>
      dbRijM('B').fotoId === 't2' && JSON.stringify(dbBol('B')) === '[0,1,0]'), JSON.stringify(dbRijM('B').fotoId) + ' ' + JSON.stringify(dbBol('B')));
    // Een vreemd bolletje (A1 op tekening 2) neerzetten en ↶ in die tabel: alleen dat bolletje weg.
    await page.click('#tabel-t2 .foto-scheef button:has-text("Aanwijzen")');
    await wacht(300);
    await tik(page, 't2', 0.9, 0.9);
    check('C\'s laatste ruit op tekening 2 aangewezen (1 + 3)', await opgeslagenAls(() => JSON.stringify(dbBol('C')) === '[1,3,0]'));
    await tabelOngedaan(page, 't2');
    check('↶ in tabel 2: alleen dat bolletje weg (C 1 + 2), B en A1 ongemoeid', await opgeslagenAls(() =>
      JSON.stringify(dbBol('C')) === '[1,2,0]' && JSON.stringify(dbBol('B')) === '[0,1,0]' && JSON.stringify(dbBol('A1')) === '[2,1,0]'),
      JSON.stringify([dbBol('A1'), dbBol('B'), dbBol('C')]));
    await ctx.close();
    // Een ruit die in deze tabel kwam en daarna nog elders veranderde: ↶ in
    // deze tabel tot vóór de verhuizing laat hem staan (nooit weg).
    tekeningProject([ruit(1, 'D', '600', '600', Object.assign({ aantal: 3 }, K))], {});
    ({ ctx, page } = await projectOpen(null, 'pc', 1));
    await page.click('#tabel-t2 .foto-voet button:has-text("Ruiten aanwijzen")');
    await wacht(300);
    await tik(page, 't2', 0.3, 0.3);
    await tik(page, 't2', 0.4, 0.3);
    await tik(page, 't1', 0.5, 0.5);
    check('D: 2 op tekening 2 (staat daar), 1 op tekening 1', await opgeslagenAls(() => JSON.stringify(dbBol('D')) === '[1,2,0]' && dbRijM('D').fotoId === 't2'),
      JSON.stringify(dbBol('D')) + ' ' + dbRijM('D').fotoId);
    await tabelOngedaan(page, 't2');
    await tabelOngedaan(page, 't2');
    u = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'D'); return r ? { blok: r.fotoId || 'los', b: r.breedte,
      bol: werkFotos().map(f => f.markeringen.filter(m => m.rijId === r.id).length) } : null; });
    check('twee keer ↶ in tabel 2 (tot vóór D er kwam; D kreeg daarna nog een bolletje op 1): D is er nog, met zijn maat en bolletjes',
      u && u.b === '600' && u.bol[0] === 1 && u.bol[1] >= 1, JSON.stringify(u));
    await ctx.close();
    // Samen met het herstel van de stapel (↶ per tabel herschrijft de stappen
    // erboven): een verhuizing, daarna iets in een ándere tabel, dan ↶ in de
    // eerste tabel en Cmd+Z. De verhuisde ruit mag daarna niet terug
    // verhuizen en nooit dubbel staan.
    tekeningProject([ruit(1, 'E', '700', '500', Object.assign({ aantal: 2, fotoId: 't1' }, K)), ruit(2, 'L', '400', '400', K), ruit(3, 'M', '450', '450', K)],
      { t1: [[1, 0.3, 0.3]], t2: [[1, 0.6, 0.6]] });
    ({ ctx, page } = await projectOpen(null, 'pc', 1));
    await bolKnop(page, 't1', 'E', 1, 'Alleen het bolletje weghalen');
    check('E: bolletje op tekening 1 weg, dus E verhuist naar tekening 2', await opgeslagenAls(() =>
      JSON.stringify(dbBol('E')) === '[0,1,0]' && dbRijM('E').fotoId === 't2'), JSON.stringify(dbBol('E')) + ' ' + dbRijM('E').fotoId);
    await vul(page, 'L', 'opm-input', 'los erbij');
    check('daarna in de losse maten een opmerking bij L', await opgeslagenAls(() => dbRijM('L').opmerking === 'los erbij'));
    await tabelOngedaan(page, 't1');
    check('↶ in de tabel van tekening 1: E terug bij tekening 1, met zijn bolletje; L houdt zijn opmerking', await opgeslagenAls(() =>
      JSON.stringify(dbBol('E')) === '[1,1,0]' && dbRijM('E').fotoId === 't1' && dbRijM('L').opmerking === 'los erbij'),
      JSON.stringify(dbBol('E')) + ' ' + dbRijM('E').fotoId + ' ' + dbRijM('L').opmerking);
    const labels = await page.evaluate(() => undoStapels().terug.map(x => { const st = JSON.parse(x.staat);
      const e = st.rijen.find(r => r.merk === 'E'), l = st.rijen.find(r => r.merk === 'L');
      return x.label + '[E ' + (e && e.fotoId) + ' L ' + (l && l.opmerking) + ']'; }));
    await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    await page.keyboard.press('Control+z');
    await wacht(600);
    u = await page.evaluate(() => { const e = rijen.filter(r => r.merk === 'E'); return { n: e.length, blok: e[0] && e[0].fotoId,
      bol: werkFotos().map(f => f.markeringen.filter(m => e[0] && m.rijId === e[0].id).length), l: (rijen.find(r => r.merk === 'L') || {}).opmerking }; });
    check('Cmd+Z daarna: de opmerking van L is terug weg, en E blijft bij tekening 1 (1 + 1), één keer', u.n === 1 && u.blok === 't1' &&
      JSON.stringify(u.bol) === '[1,1,0]' && !u.l, JSON.stringify(u) + ' stappen: ' + labels.join(' / '));
    await tabelOngedaan(page, 't2');
    u = await page.evaluate(() => { const e = rijen.filter(r => r.merk === 'E'); return { n: e.length, blok: e[0] && e[0].fotoId,
      bol: werkFotos().map(f => f.markeringen.filter(m => e[0] && m.rijId === e[0].id).length) }; });
    check('… en ↶ in de tabel van tekening 2 zet de verhuizing ook niet terug', u.n === 1 && u.blok === 't1' && JSON.stringify(u.bol) === '[1,1,0]', JSON.stringify(u));
    // Het bolletje van E op tekening 2 hoort bij de tabel van tekening 2,
    // maar E staat bij tekening 1. ↶ in tabel 2 herschrijft de stappen
    // erboven; daarna mag Cmd+Z dat bolletje niet kwijtraken.
    await page.click('#tabel-t2 .foto-voet button:has-text("Ruiten aanwijzen")');
    await wacht(300);
    await kiesRuit(page, 't2', 'L');
    await tik(page, 't2', 0.8, 0.2);
    await balkKnop(page, 't2', 'Klaar');
    check('L op tekening 2 aangewezen (staat daar nu)', await opgeslagenAls(() => dbRijM('L').fotoId === 't2'));
    await vul(page, 'M', 'opm-input', 'nog los');
    await tabelOngedaan(page, 't2');
    check('↶ in tabel 2: L weer los, E houdt zijn bolletje op tekening 2', await opgeslagenAls(() => !dbRijM('L').fotoId &&
      JSON.stringify(dbBol('E')) === '[1,1,0]' && dbRijM('M').opmerking === 'nog los'), JSON.stringify([dbRijM('L').fotoId, dbBol('E'), dbRijM('M').opmerking]));
    await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    await page.keyboard.press('Control+z');
    await wacht(600);
    u = await page.evaluate(() => { const e = rijen.find(r => r.merk === 'E'); return { m: (rijen.find(r => r.merk === 'M') || {}).opmerking,
      l: (rijen.find(r => r.merk === 'L') || {}).fotoId || 'los', bol: werkFotos().map(f => f.markeringen.filter(x => x.rijId === e.id).length),
      n: rijen.filter(r => r.merk).length }; });
    check('Cmd+Z daarna: de opmerking van M weg, L blijft los, E houdt 1 + 1 bolletje (niets kwijt, niets dubbel)', !u.m && u.l === 'los' &&
      JSON.stringify(u.bol) === '[1,1,0]' && u.n === 3, JSON.stringify(u));
    await ctx.close();
    // Review R6: E verhuist naar tekening 2 en wordt daarna nog gewijzigd (de
    // breedte). ↶ in de tabel van tekening 1 kan E niet terugzetten; daarna
    // twee keer Cmd+Z: E mag nooit uit het project verdwijnen.
    const ruitenOp = page => page.evaluate(() => rijen.filter(r => r.merk).map(r => r.merk + ':' + (r.fotoId || 'los') + ':' + r.breedte + ':' + (r.opmerking || '')).sort().join(' '));
    const blur = page => page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    tekeningProject([ruit(1, 'E', '700', '500', Object.assign({ aantal: 2, fotoId: 't1' }, K)), ruit(2, 'K', '600', '600', Object.assign({ fotoId: 't1' }, K))],
      { t1: [[1, 0.3, 0.3], [2, 0.7, 0.3]], t2: [[1, 0.6, 0.6]] });
    ({ ctx, page } = await projectOpen(null, 'pc', 1));
    await vul(page, 'K', 'opm-input', 'eerst');
    await bolKnop(page, 't1', 'E', 1, 'Alleen het bolletje weghalen');
    await vul(page, 'E', 'breedte-input', '720');
    check('R6: K kreeg een opmerking, E verhuisde naar tekening 2 en kreeg breedte 720', await opgeslagenAls(() =>
      dbRijM('K').opmerking === 'eerst' && dbRijM('E').fotoId === 't2' && dbRijM('E').breedte === '720'), await ruitenOp(page));
    await tabelOngedaan(page, 't1');
    t = await page.$eval('#statusBar', e => e.textContent);
    check('R6: ↶ in tabel 1 slaat de verhuizing over (E is daarna gewijzigd) en draait de opmerking van K terug', await opgeslagenAls(() =>
      dbRijM('K').opmerking === '' && dbRijM('E').fotoId === 't2' && dbRijM('E').breedte === '720') && /1 ruit staat intussen bij een andere foto/.test(t),
      await ruitenOp(page) + ' | ' + t);
    for (let k = 1; k <= 2; k++) {
      await blur(page);
      await page.keyboard.press('Control+z');
      await wacht(600);
      u = await page.evaluate(() => rijen.filter(r => r.merk === 'E').length);
      check('R6: Cmd+Z ' + k + '×: E staat er nog, precies één keer', u === 1, await ruitenOp(page));
    }
    check('R6: … ook in de database', await opgeslagenAls(() => (rijVan(1).data.rijen || []).filter(r => r.merk === 'E').length === 1),
      JSON.stringify((rijVan(1).data.rijen || []).map(r => r.merk)));
    await ctx.close();
    // Hetzelfde met ‹Ruiten bewaren›: een groep weg, de ruit gaat naar de
    // losse maten en verandert daar; ↶ in de losse maten en Cmd+Z.
    tekeningProject([ruit(1, 'G', '700', '500', Object.assign({ fotoId: 't3' }, K)), ruit(2, 'H', '600', '600', K)],
      { t3: [[1, 0.4, 0.4]] });
    ({ ctx, page } = await projectOpen(null, 'pc', 1));
    await vul(page, 'H', 'opm-input', 'eerst');
    await page.click('#blok-t3 .foto-balk button:has-text("Groep")');
    await page.waitForSelector('.melding-laag', { timeout: 3000 });
    await knop(page, 'Ruiten bewaren');
    await wacht(500);
    await vul(page, 'G', 'breedte-input', '740');
    check('bewaren: groep 3 weg, G bij de losse maten met breedte 740', await opgeslagenAls(() =>
      !dbRijM('G').fotoId && dbRijM('G').breedte === '740' && dbWerk().length === 2), await ruitenOp(page));
    await page.click('#blok-los .blok-bediening button:has-text("↶ Ongedaan")');
    await wacht(500);
    check('bewaren: ↶ in de losse maten: eerst de breedte van G terug (700)', await opgeslagenAls(() =>
      dbRijM('H').opmerking === 'eerst' && dbRijM('G').breedte === '700' && !dbRijM('G').fotoId), await ruitenOp(page));
    await page.click('#blok-los .blok-bediening button:has-text("↶ Ongedaan")');
    await wacht(500);
    t = await page.$eval('#statusBar', e => e.textContent);
    check('bewaren: nog eens ↶: G kan niet terug in de groep (die is weg) en blijft; de opmerking van H terug', await opgeslagenAls(() =>
      dbRijM('H').opmerking === '' && (rijVan(1).data.rijen || []).filter(r => r.merk === 'G').length === 1) && /1 ruit staat intussen bij een andere foto/.test(t),
      await ruitenOp(page) + ' | ' + t);
    for (let k = 1; k <= 2; k++) {
      await blur(page);
      await page.keyboard.press('Control+z');
      await wacht(600);
      u = await page.evaluate(() => rijen.filter(r => r.merk === 'G').length);
      check('bewaren: Cmd+Z ' + k + '×: G staat er nog, precies één keer', u === 1, await ruitenOp(page));
    }
    await ctx.close();
  }

  /* ══ 7 ════════════════════════════════════════════════════════ */
  if (doe('7')) {
    console.log('\n7. Papier: niet meer bolletjes dan het aantal (over alle tekeningen), werkvloer met verwijzing');
    // A1 ×3: 2 op t1, 1 op t3 (de doorsnede: alleen een verwijzing). B ×1 met
    // een bolletje op t1 én op t2 (van een ouder apparaat): één te veel.
    const K = Object.assign({}, KOMPLEET, INGEMETEN);
    tekeningProject([ruit(1, 'A1', '976', '572', Object.assign({ aantal: 3, fotoId: 't1' }, K)), ruit(2, 'B', '988', '572', Object.assign({ fotoId: 't2' }, K))],
      { t1: [[1, 0.3, 0.3], [1, 0.35, 0.3], [2, 0.7, 0.7]], t2: [[2, 0.5, 0.5]], t3: [[1, 0.4, 0.4]] });
    ({ ctx, page } = await projectOpen(null, 'pc', 1));
    const pi = await bestellijstPdf(page, Object.assign({}, ONVOLLEDIG, TOCH), 'PDF invoer');
    const bol = pdfBollenPerPagina(pi).map(telLetters);
    const alle = bol.reduce((o, x) => { Object.keys(x).forEach(k => { o[k] = (o[k] || 0) + x[k]; }); return o; }, {});
    check('pdf invoer: B (aantal 1) maar één keer op papier, ook al staat hij op twee tekeningen', alle.B === 1 && alle.A1 === 3, JSON.stringify(bol));
    const pw = await bestellijstPdf(page, Object.assign({}, ONVOLLEDIG, TOCH), 'PDF werkvloer');
    const pagW = pdfPaginas(pw);
    const p3 = pagW.findIndex(x => /Werkvloer - tekening 3/.test(x));
    check('pdf werkvloer: ook tekening 3 (alleen een ruit van tekening 1), met "A1 x1 hier (de regel staat bij tekening 1)"', p3 >= 0 &&
      /A1 x1 hier \(de regel staat bij tekening 1\)/.test(pagW[p3].replace(/\s+/g, ' ')), JSON.stringify(pagW.map(x => x.slice(0, 80))));
    check('… en de bolletjes op papier ook daar niet te veel (B één keer)', pdfBollenPerPagina(pw).flat().filter(x => x === 'B').length === 1);
    await ctx.close();
  }

  /* ══ 8 ════════════════════════════════════════════════════════ */
  if (doe('8')) {
    console.log('\n8. Telefoon (390 px) en iPad staand: de route en de gele balk passen, knoppen 44 px');
    const K = Object.assign({}, KOMPLEET, INGEMETEN);
    tekeningProject([ruit(1, 'A1', '976', '572', Object.assign({ aantal: 3 }, K)), ruit(2, 'A2', '977', '1079', Object.assign({ aantal: 3 }, K)),
                     ruit(3, 'B1', '988', '572', K), ruit(4, 'B2', '989', '1094', K)], {});
    for (const [naam, opties] of [['telefoon', TELEFOON], ['ipad', IPAD], ['pc', null]]) {
      S.slot = {};      // het vorige apparaat is klaar
      ({ ctx, page } = await projectOpen(opties ? Object.assign({}, opties) : null, naam, 1));
      const hoe = opties ? 'vinger' : null;
      check(naam + ': de route staat er', /nog 8 ruiten zonder plek/.test(await routeTekst(page)));
      await drukOp(page, page.locator('#aanwijsRoute .ar-stap').nth(1), hoe);
      await kiesRuit(page, 't2', 'B2', hoe);
      u = await page.evaluate(() => {
        const balk = document.getElementById('aanwijs-t2');
        const knoppen = [...balk.querySelectorAll('button')].filter(b => !b.closest('.aanwijs-keuze')).map(b => b.getBoundingClientRect())
          .concat([...balk.querySelectorAll('.aanwijs-keuze')].map(k => k.getBoundingClientRect()));
        return { breed: document.documentElement.scrollWidth - innerWidth, laag: Math.min(...knoppen.map(k => k.height)),
                 buiten: knoppen.some(k => k.right > innerWidth + 1 || k.left < -1),
                 ruit: Math.min(...[...balk.querySelectorAll('.aanwijs-ruit')].map(b => b.getBoundingClientRect().height)),
                 hoogte: Math.round(balk.getBoundingClientRect().height), route: document.getElementById('aanwijsRoute').scrollWidth - document.getElementById('aanwijsRoute').clientWidth };
      });
      check(naam + ': geen zijwaarts schuiven, alle knoppen in beeld' + (opties ? ', minstens 44 px hoog' : ''), u.breed <= 0 && !u.buiten && u.route <= 0 &&
        (!opties || (u.laag >= 44 && u.ruit >= 44)), JSON.stringify(u));
      check(naam + ': tik op B2 in de balk maakt B2 de volgende', /^B2 /.test(await balkTekst(page, 't2')));
      await tik(page, 't2', 0.5, 0.5, hoe);
      check(naam + ': B2 aangewezen op tekening 2', await opgeslagenAls(() => JSON.stringify(dbBol('B2')) === '[0,1,0]'), JSON.stringify(dbBol('B2')));
      await page.evaluate(() => document.getElementById('aanwijsRoute').scrollIntoView());
      await plaatje(page, '8-' + naam + '-route');
      await page.evaluate(() => document.getElementById('img-t2').scrollIntoView({ block: 'center' }));
      await wacht(300);
      await plaatje(page, '8-' + naam + '-balk');
      // Terug zoals het was, voor het volgende apparaat.
      await balkKnop(page, 't2', 'Klaar', hoe);
      await page.evaluate(() => { bewaarStap('terug'); werkFotos()[1].markeringen = []; rijen.forEach(r => { delete r.fotoId; }); renderTabel(); opslaan(); });
      await opgeslagenAls(() => JSON.stringify(dbBol('B2')) === '[0,0,0]');
      await ctx.close();
    }
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
