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
  // In try: staat opslag geblokkeerd (Safari 'Blokkeer alle cookies'), dan
  // gooit localStorage een fout, en tot v102 startte cloud.js dan helemaal
  // niet — geen inloggen, geen opslaan (gevonden bij de controle van v103).
  var projectId = null;
  try { projectId = localStorage.getItem(LS_PROJECT) || null; } catch (e) {}
  // Van welk project is de inhoud die nu op het scherm staat? Bij het
  // opstarten is dat de kopie op het apparaat (v103). Alleen als dat het
  // project is dat open staat, mag de app opslaan. Tot v102 kon de inhoud
  // van project A naar project B gaan: een link naar B geopend zonder
  // bereik, A stond nog op het scherm, en wie typte, overschreef B.
  var basisVan = (function () {
    try {
      var k = JSON.parse(localStorage.getItem(LS_STATE) || 'null');
      if (!k) return null;
      return ('_projectId' in k) ? k._projectId : projectId;
    } catch (e) { return null; }
  })();
  // Op welk volgnummer van de server de inhoud op het scherm voortbouwt
  // (v106, 24_bewerkslot.sql: data._rev). Gaat mee bij elke opslag als
  // _basis; de database weigert werk op een oudere stand als intussen een
  // ander apparaat opsloeg. Bewaard bij de kopie op het apparaat, zodat het
  // ook na een herstart klopt. null = onbekend (telt als ouder).
  var basisRev = (function () {
    try {
      var k = JSON.parse(localStorage.getItem(LS_STATE) || 'null');
      return k && typeof k._basis === 'number' ? k._basis : null;
    } catch (e) { return null; }
  })();
  function revVan(d) {
    var r = d && d._rev;
    return typeof r === 'number' ? r : (/^\d+$/.test(String(r == null ? '' : r)) ? parseInt(r, 10) : null);
  }
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

  // De database zit vol (v103). Op het gratis plan zet Supabase hem dan op
  // alleen-lezen: elke opslag wordt geweigerd. Dat moet je zien, met wat
  // je moet doen; het werk blijft op het apparaat en gaat later omhoog.
  function databaseVol(err) {
    if (!err) return false;
    var t = String((err.code || '') + ' ' + (err.message || '')).toLowerCase();
    return t.indexOf('25006') >= 0 || t.indexOf('read-only transaction') >= 0 ||
           t.indexOf('read only transaction') >= 0 || t.indexOf('53100') >= 0 ||
           t.indexOf('disk full') >= 0 || t.indexOf('no space left') >= 0 ||
           t.indexOf('quota') >= 0 || t.indexOf('exceed') >= 0 && t.indexOf('size') >= 0;
  }
  window.glasDatabaseVol = databaseVol;
  var volGemeld = false;

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

  /* ─── versie (v99) ─────────────────────────────────────────── */
  // 'v99' → 99. Zo zijn versies te vergelijken ('v100' > 'v99').
  function versieNummer(v) {
    var n = parseInt(String(v || '').replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }
  var versieGeweigerd = false;     // de server weigerde onze versie (v99)
  var VERSIE_NR = versieNummer(typeof APP_VERSIE !== 'undefined' ? APP_VERSIE : '');

  function verouderdeVersie(fout) {
    return /Verouderde app-versie/i.test(String((fout && fout.message) || ''));
  }

  // Komt er een project binnen dat een nieuwere versie heeft opgeslagen,
  // dan staat er een update klaar die dit apparaat nog niet heeft: meteen
  // laten zoeken, in plaats van te wachten tot de opslag geweigerd wordt.
  function nieuwereVersieGezien(data) {
    if (data && versieNummer(data._versieNr) > VERSIE_NR && window.glasZoekUpdate) {
      window.glasZoekUpdate(true);
    }
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
    nieuwereVersieGezien(state);
    basisVan = projectId;
    // De stand van de server (of leeg): daarop bouwt het werk nu voort (v106).
    basisRev = revVan(state);
    // Een selectie hoort bij de ruiten van het vorige scherm (v91).
    if (window.bulkSelectieLeeg) bulkSelectieLeeg();
    rijen = state.rijen || [];
    // Projecten van vóór v63 dragen nog waarden uit de oude keuzelijst
    // Glasbewerking. Omzetten moet hier gebeuren en niet alleen bij het
    // laden van de lokale kopie, anders blijft elk project dat uit de
    // cloud komt op de oude waarden staan.
    if (window.bewerkingBijwerken) bewerkingBijwerken(rijen);
    volgendId = state.volgendId || (rijen.length + 1);
    fotos = state.fotos || [];
    projectInfo = state.info || {};
    // v120 (beveiliging): vreemde nummers van ruiten en foto's niet in de HTML.
    // Is er iets hersteld, dan gaat de herstelde stand ook naar de server
    // (anders blijft hij daar staan tot iemand iets wijzigt).
    if (window.glasVeiligeIds && glasVeiligeIds()) {
      var hersteldVoor = projectId;
      setTimeout(function () {
        if (projectId !== hersteldVoor || !projectId) return;
        vuil = true;
        if (window.glasMarkeerWerk) glasMarkeerWerk();
        window.opslaan();
      }, 1500);
    }
    // Hier niet meer 'Opgenomen door' invullen (v93): openen is geen
    // inmeten. Zie vulOpnemer().
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
    // Als laatste: ook de stap die voegRijenToe hierboven maakte hoort bij
    // het klaarzetten, niet bij iets wat de gebruiker ongedaan wil maken.
    // Zonder dit zette Cmd+Z de inhoud van het vorige project in dit
    // project, en die ging naar de database (v91).
    if (window.undoLeeg) undoLeeg();
  }

  // De naam waarmee je bent ingelogd: alles vóór de @ uit het
  // e-mailadres, dus jan@voorbeeld.nl wordt 'jan'.
  function gebruikersNaam() {
    if (!gebruiker || !gebruiker.email) return '';
    return String(gebruiker.email).split('@')[0].trim();
  }

  // 'Opgenomen door' (v93, keuze van Jan). Tot v92 vulde de app hier de
  // naam in van wie het project als eerste ópende, en daarna kon iedereen
  // het veld gewoon overtypen. Nu:
  //  * het wordt de naam van wie de eerste ruit met inhoud invult (op dit
  //    apparaat, in deze sessie, of met werk dat nog van eerder openstond);
  //  * daarna staat het vast. Wijzigen kan alleen via de knop naast het
  //    veld, met je eigen wachtwoord, en dat komt in het logboek
  //    (project.js, opnemerWijzig).
  var werkVanEerder = false;   // openstaand werk van dit apparaat bij het laden

  function vulOpnemer() {
    if (typeof projectInfo !== 'object' || !projectInfo) return;
    if (String(projectInfo.opnemer || '').trim()) return;
    if (!projectId || !(gebruikerDeedIets || werkVanEerder)) return;
    var ietsIngevuld = (typeof rijen === 'undefined' ? [] : rijen)
      .some(function (r) { return heeftInhoud(r); });
    if (!ietsIngevuld) return;
    var naam = gebruikersNaam();
    if (!naam) return;
    projectInfo.opnemer = naam;
    // Geen aparte logboekregel: wie de eerste ruit opsloeg, staat daar al.
    // Een notitie hier brak de werkgang in het logboek in tweeën. Alleen
    // het wíjzigen (met wachtwoord) krijgt een eigen regel.
    // Alleen dit ene veld bijwerken, niet het hele tabblad: renderProject()
    // bouwt alle velden opnieuw op, en wie daar net aan het typen was,
    // raakte zijn cursor kwijt.
    var vak = el('pi-opnemer');
    if (vak) vak.value = naam;
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
    // v120: je telefoonnummer (voor op de bestellijst) alvast ophalen.
    if (window.glasMijnLaden) glasMijnLaden();
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

  // Hoeveel ruiten staan er in dit project? Niet het aantal regels, maar de
  // som van de kolom Aantal: één regel met aantal 4 is vier ruiten. Tot v88
  // telde dit regels, en dan zei de projectenlijst "1 ruit" bij een project
  // van vier (v89).
  function ingevuldeRijen(state) {
    var n = 0;
    (state.rijen || []).forEach(function (r) {
      if (!r || !(r.glasType || r.breedte || r.hoogte)) return;
      var a = parseInt(r.aantal, 10);
      n += (isFinite(a) && a > 0) ? a : 1;
    });
    return n;
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

  // De kopie op het apparaat. Met het project erbij (v103): zo kan de app
  // bij het opstarten zien of 'werk dat nog omhoog moet' wel bij het project
  // hoort dat opengaat (zie start()).
  var lokaalGemeld = false;
  function opslaanLokaal() {
    var staat = huidigeStaat();
    try {
      // _projectId: van welk project de inhoud is (basisVan), niet welk
      // project open staat. Die twee verschillen zolang een project nog
      // niet geladen is; wie dan typt, typt in de inhoud van het vorige
      // (v103).
      // v120: staat er nog werk van een ánder project dat niet omhoog is (een
      // tweede tabblad, zonder bereik), dan dat eerst apart bewaren. Er is
      // één kopie per apparaat; overschrijven maakte dat werk stil kwijt.
      try {
        var oud = JSON.parse(localStorage.getItem(LS_STATE) || 'null');
        if (oud && oud._projectId && oud._projectId !== (basisVan || null) && localStorage.getItem(LS_PENDING) === '1') {
          reddingBewaar(oud, 'werk uit een ander tabblad');
          setTimeout(reddingenUploaden, 1000);
        }
      } catch (e) {}
      localStorage.setItem(LS_STATE, JSON.stringify(Object.assign({}, staat, { _projectId: basisVan || null, _basis: basisRev })));
      return true;
    } catch (e) {
      // Vol of geblokkeerd. Tot v102 werd dit stil ingeslikt: de oude kopie
      // bleef staan (misschien van een ander project), met de vlag 'moet
      // nog omhoog' erbij, en na een herstart zonder bereik ging die oude
      // stand naar de server. Nu: de oude kopie weg, zodat hij nooit als
      // werk van nu kan gelden, en het één keer zeggen (v103).
      try { localStorage.removeItem(LS_STATE); } catch (e2) {}
      if (!lokaalGemeld && window.appFout) {
        lokaalGemeld = true;
        appFout('Dit apparaat kan het werk niet meer bewaren (het geheugen van de browser zit vol, ' +
                'of opslag staat uit). Zolang de app open is gaat het werk gewoon naar de server, ' +
                'maar sluit de app niet zonder verbinding: dan is wat nog niet verstuurd is weg.',
                { kop: 'Niet bewaard op dit apparaat' });
      }
      return false;
    }
  }

  // Hoort de kopie op het apparaat bij dit project? Kopieën van vóór v103
  // hebben geen _projectId; die gelden (zoals altijd) als van dit project.
  function kopieVan(id) {
    try {
      var k = JSON.parse(localStorage.getItem(LS_STATE) || 'null');
      if (!k) return 'geen';
      if (!('_projectId' in k)) return 'onbekend';
      return k._projectId === id ? 'ja' : 'nee';
    } catch (e) { return 'geen'; }
  }

  /* ─── Redding (v103) ──────────────────────────────────────────
     Werk dat niet bij het open project hoort, mag dat project nooit
     overschrijven. Maar weggooien mag ook niet (harde eis van Jan). Het
     gaat daarom als APART project naar de server: "<naam> (apart bewaard
     13-10 14:05 - julian, iPhone)" (wie en welk apparaat: sinds v108). Zo staat het gewoon in de projectenlijst en kan Jan
     het openen, vergelijken of naar de prullenbak slepen.
     Eerst op het apparaat (glasopname_redding, een lijst), dan omhoog.
     Lukt omhoog niet (geen bereik), dan blijft het op het apparaat staan
     en probeert de app het bij de volgende start opnieuw. Gaat het
     antwoord van de server verloren nadat het project al gemaakt was, dan
     kan er een dubbele kopie komen: liever twee dan nul. */
  var LS_REDDING = 'glasopname_redding';

  function reddingen() {
    try {
      var r = JSON.parse(localStorage.getItem(LS_REDDING) || '[]');
      // Tot v103 in ontwikkeling stond hier één los object; dat ook meenemen.
      if (r && !Array.isArray(r)) r = [{ op: Date.now(), data: r }];
      return Array.isArray(r) ? r : [];
    } catch (e) { return []; }
  }

  function reddingBewaar(data, reden) {
    if (!data || !ingevuldeRijen(data) && !(data.fotos || []).length &&
        !(data.info && Object.keys(data.info).some(function (k) { return data.info[k]; }))) {
      return true;    // niets ingevuld: niets te redden
    }
    var lijst = reddingen();
    // Wie en op welk apparaat (v108, wens van Jan): dat komt in de naam van
    // het aparte project, zodat je ziet van wie het werk is.
    var app = window.glasBewerkslotVelden ? glasBewerkslotVelden() : {};
    var wie = [gebruikersNaam(), app._apparaatSoort].filter(Boolean).join(', ');
    lijst.push({ op: Date.now(), reden: reden || '', data: data, wie: wie });
    try {
      localStorage.setItem(LS_REDDING, JSON.stringify(lijst));
      return true;
    } catch (e) {
      return false;
    }
  }

  function tweeCijfers(n) { return (n < 10 ? '0' : '') + n; }

  var reddingBezig = false;
  var reddingFout = '';
  function reddingenUploaden() {
    if (!sb || !gebruiker || reddingBezig || !navigator.onLine) return Promise.resolve();
    var lijst = reddingen();
    if (!lijst.length) return Promise.resolve();
    reddingBezig = true;
    var namen = [];
    var stap = Promise.resolve();
    lijst.forEach(function (r) {
      stap = stap.then(function () {
        var d = JSON.parse(JSON.stringify(r.data || {}));
        delete d._projectId;
        delete d._sessie;
        d._versieNr = VERSIE_NR;
        var t = new Date(r.op || Date.now());
        var naam = (d.project || '(naamloos)') + ' (apart bewaard ' + tweeCijfers(t.getDate()) + '-' +
                   tweeCijfers(t.getMonth() + 1) + ' ' + tweeCijfers(t.getHours()) + ':' +
                   tweeCijfers(t.getMinutes()) + (r.wie ? ' - ' + r.wie : '') + ')';
        function invoegen(n, poging) {
          d.project = n;
          return sb.from('projecten').insert({
            naam: n, datum: d.datum || '', data: d,
            aantal_ruiten: ingevuldeRijen(d), adres: adresVan(d),
            status: (d.info && d.info.status) || 'aangemaakt',
            gewijzigd_door: gebruiker.id
          }).select('id').single().then(function (res) {
            // Naam toevallig al in gebruik: dan met een volgnummer erachter.
            if (res.error && res.error.code === '23505' && poging < 5) {
              return invoegen(naam + ' ' + (poging + 2), poging + 1);
            }
            if (res.error || !res.data) throw res.error || new Error('geen antwoord');
            return n;
          });
        }
        return invoegen(naam, 0).then(function (n) {
          namen.push(n);
          // Pas na een geslaagde opslag van het apparaat halen.
          var rest = reddingen().filter(function (x) { return x.op !== r.op; });
          try {
            if (rest.length) localStorage.setItem(LS_REDDING, JSON.stringify(rest));
            else localStorage.removeItem(LS_REDDING);
          } catch (e) {}
        }, function (f) {
          // Blijft op het apparaat; de volgende start of 'online' probeert
          // het opnieuw. Eén die niet lukt, houdt de rest niet tegen.
          reddingFout = (f && f.message) || String(f);
          console.warn('[cloud] apart bewaren nog niet gelukt: ' + reddingFout);
        });
      });
    });
    return stap.then(function () {}, function () {}).then(function () {
      reddingBezig = false;
      if (namen.length && window.appMelding) {
        appMelding('Op dit apparaat stond werk dat niet bij het open project hoorde. Het is niet ' +
                   'weggegooid en heeft ook niets overschreven: het staat nu als apart project in de ' +
                   'lijst: ' + namen.map(function (n) { return '‹' + n + '›'; }).join(', ') +
                   '. Bekijk het en gooi het weg als je het niet nodig hebt.',
                   { kop: 'Werk apart bewaard', soort: 'letop' });
      }
      // Alleen de lijst op het startscherm verversen als dat in beeld is.
      // Tot v105 haalde dit het startscherm óver een open project heen; sinds
      // v106 gebeurt apart bewaren ook midden in het werk (een collega nam
      // het project over), en dan stond je ineens op het startscherm.
      if (window.startVernieuwen && namen.length && (!projectId || document.body.classList.contains('op-start'))) {
        try { startVernieuwen(); } catch (e) {}
      }
    });
  }
  // Voor het startscherm: hoeveel werk wacht er nog om apart bewaard te worden.
  window.glasReddingen = function () { return { aantal: reddingen().length, fout: reddingFout }; };

  // Het werk op het scherm hoort niet bij dit project: apart bewaren en dan
  // de stand van de server tonen. Geeft false als bewaren op het apparaat
  // niet lukte; dan blijft alles staan zoals het is (niets overschrijven).
  function reddenEnLaden(serverData, reden) {
    var mijn = huidigeStaat();
    if (vuil || localStorage.getItem(LS_PENDING) === '1') {
      if (!reddingBewaar(mijn, reden)) {
        if (window.appFout) {
          appFout('Op dit apparaat staat werk dat niet bij dit project hoort, en het apparaat kan het ' +
                  'niet apart bewaren (geheugen vol). Daarom is er niets veranderd. Sluit de app niet ' +
                  'en vraag hulp.', { kop: 'Niet geladen' });
        }
        return false;
      }
    }
    try { localStorage.removeItem(LS_PENDING); } catch (e) {}
    vuil = false;
    zetStaat(serverData || {});
    opslaanLokaal();
    laatsteJson = JSON.stringify(huidigeStaat());
    if (window.glasToonApp) glasToonApp();
    reddingenUploaden();
    return true;
  }

  /* ─── bewerkslot (v106) ──────────────────────────────────────
     Eén apparaat tegelijk bewerkt een project (bewerkslot.js,
     24_bewerkslot.sql). Hier wat dat betekent voor het opslaan. */

  // Iets veranderd terwijl dit apparaat alleen mocht kijken (dat zou niet
  // moeten kunnen; het scherm staat dan op slot). Wordt nooit verstuurd;
  // vóór er een andere stand op het scherm komt, gaat het apart.
  var kijkWijziging = false;

  window.glasKijkModusAan = function () {
    gebruikerDeedIets = false;
    kijkWijziging = false;
  };

  // Het werk op het scherm kan niet in het project (een ander heeft het):
  // apart bewaren, dan de stand van de server laden. Niets gaat verloren en
  // niets wordt overschreven.
  // Loopt er al een (de weigering van de database en het bericht "een ander
  // heeft het overgenomen" kunnen tegelijk komen), dan niet nog eens: anders
  // kwam de stand van de server als tweede "apart" project in de lijst.
  var apartLoopt = null;
  // alsNiets: de melding als er niets apart hoefde (het werk was gelijk aan
  // de server), bijvoorbeeld "julian heeft dit project overgenomen" (v107).
  function apartEnLaden(reden, melding, alsNiets) {
    if (apartLoopt) return apartLoopt;
    apartLoopt = apartEnLadenNu(reden, melding, alsNiets);
    apartLoopt.then(function () { apartLoopt = null; }, function () { apartLoopt = null; });
    return apartLoopt;
  }
  // Heeft het werk op dit apparaat iets wat de server niet heeft? Lege
  // regels, stempels en dergelijke tellen niet (v106). Zo komt er geen apart
  // project bij dat alleen een kopie is (bijvoorbeeld een tweede tabblad
  // dat zichzelf klaarzette, of een app die meekeek zonder iets te doen).
  function inhoudVan(d) {
    var n = normaliseer(d);
    var rijen = n.rijen.filter(function (r) {
      return r && Object.keys(r).some(function (k) {
        return k !== 'id' && !VELDEN_BUITEN_SPOOR[k] && r[k] !== '' && r[k] != null &&
          !(k === 'aantal' && String(r[k]) === '1') && !(k === 'maatsoort') &&
          !(k === 'rooster' && r[k] === 'Nee') && !(k === 'glasbewerking' && /standaard/.test(r[k])) &&
          !(k === 'roedenverdeling' && /^Geen/.test(r[k]));
      });
    }).map(ruitAfdruk).sort();
    return diepCanon({ rijen: rijen, fotos: n.fotos, info: n.info, project: n.project, datum: n.datum,
                       speling: n.speling, bijtelling: n.bijtelling });
  }

  function apartEnLadenNu(reden, melding, alsNiets) {
    var pid = projectId;
    if (!sb || !pid) return Promise.resolve(apartBewarenEnLaden(reden, melding, null, alsNiets));
    // Eerst de stand van de server: is er wel iets dat anders is?
    return sb.from('projecten').select('data,status').eq('id', pid).maybeSingle().then(function (res) {
      var server = (pid === projectId && res && !res.error && res.data) ? res.data : null;
      return apartBewarenEnLaden(reden, melding, server, alsNiets);
    }, function () { return apartBewarenEnLaden(reden, melding, null, alsNiets); });
  }

  // server: de rij van de server (of null als ophalen niet lukte).
  function apartBewarenEnLaden(reden, melding, server, alsNiets) {
    var nodig = !server || inhoudVan(huidigeStaat()) !== inhoudVan(server.data || {});
    if (!nodig) {
      if (alsNiets) overgenomenMelding(alsNiets);
      vuil = false;
      kijkWijziging = false;
      try { localStorage.removeItem(LS_PENDING); } catch (e) {}
      zetStaat(server.data || {});
      statusVanServer(server);
      opslaanLokaal();
      laatsteJson = JSON.stringify(huidigeStaat());
      statusOpgeslagen();
      return true;
    }
    // De bestellingen van dit apparaat (vóór de stand van de server erover
    // komt): die moeten in het project, niet alleen apart (zie hieronder).
    var eigenInfo = JSON.parse(JSON.stringify(projectInfo || {}));
    if (!reddingBewaar(huidigeStaat(), reden)) {
      if (window.appFout) {
        appFout('Je werk kon niet in het project, en dit apparaat kan het ook niet apart bewaren ' +
                '(geheugen vol). Daarom is er niets veranderd. Sluit de app niet en vraag hulp.',
                { kop: 'Niet opgeslagen' });
      }
      return Promise.resolve(false);
    }
    vuil = false;
    kijkWijziging = false;
    try { localStorage.removeItem(LS_PENDING); } catch (e) {}
    var pid = projectId;
    // Geeft terug of de stand van de server geladen is (het werk zelf staat
    // dan al veilig apart op het apparaat).
    var geladenOk = false;
    var klaar = function () {
      reddingenUploaden();
      if (melding && window.appMelding) appMelding(melding, { kop: 'Je werk staat apart', soort: 'letop' });
      return geladenOk;
    };
    if (server && pid === projectId) {
      zetStaat(server.data || {});
      statusVanServer(server);
      opslaanLokaal();
      laatsteJson = JSON.stringify(huidigeStaat());
      statusOpgeslagen();
      geladenOk = true;
      return bestellingenAlsnog(pid, eigenInfo).then(klaar);
    }
    return Promise.resolve(klaar());
  }

  // Een bestelling ("Ja, verstuurd") die op dit apparaat is vastgelegd, maar
  // niet in het project kon (een ander had het intussen): toch in het project
  // zetten, anders bestelt die ander alles nog een keer (beoordeling v106).
  // Samenvoegen zoals altijd (bestellingenSamenvoegen), dan alleen het
  // bestel-deel naar de server (24_bewerkslot.sql, glas_bestellingen_erbij).
  // Lukt dat niet, dan staat de bestelling in het aparte project en zegt de
  // app het met nadruk.
  function bestellingenAlsnog(pid, eigenInfo) {
    var eigen = Array.isArray(eigenInfo.bestellingen) ? eigenInfo.bestellingen : [];
    if (!eigen.length || !window.bestellingenSamenvoegen) return Promise.resolve();
    var opServer = {};
    ((projectInfo || {}).bestellingen || []).forEach(function (b) { if (b && b.op) opServer[b.op] = true; });
    var nieuw = eigen.filter(function (b) { return b && b.op && !b.ingetrokken && !opServer[b.op]; })
      .map(function (b) { return window.korteDatum ? korteDatum(b.op, true) : b.op; }).join(', ');
    var uit = bestellingenSamenvoegen(eigenInfo);
    if (!uit) return Promise.resolve();
    var i = projectInfo || {};
    return Promise.resolve(sb.rpc('glas_bestellingen_erbij', {
      p_project: pid, p_bestellingen: i.bestellingen || [], p_besteld: i.besteld || null,
      p_status: i.status || '', p_slot: i.slot || null
    })).then(function (r) {
      if (r && !r.error) {
        if (r.data && r.data.rev != null) basisRev = revVan({ _rev: r.data.rev });
        laatsteJson = JSON.stringify(huidigeStaat());
        opslaanLokaal();
        if (window.renderBestellijst) renderBestellijst();
        if (window.renderProject) renderProject();
        // v120: bestelde een ander intussen ook (dubbel), dan dát zeggen,
        // niet "zodat niemand hem nog een keer bestelt".
        if (window.glasDubbelBestelMelding && glasDubbelBestelMelding()) return;
        if (window.appMelding) {
          appMelding('Je bestelling (' + (nieuw || 'Ja, verstuurd') + ') is alsnog in het project gezet, zodat ' +
            'niemand hem nog een keer bestelt.', { kop: 'Bestelling in het project', soort: 'letop' });
        }
        return;
      }
      throw new Error((r && r.error && r.error.message) || 'onbekend');
    }).catch(function (e) {
      console.warn('[cloud] bestelling alsnog in het project zetten mislukt', e);
      if (window.appFout) {
        appFout('LET OP: je bestelling (' + (nieuw || 'Ja, verstuurd') + ') staat nog niet in het project, alleen in ' +
          'het aparte project. Zeg het de collega die het project nu bewerkt, anders wordt er dubbel besteld.',
          { kop: 'Bestelling niet in het project' });
      }
    });
  }

  // De stand van de server laden (na het overnemen, of als een ander het
  // project overnam). Wat hier nog openstond, gaat eerst apart.
  window.glasHerlaad = function (reden) {
    if (!sb || !projectId) return Promise.resolve(false);
    var openstaand = false;
    try { openstaand = localStorage.getItem(LS_PENDING) === '1'; } catch (e) {}
    if (kijkWijziging || vuil || openstaand) {
      return apartEnLaden(reden || 'niet opgeslagen vóór het overnemen',
        'Wat je op dit apparaat nog niet had opgeslagen, kon niet meer in het project. Het is niet weg: ' +
        'het staat apart in de projectenlijst.');
    }
    var pid = projectId;
    return sb.from('projecten').select('data,status').eq('id', pid).maybeSingle().then(function (res) {
      if (pid !== projectId || !res || res.error || !res.data) return false;
      if (vuil || bezig) return false;
      zetStaat(res.data.data || {});
      statusVanServer(res.data);
      opslaanLokaal();
      laatsteJson = JSON.stringify(huidigeStaat());
      statusOpgeslagen();
      return true;
    }, function () { return false; });
  };

  // Een ander nam het project over terwijl dit apparaat het had.
  window.glasNaOvername = function (melding, poging) {
    // Is er net een opslag onderweg, dan eerst het antwoord afwachten: de
    // database weigert hem (dan gaat het werk apart, via synchroniseer) of
    // hij was er nog net op tijd. Daarna pas kijken wat er nog openstaat.
    if (bezig && (poging || 0) < 120) {
      setTimeout(function () { window.glasNaOvername(melding, (poging || 0) + 1); }, 300);
      return;
    }
    if (apartLoopt) {
      apartLoopt.then(function () { window.glasNaOvername(melding, 999); });
      return;
    }
    var openstaand = false;
    try { openstaand = localStorage.getItem(LS_PENDING) === '1'; } catch (e) {}
    var kijken = melding + ' Je kunt meekijken; met ‹Toch bewerken› neem je het weer terug.';
    if (vuil || bezig || kijkWijziging || openstaand) {
      apartEnLaden('bewerkslot', melding + ' Wat je daarna nog wijzigde, kon niet meer in het project. ' +
        'Het is niet weg: het staat apart in de projectenlijst.', kijken);
      return;
    }
    window.glasHerlaad('');
    overgenomenMelding(kijken);
  };

  // Een ander nam het project over (v107). Een venster, geen kort berichtje
  // onderin: dat zag Jan op de iPhone niet, na het terugkomen uit
  // vliegtuigmodus. Wie het overnam en wanneer staat erin.
  function overgenomenMelding(tekst) {
    if (window.appMelding) appMelding(tekst, { kop: 'Project overgenomen', soort: 'letop' });
    else toonMelding(tekst);
  }

  // In het logboek: wie het project overnam (Jans keuze: iedereen mag het,
  // en het komt in het logboek).
  window.glasProjectOvergenomen = function (van) {
    if (typeof projectInfo !== 'object' || !projectInfo) return;
    projectInfo.overgenomen = { door: gebruikersNaam(), van: van || '', op: new Date().toISOString() };
    spoorNotitie('project overgenomen' + (van ? ' van ' + van : ''));
    gebruikerDeedIets = true;
    window.opslaan();
  };

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
    // De eerste ruit met inhoud bepaalt wie het project opneemt (v93).
    vulOpnemer();
    var nu = JSON.stringify(huidigeStaat());
    if (nu === laatsteJson && !vuil) return;
    laatsteJson = nu;
    opslaanLokaal();
    // Geen project open: er is niets om naartoe te sturen.
    if (!projectId) { localStorage.removeItem(LS_PENDING); return; }
    // Alleen kijken (v106): nooit versturen. Een verschil dat de app zelf
    // maakt (lege regels erbij) is geen werk; iets wat de gebruiker toch
    // veranderde wel: dat gaat apart vóór er een andere stand komt.
    if (window.glasAlleenKijken && glasAlleenKijken()) {
      if (gebruikerDeedIets && !kijkWijziging) {
        kijkWijziging = true;
        toonMelding('Je kunt dit project alleen bekijken; wat je hier verandert, wordt niet in het project ' +
          'opgeslagen. Kies ‹Toch bewerken› om het over te nemen.');
      }
      return;
    }
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

  var naOffline = false;
  var voorlezenBezig = false;
  function voorlezenEnVersturen() {
    if (voorlezenBezig || !sb || !projectId) return;
    voorlezenBezig = true;
    sb.from('projecten').select('id,status,bestellingen:data->info->bestellingen').eq('id', projectId).maybeSingle()
      .then(function (r) {
        voorlezenBezig = false;
        if (!r || r.error) {
          status(r && r.error && !tijdelijkeFout(r.error)
            ? '⚠ Niet opgeslagen — ' + (r.error.message || 'fout') + ' (staat op dit apparaat)'
            : '⚠ Geen verbinding — lokaal', '#a3231a');
          setTimeout(plan, 8000);
          return;
        }
        naOffline = false;
        if (r.data) bestellingenErbij({ info: { bestellingen: r.data.bestellingen, status: r.data.status } }, r.data.status);
        synchroniseer();
      }, function () {
        voorlezenBezig = false;
        setTimeout(plan, 8000);
      });
  }

  function synchroniseer() {
    if (!sb || !gebruiker || !projectId || !vuil || bezig) return;
    // Staat er inhoud van een ánder project op het scherm (nog niet geladen),
    // dan nooit versturen: dat zou dit project overschrijven (v103).
    if (basisVan !== projectId) {
      status('… Wachten tot het project geladen is', '#8a5a00');
      // Het laden regelt de rest: daar wordt dit werk apart bewaard en de
      // stand van dit project getoond (herstelProbeer).
      if (geladen) { geladen = false; herstelPoging = 0; planHerstel(); }
      return;
    }
    // Alleen kijken, maar er staat nog werk open van vóór dat een ander het
    // project kreeg (v106): dat kan niet meer in het project. Apart.
    if (window.glasAlleenKijken && glasAlleenKijken()) {
      apartEnLaden('bewerkslot', 'Een collega bewerkt dit project nu. Wat je op dit apparaat nog niet had ' +
        'opgeslagen, kon niet meer in het project. Het is niet weg: het staat apart in de projectenlijst.');
      return;
    }
    if (!navigator.onLine) { naOffline = true; status('⚠ Offline — lokaal', '#a3231a'); return; }
    // Kwam dit apparaat net terug na een tijd zonder bereik, dan eerst de
    // bestellingen en de status van de server ophalen en erbij voegen,
    // en pas dan versturen. Zo wist een iPad die offline werkte geen
    // bestelling die intussen op kantoor gedaan is, ook als script 23 (de
    // database-kant) nog niet gedraaid is (v104, na de beoordeling).
    if (naOffline) { voorlezenEnVersturen(); return; }
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
    vulOpnemer();
    statusNietTerug();
    var samenvatting = stempelWijzigingen();
    var json = JSON.stringify(huidigeStaat());
    var state = JSON.parse(json);
    state._sessie = SESSIE;
    // Het versienummer van deze app (v99). De database weigert een opslag
    // met een lager nummer dan er al staat (21_versieslot.sql): zo kan een
    // apparaat met een oude versie niet stil wegschrijven wat een nieuwere
    // versie erbij zette.
    state._versieNr = VERSIE_NR;
    // Van welk apparaat deze opslag komt: de database laat alleen het
    // apparaat opslaan dat het project op zijn naam heeft (v106).
    if (window.glasBewerkslotVelden) Object.assign(state, glasBewerkslotVelden());
    // En op welke stand van de server dit werk voortbouwt (v106).
    state._basis = basisRev == null ? null : String(basisRev);
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
      status: (state.info && state.info.status) || 'aangemaakt',
      gewijzigd_door: gebruiker.id
    };
    // Het aantal open taken houdt de database zelf bij (trigger
    // tel_open_taken, v87). De app schreef hier tot v90 zijn eigen telling
    // overheen, uit de oude takenlijst in het project — en die is sinds v87
    // leeg. Na elke opslag stond er op het startscherm dus '0 open taken'.
    // Alleen als de tabel taken er nog niet is, telt de app zelf (v91).
    if (!takenTabel) velden.open_taken = openTaken(state);
    if (spoorKolommen) {
      velden.gewijzigd_naam = gebruikersNaam();
      velden.samenvatting = samenvatting;
      // Vertelt de database of deze opslag bij dezelfde werkgang hoort als
      // de vorige; zo ja, dan werkt hij de laatste logboekregel bij in
      // plaats van er een nieuwe bij te zetten (v88).
      velden.spoor_vervolg = spoorVervolg;
    }
    // Terug: ook de status en de bestellingen zoals ze ná de opslag in de
    // database staan. De database voegt bestellingen samen die dit apparaat
    // nog niet kende (23_bestellingen.sql); zo weet het scherm het meteen,
    // en niet pas bij de volgende start (v104).
    sb.from('projecten').update(velden).eq('id', projectId)
      .select('id,status,bestellingen:data->info->bestellingen,rev:data->_rev').then(function (res) {
      bezig = false;
      clearTimeout(wachtKlok);
      // Een update die geen enkele rij raakt geeft géén fout. Zonder deze
      // controle bleef de app "✓ Opgeslagen" melden terwijl er niets
      // werd weggeschreven — bijvoorbeeld als een collega het project
      // intussen verwijderd had (v83).
      if (!res.error && Array.isArray(res.data) && res.data.length === 0) {
        var i2 = eigenSchrijfsels.lastIndexOf(afdruk);
        if (i2 >= 0) eigenSchrijfsels.splice(i2, 1);
        // Het werk blijft gemarkeerd als 'moet nog omhoog'. Daarna nagaan
        // waaróm er niets aankwam: niet meer ingelogd, of het project is
        // echt weg (v103).
        vuil = true;
        try { localStorage.setItem(LS_PENDING, '1'); } catch (e) {}
        status('⚠ Niet opgeslagen — even nagaan waarom', '#a3231a');
        projectWeg();
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
        // Een ander heeft het project (v106): de database weigert. Het werk
        // gaat apart, de stand van de server komt op het scherm.
        if (/Bewerkslot/.test(String(res.error.message || ''))) {
          if (window.glasBewerkslotGeweigerd) glasBewerkslotGeweigerd();
          apartEnLaden('bewerkslot', String(res.error.message).replace(/^Bewerkslot:\s*/, '').replace(/\s*Je werk blijft.*$/, '') +
            ' Wat je deed, kon daarom niet in het project. Het is niet weg: het staat apart in de projectenlijst.');
          return;
        }
        if (verouderdeVersie(res.error)) {
          versieGeweigerd = true;
          // Een nieuwere versie heeft dit project al opgeslagen. Niet blijven
          // aandringen: het werk blijft op dit apparaat (vuil en de vlag
          // 'moet nog omhoog' blijven staan) en gaat na het bijwerken alsnog
          // omhoog (v99).
          vuil = true;
          localStorage.setItem(LS_PENDING, '1');
          status('⚠ Eerst bijwerken — je werk staat op dit apparaat', '#a3231a');
          if (window.glasZoekUpdate) window.glasZoekUpdate(false);
          setTimeout(plan, 30000);
          return;
        }
        if (databaseVol(res.error)) {
          vuil = true;
          try { localStorage.setItem(LS_PENDING, '1'); } catch (e3) {}
          status('⚠ Database vol — je werk staat op dit apparaat', '#a3231a');
          if (!volGemeld && window.appFout) {
            volGemeld = true;
            appFout('De database in de cloud is vol en neemt niets meer aan. Je werk is NIET weg: het ' +
                    'staat op dit apparaat en gaat vanzelf omhoog zodra er weer ruimte is. Sluit de app ' +
                    'niet af en wis geen websitegegevens.\n\nVoor Jan: ruim projecten op (prullenbak ' +
                    'definitief legen) of zet Supabase op een betaald plan.',
                    { kop: 'Database vol' });
          }
          setTimeout(plan, 60000);
          return;
        }
        if (res.error.code === '23505') {
          status('⚠ Naam al in gebruik', '#a3231a');
          toonNaamWaarschuwing('⚠ Deze projectnaam is al in gebruik. Kies een andere naam; ' +
                               'je metingen blijven zolang lokaal bewaard.');
        } else if (tijdelijkeFout(res.error)) {
          // Gaat vanzelf over; niet alarmeren, gewoon zo weer proberen.
          naOffline = true;
          status('… Opnieuw proberen');
          try { if (sb.auth && sb.auth.getSession) sb.auth.getSession(); } catch (e2) {}
          setTimeout(plan, 2000);
          return;
        } else {
          naOffline = true;
          status('⚠ Niet opgeslagen — ' + res.error.message, '#a3231a');
        }
        setTimeout(plan, 8000);
        return;
      }
      // Gelukt. Wat er nu in de kolom status staat, is wat wij stuurden;
      // een met de hand gekozen status is daarmee verwerkt (v91).
      serverStatus = velden.status;
      var terug = Array.isArray(res.data) && res.data[0];
      if (terug && terug.status) serverStatus = terug.status;
      // Het nieuwe volgnummer: hierop bouwt de volgende opslag voort (v106).
      // Zonder script 24 komt er niets terug; dan blijft het zoals het was.
      if (terug && revVan({ _rev: terug.rev }) != null) {
        basisRev = revVan({ _rev: terug.rev });
        opslaanLokaal();
      }
      if (terug && Array.isArray(terug.bestellingen) &&
          bestellingenErbij({ info: { bestellingen: terug.bestellingen, status: terug.status } }, terug.status)) {
        // Er kwam een bestelling bij die dit apparaat niet kende: de stand
        // op het scherm is nu anders dan wat er net verstuurd is.
        vuil = true;
        try { localStorage.setItem(LS_PENDING, '1'); } catch (e4) {}
      }
      statusHandmatig = false;
      versieGeweigerd = false;
      if (JSON.stringify(huidigeStaat()) !== json) {
        // Tijdens het opslaan is er doorgetypt. Dat staat nog niet in de
        // database: open laten en meteen de volgende ronde plannen.
        vuil = true;
        localStorage.setItem(LS_PENDING, '1');
        plan();
      } else {
        vuil = false;
        localStorage.removeItem(LS_PENDING);
        // Wat er nu staat, is precies wat er verstuurd is (mét de stempels
        // die stempelWijzigingen() er net bij zette). Tot v105 zag de
        // volgende ronde van opslaan() die stempels als een wijziging en
        // stuurde alles nog een keer (v106).
        laatsteJson = json;
        statusOpgeslagen();
        linkNaOpslaan();
      }
    }, function (e) {
      // Netwerkfout zonder antwoord: niets is zeker weggeschreven.
      naOffline = true;
      bezig = false;
      clearTimeout(wachtKlok);
      status('⚠ Niet opgeslagen — ' + ((e && e.message) || 'geen verbinding'), '#a3231a');
      setTimeout(plan, 8000);
    });
  }

  window.addEventListener('online', function () {
    herstelPoging = 0;
    setTimeout(reddingenUploaden, 1000);   // v103
    if (!geladen) { herstelProbeer(); return; }
    if (!kanaalGezond()) luisterOpProject();
    if (vuil) synchroniseer(); else statusOpgeslagen();
  });
  // Gaat de app naar de achtergrond (iPad op slot, andere app), dan kan er
  // intussen elders besteld worden zonder dat dit apparaat een netwerkfout
  // ziet. Bij de volgende opslag dus eerst de server lezen (v104).
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') naOffline = true;
  });
  window.addEventListener('offline', function () {
    naOffline = true;
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
  // Na een bestelmail heeft de mailfunctie al een eigen regel in het
  // logboek gezet ("bestelmail verstuurd naar …"). De opslag die de app
  // daarna doet hoort bij díe regel, anders staat hij er twee keer (v91).
  var vervolgNaMail = false;
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
    spoorVervolg = vervolgNaMail || (!!werkgangMoment && (Date.now() - werkgangMoment) < WERKGANG_MS &&
                   !werkgangBijzonder && !notities.length);
    vervolgNaMail = false;
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
  // stap naar 'besteld' zet de mailfunctie, 'Ja, verstuurd' na de
  // bestellijst-pdf (v104), of jij met de hand;
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

  /* ─── 'besteld' gaat niet vanzelf terug ───────────────────── */
  // De status 'besteld' zet de mailfunctie in de kolom `status`, niet in de
  // opname zelf. De app stuurt bij elke opslag zijn eigen status mee. Een
  // apparaat met een oudere stand — het antwoord op de bestelmail kwam
  // niet aan, of een collega had het project nog open — zette de kolom zo
  // terug naar 'bezig', en daarmee was ook het slot weg (v91).
  //
  // Daarom: wat de server als status heeft, onthouden. Staat die op
  // 'besteld' of later en is de eigen stand lager, dan neemt de app de
  // status van de server over in plaats van hem terug te zetten. Alleen
  // een status die iemand met de hand kiest (na ontgrendelen, zie
  // project.js) mag lager uitkomen.
  var serverStatus = null;
  var statusHandmatig = false;

  function rang(s) {
    if (window.statusRang) return statusRang(s);
    var r = { 'besteld': 2, 'geleverd': 3, 'gemonteerd': 4, 'afgerond': 5 }[String(s || '')];
    return r || 0;
  }

  window.glasStatusHandmatig = function () { statusHandmatig = true; };

  function statusNietTerug() {
    if (statusHandmatig || !serverStatus) return false;
    if (typeof projectInfo !== 'object' || !projectInfo) return false;
    if (rang(serverStatus) < 2 || rang(projectInfo.status) >= rang(serverStatus)) return false;
    projectInfo.status = serverStatus;
    return true;
  }

  // Een rij zoals de database hem teruggeeft (bij openen, bij terugkeer, of
  // live via het kanaal). Komt daar 'besteld' uit terwijl de app het nog
  // niet wist, dan meteen overnemen: dan gaat ook het slot er direct op,
  // op elk apparaat dat het project open heeft.
  function statusVanServer(rij) {
    if (!rij || !rij.status) return;
    serverStatus = rij.status;
    if (!statusNietTerug()) return;
    if (!projectInfo.bestelmail && rij.besteld_op) {
      projectInfo.bestelmail = { op: rij.besteld_op, door: '', aan: '' };
    }
    if (window.renderProject) renderProject();
    if (window.renderTabel) renderTabel();
    if (window.renderBestellijst) renderBestellijst();
  }

  // Bestaat een tabel (nog) niet, omdat een SQL-script niet gedraaid is?
  // Dat is iets anders dan 'ophalen mislukt': dan is de lijst echt leeg.
  function tabelOntbreekt(fout) {
    var t = String((fout && fout.message) || '') + ' ' + String((fout && fout.code) || '');
    return /42P01|PGRST205|does not exist/.test(t);
  }
  window.glasTabelOntbreekt = tabelOntbreekt;

  // Een lijst ophalen waarbij 'mislukt' niet op 'leeg' mag lijken (v103).
  // Tot v102 gaf een fout of geen bereik een lege lijst terug, en stond
  // er "Nog geen wijzigingen" of "Geen openstaande taken" terwijl die er
  // wel waren. Nu: een lijst, of null als het niet lukte. Een lijst krijgt
  // .totaal mee als de database dat telde (count: 'exact').
  function lijstOf(res) {
    if (!res) return null;
    if (res.error) return tabelOntbreekt(res.error) ? [] : null;
    var l = Array.isArray(res.data) ? res.data.slice() : [];
    if (typeof res.count === 'number') l.totaal = res.count;
    return l;
  }

  // Het logboek ophalen voor dit project. null = ophalen mislukt (v103).
  window.glasGeschiedenis = function (id, aantal) {
    if (!sb) return Promise.resolve([]);
    return sb.from('projectgeschiedenis')
      .select('id,moment,wie_naam,samenvatting', { count: 'exact' })
      .eq('project_id', id || projectId)
      .order('moment', { ascending: false })
      .limit(aantal || 30)
      .then(lijstOf, function () { return null; });
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
    // Het project vrijgeven voor een collega (v106).
    if (window.glasBewerkslotStop) glasBewerkslotStop();
    projectId = null;
    window.glasProjectId = null;
    geladen = false;
    vuil = false;
    bezig = false;
    laatsteJson = null;
    gebruikerDeedIets = false;
    werkVanEerder = false;
    serverStatus = null;
    statusHandmatig = false;
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
  // sortering (v102, keuze van Jan): 'gewijzigd' (standaard), 'aangemaakt'
  // of 'alfabet'. De volgorde zit in de vraag aan de database, niet pas in
  // de app: anders zou de app sorteren binnen alleen de laatst gewijzigde
  // projecten, en vielen oudere projecten ongemerkt uit de lijst.
  window.glasProjecten = function (zoek, sortering) {
    if (!sb || !gebruiker) return Promise.resolve({ data: [], error: null });
    return new Promise(function (klaar) {
      var metFilter = prullenbakKolom;
      metHerkansing(function () {
        var q = sb.from('projecten')
          .select('id,naam,datum,status,aantal_ruiten,adres,open_taken,updated_at,created_at,gewijzigd_naam',
                  { count: 'exact' });
        // Wat in de prullenbak staat hoort niet in de lijst (v91).
        if (metFilter) q = q.is('verwijderd_op', null);
        var t = zoekTekst(zoek);
        if (t) {
          var z = '%' + t + '%';
          q = q.or('naam.ilike.' + z + ',datum.ilike.' + z + ',adres.ilike.' + z);
        }
        if (sortering === 'alfabet') q = q.order('naam', { ascending: true });
        else if (sortering === 'aangemaakt') q = q.order('created_at', { ascending: false });
        else q = q.order('updated_at', { ascending: false });
        // Tot v101: 200. Bij sorteren op naam of aanmaakdatum zou dan een
        // deel van de projecten wegvallen zodra er meer dan 200 zijn. Een
        // regel is hooguit een paar honderd bytes; 1000 is nog geen halve MB.
        return q.limit(1000);
      }, function (res) {
        // Script 18 nog niet gedraaid: dan zonder dat filter opnieuw.
        if (res && res.error && metFilter && geenPrullenbak(res.error)) {
          window.glasProjecten(zoek, sortering).then(klaar);
          return;
        }
        // totaal: hoeveel projecten er werkelijk zijn (v103). Zijn dat er
        // meer dan de grens, dan zegt het startscherm dat; zo valt er nooit
        // stil een project uit de lijst.
        klaar({ data: (res && res.data) || [], error: res && res.error,
                totaal: (res && typeof res.count === 'number') ? res.count : null });
      });
    });
  };

  // Zoektekst geschikt maken voor het or()-filter van de database. Een
  // komma of haakje breekt dat filter (de komma scheidt de voorwaarden),
  // en % en _ zijn jokers. Die tekens worden spaties; zoeken op
  // "Verhoef, Dordrecht" zoekt dan op "Verhoef  Dordrecht" (v91).
  function zoekTekst(t) {
    return String(t || '').replace(/[%_,()"\\]/g, ' ').trim();
  }

  /* ─── ruimte bewaken (v103) ──────────────────────────────────
     Vraag van Jan: "zodat iets nooit stilzwijgend kwijtraakt". Het gratis
     plan van Supabase heeft 500 MB database en 1 GB foto-opslag. Is de
     database vol, dan neemt hij niets meer aan; is de opslag vol, dan
     blijven foto's op de apparaten wachten. Het startscherm waarschuwt
     vanaf 80%. Andere grenzen (betaald plan)? In config.js:
       limieten: { databaseMB: 8000, opslagMB: 100000 }
     Meet hooguit eens per tien minuten: het is een vraag aan de database. */
  var gebruikCache = null;
  var gebruikOp = 0;
  window.glasGebruik = function (opnieuw) {
    if (!sb || !gebruiker || !sb.rpc) return Promise.resolve(null);
    if (!opnieuw && gebruikCache && Date.now() - gebruikOp < 600000) return Promise.resolve(gebruikCache);
    return Promise.resolve(sb.rpc('glas_gebruik')).then(function (res) {
      // Script 22 nog niet gedraaid of geen bereik: niets te melden.
      if (!res || res.error || !res.data) return gebruikCache;
      var d = res.data;
      var lim = cfg.limieten || {};
      function deel(bytes, mb) {
        var max = mb * 1048576;
        var b = Number(bytes) || 0;
        return { bytes: b, max: max, mb: Math.round(b / 1048576), maxMb: mb, pct: Math.round(b / max * 100) };
      }
      gebruikCache = {
        database: deel(d.database_bytes, Number(lim.databaseMB) || 500),
        opslag: deel(d.opslag_bytes, Number(lim.opslagMB) || 1024),
        bestanden: Number(d.opslag_bestanden) || 0
      };
      gebruikOp = Date.now();
      return gebruikCache;
    }, function () { return gebruikCache; });
  };

  // Is script 23 (bestellingen samenvoegen in de database) gedraaid? (v104)
  // Zonder dat script vangt de app het zelf op, maar de database is de
  // tweede verdediging. Het startscherm vraagt Jan het script te draaien.
  // true = ja, false = nee, null = onbekend (geen bereik).
  var script23 = null;
  window.glasScript23 = function () {
    if (script23 !== null) return Promise.resolve(script23);
    if (!sb || !gebruiker || !sb.rpc) return Promise.resolve(null);
    return Promise.resolve(sb.rpc('glas_status_rang', { s: 'besteld' })).then(function (r) {
      if (r && !r.error) { script23 = true; return true; }
      var t = String((r && r.error && (r.error.code + ' ' + r.error.message)) || '');
      if (/PGRST202|42883|Could not find the function|does not exist/.test(t)) { script23 = false; return false; }
      return null;
    }, function () { return null; });
  };

  window.glasGebruiker = function () {
    return { id: gebruiker ? gebruiker.id : null, naam: gebruikersNaam(),
             email: (gebruiker && gebruiker.email) || '', telefoon: mijnTelefoon() };
  };

  /* ─── mijn telefoonnummer (v120, wens Jan) ─────────────────── */
  // Op de bestellijst: wie bestelt, met telefoon, zodat de leverancier kan
  // bellen. Iedereen zet zijn eigen nummer (startscherm, 📞). Het staat in
  // de tabel gebruikers (kolom telefoon, script 26) en zolang dat er nog
  // niet is ook op dit apparaat.
  var mijnRij = null, mijnRijBezig = null;
  function telefoonSleutel() { return 'glasopname_telefoon_' + (gebruiker ? gebruiker.id : ''); }
  function mijnTelefoon() {
    if (mijnRij && mijnRij.telefoon) return String(mijnRij.telefoon);
    try { return localStorage.getItem(telefoonSleutel()) || ''; } catch (e) { return ''; }
  }
  window.glasMijnLaden = function () {
    if (!sb || !gebruiker || !gebruiker.id) return Promise.resolve(null);
    if (mijnRijBezig) return mijnRijBezig;
    mijnRijBezig = Promise.resolve(sb.from('gebruikers').select('*').eq('id', gebruiker.id)).then(function (r) {
      mijnRijBezig = null;
      var d = r && !r.error && r.data;
      mijnRij = Array.isArray(d) ? (d[0] || null) : (d || null);
      return mijnRij;
    }, function () { mijnRijBezig = null; return null; });
    return mijnRijBezig;
  };
  window.glasMijnTelefoon = async function () {
    if (!window.appInvoer) return;
    var nu = mijnTelefoon();
    var t = await appInvoer('Je telefoonnummer, voor op de bestellijst (de leverancier belt je bij vragen):',
      { kop: 'Mijn telefoonnummer', waarde: nu, plaatshouder: '06 12345678', soort2: 'tel' });
    if (t === null || t === undefined) return;
    t = String(t).replace(/\s+/g, ' ').trim();
    if (t && !/^\+?[0-9 ()\-]{6,20}$/.test(t)) {
      if (window.appMelding) await appMelding('«' + t + '» lijkt geen telefoonnummer. Alleen cijfers, spaties, + en -.', { kop: 'Telefoon', soort: 'letop' });
      return;
    }
    try { if (t) localStorage.setItem(telefoonSleutel(), t); else localStorage.removeItem(telefoonSleutel()); } catch (e) {}
    var gelukt = false;
    if (sb && gebruiker && gebruiker.id) {
      try {
        var r = await sb.from('gebruikers').update({ telefoon: t || null }).eq('id', gebruiker.id).select();
        gelukt = !!(r && !r.error && r.data && (r.data.length === undefined || r.data.length));
      } catch (e) { gelukt = false; }
    }
    if (gelukt) mijnRij = Object.assign({}, mijnRij || {}, { telefoon: t || null });
    if (window.kortBericht) kortBericht(gelukt ? 'Telefoonnummer bewaard.' :
      'Telefoonnummer bewaard op dit apparaat. Voor je andere apparaten: Jan draait eerst script 26.', { soort: 'info' });
    if (window.glasStartTelefoonKnop) glasStartTelefoonKnop();
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
  // bestelmail, dan zet diezelfde functie het project op 'besteld' (v88).
  // Sinds v104 doet ‹Ja, verstuurd› na de bestellijst-pdf dat ook (pdf.js,
  // vraagVerstuurd). De mailfunctie is nog niet ingesteld (stand v109).

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

  // soort (v103): alleen die soort mail. De vraag "is er al besteld?"
  // keek tot v102 in de laatste 10 mails van alle soorten; na tien
  // taakberichten viel een eerdere bestelling daar buiten, en kwam er geen
  // waarschuwing voor een dubbele bestelling. null = ophalen mislukt.
  window.glasMailLog = function (pid, soort) {
    if (!sb) return Promise.resolve([]);
    var q = sb.from('mailverzonden').select('moment,soort,aan,onderwerp,gelukt,fout,wie_naam', { count: 'exact' })
      .eq('project_id', pid || projectId);
    if (soort) q = q.eq('soort', soort);
    return q.order('moment', { ascending: false }).limit(30)
      .then(lijstOf, function () { return null; });
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

    // Bij een bestelmail eerst onthouden wanneer het project voor het laatst
    // besteld is. Komt het antwoord van de mailfunctie niet aan (4G valt
    // weg), dan kunnen we daarna nakijken of hij intussen wél besteld
    // heeft. Tot v90 zei de app dan "niet verstuurd", stuurde iemand hem
    // opnieuw, en kreeg de leverancier twee bestellingen (v91).
    var isBestelling = lading.soort === 'bestelling' && !!lading.projectId;
    var besteldVoor;   // undefined = niet bekend
    function besteldOp() {
      return sb.from('projecten').select('besteld_op').eq('id', lading.projectId).maybeSingle()
        .then(function (r) {
          if (!r || r.error || !r.data) return undefined;
          return r.data.besteld_op || null;
        }, function () { return undefined; });
    }

    return (isBestelling ? besteldOp().then(function (v) { besteldVoor = v; }) : Promise.resolve())
      .then(function () {
        if (sb.functions && sb.functions.invoke) {
          return sb.functions.invoke('mail', { body: lading }).then(function (res) {
            if (res && res.error) {
              // De functie geeft bij een fout ook een leesbare tekst terug;
              // die zit in het antwoord, niet in de foutmelding zelf.
              return leesFoutLichaam(res).then(function (tekst) {
                // Met een eigen foutmelding van de functie is het zeker: die
                // heeft hem niet verstuurd. Zonder (geen antwoord) weten we
                // het niet, en wordt er hieronder nagekeken (v91).
                return { ok: false, zeker: !!tekst, fout: tekst || res.error.message || 'Versturen mislukt' };
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
      .then(function (uit) { return uit || { ok: false, fout: 'Geen antwoord' }; },
            function (e) {
              return { ok: false, geenAntwoord: true,
                       fout: (e && e.message) || 'De mailfunctie is niet bereikbaar. ' +
                             'Staat hij in Supabase onder Edge Functions?' };
            })
      .then(function (uit) {
        if (uit.ok || uit.zeker || !isBestelling || besteldVoor === undefined) return uit;
        // Mislukt — maar is dat zeker? Even nakijken bij de database, nu en
        // na een paar seconden (de functie kan nog bezig zijn geweest).
        return nakijken(0);
        function nakijken(keer) {
          return besteldOp().then(function (na) {
            if (na && na !== besteldVoor) {
              return { ok: true, nagekeken: true, aan: lading.aan };
            }
            if (keer >= 1) return uit;
            return new Promise(function (r) { setTimeout(r, 4000); })
              .then(function () { return nakijken(keer + 1); });
          });
        }
      })
      .then(function (uit) {
        // De functie geeft terug naar wie hij werkelijk verstuurde; adressen
        // die hij afkeurde staan daar niet bij. Die lijst gebruiken voor het
        // logboek en de melding, niet wat er in het venster stond (v91).
        if (uit && uit.ok && Array.isArray(uit.aan) && uit.aan.length) lading.aan = uit.aan;
        if (uit && uit.ok && lading.soort === 'bestelling') naBestelmail(lading.aan);
        return uit;
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
    serverStatus = 'besteld';
    projectInfo.bestelmail = { op: new Date().toISOString(), door: gebruikersNaam(),
                               aan: (aan || []).join(', ') };
    nieuweWerkgang();                 // wat ervóór gewijzigd is, staat al in de regel ervoor
    werkgangMoment = Date.now();
    vervolgNaMail = true;
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

  // Een antwoord van de database mét fout is net zo goed mislukt als geen
  // antwoord. Tot v102 werd zo'n fout stil weggegooid: zonder bereik
  // verscheen een nieuwe taak even, en verdween hij daarna zonder melding
  // (gevonden bij de controle van v103).
  function taakAntwoord(wat) {
    return function (res) {
      if (!res || res.error || !res.data) return taakFout(wat)((res && res.error) || null);
      return res.data;
    };
  }

  function taakFout(wat) {
    return function (e) {
      console.warn('[taken] ' + wat + ' mislukt', e);
      var waarom = (e && e.message) || 'geen verbinding';
      var tekst = wat === 'toevoegen'
        ? 'De taak is niet opgeslagen (' + waarom + '). De tekst staat weer in het invoerveld; ' +
          'probeer het opnieuw zodra er bereik is.'
        : wat === 'verwijderen'
          ? 'De taak is niet verwijderd (' + waarom + '). Hij staat er nog; probeer het zo nog eens.'
          : 'De taak is niet bijgewerkt (' + waarom + '). De lijst toont weer wat er echt is ' +
            'opgeslagen; probeer het zo nog eens.';
      if (window.appFout) appFout(tekst, { kop: 'Taken' });
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

  // null = de tabel bestaat (nog) niet: dan de taken uit het project zelf.
  // Mislukt het ophalen (geen bereik, fout), dan een fout (afgewezen
  // belofte), zodat het scherm "konden niet opgehaald worden" zegt en niet
  // "Nog geen taken". Tot v102 kwam ook dat als null terug, en toonde de
  // app de (lege) oude takenlijst uit het project (v103).
  window.glasTakenVan = function (pid) {
    if (!sb || !takenTabel || !(pid || projectId)) return Promise.resolve(null);
    return sb.from('taken').select('*').eq('project_id', pid || projectId)
      .order('klaar', { ascending: true }).order('volgorde', { ascending: true })
      .then(function (res) {
        if (!takenTabelCheck(res)) {
          if (!takenTabel) return null;
          throw res.error;
        }
        return (res && res.data) || [];
      });
  };

  // Open taken op mijn naam, voor het startscherm. null = mislukt (v103).
  // De grens was 100 zonder dat iemand het zag; nu 500 en de telling erbij.
  window.glasMijnTaken = function () {
    if (!sb || !gebruiker || !takenTabel) return Promise.resolve([]);
    return sb.from('taken')
      .select('id,tekst,project_id,aangemaakt_op,eigenaar_naam', { count: 'exact' })
      .eq('klaar', false).eq('eigenaar', gebruiker.id)
      .order('aangemaakt_op', { ascending: true }).limit(500)
      .then(function (res) {
        if (res && res.error) takenTabelCheck(res);
        return lijstOf(res);
      }, function () { return null; });
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
      .then(taakAntwoord('toevoegen'), taakFout('toevoegen'));
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
      .then(taakAntwoord('bijwerken'), taakFout('bijwerken'));
  };

  window.glasTaakWeg = function (id) {
    if (!sb) return Promise.resolve(false);
    return sb.from('taken').delete().eq('id', id)
      .then(function (res) {
        if (res && res.error) { taakFout('verwijderen')(res.error); return false; }
        return true;
      }, function (e) { taakFout('verwijderen')(e); return false; });
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
    // Wie mag dit project bewerken (v106)? Bij elk geopend project, en bij
    // een nieuwe verbinding de stand verversen.
    if (projectId && window.glasBewerkslotStart) glasBewerkslotStart(projectId);
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

  function meldPrullenbak(rij) {
    if (!window.appMelding) return;
    var d = new Date(rij.verwijderd_op);
    appMelding('Het project ‹' + (rij.naam || (rij.data && rij.data.project) || 'naamloos') + '› staat in de ' +
               'prullenbak' + (rij.verwijderd_naam ? ', verplaatst door ' + rij.verwijderd_naam : '') +
               (isNaN(d.getTime()) ? '' : ' op ' + d.toLocaleDateString('nl-NL')) + '. ' +
               'Zet het terug via de prullenbak op het startscherm om er verder in te werken.',
               { kop: 'In de prullenbak', soort: 'letop' });
  }

  var prullenbakGemeld = null;

  function vanElders(rij) {
    if (!rij || !rij.data) return;
    nieuwereVersieGezien(rij.data);
    // Een collega heeft het project naar de prullenbak verplaatst. Geen
    // eigen werk open: netjes loslaten. Wel eigen werk open: dat gaat
    // gewoon nog omhoog (de rij bestaat nog), en we zeggen waar het
    // project nu staat (v91).
    if (rij.verwijderd_op && rij.id === projectId && prullenbakGemeld !== rij.verwijderd_op) {
      prullenbakGemeld = rij.verwijderd_op;
      meldPrullenbak(rij);
      if (!vuil && !bezig) { loslatenNaPrullenbak(); return; }
    }
    // Eerst de status: ook als de inhoud onze eigen opslag is (de
    // mailfunctie verandert alleen de kolom status), moet 'besteld' hier
    // binnenkomen (v91).
    statusVanServer(rij);
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
      if (kijkWijziging) { kijkWijziging = false; reddingBewaar(huidigeStaat(), 'gewijzigd tijdens meekijken'); reddingenUploaden(); }
      zetStaat(rij.data);
      statusVanServer(rij);
      laatsteJson = JSON.stringify(huidigeStaat());
      opslaanLokaal();
      toonMelding('');
      status('↻ Bijgewerkt door collega', '#1a6b3c');
      setTimeout(statusOpgeslagen, 4000);
      return;
    }

    // Er staat lokaal werk open of je bent aan het typen: dan niets
    // overschrijven, maar wel zeggen dat het er is. Bestellingen zijn de
    // uitzondering: die neemt dit apparaat meteen over, anders zou zijn
    // volgende opslag een bestelling van een collega wissen (v104).
    bestellingenErbij(rij.data, rij.status);
    toonMelding('Een collega heeft dit project gewijzigd.' +
      (vuil ? ' Jouw wijzigingen staan nog open en overschrijven die van hem zodra ze omhoog gaan.' : ''),
      'Hun versie laden', async function () {
        if (vuil && !await appVraag(
            'Jouw nog niet opgeslagen wijzigingen gaan hiermee verloren.',
            { kop: 'Versie van je collega laden', ja: 'Laden en mijn werk laten vallen',
              gevaarlijk: true })) return;
        zetStaat(rij.data);
        statusVanServer(rij);
        laatsteJson = JSON.stringify(huidigeStaat());
        vuil = false;
        localStorage.removeItem(LS_PENDING);
        opslaanLokaal();
        toonMelding('');
        statusOpgeslagen();
      });
  }

  // Bestellingen uit een andere stand (de server, een collega) bij die van
  // dit apparaat voegen (v104). De database doet hetzelfde
  // (23_bestellingen.sql); dit zorgt dat het scherm het ook meteen weet.
  function bestellingenErbij(data, kolomStatus) {
    if (!data || !data.info || !window.bestellingenSamenvoegen) return false;
    var info = data.info;
    if (kolomStatus && rang(kolomStatus) > rang(info.status)) info = Object.assign({}, info, { status: kolomStatus });
    var uit = bestellingenSamenvoegen(info);
    if (!uit) return false;
    if (uit === 'geldig' && window.appMelding) {
      appMelding('Op een ander apparaat is dit project intussen besteld. Die bestelling staat er nu ' +
                 'ook hier bij; wat je hier wijzigde, zie je geel (anders dan besteld).',
                 { kop: 'Intussen besteld', soort: 'letop' });
    }
    if (window.renderTabel) renderTabel();
    if (window.renderBestellijst) renderBestellijst();
    if (window.renderProject) renderProject();
    opslaanLokaal();
    return true;
  }

  window.glasToonMelding = function (t) { toonMelding(t); };
  // Een berichtje zonder knop verdwijnt na 8 seconden vanzelf (v108: "Je kunt
  // dit project nu bewerken" bleef anders staan). Met een knop (‹Hun versie
  // laden›) blijft het staan tot er gekozen is: daar moet iets gebeuren.
  var meldingKlok = null;
  function toonMelding(tekst, knopTekst, actie) {
    var balk = el('syncMelding');
    if (!balk) return;
    clearTimeout(meldingKlok);
    if (!tekst) { balk.style.display = 'none'; balk.innerHTML = ''; return; }
    if (!knopTekst) {
      meldingKlok = setTimeout(function () {
        if (balk.textContent.indexOf(tekst) >= 0) { balk.style.display = 'none'; balk.innerHTML = ''; }
      }, window.GLAS_MELDING_MS || 8000);
    }
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

    sb.from('projecten').select('data,status').eq('id', projectId).maybeSingle().then(function (res) {
      if (res.error) { mislukt('terugkeer'); return; }
      if (!res.data) { projectWeg(); return; }
      if (vuil || bezig) return;     // intussen toch weer iets getypt
      geladen = true;
      statusVanServer(res.data);
      if (basisVan !== projectId) { reddenEnLaden(res.data.data || {}, ''); statusOpgeslagen(); return; }
      if (vingerafdruk(res.data.data || {}) !== vingerafdruk(huidigeStaat())) {
        vanElders({ data: res.data.data, status: res.data.status });
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
      // De opbouwlijsten van v96: zonder dubbelen (5-13-4 naast 4-13-5), in
      // de leesrichting binnen → buiten, zonder HR++-spouwen boven 16 mm en
      // met alleen echte HR+++ (spouw vanaf 9 mm, middenblad 4 mm). Staat de
      // oude lijst nog in de database, dan zou die alles terugzetten zodra
      // de app online komt. Draai 20_opbouwlijsten.sql en dit valt weg.
      if (k === 'opbouw_per_type' && oudeOpbouwlijst(nieuw[k])) {
        console.warn('[cloud] opbouw_per_type in de database is nog de lijst van vóór v96; ' +
                     'draai 20_opbouwlijsten.sql. Tot die tijd gebruikt de app zijn eigen lijst.');
        return;
      }
      if (k === 'lookup' && nieuw[k] && typeof nieuw[k] === 'object' && DATA.lookup) {
        // Dikte en gewicht van een opbouw die alleen de app kent (bijv. de
        // omgedraaide 4-13-8 van v96) niet kwijtraken omdat de database hem
        // nog niet heeft. Wat de database wél heeft, wint (v96).
        Object.keys(DATA.lookup).forEach(function (s) {
          if (!(s in nieuw[k])) nieuw[k][s] = DATA.lookup[s];
        });
      }
      DATA[k] = nieuw[k];
      if (k === 'lookup') herstelBekendeDiktes(DATA.lookup);
    });
  }

  // VSG 10.10.x stond in de diktetabel op 2 mm en 5 kg/m² in plaats van
  // 20 mm en 50 kg/m²: tien keer te licht in de samenvatting en de pdf, en
  // een valse roosterwaarschuwing. index.html is verbeterd in v91; staat de
  // oude waarde nog in de database (17_vsg_1010.sql niet gedraaid), dan
  // zetten we hem hier goed in plaats van de database te laten winnen.
  var JUISTE_DIKTES = {
    'Gelaagd glas (VSG)|1010.2':           { glasOnly: 20, totaal: 20, kg_m2: 50 },
    'Gehard gelaagd (ESG+VSG)|1010.2 ESG': { glasOnly: 20, totaal: 20, kg_m2: 50 },
    'Gehard gelaagd (ESG+VSG)|1010.4 ESG': { glasOnly: 20, totaal: 20, kg_m2: 50 }
  };
  function herstelBekendeDiktes(lookup) {
    if (!lookup || typeof lookup !== 'object') return;
    Object.keys(JUISTE_DIKTES).forEach(function (sleutel) {
      var e = lookup[sleutel];
      if (e && Number(e.totaal) < 10) {
        lookup[sleutel] = JUISTE_DIKTES[sleutel];
        console.warn('[cloud] dikte van ' + sleutel + ' in de database is nog fout; draai 17_vsg_1010.sql');
      }
    });
  }

  // Kenmerken van de lijst van vóór v96 (zie pasDataToe).
  function oudeOpbouwlijst(o) {
    if (!o || typeof o !== 'object') return false;
    var hr = o['HR++ glas'] || [], tr = o['HR+++ glas (Triple)'] || [];
    return hr.indexOf('5-13-4') >= 0 || hr.indexOf('4-24-4') >= 0 || hr.indexOf('8-13-4') >= 0 ||
           tr.indexOf('4-8-4-8-4') >= 0 || tr.indexOf('4-16-6-16-4') >= 0;
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
      herstelVlag(false);       // wie gewoon inlogt, kent zijn wachtwoord (v109)
      wachtwoordAanbieden(email, pw);
      verbergLogin();
      start();
    });
  }

  // Het inlogformulier (v108). De eerste keer verstuurt het niet echt: eerst
  // controleren bij Supabase. Pas na een geslaagde inlog laat
  // wachtwoordAanbieden() het formulier echt "versturen" (naar het lege
  // kader), zodat de browser op dát moment vraagt of hij het wachtwoord
  // mag bewaren, en niet bij een verkeerd wachtwoord.
  // Sinds v109 geldt hetzelfde voor het formulier "Kies een nieuw
  // wachtwoord" (cloudHerstelVerstuur); vandaar één vlag voor beide.
  var echtVersturen = false;
  window.cloudLoginVerstuur = function (e) {
    if (echtVersturen) { echtVersturen = false; return true; }    // de echte, na de inlog
    if (e && e.preventDefault) e.preventDefault();
    login();
    return false;
  };

  // De browser het wachtwoord laten aanbieden, meteen na het inloggen (of
  // na het kiezen van een nieuw wachtwoord, v109).
  // - Chrome, Edge, Samsung Internet (Android en Windows): met de
  //   Credential Management API; die vraagt het direct.
  // - Safari (Mac, iPhone, iPad) en Firefox kennen die niet: daar het
  //   formulier echt versturen, naar leeg.html in een verborgen kader.
  //   Daaraan herkennen ze een inlog. Zonder dat raadde macOS het moment
  //   zelf, en vroeg het pas later, bijvoorbeeld bij een ander tabblad (v108).
  //   v108 verstuurde naar about:blank; dat gaf in Safari eerst de
  //   waarschuwing "niet beveiligd formulier", en daarna moest je zelf de
  //   gebruikersnaam kiezen (proef van Jan, 17-10). leeg.html is https en van
  //   de app zelf. De velden hebben geen name, dus er gaat niets mee.
  // Daarna het wachtwoord uit de velden halen.
  window.glasWachtwoordAanbieden = wachtwoordAanbieden;
  function wachtwoordAanbieden(email, pw, form, velden) {
    form = form || el('cloudLoginForm');
    velden = velden || ['cloudWachtwoord'];
    try {
      if (window.PasswordCredential && navigator.credentials && navigator.credentials.store) {
        Promise.resolve(navigator.credentials.store(new window.PasswordCredential({ id: email, password: pw, name: email })))
          .catch(function () {});
      } else if (form) {
        echtVersturen = true;
        if (form.requestSubmit) form.requestSubmit(); else form.submit();
        echtVersturen = false;
      }
    } catch (e) { echtVersturen = false; console.warn('[cloud] wachtwoord aanbieden', e); }
    setTimeout(function () {
      velden.forEach(function (id) { var v = el(id); if (v) v.value = ''; });
    }, 1500);
  }

  // "Wachtwoord vergeten?" op het inlogscherm (v109, keuze Jan): bewust
  // géén herstelfunctie in de app. Jan houdt de controle en stuurt zelf een
  // herstelmail vanuit Supabase. De knop zegt alleen dat. Tekst van Jan.
  window.cloudWachtwoordVergeten = function () {
    var tekst = 'Deze functie zit bewust niet in de app, vraag julian om een herstel link!';
    if (window.appMelding) return appMelding(tekst, { kop: 'Wachtwoord vergeten', soort: 'info' });
    window.alert(tekst);
  };

  /* ─── nieuw wachtwoord via een herstellink (v109) ──────────── */
  // Jan stuurt een collega een herstelmail vanuit Supabase (Authentication →
  // Users → Send password recovery). De link daarin gaat eerst naar
  // Supabase, en dan naar de app met in het adres:
  //   #access_token=…&refresh_token=…&type=recovery   (gelukt)
  //   #error=access_denied&error_code=otp_expired&…   (verlopen of al gebruikt)
  // Tot v108 logde de link de collega alleen in op dat ene apparaat, zonder
  // dat hij een nieuw wachtwoord kon kiezen.
  //
  // De app leest dat adres zelf (leesHerstelLink), vóór de verbinding met
  // Supabase bestaat, en haalt het meteen uit het adres met replaceState.
  // De bibliotheek van Supabase doet dat bewust NIET meer
  // (detectSessionInUrl: false, zie init): die zette location.hash = '', wat
  // een nieuwe stap in de geschiedenis maakt; met de terug-knop stond de
  // herstelcode dan weer in het adres (gevonden bij de controle van v109).
  // Daarna zet herstelSessie() de sessie zelf (setSession), met ‹Opnieuw
  // proberen› als er geen bereik is: de code staat dan alleen nog in het
  // geheugen van deze pagina.
  //
  // De vlag in localStorage (met het id van de gebruiker) zorgt dat het
  // venster terugkomt, ook na herladen en in een nieuw tabblad: zolang je
  // via de herstellink binnen bent en nog geen nieuw wachtwoord koos, kom je
  // niet stil in de app.
  var LS_HERSTEL = 'glasopname_herstel';
  function leesHerstelLink() {
    var p;
    try {
      var h = String(location.hash || '').replace(/^#/, '');
      p = new URLSearchParams(h);
      var q = new URLSearchParams(String(location.search || '').replace(/^\?/, ''));
      ['error', 'error_code', 'error_description'].forEach(function (k) {
        if (!p.get(k) && q.get(k)) p.set(k, q.get(k));
      });
    } catch (e) { return null; }
    var r = null;
    if (p.get('error') || p.get('error_code')) {
      r = { soort: 'fout', code: p.get('error_code') || p.get('error') || '', tekst: p.get('error_description') || '' };
    } else if (p.get('access_token') && p.get('refresh_token')) {
      // Ook een andere soort link van Supabase (bijv. een uitnodiging) zet
      // gewoon de sessie; alleen 'recovery' vraagt om een nieuw wachtwoord.
      r = { soort: p.get('type') === 'recovery' ? 'herstel' : 'sessie',
            access_token: p.get('access_token'), refresh_token: p.get('refresh_token'),
            sub: tokenGebruiker(p.get('access_token')) };
    }
    if (r) herstelAdresLeeg();
    return r;
  }
  // Van wie is de link? Het id van de gebruiker staat in het token zelf (een
  // JWT: kop.inhoud.handtekening). Alleen lezen, niet controleren: dat doet
  // Supabase. Nodig om te weten of de sessie op dit apparaat bij de link hoort
  // (en niet bij wie er al ingelogd was), ook als het zetten van de sessie
  // pas ná de tijdsgrens lukte.
  function tokenGebruiker(tok) {
    try {
      var deel = String(tok).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (deel.length % 4) deel += '=';
      return JSON.parse(atob(deel)).sub || null;
    } catch (e) { return null; }
  }
  function herstelVlag(aan, id) {
    try {
      if (aan === undefined) return localStorage.getItem(LS_HERSTEL) || '';
      if (aan) localStorage.setItem(LS_HERSTEL, id || '?'); else localStorage.removeItem(LS_HERSTEL);
    } catch (e) {}
    return '';
  }
  // Het herstel- of foutdeel uit het adres, zonder nieuwe stap in de
  // geschiedenis (replaceState), zodat de terug-knop het niet terugbrengt en
  // herladen het niet opnieuw meldt.
  function herstelAdresLeeg() {
    try {
      var q = new URLSearchParams(String(location.search || '').replace(/^\?/, ''));
      ['error', 'error_code', 'error_description'].forEach(function (k) { q.delete(k); });
      var zoek = q.toString();
      history.replaceState(history.state, '', location.pathname + (zoek ? '?' + zoek : ''));
    } catch (e) {}
  }
  function herstelLinkFout(f) {
    var verlopen = /otp_expired|expired|invalid|bad_jwt|jwt|401|403/i.test(f.code + ' ' + f.tekst);
    var tekst = verlopen
      ? 'Deze herstellink werkt niet meer: hij is al gebruikt of verlopen. Een herstellink werkt één keer en is ' +
        'een uur geldig.\nVraag julian om een nieuwe herstellink.'
      : 'De herstellink kon niet gebruikt worden (' + (f.tekst || f.code || 'onbekende fout') + ').\n' +
        'Vraag julian om een nieuwe herstellink.';
    if (window.appMelding) return appMelding(tekst, { kop: 'Herstellink', soort: 'letop' });
    return Promise.resolve();
  }
  function isNetwerkFout(err) {
    var s = String((err && (err.name || '')) + ' ' + (err && (err.message || '')) + ' ' + (err && (err.status || '')));
    return /fetch|network|Retryable|Load failed|NetworkError/i.test(s) && !/\b40[0-9]\b/.test(s);
  }
  // De sessie uit de link zetten. Geeft de sessie, of null (link ongeldig of
  // de gebruiker gaf het op). Zonder bereik: vragen om het opnieuw te proberen.
  // Met een tijdsgrens: een verbinding die blijft hangen, telt als geen bereik
  // (anders zag de collega minutenlang niets; tweede controle v109).
  var HERSTEL_WACHT_MS = window.GLAS_HERSTEL_WACHT_MS || 20000;
  async function herstelSessie(link) {
    for (;;) {
      toonHerstelBezig();
      var r;
      try {
        r = await Promise.race([
          sb.auth.setSession({ access_token: link.access_token, refresh_token: link.refresh_token }),
          new Promise(function (klaar) {
            setTimeout(function () { klaar({ error: { name: 'AuthRetryableFetchError', message: 'geen antwoord (tijdsgrens)' } }); },
                       HERSTEL_WACHT_MS);
          })
        ]);
      } catch (err) { r = { error: err }; }
      verbergHerstelBezig();
      if (r && !r.error && r.data && r.data.session) return r.data.session;
      if (!isNetwerkFout(r && r.error)) {
        herstelLinkFout({ code: String((r && r.error && (r.error.code || r.error.status)) || 'invalid'),
                                tekst: String((r && r.error && r.error.message) || '') });
        return null;
      }
      var nogEens = window.appVraag ? await appVraag(
        'De herstellink kon niet verwerkt worden: er is geen verbinding.\n' +
        'Laat deze pagina open, zorg voor bereik en kies ‹Opnieuw proberen›. ' +
        '(De link in de mail werkt niet nog een keer.)',
        { kop: 'Herstellink', ja: 'Opnieuw proberen', nee: 'Stoppen' }) : false;
      if (!nogEens) return null;
    }
  }

  // Het venster alvast tonen terwijl de link verwerkt wordt, zonder adres en
  // zonder knoppen: "Herstellink verwerken…". De vlag blijft hier buiten.
  function toonHerstelBezig() {
    el('cloudLogin').style.display = 'none';
    el('cloudHerstelEmail').value = '';
    el('cloudHerstelFout').textContent = 'Herstellink verwerken…';
    el('cloudHerstelKnop').disabled = true;
    el('cloudHerstelUit').disabled = true;
    el('cloudHerstel').style.display = 'flex';
  }
  function verbergHerstelBezig() {
    el('cloudHerstelKnop').disabled = false;
    el('cloudHerstelUit').disabled = false;
    el('cloudHerstelFout').textContent = '';
    el('cloudHerstel').style.display = 'none';
  }

  window.glasHerstelOpen = function () {
    var h = el('cloudHerstel');
    return !!(h && h.style.display === 'flex');
  };
  function toonHerstel() {
    herstelVlag(true, gebruiker && gebruiker.id);
    el('cloudLogin').style.display = 'none';
    el('cloudHerstelEmail').value = (gebruiker && gebruiker.email) || '';
    el('cloudHerstelFout').textContent = '';
    el('cloudHerstelKnop').disabled = false;
    el('cloudHerstelUit').disabled = false;
    el('cloudHerstel').style.display = 'flex';
    try { el('cloudHerstelNieuw').focus(); } catch (e) {}
    toonGebruiker();
  }
  function verbergHerstel() {
    herstelVlag(false);
    el('cloudHerstel').style.display = 'none';
  }

  window.cloudHerstelVerstuur = function (e) {
    if (echtVersturen) { echtVersturen = false; return true; }    // de echte, na het opslaan
    if (e && e.preventDefault) e.preventDefault();
    herstelOpslaan();
    return false;
  };

  function herstelFoutTekst(err) {
    var code = String((err && (err.code || err.name)) || '');
    var m = String((err && err.message) || '');
    if (/weak_password|weak|at least|characters/i.test(code + ' ' + m)) return 'Dit wachtwoord is te zwak. Kies een langer wachtwoord, met letters en cijfers.';
    if (isNetwerkFout(err)) return 'Geen verbinding. Probeer het opnieuw zodra je bereik hebt (laat dit venster open).';
    if (/session|missing|expired|jwt|reauthentication/i.test(code + ' ' + m)) {
      return 'De herstellink is niet meer geldig. Vraag julian om een nieuwe herstellink.';
    }
    return 'Opslaan mislukt: ' + (m || code || 'onbekende fout');
  }

  var herstelBezig = false;
  // Een poging waarvan het antwoord niet aankwam (geen bereik): misschien
  // heeft Supabase het wél opgeslagen. Alleen nog voor de tekst bij "Niet nu".
  var herstelOnbeslist = null;
  async function herstelOpslaan() {
    if (herstelBezig) return;
    var pw = el('cloudHerstelNieuw').value;
    var pw2 = el('cloudHerstelNogEens').value;
    var fout = el('cloudHerstelFout');
    if (pw.length < 8) { fout.textContent = 'Kies een wachtwoord van minstens 8 tekens.'; return; }
    if (pw !== pw2) { fout.textContent = 'De twee wachtwoorden zijn niet gelijk.'; return; }
    herstelBezig = true;
    el('cloudHerstelKnop').disabled = true;
    fout.textContent = 'Bezig met opslaan…';
    var res;
    try { res = await sb.auth.updateUser({ password: pw }); } catch (err) { res = { error: err }; }
    herstelBezig = false;
    el('cloudHerstelKnop').disabled = false;
    var err = res ? res.error : { message: 'geen antwoord' };
    // "Dat is je oude wachtwoord" (same_password) betekent: wat je net typte,
    // IS nu je wachtwoord. Dat is dus goed, en zo behandelen we het ook.
    // Waarom: kwam het antwoord op een eerdere poging niet aan (of herhaalde
    // de browser het verzoek zelf na een haperende verbinding), dan had
    // Supabase het al opgeslagen, en zou de app ten onrechte "kies een
    // ander" zeggen; de collega zat dan buitengesloten (controle v109).
    var alGelukt = err && /same_password|different from the old/i.test(String(err.code || '') + ' ' + String(err.message || ''));
    if (err && !alGelukt) {
      if (isNetwerkFout(err)) herstelOnbeslist = pw;
      fout.textContent = herstelFoutTekst(err);
      return;
    }
    herstelOnbeslist = null;
    var wie = (res && res.data && res.data.user) || gebruiker;
    if (wie) gebruiker = wie;
    var email = (wie && wie.email) || el('cloudHerstelEmail').value;
    fout.textContent = '';
    // Eerst de browser laten horen dat er een (nieuw) wachtwoord is, dan pas
    // het venster weg: Safari leest de velden op het moment van versturen.
    wachtwoordAanbieden(email, pw, el('cloudHerstelForm'), ['cloudHerstelNieuw', 'cloudHerstelNogEens']);
    verbergHerstel();
    toonGebruiker();
    start();
    if (window.appMelding) {
      appMelding('Je nieuwe wachtwoord is opgeslagen. Log daarmee voortaan in, ook in de app op je beginscherm ' +
        'en op je andere apparaten.', { kop: 'Wachtwoord opgeslagen', soort: 'info' });
    }
  }

  // Niet nu: alleen op dit apparaat uitloggen (scope 'local': lukt ook zonder
  // bereik). Lokaal werk dat nog omhoog moet, blijft staan (geen
  // LS_PENDING weghalen, anders dan bij gewoon uitloggen).
  window.cloudHerstelUitloggen = function () {
    // Eerst alleen het venster weg; de vlag pas als de sessie echt van het
    // apparaat is. signOut vraagt eerst de server; bij een haperende
    // verbinding kan dat duren. Sluit iemand intussen het tabblad, dan komt
    // het venster de volgende keer terug in plaats van stil binnen te zijn
    // (tweede controle v109). Na 4 s tonen we het inlogscherm alvast.
    el('cloudHerstel').style.display = 'none';
    var twijfel = herstelOnbeslist !== null;
    herstelOnbeslist = null;
    var getoond = false;
    var klaar = function () {
      if (getoond) return;
      getoond = true;
      gebruiker = null;
      toonLogin(twijfel
        ? 'Uitgelogd. Let op: je laatste poging kwam misschien toch aan. Lukt inloggen met je oude wachtwoord ' +
          'niet, probeer dan het nieuwe.'
        : 'Uitgelogd. Je wachtwoord is niet gewijzigd.');
    };
    var weg;
    try {
      weg = Promise.resolve(sb.auth.signOut({ scope: 'local' }))
        .then(function () { herstelVlag(false); }, function () {});
    } catch (e) { weg = Promise.resolve(); }
    Promise.race([weg, new Promise(function (r) { setTimeout(r, 4000); })]).then(klaar);
  };

  async function uitloggen() {
    if (!await magVerlaten('uitloggen')) return;
    // Foto's die nog alleen op dit apparaat staan, blijven daar bewaard en
    // gaan omhoog zodra er weer iemand inlogt. Wel even zeggen (v93).
    var wacht = window.glasWachtrij ? glasWachtrij.telling().totaal : 0;
    if (wacht && !await appVraag('Er ' + (wacht === 1 ? 'staat nog 1 foto' : 'staan nog ' + wacht + ' foto\'s') +
        ' op dit apparaat die nog niet in de cloud ' + (wacht === 1 ? 'staat' : 'staan') + '. ' +
        'Ze blijven bewaard en gaan vanzelf mee zodra er weer iemand op dit apparaat inlogt ' +
        'en er bereik is. Wis de websitegegevens dus niet.',
        { kop: 'Uitloggen', ja: 'Toch uitloggen' })) return;
    localStorage.removeItem(LS_PENDING);
    if (window.glasBewerkslotStop) glasBewerkslotStop();
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

  // Ook de prullenbak telt mee: die naam is nog in gebruik, en het project
  // kan teruggezet worden (v91).
  function zoekNaam(naam, behalveId) {
    if (!sb || !gebruiker) return Promise.resolve(null);
    var metKolom = prullenbakKolom;
    return sb.from('projecten').select(metKolom ? 'id,naam,verwijderd_op' : 'id,naam').then(function (res) {
      if (res.error && metKolom && geenPrullenbak(res.error)) return zoekNaam(naam, behalveId);
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
        ? '⚠ Er bestaat al een ander project met de naam ‹' + bestaand.naam + '›' +
          (bestaand.verwijderd_op ? ' (in de prullenbak)' : '') +
          '. Geef dit project een andere naam om verwarring te voorkomen.'
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
    var metFilter = prullenbakKolom;
    metHerkansing(function () {
      var q = sb.from('projecten').select('id,naam,datum,status,aantal_ruiten,adres,open_taken,updated_at',
                                          { count: 'exact' });
      if (metFilter) q = q.is('verwijderd_op', null);     // niet de prullenbak (v91)
      if (zoekTekst(zoekTerm)) {
        var z = '%' + zoekTekst(zoekTerm) + '%';
        q = q.or('naam.ilike.' + z + ',datum.ilike.' + z + ',adres.ilike.' + z);
      }
      // Tot v102: 200, zonder dat iemand zag dat er meer waren (v103).
      return q.order('updated_at', { ascending: false }).limit(1000);
    }, function (res) {
        if (res.error && metFilter && geenPrullenbak(res.error)) { toonProjecten(true); return; }
        if (res.error) {
          lijst.innerHTML = '<div style="padding:20px;color:var(--rood)">De projecten konden niet opgehaald worden.' +
            '<br><span style="color:var(--grijs-tekst);font-size:12px">' + veiligeTekst(res.error.message) + '</span>' +
            '<br><button class="btn btn-secondary btn-sm" style="margin-top:10px" ' +
            'onclick="cloudProjectenTonen()">Opnieuw proberen</button></div>';
          return;
        }
        var telling = el('cloudTelling');
        var totaal = (typeof res.count === 'number' && res.count > res.data.length) ? res.count : res.data.length;
        if (telling) {
          telling.textContent = totaal > res.data.length
            ? res.data.length + ' van ' + totaal + ' getoond — zoek om de andere te vinden'
            : zoekTerm.trim()
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
                 n + (n === 1 ? ' ruit' : ' ruiten') +
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
    werkVanEerder = false;
    localStorage.removeItem(LS_PENDING);
    vuil = false;
    metHerkansing(function () {
      return sb.from('projecten').select('id,data,status' + (prullenbakKolom ? ',verwijderd_op,verwijderd_naam' : ''))
        .eq('id', id).single();
    }, function (res) {
      if (res.error && geenPrullenbak(res.error)) { window.cloudOpen(id); return; }
      if (res.data && res.data.verwijderd_op) { meldPrullenbak(res.data); toonStart(); return; }
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
      serverStatus = null;
      statusHandmatig = false;
      zetStaat(res.data.data || {});
      statusVanServer(res.data);
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
      window.cloudNieuw(naam, 'Er bestaat al een project met de naam \u2039' + bestaand.naam + '\u203a' +
        (bestaand.verwijderd_op
          ? ', en dat staat in de prullenbak. Kies een andere naam, of zet het terug via de prullenbak op het startscherm.'
          : '. Kies een andere naam, of open het bestaande project via de lijst.'));
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
      serverStatus = null;
      statusHandmatig = false;
      projectId = res.data.id;
      window.glasProjectId = projectId;
      basisVan = projectId;    // wat op het scherm staat hoort nu bij het nieuwe project (v103)
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
        // De momentopnames horen bij het oude project (v91).
        if (window.undoLeeg) undoLeeg();
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
  //
  // Sinds v93 staan de originele foto's in een submap (<project>/origineel/).
  // `list` geeft een submap terug als een regel zonder id; die wordt apart
  // leeggemaakt. Zonder dit bleven alle originelen van een verwijderd
  // project in Storage staan — en die zijn het grootst.
  function fotosOpruimen(id, ronde, diepte) {
    if (!sb) return Promise.resolve();
    ronde = ronde || 1;
    diepte = diepte || 0;
    return sb.storage.from('projectfotos').list(id, { limit: 500 })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return null;
        var bestanden = res.data.filter(function (f) { return f && f.id !== null; });
        var mappen = res.data.filter(function (f) { return f && f.id === null && f.name; });
        var paden = bestanden.map(function (f) { return id + '/' + f.name; });
        var weg = paden.length ? sb.storage.from('projectfotos').remove(paden) : Promise.resolve(null);
        return weg.then(function (uit) {
          if (diepte >= 3) return uit;
          return mappen.reduce(function (keten, m) {
            return keten.then(function () { return fotosOpruimen(id + '/' + m.name, 1, diepte + 1); });
          }, Promise.resolve()).then(function () { return uit; });
        }).then(function (uit) {
          if (paden.length === 500 && ronde < 20) return fotosOpruimen(id, ronde + 1, diepte);
          return uit;
        });
      })
      .catch(function (e) { console.warn('[cloud] foto\'s opruimen mislukt', e); });
  }

  // Definitief: de rij, en daarmee taken en logboek, en daarna de foto's.
  // Dit was tot v90 wat 🗑 deed. Nu alleen nog vanuit de prullenbak, bij
  // het opruimen na 30 dagen, of als 18_prullenbak.sql nog niet gedraaid
  // is. `vraag` is de tekst van de bevestiging; zonder vraag (opruimen) geen
  // venster en geen meldingen (v91).
  // alleenUitPrullenbak (v103): bij het automatisch opruimen alleen
  // verwijderen als het project nog in de prullenbak staat. Zette iemand
  // het net terug, dan blijft het staan (met foto's).
  async function definitiefVerwijderen(id, vraag, alleenUitPrullenbak) {
    if (vraag && !await appVraag(vraag,
        { kop: 'Project verwijderen', ja: 'Definitief verwijderen', gevaarlijk: true })) return false;

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
      var wegQ = sb.from('projecten').delete().eq('id', id);
      if (alleenUitPrullenbak) wegQ = wegQ.not('verwijderd_op', 'is', null);
      var res = await wegQ.select('id');
      if (res && res.error) {
        melding = res.error.message;
      } else if (res && Array.isArray(res.data) && res.data.length === 0) {
        // Niets verwijderd. Bestaat hij nog, dan mag deze gebruiker het niet;
        // is hij er niet meer, dan was een ander ons voor.
        var na = await sb.from('projecten').select('id').eq('id', id).maybeSingle();
        if (!na.error && na.data) {
          melding = alleenUitPrullenbak ? 'intussen teruggezet' : 'je hebt hier geen rechten voor';
        } else if (na.error) {
          // Niet na te gaan: dan ook de foto's niet aanraken (v103).
          melding = na.error.message || 'niet na te gaan';
        }
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
      // Wat van dit project nog op dit apparaat wachtte, hoeft niet meer
      // omhoog (v93).
      if (window.glasWachtrij) { try { await glasWachtrij.vergeetProject(id); } catch (e) {} }
    }

    if (lijst) lijst.style.opacity = '';

    if (!gelukt) {
      if (!vraag) { console.warn('[prullenbak] opruimen mislukt: ' + melding); return false; }
      lijstenVernieuwen();
      appFout('Verwijderen mislukt: ' + melding + '. Het project staat er nog.',
              { kop: 'Niet verwijderd' });
      return false;
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
      return true;
    }
    if (vraag) lijstenVernieuwen();
    return true;
  }



  /* ─── prullenbak (v91) ────────────────────────────────────── */
  // 🗑 zet een project 30 dagen in de prullenbak in plaats van het meteen
  // weg te halen (keuze van Jan). Iedereen kan het daar terugzetten; na 30
  // dagen ruimt de app het op, de eerste keer dat iemand het startscherm
  // opent. Zonder 18_prullenbak.sql bestaat de kolom niet: dan merkt de app
  // dat en verwijdert hij zoals vroeger.

  var PRULLENBAK_DAGEN = 30;
  var prullenbakKolom = true;
  var opgeruimd = false;
  window.glasPrullenbakDagen = PRULLENBAK_DAGEN;
  window.glasPrullenbakKolom = function () { return prullenbakKolom; };

  function kolomOntbreekt(err) {
    var t = String((err && err.message) || '') + ' ' + String((err && err.code) || '');
    return /verwijderd_/.test(t) && /does not exist|42703|PGRST204|could not find/i.test(t);
  }
  function geenPrullenbak(err) {
    if (!kolomOntbreekt(err)) return false;
    prullenbakKolom = false;
    console.warn('[prullenbak] kolom ontbreekt; draai 18_prullenbak.sql. Tot dan wordt er definitief verwijderd.');
    return true;
  }

  var OUDE_VRAAG = 'Dit project definitief verwijderen? Dit geldt voor iedereen.\n' +
                   'De foto\'s van dit project worden ook verwijderd.';

  // Het geopende project loslaten, zonder het scherm te laten staan.
  function loslatenNaPrullenbak() {
    projectId = null;
    window.glasProjectId = null;
    geladen = false;
    clearTimeout(herstelKlok);
    if (kanaal) { kanaalZelfWeg = true; try { sb.removeChannel(kanaal); } catch (e) {} kanaal = null; }
    localStorage.removeItem(LS_PROJECT);
    localStorage.removeItem(LS_PENDING);
    localStorage.removeItem(LS_STATE);
    vuil = false;
    bezig = false;
    laatsteJson = null;
    zetStaat({});
    status('Project in de prullenbak', '#6b6862');
    zetHash(null);
    toonStart();
  }

  window.cloudVerwijder = async function (id) {
    if (!prullenbakKolom) return definitiefVerwijderen(id, OUDE_VRAAG);
    if (!await appVraag('Dit project naar de prullenbak verplaatsen? Het verdwijnt voor iedereen uit ' +
        'de lijst, maar blijft ' + PRULLENBAK_DAGEN + ' dagen in de prullenbak op het startscherm staan. ' +
        'Daar kan iedereen het terugzetten, met foto\'s en logboek.',
        { kop: 'Project verwijderen', ja: 'Naar de prullenbak' })) return false;
    // Staat er nog werk open in dit project, dan dat eerst omhoog: het
    // scherm wordt zo leeggemaakt.
    if (id === projectId && !await magVerlaten('het project naar de prullenbak verplaatsen')) return false;

    var res;
    try {
      res = await sb.from('projecten').update({
        verwijderd_op: new Date().toISOString(),
        verwijderd_door: gebruiker.id,
        verwijderd_naam: gebruikersNaam(),
        gewijzigd_door: gebruiker.id,
        gewijzigd_naam: gebruikersNaam()
      }).eq('id', id).select('id');
    } catch (e) {
      res = { error: { message: (e && e.message) || 'geen verbinding' } };
    }
    if (res && res.error && geenPrullenbak(res.error)) return definitiefVerwijderen(id, OUDE_VRAAG);
    if (!res || res.error || !Array.isArray(res.data) || !res.data.length) {
      lijstenVernieuwen();
      appFout('Niet naar de prullenbak verplaatst: ' +
              ((res && res.error && res.error.message) || 'het project bestaat niet meer, of je hebt er geen rechten voor') +
              '.', { kop: 'Niet verwijderd' });
      return false;
    }
    if (id === projectId) loslatenNaPrullenbak();
    else lijstenVernieuwen();
    return true;
  };

  // Wat er in de prullenbak staat, nieuwste eerst.
  window.glasPrullenbak = function () {
    if (!sb || !gebruiker || !prullenbakKolom) return Promise.resolve([]);
    return sb.from('projecten')
      .select('id,naam,adres,aantal_ruiten,verwijderd_op,verwijderd_naam', { count: 'exact' })
      .not('verwijderd_op', 'is', null)
      .order('verwijderd_op', { ascending: false }).limit(1000)
      .then(function (res) {
        if (res && res.error) { geenPrullenbak(res.error); return []; }
        var l = ((res && res.data) || []).slice();
        if (typeof res.count === 'number') l.totaal = res.count;
        return l;
      }, function () { return []; });
  };

  window.glasTerugzetten = async function (id) {
    var res;
    try {
      res = await sb.from('projecten').update({
        verwijderd_op: null, verwijderd_door: null, verwijderd_naam: null,
        gewijzigd_door: gebruiker.id, gewijzigd_naam: gebruikersNaam()
      }).eq('id', id).select('id');
    } catch (e) {
      res = { error: { message: (e && e.message) || 'geen verbinding' } };
    }
    if (!res || res.error || !Array.isArray(res.data) || !res.data.length) {
      appFout('Terugzetten mislukt: ' + ((res && res.error && res.error.message) || 'het project is er niet meer') +
              '.', { kop: 'Prullenbak' });
      return false;
    }
    lijstenVernieuwen();
    return true;
  };

  window.glasNuDefinitief = function (id, naam) {
    return definitiefVerwijderen(id, 'Project ‹' + (naam || 'naamloos') + '› nu definitief verwijderen? ' +
      'Dit kan niet ongedaan gemaakt worden; de foto\'s en het logboek gaan ook weg.');
  };

  // Na 30 dagen: definitief. Eén keer per sessie, bij het startscherm.
  // Welke projecten oud genoeg zijn, beslist de database met zijn eigen
  // klok (prullenbak_opruimbaar, 22_gebruik_en_prullenbak.sql). Tot v102
  // rekende de app met de klok van het apparaat: stond die een maand
  // vooruit, dan werd de hele prullenbak met foto's leeggemaakt (gevonden
  // bij de controle van v103). Is script 22 nog niet gedraaid, dan wordt
  // er niets opgeruimd: liever een volle prullenbak dan iets te vroeg weg.
  window.glasPrullenbakOpruimen = function () {
    if (opgeruimd || !sb || !gebruiker || !prullenbakKolom || !sb.rpc) return Promise.resolve(0);
    opgeruimd = true;
    return Promise.resolve(sb.rpc('prullenbak_opruimbaar', { dagen: PRULLENBAK_DAGEN })).then(function (res) {
      if (!res || res.error || !Array.isArray(res.data)) {
        if (res && res.error) console.warn('[prullenbak] niet opgeruimd: ' + (res.error.message || res.error.code));
        return 0;
      }
      return res.data.reduce(function (keten, rij) {
        return keten.then(function (n) {
          // alleenUitPrullenbak: wie intussen is teruggezet, blijft staan.
          return definitiefVerwijderen(rij.id, null, true).then(function (ok) { return n + (ok ? 1 : 0); });
        });
      }, Promise.resolve(0));
    }, function () { return 0; });
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
  window.cloudLogin = login;   // (oude naam; het formulier gebruikt cloudLoginVerstuur)

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
  // Is er nog een geldige sessie? Een database die 'geen rij' zegt, kan
  // ook betekenen: niet meer ingelogd (de beveiliging laat dan niets zien
  // en laat niets wijzigen). Tot v102 werd dat gemeld als 'project bestaat
  // niet meer' (gevonden bij de controle van v103).
  //   'ok'       – ingelogd
  //   'weg'      – niet meer ingelogd (of de server weigert de sessie)
  //   'onbekend' – kon het niet nagaan (geen bereik)
  function sessieCheck() {
    if (!sb || !sb.auth || !sb.auth.getSession) return Promise.resolve('ok');
    var p;
    try { p = sb.auth.getSession(); } catch (e) { return Promise.resolve('onbekend'); }
    return Promise.resolve(p).then(function (r) {
      if (r && r.data && r.data.session) return 'ok';
      var f = r && r.error;
      if (!f) return 'weg';
      return (f.status >= 400 && f.status < 500) ? 'weg' : 'onbekend';
    }, function () { return 'onbekend'; });
  }

  var sessieGemeld = false;
  function sessieKwijt() {
    geladen = false;
    clearTimeout(herstelKlok);
    // Het werk blijft staan en blijft gemarkeerd als 'moet nog omhoog'.
    if (vuil) { try { localStorage.setItem(LS_PENDING, '1'); } catch (e) {} }
    status('⚠ Opnieuw inloggen — je werk staat op dit apparaat', '#a3231a');
    gebruiker = null;
    if (sessieGemeld) return;
    sessieGemeld = true;
    toonLogin('Je bent niet meer ingelogd. Log opnieuw in: je werk staat nog op dit apparaat ' +
              'en gaat daarna alsnog naar de server.');
  }

  function projectWeg() {
    geladen = false;
    clearTimeout(herstelKlok);
    sessieCheck().then(function (s) {
      if (s === 'weg') { sessieKwijt(); return; }
      if (s === 'onbekend') { mislukt('sessie nagaan'); return; }
      projectEchtWeg();
    });
  }

  function projectEchtWeg() {
    status('⚠ Project bestaat niet meer', '#a3231a');
    // Stond er eigen werk dat nog niet op de server was? Dat mag niet met
    // het project mee verdwijnen: apart bewaren als nieuw project, en naar
    // het startscherm, zodat er niet verder getypt wordt in een project dat
    // er niet meer is (v103). Tot v102 bleef het alleen op het scherm
    // staan; wie daarna een ander project opende, was het kwijt.
    var openWerk = vuil || localStorage.getItem(LS_PENDING) === '1';
    if (openWerk && reddingBewaar(huidigeStaat(), 'project bestond niet meer')) {
      try { localStorage.removeItem(LS_PENDING); } catch (e) {}
      vuil = false;
      werkTeRedden = false;
      projectId = null;
      window.glasProjectId = null;
      try { localStorage.removeItem(LS_PROJECT); } catch (e) {}
      zetHash(null);
      reddingenUploaden();
      toonStart();
      return;
    }
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
      return sb.from('projecten').select('id,data,updated_at,status').eq('id', projectId).maybeSingle();
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
        statusVanServer(res.data);
        // Staat er nog inhoud van een ánder project op het scherm (de link
        // ging open zonder bereik), dan nu de stand van dít project laden.
        // Is daar intussen in getypt, dan gaat dat apart, nooit over dit
        // project heen (v103).
        if (basisVan !== projectId) {
          if (reddenEnLaden(res.data.data || {}, 'getypt voordat het project geladen was')) {
            statusOpgeslagen();
            migreerTaken(projectId);
            if (window.takenLaden) takenLaden();
            if (window.logboekLaden) logboekLaden();
          }
          return;
        }
        if (vuil || localStorage.getItem(LS_PENDING) === '1') {
          vuil = true;
          bestellingenErbij(res.data.data, res.data.status);     // v104
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

  var linkWacht = null;     // een link naar een ander project, die wacht op eigen werk (v103)
  var linkWachtSinds = 0;

  // Het eigen werk staat op de server; nu door naar de link. Was dat snel
  // (met bereik: binnen een paar seconden) en heeft de gebruiker intussen
  // niets gedaan, dan gewoon openen: daar tikte hij op. Duurde het langer
  // of werkt hij intussen verder, dan eerst vragen: anders springt de app
  // ineens naar een ander project terwijl hij bezig is.
  function linkNaOpslaan() {
    if (!linkWacht) return;
    var doel = linkWacht;
    linkWacht = null;
    if (!gebruikerDeedIets && Date.now() - linkWachtSinds < 60000) {
      if (window.cloudOpen) cloudOpen(doel);
      return;
    }
    if (!window.appVraag) return;
    appVraag('Je werk is opgeslagen. Wil je nu het project van de link openen?',
             { kop: 'Verder naar de link', ja: 'Openen', nee: 'Hier blijven' })
      .then(function (ja) { if (ja && window.cloudOpen) cloudOpen(doel); });
  }

  function start() {
    haalData();
    startHartslag();
    // v120: je telefoonnummer (voor op de bestellijst) alvast ophalen.
    if (window.glasMijnLaden) setTimeout(glasMijnLaden, 500);
    sessieGemeld = false;
    // Werk dat eerder apart bewaard moest worden en nog op dit apparaat
    // staat (geen bereik op dat moment): nu alsnog naar de server (v103).
    setTimeout(reddingenUploaden, 2000);
    // Staat er een project in het webadres, dan wint dat: zo opent een
    // gedeelde link bij iedereen hetzelfde project (v87).
    var uitHash = hashProject();
    if (uitHash) {
      // Let op: dit moet ook kloppen als start() een tweede keer langskomt
      // (bijvoorbeeld na inloggen op een pagina die al een project in het
      // webadres had). Stond het project uit de link al open, dan blijft
      // het open; eerder viel de app dan terug naar het startscherm en ging
      // er daarna niets meer omhoog (v87).
      if (uitHash !== projectId && projectId && localStorage.getItem(LS_PENDING) === '1' &&
          kopieVan(projectId) !== 'nee') {
        // Er staat nog werk van een ánder project op dit apparaat dat niet op
        // de server is. Tot v102 gooide een link (bijvoorbeeld uit een
        // taakmail) dat werk weg, en zonder bereik kwam de inhoud van het
        // oude project zelfs in het nieuwe terecht (gevonden bij de controle
        // van v103). Nu gaat dat werk eerst: het oude project opent, de link
        // wacht.
        linkWacht = uitHash;
        linkWachtSinds = Date.now();
        zetHash(projectId);
        if (window.appMelding) {
          // Pas melden als het niet meteen lukt: met bereik staat het werk
          // binnen een paar seconden op de server en gaat de link vanzelf open.
          setTimeout(function () {
            if (linkWacht !== uitHash) return;
            linkWachtSinds = 0;     // gemeld: straks vragen, niet zelf springen
            appMelding('Op dit apparaat staat nog werk dat niet op de server is. Dat project opent ' +
                       'eerst, zodat het werk niet verloren gaat. Zodra het is opgeslagen, kun je door ' +
                       'naar het project van de link.', { kop: 'Eerst je eigen werk', soort: 'letop' });
          }, 4000);
        }
      } else if (uitHash !== projectId) {
        // v120 (gevonden bij de grote proef, akkoord Jan): "het laatst geopende
        // project" (LS_PROJECT) is van alle tabbladen samen. Had een tweede
        // tabblad intussen een ander project geopend, dan kwam dit tabblad bij
        // herladen hier en gooide de vlag "moet nog omhoog" weg, ook als het
        // bewaarde werk juist bij het project in het adres hoorde. Dat werk was
        // dan stil weg. Nu blijft de vlag staan als de kopie bij het project
        // in het adres hoort (dan wint het werk, zie hieronder) of bij een
        // ander bekend project (dan gaat het apart, reddenEnLaden). Alleen een
        // kopie zonder project (van vóór v103) gaat apart en dan pas weg.
        var pendNu = localStorage.getItem(LS_PENDING) === '1';
        var vanWie = kopieVan(uitHash);
        projectId = uitHash;
        window.glasProjectId = projectId;
        localStorage.setItem(LS_PROJECT, projectId);
        if (!pendNu || vanWie === 'geen') {
          localStorage.removeItem(LS_PENDING);
          vuil = false;
        } else if (vanWie === 'onbekend') {
          try { reddingBewaar(JSON.parse(localStorage.getItem(LS_STATE) || 'null'), 'kopie zonder project'); } catch (e) {}
          localStorage.removeItem(LS_PENDING);
          vuil = false;
        }
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
        return sb.from('projecten')
          .select('id,data,updated_at,status' + (prullenbakKolom ? ',verwijderd_op,verwijderd_naam' : ''))
          .eq('id', projectId).maybeSingle();
      }, (function (res) {
          if (res.error && geenPrullenbak(res.error)) { start(); return; }
          // Een link naar een project in de prullenbak: niet openen, wel
          // zeggen waarom. Staat er nog eigen werk open, dan wél openen,
          // zodat dat werk niet zoekraakt (het gaat gewoon omhoog) (v91).
          if (res.data && res.data.verwijderd_op && localStorage.getItem(LS_PENDING) !== '1') {
            meldPrullenbak(res.data);
            projectId = null;
            window.glasProjectId = null;
            localStorage.removeItem(LS_PROJECT);
            zetHash(null);
            toonStart();
            return;
          }
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
            naOffline = true;      // eerst de server lezen vóór de eerste opslag (v104)
            luisterOpProject();
            mislukt('verbinden');
            return;
          }
          geladen = true;
          herstelPoging = 0;
          if (!res.data) { projectId = null; localStorage.removeItem(LS_PROJECT); toonProjecten(); return; }
          if (localStorage.getItem(LS_PENDING) === '1' && kopieVan(projectId) === 'nee') {
            // Lokale, nog niet gesynchroniseerde wijzigingen winnen — maar
            // alleen als de kopie op het apparaat bij dít project hoort
            // (v103). Hoort hij bij een ander, dan nooit versturen (anders
            // overschrijft hij dit project), maar apart bewaren.
            if (!reddenEnLaden(res.data.data || {}, 'hoorde niet bij dit project')) return;
            statusVanServer(res.data);
            statusOpgeslagen();
            migreerTaken(projectId);
            if (window.takenLaden) takenLaden();
            if (window.logboekLaden) logboekLaden();
            luisterOpProject();
            return;
          }
          if (localStorage.getItem(LS_PENDING) === '1') {
            // Openstaand werk wint; zetStaat wordt hier dus niet gedraaid.
            // Het hoort bij dit project (zie hierboven), dus mag het omhoog.
            basisVan = projectId;
            // Dat werk is van dit apparaat, dus telt het voor 'Opgenomen
            // door' als eigen werk (v93).
            werkVanEerder = true;
            // Wat er intussen besteld is, gaat niet verloren door dit werk (v104).
            bestellingenErbij(res.data.data, res.data.status);
            vulOpnemer();
            // Taken en logboek van dít project ophalen (v95).
            if (window.renderProject) renderProject();
            if (window.glasToonApp) glasToonApp();
            statusVanServer(res.data);
            herstelOntbrekendeFotos(res.data.data || {});
            vuil = true;
            status('⚠ Nog niet opgeslagen', '#8a5a00');
            laatsteJson = JSON.stringify(huidigeStaat());
            luisterOpProject();
            synchroniseer();
          } else {
            zetStaat(res.data.data || {});
            statusVanServer(res.data);
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
    // Een herstellink (v109)? Eerst zelf lezen en uit het adres halen, vóór
    // de verbinding bestaat (zie leesHerstelLink). detectSessionInUrl: false:
    // de bibliotheek mag het adres niet zelf lezen (hij liet de code via de
    // terug-knop terugkomen). De app gebruikt geen andere links van Supabase.
    var herstelLink = leesHerstelLink();
    sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { detectSessionInUrl: false } });
    window.glasSupabase = sb;

    (async function () {
      var linkSessie = null;
      if (herstelLink && herstelLink.soort === 'fout') herstelLinkFout(herstelLink);
      if (herstelLink && herstelLink.access_token) linkSessie = await herstelSessie(herstelLink);
      var res = await sb.auth.getSession();
      var sessie = res && res.data && res.data.session;
      var vlag = herstelVlag();
      var vanLink = !!(sessie && herstelLink && herstelLink.soort === 'herstel' &&
        (herstelLink.sub ? sessie.user.id === herstelLink.sub : !!linkSessie));
      if (sessie && (vanLink || (vlag && vlag === sessie.user.id))) {
        // Via de herstellink binnen (of terug terwijl het venster nog
        // openstond, ook in een ander tabblad): eerst een nieuw wachtwoord,
        // dan pas het startscherm.
        gebruiker = sessie.user;
        toonHerstel();
      } else if (sessie) {
        if (vlag) herstelVlag(false);
        gebruiker = sessie.user;
        verbergLogin();
        start();
      } else {
        // Geen sessie: de vlag laten staan. Zonder bereik kan een verlopen
        // sessie even "geen sessie" lijken terwijl hij er nog is; wist je de
        // vlag dan, dan zat je later met bereik stil in de app (tweede
        // controle v109). Een gewone inlog wist hem (login()).
        toonLogin('');
      }
    })();

    if (el('projectNaam')) el('projectNaam').addEventListener('blur', controleerNaam);

    // Enter in het wachtwoordveld: dat doet het formulier nu zelf (v108).
    // Hier niet nog eens login(), anders werd er twee keer ingelogd.

    var herlaadt = false;
    var stilleOvername = false;
    var registratie = null;
    window.glasZoekUpdate = zoekUpdate;

    // Handmatige uitweg: controleren en zo nodig meteen overschakelen.
    // Sinds v99 ook hier eerst veilig opslaan; tot v98 herlaadde de knop
    // meteen als er geen nieuwe versie was.
    window.appBijwerken = function () {
      if (updateBezig) return;
      status('… Versie controleren');
      var klaar = registratie ? registratie.update().catch(function () {}) : Promise.resolve();
      klaar.then(function () {
        var w = registratie && registratie.waiting;
        if (w && navigator.serviceWorker.controller) {
          updateWorker = w;
          veiligBijwerken();
        } else {
          veiligBijwerken({ alleenHerladen: true });
        }
      });
    };

    if ('serviceWorker' in navigator) {
      // Had de pagina bij het laden nog geen service worker (de allereerste
      // keer), dan is de eerste overname geen nieuwe versie: de pagina kwam
      // toen al vers van de server. Tot v98 herlaadde de app dan voor niets.
      var hadController = !!navigator.serviceWorker.controller;
      // updateViaCache 'none': bij elke controle sw.js vers van de server,
      // nooit uit de browsercache (GitHub Pages laat die tien minuten
      // bewaren). Chrome doet dat al vanzelf; zo ook in elke Safari (v101).
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
        registratie = reg;
        // Bij het openen, bij elke terugkeer naar de app, en sinds v99 ook
        // elke vijf minuten terwijl hij openstaat: een iPad-app op het
        // beginscherm kan dagen openstaan zonder ooit opnieuw te starten.
        reg.update().catch(function () {});
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') reg.update().catch(function () {});
        });
        setInterval(function () {
          if (document.visibilityState === 'visible') reg.update().catch(function () {});
        }, 5 * 60 * 1000);

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
        if (!hadController) { hadController = true; return; }
        // Bij een stille overname draait er al dezelfde versie; herladen
        // zou de gebruiker alleen maar uit zijn werk halen.
        if (stilleOvername) { stilleOvername = false; return; }
        herlaadt = true;
        if (ikWerkBij) { location.reload(); return; }
        // Een ander tabblad (of venster) werkte bij. Tot v98 herlaadde dit
        // tabblad dan meteen, midden in wat je deed. Nu eerst je werk
        // veiligstellen, net als bij zelf bijwerken (v99).
        veiligBijwerken({ doorAnder: true });
      });
    }

    function zoekUpdate(dringend) {
      if (!registratie) return;
      registratie.update().catch(function () {}).then(function () {
        if (registratie.waiting && navigator.serviceWorker.controller) beoordeel(registratie.waiting);
        else if (dringend) status('⚠ Er is een nieuwere versie — tik op ↻ Bijwerken', '#a3231a');
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
          verplichtBijwerken(worker, versie);
        }
      };
      try { worker.postMessage({ vraag: 'versie' }, [kanaal.port2]); } catch (e) {}
      // Antwoordt hij niet (oudere versie zonder die mogelijkheid), dan
      // is het hoe dan ook een andere versie.
      setTimeout(function () { if (!beantwoord) verplichtBijwerken(worker, ''); }, 1200);
    }

    /* ─── verplicht en veilig bijwerken (v99) ───────────────────
       Keuze van Jan: élke nieuwe versie is verplicht. Er komt een balk die
       op elk scherm te zien is (ook het startscherm en het inloggen) en
       niet weg te klikken is. Na het aftellen — 60 s met een project open,
       anders 10 s — wacht de app tot je 10 s niets doet, en dan:
         1. opslaan, en wachten tot de server het heeft (niet op een klok);
         2. gelukt: project sluiten, terug naar het startscherm;
            niet gelukt (geen bereik): het werk blijft op het apparaat
            met de vlag 'moet nog omhoog' en gaat na het bijwerken vanzelf
            alsnog omhoog — dan gaat het project na het bijwerken weer open;
         3. de nieuwe versie laden;
         4. melden dat er bijgewerkt is, met 'Verder met …'.
       Harde eis van Jan: nooit gegevens kwijt. Daarom gaat er nooit iets
       weg dat niet óf op de server óf op het apparaat staat. */
    function verplichtBijwerken(worker, versie) {
      updateWorker = worker;
      if (versie) updateVersie = versie;
      if (updateBezig || updateKlok) return;
      var metWerk = !!projectId || vuil || localStorage.getItem(LS_PENDING) === '1';
      var eind = Date.now() + (metWerk ? UPDATE_AFTELLEN : UPDATE_AFTELLEN_LEEG);
      var uiterst = eind + UPDATE_HOOGSTENS_WACHTEN;
      function tik() {
        var nu = Date.now();
        var rest = Math.ceil((eind - nu) / 1000);
        if (rest > 0) { toonUpdateBalk('aftellen', rest); return; }
        // Niet midden in je werk: wacht tot je even niets doet en er geen
        // venster openstaat (een vraag, het wachtwoord). Wel met een grens,
        // anders houdt een vergeten venster de update eeuwig tegen.
        // Ook niet terwijl iemand een nieuw wachtwoord kiest (v109); komt het
        // toch tot herladen, dan komt dat venster daarna terug (herstelVlag,
        // in localStorage).
        var rustig = nu - laatsteActie >= UPDATE_STIL &&
                     !document.querySelector('.melding-laag') &&
                     !(window.glasHerstelOpen && glasHerstelOpen());
        if (!rustig && nu < uiterst) { toonUpdateBalk('wachten'); return; }
        clearInterval(updateKlok);
        updateKlok = null;
        veiligBijwerken();
      }
      updateKlok = setInterval(tik, 1000);
      tik();
    }

    function veiligBijwerken(opties) {
      var o = opties || {};
      if (updateBezig) return;
      updateBezig = true;
      if (updateKlok) { clearInterval(updateKlok); updateKlok = null; }
      toonUpdateBalk(o.alleenHerladen ? 'herladen' : 'opslaan');
      var pid = projectId;
      var naam = waarde('projectNaam');
      opslaanEnWachten(UPDATE_OPSLAAN_MAX).then(function (opgeslagen) {
        if (!o.alleenHerladen) {
          try {
            localStorage.setItem(LS_NA_UPDATE, JSON.stringify({
              id: pid, naam: naam, opgeslagen: opgeslagen,
              van: typeof APP_VERSIE !== 'undefined' ? APP_VERSIE : '', op: Date.now()
            }));
          } catch (e) {}
        }
        // Opgeslagen: netjes terug naar het startscherm (keuze van Jan).
        // Niet opgeslagen: het project blijft gekoppeld, zodat de app na het
        // herladen het werk van dit apparaat meteen weer opstuurt.
        if (pid && opgeslagen && !o.alleenHerladen && window.glasNaarStart) glasNaarStart('stil');
        toonUpdateBalk(o.alleenHerladen ? 'herladen' : (opgeslagen ? 'laden' : 'lokaal'));
        setTimeout(function () {
          ikWerkBij = true;
          var w = !o.doorAnder && !o.alleenHerladen && (updateWorker || (registratie && registratie.waiting));
          if (w) {
            try { w.postMessage('skipWaiting'); } catch (e) {}
            // Vangnet als de wissel uitblijft (bijvoorbeeld al door een
            // ander tabblad gedaan).
            setTimeout(function () { location.reload(); }, 5000);
          } else {
            location.reload();
          }
        }, opgeslagen ? 400 : 2500);
      });
    }
    window.glasVeiligBijwerken = veiligBijwerken;
    window.glasVerplichtBijwerken = verplichtBijwerken;
  }

  /* ─── bijwerken: hulpstukken (v99) ─────────────────────────── */
  // De tests zetten kortere tijden via config.js (updateTijden); in de
  // echte config.js staat dat niet, dan gelden deze.
  var tijden = cfg.updateTijden || {};
  var UPDATE_AFTELLEN = tijden.aftellen || 60000;      // met een project open
  var UPDATE_AFTELLEN_LEEG = tijden.leeg || 10000;     // op het startscherm of bij inloggen
  var UPDATE_STIL = tijden.stil || 10000;              // zo lang niets doen voor het bijwerken
  var UPDATE_HOOGSTENS_WACHTEN = 5 * 60000;
  var UPDATE_OPSLAAN_MAX = 15000;       // langer niet wachten op de server
  var LS_NA_UPDATE = 'glasopname_na_update';
  var updateWorker = null;
  var updateVersie = '';
  var updateKlok = null;
  var updateBezig = false;
  var ikWerkBij = false;
  var laatsteActie = 0;

  ['keydown', 'input', 'pointerdown', 'touchstart'].forEach(function (soort) {
    document.addEventListener(soort, function () { laatsteActie = Date.now(); },
                              { capture: true, passive: true });
  });

  // Opslaan en wachten tot de server het heeft. Geeft true als alles
  // binnen is (of er niets te versturen viel), false als het werk alleen
  // op het apparaat staat (geen bereik, of de server antwoordde niet op
  // tijd). In dat laatste geval blijft de vlag 'moet nog omhoog' staan.
  function opslaanEnWachten(max) {
    return new Promise(function (klaar) {
      // Een veld dat nog focus heeft verliest die: dan vuren de
      // onchange-handlers (bijv. een taakomschrijving) nog vóór het opslaan.
      try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
      try { if (window.opslaan) window.opslaan(); } catch (e) {}
      var eind = Date.now() + max;
      var poging = 0;
      (function kijk() {
        // Alleen wat dít tabblad weet. De vlag in localStorage delen alle
        // tabbladen; typt iemand in een ander tabblad, dan zou dit tabblad
        // anders wachten op werk dat niet van hem is. (Na het opstarten
        // zet start() `vuil` zelf aan als er nog werk van eerder openstaat.)
        var open = vuil || bezig;
        if (!projectId || !open) { klaar(true); return; }
        // Geen bereik, de server weigert deze (oude) versie, of het duurt te
        // lang: dan staat het werk op het apparaat en gaat het later omhoog.
        if (!navigator.onLine || versieGeweigerd || Date.now() > eind) { klaar(false); return; }
        // Hooguit elke drie seconden een poging; na een fout niet hameren.
        if (!bezig && Date.now() - poging > 3000) {
          poging = Date.now();
          vuil = true;
          synchroniseer();
        }
        setTimeout(kijk, 250);
      })();
    });
  }
  window.glasOpslaanEnWachten = opslaanEnWachten;

  function toonUpdateBalk(stand, seconden) {
    var balk = el('updateBalk');
    if (!balk) return;
    var versie = updateVersie ? ' (' + updateVersie + ')' : '';
    var tekst, knop = '';
    if (stand === 'aftellen') {
      tekst = '<b>Nieuwe versie' + versie + '.</b> De app slaat je werk op en werkt bij over ' +
              '<span class="update-tel">' + seconden + '</span> s.';
      knop = '<button type="button" onclick="glasVeiligBijwerken()">Nu bijwerken</button>';
    } else if (stand === 'wachten') {
      tekst = '<b>Nieuwe versie' + versie + '.</b> Bijwerken zodra je even niets doet…';
      knop = '<button type="button" onclick="glasVeiligBijwerken()">Nu bijwerken</button>';
    } else if (stand === 'opslaan') {
      tekst = '<b>Bijwerken.</b> Je werk wordt opgeslagen…';
    } else if (stand === 'laden') {
      tekst = '<b>Opgeslagen.</b> De nieuwe versie wordt geladen…';
    } else if (stand === 'herladen') {
      tekst = '<b>Bijwerken.</b> De app wordt opnieuw geladen…';
    } else if (stand === 'klaar') {
      tekst = '<b>Bijgewerkt naar ' + (typeof APP_VERSIE !== 'undefined' ? APP_VERSIE : '') + '.</b>';
    } else if (stand === 'lokaal') {
      tekst = '<b>Je werk is nog niet op de server</b> (geen verbinding?). Het staat veilig op ' +
              'dit apparaat en gaat na het bijwerken vanzelf omhoog.';
    }
    balk.className = 'update-balk ' + stand;
    balk.innerHTML = '<span class="update-tekst">' + (stand === 'klaar' ? '✓ ' : '↻ ') + tekst + '</span>' + knop;
    balk.hidden = false;
  }

  // Na het herladen: zeggen dat er bijgewerkt is en waar je werk is.
  function naBijwerkenMelden() {
    var r = null;
    try { r = JSON.parse(localStorage.getItem(LS_NA_UPDATE) || 'null'); } catch (e) {}
    if (!r) return;
    localStorage.removeItem(LS_NA_UPDATE);
    if (!r.op || Date.now() - r.op > 10 * 60000) return;      // oud: niet meer melden
    var nu = typeof APP_VERSIE !== 'undefined' ? APP_VERSIE : '';
    var tot = Date.now() + 20000;
    (function kijk() {
      var klaar = document.body.classList.contains('op-start') || !!window.glasProjectId ||
                  !!document.querySelector('#cloudLogin[style*="flex"]');
      if (!klaar && Date.now() < tot) { setTimeout(kijk, 300); return; }
      var naam = r.naam || '(naamloos)';
      // Geen project open: een korte bevestiging in de balk, geen venster.
      // (In de statusbalk bovenin werd hij meteen overschreven.)
      if (!r.id) {
        toonUpdateBalk('klaar');
        setTimeout(function () {
          var b = el('updateBalk');
          if (b && /klaar/.test(b.className)) b.hidden = true;
        }, 6000);
        return;
      }
      if (!r.opgeslagen) {
        if (window.appMelding) {
          appMelding('De app is bijgewerkt naar ' + nu + '. Je werk in "' + naam + '" kon vóór het bijwerken ' +
                     'nog niet naar de server. Het staat veilig op dit apparaat en gaat vanzelf omhoog zodra ' +
                     'dat lukt; houd de statusbalk bovenaan in de gaten. Het project staat weer open; de ' +
                     'indeling kan anders zijn dan je gewend bent.',
                     { kop: 'Bijgewerkt', soort: 'letop' });
        }
        return;
      }
      if (!window.appVraag) return;
      appVraag('De app is bijgewerkt naar ' + nu + '. Je werk in "' + naam + '" is opgeslagen. ' +
               'Open het project opnieuw om verder te gaan; de indeling kan anders zijn dan je gewend bent.',
               { kop: 'Bijgewerkt', ja: 'Verder met "' + naam + '"', nee: 'Sluiten', soort: 'info' })
        .then(function (ja) { if (ja && window.cloudOpen) cloudOpen(r.id); });
    })();
  }

  function opstarten() {
    init();
    naBijwerkenMelden();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', opstarten);
  } else {
    opstarten();
  }
})();
