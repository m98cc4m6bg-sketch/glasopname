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

  var VELDEN = [
    { groep: 'Opdrachtgever', velden: [
      { id: 'klant',        label: 'Bedrijf of naam',   breed: 2 },
      { id: 'contact',      label: 'Contactpersoon' },
      { id: 'telefoon',     label: 'Telefoon', type: 'tel' },
      { id: 'email',        label: 'E-mail', type: 'email', breed: 2 },
      { id: 'soortKlant',   label: 'Soort opdrachtgever', keuze:
        ['', 'Particulier', 'Aannemer', 'VvE', 'Woningcorporatie', 'Bedrijf', 'Anders'] }
    ]},
    { groep: 'Werkadres', velden: [
      { id: 'straat',    label: 'Straat en huisnummer', breed: 2 },
      { id: 'postcode',  label: 'Postcode' },
      { id: 'plaats',    label: 'Plaats' }

    ]},
    { groep: 'Uitvoering', velden: [
      { id: 'referentie', label: 'Referentie of opdrachtnummer' },
      // 'aangemaakt' en 'bezig met inmeten/verwerken' gaan vanzelf (zie
      // statusBijwerken in cloud.js); 'besteld' zet de bestelmail. Met de
      // hand kiezen blijft mogelijk — wie het deed staat in het logboek.
      { id: 'status',     label: 'Status', keuze:
        ['aangemaakt', 'bezig met inmeten/verwerken', 'besteld',
         'geleverd', 'gemonteerd', 'afgerond'] },
      { id: 'opnemer',    label: 'Opgenomen door' },
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

  window.renderProject = function () {
    var houder = document.getElementById('projectVelden');
    if (!houder) return;
    var d = info();

    houder.innerHTML = VELDEN.map(function (g) {
      var zoek = g.groep !== 'Werkadres' ? '' :
        '<div class="adres-zoek">' +
          '<input type="text" id="adresZoek" placeholder="Zoek op postcode + huisnummer, of op straat…" ' +
            'autocomplete="off" oninput="adresZoek(this.value)">' +
        '</div>';
      return '<section class="pi-groep"><h3>' + g.groep + '</h3>' + zoek + '<div class="pi-raster">' +
        g.velden.map(function (v) {
          var waarde = d[v.id] || '';
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
        }).join('') + '</div></section>';
    }).join('');

    var notitie = document.getElementById('projectNotitie');
    if (notitie && notitie.value !== (d.notities || '')) notitie.value = d.notities || '';
    var instr = document.getElementById('leverInstructie');
    if (instr && instr.value !== (d.leverInstructie || '')) instr.value = d.leverInstructie || '';
    renderLevering();
    if (window.renderLeverFoto) renderLeverFoto();
    renderTaken();
    toonKaartknop();
  };

  window.projectVeld = function (id, waarde) {
    var oud = info()[id];
    info()[id] = waarde;
    if (id === 'status' && waarde !== oud) {
      // Met de hand een status kiezen mag, maar het hoort wel in het
      // logboek te staan — vooral de stap naar of van 'besteld' (v88).
      if (window.glasSpoorNotitie) glasSpoorNotitie('status met de hand op "' + waarde + '"');
      if (window.glasMarkeerWerk) glasMarkeerWerk();
      if (waarde !== 'besteld') info().slot = null;
      if (window.renderTabel) renderTabel();
    }
    opslaan();
    if (id === 'straat' || id === 'postcode' || id === 'plaats') toonKaartknop();
  };

  window.projectNotitie = function (waarde) {
    info().notities = waarde;
    opslaan();
  };

  // Adres opzoeken in kaarten — scheelt overtypen op de telefoon.
  function toonKaartknop() {
    var knop = document.getElementById('pi-kaart');
    if (!knop) return;
    var d = info();
    var adres = [d.straat, d.postcode, d.plaats].filter(Boolean).join(', ');
    knop.style.display = adres ? '' : 'none';
    knop.onclick = function () {
      window.open('https://maps.apple.com/?q=' + encodeURIComponent(adres), '_blank');
    };
  }

  /* ─── levering ─────────────────────────────────────────────── */

  window.leverAdresWijzig = function (waarde) {
    info().leverAdres = waarde;
    opslaan();
    renderLevering();
  };

  window.leverDatumSoort = function (waarde) {
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
    var d = info();
    d.leverSoort = 'week';
    d.leverWeek = nummer;
    d.leverWeekTekst = tekst;
    sluitKalender();
    opslaan();
    renderLevering();
  };

  window.leverDatumZet = function (tekst) {
    var d = info();
    d.leverSoort = 'datum';
    d.leverDatum = tekst;
    sluitKalender();
    opslaan();
    renderLevering();
  };

  window.leverInstructie = function (waarde) {
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
    collegasLaden().then(function () { if (taakLijst !== undefined) renderTaken(); });
    if (!cloudTaken()) { taakLijst = null; renderTaken(); return; }
    taakFoutmelding = '';
    glasTakenVan().then(function (lijst) {
      // null betekent: de tabel is er niet (of het ophalen lukte niet);
      // dan de taken uit het project zelf tonen.
      if (lijst === null) { taakLijst = null; renderTaken(); return; }
      taakLijst = lijst;
      renderTaken();
    }, function () {
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
    glasTaakWijzig(t.id, { tekst: tekst });
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

  window.logboekLaden = function () {
    var houder = document.getElementById('logboekLijst');
    if (!houder) return;
    if (!window.glasProjectId || !window.glasGeschiedenis) {
      houder.innerHTML = '<div class="taken-leeg">Het logboek vult zich zodra dit project ' +
        'in de cloud staat.</div>';
      return;
    }
    houder.innerHTML = '<div class="taken-leeg">Logboek ophalen…</div>';
    Promise.all([
      glasGeschiedenis(window.glasProjectId),
      window.glasMailLog ? glasMailLog(window.glasProjectId) : Promise.resolve([])
    ]).then(function (uit) {
      // De verstuurde mail hoort in hetzelfde rijtje: dat is immers het
      // moment waarop de leverancier iets kreeg (v88).
      var lijst = (uit[0] || []).concat((uit[1] || []).map(function (m) {
        return {
          moment: m.moment,
          wie_naam: m.wie_naam,
          samenvatting: (m.gelukt ? '✉ ' : '✉ MISLUKT — ') +
            (m.soort === 'taak' ? 'taakbericht' : 'bestelmail') + ' naar ' + (m.aan || '') +
            (m.gelukt ? '' : ' (' + (m.fout || 'onbekende fout') + ')')
        };
      })).sort(function (a, b) { return String(b.moment).localeCompare(String(a.moment)); });

      if (!lijst || !lijst.length) {
        houder.innerHTML = '<div class="taken-leeg">Nog geen wijzigingen vastgelegd. ' +
          'Het logboek houdt elke wijziging bij, met wie hem deed.</div>';
        return;
      }
      houder.innerHTML = lijst.map(function (r) {
        return '<div class="log-regel">' +
          '<span class="log-moment">' + esc(logMoment(r.moment)) + '</span>' +
          '<span class="log-wie">' + esc(r.wie_naam || 'onbekend') + '</span>' +
          '<span class="log-wat">' + esc(r.samenvatting || 'wijziging') + '</span>' +
        '</div>';
      }).join('');
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
