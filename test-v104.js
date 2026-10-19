/* Testreeks v104 — node test-v104.js   (en: node test-v104.js --mutaties)

   Twee onderwerpen, allebei gevraagd door Jan op 14 oktober 2026.

   A. BESTELLINGEN
   Echte situatie: Julian meet in, maakt op kantoor (Mac) of op de iPad de
   bestellijst-pdf en mailt die zelf naar de leverancier. Daarna kan er van
   alles gebeuren:
   - een ruit wordt nagemeten;
   - een ruit vervalt;
   - iemand maakt de pdf nog eens, om te kijken of om door te sturen.

   Belofte (Jans keuze):
   - Na het maken van de bestellijst-pdf vraagt de app: "Stuur je deze naar
     de leverancier?"
   - **Ja, verstuurd**: de app legt vast wat er besteld is (een bestelling
     erbij, nooit overschrijven), het project gaat direct op 'besteld' en op
     slot.
   - **Nee, alleen bekeken**: er verandert niets. De gele markeringen van
     wat er na de vorige echte bestelling veranderde, blijven staan.
   - De app laat zien wát er anders is, ook ruiten die vervallen zijn, op
     Invoer, op Bestellijst en op de volgende bestellijst-pdf.

   Wat er tot v103 misging: élke bestellijst-pdf gold als bestelling. Een
   pdf om te kijken wiste de markeringen, terwijl de leverancier nog de
   oude lijst had. Een verwijderde ruit stond nergens.

   Wat er halverwege kan gebeuren, en hier getest wordt:
   - het opslaan van de pdf wordt weggeklikt;
   - geen bereik op het moment van "Ja";
   - Cmd+Z of Ctrl+Z na "Ja";
   - een project met een bestelling uit een oudere versie;
   - een oude versie op een ander apparaat (die leest projectInfo.besteld
     nog in de oude vorm).

   B. ANDROID EN WINDOWS
   Jans collega's werken ook op Windows-pc's en Android-telefoons.
   1. Een csv uit de app opent in Excel op Windows zonder rommel (é, ×).
   2. Een csv die Excel op Windows bewaarde (Windows-1252), leest de app
      goed in.
   3. "Adres in kaarten" opent op Android en Windows Google Maps, op
      Apple-apparaten Apple Kaarten.
   4. Een HEIC-foto van een iPhone geeft in Chrome een duidelijke uitleg in
      plaats van "Mislukt".
   5. Ctrl+Y is "opnieuw", zoals overal op Windows.

   Wat deze opstelling aanneemt (TESTEN.md, vraag 5):
   - De database is nagebootst in node, zoals in test-v103.js.
   - "Geen bereik" = elk verzoek geeft de fout van supabase-js.
   - Chromium kan HEIC echt niet lezen; Safari wel. De HEIC-test laat dus
     het echte gedrag van Chrome zien.
   - Een ander systeem wordt nagebootst met een userAgent (Pixel 7 voor
     Android, Windows-Chrome, iPhone). Dat is geen echt toestel.
   - Of Excel het bestand goed opent, kan hier niet. Getest worden de bytes
     die Excel nodig heeft: BOM, CRLF, puntkomma, decimale komma. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  // 1. Elke bestellijst-pdf geldt weer als bestelling (zoals tot v103).
  vraag: ['pdf.js', "            if (uit !== 'afgebroken') return vraagVerstuurd(res.lijst, res.moment);",
                    "            { bestellingVastleggen(res.lijst, 'pdf', res.moment); return; }"],
  // 2. Ja, verstuurd zet de status niet op besteld.
  status: ['index.html', "  if (wasRang < 2) projectInfo.status = 'besteld';", ''],
  // 3. Na ontgrendelen gaat het project bij Ja niet weer op slot.
  slot: ['index.html', '  projectInfo.slot = null;\n  if (window.glasSpoorNotitie) {', '  if (window.glasSpoorNotitie) {'],
  // 4. Een nieuwe bestelling overschrijft de vorige.
  overschrijf: ['index.html', '  vorige.push(nieuw);', '  vorige.length = 0; vorige.push(nieuw);'],
  // 5. Vervallen ruiten worden niet gezien.
  vervallen: ['index.html', '    if (!nu[id]) uit.vervallen.push({ id: id, oud: oud, nr: st.nr[id] });', ''],
  // 6. Niet te zien wát er anders is.
  verschil: ['index.html', "    if (a !== b) uit.push(VELD_NAAM[v]", "    if (false) uit.push(VELD_NAAM[v]"],
  // 7. Weggeklikt opslaan telt toch.
  afgebroken: ['pdf.js', "      if (keuze && keuze.afgebroken) { bezig(''); return 'afgebroken'; }",
                         "      if (keuze && keuze.afgebroken) { bezig(''); return; }"],
  // 8. Ook bij een ongewijzigde lijst vragen (v105: het overzicht krijgt geen momentopname).
  zelfde: ['pdf.js', "      var moment = modus !== 'overzicht' && window.bestelMomentopname ? bestelMomentopname(lijst) : null;",
                     "      var moment = window.bestelMomentopname ? bestelMomentopname(lijst) : null;"],
  // 9. Cmd+Z haalt de bestelling terug weg.
  undo: ['undo.js', "['status', 'besteld', 'bestellingen', 'bestelmail', 'slot', 'opnemer']",
                    "['status', 'besteld', 'bestelmail', 'slot', 'opnemer']"],
  // 10. projectInfo.besteld in de nieuwe vorm: oude apparaten zien alles als gewijzigd.
  oudevorm: ['index.html', 'k[id] = kenmerkVan(st.ruiten[id]);', 'k[id] = st.ruiten[id];'],
  // 11. Geen kolom Wijz. op de volgende bestellijst-pdf.
  pdfwijz: ['pdf.js', "    if (!st || !st.laatste) return '';\n    var oud = st.ruiten[r.id];",
                      "    return '';\n    var oud = st.ruiten[r.id];"],
  // 12. csv zonder BOM (zoals tot v103).
  bom: ['index.html', "new Blob(['\\uFEFF' + csvRows.join", "new Blob(['' + csvRows.join"],
  // 13. csv uit Windows Excel als UTF-8 gelezen (zoals tot v103).
  cp1252: ['import.js', "      return { tekst: vanWindows(b), codering: 'windows-1252' };", "      return met('utf-8');"],
  // 14. Altijd Apple Kaarten (zoals tot v103).
  kaart: ['project.js', '    return isApple() ? ', '    return true ? '],
  // 15. Geen uitleg bij HEIC.
  heic: ['fotos.js', '          if (heic) { heicMelding(); var h = new Error(HEIC_KORT); h.heic = true; fout(h); return; }', ''],
  // 16. Ctrl+Y doet niets (zoals tot v103).
  ctrly: ['undo.js', "(k === 'y' && e.ctrlKey && !e.metaKey && !e.shiftKey)", 'false'],
  // 18. Een andere glasmaat telt niet als wijziging.
  glasmaat: ['index.html', "  if (oud && typeof oud === 'object' && ('glasBreedte' in oud || 'glasHoogte' in oud)) {\n    return maatGetal",
                           "  if (false) {\n    return maatGetal"],
  // 19. Vastleggen met de stand van het antwoord in plaats van de pdf.
  moment: ['pdf.js', "        bestellingVastleggen(lijst, 'pdf', moment);", "        bestellingVastleggen(lijst, 'pdf');"],
  // 20. De app voegt bestellingen van elders niet samen.
  samenvoegen: ['cloud.js', "    if (!data || !data.info || !window.bestellingenSamenvoegen) return false;", "    return false;"],
  // 21. Een bestelde ruit die onvolledig wordt, valt stil van de lijst.
  vanlijst: ['index.html', "    if (typeof oud === 'object' && !bestelbaar(r)) { uit.vanLijst.push({ rij: r, oud: oud, nr: st.nr[r.id] }); return; }", ''],
  // 22. Intrekken zonder wachtwoordcontrole.
  intrekken: ['index.html', "  if (!await glasWachtwoordKlopt(pw)) {\n    await appFout('Dat wachtwoord klopt niet. De bestelling blijft staan.'",
                            "  if (false) {\n    await appFout('Dat wachtwoord klopt niet. De bestelling blijft staan.'"],
  // 23. Het Excel-bestand zet alles als tekst neer zoals een csv (datums!).
  xlsx: ['index.html', "    const ws = XLSX.utils.aoa_to_sheet([t.koppen].concat(t.regels));",
                       "    const ws = XLSX.utils.aoa_to_sheet([t.koppen].concat(t.regels).map(r => r.map(String)));"],
  // 24. HEIC alleen aan naam en type herkennen.
  heicbytes: ['fotos.js', "        Promise.resolve(isHeic(file) || heicVanBinnen(file)).then(function (heic) {",
                          "        Promise.resolve(isHeic(file)).then(function (heic) {"],
  // 25. Geen MacRoman.
  macroman: ['import.js', "      if (lijktMacRoman(b)) {", "      if (false) {"],
  // 27. Na Ctrl+Z vanaf een vakje is Ctrl+Y verdwenen.
  undofocus: ['undo.js', "wiste het opnieuw-doen (gevonden bij v104).\n    bijBetreden = null;",
                         "wiste het opnieuw-doen (gevonden bij v104)."],
  // 28. Na offline zonder script 23 niet eerst de server lezen.
  voorlezen: ['cloud.js', "    if (naOffline) { voorlezenEnVersturen(); return; }", ''],
  // 29. Het opslagvenster krijgt de naam van de 1e lijst.
  opslagnaam: ['pdf.js', "        var bestandB = bestandVragen(bestellijstNaam(project, datum));",
                         "        var bestandB = bestandVragen(maakNaam('Bestellijst', project, datum));"],
  // 30. Een aanraaklaptop als tablet behandeld (zoals tot v103).
  mobiel: ['index.html', "  const aanraak = glasMobiel();", "  const aanraak = (navigator.maxTouchPoints || 0) > 1;"],
  // 31. Ingekorte bestelling: onbekende velden als "(leeg)".
  kort: ['index.html', "  const velden = oud.kort ? KENMERK_VELDEN.filter(v => KORT_VELDEN.indexOf(v) >= 0) : KENMERK_VELDEN;",
                       "  const velden = KENMERK_VELDEN;"],
  // 32. Geen waarschuwing als script 23 ontbreekt.
  script23: ['start.js', "      if (ja === false) { zonder23 = true; toon(gebruik); }", ''],
  // 33. Tijdstip van een achterlopende klok gewoon overnemen.
  klokop: ['index.html', "    if (!isNaN(t.getTime()) && t >= op) op = new Date(t.getTime() + 1);", ''],
  // 34. Bij een ingekorte vergelijking overige wijzigingen verzwijgen.
  overige: ['index.html', "    if (ruitKenmerk(terug) !== oud.k) {", "    if (false) {"],
  // 26. Ctrl+Z onder een open venster door.
  undovenster: ['undo.js', "      if (window.appMeldingBezig && appMeldingBezig()) return;", ''],
  // 17. Een formule in een merk gaat ongemoeid naar Excel.
  formule: ['index.html', '    if (/^[=+@\\t\\r]/.test(t) || /^-(?!\\d+([.,]\\d+)?$)/.test(t)) t = "\'" + t;', '']
};

if (process.argv.indexOf('--mutaties') >= 0) {
  let goed = 0;
  Object.keys(MUTATIES).forEach(function (naam) {
    const r = spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { MUTATIE: naam }),
                                                         encoding: 'utf8', timeout: 600000 });
    const uit = (r.stdout || '') + (r.stderr || '');
    const rood = r.status !== 0;
    const regels = uit.split('\n').filter(l => /^\s+FOUT /.test(l)).map(l => l.trim());
    console.log((rood ? '  ok   ' : '  FOUT ') + 'mutatie ' + naam + (rood ? ' wordt gevangen: ' : ' wordt NIET gevangen') +
                (regels[0] ? regels[0].slice(0, 110) : (/mutatie past niet/.test(uit) ? '(past niet!)' : '')));
    if (rood && !/mutatie past niet/.test(uit)) goed++;
  });
  const n = Object.keys(MUTATIES).length;
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
const IK = { id: 'u1', email: 'julian@jelierbouw.nl' };
const WACHTWOORD = { 'julian@jelierbouw.nl': 'geheim' };
const P = n => '00000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');
const GEEN_BEREIK = { message: 'TypeError: Failed to fetch', code: '', details: '', hint: '' };

const S = {};
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
  S.nieuwId = 0; S.weg = {}; S.zonderTrigger = false;
}
resetDb();
const bewaarB = () => JSON.stringify(S.db.projecten.find(p => p.id === P(2)).data);

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
    geraakt.forEach(r => {
      const oud = JSON.parse(JSON.stringify(r));
      Object.assign(r, JSON.parse(JSON.stringify(st.velden)), { updated_at: new Date().toISOString() });
      if (st.tabel === 'projecten' && st.velden.data && !S.zonderTrigger) triggerBestellingen(oud, r);
    });
    if (st.terug && st.kols && /bestellingen:data->info->bestellingen/.test(st.kols)) {
      return { data: geraakt.map(r => ({ id: r.id, status: r.status,
        bestellingen: JSON.parse(JSON.stringify(((r.data || {}).info || {}).bestellingen || null)) })), error: null };
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
  if (v.actie === 'list') return { data: [], error: null };
  if (v.actie === 'remove') { (v.paden || []).forEach(p => S.opslag.delete(p)); return { data: [], error: null }; }
  if (v.actie === 'link') return { data: null, error: { statusCode: '404', message: 'Object not found' } };
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
    channel: function () { var k = { state: 'joined' }; k.on = function () { return k; };
      k.subscribe = function (cb) { if (cb) cb('SUBSCRIBED'); return k; }; return k; },
    removeChannel: function () {},
    storage: { from: function () { return {
      upload: function (pad, blob, o) {
        return b64(blob).then(function (n) {
          return opslag({ actie: 'upload', pad: pad, grootte: n, type: (o && o.contentType) || blob.type });
        });
      },
      list: function (p) { return opslag({ actie: 'list', pad: p }); },
      remove: function (paden) { return opslag({ actie: 'remove', paden: paden }); },
      createSignedUrl: function (pad) { return opslag({ actie: 'link', pad: pad }); }
    }; } }
  }; } };
})();`;

/* ─── de app serveren ─────────────────────────────────────────── */
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v104-'));
fs.readdirSync('.').forEach(function (naam) {
  if (fs.statSync(naam).isDirectory()) return;
  fs.copyFileSync(naam, path.join(map, naam));
});
fs.cpSync('lib', path.join(map, 'lib'), { recursive: true });
fs.writeFileSync(path.join(map, 'config.js'),
  'window.GLASOPNAME_CONFIG = { url: "https://test.supabase.co", anonKey: "sb_publishable_test" };\n');
if (process.env.MUTATIE) {
  const m = MUTATIES[process.env.MUTATIE];
  if (!m) { console.log('onbekende mutatie'); process.exit(2); }
  const doel = path.join(map, m[0]);
  const tekst = fs.readFileSync(doel, 'utf8');
  if (tekst.indexOf(m[1]) < 0) { console.log('mutatie past niet: ' + process.env.MUTATIE); process.exit(3); }
  fs.writeFileSync(doel, tekst.replace(m[1], m[2]));
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
async function nieuweContext(opties, apparaat) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block', acceptDownloads: true }, opties || {}));
  await ctx.exposeFunction('__db', s => JSON.stringify(apparaat && S.weg && S.weg[apparaat]
    ? { data: null, error: GEEN_BEREIK } : dbVraag(JSON.parse(s))));
  await ctx.exposeFunction('__rpc', s => JSON.stringify(rpcVraag(JSON.parse(s))));
  await ctx.exposeFunction('__opslag', s => JSON.stringify(opslagVraag(JSON.parse(s))));
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
function bestelProject() {
  resetDb();
  const p = rijVan(1);
  p.data.rijen = [ruit(1, 'K1', '1200', '600', KOMPLEET), ruit(2, 'K2', '800', '1400', KOMPLEET),
                  ruit(3, 'K3', '900', '900', KOMPLEET)];
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
const STANDAARD_ANTWOORDEN = { 'Laten annuleren?': 'Ja, laten annuleren' };
let gevraagd = [];
async function bestellijstPdf(page, antwoorden) {
  const a = Object.assign({}, STANDAARD_ANTWOORDEN, antwoorden || {});
  gevraagd = [];
  await page.click('button:has-text("⬇ Exporteren")');
  let klaar = null;
  const dl = page.waitForEvent('download', { timeout: 20000 }).then(d => { klaar = d; }, () => { klaar = false; });
  await page.click('button:has-text("Bestellijst als PDF")');
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
      (await meldingen(page)).join(' | ').slice(0, 120));
    return null;
  }
  laatsteNaam = klaar.suggestedFilename();
  const doel = path.join(pdfMap, 'best-' + (++pdfTeller) + '.pdf');
  await klaar.saveAs(doel);
  return doel;
}
let pdfTeller = 0;
let laatsteNaam = '';
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v104-pdf-'));
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

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* ══ 1 ════════════════════════════════════════════════════════ */
  console.log('\n1. Bestellijst-pdf alleen bekijken: er verandert niets');
  bestelProject();
  let ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  let page = await nieuwePagina(ctx);
  await open(page, 1);
  let pdf1 = await bestellijstPdf(page);
  let m = await vraagOpScherm(page);
  check('na het opslaan van de pdf komt de vraag', m.ok, m.tekst.slice(0, 120));
  check('met de knoppen "Ja, verstuurd" en "Nee, alleen bekeken"',
    /Ja, verstuurd/.test(m.tekst) && /Nee, alleen bekeken/.test(m.tekst));
  await knop(page, 'Nee, alleen bekeken');
  await wacht(800);
  check('geen bestelling vastgelegd', !(await page.evaluate(() => (projectInfo.bestellingen || []).length)) &&
    !(await page.evaluate(() => projectInfo.besteld)));
  check('status niet op besteld, niet op slot', await page.evaluate(() => projectInfo.status) !== 'besteld' &&
    !(await opSlot(page)));
  check('de pdf zelf is gewoon gemaakt', fs.statSync(pdf1).size > 5000, String(fs.statSync(pdf1).size));
  check('op Bestellijst: "Nog niets besteld"', /Nog niets besteld/.test(await bestelTekst(page)));

  /* ══ 2 ════════════════════════════════════════════════════════ */
  console.log('\n2. Ja, verstuurd: vastgelegd, besteld en op slot');
  await bestellijstPdf(page);
  m = await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 1 && rijVan(1).status === 'besteld', 10000);
  const b1 = (info().bestellingen || [])[0] || {};
  check('in de database: 1 bestelling, met 3 posities', (info().bestellingen || []).length === 1 && b1.aantal === 3,
    JSON.stringify(info().bestellingen || []).slice(0, 120));
  check('per ruit de inhoud, niet alleen een kenmerk', b1.ruiten && b1.ruiten[1] && b1.ruiten[1].breedte === '1200' &&
    b1.ruiten[1].opLijst === true && typeof b1.ruiten[1].k === 'string');
  check('status in de database: besteld', rijVan(1).status === 'besteld' && info().status === 'besteld',
    rijVan(1).status + ' / ' + info().status);
  check('het project staat op slot', await opSlot(page));
  check('oude apparaten lezen projectInfo.besteld in de oude vorm (kenmerk per ruit)',
    info().besteld && typeof info().besteld.ruiten[1] === 'string' && info().besteld.op === b1.op);
  check('het logboek zegt het (samenvatting bij de opslag)',
    /1e bestellijst verstuurd naar de leverancier, 3 posities; status op "besteld"/.test(rijVan(1).samenvatting || ''),
    rijVan(1).samenvatting);
  check('op Bestellijst: "1e bestellijst" en niets gewijzigd',
    /1e bestellijst/.test(await bestelTekst(page)) && /niets gewijzigd/.test(await bestelTekst(page)));

  /* ══ 3 ════════════════════════════════════════════════════════ */
  console.log('\n3. Na ontgrendelen: wat anders is, zie je, ook wat vervallen is');
  await ontgrendel(page);
  check('ontgrendeld', !(await opSlot(page)));
  await page.locator('#invoerBody input.breedte-input').first().fill('1210');
  await wacht(400);
  await page.locator('#invoerBody button.btn-del').nth(1).click();     // K2 weg
  await wacht(600);
  const rij1 = await page.$eval('#invoerBody td.rijnr', e => ({ geel: e.classList.contains('na-bestelling'), titel: e.title }));
  check('K1 is geel gemarkeerd', rij1.geel);
  check('en zegt wat er anders is: breedte 1200 → 1210', /breedte 1200 → 1210/.test(rij1.titel), rij1.titel.slice(0, 120));
  const balk = await page.$eval('#bestelVerschil', e => ({ zicht: !e.hidden, tekst: e.innerText }));
  check('op Invoer: "Anders dan besteld", 1 gewijzigd, 1 vervallen', balk.zicht && /1 gewijzigd/.test(balk.tekst) &&
    /1 vervallen/.test(balk.tekst), balk.tekst.slice(0, 120));
  let bt = await bestelTekst(page);
  check('op Bestellijst: K1 gewijzigd met de oude en nieuwe maat', /K1: breedte 1200 → 1210/.test(bt), bt.slice(0, 300));
  check('op Bestellijst: K2 vervallen, met zijn maat', /Vervallen \(1\)/.test(bt) && /K2 glasmaat 792 × 1392/.test(bt) &&
    /besteld, nu verwijderd/.test(bt), bt.slice(0, 400));
  await page.click('#bestelVerschil button:has-text("Bekijk op Bestellijst")');
  await wacht(300);
  check('de knop op Invoer springt naar Bestellijst (echte klik)',
    await page.$eval('#panel-bestellijst', e => getComputedStyle(e).display !== 'none').catch(() => false));
  await page.click('.tab-btn:has-text("Invoer")');

  /* ══ 4 ════════════════════════════════════════════════════════ */
  console.log('\n4. Nog een pdf om te kijken: de markeringen blijven (de fout tot v103)');
  const pdf4 = await bestellijstPdf(page);
  m = await vraagOpScherm(page);
  check('de vraag noemt dat dit de 2e bestellijst wordt, een aanvulling (v105)', /2e bestellijst, een aanvulling/.test(m.tekst),
    m.tekst.slice(0, 300));
  await knop(page, 'Nee, alleen bekeken');
  await wacht(600);
  check('nog steeds 1 bestelling', await page.evaluate(() => projectInfo.bestellingen.length) === 1);
  check('K1 nog steeds geel', await page.$eval('#invoerBody td.rijnr', e => e.classList.contains('na-bestelling')));
  check('en K2 nog steeds als vervallen gemeld', /1 vervallen/.test(await page.$eval('#bestelVerschil', e => e.innerText)));
  const t4 = pdfTekst(pdf4);
  // v105 (keuze van Jan): een aanvulling. Alleen K1 staat erop, als
  // vervanging van de bestelde K1; K2 staat eronder bij ANNULEREN.
  const t4s = t4.replace(/\s+/g, ' ');
  check('de pdf heeft de kolom "Wijz." met "VERVANGT K1 uit de 1e (1x 1192 x 592)" bij K1',
    /Wijz\./.test(t4) && /K1 VERVANGT K1 uit de 1e \(1x 1192 x 592\)/.test(t4s), (t4s.match(/K1 VERV.{0,60}/) || [t4s.slice(0, 200)])[0]);
  check('alleen K1 staat in de tabel (K3 is ongewijzigd en blijft zoals besteld)', !/K3 /.test(t4s), t4s.slice(0, 300));
  check('en noemt K2 in de tabel ANNULEREN', /ANNULEREN, als dat nog kan Merk .{0,80}K2 1 792 1392 HR\+\+ glas 4-15-4 1e vervalt/.test(t4s),
    (t4s.match(/ANNULEREN.{0,160}/) || [''])[0]);

  /* ══ 5 ════════════════════════════════════════════════════════ */
  console.log('\n5. Ja, verstuurd voor de 2e: erbij, niet erover, en weer op slot');
  await bestellijstPdf(page);
  m = await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
  const bl = info().bestellingen || [];
  check('in de database: 2 bestellingen', bl.length === 2, String(bl.length));
  check('de 1e is onveranderd (K1 nog 1200, K2 er nog in)', bl[0] && bl[0].ruiten[1].breedte === '1200' && !!bl[0].ruiten[2]);
  check('de 2e is een aanvulling: alleen K1 (1210, vervangt de 1e), en K2 geannuleerd (v105)',
    bl[1] && bl[1].soort === 'aanvulling' && bl[1].nr === 2 && JSON.stringify(Object.keys(bl[1].ruiten)) === '["1"]' &&
    bl[1].ruiten[1].breedte === '1210' && bl[1].ruiten[1].vervangt === 1 && !!(bl[1].vervallen || {})[2],
    JSON.stringify(bl[1] || {}).slice(0, 200));
  check('oude apparaten: besteld = K1 (nieuw) en K3 (uit de 1e), geen K2',
    !!info().besteld && Object.keys(info().besteld.ruiten).sort().join() === '1,3' &&
    info().besteld.ruiten[1] === bl[1].ruiten[1].k, JSON.stringify(info().besteld || {}).slice(0, 160));
  check('weer op slot (ook al was hij ontgrendeld)', await opSlot(page) && !info().slot);
  check('geen gele markering meer: alles klopt met de 2e', !(await page.$eval('#invoerBody td.rijnr', e => e.classList.contains('na-bestelling'))) &&
    await page.$eval('#bestelVerschil', e => e.hidden));
  bt = await bestelTekst(page);
  check('op Bestellijst staan beide bestellingen', /1e bestellijst/.test(bt) && /2e bestellijst \(aanvulling\)/.test(bt), bt.slice(0, 200));
  check('en hoeveel de leverancier in totaal maakt: 2 ruiten', /in totaal 2 ruiten/.test(bt), bt.slice(0, 300));

  /* ══ 6 ════════════════════════════════════════════════════════ */
  console.log('\n6. Een besteld project opnieuw als pdf: geen vraag');
  await bestellijstPdf(page);
  m = await vraagOpScherm(page);
  check('geen vraag (er is niets anders dan wat al verstuurd is)', !m.ok, m.tekst.slice(0, 80));
  check('de pdf heet Overzicht_besteld_… (geen nieuwe bestelling, v105)', /^Overzicht_besteld_Kerkstraat_1\.pdf$/.test(laatsteNaam), laatsteNaam);
  check('nog steeds 2 bestellingen', await page.evaluate(() => projectInfo.bestellingen.length) === 2);

  /* ══ 7 ════════════════════════════════════════════════════════ */
  console.log('\n7. Cmd+Z of Ctrl+Z: niet onder de vraag door, en de bestelling blijft');
  // Een stap van vóór "Ja" terugdraaien: de momentopname van die stap kent
  // de 3e bestelling nog niet. Die mag niet mee terug.
  await ontgrendel(page);
  await page.evaluate(() => { bewaarStap('test'); rijen[0].opmerking = 'stap'; renderTabel(); herbereken(); opslaan(); });
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await bestellijstPdf(page);
  m = await vraagOpScherm(page);
  await page.keyboard.press('Control+z');
  await wacht(400);
  check('Ctrl+Z terwijl de vraag openstaat doet niets', await page.evaluate(() => rijen[0].opmerking) === 'stap');
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 3, 10000);
  await ontgrendel(page);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Control+z');
  await wacht(500);
  check('daarna ongedaan gemaakt (de stap van vóór de bestelling)', await page.evaluate(() => rijen[0].opmerking) !== 'stap');
  check('de 3 bestellingen staan er nog', await page.evaluate(() => projectInfo.bestellingen.length) === 3);
  await ctx.close();

  /* ══ 8 ════════════════════════════════════════════════════════ */
  console.log('\n8. Weggeklikt opslaan: geen vraag, niets vastgelegd');
  // Echte situatie: Chrome of Edge op een Windows-pc of Mac vraagt waar de
  // pdf heen moet, en Jan klikt op Annuleren.
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => {
    window.showSaveFilePicker = function () { const e = new Error('The user aborted a request.'); e.name = 'AbortError'; return Promise.reject(e); };
  });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await page.click('button:has-text("⬇ Exporteren")');
  await page.click('button:has-text("Bestellijst als PDF")');
  m = await vraagOpScherm(page);
  check('geen vraag na annuleren', !m.ok, m.tekst.slice(0, 80));
  check('niets vastgelegd', !(await page.evaluate(() => projectInfo.bestellingen)));
  await ctx.close();

  /* ══ 9 ════════════════════════════════════════════════════════ */
  console.log('\n9. "Ja" zonder bereik: staat op het apparaat en gaat later omhoog');
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  S.offline = true;
  await bestellijstPdf(page);
  m = await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wacht(1500);
  check('op het apparaat vastgelegd, met de vlag "moet nog omhoog"',
    await ls(page, 'glasopname_pending') === '1' && /"bestellingen"/.test(await ls(page, 'glasopname_v2')));
  check('en op slot', await opSlot(page));
  S.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await wachtTot(() => (info().bestellingen || []).length === 1 && rijVan(1).status === 'besteld', 15000);
  check('zodra er bereik is: in de database, status besteld', (info().bestellingen || []).length === 1 && rijVan(1).status === 'besteld');
  await ctx.close();

  /* ══ 10 ═══════════════════════════════════════════════════════ */
  console.log('\n10. Een project met een bestelling uit een oudere versie');
  // Echte situatie: een project waarvan in v103 al een bestellijst-pdf is
  // gemaakt. Daar staat alleen projectInfo.besteld met een kenmerk per ruit.
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  const oud = await page.evaluate(() => {
    const r = {}; rijen.forEach(x => { r[x.id] = ruitKenmerk(x); });
    return { op: '2026-10-01T08:00:00Z', door: 'julian', aantal: 3, ruiten: r };
  });
  rijVan(1).data.info.besteld = oud;
  await open(page, 1);
  bt = await bestelTekst(page);
  check('telt als 1e bestellijst, "vastgelegd vóór v104"', /1e bestellijst/.test(bt) && /vóór v104/.test(bt), bt.slice(0, 200));
  await page.locator('#invoerBody input.hoogte-input').first().fill('610');
  await wacht(400);
  bt = await bestelTekst(page);
  check('een wijziging wordt herkend, met de eerlijke zin dat de details niet bewaard zijn',
    /K1: gewijzigd \(wat precies is van vóór v104 niet bewaard\)/.test(bt), bt.slice(0, 300));
  // v103 bewaarde ook de lege regels; die horen niet als 'vervallen' te tellen.
  check('de bestelling van vóór v104 bevatte ook lege regels', await page.evaluate(o =>
    Object.keys(o.ruiten).length > rijen.filter(r => r.merk).length, oud));
  await page.evaluate(() => { rijen = rijen.filter(r => r.merk); renderTabel(); });
  bt = await bestelTekst(page);
  check('lege regels die weggaan, tellen niet als vervallen', !/Vervallen/.test(bt), bt.slice(0, 300));
  await page.evaluate(() => { rijen = rijen.filter(r => r.merk !== 'K3'); renderTabel(); });
  bt = await bestelTekst(page);
  check('een echte ruit die weggaat wél, eerlijk gezegd', /Vervallen \(1\)/.test(bt) && /wat het was, is niet bewaard/.test(bt),
    bt.slice(0, 400));
  await bestellijstPdf(page);
  m = await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
  check('na "Ja": de oude bestelling blijft als 1e, de nieuwe is de 2e',
    (info().bestellingen || []).length === 2 && info().bestellingen[0].via === 'oud' && info().bestellingen[1].nr === 2,
    JSON.stringify((info().bestellingen || []).map(b => b.nr + ':' + b.via)));
  await ctx.close();

  /* ══ 11 ═══════════════════════════════════════════════════════ */
  console.log('\n11. CSV voor Excel op Windows');
  bestelProject();
  rijVan(1).naam = 'Kerk/straat: 1'; rijVan(1).data.project = 'Kerk/straat: 1';
  rijVan(1).data.rijen[0].opmerking = 'glas × 2, één zijde mat';
  rijVan(1).data.rijen[1].merk = '=SOM(A1)';
  rijVan(1).data.rijen[2].merk = '1.10';
  rijVan(1).data.rijen[2].opmerking = '- onderste ruit mat';
  rijVan(1).data.rijen[1].opbouw = '4-12-4';
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await page.click('button:has-text("⬇ Exporteren")');
  const dlc = page.waitForEvent('download', { timeout: 15000 });
  await page.click('button:has-text("CSV-bestand")');
  const csvD = await dlc;
  const csvPad = path.join(pdfMap, 'export.csv');
  await csvD.saveAs(csvPad);
  const bytes = fs.readFileSync(csvPad);
  const tekst = bytes.toString('utf8');
  check('begint met een BOM (EF BB BF), zodat Excel het als UTF-8 leest',
    bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF, bytes.slice(0, 4).toString('hex'));
  check('regels eindigen op CRLF', /\r\n/.test(tekst) && !/[^\r]\n/.test(tekst));
  check('puntkomma als scheiding', tekst.split('\r\n')[0].split(';').length > 10);
  check('é en × staan er goed in', /één zijde mat/.test(tekst) && /×/.test(tekst));
  check('een merk dat met = begint, wordt geen formule', /"'=SOM\(A1\)"/.test(tekst), (tekst.match(/"[^"]*SOM[^"]*"/) || [''])[0]);
  check('een merk als 1.10 blijft 1.10 (geen 1,10)', /"1\.10"/.test(tekst));
  check('getallen met een komma (gewicht)', /"\d+,\d"/.test(tekst), (tekst.split('\r\n')[1] || '').slice(0, 160));
  check('bestandsnaam zonder / en : (Windows)', !/[\/:]/.test(csvD.suggestedFilename()), csvD.suggestedFilename());
  check('een opmerking die met - begint, wordt geen formule (#NAAM?)', /"'- onderste ruit mat"/.test(tekst));

  // Het Excel-bestand: in een csv maakt Excel van 4-12-4 een datum. In een
  // .xlsx heeft elke cel een vast soort. Teruglezen met SheetJS (dezelfde
  // bibliotheek die Excel-bestanden ook voor de import leest).
  await page.click('button:has-text("⬇ Exporteren")');
  const dlx = page.waitForEvent('download', { timeout: 15000 });
  await page.click('button:has-text("Excel-bestand (.xlsx)")');
  const xD = await dlx;
  const xPad = path.join(pdfMap, 'export.xlsx');
  await xD.saveAs(xPad);
  const XLSX = require(path.resolve('lib/xlsx-0.18.5/xlsx.full.min.js'));
  const wb = XLSX.read(fs.readFileSync(xPad), { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const cel = (r, c) => ws[XLSX.utils.encode_cell({ r: r, c: c })] || {};
  const kop = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(c => cel(0, c).v);
  const kol = n => kop.indexOf(n);
  check('xlsx: een echte werkmap met de koppen', kop[2] === 'Merk' && kop[9] === 'Opbouw', JSON.stringify(kop));
  check('xlsx: opbouw 4-12-4 is tekst, geen datum', cel(2, kol('Opbouw')).t === 's' && cel(2, kol('Opbouw')).v === '4-12-4',
    JSON.stringify(cel(2, kol('Opbouw'))));
  check('xlsx: merk 1.10 is tekst', cel(3, kol('Merk')).t === 's' && cel(3, kol('Merk')).v === '1.10');
  check('xlsx: maten en gewicht zijn getallen', cel(1, kol('Glasbreedte')).t === 'n' && cel(1, kol('Glasbreedte')).v === 1192 &&
    cel(1, kol('Gewicht p/stuk (kg)')).t === 'n', JSON.stringify([cel(1, kol('Glasbreedte')), cel(1, kol('Gewicht p/stuk (kg)'))]));
  check('xlsx: é en × goed', /één zijde mat/.test(String(cel(1, kol('Opmerking') >= 0 ? kol('Opmerking') : 16).v || '')) ||
    /één zijde mat/.test(JSON.stringify(XLSX.utils.sheet_to_json(ws, { header: 1 }))));
  check('xlsx: bestandsnaam zonder / en :', /\.xlsx$/.test(xD.suggestedFilename()) && !/[\/:]/.test(xD.suggestedFilename()),
    xD.suggestedFilename());
  await ctx.close();

  /* ══ 12 ═══════════════════════════════════════════════════════ */
  console.log('\n12. Een csv uit Excel op Windows inlezen');
  // Excel op Windows bewaart 'CSV (gescheiden door lijstscheidingsteken)' in
  // Windows-1252: é is dan één byte (E9), × is D7.
  bestelProject();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  const cp = Buffer.from('Merk;Breedte;Hoogte;Opmerking\r\nA;1200;600;caf\xe9 \xd7 2\r\nB;800;1400;\xe9\xe9n zijde\r\n', 'latin1');
  async function importeer(buffer, naam) {
    await page.evaluate(() => impOpen());
    await page.setInputFiles('#impBestand', { name: naam, mimeType: 'text/csv', buffer: buffer });
    await page.waitForFunction(() => document.getElementById('impStap2') &&
      document.getElementById('impStap2').style.display !== 'none', null, { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => impControleren());
    await wacht(300);
    await page.evaluate(() => { rijen = rijen.filter(r => !r.merk || /^[AB]$/.test(r.merk) === false); impToevoegen(); });
    await wacht(400);
    return page.evaluate(() => rijen.filter(r => /^[AB]$/.test(r.merk)).map(r => ({ m: r.merk, o: r.opmerking, b: r.breedte })));
  }
  let ing = await importeer(cp, 'uit-excel-windows.csv');
  check('Windows-1252: é en × komen goed binnen', ing.length === 2 && ing[0].o === 'café × 2' && ing[1].o === 'één zijde',
    JSON.stringify(ing));
  ing = await importeer(Buffer.from('\ufeffMerk;Breedte;Hoogte;Opmerking\r\nA;1200;600;café\r\n', 'utf8'), 'utf8-bom.csv');
  check('UTF-8 met BOM: de kolom "Merk" wordt nog herkend en é klopt', ing.length === 1 && ing[0].o === 'café', JSON.stringify(ing));
  ing = await importeer(Buffer.from('Merk;Breedte;Hoogte;Opmerking\nA;1200;600;café\n', 'utf8'), 'utf8.csv');
  check('UTF-8 zonder BOM blijft werken', ing.length === 1 && ing[0].o === 'café', JSON.stringify(ing));
  const u16 = Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from('Merk\tBreedte\tHoogte\tOpmerking\r\nA\t1200\t600\tcafé\r\n', 'utf16le')]);
  ing = await importeer(u16, 'unicode-tekst.txt');
  check('"Unicode-tekst" uit Excel (UTF-16) ook', ing.length === 1 && ing[0].o === 'café', JSON.stringify(ing));
  ing = await importeer(Buffer.from('Merk\tBreedte\tHoogte\tOpmerking\r\nA\t1200\t600\tcafé\r\n', 'utf16le'), 'zonder-bom.txt');
  check('UTF-16 zonder BOM ook', ing.length === 1 && ing[0].o === 'café', JSON.stringify(ing));
  // Excel voor Mac: MacRoman. é = 8E, ë = 91, ö = 9A.
  const mac = Buffer.from([...Buffer.from('Merk;Breedte;Hoogte;Opmerking\r\nA;1200;600;caf'), 0x8E,
    ...Buffer.from(' z'), 0x91, ...Buffer.from('er dun\r\n')]);
  ing = await importeer(mac, 'uit-excel-mac.csv');
  check('MacRoman (Excel voor Mac): é en ë goed', ing.length === 1 && ing[0].o === 'café zëer dun', JSON.stringify(ing));
  ing = await importeer(Buffer.from([...Buffer.from('Merk;Breedte;Hoogte;Opmerking\r\nA;1200;600;Belgi'), 0x91, ...Buffer.from(' glas\r\n')]), 'mac-belgie.csv');
  check('Mac met alleen een ë ("België")', ing.length === 1 && ing[0].o === 'België glas', JSON.stringify(ing));
  // Mac met typografische tekens (geplakt uit mail of Word): – = D0, “ ” = D2 D3, ’ = D5.
  ing = await importeer(Buffer.from([...Buffer.from('Merk;Breedte;Hoogte;Opmerking\r\nA;1200;600;caf'), 0x8E,
    ...Buffer.from(', '), 0xD2, ...Buffer.from('boven'), 0xD3, 0x20, 0xD0, ...Buffer.from(' zo'), 0xD5, ...Buffer.from('n\r\n')]), 'mac-typo.csv');
  check('Mac met – “ ” ’ (geplakt uit mail): toch Mac', ing.length === 1 && ing[0].o === 'café, “boven” – zo’n', JSON.stringify(ing));
  ing = await importeer(Buffer.from('Merk;Breedte;Hoogte;Opmerking\r\nA;1200;600;\x8akoda zo\x92n \x93mat\x94 enz\x85 \x80 12\r\n', 'latin1'), 'win-skoda.csv');
  check('Windows met Š, ’, “ ”, … en € (geen accenten): blijft Windows', ing.length === 1 &&
    ing[0].o === 'Škoda zo’n “mat” enz… € 12', JSON.stringify(ing));
  await page.evaluate(() => impOpen());
  await page.setInputFiles('#impBestand', { name: 'uit-excel-windows.csv', mimeType: 'text/csv', buffer: cp });
  await wacht(600);
  await page.evaluate(() => impControleren());
  await wacht(300);
  const herkomst = await page.evaluate(() => (document.querySelector('.imp-herkomst') || {}).textContent || '');
  check('de app zegt hoe het bestand gelezen is', /gelezen als Windows/.test(herkomst), herkomst.slice(0, 120));
  ing = await importeer(Buffer.from('Merk;Breedte;Hoogte;Opmerking\r\nA;1200;600;"\'- onderste ruit mat"\r\n', 'utf8'), 'eigen.csv');
  check('de apostrof die de app zelf voor Excel zette, gaat er bij inlezen weer af',
    ing.length === 1 && ing[0].o === '- onderste ruit mat', JSON.stringify(ing));
  await ctx.close();

  /* ══ 13 ═══════════════════════════════════════════════════════ */
  console.log('\n13. "Adres in kaarten" per systeem');
  const UA = {
    android: devices['Pixel 7'].userAgent,
    windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
    iphone: devices['iPhone 13'].userAgent,
    ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
  };
  const kaart = {};
  for (const sys of Object.keys(UA)) {
    bestelProject();
    Object.assign(rijVan(1).data.info, { straat: 'Kerkstraat 1', postcode: '3311 AA', plaats: 'Dordrecht' });
    ctx = await nieuweContext({ userAgent: UA[sys] });
    await ctx.addInitScript(() => { window.__geopend = []; window.open = function (u) { window.__geopend.push(String(u)); return null; }; });
    page = await nieuwePagina(ctx);
    await open(page, 1);
    await page.evaluate(() => { const k = document.getElementById('klantKaart'); if (k) k.click(); });
    kaart[sys] = (await page.evaluate(() => window.__geopend))[0] || '';
    await ctx.close();
  }
  check('Android: Google Maps', /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Kerkstraat%201/.test(kaart.android), kaart.android);
  check('Windows: Google Maps', /google\.com\/maps/.test(kaart.windows), kaart.windows);
  check('iPhone: Apple Kaarten', /^https:\/\/maps\.apple\.com\/\?q=/.test(kaart.iphone), kaart.iphone);
  check('iPad (doet zich voor als Mac): Apple Kaarten', /maps\.apple\.com/.test(kaart.ipad), kaart.ipad);

  /* ══ 14 ═══════════════════════════════════════════════════════ */
  console.log('\n14. Een HEIC-foto van een iPhone in Chrome');
  bestelProject();
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await open(page, 1);
  const voor = await page.evaluate(() => fotos.length);
  // Een echt HEIC-bestand begint met een 'ftyp heic'-kop; Chrome kan het niet lezen.
  const heic = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic\0\0\0\0mif1heic'), Buffer.alloc(4000, 7)]);
  await page.setInputFiles('#fotoBestand', { name: 'IMG_4321.HEIC', mimeType: 'image/heic', buffer: heic });
  m = await wachtOpMelding(page, /HEIC/, 8000);
  check('een duidelijke uitleg, niet alleen "Mislukt"', m.ok && /Meest compatibel/.test(m.tekst), m.tekst.slice(0, 160));
  check('er is geen kapotte foto toegevoegd', await page.evaluate(() => fotos.length) === voor);
  await sluitMeldingen(page);
  // Android-fotokiezer: geen extensie, geen type. Herkennen aan de bytes.
  await page.setInputFiles('#fotoBestand', { name: '1000012345', mimeType: '', buffer: heic });
  m = await wachtOpMelding(page, /HEIC/, 8000);
  check('ook zonder naam en type: herkend aan de bytes', m.ok, m.tekst.slice(0, 80));
  check('met de tip voor Samsung', /Samsung/.test(m.tekst));
  await sluitMeldingen(page);
  // Ter controle: een gewone JPG doet het nog.
  const jpg = await page.evaluate(() => new Promise(ok => {
    const c = document.createElement('canvas'); c.width = 40; c.height = 30;
    c.getContext('2d').fillRect(0, 0, 40, 30);
    c.toBlob(b => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.readAsDataURL(b); }, 'image/jpeg');
  }));
  await page.setInputFiles('#fotoBestand', { name: 'IMG_0001.JPG', mimeType: 'image/jpeg', buffer: Buffer.from(jpg, 'base64') });
  await wachtTot(() => page.evaluate(v => fotos.length > v, voor), 8000);
  check('een gewone JPG wordt nog steeds toegevoegd', await page.evaluate(v => fotos.length > v, voor));
  await ctx.close();

  /* ══ 15 ═══════════════════════════════════════════════════════ */
  console.log('\n15. Ctrl+Y is opnieuw (Windows)');
  bestelProject();
  ctx = await nieuweContext({ userAgent: UA.windows });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await page.evaluate(() => { bewaarStap('test'); rijen[0].merk = 'X9'; renderTabel(); opslaan(); });
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Control+z');
  await wacht(400);
  check('Ctrl+Z maakt ongedaan', await page.evaluate(() => rijen[0].merk) === 'K1');
  await page.keyboard.press('Control+y');
  await wacht(400);
  check('Ctrl+Y doet het opnieuw', await page.evaluate(() => rijen[0].merk) === 'X9');
  await page.keyboard.press('Control+z');
  await wacht(300);
  await page.keyboard.press('Control+Shift+z');
  await wacht(300);
  check('Ctrl+Shift+Z ook', await page.evaluate(() => rijen[0].merk) === 'X9');
  // AltGr is op Windows Ctrl+Alt; AltGr+Z of AltGr+Y mag niets terugdraaien.
  await page.keyboard.press('Control+Alt+z');
  await wacht(300);
  check('AltGr+Z (Ctrl+Alt) doet niets', await page.evaluate(() => rijen[0].merk) === 'X9');
  // Net een vakje aangevinkt: Ctrl+Z moet gewoon werken.
  await page.locator('#invoerBody input[type=checkbox]').first().focus();
  await page.keyboard.press('Control+z');
  await wacht(300);
  check('met de aandacht op een selectievakje werkt Ctrl+Z wel', await page.evaluate(() => rijen[0].merk) === 'K1');
  await page.keyboard.press('Control+y');
  await wacht(300);
  check('en Ctrl+Y vanaf het vakje zet het weer terug', await page.evaluate(() => rijen[0].merk) === 'X9');
  // In een tekstveld is Ctrl+Y van de browser zelf.
  await page.locator('#invoerBody input.opm-input').first().click();
  await page.keyboard.press('Control+z');
  await wacht(300);
  check('in een invoerveld blijft het van het veld (de app springt er niet tussen)',
    await page.evaluate(() => rijen[0].merk) === 'X9', await page.evaluate(() => rijen[0].merk + ' / ' + document.activeElement.className));
  await ctx.close();

  /* ══ 16 ═══════════════════════════════════════════════════════ */
  console.log('\n16. Telefoon (Android, 412 px): het bestelblok en de balk passen');
  bestelProject();
  ctx = await nieuweContext(Object.assign({}, devices['Pixel 7']));
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await page.evaluate(() => {
    projectInfo.bestellingen = [{ nr: 1, op: new Date().toISOString(), door: 'julian', via: 'pdf', aantal: 3,
      ruiten: Object.fromEntries(rijen.filter(r => r.merk).map(r => [r.id, ruitMomentopname(r, true)])) }];
    projectInfo.besteld = { op: projectInfo.bestellingen[0].op, door: 'julian', aantal: 3,
      ruiten: Object.fromEntries(rijen.filter(r => r.merk).map(r => [r.id, ruitKenmerk(r)])) };
    rijen[0].breedte = '1210'; rijen = rijen.filter(r => r.id !== 2); herbereken(); renderTabel(); renderBestellijst();
  });
  await wacht(500);
  check('precies 1 gewijzigd en 1 vervallen (lege regels tellen niet mee)',
    /1 gewijzigd, 1 vervallen/.test(await page.$eval('#bestelVerschil', e => e.innerText)),
    await page.$eval('#bestelVerschil', e => e.innerText));
  const breed = await page.evaluate(() => document.documentElement.scrollWidth);
  check('geen horizontaal schuiven door de balk', breed <= 412 + 1, String(breed));
  const bv = await page.$eval('#bestelVerschil', e => { const r = e.getBoundingClientRect(); return { zicht: !e.hidden, rechts: r.right }; });
  check('de balk "Anders dan besteld" staat in beeld', bv.zicht && bv.rechts <= 412 + 1, JSON.stringify(bv));
  if (process.env.SCHERM) {
    await page.screenshot({ path: path.join(process.env.SCHERM, 'v104-invoer-telefoon.png') });
    await page.click('.tab-btn:has-text("Bestellijst")').catch(() => {});
    await wacht(300);
    await page.screenshot({ path: path.join(process.env.SCHERM, 'v104-bestellijst-telefoon.png'), fullPage: true });
  }
  await ctx.close();


  /* ══ 17 ═══════════════════════════════════════════════════════ */
  console.log('\n17. Twee apparaten: een iPad die offline werkte, wist de bestelling niet');
  // Echte situatie: Bart wijzigt op de iPad zonder bereik een opmerking in
  // de Kerkstraat. Op kantoor maakt Julian intussen de bestellijst en kiest
  // "Ja, verstuurd". Daarna krijgt de iPad weer bereik en stuurt zijn
  // project op. Tot de beoordeling van v104 waren de bestelling, de status
  // en het slot dan weg, zonder melding (de iPad kende ze niet).
  async function tweeApparaten(zonderTrigger, herstart) {
    bestelProject();
    S.zonderTrigger = zonderTrigger;
    const kantoor = await nieuweContext({}, 'kantoor');
    await kantoor.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    const ipad = await nieuweContext({}, 'ipad');
    const pk = await nieuwePagina(kantoor);
    const pi = await nieuwePagina(ipad);
    await open(pk, 1);
    await open(pi, 1);
    S.weg.ipad = true;
    await pi.evaluate(() => { rijen[2].opmerking = 'van de iPad'; renderTabel(); window.opslaan(); });
    await wacht(1500);
    await bestellijstPdf(pk);
    await vraagOpScherm(pk);
    await knop(pk, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
    if (herstart) {
      // De iPad wordt opnieuw opgestart (de app kwam terug uit de achtergrond)
      // terwijl hij weer bereik heeft: openstaand werk wint, maar de
      // bestelling moet erbij komen.
      S.weg.ipad = false;
      await pi.goto('about:blank');
      await pi.goto(adres + '#project=' + P(1));
    } else {
      S.weg.ipad = false;
      await pi.evaluate(() => window.dispatchEvent(new Event('online')));
    }
    await wachtTot(() => rijVan(1).data.rijen[2].opmerking === 'van de iPad', 15000);
    await wacht(2500);
    const uit = {
      dbBest: (info().bestellingen || []).length, dbStatus: rijVan(1).status, infoStatus: info().status,
      dbRuit: rijVan(1).data.rijen[2].opmerking,
      ipadBest: await pi.evaluate(() => (projectInfo.bestellingen || []).length),
      ipadSlot: await pi.evaluate(() => invoerOpSlot()),
      ipadGeel: await pi.evaluate(() => naBestellingGewijzigd(rijen[2])),
      melding: (await meldingen(pi)).join(' | ')
    };
    await kantoor.close(); await ipad.close();
    S.zonderTrigger = false;
    return uit;
  }
  let t2 = await tweeApparaten(false, false);
  check('de bestelling staat nog in de database', t2.dbBest === 1, JSON.stringify(t2));
  check('status nog besteld (kolom én project)', t2.dbStatus === 'besteld' && t2.infoStatus === 'besteld');
  check('de wijziging van de iPad staat er ook (niets van de iPad weg)', t2.dbRuit === 'van de iPad');
  check('de iPad kent de bestelling nu ook, en staat op slot', t2.ipadBest === 1 && t2.ipadSlot);
  check('en ziet zijn eigen wijziging geel (anders dan besteld)', t2.ipadGeel);
  check('de iPad zegt dat er intussen besteld is', /Intussen besteld/.test(t2.melding), t2.melding.slice(0, 120));
  // Zonder de database-trigger (script 23 niet gedraaid) en met een herstart:
  // dan moet de app zelf samenvoegen voordat hij opslaat.
  t2 = await tweeApparaten(true, true);
  check('ook zonder script 23, na een herstart: de bestelling blijft (de app voegt zelf samen)',
    t2.dbBest === 1 && t2.dbStatus === 'besteld' && t2.dbRuit === 'van de iPad', JSON.stringify(t2));
  t2 = await tweeApparaten(true, false);
  check('ook zonder script 23 en zonder herstart (bereik komt terug): de bestelling blijft',
    t2.dbBest === 1 && t2.dbStatus === 'besteld' && t2.dbRuit === 'van de iPad' && t2.ipadSlot, JSON.stringify(t2));

  /* ══ 18 ═══════════════════════════════════════════════════════ */
  console.log('\n18. Tussen de pdf en "Ja" verandert er iets: vastgelegd wordt wat op de pdf staat');
  // Echte situatie: Julian deelt de pdf op de iPad naar Gmail en is even
  // weg uit de app. Intussen past Bart op kantoor K1 aan. Als Julian
  // terugkomt, laadt de app die wijziging, en dan pas tikt hij "Ja".
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await bestellijstPdf(page);
  await vraagOpScherm(page);
  rijVan(1).data.rijen[0].breedte = '1300';            // Bart, op kantoor
  rijVan(1).data._sessie = 'ander';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));   // terug in de app
  await wachtTot(() => page.evaluate(() => rijen[0].breedte === '1300'), 8000);
  check('de wijziging van Bart is binnen terwijl de vraag openstaat', await page.evaluate(() => rijen[0].breedte) === '1300');
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
  const vast = ((info().bestellingen || [])[0] || {}).ruiten || {};
  check('vastgelegd is wat op de pdf stond (1200), niet de wijziging van daarna', vast[1] && vast[1].breedte === '1200',
    JSON.stringify(vast[1]));
  check('de wijziging van Bart staat geel: nog niet besteld', await page.evaluate(() => naBestellingGewijzigd(rijen[0])));
  m = await wachtOpMelding(page, /Vastgelegd is wat op de pdf staat/, 5000);
  check('en de app zegt het', m.ok, m.tekst.slice(0, 120));
  await ctx.close();

  /* ══ 19 ═══════════════════════════════════════════════════════ */
  console.log('\n19. Andere speling na de bestelling: andere glasmaat, dus anders dan besteld');
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await bestellijstPdf(page);
  await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
  await ontgrendel(page);
  await page.selectOption('#spelingGlobal', '6');
  await wacht(600);
  check('glasmaat K1 is veranderd (1192 → 1188)', await page.evaluate(() => rijen[0].glasBreedte) === 1188);
  check('K1 staat geel', await page.$eval('#rij-1 td.rijnr', e => e.classList.contains('na-bestelling')));
  bt = await bestelTekst(page);
  check('op Bestellijst: "glasmaat 1192 × 592 → 1188 × 588"', /glasmaat 1192 × 592 → 1188 × 588/.test(bt), bt.slice(0, 300));
  const pdf19 = await bestellijstPdf(page);
  m = await vraagOpScherm(page);
  check('na een nieuwe pdf komt de vraag wel (de lijst is anders)', m.ok);
  const t19 = pdfTekst(pdf19).replace(/\s+/g, ' ');
  check('de pdf zegt VERVANGT K1 uit de 1e (1x 1192 x 592)', /VERVANGT K1 uit de 1e \(1x 1192 x 592\)/.test(t19),
    (t19.match(/K1.{0,80}/) || [''])[0]);
  check('de pdf begint met de aanvullingsbalk', /2e BESTELLIJST = AANVULLING op de eerdere bestelling \(1e van/.test(t19.slice(0, 400)),
    t19.slice(0, 200));
  await knop(page, 'Nee, alleen bekeken');
  await ctx.close();

  /* ══ 20 ═══════════════════════════════════════════════════════ */
  console.log('\n20. Een bestelde ruit wordt onvolledig: hij valt niet stil van de lijst');
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await bestellijstPdf(page);
  await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
  await ontgrendel(page);
  await page.evaluate(() => { setVal(2, 'opbouw', ''); herbereken(); renderTabel(); opslaan(); });
  await wacht(400);
  bt = await bestelTekst(page);
  check('op Bestellijst: "Niet meer compleet" met K2 en zijn bestelde maat',
    /Niet meer compleet/.test(bt) && /K2 is besteld als glasmaat 792 × 1392 HR\+\+ glas \(in de 1e\)/.test(bt), bt.slice(0, 400));
  check('en dat de leverancier hem maakt zoals besteld (v105)', /maakt hem zoals besteld/.test(bt));
  check('op Invoer: "1 niet meer compleet"', /1 niet meer compleet/.test(await page.$eval('#bestelVerschil', e => e.innerText)));
  await page.click('button:has-text("⬇ Exporteren")');
  const dl20 = page.waitForEvent('download', { timeout: 20000 });
  await page.click('button:has-text("Bestellijst als PDF")');
  // v105: K2 is al besteld; er is niets bij te bestellen. Geen vraag "Niet
  // alles gaat mee" (hij gaat niet verloren: de leverancier maakt hem), en
  // de pdf is het overzicht, dat K2 wel noemt.
  const p20 = path.join(pdfMap, 'onvolledig.pdf');
  await (await dl20).saveAs(p20);
  const t20 = pdfTekst(p20).replace(/\s+/g, ' ');
  check('de pdf is het OVERZICHT en noemt K2: OOK BESTELD, hier niet getoond',
    /OVERZICHT van alles wat besteld is/.test(t20) &&
    /OOK BESTELD, hier niet getoond \(in de app nu niet compleet\) Merk .{0,80}K2 1 792 1392 HR\+\+ glas 4-15-4 1e besteld/.test(t20),
    (t20.match(/OOK BESTELD.{0,100}/) || [t20.slice(0, 200)])[0]);
  m = await vraagOpScherm(page);
  check('geen vraag (het overzicht is geen bestelling)', !m.ok, m.tekst.slice(0, 80));
  await ctx.close();

  /* ══ 21 ═══════════════════════════════════════════════════════ */
  console.log('\n21. Aanvulling: een nieuwe ruit en een ander aantal');
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await bestellijstPdf(page);
  await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
  await ontgrendel(page);
  await page.evaluate(() => {
    const r = nieuweRij(); Object.assign(r, { merk: 'K4', breedte: '500', hoogte: '500', glasType: 'HR++ glas', opbouw: '4-15-4' });
    rijen.unshift(r);
    rijen.find(x => x.merk === 'K3').aantal = 2;
    herbereken(); renderTabel(); opslaan();
  });
  await wacht(400);
  bt = await bestelTekst(page);
  check('op Bestellijst: Nieuw (1) K4 en K3 aantal 1 → 2', /Nieuw \(1\)/.test(bt) && /K4 glasmaat 492 × 492/.test(bt) &&
    /K3: aantal 1 → 2/.test(bt), bt.slice(0, 400));
  const p21 = await bestellijstPdf(page);
  const t21 = pdfTekst(p21).replace(/\s+/g, ' ');
  check('de pdf: K4 NIEUW', /K4 NIEUW/.test(t21), (t21.match(/K4.{0,40}/) || [''])[0]);
  // v110 (keuze van Jan): alleen een ander aantal is EXTRA, geen VERVANGT
  // meer (de leverancier annuleerde dan de bestelde en maakte alles opnieuw).
  check('de pdf: K3 EXTRA bij K3 uit de 1e: +1 (samen 2x), aantal 1', /1 K3 EXTRA bij K3 uit de 1e: \+1 \(samen 2x\)/.test(t21),
    (t21.match(/.{0,4}K3.{0,60}/) || [''])[0]);
  check('de pdf telt wat erop staat: 1 NIEUW, 0 VERVANGT, 1 EXTRA', /alleen deze aanvulling: 1 NIEUW, 0 VERVANGT, 1 EXTRA/.test(t21),
    (t21.match(/posities.{0,120}/) || [''])[0]);
  check('K1 en K2 (ongewijzigd) staan niet op de aanvulling', !/K1 /.test(t21) && !/K2 /.test(t21));
  m = await vraagOpScherm(page);
  check('de pdf heet …_2e_aanvulling.pdf', /^Bestellijst_Kerkstraat_1_2e_aanvulling\.pdf$/.test(laatsteNaam), laatsteNaam);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
  // v105: in de 1e alleen ingekort wat vervangen is (K3). K1 is nog
  // steeds zoals hij besteld is en blijft volledig: daarmee wordt vergeleken.
  const b21 = info().bestellingen;
  check('in de 1e is de vervangen K3 ingekort (scheelt ruimte), met wat nodig is om hem te tonen',
    b21[0].kort === true && b21[0].ruiten[3].kort === 1 && b21[0].ruiten[3].breedte === '900' &&
    b21[0].ruiten[3].opmerking === undefined && !b21[1].kort, JSON.stringify(b21[0].ruiten[3]));
  check('K1 in de 1e blijft volledig (nog steeds wat er besteld is)', !b21[0].ruiten[1].kort && 'rooster' in b21[0].ruiten[1],
    JSON.stringify(b21[0].ruiten[1]).slice(0, 160));
  await ctx.close();

  /* ══ 22 ═══════════════════════════════════════════════════════ */
  console.log('\n22. Een verkeerde "Ja" intrekken (met wachtwoord, blijft in de geschiedenis)');
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await bestellijstPdf(page);
  await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
  await page.click('.tab-btn:has-text("Bestellijst")');
  await page.click('#bestellijstInhoud button:has-text("Intrekken")');
  await page.fill('.melding-laag input[type=password]', 'verkeerd');
  await knop(page, 'Intrekken');
  m = await wachtOpMelding(page, /Dat wachtwoord klopt niet/, 5000);
  check('fout wachtwoord: melding, en niets ingetrokken', m.ok && !(info().bestellingen[0] || {}).ingetrokken &&
    await page.evaluate(() => !projectInfo.bestellingen[0].ingetrokken), m.tekst.slice(0, 80));
  await sluitMeldingen(page);
  await page.click('#bestellijstInhoud button:has-text("Intrekken")');
  await page.fill('.melding-laag input[type=password]', 'geheim');
  await knop(page, 'Intrekken');
  await wachtTot(() => !!((info().bestellingen || [])[0] || {}).ingetrokken && rijVan(1).status !== 'besteld', 10000);
  check('ingetrokken, en in de geschiedenis gebleven', (info().bestellingen || []).length === 1 &&
    !!info().bestellingen[0].ingetrokken && info().bestellingen[0].ingetrokken.door === 'julian');
  check('status terug op bezig, niet meer op slot', rijVan(1).status === 'bezig met inmeten/verwerken' && !(await opSlot(page)));
  check('geen gele markeringen meer (er is geen geldige bestelling)', await page.$eval('#bestelVerschil', e => e.hidden));
  bt = await bestelTekst(page);
  check('op Bestellijst: "ingetrokken"', /ingetrokken/.test(bt) && /geen geldige bestelling/.test(bt), bt.slice(0, 200));
  await ctx.close();

  console.log('\n22b. De 2e intrekken terwijl de 1e geldig blijft');
  // Na intrekken wordt weer vergeleken met de 1e, en die is (als oudere
  // bestelling) ingekort. Wat niet bewaard is, mag niet als "(leeg) → …"
  // verschijnen (gevonden bij de beoordeling).
  bestelProject();
  rijVan(1).data.rijen[0].opmerking = 'achterzijde';
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await bestellijstPdf(page); await vraagOpScherm(page); await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
  await ontgrendel(page);
  await page.evaluate(() => { rijen.find(r => r.merk === 'K3').aantal = 2; rijen[0].opmerking = 'voorzijde';
    herbereken(); renderTabel(); opslaan(); });
  await bestellijstPdf(page); await vraagOpScherm(page); await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
  await page.click('.tab-btn:has-text("Bestellijst")');
  await page.click('#bestellijstInhoud button:has-text("Intrekken")');
  await page.fill('.melding-laag input[type=password]', 'geheim');
  await knop(page, 'Intrekken');
  await wachtTot(() => !!((info().bestellingen || [])[1] || {}).ingetrokken, 10000);
  check('de 2e is ingetrokken, de 1e geldt weer; status blijft besteld', !!info().bestellingen[1].ingetrokken &&
    !info().bestellingen[0].ingetrokken && rijVan(1).status === 'besteld');
  bt = await bestelTekst(page);
  check('K3 is anders dan de 1e: aantal 1 → 2, zonder valse "(leeg) → …"', /K3: aantal 1 → 2/.test(bt) &&
    !/\(leeg\) →/.test(bt), (bt.match(/Gewijzigd.{0,300}/) || [''])[0]);
  check('K1 (alleen de opmerking anders, die de 1e niet meer kent): "overige gegevens gewijzigd"',
    /K1: overige gegevens gewijzigd/.test(bt), (bt.match(/K1:.{0,120}/) || [''])[0]);
  await page.click('.tab-btn:has-text("Invoer")');
  await ontgrendel(page);
  await page.evaluate(() => { rijen[0].breedte = '1210'; herbereken(); renderTabel(); opslaan(); });
  bt = await bestelTekst(page);
  check('K1 met ook een andere breedte: beide genoemd', /K1: breedte 1200 → 1210; glasmaat 1192 × 592 → 1202 × 592; en overige gegevens gewijzigd/.test(bt),
    (bt.match(/K1:.{0,160}/) || [''])[0]);
  await ctx.close();

  console.log('\n22c. Een iPad met een achterlopende klok: zijn bestelling komt toch achteraan');
  bestelProject();
  rijVan(1).data.info.bestellingen = [{ nr: 1, op: new Date().toISOString(), door: 'bart', via: 'pdf', aantal: 3, ruiten: {} }];
  rijVan(1).status = 'besteld'; rijVan(1).data.info.status = 'besteld';
  ctx = await nieuweContext();
  await ctx.addInitScript(() => {
    try { window.showSaveFilePicker = undefined; } catch (e) {}
    const Echt = Date, terug = 400 * 864e5;
    function Nep(...a) { return a.length ? new Echt(...a) : new Echt(Echt.now() - terug); }
    Nep.now = () => Echt.now() - terug; Nep.UTC = Echt.UTC; Nep.parse = Echt.parse; Nep.prototype = Echt.prototype;
    window.Date = Nep;
  });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await ontgrendel(page);
  await bestellijstPdf(page); await vraagOpScherm(page); await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
  const bl22c = info().bestellingen || [];
  check('de nieuwe bestelling heeft een tijdstip ná de vorige, en is de laatste', bl22c.length === 2 &&
    bl22c[1].op > bl22c[0].op && bl22c[1].nr === 2, JSON.stringify(bl22c.map(b => b.nr + '@' + b.op)));
  await ctx.close();

  /* ══ 23 ═══════════════════════════════════════════════════════ */
  console.log('\n23. iPad: delen via het deelvenster (gelukt en weggetikt), en Alles exporteren');
  // Echte situatie: op de iPad gaat de pdf via het deelvenster (Mail,
  // Bestanden). Wegtikken = niet verstuurd: geen vraag.
  for (const uitkomst of ['afgebroken', 'gelukt']) {
    bestelProject();
    ctx = await nieuweContext(Object.assign({}, devices['iPad (gen 7)']));
    await ctx.addInitScript(u => {
      window.__gedeeld = 0;
      // Een echte iPad meldt 5 aanraakpunten; de nabootsing van Playwright 1.
      Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 });
      navigator.canShare = function () { return true; };
      navigator.share = function () {
        window.__gedeeld++;
        if (u === 'afgebroken') { const e = new Error('Share canceled'); e.name = 'AbortError'; return Promise.reject(e); }
        return Promise.resolve();
      };
    }, uitkomst);
    page = await nieuwePagina(ctx);
    await open(page, 1);
    await page.click('button:has-text("⬇ Exporteren")');
    await page.click('button:has-text("Bestellijst als PDF")');
    await wachtTot(() => page.evaluate(() => window.__gedeeld > 0), 15000);
    m = await vraagOpScherm(page);
    if (uitkomst === 'afgebroken') check('deelvenster weggetikt: geen vraag', !m.ok, m.tekst.slice(0, 60));
    else {
      check('gedeeld: de vraag komt', m.ok);
      await knop(page, 'Ja, verstuurd');
      await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
      check('en Ja legt vast', (info().bestellingen || []).length === 1);
    }
    await ctx.close();
  }
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; window.showDirectoryPicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  let downloads = 0;
  page.on('download', () => { downloads++; });
  await page.click('button:has-text("⬇ Exporteren")');
  await page.click('button:has-text("Alles exporteren")');
  m = await vraagOpScherm(page);
  check('Alles exporteren: twee bestanden, daarna de vraag', m.ok && downloads === 2, downloads + ' downloads');
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
  check('en Ja legt de bestellijst vast', (info().bestellingen || []).length === 1 && info().bestellingen[0].aantal === 3);
  await ctx.close();

  /* ══ 24 ═══════════════════════════════════════════════════════ */
  console.log('\n24. Op de pc: opslagvenster met de goede naam; een aanraaklaptop is geen tablet');
  // Echte situatie: Edge op een Windows-laptop met aanraakscherm (Surface,
  // HP). Het opslagvenster moet komen (niet het deelvenster), en de 2e
  // bestellijst mag niet de naam van de 1e voorstellen (dan vraagt Windows
  // "Vervangen?" en is de 1e weg).
  bestelProject();
  rijVan(1).data.info.bestellingen = [{ nr: 1, op: '2026-10-13T08:00:00Z', door: 'julian', via: 'pdf', aantal: 3, ruiten: {} }];
  rijVan(1).status = 'besteld'; rijVan(1).data.info.status = 'besteld';
  ctx = await nieuweContext({ userAgent: UA.windows, hasTouch: true });
  await ctx.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 10 });
    window.__namen = []; window.__gedeeld = 0;
    navigator.canShare = function () { return true; };
    navigator.share = function () { window.__gedeeld++; return Promise.resolve(); };
    window.showSaveFilePicker = function (o) {
      window.__namen.push(o.suggestedName);
      return Promise.resolve({ createWritable: () => Promise.resolve({ write: () => Promise.resolve(), close: () => Promise.resolve() }) });
    };
  });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await page.click('button:has-text("⬇ Exporteren")');
  await page.click('button:has-text("Bestellijst als PDF")');
  m = await vraagOpScherm(page);
  const namen = await page.evaluate(() => window.__namen);
  check('het opslagvenster kwam (niet het deelvenster)', namen.length === 1 && await page.evaluate(() => window.__gedeeld) === 0,
    JSON.stringify(namen));
  check('met de naam van de 2e lijst: …_2e_aanvulling.pdf', /_2e_aanvulling\.pdf$/.test(namen[0] || ''), namen[0]);
  check('na opslaan in het venster komt de vraag', m.ok);
  await sluitMeldingen(page);
  await page.click('button:has-text("⬇ Exporteren")');
  // v104: een time-out is hier de fout zelf (geen download), dus als FOUT melden en niet als crash.
  const dl24 = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await page.click('button:has-text("CSV-bestand")');
  const gedeeld24 = await page.evaluate(() => window.__gedeeld);
  check('de csv wordt een download, niet het deelvenster', !!(await dl24) && gedeeld24 === 0,
    'download: ' + (await dl24 ? 'ja' : 'nee') + ', gedeeld: ' + gedeeld24);  check('glasMobiel: een Windows-laptop met aanraakscherm is geen tablet', await page.evaluate(() => glasMobiel()) === false);
  await ctx.close();
  ctx = await nieuweContext({ userAgent: UA.ipad });
  await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 }); });
  page = await nieuwePagina(ctx);
  await page.goto(adres);
  check('glasMobiel: een iPad (doet zich voor als Mac, met aanraakpunten) wel', await page.evaluate(() => glasMobiel()) === true);
  await ctx.close();

  /* ══ 25 ═══════════════════════════════════════════════════════ */
  console.log('\n25. Script 23 nog niet gedraaid: het startscherm zegt het');
  bestelProject();
  S.zonderTrigger = true;
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await page.goto(adres);
  await wachtTot(() => page.$eval('#startWaarschuwing', e => /SQL-script 23/.test(e.innerText)), 8000);
  check('waarschuwing "SQL-script 23 is nog niet gedraaid"', await page.$eval('#startWaarschuwing', e => !e.hidden && /SQL-script 23/.test(e.innerText)));
  await ctx.close();
  S.zonderTrigger = false;
  ctx = await nieuweContext();
  page = await nieuwePagina(ctx);
  await page.goto(adres);
  await wacht(2500);
  check('met script 23: geen waarschuwing', await page.$eval('#startWaarschuwing', e => !/SQL-script 23/.test(e.innerText)));
  await ctx.close();

  check('geen fouten in de console', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' | '));

  await browser.close();
  server.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
