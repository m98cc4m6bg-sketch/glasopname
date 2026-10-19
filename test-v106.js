/* Testreeks v106 — node test-v106.js   (en: node test-v106.js --mutaties)

   Onderwerp: het BEWERKSLOT. Eén persoon tegelijk bewerkt een project; de
   rest kijkt mee (keuze van Jan, 14 oktober 2026).

   Echte situatie: Julian werkt op kantoor op de Mac aan de Kerkstraat. Bart
   staat met de iPad op de bouwplaats (wisselend bereik) en opent hetzelfde
   project. Kees opent het later op de Windows-pc. Iemand gebruikt een
   Android-telefoon.

   Belofte (Jans woorden):
   - "(naam) heeft dit project geopend, je kunt nu alleen kijken. Toch
     bewerken klik hier."
   - Bij "Toch bewerken" gaat het project EERST bij de ander op slot, met een
     melding en een aflopende timer (10 seconden), zijn app ververst; en
     DAARNA pas kan de nieuwe collega bewerken.
   - Eén keer "Toch bewerken" = overgenomen. Wie het daarna wil, krijgt
     "Julian heeft het project overgenomen" en weer "Toch bewerken".
   - Iedereen mag overnemen.
   - Een collega die eerst bewerkte en offline ging: robuust afgevangen.

   Wat er mis gaat voor de gebruiker als het niet klopt (harde eis: niets
   kwijt):
   - werk van de vorige bewerker dat nog niet opgeslagen was, raakt weg;
   - de iPad die offline doorwerkte, overschrijft bij terugkomst het werk
     van kantoor (het probleem waarvoor dit gebouwd is);
   - zijn werk raakt weg in plaats van apart bewaard;
   - twee mensen bewerken toch tegelijk;
   - een project blijft voor altijd op slot (iemand ging naar huis met de app
     open, of zijn iPad is leeg).

   Wat er halverwege gebeurt, en hier getest wordt:
   - de bewerker typt nog tijdens het aftellen;
   - de bewerker heeft geen bereik (seintje komt niet aan);
   - de bewerker heeft de app dicht (al lang niet actief);
   - het live bericht komt niet aan (dan via de hartslag);
   - het seintje komt pas na het aftellen aan;
   - wie wil overnemen, kiest Annuleren;
   - een oude vraag van gisteren;
   - herstart met openstaand werk terwijl een ander het project heeft;
   - het project sluiten geeft het vrij;
   - script 24 nog niet gedraaid;
   - telefoonbreedte (Android), Windows-pc;
   - twee tabbladen op één apparaat.

   Wat deze opstelling aanneemt (TESTEN.md, vraag 5):
   - De database is nagebootst in node, met een nabootsing van
     24_bewerkslot.sql (functie glas_bewerken en de trigger). Het script zelf
     wordt getest in test-sql.sql §21, tegen een echte PostgreSQL.
   - Het live bijwerken (Supabase realtime) is nagebootst: elke wijziging
     van bewerkslot en projecten gaat naar elke open pagina, behalve naar
     een apparaat zonder bereik of zonder live verbinding (S.geenLive).
   - Geen bereik = de nagebootste server antwoordt dat apparaat niet
     (S.weg), niet alleen een vlag in de browser.
   - De wachttijden zijn in een deel van de tests korter gezet
     (window.GLAS_*); in 1–6 lopen ze zoals bij Jan (10 s aftellen). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  // 1. Kijken verstuurt toch (dan weigert de database, en komt er onnodig een apart project).
  kijkverstuur: ['cloud.js', "    if (window.glasAlleenKijken && glasAlleenKijken()) {\n      if (gebruikerDeedIets && !kijkWijziging) {",
                             "    if (false) {\n      if (gebruikerDeedIets && !kijkWijziging) {"],
  // 2. Vrijgeven zonder eerst op te slaan: het laatste werk van Julian mist bij Bart.
  eerstopslaan: ['bewerkslot.js', "    var opslaan = window.glasOpslaanEnWachten ? glasOpslaanEnWachten(8000) : Promise.resolve(true);",
                                  "    var opslaan = Promise.resolve(true);"],
  // 3. Geen aftellen: meteen vrijgeven.
  geenaftel: ['bewerkslot.js', "      v.aftellen(AFTEL_S, function () { geefVrij(v, naam); }, function () {",
                              "      v.aftellen(0.1, function () { geefVrij(v, naam); }, function () {"],
  // 4. Meteen overnemen in plaats van vragen (eerst Bart, dan pas Julian op slot).
  meteen: ['bewerkslot.js', "    rpc('vraag').then(function (s) {", "    rpc('forceer').then(function (s) {"],
  // 5. Na het krijgen niet eerst de stand van de server laden.
  herlaad: ['bewerkslot.js', "    var herlaad = window.glasHerlaad ? glasHerlaad('') : Promise.resolve(true);",
                             "    var herlaad = Promise.resolve(true);"],
  // 6. Een geweigerde opslag gaat niet apart.
  apart: ['cloud.js', "          apartEnLaden('bewerkslot', String(res.error.message)", "          (function(){})('bewerkslot', String(res.error.message)"],
  // 7. Geen apparaatcode meesturen: de database kan de offline iPad niet tegenhouden.
  velden: ['cloud.js', "    if (window.glasBewerkslotVelden) Object.assign(state, glasBewerkslotVelden());", ''],
  // 8. Een oude vraag (van gisteren) geeft toch een seintje.
  oudvraag: ['bewerkslot.js', "              nuServer() - Date.parse(s.overname_op) < VRAAG_GELDIG_MS);", "              true);"],
  // 9. Annuleren trekt de vraag niet in.
  intrekken: ['bewerkslot.js', "      klaar = true; einde();\n      rpc('intrekken', pid);", "      klaar = true; einde();"],
  // 10. Een seintje dat laat aankomt (zonder live verbinding): blijft op "reageert niet" staan.
  laat: ['bewerkslot.js', "            if (nietBereikt && eerste) {", "            if (false) {"],
  // 11. Vrij gekomen project wordt niet vanzelf genomen door wie meekeek.
  autoclaim: ['bewerkslot.js', "      if (bron !== 'start' && modus === 'kijken' && !vraagVanAnder(nieuw)) { claim(); return; }", ''],
  // 12. Het project sluiten geeft het niet vrij.
  vrijgeven: ['cloud.js', "    // Het project vrijgeven voor een collega (v106).\n    if (window.glasBewerkslotStop) glasBewerkslotStop();", ''],
  // 13. Al lang niet actief: toch eerst 10 s aftellen.
  inactief: ['bewerkslot.js', "    if (!actiefNu(s)) { reageertNiet(); return; }", ''],
  // 14. Geen balk "… heeft dit project open".
  balk: ['index.html', "  if (kijken) {\n    balk.hidden = false;", "  if (false) {\n    balk.hidden = false;"],
  // 15. Kijken zet de velden niet op slot.
  slot: ['index.html', "  if (window.glasAlleenKijken && glasAlleenKijken()) return true;\n  const i = (typeof projectInfo", "  const i = (typeof projectInfo"],
  // 16. Statusveld e.d. weigeren niet in kijkmodus (project.js).
  projectveld: ['project.js', "    if (window.kijkWeigert && kijkWeigert()) { if (window.renderProject) renderProject(); return; }\n    if (KLANT_IDS",
                              "    if (KLANT_IDS"],
  // 17. Een bestelling vastleggen terwijl je alleen kijkt.
  vastleggen: ['index.html', "  if (window.glasAlleenKijken && glasAlleenKijken()) {\n    const st = window.glasBewerkslotStand ? (glasBewerkslotStand().stand || {}) : {};\n    if (window.appMelding) {\n      appMelding((st.naam || 'Een collega') + ' bewerkt dit project nu, dus deze bestelling",
                             "  if (false) {\n    const st = window.glasBewerkslotStand ? (glasBewerkslotStand().stand || {}) : {};\n    if (window.appMelding) {\n      appMelding((st.naam || 'Een collega') + ' bewerkt dit project nu, dus deze bestelling"],
  // (18. 'dubbel' — de rem op twee keer apart bewaren (apartLoopt) — is
  // weggehaald: sinds apart bewaren eerst de inhoud vergelijkt, maakt een
  // tweede keer geen tweede apart project meer; de rem is nu een extra
  // vangnet dat geen test rood kan maken.)
  // 19. Geen waarschuwing als script 24 ontbreekt.
  script24: ['start.js', "      if (ja === false) { zonder24 = true; toon(gebruik); }", ''],
  // 21. Na apart bewaren het startscherm over het open project (zoals tot v105).
  startscherm: ['cloud.js', " && (!projectId || document.body.classList.contains('op-start'))) {", ") {"],
  // 22. Bij drie apparaten pakt wie meekijkt het project, terwijl een ander erom vroeg.
  ander: ['bewerkslot.js', "      if (bron !== 'start' && modus === 'kijken' && !vraagVanAnder(nieuw)) { claim(); return; }",
                           "      if (bron !== 'start' && modus === 'kijken') { claim(); return; }"],
  // 23. Opslaan mislukt bij het vrijgeven: toch vrijgeven.
  nietgelukt: ['bewerkslot.js', "    opslaan.then(function (gelukt) {\n      if (!gelukt) {", "    opslaan.then(function (gelukt) {\n      if (false) {"],
  // 24. Vrijgeven mislukt: toch op slot (en niemand bewerkt).
  vrijmislukt: ['bewerkslot.js', "        if (!s) {\n          // Niet gelukt (verbinding weg).", "        if (false) {\n          // Niet gelukt (verbinding weg)."],
  // 25. Een stilgelegde app (iOS) telt na terugkomst gewoon door en geeft vrij.
  sprong: ['bewerkslot.js', "        if (sprong && nu - vorige > 3000) { clearInterval(v.klok); if (!v.weg) sprong(); return; }", ''],
  // 26. Een open vraag bij de bewerker telt niet: midden in "Ja, verstuurd" op slot.
  achtergrond: ['bewerkslot.js', "    return !!document.querySelector('.melding-laag:not(.bewerkslot-laag)') ||", "    return false &&"],
  // 27. Zelf geen verbinding: toch "reageert niet".
  eigenfout: ['bewerkslot.js', "          if (++eigenFout >= 3) {", "          if (false) {"],
  // 28. Kijken: geen vraag vooraf bij de bestellijst.
  vooraf: ['pdf.js', "    if (bm.modus !== 'overzicht' && window.glasAlleenKijken && glasAlleenKijken() && window.appKeuze) {",
                     "    if (false) {"],
  // 29. Geen kijk-label op de andere tabbladen.
  chip: ['index.html', "      chip.hidden = !tonen;\n", ''],
  // 43. (v108) Het label ook op Invoer: "alleen kijken" staat er dan twee keer (Jans schermafdruk).
  chipinvoer: ['index.html', "    const tonen = kijken && !opInvoer;", "    const tonen = kijken;"],
  // 44. (v108) Bij een ander tabblad het label niet bijwerken.
  chiptab: ['index.html', "  if (typeof slotToepassen === 'function') slotToepassen();\n  // Het klantblok", "  // Het klantblok"],
  // 45. (v108) De naam van een apart project zonder wie en welk apparaat.
  apartwie: ['cloud.js', "tweeCijfers(t.getMinutes()) + (r.wie ? ' - ' + r.wie : '') + ')';", "tweeCijfers(t.getMinutes()) + ')';"],
  // 46. (v108) Een berichtje zonder knop blijft staan ("Je kunt dit project nu bewerken").
  berichtweg: ['cloud.js', "    if (!knopTekst) {\n      meldingKlok = setTimeout(", "    if (false) {\n      meldingKlok = setTimeout("],
  // 47. (v108) Ook een berichtje mét knop (‹Hun versie laden›) verdwijnt vanzelf.
  knopblijft: ['cloud.js', "    if (!knopTekst) {\n      meldingKlok = setTimeout(", "    if (true) {\n      meldingKlok = setTimeout("],
  // 48. (v108) Na een geslaagde inlog de browser niets laten weten (Chrome/Edge/Android: geen vraag).
  aanbieden: ['cloud.js', "      wachtwoordAanbieden(email, pw);\n", ''],
  // 49. (v108) Safari/Firefox: het formulier niet echt versturen na de inlog.
  kader: ['cloud.js', "        echtVersturen = true;\n        if (form.requestSubmit) form.requestSubmit(); else form.submit();", "        if (false) form.submit();"],
  // 50. (v108) Het formulier meteen echt versturen, nog vóór Supabase het wachtwoord goedkeurde.
  vooraf2: ['cloud.js', "    if (echtVersturen) { echtVersturen = false; return true; }    // de echte, na de inlog",
                        "    if (true) { login(); return true; }"],
  // (51. De oude Enter-afhandeling terugzetten maakt geen fout: login() zet
  // de knop meteen uit, en dan verstuurt de browser het formulier bij Enter
  // niet nog eens. Toch weggehaald, want overbodig. Geen mutatie.)
  // 52. (v108) De wachtwoordvraag in de app zonder e-mailadres erbij.
  gebruikerveld: ['melding.js', "          (o.invoer && o.invoer.soort === 'wachtwoord'\n            ? '<input", "          (false\n            ? '<input"],
  // 30. Het volgnummer na een opslag niet bijhouden: de volgende opslag na een overname wordt geweigerd.
  basisbij: ['cloud.js', "        basisRev = revVan({ _rev: terug.rev });\n", ''],
  // 31. Het volgnummer niet meesturen: een iPad met een oude stand komt erdoor als het project vrij is (in de nabootsing: zonder controle).
  basisweg: ['test-v106.js', '', ''],
  // 32. Zonder de bewaking in de database (de nabootsing uit): §4, §11 en §14 moeten rood worden.
  nabootsing: ['test-v106.js', '', ''],
  // 33. Na een opslag alles nog een keer sturen (de stempels telden als wijziging, tot v105).
  dubbelop: ['cloud.js', "        laatsteJson = json;\n        statusOpgeslagen();", "        statusOpgeslagen();"],
  // 34. Het seintje op de achtergrond heeft toch een knop (een tik valt dan op de vraag eronder).
  knopachter: ['bewerkslot.js', "    document.body.classList.add('bs-achtergrond');\n    v.knoppen([]);", "    document.body.classList.add('bs-achtergrond');"],
  // 35. Een export die loopt (opslagvenster, delen) telt niet als bezig.
  export: ['bewerkslot.js', "      !!(window.glasExportBezig && glasExportBezig());", "      false;"],
  // 36. Twee tabbladen: de vorige opslag van hetzelfde apparaat telt als "van mij" (in de nabootsing per apparaat in plaats van per sessie).
  tabblad: ['test-v106.js', '', ''],
  // 37. Een bestelling van een apparaat dat geweigerd werd, gaat alleen apart (niet in het project).
  erbij: ['cloud.js', "      return bestellingenAlsnog(pid, eigenInfo).then(klaar);", "      return Promise.resolve(klaar());"],
  // 38. Zonder de functie in de database (script 24 oud): de app moet het luid zeggen.
  erbijweg: ['test-v106.js', '', ''],
  // 39. (zie 30) — gevangen in §25: na een herstart wordt gewoon werk geweigerd.
  // 40. Het volgnummer telt door bij een bestelling die alsnog in het project gaat (dan wordt de bewerker geweigerd).
  erbijrev: ['test-v106.js', '', ''],
  // (41. Wie bewerkte en het project vrij aantreft, neemt het terug en laat
  // de database beslissen. Zonder die regel gaat het werk ook apart, maar via
  // een wedloop in de app; een mutatie daarop is niet betrouwbaar rood te
  // krijgen, dus die staat er niet. §14 toetst de uitkomst.)
  // 42. (v107) Het apparaat dat het project kwijtraakte, krijgt alleen een kort berichtje onderin (zag Jan niet).
  overgenomenvenster: ['cloud.js', "    if (window.appMelding) appMelding(tekst, { kop: 'Project overgenomen', soort: 'letop' });\n    else toonMelding(tekst);",
                                   "    toonMelding(tekst);"],
  // 20. Annuleren bij de ander sluit het seintje niet.
  seintjedicht: ['bewerkslot.js', "      } else if (!nieuw.overname_apparaat && seintje && !seintje.bezig) {",
                                  "      } else if (false) {"]
};
const MUTATIE_INIT = {};

// Welke onderdelen een mutatie moeten vangen (de rest wordt dan overgeslagen,
// anders duurt de proef uren; de hele reeks draait in de batterij).
const WAAR = { oudvraag: '7-11', intrekken: '7-11', laat: '7-11', seintjedicht: '7-11', script24: '13', ander: '15',
  nietgelukt: '16', vrijmislukt: '17', sprong: '18', achtergrond: '21', eigenfout: '19', basisweg: '14',
  eerstopslaan: '7-11', apart: '23', knopachter: '21', export: '21', tabblad: '7-11', erbij: '24', erbijweg: '24', herlaad: '7-11', basisbij: '25', erbijrev: '24', overgenomenvenster: '26',
  apartwie: '27', berichtweg: '27', knopblijft: '28', aanbieden: '29', kader: '29', vooraf2: '29', gebruikerveld: '30' };
Object.keys(MUTATIES).forEach(k => { if (!WAAR[k]) WAAR[k] = '1-6'; });
if (process.argv.indexOf('--mutaties') >= 0) {
  // Eerst: past elke mutatie nog (in een paar seconden)? Anders is de proef
  // waardeloos (beoordeling v106: twee pasten niet meer en leken groen).
  const passen = Object.keys(MUTATIES).filter(n => {
    const m = MUTATIES[n];
    if (m[0] === 'test-v106.js') return true;
    return fs.readFileSync(m[0], 'utf8').indexOf(m[1]) >= 0;
  });
  const nietPassend = Object.keys(MUTATIES).filter(n => passen.indexOf(n) < 0);
  if (nietPassend.length) { console.log('  FOUT mutaties passen niet (meer): ' + nietPassend.join(', ')); process.exit(1); }
  let goed = 0;
  Object.keys(MUTATIES).forEach(function (naam) {
    const r = spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { MUTATIE: naam, ALLEEN: WAAR[naam] || '' }),
                                                         encoding: 'utf8', timeout: 900000 });
    const uit = (r.stdout || '') + (r.stderr || '');
    const pastNiet = /mutatie past niet/.test(uit);
    const regels = uit.split('\n').filter(l => /^\s+FOUT /.test(l)).map(l => l.trim());
    // Alleen een eigen FOUT-regel telt als gevangen; een crash of time-out niet.
    const rood = r.status !== 0 && !pastNiet && regels.length > 0;
    console.log((rood ? '  ok   ' : '  FOUT ') + 'mutatie ' + naam + (rood ? ' wordt gevangen: ' : (pastNiet ? ' past niet' : (r.status !== 0 ? ' rood zonder FOUT (crash of time-out)' : ' wordt NIET gevangen'))) +
                (regels[0] ? regels[0].slice(0, 110) : (/mutatie past niet/.test(uit) ? '(past niet!)' : uit.slice(-200))));
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
  if (!ok && process.env.MUTATIE) process.exit(1);
}
const wacht = ms => new Promise(r => setTimeout(r, ms));
async function wachtTot(voorwaarde, maximaal) {
  const eind = Date.now() + (maximaal || 10000);
  while (Date.now() < eind) { if (await voorwaarde()) return true; await wacht(150); }
  return false;
}

/* ─── de nagebootste Supabase (node-kant) ─────────────────────── */
const JULIAN = { id: 'u1', email: 'julian@voorbeeld.test' };
const BART = { id: 'u2', email: 'bart@voorbeeld.test' };
const KEES = { id: 'u3', email: 'kees@voorbeeld.test' };
const P = n => '00000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');
const GEEN_BEREIK = { message: 'TypeError: Failed to fetch', code: '', details: '', hint: '' };

const S = {};
function ruit(id, merk, b, h) {
  return { id: id, aantal: 1, merk: merk, maatsoort: 'Sponningmaat', breedte: b, hoogte: h, glasType: 'HR++ glas',
           opbouw: '4-15-4', rooster: 'Nee', glasbewerking: 'Helder (standaard)',
           roedenverdeling: 'Geen roedenverdeling', opmerking: '' };
}
function project(n, naam, rijen) {
  return {
    id: P(n), naam: naam, datum: '', status: 'bezig met inmeten/verwerken', aantal_ruiten: rijen.length, adres: '',
    open_taken: 0, gewijzigd_naam: '', updated_at: '2026-10-01T09:00:00Z', created_at: '2026-09-01T09:00:00Z',
    verwijderd_op: null,
    data: { rijen: rijen, volgendId: rijen.length + 1, fotos: [], taken: [], project: naam, datum: '',
            speling: '4', bijtelling: '11', _versieNr: 105,
            info: { opnemer: 'julian', status: 'bezig met inmeten/verwerken', leverInstructie: 'achterom' } }
  };
}
function resetDb() {
  S.db = {
    projecten: [
      project(1, 'Kerkstraat 1', [ruit(1, 'K1', '1200', '600'), ruit(2, 'K2', '800', '1400'), ruit(3, 'K3', '900', '900')]),
      project(2, 'Molenweg 2', [ruit(1, 'B1', '1200', '600'), ruit(2, 'B2', '700', '1400')])
    ],
    taken: [], projectgeschiedenis: [], mailverzonden: [], app_data: [], mailadressen: [],
    gebruikers: [{ id: 'u1', naam: 'julian', email: JULIAN.email, actief: true },
                 { id: 'u2', naam: 'bart', email: BART.email, actief: true },
                 { id: 'u3', naam: 'kees', email: KEES.email, actief: true }]
  };
  S.slot = {};          // de tabel bewerkslot
  S.log = [];           // wat er in welke volgorde op de server gebeurde
  S.weg = {};           // apparaat zonder bereik
  S.geenLive = {};      // apparaat zonder live verbinding
  S.sessie = {};        // wie er per apparaat is ingelogd
  S.zonderSlot = false; // script 24 niet gedraaid
  S.versieslot = true;  // script 21 staat er (sinds v99)
  S.rpcFout = {};       // deze acties mislukken (verbinding valt weg)
  S.nieuwId = 0;
}
resetDb();

// Nabootsing van de triggers bij een opslag van de inhoud:
// 24_bewerkslot.sql (houder en volgnummer) en 21_versieslot.sql. De echte
// scripts worden getest in test-sql.sql §21, tegen een echte PostgreSQL.
// Een weigering laat alles zoals het was (zoals een transactie).
function bewaken(r, d) {
  if (S.zonderSlot && !S.versieslot) return null;
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
  if (process.env.MUTATIE === 'nabootsing') return null;   // proef: zonder de bewaking in de database
  const nu = new Date().toISOString();
  const sl = S.slot[r.id];
  if (sl && sl.apparaat && sl.apparaat !== van) {
    S.log.push({ wat: 'geweigerd', wie: d._apparaatNaam, waarom: 'houder' });
    return { code: 'P0001', message: 'Bewerkslot: ' + (sl.naam || 'een collega') + ' bewerkt dit project nu. ' +
             'Je werk blijft op dit apparaat en wordt apart bewaard.', details: '', hint: '' };
  }
  const schrijver = (r.data._apparaat || '') + '/' + (r.data._sessie || '');
  const ik = van + '/' + (process.env.MUTATIE === 'tabblad' ? (r.data._sessie || '') : (d._sessie || ''));
  const basis = d._basis;
  if (process.env.MUTATIE !== 'basisweg' && revOud != null && schrijver !== ik && (basis == null || !/^\d+$/.test(String(basis)) || parseInt(basis, 10) !== revOud)) {
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

function dbVraag(st) {
  const sleutel = st.tabel + ':' + st.op;
  const lijst = S.db[st.tabel] || (S.db[st.tabel] = []);
  const past = r => Object.keys(st.filters).every(k => r[k] === st.filters[k]) &&
    st.leeg.every(k => r[k] == null) && st.gevuld.every(k => r[k] != null);
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
      const oudRij = JSON.parse(JSON.stringify(r));
      Object.assign(r, JSON.parse(JSON.stringify(st.velden)), { updated_at: new Date().toISOString() });
      if (st.tabel === 'projecten' && st.velden.data) bestellingenTerug(oudRij, r);
      if (st.tabel === 'projecten' && st.velden.data) {
        S.log.push({ wat: 'opslaan', wie: st.velden.data._apparaatNaam || '?' });
        live('projecten', r);
      }
    });
    if (st.terug && st.kols && /bestellingen:data->info->bestellingen/.test(st.kols)) {
      return { data: geraakt.map(r => ({ id: r.id, status: r.status,
        bestellingen: JSON.parse(JSON.stringify(((r.data || {}).info || {}).bestellingen || null)),
        rev: /rev:data->_rev/.test(st.kols) ? (r.data._rev == null ? null : r.data._rev) : undefined })), error: null };
    }
    if (st.enkel) return geraakt.length ? { data: geraakt[0], error: null }
                                        : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
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
  if (st.kols && /bestellingen:data->info->bestellingen/.test(st.kols)) {
    r = r.map(x => Object.assign({}, x, { bestellingen: ((x.data || {}).info || {}).bestellingen || null }));
  }
  const uit = { data: st.enkel ? JSON.parse(JSON.stringify(r[0] || null)) : JSON.parse(JSON.stringify(r)), error: null };
  if (st.telling) uit.count = totaal;
  void sleutel;
  return uit;
}

// Vereenvoudigde nabootsing van trigger 23 (23_bestellingen.sql, uitgebreid
// getest in test-v104/v105 en test-sql §20): een bestelling die in de
// database stond en in de nieuwe stand ontbreekt, komt terug.
function bestellingenTerug(oudRij, r) {
  const oud = ((oudRij.data || {}).info || {}).bestellingen;
  if (!Array.isArray(oud) || !oud.length) return;
  r.data.info = r.data.info || {};
  const nieuw = Array.isArray(r.data.info.bestellingen) ? r.data.info.bestellingen : [];
  const per = {};
  nieuw.forEach(b => { per[b.op] = b; });
  let terug = false;
  oud.forEach(o => { if (!per[o.op]) { per[o.op] = o; terug = true; } });
  if (!terug) return;
  r.data.info.bestellingen = Object.keys(per).sort().map((k, i) => Object.assign({}, per[k], { nr: i + 1 }));
  const RANG = { besteld: 2, geleverd: 3, gemonteerd: 4, afgerond: 5 };
  if ((RANG[r.status] || 0) < (RANG[oudRij.status] || 0)) { r.status = oudRij.status; r.data.info.status = oudRij.status; }
}

// Nabootsing van glas_bewerken (24_bewerkslot.sql).
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

function rpcVraag(v) {
  if (v.naam === 'glas_bewerken') {
    if (S.zonderSlot) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.glas_bewerken' } };
    if (S.rpcFout[v.args.p_actie]) return { data: null, error: GEEN_BEREIK };
    return glasBewerken(v.args);
  }
  if (v.naam === 'glas_bestellingen_erbij') {
    // Nabootsing van glas_bestellingen_erbij (24_bewerkslot.sql, getest in
    // test-sql.sql §21r): alleen het bestel-deel, buiten het slot om.
    if (S.zonderSlot || process.env.MUTATIE === 'erbijweg') return { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } };
    const r = S.db.projecten.find(p => p.id === v.args.p_project);
    if (!r) return { data: null, error: null };
    const oud = JSON.parse(JSON.stringify(r));
    r.data.info = r.data.info || {};
    r.data.info.bestellingen = v.args.p_bestellingen;
    if (v.args.p_besteld) r.data.info.besteld = v.args.p_besteld; else delete r.data.info.besteld;
    const RANG = { besteld: 2, geleverd: 3, gemonteerd: 4, afgerond: 5, 'bezig met inmeten/verwerken': 1 };
    if ((RANG[v.args.p_status] || 0) > (RANG[r.status] || 0)) {
      r.status = v.args.p_status; r.data.info.status = v.args.p_status; r.data.info.slot = v.args.p_slot || null;
    }
    bestellingenTerug(oud, r);
    // Het volgnummer blijft staan (zoals het script, §21s).
    if (process.env.MUTATIE === 'erbijrev') r.data._rev = (parseInt(oud.data._rev, 10) || 0) + 1;
    S.log.push({ wat: 'bestellingen erbij', wie: '?' });
    live('projecten', r);
    return { data: { rev: r.data._rev, status: r.status, aantal: r.data.info.bestellingen.length }, error: null };
  }
  if (v.naam === 'prullenbak_opruimbaar') return { data: [], error: null };
  if (v.naam === 'glas_status_rang') return { data: 2, error: null };
  if (v.naam === 'glas_gebruik') return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.glas_gebruik' } };
  return { data: null, error: { message: 'onbekend' } };
}

function opslagVraag(v) {
  if (v.actie === 'upload') return { data: { path: v.pad }, error: null };
  if (v.actie === 'list') return { data: [], error: null };
  if (v.actie === 'remove') return { data: [], error: null };
  if (v.actie === 'link') return { data: null, error: { statusCode: '404', message: 'Object not found' } };
  return { data: null, error: { message: 'onbekend' } };
}

// Het live bijwerken: naar elke open pagina, behalve een apparaat zonder
// bereik of zonder live verbinding.
const PAGINAS = [];
function live(tabel, rij) {
  const kopie = JSON.parse(JSON.stringify(rij));
  setTimeout(() => {
    PAGINAS.forEach(p => {
      if (p.dicht || S.weg[p.apparaat] || S.geenLive[p.apparaat]) return;
      p.page.evaluate(([t, r]) => window.__live && window.__live(t, r), [tabel, kopie]).catch(() => {});
    });
  }, 30);
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
  function opslag(v) { return window.__opslag(JSON.stringify(v)).then(JSON.parse); }
  // Live: de kanalen onthouden; node roept __live aan bij een wijziging.
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
      upload: function (pad, blob, o) { return opslag({ actie: 'upload', pad: pad }); },
      list: function (p) { return opslag({ actie: 'list', pad: p }); },
      remove: function (paden) { return opslag({ actie: 'remove', paden: paden }); },
      createSignedUrl: function (pad) { return opslag({ actie: 'link', pad: pad }); }
    }; } }
  }; } };
})();`;

/* ─── de app serveren ─────────────────────────────────────────── */
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v106-'));
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
  if (m[0] !== 'test-v106.js') {
    const doel = path.join(map, m[0]);
    const tekst = fs.readFileSync(doel, 'utf8');
    if (tekst.indexOf(m[1]) < 0) { console.log('mutatie past niet: ' + process.env.MUTATIE); process.exit(3); }
    fs.writeFileSync(doel, tekst.replace(m[1], m[2]));
  }
  console.log('   (mutatie ' + process.env.MUTATIE + ' in ' + m[0] + ')');
}
// De vorige versie (v105) voor de overgang: een apparaat dat nog niet
// bijgewerkt is (zelfde adres, dus dezelfde opslag op het apparaat).
const OUD = process.env.OUD105 || '/tmp/v105werk';
const oudMap = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v105oud-'));
if (fs.existsSync(OUD)) {
  fs.readdirSync(OUD).forEach(n => { if (!fs.statSync(path.join(OUD, n)).isDirectory()) fs.copyFileSync(path.join(OUD, n), path.join(oudMap, n)); });
  if (fs.existsSync(path.join(OUD, 'lib'))) fs.cpSync(path.join(OUD, 'lib'), path.join(oudMap, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(oudMap, 'config.js'),
    'window.GLASOPNAME_CONFIG = { url: "https://test.supabase.co", anonKey: "sb_publishable_test" };\n');
}
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg',
                '.webmanifest': 'application/manifest+json' };
const server = http.createServer(function (req, res) {
  let naam = decodeURIComponent(req.url.split('?')[0]);
  if (naam === '/') naam = '/index.html';
  if (naam.indexOf('/lib/supabase-js') === 0) {
    res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(NAMAAK); return;
  }
  const wortel = S.oudeCode ? oudMap : map;
  const bestand = path.join(wortel, naam);
  if (!bestand.startsWith(wortel) || !fs.existsSync(bestand) || fs.statSync(bestand).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(bestand)] || 'application/octet-stream' });
  res.end(fs.readFileSync(bestand));
});

const UA = {
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0'
};

let adres, browser;
// Een apparaat: naam (voor S.weg / S.geenLive), wie er ingelogd is, en de
// wachttijden (zonder: zoals bij Jan).
async function apparaatCtx(naam, wie, opties, tijden) {
  S.sessie[naam] = wie;
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block', acceptDownloads: true }, opties || {}));
  if (tijden) {
    await ctx.addInitScript(t => {
      if (t.hartslag) window.GLAS_HARTSLAG_MS = t.hartslag;
      if (t.aftel) window.GLAS_AFTEL_S = t.aftel;
      if (t.actief) window.GLAS_ACTIEF_MS = t.actief;
    }, tijden);
  }
  if (MUTATIE_INIT[process.env.MUTATIE]) await ctx.addInitScript(MUTATIE_INIT[process.env.MUTATIE]);
  await ctx.exposeFunction('__db', s => JSON.stringify(S.weg[naam] ? { data: null, error: GEEN_BEREIK } : dbVraag(JSON.parse(s))));
  await ctx.exposeFunction('__rpc', s => JSON.stringify(S.weg[naam] ? { data: null, error: GEEN_BEREIK } : rpcVraag(JSON.parse(s))));
  await ctx.exposeFunction('__opslag', s => JSON.stringify(S.weg[naam] ? { data: null, error: GEEN_BEREIK } : opslagVraag(JSON.parse(s))));
  await ctx.exposeFunction('__sessie', () => JSON.stringify(
    { data: { session: S.sessie[naam] ? { access_token: 't0k', user: S.sessie[naam] } : null }, error: null }));
  // Inloggen (v108): het wachtwoord 'fout' wordt geweigerd; elk ander lukt
  // en geeft dit apparaat een sessie. S.logins telt de pogingen.
  await ctx.exposeFunction('__login', s => {
    const g = JSON.parse(s || '{}');
    S.logins = (S.logins || 0) + 1;
    if (g.password === 'fout') return JSON.stringify({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } });
    S.sessie[naam] = wie;
    return JSON.stringify({ data: { user: wie, session: { access_token: 't0k', user: wie } }, error: null });
  });
  ctx.__naam = naam;
  return ctx;
}
const consoleFouten = [];
async function nieuwePagina(ctx) {
  const page = await ctx.newPage();
  const p = { page: page, apparaat: ctx.__naam, dicht: false };
  PAGINAS.push(p);
  page.on('close', () => { p.dicht = true; });
  page.on('pageerror', e => { if (!/sandboxed/.test(String(e))) consoleFouten.push(ctx.__naam + ': ' + String(e)); });  // v109: het afgeschermde inlogkader, zie TESTEN.md
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR|sandboxed/.test(m.text())) consoleFouten.push('[console ' + ctx.__naam + '] ' + m.text());
  });
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
const rijVan = n => S.db.projecten.find(p => p.id === P(n));
const dbRuit = (n, merk) => (rijVan(n).data.rijen || []).find(r => r.merk === merk) || {};
const apartBewaard = () => S.db.projecten.filter(p => /apart bewaard/.test(p.naam));
const modus = page => page.evaluate(() => glasBewerkslotStand().modus);
const houder = n => (S.slot[P(n)] || {}).naam || null;
async function balk(page) {
  return page.$eval('#slotBalk', e => e.hidden ? '' : e.innerText.replace(/\s+/g, ' ').trim());
}
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
// Ook de korte meldingen onderaan (toonMelding).
async function alleTekst(page) {
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
}
async function knop(page, tekst) {
  await page.locator('.melding-laag').last().locator('.melding-knoppen button', { hasText: tekst }).click();
  await wacht(200);
}
async function sluitMeldingen(page) {
  for (let i = 0; i < 6; i++) {
    const n = await page.$$eval('.melding-laag:not(.bewerkslot-laag)', l => l.length);
    if (!n) return;
    await page.locator('.melding-laag:not(.bewerkslot-laag)').last().locator('.melding-knoppen button').last().click();
    await wacht(150);
  }
}
async function schermRuit(page, merk) {
  return page.evaluate(m => JSON.parse(JSON.stringify(rijen.find(r => r.merk === m) || {})), merk);
}
// Het n-de invoerveld van een soort (0 = K1), echt ingevuld.
async function vulIn(page, soort, n, waarde) {
  await page.locator('#invoerBody input.' + soort).nth(n).fill(waarde);
}
async function tochBewerken(page) {
  await page.click('#slotBalk button:has-text("Toch bewerken")');
}
const LS = (page, k) => page.evaluate(k => localStorage.getItem(k), k);
const indexVan = (pred, vanaf) => { for (let i = vanaf || 0; i < S.log.length; i++) if (pred(S.log[i])) return i; return -1; };
const laatsteIndex = pred => { for (let i = S.log.length - 1; i >= 0; i--) if (pred(S.log[i])) return i; return -1; };
const plaatjes = process.env.PLAATJES || '';
// Alleen bepaalde onderdelen (voor de mutatieproef): ALLEEN=1-6,14
const ALLEEN = process.env.ALLEEN ? process.env.ALLEEN.split(',') : null;
const doe = groep => !ALLEEN || ALLEEN.indexOf(groep) >= 0;

(async function () {
  await new Promise(r => server.listen(0, r));
  adres = 'http://127.0.0.1:' + server.address().port + '/index.html';
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let m, t0, bk;
  const SNEL = { hartslag: 1500, aftel: 4, actief: 60000 };
  const T = { hartslag: 1500, aftel: 2, actief: 60000 };
  const T16 = { hartslag: 1500, aftel: 3, actief: 60000 };

  if (doe('1-6')) {
  /* ══ 1 ════════════════════════════════════════════════════════ */
  console.log('\n1. Julian opent de Kerkstraat op de Mac: hij mag bewerken');
  resetDb();
  const mac = await apparaatCtx('mac', JULIAN, { userAgent: UA.mac });
  const pm = await nieuwePagina(mac);
  await open(pm, 1);
  check('Julian bewerkt (geen balk, geen slot)', await wachtTot(async () => await modus(pm) === 'bewerken', 5000) &&
    !(await balk(pm)), await modus(pm));
  check('in de database: het project staat op naam van julian, Mac', houder(1) === 'julian' && S.slot[P(1)].omschrijving === 'Mac',
    JSON.stringify(S.slot[P(1)]));
  await vulIn(pm, 'breedte-input', 0, '1210');
  await wachtTot(() => dbRuit(1, 'K1').breedte === '1210', 8000);
  const julianCode = await pm.evaluate(() => glasBewerkslotStand().apparaat);
  check('zijn opslag draagt zijn apparaatcode, naam en soort apparaat', dbRuit(1, 'K1').breedte === '1210' &&
    rijVan(1).data._apparaat === julianCode && rijVan(1).data._apparaatNaam === 'julian' &&
    rijVan(1).data._apparaatSoort === 'Mac', JSON.stringify([rijVan(1).data._apparaat, rijVan(1).data._apparaatNaam]));
  // Niets meer veranderd: dan ook niets meer naar de server (geen lus).
  await wacht(1500);
  const opslagen1 = S.log.filter(l => l.wat === 'opslaan').length;
  await wacht(12000);
  check('daarna, zonder wijzigingen: geen opslag meer (12 s)', S.log.filter(l => l.wat === 'opslaan').length === opslagen1,
    JSON.stringify(S.log.slice(-4)));

  /* ══ 2 ════════════════════════════════════════════════════════ */
  console.log('\n2. Bart opent hetzelfde project op de iPad: alleen kijken');
  const ipad = await apparaatCtx('ipad', BART, { userAgent: UA.ipad, hasTouch: true, viewport: { width: 1180, height: 820 } });
  const pi = await nieuwePagina(ipad);
  await open(pi, 1);
  await wachtTot(async () => await modus(pi) === 'kijken', 5000);
  bk = await balk(pi);
  check('de balk: "julian (Mac) heeft dit project open (nu actief). Je kunt alleen kijken." met ‹Toch bewerken›',
    /julian \(Mac\) heeft dit project open \(nu actief\)\. Je kunt alleen kijken\. Toch bewerken/.test(bk), bk);
  check('het project blijft op naam van Julian', houder(1) === 'julian');
  // v108: op Invoer alleen de balk (Jan zag "alleen kijken" er twee keer);
  // het label bovenin is voor de andere tabbladen.
  check('op Invoer: alleen de balk, geen tweede "Alleen kijken" bovenin (v108)', !(await pi.isVisible('#kijkChip')));
  if (plaatjes) await pi.screenshot({ path: path.join(plaatjes, 'v108-kijken-invoer.png') });
  await pi.click('.tab-btn:has-text("Project info")');
  await wacht(150);
  if (plaatjes) await pi.screenshot({ path: path.join(plaatjes, 'v108-kijken-projectinfo.png') });
  check('op Project info: bovenin "👁 Alleen kijken — julian" met ‹Toch bewerken›',
    await pi.isVisible('#kijkChip') && /Alleen kijken — julian/.test(await pi.$eval('#kijkChip', e => e.innerText)));
  check('…en bij Julian niet', !(await pm.isVisible('#kijkChip')));
  await pi.click('.tab-btn:has-text("Naslag")');
  check('op Naslag ook', await pi.isVisible('#kijkChip'));
  // toon() werkt het label zelf bij, op hetzelfde moment (niet pas als er
  // toevallig iets anders op het scherm verandert).
  check('…en meteen bij het wisselen (toon() zelf, niet toevallig later)', await pi.evaluate(() => {
    toon('invoer'); const opInvoer = document.getElementById('kijkChip').hidden;
    toon('samenvatting'); return opInvoer && !document.getElementById('kijkChip').hidden; }));
  await pi.click('.tab-btn:has-text("Invoer")');
  await wacht(150);
  check('terug op Invoer: het label weer weg', !(await pi.isVisible('#kijkChip')));
  let dl2 = 0;
  pi.on('download', () => { dl2++; });
  await pi.click('button:has-text("⬇ Exporteren")');
  await pi.click('button:has-text("Bestellijst als PDF")');
  m = await wachtOpMelding(pi, /Alleen kijken/, 5000);
  check('de bestellijst maken terwijl je kijkt: eerst de vraag "julian bewerkt dit project; jij kijkt alleen mee … niet als bestelling vastleggen"',
    m.ok && /julian bewerkt dit project; jij kijkt alleen mee/.test(m.tekst) && /niet als bestelling vastleggen/.test(m.tekst), m.tekst.slice(0, 160));
  await knop(pi, 'Stoppen');
  await wacht(1000);
  check('…met Stoppen: geen pdf', dl2 === 0);
  check('de velden staan op slot (maten, projectnaam), de knop ‹Toch bewerken› niet',
    await pi.$eval('#invoerBody input.breedte-input', e => e.disabled) && await pi.$eval('#projectNaam', e => e.disabled) &&
    await pi.$eval('#slotBalk button', e => !e.disabled));
  const opslagenVoor = S.log.length;
  const dataVoor = JSON.stringify(rijVan(1).data);
  await pi.evaluate(() => projectVeld('status', 'geleverd'));
  m = await wachtOpMelding(pi, /Alleen kijken/, 3000);
  check('status wijzigen op Project info: geweigerd, "julian bewerkt dit project nu; je kunt alleen kijken"',
    m.ok && /julian bewerkt dit project nu; je kunt alleen kijken/.test(m.tekst), m.tekst.slice(0, 120));
  await sluitMeldingen(pi);
  await wacht(3200);
  await pi.evaluate(() => projectNotitie('even kijken'));
  m = await wachtOpMelding(pi, /Alleen kijken/, 3000);
  check('notitie typen: ook geweigerd', m.ok);
  await sluitMeldingen(pi);
  await wacht(3200);
  check('een bestelling vastleggen terwijl je kijkt: niets vastgelegd',
    await pi.evaluate(() => bestellingVastleggen([], 'pdf') === null) && !(rijVan(1).data.info.bestellingen || []).length);
  await sluitMeldingen(pi);
  // Een veld dat toch bruikbaar is (bijvoorbeeld een oude pagina): de
  // echte invoer-gebeurtenis. Het slot zit op de gegevens, niet op het veld.
  await pi.evaluate(() => {
    const v = document.querySelector('#invoerBody input.opm-input');
    v.disabled = false; v.value = 'via een veld';
    v.dispatchEvent(new Event('input', { bubbles: true }));
    window.opslaan();
  });
  await wacht(1500);
  check('een veld dat toch open staat: het slot weigert op de gegevens (K1 blijft leeg, ook op de iPad)',
    (await schermRuit(pi, 'K1')).opmerking === '');
  await sluitMeldingen(pi);
  // En een weg buiten het slot om (code die de gegevens zelf wijzigt): het
  // vangnet. Nooit versturen; bij de volgende stand van de server apart.
  await pi.evaluate(() => { rijen[0].opmerking = 'langs het slot'; glasMarkeerWerk(); window.opslaan(); });
  await wacht(2500);
  check('Bart heeft niets naar de server gestuurd (geen opslag, geen weigering)',
    !S.log.slice(opslagenVoor).some(l => l.wie === 'bart') && JSON.stringify(rijVan(1).data) === dataVoor,
    JSON.stringify(S.log.slice(opslagenVoor)));
  check('en de app zegt het: "wordt niet in het project opgeslagen. Kies ‹Toch bewerken›…"',
    /wat je hier verandert, wordt niet in het project opgeslagen/.test(await alleTekst(pi)));
  // Julian werkt door; Bart ziet het live.
  await vulIn(pm, 'hoogte-input', 1, '1410');
  await wachtTot(() => dbRuit(1, 'K2').hoogte === '1410', 8000);
  check('Bart kijkt live mee: Julians K2 1410 staat ook op de iPad', await wachtTot(async () =>
    (await schermRuit(pi, 'K2')).hoogte === '1410', 6000), JSON.stringify(await schermRuit(pi, 'K2')));
  check('Barts wijziging langs het slot is niet weg: apart bewaard (1 project), en niet in de Kerkstraat',
    await wachtTot(() => apartBewaard().length === 1, 8000) &&
    apartBewaard()[0].data.rijen[0].opmerking === 'langs het slot' && dbRuit(1, 'K1').opmerking === '' &&
    (await schermRuit(pi, 'K1')).opmerking === '', apartBewaard().length);
  await sluitMeldingen(pi);
  check('…en Bart blijft in het project (niet ineens op het startscherm)',
    !(await pi.evaluate(() => document.body.classList.contains('op-start'))) && await pi.isVisible('#slotBalk button'));
  const apartNa2 = apartBewaard().length;

  if (process.env.TOT === '2') { console.log(JSON.stringify(S.log)); await browser.close(); process.exit(fouten ? 1 : 0); }
  /* ══ 3 ════════════════════════════════════════════════════════ */
  console.log('\n3. Bart kiest ‹Toch bewerken› (echte klik): eerst Julian op slot, met 10 s aftellen, dan Bart');
  // Julian is net iets aan het typen (nog niet opgeslagen).
  await vulIn(pm, 'breedte-input', 0, '1250');
  t0 = Date.now();
  const logVoor3 = S.log.length;
  await tochBewerken(pi);
  m = await wachtOpMelding(pi, /julian krijgt een seintje/, 3000);
  check('Bart: "julian krijgt een seintje. De app van julian slaat het werk op en gaat op slot; daarna kun jij bewerken."',
    m.ok && /De app van julian slaat het werk op en gaat op slot/.test(m.tekst), m.tekst.slice(0, 160));
  m = await wachtOpMelding(pm, /bart wil dit project bewerken/, 3000);
  check('Julian: venster "bart wil dit project bewerken", met wat er gaat gebeuren', m.ok &&
    /Je werk wordt opgeslagen en het project gaat over 10 seconden op slot/.test(m.tekst), m.tekst.slice(0, 200));
  const aftel = await pm.evaluate(() => {
    const b = document.querySelector('.bewerkslot-laag .bs-aftel-balk span');
    return { tekst: (document.querySelector('.bewerkslot-laag .bs-aftel-tekst') || {}).textContent,
             overgang: b && b.style.transition, breedte: b && b.style.width };
  });
  check('Julian: een aflopende balk (10 s, vloeiend) en "nog 10 s"', /^nog (10|9) s$/.test(aftel.tekst) &&
    /width 10s linear/.test(aftel.overgang) && aftel.breedte === '0%', JSON.stringify(aftel));
  if (plaatjes) await pm.screenshot({ path: path.join(plaatjes, 'v106-seintje-mac.png') });
  if (plaatjes) await pi.screenshot({ path: path.join(plaatjes, 'v106-overnemen-ipad.png') });
  await wacht(3500);
  // Julian typt tijdens het aftellen nog door in het veld waar hij zat.
  await pm.locator('#invoerBody input.opm-input').first().focus();
  await pm.keyboard.type('spoed');
  await wacht(1000);
  check('halverwege het aftellen: Bart kan nog niets, het project is nog van Julian',
    await modus(pi) === 'kijken' && houder(1) === 'julian' && await modus(pm) === 'bewerken');
  await wachtTot(async () => await modus(pi) === 'bewerken', 20000);
  const duur = Date.now() - t0;
  check('Bart bewerkt pas ná het aftellen bij Julian (≥ 10 s)', await modus(pi) === 'bewerken' && duur >= 9500, duur + ' ms');
  const iOpslaan = laatsteIndex(l => l.wat === 'opslaan' && l.wie === 'julian');
  const iVrij = indexVan(l => l.wat === 'vrijgeven' && l.wie === 'julian', logVoor3);
  const iBart = indexVan(l => (l.wat === 'claim' || l.wat === 'vraag') && l.houder === 'bart', logVoor3);
  check('volgorde op de server: Julians laatste opslag, dán vrijgeven, dán pas Bart', iOpslaan >= 0 && iOpslaan < iVrij && iVrij < iBart,
    JSON.stringify(S.log.slice(logVoor3).map(l => l.wat + ':' + l.wie + (l.houder ? '→' + l.houder : ''))));
  check('Julians laatste werk (K1 1250 en "spoed", tijdens het aftellen getypt) staat in het project',
    dbRuit(1, 'K1').breedte === '1250' && dbRuit(1, 'K1').opmerking === 'spoed', JSON.stringify(dbRuit(1, 'K1')));
  const k1b = await schermRuit(pi, 'K1');
  check('…en op het scherm van Bart (zijn app laadde de stand van de server)', k1b.breedte === '1250' && k1b.opmerking === 'spoed',
    JSON.stringify(k1b));
  check('Julian: kijkt nu mee, met de balk "bart (iPad) heeft dit project open"', await modus(pm) === 'kijken' &&
    /bart \(iPad\) heeft dit project open/.test(await balk(pm)), await balk(pm));
  check('Julian: "bart bewerkt dit project nu. Je kunt meekijken."', /bart bewerkt dit project nu\. Je kunt meekijken\./.test(await alleTekst(pm)));
  check('Bart: "Je kunt dit project nu bewerken."', /Je kunt dit project nu bewerken\./.test(await alleTekst(pi)));
  await wachtTot(() => (rijVan(1).data.info.overgenomen || {}).door === 'bart', 8000);
  const og = rijVan(1).data.info.overgenomen || {};
  check('in het project (logboek): overgenomen door bart, van julian', og.door === 'bart' && og.van === 'julian', JSON.stringify(og));
  check('niets (nieuws) apart bewaard: er ging niets mis', apartBewaard().length === apartNa2, apartBewaard().length);
  await vulIn(pi, 'breedte-input', 2, '920');
  await wachtTot(() => dbRuit(1, 'K3').breedte === '920', 8000);
  check('Bart bewerkt echt: K3 920 staat in het project', dbRuit(1, 'K3').breedte === '920');
  check('en Julian ziet het live', await wachtTot(async () => (await schermRuit(pm, 'K3')).breedte === '920', 6000));
  check('Julians velden staan nu op slot', await pm.$eval('#invoerBody input.breedte-input', e => e.disabled));

  /* ══ 4 ════════════════════════════════════════════════════════ */
  console.log('\n4. Bart verliest het bereik en werkt door; Julian neemt het over; Bart komt terug');
  S.weg.ipad = true; await ipad.setOffline(true);
  await vulIn(pi, 'hoogte-input', 1, '1500');
  await wacht(2500);
  check('Barts K2 1500 staat alleen op de iPad (moet nog omhoog)', dbRuit(1, 'K2').hoogte === '1410' &&
    await LS(pi, 'glasopname_pending') === '1');
  t0 = Date.now();
  await tochBewerken(pm);
  m = await wachtOpMelding(pm, /bart krijgt een seintje/, 3000);
  check('Julian: eerst gewoon het seintje en aftellen (Bart was net nog actief)', m.ok, m.tekst.slice(0, 100));
  m = await wachtOpMelding(pm, /bart reageert niet/, 25000);
  const duur4 = Date.now() - t0;
  check('na het aftellen: "bart reageert niet … misschien geen bereik", met ‹Overnemen›', m.ok &&
    /is er geen bereik of is de app dicht/.test(m.tekst) && /niets verloren/.test(m.tekst) && duur4 >= 12000,
    duur4 + ' ms; ' + m.tekst.slice(0, 160));
  if (plaatjes) await pm.screenshot({ path: path.join(plaatjes, 'v106-reageert-niet.png') });
  await knop(pm, 'Overnemen');
  await wachtTot(async () => await modus(pm) === 'bewerken', 6000);
  check('Julian bewerkt; het project staat op zijn naam (geforceerd)', await modus(pm) === 'bewerken' && houder(1) === 'julian' &&
    S.log.some(l => l.wat === 'forceer' && l.wie === 'julian'));
  await vulIn(pm, 'breedte-input', 2, '950');
  await wachtTot(() => dbRuit(1, 'K3').breedte === '950', 8000);
  check('Julian werkt: K3 950 in het project', dbRuit(1, 'K3').breedte === '950');
  // Bart krijgt bereik terug.
  S.weg.ipad = false; await ipad.setOffline(false);
  m = await wachtOpMelding(pi, /Je werk staat apart/, 25000);
  check('Bart: melding "Je werk staat apart" (julian bewerkt dit project nu)', m.ok && /julian/.test(m.tekst), m.tekst.slice(0, 200));
  await wachtTot(() => apartBewaard().length >= 1, 10000);
  await wacht(3000);
  check('de database liet de iPad niets overschrijven: K2 1410 en K3 950 (van Julian)',
    dbRuit(1, 'K2').hoogte === '1410' && dbRuit(1, 'K3').breedte === '950', JSON.stringify([dbRuit(1, 'K2').hoogte, dbRuit(1, 'K3').breedte]));
  const ap = apartBewaard().slice(apartNa2);
  const apK2 = ap.length ? (ap[0].data.rijen || []).find(r => r.merk === 'K2') : null;
  check('Barts offline werk is niet weg: precies één (nieuw) apart project, met K2 1500', ap.length === 1 && apK2 && apK2.hoogte === '1500',
    ap.length + ' apart; ' + JSON.stringify(apK2));
  check('Bart kijkt nu mee: balk "julian (Mac) heeft dit project open", en zijn scherm toont Julians stand',
    await modus(pi) === 'kijken' && /julian \(Mac\) heeft dit project open/.test(await balk(pi)) &&
    (await schermRuit(pi, 'K3')).breedte === '950' && (await schermRuit(pi, 'K2')).hoogte === '1410');
  check('op de iPad staat niets meer als "moet nog omhoog"', await LS(pi, 'glasopname_pending') !== '1');
  check('Bart blijft in het project, met de balk in beeld', !(await pi.evaluate(() => document.body.classList.contains('op-start'))) &&
    await pi.isVisible('#slotBalk button'));
  await sluitMeldingen(pi);

  /* ══ 5 ════════════════════════════════════════════════════════ */
  console.log('\n5. Julian gaat naar huis met de app open (iPad leeg); Kees opent het project op de Windows-pc');
  await mac.close();
  S.slot[P(1)].gezien = new Date(Date.now() - 20 * 60000).toISOString();
  const pc = await apparaatCtx('pc', KEES, { userAgent: UA.win });
  const pp = await nieuwePagina(pc);
  await open(pp, 1);
  await wachtTot(async () => await modus(pp) === 'kijken', 5000);
  bk = await balk(pp);
  check('Kees: "julian (Mac) heeft dit project open (laatst actief HH:MM)"',
    /julian \(Mac\) heeft dit project open \(laatst actief \d\d:\d\d\)\. Je kunt alleen kijken\./.test(bk), bk);
  t0 = Date.now();
  await tochBewerken(pp);
  m = await wachtOpMelding(pp, /julian reageert niet \(laatst actief \d\d:\d\d\)/, 4000);
  check('meteen "julian reageert niet (laatst actief …)", zonder eerst 10 s te wachten', m.ok && Date.now() - t0 < 3500,
    (Date.now() - t0) + ' ms; ' + m.tekst.slice(0, 120));
  await knop(pp, 'Overnemen');
  await wachtTot(async () => await modus(pp) === 'bewerken', 6000);
  check('Kees bewerkt; het project staat op kees, Windows-pc', await modus(pp) === 'bewerken' && houder(1) === 'kees' &&
    S.slot[P(1)].omschrijving === 'Windows-pc', JSON.stringify(S.slot[P(1)]));
  await wachtTot(() => (rijVan(1).data.info.overgenomen || {}).door === 'kees', 8000);
  check('logboek: overgenomen door kees van julian', (rijVan(1).data.info.overgenomen || {}).van === 'julian');
  check('Bart (kijkt nog mee op de iPad) ziet nu "kees (Windows-pc) heeft dit project open"',
    await wachtTot(async () => /kees \(Windows-pc\) heeft dit project open/.test(await balk(pi)), 6000), await balk(pi));

  /* ══ 6 ════════════════════════════════════════════════════════ */
  console.log('\n6. Kees sluit het project (terug naar het startscherm): Bart, die meekeek, kan meteen verder');
  await pp.evaluate(() => glasNaarStart());
  check('het project is vrijgegeven en Bart heeft het vanzelf (geen klik nodig)',
    await wachtTot(async () => await modus(pi) === 'bewerken', 6000) && houder(1) === 'bart', houder(1));
  check('Barts velden zijn weer open, en geen nieuw apart project', await pi.$eval('#invoerBody input.breedte-input', e => !e.disabled) &&
    apartBewaard().length === apartNa2 + 1);
  await pc.close();
  await ipad.close();

  }
  if (doe('7-11')) {
  /* ══ 7 ════════════════════════════════════════════════════════ */
  console.log('\n7. Zonder live verbinding: het seintje komt pas bij de hartslag, ná het aftellen bij Bart');
  resetDb();
  // Een vraag van gisteren die nooit is afgerond (de app van die collega ging dicht).
  S.slot[P(2)] = { project_id: P(2), apparaat: null, naam: null, omschrijving: null, sinds: null, gezien: null,
                   overname_apparaat: 'oud-apparaat', overname_naam: 'kees', overname_op: new Date(Date.now() - 20 * 3600e3).toISOString() };
  const TRAAG = { hartslag: 6000, aftel: 2, actief: 60000 };
  const mac2 = await apparaatCtx('mac2', JULIAN, { userAgent: UA.mac }, TRAAG);
  const ipad2 = await apparaatCtx('ipad2', BART, { userAgent: UA.ipad, hasTouch: true }, TRAAG);
  S.geenLive.mac2 = true; S.geenLive.ipad2 = true;
  const pm2 = await nieuwePagina(mac2);
  await open(pm2, 2);
  await wachtTot(async () => await modus(pm2) === 'bewerken', 5000);
  await wacht(1500);
  check('een vraag van gisteren (kees) geeft Julian géén seintje bij het openen',
    !/wil dit project bewerken/.test((await meldingen(pm2)).join(' ')) && await modus(pm2) === 'bewerken');
  const pi2 = await nieuwePagina(ipad2);
  await open(pi2, 2);
  await wachtTot(async () => await modus(pi2) === 'kijken', 5000);
  await vulIn(pm2, 'breedte-input', 0, '1230');
  await wachtTot(() => dbRuit(2, 'B1').breedte === '1230', 8000);
  // Julians app bereikt de server even niet (zijn hartslag mislukt), zodat
  // het seintje zeker pas na Barts aftellen aankomt.
  S.weg.mac2 = true;
  await tochBewerken(pi2);
  setTimeout(() => { S.weg.mac2 = false; }, 7000);
  // Zonder live bericht ziet Julians app het pas bij zijn volgende hartslag (tot 6 s), terwijl Bart na 2 + 3 s al "reageert niet" ziet.
  const gezien7 = [];
  const eind7 = Date.now() + 20000;
  while (Date.now() < eind7 && await modus(pi2) !== 'bewerken') {
    gezien7.push((await meldingen(pi2)).join(' '));
    await wacht(200);
  }
  check('Bart kreeg het toch, zonder op ‹Overnemen› te klikken (Julians app gaf het vrij)', await modus(pi2) === 'bewerken' &&
    !S.log.some(l => l.wat === 'forceer') && S.log.some(l => l.wat === 'vrijgeven' && l.wie === 'julian'),
    JSON.stringify(S.log.map(l => l.wat + ':' + l.wie)));
  const rn = gezien7.findIndex(t => /reageert niet/.test(t));
  check('onderweg: eerst "reageert niet", daarna (seintje toch aangekomen) weer "krijgt een seintje"',
    rn >= 0 && gezien7.slice(rn).some(t => /krijgt een seintje/.test(t)), rn);
  check('Julians laatste werk (B1 1230) zit erin, niets apart', dbRuit(2, 'B1').breedte === '1230' && !apartBewaard().length &&
    (await schermRuit(pi2, 'B1')).breedte === '1230');
  check('Julian kijkt mee', await wachtTot(async () => await modus(pm2) === 'kijken', 8000));

  /* ══ 8 ════════════════════════════════════════════════════════ */
  console.log('\n8. Julian vraagt het terug, maar kiest Annuleren: Bart werkt gewoon door');
  S.geenLive = {};
  await tochBewerken(pm2);
  m = await wachtOpMelding(pi2, /julian wil dit project bewerken/, 8000);
  check('Bart krijgt het seintje', m.ok);
  await knop(pm2, 'Annuleren');
  await wacht(2000);
  check('het seintje bij Bart verdwijnt, met "julian heeft het toch niet overgenomen"',
    !(await meldingen(pi2)).some(t => /wil dit project bewerken/.test(t)) &&
    /julian heeft het toch niet overgenomen\. Je kunt gewoon verder\./.test(await alleTekst(pi2)), (await meldingen(pi2)).join(' | '));
  await wacht(4000);
  check('Bart bewerkt nog steeds; de vraag is uit de database', await modus(pi2) === 'bewerken' && houder(2) === 'bart' &&
    !S.slot[P(2)].overname_apparaat);

  /* ══ 9 ════════════════════════════════════════════════════════ */
  console.log('\n9. Julian vraagt het nog eens; Bart typt nog iets en klikt meteen ‹Nu vrijgeven›');
  S.slot[P(2)].gezien = new Date().toISOString();
  await tochBewerken(pm2);
  await wachtOpMelding(pi2, /julian wil dit project bewerken/, 8000);
  const log9 = S.log.length;
  // Bart typt nog iets (de gewone opslag zou pas over 1,2 s gaan) en klikt
  // meteen: dan moet het vrijgeven zelf eerst opslaan.
  await pi2.locator('#invoerBody input.breedte-input').nth(1).fill('705');
  t0 = Date.now();
  await knop(pi2, 'Nu vrijgeven');
  check('Julian bewerkt binnen een paar tellen', await wachtTot(async () => await modus(pm2) === 'bewerken', 5000), (Date.now() - t0) + ' ms');
  check('Bart kijkt mee', await wachtTot(async () => await modus(pi2) === 'kijken', 5000));
  const i9o = indexVan(l => l.wat === 'opslaan' && l.wie === 'bart', log9);
  const i9v = indexVan(l => l.wat === 'vrijgeven' && l.wie === 'bart', log9);
  check('Barts laatste invoer (B2 705) zit in het project, en werd opgeslagen vóór het vrijgeven',
    dbRuit(2, 'B2').breedte === '705' && i9o >= 0 && i9o < i9v && !apartBewaard().length &&
    (await schermRuit(pm2, 'B2')).breedte === '705',
    JSON.stringify(S.log.slice(log9).map(l => l.wat + ':' + l.wie)) + ' / ' + dbRuit(2, 'B2').breedte);

  /* ══ 10 ═══════════════════════════════════════════════════════ */
  console.log('\n10. Twee tabbladen op Julians Mac: allebei Julian, geen gestuiter');
  const pm2b = await nieuwePagina(mac2);
  await open(pm2b, 2);
  await wacht(1500);
  check('het tweede tabblad bewerkt ook (zelfde apparaat), geen seintje, het eerste ook nog',
    await modus(pm2b) === 'bewerken' && await modus(pm2) === 'bewerken' &&
    !/wil dit project bewerken/.test((await meldingen(pm2)).join(' ') + (await meldingen(pm2b)).join(' ')));
  // Het ene tabblad wijzigt iets dat het andere niet ziet (geen live
  // bericht); dan wijzigt het andere iets. Dat mag het eerste niet wissen.
  S.geenLive.mac2 = true;
  await vulIn(pm2, 'hoogte-input', 0, '655');
  await wachtTot(() => dbRuit(2, 'B1').hoogte === '655', 8000);
  await vulIn(pm2b, 'breedte-input', 1, '701');
  await wachtTot(() => apartBewaard().length >= 1, 10000);
  await wacht(1000);
  // Belofte: niets overschreven, niets kwijt. Elke wijziging staat in het
  // project óf apart (welke van de twee, hangt af van wie eerst was).
  const overal = () => [rijVan(2)].concat(apartBewaard()).map(p => p.data.rijen || []);
  const ergens = (merk, veld, w) => overal().some(rs => rs.some(r => r.merk === merk && r[veld] === w));
  await wachtTot(() => ergens('B1', 'hoogte', '655') && ergens('B2', 'breedte', '701'), 8000);
  check('twee tabbladen: geen van beide wijzigingen kwijt (B1 655 en B2 701 staan in het project of apart)',
    ergens('B1', 'hoogte', '655') && ergens('B2', 'breedte', '701'),
    JSON.stringify([dbRuit(2, 'B1').hoogte, dbRuit(2, 'B2').breedte, apartBewaard().length]));
  S.geenLive = {};
  await pm2b.close();
  const apartNa10 = apartBewaard().length;

  /* ══ 11 ═══════════════════════════════════════════════════════ */
  console.log('\n11. Herstart: Bart werkte offline aan de Molenweg en sloot de app; intussen nam Julian het over');
  // Bart neemt het eerst over (Julian geeft vrij).
  await tochBewerken(pi2);
  await wachtTot(async () => await modus(pi2) === 'bewerken', 12000);
  check('(Bart heeft de Molenweg)', houder(2) === 'bart');
  S.weg.ipad2 = true; await ipad2.setOffline(true);
  await vulIn(pi2, 'breedte-input', 1, '777');
  await wacht(2000);
  check('Barts B2 777 staat alleen op de iPad', dbRuit(2, 'B2').breedte !== '777' && await LS(pi2, 'glasopname_pending') === '1');
  await pi2.close();
  await tochBewerken(pm2);
  m = await wachtOpMelding(pm2, /bart reageert niet/, 15000);
  await knop(pm2, 'Overnemen');
  await wachtTot(async () => await modus(pm2) === 'bewerken', 6000);
  await vulIn(pm2, 'hoogte-input', 0, '650');
  await wachtTot(() => dbRuit(2, 'B1').hoogte === '650', 8000);
  S.weg.ipad2 = false; await ipad2.setOffline(false);
  const pi3 = await nieuwePagina(ipad2);
  await open(pi3, 2);
  await wachtTot(() => apartBewaard().length >= apartNa10 + 1, 15000);
  await wacht(2500);
  const ap11 = apartBewaard().slice(apartNa10);
  const apB2 = ap11.length ? (ap11[0].data.rijen || []).find(r => r.merk === 'B2') : null;
  check('Barts offline werk (B2 777) staat apart, precies één keer', ap11.length === 1 && apB2 && apB2.breedte === '777',
    ap11.length + '; ' + JSON.stringify(apB2));
  check('het project zelf is niet overschreven: B2 705, B1 650 (Julian)', dbRuit(2, 'B2').breedte === '705' && dbRuit(2, 'B1').hoogte === '650');
  check('Bart kijkt mee, met Julians stand op het scherm', await wachtTot(async () => await modus(pi3) === 'kijken', 5000) &&
    (await schermRuit(pi3, 'B1')).hoogte === '650' && (await schermRuit(pi3, 'B2')).breedte === '705');
  await mac2.close(); await ipad2.close();

  }
  if (doe('12')) {
  /* ══ 12 ═══════════════════════════════════════════════════════ */
  console.log('\n12. Telefoon (Android, Pixel 7): de balk, het seintje en het aftellen passen op het scherm');
  resetDb();
  const tel = await apparaatCtx('tel', KEES, Object.assign({}, devices['Pixel 7']), SNEL);
  const mac3 = await apparaatCtx('mac3', JULIAN, { userAgent: UA.mac }, SNEL);
  const pm3 = await nieuwePagina(mac3);
  await open(pm3, 1);
  await wachtTot(async () => await modus(pm3) === 'bewerken', 5000);
  const pt = await nieuwePagina(tel);
  await open(pt, 1);
  await wachtTot(async () => await modus(pt) === 'kijken', 5000);
  const pastNiet = () => pt.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const uit = [...document.querySelectorAll('#slotBalk, #slotBalk button, .bewerkslot-laag .melding-venster, .bewerkslot-laag button')]
      .filter(e => e.offsetParent !== null).map(e => e.getBoundingClientRect()).filter(r => r.right > w + 1 || r.left < -1);
    return uit.length + (document.documentElement.scrollWidth > w + 1 ? 100 : 0);
  });
  check('de balk past (geen horizontaal schuiven), met de knop in beeld', /julian \(Mac\) heeft dit project open/.test(await balk(pt)) &&
    await pastNiet() === 0, await pastNiet());
  if (plaatjes) await pt.screenshot({ path: path.join(plaatjes, 'v106-telefoon-balk.png') });
  await tochBewerken(pt);
  await wachtOpMelding(pt, /julian krijgt een seintje/, 3000);
  check('het venster "Project overnemen" past', await pastNiet() === 0);
  await wachtTot(async () => await modus(pt) === 'bewerken', 15000);
  check('Kees (Android) bewerkt; soort apparaat "Android"', houder(1) === 'kees' && S.slot[P(1)].omschrijving === 'Android');
  await tochBewerken(pm3);
  m = await wachtOpMelding(pt, /julian wil dit project bewerken/, 5000);
  check('het seintje mét aftellen past op de telefoon', m.ok && await pastNiet() === 0 &&
    await pt.$eval('.bewerkslot-laag .bs-aftel', e => e.getBoundingClientRect().width > 100));
  if (plaatjes) await pt.screenshot({ path: path.join(plaatjes, 'v106-telefoon-seintje.png') });
  await wachtTot(async () => await modus(pm3) === 'bewerken', 15000);
  await mac3.close(); await tel.close();

  }
  if (doe('13')) {
  /* ══ 13 ═══════════════════════════════════════════════════════ */
  console.log('\n13. Script 24 nog niet gedraaid: alles werkt zoals in v105, en het startscherm zegt het');
  resetDb();
  S.zonderSlot = true;
  const mac4 = await apparaatCtx('mac4', JULIAN, { userAgent: UA.mac }, SNEL);
  const ipad4 = await apparaatCtx('ipad4', BART, { userAgent: UA.ipad }, SNEL);
  const pm4 = await nieuwePagina(mac4);
  await pm4.goto(adres);
  await wachtTot(() => pm4.$eval('#startWaarschuwing', e => /SQL-script 24/.test(e.innerText)), 8000);
  check('waarschuwing "Voor Jan: SQL-script 24 is nog niet gedraaid"',
    await pm4.$eval('#startWaarschuwing', e => !e.hidden && /Voor Jan: SQL-script 24 is nog niet gedraaid/.test(e.innerText)));
  await open(pm4, 1);
  const pi4 = await nieuwePagina(ipad4);
  await open(pi4, 1);
  await wacht(1500);
  check('geen balk, niemand op slot (beide apparaten mogen, zoals in v105)', !(await balk(pi4)) && !(await balk(pm4)) &&
    !await pi4.evaluate(() => glasAlleenKijken()) && !await pm4.evaluate(() => glasAlleenKijken()));
  await vulIn(pi4, 'breedte-input', 0, '1111');
  check('Bart kan opslaan', await wachtTot(() => dbRuit(1, 'K1').breedte === '1111', 8000));
  await mac4.close(); await ipad4.close();
  S.zonderSlot = false;
  const mac5 = await apparaatCtx('mac5', JULIAN, { userAgent: UA.mac }, SNEL);
  const pm5 = await nieuwePagina(mac5);
  await pm5.goto(adres);
  await wacht(2500);
  check('met script 24: geen waarschuwing', await pm5.$eval('#startWaarschuwing', e => !/SQL-script 24/.test(e.innerText)));
  await mac5.close();

  }
  if (doe('14')) {
  /* ══ 14 ═══════════════════════════════════════════════════════ */
  console.log('\n14. Het project is VRIJ als de iPad met een oude stand terugkomt (de kern van v106)');
  resetDb();
  const ipadA = await apparaatCtx('ipadA', BART, { userAgent: UA.ipad, hasTouch: true }, T);
  const macA = await apparaatCtx('macA', JULIAN, { userAgent: UA.mac }, T);
  let pB = await nieuwePagina(ipadA);
  await open(pB, 1);
  await wachtTot(async () => await modus(pB) === 'bewerken', 5000);
  const pJ = await nieuwePagina(macA);
  await open(pJ, 1);
  await wachtTot(async () => await modus(pJ) === 'kijken', 5000);
  // Bart verliest het bereik en werkt door.
  S.weg.ipadA = true; await ipadA.setOffline(true);
  await vulIn(pB, 'breedte-input', 0, '1300');
  await wacht(1000);
  // Julian neemt het over, werkt, en sluit het project: het is weer vrij.
  await tochBewerken(pJ);
  await wachtOpMelding(pJ, /bart reageert niet/, 12000);
  await knop(pJ, 'Overnemen');
  await wachtTot(async () => await modus(pJ) === 'bewerken', 6000);
  await vulIn(pJ, 'hoogte-input', 2, '950');
  await wachtTot(() => dbRuit(1, 'K3').hoogte === '950', 8000);
  await pJ.evaluate(() => glasNaarStart());
  await wachtTot(() => houder(1) === null, 5000);
  check('(Julian sloot het project: niemand heeft het)', houder(1) === null);
  // Bart krijgt bereik terug, zonder herstart.
  S.weg.ipadA = false; await ipadA.setOffline(false);
  await wachtTot(() => apartBewaard().length >= 1, 15000);
  await wacht(2000);
  check('zonder herstart: de iPad zet zijn oude stand NIET over Julians werk (K1 1200, K3 950)',
    dbRuit(1, 'K1').breedte === '1200' && dbRuit(1, 'K3').hoogte === '950',
    JSON.stringify([dbRuit(1, 'K1').breedte, dbRuit(1, 'K3').hoogte]));
  check('…de database weigerde het op het volgnummer ("julian heeft dit project intussen gewijzigd")',
    S.log.some(l => l.wat === 'geweigerd' && l.wie === 'bart' && /^basis/.test(l.waarom || '')),
    JSON.stringify(S.log.filter(l => l.wat === 'geweigerd')));
  let ap14 = apartBewaard();
  check('…en Barts werk is niet weg: apart bewaard met K1 1300 (één keer)', ap14.length === 1 &&
    ap14[0].data.rijen.find(r => r.merk === 'K1').breedte === '1300', ap14.length);
  check('…als "Kerkstraat 1 (apart bewaard dd-mm uu:mm - bart, iPad)" (v108)',
    ap14.length === 1 && /^Kerkstraat 1 \(apart bewaard \d\d-\d\d \d\d:\d\d - bart, iPad\)$/.test(ap14[0].naam), ap14[0] && ap14[0].naam);
  check('Barts scherm toont nu Julians stand', (await schermRuit(pB, 'K3')).hoogte === '950' &&
    (await schermRuit(pB, 'K1')).breedte === '1200');
  // Daarna kan Bart gewoon verder (het project is vrij).
  await wachtTot(async () => await modus(pB) === 'bewerken', 8000);
  await vulIn(pB, 'breedte-input', 1, '810');
  check('daarna neemt Bart het vrije project en kan hij gewoon opslaan', await wachtTot(() => dbRuit(1, 'K2').breedte === '810', 8000) &&
    houder(1) === 'bart', houder(1));
  // Nu met een herstart: Bart werkt offline, sluit de app; Julian neemt over, werkt, sluit.
  S.weg.ipadA = true; await ipadA.setOffline(true);
  await vulIn(pB, 'hoogte-input', 0, '611');
  await wacht(1000);
  await pB.close();
  await open(pJ, 1);
  await wachtTot(async () => await modus(pJ) === 'kijken', 5000);
  await tochBewerken(pJ);
  await wachtOpMelding(pJ, /bart reageert niet/, 12000);
  await knop(pJ, 'Overnemen');
  await wachtTot(async () => await modus(pJ) === 'bewerken', 6000);
  await vulIn(pJ, 'hoogte-input', 1, '1420');
  await wachtTot(() => dbRuit(1, 'K2').hoogte === '1420', 8000);
  await pJ.evaluate(() => glasNaarStart());
  await wachtTot(() => houder(1) === null, 5000);
  S.weg.ipadA = false; await ipadA.setOffline(false);
  pB = await nieuwePagina(ipadA);
  await open(pB, 1);
  await wachtTot(() => apartBewaard().length >= 2, 15000);
  await wacht(2000);
  ap14 = apartBewaard();
  check('met herstart: ook niet overschreven (K1 hoogte 600, K2 1420), het werk apart (K1 hoogte 611)',
    dbRuit(1, 'K1').hoogte === '600' && dbRuit(1, 'K2').hoogte === '1420' && ap14.length === 2 &&
    ap14[1].data.rijen.find(r => r.merk === 'K1').hoogte === '611',
    JSON.stringify([dbRuit(1, 'K1').hoogte, dbRuit(1, 'K2').hoogte, ap14.length]));
  await ipadA.close(); await macA.close();

  }
  if (doe('15')) {
  /* ══ 15 ═══════════════════════════════════════════════════════ */
  console.log('\n15. Drie apparaten: Kees vraagt het, Bart kijkt mee; Kees krijgt het, niet Bart');
  resetDb();
  const m15 = await apparaatCtx('m15', JULIAN, { userAgent: UA.mac }, T);
  const i15 = await apparaatCtx('i15', BART, { userAgent: UA.ipad }, T);
  const p15 = await apparaatCtx('p15', KEES, { userAgent: UA.win }, T);
  const pm15 = await nieuwePagina(m15); await open(pm15, 1);
  await wachtTot(async () => await modus(pm15) === 'bewerken', 5000);
  const pi15 = await nieuwePagina(i15); await open(pi15, 1);
  const pp15 = await nieuwePagina(p15); await open(pp15, 1);
  await wachtTot(async () => await modus(pp15) === 'kijken' && await modus(pi15) === 'kijken', 5000);
  const log15 = S.log.length;
  await tochBewerken(pp15);
  await wachtTot(async () => await modus(pp15) === 'bewerken', 15000);
  await wacht(2500);
  check('Kees bewerkt; Bart heeft het geen moment gehad en kijkt mee ("kees (Windows-pc)")',
    houder(1) === 'kees' && !S.log.slice(log15).some(l => l.houder === 'bart') && await modus(pi15) === 'kijken' &&
    /kees \(Windows-pc\) heeft dit project open/.test(await balk(pi15)),
    JSON.stringify(S.log.slice(log15).map(l => l.wat + ':' + l.wie + '→' + l.houder)));
  await m15.close(); await i15.close(); await p15.close();

  }
  if (doe('16')) {
  /* ══ 16 ═══════════════════════════════════════════════════════ */
  console.log('\n16. Julian verliest het bereik tijdens het aftellen: opslaan mislukt, dus niet vrijgegeven');
  resetDb();
  const m16 = await apparaatCtx('m16', JULIAN, { userAgent: UA.mac }, T16);
  const i16 = await apparaatCtx('i16', BART, { userAgent: UA.ipad }, T16);
  const pm16 = await nieuwePagina(m16); await open(pm16, 1);
  await wachtTot(async () => await modus(pm16) === 'bewerken', 5000);
  const pi16 = await nieuwePagina(i16); await open(pi16, 1);
  await wachtTot(async () => await modus(pi16) === 'kijken', 5000);
  await tochBewerken(pi16);
  await wachtOpMelding(pm16, /bart wil dit project bewerken/, 5000);
  S.weg.m16 = true; await m16.setOffline(true);
  await vulIn(pm16, 'breedte-input', 2, '933');
  m = await wachtOpMelding(pm16, /Nog niet vrijgegeven/, 20000);
  check('Julian: "Nog niet vrijgegeven … er gaat niets verloren"; hij bewerkt nog', m.ok && /niets verloren/.test(m.tekst) &&
    await modus(pm16) === 'bewerken' && houder(1) === 'julian', m.tekst.slice(0, 160));
  m = await wachtOpMelding(pi16, /julian kreeg het seintje, maar gaf het project nog niet vrij/, 25000);
  check('Bart: "julian kreeg het seintje, maar gaf het project nog niet vrij", met ‹Overnemen›', m.ok, m.tekst.slice(0, 160));
  await knop(pi16, 'Overnemen');
  await wachtTot(async () => await modus(pi16) === 'bewerken', 6000);
  await sluitMeldingen(pm16);
  S.weg.m16 = false; await m16.setOffline(false);
  await wachtTot(() => apartBewaard().length >= 1, 15000);
  await wacht(1500);
  check('Julians werk van tijdens het aftellen (K3 933) staat apart, niet in het project', dbRuit(1, 'K3').breedte === '900' &&
    apartBewaard().length === 1 && apartBewaard()[0].data.rijen.find(r => r.merk === 'K3').breedte === '933');
  await m16.close(); await i16.close();

  }
  if (doe('17')) {
  /* ══ 17 ═══════════════════════════════════════════════════════ */
  console.log('\n17. Opslaan lukt, maar het vrijgeven niet (verbinding weg): Julian houdt het en zegt het');
  resetDb();
  const m17 = await apparaatCtx('m17', JULIAN, { userAgent: UA.mac }, T16);
  const i17 = await apparaatCtx('i17', BART, { userAgent: UA.ipad }, T16);
  const pm17 = await nieuwePagina(m17); await open(pm17, 1);
  await wachtTot(async () => await modus(pm17) === 'bewerken', 5000);
  const pi17 = await nieuwePagina(i17); await open(pi17, 1);
  await wachtTot(async () => await modus(pi17) === 'kijken', 5000);
  S.rpcFout.vrijgeven = true;
  await tochBewerken(pi17);
  m = await wachtOpMelding(pm17, /vrijgeven lukte niet/, 15000);
  check('Julian: "Je werk is opgeslagen, maar het project vrijgeven lukte niet"; hij bewerkt nog', m.ok &&
    await modus(pm17) === 'bewerken' && houder(1) === 'julian', m.tekst.slice(0, 160));
  await sluitMeldingen(pm17);
  await vulIn(pm17, 'breedte-input', 0, '1199');
  check('…en kan gewoon verder opslaan', await wachtTot(() => dbRuit(1, 'K1').breedte === '1199', 8000));
  S.rpcFout = {};
  await m17.close(); await i17.close();

  }
  if (doe('18')) {
  /* ══ 18 ═══════════════════════════════════════════════════════ */
  console.log('\n18. iOS legt de app stil midden in het aftellen; intussen koos Bart Annuleren');
  resetDb();
  const T18 = { hartslag: 30000, aftel: 6, actief: 60000 };
  const m18 = await apparaatCtx('m18', JULIAN, { userAgent: UA.mac }, T18);
  const i18 = await apparaatCtx('i18', BART, { userAgent: UA.ipad }, T18);
  // De klok van deze pagina in eigen hand: stilzetten zoals iOS dat doet
  // (tellers staan stil), en daarna twee uur later verder.
  await m18.clock.install();
  const pm18 = await nieuwePagina(m18); await open(pm18, 1);
  await wachtTot(async () => await modus(pm18) === 'bewerken', 5000);
  const pi18 = await nieuwePagina(i18); await open(pi18, 1);
  await wachtTot(async () => await modus(pi18) === 'kijken', 5000);
  await tochBewerken(pi18);
  await wachtOpMelding(pm18, /bart wil dit project bewerken/, 5000);
  // De app stilleggen: de tellers staan stil (Playwright clock; een
  // zichtbare pagina laat zich in Chromium niet bevriezen via CDP, dat is
  // geprobeerd). Een stilgelegde app hoort ook niets live.
  S.geenLive.m18 = true;
  const nu18 = await pm18.evaluate(() => Date.now());
  await pm18.clock.pauseAt(nu18 + 50);
  const log18 = S.log.length;
  await knop(pi18, 'Annuleren');
  await wacht(8000);                 // langer dan het aftellen (6 s)
  check('(tijdens het stilliggen gebeurt er niets bij Julian)', !S.log.slice(log18).some(l => l.wie === 'julian'));
  await pm18.clock.setSystemTime(nu18 + 2 * 3600e3);
  await pm18.clock.resume();
  await wacht(2500);
  check('na terugkomen niet blind vrijgegeven: Julian bewerkt, het seintje is weg, geen "vrijgeven"',
    await modus(pm18) === 'bewerken' && houder(1) === 'julian' && !S.log.slice(log18).some(l => l.wat === 'vrijgeven') &&
    !(await meldingen(pm18)).some(t => /wil dit project bewerken/.test(t)),
    JSON.stringify(S.log.slice(log18)));
  await m18.close(); await i18.close();
  S.geenLive = {};

  }
  if (doe('19')) {
  /* ══ 19 ═══════════════════════════════════════════════════════ */
  console.log('\n19. Bart vraagt het, en verliest dan zelf de verbinding');
  resetDb();
  const m19 = await apparaatCtx('m19', JULIAN, { userAgent: UA.mac }, T16);
  const i19 = await apparaatCtx('i19', BART, { userAgent: UA.ipad }, T16);
  const pm19 = await nieuwePagina(m19); await open(pm19, 1);
  await wachtTot(async () => await modus(pm19) === 'bewerken', 5000);
  const pi19 = await nieuwePagina(i19); await open(pi19, 1);
  await wachtTot(async () => await modus(pi19) === 'kijken', 5000);
  await tochBewerken(pi19);
  await wachtOpMelding(pi19, /julian krijgt een seintje/, 4000);
  S.weg.i19 = true;
  const gezien19 = [];
  const eind19 = Date.now() + 10000;
  while (Date.now() < eind19) { gezien19.push((await meldingen(pi19)).join(' ')); await wacht(250); }
  check('Bart ziet "Je hebt zelf geen verbinding met de server", niet "julian reageert niet"',
    gezien19.some(t => /Je hebt zelf geen verbinding met de server/.test(t)) && !gezien19.some(t => /reageert niet|nog niet vrij/.test(t)),
    gezien19[gezien19.length - 1].slice(0, 120));
  S.weg.i19 = false;
  check('verbinding terug: Bart krijgt het project (Julian had het intussen vrijgegeven)',
    await wachtTot(async () => await modus(pi19) === 'bewerken', 10000) && houder(1) === 'bart');
  await m19.close(); await i19.close();

  }
  if (doe('20')) {
  /* ══ 20 ═══════════════════════════════════════════════════════ */
  console.log('\n20. De apparaatcode is weg (websitegegevens gewist): Bart ziet zijn eigen project als "op een ander apparaat"');
  resetDb();
  const i20 = await apparaatCtx('i20', BART, { userAgent: UA.ipad }, T16);
  let pi20 = await nieuwePagina(i20); await open(pi20, 1);
  await wachtTot(async () => await modus(pi20) === 'bewerken', 5000);
  await pi20.evaluate(() => localStorage.removeItem('glasopname_apparaat'));
  await pi20.close();
  pi20 = await nieuwePagina(i20); await open(pi20, 1);
  await wachtTot(async () => await modus(pi20) === 'kijken', 5000);
  bk = await balk(pi20);
  check('de balk: "Je hebt dit project open op een ander apparaat of in een andere app (iPad)"',
    /Je hebt dit project open op een ander apparaat of in een andere app \(iPad\)/.test(bk), bk);
  await tochBewerken(pi20);
  await wachtOpMelding(pi20, /bart reageert niet/, 15000);
  await knop(pi20, 'Overnemen');
  check('overnemen van zichzelf lukt, zonder iets apart', await wachtTot(async () => await modus(pi20) === 'bewerken', 6000) &&
    !apartBewaard().length);
  await i20.close();

  }
  if (doe('21')) {
  /* ══ 21 ═══════════════════════════════════════════════════════ */
  console.log('\n21. Julian heeft net een vraag open ("Naar de leverancier?") als Bart het vraagt');
  resetDb();
  const m21 = await apparaatCtx('m21', JULIAN, { userAgent: UA.mac }, T);
  const i21 = await apparaatCtx('i21', BART, { userAgent: UA.ipad }, T);
  const pm21 = await nieuwePagina(m21); await open(pm21, 1);
  await wachtTot(async () => await modus(pm21) === 'bewerken', 5000);
  const pi21 = await nieuwePagina(i21); await open(pi21, 1);
  await wachtTot(async () => await modus(pi21) === 'kijken', 5000);
  await pm21.evaluate(() => { window.__antw = null; appKeuze('Is deze lijst naar de leverancier gegaan?',
    [{ tekst: 'Nee', waarde: 'nee' }, { tekst: 'Ja, verstuurd', waarde: 'ja' }], { kop: 'Naar de leverancier?' })
    .then(a => { window.__antw = a; }); });
  await tochBewerken(pi21);
  await wachtOpMelding(pm21, /bart wil dit project bewerken/, 5000);
  await wacht(9000);
  check('na 9 s: Julian heeft het nog, de vraag staat er nog en is te beantwoorden (het seintje erboven, zonder aftellen)',
    await modus(pm21) === 'bewerken' && houder(1) === 'julian' &&
    /Rond eerst af waar je mee bezig bent/.test((await meldingen(pm21)).join(' ')) &&
    await pm21.isVisible('.melding-laag:not(.bewerkslot-laag) button:has-text("Ja, verstuurd")'));
  check('Bart wacht ("julian heeft het seintje gekregen en rondt eerst iets af"), geen "reageert niet"',
    /rondt eerst iets af/.test((await meldingen(pi21)).join(' ')) && !/reageert niet|nog niet vrij/.test((await meldingen(pi21)).join(' ')),
    (await meldingen(pi21)).join(' | ').slice(0, 160));
  check('het seintje heeft dan geen knop', await pm21.$$eval('.bs-op-de-achtergrond .melding-knoppen button', b => b.length) === 0);
  // Een tik op het seintje (op een iPad nodigt het uit) mag de vraag eronder niet beantwoorden.
  await pm21.click('.bs-op-de-achtergrond .melding-venster');
  await wacht(500);
  check('een tik op het seintje beantwoordt de vraag eronder niet (geen "Nee" bij vergissing)',
    await pm21.evaluate(() => window.__antw) === null &&
    await pm21.isVisible('.melding-laag:not(.bewerkslot-laag) button:has-text("Ja, verstuurd")'));
  if (plaatjes) await pm21.screenshot({ path: path.join(plaatjes, 'v106-seintje-achtergrond.png') });
  await pm21.locator('.melding-laag:not(.bewerkslot-laag) button', { hasText: 'Ja, verstuurd' }).click();
  check('Julian beantwoordt de vraag (Ja, verstuurd), dán telt het af en krijgt Bart het, zonder overnemen',
    await pm21.evaluate(() => window.__antw) === 'ja' && await wachtTot(async () => await modus(pi21) === 'bewerken', 12000) &&
    !S.log.some(l => l.wat === 'forceer'));
  await m21.close(); await i21.close();

  console.log('\n21b. Julian staat in het opslagvenster van de bestellijst (duurt even) als Bart het vraagt');
  resetDb();
  const m21b = await apparaatCtx('m21b', JULIAN, { userAgent: UA.mac }, T);
  const i21b = await apparaatCtx('i21b', BART, { userAgent: UA.ipad }, T);
  await m21b.addInitScript(() => {
    // Het opslagvenster van de Mac/pc: Julian zoekt 12 s naar de goede map.
    window.showSaveFilePicker = () => new Promise(r => setTimeout(() => r({
      createWritable: async () => ({ write: async () => {}, close: async () => {} }) }), 12000));
  });
  const pm21b = await nieuwePagina(m21b); await open(pm21b, 1);
  await wachtTot(async () => await modus(pm21b) === 'bewerken', 5000);
  const pi21b = await nieuwePagina(i21b); await open(pi21b, 1);
  await wachtTot(async () => await modus(pi21b) === 'kijken', 5000);
  await pm21b.click('button:has-text("⬇ Exporteren")');
  await pm21b.click('button:has-text("Bestellijst als PDF")');
  await wacht(1000);
  await tochBewerken(pi21b);
  const gezien21 = [];
  let eind21 = Date.now() + 11000;
  while (Date.now() < eind21) { gezien21.push((await meldingen(pi21b)).join(' ')); await wacht(300); }
  check('tijdens het opslagvenster: Julian houdt het project, Bart wacht (geen "reageert niet")',
    await modus(pm21b) === 'bewerken' && houder(1) === 'julian' && !gezien21.some(t => /reageert niet|nog niet vrij/.test(t)),
    gezien21[gezien21.length - 1].slice(0, 140));
  m = await wachtOpMelding(pm21b, /Naar de leverancier\?/, 15000);
  check('daarna de vraag "Naar de leverancier?" bij Julian, met het project nog op zijn naam', m.ok && houder(1) === 'julian');
  await pm21b.locator('.melding-laag:not(.bewerkslot-laag) button', { hasText: 'Ja, verstuurd' }).click();
  check('Julian kiest "Ja, verstuurd": de bestelling staat in het project, en dán krijgt Bart het (zonder overnemen)',
    await wachtTot(async () => await modus(pi21b) === 'bewerken', 15000) &&
    ((rijVan(1).data.info || {}).bestellingen || []).length === 1 && !S.log.some(l => l.wat === 'forceer'),
    JSON.stringify(((rijVan(1).data.info || {}).bestellingen || []).map(b => b.soort)));
  await m21b.close(); await i21b.close();

  }
  if (doe('22')) {
  /* ══ 22 ═══════════════════════════════════════════════════════ */
  console.log('\n22. Een iPad die nog op v105 staat, naast v106; daarna werkt hij bij');
  if (!fs.existsSync(path.join(oudMap, 'index.html'))) {
    check('§22 kan draaien: v105 staat in ' + OUD + ' (zet OUD105=… naar een uitgepakte v105)', false);
  } else {
    resetDb();
    const m22 = await apparaatCtx('m22', JULIAN, { userAgent: UA.mac }, T);
    const i22 = await apparaatCtx('i22', BART, { userAgent: UA.ipad }, T);
    const pm22 = await nieuwePagina(m22); await open(pm22, 1);
    await wachtTot(async () => await modus(pm22) === 'bewerken', 5000);
    await vulIn(pm22, 'breedte-input', 0, '1205');
    await wachtTot(() => dbRuit(1, 'K1').breedte === '1205', 8000);
    S.oudeCode = true;
    let pi22 = await nieuwePagina(i22); await open(pi22, 1);
    check('(de iPad draait v105)', await pi22.evaluate(() => typeof window.glasBewerkslotStand === 'undefined'));
    await vulIn(pi22, 'hoogte-input', 1, '1444');
    await wacht(3000);
    check('v105 kan niet opslaan (versieslot), het werk blijft op de iPad', dbRuit(1, 'K2').hoogte === '1400' &&
      await LS(pi22, 'glasopname_pending') === '1');
    S.oudeCode = false;
    await pi22.close();
    pi22 = await nieuwePagina(i22); await open(pi22, 1);
    await wachtTot(() => apartBewaard().length >= 1, 15000);
    await wacht(1500);
    check('na het bijwerken: het werk van v105 (K2 1444) staat apart, het project heeft Julians stand',
      dbRuit(1, 'K2').hoogte === '1400' && dbRuit(1, 'K1').breedte === '1205' && apartBewaard().length === 1 &&
      apartBewaard()[0].data.rijen.find(r => r.merk === 'K2').hoogte === '1444');
    check('…en de iPad kijkt mee', await wachtTot(async () => await modus(pi22) === 'kijken', 5000));
    await m22.close(); await i22.close();
  }

  }
  if (doe('23')) {
  /* ══ 23 ═══════════════════════════════════════════════════════ */
  console.log('\n23. Julians app weet nog niet dat Kees het overnam (geen live bericht, hartslag nog niet geweest) en slaat op');
  resetDb();
  const T23 = { hartslag: 60000, aftel: 2, actief: 60000 };
  const m23 = await apparaatCtx('m23', JULIAN, { userAgent: UA.mac }, T23);
  const p23 = await apparaatCtx('p23', KEES, { userAgent: UA.win }, T23);
  const pm23 = await nieuwePagina(m23); await open(pm23, 1);
  await wachtTot(async () => await modus(pm23) === 'bewerken', 5000);
  const pp23 = await nieuwePagina(p23); await open(pp23, 1);
  await wachtTot(async () => await modus(pp23) === 'kijken', 5000);
  S.geenLive.m23 = true;
  await tochBewerken(pp23);
  await wachtOpMelding(pp23, /julian reageert niet/, 12000);
  await knop(pp23, 'Overnemen');
  await wachtTot(async () => await modus(pp23) === 'bewerken', 6000);
  check('(Kees heeft het; Julians app denkt nog dat hij bewerkt)', houder(1) === 'kees' && await modus(pm23) === 'bewerken');
  await vulIn(pm23, 'breedte-input', 0, '1234');
  m = await wachtOpMelding(pm23, /Je werk staat apart/, 10000);
  check('de database weigert Julians opslag; de app zegt "kees bewerkt dit project nu … het staat apart"',
    m.ok && /kees bewerkt dit project nu/.test(m.tekst) && S.log.some(l => l.wat === 'geweigerd' && l.waarom === 'houder'),
    m.tekst.slice(0, 160));
  await wachtTot(() => apartBewaard().length >= 1, 8000);
  check('Julians wijziging (K1 1234) staat apart, niet in het project; Julian kijkt nu mee',
    dbRuit(1, 'K1').breedte === '1200' && apartBewaard().length === 1 &&
    apartBewaard()[0].data.rijen.find(r => r.merk === 'K1').breedte === '1234' &&
    await wachtTot(async () => await modus(pm23) === 'kijken', 5000));
  check('de naam van het aparte project zegt van wie en welk apparaat: "… - julian, Mac)" (v108)',
    apartBewaard().length === 1 && / - julian, Mac\)$/.test(apartBewaard()[0].naam), apartBewaard().map(p => p.naam).join(' | '));
  await m23.close(); await p23.close();
  S.geenLive = {};
  }
  if (doe('24')) {
  /* ══ 24 ═══════════════════════════════════════════════════════ */
  console.log('\n24. Bart kiest op de bouw zonder bereik "Ja, verstuurd"; intussen neemt Kees het over');
  resetDb();
  const i24 = await apparaatCtx('i24', BART, { userAgent: UA.ipad, hasTouch: true }, T);
  const p24 = await apparaatCtx('p24', KEES, { userAgent: UA.win }, T);
  await i24.addInitScript(() => { try { window.showSaveFilePicker = undefined; } catch (e) {} });
  const pi24 = await nieuwePagina(i24); await open(pi24, 1);
  await wachtTot(async () => await modus(pi24) === 'bewerken', 5000);
  const pp24 = await nieuwePagina(p24); await open(pp24, 1);
  await wachtTot(async () => await modus(pp24) === 'kijken', 5000);
  // Alleen de server weg (S.weg), niet de hele verbinding: de pdf-bibliotheek
  // wordt pas bij de eerste pdf geladen, en in de app haalt de service worker
  // die offline uit zijn voorraad; in deze test staat de service worker uit.
  S.weg.i24 = true;
  await pi24.click('button:has-text("⬇ Exporteren")');
  const dl24 = pi24.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await pi24.click('button:has-text("Bestellijst als PDF")');
  m = await wachtOpMelding(pi24, /Naar de leverancier\?/, 20000);
  check('(Bart maakt de bestellijst zonder bereik; de vraag "Naar de leverancier?" komt)', m.ok && !!(await dl24), m.tekst.slice(0, 120));
  await pi24.locator('.melding-laag:not(.bewerkslot-laag) button', { hasText: 'Ja, verstuurd' }).click();
  await wacht(1500);
  check('(de bestelling staat op de iPad, niet in het project)', await pi24.evaluate(() => (projectInfo.bestellingen || []).length) === 1 &&
    !((rijVan(1).data.info || {}).bestellingen || []).length);
  await sluitMeldingen(pi24);
  await tochBewerken(pp24);
  await wachtOpMelding(pp24, /bart reageert niet/, 15000);
  await knop(pp24, 'Overnemen');
  await wachtTot(async () => await modus(pp24) === 'bewerken', 6000);
  // Kees heeft nog niets opgeslagen, en hoort het niet live als Bart terugkomt.
  S.geenLive.p24 = true;
  S.weg.i24 = false;
  await pi24.evaluate(() => window.dispatchEvent(new Event('online')));
  m = await wachtOpMelding(pi24, /alsnog in het project gezet|staat nog niet in het project/, 20000);
  check('Bart: "Je bestelling … is alsnog in het project gezet"', m.ok && /alsnog in het project gezet/.test(m.tekst), m.tekst.slice(0, 200));
  // Kees weet nog van niets en werkt door: zijn opslag moet gewoon lukken.
  await vulIn(pp24, 'breedte-input', 2, '915');
  await wachtTot(() => dbRuit(1, 'K3').breedte === '915', 8000);
  S.geenLive = {};
  check('Kees (wist het nog niet) slaat daarna gewoon op: niet geweigerd, niets apart van hem',
    dbRuit(1, 'K3').breedte === '915' && !S.log.some(l => l.wat === 'geweigerd' && l.wie === 'kees'),
    JSON.stringify(S.log.filter(l => l.wat === 'geweigerd')));
  const b24 = (rijVan(1).data.info || {}).bestellingen || [];
  check('in het project: precies één bestelling (die van Bart), status besteld; Kees houdt het project en zijn K3 915',
    b24.length === 1 && b24[0].door === 'bart' && rijVan(1).status === 'besteld' && houder(1) === 'kees' && dbRuit(1, 'K3').breedte === '915',
    JSON.stringify([b24.length, rijVan(1).status, houder(1), dbRuit(1, 'K3').breedte]));
  check('Kees ziet het: zijn app kent de bestelling (geen 1e bestellijst meer te maken)',
    await wachtTot(async () => await pp24.evaluate(() => (projectInfo.bestellingen || []).length) === 1, 8000));
  check('…en voor Kees staan de maten nu vast (besteld, zoals sinds v104)',
    await pp24.$eval('#invoerBody input.breedte-input', e => e.disabled));
  await pp24.evaluate(() => projectNotitie('na de bestelling'));
  await wachtTot(() => (rijVan(1).data.info || {}).notities === 'na de bestelling', 8000);
  check('Kees werkt verder en slaat op: de bestelling blijft staan',
    (rijVan(1).data.info || {}).notities === 'na de bestelling' && ((rijVan(1).data.info || {}).bestellingen || []).length === 1);
  await i24.close(); await p24.close();
  }
  if (doe('25')) {
  /* ══ 25 ═══════════════════════════════════════════════════════ */
  console.log('\n25. Het gewone geval: Bart werkt offline, de app gaat dicht en weer open; niemand anders deed iets');
  resetDb();
  const i25 = await apparaatCtx('i25', BART, { userAgent: UA.ipad, hasTouch: true }, T);
  let pi25 = await nieuwePagina(i25); await open(pi25, 1);
  await wachtTot(async () => await modus(pi25) === 'bewerken', 5000);
  await vulIn(pi25, 'breedte-input', 0, '1111');
  await wachtTot(() => dbRuit(1, 'K1').breedte === '1111', 8000);
  await wacht(500);
  S.weg.i25 = true; await i25.setOffline(true);
  await vulIn(pi25, 'hoogte-input', 1, '1444');
  await wacht(1500);
  await pi25.close();
  S.weg.i25 = false; await i25.setOffline(false);
  pi25 = await nieuwePagina(i25); await open(pi25, 1);
  check('na de herstart gaat het werk gewoon het project in (K2 1444), niets apart',
    await wachtTot(() => dbRuit(1, 'K2').hoogte === '1444', 10000) && !apartBewaard().length &&
    !S.log.some(l => l.wat === 'geweigerd'),
    JSON.stringify([dbRuit(1, 'K2').hoogte, apartBewaard().length, S.log.filter(l => l.wat === 'geweigerd')]));
  await i25.close();

  }
  if (doe('26')) {
  /* ══ 26 ═══════════════════════════════════════════════════════ */
  // De test van Jan (15 oktober 2026, v107): zelfde account op iPhone en Mac.
  // De iPhone bewerkt, gaat in vliegtuigmodus (wijzigt niets), de Mac neemt
  // over en wijzigt een bestaande maat; de iPhone komt terug. Tot v106 zag
  // hij alleen de gegevens veranderen; het "overgenomen" stond als kort
  // berichtje onderin, en dat viel niet op.
  console.log('\n26. iPhone bewerkt, gaat in vliegtuigmodus; de Mac neemt over en wijzigt; de iPhone komt terug');
  resetDb();
  const TEL_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const f26 = await apparaatCtx('f26', JULIAN, { userAgent: TEL_UA, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, T);
  const m26 = await apparaatCtx('m26', JULIAN, { userAgent: UA.mac }, T);
  const pf26 = await nieuwePagina(f26); await open(pf26, 1);
  await wachtTot(async () => await modus(pf26) === 'bewerken', 5000);
  const pm26 = await nieuwePagina(m26); await open(pm26, 1);
  await wachtTot(async () => await modus(pm26) === 'kijken', 5000);
  S.weg.f26 = true; await f26.setOffline(true);
  await tochBewerken(pm26);
  await wachtOpMelding(pm26, /julian reageert niet/, 12000);
  await knop(pm26, 'Overnemen');
  await wachtTot(async () => await modus(pm26) === 'bewerken', 6000);
  await vulIn(pm26, 'breedte-input', 0, '1234');
  await wachtTot(() => dbRuit(1, 'K1').breedte === '1234', 8000);
  S.weg.f26 = false; await f26.setOffline(false);
  m = await wachtOpMelding(pf26, /Project overgenomen/, 25000);
  check('iPhone: een venster "Project overgenomen — julian (Mac) heeft dit project om HH:MM overgenomen. Je kunt meekijken …"',
    m.ok && /julian \(Mac\) heeft dit project om \d\d:\d\d overgenomen\. Je kunt meekijken; met ‹Toch bewerken› neem je het weer terug\./.test(m.tekst),
    m.tekst.slice(0, 200));
  check('…de iPhone kijkt mee (balk bovenaan), en toont de maat van de Mac (K1 1234)',
    await modus(pf26) === 'kijken' && !!(await balk(pf26)) && (await schermRuit(pf26, 'K1')).breedte === '1234', await balk(pf26));
  check('niets apart bewaard (op de iPhone was niets gewijzigd)', !apartBewaard().length);
  if (plaatjes) await pf26.screenshot({ path: path.join(plaatjes, 'v107-iphone-overgenomen.png') });
  await f26.close(); await m26.close();
  }

  if (doe('27')) {
  /* ══ 27 ═══════════════════════════════════════════════════════ */
  // Jans test van 16 oktober (v107): de iPhone wijzigt iets in vliegtuigmodus,
  // de Mac neemt over en wijzigt ook; de iPhone komt terug. Zijn werk gaat
  // apart. Zijn wensen (v108): (1) in de naam staat van wie en welk
  // apparaat; (2) "Je kunt dit project nu bewerken" verdwijnt vanzelf.
  console.log('\n27. iPhone wijzigt offline, de Mac neemt over: de naam van het aparte project en het berichtje onderin');
  resetDb();
  const TEL27 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const f27 = await apparaatCtx('f27', JULIAN, { userAgent: TEL27, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, T);
  const m27 = await apparaatCtx('m27', JULIAN, { userAgent: UA.mac }, T);
  const pf27 = await nieuwePagina(f27); await open(pf27, 1);
  await wachtTot(async () => await modus(pf27) === 'bewerken', 5000);
  const pm27 = await nieuwePagina(m27); await open(pm27, 1);
  await wachtTot(async () => await modus(pm27) === 'kijken', 5000);
  S.weg.f27 = true; await f27.setOffline(true);
  await vulIn(pf27, 'breedte-input', 0, '1777');
  await wacht(800);
  await tochBewerken(pm27);
  await wachtOpMelding(pm27, /julian reageert niet/, 12000);
  await knop(pm27, 'Overnemen');
  await wachtTot(async () => await modus(pm27) === 'bewerken', 6000);
  const bericht = /Je kunt dit project nu bewerken\./;
  const zagBericht = await wachtTot(async () => bericht.test(await alleTekst(pm27)), 4000);
  const t27 = Date.now();
  check('Mac: "Je kunt dit project nu bewerken." onderin', zagBericht);
  await vulIn(pm27, 'hoogte-input', 0, '1555');
  await wachtTot(() => dbRuit(1, 'K1').hoogte === '1555', 8000);
  const weg27 = await wachtTot(async () => !bericht.test(await alleTekst(pm27)), 11000);
  const na27 = Math.round((Date.now() - t27) / 1000);
  check('…en dat berichtje verdwijnt vanzelf (na ongeveer 8 seconden; was ' + na27 + ' s)', weg27 && na27 >= 6,
    (await alleTekst(pm27)).slice(-120));
  S.weg.f27 = false; await f27.setOffline(false);
  await wachtTot(() => apartBewaard().length >= 1, 25000);
  const ap27 = apartBewaard();
  check('het offline werk van de iPhone (K1 1777) staat apart, niet in het project',
    ap27.length === 1 && ap27[0].data.rijen.find(r => r.merk === 'K1').breedte === '1777' && dbRuit(1, 'K1').breedte !== '1777',
    ap27.map(p => p.naam).join(' | '));
  check('…met de naam "Kerkstraat 1 (apart bewaard dd-mm uu:mm - julian, iPhone)"',
    ap27.length === 1 && /^Kerkstraat 1 \(apart bewaard \d\d-\d\d \d\d:\d\d - julian, iPhone\)$/.test(ap27[0].naam),
    ap27[0] && ap27[0].naam);
  if (plaatjes) await pf27.screenshot({ path: path.join(plaatjes, 'v108-iphone-apart.png') });
  // De iPhone kijkt nu mee. Op een ander tabblad: de strook "Alleen kijken"
  // onder de tabbladen, op één regel (telefoonbreedte).
  await sluitMeldingen(pf27);
  await wachtTot(async () => await modus(pf27) === 'kijken', 5000);
  await pf27.click('.tab-btn:has-text("Project info")');
  await wacht(200);
  const strook = await pf27.evaluate(() => { const c = document.getElementById('kijkChip'); const r = c.getBoundingClientRect();
    return { zicht: !c.hidden && r.height > 0, h: Math.round(r.height), b: Math.round(r.width), tekst: c.innerText.replace(/\s+/g, ' ') }; });
  check('iPhone, Project info: de strook "👁 Alleen kijken — julian ‹Toch bewerken›", op één regel over de breedte',
    strook.zicht && strook.h <= 50 && strook.b >= 380 && /Alleen kijken — julian Toch bewerken/.test(strook.tekst), JSON.stringify(strook));
  if (plaatjes) await pf27.screenshot({ path: path.join(plaatjes, 'v108-iphone-projectinfo-kijken.png') });
  await f27.close(); await m27.close();
  }
  if (doe('28')) {
  /* ══ 28 ═══════════════════════════════════════════════════════ */
  // Een berichtje mét knop moet blijven: "Een collega heeft dit project
  // gewijzigd" met ‹Hun versie laden›. Dat komt als er van elders een
  // wijziging binnenkomt terwijl je in een veld staat (dan overschrijft de
  // app niets onder je cursor). Met het bewerkslot is dat zeldzaam
  // geworden; hier nagebootst met een wijziging die rechtstreeks in de
  // database komt (zoals van een apparaat met een oude versie).
  console.log('\n28. Julian staat in een veld en er komt een wijziging van elders: ‹Hun versie laden› blijft staan');
  resetDb();
  const m28 = await apparaatCtx('m28', JULIAN, { userAgent: UA.mac }, T);
  const pm28 = await nieuwePagina(m28); await open(pm28, 1);
  await wachtTot(async () => await modus(pm28) === 'bewerken', 5000);
  await pm28.locator('#invoerBody input.breedte-input').nth(1).focus();
  const rij28 = rijVan(1);
  rij28.data = JSON.parse(JSON.stringify(rij28.data));
  rij28.data._sessie = 'elders';
  rij28.data.rijen[0].opmerking = 'van elders';
  live('projecten', rij28);
  const zag28 = await wachtTot(async () => /Een collega heeft dit project gewijzigd/.test(await alleTekst(pm28)), 8000);
  check('Julian: "Een collega heeft dit project gewijzigd." met ‹Hun versie laden›', zag28 &&
    await pm28.isVisible('#syncMelding button:has-text("Hun versie laden")'), (await alleTekst(pm28)).slice(-160));
  await wacht(10000);
  check('…en dat blijft staan (na 10 seconden nog), want er moet iets gekozen worden',
    await pm28.isVisible('#syncMelding button:has-text("Hun versie laden")'));
  await m28.close();
  }
  if (doe('29')) {
  /* ══ 29 ═══════════════════════════════════════════════════════ */
  // Inloggen (v108). Jan: op de Mac vroeg macOS pas later, bij een ander
  // tabblad, of het wachtwoord bewaard moest worden. Belofte: de browser
  // hoort het direct na een GESLAAGDE inlog, en bij een fout wachtwoord niet.
  //  a. Chrome/Edge/Android (kennen PasswordCredential): navigator.credentials.store.
  //  b. Safari/Firefox (kennen dat niet): het formulier echt versturen, naar
  //     een verborgen leeg kader; de pagina zelf blijft staan.
  // Hier kan dat alleen in Chromium: in (b) halen we PasswordCredential weg.
  // Wat macOS/iOS zelf dan toont, is hier niet te zien.
  console.log('\n29. Inloggen: de browser hoort het direct na een geslaagde inlog (en niet bij een fout wachtwoord)');
  async function loginCtx(naam, zonderAPI) {
    const ctx = await apparaatCtx(naam, JULIAN, { userAgent: zonderAPI ? UA.mac : UA.win });
    S.sessie[naam] = null;
    await ctx.addInitScript(z => {
      window.__bewaard = []; window.__verstuurd = [];
      if (z) { try { delete window.PasswordCredential; } catch (e) {} window.PasswordCredential = undefined; }
      else if (navigator.credentials) {
        navigator.credentials.store = c => { window.__bewaard.push({ id: c.id, pw: c.password, soort: c.type }); return Promise.resolve(c); };
      }
      document.addEventListener('submit', e => {
        setTimeout(() => window.__verstuurd.push({ echt: !e.defaultPrevented, doel: e.target.target }), 0);
      }, true);
      window.__merk = 'zelfde pagina';
    }, !!zonderAPI);
    return ctx;
  }
  async function stand(page) {
    return page.evaluate(() => ({ bewaard: window.__bewaard, verstuurd: window.__verstuurd, merk: window.__merk,
      login: getComputedStyle(document.getElementById('cloudLogin')).display,
      fout: document.getElementById('cloudLoginFout').textContent, pw: document.getElementById('cloudWachtwoord').value,
      adres: location.href }));
  }
  for (const zonder of [false, true]) {
    const soort = zonder ? 'Safari/Firefox (zonder PasswordCredential)' : 'Chrome/Edge/Android';
    const ctx = await loginCtx(zonder ? 'l29s' : 'l29c', zonder);
    const pg = await nieuwePagina(ctx);
    const kaderNav = [];
    pg.on('framenavigated', f => { if (f.name() === 'cloudLoginKader') kaderNav.push(f.url()); });
    await pg.goto(adres);
    await pg.waitForSelector('#cloudLogin', { state: 'visible', timeout: 10000 });
    await wacht(400);
    const adresVoor = pg.url();
    if (plaatjes && !zonder) await pg.screenshot({ path: path.join(plaatjes, 'v108-inlogscherm.png') });
    kaderNav.length = 0;
    S.logins = 0;
    await pg.fill('#cloudEmail', 'julian@voorbeeld.test');
    await pg.fill('#cloudWachtwoord', 'fout');
    await pg.press('#cloudWachtwoord', 'Enter');
    await wachtTot(async () => /mislukt/.test((await stand(pg)).fout), 5000);
    await wacht(500);
    let st = await stand(pg);
    check(soort + ': fout wachtwoord → "Inloggen mislukt", één poging, en de browser hoort niets (niets bewaard, niet echt verstuurd)',
      /Inloggen mislukt/.test(st.fout) && S.logins === 1 && !st.bewaard.length && !st.verstuurd.some(v => v.echt) && !kaderNav.length,
      JSON.stringify([S.logins, st.bewaard, st.verstuurd, kaderNav]));
    await pg.fill('#cloudWachtwoord', 'geheim');
    S.logins = 0;
    if (zonder) await pg.click('#cloudLoginKnop'); else await pg.press('#cloudWachtwoord', 'Enter');
    await wachtTot(async () => (await stand(pg)).login === 'none', 6000);
    await wacht(400);
    st = await stand(pg);
    check(soort + ': goed wachtwoord (' + (zonder ? 'knop' : 'Enter') + ') → ingelogd, precies één keer',
      st.login === 'none' && S.logins === 1, JSON.stringify([st.login, S.logins, st.fout]));
    if (!zonder) {
      check(soort + ': de browser krijgt het direct aangeboden (credentials.store, één keer, julian@…)',
        st.bewaard.length === 1 && st.bewaard[0].id === 'julian@voorbeeld.test' && st.bewaard[0].pw === 'geheim',
        JSON.stringify(st.bewaard));
    } else {
      check(soort + ': het formulier gaat direct na de inlog echt "verzonden", naar het verborgen kader',
        st.verstuurd.filter(v => v.echt).length === 1 && st.verstuurd.filter(v => v.echt)[0].doel === 'cloudLoginKader',
        JSON.stringify([st.verstuurd, kaderNav]));
    }
    check(soort + ': de pagina zelf bleef staan (niet herladen, zelfde adres)', st.merk === 'zelfde pagina' && pg.url() === adresVoor,
      JSON.stringify([st.merk, pg.url()]));
    await wacht(1500);
    check(soort + ': daarna staat het wachtwoord niet meer in het veld', (await stand(pg)).pw === '');
    await ctx.close();
  }
  }
  if (doe('30')) {
  /* ══ 30 ═══════════════════════════════════════════════════════ */
  // De wachtwoordvraag in de app ("Opgenomen door wijzigen", "Invoer
  // ontgrendelen"). Tot v108 een los wachtwoordveld zonder naam: daar kan
  // Safari later, op een willekeurig moment, over beginnen. Nu met het
  // e-mailadres erbij, onzichtbaar, zodat de browser het herkent als het
  // wachtwoord dat hij al kent.
  console.log('\n30. De wachtwoordvraag in de app heeft het e-mailadres erbij (onzichtbaar)');
  resetDb();
  const m30 = await apparaatCtx('m30', JULIAN, { userAgent: UA.mac }, T);
  const pm30 = await nieuwePagina(m30); await open(pm30, 1);
  await wachtTot(async () => await modus(pm30) === 'bewerken', 5000);
  await pm30.click('.tab-btn:has-text("Project info")');
  await pm30.click('button:has-text("Wijzigen…")');
  await pm30.waitForSelector('.melding-laag input[type=password]', { timeout: 5000 });
  const v30 = await pm30.evaluate(() => {
    const l = document.querySelector('.melding-laag:last-of-type') || document.querySelectorAll('.melding-laag')[document.querySelectorAll('.melding-laag').length - 1];
    const g = l.querySelector('input[autocomplete=username]');
    const w = l.querySelector('input[type=password]');
    const r = g && g.getBoundingClientRect();
    return { g: !!g, waarde: g && g.value, opacity: g && getComputedStyle(g).opacity, breed: r && r.width,
             voor: !!(g && w && (g.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING)),
             focus: document.activeElement === w };
  });
  check('in de vraag: een veld met het e-mailadres (julian@voorbeeld.test), vóór het wachtwoord',
    v30.g && v30.waarde === 'julian@voorbeeld.test' && v30.voor, JSON.stringify(v30));
  check('…onzichtbaar voor het oog (doorzichtig, 1 px), en de cursor staat in het wachtwoord',
    v30.opacity === '0' && v30.breed <= 1 && v30.focus, JSON.stringify(v30));
  if (plaatjes) await pm30.screenshot({ path: path.join(plaatjes, 'v108-wachtwoordvraag.png') });
  await pm30.locator('.melding-laag').last().locator('.melding-knoppen button', { hasText: 'Annuleren' }).click();
  await m30.close();
  }
  /* ══ ═══════════════════════════════════════════════════════════ */
  console.log('\nGeen fouten in de console');
  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  server.close();
  console.log(fouten ? '\n' + fouten + ' FOUT(EN).' : '\nAlles goed.');
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
