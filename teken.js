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
    { naam: 'Geel',   k: '#f0a500' },
    { naam: 'Blauw',  k: '#1668c4' },
    { naam: 'Groen',  k: '#1a6b3c' }
  ];
  var DIKTES = [
    { naam: 'Dun',    d: 3 },
    { naam: 'Normaal', d: 6 },
    { naam: 'Dik',    d: 11 }
  ];
  var GEREEDSCHAP = [
    { id: 'pen',  teken: '✏️', naam: 'Pen' },
    { id: 'lijn', teken: '╱',  naam: 'Rechte lijn' },
    { id: 'pijl', teken: '➔',  naam: 'Pijl' },
    { id: 'rect', teken: '▭',  naam: 'Rechthoek' },
    { id: 'gum',  teken: '🧽', naam: 'Gum' }
  ];

  var NS = 'http://www.w3.org/2000/svg';
  var actief = null;      // fotoId waarop getekend wordt
  var stuk = 'pen';
  var kleur = '#d00243';
  var dikte = 6;
  var vingerTekent = false;
  var bezig = null;       // lopende streek

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

  function pijlpunt(streek, index) {
    var p = streek.p;
    var hoek = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]);
    var lengte = Math.max(14, streek.d * 3.2);
    var g = document.createElementNS(NS, 'path');
    var x = p[1][0], y = p[1][1];
    var a1 = hoek + Math.PI * 0.82, a2 = hoek - Math.PI * 0.82;
    g.setAttribute('d', 'M' + x + ' ' + y +
      'L' + (x + Math.cos(a1) * lengte) + ' ' + (y + Math.sin(a1) * lengte) +
      'M' + x + ' ' + y +
      'L' + (x + Math.cos(a2) * lengte) + ' ' + (y + Math.sin(a2) * lengte));
    g.setAttribute('fill', 'none');
    g.setAttribute('stroke', streek.k);
    g.setAttribute('stroke-width', streek.d);
    g.setAttribute('stroke-linecap', 'round');
    g.setAttribute('data-streek', index);
    return g;
  }

  function tekenStreken(fotoId) {
    var svg = el('inkt-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!svg || !foto) return;
    svg.innerHTML = '';
    inkt(foto).forEach(function (s, i) {
      svg.appendChild(maakPad(s, i));
      if (s.t === 'pijl' && s.p.length > 1) svg.appendChild(pijlpunt(s, i));
    });
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

  function koppelPointer(svg, fotoId) {
    svg.addEventListener('pointerdown', function (e) {
      if (actief !== fotoId) return;
      // Met de vinger schuif en zoom je; tekenen doe je met de pen of
      // de muis, tenzij vingertekenen aanstaat.
      if (e.pointerType === 'touch' && !vingerTekent) return;
      e.preventDefault();
      e.stopPropagation();
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}

      var punt = plek(e, svg);
      if (stuk === 'gum') { gum(e, fotoId); bezig = { gum: true }; return; }
      var foto = fotoVan(fotoId);
      bezig = { t: stuk, k: kleur, d: dikte, p: [punt] };
      if (stuk !== 'pen') bezig.p.push(punt.slice());
      inkt(foto).push(bezig);
      tekenStreken(fotoId);
    });

    svg.addEventListener('pointermove', function (e) {
      if (!bezig || actief !== fotoId) return;
      e.preventDefault();
      if (bezig.gum) { gum(e, fotoId); return; }
      var punt = plek(e, svg);
      if (bezig.t === 'pen') {
        var vorig = bezig.p[bezig.p.length - 1];
        // Punten die vlak bij elkaar liggen voegen niets toe en maken
        // het bestand alleen groter.
        if (Math.abs(punt[0] - vorig[0]) + Math.abs(punt[1] - vorig[1]) < 3) return;
        bezig.p.push(punt);
      } else {
        bezig.p[1] = punt;
      }
      tekenStreken(fotoId);
    });

    function klaar(e) {
      if (!bezig) return;
      try { svg.releasePointerCapture(e.pointerId); } catch (err) {}
      var foto = fotoVan(fotoId);
      if (!bezig.gum) {
        var s = bezig;
        // Een tik zonder beweging levert geen bruikbare vorm op.
        if (s.t !== 'pen' && Math.abs(s.p[0][0] - s.p[1][0]) + Math.abs(s.p[0][1] - s.p[1][1]) < 8) {
          inkt(foto).pop();
          tekenStreken(fotoId);
        }
      }
      bezig = null;
      opslaan();
      tekenBalk(fotoId);
    }
    svg.addEventListener('pointerup', klaar);
    svg.addEventListener('pointercancel', klaar);
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
    if (blok) blok.classList.toggle('tekent', actief === fotoId);
  }

  window.tekenKies = function (fotoId, wat, waarde) {
    if (wat === 'stuk') stuk = waarde;
    if (wat === 'kleur') kleur = waarde;
    if (wat === 'dikte') dikte = parseFloat(waarde);
    if (wat === 'vinger') vingerTekent = !vingerTekent;
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

    balk.style.display = 'flex';
    balk.innerHTML =
      '<div class="tk-groep">' +
        GEREEDSCHAP.map(function (g) {
          return '<button class="tk-knop' + (stuk === g.id ? ' aan' : '') + '" title="' + g.naam +
                 '" onclick="tekenKies(\'' + fotoId + '\',\'stuk\',\'' + g.id + '\')">' + g.teken + '</button>';
        }).join('') +
      '</div>' +
      '<div class="tk-groep">' +
        KLEUREN.map(function (c) {
          return '<button class="tk-kleur' + (kleur === c.k ? ' aan' : '') + '" title="' + c.naam +
                 '" style="background:' + c.k + '" onclick="tekenKies(\'' + fotoId + '\',\'kleur\',\'' + c.k + '\')"></button>';
        }).join('') +
      '</div>' +
      '<div class="tk-groep">' +
        DIKTES.map(function (d) {
          return '<button class="tk-knop' + (dikte === d.d ? ' aan' : '') + '" title="' + d.naam +
                 '" onclick="tekenKies(\'' + fotoId + '\',\'dikte\',\'' + d.d + '\')">' +
                 '<span class="tk-stip" style="width:' + (d.d / 2 + 3) + 'px;height:' + (d.d / 2 + 3) + 'px"></span></button>';
        }).join('') +
      '</div>' +
      '<div class="tk-groep">' +
        '<button class="tk-knop" title="Laatste streek terug" onclick="tekenTerug(\'' + fotoId + '\')">↶</button>' +
        '<button class="tk-knop" title="Alles wissen" onclick="tekenWis(\'' + fotoId + '\')">🗑</button>' +
      '</div>' +
      '<label class="tk-vinger"><input type="checkbox"' + (vingerTekent ? ' checked' : '') +
        ' onchange="tekenKies(\'' + fotoId + '\',\'vinger\')"> Met vinger tekenen</label>' +
      '<span class="tk-info">' + inkt(foto).length + ' streken · pen tekent, vinger schuift</span>';
  }
})();
