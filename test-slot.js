/* Testreeks v90 — node test-slot.js
   Het slot op de invoer na bestellen. Deze reeks bestaat omdat het slot in
   v88 alleen op het scherm zat én alleen op de losse-matentabel werkte: in
   een project mét een foto bouwde renderFotos() de invoervelden daarna
   opnieuw op, en die stonden gewoon open. De oude testreeks keek alleen
   naar #invoerBody en zag het daarom niet.

   Er wordt hier dus op twee niveaus gekeken:
     • de gegevens — verandert er werkelijk iets in `rijen`?
     • het scherm  — staan de velden op alleen-lezen, ook ná opnieuw tekenen?
*/
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('/home/claude/node_modules/jsdom');

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}
const wacht = ms => new Promise(r => setTimeout(r, ms));

const FOTO = 'f1';

function maakApp() {
  let html = fs.readFileSync('index.html', 'utf8');
  // melding.js bewust NIET: de vensters worden hieronder nagebootst, anders
  // blijft de test wachten op een knop die niemand indrukt.
  ['naslag.js', 'bulk.js', 'blokbalk.js', 'fotos.js', 'kopie.js',
   'merken.js', 'undo.js'].forEach(function (naam) {
    html = html.replace('<script src="' + naam + '"></script>',
      '<script>' + fs.readFileSync(naam, 'utf8').replace(/<\/script>/g, '<\\/script>') + '</script>');
  });
  html = html.replace(/<script src="(?!data:)[^"]*"><\/script>/g, '');
  html = html.replace('<script>\n// ═', `<script>
    window.GLASOPNAME_CONFIG = { url: 'VUL_IN', anonKey: 'VUL_IN' };
    window.opslaan = function () { window.__opgeslagen = (window.__opgeslagen || 0) + 1; };
    window.renderProject = function () {};
    window.glasMarkeerWerk = function () {};
    window.glasSpoorNotitie = function (t) { (window.__spoor = window.__spoor || []).push(t); };
    window.glasGebruiker = function () { return { id: 'u1', naam: 'julian', email: 'j@test.nl' }; };
    window.__wachtwoord = 'geheim';
    window.glasWachtwoordKlopt = function (pw) {
      return Promise.resolve(pw === window.__wachtwoord);
    };
    window.__meldingen = [];
    window.appFout = function (t) { window.__meldingen.push(String(t)); return Promise.resolve(true); };
    window.appMelding = window.appFout;
    window.appVraag = function () { return Promise.resolve(true); };
    window.appWachtwoord = function () { return Promise.resolve(window.__typWachtwoord); };
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

// Een project zoals Jan het heeft: een foto met twee ruiten eronder, plus
// één losse maat. Daarna op 'besteld' zetten en alles opnieuw tekenen.
function vulProject(w, status) {
  w.eval(`
    fotos = [{ id: '${FOTO}', bron: 'tekening', pad: null, titel: 'Voorgevel',
               breedte: 1000, hoogte: 800, markeringen: [], inkt: [] }];
    rijen = [
      { id: 1, aantal: 1, merk: 'A', maatsoort: 'Sponningmaat', breedte: '1200', hoogte: '600',
        fotoId: '${FOTO}', glasType: 'HR++ glas', opbouw: '4-15-4', rooster: 'Nee',
        glasbewerking: 'Helder (standaard)', roedenverdeling: 'Geen roedenverdeling',
        opmerking: '', roedenbreedte: '', roedenopmerking: '' },
      { id: 2, aantal: 1, merk: 'B', maatsoort: 'Sponningmaat', breedte: '800', hoogte: '1400',
        fotoId: '${FOTO}', glasType: 'HR++ glas', opbouw: '4-15-4', rooster: 'Nee',
        glasbewerking: 'Helder (standaard)', roedenverdeling: 'Geen roedenverdeling',
        opmerking: '', roedenbreedte: '', roedenopmerking: '' },
      { id: 3, aantal: 1, merk: 'C', maatsoort: 'Sponningmaat', breedte: '900', hoogte: '900',
        glasType: 'HR++ glas', opbouw: '4-15-4', rooster: 'Nee',
        glasbewerking: 'Helder (standaard)', roedenverdeling: 'Geen roedenverdeling',
        opmerking: '', roedenbreedte: '', roedenopmerking: '' }
    ];
    volgendId = 4;
    projectInfo = { status: '${status}', besteld: { op: '2026-10-05T09:00:00Z', door: 'julian',
                    aantal: 3, ruiten: {} } };
    renderTabel(); herbereken(); renderFotos();
  `);
}

function velden(w, waar) {
  // waar: 'foto' = de tabel onder de foto, 'los' = zonder foto of tekening
  const tbody = waar === 'foto' ? 'fotoBody-' + FOTO : 'invoerBody';
  return Array.from(w.document.querySelectorAll('#' + tbody + ' input.breedte-input'));
}
function maat(w, id) {
  return JSON.parse(w.eval('JSON.stringify((rijen.find(r => r.id === ' + id + ') || {}).breedte)'));
}

(async function () {
  const w = maakApp();
  await wacht(300);

  console.log('\n1. Een besteld project: de tabel ónder de foto');
  // Dit is wat Jan meldde: de melding stond er, maar typen kon gewoon.
  vulProject(w, 'besteld');
  await wacht(200);
  check('de app weet dat er een slot op zit', w.invoerOpSlot() === true);
  check('de balk met uitleg staat in beeld',
    !w.document.getElementById('slotBalk').hidden &&
    /besteld/.test(w.document.getElementById('slotBalk').textContent));
  const fotoVelden = velden(w, 'foto');
  check('er staat een invoertabel onder de foto', fotoVelden.length === 2,
    fotoVelden.length + ' breedtevelden');
  check('en die velden zijn niet te bewerken',
    fotoVelden.length > 0 && fotoVelden.every(v => v.disabled === true),
    fotoVelden.map(v => v.disabled).join(','));
  check('de losse maten ook niet',
    velden(w, 'los').every(v => v.disabled === true));

  console.log('\n2. Ook als het scherm opnieuw getekend wordt');
  w.eval('renderFotos();');
  await wacht(100);
  check('na renderFotos staan ze nog steeds dicht',
    velden(w, 'foto').every(v => v.disabled === true),
    velden(w, 'foto').map(v => v.disabled).join(','));
  w.eval('renderFotoTabellen();');
  await wacht(100);
  check('na renderFotoTabellen ook',
    velden(w, 'foto').every(v => v.disabled === true));

  console.log('\n3. En als een veld tóch openstaat, verandert er niets');
  // Het slot op de gegevens: dit is de echte beveiliging. We zetten een
  // veld met geweld weer open en typen erin, zoals een handige gebruiker
  // of een rare weergavevolgorde zou kunnen doen.
  w.__meldingen = [];
  const veld = velden(w, 'foto')[0];
  veld.disabled = false;
  veld.value = '9999';
  veld.dispatchEvent(new w.Event('input', { bubbles: true }));
  await wacht(100);
  check('de maat in de opname is niet veranderd', maat(w, 1) === '1200', String(maat(w, 1)));
  check('het scherm springt terug naar de opgeslagen maat',
    (velden(w, 'foto')[0] || {}).value === '1200', (velden(w, 'foto')[0] || {}).value);
  check('en er komt een melding waarom', w.__meldingen.length === 1 &&
    /op slot|besteld/i.test(w.__meldingen[0]), (w.__meldingen[0] || '').slice(0, 60));

  w.__meldingen = [];
  w.eval("setVal(2, 'hoogte', '1'); setVal(2, 'merk', 'XX');");
  await wacht(100);
  check('rechtstreeks wijzigen lukt ook niet', maat(w, 2) === '800' &&
    w.eval("rijen.find(r => r.id === 2).merk") === 'B');
  check('en wordt niet bij elke poging opnieuw gemeld', w.__meldingen.length <= 1,
    w.__meldingen.length + ' meldingen');

  console.log('\n4. De andere wegen naar de maten zitten ook dicht');
  // Op de ingevulde regels letten, niet op lege: de app zet zelf lege
  // regels klaar om in te typen.
  const gevuld = () => w.eval('JSON.stringify(rijen.filter(r => r.breedte || r.hoogte)' +
    '.map(r => [r.id, r.merk, r.breedte, r.hoogte]))');
  const voor = gevuld();
  check('er staan drie ingevulde regels', JSON.parse(voor).length === 3, voor);
  check('en geen lege regels erbij in een besteld project',
    w.eval('rijen.length') === 3, w.eval('rijen.length') + ' regels in totaal');

  w.eval('verwijderRij(1);');
  check('een regel verwijderen', gevuld() === voor);
  w.eval('voegRijenToe(2);');
  check('regels bijzetten', gevuld() === voor && w.eval('rijen.length') === 3);
  await w.eval('blokLeeg("' + FOTO + '")');
  await wacht(100);
  check('de tabel onder een foto leegmaken', gevuld() === voor);
  await w.eval('groepVerwijder("' + FOTO + '")');
  await wacht(100);
  check('de hele groep verwijderen', gevuld() === voor && w.eval('fotos.length') === 1);
  w.eval('kopieerRegel(2);');
  check('een regel dupliceren', gevuld() === voor);
  w.eval('if (window.ongedaan) ongedaan();');
  check('ongedaan maken', gevuld() === voor);
  check('en de maten staan nog precies zoals ze stonden', gevuld() === voor, gevuld());

  console.log('\n5. Ontgrendelen geeft alles weer vrij');
  w.__typWachtwoord = 'geheim';
  await w.slotOntgrendel();
  await wacht(200);
  check('het slot is eraf', w.invoerOpSlot() === false);
  check('de velden onder de foto zijn weer te bewerken',
    velden(w, 'foto').every(v => v.disabled === false),
    velden(w, 'foto').map(v => v.disabled).join(','));
  const veld2 = velden(w, 'foto')[0];
  veld2.value = '1250';
  veld2.dispatchEvent(new w.Event('input', { bubbles: true }));
  await wacht(100);
  check('en een wijziging komt nu wél aan', maat(w, 1) === '1250', String(maat(w, 1)));
  check('het ontgrendelen staat in het logboek',
    (w.__spoor || []).some(t => /slot geopend/.test(t)), JSON.stringify(w.__spoor));

  console.log('\n6. Een verkeerd wachtwoord geeft niets vrij');
  w.eval("projectInfo.slot = null; renderTabel(); renderFotos();");
  await wacht(100);
  check('weer op slot', w.invoerOpSlot() === true);
  w.__typWachtwoord = 'niet-goed';
  await w.slotOntgrendel();
  await wacht(100);
  check('het slot blijft zitten', w.invoerOpSlot() === true);
  check('de velden blijven dicht', velden(w, 'foto').every(v => v.disabled === true));

  console.log('\n7. Een project dat niet besteld is, werkt gewoon');
  vulProject(w, 'bezig met inmeten/verwerken');
  await wacht(150);
  check('geen slot', w.invoerOpSlot() === false);
  check('geen balk', w.document.getElementById('slotBalk').hidden === true);
  check('velden gewoon te bewerken', velden(w, 'foto').every(v => v.disabled === false));
  w.eval("setVal(1, 'breedte', '1111');");
  check('en wijzigen werkt', maat(w, 1) === '1111', String(maat(w, 1)));

  w.close();
  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})();
