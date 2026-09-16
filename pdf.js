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

  // Zelfde nummer als APP_VERSIE in index.html. Staat hier zodat je in de
  // console kunt zien wélke pdf.js een apparaat werkelijk geladen heeft;
  // dat scheelt zoeken als een update ergens blijft hangen.
  var PDF_VERSIE = 'v68';
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

  // De exportknoppen zitten sinds v44 in een uitklaplijst en zijn dus niet
  // in beeld tijdens het maken. De voortgang gaat daarom naar de statusregel.
  function bezig(tekst) {
    var s = document.getElementById('statusBar');
    if (s) s.textContent = tekst || '';
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

      // Tekst op de foto: alleen de letters, met een dunne rand eromheen
      // zodat hij ook op een drukke gevel leesbaar blijft.
      if (s.t === 'tekst') {
        var mm = (s.g || (s.d || 6) * 6) * mmPerEenheid;
        doc.setFont('helvetica', s.vet === false ? (s.schuin ? 'italic' : 'normal')
                                                 : (s.schuin ? 'bolditalic' : 'bold'));
        doc.setFontSize(Math.max(4, mm * 2.8346));
        var tx = x + s.p[0][0] * sx, ty = y + s.p[0][1] * sy + mm * 0.35;
        var rand = kleurNaarRgb((0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) > 150 ? '#1d1d1b' : '#ffffff');
        doc.setTextColor(rand[0], rand[1], rand[2]);
        var d = Math.max(0.12, mm * 0.05);
        [[-d, 0], [d, 0], [0, -d], [0, d]].forEach(function (v) {
          doc.text(schoon(s.tx), tx + v[0], ty + v[1]);
        });
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.text(schoon(s.tx), tx, ty);
        return;
      }

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

  function maakNaam(voorvoegsel, project, datum) {
    return voorvoegsel + '_' + schoon(project).replace(/[^A-Za-z0-9]+/g, '_') +
           (datum ? '_' + datum.replace(/[^0-9]/g, '-') : '') + '.pdf';
  }

  window.exportFotoPdf = function () {
    return startExport('fotos');
  };

  function bouwFotoPdf() {
    var knop = document.getElementById('pdfKnop');
    var project = (document.getElementById('projectNaam') || {}).value || 'Glasopname';
    var datum = (document.getElementById('projectDatum') || {}).value || '';
    var naam = maakNaam('Inmeting', project, datum);

    if (!fotos.length && !losseRijen().some(function (r) { return r.breedte || r.hoogte; })) {
      alert('Er is nog niets om te exporteren.');
      return;
    }

    if (knop) knop.disabled = true;
    bezig('Pdf met foto\'s maken…');

    return Promise.all([laad(JSPDF_URL)]).then(function () {
      return laad(TABEL_URL);
    }).then(haalLogo).then(function () {
      var jsPDF = window.jspdf.jsPDF;
      zetFormaat(false);
      var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Foto's ophalen vóór het tekenen: addImage werkt niet met beloftes.
      var taken = fotos.filter(function (f) { return f.soort !== 'lever'; }).map(function (f) {
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

        var kozijnFotos = fotos.filter(function (f) { return f.soort !== 'lever'; });
        kozijnFotos.forEach(function (f, i) {
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

        return { doc: doc, naam: naam };
      });
    }).then(function (res) {
      if (knop) knop.disabled = false;
      return res;
    });
  }

  /* ═══════════════ BESTELLIJST ═══════════════ */
  // Zelfde regels, volgorde en kolommen als het tabblad Bestellijst,
  // zodat papier en scherm niet uit elkaar kunnen lopen.

  function bestelKolommen() {
    return [
      { kop: 'Pos',        w: 8,  haal: function (r, i) { return i + 1; }, altijd: true },
      { kop: 'Aantal',     w: 12, haal: function (r) { return parseInt(r.aantal) || 1; }, altijd: true },
      { kop: 'Merk',       w: 14, haal: function (r) { return r.merk; }, altijd: true },
      { kop: 'Glasbreedte', w: 20, haal: function (r) { return r.glasBreedte; }, altijd: true },
      { kop: 'Glashoogte',  w: 22, haal: function (r) {
          // Bij een rooster gaat de speling er bij de leverancier nog af.
          return r.glasHoogte + (r.rooster === 'Ja' ? ' ^' : '');
        }, altijd: true },
      { kop: 'Glas type',  w: 28, haal: function (r) { return r.glasType; }, altijd: true },
      { kop: 'Opbouw',     w: 24, haal: function (r) { return r.opbouw; }, altijd: true },
      { kop: 'Rooster',    w: 14, haal: function (r) { return r.rooster === 'Ja' ? 'Ja ^' : ''; } },
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

  // Een losse pagina achter de bestellijst met de foto van de plek waar
  // het glas heen moet, de instructies, het adres en de gewenste datum.
  // Alleen als er ook werkelijk een foto of instructie is ingevuld.
  // Adres en datum zelf bepalen uit de projectgegevens, niet via een
  // functie elders in de app: deze pagina moet ook kloppen als er ooit
  // iets aan die kant verandert.
  function leverAdres() {
    var d = projectInfo || {};
    if (d.leverAdres === 'werk') {
      var delen = [d.straat, [d.postcode, d.plaats].filter(Boolean).join('  ')].filter(Boolean);
      return delen.length ? delen.join(', ') : 'Werkadres — niet ingevuld';
    }
    return (window.GLASOPNAME_CONFIG && window.GLASOPNAME_CONFIG.werkplaats) ||
           'Werkplaats — Vissersdijk Beneden 44, Dordrecht';
  }

  function leverWanneer() {
    var d = projectInfo || {};
    if (d.leverSoort === 'spoed') return 'SPOED!';
    if (d.leverSoort === 'datum' && d.leverDatum) return d.leverDatum;
    if (d.leverSoort === 'week' && d.leverWeek) return d.leverWeekTekst || ('week ' + d.leverWeek);
    return 'Eerste levermogelijkheid';
  }

  // Deze pagina komt er altijd, ook als er niets is ingevuld. Eerder werd
  // hij overgeslagen bij een lege instructie en geen foto, en dan kreeg de
  // leverancier een bestellijst zonder afleveradres — zonder dat iemand dat
  // merkte. Wat ontbreekt staat er nu met zoveel woorden op; controleren
  // vóór de export gebeurt in leverControle().
  function leverPagina(doc, project, datum) {
    var foto = (typeof fotos !== 'undefined')
      ? fotos.find(function (f) { return f.soort === 'lever'; }) : null;
    var instructie = (projectInfo && projectInfo.leverInstructie) || '';

    var plaatje = (foto && foto.pad && window.glasSupabase)
      ? window.glasSupabase.storage.from('projectfotos').createSignedUrl(foto.pad, 3600)
          .then(function (res) {
            if (res.error || !res.data) return null;
            return haalAfbeelding(res.data.signedUrl);
          }).catch(function () { return null; })
      : Promise.resolve(null);

    return plaatje.then(function (data) {
      zetFormaat(false);                     // staand: past beter bij een foto
      doc.addPage('a4', 'portrait');
      kopregel(doc, 'Leverlocatie');

      var y = MARGE + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(208, 2, 67);
      doc.text('AFLEVEREN OP', MARGE, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(29, 29, 27);
      doc.text(schoon(leverAdres()), MARGE, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 70, 84);
      doc.text(schoon('Project: ' + project + (datum ? '     Datum: ' + datum : '')), MARGE, y);
      y += 6;

      var wanneer = leverWanneer();
      if (wanneer) {
        var spoed = /spoed/i.test(wanneer);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(spoed ? 13 : 11);
        if (spoed) doc.setTextColor(142, 27, 18); else doc.setTextColor(29, 29, 27);
        doc.text(schoon('Gewenste levering: ' + wanneer), MARGE, y);
        y += 8;
      }

      if (instructie.trim()) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(29, 29, 27);
        var regels = doc.splitTextToSize(schoon(instructie), INHOUD);
        doc.text(regels, MARGE, y);
        y += regels.length * 4.6 + 4;
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(120, 128, 140);
        doc.text(schoon('Geen instructie voor de chauffeur ingevuld.'), MARGE, y);
        y += 8;
      }

      if (data) {
        var verh = (foto.hoogte || 3) / (foto.breedte || 4);
        var b = INHOUD, h = b * verh;
        var ruimte = HOOGTE - MARGE - 10 - y;
        if (h > ruimte) { h = ruimte; b = h / verh; }
        var x = MARGE + (INHOUD - b) / 2;
        doc.addImage(data, 'JPEG', x, y, b, h);
        doc.setDrawColor(180, 186, 196);
        doc.rect(x, y, b, h);
        tekenInkt(doc, foto, x, y, b, h);
      } else {
        // Geen foto, of er is wel een foto maar hij kwam niet binnen. Dat
        // tweede gebeurt zonder bereik, en dan moet er niet staan dat er
        // geen foto is — anders gaat iemand er een tweede maken.
        var tekst = foto
          ? 'Er hoort een foto van de leverlocatie bij, maar die kon niet worden'
            + ' opgehaald. Controleer de verbinding en maak de pdf opnieuw.'
          : 'Geen foto van de leverlocatie toegevoegd.';
        var vakH = Math.min(46, Math.max(24, HOOGTE - MARGE - 12 - y));
        doc.setDrawColor(200, 204, 212);
        doc.setFillColor(246, 245, 244);
        doc.rect(MARGE, y, INHOUD, vakH, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(120, 128, 140);
        var rr = doc.splitTextToSize(schoon(tekst), INHOUD - 12);
        doc.text(rr, MARGE + 6, y + vakH / 2 - (rr.length - 1) * 2.3 + 1);
      }
    });
  }

  window.exportBestellijstPdf = function () {
    return startExport('bestellijst');
  };

  function bouwBestellijst() {
    var knop = document.getElementById('pdfBestelKnop');
    var project = (document.getElementById('projectNaam') || {}).value || 'Glasopname';
    var datum = (document.getElementById('projectDatum') || {}).value || '';
    var naam = maakNaam('Bestellijst', project, datum);

    var lijst = rijen.filter(function (r) {
      return r.glasType && r.opbouw && r.glasBreedte && r.glasHoogte;
    });
    if (!lijst.length) {
      alert('Geen volledige regels gevonden. Een regel telt mee zodra glastype, opbouw en de glasmaten ingevuld zijn.');
      return Promise.resolve(null);
    }

    if (knop) knop.disabled = true;
    bezig('Bestellijst als pdf maken…');

    return laad(JSPDF_URL).then(function () { return laad(TABEL_URL); })
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

      // Waarschuwing bij roosters, pal onder de tabel zodat de leverancier
      // hem niet over het hoofd ziet.
      var metRooster = lijst.filter(function (r) { return r.rooster === 'Ja'; }).length;
      if (metRooster) {
        var yr = doc.lastAutoTable.finalY + 4;
        if (yr > HOOGTE - MARGE - 20) { doc.addPage(); kopregel(doc, titel + ' (vervolg)'); yr = MARGE + 13; }
        doc.setFillColor(255, 243, 208);
        doc.setDrawColor(142, 27, 18);
        doc.setLineWidth(0.8);
        doc.rect(MARGE, yr, INHOUD, 11, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(142, 27, 18);
        doc.text(schoon('^  LET OP - ' + metRooster + ' ' + (metRooster === 1 ? 'ruit' : 'ruiten') +
                 ' met ventilatierooster'), MARGE + 3, yr + 4.6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 50, 20);
        doc.text(schoon('Bij deze ruiten is de speling voor het rooster nog NIET van de glashoogte ' +
                 'afgetrokken. Die aftrek doet de glasleverancier.'), MARGE + 3, yr + 8.8);
        doc.lastAutoTable.finalY = yr + 11;
      }

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

      return leverPagina(doc, project, datum).then(function () {
        voetteksten(doc, project, datum);
        return { doc: doc, naam: naam };
      });
    }).then(function (res) {
      if (knop) knop.disabled = false;
      return res;
    });
  }

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
    var opFoto = document.getElementById('panel-invoer');
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
    // Invoer en foto's zitten in één tabblad; daar levert Cmd+P de pdf
    // met de foto's op zodra er een foto of tekening is.
    var opInvoer = document.getElementById('panel-invoer');
    opInvoer = opInvoer && opInvoer.classList.contains('active');
    if (opInvoer && fotos.length) exportFotoPdf();
    else exportBestellijstPdf();
  }, true);

  /* ═══════════════ EXPORT STARTEN ═══════════════
     Eén ingang voor alle drie de keuzes. Het opslagvenster wordt hier
     geopend, meteen na de klik — daarna staat de browser het niet meer
     toe. Bij 'alles' wordt om een map gevraagd, zodat beide bestanden
     er in één keer in kunnen.
  */

  // Vóór elke export nagaan wat er op de leverpagina nog ontbreekt. Dit
  // houdt niets tegen: de pagina gaat altijd mee. Het wijst alleen aan wat
  // er mist, zodat je kunt kiezen tussen aanvullen en toch exporteren.
  // Het werkadres telt alleen mee als er op het werk geleverd wordt; bij
  // levering op de werkplaats staat het adres al vast.
  function watMist() {
    var i = projectInfo || {};
    var mist = [];
    if (i.leverAdres === 'werk' && (!(i.straat || '').trim() || !(i.plaats || '').trim())) {
      mist.push({ wat: 'het werkadres waar het glas heen moet', plek: 'adres' });
    }
    var heeftFoto = (typeof fotos !== 'undefined') &&
      fotos.some(function (f) { return f.soort === 'lever' && f.pad; });
    if (!heeftFoto) mist.push({ wat: 'een foto van de leverlocatie', plek: 'lever' });
    // Niets gekozen betekent 'eerste levermogelijkheid', en dat is een
    // geldige opdracht — geen ontbrekend gegeven. Alleen klagen als er wél
    // een datum of week gekozen is maar de waarde zelf leeg bleef.
    if ((i.leverSoort === 'datum' && !i.leverDatum) ||
        (i.leverSoort === 'week' && !i.leverWeek)) {
      mist.push({ wat: 'de gekozen leverdatum of -week zelf', plek: 'lever' });
    }
    if (!((i.leverInstructie || '').trim())) {
      mist.push({ wat: 'een instructie voor de chauffeur', plek: 'lever' });
    }
    return mist;
  }

  var meldVenster = null;

  function meldSluit() {
    if (meldVenster) { meldVenster.remove(); meldVenster = null; }
  }

  // Waarom een eigen venster en niet confirm(): die heeft twee knoppen met
  // vaste tekst, en 'Annuleren' leest daar als 'niet exporteren' terwijl het
  // hier 'ik vul het eerst aan' moet betekenen. Drie keuzes dus, met tekst
  // die zegt wat er gebeurt.
  function leverMelding(mist, verder) {
    meldSluit();
    var vak = document.createElement('div');
    vak.className = 'cloud-overlay';
    vak.style.display = 'flex';
    vak.innerHTML =
      '<div class="cloud-paneel">' +
        '<header><h2>Nog niet alles is ingevuld</h2>' +
        '<div class="sub">De leverpagina gaat wel mee met de bestellijst</div></header>' +
        '<div class="cloud-body">' +
          '<p style="font-size:13px;line-height:1.6;margin-bottom:8px;">' +
          'Op de leverpagina ontbreekt nog:</p>' +
          '<ul style="font-size:13px;line-height:1.7;margin:0 0 12px 18px;">' +
          mist.map(function (m) { return '<li>' + m.wat + '</li>'; }).join('') +
          '</ul>' +
          '<p style="font-size:12px;color:var(--grijs-tekst);line-height:1.6;">' +
          'De pagina komt er hoe dan ook in. Wat ontbreekt staat er dan met ' +
          'zoveel woorden op, zodat de leverancier ziet dat het niet vergeten is ' +
          'maar onbekend.</p>' +
        '</div>' +
        '<div class="cloud-voet">' +
          '<button class="btn btn-ghost btn-sm" data-actie="sluit">Annuleren</button>' +
          '<div style="display:flex;gap:10px;">' +
            '<button class="btn btn-secondary btn-sm" data-actie="aanvullen">Aanvullen</button>' +
            '<button class="btn btn-primary btn-sm" data-actie="toch">Toch exporteren</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(vak);
    meldVenster = vak;

    vak.addEventListener('click', function (e) {
      var knop = e.target && e.target.closest ? e.target.closest('[data-actie]') : null;
      if (!knop) return;
      var actie = knop.getAttribute('data-actie');
      meldSluit();
      if (actie === 'aanvullen') { naarLeverblok(mist[0] && mist[0].plek); return; }
      if (actie !== 'toch') { bezig(''); return; }
      // Het vervolg draait híer, binnen de klik. Het opslagvenster van de
      // browser mag alleen direct na een klik open; liep dit via een promise,
      // dan trekt de browser de toestemming in en valt de export terug op
      // een gewone download.
      verder();
    });
  }

  function naarLeverblok(plek) {
    if (window.gaNaarTab) gaNaarTab('project');
    // Even wachten tot het tabblad staat; anders is het blok nog verborgen
    // en doet scrollIntoView niets.
    setTimeout(function () {
      var doel = document.getElementById(plek === 'adres' ? 'projectVelden' : 'leverBlok');
      if (doel && doel.scrollIntoView) doel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }

  // Ook gebruikt door de CSV-export in index.html.
  window.exportMetControle = function (vervolg) {
    var mist = watMist();
    if (!mist.length) { vervolg(); return; }
    leverMelding(mist, vervolg);
  };

  window.startExport = function (wat) {
    window.exportMetControle(function () { exportVerder(wat); });
    return Promise.resolve();
  };

  function exportVerder(wat) {
    var project = (document.getElementById('projectNaam') || {}).value || 'Glasopname';
    var datum = (document.getElementById('projectDatum') || {}).value || '';

    if (wat === 'alles') {
      var map = mapVragen();
      return Promise.resolve(map).then(function (keuze) {
        if (keuze && keuze.afgebroken) { bezig(''); return; }
        return bouwBestellijst().then(function (a) {
          return bouwFotoPdf().then(function (b) {
            var stukken = [a, b].filter(Boolean);
            if (!stukken.length) { bezig(''); return; }
            return leverMeerdere(stukken, keuze && keuze.map);
          });
        });
      }).catch(mislukt);
    }

    var naam = maakNaam(wat === 'fotos' ? 'Inmeting' : 'Bestellijst', project, datum);
    var bestand = bestandVragen(naam);
    var bouwer = wat === 'fotos' ? bouwFotoPdf : bouwBestellijst;
    return bouwer().then(function (res) {
      if (!res) { bezig(''); return; }
      return afleveren(res.doc, res.naam, bestand);
    }).catch(mislukt);
  }

  function mislukt(e) {
    console.error('[pdf]', e);
    bezig('');
    alert('Pdf maken mislukt: ' + e.message);
  }

  function mapVragen() {
    if (!window.showDirectoryPicker || isAanraakapparaat()) return Promise.resolve(null);
    return window.showDirectoryPicker({ mode: 'readwrite' })
      .then(function (map) { return { map: map }; })
      .catch(function (e) {
        if (e && (e.name === 'AbortError' || /abort|cancel/i.test(e.message || ''))) {
          return { afgebroken: true };
        }
        console.warn('[pdf] mapkeuze niet beschikbaar', e);
        return null;
      });
  }

  // Twee losse bestanden, nooit samengevoegd.
  function leverMeerdere(stukken, map) {
    bezig('Bestanden opslaan…');

    if (map) {
      return stukken.reduce(function (rij, s) {
        return rij.then(function () {
          return map.getFileHandle(s.naam, { create: true })
            .then(function (h) { return h.createWritable(); })
            .then(function (w) {
              return w.write(s.doc.output('blob')).then(function () { return w.close(); });
            });
        });
      }, Promise.resolve()).then(function () { bezig(''); });
    }

    if (isAanraakapparaat()) {
      try {
        var bestanden = stukken.map(function (s) {
          return new File([s.doc.output('blob')], s.naam, { type: 'application/pdf' });
        });
        if (navigator.canShare && navigator.canShare({ files: bestanden })) {
          return navigator.share({ files: bestanden, title: 'Glasopname' })
            .then(function () { bezig(''); })
            .catch(function (e) {
              bezig('');
              if (e && (e.name === 'AbortError' || /abort|cancel/i.test(e.message || ''))) return;
              stukken.forEach(function (s) { s.doc.save(s.naam); });
            });
        }
      } catch (e) {}
    }

    stukken.forEach(function (s) { s.doc.save(s.naam); });
    bezig('');
    return Promise.resolve();
  }

  /* ═══════════════ AFLEVEREN ═══════════════
     Drie wegen, in deze volgorde:

     1. Op een computer met Chrome of Edge: een echt opslagvenster waarin
        je zelf de map kiest — Downloads, OneDrive, de projectmap.
     2. Op een tablet of telefoon: het deelvenster, want downloaden werkt
        daar onbetrouwbaar in een app vanaf het beginscherm.
     3. Anders (zoals Safari op de Mac): een gewone download.

     Het opslagvenster moet meteen na de klik geopend worden; daarna heeft
     de browser de toestemming alweer ingetrokken. Vandaar dat er om het
     bestand gevraagd wordt vóórdat de pdf gemaakt is.
  */

  function isAanraakapparaat() {
    return (navigator.maxTouchPoints || 0) > 1;
  }

  function bestandVragen(naam) {
    if (!window.showSaveFilePicker || isAanraakapparaat()) return Promise.resolve(null);
    return window.showSaveFilePicker({
      suggestedName: naam,
      types: [{ description: 'PDF-bestand', accept: { 'application/pdf': ['.pdf'] } }]
    }).then(function (handvat) {
      return { handvat: handvat };
    }).catch(function (e) {
      // Wegklikken van het venster is een keuze, geen storing.
      if (e && (e.name === 'AbortError' || /abort|cancel/i.test(e.message || ''))) {
        return { afgebroken: true };
      }
      console.warn('[pdf] opslagvenster niet beschikbaar', e);
      return null;
    });
  }

  function afleveren(doc, naam, bestandBelofte) {
    var blob = doc.output('blob');

    return Promise.resolve(bestandBelofte).then(function (keuze) {
      if (keuze && keuze.afgebroken) { bezig(''); return; }

      if (keuze && keuze.handvat) {
        return keuze.handvat.createWritable()
          .then(function (schrijver) {
            return schrijver.write(blob).then(function () { return schrijver.close(); });
          })
          .catch(function (e) {
            console.warn('[pdf] opslaan in de gekozen map mislukt, dan maar downloaden', e);
            doc.save(naam);
          });
      }

      if (isAanraakapparaat()) {
        try {
          var bestand = new File([blob], naam, { type: 'application/pdf' });
          if (navigator.canShare && navigator.canShare({ files: [bestand] })) {
            return navigator.share({ files: [bestand], title: naam })
              .catch(function (e) {
                if (e && (e.name === 'AbortError' || e.name === 'CanceledError' ||
                          /abort|cancel/i.test(e.message || ''))) return;
                console.warn('[pdf] delen mislukt, dan maar downloaden', e);
                doc.save(naam);
              });
          }
        } catch (e) {}
      }

      doc.save(naam);
    });
  }

  console.log('[pdf] ' + PDF_VERSIE);

})();
