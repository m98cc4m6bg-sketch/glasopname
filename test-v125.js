/* Testreeks v125 — node test-v125.js   (en: --mutaties)

   Onderwerp: wat Jan vond na v124 en zijn keuzes van 27-10-2026
   (WENSEN-v125): "↩ Verder met …" na de prullenbak, de naam van een project
   in de prullenbak meteen vrij (script 31), de werkvloer mag de leverfoto
   zetten en taken zonder eigenaar afvinken, de zwarte spacer bij glas zonder
   spouw en op de werkvloer-pdf, een ruit die naar een blok met een andere
   speling verhuist, en de onderlat met plaatjes.

   1. De echte situatie: Jan op de Mac op kantoor, een collega op een ander
      apparaat die intussen een project weggooit, de werkvloer met een iPad op
      de bouw. Script 31 is wel of (nog) niet gedraaid.
   2. De belofte (Jan): een weggegooid project staat niet meer als "Verder
      met" op het startscherm; een nieuw project mag de naam krijgen van een
      project in de prullenbak; wie dat oude project terugzet, krijgt het als
      "Naam (2)" terug en hoort dat; de werkvloer kan op de bouw de leverfoto
      zetten en taken zonder eigenaar afvinken (niet die van een ander); een
      zwarte spacer verdwijnt als het glas geen spouw meer heeft, en staat op
      de werkvloer-pdf; een verhuisde ruit houdt zijn glasmaat (eigen
      speling, geel, met uitleg) en telt na een bestelling niet als gewijzigd.
   3. Wat er misgaat als het niet klopt: iemand opent een weggegooid project
      ("bestaat niet meer"), kan een adres niet opnieuw gebruiken, een
      teruggezet project botst met een nieuw, de werkvloer kan niets met de
      leverfoto, de leverancier krijgt een spacer die niet bestaat, of een
      ruit krijgt stil een andere glasmaat (verkeerd glas besteld).
   4. Wat er halverwege kan gebeuren: een collega gooit het project weg op
      een ander apparaat; de lijst is gezocht of afgekapt (dan weten we niet
      of het project weg is: niets wissen); twee mensen maken tegelijk een
      project met dezelfde naam (de database weigert: opnieuw vragen).
   5. Wat deze opstelling aanneemt: de nagebootste database van
      test-v124-rechten (met script 30), hier aangevuld met een nabootsing van
      script 31 (de unieke naam alleen buiten de prullenbak, "(2)" bij
      terugzetten, de leverfoto en taken zonder eigenaar voor de werkvloer).
      Of script 31 zelf klopt, bewijst de proef tegen een echte PostgreSQL
      (zip "niet-in-repo", proef-script-31). Echte Chromium; de iPad als
      Chromium-profiel met aanraken. Echte Safari, iPad, Android en Windows:
      niet hier. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');


/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  verderElders: ['start.js', '    if (lijstVolledig && !projectenCache.some(', '    if (false && !projectenCache.some('],
  verderZoek: ['start.js', '      lijstVolledig = !String(zoek || \'\').trim() &&\n', '      lijstVolledig = true &&\n'],
  naamVrij: ['cloud.js', '    if (bestaand && bestaand.verwijderd_op && await naamVrijInPrullenbak()) bestaand = null;\n', ''],
  naam23505: ['cloud.js', "      if (res.error && res.error.code === '23505') {", '      if (false) {'],
  naamOpen: ['cloud.js', '    veld.value = String(rij.naam);', '    return;'],
  terugMelding: ['cloud.js', '    if (r0.naam && oud && naamVergelijk(r0.naam) !== naamVergelijk(oud)) {', '    if (false) {'],
  wvLeverKnop: ['rechten.js', "      (window.glasScript31 ? ' <button type=\"button\" class=\"btn btn-secondary btn-sm vrij-bij-slot wv-lever-knop\" ' +", "      (false ? ' <button type=\"button\" class=\"btn btn-secondary btn-sm vrij-bij-slot wv-lever-knop\" ' +"],
  wvLeverSoort: ['rechten.js', "    if (foto.soort === 'lever') kort.soort = 'lever';", ''],
  wvLeverLokaal: ['fotos.js', "            if (wv) fotos = fotos.filter(function (x) { return x.soort !== 'lever'; });\n", ''],
  script31Onthouden: ['cloud.js', "if (naamVrijPrul) localStorage.setItem('glasopname_script31', '1'); else ", ''],
  wvTaakZonder: ['project.js', ' && !(!t.eigenaar && window.glasScript31);', ';'],
  spacerWis: ['index.html', "  rij.opbouw = '';\n  berekenDikte(rij);\n  spacerNaWissel([rij]);   // v125\n", "  rij.opbouw = '';\n  berekenDikte(rij);\n"],
  spacerLeeg: ['index.html', "r.spacer === 'zwart' && r.glasType && !heeftSpouw(r)", "r.spacer === 'zwart' && !heeftSpouw(r)"],
  spacerPdf: ['pdf.js', "(window.spacerZwart && spacerZwart(r) ? ', spacer zwart' : '')", "''"],
  spelingHoud: ['index.html', '  rij.correctie = voor;\n  rij.correctieMee = true;   // zie ruitKenmerk\n', ''],
  spelingKenmerk: ['index.html', "(v === 'correctie' && rij.correctieMee) ? ''", "false ? ''"],
  spelingUitleg: ['index.html', '  const uitleg = eigen && +rij.correctie !== alg\n', '  const uitleg = false\n'],
  spelingZelf: ['index.html', '  delete rij.correctieMee;   // v125: nu een eigen keuze (telt in het kenmerk)\n', ''],
};
const WAAR = { verderElders: '1', verderZoek: '1', naamVrij: '2', naam23505: '2', naamOpen: '2', terugMelding: '2',
  wvLeverKnop: '3', wvLeverSoort: '3', wvLeverLokaal: '3', script31Onthouden: '3', wvTaakZonder: '3', spacerWis: '4', spacerLeeg: '4', spacerPdf: '4',
  spelingHoud: '5', spelingKenmerk: '5', spelingUitleg: '5', spelingZelf: '5' };


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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v125-pdf-'));
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


/* ─── v125: nabootsing van script 31 ──────────────────────────── */
// Zonder script 31 (S.s31 onwaar): de unieke index van script 03 telt ook de
// prullenbak mee, en de functie glas_naam_vrij_in_prullenbak bestaat niet.
// Met script 31: de index alleen buiten de prullenbak, de trigger
// naam_bij_terugzetten ("Naam (2)"), en de werkvloer mag de leverfoto zetten
// en taken zonder eigenaar afvinken.
const naamN = n => String(n || '').trim().toLowerCase();
const DUBBEL = { code: '23505', message: 'duplicate key value violates unique constraint "projecten_naam_uniek"' };
const echteDb30 = dbVraag;
dbVraag = function (st) {
  if (S.offline || !S.wie || st.tabel !== 'projecten') {
    // Taken zonder eigenaar: de werkvloer mag ze afvinken (script 31).
    if (S.s31 && st.tabel === 'taken' && st.op === 'update' && S.wie && rolVan(S.wie.id) === 'werkvloer') {
      const geraakt = S.db.taken.filter(t => Object.keys(st.filters).every(k => t[k] === st.filters[k]));
      if (geraakt.length && geraakt.every(t => t.eigenaar == null || t.eigenaar === S.wie.id) &&
          Object.keys(st.velden).every(k => ['klaar', 'afgerond_op', 'afgerond_door'].indexOf(k) >= 0)) {
        const eigen = S.wie.id, bewaar = geraakt.map(t => t.eigenaar);
        geraakt.forEach(t => { t.eigenaar = eigen; });         // de controle van script 30 laten slagen
        const uit = echteDb30(st);
        geraakt.forEach((t, i) => { t.eigenaar = bewaar[i]; }); // en de eigenaar blijft wat hij was
        return uit;
      }
    }
    return echteDb30(st);
  }
  const telt = p => S.s31 ? !p.verwijderd_op : true;
  if (st.op === 'insert') {
    const l = Array.isArray(st.nieuw) ? st.nieuw : [st.nieuw];
    if (l.some(v => S.db.projecten.some(p => telt(p) && naamN(p.naam) === naamN(v.naam)))) return { data: null, error: DUBBEL };
  }
  if (st.op === 'update') {
    const geraakt = S.db.projecten.filter(p => Object.keys(st.filters).every(k => p[k] === st.filters[k]));
    if (S.s31 && ('verwijderd_op' in st.velden) && st.velden.verwijderd_op == null) {
      geraakt.filter(p => p.verwijderd_op).forEach(p => {
        const basis = String(p.naam || '').trim();
        const bezet = k => S.db.projecten.some(q => q.id !== p.id && !q.verwijderd_op && naamN(q.naam) === naamN(k));
        if (!basis || !bezet(basis)) return;
        let n = 2; while (bezet(basis + ' (' + n + ')')) n++;
        st.velden.naam = basis + ' (' + n + ')';
        (S.hernoemd = S.hernoemd || []).push(st.velden.naam);
      });
    }
    for (const p of geraakt) {
      const naam = 'naam' in st.velden ? st.velden.naam : p.naam;
      const actief = 'verwijderd_op' in st.velden ? !st.velden.verwijderd_op : !p.verwijderd_op;
      if ((S.s31 ? actief : true) && S.db.projecten.some(q => q.id !== p.id && telt(q) && naamN(q.naam) === naamN(naam))) {
        return { data: null, error: DUBBEL };
      }
    }
    const uit = echteDb30(st);
    // PostgREST geeft de gevraagde kolommen terug (select('id,naam,data')).
    if (!uit.error && st.terug && st.kols && st.kols !== 'id' && Array.isArray(uit.data)) {
      const kols = String(st.kols).split(',').map(k => k.trim());
      uit.data = uit.data.map(x => { const r = S.db.projecten.find(p => p.id === x.id) || x; const o = {};
        kols.forEach(k => { o[k] = JSON.parse(JSON.stringify(r[k] === undefined ? null : r[k])); }); return o; });
    }
    return uit;
  }
  const uit = echteDb30(st);
  if (st.op === 'select' && S.verberg && Array.isArray(uit.data)) uit.data = uit.data.filter(r => r.id !== S.verberg);
  return uit;
};
const echteRpc30 = rpcVraag;
rpcVraag = function (v) {
  if (S.offline) return echteRpc30(v);
  if (v.naam === 'glas_naam_vrij_in_prullenbak') {
    (S.rpc31 = S.rpc31 || []).push(S.wie && S.wie.id);
    return S.s31 ? { data: true, error: null } : { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.glas_naam_vrij_in_prullenbak' } };
  }
  if (v.naam === 'glas_foto_erbij' && S.s31 && v.args && v.args.p_foto && v.args.p_foto.soort === 'lever') {
    // Script 31: een leverfoto (pad <project>/lever-…) vervangt de vorige.
    const a = v.args, f = a.p_foto, p = S.db.projecten.find(x => x.id === a.p_project);
    if (String(f.pad || '').indexOf(a.p_project + '/lever-') !== 0) return { data: null, error: { code: 'P0001', message: 'Foto onleesbaar.' } };
    const er = p && (p.data.fotos || []).find(x => x.id === f.id);
    if (p && !er) p.data.fotos = (p.data.fotos || []).filter(x => x.soort !== 'lever');
    const uit = echteRpc30(v);
    const nu = p && p.data.fotos.find(x => x.id === f.id);
    // (Het echte script zet dit vóór het opslaan; dan hoort het ook in het live bericht.)
    if (nu) { Object.assign(nu, { soort: 'lever', titel: 'Leverlocatie', inkt: [] }); live('projecten', p); }
    return uit;
  }
  return echteRpc30(v);
};
const verderTekst = page => page.$eval('#startVerder', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
const laatst = page => ls(page, 'glasopname_laatst');
const kortVan = page => page.evaluate(() => (window.__kort || []).join(' | '));
const levers = n => ((rijVan(n).data || {}).fotos || []).filter(f => f.soort === 'lever');
const TWEE = 'f2';
// De gevel met een tweede tekening (f2, speling 7). A heeft één bolletje op
// tekening 1 en één op tekening 2 (gelijk: de eerste wint, A staat bij 1).
function tweeBlokken(extra) {
  gevelProject(p => {
    p.data.fotos.push({ id: TWEE, pad: P(1) + '/gevel2.jpg', titel: 'Achtergevel', breedte: 800, hoogte: 600, inkt: [], speling: '7',
      markeringen: [{ rijId: 1, x: 0.5, y: 0.5 }] });
    if (extra) extra(p);
  });
}

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, t, u, v, w;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. "↩ Verder met …" na de prullenbak (gevonden door Jan)');
    resetDb(); metRollen(); S.s31 = true;
    S.db.projecten.push(project(3, 'Klaver (glas in lood)', [ruit(1, 'K1', '600', '600')]));
    ({ ctx, page } = await als('jan', null, 'pc', 3));
    await startScherm(page);
    t = await verderTekst(page);
    check('na het openen: "↩ Verder met Klaver (glas in lood)"', /Verder met Klaver \(glas in lood\)/.test(t), t);
    // Met de 🗑 in de lijst (zoals Jan deed).
    await page.locator('#startProjecten .start-project', { hasText: 'Klaver' }).first()
      .locator('button[onclick*="cloudVerwijder"]').click();
    await knop(page, 'Naar de prullenbak');
    await wachtTot(() => !!rijVan(3).verwijderd_op, 8000);
    await wacht(800);
    check('naar de prullenbak: in de database', !!rijVan(3).verwijderd_op);
    t = await verderTekst(page);
    check('… "Verder met" is weg van het startscherm', !/Verder met/.test(t), t);
    check('… en het apparaat onthoudt het project niet meer', !(await laatst(page)), await laatst(page));
    await startScherm(page);
    check('… ook niet na herladen', !/Verder met/.test(await verderTekst(page)), await verderTekst(page));
    // Een collega gooit een project weg op zijn eigen apparaat.
    await open(page, 2);
    await startScherm(page);
    check('Molenweg 2 geopend: "Verder met Molenweg 2"', /Verder met Molenweg 2/.test(await verderTekst(page)), await verderTekst(page));
    // Zoeken (de lijst is niet volledig): Molenweg staat niet in de lijst, maar
    // dat zegt niets. "Verder met" blijft, en het apparaat vergeet niets.
    await zoekOpStart(page, 'Kerkstraat');
    check('zoeken op "Kerkstraat" (Molenweg staat dan niet in de lijst): het apparaat vergeet Molenweg 2 niet',
      new RegExp(P(2)).test(await laatst(page) || ''), await verderTekst(page) + ' / ' + await laatst(page));
    await page.fill('#startZoek', ''); await wacht(900);
    check('… zoekvak leeg: "Verder met Molenweg 2" staat er weer', /Verder met Molenweg 2/.test(await verderTekst(page)), await verderTekst(page));
    rijVan(2).verwijderd_op = new Date().toISOString();          // Bart, op kantoor
    await startScherm(page);
    t = await verderTekst(page);
    check('een collega gooide Molenweg 2 weg (ander apparaat): "Verder met" is weg', !/Verder met/.test(t), t);
    check('… en vergeten op dit apparaat', !(await laatst(page)), await laatst(page));
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. De naam van een project in de prullenbak is meteen vrij (script 31)');
    resetDb(); metRollen(); S.s31 = false;
    rijVan(1).verwijderd_op = new Date(Date.now() - 864e5).toISOString();
    ({ ctx, page } = await als('jan', null, 'pc'));
    page.evaluate(() => { cloudNieuw(); });
    await page.waitForSelector('.melding-laag input', { timeout: 8000 });
    await page.fill('.melding-laag input', 'Kerkstraat 1');
    await knop(page, 'Aanmaken');
    v = await wachtOpMelding(page, /staat in de prullenbak/);
    check('zonder script 31: zoals v124 ("… staat in de prullenbak. Kies een andere naam")', v.ok, v.tekst);
    check('… niets aangemaakt', S.db.projecten.filter(p => naamN(p.naam) === 'kerkstraat 1').length === 1);
    await sluitMeldingen(page);
    await ctx.close();
    // Met script 31.
    resetDb(); metRollen(); S.s31 = true;
    rijVan(1).verwijderd_op = new Date(Date.now() - 864e5).toISOString();
    ({ ctx, page } = await als('jan', null, 'pc'));
    page.evaluate(() => { cloudNieuw(); });
    await page.waitForSelector('.melding-laag input', { timeout: 8000 });
    await page.fill('.melding-laag input', 'kerkstraat 1 ');
    await knop(page, 'Aanmaken');
    await wachtTot(() => S.db.projecten.filter(p => naamN(p.naam) === 'kerkstraat 1').length === 2, 8000);
    u = S.db.projecten.filter(p => naamN(p.naam) === 'kerkstraat 1');
    check('met script 31: een nieuw project "kerkstraat 1" naast het oude in de prullenbak', u.length === 2 && u.filter(p => !p.verwijderd_op).length === 1,
      JSON.stringify(S.db.projecten.map(p => [p.naam, !!p.verwijderd_op])) + ' | ' + await meldTekst(page));
    check('… zonder melding', !/al een project|in gebruik/.test(await meldTekst(page)), await meldTekst(page));
    const nieuwId = (u.find(p => !p.verwijderd_op) || {}).id;
    // Het oude terugzetten vanuit de prullenbak op het startscherm.
    await startScherm(page);
    await page.evaluate(() => { if (window.startPrullenbakKlap) startPrullenbakKlap(); });
    await wacht(400);
    await page.locator('#startPrullenbak button:has-text("Terugzetten")').first().click();
    v = await wachtOpMelding(page, /Teruggezet als/);
    check('terugzetten terwijl de naam bezet is: "Kerkstraat 1 (2)" (de database)', rijVan(1).naam === 'Kerkstraat 1 (2)' && !rijVan(1).verwijderd_op,
      rijVan(1).naam);
    check('… en de app zegt het: "Teruggezet als ‹Kerkstraat 1 (2)›"', v.ok && /Kerkstraat 1 \(2\)/.test(v.tekst), v.tekst);
    check('… het nieuwe project heet nog gewoon "kerkstraat 1 "', S.db.projecten.find(p => p.id === nieuwId).naam === 'kerkstraat 1 ');
    await sluitMeldingen(page);
    await kortMee(page);
    await open(page, 1);
    await kortMee(page);
    await wachtTot(() => (rijVan(1).data || {}).project === 'Kerkstraat 1 (2)', 8000);
    check('het teruggezette project openen: de naam in het project wordt "Kerkstraat 1 (2)"',
      await page.$eval('#projectNaam', e => e.value) === 'Kerkstraat 1 (2)', await page.$eval('#projectNaam', e => e.value));
    check('… en zo opgeslagen (de naam botst niet meer)', rijVan(1).data.project === 'Kerkstraat 1 (2)' && rijVan(1).naam === 'Kerkstraat 1 (2)',
      JSON.stringify([rijVan(1).naam, rijVan(1).data.project]));
    check('… de ruit is er nog', JSON.stringify(rijVan(1).data.rijen.filter(r => r.merk).map(r => [r.merk, r.breedte])) === '[["A1","1000"]]', JSON.stringify(rijVan(1).data.rijen));
    // Twee mensen tegelijk dezelfde naam: de database weigert de tweede.
    S.db.projecten.push(project(8, 'Dijkweg 4', []));
    await startScherm(page);
    // De naamcontrole ziet "Dijkweg 4" nog niet (een collega maakte hem net
    // eerder): de vraag naar de namen laat hem even weg; de database weigert.
    S.verberg = P(8);
    page.evaluate(() => { cloudNieuw(); });
    await page.waitForSelector('.melding-laag input', { timeout: 8000 });
    await page.fill('.melding-laag input', 'Dijkweg 4');
    await knop(page, 'Aanmaken');
    v = await wachtOpMelding(page, /al in gebruik/);
    S.verberg = null;
    check('tegelijk dezelfde naam: opnieuw gevraagd met uitleg, niets dubbel', v.ok && S.db.projecten.filter(p => naamN(p.naam) === 'dijkweg 4').length === 1,
      v.tekst + ' | ' + S.db.projecten.map(p => p.naam).join(', '));
    await sluitMeldingen(page);
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. De werkvloer: leverfoto zetten, taken zonder eigenaar afvinken');
    gevelProject(); metRollen(); S.s31 = false;
    ({ ctx, page } = await als('wim', IPAD, 'ipad', 1));
    t = await page.$eval('#slotBalk', e => e.innerText.replace(/\s+/g, ' '));
    check('zonder script 31: geen knop 📍 Leverfoto (zoals v124)', !(await zichtbaar(page, '#slotBalk button:has-text("Leverfoto")')) && !/leverfoto/.test(t), t);
    check('… en het apparaat onthoudt niets', !(await ls(page, 'glasopname_script31')));
    await ctx.close();
    gevelProject(p => {
      S.opslag.set(P(1) + '/lever-oud.jpg', { grootte: 1000 });
      p.data.fotos.push({ id: 'leveroud', soort: 'lever', pad: P(1) + '/lever-oud.jpg', titel: 'Leverlocatie', breedte: 800, hoogte: 600,
        markeringen: [], inkt: [] });
    });
    metRollen(); S.s31 = true;
    rijVan(1).data._rev = 3;
    S.db.taken = [
      { id: 't1', project_id: P(1), tekst: 'sleutel ophalen', klaar: false, eigenaar: null, eigenaar_naam: null, volgorde: 1, aangemaakt_op: '2026-10-20T08:00:00Z' },
      { id: 't2', project_id: P(1), tekst: 'rooster nameten', klaar: false, eigenaar: 'u4', eigenaar_naam: 'bart', volgorde: 2, aangemaakt_op: '2026-10-20T08:00:00Z' },
      { id: 't3', project_id: P(1), tekst: 'foto achterkant', klaar: false, eigenaar: 'u3', eigenaar_naam: 'wim', volgorde: 3, aangemaakt_op: '2026-10-20T08:00:00Z' }
    ];
    ({ ctx, page } = await als('wim', IPAD, 'ipad', 1));
    await wachtTot(async () => /Leverfoto/.test(await page.$eval('#slotBalk', e => e.innerText)), 6000);
    t = await page.$eval('#slotBalk', e => e.innerText.replace(/\s+/g, ' '));
    check('met script 31: de balk noemt de leverfoto en taken zonder eigenaar', /de leverfoto zetten/.test(t) && /taken zonder eigenaar/.test(t), t);
    check('… en het apparaat onthoudt dat script 31 er is (voor zonder bereik)', (await ls(page, 'glasopname_script31')) === '1');
    if (PLAATJES) {   // de balk op telefoonbreedte (twee knoppen naast de uitleg)
      await page.setViewportSize({ width: 390, height: 844 }); await wacht(300);
      await page.locator('#slotBalk').screenshot({ path: path.join(PLAATJES, 'v125-werkvloer-balk-390.png') });
      check('op telefoonbreedte past de balk (geen horizontaal schuiven)', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.setViewportSize(IPAD.viewport); await wacht(300);
    }
    {
      const k = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
      await page.locator('#slotBalk button:has-text("Leverfoto")').tap({ timeout: 8000 }).catch(() => {});
      const kz = await k;
      check('een tik op 📍 Leverfoto opent de fotokiezer', !!kz);
      if (kz) await kz.setFiles(GEVEL_JPG);
    }
    await wachtTot(() => levers(1).length === 1 && levers(1)[0].id !== 'leveroud', 15000);
    w = levers(1);
    check('de nieuwe leverfoto staat in het project en vervangt de oude (één leverfoto)', w.length === 1 && w[0].id !== 'leveroud' &&
      /\/lever-/.test(w[0].pad) && w[0]._erbij && w[0]._erbij.door === 'wim', JSON.stringify(w).slice(0, 300));
    check('… het bestand staat in de opslag', await wachtTot(() => S.opslag.has((levers(1)[0] || {}).pad), 8000));
    await wachtTot(() => !!(levers(1)[0] || {}).origineel, 12000);
    check('… ook het origineel, en nog steeds één leverfoto', levers(1).length === 1 && !!levers(1)[0].origineel, JSON.stringify(levers(1)).slice(0, 300));
    u = await page.evaluate(() => fotos.filter(f => f.soort === 'lever').map(f => f.id));
    if (process.env.DEBUG) console.log(await page.evaluate(() => JSON.stringify(fotos.map(f => [f.id, f.soort, f.pad]))));
    check('… op de iPad zelf ook maar één leverfoto, de nieuwe', u.length === 1 && u[0] === levers(1)[0].id, JSON.stringify(u));
    check('… de rest van het project is hetzelfde (ruiten, bolletjes)', rijVan(1).data.rijen.length === 6 && rijVan(1).data.fotos[0].markeringen.length === 7);
    // Zonder bereik nog een leverfoto (de vorige was niet goed): op de iPad
    // meteen de nieuwe, niet twee; met bereik vervangt hij die in het project.
    const vorige = levers(1)[0].id;
    S.weg.ipad = true;
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    {
      const k = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
      await page.locator('#slotBalk button:has-text("Leverfoto")').tap({ timeout: 8000 }).catch(() => {});
      const kz = await k;
      if (kz) await kz.setFiles(GEVEL_JPG);
    }
    await wachtTot(async () => JSON.parse((await ls(page, 'glasopname_erbij')) || '[]').length >= 1, 10000);
    u = await page.evaluate(() => ({ levers: fotos.filter(f => f.soort === 'lever').map(f => f.id), getoond: (leverFoto() || {}).id }));
    check('zonder bereik nog een leverfoto: op de iPad één leverfoto, de nieuwe', u.levers.length === 1 && u.levers[0] !== vorige && u.getoond === u.levers[0],
      JSON.stringify(u) + ' vorige ' + vorige);
    S.weg.ipad = false;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await wachtTot(() => levers(1).length === 1 && levers(1)[0].id === u.levers[0], 15000);
    check('… bereik terug: in het project vervangt hij de vorige', levers(1).length === 1 && levers(1)[0].id === u.levers[0], JSON.stringify(levers(1).map(f => f.id)));
    // Taken.
    await page.locator('.tab-btn', { hasText: 'Project info' }).tap();
    await page.waitForSelector('#takenLijst .taak');
    await wacht(500);
    u = await page.$$eval('#takenLijst .taak', l => l.map(x => [x.querySelector('.taak-tekst').value, x.querySelector('input[type=checkbox]').disabled]));
    check('afvinken: die zonder eigenaar en zijn eigen wel, die van Bart niet', JSON.stringify(u) ===
      JSON.stringify([['sleutel ophalen', false], ['rooster nameten', true], ['foto achterkant', false]]), JSON.stringify(u));
    await page.locator('#takenLijst .taak').first().locator('input[type=checkbox]').tap();
    await wachtTot(() => S.db.taken.find(x => x.id === 't1').klaar === true, 8000);
    check('de taak zonder eigenaar afgevinkt: in de database, de eigenaar blijft leeg', S.db.taken.find(x => x.id === 't1').klaar === true &&
      S.db.taken.find(x => x.id === 't1').eigenaar == null && S.db.taken.find(x => x.id === 't2').klaar === false);
    check('geen fouten-melding', !/mislukt|Geen recht/.test(await meldTekst(page)), await meldTekst(page));
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v125-werkvloer-ipad.png') });
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Spacer zwart: weg bij glas zonder spouw, en op de werkvloer-pdf');
    latProject(p => { p.data.rijen[0].spacer = 'zwart'; p.data.rijen[1].spacer = 'zwart'; p.data.rijen[2].glasType = ''; p.data.rijen[2].opbouw = '';
      p.data.rijen[2].spacer = 'zwart'; });
    ({ ctx, page } = await openProject());
    await kortMee(page);
    const idX = (rijVan(1).data.rijen.find(r => r.merk === 'X') || {}).id;
    const idD = (rijVan(1).data.rijen.find(r => r.merk === 'D') || {}).id;
    // Werkvloer-pdf: X en Y zwart met spouw.
    let pdf = await bestellijstPdf(page, {}, 'PDF werkvloer');
    t = pdfTekst(pdf).replace(/\s+/g, ' ');
    // De cel Opbouw breekt af: "4-15-4 (23), spacer zwart" staat over twee regels.
    check('de werkvloer-pdf zegt "spacer zwart" bij X en Y (in de kolom Opbouw)', (t.match(/4-15-4 \(23\), /g) || []).length === 2 &&
      (t.match(/spacer/g) || []).length === 2 && (t.match(/zwart/g) || []).length === 2, t.slice(0, 400));
    await sluitMeldingen(page);
    await page.selectOption('#typ-' + idX, 'Enkel glas');
    await wacht(500);
    await wachtTot(() => !('spacer' in (rijVan(1).data.rijen.find(r => r.merk === 'X') || {})), 8000);
    check('X naar enkel glas (geen spouw): de zwarte spacer is weg (database)', !('spacer' in rijVan(1).data.rijen.find(r => r.merk === 'X')),
      JSON.stringify(rijVan(1).data.rijen.find(r => r.merk === 'X')));
    check('… met een kort bericht', /zwarte spacer is weggehaald/.test(await kortVan(page)), await kortVan(page));
    check('… Y houdt zwart', rijVan(1).data.rijen.find(r => r.merk === 'Y').spacer === 'zwart');
    await page.selectOption('#typ-' + idD, 'HR++ glas');
    await wacht(600);
    check('D: een leeg glastype is geen "glas zonder spouw": zwart bleef staan tot er een type kwam (en HR++ heeft een spouw)',
      rijVan(1).data.rijen.find(r => r.merk === 'D').spacer === 'zwart', JSON.stringify(rijVan(1).data.rijen.find(r => r.merk === 'D')));
    await ctx.close();
    // Een leeg type via de database kiezen mag de spacer niet wissen.
    latProject(p => { p.data.rijen[0].spacer = 'zwart'; });
    ({ ctx, page } = await openProject());
    await page.evaluate(id => wijzigGlasType(id, ''), (rijVan(1).data.rijen.find(r => r.merk === 'X') || {}).id);
    await wacht(600);
    u = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'X'); return { type: r.glasType, spacer: r.spacer || '' }; });
    check('glastype leeg maken: de zwarte spacer blijft (nog geen glas gekozen)', u.type === '' && u.spacer === 'zwart', JSON.stringify(u));
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Een ruit verhuist naar een blok met een andere speling: hij houdt zijn glasmaat');
    tweeBlokken();
    ({ ctx, page } = await openProject());
    await kortMee(page);
    const voor = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'A'); berekenGlasMaat(r);
      return { b: r.glasBreedte, h: r.glasHoogte, k: ruitKenmerk(r), foto: r.fotoId }; });
    check('vooraf: A staat bij tekening 1 (speling algemeen 4): glas 992 × 792', voor.foto === FOTO && voor.b === 992 && voor.h === 792, JSON.stringify(voor));
    u = await bolMenu(page, 'A', 1);
    await menuKnop(page, 'Alleen het bolletje weghalen');
    await wachtTot(() => dbRij('A').fotoId === TWEE, 8000);
    w = dbRij('A');
    check('het bolletje op tekening 1 weg: A verhuist naar tekening 2 (speling 7)', w.fotoId === TWEE, JSON.stringify(w));
    check('… en houdt zijn eigen speling 4 (database: correctie 4)', w.correctie === 4 && w.correctieMee === true, JSON.stringify(w));
    const na = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'A'); berekenGlasMaat(r);
      return { b: r.glasBreedte, h: r.glasHoogte, k: ruitKenmerk(r) }; });
    check('… de glasmaat blijft 992 × 792 (niet 986 × 786)', na.b === 992 && na.h === 792, JSON.stringify(na));
    check('… het kenmerk blijft gelijk: na een bestelling telt hij niet als gewijzigd', na.k === voor.k, voor.k + ' / ' + na.k);
    check('… met een melding: "wijkt nu af van de blokspeling"', /speling van A wijkt nu af van de blokspeling/.test(await kortVan(page)), await kortVan(page));
    u = await page.evaluate(() => { const r = rijen.find(x => x.merk === 'A'); const c = document.getElementById('corr-' + r.id);
      return c ? { geel: c.classList.contains('afwijkend'), titel: c.getAttribute('title') || '', waarde: c.querySelector('select').value } : null; });
    check('… geel in de kolom Corr., met uitleg "wijkt af van de algemene blokspeling (−7 mm)"', u && u.geel && u.waarde === '4' &&
      /wijkt af van de algemene blokspeling \(−7 mm\)/.test(u.titel), JSON.stringify(u));
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v125-speling.png'), fullPage: true });
    // Zelf een speling kiezen = een echte keuze: dan telt hij wel.
    await page.evaluate(() => { const r = rijen.find(x => x.merk === 'A'); setCorrectie(r.id, '5'); });
    await wachtTot(() => dbRij('A').correctie === 5, 8000);
    check('zelf −5 kiezen: correctie 5, telt mee in het kenmerk (geen merkje meer)', dbRij('A').correctie === 5 && !('correctieMee' in dbRij('A')) &&
      await page.evaluate(() => ruitKenmerk(rijen.find(x => x.merk === 'A'))) !== voor.k);
    await ctx.close();
    // Een ruit met al een eigen speling, of een bestelde ruit: zie hierboven.
    tweeBlokken(p => { p.data.rijen.find(r => r.merk === 'A').correctie = 3; });
    ({ ctx, page } = await openProject());
    await bolMenu(page, 'A', 1);
    await menuKnop(page, 'Alleen het bolletje weghalen');
    await wachtTot(() => dbRij('A').fotoId === TWEE, 8000);
    check('een ruit met al een eigen speling (3) houdt die, zonder merkje', dbRij('A').correctie === 3 && !('correctieMee' in dbRij('A')), JSON.stringify(dbRij('A')));
    await ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. De onderlat met plaatjes (latkiezer)');
    latProject();
    ({ ctx, page } = await openProject());
    await naarToebehoren(page);
    t = await page.$eval('#tbAlleOnderlat', e => e.tagName + ' ' + e.innerText.replace(/\s+/g, ' '));
    check('"Onderlat" is een knop met de keuze erop (geen keuzelijst)', /^BUTTON /.test(t), t);
    await page.click('#tbAlleOnderlat'); await wacht(700);
    u = await page.$$eval('.tb-lk-optie', l => l.map(o => ({ w: o.getAttribute('data-waarde'), plaatje: !!o.querySelector('.lat-plaatje:not(.tb-lk-geen)'),
      tekst: o.innerText.replace(/\s+/g, ' ') })));
    const w8 = u.map(o => o.w);
    check('de keuzes: niet wijzigen, automatisch, zelfde als boven, passende neuslat, de neuslatten en de glaslatten',
      ['-', '', 'ZELFDE', 'NEUS', 'N30', 'A4'].every(x => w8.indexOf(x) >= 0), JSON.stringify(w8));
    check('elke lat met een plaatje (niet: niet wijzigen / automatisch / zelfde / passende neuslat)',
      u.filter(o => ['-', '', 'ZELFDE', 'NEUS'].indexOf(o.w) < 0).every(o => o.plaatje) && u.filter(o => ['-', '', 'ZELFDE', 'NEUS'].indexOf(o.w) >= 0).every(o => !o.plaatje),
      JSON.stringify(u.filter(o => !o.plaatje).map(o => o.w)));
    check('een neuslat zegt "alleen bij latzijde buiten"', /alleen bij latzijde buiten/.test((u.find(o => o.w === 'N30') || {}).tekst || ''), (u.find(o => o.w === 'N30') || {}).tekst);
    await page.click('.tb-lk-optie[data-waarde="N30"]'); await wacht(300);
    t = await page.$eval('#tbAlleOnderlat', e => e.innerText.replace(/\s+/g, ' '));
    check('gekozen: de knop zegt "onderlat: N30 …"', /onderlat: N30/.test(t), t);
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v125-onderlat.png') });
    await ctx.close();
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
