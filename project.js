/* ═══════════════════════════════════════════════════════════════
   Glasopname – projectgegevens
   Klant- en adresgegevens, uitvoering, notities en een eenvoudige
   takenlijst. Alles hoort bij het project en wordt met de rest
   meegenomen naar Supabase.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Het eigen adres van de werkplaats. Via config.js te overschrijven.
  var WERKPLAATS = 'Werkplaats — Vissersdijk Beneden 44, Dordrecht';

  // Klant en werkadres worden sinds v98 ingevuld bovenaan Invoer, in één
  // blok (keuze van Jan: "invoer gebeurt in principe op het glas
  // invoertabblad"). Project info laat ze alleen nog zien.
  // 'Bedrijf of naam' heet nu 'Klantnaam'; de sleutel blijft `klant`, zodat
  // bestaande projecten en de bestellijst niets merken. E-mail en soort
  // opdrachtgever zijn als invoerveld vervallen (v98); wat er al in een
  // project stond blijft in de gegevens staan en gaat niet verloren.
  var KLANT_VELDEN = [
    { id: 'klant',     label: 'Klantnaam',       breed: 2 },
    { id: 'contact',   label: 'Contactpersoon' },
    { id: 'telefoon',  label: 'Telefoon', type: 'tel' },
    { id: 'straat',    label: 'Straat en huisnummer', breed: 2 },
    { id: 'postcode',  label: 'Postcode' },
    { id: 'plaats',    label: 'Plaats' }
  ];
  var KLANT_IDS = KLANT_VELDEN.map(function (v) { return v.id; });

  var VELDEN = [
    { groep: 'Uitvoering', velden: [
      { id: 'referentie', label: 'Referentie of opdrachtnummer' },
      // 'aangemaakt' en 'bezig met inmeten/verwerken' gaan vanzelf (zie
      // statusBijwerken in cloud.js); 'besteld' zet de bestelmail. Met de
      // hand kiezen blijft mogelijk — wie het deed staat in het logboek.
      { id: 'status',     label: 'Status', keuze:
        ['aangemaakt', 'bezig met inmeten/verwerken', 'besteld',
         'geleverd', 'gemonteerd', 'afgerond'] },
      // Staat vast zodra de eerste ruit is ingevuld; wijzigen alleen met
      // je eigen wachtwoord (v93, zie opnemerWijzig hieronder).
      { id: 'opnemer',    label: 'Opgenomen door', vast: true },
      { id: 'bereikbaar', label: 'Bereikbaarheid / sleutel', breed: 2 }
    ]}
  ];

  // projectInfo en projectTaken zijn globale variabelen uit index.html.
  // Ze staan niet op window (let-declaraties doen dat niet), dus de
  // controle moet rechtstreeks op de naam gebeuren.
  function info() {
    if (!projectInfo || typeof projectInfo !== 'object') projectInfo = {};
    return projectInfo;
  }

  /* ─── adres zoeken ─────────────────────────────────────────── */
  // Zoekt bij de landelijke adressenkaart van PDOK: gratis, zonder sleutel,
  // en het werkt met postcode plus huisnummer én met een straatnaam. Je
  // krijgt een lijstje waaruit je het juiste adres aanklikt; straat,
  // postcode en plaats worden dan alle drie ingevuld.
  var PDOK = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/';
  var zoekTimer = null;
  var zoekMenu = null;

  window.adresZoek = function (waarde) {
    clearTimeout(zoekTimer);
    if (!waarde || waarde.trim().length < 4) { sluitAdresMenu(); return; }
    zoekTimer = setTimeout(function () { vraagAdressen(waarde.trim()); }, 350);
  };

  function vraagAdressen(term) {
    var veld = document.getElementById('adresZoek');
    toonAdresMenu(veld, '<div class="adres-bezig">Zoeken…</div>');
    fetch(PDOK + 'suggest?q=' + encodeURIComponent(term) + '&fq=type:adres&rows=8')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var lijst = (d && d.response && d.response.docs) || [];
        if (!lijst.length) {
          toonAdresMenu(veld, '<div class="adres-bezig">Geen adres gevonden. ' +
            'Je kunt de velden hieronder ook met de hand invullen.</div>');
          return;
        }
        toonAdresMenu(veld, lijst.map(function (a) {
          return '<button onclick="adresKies(\'' + esc(a.id) + '\')">' +
                 esc(a.weergavenaam) + '</button>';
        }).join(''));
      })
      .catch(function (e) {
        console.warn('[adres] zoeken mislukt', e);
        toonAdresMenu(veld, '<div class="adres-bezig">Zoeken lukt nu niet — ' +
          'geen verbinding? Vul de velden hieronder met de hand in.</div>');
      });
  }

  window.adresKies = function (id) {
    sluitAdresMenu();
    if (opSlot()) return;
    fetch(PDOK + 'lookup?id=' + encodeURIComponent(id) + '&fl=straatnaam,huis_nlt,postcode,woonplaatsnaam')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var a = d && d.response && d.response.docs && d.response.docs[0];
        if (!a) return;
        var d2 = info();
        d2.straat = (a.straatnaam || '') + (a.huis_nlt ? ' ' + a.huis_nlt : '');
        d2.postcode = a.postcode ? String(a.postcode).replace(/^(\d{4})([A-Z]{2})$/, '$1 $2') : '';
        d2.plaats = a.woonplaatsnaam || '';
        opslaan();
        renderProject();
        var zoek = document.getElementById('adresZoek');
        if (zoek) zoek.value = '';
      })
      .catch(function (e) { console.warn('[adres] ophalen mislukt', e); });
  };

  function toonAdresMenu(veld, inhoud) {
    sluitAdresMenu();
    if (!veld) return;
    var menu = document.createElement('div');
    menu.className = 'veld-menu adres-menu';
    menu.innerHTML = inhoud;
    document.body.appendChild(menu);
    zoekMenu = menu;
    var r = veld.getBoundingClientRect();
    menu.style.left = (r.left + window.scrollX) + 'px';
    menu.style.top = (r.bottom + window.scrollY + 4) + 'px';
    menu.style.minWidth = Math.max(260, r.width) + 'px';
    setTimeout(function () { document.addEventListener('pointerdown', adresBuiten, true); }, 0);
  }

  function adresBuiten(e) {
    if (zoekMenu && (zoekMenu.contains(e.target) || e.target.id === 'adresZoek')) return;
    sluitAdresMenu();
  }

  function sluitAdresMenu() {
    if (zoekMenu) { zoekMenu.remove(); zoekMenu = null; }
    document.removeEventListener('pointerdown', adresBuiten, true);
  }

  /* ─── tekenen ──────────────────────────────────────────────── */

  // Eén veld als invoer. Gedeeld door het klantblok op Invoer en de
  // uitvoering op Project info.
  function veldHTML(v, d) {
    var waarde = d[v.id] || '';
    if (v.vast) {
      return '<div class="pi-veld pi-vast' + (v.breed ? ' breed' : '') + '">' +
        '<span>' + esc(v.label) + '</span><div class="pi-vast-rij">' +
        '<input type="text" id="pi-' + v.id + '" value="' + esc(waarde) + '" readonly ' +
        'placeholder="Volgt bij de eerste ingevulde ruit" ' +
        'title="Vastgezet. Wijzigen kan met de knop ernaast, met je eigen wachtwoord.">' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="opnemerWijzig()">Wijzigen…</button>' +
        '</div></div>';
    }
    var invoer = v.keuze
      ? '<select id="pi-' + v.id + '" onchange="projectVeld(\'' + v.id + '\', this.value)">' +
        v.keuze.map(function (k) {
          return '<option value="' + esc(k) + '"' + (k === waarde ? ' selected' : '') + '>' +
                 esc(k || '—') + '</option>';
        }).join('') + '</select>'
      : '<input type="' + (v.type || 'text') + '" id="pi-' + v.id + '" value="' + esc(waarde) + '" ' +
        'oninput="projectVeld(\'' + v.id + '\', this.value)">';
    return '<label class="pi-veld' + (v.breed ? ' breed' : '') + '">' +
           '<span>' + esc(v.label) + '</span>' + invoer + '</label>';
  }

  // Een stuk scherm opnieuw vullen zonder dat wie daar aan het typen is zijn
  // cursor kwijtraakt (v98). Het klantblok staat nu op Invoer, en een
  // wijziging van een collega (cloud.js) tekent het opnieuw; zonder dit
  // sprong de cursor midden in een woord uit het veld.
  function vulBehoudFocus(houder, html) {
    if (houder.__html === html) return;
    var actief = document.activeElement;
    var binnen = actief && actief.id && houder.contains(actief) ? actief : null;
    var id = binnen ? binnen.id : null;
    var waarde = binnen ? binnen.value : null;
    var van = null, tot = null;
    try { if (binnen) { van = binnen.selectionStart; tot = binnen.selectionEnd; } } catch (e) { /* select */ }
    houder.innerHTML = html;
    houder.__html = html;
    if (!id) return;
    var nieuw = document.getElementById(id);
    if (!nieuw) return;
    if (nieuw.value !== waarde && nieuw.tagName === 'INPUT') nieuw.value = waarde;
    try {
      nieuw.focus();
      if (van != null) nieuw.setSelectionRange(van, tot);
    } catch (e) { /* niet elk veld kent een selectie */ }
  }

  /* ─── klantblok bovenaan Invoer (v98) ─────────────────────────
     Inklapbaar; dicht zodra klantnaam én een adres er staan (keuze van
     Jan). Dicht toont het één regel met de klantnaam en het adres; een tik
     klapt het open. De stand wordt bepaald bij het openen van een project
     en elke keer dat je naar Invoer gaat — niet tijdens het typen, want
     dan schoof de tabel eronder weg terwijl je erop tikte. */
  var klantDicht = false;
  var klantStandVoor;          // voor welk project de stand bepaald is

  function klantIngevuld(d) {
    return !!(String(d.klant || '').trim() &&
              (String(d.straat || '').trim() || String(d.plaats || '').trim()));
  }

  function adresRegel(d) {
    return [d.straat, [d.postcode, d.plaats].filter(Boolean).join(' ')]
      .map(function (x) { return String(x || '').trim(); }).filter(Boolean).join(', ');
  }

  function klantRegel(d) {
    var delen = [String(d.klant || '').trim(), adresRegel(d)].filter(Boolean);
    return delen.length ? delen.join(' · ') : 'Nog niet ingevuld';
  }

  function zetKlantBlok() {
    var inhoud = document.getElementById('inhoud-klant');
    var pijl = document.getElementById('pijl-klant');
    var kaart = document.getElementById('blok-klant');
    if (inhoud) inhoud.style.display = klantDicht ? 'none' : '';
    if (pijl) pijl.textContent = klantDicht ? '▸' : '▾';
    if (kaart) kaart.classList.toggle('dicht', klantDicht);
  }

  window.klantKlap = function () {
    klantDicht = !klantDicht;
    zetKlantBlok();
  };
  window.klantBlokOpen = function () {
    klantDicht = false;
    zetKlantBlok();
  };
  // Aangeroepen door toon('invoer') in index.html.
  window.klantBlokBijTonen = function () {
    klantDicht = klantIngevuld(info());
    zetKlantBlok();
  };

  function renderKlantBlok(d) {
    var pid = window.glasProjectId || null;
    var houder = document.getElementById('klantVelden');
    if (houder) {
      vulBehoudFocus(houder,
        '<div class="adres-zoek">' +
          '<input type="text" id="adresZoek" placeholder="Zoek op postcode + huisnummer, of op straat…" ' +
            'autocomplete="off" oninput="adresZoek(this.value)">' +
        '</div>' +
        '<div class="pi-raster">' + KLANT_VELDEN.map(function (v) { return veldHTML(v, d); }).join('') +
        '</div>' +
        '<div class="klant-voet">' +
          '<button type="button" class="btn btn-ghost btn-sm vrij-bij-slot" id="klantKaart" hidden>' +
          '📍 Adres in kaarten</button>' +
        '</div>');
    }
    if (klantStandVoor !== pid) {
      klantStandVoor = pid;
      klantDicht = klantIngevuld(d);
    }
    zetKlantRegel(d);
    zetKlantBlok();
  }

  function zetKlantRegel(d) {
    var regel = document.getElementById('klantRegel');
    if (!regel) return;
    regel.textContent = klantRegel(d);
    regel.classList.toggle('leeg', !klantIngevuld(d));
  }

  /* ─── alleen-lezen op Project info (v98) ───────────────────── */

  function leesRij(label, waarde, extra) {
    var w = String(waarde == null ? '' : waarde).trim();
    return '<div class="pi-lees-rij' + (extra ? ' ' + extra : '') + '"><dt>' + esc(label) + '</dt>' +
      '<dd' + (w ? '' : ' class="leeg"') + '>' + (w ? esc(w) : '—') + '</dd></div>';
  }

  function naarKnop(welk) {
    var dicht = window.invoerOpSlot && invoerOpSlot();
    return '<button type="button" class="btn btn-secondary btn-sm pi-naar" onclick="naarInvoerBlok(\'' +
      welk + '\')">' + (dicht ? '🔒 Bekijken op Invoer' : '✏️ Invullen op Invoer') + '</button>';
  }

  function renderKlantOverzicht(d) {
    var houder = document.getElementById('projectKlant');
    if (!houder) return;
    var rijen = leesRij('Klantnaam', d.klant) +
      leesRij('Contactpersoon', d.contact) +
      leesRij('Telefoon', d.telefoon) +
      leesRij('Werkadres', adresRegel(d));
    // Deze twee velden zijn in v98 vervallen. Staat er in een ouder project
    // nog iets in, dan blijft dat hier te zien, zodat het niet stil verdwijnt.
    if (String(d.email || '').trim()) rijen += leesRij('E-mail (oud veld)', d.email, 'oud');
    if (String(d.soortKlant || '').trim()) rijen += leesRij('Soort opdrachtgever (oud veld)', d.soortKlant, 'oud');
    houder.innerHTML = '<section class="pi-groep">' +
      '<div class="taken-kop"><h3>Klant en werkadres</h3>' + naarKnop('klant') + '</div>' +
      '<dl class="pi-lees">' + rijen + '</dl></section>';
  }

  function renderLeverOverzicht(d) {
    var houder = document.getElementById('projectLever');
    if (!houder) return;
    var foto = window.leverFoto ? window.leverFoto() : null;
    var fotoTekst = foto && foto.pad
      ? 'Toegevoegd' + ((foto.inkt && foto.inkt.length) ? ', met tekening' : '')
      : (d.leverAdres === 'werk' ? 'Nog geen foto' : 'Geen (niet nodig bij de werkplaats)');
    houder.innerHTML =
      '<div class="taken-kop"><h3>Levering</h3>' + naarKnop('lever') + '</div>' +
      '<dl class="pi-lees">' +
        leesRij('Afleveren op', leverAdresTekst()) +
        leesRij('Gewenste levering', leverDatumTekst()) +
        leesRij('Foto leverlocatie', fotoTekst) +
        leesRij('Instructie chauffeur', d.leverInstructie, 'tekst') +
      '</dl>';
  }

  // Van Project info naar het blok op Invoer waar het ingevuld wordt.
  // Ook gebruikt door de exportcontrole in pdf.js ('Aanvullen').
  window.naarInvoerBlok = function (welk) {
    if (window.gaNaarTab) gaNaarTab('invoer');
    if (welk === 'klant') window.klantBlokOpen();
    // Even wachten tot het tabblad staat; anders is het blok nog verborgen
    // en doet scrollIntoView niets.
    setTimeout(function () {
      var doel = document.getElementById(welk === 'klant' ? 'blok-klant' : 'blok-lever');
      if (doel && doel.scrollIntoView) doel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  /* ─── tekenen ──────────────────────────────────────────────── */

  window.renderProject = function () {
    var d = info();

    renderKlantBlok(d);
    renderKlantOverzicht(d);

    var houder = document.getElementById('projectVelden');
    if (houder) {
      houder.innerHTML = VELDEN.map(function (g) {
        return '<section class="pi-groep"><h3>' + g.groep + '</h3><div class="pi-raster">' +
          g.velden.map(function (v) { return veldHTML(v, d); }).join('') + '</div></section>';
      }).join('');
    }

    var notitie = document.getElementById('projectNotitie');
    if (notitie && notitie.value !== (d.notities || '')) notitie.value = d.notities || '';
    var instr = document.getElementById('leverInstructie');
    if (instr && instr.value !== (d.leverInstructie || '')) instr.value = d.leverInstructie || '';
    renderLevering();
    if (window.renderLeverFoto) renderLeverFoto();
    renderLeverOverzicht(d);
    // Taken en logboek horen bij één project. Tot v94 werden ze alleen
    // opnieuw opgehaald bij het openen van een bestaand project, niet bij
    // een nieuw project: dan bleven taken en logboek van het vorige project
    // staan (gemeld door Jan). Nu hier, aan de bron: renderProject() draait
    // bij elke projectwissel, langs welke weg ook (v95).
    var pid = window.glasProjectId || null;
    if (takenVoor !== pid) { taakLijst = null; taakFoutmelding = ''; takenLaden(); }
    else renderTaken();
    if (logboekVoor !== pid) logboekLaden();
    toonKaartknop();
  };

  // Klant, adres en levering staan sinds v98 op Invoer en gaan mee op slot
  // na bestellen (keuze van Jan). Net als bij de maten zit het echte slot
  // op de gegevens: elke functie die ze wijzigt vraagt het eerst na. Het
  // scherm terugzetten gebeurt met renderProject().
  function opSlot() {
    if (!window.slotWeigert || !slotWeigert()) return false;
    if (window.renderProject) renderProject();
    return true;
  }

  window.projectVeld = function (id, waarde) {
    if (KLANT_IDS.indexOf(id) >= 0 && opSlot()) return;
    var oud = info()[id];
    if (id === 'status' && waarde !== oud) {
      var rang = window.statusRang || function () { return 0; };
      // Terug naar vóór 'besteld' gaat alleen na ontgrendelen, met je eigen
      // wachtwoord (v91, keuze van Jan). Tot v90 kon je zo om het slot heen:
      // status op 'geleverd' of 'aangemaakt', maten wijzigen, terug.
      if (rang(oud) >= 2 && rang(waarde) < 2 && window.invoerOpSlot && invoerOpSlot()) {
        if (window.appFout) {
          appFout('Dit project is besteld. De status terugzetten naar "' + waarde + '" kan pas ' +
                  'na ‹Ontgrendelen› in de balk bovenaan Invoer — dat komt met je naam in het logboek.',
                  { kop: 'Op slot' });
        }
        if (window.renderProject) renderProject();   // keuzelijst terug op de oude waarde
        return;
      }
      info()[id] = waarde;
      // Met de hand een status kiezen mag, maar het hoort wel in het
      // logboek te staan — vooral de stap naar of van 'besteld' (v88).
      if (window.glasSpoorNotitie) glasSpoorNotitie('status met de hand op "' + waarde + '"');
      if (window.glasMarkeerWerk) glasMarkeerWerk();
      // Het slot (en de ontgrendeling) hoort bij 'besteld en later'; tussen
      // die statussen blijft het zoals het was (v91).
      if (rang(waarde) < 2) info().slot = null;
      // Een bewuste stap terug: cloud.js mag die dan ook versturen, in
      // plaats van de status van de server over te nemen (v91).
      if (rang(waarde) < rang(oud) && window.glasStatusHandmatig) glasStatusHandmatig();
      if (window.renderTabel) renderTabel();
    } else if (id === 'opnemer') {
      // Niet via een gewoon veld (v93). Tot v92 kon iedereen hier een andere
      // naam overheen typen. Wijzigen gaat alleen via opnemerWijzig().
      if (window.renderProject) renderProject();
      return;
    } else {
      info()[id] = waarde;
    }
    opslaan();
    if (id === 'straat' || id === 'postcode' || id === 'plaats') toonKaartknop();
    if (KLANT_IDS.indexOf(id) >= 0) zetKlantRegel(info());
  };

  // 'Opgenomen door' wijzigen (v93, keuze van Jan). Het veld vult zich
  // vanzelf met wie de eerste ruit invult (cloud.js, vulOpnemer) en staat
  // daarna vast. Een andere naam kan alleen met je eigen wachtwoord —
  // hetzelfde als bij het inloggen en bij ‹Ontgrendelen› — en wie dat deed
  // komt met de oude en de nieuwe naam in het logboek.
  // Net als het slot is dit een slot in de app, niet in de database.
  var opnemerBezig = false;
  window.opnemerWijzig = async function () {
    if (opnemerBezig) return;
    opnemerBezig = true;
    try {
      if (!window.glasWachtwoordKlopt || !window.glasGebruiker || !glasGebruiker().id) {
        await appFout('"Opgenomen door" wijzigen kan alleen als je ingelogd bent in de cloud.',
                      { kop: 'Opgenomen door' });
        return;
      }
      var wie = glasGebruiker() || {};
      var oud = String(info().opnemer || '').trim();
      var pw = await appWachtwoord(
        (oud ? 'Dit project is opgenomen door ' + oud + '. '
             : 'Er staat nog niemand bij "Opgenomen door". ') +
        'Typ je eigen wachtwoord om dit te wijzigen.\n' +
        'Je naam (' + (wie.naam || '') + ') en het tijdstip komen in het logboek te staan.',
        { kop: 'Opgenomen door wijzigen', ja: 'Verder' });
      if (pw === null) return;
      if (!await glasWachtwoordKlopt(pw)) {
        await appFout('Dat wachtwoord klopt niet. "Opgenomen door" blijft ' +
                      (oud ? oud : 'leeg') + '.', { kop: 'Opgenomen door' });
        return;
      }
      var nieuw = await appInvoer('Wie heeft dit project opgenomen?',
        { kop: 'Opgenomen door', waarde: oud || wie.naam || '', ja: 'Opslaan' });
      if (nieuw === null) return;
      nieuw = String(nieuw).trim();
      if (!nieuw) {
        await appFout('Laat het veld niet leeg; vul de naam in van wie de opname deed.',
                      { kop: 'Opgenomen door' });
        return;
      }
      if (nieuw === oud) return;
      info().opnemer = nieuw;
      if (window.glasSpoorNotitie) {
        glasSpoorNotitie('"opgenomen door" gewijzigd van ' + (oud || '(leeg)') + ' naar ' + nieuw +
                         ' door ' + (wie.naam || 'onbekend'));
      }
      if (window.glasMarkeerWerk) glasMarkeerWerk();
      opslaan();
      renderProject();
    } finally {
      opnemerBezig = false;
    }
  };

  window.projectNotitie = function (waarde) {
    info().notities = waarde;
    opslaan();
  };

  // Adres opzoeken in kaarten — scheelt overtypen op de telefoon.
  function toonKaartknop() {
    var d = info();
    var adres = [d.straat, d.postcode, d.plaats].filter(Boolean).join(', ');
    // Op Project info én in het klantblok op Invoer (v98). Die op Invoer
    // blijft bruikbaar als het project op slot staat: hij wijzigt niets.
    ['pi-kaart', 'klantKaart'].forEach(function (id) {
      var knop = document.getElementById(id);
      if (!knop) return;
      if (id === 'pi-kaart') knop.style.display = adres ? '' : 'none';
      else {
        knop.hidden = !adres;
        // Geen lege strook onder de velden als er nog geen adres is.
        if (knop.parentNode) knop.parentNode.style.display = adres ? '' : 'none';
      }
      knop.onclick = function () {
        window.open('https://maps.apple.com/?q=' + encodeURIComponent(adres), '_blank');
      };
    });
  }

  /* ─── levering ─────────────────────────────────────────────── */

  window.leverAdresWijzig = function (waarde) {
    if (opSlot()) return;
    info().leverAdres = waarde;
    opslaan();
    renderLevering();
  };

  window.leverDatumSoort = function (waarde) {
    if (opSlot()) return;
    var d = info();
    d.leverSoort = waarde;
    if (waarde !== 'datum') d.leverDatum = '';
    if (waarde !== 'week') { d.leverWeek = null; d.leverWeekTekst = ''; }
    opslaan();
    renderLevering();
  };

  // Acht weken vooruit, met de weken onder elkaar. Voorbije dagen zijn
  // niet te kiezen; vandaag staat omlijnd.
  // ISO-weeknummer: donderdag van die week bepaalt het jaar en de telling.
  function weekNummer(d) {
    var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    var eerste = new Date(t.getFullYear(), 0, 4);
    return 1 + Math.round(((t - eerste) / 86400000 - 3 + ((eerste.getDay() + 6) % 7)) / 7);
  }

  // Hoeveel weken de kalender standaard laat zien, en hoeveel na het
  // uitklappen. Acht weken is genoeg voor de meeste leveringen; een
  // renovatie die in het najaar begint moet verder vooruit kunnen kiezen.
  var KALENDER_WEKEN = 8;
  var KALENDER_JAAR = 53;
  var kalenderKnop = null;

  // Het uitklappen bouwt dezelfde kalender opnieuw, nu met een heel jaar.
  window.leverKalenderJaar = function () {
    var knop = kalenderKnop;
    if (!knop) return;
    sluitKalender();
    leverKalender(knop, true, KALENDER_JAAR);
  };

  window.leverKalender = function (knop, perWeek, weken) {
    if (window.invoerOpSlot && invoerOpSlot()) { opSlot(); return; }
    if (document.querySelector('.kalender')) { sluitKalender(); return; }
    kalenderKnop = knop;
    var aantal = weken || KALENDER_WEKEN;
    var heelJaar = aantal > KALENDER_WEKEN;
    var vandaag = new Date(); vandaag.setHours(0, 0, 0, 0);
    var start = new Date(vandaag);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));   // maandag van deze week

    var dagen = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
    var html = '<div class="kalender-uitleg">' +
      (perWeek ? 'Kies een hele week' : 'Kies een dag') + '</div>' +
      '<div class="kalender-kop"><span class="wk">wk</span>' + dagen.map(function (d) {
        return '<span>' + d + '</span>';
      }).join('') + '</div>';

    var maanden = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    var loop = new Date(start);
    var vorigeMaand = -1;
    html += '<div class="kalender-lijst' + (heelJaar ? ' jaar' : '') + '">';
    for (var w = 0; w < aantal; w++) {
      // Bij een heel jaar is een streepje per maand nodig; anders tel je
      // weeknummers af om te zien waar je zit.
      if (heelJaar && loop.getMonth() !== vorigeMaand) {
        vorigeMaand = loop.getMonth();
        html += '<div class="kalender-maand">' + maanden[vorigeMaand] + ' ' + loop.getFullYear() + '</div>';
      }
      var wk = weekNummer(loop);
      var weekEind = new Date(loop); weekEind.setDate(weekEind.getDate() + 6);
      var weekTekst = 'week ' + wk + ' (' +
        String(loop.getDate()).padStart(2, '0') + '-' + String(loop.getMonth() + 1).padStart(2, '0') + ' t/m ' +
        String(weekEind.getDate()).padStart(2, '0') + '-' + String(weekEind.getMonth() + 1).padStart(2, '0') + ')';
      var weekVoorbij = weekEind < vandaag;

      html += '<div class="kalender-week' + (perWeek ? ' kiesbaar' : '') + '"' +
        (perWeek && !weekVoorbij ? ' onclick="leverWeekZet(' + wk + ', \'' + weekTekst + '\')"' : '') + '>' +
        '<span class="kalender-wk' + (weekVoorbij ? ' voorbij' : '') + '">' + wk + '</span>';
      for (var d = 0; d < 7; d++) {
        var verleden = loop < vandaag;
        var isVandaag = loop.getTime() === vandaag.getTime();
        var tekst = String(loop.getDate()).padStart(2, '0') + '-' +
                    String(loop.getMonth() + 1).padStart(2, '0') + '-' + loop.getFullYear();
        html += '<button class="kalender-dag' + (verleden ? ' voorbij' : '') +
                (isVandaag ? ' vandaag' : '') + (d > 4 ? ' weekend' : '') + '"' +
                (verleden || perWeek ? ' disabled' : ' onclick="leverDatumZet(\'' + tekst + '\')"') + '>' +
                loop.getDate() + (loop.getDate() === 1 ? '<em>' + maanden[loop.getMonth()] + '</em>' : '') +
                '</button>';
        loop.setDate(loop.getDate() + 1);
      }
      html += '</div>';
    }
    html += '</div>';

    // Alleen bij het kiezen van een week: verder vooruit dan acht weken.
    // Bij een losse datum staat de gewone datumkiezer al open.
    if (perWeek && !heelJaar) {
      html += '<button type="button" class="kalender-meer" onclick="leverKalenderJaar()">' +
        '\u{1F4C5} Heel jaar tonen</button>';
    }

    var menu = document.createElement('div');
    menu.className = 'veld-menu kalender' + (heelJaar ? ' kalender-jaar' : '');
    menu.innerHTML = html;
    document.body.appendChild(menu);
    plaatsKalender(menu, knop);
    setTimeout(function () { document.addEventListener('pointerdown', kalenderBuiten, true); }, 0);
  };

  // De kalender binnen het scherm houden: een heel jaar is te hoog om altijd
  // onder de knop te passen, en op een telefoon past zelfs acht weken er
  // soms niet onder.
  function plaatsKalender(menu, knop) {
    var r = knop.getBoundingClientRect();
    var breed = document.documentElement.clientWidth;
    var hoog = document.documentElement.clientHeight;
    var max = window.scrollX + breed - menu.offsetWidth - 10;
    menu.style.left = Math.max(window.scrollX + 8, Math.min(r.left + window.scrollX, max)) + 'px';

    var onder = r.bottom + 4;
    var h = menu.offsetHeight;
    var top;
    if (onder + h <= hoog - 8) top = onder;                 // past eronder
    else if (r.top - 4 - h >= 8) top = r.top - 4 - h;       // dan erboven
    else top = Math.max(8, hoog - h - 8);                   // anders passend schuiven
    menu.style.top = (top + window.scrollY) + 'px';
  }

  function kalenderBuiten(e) {
    var menu = document.querySelector('.kalender');
    if (menu && (menu.contains(e.target) || (e.target.closest && e.target.closest('.lever-datumknop')))) return;
    sluitKalender();
  }

  function sluitKalender() {
    var menu = document.querySelector('.kalender');
    if (menu) menu.remove();
    document.removeEventListener('pointerdown', kalenderBuiten, true);
  }

  window.leverWeekZet = function (nummer, tekst) {
    if (opSlot()) return;
    var d = info();
    d.leverSoort = 'week';
    d.leverWeek = nummer;
    d.leverWeekTekst = tekst;
    sluitKalender();
    opslaan();
    renderLevering();
  };

  window.leverDatumZet = function (tekst) {
    if (opSlot()) return;
    var d = info();
    d.leverSoort = 'datum';
    d.leverDatum = tekst;
    sluitKalender();
    opslaan();
    renderLevering();
  };

  window.leverInstructie = function (waarde) {
    if (opSlot()) return;
    info().leverInstructie = waarde;
    opslaan();
  };

  window.leverAdresTekst = function () {
    var d = info();
    if (d.leverAdres === 'werk') {
      var delen = [d.straat, [d.postcode, d.plaats].filter(Boolean).join('  ')].filter(Boolean);
      return delen.length ? delen.join(', ') : 'Werkadres — nog niet ingevuld';
    }
    return (window.GLASOPNAME_CONFIG && GLASOPNAME_CONFIG.werkplaats) || WERKPLAATS;
  };

  window.leverDatumTekst = function () {
    var d = info();
    if (d.leverSoort === 'spoed') return 'SPOED!';
    if (d.leverSoort === 'datum' && d.leverDatum) return d.leverDatum;
    if (d.leverSoort === 'week' && d.leverWeek) return d.leverWeekTekst || ('week ' + d.leverWeek);
    return 'Eerste levermogelijkheid';
  };

  window.renderLevering = function () {
    var houder = document.getElementById('leverBlok');
    if (!houder) return;
    var d = info();
    var adres = d.leverAdres === 'werk' ? 'werk' : 'werkplaats';
    var soort = d.leverSoort || 'zsm';

    houder.innerHTML =
      '<div class="lever-rij">' +
        '<span class="lever-label">Afleveren op</span>' +
        '<div class="lever-keuze">' +
          '<button class="' + (adres === 'werkplaats' ? 'aan' : '') + '" ' +
            'onclick="leverAdresWijzig(\'werkplaats\')">Werkplaats</button>' +
          '<button class="' + (adres === 'werk' ? 'aan' : '') + '" ' +
            'onclick="leverAdresWijzig(\'werk\')">Werkadres</button>' +
        '</div>' +
        '<span class="lever-adres">' + esc(leverAdresTekst()) + '</span>' +
      '</div>' +
      '<div class="lever-rij">' +
        '<span class="lever-label">Gewenste levering</span>' +
        '<div class="lever-keuze">' +
          '<button class="' + (soort === 'spoed' ? 'aan spoed' : '') + '" ' +
            'onclick="leverDatumSoort(\'spoed\')">SPOED!</button>' +
          '<button class="' + (soort === 'zsm' ? 'aan' : '') + '" ' +
            'onclick="leverDatumSoort(\'zsm\')">Eerste levermogelijkheid</button>' +
          '<button class="lever-datumknop ' + (soort === 'week' ? 'aan' : '') + '" ' +
            'onclick="leverKalender(this, true)">' +
            (soort === 'week' && d.leverWeek ? esc('Week ' + d.leverWeek) : 'Leverweek…') + '</button>' +
          '<button class="lever-datumknop ' + (soort === 'datum' ? 'aan' : '') + '" ' +
            'onclick="leverKalender(this)">' +
            (soort === 'datum' && d.leverDatum ? esc(d.leverDatum) : 'Datum kiezen…') + '</button>' +
        '</div>' +
      '</div>';
  };

  /* ─── takenlijst ───────────────────────────────────────────── */
  // Taken staan sinds v87 in hun eigen tabel, met een eigenaar erbij.
  // Daardoor kan het startscherm laten zien wat er voor jou openstaat
  // zonder elk project in te laden. Ze hebben wel verbinding nodig; dat
  // zeggen we er eerlijk bij als die er niet is.

  var taakLijst = null;       // uit de tabel; null = nog niet opgehaald
  // Voor welk project de taken en het logboek op het scherm staan (v95).
  // undefined = nog nooit opgehaald.
  var takenVoor;
  var logboekVoor;
  var taakFoutmelding = '';

  // Alleen als de tabel er is; anders valt alles terug op de oude lijst in
  // het project zelf, zodat de app blijft werken als het SQL-script nog
  // niet gedraaid is (v87).
  function cloudTaken() {
    return !!(window.glasTakenVan && window.glasProjectId &&
              (!window.glasTakenTabel || glasTakenTabel()));
  }

  function mijnNaam() {
    return (window.glasGebruiker ? glasGebruiker().naam : '') || '';
  }

  // De collega's uit wie je kunt kiezen. Komt uit de tabel `gebruikers`
  // (v88); is die er nog niet, dan blijft het bij "+ mij" zoals in v87.
  var collegas = [];

  function collegasLaden() {
    if (!window.glasGebruikers) return Promise.resolve([]);
    return glasGebruikers().then(function (lijst) {
      collegas = lijst || [];
      return collegas;
    });
  }

  function collegaVan(id) {
    return collegas.find(function (g) { return g.id === id; }) || null;
  }

  function eigenaarKeuzeHTML(huidigId, huidigeNaam, sleutel) {
    if (!collegas.length) return '';
    var ik = (window.glasGebruiker ? glasGebruiker().id : null);
    var opties = ['<option value="">— niemand —</option>'].concat(collegas.map(function (g) {
      var gekozen = g.id === huidigId ||
        (!huidigId && huidigeNaam && g.naam === huidigeNaam);
      return '<option value="' + esc(g.id) + '"' + (gekozen ? ' selected' : '') + '>' +
        esc(g.naam || g.email) + (g.id === ik ? ' (ik)' : '') + '</option>';
    }));
    return '<select class="taak-eigenaar-keuze" title="Op wiens naam staat deze taak?" ' +
      'onchange="taakEigenaar(' + sleutel + ', this.value)">' + opties.join('') + '</select>';
  }

  window.takenLaden = function () {
    var pid = window.glasProjectId || null;
    takenVoor = pid;
    collegasLaden().then(function () { if (taakLijst !== undefined) renderTaken(); });
    if (!cloudTaken()) { taakLijst = null; renderTaken(); return; }
    taakFoutmelding = '';
    // Intussen niet de taken van het vorige project laten staan (v95).
    renderTaken();
    glasTakenVan(pid).then(function (lijst) {
      // Een antwoord dat binnenkomt nadat er een ander project geopend is,
      // hoort niet meer op het scherm (v95).
      if ((window.glasProjectId || null) !== pid) return;
      // null betekent: de tabel is er niet (of het ophalen lukte niet);
      // dan de taken uit het project zelf tonen.
      if (lijst === null) { taakLijst = null; renderTaken(); return; }
      taakLijst = lijst;
      renderTaken();
    }, function () {
      if ((window.glasProjectId || null) !== pid) return;
      taakLijst = [];
      taakFoutmelding = 'De taken konden niet opgehaald worden.';
      renderTaken();
    });
  };

  function taken() {
    if (!Array.isArray(projectTaken)) projectTaken = [];
    return projectTaken;
  }

  function lijstNu() { return cloudTaken() && taakLijst ? taakLijst : taken(); }

  window.renderTaken = function () {
    var houder = document.getElementById('takenLijst');
    if (!houder) return;
    var lijst = lijstNu();
    var open = lijst.filter(function (t) { return !t.klaar; }).length;

    var teller = document.getElementById('takenTeller');
    if (teller) {
      teller.textContent = lijst.length
        ? open + ' open, ' + (lijst.length - open) + ' afgerond'
        : '';
    }

    vulNieuweTaakKeuze();

    if (taakFoutmelding) {
      houder.innerHTML = '<div class="taken-leeg">' + esc(taakFoutmelding) +
        ' <button class="btn btn-secondary btn-sm" onclick="takenLaden()">Opnieuw proberen</button></div>';
      return;
    }

    if (!lijst.length) {
      houder.innerHTML = '<div class="taken-leeg">Nog geen taken. Denk aan: rooster nameten, ' +
        'sleutel ophalen, kozijn opmeten na sloop.</div>';
      return;
    }

    var ik = mijnNaam();
    houder.innerHTML = lijst.map(function (t, i) {
      var sleutel = t.id != null ? "'" + String(t.id).replace(/'/g, '') + "'" : i;
      var eigenaar = t.eigenaar_naam || '';
      var keuze = cloudTaken() ? eigenaarKeuzeHTML(t.eigenaar, eigenaar, sleutel) : '';
      return '<div class="taak' + (t.klaar ? ' klaar' : '') + '">' +
        '<input type="checkbox"' + (t.klaar ? ' checked' : '') +
          ' onchange="taakKlaar(' + sleutel + ', this.checked)">' +
        '<input type="text" class="taak-tekst" value="' + esc(t.tekst) + '" ' +
          'onchange="taakTekst(' + sleutel + ', this.value)" placeholder="omschrijving…">' +
        (keuze ||
          (eigenaar
            ? '<span class="taak-eigenaar' + (eigenaar === ik ? ' ik' : '') + '" title="Eigenaar">' +
              esc(eigenaar) + '</span>'
            : (cloudTaken() ? '<button class="taak-eigenaar leeg" title="Deze taak op mijn naam zetten" ' +
                'onclick="taakVoorMij(' + sleutel + ')">+ mij</button>' : ''))) +
        '<button class="taak-weg" onclick="taakWeg(' + sleutel + ')" title="Taak verwijderen">✕</button>' +
      '</div>';
    }).join('');
  };

  // De keuzelijst bij het veld voor een nieuwe taak: op wiens naam komt hij.
  function vulNieuweTaakKeuze() {
    var vak = document.getElementById('taakNieuwVoor');
    if (!vak) return;
    if (!collegas.length || !cloudTaken()) { vak.innerHTML = ''; vak.hidden = true; return; }
    vak.hidden = false;
    var ik = (window.glasGebruiker ? glasGebruiker().id : null);
    var vorige = vak.value;
    vak.innerHTML = collegas.map(function (g) {
      return '<option value="' + esc(g.id) + '"' +
        ((vorige ? g.id === vorige : g.id === ik) ? ' selected' : '') + '>' +
        esc(g.naam || g.email) + (g.id === ik ? ' (ik)' : '') + '</option>';
    }).join('');
  }

  // Een taak op naam van een collega zetten, en hem dat laten weten.
  window.taakEigenaar = async function (sleutel, id) {
    var t = vindTaak(sleutel);
    if (!t) return;
    var g = collegaVan(id);
    if (!cloudTaken()) {
      t.eigenaar_naam = g ? (g.naam || '') : '';
      renderTaken();
      opslaan();
      return;
    }
    await glasTaakWijzig(t.id, { eigenaar: g ? g.id : null, eigenaar_naam: g ? (g.naam || '') : '' });
    takenLaden();
    await mailAanbieden(t, g);
  };

  async function mailAanbieden(taak, g) {
    if (!g || !g.email || !window.glasTaakMail) return;
    var ik = (window.glasGebruiker ? glasGebruiker().id : null);
    if (g.id === ik) return;                       // jezelf hoef je niet te mailen
    if (!await appVraag((g.naam || g.email) + ' een mailtje sturen over deze taak?',
        { kop: 'Taak doorgeven', ja: 'Mailen', nee: 'Niet mailen' })) return;
    var uit = await glasTaakMail(taak, g);
    if (uit && uit.ok) {
      if (window.appMelding) appMelding('Bericht verstuurd naar ' + g.email + '.', { kop: 'Taak doorgeven' });
    } else if (window.appFout) {
      appFout('Het mailtje is niet verstuurd: ' + ((uit && uit.fout) || 'onbekende fout') +
              '. De taak staat er wél: ' + (g.naam || g.email) + ' ziet hem op het startscherm.',
              { kop: 'Taak doorgeven' });
    }
  }

  function vindTaak(sleutel) {
    var lijst = lijstNu();
    if (typeof sleutel === 'number') return lijst[sleutel];
    return lijst.find(function (t) { return String(t.id) === String(sleutel); });
  }

  window.taakToevoegen = function () {
    var veld = document.getElementById('taakNieuw');
    var tekst = veld ? veld.value.trim() : '';
    if (!tekst) { if (veld) veld.focus(); return; }
    if (veld) { veld.value = ''; veld.focus(); }

    if (!cloudTaken()) {
      if (window.bewaarStap) bewaarStap('Taak toegevoegd');
      taken().push({ tekst: tekst, klaar: false });
      renderTaken();
      opslaan();
      return;
    }
    // Op wiens naam? Standaard op de jouwe; kies je een collega, dan
    // krijgt die er een mailtje over aangeboden (v88).
    var kiesVak = document.getElementById('taakNieuwVoor');
    var voor = collegaVan(kiesVak && kiesVak.value) ||
               { id: (window.glasGebruiker ? glasGebruiker().id : null), naam: mijnNaam() };

    // Meteen tonen; de tabel volgt. Zo voelt het niet traag.
    taakLijst = (taakLijst || []).concat([{ id: 'nieuw-' + Date.now(), tekst: tekst, klaar: false,
                                            eigenaar: voor.id, eigenaar_naam: voor.naam || mijnNaam() }]);
    renderTaken();
    glasTaakNieuw(tekst, null, voor).then(function (nieuw) {
      // Niet gelukt (geen bereik, fout): de tekst terug in het veld, zodat
      // hij niet stil verdwijnt (v103). Alleen als je er intussen niets
      // nieuws hebt getypt.
      if (!nieuw && veld && !veld.value.trim()) veld.value = tekst;
      takenLaden();
      if (nieuw) mailAanbieden(nieuw, collegaVan(voor.id));
    });
  };

  window.taakKlaar = function (sleutel, aan) {
    var t = vindTaak(sleutel);
    if (!t) return;
    t.klaar = !!aan;
    renderTaken();
    if (!cloudTaken()) { opslaan(); return; }
    glasTaakWijzig(t.id, { klaar: !!aan }).then(function () { takenLaden(); });
  };

  window.taakTekst = function (sleutel, tekst) {
    var t = vindTaak(sleutel);
    if (!t) return;
    t.tekst = tekst;
    if (!cloudTaken()) { opslaan(); return; }
    // Mislukt het, dan de lijst opnieuw: die toont dan wat er echt staat,
    // in plaats van een tekst die alleen op dit scherm bestaat (v103).
    glasTaakWijzig(t.id, { tekst: tekst }).then(function (r) { if (!r) takenLaden(); });
  };

  window.taakVoorMij = function (sleutel) {
    var t = vindTaak(sleutel);
    if (!t || !cloudTaken()) return;
    var ik = window.glasGebruiker ? glasGebruiker() : { id: null, naam: '' };
    glasTaakWijzig(t.id, { eigenaar: ik.id, eigenaar_naam: ik.naam })
      .then(function () { takenLaden(); });
  };

  window.taakWeg = function (sleutel) {
    var t = vindTaak(sleutel);
    if (!t) return;
    if (!cloudTaken()) {
      if (window.bewaarStap) bewaarStap('Taak verwijderd');
      var i = taken().indexOf(t);
      if (i >= 0) taken().splice(i, 1);
      renderTaken();
      opslaan();
      return;
    }
    taakLijst = (taakLijst || []).filter(function (x) { return x !== t; });
    renderTaken();
    glasTaakWeg(t.id).then(function () { takenLaden(); });
  };

  window.takenOpruimen = async function () {
    var lijst = lijstNu();
    var klaarLijst = lijst.filter(function (t) { return t.klaar; });
    if (!klaarLijst.length) return;
    if (!await appVraag(klaarLijst.length + ' afgeronde ' +
        (klaarLijst.length === 1 ? 'taak' : 'taken') + ' verwijderen?',
        { kop: 'Taken opruimen', ja: 'Opruimen' })) return;

    if (!cloudTaken()) {
      if (window.bewaarStap) bewaarStap('Afgeronde taken opgeruimd');
      projectTaken = taken().filter(function (t) { return !t.klaar; });
      renderTaken();
      opslaan();
      return;
    }
    taakLijst = (taakLijst || []).filter(function (t) { return !t.klaar; });
    renderTaken();
    Promise.all(klaarLijst.map(function (t) { return glasTaakWeg(t.id); }))
      .then(function () { takenLaden(); });
  };

  /* ─── logboek ─────────────────────────────────────────────────
     Wie veranderde wanneer wat. De database schrijft dit zelf bij elke
     opslag weg (zie 13_taken_en_geschiedenis.sql); hier lezen we de
     laatste twintig regels terug. Is het script nog niet gedraaid, dan
     is de lijst gewoon leeg en staat er een regel die dat uitlegt. */

  function logMoment(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var tijd = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === new Date().toDateString()) return 'vandaag ' + tijd;
    return String(d.getDate()).padStart(2, '0') + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + ' ' + tijd;
  }

  // Het laatst opgehaalde logboek, voor de pdf als ophalen niet lukt (v98).
  var logboekRegels = [];

  // Geeft een lijst, of een fout (afgewezen) als het ophalen mislukte:
  // 'mislukt' mag er niet uitzien als 'nog geen wijzigingen' (v103).
  // lijst.totaal = hoeveel regels er in het logboek staan (als bekend).
  function logboekOphalen(pid, aantal) {
    return Promise.all([
      glasGeschiedenis(pid, aantal),
      window.glasMailLog ? glasMailLog(pid) : Promise.resolve([])
    ]).then(function (uit) {
      if (uit[0] === null || uit[1] === null) throw new Error('logboek niet opgehaald');
      // Totaal = wijzigingen + mails, zoals de database ze telde.
      var totaal = typeof uit[0].totaal === 'number'
        ? uit[0].totaal + (typeof uit[1].totaal === 'number' ? uit[1].totaal : uit[1].length)
        : null;
      var l = uit[0].concat(uit[1].map(function (m) {
        return {
          mail: true,
          moment: m.moment,
          wie_naam: m.wie_naam,
          samenvatting: (m.gelukt ? '✉ ' : '✉ MISLUKT — ') +
            (m.soort === 'taak' ? 'taakbericht' : 'bestelmail') + ' naar ' + (m.aan || '') +
            (m.gelukt ? '' : ' (' + (m.fout || 'onbekende fout') + ')')
        };
      })).sort(function (a, b) { return String(b.moment).localeCompare(String(a.moment)); });
      l.totaal = totaal;
      return l;
    });
  }

  window.logboekLaden = function (alles) {
    var houder = document.getElementById('logboekLijst');
    if (!houder) return;
    var pid = window.glasProjectId || null;
    logboekVoor = pid;
    if (!window.glasProjectId || !window.glasGeschiedenis) {
      houder.innerHTML = '<div class="taken-leeg">Het logboek vult zich zodra dit project ' +
        'in de cloud staat.</div>';
      return;
    }
    houder.innerHTML = '<div class="taken-leeg">Logboek ophalen…</div>';
    logboekOphalen(pid, alles ? 200 : 30).then(function (lijst) {
      // Intussen een ander project geopend: dit antwoord niet tonen (v95).
      if ((window.glasProjectId || null) !== pid) return;
      // De verstuurde mail hoort in hetzelfde rijtje: dat is immers het
      // moment waarop de leverancier iets kreeg (v88).
      logboekRegels = lijst || [];
      if (!lijst || !lijst.length) {
        houder.innerHTML = '<div class="taken-leeg">Nog geen wijzigingen vastgelegd. ' +
          'Het logboek houdt elke wijziging bij, met wie hem deed.</div>';
        return;
      }
      // Er staan er meer dan getoond: dat zeggen, niet stil afkappen (v103).
      var meer = (typeof lijst.totaal === 'number' && lijst.totaal > lijst.length)
        ? '<div class="taken-leeg">De laatste ' + lijst.length + ' van ' + lijst.totaal +
          ' regels. <button class="btn btn-secondary btn-sm" onclick="logboekLaden(true)">' +
          'Alles tonen</button></div>'
        : '';
      houder.innerHTML = lijst.map(function (r) {
        return '<div class="log-regel">' +
          '<span class="log-moment">' + esc(logMoment(r.moment)) + '</span>' +
          '<span class="log-wie">' + esc(r.wie_naam || 'onbekend') + '</span>' +
          '<span class="log-wat">' + esc(r.samenvatting || 'wijziging') + '</span>' +
        '</div>';
      }).join('') + meer;
    }, function () {
      if ((window.glasProjectId || null) !== pid) return;
      houder.innerHTML = '<div class="taken-leeg">Het logboek kon niet opgehaald worden (geen bereik?). ' +
        'Er is niets mee gebeurd. <button class="btn btn-secondary btn-sm" onclick="logboekLaden()">' +
        'Opnieuw proberen</button></div>';
    });
  };

  /* ─── voor de pdf (v98) ─────────────────────────────────────
     De pdf van de invoer krijgt een pagina met de projectgegevens, ook de
     taken en het logboek. Die komen uit de cloud; vers ophalen, maar nooit
     langer dan een paar seconden wachten: zonder bereik moet de pdf er
     gewoon komen, dan met wat er al op het scherm stond. */
  function binnen(belofte, ms, terug) {
    return Promise.race([
      Promise.resolve(belofte).catch(function () { return terug; }),
      new Promise(function (ok) { setTimeout(function () { ok(terug); }, ms); })
    ]);
  }

  // Op papier geen 'vandaag': de pdf wordt later nog gelezen.
  function volledigMoment(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return '';
    function twee(n) { return String(n).padStart(2, '0'); }
    return twee(d.getDate()) + '-' + twee(d.getMonth() + 1) + '-' + d.getFullYear() + ' ' +
           twee(d.getHours()) + ':' + twee(d.getMinutes());
  }

  window.projectOverzichtVoorPdf = function () {
    var pid = window.glasProjectId || null;
    var takenBelofte = cloudTaken()
      ? binnen(glasTakenVan(pid), 4000, null).then(function (l) {
          return Array.isArray(l) ? l : (taakLijst || taken());
        })
      : Promise.resolve(taken());
    var logBelofte = (pid && window.glasGeschiedenis)
      ? binnen(logboekOphalen(pid), 4000, null).then(function (l) {
          return Array.isArray(l) ? l : logboekRegels;
        })
      : Promise.resolve([]);
    return Promise.all([takenBelofte, logBelofte]).then(function (uit) {
      return {
        taken: (uit[0] || []).map(function (t) {
          return { tekst: t.tekst || '', klaar: !!t.klaar, wie: t.eigenaar_naam || '' };
        }),
        logboekTotaal: (uit[1] && typeof uit[1].totaal === 'number') ? uit[1].totaal : null,
        logboek: (uit[1] || []).slice(0, 30).map(function (r) {
          return { moment: volledigMoment(r.moment), wie: r.wie_naam || 'onbekend',
                   wat: r.samenvatting || 'wijziging' };
        }),
        leverAdres: leverAdresTekst(),
        leverWanneer: leverDatumTekst(),
        adres: adresRegel(info())
      };
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    var veld = document.getElementById('taakNieuw');
    if (veld) {
      veld.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); taakToevoegen(); }
      });
    }
    renderProject();
  });
})();
