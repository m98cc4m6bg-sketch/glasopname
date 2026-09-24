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
  Object.keys(g('DATA')).length === 8 && Object.keys(g('DATA').lookup).length === 828,
  Object.keys(g('DATA')).length + ' sleutels, ' + Object.keys(g('DATA').lookup).length + ' lookups');

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
check('figuurglaskaarten open', paneel.querySelectorAll('.nsl-kaart').length === figuur,
  paneel.querySelectorAll('.nsl-kaart').length + ' kaarten');
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

console.log('\n' + (fouten === 0 ? 'Alles goed.' : fouten + ' fout(en).'));
process.exit(fouten === 0 ? 0 : 1);
