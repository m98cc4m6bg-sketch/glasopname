/* Testreeks v124 Toebehoren — node test-v124-toebehoren.js   (en: --mutaties)

   Onderwerp: het tabblad Toebehoren (wens Jan, 26-10-2026).
   A. Een glaslat kiezen mét plaatje: een eigen kiezer (geen native select)
      in het blok "Alle ruiten", de actiebalk voor gekozen ruiten (P3) en de
      standaardlat bij de instellingen. Per lat het plaatje, bij draaibare
      latten de montage normaal/omgekeerd, maat en uitleg; "niet wijzigen" en
      "projectstandaard"; toetsenbord, muis, vinger; op de telefoon een paneel
      van onderen; sluit met ✕, Escape en tik ernaast; uit op slot/kijken.
   B. Het tabblad overzichtelijker: drie stappen (1 instellingen project,
      2 per ruit, 3 wat bestellen en zagen), uitleg kort en inklapbaar.
      Alle bestaande functies blijven bereikbaar; de rekenregels niet anders.

   De vijf vragen (skill grondig-testen):
   1. Echte situatie: Jan op kantoor (Mac, Safari) of een collega op de iPad
      (staand, vinger of Apple Pencil) of iPhone op de bouwplaats; een project
      met foto's van de gevel, roosters, latten binnen en buiten, soms al
      besteld (dan op slot) of door een collega geopend (alleen kijken).
   2. Belofte: "Ik zie de lat terwijl ik kies, en wat ik kies komt precies zo
      aan als met de oude keuzelijst. Het tabblad is te snappen voor iemand
      die de app niet maakte."
   3. Wat gaat er mis: een andere lat dan gekozen (verkeerde latten besteld
      en gezaagd), een keuze op slot die toch doorgaat (na de bestelling
      klopt de werkvloer niet meer), ↶ dat niet terugzet, een functie die
      niet meer te vinden is, of een getal dat anders wordt.
   4. Halverwege: de kiezer open en het scherm tekent opnieuw (een collega
      slaat op), het slot gaat erop terwijl hij open staat, Escape terwijl er
      ook een venster open is, tikken naast het paneel, draaien van de iPad.
   5. Opstelling: de nagebootste database van test-v121 (node), echte
      Chromium (toetsenbord, muis, aanraken met hasTouch), iPad- en
      iPhone-profiel. Geen echte Safari of Apple Pencil: een pen komt in de
      browser binnen als pointer (pointerType 'pen'); de kiezer gebruikt
      gewone klik-gebeurtenissen, die alle drie geven. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  // v124 (werkgangen-test): latzijde "geen" bij een glaslat voor alle ruiten.
  geenVraag: ["toebehoren.js", "    var geenRuiten = (lw !== '-' || ow !== '-') ? doel.filter(function (r) { return geenNa(r, zw); }) : [];", "    var geenRuiten = [];"],
  geenZijde: ["toebehoren.js", "      if (zijdeErbij && geenRuiten.indexOf(r) >= 0) {", "      if (0) {"],
  geenMelding: ["toebehoren.js", "    if (window.kortBericht) kortBericht('Toegepast op ' + doel.length + (doel.length === 1 ? ' ruit.' : ' ruiten.') + geenTekst,", "    if (window.kortBericht) kortBericht('Toegepast op ' + doel.length + (doel.length === 1 ? ' ruit.' : ' ruiten.'),"],
  geenBalk: ["toebehoren.js", "    if (geenB.length) h += '<div class=\"tb-vb-fout tb-vb-geen\">", "    if (0) h += '<div class=\"tb-vb-fout tb-vb-geen\">"],
  lkFilter: ["toebehoren.js", "    var geldig = L.LATTEN.filter(function (l) { return geldigeLat(l.id, 'boven'); });", "    var geldig = L.LATTEN.slice();"],
  lkPlaatje: ["toebehoren.js", "    var beeld = o.lat ? L.plaatje(o.lat, 56) + ", "    var beeld = o.lat ? '' + "],
  lkMontage: ["toebehoren.js", "(o.draai ? L.montageSVG(o.lat, o.om, 52) : '')", "''"],
  lkKiesAlle: ["toebehoren.js", "      if (wat === 'alle') toebehorenAlleKies('lat', w);", "      if (wat === 'alle') {}"],
  lkKnopBij: ["toebehoren.js", "    if (wat === 'lat') lkKnopBij('alle');", "    if (0) lkKnopBij('alle');"],
  lkVraag: ["toebehoren.js", "lw !== '-' ? 'glaslat: ' + lkNaam('alle', lw) : ''", "lw !== '-' ? 'glaslat' : ''"],
  lkBuiten: ["toebehoren.js", "      if (e.target === laag || (e.target.closest && e.target.closest('.sluit-x'))) { lkSluit(true); return; }", "      if (e.target.closest && e.target.closest('.sluit-x')) { lkSluit(true); return; }"],
  lkKruis: ["toebehoren.js", "      if (e.target === laag || (e.target.closest && e.target.closest('.sluit-x'))) { lkSluit(true); return; }", "      if (e.target === laag) { lkSluit(true); return; }"],
  lkPijl: ["toebehoren.js", "    if (e.key === 'ArrowDown') naar = Math.min(lijst.length - 1, i + 1);", "    if (e.key === 'ArrowDown') naar = null;"],
  lkLetter: ["toebehoren.js", "      if (hit) naar = lijst.indexOf(hit);", "      if (0) naar = lijst.indexOf(hit);"],
  lkEsc: ["toebehoren.js", "    document.addEventListener('keydown', lkEsc, true);\n    window.addEventListener('resize', lkPlaats);", "    window.addEventListener('resize', lkPlaats);"],
  lkEscMelding: ["toebehoren.js", "    if (document.querySelector('.melding-laag, .lat-groot, .lat-laag')) return;\n", ""],
  lkTab: ["toebehoren.js", "    else if (e.key === 'Tab') { e.preventDefault(); lkSluit(true); return; }", "    else if (e.key === 'Tab') { return; }"],
  lkFocusTerug: ["toebehoren.js", "    setTimeout(function () { var k = lkKnop(wat); if (k && !k.disabled) { try { k.focus({ preventScroll: true }); } catch (e) { k.focus(); } } }, 0);\n", ""],
  lkFocusOpen: ["toebehoren.js", "    lkFocus(laag.querySelector('.tb-lk-optie.gekozen') || laag.querySelector('.tb-lk-optie'));\n", ""],
  latVensterPijl: ["latten.js", "    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && laag && !document.querySelector('.lat-groot')) {", "    if (0) {"],
  lkTelefoon: ["index.html", "    .tb-lk-paneel { left: 0; right: 0; bottom: 0; top: auto; width: auto; max-height: 82vh;", "    .tb-lk-paneel { max-height: 82vh;"],
  // twee bewakingen samen (min-width: 0 op de knop, max-width: 100% in het blok): beide weg.
  lkTelefoonBreed: ["index.html", "    .tb-alles .tb-lk-knop { max-width: 100%; flex: 1 1 100%; }", "    .tb-alles .tb-lk-knop { max-width: none; flex: 1 1 100%; }",
    "gap: 6px; min-height: 34px; min-width: 0; max-width: 100%;", "gap: 6px; min-height: 34px; max-width: 100%;"],
  lkVinger: ["index.html", "    .tb-lk-knop, .tb-alles .tb-lk-knop, .tb-balk-velden .tb-lk-knop { min-height: 44px; font-size: 16px; }", "    .tb-lk-knop { min-height: 44px; font-size: 16px; }"],
  latVensterOnder: ["index.html", "    .lat-laag { align-items: flex-end; padding: max(16px, env(safe-area-inset-top)) 0 0; }\n", ""],
  lkBalk: ["toebehoren.js", "      else if (wat === 'balk') toebehorenBalkKies('lat', w);", "      else if (wat === 'balk') toebehorenAlleKies('lat', w);"],
  lkStdOm: ["toebehoren.js", "        var draai = wat !== 'std' && L.draaibaar(l);", "        var draai = L.draaibaar(l);"],
  lkStdKies: ["toebehoren.js", "      else toebehorenKeuze('standaardLat', w);", "      else {}"],
  lkSlotUit: ["toebehoren.js", "    var latAlle = lkKnopHTML('alle', alleKeuze.lat, lkAttrs('alle') + latUit);", "    var latAlle = lkKnopHTML('alle', alleKeuze.lat, lkAttrs('alle'));"],
  lkStdSlotUit: ["toebehoren.js", "lkKnopHTML('std', k.standaardLat, lkAttrs('std') + latUit)", "lkKnopHTML('std', k.standaardLat, lkAttrs('std'))"],
  lkSlotOpen: ["toebehoren.js", "    if (!knop || knop.disabled) return;\n    // Op slot na de bestelling, of alleen kijken: niet openen, en zeggen waarom.\n    if (latSlot()) { renderToebehoren(); return; }\n", "    if (!knop) return;\n"],
  lkSlotKies: ["toebehoren.js", "    if (latSlot()) { lkSluit(false); renderToebehoren(); return; }\n    lkSluit(false);\n", "    lkSluit(false);\n"],
  lkNaTekenen: ["toebehoren.js", "    lkNaTekenen();\n", ""],
  slotRegel: ["toebehoren.js", "    if (slot && !kijken) {\n      s1.push('<div class=\"tb-slotregel\">", "    if (0) {\n      s1.push('<div class=\"tb-slotregel\">"],
  rekenDicht: ["index.html", "  .tb-stap:not(.tb-met-reken) .tb-blok > .tb-reken { display: none; }\n", ""],
  rekenOnthoud: ["toebehoren.js", "    lsZet('glasopname_tb_reken', toonReken);\n", ""],
  hulpOnthoud: ["toebehoren.js", "hulpOpen = !!open; lsZet('glasopname_tb_hulp', hulpOpen); };", "hulpOpen = !!open; };"],
  letopWeg: ["toebehoren.js", "    if (letop.length) h.push('<div class=\"tb-letop\"", "    if (0) h.push('<div class=\"tb-letop\""],
  naarStap: ["toebehoren.js", "    var s = el('tbStap' + n);", "    var s = null;"],
  instFocus: ["toebehoren.js", "    if (k) { try { k.focus({ preventScroll: true }); } catch (e) { k.focus(); } }\n  };", "    if (0) { k.focus(); }\n  };"],
  teRegelen: ["toebehoren.js", "    var teDoen = letop.filter(function (x) { return x.indexOf('tb-zacht') < 0; }).length;", "    var teDoen = letop.length;"],
};
const WAAR = {geenVraag: '7', geenZijde: '7', geenMelding: '7', geenBalk: '7', lkFilter: '1', lkPlaatje: '1', lkMontage: '1', lkKiesAlle: '1', lkKnopBij: '1', lkVraag: '1', lkBuiten: '1', lkKruis: '1', lkPijl: '2', lkLetter: '2', lkEsc: '2', lkEscMelding: '2', lkTab: '2', lkFocusTerug: '2', lkFocusOpen: '2', latVensterPijl: '2', lkTelefoon: '3', lkTelefoonBreed: '3', lkVinger: '3', latVensterOnder: '3', lkBalk: '4', lkStdOm: '4', lkStdKies: '4', lkSlotUit: '5', lkStdSlotUit: '5', lkSlotOpen: '5', lkSlotKies: '5', lkNaTekenen: '5', slotRegel: '5', rekenDicht: '6', rekenOnthoud: '6', hulpOnthoud: '6', letopWeg: '6', naarStap: '6', instFocus: '6', teRegelen: '6'};

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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v124tb-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v124tb-pdf-'));
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

/* ─── hulp voor v121 ──────────────────────────────────────────── */
const IPHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };
// X buiten (onder automatisch de passende neuslat), Y binnen, D beide.
const LATTEN121 = p => { p.data.info.toebehoren = { perRuit: {
  1: { latZijde: 'buiten', sponningDiepte: 44, diepteOnder: 52 },
  2: { latZijde: 'binnen', sponningDiepte: 44 },
  3: { latZijde: 'beide', sponningDiepte: 60 } } }; };
const stukkenVan = (page, merk) => page.evaluate(m => {
  const u = toebehorenBerekenen();
  const p = u.perRuit.find(x => x.rij.merk === m);
  return p ? { b: p.sponning.b, h: p.sponning.h, stukken: p.stukken, latM: p.latM, onder: p.onderlat } : null;
}, merk);
const balkTekst = page => page.$eval('#tbActiebalk', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
const zijden = page => page.evaluate(() => ['X', 'Y', 'D'].map(mk => GlasLatten.zijde(rijen.find(r => r.merk === mk))));
const vink = async (page, mk) => { await tbR(page, mk).locator('label.tb-kies input').check(); await wacht(400); };


/* ─── hulp voor v124 (Toebehoren) ─────────────────────────────── */
const AFDRUK = process.env.AFDRUK || '';          // 'voor' of 'na': schermafdrukken in AFDRUK_MAP
const AFDRUK_MAP = process.env.AFDRUK_MAP || require('os').tmpdir() + '/toebehoren-afdrukken';
async function afdruk(page, naam, heel) {
  if (!AFDRUK) return;
  await page.screenshot({ path: path.join(AFDRUK_MAP, AFDRUK + '-' + naam + '.png'), fullPage: heel !== false }).catch(() => {});
}
// Het gevelproject voor Toebehoren: latten binnen en buiten (LATTEN_GEVEL),
// roosters bij A en B, wienersprossen bij C, D los met max glaspakket 28.
const GEVEL124 = p => {
  LATTEN_GEVEL(p);
  const r = mk => p.data.rijen.find(x => x.merk === mk);
  Object.assign(r('A'), ROOSTER); Object.assign(r('B'), ROOSTER);
  r('C').roedenverdeling = 'Wienersprossen - 2H x 2V (raster)';
  r('D').maxPakket = 28;
};
const BESTELD = p => { p.data.info.status = 'besteld'; p.status = 'besteld'; };
// De latkiezer (v124).
const paneel = page => page.locator('.tb-lk-paneel');
const paneelOpen = async page => (await page.locator('.tb-lk-paneel').count()) > 0 && await page.locator('.tb-lk-paneel').isVisible();
const opties = page => page.$$eval('.tb-lk-optie', l => l.map(o => ({ w: o.getAttribute('data-waarde'), tekst: o.innerText.replace(/\s+/g, ' '),
  plaatje: !!o.querySelector('.lat-plaatje'), foto: !!o.querySelector('.lat-plaatje img, .lat-plaatje.met-foto'), svg: !!o.querySelector('.lat-plaatje svg'),
  montage: !!o.querySelector('svg.lat-montage'), gekozen: o.classList.contains('gekozen') && o.getAttribute('aria-selected') === 'true',
  h: Math.round(o.getBoundingClientRect().height) })));
// De keuzes die de keuzelijst tot v123 had (geldigeLat(id, 'boven'): geen neus- of ventilatielat; draaibaar ook omgekeerd).
const oudeKeuzes = (page, std) => page.evaluate(std => {
  const L = GlasLatten;
  const latten = L.LATTEN.filter(l => l.soort !== 'neuslat' && l.soort !== 'ventilatie');
  return (std ? [] : ['-', '']).concat(...latten.map(l => !std && L.draaibaar(l) ? [l.id, l.id + '|om'] : [l.id])).sort();
}, !!std);
const focusWaarde = page => page.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('data-waarde') != null ? 'optie:' + a.getAttribute('data-waarde') : (a.getAttribute('data-lk') ? 'knop:' + a.getAttribute('data-lk') : a.tagName + '.' + a.className)) : ''; });
const knopTekst = (page, sel) => page.$eval(sel, k => ({ tekst: k.innerText.replace(/\s+/g, ' ').trim(), value: k.value, dis: k.disabled, tag: k.tagName,
  exp: k.getAttribute('aria-expanded'), plaatje: !!k.querySelector('.lat-plaatje') }));
const vensterPlek = page => page.evaluate(() => {
  const p = document.querySelector('.tb-lk-paneel'); if (!p) return null;
  const r = p.getBoundingClientRect();
  return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), vw: innerWidth, vh: innerHeight,
    schuif: document.documentElement.scrollWidth > innerWidth };
});

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, t, u, v, m, id;

  /* ══ S: schermafdrukken (alleen met AFDRUK=voor|na) ══════════════ */
  if (AFDRUK && doe('S')) {
    console.log('\nS. Schermafdrukken (' + AFDRUK + ')');
    const maten = [['pc', null], ['ipad', IPAD], ['iphone', IPHONE]];
    for (const [naam, opt] of maten) {
      gevelProject(GEVEL124);
      ({ ctx, page } = await apparaat(opt, naam, 1));
      await naarToebehoren(page); await wacht(800);
      await afdruk(page, 'gevel-' + naam);
      await ctx.close();
    }
    latProject(LATTEN121);
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page); await wacht(500);
    await afdruk(page, 'los-pc');
    await ctx.close();
    gevelProject(p => { GEVEL124(p); BESTELD(p); });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page); await wacht(800);
    await afdruk(page, 'slot-pc');
    await ctx.close();
    gevelProject(GEVEL124);
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page); await wacht(800);
    await page.evaluate(() => ['A', 'B'].forEach(mk => toebehorenKies(rijen.find(x => x.merk === mk).id, true))); await wacht(500);
    await afdruk(page, 'balk-pc', false);
    await ctx.close();
  }

  /* ══ 1: de latkiezer in "Alle ruiten" (muis, pc) ═════════════════ */
  if (doe('1')) {
    console.log('\n1. Glaslat kiezen mét plaatje: blok Alle ruiten (pc, muis)');
    gevelProject(GEVEL124);
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page);
    v = await knopTekst(page, '#tbAlleLat');
    check('de glaslat is een knop (geen keuzelijst) met de huidige keuze "glaslat: niet wijzigen"', v.tag === 'BUTTON' && v.value === '-' &&
      /glaslat: niet wijzigen/.test(v.tekst) && v.exp === 'false' && !v.dis, JSON.stringify(v));
    await page.click('#tbAlleLat'); await wacht(300);
    check('klikken: de kiezer gaat open', await paneelOpen(page));
    check('… de knop zegt aria-expanded="true"', (await knopTekst(page, '#tbAlleLat')).exp === 'true');
    await wacht(600);   // de foto's laden
    u = await opties(page);
    const oud = await oudeKeuzes(page);
    const nu = u.map(o => o.w).sort();
    check('dezelfde keuzes als de keuzelijst tot v123 (niet wijzigen, projectstandaard, alle latten voor boven, draaibare ook omgekeerd)',
      JSON.stringify(nu) === JSON.stringify(oud), JSON.stringify(nu) + ' / ' + JSON.stringify(oud));
    check('geen neuslat of ventilatielat in de lijst', !u.some(o => /^(N\d\d|C\d)$/.test(o.w.split('|')[0])));
    const latten = u.filter(o => o.w !== '-');
    check('elke lat (en de projectstandaard) met een plaatje (tekening + foto)', latten.length > 15 && latten.every(o => o.plaatje && o.svg && o.foto),
      JSON.stringify(latten.filter(o => !(o.plaatje && o.svg && o.foto)).map(o => o.w)));
    m = await page.$$eval('.tb-lk-optie .lat-plaatje.met-foto', l => l.length);
    check('de foto\'s van Jongeneel zijn echt geladen', m >= latten.length - 2, m + ' van ' + latten.length);
    const e22 = u.find(o => o.w === 'E22'), e22om = u.find(o => o.w === 'E22|om'), a4 = u.find(o => o.w === 'A4');
    check('draaibare lat E22: twee keuzes, elk met de montagetekening (normaal / omgekeerd)', e22 && e22om && e22.montage && e22om.montage &&
      /E22 12x33 met sponning · normaal/.test(e22.tekst) && /omgekeerd/.test(e22om.tekst), JSON.stringify([e22, e22om]));
    check('… met de uitleg: "eigen sponning naar het glas: 5 mm extra ruimte" / "het dikke deel steekt 5 mm de sponning in"',
      /eigen sponning naar het glas: 5 mm extra ruimte/.test(e22.tekst) && /het dikke deel steekt 5 mm de sponning in/.test(e22om.tekst), e22.tekst + ' | ' + e22om.tekst);
    check('A4: maat en uitleg (latInfo) "17 hoog, 15 mm in de sponning", geen montage', a4 && /A4 17x15/.test(a4.tekst) && /17 hoog, 15 mm in de sponning/.test(a4.tekst) && !a4.montage, a4 && a4.tekst);
    check('de huidige keuze ("Niet wijzigen") is aangegeven', u.filter(o => o.gekozen).map(o => o.w).join() === '-', JSON.stringify(u.filter(o => o.gekozen)));
    check('projectstandaard noemt de lat (A4)', /Projectstandaard.*A4/.test((u.find(o => o.w === '') || {}).tekst || ''));
    t = await page.$$eval('.tb-lk-groep', l => l.map(x => x.textContent));
    check('in groepen: Glaslat, Glaslat met sponning, Opdeklat', JSON.stringify(t) === '["Glaslat","Glaslat met sponning","Opdeklat"]', JSON.stringify(t));
    v = await vensterPlek(page);
    const kr = await page.$eval('#tbAlleLat', k => { const r = k.getBoundingClientRect(); return { l: Math.round(r.left), b: Math.round(r.bottom), t: Math.round(r.top) }; });
    // Onder de knop, of erboven als er onder te weinig plek is (hier: de knop zit laag op het scherm).
    check('op de pc: de kiezer vlak onder of boven de knop (niet eroverheen), helemaal in beeld', v && ((v.t >= kr.b && v.t - kr.b <= 8) || (v.b <= kr.t && kr.t - v.b <= 8)) &&
      Math.abs(v.l - kr.l) <= 2 && v.t >= 0 && v.b <= v.vh && v.r <= v.vw && (v.b - v.t) >= 300, JSON.stringify([v, kr]));
    await afdruk(page, 'kiezer-pc', false);
    check('nog niets bewaard zolang je kiest', !perRuitDb('A').glaslat && !perRuitDb('B').glaslat, JSON.stringify(perRuitDb('A')));
    // E22 omgekeerd kiezen (echte klik).
    await page.click('.tb-lk-optie[data-waarde="E22|om"]'); await wacht(300);
    check('kiezen: de kiezer is dicht', !(await paneelOpen(page)));
    v = await knopTekst(page, '#tbAlleLat');
    check('de knop toont de keuze: plaatje + "E22 12x33 met sponning omgekeerd"', v.value === 'E22|om' && /glaslat: E22 12x33 met sponning omgekeerd/.test(v.tekst) && v.plaatje,
      JSON.stringify(v));
    t = await page.locator('#tbAlleVoorbeeld').innerText().catch(() => '');
    check('het voorbeeld ernaast (v117) volgt: E22 omgekeerd', /E22/.test(t) && /omgekeerd/.test(t), t);
    check('nog steeds niets bewaard (pas bij Toepassen)', !perRuitDb('A').glaslat && !(await page.evaluate(() => (projectInfo.toebehoren.perRuit[1] || {}).glaslat)));
    await page.click('.tb-alles button:has-text("Toepassen")');
    const va = await wachtOpMelding(page, /Alle ruiten wijzigen/, 4000);
    check('de vraag noemt de lat: "glaslat: E22 12x33 met sponning omgekeerd"', va.ok && /glaslat: E22 12x33 met sponning omgekeerd/.test(va.tekst), va.tekst.slice(0, 300));
    await knop(page, 'Toepassen'); await wacht(500);
    await opgeslagenAls(() => ['A', 'B', 'C', 'D', 'E', 'F'].every(mk => perRuitDb(mk).glaslat === 'E22' && perRuitDb(mk).latOmgekeerd === true));
    check('Toepassen: alle zes ruiten E22 omgekeerd, ook in de database', ['A', 'B', 'C', 'D', 'E', 'F'].every(mk => perRuitDb(mk).glaslat === 'E22' && perRuitDb(mk).latOmgekeerd === true),
      JSON.stringify(['A', 'D'].map(perRuitDb)));
    check('… en de andere keuzes per ruit bleven (A: binnen, diepte 45)', perRuitDb('A').latZijde === 'binnen' && perRuitDb('A').sponningDiepte === 45, JSON.stringify(perRuitDb('A')));
    await page.click('#kortBericht button:has-text("Terugzetten")'); await wacht(600);
    await opgeslagenAls(() => !perRuitDb('A').glaslat && !perRuitDb('D').glaslat);
    check('↶ Terugzetten: weer zoals het was (ook in de database)', ['A', 'B', 'C', 'D', 'E', 'F'].every(mk => !perRuitDb(mk).glaslat && !perRuitDb(mk).latOmgekeerd) &&
      perRuitDb('A').sponningDiepte === 45, JSON.stringify(['A', 'D'].map(perRuitDb)));
    // Opnieuw open: de keuze staat er nog (E22 omgekeerd blijft gekozen tot je hem wijzigt; zoals de keuzelijst).
    await page.click('#tbAlleLat'); await wacht(300);
    u = await opties(page);
    check('opnieuw open: de laatste keuze is aangegeven en heeft de focus', u.filter(o => o.gekozen).map(o => o.w).join() === (await knopTekst(page, '#tbAlleLat')).value &&
      (await focusWaarde(page)) === 'optie:' + (await knopTekst(page, '#tbAlleLat')).value, JSON.stringify([u.filter(o => o.gekozen).map(o => o.w), await focusWaarde(page)]));
    await page.click('.tb-lk-optie[data-waarde="-"]'); await wacht(300);
    check('"Niet wijzigen" kiezen: de knop zegt het weer, het voorbeeld is weg', (await knopTekst(page, '#tbAlleLat')).value === '-' && await page.locator('#tbAlleVoorbeeld').isHidden());
    // Sluiten zonder te kiezen: ✕ en klikken ernaast.
    await page.click('#tbAlleLat'); await wacht(300);
    await page.click('.tb-lk-paneel .sluit-x'); await wacht(300);
    check('✕ sluit, zonder iets te kiezen', !(await paneelOpen(page)) && (await knopTekst(page, '#tbAlleLat')).value === '-');
    await page.click('#tbAlleLat'); await wacht(300);
    await page.mouse.click(1200, 880); await wacht(300);
    check('klikken naast de kiezer sluit, zonder iets te kiezen (en klikt niet door)', !(await paneelOpen(page)) && (await knopTekst(page, '#tbAlleLat')).value === '-' &&
      !(await meldingen(page)).length);
    // Opnieuw tekenen terwijl de kiezer open staat (een collega slaat op): hij blijft werken.
    await page.click('#tbAlleLat'); await wacht(300);
    await page.evaluate(() => renderToebehoren()); await wacht(300);
    await page.click('.tb-lk-optie[data-waarde="A12"]'); await wacht(300);
    check('opnieuw getekend terwijl hij open stond: kiezen werkt nog (A12)', (await knopTekst(page, '#tbAlleLat')).value === 'A12' && !(await paneelOpen(page)));
    await ctx.close();
  }

  /* ══ 2: toetsenbord ═══════════════════════════════════════════════ */
  if (doe('2')) {
    console.log('\n2. Glaslat kiezen met het toetsenbord');
    gevelProject(GEVEL124);
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page);
    await page.focus('#tbAlleZijde');
    await page.keyboard.press('Tab'); await wacht(100);
    check('Tab vanaf de latzijde: de knop van de glaslat', (await focusWaarde(page)) === 'knop:alle', await focusWaarde(page));
    await page.keyboard.press('Enter'); await wacht(300);
    check('Enter: open, de focus op de huidige keuze ("niet wijzigen")', await paneelOpen(page) && (await focusWaarde(page)) === 'optie:-', await focusWaarde(page));
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await wacht(100);
    check('↓ ↓: naar de tweede lat in de lijst (A4)', (await focusWaarde(page)) === 'optie:A4', await focusWaarde(page));
    await page.keyboard.press('ArrowUp'); await wacht(100);
    check('↑: projectstandaard', (await focusWaarde(page)) === 'optie:', await focusWaarde(page));
    await page.keyboard.press('End'); await wacht(100);
    v = await page.evaluate(() => { const l = document.querySelectorAll('.tb-lk-optie'); const o = l[l.length - 1]; const r = o.getBoundingClientRect(), p = document.querySelector('.tb-lk-lijst').getBoundingClientRect();
      return { w: o.getAttribute('data-waarde'), zicht: r.top >= p.top - 1 && r.bottom <= p.bottom + 1 }; });
    check('End: de laatste (GLD2 omgekeerd), en in beeld geschoven', (await focusWaarde(page)) === 'optie:' + v.w && v.w === 'GLD2|om' && v.zicht, JSON.stringify(v));
    await page.keyboard.press('Home'); await wacht(100);
    check('Home: de eerste ("niet wijzigen")', (await focusWaarde(page)) === 'optie:-', await focusWaarde(page));
    await page.keyboard.type('A12'); await wacht(100);
    check('"A12" typen: naar A12', (await focusWaarde(page)) === 'optie:A12', await focusWaarde(page));
    await page.keyboard.press('Enter'); await wacht(300);
    check('Enter: A12 gekozen, dicht, de focus terug op de knop', !(await paneelOpen(page)) && (await knopTekst(page, '#tbAlleLat')).value === 'A12' &&
      (await focusWaarde(page)) === 'knop:alle', await focusWaarde(page));
    await page.keyboard.press('Space'); await wacht(300);
    check('Spatie: open, en kiest niet meteen iets (de keuze blijft A12)', await paneelOpen(page) && (await focusWaarde(page)) === 'optie:A12' &&
      (await knopTekst(page, '#tbAlleLat')).value === 'A12', await focusWaarde(page));
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape'); await wacht(300);
    check('Escape: dicht, niets veranderd, de focus terug op de knop', !(await paneelOpen(page)) && (await knopTekst(page, '#tbAlleLat')).value === 'A12' &&
      (await focusWaarde(page)) === 'knop:alle', await focusWaarde(page));
    await page.keyboard.press('Enter'); await wacht(300);
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Tab'); await wacht(300);
    check('Tab in de kiezer: dicht (zoals een keuzelijst), niets veranderd', !(await paneelOpen(page)) && (await knopTekst(page, '#tbAlleLat')).value === 'A12' &&
      (await focusWaarde(page)) === 'knop:alle', await focusWaarde(page));
    // Escape met een venster van de app erboven: dat venster eerst.
    await page.keyboard.press('Enter'); await wacht(300);
    await page.evaluate(() => { appMelding('Proef', { kop: 'Proef' }); }); await wacht(300);
    await page.keyboard.press('Escape'); await wacht(300);
    check('Escape met een melding erboven: de kiezer blijft open', await paneelOpen(page));
    await sluitMeldingen(page);
    await page.keyboard.press('Escape'); await wacht(300);
    check('… daarna sluit Escape de kiezer', !(await paneelOpen(page)));
    // Per ruit: het venster met plaatjes (latKiezen) kent nu ook de pijltjes.
    id = await idOp(page, 'A');
    await page.click('[data-sleutel="lat-' + id + '"]'); await page.waitForSelector('.lat-venster', { timeout: 3000 });
    await page.keyboard.press('ArrowDown'); await wacht(100);
    const eerst = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-kies'));
    await page.keyboard.press('ArrowDown'); await wacht(100);
    const dan = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-kies'));
    check('per ruit (venster Glaslat): ↓ gaat langs de latten', eerst !== null && dan !== null && eerst !== dan, JSON.stringify([eerst, dan]));
    await page.keyboard.press('Enter'); await wacht(500);
    await opgeslagenAls(() => perRuitDb('A').glaslat === dan);
    check('… en Enter kiest die lat (ook in de database)', !(await page.locator('.lat-venster').count()) && perRuitDb('A').glaslat === dan, JSON.stringify(perRuitDb('A')));
    await ctx.close();
  }

  /* ══ 3: vinger en pen (iPad), telefoon (iPhone) ══════════════════ */
  if (doe('3')) {
    console.log('\n3. Glaslat kiezen op de iPad (tikken) en de iPhone (paneel van onderen)');
    gevelProject(GEVEL124);
    ({ ctx, page } = await apparaat(IPAD, 'ipad', 1));
    await naarToebehoren(page);
    v = await page.$eval('#tbAlleLat', k => Math.round(k.getBoundingClientRect().height));
    check('iPad: de knop is minstens 44 px hoog', v >= 44, v);
    await page.locator('#tbAlleLat').tap(); await wacht(400);
    check('iPad: tikken opent', await paneelOpen(page));
    u = await opties(page);
    check('iPad: elke keuze minstens 44 px hoog (vinger)', u.every(o => o.h >= 44), JSON.stringify(u.filter(o => o.h < 44).map(o => o.w + ':' + o.h)));
    v = await vensterPlek(page);
    check('iPad (820 staand): onder de knop, in beeld', v && v.l >= 0 && v.r <= v.vw && v.b <= v.vh && !v.schuif, JSON.stringify(v));
    await page.touchscreen.tap(10, 1150); await wacht(400);
    check('iPad: naast de kiezer tikken sluit, zonder te kiezen', !(await paneelOpen(page)) && (await knopTekst(page, '#tbAlleLat')).value === '-');
    await page.locator('#tbAlleLat').tap(); await wacht(400);
    await page.locator('.tb-lk-optie[data-waarde="B13"]').scrollIntoViewIfNeeded();
    await page.locator('.tb-lk-optie[data-waarde="B13"]').tap(); await wacht(400);
    check('iPad: op B13 tikken kiest B13', !(await paneelOpen(page)) && (await knopTekst(page, '#tbAlleLat')).value === 'B13');
    // Een pen (Apple Pencil) geeft pointer-gebeurtenissen met pointerType "pen" en daarna een klik.
    await page.locator('#tbAlleLat').tap(); await wacht(400);
    await page.evaluate(() => {
      const o = document.querySelector('.tb-lk-optie[data-waarde="A10"]'); const r = o.getBoundingClientRect();
      const x = r.left + 20, y = r.top + 10, mee = { bubbles: true, pointerType: 'pen', clientX: x, clientY: y, isPrimary: true };
      o.dispatchEvent(new PointerEvent('pointerdown', mee)); o.dispatchEvent(new PointerEvent('pointerup', mee));
      o.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
    }); await wacht(400);
    check('iPad: met de pen (pointerType pen) A10 kiezen', !(await paneelOpen(page)) && (await knopTekst(page, '#tbAlleLat')).value === 'A10');
    await afdruk(page, 'kiezer-ipad', false);
    await ctx.close();
    // iPhone: paneel van onderen.
    gevelProject(GEVEL124);
    ({ ctx, page } = await apparaat(IPHONE, 'iphone', 1));
    await naarToebehoren(page);
    await page.locator('#tbAlleLat').tap(); await wacht(500);
    v = await vensterPlek(page);
    check('iPhone: een paneel van onderen, de hele breedte', v && v.l === 0 && v.r === v.vw && Math.abs(v.b - v.vh) <= 1 && !v.schuif, JSON.stringify(v));
    check('iPhone: niet hoger dan 82 % van het scherm', v && (v.b - v.t) <= Math.ceil(0.82 * v.vh), JSON.stringify(v));
    m = await page.evaluate(() => { const r = document.querySelector('.tb-lk-paneel .sluit-x').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    check('iPhone: ✕ is 44 × 44', m[0] === 44 && m[1] === 44, JSON.stringify(m));
    m = await page.evaluate(() => getComputedStyle(document.querySelector('.tb-lk-laag')).backgroundColor);
    check('iPhone: de pagina erachter wordt donkerder (je ziet dat het een paneel is)', m !== 'rgba(0, 0, 0, 0)', m);
    await afdruk(page, 'kiezer-iphone', false);
    await page.locator('.tb-lk-optie[data-waarde="E7|om"]').scrollIntoViewIfNeeded();
    await page.locator('.tb-lk-optie[data-waarde="E7|om"]').tap(); await wacht(400);
    v = await knopTekst(page, '#tbAlleLat');
    check('iPhone: E7 omgekeerd tikken kiest hem', !(await paneelOpen(page)) && v.value === 'E7|om' && /E7 9x32 met sponning omgekeerd/.test(v.tekst), JSON.stringify(v));
    m = await page.evaluate(() => [document.documentElement.scrollWidth, Math.round(document.getElementById('tbAlleLat').getBoundingClientRect().right)]);
    check('iPhone: met een lange naam in de knop schuift de pagina niet opzij', m[0] <= 390 && m[1] <= 390, JSON.stringify(m));
    await page.locator('#tbAlleLat').tap(); await wacht(400);
    await page.touchscreen.tap(195, 60); await wacht(400);
    check('iPhone: boven het paneel tikken sluit', !(await paneelOpen(page)) && (await knopTekst(page, '#tbAlleLat')).value === 'E7|om');
    // De vensters per ruit (latten.js) ook van onderen.
    id = await idOp(page, 'A');
    await page.evaluate(i => latKiezen(i), id); await page.waitForSelector('.lat-venster', { timeout: 3000 }); await wacht(300);
    v = await page.$eval('.lat-venster', e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight }; });
    check('iPhone: het venster Glaslat per ruit ook van onderen, de hele breedte', v.l === 0 && v.r === v.vw && Math.abs(v.b - v.vh) <= 1, JSON.stringify(v));
    await page.keyboard.press('Escape'); await wacht(200);
    await ctx.close();
  }

  /* ══ 4: de actiebalk (P3) en de standaardlat ═══════════════════════ */
  if (doe('4')) {
    console.log('\n4. Glaslat kiezen in de actiebalk (gekozen ruiten) en als standaardlat');
    latProject(LATTEN119);   // X, Y, D binnen; X A5 in 41, Y in 44, D in 50
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page);
    await vink(page, 'X'); await vink(page, 'D');
    v = await knopTekst(page, '#tbActiebalk [data-sleutel="balk-lat"]');
    check('actiebalk: de glaslat is de kiezer ("glaslat: niet wijzigen")', v.tag === 'BUTTON' && v.value === '-' && /glaslat: niet wijzigen/.test(v.tekst), JSON.stringify(v));
    await page.click('#tbActiebalk [data-sleutel="balk-lat"]'); await wacht(400);
    v = await vensterPlek(page);
    const bk = await page.$eval('#tbActiebalk [data-sleutel="balk-lat"]', k => Math.round(k.getBoundingClientRect().top));
    check('de kiezer gaat boven de knop open (de balk zit onderin), in beeld', v && v.b <= bk && v.t >= 0, JSON.stringify([v, bk]));
    check('… de titel zegt "voor de gekozen ruiten"', /Glaslat voor de gekozen ruiten/.test(await paneel(page).innerText()));
    check('… dezelfde keuzes als de keuzelijst tot v123', JSON.stringify((await opties(page)).map(o => o.w).sort()) === JSON.stringify(await oudeKeuzes(page)));
    await page.click('.tb-lk-optie[data-waarde="A12"]'); await wacht(400);
    t = await balkTekst(page);
    check('A12 gekozen: de knop zegt het, het voorbeeld rekent met A12', /glaslat: A12 17x26/.test(t) && /Na toepassen:/.test(t) && /A12 ·/.test(t), t.slice(0, 300));
    check('… nog niets bewaard', !perRuitDb('X').glaslat || perRuitDb('X').glaslat === 'A5');
    check('… de focus staat weer op de knop in de balk', (await focusWaarde(page)) === 'knop:balk', await focusWaarde(page));
    await page.click('#tbActiebalk button:has-text("Toepassen op 2 ruiten")'); await wacht(600);
    await opgeslagenAls(() => perRuitDb('X').glaslat === 'A12' && perRuitDb('D').glaslat === 'A12');
    check('Toepassen: X en D A12 (database), Y niet', perRuitDb('X').glaslat === 'A12' && perRuitDb('D').glaslat === 'A12' && !perRuitDb('Y').glaslat,
      JSON.stringify([perRuitDb('X'), perRuitDb('Y'), perRuitDb('D')]));
    await page.click('#kortBericht button:has-text("Terugzetten")'); await wacht(600);
    await opgeslagenAls(() => perRuitDb('X').glaslat === 'A5' && !perRuitDb('D').glaslat);
    check('↶ Terugzetten: X weer A5, D weer de standaard', perRuitDb('X').glaslat === 'A5' && !perRuitDb('D').glaslat, JSON.stringify([perRuitDb('X'), perRuitDb('D')]));
    await page.click('#tbActiebalk .sluit-x'); await wacht(300);
    // De standaardlat (instellingen).
    await page.click('.tb-inst-kop'); await wacht(300);
    v = await knopTekst(page, '#tbStdLat');
    check('instellingen: de standaardlat is de kiezer, "A4 17x15" met plaatje', v.tag === 'BUTTON' && v.value === 'A4' && /A4 17x15/.test(v.tekst) && v.plaatje, JSON.stringify(v));
    await page.click('#tbStdLat'); await wacht(400);
    u = await opties(page);
    check('standaardlat: alleen latten (geen "niet wijzigen"/"projectstandaard", geen omgekeerd), dezelfde als de keuzelijst tot v123',
      JSON.stringify(u.map(o => o.w).sort()) === JSON.stringify(await oudeKeuzes(page, true)) && !u.some(o => o.montage), JSON.stringify(u.map(o => o.w)));
    check('… A4 is aangegeven', u.filter(o => o.gekozen).map(o => o.w).join() === 'A4');
    await page.click('.tb-lk-optie[data-waarde="B13"]'); await wacht(500);
    await opgeslagenAls(() => (info().toebehoren || {}).standaardLat === 'B13');
    check('B13 kiezen: de standaardlat is B13 (database), de ruiten zonder eigen lat volgen', (info().toebehoren || {}).standaardLat === 'B13' &&
      (await page.evaluate(() => GlasLatten.latVoorRuit(rijen.find(r => r.merk === 'Y')).id)) === 'B13', JSON.stringify(info().toebehoren));
    v = await knopTekst(page, '#tbStdLat');
    check('… de knop zegt "B13 17x27" (de instellingen blijven open)', /B13 17x27/.test(v.tekst), JSON.stringify(v));
    await page.keyboard.press('Control+z'); await wacht(600);
    await opgeslagenAls(() => !(info().toebehoren || {}).standaardLat || (info().toebehoren || {}).standaardLat === 'A4');
    check('↶ (Ctrl+Z): de standaardlat terug naar A4', (await page.evaluate(() => GlasLatten.project().lat)) === 'A4' &&
      (!(info().toebehoren || {}).standaardLat || info().toebehoren.standaardLat === 'A4'), JSON.stringify(info().toebehoren));
    await ctx.close();
  }

  /* ══ 5: op slot en alleen kijken ══════════════════════════════════ */
  if (doe('5')) {
    console.log('\n5. De kiezer op slot (besteld) en bij alleen kijken');
    gevelProject(p => { GEVEL124(p); BESTELD(p); });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page);
    check('besteld: het project staat op slot', await opSlot(page));
    await page.click('.tb-inst-kop'); await wacht(300);
    v = [await knopTekst(page, '#tbAlleLat'), await knopTekst(page, '#tbStdLat')];
    check('op slot: de knoppen van de kiezer (Alle ruiten, standaardlat) staan uit', v.every(x => x.dis), JSON.stringify(v));
    await page.click('#tbAlleLat', { force: true }); await wacht(300);
    check('… klikken opent niets', !(await paneelOpen(page)));
    await page.evaluate(() => toebehorenLatKiezer('std')); await wacht(300);
    check('… ook niet als de functie toch aangeroepen wordt', !(await paneelOpen(page)));
    t = await tbTekst(page);
    check('op slot: de regel zegt waarom ("Besteld: latzijde, glaslat en onderlat staan vast")', /Besteld: latzijde, glaslat en onderlat staan vast/.test(t), t.slice(0, 400));
    await ctx.close();
    // Het slot gaat erop terwijl de kiezer open staat (bestelling op een ander apparaat).
    gevelProject(GEVEL124);
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page);
    await page.click('.tb-inst-kop'); await wacht(300);
    await page.click('#tbStdLat'); await wacht(300);
    await page.evaluate(() => { projectInfo.status = 'besteld'; });   // zonder opnieuw tekenen
    await page.click('.tb-lk-optie[data-waarde="B13"]'); await wacht(500);
    const ml = (await meldingen(page)).join(' ');
    check('slot terwijl de kiezer open stond: de standaardlat blijft A4, met een melding', (await page.evaluate(() => GlasLatten.project().lat)) === 'A4' &&
      !(info().toebehoren || {}).standaardLat && /besteld/i.test(ml), ml.slice(0, 200));
    await sluitMeldingen(page);
    check('… en de knop staat nu uit', (await knopTekst(page, '#tbStdLat')).dis);
    await page.evaluate(() => { projectInfo.status = 'bezig met inmeten/verwerken'; renderToebehoren(); }); await wacht(300);
    await page.click('#tbAlleLat'); await wacht(300);
    await page.evaluate(() => { projectInfo.status = 'besteld'; });
    await page.click('.tb-lk-optie[data-waarde="A12"]'); await wacht(400);
    check('… ook in Alle ruiten: de keuze gaat niet door', (await knopTekst(page, '#tbAlleLat')).value === '-' && !(await paneelOpen(page)));
    await sluitMeldingen(page);
    // Het scherm tekent opnieuw (op slot) terwijl de kiezer open is: hij gaat dicht.
    await page.evaluate(() => { projectInfo.status = 'bezig met inmeten/verwerken'; renderToebehoren(); }); await wacht(300);
    await page.click('#tbAlleLat'); await wacht(300);
    await page.evaluate(() => { projectInfo.status = 'besteld'; renderToebehoren(); }); await wacht(300);
    check('op slot opnieuw getekend: de open kiezer gaat dicht', !(await paneelOpen(page)));
    await page.evaluate(() => { projectInfo.status = 'bezig met inmeten/verwerken'; renderToebehoren(); }); await wacht(300);
    // Alleen kijken (een collega bewerkt het project).
    await page.evaluate(() => { window._echtKijken = window.glasAlleenKijken; window.glasAlleenKijken = () => true; renderToebehoren(); }); await wacht(300);
    v = [await knopTekst(page, '#tbAlleLat'), await knopTekst(page, '#tbStdLat')];
    check('alleen kijken: de knoppen staan uit', v.every(x => x.dis), JSON.stringify(v));
    await page.evaluate(() => toebehorenLatKiezer('alle')); await wacht(300);
    check('… en de kiezer gaat niet open', !(await paneelOpen(page)));
    await sluitMeldingen(page);
    await page.evaluate(() => { window.glasAlleenKijken = window._echtKijken; renderToebehoren(); }); await wacht(300);
    check('weer bewerken: de knop staat aan', !(await knopTekst(page, '#tbAlleLat')).dis);
    await ctx.close();
  }

  /* ══ 6: de opbouw van het tabblad (B) ═════════════════════════════ */
  if (doe('6')) {
    console.log('\n6. Toebehoren in drie stappen: opbouw, uitleg, alles nog bereikbaar, getallen gelijk');
    gevelProject(p => { GEVEL124(p); p.data.info.toebehoren.perRuit[5] = { latZijde: 'beide', sponningDiepte: 60 }; });
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page);
    m = await page.evaluate(() => {
      const w = document.getElementById('toebehorenInhoud');
      const kids = [...w.children].map(k => k.id || k.className.split(' ')[0] || k.tagName);
      const stap = n => document.getElementById('tbStap' + n);
      const voor = (a, b) => !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
      return { kids, koppen: [1, 2, 3].map(n => stap(n) && stap(n).querySelector('.tb-stap-kop').innerText.replace(/\s+/g, ' ').trim()),
        alleIn1: !!(stap(1) && stap(1).querySelector('.tb-alles-blok')), instIn1: !!(stap(1) && stap(1).querySelector('.tb-inst-kop')),
        tabellenIn2: stap(2) ? stap(2).querySelectorAll('section.tb-groep').length : 0, totalenIn3: stap(3) ? stap(3).querySelectorAll('.tb-blok').length : 0,
        letopBoven: voor(w.querySelector('.tb-letop'), stap(1)), letop: [...w.querySelectorAll('.tb-letop .tb-strook')].length,
        volgorde: voor(stap(1), stap(2)) && voor(stap(2), stap(3)), hulpDicht: !!(w.querySelector('details.tb-hulp') && !w.querySelector('details.tb-hulp').open) };
    });
    check('drie stappen in volgorde: 1 Voor het hele project, 2 Per ruit, 3 Wat bestellen en zagen', m.volgorde &&
      JSON.stringify(m.koppen) === JSON.stringify(['1 Stap 1: Voor het hele project', '2 Stap 2: Per ruit: latten kiezen', '3 Stap 3: Wat bestellen en zagen']), JSON.stringify(m));
    check('stap 1: Alle ruiten tegelijk en de instellingen; stap 2: de tabellen per foto; stap 3: de totalen', m.alleIn1 && m.instIn1 && m.tabellenIn2 === 2 && m.totalenIn3 === 5, JSON.stringify(m));
    check('bovenaan wat er nog te regelen is (vóór stap 1)', m.letopBoven && m.letop >= 3, JSON.stringify(m));
    check('de uitleg "Zo werkt dit tabblad" is dicht', m.hulpDicht);
    t = await tbTekst(page);
    check('stap 2 in de knop bovenin: "3 te regelen" (de rustige melding "beide" telt niet mee)', /Per ruit 3 te regelen/.test(t), (t.match(/Per ruit.{0,30}/) || [''])[0]);
    check('stap 3 in de knop bovenin: kort wat er besteld wordt', /Wat bestellen en zagen 10× A4 · 2× N30 · 1 rol band · 5 kokers kit · 1 rol tape/.test(t),
      (t.match(/Wat bestellen en zagen.{0,90}/) || [''])[0]);
    const y0 = await page.evaluate(() => scrollY);
    await page.click('.tb-stappen button:has-text("Wat bestellen")'); await wacht(900);
    // Stap 3 staat onderaan: de pagina schuift tot het eind, dan staat hij helemaal in beeld.
    v = await page.$eval('#tbStap3', s => { const r = s.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight, Math.round(scrollY)]; });
    check('de knop "3" schuift naar stap 3 (en het adres blijft dat van het project)', v[3] > y0 && v[0] >= -2 && (v[0] < 120 || v[1] <= v[2] + 1) && /#project=/.test(page.url()),
      JSON.stringify(v) + ' ' + page.url());
    // De getallen zijn gelijk aan v123 (zelfde project: zie de schermafdruk "voor").
    u = await page.evaluate(() => { const x = toebehorenBerekenen(); return { latten: x.latten.map(l => l.type + ':' + l.staven + ':' + l.totaalMm), band: x.band.map(b => b.kleur + b.dikte + ':' + b.meters.toFixed(3) + ':' + b.rollen),
      kit: x.kit.map(c => c.kleur + ':' + Math.round(c.ml) + ':' + c.kokers), tape: x.tape.meters.toFixed(3) + ':' + x.tape.rollen }; });
    check('de uitkomst is gelijk aan v123 (A4 10, N30 2, band 82,8 m 1 rol, kit 5 kokers, tape 11,1 m 1 rol)',
      /^A4:10:/.test(u.latten[0]) && /^N30:2:/.test(u.latten[1]) && /^wit3:82\.\d+:1$/.test(u.band[0]) && /^wit:\d+:5$/.test(u.kit[0]) && /^11\.\d+:1$/.test(u.tape), JSON.stringify(u));
    m = await page.$$eval('#tbStap3 .tb-getal', l => l.map(x => x.textContent));
    check('… en de grote getallen in stap 3 ook', JSON.stringify(m) === JSON.stringify(['10 × 4,0 m', '2 × 4,0 m', '82,8 m', '5 kokers', '11,1 m']), JSON.stringify(m));
    // Rekenregels: standaard dicht, met de knop open, en onthouden op dit apparaat.
    m = await page.$$eval('#tbStap3 .tb-blok > .tb-reken', l => l.filter(x => x.offsetParent !== null).length);
    check('de rekenregels staan eerst dicht (rustiger)', m === 0, m);
    await page.click('#tbStap3 button:has-text("Rekenregels tonen")'); await wacht(300);
    t = await tbTekst(page);
    check('"Rekenregels tonen": ze staan er, narekenbaar (bijv. "… ÷ 290 ml per koker → 5 kokers")', /÷ 290 ml per koker → 5 kokers/.test(t) &&
      /zaagplan 9 lengtes van 4,0 m \+ 1 reserve = 10 lengtes/.test(t) && /Rekenregels verbergen/.test(t), (t.match(/m voeg.{0,80}/) || [''])[0]);
    // Uitleg openen.
    await page.click('details.tb-hulp > summary'); await wacht(300);
    t = await page.$eval('details.tb-hulp', d => d.innerText.replace(/\s+/g, ' '));
    check('"Zo werkt dit tabblad": de drie stappen en de woorden (latzijde, sponning diepte, pakket, onderlat, std, oordeel)',
      /Voor het hele project/.test(t) && /Per ruit/.test(t) && /Wat bestellen en zagen/.test(t) && ['Latzijde', 'Sponning diepte', 'Pakket', 'Onderlat', 'std', 'Oordeel'].every(w => t.indexOf(w) >= 0), t.slice(0, 300));
    await kruis(page, 'details.tb-hulp[open]', 'uitleg Toebehoren', async () => !(await page.$eval('details.tb-hulp', d => d.open)));
    await page.click('details.tb-hulp > summary'); await wacht(300);
    await page.reload(); await page.waitForFunction(() => window.glasProjectId, null, { timeout: 15000 }); await wacht(700);
    await naarToebehoren(page);
    m = await page.evaluate(() => [document.querySelector('details.tb-hulp').open, [...document.querySelectorAll('#tbStap3 .tb-blok > .tb-reken')].filter(x => x.offsetParent !== null).length]);
    check('na herladen: uitleg open en rekenregels aan (onthouden op dit apparaat)', m[0] === true && m[1] === 5, JSON.stringify(m));
    // Alles van vroeger is nog te vinden.
    m = await page.evaluate(() => {
      const zicht = s => { const e = document.querySelector(s); return !!(e && e.offsetParent !== null); };
      const id = rijen.find(r => r.merk === 'A').id;
      return ['#tbAlleZijde', '#tbAlleLat', '#tbAlleOnderlat', '.tb-alles button.btn-secondary', '.tb-inst-kop', '.tb-groep-zijde select', '.tb-kies-groep',
        '[data-sleutel="kies-' + id + '"]', '[data-sleutel="type-' + id + '"]', '[data-sleutel="opb-' + id + '"]', '[data-sleutel="diepte-' + id + '"]',
        '[data-sleutel="onder-' + id + '"]', '[data-sleutel="zijde-' + id + '"]', '[data-sleutel="lat-' + id + '"]', '[data-sleutel="olat-' + id + '"]',
        '[data-sleutel="band-' + id + '"]', '[data-sleutel="bandb-' + id + '"]', '.tb-tabel .tb-oordeel .pk-chip', 'details.tb-zaag summary', '.tb-beide button',
        '.tb-reken-knop'].filter(s => !zicht(s));
    });
    check('alle bestaande keuzes en knoppen zijn er nog (Alle ruiten, instellingen, per foto, per ruit, oordeel, zaagplan, Begrepen)', !m.length, JSON.stringify(m));
    // De instellingen: met het toetsenbord open en dicht (een echte knop).
    await page.focus('.tb-inst-kop'); await page.keyboard.press('Enter'); await wacht(300);
    m = await page.evaluate(() => [!!document.querySelector('.tb-instellingen-open'), document.activeElement && document.activeElement.classList.contains('tb-inst-kop'),
      document.querySelector('.tb-inst-kop').getAttribute('aria-expanded'), document.querySelectorAll('.tb-getallen input').length,
      !!document.querySelector('#tbStdLat'), document.querySelectorAll('.tb-keuzes select').length]);
    check('instellingen met Enter open: focus blijft op de kop, standaardlat, band/kit (4 keuzes) en 12 rekengetallen', m[0] && m[1] && m[2] === 'true' && m[3] === 12 && m[4] && m[5] === 4, JSON.stringify(m));
    await page.keyboard.press('Enter'); await wacht(300);
    check('… en met Enter weer dicht', !(await page.locator('.tb-instellingen-open').count()));
    await afdruk(page, 'opbouw-pc');
    await ctx.close();
    // Telefoon: niets schuift opzij, knoppen 44 px.
    gevelProject(GEVEL124);
    ({ ctx, page } = await apparaat(IPHONE, 'iphone', 1));
    await naarToebehoren(page);
    v = await page.evaluate(() => ({ breed: document.documentElement.scrollWidth, knoppen: [...document.querySelectorAll('.tb-stappen button, .tb-inst-kop, #tbAlleLat, .tb-reken-knop')]
      .map(b => Math.round(b.getBoundingClientRect().height)), blokken: [...document.querySelectorAll('.tb-blok')].map(b => Math.round(b.getBoundingClientRect().width)) }));
    check('iPhone: niets schuift opzij, knoppen minstens 44 px, blokken met totalen volle breedte', v.breed <= 390 && v.knoppen.every(h => h >= 44) && v.blokken.every(w => w > 300),
      JSON.stringify(v));
    await ctx.close();
  }


  /* ══ 7: latzijde "geen (meegeleverd)" en een glaslat voor alle ruiten ══ */
  if (doe('7')) {
    console.log('\n7. Glaslat voor alle ruiten bij latzijde "geen (meegeleverd)" (na een import)');
    // Zoals na een import van een maatstaat: alle ruiten latzijde "geen"; Y binnen (gemengd).
    const GEEN = p => { p.data.info.toebehoren = { perRuit: { 1: { latZijde: 'geen' }, 2: { latZijde: 'binnen', sponningDiepte: 50 }, 3: { latZijde: 'geen' } } }; };
    latProject(GEEN);
    ({ ctx, page } = await apparaat(null, 'pc', 1));
    await naarToebehoren(page);
    const kies = async w => { await page.click('#tbAlleLat'); await page.click('.tb-lk-optie[data-waarde="' + w + '"]'); await wacht(200); };
    await kies('A12');
    await page.click('.tb-alles button:has-text("Toepassen")');
    let vr = await wachtOpMelding(page, /Alle ruiten wijzigen/, 4000);
    check('het venster zegt het: "bij 2 ruiten (X, D) staat de latzijde op ‹geen (meegeleverd)› … de glaslat telt daar niet"',
      vr.ok && /bij 2 ruiten \(X, D\) staat de latzijde op ‹geen \(meegeleverd\)›/.test(vr.tekst) && /glaslat telt daar niet/.test(vr.tekst), vr.tekst.slice(0, 500));
    check('… en biedt aan de latzijde te zetten (binnen / buiten), alleen de lat, of annuleren',
      ['Latzijde binnen en toepassen', 'Latzijde buiten en toepassen', 'Alleen toepassen (telt daar niet)', 'Annuleren'].every(k => vr.tekst.indexOf(k) >= 0), vr.tekst.slice(-200));
    await knop(page, 'Annuleren'); await wacht(300);
    check('Annuleren: niets veranderd', !perRuitDb('X').glaslat && perRuitDb('X').latZijde === 'geen', JSON.stringify(perRuitDb('X')));
    // Alleen de lat: zoals vroeger, maar de melding zegt dat hij niet telt.
    await page.click('.tb-alles button:has-text("Toepassen")');
    await wachtOpMelding(page, /Alle ruiten wijzigen/, 4000);
    await knop(page, 'Alleen toepassen'); await wacht(500);
    await opgeslagenAls(() => perRuitDb('X').glaslat === 'A12');
    t = await kortBer(page);
    check('"Alleen toepassen": de lat staat erop, latzijde blijft geen, en de melding zegt "telt de glaslat niet"',
      perRuitDb('X').glaslat === 'A12' && perRuitDb('X').latZijde === 'geen' && /Toegepast op 3 ruiten\. Bij 2 \(latzijde geen, meegeleverd\) telt de glaslat niet\./.test(t), t);
    await page.click('#kortBericht button:has-text("Terugzetten")'); await wacht(600);
    await opgeslagenAls(() => !perRuitDb('X').glaslat);
    // Latzijde binnen erbij: dan telt de lat.
    await kies('A12');
    await page.click('.tb-alles button:has-text("Toepassen")');
    await wachtOpMelding(page, /Alle ruiten wijzigen/, 4000);
    await knop(page, 'Latzijde binnen en toepassen'); await wacht(500);
    await opgeslagenAls(() => perRuitDb('X').latZijde === 'binnen' && perRuitDb('D').latZijde === 'binnen');
    // A12: X, Y ×2 en D = 4 ruiten × 4 latten (binnen: onderin dezelfde lat) = 16.
    u = await page.evaluate(() => toebehorenBerekenen().latten.map(l => l.type + ':' + l.stukken));
    t = await kortBer(page);
    check('"Latzijde binnen en toepassen": X en D binnen met A12 (database), en de A12 telt mee', ['X', 'Y', 'D'].every(mk => perRuitDb(mk).glaslat === 'A12' &&
      perRuitDb(mk).latZijde === 'binnen') && u.some(x => /^A12:\d+$/.test(x) && +x.split(':')[1] === 16), JSON.stringify([perRuitDb('X'), perRuitDb('D'), u]));
    check('… Y (al binnen, diepte 50) houdt zijn keuzes', perRuitDb('Y').sponningDiepte === 50, JSON.stringify(perRuitDb('Y')));
    check('… de melding zegt "Bij 2 ook latzijde binnen"', /Toegepast op 3 ruiten\. Bij 2 ook latzijde binnen\./.test(t), t);
    t = await tbR(page, 'X').locator('td.tb-lat').innerText();
    check('… in de tabel staat bij X nu "A12" (niet meer "—")', /A12/.test(t), t);
    await page.click('#kortBericht button:has-text("Terugzetten")'); await wacht(600);
    await opgeslagenAls(() => perRuitDb('X').latZijde === 'geen' && !perRuitDb('X').glaslat);
    check('↶ Terugzetten: latzijde weer geen, geen lat', perRuitDb('X').latZijde === 'geen' && !perRuitDb('X').glaslat && perRuitDb('D').latZijde === 'geen', JSON.stringify(perRuitDb('X')));
    // De actiebalk: het voorbeeld zegt het vóór het toepassen.
    await vink(page, 'X'); await vink(page, 'Y');
    await page.click('#tbActiebalk [data-sleutel="balk-lat"]'); await page.click('.tb-lk-optie[data-waarde="B13"]'); await wacht(300);
    t = await balkTekst(page);
    check('actiebalk: "Bij 1 ruit (X) staat de latzijde op ‹geen (meegeleverd)›: daar telt de glaslat niet"',
      /Bij 1 ruit \(X\) staat de latzijde op ‹geen \(meegeleverd\)›: daar telt de glaslat niet/.test(t), t.slice(0, 400));
    await page.selectOption('#tbActiebalk select[data-sleutel="balk-zijde"]', 'buiten'); await wacht(300);
    t = await balkTekst(page);
    check('… met latzijde buiten erbij is die regel weg', !/staat de latzijde op ‹geen/.test(t), t.slice(0, 300));
    await page.click('#tbActiebalk .sluit-x'); await wacht(300);
    await ctx.close();
  }

  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(function (e) { console.log('  FOUT (crash) ' + (e && e.stack || e)); process.exit(1); });
