/* ═══════════════════════════════════════════════════════════════
   Glasopname – merkletters uniek houden

   Binnen één project mag een merkletter maar bij één ruit horen.
   Anders wijst het bolletje op de foto naar de verkeerde maat en
   krijgt de leverancier twee ruiten die allebei B heten.

   Er wordt gecontroleerd zodra een merk wordt ingevuld, na een
   import, en bij het openen van een project. Bij een botsing komt
   er een venster met de keuze: automatisch hernummeren, of de
   wijziging terugdraaien. Zolang er een botsing openstaat blijft
   er een rode balk bovenaan staan — wegklikken zonder oplossen
   kan wel, maar ongemerkt voorbijgaan niet.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var laatsteWaarde = null;   // merk zoals het was vóór de bewerking

  function sleutel(m) { return String(m || '').trim().toUpperCase(); }

  /* ─── botsingen zoeken ─────────────────────────────────────── */

  window.merkConflicten = function () {
    var perLetter = {};
    rijen.forEach(function (r) {
      var k = sleutel(r.merk);
      if (!k) return;
      (perLetter[k] = perLetter[k] || []).push(r);
    });
    return Object.keys(perLetter)
      .filter(function (k) { return perLetter[k].length > 1; })
      .map(function (k) { return { letter: perLetter[k][0].merk.trim(), rijen: perLetter[k] }; });
  };

  function herkomst(rij) {
    if (!rij.fotoId) return 'tabblad Invoer';
    var f = fotos.find(function (x) { return x.id === rij.fotoId; });
    if (!f) return 'onbekende foto';
    var n = fotos.indexOf(f) + 1;
    return f.titel ? f.titel : 'foto ' + n;
  }

  function omschrijf(rij) {
    var maat = (rij.breedte && rij.hoogte) ? rij.breedte + ' × ' + rij.hoogte + ' mm' : 'nog geen maat';
    return maat + ' — ' + herkomst(rij);
  }

  /* ─── rode balk bovenaan ───────────────────────────────────── */

  window.merkBalkBijwerken = function () {
    var balk = document.getElementById('merkWaarschuwing');
    if (!balk) return;
    var c = merkConflicten();
    if (!c.length) {
      balk.style.display = 'none';
      balk.innerHTML = '';
      var venster = document.getElementById('merkVenster');
      if (venster && venster.style.display === 'flex') venster.style.display = 'none';
      return;
    }
    balk.style.display = 'flex';
    balk.innerHTML =
      '<span>⚠ ' + (c.length === 1 ? 'De merkletter ' : 'Dubbele merkletters: ') +
      c.map(function (x) { return '‹' + x.letter + '›'; }).join(', ') +
      (c.length === 1 ? ' hoort bij meer dan één ruit.' : '') + '</span>' +
      '<button onclick="merkDialoog()">Oplossen</button>';
  };

  /* ─── venster met keuzes ───────────────────────────────────── */

  window.merkDialoog = function () {
    var c = merkConflicten();
    if (!c.length) { merkBalkBijwerken(); return; }
    var lijst = document.getElementById('merkLijst');
    lijst.innerHTML = c.map(function (x) {
      return '<div class="merk-groep"><div class="merk-letter">' + esc(x.letter) + '</div><div>' +
        x.rijen.map(function (r, i) {
          return '<div class="merk-regel' + (i === 0 ? ' behoudt' : '') + '">' +
            esc(omschrijf(r)) + (i === 0 ? ' <em>(behoudt de letter)</em>' : '') + '</div>';
        }).join('') + '</div></div>';
    }).join('');

    var kanTerug = window.ongedaan && document.getElementById('knopOngedaan') &&
                   !document.getElementById('knopOngedaan').disabled;
    document.getElementById('merkOngedaan').style.display = kanTerug ? '' : 'none';
    document.getElementById('merkVenster').style.display = 'flex';
  };

  window.merkSluit = function () {
    document.getElementById('merkVenster').style.display = 'none';
    merkBalkBijwerken();
  };

  function hoogsteNummerVoor(basis, negeer) {
    var hoogste = 0;
    rijen.forEach(function (r) {
      if (negeer.indexOf(r) >= 0) return;
      var d = String(r.merk || '').trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
      if (d && d[1] === basis) hoogste = Math.max(hoogste, parseInt(d[2], 10));
    });
    return hoogste;
  }

  // Dezelfde regel als bij het importeren: dragen alle botsende ruiten een
  // kale kozijnletter, dan worden het A1, A2, A3 — dat zegt de buitenman
  // meteen bij welk kozijn een ruit hoort. Alleen wanneer de letter al een
  // nummer heeft houdt de eerste hem en tellen de andere door.
  window.merkAutoOplossen = function () {
    if (window.bewaarStap) bewaarStap('Dubbele merken hernoemd');
    var c = merkConflicten();
    var gewijzigd = [];
    c.forEach(function (x) {
      var kaal = sleutel(x.letter).match(/^[A-Z]+$/);
      if (kaal) {
        var basis = sleutel(x.letter);
        var start = hoogsteNummerVoor(basis, x.rijen);
        x.rijen.forEach(function (r, i) { r.merk = basis + (start + i + 1); });
        gewijzigd.push(x.letter + ' → ' + x.rijen[0].merk + ' t/m ' + x.rijen[x.rijen.length - 1].merk);
        return;
      }
      x.rijen.slice(1).forEach(function (r) {
        var oud = r.merk;
        var d = sleutel(oud).match(/^([A-Z]+)(\d+)$/);
        r.merk = d ? d[1] + (hoogsteNummerVoor(d[1], []) + 1) : volgendMerk();
        gewijzigd.push(oud + ' → ' + r.merk);
      });
    });
    document.getElementById('merkVenster').style.display = 'none';
    renderTabel();
    herbereken();
    opslaan();
    merkBalkBijwerken();
    var s = document.getElementById('statusBar');
    if (s) s.textContent = 'Hernoemd: ' + gewijzigd.join(', ');
  };

  window.merkTerugdraaien = function () {
    document.getElementById('merkVenster').style.display = 'none';
    if (window.ongedaan) ongedaan();
    setTimeout(merkBalkBijwerken, 50);
  };

  /* ─── controlemomenten ─────────────────────────────────────── */

  window.controleerMerken = function (meteenTonen) {
    merkBalkBijwerken();
    if (meteenTonen && merkConflicten().length) merkDialoog();
  };

  // Wordt de hele inhoud vervangen — ander project geopend, versie
  // teruggezet, wijziging van een collega binnengekomen — dan slaat een
  // openstaande melding op niets meer. Balk en venster moeten dan mee.
  window.merkOpnieuwBeoordelen = function () {
    var venster = document.getElementById('merkVenster');
    if (venster) venster.style.display = 'none';
    laatsteWaarde = null;
    merkBalkBijwerken();
  };

  document.addEventListener('DOMContentLoaded', function () {
    // Tijdens het typen niet controleren: 'AB' gaat nu eenmaal langs 'A'.
    document.addEventListener('focusin', function (e) {
      if (e.target.classList && e.target.classList.contains('merk-input')) {
        laatsteWaarde = e.target.value;
      }
    }, true);

    // Tijdens het typen loopt het bolletje op de foto meteen mee. Zonder
    // dat gebeurt er zichtbaar niets tot je het veld verlaat, en dan lijkt
    // het of de koppeling niet werkt.
    document.addEventListener('input', function (e) {
      if (!e.target.classList || !e.target.classList.contains('merk-input')) return;
      if (window.fotoLabelsBijwerken) fotoLabelsBijwerken();
    }, true);

    document.addEventListener('focusout', function (e) {
      if (!e.target.classList || !e.target.classList.contains('merk-input')) return;
      if (e.target.value === laatsteWaarde) return;
      laatsteWaarde = null;
      if (window.fotoLabelsBijwerken) fotoLabelsBijwerken();
      controleerMerken(true);
    }, true);

    // Na een import kunnen er in één klap tientallen bij komen.
    ['impToevoegen', 'impVervangen'].forEach(function (naam) {
      var orig = window[naam];
      if (typeof orig !== 'function') return;
      window[naam] = function () {
        var res = orig.apply(this, arguments);
        setTimeout(function () { controleerMerken(true); }, 120);
        return res;
      };
    });

    // En bij het doorvoeren van een waarde over meerdere ruiten.
    var origBulk = window.bulkPasToe;
    if (typeof origBulk === 'function') {
      window.bulkPasToe = function () {
        var res = origBulk.apply(this, arguments);
        setTimeout(function () { controleerMerken(true); }, 120);
        return res;
      };
    }

    setTimeout(merkBalkBijwerken, 400);
  });
})();
