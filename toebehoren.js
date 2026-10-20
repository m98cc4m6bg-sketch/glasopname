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
    KOKER_ML: 290,                  // inhoud van een koker glaskit; alles is bruikbaar (Jan, v112)
    TAPE_ROL_M: 25,                 // meters wienersprossen-tape op een rol
    TAPE_STROKEN_PER_KANT: 1        // stroken tape per roede, per kant van het glas
  };
  // Wat er per project ook te kiezen is (keuzelijsten).
  // v113: de latten zijn de typen van Jongeneel (latten.js). 'NEUS' = de
  // kleinste neuslat die past (de app rekent hem uit met de sponningdiepte).
  var KLEUREN = ['wit', 'grijs'];
  var BAND_DIKTES = [2, 3, 4];          // binnen
  var BAND_DIKTES_BUITEN = [3, 4];      // buiten nooit 2 mm (Jan, v113: "werking")
  var STANDAARD_PROJECT = {
    latPositie: 'binnen',            // waar de glaslatten zitten (ter info)
    standaardLat: 'A4',              // boven, links en rechts (per ruit anders te kiezen op Invoer)
    standaardOnderlat: 'NEUS',       // onder, tenzij per ruit anders
    binnen: { kleur: 'wit', dikte: 3 },
    buiten: { kleur: 'wit', dikte: 3 }
  };
  function GL() { return window.GlasLatten || null; }
  function latNaam(id) {
    if (id === 'NEUS') return 'Neuslat, maat nog onbekend';
    var l = GL() && GL().latVan(id);
    return l ? l.naam : String(id || '');
  }
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
  var DELERS = ['STAAF_MM', 'BAND_ROL_M', 'KOKER_ML', 'TAPE_ROL_M', 'KITVOEG_BREEDTE_MM', 'KITVOEG_DIEPTE_MM'];
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
  // Een onderlat uit v111/v112: 'Glaslat' betekende daar "dezelfde lat als
  // boven" (controle v113), dus '' (zelfde); 'Neuslat' → 'NEUS'; 'Ventilatielat' → C1.
  function onderNaam(w) {
    if (w === 'Glaslat') return '';
    return GL() ? GL().normaal(w) : w;
  }
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
    // Namen uit v111/v112 ('Glaslat', 'Neuslat', 'Ventilatielat') → een type.
    // Een standaardlat moet een lat voor boven zijn (een oude 'Ventilatielat'
    // werd C1, en die hoort onderin): anders A4.
    if (GL()) {
      keuze.standaardLat = GL().normaal(keuze.standaardLat);
      if (!geldigeLat(keuze.standaardLat, 'boven')) keuze.standaardLat = STANDAARD_PROJECT.standaardLat;
      if (keuze.standaardOnderlat) keuze.standaardOnderlat = onderNaam(keuze.standaardOnderlat);
    }
    ['binnen', 'buiten'].forEach(function (kant) {
      var b = p[kant] || {};
      var d = getal(b.dikte) || STANDAARD_PROJECT[kant].dikte;
      if (kant === 'buiten' && BAND_DIKTES_BUITEN.indexOf(d) < 0) d = 3;   // een oude 2 telt als 3
      keuze[kant] = { kleur: b.kleur || STANDAARD_PROJECT[kant].kleur, dikte: d };
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
    var latRol = {};              // type → { rond: aantal ruiten, onder: aantal ruiten }
    var band = {}, kit = {};      // "wit|3" → m; "wit" → ml
    var tapeM = 0, tapeZelf = [], zonderMaat = [], perRuit = [];
    // rol: 'rond' (boven en zijkanten), 'onder' (de onderlat) of 'binnen'
    // (onderin aan de andere kant, bij latten aan twee kanten). ruiten: hoeveel
    // ruitkanten dit telt, voor de tekst "rondom" of "boven en zijkanten".
    function lat(type, lengte, n, rol, ruiten) {
      if (!latStukken[type]) latStukken[type] = [];
      for (var i = 0; i < n; i++) latStukken[type].push(Math.round(lengte));
      latRol[type] = latRol[type] || { rond: 0, onder: 0, binnen: 0 };
      latRol[type][rol] += ruiten;
    }
    (lijst || []).filter(heeftInhoud).forEach(function (r) {
      var n = aantalVan(r);
      var sp = sponning(r);
      if (!sp) { zonderMaat.push(r.merk || '(zonder merk)'); return; }
      var eigen = perRuitVan(r);
      var dubbel = eigen.tweeKanten ? 2 : 1;
      // v113: de lat van deze ruit (Invoer) of de projectstandaard.
      var boven = GL() ? GL().latVoorRuit(r).id : k.standaardLat;
      var onderKeuze = onderNaam(eigen.onderlat) || k.standaardOnderlat || boven;
      var onder = onderKeuze, neus = null;
      if (onderKeuze === 'NEUS') {
        // De kleinste neuslat die past bij deze sponning (zonder sponningdiepte: onbekend).
        neus = GL() ? GL().neuslatVoor(r) : { lat: null };
        onder = neus.lat ? neus.lat.id : 'NEUS';
      }
      var t = g.VERSTEK_TOESLAG_MM;
      lat(boven, sp.b + t, n * dubbel, 'rond', n * dubbel);   // boven
      lat(boven, sp.h + t, 2 * n * dubbel, 'rond', 0);        // links en rechts
      // Onder: de onderlat (neuslat, ventilatielat) hoort bij de glaskant,
      // dus één keer. Bij latten aan twee kanten komt aan de andere kant
      // onderin een gewone lat, net als boven (v113; tot v112 kwamen er dan
      // twee neuslatten).
      lat(onder, sp.b + t, n, 'onder', n);
      if (dubbel === 2) lat(boven, sp.b + t, n, 'binnen', n);
      var latMm = ((sp.b + t) * 2 + (sp.h + t) * 2) * n * dubbel;
      // Band en kit: aan elke kant één keer de omtrek van het glas.
      // Als getal: een glasmaat als tekst ("1022") werd anders aan elkaar geplakt.
      var gb = getal(r.glasBreedte), gh = getal(r.glasHoogte);
      var omtrekM = 2 * (gb + gh) / 1000;
      var roosterM = r.rooster === 'Ja' ? g.BAND_ROOSTER_FACTOR * gb / 1000 / 2 : 0;
      var bandM = 0, kitMl = 0;
      ['binnen', 'buiten'].forEach(function (kant) {
        var c = k[kant];
        // v113: band binnen kan per ruit afwijken (Invoer, venster Pakket).
        if (kant === 'binnen' && [2, 3, 4].indexOf(+eigen.bandBinnen) >= 0) c = { kleur: c.kleur, dikte: +eigen.bandBinnen };
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
      // v113: past het pakket (met de lat van boven), en past de onderlat als
      // dat een gewone glas- of ventilatielat is (een C1 van 26 mm onder een
      // A4 van 15 mm steekt anders 11 mm uit, controle v113).
      var pk = GL() ? GL().pakket(r) : null;
      var pkOnder = GL() && onder !== boven && onder !== 'NEUS' && GL().latVan(onder) && GL().latVan(onder).soort !== 'neuslat'
        ? GL().pakket(r, { lat: onder }) : null;
      perRuit.push({ rij: r, n: n, sponning: sp, lat: boven, onderlat: onder, onderKeuze: onderKeuze, neus: neus, pakket: pk, pakketOnder: pkOnder,
                     eigenOnderlat: !!eigen.onderlat, tweeKanten: !!eigen.tweeKanten,
                     latM: latMm / 1000, bandM: bandM, kitMl: kitMl, tapeM: ruitTape, roeden: ro });
    });
    var latten = Object.keys(latStukken).map(function (type) {
      var st = latStukken[type];
      var totaal = st.reduce(function (a, b) { return a + b; }, 0);
      // De lengte waarin hij verkocht wordt (Jongeneel 4 m, grenen 2,7 m), tenzij
      // het project een eigen lengte heeft.
      var info = GL() && GL().latVan(type);
      var staaf = ins.afwijkend.STAAF_MM || !info ? g.STAAF_MM : info.lengte;
      var plan = zaagplan(st, staaf, g.ZAAGSNEDE_MM);
      // v113 (Jan: "er is maar één waarheid"): wat er nodig is = totale lengte
      // + zaagverlies, gedeeld door de lengte. Alleen als de latten zo lang zijn
      // dat ze daar niet in passen (zaagplan), zijn het er meer.
      var metVerlies = Math.ceil(totaal * (1 + g.CONTROLE_VERLIES_PROCENT / 100) / staaf - 1e-9);
      var nodig = Math.max(metVerlies, plan.staven.length + plan.teLang.length);
      // Waar deze latten zitten, voor de tekst onder het totaal.
      var rol = latRol[type] || { rond: 0, onder: 0, binnen: 0 };
      var rolTekst = !rol.rond ? 'onder' : (rol.onder + rol.binnen === rol.rond) ? 'rondom' :
        'boven en zijkanten' + (rol.onder ? ', onder waar gekozen' : '') +
        (rol.binnen ? (rol.onder ? ' en' : ',') + ' onder aan de 2e kant' : '');
      return { type: type, naam: latNaam(type), rol: rolTekst, stukken: st.length, totaalMm: totaal, staaf: staaf,
               staven: nodig, metVerlies: metVerlies, zaagplanStaven: plan.staven.length, plan: plan.staven,
               teLang: plan.teLang, onbekend: type === 'NEUS', zeker: !info || info.zeker };
    }).sort(function (a, b) {
      return (latRol[b.type].rond - latRol[a.type].rond) || a.type.localeCompare(b.type, 'nl');
    });
    var bandLijst = Object.keys(band).map(function (sleutel) {
      var d = sleutel.split('|');
      return { kleur: d[0], dikte: +d[1], meters: band[sleutel], rollen: Math.ceil(band[sleutel] / g.BAND_ROL_M - 1e-9) };
    });
    var kitLijst = Object.keys(kit).map(function (kleur) {
      return { kleur: kleur, ml: kit[kleur], kokers: Math.ceil(kit[kleur] / g.KOKER_ML - 1e-9) };
    });
    return {
      instellingen: ins, mlPerM: mlPerM, latten: latten, band: bandLijst, kit: kitLijst,
      tape: { meters: tapeM, rollen: tapeM ? Math.ceil(tapeM / g.TAPE_ROL_M - 1e-9) : 0, zelf: tapeZelf },
      zonderMaat: zonderMaat, perRuit: perRuit,
      metRooster: perRuit.some(function (p) { return p.rij.rooster === 'Ja'; })
    };
  }
  window.toebehorenBerekenen = function () { return bereken(typeof rijen === 'undefined' ? [] : rijen); };
  // De keuzes van het project, voor latten.js (pakket per ruit).
  window.toebehorenKeuzes = function () { return instellingen().keuze; };
  // Latten aan twee kanten (binnen en buiten) bij deze ruit? Dan zit er in de
  // sponning aan beide kanten een lat (latten.js telt hem dan twee keer).
  window.toebehorenIsTweeKanten = function (r) { return !!perRuitVan(r).tweeKanten; };
  // De keuzes per ruit van latten.js (v113): sponningdiepte, glaslat, band
  // binnen, uitfrezen. Ze staan hier (perRuit), niet op de ruit: zie latten.js rw().
  window.toebehorenRuit = function (r) { return perRuitVan(r); };
  // Zonder controle en zonder ongedaan-stap: dat doet latten.js (of bulk.js).
  window.toebehorenZetRuit = function (id, veld, waarde) {
    var p = deelVoorWijzigen(); if (!p) return;
    zetPerRuit(p, id, veld, waarde === 0 ? 0 : waarde);
  };
  window.toebehorenInstellingen = function () { return { standaard: INSTELLINGEN, uitleg: UITLEG }; };

  // De rekenregel onder een totaal, in gewone woorden (zodat je het kunt
  // narekenen). Ook voor de pdf.
  window.toebehorenUitleg = function (u) {
    var g = u.instellingen.getallen;
    var regels = {};
    u.latten.forEach(function (l) {
      regels['lat:' + l.type] = l.stukken + (l.stukken === 1 ? ' lat, ' : ' latten, samen ') + nl(l.totaalMm / 1000, 1) + ' m (incl. ' + g.VERSTEK_TOESLAG_MM +
        ' mm verstek per lat) + ' + nlWaarde(g.CONTROLE_VERLIES_PROCENT) + ' % zaagverlies = ' +
        nl(l.totaalMm / 1000 * (1 + g.CONTROLE_VERLIES_PROCENT / 100), 1) + ' m ÷ ' + nl(l.staaf / 1000, 1) + ' m → ' +
        l.metVerlies + (l.metVerlies === 1 ? ' lengte' : ' lengtes') +
        (l.staven > l.metVerlies ? '; maar de latten zijn lang: volgens het zaagplan zijn er ' + l.staven + ' nodig' : '') + '.' +
        (l.onbekend ? ' Welke neuslat precies, rekent de app uit zodra de sponningdiepte er is.' : '');
    });
    u.band.forEach(function (b) {
      regels['band:' + b.kleur + '|' + b.dikte] = nl(b.meters, 1) + ' m (de omtrek van elke ruit, aan elke kant met dit band' +
        (g.BAND_ROOSTER_FACTOR && u.metRooster ? ', plus bij een rooster ' + nlWaarde(g.BAND_ROOSTER_FACTOR / 2) +
        ' × de breedte; binnen en buiten samen ' + nlWaarde(g.BAND_ROOSTER_FACTOR) + ' ×' : '') +
        ') ÷ ' + g.BAND_ROL_M + ' m per rol → ' + b.rollen + (b.rollen === 1 ? ' rol' : ' rollen') + '.';
    });
    u.kit.forEach(function (c) {
      regels['kit:' + c.kleur] = nl(c.ml / u.mlPerM, 1) + ' m voeg × ' + u.mlPerM + ' ml/m (' + g.KITVOEG_BREEDTE_MM + ' × ' +
        g.KITVOEG_DIEPTE_MM + ' mm) = ' + nl(c.ml) + ' ml ÷ ' + g.KOKER_ML + ' ml per koker → ' + c.kokers +
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
    // v113: de standaardlat, het band en "twee kanten" veranderen het oordeel
    // (past/krap) in de kolom Diepte op Invoer.
    if (window.latPakketBijwerken) latPakketBijwerken();
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
      // Buiten nooit 2 mm (Jan, v113).
      if (d[1] === 'dikte' && (d[0] === 'buiten' ? BAND_DIKTES_BUITEN : BAND_DIKTES).indexOf(parseInt(waarde, 10)) < 0) { renderToebehoren(); return; }
      p[d[0]] = Object.assign({}, p[d[0]] || {});
      p[d[0]][d[1]] = d[1] === 'dikte' ? (parseInt(waarde, 10) || STANDAARD_PROJECT[d[0]].dikte) : waarde;
    } else {
      if (veld === 'standaardLat' && !geldigeLat(waarde, 'boven')) { renderToebehoren(); return; }
      if (veld === 'standaardOnderlat' && waarde && !geldigeLat(waarde, 'onder')) { renderToebehoren(); return; }
      p[veld] = waarde;
    }
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
    // Een oude naam (Neuslat, Ventilatielat van v111) wordt het id van nu.
    var w = onderNaam(waarde);
    zetPerRuit(p, r.id, 'onderlat', geldigeLat(w, 'onder') ? w : '');
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
    var gekozen = onderNaam(keuze.value);
    var w = geldigeLat(gekozen, 'onder') ? gekozen : '';
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

  // v113: keuzelijst met de typen van Jongeneel, per soort een kopje.
  // wat: 'boven' (glaslatten en opdeklatten) of 'onder' (ook neus- en ventilatielatten).
  function latKeuze(wat, gekozen, attrs, voorop) {
    var L = GL(); if (!L) return keuzeLijst(voorop || [], gekozen, attrs);
    var soorten = wat === 'onder' ? ['neuslat', 'ventilatie', 'glaslat', 'glaslat-sponning'] : ['glaslat', 'glaslat-sponning', 'opdek'];
    var opt = function (v, t) { return '<option value="' + esc(v) + '"' + (String(v) === String(gekozen) ? ' selected' : '') + '>' + esc(t) + '</option>'; };
    return '<select ' + attrs + '>' + (voorop || []).map(function (w) { return opt(w[0], w[1]); }).join('') +
      soorten.map(function (soort) {
        var lijst = L.LATTEN.filter(function (l) { return l.soort === soort; });
        return '<optgroup label="' + esc(L.SOORT_NAAM[soort]) + '">' +
          (soort === 'neuslat' ? opt('NEUS', 'passende neuslat (automatisch)') : '') +
          lijst.map(function (l) { return opt(l.id, l.id + ' ' + l.maat); }).join('') + '</optgroup>';
      }).join('') + '</select>';
  }
  function geldigeLat(w, wat) {
    if (w === 'NEUS') return wat === 'onder';
    var l = GL() && GL().latVan(w);
    return !!l && (wat === 'onder' || (l.soort !== 'neuslat' && l.soort !== 'ventilatie'));
  }

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
    // v113: ruiten waar het pakket niet in de sponning past (of te ruim is):
    // eerst oplossen, anders bestel je latten die niet passen (controle v113).
    var mis = u.perRuit.filter(function (p) {
      return [p.pakket, p.pakketOnder].some(function (x) { return x && (x.status === 'past niet' || x.status === 'te ruim'); }) ||
        (p.onderKeuze === 'NEUS' && p.neus && !p.neus.lat && p.pakket && p.pakket.status !== 'onbekend');
    });
    if (mis.length) {
      h.push('<div class="tb-strook">⚠ Bij ' + (mis.length === 1 ? '1 ruit past' : mis.length + ' ruiten past') + ' het niet goed in de sponning: ' +
        esc(mis.slice(0, 12).map(function (p) { return p.rij.merk || '(zonder merk)'; }).join(', ')) + (mis.length > 12 ? ' …' : '') +
        '. Los dat eerst op (tik op Invoer op het oordeel in de kolom Diepte); de latten hieronder gaan uit van wat er nu staat.</div>');
    }
    // Totalen
    h.push('<div class="tb-totalen">');
    u.latten.forEach(function (l) {
      h.push('<div class="tb-blok"><div class="tb-getal">' + l.staven + ' × ' + nl(l.staaf / 1000, 1) + ' m</div>' +
        '<div class="tb-wat">' + esc(l.naam) + ' (' + esc(l.rol) + ')' + (l.zeker ? '' : ' <span class="tb-controle">maat nog niet nagemeten</span>') + '</div>' +
        (l.teLang.length ? '<div class="tb-let">⚠ ' + l.teLang.length + ' lat langer dan ' + nl(l.staaf / 1000, 1) +
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
        '<label>Standaardlat (boven en zijkanten) ' + latKeuze('boven', k.standaardLat, 'onchange="toebehorenKeuze(\'standaardLat\', this.value)"' + uit) + '</label>' +
        '<label>Onderlat (standaard) ' + latKeuze('onder', k.standaardOnderlat, 'onchange="toebehorenKeuze(\'standaardOnderlat\', this.value)"' + uit,
          [['', 'zelfde als de lat boven']]) +
          // v113 (controle): een neuslat hoort bij buitenbeglazing.
          (k.latPositie === 'binnen' && k.standaardOnderlat === 'NEUS'
            ? '<small class="tb-hint">Een neuslat hoort bij buitenbeglazing (latten buiten). Zitten de latten binnen, kies dan onderin "zelfde als de lat boven".</small>' : '') +
          '</label>' +
        ['binnen', 'buiten'].map(function (kant) {
          return '<label>' + kleurNaam(kant) + ': band en kit <span class="tb-paar">' +
            keuzeLijst(KLEUREN, k[kant].kleur, 'onchange="toebehorenKeuze(\'' + kant + '.kleur\', this.value)"' + uit) + ' ' +
            keuzeLijst((kant === 'buiten' ? BAND_DIKTES_BUITEN : BAND_DIKTES).map(function (d) { return [d, d + ' mm']; }), k[kant].dikte,
              'onchange="toebehorenKeuze(\'' + kant + '.dikte\', this.value)"' + uit) + '</span>' +
            (kant === 'buiten' ? '<small>buiten nooit 2 mm (werking)</small>' : '<small>per ruit anders te kiezen (Invoer, pakket)</small>') + '</label>';
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
    // Per ruit (v113: compacter; de lat komt van Invoer, de onderlat kies je hier)
    var stdOnder = k.standaardOnderlat ? (k.standaardOnderlat === 'NEUS' ? 'neuslat' : k.standaardOnderlat) : 'zelfde als boven';
    h.push('<div class="tb-perruit-kop"><h3>Per ruit</h3><span>Onderlat voor alle ruiten: ' +
      latKeuze('onder', '', 'id="tbAlleOnderlat"' + uit, [['', 'standaard (' + stdOnder + ')']]) +
      ' <button class="btn btn-ghost btn-sm" onclick="toebehorenAlleOnderlat()"' + uit + '>Toepassen</button></span></div>');
    h.push('<div class="invoer-wrap tb-wrap"><table class="samenvatting tb-tabel"><thead><tr>' +
      '<th class="tb-smal">Merk</th><th class="num tb-smal">Aant.</th><th class="num tb-smal">Sponningmaat</th><th class="tb-smal">Lat</th>' +
      '<th class="tb-breed">Onderlat</th><th class="tb-twee">Latten twee kanten<br><small>(binnen en buiten)</small></th>' +
      '<th class="num tb-smal">Latten m</th><th class="num tb-smal">Band m</th><th class="num tb-smal">Kit ml</th><th class="num tb-smal">Tape m</th>' +
      '</tr></thead><tbody>' + u.perRuit.map(function (p) {
        var r = p.rij;
        // Neuslat: de maat, of waarom er geen is (zonder diepte: "volgt uit de
        // sponningdiepte"; met diepte maar te breed: de reden, controle v113).
        var heeftDiepte = p.pakket && p.pakket.status !== 'onbekend';
        var neusTekst = p.onderKeuze === 'NEUS' ? '<small class="tb-neus">' + (p.neus && p.neus.lat ? esc(p.neus.lat.id) + ', neus ' +
          nl(p.neus.uitsteek) + ' mm voorbij de dorpel' : heeftDiepte && p.neus && p.neus.reden ? '⚠ ' + esc(p.neus.reden)
          : 'maat volgt uit de sponningdiepte') + '</small>'
          : p.pakketOnder && p.pakketOnder.status !== 'onbekend' ? '<small class="tb-neus">onderin: <span class="pk-chip pk-' +
            p.pakketOnder.status.replace(' ', '-') + '">' + esc(GL().kort(p.pakketOnder)) + '</span></small>' : '';
        var chip = p.pakket && p.pakket.status !== 'onbekend' ? ' <span class="pk-chip pk-' + p.pakket.status.replace(' ', '-') + '" title="' +
          esc(p.pakket.tekst) + '">' + esc(GL().kort(p.pakket)) + '</span>' : '';
        // De klassen tb-merk … tb-tape en data-kop zijn voor de telefoon: daar
        // wordt elke rij een kaartje (CSS, v113), met het kopje boven elk getal.
        return '<tr><td class="tb-smal tb-merk"' + (p.n > 1 ? ' data-aant="×' + p.n + '"' : '') + '>' + esc(r.merk || '—') + '</td>' +
          '<td class="num tb-smal tb-aant">' + p.n + '</td><td class="num tb-smal tb-maat">' + nl(p.sponning.b) + ' × ' +
          nl(p.sponning.h) + '</td><td class="tb-smal tb-lat" title="' + esc(latNaam(p.lat)) + '">' + esc(p.lat) + chip + '</td><td class="tb-breed">' +
          latKeuze('onder', p.eigenOnderlat ? onderNaam(perRuitVan(r).onderlat) : '',
            'class="tb-onderlat" aria-label="Onderlat ' + esc(r.merk || '') + '" onchange="toebehorenOnderlat(' + r.id + ', this.value)"' + uit,
            [['', 'standaard (' + stdOnder + ')']]) + neusTekst + '</td>' +
          '<td class="tb-twee"><label><input type="checkbox" class="tb-tweekanten" aria-label="Latten twee kanten (binnen en buiten)"' + (p.tweeKanten ? ' checked' : '') +
            ' onchange="toebehorenTweeKanten(' + r.id + ', this.checked)"' + uit + '><span class="tb-mob"> latten twee kanten (binnen en buiten)</span></label></td>' +
          '<td class="num tb-smal tb-num" data-kop="Latten m">' + nl(p.latM, 1) + '</td><td class="num tb-smal tb-num" data-kop="Band m">' + nl(p.bandM, 1) + '</td>' +
          '<td class="num tb-smal tb-num" data-kop="Kit ml">' + nl(p.kitMl) + '</td>' +
          '<td class="num tb-smal tb-num" data-kop="Tape m">' + (p.roeden === 'zelf' ? 'zelf' : p.tapeM ? nl(p.tapeM, 1) : '–') + '</td></tr>';
      }).join('') + '</tbody></table></div>');
    h.push('<div class="tb-noot">Alleen voor eigen gebruik: dit staat in de PDF invoer (en bij Alles exporteren), niet op de bestellijst.</div>');
    vak.innerHTML = h.join('');
  }
  window.renderToebehoren = renderToebehoren;
})();
