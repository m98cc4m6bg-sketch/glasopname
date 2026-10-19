/* Integratietest v63 — node test-index.js
   Laadt het echte index.html met alleen het hoofdscript en naslag.js,
   en print wat er werkelijk gebeurt. De overige bestanden (cloud, pdf,
   import…) blijven eruit: die hebben Supabase en jsPDF nodig. */
const fs = require('fs');
const { JSDOM } = require('/home/claude/node_modules/jsdom');

let html = fs.readFileSync('index.html', 'utf8');
// externe scripts eruit, naslag.js inline erbij
html = html.replace(/<script src="(?!naslag)[^"]*"><\/script>/g, '');
html = html.replace('<script src="naslag.js"></script>',
  '<script>' + fs.readFileSync('naslag.js', 'utf8') + '</script>');
// Stubs voor wat uit de weggelaten bestanden komt (bulk, merken, fotos,
// blokbalk, kopie). Alleen genoeg om renderTabel te laten draaien.
html = html.replace('<script>\n// \u2550', `<script>
  window.bulkIsGeselecteerd = function () { return false; };
  window.bulkToggle = function () {};
  window.kopieerRegel = function () {};
  window.merkBalkBijwerken = function () {};
  window.blokBalkHTML = function () { return '<div class="blok-bediening"><span id="losseMaatPlek"></span></div>'; };
<\/script>
<script>
// \u2550`);

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://jelierbouw.test/' });
const w = dom.window;
const d = w.document;
const g = expr => w.eval(expr);
w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}

console.log('\n1. Tabblad hernoemd');
const tabs = [...d.querySelectorAll('.tab-btn')].map(b => b.textContent.trim());
check('tabbalk: ' + tabs.join(' | '), tabs.some(t => t.indexOf('Naslag') >= 0)
  && !tabs.some(t => t.indexOf('Legenda') >= 0));
check('paneel panel-naslag bestaat', !!d.getElementById('panel-naslag'));
check('paneel panel-legenda is weg', !d.getElementById('panel-legenda'));
check('print verbergt het juiste paneel',
  d.documentElement.innerHTML.indexOf('#panel-samenvatting, #panel-naslag') >= 0);

console.log('\n2. Keuzelijst in DATA');
// Niet op een vast aantal vastpinnen: de catalogus groeit. Wel moet de
// lijst in index.html gelijk zijn aan die uit naslag.js (de controle
// hieronder), en dat is waar het om gaat.
check('lijst is gevuld', g('DATA').glasbewerking.length > 40, g('DATA').glasbewerking.length + ' opties');
check('standaardwaarde ongewijzigd', g('DATA').glasbewerking[0] === 'Helder (standaard)');
const figuur = g('DATA').glasbewerking.filter(b => b.indexOf('Figuurglas — ') === 0).length;
check('figuurglassoorten aanwezig', figuur > 20, figuur + ' soorten');
check('lijst in index.html gelijk aan die uit de catalogus',
  JSON.stringify(g('DATA').glasbewerking) === JSON.stringify(w.glasbewerkingLijst()));
check('overige DATA-sleutels intact',
  // 828 + 59 dikte-regels voor de omgedraaide opbouwen van v96 (4-13-8 e.d.).
  Object.keys(g('DATA')).length === 8 && Object.keys(g('DATA').lookup).length === 887,
  Object.keys(g('DATA')).length + ' sleutels, ' + Object.keys(g('DATA').lookup).length + ' lookups');

console.log('\n2b. Opbouwlijsten (v96)');
{
  const O = g('DATA').opbouw_per_type, L = g('DATA').lookup;
  const typen = ['HR glas', 'HR+ glas', 'HR++ glas', 'HR+++ glas (Triple)', 'Zonwerend glas'];
  const fout = [];
  typen.forEach(t => (O[t] || []).forEach(o => {
    const d = o.replace(/ ZW$/, '').split('-');
    if (!d.every(x => /^\d+$/.test(x))) return;          // gelaagd: richting betekenisvol
    if (+d[0] > +d[d.length - 1]) fout.push(t + ': ' + o + ' (dik binnen)');
    const sp = d.filter((_, i) => i % 2 === 1).map(Number);
    if (t === 'HR++ glas' && sp.some(x => x > 16)) fout.push(t + ': ' + o + ' (spouw > 16)');
    if (t === 'HR+++ glas (Triple)' && (sp.some(x => x < 9) || d[2] !== '4')) fout.push(t + ': ' + o);
  }));
  check('geen dubbelen, geen dik-binnen, geen HR++-spouw > 16, triple alleen echt HR+++',
        fout.length === 0, fout.slice(0, 5).join(', '));
  const aantallen = typen.map(t => (O[t] || []).length).join('/');
  check('aantallen 32/30/45/70/50', aantallen === '32/30/45/70/50', aantallen);
  const zonder = [];
  Object.keys(O).forEach(t => O[t].forEach(o => { if (!L[t + '|' + o]) zonder.push(t + '|' + o); }));
  check('elke opbouw heeft een dikte en gewicht', zonder.length === 0, zonder.slice(0, 5).join(', '));
  check('4-13-8 weegt hetzelfde als de oude 8-13-4',
        JSON.stringify(L['HR++ glas|4-13-8']) === JSON.stringify(L['HR++ glas|8-13-4']));
  check('gelaagd ongemoeid: beide richtingen blijven',
        O['Gehard gelaagd (ESG+VSG)'].indexOf('44.2 ESG-13-4') >= 0 &&
        O['Gehard gelaagd (ESG+VSG)'].indexOf('4-13-44.2 ESG') >= 0);
}

console.log('\n3. Rekenwerk ongemoeid');
const r = g('rijen')[0];
r.maatsoort = 'Sponningmaat'; r.breedte = 1000; r.hoogte = 2000;
r.glasType = 'HR++ glas'; r.opbouw = '4-16-4';
w.herbereken();
check('sponningmaat 1000×2000 bij 4 mm speling → 992×1992',
  r.glasBreedte === 992 && r.glasHoogte === 1992, r.glasBreedte + '×' + r.glasHoogte);
check('dikte en gewicht kloppen nog', r.totaalDikte === 24 && r.kgM2 === 20,
  r.totaalDikte + ' mm / ' + r.kgM2 + ' kg/m²');

console.log('\n4. Keuzevakje in de invoertabel');
w.renderTabel();
let sels = [...d.querySelectorAll('#invoerBody tr:first-child select')];
let bew = sels.find(s => s.innerHTML.indexOf('Helder (standaard)') >= 0);
check('vakje heeft evenveel opties als de lijst',
  bew && bew.options.length === g('DATA').glasbewerking.length,
  bew ? bew.options.length + '' : 'niet gevonden');
check('figuurglas staat in het keuzevakje',
  bew && [...bew.options].some(o => o.value === 'Figuurglas — Chinchilla blank'));

console.log('\n5. Oude waarde blijft zichtbaar');
g('rijen')[0].glasbewerking = 'Figuurglas - Hammerglas';   // niet om te zetten
w.renderTabel();
sels = [...d.querySelectorAll('#invoerBody tr:first-child select')];
bew = sels.find(s => s.innerHTML.indexOf('Helder (standaard)') >= 0);
check('de oude waarde is als extra optie toegevoegd',
  bew && bew.options.length === g('DATA').glasbewerking.length + 1,
  bew ? bew.options.length + ' opties' : '-');
check('en staat geselecteerd', bew && bew.value === 'Figuurglas - Hammerglas', bew && bew.value);

console.log('\n6. Oude waarden omzetten bij het laden');
const oudeStaat = {
  rijen: [{ id: 1, aantal: 1, merk: 'A', maatsoort: 'Sponningmaat', breedte: 500, hoogte: 500,
            glasType: 'Enkel glas', opbouw: '4 mm', rooster: 'Nee',
            glasbewerking: 'Figuurglas - Master Carré', roedenverdeling: 'Geen roedenverdeling' }],
  volgendId: 2, project: 'Test', datum: '', speling: '4', bijtelling: '11'
};
w.localStorage.setItem('glasopname_v2', JSON.stringify(oudeStaat));
w.laadOpgeslagen();
check('Master Carré omgezet naar de nieuwe naam',
  g('rijen')[0].glasbewerking === 'Figuurglas — Master carre', g('rijen')[0].glasbewerking);

console.log('\n7. Bestellijst toont de bewerking');
g('rijen')[0].breedte = 1000; g('rijen')[0].hoogte = 1000;
w.herbereken();
w.renderBestellijst();
const bl = d.getElementById('bestellijstInhoud').textContent;
check('bewerking staat in de bestellijst', bl.indexOf('Master carre') >= 0);
check('glasmaat staat erin', bl.indexOf('992') >= 0);

console.log('\n8. Tabblad Naslag');
w.toon('naslag');
const paneel = d.getElementById('naslagInhoud');
check('paneel is gevuld', paneel.innerHTML.length > 1000, paneel.innerHTML.length + ' tekens');
// Sinds v88 begint elke sectie dicht; openklappen moet de kaarten geven.
check('alle secties dicht bij openen', paneel.querySelectorAll('.nsl-kaart').length === 0,
  paneel.querySelectorAll('.nsl-kaart').length + ' kaarten');
w.naslagKlap('Figuurglas');
check('figuurglas opengeklapt', paneel.querySelectorAll('.nsl-kaart').length === figuur,
  paneel.querySelectorAll('.nsl-kaart').length + ' van ' + figuur + ' kaarten');
w.naslagKlap('Figuurglas');
check('13 secties', paneel.querySelectorAll('.nsl-sectie').length === 13);
// De tabellen zitten in dichtgeklapte secties; openen en dan kijken.
w.naslagKlap('Duco ventilatieroosters op glas');
w.naslagKlap('Maatsoorten en speling');
check('de oude legendatabellen staan er nog',
  d.getElementById('naslagInhoud').textContent.indexOf('DucoGlasMax SR') >= 0 &&
  d.getElementById('naslagInhoud').textContent.indexOf('Dagmaat') >= 0);
check('de nieuwe tabel over uitvoeringen staat erbij',
  d.getElementById('naslagInhoud').textContent.indexOf('Figuurglas: in welke uitvoeringen') >= 0);
check('opmaak is ingeladen', !!d.getElementById('naslagCss'));
w.naslagZoeken('chinchilla');
check('zoeken werkt vanuit het echte paneel',
  d.querySelectorAll('.nsl-kaart').length === 1);
w.naslagZoeken('');

console.log('\n9. Versie');
// De drie versienummers moeten gelijk zijn; welk nummer dat is doet er
// niet toe. Zo blijft deze test kloppen na elke volgende versie.
const versie = g('APP_VERSIE');
const sw = fs.readFileSync('sw.js', 'utf8');
const pdfjs = fs.readFileSync('pdf.js', 'utf8');
check('APP_VERSIE ingevuld', /^v\d+$/.test(versie), versie);
check('sw.js staat op dezelfde versie',
  sw.indexOf("const VERSIE = '" + versie + "'") >= 0);
check('pdf.js staat op dezelfde versie',
  pdfjs.indexOf("PDF_VERSIE = '" + versie + "'") >= 0);
check('sw.js cachet naslag.js', sw.indexOf("'./naslag.js'") >= 0);
// Even veel foto's in sw.js als er in de map staan: anders mist er
// offline een plaatje, of staat er een pad naar een bestand dat weg is.
const opSchijf = fs.existsSync('catalogus')
  ? fs.readdirSync('catalogus').filter(n => n.endsWith('.jpg')).length : 0;
const inSw = (sw.match(/\.\/catalogus\/[a-z0-9-]+\.jpg/g) || []).length;
check('sw.js cachet alle catalogusfoto\'s', inSw === opSchijf,
  inSw + ' in sw.js, ' + opSchijf + ' op schijf');

// v91: de bibliotheken staan in lib/. Elk pad dat de app gebruikt moet op
// schijf staan én in de SHELL-lijst van sw.js — anders werkt het offline
// niet, en dat merk je pas op een dak (handover §6.3).
console.log('\nBibliotheken in lib/ (v91)');
{
  // Alle bestanden van de app, niet een vaste lijst: originelen.js (v93)
  // laadt zelf JSZip, en zo'n nieuwe plek viel anders buiten de controle.
  const appBestanden = ['index.html'].concat(fs.readdirSync('.').filter(n => /\.js$/.test(n) &&
    !/^test-/.test(n) && n !== 'sw.js' && n !== 'config.js'));
  const bronnen = appBestanden.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const paden = Array.from(new Set((bronnen.match(/lib\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.js/g) || [])));
  const sw = fs.readFileSync('sw.js', 'utf8');
  check('de app verwijst naar zeven bibliotheken in lib/ (v93: + JSZip)', paden.length === 7, paden.join(', '));
  paden.forEach(p => {
    check(p + ' staat op schijf', fs.existsSync(p));
    check(p + ' staat in de SHELL van sw.js', sw.indexOf("'./" + p + "'") >= 0);
  });
  // Elk eigen script uit index.html hoort in de SHELL (v93: wachtrij.js en
  // originelen.js zijn nieuw; zonder SHELL werkt juist de wachtrij offline niet).
  const html = fs.readFileSync('index.html', 'utf8');
  const eigen = (html.match(/<script src="(?!lib\/)([a-z0-9-]+\.js)"/g) || []).map(t => t.replace(/^<script src="|"$/g, ''));
  check('index.html laadt wachtrij.js en originelen.js (v93)',
    eigen.indexOf('wachtrij.js') >= 0 && eigen.indexOf('originelen.js') >= 0, eigen.join(', '));
  eigen.forEach(n => check(n + ' staat in de SHELL van sw.js', sw.indexOf("'./" + n + "'") >= 0));
  check('geen bibliotheek meer van de CDN',
    !/cdn\.jsdelivr\.net/.test(['index.html', 'pdf.js', 'import.js'].map(f => fs.readFileSync(f, 'utf8')).join('')));
}

// v100/v101: de service worker installeert een nieuwe versie alleen als élk
// bestand uit SHELL binnenkomt. Eén bestand dat niet in de repo staat, en er
// komt NOOIT meer een update op welk apparaat dan ook. Daarom hier streng.
console.log('\nSHELL compleet en iconen (v101)');
{
  const sw = fs.readFileSync('sw.js', 'utf8');
  const blok = sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].replace(/\/\/.*$/gm, '');
  const shell = Array.from(blok.matchAll(/'([^']+)'/g)).map(m => m[1]);
  const weg = shell.filter(p => p !== './' && !fs.existsSync(p.replace(/^\.\//, '').replace(/\?.*$/, '')));
  check('elk bestand uit SHELL staat in de repo (anders nooit meer een update)', weg.length === 0, weg.join(', '));
  // Iconen: hetzelfde adres in index.html, het manifest en SHELL, mét ?v=.
  // Safari bewaart een favicon onder zijn adres; zonder nieuw adres bleef
  // na v97 op de Mac het oude huisje staan (v101).
  const html = fs.readFileSync('index.html', 'utf8');
  const man = fs.readFileSync('manifest.webmanifest', 'utf8');
  const iconen = Array.from(html.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g)).map(m => m[1])
    .concat(Array.from(man.matchAll(/"src": "([^"]+)"/g)).map(m => m[1]));
  // v111: de favicon heeft de versie in zijn bestandsnaam (favicon-v3.*):
  // ?v=2 alleen was voor Safari op de Mac niet genoeg.
  check('iconen hebben een versie in hun adres (?v=) of naam (-vN.)', iconen.length >= 5 &&
    iconen.every(i => /\?v=\d+$/.test(i) || /-v\d+\.(ico|png)$/.test(i)) &&
    iconen.some(i => /^favicon-v\d+\.ico$/.test(i)), iconen.join(', '));
  check('… en precies dat adres staat in SHELL (offline)', iconen.every(i => shell.indexOf('./' + i) >= 0),
        iconen.filter(i => shell.indexOf('./' + i) < 0).join(', '));
}

console.log('\n' + (fouten === 0 ? 'Alles goed.' : fouten + ' fout(en).'));
process.exit(fouten === 0 ? 0 : 1);
