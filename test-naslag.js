/* Test voor naslag.js — draaien met: node test-naslag.js
   Bouwt een pagina met alleen het Naslag-paneel na en laat zien wat er
   werkelijk uitkomt, in plaats van te beweren dat het werkt. */
const fs = require('fs');
const { JSDOM } = require('/home/claude/node_modules/jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>
  <div id="panel-naslag" class="tab-panel"><div class="container" id="naslagInhoud"></div></div>
</body></html>`, { runScripts: 'outside-only' });

global.window = dom.window;
global.document = dom.window.document;

// index.html levert DATA; hier alleen het stuk dat naslag.js gebruikt.
const code = fs.readFileSync('naslag.js', 'utf8').replace(/\nif \(typeof module[\s\S]*$/, '');
dom.window.eval(code);
const w = dom.window;
const mod = require('./naslag.js');

let fouten = 0;
function check(naam, gelukt, extra) {
  console.log((gelukt ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!gelukt) fouten++;
}

console.log('\n1. Catalogus');
const totaal = mod.CATALOGUS.reduce((n, g) => n + g.items.length, 0);
check('61 soorten', totaal === 61, totaal + ' gevonden');
const namen = [];
mod.CATALOGUS.forEach(g => g.items.forEach(i => namen.push(g.groep + '|' + i.naam)));
check('geen dubbele namen binnen een groep', new Set(namen).size === namen.length);
const zonderFoto = [];
mod.CATALOGUS.forEach(g => g.items.forEach(i => { if (!i.foto) zonderFoto.push(i.naam); }));
check('elke soort heeft een fotonaam', zonderFoto.length === 0, zonderFoto.join(', '));
const zonderMaat = [];
mod.CATALOGUS.forEach(g => g.items.forEach(i => { if (!i.dikte && !i.opbouw) zonderMaat.push(i.naam); }));
check('elke soort heeft dikte of opbouw', zonderMaat.length === 0, zonderMaat.join(', '));

console.log('\n2. Keuzelijst Glasbewerking');
const lijst = mod.glasbewerkingLijst();
check('42 opties', lijst.length === 42, lijst.length + ' opties');
check('eerste is Helder (standaard)', lijst[0] === 'Helder (standaard)');
check('laatste is Overig (zie opmerking)', lijst[lijst.length - 1] === 'Overig (zie opmerking)');
check('geen dubbele opties', new Set(lijst).size === lijst.length);
check('dikte staat in elk label', lijst.slice(1, -1).every(l => /\(.+\)$/.test(l)));
console.log('       voorbeeld: ' + lijst[7]);

console.log('\n3. Oude waarden omzetten');
const rijen = [
  { glasbewerking: 'Figuurglas - Master Carré' },
  { glasbewerking: 'Getint glas - Blauw' },
  { glasbewerking: 'Figuurglas - Hammerglas' },     // bewust niet omgezet
  { glasbewerking: 'Helder (standaard)' },
];
const omgezet = mod.bewerkingBijwerken(rijen);
check('twee rijen omgezet', omgezet === 2, omgezet + ' omgezet');
check('Master Carré → Master carre', rijen[0].glasbewerking === 'Figuurglas — Master carre (4/6 mm)');
check('Blauw → Float dark blue', rijen[1].glasbewerking === 'Getint — Float dark blue (6/8/10 mm)');
check('twijfelgeval blijft staan', rijen[2].glasbewerking === 'Figuurglas - Hammerglas');
check('standaardwaarde blijft ongemoeid', rijen[3].glasbewerking === 'Helder (standaard)');
check('alle omzettingen wijzen naar een bestaande optie',
  Object.values(mod.BEWERKING_OUD).every(v => lijst.indexOf(v) >= 0));

console.log('\n4. Onbekende waarde blijft zichtbaar in het vakje');
w.DATA = { glasbewerking: lijst };
const opties = w.bewerkingOpties('Figuurglas - Hammerglas');
check('oude waarde is aan de opties toegevoegd', opties[opties.length - 1] === 'Figuurglas - Hammerglas');
check('bekende waarde wordt niet gedupliceerd',
  w.bewerkingOpties('Helder (standaard)').length === lijst.length);

console.log('\n5. Weergave');
w.renderNaslag();
const html = w.document.getElementById('naslagInhoud');
check('paneel is gevuld', html.innerHTML.length > 1000, html.innerHTML.length + ' tekens');
check('figuurglas staat open', html.querySelectorAll('.nsl-kaart').length === 22,
  html.querySelectorAll('.nsl-kaart').length + ' kaarten zichtbaar');
check('negen catalogusgroepen plus vier tabellen',
  html.querySelectorAll('.nsl-sectie').length === 13,
  html.querySelectorAll('.nsl-sectie').length + ' secties');
check('foto-pad klopt',
  (html.querySelector('.nsl-kaart img') || {}).getAttribute &&
  html.querySelector('.nsl-kaart img').getAttribute('src') === 'catalogus/byzanthijn-fijn-blank.jpg',
  html.querySelector('.nsl-kaart img').getAttribute('src'));
check('foto\'s laden pas als ze in beeld komen',
  html.querySelector('.nsl-kaart img').getAttribute('loading') === 'lazy');

console.log('\n6. Sectie openen en sluiten');
w.naslagKlap('Draadglas');
check('draadglas open: 22 + 3 kaarten',
  w.document.querySelectorAll('.nsl-kaart').length === 25,
  w.document.querySelectorAll('.nsl-kaart').length + ' kaarten');
w.naslagKlap('Figuurglas');
check('figuurglas dicht: 3 kaarten over',
  w.document.querySelectorAll('.nsl-kaart').length === 3,
  w.document.querySelectorAll('.nsl-kaart').length + ' kaarten');
w.naslagKlap('Figuurglas');

console.log('\n7. Zoeken');
w.naslagZoeken('kuitglas');                     // synoniem van Crepi
let kaarten = w.document.querySelectorAll('.nsl-kaart');
check('synoniem vindt Crepi', kaarten.length === 1 &&
  kaarten[0].textContent.indexOf('Crepi') >= 0, kaarten.length + ' treffers');
w.naslagZoeken('gehamerd');
kaarten = w.document.querySelectorAll('.nsl-kaart');
check('gehamerd vindt drie soorten', kaarten.length === 3, kaarten.length + ' treffers');
w.naslagZoeken('spiegel');
kaarten = w.document.querySelectorAll('.nsl-kaart');
check('spiegel vindt verzilverd en spiegeldraadglas', kaarten.length === 5,
  kaarten.length + ' treffers');
w.naslagZoeken('zzzz');
check('niets gevonden geeft nette melding',
  w.document.getElementById('naslagInhoud').textContent.indexOf('Niets gevonden') >= 0);
w.naslagZoeken('');
check('wissen toont alles weer',
  w.document.querySelectorAll('.nsl-sectie').length === 13);

console.log('\n8. Grote weergave');
w.naslagGroot('crepi-blank', 'Crepi blank', 'Figuurglas');
check('overlay staat open', w.document.getElementById('naslagGroot').className.indexOf('open') >= 0);
check('overlay toont de juiste foto',
  w.document.querySelector('#naslagGroot img').getAttribute('src') === 'catalogus/crepi-blank.jpg');
w.naslagGrootSluit();
check('overlay sluit', w.document.getElementById('naslagGroot').className.indexOf('open') < 0);

console.log('\n9. Apostrof in een naam breekt de onclick niet');
const metQuote = w.document.body.innerHTML.indexOf("onclick=\"naslagGroot('") >= 0;
check('onclick met enkele quotes aanwezig', metQuote);

console.log('\n' + (fouten === 0 ? 'Alles goed.' : fouten + ' fout(en).'));
process.exit(fouten === 0 ? 0 : 1);
