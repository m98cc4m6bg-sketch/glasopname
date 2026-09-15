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
    { naam: 'Rood',   k: '#d00243' },
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
  var PIJL_ICOON =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<path d="M5 2.5 L19 12.5 L12.4 13.2 L16 20.5 L13.1 21.8 L9.6 14.6 L5 18.6 Z" ' +
    'fill="currentColor" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></svg>';

  var GUM_ICOON =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
    '<g transform="rotate(-38 12 12)">' +
    '<rect x="5.5" y="7" width="13" height="10" rx="2" fill="#f08a24" stroke="#8a4a06" stroke-width="1.2"/>' +
    '<path d="M12 7 v10" stroke="#8a4a06" stroke-width="1.2"/>' +
    '<path d="M12 7 h6.5 a2 2 0 0 1 2 2 v6 a2 2 0 0 1 -2 2 H12 Z" fill="#ffd9b0" stroke="#8a4a06" stroke-width="1.2"/>' +
    '</g></svg>';

  var GEREEDSCHAP = [
    { id: 'kies', teken: PIJL_ICOON, naam: 'Selecteren' },
    { id: 'pen',  teken: '✏️', naam: 'Pen' },
    { id: 'lijn', teken: '╱',  naam: 'Rechte lijn' },
    { id: 'pijl', teken: '➔',  naam: 'Pijl' },
    { id: 'rect', teken: '▭',  naam: 'Rechthoek' },
    { id: 'tekst', teken: 'T', naam: 'Tekst' },
    { id: 'gum',  teken: GUM_ICOON, naam: 'Gum' }
  ];

  var NS = 'http://www.w3.org/2000/svg';
  var actief = null;      // fotoId waarop getekend wordt
  var stuk = 'pen';
  var kleur = '#d00243';
  var dikte = 6;
  var vingerTekent = false;
  var grootte = 40;       // lettergrootte voor nieuwe tekst
  var vet = true;
  var schuin = false;
  var gekozen = -1;       // welke streek geselecteerd is, -1 = geen
  var metPen = false;     // laatste aanraking kwam van een pen of muis
  var sleep = null;       // bezig met verslepen van een geselecteerd onderdeel
  var verplaatst = false;
  var bezig = null;       // lopende streek
  var lopendeIndex = -1;

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

  function maakTekst(streek, index) {
    var el = document.createElementNS(NS, 'text');
    el.setAttribute('x', streek.p[0][0]);
    el.setAttribute('y', streek.p[0][1]);
    el.setAttribute('dy', '0.35em');
    el.setAttribute('fill', streek.k);
    el.setAttribute('stroke', lichtOfDonker(streek.k));
    el.setAttribute('stroke-width', Math.max(1, streek.d * 0.28));
    el.setAttribute('paint-order', 'stroke fill');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('font-size', streek.g || streek.d * 6);
    el.setAttribute('font-family', "'Segoe UI', Arial, sans-serif");
    el.setAttribute('font-weight', streek.vet === false ? '400' : '700');
    if (streek.schuin) el.setAttribute('font-style', 'italic');
    el.setAttribute('data-streek', index);
    el.textContent = streek.tx || '';
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
    if (gekozen >= inkt(foto).length) gekozen = -1;
    tekenKader(fotoId);
  }

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
      if (!vingerTekent && !pen) return;
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
      if (stuk === 'kies') {
        var gevonden = zoekStreek(fotoId, e);
        kiesStreek(fotoId, gevonden);
        // Meteen kunnen slepen: aanklikken en verplaatsen is één beweging.
        if (gevonden >= 0) {
          var s = fotoVan(fotoId).inkt[gevonden];
          sleep = {
            index: gevonden,
            start: punt,
            oorsprong: s.p.map(function (q) { return q.slice(); })
          };
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
    });

    svg.addEventListener('pointermove', function (e) {
      // Een geselecteerd onderdeel verslepen.
      if (sleep && actief === fotoId) {
        e.preventDefault();
        var nu = plek(e, svg);
        var dx = nu[0] - sleep.start[0], dy = nu[1] - sleep.start[1];
        var s = fotoVan(fotoId).inkt[sleep.index];
        if (!s) { sleep = null; return; }
        // De momentopname moet vóór de eerste verplaatsing gemaakt worden,
        // anders zet ongedaan maken het onderdeel terug op de nieuwe plek.
        if (!verplaatst && window.bewaarStap) bewaarStap('Onderdeel verplaatst');
        s.p = sleep.oorsprong.map(function (q) {
          return [Math.round((q[0] + dx) * 10) / 10, Math.round((q[1] + dy) * 10) / 10];
        });
        verplaatst = true;
        tekenStreken(fotoId);
        return;
      }
      if (!bezig || actief !== fotoId) return;
      e.preventDefault();
      if (bezig.gum) { gum(e, fotoId); return; }

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

  function tekenKader(fotoId) {
    var svg = el('inkt-' + fotoId);
    if (!svg) return;
    Array.prototype.forEach.call(svg.querySelectorAll('[data-kader]'), function (k) { k.remove(); });
    if (gekozen < 0) return;
    var node = elementVan(fotoId, gekozen);
    if (!node || !node.getBBox) return;
    var b;
    try { b = node.getBBox(); } catch (err) { return; }
    // Twee kaders over elkaar: een doorlopende witte lijn met daarover een
    // zwarte stippellijn. Zo blijft de omlijning zichtbaar op een donkere
    // én op een lichte foto, en heeft de gekozen tekenkleur er geen
    // invloed op.
    var m = 10;
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
  }

  function kiesStreek(fotoId, index) {
    gekozen = index;
    // De instellingen in de balk volgen wat je hebt aangeklikt, zodat je
    // ziet welke kleur en grootte het onderdeel nu heeft.
    var s = index >= 0 ? fotoVan(fotoId).inkt[index] : null;
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

  window.selectieOpheffen = function (fotoId) { kiesStreek(fotoId, -1); };

  window.selectieWeg = function (fotoId) {
    if (gekozen < 0) return;
    var foto = fotoVan(fotoId);
    if (window.bewaarStap) bewaarStap('Onderdeel verwijderd');
    foto.inkt.splice(gekozen, 1);
    gekozen = -1;
    tekenStreken(fotoId);
    tekenBalk(fotoId);
    opslaan();
  };

  window.selectieTekst = function (fotoId) {
    var foto = fotoVan(fotoId);
    var s = gekozen >= 0 ? foto.inkt[gekozen] : null;
    if (!s || s.t !== 'tekst') return;
    var nieuw = prompt('Tekst wijzigen:', s.tx || '');
    if (nieuw === null) return;
    nieuw = nieuw.trim();
    if (!nieuw) return;
    if (window.bewaarStap) bewaarStap('Tekst gewijzigd');
    s.tx = nieuw;
    tekenStreken(fotoId);
    tekenKader(fotoId);
    opslaan();
  };

  function zetTekst(fotoId, punt) {
    var foto = fotoVan(fotoId);
    var tekst = prompt('Welke tekst wil je op de foto zetten?', '');
    if (tekst === null) return;
    tekst = tekst.trim();
    if (!tekst) return;
    if (window.bewaarStap) bewaarStap('Tekst toegevoegd');
    inkt(foto).push({ t: 'tekst', k: kleur, d: dikte, g: grootte,
                      vet: vet, schuin: schuin, p: [punt], tx: tekst });
    var svgEl = el('inkt-' + fotoId);
    if (svgEl) svgEl.appendChild(maakTekst(foto.inkt[foto.inkt.length - 1], foto.inkt.length - 1));
    else tekenStreken(fotoId);
    opslaan();
    tekenBalk(fotoId);
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
    actief = (actief === fotoId) ? null : fotoId;
    fotos.forEach(function (f) { zetModus(f.id); tekenBalk(f.id); });
  };

  function zetModus(fotoId) {
    var blok = el('blok-' + fotoId);
    if (!blok) return;
    blok.classList.toggle('tekent', actief === fotoId);
    // Met vingertekenen aan mag het schuifvenster de veeg niet meer
    // afpakken; staat het uit, dan wil je juist wél kunnen schuiven.
    blok.classList.toggle('vinger', actief === fotoId && vingerTekent);
  }

  // Is er iets geselecteerd, dan verandert die keuze dát onderdeel.
  // Zonder selectie geldt de keuze voor alles wat je daarna maakt.
  window.tekenKies = function (fotoId, wat, waarde) {
    var foto = fotoVan(fotoId);
    var s = (gekozen >= 0 && foto) ? foto.inkt[gekozen] : null;

    if (wat === 'stuk') {
      stuk = waarde;
      // Een selectie hoort bij het keuzegereedschap; stap je over op
      // tekenen, dan is die selectie niet meer aan de orde.
      if (waarde !== 'kies' && gekozen >= 0) { gekozen = -1; tekenKader(fotoId); }
      tekenBalk(fotoId);
      return;
    }

    if (wat === 'vinger') { vingerTekent = !vingerTekent; zetModus(fotoId); tekenBalk(fotoId); return; }

    if (wat === 'kleur') { kleur = waarde; if (s) s.k = waarde; }
    if (wat === 'dikte') { dikte = parseFloat(waarde); if (s) s.d = parseFloat(waarde); }
    if (wat === 'grootte') { grootte = parseFloat(waarde); if (s && s.t === 'tekst') s.g = parseFloat(waarde); }
    if (wat === 'vet') { vet = !vet; if (s && s.t === 'tekst') s.vet = !(s.vet !== false); else vet = vet; }
    if (wat === 'schuin') { schuin = !schuin; if (s && s.t === 'tekst') s.schuin = !s.schuin; }

    if (s) {
      if (wat === 'vet') vet = s.vet !== false;
      if (wat === 'schuin') schuin = !!s.schuin;
      if (window.bewaarStap) bewaarStap('Onderdeel gewijzigd');
      tekenStreken(fotoId);
      opslaan();
    }
    tekenBalk(fotoId);
  };

  window.tekenTerug = function (fotoId) {
    var foto = fotoVan(fotoId);
    if (!foto || !inkt(foto).length) return;
    foto.inkt.pop();
    tekenStreken(fotoId);
    tekenBalk(fotoId);
    opslaan();
  };

  window.tekenWis = function (fotoId) {
    var foto = fotoVan(fotoId);
    if (!foto || !inkt(foto).length) return;
    if (!confirm('Alle tekeningen op deze foto wissen? De merkbolletjes blijven staan.')) return;
    if (window.bewaarStap) bewaarStap('Tekening gewist');
    foto.inkt = [];
    tekenStreken(fotoId);
    tekenBalk(fotoId);
    opslaan();
  };

  function tekenBalk(fotoId) {
    var balk = el('tekenbalk-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!balk || !foto) return;
    if (actief !== fotoId) { balk.style.display = 'none'; balk.innerHTML = ''; return; }

    var gekozenStreek = gekozen >= 0 ? foto.inkt[gekozen] : null;
    var tekstActief = stuk === 'tekst' || (gekozenStreek && gekozenStreek.t === 'tekst');

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
        '<span class="tk-label">' + esc(omschrijf(gekozenStreek)) + ' geselecteerd</span>' +
        (gekozenStreek.t === 'tekst'
          ? '<button class="tk-knop" title="Tekst wijzigen" onclick="selectieTekst(\'' + fotoId + '\')">✎</button>' : '') +
        '<button class="tk-knop tk-weg" title="Verwijderen" onclick="selectieWeg(\'' + fotoId + '\')">🗑</button>' +
        '<button class="tk-knop" title="Selectie opheffen" onclick="selectieOpheffen(\'' + fotoId + '\')">✕</button>' +
      '</div>';

    var hint = gekozenStreek
      ? 'Sleep om te verplaatsen · wijzig kleur, dikte of grootte voor dit onderdeel'
      : (stuk === 'kies' ? 'Tik op een lijn of tekst om hem te selecteren'
                         : 'Pen tekent, vinger schuift');

    balk.style.display = 'flex';
    balk.innerHTML = stukken + kleuren + diktes + tekstOpties + algemeen + selectie +
      '<label class="tk-vinger"><input type="checkbox"' + (vingerTekent ? ' checked' : '') +
        ' onchange="tekenKies(\'' + fotoId + '\',\'vinger\')"> Met vinger tekenen</label>' +
      '<span class="tk-info">' + inkt(foto).length + ' onderdelen · ' + hint + '</span>';
  }

  function omschrijf(s) {
    var namen = { pen: 'Streek', lijn: 'Lijn', pijl: 'Pijl', rect: 'Rechthoek', tekst: 'Tekst' };
    return (namen[s.t] || 'Onderdeel') + (s.t === 'tekst' && s.tx ? ' “' + s.tx + '”' : '');
  }
})();
