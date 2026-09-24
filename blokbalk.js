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

    // Elke tabel heeft zijn eigen speling en bijtelling, dus de lijst toont
    // gewoon de maten. Vroeger stond er bovenaan een aparte regel voor "geen
    // eigen waarde, volg de algemene" — dat was verwarrend zodra elke tabel
    // zijn eigen keuze kreeg, en het leverde twee regels op die hetzelfde
    // zeiden. Heeft dit blok nog geen eigen waarde, dan staat de maat die er
    // nu voor gerekend wordt gewoon voorgeselecteerd.
    function opties(lijst, gekozen, terugval) {
      var kies = gekozen !== '' ? parseInt(gekozen, 10) : parseInt(terugval, 10);
      return lijst.map(function (v) {
        return '<option value="' + v + '"' + (v === kies ? ' selected' : '') +
               '>' + v + ' mm</option>';
      }).join('');
    }

    var waarden = DATA.speling_opties.map(function (x) { return parseInt(x, 10); });

    // Label en keuzelijst zitten in één omhulsel. Zonder dat breekt de
    // regel op een telefoon tussen 'Speling' en zijn lijstje, en staat
    // 'Bijtelling' ineens naast de verkeerde keuze.
    function maatPaar(fotoId, wat, naam, gekozen, algemeen) {
      return '<span class="blok-maat-paar">' +
        '<label>' + naam + '</label>' +
        '<select onchange="blokSpeling(\'' + fotoId + '\', \'' + wat + '\', this.value)">' +
          opties(waarden, gekozen, algemeen) + '</select>' +
        '</span>';
    }

    return '<div class="blok-bediening">' +
      '<button class="btn btn-ghost btn-sm" onclick="blokOngedaan(\'' + id + '\')" ' +
        'title="Laatste wijziging in deze tabel terugdraaien">↶ Ongedaan</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="blokOpnieuw(\'' + id + '\')" ' +
        'title="Opnieuw doen">↷</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="blokLeeg(\'' + id + '\')" ' +
        'title="Alleen deze tabel leegmaken">🗑 Leegmaken</button>' +
      (fotoId
        ? '<span class="blok-maat">' +
            maatPaar(fotoId, 'speling', 'Speling aftrek', speling, algS) +
            maatPaar(fotoId, 'bijtelling', 'Bijtelling', bijtelling, algB) +
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

  window.blokLeeg = async function (id) {
    var fotoId = id === 'los' ? null : id;
    var eigen = rijenInBlok(fotoId);
    var gevuld = eigen.filter(function (r) { return r.breedte || r.hoogte || r.glasType || r.merk; });
    if (!gevuld.length) return;
    var waar = fotoId
      ? 'deze ' + (window.soortNaam ? soortNaam(fotos.find(function (f) { return f.id === fotoId; })) : 'foto')
      : 'de losse maten';
    if (!await appVraag('Alle ' + gevuld.length + ' ruiten bij ' + waar + ' verwijderen?\n' +
        'De rest van het project blijft ongemoeid.',
        { kop: 'Tabel leegmaken', ja: 'Verwijderen', gevaarlijk: true })) return;

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

  function zetRegelsTerug(fotoId, nieuweRegels, markeringen) {
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
    // De bolletjes van deze foto horen mee terug te komen; anders staan de
    // ruiten er weer, maar is niet meer te zien welke maat waar zit (v83).
    if (fotoId && Array.isArray(markeringen)) {
      var doelFoto = fotos.find(function (f) { return f.id === fotoId; });
      if (doelFoto) doelFoto.markeringen = JSON.parse(JSON.stringify(markeringen));
    }
    fotos.forEach(function (f) {
      f.markeringen = (f.markeringen || []).filter(function (m) { return bestaat[m.rijId]; });
    });
    // Nooit omlaag: rijen die door dit ongedaan maken even uit de lijst
    // zijn kunnen straks met ↷ terugkomen. Kreeg een nieuwe ruit intussen
    // hetzelfde id, dan wezen bolletjes en verwijderknoppen naar twee
    // ruiten tegelijk (v83).
    volgendId = Math.max(volgendId || 1,
      rijen.reduce(function (m, r) { return Math.max(m, r.id || 0); }, 0) + 1);

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
      var toen, toenStaat;
      try { toenStaat = JSON.parse(stapels.terug[i].staat); } catch (e) { continue; }
      toen = toenStaat.rijen || [];
      var toenBlok = toen.filter(function (r) { return (r.fotoId || null) === (fotoId || null); });
      if (zelfdeRegels(toenBlok, nu)) continue;

      var toenFoto = (toenStaat.fotos || []).find(function (f) { return f.id === fotoId; });
      var nuFoto = fotos.find(function (f) { return f.id === fotoId; });
      (vooruitPerBlok[id] = vooruitPerBlok[id] || []).push({
        regels: JSON.parse(JSON.stringify(nu)),
        markeringen: nuFoto ? JSON.parse(JSON.stringify(nuFoto.markeringen || [])) : null
      });
      zetRegelsTerug(fotoId, toenBlok, toenFoto ? toenFoto.markeringen : null);
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
    zetRegelsTerug(fotoId, terug.regels || terug, terug.markeringen);
    melding('Opnieuw gedaan');
  };

  function melding(tekst) {
    var s = document.getElementById('statusBar');
    if (s) s.textContent = tekst;
  }
})();
