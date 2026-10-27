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
    // v120 (keuze Jan): ook de keuzes van Toebehoren (sponningdiepte,
    // onderdiepte, latzijde …). Die staan niet op de ruit maar bij het
    // project; tot v119 kreeg de kopie ze dus niet mee.
    meegenomen = window.toebehorenKopieerRuit ? toebehorenKopieerRuit(bron.id, id) : [];
    return nieuw;
  }
  var meegenomen = [];

  // "Controleer …" met wat er van Toebehoren meeging (keuze Jan).
  var NAMEN = { sponningDiepte: 'sponningdiepte', diepteOnder: 'onderdiepte', latZijde: 'latzijde', tweeKanten: 'latzijde',
                glaslat: 'glaslat', latOmgekeerd: 'montage lat', onderlat: 'onderlat', bandBinnen: 'band binnen',
                bandBuiten: 'band buiten', uitfrezen: 'uitfrezen' };
  function controleerTekst(velden) {
    var v = [];
    Object.keys(NAMEN).forEach(function (k) { if (velden.indexOf(k) >= 0 && v.indexOf(NAMEN[k]) < 0) v.push(NAMEN[k]); });
    if (!v.length) return '';
    return 'Controleer ' + (v.length === 1 ? v[0] : v.slice(0, -1).join(', ') + ' en ' + v[v.length - 1]) +
      ': ' + (v.length === 1 ? 'die is' : 'die zijn') + ' meegekopieerd.';
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
    var controle = controleerTekst(meegenomen);
    if (controle && window.kortBericht) kortBericht('Gekopieerd naar ' + kopie.merk + '. ' + controle, { soort: 'info' });
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
    var nieuw = [], alleVelden = [];
    bron.forEach(function (r) {
      var kopie = maakKopie(r, doelFotoId);
      rijen.push(kopie);
      nieuw.push(kopie);
      alleVelden = alleVelden.concat(meegenomen);
    });
    if (window.bulkSelectieWissen) bulkSelectieWissen();
    afronden(nieuw.length + ' regels gekopieerd naar ' +
      (doelNaam || 'dezelfde plek') + ' (' + nieuw.map(function (r) { return r.merk; }).join(', ') + ')');
    var controle = controleerTekst(alleVelden);
    if (controle && window.kortBericht) kortBericht(nieuw.length + ' regels gekopieerd. ' + controle, { soort: 'info' });
  };

  /* ─── geselecteerde ruiten gelijktrekken ───────────────────── */
  // Eén ruit ingevuld, de rest moet hetzelfde worden. Alles gaat mee
  // behalve de merkletter en de plek op de foto — die horen bij de ruit
  // zelf en mogen nooit gelijk worden.

  var NIET_OVERNEMEN = { id: 1, merk: 1, fotoId: 1 };

  // Een verse regel heeft al waarden in zich — 'Sponningmaat', 'Nee',
  // 'Geen roedenverdeling'. Vergelijken met een nieuwe regel is daarom
  // betrouwbaarder dan een opsomming van velden, en het blijft kloppen
  // als er ooit een kolom bij komt.
  var BEREKEND = { glasBreedte: 1, glasHoogte: 1, totaalDikte: 1, kgM2: 1 };

  function heeftInhoud(r) {
    var leeg = nieuweRij();
    if (r.correctie != null) return true;
    return Object.keys(leeg).some(function (veld) {
      if (NIET_OVERNEMEN[veld] || BEREKEND[veld]) return false;
      return String(r[veld] === undefined ? '' : r[veld]) !==
             String(leeg[veld] === undefined ? '' : leeg[veld]);
    });
  }

  window.gelijktrekken = async function () {
    var gekozen = geselecteerd();
    if (gekozen.length < 2) {
      await appMelding('Selecteer eerst de ruit die al ingevuld is, plus de ruiten die ' +
        'hetzelfde moeten worden.', { kop: 'Te weinig geselecteerd', soort: 'letop' });
      return;
    }
    // De eerste geselecteerde ruit mét inhoud is het voorbeeld; staat er
    // nergens iets in, dan de bovenste.
    var bron = gekozen.find(heeftInhoud) || gekozen[0];
    var doelen = gekozen.filter(function (r) { return r !== bron; });
    // v124 (wens Jan): het max glaspakket hoort bij het kozijn (uit de
    // maatstaat), niet bij het glas: elke ruit houdt het zijne. Is het glas
    // van het voorbeeld (met band) te dik voor het max van een doelruit, dan
    // wordt die ruit niet stil gelijkgetrokken, maar overgeslagen en genoemd.
    var teDik = [];
    var G = window.GlasLatten;
    doelen = doelen.filter(function (r) {
      if (!G || !G.opbouwTeDik || !r.maxPakket || !bron.glasType || !bron.opbouw) return true;
      var e = typeof DATA !== 'undefined' && DATA.lookup ? DATA.lookup[bron.glasType + '|' + bron.opbouw] : null;
      if (e && G.opbouwTeDik(r, e.totaal)) { teDik.push(r.merk || '?'); return false; }
      return true;
    });
    var overschrijft = doelen.filter(heeftInhoud);

    if (overschrijft.length && !await appVraag(
        overschrijft.length + ' van de geselecteerde ruiten ' +
        (overschrijft.length === 1 ? 'is' : 'zijn') + ' al ingevuld (' +
        overschrijft.map(function (r) { return r.merk || '?'; }).join(', ') + ').\n' +
        'Die worden overschreven met de gegevens van ' + (bron.merk || 'de eerste ruit') + '.',
        { kop: 'Ruiten gelijktrekken', ja: 'Overschrijven', gevaarlijk: true })) return;

    if (window.bewaarStap) bewaarStap('Ruiten gelijkgetrokken');
    // v110: een doelruit met bolletjes op de foto houdt zijn eigen aantal;
    // dat gaat alleen samen met de bolletjes (optie A, keuze van Jan).
    var aantalVast = [];
    doelen.forEach(function (r) {
      var houdAantal = !!(window.aantalVolgtBolletjes && aantalVolgtBolletjes(r));
      if (houdAantal && String(r.aantal) !== String(bron.aantal)) aantalVast.push(r.merk || '?');
      var eigen = function (veld) { return NIET_OVERNEMEN[veld] || veld === 'maxPakket' || (houdAantal && veld === 'aantal'); };
      // Eerst weg wat de bron niet heeft. Een eigen correctie (speling)
      // bleef anders in de doelruit staan, terwijl de melding zei dat de
      // ruiten gelijkgetrokken waren — met andere glasmaten tot gevolg (v83).
      Object.keys(r).forEach(function (veld) {
        if (eigen(veld)) return;
        if (!(veld in bron)) delete r[veld];
      });
      Object.keys(bron).forEach(function (veld) {
        if (eigen(veld)) return;
        r[veld] = bron[veld];
      });
    });
    if (window.bulkSelectieWissen) bulkSelectieWissen();
    afronden(doelen.length + ' ruiten gelijkgetrokken met ' + (bron.merk || 'de eerste ruit') +
      ' (' + doelen.map(function (r) { return r.merk; }).join(', ') + ')' +
      (aantalVast.length ? ' — het aantal niet bij ' + aantalVast.join(', ') + ': dat volgt de bolletjes op de foto' : '') +
      (teDik.length ? ' — niet bij ' + teDik.join(', ') + ': te dik voor het max glaspakket' : ''));
    if (teDik.length && window.appMelding) {
      appMelding('Niet gelijkgetrokken: ' + teDik.join(', ') + '. Het glas van ' + (bron.merk || 'de eerste ruit') + ' (' +
        bron.glasType + ' ' + bron.opbouw + ') is met band te dik voor het max glaspakket uit de maatstaat van ' +
        (teDik.length === 1 ? 'die ruit' : 'die ruiten') + '.', { kop: doelen.length + ' ruiten gelijkgetrokken' });
    }
  };

  /* ─── kopiëren naar een andere groep ───────────────────────── */

  window.kopieerNaarMenu = function (e) {
    if (!geselecteerd().length) return;
    var lijst = window.werkFotos ? werkFotos() : fotos;
    var keuzes = lijst.map(function (f, i) {
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
