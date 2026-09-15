/* Test voor de leverpagina — node test-leverpagina.js
   Maakt de bestellijst-pdf werkelijk met jsPDF en schrijft hem weg, zodat
   test-leverpagina.py met pdfplumber kan nalezen wat er op papier staat.
   Drie gevallen: niets ingevuld, alles ingevuld, en een leverfoto die niet
   opgehaald kan worden (zonder bereik). */
const fs = require('fs');
const { JSDOM } = require('/home/claude/node_modules/jsdom');

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}

function maakOmgeving() {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>
    <input id="projectNaam" value="Teststraat 12">
    <input id="projectDatum" value="15-09-2026">
    <div id="panel-invoer" class="tab-panel"></div>
    <div id="projectVelden"></div><div id="leverBlok"></div>
    <span id="cloudStatus"></span><span id="fotoMelding"></span><span id="statusBar"></span>
  </body></html>`, { runScripts: 'dangerously', url: 'https://jelierbouw.test/' });
  const w = dom.window;

  // laad() ziet een bestaande scripttag met dit kenmerk en laadt niets.
  ['https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
   'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js']
    .forEach(url => {
      const s = w.document.createElement('script');
      s.setAttribute('data-pdf', url);
      w.document.head.appendChild(s);
    });

  const jspdf = require('/home/claude/node_modules/jspdf');
  const autotable = require('/home/claude/node_modules/jspdf-autotable');
  w.jspdf = { jsPDF: jspdf.jsPDF };
  if (autotable.applyPlugin) autotable.applyPlugin(jspdf.jsPDF);
  // doc.save() wil een browser-download; hier schrijven we het document
  // gewoon naar schijf zodat pdfplumber het kan nalezen. Let op: jsPDF hangt
  // zijn methodes aan jsPDF.API, niet aan het prototype — een patch op het
  // prototype doet dus niets.
  w.__opgeslagen = null;
  jspdf.jsPDF.API.save = function (naam) {
    w.__opgeslagen = { naam: naam, bytes: Buffer.from(this.output('arraybuffer')) };
    return this;
  };

  // Wat pdf.js uit de rest van de app verwacht.
  w.eval(`
    var rijen = [{ id: 1, aantal: 2, merk: 'A', maatsoort: 'Sponningmaat',
      breedte: 1000, hoogte: 2000, glasBreedte: 992, glasHoogte: 1992,
      glasType: 'HR++ glas', opbouw: '4-16-4', rooster: 'Nee', ducoType: '', ralKleur: '',
      glasbewerking: 'Figuurglas \\u2014 Crepi blank (4/6/8/10 mm)', opmerking: '',
      roedenverdeling: 'Geen roedenverdeling', roedenbreedte: '', roedenopmerking: '' }];
    var fotos = [];
    var projectInfo = {};
    function losseRijen() { return rijen.filter(function (r) { return !r.fotoId; }); }
    function gaNaarTab(t) { window.__tab = t; }
  `);
  // jsdom heeft geen fetch. logo.png mislukt daardoor netjes (haalLogo vangt
  // dat af), en de leverfoto geven we hieronder desgewenst wél terug.
  w.fetch = function (url) {
    if (w.__jpeg && String(url).indexOf('lever') >= 0) {
      return Promise.resolve({ ok: true, status: 200,
        blob: function () { return Promise.resolve(new w.Blob([w.__jpeg], { type: 'image/jpeg' })); } });
    }
    return Promise.reject(new Error('geen net in de test'));
  };
  w.eval(fs.readFileSync('pdf.js', 'utf8'));
  w.HTMLAnchorElement.prototype.click = function () {};   // geen echte download
  return w;
}

// Exporteert en vangt de pdf op waar de app hem naar een blob schrijft.
function pdfViaExport(w, bestandsnaam) {
  return new Promise((ok, fout) => {
    w.alert = function (t) { fout(new Error('alert: ' + t)); };
    w.exportBestellijstPdf();
    // Staat er een melding, dan doorgaan met 'Toch exporteren'.
    setTimeout(() => {
      const knop = w.document.querySelector('[data-actie="toch"]');
      if (knop) knop.click();
    }, 30);
    const begin = Date.now();
    (function wacht() {
      if (w.__opgeslagen) {
        fs.writeFileSync(bestandsnaam, w.__opgeslagen.bytes);
        ok(bestandsnaam);
        return;
      }
      if (Date.now() - begin > 15000) { fout(new Error('geen pdf binnen 15 s')); return; }
      setTimeout(wacht, 50);
    })();
  });
}

(async () => {
  console.log('\n1. Melding bij ontbrekende gegevens');
  let w = maakOmgeving();
  w.eval("projectInfo.leverAdres = 'werk';");
  w.exportBestellijstPdf();
  await new Promise(r => setTimeout(r, 60));
  const venster = w.document.querySelector('.cloud-overlay');
  check('melding verschijnt', !!venster);
  const punten = venster ? [...venster.querySelectorAll('li')].map(l => l.textContent) : [];
  check('vier punten in de lijst', punten.length === 4, punten.join(' · '));
  const knoppen = venster ? [...venster.querySelectorAll('[data-actie]')].map(b => b.textContent) : [];
  check('drie knoppen: ' + knoppen.join(', '), knoppen.length === 3 &&
    knoppen.indexOf('Aanvullen') >= 0 && knoppen.indexOf('Toch exporteren') >= 0);

  console.log('\n2. Aanvullen sluit de melding en springt naar Project');
  venster.querySelector('[data-actie="aanvullen"]').click();
  check('melding is weg', !w.document.querySelector('.cloud-overlay'));
  check('naar tabblad project', w.__tab === 'project', w.__tab);

  console.log('\n3. Annuleren doet niets');
  w = maakOmgeving();
  w.exportBestellijstPdf();
  await new Promise(r => setTimeout(r, 60));
  w.document.querySelector('[data-actie="sluit"]').click();
  check('melding is weg', !w.document.querySelector('.cloud-overlay'));
  check('geen tabwissel', w.__tab === undefined, String(w.__tab));

  console.log('\n4. Geen melding als alles is ingevuld');
  w = maakOmgeving();
  // Een echte (piep­kleine) jpeg, zodat addImage er iets mee kan.
  w.__jpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDIzMv/bAEMBCQkJDAsMGA0NGDIhHCEyMjIyMjIy' +
    'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEB' +
    'AxEB/8QAFAABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAA' +
    'AAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJgA/9k=',
    'base64');
  w.eval(`
    window.glasSupabase = { storage: { from: function () { return {
      createSignedUrl: function (pad) {
        return Promise.resolve({ data: { signedUrl: 'https://test/' + pad } });
      } }; } } };
    projectInfo.leverAdres = 'werkplaats';
    projectInfo.leverSoort = 'datum';
    projectInfo.leverDatum = '01-10-2026';
    projectInfo.leverInstructie = 'Glas achterom, sleutel bij de buren.';
    fotos.push({ id: 9, soort: 'lever', bron: 'foto', pad: 'p/lever.jpg',
                 titel: 'Leverlocatie', breedte: 4, hoogte: 3, markeringen: [], inkt: [] });
  `);
  const bestandVol = pdfViaExport(w, 'uit-vol.pdf');
  await new Promise(r => setTimeout(r, 60));
  check('geen melding', !w.document.querySelector('.cloud-overlay'));
  await bestandVol;
  check('uit-vol.pdf gemaakt', fs.existsSync('uit-vol.pdf'),
    fs.existsSync('uit-vol.pdf') ? fs.statSync('uit-vol.pdf').size + ' bytes' : '-');

  console.log('\n5. Pdf met niets ingevuld');
  w = maakOmgeving();
  w.eval("projectInfo.leverAdres = 'werk';");
  await pdfViaExport(w, 'uit-leeg.pdf');
  check('uit-leeg.pdf gemaakt', fs.existsSync('uit-leeg.pdf'),
    fs.existsSync('uit-leeg.pdf') ? fs.statSync('uit-leeg.pdf').size + ' bytes' : '-');

  console.log('\n6. Pdf met een foto die niet ophaalbaar is');
  w = maakOmgeving();
  w.eval(`
    projectInfo.leverAdres = 'werkplaats';
    projectInfo.leverSoort = 'zsm';
    projectInfo.leverInstructie = 'Bellen bij aankomst.';
    fotos.push({ id: 9, soort: 'lever', bron: 'foto', pad: 'p/lever.jpg',
                 titel: 'Leverlocatie', breedte: 4, hoogte: 3, markeringen: [], inkt: [] });
    window.glasSupabase = { storage: { from: function () { return {
      createSignedUrl: function () { return Promise.reject(new Error('offline')); } }; } } };
  `);
  await pdfViaExport(w, 'uit-fotomist.pdf');
  check('uit-fotomist.pdf gemaakt', fs.existsSync('uit-fotomist.pdf'));

  console.log('\n' + (fouten === 0 ? 'Node-deel goed. Nu: python3 test-leverpagina.py'
                                   : fouten + ' fout(en).'));
  process.exit(fouten === 0 ? 0 : 1);
})().catch(e => { console.error('FOUT:', e.message); process.exit(1); });
