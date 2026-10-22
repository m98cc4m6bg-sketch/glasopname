/* ═══════════════════════════════════════════════════════════════
   Glasopname – startscherm (v87)
   Wat je ziet na het inloggen: je eigen openstaande taken, de
   projecten, en een weg terug naar waar je gebleven was. Pas als je
   hier een project kiest komt de invoer in beeld.

   Dit bestand doet alleen de weergave; het ophalen zit in cloud.js
   (glasProjecten, glasMijnTaken, glasNaarStart, cloudOpen).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }

  function esc2(t) {
    return String(t === undefined || t === null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');   // v120: ook > en '
  }

  function datumKort(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var vandaag = new Date();
    var zelfdeDag = d.toDateString() === vandaag.toDateString();
    var tijd = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (zelfdeDag) return 'vandaag ' + tijd;
    return String(d.getDate()).padStart(2, '0') + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' + tijd;
  }

  var zoekTimer = null;
  var projectenCache = [];

  /* ─── tonen en verbergen ──────────────────────────────────── */

  window.glasStartTelefoonKnop = function () {
    var k = el('startTelefoon');
    if (!k) return;
    var tel = window.glasGebruiker ? glasGebruiker().telefoon : '';
    k.textContent = tel ? '📞' : '📞 Telefoon toevoegen';
    k.title = tel ? 'Mijn telefoonnummer: ' + tel + ' (tik om te wijzigen)' : 'Mijn telefoonnummer, voor op de bestellijst';
  };

  window.glasToonStart = function () {
    var scherm = el('startScherm');
    if (!scherm) return;
    scherm.hidden = false;
    document.body.classList.add('op-start');
    // Altijd op Start beginnen; de naslag terug naar zijn eigen tabblad.
    window.startTab('start');
    var naam = (window.glasGebruiker ? glasGebruiker().naam : '') || '';
    var wie = el('startGebruiker');
    if (wie) wie.innerHTML = naam ? 'Ingelogd als <b>' + esc2(naam) + '</b>' : '';
    // v120: zonder telefoonnummer valt de knop op (voor op de bestellijst).
    window.glasStartTelefoonKnop();
    if (window.glasBackupKnop) glasBackupKnop();
    if (window.glasMijnLaden) glasMijnLaden().then(window.glasStartTelefoonKnop);
    vulVerder();
    // Eerst opruimen wat langer dan 30 dagen in de prullenbak staat, dan
    // pas de prullenbak tonen. De taken van projecten in de prullenbak
    // horen niet onder 'Mijn taken' (v91).
    var prul = (window.glasPrullenbakOpruimen ? glasPrullenbakOpruimen() : Promise.resolve())
      .then(function () { return window.glasPrullenbak ? glasPrullenbak() : []; }, function () { return []; });
    vulTaken(prul);
    vulProjecten(el('startZoek') ? el('startZoek').value : '');
    prul.then(vulPrullenbak);
    vulWaarschuwing();
  };

  /* ─── waarschuwingen (v103) ──────────────────────────────────
     Vraag van Jan: nooit iets stilzwijgend kwijt. Wat hier staat, moet
     iemand zien vóórdat het een probleem wordt:
     - de database of de foto-opslag in de cloud bijna vol (vanaf 80%,
       rood vanaf 95%);
     - foto's die al langer dan een dag op dit apparaat wachten, of die de
       opslag weigert;
     - werk dat apart bewaard moet worden maar nog niet op de server staat. */
  var GRENS_LET_OP = 80;
  var GRENS_ROOD = 95;

  function vulWaarschuwing() {
    var blok = el('startWaarschuwing');
    if (!blok) return;
    var regels = [];
    var rood = false;

    var red = window.glasReddingen ? glasReddingen() : { aantal: 0 };
    if (red && red.aantal) {
      rood = true;
      regels.push('<div class="waarschuwing-regel rood"><b>Werk dat apart bewaard moet worden</b><br>' +
        'Op dit apparaat ' + (red.aantal === 1 ? 'staat werk' : 'staan ' + red.aantal + ' stukken werk') +
        ' dat niet bij het open project hoorde. Het gaat als apart project naar de server zodra dat lukt' +
        (red.fout ? ' (laatste poging: ' + esc2(red.fout) + ')' : '') + '. Wis de websitegegevens niet.</div>');
    }

    var w = (window.glasWachtrij && glasWachtrij.telling) ? glasWachtrij.telling() : null;
    if (w && w.totaal && (w.lang || w.vol || w.geweigerd)) {
      rood = true;
      regels.push('<div class="waarschuwing-regel rood"><b>Foto\'s wachten op uploaden</b><br>' +
        w.totaal + ' bestand(en) staan alleen op dit apparaat' +
        (w.vol ? '; de opslag in de cloud is vol' : '') +
        (w.lang ? '; het oudste wacht al langer dan een dag' : '') +
        (w.geweigerd ? '; ' + w.geweigerd + ' worden geweigerd' : '') + '. ' +
        '<button class="btn btn-secondary btn-sm" onclick="wachtrijUitleg()">Meer</button></div>');
    }

    var zonder23 = false;
    var zonder24 = false;
    function toon(g) {
      var extra = [];
      if (zonder24) {
        extra.push('<div class="waarschuwing-regel"><b>Voor Jan: SQL-script 24 is nog niet gedraaid</b><br>' +
          'Plak 24_bewerkslot.sql in Supabase → SQL Editor en kies Run. Pas dan kan maar één apparaat ' +
          'tegelijk een project bewerken; zonder kan een apparaat dat offline was, werk van een ander ' +
          'overschrijven.</div>');
      }
      if (zonder23) {
        extra.push('<div class="waarschuwing-regel"><b>Voor Jan: SQL-script 23 is nog niet gedraaid</b><br>' +
          'Plak 23_bestellingen.sql in Supabase → SQL Editor en kies Run. Het zorgt dat een apparaat ' +
          'dat offline was, nooit een bestelling kan wissen. De app vangt dat nu zelf op, maar het ' +
          'script is de tweede verdediging.</div>');
      }
      if (g) {
        [['database', 'Database (projecten, taken, logboek)'], ['opslag', 'Foto-opslag']].forEach(function (x) {
          var d = g[x[0]];
          if (!d || d.pct < GRENS_LET_OP) return;
          var r = d.pct >= GRENS_ROOD;
          if (r) rood = true;
          extra.push('<div class="waarschuwing-regel' + (r ? ' rood' : '') + '"><b>' + x[1] + ' ' +
            (r ? 'bijna vol' : 'raakt vol') + ': ' + d.pct + '%</b> (' + d.mb + ' van ' + d.maxMb + ' MB)' +
            '<div class="ruimte-balk"><span style="width:' + Math.min(100, d.pct) + '%"></span></div>' +
            (x[0] === 'database'
              ? 'Is hij vol, dan neemt de cloud geen wijzigingen meer aan (het werk blijft dan op de apparaten). '
              : 'Is hij vol, dan blijven nieuwe foto\'s op de apparaten wachten. ') +
            'Voor Jan: leeg de prullenbak definitief of zet Supabase op een betaald plan.</div>');
        });
      }
      var alles = regels.concat(extra);
      blok.hidden = !alles.length;
      blok.classList.toggle('rood', rood);
      blok.innerHTML = alles.length
        ? '<div class="start-blokkop"><h2>⚠ Let op</h2></div>' + alles.join('')
        : '';
    }
    toon(null);
    var gebruik = null;
    if (window.glasGebruik) Promise.resolve(glasGebruik()).then(function (g) { gebruik = g; toon(g); }, function () {});
    if (window.glasScript23) Promise.resolve(glasScript23()).then(function (ja) {
      if (ja === false) { zonder23 = true; toon(gebruik); }
    }, function () {});
    if (window.glasScript24) Promise.resolve(glasScript24()).then(function (ja) {
      if (ja === false) { zonder24 = true; toon(gebruik); }
    }, function () {});
  }
  window.startWaarschuwing = vulWaarschuwing;
  // De wachtrij is pas na de start ingelezen, en verandert terwijl het
  // startscherm openstaat: dan de waarschuwing bijwerken.
  document.addEventListener('glaswachtrij', function () {
    var scherm = el('startScherm');
    if (scherm && !scherm.hidden) vulWaarschuwing();
  });

  /* ─── naslag op het startscherm (v98) ──────────────────────────
     Jan wil de naslag kunnen bekijken zonder eerst een project te openen.
     Er is maar één naslag: het blok #naslagInhoud verhuist tussen het
     tabblad Naslag in de app en het startscherm. Twee kopieën gaven dubbele
     ids (het zoekveld, het grote fotovenster), en dan zoekt de ene in de
     andere. */
  function naslagNaar(doel) {
    var inhoud = el('naslagInhoud');
    if (inhoud && doel && inhoud.parentNode !== doel) doel.appendChild(inhoud);
  }

  window.naslagTerugInApp = function () {
    naslagNaar(el('panel-naslag'));
  };

  window.startTab = function (welk) {
    var naslag = welk === 'naslag';
    var tabs = { start: el('startTabStart'), naslag: el('startTabNaslag') };
    Object.keys(tabs).forEach(function (k) {
      if (!tabs[k]) return;
      tabs[k].classList.toggle('aan', k === welk);
      tabs[k].setAttribute('aria-selected', k === welk ? 'true' : 'false');
    });
    var inhoud = el('startInhoud'), plek = el('startNaslag');
    if (inhoud) inhoud.hidden = naslag;
    if (plek) plek.hidden = !naslag;
    if (naslag) {
      naslagNaar(plek);
      if (window.renderNaslag) renderNaslag();
    } else {
      window.naslagTerugInApp();
    }
    var scherm = el('startScherm');
    if (scherm) scherm.scrollTop = 0;
  };

  window.glasToonApp = function () {
    var scherm = el('startScherm');
    if (scherm) scherm.hidden = true;
    document.body.classList.remove('op-start');
    window.naslagTerugInApp();
    zetProjectKop();
  };

  // De naam van het project waar je in zit, bovenin, met een weg terug.
  window.zetProjectKop = function () {
    var vak = el('kopProject');
    if (!vak) return;
    var naam = (el('projectNaam') || {}).value || '';
    var open = !!window.glasProjectId;
    vak.hidden = !open;
    if (open) vak.innerHTML = '<button class="btn btn-ghost btn-sm" onclick="glasNaarStart()" ' +
      'title="Terug naar het startscherm">← Projecten</button>' +
      '<b class="kop-projectnaam">' + esc2(naam || '(naamloos)') + '</b>';
  };

  /* ─── verder waar je gebleven was ─────────────────────────── */

  function vulVerder() {
    var vak = el('startVerder');
    if (!vak) return;
    var laatst = window.glasLaatsteProject ? glasLaatsteProject() : null;
    if (!laatst || !laatst.id) { vak.innerHTML = ''; return; }
    // De naam weten we niet altijd (bijvoorbeeld na het herstarten van de
    // app); dan halen we hem uit de projectenlijst die hier toch al staat.
    var naam = laatst.naam;
    if (!naam) {
      var p = projectenCache.find(function (x) { return x.id === laatst.id; });
      naam = p && p.naam;
    }
    if (!naam && projectenCache.length) { vak.innerHTML = ''; return; }  // bestaat niet meer
    vak.innerHTML = '<button class="start-verder" onclick="cloudOpen(\'' + esc2(laatst.id) + '\')">' +
      '↩ Verder met <b>' + esc2(naam || 'het laatste project') + '</b></button>';
  }

  /* ─── mijn taken ──────────────────────────────────────────── */

  function vulTaken(prul) {
    var vak = el('startTaken');
    var teller = el('startTakenTelling');
    if (!vak || !window.glasMijnTaken) return;
    vak.innerHTML = '<div class="start-leeg">Taken ophalen…</div>';

    Promise.all([glasMijnTaken(), window.glasProjecten ? glasProjecten('') : Promise.resolve({ data: [] }),
                 Promise.resolve(prul || [])])
      .then(function (uit) {
        // Ophalen mislukt: dat zeggen, niet "Geen openstaande taken" (v103).
        if (uit[0] === null) {
          if (teller) teller.textContent = '';
          vak.innerHTML = '<div class="start-leeg start-fout">Je taken konden niet opgehaald worden ' +
            '(geen bereik?). Ze zijn er nog. <button class="btn btn-secondary btn-sm" ' +
            'onclick="startVernieuwen()">Opnieuw proberen</button></div>';
          return;
        }
        var weg = {};
        (uit[2] || []).forEach(function (p) { weg[p.id] = true; });
        var taken = uit[0].filter(function (t) { return !weg[t.project_id]; });
        // Meer open taken dan opgehaald: zeggen, niet stil afkappen (v103).
        var meerTaken = (typeof uit[0].totaal === 'number' && uit[0].totaal > uit[0].length)
          ? '<div class="start-leeg start-fout">De oudste ' + uit[0].length + ' van ' + uit[0].totaal +
            ' open taken staan hier. Vink er een paar af om de rest te zien.</div>'
          : '';
        var projecten = (uit[1] && uit[1].data) || [];
        var naamVan = {};
        projecten.forEach(function (p) { naamVan[p.id] = p.naam; });

        if (teller) teller.textContent = taken.length ? (uit[0].totaal || taken.length) + ' open' : '';
        if (!taken.length) {
          vak.innerHTML = '<div class="start-leeg">Geen openstaande taken op jouw naam. ' +
            'Taken maak je aan bij een project, op het tabblad Project info.</div>';
          return;
        }
        vak.innerHTML = taken.map(function (t) {
          return '<div class="start-taak">' +
            '<button class="start-taak-klaar" title="Afvinken" ' +
              'onclick="startTaakKlaar(\'' + esc2(t.id) + '\')">○</button>' +
            '<div class="start-taak-tekst" onclick="cloudOpen(\'' + esc2(t.project_id) + '\')">' +
              esc2(t.tekst) +
              '<span>' + esc2(naamVan[t.project_id] || 'project') +
              (t.aangemaakt_op ? ' · ' + datumKort(t.aangemaakt_op) : '') + '</span>' +
            '</div></div>';
        }).join('') + meerTaken;
      });
  }

  // Lukt afvinken niet, dan meldt glasTaakWijzig dat; de lijst wordt
  // opnieuw opgehaald en toont de taak dan gewoon weer als open (v103).
  window.startTaakKlaar = function (id) {
    if (!window.glasTaakWijzig) return;
    glasTaakWijzig(id, { klaar: true }).then(function () { vulTaken(); });
  };

  /* ─── projecten ───────────────────────────────────────────── */

  // 'aangemaakt' krijgt geen plaatje: dat is de gewone toestand. De lange
  // status 'bezig met inmeten/verwerken' wordt hier kort "inmeten" (v88).
  function statusLabel(p) {
    var s = String(p.status || 'aangemaakt');
    if (s === 'besteld') return '<em class="start-status besteld">besteld</em>';
    if (s === 'afgerond') return '<em class="start-status afgerond">afgerond</em>';
    if (s === 'geleverd' || s === 'gemonteerd') {
      return '<em class="start-status afgerond">' + esc2(s) + '</em>';
    }
    if (/inmeten|verwerken|ingemeten/.test(s)) {
      return '<em class="start-status bezig">inmeten</em>';
    }
    return '';
  }

  /* ─── sorteren (v102, keuze van Jan) ───────────────────────────
     Laatst gewijzigd (standaard), aanmaakdatum (nieuwste eerst) of alfabet.
     Alleen de volgorde op het scherm: er wordt niets opgeslagen in de
     database. De keuze wordt per apparaat onthouden; lukt dat niet
     (privémodus), dan gewoon terug naar laatst gewijzigd. */
  var SORTERINGEN = ['gewijzigd', 'aangemaakt', 'alfabet'];
  var LS_SORTERING = 'glasopname_sortering';

  // De keuze van deze sessie staat in het geheugen; localStorage is alleen
  // om hem na het herladen terug te hebben. Zonder dat geheugen werkte
  // kiezen in privémodus niet: de keuze kon niet bewaard worden en werd
  // daarna ook niet gelezen (gevonden in de test, v102).
  var gekozen = null;

  function huidigeSortering() {
    if (gekozen) return gekozen;
    var s = null;
    try { s = localStorage.getItem(LS_SORTERING); } catch (e) {}
    return SORTERINGEN.indexOf(s) >= 0 ? s : 'gewijzigd';
  }

  window.startSorteer = function (waarde) {
    if (SORTERINGEN.indexOf(waarde) < 0) waarde = 'gewijzigd';
    gekozen = waarde;
    try { localStorage.setItem(LS_SORTERING, waarde); } catch (e) {}
    vulProjecten(el('startZoek') ? el('startZoek').value : '');
  };

  // Op naam zoals een mens dat verwacht: hoofdletters en accenten tellen
  // niet mee (Éénhoorn bij de E), en getallen als getal (Project 2 vóór
  // Project 10). De database sorteert dat per installatie anders; daarom
  // hier nog eens, over dezelfde set.
  var opNaam = (typeof Intl !== 'undefined' && Intl.Collator)
    ? new Intl.Collator('nl', { sensitivity: 'base', numeric: true }).compare
    : function (a, b) { return String(a).localeCompare(String(b)); };

  function sorteer(lijst, sortering) {
    var kopie = lijst.slice();
    if (sortering === 'alfabet') {
      kopie.sort(function (a, b) {
        var x = String(a.naam || '').trim(), y = String(b.naam || '').trim();
        // Naamloos achteraan, niet bovenaan.
        if (!x !== !y) return x ? -1 : 1;
        return opNaam(x, y) || String(a.id).localeCompare(String(b.id));
      });
    } else {
      var veld = sortering === 'aangemaakt' ? 'created_at' : 'updated_at';
      kopie.sort(function (a, b) { return String(b[veld] || '').localeCompare(String(a[veld] || '')); });
    }
    return kopie;
  }

  var projectenVraag = 0;     // alleen het antwoord op de laatste vraag tonen

  function vulProjecten(zoek) {
    var vak = el('startProjecten');
    if (!vak || !window.glasProjecten) return;
    var sortering = huidigeSortering();
    var keuze = el('startSortering');
    if (keuze && keuze.value !== sortering) keuze.value = sortering;
    vak.innerHTML = '<div class="start-leeg">Projecten ophalen…</div>';
    // Wie snel achter elkaar een andere sortering kiest of typt, mag niet
    // een ouder antwoord als laatste op het scherm krijgen (v102).
    var dezeVraag = ++projectenVraag;
    glasProjecten(zoek, sortering).then(function (res) {
      if (dezeVraag !== projectenVraag) return;
      if (res.error) {
        vak.innerHTML = '<div class="start-leeg start-fout">De projecten konden niet opgehaald worden. ' +
          '<button class="btn btn-secondary btn-sm" onclick="glasToonStart()">Opnieuw proberen</button></div>';
        return;
      }
      var lijst = sorteer(res.data || [], sortering);
      projectenCache = lijst;
      vulVerder();
      var teller = el('startProjectTelling');
      var totaal = (typeof res.totaal === 'number' && res.totaal > lijst.length) ? res.totaal : lijst.length;
      if (teller) teller.textContent = totaal ? totaal + ' projecten' : '';
      // De lijst toont er hooguit 1000. Zijn het er meer, dan dat zeggen,
      // en hoe je de rest vindt (v103, vraag van Jan: nooit stil weg).
      var afgekapt = totaal > lijst.length
        ? '<div class="start-leeg start-fout">' + lijst.length + ' van ' + totaal + ' projecten getoond. ' +
          'Zoek op naam of adres om de andere te vinden' +
          (sortering === 'alfabet' ? '' : ', of kies een andere sortering') + '.</div>'
        : '';
      if (!lijst.length) {
        vak.innerHTML = '<div class="start-leeg">' +
          (String(zoek || '').trim() ? 'Geen project gevonden.' : 'Nog geen projecten. Maak er hieronder een aan.') +
          '</div>';
        return;
      }
      // Bovenaan: onderaan een lijst van 1000 ziet niemand hem.
      vak.innerHTML = afgekapt + lijst.map(function (p) {
        return '<div class="start-project">' +
          '<button class="start-project-weg" title="Project verwijderen" ' +
            'onclick="event.stopPropagation(); cloudVerwijder(\'' + esc2(p.id) + '\')">🗑</button>' +
          '<div class="start-project-info" onclick="cloudOpen(\'' + esc2(p.id) + '\')">' +
          '<strong>' + esc2(p.naam || '(naamloos)') + statusLabel(p) + '</strong>' +
          '<span>' + (p.adres ? esc2(p.adres) + ' · ' : '') +
          (p.aantal_ruiten || 0) + ((p.aantal_ruiten || 0) === 1 ? ' ruit' : ' ruiten') +
          (p.open_taken ? ' · <b class="pl-taken">' + p.open_taken + ' open ' +
             (p.open_taken === 1 ? 'taak' : 'taken') + '</b>' : '') +
          (p.datum ? ' · ' + esc2(p.datum) : '') +
          (sortering === 'aangemaakt' && p.created_at ? ' · aangemaakt ' + datumKort(p.created_at) : '') +
          ' · gewijzigd ' + datumKort(p.updated_at) +
          (p.gewijzigd_naam ? ' door ' + esc2(p.gewijzigd_naam) : '') +
          '</span></div></div>';
      }).join('');
    });
  }

  /* ─── prullenbak (v91) ───────────────────────────────────── */

  var prullenbakOpen = false;

  function dagenOver(iso) {
    var t = new Date(iso).getTime();
    if (!isFinite(t)) return '';
    var dagen = window.glasPrullenbakDagen || 30;
    var over = Math.ceil((t + dagen * 864e5 - Date.now()) / 864e5);
    if (over <= 0) return 'wordt bij de volgende start opgeruimd';
    return 'nog ' + over + (over === 1 ? ' dag' : ' dagen');
  }

  function vulPrullenbak(lijst) {
    var blok = el('startPrullenbakBlok');
    var vak = el('startPrullenbak');
    if (!blok || !vak) return;
    lijst = lijst || [];
    blok.hidden = !lijst.length;
    var teller = el('startPrullenbakTelling');
    if (teller) teller.textContent = lijst.length ? String(lijst.totaal || lijst.length) : '';
    vak.hidden = !prullenbakOpen;
    var pijl = el('startPrullenbakPijl');
    if (pijl) pijl.textContent = prullenbakOpen ? '▾' : '▸';
    vak.innerHTML = '<div class="prul-uitleg">Verwijderde projecten blijven hier ' +
      (window.glasPrullenbakDagen || 30) + ' dagen staan, met foto\'s en logboek. Daarna worden ze ' +
      'opgeruimd. Terugzetten kan iedereen.</div>' +
      lijst.map(function (p) {
        return '<div class="prul-item">' +
          '<div class="prul-info"><strong>' + esc2(p.naam || '(naamloos)') + '</strong>' +
          '<span>' + (p.adres ? esc2(p.adres) + ' · ' : '') + (p.aantal_ruiten || 0) + ' ruiten · ' +
          'verwijderd ' + datumKort(p.verwijderd_op) +
          (p.verwijderd_naam ? ' door ' + esc2(p.verwijderd_naam) : '') + ' · ' + dagenOver(p.verwijderd_op) +
          '</span></div>' +
          '<div class="prul-knoppen">' +
            '<button class="btn btn-secondary btn-sm" onclick="startTerugzetten(\'' + esc2(p.id) + '\')">Terugzetten</button>' +
            '<button class="btn btn-ghost btn-sm" onclick="startDefinitief(\'' + esc2(p.id) + '\')">Nu definitief verwijderen</button>' +
          '</div></div>';
      }).join('');
    vak.__lijst = lijst;
  }

  window.startPrullenbakKlap = function () {
    prullenbakOpen = !prullenbakOpen;
    var vak = el('startPrullenbak');
    vulPrullenbak(vak ? vak.__lijst : []);
  };

  window.startTerugzetten = function (id) {
    if (!window.glasTerugzetten) return;
    glasTerugzetten(id);          // ververst zelf de lijsten
  };

  window.startDefinitief = function (id) {
    if (!window.glasNuDefinitief) return;
    var vak = el('startPrullenbak');
    var p = ((vak && vak.__lijst) || []).find(function (x) { return x.id === id; }) || {};
    glasNuDefinitief(id, p.naam); // ververst zelf de lijsten
  };

  window.startZoeken = function (waarde) {
    clearTimeout(zoekTimer);
    zoekTimer = setTimeout(function () { vulProjecten(waarde); }, 250);
  };

  window.startZoekWissen = function () {
    var veld = el('startZoek');
    if (veld) { veld.value = ''; veld.focus(); }
    vulProjecten('');
  };

  // ↻ op het startscherm: de lijsten opnieuw ophalen én kijken of er een
  // nieuwe versie is (v101). Tot v100 deed deze knop alleen de lijsten, en
  // wie daar 'bijwerken' verwachtte, kreeg niets (gemeld door Jan).
  window.startVernieuwen = function () {
    window.glasToonStart();
    if (window.glasZoekUpdate) window.glasZoekUpdate();
  };
})();
