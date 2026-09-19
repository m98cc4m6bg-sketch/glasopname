/* ═══════════════════════════════════════════════════════════════
   Glasopname – tekenen op de foto

   De streken worden bewaard als punten met een kleur en een dikte,
   niet als plaatje. Daardoor blijven ze scherp bij inzoomen en in de
   pdf, kun je ze streek voor streek terugnemen, en passen ze gewoon
   in de projectgegevens — zodat ze meeliften op de bestaande
   offline-wachtrij.

   Coördinaten staan in een vlak van 1000 breed; de hoogte volgt de
   verhouding van de foto. Zo klopt alles op elk scherm en op papier.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KLEUREN = [
    // Helder rood, niet het logo-rood: op een gevelfoto moet een pijl er
    // uit springen, en #d00243 zakt weg tegen baksteen.
    { naam: 'Rood',   k: '#ff2020' },
    { naam: 'Zwart',  k: '#1d1d1b' },
    { naam: 'Wit',    k: '#ffffff' },
    { naam: 'Lichtgeel',  k: '#ffe45c' },
    { naam: 'Lichtgroen', k: '#7ed957' },
    { naam: 'Blauw',      k: '#1668c4' }
  ];
  var DIKTES = [
    { naam: 'Dun',    d: 3 },
    { naam: 'Normaal', d: 6 },
    { naam: 'Dik',    d: 11 }
  ];
  var GROOTTES = [
    { naam: 'Klein',  g: 24 },
    { naam: 'Normaal', g: 40 },
    { naam: 'Groot',  g: 64 },
    { naam: 'Extra groot', g: 96 }
  ];
  // Getekende pictogrammen in plaats van tekens uit het lettertype: die
  // zien er op elk apparaat hetzelfde uit en zijn beter te herkennen.
  // Selecteren: een stippelkader met een muisaanwijzer erin. Alleen een
  // pijltje werd verward met het pijl-gereedschap ernaast.
  var KIES_ICOON =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
    '<rect x="2.2" y="2.2" width="13.4" height="13.4" rx="1.6" fill="none" ' +
    'stroke="currentColor" stroke-width="1.7" stroke-dasharray="3 2.4"/>' +
    '<path d="M11 9.6 L21 14.1 L16.4 15.3 L18.7 20.1 L16.4 21.2 L14.1 16.3 L11 19.5 Z" ' +
    'fill="currentColor" stroke="#fff" stroke-width="1.15" stroke-linejoin="round"/></svg>';

  // De lasso: een stippellus met een staartje, zoals in een notitie-app.
  var LASSO_ICOON =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
    '<ellipse cx="12" cy="9.2" rx="8.6" ry="6.2" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-dasharray="3 2.4"/>' +
    '<path d="M9.2 14.9 C8.4 17.9 10 19.9 12.4 21.2" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round"/></svg>';

  var GUM_ICOON =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
    '<g transform="rotate(-38 12 12)">' +
    '<rect x="5.5" y="7" width="13" height="10" rx="2" fill="#f08a24" stroke="#8a4a06" stroke-width="1.2"/>' +
    '<path d="M12 7 v10" stroke="#8a4a06" stroke-width="1.2"/>' +
    '<path d="M12 7 h6.5 a2 2 0 0 1 2 2 v6 a2 2 0 0 1 -2 2 H12 Z" fill="#ffd9b0" stroke="#8a4a06" stroke-width="1.2"/>' +
    '</g></svg>';

  var GEREEDSCHAP = [
    { id: 'kies', teken: KIES_ICOON, naam: 'Selecteren' },
    { id: 'lasso', teken: LASSO_ICOON, naam: 'Meerdere kiezen' },
    { id: 'pen',  teken: '✏️', naam: 'Pen' },
    { id: 'lijn', teken: '╱',  naam: 'Rechte lijn' },
    { id: 'pijl', teken: '➔',  naam: 'Pijl' },
    { id: 'rect', teken: '▭',  naam: 'Rechthoek' },
    { id: 'tekst', teken: '<b class="tk-a">A</b>', naam: 'Tekst' },
    { id: 'gum',  teken: GUM_ICOON, naam: 'Gum' }
  ];

  var NS = 'http://www.w3.org/2000/svg';
  var actief = null;      // fotoId waarop getekend wordt
  var stuk = 'pen';
  // Geel is de standaardkleur: dat leest op vrijwel elke gevel, en op de
  // foto's waar rood of zwart wegvalt nog steeds.
  var kleur = '#ffe45c';
  var dikte = 6;
  var vingerTekent = false;
  var grootte = 40;       // lettergrootte voor nieuwe tekst
  var vet = true;
  var schuin = false;
  // De selectie. `keuze` is de volledige lijst; `gekozen` is het eerste lid
  // en blijft bestaan omdat de balk daaraan aflezen moet welke kleur, dikte
  // en lettergrootte er op dit moment gelden.
  var keuze = [];
  var gekozen = -1;       // eerste geselecteerde streek, -1 = geen
  var lasso = null;       // lopende omcirkeling met het lassogereedschap
  var metPen = false;     // laatste aanraking kwam van een pen of muis
  var sleep = null;       // bezig met verslepen of schalen van de selectie
  var verplaatst = false;
  var bezig = null;       // lopende streek
  var lopendeIndex = -1;
  var bewerk = null;      // lopende tekstinvoer: { fotoId, index, doos, veld }

  function el(id) { return document.getElementById(id); }
  function fotoVan(id) { return fotos.find(function (f) { return f.id === id; }); }
  function inkt(foto) {
    if (!Array.isArray(foto.inkt)) foto.inkt = [];
    return foto.inkt;
  }
  function vbHoogte(foto) {
    var v = Math.round(1000 * (foto.hoogte || 3) / (foto.breedte || 4));
    return v > 0 ? v : 750;
  }

  /* ─── de tekenlaag ─────────────────────────────────────────── */

  window.tekenInit = function (fotoId) {
    var doek = el('doek-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!doek || !foto || !foto.pad) return;

    var svg = el('inkt-' + fotoId);
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('id', 'inkt-' + fotoId);
      svg.setAttribute('class', 'inkt-laag');
      svg.setAttribute('preserveAspectRatio', 'none');
      // De inkt hoort onder de bolletjes te liggen, anders zijn de
      // letters niet meer te lezen.
      var eersteBol = doek.querySelector('.foto-mark');
      if (eersteBol) doek.insertBefore(svg, eersteBol); else doek.appendChild(svg);
      koppelPointer(svg, fotoId);
    }
    svg.setAttribute('viewBox', '0 0 1000 ' + vbHoogte(foto));
    tekenStreken(fotoId);
    tekenBalk(fotoId);
    zetModus(fotoId);
  };

  function padVan(streek) {
    var p = streek.p;
    if (!p || !p.length) return '';
    if (streek.t === 'rect') {
      var x1 = p[0][0], y1 = p[0][1], x2 = p[1][0], y2 = p[1][1];
      return 'M' + x1 + ' ' + y1 + 'H' + x2 + 'V' + y2 + 'H' + x1 + 'Z';
    }
    if (streek.t === 'lijn' || streek.t === 'pijl') {
      return 'M' + p[0][0] + ' ' + p[0][1] + 'L' + p[1][0] + ' ' + p[1][1];
    }
    // Een herkende veelhoek (driehoek) moet scherpe hoeken houden; die krijgt
    // `recht` mee. In de pdf worden alle vrije streken toch al als rechte
    // stukjes getekend, dus daar hoeft niets voor te veranderen.
    if (streek.recht) {
      return 'M' + p.map(function (q) { return q[0] + ' ' + q[1]; }).join('L');
    }
    // Vrije hand: door de middens van opeenvolgende punten lopen geeft
    // een vloeiende lijn zonder hoekige knikken.
    var d = 'M' + p[0][0] + ' ' + p[0][1];
    if (p.length === 1) return d + 'l0.1 0.1';
    for (var i = 1; i < p.length - 1; i++) {
      var mx = (p[i][0] + p[i + 1][0]) / 2;
      var my = (p[i][1] + p[i + 1][1]) / 2;
      d += 'Q' + p[i][0] + ' ' + p[i][1] + ' ' + mx + ' ' + my;
    }
    d += 'L' + p[p.length - 1][0] + ' ' + p[p.length - 1][1];
    return d;
  }

  // Tekst staat als losse letters op de foto, zonder vlak eronder. Om hem
  // op een drukke gevel toch leesbaar te houden krijgt hij een dunne rand
  // in een contrasterende kleur — dat is nog steeds alleen de letter zelf.
  function lichtOfDonker(hex) {
    var h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1d1d1b' : '#ffffff';
  }

  // ── TEKSTVAK ──
  // Een tekst is een vak met een linkerbovenhoek (p[0]), een breedte (w) en
  // een hoogte (h). De lettergrootte (g) staat daar los van: het vak is een
  // harde grens waarbinnen de tekst afbreekt, zoals in Notability. Maak je
  // het vak smaller, dan wordt de zin langer; maak je het hoger en smal, dan
  // staat hij onder elkaar. De letters blijven even groot.
  var REGELHOOGTE = 1.2;     // regelafstand als deel van de lettergrootte
  var TEKSTRAND = 0.18;      // binnenruimte, ook als deel daarvan
  var TEKST_MAXB = 780;      // waarboven een nieuw vak zelf gaat afbreken
  // Waar de basislijn van de eerste regel ligt, gerekend vanaf de bovenkant
  // van de binnenruimte. Een browser zet die op de halve regelsprong plus de
  // stokhoogte van het lettertype: (1.2 − 1) / 2 + 0.9. Dezelfde waarde
  // gebruikt pdf.js, zodat de tekst op papier precies staat waar hij tijdens
  // het typen stond.
  var BASISLIJN = 1.0;

  // Tekstbreedte meten met een canvas: hetzelfde lettertype als in de svg,
  // en het werkt zonder het element eerst in de pagina te hangen.
  var meetVlak;
  function tekstMeet(str, s) {
    if (meetVlak === undefined) {
      var c = document.createElement('canvas');
      meetVlak = (c && c.getContext) ? c.getContext('2d') : null;
    }
    var g = s.g || 40;
    if (!meetVlak) return String(str).length * g * 0.55;   // ruwe terugval
    meetVlak.font = (s.schuin ? 'italic ' : '') +
      (s.vet === false ? '400 ' : '700 ') + g + "px 'Segoe UI', Arial, sans-serif";
    return meetVlak.measureText(String(str)).width;
  }

  // Alles wat de tekst aan regels oplevert binnen de breedte van het vak.
  // Een eigen regeleinde blijft een regeleinde; een woord dat zelf te lang
  // is wordt hard afgebroken, anders zou het buiten het vak steken.
  function tekstRegels(s) {
    var g = s.g || 40;
    var max = Math.max(g * 0.8, (s.w || g * 6) - g * TEKSTRAND * 2);
    var uit = [];
    String(s.tx == null ? '' : s.tx).split('\n').forEach(function (alinea) {
      var regel = '';
      alinea.split(' ').forEach(function (woord) {
        var proef = regel ? regel + ' ' + woord : woord;
        if (regel && tekstMeet(proef, s) > max) { uit.push(regel); regel = woord; }
        else regel = proef;
        while (tekstMeet(regel, s) > max && regel.length > 1) {
          var knip = regel.length - 1;
          while (knip > 1 && tekstMeet(regel.slice(0, knip), s) > max) knip--;
          uit.push(regel.slice(0, knip));
          regel = regel.slice(knip);
        }
      });
      uit.push(regel);
    });
    return uit;
  }

  // Hoeveel regels er werkelijk in het vak passen. De rest wordt niet
  // getekend: het vak is een grens, geen suggestie.
  function tekstPassend(s) {
    var g = s.g || 40;
    var ruimte = (s.h || g * 1.5) - g * TEKSTRAND * 2;
    var n = Math.max(1, Math.floor(ruimte / (g * REGELHOOGTE) + 0.2));
    return tekstRegels(s).slice(0, n);
  }

  // Het vak op maat van de tekst. Gebeurt alleen zolang je het vak niet
  // zelf hebt versleept: daarna bepaal jíj de vorm.
  function tekstPas(s) {
    if (s.vast) return;
    var g = s.g || 40;
    var langste = 0;
    String(s.tx == null ? '' : s.tx).split('\n').forEach(function (a) {
      langste = Math.max(langste, tekstMeet(a, s));
    });
    s.w = Math.round(Math.min(TEKST_MAXB,
      Math.max(g * 2.2, langste + g * TEKSTRAND * 2 + g * 0.25)));
    s.h = Math.round(tekstRegels(s).length * g * REGELHOOGTE + g * TEKSTRAND * 2);
  }

  // Tekst uit een project van vóór v77 heeft nog geen vak. Toen stond p[0]
  // op het midden van de enige regel; nu is het de linkerbovenhoek. Deze
  // verschuiving houdt oude tekeningen op hun plek.
  function tekstNorm(s) {
    if (!s || s.t !== 'tekst') return s;
    if (s.w && s.h) return s;
    var g = s.g || (s.d || 6) * 6;
    s.p[0] = [Math.round((s.p[0][0] - g * TEKSTRAND) * 10) / 10,
              Math.round((s.p[0][1] - g * 0.65) * 10) / 10];
    s.vast = false;
    tekstPas(s);
    return s;
  }
  window.tekstVakNorm = tekstNorm;
  window.tekstRegels = tekstRegels;
  window.tekstPassend = tekstPassend;
  window.TEKST_BASISLIJN = BASISLIJN;

  function maakTekst(streek, index) {
    tekstNorm(streek);
    var g = streek.g || 40;
    var pad = g * TEKSTRAND;
    var lh = g * REGELHOOGTE;
    var el = document.createElementNS(NS, 'text');
    el.setAttribute('fill', streek.k);
    el.setAttribute('stroke', lichtOfDonker(streek.k));
    el.setAttribute('stroke-width', Math.max(1, (streek.d || 6) * 0.28));
    el.setAttribute('paint-order', 'stroke fill');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('font-size', g);
    el.setAttribute('font-family', "'Segoe UI', Arial, sans-serif");
    el.setAttribute('font-weight', streek.vet === false ? '400' : '700');
    if (streek.schuin) el.setAttribute('font-style', 'italic');
    el.setAttribute('data-streek', index);
    var x = streek.p[0][0] + pad;
    tekstPassend(streek).forEach(function (r, i) {
      var t = document.createElementNS(NS, 'tspan');
      t.setAttribute('x', x);
      t.setAttribute('y', streek.p[0][1] + pad + i * lh + g * BASISLIJN);
      t.textContent = r;
      el.appendChild(t);
    });
    return el;
  }

  function maakPad(streek, index) {
    var el = document.createElementNS(NS, 'path');
    el.setAttribute('d', padVan(streek));
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', streek.k);
    el.setAttribute('stroke-width', streek.d);
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('vector-effect', 'non-scaling-stroke');
    el.setAttribute('data-streek', index);
    return el;
  }

  function pijlpuntPad(streek) {
    var p = streek.p;
    var hoek = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]);
    var lengte = Math.max(14, streek.d * 3.2);
    var x = p[1][0], y = p[1][1];
    var a1 = hoek + Math.PI * 0.82, a2 = hoek - Math.PI * 0.82;
    return 'M' + x + ' ' + y +
      'L' + (x + Math.cos(a1) * lengte) + ' ' + (y + Math.sin(a1) * lengte) +
      'M' + x + ' ' + y +
      'L' + (x + Math.cos(a2) * lengte) + ' ' + (y + Math.sin(a2) * lengte);
  }

  function pijlpunt(streek, index) {
    var g = document.createElementNS(NS, 'path');
    g.setAttribute('d', pijlpuntPad(streek));
    g.setAttribute('fill', 'none');
    g.setAttribute('stroke', streek.k);
    g.setAttribute('stroke-width', streek.d);
    g.setAttribute('stroke-linecap', 'round');
    g.setAttribute('data-streek', index);
    return g;
  }

  // Tijdens het tekenen alleen het pad van de lopende streek aanpassen.
  // De hele laag opnieuw opbouwen kost bij elke beweging tijd, en dat is
  // precies waarom het op een telefoon stroef aanvoelt zodra er een paar
  // streken staan.
  function werkLopendeBij(fotoId, index) {
    var svg = el('inkt-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!svg || !foto) return;
    var s = foto.inkt[index];
    var paden = svg.querySelectorAll('[data-streek="' + index + '"]');
    if (!s || !paden.length) { tekenStreken(fotoId); return; }
    paden[0].setAttribute('d', padVan(s));
    if (s.t === 'pijl') {
      if (paden[1]) paden[1].setAttribute('d', pijlpuntPad(s));
      else tekenStreken(fotoId);
    }
  }

  function tekenStreken(fotoId) {
    var svg = el('inkt-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!svg || !foto) return;
    svg.innerHTML = '';
    inkt(foto).forEach(function (s, i) {
      if (s.t === 'tekst') { svg.appendChild(maakTekst(s, i)); return; }
      svg.appendChild(maakPad(s, i));
      if (s.t === 'pijl' && s.p.length > 1) svg.appendChild(pijlpunt(s, i));
    });
    // Onderdelen kunnen tussendoor verdwenen zijn (ongedaan maken, wissen);
    // een selectie die daar nog naar wijst moet mee opschonen.
    var aantal = inkt(foto).length;
    if (keuze.some(function (i) { return i >= aantal; })) {
      keuze = keuze.filter(function (i) { return i < aantal; });
      gekozen = keuze.length ? keuze[0] : -1;
    }
    if (gekozen >= aantal) gekozen = -1;
    // Tijdens het typen staat de tekst in het invoervak; twee keer dezelfde
    // letters over elkaar leest niet.
    if (bewerk && bewerk.fotoId === fotoId) {
      var node = elementVan(fotoId, bewerk.index);
      if (node) node.setAttribute('visibility', 'hidden');
    }
    tekenKader(fotoId);
  }

  /* ─── vormherkenning ──────────────────────────────────────── */
  // Even stil blijven staan tijdens het tekenen maakt er een nette vorm van.
  // De streek wordt vergeleken met een rechte lijn, een rechthoek, een
  // ellips en een driehoek; de kandidaat die er het dichtst bij zit wint,
  // mits hij er dicht genoeg bij zit. Past niets, dan blijft de streek
  // zoals hij getekend is — liever niets dan de verkeerde vorm.

  var VAST_MS = 550;        // hoe lang stil staan
  var VAST_SPELING = 9;     // hoeveel je nog mag bewegen (viewBox-eenheden)

  function afst(a, b) {
    return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]));
  }

  function rond(n) { return Math.round(n * 10) / 10; }

  /* ─── vakken om de selectie ────────────────────────────────── */
  // Eén manier om te bepalen hoe groot iets is, gebruikt door het kader,
  // het schalen en de lasso. Bij tekst is dat het tekstvak zelf en niet de
  // omhullende van de letters: daar sleep je immers aan.

  function vakVanPunten(p) {
    var x1 = p[0][0], y1 = p[0][1], x2 = x1, y2 = y1;
    p.forEach(function (q) {
      if (q[0] < x1) x1 = q[0];
      if (q[0] > x2) x2 = q[0];
      if (q[1] < y1) y1 = q[1];
      if (q[1] > y2) y2 = q[1];
    });
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  function vakVanStreek(s) {
    if (!s || !s.p || !s.p.length) return null;
    if (s.t === 'tekst') {
      tekstNorm(s);
      return { x: s.p[0][0], y: s.p[0][1], w: s.w, h: s.h };
    }
    return vakVanPunten(s.p);
  }

  function vakSamen(vakken) {
    var g = null;
    vakken.forEach(function (v) {
      if (!v) return;
      if (!g) { g = { x: v.x, y: v.y, w: v.w, h: v.h }; return; }
      var x2 = Math.max(g.x + g.w, v.x + v.w), y2 = Math.max(g.y + g.h, v.y + v.h);
      g.x = Math.min(g.x, v.x);
      g.y = Math.min(g.y, v.y);
      g.w = x2 - g.x;
      g.h = y2 - g.y;
    });
    return g;
  }

  /* ─── lasso: ligt dit onderdeel binnen de lus? ─────────────── */

  function inVeelhoek(q, veel) {
    var binnen = false;
    for (var i = 0, j = veel.length - 1; i < veel.length; j = i++) {
      var a = veel[i], b = veel[j];
      if ((a[1] > q[1]) !== (b[1] > q[1]) &&
          q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) binnen = !binnen;
    }
    return binnen;
  }

  // Waar we op proeven. Een rechthoek en een tekstvak zijn in de gegevens
  // maar twee punten; die zou je met een lus om het midden al te pakken
  // hebben. Daarom tellen daar de vier hoeken en het midden mee.
  function proefPunten(s) {
    if (s.t === 'tekst' || s.t === 'rect') {
      var v = vakVanStreek(s);
      if (!v) return [];
      return [[v.x, v.y], [v.x + v.w, v.y], [v.x, v.y + v.h], [v.x + v.w, v.y + v.h],
              [v.x + v.w / 2, v.y + v.h / 2]];
    }
    return s.p || [];
  }

  // Zeven van de tien punten binnen de lus is genoeg. Helemaal omcirkelen
  // lukt op een telefoon zelden precies, en een streek die er half in ligt
  // wil je meestal wél mee hebben.
  var LASSO_DEEL = 0.7;
  function inLasso(s, veel) {
    var p = proefPunten(s);
    if (!p.length) return false;
    var raak = 0;
    for (var i = 0; i < p.length; i++) if (inVeelhoek(p[i], veel)) raak++;
    return raak / p.length >= LASSO_DEEL;
  }

  function padLengte(p) {
    var l = 0;
    for (var i = 1; i < p.length; i++) l += afst(p[i - 1], p[i]);
    return l;
  }

  function omhullende(p) {
    var x1 = p[0][0], y1 = p[0][1], x2 = x1, y2 = y1;
    p.forEach(function (q) {
      if (q[0] < x1) x1 = q[0];
      if (q[0] > x2) x2 = q[0];
      if (q[1] < y1) y1 = q[1];
      if (q[1] > y2) y2 = q[1];
    });
    return { x1: x1, y1: y1, x2: x2, y2: y2, b: x2 - x1, h: y2 - y1 };
  }

  // Afstand van een punt tot een lijnstuk.
  function afstTotStuk(q, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var len2 = dx * dx + dy * dy;
    if (!len2) return afst(q, a);
    var t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return afst(q, [a[0] + t * dx, a[1] + t * dy]);
  }

  function afstTotVeelhoek(q, hoeken) {
    var m = Infinity;
    for (var i = 0; i < hoeken.length; i++) {
      var d = afstTotStuk(q, hoeken[i], hoeken[(i + 1) % hoeken.length]);
      if (d < m) m = d;
    }
    return m;
  }

  function gemiddeld(lijst) {
    var s = 0;
    lijst.forEach(function (v) { s += v; });
    return lijst.length ? s / lijst.length : 0;
  }

  // Alle maten worden gedeeld door de diagonaal van de omhullende, zodat
  // een grote en een kleine tekening even streng beoordeeld worden.
  function foutRechthoek(p, vak) {
    var hoeken = [[vak.x1, vak.y1], [vak.x2, vak.y1], [vak.x2, vak.y2], [vak.x1, vak.y2]];
    return gemiddeld(p.map(function (q) { return afstTotVeelhoek(q, hoeken); }));
  }

  function foutEllips(p, vak) {
    var cx = (vak.x1 + vak.x2) / 2, cy = (vak.y1 + vak.y2) / 2;
    var rx = Math.max(vak.b / 2, 0.001), ry = Math.max(vak.h / 2, 0.001);
    // Afstand tot de ellips, bij benadering: het verschil tussen de straal
    // van het punt en de straal van de ellips in diezelfde richting.
    return gemiddeld(p.map(function (q) {
      var dx = q[0] - cx, dy = q[1] - cy;
      var r = Math.sqrt(dx * dx + dy * dy);
      if (!r) return Math.min(rx, ry);
      var t = Math.atan2(dy / ry, dx / rx);
      var ex = rx * Math.cos(t), ey = ry * Math.sin(t);
      return Math.abs(r - Math.sqrt(ex * ex + ey * ey));
    }));
  }

  // Omhullende veelhoek (Andrew's monotone chain).
  function omhulsel(p) {
    var punten = p.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function kruis(o, a, b) {
      return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
    var onder = [], boven = [], i;
    for (i = 0; i < punten.length; i++) {
      while (onder.length >= 2 && kruis(onder[onder.length - 2], onder[onder.length - 1], punten[i]) <= 0) onder.pop();
      onder.push(punten[i]);
    }
    for (i = punten.length - 1; i >= 0; i--) {
      while (boven.length >= 2 && kruis(boven[boven.length - 2], boven[boven.length - 1], punten[i]) <= 0) boven.pop();
      boven.push(punten[i]);
    }
    onder.pop(); boven.pop();
    return onder.concat(boven);
  }

  // De grootste driehoek binnen het omhulsel. Bij een handgetekende
  // driehoek zijn dat precies de drie hoekpunten.
  function grootsteDriehoek(h) {
    if (h.length < 3) return null;
    var best = null, oppBest = 0;
    for (var a = 0; a < h.length; a++) {
      for (var b = a + 1; b < h.length; b++) {
        for (var c = b + 1; c < h.length; c++) {
          var opp = Math.abs((h[b][0] - h[a][0]) * (h[c][1] - h[a][1]) -
                             (h[c][0] - h[a][0]) * (h[b][1] - h[a][1])) / 2;
          if (opp > oppBest) { oppBest = opp; best = [h[a], h[b], h[c]]; }
        }
      }
    }
    return best;
  }

  function rondAf(p) {
    return p.map(function (q) {
      return [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10];
    });
  }

  function ellipsPunten(vak) {
    var cx = (vak.x1 + vak.x2) / 2, cy = (vak.y1 + vak.y2) / 2;
    var rx = vak.b / 2, ry = vak.h / 2;
    var uit = [];
    for (var i = 0; i <= 48; i++) {
      var t = i / 48 * Math.PI * 2;
      uit.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
    }
    return uit;
  }

  // Een streek naar een nette vorm. Geeft null als er niets past.
  // De uitkomst gebruikt bestaande soorten, zodat de pdf-uitvoer er niets
  // van hoeft te weten: een driehoek is een gesloten veelhoek met `recht`,
  // een ellips een veelhoek van 48 punten.
  function herkenVorm(punten, stuk) {
    if (!punten || punten.length < 6) return null;
    var vak = omhullende(punten);
    var diag = Math.sqrt(vak.b * vak.b + vak.h * vak.h);
    if (diag < 35) return null;                 // te klein om iets van te zeggen
    var lengte = padLengte(punten);
    if (lengte < diag * 0.6) return null;

    var eerste = punten[0], laatste = punten[punten.length - 1];
    var gesloten = afst(eerste, laatste) < Math.max(diag * 0.28, lengte * 0.16);

    // ── open: een rechte lijn of een pijl ──
    if (!gesloten) {
      var lijnFout = gemiddeld(punten.map(function (q) {
        return afstTotStuk(q, eerste, laatste);
      })) / diag;
      if (lijnFout < 0.045) {
        return { t: stuk === 'pijl' ? 'pijl' : 'lijn', p: rondAf([eerste, laatste]) };
      }
      var pijl = herkenPijl(punten, diag);
      if (pijl) return pijl;
      return null;
    }

    // ── gesloten: rechthoek, ellips of driehoek ──
    var fRecht = foutRechthoek(punten, vak) / diag;
    var fEllips = foutEllips(punten, vak) / diag;
    var drie = grootsteDriehoek(omhulsel(punten));
    var fDrie = drie ? gemiddeld(punten.map(function (q) {
      return afstTotVeelhoek(q, drie);
    })) / diag : Infinity;

    // Een kras heeft ook wel ergens een omhullende driehoek, maar zijn pad
    // is veel langer dan de omtrek van die driehoek. Die verhouding zeeft
    // het krabbelwerk eruit.
    function omtrekPast(omtrek) {
      return omtrek > 0 && lengte < omtrek * 1.45 && lengte > omtrek * 0.7;
    }
    if (!omtrekPast(2 * (vak.b + vak.h))) fRecht = Infinity;
    var rx = vak.b / 2, ry = vak.h / 2;
    // Omtrek van een ellips, benadering van Ramanujan.
    var hR = (rx - ry) * (rx - ry) / ((rx + ry) * (rx + ry) || 1);
    if (!omtrekPast(Math.PI * (rx + ry) * (1 + 3 * hR / (10 + Math.sqrt(4 - 3 * hR))))) fEllips = Infinity;
    if (drie && !omtrekPast(afst(drie[0], drie[1]) + afst(drie[1], drie[2]) + afst(drie[2], drie[0]))) {
      fDrie = Infinity;
    }

    // De driehoek wordt strenger beoordeeld dan de andere twee: elke
    // gesloten krabbel heeft wel een omhullende driehoek die er aardig
    // omheen valt, en dan zou een vijfhoek stilletjes een driehoek worden.
    if (fDrie > 0.042) fDrie = Infinity;

    var beste = Math.min(fRecht, fEllips, fDrie);
    if (!isFinite(beste) || beste > 0.075) return null;   // nergens dicht genoeg bij

    if (beste === fEllips) {
      // Bijna even breed als hoog? Dan een cirkel van maken.
      var vak2 = vak;
      if (Math.abs(vak.b - vak.h) < Math.max(vak.b, vak.h) * 0.18) {
        var r = (vak.b + vak.h) / 4;
        var cx = (vak.x1 + vak.x2) / 2, cy = (vak.y1 + vak.y2) / 2;
        vak2 = { x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r, b: r * 2, h: r * 2 };
      }
      return { t: 'pen', p: rondAf(ellipsPunten(vak2)) };
    }
    if (beste === fDrie) {
      return { t: 'pen', recht: true, p: rondAf(drie.concat([drie[0]])) };
    }
    // Rechthoek, en bij bijna gelijke zijden een vierkant.
    var x1 = vak.x1, y1 = vak.y1, x2 = vak.x2, y2 = vak.y2;
    if (Math.abs(vak.b - vak.h) < Math.max(vak.b, vak.h) * 0.14) {
      var z = (vak.b + vak.h) / 2;
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      x1 = mx - z / 2; x2 = mx + z / 2; y1 = my - z / 2; y2 = my + z / 2;
    }
    return { t: 'rect', p: rondAf([[x1, y1], [x2, y2]]) };
  }

  // Een pijl in één streek: eerst de schacht, dan twee korte weerhaken die
  // terugbuigen. Herkenbaar aan de knik waar de richting het sterkst
  // omslaat, met daarachter alleen nog korte stukken die terugwijzen.
  function herkenPijl(p, diag) {
    var lengte = padLengte(p);
    var knik = -1;
    // Zoek het punt waarna de rest van de streek kort is (hooguit 45 %) en
    // terugwijst naar het begin.
    var loop = 0;
    for (var i = 1; i < p.length; i++) {
      loop += afst(p[i - 1], p[i]);
      if (loop < lengte * 0.45) continue;
      var schacht = [p[0], p[i]];
      var fout = 0, n = 0;
      for (var j = 0; j <= i; j++) { fout += afstTotStuk(p[j], schacht[0], schacht[1]); n++; }
      if (fout / n / diag > 0.05) continue;         // schacht niet recht genoeg
      var rest = lengte - loop;
      if (rest > lengte * 0.55 || rest < lengte * 0.08) continue;
      // Wijst de staart terug?
      var rx = p[i][0] - p[0][0], ry = p[i][1] - p[0][1];
      var terug = true;
      for (j = i + 1; j < p.length; j++) {
        var vx = p[j][0] - p[i][0], vy = p[j][1] - p[i][1];
        if (vx * rx + vy * ry > 0) { terug = false; break; }
      }
      if (!terug) continue;
      knik = i;
      break;
    }
    if (knik < 0) return null;
    return { t: 'pijl', p: rondAf([p[0], p[knik]]) };
  }

  // Een rechte lijn of rechthoek die je even vasthoudt wordt netjes gezet:
  // horizontaal, verticaal of precies 45 graden, en een bijna-vierkant
  // wordt een vierkant.
  function rechtTrekken(streek) {
    var p = streek.p;
    if (!p || p.length < 2) return null;
    if (streek.t === 'rect') {
      var b = Math.abs(p[1][0] - p[0][0]), h = Math.abs(p[1][1] - p[0][1]);
      if (Math.max(b, h) < 35) return null;
      if (Math.abs(b - h) >= Math.max(b, h) * 0.14) return null;   // al goed zo
      var z = (b + h) / 2;
      var sx = p[1][0] >= p[0][0] ? 1 : -1, sy = p[1][1] >= p[0][1] ? 1 : -1;
      return { t: 'rect', p: rondAf([p[0], [p[0][0] + sx * z, p[0][1] + sy * z]]) };
    }
    if (streek.t !== 'lijn' && streek.t !== 'pijl') return null;
    var dx = p[1][0] - p[0][0], dy = p[1][1] - p[0][1];
    var lang = Math.sqrt(dx * dx + dy * dy);
    if (lang < 35) return null;
    var hoek = Math.atan2(dy, dx);
    var stap = Math.PI / 4;
    var netjes = Math.round(hoek / stap) * stap;
    if (Math.abs(hoek - netjes) > 12 * Math.PI / 180) return null;  // te schuin
    return { t: streek.t, p: rondAf([p[0],
      [p[0][0] + Math.cos(netjes) * lang, p[0][1] + Math.sin(netjes) * lang]]) };
  }

  /* ─── stil blijven staan ──────────────────────────────────── */

  var vastKlok = null;
  var vastPunt = null;

  function vastKlokStop() {
    if (vastKlok) { clearTimeout(vastKlok); vastKlok = null; }
    vastPunt = null;
  }

  function vastKlokStart(fotoId, punt) {
    vastKlokStop();
    if (!bezig || bezig.gum) return;
    vastPunt = punt;
    vastKlok = setTimeout(function () { pasVormToe(fotoId); }, VAST_MS);
  }

  function vastKlokBij(fotoId, punt) {
    if (!vastPunt) { vastKlokStart(fotoId, punt); return; }
    if (afst(punt, vastPunt) < VAST_SPELING) return;   // staat nog stil genoeg
    vastKlokStart(fotoId, punt);
  }

  function pasVormToe(fotoId) {
    vastKlok = null;
    if (!bezig || bezig.gum || bezig.vast) return;
    var foto = fotoVan(fotoId);
    var s = foto && foto.inkt[lopendeIndex];
    if (!s) return;
    var vorm = s.t === 'pen' ? herkenVorm(s.p, s.t) : rechtTrekken(s);
    if (!vorm) return;
    s.t = vorm.t;
    s.p = vorm.p;
    if (vorm.recht) s.recht = true; else delete s.recht;
    bezig.vast = true;
    // Geen bevestiging in de balk: je ziet de vorm zelf al veranderen op de
    // foto, en bij elke lijn een melding werd hinderlijk.
    tekenStreken(fotoId);
  }

  window.herkenVorm = herkenVorm;

  /* ─── invoer ───────────────────────────────────────────────── */

  function plek(e, svg) {
    var r = svg.getBoundingClientRect();
    var foto = fotoVan(actief);
    var h = vbHoogte(foto);
    return [
      Math.round(Math.max(0, Math.min(1000, (e.clientX - r.left) / r.width * 1000)) * 10) / 10,
      Math.round(Math.max(0, Math.min(h, (e.clientY - r.top) / r.height * h)) * 10) / 10
    ];
  }

  // Wanneer telt een aanraking als tekenen?
  //   pen of muis  → altijd, zolang de tekenmodus aanstaat
  //   één vinger   → alleen met 'Met vinger tekenen' aan
  //   twee vingers → nooit; dat is schuiven en zoomen
  // De Apple Pencil stuurt op een iPad óók gewone aanraakberichten, dus
  // die moeten net zo goed tegengehouden worden — anders maakt Safari er
  // halverwege alsnog een schuifbeweging van en breekt de streek af.
  function magTekenen(e) {
    if (actief === null) return false;
    // Selecteren en verslepen is geen tekenen: dat moet ook met een vinger
    // kunnen zonder dat je eerst een vinkje omzet. Voor tekst geldt
    // hetzelfde: je zet een tekstvak met je vinger neer.
    if (stuk === 'kies' || stuk === 'lasso' || stuk === 'tekst') return true;
    if (e.pointerType === 'pen' || e.pointerType === 'mouse') return true;
    return vingerTekent;
  }

  function koppelPointer(svg, fotoId) {
    function houdTegen(e) {
      if (actief !== fotoId) return;
      // Twee of meer vingers: altijd laten schuiven en zoomen, ook tijdens
      // het tekenen. Zo kun je op een uitvergrote foto naar de juiste hoek
      // zonder het vinkje om te zetten.
      if (e.touches && e.touches.length > 1) return;
      // Een lopende streek moet niet onderbroken worden door een tweede
      // aanraking — een hand die op het scherm rust bijvoorbeeld.
      if (bezig || sleep) { e.preventDefault(); return; }
      // Safari op iPadOS vertelt bij een aanraking of het de Pencil was.
      // Dat is een tweede herkenning naast pointerType, voor het geval de
      // berichten in een andere volgorde binnenkomen dan verwacht.
      var pen = metPen;
      if (e.touches) {
        for (var i = 0; i < e.touches.length; i++) {
          if (e.touches[i].touchType === 'stylus') pen = true;
        }
      }
      if (!vingerTekent && !pen && stuk !== 'kies' && stuk !== 'lasso' && stuk !== 'tekst') return;
      e.preventDefault();
    }
    svg.addEventListener('touchstart', houdTegen, { passive: false });
    svg.addEventListener('touchmove', houdTegen, { passive: false });

    svg.addEventListener('pointerdown', function (e) {
      if (actief !== fotoId) return;
      metPen = (e.pointerType === 'pen' || e.pointerType === 'mouse');
      if (!magTekenen(e)) { metPen = false; return; }
      e.preventDefault();
      e.stopPropagation();
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}

      var punt = plek(e, svg);

      // Een hoekgreep vastpakken schaalt wat er geselecteerd is — of je nu
      // met het keuze- of met het lassogereedschap werkt.
      if ((stuk === 'kies' || stuk === 'lasso') && keuze.length) {
        var onder = document.elementFromPoint(e.clientX, e.clientY);
        if (onder && onder.hasAttribute && onder.hasAttribute('data-greep')) {
          sleep = grijpSelectie(fotoId, punt, onder.getAttribute('data-greep'));
          try { svg.setPointerCapture(e.pointerId); } catch (err) {}
          return;
        }
        // Binnen het kader van een groep: de hele groep verslepen. Zonder
        // dit zou een tik binnen de lassoselectie er één onderdeel uit
        // pakken, of een nieuwe lus beginnen.
        if (keuze.length > 1 && inSelectie(fotoId, punt)) {
          sleep = grijpSelectie(fotoId, punt, '');
          try { svg.setPointerCapture(e.pointerId); } catch (err) {}
          return;
        }
      }

      if (stuk === 'lasso') {
        lasso = { fotoId: fotoId, p: [punt] };
        zetKeuze(fotoId, []);
        tekenLasso(fotoId);
        return;
      }

      if (stuk === 'kies') {
        var gevonden = zoekStreek(fotoId, e);
        // Nog een keer tikken op tekst die al geselecteerd is opent hem om
        // te bewerken — zoals in een notitie-app. Zo hoef je niet eerst de
        // ✎-knop in de balk te zoeken.
        if (gevonden >= 0 && keuze.length === 1 && gevonden === gekozen) {
          var al = fotoVan(fotoId).inkt[gevonden];
          if (al && al.t === 'tekst') { selectieTekst(fotoId); return; }
        }
        kiesStreek(fotoId, gevonden);
        // Meteen kunnen slepen: aanklikken en verplaatsen is één beweging.
        if (gevonden >= 0) {
          sleep = grijpSelectie(fotoId, punt, '');
          try { svg.setPointerCapture(e.pointerId); } catch (err) {}
        }
        return;
      }
      if (stuk === 'gum') { gum(e, fotoId); bezig = { gum: true }; return; }
      if (stuk === 'tekst') { zetTekst(fotoId, punt); return; }
      var foto = fotoVan(fotoId);
      bezig = { t: stuk, k: kleur, d: dikte, p: [punt] };
      if (stuk !== 'pen') bezig.p.push(punt.slice());
      inkt(foto).push(bezig);
      lopendeIndex = foto.inkt.length - 1;
      // Alleen het nieuwe pad erbij zetten. De hele laag opnieuw opbouwen
      // bij elke streek wordt traag zodra er veel op de foto staat.
      var svgEl = el('inkt-' + fotoId);
      if (svgEl) {
        svgEl.appendChild(maakPad(bezig, lopendeIndex));
        if (bezig.t === 'pijl') svgEl.appendChild(pijlpunt(bezig, lopendeIndex));
      } else {
        tekenStreken(fotoId);
      }
      vastKlokStart(fotoId, punt);
    });

    svg.addEventListener('pointermove', function (e) {
      // Bezig met omcirkelen.
      if (lasso && actief === fotoId) {
        e.preventDefault();
        var q = plek(e, svg);
        var eind = lasso.p[lasso.p.length - 1];
        if (Math.abs(q[0] - eind[0]) + Math.abs(q[1] - eind[1]) < 2) return;
        lasso.p.push(q);
        tekenLasso(fotoId);
        return;
      }
      // De selectie verslepen of schalen.
      if (sleep && actief === fotoId) {
        e.preventDefault();
        var nu = plek(e, svg);
        var dx = nu[0] - sleep.start[0], dy = nu[1] - sleep.start[1];
        if (!sleep.leden.length) { sleep = null; return; }
        // De momentopname moet vóór de eerste verplaatsing gemaakt worden,
        // anders zet ongedaan maken het onderdeel terug op de nieuwe plek.
        if (!verplaatst && window.bewaarStap) {
          var wat = sleep.leden.length > 1 ? 'Selectie' : 'Onderdeel';
          bewaarStap(wat + (sleep.maat ? ' geschaald' : ' verplaatst'));
        }
        var foto2 = fotoVan(fotoId);
        if (sleep.maat) schaalSelectie(foto2, sleep, dx, dy);
        else verplaatsSelectie(foto2, sleep, dx, dy);
        verplaatst = true;
        tekenStreken(fotoId);   // tekent ook het kader en de grepen opnieuw
        return;
      }
      if (!bezig || actief !== fotoId) return;
      e.preventDefault();
      if (bezig.gum) { gum(e, fotoId); return; }
      // Vastgezet door de vormherkenning: verder bewegen verandert er niets
      // meer aan. Loslaten en opnieuw beginnen als het toch anders moet.
      if (bezig.vast) return;
      vastKlokBij(fotoId, plek(e, svg));

      if (bezig.t === 'pen') {
        // Een snelle veeg levert meerdere metingen per beeldopbouw op.
        // Zonder die tussenpunten wordt een boog een reeks rechte stukken.
        // Let op: een lege lijst tussenpunten is wél een lijst. Zonder deze
        // controle zou er dan geen enkel punt bijkomen en blijft de streek
        // een stip.
        var stapjes = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
        if (!stapjes.length) stapjes = [e];
        var toegevoegd = false;
        for (var i = 0; i < stapjes.length; i++) {
          var punt = plek(stapjes[i], svg);
          var vorig = bezig.p[bezig.p.length - 1];
          if (Math.abs(punt[0] - vorig[0]) + Math.abs(punt[1] - vorig[1]) < 2) continue;
          bezig.p.push(punt);
          toegevoegd = true;
        }
        if (!toegevoegd) return;
      } else {
        bezig.p[1] = plek(e, svg);
      }
      werkLopendeBij(fotoId, lopendeIndex);
    });

    function klaar(e) {
      vastKlokStop();
      if (lasso) {
        try { svg.releasePointerCapture(e.pointerId); } catch (err) {}
        var lus = lasso.p;
        lasso = null;
        wisLasso(fotoId);
        // Een tik zonder lus is gewoon 'niets selecteren'.
        if (lus.length < 6) { zetKeuze(fotoId, []); tekenBalk(fotoId); return; }
        var binnen = [];
        inkt(fotoVan(fotoId)).forEach(function (s, i) { if (inLasso(s, lus)) binnen.push(i); });
        zetKeuze(fotoId, binnen);
        return;
      }
      if (sleep) {
        try { svg.releasePointerCapture(e.pointerId); } catch (err) {}
        if (verplaatst) {
          opslaan();
          tekenBalk(fotoId);
        }
        sleep = null;
        verplaatst = false;
        return;
      }
      if (!bezig) return;
      try { svg.releasePointerCapture(e.pointerId); } catch (err) {}
      var foto = fotoVan(fotoId);
      var weggegooid = false;
      if (!bezig.gum) {
        var s = bezig;
        // Een tik zonder beweging levert geen bruikbare vorm op.
        if (s.t !== 'pen' && Math.abs(s.p[0][0] - s.p[1][0]) + Math.abs(s.p[0][1] - s.p[1][1]) < 8) {
          inkt(foto).pop();
          weggegooid = true;
        }
      }
      bezig = null;
      lopendeIndex = -1;
      metPen = false;
      // Opnieuw opbouwen hoeft alleen als er iets is verdwenen; anders
      // staat het pad er al goed bij.
      if (weggegooid) tekenStreken(fotoId);
      opslaan();
      tekenBalk(fotoId);
    }
    svg.addEventListener('pointerup', klaar);
    svg.addEventListener('pointercancel', klaar);
  }

  /* ─── selecteren ───────────────────────────────────────────── */

  function elementVan(fotoId, index) {
    var svg = el('inkt-' + fotoId);
    return svg ? svg.querySelector('[data-streek="' + index + '"]') : null;
  }

  // Eerst kijken wat er precies onder je vinger zit. Een dunne lijn is
  // lastig te raken, dus als dat niets oplevert zoeken we de streek
  // waarvan het omhullende kader het punt bevat — bovenste eerst.
  function zoekStreek(fotoId, e) {
    var doel = document.elementFromPoint(e.clientX, e.clientY);
    if (doel && doel.hasAttribute && doel.hasAttribute('data-greep')) return gekozen;
    if (doel && doel.hasAttribute && doel.hasAttribute('data-streek')) {
      return parseInt(doel.getAttribute('data-streek'), 10);
    }
    var svg = el('inkt-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!svg || !foto) return -1;
    var marge = 12;
    for (var i = inkt(foto).length - 1; i >= 0; i--) {
      var node = elementVan(fotoId, i);
      if (!node || !node.getBoundingClientRect) continue;
      var r = node.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (e.clientX >= r.left - marge && e.clientX <= r.right + marge &&
          e.clientY >= r.top - marge && e.clientY <= r.bottom + marge) return i;
    }
    return -1;
  }

  // De lus die je met het lassogereedschap trekt. Wit eronder, zwart
  // gestippeld erover: zichtbaar op een lichte én op een donkere foto.
  function wisLasso(fotoId) {
    var svg = el('inkt-' + fotoId);
    if (!svg) return;
    Array.prototype.forEach.call(svg.querySelectorAll('[data-lasso]'), function (n) { n.remove(); });
  }

  function tekenLasso(fotoId) {
    var svg = el('inkt-' + fotoId);
    if (!svg || !lasso || !lasso.p.length) return;
    wisLasso(fotoId);
    var d = 'M' + lasso.p.map(function (q) { return q[0] + ' ' + q[1]; }).join('L') + 'Z';
    [{ k: '#ffffff', w: 3.5, s: null }, { k: '#1d1d1b', w: 2, s: '9 7' }].forEach(function (laag) {
      var pad = document.createElementNS(NS, 'path');
      pad.setAttribute('d', d);
      pad.setAttribute('fill', 'rgba(255,255,255,0.10)');
      pad.setAttribute('stroke', laag.k);
      pad.setAttribute('stroke-width', laag.w);
      if (laag.s) pad.setAttribute('stroke-dasharray', laag.s);
      pad.setAttribute('vector-effect', 'non-scaling-stroke');
      pad.setAttribute('pointer-events', 'none');
      pad.setAttribute('data-lasso', '1');
      svg.appendChild(pad);
    });
  }

  function tekenKader(fotoId) {
    var svg = el('inkt-' + fotoId);
    if (!svg) return;
    Array.prototype.forEach.call(svg.querySelectorAll('[data-kader]'), function (k) { k.remove(); });
    if (!keuze.length) return;
    // Bij een tekst die op dit moment getypt wordt is het invoervak zelf
    // het kader; twee omlijningen over elkaar wordt rommelig.
    if (bewerk && bewerk.fotoId === fotoId && keuze.length === 1 && bewerk.index === keuze[0]) return;
    var foto = fotoVan(fotoId);
    var vakken = [];
    keuze.forEach(function (i) {
      var v = vakVanStreek(foto.inkt[i]);
      if (v) vakken.push(v);
    });
    if (!vakken.length) return;
    var een = vakken.length === 1 ? foto.inkt[keuze[0]] : null;
    var v0 = vakSamen(vakken);
    var b = { x: v0.x, y: v0.y, width: v0.w, height: v0.h };
    // Hoe groot is één beeldpunt op het scherm in de maat van de tekening?
    // Daarmee houden kader en grepen dezelfde grootte, hoe ver je ook
    // in- of uitzoomt.
    var breed = svg.getBoundingClientRect().width || 1000;
    var perPunt = 1000 / breed;

    // Twee kaders over elkaar: een doorlopende witte lijn met daarover een
    // zwarte stippellijn. Zo blijft de omlijning zichtbaar op een donkere
    // én op een lichte foto, en heeft de gekozen tekenkleur er geen
    // invloed op.
    var m = (een && een.t === 'tekst') ? 0 : 10;

    // Bij meerdere onderdelen krijgt elk er een dun kadertje omheen, zodat
    // je ziet wát er precies in de lasso viel. Het grote kader eromheen is
    // waar je aan sleept.
    if (!een) {
      vakken.forEach(function (v) {
        var los = document.createElementNS(NS, 'rect');
        los.setAttribute('x', v.x - 4);
        los.setAttribute('y', v.y - 4);
        los.setAttribute('width', v.w + 8);
        los.setAttribute('height', v.h + 8);
        los.setAttribute('fill', 'none');
        los.setAttribute('stroke', '#1d1d1b');
        los.setAttribute('stroke-width', '1.2');
        los.setAttribute('stroke-dasharray', '5 5');
        los.setAttribute('opacity', '0.55');
        los.setAttribute('vector-effect', 'non-scaling-stroke');
        los.setAttribute('pointer-events', 'none');
        los.setAttribute('data-kader', '1');
        svg.appendChild(los);
      });
    }

    [{ k: '#ffffff', streep: null }, { k: '#1d1d1b', streep: '10 8' }].forEach(function (laag) {
      var kader = document.createElementNS(NS, 'rect');
      kader.setAttribute('x', b.x - m);
      kader.setAttribute('y', b.y - m);
      kader.setAttribute('width', b.width + m * 2);
      kader.setAttribute('height', b.height + m * 2);
      kader.setAttribute('fill', 'none');
      kader.setAttribute('stroke', laag.k);
      kader.setAttribute('stroke-width', laag.streep ? '2' : '3.5');
      if (laag.streep) kader.setAttribute('stroke-dasharray', laag.streep);
      kader.setAttribute('vector-effect', 'non-scaling-stroke');
      kader.setAttribute('pointer-events', 'none');
      kader.setAttribute('data-kader', '1');
      svg.appendChild(kader);
    });

    // Grepen op de vier hoeken. Ze laten zien dát je kunt slepen, en ze
    // geven een ruim aanraakvlak — op een tablet is de lijn zelf te dun
    // om betrouwbaar te pakken.
    var greep = 11 * perPunt;          // wat je ziet
    var raak = 26 * perPunt;           // wat je kunt raken
    var x1 = b.x - m, y1 = b.y - m, x2 = b.x + b.width + m, y2 = b.y + b.height + m;
    [[x1, y1], [x2, y1], [x1, y2], [x2, y2]].forEach(function (hoek) {
      var vlak = document.createElementNS(NS, 'rect');
      vlak.setAttribute('x', hoek[0] - raak / 2);
      vlak.setAttribute('y', hoek[1] - raak / 2);
      vlak.setAttribute('width', raak);
      vlak.setAttribute('height', raak);
      vlak.setAttribute('fill', 'transparent');
      vlak.setAttribute('data-kader', '1');
      // Elke hoek maakt groter of kleiner, vanuit de hoek er tegenover —
      // die blijft staan. Verplaatsen doe je door het onderdeel zelf te
      // pakken, of bij meerdere door binnen het kader te slepen.
      var oost = hoek[0] === x2, zuid = hoek[1] === y2;
      vlak.setAttribute('data-greep', (zuid ? 'z' : 'n') + (oost ? 'o' : 'w'));
      vlak.style.cursor = (oost === zuid) ? 'nwse-resize' : 'nesw-resize';
      svg.appendChild(vlak);

      var blok = document.createElementNS(NS, 'rect');
      blok.setAttribute('x', hoek[0] - greep / 2);
      blok.setAttribute('y', hoek[1] - greep / 2);
      blok.setAttribute('width', greep);
      blok.setAttribute('height', greep);
      blok.setAttribute('rx', 2 * perPunt);
      blok.setAttribute('fill', '#ffffff');
      blok.setAttribute('stroke', '#1d1d1b');
      blok.setAttribute('stroke-width', '2.5');
      blok.setAttribute('vector-effect', 'non-scaling-stroke');
      blok.setAttribute('pointer-events', 'none');
      blok.setAttribute('data-kader', '1');
      svg.appendChild(blok);
    });
  }

  // Eén plek waar de selectie gezet wordt, of het er nu één is of tien.
  function zetKeuze(fotoId, lijst) {
    var foto = fotoVan(fotoId);
    var aantal = foto ? inkt(foto).length : 0;
    keuze = (lijst || []).filter(function (i, n, a) {
      return i >= 0 && i < aantal && a.indexOf(i) === n;
    });
    gekozen = keuze.length ? keuze[0] : -1;
    // De instellingen in de balk volgen wat je hebt aangeklikt, zodat je
    // ziet welke kleur en grootte het onderdeel nu heeft.
    var s = gekozen >= 0 ? foto.inkt[gekozen] : null;
    if (s) {
      kleur = s.k;
      dikte = s.d;
      if (s.t === 'tekst') {
        grootte = s.g || s.d * 6;
        vet = s.vet !== false;
        schuin = !!s.schuin;
      }
    }
    tekenKader(fotoId);
    tekenBalk(fotoId);
  }

  function kiesStreek(fotoId, index) {
    zetKeuze(fotoId, index >= 0 ? [index] : []);
  }

  window.selectieOpheffen = function (fotoId) { stopTekst(); zetKeuze(fotoId, []); };

  window.selectieWeg = function (fotoId) {
    if (!keuze.length) return;
    var foto = fotoVan(fotoId);
    if (bewerk && bewerk.fotoId === fotoId && keuze.indexOf(bewerk.index) >= 0) sluitVak();
    if (window.bewaarStap) {
      bewaarStap(keuze.length > 1 ? keuze.length + ' onderdelen verwijderd' : 'Onderdeel verwijderd');
    }
    // Van achter naar voren wissen, anders schuiven de volgende indexen weg
    // onder de nog te verwijderen onderdelen.
    keuze.slice().sort(function (a, b) { return b - a; }).forEach(function (i) {
      foto.inkt.splice(i, 1);
    });
    zetKeuze(fotoId, []);
    tekenStreken(fotoId);
    opslaan();
  };

  /* ─── verplaatsen en schalen ───────────────────────────────── */

  function verplaatsSelectie(foto, sl, dx, dy) {
    sl.leden.forEach(function (lid) {
      var s = foto.inkt[lid.i];
      if (!s) return;
      s.p = lid.p.map(function (q) { return [rond(q[0] + dx), rond(q[1] + dy)]; });
    });
  }

  // De toestand van de hele selectie vastleggen op het moment dat je hem
  // vastpakt. Daarna rekenen we alles vanuit die momentopname, zodat er
  // geen afrondingsfouten opstapelen tijdens het slepen.
  // `hoek` is leeg bij verplaatsen, of 'no', 'nw', 'zo', 'zw' bij schalen.
  function grijpSelectie(fotoId, punt, hoek) {
    var foto = fotoVan(fotoId);
    var leden = [];
    var vakken = [];
    keuze.forEach(function (i) {
      var s = foto.inkt[i];
      if (!s) return;
      leden.push({ i: i, p: s.p.map(function (q) { return q.slice(); }), w: s.w, h: s.h });
      vakken.push(vakVanStreek(s));
    });
    return { start: punt, maat: !!hoek, hoek: hoek || '', leden: leden, vak: vakSamen(vakken) };
  }

  // Schalen gaat vanuit de hoek tegenover de greep: die blijft staan, de
  // greep volgt je vinger. De lijndikte en de lettergrootte veranderen niet
  // mee — die kies je in de balk, en een kleiner gesleepte pijl hoort niet
  // ineens een haarlijn te worden.
  var MIN_MAAT = 12;
  function schaalSelectie(foto, sl, dx, dy) {
    var v = sl.vak;
    if (!v) return;
    var oost = sl.hoek.indexOf('o') >= 0;      // sleep je aan de rechterkant?
    var zuid = sl.hoek.indexOf('z') >= 0;      // en aan de onderkant?
    var ax = oost ? v.x : v.x + v.w;           // het ankerpunt ligt ertegenover
    var ay = zuid ? v.y : v.y + v.h;
    var breed = oost ? v.w + dx : v.w - dx;
    var hoog  = zuid ? v.h + dy : v.h - dy;
    var fx = v.w > 1 ? Math.max(MIN_MAAT, breed) / v.w : 1;
    var fy = v.h > 1 ? Math.max(MIN_MAAT, hoog) / v.h : 1;
    sl.leden.forEach(function (lid) {
      var s = foto.inkt[lid.i];
      if (!s) return;
      s.p = lid.p.map(function (q) {
        return [rond(ax + (q[0] - ax) * fx), rond(ay + (q[1] - ay) * fy)];
      });
      // Bij tekst is het vak de vorm; de letters blijven even groot en de
      // zin breekt binnen het nieuwe vak opnieuw af.
      if (s.t === 'tekst') zetVakMaat(s, lid.w * fx, lid.h * fy);
    });
  }

  // Ligt dit punt binnen het kader om de selectie? Daarmee kun je een hele
  // lasso-selectie verslepen door ergens binnen het kader te pakken.
  function inSelectie(fotoId, punt) {
    if (!keuze.length) return false;
    var foto = fotoVan(fotoId);
    var vakken = [];
    keuze.forEach(function (i) {
      var v = vakVanStreek(foto.inkt[i]);
      if (v) vakken.push(v);
    });
    var v = vakSamen(vakken);
    if (!v) return false;
    var m = 10;
    return punt[0] >= v.x - m && punt[0] <= v.x + v.w + m &&
           punt[1] >= v.y - m && punt[1] <= v.y + v.h + m;
  }

  /* ─── tekst: een vak op de foto zelf ───────────────────────── */
  // Tikken met het tekstgereedschap opent het vak op die plek, in de kleur
  // en de grootte die de tekst op de foto krijgt. Wat je in het vak ziet is
  // wat er komt te staan: dezelfde breedte, dezelfde regelafbreking.
  //
  // Werkwijze zoals in Notability: het vak groeit mee terwijl je typt, maar
  // zodra je zelf aan de hoek sleept bepaal jij de vorm en breekt de tekst
  // daarbinnen af. De letters veranderen daar niet van grootte — die kies je
  // met de A-knoppen in de balk.

  function sluitVak() {
    if (!bewerk) return null;
    var b = bewerk;
    bewerk = null;
    if (b.doos && b.doos.parentNode) b.doos.parentNode.removeChild(b.doos);
    return b;
  }

  // Klaar met typen. Een leeg vak laat niets achter: anders staan er na een
  // misgetikte foto onzichtbare lege teksten op.
  function stopTekst() {
    var b = sluitVak();
    if (!b) return;
    var foto = fotoVan(b.fotoId);
    var s = foto && foto.inkt[b.index];
    if (s) {
      var tekst = String(b.veld.value || '').replace(/\s+$/, '');
      if (!tekst.trim()) {
        foto.inkt.splice(b.index, 1);
        // Het lege vak is weg; alles wat erachter stond schuift een plek op.
        keuze = keuze.filter(function (i) { return i !== b.index; })
                     .map(function (i) { return i > b.index ? i - 1 : i; });
        gekozen = keuze.length ? keuze[0] : -1;
      } else {
        s.tx = tekst;
      }
    }
    tekenStreken(b.fotoId);
    tekenBalk(b.fotoId);
    opslaan();
  }
  window.tekstKlaar = function () { stopTekst(); };
  window.tekstBezig = function () { return !!bewerk; };

  // Het vak op zijn plek zetten en op maat maken.
  //
  // Eén voetangel: Safari op een iPhone zoomt het hele scherm in zodra je in
  // een veld tikt waarvan de letters kleiner zijn dan 16 px. De letters op de
  // foto zijn dat vaak wel. Daarom tekenen we het vak op ware grootte met
  // minimaal 16 px en krimpen het geheel daarna met een transform. De
  // regelafbreking wordt dus op de grote maat gerekend en verkleind — precies
  // dezelfde afbreking, zonder dat het beeld verspringt.
  function plaatsVak() {
    if (!bewerk) return;
    var foto = fotoVan(bewerk.fotoId);
    var s = foto && foto.inkt[bewerk.index];
    var doek = el('doek-' + bewerk.fotoId);
    if (!s || !doek) return;
    var schaal = (doek.getBoundingClientRect().width || 1000) / 1000;
    var h = vbHoogte(foto);

    var doos = bewerk.doos;
    doos.style.left = (s.p[0][0] / 1000 * 100) + '%';
    doos.style.top = (s.p[0][1] / h * 100) + '%';
    doos.style.width = (s.w * schaal) + 'px';
    doos.style.height = (s.h * schaal) + 'px';
    // Het knoppenbalkje staat boven het vak; ligt het vak tegen de bovenrand
    // van de foto, dan is daar geen plek en klapt het balkje naar onderen.
    var hoogteDoek = doek.getBoundingClientRect().height || 0;
    var bovenPx = s.p[0][1] / h * hoogteDoek;
    doos.classList.toggle('tk-vak-onder', bovenPx < 40);

    var wens = s.g * schaal;
    var basis = Math.max(16, wens);
    var krimp = wens / basis;
    var vlak = bewerk.vlak;
    vlak.style.transform = 'scale(' + krimp + ')';
    vlak.style.width = (s.w * schaal / krimp) + 'px';
    vlak.style.height = (s.h * schaal / krimp) + 'px';

    var veld = bewerk.veld;
    veld.style.fontSize = basis + 'px';
    veld.style.lineHeight = REGELHOOGTE;
    veld.style.padding = (basis * TEKSTRAND) + 'px';
    veld.style.color = s.k;
    veld.style.fontWeight = s.vet === false ? '400' : '700';
    veld.style.fontStyle = s.schuin ? 'italic' : 'normal';
    var rand = lichtOfDonker(s.k);
    veld.style.textShadow = [
      '-1px -1px 0 ' + rand, '1px -1px 0 ' + rand,
      '-1px 1px 0 ' + rand, '1px 1px 0 ' + rand
    ].join(',');
  }

  // Tijdens het typen groeit het vak mee, tenzij je het zelf al hebt
  // versleept. Daarna blijft de vorm staan en breekt de tekst daarbinnen af.
  function tekstGetypt() {
    if (!bewerk) return;
    var foto = fotoVan(bewerk.fotoId);
    var s = foto && foto.inkt[bewerk.index];
    if (!s) return;
    s.tx = bewerk.veld.value;
    tekstPas(s);
    plaatsVak();
    werkTekstBij(bewerk.fotoId, bewerk.index);
  }

  // Alleen deze ene tekst opnieuw tekenen; de hele laag opbouwen bij elke
  // toetsaanslag is onnodig werk.
  function werkTekstBij(fotoId, index) {
    var svg = el('inkt-' + fotoId);
    var foto = fotoVan(fotoId);
    var s = foto && foto.inkt[index];
    if (!svg || !s) return;
    var oud = svg.querySelector('[data-streek="' + index + '"]');
    var nieuw = maakTekst(s, index);
    if (bewerk && bewerk.fotoId === fotoId && bewerk.index === index) {
      // Tijdens het typen staat de tekst in het vak; hem er ook onder
      // tekenen geeft dubbele letters.
      nieuw.setAttribute('visibility', 'hidden');
    }
    if (oud) svg.replaceChild(nieuw, oud); else svg.appendChild(nieuw);
    tekenKader(fotoId);
  }

  // De grepen op het vak: linksboven verplaatsen, rechtsonder het vak groter
  // of kleiner maken. preventDefault houdt de focus in het veld, zodat het
  // toetsenbord op een telefoon niet wegklapt zodra je een greep pakt.
  function koppelGreep(greep, rol) {
    if (!greep) return;
    greep.addEventListener('pointerdown', function (e) {
      if (!bewerk) return;
      e.preventDefault();
      e.stopPropagation();
      var b = bewerk;
      var foto = fotoVan(b.fotoId);
      var s = foto && foto.inkt[b.index];
      var doek = el('doek-' + b.fotoId);
      if (!s || !doek) return;
      var schaal = (doek.getBoundingClientRect().width || 1000) / 1000;
      var begin = { x: e.clientX, y: e.clientY, p: s.p[0].slice(), w: s.w, h: s.h };
      if (window.bewaarStap) bewaarStap(rol === 'sleep' ? 'Tekst verplaatst' : 'Tekstvak aangepast');
      try { greep.setPointerCapture(e.pointerId); } catch (err) {}

      function beweeg(ev) {
        ev.preventDefault();
        var dx = (ev.clientX - begin.x) / schaal;
        var dy = (ev.clientY - begin.y) / schaal;
        if (rol === 'sleep') {
          s.p[0] = [Math.round((begin.p[0] + dx) * 10) / 10,
                    Math.round((begin.p[1] + dy) * 10) / 10];
        } else {
          zetVakMaat(s, begin.w + dx, begin.h + dy);
        }
        plaatsVak();
        werkTekstBij(b.fotoId, b.index);
      }
      function los(ev) {
        greep.removeEventListener('pointermove', beweeg);
        greep.removeEventListener('pointerup', los);
        greep.removeEventListener('pointercancel', los);
        try { greep.releasePointerCapture(ev.pointerId); } catch (err) {}
        opslaan();
        tekenBalk(b.fotoId);
        if (bewerk) bewerk.veld.focus();
      }
      greep.addEventListener('pointermove', beweeg);
      greep.addEventListener('pointerup', los);
      greep.addEventListener('pointercancel', los);
    });
  }

  // Eén plek waar de maat van een vak wordt vastgelegd, met ondergrenzen die
  // aan de lettergrootte hangen: smaller dan één letter heeft geen zin.
  function zetVakMaat(s, w, h) {
    var g = s.g || 40;
    s.w = Math.round(Math.max(g * 1.4, Math.min(1000, w)));
    s.h = Math.round(Math.max(g * REGELHOOGTE + g * TEKSTRAND * 2, Math.min(2000, h)));
    s.vast = true;
  }
  window.zetVakMaat = zetVakMaat;

  function opentVak(fotoId, index) {
    stopTekst();
    var doek = el('doek-' + fotoId);
    var foto = fotoVan(fotoId);
    var s = foto && foto.inkt[index];
    if (!doek || !s) return;
    tekstNorm(s);

    var doos = document.createElement('div');
    doos.className = 'tk-vak';
    doos.innerHTML =
      '<div class="tk-vak-knoppen">' +
        '<span class="tk-vak-greep tk-vak-sleep" title="Verplaatsen">✥</span>' +
        '<button class="tk-vak-klaar" type="button" title="Klaar">✓</button>' +
      '</div>' +
      '<div class="tk-vak-schaal"><textarea class="tk-vak-veld" ' +
        'autocomplete="off" autocorrect="off" spellcheck="false" ' +
        'placeholder="tekst…"></textarea></div>' +
      '<span class="tk-vak-greep tk-vak-maat" title="Vak groter of kleiner">⤡</span>';
    doek.appendChild(doos);

    var veld = doos.querySelector('.tk-vak-veld');
    veld.value = s.tx || '';
    bewerk = { fotoId: fotoId, index: index, doos: doos,
               vlak: doos.querySelector('.tk-vak-schaal'), veld: veld };

    // Het vak is het geselecteerde onderdeel: de balk toont meteen de kleur-
    // en grootteknoppen en die werken op déze tekst.
    keuze = [index];
    gekozen = index;
    var node = elementVan(fotoId, index);
    if (node) node.setAttribute('visibility', 'hidden');
    tekenKader(fotoId);
    plaatsVak();

    veld.addEventListener('input', tekstGetypt);
    veld.addEventListener('keydown', function (e) {
      // Enter maakt een nieuwe regel, net als in een notitie-app. Klaar ben
      // je met het vinkje, met Escape, of door naast het vak te tikken.
      if (e.key === 'Escape') { e.preventDefault(); stopTekst(); }
    });
    doos.querySelector('.tk-vak-klaar').addEventListener('pointerdown', function (e) {
      e.preventDefault();
      stopTekst();
    });
    koppelGreep(doos.querySelector('.tk-vak-sleep'), 'sleep');
    koppelGreep(doos.querySelector('.tk-vak-maat'), 'maat');

    // Meteen focus: op een telefoon komt het toetsenbord alleen op als dit
    // binnen de aanraking zelf gebeurt, niet in een timer erna.
    veld.focus();
    try { veld.setSelectionRange(veld.value.length, veld.value.length); } catch (err) {}
    tekenBalk(fotoId);
  }

  // De ✎-knop in de balk: dezelfde bewerking als bij een nieuwe tekst.
  window.selectieTekst = function (fotoId) {
    var foto = fotoVan(fotoId);
    var s = gekozen >= 0 ? foto.inkt[gekozen] : null;
    if (!s || s.t !== 'tekst') return;
    if (window.bewaarStap) bewaarStap('Tekst gewijzigd');
    opentVak(fotoId, gekozen);
  };

  function zetTekst(fotoId, punt) {
    var foto = fotoVan(fotoId);
    // Al aan het typen? Dan sluit die eerst af; tikken naast het vak is de
    // manier om klaar te zijn.
    if (bewerk) { stopTekst(); }
    if (window.bewaarStap) bewaarStap('Tekst toegevoegd');
    var nieuw = { t: 'tekst', k: kleur, d: dikte, g: grootte,
                  vet: vet, schuin: schuin, p: [punt.slice()], tx: '', vast: false };
    tekstPas(nieuw);
    inkt(foto).push(nieuw);
    var index = foto.inkt.length - 1;
    var svgEl = el('inkt-' + fotoId);
    if (svgEl) svgEl.appendChild(maakTekst(nieuw, index));
    else tekenStreken(fotoId);
    opentVak(fotoId, index);
  }

  function gum(e, fotoId) {
    var doel = document.elementFromPoint(e.clientX, e.clientY);
    if (!doel || !doel.hasAttribute || !doel.hasAttribute('data-streek')) return;
    var i = parseInt(doel.getAttribute('data-streek'), 10);
    var foto = fotoVan(fotoId);
    if (isNaN(i) || !foto.inkt[i]) return;
    foto.inkt.splice(i, 1);
    tekenStreken(fotoId);
  }

  /* ─── balk met gereedschap ─────────────────────────────────── */

  window.tekenModus = function (fotoId) {
    stopTekst();
    actief = (actief === fotoId) ? null : fotoId;
    fotos.forEach(function (f) { zetModus(f.id); tekenBalk(f.id); });
  };

  function zetModus(fotoId) {
    var blok = el('blok-' + fotoId);
    if (!blok) return;
    blok.classList.toggle('tekent', actief === fotoId);
    // Met vingertekenen aan mag het schuifvenster de veeg niet meer
    // afpakken; staat het uit, dan wil je juist wél kunnen schuiven.
    // Met het tekstgereedschap geldt hetzelfde: je zet het vak met je
    // vinger neer, dus de veeg mag niet doorgaan naar het schuifvenster.
    blok.classList.toggle('vinger', actief === fotoId &&
      (vingerTekent || stuk === 'tekst' || stuk === 'lasso'));
  }

  // Is er iets geselecteerd, dan verandert die keuze dát onderdeel.
  // Zonder selectie geldt de keuze voor alles wat je daarna maakt.
  window.tekenKies = function (fotoId, wat, waarde) {
    var foto = fotoVan(fotoId);
    // Alles wat geselecteerd is verandert mee. Bij één onderdeel is dat
    // precies zoals het altijd werkte; na een lasso geldt het voor de hele
    // groep in één keer.
    var leden = [];
    if (foto) {
      keuze.forEach(function (i) { if (foto.inkt[i]) leden.push(foto.inkt[i]); });
    }

    if (wat === 'stuk') {
      // Overstappen op ander gereedschap sluit een lopend tekstvak af.
      if (waarde !== 'tekst') stopTekst();
      stuk = waarde;
      // Een selectie hoort bij het keuze- of lassogereedschap; stap je over
      // op tekenen, dan is die selectie niet meer aan de orde.
      if (waarde !== 'kies' && waarde !== 'lasso' && waarde !== 'tekst' && keuze.length) {
        zetKeuze(fotoId, []);
      }
      zetModus(fotoId);
      tekenBalk(fotoId);
      return;
    }

    if (wat === 'vinger') { vingerTekent = !vingerTekent; zetModus(fotoId); tekenBalk(fotoId); return; }

    function opAlle(doe) { leden.forEach(doe); }
    if (wat === 'kleur') { kleur = waarde; opAlle(function (x) { x.k = waarde; }); }
    if (wat === 'dikte') {
      dikte = parseFloat(waarde);
      opAlle(function (x) { x.d = dikte; });
    }
    if (wat === 'grootte') {
      grootte = parseFloat(waarde);
      opAlle(function (x) { if (x.t === 'tekst') x.g = grootte; });
    }
    if (wat === 'vet') { vet = !vet; opAlle(function (x) { if (x.t === 'tekst') x.vet = vet; }); }
    if (wat === 'schuin') { schuin = !schuin; opAlle(function (x) { if (x.t === 'tekst') x.schuin = schuin; }); }

    if (leden.length) {
      // Een andere lettergrootte of stijl verandert hoeveel ruimte de tekst
      // nodig heeft. Een vak dat je zelf hebt versleept blijft zoals het is
      // — daar breekt de tekst dan binnen af.
      opAlle(function (x) { if (x.t === 'tekst') tekstPas(x); });
      if (bewerk) plaatsVak();
      if (window.bewaarStap) {
        bewaarStap(leden.length > 1 ? leden.length + ' onderdelen gewijzigd' : 'Onderdeel gewijzigd');
      }
      tekenStreken(fotoId);
      if (bewerk) {
        var node2 = elementVan(fotoId, bewerk.index);
        if (node2) node2.setAttribute('visibility', 'hidden');
      }
      opslaan();
    }
    // Staat er een tekstvak open, dan moet dat de nieuwe kleur of grootte
    // meteen laten zien — anders typ je in iets anders dan je krijgt.
    if (bewerk && bewerk.fotoId === fotoId) { plaatsVak(); bewerk.veld.focus(); }
    tekenBalk(fotoId);
  };

  window.tekenTerug = function (fotoId) {
    stopTekst();
    var foto = fotoVan(fotoId);
    if (!foto || !inkt(foto).length) return;
    foto.inkt.pop();
    tekenStreken(fotoId);
    tekenBalk(fotoId);
    opslaan();
  };

  window.tekenWis = async function (fotoId) {
    stopTekst();
    var foto = fotoVan(fotoId);
    if (!foto || !inkt(foto).length) return;
    if (!await appVraag('Alle tekeningen op deze foto wissen? De merkbolletjes blijven staan.',
        { kop: 'Tekening wissen', ja: 'Wissen', gevaarlijk: true })) return;
    if (!fotoVan(fotoId) || !inkt(foto).length) return;
    if (window.bewaarStap) bewaarStap('Tekening gewist');
    foto.inkt = [];
    tekenStreken(fotoId);
    tekenBalk(fotoId);
    opslaan();
  };

  // Zoomen of het venster verslepen verandert de schaal van de foto; het
  // vak moet dan mee.
  window.addEventListener('resize', function () { plaatsVak(); });

  function tekenBalk(fotoId) {
    var balk = el('tekenbalk-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!balk || !foto) return;
    if (actief !== fotoId) { balk.style.display = 'none'; balk.innerHTML = ''; return; }

    var gekozenStreek = gekozen >= 0 ? foto.inkt[gekozen] : null;
    var meer = keuze.length > 1;
    var heeftTekst = keuze.some(function (i) {
      return foto.inkt[i] && foto.inkt[i].t === 'tekst';
    });
    var tekstActief = stuk === 'tekst' || heeftTekst;

    var stukken = '<div class="tk-groep">' +
      GEREEDSCHAP.map(function (g) {
        return '<button class="tk-knop' + (stuk === g.id ? ' aan' : '') + '" title="' + g.naam +
               '" onclick="tekenKies(\'' + fotoId + '\',\'stuk\',\'' + g.id + '\')">' + g.teken + '</button>';
      }).join('') + '</div>';

    var kleuren = '<div class="tk-groep">' +
      KLEUREN.map(function (c) {
        return '<button class="tk-kleur' + (kleur === c.k ? ' aan' : '') + '" title="' + c.naam +
               '" style="background:' + c.k + '" onclick="tekenKies(\'' + fotoId + '\',\'kleur\',\'' + c.k + '\')"></button>';
      }).join('') + '</div>';

    var diktes = '<div class="tk-groep" title="Lijndikte">' +
      DIKTES.map(function (d) {
        return '<button class="tk-knop' + (dikte === d.d ? ' aan' : '') + '" title="' + d.naam +
               '" onclick="tekenKies(\'' + fotoId + '\',\'dikte\',\'' + d.d + '\')">' +
               '<span class="tk-stip" style="width:' + (d.d / 2 + 3) + 'px;height:' + (d.d / 2 + 3) + 'px"></span></button>';
      }).join('') + '</div>';

    // Lettergrootte en stijl alleen tonen als het over tekst gaat.
    var tekstOpties = !tekstActief ? '' :
      '<div class="tk-groep tk-tekst" title="Lettergrootte">' +
        GROOTTES.map(function (g) {
          return '<button class="tk-knop' + (grootte === g.g ? ' aan' : '') + '" title="' + g.naam +
                 '" onclick="tekenKies(\'' + fotoId + '\',\'grootte\',\'' + g.g + '\')">' +
                 '<span style="font-size:' + Math.round(9 + g.g / 9) + 'px;line-height:1">A</span></button>';
        }).join('') +
        '<button class="tk-knop' + (vet ? ' aan' : '') + '" title="Vet" ' +
          'onclick="tekenKies(\'' + fotoId + '\',\'vet\')"><b>B</b></button>' +
        '<button class="tk-knop' + (schuin ? ' aan' : '') + '" title="Schuin" ' +
          'onclick="tekenKies(\'' + fotoId + '\',\'schuin\')"><i>I</i></button>' +
      '</div>';

    var algemeen = '<div class="tk-groep">' +
        '<button class="tk-knop" title="Laatste streek terug" onclick="tekenTerug(\'' + fotoId + '\')">↶</button>' +
        '<button class="tk-knop" title="Alles wissen" onclick="tekenWis(\'' + fotoId + '\')">🗑</button>' +
      '</div>';

    var selectie = !gekozenStreek ? '' :
      '<div class="tk-selectie">' +
        '<span class="tk-label">' +
          (meer ? keuze.length + ' onderdelen geselecteerd'
                : esc(omschrijf(gekozenStreek)) + ' geselecteerd') + '</span>' +
        (!meer && gekozenStreek.t === 'tekst' && !bewerk
          ? '<button class="tk-knop" title="Tekst wijzigen" onclick="selectieTekst(\'' + fotoId + '\')">✎</button>' : '') +
        (bewerk ? '<button class="tk-knop" title="Klaar met typen" onclick="tekstKlaar()">✓</button>' : '') +
        '<button class="tk-knop tk-weg" title="Verwijderen" onclick="selectieWeg(\'' + fotoId + '\')">🗑</button>' +
        '<button class="tk-knop" title="Selectie opheffen" onclick="selectieOpheffen(\'' + fotoId + '\')">✕</button>' +
      '</div>';

    var hint = bewerk
      ? 'Typ de tekst · ✥ verplaatsen, ⤡ groter of kleiner, ✓ of Enter is klaar'
      : (gekozenStreek
        ? 'Sleep aan een hoek om te verplaatsen, rechtsonder om groter of kleiner te maken · ' +
          'kleur, dikte en grootte gelden voor ' + (meer ? 'alles wat geselecteerd is' : 'dit onderdeel')
        : (stuk === 'kies' ? 'Tik op een lijn of tekst om hem te selecteren'
          : (stuk === 'lasso' ? 'Omcirkel wat je wilt selecteren'
            : (stuk === 'tekst' ? 'Tik op de foto waar de tekst moet komen'
              : 'Pen tekent, vinger schuift'))));

    // Vasthouden werkt bij pen, lijn, pijl en rechthoek. Bij selecteren,
    // tekst en de gum valt die uitleg weg; daar doet hij niets.
    var vormStukken = ['pen', 'lijn', 'pijl', 'rect'];
    var vormhint = (vormStukken.indexOf(stuk) >= 0 && !bewerk && !gekozenStreek)
      ? '<span class="tk-vormhint" title="Teken de vorm en blijf even stilstaan ' +
        'voordat je loslaat">\u24d8 Hou vast voor nette vormen en lijnen</span>'
      : '';

    balk.style.display = 'flex';
    balk.innerHTML = stukken + kleuren + diktes + tekstOpties + algemeen + selectie +
      vormhint +
      '<label class="tk-vinger"><input type="checkbox"' + (vingerTekent ? ' checked' : '') +
        ' onchange="tekenKies(\'' + fotoId + '\',\'vinger\')"> Met vinger tekenen</label>' +
      '<span class="tk-info">' + inkt(foto).length + ' onderdelen · ' + hint + '</span>';
  }

  function omschrijf(s) {
    var namen = { pen: 'Streek', lijn: 'Lijn', pijl: 'Pijl', rect: 'Rechthoek', tekst: 'Tekst' };
    return (namen[s.t] || 'Onderdeel') + (s.t === 'tekst' && s.tx ? ' “' + s.tx + '”' : '');
  }
})();
