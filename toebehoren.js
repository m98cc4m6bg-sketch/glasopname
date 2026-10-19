/* toebehoren.js — tabblad "Toebehoren" (v111, wens van Jan, 19-10-2026)
 *
 * Rekent uit wat er naast het glas nodig is: glaslatten (in lengtes van 4 m,
 * met een zaagplan), glasband, glaskit en dubbelzijdige tape voor
 * wienersprossen. Puur voor eigen gebruik: het staat in de PDF invoer (en
 * dus bij "Alles exporteren"), NIET op de bestellijst voor de leverancier.
 *
 * Hoe het rekent (keuzes van Jan):
 * - Een glaslat is zo lang als de sponning (glasmaat + 2 × speling; bij
 *   invoer als sponningmaat precies die maat), plus een toeslag voor het
 *   verstek. Per ruit: boven, links en rechts het standaardtype, onder het
 *   ondertype (vaak een neuslat of ventilatielat). "Latten aan twee kanten"
 *   telt alles dubbel.
 * - Het aantal lengtes komt uit een zaagplan: de latten worden echt over
 *   lengtes van 4 m verdeeld (langste eerst, met een zaagsnede per lat).
 *   Ernaast als controle: de totale lengte + 10 %, gedeeld door 4 m.
 * - Glasband (9 mm): aan beide kanten van het glas één keer de omtrek
 *   (binnen: in de sponning of op de lat; buiten: idem). Kleur en dikte per
 *   kant, per project. Bij een rooster extra 4 × de breedte (2 binnen, 2
 *   buiten).
 * - Glaskit: binnen en buiten de omtrek afkitten, voeg 4 × 5 mm = 20 ml per
 *   meter. De kitkleur volgt de kleur van het band aan die kant.
 * - Wienersprossen-tape: per roede één strook aan elke kant van het glas.
 *   Horizontale roede = glasbreedte, verticale = glashoogte (bij een rooster
 *   min de glasaftrek van het rooster).
 *
 * Alle getallen staan hieronder in INSTELLINGEN, met uitleg. Wijzig ze daar
 * (en zet het versienummer omhoog, zie OVERZICHT.md §8). Per project kun je
 * ze op het tabblad zelf overschrijven om in de praktijk te proberen; dat
 * wordt bij het project bewaard (projectInfo.toebehoren) en staat in de pdf.
 * Ook de keuzes per ruit (onderlat, latten aan twee kanten) staan daar, in
 * projectInfo.toebehoren.perRuit, niet op de ruit zelf (zie perRuitVan).
 */
(function () {
  'use strict';

  /* ═══ INSTELLINGEN (standaardwaarden) ═══════════════════════════ */
  var INSTELLINGEN = {
    STAAF_MM: 4000,                 // lengte van een glaslat zoals je hem koopt
    ZAAGSNEDE_MM: 5,                // wat de zaag per lat wegneemt
    VERSTEK_TOESLAG_MM: 20,         // extra per lat voor het verstek
    CONTROLE_VERLIES_PROCENT: 10,   // controle: totale lengte + dit %, gedeeld door de staaflengte
    BAND_BREEDTE_MM: 9,             // breedte van het glasband (alleen ter info op het scherm en de pdf)
    BAND_ROL_M: 100,                // meters glasband op een rol
    BAND_ROOSTER_FACTOR: 4,         // extra glasband bij een rooster: zoveel × de glasbreedte
    KITVOEG_BREEDTE_MM: 4,          // de kitvoeg: breedte …
    KITVOEG_DIEPTE_MM: 5,           // … × diepte; 4 × 5 = 20 mm² = 20 ml per meter voeg
    KOKER_ML: 290,                  // inhoud van een koker glaskit
    KOKER_BRUIKBAAR_ML: 265,        // wat je er in de praktijk uit krijgt (er blijft altijd een rest)
    TAPE_ROL_M: 25,                 // meters wienersprossen-tape op een rol
    TAPE_STROKEN_PER_KANT: 1        // stroken tape per roede, per kant van het glas
  };
  // Wat er per project ook te kiezen is (keuzelijsten).
  var LATTYPES = ['Glaslat', 'Neuslat', 'Ventilatielat'];
  var KLEUREN = ['wit', 'grijs'];
  var BAND_DIKTES = [2, 3, 4];
  var STANDAARD_PROJECT = {
    latPositie: 'binnen',            // waar de glaslatten zitten (ter info)
    standaardLat: 'Glaslat',         // boven, links en rechts
    standaardOnderlat: 'Neuslat',    // onder, tenzij per ruit anders
    binnen: { kleur: 'wit', dikte: 3 },
    buiten: { kleur: 'wit', dikte: 3 }
  };
  // Uitleg per instelling, voor het scherm en de pdf.
  var UITLEG = {
    STAAF_MM: ['Lengte glaslat', 'mm'],
    ZAAGSNEDE_MM: ['Zaagsnede per lat', 'mm'],
    VERSTEK_TOESLAG_MM: ['Toeslag verstek per lat', 'mm'],
    CONTROLE_VERLIES_PROCENT: ['Zaagverlies (controle)', '%'],
    BAND_ROL_M: ['Glasband per rol', 'm'],
    BAND_ROOSTER_FACTOR: ['Extra band bij rooster', '× breedte'],
    KITVOEG_BREEDTE_MM: ['Kitvoeg breedte', 'mm'],
    KITVOEG_DIEPTE_MM: ['Kitvoeg diepte', 'mm'],
    KOKER_ML: ['Inhoud koker', 'ml'],
    KOKER_BRUIKBAAR_ML: ['Bruikbaar per koker', 'ml'],
    TAPE_ROL_M: ['Tape per rol', 'm'],
    TAPE_STROKEN_PER_KANT: ['Tape: stroken per kant', '']
  };
  /* ═══════════════════════════════════════════════════════════════ */

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function getal(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  // Een getal zoals iemand het typt: "4,5" en "4.5" = 4,5; "4.000" = 4000
  // (punt als duizendtal, zoals de app het zelf toont); anders null.
  function leesGetal(t) {
    t = String(t).replace(/\s/g, '');
    if (!/^\d[\d.,]*$/.test(t)) return null;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    var n = Number(t);
    return isFinite(n) ? n : null;
  }
  function aantalVan(r) { var n = parseInt(r && r.aantal, 10); return n > 0 ? n : 1; }
  function heeftInhoud(r) { return !!(r && (r.merk || r.breedte || r.hoogte || r.glasType)); }
  function nl(n, d) { return Number(n).toLocaleString('nl-NL', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  // Een instelling tonen zoals Jan hem intypte: 5 blijft "5", 4,5 blijft "4,5" (v111; "5,0 mm" las als een andere waarde).
  function nlWaarde(n) { return Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 2 }); }

  // De instellingen van dit project: de standaard, met wat er per project
  // anders is gezet. Alleen de afwijkingen worden bewaard.
  // Waarden waardoor gedeeld wordt (of die een kitvoeg maken): groter dan 0.
  var DELERS = ['STAAF_MM', 'BAND_ROL_M', 'KOKER_ML', 'KOKER_BRUIKBAAR_ML', 'TAPE_ROL_M', 'KITVOEG_BREEDTE_MM', 'KITVOEG_DIEPTE_MM'];
  function projectDeel() {
    var p = (typeof projectInfo === 'object' && projectInfo && projectInfo.toebehoren) || {};
    return p;
  }
  // De keuzes per ruit (onderlat, latten aan twee kanten) staan NIET op de
  // ruit zelf maar hier, onder het id van de ruit (v111, uit de controle):
  // een wijziging op de ruit geeft hem een nieuw stempel (gewOp), en dan
  // werkte na een bestelling de vraag "Oudere stand?" niet meer en noemde
  // het logboek de ruit "gewijzigd". Toebehoren gaat niet naar de
  // leverancier en hoort de ruit dus niet te raken.
  function perRuitVan(r) {
    var p = projectDeel().perRuit;
    return (p && r && p[r.id]) || {};
  }
  function instellingen() {
    var p = projectDeel();
    var w = {}, afwijkend = {};
    Object.keys(INSTELLINGEN).forEach(function (k) {
      var v = p.afwijkingen && getal(p.afwijkingen[k]);
      // Een lengte of inhoud waardoor gedeeld wordt, moet groter dan 0 zijn
      // (een staaf van 0 mm gaf "oneindig veel lengtes"); de rest mag 0.
      var minimaal = DELERS.indexOf(k) >= 0 ? v > 0 : v >= 0;
      if (v != null && minimaal && v !== INSTELLINGEN[k]) { w[k] = v; afwijkend[k] = true; } else w[k] = INSTELLINGEN[k];
    });
    var keuze = {};
    ['latPositie', 'standaardLat', 'standaardOnderlat'].forEach(function (k) {
      keuze[k] = p[k] != null ? p[k] : STANDAARD_PROJECT[k];
    });
    ['binnen', 'buiten'].forEach(function (kant) {
      var b = p[kant] || {};
      keuze[kant] = { kleur: b.kleur || STANDAARD_PROJECT[kant].kleur,
                      dikte: getal(b.dikte) || STANDAARD_PROJECT[kant].dikte };
    });
    return { getallen: w, afwijkend: afwijkend, keuze: keuze };
  }

  /* ─── rekenen ────────────────────────────────────────────────── */

  // De sponningmaat van een ruit: daar ligt de lat in. Ingevoerd als
  // sponningmaat: precies die maat. Anders: glasmaat + 2 × speling.
  function sponning(r) {
    var gb = getal(r.glasBreedte), gh = getal(r.glasHoogte);
    if (!(gb > 0) || !(gh > 0)) return null;
    if (r.maatsoort === 'Sponningmaat' && getal(r.breedte) > 0 && getal(r.hoogte) > 0) {
      return { b: getal(r.breedte), h: getal(r.hoogte) };
    }
    var s = typeof spelingVoor === 'function' ? (parseInt(spelingVoor(r), 10) || 0) : 0;
    return { b: gb + 2 * s, h: gh + 2 * s };
  }

  // Roeden uit de keuze "Wienersprossen - 2H x 2V (raster)" e.d.:
  // { h: horizontale roeden, v: verticale } of 'zelf' / null.
  function roeden(r) {
    var v = String(r.roedenverdeling || '');
    if (!v || /^Geen/.test(v)) return null;
    if (/^Kruisroeden in glas/i.test(v)) return null;        // in de spouw: geen tape
    if (!/^Wienersprossen/i.test(v)) return 'zelf';          // Overig
    if (/opgeven/i.test(v)) return 'zelf';
    var m = v.match(/(\d+)\s*H\s*x\s*(\d+)\s*V/i);
    if (m) return { h: +m[1], v: +m[2] };
    if (/kruising/i.test(v)) return { h: 1, v: 1 };
    m = v.match(/(\d+)\s*horizontaal/i); if (m) return { h: +m[1], v: 0 };
    m = v.match(/(\d+)\s*verticaal/i); if (m) return { h: 0, v: +m[1] };
    return 'zelf';
  }

  // Glasaftrek van een rooster (staat in de beschrijving: "glasaftrek 80 mm").
  function roosterAftrek(r) {
    if (r.rooster !== 'Ja' || !r.ducoType || typeof DATA === 'undefined') return 0;
    var info = (DATA.roosters || []).find(function (x) { return x.naam === r.ducoType; });
    var m = info && String(info.beschrijving || '').match(/glasaftrek\s+(\d+)\s*mm/i);
    return m ? +m[1] : 0;
  }

  // Zaagplan: de latten (langste eerst) in de eerste lengte waar ze nog in
  // passen, met een zaagsnede per lat. Een lat langer dan de staaf past
  // nergens en wordt apart genoemd.
  function zaagplan(stukken, staaf, snede) {
    var staven = [], teLang = [];
    stukken.slice().sort(function (a, b) { return b - a; }).forEach(function (l) {
      if (l > staaf) { teLang.push(l); return; }
      var nodig = l + snede;
      for (var i = 0; i < staven.length; i++) {
        if (staven[i].rest >= l) {     // de laatste snede mag op het eind vallen
          staven[i].stukken.push(l);
          staven[i].rest -= nodig;
          return;
        }
      }
      staven.push({ stukken: [l], rest: staaf - nodig });
    });
    return { staven: staven, teLang: teLang };
  }

  function bereken(lijst) {
    var ins = instellingen();
    var g = ins.getallen, k = ins.keuze;
    var mlPerM = g.KITVOEG_BREEDTE_MM * g.KITVOEG_DIEPTE_MM;   // mm² = ml per meter
    var latStukken = {};          // type → [lengtes]
    var band = {}, kit = {};      // "wit|3" → m; "wit" → ml
    var tapeM = 0, tapeZelf = [], zonderMaat = [], perRuit = [];
    function lat(type, lengte, n) {
      if (!latStukken[type]) latStukken[type] = [];
      for (var i = 0; i < n; i++) latStukken[type].push(Math.round(lengte));
    }
    (lijst || []).filter(heeftInhoud).forEach(function (r) {
      var n = aantalVan(r);
      var sp = sponning(r);
      if (!sp) { zonderMaat.push(r.merk || '(zonder merk)'); return; }
      var eigen = perRuitVan(r);
      var dubbel = eigen.tweeKanten ? 2 : 1;
      var onder = eigen.onderlat || k.standaardOnderlat || k.standaardLat;
      var t = g.VERSTEK_TOESLAG_MM;
      lat(k.standaardLat, sp.b + t, n * dubbel);             // boven
      lat(k.standaardLat, sp.h + t, 2 * n * dubbel);         // links en rechts
      lat(onder, sp.b + t, n * dubbel);                      // onder
      var latMm = ((sp.b + t) * 2 + (sp.h + t) * 2) * n * dubbel;
      // Band en kit: aan elke kant één keer de omtrek van het glas.
      // Als getal: een glasmaat als tekst ("1022") werd anders aan elkaar geplakt.
      var gb = getal(r.glasBreedte), gh = getal(r.glasHoogte);
      var omtrekM = 2 * (gb + gh) / 1000;
      var roosterM = r.rooster === 'Ja' ? g.BAND_ROOSTER_FACTOR * gb / 1000 / 2 : 0;
      var bandM = 0, kitMl = 0;
      ['binnen', 'buiten'].forEach(function (kant) {
        var c = k[kant];
        var m = (omtrekM + roosterM) * n;
        band[c.kleur + '|' + c.dikte] = (band[c.kleur + '|' + c.dikte] || 0) + m;
        bandM += m;
        var ml = omtrekM * n * mlPerM;
        kit[c.kleur] = (kit[c.kleur] || 0) + ml;
        kitMl += ml;
      });
      // Wienersprossen-tape.
      var ro = roeden(r), ruitTape = 0;
      if (ro === 'zelf') tapeZelf.push(r.merk || '(zonder merk)');
      else if (ro) {
        var hoog = Math.max(0, gh - roosterAftrek(r));
        ruitTape = (ro.h * gb + ro.v * hoog) / 1000 * 2 * g.TAPE_STROKEN_PER_KANT * n;
        tapeM += ruitTape;
      }
      perRuit.push({ rij: r, n: n, sponning: sp, onderlat: onder, eigenOnderlat: !!eigen.onderlat, tweeKanten: !!eigen.tweeKanten,
                     latM: latMm / 1000, bandM: bandM, kitMl: kitMl, tapeM: ruitTape, roeden: ro });
    });
    var latten = Object.keys(latStukken).map(function (type) {
      var st = latStukken[type];
      var totaal = st.reduce(function (a, b) { return a + b; }, 0);
      var plan = zaagplan(st, g.STAAF_MM, g.ZAAGSNEDE_MM);
      var controle = Math.ceil(totaal * (1 + g.CONTROLE_VERLIES_PROCENT / 100) / g.STAAF_MM);
      // Waar deze latten zitten, voor de tekst onder het totaal (v111): "(boven en
      // zijkanten)" klopte niet als de onderlat hetzelfde type is.
      var alsOnder = perRuit.filter(function (p) { return p.onderlat === type; }).length;
      var rol = type !== k.standaardLat ? 'onder' : alsOnder === perRuit.length ? 'rondom' :
        alsOnder ? 'boven en zijkanten, en onder waar gekozen' : 'boven en zijkanten';
      return { type: type, rol: rol, stukken: st.length, totaalMm: totaal, staven: plan.staven.length, plan: plan.staven,
               teLang: plan.teLang, controle: controle };
    }).sort(function (a, b) {
      return (a.type === k.standaardLat ? 0 : 1) - (b.type === k.standaardLat ? 0 : 1) || a.type.localeCompare(b.type, 'nl');
    });
    var bandLijst = Object.keys(band).map(function (sleutel) {
      var d = sleutel.split('|');
      return { kleur: d[0], dikte: +d[1], meters: band[sleutel], rollen: Math.ceil(band[sleutel] / g.BAND_ROL_M - 1e-9) };
    });
    var kitLijst = Object.keys(kit).map(function (kleur) {
      return { kleur: kleur, ml: kit[kleur], kokers: Math.ceil(kit[kleur] / g.KOKER_BRUIKBAAR_ML - 1e-9) };
    });
    return {
      instellingen: ins, mlPerM: mlPerM, latten: latten, band: bandLijst, kit: kitLijst,
      tape: { meters: tapeM, rollen: tapeM ? Math.ceil(tapeM / g.TAPE_ROL_M - 1e-9) : 0, zelf: tapeZelf },
      zonderMaat: zonderMaat, perRuit: perRuit,
      metRooster: perRuit.some(function (p) { return p.rij.rooster === 'Ja'; })
    };
  }
  window.toebehorenBerekenen = function () { return bereken(typeof rijen === 'undefined' ? [] : rijen); };
  window.toebehorenInstellingen = function () { return { standaard: INSTELLINGEN, uitleg: UITLEG }; };

  // De rekenregel onder een totaal, in gewone woorden (zodat je het kunt
  // narekenen). Ook voor de pdf.
  window.toebehorenUitleg = function (u) {
    var g = u.instellingen.getallen;
    var regels = {};
    u.latten.forEach(function (l) {
      regels['lat:' + l.type] = l.stukken + ' latten, samen ' + nl(l.totaalMm / 1000, 1) + ' m (incl. ' + g.VERSTEK_TOESLAG_MM +
        ' mm verstek per lat); zaagplan met ' + g.ZAAGSNEDE_MM + ' mm per zaagsnede → ' + l.staven + ' × ' + nl(g.STAAF_MM / 1000, 1) +
        ' m. Controle: ' + nl(l.totaalMm / 1000, 1) + ' m + ' + g.CONTROLE_VERLIES_PROCENT + ' % = ' +
        nl(l.totaalMm / 1000 * (1 + g.CONTROLE_VERLIES_PROCENT / 100), 1) + ' m → ' + l.controle + (l.controle === 1 ? ' lengte.' : ' lengtes.');
    });
    u.band.forEach(function (b) {
      regels['band:' + b.kleur + '|' + b.dikte] = nl(b.meters, 1) + ' m (omtrek van elke ruit aan deze kant' +
        (g.BAND_ROOSTER_FACTOR && u.metRooster ? ', plus bij een rooster ' + nlWaarde(g.BAND_ROOSTER_FACTOR / 2) +
        ' × de breedte; binnen en buiten samen ' + nlWaarde(g.BAND_ROOSTER_FACTOR) + ' ×' : '') +
        ') ÷ ' + g.BAND_ROL_M + ' m per rol → ' + b.rollen + (b.rollen === 1 ? ' rol' : ' rollen') + '.';
    });
    u.kit.forEach(function (c) {
      regels['kit:' + c.kleur] = nl(c.ml / u.mlPerM, 1) + ' m voeg × ' + u.mlPerM + ' ml/m (' + g.KITVOEG_BREEDTE_MM + ' × ' +
        g.KITVOEG_DIEPTE_MM + ' mm) = ' + nl(c.ml) + ' ml ÷ ' + g.KOKER_BRUIKBAAR_ML + ' ml bruikbaar per koker → ' + c.kokers +
        (c.kokers === 1 ? ' koker.' : ' kokers.');
    });
    regels.tape = nl(u.tape.meters, 1) + ' m (elke roede ' + g.TAPE_STROKEN_PER_KANT + '× aan elke kant van het glas) ÷ ' +
      g.TAPE_ROL_M + ' m per rol → ' + u.tape.rollen + (u.tape.rollen === 1 ? ' rol.' : ' rollen.');
    return regels;
  };

  /* ─── wijzigen ───────────────────────────────────────────────── */

  // Toebehoren gaat niet naar de leverancier: het mag ook na een bestelling
  // nog veranderen (geen slotWeigert). Wie alleen meekijkt, kan het niet.
  function magNiet() { return window.kijkWeigert ? kijkWeigert() : false; }
  function bewaarEnTeken(stap) {
    if (typeof opslaan === 'function') opslaan();
    renderToebehoren();
  }
  function deelVoorWijzigen() {
    if (typeof projectInfo !== 'object' || !projectInfo) return null;
    if (!projectInfo.toebehoren || typeof projectInfo.toebehoren !== 'object') projectInfo.toebehoren = {};
    return projectInfo.toebehoren;
  }

  window.toebehorenKeuze = function (veld, waarde) {
    if (magNiet()) { renderToebehoren(); return; }
    var p = deelVoorWijzigen(); if (!p) return;
    if (window.bewaarStap) bewaarStap('Toebehoren: ' + veld);
    var d = veld.split('.');
    if (d.length === 2) {
      p[d[0]] = Object.assign({}, p[d[0]] || {});
      p[d[0]][d[1]] = d[1] === 'dikte' ? (parseInt(waarde, 10) || STANDAARD_PROJECT[d[0]].dikte) : waarde;
    } else p[veld] = waarde;
    bewaarEnTeken();
  };

  window.toebehorenGetal = function (sleutel, waarde) {
    if (magNiet()) { renderToebehoren(); return; }
    if (!(sleutel in INSTELLINGEN)) return;
    var p = deelVoorWijzigen(); if (!p) return;
    var tekst = String(waarde == null ? '' : waarde).trim();
    var n = tekst === '' ? null : leesGetal(tekst);
    // Iets wat geen getal is (bijv. "abc"): niets veranderen, het vak terugzetten.
    // Ook 0 bij een lengte of inhoud (daar wordt door gedeeld): dan ook niets.
    if (tekst !== '' && (n == null || (n === 0 && DELERS.indexOf(sleutel) >= 0))) { renderToebehoren(); return; }
    if (window.bewaarStap) bewaarStap('Toebehoren: ' + sleutel);
    p.afwijkingen = Object.assign({}, p.afwijkingen || {});
    if (n == null || n === INSTELLINGEN[sleutel]) delete p.afwijkingen[sleutel];
    else p.afwijkingen[sleutel] = n;
    bewaarEnTeken();
  };

  window.toebehorenStandaard = function () {
    if (magNiet()) return;
    var p = deelVoorWijzigen(); if (!p || !p.afwijkingen) return;
    if (window.bewaarStap) bewaarStap('Toebehoren: terug naar standaard');
    delete p.afwijkingen;
    bewaarEnTeken();
  };

  // Per ruit: het type van de onderlat ('' = de standaard van het project),
  // en latten aan twee kanten. Niet in het kenmerk van de bestelling.
  // Eén keuze per ruit zetten of weghalen; een lege ruit-ingang ruimen we op.
  function zetPerRuit(p, id, veld, waarde) {
    p.perRuit = Object.assign({}, p.perRuit || {});
    var e = Object.assign({}, p.perRuit[id] || {});
    if (waarde) e[veld] = waarde; else delete e[veld];
    if (Object.keys(e).length) p.perRuit[id] = e; else delete p.perRuit[id];
    if (!Object.keys(p.perRuit).length) delete p.perRuit;
  }
  window.toebehorenOnderlat = function (id, waarde) {
    if (magNiet()) { renderToebehoren(); return; }
    var r = typeof getRij === 'function' ? getRij(id) : null; if (!r) return;
    var p = deelVoorWijzigen(); if (!p) return;
    if (window.bewaarStap) bewaarStap('Onderlat ' + (r.merk || ''));
    zetPerRuit(p, r.id, 'onderlat', LATTYPES.indexOf(waarde) >= 0 ? waarde : '');
    bewaarEnTeken();
  };
  window.toebehorenTweeKanten = function (id, aan) {
    if (magNiet()) { renderToebehoren(); return; }
    var r = typeof getRij === 'function' ? getRij(id) : null; if (!r) return;
    var p = deelVoorWijzigen(); if (!p) return;
    if (window.bewaarStap) bewaarStap('Latten twee kanten ' + (r.merk || ''));
    zetPerRuit(p, r.id, 'tweeKanten', aan ? true : '');
    bewaarEnTeken();
  };
  // Alle ruiten in één keer dezelfde onderlat (of terug naar de standaard).
  window.toebehorenAlleOnderlat = function () {
    if (magNiet()) return;
    var keuze = el('tbAlleOnderlat'); if (!keuze) return;
    var p = deelVoorWijzigen(); if (!p) return;
    if (window.bewaarStap) bewaarStap('Onderlat alle ruiten');
    var w = LATTYPES.indexOf(keuze.value) >= 0 ? keuze.value : '';
    (rijen || []).filter(heeftInhoud).forEach(function (r) { zetPerRuit(p, r.id, 'onderlat', w); });
    bewaarEnTeken();
  };

  /* ─── tekenen ────────────────────────────────────────────────── */

  var openInstellingen = false;
  window.toebehorenInstellingenKlap = function () { openInstellingen = !openInstellingen; renderToebehoren(); };

  function keuzeLijst(waarden, gekozen, attrs) {
    return '<select ' + attrs + '>' + waarden.map(function (w) {
      var v = Array.isArray(w) ? w[0] : w, t = Array.isArray(w) ? w[1] : w;
      return '<option value="' + esc(v) + '"' + (String(v) === String(gekozen) ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('') + '</select>';
  }
  function kleurNaam(c) { return c.charAt(0).toUpperCase() + c.slice(1); }

  function renderToebehoren() {
    var vak = el('toebehorenInhoud');
    if (!vak) return;
    var u = bereken(typeof rijen === 'undefined' ? [] : rijen);
    var regel = window.toebehorenUitleg(u);
    var g = u.instellingen.getallen, k = u.instellingen.keuze, afw = u.instellingen.afwijkend;
    var kijken = !!(window.glasAlleenKijken && glasAlleenKijken());
    var uit = kijken ? ' disabled' : '';
    var h = [];
    if (!u.perRuit.length && !u.zonderMaat.length) {
      vak.innerHTML = '<em style="color:var(--grijs-tekst)">Vul eerst ruiten in op het tabblad Invoer.</em>';
      return;
    }
    if (u.zonderMaat.length) {
      h.push('<div class="tb-strook">⚠ ' + u.zonderMaat.length + (u.zonderMaat.length === 1 ? ' ruit heeft' : ' ruiten hebben') +
        ' nog geen glasmaat en ' + (u.zonderMaat.length === 1 ? 'telt' : 'tellen') + ' niet mee: ' +
        esc(u.zonderMaat.slice(0, 12).join(', ')) + (u.zonderMaat.length > 12 ? ' …' : '') + '.</div>');
    }
    // Totalen
    h.push('<div class="tb-totalen">');
    u.latten.forEach(function (l) {
      h.push('<div class="tb-blok"><div class="tb-getal">' + l.staven + ' × ' + nl(g.STAAF_MM / 1000, 1) + ' m</div>' +
        '<div class="tb-wat">' + esc(l.type) + ' (' + esc(l.rol) + ')</div>' +
        (l.teLang.length ? '<div class="tb-let">⚠ ' + l.teLang.length + ' lat langer dan ' + nl(g.STAAF_MM / 1000, 1) +
          ' m (' + l.teLang.map(function (x) { return nl(x); }).join(', ') + ' mm): apart bestellen</div>' : '') +
        '<div class="tb-reken">' + esc(regel['lat:' + l.type]) + '</div></div>');
    });
    u.band.forEach(function (b) {
      h.push('<div class="tb-blok"><div class="tb-getal">' + nl(b.meters, 1) + ' m</div>' +
        '<div class="tb-wat">Glasband ' + esc(b.kleur) + ' ' + b.dikte + ' mm (' + g.BAND_BREEDTE_MM + ' mm breed) · ' + b.rollen +
        (b.rollen === 1 ? ' rol' : ' rollen') + '</div><div class="tb-reken">' + esc(regel['band:' + b.kleur + '|' + b.dikte]) + '</div></div>');
    });
    u.kit.forEach(function (c) {
      h.push('<div class="tb-blok"><div class="tb-getal">' + c.kokers + (c.kokers === 1 ? ' koker' : ' kokers') + '</div>' +
        '<div class="tb-wat">Glaskit ' + esc(c.kleur) + ' (' + g.KOKER_ML + ' ml)</div><div class="tb-reken">' +
        esc(regel['kit:' + c.kleur]) + '</div></div>');
    });
    if (u.tape.meters || u.tape.zelf.length) {
      h.push('<div class="tb-blok"><div class="tb-getal">' + nl(u.tape.meters, 1) + ' m</div>' +
        '<div class="tb-wat">Wienersprossen-tape (dubbelzijdig) · ' + u.tape.rollen + (u.tape.rollen === 1 ? ' rol' : ' rollen') + '</div>' +
        (u.tape.zelf.length ? '<div class="tb-let">⚠ Zelf uitrekenen (roeden "opgeven" of "Overig"): ' +
          esc(u.tape.zelf.join(', ')) + '</div>' : '') +
        '<div class="tb-reken">' + esc(regel.tape) + '</div></div>');
    }
    h.push('</div>');
    // Instellingen
    var nAfw = Object.keys(afw).length;
    h.push('<div class="tb-inst-kop' + (nAfw ? ' afwijkend' : '') + '" onclick="toebehorenInstellingenKlap()">' +
      (openInstellingen ? '▾ ' : '▸ ') + (nAfw ? 'Gerekend met ' + nAfw + (nAfw === 1 ? ' afwijkende waarde' : ' afwijkende waarden') +
      ': ' + Object.keys(afw).map(function (s) { return esc(UITLEG[s][0].toLowerCase()) + ' ' + nlWaarde(g[s]) + ' ' + esc(UITLEG[s][1]); }).join(', ')
      : 'Gerekend met de standaardwaarden') + ' — instellingen voor dit project</div>');
    if (openInstellingen) {
      h.push('<div class="tb-inst">');
      h.push('<div class="tb-keuzes">' +
        '<label>Glaslatten zitten ' + keuzeLijst([['binnen', 'binnen'], ['buiten', 'buiten']], k.latPositie,
          'onchange="toebehorenKeuze(\'latPositie\', this.value)"' + uit) + '</label>' +
        '<label>Standaardlat ' + keuzeLijst(LATTYPES, k.standaardLat, 'onchange="toebehorenKeuze(\'standaardLat\', this.value)"' + uit) + '</label>' +
        '<label>Onderlat (standaard) ' + keuzeLijst([['', 'zelfde als standaardlat']].concat(LATTYPES), k.standaardOnderlat,
          'onchange="toebehorenKeuze(\'standaardOnderlat\', this.value)"' + uit) + '</label>' +
        ['binnen', 'buiten'].map(function (kant) {
          return '<label>' + kleurNaam(kant) + ': band en kit <span class="tb-paar">' +
            keuzeLijst(KLEUREN, k[kant].kleur, 'onchange="toebehorenKeuze(\'' + kant + '.kleur\', this.value)"' + uit) + ' ' +
            keuzeLijst(BAND_DIKTES.map(function (d) { return [d, d + ' mm']; }), k[kant].dikte,
              'onchange="toebehorenKeuze(\'' + kant + '.dikte\', this.value)"' + uit) + '</span></label>';
        }).join('') + '</div>');
      h.push('<div class="tb-getallen">' + Object.keys(UITLEG).map(function (s) {
        return '<label class="' + (afw[s] ? 'afwijkend' : '') + '">' + esc(UITLEG[s][0]) +
          // type="text": een komma ("4,5") gaf in een getalvak op de Mac een lege waarde, en leeg = terug naar standaard (v111).
          '<span><input type="text" inputmode="decimal" value="' + esc(String(g[s]).replace('.', ',')) + '"' +
          ' onchange="toebehorenGetal(\'' + s + '\', this.value)"' + uit + '> ' + esc(UITLEG[s][1]) + '</span>' +
          (afw[s] ? '<small>standaard: ' + nlWaarde(INSTELLINGEN[s]) + ' <button class="btn btn-ghost btn-sm" onclick="toebehorenGetal(\'' + s +
            '\', \'\')"' + uit + '>↺</button></small>' : '') + '</label>';
      }).join('') + '</div>');
      if (nAfw) h.push('<button class="btn btn-secondary btn-sm" onclick="toebehorenStandaard()"' + uit + '>Alles terug naar standaard</button>');
      h.push('<div class="tb-noot">De standaardwaarden staan bovenin <code>toebehoren.js</code>. Wat je hier verandert, geldt alleen voor dit project.</div>');
      h.push('</div>');
    }
    // Per ruit
    h.push('<div class="tb-perruit-kop"><h3>Per ruit</h3><span>Onderlat voor alle ruiten: ' +
      keuzeLijst([['', 'standaard (' + (k.standaardOnderlat || k.standaardLat) + ')']].concat(LATTYPES), '', 'id="tbAlleOnderlat"' + uit) +
      ' <button class="btn btn-ghost btn-sm" onclick="toebehorenAlleOnderlat()"' + uit + '>Toepassen</button></span></div>');
    h.push('<div class="invoer-wrap"><table class="samenvatting tb-tabel"><thead><tr>' +
      '<th>Merk</th><th class="num">Aantal</th><th class="num">Sponning (mm)</th><th>Onderlat</th><th>Latten 2 kanten</th>' +
      '<th class="num">Latten (m)</th><th class="num">Band (m)</th><th class="num">Kit (ml)</th><th class="num">Tape (m)</th>' +
      '</tr></thead><tbody>' + u.perRuit.map(function (p) {
        var r = p.rij;
        return '<tr><td>' + esc(r.merk || '—') + '</td><td class="num">' + p.n + '</td><td class="num">' + nl(p.sponning.b) + ' × ' +
          nl(p.sponning.h) + '</td><td>' + keuzeLijst([['', 'standaard (' + (k.standaardOnderlat || k.standaardLat) + ')']].concat(LATTYPES),
            p.eigenOnderlat ? p.onderlat : '', 'class="tb-onderlat" onchange="toebehorenOnderlat(' + r.id + ', this.value)"' + uit) + '</td>' +
          '<td><input type="checkbox" class="tb-tweekanten"' + (p.tweeKanten ? ' checked' : '') + ' onchange="toebehorenTweeKanten(' +
            r.id + ', this.checked)"' + uit + '></td>' +
          '<td class="num">' + nl(p.latM, 1) + '</td><td class="num">' + nl(p.bandM, 1) + '</td><td class="num">' + nl(p.kitMl) + '</td>' +
          '<td class="num">' + (p.roeden === 'zelf' ? 'zelf' : p.tapeM ? nl(p.tapeM, 1) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>');
    h.push('<div class="tb-noot">Alleen voor eigen gebruik: dit staat in de PDF invoer (en bij Alles exporteren), niet op de bestellijst.</div>');
    vak.innerHTML = h.join('');
  }
  window.renderToebehoren = renderToebehoren;
})();
