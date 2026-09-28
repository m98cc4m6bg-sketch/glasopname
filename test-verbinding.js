/* Testreeks v84 — node test-verbinding.js
   Supabase wordt nagebootst: we zetten de verbinding uit en weer aan en
   kijken of het statuspilletje meegaat en de app vanzelf herstelt.
   Zonder dit bleef er rood 'Geen verbinding' staan tot er toevallig iets
   opgeslagen werd.                                                      */
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
  <input id="projectNaam" value="test 55"><input id="projectDatum" value="">
  <select id="spelingGlobal"><option value="4" selected>4</option></select>
  <select id="bijtelling"><option value="11" selected>11</option></select>
  <div id="cloudLogin"></div><div id="cloudProjecten"></div>
  <input id="cloudEmail"><input id="cloudWachtwoord">
  <div id="cloudLoginFout"></div><div id="cloudProjectLijst"></div>
  <div id="syncMelding"></div><div id="naamWaarschuwing"></div>
  <div id="ingelogdAls"></div>
</body></html>`;

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://jelierbouw.test/' });
const w = dom.window;
// jsdom zegt standaard 'prerender'; de app kijkt of het tabblad in beeld is.
Object.defineProperty(w.document, 'visibilityState', { get: () => 'visible' });
Object.defineProperty(w.document, 'hidden', { get: () => false });

/* ── de app zonder index.html: alleen wat cloud.js aanroept ───────── */
w.eval(`
  window.rijen = []; window.volgendId = 1; window.fotos = [];
  window.projectInfo = {}; window.projectTaken = [];
  window.renderTabel = function () {}; window.herbereken = function () {};
  window.renderFotos = function () {}; window.renderProject = function () {};
  window.voegRijenToe = function () {}; window.opslaan = function () {};
  window.clearAlles = function () {}; window.merkOpnieuwBeoordelen = function () {};
  window.appMelding = function () { return Promise.resolve(true); };
  window.appFout = window.appMelding;
  window.appVraag = function () { return Promise.resolve(true); };
  window.GLASOPNAME_CONFIG = { url: 'https://test.supabase.co', anonKey: 'sb_publishable_test' };
`);

/* ── nagebootste Supabase ─────────────────────────────────────────── */
const stand = { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [],
                project: 'test 55', datum: '', speling: '4', bijtelling: '11' };
const teller = { select: 0, update: 0 };
let netwerk = true;

function bouwer(tabel) {
  const b = {};
  ['select', 'eq', 'order', 'limit', 'update', 'insert', 'delete'].forEach(function (naam) {
    b[naam] = function () {
      if (naam === 'select') teller.select++;
      if (naam === 'update') teller.update++;
      return b;
    };
  });
  function antwoord() {
    if (!netwerk) return { data: null, error: { message: 'Failed to fetch' } };
    if (tabel === 'projecten') return { data: { id: 'p1', data: stand, updated_at: '2026-09-28T10:00:00Z' }, error: null };
    return { data: null, error: null };
  }
  b.maybeSingle = function () { return Promise.resolve(antwoord()); };
  b.single = function () { return Promise.resolve(antwoord()); };
  b.then = function (goed, fout) { return Promise.resolve(antwoord()).then(goed, fout); };
  return b;
}

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
      storage: { from: function () { return { list: function () { return Promise.resolve({ data: [] }); },
                                              remove: function () { return Promise.resolve({}); } }; } }
      // bewust geen .channel: live bijwerken wordt dan overgeslagen
    };
  }
};

w.localStorage.setItem('glasopname_project', 'p1');
w.localStorage.setItem('glasopname_v2', JSON.stringify(stand));

const script = w.document.createElement('script');
script.textContent = fs.readFileSync('cloud.js', 'utf8');

(async function () {
  console.log('\n1. Opstarten zonder verbinding');
  netwerk = false;
  w.document.body.appendChild(script);            // cloud.js draait init() meteen
  await wacht(200);
  const pil = () => w.document.getElementById('cloudStatus').textContent;
  check('het pilletje meldt geen verbinding', pil().indexOf('Geen verbinding') >= 0, pil());

  console.log('\n2. Verbinding terug: de app herstelt uit zichzelf');
  netwerk = true;
  const voor = teller.select;
  w.dispatchEvent(new w.Event('online'));
  await wacht(300);
  check('er is opnieuw bij de server nagevraagd', teller.select > voor,
    (teller.select - voor) + ' extra bevragingen');
  check('het pilletje staat weer op opgeslagen', pil().indexOf('Opgeslagen') >= 0, pil());

  console.log('\n3. Terugkomen op het tabblad met een dode verbinding');
  netwerk = false;
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  await wacht(200);
  check('dat wordt gemeld in plaats van genegeerd', pil().indexOf('Geen verbinding') >= 0, pil());

  console.log('\n4. En weer terug bij het volgende bezoek');
  netwerk = true;
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  await wacht(300);
  check('het pilletje klopt weer', pil().indexOf('Opgeslagen') >= 0, pil());

  console.log('\n5. Vanzelf opnieuw proberen, zonder iets te doen');
  netwerk = false;
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  await wacht(200);
  check('eerst rood', pil().indexOf('Geen verbinding') >= 0, pil());
  netwerk = true;
  // De eerste herkansing staat na 5 seconden gepland.
  await wacht(6000);
  check('en na de wachttijd vanzelf weer groen', pil().indexOf('Opgeslagen') >= 0, pil());

  console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
  w.close();
  process.exit(fouten ? 1 : 0);
})();
