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
      c.map(function (x) { return '‹' + esc(x.letter) + '›'; }).join(', ') +
      (c.length === 1 ? ' hoort bij meer dan één ruit.' : '') + '</span>' +
      '<button onclick="merkDialoog()">Oplossen</button>';
  };

  /* ─── venster met keuzes ───────────────────────────────────── */

  window.merkDialoog = function () {
    var c = merkConflicten();
    if (!c.length) { merkBalkBijwerken(); return; }
    var lijst = document.getElementById('merkLijst');
    // v123: het venster toont precies wat ‹Automatisch hernummeren› doet
    // (zelfde berekening, merkPlan). Tot v122 stond er bij de eerste ruit
    // "(behoudt de letter)", terwijl een kale letter (A, A) A1 en A2 werd.
    var plan = merkPlan();
    var naar = function (r) { var p = plan.filter(function (x) { return x.rij === r; })[0]; return p ? p.naar : null; };
    lijst.innerHTML = c.map(function (x) {
      return '<div class="merk-groep"><div class="merk-letter">' + esc(x.letter) + '</div><div>' +
        x.rijen.map(function (r) {
          var n = naar(r);
          return '<div class="merk-regel' + (n ? '' : ' behoudt') + '">' + esc(omschrijf(r)) +
            (n ? ' <em>→ wordt ' + esc(n) + '</em>'
               : ' <em>(behoudt de letter' + (besteld(r) ? ', al besteld' : '') + ')</em>') + '</div>';
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

  // Is deze ruit al besteld (in een geldige bestellijst)? Dan houdt hij zijn
  // merk: een ander merk maakt er op de volgende lijst een VERVANGT van, en
  // de leverancier kent hem onder het oude merk (v123).
  function besteld(r) {
    try {
      var st = window.besteldeStand ? besteldeStand() : null;
      return !!(st && st.nr && st.nr[r.id]);
    } catch (e) { return false; }
  }

  // Dezelfde regel als bij het importeren: dragen alle botsende ruiten een
  // kale kozijnletter, dan worden het A1, A2, A3 — dat zegt de buitenman
  // meteen bij welk kozijn een ruit hoort. Alleen wanneer de letter al een
  // nummer heeft houdt de eerste hem en tellen de andere door.
  // v123: een al bestelde ruit houdt altijd zijn merk; de andere tellen door
  // (A blijft A, de nieuwe wordt A1). pasRegelToe verandert de merken echt;
  // merkPlan rekent hetzelfde uit en zet alles daarna terug (voor het venster).
  function pasRegelToe() {
    merkConflicten().forEach(function (x) {
      var vast = x.rijen.filter(besteld);
      var kaal = sleutel(x.letter).match(/^[A-Z]+$/);
      if (kaal && !vast.length) {
        var basis = sleutel(x.letter);
        var start = hoogsteNummerVoor(basis, x.rijen);
        x.rijen.forEach(function (r, i) { r.merk = basis + (start + i + 1); });
        return;
      }
      var houdt = vast.length ? vast : [x.rijen[0]];
      x.rijen.forEach(function (r) {
        if (houdt.indexOf(r) >= 0) return;
        var d = sleutel(r.merk).match(/^([A-Z]+)(\d*)$/);
        r.merk = d ? d[1] + (hoogsteNummerVoor(d[1], []) + 1) : volgendMerk();
      });
    });
  }

  window.merkPlan = function () {
    var oud = rijen.map(function (r) { return r.merk; });
    var plan = [];
    try {
      pasRegelToe();
      rijen.forEach(function (r, i) { if (r.merk !== oud[i]) plan.push({ rij: r, van: oud[i], naar: r.merk }); });
    } finally {
      rijen.forEach(function (r, i) { r.merk = oud[i]; });
    }
    return plan;
  };

  window.merkAutoOplossen = function () {
    if (window.bewaarStap) bewaarStap('Dubbele merken hernoemd');
    var plan = merkPlan();
    plan.forEach(function (p) { p.rij.merk = p.naar; });
    var gewijzigd = plan.map(function (p) { return p.van + ' → ' + p.naar; });
    document.getElementById('merkVenster').style.display = 'none';
    renderTabel();
    herbereken();
    opslaan();
    merkBalkBijwerken();
    var s = document.getElementById('statusBar');
    if (s) s.textContent = gewijzigd.length ? 'Hernoemd: ' + gewijzigd.join(', ') : 'Niets hernoemd';
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
