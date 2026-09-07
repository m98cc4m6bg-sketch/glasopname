/* ═══════════════════════════════════════════════════════════════
   Glasopname – importeren
   Leest sponningmaten uit een PDF, XLSX/XLS, CSV of geplakte tekst
   en zet ze als rijen in de huidige opname. Altijd met een
   voorbeeldweergave en een controleerbare kolomkoppeling: er komt
   nooit iets in de lijst dat je niet eerst gezien hebt.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  var PDF_URL  = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  var PDF_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  // Velden waar een kolom naartoe kan. Volgorde = volgorde in de keuzelijst.
  var VELDEN = [
    ['',            '— niet gebruiken —'],
    ['aantal',      'Aantal'],
    ['merk',        'Merk / kozijn'],
    ['breedte',     'Breedte'],
    ['hoogte',      'Hoogte'],
    ['glasType',    'Glas type'],
    ['opbouw',      'Opbouw'],
    ['maxPakket',   'Max glaspakket'],
    ['opmerking',   'Opmerking']
  ];

  // Woorden waarop een kolomkop herkend wordt (kleine letters, zonder leestekens).
  var HERKEN = [
    ['aantal',    ['aantal', 'stuks', 'stk', 'qty']],
    ['merk',      ['merk', 'kozijn', 'ruit', 'nr', 'nummer', 'code']],
    ['breedte',   ['breedte', 'breed', 'b mm', 'bxh', 'width']],
    ['hoogte',    ['hoogte', 'hoog', 'h mm', 'height']],
    ['glasType',  ['glastype', 'glas type', 'soort', 'type glas']],
    ['opbouw',    ['opbouw', 'samenstelling', 'spouw']],
    ['maxPakket', ['max glaspakket', 'glaspakket', 'maxpakket', 'max dikte', 'pakket']],
    ['opmerking', ['opmerking', 'notitie', 'bijzonderheden', 'omschrijving', 'toelichting']]
  ];

  var tabel = null;    // { kop: [..], rijen: [[..]] }
  var mapping = [];    // per kolom een veldnaam of ''

  /* ─── bibliotheken pas laden als ze nodig zijn ─────────────── */

  function laadScript(url) {
    return new Promise(function (ok, fout) {
      if (document.querySelector('script[data-lazy="' + url + '"]')) { ok(); return; }
      var s = document.createElement('script');
      s.src = url;
      s.setAttribute('data-lazy', url);
      s.onload = ok;
      s.onerror = function () { fout(new Error('Kon ' + url + ' niet laden — is er internet?')); };
      document.head.appendChild(s);
    });
  }

  /* ─── tekst → getallen ─────────────────────────────────────── */

  function getal(v) {
    if (v === null || v === undefined) return '';
    var s = String(v).replace(/\s/g, '').replace(/mm$/i, '');
    // duizendtalscheiding weghalen: 1.500 en 1,500 zijn 1500, niet 1,5
    s = s.replace(/[.,](?=\d{3}(\D|$))/g, '');
    s = s.replace(',', '.');
    var m = s.match(/-?\d+(\.\d+)?/);
    if (!m) return '';
    return String(Math.round(parseFloat(m[0])));
  }

  // Voor het vergelijken van glastypes: plussen tellen mee, want
  // 'HR glas', 'HR+ glas' en 'HR++ glas' zijn drie verschillende dingen.
  function normType(s) {
    return String(s === null || s === undefined ? '' : s)
      .toLowerCase().replace(/[^a-z0-9+]/g, '').trim();
  }

  function schoon(s) {
    return String(s === null || s === undefined ? '' : s)
      .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ─── inlezen: geplakte tekst / CSV ────────────────────────── */

  function uitTekst(tekst) {
    var regels = tekst.split(/\r?\n/).filter(function (r) { return r.trim() !== ''; });
    if (!regels.length) return null;
    // scheidingsteken kiezen: tab, puntkomma of komma — wat het vaakst voorkomt
    var kandidaten = ['\t', ';', ','];
    var beste = '\t', hoogste = 0;
    kandidaten.forEach(function (c) {
      var n = regels[0].split(c).length;
      if (n > hoogste) { hoogste = n; beste = c; }
    });
    if (hoogste < 2) beste = /\s{2,}/;   // uitgelijnde kolommen met spaties
    return { rijen: regels.map(function (r) {
      return (typeof beste === 'string' ? r.split(beste) : r.split(beste))
        .map(function (c) { return c.trim(); });
    }) };
  }

  /* ─── inlezen: XLSX / XLS / CSV-bestand ────────────────────── */

  function uitWerkblad(file) {
    return laadScript(XLSX_URL).then(function () {
      return file.arrayBuffer();
    }).then(function (buf) {
      var wb = XLSX.read(buf, { type: 'array' });
      var ws = wb.Sheets[wb.SheetNames[0]];
      var rijen = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
      return { rijen: rijen.map(function (r) {
        return r.map(function (c) { return String(c === null || c === undefined ? '' : c).trim(); });
      }).filter(function (r) { return r.join('').trim() !== ''; }) };
    });
  }

  /* ─── inlezen: PDF ─────────────────────────────────────────── */
  // Woorden krijgen van pdf.js een x/y-positie mee. Alles op ongeveer
  // dezelfde hoogte is één regel; grote gaten in x zijn kolomgrenzen.

  function uitPdf(file) {
    return laadScript(PDF_URL).then(function () {
      var lib = window.pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
      return file.arrayBuffer().then(function (buf) {
        return lib.getDocument({ data: buf }).promise;
      });
    }).then(function (pdf) {
      var paginas = [];
      for (var i = 1; i <= pdf.numPages; i++) paginas.push(i);
      return Promise.all(paginas.map(function (n) {
        return pdf.getPage(n).then(function (p) { return p.getTextContent(); });
      }));
    }).then(function (inhoud) {
      var rijen = [];
      inhoud.forEach(function (c) {
        var perRegel = {};
        c.items.forEach(function (it) {
          if (!it.str || !it.str.trim()) return;
          var y = Math.round(it.transform[5] / 3) * 3;   // 3pt tolerantie
          (perRegel[y] = perRegel[y] || []).push({ x: it.transform[4], t: it.str.trim(), w: it.width || 0 });
        });
        Object.keys(perRegel)
          .sort(function (a, b) { return b - a; })       // van boven naar beneden
          .forEach(function (y) {
            var stukken = perRegel[y].sort(function (a, b) { return a.x - b.x; });
            var cellen = [], huidig = stukken[0].t, vorig = stukken[0];
            for (var i = 1; i < stukken.length; i++) {
              var gat = stukken[i].x - (vorig.x + vorig.w);
              if (gat > 6) { cellen.push(huidig); huidig = stukken[i].t; }
              else { huidig += ' ' + stukken[i].t; }
              vorig = stukken[i];
            }
            cellen.push(huidig);
            if (cellen.join('').trim() !== '') rijen.push(cellen);
          });
      });
      return { rijen: rijen };
    });
  }

  /* ─── kop herkennen en kolommen koppelen ───────────────────── */

  function bepaalKop(rijen) {
    var besteIndex = -1, besteScore = 0;
    for (var i = 0; i < Math.min(rijen.length, 15); i++) {
      var score = 0;
      rijen[i].forEach(function (cel) {
        var s = schoon(cel);
        if (!s) return;
        HERKEN.forEach(function (h) {
          if (h[1].some(function (w) { return s === w || s.indexOf(w) >= 0; })) score++;
        });
      });
      if (score > besteScore) { besteScore = score; besteIndex = i; }
    }
    return besteScore >= 2 ? besteIndex : -1;
  }

  function raadMapping(kop) {
    var gebruikt = {};
    return kop.map(function (cel) {
      var s = schoon(cel);
      var gevonden = '';
      HERKEN.forEach(function (h) {
        if (gevonden || gebruikt[h[0]]) return;
        if (h[1].some(function (w) { return s === w || (w.length > 3 && s.indexOf(w) >= 0); })) gevonden = h[0];
      });
      if (gevonden) gebruikt[gevonden] = true;
      return gevonden;
    });
  }

  /* ─── schermen ─────────────────────────────────────────────── */

  function toon() { document.getElementById('impVenster').style.display = 'flex'; }
  window.impSluit = function () { document.getElementById('impVenster').style.display = 'none'; };
  window.impOpen = function () {
    tabel = null;
    document.getElementById('impStap1').style.display = 'block';
    document.getElementById('impStap2').style.display = 'none';
    document.getElementById('impPlak').value = '';
    document.getElementById('impMelding').textContent = '';
    document.getElementById('impBestand').value = '';
    toon();
  };

  function melding(tekst, fout) {
    var m = document.getElementById('impMelding');
    m.textContent = tekst;
    m.style.color = fout ? 'var(--rood)' : 'var(--grijs-tekst)';
  }

  window.impBestandGekozen = function (input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var naam = file.name.toLowerCase();
    melding('Bezig met lezen van ' + file.name + '…');
    var lezer;
    if (naam.endsWith('.pdf')) lezer = uitPdf(file);
    else if (naam.endsWith('.xlsx') || naam.endsWith('.xls')) lezer = uitWerkblad(file);
    else if (naam.endsWith('.csv') || naam.endsWith('.txt')) lezer = file.text().then(uitTekst);
    else { melding('Onbekend bestandstype. Gebruik PDF, XLSX, XLS of CSV.', true); return; }

    lezer.then(function (res) {
      if (!res || !res.rijen.length) { melding('Geen tekst gevonden. Is het een gescande PDF?', true); return; }
      naarStap2(res.rijen);
    }).catch(function (e) {
      melding('Lezen mislukt: ' + e.message, true);
    });
  };

  window.impPlakVerwerken = function () {
    var res = uitTekst(document.getElementById('impPlak').value);
    if (!res || !res.rijen.length) { melding('Niets te lezen — plak eerst de tabel.', true); return; }
    naarStap2(res.rijen);
  };

  function naarStap2(rijen) {
    var kopIndex = bepaalKop(rijen);
    var kop, data;
    if (kopIndex >= 0) {
      kop = rijen[kopIndex];
      data = rijen.slice(kopIndex + 1);
    } else {
      var breedte = Math.max.apply(null, rijen.map(function (r) { return r.length; }));
      kop = [];
      for (var i = 0; i < breedte; i++) kop.push('Kolom ' + (i + 1));
      data = rijen;
    }
    // rijen zonder enig getal zijn kopteksten of witregels
    data = data.filter(function (r) { return r.some(function (c) { return /\d/.test(c); }); });
    if (!data.length) { melding('Kolommen gevonden, maar geen rijen met maten.', true); return; }

    tabel = { kop: kop, rijen: data };
    mapping = kopIndex >= 0 ? raadMapping(kop) : kop.map(function () { return ''; });
    tekenStap2();
    document.getElementById('impStap1').style.display = 'none';
    document.getElementById('impStap2').style.display = 'block';
  }

  window.impMapWijzig = function (index, waarde) {
    mapping[index] = waarde;
    tekenStap2();
  };

  function gemapteRijen() {
    return tabel.rijen.map(function (r) {
      var o = {};
      mapping.forEach(function (veld, i) {
        if (!veld) return;
        var v = (r[i] === undefined ? '' : String(r[i])).trim();
        if (veld === 'breedte' || veld === 'hoogte' || veld === 'aantal' || veld === 'maxPakket') v = getal(v);
        if (v !== '') o[veld] = v;
      });
      return o;
    }).filter(function (o) { return o.breedte || o.hoogte; });
  }

  function tekenStap2() {
    var opties = VELDEN.map(function (v) { return v; });
    var kopHtml = tabel.kop.map(function (cel, i) {
      return '<th><div class="imp-kolomnaam">' + (cel || '—') + '</div>' +
             '<select onchange="impMapWijzig(' + i + ', this.value)">' +
             opties.map(function (v) {
               return '<option value="' + v[0] + '"' + (mapping[i] === v[0] ? ' selected' : '') + '>' + v[1] + '</option>';
             }).join('') + '</select></th>';
    }).join('');

    var voorbeeld = tabel.rijen.slice(0, 8).map(function (r) {
      return '<tr>' + tabel.kop.map(function (_, i) {
        return '<td' + (mapping[i] ? ' class="imp-actief"' : '') + '>' + ((r[i] === undefined ? '' : r[i])) + '</td>';
      }).join('') + '</tr>';
    }).join('');

    document.getElementById('impVoorbeeld').innerHTML =
      '<table class="imp-tabel"><thead><tr>' + kopHtml + '</tr></thead><tbody>' + voorbeeld + '</tbody></table>';

    var n = gemapteRijen().length;
    var mistBreedte = mapping.indexOf('breedte') < 0;
    var mistHoogte = mapping.indexOf('hoogte') < 0;
    var waarschuwing = '';
    if (mistBreedte || mistHoogte) {
      waarschuwing = 'Koppel eerst een kolom aan ' +
        (mistBreedte && mistHoogte ? 'Breedte en Hoogte' : (mistBreedte ? 'Breedte' : 'Hoogte')) + '.';
    }
    document.getElementById('impTelling').textContent = waarschuwing ||
      (n + ' rij' + (n === 1 ? '' : 'en') + ' klaar om over te nemen' +
       (tabel.rijen.length > n ? ' (' + (tabel.rijen.length - n) + ' overgeslagen: geen maat)' : ''));
    document.getElementById('impToevoegen').disabled = !!waarschuwing || n === 0;
    document.getElementById('impVervangen').disabled = !!waarschuwing || n === 0;
  }

  /* ─── overnemen in de opname ───────────────────────────────── */

  function bouwRijen() {
    return gemapteRijen().map(function (o) {
      var r = nieuweRij();
      r.maatsoort = document.getElementById('impMaatsoort').value;
      if (o.aantal)    r.aantal = o.aantal;
      if (o.merk)      r.merk = o.merk;
      if (o.breedte)   r.breedte = o.breedte;
      if (o.hoogte)    r.hoogte = o.hoogte;
      if (o.opmerking) r.opmerking = o.opmerking;

      // Glastype en opbouw alleen overnemen als ze in de keuzelijsten bestaan,
      // anders belanden ze in de opmerking en kies je ze zelf.
      var onbekend = [];
      if (o.glasType) {
        var type = Object.keys(DATA.opbouw_per_type).find(function (t) {
          return normType(t) === normType(o.glasType);
        });
        if (type) {
          r.glasType = type;
          if (o.opbouw && DATA.opbouw_per_type[type].indexOf(o.opbouw) >= 0) r.opbouw = o.opbouw;
          else if (o.opbouw) onbekend.push('opbouw ' + o.opbouw);
        } else {
          onbekend.push('glas ' + o.glasType + (o.opbouw ? ' ' + o.opbouw : ''));
        }
      } else if (o.opbouw) {
        onbekend.push('opbouw ' + o.opbouw);
      }
      if (o.maxPakket) {
        r.maxPakket = o.maxPakket;
        onbekend.push('max pakket ' + o.maxPakket + ' mm');
      }
      if (onbekend.length) {
        r.opmerking = (r.opmerking ? r.opmerking + ' — ' : '') + onbekend.join(', ');
      }
      return r;
    });
  }

  window.impToevoegen = function () {
    var nieuw = bouwRijen();
    // lege rijen aan het eind opruimen, anders staan er gaten in de lijst
    while (rijen.length && !rijen[rijen.length - 1].breedte && !rijen[rijen.length - 1].hoogte &&
           !rijen[rijen.length - 1].glasType && !rijen[rijen.length - 1].merk) {
      rijen.pop();
    }
    rijen = rijen.concat(nieuw);
    afronden(nieuw.length + ' rijen toegevoegd');
  };

  window.impVervangen = function () {
    if (!confirm('Alle huidige rijen vervangen door de geïmporteerde rijen?')) return;
    var nieuw = bouwRijen();
    rijen = nieuw;
    afronden(nieuw.length + ' rijen ingelezen');
  };

  function afronden(tekst) {
    renderTabel();
    herbereken();
    opslaan();
    window.impSluit();
    var s = document.getElementById('statusBar');
    if (s) s.textContent = tekst;
  }

  /* ─── knop en venster in de pagina zetten ──────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    var knop = document.createElement('button');
    knop.className = 'btn btn-secondary btn-sm';
    knop.textContent = '📄 Importeren';
    knop.onclick = window.impOpen;
    var acties = document.querySelector('.header-actions');
    if (acties) acties.insertBefore(knop, acties.firstChild.nextSibling);
  });
})();
