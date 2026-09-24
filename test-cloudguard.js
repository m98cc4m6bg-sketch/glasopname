/* Testreeks v83 — node test-cloudguard.js
   Controleert de rem in cloud.js: een opname waarin ruiten naar een foto
   wijzen die er niet is, mag niet naar de server. Supabase zelf wordt
   niet aangeroepen; we testen de controle en de lokale kopie.          */
const fs = require('fs');
const { JSDOM } = require('/home/claude/node_modules/jsdom');

const html = `<!DOCTYPE html><html><body>
  <span id="cloudStatus"></span>
  <button id="cloudProjectKnop"></button>
  <input id="projectNaam" value="Test"><input id="projectDatum" value="">
  <select id="spelingGlobal"><option value="4" selected>4</option><option value="8">8</option></select>
  <select id="bijtelling"><option value="11" selected>11</option></select>
  <div id="cloudLogin"></div><div id="cloudProjecten"></div>
  <input id="cloudEmail"><input id="cloudWachtwoord">
  <div id="cloudLoginFout"></div><div id="cloudProjectLijst"></div>
  <div id="syncMelding"></div><div id="naamWaarschuwing"></div>
  <script>
    window.rijen = []; window.volgendId = 1; window.fotos = [];
    window.projectInfo = {}; window.projectTaken = [];
    window.renderTabel = function () {}; window.herbereken = function () {};
    window.renderFotos = function () {}; window.renderProject = function () {};
    window.voegRijenToe = function () {}; window.opslaan = function () {};
    window.clearAlles = function () {};
    window.appMelding = function () { return Promise.resolve(true); };
    window.appFout = window.appMelding;
  <\/script>
  <script>SCRIPT<\/script>
</body></html>`.replace('SCRIPT', fs.readFileSync('cloud.js', 'utf8').replace(/<\/script>/g, '<\\/script>'));

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://jelierbouw.test/' });
const w = dom.window;

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}

console.log('\n1. De controle op een kloppende opname');
check('cloud.js is geladen', typeof w.standDeugt === 'function');

const goed = {
  rijen: [{ id: 1, merk: 'A', fotoId: 'f1' }, { id: 2, merk: 'B' }],
  fotos: [{ id: 'f1', pad: 'x.jpg', markeringen: [] }]
};
const fout = {
  rijen: [{ id: 1, merk: 'A', fotoId: 'f1' }],
  fotos: []
};
const leeg = { rijen: [], fotos: [] };

check('een complete opname mag omhoog', w.standDeugt(goed) === true);
check('een opname zonder de bijbehorende foto wordt tegengehouden', w.standDeugt(fout) === false);
check('een lege opname mag omhoog', w.standDeugt(leeg) === true);
check('losse ruiten zonder foto zijn geen probleem',
  w.standDeugt({ rijen: [{ id: 3, merk: 'C' }], fotos: [] }) === true);

console.log('\n2. Opslaan zonder verbinding blijft lokaal');
// Zonder window.supabase meldt cloud.js dat hij niet verbonden is; het
// werk hoort dan gewoon in de lokale kopie te staan.
w.rijen = [{ id: 1, merk: 'A', breedte: 1000, hoogte: 2000 }];
w.opslaan();
const lokaal = w.localStorage.getItem('glasopname_v2');
check('er staat een lokale kopie', !!lokaal, lokaal ? lokaal.length + ' tekens' : 'leeg');
if (lokaal) {
  const s = JSON.parse(lokaal);
  check('met de ruiten erin', Array.isArray(s.rijen) && s.rijen.length === 1);
  check('en met een plek voor de foto\'s', Array.isArray(s.fotos));
}
check('de vlag "nog niet verstuurd" staat aan',
  w.localStorage.getItem('glasopname_pending') === '1');

console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
w.close();
process.exit(fouten ? 1 : 0);
