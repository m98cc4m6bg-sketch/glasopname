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
  var PDF_VERSIE = 'v110';
  // Uit de repo, niet van de CDN (v91): dan staan ze in de cache van de
  // service worker en werkt de eerste pdf na een update ook zonder bereik.
  var JSPDF_URL = 'lib/jspdf-2.5.2/jspdf.umd.min.js';
  var TABEL_URL = 'lib/jspdf-autotable-3.8.4/jspdf.plugin.autotable.min.js';

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

  // Eén belofte per bibliotheek. Tot v90 telde een <script>-regel van een
  // mislukte poging bij de volgende keer als 'geladen', en bleef de pdf
  // daarna kapot tot je de app herlaadde. Nu wordt een mislukte poging
  // opgeruimd, en wacht een tweede aanroep op dezelfde lading (v91).
  var geladen = {};
  // Staat de bibliotheek er al (eerder geladen, of door een testreeks
  // klaargezet), dan niets laden.
  function alAanwezig(url) {
    var j = window.jspdf && window.jspdf.jsPDF;
    if (url === JSPDF_URL) return !!j;
    if (url === TABEL_URL) return !!(j && j.API && j.API.autoTable);
    return false;
  }
  function laad(url) {
    if (alAanwezig(url)) return Promise.resolve();
    if (geladen[url]) return geladen[url];
    geladen[url] = new Promise(function (ok, fout) {
      var s = document.createElement('script');
      s.src = url;
      s.setAttribute('data-pdf', url);
      s.onload = function () { ok(); };
      s.onerror = function () {
        delete geladen[url];
        if (s.parentNode) s.parentNode.removeChild(s);
        fout(new Error('kon de pdf-bibliotheek niet laden — probeer het nog eens'));
      };
      document.head.appendChild(s);
    });
    return geladen[url];
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

  // Een foto uit het project als gegevens voor de pdf. Via fotoBlob
  // (fotos.js): uit de wachtrij op dit apparaat als hij nog niet geüpload
  // is, anders uit de cloud. Tot v92 alleen uit de cloud, en dan ontbrak
  // een net gemaakte foto zonder bereik in de pdf (v93).
  function fotoData(pad) {
    if (!pad) return Promise.resolve(null);
    var blobBelofte;
    if (window.fotoBlob) blobBelofte = window.fotoBlob(pad);
    else if (window.glasSupabase) {
      blobBelofte = window.glasSupabase.storage.from('projectfotos').createSignedUrl(pad, 3600)
        .then(function (res) {
          if (res.error || !res.data) return null;
          return fetch(res.data.signedUrl).then(function (r) {
            if (!r.ok) throw new Error('foto ophalen mislukt (' + r.status + ')');
            return r.blob();
          });
        });
    } else return Promise.resolve(null);
    return Promise.resolve(blobBelofte).then(function (blob) {
      if (!blob) return null;
      return new Promise(function (ok, fout) {
        var lezer = new FileReader();
        lezer.onload = function () { ok(lezer.result); };
        lezer.onerror = function () { fout(new Error('foto lezen mislukt')); };
        lezer.readAsDataURL(blob);
      });
    }).catch(function (e) { console.warn('[pdf] foto overslaan', pad, e); return null; });
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

  // Bovenkant van het logo in de kopregel. Onderkant = LOGO_BOVEN + 8,05 mm
  // = MARGE + 2,05 mm; de rode lijn begint op MARGE + 3,2 mm.
  var LOGO_BOVEN = MARGE - 6;

  function kopregel(doc, titel) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(29, 29, 27);
    doc.text(schoon(titel), MARGE, MARGE + 1);
    if (logoData) {
      // Het logo eindigt ruim boven de rode lijn. Tot v81 stond de
      // onderkant (AANNEMERSBEDRIJF) op MARGE + 3,55 mm, precies op de lijn
      // (MARGE + 3,5 mm, 0,6 mm dik), zodat die er half doorheen liep.
      var lb = 34, lh = lb * 142 / 600;
      doc.addImage(logoData, 'PNG', BREEDTE - MARGE - lb, LOGO_BOVEN, lb, lh);
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

    // bolletjes — per regel hooguit zoveel als het aantal. Staan er op het
    // scherm meer (aantal achteraf verlaagd), dan is dat daar al met een
    // rode rand gemeld; op papier hoort het beeld bij de bestelling.
    var getekend = {};
    foto.markeringen.forEach(function (m) {
      var rij = getRij(m.rijId);
      if (!rij) return;
      var max = parseInt(rij.aantal, 10) > 0 ? parseInt(rij.aantal, 10) : 1;
      getekend[m.rijId] = (getekend[m.rijId] || 0) + 1;
      if (getekend[m.rijId] > max) return;
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
        // Tekst staat sinds v77 in een vak met een eigen breedte en hoogte.
        // Dat vak is een harde grens: de tekst breekt erbinnen af en wat er
        // niet in past komt niet op papier — precies zoals op het scherm.
        // teken.js zet het vak zo nodig eerst goed voor tekst uit een ouder
        // project; ontbreekt dat bestand, dan blijft het bij één regel.
        if (window.tekstVakNorm) window.tekstVakNorm(s);
        var g = s.g || (s.d || 6) * 6;
        var mm = g * mmPerEenheid;
        doc.setFont('helvetica', s.vet === false ? (s.schuin ? 'italic' : 'normal')
                                                 : (s.schuin ? 'bolditalic' : 'bold'));
        doc.setFontSize(Math.max(4, mm * 2.8346));
        var rand = kleurNaarRgb((0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) > 150 ? '#1d1d1b' : '#ffffff');
        var d = Math.max(0.12, mm * 0.05);
        var pad = s.w ? mm * 0.18 : 0;
        var lh = mm * 1.2;
        var regels;
        if (s.w) {
          var ruimte = Math.max(1, s.w * mmPerEenheid - pad * 2);
          regels = [];
          String(s.tx == null ? '' : s.tx).split('\n').forEach(function (alinea) {
            regels = regels.concat(doc.splitTextToSize(schoon(alinea), ruimte));
          });
          var past = Math.max(1, Math.floor((s.h * mmPerEenheid - pad * 2) / lh + 0.2));
          regels = regels.slice(0, past);
        } else {
          regels = [schoon(s.tx)];
        }
        var tx = x + s.p[0][0] * sx + pad;
        // Dezelfde basislijn als op het scherm: halve regelsprong plus
        // stokhoogte, zie BASISLIJN in teken.js.
        var basis = window.TEKST_BASISLIJN || 1.0;
        var ty0 = y + s.p[0][1] * sy + (s.w ? pad + mm * basis : mm * 0.35);
        // De rand om de letters: één keer tekenen met vulling én omlijning.
        // Vroeger stond elke regel vijf keer op papier, vier keer een
        // haartje verschoven. Dat zag er goed uit, maar in de tekstlaag van
        // de pdf stond dan 'KKKKKooooozzzzz…' — onleesbaar zodra je de tekst
        // wilt zoeken of kopiëren.
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.setDrawColor(rand[0], rand[1], rand[2]);
        doc.setLineWidth(Math.max(0.1, d * 0.9));
        regels.forEach(function (regel, i) {
          doc.text(regel, tx, ty0 + i * lh, { renderingMode: 'fillThenStroke' });
        });
        doc.setLineWidth(0.2);
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

  // De maat van elke pagina zelf gebruiken, niet BREEDTE/HOOGTE. Een
  // bestellijst is liggend, maar de leverpagina erachter staand; die zet
  // zetFormaat(false), en daarna kwam de voettekst van álle pagina's op
  // 290 mm — op een liggende pagina van 210 mm hoog dus van het blad (v91).
  function voetteksten(doc, project, datum) {
    var n = doc.internal.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      var maat = doc.internal.pageSize;
      var b = maat.getWidth ? maat.getWidth() : BREEDTE;
      var h = maat.getHeight ? maat.getHeight() : HOOGTE;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 128, 140);
      doc.text(schoon('Jelier Bouw B.V.  |  ' + (project || 'Glasopname') +
               (datum ? '  |  ' + datum : '')), MARGE, h - 7);
      doc.text('pagina ' + i + ' van ' + n, b - MARGE, h - 7, { align: 'right' });
    }
  }

  /* ─── uitvoeren ────────────────────────────────────────────── */

  function maakNaam(voorvoegsel, project, datum) {
    // Accenten eraf in plaats van weg: "Café" wordt Cafe, niet Caf_ (v104).
    var p = String(project || '');
    try { p = p.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return voorvoegsel + '_' + schoon(p).replace(/[^A-Za-z0-9]+/g, '_') +
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
      appMelding('Er staan nog geen foto\'s of maten in dit project.',
        { kop: 'Niets te exporteren', soort: 'letop' });
      // Een belofte teruggeven, geen undefined: de aanroeper hangt er een
      // .then aan. Stond hier eerder alleen `return;`, waardoor de console
      // een fout gaf zodra er niets te exporteren was.
      return Promise.resolve(null);
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
        return fotoData(f.pad);
      });
      // Voor de pagina met projectgegevens (v98): taken en logboek uit de
      // cloud, en de foto van de leverlocatie met de tekening erop.
      var leverFoto = fotos.find(function (f) { return f.soort === 'lever' && f.pad; }) || null;
      var extra = Promise.all([
        window.projectOverzichtVoorPdf
          ? window.projectOverzichtVoorPdf().catch(function () { return null; })
          : Promise.resolve(null),
        leverFoto ? fotoData(leverFoto.pad) : Promise.resolve(null)
      ]);

      return Promise.all([Promise.all(taken), extra]).then(function (alles) {
        var plaatjes = alles[0];
        // De projectgegevens als eerste pagina (v98, gevraagd door Jan): alles
        // wat op Project info staat, zodat de pdf als archief op zichzelf
        // te lezen is.
        projectPagina(doc, project, datum, alles[1][0], leverFoto, alles[1][1]);
        var eerste = false;

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

        spoorregel(doc);
        voetteksten(doc, project, datum);

        return { doc: doc, naam: naam };
      });
    }).then(function (res) {
      if (knop) knop.disabled = false;
      return res;
    });
  }

  /* ─── projectgegevens (v98) ─────────────────────────────────
     Eerste pagina van de pdf invoer: klant en werkadres, uitvoering,
     levering, notities, taken, logboek en de foto van de leverlocatie met
     de tekening erop (keuze van Jan). Wat leeg is staat er met een streepje,
     zodat je ziet dat het niet vergeten is in de pdf. */

  // De ingebouwde letters kennen geen emoji en weinig tekens buiten
  // West-Europa. Het logboek zet ✉ voor een mail; dat wordt een woord.
  function pdfTekst(v) {
    return schoon(v)
      .replace(/✉️?/g, 'mail')
      .replace(/[^\x00-\xFF–—‘-„•…€]/g, '')
      .trim();
  }

  function projectPagina(doc, project, datum, ov, leverFoto, leverData) {
    var i = (typeof projectInfo !== 'undefined' && projectInfo) || {};
    ov = ov || {};
    var titel = 'Projectgegevens';
    var ONDER = HOOGTE - MARGE - 8;     // ruimte voor de voettekst
    kopregel(doc, titel);
    var y = MARGE + 12;

    function nieuwePagina() {
      doc.addPage('a4', 'portrait');
      kopregel(doc, titel + ' (vervolg)');
      y = MARGE + 12;
    }
    function ruimte(nodig) { if (y + nodig > ONDER) nieuwePagina(); }
    function kopje(tekst) {
      ruimte(18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(208, 2, 67);
      doc.text(tekst, MARGE, y);
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.3);
      doc.line(MARGE, y + 1.8, BREEDTE - MARGE, y + 1.8);
      y += 5;
    }
    function tabel(opties) {
      doc.autoTable(Object.assign({
        startY: y,
        margin: { left: MARGE, right: MARGE, top: MARGE + 9, bottom: MARGE + 8 },
        styles: { fontSize: 9, cellPadding: 1.2, overflow: 'linebreak', textColor: [29, 29, 27],
                  lineColor: [215, 219, 226], lineWidth: 0.15 },
        didDrawPage: function (data) {
          if (data.pageNumber > 1) kopregel(doc, titel + ' (vervolg)');
        }
      }, opties));
      y = doc.lastAutoTable.finalY + 7;
    }
    function paren(lijst) {
      tabel({
        theme: 'plain',
        body: lijst.map(function (p) { return [p[0], pdfTekst(p[1]) || '-']; }),
        styles: { fontSize: 9.5, cellPadding: { top: 1, bottom: 1, left: 0, right: 2 },
                  overflow: 'linebreak', textColor: [29, 29, 27] },
        columnStyles: { 0: { cellWidth: 46, textColor: [100, 108, 120] } }
      });
    }
    function leeg(tekst) {
      ruimte(8);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(120, 128, 140);
      doc.text(pdfTekst(tekst), MARGE, y + 1);
      y += 8;
    }

    // Naam van het project groot bovenaan.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(29, 29, 27);
    doc.text(pdfTekst(project), MARGE, y);
    y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 108, 120);
    doc.text(pdfTekst(datum ? 'Datum opname: ' + datum : 'Datum opname: -'), MARGE, y);
    y += 9;

    var adres = ov.adres || [i.straat, [i.postcode, i.plaats].filter(Boolean).join(' ')]
      .filter(Boolean).join(', ');
    var klant = [['Klantnaam', i.klant], ['Contactpersoon', i.contact],
                 ['Telefoon', i.telefoon], ['Werkadres', adres]];
    // Vervallen velden (v98) alleen als er in dit project nog iets in staat.
    if (String(i.email || '').trim()) klant.push(['E-mail', i.email]);
    if (String(i.soortKlant || '').trim()) klant.push(['Soort opdrachtgever', i.soortKlant]);
    kopje('Klant en werkadres');
    paren(klant);

    kopje('Uitvoering');
    paren([['Referentie', i.referentie], ['Status', i.status], ['Opgenomen door', i.opnemer],
           ['Bereikbaarheid / sleutel', i.bereikbaar]]);

    kopje('Levering');
    paren([['Afleveren op', ov.leverAdres || leverAdres()],
           ['Gewenste levering', ov.leverWanneer || leverWanneer()],
           ['Instructie chauffeur', i.leverInstructie]]);

    kopje('Notities');
    if (String(i.notities || '').trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      var regels = doc.splitTextToSize(pdfTekst(i.notities), INHOUD);
      regels.forEach(function (r) {
        ruimte(5);
        // Na een nieuwe pagina staat de letter van de kopregel nog aan
        // (vet, 11 pt); dus per regel opnieuw zetten.
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(29, 29, 27);
        doc.text(r, MARGE, y + 1);
        y += 4.4;
      });
      y += 4;
    } else {
      leeg('Geen notities.');
    }

    kopje('Taken');
    var takenLijst = ov.taken || [];
    if (takenLijst.length) {
      tabel({
        head: [['Taak', 'Op naam van', 'Status']],
        body: takenLijst.map(function (t) {
          return [pdfTekst(t.tekst) || '-', pdfTekst(t.wie) || '-', t.klaar ? 'afgerond' : 'open'];
        }),
        headStyles: { fillColor: [208, 2, 67], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 1: { cellWidth: 38 }, 2: { cellWidth: 22 } }
      });
    } else {
      leeg('Geen taken.');
    }

    // Hoeveel er in totaal in staan, als de database dat telde (v103).
    var logAantal = (ov.logboek || []).length;
    kopje('Logboek' + (typeof ov.logboekTotaal === 'number' && ov.logboekTotaal > logAantal
      ? ' (laatste ' + logAantal + ' van ' + ov.logboekTotaal + ')'
      : (logAantal >= 30 ? ' (laatste 30)' : '')));
    var log = ov.logboek || [];
    if (log.length) {
      tabel({
        head: [['Moment', 'Wie', 'Wat']],
        body: log.map(function (r) { return [r.moment || '', pdfTekst(r.wie), pdfTekst(r.wat)]; }),
        headStyles: { fillColor: [208, 2, 67], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 1, overflow: 'linebreak', textColor: [29, 29, 27],
                  lineColor: [215, 219, 226], lineWidth: 0.15 },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 24 } }
      });
    } else {
      leeg(window.glasProjectId ? 'Nog geen wijzigingen vastgelegd.'
                                : 'Het logboek vult zich zodra dit project in de cloud staat.');
    }

    if (leverData && leverFoto) {
      var verh = (leverFoto.hoogte || 3) / (leverFoto.breedte || 4);
      var b = INHOUD, h = b * verh;
      if (h > FOTO_MAX_H) { h = FOTO_MAX_H; b = h / verh; }
      // Past er minder dan zes centimeter foto onder het kopje, dan kopje en
      // foto samen op een nieuwe pagina: een postzegel helpt de chauffeur
      // niet, en een kopje onderaan zonder foto ook niet.
      if (y + 5 + Math.min(h, 60) > ONDER) nieuwePagina();
      kopje('Foto leverlocatie');
      var past = ONDER - y;
      if (h > past) { h = past; b = h / verh; }
      var x = MARGE + (INHOUD - b) / 2;
      doc.addImage(leverData, 'JPEG', x, y, b, h);
      doc.setDrawColor(180, 186, 196);
      doc.rect(x, y, b, h);
      tekenInkt(doc, leverFoto, x, y, b, h);
      y += h + 6;
    } else if (leverFoto) {
      kopje('Foto leverlocatie');
      leeg('Er hoort een foto bij, maar die kon niet worden opgehaald. Maak de pdf opnieuw met verbinding.');
    } else {
      kopje('Foto leverlocatie');
      leeg(i.leverAdres === 'werk' ? 'Geen foto van de leverlocatie toegevoegd.'
                                   : 'Geen foto (levering op de werkplaats).');
    }
  }

  // Wie de opname gedaan heeft en wie er het laatst aan gewerkt heeft.
  // Staat onderaan de laatste pagina van het archiefoverzicht (v87).
  function spoorregel(doc) {
    var i = (typeof projectInfo !== 'undefined' && projectInfo) || {};
    var laatste = null;
    (typeof rijen === 'undefined' ? [] : rijen).forEach(function (r) {
      if (!r || !r.gewOp) return;
      if (!laatste || r.gewOp > laatste.gewOp) laatste = r;
    });
    var delen = [];
    if (i.opnemer) delen.push('Opgenomen door ' + i.opnemer);
    if (laatste && laatste.gewDoor) {
      var d = new Date(laatste.gewOp);
      var wanneer = isNaN(d.getTime()) ? '' :
        String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') +
        '-' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
      delen.push('laatst gewijzigd door ' + laatste.gewDoor + (wanneer ? ' op ' + wanneer : ''));
    }
    var bl = window.glasBestellingen ? glasBestellingen() : [];
    if (bl.length) {
      var lb = bl[bl.length - 1];
      var b = new Date(lb.op);
      if (!isNaN(b.getTime())) {
        // 'besteld', niet 'bestellijst gemaakt': sinds v104 telt alleen
        // een verstuurde lijst.
        delen.push((bl.length > 1 ? bl.length + 'e bestellijst' : 'besteld') + ' op ' +
          String(b.getDate()).padStart(2, '0') + '-' + String(b.getMonth() + 1).padStart(2, '0') +
          '-' + b.getFullYear() + (lb.door ? ' door ' + lb.door : ''));
      }
    }
    if (!delen.length) return;
    doc.setPage(doc.internal.getNumberOfPages());
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 128, 140);
    doc.text(schoon(delen.join('  ·  ')), MARGE, HOOGTE - 12);
  }

  /* ═══════════════ BESTELLIJST ═══════════════ */
  // Zelfde regels, volgorde en kolommen als het tabblad Bestellijst,
  // zodat papier en scherm niet uit elkaar kunnen lopen.

  // De controle zelf staat in naslag.js. Ontbreekt dat bestand, dan wordt er
  // niets gemarkeerd en gaat de bestellijst gewoon door.
  function strijdigeRegel(r) {
    return !!(window.regelStrijdig && window.regelStrijdig(r));
  }

  // De kolom Wijz. op een aanvulling (v105, keuze van Jan): NIEUW = een
  // extra ruit; VERVANGT = maak deze in plaats van de eerder bestelde, met
  // welke dat was en in welke bestellijst, zodat de leverancier de oude kan
  // annuleren als dat nog kan. Altijd met de oude maat erbij: anders ziet
  // de leverancier bij "Aantal 2" niet of het er 1 of 2 extra zijn.
  function wijzLabel(r) {
    var st = window.besteldeStand ? besteldeStand() : null;
    if (!st || !st.laatste) return '';
    var oud = st.ruiten[r.id];
    if (oud === undefined) return 'NIEUW';
    if (!window.ruitAnders || !ruitAnders(oud, r)) return '';
    var nr = st.nr[r.id] || 1;
    // Uit welke lijsten de bestelde ruiten komen (v110): na een EXTRA meer
    // dan één ("uit de 1e en 2e"); de leverancier moet ze allemaal vinden.
    var uitTekst = (window.besteldInTekst ? besteldInTekst(r.id, st) : '') || nr + 'e';
    // v110: alleen meer van dezelfde ruit. De bestelde blijven gewoon.
    var v = extraVan(r);
    if (v) return 'EXTRA bij ' + (oud.merk || '(zonder merk)') + ' uit de ' + uitTekst + ': +' + v.verschil +
      ' (samen ' + v.nu + 'x)';
    if (typeof oud !== 'object') return 'VERVANGT de ruit ' + (r.merk || '') + ' uit de ' + uitTekst;
    var was = (oud.aantal || 1) + 'x ' + (oud.glasBreedte != null ? oud.glasBreedte : '?') + ' x ' +
              (oud.glasHoogte != null ? oud.glasHoogte : '?');
    if (oud.glasType !== r.glasType || oud.opbouw !== r.opbouw) {
      was += ', ' + [oud.glasType, oud.opbouw].filter(Boolean).join(' ');
    }
    return 'VERVANGT ' + (oud.merk || '(zonder merk)') + ' uit de ' + uitTekst + ' (' + was + ')';
  }

  // Alleen een hoger aantal dan besteld (v110): { was, nu, verschil }.
  // Alleen op een aanvulling; de indeling komt van teBestellen().
  // Tijdens het tekenen van één pdf staat de indeling vast (tekenT): anders
  // rekende elke cel teBestellen() opnieuw uit (beoordeling v110: traag bij
  // veel ruiten op een oudere iPad).
  var tekenT = null;
  function extraVan(r) {
    var t = tekenT || (window.teBestellen ? teBestellen() : null);
    return t && t.aanvulling && t.extra ? (t.extra[r.id] || null) : null;
  }

  // Het aantal in de tabel: bij EXTRA alleen wat erbij komt (v110).
  function aantalOpLijst(r, modus) {
    var n = parseInt(r.aantal) || 1;
    if (modus !== 'aanvulling') return n;
    var v = extraVan(r);
    return v ? v.verschil : n;
  }

  // In welke bestellijst een ruit besteld is (kolom Besteld op het overzicht).
  // v110: met een extra of lager aantal staat erbij waar dat gevraagd is.
  function besteldIn(r) {
    var st = window.besteldeStand ? besteldeStand() : null;
    var nr = st && st.nr[r.id];
    if (!nr) return '';
    var h = (st.herkomst && st.herkomst[r.id]) || [];
    var mi = (st.minderIn && st.minderIn[r.id]) || [];
    if (h.length < 2 && !mi.length) return nr + 'e';
    var tekst = h.length ? h.map(function (x) { return x.nr + 'e'; }).join(' + ') : nr + 'e';
    if (h.length > 1) tekst += ' (' + h.map(function (x) { return x.n == null ? '?' : x.n; }).join(' + ') + ')';
    if (mi.length) {
      tekst += '; ' + mi.map(function (x) { return x.nr + 'e: ' + (x.n == null ? '?' : x.n) + ' geannuleerd'; }).join(', ');
    }
    return tekst;
  }

  // Wat er op de volgende bestellijst komt (v105). 'volledig' = nog niets
  // besteld, alles wat compleet is. 'aanvulling' = alleen nieuw en
  // gewijzigd, plus wat er geannuleerd moet worden. 'overzicht' = er is
  // niets bij te bestellen: alles wat besteld is, en dat is geen bestelling.
  function bestelModus() {
    var t = window.teBestellen ? teBestellen() : null;
    if (!t || !t.aanvulling) return { modus: 'volledig', t: t };
    return { modus: t.aantal ? 'aanvulling' : 'overzicht', t: t };
  }

  // De naam van de bestellijst. Twee bestanden met dezelfde naam zijn bij
  // de leverancier niet uit elkaar te houden, en in een opslagvenster op de
  // pc overschrijft de 2e anders de 1e (v104). Een aanvulling heet dus
  // ..._2e_aanvulling.pdf, het overzicht ..._overzicht.pdf (v105). Eén plek,
  // voor het opslagvenster én de pdf zelf.
  function bestellijstNaam(project, datum) {
    var m = bestelModus().modus;
    // Het overzicht heet niet "Bestellijst": in een lijst met bijlagen zie
    // je vaak alleen het begin van de naam (beoordeling v105).
    if (m === 'overzicht') return maakNaam('Overzicht_besteld', project, datum);
    var naam = maakNaam('Bestellijst', project, datum);
    if (m === 'aanvulling') naam = naam.replace(/\.pdf$/, '_' + (bestellingTeller() + 1) + 'e_aanvulling.pdf');
    return naam;
  }

  function bestellingTeller() {
    return window.glasBestellingen ? glasBestellingen().length : 0;
  }

  function bestelKolommen(modus) {
    return [
      { kop: 'Pos',        w: 8,  haal: function (r, i) { return i + 1; }, altijd: true },
      { kop: 'Aantal',     w: 12, haal: function (r) { return aantalOpLijst(r, modus); }, altijd: true },
      { kop: 'Merk',       w: 14, haal: function (r) { return r.merk; }, altijd: true },
      // Op een aanvulling: NIEUW of VERVANGT ... (v105). Op het overzicht:
      // in welke bestellijst de ruit besteld is. Leeg = niet getoond.
      modus === 'overzicht'
        ? { kop: 'Besteld',  w: 22, haal: function (r) { return besteldIn(r); } }
        : { kop: 'Wijz.',    w: 34, haal: function (r) { return wijzLabel(r); } },
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
          var t = r.glasbewerking !== 'Helder (standaard)' ? r.glasbewerking : '';
          // Een sterretje bij een combinatie die volgens de catalogus niet
          // bestaat; onder de tabel staat waar dat naar verwijst.
          return t + (strijdigeRegel(r) ? ' *' : ''); } },
      { kop: 'Roedenverdeling', w: 26, haal: function (r) {
          return r.roedenverdeling !== 'Geen roedenverdeling' ? r.roedenverdeling : ''; } },
      { kop: 'Roede br',   w: 16, haal: function (r) { return r.roedenbreedte; } },
      // Beide opmerkingen. Eerder won de roedenopmerking en verdween de
      // gewone opmerking uit de bestelling (v83).
      { kop: 'Opmerking',  w: 34, haal: function (r) {
          return [r.opmerking, r.roedenopmerking].filter(Boolean).join(' \u00b7 '); } }
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

    var plaatje = foto && foto.pad ? fotoData(foto.pad) : Promise.resolve(null);

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
      } else if (foto || (projectInfo && projectInfo.leverAdres === 'werk')) {
        // Bij de werkplaats zonder foto: geen vak met "geen foto", want daar
        // ontbreekt niets (v94).
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

  // Vóór een aanvulling of overzicht (v105, na de beoordeling): wat er niet
  // klopt met wat er besteld is, eerst aan de gebruiker voorleggen.
  // - Een oudere stand van een ander apparaat (niet gewijzigd sinds de
  //   bestelling, toch anders) is geen wijziging. Hij gaat niet mee; de app
  //   biedt aan hem terug te zetten.
  // - Een bestelde ruit die weg is, komt onder ANNULEREN. Dat kost geld als
  //   het niet de bedoeling was (een ander apparaat met een oudere stand, of
  //   per ongeluk verwijderd). Daarom vragen: zelf verwijderd, of terugzetten?
  // Geeft 'door', of null (gestopt, of teruggezet). Na terugzetten stopt de
  // export: de naam van het bestand is al gekozen (opslagvenster) en kan
  // nu niet meer kloppen. De gebruiker kijkt het na en begint opnieuw.
  var alleenBekijken = false;   // gekozen: "Alleen bekijken" (v106)
  // De vragen vóór een bestellijst. Als laatste (v110): klopt het aantal met
  // de bolletjes op de foto? Dat staat los van de rest en komt ook bij
  // ‹Alleen bekijken›, want ook die lijst kan naar de leverancier gaan.
  function voorControles(bm) {
    return voorControlesBestelling(bm).then(function (k) {
      return k === 'door' ? aantalControle(bm) : k;
    });
  }

  // Ruiten op deze bestellijst met minstens één bolletje, waar het aantal
  // niet gelijk is aan het aantal bolletjes (v110, keuze van Jan). Sinds
  // v110 kan dat niet meer door typen ontstaan, wel in een project van
  // vóór v110, of als een ruit nog niet helemaal is aangewezen. Een regel
  // zonder bolletjes (los, of uit een maatstaat) telt niet: daar is het
  // aantal de waarheid.
  function aantalScheef(bm) {
    if (!window.bollenVanRij || bm.modus === 'overzicht') return [];
    var compleet = window.bestelbaar || function (r) {
      return !!(r.glasType && r.opbouw && r.glasBreedte != null && r.glasHoogte != null);
    };
    // Ook de ruiten met een lager aantal (v110, beoordeling): die gaan als
    // "N annuleren" naar de leverancier.
    var lijst = bm.modus === 'aanvulling' && bm.t
      ? bm.t.regels.concat((bm.t.minder || []).map(function (m) { return m.rij; }))
      : rijen.filter(compleet);
    return lijst.map(function (r) {
      return { rij: r, bol: bollenVanRij(r.id), aantal: parseInt(r.aantal, 10) > 0 ? parseInt(r.aantal, 10) : 1 };
    }).filter(function (x) { return x.bol > 0 && x.bol !== x.aantal; });
  }
  window.glasAantalScheef = function () { return aantalScheef(bestelModus()); };

  function aantalControle(bm) {
    var scheef = aantalScheef(bm);
    if (!scheef.length || !window.appKeuze) return Promise.resolve('door');
    var namen = scheef.slice(0, 10).map(function (x) {
      return (x.rij.merk || '(zonder merk)') + ' (aantal ' + x.aantal + ', ' +
        (x.bol === 1 ? 'één bolletje' : x.bol + ' bolletjes') +
        (x.bol < x.aantal ? ': nog ' + (x.aantal - x.bol) + ' niet aangewezen' : '') + ')';
    }).join('; ') + (scheef.length > 10 ? ' …' : '');
    return appKeuze('Bij ' + (scheef.length === 1 ? 'deze ruit' : 'deze ruiten') + ' zegt het aantal iets anders dan ' +
      'de bolletjes op de foto: ' + namen + '.\n' +
      'De bestellijst gaat uit van het aantal. Klopt dat niet, stop dan; onder de foto kies je per regel wat klopt.',
      [{ tekst: 'Stoppen', waarde: null },
       { tekst: 'Doorgaan met deze aantallen', waarde: 'door' }],
      { kop: 'Klopt het aantal?', soort: 'letop' });
  }

  function voorControlesBestelling(bm) {
    // Alleen kijken (een collega bewerkt het project, v106): de lijst mag je
    // maken en bekijken, maar de app kan hem niet als bestelling vastleggen.
    // Dat vooraf zeggen, niet pas als hij al verstuurd is.
    if (bm.modus !== 'overzicht' && window.glasAlleenKijken && glasAlleenKijken() && window.appKeuze) {
      var st = window.glasBewerkslotStand ? (glasBewerkslotStand().stand || {}) : {};
      return appKeuze((st.naam || 'Een collega') + ' bewerkt dit project; jij kijkt alleen mee. Deze bestellijst ' +
        'kun je maken en bekijken, maar de app kan hem niet als bestelling vastleggen. Gaat hij naar de ' +
        'leverancier, neem het project dan eerst over en maak de lijst daarna opnieuw.',
        [{ tekst: 'Stoppen', waarde: null },
         { tekst: 'Toch bewerken', waarde: 'over' },
         { tekst: 'Alleen bekijken', waarde: 'door' }],
        { kop: 'Alleen kijken', soort: 'letop' }).then(function (k) {
          if (k === 'over' && window.bewerkslotTochBewerken) bewerkslotTochBewerken();
          alleenBekijken = k === 'door';
          return k === 'door' ? 'door' : null;
        });
    }
    alleenBekijken = false;
    if (bm.modus === 'volledig' || !bm.t || !window.appKeuze) return Promise.resolve('door');
    var w = bm.t.w;
    var namen = function (l, f) { return l.map(f).slice(0, 10).join('; ') + (l.length > 10 ? ' …' : ''); };
    // Een oudere stand: niet stil weglaten en niet stil bestellen. De
    // herkenning gaat op het stempel van de laatste wijziging; staat de klok
    // van een apparaat verkeerd, of was een wijziging offline gedaan en is de
    // app daarna opnieuw opgestart, dan kan het ook een echte wijziging zijn.
    // Daarom kiest de gebruiker (en daarna opnieuw beginnen).
    var stap1 = !w.ouder.length ? Promise.resolve('door') : appKeuze(
      'Deze ruiten zijn anders dan besteld, maar volgens de app niet gewijzigd sinds de bestelling: ' +
      namen(w.ouder, function (o) {
        var spoor = window.ruitSpoor ? ruitSpoor(o.rij) : '';
        return (o.rij.merk || '(zonder merk)') + ' (' + o.verschil.join('; ') + (spoor ? '; ' + spoor.toLowerCase() : '') + ')';
      }) + '.\n' +
      'Waarschijnlijk heeft een ander apparaat een oudere versie opgeslagen. Maar heeft iemand het bewust ' +
      'zo gezet (of stond de klok van dat apparaat verkeerd), kies dan "Nee, toch zo bestellen". Vraag het ' +
      'bij twijfel na bij wie het laatst wijzigde.',
      // Geen knop voorgesteld: de app weet het niet zeker (beoordeling).
      [{ tekst: 'Stoppen', waarde: null },
       { tekst: 'Nee, toch zo bestellen', waarde: 'toch' },
       { tekst: 'Zet terug zoals besteld', waarde: 'terug' }],
      { kop: 'Oudere stand?', soort: 'letop' })
      .then(function (k) {
        var ids = w.ouder.map(function (o) { return String(o.rij.id); });
        if (k === 'terug') return teruggezet(ids);
        if (k === 'toch') return tochBesteld(ids);
        return null;
      });
    return stap1.then(function (k) {
      if (k !== 'door' || !bm.t.vervallen.length) return k;
      var kanTerug = bm.t.vervallen.some(function (v) { return v.oud && typeof v.oud === 'object'; });
      return appKeuze(
        'Besteld, en niet meer in het project: ' +
        namen(bm.t.vervallen, function (v) { return besteldeRuit(v.oud, v.nrTekst || v.nr); }) + '.\n' +
        'Ze komen op de aanvulling onder ANNULEREN, als dat nog kan. Heb je ze zelf verwijderd? Zo niet ' +
        '(per ongeluk, of een ander apparaat met een oudere stand), zet ze dan terug.',
        [{ tekst: 'Stoppen', waarde: null }]
          .concat(kanTerug ? [{ tekst: 'Zet terug zoals besteld', waarde: 'terug' }] : [])
          .concat([{ tekst: 'Ja, laten annuleren', waarde: 'door', primair: true }]),
        { kop: 'Laten annuleren?', soort: 'letop' })
        .then(function (k2) {
          if (k2 !== 'terug') return k2;
          return teruggezet(bm.t.vervallen.map(function (v) { return String(v.id); }));
        });
    });
  }

  function tochBesteld(ids) {
    var n = window.ruitenTochBestellen ? ruitenTochBestellen(ids) : 0;
    if (n && window.appMelding) {
      appMelding(n + (n === 1 ? ' ruit telt' : ' ruiten tellen') + ' nu als wijziging en ' +
        (n === 1 ? 'gaat' : 'gaan') + ' mee op de volgende bestellijst. Maak de bestellijst opnieuw.', { kop: 'Toch zo bestellen' });
    }
    return null;
  }

  function teruggezet(ids) {
    var n = window.ruitenTerugZoalsBesteld ? ruitenTerugZoalsBesteld(ids) : 0;
    if (n && window.appMelding) {
      appMelding(n + (n === 1 ? ' ruit is' : ' ruiten zijn') + ' teruggezet zoals besteld. Kijk het na op Invoer, ' +
        'en maak de bestellijst daarna opnieuw.', { kop: 'Teruggezet' });
    }
    return null;
  }

  function bouwBestellijst() {
    return voorControles(bestelModus()).then(function (k) {
      if (k !== 'door') { bezig(''); return null; }
      return bouwBestellijstVerder();
    });
  }

  function bouwBestellijstVerder() {
    var knop = document.getElementById('pdfBestelKnop');
    var project = (document.getElementById('projectNaam') || {}).value || 'Glasopname';
    var datum = (document.getElementById('projectDatum') || {}).value || '';
    var naam = bestellijstNaam(project, datum);

    var compleet = window.bestelbaar || function (r) {
      return !!(r.glasType && r.opbouw && r.glasBreedte != null && r.glasHoogte != null);
    };
    var bm = bestelModus();
    // Een aanvulling heeft alleen de nieuwe en gewijzigde ruiten (v105).
    var lijst = bm.modus === 'aanvulling' ? bm.t.regels : rijen.filter(compleet);
    var annuleren = bm.modus === 'aanvulling' ? bm.t.vervallen : [];
    // v110: alleen een lager aantal is ook iets voor de leverancier.
    var minder = bm.modus === 'aanvulling' ? (bm.t.minder || []) : [];
    if (!lijst.length && !annuleren.length && !minder.length) {
      appMelding('Geen volledige regels gevonden. Een regel telt mee zodra glastype, opbouw ' +
        'en de glasmaten ingevuld zijn.', { kop: 'Niets te bestellen', soort: 'letop' });
      return Promise.resolve(null);
    }
    // Regels waar wél aan begonnen is maar die niet compleet zijn, vielen
    // zonder een woord van de bestellijst. Die gingen dus niet mee in de
    // bestelling terwijl niemand dat zag (v83). Een ruit die al besteld is
    // en nu onvolledig, telt hier niet: die maakt de leverancier zoals hij
    // besteld is (v105; hij staat geel in de app).
    var st = window.besteldeStand ? besteldeStand() : null;
    var onvolledig = rijen.filter(function (r) {
      if (st && st.laatste && st.ruiten[r.id] !== undefined) return false;
      return !compleet(r) && (r.merk || r.breedte || r.hoogte || r.glasType || r.opbouw);
    });
    if (onvolledig.length) {
      var namen = onvolledig.map(function (r) { return r.merk || '(zonder merk)'; })
                            .slice(0, 12).join(', ');
      return appVraag(onvolledig.length + (onvolledig.length === 1 ? ' regel is' : ' regels zijn') +
        ' niet compleet en ' + (onvolledig.length === 1 ? 'komt' : 'komen') +
        ' niet op de bestellijst: ' + namen + (onvolledig.length > 12 ? ' …' : '') + '.\n' +
        'Er ontbreekt een glastype, een opbouw of een maat.',
        { kop: 'Niet alles gaat mee', ja: 'Toch doorgaan', nee: 'Eerst aanvullen', gevaarlijk: true })
        .then(function (door) {
          if (!door) return null;
          return bestellijstTekenen(knop, project, datum, naam, lijst, bm);
        });
    }
    return bestellijstTekenen(knop, project, datum, naam, lijst, bm);
  }

  // "1e van 14-10-2026, 2e van 15-10-2026" — de geldige bestellingen.
  function eerdereTekst() {
    var lijst = window.glasBestellingen ? glasBestellingen() : [];
    return lijst.filter(function (b) { return b && !b.ingetrokken; }).map(function (b) {
      return (b.nr || '') + 'e van ' + (window.korteDatum ? korteDatum(b.op, true).split(' ')[0] : b.op);
    }).join(', ');
  }

  // "K3 2x 792 x 1392 HR++ (1e)" — een eerder bestelde ruit, voor op papier.
  function besteldeRuit(oud, nr) {
    if (!oud || typeof oud !== 'object') {
      return 'een ruit uit de ' + (typeof nr === 'string' ? nr : (nr || 1) + 'e') + ' bestellijst (gegevens van voor v104 niet bewaard)';
    }
    var b2 = oud.glasBreedte != null ? oud.glasBreedte : oud.breedte;
    var h2 = oud.glasHoogte != null ? oud.glasHoogte : oud.hoogte;
    return (oud.merk || '(zonder merk)') + ' ' + (oud.aantal || 1) + 'x ' +
           (b2 || '?') + ' x ' + (h2 || '?') + (oud.glasType ? ' ' + oud.glasType : '') +
           (nr ? ' (' + (typeof nr === 'string' ? nr : nr + 'e') + ')' : '');
  }

  // Een tabel onder de bestellijst met eerder bestelde ruiten (annuleren,
  // of op het overzicht: ook besteld / gevraagd te annuleren). r: { oud, nr, reden }.
  function annulerenTabel(doc, titel, kop, rijen2, rustig) {
    var y = doc.lastAutoTable.finalY + 6;
    if (y > HOOGTE - MARGE - 30) { doc.addPage(); kopregel(doc, titel + ' (vervolg)'); y = MARGE + 14; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(rustig ? 9.5 : 11);
    if (rustig) doc.setTextColor(90, 58, 0); else doc.setTextColor(142, 27, 18);
    doc.text(schoon(kop), MARGE, y);
    var maat = function (o, w) {
      if (!o || typeof o !== 'object') return '';
      var v = w === 'b' ? (o.glasBreedte != null ? o.glasBreedte : o.breedte) : (o.glasHoogte != null ? o.glasHoogte : o.hoogte);
      return v == null ? '?' : String(v);
    };
    doc.autoTable({
      startY: y + 2,
      margin: { left: MARGE, right: MARGE, top: MARGE + 8, bottom: MARGE + 8 },
      head: [['Merk', 'Aantal', 'Glasbreedte', 'Glashoogte', 'Glas type', 'Opbouw', 'Besteld in', rustig ? 'Toelichting' : 'Waarom']],
      body: rijen2.map(function (r) {
        var o = r.oud && typeof r.oud === 'object' ? r.oud : null;
        return [o ? (o.merk || '(zonder merk)') : '(gegevens van voor v104 niet bewaard)', o ? String(o.aantal || 1) : '',
                maat(o, 'b'), maat(o, 'h'), o ? (o.glasType || '') : '', o ? (o.opbouw || '') : '',
                r.nrTekst || ((r.nr || 1) + 'e'), r.reden].map(schoon);
      }),
      styles: { fontSize: 8, cellPadding: 1.4, lineColor: [205, 210, 218], lineWidth: 0.15 },
      headStyles: { fillColor: rustig ? [184, 134, 11] : [142, 27, 18], textColor: 255, fontStyle: 'bold' },
      tableLineColor: rustig ? [184, 134, 11] : [142, 27, 18],
      tableLineWidth: rustig ? 0.4 : 0.8,
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      didDrawPage: function (data) {
        if (data.pageNumber > 1) kopregel(doc, titel + ' (vervolg)');
      }
    });
  }

  // Wat er in de geldige aanvullingen gevraagd is te annuleren: de
  // vervallen ruiten en de oude versie van wat vervangen is.
  function gevraagdTeAnnuleren() {
    var lijst = (window.glasBestellingen ? glasBestellingen() : []).filter(function (b) { return b && !b.ingetrokken; });
    var opNr = {};
    lijst.forEach(function (b) { opNr[b.nr] = b; });
    var uit = [];
    lijst.forEach(function (b) {
      if (b.soort !== 'aanvulling') return;
      Object.keys(b.vervallen || {}).forEach(function (id) {
        var o = b.vervallen[id];
        uit.push({ oud: o, nr: (o && o.nr) || 1, nrTekst: o && o.nrTekst, reden: 'vervallen, gevraagd in de ' + b.nr + 'e' });
      });
      Object.keys(b.ruiten || {}).forEach(function (id) {
        var o = b.ruiten[id];
        // v110: een lager aantal ("1 annuleren") van een bestelde ruit.
        if (o && o.opLijst && o.minder) {
          var weg = o.minder - (parseInt(o.aantal) || 1);
          uit.push({ oud: Object.assign({}, o, { aantal: weg }), nr: 1,
                     nrTekst: typeof o.minderUit === 'string' ? o.minderUit : (o.minderUit || 1) + 'e',
                     reden: 'aantal van ' + o.minder + ' naar ' + (parseInt(o.aantal) || 1) + ', gevraagd in de ' + b.nr +
                       'e (de andere ' + (parseInt(o.aantal) || 1) + ' NIET annuleren)' });
          return;
        }
        if (!o || !o.opLijst || !o.vervangt) return;
        var eerder = opNr[o.vervangt];
        var was = eerder && eerder.ruiten ? eerder.ruiten[id] : null;
        // Alleen als de oude anders gemaakt werd (maat of glas). Bij alleen
        // een ander aantal stond er twee keer hetzelfde merk met dezelfde
        // maat, en annuleerde een leverancier de geldige (beoordeling).
        if (was && typeof was === 'object' && String(was.glasBreedte) === String(o.glasBreedte) &&
            String(was.glasHoogte) === String(o.glasHoogte) && was.glasType === o.glasType && was.opbouw === o.opbouw) return;
        // Altijd de versie noemen die nu geldt: bij een ruit die twee keer
        // vervangen is, stond de tussenversie anders zowel als 'niet
        // annuleren' als 'annuleren' op hetzelfde papier (beoordeling).
        var st = window.besteldeStand ? besteldeStand() : null;
        var geldig = st && st.ruiten[id] && typeof st.ruiten[id] === 'object' ? st.ruiten[id] : o;
        var geldigNr = (st && st.nr[id]) || b.nr;
        var geldigTekst = (st && window.besteldInTekst ? besteldInTekst(id, st) : '') || geldigNr + 'e';
        uit.push({ oud: was || null, nr: o.vervangt, nrTekst: o.vervangtUit,
                   reden: 'oude maat, vervangen in de ' + b.nr + 'e; geldig is nu ' + (geldig.merk || 'de ruit') + ' ' +
                     (geldig.glasBreedte != null ? geldig.glasBreedte : '?') + ' x ' +
                     (geldig.glasHoogte != null ? geldig.glasHoogte : '?') + ' uit de ' + geldigTekst + ' (die NIET annuleren)' });
      });
    });
    return uit;
  }

  function bestellijstTekenen(knop, project, datum, naam, lijst, bm) {
    bm = bm || bestelModus();
    var modus = bm.modus;
    tekenT = bm.t || null;

    if (knop) knop.disabled = true;
    bezig('Bestellijst als pdf maken…');

    return laad(JSPDF_URL).then(function () { return laad(TABEL_URL); })
      .then(haalLogo).then(function () {
      zetFormaat(true);
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      var titel = modus === 'aanvulling' ? 'Bestellijst glas - AANVULLING'
                : modus === 'overzicht' ? 'Overzicht bestelde ruiten - GEEN BESTELLING' : 'Bestellijst glas';
      kopregel(doc, titel);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 70, 84);
      var adres = [projectInfo.straat, projectInfo.postcode, projectInfo.plaats].filter(Boolean).join('  ');
      doc.text(schoon('Project: ' + project + (datum ? '     Datum: ' + datum : '') +
               (adres ? '     ' + adres : '') +
               (projectInfo.klant ? '     Opdrachtgever: ' + projectInfo.klant : '')), MARGE, MARGE + 9);
      var t = bm.t;
      var annuleren = modus === 'aanvulling' ? t.vervallen : [];
      // De stand zoals hij nu op de pdf komt: dít wordt vastgelegd als het
      // antwoord 'Ja, verstuurd' is, ook als er intussen iets binnenkomt
      // (v104). Het overzicht is geen bestelling: niets vast te leggen.
      var moment = modus !== 'overzicht' && window.bestelMomentopname ? bestelMomentopname(lijst, t) : null;
      var tabelY = MARGE + 13;
      // Een aanvulling en een overzicht zeggen bovenaan, vóór de tabel, wat
      // ze zijn. Onderaan zag niemand het.
      if (modus !== 'volledig') {
        var nuNr = bestellingTeller() + 1;
        var ingetrokken = (window.glasBestellingen ? glasBestellingen() : []).filter(function (b) {
          return b && b.ingetrokken;
        }).length;
        // Het kopje groot (op een telefoon is de rest pas met inzoomen te
        // lezen), de uitleg eronder (beoordeling v105).
        var kopje = modus === 'aanvulling'
          ? nuNr + 'e BESTELLIJST = AANVULLING op de eerdere bestelling (' + eerdereTekst() + ')'
          : 'OVERZICHT van alles wat besteld is (' + eerdereTekst() + ') - GEEN nieuwe bestelling';
        var kopTekst = modus === 'aanvulling'
          ? 'Hierop staan ALLEEN nieuwe ruiten en ruiten die anders gemaakt moeten worden. Alles wat ' +
            'eerder besteld is en hier niet op staat, blijft zoals besteld. Kolom Wijz.: NIEUW = nieuwe ruit, ' +
            'erbij maken; VERVANGT = maak deze in plaats van de genoemde eerder bestelde ruit, en annuleer ' +
            'die als dat nog kan.' +
            // v110: alleen meer van een bestelde ruit.
            (Object.keys(t.extra || {}).length ? ' EXTRA = maak er zoveel bij (kolom Aantal); de eerder ' +
              'bestelde blijven.' : '') +
            ((annuleren.length || (t.minder || []).length) ? ' Onder de tabel: ANNULEREN.' : '')
          : 'Kolom Besteld: in welke bestellijst de ruit besteld is.' +
            (gevraagdTeAnnuleren().length ? ' Onder de tabel: wat er gevraagd is te annuleren (dat kan toch ' +
              'geleverd zijn).' : '');
        if (ingetrokken) {
          kopTekst += ' (' + (ingetrokken === 1 ? 'Een bestellijst is' : ingetrokken + ' bestellijsten zijn') +
            ' ingetrokken en ' + (ingetrokken === 1 ? 'geldt' : 'gelden') + ' niet.)';
        }
        // Meten in hetzelfde lettertype als waarin getekend wordt, anders
        // loopt een regel over de rand (beoordeling v105).
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        var kopjeRegels = doc.splitTextToSize(schoon(kopje), INHOUD - 6);
        doc.setFontSize(8.5);
        var kopRegels = doc.splitTextToSize(schoon(kopTekst), INHOUD - 6);
        var kopH = kopjeRegels.length * 5.4 + kopRegels.length * 4 + 5;
        doc.setFillColor(255, 236, 170);
        doc.setDrawColor(184, 134, 11);
        doc.setLineWidth(0.6);
        doc.rect(MARGE, MARGE + 12, INHOUD, kopH, 'FD');
        doc.setTextColor(90, 58, 0);
        doc.setFontSize(12);
        doc.text(kopjeRegels, MARGE + 3, MARGE + 17.4);
        doc.setFontSize(8.5);
        doc.text(kopRegels, MARGE + 3, MARGE + 17.4 + kopjeRegels.length * 5.4 + 0.6);
        tabelY = MARGE + 12 + kopH + 3;
      }

      var kols = bestelKolommen(modus).filter(function (k) {
        if (k.altijd) return true;
        return lijst.some(function (r) {
          var v = k.haal(r, 0);
          return v !== null && v !== undefined && String(v).trim() !== '';
        });
      });
      var wijzKolom = -1;
      kols.forEach(function (k, i) { if (k.kop === 'Wijz.') wijzKolom = i; });
      var totaal = kols.reduce(function (n, k) { return n + k.w; }, 0);
      var factor = INHOUD / totaal;
      var stijlen = {};
      kols.forEach(function (k, i) {
        stijlen[i] = { cellWidth: k.w * factor, halign: /Glas(breedte|hoogte)|Aantal|Pos/.test(k.kop) ? 'right' : 'left' };
      });

      // Een aanvulling met alleen iets te annuleren heeft geen tabel (v105).
      if (!lijst.length) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(29, 29, 27);
        doc.text(schoon('Geen nieuwe of gewijzigde ruiten op deze aanvulling.'), MARGE, tabelY + 4);
        doc.lastAutoTable = { finalY: tabelY + 6 };
      } else doc.autoTable({
        startY: tabelY,
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
        // Regels waarvan de bewerking niet in de gekozen bladdikte bestaat
        // krijgen een rode ondergrond. autoTable kleurt per cel, dus het
        // gaat hier per cel van de betreffende regel.
        didParseCell: function (data) {
          if (data.section !== 'body') return;
          if (data.column.index === wijzKolom && data.cell.raw) {
            data.cell.styles.fillColor = [255, 236, 170];
            data.cell.styles.textColor = [90, 58, 0];
            data.cell.styles.fontStyle = 'bold';
            return;
          }
          if (!strijdigeRegel(lijst[data.row.index])) return;
          data.cell.styles.fillColor = [253, 236, 234];
          data.cell.styles.textColor = [142, 27, 18];
          data.cell.styles.fontStyle = 'bold';
        },
        didDrawPage: function (data) {
          if (data.pageNumber > 1) kopregel(doc, titel + ' (vervolg)');
        }
      });

      // Voetnoot bij die sterretjes, pal onder de tabel.
      var strijdig = lijst.filter(strijdigeRegel).length;
      if (strijdig) {
        var ys = doc.lastAutoTable.finalY + 4;
        if (ys > HOOGTE - MARGE - 20) { doc.addPage(); kopregel(doc, titel + ' (vervolg)'); ys = MARGE + 13; }
        doc.setFillColor(253, 236, 234);
        doc.setDrawColor(142, 27, 18);
        doc.setLineWidth(0.8);
        doc.rect(MARGE, ys, INHOUD, 11, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(142, 27, 18);
        doc.text(schoon('*  ' + (window.STRIJDIG_NOOT ||
                 'check beschikbaarheid combinatie dikte-glastype!')), MARGE + 3, ys + 4.6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 40, 35);
        doc.text(schoon(strijdig + ' ' + (strijdig === 1 ? 'regel staat' : 'regels staan') +
                 ' met een glasbewerking die volgens de catalogus niet in de gekozen ' +
                 'bladdikte bestaat. Rood gemarkeerd in de tabel hierboven.'), MARGE + 3, ys + 8.8);
        doc.lastAutoTable.finalY = ys + 11;
      }

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

      // Onder de tabel (v105). Aanvulling: wat de leverancier moet
      // annuleren, als dat nog kan: de vervallen ruiten en de oude versie van
      // wat hier vervangen wordt. Een ruit die verwijderd is, staat anders
      // nergens, en dan maakt de leverancier hem gewoon. Als eigen tabel met
      // een rode kop: als doorlopende tekst las een orderverwerker eroverheen
      // (beoordeling). Overzicht: wat wel besteld is maar in de app nu niet
      // compleet is, en wat er ooit gevraagd is te annuleren (dat kan toch
      // geleverd zijn), zodat dit papier niet stil minder toont.
      if (modus === 'aanvulling') {
        var ann = annuleren.map(function (v) { return { oud: v.oud, nr: v.nr, nrTekst: v.nrTekst, reden: 'vervalt' }; })
          // EXTRA (v110): de bestelde blijven, dus niets te annuleren.
          .concat((t.gewijzigd || []).filter(function (g) { return g.oud && !(t.extra || {})[g.rij.id]; }).map(function (g) {
            return { oud: g.oud, nr: g.nr, nrTekst: g.nrTekst, reden: 'vervangen door ' + (g.rij.merk || 'de ruit') + ' op deze lijst' };
          }))
          // Een lager aantal (v110): alleen het verschil annuleren, met de
          // maat erbij zodat de leverancier weet welke.
          .concat((t.minder || []).map(function (m) {
            return { oud: Object.assign({}, m.oud, { aantal: m.was - m.nu }), nr: m.nr, nrTekst: m.nrTekst,
                     reden: 'aantal van ' + m.was + ' naar ' + m.nu + ': ' + (m.was - m.nu) + ' annuleren, de andere ' +
                       m.nu + ' blijven' };
          }));
        if (ann.length) annulerenTabel(doc, titel, 'ANNULEREN, als dat nog kan', ann);
      } else if (modus === 'overzicht' && t && t.w) {
        if (t.w.vanLijst.length) {
          annulerenTabel(doc, titel, 'OOK BESTELD, hier niet getoond (in de app nu niet compleet)',
            t.w.vanLijst.map(function (v) { return { oud: v.oud, nr: v.nr, reden: 'besteld' }; }), true);
        }
        var gevraagd = gevraagdTeAnnuleren();
        if (gevraagd.length) {
          annulerenTabel(doc, titel, 'GEVRAAGD TE ANNULEREN (kan toch geleverd zijn)', gevraagd, true);
        }
      }

      // Totalen onder de tabel
      // Bij EXTRA telt alleen wat erbij komt (v110), net als in de kolom.
      var stuks = lijst.reduce(function (n, r) { return n + aantalOpLijst(r, modus); }, 0);
      var m2 = lijst.reduce(function (n, r) {
        return n + (r.glasBreedte * r.glasHoogte / 1000000) * aantalOpLijst(r, modus);
      }, 0);
      var y = doc.lastAutoTable.finalY + 6;
      if (y > HOOGTE - MARGE - 12) { doc.addPage(); kopregel(doc, titel + ' (vervolg)'); y = MARGE + 13; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(29, 29, 27);
      var nNieuw = 0, nVervangt = 0, nExtra = 0;
      var nAnnuleren = annuleren.length + (modus === 'aanvulling' ? (t.minder || []).length : 0);
      if (modus === 'aanvulling') {
        lijst.forEach(function (r) {
          var l = wijzLabel(r);
          if (l === 'NIEUW') nNieuw++; else if (/^EXTRA/.test(l)) nExtra++; else if (l) nVervangt++;
        });
      }
      doc.text(schoon(lijst.length + ' posities   |   ' + stuks + ' ruiten   |   totaal ' +
               m2.toFixed(2).replace('.', ',') + ' m2 glas' +
               (modus === 'aanvulling' ? '   |   alleen deze aanvulling: ' + nNieuw + ' NIEUW, ' +
                 nVervangt + ' VERVANGT' + (nExtra ? ', ' + nExtra + ' EXTRA' : '') +
                 (nAnnuleren ? ', ' + nAnnuleren + ' ANNULEREN' : '') : '') +
               (modus === 'overzicht' ? '   |   alles wat besteld is' : '')), MARGE, y);

      return leverPagina(doc, project, datum).then(function () {
        voetteksten(doc, project, datum);
        // Vastleggen als bestelling gebeurt níet meer hier (v104): pas als
        // de lijst echt naar de leverancier gaat (vraagVerstuurd, of een
        // bestelmail die aankwam).
        return { doc: doc, naam: naam, lijst: lijst, moment: moment, modus: modus };
      });
    }).then(function (res) {
      tekenT = null;
      if (knop) knop.disabled = false;
      return res;
    }, function (e) { tekenT = null; throw e; });
  }

  /* ═══════════════ IS HIJ VERSTUURD? (v104, keuze van Jan) ═══════════════ */
  // Tot v103 legde élke bestellijst-pdf vast "zo is het besteld". Een pdf
  // die alleen bekeken werd, wiste zo de gele markeringen van wat er na de
  // echte bestelling veranderd was. Nu vraagt de app het, nadat de pdf is
  // opgeslagen of gedeeld. Ja: vastleggen (een nieuwe bestelling erbij,
  // nooit overschrijven), status 'besteld', op slot. Nee of wegtikken: er
  // verandert niets.
  function vraagVerstuurd(lijst, moment) {
    if (!lijst || !window.bestellingVastleggen || !window.appVraag) return Promise.resolve(false);
    // Het overzicht (er is niets bij te bestellen) is geen bestelling: dan
    // is er geen momentopname, en niets te vragen (v105).
    if (!moment) return Promise.resolve(false);
    // Alleen wie het project bewerkt, kan iets als bestelling vastleggen
    // (v106). Kijken en een pdf maken mag wel.
    if (window.glasAlleenKijken && glasAlleenKijken()) {
      // Al gezegd en gekozen ("Alleen bekijken"): niet nog eens.
      if (alleenBekijken) { alleenBekijken = false; return Promise.resolve(false); }
      if (window.appMelding) {
        // Hier kom je alleen als een collega het project overnam terwijl
        // deze lijst gemaakt werd (vooraf vraagt voorControles het al).
        var st = window.glasBewerkslotStand ? (glasBewerkslotStand().stand || {}) : {};
        var wie = st.naam || 'Een collega';
        appMelding(wie + ' bewerkt dit project nu, dus deze lijst kon de app niet als bestelling vastleggen. ' +
          'Is hij naar de leverancier gegaan? Laat het ' + (st.naam || 'die collega') + ' weten, of neem het ' +
          'project terug met ‹Toch bewerken›, maak de lijst opnieuw en kies dan ‹Ja, verstuurd›. Hij hoeft niet nog ' +
          'een keer naar de leverancier.',
          { kop: 'Bestelling niet vastgelegd', soort: 'letop' });
      }
      return Promise.resolve(false);
    }
    var aanvulling = moment.soort === 'aanvulling';
    // v110: ook alleen een lager aantal ("1 annuleren") is een bestelling.
    var alleenMinder = aanvulling && Object.keys(moment.ruiten || {}).some(function (id) {
      return moment.ruiten[id] && moment.ruiten[id].minder;
    });
    if (!lijst.length && !(aanvulling && moment.vervallen && Object.keys(moment.vervallen).length) && !alleenMinder) {
      return Promise.resolve(false);
    }
    var eerder = window.glasBestellingen ? glasBestellingen() : [];
    var nr = eerder.length + 1;
    return appVraag('Is deze bestellijst de bestelling (opdracht) aan de leverancier, en stuur je hem ' +
      'nu of heb je hem al gestuurd?\n' +
      'Ja, verstuurd: de app legt vast wat er op deze pdf staat. Het project gaat op "besteld" en de ' +
      'maten gaan op slot. Wat daarna verandert, zie je geel terug.' +
      (aanvulling ? ' Dit wordt de ' + nr + 'e bestellijst, een aanvulling; wat eerder besteld is, blijft gelden.' : '') +
      '\n' +
      'Nee, alleen bekeken (of een prijsaanvraag): er verandert niets.',
      { kop: 'Naar de leverancier?', ja: 'Ja, verstuurd', nee: 'Nee, alleen bekeken' })
      .then(function (ja) {
        if (!ja) return false;
        bestellingVastleggen(lijst, 'pdf', moment);
        // Is er tussen de pdf en het antwoord iets veranderd (een collega,
        // of Ctrl+Z)? Vastgelegd is wat op de pdf staat; het verschil is
        // geel. Dat zeggen, anders lijkt het alsof het besteld is.
        var w = window.wijzigingenSindsBestelling ? wijzigingenSindsBestelling() : null;
        if (w && w.aantal && window.appMelding) {
          appMelding('Vastgelegd is wat op de pdf staat. Na het maken van de pdf is er intussen iets ' +
            'veranderd (' + w.aantal + (w.aantal === 1 ? ' ruit' : ' ruiten') + '); dat staat geel en ' +
            'is dus nog niet besteld.', { kop: 'Let op', soort: 'letop' });
        }
        return true;
      });
  }
  window.glasVraagVerstuurd = vraagVerstuurd;

  /* ═══════════════ BESTELMAIL ═══════════════ */
  // De bestellijst gaat als pdf mee in een mail naar de leverancier. Dat
  // versturen gebeurt door de Edge Function `mail` in Supabase (de sleutel
  // van de maildienst hoort niet in de app), en die functie zet daarna het
  // project op 'besteld' (v88).
  // Sinds v104 is dat niet meer de enige weg: ‹Ja, verstuurd› op de vraag
  // "Naar de leverancier?" na de bestellijst-pdf (vraagVerstuurd, hierboven)
  // legt de bestelling ook vast en zet ook 'besteld'. 'Besteld' betekent dus:
  // iemand heeft bevestigd dat de lijst echt naar de leverancier ging, met de
  // app-vraag of met een gelukte mail. Alleen een pdf maken telt niet.
  // Let op: de mailfunctie is nog niet ingesteld in Supabase (stand v109).

  // Het onderwerp zegt wat het is: bij een leverancier beslist de
  // orderintake vaak op het onderwerp (beoordeling v105).
  function mailOnderwerp(bm, project, datum) {
    var achter = project + (datum ? ' (' + datum + ')' : '');
    if (bm && bm.modus === 'aanvulling') return 'AANVULLING (' + (bestellingTeller() + 1) + 'e bestellijst) glas — ' + achter;
    if (bm && bm.modus === 'overzicht') return 'Overzicht bestelde ruiten, GEEN nieuwe bestelling — ' + achter;
    return 'Bestelling glas — ' + achter;
  }

  // bm = bestelModus(): een aanvulling of een overzicht zegt dat in de
  // mail zelf ook, niet alleen in de bijlage (v105).
  function mailTekst(project, datum, aantal, bm) {
    var i = (typeof projectInfo === 'object' && projectInfo) || {};
    var modus = bm ? bm.modus : 'volledig';
    var regels = ['Beste,', ''];
    if (modus === 'aanvulling') {
      regels.push('Bijgaand een AANVULLING op onze eerdere bestelling (' + eerdereTekst() + ') voor ' +
        (project || 'dit project') + '. Hierop staan alleen nieuwe ruiten en ruiten die anders gemaakt ' +
        'moeten worden; wat eerder besteld is, blijft zoals besteld.');
      if (bm.t.vervallen.length || (bm.t.minder || []).length) {
        regels.push('Onder de tabel staat wat er geannuleerd moet worden, als dat nog kan.');
      }
      aantal = bm.t.regels.length + ' (alleen deze aanvulling' +
        // v110: ook iets te annuleren (een ruit weg, of een lager aantal).
        ((bm.t.vervallen.length + (bm.t.minder || []).length)
          ? '; en ' + (bm.t.vervallen.length + (bm.t.minder || []).length) + ' te annuleren' : '') + ')';
    } else if (modus === 'overzicht') {
      regels.push('Bijgaand het overzicht van alles wat er voor ' + (project || 'dit project') +
        ' besteld is. Dit is GEEN nieuwe bestelling.');
    } else {
      regels.push('Bijgaand de bestellijst voor ' + (project || 'dit project') + '.');
    }
    regels.push('');
    if (i.referentie) regels.push('Referentie: ' + i.referentie);
    regels.push('Aantal posities: ' + aantal);
    regels.push('Afleveren: ' + leverAdres());
    regels.push('Gewenste levering: ' + leverWanneer());
    if (datum) regels.push('Opgenomen op: ' + datum);
    if (String(i.leverInstructie || '').trim()) {
      regels.push('');
      regels.push('Instructies bij aflevering:');
      regels.push(String(i.leverInstructie).trim());
    }
    regels.push('');
    regels.push('De maten in de bijlage zijn glasmaten.');
    regels.push('');
    regels.push('Met vriendelijke groet,');
    regels.push((window.glasGebruiker ? glasGebruiker().naam : '') || i.opnemer || '');
    regels.push('Jelier Bouw B.V.');
    return regels.join('\n');
  }

  var mailVensterOpen = false;
  function sluitVenster(laag) {
    mailVensterOpen = false;
    if (laag && laag.parentNode) laag.parentNode.removeChild(laag);
  }

  function datumTijd(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
           d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' +
           String(d.getMinutes()).padStart(2, '0');
  }

  // Is er voor dit project al een bestelmail de deur uit? Eerst in het
  // maillogboek van de database kijken (dat weet het ook als een collega
  // of een ander apparaat hem verstuurde), anders in de opname zelf (v91).
  function eerdereBestelling() {
    var i = (typeof projectInfo === 'object' && projectInfo) || {};
    var lokaal = i.bestelmail && i.bestelmail.op
      ? { op: i.bestelmail.op, aan: i.bestelmail.aan || '', wie: i.bestelmail.door || '' } : null;
    if (!window.glasMailLog) return Promise.resolve(lokaal);
    // Alleen bestelmails: anders kon een bestelling buiten de laatste
    // tien mails vallen (v103).
    return Promise.resolve(glasMailLog(null, 'bestelling')).then(function (log) {
      var m = (log || []).find(function (x) { return x && x.soort === 'bestelling' && x.gelukt; });
      return m ? { op: m.moment, aan: m.aan || '', wie: m.wie_naam || '' } : lokaal;
    }, function () { return lokaal; });
  }

  window.bestelmailVenster = function () {
    // Twee keer tikken op een iPad gaf twee vensters op elkaar (v91).
    if (mailVensterOpen) return;
    if (!window.glasMail || !window.glasProjectId) {
      if (window.appFout) {
        appFout('Een bestelmail kan alleen vanuit een project dat in de cloud staat. ' +
                'Open eerst een project, of maak er een aan.', { kop: 'Bestelmail' });
      }
      return;
    }
    var lijst = (typeof rijen === 'undefined' ? [] : rijen).filter(function (r) {
      return r && (r.breedte || r.hoogte);
    });
    if (!lijst.length) {
      if (window.appFout) appFout('Er staan nog geen maten in dit project.', { kop: 'Bestelmail' });
      return;
    }

    var project = (document.getElementById('projectNaam') || {}).value || 'Glasopname';
    var datum = (document.getElementById('projectDatum') || {}).value || '';
    var bmVenster = bestelModus();

    mailVensterOpen = true;
    Promise.all([
      Promise.resolve(window.glasMailAdressen ? glasMailAdressen() : []),
      eerdereBestelling()
    ]).then(function (uit) {
      var adressen = uit[0], eerder = uit[1];
      var laag = document.createElement('div');
      laag.className = 'melding-laag';
      var vinkjes = (adressen || []).map(function (a, n) {
        return '<label class="mail-adres"><input type="checkbox" value="' + esc(a.adres) + '"' +
          (a.standaard ? ' checked' : '') + '> <b>' + esc(a.naam || a.adres) + '</b>' +
          (a.naam ? ' <span>' + esc(a.adres) + '</span>' : '') + '</label>';
      }).join('');
      if (!vinkjes) {
        vinkjes = '<p class="mail-leeg">Er staan nog geen vaste adressen. Zet ze erbij in Supabase ' +
          '(tabel <code>mailadressen</code>), of vul hieronder een adres in.</p>';
      }

      laag.innerHTML =
        '<div class="melding-venster mail-venster" role="dialog" aria-modal="true" aria-label="Bestelmail">' +
          '<h3>Bestelmail versturen</h3>' +
          // v105: na een bestelling is de bijlage een aanvulling (alleen wat
          // nieuw of anders is) of een overzicht (geen bestelling).
          (bmVenster.modus === 'aanvulling'
            ? '<div class="mail-al-besteld"><b>Dit wordt een aanvulling</b> op de eerdere bestelling: ' +
              'alleen de nieuwe en gewijzigde ruiten' + ((bmVenster.t.vervallen.length || (bmVenster.t.minder || []).length) ? ', en wat er ' +
              'geannuleerd moet worden' : '') + '.</div>'
            : bmVenster.modus === 'overzicht'
            ? '<div class="mail-al-besteld"><b>Er is niets bij te bestellen.</b> De bijlage is een overzicht ' +
              'van wat er besteld is, geen nieuwe bestelling.</div>'
            : eerder ? '<div class="mail-al-besteld"><b>Dit project is al besteld</b> op ' +
            esc(datumTijd(eerder.op)) + (eerder.wie ? ' door ' + esc(eerder.wie) : '') +
            (eerder.aan ? ', naar ' + esc(eerder.aan) : '') + '. Nog een keer versturen geeft ' +
            'de leverancier een tweede bestelling. Is er iets gewijzigd, zeg dat dan in het bericht.</div>' : '') +
          '<div class="mail-vak"><label class="mail-kop">Aan</label>' + vinkjes +
            '<input type="text" id="mailExtra" placeholder="nog een adres, bijvoorbeeld inkoop@…">' +
          '</div>' +
          '<div class="mail-vak"><label class="mail-kop" for="mailOnderwerp">Onderwerp</label>' +
            '<input type="text" id="mailOnderwerp" value="' + esc(mailOnderwerp(bmVenster, project, datum)) + '">' +
          '</div>' +
          '<div class="mail-vak"><label class="mail-kop" for="mailTekst">Bericht</label>' +
            '<textarea id="mailTekst" rows="12">' + esc(mailTekst(project, datum, lijst.length, bmVenster)) + '</textarea>' +
          '</div>' +
          // Bij een aanvulling of overzicht staat alles in de bijlage: zonder
          // ziet de leverancier niet wat er bij of af moet (beoordeling v105).
          (bmVenster.modus === 'volledig'
            ? '<label class="mail-adres"><input type="checkbox" id="mailBijlage" checked> ' +
              'Bestellijst als pdf meesturen</label>'
            : '<label class="mail-adres"><input type="checkbox" id="mailBijlage" checked disabled> ' +
              (bmVenster.modus === 'aanvulling' ? 'Aanvulling' : 'Overzicht') + ' als pdf meesturen ' +
              '<span>(verplicht: daarin staat wat er bij of af moet)</span></label>') +
          '<div class="mail-melding" id="mailMelding"></div>' +
          '<div class="melding-knoppen">' +
            '<button class="btn btn-secondary" id="mailAf">Annuleren</button>' +
            '<button class="btn btn-primary" id="mailVerstuur">' + (eerder && bmVenster.modus !== 'aanvulling' ? 'Toch opnieuw versturen' : 'Versturen') + '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(laag);

      var melding = laag.querySelector('#mailMelding');
      laag.querySelector('#mailAf').onclick = function () { sluitVenster(laag); };
      laag.addEventListener('click', function (e) { if (e.target === laag) sluitVenster(laag); });

      var knop = laag.querySelector('#mailVerstuur');
      knop.onclick = function () {
        var aan = Array.prototype.slice
          .call(laag.querySelectorAll('.mail-adres input[type=checkbox][value]'))
          .filter(function (c) { return c.checked; })
          .map(function (c) { return c.value; });
        var extra = String((laag.querySelector('#mailExtra') || {}).value || '').trim();
        if (extra) aan.push(extra);
        var onderwerp = String((laag.querySelector('#mailOnderwerp') || {}).value || '').trim();
        var tekst = String((laag.querySelector('#mailTekst') || {}).value || '').trim();
        var metBijlage = !!(laag.querySelector('#mailBijlage') || {}).checked;

        if (!aan.length) { melding.textContent = 'Kies minstens één adres.'; return; }
        // Een aanvulling of overzicht gaat altijd met de pdf (het vinkje staat
        // vast); zonder zou er niets vastgelegd mogen worden.
        if (bmVenster.modus !== 'volledig' || bestelModus().modus !== 'volledig') metBijlage = true;
        if (!tekst) { melding.textContent = 'Er moet wel iets in de mail staan.'; return; }

        knop.disabled = true;
        melding.textContent = metBijlage ? 'Bestellijst maken…' : 'Versturen…';
        // Zonder bijlage: de stand op het moment van versturen (v104). Na
        // een bestelling is dat de aanvulling (v105); is er niets bij te
        // bestellen, dan is de mail geen bestelling.
        var bmMail = bestelModus();
        var zonderBijlage = bmMail.modus === 'aanvulling' ? bmMail.t.regels
          : rijen.filter(window.bestelbaar || function () { return true; });
        var zonderBijlageMoment = bmMail.modus !== 'overzicht' && window.bestelMomentopname
          ? bestelMomentopname(zonderBijlage) : null;
        var bijlageGemaakt = false;
        var mailLijst = null;
        var mailMoment = null;

        Promise.resolve()
          .then(function () {
            if (!metBijlage) return null;
            // Dezelfde bouwer als de knop Bestellijst, dus de mail bevat
            // precies wat je op papier zou krijgen. Vastgelegd wordt pas
            // als de mail echt verstuurd is (v104).
            return voorControles(bestelModus()).then(function (k) {
              // Gestopt of teruggezet bij "Oudere stand?" / "Laten annuleren?":
              // niets versturen, het venster dicht (v105, beoordeling).
              if (k !== 'door') { var g = new Error('gestopt'); g.gestopt = true; throw g; }
              return bouwBestellijstVerder();
            }).then(function (res) {
              if (!res) throw new Error('er staat niets op de bestellijst');
              var uri = res.doc.output('datauristring');
              bijlageGemaakt = true;
              mailLijst = res.lijst;
              mailMoment = res.moment;   // null bij het overzicht: geen bestelling
              return { naam: res.naam, inhoud: String(uri).split(',')[1] || '' };
            });
          })
          .then(function (bijlage) {
            melding.textContent = 'Versturen…';
            return glasMail({
              soort: 'bestelling',
              aan: aan,
              onderwerp: onderwerp || mailOnderwerp(bmMail, project, datum),
              tekst: tekst,
              bijlage: bijlage || undefined
            });
          })
          .then(function (uit) {
            knop.disabled = false;
            if (!uit || !uit.ok) {
              // De app heeft bij de database nagekeken of de functie hem
              // toch verstuurde (cloud.js); dit is dus echt niet gelukt.
              melding.textContent = 'Niet verstuurd: ' + ((uit && uit.fout) || 'onbekende fout') +
                '  — het project blijft dus op de oude status staan.';
              return;
            }
            var echtAan = (uit.aan && uit.aan.length) ? uit.aan : aan;
            // De mail is de bestelling: nu vastleggen, met de regels die in
            // de bijlage stonden (of, zonder bijlage, wat bestelbaar is).
            if (window.bestellingVastleggen) {
              if (bijlageGemaakt) { if (mailMoment) bestellingVastleggen(mailLijst, 'mail', mailMoment); }
              else if (zonderBijlageMoment) bestellingVastleggen(zonderBijlage, 'mail', zonderBijlageMoment);
            }
            sluitVenster(laag);
            if (window.renderProject) renderProject();
            if (window.renderTabel) renderTabel();
            if (window.renderBestellijst) renderBestellijst();
            if (window.logboekLaden) logboekLaden();
            if (window.appMelding) {
              appMelding((uit.nagekeken
                ? 'Het antwoord van de mailfunctie kwam niet aan, maar de database laat zien dat de ' +
                  'bestelmail wél verstuurd is, naar ' + echtAan.join(', ') + '. Niet opnieuw versturen.\n'
                : 'De bestelmail is verstuurd naar ' + echtAan.join(', ') + '.\n') +
                'Het project staat nu op "besteld" en de maten zijn vastgezet.',
                { kop: 'Verstuurd' });
            }
          }, function (e) {
            knop.disabled = false;
            if (e && e.gestopt) {
              sluitVenster(laag);
              if (window.appMelding) {
                appMelding('De bestelmail is niet verstuurd. Kijk het na en open de bestelmail daarna opnieuw.',
                  { kop: 'Gestopt' });
              }
              return;
            }
            melding.textContent = 'Niet verstuurd: ' + ((e && e.message) || 'onbekende fout');
          });
      };
    }, function () { mailVensterOpen = false; });
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
    // Alleen bij levering op het werkadres. De werkplaats kent de chauffeur;
    // daar is een foto van de plek geen ontbrekend gegeven (v94, gevraagd
    // door Jan). Niets gekozen geldt als werkplaats, net als op het scherm.
    if (!heeftFoto && i.leverAdres === 'werk') {
      mist.push({ wat: 'een foto van de leverlocatie', plek: 'lever' });
    }
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

  // Klant, adres en levering worden sinds v98 op Invoer ingevuld, niet meer
  // op Project info. 'Aanvullen' springt daarom naar het blok op Invoer:
  // het werkadres staat in het klantblok bovenaan, de rest onderaan.
  function naarLeverblok(plek) {
    if (window.naarInvoerBlok) { naarInvoerBlok(plek === 'adres' ? 'klant' : 'lever'); return; }
    if (window.gaNaarTab) gaNaarTab('invoer');
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

  // Loopt er een export (pdf maken, opslagvenster, delen, de vraag erna)?
  // Dan wacht het bewerkslot met vrijgeven tot hij klaar is (v106): anders
  // ging het project op slot terwijl iemand in het deelvenster stond, en kon
  // hij daarna "Ja, verstuurd" niet meer vastleggen.
  var exportTeller = 0;
  var exportSinds = 0;
  // Hooguit 10 minuten: een deelvenster op iOS dat nooit antwoordt, mag het
  // overnemen niet voor altijd tegenhouden (beoordeling v106).
  window.glasExportBezig = function () { return exportTeller > 0 && Date.now() - exportSinds < 10 * 60 * 1000; };
  function exportVerder(wat) {
    // Een export die al 10 minuten "loopt", hangt: niet meer meetellen.
    if (exportTeller && Date.now() - exportSinds >= 10 * 60 * 1000) exportTeller = 0;
    if (!exportTeller) exportSinds = Date.now();
    exportTeller++;
    var klaar = function () { exportTeller = Math.max(0, exportTeller - 1); };
    var p;
    try { p = exportVerderNu(wat); } catch (e) { klaar(); throw e; }
    return Promise.resolve(p).then(function (x) { klaar(); return x; }, function (e) { klaar(); throw e; });
  }

  function exportVerderNu(wat) {
    var project = (document.getElementById('projectNaam') || {}).value || 'Glasopname';
    var datum = (document.getElementById('projectDatum') || {}).value || '';

    if (wat === 'alles') {
      // v105: ook hier eerst de vragen, dan pas de mapkeuze. Na Stoppen
      // wordt er niets opgeslagen (ook de foto-pdf niet), zodat niemand
      // denkt dat de bestellijst erbij zit (beoordeling).
      return voorControles(bestelModus()).then(function (k) {
        if (k !== 'door') { bezig(''); return { gestopt: true }; }
        return Promise.resolve(mapVragen()).then(function (keuze) { return { keuze: keuze }; });
      }).then(function (stap) {
        if (stap.gestopt) return;
        var keuze = stap.keuze;
        if (keuze && keuze.afgebroken) { bezig(''); return; }
        return bouwBestellijstVerder().then(function (a) {
          return bouwFotoPdf().then(function (b) {
            var stukken = [a, b].filter(Boolean);
            if (!stukken.length) { bezig(''); return; }
            return leverMeerdere(stukken, keuze && keuze.map).then(function (uit) {
              if (uit !== 'afgebroken' && a) return vraagVerstuurd(a.lijst, a.moment);
            });
          });
        });
      }).catch(mislukt);
    }

    if (wat === 'bestellijst') {
      // v105 (beoordeling): eerst de vragen ("Oudere stand?", "Laten
      // annuleren?"), dan pas het opslagvenster van de pc. Anders koos je een
      // bestandsnaam en las je daarna pas dat er iets niet klopte. De klik op
      // het antwoord telt als handeling van de gebruiker, dus het venster mag
      // daarna nog open.
      return voorControles(bestelModus()).then(function (k) {
        if (k !== 'door') { bezig(''); return; }
        var bestandB = bestandVragen(bestellijstNaam(project, datum));
        return bouwBestellijstVerder().then(function (res) {
          if (!res) { bezig(''); return; }
          return afleveren(res.doc, res.naam, bestandB).then(function (uit) {
            // Alleen een bestellijst die echt is opgeslagen of gedeeld (v104).
            if (uit !== 'afgebroken') return vraagVerstuurd(res.lijst, res.moment);
          });
        });
      }).catch(mislukt);
    }

    // De foto-pdf (de bestellijst gaat hierboven, v105).
    var naam = maakNaam('Inmeting', project, datum);
    var bestand = bestandVragen(naam);
    return bouwFotoPdf().then(function (res) {
      if (!res) { bezig(''); return; }
      return afleveren(res.doc, res.naam, bestand);
    }).catch(mislukt);
  }

  function mislukt(e) {
    console.error('[pdf]', e);
    bezig('');
    appFout('Pdf maken mislukt: ' + e.message);
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
              if (e && (e.name === 'AbortError' || /abort|cancel/i.test(e.message || ''))) return 'afgebroken';
              return naElkaarDownloaden(stukken);
            });
        }
      } catch (e) {}
    }

    return naElkaarDownloaden(stukken);
  }

  // Safari (en soms ook andere browsers) laat van downloads die in één
  // klap achter elkaar starten er maar één door: de laatste. Bij 'alles'
  // bleef daardoor alleen de inmeting over en viel de bestellijst met de
  // leverpagina weg. Daarom één voor één, met een korte pauze ertussen.
  var DOWNLOAD_PAUZE = 1500;   // ms
  function naElkaarDownloaden(stukken) {
    return stukken.reduce(function (rij, s, i) {
      return rij.then(function () {
        if (i === 0) return;
        return new Promise(function (ok) { setTimeout(ok, DOWNLOAD_PAUZE); });
      }).then(function () {
        s.doc.save(s.naam);
      });
    }, Promise.resolve()).then(function () { bezig(''); });
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

  // Telefoon of tablet? Niet alleen aan het aanraakscherm herkennen: veel
  // Windows-laptops hebben er een, en die horen het opslagvenster te
  // krijgen, niet het deelvenster (v104). Zie glasMobiel in index.html.
  function isAanraakapparaat() {
    return window.glasMobiel ? glasMobiel() : (navigator.maxTouchPoints || 0) > 1;
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
      if (keuze && keuze.afgebroken) { bezig(''); return 'afgebroken'; }

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
                          /abort|cancel/i.test(e.message || ''))) return 'afgebroken';
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
