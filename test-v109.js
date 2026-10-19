/* Testreeks v109 — node test-v109.js   (en: node test-v109.js --mutaties)

   Onderwerp: inloggen en wachtwoorden.
   1. De wachtwoordvraag van de browser direct na het inloggen, zonder de
      waarschuwing "niet beveiligd formulier" (Jans proef met v108 op de Mac).
   2. "Wachtwoord vergeten?" op het inlogscherm: alleen een melding (keuze Jan).
   3. Het venster "Kies een nieuw wachtwoord" als de app opent via een
      herstellink uit Supabase.

   Echte situatie:
   - Bart is zijn wachtwoord kwijt. Hij belt Jan. Jan kiest in Supabase
     "Send password recovery". Bart opent de mail op zijn iPhone; de link
     opent in Safari (niet in de app op het beginscherm). Soms is de link al
     een keer geopend, of te oud (een uur geldig, één keer bruikbaar; een
     mailscanner kan hem ook al "geopend" hebben).
   - Op de bouwplaats kan het bereik net wegvallen als hij op Opslaan tikt.
   - Een nieuwe versie van de app kan net binnenkomen (herladen).
   - Hij sluit het tabblad zonder te kiezen en opent de app later weer; of
     drukt op de terug-knop (een gedeelde iPad).
   - Op de iPad was al iemand anders ingelogd (Julian).
   - Supabase slaat het nieuwe wachtwoord op, maar het antwoord komt niet
     aan.
   - Half bereik: de verbinding blijft hangen in plaats van weg te vallen.
   - Julian logt op de Mac in Safari in; een collega op een Windows-pc in Edge.

   Belofte (Jans woorden en de harde eisen):
   - "Wachtwoord bewaren?" direct na de inlog, met het e-mailadres al goed,
     zonder waarschuwing; bij een fout wachtwoord niets.
   - Het wachtwoord gaat nergens anders heen dan naar Supabase.
   - De knop "Wachtwoord vergeten?" toont alleen: "Deze functie zit bewust
     niet in de app, vraag julian om een herstel link!".
   - Via een herstellink kies je een nieuw wachtwoord; daarna log je daarmee
     overal in. Een verlopen link zegt dat duidelijk.
   - Nooit gegevens kwijt: werk dat nog op het apparaat wacht, blijft staan.

   Wat er mis gaat voor de gebruiker als het niet klopt:
   - Safari waarschuwt of vraagt de verkeerde gebruikersnaam (Jan zag dat);
   - het wachtwoord komt in een webadres of in de logboeken van GitHub;
   - de knop "vergeten" logt per ongeluk in of verstuurt het formulier;
   - Bart is via de link ingelogd maar kan geen nieuw wachtwoord kiezen, en
     kan daarna op zijn andere apparaten niet inloggen (de stand van v108);
   - een te kort of verkeerd overgetypt wachtwoord wordt opgeslagen;
   - bij weggevallen bereik lijkt het gelukt terwijl het niet zo is;
   - na herladen is het venster weg, maar is hij wel ingelogd.

   Wat deze opstelling aanneemt (TESTEN.md, vraag 5):
   - De ÉCHTE bibliotheek van Supabase (lib/supabase-js-2.117.2) praat met
     een nagebootste Supabase-server in node (auth: inloggen, gebruiker,
     wachtwoord wijzigen, uitloggen; rest: lege lijsten). Zo is getest hoe de
     bibliotheek zich echt gedraagt bij het zetten van de sessie uit de link
     (setSession; het adres leest de app zelf), het wijzigen van het
     wachtwoord en uitloggen. Hoe de
     échte Supabase de link maakt (de mail, de omweg via /verify) is
     nagebootst met het adres dat Supabase volgens zijn documentatie geeft.
   - "Safari" = Chromium met de herkenning van Safari en zonder
     PasswordCredential (dat kent Safari niet). De vraag "Wachtwoord
     bewaren?" van macOS/iOS zelf, en de waarschuwing "niet beveiligd", zijn
     hier NIET te zien. Getest is wat de browser te horen krijgt: een
     verzending naar een https-adres van de app zelf (hier http, de
     testserver), zonder gegevens erin.
   - Geen bereik = de nagebootste server verbreekt de verbinding (S.weg). */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('/home/claude/node_modules/playwright');

/* ─── de reparaties terugdraaien (proef op de som) ─────────────── */
const MUTATIES = {
  // De knop "Wachtwoord vergeten?" als gewone knop in het formulier: verstuurt het formulier.
  vergetensubmit: ['index.html', '<button type="button" class="login-vergeten" id="cloudVergetenKnop"',
                                 '<button class="login-vergeten" id="cloudVergetenKnop"'],
  // De melding met een andere tekst.
  vergetentekst: ['cloud.js', "vraag julian om een herstel link!'", "neem contact op met kantoor.'"],
  // Terug naar about:blank (de waarschuwing in Safari).
  aboutblank: ['index.html', 'id="cloudLoginForm" method="get" action="leeg.html"', 'id="cloudLoginForm" method="get" action="about:blank"'],
  // Het wachtwoordveld met een name: dan komt het in het adres van het kader.
  pwnaam: ['index.html', '<input type="password" id="cloudWachtwoord" autocomplete="current-password">',
                         '<input type="password" id="cloudWachtwoord" name="password" autocomplete="current-password">'],
  // Het kader zonder sandbox.
  sandbox: ['index.html', '            sandbox="" style="display:none"></iframe>', '            style="display:none"></iframe>'],
  // De herstellink niet herkennen: Bart is stil ingelogd, zonder nieuw wachtwoord (de stand van v108).
  geenlink: ['cloud.js', "if (sessie && (vanLink || (vlag && vlag === sessie.user.id))) {",
                         "if (sessie && ((vlag && vlag === sessie.user.id))) {"],
  // Het venster ook tonen als de link niet verwerkt kon worden: dan voor wie er al ingelogd was (Julian).
  andergebruiker: ['cloud.js', "(herstelLink.sub ? sessie.user.id === herstelLink.sub : !!linkSessie));",
                               "true);"],
  // Terug naar de werkwijze van de eerste bouw: de bibliotheek leest en wist het adres zelf
  // (location.hash = '', een nieuwe stap in de geschiedenis): de terug-knop brengt de code terug.
  historie: ['cloud.js', "    if (r) herstelAdresLeeg();\n    return r;", "    return r;",
                         "createClient(cfg.url, cfg.anonKey, { auth: { detectSessionInUrl: false } })", "createClient(cfg.url, cfg.anonKey)"],
  // Zonder sessie (even geen bereik) de vlag wissen: later met bereik stil in de app.
  vlagwis: ['cloud.js', "      } else {\n        // Geen sessie: de vlag laten staan.", "      } else {\n        herstelVlag(false);\n        // Geen sessie: de vlag laten staan."],
  // "Niet nu" wist de vlag meteen, vóór het uitloggen klaar is.
  nietnuvlag: ['cloud.js', "    el('cloudHerstel').style.display = 'none';\n    var twijfel = herstelOnbeslist !== null;",
                           "    verbergHerstel();\n    var twijfel = herstelOnbeslist !== null;"],
  // Geen tijdsgrens: een hangende verbinding laat de collega eindeloos wachten.
  geengrens: ['cloud.js', "var HERSTEL_WACHT_MS = window.GLAS_HERSTEL_WACHT_MS || 20000;", "var HERSTEL_WACHT_MS = 86400000;"],
  // Herladen of een nieuw tabblad: het venster komt niet terug.
  geenvlag: ['cloud.js', "if (aan === undefined) return localStorage.getItem(LS_HERSTEL) || '';",
                         "if (aan === undefined) return '';"],
  // De vlag per tabblad (sessionStorage, zoals eerst gebouwd): een nieuw tabblad is stil ingelogd.
  pertabblad: ['cloud.js', "if (aan === undefined) return localStorage.getItem(LS_HERSTEL) || '';\n      if (aan) localStorage.setItem(LS_HERSTEL, id || '?'); else localStorage.removeItem(LS_HERSTEL);",
                           "if (aan === undefined) return sessionStorage.getItem(LS_HERSTEL) || '';\n      if (aan) sessionStorage.setItem(LS_HERSTEL, id || '?'); else sessionStorage.removeItem(LS_HERSTEL);"],
  // Geen bereik bij het openen van de link: niet opnieuw kunnen proberen.
  geenopnieuw: ['cloud.js', "      if (!nogEens) return null;", "      return null;"],
  // Het antwoord ging verloren nadat Supabase opsloeg: "oude wachtwoord" niet als gelukt zien.
  onbeslist: ['cloud.js', "var alGelukt = err && /same_password", "var alGelukt = false && /same_password"],
  // "Niet nu" na een onbesliste poging zegt toch "niet gewijzigd".
  twijfel: ['cloud.js', "var twijfel = herstelOnbeslist !== null;", "var twijfel = false;"],
  // Een verlopen link zegt niets.
  geenfout: ['cloud.js', "if (herstelLink && herstelLink.soort === 'fout') herstelLinkFout(herstelLink);", ""],
  // Te kort mag.
  lengte: ['cloud.js', "if (pw.length < 8) {", "if (pw.length < 1) {"],
  // Niet gelijk mag.
  gelijk: ['cloud.js', "if (pw !== pw2) {", "if (false) {"],
  // Het nieuwe wachtwoord niet aan de browser aanbieden.
  nietaanbieden: ['cloud.js', "    wachtwoordAanbieden(email, pw, el('cloudHerstelForm'), ['cloudHerstelNieuw', 'cloudHerstelNogEens']);\n", ""],
  // Geen bereik: toch "opgeslagen" melden.
  foutstil: ['cloud.js', "    if (err && !alGelukt) {", "    if (false) {"],
  // "Niet nu" gooit het werk weg dat nog omhoog moet.
  pending: ['cloud.js', "    el('cloudHerstel').style.display = 'none';\n    var twijfel = herstelOnbeslist !== null;",
                        "    el('cloudHerstel').style.display = 'none';\n    localStorage.removeItem('glasopname_pending');\n    var twijfel = herstelOnbeslist !== null;"]
};

// Welke onderdelen een mutatie moeten vangen (de mutatieproef draait alleen die).
const WAAR = { vergetensubmit: '1', vergetentekst: '1', aboutblank: '2', pwnaam: '2', sandbox: '2',
  geenlink: '3', andergebruiker: '10', historie: '8', geenvlag: '5', pertabblad: '8', geenopnieuw: '10',
  geenfout: '4', lengte: '3', gelijk: '3', nietaanbieden: '3', foutstil: '3', onbeslist: '9', twijfel: '9',
  pending: '6', vlagwis: '8', nietnuvlag: '12', geengrens: '12' };
if (process.argv.includes('--mutaties')) {
  let gemist = 0;
  for (const naam of Object.keys(MUTATIES)) {
    const r = spawnSync('node', [__filename], { env: Object.assign({}, process.env, { MUTATIE: naam, ALLEEN: WAAR[naam] || '' }), encoding: 'utf8', timeout: 600000 });
    const uit = (r.stdout || '') + (r.stderr || '');
    const past = !/mutatie past niet/.test(uit);
    const gevangen = past && /^\s*FOUT /m.test(uit);
    if (!gevangen) gemist++;
    const eerste = (uit.split('\n').find(l => /^\s*FOUT /.test(l)) || '').trim();
    console.log((gevangen ? 'gevangen  ' : (past ? 'GEMIST    ' : 'PAST NIET ')) + naam + (eerste ? '   ← ' + eerste.slice(0, 150) : ''));
  }
  console.log(gemist ? '\n' + gemist + ' mutatie(s) niet gevangen.' : '\nAlle mutaties gevangen.');
  process.exit(gemist ? 1 : 0);
}

let fouten = 0;
function check(wat, ok, uitleg) {
  if (ok) console.log('  ok   ' + wat);
  else { fouten++; console.log('  FOUT ' + wat + (uitleg !== undefined ? '  → ' + uitleg : '')); }
}
const wacht = ms => new Promise(r => setTimeout(r, ms));
async function wachtTot(f, ms) {
  const eind = Date.now() + (ms || 5000);
  while (Date.now() < eind) { try { if (await f()) return true; } catch (e) {} await wacht(100); }
  return false;
}

/* ─── de nagebootste Supabase ───────────────────────────────────── */
const JULIAN = { id: '11111111-1111-1111-1111-111111111111', email: 'julian@jelierbouw.nl' };
const BART = { id: '22222222-2222-2222-2222-222222222222', email: 'bart@jelierbouw.nl' };
const S = {};
function resetS() {
  S.wachtwoord = { 'julian@jelierbouw.nl': 'geheim-oud', 'bart@jelierbouw.nl': 'bart-oud-1' };
  S.tokens = {};          // token → e-mail
  S.weg = false;          // geen bereik
  S.log = [];             // alle verzoeken aan Supabase
  S.app = [];             // alle verzoeken aan de app (GitHub Pages)
  S.logins = 0;
  S.appData = null;       // app_data.glas_data (null = geen rij)
  S.slik = false;         // wachtwoord opslaan, maar het antwoord niet afleveren
  S.hang = {};            // pad:methode → true: lang geen antwoord (verbinding blijft hangen)
  S.hangDan = null;       // 'antwoord': na het wachten tóch antwoorden; anders verbinding verbreken
}
resetS();
function gebruikerVan(email) {
  const u = email === BART.email ? BART : JULIAN;
  return { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, app_metadata: { provider: 'email' },
           user_metadata: {}, created_at: '2026-09-01T08:00:00Z', updated_at: new Date().toISOString() };
}
// Een token zoals Supabase het geeft: een JWT (kop.inhoud.handtekening). De
// bibliotheek leest de vervaltijd eruit (setSession), dus het moet die vorm
// hebben; de handtekening controleert alleen de server.
function maakToken(email) {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const nu = Math.floor(Date.now() / 1000);
  return b64({ alg: 'HS256', typ: 'JWT' }) + '.' +
    b64({ sub: email === BART.email ? BART.id : JULIAN.id, email: email, role: 'authenticated', aud: 'authenticated',
          iat: nu, exp: nu + 3600, n: Math.random().toString(36).slice(2) }) + '.handtekening';
}
function sessieVoor(email) {
  const tok = maakToken(email);
  S.tokens[tok] = email;
  return { access_token: tok, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
           refresh_token: 'ref-' + tok, user: gebruikerVan(email) };
}
// De herstellink zoals Supabase hem na /verify naar de app stuurt.
function herstelAdres(adres, email) {
  const tok = maakToken(email);
  S.tokens[tok] = email;
  return adres + '#access_token=' + tok + '&expires_at=' + (Math.floor(Date.now() / 1000) + 3600) +
    '&expires_in=3600&refresh_token=ref-' + tok + '&token_type=bearer&type=recovery';
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*',
               'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
               'Access-Control-Expose-Headers': 'Content-Range, X-Supabase-Api-Version' };
function antwoord(res, status, body, extra) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json' }, CORS, extra || {}));
  res.end(body === undefined ? '' : JSON.stringify(body));
}
const supa = http.createServer(function (req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  let tekst = '';
  req.on('data', d => { tekst += d; });
  req.on('end', function () {
    const url = new URL(req.url, 'http://x');
    const tok = String(req.headers.authorization || '').replace(/^Bearer /, '');
    let body = {}; try { body = tekst ? JSON.parse(tekst) : {}; } catch (e) {}
    S.log.push({ methode: req.method, pad: url.pathname, zoek: url.search, body: body, wie: S.tokens[tok] || null });
    if (S.weg) { req.socket.destroy(); return; }
    // Half bereik: lang geen antwoord, en uiteindelijk een verbroken
    // verbinding (zoals een echte verbinding na een tijd opgeeft).
    if (S.hang[url.pathname + ':' + req.method]) {
      const dan = S.hangDan;
      setTimeout(() => {
        if (dan === 'antwoord' && url.pathname === '/auth/v1/user' && S.tokens[tok]) antwoord(res, 200, gebruikerVan(S.tokens[tok]));
        else req.socket.destroy();
      }, 4000);
      return;
    }
    const p = url.pathname;
    if (p === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      S.logins++;
      if (S.wachtwoord[body.email] && S.wachtwoord[body.email] === body.password) return antwoord(res, 200, sessieVoor(body.email));
      return antwoord(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    }
    if (p === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const oud = String(body.refresh_token || '').replace(/^ref-/, '');
      if (S.tokens[oud]) return antwoord(res, 200, sessieVoor(S.tokens[oud]));
      return antwoord(res, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
    }
    if (p === '/auth/v1/user' && req.method === 'GET') {
      if (!S.tokens[tok]) return antwoord(res, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' });
      return antwoord(res, 200, gebruikerVan(S.tokens[tok]));
    }
    if (p === '/auth/v1/user' && req.method === 'PUT') {
      const email = S.tokens[tok];
      if (!email) return antwoord(res, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' });
      if (body.password !== undefined) {
        if (String(body.password).length < 6) return antwoord(res, 422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 6 characters.' });
        if (S.wachtwoord[email] === body.password) {
          return antwoord(res, 422, { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' });
        }
        S.wachtwoord[email] = body.password;
        // Supabase slaat op, maar het antwoord komt niet aan: het bereik valt
        // net op dat moment weg (en blijft even weg).
        if (S.slik) { S.weg = true; req.socket.destroy(); return; }
      }
      return antwoord(res, 200, gebruikerVan(email));
    }
    if (p === '/auth/v1/logout') { delete S.tokens[tok]; res.writeHead(204, CORS); res.end(); return; }
    if (p.indexOf('/rest/v1/rpc/') === 0) return antwoord(res, 200, null);
    if (p === '/rest/v1/app_data' && S.appData && req.method === 'GET') {
      return antwoord(res, 200, [{ waarde: S.appData }], { 'Content-Range': '0-0/1' });
    }
    if (p.indexOf('/rest/v1/') === 0) {
      if (/vnd\.pgrst\.object/.test(String(req.headers.accept || ''))) {
        return antwoord(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: '', hint: null });
      }
      return antwoord(res, 200, req.method === 'GET' || req.method === 'HEAD' ? [] : null, { 'Content-Range': '*/0' });
    }
    if (p.indexOf('/storage/v1/') === 0) return antwoord(res, 200, []);
    return antwoord(res, 404, { message: 'onbekend: ' + p });
  });
});

/* ─── de app serveren (zoals GitHub Pages) ─────────────────────── */
const map = fs.mkdtempSync(path.join(os.tmpdir(), 'glasopname-v109-'));
fs.readdirSync('.').forEach(function (naam) {
  if (fs.statSync(naam).isDirectory()) return;
  fs.copyFileSync(naam, path.join(map, naam));
});
fs.cpSync('lib', path.join(map, 'lib'), { recursive: true });
if (process.env.MUTATIE) {
  const m = MUTATIES[process.env.MUTATIE];
  if (!m) { console.log('onbekende mutatie'); process.exit(2); }
  const doel = path.join(map, m[0]);
  let tekst = fs.readFileSync(doel, 'utf8');
  for (let i = 1; i < m.length; i += 2) {      // één of meer vervangingen in hetzelfde bestand
    if (tekst.indexOf(m[i]) < 0) { console.log('mutatie past niet: ' + process.env.MUTATIE); process.exit(3); }
    tekst = tekst.replace(m[i], m[i + 1]);
  }
  fs.writeFileSync(doel, tekst);
  console.log('   (mutatie ' + process.env.MUTATIE + ' in ' + m[0] + ')');
}
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg',
                '.webmanifest': 'application/manifest+json' };
const app = http.createServer(function (req, res) {
  S.app.push(req.url);
  let naam = decodeURIComponent(req.url.split('?')[0]);
  if (naam === '/') naam = '/index.html';
  const bestand = path.join(map, naam);
  if (!bestand.startsWith(map) || !fs.existsSync(bestand) || fs.statSync(bestand).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(bestand)] || 'application/octet-stream' });
  res.end(fs.readFileSync(bestand));
});

const UA = {
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0'
};
let adres, supaAdres, browser;
const consoleFouten = [];
// Een apparaat. safari = zonder PasswordCredential (zoals Safari en Firefox).
async function apparaat(soort, opties, wachtMs) {
  const safari = soort !== 'win';
  const ctx = await browser.newContext(Object.assign({
    viewport: { width: 1280, height: 900 }, userAgent: UA[soort] || UA.mac, serviceWorkers: 'block'
  }, opties || {}));
  if (wachtMs) await ctx.addInitScript(ms => { window.GLAS_HERSTEL_WACHT_MS = ms; }, wachtMs);
  await ctx.addInitScript(z => {
    window.__bewaard = []; window.__verstuurd = []; window.__merk = 'zelfde pagina';
    if (z) { try { delete window.PasswordCredential; } catch (e) {} window.PasswordCredential = undefined; }
    else if (navigator.credentials) {
      navigator.credentials.store = c => { window.__bewaard.push({ id: c.id, pw: c.password }); return Promise.resolve(c); };
    }
    document.addEventListener('submit', e => {
      setTimeout(() => window.__verstuurd.push({ echt: !e.defaultPrevented, doel: e.target.target, form: e.target.id,
        actie: e.target.action }), 0);
    }, true);
  }, safari);
  ctx.__kader = [];
  return ctx;
}
async function pagina(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', e => { if (!/sandboxed/.test(String(e))) consoleFouten.push(String(e)); });  // v109: het afgeschermde inlogkader, zie TESTEN.md
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR|WebSocket|realtime|sandboxed/i.test(m.text())) consoleFouten.push('[console] ' + m.text());
  });
  page.on('framenavigated', f => { if (f.name() === 'cloudLoginKader' && f.url() !== 'about:blank') ctx.__kader.push(f.url()); });
  return page;
}
const zichtbaar = (page, sel) => page.evaluate(s => {
  const e = document.querySelector(s); if (!e) return false;
  const st = getComputedStyle(e); return st.display !== 'none' && st.visibility !== 'hidden';
}, sel);
// Het venster "Kies een nieuw wachtwoord" klaar voor gebruik: zichtbaar én met
// een adres (tijdens "Herstellink verwerken…" is het adres nog leeg).
const herstelKlaar = async page => await zichtbaar(page, '#cloudHerstel') &&
  !!(await page.inputValue('#cloudHerstelEmail'));
const meldingen = page => page.$$eval('.melding-laag', ls => ls.map(l => l.innerText.replace(/\s+/g, ' ')));
const kenmerk = page => page.evaluate(() => ({ bewaard: window.__bewaard, verstuurd: window.__verstuurd, merk: window.__merk,
  adres: location.href, fout: (document.getElementById('cloudHerstelFout') || {}).textContent,
  loginFout: document.getElementById('cloudLoginFout').textContent }));
async function sluitMelding(page) {
  const n = await page.$$eval('.melding-laag', l => l.length);
  if (n) { await page.locator('.melding-laag').last().locator('.melding-knoppen button').last().click(); await wacht(200); }
}
const plaatjes = process.env.PLAATJES || '';
// Alleen bepaalde onderdelen (voor de mutatieproef): ALLEEN=1,3
const ALLEEN = process.env.ALLEEN ? process.env.ALLEEN.split(',') : null;
const doe = n => !ALLEEN || ALLEEN.indexOf(n) >= 0;
// Werk dat op het apparaat nog omhoog moet, zoals het er echt staat: de kopie
// van een project (met ruiten), de vlag, en werk dat apart bewaard moet worden.
const WACHTEND = {
  glasopname_v2: JSON.stringify({ _projectId: '00000000-0000-4000-8000-0000000000aa', project: 'Kerkstraat 1',
    rijen: [{ id: 1, merk: 'K1', aantal: 1, breedte: '1200', hoogte: '800' }], fotos: [], info: {} }),
  glasopname_pending: '1',
  glasopname_redding: JSON.stringify([{ naam: 'Dorpsweg 3', data: { rijen: [{ id: 1, merk: 'A1', breedte: '600', hoogte: '600' }] } }])
};
async function wachtendGelijk(page) {
  const nu = await page.evaluate(k => k.map(x => localStorage.getItem(x)), Object.keys(WACHTEND));
  return Object.keys(WACHTEND).every((k, i) => nu[i] === WACHTEND[k]);
}
const metToken = woord => S.log.filter(l => JSON.stringify(l).indexOf(woord) >= 0);

(async function () {
  await new Promise(r => supa.listen(0, r));
  await new Promise(r => app.listen(0, r));
  supaAdres = 'http://127.0.0.1:' + supa.address().port;
  adres = 'http://127.0.0.1:' + app.address().port + '/index.html';
  fs.writeFileSync(path.join(map, 'config.js'),
    'window.GLASOPNAME_CONFIG = { url: "' + supaAdres + '", anonKey: "sb_publishable_test" };\n');
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ctx, pg, st, ml, f3, g7;

  if (doe('1')) {
  /* ══ 1 ════════════════════════════════════════════════════════ */
  console.log('\n1. "Wachtwoord vergeten?" op het inlogscherm (iPhone): alleen de melding');
  resetS();
  ctx = await apparaat('iphone', Object.assign({}, devices['iPhone 13'], { userAgent: UA.iphone }));
  pg = await pagina(ctx);
  await pg.goto(adres);
  await pg.waitForSelector('#cloudLogin', { state: 'visible', timeout: 10000 });
  await wacht(300);
  const knop1 = await pg.evaluate(() => {
    const k = document.getElementById('cloudVergetenKnop'); const r = k.getBoundingClientRect();
    const i = document.getElementById('cloudLoginKnop').getBoundingClientRect();
    return { tekst: k.textContent.trim(), type: k.type, onder: r.top >= i.bottom - 1, binnen: r.left >= 0 && r.right <= innerWidth,
             hoog: r.height, inForm: !!k.closest('form#cloudLoginForm') };
  });
  check('onder ‹Inloggen› staat "Wachtwoord vergeten?", binnen het scherm, groot genoeg om te raken (≥ 30 px)',
    knop1.tekst === 'Wachtwoord vergeten?' && knop1.onder && knop1.binnen && knop1.hoog >= 30, JSON.stringify(knop1));
  if (plaatjes) await pg.screenshot({ path: path.join(plaatjes, 'v109-inlog-iphone.png') });
  // Met e-mail en wachtwoord al ingevuld: de knop mag NIET inloggen.
  await pg.fill('#cloudEmail', 'bart@jelierbouw.nl');
  await pg.fill('#cloudWachtwoord', 'bart-oud-1');
  const logVoor1 = S.log.length;
  await pg.tap('#cloudVergetenKnop');
  await wachtTot(async () => (await meldingen(pg)).length > 0, 4000);
  await wacht(500);
  ml = (await meldingen(pg)).join(' | ');
  st = await kenmerk(pg);
  check('de melding zegt precies: "Deze functie zit bewust niet in de app, vraag julian om een herstel link!"',
    /Deze functie zit bewust niet in de app, vraag julian om een herstel link!/.test(ml), ml);
  check('…en verder gebeurt er niets: niet ingelogd, formulier niet verstuurd, geen verzoek aan Supabase',
    S.logins === 0 && !st.verstuurd.length && S.log.length === logVoor1 && await zichtbaar(pg, '#cloudLogin'),
    JSON.stringify([S.logins, st.verstuurd, S.log.slice(logVoor1)]));
  await sluitMelding(pg);
  check('na ‹Oké› staat het inlogscherm er nog, met wat er was ingevuld',
    await zichtbaar(pg, '#cloudLogin') && await pg.inputValue('#cloudEmail') === 'bart@jelierbouw.nl');
  // Enter in het wachtwoord logt gewoon in (de knop staat er niet tussen).
  await pg.press('#cloudWachtwoord', 'Enter');
  await wachtTot(async () => !(await zichtbaar(pg, '#cloudLogin')), 6000);
  check('Enter in het wachtwoord logt gewoon in (één keer)', !(await zichtbaar(pg, '#cloudLogin')) && S.logins === 1, S.logins);
  await ctx.close();
  }

  if (doe('2')) {
  /* ══ 2 ════════════════════════════════════════════════════════ */
  console.log('\n2. Inloggen in "Safari" (Mac): de browser hoort het direct, via de app zelf, zonder gegevens erin');
  for (const soort of ['mac', 'win']) {
    resetS();
    const naam = soort === 'mac' ? 'Safari (Mac)' : 'Edge (Windows)';
    ctx = await apparaat(soort);
    pg = await pagina(ctx);
    await pg.goto(adres);
    await pg.waitForSelector('#cloudLogin', { state: 'visible', timeout: 10000 });
    const vorm = await pg.evaluate(() => {
      const f = document.getElementById('cloudLoginForm');
      const k = document.getElementById('cloudLoginKader');
      return { actie: f.action, methode: f.method, namen: Array.from(f.elements).filter(e => e.name).map(e => e.name),
               zelfde: new URL(f.action).origin === location.origin, sandbox: k.hasAttribute('sandbox') && k.getAttribute('sandbox') === '',
               email: document.getElementById('cloudEmail').autocomplete, pw: document.getElementById('cloudWachtwoord').autocomplete };
    });
    check(naam + ': het formulier verstuurt naar leeg.html van de app zelf (niet about:blank), velden zonder name, kader met sandbox',
      /\/leeg\.html$/.test(vorm.actie) && vorm.zelfde && vorm.methode === 'get' && !vorm.namen.length && vorm.sandbox &&
      vorm.email === 'username' && vorm.pw === 'current-password', JSON.stringify(vorm));
    S.app.length = 0;
    await pg.fill('#cloudEmail', 'julian@jelierbouw.nl');
    await pg.fill('#cloudWachtwoord', 'fout-ww');
    await pg.press('#cloudWachtwoord', 'Enter');
    await wachtTot(async () => /mislukt/.test((await kenmerk(pg)).loginFout), 5000);
    await wacht(400);
    st = await kenmerk(pg);
    check(naam + ': fout wachtwoord → "Inloggen mislukt", en de browser hoort niets',
      /Inloggen mislukt/.test(st.loginFout) && !st.bewaard.length && !st.verstuurd.some(v => v.echt) && !ctx.__kader.length,
      JSON.stringify([st.loginFout, st.bewaard, st.verstuurd, ctx.__kader]));
    await pg.fill('#cloudWachtwoord', 'geheim-oud');
    await pg.click('#cloudLoginKnop');
    await wachtTot(async () => !(await zichtbaar(pg, '#cloudLogin')), 6000);
    await wacht(800);
    st = await kenmerk(pg);
    if (soort === 'mac') {
      const echt = st.verstuurd.filter(v => v.echt);
      check(naam + ': direct na de inlog één echte verzending, naar het verborgen kader, naar leeg.html',
        echt.length === 1 && echt[0].doel === 'cloudLoginKader' && /\/leeg\.html$/.test(echt[0].actie), JSON.stringify(st.verstuurd));
      const kaderAdres = ctx.__kader.join(' ');
      const naarApp = S.app.filter(u => /leeg\.html/.test(u));
      check(naam + ': in wat er verstuurd wordt staat geen e-mail en geen wachtwoord (kader: ' + (ctx.__kader[0] || '-') + ')',
        ctx.__kader.length === 1 && !/julian|geheim|password|username|%40/i.test(kaderAdres) &&
        naarApp.length === 1 && !/[?&][^=]+=/.test(naarApp[0]), JSON.stringify([ctx.__kader, naarApp]));
      const inKader = await pg.evaluate(() => {
        try { const d = document.getElementById('cloudLoginKader').contentDocument; return d ? 'leesbaar:' + d.title : 'afgeschermd'; }
        catch (e) { return 'afgeschermd'; }
      });
      check(naam + ': het kader is afgeschermd (sandbox: er draait daar geen code, ook niet van de app)', inKader === 'afgeschermd', inKader);
    } else {
      check(naam + ': de browser krijgt het direct aangeboden (credentials.store, julian@…), het formulier gaat niet echt',
        st.bewaard.length === 1 && st.bewaard[0].id === 'julian@jelierbouw.nl' && st.bewaard[0].pw === 'geheim-oud' &&
        !st.verstuurd.some(v => v.echt) && !ctx.__kader.length, JSON.stringify([st.bewaard, st.verstuurd]));
    }
    check(naam + ': het wachtwoord ging alleen naar Supabase (inlog), nergens anders heen',
      metToken('geheim-oud').every(l => l.pad === '/auth/v1/token') && !S.app.some(u => /geheim/.test(u)),
      JSON.stringify(metToken('geheim-oud').map(l => l.pad)));
    check(naam + ': de pagina zelf bleef staan', st.merk === 'zelfde pagina');
    await wacht(1200);
    check(naam + ': daarna staat het wachtwoord niet meer in het veld', await pg.inputValue('#cloudWachtwoord') === '');
    await ctx.close();
  }
  }

  if (doe('3')) {
  /* ══ 3 ════════════════════════════════════════════════════════ */
  console.log('\n3. Bart opent de herstellink op zijn iPhone: "Kies een nieuw wachtwoord"');
  resetS();
  ctx = await apparaat('iphone', Object.assign({}, devices['iPhone 13'], { userAgent: UA.iphone }));
  pg = await pagina(ctx);
  // Werk dat nog omhoog moet (van een eerdere sessie op dit apparaat): blijft staan.
  await pg.goto(adres.replace('index.html', 'leeg.html'));
  await pg.evaluate(w => { for (const k in w) localStorage.setItem(k, w[k]); }, WACHTEND);
  S.log.length = 0;
  const link3 = herstelAdres(adres, BART.email);
  await pg.goto(link3);
  const kwam = await wachtTot(() => herstelKlaar(pg), 8000);
  await wacht(800);
  const v3 = await pg.evaluate(() => ({ email: document.getElementById('cloudHerstelEmail').value,
    ro: document.getElementById('cloudHerstelEmail').readOnly, adres: location.href,
    login: getComputedStyle(document.getElementById('cloudLogin')).display,
    start: document.body.classList.contains('op-start'),
    ac: [document.getElementById('cloudHerstelNieuw').autocomplete, document.getElementById('cloudHerstelNogEens').autocomplete],
    focus: document.activeElement && document.activeElement.id }));
  check('het venster "Kies een nieuw wachtwoord" staat er, met bart@jelierbouw.nl (alleen lezen)',
    kwam && v3.email === 'bart@jelierbouw.nl' && v3.ro, JSON.stringify(v3));
  check('de herstelcode staat niet meer in het adres (niet te delen; terug-knop: §8)',
    !/access_token|type=recovery/.test(v3.adres), v3.adres);
  check('geen inlogscherm en (nog) geen startscherm; de projecten zijn nog niet opgehaald',
    v3.login === 'none' && !v3.start && !S.log.some(l => /\/rest\/v1\/projecten/.test(l.pad)),
    JSON.stringify([v3.login, v3.start, S.log.map(l => l.pad)]));
  check('de velden voor het nieuwe wachtwoord heten "new-password" (dan biedt de browser aan het NIEUWE te bewaren)',
    v3.ac[0] === 'new-password' && v3.ac[1] === 'new-password', JSON.stringify(v3.ac));
  if (plaatjes) await pg.screenshot({ path: path.join(plaatjes, 'v109-herstel-iphone.png') });
  async function probeer(a, b) {
    await pg.fill('#cloudHerstelNieuw', a);
    await pg.fill('#cloudHerstelNogEens', b);
    await pg.tap('#cloudHerstelKnop');
    await wacht(700);
    return (await kenmerk(pg)).fout;
  }
  check('zolang het venster openstaat, is het werk op het apparaat onaangeroerd (kopie, vlag, apart te bewaren)',
    await wachtendGelijk(pg), JSON.stringify(await pg.evaluate(() => Object.keys(localStorage))));
  const putten = () => S.log.filter(l => l.pad === '/auth/v1/user' && l.methode === 'PUT');
  f3 = await probeer('kort1', 'kort1');
  check('te kort (5 tekens) → "minstens 8 tekens", niets naar Supabase', /minstens 8 tekens/.test(f3) && !putten().length, f3);
  f3 = await probeer('nieuw-wachtwoord-1', 'nieuw-wachtwoord-2');
  check('twee keer anders getypt → "niet gelijk", niets naar Supabase', /niet gelijk/.test(f3) && !putten().length, f3);
  check('het venster blijft staan na een fout', await zichtbaar(pg, '#cloudHerstel'));
  // Geen bereik net op het moment van opslaan.
  S.weg = true;
  f3 = await probeer('Bart-Nieuw-2026', 'Bart-Nieuw-2026');
  await wachtTot(async () => !/Bezig/.test((await kenmerk(pg)).fout), 15000);
  f3 = (await kenmerk(pg)).fout;
  check('geen bereik → "Geen verbinding…", het venster blijft, het wachtwoord is NIET gewijzigd',
    /Geen verbinding/.test(f3) && await zichtbaar(pg, '#cloudHerstel') && S.wachtwoord[BART.email] === 'bart-oud-1', f3);
  st = await kenmerk(pg);
  check('…en de browser kreeg niets aangeboden', !st.verstuurd.some(v => v.echt) && !ctx.__kader.length, JSON.stringify(st.verstuurd));
  S.weg = false;
  f3 = await probeer('Bart-Nieuw-2026', 'Bart-Nieuw-2026');
  await wachtTot(async () => !(await zichtbaar(pg, '#cloudHerstel')), 6000);
  await wacht(800);
  ml = (await meldingen(pg)).join(' | ');
  st = await kenmerk(pg);
  check('bereik terug, nog eens ‹Wachtwoord opslaan› → opgeslagen bij Supabase, venster weg, melding "Wachtwoord opgeslagen"',
    S.wachtwoord[BART.email] === 'Bart-Nieuw-2026' && !(await zichtbaar(pg, '#cloudHerstel')) && /Wachtwoord opgeslagen/.test(ml),
    JSON.stringify([S.wachtwoord[BART.email], ml]));
  const echt3 = st.verstuurd.filter(v => v.echt);
  check('de browser hoort het nieuwe wachtwoord (Safari: verzending van dit formulier naar leeg.html, zonder gegevens)',
    echt3.length === 1 && echt3[0].form === 'cloudHerstelForm' && ctx.__kader.length === 1 && !/Bart|Nieuw|bart%40|password/i.test(ctx.__kader[0]),
    JSON.stringify([st.verstuurd, ctx.__kader]));
  check('het nieuwe wachtwoord ging alleen naar Supabase (PUT /auth/v1/user)',
    metToken('Bart-Nieuw-2026').every(l => l.pad === '/auth/v1/user') && !S.app.some(u => /Nieuw/.test(u)));
  await sluitMelding(pg);
  await wachtTot(() => pg.evaluate(() => document.body.classList.contains('op-start')), 6000);
  check('daarna het gewone startscherm', await pg.evaluate(() => document.body.classList.contains('op-start')));
  // Na het startscherm gaat de app op de gewone manier met dat werk aan de
  // slag (omhoog of apart bewaren). Belofte: nooit weg. Dus: het staat nog op
  // het apparaat, óf het is naar de server gestuurd.
  await wacht(1500);
  const opApparaat = await pg.evaluate(() => [localStorage.getItem('glasopname_v2'), localStorage.getItem('glasopname_redding')]);
  const naarServer = S.log.filter(l => /\/rest\/v1\/projecten/.test(l.pad) && /POST|PATCH/.test(l.methode)).map(l => JSON.stringify(l.body));
  const kerkstraat = (opApparaat[0] || '').indexOf('Kerkstraat 1') >= 0 || naarServer.some(b => b.indexOf('Kerkstraat 1') >= 0);
  const dorpsweg = (opApparaat[1] || '').indexOf('Dorpsweg 3') >= 0 || naarServer.some(b => b.indexOf('Dorpsweg 3') >= 0);
  check('het werk dat op dit apparaat nog omhoog moest, is niet weg: nog op het apparaat of naar de server gestuurd',
    kerkstraat && dorpsweg, JSON.stringify([opApparaat.map(x => (x || '').slice(0, 60)), naarServer.map(b => b.slice(0, 80))]));
  await wacht(1200);
  check('de wachtwoordvelden zijn weer leeg', await pg.inputValue('#cloudHerstelNieuw') === '' && await pg.inputValue('#cloudHerstelNogEens') === '');
  await ctx.close();
  // En op een ander apparaat (Windows): inloggen met het nieuwe lukt, met het oude niet.
  ctx = await apparaat('win');
  pg = await pagina(ctx);
  await pg.goto(adres);
  await pg.waitForSelector('#cloudLogin', { state: 'visible', timeout: 10000 });
  await pg.fill('#cloudEmail', 'bart@jelierbouw.nl');
  await pg.fill('#cloudWachtwoord', 'bart-oud-1');
  await pg.press('#cloudWachtwoord', 'Enter');
  await wachtTot(async () => /mislukt/.test((await kenmerk(pg)).loginFout), 5000);
  const oudFout = /mislukt/.test((await kenmerk(pg)).loginFout);
  await pg.fill('#cloudWachtwoord', 'Bart-Nieuw-2026');
  await pg.press('#cloudWachtwoord', 'Enter');
  await wachtTot(async () => !(await zichtbaar(pg, '#cloudLogin')), 6000);
  check('op de Windows-pc: met het oude wachtwoord niet, met het nieuwe wel ingelogd',
    oudFout && !(await zichtbaar(pg, '#cloudLogin')));
  await ctx.close();
  }

  if (doe('4')) {
  /* ══ 4 ════════════════════════════════════════════════════════ */
  console.log('\n4. Een herstellink die al gebruikt of te oud is');
  resetS();
  ctx = await apparaat('mac');
  pg = await pagina(ctx);
  await pg.goto(adres + '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await wachtTot(async () => (await meldingen(pg)).length > 0, 8000);
  ml = (await meldingen(pg)).join(' | ');
  check('de melding: "werkt niet meer: al gebruikt of verlopen … Vraag julian om een nieuwe herstellink"',
    /werkt niet meer/.test(ml) && /al gebruikt of verlopen/.test(ml) && /Vraag julian om een nieuwe herstellink/.test(ml), ml);
  check('daaronder het gewone inlogscherm, geen venster "nieuw wachtwoord"',
    await zichtbaar(pg, '#cloudLogin') && !(await zichtbaar(pg, '#cloudHerstel')));
  check('de foutcode staat niet meer in het adres (herladen meldt het niet opnieuw)', !/error/.test(pg.url()), pg.url());
  if (plaatjes) await pg.screenshot({ path: path.join(plaatjes, 'v109-link-verlopen.png') });
  await sluitMelding(pg);
  await pg.reload();
  await pg.waitForSelector('#cloudLogin', { state: 'visible', timeout: 10000 });
  await wacht(800);
  check('na herladen: geen melding meer', !(await meldingen(pg)).length);
  await ctx.close();
  }

  if (doe('5')) {
  /* ══ 5 ════════════════════════════════════════════════════════ */
  console.log('\n5. Herladen terwijl het venster openstaat (bijv. door een nieuwe versie)');
  resetS();
  ctx = await apparaat('mac');
  pg = await pagina(ctx);
  await pg.goto(herstelAdres(adres, JULIAN.email));
  await wachtTot(() => herstelKlaar(pg), 8000);
  await pg.reload();
  await wacht(500);
  const terug = await wachtTot(() => herstelKlaar(pg), 8000);
  await wacht(500);
  check('na herladen staat het venster er weer (en niet het startscherm)',
    terug && !(await pg.evaluate(() => document.body.classList.contains('op-start'))) &&
    await pg.inputValue('#cloudHerstelEmail') === 'julian@jelierbouw.nl');
  await pg.fill('#cloudHerstelNieuw', 'Julian-Nieuw-9');
  await pg.fill('#cloudHerstelNogEens', 'Julian-Nieuw-9');
  await pg.press('#cloudHerstelNogEens', 'Enter');
  await wachtTot(async () => !(await zichtbaar(pg, '#cloudHerstel')), 6000);
  check('Enter in het tweede veld slaat op', S.wachtwoord[JULIAN.email] === 'Julian-Nieuw-9');
  await sluitMelding(pg);
  await pg.reload();
  await wacht(1500);
  check('daarna herladen: gewoon de app, geen venster meer', !(await zichtbaar(pg, '#cloudHerstel')) && !(await zichtbaar(pg, '#cloudLogin')));
  await ctx.close();
  }

  if (doe('6')) {
  /* ══ 6 ════════════════════════════════════════════════════════ */
  console.log('\n6. "Niet nu: uitloggen" (iemand opende de link per ongeluk)');
  resetS();
  ctx = await apparaat('mac');
  pg = await pagina(ctx);
  await pg.goto(adres.replace('index.html', 'leeg.html'));
  await pg.evaluate(w => { for (const k in w) localStorage.setItem(k, w[k]); }, WACHTEND);
  await pg.goto(herstelAdres(adres, JULIAN.email));
  await wachtTot(() => herstelKlaar(pg), 8000);
  S.weg = true;     // ook zonder bereik moet dit lukken
  await pg.click('#cloudHerstelUit');
  await wachtTot(() => zichtbaar(pg, '#cloudLogin'), 6000);
  st = await kenmerk(pg);
  check('ook zonder bereik: uitgelogd, inlogscherm met "Je wachtwoord is niet gewijzigd"',
    await zichtbaar(pg, '#cloudLogin') && /niet gewijzigd/.test(st.loginFout) && !(await zichtbaar(pg, '#cloudHerstel')), st.loginFout);
  check('het wachtwoord bij Supabase is niet veranderd', S.wachtwoord[JULIAN.email] === 'geheim-oud');
  check('het werk dat nog omhoog moest, staat er nog, onaangeroerd (kopie, vlag, apart te bewaren)', await wachtendGelijk(pg));
  S.weg = false;
  await pg.reload();
  await wacht(1500);
  check('na herladen: het inlogscherm, geen venster en niet stiekem nog ingelogd',
    await zichtbaar(pg, '#cloudLogin') && !(await zichtbaar(pg, '#cloudHerstel')));
  await ctx.close();
  }

  if (doe('8')) {
  /* ══ 8 ════════════════════════════════════════════════════════ */
  // Gevonden bij de controle van v109. Bart opent de link, sluit het tabblad
  // zonder iets te kiezen, en opent de app later opnieuw (nieuw tabblad; op
  // Android ook: de app op het beginscherm, die deelt opslag met Chrome).
  console.log('\n8. Tabblad dicht zonder nieuw wachtwoord, later de app opnieuw open; en de terug-knop');
  resetS();
  ctx = await apparaat('mac');
  pg = await pagina(ctx);
  await pg.goto(adres.replace('index.html', 'leeg.html'));
  await pg.goto(herstelAdres(adres, BART.email));
  await wachtTot(() => herstelKlaar(pg), 8000);
  await pg.goBack();
  await wacht(400);
  const terugAdres = pg.url();
  check('de terug-knop brengt de herstelcode niet terug in het adres (' + terugAdres.replace(/^https?:\/\/[^/]+/, '') + ')',
    !/access_token|refresh_token|type=recovery/.test(terugAdres), terugAdres);
  await pg.close();
  S.log.length = 0;
  pg = await pagina(ctx);
  await pg.goto(adres);
  const weer = await wachtTot(() => herstelKlaar(pg), 8000);
  await wacht(600);
  check('in een nieuw tabblad: weer het venster "Kies een nieuw wachtwoord" (niet stil in de app), projecten niet opgehaald',
    weer && await pg.inputValue('#cloudHerstelEmail') === 'bart@jelierbouw.nl' &&
    !S.log.some(l => /\/rest\/v1\/projecten/.test(l.pad)), JSON.stringify(S.log.map(l => l.pad)));
  await pg.fill('#cloudHerstelNieuw', 'Bart-Tabblad-7');
  await pg.fill('#cloudHerstelNogEens', 'Bart-Tabblad-7');
  await pg.click('#cloudHerstelKnop');
  await wachtTot(async () => !(await zichtbaar(pg, '#cloudHerstel')), 6000);
  check('…en daar opslaan werkt', S.wachtwoord[BART.email] === 'Bart-Tabblad-7');
  await sluitMelding(pg);
  const pg2 = await pagina(ctx);
  await pg2.goto(adres);
  await wacht(1500);
  check('daarna een nieuw tabblad: gewoon de app', !(await zichtbaar(pg2, '#cloudHerstel')) && !(await zichtbaar(pg2, '#cloudLogin')));
  await ctx.close();
  // Tweede controle v109: Bart opent de link, sluit het tabblad, en opent de
  // app pas na meer dan een uur, zonder bereik (de sessie is dan verlopen en
  // kan niet ververst worden: de app ziet even "geen sessie"). Daarna met
  // bereik: het venster moet er nog steeds komen.
  resetS();
  ctx = await apparaat('mac');
  pg = await pagina(ctx);
  await pg.goto(herstelAdres(adres, BART.email));
  await wachtTot(() => herstelKlaar(pg), 8000);
  await pg.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (!/auth-token/.test(k)) continue;
      const s = JSON.parse(localStorage.getItem(k)); s.expires_at = Math.floor(Date.now() / 1000) - 60;
      localStorage.setItem(k, JSON.stringify(s));
    }
  });
  await pg.close();
  S.weg = true;
  pg = await pagina(ctx);
  await pg.goto(adres);
  // De bibliotheek probeert het verversen een tijdje opnieuw (tot ±30 s).
  await wachtTot(() => zichtbaar(pg, '#cloudLogin'), 45000);
  check('een uur later, zonder bereik: het inlogscherm (de sessie kan niet ververst worden); de vlag blijft staan',
    await zichtbaar(pg, '#cloudLogin') && !!(await pg.evaluate(() => localStorage.getItem('glasopname_herstel'))));
  S.weg = false;
  await pg.reload();
  const nogSteeds = await wachtTot(() => herstelKlaar(pg), 10000);
  await wacht(500);
  check('daarna met bereik: weer het venster "Kies een nieuw wachtwoord" (niet stil in de app)',
    nogSteeds && await pg.inputValue('#cloudHerstelEmail') === 'bart@jelierbouw.nl' &&
    !(await pg.evaluate(() => document.body.classList.contains('op-start'))));
  await ctx.close();
  }

  if (doe('9')) {
  /* ══ 9 ════════════════════════════════════════════════════════ */
  // Gevonden bij de controle: Supabase slaat het nieuwe wachtwoord op, maar
  // het antwoord komt niet aan (bereik valt net weg).
  console.log('\n9. Supabase sloeg het nieuwe wachtwoord op, maar het antwoord kwam niet aan');
  resetS();
  ctx = await apparaat('iphone', Object.assign({}, devices['iPhone 13'], { userAgent: UA.iphone }));
  pg = await pagina(ctx);
  await pg.goto(herstelAdres(adres, BART.email));
  await wachtTot(() => herstelKlaar(pg), 8000);
  S.slik = true;
  await pg.fill('#cloudHerstelNieuw', 'Bart-Zonder-Antwoord');
  await pg.fill('#cloudHerstelNogEens', 'Bart-Zonder-Antwoord');
  await pg.tap('#cloudHerstelKnop');
  await wachtTot(async () => /Geen verbinding/.test((await kenmerk(pg)).fout), 15000);
  check('de app zegt "Geen verbinding" (hij weet het niet), terwijl Supabase het al heeft',
    /Geen verbinding/.test((await kenmerk(pg)).fout) && S.wachtwoord[BART.email] === 'Bart-Zonder-Antwoord');
  S.slik = false; S.weg = false;
  await pg.tap('#cloudHerstelKnop');
  await wachtTot(async () => !(await zichtbaar(pg, '#cloudHerstel')), 6000);
  ml = (await meldingen(pg)).join(' | ');
  check('nog eens hetzelfde → Supabase zegt "dat is je oude"; de app begrijpt dat het al gelukt is: "Wachtwoord opgeslagen"',
    !(await zichtbaar(pg, '#cloudHerstel')) && /Wachtwoord opgeslagen/.test(ml), JSON.stringify([(await kenmerk(pg)).fout, ml]));
  await ctx.close();
  // En als hij na zo'n twijfelgeval kiest voor "Niet nu".
  resetS();
  ctx = await apparaat('mac');
  pg = await pagina(ctx);
  await pg.goto(herstelAdres(adres, BART.email));
  await wachtTot(() => herstelKlaar(pg), 8000);
  S.slik = true;
  await pg.fill('#cloudHerstelNieuw', 'Bart-Twijfel-1');
  await pg.fill('#cloudHerstelNogEens', 'Bart-Twijfel-1');
  await pg.click('#cloudHerstelKnop');
  await wachtTot(async () => /Geen verbinding/.test((await kenmerk(pg)).fout), 15000);
  S.slik = false; S.weg = false;
  await pg.click('#cloudHerstelUit');
  await wachtTot(() => zichtbaar(pg, '#cloudLogin'), 6000);
  st = await kenmerk(pg);
  check('daarna "Niet nu": de app zegt niet "niet gewijzigd", maar dat de poging misschien aankwam',
    /misschien toch aan/.test(st.loginFout) && !/niet gewijzigd/.test(st.loginFout), st.loginFout);
  await ctx.close();

  // Typt hij gewoon zijn oude wachtwoord (hij wist het toch nog): dat is dan
  // zijn wachtwoord; geen foutmelding, gewoon verder.
  resetS();
  ctx = await apparaat('mac');
  pg = await pagina(ctx);
  await pg.goto(herstelAdres(adres, BART.email));
  await wachtTot(() => herstelKlaar(pg), 8000);
  await pg.fill('#cloudHerstelNieuw', 'bart-oud-1');
  await pg.fill('#cloudHerstelNogEens', 'bart-oud-1');
  await pg.click('#cloudHerstelKnop');
  await wachtTot(async () => !(await zichtbaar(pg, '#cloudHerstel')), 6000);
  check('zijn oude wachtwoord nog eens kiezen: geen fout, verder (dat is gewoon zijn wachtwoord)',
    !(await zichtbaar(pg, '#cloudHerstel')) && S.wachtwoord[BART.email] === 'bart-oud-1');
  await ctx.close();
  }

  if (doe('10')) {
  /* ══ 10 ═══════════════════════════════════════════════════════ */
  // Gevonden bij de controle: op de iPad is Julian al ingelogd; Bart opent
  // daar zijn herstellink, en het bereik valt net weg.
  console.log('\n10. Julian is al ingelogd, Bart opent zijn herstellink zonder bereik');
  for (const keuze of ['Stoppen', 'Opnieuw proberen']) {
    resetS();
    ctx = await apparaat('mac');
    pg = await pagina(ctx);
    await pg.goto(adres);
    await pg.waitForSelector('#cloudLogin', { state: 'visible', timeout: 10000 });
    await pg.fill('#cloudEmail', 'julian@jelierbouw.nl');
    await pg.fill('#cloudWachtwoord', 'geheim-oud');
    await pg.press('#cloudWachtwoord', 'Enter');
    await wachtTot(async () => !(await zichtbaar(pg, '#cloudLogin')), 6000);
    S.weg = true;
    // De link uit de mail opent een nieuwe pagina (niet alleen een ander #-deel).
    await pg.goto('about:blank');
    await pg.goto(herstelAdres(adres, BART.email));
    const v = await wachtTot(async () => /geen verbinding/i.test((await meldingen(pg)).join(' ')), 15000);
    check(keuze + ': de vraag "geen verbinding … Opnieuw proberen", en GEEN venster met het adres van Julian',
      v && !(await zichtbaar(pg, '#cloudHerstel')), JSON.stringify(await meldingen(pg)));
    check(keuze + ': de herstelcode staat al niet meer in het adres', !/access_token/.test(pg.url()), pg.url());
    S.weg = false;
    await pg.locator('.melding-laag').last().locator('.melding-knoppen button', { hasText: keuze }).click();
    if (keuze === 'Stoppen') {
      await wacht(2000);
      check('Stoppen: de app gaat verder voor Julian, zonder venster; Julians wachtwoord ongewijzigd',
        !(await zichtbaar(pg, '#cloudHerstel')) && S.wachtwoord[JULIAN.email] === 'geheim-oud' &&
        await pg.evaluate(() => !localStorage.getItem('glasopname_herstel')));
    } else {
      const ok = await wachtTot(async () => await zichtbaar(pg, '#cloudHerstel') &&
        await pg.inputValue('#cloudHerstelEmail') === 'bart@jelierbouw.nl', 15000);
      check('Opnieuw proberen (met bereik): het venster, voor Bart', ok && await pg.inputValue('#cloudHerstelEmail') === 'bart@jelierbouw.nl',
        JSON.stringify([await pg.inputValue('#cloudHerstelEmail'), await meldingen(pg), await pg.evaluate(() =>
          [getComputedStyle(document.getElementById('cloudHerstel')).display, document.getElementById('cloudHerstelFout').textContent,
           getComputedStyle(document.getElementById('cloudLogin')).display, document.body.className])]));
    }
    await ctx.close();
  }
  // Een ongeldige link (Supabase kent hem niet: 401) terwijl Julian ingelogd is.
  resetS();
  ctx = await apparaat('mac');
  pg = await pagina(ctx);
  await pg.goto(adres);
  await pg.waitForSelector('#cloudLogin', { state: 'visible', timeout: 10000 });
  await pg.fill('#cloudEmail', 'julian@jelierbouw.nl');
  await pg.fill('#cloudWachtwoord', 'geheim-oud');
  await pg.press('#cloudWachtwoord', 'Enter');
  await wachtTot(async () => !(await zichtbaar(pg, '#cloudLogin')), 6000);
  const ongeldig = herstelAdres(adres, BART.email);
  S.tokens = Object.fromEntries(Object.entries(S.tokens).filter(([k, v]) => v !== BART.email));   // Supabase kent hem niet (meer)
  await pg.goto('about:blank');
  await pg.goto(ongeldig);
  await wachtTot(async () => (await meldingen(pg)).length > 0, 10000);
  ml = (await meldingen(pg)).join(' | ');
  check('ongeldige link (401) terwijl Julian ingelogd is: "werkt niet meer", geen venster, Julian werkt gewoon verder',
    /werkt niet meer/.test(ml) && !(await zichtbaar(pg, '#cloudHerstel')) && S.wachtwoord[JULIAN.email] === 'geheim-oud' &&
    await pg.evaluate(() => !localStorage.getItem('glasopname_herstel')), ml);
  await sluitMelding(pg);
  await wachtTot(() => pg.evaluate(() => document.body.classList.contains('op-start')), 6000);
  check('…en daarna gewoon zijn startscherm', await pg.evaluate(() => document.body.classList.contains('op-start')));
  await ctx.close();
  }

  if (doe('12')) {
  /* ══ 12 ═══════════════════════════════════════════════════════ */
  // Tweede controle v109: een verbinding die blijft hangen (half bereik op de
  // bouwplaats), niet een die verbroken wordt.
  console.log('\n12. Een verbinding die blijft hangen (half bereik)');
  resetS();
  ctx = await apparaat('iphone', Object.assign({}, devices['iPhone 13'], { userAgent: UA.iphone }), 2500);
  pg = await pagina(ctx);
  S.hang['/auth/v1/user:GET'] = true;
  await pg.goto(herstelAdres(adres, BART.email));
  await wacht(800);
  const bezig = await pg.evaluate(() => ({ zicht: getComputedStyle(document.getElementById('cloudHerstel')).display,
    tekst: document.getElementById('cloudHerstelFout').textContent, email: document.getElementById('cloudHerstelEmail').value,
    knop: document.getElementById('cloudHerstelKnop').disabled, uit: document.getElementById('cloudHerstelUit').disabled }));
  check('tijdens het verwerken: het venster met "Herstellink verwerken…", nog zonder adres, knoppen uit',
    bezig.zicht === 'flex' && /verwerken/.test(bezig.tekst) && bezig.email === '' && bezig.knop && bezig.uit, JSON.stringify(bezig));
  const vraag = await wachtTot(async () => /geen verbinding/i.test((await meldingen(pg)).join(' ')), 10000);
  check('na de tijdsgrens: de vraag "geen verbinding … Opnieuw proberen"', vraag, JSON.stringify(await meldingen(pg)));
  S.hang = {};
  // Zoals een gebruiker doet: opnieuw proberen tot het lukt (de eerste,
  // hangende poging moet eerst opgeven; dat kan één extra keer vragen).
  let daarna = false;
  for (let i = 0; i < 4 && !daarna; i++) {
    if ((await meldingen(pg)).some(m => /geen verbinding/i.test(m))) {
      await pg.locator('.melding-laag').last().locator('.melding-knoppen button', { hasText: 'Opnieuw proberen' }).click();
    }
    daarna = await wachtTot(async () => await zichtbaar(pg, '#cloudHerstel') && await pg.inputValue('#cloudHerstelEmail') === 'bart@jelierbouw.nl', 5000);
  }
  check('Opnieuw proberen met bereik: het venster voor Bart, knoppen weer aan',
    daarna && !(await pg.evaluate(() => document.getElementById('cloudHerstelKnop').disabled)));
  await ctx.close();
  // Hij kiest ‹Stoppen›, maar de hangende poging lukt daarna toch (de sessie
  // staat dan op het apparaat): de volgende keer moet het venster komen, en
  // nu ook al als hij Stoppen kiest terwijl de sessie al gezet is.
  resetS();
  ctx = await apparaat('mac', {}, 2500);
  pg = await pagina(ctx);
  S.hang['/auth/v1/user:GET'] = true;
  S.hangDan = 'antwoord';          // na de wachttijd tóch een antwoord
  await pg.goto(herstelAdres(adres, BART.email));
  await wachtTot(async () => /geen verbinding/i.test((await meldingen(pg)).join(' ')), 10000);
  await wacht(5000);               // de hangende poging komt intussen toch binnen
  S.hang = {}; S.hangDan = null;
  await pg.locator('.melding-laag').last().locator('.melding-knoppen button', { hasText: 'Stoppen' }).click();
  await wacht(2500);
  const naStop = await pg.evaluate(() => ({ herstel: getComputedStyle(document.getElementById('cloudHerstel')).display,
    start: document.body.classList.contains('op-start'), email: document.getElementById('cloudHerstelEmail').value }));
  check('‹Stoppen›, terwijl de link op de achtergrond toch lukte: het venster (voor Bart), niet stil in de app',
    naStop.herstel === 'flex' && !naStop.start && naStop.email === 'bart@jelierbouw.nl', JSON.stringify(naStop));
  await ctx.close();
  ctx = await apparaat('iphone', Object.assign({}, devices['iPhone 13'], { userAgent: UA.iphone }), 2500);
  pg = await pagina(ctx);
  await pg.goto(herstelAdres(adres, BART.email));
  await wachtTot(() => herstelKlaar(pg), 8000);
  // "Niet nu" terwijl het uitloggen bij de server blijft hangen: na 4 s het
  // inlogscherm, maar de vlag blijft tot de sessie echt weg is. Sluit hij nu
  // het tabblad, dan komt het venster de volgende keer terug.
  S.hang['/auth/v1/logout:POST'] = true;
  await pg.tap('#cloudHerstelUit');
  await wachtTot(() => zichtbaar(pg, '#cloudLogin'), 8000);
  check('"Niet nu" met een hangende verbinding: na een paar seconden het inlogscherm',
    await zichtbaar(pg, '#cloudLogin') && !(await zichtbaar(pg, '#cloudHerstel')));
  await pg.close();
  S.hang = {};
  pg = await pagina(ctx);
  await pg.goto(adres);
  await wacht(1500);
  const welkeNu = await pg.evaluate(() => ({ herstel: getComputedStyle(document.getElementById('cloudHerstel')).display,
    login: getComputedStyle(document.getElementById('cloudLogin')).display, start: document.body.classList.contains('op-start') }));
  check('tabblad dicht vóór het uitloggen klaar was, later weer open: niet stil in de app (venster of inlogscherm)',
    !welkeNu.start && (welkeNu.herstel === 'flex' || welkeNu.login === 'flex'), JSON.stringify(welkeNu));
  await ctx.close();
  }

  if (doe('11')) {
  /* ══ 11 ═══════════════════════════════════════════════════════ */
  // Script 25. Belofte: na het script haalt de app de lijst Glasbewerking
  // weer uit de database (zodat een wijziging daar ook echt doorkomt);
  // zonder het script blijft hij zijn eigen lijst gebruiken. Getest met een
  // herkenbare extra optie in de lijst van de database.
  console.log('\n11. Script 25: daarna gebruikt de app de lijst Glasbewerking uit de database');
  const app43 = await (async () => {
    const t = fs.readFileSync(path.join(map, 'index.html'), 'utf8');
    const m = t.match(/const DATA\s*=\s*(\{.*\});/);
    return eval('(' + m[1] + ')').glasbewerking;
  })();
  const s12 = fs.readFileSync('12_roeden_en_canale.sql', 'utf8').match(/'\{glasbewerking\}', \$\$(\[.*?\])\$\$/)[1];
  const lijst42 = JSON.parse(s12);
  const ingelogdOp = async (lijst) => {
    resetS();
    S.appData = { glasbewerking: lijst };
    const c = await apparaat('mac');
    const pgx = await pagina(c);
    await pgx.goto(adres);
    await pgx.waitForSelector('#cloudLogin', { state: 'visible', timeout: 10000 });
    await pgx.fill('#cloudEmail', 'julian@jelierbouw.nl');
    await pgx.fill('#cloudWachtwoord', 'geheim-oud');
    await pgx.press('#cloudWachtwoord', 'Enter');
    await wachtTot(() => S.log.some(l => l.pad === '/rest/v1/app_data'), 8000);
    await wacht(1500);
    const g = await pgx.evaluate(() => DATA.glasbewerking.slice());
    await c.close();
    S.appData = null;
    return g;
  };
  g7 = await ingelogdOp(lijst42.concat(['Test — alleen in de database']));
  check('vóór script 25 (42 opties, zonder Canale mat blank): de app houdt zijn eigen lijst (43)',
    g7.length === 43 && g7.indexOf('Test — alleen in de database') < 0 && g7.indexOf('Figuurglas — Canale mat blank') >= 0, g7.length);
  const na25 = lijst42.slice(); na25.splice(4, 0, 'Figuurglas — Canale mat blank');
  check('de lijst die script 25 maakt, is precies die van de app', JSON.stringify(na25) === JSON.stringify(app43));
  g7 = await ingelogdOp(na25.concat(['Test — alleen in de database']));
  check('ná script 25: de app neemt de lijst uit de database over (ook een optie die alleen daar staat)',
    g7.indexOf('Test — alleen in de database') >= 0 && g7.indexOf('Figuurglas — Canale mat blank') === 4, JSON.stringify(g7.slice(0, 6)));
  }

  /* ══ ═══════════════════════════════════════════════════════════ */
  console.log('\nGeen fouten in de console');
  check('geen fouten in de console', !consoleFouten.length, consoleFouten.slice(0, 3).join(' | '));
  await browser.close();
  supa.close(); app.close();
  console.log(fouten ? '\n' + fouten + ' FOUT(EN).' : '\nAlles goed.');
  process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
