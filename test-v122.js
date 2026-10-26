/* Testreeks v122 — node test-v122.js   (en: node test-v122.js --mutaties)

   Onderwerp: het back-upaccount (script 27, "alleen lezen") hoort niet in
   de keuzelijsten van de app, en de tekst in de back-up-zip.
   1. Gebruikers: een account op alleen lezen en een oud-collega (niet
      actief) staan niet in de lijst waaruit je een collega kiest; gewone
      collega's wel. Ook vóór script 27 (geen kolom alleen_lezen) werkt het.
   2. 💾 Back-up: LEESMIJ.txt verwijst naar BEHEER.md "in de repo".
   3. Versie.

   Wat deze opstelling aanneemt: dezelfde nagebootste database als
   test-v120/v121 (node), echte Chromium. Script 27 zelf is getest tegen
   een echte PostgreSQL (proef in de zip "niet-in-repo").
   Echte Safari, iPad, Android en Windows: niet hier. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  alleenLezenTelt: ['cloud.js', "return g.actief !== false && g.alleen_lezen !== true; });", "return g.actief !== false; });"],
  vasteKolommen: ['cloud.js', "    return sb.from('gebruikers').select('*')", "    return sb.from('gebruikers').select('id,naam,email,actief,alleen_lezen')"],
  leesmijRepo: ['backup.js', "zie BEHEER.md in de repo,", "zie BEHEER.md in de app,"],
};
const WAAR = { alleenLezenTelt: '1', vasteKolommen: '1', leesmijRepo: '2' };

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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v122-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v122-pdf-'));
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

/* ─── hulp voor v122 ──────────────────────────────────────────── */
const namenLijst = page => page.evaluate(() => glasGebruikers(true).then(l => l.map(g => g.naam).sort()));

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, t, u, v;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Het back-upaccount staat niet in de keuzelijsten');
    latProject();
    S.db.gebruikers.push({ id: 'u2', naam: 'bart', email: 'bart@voorbeeld.test', actief: true, alleen_lezen: false },
                         { id: 'u9', naam: 'backup', email: 'backup@voorbeeld.test', actief: true, alleen_lezen: true },
                         { id: 'u8', naam: 'oud', email: 'oud@voorbeeld.test', actief: false, alleen_lezen: false });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    u = await namenLijst(page);
    check('collega\'s: julian en bart; niet het back-upaccount en niet de oud-collega', JSON.stringify(u) === JSON.stringify(['bart', 'julian']), JSON.stringify(u));
    await ctx.close();
    // Vóór script 27: de kolom alleen_lezen bestaat nog niet. De namaak
    // weigert dan een vraag naar die kolom (zoals de echte database).
    latProject();
    S.db.gebruikers.push({ id: 'u2', naam: 'bart', email: 'bart@voorbeeld.test', actief: true });
    S.zonderKolom = 'alleen_lezen';
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    u = await namenLijst(page);
    check('vóór script 27 (geen kolom alleen_lezen): gewoon julian en bart', JSON.stringify(u) === JSON.stringify(['bart', 'julian']), JSON.stringify(u));
    S.zonderKolom = null;
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Back-up: LEESMIJ.txt');
    latProject();
    ctx = await nieuweContext(null, 'pc');
    await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    page = await nieuwePagina(ctx);
    await page.goto(adres);
    await page.waitForSelector('#startScherm:not([hidden])', { timeout: 10000 }); await wacht(800);
    const dl = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    await page.click('#startBackup');
    await wachtOpMelding(page, /Back-up maken/, 3000);
    await knop(page, 'Alleen gegevens');
    const d = await dl;
    let leesmij = '';
    if (d) {
      const doel = path.join(pdfMap, 'backup.zip');
      await d.saveAs(doel);
      const JSZip = require(path.join(__dirname, 'lib/jszip-3.10.1/jszip.min.js'));
      const zip = await JSZip.loadAsync(fs.readFileSync(doel));
      leesmij = await zip.file('LEESMIJ.txt').async('string');
    }
    check('LEESMIJ: "zie BEHEER.md in de repo, \\"Back-up terugzetten\\""', /zie BEHEER\.md in de repo, "Back-up terugzetten"/.test(leesmij), leesmij.slice(0, 300));
    const beheer = fs.readFileSync(path.join(map, 'BEHEER.md'), 'utf8');
    check('… en die kop bestaat in BEHEER.md', /^### Back-up terugzetten$/m.test(beheer));
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Versie');
    const lees = n => fs.readFileSync(path.join(map, n), 'utf8');
    const versies = [lees('index.html').match(/APP_VERSIE = 'v(\d+)'/), lees('pdf.js').match(/PDF_VERSIE = 'v(\d+)'/),
                     lees('sw.js').match(/const VERSIE = 'v(\d+)'/)].map(x => x ? +x[1] : 0);
    check('versie v122 of later, gelijk in index.html, pdf.js en sw.js', versies.every(v => v === versies[0] && v >= 122), JSON.stringify(versies));
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
