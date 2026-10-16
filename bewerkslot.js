/* ══════════════════════════════════════════════════════════════
   Bewerkslot (v106, keuze van Jan, 14 oktober 2026)

   Eén persoon tegelijk bewerkt een project; de rest kijkt mee.

   Waarom: de app slaat bij elke opslag het hele project op, en wie het
   laatst opslaat, wint. Een iPad die offline aan een project werkte, zette
   bij terugkomst een oudere stand terug over wat er intussen op kantoor
   gedaan was. Tegelijk bewerken is niet nodig, tegelijk kijken wel.

   Hoe:
   - Wie een project als eerste opent, krijgt het op zijn naam (tabel
     bewerkslot, 24_bewerkslot.sql). Dat blijft zo tot een ander het
     overneemt; ook als de app dicht gaat. Sluit iemand het project zelf
     (terug naar het startscherm, ander project), dan geeft hij het vrij.
   - Een ander ziet een balk "Bart heeft dit project open … Je kunt alleen
     kijken. [Toch bewerken]". Alles staat dan op slot, zoals bij een
     besteld project (invoerOpSlot in index.html).
   - "Toch bewerken": Bart krijgt een seintje met 10 seconden aftellen; zijn
     app slaat op, gaat op slot en geeft het project vrij. Pas daarna kan de
     ander bewerken. Reageert Bart niet (geen bereik, app dicht), dan kan
     de ander het overnemen.
   - De database weigert een opslag van een apparaat dat het project niet
     op zijn naam heeft, en werk dat voortbouwt op een oudere stand (het
     volgnummer, cloud.js basisRev). Een iPad die na uren zonder bereik
     terugkomt, kan dus niets overschrijven; zijn werk wordt apart bewaard
     (cloud.js apartEnLaden). Dat is het eigenlijke slot; deze file is het
     gemak eromheen.

   Het seintje komt live (Supabase realtime). Valt dat weg, dan merkt de
   app het bij de volgende hartslag (elke 20 seconden), of bij het
   terugkomen in de app.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var LS_APPARAAT = 'glasopname_apparaat';
  // Voor de tests kunnen deze korter (window.GLAS_* vóór het laden zetten).
  var HARTSLAG_MS = window.GLAS_HARTSLAG_MS || 20000;
  var AFTEL_S = window.GLAS_AFTEL_S || 10;
  // Wie langer dan dit geen hartslag gaf, heeft de app al lang dicht (of
  // geen bereik): dan meteen "reageert niet" in plaats van eerst aftellen.
  // Niet korter: een iPad waarvan alleen het scherm even uit ging (tussen
  // twee metingen), geeft ook geen hartslag (beoordeling v106).
  var ACTIEF_MS = window.GLAS_ACTIEF_MS || 15 * 60 * 1000;
  // Een vraag om over te nemen die ouder is dan dit, telt niet meer: wie
  // het vroeg, wacht allang niet meer (app dicht). Anders kreeg Julian de
  // volgende ochtend bij het openen een seintje van gisteren.
  var VRAAG_GELDIG_MS = HARTSLAG_MS + AFTEL_S * 1000 + 60000;
  // "nu actief": een hartslag in de laatste twee rondes. Daarna "laatst
  // actief 14:02" (beoordeling: anders stond een iPad die 14 minuten dicht
  // was nog als "nu actief").
  var NU_ACTIEF_MS = HARTSLAG_MS * 2 + 10000;

  var project = null;        // het project waar de stand bij hoort
  var stand = null;          // de laatste stand van de server
  var verschil = 0;          // klok van de server min die van dit apparaat
  var aanwezig = null;       // null = nog niet bekend; false = script 24 ontbreekt
  var modus = 'onbekend';    // 'bewerken' | 'kijken' | 'onbekend'
  var kanaal = null;
  var klok = null;
  var seintjeAf = null;      // overname_op van het seintje dat al behandeld wordt
  var wachten = null;        // lopende "Toch bewerken" van dit apparaat
  var krijgen = false;       // het project is van dit apparaat; de stand wordt nog geladen
  var losLaten = false;      // opgeslagen, het vrijgeven is onderweg

  /* ─── wie ben ik ─────────────────────────────────────────── */

  function willekeurig() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Een vaste code per apparaat (blijft na herstarten van de app). Twee
  // tabbladen op één apparaat delen hem.
  var apparaat = (function () {
    try {
      var a = localStorage.getItem(LS_APPARAAT);
      if (!a) { a = willekeurig(); localStorage.setItem(LS_APPARAAT, a); }
      return a;
    } catch (e) { return willekeurig(); }
  })();

  function soort() {
    var ua = navigator.userAgent || '';
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return 'Android';
    if (/Windows/.test(ua)) return 'Windows-pc';
    if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
    return 'computer';
  }

  function mijnNaam() {
    return (window.glasGebruiker ? (glasGebruiker() || {}).naam : '') || 'een collega';
  }

  // Meegestuurd bij elke opslag; de database kijkt hiernaar (24_bewerkslot.sql).
  window.glasBewerkslotVelden = function () {
    return { _apparaat: apparaat, _apparaatNaam: mijnNaam(), _apparaatSoort: soort() };
  };

  /* ─── de server ──────────────────────────────────────────── */

  function sb() { return window.glasSupabase || null; }

  function rpc(actie, pid) {
    var c = sb();
    pid = pid || project;
    if (!c || !c.rpc || !pid) return Promise.resolve(null);
    return Promise.resolve(c.rpc('glas_bewerken', {
      p_project: pid, p_apparaat: apparaat, p_naam: mijnNaam(), p_omschrijving: soort(), p_actie: actie
    })).then(function (r) {
      if (r && r.error) {
        var t = String((r.error.code || '') + ' ' + (r.error.message || ''));
        if (/PGRST202|42883|Could not find the function|does not exist/.test(t)) aanwezig = false;
        return null;
      }
      if (!r || !r.data) return null;
      aanwezig = true;
      return r.data;
    }, function () { return null; });
  }

  // Voor het startscherm (zoals script 23).
  window.glasScript24 = function () {
    if (aanwezig !== null) return Promise.resolve(aanwezig);
    var c = sb();
    if (!c || !c.rpc) return Promise.resolve(null);
    // Een project-id dat niet bestaat, mag: we willen alleen weten of de
    // functie er is. Een fout over de sleutel betekent: hij is er.
    return Promise.resolve(c.rpc('glas_bewerken', {
      p_project: '00000000-0000-4000-8000-000000000000', p_apparaat: apparaat,
      p_naam: '', p_omschrijving: '', p_actie: 'stand'
    })).then(function (r) {
      var t = String((r && r.error && ((r.error.code || '') + ' ' + (r.error.message || ''))) || '');
      if (/PGRST202|42883|Could not find the function/.test(t)) { aanwezig = false; return false; }
      return true;
    }, function () { return null; });
  };

  /* ─── de stand verwerken ─────────────────────────────────── */

  function nuServer() { return Date.now() + verschil; }

  function tijd(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return '';
    var t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    var vandaag = new Date();
    if (d.toDateString() === vandaag.toDateString()) return t;
    return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + t;
  }

  function actiefNu(s) {
    s = s || stand;
    if (!s || !s.gezien) return false;
    return nuServer() - Date.parse(s.gezien) < ACTIEF_MS;
  }

  function vanMij(s) { return !!(s && s.apparaat === apparaat); }

  // Staat er een verse vraag om over te nemen van een ánder apparaat?
  function vraagVanAnder(s) {
    return !!(s && s.overname_apparaat && s.overname_apparaat !== apparaat && s.overname_op &&
              nuServer() - Date.parse(s.overname_op) < VRAAG_GELDIG_MS);
  }

  // Heeft dezelfde gebruiker het project op een ánder apparaat (of in een
  // andere app op dit apparaat: Safari en de app op het beginscherm hebben
  // elk hun eigen opslag, dus hun eigen code)?
  function zelfElders(s) { s = s || stand || {}; return !!(s.naam && s.naam === mijnNaam()); }

  // Wie het nu heeft, in woorden: "bart (iPad)".
  function wie(s) {
    s = s || stand || {};
    return (s.naam || 'een collega') + (s.omschrijving ? ' (' + s.omschrijving + ')' : '');
  }

  function zetModus(m) {
    var oud = modus;
    modus = m;
    if (oud !== m && m === 'kijken' && window.glasKijkModusAan) glasKijkModusAan();
    if (window.slotToepassen) slotToepassen();
    if (window.renderTabel && oud !== m) renderTabel();
  }

  function verwerk(nieuw, bron) {
    if (!nieuw || !project) return;
    if (nieuw.project_id && nieuw.project_id !== project) return;
    if (nieuw.nu) verschil = Date.parse(nieuw.nu) - Date.now();
    var hadHet = modus === 'bewerken';
    stand = nieuw;

    if (vanMij(nieuw)) {
      // Net gekregen: eerst de stand van de server laden (gekregen()), dan
      // pas bewerken. Bezig met vrijgeven: dat niet terugdraaien.
      if (krijgen || losLaten) return;
      // Van mij, maar ik keek mee (bijvoorbeeld: laden lukte eerder niet):
      // ook dan eerst laden.
      if (modus === 'kijken') { gekregen(nieuw, null, true); return; }
      zetModus('bewerken');
      // Een seintje: iemand wil het overnemen.
      if (vraagVanAnder(nieuw) && seintjeAf !== nieuw.overname_op) {
        seintjeAf = nieuw.overname_op;
        toonSeintje(nieuw);
      } else if (!nieuw.overname_apparaat && seintje && !seintje.bezig) {
        // De ander koos Annuleren: gewoon verder werken.
        var naam = seintje.naam;
        sluitSeintje();
        if (window.glasToonMelding) glasToonMelding(naam + ' heeft het toch niet overgenomen. Je kunt gewoon verder.');
      }
      return;
    }
    // Wacht dit apparaat zelf op het project, en is het vrij? Dan nemen.
    if (wachten && !nieuw.apparaat) { wachten.vrij(); return; }

    if (hadHet && nieuw.apparaat) {
      // Overgenomen terwijl dit apparaat het had.
      sluitSeintje();
      zetModus('kijken');
      // Wie (en op welk apparaat) en wanneer, v107.
      var melding = wie(nieuw) + ' heeft dit project' +
        (nieuw.sinds ? ' om ' + tijd(nieuw.sinds) : '') + ' overgenomen.';
      if (window.glasNaOvername) glasNaOvername(melding);
      return;
    }
    if (!nieuw.apparaat) {
      // Dit apparaat bewerkte, en nu is het project vrij (een ander nam het
      // over en sloot het weer, terwijl hier geen bereik was). Gewoon weer
      // nemen en verder: de database beslist bij de volgende opslag op het
      // volgnummer. Heeft niemand intussen iets opgeslagen, dan gaat het
      // werk van hier er gewoon in; anders apart (v106, na de laatste
      // testronde: tot dan ging het hier altijd apart, ook als dat niet hoefde).
      if (hadHet && !vraagVanAnder(nieuw)) {
        rpc('claim').then(function (s) { if (s) verwerk(s, 'terug'); });
        return;
      }
      // Vrijgegeven door de ander (project gesloten): dan mag dit apparaat,
      // tenzij een collega er net om vroeg (die is eerst).
      if (bron !== 'start' && modus === 'kijken' && !vraagVanAnder(nieuw)) { claim(); return; }
    }
    zetModus(nieuw.apparaat ? 'kijken' : (aanwezig ? 'kijken' : 'onbekend'));
  }

  // Een vrijgekomen project nemen (wie meekeek). Eerst de stand laden, dan
  // pas bewerken: wat de vorige bewerker als laatste deed, moet op het
  // scherm staan vóór er iets overheen kan.
  function claim() {
    var wasKijken = modus === 'kijken';
    return rpc('claim').then(function (s) {
      if (!s) return null;
      if (vanMij(s) && wasKijken) gekregen(s, null, true);
      else verwerk(s, 'claim');
      return s;
    });
  }

  /* ─── starten en stoppen per project ─────────────────────── */

  // Door cloud.js aangeroepen zodra een project geopend is (en bij elke
  // nieuwe live verbinding; dan alleen de stand verversen).
  window.glasBewerkslotStart = function (pid) {
    if (!pid) return;
    if (project && project !== pid) stop(true);
    if (project === pid) { ververs(); return; }
    project = pid;
    stand = null;
    seintjeAf = null;
    krijgen = false;
    modus = 'onbekend';
    rpc('claim', pid).then(function (s) {
      if (project !== pid) return;
      if (!s) { zetModus(aanwezig === false ? 'onbekend' : modus); return; }
      verwerk(s, 'start');
    });
    luister(pid);
    clearInterval(klok);
    klok = setInterval(hartslag, HARTSLAG_MS);
  };

  function luister(pid) {
    var c = sb();
    if (!c || typeof c.channel !== 'function') return;
    try {
      if (kanaal) { try { c.removeChannel(kanaal); } catch (e) {} kanaal = null; }
      kanaal = c.channel('bewerkslot-' + pid)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bewerkslot', filter: 'project_id=eq.' + pid },
            function (b) { if (b && b.new) verwerk(b.new, 'live'); })
        .subscribe(function () {});
    } catch (e) { kanaal = null; }
  }

  function ververs() {
    if (!project || !navigator.onLine) return Promise.resolve(null);
    return rpc(modus === 'bewerken' ? 'hartslag' : 'stand').then(function (s) {
      if (s) verwerk(s, 'ververs');
      return s;
    });
  }

  function hartslag() {
    if (!project || document.visibilityState === 'hidden' || !navigator.onLine) return;
    ververs();
  }

  // Het project sluiten: vrijgeven als het van dit apparaat is. Lukt dat
  // niet (geen bereik), dan blijft het op deze naam staan; een ander kan
  // het dan overnemen.
  function stop(vrijgeven) {
    var pid = project;
    var hadHet = modus === 'bewerken';
    project = null;
    stand = null;
    modus = 'onbekend';
    krijgen = false;
    losLaten = false;
    clearInterval(klok);
    sluitSeintje();
    if (wachten) wachten.af();
    var c = sb();
    if (kanaal && c) { try { c.removeChannel(kanaal); } catch (e) {} kanaal = null; }
    if (vrijgeven && hadHet && pid) rpc('vrijgeven', pid);
    if (window.slotToepassen) slotToepassen();
  }
  window.glasBewerkslotStop = function () { stop(true); };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') ververs();
  });
  window.addEventListener('online', function () {
    if (!project) return;
    if (modus === 'onbekend') {
      var pid = project; project = null; window.glasBewerkslotStart(pid);
    } else ververs();
  });

  /* ─── wat de rest van de app wil weten ───────────────────── */

  // Alleen kijken: het project staat op naam van een ander apparaat.
  window.glasAlleenKijken = function () { return modus === 'kijken' && !!project; };

  window.glasBewerkslotTekst = function () {
    if (modus !== 'kijken' || !stand) return '';
    var actief = !!stand.gezien && nuServer() - Date.parse(stand.gezien) < NU_ACTIEF_MS;
    var wanneer = stand.gezien ? ' (' + (actief ? 'nu actief' : 'laatst actief ' + esc(tijd(stand.gezien))) + ')' : '';
    if (!stand.apparaat) return '<strong>Niemand bewerkt dit project nu.</strong> Even geduld…';
    if (zelfElders()) {
      return '<strong>Je hebt dit project open op een ander apparaat of in een andere app (' +
        esc(stand.omschrijving || 'onbekend') + ')</strong>' + wanneer + '. Hier kun je alleen kijken.';
    }
    return '<strong>' + esc(wie()) + ' heeft dit project open</strong>' + wanneer + '. Je kunt alleen kijken.';
  };

  window.glasBewerkslotStand = function () {
    return { modus: modus, stand: stand, apparaat: apparaat, aanwezig: aanwezig };
  };

  // De database weigerde een opslag (een ander heeft het project). cloud.js
  // bewaart het werk apart; hier alleen de stand bijwerken.
  window.glasBewerkslotGeweigerd = function () {
    if (modus === 'bewerken') modus = 'onbekend';
    return rpc('stand').then(function (s) {
      if (s) verwerk(s, 'geweigerd');
      return s;
    });
  };

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ─── vensters ───────────────────────────────────────────── */

  // Een venster met een aftellende balk. knoppen: [{ tekst, primair, klik }].
  // opties.escape: wat de Esc-toets doet (alleen bij wie het wil overnemen).
  // opties.focus: de knop (index) die de aandacht krijgt; zonder blijft de
  // aandacht waar hij was (de bewerker typt misschien nog).
  var teller = 0;
  function venster(kop, tekst, seconden, knoppen, opties) {
    opties = opties || {};
    var id = 'bs-tekst-' + (++teller);
    var laag = document.createElement('div');
    laag.className = 'melding-laag bewerkslot-laag';
    laag.innerHTML =
      '<div class="melding-venster" role="alertdialog" aria-modal="true" aria-label="' + esc(kop) +
        '" aria-describedby="' + id + '">' +
        '<h3>' + esc(kop) + '</h3>' +
        '<div class="melding-tekst" aria-live="assertive"><p class="bs-tekst" id="' + id + '"></p></div>' +
        (seconden ? '<div class="bs-aftel"><div class="bs-aftel-balk"><span></span></div>' +
          '<div class="bs-aftel-tekst"></div></div>' : '') +
        '<div class="melding-knoppen"></div>' +
      '</div>';
    laag.querySelector('.bs-tekst').textContent = tekst;
    var rij = laag.querySelector('.melding-knoppen');
    var v = { laag: laag, weg: false };
    v.knoppen = function (lijst, focus) {
      rij.innerHTML = '';
      lijst.forEach(function (k, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + (k.primair ? 'btn-primary' : 'btn-secondary');
        b.textContent = k.tekst;
        b.onclick = function () { k.klik(); };
        rij.appendChild(b);
        if (focus === i) setTimeout(function () { try { b.focus(); } catch (e) {} }, 0);
      });
    };
    v.tekst = function (t) { laag.querySelector('.bs-tekst').textContent = t; };
    v.sluit = function () {
      v.weg = true;
      clearInterval(v.klok);
      document.removeEventListener('keydown', toets, true);
      if (laag.parentNode) laag.parentNode.removeChild(laag);
    };
    function toets(e) {
      if (e.key === 'Escape' && opties.escape && !v.weg) { e.preventDefault(); opties.escape(); }
    }
    document.addEventListener('keydown', toets, true);
    // Aftellen. sprong: wat er moet gebeuren als de klok ineens veel verder
    // is dan bij de vorige tik. Dan lag de app stil (iOS legt een app op de
    // achtergrond of met het scherm uit stil, de tellers staan dan stil).
    // Niet blind doortellen en vrijgeven: eerst kijken hoe het nu staat.
    v.aftellen = function (s, klaar, sprong) {
      var balk = laag.querySelector('.bs-aftel-balk span');
      var tt = laag.querySelector('.bs-aftel-tekst');
      var aftel = laag.querySelector('.bs-aftel');
      if (!balk) { klaar(); return; }
      if (aftel) aftel.hidden = false;
      var eind = Date.now() + s * 1000;
      var vorige = Date.now();
      // De balk loopt in één vloeiende beweging leeg (CSS), de tekst per seconde.
      balk.style.transition = 'none';
      balk.style.width = '100%';
      void balk.offsetWidth;
      balk.style.transition = 'width ' + s + 's linear';
      balk.style.width = '0%';
      function tik() {
        var nu = Date.now();
        if (sprong && nu - vorige > 3000) { clearInterval(v.klok); if (!v.weg) sprong(); return; }
        vorige = nu;
        var rest = Math.max(0, Math.ceil((eind - nu) / 1000));
        tt.textContent = rest ? 'nog ' + rest + ' s' : '';
        if (rest <= 0) { clearInterval(v.klok); if (!v.weg) klaar(); }
      }
      clearInterval(v.klok);
      tik();
      v.klok = setInterval(tik, 250);
    };
    v.knoppen(knoppen || [], opties.focus);
    document.body.appendChild(laag);
    return v;
  }

  /* ─── bij de huidige bewerker: het seintje ───────────────── */

  var seintje = null;
  function sluitSeintje() {
    document.body.classList.remove('bs-achtergrond');
    if (seintje) { seintje.sluit(); seintje = null; }
  }

  // Staat er bij de bewerker al een vraag open (bijvoorbeeld "Naar de
  // leverancier?" na de bestellijst), dan eerst die laten afronden. Anders
  // ging het project op slot midden in "Ja, verstuurd", en werd een
  // verstuurde bestelling niet vastgelegd (beoordeling v106).
  function anderVenster() {
    return !!document.querySelector('.melding-laag:not(.bewerkslot-laag)') ||
      !!(window.glasExportBezig && glasExportBezig());
  }

  function toonSeintje(s) {
    sluitSeintje();
    var naam = s.overname_naam || 'Een collega';
    var v = venster(naam + ' wil dit project bewerken', '', AFTEL_S,
      [{ tekst: 'Nu vrijgeven', primair: true, klik: function () { geefVrij(v, naam); } }]);
    seintje = v;
    v.naam = naam;
    var aftel = v.laag.querySelector('.bs-aftel');
    // Meteen een hartslag: zo ziet de ander dat deze app het seintje
    // kreeg, en wacht hij tot het vrijgeven klaar is.
    rpc('hartslag');
    var dialoog = v.laag.querySelector('.melding-venster');
    function start() {
      if (v.weg) return;
      v.laag.classList.remove('bs-op-de-achtergrond');
      document.body.classList.remove('bs-achtergrond');
      dialoog.setAttribute('role', 'alertdialog');
      dialoog.setAttribute('aria-modal', 'true');
      v.knoppen([{ tekst: 'Nu vrijgeven', primair: true, klik: function () { geefVrij(v, naam); } }]);
      v.tekst('Je werk wordt opgeslagen en het project gaat over ' + AFTEL_S + ' seconden op slot. ' +
        'Daarna kun je meekijken; met ‹Toch bewerken› neem je het weer terug.');
      v.aftellen(AFTEL_S, function () { geefVrij(v, naam); }, function () {
        // De app lag stil. Eerst de stand ophalen: misschien koos de ander
        // allang Annuleren, of nam hij het al over.
        sluitSeintje();
        seintjeAf = null;
        ververs();
      });
    }
    if (!anderVenster()) { start(); return; }
    // Eerst afronden. Het seintje staat er wel (bovenaan, zonder de vraag
    // te bedekken), en de hartslag laat de ander weten dat we er zijn.
    // Zonder knop: een tik erop mag nooit op het venster eronder terechtkomen
    // (een tik naast een vraag telt daar als "Nee"). En voor een schermlezer
    // een melding, geen venster dat de aandacht vasthoudt.
    v.laag.classList.add('bs-op-de-achtergrond');
    document.body.classList.add('bs-achtergrond');
    v.knoppen([]);
    dialoog.setAttribute('role', 'status');
    dialoog.setAttribute('aria-modal', 'false');
    if (aftel) aftel.hidden = true;
    v.tekst('Rond eerst af waar je mee bezig bent; daarna gaat het project op slot.');
    // De echte hoogte van de balk (een lange naam kan op een smalle telefoon
    // drie regels geven): zoveel schuiven de andere vensters naar beneden.
    try { document.body.style.setProperty('--bs-balk', (dialoog.offsetHeight + 12) + 'px'); } catch (e) {}
    var wachtKlok = setInterval(function () {
      if (v.weg) { clearInterval(wachtKlok); return; }
      if (!anderVenster()) { clearInterval(wachtKlok); start(); return; }
      if (Date.now() - (v.laatsteSlag || 0) > 5000) { v.laatsteSlag = Date.now(); rpc('hartslag'); }
    }, 400);
  }

  // Eerst opslaan (en wachten tot de server het heeft), dan pas vrijgeven.
  // Zo krijgt de ander het project pas als alles van dit apparaat erin
  // staat. Lukt opslaan niet, dan niet vrijgeven: de ander kan het dan
  // overnemen, en wat hier nog openstond wordt apart bewaard.
  function geefVrij(v, naam) {
    if (v.weg && v !== seintje) return;
    if (v.bezig) return;
    v.bezig = true;
    v.knoppen([]);
    v.tekst('Je werk wordt opgeslagen…');
    // Het veld waarin nog getypt werd, eerst afsluiten: dan zit die laatste
    // invoer in wat er opgeslagen wordt.
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
    var opslaan = window.glasOpslaanEnWachten ? glasOpslaanEnWachten(8000) : Promise.resolve(true);
    opslaan.then(function (gelukt) {
      if (!gelukt) {
        v.sluit(); if (seintje === v) seintje = null;
        if (window.appMelding) {
          appMelding('Je werk kon niet opgeslagen worden (geen bereik). Het blijft op dit apparaat. ' +
            'Neemt ' + naam + ' het project over, dan wordt het hier apart bewaard, als apart project in de ' +
            'projectenlijst; er gaat niets verloren.',
            { kop: 'Nog niet vrijgegeven', soort: 'letop' });
        }
        return;
      }
      // Meteen op slot, zodat er tussen opslaan en vrijgeven niets meer bij
      // kan komen.
      losLaten = true;
      zetModus('kijken');
      return rpc('vrijgeven').then(function (s) {
        losLaten = false;
        v.sluit(); if (seintje === v) seintje = null;
        if (!s) {
          // Niet gelukt (verbinding weg). Dan is het nog van dit apparaat.
          zetModus('bewerken');
          if (window.appMelding) {
            appMelding('Je werk is opgeslagen, maar het project vrijgeven lukte niet (geen verbinding). ' +
              'Je kunt gewoon verder; ' + naam + ' kan het overnemen.', { kop: 'Nog niet vrijgegeven', soort: 'letop' });
          }
          return;
        }
        stand = s;
        if (window.glasToonMelding) glasToonMelding(naam + ' bewerkt dit project nu. Je kunt meekijken.');
      });
    });
  }

  /* ─── bij wie het wil overnemen: "Toch bewerken" ─────────── */

  window.bewerkslotTochBewerken = function () {
    if (!project || wachten) return;
    if (!navigator.onLine) {
      if (window.appFout) appFout('Overnemen kan alleen met bereik.', { kop: 'Toch bewerken' });
      return;
    }
    var pid = project;
    rpc('vraag').then(function (s) {
      if (!s || project !== pid) {
        if (window.appFout) appFout('Dat lukte niet (geen verbinding met de server). Probeer het zo nog eens.',
          { kop: 'Toch bewerken' });
        return;
      }
      if (s.nu) verschil = Date.parse(s.nu) - Date.now();
      if (vanMij(s)) { gekregen(s, null); return; }
      stand = s;
      overnemenWachten(s);
    });
  };

  function overnemenWachten(s) {
    var naam = s.naam || 'De collega';
    var pid = project;
    var klaar = false;
    var poll = null;
    var vraagOp = Date.parse(s.overname_op || s.nu || '') || nuServer();
    // Kreeg de app van de ander het seintje? Dat zien we aan een hartslag
    // ná de vraag. Zolang die hartslagen doorkomen (hij rondt nog iets af),
    // wachten we; daarna krijgen we het vanzelf.
    var gezienOp = 0;          // (eigen klok) eerste hartslag na de vraag
    var laatstGezien = '';     // de laatste 'gezien' van de server
    var laatstVers = 0;        // (eigen klok) wanneer die laatst veranderde
    var nietBereikt = false;
    var eigenFout = 0;         // mislukte vragen op rij: dan heb ik zelf geen bereik
    var v = venster('Project overnemen', '', AFTEL_S, [], { escape: annuleren });
    function annuleren() {
      if (klaar) return;
      klaar = true; einde();
      rpc('intrekken', pid);
    }
    wachten = {
      vrij: function () {
        if (klaar) return;
        rpc('claim').then(function (s2) {
          if (klaar || !s2) return;
          if (vanMij(s2)) { klaar = true; einde(); gekregen(s2, naam); }
        });
      },
      af: function () { if (!klaar) rpc('intrekken', pid); klaar = true; einde(); }
    };
    function einde() {
      clearInterval(poll);
      v.sluit();
      wachten = null;
    }
    function wachtTekst() {
      v.tekst(gezienOp && Date.now() - gezienOp > (AFTEL_S + 5) * 1000
        ? naam + ' heeft het seintje gekregen en rondt eerst iets af. Daarna krijg jij het project vanzelf.'
        : naam + ' krijgt een seintje. De app van ' + naam + ' slaat het werk op en gaat op slot; daarna kun jij bewerken.');
    }
    function reageertNiet() {
      nietBereikt = true;
      v.tekst((gezienOp
        ? naam + ' kreeg het seintje, maar gaf het project nog niet vrij (misschien staat er nog een vraag open, ' +
          'of lukte opslaan niet).'
        : naam + ' reageert niet' + (s.gezien ? ' (laatst actief ' + tijd(s.gezien) + ')' : '') +
          '. Misschien staat het scherm uit, is er geen bereik of is de app dicht.') +
        ' Neem je het over, dan gaat wat ' + naam + ' daarna nog doet niet in dit project, maar apart (als ' +
        'apart project in de lijst). Er gaat niets verloren.');
      var aftel = v.laag.querySelector('.bs-aftel');
      if (aftel) aftel.hidden = true;
      v.knoppen([
        { tekst: 'Annuleren', klik: annuleren },
        { tekst: 'Overnemen', primair: true, klik: function () {
          if (klaar) return;
          klaar = true;
          rpc('forceer', pid).then(function (s2) {
            einde();
            if (s2 && vanMij(s2)) gekregen(s2, naam);
            else if (window.appFout) appFout('Overnemen lukte niet (geen verbinding). Probeer het zo nog eens.',
              { kop: 'Toch bewerken' });
          });
        } }
      ], 0);
    }
    v.knoppen([{ tekst: 'Annuleren', klik: annuleren }], 0);
    // Elke seconde kijken, ook als het live bericht niet aankomt.
    poll = setInterval(function () {
      if (klaar) return;
      rpc('stand', pid).then(function (s2) {
        if (klaar) return;
        if (!s2) {
          // Zelf geen verbinding: dan niet zeggen dat de ander niet reageert.
          if (++eigenFout >= 3) {
            v.tekst('Je hebt zelf geen verbinding met de server. Zodra die terug is, gaat het verder.');
            var a = v.laag.querySelector('.bs-aftel');
            if (a) a.hidden = true;
            v.knoppen([{ tekst: 'Annuleren', klik: annuleren }]);
            nietBereikt = true;
          }
          return;
        }
        if (eigenFout >= 3) { eigenFout = 0; nietBereikt = false; wachtTekst(); setTimeout(naAftellen, 1000); }
        eigenFout = 0;
        if (!s2.apparaat || vanMij(s2)) { if (wachten) wachten.vrij(); return; }
        if (s2.gezien && s2.gezien !== laatstGezien) {
          laatstGezien = s2.gezien;
          if (Date.parse(s2.gezien) > vraagOp) {
            laatstVers = Date.now();
            var eerste = !gezienOp;
            if (eerste) gezienOp = Date.now();
            // Stond er al "reageert niet": toch nog bereikt (zonder live
            // verbinding komt het seintje pas bij zijn volgende hartslag).
            // Alleen bij de eerste keer; anders sprong het venster bij elke
            // hartslag heen en weer.
            if (nietBereikt && eerste) {
              nietBereikt = false;
              wachtTekst();
              v.knoppen([{ tekst: 'Annuleren', klik: annuleren }], 0);
              setTimeout(naAftellen, 1000);
            }
          }
        }
        if (!nietBereikt && gezienOp) wachtTekst();
      });
    }, 1000);
    // Na het aftellen: nog even de tijd voor het opslaan aan de andere
    // kant. Kreeg die het seintje, dan zolang zijn hartslag doorkomt (hij
    // rondt bijvoorbeeld "Naar de leverancier?" af), en anders tot zijn
    // aftellen voorbij moet zijn.
    function naAftellen() {
      if (klaar || nietBereikt) return;
      // (De bewerker die nog een vraag afrondt, geeft elke 5 s een hartslag.
      // Hooguit anderhalve minuut; daarna mag je het toch overnemen, want
      // misschien liep hij weg met de vraag nog open.)
      var nog = gezienOp && (Date.now() < gezienOp + (AFTEL_S + 10) * 1000 ||
                             (Date.now() - laatstVers < 12000 && Date.now() - gezienOp < 90000));
      if (nog) { setTimeout(naAftellen, 1000); return; }
      reageertNiet();
    }
    if (!actiefNu(s)) { reageertNiet(); return; }
    wachtTekst();
    v.aftellen(AFTEL_S, function () { setTimeout(naAftellen, 3000); });
  }

  // Het project is van dit apparaat. Eerst de laatste stand van de server
  // laden (daar zit het werk van de vorige bewerker in), dan pas bewerken.
  // Lukt laden niet, dan nog een paar keer proberen; daarna toch bewerken
  // (de database weigert werk op een oudere stand; dat gaat dan apart).
  // van = van wie het overgenomen is (null: het was vrij); dat komt in
  // het logboek.
  function gekregen(s, van, vanzelf, poging) {
    stand = s;
    krijgen = true;
    var herlaad = window.glasHerlaad ? glasHerlaad('') : Promise.resolve(true);
    Promise.resolve(herlaad).then(function (ok) {
      if (!krijgen || !vanMij(stand)) { krijgen = false; return; }
      if (ok === false && (poging || 0) < 4) {
        setTimeout(function () { if (krijgen) gekregen(stand, van, vanzelf, (poging || 0) + 1); }, 1500);
        return;
      }
      krijgen = false;
      if (ok === false) {
        // Laden lukt niet: niet bewerken op een stand die misschien oud is.
        // Het project blijft op deze naam; ‹Toch bewerken› probeert opnieuw.
        zetModus('kijken');
        if (window.appMelding) {
          appMelding('Het project is van jou, maar de laatste stand laden lukte niet (verbinding). Kies zo ' +
            '‹Toch bewerken› om het opnieuw te proberen.', { kop: 'Nog niet geladen', soort: 'letop' });
        }
        return;
      }
      zetModus('bewerken');
      if (van && window.glasProjectOvergenomen) glasProjectOvergenomen(van);
      if (window.glasToonMelding) {
        glasToonMelding(vanzelf ? 'Het project is vrijgegeven: je kunt het nu bewerken.' : 'Je kunt dit project nu bewerken.');
      }
      // Kwam er intussen een vraag van een ander binnen?
      verwerk(stand, 'gekregen');
    });
  }
})();
