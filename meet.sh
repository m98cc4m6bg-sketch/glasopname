#!/usr/bin/env bash
# meet.sh — de meetlat van Glasopname (strategie 27-10-2026, pijler 5).
#
# Telt de grenzen uit de skill houdbaar-bouwen en zet ze in een tabel met
# groen / oranje / rood. Bedoeld voor elke pull request: plak de uitvoer in de
# beschrijving. Groen = door; oranje = volgende sessie opruimen; rood = eerst
# opruimen voordat er een nieuwe wens bij komt.
#
# Gebruik:  ./meet.sh
#           START_HIER=pad/naar/START-HIER.md ./meet.sh     (telt die mee bij de startdocumenten)
#           PROJECTKENNIS_MB=1,9 ./meet.sh                    (stand van de projectkennis op claude.ai)
#           SNELLE_KERN_MIN=1,5 BATTERIJ_MIN=52 ./meet.sh     (gemeten tijden invullen)
#
# Alleen node is nodig (geen npm-pakketten). Het script verandert niets.
# De functielengte is een benadering: een eenvoudige teller van accolades
# die tekst, commentaar en reguliere expressies overslaat.
set -euo pipefail
cd "$(dirname "$0")"

node - "$@" <<'NODE'
const fs = require('fs');

// --- welke bestanden zijn "de app" en welke "de tests" ---------------------
const appJs = fs.readdirSync('.').filter(n => n.endsWith('.js') && !n.startsWith('test-'));
const appBestanden = ['index.html', ...appJs];
const testBestanden = fs.readdirSync('.').filter(n => /^test-.*\.(js|py|ts|sql)$/.test(n));
const lees = n => fs.readFileSync(n, 'utf8');
const regels = t => t.split('\n').length;

// Uit index.html alleen de inline <script>-blokken als JavaScript.
function jsVan(naam) {
  const t = lees(naam);
  if (!naam.endsWith('.html')) return [t];
  const blokken = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(t))) blokken.push(m[1]);
  return blokken;
}

// --- functielengte (benadering) ---------------------------------------------
// Loopt teken voor teken; slaat tekst ('…', "…", `…`), commentaar en regex over.
// Een functie begint bij "function" of "=>" gevolgd door "{"; lengte = regels
// tussen die "{" en de bijbehorende "}".
function langsteFuncties(code) {
  const res = [];
  const stapel = []; // per "{": {regel, functie}
  const totaal = code.split('\n').length;
  let i = 0, regel = 1, vorigeBetekenis = '';
  let wachtOpFunctie = false; // net "function …(…)" of "=>" gezien
  const n = code.length;
  while (i < n) {
    const c = code[i], d = code[i + 1];
    if (c === '\n') { regel++; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(code[i] === '*' && code[i + 1] === '/')) { if (code[i] === '\n') regel++; i++; } i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n && code[i] !== q) {
        if (code[i] === '\\') i++;
        else if (code[i] === '\n') regel++;
        else if (q === '`' && code[i] === '$' && code[i + 1] === '{') {
          // eenvoudige ${…} in een template: tel accolades binnen
          let diep = 1; i += 2;
          while (i < n && diep) { if (code[i] === '{') diep++; else if (code[i] === '}') diep--; else if (code[i] === '\n') regel++; if (diep) i++; }
        }
        i++;
      }
      i++; vorigeBetekenis = 'x'; continue;
    }
    if (c === '/' && /[(,=:[!&|?{};]|^$|return$/.test(vorigeBetekenis)) {
      // reguliere expressie
      i++;
      let inKlasse = false;
      while (i < n && (code[i] !== '/' || inKlasse) && code[i] !== '\n') {
        if (code[i] === '\\') i++;
        else if (code[i] === '[') inKlasse = true;
        else if (code[i] === ']') inKlasse = false;
        i++;
      }
      i++; while (/[a-z]/i.test(code[i] || '')) i++;
      vorigeBetekenis = 'x'; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let w = '';
      while (i < n && /[\w$]/.test(code[i])) w += code[i++];
      if (w === 'function') wachtOpFunctie = true;
      vorigeBetekenis = w === 'return' ? 'return' : 'x';
      continue;
    }
    if (c === '=' && d === '>') { wachtOpFunctie = true; i += 2; vorigeBetekenis = '='; continue; }
    if (c === '{') { stapel.push({ regel, functie: wachtOpFunctie, diepte: stapel.length }); wachtOpFunctie = false; }
    else if (c === '}') {
      const o = stapel.pop();
      // De omhulling van een heel bestand ((function () { … })()) telt niet als functie.
      if (o && o.functie && !(o.diepte === 0 && regel - o.regel > totaal / 2)) res.push({ van: o.regel, lengte: regel - o.regel + 1 });
    } else if (c === ';') wachtOpFunctie = false;
    if (!/\s/.test(c)) vorigeBetekenis = c;
    i++;
  }
  return res;
}

let langste = { lengte: 0 }, boven60 = 0, boven100 = 0;
for (const b of appBestanden) {
  for (const code of jsVan(b)) {
    for (const f of langsteFuncties(code)) {
      if (f.lengte > 60) boven60++;
      if (f.lengte > 100) boven100++;
      if (f.lengte > langste.lengte) langste = { ...f, bestand: b };
    }
  }
}

// --- globale functies die in veel bestanden gebruikt worden -----------------
// "Globaal" = wat op window gezet wordt (window.naam = …) plus functies die
// in index.html bovenaan een inline script staan.
const namen = new Set();
for (const b of appBestanden) {
  const t = lees(b);
  for (const m of t.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) namen.add(m[1]);
  if (b === 'index.html') for (const code of jsVan(b)) for (const m of code.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) namen.add(m[1]);
}
const teksten = Object.fromEntries(appBestanden.map(b => [b, lees(b)]));
let inVijf = 0, inTwee = 0;
for (const naam of namen) {
  const re = new RegExp('(^|[^\\w$.])' + naam.replace(/\$/g, '\\$') + '\\b');
  const aantal = appBestanden.filter(b => re.test(teksten[b])).length;
  if (aantal >= 5) inVijf++;
  if (aantal >= 2) inTwee++;
}

// --- tests -------------------------------------------------------------------
let testRegels = 0, wachttijden = 0, namaak = 0;
for (const t of testBestanden) {
  const s = lees(t);
  testRegels += regels(s);
  wachttijden += (s.match(/waitForTimeout\(|\bwacht\(\s*\d|\bslaap\(\s*\d|\bsleep\(\s*\d|setTimeout\(\s*[A-Za-z_$]+\s*,\s*\d/g) || []).length;
  if (/createClient\s*[:(=]/.test(s)) namaak++;
}
const appRegels = appBestanden.reduce((s, b) => s + regels(lees(b)), 0);
const grootste = appBestanden.map(b => ({ b, r: regels(lees(b)) })).sort((a, c) => c.r - a.r)[0];

// --- documentatie --------------------------------------------------------------
const kB = n => fs.existsSync(n) ? fs.statSync(n).size / 1024 : 0;
const claudeKB = kB('CLAUDE.md');
const startHier = process.env.START_HIER;
const startKB = claudeKB + kB('STATUS.md') + (startHier ? kB(startHier) : 0);
const getal = v => v == null || v === '' ? null : Number(String(v).replace(',', '.'));

// --- tabel -------------------------------------------------------------------
const kleur = (w, groen, oranje) => w == null ? '⚪ niet gemeten' : w <= groen ? '🟢 groen' : w <= oranje ? '🟠 oranje' : '🔴 rood';
const nl = (x, d = 0) => x == null ? '–' : x.toLocaleString('nl-NL', { maximumFractionDigits: d, minimumFractionDigits: d });
const rijen = [
  ['grootste app-bestand (regels)', nl(grootste.r) + ' (' + grootste.b + ')', kleur(grootste.r, 800, 1500), '≤ 800 / ≤ 1.500'],
  ['langste functie (regels, benadering)', nl(langste.lengte) + ' (' + langste.bestand + ', r. ' + langste.van + ')', kleur(langste.lengte, 60, 100), '≤ 60 / ≤ 100'],
  ['functies > 60 / > 100 regels', nl(boven60) + ' / ' + nl(boven100), '', 'ter info'],
  ['globale functies in ≥ 5 bestanden', nl(inVijf) + ' (van ' + nl(namen.size) + '; ' + nl(inTwee) + ' in ≥ 2)', kleur(inVijf, 10, 25), '≤ 10 / ≤ 25'],
  ['CLAUDE.md (kB)', nl(claudeKB, 1), kleur(claudeKB, 8, 15), '≤ 8 / ≤ 15'],
  ['startdocumenten sessie (kB)', nl(startKB, 1) + (startHier ? ' (CLAUDE + STATUS + START-HIER)' : ' (CLAUDE + STATUS; START-HIER niet meegeteld)'), kleur(startKB, 15, 30), '≤ 15 / ≤ 30'],
  ['projectkennis (MB)', nl(getal(process.env.PROJECTKENNIS_MB), 2), kleur(getal(process.env.PROJECTKENNIS_MB), 1.0, 1.5), '≤ 1,0 / ≤ 1,5'],
  ['snelle kern (min)', nl(getal(process.env.SNELLE_KERN_MIN), 1), kleur(getal(process.env.SNELLE_KERN_MIN), 2, 4), '≤ 2 / ≤ 4'],
  ['batterij (min)', nl(getal(process.env.BATTERIJ_MIN), 0), kleur(getal(process.env.BATTERIJ_MIN), 15, 30), '≤ 15 / ≤ 30'],
  ['vaste wachttijden in tests', nl(wachttijden), kleur(wachttijden, 0, 100), '0 / ≤ 100'],
  ['kopieën van de nabootsing (tests met een eigen createClient)', nl(namaak), kleur(namaak, 1, 2), '1 / 2'],
  ['testregels / app-regels', nl(testRegels) + ' / ' + nl(appRegels) + ' = ' + nl(testRegels / appRegels, 2), kleur(testRegels / appRegels, 1.0, 1.5), '≤ 1,0 / ≤ 1,5'],
  ['wensen per pull request', 'zelf invullen', '', '1 / 2'],
  ['sessieduur per wens', 'zelf invullen', '', '≤ budget / ≤ 1,5×'],
];
console.log('## Meetlat (' + new Date().toISOString().slice(0, 10) + ')\n');
console.log('| grens | nu | oordeel | groen / oranje |');
console.log('|---|---|---|---|');
for (const r of rijen) console.log('| ' + r.join(' | ') + ' |');
const rood = rijen.filter(r => String(r[2]).includes('rood')).length;
const oranje = rijen.filter(r => String(r[2]).includes('oranje')).length;
console.log('\n' + rood + ' rood, ' + oranje + ' oranje.');
NODE
