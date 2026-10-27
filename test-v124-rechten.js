/* Testreeks v124 (rechten) — node test-v124-rechten.js   (en: --mutaties)

   Onderwerp: rollen en rechten (script 30, keuzes Jan 26-10-2026): drie
   rollen (beheerder, collega, werkvloer), per collega vier rechten uit te
   zetten, het tabblad Beheer, foto's van de werkvloer, de prullenbak en de
   opslag, en de fotowachtrij bij een project dat definitief weg is.

   1. De echte situatie: Jan (beheerder) op de Mac op kantoor, collega's op
      kantoor en op de bouw, de werkvloer met een iPad op de bouw (vaak geen
      bereik). Script 30 is wel of (nog) niet gedraaid.
   2. De belofte: zonder script 30 verandert er niets (zoals v123). Met
      script 30 ziet iedereen alleen de knoppen die voor hem gelden, en hoort
      hij waarom iets niet kan; de werkvloer kijkt, voegt foto's toe en vinkt
      zijn eigen taken af, en zit niemand in de weg; werk gaat nooit
      verloren, ook niet als de database iets weigert (dan apart bewaard).
   3. Wat er misgaat als het niet klopt: een collega bestelt zonder recht,
      de werkvloer neemt een project over (kantoor kan niet verder), een foto
      van de bouw verdwijnt, een zwevende foto blijft voor altijd in de
      opslag, of iemand zit vast met werk dat de database telkens weigert.
   4. Wat er halverwege kan gebeuren: geen bereik bij de foto (wachtrij op
      het apparaat), rechten die op de server veranderen terwijl de app open
      staat, een project dat intussen definitief weg is.
   5. Wat deze opstelling aanneemt: de nagebootste database van test-v123,
      hier uitgebreid met een JavaScript-nabootsing van script 30 (rollen,
      rechten, glas_foto_erbij, beheer). Of script 30 zelf klopt, bewijst de
      proef tegen een echte PostgreSQL en PostgREST (zip "niet-in-repo",
      proef-script-30, met een volledige werkgang van de app tegen de echte
      database). Echte Chromium; de iPad als Chromium-profiel met aanraken.
      Echte Safari, iPad, Android en Windows: niet hier. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');


/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  nieuwKnop: ['index.html', '  body.geen-nieuw button[onclick^="cloudNieuw"],\n', ''],
  nieuwBewaak: ['rechten.js', "  bewaak('cloudNieuw', 'nieuw', undefined);\n", ''],
  backupKnop: ['index.html', '  body.geen-beheer #startBackup,\n', ''],
  beheerTab: ['rechten.js', "    if (tab) tab.hidden = rol !== 'beheerder';", '    if (tab) tab.hidden = !rol;'],
  rechtenTekst: ['rechten.js', "        if (uit.length) t = 'Staat voor jou uit: ' + uit.join(', ');", ''],
  wvClaim: ['bewerkslot.js', "    rpc(werkvloer() ? 'stand' : 'claim', pid).then(function (s) {", "    rpc('claim', pid).then(function (s) {"],
  wvFotoHook: ['fotos.js', "          if (!(window.glasWerkvloerFoto && glasWerkvloerFoto(doel, pid))) opslaan();", '          opslaan();'],
  wvOrigineel: ['fotos.js', "      if (window.glasWerkvloerFoto && glasWerkvloerFoto(f, pid)) return;\n", ''],
  wvTaakVink: ['project.js', "      var vinkUit = wv && !(mijnId && t.eigenaar === mijnId);", '      var vinkUit = false;'],
  wvTaakNieuw: ['index.html', '  body.rol-werkvloer .taak-nieuw,\n', ''],
  wvToch: ['index.html', '  body.rol-werkvloer .slot-balk.kijken button[onclick^="bewerkslotTochBewerken"],\n', ''],
  wvTekst: ['bewerkslot.js', "    if (werkvloer() && (project || window.glasProjectId)) return window.glasWerkvloerTekst ? glasWerkvloerTekst() : '';\n", ''],
  wvOffline: ['bewerkslot.js', "    return (modus === 'kijken' && !!project) || (werkvloer() && !!(project || window.glasProjectId));", "    return modus === 'kijken' && !!project;"],
  wvKijkUitleg: ['index.html', "      appFout(werkvloerUitleg() || ((st.naam || 'Een collega') + ' bewerkt dit project nu; je kunt alleen kijken. Wil je zelf ' +\n              'iets",
                 "      appFout(((st.naam || 'Een collega') + ' bewerkt dit project nu; je kunt alleen kijken. Wil je zelf ' +\n              'iets"],
  geenRechtApart: ['cloud.js', "        if (/^Geen recht:/.test(String(res.error.message || ''))) {", '        if (false) {'],
  apartMerk: ['cloud.js', '        d._apart = true;\n', ''],
  ontgrendelBewaak: ['rechten.js', "  bewaakVers('slotOntgrendel', 'ontgrendelen', undefined);\n", ''],
  // v124 reparatieronde
  leverancierVrij: ['pdf.js', "  function magLeverancier(modus) {\n    if (modus === 'overzicht') return true;", "  function magLeverancier(modus) {\n    return true;"],
  versVoorExport: ['pdf.js', "      return Promise.resolve(window.glasRechtenVers ? glasRechtenVers() : null).then(function () {\n        if (wat === 'bestellijst' && !magLeverancier", "      return Promise.resolve(null).then(function () {\n        if (wat === 'bestellijst' && !magLeverancier"],
  versOokAlsNiet: ['pdf.js', "      // Ook als de app denkt dat het niet mag: de beheerder kan het net\n      // weer aangezet hebben.\n", "      if (wat === 'bestellijst' && !magLeverancier(bestelModus().modus)) { leverancierGeweigerd(); return Promise.resolve(); }\n"],
  versVerstuurd: ['pdf.js', "        return Promise.resolve(window.glasRechtenVers ? glasRechtenVers() : null).then(function () {\n          if (window.glasMag && !glasMag('bestellen')) {", "        return Promise.resolve(null).then(function () {\n          if (window.glasMag && !glasMag('bestellen')) {"],
  versOntgrendel: ['rechten.js', "  bewaakVers('slotOntgrendel', 'ontgrendelen', undefined);", "  bewaak('slotOntgrendel', 'ontgrendelen', undefined);"],
  deelTerug: ['cloud.js', "          if (/bestelling vastleggen of intrekken|niet ontgrendelen/.test(waarom) && Date.now() - vorigeHerstel > 60000) {", "          if (false) {"],
  opruimenAlles: ['cloud.js', "        return nogNodigVan(paden).then(function (nodig) {", "        return Promise.resolve({}).then(function (nodig) {"],
  eldersNiet: ['cloud.js', "      try { await fotosElders(elders); } catch (e) {}\n", ''],
  lokaalNiet: ['wachtrij.js', "    var lok = lokaalGenoemd(lijst, !!(opties && opties.alleenReddingen));", "    var lok = {};"],
  wachtrijVergeetAlles: ['wachtrij.js', "        var weg = van.filter(function (m) { return !nodig[m.pad]; });", "        var weg = van;"],
  weesLokaal: ['rechten.js', "      namen = namen.filter(function (n) { return !nodig[n]; });", ''],
  geblokkeerdNiet: ['rechten.js', "      if (d && typeof d === 'object') zetGeblokkeerd(d.actief === false);", ''],
  uitloggenFotos: ['cloud.js', "    if (!await erbijKlaar(wat)) return false;\n", ''],
  werkvloerTekst: ['pdf.js', "  function leverancierWeigerTekst() {\n    if (window.glasWerkvloer && glasWerkvloer()) {", "  function leverancierWeigerTekst() {\n    if (false) {"],
  prulAuto: ['rechten.js', '        if (window.glasWerkvloer()) return 0;\n', ''],
  definitiefKnop: ['index.html', '  body.geen-beheer button[onclick^="startDefinitief"],\n', ''],
  wachtrijGat: ['wachtrij.js', '    return alleMeta().then(zonderVerdwenen).then(function (lijst) {', '    return alleMeta().then(function (lijst) {'],
  beheerZetten: ['rechten.js', "' onchange=\"glasBeheerZet(this, \\'mag_' + x + '\\'", "' onchange=\"glasBeheerZet(this, \\'' + x + '\\'"],
  weesOpruimen: ['rechten.js', "        var r = await c.storage.from('projectfotos').remove(deel);", '        var r = { error: null };'],
  prulLegen: ['rechten.js', "      try { if (await glasDefinitiefZonderVraag(prulLijst[i].id)) gelukt++; } catch (e) {}", ''],
  vasteKnop: ['rechten.js', "      if (wat === 'foto' && window.glasWerkvloer() && window.glasProjectId) {", "      if (false) {"],
  cache: ['rechten.js', "      if (k && k.id === id && k.rol) { rij = k; actief30 = true; }", ''],
};
const WAAR = { nieuwKnop: '3', nieuwBewaak: '3', backupKnop: '3', beheerTab: '3', rechtenTekst: '3', wvClaim: '4', wvFotoHook: '4',
  wvOrigineel: '4', wvTaakVink: '4', wvTaakNieuw: '4', wvToch: '4', wvTekst: '4', wvKijkUitleg: '4', geenRechtApart: '3', apartMerk: '3',
  ontgrendelBewaak: '3', leverancierVrij: '3', versVoorExport: '3', versVerstuurd: '3', versOokAlsNiet: '3', versOntgrendel: '3', deelTerug: '3',
  opruimenAlles: '9', eldersNiet: '9', lokaalNiet: '9', wachtrijVergeetAlles: '9', weesLokaal: '9', geblokkeerdNiet: '10',
  uitloggenFotos: '10', werkvloerTekst: '10', prulAuto: '4', definitiefKnop: '6', wachtrijGat: '7', beheerZetten: '2', weesOpruimen: '2',
  prulLegen: '2', cache: '8', wvOffline: '8', vasteKnop: '4' };

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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v124r-'));
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
const geenRecht = m => { S.geweigerd = (S.geweigerd || 0) + 1; return { data: null, error: { code: 'P0001', message: 'Geen recht: ' + m, details: '', hint: '' } }; };
// v124 (reparatie A3): noemt een project (ook in de prullenbak, ook een
// apart bewaarde kopie) dit pad? Zoals glas_foto_pad van script 30.
const genoemdDoor = pad => S.db.projecten.filter(p => JSON.stringify(p.data || {}).indexOf('"' + pad + '"') >= 0);
const inGebruik = pad => genoemdDoor(pad).length > 0;
// v124 (S3): op slot zoals de app het ziet (glas_op_slot).
const opSlotData = d => (RANG[((d || {}).info || {}).status] || 0) >= 2 && !(((d || {}).info || {}).slot || {}).open;
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
  // Geblokkeerd (actief = false): is_lid() is onwaar, de beveiliging laat
  // niets zien en niets wijzigen.
  if (gRij(uid) && gRij(uid).actief === false) {
    if (st.op === 'select') return { data: st.enkel ? null : [], error: null };
    if (st.op === 'insert') return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
    return { data: st.terug ? [] : null, error: null };
  }
  // S4: het merkje _erbijVan gaat er bij het aanmaken af.
  if (st.tabel === 'projecten' && st.op === 'insert') {
    (Array.isArray(st.nieuw) ? st.nieuw : [st.nieuw]).forEach(v => { if (v && v.data) delete v.data._erbijVan; });
  }
  // S7: wie en wanneer een taak afvinkte, zet de database.
  if (st.tabel === 'taken' && st.op === 'update' && st.velden) {
    if ('klaar' in st.velden) {
      st.velden.afgerond_door = st.velden.klaar ? uid : null;
      st.velden.afgerond_op = st.velden.klaar ? new Date().toISOString() : null;
    } else { delete st.velden.afgerond_door; delete st.velden.afgerond_op; }
  }
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
          const zonder = b => { const k = Object.assign({}, b); delete k.nr; delete k.ingetrokken; return JSON.stringify(k, Object.keys(k).sort()); };
          const ingetrokkenNu = nieuw.some(n => ('ingetrokken' in n) && oud.some(o => o.op === n.op && !('ingetrokken' in o)));
          const erbij = nieuw.some(n => !oud.some(o => o.op === n.op)) || ingetrokkenNu ||
            nieuw.some(n => oud.some(o => o.op === n.op && zonder(o) !== zonder(n)));   // S5: de inhoud
          if (erbij && !magM(uid, 'bestellen')) return geenRecht('je account mag geen bestelling vastleggen of intrekken. Vraag de beheerder.');
          // S3: ontgrendelen, ná het samenvoegen van script 23 (zoals de trigger).
          if (r === 'collega' && !magM(uid, 'ontgrendelen') && opSlotData(p.data)) {
            const proef = JSON.parse(JSON.stringify(p));
            Object.assign(proef, JSON.parse(JSON.stringify(st.velden)));
            if (!S.zonderTrigger) triggerBestellingen(JSON.parse(JSON.stringify(p)), proef);
            if (!opSlotData(proef.data) && !(ingetrokkenNu && magM(uid, 'bestellen'))) {
              return geenRecht('je account mag een besteld project niet ontgrendelen. Vraag de beheerder.');
            }
          }
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
  if (v.naam === 'glas_mijn_status') {
    const g = gRij(uid);
    return { data: g ? { actief: g.actief !== false, rol: g.rol, alleen_lezen: !!g.alleen_lezen } : null, error: null };
  }
  if (v.naam === 'glas_foto_nog_nodig') {
    if (!r) return { data: null, error: null };
    return { data: (a.paden || []).filter(inGebruik), error: null };
  }
  if (v.naam === 'glas_foto_erbij') {
    if (!r) return geenRecht('je kunt geen foto\'s toevoegen.');
    // S1: het logboek niet laten doorspoelen (zie script 30).
    if (S.fotoRem && S.fotoRem[a.p_project]) {
      S.fotoRem[a.p_project]--;
      return { data: null, error: { code: 'P0001', message: 'Veel foto\'s in korte tijd; deze gaat er straks alsnog in.' } };
    }
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
      const maat = x => typeof x === 'number' && x >= 1 && x <= 100000 ? x : undefined;   // S7
      p.data.fotos.push({ id: f.id, pad: f.pad, titel: f.titel || '', bron: 'foto', breedte: maat(f.breedte), hoogte: maat(f.hoogte), markeringen: [],
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
  // S2: een foto die een project nog noemt, haalt alleen de beheerder weg.
  if (v.actie === 'remove' && S.s30 && S.wie && rolVan(S.wie.id) !== 'beheerder') {
    const mag = (v.paden || []).filter(pd => !inGebruik(pd));
    (S.opslagGeweigerd = S.opslagGeweigerd || []).push(...(v.paden || []).filter(pd => inGebruik(pd)));
    return echteOpslag(Object.assign({}, v, { paden: mag }));
  }
  if (v.actie === 'remove') (S.opslagWeg = S.opslagWeg || []).push(...(v.paden || []));
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
// v124 (A5): ⬇ Exporteren → een keuze, en er hoort GEEN pdf te komen.
// Geeft { download, tekst } (tekst = de meldingen op het scherm).
async function exportZonderPdf(page, welke, re) {
  await page.click('button:has-text("⬇ Exporteren")');
  let download = false;
  const dl = page.waitForEvent('download', { timeout: 6000 }).then(() => { download = true; }, () => {});
  await page.click('button:has-text("' + welke + '")');
  const v = await wachtOpMelding(page, re, 8000);
  await Promise.race([dl, wacht(2500)]);
  return { download, tekst: v.tekst, ok: v.ok };
}
// De korte berichten onderaan (kortBericht) meeschrijven.
async function kortMee(page) {
  await page.evaluate(() => {
    window.__kort = [];
    const orig = window.kortBericht;
    window.kortBericht = function (t) { window.__kort.push(String(t)); return orig.apply(this, arguments); };
  });
}
const kortGezien = page => page.evaluate(() => (window.__kort || []).join(' | '));

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, t, u, v, w;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Zonder script 30: alles zoals in v123');
    resetDb(); S.s30 = false;
    ({ ctx, page } = await als('jan', null, 'pc'));
    check('geen tabblad Beheer', !(await zichtbaar(page, '#startTabBeheer')));
    check('de back-upknop 💾 staat er (zoals v123)', await zichtbaar(page, '#startBackup'));
    check('+ Nieuw project staat er', await zichtbaar(page, '#startScherm button:has-text("+ Nieuw project")'));
    check('geen rechten-klassen op de pagina', !/rechten-30|rol-|geen-/.test(await lichaam(page)), await lichaam(page));
    check('de app mag alles (glasMag)', await page.evaluate(() => ['bestellen', 'ontgrendelen', 'nieuw', 'weggooien'].every(x => glasMag(x))));
    await open(page, 1);
    check('een project openen neemt het bewerkslot (zoals altijd)', !!(S.slot[P(1)] && S.slot[P(1)].apparaat));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Jan (beheerder) op de Mac: het tabblad Beheer');
    resetDb(); metRollen();
    S.db.projecten.push(project(5, 'Oud A', [], { verwijderd_op: new Date(Date.now() - 2 * 864e5).toISOString() }),
                        project(6, 'Oud B', [], { verwijderd_op: new Date(Date.now() - 5 * 864e5).toISOString() }));
    S.opslag.set(P(5) + '/a.jpg', { grootte: 1000 }); S.opslag.set(P(6) + '/origineel/b.heic', { grootte: 2000 });
    S.opslag.set(P(99) + '/wees.jpg', { grootte: 3000 }); S.opslag.set(P(1) + '/los.jpg', { grootte: 40 });
    ({ ctx, page } = await als('jan', null, 'pc'));
    check('het tabblad Beheer staat er', await zichtbaar(page, '#startTabBeheer'));
    check('… en de back-upknop', await zichtbaar(page, '#startBackup'));
    check('… en bij mijn naam: Beheerder', /Beheerder/.test(await page.$eval('#startRechten', e => e.hidden ? '' : e.textContent)));
    await page.click('#startTabBeheer');
    await page.waitForSelector('#beheerGebruikers table', { timeout: 8000 });
    u = await page.$$eval('#beheerGebruikers tbody tr', l => l.length);
    check('alle vijf de gebruikers staan in de lijst', u === 5, u);
    check('de inhoud van Start staat niet meer in beeld', !(await zichtbaar(page, '#startInhoud')));
    check('mijn eigen rol kan ik niet veranderen (uit)', await page.locator('#beheerGebruikers tr[data-wie="u1"] select').isDisabled());
    check('het back-upaccount: alleen lezen, niets te kiezen',
      /alleen lezen/.test(await page.locator('#beheerGebruikers tr[data-wie="u9"]').innerText()) &&
      (await page.locator('#beheerGebruikers tr[data-wie="u9"] select, #beheerGebruikers tr[data-wie="u9"] button').count()) === 0);
    await page.locator('#beheerGebruikers tr[data-wie="u2"] input[data-recht="nieuw"]').click();
    await wachtTot(() => gRij('u2').mag_nieuw === true, 5000);
    check('een vinkje bij Kees (nieuw project) aan: in de database', gRij('u2').mag_nieuw === true, JSON.stringify(S.beheerLog));
    await page.locator('#beheerGebruikers tr[data-wie="u2"] input[data-recht="nieuw"]').click();
    await wachtTot(() => gRij('u2').mag_nieuw === false, 5000);
    check('… en weer uit', gRij('u2').mag_nieuw === false);
    await page.selectOption('#beheerGebruikers tr[data-wie="u3"] select', 'collega');
    await wachtTot(() => gRij('u3').rol === 'collega', 5000);
    check('Wim van werkvloer naar collega: in de database', gRij('u3').rol === 'collega');
    await page.selectOption('#beheerGebruikers tr[data-wie="u3"] select', 'werkvloer');
    await wachtTot(() => gRij('u3').rol === 'werkvloer', 5000);
    await page.locator('#beheerGebruikers tr[data-wie="u4"] button:has-text("Blokkeren")').click();
    v = await wachtOpMelding(page, /blokkeren/i);
    check('blokkeren vraagt eerst', v.ok, v.tekst);
    await knop(page, 'Blokkeren');
    await wachtTot(() => gRij('u4').actief === false, 5000);
    check('Bart geblokkeerd: in de database', gRij('u4').actief === false);
    await page.locator('#beheerGebruikers tr[data-wie="u4"] button:has-text("Vrijgeven")').click();
    await wachtTot(() => gRij('u4').actief === true, 5000);
    check('… en weer vrijgegeven', gRij('u4').actief === true);
    await page.selectOption('#beheerGebruikers tr[data-wie="u4"] select', 'beheerder');
    v = await wachtOpMelding(page, /wordt beheerder/);
    check('iemand beheerder maken vraagt eerst', v.ok, v.tekst);
    await knop(page, 'Beheerder maken');
    await wachtTot(() => gRij('u4').rol === 'beheerder', 5000);
    check('Bart is beheerder', gRij('u4').rol === 'beheerder');
    await page.selectOption('#beheerGebruikers tr[data-wie="u4"] select', 'collega');
    await wachtOpMelding(page, /geen beheerder meer/);
    await knop(page, 'Veranderen');
    await wachtTot(() => gRij('u4').rol === 'collega', 5000);
    // De prullenbak legen.
    await page.waitForSelector('#beheerPrullenbak button:has-text("Prullenbak nu legen")');
    await page.click('#beheerPrullenbak button:has-text("Prullenbak nu legen")');
    v = await wachtOpMelding(page, /definitief/);
    check('prullenbak legen vraagt eerst (2 projecten)', v.ok && /2 projecten/.test(v.tekst), v.tekst);
    await knop(page, 'Definitief verwijderen');
    await wachtTot(() => !rijVan(5) && !rijVan(6), 8000);
    check('beide projecten zijn weg', !rijVan(5) && !rijVan(6));
    check('… met hun foto\'s (ook het origineel)', !S.opslag.has(P(5) + '/a.jpg') && !S.opslag.has(P(6) + '/origineel/b.heic'));
    check('… en de prullenbak is leeg', /leeg/.test(await page.$eval('#beheerPrullenbak', e => e.innerText)));
    // Opslag nakijken en de wees opruimen.
    await page.click('button:has-text("Opslag nakijken")');
    await page.waitForSelector('#beheerOpslag table');
    t = await page.$eval('#beheerOpslag tr[data-soort="1"]', e => e.innerText.replace(/\s+/g, ' '));
    check('opslag nakijken: 1 foto zonder project', /Zonder project.* 1 /.test(t + ' '), t);
    t = await page.$eval('#beheerOpslag tr[data-soort="3"]', e => e.innerText.replace(/\s+/g, ' '));
    check('… en 1 weggehaald in een project (blijft staan)', / 1 /.test(t + ' '), t);
    await page.click('#beheerOpslag button:has-text("zonder project opruimen")');
    await wachtOpMelding(page, /Ze horen nergens meer bij/);
    await knop(page, 'Opruimen');
    await wachtTot(() => !S.opslag.has(P(99) + '/wees.jpg'), 8000);
    check('de foto zonder project is uit de opslag', !S.opslag.has(P(99) + '/wees.jpg'));
    check('… de foto die in een project weggehaald is, staat er nog (voor ↶)', S.opslag.has(P(1) + '/los.jpg'));
    await wachtTot(async () => /geen foto's zonder project/.test(await page.$eval('#beheerOpslag', e => e.innerText)), 5000);
    check('… en het nakijken zegt daarna: geen', /geen foto's zonder project/.test(await page.$eval('#beheerOpslag', e => e.innerText)));
    // De telefoon: kaartjes, niets breder dan het scherm.
    await page.setViewportSize({ width: 390, height: 800 });
    await wacht(300);
    u = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check('Beheer op de telefoon (390 px): niets steekt buiten het scherm', u[0] <= u[1], JSON.stringify(u));
    if (process.env.PLAATJES) await page.screenshot({ path: path.join(process.env.PLAATJES, 'v124-beheer-telefoon.png'), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    if (process.env.PLAATJES) await page.screenshot({ path: path.join(process.env.PLAATJES, 'v124-beheer-pc.png'), fullPage: true });
    check('glas_aanwezig: de app meldde zich (versie, apparaat)', !!gRij('u1').gezien_op && /^v\d+/.test(gRij('u1').app_versie || ''),
      JSON.stringify([gRij('u1').gezien_op, gRij('u1').app_versie]));
    await page.click('#startTabStart');
    check('terug naar Start: Beheer weg, Start weer in beeld', !(await zichtbaar(page, '#startBeheer')) && await zichtbaar(page, '#startInhoud'));
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Kees (collega, vier rechten uit) op kantoor');
    bestelProject(); metRollen();
    ({ ctx, page } = await als('kees', null, 'pc'));
    check('geen + Nieuw project', !(await zichtbaar(page, '#startScherm button:has-text("+ Nieuw project")')));
    t = await page.$eval('#startRechten', e => e.hidden ? '' : e.textContent);
    check('bij zijn naam staat wat uit staat', /nieuw project/.test(t) && /weggooien/.test(t) && /bestellen/.test(t), t);
    check('geen back-upknop 💾', !(await zichtbaar(page, '#startBackup')));
    check('geen tabblad Beheer', !(await zichtbaar(page, '#startTabBeheer')));
    check('geen 🗑 bij de projecten', (await page.locator('#startProjecten button[onclick*="cloudVerwijder"]:visible').count()) === 0);
    await page.evaluate(() => { cloudNieuw(); });
    v = await wachtOpMelding(page, /nieuw project maken/);
    check('langs een andere weg toch "nieuw project": hij hoort waarom niet', v.ok && !(await zichtbaar(page, '#appInvoerVeld')), v.tekst);
    await sluitMeldingen(page);
    u = S.db.projecten.length;
    await open(page, 1);
    // De bestellijst maken zoals altijd (echte kliks). v124 (reparatie A5):
    // zonder bestelrecht geen bestellijst voor de leverancier, wel de reden.
    v = await exportZonderPdf(page, 'Bestellijst als PDF', /Bestellijst niet gemaakt|Naar de leverancier/);
    check('bestellijst zonder bestelrecht: geen pdf voor de leverancier, wel de reden (A5)', v.ok && !v.download &&
      /mag niet bestellen/.test(v.tekst) && !/Naar de leverancier/.test(v.tekst), v.download + ' ' + v.tekst.slice(0, 200));
    await sluitMeldingen(page);
    await wacht(500);
    check('… en er is niets besteld in de database', !bestellingenDb().length && rijVan(1).status !== 'besteld');
    {
      let kwam = false;
      const dl = page.waitForEvent('download', { timeout: 15000 }).then(() => { kwam = true; }, () => {});
      await page.click('button:has-text("⬇ Exporteren")');
      await page.click('button:has-text("PDF werkvloer")');
      await Promise.race([dl, wacht(15000)]);
      check('… de pdf voor de werkvloer maakt hij wel', kwam, await meldTekst(page));
      await sluitMeldingen(page);
    }
    await page.evaluate(() => { bestelmailVenster(); });
    v = await wachtOpMelding(page, /Bestelmail|mag niet bestellen/);
    check('… de bestelmail: niet, met de reden (A5)', v.ok && /mag niet bestellen/.test(v.tekst) && !(await zichtbaar(page, '#mailVerstuur')), v.tekst.slice(0, 160));
    await sluitMeldingen(page);
    // Een besteld project: ontgrendelen mag hij niet.
    await ctx.close();
    bestelProject(); metRollen();
    Object.assign(rijVan(1), { status: 'besteld' });
    rijVan(1).data.info.status = 'besteld';
    rijVan(1).data.info.bestellingen = [{ op: '2026-10-20T10:00:00.000Z', nr: 1, soort: 'eerste', door: 'julian', ruiten: {} }];
    ({ ctx, page } = await als('kees', null, 'pc', 1));
    await page.locator('button:visible:has-text("Ontgrendelen")').first().click();
    v = await wachtOpMelding(page, /ontgrendelen/);
    check('Ontgrendelen: hij hoort waarom niet (geen wachtwoordvraag)', v.ok && /mag geen besteld project ontgrendelen/.test(v.tekst) &&
      !(await zichtbaar(page, 'input[type="password"]:visible')), v.tekst);
    await sluitMeldingen(page);
    check('… en het project blijft op slot', await opSlot(page) && !((rijVan(1).data.info || {}).slot || {}).open);
    await ctx.close();
    // Rechten die op de server veranderen terwijl de app openstaat (A5):
    // Kees mag eerst bestellen; Jan zet het uit. Vlak vóór de bestellijst
    // haalt de app de rechten opnieuw op: geen pdf voor de leverancier.
    bestelProject(); metRollen();
    gRij('u2').mag_bestellen = true;
    ({ ctx, page } = await als('kees', null, 'pc', 1));
    check('eerst mag Kees bestellen (de app weet het)', !/geen-bestellen/.test(await lichaam(page)));
    gRij('u2').mag_bestellen = false;
    v = await exportZonderPdf(page, 'Bestellijst als PDF', /Bestellijst niet gemaakt|Naar de leverancier/);
    check('Jan zette bestellen net uit: de app haalt de rechten vers op, geen pdf voor de leverancier (A5)', v.ok && !v.download &&
      /mag niet bestellen/.test(v.tekst), v.download + ' ' + v.tekst.slice(0, 160));
    check('… en de app weet het nu ook', /geen-bestellen/.test(await lichaam(page)));
    await sluitMeldingen(page);
    // Jan zet het weer aan: zonder herladen kan Kees meteen weer bestellen.
    gRij('u2').mag_bestellen = true;
    await bestellijstPdf(page, TOCH);
    v = await wachtOpMelding(page, /Naar de leverancier|Bestellijst niet gemaakt/);
    check('Jan zet bestellen weer aan: zonder herladen komt de bestellijst weer (de app vraagt het na)', /Naar de leverancier/.test(v.tekst), v.tekst.slice(0, 120));
    await sluitMeldingen(page);
    await ctx.close();
    // Jan zet bestellen uit terwijl Kees in "Naar de leverancier?" staat: bij
    // ‹Ja, verstuurd› haalt de app de rechten nog eens op en legt niets vast.
    bestelProject(); metRollen();
    gRij('u2').mag_bestellen = true;
    ({ ctx, page } = await als('kees', null, 'pc', 1));
    await bestellijstPdf(page, TOCH);
    v = await wachtOpMelding(page, /Naar de leverancier/);
    gRij('u2').mag_bestellen = false;
    S.geweigerd = 0;
    await knop(page, 'Ja, verstuurd');
    v = await wachtOpMelding(page, /Bestelling niet vastgelegd/);
    check('‹Ja, verstuurd› terwijl Jan bestellen net uitzette: niets vastgelegd, met de reden (A5)', v.ok && /geen bestelling vastleggen/.test(v.tekst), v.tekst.slice(0, 160));
    await wacht(1500);
    check('… de app stuurde de bestelling niet eens (geen weigering van de database)', !S.geweigerd && !bestellingenDb().length && !apartBewaard().length,
      S.geweigerd + ' ' + apartBewaard().length);
    await sluitMeldingen(page);
    await ctx.close();
    // Kan de app de rechten niet ophalen (de vraag naar gebruikers mislukt),
    // dan geldt wat hij wist; de database weigert de bestelling. Dan alleen
    // die bestelling niet, en de rest van het werk wél in het project: niets
    // apart, en geen "↶ kan niet verder terug" (A5).
    bestelProject(); metRollen();
    gRij('u2').mag_bestellen = true;
    ({ ctx, page } = await als('kees', null, 'pc', 1));
    await kortMee(page);
    gRij('u2').mag_bestellen = false;
    S.fout['gebruikers:select'] = { code: '500', message: 'tijdelijk niet bereikbaar' };
    await bestellijstPdf(page, TOCH);
    v = await wachtOpMelding(page, /Naar de leverancier/);
    check('de app weet het niet: hij vraagt "Naar de leverancier?"', v.ok, v.tekst.slice(0, 120));
    await page.evaluate(() => { rijen[0].opmerking = 'na de pdf'; glasMarkeerWerk && glasMarkeerWerk(); });
    await knop(page, 'Ja, verstuurd');
    await wachtTot(() => (rijVan(1).data.rijen[0] || {}).opmerking === 'na de pdf', 15000);
    S.fout = {};
    check('de database weigert de bestelling: de rest staat wél in het project', (rijVan(1).data.rijen[0] || {}).opmerking === 'na de pdf',
      JSON.stringify(rijVan(1).data.rijen[0]).slice(0, 120));
    check('… zonder de bestelling, en het project niet besteld', !bestellingenDb().length && rijVan(1).status !== 'besteld');
    check('… niets apart bewaard', !apartBewaard().length, apartBewaard().map(p => p.naam).join(', '));
    check('… ook op het scherm geen bestelling en niet op slot', (await page.evaluate(() => (projectInfo.bestellingen || []).length)) === 0 && !(await opSlot(page)));
    v = await wachtOpMelding(page, /Niet vastgelegd/);
    check('… hij hoort waarom (bestelling niet vastgelegd, de rest wel opgeslagen)', v.ok && /bestelling vastleggen/.test(v.tekst) && /rest/.test(v.tekst), v.tekst.slice(0, 200));
    check('… en geen "↶ kan niet verder terug: op een ander apparaat gewijzigd"', !/kan niet verder terug/.test(await kortGezien(page)), await kortGezien(page));
    await wachtTot(async () => !(await ls(page, 'glasopname_pending')), 8000);
    check('… niets blijft hangen als "moet nog omhoog"', !(await ls(page, 'glasopname_pending')));
    await sluitMeldingen(page);
    await ctx.close();
    // Ontgrendelen met een verouderd recht: de app vraagt het eerst na.
    bestelProject(); metRollen();
    gRij('u2').mag_ontgrendelen = true;
    Object.assign(rijVan(1), { status: 'besteld' });
    rijVan(1).data.info.status = 'besteld';
    rijVan(1).data.info.bestellingen = [{ op: '2026-10-20T10:00:00.000Z', nr: 1, soort: 'eerste', door: 'julian', ruiten: {} }];
    ({ ctx, page } = await als('kees', null, 'pc', 1));
    gRij('u2').mag_ontgrendelen = false;
    await page.locator('button:visible:has-text("Ontgrendelen")').first().click();
    v = await wachtOpMelding(page, /ontgrendelen/);
    check('ontgrendelen terwijl Jan het net uitzette: de app vraagt het na en zegt waarom niet (A5)', v.ok &&
      /mag geen besteld project ontgrendelen/.test(v.tekst) && !(await zichtbaar(page, 'input[type="password"]:visible')), v.tekst.slice(0, 160));
    await sluitMeldingen(page);
    check('… het project blijft op slot', await opSlot(page) && !((rijVan(1).data.info || {}).slot || {}).open);
    await ctx.close();
    // ‹Apart bewaren› mag altijd, ook zonder het recht "nieuw project": Jan
    // nam het project over terwijl Kees eraan werkte.
    bestelProject(); metRollen();
    ({ ctx, page } = await als('kees', null, 'pc', 1));
    S.slot[P(1)] = Object.assign({}, S.slot[P(1)], { apparaat: 'pc-jan', naam: 'julian' });
    await typOpmerking(page, 'kees werkte door');
    await page.evaluate(() => window.opslaan());
    await wachtTot(() => apartBewaard().length === 1, 15000);
    check('Jan nam het project over: het werk van Kees staat apart, ook zonder "nieuw project" (apart bewaren mag altijd)',
      apartBewaard().length === 1 && apartBewaard()[0].data._apart === true && JSON.stringify(apartBewaard()[0].data).indexOf('kees werkte door') >= 0,
      apartBewaard().map(p => p.naam).join(', ') + ' ' + (S.geweigerd || 0));
    await sluitMeldingen(page);
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Wim (werkvloer) met de iPad op de bouw');
    gevelProject(); metRollen();
    rijVan(1).data._rev = 3;
    S.db.taken = [
      { id: 't1', project_id: P(1), tekst: 'sleutel ophalen', klaar: false, eigenaar: 'u3', eigenaar_naam: 'wim', volgorde: 1, aangemaakt_op: '2026-10-20T08:00:00Z' },
      { id: 't2', project_id: P(1), tekst: 'rooster nameten', klaar: false, eigenaar: 'u4', eigenaar_naam: 'bart', volgorde: 2, aangemaakt_op: '2026-10-20T08:00:00Z' }
    ];
    S.db.projecten.push(project(7, 'Heel oud', [], { verwijderd_op: new Date(Date.now() - 40 * 864e5).toISOString() }));
    ({ ctx, page } = await als('wim', IPAD, 'ipad'));
    check('startscherm: geen + Nieuw project, geen 💾, geen Beheer',
      !(await zichtbaar(page, '#startScherm button:has-text("+ Nieuw project")')) && !(await zichtbaar(page, '#startBackup')) &&
      !(await zichtbaar(page, '#startTabBeheer')));
    check('bij zijn naam: Werkvloer', /Werkvloer/.test(await page.$eval('#startRechten', e => e.hidden ? '' : e.textContent)));
    check('de werkvloer ruimt de prullenbak niet op (dat doet kantoor)', !!rijVan(7) && !(S.opruimDoor || []).includes('u3'));
    await open(page, 1);
    check('het project openen: Wim neemt het bewerkslot niet', !(S.slot[P(1)] && S.slot[P(1)].apparaat));
    check('… de app vraagt het ook niet (alleen de stand)', !(S.rpcLog || []).some(x => x.naam === 'glas_bewerken' && x.wie === 'u3' && x.actie !== 'stand'),
      JSON.stringify((S.rpcLog || []).filter(x => x.naam === 'glas_bewerken' && x.wie === 'u3').map(x => x.actie)));
    check('alleen kijken', await page.evaluate(() => glasAlleenKijken()));
    t = await page.$eval('#slotBalk', e => e.innerText.replace(/\s+/g, ' '));
    check('de balk zegt: werkvloer, foto\'s en eigen taken', /Werkvloer/.test(t) && /Foto's toevoegen/.test(t), t);
    check('… met de knop 📷 Foto toevoegen, zonder "Toch bewerken"', await zichtbaar(page, '#slotBalk button:has-text("Foto toevoegen")') &&
      !(await zichtbaar(page, '#slotBalk button:has-text("Toch bewerken")')));
    check('een maat staat uit', await page.locator('.maat-input, input[id^="breedte-"]').first().isDisabled().catch(() => true));
    if (process.env.PLAATJES) await page.screenshot({ path: path.join(process.env.PLAATJES, 'v124-werkvloer-ipad.png') });
    await page.evaluate(() => kijkWeigert());
    v = await wachtOpMelding(page, /werkvloer/);
    check('wat hij toch probeert te wijzigen: de uitleg voor de werkvloer (niet "een collega bewerkt")', v.ok && !/bewerkt dit project nu/.test(v.tekst), v.tekst);
    await sluitMeldingen(page);
    await page.evaluate(() => bewerkslotTochBewerken());
    v = await wachtOpMelding(page, /werkvloer/);
    check('"Toch bewerken" langs een andere weg: ook de uitleg', v.ok, v.tekst);
    await sluitMeldingen(page);
    // Een foto, met een tik op de knop.
    const ervoor = S.log.filter(x => x.wat === 'opslaan').length;
    check('een tik op 📷 Foto toevoegen opent de fotokiezer', await fotoViaKnop(page));
    await wachtTot(() => erbijFotos(1).length === 1, 15000);
    w = erbijFotos(1)[0] || {};
    check('de foto staat in het project, van wim', w._erbij && w._erbij.door === 'wim', JSON.stringify(w).slice(0, 200));
    check('… het bestand staat in de opslag (via de wachtrij)', await wachtTot(() => S.opslag.has(w.pad), 8000), w.pad);
    await wachtTot(() => erbijFotos(1)[0] && erbijFotos(1)[0].origineel && S.opslag.has(erbijFotos(1)[0].origineel.pad), 12000);
    check('… ook het origineel', !!(erbijFotos(1)[0] || {}).origineel && S.opslag.has(erbijFotos(1)[0].origineel.pad),
      JSON.stringify((erbijFotos(1)[0] || {}).origineel || null));
    check('… zonder dat Wim het project opsloeg (geen volledige opslag)', S.log.filter(x => x.wat === 'opslaan').length === ervoor);
    check('… en er is niets apart bewaard', !apartBewaard().length);
    t = await page.$eval('#syncMelding', e => e.style.display === 'none' ? '' : e.innerText).catch(() => '');
    check('… geen melding "je kunt alleen bekijken; wat je verandert wordt niet opgeslagen"', !/niet in het project opgeslagen/.test(t), t);
    check('… de rest van het project is hetzelfde (ruiten, bolletjes)', rijVan(1).data.rijen.length === 6 && rijVan(1).data.fotos[0].markeringen.length === 7);
    // Ook de vaste knop bovenaan Invoer ("📷 Foto toevoegen") werkt voor de werkvloer.
    check('Importeren staat er niet voor de werkvloer', !(await zichtbaar(page, '#actieBalk button:has-text("Importeren")')));
    {
      const k = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
      await page.locator('#actieBalk button:has-text("Foto toevoegen")').tap({ timeout: 8000 }).catch(() => {});
      const kz = await k;
      check('de vaste knop 📷 Foto toevoegen opent ook de kiezer (geen "alleen kijken")', !!kz && !/Alleen kijken/.test(await meldTekst(page)), await meldTekst(page));
      if (kz) await kz.setFiles([]);
    }
    // Zonder bereik.
    S.weg.ipad = true;
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    check('… zonder bereik opent de knop de kiezer ook', await fotoViaKnop(page));
    await wachtTot(async () => JSON.parse((await ls(page, 'glasopname_erbij')) || '[]').length === 1, 8000);
    check('zonder bereik: de foto wacht op het apparaat', JSON.parse((await ls(page, 'glasopname_erbij')) || '[]').length === 1 && erbijFotos(1).length === 1);
    await wachtTot(async () => /wacht op bereik/.test(await page.$eval('#slotBalk', e => e.innerText)), 5000);
    check('… de balk zegt het', /1 foto wacht op bereik/.test(await page.$eval('#slotBalk', e => e.innerText)));
    S.weg.ipad = false;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await wachtTot(() => erbijFotos(1).length === 2, 15000);
    check('bereik terug: de foto gaat het project in', erbijFotos(1).length === 2);
    await wachtTot(async () => !(await ls(page, 'glasopname_erbij')), 8000);
    check('… en wacht niet meer op het apparaat', !(await ls(page, 'glasopname_erbij')));
    // Taken: alleen de eigen afvinken.
    await page.locator('.tab-btn', { hasText: 'Project info' }).tap();
    await page.waitForSelector('#takenLijst .taak');
    await wacht(500);
    u = await page.$$eval('#takenLijst .taak', l => l.map(x => [x.querySelector('.taak-tekst').value,
      x.querySelector('input[type=checkbox]').disabled, x.querySelector('.taak-tekst').disabled, !!x.querySelector('.taak-weg')]));
    check('zijn eigen taak kan hij afvinken, die van Bart niet; tekst en ✕ niet', JSON.stringify(u) ===
      JSON.stringify([['sleutel ophalen', false, true, false], ['rooster nameten', true, true, false]]), JSON.stringify(u));
    check('… geen regel om een taak toe te voegen', !(await zichtbaar(page, '.taak-nieuw')));
    await page.locator('#takenLijst .taak').first().locator('input[type=checkbox]').tap();
    await wachtTot(() => S.db.taken.find(x => x.id === 't1').klaar === true, 8000);
    check('afvinken met een tik: in de database', S.db.taken.find(x => x.id === 't1').klaar === true && S.db.taken.find(x => x.id === 't2').klaar === false);
    check('geen fouten-melding na het afvinken', !/mislukt|Geen recht/.test(await meldTekst(page)), await meldTekst(page));
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Kantoor bewerkt, de werkvloer voegt tegelijk een foto toe');
    gevelProject(); metRollen();
    rijVan(1).data._rev = 3;
    const pc = await als('bart', null, 'pc', 1);
    check('Bart heeft het project (bewerkslot)', S.slot[P(1)] && S.slot[P(1)].apparaat && !(await pc.page.evaluate(() => glasAlleenKijken())));
    const ipad = await als('wim', IPAD, 'ipad', 1);
    // Bart zonder bereik, en hij werkt door.
    S.weg.pc = true;
    await pc.page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await typ(pc.page, "rijen[0].opmerking = 'kantoor offline';");
    check('Wim kiest een foto (tik)', await fotoViaKnop(ipad.page));
    await wachtTot(() => erbijFotos(1).length === 1, 15000);
    check('de foto van Wim staat in het project', erbijFotos(1).length === 1);
    S.weg.pc = false;
    await pc.page.evaluate(() => window.dispatchEvent(new Event('online')));
    await wachtTot(() => (rijVan(1).data.rijen[0] || {}).opmerking === 'kantoor offline', 15000);
    check('Bart komt terug: zijn werk gaat het project in (niet apart)', (rijVan(1).data.rijen[0] || {}).opmerking === 'kantoor offline' &&
      !apartBewaard().length, apartBewaard().map(p => p.naam).join(', '));
    check('… en de foto van Wim is er nog', erbijFotos(1).length === 1);
    await wachtTot(async () => (await pc.page.evaluate(() => fotos.filter(f => f._erbij).length)) === 1, 8000);
    check('… ook op het scherm van Bart', (await pc.page.evaluate(() => fotos.filter(f => f._erbij).length)) === 1);
    await typ(pc.page, "rijen[0].opmerking = 'en nog wat';");
    await wachtTot(() => (rijVan(1).data.rijen[0] || {}).opmerking === 'en nog wat', 8000);
    check('Bart werkt verder: de foto blijft', erbijFotos(1).length === 1 && !apartBewaard().length);
    await pc.ctx.close(); await ipad.ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. De prullenbak voor een collega');
    resetDb(); metRollen();
    S.db.projecten.push(project(8, 'Weg oud', [], { verwijderd_op: new Date(Date.now() - 31 * 864e5).toISOString() }),
                        project(9, 'Weg nieuw', [], { verwijderd_op: new Date(Date.now() - 2 * 864e5).toISOString() }));
    ({ ctx, page } = await als('bart', null, 'pc'));
    await wachtTot(() => !rijVan(8), 8000);
    check('na 30 dagen ruimt de app van Bart het op (automatisch)', !rijVan(8));
    check('… het project van 2 dagen blijft', !!rijVan(9));
    await page.click('#startPrullenbakBlok .start-blokkop');
    await wacht(300);
    check('Terugzetten staat er; "Nu definitief verwijderen" niet', await zichtbaar(page, '#startPrullenbak button:has-text("Terugzetten")') &&
      !(await zichtbaar(page, '#startPrullenbak button:has-text("Nu definitief")')));
    await page.evaluate(() => startDefinitief(document.querySelector('#startPrullenbak button[onclick^="startTerugzetten"]').getAttribute('onclick').match(/'([^']+)'/)[1]));
    v = await wachtOpMelding(page, /alleen de beheerder/);
    check('langs een andere weg: hij hoort dat alleen de beheerder dat kan', v.ok && !!rijVan(9), v.tekst);
    await ctx.close();
  }

  /* ══ 7 ════════════════════════════════════════════════════════ */
  if (doe('7')) {
    console.log('\n7. De fotowachtrij: een project dat intussen definitief weg is');
    resetDb(); metRollen();
    ({ ctx, page } = await als('bart', null, 'pc'));
    S.weg.pc = true;
    await page.evaluate(id => glasWachtrij.zet(id + '/late.jpg', new Blob(['jpeg'], { type: 'image/jpeg' }), { soort: 'beeld', type: 'image/jpeg', projectId: id }), P(77));
    S.weg.pc = false;
    await page.evaluate(() => glasWachtrij.verwerk());
    await wacht(1500);
    check('de foto van een verdwenen project gaat niet de opslag in', !S.opslag.has(P(77) + '/late.jpg') && S.uploads.indexOf(P(77) + '/late.jpg') < 0);
    check('… en staat niet meer in de wachtrij', (await page.evaluate(() => glasWachtrij.lijst().then(l => l.length))) === 0);
    await page.evaluate(id => glasWachtrij.zet(id + '/goed.jpg', new Blob(['jpeg'], { type: 'image/jpeg' }), { soort: 'beeld', type: 'image/jpeg', projectId: id }), P(1));
    await wachtTot(() => S.opslag.has(P(1) + '/goed.jpg'), 8000);
    check('een foto van een bestaand project gaat gewoon omhoog', S.opslag.has(P(1) + '/goed.jpg'));
    await ctx.close();
    resetDb(); S.s30 = false;
    ({ ctx, page } = await als('bart', null, 'pc'));
    await page.evaluate(id => glasWachtrij.zet(id + '/zonder30.jpg', new Blob(['jpeg'], { type: 'image/jpeg' }), { soort: 'beeld', type: 'image/jpeg', projectId: id }), P(77));
    await wachtTot(() => S.opslag.has(P(77) + '/zonder30.jpg'), 8000);
    check('zonder script 30 (de app weet het niet): gewoon uploaden, zoals v123', S.opslag.has(P(77) + '/zonder30.jpg'));
    await ctx.close();
  }

  /* ══ 8 ════════════════════════════════════════════════════════ */
  if (doe('8')) {
    console.log('\n8. Zonder bereik bij het starten: de werkvloer blijft werkvloer');
    gevelProject(); metRollen();
    ({ ctx, page } = await als('wim', IPAD, 'ipad', 1));
    check('eerst met bereik geopend: werkvloer', /rol-werkvloer/.test(await lichaam(page)));
    S.weg.ipad = true;
    await page.reload();
    await page.waitForFunction(() => window.glasProjectId, null, { timeout: 15000 });
    await wacht(1500);
    if (process.env.DEBUG) console.log(await page.evaluate(() => JSON.stringify({ id: glasGebruiker().id, ls: Object.keys(localStorage).filter(k => /rechten/.test(k)), rol: glasRol(), cls: document.body.className })));
    check('na herladen zonder bereik: nog steeds werkvloer (laatst bekend op dit apparaat)', /rol-werkvloer/.test(await lichaam(page)) &&
      await page.evaluate(() => glasAlleenKijken()));
    S.weg.ipad = false;
    await ctx.close();
  }

  /* ══ 9 ════════════════════════════════════════════════════════ */
  if (doe('9')) {
    console.log('\n9. Een apart bewaarde kopie houdt zijn foto\'s, ook als het origineel definitief weg is (A3)');
    resetDb(); metRollen();
    const f1 = P(1) + '/f1.jpg', los = P(1) + '/los.jpg', w1 = P(1) + '/w1.jpg', w2 = P(1) + '/w2.jpg';
    const r2 = P(2) + '/r.jpg', l2 = P(2) + '/weg.jpg';
    rijVan(1).data.fotos = [{ id: 'f1', pad: f1, titel: 'gevel', markeringen: [] }];
    // De kopie (zoals reddingenUploaden hem maakt): dezelfde foto, in de map van het origineel.
    S.db.projecten.push(project(11, 'Kerkstraat 1 (apart bewaard 26-10, kees)', [ruit(1, 'A1', '1000', '800')]));
    rijVan(11).data._apart = true;
    rijVan(11).data.fotos = [{ id: 'f1', pad: f1, titel: 'gevel', markeringen: [] }, { id: 'w1', pad: w1, titel: '', markeringen: [] }];
    rijVan(1).verwijderd_op = rijVan(2).verwijderd_op = new Date(Date.now() - 3 * 864e5).toISOString();
    [f1, los, r2, l2].forEach(k => S.opslag.set(k, { grootte: 10 }));
    ({ ctx, page } = await als('jan', null, 'pc'));
    // Op dit apparaat staat nog een redding van project 2 die niet omhoog kon
    // (de server neemt even geen nieuw project aan).
    S.fout['projecten:insert'] = { code: '500', message: 'tijdelijk niet bereikbaar' };
    await page.evaluate(([pad]) => localStorage.setItem('glasopname_redding', JSON.stringify([{ op: Date.now(), reden: 'proef',
      wie: 'julian', data: { project: 'Molenweg 2', rijen: [{ id: 1, merk: 'B1', breedte: '1200', hoogte: '600' }],
      fotos: [{ id: 'r', pad: pad, titel: '', markeringen: [] }], info: {} } }])), [r2]);
    t = await page.evaluate(id => glasDefinitiefZonderVraag(id), P(1));
    check('het origineel gaat definitief weg', t !== false && !rijVan(1), String(t));
    await wachtTot(() => !S.opslag.has(los), 8000);
    check('… de foto die alleen het origineel noemde, is uit de opslag', !S.opslag.has(los));
    check('… de foto die de kopie ook noemt, staat er nog (A3)', S.opslag.has(f1));
    await page.evaluate(id => glasDefinitiefZonderVraag(id), P(2));
    await wachtTot(() => !S.opslag.has(l2), 8000);
    check('een project weg terwijl een redding op dit apparaat zijn foto noemt: die foto blijft', !S.opslag.has(l2) && S.opslag.has(r2));
    // De wachtrij: foto's van het (nu weg zijnde) origineel.
    S.weg.pc = true;
    await page.evaluate(([a, b, id]) => Promise.all([a, b].map(pd => glasWachtrij.zet(pd, new Blob(['jpeg'], { type: 'image/jpeg' }),
      { soort: 'beeld', type: 'image/jpeg', projectId: id }))), [w1, w2, P(1)]);
    S.weg.pc = false;
    await page.evaluate(() => glasWachtrij.verwerk());
    await wachtTot(() => S.opslag.has(w1), 8000);
    check('de wachtrij: een foto die de kopie noemt, gaat alsnog omhoog', S.opslag.has(w1));
    check('… een foto die niemand meer noemt, niet', !S.opslag.has(w2) && S.uploads.indexOf(w2) < 0);
    // Opslag nakijken: de foto van de kopie is "in gebruik", geen wees.
    await page.click('#startTabBeheer');
    await page.click('button:has-text("Opslag nakijken")');
    await page.waitForSelector('#beheerOpslag table');
    t = await page.$eval('#beheerOpslag tr[data-soort="5"]', e => e.innerText.replace(/\s+/g, ' '));
    check('opslag nakijken: de foto\'s van de kopie tellen als in gebruik', / 2 /.test(t + ' '), t);
    t = await page.$eval('#beheerOpslag tr[data-soort="1"]', e => e.innerText.replace(/\s+/g, ' '));
    check('… zonder project: alleen de foto van de redding (de server weet niet van dit apparaat)', / 1 /.test(t + ' '), t);
    await page.click('#beheerOpslag button:has-text("zonder project opruimen")');
    await wachtOpMelding(page, /Ze horen nergens meer bij/);
    await knop(page, 'Opruimen');
    await wacht(1500);
    check('… opruimen laat de foto van de redding op dit apparaat staan', S.opslag.has(r2));
    await sluitMeldingen(page);
    // Nu gaat ook de kopie weg: dan mag de foto in de map van het origineel ook weg.
    rijVan(11).verwijderd_op = new Date().toISOString();
    await page.evaluate(id => glasDefinitiefZonderVraag(id), P(11));
    await wachtTot(() => !S.opslag.has(f1), 8000);
    check('de kopie definitief weg: zijn foto\'s in de map van het origineel ook', !rijVan(11) && !S.opslag.has(f1) && !S.opslag.has(w1));
    S.fout = {};
    await ctx.close();
  }

  /* ══ 10 ═══════════════════════════════════════════════════════ */
  if (doe('10')) {
    console.log('\n10. Geblokkeerd, uitloggen met foto\'s die wachten, veel foto\'s, de werkvloer en de bestellijst');
    resetDb(); metRollen();
    gRij('u4').actief = false;
    ({ ctx, page } = await als('bart', null, 'pc'));
    await wachtTot(() => zichtbaar(page, '#startGeblokkeerd'), 8000);
    t = await page.$eval('#startGeblokkeerd', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
    check('Bart geblokkeerd: het startscherm zegt het, met wat er met zijn werk gebeurt (A6)', await zichtbaar(page, '#startGeblokkeerd') &&
      /geblokkeerd door de beheerder/.test(t) && /veilig apart/.test(t), t);
    check('… geen + Nieuw project', !(await zichtbaar(page, '#startScherm button:has-text("+ Nieuw project")')));
    gRij('u4').actief = true;
    await page.evaluate(() => glasMijnLaden());
    await wachtTot(async () => !(await zichtbaar(page, '#startGeblokkeerd')), 5000);
    check('… weer vrijgegeven: de melding is weg', !(await zichtbaar(page, '#startGeblokkeerd')));
    await ctx.close();
    // De werkvloer logt uit terwijl er een foto wacht (A7).
    gevelProject(); metRollen();
    ({ ctx, page } = await als('wim', IPAD, 'ipad', 1));
    S.weg.ipad = true;
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await fotoViaKnop(page);
    await wachtTot(async () => JSON.parse((await ls(page, 'glasopname_erbij')) || '[]').length === 1, 8000);
    page.evaluate(() => { cloudUitloggen(); });
    v = await wachtOpMelding(page, /nog niet verstuurd|nog niet in het project/);
    check('uitloggen met een foto die nog wacht: de app zegt het eerst (A7)', v.ok && /pas omhoog als jij weer/.test(v.tekst), v.tekst.slice(0, 200));
    await knop(page, 'Annuleren');
    await wacht(500);
    check('… Annuleren: hij blijft ingelogd, de foto wacht nog', await page.evaluate(() => !!(window.glasGebruiker && glasGebruiker() && glasGebruiker().id)) &&
      JSON.parse((await ls(page, 'glasopname_erbij')) || '[]').length === 1);
    // Veel foto's in korte tijd (S1): de database houdt er even een tegen.
    S.fotoRem = { [P(1)]: 1 };
    S.weg.ipad = false;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await wachtTot(() => !S.fotoRem[P(1)], 8000);
    check('de database zegt "veel foto\'s in korte tijd": de foto blijft op het apparaat', S.fotoRem[P(1)] === 0 &&
      JSON.parse((await ls(page, 'glasopname_erbij')) || '[]').length === 1 && !/Veel foto/.test(await meldTekst(page)));
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await wachtTot(() => erbijFotos(1).length === 1, 10000);
    check('… en gaat er bij de volgende poging alsnog in', erbijFotos(1).length === 1);
    // De bestellijst op de werkvloer (A10): de juiste uitleg.
    v = await exportZonderPdf(page, 'Bestellijst als PDF', /werkvloer|Bestellijst niet gemaakt/);
    check('de werkvloer en de bestellijst: geen pdf, de uitleg voor de werkvloer (niet "de beheerder heeft dat uitgezet")', v.ok && !v.download &&
      /werkvloer/.test(v.tekst) && !/beheerder heeft dat uitgezet/.test(v.tekst), v.tekst.slice(0, 200));
    await sluitMeldingen(page);
    await ctx.close();
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
