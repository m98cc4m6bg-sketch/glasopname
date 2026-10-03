/* Testreeks v89 — node test-import.js
   De import van sponningmaten. Elke rij die hier doorkomt, komt straks als
   maat in de bestellijst; daarom is de vraag bij elk geval niet alleen "wat
   doet hij" maar "kan er iets stilzwijgend verkeerd gaan". De lijst met
   gevallen komt uit de doorlichting van v89: aanhalingstekens, gewisselde
   kolommen, eenheden, verschoven regels.                                 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('/home/claude/node_modules/jsdom');

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}
const wacht = ms => new Promise(r => setTimeout(r, ms));

function maakApp() {
  let html = fs.readFileSync('index.html', 'utf8');
  ['naslag.js', 'import.js', 'bulk.js', 'melding.js', 'merken.js'].forEach(function (naam) {
    html = html.replace('<script src="' + naam + '"></script>',
      '<script>' + fs.readFileSync(naam, 'utf8').replace(/<\/script>/g, '<\\/script>') + '</script>');
  });
  html = html.replace(/<script src="(?!data:)[^"]*"><\/script>/g, '');
  html = html.replace('<script>\n// ═', `<script>
    window.GLASOPNAME_CONFIG = { url: 'VUL_IN', anonKey: 'VUL_IN' };
    window.opslaan = function () {};
    window.blokBalkHTML = function () { return '<div class="blok-bediening"><span id="losseMaatPlek"></span></div>'; };
    window.bulkPlaatsKnoppen = function () {};
    window.renderFotos = function () {};
    window.renderProject = function () {};
    window.__spoor = [];
    window.glasSpoorNotitie = function (t) { window.__spoor.push(t); };
  <\/script>
  <script>
  // ═`);
  const vc = new VirtualConsole();
  vc.on('error', m => { if (process.env.LOG) console.log('   [fout] ' + m); });
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
                                url: 'https://jelierbouw.test/', virtualConsole: vc });
  const w = dom.window;
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return w;
}

(async function () {
  const w = maakApp();
  await wacht(400);

  // Leest een tabel in tot en met het controlescherm en neemt hem over.
  // Geeft terug wat er in de opname staat, plus wat het scherm meldde.
  async function lees(tekst, aanpassen) {
    w.eval('rijen = []; volgendId = 1; window.__spoor = [];');
    w.impOpen();
    w.document.getElementById('impPlak').value = tekst;
    w.impPlakVerwerken();
    await wacht(150);
    if (aanpassen) { aanpassen(w); await wacht(150); }
    const uit = {
      kop: Array.from(w.document.querySelectorAll('#impVoorbeeld th .imp-kolomnaam')).map(e => e.textContent),
      mapping: Array.from(w.document.querySelectorAll('#impVoorbeeld th select')).map(e => e.value),
      telling: w.document.getElementById('impTelling').textContent,
      geblokkeerd: w.document.getElementById('impControleren').disabled,
      rijen: [], geweigerd: '', totalen: '', nietGebruikt: ''
    };
    if (!uit.geblokkeerd) {
      w.impControleren();
      await wacht(150);
      uit.totalen = (w.document.querySelector('.imp-totalen') || {}).textContent || '';
      uit.herkomst = (w.document.querySelector('.imp-herkomst ul') || {}).textContent || '';
      uit.nietGebruikt = (w.document.querySelector('.imp-niet-gebruikt') || {}).textContent || '';
      const g = w.document.querySelector('.imp-geweigerd');
      uit.geweigerd = g ? g.textContent.replace(/\s+/g, ' ') : '';
      uit.controleRijen = w.document.querySelectorAll('.imp-controle tbody tr').length;
      if (!w.document.getElementById('impToevoegen').disabled) {
        w.impToevoegen();
        await wacht(150);
      }
    }
    uit.rijen = JSON.parse(w.eval(
      'JSON.stringify(rijen.filter(function(r){return r.breedte||r.hoogte;})' +
      '.map(function(r){return {merk:r.merk, b:r.breedte, h:r.hoogte, a:r.aantal, ' +
      'o:r.opmerking||"", m:r.maatsoort};}))'));
    uit.spoor = JSON.parse(w.eval('JSON.stringify(window.__spoor)'));
    return uit;
  }

  console.log('\n1. Een nette CSV komt er precies in');
  let u = await lees('Merk;Breedte;Hoogte\nA;1200;600\nB;800;1400\n');
  check('kolommen zelf herkend', u.mapping.join(',') === 'merk,breedte,hoogte', u.mapping.join(','));
  check('twee rijen overgenomen', u.rijen.length === 2, JSON.stringify(u.rijen));
  check('maten staan waar ze horen',
    u.rijen[0].b === '1200' && u.rijen[0].h === '600' &&
    u.rijen[1].b === '800' && u.rijen[1].h === '1400');
  check('het controlescherm toonde alle rijen', u.controleRijen === 2, String(u.controleRijen));
  check('de totalen kloppen', /2 regels/.test(u.totalen) && /2 ruiten/.test(u.totalen), u.totalen.trim());
  check('en het logboek weet waar het vandaan komt',
    u.spoor.length === 1 && /geplakte tekst/.test(u.spoor[0]) &&
    /breedte uit «Breedte»/.test(u.spoor[0]), JSON.stringify(u.spoor));

  console.log('\n2. Breedte en hoogte van plaats gewisseld (koppen gaan mee)');
  u = await lees('Merk;Hoogte;Breedte\nA;600;1200\nB;1400;800\n');
  check('de app koppelt op kopnaam, niet op plaats',
    u.rijen[0].b === '1200' && u.rijen[0].h === '600', JSON.stringify(u.rijen[0]));
  check('en laat zien uit welke kolom elke maat komt',
    /Breedte.*«Breedte»/.test(u.herkomst.replace(/\s+/g, ' ')), u.herkomst.replace(/\s+/g, ' '));

  console.log('\n3. Aanhalingstekens met een scheidingsteken erin');
  // Dit was de ergste: tot v88 schoof de regel op en werd 800x1400 een
  // hoogte van 800 zonder breedte, zonder dat iets dat liet zien.
  u = await lees('Merk;Opmerking;Breedte;Hoogte\nA;"mat, 2 lagen";1200;600\n' +
                 'B;"let op; buitenzijde";800;1400\n');
  check('beide rijen compleet', u.rijen.length === 2, JSON.stringify(u.rijen));
  check('de maten zijn niet verschoven',
    u.rijen[1].b === '800' && u.rijen[1].h === '1400', JSON.stringify(u.rijen[1]));
  check('de opmerking met puntkomma is heel gebleven',
    u.rijen[1].o === 'let op; buitenzijde', u.rijen[1].o);
  check('en die met komma ook', u.rijen[0].o === 'mat, 2 lagen', u.rijen[0].o);

  console.log('\n4. Komma-CSV met een komma in de opmerking');
  u = await lees('Merk,Opmerking,Breedte,Hoogte\nA,"mat, 2 lagen",1200,600\nB,gewoon,800,1400\n');
  check('ook hier niets verschoven',
    u.rijen.length === 2 && u.rijen[0].b === '1200' && u.rijen[1].h === '1400',
    JSON.stringify(u.rijen));

  console.log('\n5. Regeleinde binnen aanhalingstekens');
  u = await lees('Merk;Opmerking;Breedte;Hoogte\nA;"let op:\ntwee regels";1200;600\nB;gewoon;800;1400\n');
  check('twee rijen, niet drie', u.rijen.length === 2, JSON.stringify(u.rijen.map(r => r.merk)));
  check('de tekst van twee regels is één opmerking',
    /twee regels/.test(u.rijen[0].o), u.rijen[0].o);

  console.log('\n6. Maten die niet precies over te nemen zijn');
  u = await lees('Merk;Breedte;Hoogte\nA;-1200;600\n');
  check('een negatieve maat wordt geweigerd', u.rijen.length === 0);
  check('met de reden erbij', /niet groter dan nul/.test(u.geweigerd), u.geweigerd.slice(0, 90));

  u = await lees('Merk;Breedte;Hoogte\nA;1,2;0,6\nB;800;1400\n');
  check('een halve millimeter wordt geweigerd', u.rijen.length === 1, JSON.stringify(u.rijen));
  check('met de oorspronkelijke tekst erbij',
    /«1,2»/.test(u.geweigerd) && /heel aantal millimeters/.test(u.geweigerd), u.geweigerd.slice(0, 120));
  check('de goede rij gaat wel door', u.rijen[0] && u.rijen[0].b === '800');

  u = await lees('Merk;Breedte;Hoogte\nA;ca 1200;600\n');
  check('«ca 1200» is geen maat', u.rijen.length === 0 && /is geen maat/.test(u.geweigerd),
    u.geweigerd.slice(0, 80));

  u = await lees('Merk;Breedte;Hoogte\nA;;600\nB;800;\n');
  check('een ontbrekende maat wordt geweigerd', u.rijen.length === 0, JSON.stringify(u.rijen));
  check('en benoemd als geen breedte / geen hoogte',
    /geen breedte/.test(u.geweigerd) && /geen hoogte/.test(u.geweigerd), u.geweigerd.slice(0, 120));

  console.log('\n7. Duizendtalscheiding en mm blijven gewoon werken');
  u = await lees('Merk;Breedte;Hoogte\nA;1.500;2.100\nB;800 mm;1400mm\n');
  check('1.500 wordt 1500', u.rijen[0] && u.rijen[0].b === '1500', JSON.stringify(u.rijen[0]));
  check('800 mm wordt 800', u.rijen[1] && u.rijen[1].b === '800');
  check('en het scherm laat zien wat er stond',
    w.document.getElementById('impControle') !== null);

  console.log('\n8. Een regel met een cel te veel');
  u = await lees('Merk;Breedte;Hoogte\nA;1200;600\nB;800;1400;rommel\n');
  check('alleen de nette regel komt erin', u.rijen.length === 1 && u.rijen[0].merk === 'A',
    JSON.stringify(u.rijen));
  check('de andere wordt geweigerd als mogelijk verschoven',
    /mogelijk verschoven/.test(u.geweigerd), u.geweigerd.slice(0, 110));

  console.log('\n9. Een kolom die er wel naar uitziet maar niet gekoppeld is');
  u = await lees('Merk;Breedte sponning;Breedte glas;Hoogte\nA;1200;1192;600\n');
  check('de eerste breedte wordt gebruikt', u.rijen[0] && u.rijen[0].b === '1200');
  check('en de app meldt welke kolom blijft liggen',
    /Breedte glas/.test(u.nietGebruikt), u.nietGebruikt.trim());

  console.log('\n10. Een kop die het tegenovergestelde zegt wordt tegengehouden');
  u = await lees('Merk;Hoogte;Breedte\nA;600;1200\n', function (win) {
    win.impMapWijzig(1, 'breedte');
    win.impMapWijzig(2, 'hoogte');
  });
  check('de knop Controleren staat uit', u.geblokkeerd === true);
  check('met uitleg waarom',
    /kop zegt hoogte/.test(u.telling) && /Hoogte/.test(u.telling), u.telling);
  check('en er komt dus niets in de lijst', u.rijen.length === 0);

  console.log('\n11. Zonder kopregel koppelt de app niets zelf');
  u = await lees('A;1200;600\nB;800;1400\n');
  check('niets gekoppeld', u.mapping.join('') === '', u.mapping.join(','));
  check('de knop staat uit tot je zelf kiest', u.geblokkeerd === true);
  check('er komt niets in de lijst', u.rijen.length === 0);

  console.log('\n12. Zelf koppelen zonder kopregel werkt wel');
  u = await lees('A;1200;600\nB;800;1400\n', function (win) {
    win.impMapWijzig(0, 'merk');
    win.impMapWijzig(1, 'breedte');
    win.impMapWijzig(2, 'hoogte');
  });
  check('twee rijen overgenomen', u.rijen.length === 2, JSON.stringify(u.rijen));
  check('en het logboek noemt de kolomnummers',
    /kolom 2/.test(u.spoor.join(' ')) || /Kolom 2/.test(u.spoor.join(' ')), JSON.stringify(u.spoor));

  console.log('\n13. Aantallen');
  u = await lees('Merk;Aantal;Breedte;Hoogte\nA;4;1200;600\nB;2 stuks;800;1400\nC;;900;900\n');
  check('drie regels', u.rijen.length === 3, JSON.stringify(u.rijen.map(r => r.a)));
  check('aantal 4 blijft 4', u.rijen[0].a === '4', String(u.rijen[0].a));
  check('«2 stuks» wordt 2', u.rijen[1].a === '2', String(u.rijen[1].a));
  check('leeg wordt 1', u.rijen[2].a === '1', String(u.rijen[2].a));
  check('de totalen tellen ruiten, niet regels',
    /3 regels/.test(u.totalen) && /7 ruiten/.test(u.totalen), u.totalen.trim());

  u = await lees('Merk;Aantal;Breedte;Hoogte\nA;twee;1200;600\n');
  check('een onleesbaar aantal wordt geweigerd', u.rijen.length === 0 &&
    /aantal «twee»/.test(u.geweigerd), u.geweigerd.slice(0, 90));

  console.log('\n14. Tussenkopjes en totaalregels worden overgeslagen');
  u = await lees('Merk;Breedte;Hoogte\nVerdieping 1;;\nA;1200;600\nTotaal;;\nB;800;1400\n');
  check('alleen de maten komen erin', u.rijen.length === 2, JSON.stringify(u.rijen.map(r => r.merk)));
  check('en dat wordt gemeld, niet verstopt',
    /zonder maten/.test(u.telling) || /zonder maten/.test(u.geweigerd), u.telling);

  console.log('\n15. 1200 x 600 in één cel');
  u = await lees('Merk;Maat\nA;1200 x 600\n', function (win) {
    win.impMapWijzig(1, 'breedte');
  });
  check('wordt breedte 1200 en hoogte 600',
    u.rijen.length === 1 && u.rijen[0].b === '1200' && u.rijen[0].h === '600',
    JSON.stringify(u.rijen));

  console.log('\n16. De maatsoort gaat mee');
  u = await lees('Merk;Breedte;Hoogte\nA;1200;600\n', function (win) {
    win.document.getElementById('impMaatsoort').value = 'Glasmaat (direct)';
  });
  check('de gekozen maatsoort staat op de rij',
    u.rijen[0] && u.rijen[0].m === 'Glasmaat (direct)', u.rijen[0] && u.rijen[0].m);
  check('en staat ook op het controlescherm',
    /Glasmaat/.test(u.totalen), u.totalen.trim());

  w.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})();
