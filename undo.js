/* ═══════════════════════════════════════════════════════════════
   Glasopname – ongedaan maken
   Houdt momentopnames bij van de hele opname en zet die terug.
   Bewust géén momentopname per toetsaanslag: bij het betreden van
   een veld wordt de stand bewaard, en bij het verlaten weer
   weggegooid als er niets veranderd is. Eén bewerking = één stap.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MAX = 40;
  var terug = [];      // stapel: [{staat, label}]
  var vooruit = [];
  var bijBetreden = null;
  var inBewerking = false;   // voorkomt dat één handeling meerdere stappen oplevert

  function staat() {
    return JSON.stringify({
      rijen: rijen,
      volgendId: volgendId,
      fotos: fotos,
      info: projectInfo,
      taken: projectTaken,
      project: (document.getElementById('projectNaam') || {}).value || '',
      datum: (document.getElementById('projectDatum') || {}).value || '',
      speling: (document.getElementById('spelingGlobal') || {}).value || '4',
      bijtelling: (document.getElementById('bijtelling') || {}).value || '11'
    });
  }

  function herstel(json) {
    var s = JSON.parse(json);
    rijen = s.rijen || [];
    volgendId = s.volgendId || rijen.length + 1;
    fotos = s.fotos || [];
    projectInfo = s.info || {};
    projectTaken = s.taken || [];
    var z = function (id, v) { var e = document.getElementById(id); if (e) e.value = v; };
    z('projectNaam', s.project);
    z('projectDatum', s.datum);
    z('spelingGlobal', s.speling);
    z('bijtelling', s.bijtelling);
    renderTabel();
    herbereken();
    if (window.renderFotos) renderFotos();
    if (window.renderProject) renderProject();
    opslaan();
  }

  function bewaar(label) {
    if (inBewerking) return;   // een handeling die intern andere aanroept = één stap
    terug.push({ staat: staat(), label: label || 'Wijziging' });
    if (terug.length > MAX) terug.shift();
    vooruit.length = 0;          // na een nieuwe bewerking vervalt opnieuw-doen
    tekenKnoppen();
  }
  window.bewaarStap = bewaar;

  window.ongedaan = function () {
    if (!terug.length) return;
    var stap = terug.pop();
    vooruit.push({ staat: staat(), label: stap.label });
    herstel(stap.staat);
    tekenKnoppen();
    melding('Ongedaan gemaakt: ' + stap.label.toLowerCase());
  };

  window.opnieuw = function () {
    if (!vooruit.length) return;
    var stap = vooruit.pop();
    terug.push({ staat: staat(), label: stap.label });
    herstel(stap.staat);
    tekenKnoppen();
    melding('Opnieuw gedaan: ' + stap.label.toLowerCase());
  };

  function melding(t) {
    var s = document.getElementById('statusBar');
    if (s) s.textContent = t;
  }

  function tekenKnoppen() {
    var u = document.getElementById('knopOngedaan');
    var r = document.getElementById('knopOpnieuw');
    if (u) {
      u.disabled = !terug.length;
      u.title = terug.length
        ? 'Ongedaan maken: ' + terug[terug.length - 1].label
        : 'Niets om ongedaan te maken';
    }
    if (r) {
      r.style.display = vooruit.length ? '' : 'none';
      r.title = vooruit.length ? 'Opnieuw: ' + vooruit[vooruit.length - 1].label : '';
    }
  }

  /* ─── bewerkingen die een stap opleveren ───────────────────── */

  function omhul(naam, label) {
    var orig = window[naam];
    if (typeof orig !== 'function') return;
    window[naam] = function () {
      var l = typeof label === 'function' ? label.apply(null, arguments) : label;
      bewaar(l);
      var buitenste = !inBewerking;
      inBewerking = true;
      try {
        return orig.apply(this, arguments);
      } finally {
        if (buitenste) inBewerking = false;
      }
    };
  }

  function kolomNaam(veld) {
    var namen = {
      aantal: 'Aantal', merk: 'Merk', maatsoort: 'Maatsoort', breedte: 'Breedte',
      hoogte: 'Hoogte', opbouw: 'Opbouw', rooster: 'Rooster', ducoType: 'Duco type',
      ralKleur: 'RAL kleur', glasbewerking: 'Glasbewerking', opmerking: 'Opmerking',
      roedenverdeling: 'Roedenverdeling', roedenbreedte: 'Roedenbreedte',
      roedenopmerking: 'Roeden-opmerking'
    };
    return namen[veld] || veld;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // knoppen in de kop
    var acties = document.querySelector('.header-actions');
    if (acties) {
      var u = document.createElement('button');
      u.id = 'knopOngedaan';
      u.className = 'btn btn-sm btn-undo';
      u.innerHTML = '<span class="pijl">↶</span> Ongedaan';
      u.onclick = window.ongedaan;
      u.disabled = true;
      var r = document.createElement('button');
      r.id = 'knopOpnieuw';
      r.className = 'btn btn-sm btn-undo';
      r.innerHTML = '<span class="pijl">↷</span> Opnieuw';
      r.onclick = window.opnieuw;
      r.style.display = 'none';
      acties.insertBefore(r, acties.firstChild);
      acties.insertBefore(u, acties.firstChild);
    }

    // Typen in een veld: stand bewaren bij binnenkomen, weggooien als
    // er niets is veranderd. Zo levert één bewerkte cel één stap op,
    // en niet één per toetsaanslag.
    var tabel = document.getElementById('invoerBody');
    if (tabel) {
      tabel.addEventListener('focusin', function (e) {
        if (inBewerking || !e.target.matches('input, select, textarea')) return;
        bijBetreden = { staat: staat(), label: null };
      }, true);

      tabel.addEventListener('focusout', function (e) {
        if (inBewerking || !bijBetreden || !e.target.matches('input, select, textarea')) return;
        var voor = bijBetreden;
        bijBetreden = null;
        if (voor.staat === staat()) return;                  // niets veranderd
        terug.push({ staat: voor.staat, label: 'Cel gewijzigd' });
        if (terug.length > MAX) terug.shift();
        vooruit.length = 0;
        tekenKnoppen();
      }, true);
    }

    // Losse bewerkingen
    omhul('verwijderRij', 'Rij verwijderd');
    omhul('clearAlles', 'Alles leeggemaakt');
    omhul('setCorrectie', 'Correctie gewijzigd');
    omhul('wijzigGlasType', 'Glastype gewijzigd');
    omhul('voegRijenToe', function (n) { return (n || 1) + ' rijen toegevoegd'; });
    omhul('bulkPasToe', 'Waarde doorgevoerd');
    omhul('bulkVerwijderSelectie', 'Selectie verwijderd');
    omhul('impToevoegen', 'Import toegevoegd');
    omhul('impVervangen', 'Lijst vervangen door import');
    omhul('datumVandaag', 'Datum ingevuld');

    // Sneltoets, maar niet terwijl je in een tekstveld staat:
    // daar hoort Cmd+Z de tekst zelf ongedaan te maken.
    document.addEventListener('keydown', function (e) {
      if (e.key.toLowerCase() !== 'z' || !(e.metaKey || e.ctrlKey)) return;
      var a = document.activeElement;
      if (a && a.matches('input, textarea')) return;
      e.preventDefault();
      if (e.shiftKey) window.opnieuw(); else window.ongedaan();
    });

    tekenKnoppen();
  });
})();
