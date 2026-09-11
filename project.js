/* ═══════════════════════════════════════════════════════════════
   Glasopname – projectgegevens
   Klant- en adresgegevens, uitvoering, notities en een eenvoudige
   takenlijst. Alles hoort bij het project en wordt met de rest
   meegenomen naar Supabase.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

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
      { id: 'plaats',    label: 'Plaats' },
      { id: 'bouwjaar',  label: 'Bouwjaar / type woning' }
    ]},
    { groep: 'Uitvoering', velden: [
      { id: 'referentie', label: 'Referentie of opdrachtnummer' },
      { id: 'status',     label: 'Status', keuze:
        ['open', 'ingemeten', 'besteld', 'geleverd', 'gemonteerd', 'afgerond'] },
      { id: 'opnemer',    label: 'Opgenomen door' },
      { id: 'uitvoerder', label: 'Uitvoerder / ploeg' },
      { id: 'streefdatum', label: 'Gewenste leverdatum' },
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

  /* ─── tekenen ──────────────────────────────────────────────── */

  window.renderProject = function () {
    var houder = document.getElementById('projectVelden');
    if (!houder) return;
    var d = info();

    houder.innerHTML = VELDEN.map(function (g) {
      return '<section class="pi-groep"><h3>' + g.groep + '</h3><div class="pi-raster">' +
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
