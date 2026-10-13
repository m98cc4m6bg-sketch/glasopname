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
    // Altijd op Start beginnen; de naslag terug naar zijn eigen tabblad.
    window.startTab('start');
    var naam = (window.glasGebruiker ? glasGebruiker().naam : '') || '';
    var wie = el('startGebruiker');
    if (wie) wie.innerHTML = naam ? 'Ingelogd als <b>' + esc2(naam) + '</b>' : '';
    vulVerder();
    // Eerst opruimen wat langer dan 30 dagen in de prullenbak staat, dan
    // pas de prullenbak tonen. De taken van projecten in de prullenbak
    // horen niet onder 'Mijn taken' (v91).
    var prul = (window.glasPrullenbakOpruimen ? glasPrullenbakOpruimen() : Promise.resolve())
      .then(function () { return window.glasPrullenbak ? glasPrullenbak() : []; }, function () { return []; });
    vulTaken(prul);
    vulProjecten(el('startZoek') ? el('startZoek').value : '');
    prul.then(vulPrullenbak);
  };

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
        var weg = {};
        (uit[2] || []).forEach(function (p) { weg[p.id] = true; });
        var taken = (uit[0] || []).filter(function (t) { return !weg[t.project_id]; });
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
    if (teller) teller.textContent = lijst.length ? String(lijst.length) : '';
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
