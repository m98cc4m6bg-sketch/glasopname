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
    // v121 (Jan): de neuslat wordt recht afgekort en is zoveel langer dan de
    // sponningbreedte: hij loopt aan beide kanten door in de scharniersponning.
    // Los van de verstektoeslag (tot v120 kreeg hij die, en heette het "verstek").
    NEUSLAT_TOESLAG_MM: 20,
    // v120 (keuze Jan): besteld = het zaagplan + zoveel reserve per lattype.
    // Tot v119 een percentage zaagverlies over de totale lengte (10 %).
    RESERVE_LENGTES: 1,
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
  var BAND_DIKTES = [2, 3, 4, 5];       // binnen; 5 = 2 + 3 op elkaar (v118)
  var BAND_DIKTES_BUITEN = [3, 4, 5];   // buiten nooit 2 mm (Jan, v113: "werking")
  var STANDAARD_PROJECT = {
    latPositie: 'binnen',            // waar de glaslatten zitten (ter info)
    standaardLat: 'A4',              // boven, links en rechts (per ruit anders te kiezen op Toebehoren, v115)
    standaardOnderlat: 'NEUS',       // onder, tenzij per ruit anders
    binnen: { kleur: 'wit', dikte: 3 },
    buiten: { kleur: 'wit', dikte: 3 }
  };
  function GL() { return window.GlasLatten || null; }
  // v121: een neuslat (de automatische 'NEUS' of een gekozen N25 … N55) wordt
  // recht afgekort, met een eigen toeslag (NEUSLAT_TOESLAG_MM).
  function isNeuslat(id) {
    if (id === 'NEUS') return true;
    var l = GL() && GL().latVan && GL().latVan(id);
    return !!(l && l.soort === 'neuslat' && l.id === id);
  }
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
    NEUSLAT_TOESLAG_MM: ['Neuslat (recht): langer dan sponning', 'mm'],
    RESERVE_LENGTES: ['Reserve per lattype', 'lengtes'],
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
  // v120: ook > en '.
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
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
    if (w === 'Glaslat' || w === 'ZELFDE') return 'ZELFDE';   // v115: zo bewaard (tot v114: '' = automatisch)
    return GL() ? GL().normaal(w) : w;
  }
  // v121 (P3): het voorbeeld van de actiebalk rekent met keuzes die nog niet
  // bewaard zijn. Zolang 'proef' gezet is, leest het oordeel die keuzes.
  var proef = null;
  function perRuitVan(r) {
    if (proef && r && Object.prototype.hasOwnProperty.call(proef, r.id)) return proef[r.id];
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

  // v117 (wens Jan): het zaagplan als tekening: per lengte een balk, met de
  // stukken (in mm) en wat er overblijft. Zelfde plan als de rekenregel
  // (zaagplan hierboven); extra lengtes voor zaagverlies staan eronder.
  var zaagOpen = {};
  window.toebehorenZaagKlap = function (type, open) { if (open) zaagOpen[type] = true; else delete zaagOpen[type]; };
  // HTML-balken (geen SVG): dan blijven de maten leesbaar op een telefoon.
  function zaagBalken(l) {
    var plan = l.plan || [];
    var pct = function (mm) { return (mm / l.staaf * 100).toFixed(2) + '%'; };
    return '<div class="tb-zaag-plan">' + plan.map(function (st, i) {
      var rest = Math.max(0, st.rest);
      return '<div class="tb-zaag-rij"><span class="tb-zaag-nr">' + (i + 1) + '</span><div class="tb-zaag-staaf">' +
        st.stukken.map(function (mm, k) {
          // v120 (controle v119, iPhone: "32(" afgekapt): een smal stuk krijgt
          // geen half getal; de maten staan dan in de regel eronder.
          var smal = mm / l.staaf < 0.09;
          return '<span class="tb-zaag-stuk' + (smal ? ' smal' : '') + '" style="width:' + pct(mm) + (k < st.stukken.length - 1 ? ';margin-right:' + pct(l.snede || 0) : '') +
            '" title="' + nl(mm) + ' mm">' + (smal ? '' : nl(mm)) + '</span>';
        }).join('') + '</div><span class="tb-zaag-rest">rest ' + nl(rest) + '</span>' +
        '<span class="tb-zaag-maten">' + st.stukken.map(function (mm) { return nl(mm); }).join(' · ') + '</span></div>';
    }).join('') + '</div>';
  }
  function zaagHTML(l) {
    var plan = l.plan || [];
    if (!plan.length) return '';
    var extra = l.reserve || 0;
    return '<details class="tb-zaag"' + (zaagOpen[l.type] ? ' open' : '') + ' ontoggle="toebehorenZaagKlap(\'' + esc(l.type) + '\', this.open)">' +
      '<summary>Zaagplan: ' + plan.length + ' × ' + nl(l.staaf / 1000, 1) + ' m' + (l.reserve ? ' + ' + l.reserve + ' reserve' : '') + '</summary>' +
      '<button type="button" class="sluit-x" aria-label="Zaagplan inklappen" onclick="this.parentNode.open = false">✕</button>' + zaagBalken(l) +
      '<div class="tb-reken">Elke balk is één lengte van ' + nl(l.staaf) + ' mm; de stukken zijn de latten in mm (' +
      (l.neuslat ? 'recht afgekort, met de toeslag voor de scharniersponning' : 'met verstek') + '), met ' +
      nl(l.snede || 0) + ' mm zaagsnede ertussen.' + (extra > 0 ? ' Besteld ' + l.staven + ': ' + extra + ' reserve.' : '') + '</div></details>';
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
    var vijfmm = {};       // v118: per kleur: ergens band van 5 mm (2 + 3)
    var stukRuit = null;   // v118: de stukken van de ruit die nu geteld wordt (werkvloer)
    function lat(type, lengte, n, rol, ruiten) {
      if (stukRuit && n > 0) stukRuit.push({ type: type, mm: Math.round(lengte), n: n, rol: rol, recht: isNeuslat(type) });
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
      stukRuit = [];
      // v114: de latzijde per ruit (binnen/buiten/beide; Jan: geen standaard).
      // Beide = glas tussen twee latten: alles twee keer; onderin aan beide
      // kanten dezelfde lat (v115), tenzij je onderin zelf iets kiest.
      // v115: "geen" = latten meegeleverd (nieuwe kozijnen): geen latten,
      // wel band, kit en tape.
      var zijde = GL() ? GL().zijde(r) : (eigen.tweeKanten ? 'beide' : '');
      var geen = zijde === 'geen';
      var dubbel = zijde === 'beide' ? 2 : 1;
      // v113: de lat van deze ruit of de projectstandaard.
      var boven = GL() ? GL().latVoorRuit(r).id : k.standaardLat;
      // v114: de onderlat volgt de zijde (buiten = passende neuslat), tenzij
      // je hem per ruit anders kiest; zie latten.js onderlatVoorRuit.
      var ol = GL() ? GL().onderlatVoorRuit(r) : { id: boven, isNeus: false, eigen: false };
      var onderKeuze = ol.geen ? '' : ol.isNeus ? 'NEUS' : ol.id;
      var onder = ol.geen ? '' : ol.id, neus = ol.isNeus ? ol.neus : null;
      var t = g.VERSTEK_TOESLAG_MM;
      if (!geen) {
        lat(boven, sp.b + t, n * dubbel, 'rond', n * dubbel);   // boven
        lat(boven, sp.h + t, 2 * n * dubbel, 'rond', 0);        // links en rechts
        // Onder: de onderlat (neuslat, ventilatielat) hoort bij de glaskant,
        // dus één keer. Bij latten aan twee kanten komt aan de andere kant
        // onderin een gewone lat, net als boven (v113; tot v112 kwamen er dan
        // twee neuslatten).
        // v121 (Jan): een neuslat recht, sponningbreedte + NEUSLAT_TOESLAG_MM.
        var onderMm = sp.b + (ol.isNeus ? g.NEUSLAT_TOESLAG_MM : t);
        lat(onder, onderMm, n, 'onder', n);
        if (dubbel === 2) lat(boven, sp.b + t, n, 'binnen', n);
      }
      // Alle latten van deze ruit samen (boven, zijkanten, onder; bij twee
      // kanten de tweede kant ook). Tot v120: onder altijd met verstek.
      var latMm = geen ? 0 : (((sp.b + t) + (sp.h + t) * 2) * dubbel + onderMm + (dubbel === 2 ? sp.b + t : 0)) * n;
      // Band en kit: aan elke kant één keer de omtrek van het glas.
      // Als getal: een glasmaat als tekst ("1022") werd anders aan elkaar geplakt.
      var gb = getal(r.glasBreedte), gh = getal(r.glasHoogte);
      var omtrekM = 2 * (gb + gh) / 1000;
      var roosterM = r.rooster === 'Ja' ? g.BAND_ROOSTER_FACTOR * gb / 1000 / 2 : 0;
      var bandM = 0, kitMl = 0;
      ['binnen', 'buiten'].forEach(function (kant) {
        var c = k[kant];
        // v113: band binnen kan per ruit afwijken (Toebehoren, kolom Band binnen).
        if (kant === 'binnen' && BAND_DIKTES.indexOf(+eigen.bandBinnen) >= 0) c = { kleur: c.kleur, dikte: +eigen.bandBinnen };
        // v118: band buiten per ruit (3, 4, 5).
        if (kant === 'buiten' && BAND_DIKTES_BUITEN.indexOf(+eigen.bandBuiten) >= 0) c = { kleur: c.kleur, dikte: +eigen.bandBuiten };
        var m = (omtrekM + roosterM) * n;
        // v118 (keuze Jan): 5 mm = een rol 2 mm en een rol 3 mm op elkaar.
        if (c.dikte === 5) vijfmm[c.kleur] = true;
        (c.dikte === 5 ? [2, 3] : [c.dikte]).forEach(function (d) {
          band[c.kleur + '|' + d] = (band[c.kleur + '|' + d] || 0) + m;
        });
        // v118: bij 5 mm liggen er twee banden op elkaar, dus twee keer de lengte
        // (zelfde als in het totaal per rol hierboven).
        bandM += m * (c.dikte === 5 ? 2 : 1);
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
      // v113/v114: past het pakket (boven en zijkanten), en onderin (eigen
      // diepte van de onderdorpel, of een andere onderlat; een C1 van 26 mm
      // onder een A4 van 15 mm steekt anders 11 mm uit). Zie oordeelRuit.
      var oo = GL() ? GL().oordeelRuit(r) : null;
      var pk = oo ? oo.boven : null;
      var pkOnder = oo && oo.onder && !ol.isNeus ? oo.onder : null;
      perRuit.push({ rij: r, n: n, sponning: sp, lat: geen ? '' : boven, onderlat: onder, onderKeuze: onderKeuze, neus: neus, pakket: pk, pakketOnder: pkOnder,
                     oordeel: oo, zijde: zijde, geen: geen, eigenOnderlat: !!ol.eigen, tweeKanten: dubbel === 2,
                     omgekeerd: !geen && GL() ? GL().omgekeerd(r) : false,
                     diepte: GL() ? GL().ruit(r).sponningDiepte : null,
                     latM: latMm / 1000, bandM: bandM, kitMl: kitMl, tapeM: ruitTape, roeden: ro, stukken: stukRuit });
      stukRuit = null;
    });
    var latten = Object.keys(latStukken).map(function (type) {
      var st = latStukken[type];
      var totaal = st.reduce(function (a, b) { return a + b; }, 0);
      // De lengte waarin hij verkocht wordt (Jongeneel 4 m, grenen 2,7 m), tenzij
      // het project een eigen lengte heeft.
      var info = GL() && GL().latVan(type);
      var staaf = ins.afwijkend.STAAF_MM || !info ? g.STAAF_MM : info.lengte;
      var plan = zaagplan(st, staaf, g.ZAAGSNEDE_MM);
      // v120 (keuze Jan): besteld = de lengtes van het zaagplan + reserve per
      // type. Een lat langer dan de lengte zit niet in het zaagplan en wordt
      // apart besteld; tot v119 telde hij ook nog als een gewone lengte
      // (dubbel), en zei het scherm "1 extra" waar de werkvloer "3" zei.
      var reserve = plan.staven.length ? Math.floor(g.RESERVE_LENGTES || 0) : 0;
      var nodig = plan.staven.length + reserve;
      // Waar deze latten zitten, voor de tekst onder het totaal.
      var rol = latRol[type] || { rond: 0, onder: 0, binnen: 0 };
      var rolTekst = !rol.rond ? 'onder' : (rol.onder + rol.binnen === rol.rond) ? 'rondom' :
        'boven en zijkanten' + (rol.onder ? ', onder waar gekozen' : '') +
        (rol.binnen ? (rol.onder ? ' en' : ',') + ' onder aan de 2e kant' : '');
      return { type: type, naam: latNaam(type), rol: rolTekst, stukken: st.length, totaalMm: totaal, staaf: staaf,
               staven: nodig, reserve: reserve, zaagplanStaven: plan.staven.length, plan: plan.staven, snede: g.ZAAGSNEDE_MM,
               teLang: plan.teLang, onbekend: type === 'NEUS', zeker: !info || info.zeker, neuslat: isNeuslat(type) };
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
      vijfmm: vijfmm,
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

  // De keuzes per ruit van latten.js (v113): sponningdiepte, glaslat, band
  // binnen, uitfrezen. Ze staan hier (perRuit), niet op de ruit: zie latten.js rw().
  window.toebehorenRuit = function (r) { return perRuitVan(r); };
  // Zonder controle en zonder ongedaan-stap: dat doet latten.js (of bulk.js).
  // v119: de strook over "beide" weg voor de ruiten die er nu in staan.
  window.toebehorenBeideGezien = function () {
    if (magNiet()) { renderToebehoren(); return; }
    var p = deelVoorWijzigen(); if (!p) return;
    var G = GL(); if (!G) return;
    var ids = rijen.filter(function (r) { return G.zijde(r) === 'beide' && !G.ruit(r).onderlat; }).map(function (r) { return r.id; });
    var oud = Array.isArray(p.beideGezien) ? p.beideGezien : [];
    p.beideGezien = oud.concat(ids.filter(function (i) { return oud.indexOf(i) < 0; }));
    bewaarEnTeken();
  };
  // v120 (keuze Jan): ⧉ dupliceren neemt de keuzes per ruit mee (diepte,
  // onderdiepte, latzijde, lat, band …). Geeft de velden terug die meegingen.
  window.toebehorenKopieerRuit = function (vanId, naarId) {
    var bron = (projectDeel().perRuit || {})[vanId];
    if (!bron || !Object.keys(bron).length) return [];
    var p = deelVoorWijzigen(); if (!p) return [];
    p.perRuit = Object.assign({}, p.perRuit || {});
    p.perRuit[naarId] = JSON.parse(JSON.stringify(bron));
    return Object.keys(bron);
  };
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
      regels['lat:' + l.type] = l.stukken + (l.stukken === 1 ? ' lat, ' : ' latten, samen ') + nl(l.totaalMm / 1000, 1) + ' m (incl. ' +
        (l.neuslat ? g.NEUSLAT_TOESLAG_MM + ' mm per neuslat: recht afgekort, langer dan de sponning voor de scharniersponning'
          : g.VERSTEK_TOESLAG_MM + ' mm verstek per lat') + '); zaagplan ' + l.zaagplanStaven + (l.zaagplanStaven === 1 ? ' lengte' : ' lengtes') + ' van ' + nl(l.staaf / 1000, 1) + ' m' +
        (l.reserve ? ' + ' + l.reserve + ' reserve' : '') + ' = ' + l.staven + (l.staven === 1 ? ' lengte' : ' lengtes') +
        (l.teLang && l.teLang.length ? '; ' + l.teLang.length + (l.teLang.length === 1 ? ' lat is' : ' latten zijn') + ' langer: apart' : '') + '.' +
        (l.onbekend ? ' Welke neuslat precies, rekent de app uit zodra de sponningdiepte er is.' : '');
    });
    u.band.forEach(function (b) {
      regels['band:' + b.kleur + '|' + b.dikte] = nl(b.meters, 1) + ' m (de omtrek van elke ruit, aan elke kant met dit band' +
        (g.BAND_ROOSTER_FACTOR && u.metRooster ? ', plus bij een rooster ' + nlWaarde(g.BAND_ROOSTER_FACTOR / 2) +
        ' × de breedte; binnen en buiten samen ' + nlWaarde(g.BAND_ROOSTER_FACTOR) + ' ×' : '') +
        ') ÷ ' + g.BAND_ROL_M + ' m per rol → ' + b.rollen + (b.rollen === 1 ? ' rol' : ' rollen') + '.' +
        (u.vijfmm && u.vijfmm[b.kleur] && (b.dikte === 2 || b.dikte === 3) ? ' Band van 5 mm telt hier mee: dat is 2 mm en 3 mm op elkaar.' : '');
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
    // (past/krap) (v115: alleen nog op Toebehoren zelf; Invoer heeft alleen de diepten).
    if (window.latPakketBijwerken) latPakketBijwerken();
  }
  function deelVoorWijzigen() {
    if (typeof projectInfo !== 'object' || !projectInfo) return null;
    if (!projectInfo.toebehoren || typeof projectInfo.toebehoren !== 'object') projectInfo.toebehoren = {};
    return projectInfo.toebehoren;
  }

  window.toebehorenKeuze = function (veld, waarde) {
    if (magNiet()) { renderToebehoren(); return; }
    // v114 (controle): de standaardlat bepaalt de lat van elke ruit zonder eigen
    // keuze, dus die gaat na de bestelling ook op slot.
    if ((veld === 'standaardLat' || veld === 'standaardOnderlat') && latSlot()) { renderToebehoren(); return; }
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

  window.toebehorenGetal = async function (sleutel, waarde) {
    if (magNiet()) { renderToebehoren(); return; }
    if (!(sleutel in INSTELLINGEN)) return;
    var tekst = String(waarde == null ? '' : waarde).trim();
    var n = tekst === '' ? null : leesGetal(tekst);
    // Iets wat geen getal is (bijv. "abc"): niets veranderen, het vak terugzetten.
    // Ook 0 bij een lengte of inhoud (daar wordt door gedeeld): dan ook niets.
    if (tekst !== '' && (n == null || (n === 0 && DELERS.indexOf(sleutel) >= 0))) { renderToebehoren(); return; }
    // v120 (controle v119): "5,4" in het vak voor de lengte (in mm) gaf
    // 5,4 mm, en daarmee duizenden lengtes. Onder 1 m eerst vragen.
    if (sleutel === 'STAAF_MM' && n != null && n < 1000 && window.appKeuze) {
      var knoppen = [{ tekst: 'Stoppen', waarde: null }];
      if (n < 20) knoppen.push({ tekst: nl(Math.round(n * 1000)) + ' mm (' + nlWaarde(n) + ' m)', waarde: 'm', primair: true });
      knoppen.push({ tekst: 'Toch ' + nlWaarde(n) + ' mm', waarde: 'mm' });
      var keus = await appKeuze('Een glaslat van ' + nlWaarde(n) + ' mm lang? De lengte staat in millimeters (4 m = 4000).', knoppen,
        { kop: 'Lengte glaslat', soort: 'letop' });
      if (!keus) { renderToebehoren(); return; }
      if (keus === 'm') n = Math.round(n * 1000);
    }
    var p = deelVoorWijzigen(); if (!p) return;
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
  // v114: na een bestelling op slot (slotWeigert zegt waarom).
  function latSlot() { return window.slotWeigert ? slotWeigert() : magNiet(); }
  window.toebehorenOnderlat = function (id, waarde) {
    if (magNiet() || latSlot()) { renderToebehoren(); return; }
    var r = typeof getRij === 'function' ? getRij(id) : null; if (!r) return;
    var p = deelVoorWijzigen(); if (!p) return;
    if (window.bewaarStap) bewaarStap('Onderlat ' + (r.merk || ''));
    // Een oude naam (Neuslat, Ventilatielat van v111) wordt het id van nu.
    var w = onderNaam(waarde);
    zetPerRuit(p, r.id, 'onderlat', geldigeLat(w, 'onder') ? w : '');
    bewaarEnTeken();
  };
  // Sinds v114 is "latten twee kanten" de latzijde "beide" (Invoer, kolom
  // Latten; op slot na een bestelling). Deze functie blijft voor oude code en
  // tests en doet hetzelfde als die keuze.
  window.toebehorenTweeKanten = function (id, aan) {
    var r = typeof getRij === 'function' ? getRij(id) : null; if (!r) return;
    var nu = GL() ? GL().zijde(r) : '';
    if (window.latZijde) latZijde(id, aan ? 'beide' : (nu === 'beide' ? '' : nu), true);
    if (document.getElementById('panel-toebehoren') && document.getElementById('panel-toebehoren').classList.contains('active')) renderToebehoren();
  };
  // Alle ruiten in één keer dezelfde onderlat (of terug naar de standaard).
  window.toebehorenAlleOnderlat = function () {
    if (magNiet() || latSlot()) { renderToebehoren(); return; }
    var keuze = el('tbAlleOnderlat'); if (!keuze || keuze.value === '-') return;   // v115: "niet wijzigen"
    var p = deelVoorWijzigen(); if (!p) return;
    if (window.bewaarStap) bewaarStap('Onderlat alle ruiten');
    var gekozen = onderNaam(keuze.value);
    var w = geldigeLat(gekozen, 'onder') ? gekozen : '';
    (rijen || []).filter(heeftInhoud).forEach(function (r) { zetPerRuit(p, r.id, 'onderlat', w); });
    bewaarEnTeken();
  };

  // v115: alles voor de ruiten op Toebehoren. De latkeuzes zelf doet
  // latten.js (met het slot, een stap voor ongedaan maken en het opslaan);
  // hier alleen de doorgeefluiken voor de tabel.
  function getRijVan(id) { return typeof getRij === 'function' ? getRij(id) : null; }
  window.toebehorenDiepte = function (id, plek, waarde) {
    if (plek === 'onder') { if (window.latOnderDiepte) latOnderDiepte(id, waarde, true); }
    else if (window.latDiepte) latDiepte(id, waarde, true);
    later();
  };
  window.toebehorenZijde = function (id, waarde) {
    if (window.latZijde) latZijde(id, waarde, true);
    later();
  };
  // Glastype en opbouw (v115, wens Jan): hier aan te passen om een pakket
  // passend te krijgen. Het zijn dezelfde gegevens als op Invoer, met
  // dezelfde functies (wijzigGlasType, wijzigOpbouw): Invoer, de pdf en de
  // bestellijst volgen vanzelf, en het slot na de bestelling geldt ook hier.
  window.toebehorenGlas = function (id, veld, waarde) {
    if (window.slotWeigert && slotWeigert()) { later(); return; }
    var r = getRijVan(id); if (!r) return;
    // Glastype: wijzigGlasType legt zelf een stap vast (undo.js omhult hem);
    // nog een stap hier gaf twee keer Cmd+Z voor één wijziging (controle v115).
    if (veld !== 'glasType' && window.bewaarStap) bewaarStap('Opbouw ' + (r.merk || ''));
    if (veld === 'glasType' && typeof wijzigGlasType === 'function') wijzigGlasType(id, waarde);
    else if (veld === 'opbouw' && typeof wijzigOpbouw === 'function') wijzigOpbouw(id, waarde);
    later();
  };
  // Alle ruiten van één foto dezelfde latzijde (v115).
  window.toebehorenGroepZijde = function (sleutel, waarde) {
    if (waarde === '-') return;
    if (magNiet() || latSlot()) { later(); return; }
    var lijst = groepRuiten(sleutel);
    if (!lijst.length) return;
    var p = deelVoorWijzigen(); if (!p) return;
    if (window.bewaarStap) bewaarStap('Latzijde alle ruiten');
    var w = GL() && GL().ZIJDEN.indexOf(waarde) >= 0 ? waarde : '';
    lijst.forEach(function (r) { zetPerRuit(p, r.id, 'latZijde', w); zetPerRuit(p, r.id, 'tweeKanten', ''); });
    bewaarEnTeken();
  };
  // v120 (keuze Jan: "allebei"): ruiten aanvinken; het blok werkt dan alleen
  // op de gekozen ruiten, anders op alle. Alleen in het geheugen (een keuze
  // voor nu, geen gegevens van het project).
  var gekozen = {};
  function gekozenRuiten() {
    return (typeof rijen === 'undefined' ? [] : rijen).filter(function (r) { return gekozen[r.id] && heeftInhoud(r); });
  }
  window.toebehorenKies = function (id, aan) {
    if (aan) gekozen[id] = true; else delete gekozen[id];
    later();
  };
  window.toebehorenKiesGroep = function (sleutel) {
    var lijst = groepRuiten(sleutel);
    var alle = lijst.length && lijst.every(function (r) { return gekozen[r.id]; });
    lijst.forEach(function (r) { if (alle) delete gekozen[r.id]; else gekozen[r.id] = true; });
    later();
  };
  window.toebehorenKiesWissen = function () { gekozen = {}; balk = leegBalk(); later(); };

  /* ─── v121 (P3, keuze Jan): de actiebalk voor de gekozen ruiten ─────
     Onderin het scherm zodra er ruiten aangevinkt zijn: diepte, latzijde,
     glaslat, onderlat en band binnen, met vóór het toepassen per ruit wat
     het oordeel wordt. Het voorbeeld ís de controle, dus geen extra vraag;
     daarna wel ↶ Terugzetten (één stap ongedaan maken). */
  function leegBalk() { return { diepte: '', zijde: '-', lat: '-', onder: '-', band: '-' }; }
  var balk = leegBalk();
  function balkGekozen() {
    return balk.diepte.trim() !== '' || balk.zijde !== '-' || balk.lat !== '-' || balk.onder !== '-' || balk.band !== '-';
  }
  function diepteLees(t) {
    // Zelfde regel als latten.js (diepteVan): > 0 en < 200 mm, op 0,1 mm.
    var v = String(t == null ? '' : t).trim().replace(',', '.');
    if (v === '') return null;
    var n = Number(v);
    return n > 0 && n < 200 ? Math.round(n * 10) / 10 : undefined;
  }
  // De keuzes van de balk op één ruit, zonder iets te bewaren. Geeft de
  // nieuwe keuzes per ruit en of de onderlat overgeslagen is (binnen).
  function keuzeOp(e, r, k) {
    var n = Object.assign({}, e || {});
    var zet = function (veld, w) { if (w) n[veld] = w; else delete n[veld]; };
    var L = GL();
    var d = diepteLees(k.diepte);
    if (d != null && d !== undefined) zet('sponningDiepte', d);
    if (k.zijde !== '-') { zet('latZijde', L && L.ZIJDEN.indexOf(k.zijde) >= 0 ? k.zijde : ''); zet('tweeKanten', ''); }
    var zNa = k.zijde !== '-' ? k.zijde : (L ? L.zijde(r) : '');
    if (k.lat !== '-') {
      var dl = k.lat.split('|');
      var lat = L && L.latVan(dl[0]);
      zet('glaslat', lat && geldigeLat(dl[0], 'boven') ? dl[0] : '');
      zet('latOmgekeerd', dl[1] === 'om' && lat && L.draaibaar(lat) ? true : '');
    }
    var overgeslagen = false;
    if (k.onder !== '-') {
      var w = onderNaam(k.onder);
      if (L && !L.onderMagBij(r, w, zNa)) overgeslagen = true;
      else zet('onderlat', geldigeLat(w, 'onder') ? w : '');
    }
    if (k.band !== '-') {
      var b = parseInt(k.band, 10);
      zet('bandBinnen', L && L.BAND_BINNEN.indexOf(b) >= 0 ? b : '');
    }
    return { e: n, overgeslagen: overgeslagen };
  }
  function zetHeleRuit(p, id, e) {
    p.perRuit = Object.assign({}, p.perRuit || {});
    if (e && Object.keys(e).length) p.perRuit[id] = e; else delete p.perRuit[id];
    if (!Object.keys(p.perRuit).length) delete p.perRuit;
  }
  // Het oordeel van één ruit zoals de chip het zegt (met de lat ervoor).
  function oordeelKort(r) {
    var L = GL(); if (!L) return null;
    var o = L.oordeelRuit(r), sl = o && o.slechtste, z = L.zijde(r);
    if (!sl) return { st: 'leeg', tekst: '?', ernst: 0 };
    var st = sl.status === 'onbekend' ? 'leeg' : sl.status === 'geen' ? 'geen' : sl.status.replace(' ', '-');
    var tekst = sl.status === 'onbekend' ? (z ? '?' : 'zijde?') : L.kortRuit(o);
    var lat = z && z !== 'geen' ? L.latVoorRuit(r).id + ' · ' : '';
    return { st: st, tekst: lat + tekst, ernst: sl.status === 'onbekend' ? 0 : (L.ERNST[sl.status] || 0), status: sl.status };
  }
  // Voor elke gekozen ruit: nu en na toepassen.
  function balkVoorbeeld(kz) {
    return kz.map(function (r) {
      var nu = oordeelKort(r);
      var res = keuzeOp(perRuitVan(r), r, balk);
      var na;
      proef = {}; proef[r.id] = res.e;
      try { na = oordeelKort(r); } finally { proef = null; }
      return { r: r, nu: nu, na: na, overgeslagen: res.overgeslagen };
    });
  }
  function chipMini(o) {
    return o ? '<span class="pk-chip pk-' + esc(o.st) + ' tb-vb-chip">' + esc(o.tekst) + '</span>' : '';
  }
  function balkVoorbeeldHTML(kz) {
    var d = diepteLees(balk.diepte);
    if (d === undefined) return '<span class="tb-vb-fout">"' + esc(balk.diepte) + '" is geen diepte. Vul de diepte in mm in (bijv. 45), of laat het vak leeg.</span>';
    if (!balkGekozen()) return '<span class="tb-vb-leeg">Kies wat je wilt veranderen. Hier zie je vóór het toepassen wat het per ruit wordt.</span>';
    var lijst = balkVoorbeeld(kz);
    var slechter = lijst.filter(function (x) { return x.na && x.nu && x.na.ernst > x.nu.ernst; });
    var tel = {};
    lijst.forEach(function (x) { var t = x.na ? x.na.status : '?'; tel[t] = (tel[t] || 0) + 1; });
    var h = '<div class="tb-vb-kop">Na toepassen: ' + Object.keys(tel).map(function (t) {
      return tel[t] + '× ' + esc(t === 'onbekend' ? 'nog onbekend' : t);
    }).join(', ') + (slechter.length ? ' · <b class="tb-vb-slechter">slechter bij ' +
      esc(slechter.map(function (x) { return x.r.merk || '—'; }).join(', ')) + '</b>' : '') + '</div>';
    h += '<ul class="tb-vb-lijst">' + lijst.map(function (x) {
      var zelfde = x.nu && x.na && x.nu.tekst === x.na.tekst && x.nu.st === x.na.st;
      return '<li' + (x.na && x.nu && x.na.ernst > x.nu.ernst ? ' class="slechter"' : '') + '><b>' + esc(x.r.merk || '—') + '</b> ' +
        (zelfde ? '<span class="tb-vb-blijft">blijft</span> ' + chipMini(x.na) : chipMini(x.nu) + ' → ' + chipMini(x.na)) +
        (x.overgeslagen ? ' <small>onderlat niet (latzijde binnen)</small>' : '') + '</li>';
    }).join('') + '</ul>';
    return h;
  }
  function balkKnopHTML(kz) {
    var mag = balkGekozen() && diepteLees(balk.diepte) !== undefined;
    return '<button type="button" class="btn btn-primary" data-sleutel="balk-toepassen" onclick="toebehorenBalkToepassen()"' + (mag ? '' : ' disabled') + '>' +
      'Toepassen op ' + kz.length + (kz.length === 1 ? ' ruit' : ' ruiten') + '</button>';
  }
  function balkHTML(kz, latUit) {
    var L = GL();
    var sel = function (v, w) { return String(v) === String(w) ? ' selected' : ''; };
    var kies = function (wat) { return ' onchange="toebehorenBalkKies(\'' + wat + '\', this.value)"'; };
    var zijde = '<select data-sleutel="balk-zijde" aria-label="Latzijde"' + kies('zijde') + latUit + '>' +
      '<option value="-"' + sel('-', balk.zijde) + '>latzijde: niet wijzigen</option><option value=""' + sel('', balk.zijde) + '>latzijde: ?</option>' +
      (L ? L.ZIJDEN.map(function (z) { return '<option value="' + z + '"' + sel(z, balk.zijde) + '>latzijde: ' + esc(L.ZIJDE_NAAM[z]) + '</option>'; }).join('') : '') + '</select>';
    var lat = '<select data-sleutel="balk-lat" aria-label="Glaslat"' + kies('lat') + latUit + '>' +
      '<option value="-"' + sel('-', balk.lat) + '>glaslat: niet wijzigen</option><option value=""' + sel('', balk.lat) + '>glaslat: projectstandaard</option>' +
      (L ? L.LATTEN.filter(function (l) { return geldigeLat(l.id, 'boven'); }).map(function (l) {
        return '<option value="' + esc(l.id) + '"' + sel(l.id, balk.lat) + '>' + esc(l.id + ' ' + l.maat) + '</option>' +
          (L.draaibaar(l) ? '<option value="' + esc(l.id) + '|om"' + sel(l.id + '|om', balk.lat) + '>' + esc(l.id + ' ' + l.maat + ' omgekeerd') + '</option>' : '');
      }).join('') : '') + '</select>';
    var onder = latKeuze('onder', balk.onder, 'data-sleutel="balk-onder" aria-label="Onderlat"' + kies('onder') + latUit,
      [['-', 'onderlat: niet wijzigen'], ['', 'onderlat: automatisch'], ['ZELFDE', 'onderlat: zelfde als boven']]);
    var std = L ? L.project().bandBinnen : 3;
    var band = '<select data-sleutel="balk-band" aria-label="Band binnen"' + kies('band') + latUit + '>' +
      '<option value="-"' + sel('-', balk.band) + '>band binnen: niet wijzigen</option><option value=""' + sel('', balk.band) + '>band binnen: std ' + std + '</option>' +
      (L ? L.BAND_BINNEN : [2, 3, 4, 5]).map(function (b) {
        return '<option value="' + b + '"' + sel(b, balk.band) + '>band binnen: ' + b + ' mm' + (b === 5 ? ' (2+3)' : '') + '</option>';
      }).join('') + '</select>';
    var diepte = '<label class="tb-balk-diepte">diepte <input type="text" inputmode="decimal" data-sleutel="balk-diepte" placeholder="niet wijzigen"' +
      ' aria-label="Diepte zij en boven" value="' + esc(balk.diepte) + '" oninput="toebehorenBalkKies(\'diepte\', this.value)"' + latUit + '> mm</label>';
    var merken = kz.map(function (r) { return r.merk || '—'; });
    return '<div id="tbActiebalk" class="tb-actiebalk" role="region" aria-label="Gekozen ruiten wijzigen">' +
      '<div class="tb-balk-kop"><b>' + kz.length + ' gekozen</b> <span class="tb-balk-merken">(' + esc(merken.slice(0, 10).join(', ')) +
        (merken.length > 10 ? ' …' : '') + ')</span>' +
        '<button type="button" class="sluit-x" aria-label="Kiezen wissen" title="Kiezen wissen" onclick="toebehorenKiesWissen()">✕</button></div>' +
      '<div class="tb-balk-velden">' + diepte + zijde + lat + onder + band + '</div>' +
      '<div class="tb-balk-onder"><div class="tb-balk-voorbeeld" id="tbBalkVoorbeeld" aria-live="polite">' + balkVoorbeeldHTML(kz) + '</div>' +
      '<div class="tb-balk-knop" id="tbBalkKnop">' + balkKnopHTML(kz) + '</div></div></div>';
  }
  // Een keuze in de balk: alleen het voorbeeld en de knop opnieuw (de focus
  // blijft in het vak waarin je typt).
  window.toebehorenBalkKies = function (wat, waarde) {
    if (!(wat in balk)) return;
    balk[wat] = String(waarde == null ? '' : waarde);
    var kz = gekozenRuiten();
    var v = el('tbBalkVoorbeeld'), k = el('tbBalkKnop');
    if (v) v.innerHTML = balkVoorbeeldHTML(kz);
    if (k) k.innerHTML = balkKnopHTML(kz);
    balkHoogte();
  };
  window.toebehorenBalkToepassen = function () {
    if (magNiet() || latSlot()) { renderToebehoren(); return; }
    var doel = gekozenRuiten();
    if (!doel.length || !balkGekozen() || diepteLees(balk.diepte) === undefined) return;
    var p = deelVoorWijzigen(); if (!p) return;
    if (window.bewaarStap) bewaarStap('Latten gekozen ruiten');
    var overgeslagen = [];
    doel.forEach(function (r) {
      var res = keuzeOp(perRuitVan(r), r, balk);
      if (res.overgeslagen) overgeslagen.push(r.merk || '(zonder merk)');
      zetHeleRuit(p, r.id, res.e);
    });
    balk = leegBalk();
    bewaarEnTeken();
    if (window.kortBericht) kortBericht('Toegepast op ' + doel.length + (doel.length === 1 ? ' ruit.' : ' ruiten.'),
      { soort: 'info', knop: '↶ Terugzetten', actie: function () { if (window.ongedaan) ongedaan(); }, ms: 12000 });
    if (overgeslagen.length && window.appMelding) {
      appMelding('De onderlat is niet gewijzigd bij ' + overgeslagen.length + (overgeslagen.length === 1 ? ' ruit' : ' ruiten') +
        ' met latzijde binnen (' + overgeslagen.slice(0, 12).join(', ') + (overgeslagen.length > 12 ? ' …' : '') + '): ' +
        'neuslatten en ventilatielatten zijn alleen voor buiten.', { kop: 'Alleen voor buiten' });
    }
  };
  // De hoogte van de balk, zodat de onderkant van de pagina en een kort
  // bericht er niet onder verdwijnen.
  function balkHoogte() {
    var b = el('tbActiebalk');
    try { document.documentElement.style.setProperty('--tb-balk-h', (b ? b.offsetHeight : 0) + 'px'); } catch (e) { /* oude browser */ }
  }

  // De balk "Alle ruiten" (v115): zijde, glaslat en/of onderlat in één stap.
  // v120 (controle v119): eerst zeggen wat er gaat veranderen, en daarna een
  // knop om het terug te zetten (één stap ongedaan maken).
  window.toebehorenAlles = async function () {
    if (magNiet() || latSlot()) { renderToebehoren(); return; }
    var z = el('tbAlleZijde'), l = el('tbAlleLat'), o = el('tbAlleOnderlat');
    var zw = z ? z.value : '-', lw = l ? l.value : '-', ow = o ? o.value : '-';
    if (zw === '-' && lw === '-' && ow === '-') {
      if (window.kortBericht) kortBericht('Kies eerst wat er moet veranderen (latzijde, glaslat of onderlat).', { soort: 'info' });
      return;
    }
    // v121 (P3): dit blok is voor alle ruiten; gekozen ruiten gaan via de balk.
    var doel = (rijen || []).filter(heeftInhoud);
    var alleen = false;
    if (!doel.length) return;
    var optieTekst = function (sel) { return sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].textContent : ''; };
    var wat = [zw !== '-' ? optieTekst(z) : '', lw !== '-' ? optieTekst(l) : '', ow !== '-' ? optieTekst(o) : ''].filter(Boolean);
    var merken = doel.map(function (r) { return r.merk || '(zonder merk)'; });
    if (window.appVraag && !await appVraag((alleen ? 'Bij de ' + doel.length + ' gekozen ' : 'Bij alle ' + doel.length + ' ') +
        (doel.length === 1 ? 'ruit' : 'ruiten') + ' (' + merken.slice(0, 12).join(', ') + (merken.length > 12 ? ' …' : '') + '):\n• ' +
        wat.join('\n• ') + '\n\nWat per ruit al anders gekozen was, wordt overschreven. Je kunt het daarna terugzetten.',
        { kop: alleen ? 'Gekozen ruiten wijzigen' : 'Alle ruiten wijzigen', ja: 'Toepassen' })) return;
    if (magNiet() || latSlot()) { renderToebehoren(); return; }
    var p = deelVoorWijzigen(); if (!p) return;
    if (window.bewaarStap) bewaarStap('Latten ' + (alleen ? 'gekozen' : 'alle') + ' ruiten');
    var overgeslagen = [];
    doel.forEach(function (r) {
      // De zijde zoals hij na deze stap is (v117: binnen = geen neus/ventilatie onderin).
      var zNa = zw !== '-' ? zw : (GL() ? GL().zijde(r) : '');
      if (zw !== '-') { zetPerRuit(p, r.id, 'latZijde', GL() && GL().ZIJDEN.indexOf(zw) >= 0 ? zw : ''); zetPerRuit(p, r.id, 'tweeKanten', ''); }
      if (lw !== '-') {
        var d = lw.split('|');
        var lat = GL() && GL().latVan(d[0]);
        zetPerRuit(p, r.id, 'glaslat', lat && geldigeLat(d[0], 'boven') ? d[0] : '');
        zetPerRuit(p, r.id, 'latOmgekeerd', d[1] === 'om' && lat && GL().draaibaar(lat) ? true : '');
      }
      if (ow !== '-') {
        var w = onderNaam(ow);
        if (GL() && !GL().onderMagBij(r, w, zNa)) overgeslagen.push(r.merk || '(zonder merk)');
        else zetPerRuit(p, r.id, 'onderlat', geldigeLat(w, 'onder') ? w : '');
      }
    });
    alleKeuze = { zijde: '-', lat: '-', onder: '-' };
    bewaarEnTeken();
    if (window.kortBericht) kortBericht('Toegepast op ' + doel.length + (doel.length === 1 ? ' ruit.' : ' ruiten.'),
      { soort: 'info', knop: '↶ Terugzetten', actie: function () { if (window.ongedaan) ongedaan(); }, ms: 12000 });
    // v117 (Jan): bij latzijde binnen nooit een neus- of ventilatielat. Niet
    // stil overslaan: zeggen welke ruiten.
    if (overgeslagen.length && window.appMelding) {
      appMelding('De onderlat is niet gewijzigd bij ' + overgeslagen.length + (overgeslagen.length === 1 ? ' ruit' : ' ruiten') +
        ' met latzijde binnen (' + overgeslagen.slice(0, 12).join(', ') + (overgeslagen.length > 12 ? ' …' : '') + '): ' +
        'neuslatten en ventilatielatten zijn alleen voor buiten.', { kop: 'Alleen voor buiten' });
    }
  };
  // De keuzes in de balk "Alle ruiten" onthouden (v117), zodat het voorbeeld
  // van de glaslat blijft staan als de tabel opnieuw getekend wordt.
  var alleKeuze = { zijde: '-', lat: '-', onder: '-' };
  window.toebehorenAlleKies = function (wat, waarde) {
    alleKeuze[wat] = waarde;
    if (wat === 'lat') { var v = el('tbAlleVoorbeeld'); if (v) v.outerHTML = alleVoorbeeldHTML(); }
  };
  // Een voorbeeld van de gekozen glaslat (v117, wens Jan): foto, maten, en
  // tik voor groot (met de maattekening).
  function alleVoorbeeldHTML() {
    var L = GL();
    var d = String(alleKeuze.lat || '-').split('|');
    var l = L && d[0] !== '-' ? (d[0] ? L.latVan(d[0]) : L.latVan(L.project().lat)) : null;
    if (!l) return '<span id="tbAlleVoorbeeld" class="tb-alle-voorbeeld" hidden></span>';
    var om = d[1] === 'om';
    return '<span id="tbAlleVoorbeeld" class="tb-alle-voorbeeld" role="button" tabindex="0" title="Tik om groot te zien" onclick="GlasLatten.groot(\'' + esc(l.id) + '\')">' +
      L.plaatje(l, 44) + (L.draaibaar(l) ? L.montageSVG(l, om, 44) : '') +
      '<span><b>' + esc(l.id) + '</b> ' + esc(l.maat) + (L.draaibaar(l) ? ' · ' + (om ? 'omgekeerd' : 'normaal') : '') +
      (d[0] ? '' : ' (projectstandaard)') + '<small>' + L.latInfo(l) + '</small></span></span>';
  }
  // Na een wijziging in latten.js: Toebehoren opnieuw tekenen als het open
  // staat. Een tik later, zodat het vak waar je naartoe tabt al de focus
  // heeft; renderToebehoren zet die focus daarna terug (data-sleutel).
  // Is er net een tik of klik begonnen, dan pas tekenen als die klaar is:
  // anders verdwijnt het knopje onder je vinger en gebeurt er niets (v115).
  // v120 (controle v119): Enter in een vak voor de diepte gaat naar hetzelfde
  // vak van de volgende ruit (meten langs de gevel: typen, Enter, typen).
  // Het vak verlaten bewaart de waarde (change); het opnieuw tekenen zet de
  // focus terug op het vak dat hem dan heeft, dus op het volgende.
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key !== 'Enter' || !t || !t.matches || !t.matches('input.tb-mm[data-sleutel]')) return;
    e.preventDefault();
    var soort = t.getAttribute('data-sleutel').replace(/-\d+$/, '-');
    var lijst = Array.prototype.slice.call(document.querySelectorAll('input.tb-mm[data-sleutel^="' + soort + '"]'))
      .filter(function (v) { return v.offsetParent !== null && !v.disabled; });
    var volgende = lijst[lijst.indexOf(t) + 1];
    if (volgende) { volgende.focus(); if (volgende.select) volgende.select(); }
    else t.blur();
  }, true);
  var gepland = null, druk = false, naDruk = false;
  document.addEventListener('pointerdown', function () { druk = true; }, true);
  ['pointerup', 'pointercancel'].forEach(function (t) {
    document.addEventListener(t, function () {
      setTimeout(function () { druk = false; if (naDruk) { naDruk = false; later(); } }, 0);
    }, true);
  });
  function later() {
    if (druk) { naDruk = true; return; }
    if (gepland) return;
    gepland = setTimeout(function () {
      gepland = null;
      var pan = el('panel-toebehoren');
      if (pan && pan.classList.contains('active')) renderToebehoren();
    }, 0);
  }
  window.toebehorenNaWijziging = later;

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
    if (w === 'NEUS' || w === 'ZELFDE') return wat === 'onder';
    var l = GL() && GL().latVan(w);
    return !!l && (wat === 'onder' || (l.soort !== 'neuslat' && l.soort !== 'ventilatie'));
  }

  // Welke kaartjes op de telefoon open staan (v114). Alleen in het geheugen:
  // na herladen is alles weer dicht.
  var openKaarten = {};
  window.toebehorenKaart = function (id) {
    if (openKaarten[id]) delete openKaarten[id]; else openKaarten[id] = true;
    renderToebehoren();
  };

  // De groepen per foto of tekening, in de volgorde van Invoer; daarna de
  // losse regels. sleutel: het id van de foto, of '' voor de losse regels.
  function groepen(perRuit) {
    var fotoLijst = window.werkFotos ? werkFotos() : [];
    var bekend = {};
    fotoLijst.forEach(function (f) { bekend[f.id] = f; });
    var uit = fotoLijst.map(function (f, i) {
      return { sleutel: f.id, foto: f, titel: f.titel || ((f.pad && window.soortNaam ? soortNaam(f, true) : 'Groep') + ' ' + (i + 1)), ruiten: [] };
    });
    var los = { sleutel: '', foto: null, titel: 'Losse regels (zonder foto)', ruiten: [] };
    var per = {};
    uit.forEach(function (g) { per[g.sleutel] = g; });
    perRuit.forEach(function (p) {
      var g = p.rij.fotoId && bekend[p.rij.fotoId] ? per[p.rij.fotoId] : los;
      g.ruiten.push(p);
    });
    return uit.concat([los]).filter(function (g) { return g.ruiten.length; });
  }
  function groepRuiten(sleutel) {
    return (rijen || []).filter(heeftInhoud).filter(function (r) {
      var fotoLijst = window.werkFotos ? werkFotos() : [];
      var heeft = r.fotoId && fotoLijst.some(function (f) { return f.id === r.fotoId; });
      return sleutel ? r.fotoId === sleutel : !heeft;
    });
  }
  function getalVak(v) { return v != null && v !== '' ? String(v).replace('.', ',') : ''; }
  function chipHTML(p) {
    var sl = p.oordeel && p.oordeel.slechtste;
    var L = GL();
    if (!sl || !L) return '';
    var st = sl.status === 'onbekend' ? 'leeg' : sl.status === 'geen' ? 'geen' : sl.status.replace(' ', '-');
    var tekst = sl.status === 'onbekend' ? (p.zijde ? '?' : 'zijde?') : L.kortRuit(p.oordeel);
    var titel = sl.status === 'onbekend' ? (sl.reden || '') : (p.oordeel.boven.tekst || '') + (p.oordeel.onder && p.oordeel.onder.tekst ? ' · ' + p.oordeel.onder.tekst : '') +
      (p.oordeel.max ? ' · ' + p.oordeel.max.tekst : '');
    // Altijd aan te tikken (ook op slot: dan om te kijken).
    return '<button type="button" class="pk-chip pk-' + st + ' vrij-bij-slot" onclick="latPakket(' + p.rij.id + ')" title="' + esc(titel) + '">' + esc(tekst) + '</button>';
  }
  function perRuitHTML(u, latUit, uit) {
    var L = GL();
    var h = [];
    var sel = function (v, w) { return String(v) === String(w) ? ' selected' : ''; };
    var zijdeAlle = '<select id="tbAlleZijde" onchange="toebehorenAlleKies(\'zijde\', this.value)"' + latUit + '><option value="-"' + sel('-', alleKeuze.zijde) +
      '>zijde: niet wijzigen</option><option value=""' + sel('', alleKeuze.zijde) + '>zijde: ?</option>' +
      (L ? L.ZIJDEN.map(function (z) { return '<option value="' + z + '"' + sel(z, alleKeuze.zijde) + '>zijde: ' + esc(L.ZIJDE_NAAM[z]) + '</option>'; }).join('') : '') + '</select>';
    var latAlle = '<select id="tbAlleLat" onchange="toebehorenAlleKies(\'lat\', this.value)"' + latUit + '><option value="-"' + sel('-', alleKeuze.lat) +
      '>glaslat: niet wijzigen</option><option value=""' + sel('', alleKeuze.lat) + '>glaslat: projectstandaard</option>' +
      (L ? L.LATTEN.filter(function (l) { return geldigeLat(l.id, 'boven'); }).map(function (l) {
        return '<option value="' + esc(l.id) + '"' + sel(l.id, alleKeuze.lat) + '>' + esc(l.id + ' ' + l.maat) + '</option>' +
          (L.draaibaar(l) ? '<option value="' + esc(l.id) + '|om"' + sel(l.id + '|om', alleKeuze.lat) + '>' + esc(l.id + ' ' + l.maat + ' omgekeerd') + '</option>' : '');
      }).join('') : '') + '</select>';
    var onderAlle = latKeuze('onder', alleKeuze.onder, 'id="tbAlleOnderlat" onchange="toebehorenAlleKies(\'onder\', this.value)"' + latUit,
      [['-', 'onderlat: niet wijzigen'], ['', 'onderlat: automatisch'], ['ZELFDE', 'onderlat: zelfde als boven']]);
    // v118 (Jan): de balk "Alle ruiten" los en duidelijk voor het hele
    // project; daaronder per tabel van Invoer (foto, tekening, losse regels)
    // een eigen tabel met een eigen kopregel, ónder de foto.
    // v118 (controle): het blok voor het hele project vóór de kop "Per ruit",
    // anders leest het als een deel van de keuzes per ruit.
    var kz = gekozenRuiten();
    // v121 (P3): met aangevinkte ruiten werk je in de balk onderin; dit blok
    // is dan alleen een korte regel (anders twee plekken voor hetzelfde).
    if (kz.length && !latUit) {
      h.push('<div class="tb-alles-blok tb-alles-gekozen"><div class="tb-alles-kop"><b>' + kz.length +
        (kz.length === 1 ? ' ruit gekozen' : ' ruiten gekozen') + '</b><small>Wijzig ze met de balk onderin het scherm. ' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="toebehorenKiesWissen()">Kiezen wissen</button></small></div></div>');
    } else {
      h.push('<div class="tb-alles-blok"><div class="tb-alles-kop">' +
        '<b>Voor het hele project (alle ruiten)</b>' +
        '<small>Kies wat je bij álle ruiten wilt veranderen en tik op Toepassen. "niet wijzigen" laat het per ruit staan. ' +
        'Alleen een paar ruiten? Vink ze hieronder aan (☐ bij het merk); dan komt onderin een balk met een voorbeeld.</small></div>' +
        '<div class="tb-alles">' + zijdeAlle + latAlle + alleVoorbeeldHTML() + onderAlle +
        ' <button class="btn btn-secondary btn-sm" onclick="toebehorenAlles()"' + latUit + '>Toepassen op alle ruiten</button></div></div>');
    }
    h.push('<h3 class="tb-perruit-titel">Per ruit: latten kiezen</h3>');
    h.push('<div class="tb-uitleg">Kies per ruit aan welke kant de latten zitten, welke glaslat en wat er onderin komt. ' +
      'Tik op het oordeel voor de tekening en wat wel past. <b>geen (meegeleverd)</b>: nieuwe kozijnen met latten (bijv. uit een csv): ' +
      'dan telt alleen band, kit en tape.</div>');
    // v118: vaste kolombreedtes op een groot scherm (CSS), zodat de kolommen
    // van de tabellen per foto onder elkaar staan. Geen col voor de
    // telefoonkolom (die is daar verborgen en zou anders een lege kolom geven).
    var kop = '<colgroup>' + ['merk', 'type', 'opb', 'dikte', 'pakket', 'diepte', 'onder', 'zijde', 'lat', 'olat', 'band', 'bandb', 'oordeel', 'nodig']
      .map(function (c) { return '<col class="tbc-' + c + '">'; }).join('') + '</colgroup><thead><tr>' +
      '<th class="tb-smal">Merk</th><th class="tb-smal">Glastype</th><th class="tb-smal">Opbouw</th><th class="num tb-smal">Glas dikte</th>' +
      '<th class="num tb-smal" title="Glas + band binnen en buiten (zonder lat); daaronder met de lat in de sponning, en het max glaspakket uit de maatstaat">Pakket dikte</th>' +
      '<th class="num tb-smal" title="Sponningdiepte zij en boven (bruikbaar)">Sponning diepte</th><th class="num tb-smal" title="Sponningdiepte onder (leeg = gelijk aan zij en boven)">Sponning diepte onder</th>' +
      '<th class="tb-smal">Latzijde</th><th class="tb-smal">Glaslat type</th><th class="tb-smal">Onderlat type</th><th class="tb-smal">Band dikte binnen</th>' +
      '<th class="tb-smal">Band dikte buiten</th><th class="tb-smal">Oordeel</th><th class="tb-smal">Nodig</th><th class="tb-kort-kop"></th></tr></thead>';
    groepen(u.perRuit).forEach(function (g) {
      var zijden = g.ruiten.map(function (p) { return p.zijde; });
      var zelfde = zijden.every(function (z) { return z === zijden[0]; }) ? zijden[0] : '-';
      var groepZijde = '<label class="tb-groep-zijde">latzijde voor deze ' + (g.foto ? 'foto' : 'regels') + ': <select onchange="toebehorenGroepZijde(\'' + esc(g.sleutel) + '\', this.value)"' + latUit + '>' +
        (zelfde === '-' ? '<option value="-" selected>gemengd</option>' + (L ? L.zijdeOpties('-').replace(' selected', '') : '')
          : (L ? L.zijdeOpties(zelfde) : '')) + '</select></label>';
      var plaat = g.foto && g.foto.pad && window.fotoVoorbeeldHTML ? fotoVoorbeeldHTML(g.foto.id, { klein: true }) : '';
      var aantal = g.ruiten.reduce(function (n, p) { return n + p.n; }, 0);
      h.push('<section class="tb-groep"><div class="tb-groep-in">' + plaat +
        '<div class="tb-groep-tekst"><b>' + esc(g.titel) + '</b><span>' + aantal + (aantal === 1 ? ' ruit' : ' ruiten') + '</span>' + groepZijde +
        '<button type="button" class="btn btn-ghost btn-sm tb-kies-groep" onclick="toebehorenKiesGroep(\'' + esc(g.sleutel) + '\')">' +
        (g.ruiten.every(function (p) { return gekozen[p.rij.id]; }) ? '☑ niet meer kiezen' : '☐ deze ' + (g.foto ? 'foto' : 'regels') + ' kiezen') + '</button></div></div>' +
        '<div class="invoer-wrap tb-wrap"><table class="samenvatting tb-tabel">' + kop + '<tbody>' +
        g.ruiten.map(function (p) { return ruitRij(p, latUit, uit); }).join('') + '</tbody></table></div></section>');
    });
    return h.join('');
  }
  function ruitRij(p, latUit, uit) {
    var L = GL();
    var r = p.rij, id = r.id;
    var e = perRuitVan(r);
    var open = openKaarten[id];
    var geen = p.geen;
    var glasUit = latUit;   // glas volgt het slot van de maten (slotWeigert)
    var typeSel = '<select class="tb-glastype" data-sleutel="type-' + id + '" aria-label="Glastype ' + esc(r.merk || '') +
      '" onchange="toebehorenGlas(' + id + ', \'glasType\', this.value)"' + glasUit + '>' +
      (window.glasTypeKeuzeHTML ? glasTypeKeuzeHTML(r) : '<option>' + esc(r.glasType || '') + '</option>') + '</select>';
    var opbSel = '<select class="tb-opbouw" data-sleutel="opb-' + id + '" aria-label="Opbouw ' + esc(r.merk || '') +
      '" onchange="toebehorenGlas(' + id + ', \'opbouw\', this.value)"' + glasUit + '>' +
      (window.opbouwKeuzeHTML ? opbouwKeuzeHTML(r) : '<option>' + esc(r.opbouw || '') + '</option>') + '</select>';
    var diepte = '<input type="text" inputmode="decimal" class="tb-mm" data-sleutel="diepte-' + id + '" value="' + esc(getalVak(e.sponningDiepte)) +
      '" placeholder="mm" aria-label="Diepte zij en boven ' + esc(r.merk || '') + '" onchange="toebehorenDiepte(' + id + ', \'boven\', this.value)"' + latUit + '>';
    var onder = '<input type="text" inputmode="decimal" class="tb-mm" data-sleutel="onder-' + id + '" value="' + esc(getalVak(e.diepteOnder)) +
      '" placeholder="' + esc(getalVak(e.sponningDiepte) || 'mm') + '" title="Leeg = gelijk aan zij en boven" aria-label="Diepte onder ' + esc(r.merk || '') +
      '" onchange="toebehorenDiepte(' + id + ', \'onder\', this.value)"' + latUit + '>';
    var zijde = '<select class="tb-zijde-sel' + (p.zijde ? '' : ' leeg') + '" data-sleutel="zijde-' + id + '" aria-label="Latzijde ' + esc(r.merk || '') +
      '" onchange="toebehorenZijde(' + id + ', this.value)"' + latUit + '>' + (L ? L.zijdeOpties(p.zijde) : '') + '</select>';
    var latL = L ? L.latVoorRuit(r) : null;
    var latKnop = geen || !latL ? '<span class="tb-geen">—</span>'
      : '<button type="button" class="lat-knop' + (e.glaslat ? ' eigen' : '') + '" data-sleutel="lat-' + id + '" onclick="latKiezen(' + id + ')" title="' +
        esc(latL.naam + (e.glaslat ? '' : ' (projectstandaard)')) + '"' + latUit + '>' + esc(latL.id) + (p.omgekeerd ? ' <small>omgekeerd −' + String(latL.eigenSponning).replace('.', ',') + '</small>' : '') +
        (e.glaslat ? '' : ' <small>std</small>') + ' ▾</button>';
    var onderKnop = geen || !L ? '<span class="tb-geen">—</span>'
      : '<button type="button" class="lat-knop' + (p.eigenOnderlat ? ' eigen' : '') + '" data-sleutel="olat-' + id + '" onclick="latOnderKiezen(' + id + ')" title="' + (p.eigenOnderlat ? 'Zelf gekozen' : 'Automatisch (volgt de latzijde)') + '"' + latUit + '>' +
        esc(L.keuzeNaam(r)) +
        // v121 (Jan): bij beide zonder eigen keuze een stille hint in de knop
        // zelf (blijft staan, ook na Begrepen).
        (p.zijde === 'beide' && !p.eigenOnderlat ? ' <small class="tb-hint">beide kanten</small>' : '') + ' ▾</button>';
    var std = L ? L.project().bandBinnen : 3;
    // Ook bij "geen (meegeleverd)": band en kit tellen wel (v115).
    var BB = L ? L.BAND_BINNEN : [2, 3, 4, 5], BU = L ? L.BAND_BUITEN : [3, 4, 5];
    var band = '<select class="tb-band" data-sleutel="band-' + id + '" aria-label="Band dikte binnen ' + esc(r.merk || '') +
      '" onchange="latBand(' + id + ', this.value)"' + latUit + '>' +
      '<option value=""' + (e.bandBinnen ? '' : ' selected') + '>std ' + std + '</option>' +
      BB.map(function (b) { return '<option value="' + b + '"' + (+e.bandBinnen === b ? ' selected' : '') + '>' + b + ' mm' + (b === 5 ? ' (2+3)' : '') + '</option>'; }).join('') + '</select>';
    // v118 (wens Jan): band buiten per ruit (3, 4, 5; 5 = 2 + 3 op elkaar).
    var stdBuiten = L ? L.project().bandBuiten : 3;
    var bandBuiten = '<select class="tb-band" data-sleutel="bandb-' + id + '" aria-label="Band dikte buiten ' + esc(r.merk || '') +
      '" onchange="latBandBuiten(' + id + ', this.value)"' + latUit + '>' +
      '<option value=""' + (e.bandBuiten ? '' : ' selected') + '>std ' + stdBuiten + '</option>' +
      BU.map(function (b) { return '<option value="' + b + '"' + (+e.bandBuiten === b ? ' selected' : '') + '>' + b + ' mm' + (b === 5 ? ' (2+3)' : '') + '</option>'; }).join('') + '</select>';
    var nodig = esc(geen ? 'latten meegeleverd' : nl(p.latM, 1) + ' m lat') + '<br>' + esc([nl(p.bandM, 1) + ' m band', nl(p.kitMl) + ' ml kit']
      .concat(p.roeden === 'zelf' ? ['tape zelf'] : p.tapeM ? [nl(p.tapeM, 1) + ' m tape'] : []).join(' · '));
    var dikte = r.totaalDikte != null && r.totaalDikte !== '' ? String(r.totaalDikte).replace('.', ',') : '—';
    // v117 (wens Jan): de dikte van het pakket, zonder en met lat, en het
    // max glaspakket uit de maatstaat (rood als het te dik is).
    var pd = L ? L.pakketDikte(r) : null;
    var mx = p.oordeel && p.oordeel.max;
    var mm = function (x) { return String(Math.round(x * 10) / 10).replace('.', ','); };
    var pakketHTML = !pd ? '—' : '<span title="glas ' + esc(mm(pd.glas)) + ' + band ' + esc(mm(pd.band)) + ' mm">' + esc(mm(pd.zonder)) + '</span>' +
      (pd.met != null && pd.met !== pd.zonder ? '<small class="tb-pk-met">met lat ' + esc(mm(pd.met)) + '</small>' : '') +
      (pd.max ? '<small class="tb-pk-max' + (mx && mx.status === 'past niet' ? ' te-dik' : '') + '">max ' + esc(mm(pd.max)) + '</small>' : '');
    // De klassen tb-… en data-kop zijn voor de telefoon: daar wordt elke rij
    // een kaartje (CSS), dicht één regel (v114, keuze Jan); tik voor de rest.
    var kortTekst = (p.zijde ? (L ? L.ZIJDE_NAAM[p.zijde] : p.zijde) : '?') + (geen ? '' : ' · ' + (latL ? latL.id : '') + ' · onder ' + (L ? L.keuzeNaam(r) : ''));
    return '<tr class="tb-ruit' + (open ? '' : ' dicht') + (geen ? ' tb-zonder' : '') + (gekozen[id] ? ' tb-gekozen' : '') + '">' +
      '<td class="tb-smal tb-merk"' + (p.n > 1 ? ' data-aant="×' + p.n + '"' : '') + '><label class="tb-kies"><input type="checkbox" data-sleutel="kies-' + id + '"' +
        (gekozen[id] ? ' checked' : '') + ' onchange="toebehorenKies(' + id + ', this.checked)" aria-label="Kies ' + esc(r.merk || 'ruit') + '"' + latUit + '></label>' +
        '<b>' + esc(r.merk || '—') + '</b>' + (p.n > 1 ? ' <small>×' + p.n + '</small>' : '') + '</td>' +
      '<td class="tb-smal tb-type" data-kop="Glastype">' + typeSel + '</td>' +
      '<td class="tb-smal tb-opb" data-kop="Opbouw">' + opbSel + '</td>' +
      '<td class="num tb-smal tb-dikte" data-kop="Glas dikte">' + esc(dikte) + '</td>' +
      '<td class="num tb-smal tb-pakket" data-kop="Pakket dikte">' + pakketHTML + '</td>' +
      '<td class="num tb-smal tb-diepte" data-kop="Sponning diepte">' + diepte + '</td>' +
      '<td class="num tb-smal tb-onder" data-kop="Sponning diepte onder">' + onder + '</td>' +
      '<td class="tb-smal tb-zijde' + (p.zijde ? '' : ' leeg') + '" data-kop="Latzijde">' + zijde + '</td>' +
      '<td class="tb-smal tb-lat" data-kop="Glaslat type">' + latKnop + '</td>' +
      '<td class="tb-smal tb-olat" data-kop="Onderlat type">' + onderKnop + '</td>' +
      '<td class="tb-smal tb-bandkol" data-kop="Band dikte binnen">' + band + '</td>' +
      '<td class="tb-smal tb-bandbuiten" data-kop="Band dikte buiten">' + bandBuiten + '</td>' +
      '<td class="tb-smal tb-oordeel" data-kop="Oordeel">' + chipHTML(p) + '</td>' +
      '<td class="tb-nodig" data-kop="Nodig">' + nodig + '</td>' +
      '<td class="tb-kort"><button type="button" class="tb-kort-knop" onclick="toebehorenKaart(' + id + ')" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        (open ? '✕ inklappen' : '▸ ' + (p.zijde ? '' : '<span class="tb-kort-leeg">zijde?</span> ') + esc(p.zijde ? kortTekst : kortTekst.replace(/^\?/, ''))) + '</button></td></tr>';
  }

  // Het scherm bijwerken zonder weg te gooien wat er al staat (v115, uit de
  // controle). De tabel wordt na elke wijziging opnieuw opgebouwd; door alles
  // te vervangen verdween de cursor uit het vak waar je naartoe tabde (op
  // een iPad ook het toetsenbord), en ging een klik verloren die al begonnen
  // was. Nu: zelfde opbouw → alleen de cellen die anders zijn; het vak met de
  // focus blijft staan (alleen placeholder, uit/aan en klasse worden
  // bijgewerkt). Anders opbouw → alles opnieuw, met de focus terug.
  function zelfdeOpbouw(a, b) {
    if (a.children.length !== b.children.length) return false;
    for (var i = 0; i < a.children.length; i++) {
      if (a.children[i].tagName !== b.children[i].tagName || a.children[i].className !== b.children[i].className) return false;
    }
    return true;
  }
  function vakBij(oudEl, nieuwEl) {
    // Het vak met de focus: de bewaarde waarde tonen (bijv. "44,0" → "44").
    if (oudEl.tagName === 'INPUT' && nieuwEl.hasAttribute('value') && oudEl.value !== nieuwEl.getAttribute('value')) oudEl.value = nieuwEl.getAttribute('value');
    ['placeholder', 'disabled', 'class', 'title'].forEach(function (a) {
      if (nieuwEl.hasAttribute(a)) { if (oudEl.getAttribute(a) !== nieuwEl.getAttribute(a)) oudEl.setAttribute(a, nieuwEl.getAttribute(a)); }
      else if (oudEl.hasAttribute(a)) oudEl.removeAttribute(a);
    });
  }
  // Wat er nu in een vak staat kan anders zijn dan in de HTML (getypt of
  // gekozen, en door de app geweigerd): dan ook vervangen, anders blijft
  // bijv. "abc" staan (controle v115).
  function waardenAnders(el) {
    return Array.prototype.some.call(el.querySelectorAll('input, select'), function (v) {
      if (v === document.activeElement) return false;
      if (v.tagName === 'SELECT') {
        var o = v.querySelector('option[selected]') || v.options[0];
        return !!o && v.value !== o.value;
      }
      if (v.type === 'checkbox') return v.checked !== v.hasAttribute('checked');
      return v.value !== (v.getAttribute('value') || '');
    });
  }
  function celBij(oud, nieuw) {
    if (oud.outerHTML === nieuw.outerHTML && !waardenAnders(oud)) return;
    var act = document.activeElement;
    if (act && oud.contains(act) && act.getAttribute('data-sleutel')) {
      var tegen = nieuw.querySelector('[data-sleutel="' + act.getAttribute('data-sleutel') + '"]');
      if (tegen && oud.children.length === 1 && nieuw.children.length === 1) { vakBij(act, tegen); return; }
    }
    vervang(nieuw, oud);
  }
  function rijBij(oud, nieuw) {
    if (oud.outerHTML === nieuw.outerHTML && !waardenAnders(oud)) return;
    if (oud.cells.length !== nieuw.cells.length) { vervang(nieuw, oud); return; }
    if (oud.className !== nieuw.className) oud.className = nieuw.className;
    var nc = Array.prototype.slice.call(nieuw.cells);
    Array.prototype.slice.call(oud.cells).forEach(function (c, i) { celBij(c, nc[i]); });
  }
  // Tijdens het vervangen kan een vak de focus verliezen (blur → change),
  // en dat tekent weer opnieuw (controle v115: "replaceChild: no longer a
  // child"). Dan eerst dit afmaken en daarna nog een keer tekenen.
  var bezig = false, nogEens = false;
  function zetInhoud(vak, html) {
    if (bezig) { nogEens = true; return; }
    bezig = true;
    try { zetInhoudNu(vak, html); } finally { bezig = false; }
    if (nogEens) { nogEens = false; renderToebehoren(); }
  }
  function vervang(nieuw, oud) {
    if (oud.parentNode) oud.parentNode.replaceChild(nieuw, oud);
  }
  function zetInhoudNu(vak, html) {
    var nieuw = document.createElement('div');
    nieuw.innerHTML = html;
    var oudeRijen = vak.querySelectorAll('.tb-tabel tr'), nieuweRijen = nieuw.querySelectorAll('.tb-tabel tr');
    if (zelfdeOpbouw(vak, nieuw) && oudeRijen.length && oudeRijen.length === nieuweRijen.length &&
        vak.querySelectorAll('.tb-tabel').length === nieuw.querySelectorAll('.tb-tabel').length) {
      // v118: per foto een eigen tabel (in een section); daarbinnen ook alleen
      // vervangen wat anders is, en de tabellen zelf per rij (hieronder).
      var kinderen = function (oudP, nieuwP) {
        var oudKids = Array.prototype.slice.call(oudP.children), nieuwKids = Array.prototype.slice.call(nieuwP.children);
        oudKids.forEach(function (k, i) {
          var n = nieuwKids[i];
          if (!n) return;
          if (k.classList.contains('tb-wrap')) return;
          if (k.querySelector('.tb-tabel') && zelfdeOpbouw(k, n)) { kinderen(k, n); return; }
          if (k.outerHTML !== n.outerHTML || waardenAnders(k) || k.contains(document.activeElement)) vervang(n, k);
        });
      };
      kinderen(vak, nieuw);
      var nr = Array.prototype.slice.call(nieuweRijen);
      Array.prototype.slice.call(oudeRijen).forEach(function (tr, i) { rijBij(tr, nr[i]); });
      return;
    }
    // Andere opbouw: alles opnieuw; de focus en de schuifstand terugzetten.
    var act = document.activeElement;
    var sleutel = act && act.getAttribute ? act.getAttribute('data-sleutel') : null;
    var sel = null;
    try { if (sleutel && act.selectionStart != null) sel = [act.selectionStart, act.selectionEnd]; } catch (e) { sel = null; }
    var wrap = vak.querySelector('.tb-wrap');
    var links = wrap ? wrap.scrollLeft : 0;
    vak.innerHTML = html;
    wrap = vak.querySelector('.tb-wrap');
    if (wrap && links) wrap.scrollLeft = links;
    if (sleutel) {
      var terug = vak.querySelector('[data-sleutel="' + sleutel + '"]');
      if (terug && !terug.disabled) {
        try { terug.focus({ preventScroll: true }); } catch (e) { terug.focus(); }
        try { if (sel && terug.setSelectionRange) terug.setSelectionRange(sel[0], sel[1]); } catch (e) { /* select: geen selectie */ }
      }
    }
  }

  function renderToebehoren() {
    var vak = el('toebehorenInhoud');
    if (!vak) return;
    var u = bereken(typeof rijen === 'undefined' ? [] : rijen);
    var regel = window.toebehorenUitleg(u);
    var g = u.instellingen.getallen, k = u.instellingen.keuze, afw = u.instellingen.afwijkend;
    var kijken = !!(window.glasAlleenKijken && glasAlleenKijken());
    var uit = kijken ? ' disabled' : '';
    // v114 (keuze Jan: "Mee op slot"): de latkeuzes per ruit (zijde, onderlat)
    // staan na een bestelling vast, net als de maten. De instellingen van het
    // project (band, kit, verlies) blijven vrij.
    var latUit = uit || (window.invoerOpSlot && invoerOpSlot() ? ' disabled' : '');
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
      var sl = p.oordeel && p.oordeel.slechtste;
      return !!sl && (sl.status === 'past niet' || sl.status === 'te ruim');
    });
    if (mis.length) {
      h.push('<div class="tb-strook">⚠ Bij ' + (mis.length === 1 ? '1 ruit past' : mis.length + ' ruiten past') + ' het niet goed in de sponning: ' +
        esc(mis.slice(0, 12).map(function (p) { return p.rij.merk || '(zonder merk)'; }).join(', ')) + (mis.length > 12 ? ' …' : '') +
        '. Los dat eerst op (tik hieronder op het oordeel voor wat wel past); de latten gaan uit van wat er nu staat.</div>');
    }
    // v114: ruiten zonder latzijde (Jan: verplicht kiezen). Alleen als het
    // project de latten bijhoudt (ergens een diepte of een zijde), anders
    // zou elk project zonder sponningmaten deze melding krijgen.
    var zonderZijde = u.perRuit.filter(function (p) { return !p.zijde; });
    if (zonderZijde.length && u.perRuit.some(function (p) { return p.diepte > 0 || p.zijde; })) {
      h.push('<div class="tb-strook">⚠ Bij ' + (zonderZijde.length === 1 ? '1 ruit' : zonderZijde.length + ' ruiten') +
        ' is nog niet gekozen of de latten binnen of buiten zitten: ' +
        esc(zonderZijde.slice(0, 12).map(function (p) { return p.rij.merk || '(zonder merk)'; }).join(', ')) + (zonderZijde.length > 12 ? ' …' : '') +
        '. Kies het hieronder (kolom Latzijde, of per foto "latzijde hier"; "geen" als de latten worden meegeleverd)' +
        (window.invoerOpSlot && invoerOpSlot() ? ', na ontgrendelen (op slot na de bestelling)' : '') +
        '; tot dan rekent de app onderin met dezelfde lat als boven.</div>');
    }
    // v119 (keuze Jan: latten nooit laten uitsteken): een A5 die alleen
    // dankzij zijn sponninkje past, steekt voor het kozijn uit.
    var nood = u.perRuit.filter(function (p) {
      var o = p.oordeel || {};
      return [o.boven, o.onder].some(function (x) { return x && x.status === 'nood'; });
    });
    if (nood.length) {
      h.push('<div class="tb-strook tb-nood">⚠ Bij ' + (nood.length === 1 ? '1 ruit' : nood.length + ' ruiten') + ' past de A5 alleen dankzij zijn sponninkje en ' +
        (nood.length === 1 ? 'steekt hij' : 'steken ze') + ' voor het kozijn uit: ' +
        esc(nood.slice(0, 12).map(function (p) { return p.rij.merk || '(zonder merk)'; }).join(', ')) + (nood.length > 12 ? ' …' : '') +
        '. Dat is een noodmaatregel; liever een andere lat, dunner band of uitfrezen (tik op het oordeel).</div>');
    }
    // v120 (Jan: vlak vraagt ook aandacht): latten die precies vlak met het
    // kozijn komen, boven of onderin. Geen fout, wel liever niet.
    var vlak = u.perRuit.filter(function (p) {
      var o = p.oordeel || {};
      return [o.boven, o.onder].some(function (x) { return x && x.status === 'vlak'; });
    });
    if (vlak.length) {
      h.push('<div class="tb-strook tb-vlak">⚠ Bij ' + (vlak.length === 1 ? '1 ruit komt' : vlak.length + ' ruiten komt') +
        ' de lat precies vlak met het kozijn: ' +
        esc(vlak.slice(0, 12).map(function (p) { return p.rij.merk || '(zonder merk)'; }).join(', ')) + (vlak.length > 12 ? ' …' : '') +
        '. Liever niet; tik op het oordeel voor een lat waarbij een randje sponning in zicht blijft (onderin buiten: een neuslat).</div>');
    }
    // v119 (keuze Jan: een strook): bij latzijde "beide" zit onderin aan beide
    // kanten dezelfde lat als boven (sinds v115; tot v114 kwam er buiten
    // automatisch een neuslat). Ruiten zonder eigen onderlat, tot je er een
    // kiest of op Begrepen tikt (per ruit bewaard in toebehoren.beideGezien).
    var gezien = (projectInfo && projectInfo.toebehoren && projectInfo.toebehoren.beideGezien) || [];
    var beide = u.perRuit.filter(function (p) {
      return p.zijde === 'beide' && !(GL() && GL().ruit(p.rij).onderlat) && gezien.indexOf(p.rij.id) < 0;
    });
    if (beide.length && !(window.invoerOpSlot && invoerOpSlot())) {
      // v121 (Jan): duidelijk maar rustig; geen ⚠ en geen oranje, want er is
      // niets fout. Eén zin, de merken erachter, en Begrepen.
      h.push('<div class="tb-strook tb-beide tb-zacht" role="note"><span class="tb-zacht-i" aria-hidden="true">i</span><span>' +
        '<b>Latzijde beide</b>: onderin aan beide kanten dezelfde lat als boven. Buiten een neuslat? Kies die als onderlat. ' +
        '<span class="tb-zacht-merken">(' + esc(beide.slice(0, 12).map(function (p) { return p.rij.merk || '(zonder merk)'; }).join(', ')) +
        (beide.length > 12 ? ' …' : '') + ')</span></span>' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="toebehorenBeideGezien()">Begrepen</button></div>');
    }
    // Totalen
    h.push('<div class="tb-totalen">');
    u.latten.forEach(function (l) {
      h.push('<div class="tb-blok"><div class="tb-getal">' + l.staven + ' × ' + nl(l.staaf / 1000, 1) + ' m</div>' +
        '<div class="tb-wat">' + esc(l.naam) + ' (' + esc(l.rol) + ')' + (l.zeker ? '' : ' <span class="tb-controle">maat nog niet nagemeten</span>') + '</div>' +
        (l.teLang.length ? '<div class="tb-let">⚠ ' + l.teLang.length + ' lat langer dan ' + nl(l.staaf / 1000, 1) +
          ' m (' + l.teLang.map(function (x) { return nl(x); }).join(', ') + ' mm): apart bestellen</div>' : '') +
        '<div class="tb-reken">' + esc(regel['lat:' + l.type]) + '</div>' + zaagHTML(l) + '</div>');
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
      // v118: kruisje om de instellingen weer in te klappen.
      h.push('<div class="tb-inst tb-instellingen-open"><button type="button" class="sluit-x" aria-label="Instellingen inklappen" onclick="toebehorenInstellingenKlap()">✕</button>');
      // v114: geen "glaslatten zitten" en geen standaard onderlat meer per
      // project (Jan: de zijde wisselt per ruit). De zijde kies je per ruit (sinds v115 hier, niet op Invoer);
      // de onderlat volgt die (buiten = passende neuslat).
      h.push('<div class="tb-keuzes">' +
        '<label>Standaardlat (boven en zijkanten) ' + latKeuze('boven', k.standaardLat, 'onchange="toebehorenKeuze(\'standaardLat\', this.value)"' + latUit) +
          '<small>per ruit anders te kiezen (hieronder, kolom Glaslat)</small></label>' +
        ['binnen', 'buiten'].map(function (kant) {
          return '<label>' + kleurNaam(kant) + ': band en kit <span class="tb-paar">' +
            keuzeLijst(KLEUREN, k[kant].kleur, 'onchange="toebehorenKeuze(\'' + kant + '.kleur\', this.value)"' + uit) + ' ' +
            keuzeLijst((kant === 'buiten' ? BAND_DIKTES_BUITEN : BAND_DIKTES).map(function (d) { return [d, d + ' mm']; }), k[kant].dikte,
              'onchange="toebehorenKeuze(\'' + kant + '.dikte\', this.value)"' + uit) + '</span>' +
            (kant === 'buiten' ? '<small>buiten nooit 2 mm (werking)</small>' : '<small>per ruit anders te kiezen (hieronder, kolom Band binnen)</small>') + '</label>';
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
    // Per ruit (v115, wens Jan): hier kies je de latten, niet meer op Invoer.
    // Per foto of tekening een kopje met de afbeelding en de merkletters
    // (zodat je ziet over welke ruit het gaat). Kolommen: merk, glastype,
    // opbouw, dikte, de twee diepten (van Invoer, hier ook te wijzigen), en de
    // keuzes voor de latten. Op de telefoon wordt elke ruit een kaartje.
    h.push(perRuitHTML(u, latUit, uit));
    h.push('<div class="tb-noot">Alleen voor eigen gebruik: dit staat in de PDF invoer, de PDF werkvloer (en bij Alles exporteren), niet op de bestellijst.</div>');
    // v121 (P3): de actiebalk voor de aangevinkte ruiten (niet op slot).
    var kzBalk = gekozenRuiten();
    if (kzBalk.length && !latUit) h.push(balkHTML(kzBalk, latUit) + '<div class="tb-balk-ruimte" aria-hidden="true"></div>');
    zetInhoud(vak, h.join(''));
    balkHoogte();
    if (window.fotoVoorbeeldenVullen) fotoVoorbeeldenVullen(vak);
  }
  window.renderToebehoren = renderToebehoren;
})();
