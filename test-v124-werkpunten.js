/* Testreeks v124 (werkpunten van Jan) — node test-v124-werkpunten.js
   (en: --mutaties, of --mutaties naam1,naam2; PLAATJES=map voor schermafdrukken
   op 1280, iPad 820 en telefoon 390, en de pdf's als afbeelding)

   Drie werkpunten (keuzes Jan, 26-10-2026). Per onderdeel de vijf vragen.

   1. Projectnaam altijd bovenaan.
      Situatie: Bart heeft op de iPad (staand) een lang project open en
      scrolt door veertig ruiten; Jan doet hetzelfde op kantoor (1280) en
      op zijn iPhone (390). Belofte: de naam van het open project staat
      altijd in de balk die bovenaan blijft staan (bij de tabbladen),
      ingekort met … als hij lang is (hele naam als title en na een tik),
      verandert direct mee bij typen, ongedaan maken en een ander project;
      geen naam = "(naamloos)"; op het startscherm geen naam. Wat gaat er
      mis als het niet klopt: hij meet in het verkeerde project (geen
      gegevensverlies, wel verkeerde ruiten). Halverwege: scrollen, een
      ander project openen, ongedaan maken (zet de naam zonder event).
      Opstelling: Chromium met de schermmaten; Safari zelf (sticky,
      iOS-balk) is hier niet te testen.
   2. Max glaspakket incl. band uit een import.
      Situatie: kantoor krijgt van de kozijnfabriek een maatstaat (xlsx,
      kop "Aantal | Breedte (mm) | Hoogte (mm) | Merk | Max incl. band",
      waarde "28mm"; ook als csv uit Excel op Windows: ; en Windows-1252).
      Belofte: de kolom wordt herkend (ook andere koppen met die strekking,
      niet "Opmerking", "Max breedte", "Maximale hoogte", "Band"), en de app
      rekent meteen uit wat er past (stap 3 zegt het).
   3. Op de iPad bij max 28 mm: te dikke opbouwen grijs, een glastype zonder
      passende opbouw (triple) grijs en NIET te kiezen, met de reden;
      doorvoeren (⤓) en gelijktrekken slaan te dik over met een melding; wat
      er al stond wordt niet stil veranderd maar rood; de band (binnen +
      buiten) telt mee; een opbouw zonder bekende dikte houdt het type
      kiesbaar (zoals sinds v117 bij de opbouw). Wat gaat er mis: glas dat
      niet in het kozijn past wordt besteld (geld, tijd). Halverwege: band
      wijzigen op Toebehoren; een ander pad dan de keuzelijst (Toebehoren,
      oud apparaat).
   4. Spacer standaard zilver of zwart.
      Situatie: Jan kiest bij twee ruiten met HR++ een zwarte spacer, bestelt,
      en zet er later één terug op zilver. Belofte: zwart staat op de
      bestellijst en de bestel-pdf (kolom Spacer), zilver nergens; alleen bij
      glas met een spouw; ⤓ en ⧉ nemen hem mee; Excel heen en terug; pdf
      invoer; Samenvatting; na de bestelling zwart → zilver = een wijziging
      (VERVANGT, met de reden). Wat gaat er mis: verkeerde spacer geleverd.
   5. Een oud project (echt besteld met v123, zonder spacer) in v124: géén
      enkele "gewijzigd" (anders: alles opnieuw besteld). Halverwege: een
      oud apparaat (v123) dat een bestelling inkort en het veld niet kent.
   Opstelling: de nagebootste database van test-v123 (node) en echte
   Chromium; iPad en telefoon als Chromium-profiel met aanraken; v123 zelf
   (OUD123=/tmp/live123: git archive van v123, commit b9296d7) draait in een eigen server voor de echte
   oude bestelling. Echte Safari, iPad, Android en Windows: niet hier. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  // 1. projectnaam
  kopNaam: ['start.js', "    if (b && b.textContent !== tekst) b.textContent = tekst;", ""],
  kopZicht: ['start.js', "    vast.hidden = !open;", "    vast.hidden = true;"],
  kopTypen: ['start.js', "    vak.addEventListener('input', window.zetProjectKop);", ""],
  kopZetter: ['start.js', "        set: function (v) { d.set.call(this, v); planKop(); }", "        set: function (v) { d.set.call(this, v); }"],
  kopMeten: ['start.js', "    vast.classList.toggle('open');\n    if (window.meetVasteKop) meetVasteKop();", "    vast.classList.toggle('open');"],
  kopBreed: ['index.html', "      flex: 1 1 0; order: 2; align-items: center; justify-content: flex-end;", "      flex: 0 0 100%; order: 2; align-items: center; justify-content: flex-end;"],
  kopTabs: ['index.html', "    .vaste-kop > .tabs { flex: 0 0 auto; order: 1; min-width: auto; }", "    .vaste-kop > .tabs { flex: 1 1 0; order: 1; }"],
  kopKort: ['index.html', "    flex: 0 1 auto; min-width: 0; color: var(--blauw); font-weight: 700;\n    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
                          "    flex: 0 1 auto; min-width: 0; color: var(--blauw); font-weight: 700;"],
  // 2. import
  pakketHerken: ['import.js', "    if (h[0] === 'maxPakket') sc = Math.max(sc, pakketKopScore(s));", ""],
  pakketMaxAlleen: ['import.js', "    if (max && (dikte || band)) return 2;", "    if (max) return 2;"],
  pakketInclDikte: ['import.js', "    if (inclBand && dikte) return 2;", ""],
  pakketInfo: ['import.js', "    var letOpHtml = zonderGetalHtml + maxPastHtml(o.goed) + (pakketMis.length", "    var letOpHtml = zonderGetalHtml + (pakketMis.length"],
  // 3. keuzelijsten, doorvoeren, gelijktrekken
  typeGrijs: ['naslag.js', "    if (m && !m.kan) { dik.push([t, m]); kop = maxKopje(m); return; }", ""],
  typeOnbekend: ['latten.js', "    uit.kan = uit.past > 0 || uit.onbekend > 0 || !(opbouwen || []).length;", "    uit.kan = uit.past > 0;"],
  typeBand: ['latten.js', "    var band = u.bandBinnen + u.bandBuiten;", "    var band = 6;"],
  typeRood: ['index.html', "${typeMx ? ' class=\"te-dik\" title=\"' + esc(typeMx) + '\"' : ''}", "", "      typEl.classList.toggle('te-dik', !!tm);", ""],
  typeAnderPad: ['index.html', "  if (teDik) {\n    if (window.kortBericht) kortBericht(teDik + ' Niet gekozen.', { soort: 'fout' });", "  if (false) {\n    if (window.kortBericht) kortBericht(teDik + ' Niet gekozen.', { soort: 'fout' });"],
  bulkType: ['bulk.js', "        if ((type && type !== r.glasType && window.glasTypeTeDik && glasTypeTeDik(r, type)) ||", "        if ((false) ||"],
  bulkOpbouw: ['bulk.js', "    return !!(G && G.opbouwTeDik && r.maxPakket && e && G.opbouwTeDik(r, e.totaal));", "    return false;"],
  bulkMelding: ['bulk.js', "    if (teDik.length && window.appMelding) {", "    if (false) {"],
  gelijkMax: ['kopie.js', "NIET_OVERNEMEN[veld] || veld === 'maxPakket' ||", "NIET_OVERNEMEN[veld] ||"],
  gelijkTeDik: ['kopie.js', "      if (e && G.opbouwTeDik(r, e.totaal)) { teDik.push(r.merk || '?'); return false; }", ""],
  // 4. spacer
  spacerKenmerk: ['index.html', "    (spacerZwart(rij) ? '|sp:zwart' : '');", "    '';"],
  spacerMoment: ['index.html', "  'biColor', 'ralBinnen',   // v114\n  'spacer']);   // v124", "  'biColor', 'ralBinnen']);"],
  spacerSpouw: ['index.html', "  if (r.opbouw) return SPOUW_RE.test(String(r.opbouw));", "  if (r.opbouw) return true;"],
  spacerBulk: ['bulk.js', "        mag: function (r, v) { return v !== 'zwart' || !window.glasHeeftSpouw || glasHeeftSpouw(r); },", "        mag: function () { return true; },"],
  spacerLijst: ['pdf.js', "      { kop: 'Spacer',     w: 13, haal: function (r) { return window.spacerZwart && spacerZwart(r) ? 'zwart' : ''; } },", ""],
  spacerInvoerPdf: ['pdf.js', "      { kop: 'Spacer',    w: 15, haal: function (r) { return window.spacerZwart && spacerZwart(r) ? 'zwart' : ''; } },", ""],
  spacerWijz: ['pdf.js', "      was += ', spacer ' + (spacerZwart(oud) ? 'zwart' : 'standaard zilver');", ""],
  spacerVerschil: ['index.html', "    if (a !== b) uit.push('spacer ' + (a ? 'zwart' : 'standaard zilver') + ' → ' + (b ? 'zwart' : 'standaard zilver'));", ""],
  spacerSamen: ['index.html', "  const metSpacer = ingevuld.some(spacerZwart);", "  const metSpacer = false;"],
  spacerExport: ['index.html', "      getal(r.maxPakket), spacerZwart(r) ? 'zwart' : (heeftSpouw(r) ? 'zilver' : '')", "      getal(r.maxPakket), heeftSpouw(r) ? 'zilver' : ''"],
  spacerImport: ['import.js', "      if (o.spacer === 'zwart') r.spacer = 'zwart';", ""],
  spacerTerug: ['index.html', "      if (kortBewaard(oud, 'spacer')) { if (oud.spacer === undefined) delete doel.spacer; else doel.spacer = oud.spacer; }", ""],
  // 5. oud project, ingekorte bestellingen
  spacerAltijd: ['index.html', "    (spacerZwart(rij) ? '|sp:zwart' : '');", "    ('|sp:' + (rij.spacer || 'zilver'));"],
  spacerKort: ['index.html', "      const was = ruitKenmerk(zonder) === oud.k ? false : ruitKenmerk(met) === oud.k ? true : null;", "      const was = null;"],
  spacerKortBewaard: ['index.html', "  if (v === 'spacer') return oud.spacer !== undefined;", "  if (v === 'spacer') return true;"],
};
const WAAR = {
  kopNaam: '1', kopZicht: '1', kopTypen: '1', kopZetter: '1', kopMeten: '1', kopBreed: '1', kopTabs: '1', kopKort: '1',
  pakketHerken: '2', pakketMaxAlleen: '2', pakketInclDikte: '2', pakketInfo: '2',
  typeGrijs: '3', typeOnbekend: '3', typeBand: '3', typeRood: '3', typeAnderPad: '3', bulkType: '3', bulkOpbouw: '3', bulkMelding: '3',
  gelijkMax: '3', gelijkTeDik: '3',
  spacerKenmerk: '4', spacerMoment: '4', spacerSpouw: '4', spacerBulk: '4', spacerLijst: '4', spacerInvoerPdf: '4', spacerWijz: '4',
  spacerVerschil: '4', spacerSamen: '4', spacerExport: '4', spacerImport: '4', spacerTerug: '4',
  spacerAltijd: '5', spacerKort: '5', spacerKortBewaard: '5'
};

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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v124wp-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v124wp-pdf-'));
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
const XLSX = require(path.join(__dirname, 'lib/xlsx-0.18.5/xlsx.full.min.js'));
const TELEFOON = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const PC = { viewport: { width: 1280, height: 800 } };
const LANG = 'Renovatie kozijnen Dorpsstraat 112 achtergevel en zijgevel, fase 2';
const TRIPLE = 'HR+++ glas (Triple)';
// Een project met veel ruiten (lange pagina, om te scrollen).
function veelRuiten(naam) {
  resetDb();
  const p = rijVan(1);
  p.naam = p.data.project = naam;
  p.data.rijen = Array.from({ length: 40 }, (x, i) => ruit(i + 1, 'R' + (i + 1), String(800 + i * 10), '1200', KOMPLEET));
  p.data.volgendId = 41;
}
// De vaste kop: waar staat de naam, en waar de tabbladen?
const kopStand = page => page.evaluate(() => {
  const v = document.getElementById('vasteProjectNaam'), b = v.querySelector('.vpn-naam');
  const r = v.getBoundingClientRect();
  const tabs = [...document.querySelectorAll('#vasteKop .tab-btn')].map(t => t.getBoundingClientRect());
  const tabsRij = document.querySelector('#vasteKop .tabs').getBoundingClientRect();
  const overlap = tabs.some(t => !(t.right <= r.left + 0.5 || t.left >= r.right - 0.5 || t.bottom <= r.top + 0.5 || t.top >= r.bottom - 0.5));
  return { zicht: !v.hidden && r.height > 0 && r.top >= -1 && r.bottom <= window.innerHeight, boven: Math.round(r.top), hoog: Math.round(r.height),
           links: Math.round(r.left), rechts: Math.round(r.right), naamHoog: Math.round(b.getBoundingClientRect().height), tekst: b.textContent, titel: v.title, ingekort: b.scrollWidth > b.clientWidth + 1,
           open: v.classList.contains('open'), overlap, tabsZicht: tabs.length === 6 && tabs[0].top >= -1 && tabs[0].bottom <= window.innerHeight && tabs[0].left >= -1 && tabs[0].height > 20,
           tabHoog: Math.round(Math.max(...tabs.map(t => t.height))), tabsBoven: Math.round(tabsRij.top), tabsOnder: Math.round(tabsRij.bottom),
           kopH: getComputedStyle(document.documentElement).getPropertyValue('--vaste-kop-h').trim(),
           kopEcht: Math.round(document.getElementById('vasteKop').getBoundingClientRect().height),
           pagina: document.documentElement.scrollWidth - window.innerWidth };
});
// Een maatstaat zoals die van de kozijnfabriek (opbouw van een echte SPONNINGMATEN-lijst,
// met verzonnen gegevens): vier regels kop, dan de kolommen.
function maatstaatXlsx(kopMax, rijenIn) {
  const aoa = [['SPONNINGMATEN LIJST'], [' van project: 990001'], ['Voorbeeld Kozijnen'], ['Jelier Bouw B.V.'],
               ['Aantal', 'Breedte (mm)', 'Hoogte (mm)', 'Merk', kopMax]].concat(rijenIn);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'SPONNINGMATEN 990001');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
async function importBestand(page, naam, mime, buffer) {
  await page.click('button:has-text("⬆ Importeren")');
  await page.click('.veld-menu button:has-text("Sponningmaten")');
  await page.waitForSelector('#impStap1', { state: 'visible' });
  await wacht(400);
  await page.setInputFiles('#impBestand', { name: naam, mimeType: mime, buffer: buffer });
  const ok = await page.waitForSelector('#impStap2', { state: 'visible', timeout: 15000 }).then(() => true, () => false);
  if (!ok) check('het bestand ' + naam + ' wordt ingelezen', false, await page.$eval('#impMelding', e => e.textContent).catch(() => '?'));
}
const kopVan = (page, kol) => page.$$eval('#impVoorbeeld th select', s => s.map(x => x.value));
// De opties van een keuzelijst: waarde, tekst, uit, grijs, groep.
const opties = (page, sel) => page.$$eval(sel + ' option', l => l.map(o => ({ v: o.value, t: o.textContent, uit: o.disabled,
  grijs: o.classList.contains('niet-lever'), groep: o.parentNode.tagName === 'OPTGROUP' ? o.parentNode.label : '' })));
const ruitenVan = n => (rijVan(n).data.rijen || []).filter(r => r.breedte || r.hoogte || r.merk);
const rijDb = (n, merk) => (rijVan(n).data.rijen || []).find(r => r.merk === merk) || {};
// Een kopie van v123 (de versie die nu live gaat; de echte oude bestelling).
const OUD123 = process.env.OUD123 || '/tmp/live123';
function oudeServer() {
  const wortel = fs.mkdtempSync(path.join(os.tmpdir(), 'v124wp-oud-'));
  fs.cpSync(OUD123, wortel, { recursive: true });
  fs.writeFileSync(path.join(wortel, 'config.js'), 'window.GLASOPNAME_CONFIG = { url: "https://test.supabase.co", anonKey: "sb_publishable_test" };\n');
  return http.createServer(function (req, res) {
    let naam = decodeURIComponent(req.url.split('?')[0]);
    if (naam === '/') naam = '/index.html';
    if (naam.indexOf('/lib/supabase-js') === 0) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(NAMAAK); return; }
    const bestand = path.join(wortel, naam);
    if (!bestand.startsWith(wortel) || !fs.existsSync(bestand) || fs.statSync(bestand).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(bestand)] || 'application/octet-stream' });
    res.end(fs.readFileSync(bestand));
  });
}
// Een pdf-pagina als plaatje (pdftoppm), om hem te bekijken.
function pdfPlaatje(pdf, naam, blad) {
  if (!PLAATJES || !pdf) return;
  const b = String(blad || 1);
  spawnSync('pdftoppm', ['-png', '-r', '70', '-f', b, '-l', b, pdf, path.join(PLAATJES, naam)]);
}

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, t, u, v, m, id;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. De projectnaam altijd bovenaan (vaste kop)');
    for (const [naam, opt] of [['1280', PC], ['820', IPAD], ['390', TELEFOON]]) {
      veelRuiten(LANG);
      S.slot = {};
      ({ ctx, page } = await apparaat(opt, 'pc' + naam, 1));
      m = await kopStand(page);
      check(naam + ': de naam staat in de vaste kop, bij de tabbladen', m.zicht && m.tekst === LANG && m.tabsZicht && !m.overlap, JSON.stringify(m));
      check(naam + ': lang = ingekort (…), de hele naam als title', (naam === '390' ? m.ingekort : true) && m.titel.indexOf(LANG) === 0, JSON.stringify(m));
      check(naam + ': één regel, de tabbladen ook (niet afgebroken), niets schuift opzij', m.naamHoog <= 24 && (naam === '1280' || m.hoog <= 32) && m.tabHoog <= 50 && m.pagina <= 1, JSON.stringify(m));
      if (naam === '1280') check('1280: rechts naast de tabbladen (zelfde regel)', m.links > 700 && m.boven < m.tabsOnder && m.boven + m.hoog > m.tabsBoven, JSON.stringify(m));
      else check(naam + ': een dunne regel boven de tabbladen', m.boven + m.hoog <= m.tabsBoven + 1, JSON.stringify(m));
      await page.evaluate(() => window.scrollTo(0, 2500)); await wacht(500);
      m = await kopStand(page);
      check(naam + ': na scrollen (2500 px) staat hij nog bovenaan in beeld', m.zicht && m.boven >= -1 && m.boven <= 60 && m.tabsZicht && !m.overlap, JSON.stringify(m));
      check(naam + ': de hoogte van de vaste kop klopt (kolomkoppen kleven eronder)', m.kopH === m.kopEcht + 'px', m.kopH + ' / ' + m.kopEcht);
      if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v124-naam-' + naam + '-gescrold.png') });
      if (naam === '390') {
        // Een tik: de hele naam; nog een tik: weer kort.
        await page.locator('#vasteProjectNaam').tap();
        await wacht(300);
        m = await kopStand(page);
        check('390: na een tik de hele naam (niet meer ingekort), de kop is opnieuw gemeten', m.open && !m.ingekort && m.naamHoog > 24 && m.kopH === m.kopEcht + 'px' && m.tabsZicht, JSON.stringify(m));
        if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v124-naam-390-open.png') });
        await page.locator('#vasteProjectNaam').tap();
        await wacht(300);
        m = await kopStand(page);
        check('390: nog een tik: weer één regel', !m.open && m.ingekort && m.naamHoog <= 24, JSON.stringify(m));
      }
      await ctx.close();
    }
    // Typen, ongedaan maken, leeg, ander project, startscherm (pc, echte toetsen).
    resetDb(); S.slot = {};
    ({ ctx, page } = await apparaat(PC, 'pc', 1));
    await page.click('#projectNaam');
    await page.keyboard.press('End');
    await page.keyboard.type(' achter');
    m = await kopStand(page);
    check('typen in het vak Project: de kop verandert direct mee (vóór het opslaan)', m.tekst === 'Kerkstraat 1 achter', m.tekst);
    await page.evaluate(() => document.activeElement.blur()); await wacht(300);
    await wachtTot(() => rijVan(1).data.project === 'Kerkstraat 1 achter', 6000);
    // Een collega kijkt mee op de iPad (alleen kijken) en krijgt de nieuwe naam
    // binnen via de server (live): de app zet dan alleen de waarde van het vak,
    // zonder typen. De kop moet toch mee.
    const mee = await apparaat(IPAD, 'ipad', 1);
    check('vooraf: de iPad kijkt mee met de oude naam', (await kopStand(mee.page)).tekst === 'Kerkstraat 1 achter');
    await page.fill('#projectNaam', 'Kerkstraat 1 voorzijde');
    await wachtTot(() => rijVan(1).data.project === 'Kerkstraat 1 voorzijde', 6000);
    const binnen = await wachtTot(async () => (await mee.page.inputValue('#projectNaam')) === 'Kerkstraat 1 voorzijde', 8000);
    await wacht(300);
    m = await kopStand(mee.page);
    check('de naam komt op de iPad binnen (live, zonder typen): de kop volgt', binnen && m.tekst === 'Kerkstraat 1 voorzijde', (await mee.page.inputValue('#projectNaam')) + ' / ' + m.tekst);
    await mee.ctx.close();
    await page.fill('#projectNaam', '');
    m = await kopStand(page);
    check('geen naam: "(naamloos)"', m.tekst === '(naamloos)' && m.zicht, JSON.stringify(m));
    await page.fill('#projectNaam', 'Kerkstraat 1');
    await wacht(800);
    await page.click('#cloudProjectKnop');
    await page.waitForSelector('#startScherm:not([hidden])', { timeout: 10000 });
    await wacht(600);
    u = await page.evaluate(() => ({ hidden: document.getElementById('vasteProjectNaam').hidden,
      zicht: document.getElementById('vasteProjectNaam').getBoundingClientRect().height > 0 }));
    check('startscherm: geen projectnaam', u.hidden && !u.zicht, JSON.stringify(u));
    await page.locator('#startProjecten .start-project-info').filter({ hasText: 'Molenweg 2' }).first().click();
    await page.waitForFunction(id => window.glasProjectId === id, P(2), { timeout: 10000 });
    await wacht(800);
    m = await kopStand(page);
    check('een ander project openen: de kop zegt "Molenweg 2"', m.tekst === 'Molenweg 2' && m.zicht, JSON.stringify(m));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Import: max glaspakket incl. band, ook met een andere kop');
    resetDb(); S.slot = {}; rijVan(2).data.rijen = []; rijVan(2).data.volgendId = 1;
    ({ ctx, page } = await apparaat(PC, 'pc', 2));
    const xlsx = maatstaatXlsx('Max incl. band', [[3, 976, 572, 'A', '28mm'], [3, 977, 1079, 'A', '28mm'], [1, 988, 572, 'B', '28mm'], [2, 640, 1180, 'C', '30 mm']]);
    await importBestand(page, 'SPONNINGMATEN_990001.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xlsx);
    u = await kopVan(page);
    check('xlsx van de kozijnfabriek: "Max incl. band" wordt Max glaspakket (en de rest goed)', JSON.stringify(u) === JSON.stringify(['aantal', 'breedte', 'hoogte', 'merk', 'maxPakket']), JSON.stringify(u));
    await importControleer(page);
    t = await stap3(page);
    check('stap 3: "Max pakket" 28 mm per regel', /Max pakket/.test(t) && /28 mm/.test(t) && /30 mm/.test(t), t.slice(0, 300));
    check('stap 3: de app rekent uit wat past: max 28 = glas t/m 22 mm, triple past niet', /Max glaspakket 28 mm \(met band 3 \+ 3 = glas t\/m 22 mm\)\. Past niet: [^.]*HR\+\+\+ glas \(Triple\)/.test(t) &&
      /Max glaspakket 30 mm/.test(t), (t.match(/ⓘ[^ⓘ]*/g) || []).join(' || '));
    if (PLAATJES) await page.locator('#impVenster .imp-paneel, #impVenster > div').first().screenshot({ path: path.join(PLAATJES, 'v124-import-stap3.png') }).catch(() => {});
    await page.click('#impToevoegen'); await wacht(900); await sluitMeldingen(page);
    await wachtTot(() => ruitenVan(2).filter(r => /^[ABC]/.test(r.merk)).length >= 4, 8000);
    u = ruitenVan(2).filter(r => /^[ABC]/.test(r.merk)).map(r => r.merk + ':' + r.maxPakket);
    check('in de database: de ruiten met maxPakket 28 en 30 (niet in de opmerking)', u.length === 4 && u.filter(x => /:28$/.test(x)).length === 3 && u.some(x => /:30$/.test(x)) &&
      ruitenVan(2).every(r => !/max/i.test(r.opmerking || '')), JSON.stringify(u));
    await ctx.close();
    // Hetzelfde als csv uit Excel op Windows: ; en Windows-1252 (é in een opmerking), CRLF, kop "Max (incl. band)".
    resetDb(); S.slot = {}; rijVan(2).data.rijen = []; rijVan(2).data.volgendId = 1;
    ({ ctx, page } = await apparaat(PC, 'pc', 2));
    const csv = Buffer.from('SPONNINGMATEN LIJST;;;;;\r\nAantal;Breedte (mm);Hoogte (mm);Merk;Max (incl. band);Opmerking\r\n' +
      '2;976;572;A;28mm;draairaam café\r\n1;988;572;B;28mm;\r\n', 'latin1');
    await importBestand(page, 'maatstaat.csv', 'text/csv', csv);
    u = await kopVan(page);
    check('csv uit Windows Excel (; en Windows-1252): "Max (incl. band)" herkend, Opmerking blijft Opmerking', JSON.stringify(u) === JSON.stringify(['aantal', 'breedte', 'hoogte', 'merk', 'maxPakket', 'opmerking']), JSON.stringify(u));
    await importControleer(page);
    await page.click('#impToevoegen'); await wacht(900); await sluitMeldingen(page);
    await wachtTot(() => ruitenVan(2).some(r => r.merk && /^A/.test(r.merk)), 8000);
    u = ruitenVan(2).filter(r => /^[AB]/.test(r.merk)).map(r => [r.merk, r.maxPakket, r.opmerking || '']);
    check('… 28 mm bij beide, en "café" goed gelezen', u.length === 2 && u.every(x => +x[1] === 28) && u.some(x => x[2] === 'draairaam café'), JSON.stringify(u));
    await ctx.close();
    // Andere koppen met dezelfde betekenis, en koppen die het NIET zijn.
    resetDb(); S.slot = {};
    ({ ctx, page } = await apparaat(PC, 'pc', 2));
    const wel = ['Max incl. band', 'max. glaspakket incl. band', 'max pakket', 'Max dikte incl band', 'glaspakketdikte max', 'Max (incl. band)',
                 'Dikte incl. band', 'Maximale dikte', 'Max glasdikte', 'Glaspakket'];
    const niet = ['Opmerking', 'Max breedte', 'Maximale hoogte', 'Band', 'Max.', 'Glasdikte', 'Totaal dikte (mm)'];
    const fout = [];
    for (const k of wel.concat(niet)) {
      await page.evaluate(() => impOpen());
      await page.fill('#impPlak', 'Merk;Breedte;Hoogte;' + k + '\nP1;1000;800;28');
      await page.click('#impStap1 button:has-text("Tekst inlezen")');
      await page.waitForSelector('#impStap2', { state: 'visible' });
      u = await kopVan(page);
      const is = u[3] === 'maxPakket';
      if (is !== wel.includes(k)) fout.push(k + ' → ' + (u[3] || '(niets)'));
    }
    await page.evaluate(() => impSluit());
    check('koppen met dezelfde strekking wel, de andere niet (' + wel.length + ' + ' + niet.length + ')', !fout.length, fout.join(' | '));
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. iPad, max 28 mm: grijs en niet te kiezen; doorvoeren en gelijktrekken slaan over');
    resetDb(); S.slot = {};
    const p = rijVan(1);
    // L1 bovenaan: het voorbeeld bij gelijktrekken (de eerste geselecteerde met inhoud).
    p.data.rijen = [ruit(4, 'L1', '700', '1200', Object.assign({ glasType: 'HR++ glas', opbouw: '4-15-4' }, INGEMETEN)),
                    ruit(1, 'M1', '1000', '1200', Object.assign({ maxPakket: '28' }, INGEMETEN)),
                    ruit(2, 'M2', '900', '1200', Object.assign({ maxPakket: '28', glasType: 'HR++ glas', opbouw: '4-13-4' }, INGEMETEN)),
                    ruit(3, 'M3', '800', '1200', Object.assign({ maxPakket: '28', glasType: TRIPLE, opbouw: '4-12-4-12-4' }, INGEMETEN)),
                    ruit(5, 'W1', '600', '1200', Object.assign({ maxPakket: '40' }, INGEMETEN))];
    p.data.volgendId = 6;
    p.data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
    ({ ctx, page } = await apparaat(IPAD, 'ipad', 1));
    const idM = async merk => page.evaluate(mk => rijen.find(r => r.merk === mk).id, merk);
    id = await idM('M1');
    u = await opties(page, '#typ-' + id);
    const tr = u.find(o => o.v === TRIPLE) || {};
    check('M1 (max 28): triple grijs en niet te kiezen, met de reden (kopje + dunste)', tr.uit && tr.grijs && /Te dik voor max glaspakket 28 mm \(met band 3 \+ 3\)/.test(tr.groep) &&
      /dunste 42 mm/.test(tr.t), JSON.stringify(tr));
    check('… HR++ glas wel te kiezen (4-13-4 past: 21 + 6 = 27)', u.some(o => o.v === 'HR++ glas' && !o.uit && !o.grijs), JSON.stringify(u.filter(o => /HR/.test(o.v))));
    const welUit = u.filter(o => o.uit).map(o => o.v);
    check('… alleen typen zonder passende opbouw zijn uit (triple; enkel/HR/HR+ niet)', welUit.includes(TRIPLE) && !welUit.includes('Enkel glas') && !welUit.includes('HR+ glas'), JSON.stringify(welUit));
    // Echt tikken op de keuzelijst en triple proberen: lukt niet.
    let gelukt = true;
    await page.locator('#typ-' + id).selectOption(TRIPLE, { timeout: 1500 }).catch(() => { gelukt = false; });
    await wacht(300);
    check('triple kiezen in de keuzelijst lukt niet; de ruit blijft zonder type', !(await schermRij(page, 'M1')).glasType && !rijDb(1, 'M1').glasType, 'selectOption ' + (gelukt ? 'ging door' : 'geweigerd'));
    // Op de iPad bekijken: de lijst opengeklapt (als lijst, zoals iOS hem grijs toont).
    if (PLAATJES) {
      await page.evaluate(i => { const s = document.getElementById('typ-' + i); s.size = 14; s.style.height = 'auto'; s.scrollIntoView({ block: 'center' }); }, id);
      await wacht(200);
      await page.screenshot({ path: path.join(PLAATJES, 'v124-ipad-type-grijs.png') });
      await page.evaluate(i => { const s = document.getElementById('typ-' + i); s.size = 0; s.style.height = ''; }, id);
    }
    await page.locator('#typ-' + id).selectOption('HR++ glas'); await wacht(400);
    u = await opties(page, '#opb-' + id);
    const dik = u.filter(o => /Te dik/.test(o.groep)).map(o => o.v);
    check('M1 HR++: te dikke opbouwen grijs apart (4-15-4: 23 + 6 = 29), 4-13-4 gewoon', dik.includes('4-15-4') && !dik.includes('4-13-4') &&
      u.filter(o => /Te dik/.test(o.groep)).every(o => o.grijs), JSON.stringify(dik));
    // Een ander pad dan de keuzelijst (Toebehoren, een oud apparaat): niet stil overnemen.
    await page.evaluate(i => wijzigGlasType(i, 'HR+++ glas (Triple)'), id); await wacht(400);
    check('wijzigGlasType met triple (ander pad): geweigerd, met een bericht', (await schermRij(page, 'M1')).glasType === 'HR++ glas' && /past niet/.test(await kortBer(page)), await kortBer(page));
    // Wat er al stond: niet stil veranderd, wel rood met de reden.
    const id3 = await idM('M3');
    m = await page.evaluate(i => ({ typ: document.getElementById('typ-' + i).className, titel: document.getElementById('typ-' + i).title,
      waarde: document.getElementById('typ-' + i).value, dk: document.getElementById('dk-' + i).textContent }), id3);
    check('M3 had al triple 4-12-4-12-4 (max 28): blijft staan, keuzelijst rood met reden, dikte "te dik"', m.waarde === TRIPLE && /te-dik/.test(m.typ) &&
      /past niet binnen het max glaspakket uit de maatstaat \(28 mm\): de dunste opbouw is met band 3 \+ 3 al 42 mm/.test(m.titel) && /te dik/.test(m.dk), JSON.stringify(m));
    check('… en in de database ook niet veranderd', rijDb(1, 'M3').glasType === TRIPLE && rijDb(1, 'M3').opbouw === '4-12-4-12-4');
    // De band telt mee: W1 max 40. Band 3 + 3: triple (36) = 42 > 40 te dik.
    // Band binnen 2 en buiten 3: 41 > 40 nog te dik; max 41: past (41).
    const idW = await idM('W1');
    const tripleUit = async () => ((await opties(page, '#typ-' + idW)).find(o => o.v === TRIPLE) || {}).uit;
    check('W1 max 40, band 3 + 3: triple (36 + 6 = 42) niet te kiezen', await tripleUit());
    await page.evaluate(i => { toebehorenZetRuit(i, 'bandBinnen', 2); rijen.find(r => r.id === i).maxPakket = '41'; }, idW);
    await naarToebehoren(page); await naarInvoer(page);
    check('W1 max 41, band 2 + 3: triple (36 + 5 = 41) past: wel te kiezen', (await tripleUit()) === false);
    // Glas zonder bekende opbouwdikte: niet te beoordelen, dus kiesbaar (zoals v117 bij de opbouw).
    u = await page.evaluate(i => {
      const r = rijen.find(x => x.id === i); r.maxPakket = '28';
      const k = 'HR+++ glas (Triple)|' + DATA.opbouw_per_type['HR+++ glas (Triple)'][0];
      const bewaard = { [k]: DATA.lookup[k] }; delete DATA.lookup[k];
      const s = document.createElement('select'); s.innerHTML = glasTypeKeuzeHTML(r);
      const o = [...s.options].find(x => x.value === 'HR+++ glas (Triple)');
      Object.assign(DATA.lookup, bewaard);
      return { uit: o.disabled, groep: o.parentNode.label || '' };
    }, idW);
    check('een opbouw zonder bekende dikte (niet in de lijst): het type blijft kiesbaar (niet te beoordelen)', !u.uit && !u.groep, JSON.stringify(u));
    await page.evaluate(i => { rijen.find(r => r.id === i).maxPakket = '40'; toebehorenZetRuit(i, 'bandBinnen', ''); opslaan(); }, idW);
    await wacht(400);
    // Doorvoeren (⤓ in de kolom Glas Type, echte tikken): triple naar alle ruiten.
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v124-ipad-invoer-rood.png') });
    await sluitMeldingen(page);
    await page.locator('#invoerBody').locator('xpath=ancestor::table').locator('thead th.kol-type .bulk-vul').tap();
    await page.waitForSelector('.bulk-pop #bulkType');
    u = await opties(page, '#bulkType');
    check('⤓ Glas type: in de lijst staat bij triple bij hoeveel ruiten het te dik is', /te dik bij 4 ruiten/.test((u.find(o => o.v === TRIPLE) || {}).t || ''), JSON.stringify(u.find(o => o.v === TRIPLE)));
    // Eerst alleen het type (opbouw niet wijzigen).
    await page.selectOption('#bulkType', TRIPLE);
    await page.locator('.bulk-pop button:has-text("Doorvoeren")').tap();
    t = await wachtOpMelding(page, /Niet gewijzigd bij/, 5000);
    check('doorvoeren alleen het type triple: M1, M2, W1 overgeslagen ("van dit glastype is elke opbouw … te dik")', t.ok && /M1/.test(t.tekst) && /W1/.test(t.tekst) &&
      /van dit glastype is elke opbouw/.test(t.tekst), t.tekst.slice(0, 300));
    await sluitMeldingen(page);
    await opgeslagen(page, () => rijDb(1, 'L1').glasType === TRIPLE);
    check('… L1 (geen max) wel triple; M1 nog HR++', rijDb(1, 'L1').glasType === TRIPLE && rijDb(1, 'M1').glasType === 'HR++ glas', JSON.stringify(['L1', 'M1'].map(k => rijDb(1, k).glasType)));
    await page.locator('#invoerBody').locator('xpath=ancestor::table').locator('thead th.kol-type .bulk-vul').tap();
    await page.waitForSelector('.bulk-pop #bulkType');
    await page.selectOption('#bulkType', TRIPLE);
    await page.selectOption('#bulkOpbouw', '4-12-4-12-4');
    await page.locator('.bulk-pop button:has-text("Doorvoeren")').tap();
    t = await wachtOpMelding(page, /Niet gewijzigd bij/, 5000);
    check('doorvoeren triple: overgeslagen met een melding (M1, M2, M3, W1)', t.ok && /M1/.test(t.tekst) && /M2/.test(t.tekst) && /W1/.test(t.tekst), t.tekst.slice(0, 300));
    await sluitMeldingen(page);
    await opgeslagen(page, () => rijDb(1, 'L1').glasType === TRIPLE);
    check('… alleen L1 (geen max) is triple geworden; M1 en M2 hetzelfde gebleven', rijDb(1, 'L1').glasType === TRIPLE && rijDb(1, 'M1').glasType === 'HR++ glas' &&
      rijDb(1, 'M2').opbouw === '4-13-4' && rijDb(1, 'W1').glasType === '', JSON.stringify(['L1', 'M1', 'M2', 'W1'].map(k => rijDb(1, k).glasType + ' ' + rijDb(1, k).opbouw)));
    // Een te dikke opbouw doorvoeren (HR++ 4-16-4: 24 + 6 = 30 > 28).
    await page.locator('#invoerBody').locator('xpath=ancestor::table').locator('thead th.kol-opbouw .bulk-vul').tap();
    await page.waitForSelector('.bulk-pop #bulkType');
    await page.selectOption('#bulkType', 'HR++ glas');
    u = await opties(page, '#bulkOpbouw');
    check('⤓ Opbouw: 4-16-4 "te dik bij …", 4-13-4 niet', /te dik bij/.test((u.find(o => o.v === '4-16-4') || {}).t) && !/te dik/.test((u.find(o => o.v === '4-13-4') || {}).t), JSON.stringify(u.slice(0, 6)));
    await page.selectOption('#bulkOpbouw', '4-16-4');
    await page.locator('.bulk-pop button:has-text("Doorvoeren")').tap();
    t = await wachtOpMelding(page, /Niet gewijzigd bij/, 5000);
    check('doorvoeren 4-16-4: M1/M2/M3 (max 28) overgeslagen, met melding', t.ok && /M1/.test(t.tekst) && /deze opbouw is/.test(t.tekst), t.tekst.slice(0, 300));
    await sluitMeldingen(page);
    await opgeslagen(page, () => rijDb(1, 'L1').opbouw === '4-16-4');
    check('… L1 en W1 (max 40: 30 past) wel 4-16-4, M2 niet', rijDb(1, 'L1').opbouw === '4-16-4' && rijDb(1, 'W1').opbouw === '4-16-4' && rijDb(1, 'M2').opbouw === '4-13-4',
      JSON.stringify(['L1', 'W1', 'M2'].map(k => rijDb(1, k).opbouw)));
    // Gelijktrekken: L1 (4-16-4, geen max) als voorbeeld voor M2 (max 28) en W1 (max 40).
    for (const mk of ['L1', 'M2', 'W1']) await vinkAan(page, mk);
    await page.locator('#bulkBalk button:has-text("Gelijktrekken")').tap();
    await wachtOpMelding(page, /Ruiten gelijktrekken|overschreven/, 4000);
    await knop(page, 'Overschrijven');
    t = await wachtOpMelding(page, /Niet gelijkgetrokken/, 5000);
    check('gelijktrekken met L1 (4-16-4): M2 (max 28) overgeslagen met melding', t.ok && /M2/.test(t.tekst) && !/W1/.test(t.tekst.split('gelijkgetrokken:')[1] || ''), t.tekst.slice(0, 300));
    await sluitMeldingen(page);
    await opgeslagen(page, () => rijDb(1, 'W1').breedte === '700');
    check('… W1 wel gelijkgetrokken en houdt zijn eigen max 40; M2 ongewijzigd met max 28', rijDb(1, 'W1').breedte === '700' && +rijDb(1, 'W1').maxPakket === 40 &&
      rijDb(1, 'M2').opbouw === '4-13-4' && +rijDb(1, 'M2').maxPakket === 28, JSON.stringify([rijDb(1, 'W1'), rijDb(1, 'M2')].map(r => [r.breedte, r.opbouw, r.maxPakket])));
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  let bestelPdf1 = null;
  if (doe('4')) {
    console.log('\n4. Spacer zwart: kiezen, doorvoeren, kopiëren, bestellen, terug naar zilver');
    bestelProject();
    rijVan(1).data.rijen.push(ruit(4, 'K4', '500', '500', Object.assign({ glasType: 'Enkel glas', opbouw: '4 mm' }, INGEMETEN)));
    rijVan(1).data.volgendId = 5;
    ({ ctx, page } = await apparaat(PC, 'pc', 1));
    const idM = async merk => page.evaluate(mk => rijen.find(r => r.merk === mk).id, merk);
    const k0 = await page.evaluate(() => rijen.map(r => ruitKenmerk(r)));
    m = await page.evaluate(() => rijen.filter(r => r.merk).map(r => { const td = document.getElementById('sp-' + r.id), s = td.querySelector('select');
      return [r.merk, s.value, getComputedStyle(td).pointerEvents === 'none']; }));
    check('Invoer: kolom Spacer, standaard "zilver"; bij enkel glas (K4) niet te kiezen', JSON.stringify(m) === JSON.stringify([['K1', '', false], ['K2', '', false], ['K3', '', false], ['K4', '', true]]), JSON.stringify(m));
    // Het vangnet (een ander pad dan tikken): zwart bij K4 wordt geweigerd.
    await page.evaluate(() => zetSpacer(rijen.find(r => r.merk === 'K4').id, 'zwart')); await wacht(300);
    check('zwart bij enkel glas (K4) langs een andere weg: geweigerd, met bericht', !(await schermRij(page, 'K4')).spacer && /Geen spouw/.test(await kortBer(page)), await kortBer(page));
    id = await idM('K1');
    await page.selectOption('#sp-' + id + ' select', 'zwart'); await wacht(300);
    await opgeslagen(page, () => rijDb(1, 'K1').spacer === 'zwart');
    check('zwart kiezen bij K1: in de database rijen[].spacer = "zwart"; K2 zonder veld', rijDb(1, 'K1').spacer === 'zwart' && !('spacer' in rijDb(1, 'K2')), JSON.stringify(rijDb(1, 'K1')));
    u = await page.evaluate(() => rijen.map(r => ruitKenmerk(r)));
    check('alleen het kenmerk van K1 is anders', u[0] !== k0[0] && u.slice(1).join() === k0.slice(1).join());
    // ⧉ dupliceren: de kopie houdt zwart.
    await page.locator('#rij-' + id + ' .btn-kopie').click(); await wacht(500);
    u = await page.evaluate(() => rijen.map(r => [r.merk, r.spacer || '']));
    check('⧉ dupliceren: de kopie van K1 is ook zwart', u.filter(x => x[1] === 'zwart').length === 2, JSON.stringify(u));
    await page.evaluate(() => { const k = rijen.find((r, i) => i === 1 && r.spacer); rijen.splice(rijen.indexOf(k), 1); renderTabel(); opslaan(); });
    await wacht(400);
    // ⤓ doorvoeren: zwart naar alle ruiten; K4 (enkel glas) overgeslagen met melding.
    await page.locator('#invoerBody').locator('xpath=ancestor::table').locator('thead th.kol-spacer .bulk-vul').click();
    await page.waitForSelector('.bulk-pop #bulkVeld');
    await page.selectOption('#bulkVeld', 'zwart');
    await page.click('.bulk-pop button:has-text("Doorvoeren")');
    t = await wachtOpMelding(page, /geen isolerend glas/, 4000);
    check('⤓ Spacer zwart naar alle ruiten: K4 (enkel glas) overgeslagen met melding (lege regels niet meegeteld)', t.ok && /Spacer doorgevoerd op 3 ruiten/.test(t.tekst) && /^.*1 ruit heeft geen isolerend glas/.test(t.tekst), t.tekst.slice(0, 200));
    await sluitMeldingen(page);
    u = await page.evaluate(() => rijen.filter(r => r.merk).map(r => r.merk + ':' + (r.spacer || '')));
    check('… K1, K2, K3 zwart, K4 niet', JSON.stringify(u) === JSON.stringify(['K1:zwart', 'K2:zwart', 'K3:zwart', 'K4:']), JSON.stringify(u));
    // Terug: alleen K1 en K2 zwart (zilver = het veld weg).
    await page.selectOption('#sp-' + (await idM('K3')) + ' select', ''); await wacht(300);
    u = await page.evaluate(() => rijen.filter(r => r.merk).map(r => r.merk + ':' + ('spacer' in r ? r.spacer : '-')));
    check('K3 terug op zilver: het veld is weg (niet "zilver" bewaard)', JSON.stringify(u) === JSON.stringify(['K1:zwart', 'K2:zwart', 'K3:-', 'K4:-']), JSON.stringify(u));
    // Samenvatting.
    await page.click('.tab-btn:has-text("Samenvatting")'); await wacht(300);
    u = await page.$$eval('#samenvattingInhoud table tr', l => l.map(tr => [...tr.children].map(c => c.textContent.trim())));
    const iSp = u[0].indexOf('Spacer');
    check('Samenvatting: kolom Spacer, zwart bij K1 en K2', iSp > 0 && u[1][iSp] === 'zwart' && u[2][iSp] === 'zwart' && u[3][iSp] === '', JSON.stringify(u.slice(0, 4).map(r => r.slice(0, 10))));
    // Het tabblad Bestellijst = het model van de pdf.
    await page.click('.tab-btn:has-text("Bestellijst")'); await wacht(300);
    m = await appEnModel(page);
    const iB = m.app.kop.indexOf('Spacer');
    check('tabblad Bestellijst: kolom Spacer, "zwart" bij K1 en K2, leeg bij K3', iB > 0 && m.app.cellen.map(c => c[iB]).join(',') === 'zwart,zwart,,' &&
      JSON.stringify(m.app.kop) === JSON.stringify(m.model.kop), JSON.stringify(m.app.kop) + ' ' + JSON.stringify(m.app.cellen.map(c => c[iB])));
    await naarInvoer(page);
    // Bestellen (echte kliks): de pdf voor de leverancier.
    const b1 = await bestel(page, ONVOLLEDIG);
    bestelPdf1 = b1.pad;
    t = plat(b1.tekst);
    check('bestel-pdf: kolom Spacer met "zwart" bij K1 en K2', /Spacer/.test(t) && (t.match(/zwart/g) || []).length >= 2, t.slice(0, 500));
    pdfPlaatje(b1.pad, 'v124-bestellijst-zwart');
    await wachtTot(() => bestellingenDb().length === 1, 8000);
    const b = bestellingenDb()[0] || { ruiten: {} };
    check('de bestelling legt de spacer vast (momentopname K1: zwart; K3: geen veld)', b.ruiten[idVan('K1')] && b.ruiten[idVan('K1')].spacer === 'zwart' &&
      !('spacer' in b.ruiten[idVan('K3')]), JSON.stringify(b.ruiten[idVan('K1')]));
    check('na de bestelling: niets "gewijzigd"', await page.evaluate(() => rijen.every(r => !naBestellingGewijzigd(r))));
    // Na de bestelling zwart → zilver bij K1 = een wijziging (ontgrendelen eerst).
    await ontgrendel(page);
    id = await idM('K1');
    await page.selectOption('#sp-' + id + ' select', ''); await wacht(400);
    u = await page.evaluate(i => { const r = rijen.find(x => x.id === i); return { anders: naBestellingGewijzigd(r), wat: ruitVerschil(bestelOud(i), r),
      tb: teBestellen().regels.map(x => x.merk), k2: naBestellingGewijzigd(rijen.find(x => x.merk === 'K2')) }; }, id);
    check('K1 zwart → zilver na de bestelling: gewijzigd ("spacer zwart → standaard zilver"), K2 niet', u.anders && !u.k2 &&
      u.wat.join() === 'spacer zwart → standaard zilver', JSON.stringify(u));
    check('… op de volgende lijst (aanvulling) alleen K1', JSON.stringify(u.tb) === '["K1"]', JSON.stringify(u.tb));
    await page.click('.tab-btn:has-text("Bestellijst")'); await wacht(300);
    m = await appEnModel(page);
    t = m.app.cellen.map(c => c.join(' ')).join(' | ');
    check('aanvulling: VERVANGT K1 uit de 1e (…, spacer zwart); geen kolom Spacer meer (nergens zwart op deze lijst)', /VERVANGT K1 uit de 1e \([^)]*spacer zwart\)/.test(t) && m.app.kop.indexOf('Spacer') < 0, t + ' ' + JSON.stringify(m.app.kop));
    await naarInvoer(page);
    // Terugzetten zoals besteld (de knop van "Oudere stand?" / Zet terug): weer zwart.
    await page.evaluate(i => ruitenTerugZoalsBesteld([String(i)]), id); await wacht(400);
    check('terugzetten zoals besteld: K1 weer zwart, niet meer gewijzigd', await page.evaluate(i => { const r = rijen.find(x => x.id === i); return r.spacer === 'zwart' && !naBestellingGewijzigd(r); }, id));
    // Excel heen en terug.
    await page.click('button:has-text("⬇ Exporteren")');
    const dlP = page.waitForEvent('download', { timeout: 15000 });
    await page.click('.veld-menu button:has-text("Excel-bestand")');
    const dl = await dlP;
    const xpad = path.join(pdfMap, 'export.xlsx'); await dl.saveAs(xpad);
    const wb = XLSX.read(fs.readFileSync(xpad));
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    const iS = aoa[0].indexOf('Spacer');
    check('Excel: kolom Spacer: zwart, zwart, zilver, leeg (enkel glas)', iS > 0 && JSON.stringify(aoa.slice(1).map(r => r[iS] || '')) === '["zwart","zwart","zilver",""]', JSON.stringify(aoa.slice(1).map(r => r[iS])));
    await ctx.close();
    resetDb(); S.slot = {};
    // (een instructie voor de chauffeur, anders vraagt de pdf eerst om de leverpagina)
    rijVan(2).data.info = { leverInstructie: 'achterom', opnemer: 'julian' };
    ({ ctx, page } = await apparaat(PC, 'pc', 2));
    await importBestand(page, 'glasopname_Kerkstraat_1.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fs.readFileSync(xpad));
    u = await kopVan(page);
    check('de eigen export terug inlezen: kolom Spacer herkend, "Pakket" (oordeel) niet als max', u.indexOf('spacer') >= 0 && u.filter(x => x === 'maxPakket').length <= 1 &&
      u[aoa[0].indexOf('Pakket')] !== 'maxPakket', JSON.stringify(u));
    await importControleer(page);
    await page.click('#impToevoegen'); await wacht(900); await sluitMeldingen(page);
    await wachtTot(() => ruitenVan(2).some(r => /^K/.test(r.merk || '')), 8000);
    u = ruitenVan(2).filter(r => /^K/.test(r.merk || '')).map(r => r.merk + ':' + (r.spacer || ''));
    check('… na het inlezen: K1 en K2 zwart, K3 en K4 standaard', JSON.stringify(u) === JSON.stringify(['K1:zwart', 'K2:zwart', 'K3:', 'K4:']), JSON.stringify(u));
    // PDF invoer.
    const pi = await bestellijstPdf(page, ONVOLLEDIG, 'PDF invoer');
    t = plat(pdfTekst(pi));
    check('PDF invoer: kolom Spacer met zwart', /Spacer/.test(t) && /zwart/.test(t), (pi ? '' : 'geen download ') + (t.match(/Merk.{0,400}/) || [t.slice(0, 300)])[0]);
    pdfPlaatje(pi, 'v124-pdf-invoer', 2);   // blad 1 = de projectgegevens
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Een oud project (besteld met v123, zonder spacer): niets "gewijzigd"');
    bestelProject();
    S.slot = {};
    const oud = oudeServer();
    await new Promise(r => oud.listen(0, r));
    const oudAdres = 'http://127.0.0.1:' + oud.address().port + '/index.html';
    ctx = await nieuweContext(PC, 'oud');
    await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    page = await nieuwePagina(ctx);
    await page.goto(oudAdres + '#project=' + P(1));
    await page.waitForFunction(id => window.glasProjectId === id && document.getElementById('projectNaam').value, P(1), { timeout: 15000 });
    await wacht(800);
    check('v123 draait (de echte oude code)', await page.evaluate(() => APP_VERSIE) === 'v123');
    const b0 = await bestel(page, ONVOLLEDIG);
    await wachtTot(() => bestellingenDb().length === 1, 8000);
    check('v123 heeft besteld (1e, met het kenmerk van v123)', bestellingenDb().length === 1 && !!b0.pad);
    await ctx.close();
    oud.close();
    // Nu v124 op hetzelfde project, en er komt een ruit bij.
    S.slot = {};
    ({ ctx, page } = await apparaat(PC, 'pc', 1));
    u = await page.evaluate(() => ({ gewijzigd: rijen.filter(r => naBestellingGewijzigd(r)).map(r => r.merk), tb: teBestellen().aantal,
      geel: document.querySelectorAll('td.rijnr.na-bestelling').length }));
    check('v124 opent het oude bestelde project: geen enkele ruit "gewijzigd", niets te bestellen, niets geel', !u.gewijzigd.length && u.tb === 0 && u.geel === 0, JSON.stringify(u));
    await ontgrendel(page);
    await ruitErbij(page, Object.assign({ merk: 'K5', breedte: '600', hoogte: '600' }, KOMPLEET));
    u = await page.evaluate(() => { const t = teBestellen(); return { regels: t.regels.map(r => r.merk), gewijzigd: t.gewijzigd.length, vervallen: t.vervallen.length }; });
    check('… met een ruit erbij: op de aanvulling alleen K5', JSON.stringify(u) === JSON.stringify({ regels: ['K5'], gewijzigd: 0, vervallen: 0 }), JSON.stringify(u));
    const b2 = await bestel(page, ONVOLLEDIG);
    t = plat(b2.tekst);
    check('aanvulling vanuit v124: K5 NIEUW, geen VERVANGT, geen kolom Spacer', /NIEUW/.test(t) && !/VERVANGT K\d/.test(t) && !/Spacer/.test(t), (t.match(/Pos Aantal.{0,300}/) || [t.slice(0, 300)])[0]);
    await wachtTot(() => bestellingenDb().length === 2, 8000);
    check('… na de 2e nog steeds niets gewijzigd', bestellingenDb().length === 2 && await page.evaluate(() => rijen.every(r => !naBestellingGewijzigd(r))));
    // Nu K1 op zwart: een wijziging, met de reden (de bestelling van v123 kent het veld niet: zilver).
    await ontgrendel(page);
    id = await page.evaluate(() => rijen.find(r => r.merk === 'K1').id);
    await page.selectOption('#sp-' + id + ' select', 'zwart'); await wacht(400);
    u = await page.evaluate(i => ({ wat: ruitVerschil(bestelOud(i), rijen.find(r => r.id === i)), tb: teBestellen().regels.map(r => r.merk) }), id);
    check('K1 zwart na de bestelling van v123: "spacer standaard zilver → zwart", alleen K1 op de lijst', u.wat.join() === 'spacer standaard zilver → zwart' &&
      JSON.stringify(u.tb) === '["K1"]', JSON.stringify(u));
    await bestel(page, ONVOLLEDIG);
    await wachtTot(() => bestellingenDb().length === 3, 8000);
    u = bestellingenDb();
    check('3e besteld (K1 zwart): de versie uit de 1e is ingekort (kort: 2, zonder spacer), niets gewijzigd', u.length === 3 && u[0].ruiten[idVan('K1')].kort === 2 &&
      !('spacer' in u[0].ruiten[idVan('K1')]) && u[2].ruiten[idVan('K1')].spacer === 'zwart' && await page.evaluate(() => rijen.every(r => !naBestellingGewijzigd(r))),
      JSON.stringify(u.map(b => b.ruiten[idVan('K1')])).slice(0, 400));
    // Een ingekorte stand zonder het veld, terwijl er zwart besteld was (een
    // apparaat met v123 kent het veld niet en kort in zonder spacer). Nagebootst
    // in de database: de bestelde versie van K1 wordt zo'n ingekorte.
    await page.close();
    const r1 = rijVan(1);
    const kortZonder = Object.assign({}, r1.data.info.bestellingen[2].ruiten[idVan('K1')]);
    delete kortZonder.spacer; kortZonder.kort = 2;
    ['extra', 'vervangt', 'vervangtUit'].forEach(k => { if (kortZonder[k] === undefined) delete kortZonder[k]; });
    r1.data.info.bestellingen[2].ruiten[idVan('K1')] = kortZonder;
    page = await nieuwePagina(ctx);
    await open(page, 1);
    u = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'K1'); return { anders: naBestellingGewijzigd(r), oud: bestelOud(r.id) }; });
    check('… ingekort zonder het veld (oud apparaat): K1 (zwart) is niet "gewijzigd" (het kenmerk weet het)', !u.anders, JSON.stringify(u));
    await ontgrendel(page);
    await page.selectOption('#sp-' + id + ' select', ''); await wacht(400);
    u = await page.evaluate(i => ruitVerschil(bestelOud(i), rijen.find(r => r.id === i)), id);
    check('… daarna weer zilver: "spacer zwart → standaard zilver" (afgeleid uit het kenmerk)', u.join() === 'spacer zwart → standaard zilver', JSON.stringify(u));
    await ctx.close();
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
