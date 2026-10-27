/* Testreeks v123 — node test-v123.js   (en: node test-v123.js --mutaties)

   Onderwerp: de bekende punten uit de controles van v90 en v103 (keuzes
   Jan, 26-10-2026). Per onderdeel de echte situatie en de belofte:
    1. Zoeken (startscherm, kantoor): ook op klantnaam; met script 29 ook
       zonder accent en met meer woorden. Zonder script 29 vraagt de app
       maar één keer naar de zoekfunctie.
    2. Taken (Project info): een open taak zonder eigenaar of van een
       oud-collega staat in niemands "Mijn taken"; in het project staat er
       een label bij, en de keuzelijst toont de oud-collega bij naam.
    3. Import (plakken, kantoor): een regel met alleen tekst ("A; n.t.b.")
       verdwijnt niet stil maar wordt genoemd.
    4. Import uit een pdf met een lege cel: de maat komt onder de goede kop
       (een echte pdf, gemaakt met jsPDF, gelezen door pdf.js uit lib/).
    5. Dubbele merkletters: het venster toont wat er gebeurt; een al
       bestelde ruit houdt zijn letter.
    6. Foto draaien (iPad, dubbel tikken): één kwartslag, bolletjes mee,
       tekstvak rechtop op dezelfde plek.
    7. Tekenen: de gum pakt tekst; kleur wijzigen, een streek en gummen zijn
       met ↶ terug te draaien; een tik zonder streek kost geen stap.
    8. ↶ per tabel: speling terug, niet heen en weer, geen dubbele ruit.
    9. Een foto die nog verwerkt wordt terwijl je een ander project opent
       (iPad, traag verkleinen): komt in het goede project, nooit in het andere.
   10. "Toch doorgaan" zonder bereik: het werk gaat apart naar de server.
   11. Uitloggen: de kopie met klantgegevens gaat van het apparaat (alleen
       als alles op de server staat; werk dat nog omhoog moet blijft).
   12. PDF invoer: de roedenopmerking staat erin; een foto die niet op te
       halen was staat er rood bij, met een melding.
   13. Leverweek met jaartal.   14. ✕ op de laatste twee vensters.
   15. "Laatst gewijzigd door" met een tik (aanraakscherm).   16. Versie, opruimen.

   Wat deze opstelling aanneemt: de nagebootste database van test-v120/v122
   (node) en echte Chromium; een iPad als Chromium-profiel met aanraken.
   Script 28/29 zelf: proef tegen een echte PostgreSQL en PostgREST 12.2
   (zip "niet-in-repo"). Echte Safari, iPad, Android en Windows: niet hier. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  zoekKlant: ['cloud.js', "      var met = basis().or(velden + ',data->info->>klant.ilike.' + z);", "      var met = basis().or(velden);"],
  zoekFunctie: ['cloud.js', "    if (zoekFunctie === false || !sb.rpc) return zonderFunctie();", "    if (true) return zonderFunctie();"],
  zoekEenKeer: ['cloud.js', "res.error.code === '42883')) zoekFunctie = false;", "res.error.code === '42883')) zoekFunctie = null;"],
  weesLabel: ['project.js', "    if (!t.eigenaar) return 'zonder eigenaar';", "    if (!t.eigenaar) return '';"],
  oudCollega: ['project.js', "    var weg = huidigId && !collegaVan(huidigId)", "    var weg = false && huidigId && !collegaVan(huidigId)"],
  zonderGetal: ['import.js', "    var letOpHtml = zonderGetalHtml + maxPastHtml(o.goed) + (pakketMis.length", "    var letOpHtml = maxPastHtml(o.goed) + (pakketMis.length"],   // v124: maxPastHtml erbij
  pdfKolom: ['import.js', "    if (kop.plek) data = data.map(", "    if (false) data = data.map("],
  merkBesteld: ['merken.js', "      return !!(st && st.nr && st.nr[r.id]);", "      return false;"],
  merkVenster: ['merken.js', "    var naar = function (r) { var p = plan.filter(function (x) { return x.rij === r; })[0]; return p ? p.naar : null; };",
                             "    var naar = function (r) { return null; };"],
  draaiSlot: ['fotos.js', "    if (draaitNu[fotoId]) { melding('Even geduld: de foto wordt nog gedraaid.'); return; }", ""],
  tekstVak: ['fotos.js', "      if (s.t === 'tekst' && s.p && s.p[0] && s.w && s.h) {", "      if (false) {"],
  gumTekst: ['teken.js', "    if (doel && doel.closest) doel = doel.closest('[data-streek]');", ""],
  kleurStap: ['teken.js', "    if (leden.length && window.bewaarStap && ['kleur', 'dikte', 'grootte', 'vet', 'schuin'].indexOf(wat) >= 0) {", "    if (false) {"],
  streekStap: ['teken.js', "      if (window.bewaarStap) bewaarStap('Getekend');", ""],
  tikStap: ['teken.js', "          if (window.stapTerugnemen) stapTerugnemen('Getekend');", ""],
  blokSpeling: ['blokbalk.js', "      zetMaat(fotoId, toenMaat);\n", ""],
  // v124: het heen en weer zit nu in het herschrijven van de stapel (blokOngedaan), niet meer in waarGebleven.
  blokPendel: ['blokbalk.js', "          zetDeelIn(s, fotoId, deel);\n", ""],
  blokDubbel: ['blokbalk.js', "    nieuweRegels = nieuweRegels.filter(function (r) { return !elders[r.id]; });", ""],
  fotoWacht: ['cloud.js', "    if (!await fotoKlaar(wat)) return false;\n", ""],
  fotoProject: ['fotos.js', "    if (zelfdeProject(pid)) return;\n", "    return;\n"],
  tochApart: ['cloud.js', "    if (!reddingBewaar(huidigeStaat(), 'niet opgeslagen bij ' + wat)) {", "    if (false) {"],
  uitlogWis: ['cloud.js', "      wisKopieNaUitloggen();\n      toonLogin('Je bent uitgelogd.');", "      toonLogin('Je bent uitgelogd.');"],
  pdfFotoMis: ['pdf.js', "          } else if (f.pad) {", "          } else if (false) {"],
  pdfMelding: ['pdf.js', "        if (uit !== 'afgebroken') fotosMisluktMelding([res]);\n        return uit;\n      });\n    }).catch(mislukt);\n  }", "        return uit;\n      });\n    }).catch(mislukt);\n  }"],
  roedenOpm: ['pdf.js', "          return [r.opmerking, r.roedenopmerking ? 'roeden: ' + r.roedenopmerking : ''].filter(Boolean).join(' \\u00b7 '); } }\n    ];", "          return r.opmerking; } }\n    ];"],
  weekJaar: ['project.js', "        '-' + weekEind.getFullYear() + ')';", "        ')';"],
  bewKruis: ['index.html', "  sluitKruis(vak.querySelector('.bew-vraag-venster'), function () {", "  (function () {})(vak.querySelector('.bew-vraag-venster'), function () {"],
  leverKruis: ['pdf.js', "        '<button type=\"button\" class=\"sluit-x\" aria-label=\"Sluiten\" data-actie=\"sluit\" style=\"top:8px;right:10px;\">\\u2715</button>' +\n", ""],
  spoorTik: ['index.html', "  if (!td || laatsteAanwijzer === 'mouse') return;", "  if (!td || true) return;"],
  pdfDubbel: ['import.js', "      if (uit[k] !== '') dubbel = true;\n      uit[k] = cel;", "      uit[k] = uit[k] ? uit[k] + ' ' + cel : cel;"],
  blokBollen: ['blokbalk.js', "\n        .filter(function (m) { return !elders[m.rijId]; });", ";"],
  veiligStreng: ['index.html', "const MAX_NR = 999999999;", "const MAX_NR = 1e9;"],
  reddingSchoon: ['cloud.js', "        if (window.glasVeiligeIdsVan) { try { glasVeiligeIdsVan(d); } catch (e) {} }", ""],
  bolGeenLijst: ['index.html', "    if (f.markeringen != null && !Array.isArray(f.markeringen)) { f.markeringen = []; n++; }", ""],
};
const WAAR = { zoekKlant: '1', zoekFunctie: '1', zoekEenKeer: '1', weesLabel: '2', oudCollega: '2', zonderGetal: '3', pdfKolom: '4',
  merkBesteld: '5', merkVenster: '5', draaiSlot: '6', tekstVak: '6', gumTekst: '7', kleurStap: '7', streekStap: '7', tikStap: '7',
  blokSpeling: '8', blokPendel: '8', blokDubbel: '8', fotoWacht: '9', fotoProject: '9', tochApart: '10', uitlogWis: '11',
  pdfFotoMis: '12', pdfMelding: '12', roedenOpm: '12', weekJaar: '13', bewKruis: '14', leverKruis: '14', spoorTik: '15',
  pdfDubbel: '4', blokBollen: '8', veiligStreng: '17', reddingSchoon: '17', bolGeenLijst: '17' };


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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v123-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v123-pdf-'));
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

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, t, u, v;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  if (doe('1')) {
    console.log('\n1. Zoeken op het startscherm: klantnaam, accenten, meer woorden');
    resetDb();
    S.db.projecten.push(project(3, 'Éénhoorn', [ruit(1, 'E1', '500', '500')], { adres: 'Lange Geer 5, Dordrecht' }),
                        project(4, 'Verhoef', [ruit(1, 'V1', '500', '500')], { adres: 'Kerkweg 2, Zwijndrecht' }));
    rijVan(4).data.info = { klant: 'Fam. Jansen' };
    S.zoek29 = false; S.zoekRpc = 0;
    ({ ctx, page } = await apparaat(null, 'pc'));
    await startScherm(page);
    t = await zoekOpStart(page, 'jansen');
    check('zonder script 29: "jansen" vindt het project met klant Fam. Jansen', /Verhoef/.test(t) && !/Kerkstraat/.test(t), t.slice(0, 160));
    t = await zoekOpStart(page, 'kerkstr');
    check('… en gewoon op de naam (zoals altijd)', /Kerkstraat/.test(t) && !/Verhoef/.test(t), t.slice(0, 160));
    await zoekOpStart(page, 'molen');
    check('zonder script 29 vraagt de app maar één keer naar de zoekfunctie', S.zoekRpc === 1, S.zoekRpc);
    S.geenJsonPad = true;
    t = await zoekOpStart(page, 'kerkstr');
    check('een PostgREST die de klantnaam in or() niet leest: zoeken werkt toch (zoals v122)', /Kerkstraat/.test(t), t.slice(0, 120));
    S.geenJsonPad = false;
    await ctx.close();
    S.zoek29 = true; S.zoekRpc = 0;
    ({ ctx, page } = await apparaat(null, 'pc'));
    await startScherm(page);
    t = await zoekOpStart(page, 'eenhoorn');
    check('met script 29: "eenhoorn" vindt "Éénhoorn"', /Éénhoorn/.test(t) && !/Kerkstraat/.test(t), t.slice(0, 160));
    t = await zoekOpStart(page, 'verhoef jansen');
    check('… twee woorden in verschillende velden: "verhoef jansen"', /Verhoef/.test(t) && !/Éénhoorn/.test(t), t.slice(0, 160));
    check('… de app gebruikte de zoekfunctie', S.zoekRpc >= 2, S.zoekRpc);
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v123-zoeken.png') });
    S.zoek29 = false;
    await ctx.close();
  }

  /* ══ 2 ════════════════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Taken zonder eigenaar of van een oud-collega');
    latProject();
    S.db.gebruikers.push({ id: 'u2', naam: 'bart', email: 'bart@voorbeeld.test', actief: true },
                         { id: 'u8', naam: 'piet', email: 'piet@voorbeeld.test', actief: false });
    const T = (id, tekst, eig, naam, klaar) => ({ id: id, project_id: P(1), tekst: tekst, klaar: !!klaar, eigenaar: eig,
      eigenaar_naam: naam, aangemaakt_op: '2026-10-0' + id + 'T08:00:00Z' });
    S.db.taken.push(T('1', 'sleutel halen', 'u1', 'julian'), T('2', 'rooster nameten', null, ''),
                    T('3', 'kozijn opmeten na sloop', 'u8', 'piet'), T('4', 'oud klaar', 'u8', 'piet', true));
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.click('.tab-btn:has-text("Project info")');
    await wachtTot(async () => (await taakRegels(page)).length === 4, 8000);
    u = await taakRegels(page);
    const per = n => u.find(x => x.tekst === n) || {};
    check('eigen taak: geen label', per('sleutel halen').wees === '', JSON.stringify(per('sleutel halen')));
    check('taak zonder eigenaar: label "zonder eigenaar"', per('rooster nameten').wees === 'zonder eigenaar', JSON.stringify(per('rooster nameten')));
    check('taak van een oud-collega: label "oud-collega"', per('kozijn opmeten na sloop').wees === 'oud-collega', JSON.stringify(per('kozijn opmeten na sloop')));
    check('… en de keuzelijst noemt hem bij naam (niet "— niemand —")', per('kozijn opmeten na sloop').keuze === 'piet (niet meer actief)', JSON.stringify(per('kozijn opmeten na sloop')));
    check('een afgeronde taak van de oud-collega: geen label', per('oud klaar').wees === '', JSON.stringify(per('oud klaar')));
    // Een eigenaar kiezen: het label gaat weg.
    await page.locator('#takenLijst .taak', { hasText: '' }).nth(1).locator('select.taak-eigenaar-keuze').selectOption('u2');
    await wachtTot(() => (S.db.taken.find(x => x.id === '2') || {}).eigenaar === 'u2', 6000);
    await wacht(600);
    u = await taakRegels(page);
    check('na het kiezen van bart: in de database op bart, label weg', S.db.taken.find(x => x.id === '2').eigenaar === 'u2' &&
      (u.find(x => x.tekst === 'rooster nameten') || {}).wees === '', JSON.stringify(u));
    check('de taak van de oud-collega is niet stil veranderd', S.db.taken.find(x => x.id === '3').eigenaar === 'u8');
    if (PLAATJES) await page.locator('#takenLijst').screenshot({ path: path.join(PLAATJES, 'v123-taken.png') }).catch(() => {});
    await ctx.close();
  }

  /* ══ 3 ════════════════════════════════════════════════════════ */
  if (doe('3')) {
    console.log('\n3. Import: een regel met alleen tekst wordt genoemd');
    resetDb();
    ({ ctx, page } = await apparaat(null, 'pc', 2));
    await importPlak(page, 'Merk;Breedte;Hoogte;Aantal\nP1;1000;800;1\nA;n.t.b.;n.t.b.;\nBegane grond;;;\nP3;700;600;2');
    await importControleer(page);
    t = await stap3(page);
    check('stap 3 noemt de regels zonder getal, met de tekst', /2 regels zonder enig getal worden niet overgenomen/.test(t) &&
      /«A \| n\.t\.b\. \| n\.t\.b\.»/.test(t) && /«Begane grond»/.test(t), t.slice(0, 400));
    check('… de gewone regels gaan gewoon mee', /P1/.test(t) && /P3/.test(t));
    await ctx.close();
  }

  /* ══ 4 ════════════════════════════════════════════════════════ */
  if (doe('4')) {
    console.log('\n4. Import uit een pdf met een lege cel');
    resetDb();
    ({ ctx, page } = await apparaat(null, 'pc', 2));
    const pdf = maakPdfLijst([['Q1', '2', '1000', '800', ''], ['Q2', '', '800', '600', 'kozijn 12'], ['Q3', '1', '700', '650', 'draai']]);
    await page.click('button:has-text("⬆ Importeren")');
    await page.click('.veld-menu button:has-text("Sponningmaten")');
    await page.setInputFiles('#impBestand', { name: 'kozijnfabriek.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.waitForSelector('#impStap2', { state: 'visible', timeout: 15000 });
    u = await mapping(page);
    await importControleer(page);
    t = await stap3(page);
    await page.click('#impToevoegen');
    await wacht(900);
    await sluitMeldingen(page);
    v = await page.evaluate(() => rijen.filter(r => /^Q/.test(r.merk)).map(r => [r.merk, String(r.aantal), r.breedte, r.hoogte, r.opmerking || '']));
    const q2 = v.find(x => x[0] === 'Q2') || [];
    check('Q2 (lege cel bij Aantal): breedte 800, hoogte 600, opmerking "kozijn 12"', q2[2] === '800' && q2[3] === '600' && q2[4] === 'kozijn 12',
      JSON.stringify(v) + ' | kop: ' + JSON.stringify(u));
    check('… en het aantal is niet 800 (de breedte)', q2[1] !== '800', q2[1]);
    check('Q1 en Q3 zoals in de pdf', JSON.stringify(v.find(x => x[0] === 'Q1')) === JSON.stringify(['Q1', '2', '1000', '800', '']) &&
      JSON.stringify(v.find(x => x[0] === 'Q3')) === JSON.stringify(['Q3', '1', '700', '650', 'draai']), JSON.stringify(v));
    await ctx.close();
    // Twee waarden onder één kop (een kolom zonder kop, bijv. een positienummer
    // naast het merk): niet samenvoegen ("2 1000" zou 21000 worden), maar
    // weigeren, met de tekst erbij.
    resetDb();
    ({ ctx, page } = await apparaat(null, 'pc', 2));
    const doc2 = new JSPDF.jsPDF({ unit: 'pt', format: 'a4' });
    doc2.setFontSize(10);
    ['Merk', 'Aantal', 'Breedte', 'Hoogte', 'Opmerking'].forEach((k, i) => doc2.text(k, [40, 110, 180, 260, 340][i], 60));
    [['R1', '1', '900', '700', ''], ['R2', '1', '1200', '800', '']].forEach((r, j) => r.forEach((c, i) => { if (c) doc2.text(c, [40, 110, 180, 260, 340][i], 80 + j * 18); }));
    doc2.text('7', 78, 98);          // bij R2: een getal zonder kolomkop, vlak naast het merk
    await page.click('button:has-text("⬆ Importeren")');
    await page.click('.veld-menu button:has-text("Sponningmaten")');
    await page.setInputFiles('#impBestand', { name: 'met-positie.pdf', mimeType: 'application/pdf', buffer: Buffer.from(doc2.output('arraybuffer')) });
    await page.waitForSelector('#impStap2', { state: 'visible', timeout: 15000 });
    await importControleer(page);
    t = await stap3(page);
    check('twee waarden onder één kop: de regel wordt geweigerd ("mogelijk verschoven")', /wordt NIET overgenomen/.test(t) && /twee waarden onder dezelfde kolomkop/.test(t), t.slice(0, 500));
    check('… en niet stil een merk "R2 7"', !/R2 7/.test(t.replace(/regel \d+:.*/, '')), t.slice(0, 300));
    await ctx.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. Dubbele merkletters automatisch hernoemen');
    // a. Niets besteld: A en A worden A1 en A2, en het venster zegt dat.
    resetDb();
    rijVan(2).data.rijen = [ruit(1, 'A', '1000', '800', KOMPLEET), ruit(2, 'A', '900', '700', KOMPLEET)];
    rijVan(2).data.volgendId = 3;
    ({ ctx, page } = await apparaat(null, 'pc', 2));
    await page.evaluate(() => merkDialoog());
    t = await page.$eval('#merkLijst', e => e.innerText.replace(/\s+/g, ' '));
    check('venster: "wordt A1" en "wordt A2" (en niet "behoudt de letter")', /wordt A1/.test(t) && /wordt A2/.test(t) && !/behoudt/.test(t), t);
    await page.click('#merkVenster button:has-text("Automatisch hernoemen")');
    await wacht(500);
    u = await page.evaluate(() => rijen.filter(r => r.breedte).map(r => r.merk));
    check('… en zo gebeurt het: A1, A2', JSON.stringify(u) === '["A1","A2"]', JSON.stringify(u));
    await ctx.close();
    // b. De eerste A is al besteld: die houdt A, de nieuwe wordt A1.
    resetDb();
    rijVan(2).data.rijen = [ruit(1, 'A', '1000', '800', Object.assign({}, KOMPLEET, INGEMETEN)), ruit(2, 'A', '900', '700', KOMPLEET)];
    rijVan(2).data.volgendId = 3;
    ({ ctx, page } = await apparaat(null, 'pc', 2));
    await page.evaluate(() => {
      const r = rijen[0];
      projectInfo.bestellingen = [{ nr: 1, op: '2026-10-20T09:00:00.000Z', door: 'julian', via: 'pdf', soort: 'volledig', aantal: 1, stuks: 1,
        ruiten: { 1: ruitMomentopname(r, true) } }];
      besteldBijwerken();
      merkDialoog();
    });
    t = await page.$eval('#merkLijst', e => e.innerText.replace(/\s+/g, ' '));
    check('venster: de bestelde behoudt de letter ("al besteld"), de andere "wordt A1"', /behoudt de letter, al besteld/.test(t) && /wordt A1/.test(t), t);
    await page.click('#merkVenster button:has-text("Automatisch hernoemen")');
    await wacht(500);
    u = await page.evaluate(() => rijen.filter(r => r.breedte).map(r => r.id + ':' + r.merk));
    check('… de bestelde ruit (1) heet nog A, de nieuwe (2) A1', JSON.stringify(u) === '["1:A","2:A1"]', JSON.stringify(u));
    await ctx.close();
  }

  /* ══ 6 ════════════════════════════════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Foto draaien: dubbel tikken, tekstvak');
    ({ ctx, page } = await gevelOpen(p => {
      p.data.fotos[0].inkt = [{ t: 'tekst', k: '#c62828', d: 4, g: 40, vet: true, p: [[100, 100]], w: 200, h: 60, tx: 'let op', vast: true }];
    }));
    // Traag zoals een iPad: het draaien duurt ruim een seconde, de tweede tik
    // komt dus echt tijdens de eerste.
    await page.evaluate(() => { const oud = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (cb, tp, q) { const c = this; setTimeout(() => oud.call(c, cb, tp, q), 1200); }; });
    const voor = await page.evaluate(() => JSON.parse(JSON.stringify(fotos[0])));
    const knopD = page.locator('#blok-' + FOTO + ' button[onclick^="fotoDraaien"]').first();
    await knopD.click();
    await knopD.click();          // meteen nog eens, zoals een dubbele tik
    const tweede = await page.$eval('#fotoMelding', e => e.textContent).catch(() => '');
    await wachtTot(() => page.evaluate(() => fotos[0].hoogte === 800 && !/draaien|Opslaan/.test((document.getElementById('fotoMelding') || {}).textContent || '')), 8000);
    await wacht(800);
    const na = await page.evaluate(() => JSON.parse(JSON.stringify(fotos[0])));
    const eerste = na.markeringen[0], oud = voor.markeringen[0];
    check('de tweede tik wacht: "Even geduld: de foto wordt nog gedraaid"', /Even geduld/.test(tweede), tweede);
    check('één kwartslag: 800 × 600 werd 600 × 800', na.breedte === 600 && na.hoogte === 800, na.breedte + ' × ' + na.hoogte);
    check('de bolletjes ook één kwartslag (x, y) → (1 − y, x)', drieDecimalen(eerste.x) === drieDecimalen(1 - oud.y) && drieDecimalen(eerste.y) === drieDecimalen(oud.x),
      JSON.stringify([oud, eerste]));
    const tv = na.inkt[0];
    const midden = [tv.p[0][0] + tv.w / 2, tv.p[0][1] + tv.h / 2];
    // Het midden van het vak (200, 130) in 1000 × 750 → (826,7; 266,6) in 1000 × 1333.
    check('het tekstvak staat rechtop op dezelfde plek (midden draait mee, maat blijft)', Math.abs(midden[0] - 826.7) < 0.6 &&
      Math.abs(midden[1] - 266.6) < 0.6 && tv.w === 200 && tv.h === 60, JSON.stringify(tv.p) + ' midden ' + JSON.stringify(midden));
    if (PLAATJES) await page.locator('#blok-' + FOTO).screenshot({ path: path.join(PLAATJES, 'v123-gedraaid.png') }).catch(() => {});
    await ctx.close();
  }

  /* ══ 7 ════════════════════════════════════════════════════════ */
  if (doe('7')) {
    console.log('\n7. Tekenen: gum op tekst, ↶ na kleur, streek en tik');
    ({ ctx, page } = await gevelOpen(p => {
      p.data.fotos[0].inkt = [{ t: 'tekst', k: '#c62828', d: 4, g: 40, vet: true, p: [[100, 100]], w: 200, h: 60, tx: 'let op', vast: true }];
    }));
    await page.evaluate(f => tekenModus(f), FOTO);
    await wacht(300);
    const midVan = async sel => { const b = await page.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
    const veeg = async (van, naar) => { await page.mouse.move(van[0], van[1]); await page.mouse.down(); await page.mouse.move((van[0] + naar[0]) / 2, (van[1] + naar[1]) / 2, { steps: 4 });
      await page.mouse.move(naar[0], naar[1], { steps: 4 }); await page.mouse.up(); await wacht(400); };
    const inktN = () => page.evaluate(() => (fotos[0].inkt || []).length);
    const stappen = () => page.evaluate(() => undoStapels().terug.length);
    // Kleur: selecteren (kies), dan een kleur.
    await page.evaluate(f => tekenKies(f, 'stuk', 'kies'), FOTO);
    let m = await midVan('#inkt-' + FOTO + ' text tspan');
    await page.mouse.click(m[0], m[1]); await wacht(300);
    await page.evaluate(f => tekenKies(f, 'kleur', '#1565c0'), FOTO);
    await wacht(300);
    u = await page.evaluate(() => fotos[0].inkt[0].k);
    await page.keyboard.press('Control+z'); await wacht(500);
    v = await page.evaluate(() => fotos[0].inkt[0].k);
    check('kleur gewijzigd en met ↶ terug', u === '#1565c0' && v === '#c62828', u + ' → ' + v);
    // Gum op de tekst (onder de vinger ligt een tspan).
    await page.evaluate(f => tekenKies(f, 'stuk', 'gum'), FOTO);
    m = await midVan('#inkt-' + FOTO + ' text tspan');
    await veeg([m[0] - 3, m[1]], [m[0] + 3, m[1]]);
    check('de gum haalt de tekst weg', await inktN() === 0, await inktN());
    await page.keyboard.press('Control+z'); await wacht(500);
    check('… en ↶ zet hem terug', await inktN() === 1, await inktN());
    // Een streek met de pen.
    await page.evaluate(f => tekenKies(f, 'stuk', 'pen'), FOTO);
    const b = await page.locator('#inkt-' + FOTO).boundingBox();
    // Binnen het zichtbare deel van de foto (de foto is groter dan het scherm).
    await veeg([b.x + 320, b.y + 160], [b.x + 520, b.y + 260]);
    check('een streek erbij', await inktN() === 2, await inktN());
    await page.keyboard.press('Control+z'); await wacht(500);
    check('… met ↶ weer weg', await inktN() === 1, await inktN());
    // Een tik met de lijn (geen beweging): geen streek, en geen lege stap.
    await page.evaluate(f => tekenKies(f, 'stuk', 'lijn'), FOTO);
    const s0 = await stappen();
    await page.mouse.click(b.x + 600, b.y + 120); await wacht(400);
    check('een tik met de lijn: geen streek en geen extra stap', await inktN() === 1 && await stappen() === s0, (await inktN()) + ' / ' + s0 + ' → ' + (await stappen()));
    await ctx.close();
  }

  /* ══ 8 ════════════════════════════════════════════════════════ */
  if (doe('8')) {
    console.log('\n8. ↶ per tabel: speling, heen en weer, dubbele ruit');
    ({ ctx, page } = await gevelOpen());
    const sp = () => page.evaluate(() => fotos[0].speling == null ? '' : String(fotos[0].speling));
    // Niet heen en weer: na een wijziging in een ándere tabel zette de tweede
    // ↶ de speling weer op 6 (de stap van die andere tabel zag de 6 nog).
    await page.selectOption('#blok-' + FOTO + ' .blok-maat-paar select >> nth=0', '6'); await wacht(400);
    await page.evaluate(() => { bewaarStap('opmerking D'); rijen.find(r => r.merk === 'D').opmerking = 'los'; renderTabel(); opslaan(); });
    await wacht(400);
    await page.click('#blok-' + FOTO + ' .blok-bediening button:has-text("↶ Ongedaan")'); await wacht(400);
    u = await sp();
    await page.click('#blok-' + FOTO + ' .blok-bediening button:has-text("↶ Ongedaan")'); await wacht(400);
    v = await sp();
    check('na een wijziging in een andere tabel: ↶ ↶ blijft terug, niet heen en weer', u === '' && v === '', u + ' → ' + v);
    check('… de andere tabel is niet geraakt', await page.evaluate(() => rijen.find(r => r.merk === 'D').opmerking) === 'los');
    await ctx.close();
    ({ ctx, page } = await gevelOpen());
    await page.selectOption('#blok-' + FOTO + ' .blok-maat-paar select >> nth=0', '6'); await wacht(400);
    await page.selectOption('#blok-' + FOTO + ' .blok-maat-paar select >> nth=0', '8'); await wacht(400);
    check('speling van de foto 6 en daarna 8', await sp() === '8', await sp());
    await page.click('#blok-' + FOTO + ' .blok-bediening button:has-text("↶ Ongedaan")'); await wacht(400);
    u = await sp();
    await page.click('#blok-' + FOTO + ' .blok-bediening button:has-text("↶ Ongedaan")'); await wacht(400);
    v = await sp();
    check('↶ in de tabel: 8 → 6 → (geen eigen speling)', u === '6' && v === '', u + ' → ' + v);
    // Een ruit verhuist van "zonder foto" naar de foto; daarna ↶ in "zonder foto".
    // v124: en hij verandert daarna nog (een opmerking). Zonder die wijziging
    // haalt ↶ hem sinds v124 helemaal terug (verhuisd, niet gekopieerd; zie
    // test-v124-tekeningen.js onderdeel 3 en 6).
    // v124 (review R6): eerst een oudere wijziging in "zonder foto" (de
    // algemene speling); ↶ slaat de stap van de verhuizing over (D is daarna
    // gewijzigd) en zet die oudere stap terug, met D nog in die stand.
    await page.evaluate(() => { bewaarStap('speling los'); document.getElementById('spelingGlobal').value = '6'; herbereken(); renderTabel(); opslaan(); });
    await wacht(300);
    await page.evaluate(f => { bewaarStap('verhuisd'); rijen.find(r => r.merk === 'D').fotoId = f; renderTabel(); renderFotos(); opslaan(); }, FOTO);
    await wacht(400);
    await page.evaluate(() => { bewaarStap('opmerking D'); rijen.find(r => r.merk === 'D').opmerking = 'na verhuizen'; renderTabel(); opslaan(); });
    await wacht(400);
    await page.evaluate(() => blokOngedaan('los')); await wacht(400);
    u = await page.evaluate(() => { const ids = rijen.map(r => r.id); return { dubbel: ids.length - new Set(ids).size, d: rijen.filter(r => r.merk === 'D').map(r => r.fotoId || 'los') }; });
    check('geen dubbele ruit: D staat één keer, bij de foto', u.dubbel === 0 && JSON.stringify(u.d) === JSON.stringify([FOTO]), JSON.stringify(u));
    await ctx.close();
    // Een ruit met een bolletje verhuist naar een andere foto (bolletje mee);
    // ↶ in de tabel van de eerste foto zet zijn oude bolletje niet terug.
    ({ ctx, page } = await gevelOpen(p => { p.data.fotos.push({ id: 'f2', titel: 'Achter', breedte: 800, hoogte: 600, inkt: [], markeringen: [] }); }));
    // v124 (review R6): eerst een oudere wijziging in de tabel van de eerste foto (speling).
    await page.evaluate(() => { bewaarStap('speling f1'); fotos[0].speling = 6; herbereken(); renderTabel(); opslaan(); });
    await wacht(300);
    await page.evaluate(f => { bewaarStap('verhuisd'); const a = rijen.find(r => r.merk === 'A');
      fotos[0].markeringen = fotos[0].markeringen.filter(m => m.rijId !== a.id); a.fotoId = 'f2';
      fotos[1].markeringen.push({ rijId: a.id, x: 0.5, y: 0.5 }); renderTabel(); renderFotos(); opslaan(); }, FOTO);
    await wacht(400);
    // v124: daarna nog een wijziging aan A (zie hierboven bij D).
    await page.evaluate(() => { bewaarStap('opmerking A'); rijen.find(r => r.merk === 'A').opmerking = 'na verhuizen'; renderTabel(); opslaan(); });
    await wacht(400);
    await page.evaluate(f => blokOngedaan(f), FOTO); await wacht(400);
    u = await page.evaluate(() => { const a = rijen.find(r => r.merk === 'A'); return fotos.map(f => (f.markeringen || []).filter(m => m.rijId === a.id).length); });
    check('… de verhuisde ruit A heeft alleen zijn bolletje op de nieuwe foto', JSON.stringify(u) === '[0,1]', JSON.stringify(u));
    await ctx.close();
  }

  /* ══ 9 ════════════════════════════════════════════════════════ */
  if (doe('9')) {
    console.log('\n9. Een foto die nog verwerkt wordt, terwijl je een ander project opent');
    const traag = () => { const oud = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (cb, tp, q) { const c = this; setTimeout(() => oud.call(c, cb, tp, q), 1800); }; };
    const gevel = fs.readFileSync(path.join(__dirname, 'test-gevel.jpg'));
    ({ ctx, page } = await gevelOpen());
    await page.evaluate(traag);
    await page.setInputFiles('#fotoBestand', { name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: gevel });
    await wacht(200);
    check('de foto wordt nog verwerkt (glasFotoBezig)', await page.evaluate(() => glasFotoBezig()));
    page.evaluate(id => cloudOpen(id), P(2)).catch(() => {});
    await wachtTot(() => page.evaluate(id => window.glasProjectId === id, P(2)), 15000);
    await wacht(1500);
    check('de foto staat in het goede project (1), in de database', (rijVan(1).data.fotos || []).length === 2, (rijVan(1).data.fotos || []).length);
    check('… en niet in het andere project (2)', !(rijVan(2).data.fotos || []).length && await page.evaluate(() => fotos.length) === 0,
      JSON.stringify(rijVan(2).data.fotos || []));
    await ctx.close();
    // Ook als iets het project sluit zonder te wachten (terug naar start na
    // stilstand): de foto komt dan nergens anders in.
    ({ ctx, page } = await gevelOpen());
    await page.evaluate(traag);
    await page.setInputFiles('#fotoBestand', { name: 'IMG_0002.jpg', mimeType: 'image/jpeg', buffer: gevel });
    await wacht(200);
    await page.evaluate(() => glasNaarStart('stil'));
    await wacht(3500);
    u = await page.evaluate(() => ({ fotos: fotos.length, melding: (document.getElementById('fotoMelding') || {}).textContent || '' }));
    check('project gesloten tijdens het verkleinen: de foto komt niet in het lege scherm', u.fotos === 0, JSON.stringify(u));
    check('… geen upload naar een map zonder project', !S.uploads.some(p => /^(null|undefined)\//.test(p)), JSON.stringify(S.uploads.slice(-3)));
    await ctx.close();
  }

  /* ══ 10 ═══════════════════════════════════════════════════════ */
  if (doe('10')) {
    console.log('\n10. "Toch doorgaan" zonder bereik: het werk gaat apart');
    latProject();
    ({ ctx, page } = await apparaat(null, 'ipad', 1));
    S.offline = true;
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await typOpmerking(page, 'gemeten zonder bereik');
    page.evaluate(id => cloudOpen(id), P(2)).catch(() => {});
    v = await wachtOpMelding(page, /Nog niet opgeslagen/, 10000);
    check('de vraag komt, en zegt dat het werk apart bewaard wordt', v.ok && /apart project/.test(v.tekst), v.tekst.slice(0, 220));
    await knop(page, 'Apart bewaren en doorgaan');
    await wacht(800);
    u = JSON.parse(await ls(page, 'glasopname_redding') || '[]');
    check('het werk staat apart bewaard op het apparaat (met de opmerking)', u.length === 1 && JSON.stringify(u[0].data).indexOf('gemeten zonder bereik') >= 0,
      JSON.stringify(u).slice(0, 160));
    await sluitMeldingen(page);
    S.offline = false;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await wachtTot(() => apartBewaard().length === 1, 15000);
    check('met bereik: als apart project op de server, met het werk erin', apartBewaard().length === 1 &&
      JSON.stringify(apartBewaard()[0].data).indexOf('gemeten zonder bereik') >= 0, apartBewaard().map(p => p.naam).join(' | '));
    await ctx.close();
  }

  /* ══ 11 ═══════════════════════════════════════════════════════ */
  if (doe('11')) {
    console.log('\n11. Uitloggen: de kopie met klantgegevens gaat van het apparaat');
    latProject(p => { p.data.info.klant = 'Fam. Jansen'; p.data.info.telefoon = '06-12345678'; });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    check('vooraf: de kopie op het apparaat bevat de klant', /Fam\. Jansen/.test(await ls(page, 'glasopname_v2') || ''));
    await page.evaluate(() => cloudUitloggen());
    await wachtTot(() => page.evaluate(() => { const l = document.getElementById('cloudLogin'); return l && getComputedStyle(l).display !== 'none'; }), 8000);
    await wacht(500);
    u = { kopie: await ls(page, 'glasopname_v2'), laatst: await ls(page, 'glasopname_laatst') };
    check('na uitloggen: geen kopie van het project meer (en geen "laatst geopend")', !u.kopie && !u.laatst, JSON.stringify(u).slice(0, 160));
    await ctx.close();
    // Met werk dat nog omhoog moet: dat blijft (apart bewaard), de rest weg.
    latProject(p => { p.data.info.klant = 'Fam. Jansen'; });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    S.offline = true;
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await typOpmerking(page, 'nog niet verstuurd');
    page.evaluate(() => cloudUitloggen()).catch(() => {});
    v = await wachtOpMelding(page, /Nog niet opgeslagen/, 10000);
    await knop(page, 'Apart bewaren en doorgaan');
    await wacht(1200);
    u = JSON.parse(await ls(page, 'glasopname_redding') || '[]');
    check('werk dat nog omhoog moest: apart bewaard, blijft op het apparaat', u.length === 1 && JSON.stringify(u[0].data).indexOf('nog niet verstuurd') >= 0, JSON.stringify(u).slice(0, 120));
    S.offline = false;
    await ctx.close();
  }

  /* ══ 12 ═══════════════════════════════════════════════════════ */
  if (doe('12')) {
    console.log('\n12. PDF invoer: roedenopmerking, foto die niet op te halen was');
    ({ ctx, page } = await gevelOpen(p => {
      p.data.rijen.find(r => r.merk === 'A').roedenopmerking = 'wienersprossen 26';
      p.data.fotos.push({ id: 'f2', pad: P(1) + '/kwijt.jpg', titel: 'Achtergevel', breedte: 800, hoogte: 600, inkt: [], markeringen: [] });
      p.data.rijen.push(ruit(7, 'G', '600', '600', Object.assign({ fotoId: 'f2' }, KOMPLEET, INGEMETEN)));
      p.data.volgendId = 8;
    }));
    const dl = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    await page.evaluate(() => exportFotoPdf());
    const d = await dl;
    let pad = null;
    if (d) { pad = path.join(pdfMap, 'invoer-123.pdf'); await d.saveAs(pad); }
    t = pad ? plat(pdfTekst(pad)) : '';
    // (de kolom is smal: de tekst loopt over twee regels, door de buurkolom heen)
    check('de roedenopmerking staat in de pdf', /roeden:/.test(t) && /wienersprossen 26/.test(t), (t.match(/.{0,120}wiener.{0,60}/) || ['(niet gevonden) ' + t.slice(0, 100)])[0]);
    check('bij de foto die niet op te halen was: "De foto kon niet worden opgehaald"', /De foto kon niet worden opgehaald/.test(t) && !/geen foto bij deze groep/.test(t),
      (t.match(/Achtergevel.{0,140}/) || [''])[0]);
    v = await wachtOpMelding(page, /Foto ontbreekt in de pdf/, 6000);
    check('… en een melding na het opslaan', v.ok && /1 foto kon niet opgehaald worden/.test(v.tekst), v.tekst.slice(0, 200));
    await ctx.close();
  }

  /* ══ 13 ═══════════════════════════════════════════════════════ */
  if (doe('13')) {
    console.log('\n13. Leverweek met jaartal');
    latProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.evaluate(() => leverKalender(document.querySelector('.tab-btn'), true));
    await page.locator('.kalender .kalender-week.kiesbaar[onclick]').first().click();
    await wachtTot(() => !!info().leverWeekTekst, 6000);
    t = info().leverWeekTekst || '';
    check('de gekozen week heeft het jaartal: "week N (dd-mm t/m dd-mm-jjjj)"', /^week \d+ \(\d\d-\d\d t\/m \d\d-\d\d-20\d\d\)$/.test(t), t);
    await ctx.close();
  }

  /* ══ 14 ═══════════════════════════════════════════════════════ */
  if (doe('14')) {
    console.log('\n14. ✕ op de laatste twee vensters');
    latProject(p => { delete p.data.info.leverInstructie; });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.evaluate(() => { window.__ann = 0; bewerkingVraag('Proef', [{ tekst: 'Annuleren', doe: () => { window.__ann++; } }, { tekst: 'Ok', doe: () => {} }]); });
    await kruis(page, '.bew-vraag-venster', 'Niet beschikbaar (bewerkingVraag)');
    check('… het ✕ telt als Annuleren', await page.evaluate(() => window.__ann) === 1);
    await page.evaluate(() => { bewerkingVraag('Proef', [{ tekst: 'Annuleren', doe: () => { window.__ann++; } }]); });
    await page.keyboard.press('Escape'); await wacht(300);
    check('… Escape ook', await page.evaluate(() => window.__ann) === 2 && !(await page.$('.bew-vraag')));
    await page.evaluate(() => { window.__verder = 0; exportMetControle(() => { window.__verder++; }); });
    await page.waitForSelector('.cloud-paneel .sluit-x[data-actie="sluit"]', { timeout: 4000 }).catch(() => {});
    await kruis(page, '.cloud-overlay .cloud-paneel:has(.sluit-x[data-actie="sluit"])', 'Nog niet alles is ingevuld', async () => !(await page.$('.sluit-x[data-actie="sluit"]')));
    check('… en er wordt niets geëxporteerd', await page.evaluate(() => window.__verder) === 0);
    await ctx.close();
  }

  /* ══ 15 ═══════════════════════════════════════════════════════ */
  if (doe('15')) {
    console.log('\n15. "Laatst gewijzigd door" met een tik');
    latProject();
    ({ ctx, page } = await apparaat(Object.assign({}, IPAD), 'ipad', 1));
    await page.locator('#rij-1 td.rijnr .rijnr-merk').tap();
    await wacht(400);
    t = await kortBer(page);
    check('iPad: een tik op het nummer toont "Laatst gewijzigd door julian"', /Laatst gewijzigd door julian/.test(t), t);
    if (PLAATJES) await page.screenshot({ path: path.join(PLAATJES, 'v123-spoor-ipad.png') });
    await ctx.close();
    latProject();     // opnieuw: anders heeft de iPad het project nog (bewerkslot)
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await page.locator('#rij-1 td.rijnr .rijnr-merk').click();
    await wacht(400);
    await page.locator('#rij-1 td.rijnr input[type=checkbox]').click();
    await wacht(400);
    check('met een muis (ook het vinkje): geen berichtje (de tip staat er al)', !(await kortBer(page)), await kortBer(page));
    await ctx.close();
  }

  /* ══ 16 ═══════════════════════════════════════════════════════ */
  if (doe('16')) {
    console.log('\n16. Versie en opruimen');
    const lees = n => fs.readFileSync(path.join(map, n), 'utf8');
    const versies = [lees('index.html').match(/APP_VERSIE = 'v(\d+)'/), lees('pdf.js').match(/PDF_VERSIE = 'v(\d+)'/),
                     lees('sw.js').match(/const VERSIE = 'v(\d+)'/)].map(x => x ? +x[1] : 0);
    check('versie v123 of later, gelijk in index.html, pdf.js en sw.js', versies.every(v => v === versies[0] && v >= 123), JSON.stringify(versies));
    check('één regel .btn-primary { … } (de oude gele is weg)', (lees('index.html').match(/^\s*\.btn-primary \{/gm) || []).length === 1);
    check('script 28 en 29 staan in de repo', fs.existsSync(path.join(__dirname, '28_controles_nummers_en_versie.sql')) && fs.existsSync(path.join(__dirname, '29_zoeken.sql')));
    latProject();
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    check('toebehorenOnderlat en toebehorenAlleOnderlat zijn weg (niet meer gebruikt)', await page.evaluate(() => typeof toebehorenOnderlat === 'undefined' && typeof toebehorenAlleOnderlat === 'undefined'));
    await ctx.close();
  }

  /* ══ 17 ═══════════════════════════════════════════════════════ */
  if (doe('17')) {
    console.log('\n17. Nummers: de app zet recht wat de database (script 28) zou weigeren');
    // Zoals glas_ids_fout in script 28 (de proef daarvan draait tegen PostgreSQL).
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
    resetDb();
    const p = rijVan(2);
    p.data.rijen = [ruit(1000000000, 'Z1', '900', '700', KOMPLEET), ruit(2, 'Z2', '800', '600', Object.assign({ fotoId: 'g1' }, KOMPLEET))];
    p.data.fotos = [{ id: 'g1', titel: 'x', markeringen: [{ rijId: 2, x: 0.1, y: 0.1 }, { rijId: -1, x: 0.2, y: 0.2 }, { rijId: 12345678901, x: 0.3, y: 0.3 }] },
                    { id: 'g2', titel: 'y', markeringen: { 0: { rijId: 2 } } }];
    p.data.volgendId = 3;
    check('vooraf: de database zou dit project weigeren', !!dbWeigert(p.data), dbWeigert(p.data));
    ({ ctx, page } = await apparaat(null, 'pc', 2));
    await wachtTot(() => !dbWeigert(rijVan(2).data), 8000);
    u = await page.evaluate(() => JSON.parse(JSON.stringify({ rijen: rijen.map(r => [r.merk, r.id]), fotos: fotos.map(f => f.markeringen) })));
    check('na het openen in v123: de app heeft het rechtgezet en opgeslagen (de database neemt het aan)', !dbWeigert(rijVan(2).data),
      dbWeigert(rijVan(2).data) + ' ' + JSON.stringify(u));
    check('… beide ruiten zijn er nog, het bolletje van Z2 ook', u.rijen.filter(r => r[0]).length === 2 && u.rijen.some(r => r[0] === 'Z1') &&
      JSON.stringify(u.fotos[0]) === JSON.stringify([{ rijId: 2, x: 0.1, y: 0.1 }]), JSON.stringify(u));
    await ctx.close();
    // Werk dat nog apart bewaard op een apparaat stond (van vóór v123), met
    // zo'n nummer: het gaat nu wel naar de server, rechtgezet.
    resetDb();
    ctx = await nieuweContext(null, 'oud');
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('__gezet')) return;
      sessionStorage.setItem('__gezet', '1');
      localStorage.setItem('glasopname_redding', JSON.stringify([{ op: Date.now(), reden: 'test', wie: 'julian, iPad',
        data: { project: 'Oud werk', rijen: [{ id: 1000000000, aantal: 1, merk: 'W1', maatsoort: 'Sponningmaat', breedte: '900', hoogte: '700' }],
                fotos: [{ id: 'h1', markeringen: [{ rijId: -5, x: 0.1, y: 0.1 }] }], volgendId: 2, info: {} } }]));
    });
    page = await nieuwePagina(ctx);
    await page.goto(adres);
    await wachtTot(() => apartBewaard().length === 1, 12000);
    const apart = apartBewaard()[0];
    check('apart bewaard werk met een vreemd nummer: als apart project op de server, rechtgezet', !!apart && !dbWeigert(apart.data) &&
      apart.data.rijen.length === 1 && apart.data.rijen[0].merk === 'W1', apart ? dbWeigert(apart.data) + ' ' + JSON.stringify(apart.data.rijen) : 'niet op de server');
    await ctx.close();
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
