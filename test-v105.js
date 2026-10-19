/* Testreeks v105 — node test-v105.js   (en: node test-v105.js --mutaties)

   Onderwerp: een volgende bestellijst is altijd een AANVULLING (keuze van
   Jan, 14 oktober 2026).

   Echte situatie: Julian meet de Kerkstraat in, maakt de bestellijst-pdf en
   mailt hem naar Van Noordenne ("Ja, verstuurd"). Een week later:
   - K1 is nagemeten (andere maat);
   - K2 vervalt (de klant wil daar een dichte plaat);
   - K4 komt erbij;
   - K5 is half ingevuld (nog geen glastype).
   Hij maakt een nieuwe bestellijst. De leverancier is al bezig met de 1e.

   Belofte (Jans woorden: "Aanvulling", en een gewijzigde ruit "opnieuw
   bestellen"):
   - De 2e bestellijst is een aanvulling: alleen K1 (met "vervangt K1 uit de
     1e" en de oude maat) en K4. K3, die niet veranderde, staat er níet op:
     die maakt de leverancier al.
   - K2 staat onder de tabel bij ANNULEREN, als dat nog kan. Anders maakt de
     leverancier hem gewoon.
   - Na "Ja, verstuurd" weet de app wat er in totaal besteld is: de 1e plus
     de aanvulling, min K2. Daarmee vergelijkt hij voortaan (de gele
     markeringen), niet alleen met de laatste lijst.
   - Is er niets bij te bestellen, dan is de pdf een OVERZICHT van alles wat
     besteld is, met per ruit in welke bestellijst. Dat is geen bestelling:
     geen vraag.

   Wat er mis kan gaan voor de gebruiker (harde eis: niets kwijt):
   - de leverancier maakt K3 dubbel (stond op twee lijsten);
   - K2 wordt gemaakt terwijl hij vervallen is (stond nergens);
   - na de aanvulling staat K3 geel, of verdwijnt K3 uit "wat er besteld is"
     (dan zou een volgende lijst hem als nieuw bestellen);
   - een iPad die de aanvulling niet kende, wist hem bij het opslaan.

   Wat er halverwege kan gebeuren, en hier getest wordt:
   - een derde lijst die een ruit uit de 1e én een uit de 2e vervangt;
   - de laatste aanvulling wordt ingetrokken;
   - een aanvulling met alleen iets te annuleren (geen tabel);
   - een iPad die offline was en de aanvulling niet kent, met en zonder
     script 23;
   - een project met bestellingen van v104 (toen was elke lijst volledig);
   - een bestelmail van het overzicht (geen bestelling).

   Wat deze opstelling aanneemt (TESTEN.md, vraag 5):
   - De database is nagebootst in node (zoals test-v104.js), met een
     nabootsing van 23_bestellingen.sql. Het script zelf wordt getest in
     test-sql.sql §20i–j, tegen een echte PostgreSQL.
   - De pdf wordt teruggelezen met pdfplumber: de tekst, niet hoe hij eruit
     ziet. Een pagina is als afbeelding bekeken bij de oplevering.
   - Of een leverancier de aanvulling goed leest, kan hier niet. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  // 1. Alleen de laatste lijst telt (zoals v104): wat er in totaal besteld is, gaat verloren.
  cumulatief: ['index.html', "    if (b.soort !== 'aanvulling') { ruiten = {}; nr = {}; bron = {}; geannuleerd = {}; leeg = {}; }",
                             "    { ruiten = {}; nr = {}; bron = {}; geannuleerd = {}; leeg = {}; }"],
  // 2. Een geannuleerde ruit telt nog als besteld.
  geannuleerd: ['index.html', "      delete ruiten[id]; delete nr[id]; delete bron[id];", ''],
  // 3. De annulering wordt niet vastgelegd bij "Ja".
  annvast: ['index.html', '    if (Object.keys(vervallen).length) uit.vervallen = vervallen;', ''],
  // 4. Op de 2e lijst weer alles (vervanging, zoals v104).
  alleennieuw: ['index.html', '  const regels = alle.filter(r => ids[r.id]);', '  const regels = alle.filter(bestelbaar);'],
  // 5. Geen "vervangt K1 uit de 1e" op de pdf.
  vervangt: ['pdf.js', "    return 'VERVANGT ' + (oud.merk || '(zonder merk)') + ' uit de ' + nr + 'e (' + was + ')';",
                       "    return 'GEWIJZIGD';"],
  // 6. Vervallen ruiten niet op de pdf.
  annpdf: ['pdf.js', "        if (ann.length) annulerenTabel(doc, titel, 'ANNULEREN, als dat nog kan', ann);", ''],
  // 7. Het overzicht wordt weer een bestellijst met een vraag.
  overzicht: ['pdf.js', "    return { modus: t.aantal ? 'aanvulling' : 'overzicht', t: t };", "    return { modus: 'aanvulling', t: t };"],
  // 8. Bij het inkorten ook wat nog geldt (K1 uit de 1e).
  inkorten: ['index.html', '      if (typeof o !== \'object\' || !o || o.kort || st.bron[id] === i) { r[id] = o; return; }',
                           '      if (typeof o !== \'object\' || !o || o.kort) { r[id] = o; return; }'],
  // 9. Oude apparaten krijgen alleen de laatste lijst.
  besteldoud: ['index.html', "  Object.keys(st.ruiten).forEach(id => { k[id] = kenmerkVan(st.ruiten[id]); });",
                             "  Object.keys(bestelling().ruiten || {}).forEach(id => { k[id] = kenmerkVan(bestelling().ruiten[id]); });"],
  // 10. Een lege aanvulling (het overzicht gemaild) telt als bestelling.
  leeg: ['index.html', "      !Object.keys(m.ruiten || {}).some(id => m.ruiten[id] && m.ruiten[id].opLijst)) return null;",
                       "      false) return null;"],
  // 11. Wat al besteld is en niet op de aanvulling staat, komt toch in de aanvulling.
  momentalles: ['index.html', '    if (aanvulling && al && !opLijst[r.id]) return;', ''],
  // 12. De samenvoeging zonder script 23 verliest de aanvulling.
  samenvoegen: ['index.html', "    if (!e) { opOp[b.op] = b; veranderd = true; if (!b.ingetrokken) geldigErbij = true; }",
                              "    if (!e) { veranderd = true; }"],
  // 13. Nummer en "aanvulling" in de bestandsnaam vergeten.
  naam: ['pdf.js', "    if (m === 'aanvulling') naam = naam.replace(/\\.pdf$/, '_' + (bestellingTeller() + 1) + 'e_aanvulling.pdf');", ''],
  // 14. De mail van het overzicht legt toch iets vast.
  mailoverzicht: ['pdf.js', "              if (bijlageGemaakt) { if (mailMoment) bestellingVastleggen(mailLijst, 'mail', mailMoment); }",
                            "              if (bijlageGemaakt) { bestellingVastleggen(mailLijst, 'mail', mailMoment); }"],
  // 15. Een oudere stand van een ander apparaat telt als wijziging (VERVANGT de goede maat door de oude).
  ouder: ['index.html', "function nietGewijzigdSinds(rij, g) {\n  if (!rij || !rij.gewOp || !g) return false;",
                        "function nietGewijzigdSinds(rij, g) {\n  return false;"],
  // 15c. Een eerder bestelde versie (teruggezet door een ander apparaat) telt als wijziging.
  versie: ['index.html', '  if (ev && ev[k]) return true;', ''],
  // 16. Een geannuleerde ruit die terugkomt door een oudere stand, wordt NIEUW besteld.
  geannterug: ['index.html', '      if (ga && oudereStand(r, st, ga.oud)) {', '      if (false) {'],
  // 17. Een bestelde ruit die weg is, gaat zonder vragen naar ANNULEREN.
  annvraag: ['pdf.js', "      if (k !== 'door' || !bm.t.vervallen.length) return k;", "      return k;"],
  // 18. Terugzetten zet niets terug.
  terugzetten: ['index.html', "      doel[v] = oud[v] === undefined ? (v === 'aantal' ? 1 : '') : oud[v];", ''],
  // 19. Het mailonderwerp zegt "Bestelling", ook bij een overzicht.
  onderwerp: ['pdf.js', "    if (bm && bm.modus === 'overzicht') return 'Overzicht bestelde ruiten, GEEN nieuwe bestelling — ' + achter;", ''],
  // 20. Bij een aanvulling kan de bijlage uit (de leverancier ziet dan niets).
  bijlage: ['pdf.js', "          (bmVenster.modus === 'volledig'\n", "          (true\n"],
  // 21. "In totaal" telt posities in plaats van ruiten.
  stuks: ['index.html', "  const totaalTekst = '<p class=\"bestel-totaal\">De leverancier maakt in totaal ' + stuks +",
                        "  const totaalTekst = '<p class=\"bestel-totaal\">De leverancier maakt in totaal ' + ids.length +"],
  // 22. Het overzicht zwijgt over wat er gevraagd is te annuleren.
  gevraagd: ['pdf.js', '        if (gevraagd.length) {', '        if (0) {'],
  // 23. Een oude maat met een nieuwe opmerking telt als wijziging (de oude maat opnieuw besteld).
  velden: ['index.html', '  const velden = oudeVelden(rij, st);\n  return velden.length ? velden : false;', '  return false;'],
  // 24. Terugzetten zet de hele ruit terug (de opmerking van de iPad weg).
  heel: ['index.html', '    const velden = Array.isArray(os) ? os : KENMERK_VELDEN;', '    const velden = KENMERK_VELDEN;'],
  // 25. Het opslagvenster weer vóór de vragen.
  venster: ['pdf.js', "      return voorControles(bestelModus()).then(function (k) {\n        if (k !== 'door') { bezig(''); return; }\n        var bestandB = bestandVragen(bestellijstNaam(project, datum));",
                      "      var bestandB = bestandVragen(bestellijstNaam(project, datum));\n      return voorControles(bestelModus()).then(function (k) {\n        if (k !== 'door') { bezig(''); return; }"],
  // 26. Stoppen in de bestelmail verstuurt toch.
  mailstop: ['pdf.js', "              if (k !== 'door') { var g = new Error('gestopt'); g.gestopt = true; throw g; }", ''],
  // 27. Lange woorden breken niet af op de telefoon.
  afbreken: ['index.html', '  .bestel-overzicht, .bestel-noot, .mail-al-besteld, .melding-tekst { overflow-wrap: anywhere; }', ''],
  // 28b. Bij een twee keer vervangen ruit de tussenversie als "die NIET annuleren".
  geldig: ['pdf.js', "        var geldig = st && st.ruiten[id] && typeof st.ruiten[id] === 'object' ? st.ruiten[id] : o;",
                     "        var geldig = o;"],
  // 28c. Alles exporteren slaat na Stoppen de foto-pdf toch op.
  alles: ['pdf.js', "        if (stap.gestopt) return;\n", "        if (0) return;\n"]
  // 28. (zelfdemaat) staat sinds v110 in test-v110.js: alleen een ander
  // aantal is nu EXTRA, en dit scenario maakt geen VERVANGT meer.
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
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v105-'));
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
const pdfMap = fs.mkdtempSync(path.join(os.tmpdir(), 'v105-pdf-'));
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
// Het id van een ruit in de database, op merk (de app kiest de ids zelf).
const idVan = merk => String((rijVan(1).data.rijen.find(r => r.merk === merk) || {}).id);

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, page, m, bt;

  /* ══ 1 ════════════════════════════════════════════════════════ */
  console.log('\n1. Na de 1e bestelling: K1 nagemeten, K2 vervalt, K4 erbij, K5 half ingevuld');
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await eersteBestelling(page);
  check('de 1e is vastgelegd als volledige lijst', info().bestellingen[0].soort === 'volledig');
  await ontgrendel(page);
  await page.locator('#invoerBody input.breedte-input').first().fill('1210');       // K1, echt getypt
  await wacht(400);
  await page.locator('#invoerBody button.btn-del').nth(1).click();                   // K2 weg, echte klik
  await wacht(500);
  await ruitErbij(page, { merk: 'K4', breedte: '500', hoogte: '700', glasType: 'HR++ glas', opbouw: '4-15-4' });
  await ruitErbij(page, { merk: 'K5', breedte: '600', hoogte: '600' });              // nog geen glastype
  bt = await bestelTekst(page);
  check('op Bestellijst: Gewijzigd (1) K1, met waar hij besteld is', /Gewijzigd \(1\)/.test(bt) &&
    /K1: breedte 1200 → 1210.{0,60}\(besteld in de 1e\)/.test(bt), bt.slice(0, 500));
  check('Nieuw (2): K4, en K5 "nog niet compleet"', /Nieuw \(2\)/.test(bt) && /K4 glasmaat 492 × 692/.test(bt) &&
    /K5 .{0,40}nog niet compleet/.test(bt), bt.slice(0, 600));
  check('Vervallen (1): K2, "komt op de aanvulling onder annuleren"', /Vervallen \(1\) — komt op de aanvulling onder "annuleren"/.test(bt) &&
    /K2 glasmaat 792 × 1392 HR\+\+ glas \(1e\) — besteld, nu verwijderd/.test(bt), (bt.match(/Vervallen.{0,160}/) || [''])[0]);
  check('en wat de volgende pdf wordt: de 2e bestellijst, een aanvulling met 2 ruiten en 1 te annuleren',
    /de 2e bestellijst, een aanvulling met alleen 2 nieuwe of gewijzigde ruiten en 1 te annuleren/.test(bt),
    (bt.match(/Maak de bestellijst.{0,160}/) || [''])[0]);
  const p1 = { pad: await bestellijstPdf(page, ONVOLLEDIG) };
  check('eerst de vraag of K2 echt mag vervallen ("Laten annuleren?"), dan "Niet alles gaat mee" voor K5',
    gevraagd.join(' / ') === 'Laten annuleren? / Niet alles gaat mee', gevraagd.join(' / '));
  check('de pdf heet …_2e_aanvulling.pdf', /^Bestellijst_Kerkstraat_1_2e_aanvulling\.pdf$/.test(laatsteNaam), laatsteNaam);
  const t1 = plat(pdfTekst(p1.pad));
  check('de pdf heet AANVULLING en zegt waar hij op volgt', /Bestellijst glas - AANVULLING/.test(t1) &&
    /2e BESTELLIJST = AANVULLING op de eerdere bestelling \(1e van \d\d-\d\d-\d{4}\)/.test(t1), t1.slice(0, 250));
  check('en hoe hij te lezen is (NIEUW, VERVANGT, de rest blijft zoals besteld)',
    /blijft zoals besteld/.test(t1) && /NIEUW = nieuwe ruit/.test(t1) && /VERVANGT = maak deze in plaats van/.test(t1));
  check('K1: VERVANGT K1 uit de 1e (1x 1192 x 592), met de nieuwe glasmaat 1202', /K1 VERVANGT K1 uit de 1e \(1x 1192 x 592\) 1202/.test(t1),
    (t1.match(/K1 VERV.{0,60}/) || [''])[0]);
  check('K4: NIEUW', /K4 NIEUW 492 692/.test(t1), (t1.match(/K4.{0,40}/) || [''])[0]);
  check('K3 (ongewijzigd, al besteld) staat er NIET op: anders maakt de leverancier hem dubbel', !/K3/.test(t1));
  check('K5 (niet compleet) staat er niet op', !/K5/.test(t1));
  const ann1 = (t1.match(/ANNULEREN, als dat nog kan Merk.{0,300}/) || [''])[0];
  check('tabel ANNULEREN: K2 (vervalt), met zijn maat en uit welke lijst', /K2 1 792 1392 HR\+\+ glas 4-15-4 1e vervalt/.test(ann1), ann1);
  check('en de oude K1 (vervangen door K1 op deze lijst)', /K1 1 1192 592 HR\+\+ glas 4-15-4 1e vervangen door K1 op deze lijst/.test(ann1), ann1);
  check('de totalen tellen alleen deze aanvulling', /2 posities \| 2 ruiten/.test(t1) &&
    /alleen deze aanvulling: 1 NIEUW, 1 VERVANGT, 1 ANNULEREN/.test(t1), (t1.match(/\d+ posities.{0,120}/) || [''])[0]);
  m = await vraagOpScherm(page);
  check('de vraag: "Dit wordt de 2e bestellijst, een aanvulling"', m.ok && /Dit wordt de 2e bestellijst, een aanvulling/.test(m.tekst),
    m.tekst.slice(0, 200));
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
  let bl = info().bestellingen || [];
  const b2 = bl[1] || {};
  check('in de database: 2 bestellingen, de 2e een aanvulling', bl.length === 2 && b2.soort === 'aanvulling' && b2.nr === 2,
    JSON.stringify(bl.map(b => b.nr + ':' + b.soort)));
  const id4 = idVan('K4'), id5 = idVan('K5');
  check('de aanvulling bevat K1 (vervangt de 1e) en K4 op de lijst; K5 bekend, niet besteld; K3 niet',
    b2.ruiten && b2.ruiten[1] && b2.ruiten[1].opLijst && b2.ruiten[1].vervangt === 1 && b2.ruiten[id4] && b2.ruiten[id4].opLijst &&
    b2.ruiten[id5] && b2.ruiten[id5].opLijst === false && !b2.ruiten[3] && Object.keys(b2.ruiten).length === 3,
    Object.keys(b2.ruiten).join() + ' ' + id4 + ' ' + id5);
  check('en K2 als geannuleerd, met zijn maat', b2.vervallen && b2.vervallen[2] && b2.vervallen[2].merk === 'K2' &&
    b2.vervallen[2].nr === 1, JSON.stringify(b2.vervallen || {}));
  check('status besteld, weer op slot', rijVan(1).status === 'besteld' && await opSlot(page));
  check('oude apparaten: besteld = K1 (nieuw), K3 (uit de 1e), K4, plus K5 (bekend), geen K2; aantal 3',
    Object.keys(info().besteld.ruiten).sort().join() === ['1', '3', id4, id5].sort().join() && info().besteld.aantal === 3 &&
    info().besteld.ruiten[1] === b2.ruiten[1].k, JSON.stringify(info().besteld).slice(0, 200));
  check('het logboek: "2e bestellijst (aanvulling) verstuurd …, 2 posities, 1 te annuleren"',
    /2e bestellijst \(aanvulling\) verstuurd naar de leverancier, 2 posities, 1 te annuleren/.test(rijVan(1).samenvatting || ''),
    rijVan(1).samenvatting);
  check('niets meer geel: alles klopt met wat er besteld is (K3 uit de 1e ook)',
    await page.evaluate(() => rijen.every(r => !naBestellingGewijzigd(r))) && await page.$eval('#bestelVerschil', e => e.hidden));
  bt = await bestelTekst(page);
  check('op Bestellijst: in totaal 3 ruiten in 3 posities, de 1e plus de aanvullingen',
    /in totaal 3 ruiten in 3 posities \(de 1e bestellijst plus de aanvullingen\)/.test(bt),
    bt.slice(0, 300));
  check('en de geschiedenis: 1e bestellijst, 2e (aanvulling) met 1 geannuleerd', /1e bestellijst —/.test(bt) &&
    /2e bestellijst \(aanvulling\) — .{0,60}2 posities, 1 geannuleerd/.test(bt), bt.slice(0, 300));

  /* ══ 2 ════════════════════════════════════════════════════════ */
  console.log('\n2. De 3e lijst vervangt een ruit uit de 1e (K3) en een uit de 2e (K4)');
  await ontgrendel(page);
  await page.evaluate(() => {
    rijen.find(r => r.merk === 'K3').aantal = 2;
    rijen.find(r => r.merk === 'K4').hoogte = '710';
    herbereken(); renderTabel(); opslaan();
  });
  await wacht(500);
  const titel3 = await page.$eval('#rij-3 td.rijnr', e => e.title);
  check('K3 geel, met "in de 1e bestellijst" in de uitleg', /Anders dan besteld \(in de 1e bestellijst, .*\): aantal 1 → 2/.test(titel3), titel3.slice(0, 120));
  const p2 = { pad: await bestellijstPdf(page, ONVOLLEDIG) };
  check('de pdf heet …_3e_aanvulling.pdf', /_3e_aanvulling\.pdf$/.test(laatsteNaam), laatsteNaam);
  const t2 = plat(pdfTekst(p2.pad));
  check('de balk noemt beide eerdere bestellingen', /AANVULLING op de eerdere bestelling \(1e van [\d-]+, 2e van [\d-]+\)/.test(t2),
    t2.slice(0, 250));
  // v110 (keuze van Jan): alleen een ander aantal is EXTRA, niet meer
  // VERVANGT. Een VERVANGT met dezelfde maat (zo legden v105–v109 dit vast)
  // test test-v110.js, onderdeel 9.
  check('K3: EXTRA bij K3 uit de 1e: +1 (samen 2x), met aantal 1', /1 K3 EXTRA bij K3 uit de 1e: \+1 \(samen 2x\)/.test(t2),
    (t2.match(/.{0,4}K3.{0,50}/) || [''])[0]);
  check('K4: VERVANGT K4 uit de 2e (1x 492 x 692)', /K4 VERVANGT K4 uit de 2e \(1x 492 x 692\)/.test(t2), (t2.match(/K4.{0,50}/) || [''])[0]);
  check('K1 (al vervangen in de 2e, sindsdien gelijk) staat er niet op', !/K1/.test(t2));
  m = await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 3, 10000);
  bl = info().bestellingen;
  check('3 bestellingen; in de 3e alleen K3 en K4 op de lijst', bl.length === 3 &&
    Object.keys(bl[2].ruiten).filter(id => bl[2].ruiten[id].opLijst).sort().join() === ['3', id4].sort().join(),
    JSON.stringify(Object.keys(bl[2].ruiten)));
  check('ingekort wat vervangen is (K1 en K3 in de 1e, K4 in de 2e), volledig wat nog geldt (K1 in de 2e)',
    bl[0].ruiten[1].kort === 1 && bl[0].ruiten[3].kort === 1 && bl[1].ruiten[id4].kort === 1 && !bl[1].ruiten[1].kort &&
    !bl[2].ruiten[3].kort, JSON.stringify([bl[0].ruiten[1], bl[1].ruiten[1]]).slice(0, 200));
  check('niets geel', await page.evaluate(() => rijen.every(r => !naBestellingGewijzigd(r))));
  bt = await bestelTekst(page);
  check('in totaal 4 ruiten in 3 posities (K3 is er nu 2): stuks, niet alleen posities', /in totaal 4 ruiten in 3 posities/.test(bt),
    (bt.match(/in totaal.{0,60}/) || [''])[0]);

  /* ══ 3 ════════════════════════════════════════════════════════ */
  console.log('\n3. Niets bij te bestellen: de pdf is een OVERZICHT, geen bestelling');
  // K5 is nog steeds half ingevuld en nooit besteld: daar vraagt de app naar.
  const p3 = await bestellijstPdf(page, ONVOLLEDIG);
  m = await vraagOpScherm(page);
  check('geen vraag', !m.ok, m.tekst.slice(0, 80));
  check('de pdf heet Overzicht_besteld_… (niet "Bestellijst")', /^Overzicht_besteld_Kerkstraat_1\.pdf$/.test(laatsteNaam), laatsteNaam);
  const t3 = plat(pdfTekst(p3));
  check('"Overzicht bestelde ruiten - GEEN BESTELLING", met alle drie de lijsten',
    /Overzicht bestelde ruiten - GEEN BESTELLING/.test(t3) && /GEEN nieuwe bestelling/.test(t3) &&
    /\(1e van [\d-]+, 2e van [\d-]+, 3e van [\d-]+\)/.test(t3), t3.slice(0, 250));
  const gv3 = (t3.match(/GEVRAAGD TE ANNULEREN \(kan toch geleverd zijn\) Merk.{0,500}/) || [''])[0];
  check('en wat er gevraagd is te annuleren (kan toch geleverd zijn): K2, en de oude maat van K1 en K4',
    /K2 1 792 1392 .{0,30}1e vervallen, gevraagd in de 2e/.test(gv3) &&
    /K1 1 1192 592 .{0,30}1e oude maat, vervangen in de 2e; geldig is nu K1 1202 x 592 uit de 2e \(die NIET annuleren\)/.test(gv3) &&
    /K4 1 492 692 .{0,30}2e oude maat, vervangen in de 3e; geldig is nu K4 492 x 702 uit de 3e/.test(gv3), gv3);
  check('maar niet K3 (alleen het aantal veranderde: EXTRA, niets te annuleren)',
    !/K3 1 892 892/.test(gv3), gv3);
  check('kolom Besteld: K1 in de 2e, K3 1e + 3e (1 + 1, v110), K4 in de 3e', /Besteld/.test(t3) && /K1 2e/.test(t3) &&
    /K3 1e \+ 3e \(1 \+ 1\)/.test(t3) && /K4 3e/.test(t3),
    (t3.match(/Pos.{0,200}/) || [''])[0]);
  check('alles wat besteld is staat erop (3 posities, 4 ruiten)', /3 posities \| 4 ruiten/.test(t3) && /alles wat besteld is/.test(t3),
    (t3.match(/\d+ posities.{0,80}/) || [''])[0]);
  check('niets vastgelegd', (info().bestellingen || []).length === 3);

  /* ══ 4 ════════════════════════════════════════════════════════ */
  console.log('\n4. De 3e intrekken: de 1e en 2e gelden weer, K3 en K4 staan geel');
  await page.click('.tab-btn:has-text("Bestellijst")');
  await page.click('#bestellijstInhoud button:has-text("Intrekken")');
  m = await wachtOpMelding(page, /3e bestellijst \(aanvulling\) van/, 4000);
  check('de vraag noemt "3e bestellijst (aanvulling)"', m.ok, m.tekst.slice(0, 120));
  await page.fill('.melding-laag input[type=password]', 'geheim');
  await knop(page, 'Intrekken');
  await wachtTot(() => !!(info().bestellingen[2] || {}).ingetrokken, 10000);
  check('ingetrokken; status blijft besteld (de 1e en 2e gelden)', !!info().bestellingen[2].ingetrokken && rijVan(1).status === 'besteld');
  const geel4 = await page.evaluate(() => rijen.filter(r => naBestellingGewijzigd(r)).map(r => r.merk).sort().join());
  check('K3 en K4 geel (anders dan in de 1e en 2e), K1 niet', geel4 === 'K3,K4', geel4);
  bt = await bestelTekst(page);
  check('op Bestellijst: K3 "besteld in de 1e", K4 "besteld in de 2e"', /K3: aantal 1 → 2 \(besteld in de 1e\)/.test(bt) &&
    /K4: hoogte 700 → 710.{0,80}\(besteld in de 2e\)/.test(bt), bt.slice(0, 600));
  check('oude apparaten: besteld weer = de stand na de 2e', info().besteld.ruiten[3] === info().bestellingen[0].ruiten[3].k &&
    info().besteld.ruiten[id4] === info().bestellingen[1].ruiten[id4].k);
  await ctx.close();

  console.log('\n3b. Een ruit die twee keer is nagemeten: het overzicht noemt steeds de maat die nu geldt');
  {
    bestelProject();
    const c3 = await nieuweContext();
    await c3.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    const p3b = await nieuwePagina(c3);
    await open(p3b, 1);
    await eersteBestelling(p3b);
    for (const maat of ['1210', '1218']) {
      await ontgrendel(p3b);
      await p3b.locator('#invoerBody input.breedte-input').first().fill(maat);
      await wacht(500);
      await bestellijstPdf(p3b);
      await vraagOpScherm(p3b);
      await knop(p3b, 'Ja, verstuurd');
      await wachtTot(() => (info().bestellingen || []).length === (maat === '1210' ? 2 : 3), 10000);
    }
    const t3b = plat(pdfTekst(await bestellijstPdf(p3b)));
    const gv3b = (t3b.match(/GEVRAAGD TE ANNULEREN.{0,500}/) || [''])[0];
    check('de oude 1192 en de tussenversie 1202: allebei "geldig is nu K1 1210 x 592 uit de 3e"',
      /K1 1 1192 592 .{0,30}1e oude maat, vervangen in de 2e; geldig is nu K1 1210 x 592 uit de 3e/.test(gv3b) &&
      /K1 1 1202 592 .{0,30}2e oude maat, vervangen in de 3e; geldig is nu K1 1210 x 592 uit de 3e/.test(gv3b) &&
      !/door K1 1202/.test(gv3b), gv3b);
    await c3.close();
  }

  /* ══ 5 ════════════════════════════════════════════════════════ */
  console.log('\n5. Alleen iets laten vervallen: een aanvulling zonder tabel, met ANNULEREN');
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await eersteBestelling(page);
  await ontgrendel(page);
  await page.locator('#invoerBody button.btn-del').nth(2).click();                   // K3 weg
  await wacht(500);
  const p5 = await bestellijstPdf(page);
  const t5 = plat(pdfTekst(p5));
  check('de pdf: "Geen nieuwe of gewijzigde ruiten", en ANNULEREN K3', /Geen nieuwe of gewijzigde ruiten op deze aanvulling/.test(t5) &&
    /ANNULEREN, als dat nog kan Merk .{0,80}K3 1 892 892 HR\+\+ glas 4-15-4 1e vervalt/.test(t5),
    (t5.match(/Geen nieuwe.{0,300}/) || [t5.slice(0, 400)])[0]);
  check('geen tabel met K1 of K2', !/K1/.test(t5) && !/K2/.test(t5));
  m = await vraagOpScherm(page);
  check('wel de vraag (een annulering is ook een bericht aan de leverancier)', m.ok);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
  check('vastgelegd: 0 posities, K3 geannuleerd', info().bestellingen[1].aantal === 0 && !!info().bestellingen[1].vervallen[3]);
  bt = await bestelTekst(page);
  check('daarna niets meer vervallen, en in totaal 2 ruiten', !/Vervallen/.test(bt) && /in totaal 2 ruiten/.test(bt), bt.slice(0, 300));
  await ctx.close();

  /* ══ 6 ════════════════════════════════════════════════════════ */
  console.log('\n6. Een iPad die offline was, kende de aanvulling niet');
  // Echte situatie: Bart past op de iPad zonder bereik een opmerking bij K3
  // aan. Op kantoor meet Julian K1 na (1210), zet K4 erbij, laat K2 vervallen
  // en verstuurt de aanvulling. Dan krijgt de iPad weer bereik en slaat hij
  // het hele project op: wie het laatst opslaat, wint de ruiten (bekend,
  // zie de handover). De iPad heeft dan K1 nog op 1200, K2 nog, en geen K4.
  // Belofte: de aanvulling blijft bestaan, en de volgende lijst bestelt
  // níet de oude K1 opnieuw en annuleert níet stil K4. De app herkent een
  // oudere stand (niet gewijzigd sinds de bestelling) en biedt terugzetten.
  async function ipadKentAanvullingNiet(zonderTrigger, herstart) {
    bestelProject();
    S.zonderTrigger = zonderTrigger;
    const kantoor = await nieuweContext({}, 'kantoor');
    await kantoor.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    const ipad = await nieuweContext({}, 'ipad');
    await ipad.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    const pk = await nieuwePagina(kantoor);
    await open(pk, 1);
    await eersteBestelling(pk);
    const pi = await nieuwePagina(ipad);
    await open(pi, 1);
    S.weg.ipad = true;
    await ontgrendel(pi);
    await pi.evaluate(() => { rijen[2].opmerking = 'van de iPad'; renderTabel(); window.opslaan(); });
    await wacht(1200);
    await open(pk, 1);
    await ontgrendel(pk);
    await pk.locator('#invoerBody input.breedte-input').first().fill('1210');
    await wacht(400);
    await pk.locator('#invoerBody button.btn-del').nth(1).click();          // K2 vervalt
    await wacht(400);
    await pk.evaluate(() => { const r = nieuweRij(); Object.assign(r, { merk: 'K4', breedte: '500', hoogte: '700',
      glasType: 'HR++ glas', opbouw: '4-15-4' }); rijen.push(r); herbereken(); renderTabel(); opslaan(); });
    await wacht(600);
    await bestellijstPdf(pk);
    await vraagOpScherm(pk);
    await knop(pk, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
    S.weg.ipad = false;
    if (herstart) { await pi.goto('about:blank'); await pi.goto(adres + '#project=' + P(1)); }
    else await pi.evaluate(() => window.dispatchEvent(new Event('online')));
    await wachtTot(() => rijVan(1).data.rijen.some(r => r.opmerking === 'van de iPad'), 15000);
    await wacht(2500);
    await sluitMeldingen(pi);
    const w = await pi.evaluate(() => {
      const x = wijzigingenSindsBestelling();
      const m = l => l.map(o => (o.rij || o.oud || {}).merk).sort().join();
      return { gewijzigd: m(x.gewijzigd), ouder: m(x.ouder), vervallen: x.vervallen.map(v => v.oud.merk).join(),
               nieuw: x.nieuw.map(r => r.merk).join(), ouderGeannuleerd: x.ouder.filter(o => o.geannuleerd).map(o => o.rij.merk).join() };
    });
    const uit = {
      db: (info().bestellingen || []).map(b => b.nr + ':' + (b.soort || '')).join(','),
      dbStatus: rijVan(1).status,
      ipad: await pi.evaluate(() => (projectInfo.bestellingen || []).map(b => b.nr + ':' + (b.soort || '')).join(',')),
      ipadNr1: await pi.evaluate(() => besteldeStand().nr[1]),
      w: w
    };
    return { uit: uit, pi: pi, kantoor: kantoor, ipad: ipad };
  }
  let r6 = await ipadKentAanvullingNiet(false, false);
  let u6 = r6.uit;
  check('met script 23: beide bestellingen blijven, de 2e een aanvulling', u6.db === '1:volledig,2:aanvulling' &&
    u6.ipad === u6.db && u6.ipadNr1 === 2, JSON.stringify(u6));
  check('de iPad ziet: K1 en K2 een OUDERE STAND (K2 was geannuleerd), K4 weg, K3 echt gewijzigd',
    u6.w.ouder === 'K1,K2' && u6.w.ouderGeannuleerd === 'K2' && u6.w.vervallen === 'K4' && u6.w.gewijzigd === 'K3' && !u6.w.nieuw,
    JSON.stringify(u6.w));
  let pi = r6.pi;
  await pi.click('.tab-btn:has-text("Bestellijst")');
  bt = await pi.$eval('#bestellijstInhoud', e => e.innerText.replace(/\s+/g, ' '));
  check('op Bestellijst: "Oudere stand (2)" met uitleg, en de knoppen', /Oudere stand \(2\) — anders dan besteld, maar niet gewijzigd/.test(bt) &&
    /geannuleerd in de 2e bestellijst/.test(bt) && /Zet terug zoals besteld/.test(bt), (bt.match(/Oudere stand.{0,200}/) || [bt.slice(0, 200)])[0]);
  // Pdf op de iPad: eerst de oudere stand, dan K4. Allebei terugzetten.
  await pi.click('.tab-btn:has-text("Invoer")');
  await ontgrendel(pi);
  let p6 = await bestellijstPdf(pi, { 'Oudere stand?': 'Zet terug zoals besteld' });
  m = await wachtOpMelding(pi, /teruggezet zoals besteld/, 4000);
  check('pdf: eerst "Oudere stand?"; terugzetten → geen pdf, wel de melding', !p6 && gevraagd[0] === 'Oudere stand?' && m.ok,
    gevraagd.join(' / ') + ' | ' + m.tekst.slice(0, 80));
  await sluitMeldingen(pi);
  const terug1 = await pi.evaluate(() => ({ k1: rijen.find(r => r.merk === 'K1').breedte, k2: rijen.some(r => r.merk === 'K2') }));
  check('K1 weer 1210 (zoals besteld), K2 weer weg (zoals geannuleerd)', terug1.k1 === "1210" && !terug1.k2, JSON.stringify(terug1));
  p6 = await bestellijstPdf(pi, { 'Laten annuleren?': 'Zet terug zoals besteld' });
  m = await wachtOpMelding(pi, /teruggezet zoals besteld/, 4000);
  check('daarna: "Laten annuleren?" voor K4; terugzetten → K4 er weer, zoals besteld', !p6 && gevraagd[0] === 'Laten annuleren?' &&
    await pi.evaluate(() => { const r = rijen.find(x => x.merk === 'K4'); return !!r && r.breedte === '500' && r.glasType === 'HR++ glas'; }),
    gevraagd.join(' / '));
  await sluitMeldingen(pi);
  p6 = await bestellijstPdf(pi);
  const t6 = plat(pdfTekst(p6));
  check('de pdf van de iPad: alleen K3 (de echte wijziging), geen K1, K2 of K4; te annuleren alleen de oude K3',
    /K3 VERVANGT K3 uit de 1e/.test(t6) && !/K1 /.test(t6) && !/K2 /.test(t6) && !/K4 /.test(t6) &&
    /ANNULEREN, als dat nog kan Merk .{0,80}K3 1 892 892 .{0,30}1e vervangen door K3 op deze lijst/.test(t6) && !/vervalt/.test(t6),
    t6.slice(t6.indexOf('Pos'), t6.indexOf('Pos') + 400));
  await vraagOpScherm(pi);
  await knop(pi, 'Nee, alleen bekeken');
  await r6.kantoor.close(); await r6.ipad.close(); S.zonderTrigger = false;

  r6 = await ipadKentAanvullingNiet(true, true);
  u6 = r6.uit;
  check('zonder script 23, na een herstart: de app voegt zelf samen, de aanvulling blijft',
    u6.db === '1:volledig,2:aanvulling' && u6.ipadNr1 === 2 && u6.dbStatus === 'besteld' && u6.w.ouder === 'K1,K2', JSON.stringify(u6));
  // "Nee, toch zo bestellen": de oudere stand telt dan als wijziging.
  pi = r6.pi;
  await pi.click('.tab-btn:has-text("Invoer")');
  await ontgrendel(pi);
  await pi.click('.tab-btn:has-text("Bestellijst")');
  await pi.click('#bestellijstInhoud button:has-text("Nee, toch zo bestellen")');
  await wacht(600);
  const toch = await pi.evaluate(() => { const x = wijzigingenSindsBestelling(); return { ouder: x.ouder.length,
    gewijzigd: x.gewijzigd.map(g => g.rij.merk).sort().join(), nieuw: x.nieuw.map(r => r.merk).join() }; });
  check('"Nee, toch zo bestellen": K1 gewijzigd (VERVANGT), K2 nieuw; geen oudere stand meer',
    toch.ouder === 0 && toch.gewijzigd === 'K1,K3' && toch.nieuw === 'K2', JSON.stringify(toch));
  await r6.kantoor.close(); await r6.ipad.close(); S.zonderTrigger = false;

  r6 = await ipadKentAanvullingNiet(true, false);
  u6 = r6.uit;
  check('zonder script 23, bereik komt terug: de aanvulling blijft, en de oudere stand wordt herkend',
    u6.db === '1:volledig,2:aanvulling' && u6.ipadNr1 === 2 && u6.w.ouder === 'K1,K2', JSON.stringify(u6));
  await r6.kantoor.close(); await r6.ipad.close(); S.zonderTrigger = false;

  console.log('\n6b. Een iPad die offline was vóór de 1e bestelling: zijn K1 is nooit besteld, maar ouder');
  // Echte situatie: de iPad laadt het project en gaat het dak op (geen
  // bereik). Op kantoor wordt K1 nagemeten (1205) en de 1e bestellijst
  // verstuurd. Op het dak past Bart K3 aan (een opmerking). Terug op de
  // grond slaat de iPad het hele project op: K1 weer 1200.
  // - K1 (1200) is nooit besteld; zijn stempel is ouder dan de bestelde
  //   1205: een oudere stand, geen wijziging.
  // - K3 is van ná de laatste keer dat kantoor bijwerkte: een echte
  //   wijziging, ook al gebeurde hij vóór de bestelling.
  bestelProject();
  {
    const kantoor = await nieuweContext({}, 'kantoor');
    await kantoor.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    const ipad = await nieuweContext({}, 'ipad');
    const pk = await nieuwePagina(kantoor);
    const pi2 = await nieuwePagina(ipad);
    await open(pk, 1);
    await open(pi2, 1);
    S.weg.ipad = true;
    await pk.locator('#invoerBody input.breedte-input').first().fill('1205');
    await wachtTot(() => rijVan(1).data.rijen[0].breedte === '1205' && rijVan(1).data.rijen[0].gewOp !== INGEMETEN.gewOp, 10000);
    await wacht(300);
    await pi2.evaluate(() => { rijen[2].opmerking = 'van het dak'; renderTabel(); window.opslaan(); });
    await wacht(1200);
    await eersteBestelling(pk);
    S.weg.ipad = false;
    await pi2.evaluate(() => window.dispatchEvent(new Event('online')));
    await wachtTot(() => rijVan(1).data.rijen[2].opmerking === 'van het dak', 15000);
    await wacht(2500);
    const w6b = await pi2.evaluate(() => { const x = wijzigingenSindsBestelling();
      return { ouder: x.ouder.map(o => o.rij.merk).join(), gewijzigd: x.gewijzigd.map(g => g.rij.merk).join(),
               k1: rijen[0].breedte }; });
    check('K1 (1200, nooit besteld, ouder stempel): oudere stand; K3 (van het dak): echte wijziging',
      w6b.k1 === '1200' && w6b.ouder === 'K1' && w6b.gewijzigd === 'K3', JSON.stringify(w6b));
    // Bart typt nu iets bij die K1 (nog niet opgeslagen). De maat erin is nog
    // steeds de oude: K1 blijft een oudere stand, en de vraag noemt beide.
    // Zo bestelt niemand stil de oude maat opnieuw.
    const vers = await pi2.evaluate(() => { rijen[0].opmerking = 'nu getypt'; herbereken();
      const x = wijzigingenSindsBestelling(); return { ouder: x.ouder.map(o => o.rij.merk + ': ' + o.verschil.join('; ')).join(),
        gewijzigd: x.gewijzigd.map(g => g.rij.merk).sort().join() }; });
    check('typt Bart er nu iets bij, dan blijft K1 een oudere stand (met de oude maat én zijn opmerking in de uitleg)',
      /^K1: breedte 1205 → 1200; opmerking \(leeg\) → nu getypt/.test(vers.ouder) && vers.gewijzigd === 'K3', JSON.stringify(vers));
    await kantoor.close(); await ipad.close();
  }

  console.log('\n6c. Dezelfde ruit op twee apparaten: iPad een opmerking, kantoor een nieuwe maat');
  // Echte situatie (beoordeling ronde 2): de iPad zet offline bij K1 alleen
  // "draairichting links" (de maat staat daar nog op 1200). Kantoor meet K1
  // na op 1210 en verstuurt de aanvulling. De iPad komt terug: K1 staat weer
  // op 1200, met de opmerking. De oude maat is geen wijziging; de opmerking
  // wel. Terugzetten zet alleen de maat terug.
  bestelProject();
  {
    const kantoor = await nieuweContext({}, 'kantoor');
    await kantoor.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    const ipad = await nieuweContext({}, 'ipad');
    await ipad.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    const pk = await nieuwePagina(kantoor);
    await open(pk, 1);
    await eersteBestelling(pk);
    const pi3 = await nieuwePagina(ipad);
    await open(pi3, 1);
    S.weg.ipad = true;
    await ontgrendel(pi3);
    await pi3.evaluate(() => { rijen[0].opmerking = 'draairichting links'; renderTabel(); window.opslaan(); });
    await wacht(1200);
    await open(pk, 1);
    await ontgrendel(pk);
    await pk.locator('#invoerBody input.breedte-input').first().fill('1210');
    await wacht(500);
    await bestellijstPdf(pk);
    await vraagOpScherm(pk);
    await knop(pk, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
    S.weg.ipad = false;
    await pi3.evaluate(() => window.dispatchEvent(new Event('online')));
    await wachtTot(() => rijVan(1).data.rijen[0].opmerking === 'draairichting links', 15000);
    await wacht(2500);
    await sluitMeldingen(pi3);
    if (await opSlot(pi3)) await ontgrendel(pi3);
    const w6c = await pi3.evaluate(() => { const x = wijzigingenSindsBestelling();
      return { ouder: x.ouder.map(o => o.rij.merk + ':' + (o.velden || ['heel']).join('+')).join(),
               verschil: x.ouder.map(o => o.verschil.join('; ')).join(), gewijzigd: x.gewijzigd.map(g => g.rij.merk).join() }; });
    check('K1: alleen de breedte is een oudere stand (de opmerking niet)', w6c.ouder === 'K1:breedte' &&
      /breedte 1210 → 1200 \(een eerder bestelde waarde\)/.test(w6c.verschil) && !w6c.gewijzigd, JSON.stringify(w6c));
    const p6c = await bestellijstPdf(pi3, { 'Oudere stand?': 'Zet terug zoals besteld' });
    const vraag6c = gevraagd.join();
    await wachtOpMelding(pi3, /teruggezet zoals besteld/, 4000);
    await sluitMeldingen(pi3);
    const k1 = await pi3.evaluate(() => ({ b: rijen[0].breedte, o: rijen[0].opmerking }));
    check('terugzetten: breedte weer 1210, de opmerking van de iPad blijft', !p6c && vraag6c === 'Oudere stand?' &&
      k1.b === '1210' && k1.o === 'draairichting links', JSON.stringify(k1));
    const w6c2 = await pi3.evaluate(() => wijzigingenSindsBestelling().gewijzigd.map(g => g.rij.merk + ': ' + g.verschil.join('; ')).join());
    check('daarna is K1 gewoon gewijzigd: alleen de opmerking', /^K1: opmerking \(leeg\) → draairichting links$/.test(w6c2), w6c2);
    await kantoor.close(); await ipad.close();
  }

  console.log('\n6d. Een iPad met een klok die achterloopt: een echte wijziging lijkt ouder; de vraag zegt wie en wanneer');
  // Echte situatie: kantoor meet K1 na (1205) en bestelt. Daarna past Bart op
  // een iPad waarvan de klok een kwartier achterloopt K1 aan (hoogte 610).
  // Zijn stempel is ouder dan de bestelde versie: de app kan dat niet van
  // een oudere stand onderscheiden. Belofte: niets stil; de vraag noemt wie
  // en wanneer, stelt geen knop voor, en "Nee, toch zo bestellen" zet hem
  // op de aanvulling.
  bestelProject();
  {
    const kantoor = await nieuweContext({}, 'kantoor');
    await kantoor.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    const pk = await nieuwePagina(kantoor);
    await open(pk, 1);
    await pk.locator('#invoerBody input.breedte-input').first().fill('1205');
    await wachtTot(() => rijVan(1).data.rijen[0].breedte === '1205' && rijVan(1).data.rijen[0].gewOp !== INGEMETEN.gewOp, 10000);
    await eersteBestelling(pk);
    const ipad = await nieuweContext({}, 'ipad');
    const pi4 = await nieuwePagina(ipad);
    await open(pi4, 1);
    await ontgrendel(pi4);
    await pi4.locator('#invoerBody input.hoogte-input').first().fill('610');
    await wachtTot(() => rijVan(1).data.rijen[0].hoogte === '610', 10000);
    await wacht(500);
    // De klok van de iPad liep een kwartier achter: zo had zijn stempel er uitgezien.
    const g = info().bestellingen[0].ruiten[1].g;
    await pi4.evaluate(g => { rijen[0].gewOp = new Date(Date.parse(g) - 15 * 60000).toISOString(); rijen[0].gewDoor = 'bart';
      window.opslaan(); }, g);
    await wachtTot(() => rijVan(1).data.rijen[0].gewDoor === 'bart' && Date.parse(rijVan(1).data.rijen[0].gewOp) < Date.parse(g), 10000);
    await ipad.close();
    await open(pk, 1);
    if (await opSlot(pk)) await ontgrendel(pk);
    await pk.click('button:has-text("⬇ Exporteren")');
    await pk.click('button:has-text("Bestellijst als PDF")');
    m = await wachtOpMelding(pk, /Oudere stand\?/, 6000);
    const knoppen6d = await pk.$$eval('.melding-laag .melding-knoppen button', b => b.map(x => x.className));
    check('de vraag noemt wie en wanneer ("laatst gewijzigd door bart op …")', m.ok && /laatst gewijzigd door bart op/.test(m.tekst),
      m.tekst.slice(0, 260));
    check('en stelt geen knop voor (geen hoofdknop)', knoppen6d.length === 3 && !knoppen6d.some(c => /btn-primary/.test(c)),
      JSON.stringify(knoppen6d));
    await knop(pk, 'Nee, toch zo bestellen');
    await wachtOpMelding(pk, /tellen nu als wijziging|telt nu als wijziging/, 4000);
    await sluitMeldingen(pk);
    const p6d = await bestellijstPdf(pk);
    const t6d = plat(pdfTekst(p6d));
    check('daarna: K1 gaat mee op de aanvulling (VERVANGT, hoogte 610)', /K1 VERVANGT K1 uit de 1e/.test(t6d) && /1197 602/.test(t6d),
      (t6d.match(/K1 VERV.{0,80}/) || [t6d.slice(0, 200)])[0]);
    await vraagOpScherm(pk);
    await knop(pk, 'Nee, alleen bekeken');
    await kantoor.close();
  }

  /* ══ 7 ════════════════════════════════════════════════════════ */
  console.log('\n7. Een project met bestellingen van v104 (toen was elke lijst volledig)');
  // Als v104 al gebruikt is: de 2e lijst verving de 1e (K2 stond er niet
  // meer op en was dus vervallen). Dat moet zo blijven gelden.
  bestelProject();
  const k = await (async () => {
    ctx = await nieuweContext();
    await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
    page = await nieuwePagina(ctx);
    await open(page, 1);
    return page.evaluate(() => rijen.map(r => ({ id: r.id, k: ruitKenmerk(r), m: ruitMomentopname(r, true) })));
  })();
  const v104 = [
    { nr: 1, op: '2026-10-10T08:00:00.000Z', door: 'julian', via: 'pdf', aantal: 3, kort: true,
      ruiten: { 1: Object.assign({}, k[0].m, { kort: 1 }), 2: Object.assign({}, k[1].m, { kort: 1 }), 3: Object.assign({}, k[2].m, { kort: 1 }) } },
    { nr: 2, op: '2026-10-11T08:00:00.000Z', door: 'julian', via: 'pdf', aantal: 2,
      ruiten: { 1: k[0].m, 3: k[2].m } }
  ];
  rijVan(1).data.rijen = rijVan(1).data.rijen.filter(r => r.id !== 2);
  rijVan(1).data.info.bestellingen = v104;
  rijVan(1).data.info.status = 'besteld'; rijVan(1).status = 'besteld';
  await open(page, 1);
  bt = await bestelTekst(page);
  check('de 2e (v104) verving de 1e: K2 telt niet als vervallen, in totaal 2 ruiten (zonder "plus de aanvullingen")',
    !/Vervallen/.test(bt) && /in totaal 2 ruiten in 2 posities\./.test(bt) && /niets gewijzigd/.test(bt), bt.slice(0, 300));
  await ontgrendel(page);
  await ruitErbij(page, { merk: 'K6', breedte: '400', hoogte: '400', glasType: 'HR++ glas', opbouw: '4-15-4' });
  const p7 = await bestellijstPdf(page);
  const t7 = plat(pdfTekst(p7));
  check('een nieuwe ruit daarna: een aanvulling met alleen K6', /3e BESTELLIJST = AANVULLING/.test(t7) && /K6 NIEUW/.test(t7) &&
    !/K1/.test(t7) && !/K3/.test(t7), t7.slice(0, 300));
  await vraagOpScherm(page);
  await knop(page, 'Nee, alleen bekeken');
  await ctx.close();

  /* ══ 8 ════════════════════════════════════════════════════════ */
  console.log('\n8. Bestelmail: een aanvulling legt vast, het overzicht niet');
  // De mailfunctie is nog niet uitgerold (stand oktober 2026); hier
  // nagebootst als "gelukt". Wat de app daarna vastlegt, is van de app.
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await eersteBestelling(page);
  async function bestelmail() {
    await page.evaluate(() => bestelmailVenster());
    await page.waitForSelector('#mailVerstuur', { timeout: 8000 });
    const kop = await page.$eval('.mail-venster', e => e.innerText.replace(/\s+/g, ' '));
    const tekst = await page.$eval('#mailTekst', e => e.value.replace(/\s+/g, ' '));
    const onderwerp = await page.$eval('#mailOnderwerp', e => e.value);
    const bijlageVast = await page.$eval('#mailBijlage', e => e.checked && e.disabled);
    await page.fill('#mailExtra', 'inkoop@voorbeeld.nl');
    await page.click('#mailVerstuur');
    await wachtTot(async () => !(await page.$('#mailVerstuur')), 15000);
    await sluitMeldingen(page);
    return { kop: kop, tekst: tekst, onderwerp: onderwerp, bijlageVast: bijlageVast };
  }
  let mail = await bestelmail();
  check('niets veranderd: het venster zegt "niets bij te bestellen", de mail "GEEN nieuwe bestelling"',
    /Er is niets bij te bestellen/.test(mail.kop) && /GEEN nieuwe bestelling/.test(mail.tekst), mail.kop.slice(0, 160));
  check('en het onderwerp ook: "Overzicht bestelde ruiten, GEEN nieuwe bestelling"',
    /^Overzicht bestelde ruiten, GEEN nieuwe bestelling — Kerkstraat 1/.test(mail.onderwerp), mail.onderwerp);
  await wacht(800);
  check('en er is niets vastgelegd', (info().bestellingen || []).length === 1 &&
    await page.evaluate(() => projectInfo.bestellingen.length) === 1);
  await ontgrendel(page);
  await ruitErbij(page, { merk: 'K7', breedte: '300', hoogte: '300', glasType: 'HR++ glas', opbouw: '4-15-4' });
  mail = await bestelmail();
  check('met een nieuwe ruit: "Dit wordt een aanvulling", en de mail zegt AANVULLING', /Dit wordt een aanvulling/.test(mail.kop) &&
    /AANVULLING op onze eerdere bestelling/.test(mail.tekst) && /Aantal posities: 1 \(alleen deze aanvulling\)/.test(mail.tekst),
    mail.tekst.slice(0, 200));
  check('onderwerp "AANVULLING (2e bestellijst) glas — …", en de bijlage kan niet uit',
    /^AANVULLING \(2e bestellijst\) glas — Kerkstraat 1/.test(mail.onderwerp) && mail.bijlageVast, mail.onderwerp);
  await wachtTot(() => (info().bestellingen || []).length === 2, 10000);
  check('vastgelegd als aanvulling via de mail', (info().bestellingen[1] || {}).via === 'mail' &&
    info().bestellingen[1].soort === 'aanvulling' && !!info().bestellingen[1].ruiten[idVan('K7')],
    JSON.stringify(info().bestellingen[1] || {}).slice(0, 120));
  check('rechtstreeks: een lege aanvulling legt niets vast', await page.evaluate(() => bestellingVastleggen([], 'mail')) === null);
  await ctx.close();

  /* ══ 9 ════════════════════════════════════════════════════════ */
  console.log('\n9. Hoe groot wordt het project? (een project gaat in zijn geheel omhoog)');
  // Echte situatie: een grote woning met 120 ruiten, daarna drie
  // aanvullingen van een paar ruiten. Elke aanvulling bewaart alleen wat
  // erop staat; vervangen ruiten worden ingekort.
  resetDb();
  const veel = [];
  for (let i = 1; i <= 120; i++) veel.push(ruit(i, 'R' + i, String(600 + i), '900', KOMPLEET));
  rijVan(1).data.rijen = veel; rijVan(1).data.volgendId = 121;
  rijVan(1).data.info = { leverInstructie: 'achterom', opnemer: 'julian', status: 'bezig met inmeten/verwerken' };
  ctx = await nieuweContext();
  await ctx.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await eersteBestelling(page);
  const na1 = JSON.stringify(info().bestellingen).length;
  for (let n = 0; n < 3; n++) {
    await ontgrendel(page);
    await page.evaluate(n => { rijen[n * 3].breedte = '555'; rijen[n * 3 + 1].opmerking = 'nagemeten'; herbereken(); renderTabel(); opslaan(); }, n);
    await wacht(400);
    await bestellijstPdf(page);
    await vraagOpScherm(page);
    await knop(page, 'Ja, verstuurd');
    await wachtTot(() => (info().bestellingen || []).length === n + 2, 10000);
  }
  const na4 = JSON.stringify(info().bestellingen).length;
  check('drie aanvullingen van 2 ruiten maken de bestellingen niet meer dan 20% groter',
    na4 < na1 * 1.2, na1 + ' → ' + na4 + ' tekens');
  await ctx.close();

  /* ══ 10 ═══════════════════════════════════════════════════════ */
  console.log('\n10. Telefoon (Android, 412 px): het tabblad Bestellijst met een aanvulling, een intrekking en een oudere stand');
  bestelProject();
  ctx = await nieuweContext(Object.assign({}, devices['Pixel 7'], { serviceWorkers: 'block', acceptDownloads: true }));
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await page.evaluate(() => {
    // Wat er besteld is, rechtstreeks gezet (het bestellen zelf is hierboven getest).
    const k = r => ruitMomentopname(r, true);
    projectInfo.bestellingen = [
      { nr: 1, op: '2026-10-10T08:00:00.000Z', moment: '2026-10-10T08:00:00.000Z', soort: 'volledig', aantal: 3,
        ruiten: { 1: k(rijen[0]), 2: k(rijen[1]), 3: k(rijen[2]) } },
      { nr: 2, op: '2026-10-11T08:00:00.000Z', moment: '2026-10-11T08:00:00.000Z', soort: 'aanvulling', aantal: 1,
        ruiten: { 3: Object.assign(k(rijen[2]), { aantal: 3, vervangt: 1 }) }, ingetrokken: { op: '2026-10-11T09:00:00.000Z', door: 'julian' } },
      { nr: 3, op: '2026-10-12T08:00:00.000Z', moment: '2026-10-12T08:00:00.000Z', soort: 'aanvulling', aantal: 1,
        ruiten: { 1: Object.assign(k(rijen[0]), { k: 'anders', breedte: '1300', vervangt: 1 }) },
        vervallen: { 2: Object.assign(k(rijen[1]), { nr: 1, kort: 1 }) } }
    ];
    projectInfo.status = 'besteld';
    // Zonder spaties of streepjes: zo'n woord brak niet af (beoordeling).
    rijen[2].opmerking = 'Raamaandeoostgevelbovendekeukendeurlinksboven_K3_KLANTWENSmatglasmetfacetrandjes';
    rijen[2].gewOp = new Date().toISOString();
    herbereken(); renderTabel();
  });
  await page.click('.tab-btn:has-text("Bestellijst")');
  await wacht(400);
  const breed = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, raam: window.innerWidth,
    blok: (document.querySelector('.bestel-overzicht') || {}).scrollWidth, blokZicht: (document.querySelector('.bestel-overzicht') || {}).clientWidth,
    tekst: (document.querySelector('.bestel-overzicht') || {}).innerText || '' }));
  check('het bestelblok past op 412 px (geen zijwaarts scrollen)', breed.doc <= breed.raam + 1 && breed.blok <= breed.blokZicht + 1,
    JSON.stringify({ doc: breed.doc, raam: breed.raam, blok: breed.blok, zicht: breed.blokZicht }));
  check('met de ingetrokken 2e, een oudere stand (K1, en K2 die geannuleerd was) en de gewijzigde K3',
    /ingetrokken/.test(breed.tekst) && /Oudere stand \(2\)/.test(breed.tekst) && /Gewijzigd \(1\)/.test(breed.tekst),
    breed.tekst.replace(/\s+/g, ' ').slice(0, 400));
  await page.screenshot({ path: path.join(pdfMap, 'telefoon-bestellijst.png'), fullPage: false });
  // Een oudere stand die alleen in de opmerking verschilt (geen maat, en
  // zonder bruikbaar stempel): die herkent de app aan de eerder bestelde
  // versie. Kantoor zette in de 2e bij K2 "mat glas"; een ander apparaat
  // zette K2 terug zoals hij in de 1e stond.
  const alleenVersie = await page.evaluate(() => {
    const k = r => ruitMomentopname(r, true);
    const k2nieuw = Object.assign({}, rijen[1], { opmerking: 'mat glas' });
    projectInfo.bestellingen = [
      { nr: 1, op: '2026-10-10T08:00:00.000Z', soort: 'volledig', aantal: 3,
        ruiten: { 1: k(rijen[0]), 2: k(rijen[1]), 3: k(rijen[2]) } },
      { nr: 2, op: '2026-10-11T08:00:00.000Z', soort: 'aanvulling', aantal: 1,
        ruiten: { 2: Object.assign(k(k2nieuw), { vervangt: 1 }) } }
    ];
    const x = wijzigingenSindsBestelling();
    return { ouder: x.ouder.map(o => o.rij.merk + ':' + (o.velden ? o.velden.join('+') : 'heel')).join(),
             gewijzigd: x.gewijzigd.map(g => g.rij.merk).join() };
  });
  check('alleen de opmerking terug zoals in de 1e: herkend als oudere stand (aan de eerdere versie)',
    /K2:heel/.test(alleenVersie.ouder) && !/K2/.test(alleenVersie.gewijzigd), JSON.stringify(alleenVersie));
  await ctx.close();

  /* ══ 11 ═══════════════════════════════════════════════════════ */
  console.log('\n11. Op de pc: eerst "Laten annuleren?", dan pas het opslagvenster; Stoppen = geen venster');
  bestelProject();
  ctx = await nieuweContext();
  await ctx.addInitScript(() => {
    window.__venster = [];
    window.showSaveFilePicker = function (o) {
      // Stond de vraag nog open toen het opslagvenster kwam?
      window.__venster.push({ naam: o.suggestedName, vraagOpen: /Laten annuleren\?/.test(document.body.innerText) });
      return Promise.resolve({ createWritable: () => Promise.resolve({ write: () => Promise.resolve(), close: () => Promise.resolve() }) });
    };
  });
  page = await nieuwePagina(ctx);
  await open(page, 1);
  await page.click('button:has-text("⬇ Exporteren")');
  await page.click('button:has-text("Bestellijst als PDF")');
  m = await vraagOpScherm(page);
  await knop(page, 'Ja, verstuurd');
  await wachtTot(() => (info().bestellingen || []).length === 1, 10000);
  await ontgrendel(page);
  await page.locator('#invoerBody button.btn-del').nth(1).click();
  await wacht(500);
  await page.evaluate(() => { window.__venster = []; });
  await page.click('button:has-text("⬇ Exporteren")');
  await page.click('button:has-text("Bestellijst als PDF")');
  await wachtOpMelding(page, /Laten annuleren\?/, 5000);
  check('de vraag staat open en er is nog geen opslagvenster', (await page.evaluate(() => window.__venster.length)) === 0);
  await knop(page, 'Stoppen');
  await wacht(800);
  check('Stoppen: geen opslagvenster, niets vastgelegd', (await page.evaluate(() => window.__venster.length)) === 0 &&
    (info().bestellingen || []).length === 1);
  await page.click('button:has-text("⬇ Exporteren")');
  await page.click('button:has-text("Bestellijst als PDF")');
  await wachtOpMelding(page, /Laten annuleren\?/, 5000);
  await knop(page, 'Ja, laten annuleren');
  await wachtTot(() => page.evaluate(() => window.__venster.length === 1), 5000);
  const v11 = await page.evaluate(() => window.__venster[0] || {});
  check('na "Ja, laten annuleren": het opslagvenster, met de naam van de aanvulling, de vraag al dicht',
    v11.naam === 'Bestellijst_Kerkstraat_1_2e_aanvulling.pdf' && v11.vraagOpen === false, JSON.stringify(v11));
  await vraagOpScherm(page);
  await knop(page, 'Nee, alleen bekeken');
  // Alles exporteren: Stoppen bij de vraag = niets opgeslagen (ook de foto-pdf niet).
  let dl11 = 0;
  page.on('download', () => { dl11++; });
  await page.evaluate(() => { try { window.showDirectoryPicker = undefined; } catch (e) {} });
  await page.click('button:has-text("⬇ Exporteren")');
  await page.click('button:has-text("Alles exporteren")');
  await wachtOpMelding(page, /Laten annuleren\?/, 5000);
  await knop(page, 'Stoppen');
  await wacht(1500);
  check('Alles exporteren, Stoppen: geen enkel bestand', dl11 === 0, dl11 + ' downloads');
  // De bestelmail: Stoppen bij de vraag = niets verstuurd, venster dicht, en dat gezegd.
  await page.evaluate(() => bestelmailVenster());
  await page.waitForSelector('#mailVerstuur', { timeout: 8000 });
  await page.fill('#mailExtra', 'inkoop@voorbeeld.nl');
  await page.click('#mailVerstuur');
  await wachtOpMelding(page, /Laten annuleren\?/, 5000);
  await knop(page, 'Stoppen');
  m = await wachtOpMelding(page, /De bestelmail is niet verstuurd/, 5000);
  check('bestelmail na Stoppen: niet verstuurd, venster dicht, en de app zegt het', m.ok && !(await page.$('#mailVerstuur')) &&
    (info().bestellingen || []).length === 1, m.tekst.slice(0, 120));
  await sluitMeldingen(page);
  await ctx.close();

  /* ══ ═══════════════════════════════════════════════════════════ */
  console.log('\nGeen fouten in de console');
  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log(fouten ? '\n' + fouten + ' FOUT(EN).' : '\nAlles goed.');
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
