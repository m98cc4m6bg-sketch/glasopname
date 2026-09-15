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
      { id: 'status',     label: 'Status', keuze:
        ['open', 'ingemeten', 'besteld', 'geleverd', 'gemonteerd', 'afgerond'] },
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
    info()[id] = waarde;
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

  window.leverKalender = function (knop, perWeek) {
    if (document.querySelector('.kalender')) { sluitKalender(); return; }
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
    for (var w = 0; w < 8; w++) {
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

    var menu = document.createElement('div');
    menu.className = 'veld-menu kalender';
    menu.innerHTML = html;
    document.body.appendChild(menu);
    var r = knop.getBoundingClientRect();
    var max = window.scrollX + document.documentElement.clientWidth - menu.offsetWidth - 10;
    menu.style.left = Math.max(window.scrollX + 8, Math.min(r.left + window.scrollX, max)) + 'px';
    menu.style.top = (r.bottom + window.scrollY + 4) + 'px';
    setTimeout(function () { document.addEventListener('pointerdown', kalenderBuiten, true); }, 0);
  };

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

  function taken() {
    if (!Array.isArray(projectTaken)) projectTaken = [];
    return projectTaken;
  }

  window.renderTaken = function () {
    var houder = document.getElementById('takenLijst');
    if (!houder) return;
    var lijst = taken();
    var open = lijst.filter(function (t) { return !t.klaar; }).length;

    var teller = document.getElementById('takenTeller');
    if (teller) {
      teller.textContent = lijst.length
        ? open + ' open, ' + (lijst.length - open) + ' afgerond'
        : '';
    }

    if (!lijst.length) {
      houder.innerHTML = '<div class="taken-leeg">Nog geen taken. Denk aan: rooster nameten, ' +
        'sleutel ophalen, kozijn opmeten na sloop.</div>';
      return;
    }

    houder.innerHTML = lijst.map(function (t, i) {
      return '<div class="taak' + (t.klaar ? ' klaar' : '') + '">' +
        '<input type="checkbox"' + (t.klaar ? ' checked' : '') +
          ' onchange="taakKlaar(' + i + ', this.checked)">' +
        '<input type="text" class="taak-tekst" value="' + esc(t.tekst) + '" ' +
          'oninput="taakTekst(' + i + ', this.value)" placeholder="omschrijving…">' +
        '<button class="taak-weg" onclick="taakWeg(' + i + ')" title="Taak verwijderen">✕</button>' +
      '</div>';
    }).join('');
  };

  window.taakToevoegen = function () {
    var veld = document.getElementById('taakNieuw');
    var tekst = veld ? veld.value.trim() : '';
    if (!tekst) { if (veld) veld.focus(); return; }
    if (window.bewaarStap) bewaarStap('Taak toegevoegd');
    taken().push({ tekst: tekst, klaar: false });
    if (veld) { veld.value = ''; veld.focus(); }
    renderTaken();
    opslaan();
  };

  window.taakKlaar = function (i, aan) {
    var t = taken()[i];
    if (!t) return;
    t.klaar = !!aan;
    renderTaken();
    opslaan();
  };

  window.taakTekst = function (i, tekst) {
    var t = taken()[i];
    if (!t) return;
    t.tekst = tekst;
    opslaan();
  };

  window.taakWeg = function (i) {
    if (window.bewaarStap) bewaarStap('Taak verwijderd');
    taken().splice(i, 1);
    renderTaken();
    opslaan();
  };

  window.takenOpruimen = function () {
    var lijst = taken();
    var klaar = lijst.filter(function (t) { return t.klaar; }).length;
    if (!klaar) return;
    if (!confirm(klaar + ' afgeronde ' + (klaar === 1 ? 'taak' : 'taken') + ' verwijderen?')) return;
    if (window.bewaarStap) bewaarStap('Afgeronde taken opgeruimd');
    projectTaken = lijst.filter(function (t) { return !t.klaar; });
    renderTaken();
    opslaan();
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
