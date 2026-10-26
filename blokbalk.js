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
  // Leeg bij het wisselen van project, samen met de stapels in undo.js
  // (v91). Anders zette ↷ in de tabel 'Zonder foto' regels van het vorige
  // project terug in het project dat nu openstaat.

  function zelfdeRegels(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // v115: Diepte en Onder staan op Invoer, maar worden bij het project
  // bewaard (info.toebehoren.perRuit), niet op de ruit. Zonder dit zag ↶ van
  // een tabel een gewijzigde diepte niet en draaide hij een oudere wijziging
  // terug (controle v115; voor Diepte al sinds v113).
  var DIEPTE_VELDEN = ['sponningDiepte', 'diepteOnder'];
  function dieptenVan(ids, info) {
    var pr = (info && info.toebehoren && info.toebehoren.perRuit) || {};
    var uit = {};
    ids.forEach(function (id) {
      var e = pr[id] || {};
      uit[id] = DIEPTE_VELDEN.map(function (v) { return e[v] == null ? '' : e[v]; });
    });
    return uit;
  }
  function idsVan() {
    var ids = [];
    Array.prototype.forEach.call(arguments, function (lijst) {
      (lijst || []).forEach(function (r) { if (ids.indexOf(r.id) < 0) ids.push(r.id); });
    });
    return ids;
  }
  function zetDieptenTerug(d) {
    if (!d || !window.toebehorenZetRuit) return;
    Object.keys(d).forEach(function (id) {
      DIEPTE_VELDEN.forEach(function (v, i) { toebehorenZetRuit(+id, v, d[id][i]); });
    });
  }

  // v123: speling en bijtelling van deze tabel (bij een foto op het blok,
  // bij de losse maten de algemene bovenaan). ↶ zag een gewijzigde speling
  // niet en draaide dan een oudere wijziging terug (controle v103).
  function maatVan(fotoId, staat, alsNu) {
    if (fotoId) {
      var f = alsNu ? fotos.find(function (x) { return x.id === fotoId; })
                    : (staat.fotos || []).find(function (x) { return x.id === fotoId; });
      return f ? [f.speling == null ? '' : String(f.speling), f.bijtelling == null ? '' : String(f.bijtelling)] : ['', ''];
    }
    if (alsNu) {
      return [(document.getElementById('spelingGlobal') || {}).value || '4',
              (document.getElementById('bijtelling') || {}).value || '11'];
    }
    return [String(staat.speling || '4'), String(staat.bijtelling || '11')];
  }
  function zetMaat(fotoId, m) {
    if (!m) return;
    if (fotoId) {
      var f = fotos.find(function (x) { return x.id === fotoId; });
      if (!f) return;
      if (m[0] === '') delete f.speling; else f.speling = parseInt(m[0], 10);
      if (m[1] === '') delete f.bijtelling; else f.bijtelling = parseInt(m[1], 10);
      return;
    }
    var s = document.getElementById('spelingGlobal'), b = document.getElementById('bijtelling');
    if (s) s.value = m[0];
    if (b) b.value = m[1];
  }
  // Alles wat ↶ per tabel bekijkt, in één tekst: zo is "is deze tabel nog
  // zoals ik hem achterliet?" één vergelijking.
  function blokKenmerk(fotoId) {
    var nuFoto = fotos.find(function (f) { return f.id === fotoId; });
    var nu = rijenInBlok(fotoId);
    return JSON.stringify([nu, nuFoto ? nuFoto.markeringen || [] : null,
      dieptenVan(idsVan(nu), projectInfo), maatVan(fotoId, null, true)]);
  }

  function zetRegelsTerug(fotoId, nieuweRegels, markeringen) {
    var anders = rijen.filter(function (r) { return (r.fotoId || null) !== (fotoId || null); });
    // v123 (controle v103): een ruit die intussen naar een andere foto
    // verhuisde, stond in de oude stand nog in deze tabel. Terugzetten gaf
    // dan twee ruiten met hetzelfde nummer. Nu blijft hij waar hij nu staat.
    var elders = {};
    anders.forEach(function (r) { elders[r.id] = true; });
    var overgeslagen = nieuweRegels.filter(function (r) { return elders[r.id]; });
    nieuweRegels = nieuweRegels.filter(function (r) { return !elders[r.id]; });
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
      // v123 (controle): ook de bolletjes van een ruit die nu elders staat
      // niet terugzetten; anders had die ruit bolletjes op twee foto's.
      if (doelFoto) doelFoto.markeringen = JSON.parse(JSON.stringify(markeringen))
        .filter(function (m) { return !elders[m.rijId]; });
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
    return overgeslagen.length;
  }

  // v123 (controle v103): waar ↶ in deze tabel gebleven was. Zonder dit
  // pendelde herhaald tikken: de tweede tik vond de stand van vóór de eerste
  // weer als "anders" en zette die terug. Nu zoekt de volgende tik verder
  // terug, zolang de tabel nog is zoals ↶ hem achterliet.
  var waarGebleven = {};
  window.blokVooruitLeeg = function () { vooruitPerBlok = {}; waarGebleven = {}; };

  window.blokOngedaan = function (id) {
    var fotoId = id === 'los' ? null : id;
    var stapels = window.undoStapels && undoStapels();
    if (!stapels) return;
    var nu = rijenInBlok(fotoId);
    var van = stapels.terug.length - 1;
    var w = waarGebleven[id];
    if (w && w.kenmerk === blokKenmerk(fotoId) && stapels.terug.indexOf(w.stap) >= 0) {
      van = stapels.terug.indexOf(w.stap) - 1;
    }

    for (var i = van; i >= 0; i--) {
      var toen, toenStaat;
      try { toenStaat = JSON.parse(stapels.terug[i].staat); } catch (e) { continue; }
      toen = toenStaat.rijen || [];
      var toenBlok = toen.filter(function (r) { return (r.fotoId || null) === (fotoId || null); });
      var toenFoto = (toenStaat.fotos || []).find(function (f) { return f.id === fotoId; });
      var nuFoto = fotos.find(function (f) { return f.id === fotoId; });
      // Ook alleen de bolletjes tellen als wijziging (v110): "het bolletje
      // weg" uit de strook onder de foto veranderde geen regel, en dan
      // draaide ↶ een oudere wijziging terug in plaats van deze.
      var zelfdeBollen = JSON.stringify((toenFoto && toenFoto.markeringen) || []) ===
                         JSON.stringify((nuFoto && nuFoto.markeringen) || []);
      var ids = idsVan(nu, toenBlok);
      var toenDiepte = dieptenVan(ids, toenStaat.info), nuDiepte = dieptenVan(ids, projectInfo);
      var toenMaat = maatVan(fotoId, toenStaat, false), nuMaat = maatVan(fotoId, null, true);
      if (zelfdeRegels(toenBlok, nu) && zelfdeBollen && JSON.stringify(toenDiepte) === JSON.stringify(nuDiepte) &&
          JSON.stringify(toenMaat) === JSON.stringify(nuMaat)) continue;

      (vooruitPerBlok[id] = vooruitPerBlok[id] || []).push({
        regels: JSON.parse(JSON.stringify(nu)),
        markeringen: nuFoto ? JSON.parse(JSON.stringify(nuFoto.markeringen || [])) : null,
        diepten: nuDiepte,
        maat: nuMaat
      });
      zetDieptenTerug(toenDiepte);
      zetMaat(fotoId, toenMaat);
      var weg = zetRegelsTerug(fotoId, toenBlok, toenFoto ? toenFoto.markeringen : null);
      waarGebleven[id] = { stap: stapels.terug[i], kenmerk: blokKenmerk(fotoId) };
      melding(weg ? 'Teruggedraaid; ' + weg + (weg === 1 ? ' ruit staat' : ' ruiten staan') +
                    ' intussen bij een andere foto en ' + (weg === 1 ? 'is' : 'zijn') + ' daar gebleven'
                  : 'Laatste wijziging in deze tabel teruggedraaid');
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
    zetDieptenTerug(terug.diepten);
    zetMaat(fotoId, terug.maat);
    zetRegelsTerug(fotoId, terug.regels || terug, terug.markeringen);
    delete waarGebleven[id];
    melding('Opnieuw gedaan');
  };

  function melding(tekst) {
    var s = document.getElementById('statusBar');
    if (s) s.textContent = tekst;
  }
})();
