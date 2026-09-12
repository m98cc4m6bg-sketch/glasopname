/* ═══════════════════════════════════════════════════════════════
   Glasopname – pdf van de foto's met maatvoering
   Voor eigen gebruik: per foto een pagina met de foto, de
   merkbolletjes erop, en daaronder de ingevoerde maten.

   De app tekent de pdf zelf in plaats van de browser te laten
   printen. Alleen zo is te bepalen hoe de inhoud over de pagina's
   verdeeld wordt — en er komt geen webadres of paginakop van de
   browser overheen.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
  var TABEL_URL = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js';

  var MARGE = 12;          // mm
  var BREEDTE = 210;       // wordt per export gezet (staand of liggend)
  var HOOGTE = 297;
  var INHOUD = BREEDTE - 2 * MARGE;
  var FOTO_MAX_H = 115;    // mm — laat altijd ruimte voor een paar regels

  function zetFormaat(liggend) {
    BREEDTE = liggend ? 297 : 210;
    HOOGTE = liggend ? 210 : 297;
    INHOUD = BREEDTE - 2 * MARGE;
  }

  /* ─── kolommen ─────────────────────────────────────────────── */
  // Alles wat op het scherm staat. Kolommen die in een groep nergens
  // ingevuld zijn vallen weg: op staand A4 is de ruimte te krap om
  // lege kolommen mee te slepen.

  function kolommen() {
    return [
      { kop: 'Merk',      w: 12, haal: function (r) { return r.merk; }, altijd: true },
      { kop: 'Aant',      w: 9,  haal: function (r) { return r.aantal; }, altijd: true },
      { kop: 'Maatsoort', w: 20, haal: function (r) { return kort(r.maatsoort); }, altijd: true },
      { kop: 'Breedte',   w: 14, haal: function (r) { return r.breedte; }, altijd: true },
      { kop: 'Hoogte',    w: 14, haal: function (r) { return r.hoogte; }, altijd: true },
      { kop: 'Corr',      w: 11, haal: function (r) {
          if (r.maatsoort === 'Glasmaat (direct)') return '-';
          var c = correctieVan(r);
          return (r.maatsoort === 'Dagmaat' ? '+' : '-') + c;
        }, altijd: true },
      { kop: 'Glas B',    w: 14, haal: function (r) { return r.glasBreedte; }, altijd: true },
      { kop: 'Glas H',    w: 14, haal: function (r) { return r.glasHoogte; }, altijd: true },
      { kop: 'Glastype',  w: 26, haal: function (r) { return r.glasType; } },
      { kop: 'Opbouw',    w: 22, haal: function (r) { return r.opbouw; } },
      { kop: 'Dikte',     w: 12, haal: function (r) { return r.totaalDikte; } },
      { kop: 'kg/m2',     w: 12, haal: function (r) { return r.kgM2; } },
      { kop: 'Rooster',   w: 13, haal: function (r) { return r.rooster === 'Ja' ? 'Ja' : ''; } },
      { kop: 'Duco',      w: 24, haal: function (r) { return r.ducoType; } },
      { kop: 'RAL',       w: 26, haal: function (r) { return r.ralKleur; } },
      { kop: 'Bewerking', w: 24, haal: function (r) { return kort(r.glasbewerking); } },
      { kop: 'Roeden',    w: 22, haal: function (r) { return kort(r.roedenverdeling); } },
      { kop: 'Roede br',  w: 16, haal: function (r) { return r.roedenbreedte; } },
      { kop: 'Opmerking', w: 34, haal: function (r) { return r.opmerking; } }
    ];
  }

  // Lange keuzeteksten inkorten: alles vanaf een haakje of streepje weg.
  function kort(v) {
    if (!v) return '';
    return String(v).split('(')[0].split(' - ')[0].trim();
  }

  // De ingebouwde lettertypes van pdf-bestanden kennen geen − of ×.
  function schoon(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/\u2212/g, '-').replace(/\u00d7/g, 'x')
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2039\u203a]/g, '');
  }

  function gebruikteKolommen(lijst) {
    return kolommen().filter(function (k) {
      if (k.altijd) return true;
      return lijst.some(function (r) {
        var v = k.haal(r);
        return v !== null && v !== undefined && String(v).trim() !== '';
      });
    });
  }

  /* ─── bibliotheken ─────────────────────────────────────────── */

  function laad(url) {
    return new Promise(function (ok, fout) {
      if (document.querySelector('script[data-pdf="' + url + '"]')) { ok(); return; }
      var s = document.createElement('script');
      s.src = url;
      s.setAttribute('data-pdf', url);
      s.onload = ok;
      s.onerror = function () { fout(new Error('kon de pdf-bibliotheek niet laden — is er internet?')); };
      document.head.appendChild(s);
    });
  }

  /* ─── afbeelding ophalen als gegevens ──────────────────────── */

  function haalAfbeelding(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('foto ophalen mislukt (' + res.status + ')');
      return res.blob();
    }).then(function (blob) {
      return new Promise(function (ok, fout) {
        var lezer = new FileReader();
        lezer.onload = function () { ok(lezer.result); };
        lezer.onerror = function () { fout(new Error('foto lezen mislukt')); };
        lezer.readAsDataURL(blob);
      });
    });
  }

  /* ─── opbouw van de pdf ────────────────────────────────────── */

  // Logo eenmalig inlezen zodat het in de pdf gezet kan worden.
  var logoData = null;
  function haalLogo() {
    if (logoData !== null) return Promise.resolve(logoData);
    return haalAfbeelding('logo.png')
      .then(function (d) { logoData = d; return d; })
      .catch(function () { logoData = false; return false; });
  }

  function kopregel(doc, titel) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(29, 29, 27);
    doc.text(schoon(titel), MARGE, MARGE + 1);
    if (logoData) {
      var lb = 34, lh = lb * 142 / 600;
      doc.addImage(logoData, 'PNG', BREEDTE - MARGE - lb, MARGE - 4.5, lb, lh);
    }
    doc.setDrawColor(208, 2, 67);
    doc.setLineWidth(0.6);
    doc.line(MARGE, MARGE + 3.5, BREEDTE - MARGE, MARGE + 3.5);
  }

  function tekenFoto(doc, dataUrl, foto, eigen, y) {
    var verh = (foto.hoogte || 3) / (foto.breedte || 4);
    var b = INHOUD;
    var h = b * verh;
    if (h > FOTO_MAX_H) { h = FOTO_MAX_H; b = h / verh; }
    var x = MARGE + (INHOUD - b) / 2;

    doc.addImage(dataUrl, 'JPEG', x, y, b, h);
    doc.setDrawColor(180, 186, 196);
    doc.rect(x, y, b, h);

    // Tekeningen onder de bolletjes, als echte lijnen zodat ze scherp
    // blijven bij inzoomen en afdrukken.
    tekenInkt(doc, foto, x, y, b, h);

    // bolletjes
    foto.markeringen.forEach(function (m) {
      var rij = getRij(m.rijId);
      if (!rij) return;
      var cx = x + m.x * b;
      var cy = y + m.y * h;
      doc.setFillColor(240, 165, 0);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.circle(cx, cy, 3.4, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(40, 30, 0);
      doc.text(schoon(rij.merk || '?'), cx, cy + 1.1, { align: 'center' });
    });

    return y + h + 5;
  }

  function kleurNaarRgb(hex) {
    var h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function tekenInkt(doc, foto, x, y, b, h) {
    var streken = foto.inkt;
    if (!Array.isArray(streken) || !streken.length) return;
    var vbH = Math.round(1000 * (foto.hoogte || 3) / (foto.breedte || 4)) || 750;
    var sx = b / 1000, sy = h / vbH;
    var mmPerEenheid = b / 1000;

    doc.setLineCap('round');
    doc.setLineJoin('round');
    streken.forEach(function (s) {
      if (!s || !s.p || !s.p.length) return;
      var rgb = kleurNaarRgb(s.k);
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.setLineWidth(Math.max(0.2, (s.d || 6) * mmPerEenheid));
      var pt = s.p.map(function (q) { return [x + q[0] * sx, y + q[1] * sy]; });

      if (s.t === 'rect' && pt.length > 1) {
        doc.rect(Math.min(pt[0][0], pt[1][0]), Math.min(pt[0][1], pt[1][1]),
                 Math.abs(pt[1][0] - pt[0][0]), Math.abs(pt[1][1] - pt[0][1]), 'S');
        return;
      }
      for (var i = 1; i < pt.length; i++) {
        doc.line(pt[i - 1][0], pt[i - 1][1], pt[i][0], pt[i][1]);
      }
      if (s.t === 'pijl' && pt.length > 1) {
        var hoek = Math.atan2(pt[1][1] - pt[0][1], pt[1][0] - pt[0][0]);
        var lengte = Math.max(2.5, (s.d || 6) * mmPerEenheid * 3.2);
        [hoek + Math.PI * 0.82, hoek - Math.PI * 0.82].forEach(function (a) {
          doc.line(pt[1][0], pt[1][1],
                   pt[1][0] + Math.cos(a) * lengte, pt[1][1] + Math.sin(a) * lengte);
        });
      }
    });
    doc.setLineWidth(0.2);
  }

  function tekenTabel(doc, lijst, startY, titel) {
    var kols = gebruikteKolommen(lijst);
    var totaal = kols.reduce(function (n, k) { return n + k.w; }, 0);
    var factor = INHOUD / totaal;
    var fontMaat = kols.length > 15 ? 5.4 : (kols.length > 11 ? 6.2 : 7);

    var stijlen = {};
    kols.forEach(function (k, i) { stijlen[i] = { cellWidth: k.w * factor }; });

    doc.autoTable({
      startY: startY,
      margin: { left: MARGE, right: MARGE, top: MARGE + 8, bottom: MARGE + 6 },
      head: [kols.map(function (k) { return k.kop; })],
      body: lijst.map(function (r) {
        return kols.map(function (k) { return schoon(k.haal(r)); });
      }),
      styles: { fontSize: fontMaat, cellPadding: 1, overflow: 'linebreak', lineColor: [205, 210, 218], lineWidth: 0.15 },
      headStyles: { fillColor: [208, 2, 67], textColor: 255, fontStyle: 'bold', fontSize: fontMaat },
      alternateRowStyles: { fillColor: [244, 246, 249] },
      columnStyles: stijlen,
      didDrawPage: function (data) {
        // Alleen op vervolgpagina's van déze tabel; de eerste pagina
        // heeft zijn kop al gekregen.
        if (data.pageNumber > 1) kopregel(doc, titel + ' (vervolg)');
      }
    });
    return doc.lastAutoTable.finalY;
  }

  function voetteksten(doc, project, datum) {
    var n = doc.internal.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 128, 140);
      doc.text(schoon('Jelier Bouw B.V.  |  ' + (project || 'Glasopname') +
               (datum ? '  |  ' + datum : '')), MARGE, HOOGTE - 7);
      doc.text('pagina ' + i + ' van ' + n, BREEDTE - MARGE, HOOGTE - 7, { align: 'right' });
    }
  }

  /* ─── uitvoeren ────────────────────────────────────────────── */

  window.exportFotoPdf = function () {
    var knop = document.getElementById('pdfKnop');
    var project = (document.getElementById('projectNaam') || {}).value || 'Glasopname';
    var datum = (document.getElementById('projectDatum') || {}).value || '';

    if (!fotos.length && !losseRijen().some(function (r) { return r.breedte || r.hoogte; })) {
      alert('Er is nog niets om te exporteren.');
      return;
    }

    if (knop) { knop.disabled = true; knop.textContent = 'Bezig…'; }

    Promise.all([laad(JSPDF_URL)]).then(function () {
      return laad(TABEL_URL);
    }).then(haalLogo).then(function () {
      var jsPDF = window.jspdf.jsPDF;
      zetFormaat(false);
      var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Foto's ophalen vóór het tekenen: addImage werkt niet met beloftes.
      var taken = fotos.map(function (f) {
        if (!f.pad || !window.glasSupabase) return Promise.resolve(null);
        return window.glasSupabase.storage.from('projectfotos')
          .createSignedUrl(f.pad, 3600)
          .then(function (res) {
            if (res.error || !res.data) return null;
            return haalAfbeelding(res.data.signedUrl);
          })
          .catch(function (e) { console.warn('[pdf] foto overslaan', f.pad, e); return null; });
      });

      return Promise.all(taken).then(function (plaatjes) {
        var eerste = true;

        fotos.forEach(function (f, i) {
          var eigen = rijen.filter(function (r) { return r.fotoId === f.id; });
          if (!eigen.length && !plaatjes[i]) return;

          if (!eerste) doc.addPage();
          eerste = false;

          var titel = 'Foto ' + (i + 1) + (f.titel ? ' — ' + f.titel : '');
          kopregel(doc, titel);
          var y = MARGE + 9;

          if (plaatjes[i]) {
            y = tekenFoto(doc, plaatjes[i], f, eigen, y);
          } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8.5);
            doc.setTextColor(120, 128, 140);
            doc.text('(geen foto bij deze groep)', MARGE, y + 3);
            y += 8;
          }

          if (eigen.length) {
            tekenTabel(doc, eigen, y, titel);
          } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8.5);
            doc.text('Nog geen ruiten in deze groep.', MARGE, y + 4);
          }
        });

        // Losse regels achteraan, op een eigen pagina.
        var los = losseRijen().filter(function (r) {
          return r.merk || r.breedte || r.hoogte || r.glasType;
        });
        if (los.length) {
          if (!eerste) doc.addPage();
          eerste = false;
          kopregel(doc, 'Zonder foto');
          tekenTabel(doc, los, MARGE + 9, 'Zonder foto');
        }

        voetteksten(doc, project, datum);

        var naam = 'Inmeting_' + schoon(project).replace(/[^A-Za-z0-9]+/g, '_')
                 + (datum ? '_' + datum.replace(/[^0-9]/g, '-') : '') + '.pdf';
        return afleveren(doc, naam);
      });
    }).catch(function (e) {
      console.error('[pdf]', e);
      alert('Pdf maken mislukt: ' + e.message);
    }).then(function () {
      if (knop) { knop.disabled = false; knop.textContent = '📄 PDF van foto\'s'; }
    });
  };

  /* ═══════════════ BESTELLIJST ═══════════════ */
  // Zelfde regels, volgorde en kolommen als het tabblad Bestellijst,
  // zodat papier en scherm niet uit elkaar kunnen lopen.

  function bestelKolommen() {
    return [
      { kop: 'Pos',        w: 8,  haal: function (r, i) { return i + 1; }, altijd: true },
      { kop: 'Aantal',     w: 12, haal: function (r) { return parseInt(r.aantal) || 1; }, altijd: true },
      { kop: 'Merk',       w: 14, haal: function (r) { return r.merk; }, altijd: true },
      { kop: 'Glasbreedte', w: 20, haal: function (r) { return r.glasBreedte; }, altijd: true },
      { kop: 'Glashoogte',  w: 20, haal: function (r) { return r.glasHoogte; }, altijd: true },
      { kop: 'Glas type',  w: 28, haal: function (r) { return r.glasType; }, altijd: true },
      { kop: 'Opbouw',     w: 24, haal: function (r) { return r.opbouw; }, altijd: true },
      { kop: 'Rooster',    w: 13, haal: function (r) { return r.rooster === 'Ja' ? 'Ja' : ''; } },
      { kop: 'Duco type',  w: 26, haal: function (r) { return r.ducoType; } },
      { kop: 'RAL kleur',  w: 30, haal: function (r) { return r.ralKleur; } },
      { kop: 'Glasbewerking', w: 26, haal: function (r) {
          return r.glasbewerking !== 'Helder (standaard)' ? r.glasbewerking : ''; } },
      { kop: 'Roedenverdeling', w: 26, haal: function (r) {
          return r.roedenverdeling !== 'Geen roedenverdeling' ? r.roedenverdeling : ''; } },
      { kop: 'Roede br',   w: 16, haal: function (r) { return r.roedenbreedte; } },
      { kop: 'Opmerking',  w: 34, haal: function (r) { return r.roedenopmerking || r.opmerking; } }
    ];
  }

  window.exportBestellijstPdf = function () {
    var knop = document.getElementById('pdfBestelKnop');
    var project = (document.getElementById('projectNaam') || {}).value || 'Glasopname';
    var datum = (document.getElementById('projectDatum') || {}).value || '';

    var lijst = rijen.filter(function (r) {
      return r.glasType && r.opbouw && r.glasBreedte && r.glasHoogte;
    });
    if (!lijst.length) {
      alert('Geen volledige regels gevonden. Een regel telt mee zodra glastype, opbouw en de glasmaten ingevuld zijn.');
      return;
    }

    if (knop) { knop.disabled = true; knop.textContent = 'Bezig…'; }

    laad(JSPDF_URL).then(function () { return laad(TABEL_URL); })
      .then(haalLogo).then(function () {
      zetFormaat(true);
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      var titel = 'Bestellijst glas';
      kopregel(doc, titel);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 70, 84);
      var adres = [projectInfo.straat, projectInfo.postcode, projectInfo.plaats].filter(Boolean).join('  ');
      doc.text(schoon('Project: ' + project + (datum ? '     Datum: ' + datum : '') +
               (adres ? '     ' + adres : '') +
               (projectInfo.klant ? '     Opdrachtgever: ' + projectInfo.klant : '')), MARGE, MARGE + 9);

      var kols = bestelKolommen().filter(function (k) {
        if (k.altijd) return true;
        return lijst.some(function (r) {
          var v = k.haal(r, 0);
          return v !== null && v !== undefined && String(v).trim() !== '';
        });
      });
      var totaal = kols.reduce(function (n, k) { return n + k.w; }, 0);
      var factor = INHOUD / totaal;
      var stijlen = {};
      kols.forEach(function (k, i) {
        stijlen[i] = { cellWidth: k.w * factor, halign: /Glas(breedte|hoogte)|Aantal|Pos/.test(k.kop) ? 'right' : 'left' };
      });

      doc.autoTable({
        startY: MARGE + 13,
        margin: { left: MARGE, right: MARGE, top: MARGE + 8, bottom: MARGE + 8 },
        head: [kols.map(function (k) { return k.kop; })],
        body: lijst.map(function (r, i) {
          return kols.map(function (k) { return schoon(k.haal(r, i)); });
        }),
        styles: { fontSize: kols.length > 11 ? 7 : 8, cellPadding: 1.4, overflow: 'linebreak',
                  lineColor: [205, 210, 218], lineWidth: 0.15 },
        headStyles: { fillColor: [208, 2, 67], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [244, 246, 249] },
        columnStyles: stijlen,
        didDrawPage: function (data) {
          if (data.pageNumber > 1) kopregel(doc, titel + ' (vervolg)');
        }
      });

      // Totalen onder de tabel
      var stuks = lijst.reduce(function (n, r) { return n + (parseInt(r.aantal) || 1); }, 0);
      var m2 = lijst.reduce(function (n, r) {
        return n + (r.glasBreedte * r.glasHoogte / 1000000) * (parseInt(r.aantal) || 1);
      }, 0);
      var y = doc.lastAutoTable.finalY + 6;
      if (y > HOOGTE - MARGE - 12) { doc.addPage(); kopregel(doc, titel + ' (vervolg)'); y = MARGE + 13; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(29, 29, 27);
      doc.text(schoon(lijst.length + ' posities   |   ' + stuks + ' ruiten   |   totaal ' +
               m2.toFixed(2).replace('.', ',') + ' m2 glas'), MARGE, y);

      voetteksten(doc, project, datum);

      var naam = 'Bestellijst_' + schoon(project).replace(/[^A-Za-z0-9]+/g, '_')
               + (datum ? '_' + datum.replace(/[^0-9]/g, '-') : '') + '.pdf';
      return afleveren(doc, naam);
    }).catch(function (e) {
      console.error('[pdf]', e);
      alert('Pdf maken mislukt: ' + e.message);
    }).then(function () {
      if (knop) { knop.disabled = false; knop.textContent = '📦 Bestellijst als PDF'; }
    });
  };

  /* ═══════════════ Cmd+P / Ctrl+P ═══════════════ */
  // De sneltoets maakt voortaan onze eigen pdf in plaats van het
  // afdrukvenster van de browser te openen. Welke pdf hangt af van
  // waar je bent: op het fototabblad de fotopagina's, elders de
  // bestellijst. De menuroute Archief → Druk af kan een pagina niet
  // onderscheppen; daarvoor blijft de afdrukopmaak als terugval staan.

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'p' && e.key !== 'P') return;
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    e.preventDefault();
    var opFoto = document.getElementById('panel-fotos');
    if (opFoto && opFoto.classList.contains('active') && fotos.length) {
      exportFotoPdf();
    } else {
      exportBestellijstPdf();
    }
  });

  /* ═══════════════ SNELTOETS ═══════════════ */
  // Cmd+P (Mac) en Ctrl+P (Windows) maken voortaan de pdf van de app
  // in plaats van de afdruk van de browser. Welke pdf hangt af van waar
  // je staat: op het tabblad Foto's die van de foto's, elders de
  // bestellijst.
  // Let op: dit vangt alleen de sneltoets. Archief → Druk af of het
  // printmenu van de browser kan een pagina niet onderscheppen.

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'p' && e.key !== 'P') return;
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    var fotosActief = document.getElementById('panel-fotos');
    fotosActief = fotosActief && fotosActief.classList.contains('active');
    if (fotosActief && fotos.length) exportFotoPdf();
    else exportBestellijstPdf();
  }, true);

  // Op de iPad werkt downloaden in een app vanaf het beginscherm niet
  // betrouwbaar; via het deelvenster wel — en dan kun je meteen
  // bewaren in Bestanden, mailen of afdrukken.
  function afleveren(doc, naam) {
    var blob = doc.output('blob');
    try {
      var bestand = new File([blob], naam, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [bestand] })) {
        return navigator.share({ files: [bestand], title: naam })
          .catch(function () { doc.save(naam); });
      }
    } catch (e) {}
    doc.save(naam);
    return Promise.resolve();
  }
})();
