/* Testreeks v124 (herstel) — node test-v124-herstel.js   (en: --mutaties)

   Onderwerp: onbedoelde wijzigingen altijd terug kunnen draaien (keuze Jan,
   26-10-2026: "laag 1 en 2").
    1. De fout met ↶ en de bolletjes (Jan, MacBook/Safari, v121/v122): "bij
       meerdere keren op ongedaan haalt hij 1 bolletje weg en zet hem bij de
       tweede klik weer terug". Plaatsen, weghalen, slepen; ↶ per tabel en
       Cmd+Z, door elkaar; Safari (een knop krijgt bij een klik geen focus);
       iPad met aanraken.
    2. ↶ blijft na herladen, offline herladen, een ander project en terug.
       Het project is intussen elders veranderd (een collega, een nieuwere
       stand van de server): de oude stappen vervallen, nooit zijn werk weg.
       Niet in "alleen kijken", geen bestelling terug, volgendId nooit lager,
       uitloggen wist alles, grens in stappen en grootte.
    3. "Onlangs verwijderd": iPad op de bouwplaats gooit per ongeluk een blok
       met 6 ruiten weg; kantoor (pc) ziet het, herlaadt, zet het met één tik
       terug: ruiten, nummers, bolletjes en foto. Ook: alleen de afbeelding,
       een losse ruit (✕), een selectie, een tabel leegmaken, de foto van de
       leverlocatie, een taak. Na een bestelling (annuleren / opnieuw
       bestellen). Dubbele merkletter. Alleen kijken. 30 dagen, grens.
       Pdf, Excel, bestellijst en de controle van de database (script 28)
       zien de lijst niet. Telefoon.
    4. Schermafdrukken (PLAATJES=map): 1280, 820 (iPad staand), 390 (iPhone).

   De vijf vragen (TESTEN.md):
   - Echte situatie: Jan op kantoor (MacBook, Safari) zet bolletjes op een
     gevelfoto en klikt een paar keer ↶; een collega op de bouwplaats (iPad,
     wisselend bereik) tikt per ongeluk op 🗑 Groep; kantoor (pc) moet het
     terug kunnen halen, ook de volgende dag; ondertussen werkt een tweede
     apparaat in hetzelfde project.
   - Belofte: ↶ draait terug wat je deed, één stap per keer, nooit heen en
     weer, ook na herladen; nooit het werk van een ander. Wat weg is, staat
     30 dagen in "Onlangs verwijderd" en komt met één tik helemaal terug, op
     elk apparaat.
   - Wat gaat er mis: een momentopname van vóór een wijziging die bovenop
     komt (focus, ↶ per tabel); een oude stapel na een wijziging elders; een
     item dat in pdf/bestellijst/database-controle meetelt; terugzetten in
     alleen kijken; een foto waarvan het bestand weg is.
   - Halverwege: herladen tussen de stappen; geen bereik bij het herladen; een
     collega neemt het project over; de app gaat naar de achtergrond (pagehide).
   - Wat de opstelling aanneemt: de nagebootste database van test-v123
     (bewerkslot, versieslot, bestellingen-trigger, taken, opslag), echte
     Chromium (IndexedDB echt); Safari nagebootst: een klik op een knop geeft
     die knop geen focus (in Chromium: mousedown → preventDefault). Echte
     Safari (Mac, iPad, iPhone), Android, Windows en de echte Supabase:
     niet hier. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  // 1: de fout met de bolletjes
  blokHerschrijf: ['blokbalk.js', "          zetDeelIn(s, fotoId, deel);\n", ""],
  veldStap: ['undo.js', "    if (inBewerking) return;   // een handeling die intern andere aanroept = één stap\n    veldAfsluiten();\n",
                        "    if (inBewerking) return;   // een handeling die intern andere aanroept = één stap\n"],
  nietsOverslaan: ['undo.js', "      if (boven !== nuZonder) break;", "      break;"],
  // 2: blijvend
  nietBlijvend: ['undo.js', "      var past = s.wie === ik && a && a.wie === ik && a.afdruk === afdrukVan(JSON.parse(json)) && staat() === json;",
                            "      var past = false;"],
  afdrukNegeren: ['undo.js', "      var past = s.wie === ik && a && a.wie === ik && a.afdruk === afdrukVan(JSON.parse(json)) && staat() === json;",
                             "      var past = s.wie === ik;"],
  collegaBlijft: ['undo.js', "    if (zelfde) { laatsteJson = nuJson; tekenKnoppen(); return; }", "    if (vorige === nuPid) { laatsteJson = nuJson; tekenKnoppen(); return; }"],
  uitlogWis: ['cloud.js', "    if (window.undoWisAlles) { try { undoWisAlles(); } catch (e) {} }\n    if (openstaandWerk()) return;", "    if (openstaandWerk()) return;"],
  ophalenNaLaden: ['undo.js', "        overnemen(actief, false);\n      }\n    }, 500);", "      }\n    }, 500);"],
  // 3: onlangs verwijderd
  itemGroep: ['fotos.js', "    if (window.glasVerwijderdGroep) glasVerwijderdGroep(id, ookRuiten);\n", ""],
  itemRuit: ['fotos.js', "    if (window.glasVerwijderdRuiten) glasVerwijderdRuiten([id]);\n", ""],
  itemSelectie: ['bulk.js', "    if (window.glasVerwijderdRuiten) glasVerwijderdRuiten(Array.from(selectie));\n", ""],
  itemTabel: ['blokbalk.js', "    if (window.glasVerwijderdTabel) glasVerwijderdTabel(fotoId);\n", ""],
  itemAfbeelding: ['fotos.js', "    if (window.glasVerwijderdAfbeelding) glasVerwijderdAfbeelding(id);   // v124\n", ""],
  itemLever: ['fotos.js', "    if (window.glasVerwijderdLever) glasVerwijderdLever(f);\n", ""],
  itemTaak: ['project.js', "      if (gelukt && window.glasVerwijderdTaken && window.glasProjectId === pidNu &&\n          glasVerwijderdTaken([t])) opslaan();", "      void pidNu;"],
  leverBestand: ['fotos.js', "    if (window.glasVerwijderdLever) glasVerwijderdLever(f);\n",
                 "    if (window.glasVerwijderdLever) glasVerwijderdLever(f);\n    if (sbClient()) sbClient().storage.from(BUCKET).remove([f.pad]);\n"],
  terugBollen: ['herstel.js', "      (x.bollen || []).forEach(function (b) {\n        var g = fotoVan(b.f);", "      ([]).forEach(function (b) {\n        var g = fotoVan(b.f);"],
  groepBollen: ['herstel.js', "      (item.foto.markeringen || []).forEach(function (m) {\n        if (zetBol(doel", "      ([]).forEach(function (m) {\n        if (zetBol(doel"],
  terugSlot: ['herstel.js', "    if (window.slotWeigert && slotWeigert()) return false;\n    var label", "    var label"],
  kijkBewaar: ['herstel.js', "    if (window.glasAlleenKijken && glasAlleenKijken()) return null;\n    item.id", "    item.id"],
  dertigDagen: ['herstel.js', "  function verlopen(x, nu) { return (nu || Date.now()) - tijdVan(x) > DAGEN * DAG_MS; }", "  function verlopen(x, nu) { return false; }"],
  maxItems: ['herstel.js', "    while (l.length > MAX_ITEMS) l.shift();", ""],
  taakEigenaar: ['project.js', "    if (!t.eigenaar) { velden.eigenaar = null; velden.eigenaar_naam = ''; }", ""],
  taakItemBlijft: ['undo.js', "    if (samen.length) projectInfo.onlangsVerwijderd = samen; else delete projectInfo.onlangsVerwijderd;", ""],
  rijKnopItem: ['index.html', "    if (item && window.glasVerwijderdTerug) { if (!getRij(id)) glasVerwijderdTerug(item.id); return; }\n", ""],
  dubbelMelden: ['herstel.js', "    if (dubbel) extra.push(", "    if (false) extra.push("],
  knopTeller: ['herstel.js', "    Array.prototype.forEach.call(document.querySelectorAll('.verwijderd-knop'), function (e) { e.hidden = !n; });", ""],
  // 5: reparatieronde (review v124)
  erbijBlijft: ['undo.js', "      fotos.push(k);\n    });", "    });"],
  bollenElders: ['herstel.js', "        zetBol(g, b.m, uit, false);", "        if (g.id === r.fotoId) zetBol(g, b.m, uit, false);"],
  groepVerwijzing: ['herstel.js', "        if (zetBol(doel, m, uit, true)) geraakt[m.rijId] = true;",
                    "        if (rijen.some(function (y) { return y.id === m.rijId && y.fotoId === doel.id; }) && zetBol(doel, m, uit, true)) geraakt[m.rijId] = true;"],
  naarThuis: ['herstel.js', "    if (!thuis || r.fotoId === thuis) return;\n    r.fotoId = thuis;", "    return;"],
  losseBollen: ['fotos.js', "        if (x.id !== id) x.markeringen = (x.markeringen || []).filter(function (m) { return !weg[m.rijId]; });", ""],
  tabNieuwer: ['undo.js', "  window.ongedaan = function () {\n    if (weigerOudeStand()) return;", "  window.ongedaan = function () {"],
  tabNieuwerTabel: ['undo.js', "      var nieuw = function () { if (weigerOudeStand()) return; return orig.apply(this, arguments); };",
                               "      var nieuw = function () { return orig.apply(this, arguments); };"],
  werkvloerTekst: ['herstel.js', "    if (werkvloer()) return 'Werkvloer';", ""],
  telefoonLijst: ['index.html', "    .vw-item { flex-direction: column; align-items: stretch; gap: 8px; }", "    .vw-item { flex-wrap: nowrap; }\n    .vw-tekst b { white-space: nowrap; }"],
};
const WAAR = { erbijBlijft: '5', bollenElders: '5', groepVerwijzing: '5', naarThuis: '5', losseBollen: '5', tabNieuwer: '5',
  tabNieuwerTabel: '5', werkvloerTekst: '5', blokHerschrijf: '1', veldStap: '1', nietsOverslaan: '1',
  nietBlijvend: '2', afdrukNegeren: '2', collegaBlijft: '2', uitlogWis: '2', ophalenNaLaden: '2',
  itemGroep: '3', itemRuit: '3', itemSelectie: '3', itemTabel: '3', itemAfbeelding: '3', itemLever: '3', itemTaak: '3',
  leverBestand: '3', terugBollen: '3', groepBollen: '3', terugSlot: '3', kijkBewaar: '3', dertigDagen: '3', maxItems: '3',
  taakEigenaar: '3', taakItemBlijft: '3', rijKnopItem: '3', dubbelMelden: '3', knopTeller: '3', telefoonLijst: '3' };

if (process.argv.indexOf('--mutaties') >= 0) {
  let goed = 0;
  const alleen = process.argv[process.argv.indexOf('--mutaties') + 1];
  const namen = Object.keys(MUTATIES).filter(n => !alleen || alleen.split(',').indexOf(n) >= 0);
  namen.forEach(function (naam) {
    const r = spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { MUTATIE: naam, ALLEEN: process.env.ALLEEN || WAAR[naam] || '' }),
                                                         encoding: 'utf8', timeout: 900000 });
    const uit = (r.stdout || '') + (r.stderr || '');
    const regels = uit.split('\n').filter(l => /^\s+FOUT /.test(l)).map(l => l.trim());
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
    // v123: een foto die de app zelf uploadde (bijv. gedraaid) is er daarna ook.
    if (S.opslag.has(v.pad)) return { data: { signedUrl: GEVEL }, error: null };
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v124h-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v124h-pdf-'));
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

/* ─── hulp voor v124 ──────────────────────────────────────────── */
const IPHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };
const idOp = (page, merk) => page.evaluate(m => (rijen.find(r => r.merk === m) || {}).id, merk);
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

// Een blok (foto f1) met 6 ruiten, elk met één bolletje, en een losse ruit.
function blokProject(extra) {
  resetDb();
  const p = rijVan(1);
  const k = Object.assign({}, KOMPLEET, INGEMETEN);
  p.data.rijen = ['A', 'B', 'C', 'D', 'E', 'F'].map((m, i) => ruit(i + 1, m, String(900 + i * 10), '1200', Object.assign({ fotoId: FOTO }, k)))
    .concat([ruit(7, 'L1', '600', '600', k)]);
  p.data.volgendId = 8;
  p.data.fotos = [{ id: FOTO, pad: P(1) + '/gevel.jpg', titel: 'Voorgevel', breedte: 800, hoogte: 600,
    inkt: [{ t: 'lijn', k: '#c62828', d: 4, p: [[100, 100], [300, 120]] }],
    markeringen: [1, 2, 3, 4, 5, 6].map(i => ({ rijId: i, x: 0.1 + (i - 1) * 0.15, y: 0.4 })) }];
  p.data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
  p.status = 'bezig met inmeten/verwerken';
  S.opslag.set(P(1) + '/gevel.jpg', { grootte: 1000, type: 'image/jpeg' });
  if (extra) extra(p);
}
const bolNu = page => page.evaluate(f => (fotos.find(x => x.id === f) || { markeringen: [] }).markeringen.length, FOTO);
const stappen = page => page.evaluate(() => undoStapels().terug.length);
const wegLijst = () => (((rijVan(1).data || {}).info || {}).onlangsVerwijderd || []);
const wegScherm = page => page.evaluate(() => JSON.parse(JSON.stringify(projectInfo.onlangsVerwijderd || [])));
// v124 (reparatieronde): twee tekeningen; een ruit kan bolletjes op beide hebben.
// A (f1), B ×3 (thuis f2: 2 op f2, 1 op f1), C ×2 (thuis f1: 1 op f1, 1 op f2),
// D (f2), L1 los.
function tweeTekeningen() {
  blokProject(p => {
    const k = Object.assign({}, KOMPLEET, INGEMETEN);
    p.data.rijen = [ruit(1, 'A', '900', '1200', Object.assign({ fotoId: 'f1' }, k)), ruit(2, 'B', '910', '1200', Object.assign({ fotoId: 'f2', aantal: 3 }, k)),
      ruit(3, 'C', '920', '1200', Object.assign({ fotoId: 'f1', aantal: 2 }, k)), ruit(4, 'D', '930', '1200', Object.assign({ fotoId: 'f2' }, k)),
      ruit(7, 'L1', '600', '600', k)];
    p.data.fotos = [
      { id: 'f1', pad: P(1) + '/gevel.jpg', titel: 'Tekening 1', breedte: 800, hoogte: 600, inkt: [],
        markeringen: [{ rijId: 1, x: 0.1, y: 0.4 }, { rijId: 2, x: 0.3, y: 0.4 }, { rijId: 3, x: 0.5, y: 0.4 }] },
      { id: 'f2', pad: P(1) + '/achter.jpg', titel: 'Tekening 2', breedte: 800, hoogte: 600, inkt: [],
        markeringen: [{ rijId: 2, x: 0.1, y: 0.5 }, { rijId: 2, x: 0.3, y: 0.5 }, { rijId: 3, x: 0.5, y: 0.5 }, { rijId: 4, x: 0.7, y: 0.5 }] }];
  });
  S.opslag.set(P(1) + '/achter.jpg', { grootte: 1000, type: 'image/jpeg' });
}
// Per ruit: blok en bolletjes per tekening, bijv. "B@f2 f1:1 f2:2".
const ruitTekeningen = page => page.evaluate(() => rijen.filter(r => r.merk).map(r => r.merk + '@' + (r.fotoId || 'los') +
  fotos.map(f => { const n = (f.markeringen || []).filter(m => m.rijId === r.id).length; return n ? ' ' + f.id + ':' + n : ''; }).join('')).join(' | '));
async function blokU(page, id) {
  await page.locator('#blok-' + id + ' .blok-bediening button:has-text("↶ Ongedaan")').first().click();
  await wacht(400);
}
// Safari: een klik op een knop geeft die knop geen focus; het veld dat de
// focus had, houdt hem.
async function alsSafari(page) {
  await page.evaluate(() => document.addEventListener('mousedown', e => {
    if (e.target && e.target.closest && e.target.closest('button')) e.preventDefault();
  }, true));
}
const idbSleutels = page => page.evaluate(() => new Promise(ok => {
  const v = indexedDB.open('glasopname_ongedaan');
  v.onsuccess = () => {
    const d = v.result;
    if (!d.objectStoreNames.contains('stapels')) { d.close(); ok([]); return; }
    const r = d.transaction('stapels').objectStore('stapels').getAllKeys();
    r.onsuccess = () => { d.close(); ok(r.result); };
    r.onerror = () => { d.close(); ok(['fout']); };
  };
  v.onerror = () => ok(['fout']);
}));
async function herlaad(page, n) {
  await wacht(600);                 // zoals een mens: niet binnen een halve seconde
  await page.reload();
  await page.waitForFunction(id => {
    const v = document.getElementById('projectNaam');
    return v && v.value && window.glasProjectId === id;
  }, P(n || 1), { timeout: 15000 });
  await wacht(1500);
}
// Het project weer zelf bewerken (de collega gaf het vrij, of overnemen).
async function weerBewerken(page) {
  for (let i = 0; i < 40; i++) {
    if (!(await page.evaluate(() => !!(window.glasAlleenKijken && glasAlleenKijken())))) break;
    await page.locator('button:visible:has-text("Toch bewerken")').first().click({ timeout: 2000 }).catch(() => {});
    await wacht(500);
    await page.locator('button:visible:has-text("Overnemen")').first().click({ timeout: 500 }).catch(() => {});
    await wacht(500);
  }
  await wacht(1500);
}
async function zonderBereik(page, aan) {
  S.offline = aan;
  await page.evaluate(a => window.dispatchEvent(new Event(a ? 'offline' : 'online')), aan);
  await wacht(300);
}
// Zoals glas_ids_fout in script 28.
const dbWeigert = d => {
  const nr = v => typeof v === 'number' && /^[0-9]{1,9}$/.test(String(v));
  const nrTekst = v => v != null && /^[0-9]{1,9}$/.test(String(v));
  if (d.rijen != null && !Array.isArray(d.rijen)) return 'rijen';
  if ((d.rijen || []).some(e => !e || typeof e !== 'object' || !nr(e.id) || (e.fotoId != null && e.fotoId !== '' && !/^[A-Za-z0-9_-]{1,64}$/.test(String(e.fotoId))))) return 'ruit';
  if (d.fotos != null && !Array.isArray(d.fotos)) return 'fotos';
  if ((d.fotos || []).some(f => !f || typeof f !== 'object' || !/^[A-Za-z0-9_-]{1,64}$/.test(String(f.id == null ? '' : f.id)) ||
    (f.markeringen != null && !Array.isArray(f.markeringen)) || (f.markeringen || []).some(m => !m || typeof m !== 'object' || !nrTekst(m.rijId)))) return 'foto';
  return null;
};
async function venster(page) {
  const k = page.locator('.verwijderd-knop:visible, #projectVerwijderdKnop:visible:not([disabled])').first();
  if (!(await k.count())) { check('de knop "Onlangs verwijderd" staat er', false); return ''; }
  await k.click();
  await page.waitForSelector('#verwijderdVenster .vw-lijst', { timeout: 4000 });
  return page.$eval('#verwijderdVenster', e => e.innerText.replace(/\s+/g, ' '));
}
async function terugzetten(page, tekst, tik) {
  const k = page.locator('#verwijderdVenster .vw-item', { hasText: tekst }).locator('button.vw-terug').first();
  if (!(await k.count())) { check('in de lijst: ' + tekst, false); return; }
  if (tik) await k.tap(); else await k.click();
  await wacht(800);
}
const dbStand = () => {
  const d = rijVan(1).data;
  return { merken: (d.rijen || []).filter(r => r.merk).map(r => r.id + ':' + r.merk + (r.fotoId ? '@' + r.fotoId : '')).join(' '),
           bollen: (d.fotos || []).map(f => f.id + ':' + (f.markeringen || []).length).join(' '),
           fotos: (d.fotos || []).map(f => f.id + '=' + (f.pad || '-')).join(' '), volgendId: d.volgendId };
};

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, t, u, v;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. ↶ met bolletjes (de fout van Jan)');
    for (const welke of ['tabel', 'Cmd+Z']) {
      const terugTik = async () => { if (welke === 'tabel') await blokU(page, FOTO); else await ongedaan(page); };
      ({ ctx, page } = await gevelOpen());
      const begin = await bolNu(page);
      await tikFoto(page, 0.2, 0.8); await tikFoto(page, 0.5, 0.85); await tikFoto(page, 0.7, 0.9);
      u = [];
      for (let i = 0; i < 4; i++) { await terugTik(); u.push(await bolNu(page) - begin); }
      check('3 bolletjes geplaatst, ↶ (' + welke + ') ×4: 2, 1, 0, 0 erbij — nooit terug', JSON.stringify(u) === '[2,1,0,0]', JSON.stringify(u));
      await ctx.close();
      ({ ctx, page } = await gevelOpen());
      await bolMenu(page, 'B', 1); await menuKnop(page, 'Alleen het bolletje');
      await bolMenu(page, 'B', 1); await menuKnop(page, 'Alleen het bolletje');
      u = [await bolNu(page)];
      for (let i = 0; i < 3; i++) { await terugTik(); u.push(await bolNu(page)); }
      check('2 bolletjes weggehaald, ↶ (' + welke + ') ×3: 5 → 6 → 7 → 7', JSON.stringify(u) === '[5,6,7,7]', JSON.stringify(u));
      await ctx.close();
      ({ ctx, page } = await gevelOpen());
      const xs = () => page.evaluate(() => fotos[0].markeringen.slice(0, 2).map(m => Math.round(m.x * 100)).join(','));
      const voor = await xs();
      for (const n of [0, 1]) {
        const b = await page.locator('#doek-' + FOTO + ' .foto-mark').nth(n).boundingBox();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
        await page.mouse.move(b.x + 70, b.y + 40, { steps: 6 }); await page.mouse.up(); await wacht(400);
      }
      u = [await xs()];
      for (let i = 0; i < 3; i++) { await terugTik(); u.push(await xs()); }
      check('2 bolletjes versleept, ↶ (' + welke + ') ×3: eerst de laatste terug, dan de eerste, dan niets meer',
        u[2] === voor && u[3] === voor && u[1] !== voor && u[1].split(',')[1] === voor.split(',')[1] && u[0] !== voor, JSON.stringify([voor].concat(u)));
      await ctx.close();
    }
    // ↶ in de tabel, dan een maat typen, dan weer ↶: het bolletje komt niet terug.
    ({ ctx, page } = await gevelOpen());
    await tikFoto(page, 0.2, 0.8); await tikFoto(page, 0.5, 0.85); await tikFoto(page, 0.7, 0.9);
    await blokU(page, FOTO); await blokU(page, FOTO);
    const nieuw = await page.evaluate(() => rijen.filter(r => r.fotoId === 'f1').pop().merk);
    await vul(page, nieuw, 'breedte-input', '900');
    await page.mouse.click(5, 5); await wacht(300);
    u = [];
    for (let i = 0; i < 3; i++) { await blokU(page, FOTO); u.push((await bolNu(page)) + '/' + (await schermRij(page, nieuw)).breedte); }
    check('↶ ↶ in de tabel, maat typen bij ' + nieuw + ', ↶ ×3: maat weg, dan ' + nieuw + ' weg, dan niets (geen bolletje terug)',
      JSON.stringify(u) === JSON.stringify(['8/', '7/undefined', '7/undefined']), JSON.stringify(u));
    await ctx.close();
    // ↶ in de tabel en daarna Cmd+Z: Cmd+Z gaat verder terug, niet heen.
    ({ ctx, page } = await gevelOpen());
    await tikFoto(page, 0.2, 0.8); await tikFoto(page, 0.5, 0.85); await tikFoto(page, 0.7, 0.9);
    await blokU(page, FOTO); await blokU(page, FOTO);
    await page.mouse.click(5, 5);
    await ongedaan(page);
    u = [await bolNu(page)];
    await ongedaan(page);
    u.push(await bolNu(page));
    check('↶ ↶ in de tabel, dan Cmd+Z ×2: het derde bolletje weg (7), daarna niets terug', JSON.stringify(u) === '[7,7]', JSON.stringify(u));
    const opScherm = await bolNu(page);
    await opgeslagen(page, () => rijVan(1).data.fotos[0].markeringen.length === opScherm);
    check('… en zo staat het ook in de database (7 bolletjes, gelijk aan het scherm)', rijVan(1).data.fotos[0].markeringen.length === 7 && opScherm === 7,
      rijVan(1).data.fotos[0].markeringen.length + ' / ' + opScherm);
    await ctx.close();
    // Safari: het veld in de tabel houdt de focus bij een klik op ↶.
    ({ ctx, page } = await gevelOpen());
    await alsSafari(page);
    await tikFoto(page, 0.2, 0.8); await tikFoto(page, 0.5, 0.85); await tikFoto(page, 0.7, 0.9);
    await page.click('#rij-' + (await idOp(page, 'A')) + ' .breedte-input'); await wacht(200);
    u = [];
    for (let i = 0; i < 3; i++) { await blokU(page, FOTO); u.push(await bolNu(page)); }
    const actief = await page.evaluate(() => document.activeElement && document.activeElement.className);
    await page.mouse.click(5, 5); await wacht(200);
    await ongedaan(page);
    u.push(await bolNu(page));
    check('Safari (focus blijft in een cel): ↶ ×3 in de tabel 9, 8, 7, daarna Cmd+Z blijft 7 (v122: 9, 10, 9; v123: Cmd+Z 10)',
      JSON.stringify(u) === '[9,8,7,7]', JSON.stringify(u) + ' (focus: ' + actief + ')');
    await ctx.close();
    // Safari: een maat getypt (zonder Tab) en dan een bolletje weg via zijn menu.
    ({ ctx, page } = await gevelOpen());
    await alsSafari(page);
    const idA = await idOp(page, 'A');
    await page.click('#rij-' + idA + ' .breedte-input'); await page.keyboard.press('Control+a'); await page.keyboard.type('1111'); await wacht(200);
    await bolMenu(page, 'B', 1); await menuKnop(page, 'Alleen het bolletje');
    await page.mouse.click(5, 5); await wacht(300);
    await ongedaan(page);
    u = [(await schermRij(page, 'A')).breedte, await bolNu(page)];
    await ongedaan(page);
    u.push((await schermRij(page, 'A')).breedte, await bolNu(page));
    check('Safari: maat 1111 getypt, bolletje weg; Cmd+Z: bolletje terug (maat blijft), Cmd+Z: maat terug naar 1000',
      JSON.stringify(u) === JSON.stringify(['1111', 7, '1000', 7]), JSON.stringify(u));
    await ctx.close();
    // iPad: tikken met de vinger.
    gevelProject();
    ({ ctx, page } = await apparaat(IPAD, 'ipad', 1));
    await page.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(300);
    const img = page.locator('#img-' + FOTO);
    for (const [x, y] of [[0.2, 0.8], [0.5, 0.85]]) {
      const b = await img.boundingBox();
      await img.tap({ position: { x: b.width * x, y: b.height * y } }); await wacht(800);
    }
    u = [await bolNu(page)];
    for (let i = 0; i < 3; i++) {
      await page.locator('#blok-' + FOTO + ' .blok-bediening button:has-text("↶ Ongedaan")').first().tap(); await wacht(400);
      u.push(await bolNu(page));
    }
    check('iPad: 2 bolletjes getikt, ↶ ×3 getikt: 9 → 8 → 7 → 7', JSON.stringify(u) === '[9,8,7,7]', JSON.stringify(u));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. ↶ na herladen, ander project, collega');
    ({ ctx, page } = await gevelOpen());
    await tikFoto(page, 0.2, 0.8); await tikFoto(page, 0.5, 0.85);
    const geplaatst = await page.evaluate(() => rijen.filter(r => r.fotoId === 'f1').slice(-2).map(r => r.id));
    await vul(page, 'A', 'breedte-input', '1234');
    await page.mouse.click(5, 5);
    await opgeslagen(page, () => dbRij('A').breedte === '1234' && rijVan(1).data.fotos[0].markeringen.length === 9);
    await wacht(800);
    u = await idbSleutels(page);
    check('de stappen staan op het apparaat (IndexedDB, per project)', u.indexOf('s:' + P(1)) >= 0 && u.indexOf('a:' + P(1)) >= 0, JSON.stringify(u));
    await herlaad(page);
    check('na herladen: 3 stappen terug te draaien', await stappen(page) === 3, await stappen(page));
    await ongedaan(page);
    u = [(await schermRij(page, 'A')).breedte];
    await ongedaan(page); await ongedaan(page);
    u.push(await bolNu(page));
    check('Cmd+Z na herladen: maat terug (1000), dan de 2 bolletjes weg (7)', JSON.stringify(u) === JSON.stringify(['1000', 7]), JSON.stringify(u));
    await opgeslagen(page, () => dbRij('A').breedte === '1000' && rijVan(1).data.fotos[0].markeringen.length === 7);
    check('… en de database heeft die stand', dbRij('A').breedte === '1000' && rijVan(1).data.fotos[0].markeringen.length === 7, JSON.stringify(dbStand()));
    // volgendId nooit lager: de volgende ruit krijgt een nieuw nummer.
    await tikFoto(page, 0.3, 0.9);
    u = await page.evaluate(() => rijen.filter(r => r.fotoId === 'f1').pop().id);
    check('na ↶ (ruiten ' + geplaatst.join(' en ') + ' weg) krijgt een nieuwe ruit een hoger nummer (volgendId daalt nooit, ook niet na herladen)',
      u > Math.max.apply(null, geplaatst), u + ' na ' + JSON.stringify(geplaatst));
    // Een ander project en terug.
    await page.evaluate(id => cloudOpen(id), P(2));
    await page.waitForFunction(id => window.glasProjectId === id, P(2), { timeout: 15000 }); await wacht(1200);
    check('in project 2: geen stappen van project 1', await stappen(page) === 0, await stappen(page));
    await page.evaluate(id => cloudOpen(id), P(1));
    await page.waitForFunction(id => window.glasProjectId === id, P(1), { timeout: 15000 }); await wacht(1500);
    await ongedaan(page);
    check('terug in project 1: Cmd+Z haalt de laatste ruit weg (de stappen zijn er nog)', await bolNu(page) === 7, await bolNu(page));
    // Offline herladen met werk dat nog omhoog moet.
    await zonderBereik(page, true);
    await tikFoto(page, 0.4, 0.95);
    await wacht(600);
    await page.reload();
    await page.waitForFunction(() => window.glasProjectId && document.getElementById('projectNaam').value, null, { timeout: 15000 });
    await wacht(2000);
    u = [await bolNu(page), await stappen(page)];
    await ongedaan(page);
    u.push(await bolNu(page));
    check('zonder bereik herladen: de nieuwe ruit staat er, en Cmd+Z haalt hem weg', u[0] === 8 && u[1] >= 1 && u[2] === 7, JSON.stringify(u));
    await zonderBereik(page, false);
    await opgeslagen(page, () => rijVan(1).data.fotos[0].markeringen.length === 7);
    check('… met bereik staat die stand op de server', rijVan(1).data.fotos[0].markeringen.length === 7, JSON.stringify(dbStand()));
    // Een nieuwere stand van de server (een collega, terwijl dit apparaat weg was).
    await tikFoto(page, 0.6, 0.95);
    await opgeslagen(page, () => rijVan(1).data.fotos[0].markeringen.length === 8);
    await wacht(800);
    await page.goto('about:blank'); await wacht(500);
    const d = rijVan(1).data;
    d.rijen.push(ruit(50, 'Z9', '777', '777', Object.assign({ fotoId: FOTO }, KOMPLEET)));
    d.fotos[0].markeringen.push({ rijId: 50, x: 0.9, y: 0.9 });
    d.volgendId = 51; d._rev = (parseInt(d._rev, 10) || 0) + 1; d._apparaat = 'ander-apparaat'; d._sessie = 'x';
    await page.goto(adres + '#project=' + P(1));
    await page.waitForFunction(id => window.glasProjectId === id && document.getElementById('projectNaam').value, P(1), { timeout: 15000 });
    await wacht(1800);
    t = await kortBer(page);
    u = [await stappen(page)];
    await ongedaan(page);
    await wacht(1500);
    u.push(await page.evaluate(() => rijen.some(r => r.merk === 'Z9')));
    check('de server heeft een nieuwere stand (collega): de oude stappen vervallen, met een bericht', u[0] === 0 && /intussen op een ander apparaat of tabblad gewijzigd/.test(t), u[0] + ' | ' + t);
    check('… Cmd+Z laat het werk van de collega staan (scherm en database)', u[1] === true && dbRij('Z9').id === 50, JSON.stringify(u) + ' ' + JSON.stringify(dbStand()));
    // Uitloggen wist de stappen van het apparaat.
    await tikFoto(page, 0.15, 0.95);
    await opgeslagen(page, () => rijVan(1).data.fotos[0].markeringen.length === 10);
    await wacht(800);
    check('vooraf: stappen op het apparaat', (await idbSleutels(page)).length >= 2, JSON.stringify(await idbSleutels(page)));
    await page.evaluate(() => cloudUitloggen());
    await wachtTot(() => page.evaluate(() => { const l = document.getElementById('cloudLogin'); return l && getComputedStyle(l).display !== 'none'; }), 8000);
    await wacht(800);
    u = await idbSleutels(page);
    check('na uitloggen: geen stappen meer op het apparaat (klantgegevens)', u.length === 0, JSON.stringify(u));
    await ctx.close();
    S.wie = IK;

    // Een collega neemt het project over terwijl dit apparaat stappen heeft (live).
    gevelProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(300);
    await tikFoto(page, 0.2, 0.8);
    await opgeslagen(page, () => rijVan(1).data.fotos[0].markeringen.length === 8);
    const { ctx: ctxB, page: pageB } = await apparaat(IPAD, 'ipad', 1);
    await tochBewerken(pageB);
    await pageB.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(300);
    const imgB = pageB.locator('#img-' + FOTO); const bb = await imgB.boundingBox();
    await imgB.tap({ position: { x: bb.width * 0.6, y: bb.height * 0.9 } }); await wacht(600);
    await opgeslagen(pageB, () => rijVan(1).data.fotos[0].markeringen.length === 9);
    await wacht(1500);
    await sluitMeldingen(page);
    await page.mouse.click(5, 5);
    await ongedaan(page); await wacht(500);
    await sluitMeldingen(page);
    u = [await page.evaluate(() => !!(window.glasAlleenKijken && glasAlleenKijken())), rijVan(1).data.fotos[0].markeringen.length];
    check('pc kijkt alleen nog mee: Cmd+Z doet niets (de collega houdt zijn bolletje)', u[0] === true && u[1] === 9, JSON.stringify(u));
    await pageB.evaluate(() => window.glasBewerkslotStop && glasBewerkslotStop());
    await ctxB.close();
    await weerBewerken(page);
    await sluitMeldingen(page);
    u = [await stappen(page), await bolNu(page)];
    await page.mouse.click(5, 5);
    await ongedaan(page); await wacht(1500);
    u.push(await bolNu(page), rijVan(1).data.fotos[0].markeringen.length);
    check('pc neemt het terug: de stand van de collega staat er, de oude stap is vervallen, Cmd+Z verandert niets',
      u[0] === 0 && u[1] === 9 && u[2] === 9 && u[3] === 9, JSON.stringify(u));
    await ctx.close();

    // Na een bestelling: ↶ na herladen draait de bestelling niet terug.
    bestelProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await vul(page, 'K1', 'opm-input', 'let op kit');
    await page.mouse.click(5, 5);
    await opgeslagen(page, () => dbRij('K1').opmerking === 'let op kit');
    await eersteBestelling(page);
    await sluitMeldingen(page);
    await herlaad(page);
    await page.mouse.click(5, 5);
    await ongedaan(page);
    await sluitMeldingen(page);
    u = [(await schermRij(page, 'K1')).opmerking];
    await ontgrendel(page);
    await sluitMeldingen(page);
    await page.mouse.click(5, 5);
    await ongedaan(page);
    await opgeslagen(page, () => dbRij('K1').opmerking === '');
    u.push((await schermRij(page, 'K1')).opmerking, (info().bestellingen || []).length, rijVan(1).status);
    check('besteld: Cmd+Z na herladen staat op slot; na ontgrendelen gaat de opmerking terug, de bestelling blijft',
      u[0] === 'let op kit' && u[1] === '' && u[2] === 1 && /besteld/.test(u[3]), JSON.stringify(u));
    await ctx.close();

    // Grens: 40 stappen, en in grootte.
    latProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.evaluate(() => { for (let i = 0; i < 45; i++) { bewaarStap('proef ' + i); rijen[0].opmerking = 'stap ' + i; opslaan(); } });
    await wacht(1200);
    await herlaad(page);
    check('hoogstens 40 stappen, ook na herladen', await stappen(page) === 40, await stappen(page));
    await page.evaluate(() => {
      const groot = 'x'.repeat(450000);
      for (let i = 0; i < 12; i++) { bewaarStap('groot ' + i); rijen[0].opmerking = groot + i; opslaan(); }
    });
    u = await page.evaluate(() => { const s = undoStapels(); return { n: s.terug.length, tekens: s.terug.reduce((a, x) => a + x.staat.length, 0) }; });
    check('grote stappen (tekenwerk): samen hoogstens 4 miljoen tekens, de oudste eruit', u.tekens <= 4000000 && u.n >= 5 && u.n < 12, JSON.stringify(u));
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Onlangs verwijderd');
    // a. iPad op de bouwplaats: per ongeluk de hele groep met 6 ruiten weg.
    blokProject();
    ({ ctx, page } = await apparaat(IPAD, 'ipad', 1));
    await page.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(300);
    await page.locator('#blok-' + FOTO + ' button:has-text("🗑 Groep")').tap();
    await wacht(300);
    await page.locator('.melding-laag .melding-knoppen button', { hasText: 'Ruiten ook weg' }).tap();
    await opgeslagen(page, () => !rijVan(1).data.rijen.some(r => r.merk === 'A') && wegLijst().length === 1);
    u = wegLijst()[0] || {};
    check('iPad: groep weg; in de database staat één item "Onlangs verwijderd" met 6 ruiten, foto en wie',
      (u.ruiten || []).length === 6 && u.foto && u.foto.pad === P(1) + '/gevel.jpg' && u.wie === 'julian' && /Voorgevel/.test(u.wat) && /6 ruiten/.test(u.wat),
      JSON.stringify(u).slice(0, 200));
    check('… de rest van het project is weg zoals gevraagd (alleen L1 over)', dbStand().merken === '7:L1' && dbStand().fotos === '', JSON.stringify(dbStand()));
    check('… het bestand van de foto staat nog in de opslag', S.opslag.has(P(1) + '/gevel.jpg'));
    check('… de controle van de database (script 28) neemt de stand aan', dbWeigert(rijVan(1).data) === null, dbWeigert(rijVan(1).data));
    t = await kortBer(page);
    check('… en de iPad zegt het, met ↶ Terugzetten', /Verwijderd: Foto «Voorgevel» met 6 ruiten/.test(t) && /Terugzetten/.test(t), t);
    t = await page.$eval('.verwijderd-knop', e => e.hidden ? '(verborgen)' : e.innerText).catch(() => '(geen)');
    check('… de knop "Onlangs verwijderd (1)" staat op Invoer', t === '🗑 Onlangs verwijderd (1)', t);
    check('… en de iPad kan het ook met ↶ terugdraaien (de stap staat op het apparaat)', await stappen(page) >= 1);
    await page.evaluate(() => window.glasBewerkslotStop && glasBewerkslotStop());
    await wacht(600);
    await page.goto('about:blank');
    const ipad = { ctx, page };
    // b. Kantoor (pc): ziet het, herlaadt, zet het met één klik terug.
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await herlaad(page);
    await page.click('.tab-btn:has-text("Project info")'); await wacht(300);
    t = await page.$eval('#projectVerwijderd', e => e.innerText.replace(/\s+/g, ' '));
    check('pc, Project info: "Onlangs verwijderd" met 1 onderdeel', /1 onderdeel in de afgelopen 30 dagen/.test(t) && /Bekijken en terugzetten \(1\)/.test(t), t);
    t = await venster(page);
    check('het venster: wat, door wie, wanneer, hoe lang nog', /Foto «Voorgevel» met 6 ruiten/.test(t) && /door julian · vandaag \d\d:\d\d · nog 30 dagen/.test(t), t);
    await terugzetten(page, 'Voorgevel');
    await page.click('.tab-btn:has-text("Invoer")'); await wacht(300);
    await opgeslagen(page, () => rijVan(1).data.rijen.some(r => r.merk === 'A') && !wegLijst().length);
    u = dbStand();
    check('terug: de 6 ruiten met hun nummers, de bolletjes en de foto (in de database)',
      u.merken === '1:A@f1 2:B@f1 3:C@f1 4:D@f1 5:E@f1 6:F@f1 7:L1' && u.bollen === 'f1:6' && u.fotos === 'f1=' + P(1) + '/gevel.jpg', JSON.stringify(u));
    check('… ook het tekenwerk op de foto', JSON.stringify(rijVan(1).data.fotos[0].inkt) === JSON.stringify([{ t: 'lijn', k: '#c62828', d: 4, p: [[100, 100], [300, 120]] }]));
    check('… de lijst is leeg, de knop op Invoer weg', !wegLijst().length && !(await page.locator('.verwijderd-knop:visible').count()));
    await page.waitForSelector('#doek-' + FOTO + ' .foto-mark', { timeout: 5000 });
    check('… op het scherm: 6 bolletjes op de foto', await page.locator('#doek-' + FOTO + ' .foto-mark').count() === 6);
    // ↶ na het terugzetten: weer weg (en het item weer in de lijst); ↷ weer terug.
    await page.mouse.click(5, 5);
    await ongedaan(page);
    u = [await page.evaluate(() => rijen.filter(r => r.fotoId === 'f1').length), (await wegScherm(page)).length];
    await page.keyboard.press('Control+Shift+z'); await wacht(500);
    u.push(await page.evaluate(() => rijen.filter(r => r.fotoId === 'f1').length), (await wegScherm(page)).length);
    check('Cmd+Z na terugzetten: weer weg en het item weer in de lijst; ↷: weer terug', JSON.stringify(u) === '[0,1,6,0]', JSON.stringify(u));
    await opgeslagen(page, () => rijVan(1).data.rijen.some(r => r.merk === 'A'));
    await page.evaluate(() => window.glasBewerkslotStop && glasBewerkslotStop());
    await ctx.close();
    // De iPad komt terug: zijn ↶ (met de stand van vóór het terugzetten) mag
    // het werk van kantoor niet weer weghalen.
    await open(ipad.page, 1);
    await wacht(1500);
    t = await kortBer(ipad.page);
    u = [await stappen(ipad.page)];
    await ipad.page.evaluate(() => ongedaan()); await wacht(1500);
    await sluitMeldingen(ipad.page);
    u.push(await ipad.page.evaluate(() => rijen.filter(r => r.fotoId === 'f1').length), dbStand().bollen);
    check('de iPad weer open: zijn oude ↶ is vervallen (bericht), ↶ haalt het teruggezette blok niet weg', u[0] === 0 && u[1] === 6 && u[2] === 'f1:6' &&
      /intussen op een ander apparaat of tabblad gewijzigd/.test(t), JSON.stringify(u) + ' | ' + t);
    await ipad.ctx.close();

    // c. Alleen de afbeelding (🗑 Foto), losse ruit (✕), selectie, tabel leeg.
    blokProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(300);
    await page.locator('#blok-' + FOTO + ' button:has-text("🗑 Foto")').click();
    await knop(page, 'Verwijderen');
    await wacht(400);
    u = await wegScherm(page);
    check('🗑 Foto: item "Alleen de foto … (de ruiten bleven staan)"', u.length === 1 && u[0].soort === 'afbeelding' && /Alleen de foto «Voorgevel»/.test(u[0].wat), JSON.stringify(u.map(x => x.wat)));
    await venster(page); await terugzetten(page, 'Alleen de foto');
    u = await page.evaluate(() => ({ pad: fotos[0].pad, bol: fotos[0].markeringen.length }));
    check('… terug: de foto in dezelfde groep, met de 6 bolletjes', u.pad === P(1) + '/gevel.jpg' && u.bol === 6, JSON.stringify(u));
    // ✕ bij L1 (losse maten): Terugzetten in het berichtje gaat via het item.
    await page.locator('#rij-7 .btn-del').click(); await wacht(400);
    check('✕ bij L1: item in de lijst', (await wegScherm(page)).length === 1);
    await page.locator('#kortBericht button', { hasText: 'Terugzetten' }).click(); await wacht(500);
    check('… ↶ Terugzetten in het berichtje: L1 terug én uit de lijst', await page.evaluate(() => rijen.some(r => r.id === 7 && r.merk === 'L1')) &&
      (await wegScherm(page)).length === 0, JSON.stringify((await wegScherm(page)).map(x => x.wat)));
    // Een regel via het bolletje ("Ruit verwijderen").
    await bolMenu(page, 'C', 1); await menuKnop(page, 'Ruit verwijderen'); await knop(page, 'Verwijderen');
    u = await wegScherm(page);
    check('bolletje → Ruit verwijderen: item "Ruit C (920 × 1200)" met zijn bolletje', u.length === 1 && u[0].wat === 'Ruit C (920 × 1200)' &&
      u[0].ruiten[0].bollen.length === 1, JSON.stringify(u.map(x => x.wat)));
    // Selectie (vinkjes) weg.
    await vinkAan(page, 'A'); await vinkAan(page, 'B');
    await page.click('#bulkBalk button:has-text("Geselecteerde verwijderen")', { timeout: 3000 });
    await knop(page, 'Verwijderen');
    u = await wegScherm(page);
    check('selectie A en B weg: één item "2 ruiten (A, B)"', u.length === 2 && u[1].wat === '2 ruiten (A, B)', JSON.stringify(u.map(x => x.wat)));
    // Tabel leegmaken.
    await page.locator('#blok-' + FOTO + ' .blok-bediening button:has-text("Leegmaken")').click();
    await knop(page, 'Verwijderen');
    u = await wegScherm(page);
    check('🗑 Leegmaken: item "3 ruiten (D, E, F) uit de tabel bij foto «Voorgevel»"', u.length === 3 && /^3 ruiten \(D, E, F\) uit de tabel bij foto «Voorgevel»$/.test(u[2].wat), JSON.stringify(u.map(x => x.wat)));
    await opgeslagen(page, () => wegLijst().length === 3);
    check('de database neemt het aan (script 28), en de bestellijst, Excel en pdf zien de lijst niet',
      dbWeigert(rijVan(1).data) === null && await page.evaluate(() => {
        const t = exportTabel(); const s = JSON.stringify(t);
        return !/"(A|B|C|D|E|F)"/.test(s) && bestellijstModel().regels.length === 1;
      }), dbWeigert(rijVan(1).data));
    // Alles terug, in een andere volgorde dan het wegging.
    await venster(page); await terugzetten(page, 'Ruit C');
    await venster(page); await terugzetten(page, 'uit de tabel');
    await venster(page); await terugzetten(page, '2 ruiten');
    await opgeslagen(page, () => !wegLijst().length);
    u = dbStand();
    check('alles terug, op zijn plek, met de bolletjes', u.merken === '1:A@f1 2:B@f1 3:C@f1 4:D@f1 5:E@f1 6:F@f1 7:L1' && u.bollen === 'f1:6', JSON.stringify(u));
    // Een ruit van een foto die er niet meer is: bij de losse maten.
    await bolMenu(page, 'A', 1); await menuKnop(page, 'Ruit verwijderen'); await knop(page, 'Verwijderen');
    await page.locator('#blok-' + FOTO + ' button:has-text("🗑 Groep")').click();
    await knop(page, 'Ruiten bewaren');
    await venster(page); await terugzetten(page, 'Ruit A');
    u = await page.evaluate(() => { const a = rijen.find(r => r.merk === 'A'); return { foto: a.fotoId || 'los', t: document.getElementById('kortBericht').innerText }; });
    check('een ruit van een foto die er niet meer is: terug bij de losse maten, en dat staat erbij', u.foto === 'los' && /bij de losse maten/.test(u.t), JSON.stringify(u));
    // En de groep (ruiten bleven staan): terug, met de ruiten weer in de groep.
    await venster(page); await terugzetten(page, 'Foto «Voorgevel» (de ruiten bleven staan)');
    u = await page.evaluate(() => ({ inGroep: rijen.filter(r => r.fotoId === 'f1').map(r => r.merk).join(''), bol: fotos[0].markeringen.length }));
    check('… de groep terug: de ruiten B–F weer in de groep, met hun bolletjes', u.inGroep === 'BCDEF' && u.bol === 5, JSON.stringify(u));
    await ctx.close();

    // d. Dubbele merkletter na terugzetten.
    blokProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.locator('#rij-7 .btn-del').click(); await wacht(300);
    await ruitErbij(page, { merk: 'L1', breedte: '500', hoogte: '500' });
    await venster(page); await terugzetten(page, 'Ruit L1');
    u = { t: await kortBer(page), balk: await page.$eval('#merkWaarschuwing', e => e.style.display !== 'none' ? e.innerText : '') };
    check('terug, maar intussen heeft een nieuwe ruit de letter L1: rode balk en het bericht zegt het', /L1/.test(u.balk) && /merkletter staat nu dubbel/.test(u.t), JSON.stringify(u));
    await ctx.close();

    // e. De foto van de leverlocatie: het bestand blijft staan.
    blokProject(p => { p.data.fotos.push({ id: 'lv1', soort: 'lever', pad: P(1) + '/lever.jpg', titel: 'Leverlocatie', breedte: 800, hoogte: 600, markeringen: [] }); });
    S.opslag.set(P(1) + '/lever.jpg', { grootte: 1000, type: 'image/jpeg' });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.waitForSelector('#leverFotoBlok button:has-text("🗑 Foto")', { timeout: 10000 });
    await page.locator('#leverFotoBlok button:has-text("🗑 Foto")').click();
    await knop(page, 'Verwijderen');
    await opgeslagen(page, () => !rijVan(1).data.fotos.some(f => f.soort === 'lever'));
    check('foto van de leverlocatie weg: het bestand staat nog in de opslag (tot v123 meteen weg)', S.opslag.has(P(1) + '/lever.jpg'));
    await venster(page); await terugzetten(page, 'leverlocatie');
    await opgeslagen(page, () => rijVan(1).data.fotos.some(f => f.soort === 'lever'));
    check('… en hij komt terug (zelfde bestand)', (rijVan(1).data.fotos.find(f => f.soort === 'lever') || {}).pad === P(1) + '/lever.jpg');
    await ctx.close();

    // f. Taken (eigen tabel): terug = opnieuw aanmaken met dezelfde velden.
    blokProject();
    S.db.gebruikers.push({ id: 'u2', naam: 'bart', email: 'bart@voorbeeld.test', actief: true });
    const T = (id, tekst, eig, naam, klaar) => ({ id: id, project_id: P(1), tekst: tekst, klaar: !!klaar, eigenaar: eig,
      eigenaar_naam: naam, aangemaakt_op: '2026-10-0' + id + 'T08:00:00Z' });
    S.db.taken.push(T('1', 'rooster nameten', 'u2', 'bart'), T('2', 'kit halen', null, ''), T('3', 'oud klaar', 'u1', 'julian', true));
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    // Eerst een gewone wijziging (een stap voor ↶), dan de taken weg.
    await page.evaluate(() => { bewaarStap('proef'); rijen[0].opmerking = 'x'; renderTabel(); opslaan(); });
    await page.click('.tab-btn:has-text("Project info")');
    await wachtTot(async () => (await page.$$('#takenLijst .taak')).length === 3, 8000);
    await page.locator('#takenLijst .taak').filter({ has: page.locator('input.taak-tekst[value="rooster nameten"]') }).locator('.taak-weg').click();
    await wachtTot(() => !S.db.taken.some(x => x.tekst === 'rooster nameten') && wegLijst().length === 1, 8000);
    await page.locator('#takenLijst .taak').filter({ has: page.locator('input.taak-tekst[value="kit halen"]') }).locator('.taak-weg').click();
    await wachtTot(() => wegLijst().length === 2, 8000);
    check('taken weg: twee items in de lijst (bij het project, op de server)', wegLijst().map(x => x.wat).join(' | ') === 'Taak «rooster nameten» | Taak «kit halen»',
      wegLijst().map(x => x.wat).join(' | '));
    // Een Cmd+Z van iets anders houdt de items van taken vast.
    await page.click('.tab-btn:has-text("Invoer")');
    await page.mouse.click(5, 5); await ongedaan(page);
    u = [await page.evaluate(() => rijen[0].opmerking), (await wegScherm(page)).length];
    check('… Cmd+Z van de wijziging van daarvóór laat de items van de taken staan (de taken zelf komen met ↶ niet terug)', u[0] === '' && u[1] === 2, JSON.stringify(u));
    await page.click('.tab-btn:has-text("Project info")');
    await venster(page); await terugzetten(page, 'rooster nameten');
    await venster(page); await terugzetten(page, 'kit halen');
    await wachtTot(() => S.db.taken.filter(x => /rooster nameten|kit halen/.test(x.tekst)).length === 2 && !wegLijst().length, 8000);
    u = S.db.taken.filter(x => /rooster nameten|kit halen/.test(x.tekst)).map(x => x.tekst + ':' + (x.eigenaar || '-') + ':' + (x.eigenaar_naam || '-') + ':' + !!x.klaar).sort();
    check('… terug in de tabel taken: zelfde tekst, eigenaar (bart / niemand) en status', JSON.stringify(u) === JSON.stringify(['kit halen:-:-:false', 'rooster nameten:u2:bart:false']), JSON.stringify(u));
    await wachtTot(async () => (await page.$$('#takenLijst .taak')).length === 3, 6000);
    check('… en op het scherm', (await page.$$('#takenLijst .taak')).length === 3);
    await ctx.close();

    // g. Na een bestelling: weg na de bestelling = annuleren; terug = niets te doen,
    //    of (als de annulering al verstuurd is) opnieuw bestellen.
    bestelProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await eersteBestelling(page);
    await sluitMeldingen(page);
    await ontgrendel(page);
    await sluitMeldingen(page);
    await page.locator('#rij-' + (await idOp(page, 'K2')) + ' .btn-del').click(); await wacht(400);
    t = ann(await bestelTekst(page));
    check('K2 weg na de bestelling: op de bestellijst "annuleren"', /K2/.test(t), t.slice(0, 200));
    await venster(page); await terugzetten(page, 'K2');
    t = await bestelTekst(page);
    check('… K2 terug (zelfde nummer en maten): niets meer te annuleren of te bestellen', !/ANNULEREN/.test(t) && /niets gewijzigd/.test(t) &&
      await page.evaluate(() => { const b = teBestellen(); return b.regels.length + b.vervallen.length + b.minder.length; }) === 0, t.slice(0, 260));
    // Weg, de annulering versturen, dan terug: K2 moet opnieuw besteld worden.
    await page.locator('#rij-' + (await idOp(page, 'K2')) + ' .btn-del').click(); await wacht(400);
    v = await bestel(page, { 'Laten annuleren?': 'Ja, laten annuleren' });
    await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
    check('… de annulering van K2 is verstuurd (2e bestellijst)', (info().bestellingen || []).length === 2 && /K2/.test(ann(plat(v.tekst || ''))),
      (info().bestellingen || []).length + ' | ' + gevraagd.join(' / ') + ' | ' + plat(v.tekst || '').slice(0, 200));
    await sluitMeldingen(page);
    if (await opSlot(page)) { await ontgrendel(page); await sluitMeldingen(page); }
    await venster(page); await terugzetten(page, 'K2');
    t = await kortBer(page);
    u = await page.evaluate(() => wijzigingenSindsBestelling().ouder.map(o => o.rij.merk + ':' + !!o.geannuleerd));
    check('… na een verstuurde annulering: K2 terug, het bericht zegt dat hij al geannuleerd is, en hij gaat niet stil mee (oudere stand)',
      JSON.stringify(u) === '["K2:true"]' && /K2 was al geannuleerd bij de leverancier \(2e bestellijst\)/.test(t), JSON.stringify(u) + ' | ' + t);
    // De bestellijst vraagt het: "Nee, toch zo bestellen", dan opnieuw maken.
    await page.click('button:has-text("⬇ Exporteren")');
    await page.click('button:has-text("Bestellijst als PDF")');
    v = await wachtOpMelding(page, /Oudere stand\?/, 8000);
    check('… de volgende bestellijst vraagt het ("Oudere stand?", K2 geannuleerd in de 2e)', v.ok && /K2 \(geannuleerd in de 2e bestellijst/.test(v.tekst), v.tekst.slice(0, 200));
    await knop(page, 'Nee, toch zo bestellen');
    await sluitMeldingen(page);
    v = await bestel(page);
    await wachtTot(() => (info().bestellingen || []).length === 3, 10000);
    const derde = (info().bestellingen || [])[2] || {};
    check('… "Nee, toch zo bestellen": K2 staat op de 3e bestellijst (opnieuw besteld)', !!(derde.ruiten && derde.ruiten[await idOp(page, 'K2')]),
      (info().bestellingen || []).length + ' | ' + gevraagd.join(' / ') + ' | ' + JSON.stringify(Object.keys(derde.ruiten || {})));
    await ctx.close();

    // h. Alleen kijken: de lijst zien, niet terugzetten.
    blokProject(p => { p.data.info.onlangsVerwijderd = [{ id: 'vproef1', soort: 'ruiten', wat: 'Ruit Q1 (500 × 500)', wie: 'bart', op: new Date().toISOString(),
      ruiten: [{ rij: ruit(40, 'Q1', '500', '500', KOMPLEET), plek: 0, bollen: [] }] }]; p.data.volgendId = 41; });
    const { ctx: ctxA, page: pageA } = await apparaat(null, 'pc', 1);
    ({ ctx, page } = await apparaat(IPAD, 'ipad', 1));
    await wachtTot(() => page.evaluate(() => !!(window.glasAlleenKijken && glasAlleenKijken())), 8000);
    await sluitMeldingen(page);
    t = await venster(page);
    u = [await page.locator('#verwijderdVenster button.vw-terug').isDisabled(), /alleen mee/.test(t)];
    await page.evaluate(() => glasVerwijderdTerug('vproef1'));
    await wacht(600);
    await sluitMeldingen(page);
    u.push(await page.evaluate(() => rijen.some(r => r.merk === 'Q1')));
    check('alleen kijken: de lijst is te zien, de knop staat uit en terugzetten gebeurt niet', u[0] === true && u[1] === true && u[2] === false, JSON.stringify(u) + ' ' + t.slice(0, 160));
    // In alleen kijken een taak weghalen: dan geen item in het project (dat zou een wijziging zijn).
    S.db.taken.push({ id: '9', project_id: P(1), tekst: 'proeftaak', klaar: false, eigenaar: 'u1', eigenaar_naam: 'julian' });
    await page.keyboard.press('Escape');
    await page.click('.tab-btn:has-text("Project info")');
    await page.evaluate(() => takenLaden()); await wacht(800);
    const voorKijk = JSON.stringify(rijVan(1).data);
    await page.locator('#takenLijst .taak').filter({ has: page.locator('input.taak-tekst[value="proeftaak"]') }).locator('.taak-weg').click();
    await wacht(1500);
    u = await page.evaluate(() => (projectInfo.onlangsVerwijderd || []).length);
    check('… een taak weghalen in alleen kijken zet geen item in het project', u === 1 && JSON.stringify(rijVan(1).data) === voorKijk, u);
    await ctx.close(); await ctxA.close();

    // i. 30 dagen, en een grens in aantal.
    const oud = d => new Date(Date.now() - d * 864e5).toISOString();
    blokProject(p => { p.data.info.onlangsVerwijderd = [
      { id: 'voud31', soort: 'ruiten', wat: 'Ruit X31', wie: 'bart', op: oud(31), ruiten: [{ rij: ruit(41, 'X31', '500', '500'), plek: 0, bollen: [] }] },
      { id: 'voud29', soort: 'ruiten', wat: 'Ruit X29', wie: 'bart', op: oud(29.2), ruiten: [{ rij: ruit(42, 'X29', '500', '500'), plek: 0, bollen: [] }] }]; p.data.volgendId = 43; });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    t = await venster(page);
    u = await page.$eval('.verwijderd-knop', e => e.hidden ? '(verborgen)' : e.innerText).catch(() => '(geen)');
    check('na 30 dagen niet meer in de lijst; 29 dagen oud: "nog 1 dag"', !/X31/.test(t) && /Ruit X29/.test(t) && /nog 1 dag/.test(t) &&
      u === '🗑 Onlangs verwijderd (1)', u + ' | ' + t.slice(0, 200));
    await page.keyboard.press('Escape');
    await page.evaluate(() => { for (let i = 0; i < 70; i++) { const r = nieuweRij(); r.merk = 'M' + i; r.breedte = '400'; rijen.push(r); glasVerwijderdRuiten([r.id]); rijen.pop(); } opslaan(); });
    await opgeslagen(page, () => wegLijst().length === 60);
    u = wegLijst();
    check('hoogstens 60 items; het oude van 31 dagen is bij het bijschrijven opgeruimd', u.length === 60 && !u.some(x => x.id === 'voud31') && u[u.length - 1].wat === 'Ruit M69', u.length + ' ' + (u[u.length - 1] || {}).wat);
    await ctx.close();

    // j. Telefoon (iPhone): de knop en het venster passen, Terugzetten 44 px.
    blokProject();
    ({ ctx, page } = await apparaat(IPHONE, 'iphone', 1));
    await page.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(300);
    await page.locator('#blok-' + FOTO + ' button:has-text("🗑 Groep")').tap(); await wacht(300);
    await page.locator('.melding-laag .melding-knoppen button', { hasText: 'Ruiten ook weg' }).tap(); await wacht(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    const knopT = page.locator('.verwijderd-knop');
    u = await knopT.boundingBox();
    await knopT.tap();
    await page.waitForSelector('#verwijderdVenster .vw-terug', { timeout: 4000 });
    v = await page.evaluate(() => {
      const k = document.querySelector('#verwijderdVenster .vw-terug').getBoundingClientRect();
      const ven = document.querySelector('#verwijderdVenster .melding-venster').getBoundingClientRect();
      const kruis = document.querySelector('#verwijderdVenster .sluit-x');
      const titels = [...document.querySelectorAll('#verwijderdVenster .vw-tekst b')].every(b => b.scrollWidth <= b.clientWidth + 1 && b.getBoundingClientRect().right <= ven.right);
      return { h: Math.round(k.height), w: Math.round(k.width), vw: Math.round(ven.width), rechts: Math.round(k.right), venster: Math.round(ven.right), breed: window.innerWidth,
               scroll: document.documentElement.scrollWidth - window.innerWidth, kruis: !!kruis, titels: titels };
    });
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v124-verwijderd-390.png') });
    check('iPhone: knop "Onlangs verwijderd" zichtbaar (44 px), venster past, Terugzetten 44 px, ✕ erop, niet zijwaarts schuiven',
      u && u.height >= 44 && v.h >= 44 && v.rechts <= v.venster && v.venster <= v.breed && v.scroll <= 0 && v.kruis, JSON.stringify([u, v]));
    check('… de omschrijving past (geen afgekapte tekst), Terugzetten over de hele breedte', v.titels && v.w >= v.vw - 60, JSON.stringify(v));
    await terugzetten(page, 'Voorgevel', true);
    await opgeslagen(page, () => rijVan(1).data.rijen.some(r => r.merk === 'A'));
    check('… met een tik terug (database)', dbStand().bollen === 'f1:6', JSON.stringify(dbStand()));
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Reparatieronde: werkvloer-foto, bolletjes op meer tekeningen, twee tabbladen, werkvloer');
    // a. Bart (kantoor) heeft stappen; Wim (werkvloer) voegt een foto toe die
    //    binnenkomt zonder nieuwe stand (glasErbijFotosErbij); ↶ ↶ mag hem niet weghalen.
    blokProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(300);
    await tikFoto(page, 0.3, 0.9); await tikFoto(page, 0.5, 0.9);
    await opgeslagen(page, () => rijVan(1).data.fotos[0].markeringen.length === 8);
    const r1 = rijVan(1);
    S.opslag.set(P(1) + '/werkvloer.jpg', { grootte: 1000, type: 'image/jpeg' });
    r1.data.fotos.push({ id: 'wv1', pad: P(1) + '/werkvloer.jpg', titel: 'Van de werkvloer', breedte: 800, hoogte: 600, inkt: [], markeringen: [],
      _erbij: { door: 'wim', op: new Date().toISOString(), rev: (parseInt(r1.data._rev, 10) || 0) + 1 } });
    r1.updated_at = new Date().toISOString();
    live('projecten', r1);
    await wachtTot(() => page.evaluate(() => fotos.some(f => f.id === 'wv1')), 8000);
    const heeftWv = () => page.evaluate(() => fotos.some(f => f.id === 'wv1'));
    const dbWv = () => (rijVan(1).data.fotos || []).some(f => f.id === 'wv1');
    check('vooraf: de werkvloer-foto is binnen, de ↶-stappen van Bart zijn er nog', await heeftWv() && await stappen(page) === 2, await stappen(page));
    await page.mouse.click(5, 5);
    await ongedaan(page); await ongedaan(page);
    await page.evaluate(() => opslaan()); await wacht(2000);
    u = [await bolNu(page), await heeftWv(), dbWv()];
    check('↶ ↶ tot vóór de foto: de 2 bolletjes weg, de werkvloer-foto blijft (scherm en database)', u[0] === 6 && u[1] && u[2], JSON.stringify(u));
    await page.keyboard.press('Control+Shift+z'); await wacht(500);
    await page.keyboard.press('Control+Shift+z'); await wacht(500);
    check('↷ ↷: de bolletjes terug, de foto nog steeds', await bolNu(page) === 8 && await heeftWv(), await bolNu(page));
    await opgeslagen(page, () => rijVan(1).data.fotos[0].markeringen.length === 8);
    await herlaad(page);
    await page.mouse.click(5, 5);
    await ongedaan(page); await ongedaan(page);
    await page.evaluate(() => opslaan()); await wacht(2000);
    u = [await bolNu(page), await heeftWv(), dbWv()];
    check('na herladen: ↶ ↶ haalt de werkvloer-foto ook niet weg', u[0] === 6 && u[1] && u[2], JSON.stringify(u));
    // Onlangs verwijderd: de groep weg, de werkvloer-foto komt binnen, terugzetten en ↶.
    await page.locator('#blok-' + FOTO + ' button:has-text("🗑 Groep")').click();
    await knop(page, 'Ruiten ook weg');
    await venster(page); await terugzetten(page, 'Voorgevel');
    await page.mouse.click(5, 5);
    await ongedaan(page); await ongedaan(page);
    u = [await heeftWv(), await page.evaluate(() => rijen.filter(r => r.fotoId === 'f1').length)];
    check('groep weg, terugzetten, ↶ ↶: het blok is terug zoals vóór het weghalen, de werkvloer-foto blijft', u[0] && u[1] === 6, JSON.stringify(u));
    await ctx.close();

    // b. Bolletjes op meer tekeningen.
    tweeTekeningen();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.waitForSelector('#img-f2', { timeout: 10000 }); await wacht(300);
    const voorAlles = await ruitTekeningen(page);
    check('vooraf: B thuis op tekening 2 (2 bolletjes) en 1 op tekening 1; C thuis op 1, ook 1 op 2',
      voorAlles === 'A@f1 f1:1 | B@f2 f1:1 f2:2 | C@f1 f1:1 f2:1 | D@f2 f2:1 | L1@los', voorAlles);
    await page.locator('#rij-2 .btn-del').first().click(); await wacht(400);
    check('✕ bij B: ook zijn bolletje op tekening 1 is weg', !/B@/.test(await ruitTekeningen(page)) &&
      await page.evaluate(() => !fotos.some(f => f.markeringen.some(m => m.rijId === 2))));
    await venster(page); await terugzetten(page, 'Regel B');
    t = await ruitTekeningen(page);
    check('B terug: 1 bolletje op tekening 1 en 2 op tekening 2, in het blok van tekening 2', t === voorAlles, t);
    await page.locator('#blok-f2 button:has-text("🗑 Groep")').click();
    await knop(page, 'Ruiten ook weg');
    t = await ruitTekeningen(page);
    check('‹Ruiten ook weg› bij tekening 2: B en D weg, ook hun bolletjes op tekening 1 (geen losse bolletjes)',
      t === 'A@f1 f1:1 | C@f1 f1:1 | L1@los' && await page.evaluate(() => fotos[0].markeringen.every(m => rijen.some(r => r.id === m.rijId))), t);
    await venster(page); await terugzetten(page, 'Tekening 2');
    await opgeslagen(page, () => (rijVan(1).data.fotos || []).length === 2);
    t = await ruitTekeningen(page);
    check('tekening 2 terug: B (ook zijn bolletje op 1), D, en C weer met zijn bolletje op tekening 2', t === voorAlles, t);
    // Alleen de afbeelding van tekening 2 weg en terug.
    await page.locator('#blok-f2 button:has-text("🗑 Tekening"), #blok-f2 button:has-text("🗑 Foto")').first().click();
    await knop(page, 'Verwijderen');
    await venster(page); await terugzetten(page, 'Alleen de');
    t = await ruitTekeningen(page);
    check('alleen de afbeelding van tekening 2 weg en terug: alle bolletjes erop terug, ook die van C', t === voorAlles, t);
    // B terug terwijl tekening 2 er niet meer is: naar tekening 1, met zijn bolletje daar.
    await page.locator('#rij-2 .btn-del').first().click(); await wacht(400);
    await page.locator('#blok-f2 button:has-text("🗑 Groep")').click();
    await knop(page, 'Ruiten ook weg');
    await venster(page); await terugzetten(page, 'Regel B');
    t = await ruitTekeningen(page);
    check('B terug terwijl tekening 2 weg is: B in het blok van tekening 1, met zijn bolletje daar', /B@f1 f1:1( |$)/.test(t) && !/B@los/.test(t), t);
    check('… en de database neemt het aan (script 28)', dbWeigert(rijVan(1).data) === null);
    await ctx.close();

    // c. Twee tabbladen op dezelfde pc; in tabblad A staat de cursor nog in een vak.
    gevelProject();
    const ctxT = await nieuweContext(null, 'pc');
    const pA = await nieuwePagina(ctxT);
    await open(pA, 1);
    await pA.waitForSelector('#img-' + FOTO, { timeout: 10000 }); await wacht(300);
    await tikFoto(pA, 0.3, 0.9);
    await opgeslagen(pA, () => rijVan(1).data.fotos[0].markeringen.length === 8);
    await wacht(800);
    const pB = await nieuwePagina(ctxT);
    await open(pB, 1);
    await pA.bringToFront();
    await pA.click('#rij-' + (await idOp(pA, 'A')) + ' .opm-input'); await wacht(300);
    await pB.evaluate(() => { bewaarStap('in B'); rijen.find(r => r.merk === 'D').opmerking = 'van tabblad B'; renderTabel(); opslaan(); });
    await wachtTot(() => dbRij('D').opmerking === 'van tabblad B', 8000);
    await wachtTot(() => pA.evaluate(() => /versie laden/i.test((document.getElementById('syncMelding') || {}).innerText || '')), 8000);
    await pA.mouse.click(5, 5); await wacht(300);
    await blokU(pA, FOTO);
    u = [await bolNu(pA), await kortBer(pA)];
    check('tabblad A (nieuwere stand wacht): ↶ in de tabel draait niet terug, maar zegt het', u[0] === 8 && /nieuwere stand van dit project klaar/.test(u[1]), JSON.stringify(u));
    await pA.keyboard.press('Control+z'); await wacht(500);
    u = [await bolNu(pA), await kortBer(pA)];
    check('… Cmd+Z ook niet', u[0] === 8 && /nieuwere stand/.test(u[1]), JSON.stringify(u));
    await wacht(2500);
    check('… de database houdt het werk van tabblad B, en er staat niets "apart"', dbRij('D').opmerking === 'van tabblad B' &&
      rijVan(1).data.fotos[0].markeringen.length === 8 && !apartBewaard().length, JSON.stringify(apartBewaard().map(x => x.naam)));
    await pA.locator('#kortBericht button', { hasText: 'Nieuwe stand laden' }).click();
    await wachtTot(() => pA.evaluate(() => rijen.find(r => r.merk === 'D').opmerking === 'van tabblad B'), 8000);
    await pA.mouse.click(5, 5);
    await pA.keyboard.press('Control+z'); await wacht(500);
    u = [await pA.evaluate(() => rijen.find(r => r.merk === 'D').opmerking), await bolNu(pA)];
    check('‹Nieuwe stand laden›: A heeft het werk van B; daarna draait ↶ dat niet terug', u[0] === 'van tabblad B' && u[1] === 8, JSON.stringify(u));
    await ctxT.close();

    // d. De werkvloer (nagebootst: rechten.js glasWerkvloer) ziet de lijst, maar
    //    zonder ‹Toch bewerken› (die heeft hij niet).
    blokProject(p => { p.data.info.onlangsVerwijderd = [{ id: 'vwv1', soort: 'ruiten', wat: 'Ruit Q1 (500 × 500)', wie: 'bart', op: new Date().toISOString(),
      ruiten: [{ rij: ruit(40, 'Q1', '500', '500', KOMPLEET), plek: 0, bollen: [] }] }]; p.data.volgendId = 41; });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.evaluate(() => { window.glasWerkvloer = () => true; });
    t = await venster(page);
    check('werkvloer: "Terugzetten kan alleen een collega of de beheerder.", knop uit, geen ‹Toch bewerken›',
      /Terugzetten kan alleen een collega of de beheerder/.test(t) && !/Toch bewerken/.test(t) &&
      await page.locator('#verwijderdVenster button.vw-terug').isDisabled(), t.slice(0, 220));
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4') && PLAATJES) {
    console.log('\n4. Schermafdrukken');
    for (const [naam, opt] of [['1280', null], ['820', IPAD], ['390', IPHONE]]) {
      blokProject(p => { p.data.info.onlangsVerwijderd = [
        { id: 'va', soort: 'ruiten', wat: '3 ruiten (D, E, F) uit de tabel bij foto «Achtergevel»', wie: 'bart', op: new Date(Date.now() - 864e5 * 2).toISOString(), ruiten: [] },
        { id: 'vb', soort: 'taken', wat: 'Taak «rooster nameten»', wie: 'julian', op: new Date(Date.now() - 3600e3).toISOString(), taken: [{ tekst: 'rooster nameten' }] }]; });
      ({ ctx, page } = await apparaat(opt, 'x' + naam, 1));
      await wacht(600);
      await page.screenshot({ path: path.join(PLAATJES, 'v124-invoer-' + naam + '.png') });
      await venster(page);
      await page.screenshot({ path: path.join(PLAATJES, 'v124-venster-' + naam + '.png') });
      await page.keyboard.press('Escape');
      await page.click('.tab-btn:has-text("Project info")'); await wacht(400);
      await page.locator('#projectVerwijderd').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(PLAATJES, 'v124-pi-' + naam + '.png') });
      await ctx.close();
    }
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
