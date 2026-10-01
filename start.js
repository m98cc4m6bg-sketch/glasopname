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
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
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

  window.glasToonStart = function () {
    var scherm = el('startScherm');
    if (!scherm) return;
    scherm.hidden = false;
    document.body.classList.add('op-start');
    var naam = (window.glasGebruiker ? glasGebruiker().naam : '') || '';
    var wie = el('startGebruiker');
    if (wie) wie.innerHTML = naam ? 'Ingelogd als <b>' + esc2(naam) + '</b>' : '';
    vulVerder();
    vulTaken();
    vulProjecten(el('startZoek') ? el('startZoek').value : '');
  };

  window.glasToonApp = function () {
    var scherm = el('startScherm');
    if (scherm) scherm.hidden = true;
    document.body.classList.remove('op-start');
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

  function vulTaken() {
    var vak = el('startTaken');
    var teller = el('startTakenTelling');
    if (!vak || !window.glasMijnTaken) return;
    vak.innerHTML = '<div class="start-leeg">Taken ophalen…</div>';

    Promise.all([glasMijnTaken(), window.glasProjecten ? glasProjecten('') : Promise.resolve({ data: [] })])
      .then(function (uit) {
        var taken = uit[0] || [];
        var projecten = (uit[1] && uit[1].data) || [];
        var naamVan = {};
        projecten.forEach(function (p) { naamVan[p.id] = p.naam; });

        if (teller) teller.textContent = taken.length ? taken.length + ' open' : '';
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
        }).join('');
      });
  }

  window.startTaakKlaar = function (id) {
    if (!window.glasTaakWijzig) return;
    glasTaakWijzig(id, { klaar: true }).then(function () { vulTaken(); });
  };

  /* ─── projecten ───────────────────────────────────────────── */

  function statusLabel(p) {
    var s = String(p.status || 'open');
    if (s === 'besteld') return '<em class="start-status besteld">besteld</em>';
    if (s === 'afgerond') return '<em class="start-status afgerond">afgerond</em>';
    return '';
  }

  function vulProjecten(zoek) {
    var vak = el('startProjecten');
    if (!vak || !window.glasProjecten) return;
    vak.innerHTML = '<div class="start-leeg">Projecten ophalen…</div>';
    glasProjecten(zoek).then(function (res) {
      if (res.error) {
        vak.innerHTML = '<div class="start-leeg start-fout">De projecten konden niet opgehaald worden. ' +
          '<button class="btn btn-secondary btn-sm" onclick="glasToonStart()">Opnieuw proberen</button></div>';
        return;
      }
      var lijst = res.data || [];
      projectenCache = lijst;
      vulVerder();
      var teller = el('startProjectTelling');
      if (teller) teller.textContent = lijst.length ? lijst.length + ' projecten' : '';
      if (!lijst.length) {
        vak.innerHTML = '<div class="start-leeg">' +
          (String(zoek || '').trim() ? 'Geen project gevonden.' : 'Nog geen projecten. Maak er hieronder een aan.') +
          '</div>';
        return;
      }
      vak.innerHTML = lijst.map(function (p) {
        return '<div class="start-project">' +
          '<button class="start-project-weg" title="Project verwijderen" ' +
            'onclick="event.stopPropagation(); cloudVerwijder(\'' + esc2(p.id) + '\')">🗑</button>' +
          '<div class="start-project-info" onclick="cloudOpen(\'' + esc2(p.id) + '\')">' +
          '<strong>' + esc2(p.naam || '(naamloos)') + statusLabel(p) + '</strong>' +
          '<span>' + (p.adres ? esc2(p.adres) + ' · ' : '') +
          (p.aantal_ruiten || 0) + ' ruiten' +
          (p.open_taken ? ' · <b class="pl-taken">' + p.open_taken + ' open ' +
             (p.open_taken === 1 ? 'taak' : 'taken') + '</b>' : '') +
          (p.datum ? ' · ' + esc2(p.datum) : '') +
          ' · gewijzigd ' + datumKort(p.updated_at) +
          (p.gewijzigd_naam ? ' door ' + esc2(p.gewijzigd_naam) : '') +
          '</span></div></div>';
      }).join('');
    });
  }

  window.startZoeken = function (waarde) {
    clearTimeout(zoekTimer);
    zoekTimer = setTimeout(function () { vulProjecten(waarde); }, 250);
  };

  window.startZoekWissen = function () {
    var veld = el('startZoek');
    if (veld) { veld.value = ''; veld.focus(); }
    vulProjecten('');
  };

  window.startVernieuwen = function () { window.glasToonStart(); };
})();
