/* Testreeks v91 (+ v92 in §7) — node test-v91.js
   De punten uit de doorlichting van v90. Elk scenario toetst de belofte
   op de gegevens (wat staat er in de opname en in de nagebootste
   database), niet op de knoppen — de les van v90.
   Supabase en de mailfunctie worden nagebootst, net als in
   test-mail-en-slot.js; daar komt dit harnas ook vandaan.             */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('/home/claude/node_modules/jsdom');

let fouten = 0;
function check(naam, ok, extra) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}
// Een testvenster dat gesloten is, kan nog een nagekomen aanroep hebben
// lopen (de nagebootste database antwoordt met beloftes van buiten het
// venster, en die lopen na close() gewoon door). In een echte browser
// bestaat dat niet: een pagina wordt daar niet halverwege 'gesloten'. Zo'n
// aanroep crashte de reeks bij de overgang 9 → 10 (gezien bij v91). Alleen
// díe fout, en alleen vlak na een sluiting, wordt hier genegeerd.
let laatsteSluiting = 0;
process.on('uncaughtException', function (e) {
  if (Date.now() - laatsteSluiting < 5000 && /reading 'getElementById'/.test(String(e && e.message))) {
    console.log('   (nagekomen aanroep in een al gesloten testvenster genegeerd)');
    return;
  }
  console.error(e);
  process.exit(1);
});
const wacht = ms => new Promise(r => setTimeout(r, ms));
async function wachtTot(voorwaarde, maximaal) {
  const eind = Date.now() + (maximaal || 8000);
  while (Date.now() < eind) { if (voorwaarde()) return true; await wacht(100); }
  return false;
}

const PROJECT = '11111111-1111-4111-8111-111111111111';
const IK = 'u1', COLLEGA = 'u2';

let db, verstuurd, sporen, vervolgen, kolomMist, gebruikersWeg;
let verlorenAntwoord = false;
function resetDb() {
  db = {
    projecten: [
      { id: PROJECT, naam: 'Verhoef', datum: '', status: 'aangemaakt', aantal_ruiten: 0,
        adres: '', open_taken: 0, gewijzigd_naam: '', updated_at: '2026-10-01T09:00:00Z',
        data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [], project: 'Verhoef',
                datum: '', speling: '4', bijtelling: '11' } }
    ],
    taken: [],
    projectgeschiedenis: [],
    gebruikers: [
      { id: IK, naam: 'julian', email: 'julian@voorbeeld.test', actief: true },
      { id: COLLEGA, naam: 'Bart', email: 'bart@voorbeeld.test', actief: true }
    ],
    mailadressen: [
      { id: 'm1', soort: 'leverancier', naam: 'Van Noordenne', adres: 'verkoop@noordenne.test',
        standaard: true, actief: true },
      { id: 'm2', soort: 'intern', naam: 'Kantoor', adres: 'kantoor@voorbeeld.test',
        standaard: false, actief: true }
    ],
    mailverzonden: [],
    app_data: []
  };
  verstuurd = [];
  sporen = [];
  vervolgen = [];
  kolomMist = false;
  gebruikersWeg = false;
}
resetDb();

function bouwer(tabel) {
  const st = { op: null, filters: {}, terug: false, nieuw: null, velden: null };
  const b = {};
  b.select = function () { if (!st.op) st.op = 'select'; else st.terug = true; return b; };
  b.insert = function (v) { st.op = 'insert'; st.nieuw = v; return b; };
  b.update = function (v) { st.op = 'update'; st.velden = v; return b; };
  b.delete = function () { st.op = 'delete'; return b; };
  b.eq = function (k, v) { st.filters[k] = v; return b; };
  b.or = b.order = b.limit = function () { return b; };
  // .is(k, null) en .not(k, 'is', null): de prullenbak (v91).
  st.leeg = []; st.gevuld = [];
  b.is = function (k) { st.leeg.push(k); return b; };
  b.not = function (k) { st.gevuld.push(k); return b; };

  function rijen() {
    return (db[tabel] || []).filter(r =>
      Object.keys(st.filters).every(k => r[k] === st.filters[k]) &&
      st.leeg.every(k => r[k] == null) && st.gevuld.every(k => r[k] != null));
  }
  function antwoord(enkel) {
    if (gebruikersWeg && tabel === 'gebruikers') {
      return { data: null, error: { code: '42P01', message: 'relation "public.gebruikers" does not exist' } };
    }
    if (st.op === 'insert') {
      const lijst = Array.isArray(st.nieuw) ? st.nieuw : [st.nieuw];
      const uit = lijst.map((v, i) => {
        const rij = Object.assign({ id: 'n' + Date.now() + i, updated_at: new Date().toISOString() }, v);
        db[tabel].push(rij);
        return rij;
      });
      return { data: enkel ? uit[0] : uit, error: null };
    }
    if (st.op === 'update') {
      if (tabel === 'projecten' && st.velden && st.velden.samenvatting) {
        sporen.push(st.velden.samenvatting);
        vervolgen.push(st.velden.spoor_vervolg);
      }
      if (kolomMist && st.velden && ('samenvatting' in st.velden)) {
        return { data: null, error: { code: '42703', message: 'column "samenvatting" does not exist' } };
      }
      const geraakt = rijen();
      geraakt.forEach(r => Object.assign(r, st.velden));
      return { data: st.terug ? geraakt.map(r => ({ id: r.id })) : null, error: null };
    }
    if (st.op === 'delete') {
      const weg = rijen();
      db[tabel] = db[tabel].filter(r => weg.indexOf(r) < 0);
      return { data: st.terug ? weg.map(r => ({ id: r.id })) : null, error: null };
    }
    const r = rijen();
    return { data: enkel ? (r[0] || null) : r, error: null };
  }
  b.maybeSingle = () => Promise.resolve(antwoord(true));
  b.single = () => Promise.resolve(antwoord(true));
  b.then = (goed, fout) => Promise.resolve(antwoord(false)).then(goed, fout);
  return b;
}

// De nagebootste Edge Function: hij doet precies wat de echte doet —
// vastleggen, en bij een gelukte bestelmail het project op 'besteld'.
function mailFunctie(lading) {
  verstuurd.push(lading);
  const stuk = (lading.aan || []).some(a => /stuk/.test(a));
  db.mailverzonden.push({
    project_id: lading.projectId, soort: lading.soort, aan: (lading.aan || []).join(', '),
    onderwerp: lading.onderwerp, gelukt: !stuk, fout: stuk ? 'adres bestaat niet' : null,
    wie_naam: lading.wieNaam, moment: new Date().toISOString()
  });
  // Zoals supabase-js een fout van de functie teruggeeft: een algemene
  // melding, met het antwoord van de functie in context (v91).
  if (stuk) return { data: null, error: { message: 'Edge Function returned a non-2xx status code',
    context: { json: function () { return Promise.resolve({ ok: false, fout: 'adres bestaat niet' }); } } } };
  if (lading.soort === 'bestelling' && lading.projectId) {
    const p = db.projecten.find(x => x.id === lading.projectId);
    if (p) { p.status = 'besteld'; p.besteld_op = new Date().toISOString(); }
  }
  // Verstuurd, maar het antwoord komt niet aan (4G valt weg): supabase-js
  // geeft dan een fout zonder antwoord van de functie (v91).
  if (verlorenAntwoord) return { data: null, error: { message: 'Failed to send a request to the Edge Function' } };
  return { data: { ok: true, id: 'mail-1', aan: lading.aan }, error: null };
}

function maakApp(url, wachtwoord) {
  let html = fs.readFileSync('index.html', 'utf8');
  ['naslag.js', 'cloud.js', 'start.js', 'project.js', 'pdf.js', 'undo.js', 'bulk.js', 'blokbalk.js', 'fotos.js', 'kopie.js', 'teken.js', 'merken.js', 'import.js'].forEach(function (naam) {
    html = html.replace('<script src="' + naam + '"></script>',
      '<script>' + fs.readFileSync(naam, 'utf8').replace(/<\/script>/g, '<\\/script>') + '</script>');
  });
  html = html.replace(/<script src="(?!data:)[^"]*"><\/script>/g, '');
  html = html.replace('<script>\n// ═', `<script>
    // melding.js bewust niet geladen (handover §6.5): de vensters worden
    // hier nagebootst en het antwoord is in te stellen.
    window.__meldingen = [];
    window.__antwoord = true;
    window.appMelding = window.appFout = function (t) { window.__meldingen.push(String(t)); return Promise.resolve(true); };
    window.appVraag = function (t) { window.__meldingen.push(String(t)); return Promise.resolve(window.__antwoord); };
    window.appKeuze = function (t, k) { window.__meldingen.push(String(t)); return Promise.resolve(window.__keuze === undefined ? 'door' : window.__keuze); };
    window.appInvoer = function (t) { return Promise.resolve(window.__invoer === undefined ? null : window.__invoer); };
    window.appWachtwoord = function () { return Promise.resolve(window.__typWachtwoord || null); };
    window.appMeldingBezig = function () { return false; };
    window.GLASOPNAME_CONFIG = { url: 'https://test.supabase.co', anonKey: 'sb_publishable_test' };
    window.supabase = {
      createClient: function () {
        return {
          auth: {
            getSession: function () {
              return Promise.resolve({ data: { session: { access_token: 't0k',
                user: { id: '${IK}', email: 'julian@voorbeeld.test' } } } });
            },
            signInWithPassword: function (g) {
              if (g && g.password === '${wachtwoord || 'geheim'}') {
                return Promise.resolve({ data: { user: { id: '${IK}', email: 'julian@voorbeeld.test' } }, error: null });
              }
              return Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } });
            },
            signOut: function () { return Promise.resolve({}); }
          },
          from: function (t) { return window.__bouwer(t); },
          // Sinds v103 beslist de database welke projecten oud genoeg zijn
          // (22_gebruik_en_prullenbak.sql); hier met de klok van de 'server'.
          rpc: function (naam, args) { return Promise.resolve(window.__rpc(naam, args || {})); },
          functions: { invoke: function (naam, opties) {
            return Promise.resolve(window.__mail(naam, (opties || {}).body));
          } },
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
  const vc = new VirtualConsole();
  vc.on('warn', m => { if (process.env.LOG) console.log('   [pagina] ' + m); });
  vc.on('error', m => { if (process.env.LOG) console.log('   [pagina-fout] ' + m); });
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: url,
                                virtualConsole: vc });
  const w = dom.window;
  Object.defineProperty(w.document, 'visibilityState', { get: () => 'visible' });
  w.__bouwer = bouwer;
  w.__rpc = function (naam, args) {
    if (naam !== 'prullenbak_opruimbaar') return { data: null, error: { message: 'onbekend', code: 'PGRST202' } };
    const grens = Date.now() - (args.dagen || 30) * 864e5;
    return { data: db.projecten.filter(p => p.verwijderd_op && new Date(p.verwijderd_op).getTime() < grens)
                               .map(p => ({ id: p.id })), error: null };
  };
  w.__mail = (naam, lading) => mailFunctie(lading);
  return w;
}

function statusInDb() {
  return (db.projecten.find(p => p.id === PROJECT) || {}).status;
}
function laatsteSpoor() {
  const p = db.projecten.find(x => x.id === PROJECT) || {};
  return p.samenvatting || '';
}

const B = '22222222-2222-4222-8222-222222222222';
function projectB() {
  return { id: B, naam: 'Jansen', datum: '', status: 'aangemaakt', aantal_ruiten: 1, adres: '', open_taken: 0,
    gewijzigd_naam: '', updated_at: '2026-10-01T09:00:00Z',
    data: { rijen: [{ id: 1, aantal: 1, merk: 'X', maatsoort: 'Sponningmaat', breedte: '500', hoogte: '500',
                      glasType: '', opbouw: '', rooster: 'Nee', glasbewerking: 'Helder (standaard)',
                      roedenverdeling: 'Geen roedenverdeling' }],
            volgendId: 2, fotos: [], info: { status: 'aangemaakt' }, taken: [], project: 'Jansen',
            datum: '', speling: '4', bijtelling: '11' } };
}
function typ(w, veld, waarde) {
  veld.dispatchEvent(new w.FocusEvent('focusin', { bubbles: true }));
  veld.value = waarde;
  veld.dispatchEvent(new w.Event('input', { bubbles: true }));
  veld.dispatchEvent(new w.FocusEvent('focusout', { bubbles: true }));
}
async function open(url) {
  const w = maakApp(url);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  await wachtTot(() => (w.document.getElementById('projectNaam') || {}).value !== '', 10000);
  await wacht(400);
  return w;
}

(async function () {
  console.log('\n1. Ongedaan maken blijft in zijn eigen project (punt 1)');
  resetDb(); db.projecten.push(projectB());
  let w = await open('https://jelierbouw.test/#project=' + PROJECT);
  typ(w, w.document.querySelector('#invoerBody input.breedte-input'), '1234');
  await wachtTot(() => (db.projecten[0].data.rijen[0] || {}).breedte === '1234', 6000);
  check('in project A staat een stap om terug te draaien', w.undoStapels().terug.length >= 1,
    String(w.undoStapels().terug.length));
  await w.cloudOpen(B);
  await wachtTot(() => w.document.getElementById('projectNaam').value === 'Jansen', 8000);
  await wacht(300);
  check('na het openen van B zijn de stapels leeg', w.undoStapels().terug.length === 0,
    String(w.undoStapels().terug.length));
  w.document.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true }));
  await wacht(2500);
  const b = db.projecten.find(p => p.id === B);
  check('Cmd+Z zet de inhoud van A niet in B', w.document.getElementById('projectNaam').value === 'Jansen' &&
    b.naam === 'Jansen' && b.data.project === 'Jansen', b.naam + ' / ' + b.data.project);
  check('en de ruit van B staat er nog', b.data.rijen.some(r => r.merk === 'X'),
    JSON.stringify(b.data.rijen.map(r => r.merk)));
  w.blokOngedaan('los');
  await wacht(1500);
  check('↶ in de tabel zonder foto haalt ook niets uit A',
    !w.eval('rijen').some(r => r.breedte === '1234'), JSON.stringify(w.eval('rijen.map(function(r){return r.breedte})')));
  laatsteSluiting = Date.now(); w.close();


  // ── hulp: een project met een foto en twee ruiten, op een status naar keuze
  function zetProject(status, extra) {
    resetDb();
    const p0 = db.projecten[0];
    p0.status = status;
    p0.data.info = Object.assign({ status: status }, extra || {});
    p0.data.fotos = [{ id: 'f1', bron: 'tekening', pad: 'p/f1.jpg', titel: 'Voorgevel',
                       breedte: 1000, hoogte: 800, markeringen: [{ rijId: 1, x: .2, y: .2 },
                       { rijId: 1, x: .3, y: .3 }], inkt: [] }];
    p0.data.rijen = [
      { id: 1, aantal: 2, merk: 'A', maatsoort: 'Sponningmaat', breedte: '1200', hoogte: '600', fotoId: 'f1',
        glasType: 'HR++ glas', opbouw: '4-15-4', rooster: 'Nee', glasbewerking: 'Helder (standaard)',
        roedenverdeling: 'Geen roedenverdeling' },
      { id: 2, aantal: 1, merk: 'C', maatsoort: 'Sponningmaat', breedte: '900', hoogte: '900',
        glasType: 'HR++ glas', opbouw: '4-15-4', rooster: 'Nee', glasbewerking: 'Helder (standaard)',
        roedenverdeling: 'Geen roedenverdeling' }];
    p0.data.volgendId = 3;
    p0.aantal_ruiten = 3;
  }
  function nepFoto(w) {
    w.eval("var im = document.getElementById('img-f1'); if (!im) { im = document.createElement('img');" +
           " im.id = 'img-f1'; document.body.appendChild(im); }" +
           " im.getBoundingClientRect = function () { return { left: 0, top: 0, width: 100, height: 100 }; };");
  }
  const rijenNu = w => JSON.parse(w.eval('JSON.stringify(rijen.filter(function(r){return r.merk;}))'));

  console.log('\n2. Het slot geldt vanaf besteld, ook bij geleverd (punt 3)');
  zetProject('geleverd', { besteld: { op: '2026-10-05T09:00:00Z', door: 'julian', ruiten: {} } });
  w = await open('https://jelierbouw.test/#project=' + PROJECT);
  check('bij "geleverd" staat het slot erop', w.invoerOpSlot() === true);
  const voor = JSON.stringify(rijenNu(w));
  nepFoto(w);
  w.fotoTik({ clientX: 50, clientY: 50, preventDefault() {}, stopPropagation() {} }, 'f1');
  check('een tik op de foto zet geen ruit bij', JSON.stringify(rijenNu(w)) === voor && w.eval('rijen.length') === 2,
    String(w.eval('rijen.length')));
  w.markEenMinder('f1', 0);
  check('"één ruit minder" verlaagt het aantal niet', rijenNu(w)[0].aantal === 2, String(rijenNu(w)[0].aantal));
  check('en het bolletje blijft staan', w.eval('fotos[0].markeringen.length') === 2);
  w.markWeg('f1', 0);
  check('"markering verwijderen" doet niets', w.eval('fotos[0].markeringen.length') === 2);
  w.markRuitWeg('f1', 0);
  await wacht(100);
  check('"ruit verwijderen" laat de regel én de bolletjes staan',
    w.eval('rijen.length') === 2 && w.eval('fotos[0].markeringen.length') === 2);
  const gb = w.eval('getRij(2).glasBreedte');
  w.setCorrectie(2, '10');
  check('de kolom Corr. verandert de glasmaat niet', w.eval('getRij(2).glasBreedte') === gb &&
    w.eval('getRij(2).correctie') === undefined, String(w.eval('getRij(2).glasBreedte')));
  const sel = w.document.getElementById('spelingGlobal');
  sel.dispatchEvent(new w.FocusEvent('focus'));
  sel.value = '10';
  sel.dispatchEvent(new w.Event('change'));
  w.eval('herbereken()');
  check('de speling bovenaan springt terug en de maat blijft', sel.value === '4' && w.eval('getRij(2).glasBreedte') === gb,
    sel.value + ' / ' + w.eval('getRij(2).glasBreedte'));
  w.tekenModus('f1');
  check('tekenen gaat niet aan', (w.document.getElementById('tekenbalk-f1') || { innerHTML: '' }).innerHTML === '');
  w.projectVeld('status', 'bezig met inmeten/verwerken');
  check('de status met de hand terugzetten kan niet zonder ontgrendelen',
    w.eval('projectInfo.status') === 'geleverd', w.eval('projectInfo.status'));
  check('en er komt uitleg bij', w.__meldingen.some(t => /Ontgrendelen/.test(t)));
  w.projectVeld('status', 'afgerond');
  check('vooruit (geleverd → afgerond) mag wel, en het slot blijft',
    w.eval('projectInfo.status') === 'afgerond' && w.invoerOpSlot() === true);
  // ontgrendelen, één stap maken, en de status mag niet mee terug met Cmd+Z
  w.__typWachtwoord = 'geheim';
  await w.slotOntgrendel();
  check('na ontgrendelen is het slot eraf', w.invoerOpSlot() === false);
  w.setCorrectie(2, '10');
  await wacht(100);
  w.ongedaan();
  await wacht(100);
  check('Cmd+Z zet de correctie terug', w.eval('getRij(2).correctie') === undefined);
  check('maar laat status en ontgrendeling staan',
    w.eval('projectInfo.status') === 'afgerond' && w.eval('!!(projectInfo.slot && projectInfo.slot.open)') === true,
    w.eval('projectInfo.status'));
  w.projectVeld('status', 'bezig met inmeten/verwerken');
  check('na ontgrendelen mag de status wél terug', w.eval('projectInfo.status') === 'bezig met inmeten/verwerken');
  await wachtTot(() => db.projecten[0].status === 'bezig met inmeten/verwerken', 8000);
  check('en die stap terug gaat ook echt naar de database', db.projecten[0].status === 'bezig met inmeten/verwerken',
    db.projecten[0].status);
  laatsteSluiting = Date.now(); w.close();

  console.log('\n3. Besteld in de database, nog niet in de opname (punt 4)');
  // Het antwoord op de bestelmail kwam niet aan: de kolom zegt besteld,
  // de opname nog 'bezig'. Een volgende opslag mag dat niet terugzetten.
  zetProject('besteld');
  db.projecten[0].data.info = { status: 'bezig met inmeten/verwerken' };
  db.projecten[0].open_taken = 2;
  w = await open('https://jelierbouw.test/#project=' + PROJECT);
  check('bij het openen neemt de app "besteld" over', w.eval('projectInfo.status') === 'besteld',
    w.eval('projectInfo.status'));
  check('en het slot staat erop', w.invoerOpSlot() === true);
  w.eval("projectInfo.notities = 'bellen voor levering'; glasMarkeerWerk(); opslaan();");
  await wachtTot(() => (db.projecten[0].data.info || {}).notities === 'bellen voor levering', 8000);
  check('een opslag daarna zet de kolom niet terug', db.projecten[0].status === 'besteld', db.projecten[0].status);
  check('en schrijft het aantal open taken niet over', db.projecten[0].open_taken === 2,
    String(db.projecten[0].open_taken));
  laatsteSluiting = Date.now(); w.close();

  console.log('\n4. Het antwoord op de bestelmail komt niet aan (punt 4)');
  zetProject('bezig met inmeten/verwerken');
  w = await open('https://jelierbouw.test/#project=' + PROJECT);
  verlorenAntwoord = true;
  w.bestelmailVenster();
  await wachtTot(() => !!w.document.getElementById('mailVerstuur'));
  check('bij een eerste bestelling geen waarschuwing', !w.document.querySelector('.mail-al-besteld'));
  w.bestelmailVenster();
  await wacht(300);
  check('twee keer tikken geeft één venster', w.document.querySelectorAll('.mail-venster').length === 1,
    String(w.document.querySelectorAll('.mail-venster').length));
  w.document.getElementById('mailBijlage').checked = false;
  w.document.getElementById('mailVerstuur').click();
  await wachtTot(() => w.eval('projectInfo.status') === 'besteld', 12000);
  check('de app kijkt na en ziet dat hij wél verstuurd is', w.eval('projectInfo.status') === 'besteld',
    w.eval('projectInfo.status'));
  check('en zegt dat erbij', w.__meldingen.some(t => /wél verstuurd/.test(t)),
    w.__meldingen.slice(-1)[0]);
  check('het slot staat erop', w.invoerOpSlot() === true);
  await wachtTot(() => sporen.some(t => /bestelmail verstuurd/.test(t)), 8000);
  const i = sporen.findIndex(t => /bestelmail verstuurd/.test(t));
  check('de opslag daarna werkt de regel van de mailfunctie bij in plaats van een tweede',
    i >= 0 && vervolgen[i] === true && !/ruit/.test(sporen[i]), JSON.stringify([sporen[i], vervolgen[i]]));
  verlorenAntwoord = false;
  w.__meldingen = [];
  await wacht(300);
  w.bestelmailVenster();
  await wachtTot(() => !!w.document.getElementById('mailVerstuur'));
  check('een tweede bestelmail krijgt een waarschuwing', !!w.document.querySelector('.mail-al-besteld'),
    (w.document.querySelector('.mail-al-besteld') || {}).textContent);
  check('en de knop zegt wat hij doet', /opnieuw/.test(w.document.getElementById('mailVerstuur').textContent));
  laatsteSluiting = Date.now(); w.close();

  console.log('\n5. Prullenbak (punt 2)');
  resetDb(); db.projecten.push(projectB());
  w = await open('https://jelierbouw.test/');
  await wachtTot(() => w.document.getElementById('startProjecten').textContent.indexOf('Jansen') >= 0, 8000);
  w.__antwoord = true;
  await w.cloudVerwijder(B);
  const pb = db.projecten.find(p => p.id === B);
  check('🗑 zet het project in de prullenbak, niet weg', !!(pb && pb.verwijderd_op), pb ? 'staat er' : 'weg');
  check('met wie het deed', pb && pb.verwijderd_naam === 'julian', pb && pb.verwijderd_naam);
  check('de vraag zegt dat het terug kan', w.__meldingen.some(t => /prullenbak/.test(t) && /terugzetten/.test(t)));
  await wachtTot(() => w.document.getElementById('startProjecten').textContent.indexOf('Jansen') < 0, 8000);
  check('uit de projectenlijst', w.document.getElementById('startProjecten').textContent.indexOf('Jansen') < 0);
  await wachtTot(() => !w.document.getElementById('startPrullenbakBlok').hidden, 8000);
  w.startPrullenbakKlap();
  check('maar wel in de prullenbak op het startscherm',
    /Jansen/.test(w.document.getElementById('startPrullenbak').textContent) &&
    /nog 30 dagen/.test(w.document.getElementById('startPrullenbak').textContent),
    w.document.getElementById('startPrullenbak').textContent.replace(/\s+/g, ' ').slice(0, 160));
  w.__meldingen = [];
  await w.cloudOpen(B);
  await wacht(500);
  check('een project in de prullenbak opent niet', w.glasProjectId !== B &&
    w.__meldingen.some(t => /prullenbak/.test(t)));
  await w.glasTerugzetten(B);
  check('terugzetten haalt hem eruit', !db.projecten.find(p => p.id === B).verwijderd_op);
  await wachtTot(() => w.document.getElementById('startProjecten').textContent.indexOf('Jansen') >= 0, 8000);
  check('en hij staat weer in de lijst', w.document.getElementById('startProjecten').textContent.indexOf('Jansen') >= 0);
  laatsteSluiting = Date.now(); w.close();
  // opruimen na 30 dagen
  const oud = new Date(Date.now() - 31 * 864e5).toISOString();
  const recent = new Date(Date.now() - 5 * 864e5).toISOString();
  db.projecten.find(p => p.id === B).verwijderd_op = oud;
  db.projecten.push(Object.assign(projectB(), { id: '33333333-3333-4333-8333-333333333333', naam: 'Recent',
    verwijderd_op: recent }));
  w = await open('https://jelierbouw.test/');
  await wachtTot(() => !db.projecten.find(p => p.id === B), 8000);
  check('na 30 dagen ruimt het startscherm hem definitief op', !db.projecten.find(p => p.id === B));
  check('een project van 5 dagen blijft staan', !!db.projecten.find(p => p.naam === 'Recent'));
  laatsteSluiting = Date.now(); w.close();

  console.log('\n6. VSG 10.10.x (punt 5)');
  const DATA_LOOKUP = JSON.parse(fs.readFileSync('index.html', 'utf8').match(/const DATA = (\{.*\});\s*$/m)[1]).lookup;
  check('index.html: Gelaagd glas (VSG) | 1010.2 is 20 mm en 50 kg/m²',
    DATA_LOOKUP['Gelaagd glas (VSG)|1010.2'].totaal === 20 && DATA_LOOKUP['Gelaagd glas (VSG)|1010.2'].kg_m2 === 50);
  const fout = JSON.parse(JSON.stringify(DATA_LOOKUP));
  fout['Gelaagd glas (VSG)|1010.2'] = { glasOnly: 2, totaal: 2, kg_m2: 5 };
  resetDb();
  db.app_data = [{ key: 'glas_data', waarde: { lookup: fout } }];
  w = await open('https://jelierbouw.test/#project=' + PROJECT);
  await wacht(500);
  check('staat de oude waarde nog in de database, dan zet de app hem goed',
    w.eval("DATA.lookup['Gelaagd glas (VSG)|1010.2'].totaal") === 20,
    String(w.eval("DATA.lookup['Gelaagd glas (VSG)|1010.2'].totaal")));
  laatsteSluiting = Date.now(); w.close();


  console.log('\n7. Leegmaken en dan de foto weg: alles weg (v92, melding van Jan)');
  zetProject('bezig met inmeten/verwerken');
  w = await open('https://jelierbouw.test/#project=' + PROJECT);
  w.__antwoord = true;
  await w.blokLeeg('f1');
  await wacht(200);
  check('na leegmaken staan er geen ruiten meer onder de foto',
    w.eval("rijen.filter(function(r){return r.fotoId==='f1';}).length") === 0);
  await w.fotoVerwijder('f1');
  await wacht(300);
  check('de foto weg uit een lege groep haalt de hele groep weg', w.eval('fotos.length') === 0,
    String(w.eval('fotos.length')));
  check('er staat geen melding over verhuisde ruiten',
    !/zonder foto of tekening”/.test(w.document.getElementById('fotoHouder').textContent) &&
    !w.document.querySelector('.foto-geenfoto'),
    w.document.getElementById('fotoHouder').textContent.replace(/\s+/g, ' ').slice(0, 120));
  check('de losse ruit C staat er nog gewoon', w.eval("rijen.some(function(r){return r.merk==='C';})"));
  w.ongedaan();
  await wacht(300);
  check('Cmd+Z zet foto en groep terug', w.eval('fotos.length') === 1);
  laatsteSluiting = Date.now(); w.close();

  zetProject('bezig met inmeten/verwerken');
  w = await open('https://jelierbouw.test/#project=' + PROJECT);
  w.__antwoord = true;
  await w.fotoVerwijder('f1');
  await wacht(300);
  check('met ruiten blijft de groep staan, zonder foto',
    w.eval('fotos.length') === 1 && w.eval('fotos[0].pad') === null);
  check('en de ruit blijft in die groep (niet bij de losse maten)',
    w.eval("rijen.filter(function(r){return r.fotoId==='f1';}).length") === 1 &&
    !w.eval("losseRijen().some(function(r){return r.merk==='A';})"));
  const tekst = (w.document.querySelector('.foto-geenfoto') || {}).textContent || '';
  check('de melding zegt dat de ruiten in deze groep blijven',
    /in deze groep/.test(tekst) && !/toegevoegd aan de sectie/.test(tekst), tekst.slice(0, 120));
  laatsteSluiting = Date.now(); w.close();

  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  process.exit(fouten ? 1 : 0);
})();
