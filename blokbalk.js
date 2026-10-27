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
    // v124: de ruiten van deze tabel in "Onlangs verwijderd" (herstel.js).
    if (window.glasVerwijderdTabel) glasVerwijderdTabel(fotoId);
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

  // v124: zonder het stempel van het opslaan (gewOp, gewDoor; cloud.js zet
  // het pas als de stand naar de server gaat). Anders zag ↶ een teruggezette
  // ruit na het opslaan weer als "anders" en bleef hij op dezelfde stap
  // hangen in plaats van verder terug te gaan.
  function zonderStempel(lijst) {
    return (lijst || []).map(function (r) {
      var k = {};
      Object.keys(r || {}).forEach(function (n) { if (n !== 'gewOp' && n !== 'gewDoor') k[n] = r[n]; });
      return k;
    });
  }
  function zelfdeRegels(a, b) { return JSON.stringify(zonderStempel(a)) === JSON.stringify(zonderStempel(b)); }

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
  /* v124: een ruit die verhuisde (aanwijzen of een bolletje weghalen zet een
     ruit sinds v124 vanzelf bij de tekening met de meeste bolletjes). Tot
     v123 bleef een ruit die intussen bij een andere foto stond daar (geen
     dubbel nummer), en viel een ruit die ná die stand in deze tabel kwam
     (een ingelezen ruit aangewezen op de tekening) bij ↶ helemaal weg, met
     zijn maten. Nu: was die verhuizing het laatste wat er met de ruit
     gebeurde (stand na de stap = nu), dan gaat hij helemaal terug: de regel
     en zijn bolletjes op elke foto (verhuisd, niet gekopieerd). Is hij daarna
     nog gewijzigd, dan blijft hij waar hij nu staat (v123), ook als hij nu
     in deze tabel staat: nooit weg. */
  function ruitAfdruk(r, fotoLijst) {
    if (!r) return '';
    var kaal = {};
    // Het stempel van het opslaan telt niet: dat komt pas na de stap.
    Object.keys(r).sort().forEach(function (k) { if (k !== 'gewOp' && k !== 'gewDoor') kaal[k] = r[k]; });
    return JSON.stringify([kaal, (fotoLijst || []).map(function (f) {
      return [f.id, (f.markeringen || []).filter(function (m) { return m.rijId === r.id; }).map(function (m) { return [m.x, m.y]; })];
    })]);
  }
  function bollenIn(rijId, fotoLijst) {
    var uit = {};
    (fotoLijst || []).forEach(function (f) {
      uit[f.id] = (f.markeringen || []).filter(function (m) { return m.rijId === rijId; });
    });
    return JSON.parse(JSON.stringify(uit));
  }

  // verhuisd (v124): [{ rij, bollen }] = ruiten die precies zo terug moeten
  // (regel en bolletjes per foto). bestondToen: nummers van de ruiten in de
  // stand waar ↶ naartoe gaat (bij ↷ niet).
  function zetRegelsTerug(fotoId, nieuweRegels, markeringen, verhuisd, bestondToen) {
    var hier = function (r) { return (r.fotoId || null) === (fotoId || null); };
    var vast = {};
    (verhuisd || []).forEach(function (v) { vast[v.rij.id] = v; });
    var hierNu = rijen.filter(hier);
    var anders = rijen.filter(function (r) { return !hier(r) && !vast[r.id]; });
    // v123 (controle v103): een ruit die intussen naar een andere foto
    // verhuisde, stond in de oude stand nog in deze tabel. Terugzetten gaf
    // dan twee ruiten met hetzelfde nummer. Nu blijft hij waar hij nu staat.
    var elders = {};
    anders.forEach(function (r) { elders[r.id] = true; });
    var overgeslagen = nieuweRegels.filter(function (r) { return elders[r.id]; });
    nieuweRegels = nieuweRegels.filter(function (r) { return !elders[r.id]; });
    // v124: een verhuisde ruit precies zoals hij terug moet; hoort hij dan
    // niet in deze tabel, dan komt hij achteraan bij de andere.
    var naarElders = [];
    Object.keys(vast).forEach(function (id) { if (!hier(vast[id].rij)) naarElders.push(vast[id].rij); });
    nieuweRegels = nieuweRegels.filter(function (r) { return !vast[r.id] || hier(vast[r.id].rij); })
      .map(function (r) { return vast[r.id] ? vast[r.id].rij : r; });
    // v124: staat nu hier, niet in die stand, en bestond toen al elders (en
    // is na de verhuizing nog gewijzigd): blijft staan, nooit weg.
    var blijft = {};
    nieuweRegels.forEach(function (r) { blijft[r.id] = true; });
    var houden = hierNu.filter(function (r) { return !blijft[r.id] && !vast[r.id] && bestondToen && bestondToen[r.id]; });
    var eerste = rijen.findIndex(hier);
    if (eerste < 0) eerste = rijen.length;
    var ervoor = rijen.slice(0, eerste).filter(function (r) { return !hier(r) && !vast[r.id]; }).length;

    // v124: de bolletjes hier van ruiten die in een ánder blok blijven
    // (ruiten verdeeld over tekeningen). Van een ruit die hier blijft staan
    // of die toen hier stond en nu elders, blijven ze zoals ze nu zijn (v123:
    // zijn oude niet terugzetten). Van een ruit die toen én nu elders staat,
    // komen ze terug zoals toen, nooit meer dan zijn aantal min wat hij op de
    // andere foto's heeft. Tot v123 gingen ze weg.
    var vreemd = [];
    var doelFoto = fotoId ? fotos.find(function (f) { return f.id === fotoId; }) : null;
    if (doelFoto && Array.isArray(markeringen)) {
      var zoalsNu = {};
      overgeslagen.concat(houden).forEach(function (r) { zoalsNu[r.id] = true; });
      var ruimte = {};
      var ruimteVan = function (id) {
        if (ruimte[id] !== undefined) return ruimte[id];
        var r = anders.find(function (x) { return x.id === id; });
        var n = r ? (parseInt(r.aantal, 10) > 0 ? parseInt(r.aantal, 10) : 1) : 0;
        fotos.forEach(function (f) {
          if (f !== doelFoto) (f.markeringen || []).forEach(function (m) { if (m.rijId === id) n--; });
        });
        return (ruimte[id] = n);
      };
      vreemd = (doelFoto.markeringen || []).filter(function (m) { return zoalsNu[m.rijId]; })
        .concat(JSON.parse(JSON.stringify(markeringen)).filter(function (m) {
          return elders[m.rijId] && !zoalsNu[m.rijId] && ruimteVan(m.rijId) > 0 && ruimte[m.rijId]-- > 0;
        }));
      // De ruiten die hier blijven staan, niet ook nog uit die stand.
      markeringen = markeringen.filter(function (m) { return !houden.some(function (r) { return r.id === m.rijId; }); });
    }

    rijen = anders.slice(0, ervoor)
      .concat(JSON.parse(JSON.stringify(nieuweRegels)))
      .concat(houden)
      .concat(anders.slice(ervoor))
      .concat(JSON.parse(JSON.stringify(naarElders)));
    // De bolletjes van een verhuisde ruit op de andere foto's zoals bij die
    // stand (op deze foto komen ze hieronder uit die stand).
    Object.keys(vast).forEach(function (id) {
      var v = vast[id];
      fotos.forEach(function (f) {
        if (f === doelFoto && Array.isArray(markeringen)) return;
        f.markeringen = (f.markeringen || []).filter(function (m) { return m.rijId !== v.rij.id; })
          .concat(JSON.parse(JSON.stringify((v.bollen || {})[f.id] || [])));
      });
    });

    // Markeringen die naar verdwenen regels wijzen opruimen, en het
    // volgende id veilig zetten.
    var bestaat = {};
    rijen.forEach(function (r) { bestaat[r.id] = true; });
    // De bolletjes van deze foto horen mee terug te komen; anders staan de
    // ruiten er weer, maar is niet meer te zien welke maat waar zit (v83).
    if (fotoId && Array.isArray(markeringen)) {
      // v123 (controle): ook de bolletjes van een ruit die nu elders staat
      // niet terugzetten; anders had die ruit bolletjes op twee foto's.
      if (doelFoto) doelFoto.markeringen = JSON.parse(JSON.stringify(markeringen))
        .filter(function (m) { return !elders[m.rijId]; });
      if (doelFoto) doelFoto.markeringen = doelFoto.markeringen.concat(vreemd);     // v124
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
    return { weg: overgeslagen.length, verhuisd: Object.keys(vast).length };
  }

  window.blokVooruitLeeg = function () { vooruitPerBlok = {}; };

  // v124: het deel van een momentopname dat bij één tabel hoort, en dat
  // deel in een (andere) momentopname zetten. Voor het herschrijven van de
  // stapel na ↶ in een tabel (zie blokOngedaan).
  function deelVan(fotoId, s) {
    var regels = (s.rijen || []).filter(function (r) { return (r.fotoId || null) === (fotoId || null); });
    var f = fotoId ? (s.fotos || []).find(function (x) { return x.id === fotoId; }) : null;
    return { regels: regels, markeringen: f ? f.markeringen || [] : null,
             diepten: dieptenVan(idsVan(regels), s.info), maat: maatVan(fotoId, s, false) };
  }
  function zetDeelIn(s, fotoId, deel) {
    var eigen = function (r) { return (r.fotoId || null) === (fotoId || null); };
    // v124: een verhuisde ruit (deel.verhuisd) eerst overal uit deze stand;
    // hij komt er hieronder één keer weer in, zoals hij nu is.
    var vast = {};
    (deel.verhuisd || []).forEach(function (v) { vast[v.rij.id] = v; });
    var alle = (s.rijen || []).filter(function (r) { return !vast[r.id]; });
    var anders = alle.filter(function (r) { return !eigen(r); });
    // Een ruit die in déze stand bij een andere tabel staat, blijft daar
    // (zoals in zetRegelsTerug): nooit twee ruiten met hetzelfde nummer.
    var elders = {};
    anders.forEach(function (r) { elders[r.id] = true; });
    var regels = deel.regels.filter(function (r) { return !elders[r.id]; });
    var naarElders = Object.keys(vast).map(function (id) { return vast[id].rij; })
      .filter(function (r) { return !eigen(r); });
    // v124 (review R6): een ruit die in deze stand nog in deze tabel staat,
    // maar nu bij een andere tabel (verhuisd en daarna gewijzigd, ‹Ruiten
    // bewaren›): blijft in deze stand staan zoals hij toen was. Tot nu viel
    // hij eruit (hij zit niet in het deel van nu), en was hij na twee keer
    // Cmd+Z weg uit het project. Alleen een ruit die nu nergens meer is (↶
    // nam hem terug), gaat uit de stand.
    var inDeel = {};
    deel.regels.forEach(function (r) { inDeel[r.id] = true; });
    var blijf = {};
    var blijvend = alle.filter(function (r) {
      if (!eigen(r) || inDeel[r.id] || !(deel.nuIds && deel.nuIds[r.id])) return false;
      blijf[r.id] = true;
      return true;
    });
    var eerste = alle.findIndex(eigen);
    if (eerste < 0) eerste = alle.length;
    var ervoor = alle.slice(0, eerste).filter(function (r) { return !eigen(r); }).length;
    var f = fotoId ? (s.fotos || []).find(function (x) { return x.id === fotoId; }) : null;
    var blijfBollen = f ? JSON.parse(JSON.stringify((f.markeringen || []).filter(function (m) { return blijf[m.rijId]; }))) : [];
    s.rijen = anders.slice(0, ervoor).concat(JSON.parse(JSON.stringify(regels))).concat(blijvend).concat(anders.slice(ervoor))
      .concat(JSON.parse(JSON.stringify(naarElders)));
    var bestaat = {}, waar = {};
    s.rijen.forEach(function (r) { bestaat[r.id] = true; waar[r.id] = r; });
    // De bolletjes van een verhuisde ruit op de andere foto's: zoals nu.
    (s.fotos || []).forEach(function (x) {
      if (!Object.keys(vast).length) return;
      x.markeringen = (x.markeringen || []).filter(function (m) { return !vast[m.rijId]; });
      if (x === f && Array.isArray(deel.markeringen)) return;
      Object.keys(vast).forEach(function (id) {
        x.markeringen = x.markeringen.concat(JSON.parse(JSON.stringify((vast[id].bollen || {})[x.id] || [])));
      });
    });
    if (f && Array.isArray(deel.markeringen)) {
      // v124: ook de bolletjes hier van een ruit die in deze stand bij een
      // andere tabel staat (ruiten verdeeld over tekeningen), tot zijn
      // aantal min wat hij in deze stand op de andere foto's heeft. Tot v124
      // gingen ze weg (dan was het bolletje na Cmd+Z kwijt).
      var ruimte = {};
      var ruimteVan = function (id) {
        if (ruimte[id] !== undefined) return ruimte[id];
        var r = waar[id];
        var n = r ? (parseInt(r.aantal, 10) > 0 ? parseInt(r.aantal, 10) : 1) : 0;
        (s.fotos || []).forEach(function (x) {
          if (x !== f) (x.markeringen || []).forEach(function (m) { if (m.rijId === id) n--; });
        });
        return (ruimte[id] = n);
      };
      f.markeringen = JSON.parse(JSON.stringify(deel.markeringen)).filter(function (m) {
        if (!bestaat[m.rijId] || blijf[m.rijId]) return false;
        if (!elders[m.rijId] || vast[m.rijId]) return true;
        return ruimteVan(m.rijId) > 0 && ruimte[m.rijId]-- > 0;
      }).concat(blijfBollen);     // v124 (R6): hun bolletjes hier zoals toen
    }
    (s.fotos || []).forEach(function (x) {
      x.markeringen = (x.markeringen || []).filter(function (m) { return bestaat[m.rijId]; });
    });
    if (deel.diepten) {
      s.info = s.info || {};
      Object.keys(deel.diepten).forEach(function (id) {
        if (!bestaat[id]) return;
        var leeg = deel.diepten[id].every(function (w) { return w === '' || w == null; });
        var oud = s.info.toebehoren && s.info.toebehoren.perRuit && s.info.toebehoren.perRuit[id];
        if (leeg && !oud) return;
        var t = s.info.toebehoren = s.info.toebehoren || {};
        var pr = t.perRuit = t.perRuit || {};
        var e = pr[id] = pr[id] || {};
        DIEPTE_VELDEN.forEach(function (v, i) {
          var w = deel.diepten[id][i];
          if (w === '' || w == null) delete e[v]; else e[v] = w;
        });
      });
    }
    if (deel.maat) {
      if (fotoId) {
        if (f) {
          if (deel.maat[0] === '') delete f.speling; else f.speling = parseInt(deel.maat[0], 10);
          if (deel.maat[1] === '') delete f.bijtelling; else f.bijtelling = parseInt(deel.maat[1], 10);
        }
      } else {
        s.speling = deel.maat[0];
        s.bijtelling = deel.maat[1];
      }
    }
  }

  // v124 (de fout met de bolletjes, gemeld door Jan): ↶ in een tabel zette
  // alleen deze tabel terug, maar liet de stapel zoals hij was. De stappen
  // erboven hielden de teruggedraaide stand van deze tabel nog vast. Dan
  // kwam hij terug: met Cmd+Z (dat neemt de bovenste stap), en met de
  // volgende ↶ in de tabel zodra er tussendoor iets in de tabel veranderde
  // (een maat getypt). "Hij haalt 1 bolletje weg en zet het bij de tweede
  // klik weer terug." v123 hield alleen bij waar ↶ gebleven was
  // (waarGebleven); dat werkte niet meer na een nieuwe wijziging of met
  // Cmd+Z. Nu krijgen alle stappen boven de gevonden stap het deel van deze
  // tabel zoals het nu terug is: alsof die wijzigingen in deze tabel nooit
  // gebeurd zijn. De andere tabellen blijven in de stapel zoals ze waren.
  window.blokOngedaan = function (id) {
    var fotoId = id === 'los' ? null : id;
    var stapels = window.undoStapels && undoStapels();
    if (!stapels) return;
    // Wat er in een veld van deze tabel nog getypt stond: eerst een eigen
    // stap (in Safari houdt het veld de focus als je op ↶ klikt).
    if (window.undoVeldAfsluiten) undoVeldAfsluiten();
    stapels = undoStapels();
    var nu = rijenInBlok(fotoId);
    var blijftElders = 0;     // v124 (R6): stappen overgeslagen om een ruit die elders blijft

    for (var i = stapels.terug.length - 1; i >= 0; i--) {
      var toen, toenStaat;
      try { toenStaat = JSON.parse(stapels.terug[i].staat); } catch (e) { continue; }
      toen = toenStaat.rijen || [];
      var toenBlok = toen.filter(function (r) { return (r.fotoId || null) === (fotoId || null); });
      var toenFoto = (toenStaat.fotos || []).find(function (f) { return f.id === fotoId; });
      var nuFoto = fotos.find(function (f) { return f.id === fotoId; });
      // v124: ruiten die bij deze stap verhuisden (naar of uit deze tabel) en
      // daarna niet meer veranderden: helemaal terug (zie zetRegelsTerug).
      // Bepaald vóór het terugzetten (de stand van nu).
      var na;
      try { na = i + 1 < stapels.terug.length ? JSON.parse(stapels.terug[i + 1].staat) : null; } catch (e) { na = undefined; }
      var toenOp = {}, naOp = {}, bestondToen = {}, verhuisd = [], heen = [], vastId = {};
      toen.forEach(function (r) { toenOp[r.id] = r; bestondToen[r.id] = true; });
      if (na) (na.rijen || []).forEach(function (r) { naOp[r.id] = r; });
      var isHier = function (r) { return (r.fotoId || null) === (fotoId || null); };
      if (na !== undefined) rijen.forEach(function (r) {
        var t = toenOp[r.id];
        if (!t || isHier(t) === isHier(r)) return;
        // Zijn foto van toen is er niet meer (groep weg, ‹Ruiten bewaren›):
        // daar kan hij niet terug; hij blijft waar hij is.
        if (t.fotoId && !fotos.some(function (f) { return f.id === t.fotoId; })) return;
        if (na && ruitAfdruk(r, fotos) !== ruitAfdruk(naOp[r.id], na.fotos)) return;
        verhuisd.push({ rij: t, bollen: bollenIn(r.id, toenStaat.fotos) });
        heen.push({ rij: JSON.parse(JSON.stringify(r)), bollen: bollenIn(r.id, fotos) });
        vastId[r.id] = true;
      });
      // v124 (review R6): een ruit die toen hier stond en nu elders (of
      // andersom), en daarna nog veranderde, kan met ↶ in deze tabel niet
      // terug (hij blijft waar hij is, zie zetRegelsTerug). Hij telt dan niet
      // mee in de vergelijking: anders bleef ↶ op die stap hangen ("staat
      // intussen bij een andere foto") en kwam je nooit verder terug.
      var nietTerug = {};
      rijen.forEach(function (r) {
        var t = toenOp[r.id];
        if (t && isHier(t) !== isHier(r) && !vastId[r.id]) nietTerug[r.id] = true;
      });
      var zonderNiet = function (l) { return (l || []).filter(function (x) { return !nietTerug[x.rijId != null ? x.rijId : x.id]; }); };
      // Ook alleen de bolletjes tellen als wijziging (v110): "het bolletje
      // weg" uit de strook onder de foto veranderde geen regel, en dan
      // draaide ↶ een oudere wijziging terug in plaats van deze.
      var zelfdeBollen = JSON.stringify(zonderNiet(toenFoto && toenFoto.markeringen)) ===
                         JSON.stringify(zonderNiet(nuFoto && nuFoto.markeringen));
      var ids = idsVan(zonderNiet(nu), zonderNiet(toenBlok));
      var toenDiepte = dieptenVan(ids, toenStaat.info), nuDiepte = dieptenVan(ids, projectInfo);
      var toenMaat = maatVan(fotoId, toenStaat, false), nuMaat = maatVan(fotoId, null, true);
      if (zelfdeRegels(zonderNiet(toenBlok), zonderNiet(nu)) && zelfdeBollen && JSON.stringify(toenDiepte) === JSON.stringify(nuDiepte) &&
          JSON.stringify(toenMaat) === JSON.stringify(nuMaat)) {
        if (Object.keys(nietTerug).length) blijftElders = Math.max(blijftElders, Object.keys(nietTerug).length);
        continue;
      }
      ids = idsVan(nu, toenBlok);
      toenDiepte = dieptenVan(ids, toenStaat.info); nuDiepte = dieptenVan(ids, projectInfo);

      (vooruitPerBlok[id] = vooruitPerBlok[id] || []).push({
        regels: JSON.parse(JSON.stringify(nu)),
        markeringen: nuFoto ? JSON.parse(JSON.stringify(nuFoto.markeringen || [])) : null,
        diepten: nuDiepte,
        maat: nuMaat
      });
      vooruitPerBlok[id][vooruitPerBlok[id].length - 1].heen = heen;
      var uit = { weg: 0, verhuisd: 0 };
      var stilTerug = function () {
        zetDieptenTerug(toenDiepte);
        zetMaat(fotoId, toenMaat);
        uit = zetRegelsTerug(fotoId, toenBlok, toenFoto ? toenFoto.markeringen : null, verhuisd, bestondToen);
      };
      if (window.undoStil) undoStil(stilTerug); else stilTerug();
      var weg = Math.max(uit.weg, blijftElders);
      // De stappen vanaf i: het deel van deze tabel wordt zoals het nu is.
      // v124 (samen met de verhuisde ruiten): een verhuisde ruit staat in
      // twee tabellen; die gaat in elke stap ook helemaal mee zoals hij nu
      // is (regel en bolletjes op elke foto). Anders hield een stap erboven
      // hem nog in de andere tabel, en zette Cmd+Z of ↶ daar de verhuizing
      // weer terug.
      var deel = deelVan(fotoId, { rijen: rijen, fotos: fotos, info: projectInfo,
        speling: (document.getElementById('spelingGlobal') || {}).value || '4',
        bijtelling: (document.getElementById('bijtelling') || {}).value || '11' });
      deel.nuIds = {};
      rijen.forEach(function (r) { deel.nuIds[r.id] = true; });
      deel.verhuisd = verhuisd.map(function (v) {
        var r = rijen.find(function (x) { return x.id === v.rij.id; });
        return r ? { rij: JSON.parse(JSON.stringify(r)), bollen: bollenIn(r.id, fotos) } : null;
      }).filter(Boolean);
      for (var j = i; j < stapels.terug.length; j++) {
        try {
          var s = JSON.parse(stapels.terug[j].staat);
          zetDeelIn(s, fotoId, deel);
          stapels.terug[j].staat = JSON.stringify(s);
        } catch (e) {}
      }
      if (window.undoBlokGedaan) undoBlokGedaan();
      melding(weg ? 'Teruggedraaid; ' + weg + (weg === 1 ? ' ruit staat' : ' ruiten staan') +
                    ' intussen bij een andere foto en ' + (weg === 1 ? 'is' : 'zijn') + ' daar gebleven'
                  : uit.verhuisd ? 'Teruggedraaid; ' + (uit.verhuisd === 1 ? 'de verhuisde ruit staat' : uit.verhuisd + ' verhuisde ruiten staan') +
                    ' weer waar ' + (uit.verhuisd === 1 ? 'hij stond' : 'ze stonden')
                  : 'Laatste wijziging in deze tabel teruggedraaid');
      return;
    }
    melding(blijftElders ? 'Niets meer om terug te draaien in deze tabel; ' + blijftElders +
      (blijftElders === 1 ? ' ruit staat' : ' ruiten staan') + ' intussen bij een andere foto en ' +
      (blijftElders === 1 ? 'blijft' : 'blijven') + ' daar' : 'Niets meer om terug te draaien in deze tabel');
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
    if (window.undoStil) undoStil(function () { zetRegelsTerug(fotoId, terug.regels || terug, terug.markeringen, terug.heen || []); });
    else zetRegelsTerug(fotoId, terug.regels || terug, terug.markeringen, terug.heen || []);
    melding('Opnieuw gedaan');
  };

  function melding(tekst) {
    var s = document.getElementById('statusBar');
    if (s) s.textContent = tekst;
  }
})();
