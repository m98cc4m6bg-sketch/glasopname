/* Testreeks v83 — node test-herstel.js
   Controleert de reparaties die dataverlies moeten voorkomen:
   de lokale kopie, verweesde ruiten, speling per project, onmogelijke
   glasmaten, onvolledige regels, en het doorvoeren met ⤓.
   Laadt het echte index.html met naslag.js en bulk.js erbij.          */
const fs = require('fs');
const { JSDOM } = require('/home/claude/node_modules/jsdom');

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<script src="(?!naslag|bulk)[^"]*"><\/script>/g, '');
html = html.replace('<script src="naslag.js"></script>',
  '<script>' + fs.readFileSync('naslag.js', 'utf8') + '</script>');
html = html.replace('<script src="bulk.js"></script>',
  '<script>' + fs.readFileSync('bulk.js', 'utf8') + '</script>');
// Stubs voor wat uit de weggelaten bestanden komt.
html = html.replace('<script>\n// ═', `<script>
  window.kopieerRegel = function () {};
  window.merkBalkBijwerken = function () {};
  window.blokBalkHTML = function () { return '<div class="blok-bediening"><span id="losseMaatPlek"></span></div>'; };
  window.appMelding = function () { return Promise.resolve(true); };
  window.appFout = window.appMelding;
  window.appVraag = function () { return Promise.resolve(true); };
<\/script>
<script>
// ═`);

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://jelierbouw.test/' });
const w = dom.window;
const d = w.document;
const g = expr => w.eval(expr);

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}

/* ── 1. De lokale kopie bevat en herstelt de héle opname ───────── */
console.log('\n1. Lokale kopie: foto\'s, projectgegevens en taken');

const volledig = {
  rijen: [{
    id: 1, aantal: 2, merk: 'A', maatsoort: 'Sponningmaat', breedte: 1086, hoogte: 1802,
    glasType: 'Gelaagd glas (VSG)', opbouw: '33.1-16-4', rooster: 'Nee',
    ducoType: '', ralKleur: '', glasbewerking: 'Helder (standaard)', opmerking: '',
    roedenverdeling: 'Geen roedenverdeling', roedenbreedte: '', roedenopmerking: '',
    fotoId: 'f1'
  }],
  volgendId: 2,
  fotos: [{ id: 'f1', titel: 'Voorgevel', pad: 'proj/voorgevel.jpg', markeringen: [{ x: 500, y: 500, rijId: 1 }] }],
  info: { klant: 'Verhoef' },
  taken: [{ tekst: 'Bellen', klaar: false }],
  project: 'Verhoef', datum: '21-09-2026', speling: '4', bijtelling: '11'
};
w.localStorage.setItem('glasopname_v2', JSON.stringify(volledig));
d.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));

check('foto teruggezet', g('fotos.length') === 1, g('fotos.length') + ' foto\'s');
check('projectgegevens teruggezet', JSON.stringify(g('projectInfo')) === '{"klant":"Verhoef"}',
  JSON.stringify(g('projectInfo')));
check('taken teruggezet', g('projectTaken.length') === 1, g('projectTaken.length') + ' taken');
check('de ruit hangt nog aan zijn foto', g('rijen[0].fotoId') === 'f1');

// En opslaan schrijft ze ook weer weg.
g('opslaan()');
const bewaard = JSON.parse(w.localStorage.getItem('glasopname_v2'));
check('opslaan bewaart de foto\'s', Array.isArray(bewaard.fotos) && bewaard.fotos.length === 1);
check('opslaan bewaart projectgegevens en taken',
  !!bewaard.info && Array.isArray(bewaard.taken));

/* ── 2. Een ruit zonder zijn foto is nog steeds zichtbaar ──────── */
console.log('\n2. Ruit waarvan de foto ontbreekt');

g('fotos = []');
check('de ruit staat bij de losse maten', g('losseRijen()').length >= 1 &&
  g("losseRijen().some(function (r) { return r.merk === 'A'; })"));
g('renderTabel()');
check('en staat werkelijk in de tabel op het scherm',
  d.querySelectorAll('#invoerBody tr').length >= 1,
  d.querySelectorAll('#invoerBody tr').length + ' regels');
check('losmaken meldt hoeveel ruiten het betreft', g('verweesdeRijenLosmaken()') === 1);
check('daarna hangt de ruit nergens meer aan', g('rijen[0].fotoId') === undefined);

/* ── 3. Speling en bijtelling volgen het project ───────────────── */
console.log('\n3. Speling van het vorige project blijft niet hangen');

d.getElementById('spelingGlobal').value = '8';
d.getElementById('bijtelling').value = '15';
w.localStorage.setItem('glasopname_v2', JSON.stringify({
  rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Ander', datum: ''
}));   // geen speling bewaard
g('laadOpgeslagen()');
check('speling terug op 4 mm', d.getElementById('spelingGlobal').value === '4',
  d.getElementById('spelingGlobal').value);
check('bijtelling terug op 11 mm', d.getElementById('bijtelling').value === '11',
  d.getElementById('bijtelling').value);

/* ── 4. Onmogelijke glasmaten ──────────────────────────────────── */
console.log('\n4. Glasmaat van nul of minder');

g("rijen = [{ id: 9, aantal: 1, merk: 'X', maatsoort: 'Sponningmaat', breedte: 10, hoogte: 10," +
  " glasType: 'Enkel glas', opbouw: '4 mm', rooster: 'Nee', glasbewerking: 'Helder (standaard)'," +
  " roedenverdeling: 'Geen roedenverdeling' }]");
d.getElementById('spelingGlobal').value = '6';
g('herbereken()');
check('geen negatieve glasmaat', g('rijen[0].glasBreedte') === null,
  String(g('rijen[0].glasBreedte')));
check('de ruit telt als onvolledig', g('onvolledigeRijen()').length === 1);
g('renderBestellijst()');
check('en de bestellijst zegt dat er iets niet meegaat',
  d.getElementById('bestellijstInhoud').innerHTML.indexOf('niet op deze lijst') >= 0);

/* ── 5. Onvolledige regel wordt gemeld, complete regels niet ───── */
console.log('\n5. Regel zonder opbouw valt op');

g("rijen = [" +
  "{ id: 1, aantal: 1, merk: 'A', maatsoort: 'Sponningmaat', breedte: 1000, hoogte: 2000," +
  " glasType: 'HR++ glas', opbouw: '4-15-4', rooster: 'Nee', glasbewerking: 'Helder (standaard)'," +
  " opmerking: 'buitenblad gelaagd', roedenopmerking: 'roede 24 mm'," +
  " roedenverdeling: 'Wienersprossen - 2 horizontaal' }," +
  "{ id: 2, aantal: 1, merk: 'B', maatsoort: 'Sponningmaat', breedte: 1000, hoogte: 2000," +
  " glasType: 'HR++ glas', opbouw: '', rooster: 'Nee', glasbewerking: 'Helder (standaard)'," +
  " roedenverdeling: 'Geen roedenverdeling' }]");
d.getElementById('spelingGlobal').value = '4';
g('herbereken()');
g('renderBestellijst()');
const bl = d.getElementById('bestellijstInhoud').innerHTML;
check('de complete ruit staat op de lijst', bl.indexOf('>992<') >= 0 || bl.indexOf('992') >= 0);
check('de onvolledige ruit wordt gemeld', bl.indexOf('niet op deze lijst') >= 0 && bl.indexOf('B') >= 0);
check('beide opmerkingen staan op de bestellijst',
  bl.indexOf('buitenblad gelaagd') >= 0 && bl.indexOf('roede 24 mm') >= 0);

/* ── 6. Rooster en kleur die niet meer in de lijst staan ───────── */
console.log('\n6. Waarde die niet meer in de keuzelijst voorkomt');

g("rijen[0].rooster = 'Ja'; rijen[0].ducoType = 'DucoTon 99 XL'; rijen[0].ralKleur = 'RAL 9999 - Oud';");
g('renderTabel()');
const rijHtml = d.querySelector('#invoerBody tr').innerHTML;
check('het oude Duco-type blijft zichtbaar', rijHtml.indexOf('DucoTon 99 XL') >= 0);
check('de oude RAL-kleur blijft zichtbaar', rijHtml.indexOf('RAL 9999 - Oud') >= 0);

/* ── 7. Doorvoeren met ⤓ ───────────────────────────────────────── */
console.log('\n7. Doorvoeren zet niet ongevraagd de eerste optie');

g('renderTabel()');
const knoppen = [...d.querySelectorAll('#invoerTabel .bulk-vul')].map(k => k.title || '');
check('er staat een ⤓ bij Corr.', knoppen.some(t => t.indexOf('Speling') >= 0), knoppen.join(' | '));
check('er staat een ⤓ bij Bewerking', knoppen.some(t => t.indexOf('Glasbewerking') >= 0));
check('er staat een ⤓ bij Opmerking', knoppen.some(t => t.indexOf('Opmerking') >= 0));

// Maatsoort doorvoeren zonder iets te kiezen mag niets veranderen.
const voor = g('rijen[0].maatsoort');
const knopMaat = [...d.querySelectorAll('#invoerTabel .bulk-vul')]
  .find(k => (k.title || '').indexOf('Maatsoort') >= 0);
if (knopMaat) {
  knopMaat.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const keuze = d.getElementById('bulkVeld');
  check('de keuzelijst begint leeg', keuze && keuze.value === '', keuze ? keuze.value : 'geen lijst');
  g('bulkPasToe()');
  check('niets gekozen = niets gewijzigd', g('rijen[0].maatsoort') === voor, g('rijen[0].maatsoort'));
} else {
  check('⤓ bij Maatsoort gevonden', false);
}

/* ── 8. Alles wissen laat niets achter ─────────────────────────── */
console.log('\n8. Alles wissen');

g("fotos = [{ id: 'f9', titel: 'Test', pad: 'x.jpg', markeringen: [] }];" +
  " projectInfo = { klant: 'X' }; projectTaken = [{ tekst: 'y', klaar: false }];");
g('clearAlles()');
setTimeout(function () {
  check('foto\'s weg', g('fotos.length') === 0, g('fotos.length') + ' over');
  check('projectgegevens weg', Object.keys(g('projectInfo')).length === 0);
  check('taken weg', g('projectTaken.length') === 0);

  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  w.close();
  process.exit(fouten ? 1 : 0);
}, 30);
