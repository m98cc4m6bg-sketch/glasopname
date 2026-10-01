/* Testreeks v87 — node test-start.js
   Het startscherm, het project in het webadres, en de valse melding
   "werk gaat verloren". Supabase wordt nagebootst met een projectenlijst
   en een takenlijst.                                                    */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('/home/claude/node_modules/jsdom');

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}
const wacht = ms => new Promise(r => setTimeout(r, ms));
async function wachtTot(voorwaarde, maximaal) {
  const eind = Date.now() + (maximaal || 8000);
  while (Date.now() < eind) { if (voorwaarde()) return true; await wacht(100); }
  return false;
}

/* ── de nagebootste database ──────────────────────────────────── */
const db = {
  projecten: [
    { id: '11111111-1111-4111-8111-111111111111', naam: 'Verhoef', datum: '', status: 'open',
      aantal_ruiten: 2, adres: 'Teststraat 1', open_taken: 1, gewijzigd_naam: 'julian',
      updated_at: '2026-10-01T09:00:00Z',
      data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Verhoef',
              datum: '', speling: '4', bijtelling: '11' } },
    { id: '22222222-2222-4222-8222-222222222222', naam: 'Bruins', datum: '', status: 'besteld',
      aantal_ruiten: 6, adres: '', open_taken: 0, gewijzigd_naam: 'julian',
      updated_at: '2026-09-30T12:00:00Z',
      data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Bruins',
              datum: '', speling: '4', bijtelling: '11' } }
  ],
  taken: [
    { id: 'aaaa1111-1111-4111-8111-111111111111', project_id: '11111111-1111-4111-8111-111111111111',
      tekst: 'Rooster nameten', klaar: false, eigenaar: 'u1', eigenaar_naam: 'julian',
      aangemaakt_op: '2026-10-01T08:00:00Z', volgorde: 1 }
  ],
  projectgeschiedenis: [
    { id: 'gggg1111-1111-4111-8111-111111111111', project_id: '11111111-1111-4111-8111-111111111111',
      moment: '2026-10-01T08:30:00Z', wie_naam: 'julian', samenvatting: '2 ruiten gewijzigd' }
  ],
  app_data: []
};
const gedaan = { updates: [], inserts: [] };
let kolomOntbreekt = false;    // 13_taken_en_geschiedenis.sql nog niet gedraaid
let takenTabelWeg = false;

function bouwer(tabel) {
  const st = { op: null, filters: {}, terug: false, nieuw: null, velden: null };
  const b = {};
  b.select = function () { if (!st.op) st.op = 'select'; else st.terug = true; return b; };
  b.insert = function (v) { st.op = 'insert'; st.nieuw = v; return b; };
  b.update = function (v) { st.op = 'update'; st.velden = v; return b; };
  b.delete = function () { st.op = 'delete'; return b; };
  b.eq = function (k, v) { st.filters[k] = v; return b; };
  b.or = function () { return b; };
  b.order = function () { return b; };
  b.limit = function () { return b; };

  function rijen() {
    if (takenTabelWeg && tabel === 'taken') return [];
    return (db[tabel] || []).filter(function (r) {
      return Object.keys(st.filters).every(function (k) { return r[k] === st.filters[k]; });
    });
  }
  function antwoord(enkel) {
    if (takenTabelWeg && tabel === 'taken') {
      return { data: null, error: { code: '42P01',
               message: 'relation "public.taken" does not exist' } };
    }
    if (st.op === 'insert') {
      const lijst = Array.isArray(st.nieuw) ? st.nieuw : [st.nieuw];
      const uit = lijst.map(function (v, i) {
        const rij = Object.assign({ id: 'n' + Date.now() + i, updated_at: new Date().toISOString() }, v);
        db[tabel].push(rij);
        gedaan.inserts.push(tabel);
        return rij;
      });
      return { data: enkel ? uit[0] : uit, error: null };
    }
    if (st.op === 'update') {
      gedaan.pogingen = (gedaan.pogingen || 0) + 1;
      gedaan.veldenReeks = (gedaan.veldenReeks || []).concat([Object.keys(st.velden || {}).join(',')]);
      if (kolomOntbreekt && st.velden && ('samenvatting' in st.velden)) {
        return { data: null, error: { code: '42703',
                 message: 'column "samenvatting" of relation "projecten" does not exist' } };
      }
      const geraakt = rijen();
      geraakt.forEach(function (r) { Object.assign(r, st.velden); });
      if (tabel === 'projecten') gedaan.updates.push(st.filters.id);
      return { data: st.terug ? geraakt.map(function (r) { return { id: r.id }; }) : null, error: null };
    }
    if (st.op === 'delete') {
      const weg = rijen();
      db[tabel] = db[tabel].filter(function (r) { return weg.indexOf(r) < 0; });
      return { data: st.terug ? weg.map(function (r) { return { id: r.id }; }) : null, error: null };
    }
    const r = rijen();
    return { data: enkel ? (r[0] || null) : r, error: null };
  }
  b.maybeSingle = function () { return Promise.resolve(antwoord(true)); };
  b.single = function () { return Promise.resolve(antwoord(true)); };
  b.then = function (goed, fout) { return Promise.resolve(antwoord(false)).then(goed, fout); };
  return b;
}

function maakApp(url, lsProject) {
  let html = fs.readFileSync('index.html', 'utf8');
  // Externe scripts eruit; de bestanden die we nodig hebben inline erbij.
  ['naslag.js', 'cloud.js', 'start.js', 'project.js', 'melding.js'].forEach(function (naam) {
    html = html.replace('<script src="' + naam + '"></script>',
      '<script>' + fs.readFileSync(naam, 'utf8').replace(/<\/script>/g, '<\\/script>') + '</script>');
  });
  html = html.replace(/<script src="(?!data:)[^"]*"><\/script>/g, '');
  html = html.replace('<script>\n// ═', `<script>
    window.bulkIsGeselecteerd = function () { return false; };
    window.bulkToggle = function () {};
    window.kopieerRegel = function () {};
    window.merkBalkBijwerken = function () {};
    window.blokBalkHTML = function () { return '<div class="blok-bediening"><span id="losseMaatPlek"></span></div>'; };
    window.bulkPlaatsKnoppen = function () {};
    window.GLASOPNAME_CONFIG = { url: 'https://test.supabase.co', anonKey: 'sb_publishable_test' };
    try { if (__LS__) localStorage.setItem('glasopname_project', __LS__); } catch (e) {}
    window.supabase = {
      createClient: function () {
        return {
          auth: {
            getSession: function () {
              return Promise.resolve({ data: { session: { user: { id: 'u1', email: 'julian@jelierbouw.nl' } } } });
            },
            signOut: function () { return Promise.resolve({}); }
          },
          from: function (t) { return window.__bouwer(t); },
          removeChannel: function () {},
          channel: function () {
            var k = { state: 'joined' };
            k.on = function () { return k; };
            k.subscribe = function (cb) { if (cb) cb('SUBSCRIBED'); return k; };
            return k;
          },
          storage: { from: function () { return {
            list: function () { return Promise.resolve({ data: [], error: null }); },
            remove: function () { return Promise.resolve({}); },
            createSignedUrl: function () { return Promise.resolve({ data: null, error: { message: 'geen' } }); }
          }; } }
        };
      }
    };
  <\/script>
  <script>
  // ═`);

  html = html.replace('__LS__', lsProject ? JSON.stringify(lsProject) : 'null')
             .replace('__LS__', lsProject ? JSON.stringify(lsProject) : 'null');
  const vc = new VirtualConsole();
  vc.on('warn', m => { if (process.env.LOG) console.log('   [pagina] ' + m); });
  vc.on('error', m => { if (process.env.LOG) console.log('   [pagina-fout] ' + m); });
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: url,
                                virtualConsole: vc });
  const w = dom.window;
  Object.defineProperty(w.document, 'visibilityState', { get: () => 'visible' });
  w.__bouwer = bouwer;
  return w;
}

(async function () {
  console.log('\n1. Na inloggen kom je op het startscherm');
  let w = maakApp('https://jelierbouw.test/');
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  const start = () => w.document.getElementById('startScherm');
  await wachtTot(() => start() && !start().hidden);
  check('het startscherm staat open', start() && !start().hidden);
  check('de invoer is niet in beeld', w.document.body.classList.contains('op-start'));

  await wachtTot(() => w.document.getElementById('startProjecten').textContent.indexOf('Verhoef') >= 0);
  check('de projecten staan erin',
    w.document.getElementById('startProjecten').textContent.indexOf('Verhoef') >= 0 &&
    w.document.getElementById('startProjecten').textContent.indexOf('Bruins') >= 0);
  check('de status besteld is zichtbaar',
    w.document.getElementById('startProjecten').innerHTML.indexOf('besteld') >= 0);
  check('mijn taak staat erin',
    w.document.getElementById('startTaken').textContent.indexOf('Rooster nameten') >= 0,
    w.document.getElementById('startTaken').textContent.slice(0, 60));

  console.log('\n2. Geen valse melding over werk dat verloren gaat');
  // Dit was de bug: de vlag stond al aan vóór je iets had gedaan.
  check('er staat geen vlag "nog niet verstuurd"',
    w.localStorage.getItem('glasopname_pending') !== '1',
    String(w.localStorage.getItem('glasopname_pending')));
  let gevraagd = false;
  w.appKeuze = function () { gevraagd = true; return Promise.resolve('door'); };

  console.log('\n3. Een project openen');
  await w.cloudOpen('11111111-1111-4111-8111-111111111111');
  await wachtTot(() => start().hidden);
  check('er is niets gevraagd over verloren werk', !gevraagd);
  check('het startscherm is weg', start().hidden);
  check('het project staat in het webadres',
    w.location.hash.indexOf('11111111-1111-4111-8111-111111111111') >= 0, w.location.hash);
  check('de projectnaam staat in de kopbalk',
    w.document.getElementById('kopProject').textContent.indexOf('Verhoef') >= 0,
    w.document.getElementById('kopProject').textContent);
  // De tekst van een taak staat in een invoerveld, dus in de HTML.
  check('de taken van dit project zijn geladen',
    w.document.getElementById('takenLijst').innerHTML.indexOf('Rooster nameten') >= 0,
    w.document.getElementById('takenLijst').textContent.slice(0, 50));
  check('met de eigenaar erbij',
    w.document.getElementById('takenLijst').textContent.indexOf('julian') >= 0);

  console.log('\n4. Terug naar het startscherm');
  await w.glasNaarStart();
  await wachtTot(() => !start().hidden);
  check('het startscherm staat weer open', !start().hidden);
  check('het webadres is weer schoon', w.location.hash.indexOf('project=') < 0, w.location.hash);
  check('het laatst geopende project is onthouden',
    (w.glasLaatsteProject() || {}).naam === 'Verhoef',
    JSON.stringify(w.glasLaatsteProject()));
  await wachtTot(() => w.document.getElementById('startVerder').textContent.indexOf('Verhoef') >= 0);
  check('en staat als snelkoppeling op het startscherm',
    w.document.getElementById('startVerder').textContent.indexOf('Verhoef') >= 0);

  console.log('\n5. Een taak afvinken vanaf het startscherm');
  const open1 = db.taken.filter(t => !t.klaar).length;
  await w.startTaakKlaar('aaaa1111-1111-4111-8111-111111111111');
  await wachtTot(() => db.taken.filter(t => !t.klaar).length < open1);
  check('de taak staat op afgerond', db.taken[0].klaar === true);
  check('met een afrondmoment erbij', !!db.taken[0].afgerond_op, String(db.taken[0].afgerond_op));
  w.close();

  console.log('\n6. Het spoor: wie wijzigde wat');
  w.close();
  w = maakApp('https://jelierbouw.test/');
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  await wachtTot(() => !w.document.getElementById('startScherm').hidden);
  await w.cloudOpen('11111111-1111-4111-8111-111111111111');
  await wachtTot(() => w.document.getElementById('startScherm').hidden);

  gedaan.updates = [];
  w.eval("rijen = [{ id: 1, aantal: 1, merk: 'A', maatsoort: 'Sponningmaat', breedte: 1000," +
         " hoogte: 2000, glasType: 'HR++ glas', opbouw: '4-15-4', rooster: 'Nee'," +
         " glasbewerking: 'Helder (standaard)', roedenverdeling: 'Geen roedenverdeling' }];" +
         " glasMarkeerWerk(); herbereken(); opslaan();");
  await wachtTot(() => gedaan.updates.length > 0, 10000);
  const project = db.projecten.find(p => p.id === '11111111-1111-4111-8111-111111111111');
  check('er is opgeslagen', gedaan.updates.length > 0);
  check('de ruit draagt wie hem wijzigde',
    ((project.data.rijen || [])[0] || {}).gewDoor === 'julian',
    JSON.stringify(((project.data.rijen || [])[0] || {}).gewDoor));
  check('met een tijdstip erbij', !!((project.data.rijen || [])[0] || {}).gewOp);
  check('en het project krijgt een samenvatting voor het logboek',
    /ruit/.test(project.samenvatting || ''), project.samenvatting);
  check('met de naam van wie het deed', project.gewijzigd_naam === 'julian', project.gewijzigd_naam);

  // Het logboek op Projectgegevens leest het spoor terug.
  w.logboekLaden();
  await wachtTot(() => w.document.getElementById('logboekLijst').textContent.indexOf('ruiten') >= 0);
  check('het logboek toont de wijziging',
    w.document.getElementById('logboekLijst').textContent.indexOf('2 ruiten gewijzigd') >= 0,
    w.document.getElementById('logboekLijst').textContent.slice(0, 70));
  check('met wie het deed erbij',
    w.document.getElementById('logboekLijst').textContent.indexOf('julian') >= 0);

  console.log('\n7. Een onthouden project opent niet meer vanzelf');
  w.close();
  w = maakApp('https://jelierbouw.test/', '11111111-1111-4111-8111-111111111111');
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  await wachtTot(() => !w.document.getElementById('startScherm').hidden);
  check('je begint op het startscherm', !w.document.getElementById('startScherm').hidden);
  await wachtTot(() => w.document.getElementById('startVerder').textContent.length > 0);
  check('met een snelkoppeling naar het laatste project',
    w.document.getElementById('startVerder').textContent.indexOf('Verder') >= 0,
    '"' + w.document.getElementById('startVerder').textContent + '" / laatst=' +
    JSON.stringify(w.glasLaatsteProject()) + ' / ls=' + w.localStorage.getItem('glasopname_project'));

  console.log('\n8. Verwijderen vanaf het startscherm');
  db.projecten.push({ id: '33333333-3333-4333-8333-333333333333', naam: 'Weg hiermee', datum: '',
    status: 'open', aantal_ruiten: 0, adres: '', open_taken: 0, gewijzigd_naam: '',
    updated_at: '2026-10-01T07:00:00Z',
    data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Weg hiermee',
            datum: '', speling: '4', bijtelling: '11' } });
  w.glasToonStart();
  await wachtTot(() => w.document.getElementById('startProjecten').textContent.indexOf('Weg hiermee') >= 0);
  const voorAantal = db.projecten.length;
  w.appVraag = function () { return Promise.resolve(true); };
  await w.cloudVerwijder('33333333-3333-4333-8333-333333333333');
  await wachtTot(() => db.projecten.length < voorAantal);
  check('het project is uit de database', db.projecten.length === voorAantal - 1);
  await wachtTot(() => w.document.getElementById('startProjecten').textContent.indexOf('Weg hiermee') < 0);
  check('en meteen uit het startscherm',
    w.document.getElementById('startProjecten').textContent.indexOf('Weg hiermee') < 0,
    w.document.getElementById('startProjecten').textContent.slice(0, 60));

  console.log('\n9. Het SQL-script is nog niet gedraaid');
  // Dan bestaan de nieuwe kolommen en de takentabel nog niet. De app hoort
  // gewoon door te werken: opslaan zonder het spoor, taken uit het project.
  w.close();
  kolomOntbreekt = true;
  takenTabelWeg = true;
  w = maakApp('https://jelierbouw.test/#project=11111111-1111-4111-8111-111111111111');
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  await wachtTot(() => (w.document.getElementById('projectNaam') || {}).value === 'Verhoef', 10000);
  check('het project opent gewoon',
    w.document.getElementById('projectNaam').value === 'Verhoef',
    w.document.getElementById('projectNaam').value);
  // Hier zat een bug: kwam de app twee keer langs het opstarten (zoals na
  // inloggen op een pagina met een project in het webadres), dan was het
  // project wel in beeld maar niet meer gekoppeld, en ging er niets omhoog.
  check('en is ook echt gekoppeld (niet alleen in beeld)',
    w.glasProjectId === '11111111-1111-4111-8111-111111111111', String(w.glasProjectId));

  gedaan.updates = [];
  gedaan.pogingen = 0;
  gedaan.veldenReeks = [];
  w.eval("rijen = [{ id: 7, merk: 'Z', breedte: 500, hoogte: 500, maatsoort: 'Sponningmaat'," +
         " glasType: 'Enkel glas', opbouw: '4 mm' }]; glasMarkeerWerk(); herbereken(); opslaan();");
  await wachtTot(() => gedaan.updates.length > 0, 12000);
  check('de app heeft gemerkt dat de kolommen ontbreken',
    w.glasSpoorKolommen() === false, String(w.glasSpoorKolommen()));
  check('opslaan lukt alsnog, zonder de nieuwe kolommen', gedaan.updates.length > 0,
    gedaan.updates.length + ' geslaagd, ' + (gedaan.pogingen || 0) + ' pogingen: ' +
    JSON.stringify(gedaan.veldenReeks));
  check('en er staat geen foutmelding in beeld',
    (w.document.getElementById('cloudStatus').textContent || '').indexOf('Niet opgeslagen') < 0,
    w.document.getElementById('cloudStatus').textContent);
  kolomOntbreekt = false;
  takenTabelWeg = false;

  console.log('\n10. Een link met een project erin opent dat project');
  w = maakApp('https://jelierbouw.test/#project=22222222-2222-4222-8222-222222222222',
              '11111111-1111-4111-8111-111111111111');
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  await wachtTot(() => (w.document.getElementById('projectNaam') || {}).value === 'Bruins');
  check('het project uit het webadres wint van wat de browser onthield',
    w.document.getElementById('projectNaam').value === 'Bruins',
    w.document.getElementById('projectNaam').value);
  check('het startscherm staat niet in de weg', w.document.getElementById('startScherm').hidden);
  check('en het project is gekoppeld, dus opslaan kan',
    w.glasProjectId === '22222222-2222-4222-8222-222222222222', String(w.glasProjectId));

  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  w.close();
  process.exit(fouten ? 1 : 0);
})();
