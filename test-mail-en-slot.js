/* Testreeks v88 — node test-mail-en-slot.js
   De statussen, de bestelmail, het slot op de invoer en het toewijzen
   van taken aan een collega. Supabase én de mailfunctie worden
   nagebootst; er gaat dus niets echt de deur uit.                     */
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

const PROJECT = '11111111-1111-4111-8111-111111111111';
const IK = 'u1', COLLEGA = 'u2';

let db, verstuurd, sporen, vervolgen, kolomMist, gebruikersWeg;
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
      { id: IK, naam: 'julian', email: 'julian@jelierbouw.nl', actief: true },
      { id: COLLEGA, naam: 'Bart', email: 'bart@jelierbouw.nl', actief: true }
    ],
    mailadressen: [
      { id: 'm1', soort: 'leverancier', naam: 'Van Noordenne', adres: 'verkoop@noordenne.test',
        standaard: true, actief: true },
      { id: 'm2', soort: 'intern', naam: 'Kantoor', adres: 'kantoor@jelierbouw.nl',
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

  function rijen() {
    return (db[tabel] || []).filter(r =>
      Object.keys(st.filters).every(k => r[k] === st.filters[k]));
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
  if (stuk) return { data: null, error: { message: 'adres bestaat niet' } };
  if (lading.soort === 'bestelling' && lading.projectId) {
    const p = db.projecten.find(x => x.id === lading.projectId);
    if (p) { p.status = 'besteld'; p.besteld_op = new Date().toISOString(); }
  }
  return { data: { ok: true, id: 'mail-1' }, error: null };
}

function maakApp(url, wachtwoord) {
  let html = fs.readFileSync('index.html', 'utf8');
  ['naslag.js', 'cloud.js', 'start.js', 'project.js', 'melding.js', 'pdf.js'].forEach(function (naam) {
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
    window.supabase = {
      createClient: function () {
        return {
          auth: {
            getSession: function () {
              return Promise.resolve({ data: { session: { access_token: 't0k',
                user: { id: '${IK}', email: 'julian@jelierbouw.nl' } } } });
            },
            signInWithPassword: function (g) {
              if (g && g.password === '${wachtwoord || 'geheim'}') {
                return Promise.resolve({ data: { user: { id: '${IK}', email: 'julian@jelierbouw.nl' } }, error: null });
              }
              return Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } });
            },
            signOut: function () { return Promise.resolve({}); }
          },
          from: function (t) { return window.__bouwer(t); },
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

(async function () {
  let w = maakApp('https://jelierbouw.test/#project=' + PROJECT);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  await wachtTot(() => (w.document.getElementById('projectNaam') || {}).value === 'Verhoef', 10000);

  console.log('\n1. De status loopt mee met het werk');
  check('een leeg project staat op aangemaakt', statusInDb() === 'aangemaakt', statusInDb());
  w.eval("rijen = [{ id: 1, merk: 'A', breedte: 1000, hoogte: 2000, maatsoort: 'Sponningmaat'," +
         " glasType: 'Enkel glas', opbouw: '4 mm' }]; glasMarkeerWerk(); herbereken(); opslaan();");
  await wachtTot(() => statusInDb() !== 'aangemaakt', 12000);
  check('na de eerste glasinvoer staat hij op bezig met inmeten/verwerken',
    statusInDb() === 'bezig met inmeten/verwerken', statusInDb());
  check('en dat staat ook in het logboek', /inmeten/.test(laatsteSpoor()), laatsteSpoor());
  check('het keuzevakje op Projectgegevens volgt',
    (w.document.getElementById('pi-status') || {}).value === 'bezig met inmeten/verwerken',
    (w.document.getElementById('pi-status') || {}).value);

  // v89: één regel met Aantal 4 is vier ruiten, geen één.
  w.eval("rijen[0].aantal = 4; glasMarkeerWerk(); herbereken(); opslaan();");
  await wachtTot(() => (db.projecten.find(p => p.id === PROJECT) || {}).aantal_ruiten === 4, 12000);
  check('een regel met Aantal 4 telt als vier ruiten',
    (db.projecten.find(p => p.id === PROJECT) || {}).aantal_ruiten === 4,
    String((db.projecten.find(p => p.id === PROJECT) || {}).aantal_ruiten));
  w.eval("rijen[0].aantal = 1; glasMarkeerWerk(); herbereken(); opslaan();");
  await wachtTot(() => (db.projecten.find(p => p.id === PROJECT) || {}).aantal_ruiten === 1, 12000);

  console.log('\n2. Het bestelmailvenster');
  w.bestelmailVenster();
  await wachtTot(() => !!w.document.getElementById('mailVerstuur'));
  check('het venster staat open', !!w.document.getElementById('mailVerstuur'));
  const vinkjes = Array.from(w.document.querySelectorAll('.mail-adres input[value]'));
  check('de vaste adressen staan erin', vinkjes.length === 2, vinkjes.length + ' adressen');
  check('het standaardadres is aangevinkt',
    vinkjes.filter(v => v.checked).map(v => v.value).join(',') === 'verkoop@noordenne.test',
    vinkjes.filter(v => v.checked).map(v => v.value).join(','));
  check('het onderwerp is al ingevuld',
    /Verhoef/.test(w.document.getElementById('mailOnderwerp').value),
    w.document.getElementById('mailOnderwerp').value);
  check('de tekst noemt het afleveradres en de levering',
    /Afleveren:/.test(w.document.getElementById('mailTekst').value) &&
    /levering/i.test(w.document.getElementById('mailTekst').value));

  console.log('\n3. Versturen zet het project op besteld');
  // Zonder bijlage: de pdf zelf wordt in test-rook.js (Chromium) nagekeken.
  w.document.getElementById('mailBijlage').checked = false;
  w.document.getElementById('mailExtra').value = 'extra@jelierbouw.nl';
  w.document.getElementById('mailVerstuur').click();
  await wachtTot(() => verstuurd.length > 0, 10000);
  check('de mailfunctie is aangeroepen', verstuurd.length === 1);
  check('met het vaste adres én het extra adres',
    (verstuurd[0].aan || []).join(',') === 'verkoop@noordenne.test,extra@jelierbouw.nl',
    (verstuurd[0].aan || []).join(','));
  check('als soort bestelling', verstuurd[0].soort === 'bestelling', verstuurd[0].soort);
  await wachtTot(() => statusInDb() === 'besteld', 10000);
  check('het project staat op besteld', statusInDb() === 'besteld', statusInDb());
  await wachtTot(() => /bestelmail/.test(laatsteSpoor()), 10000);
  check('en het logboek vertelt naar wie', /bestelmail verstuurd naar/.test(laatsteSpoor()), laatsteSpoor());
  check('het venster is dicht', !w.document.getElementById('mailVerstuur'));

  console.log('\n4. Het slot op de maten');
  await wachtTot(() => w.invoerOpSlot() === true, 8000);
  check('de app weet dat er een slot op zit', w.invoerOpSlot() === true);
  const maatveld = () => w.document.querySelector('#invoerBody input[type=number], #invoerBody input');
  check('de maatvelden zijn niet te bewerken', !!maatveld() && maatveld().disabled === true,
    maatveld() ? 'disabled=' + maatveld().disabled : 'geen veld gevonden');
  check('er staat een balk met uitleg',
    !w.document.getElementById('slotBalk').hidden &&
    /besteld/.test(w.document.getElementById('slotBalk').textContent),
    w.document.getElementById('slotBalk').textContent.slice(0, 60));
  check('met een knop om te ontgrendelen',
    /Ontgrendelen/.test(w.document.getElementById('slotBalk').innerHTML));

  console.log('\n5. Ontgrendelen kan alleen met het goede wachtwoord');
  w.appWachtwoord = function () { return Promise.resolve('fout-wachtwoord'); };
  let gemeld = '';
  w.appFout = function (t) { gemeld = String(t); return Promise.resolve(true); };
  await w.slotOntgrendel();
  check('een verkeerd wachtwoord laat het slot zitten', w.invoerOpSlot() === true);
  check('en er komt een duidelijke melding', /klopt niet/.test(gemeld), gemeld.slice(0, 50));

  w.appWachtwoord = function () { return Promise.resolve('geheim'); };
  await w.slotOntgrendel();
  await wachtTot(() => w.invoerOpSlot() === false, 5000);
  check('met het goede wachtwoord gaan de maten weer open', w.invoerOpSlot() === false);
  check('de velden zijn weer te bewerken', !!maatveld() && maatveld().disabled === false,
    maatveld() ? 'disabled=' + maatveld().disabled : 'geen veld');
  check('de balk zegt nu wie ontgrendelde',
    /Ontgrendeld door julian/.test(w.document.getElementById('slotBalk').textContent),
    w.document.getElementById('slotBalk').textContent.slice(0, 60));
  await wachtTot(() => /slot geopend/.test(laatsteSpoor()), 10000);
  check('en het logboek legt het vast', /slot geopend door julian/.test(laatsteSpoor()), laatsteSpoor());

  console.log('\n6. Een wijziging ná de bestelling valt op');
  check('het bestelmoment is vastgelegd bij het versturen',
    !!w.eval("projectInfo.besteld && projectInfo.besteld.op"),
    String(w.eval("projectInfo.besteld && projectInfo.besteld.op")));
  sporen.length = 0;
  w.eval("rijen[0].breedte = 1234; glasMarkeerWerk(); herbereken(); opslaan();");
  await wachtTot(() => sporen.some(s => /ná de bestelling/.test(s)), 12000);
  check('het logboek zegt dat het ná de bestelling was',
    sporen.some(s => /ná de bestelling/.test(s)), JSON.stringify(sporen));
  check('en de ruit is als gewijzigd gemarkeerd',
    w.eval("naBestellingGewijzigd(rijen[0])") === true);

  console.log('\n7. Een taak op naam van een collega');
  w.appVraag = function () { return Promise.resolve(true); };
  let gemeldOk = '';
  w.appMelding = function (t) { gemeldOk = String(t); return Promise.resolve(true); };
  await wachtTot(() => {
    const k = w.document.getElementById('taakNieuwVoor');
    return k && k.options && k.options.length === 2;
  }, 8000);
  const keuze = w.document.getElementById('taakNieuwVoor');
  check('de collega\'s staan in de keuzelijst', keuze && keuze.options.length === 2,
    keuze ? Array.from(keuze.options).map(o => o.textContent).join(' / ') : 'geen keuzelijst');
  check('mijn eigen naam staat voorgekozen',
    keuze && keuze.value === IK, keuze && keuze.value);

  keuze.value = COLLEGA;
  w.document.getElementById('taakNieuw').value = 'Rooster nameten';
  const mailsVoor = verstuurd.length;
  w.taakToevoegen();
  await wachtTot(() => db.taken.length > 0, 8000);
  check('de taak staat in de tabel', db.taken.length === 1);
  check('op naam van de collega',
    db.taken[0].eigenaar === COLLEGA && db.taken[0].eigenaar_naam === 'Bart',
    db.taken[0].eigenaar_naam);
  await wachtTot(() => verstuurd.length > mailsVoor, 8000);
  check('de collega krijgt er een mailtje over', verstuurd.length === mailsVoor + 1);
  const m = verstuurd[verstuurd.length - 1];
  check('naar zijn eigen adres', (m.aan || [])[0] === 'bart@jelierbouw.nl', (m.aan || [])[0]);
  check('als soort taak', m.soort === 'taak', m.soort);
  check('met de taak en een link naar het project in de tekst',
    /Rooster nameten/.test(m.tekst) && m.tekst.indexOf('#project=' + PROJECT) >= 0);
  w.close();

  console.log('\n8. Een adres dat niet bestaat: geen status besteld');
  resetDb();
  w = maakApp('https://jelierbouw.test/#project=' + PROJECT);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  await wachtTot(() => (w.document.getElementById('projectNaam') || {}).value === 'Verhoef', 10000);
  w.eval("rijen = [{ id: 1, merk: 'A', breedte: 1000, hoogte: 2000, maatsoort: 'Sponningmaat'," +
         " glasType: 'Enkel glas', opbouw: '4 mm' }]; glasMarkeerWerk(); herbereken(); opslaan();");
  await wachtTot(() => statusInDb() === 'bezig met inmeten/verwerken', 12000);
  w.bestelmailVenster();
  await wachtTot(() => !!w.document.getElementById('mailVerstuur'));
  w.document.getElementById('mailBijlage').checked = false;
  w.document.querySelectorAll('.mail-adres input[value]').forEach(v => { v.checked = false; });
  w.document.getElementById('mailExtra').value = 'stuk@nergens.test';
  w.document.getElementById('mailVerstuur').click();
  await wachtTot(() => verstuurd.length > 0, 10000);
  await wacht(1500);
  check('de status blijft staan als de mail niet aankomt',
    statusInDb() === 'bezig met inmeten/verwerken', statusInDb());
  check('het venster blijft open met de fout erin',
    !!w.document.getElementById('mailMelding') &&
    /Niet verstuurd/.test(w.document.getElementById('mailMelding').textContent),
    (w.document.getElementById('mailMelding') || {}).textContent);
  check('en de mislukte poging is vastgelegd',
    db.mailverzonden.length === 1 && db.mailverzonden[0].gelukt === false);
  check('de maten zijn niet op slot gegaan', w.invoerOpSlot() === false);
  w.close();

  console.log('\n9. Het SQL-script van v88 is nog niet gedraaid');
  resetDb();
  gebruikersWeg = true;
  w = maakApp('https://jelierbouw.test/#project=' + PROJECT);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  await wachtTot(() => (w.document.getElementById('projectNaam') || {}).value === 'Verhoef', 10000);
  await wacht(1200);
  check('het project opent gewoon',
    w.document.getElementById('projectNaam').value === 'Verhoef');
  check('de app heeft gemerkt dat de gebruikerstabel ontbreekt',
    w.glasGebruikersTabel() === false, String(w.glasGebruikersTabel()));
  const keuze2 = w.document.getElementById('taakNieuwVoor');
  check('dan is er geen keuzelijst met namen', !keuze2 || keuze2.hidden === true,
    keuze2 ? 'hidden=' + keuze2.hidden : 'geen vakje');
  w.document.getElementById('taakNieuw').value = 'Zonder namenlijst';
  w.taakToevoegen();
  await wachtTot(() => db.taken.length > 0, 8000);
  check('een taak toevoegen lukt nog steeds, op eigen naam',
    db.taken.length === 1 && db.taken[0].eigenaar === IK, db.taken[0].eigenaar_naam);

  console.log('\n10. Drie ruiten één voor één weg geeft één kloppende regel');
  // Dit was de klacht: drie losse regels weggooien kwam in het logboek
  // terecht als "1 ruit verwijderd".
  w.close();
  resetDb();
  const p0 = db.projecten.find(p => p.id === PROJECT);
  // Al in bedrijf, zodat de statusovergang niet tussendoor komt.
  p0.status = 'bezig met inmeten/verwerken';
  p0.data.info = { status: 'bezig met inmeten/verwerken' };
  p0.data.rijen = [
    { id: 1, merk: 'A', breedte: 1000, hoogte: 2000 },
    { id: 2, merk: 'B', breedte: 1100, hoogte: 2100 },
    { id: 3, merk: 'C', breedte: 1200, hoogte: 2200 }
  ];
  w = maakApp('https://jelierbouw.test/#project=' + PROJECT);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  await wachtTot(() => (w.document.getElementById('projectNaam') || {}).value === 'Verhoef', 10000);
  await wachtTot(() => w.eval('rijen.filter(function(r){return r.merk;}).length') === 3, 8000);
  check('de drie ruiten staan er', w.eval('rijen.filter(function(r){return r.merk;}).length') === 3);

  sporen.length = 0; vervolgen.length = 0;
  for (const id of [3, 2, 1]) {
    const n = sporen.length;
    w.eval("rijen = rijen.filter(function (r) { return r.id !== " + id + "; });" +
           " glasMarkeerWerk(); herbereken(); opslaan();");
    await wachtTot(() => sporen.length > n, 12000);
  }
  check('de regel groeit mee met elke verwijderde ruit',
    sporen.join(' → ').indexOf('1 ruit verwijderd') >= 0 &&
    sporen.join(' → ').indexOf('2 ruiten verwijderd') >= 0 &&
    sporen.some(s => /3 ruiten verwijderd/.test(s)),
    JSON.stringify(sporen));
  check('de eerste begint een nieuwe regel, de rest is een vervolg',
    vervolgen[0] === false && vervolgen.slice(1).every(v => v === true),
    JSON.stringify(vervolgen));

  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  w.close();
  process.exit(fouten ? 1 : 0);
})();
