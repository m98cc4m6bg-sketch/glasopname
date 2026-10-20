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
    // De bestelling is een gebeurtenis, geen bewerking: die draai je niet
    // terug met Cmd+Z. Een momentopname van vóór de bestelmail zette status,
    // bestelmoment en slot terug — en daarmee ging het project in de
    // database terug naar 'bezig' terwijl de leverancier de bestelling al
    // had (v91).
    // 'Opgenomen door' hoort daar ook bij: die staat vast en verandert
    // alleen met een wachtwoord (v93), dus Cmd+Z mag hem niet leegmaken.
    var nuInfo = (typeof projectInfo === 'object' && projectInfo) || {};
    projectInfo = s.info || {};
    // De lijst met verstuurde bestellingen (v104) net zo: een bestelling
    // die de deur uit is, haal je niet terug met Cmd+Z.
    ['status', 'besteld', 'bestellingen', 'bestelmail', 'slot', 'opnemer'].forEach(function (k) {
      if (nuInfo[k] === undefined) delete projectInfo[k];
      else projectInfo[k] = nuInfo[k];
    });
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
    if (window.merkOpnieuwBeoordelen) merkOpnieuwBeoordelen();
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

  // Alles vergeten. Aangeroepen door cloud.js zodra er een andere inhoud
  // binnenkomt: een ander project, een nieuw project, terug naar het
  // startscherm, of de versie van een collega (v91).
  //
  // Zonder dit bleven de momentopnames van het vórige project staan. Wie
  // project A bewerkte, project B opende en Cmd+Z deed, kreeg de inhoud
  // van A in B — en die ging naar de database van B. De momentopnames van
  // vóór een wijziging van een collega horen om dezelfde reden weg: één
  // keer ongedaan maken zou zijn werk stilzwijgend terugdraaien.
  window.undoLeeg = function () {
    terug.length = 0;
    vooruit.length = 0;
    bijBetreden = null;
    tekenKnoppen();
    if (window.blokVooruitLeeg) blokVooruitLeeg();
  };
  // De bedieningsbalk per tabel leest hier de momentopnames uit, om er
  // alleen de regels van één tabel uit terug te halen.
  window.undoStapels = function () { return { terug: terug, vooruit: vooruit }; };

  window.ongedaan = function () {
    if (!terug.length) return;
    // Stond de aandacht nog in een veld (bijvoorbeeld een net aangevinkt
    // vakje), dan zag het verlaten van dat veld de teruggezette stand als
    // 'cel gewijzigd' en wiste het opnieuw-doen (gevonden bij v104).
    bijBetreden = null;
    var stap = terug.pop();
    vooruit.push({ staat: staat(), label: stap.label });
    herstel(stap.staat);
    tekenKnoppen();
    melding('Ongedaan gemaakt: ' + stap.label.toLowerCase());
  };

  window.opnieuw = function () {
    if (!vooruit.length) return;
    bijBetreden = null;
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
      // Op slot weigert de functie zelf; dan ook geen lege stap maken. Die
      // wiste anders 'opnieuw' en gaf een ↶ die niets deed (v91).
      if (!(window.invoerOpSlot && invoerOpSlot())) bewaar(l);
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
      roedenopmerking: 'Roeden-opmerking',
      biColor: 'Bi-color', ralBinnen: 'RAL binnen'   // v114
    };
    return namen[veld] || veld;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Geen knoppen meer in de kopbalk: elke tabel heeft zijn eigen
    // ongedaan-knop. De sneltoets blijft wel het hele project terugdraaien.
    var acties = null;
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
    // Aan het document, niet aan één tabel: de tabellen onder een foto
    // worden pas later opgebouwd en hebben een eigen tbody. Die kregen
    // daardoor nooit een momentopname, en één keer ongedaan maken wiste
    // alles wat er onder die foto ingetypt was (v83).
    function inInvoertabel(el) {
      return el && el.closest && el.closest('table.invoer') &&
             el.matches('input, select, textarea');
    }

    document.addEventListener('focusin', function (e) {
      if (inBewerking || !inInvoertabel(e.target)) return;
      bijBetreden = { staat: staat(), label: null };
    }, true);

    document.addEventListener('focusout', function (e) {
      if (inBewerking || !bijBetreden || !inInvoertabel(e.target)) return;
      var voor = bijBetreden;
      bijBetreden = null;
      if (voor.staat === staat()) return;                  // niets veranderd
      terug.push({ staat: voor.staat, label: 'Cel gewijzigd' });
      if (terug.length > MAX) terug.shift();
      vooruit.length = 0;
      tekenKnoppen();
    }, true);

    // Losse bewerkingen
    omhul('verwijderRij', 'Rij verwijderd');
    omhul('clearAlles', 'Alles leeggemaakt');
    omhul('setCorrectie', 'Correctie gewijzigd');
    // v111: de keuzelijst wordt bij het kiezen vervangen, dan komt er geen
    // focusout; zonder deze stap nam Cmd+Z de bediening stil mee terug.
    // (De lengte is een gewoon vak: die stap komt al via focusin/focusout;
    // omhullen zou hem dubbel geven.)
    omhul('setBediening', 'Bediening gewijzigd');
    omhul('wijzigGlasType', 'Glastype gewijzigd');
    omhul('voegRijenToe', function (n) { return (n || 1) + ' rijen toegevoegd'; });
    omhul('bulkPasToe', 'Waarde doorgevoerd');
    omhul('bulkVerwijderSelectie', 'Selectie verwijderd');
    omhul('impToevoegen', 'Import toegevoegd');
    omhul('impVervangen', 'Lijst vervangen door import');
    omhul('datumVandaag', 'Datum ingevuld');

    // Sneltoets, maar niet terwijl je in een tekstveld staat:
    // daar hoort Cmd+Z de tekst zelf ongedaan te maken.
    // Ongedaan maken: Cmd+Z / Ctrl+Z. Opnieuw: Cmd+Shift+Z (Mac) en
    // Ctrl+Y of Ctrl+Shift+Z (Windows, v104: Ctrl+Y deed tot v103 niets).
    // In een invoerveld houdt de browser zijn eigen ongedaan-maken voor
    // de tekst die je net typt.
    document.addEventListener('keydown', function (e) {
      var k = String(e.key || '').toLowerCase();
      var mod = e.metaKey || e.ctrlKey;
      if (!mod || e.altKey) return;
      var terug = k === 'z' && !e.shiftKey;
      var vooruit = (k === 'z' && e.shiftKey) || (k === 'y' && e.ctrlKey && !e.metaKey && !e.shiftKey);
      if (!terug && !vooruit) return;
      // Staat er een venster open (zoals "Naar de leverancier?"), dan niets
      // terugdraaien onder dat venster door (v104).
      if (window.appMeldingBezig && appMeldingBezig()) return;
      var a = document.activeElement;
      // Alleen tekstvelden houden hun eigen ongedaan-maken; een net
      // aangevinkt vakje of een keuzelijst niet.
      if (a && (a.isContentEditable || a.matches('textarea, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])'))) return;
      e.preventDefault();
      if (vooruit) window.opnieuw(); else window.ongedaan();
    });

    tekenKnoppen();
  });
})();
