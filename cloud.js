/* ═══════════════════════════════════════════════════════════════
   Glasopname – cloudlaag
   Voegt aan het bestaande formulier toe:
     • inloggen (e-mail + wachtwoord)
     • projecten opslaan in Supabase, gedeeld met het hele team
     • offline doorwerken: alles blijft lokaal staan en gaat
       vanzelf omhoog zodra er weer verbinding is
     • keuzelijsten (DATA) uit de database i.p.v. uit dit bestand
   Deze file gaat NA het hoofdscript in index.html.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var LS_STATE   = 'glasopname_v2';        // lokale kopie huidige opname
  var LS_PROJECT = 'glasopname_project';   // id van geopend project
  var LS_DATA    = 'glasopname_glasdata';  // gecachete keuzelijsten
  var LS_PENDING = 'glasopname_pending';   // wacht op verbinding (true/false)
  var LS_LAATST  = 'glasopname_laatst';    // laatst geopende project (voor het startscherm)

  var cfg      = window.GLASOPNAME_CONFIG || {};
  var sb       = null;
  var gebruiker = null;
  var projectId = localStorage.getItem(LS_PROJECT) || null;
  window.glasProjectId = projectId;
  var vuil      = false;   // er zijn wijzigingen die nog niet omhoog zijn
  var laatsteJson = null;  // stand zoals die het laatst is weggeschreven
  var bezig     = false;
  var origOpslaan   = window.opslaan;
  var origClearAlles = window.clearAlles;

  /* ─── kleine helpers ───────────────────────────────────────── */

  function el(id) { return document.getElementById(id); }
  function waarde(id) { var e = el(id); return e ? e.value : ''; }

  // Ruiten die naar een groep wijzen die niet (meer) bestaat weer losmaken.
  // index.html heeft dezelfde functie; deze is er zodat cloud.js ook in zijn
  // eentje klopt — de rem op het opslaan hangt ervan af (v85).
  // Supabase geeft soms een fout die vanzelf overgaat. De bekendste is
  // PGRST303 'JWT issued at future': de klok van de beveiligingsdienst die
  // de sleutel uitgeeft loopt een paar seconden voor op de klok van de
  // database die hem controleert. Dat gebeurt vooral met een vers
  // vernieuwde sleutel, dus precies bij het opstarten van de app. Een
  // seconde later werkt dezelfde sleutel gewoon (v86).
  // Eigen ontsnapping voor tekst in meldingen: index.html heeft esc(),
  // maar cloud.js hoort ook zonder dat bestand te kloppen.
  function veiligeTekst(t) {
    return String(t === undefined || t === null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function tijdelijkeFout(err) {
    if (!err) return false;
    var t = String((err.code || '') + ' ' + (err.message || '')).toLowerCase();
    return t.indexOf('pgrst303') >= 0 ||
           t.indexOf('issued at future') >= 0 ||
           t.indexOf('jwt expired') >= 0 ||
           (t.indexOf('jwt') >= 0 && t.indexOf('future') >= 0) ||
           t.indexOf('failed to fetch') >= 0 ||
           t.indexOf('load failed') >= 0 ||
           t.indexOf('networkerror') >= 0;
  }

  // Voert een verzoek uit en probeert het bij zo'n fout nog een paar keer,
  // met een beetje meer geduld per keer. De sleutel wordt er tussendoor
  // vernieuwd. bezigMelding krijgt te horen dat er nog gewacht wordt.
  function metHerkansing(maakVerzoek, klaar, bezigMelding, poging) {
    poging = poging || 0;
    var wachten = [1200, 3000, 5000];
    function nogEens(res) {
      if (poging >= wachten.length) { klaar(res); return; }
      try { if (sb && sb.auth && sb.auth.getSession) sb.auth.getSession(); } catch (e) {}
      if (bezigMelding) bezigMelding(poging + 1);
      setTimeout(function () {
        metHerkansing(maakVerzoek, klaar, bezigMelding, poging + 1);
      }, wachten[poging]);
    }
    var verzoek;
    try { verzoek = maakVerzoek(); } catch (e) { klaar({ error: { message: e.message } }); return; }
    Promise.resolve(verzoek).then(function (res) {
      if (res && res.error && tijdelijkeFout(res.error)) { nogEens(res); return; }
      klaar(res);
    }, function (e) {
      nogEens({ error: { message: (e && e.message) || 'geen verbinding' } });
    });
  }

  function losseVerweesde() {
    if (window.verweesdeRijenLosmaken) return verweesdeRijenLosmaken();
    if (typeof rijen === 'undefined' || typeof fotos === 'undefined') return 0;
    var heb = {};
    (fotos || []).forEach(function (f) { if (f) heb[f.id] = true; });
    var n = 0;
    (rijen || []).forEach(function (r) {
      if (r && r.fotoId && !heb[r.fotoId]) { delete r.fotoId; n++; }
    });
    return n;
  }

  function huidigeStaat() {
    return {
      rijen: rijen,
      volgendId: volgendId,
      fotos: fotos,
      info: projectInfo,
      taken: projectTaken,
      project: waarde('projectNaam'),
      datum: waarde('projectDatum'),
      speling: waarde('spelingGlobal'),
      bijtelling: waarde('bijtelling') || '11'
    };
  }

  function zetStaat(state) {
    rijen = state.rijen || [];
    // Projecten van vóór v63 dragen nog waarden uit de oude keuzelijst
    // Glasbewerking. Omzetten moet hier gebeuren en niet alleen bij het
    // laden van de lokale kopie, anders blijft elk project dat uit de
    // cloud komt op de oude waarden staan.
    if (window.bewerkingBijwerken) bewerkingBijwerken(rijen);
    volgendId = state.volgendId || (rijen.length + 1);
    fotos = state.fotos || [];
    projectInfo = state.info || {};
    vulOpnemer();
    projectTaken = state.taken || [];
    if (el('projectNaam'))   el('projectNaam').value   = state.project || '';
    if (el('projectDatum'))  el('projectDatum').value  = state.datum || '';
    // Altijd zetten, ook als het project ze niet bewaard heeft. Stond er
    // eerder een controle op state.speling, dan hield het formulier de
    // waarde van het vórige project en rekende de app dit project met een
    // andere speling door — zonder enige melding (v83).
    if (el('spelingGlobal')) el('spelingGlobal').value = state.speling || '4';
    if (el('bijtelling'))    el('bijtelling').value    = state.bijtelling || '11';
    // Ruiten die naar een groep wijzen die niet in dit project zit weer
    // losmaken; anders zijn ze nergens op het scherm te zien.
    if (true) {
      var losgemaakt = losseVerweesde();
      if (losgemaakt && window.appMelding) {
        appMelding(losgemaakt + (losgemaakt === 1 ? ' ruit hoorde' : ' ruiten hoorden') +
          ' bij een foto die niet in dit project staat. ' +
          (losgemaakt === 1 ? 'Hij staat' : 'Ze staan') + ' nu bij "Zonder foto of tekening".',
          { kop: 'Ruiten teruggezet', soort: 'letop' });
      }
    }
    if (rijen.length === 0) voegRijenToe(typeof START_REGELS !== 'undefined' ? START_REGELS : 5);
    renderTabel();
    herbereken();
    if (window.renderFotos) renderFotos();
    if (window.renderProject) renderProject();
    // Meldingen die bij de vórige inhoud hoorden opruimen.
    if (window.merkOpnieuwBeoordelen) merkOpnieuwBeoordelen();
    toonNaamWaarschuwing('');
    toonMelding('');
    onthoudRuiten();
  }

  // 'Opgenomen door' invullen met de naam waarmee je bent ingelogd: alles
  // vóór de @ uit het e-mailadres, dus jan@jelierbouw.nl wordt 'jan'.
  // Alleen als het veld nog leeg is — anders zou je de collega overschrijven
  // die de opname werkelijk gedaan heeft zodra jij zijn project opent.
  // Het veld blijft gewoon met de hand aan te passen.
  function gebruikersNaam() {
    if (!gebruiker || !gebruiker.email) return '';
    return String(gebruiker.email).split('@')[0].trim();
  }

  function vulOpnemer() {
    if (String(projectInfo.opnemer || '').trim()) return;
    var naam = gebruikersNaam();
    if (naam) projectInfo.opnemer = naam;
  }

  // 'Ingelogd als …' in de kopbalk. Handig op een gedeeld apparaat: je ziet
  // met wiens account je aan het inmeten bent zonder een menu te openen.
  function toonGebruiker() {
    var vak = el('ingelogdAls');
    if (!vak) return;
    var naam = gebruikersNaam();
    if (!naam) { vak.hidden = true; vak.innerHTML = ''; return; }
    vak.hidden = false;
    vak.innerHTML = 'Ingelogd als <b></b>';
    vak.querySelector('b').textContent = naam;
    vak.title = gebruiker.email;
  }

  // Wat de projectlijst moet tonen bewaren we apart, zodat die lijst niet
  // de volledige inhoud van elk project hoeft op te halen.
  function adresVan(state) {
    var i = (state && state.info) || {};
    var plaats = [i.postcode, i.plaats].filter(Boolean).join(' ').trim();
    return [i.straat, plaats].filter(Boolean).join(', ');
  }

  function openTaken(state) {
    var t = (state && state.taken) || [];
    return t.filter(function (x) { return !x.klaar; }).length;
  }

  function ingevuldeRijen(state) {
    return (state.rijen || []).filter(function (r) {
      return r.glasType || r.breedte || r.hoogte;
    }).length;
  }

  /* ─── statusbalkje rechtsboven ─────────────────────────────── */

  // Met een gekleurde achtergrond moet de tekst mee veranderen, anders
  // blijft het lichtgrijs op groen staan en is het onleesbaar.
  function status(tekst, kleur) {
    var s = el('cloudStatus');
    if (!s) return;
    s.textContent = tekst;
    if (kleur) {
      s.style.background = kleur;
      s.style.color = '#ffffff';
      s.style.borderColor = kleur;
      s.style.fontWeight = '600';
    } else {
      s.style.background = '';
      s.style.color = '';
      s.style.borderColor = '';
      s.style.fontWeight = '';
    }
  }

  function statusOpgeslagen() {
    var t = new Date();
    status('✓ Opgeslagen ' + String(t.getHours()).padStart(2, '0') + ':' +
           String(t.getMinutes()).padStart(2, '0'), '#1a6b3c');
  }

  /* ─── opslaan: lokaal altijd, cloud zodra het kan ──────────── */

  function opslaanLokaal() {
    try { localStorage.setItem(LS_STATE, JSON.stringify(huidigeStaat())); } catch (e) {}
  }

  // Heeft de gebruiker zelf iets gedaan sinds dit project openging? Zo
  // niet, dan is een verschil met de server niet 'onopgeslagen werk'
  // maar gewoon de app die zichzelf klaarzet — vijf lege regels
  // bijvoorbeeld. Zonder dit onderscheid stond de vlag 'nog niet
  // opgeslagen' al aan vóór je iets had ingevuld, en kreeg je bij het
  // openen van een project de melding dat je werk verloren ging (v87).
  var gebruikerDeedIets = false;
  ['input', 'change', 'keydown', 'pointerdown'].forEach(function (soort) {
    document.addEventListener(soort, function (e) {
      if (!projectId) return;
      // Alleen echte bewerkingen; scrollen of een tab openen telt niet.
      if (soort === 'pointerdown' || soort === 'keydown') {
        var t = e.target;
        if (!t || !t.matches || !t.matches('input, select, textarea, canvas, .inkt-laag, .foto-doek, .foto-mark')) return;
      }
      gebruikerDeedIets = true;
    }, true);
  });
  window.glasGebruikerDeedIets = function () { return gebruikerDeedIets; };
  window.glasMarkeerWerk = function () { if (projectId) gebruikerDeedIets = true; };

  window.opslaan = function () {
    // De app roept dit ook elke tien seconden vanzelf aan. Is er niets
    // veranderd, dan hoeft er niets te gebeuren: anders knippert het
    // statuspilletje elke tien seconden en verspringt de pagina.
    var nu = JSON.stringify(huidigeStaat());
    if (nu === laatsteJson && !vuil) return;
    laatsteJson = nu;
    opslaanLokaal();
    // Geen project open: er is niets om naartoe te sturen.
    if (!projectId) { localStorage.removeItem(LS_PENDING); return; }
    // Stand van de server nog niet binnen en de gebruiker heeft niets
    // gedaan: dit is de app die zichzelf klaarzet, geen werk.
    if (!geladen && !gebruikerDeedIets) return;
    vuil = true;
    localStorage.setItem(LS_PENDING, '1');
    plan();
  };

  window.clearAlles = function () {
    // Eerst de bevestiging afwachten. Zonder await werd er opgeslagen
    // vóórdat er gewist was, en kwam de oude opname bij de volgende start
    // gewoon weer terug (v83).
    return Promise.resolve(origClearAlles()).then(function (gewist) {
      if (gewist === false) return;
      window.opslaan();
    });
  };

  var timer = null;
  var wachtKlok = null;
  function plan() {
    clearTimeout(timer);
    timer = setTimeout(synchroniseer, 1200);
  }

  // Gaat er een stand omhoog waarin ruiten naar een foto wijzen die er
  // niet is, dan klopt de stand niet en zou het verzenden ervan de goede
  // gegevens in de database overschrijven. Dat is precies wat er in
  // september 2026 bij één project gebeurd is (v83).
  function standDeugt(state) {
    if (!state || !Array.isArray(state.rijen)) return false;
    var ids = {};
    (Array.isArray(state.fotos) ? state.fotos : []).forEach(function (f) { if (f) ids[f.id] = true; });
    return !state.rijen.some(function (r) { return r && r.fotoId && !ids[r.fotoId]; });
  }

  var standGemeld = false;
  // Zijn de nieuwe kolommen uit 13_taken_en_geschiedenis.sql er al? Zo
  // niet, dan slaan we ze over in plaats van te blijven falen (v87).
  var spoorKolommen = true;
  // Voor de test: staat op false zodra blijkt dat het SQL-script nog niet
  // gedraaid is.
  window.glasSpoorKolommen = function () { return spoorKolommen; };
  // Naar buiten voor test-herstel.js; verder gebruikt niemand dit.
  window.standDeugt = standDeugt;

  function synchroniseer() {
    if (!sb || !gebruiker || !projectId || !vuil || bezig) return;
    if (!navigator.onLine) { status('⚠ Offline — lokaal', '#a3231a'); return; }
    if (!standDeugt(huidigeStaat())) {
      status('⚠ Niet verstuurd — zie melding', '#a3231a');
      if (!standGemeld && window.appFout) {
        standGemeld = true;
        appFout('Er staan ruiten in deze opname die bij een foto horen die niet in het project zit. ' +
                'Om te voorkomen dat er werk overschreven wordt, is er niets naar de server gestuurd. ' +
                'Ververs de pagina (knop ↻ Bijwerken); de ruiten komen dan terug bij "Zonder foto of tekening".',
                { kop: 'Opname niet verstuurd' });
      }
      return;
    }
    standGemeld = false;
    bezig = true;
    // Een verzoek dat nooit antwoordt liet `bezig` voor altijd aan staan;
    // daarna werd er de hele dag niets meer opgeslagen, met "… Opslaan"
    // in beeld (v83). Na 30 seconden geven we het op en proberen opnieuw.
    clearTimeout(wachtKlok);
    wachtKlok = setTimeout(function () {
      if (!bezig) return;
      bezig = false;
      status('⚠ Niet opgeslagen — geen antwoord', '#a3231a');
      setTimeout(plan, 5000);
    }, 30000);
    status('… Opslaan');
    // Een vaste kopie van wat er nu omhoog gaat. huidigeStaat() geeft de
    // levende lijsten terug; typ je door terwijl het opslaan onderweg is,
    // dan veranderen die mee en klopt de vingerafdruk achteraf niet meer
    // met wat er werkelijk verstuurd is (v80 en eerder: valse melding
    // "een collega heeft dit project gewijzigd").
    statusBijwerken();
    var samenvatting = stempelWijzigingen();
    var json = JSON.stringify(huidigeStaat());
    var state = JSON.parse(json);
    state._sessie = SESSIE;
    // Vóór het versturen onthouden: het live bericht van de database kan
    // eerder binnen zijn dan het antwoord op de update.
    var afdruk = vingerafdruk(state);
    eigenSchrijfsels.push(afdruk);
    if (eigenSchrijfsels.length > 8) eigenSchrijfsels.shift();
    var velden = {
      naam: state.project || '(naamloos)',
      datum: state.datum || '',
      data: state,
      aantal_ruiten: ingevuldeRijen(state),
      adres: adresVan(state),
      open_taken: openTaken(state),
      status: (state.info && state.info.status) || 'aangemaakt',
      gewijzigd_door: gebruiker.id
    };
    if (spoorKolommen) {
      velden.gewijzigd_naam = gebruikersNaam();
      velden.samenvatting = samenvatting;
      // Vertelt de database of deze opslag bij dezelfde werkgang hoort als
      // de vorige; zo ja, dan werkt hij de laatste logboekregel bij in
      // plaats van er een nieuwe bij te zetten (v88).
      velden.spoor_vervolg = spoorVervolg;
    }
    sb.from('projecten').update(velden).eq('id', projectId).select('id').then(function (res) {
      bezig = false;
      clearTimeout(wachtKlok);
      // Een update die geen enkele rij raakt geeft géén fout. Zonder deze
      // controle bleef de app "✓ Opgeslagen" melden terwijl er niets
      // werd weggeschreven — bijvoorbeeld als een collega het project
      // intussen verwijderd had (v83).
      if (!res.error && Array.isArray(res.data) && res.data.length === 0) {
        var i2 = eigenSchrijfsels.lastIndexOf(afdruk);
        if (i2 >= 0) eigenSchrijfsels.splice(i2, 1);
        status('⚠ Niet opgeslagen — project weg?', '#a3231a');
        if (window.appFout) {
          appFout('Het opslaan kwam niet aan: dit project bestaat niet meer, of je mag er niet meer bij. ' +
                  'Je werk staat nog op dit apparaat. Maak een nieuw project aan en exporteer of kopieer ' +
                  'de maten daarheen voordat je de app sluit.',
                  { kop: 'Niet opgeslagen' });
        }
        return;
      }
      if (res.error) {
        var i = eigenSchrijfsels.lastIndexOf(afdruk);
        if (i >= 0) eigenSchrijfsels.splice(i, 1);
        // Kolom bestaat niet: het SQL-script van v87 is nog niet gedraaid.
        // Dan zonder die velden opslaan; het spoor komt vanzelf zodra het
        // script wel gedraaid is.
        var tekst = String(res.error.message || '') + ' ' + String(res.error.code || '');
        if (spoorKolommen && (/samenvatting|gewijzigd_naam/.test(tekst) || /42703/.test(tekst))) {
          console.warn('[cloud] kolommen voor het spoor ontbreken; sla ze over tot het SQL-script gedraaid is');
          spoorKolommen = false;
          vuil = true;
          plan();
          return;
        }
        if (res.error.code === '23505') {
          status('⚠ Naam al in gebruik', '#a3231a');
          toonNaamWaarschuwing('⚠ Deze projectnaam is al in gebruik. Kies een andere naam; ' +
                               'je metingen blijven zolang lokaal bewaard.');
        } else if (tijdelijkeFout(res.error)) {
          // Gaat vanzelf over; niet alarmeren, gewoon zo weer proberen.
          status('… Opnieuw proberen');
          try { if (sb.auth && sb.auth.getSession) sb.auth.getSession(); } catch (e2) {}
          setTimeout(plan, 2000);
          return;
        } else {
          status('⚠ Niet opgeslagen — ' + res.error.message, '#a3231a');
        }
        setTimeout(plan, 8000);
      } else if (JSON.stringify(huidigeStaat()) !== json) {
        // Tijdens het opslaan is er doorgetypt. Dat staat nog niet in de
        // database: open laten en meteen de volgende ronde plannen.
        vuil = true;
        localStorage.setItem(LS_PENDING, '1');
        plan();
      } else {
        vuil = false;
        localStorage.removeItem(LS_PENDING);
        statusOpgeslagen();
      }
    }, function (e) {
      // Netwerkfout zonder antwoord: niets is zeker weggeschreven.
      bezig = false;
      clearTimeout(wachtKlok);
      status('⚠ Niet opgeslagen — ' + ((e && e.message) || 'geen verbinding'), '#a3231a');
      setTimeout(plan, 8000);
    });
  }

  window.addEventListener('online', function () {
    herstelPoging = 0;
    if (!geladen) { herstelProbeer(); return; }
    if (!kanaalGezond()) luisterOpProject();
    if (vuil) synchroniseer(); else statusOpgeslagen();
  });
  window.addEventListener('offline', function () {
    status('⚠ Offline — lokaal', '#a3231a');
  });
  setInterval(function () { if (vuil) synchroniseer(); }, 20000);

  /* ─── live bijwerken ───────────────────────────────────────── */
  // Postgres bewaart JSON met zijn eigen volgorde van sleutels, dus twee
  // gelijke toestanden kunnen als tekst verschillen. Voor het vergelijken
  // zetten we alles eerst in een vaste volgorde.
  function diepCanon(x) {
    if (Array.isArray(x)) return '[' + x.map(diepCanon).join(',') + ']';
    if (x && typeof x === 'object') {
      // Sleutels met de waarde undefined overslaan: JSON (en dus de
      // database) laat ze weg, dus anders lijkt je eigen stand verschillend.
      return '{' + Object.keys(x).filter(function (k) { return x[k] !== undefined; })
        .sort().map(function (k) {
          return JSON.stringify(k) + ':' + diepCanon(x[k]);
        }).join(',') + '}';
    }
    return JSON.stringify(x === undefined ? null : x);
  }

  // Een project dat eerder is opgeslagen kan velden missen die de app nu
  // wél altijd meestuurt — 'taken' en 'info' bijvoorbeeld, of een getal
  // waar nu tekst staat. Zonder gelijktrekken van die vorm lijkt elke
  // vergelijking een verschil, en dat leest als 'een collega heeft iets
  // gewijzigd' terwijl er niets aan de hand is.
  function normaliseer(d) {
    d = d || {};
    return {
      rijen: Array.isArray(d.rijen) ? d.rijen : [],
      volgendId: d.volgendId || 1,
      fotos: Array.isArray(d.fotos) ? d.fotos : [],
      info: (d.info && typeof d.info === 'object') ? d.info : {},
      taken: Array.isArray(d.taken) ? d.taken : [],
      project: String(d.project === undefined ? '' : d.project),
      datum: String(d.datum === undefined ? '' : d.datum),
      speling: String(d.speling === undefined ? '4' : d.speling),
      bijtelling: String(d.bijtelling === undefined ? '11' : d.bijtelling)
    };
  }

  function vingerafdruk(d) { return diepCanon(normaliseer(d)); }

  /* ─── spoor: wie wijzigde welke ruit, en wanneer ─────────────── */
  // Niet op twintig plekken in de code bijhouden, maar één keer vlak
  // voor het opslaan: wat is er veranderd ten opzichte van de stand die
  // we het laatst naar de server stuurden? Zo telt elke weg mee —
  // typen, doorvoeren, importeren, kopiëren (v87).
  var VELDEN_BUITEN_SPOOR = {
    glasBreedte: 1, glasHoogte: 1, totaalDikte: 1, kgM2: 1,
    gewDoor: 1, gewOp: 1
  };
  var laatsteRuiten = {};     // id -> vingerafdruk van de ruit

  function ruitAfdruk(r) {
    var kopie = {};
    Object.keys(r || {}).forEach(function (k) {
      if (!VELDEN_BUITEN_SPOOR[k]) kopie[k] = r[k];
    });
    return diepCanon(kopie);
  }

  // Lege regels tellen niet mee: de app zet er zelf een paar klaar, en
  // het logboek moet niet vol lopen met 'vijf ruiten verwijderd' terwijl
  // er niets stond.
  function heeftInhoud(r) {
    return !!(r && (r.merk || r.breedte || r.hoogte || r.glasType || r.opmerking));
  }

  function onthoudRuiten() {
    laatsteRuiten = {};
    // Een net geopend project begint met een schone werkgang: wat je nu
    // doet hoort niet bij de regel van gisteren.
    werkgangMoment = 0;
    werkgangBijzonder = false;
    nieuweWerkgang();
    (typeof rijen === 'undefined' ? [] : rijen).forEach(function (r) {
      if (r && r.id != null && heeftInhoud(r)) laatsteRuiten[r.id] = ruitAfdruk(r);
    });
  }

  /* ─── het spoor per werkgang ──────────────────────────────── */
  // Tijdens het typen slaat de app elke paar seconden op. Zou elke opslag
  // een logboekregel geven, dan stond er binnen een uur niets bruikbaars
  // meer in. En zou de database binnen twee minuten alleen de eerste
  // bewaren (zo was het in v87), dan klopt het aantal niet: drie ruiten
  // één voor één weggooien gaf "1 ruit verwijderd".
  //
  // Daarom houdt de app bij wélke ruiten er in déze werkgang zijn
  // toegevoegd, gewijzigd en verwijderd, en vertelt hij de database of
  // dit nog dezelfde werkgang is. De regel in het logboek groeit dan mee
  // (v88).
  var WERKGANG_MS = 25 * 60 * 1000;    // ruim binnen het half uur van de trigger
  var werkgang = { nieuw: {}, gewijzigd: {}, weg: {} };
  var werkgangMoment = 0;
  var werkgangBijzonder = false;        // de laatste regel had een aantekening
  var spoorVervolg = false;
  window.glasSpoorVervolg = function () { return spoorVervolg; };

  function nieuweWerkgang() {
    werkgang = { nieuw: {}, gewijzigd: {}, weg: {} };
  }

  function aantal(vak) { return Object.keys(vak).length; }

  // Zet het stempel op gewijzigde ruiten en geeft een korte zin terug
  // over wat er in deze werkgang veranderd is, voor in het logboek.
  function stempelWijzigingen() {
    if (typeof rijen === 'undefined') return '';
    var naam = gebruikersNaam();
    var nu = new Date().toISOString();
    var gezien = {};

    // Hoort dit nog bij de vorige regel, of begint er een nieuwe?
    spoorVervolg = !!werkgangMoment && (Date.now() - werkgangMoment) < WERKGANG_MS &&
                   !werkgangBijzonder && !notities.length;
    if (!spoorVervolg) nieuweWerkgang();

    rijen.forEach(function (r) {
      if (!r || r.id == null) return;
      if (!heeftInhoud(r)) return;          // lege regel: geen wijziging
      gezien[r.id] = true;
      var afdruk = ruitAfdruk(r);
      var oud = laatsteRuiten[r.id];
      if (oud === afdruk) return;
      // Stond hij in deze werkgang als verwijderd? Dan is hij terug.
      delete werkgang.weg[r.id];
      if (oud === undefined) werkgang.nieuw[r.id] = 1;
      else if (!werkgang.nieuw[r.id]) werkgang.gewijzigd[r.id] = 1;
      r.gewDoor = naam;
      r.gewOp = nu;
      laatsteRuiten[r.id] = afdruk;
    });

    Object.keys(laatsteRuiten).forEach(function (id) {
      if (gezien[id]) return;
      delete laatsteRuiten[id];
      // In dezelfde werkgang toegevoegd én weer weggegooid: netto niets.
      if (werkgang.nieuw[id]) { delete werkgang.nieuw[id]; return; }
      delete werkgang.gewijzigd[id];
      werkgang.weg[id] = 1;
    });

    var nieuw = aantal(werkgang.nieuw);
    var gewijzigd = aantal(werkgang.gewijzigd);
    var weg = aantal(werkgang.weg);
    werkgangBijzonder = notities.length > 0;
    werkgangMoment = Date.now();

    var naBestelling = (nieuw || gewijzigd || weg) && naBestellingNu();
    var delen = [];
    // Losse aantekeningen voorop: "slot geopend", "bestelmail verstuurd".
    // Die zijn belangrijker dan het aantal ruiten erachter.
    if (notities.length) { delen = delen.concat(notities); notities = []; }
    if (nieuw) delen.push(nieuw + (nieuw === 1 ? ' ruit toegevoegd' : ' ruiten toegevoegd'));
    if (gewijzigd) delen.push(gewijzigd + (gewijzigd === 1 ? ' ruit gewijzigd' : ' ruiten gewijzigd'));
    if (weg) delen.push(weg + (weg === 1 ? ' ruit verwijderd' : ' ruiten verwijderd'));
    if (naBestelling) delen.push('ná de bestelling');
    if (!delen.length) delen.push('projectgegevens gewijzigd');
    return delen.join(', ');
  }

  /* ─── losse aantekeningen voor het logboek ────────────────── */
  // Niet alles is te zien aan de ruiten. Een ontgrendeling of een
  // verstuurde bestelmail hoort met zoveel woorden in het logboek; die
  // tekst gaat mee met de eerstvolgende opslag (v88).
  var notities = [];

  function spoorNotitie(tekst) {
    var t = String(tekst || '').trim();
    if (t && notities.indexOf(t) < 0) notities.push(t);
  }
  window.glasSpoorNotitie = spoorNotitie;

  // Is dit een wijziging ná de bestellijst? Dan hoort dat in het logboek
  // te staan, niet alleen als bolletje op het scherm.
  function naBestellingNu() {
    if (typeof projectInfo === 'undefined' || !projectInfo || !projectInfo.besteld) return false;
    if (typeof rijen === 'undefined' || !window.naBestellingGewijzigd) return false;
    return rijen.some(function (r) { return r && naBestellingGewijzigd(r); });
  }

  /* ─── de status bijhouden ─────────────────────────────────── */
  // Aangemaakt → bezig met inmeten/verwerken gaat vanzelf, zodra er een
  // eerste ruit met inhoud staat; compleet hoeft die niet te zijn. De
  // stap naar 'besteld' zet alleen de mailfunctie (of jij met de hand);
  // verder komt niemand er automatisch (v88).
  var STATUS_START = 'aangemaakt';
  var STATUS_BEZIG = 'bezig met inmeten/verwerken';

  function statusBijwerken() {
    if (typeof projectInfo === 'undefined' || !projectInfo) return;
    var nu = String(projectInfo.status || '');
    if (nu && nu !== STATUS_START && nu !== 'open') return;
    var ietsIngevuld = (typeof rijen === 'undefined' ? [] : rijen)
      .some(function (r) { return heeftInhoud(r); });
    if (!ietsIngevuld) {
      if (!nu) { projectInfo.status = STATUS_START; if (window.renderProject) renderProject(); }
      return;
    }
    projectInfo.status = STATUS_BEZIG;
    spoorNotitie('status op "' + STATUS_BEZIG + '"');
    if (window.renderProject) renderProject();
  }
  window.glasStatusBijwerken = statusBijwerken;

  // Het logboek ophalen voor dit project.
  window.glasGeschiedenis = function (id) {
    if (!sb) return Promise.resolve([]);
    return sb.from('projectgeschiedenis')
      .select('id,moment,wie_naam,samenvatting')
      .eq('project_id', id || projectId)
      .order('moment', { ascending: false })
      .limit(30)
      .then(function (res) { return (res && res.data) || []; }, function () { return []; });
  };

  var kanaal = null;
  // Wat we zelf hebben weggeschreven. De database stuurt elke wijziging
  // terug, ook de onze; die komt aan als jij alweer verder hebt getypt en
  // is dan niet meer te herkennen aan wat er op het scherm staat.
  var eigenSchrijfsels = [];
  // Elke geopende pagina krijgt een eigen kenmerk dat met de opslag
  // meegaat. Zo herken je je eigen terugkaatsende opslag ook als je
  // intussen verder bent gegaan. Bewust niet het gebruikers-id: dezelfde
  // gebruiker op een tweede apparaat moet wél live bijgewerkt worden.
  var SESSIE = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  var kanaalKlok = null;
  var kanaalPoging = 0;
  var kanaalZelfWeg = false;

  // Staat de live verbinding er nog? Na een slaapstand of een wifi-wissel
  // valt die stil zonder dat er iets gemeld wordt; dan komen wijzigingen
  // van een collega niet meer binnen (v84).
  function kanaalGezond() {
    return !!(kanaal && (kanaal.state === 'joined' || kanaal.state === 'joining'));
  }

  /* ─── startscherm en stilstand ────────────────────────────── */

  function lijstenVernieuwen() {
    var scherm = document.getElementById('startScherm');
    if (scherm && !scherm.hidden && window.glasToonStart) { glasToonStart(); return; }
    toonProjecten(true);
  }

  function toonStart() {
    if (window.glasToonStart) glasToonStart();
    else toonProjecten();
  }

  // Het project sluiten en terug naar het startscherm. Alleen als er
  // niets openstaat; anders vraagt magVerlaten eerst wat de bedoeling is.
  window.glasNaarStart = async function (reden) {
    if (projectId) {
      if (reden !== 'stil' && !await magVerlaten('terug naar het startscherm gaan')) return false;
      try {
        localStorage.setItem(LS_LAATST, JSON.stringify({
          id: projectId, naam: waarde('projectNaam'), op: Date.now()
        }));
      } catch (e) {}
    }
    if (kanaal) { kanaalZelfWeg = true; try { sb.removeChannel(kanaal); } catch (e) {} kanaal = null; }
    projectId = null;
    window.glasProjectId = null;
    geladen = false;
    vuil = false;
    bezig = false;
    laatsteJson = null;
    gebruikerDeedIets = false;
    localStorage.removeItem(LS_PROJECT);
    localStorage.removeItem(LS_PENDING);
    zetHash(null);
    zetStaat({});
    status('Geen project open', '#6b6862');
    toonStart();
    return true;
  };

  window.glasLaatsteProject = function () {
    try { return JSON.parse(localStorage.getItem(LS_LAATST) || 'null'); } catch (e) { return null; }
  };

  // Na twee uur stilstand terug naar het startscherm, zodat niemand
  // 's middags verder typt in de opname van vanochtend (v87).
  var STIL_MS = 2 * 60 * 60 * 1000;
  var stilKlok = null;

  function stilReset() {
    clearTimeout(stilKlok);
    stilKlok = setTimeout(stilAfloop, STIL_MS);
  }

  function stilAfloop() {
    if (!projectId) return;
    // Niets kwijtraken: staat er werk open of ben je aan het typen, dan
    // blijft het project gewoon staan en kijken we later opnieuw.
    var a = document.activeElement;
    if (vuil || bezig || localStorage.getItem(LS_PENDING) === '1' ||
        (a && a.matches && a.matches('input, select, textarea'))) {
      stilReset();
      return;
    }
    window.glasNaarStart('stil');
    if (window.appMelding) {
      appMelding('Het project is gesloten omdat de app twee uur ongebruikt was. ' +
                 'Alles was opgeslagen; kies hieronder waar je verder wilt.',
                 { kop: 'Terug naar het startscherm' });
    }
  }

  ['pointerdown', 'keydown', 'visibilitychange'].forEach(function (soort) {
    document.addEventListener(soort, stilReset, true);
  });
  window.addEventListener('focus', stilReset);
  stilReset();

  // De projectenlijst, ook bruikbaar vanaf het startscherm.
  window.glasProjecten = function (zoek) {
    if (!sb || !gebruiker) return Promise.resolve({ data: [], error: null });
    return new Promise(function (klaar) {
      metHerkansing(function () {
        var q = sb.from('projecten')
          .select('id,naam,datum,status,aantal_ruiten,adres,open_taken,updated_at,gewijzigd_naam');
        var t = String(zoek || '').trim();
        if (t) {
          var z = '%' + t.replace(/[%_]/g, '') + '%';
          q = q.or('naam.ilike.' + z + ',datum.ilike.' + z + ',adres.ilike.' + z);
        }
        return q.order('updated_at', { ascending: false }).limit(200);
      }, function (res) {
        klaar({ data: (res && res.data) || [], error: res && res.error });
      });
    });
  };

  window.glasGebruiker = function () {
    return { id: gebruiker ? gebruiker.id : null, naam: gebruikersNaam(),
             email: (gebruiker && gebruiker.email) || '' };
  };

  /* ─── de namen van de collega's ───────────────────────────── */
  // `auth.users` mag de app niet lezen, en dat hoort ook zo. De tabel
  // `gebruikers` is de leesbare kopie: alleen naam en mailadres. Hij
  // wordt gevuld zodra Jan iemand in Supabase aanmaakt (v88).

  var gebruikersCache = null;
  var gebruikersTabel = true;

  window.glasGebruikers = function (opnieuw) {
    if (!sb || !gebruikersTabel) return Promise.resolve([]);
    if (gebruikersCache && !opnieuw) return Promise.resolve(gebruikersCache);
    return sb.from('gebruikers').select('id,naam,email,actief')
      .order('naam', { ascending: true })
      .then(function (res) {
        if (res && res.error) {
          var t = String(res.error.message || '') + ' ' + String(res.error.code || '');
          if (/42P01|PGRST205|does not exist/.test(t)) {
            gebruikersTabel = false;
            console.warn('[gebruikers] tabel bestaat nog niet; het SQL-script van v88 is nog niet gedraaid');
          }
          return [];
        }
        gebruikersCache = ((res && res.data) || []).filter(function (g) { return g.actief !== false; });
        return gebruikersCache;
      }, function () { return []; });
  };

  window.glasGebruikersTabel = function () { return gebruikersTabel; };

  /* ─── mail ────────────────────────────────────────────────── */
  // De sleutel van de maildienst staat niet in de app maar als geheim
  // bij de Edge Function `mail`; die verstuurt en legt vast. Lukt een
  // bestelmail, dan zet diezelfde functie het project op 'besteld' —
  // zo betekent die status altijd "de mail is er echt uit" (v88).

  window.glasMailAdressen = function () {
    if (!sb) return Promise.resolve([]);
    return sb.from('mailadressen').select('id,soort,naam,adres,standaard,actief')
      .order('soort', { ascending: true }).order('naam', { ascending: true })
      .then(function (res) {
        if (res && res.error) return [];
        return ((res && res.data) || []).filter(function (a) { return a.actief !== false; });
      }, function () { return []; });
  };

  window.glasMailAdresNieuw = function (naam, adres, soort) {
    if (!sb) return Promise.resolve(null);
    return sb.from('mailadressen').insert({
      naam: String(naam || '').trim(),
      adres: String(adres || '').trim(),
      soort: soort || 'leverancier'
    }).select('*').single()
      .then(function (res) { return (res && res.data) || null; }, function () { return null; });
  };

  window.glasMailLog = function (pid) {
    if (!sb) return Promise.resolve([]);
    return sb.from('mailverzonden').select('moment,soort,aan,onderwerp,gelukt,fout,wie_naam')
      .eq('project_id', pid || projectId)
      .order('moment', { ascending: false }).limit(10)
      .then(function (res) { return (res && res.data) || []; }, function () { return []; });
  };

  // Een collega die een taak krijgt, krijgt er een kort mailtje over.
  // Geeft { ok } terug; mislukt het, dan staat de taak er nog steeds —
  // de mail is een bericht, niet de taak zelf (v88).
  window.glasTaakMail = function (taak, wie) {
    if (!wie || !wie.email) return Promise.resolve({ ok: false, fout: 'Geen mailadres bekend' });
    if (gebruiker && wie.id === gebruiker.id) return Promise.resolve({ ok: false, fout: 'eigen taak' });
    var projectNaam = (el('projectNaam') || {}).value || '(naamloos)';
    var link = location.href.split('#')[0] + '#project=' + (projectId || '');
    return glasMail({
      soort: 'taak',
      aan: [wie.email],
      onderwerp: 'Taak voor je bij ' + projectNaam + ': ' + String(taak.tekst || '').slice(0, 60),
      tekst: 'Hoi ' + (wie.naam || '') + ',\n\n' +
             gebruikersNaam() + ' heeft een taak op jouw naam gezet bij het project ' +
             projectNaam + ':\n\n' + String(taak.tekst || '') + '\n\n' +
             'Je vindt de taak in de app, op het startscherm onder "Mijn taken", of ' +
             'rechtstreeks bij het project:\n' + link + '\n\n' +
             '— Glasopname, Jelier Bouw'
    });
  };

  // Versturen. Geeft { ok: true } of { ok: false, fout: '…' } terug; de
  // app hoeft dus niets te weten over de maildienst.
  window.glasMail = function (bericht) {
    if (!sb || !gebruiker) {
      return Promise.resolve({ ok: false, fout: 'Je bent niet ingelogd.' });
    }
    var lading = {
      soort: bericht.soort || 'bestelling',
      projectId: bericht.projectId || projectId,
      aan: bericht.aan || [],
      cc: bericht.cc || [],
      onderwerp: bericht.onderwerp || '',
      tekst: bericht.tekst || '',
      wieNaam: gebruikersNaam()
    };
    if (bericht.bijlage) lading.bijlage = bericht.bijlage;

    return Promise.resolve()
      .then(function () {
        if (sb.functions && sb.functions.invoke) {
          return sb.functions.invoke('mail', { body: lading }).then(function (res) {
            if (res && res.error) {
              // De functie geeft bij een fout ook een leesbare tekst terug;
              // die zit in het antwoord, niet in de foutmelding zelf.
              return leesFoutLichaam(res).then(function (tekst) {
                return { ok: false, fout: tekst || res.error.message || 'Versturen mislukt' };
              });
            }
            return (res && res.data) || { ok: false, fout: 'Geen antwoord van de mailfunctie' };
          });
        }
        // Oudere supabase-js: zelf aanroepen, met het eigen token erbij.
        return sb.auth.getSession().then(function (s) {
          var token = s && s.data && s.data.session && s.data.session.access_token;
          return fetch(cfg.url.replace(/\/$/, '') + '/functions/v1/mail', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: cfg.anonKey,
              Authorization: 'Bearer ' + (token || cfg.anonKey)
            },
            body: JSON.stringify(lading)
          }).then(function (r) { return r.json().catch(function () { return {}; }); });
        });
      })
      .then(function (uit) {
        if (uit && uit.ok && lading.soort === 'bestelling') naBestelmail(lading.aan);
        return uit || { ok: false, fout: 'Geen antwoord' };
      })
      .catch(function (e) {
        return { ok: false, fout: (e && e.message) || 'De mailfunctie is niet bereikbaar. ' +
                 'Staat hij in Supabase onder Edge Functions?' };
      });
  };

  function leesFoutLichaam(res) {
    try {
      if (res.error && res.error.context && typeof res.error.context.json === 'function') {
        return res.error.context.json().then(function (j) { return j && j.fout; },
                                            function () { return ''; });
      }
    } catch (e) {}
    return Promise.resolve('');
  }

  // De functie heeft de status in de database al op 'besteld' gezet. De
  // app stuurt bij elke opslag zijn eigen status mee, dus die moet hier
  // meteen mee — anders zet de volgende opslag het gewoon weer terug.
  function naBestelmail(aan) {
    if (typeof projectInfo === 'undefined' || !projectInfo) return;
    projectInfo.status = 'besteld';
    projectInfo.bestelmail = { op: new Date().toISOString(), door: gebruikersNaam(),
                               aan: (aan || []).join(', ') };
    spoorNotitie('bestelmail verstuurd naar ' + (aan || []).join(', '));
    if (window.glasMarkeerWerk) glasMarkeerWerk();
    if (window.renderProject) renderProject();
    if (window.renderTabel) renderTabel();
    if (window.renderBestellijst) renderBestellijst();
    window.opslaan();
  }

  /* ─── wachtwoord opnieuw vragen ───────────────────────────── */
  // Voor het ontgrendelen van een besteld project. Supabase controleert
  // het wachtwoord; het antwoord is een verse sessie voor dezelfde
  // gebruiker, dus er verandert niets aan wie er ingelogd is (v88).
  window.glasWachtwoordKlopt = function (wachtwoord) {
    if (!sb || !gebruiker || !gebruiker.email) return Promise.resolve(false);
    if (!wachtwoord) return Promise.resolve(false);
    return sb.auth.signInWithPassword({ email: gebruiker.email, password: wachtwoord })
      .then(function (res) {
        if (res && res.error) return false;
        if (res && res.data && res.data.user) gebruiker = res.data.user;
        return true;
      }, function () { return false; });
  };

  /* ─── taken ───────────────────────────────────────────────── */
  // Taken stonden in het project zelf. Nu in een eigen tabel, zodat de
  // app kan laten zien wat er voor jou openstaat zonder elk project in
  // te laden (v87).

  function taakFout(wat) {
    return function (e) {
      console.warn('[taken] ' + wat + ' mislukt', e);
      if (window.appFout) appFout('De taken konden niet bijgewerkt worden: ' +
        ((e && e.message) || 'geen verbinding') + '. Probeer het zo nog eens.',
        { kop: 'Taken' });
      return null;
    };
  }

  var takenTabel = true;
  window.glasTakenTabel = function () { return takenTabel; };

  function takenTabelCheck(res) {
    var tekst = String((res && res.error && res.error.message) || '') + ' ' +
                String((res && res.error && res.error.code) || '');
    if (/relation .*taken.* does not exist|42P01|PGRST205/.test(tekst)) {
      takenTabel = false;
      console.warn('[taken] tabel bestaat nog niet; het SQL-script van v87 is nog niet gedraaid');
    }
    return !(res && res.error);
  }

  window.glasTakenVan = function (pid) {
    if (!sb || !takenTabel || !(pid || projectId)) return Promise.resolve(null);
    return sb.from('taken').select('*').eq('project_id', pid || projectId)
      .order('klaar', { ascending: true }).order('volgorde', { ascending: true })
      .then(function (res) {
        if (!takenTabelCheck(res)) return null;
        return (res && res.data) || [];
      }, function () { return null; });
  };

  window.glasMijnTaken = function () {
    if (!sb || !gebruiker || !takenTabel) return Promise.resolve([]);
    return sb.from('taken')
      .select('id,tekst,project_id,aangemaakt_op,eigenaar_naam')
      .eq('klaar', false).eq('eigenaar', gebruiker.id)
      .order('aangemaakt_op', { ascending: true }).limit(100)
      .then(function (res) { return (res && res.data) || []; }, function () { return []; });
  };

  // `wie` is { id, naam } van de collega die de taak krijgt; laat je het
  // weg, dan komt de taak op je eigen naam (v88).
  window.glasTaakNieuw = function (tekst, pid, wie) {
    if (!sb || !gebruiker || !takenTabel) return Promise.resolve(null);
    return sb.from('taken').insert({
      project_id: pid || projectId,
      tekst: String(tekst || '').trim(),
      eigenaar: (wie && wie.id) || gebruiker.id,
      eigenaar_naam: (wie && wie.naam) || gebruikersNaam(),
      aangemaakt_door: gebruiker.id,
      volgorde: Date.now() % 100000
    }).select('*').single()
      .then(function (res) { return (res && res.data) || null; }, taakFout('toevoegen'));
  };

  window.glasTaakWijzig = function (id, velden) {
    if (!sb) return Promise.resolve(null);
    var v = {};
    Object.keys(velden || {}).forEach(function (k) { v[k] = velden[k]; });
    if (v.klaar === true) {
      v.afgerond_op = new Date().toISOString();
      v.afgerond_door = gebruiker ? gebruiker.id : null;
    }
    if (v.klaar === false) { v.afgerond_op = null; v.afgerond_door = null; }
    return sb.from('taken').update(v).eq('id', id).select('*').single()
      .then(function (res) { return (res && res.data) || null; }, taakFout('bijwerken'));
  };

  window.glasTaakWeg = function (id) {
    if (!sb) return Promise.resolve(false);
    return sb.from('taken').delete().eq('id', id)
      .then(function (res) { return !(res && res.error); }, taakFout('verwijderen'));
  };

  // Taken die nog in het project zelf staan één keer overzetten.
  function migreerTaken(pid) {
    if (!sb || !pid || !Array.isArray(projectTaken) || !projectTaken.length) return;
    var oud = projectTaken.slice();
    sb.from('taken').select('id').eq('project_id', pid).limit(1).then(function (res) {
      if (res.error || (res.data && res.data.length)) return;
      var rijenUit = oud.filter(function (t) { return t && String(t.tekst || '').trim(); })
        .map(function (t, i) {
          return { project_id: pid, tekst: t.tekst, klaar: !!t.klaar, volgorde: i + 1 };
        });
      if (!rijenUit.length) return;
      sb.from('taken').insert(rijenUit).then(function (r2) {
        if (r2 && r2.error) return;
        projectTaken = [];
        if (window.renderProject) renderProject();
        if (window.takenLaden) takenLaden();
        window.opslaan();
      });
    });
  }

  /* ─── het project in het webadres ─────────────────────────── */
  // Zonder dit onthoudt alleen de browser zelf welk project je open had,
  // en opent dezelfde link in twee browsers twee verschillende projecten
  // (v87). Met de hash erbij is een link te delen en te bewaren.
  function hashProject() {
    var m = String(location.hash || '').match(/project=([0-9a-f-]{36})/i);
    return m ? m[1] : null;
  }

  function zetHash(id) {
    try {
      var nieuw = id ? '#project=' + id : location.pathname + location.search;
      if (id) {
        if (location.hash !== '#project=' + id) history.replaceState(null, '', nieuw);
      } else if (location.hash) {
        history.replaceState(null, '', nieuw);
      }
    } catch (e) {}
  }

  function luisterOpProject() {
    // Een oudere bibliotheek uit de cache kent geen kanalen. Dan werkt de
    // app gewoon door, alleen zonder live bijwerken.
    if (!sb || !projectId || typeof sb.channel !== 'function') return;
    clearTimeout(kanaalKlok);
    if (kanaal) {
      kanaalZelfWeg = true;
      try { sb.removeChannel(kanaal); } catch (e) {}
      kanaal = null;
      setTimeout(function () { kanaalZelfWeg = false; }, 1000);
    }
    try {
      kanaal = sb.channel('project-' + projectId)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'projecten', filter: 'id=eq.' + projectId
        }, function (bericht) { vanElders(bericht.new); })
        .subscribe(function (staat) {
          if (staat === 'SUBSCRIBED') { kanaalPoging = 0; return; }
          if (kanaalZelfWeg) return;
          if (staat === 'CHANNEL_ERROR' || staat === 'TIMED_OUT' || staat === 'CLOSED') {
            clearTimeout(kanaalKlok);
            var wacht = Math.min(30000, 3000 * Math.pow(2, Math.min(kanaalPoging++, 3)));
            kanaalKlok = setTimeout(function () {
              luisterOpProject();
              // Tijdens de stilte kan er van alles gewijzigd zijn; één keer
              // navragen in plaats van wachten op het volgende bericht.
              if (!vuil && !bezig) bijTerugkeer();
            }, wacht);
          }
        });
    } catch (e) {
      console.warn('[cloud] live bijwerken niet beschikbaar', e);
      kanaal = null;
    }
  }

  function vanElders(rij) {
    if (!rij || !rij.data) return;
    // Onze eigen opslag die terugkaatst — ook een oudere: er is sindsdien
    // alleen nog meer van onszelf bijgekomen.
    if (rij.data._sessie === SESSIE) return;
    var binnen = vingerafdruk(rij.data);
    // Gelijk aan wat er nu staat: niets aan de hand.
    if (binnen === vingerafdruk(huidigeStaat())) return;
    // Of het is een van onze eigen opslagbeurten die terugkaatst.
    if (eigenSchrijfsels.indexOf(binnen) >= 0) return;

    var veldActief = document.activeElement &&
      document.activeElement.matches && document.activeElement.matches('input, select, textarea');

    if (!vuil && !veldActief) {
      zetStaat(rij.data);
      laatsteJson = JSON.stringify(huidigeStaat());
      opslaanLokaal();
      toonMelding('');
      status('↻ Bijgewerkt door collega', '#1a6b3c');
      setTimeout(statusOpgeslagen, 4000);
      return;
    }

    // Er staat lokaal werk open of je bent aan het typen: dan niets
    // overschrijven, maar wel zeggen dat het er is.
    toonMelding('Een collega heeft dit project gewijzigd.' +
      (vuil ? ' Jouw wijzigingen staan nog open en overschrijven die van hem zodra ze omhoog gaan.' : ''),
      'Hun versie laden', async function () {
        if (vuil && !await appVraag(
            'Jouw nog niet opgeslagen wijzigingen gaan hiermee verloren.',
            { kop: 'Versie van je collega laden', ja: 'Laden en mijn werk laten vallen',
              gevaarlijk: true })) return;
        zetStaat(rij.data);
        laatsteJson = JSON.stringify(huidigeStaat());
        vuil = false;
        localStorage.removeItem(LS_PENDING);
        opslaanLokaal();
        toonMelding('');
        statusOpgeslagen();
      });
  }

  function toonMelding(tekst, knopTekst, actie) {
    var balk = el('syncMelding');
    if (!balk) return;
    if (!tekst) { balk.style.display = 'none'; balk.innerHTML = ''; return; }
    balk.style.display = 'flex';
    balk.innerHTML = '<span>↻ ' + tekst + '</span>';
    if (knopTekst) {
      var knop = document.createElement('button');
      knop.textContent = knopTekst;
      knop.onclick = function () { balk.style.display = 'none'; actie(); };
      balk.appendChild(knop);
    }
    var weg = document.createElement('button');
    weg.className = 'sluit';
    weg.textContent = '✕';
    weg.onclick = function () { balk.style.display = 'none'; };
    balk.appendChild(weg);
  }

  // Terugkeren naar de app: openstaand werk wegschrijven en kijken of er
  // intussen iets veranderd is. Dit vangt ook wat een gemiste live-melding
  // laat liggen, bijvoorbeeld na een tijd zonder bereik.
  function bijTerugkeer() {
    if (document.visibilityState !== 'visible' || !sb || !gebruiker || !projectId) return;
    if (!kanaalGezond()) luisterOpProject();
    // Is de stand nog nooit binnengekomen, dan is dít het moment om het
    // opnieuw te proberen — niet pas als er iets opgeslagen moet worden.
    if (!geladen) { herstelPoging = 0; herstelProbeer(); return; }

    // Staat er eigen werk open, dan wijkt de database per definitie af van
    // je scherm. Dat is geen wijziging van een collega maar je eigen
    // invoer die nog omhoog moet. Eerst wegschrijven; wat er daarna echt
    // van een ander komt, meldt de live verbinding vanzelf.
    if (vuil) { synchroniseer(); return; }
    // Opslaan nog onderweg: wat de database nu teruggeeft is ouder dan je
    // scherm. Het antwoord op die opslag regelt de rest.
    if (bezig) return;

    sb.from('projecten').select('data').eq('id', projectId).maybeSingle().then(function (res) {
      if (res.error) { mislukt('terugkeer'); return; }
      if (!res.data) { projectWeg(); return; }
      if (vuil || bezig) return;     // intussen toch weer iets getypt
      geladen = true;
      if (vingerafdruk(res.data.data || {}) !== vingerafdruk(huidigeStaat())) {
        vanElders({ data: res.data.data });
      } else {
        // Alles gelijk: dan hoort er geen waarschuwing meer te staan.
        statusOpgeslagen();
      }
    }, function () { mislukt('terugkeer'); });
  }
  document.addEventListener('visibilitychange', bijTerugkeer);
  window.addEventListener('focus', bijTerugkeer);

  /* ─── keuzelijsten uit de database ─────────────────────────── */

  function pasDataToe(nieuw) {
    if (!nieuw || typeof nieuw !== 'object') return;
    Object.keys(nieuw).forEach(function (k) {
      // De keuzelijst uit de database wint normaal van die in index.html.
      // Eén uitzondering: is dat nog een oudere lijst — die van vóór v63
      // zonder figuurglas, of die van v63 t/m v72 mét maten in de namen —
      // dan zou de app achteruit gaan zodra hij online komt. Draai
      // 11_glasbewerking_namen.sql en dit valt vanzelf weg.
      // Dezelfde afspraak voor de roeden: staan de opplakroeden er nog in,
      // of de breedtes die alleen bij hen hoorden, dan is de lijst ouder
      // dan de app en wint die van index.html niet.
      if (k === 'roedenverdeling' && Array.isArray(nieuw[k]) &&
          nieuw[k].some(function (v) { return /^Opplak/i.test(v); })) {
        console.warn('[cloud] roedenverdeling in de database is nog de oude lijst; ' +
                     'draai 12_roeden_en_canale.sql.');
        return;
      }
      if (k === 'roedenbreedte' && Array.isArray(nieuw[k]) &&
          nieuw[k].some(function (v) { return v === '28 mm' || v === '38 mm'; })) {
        console.warn('[cloud] roedenbreedte in de database is nog de oude lijst; ' +
                     'draai 12_roeden_en_canale.sql.');
        return;
      }
      if (k === 'glasbewerking' && oudeBewerkingslijst(nieuw[k])) {
        console.warn('[cloud] glasbewerking in de database is nog een oude lijst; ' +
                     'draai 12_roeden_en_canale.sql. Tot die tijd gebruikt de app zijn eigen lijst.');
        return;
      }
      DATA[k] = nieuw[k];
    });
  }

  function oudeBewerkingslijst(lijst) {
    if (!Array.isArray(lijst)) return true;
    // Twee kenmerken van de huidige lijst:
    //  • een kastlijntje ('Figuurglas — Crepi blank'); tot v62 stond daar
    //    een streepje;
    //  • geen maten meer in de naam; van v63 tot en met v72 stonden die
    //    erachter ('… (4/6/8/10 mm)') en kwamen ze zo op de bestellijst.
    var kastlijn = lijst.some(function (b) { return b.indexOf('Figuurglas — ') === 0; });
    // Canale mat blank kwam er in v76 bij; ontbreekt hij, dan is de lijst
    // van vóór die versie.
    var compleet = lijst.indexOf('Figuurglas — Canale mat blank') >= 0;
    var metMaat = lijst.some(function (b) { return /\(\s*\d[\d/.,\s]*mm\s*\)\s*$/.test(b); });
    return !kastlijn || metMaat || !compleet;
  }

  function laadGecachteData() {
    try {
      var raw = localStorage.getItem(LS_DATA);
      if (raw) pasDataToe(JSON.parse(raw));
    } catch (e) {}
  }

  function haalData() {
    if (!sb) return Promise.resolve();
    return sb.from('app_data').select('waarde').eq('key', 'glas_data').maybeSingle()
      .then(function (res) {
        if (res.error || !res.data) return;
        pasDataToe(res.data.waarde);
        try { localStorage.setItem(LS_DATA, JSON.stringify(res.data.waarde)); } catch (e) {}
        renderTabel();
        herbereken();
      });
  }

  /* ─── inlogscherm ──────────────────────────────────────────── */

  function toonLogin(melding) {
    el('cloudLoginFout').textContent = melding || '';
    el('cloudLogin').style.display = 'flex';
    el('cloudEmail').focus();
    toonGebruiker();
  }

  function verbergLogin() {
    el('cloudLogin').style.display = 'none';
    toonGebruiker();
  }

  function login() {
    var email = el('cloudEmail').value.trim();
    var pw = el('cloudWachtwoord').value;
    if (!email || !pw) { el('cloudLoginFout').textContent = 'Vul e-mail en wachtwoord in.'; return; }
    el('cloudLoginKnop').disabled = true;
    el('cloudLoginFout').textContent = 'Bezig met inloggen…';
    sb.auth.signInWithPassword({ email: email, password: pw }).then(function (res) {
      el('cloudLoginKnop').disabled = false;
      if (res.error) { el('cloudLoginFout').textContent = 'Inloggen mislukt: ' + res.error.message; return; }
      gebruiker = res.data.user;
      verbergLogin();
      start();
    });
  }

  async function uitloggen() {
    if (!await magVerlaten('uitloggen')) return;
    localStorage.removeItem(LS_PENDING);
    sb.auth.signOut().then(function () {
      gebruiker = null;
      projectId = null;
      localStorage.removeItem(LS_PROJECT);
      toonLogin('Je bent uitgelogd.');
    });
  }

  /* ─── naamcontrole ─────────────────────────────────────────── */
  // Twee projecten met dezelfde naam zijn in het veld niet uit elkaar te
  // houden, dus we controleren zowel bij aanmaken als bij hernoemen.

  function naamVergelijk(n) { return String(n || '').trim().toLowerCase(); }

  function zoekNaam(naam, behalveId) {
    if (!sb || !gebruiker) return Promise.resolve(null);
    return sb.from('projecten').select('id,naam').then(function (res) {
      if (res.error || !res.data) return null;
      return res.data.find(function (p) {
        return naamVergelijk(p.naam) === naamVergelijk(naam) && p.id !== behalveId;
      }) || null;
    });
  }

  function toonNaamWaarschuwing(tekst) {
    var balk = document.getElementById('naamWaarschuwing');
    var veld = el('projectNaam');
    if (balk) {
      balk.textContent = tekst || '';
      balk.style.display = tekst ? 'block' : 'none';
    }
    if (veld) veld.classList.toggle('dubbel', !!tekst);
  }

  function controleerNaam() {
    var naam = waarde('projectNaam');
    if (!naam.trim() || !projectId) { toonNaamWaarschuwing(''); return; }
    zoekNaam(naam, projectId).then(function (bestaand) {
      toonNaamWaarschuwing(bestaand
        ? '⚠ Er bestaat al een ander project met de naam ‹' + bestaand.naam +
          '›. Geef dit project een andere naam om verwarring te voorkomen.'
        : '');
    });
  }

  /* ─── projectenlijst ───────────────────────────────────────── */

  var zoekTimer = null;
  var zoekTerm = '';

  window.cloudZoek = function (term) {
    zoekTerm = term || '';
    clearTimeout(zoekTimer);
    // Even wachten met zoeken: anders gaat er per toetsaanslag een
    // verzoek naar de database.
    zoekTimer = setTimeout(function () { toonProjecten(true); }, 250);
  };

  window.cloudZoekWissen = function () {
    var veld = el('cloudZoekVeld');
    if (veld) { veld.value = ''; veld.focus(); }
    zoekTerm = '';
    toonProjecten(true);
  };

  function markeer(tekst, term) {
    var veilig = esc(tekst);
    if (!term) return veilig;
    var i = veilig.toLowerCase().indexOf(esc(term).toLowerCase());
    if (i < 0) return veilig;
    return veilig.slice(0, i) + '<mark>' + veilig.slice(i, i + term.length) + '</mark>' +
           veilig.slice(i + term.length);
  }

  function toonProjecten(behoudVenster) {
    if (!sb || !gebruiker) return;
    var lijst = el('cloudProjectLijst');
    if (!behoudVenster) {
      zoekTerm = '';
      var veld = el('cloudZoekVeld');
      if (veld) veld.value = '';
    }
    lijst.innerHTML = '<div style="padding:20px;color:var(--grijs-tekst)">Projecten ophalen…</div>';
    el('cloudProjecten').style.display = 'flex';

    // Alleen de velden die de lijst toont; de inhoud van een project
    // wordt pas opgehaald als je hem opent. Bij een fout die vanzelf
    // overgaat wordt het een paar keer opnieuw geprobeerd (v86).
    metHerkansing(function () {
      var q = sb.from('projecten').select('id,naam,datum,status,aantal_ruiten,adres,open_taken,updated_at');
      if (zoekTerm.trim()) {
        var z = '%' + zoekTerm.trim().replace(/[%_]/g, '') + '%';
        q = q.or('naam.ilike.' + z + ',datum.ilike.' + z + ',adres.ilike.' + z);
      }
      return q.order('updated_at', { ascending: false }).limit(200);
    }, function (res) {
        if (res.error) {
          lijst.innerHTML = '<div style="padding:20px;color:var(--rood)">De projecten konden niet opgehaald worden.' +
            '<br><span style="color:var(--grijs-tekst);font-size:12px">' + veiligeTekst(res.error.message) + '</span>' +
            '<br><button class="btn btn-secondary btn-sm" style="margin-top:10px" ' +
            'onclick="cloudProjectenTonen()">Opnieuw proberen</button></div>';
          return;
        }
        var telling = el('cloudTelling');
        if (telling) {
          telling.textContent = zoekTerm.trim()
            ? res.data.length + ' van de projecten komt overeen'
            : (res.data.length ? res.data.length + ' projecten' : '');
        }
        if (!res.data.length) {
          lijst.innerHTML = zoekTerm.trim()
            ? '<div style="padding:20px;color:var(--grijs-tekst)">Geen project gevonden voor ‹' + esc(zoekTerm) + '›.</div>'
            : '<div style="padding:20px;color:var(--grijs-tekst)">Nog geen projecten. Maak er hieronder een aan.</div>';
          return;
        }
        lijst.innerHTML = res.data.map(function (p) {
          var n = p.aantal_ruiten || 0;
          var d = new Date(p.updated_at);
          var stamp = String(d.getDate()).padStart(2, '0') + '-' +
                      String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' +
                      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
          return '<div class="cloud-project' + (p.id === projectId ? ' actief' : '') + '">' +
                 '<div class="cloud-project-info" onclick="cloudOpen(\'' + p.id + '\')">' +
                 '<strong>' + markeer(p.naam || '(naamloos)', zoekTerm) + '</strong>' +
                 '<span>' + (p.status && p.status !== 'open' && p.status !== 'aangemaakt'
                     ? '<em class="pl-status">' + esc(p.status) + '</em> · ' : '') +
                 (p.adres ? markeer(p.adres, zoekTerm) + ' · ' : '') +
                 n + ' ruiten' +
                 (p.open_taken ? ' · <b class="pl-taken">' + p.open_taken + ' open ' +
                    (p.open_taken === 1 ? 'taak' : 'taken') + '</b>' : '') +
                 (p.datum ? ' · ' + markeer(p.datum, zoekTerm) : '') +
                 ' · gewijzigd ' + stamp + '</span>' +
                 '</div>' +
                 '<button class="btn btn-ghost btn-sm" onclick="cloudVerwijder(\'' + p.id + '\')" title="Project verwijderen">🗑</button>' +
                 '</div>';
        }).join('');
    }, function (poging) {
      lijst.innerHTML = '<div style="padding:20px;color:var(--grijs-tekst)">' +
        'De server gaf nog geen antwoord. Nieuwe poging ' + poging + ' van 3…</div>';
    });
  }

  // Is er werk dat nog niet op de server staat? Dan mag je niet zomaar
  // een ander project openen, uitloggen of een nieuw project maken: de
  // lokale kopie wordt daarbij overschreven en dat werk is dan weg (v83).
  function openstaandWerk() {
    return vuil || localStorage.getItem(LS_PENDING) === '1';
  }

  function wacht(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function magVerlaten(wat) {
    if (!openstaandWerk()) return true;
    // Eerst gewoon proberen alsnog op te slaan.
    if (navigator.onLine) {
      synchroniseer();
      for (var i = 0; i < 12 && openstaandWerk(); i++) await wacht(500);
      if (!openstaandWerk()) return true;
    }
    var keus = await appKeuze('Er staat werk in dit project dat nog niet op de server is opgeslagen. ' +
      'Ga je nu ' + wat + ', dan is dat werk weg.',
      [{ tekst: 'Annuleren', waarde: null },
       { tekst: 'Opnieuw proberen', waarde: 'opnieuw' },
       { tekst: 'Toch doorgaan', waarde: 'door', soort: 'btn-danger' }],
      { kop: 'Nog niet opgeslagen' });
    if (keus === 'opnieuw') return magVerlaten(wat);
    return keus === 'door';
  }

  window.cloudOpen = async function (id) {
    if (!await magVerlaten('een ander project openen')) return;
    wegGemeld = false;
    werkTeRedden = false;
    geladen = false;
    gebruikerDeedIets = false;
    localStorage.removeItem(LS_PENDING);
    vuil = false;
    metHerkansing(function () {
      return sb.from('projecten').select('id,data').eq('id', id).single();
    }, function (res) {
      if (res.error || !res.data) {
        appFout('Openen mislukt: ' + ((res.error && res.error.message) || 'geen gegevens ontvangen') +
                '. Probeer het zo nog eens.', { kop: 'Niet geopend' });
        return;
      }
      projectId = res.data.id;
      window.glasProjectId = projectId;
      localStorage.setItem(LS_PROJECT, projectId);
      zetHash(projectId);
      if (window.fotoLinksVergeten) fotoLinksVergeten();
      zetStaat(res.data.data || {});
      opslaanLokaal();
      laatsteJson = JSON.stringify(huidigeStaat());
      vuil = false;
      geladen = true;
      migreerTaken(projectId);
      if (window.takenLaden) takenLaden();
      if (window.logboekLaden) logboekLaden();
      luisterOpProject();
      el('cloudProjecten').style.display = 'none';
      if (window.glasToonApp) glasToonApp();
      statusOpgeslagen();
      controleerNaam();
    }, function (poging) { status('… Verbinden (' + poging + ')'); });
  };

  window.cloudNieuw = async function (voorstel, melding) {
    if (!melding && !await magVerlaten('een nieuw project aanmaken')) return;
    var naam = await appInvoer(melding || 'Waar gaat dit project over? Meestal het adres.',
      { kop: 'Nieuw project', waarde: voorstel || '',
        plaatshouder: 'bijv. Teststraat 12', ja: 'Aanmaken' });
    if (naam === null) return;
    if (!naam.trim()) {
      window.cloudNieuw('', 'Een project heeft een naam nodig. Meestal het adres.');
      return;
    }
    var bestaand = await zoekNaam(naam, null);
    if (bestaand) {
      window.cloudNieuw(naam, 'Er bestaat al een project met de naam \u2039' + bestaand.naam +
        '\u203a. Kies een andere naam, of open het bestaande project via de lijst.');
      return;
    }
    var meenemen = false;
    if (werkTeRedden && ingevuldeRijen(huidigeStaat()) > 0) {
      meenemen = await appVraag('De ruiten die nu op het scherm staan meenemen naar dit nieuwe ' +
        'project? De foto\'s van het vorige project zijn niet meer beschikbaar; de maten blijven ' +
        'gewoon staan.',
        { kop: 'Ruiten meenemen', ja: 'Meenemen', nee: 'Leeg beginnen' });
    }
    maakProject(naam, meenemen);
  };

  function maakProject(naam, meenemen) {
    sb.from('projecten').insert({
      naam: naam || '(naamloos)',
      datum: '',
      data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [],
              project: naam || '', datum: '', speling: '4', bijtelling: '11' },
      aantal_ruiten: 0, adres: '', open_taken: 0,
      gewijzigd_door: gebruiker.id
    }).select('id').single().then(function (res) {
      if (res.error || !res.data || !res.data.id) {
        appFout('Aanmaken mislukt: ' + ((res.error && res.error.message) ||
                'de database gaf geen nieuw project terug'), { kop: 'Niet aangemaakt' });
        return;
      }
      wegGemeld = false;
      geladen = true;
      projectId = res.data.id;
      window.glasProjectId = projectId;
      localStorage.setItem(LS_PROJECT, projectId);
      zetHash(projectId);
      luisterOpProject();
      werkTeRedden = false;
      if (meenemen) {
        // De ruiten blijven staan; de foto's horen bij het oude project en
        // zijn daar met dat project verdwenen. De ruiten die eraan hingen
        // komen bij 'zonder foto of tekening' terecht (v85).
        fotos = [];
        losseVerweesde();
        if (el('projectNaam')) el('projectNaam').value = naam || '';
        if (window.renderTabel) renderTabel();
        if (window.herbereken) herbereken();
        if (window.renderFotos) renderFotos();
        if (window.renderProject) renderProject();
      } else {
        rijen = []; volgendId = 1; fotos = []; projectInfo = {}; projectTaken = [];
        zetStaat({ project: naam, datum: '', speling: '4', bijtelling: '11' });
      }
      toonNaamWaarschuwing('');
      el('cloudProjecten').style.display = 'none';
      if (window.glasToonApp) glasToonApp();
      vuil = true;
      window.opslaan();
      synchroniseer();
    });
  }

  // Foto's moeten via de Storage-API weg; rechtstreeks uit de
  // opslagtabellen verwijderen staat Supabase niet toe. Daarom eerst
  // de map van dit project leegmaken, dan pas de projectrij.
  // De lijst komt per 500 bestanden binnen; bij een groot project bleef de
  // rest anders achter. Doorgaan tot de map leeg is, met een harde grens
  // zodat dit nooit blijft rondjes draaien (v85).
  function fotosOpruimen(id, ronde) {
    if (!sb) return Promise.resolve();
    ronde = ronde || 1;
    return sb.storage.from('projectfotos').list(id, { limit: 500 })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return null;
        var paden = res.data.map(function (f) { return id + '/' + f.name; });
        return sb.storage.from('projectfotos').remove(paden).then(function (weg) {
          if (paden.length === 500 && ronde < 20) return fotosOpruimen(id, ronde + 1);
          return weg;
        });
      })
      .catch(function (e) { console.warn('[cloud] foto\'s opruimen mislukt', e); });
  }

  window.cloudVerwijder = async function (id) {
    if (!await appVraag('Dit project definitief verwijderen? Dit geldt voor iedereen.\n' +
        'De foto\'s van dit project worden ook verwijderd.',
        { kop: 'Project verwijderen', ja: 'Definitief verwijderen', gevaarlijk: true })) return;

    var lijst = document.getElementById('cloudProjectLijst');
    if (lijst) lijst.style.opacity = '0.5';

    // Eerst de projectrij weg, dan pas de foto's. Andersom stonden bij een
    // mislukte verwijdering de foto's al onherstelbaar weg terwijl de app
    // meldde dat het niet gelukt was (v83).
    //
    // Let op de manier waarop hier afgehandeld wordt: in v83 stond hier een
    // keten waarin 'niets teruggekregen' zowel 'er ging iets mis' als 'er
    // waren geen foto's' betekende. Een project zonder foto's liet daardoor
    // de lijst grijs staan, bleef in het overzicht staan en hield de
    // koppeling met het verwijderde project vast (v85).
    var gelukt = false;
    var melding = '';
    try {
      var res = await sb.from('projecten').delete().eq('id', id).select('id');
      if (res && res.error) {
        melding = res.error.message;
      } else if (res && Array.isArray(res.data) && res.data.length === 0) {
        // Niets verwijderd. Bestaat hij nog, dan mag deze gebruiker het niet;
        // is hij er niet meer, dan was een ander ons voor.
        var na = await sb.from('projecten').select('id').eq('id', id).maybeSingle();
        if (!na.error && na.data) melding = 'je hebt hier geen rechten voor';
        else gelukt = true;
      } else {
        gelukt = true;
      }
    } catch (e) {
      melding = (e && e.message) || 'geen verbinding';
    }

    // De foto's pas opruimen als de rij echt weg is. Mislukt dat, dan is het
    // project alsnog verwijderd; de bestanden blijven dan achter, maar
    // niemand kan er nog bij.
    if (gelukt) {
      try { await fotosOpruimen(id); } catch (e) { console.warn('[cloud] foto\'s opruimen mislukt', e); }
    }

    if (lijst) lijst.style.opacity = '';

    if (!gelukt) {
      lijstenVernieuwen();
      appFout('Verwijderen mislukt: ' + melding + '. Het project staat er nog.',
              { kop: 'Niet verwijderd' });
      return;
    }

    if (id === projectId) {
      projectId = null;
      window.glasProjectId = null;
      geladen = false;
      clearTimeout(herstelKlok);
      if (kanaal) { kanaalZelfWeg = true; try { sb.removeChannel(kanaal); } catch (e) {} kanaal = null; }
      localStorage.removeItem(LS_PROJECT);
      // Het scherm leegmaken hoort erbij: anders typ je door in een project
      // dat niet meer bestaat en gaat dat werk alsnog verloren.
      localStorage.removeItem(LS_PENDING);
      localStorage.removeItem(LS_STATE);
      vuil = false;
      bezig = false;
      laatsteJson = null;
      zetStaat({});
      status('Project verwijderd', '#6b6862');
      zetHash(null);
      toonStart();
      return;
    }
    lijstenVernieuwen();
  };

  window.cloudProjectenTonen = function () {
    toonProjecten(false);
    setTimeout(function () {
      var veld = el('cloudZoekVeld');
      if (veld && window.innerWidth > 900) veld.focus();
    }, 60);
  };
  window.cloudSluitProjecten = function () { el('cloudProjecten').style.display = 'none'; };
  window.cloudUitloggen = uitloggen;
  window.cloudLogin = login;

  /* ─── opstarten ────────────────────────────────────────────── */

  // Openstaand lokaal werk wint van de database. Maar als er ruiten in
  // dat werk naar een foto wijzen die lokaal niet meer bestaat, halen we
  // die foto alsnog uit de database terug — met markeringen en tekening.
  // Lukt dat niet, dan maken we de ruiten los, zodat ze zichtbaar zijn en
  // het opslaan niet geblokkeerd raakt (v83).
  function herstelOntbrekendeFotos(serverStaat) {
    if (typeof rijen === 'undefined' || typeof fotos === 'undefined') return;
    var heb = {};
    (fotos || []).forEach(function (f) { if (f) heb[f.id] = true; });
    var mist = {};
    (rijen || []).forEach(function (r) { if (r && r.fotoId && !heb[r.fotoId]) mist[r.fotoId] = true; });
    if (!Object.keys(mist).length) return;

    var terug = 0;
    (Array.isArray(serverStaat.fotos) ? serverStaat.fotos : []).forEach(function (f) {
      if (f && mist[f.id]) { fotos.push(f); heb[f.id] = true; delete mist[f.id]; terug++; }
    });
    var los = losseVerweesde();

    if (window.renderFotos) renderFotos();
    if (window.renderTabel) renderTabel();
    if (window.herbereken) herbereken();

    if (window.appMelding && (terug || los)) {
      appMelding((terug ? terug + (terug === 1 ? ' foto is' : ' foto\'s zijn') +
                   ' teruggehaald uit de opgeslagen versie. ' : '') +
                 (los ? los + (los === 1 ? ' ruit hoorde' : ' ruiten hoorden') +
                   ' bij een foto die nergens meer te vinden is; ' +
                   (los === 1 ? 'die staat' : 'die staan') + ' nu bij "Zonder foto of tekening". ' : '') +
                 'Controleer de invoer voordat je verder gaat.',
                 { kop: 'Opname hersteld', soort: 'letop' });
    }
  }

  /* ─── verbinding kwijt en weer terug ───────────────────────── */
  // De stand van de server is binnen (true) of nog niet (false). Zolang
  // hij niet binnen is, werkt de app lokaal door en blijft hij proberen.
  var geladen = false;
  var herstelPoging = 0;
  var herstelKlok = null;
  var hartslag = null;

  var wegGemeld = false;
  var werkTeRedden = false;   // project weg, maar er staat nog invoer op het scherm

  // Het geopende project bestaat niet meer — verwijderd door een collega,
  // of de rechten zijn weg. Eén keer duidelijk melden, en niet doen alsof
  // er nog opgeslagen wordt (v85).
  function projectWeg() {
    status('⚠ Project bestaat niet meer', '#a3231a');
    geladen = false;
    clearTimeout(herstelKlok);
    werkTeRedden = ingevuldeRijen(huidigeStaat()) > 0;
    if (wegGemeld) return;
    wegGemeld = true;
    if (window.appFout) {
      appFout('Dit project bestaat niet meer op de server; iemand heeft het verwijderd. ' +
              'Je invoer staat nog op dit apparaat. Maak een nieuw project aan: de app vraagt ' +
              'dan of de ruiten van dit scherm mee moeten. De foto\'s van het oude project ' +
              'zijn wel weg.',
              { kop: 'Project bestaat niet meer' });
    }
  }

  function mislukt(wat) {
    geladen = false;
    status('⚠ Geen verbinding — lokaal', '#a3231a');
    planHerstel();
    if (wat) console.warn('[cloud] ' + wat + ' mislukt; opnieuw proberen');
  }

  function planHerstel() {
    clearTimeout(herstelKlok);
    // 5, 10, 20, dan elke 30 seconden. Zo staat de app na een tunnel of
    // een wifi-wissel vanzelf weer in verbinding.
    var wacht = Math.min(30000, 5000 * Math.pow(2, Math.min(herstelPoging, 3)));
    herstelKlok = setTimeout(herstelProbeer, wacht);
  }

  function herstelProbeer() {
    if (!sb || !gebruiker || !projectId || geladen) return;
    if (!navigator.onLine) { planHerstel(); return; }
    status('… Verbinden');
    metHerkansing(function () {
      return sb.from('projecten').select('id,data,updated_at').eq('id', projectId).maybeSingle();
    }, (function (res) {
        if (res.error) {
          // Een sessie die verlopen is geeft dezelfde fout als geen
          // verbinding. getSession() vernieuwt hem als dat nodig is, zodat
          // de volgende poging wél langs de beveiliging komt.
          try { if (sb.auth && sb.auth.getSession) sb.auth.getSession(); } catch (e) {}
          herstelPoging++; mislukt('verbinden'); return;
        }
        geladen = true;
        herstelPoging = 0;
        clearTimeout(herstelKlok);
        if (!res.data) { projectWeg(); return; }
        luisterOpProject();
        if (vuil || localStorage.getItem(LS_PENDING) === '1') {
          vuil = true;
          synchroniseer();
          return;
        }
        // Wat er intussen op de server veranderd is, langs dezelfde weg als
        // een melding van een collega: die weet wat er moet gebeuren als er
        // op dit apparaat getypt wordt.
        if (vingerafdruk(res.data.data || {}) !== vingerafdruk(huidigeStaat())) {
          vanElders({ data: res.data.data });
        } else {
          statusOpgeslagen();
        }
      }));
  }

  // Elke vijf minuten even voelen of de verbinding er nog is, maar alleen
  // als de app in beeld staat en er niets openstaat. Zo klopt het
  // statuspilletje met de werkelijkheid in plaats van met de laatste keer
  // dat er iets gebeurde.
  function startHartslag() {
    clearInterval(hartslag);
    hartslag = setInterval(function () {
      if (!sb || !gebruiker || !projectId) return;
      if (document.visibilityState !== 'visible') return;
      if (vuil || bezig) return;
      if (!navigator.onLine) { mislukt(null); return; }
      if (!geladen) { herstelProbeer(); return; }
      sb.from('projecten').select('id').eq('id', projectId).maybeSingle()
        .then(function (res) {
          if (res.error) { herstelPoging = 0; mislukt('hartslag'); return; }
          if (!res.data) { projectWeg(); return; }
          if (!kanaalGezond()) luisterOpProject();
        }, function () { herstelPoging = 0; mislukt('hartslag'); });
    }, 300000);
  }

  function start() {
    haalData();
    startHartslag();
    // Staat er een project in het webadres, dan wint dat: zo opent een
    // gedeelde link bij iedereen hetzelfde project (v87).
    var uitHash = hashProject();
    if (uitHash) {
      // Let op: dit moet ook kloppen als start() een tweede keer langskomt
      // (bijvoorbeeld na inloggen op een pagina die al een project in het
      // webadres had). Stond het project uit de link al open, dan blijft
      // het open; eerder viel de app dan terug naar het startscherm en ging
      // er daarna niets meer omhoog (v87).
      if (uitHash !== projectId) {
        projectId = uitHash;
        window.glasProjectId = projectId;
        localStorage.setItem(LS_PROJECT, projectId);
        localStorage.removeItem(LS_PENDING);
        vuil = false;
      }
    } else if (projectId && localStorage.getItem(LS_PENDING) !== '1') {
      // Geen link met een project erin en niets wat nog omhoog moet: dan
      // begin je op het startscherm en kies je zelf. Het laatst geopende
      // project staat daar als snelkoppeling (v87).
      try {
        localStorage.setItem(LS_LAATST, JSON.stringify({ id: projectId, naam: '', op: Date.now() }));
      } catch (e) {}
      projectId = null;
      window.glasProjectId = null;
      localStorage.removeItem(LS_PROJECT);
    }
    if (projectId) {
      // Staat dit project al binnen, dan niet opnieuw ophalen: dat zou het
      // werk op het scherm overschrijven met de stand van de server.
      if (geladen) { if (window.glasToonApp) glasToonApp(); return; }
      metHerkansing(function () {
        return sb.from('projecten').select('id,data,updated_at').eq('id', projectId).maybeSingle();
      }, (function (res) {
          // Een fout is iets anders dan een project dat niet bestaat.
          // Eerder werd élke fout — ook 'geen verbinding' — behandeld als
          // 'project weg': de koppeling werd gewist en daarna ging er
          // niets meer omhoog, terwijl het werk op het scherm stond (v83).
          if (res.error) {
            // Geen verbinding is geen eindstation: blijven proberen, en de
            // melding weghalen zodra het wél lukt. Anders bleef er rood
            // 'Geen verbinding' staan tot er toevallig iets opgeslagen werd,
            // terwijl de app intussen allang weer online was (v84).
            laatsteJson = JSON.stringify(huidigeStaat());
            if (localStorage.getItem(LS_PENDING) === '1') { vuil = true; }
            luisterOpProject();
            mislukt('verbinden');
            return;
          }
          geladen = true;
          herstelPoging = 0;
          if (!res.data) { projectId = null; localStorage.removeItem(LS_PROJECT); toonProjecten(); return; }
          // Lokale, nog niet gesynchroniseerde wijzigingen winnen.
          if (localStorage.getItem(LS_PENDING) === '1') {
            // Openstaand werk wint; zetStaat wordt hier dus niet gedraaid en
            // 'Opgenomen door' moet apart nagelopen worden.
            vulOpnemer();
            if (window.glasToonApp) glasToonApp();
            herstelOntbrekendeFotos(res.data.data || {});
            vuil = true;
            status('⚠ Nog niet opgeslagen', '#8a5a00');
            laatsteJson = JSON.stringify(huidigeStaat());
            luisterOpProject();
            synchroniseer();
          } else {
            zetStaat(res.data.data || {});
            opslaanLokaal();
            laatsteJson = JSON.stringify(huidigeStaat());
            if (window.glasToonApp) glasToonApp();
            statusOpgeslagen();
            migreerTaken(projectId);
            if (window.takenLaden) takenLaden();
            if (window.logboekLaden) logboekLaden();
            luisterOpProject();
          }
        }), function (poging) { status('… Verbinden (' + poging + ')'); });
    } else {
      toonStart();
    }
  }

  function init() {
    laadGecachteData();

    if (!window.supabase || !cfg.url || cfg.url.indexOf('VUL_IN') === 0) {
      status('⚠ Niet verbonden — alleen lokaal', '#a3231a');
      var k = el('cloudProjectKnop'); if (k) k.style.display = 'none';
      return;
    }
    sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    window.glasSupabase = sb;

    sb.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        gebruiker = res.data.session.user;
        verbergLogin();
        start();
      } else {
        toonLogin('');
      }
    });

    if (el('projectNaam')) el('projectNaam').addEventListener('blur', controleerNaam);

    el('cloudWachtwoord').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') login();
    });

    var herlaadt = false;
    var stilleOvername = false;
    var registratie = null;

    // Handmatige uitweg: controleren en zo nodig meteen overschakelen.
    // Handig als een melding weggeklikt is, of als er iets blijft hangen.
    window.appBijwerken = function () {
      if (!registratie) { location.reload(); return; }
      status('… Versie controleren');
      registratie.update().catch(function () {}).then(function () {
        if (registratie.waiting) {
          if (vuil) synchroniseer();
          setTimeout(function () { registratie.waiting.postMessage('skipWaiting'); }, vuil ? 900 : 0);
        } else {
          location.reload();
        }
      });
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        registratie = reg;
        // Bij het openen en bij elke terugkeer naar de app kijken of er
        // een nieuwe versie op de server staat.
        reg.update().catch(function () {});
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') reg.update().catch(function () {});
        });

        function let_op(nieuwe) {
          if (!nieuwe) return;
          nieuwe.addEventListener('statechange', function () {
            if (nieuwe.state === 'installed' && navigator.serviceWorker.controller) {
              beoordeel(nieuwe);
            }
          });
        }
        if (reg.waiting && navigator.serviceWorker.controller) beoordeel(reg.waiting);
        reg.addEventListener('updatefound', function () { let_op(reg.installing); });
      }).catch(function () {});

      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (herlaadt) return;
        // Bij een stille overname draait er al dezelfde versie; herladen
        // zou de gebruiker alleen maar uit zijn werk halen.
        if (stilleOvername) { stilleOvername = false; return; }
        herlaadt = true;
        location.reload();
      });
    }

    // Een wachtende service worker betekent niet altijd dat de pagina
    // verouderd is: de bestanden worden namelijk eerst van het net
    // gehaald en pas daarna uit de cache. Blijkt zijn versienummer
    // gelijk aan wat er draait, dan laten we hem stilletjes overnemen
    // in plaats van te melden dat er iets nieuws is.
    function beoordeel(worker) {
      var kanaal = new MessageChannel();
      var beantwoord = false;
      kanaal.port1.onmessage = function (e) {
        beantwoord = true;
        var versie = e.data && e.data.versie;
        if (versie && typeof APP_VERSIE !== 'undefined' && versie === APP_VERSIE) {
          stilleOvername = true;
          worker.postMessage('skipWaiting');
        } else {
          meldNieuweVersie(worker);
        }
      };
      try { worker.postMessage({ vraag: 'versie' }, [kanaal.port2]); } catch (e) {}
      // Antwoordt hij niet (oudere versie zonder die mogelijkheid), dan
      // is het hoe dan ook een andere versie.
      setTimeout(function () { if (!beantwoord) meldNieuweVersie(worker); }, 1200);
    }

    function meldNieuweVersie(worker) {
      toonMelding('Er is een nieuwe versie van de app beschikbaar.',
        'Nu bijwerken', function () {
          if (vuil) synchroniseer();
          // Even wachten zodat openstaand werk nog omhoog kan.
          setTimeout(function () { worker.postMessage('skipWaiting'); }, vuil ? 900 : 0);
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
