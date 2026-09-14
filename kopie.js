/* ═══════════════════════════════════════════════════════════════
   Glasopname – regels kopiëren

   Tijdens het inmeten komen dezelfde maten terug in verschillende
   kozijnen. Een kopie neemt alles over behalve twee dingen: de
   merkletter (die hoort bij precies één ruit) en de plek op de
   foto (anders staan er twee bolletjes op elkaar).

   De nieuwe letter volgt de logica van de rest van de app: blijft
   de kopie in hetzelfde kozijn en had het origineel een nummer,
   dan telt hij dáár door — A2 wordt A3. In alle andere gevallen
   krijgt hij de eerstvolgende vrije letter.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function basisEnNummer(merk) {
    var m = String(merk || '').trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    return m ? { basis: m[1], nummer: parseInt(m[2], 10) } : null;
  }

  function hoogsteNummer(basis) {
    var hoogste = 0;
    rijen.forEach(function (r) {
      var d = basisEnNummer(r.merk);
      if (d && d.basis === basis) hoogste = Math.max(hoogste, d.nummer);
    });
    return hoogste;
  }

  function nieuwMerk(bron, doelFotoId) {
    var zelfdeGroep = (bron.fotoId || null) === (doelFotoId || null);
    var d = basisEnNummer(bron.merk);
    if (zelfdeGroep && d) return d.basis + (hoogsteNummer(d.basis) + 1);
    return volgendMerk();
  }

  function maakKopie(bron, doelFotoId) {
    var nieuw = nieuweRij();
    var id = nieuw.id;
    Object.keys(bron).forEach(function (k) {
      if (k === 'id' || k === 'merk' || k === 'fotoId') return;
      nieuw[k] = bron[k];
    });
    nieuw.id = id;
    nieuw.merk = nieuwMerk(bron, doelFotoId);
    if (doelFotoId) nieuw.fotoId = doelFotoId; else delete nieuw.fotoId;
    return nieuw;
  }

  function afronden(melding) {
    herbereken();
    renderTabel();
    if (window.renderFotos) renderFotos();
    opslaan();
    var s = document.getElementById('statusBar');
    if (s) s.textContent = melding;
  }

  /* ─── één regel dupliceren ─────────────────────────────────── */

  window.kopieerRegel = function (id) {
    var bron = getRij(id);
    if (!bron) return;
    if (window.bewaarStap) bewaarStap('Regel gedupliceerd');
    var kopie = maakKopie(bron, bron.fotoId || null);
    rijen.splice(rijen.indexOf(bron) + 1, 0, kopie);
    afronden('Regel gekopieerd naar ' + kopie.merk);
    setTimeout(function () {
      var tr = document.getElementById('rij-' + kopie.id);
      if (tr) {
        tr.classList.add('gemarkeerd');
        setTimeout(function () { tr.classList.remove('gemarkeerd'); }, 2000);
      }
    }, 60);
  };

  /* ─── geselecteerde regels kopiëren ────────────────────────── */

  function geselecteerd() {
    if (!window.bulkIsGeselecteerd) return [];
    return rijen.filter(function (r) { return bulkIsGeselecteerd(r.id); });
  }

  window.kopieerSelectie = function (doelFotoId, doelNaam) {
    var bron = geselecteerd();
    if (!bron.length) return;
    if (window.bewaarStap) bewaarStap(bron.length + ' regels gekopieerd');
    // Stuk voor stuk toevoegen, niet eerst allemaal maken: de letter van
    // een kopie wordt bepaald door wat er al in gebruik is, en dan moet
    // de vorige kopie er al tussen staan. Anders krijgen ze allemaal
    // dezelfde letter.
    var nieuw = [];
    bron.forEach(function (r) {
      var kopie = maakKopie(r, doelFotoId);
      rijen.push(kopie);
      nieuw.push(kopie);
    });
    if (window.bulkSelectieWissen) bulkSelectieWissen();
    afronden(nieuw.length + ' regels gekopieerd naar ' +
      (doelNaam || 'dezelfde plek') + ' (' + nieuw.map(function (r) { return r.merk; }).join(', ') + ')');
  };

  /* ─── kopiëren naar een andere groep ───────────────────────── */

  window.kopieerNaarMenu = function (e) {
    if (!geselecteerd().length) return;
    var keuzes = fotos.map(function (f, i) {
      var naam = f.titel || (f.pad ? 'Foto ' + (i + 1) : 'Groep ' + (i + 1));
      return '<button onclick="kopieerNaar(\'' + f.id + '\')"><b>' + esc(naam) + '</b>' +
             '<span>' + rijen.filter(function (r) { return r.fotoId === f.id; }).length +
             ' ruiten</span></button>';
    });
    keuzes.push('<button onclick="kopieerNaar(\'\')"><b>Zonder foto of tekening</b>' +
                '<span>Onderaan bij de losse maten</span></button>');
    if (window.toonVeldMenu) toonVeldMenu(e.currentTarget, keuzes.join(''));
  };

  window.kopieerNaar = function (fotoId) {
    if (window.exportSluit) exportSluit();
    var naam = 'de losse maten';
    if (fotoId) {
      var f = fotos.find(function (x) { return x.id === fotoId; });
      naam = f ? (f.titel || 'die groep') : 'die groep';
    }
    kopieerSelectie(fotoId || null, naam);
  };
})();
