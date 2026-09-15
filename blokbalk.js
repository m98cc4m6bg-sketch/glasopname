/* ═══════════════════════════════════════════════════════════════
   Glasopname – bedieningsbalk per invoertabel

   Ongedaan maken, leegmaken en de speling horen bij één tabel, niet
   bij het hele project. Bij tien kozijnen onder elkaar is anders
   nooit duidelijk waar een knop op slaat.

   De balk staat boven elke tabel — ook boven de losse maten — en
   alles wat je er doet raakt alleen die tabel.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function sleutelVan(fotoId) { return fotoId || ''; }

  function rijenInBlok(fotoId) {
    return rijen.filter(function (r) { return (r.fotoId || null) === (fotoId || null); });
  }

  /* ─── de balk ──────────────────────────────────────────────── */

  window.blokBalkHTML = function (fotoId) {
    var b = fotoId ? fotos.find(function (f) { return f.id === fotoId; }) : null;
    var speling = b && b.speling != null && b.speling !== '' ? String(b.speling) : '';
    var bijtelling = b && b.bijtelling != null && b.bijtelling !== '' ? String(b.bijtelling) : '';
    var id = sleutelVan(fotoId) || 'los';

    // Voor een blok zonder eigen waarde staat er wat de losse maten
    // gebruiken, zodat je ziet waarmee gerekend wordt.
    var algS = (document.getElementById('spelingGlobal') || {}).value || '4';
    var algB = (document.getElementById('bijtelling') || {}).value || '11';

    function opties(lijst, gekozen, algemeen) {
      return '<option value=""' + (gekozen === '' ? ' selected' : '') + '>' +
             algemeen + ' mm (algemeen)</option>' +
             lijst.map(function (v) {
               return '<option value="' + v + '"' + (gekozen === String(v) ? ' selected' : '') +
                      '>' + v + ' mm</option>';
             }).join('');
    }

    var waarden = DATA.speling_opties.map(function (x) { return parseInt(x, 10); });

    return '<div class="blok-bediening">' +
      '<button class="btn btn-ghost btn-sm" onclick="blokOngedaan(\'' + id + '\')" ' +
        'title="Laatste wijziging in deze tabel terugdraaien">↶ Ongedaan</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="blokOpnieuw(\'' + id + '\')" ' +
        'title="Opnieuw doen">↷</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="blokLeeg(\'' + id + '\')" ' +
        'title="Alleen deze tabel leegmaken">🗑 Leegmaken</button>' +
      (fotoId
        ? '<span class="blok-maat">' +
            '<label>Speling</label>' +
            '<select onchange="blokSpeling(\'' + fotoId + '\', \'speling\', this.value)">' +
              opties(waarden, speling, algS) + '</select>' +
            '<label>Bijtelling</label>' +
            '<select onchange="blokSpeling(\'' + fotoId + '\', \'bijtelling\', this.value)">' +
              opties(waarden, bijtelling, algB) + '</select>' +
          '</span>'
        : '<span class="blok-maat" id="losseMaatPlek"></span>') +
      '</div>';
  };

  window.blokSpeling = function (fotoId, wat, waarde) {
    var b = fotos.find(function (f) { return f.id === fotoId; });
    if (!b) return;
    if (window.bewaarStap) bewaarStap(wat === 'speling' ? 'Speling gewijzigd' : 'Bijtelling gewijzigd');
    if (waarde === '') delete b[wat]; else b[wat] = parseInt(waarde, 10);
    herbereken();
    renderTabel();
    opslaan();
  };

  /* ─── leegmaken, alleen deze tabel ─────────────────────────── */

  window.blokLeeg = function (id) {
    var fotoId = id === 'los' ? null : id;
    var eigen = rijenInBlok(fotoId);
    var gevuld = eigen.filter(function (r) { return r.breedte || r.hoogte || r.glasType || r.merk; });
    if (!gevuld.length) return;
    var waar = fotoId
      ? 'deze ' + (window.soortNaam ? soortNaam(fotos.find(function (f) { return f.id === fotoId; })) : 'foto')
      : 'de losse maten';
    if (!confirm('Alle ' + gevuld.length + ' ruiten bij ' + waar + ' verwijderen?\n\n' +
                 'De rest van het project blijft ongemoeid.')) return;

    if (window.bewaarStap) bewaarStap('Tabel leeggemaakt');
    var weg = {};
    eigen.forEach(function (r) { weg[r.id] = true; });
    fotos.forEach(function (f) {
      f.markeringen = (f.markeringen || []).filter(function (m) { return !weg[m.rijId]; });
    });
    rijen = rijen.filter(function (r) { return !weg[r.id]; });
    if (!fotoId) voegRijenToe(START_REGELS);
    herbereken();
    renderTabel();
    if (window.renderFotos) renderFotos();
    opslaan();
  };

  /* ─── ongedaan maken, alleen deze tabel ────────────────────── */
  // De momentopnames van de ongedaan-knop bevatten het hele project.
  // We zoeken de meest recente waarin déze tabel er anders uitzag, en
  // zetten alleen de regels van deze tabel terug. De rest blijft staan.

  var vooruitPerBlok = {};

  function zelfdeRegels(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  function zetRegelsTerug(fotoId, nieuweRegels) {
    var anders = rijen.filter(function (r) { return (r.fotoId || null) !== (fotoId || null); });
    var eerste = rijen.findIndex(function (r) { return (r.fotoId || null) === (fotoId || null); });
    if (eerste < 0) eerste = rijen.length;
    var ervoor = rijen.slice(0, eerste).filter(function (r) {
      return (r.fotoId || null) !== (fotoId || null);
    }).length;

    rijen = anders.slice(0, ervoor)
      .concat(JSON.parse(JSON.stringify(nieuweRegels)))
      .concat(anders.slice(ervoor));

    // Markeringen die naar verdwenen regels wijzen opruimen, en het
    // volgende id veilig zetten.
    var bestaat = {};
    rijen.forEach(function (r) { bestaat[r.id] = true; });
    fotos.forEach(function (f) {
      f.markeringen = (f.markeringen || []).filter(function (m) { return bestaat[m.rijId]; });
    });
    volgendId = rijen.reduce(function (m, r) { return Math.max(m, r.id || 0); }, 0) + 1;

    herbereken();
    renderTabel();
    if (window.renderFotos) renderFotos();
    opslaan();
  }

  window.blokOngedaan = function (id) {
    var fotoId = id === 'los' ? null : id;
    var stapels = window.undoStapels && undoStapels();
    if (!stapels) return;
    var nu = rijenInBlok(fotoId);

    for (var i = stapels.terug.length - 1; i >= 0; i--) {
      var toen;
      try { toen = JSON.parse(stapels.terug[i].staat).rijen || []; } catch (e) { continue; }
      var toenBlok = toen.filter(function (r) { return (r.fotoId || null) === (fotoId || null); });
      if (zelfdeRegels(toenBlok, nu)) continue;

      (vooruitPerBlok[id] = vooruitPerBlok[id] || []).push(JSON.parse(JSON.stringify(nu)));
      zetRegelsTerug(fotoId, toenBlok);
      melding('Laatste wijziging in deze tabel teruggedraaid');
      return;
    }
    melding('Niets meer om terug te draaien in deze tabel');
  };

  window.blokOpnieuw = function (id) {
    var lijst = vooruitPerBlok[id];
    if (!lijst || !lijst.length) { melding('Niets om opnieuw te doen in deze tabel'); return; }
    var fotoId = id === 'los' ? null : id;
    var nu = rijenInBlok(fotoId);
    var terug = lijst.pop();
    if (window.bewaarStap) bewaarStap('Opnieuw gedaan');
    zetRegelsTerug(fotoId, terug);
    melding('Opnieuw gedaan');
  };

  function melding(tekst) {
    var s = document.getElementById('statusBar');
    if (s) s.textContent = tekst;
  }
})();
