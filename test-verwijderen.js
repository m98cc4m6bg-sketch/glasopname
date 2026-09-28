/* Testreeks v85 — node test-verwijderen.js
   Supabase wordt nagebootst met een echte projectenlijst en een
   fotomap, zodat het verwijderen van een project helemaal nagelopen kan
   worden: met en zonder foto's, het geopende project en een ander, en de
   gevallen waarin het misgaat.                                          */
const fs = require('fs');
const { JSDOM } = require('/home/claude/node_modules/jsdom');

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}
const wacht = ms => new Promise(r => setTimeout(r, ms));

const html = `<!DOCTYPE html><html><body>
  <span id="cloudStatus"></span>
  <button id="cloudProjectKnop"></button>
  <input id="projectNaam" value="Alexander"><input id="projectDatum" value="15-09-2026">
  <select id="spelingGlobal"><option value="4" selected>4</option></select>
  <select id="bijtelling"><option value="11" selected>11</option></select>
  <div id="cloudLogin"></div>
  <div id="cloudProjecten" style="display:flex"></div>
  <input id="cloudEmail"><input id="cloudWachtwoord">
  <div id="cloudLoginFout"></div>
  <input id="cloudZoekVeld" value="">
  <div id="cloudTelling"></div>
  <div id="cloudProjectLijst"></div>
  <div id="syncMelding"></div><div id="naamWaarschuwing"></div>
  <div id="ingelogdAls"></div>
</body></html>`;

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://jelierbouw.test/' });
const w = dom.window;
Object.defineProperty(w.document, 'visibilityState', { get: () => 'visible' });

/* ── nagebootste database ─────────────────────────────────────────── */
const db = {
  projecten: [
    { id: 'p1', naam: 'Alexander', datum: '15-09-2026', status: 'open', aantal_ruiten: 0,
      adres: 'Ambachtstraat 4, 3319 CA Dordrecht', open_taken: 0, updated_at: '2026-09-17T18:22:00Z',
      data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Alexander',
              datum: '15-09-2026', speling: '4', bijtelling: '11' } },
    { id: 'p2', naam: 'Verhoef', datum: '', status: 'open', aantal_ruiten: 1, adres: '',
      open_taken: 0, updated_at: '2026-09-28T09:37:00Z',
      data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Verhoef',
              datum: '', speling: '4', bijtelling: '11' } },
    { id: 'p3', naam: 'Bruins', datum: '01-09-2026', status: 'open', aantal_ruiten: 6, adres: '',
      open_taken: 0, updated_at: '2026-09-21T12:24:00Z',
      data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Bruins',
              datum: '01-09-2026', speling: '4', bijtelling: '11' } }
  ]
};
const opslag = { p3: ['1-abc.jpg', '2-def.jpg'] };     // alleen Bruins heeft foto's
const gedaan = { verwijderdeBestanden: [], fouten: [], updates: [], deletes: [] };
let faalDelete = null;        // foutmelding van de database
let geenRechten = false;      // delete raakt niets, rij blijft staan
let netwerk = true;

function rijenVan(tabel, filters) {
  return (db[tabel] || []).filter(function (r) {
    return Object.keys(filters).every(function (k) { return r[k] === filters[k]; });
  });
}

function bouwer(tabel) {
  var st = { op: null, filters: {}, terug: false };
  var b = {};
  b.select = function () { if (!st.op) st.op = 'select'; else st.terug = true; return b; };
  b.delete = function () { st.op = 'delete'; return b; };
  b.update = function () { st.op = 'update'; return b; };
  b.insert = function (rij) { st.op = 'insert'; st.nieuw = rij; return b; };
  b.eq = function (k, v) { st.filters[k] = v; return b; };
  b.or = function () { return b; };
  b.order = function () { return b; };
  b.limit = function () { return b; };

  function antwoord(enkel) {
    if (!netwerk) return { data: null, error: { message: 'Failed to fetch' } };
    var rijen = rijenVan(tabel, st.filters);
    if (st.op === 'delete') {
      gedaan.deletes.push(st.filters.id);
      if (faalDelete) return { data: null, error: { message: faalDelete } };
      if (geenRechten) return { data: [], error: null };
      db[tabel] = db[tabel].filter(function (r) { return rijen.indexOf(r) < 0; });
      return { data: st.terug ? rijen.map(function (r) { return { id: r.id }; }) : null, error: null };
    }
    if (st.op === 'insert') {
      var nieuwId = 'n' + (db[tabel].length + 1) + Date.now().toString(36).slice(-3);
      var rij = Object.assign({ id: nieuwId, updated_at: new Date().toISOString() }, st.nieuw || {});
      db[tabel].push(rij);
      return { data: st.terug ? { id: nieuwId } : { id: nieuwId }, error: null };
    }
    if (st.op === 'update') {
      gedaan.updates.push(st.filters.id);
      return { data: st.terug ? rijen.map(function (r) { return { id: r.id }; }) : null, error: null };
    }
    if (enkel) return { data: rijen[0] || null, error: null };
    return { data: rijen, error: null };
  }

  b.maybeSingle = function () { return Promise.resolve(antwoord(true)); };
  b.single = function () { return Promise.resolve(antwoord(true)); };
  b.then = function (goed, fout) { return Promise.resolve(antwoord(false)).then(goed, fout); };
  return b;
}

w.eval(`
  window.rijen = []; window.volgendId = 1; window.fotos = [];
  window.projectInfo = {}; window.projectTaken = [];
  window.renderTabel = function () {}; window.herbereken = function () {};
  window.renderFotos = function () {}; window.renderProject = function () {};
  window.voegRijenToe = function () {}; window.opslaan = function () {};
  window.clearAlles = function () {}; window.merkOpnieuwBeoordelen = function () {};
  window.esc = function (t) { return String(t === undefined || t === null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  window.GLASOPNAME_CONFIG = { url: 'https://test.supabase.co', anonKey: 'sb_publishable_test' };
`);
w.appVraag = function () { return Promise.resolve(true); };
w.appMelding = function () { return Promise.resolve(true); };
w.appFout = function (t) { gedaan.fouten.push(String(t)); return Promise.resolve(true); };
w.appKeuze = function () { return Promise.resolve('door'); };

w.supabase = {
  createClient: function () {
    return {
      auth: {
        getSession: function () {
          return Promise.resolve({ data: { session: { user: { id: 'u1', email: 'julian@jelierbouw.nl' } } } });
        },
        signOut: function () { return Promise.resolve({}); }
      },
      from: function (tabel) { return bouwer(tabel); },
      removeChannel: function () {},
      channel: function () {
        var k = { state: 'joined' };
        k.on = function () { return k; };
        k.subscribe = function (cb) { if (cb) cb('SUBSCRIBED'); return k; };
        return k;
      },
      storage: {
        from: function () {
          return {
            list: function (id) {
              return Promise.resolve({ data: (opslag[id] || []).map(function (n) { return { name: n }; }), error: null });
            },
            remove: function (paden) {
              gedaan.verwijderdeBestanden = gedaan.verwijderdeBestanden.concat(paden);
              return Promise.resolve({ data: paden, error: null });
            }
          };
        }
      }
    };
  }
};

w.localStorage.setItem('glasopname_project', 'p1');
w.localStorage.setItem('glasopname_v2', JSON.stringify({ rijen: [], fotos: [] }));
w.localStorage.setItem('glasopname_pending', '1');

const script = w.document.createElement('script');
script.textContent = fs.readFileSync('cloud.js', 'utf8');

const lijstTekst = () => w.document.getElementById('cloudProjectLijst').textContent;
const doorzichtig = () => w.document.getElementById('cloudProjectLijst').style.opacity;
const pil = () => w.document.getElementById('cloudStatus').textContent;

(async function () {
  w.document.body.appendChild(script);
  await wacht(300);

  console.log('\n1. Het geopende project verwijderen (zonder foto\'s)');
  w.cloudProjectenTonen();
  await wacht(200);
  check('de lijst toont drie projecten', lijstTekst().indexOf('Alexander') >= 0 &&
    lijstTekst().indexOf('Verhoef') >= 0 && lijstTekst().indexOf('Bruins') >= 0);

  await w.cloudVerwijder('p1');
  await wacht(400);
  check('het project is uit de lijst verdwenen', lijstTekst().indexOf('Alexander') < 0, lijstTekst().slice(0, 60));
  check('de andere projecten staan er nog', lijstTekst().indexOf('Verhoef') >= 0 && lijstTekst().indexOf('Bruins') >= 0);
  check('de lijst is niet meer grijs', doorzichtig() === '', '"' + doorzichtig() + '"');
  check('het pilletje meldt het', pil().indexOf('verwijderd') >= 0, pil());
  check('de koppeling met het project is los', !w.localStorage.getItem('glasopname_project'));
  check('de openstaande vlag is opgeruimd', !w.localStorage.getItem('glasopname_pending'));
  check('het projectnaamveld is leeg', w.document.getElementById('projectNaam').value === '',
    '"' + w.document.getElementById('projectNaam').value + '"');
  check('er is geen foutmelding gegeven', gedaan.fouten.length === 0, gedaan.fouten.join(' | '));
  check('er is niets uit de database weg wat er moest blijven', db.projecten.length === 2);

  console.log('\n2. Een project mét foto\'s verwijderen, dat niet openstaat');
  gedaan.fouten = [];
  await w.cloudVerwijder('p3');
  await wacht(400);
  check('Bruins is weg', lijstTekst().indexOf('Bruins') < 0, lijstTekst().slice(0, 60));
  check('de foto\'s zijn opgeruimd', gedaan.verwijderdeBestanden.length === 2,
    gedaan.verwijderdeBestanden.join(', '));
  check('de lijst is niet grijs blijven staan', doorzichtig() === '');
  check('geen foutmelding', gedaan.fouten.length === 0, gedaan.fouten.join(' | '));

  console.log('\n3. De database weigert: er mag niets verdwijnen');
  gedaan.fouten = [];
  faalDelete = 'new row violates row-level security policy';
  await w.cloudVerwijder('p2');
  await wacht(400);
  check('het project staat er nog', lijstTekst().indexOf('Verhoef') >= 0);
  check('en staat ook nog in de database', db.projecten.some(function (p) { return p.id === 'p2'; }));
  check('de lijst is weer normaal', doorzichtig() === '');
  check('de gebruiker krijgt een duidelijke melding', gedaan.fouten.length === 1 &&
    gedaan.fouten[0].indexOf('staat er nog') >= 0, gedaan.fouten.join(' | '));
  faalDelete = null;

  console.log('\n4. Geen rechten: de opdracht raakt niets');
  gedaan.fouten = [];
  geenRechten = true;
  await w.cloudVerwijder('p2');
  await wacht(400);
  check('het project blijft staan', db.projecten.some(function (p) { return p.id === 'p2'; }));
  check('de melding gaat over rechten', gedaan.fouten.length === 1 &&
    gedaan.fouten[0].indexOf('rechten') >= 0, gedaan.fouten.join(' | '));
  check('de lijst is niet grijs', doorzichtig() === '');
  geenRechten = false;

  console.log('\n5. Geen verbinding tijdens het verwijderen');
  gedaan.fouten = [];
  netwerk = false;
  await w.cloudVerwijder('p2');
  await wacht(400);
  check('het project blijft staan', db.projecten.some(function (p) { return p.id === 'p2'; }));
  check('de lijst is niet grijs blijven staan', doorzichtig() === '');
  check('er is gemeld dat het niet gelukt is', gedaan.fouten.length === 1, gedaan.fouten.join(' | '));
  netwerk = true;

  console.log('\n6. Een collega verwijdert het project dat jij open hebt');
  gedaan.fouten = [];
  // Doe alsof p2 geopend is en verdwijn hem daarna uit de database.
  await w.cloudOpen('p2');
  await wacht(300);
  check('p2 staat open', w.localStorage.getItem('glasopname_project') === 'p2');
  db.projecten = db.projecten.filter(function (p) { return p.id !== 'p2'; });
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  await wacht(300);
  check('het pilletje zegt dat het project weg is', pil().indexOf('bestaat niet meer') >= 0, pil());
  check('en dat wordt één keer uitgelegd', gedaan.fouten.length === 1, gedaan.fouten.join(' | '));
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  await wacht(300);
  check('niet nog een keer dezelfde melding', gedaan.fouten.length === 1, gedaan.fouten.length + ' meldingen');

  console.log('\n7. Twee keer op de prullenbak tikken');
  gedaan.fouten = [];
  db.projecten.push({ id: 'p4', naam: 'Dubbel', datum: '', status: 'open', aantal_ruiten: 0,
    adres: '', open_taken: 0, updated_at: '2026-09-28T12:00:00Z',
    data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Dubbel',
            datum: '', speling: '4', bijtelling: '11' } });
  w.cloudProjectenTonen();
  await wacht(200);
  await Promise.all([w.cloudVerwijder('p4'), w.cloudVerwijder('p4')]);
  await wacht(400);
  check('het project is weg', !db.projecten.some(function (p) { return p.id === 'p4'; }));
  check('de tweede keer geeft geen foutmelding', gedaan.fouten.length === 0, gedaan.fouten.join(' | '));
  check('de lijst is niet grijs blijven staan', doorzichtig() === '');

  console.log('\n8. Annuleren in het bevestigingsvenster');
  gedaan.fouten = [];
  db.projecten.push({ id: 'p6', naam: 'Blijft staan', datum: '', status: 'open', aantal_ruiten: 0,
    adres: '', open_taken: 0, updated_at: '2026-09-28T12:02:00Z',
    data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Blijft staan',
            datum: '', speling: '4', bijtelling: '11' } });
  var aantalVoor = db.projecten.length;
  var vraagOud = w.appVraag;
  w.appVraag = function () { return Promise.resolve(false); };
  await w.cloudVerwijder('p6');
  await wacht(200);
  check('er is niets verwijderd', db.projecten.length === aantalVoor,
    db.projecten.length + ' van ' + aantalVoor);
  check('de lijst is niet grijs geworden', doorzichtig() === '');
  w.appVraag = vraagOud;

  console.log('\n9. Na het verwijderen wordt er niets meer naar dat project geschreven');
  gedaan.updates = [];
  // p5 aanmaken, openen, verwijderen, en dan proberen op te slaan.
  db.projecten.push({ id: 'p5', naam: 'Laatste', datum: '', status: 'open', aantal_ruiten: 0,
    adres: '', open_taken: 0, updated_at: '2026-09-28T12:05:00Z',
    data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Laatste',
            datum: '', speling: '4', bijtelling: '11' } });
  await w.cloudOpen('p5');
  await wacht(300);
  await w.cloudVerwijder('p5');
  await wacht(300);
  w.rijen = [{ id: 1, merk: 'A', breedte: 1000, hoogte: 2000 }];
  w.opslaan();
  await wacht(2000);
  check('er is niets weggeschreven', gedaan.updates.length === 0,
    gedaan.updates.join(', ') || 'geen');
  check('de koppeling is en blijft los', !w.localStorage.getItem('glasopname_project'));

  console.log('\n10. Het laatste project verwijderen');
  gedaan.fouten = [];
  db.projecten.forEach(function (p) { /* alles behalve één weghalen */ });
  db.projecten = db.projecten.slice(0, 1);
  var laatste = db.projecten[0].id;
  w.cloudProjectenTonen();
  await wacht(200);
  await w.cloudVerwijder(laatste);
  await wacht(400);
  check('de lijst meldt netjes dat er niets meer is',
    lijstTekst().length > 0 && lijstTekst().indexOf('Blijft staan') < 0, lijstTekst().slice(0, 80));
  check('geen foutmelding', gedaan.fouten.length === 0, gedaan.fouten.join(' | '));
  check('de lijst is niet grijs', doorzichtig() === '');

  console.log('\n11. Werk redden nadat een collega het project verwijderde');
  gedaan.fouten = [];
  gedaan.updates = [];
  db.projecten.push({ id: 'p7', naam: 'Kwijt', datum: '', status: 'open', aantal_ruiten: 0,
    adres: '', open_taken: 0, updated_at: '2026-09-28T12:10:00Z',
    data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Kwijt',
            datum: '', speling: '4', bijtelling: '11' } });
  await w.cloudOpen('p7');
  await wacht(300);
  // invoer op het scherm, met een ruit die aan een foto hangt
  w.eval("rijen = [{ id: 1, merk: 'A', maatsoort: 'Sponningmaat', breedte: 1000, hoogte: 2000," +
         " glasType: 'HR++ glas', opbouw: '4-15-4', fotoId: 'f1' }];" +
         " fotos = [{ id: 'f1', pad: 'p7/x.jpg', markeringen: [] }];");
  // en dan is het project ineens weg
  db.projecten = db.projecten.filter(function (p) { return p.id !== 'p7'; });
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  await wacht(300);
  check('de app meldt dat het project weg is', pil().indexOf('bestaat niet meer') >= 0, pil());

  var vraagOud2 = w.appVraag;
  var gevraagd = '';
  w.appVraag = function (tekst) { gevraagd = String(tekst); return Promise.resolve(true); };
  w.appInvoer = function () { return Promise.resolve('Kwijt hersteld'); };
  await w.cloudNieuw();
  await wacht(600);
  w.appVraag = vraagOud2;

  check('er is gevraagd of de ruiten mee moeten', gevraagd.indexOf('meenemen') >= 0, gevraagd.slice(0, 60));
  check('de ruit staat er nog', w.eval('rijen.length') === 1 && w.eval("rijen[0].merk") === 'A',
    w.eval('JSON.stringify(rijen.map(function (r) { return r.merk; }))'));
  check('de ruit hangt niet meer aan de verdwenen foto', w.eval('rijen[0].fotoId') === undefined);
  check('het nieuwe project staat in de database',
    db.projecten.some(function (p) { return p.naam === 'Kwijt hersteld'; }),
    db.projecten.map(function (p) { return p.naam; }).join(', '));
  check('en de ruiten zijn er meteen naartoe geschreven', gedaan.updates.length >= 1,
    gedaan.updates.join(', ') || 'geen');
  check('de melding over het verdwenen project is weg', pil().indexOf('bestaat niet meer') < 0, pil());

  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  w.close();
  process.exit(fouten ? 1 : 0);
})();
