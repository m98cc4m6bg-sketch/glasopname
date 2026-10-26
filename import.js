/* ═══════════════════════════════════════════════════════════════
   Glasopname – importeren
   Leest sponningmaten uit een PDF, XLSX/XLS, CSV of geplakte tekst
   en zet ze als rijen in de huidige opname. Altijd met een
   voorbeeldweergave en een controleerbare kolomkoppeling: er komt
   nooit iets in de lijst dat je niet eerst gezien hebt.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Uit de repo (v91), zodat ze in de cache van de service worker staan.
  var XLSX_URL = 'lib/xlsx-0.18.5/xlsx.full.min.js';
  var PDF_URL  = 'lib/pdfjs-3.11.174/pdf.min.js';
  var PDF_WORKER = 'lib/pdfjs-3.11.174/pdf.worker.min.js';

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
    ['opmerking',   'Opmerking'],
    // v120: per regel, als het bestand het zegt (bijv. een eigen export
    // terug inlezen). Anders geldt de keuze "Deze maten zijn" voor alles.
    ['maatsoort',   'Maatsoort (per regel)']
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
    ['opmerking', ['opmerking', 'notitie', 'bijzonderheden', 'omschrijving', 'toelichting']],
    ['maatsoort', ['maatsoort', 'maat soort', 'soort maat']]
  ];

  // v120: hoe goed past een kolomkop bij een trefwoord. 3 = precies, 2 = als
  // los woord ("breedte mm"), 1 = als begin of eind van een samengesteld
  // woord ("glasbreedte", "merknr"). Tot v119 telde elk stukje tekst, en
  // werd "Opmerking" gelezen als Merk (op-MERK-ing) en "Maatsoort" als
  // Glas type (maat-SOORT), omdat de eerste treffer won.
  function kopScore(s, w) {
    if (!s) return 0;
    if (s === w) return 3;
    if ((' ' + s + ' ').indexOf(' ' + w + ' ') >= 0) return 2;
    if (w.length > 3 && w.indexOf(' ') < 0 && s.split(' ').some(function (d) {
      return d.length > w.length && (d.indexOf(w) === 0 || d.slice(-w.length) === w);
    })) return 1;
    return 0;
  }
  function veldScore(s, h) {
    return h[1].reduce(function (m, w) { return Math.max(m, kopScore(s, w)); }, 0);
  }

  var tabel = null;    // { kop: [..], rijen: [[..]] }
  var mapping = [];    // per kolom een veldnaam of ''
  // Waar komt dit vandaan, en hoe is het gelezen? Alleen om te melden en om
  // in het logboek te zetten (v89).
  var bron = { naam: '', soort: '', scheiding: '', blad: '' };
  var bladen = null;   // de tabbladen van een werkblad, als er meer zijn
  var beoordeeld = null;  // uitkomst van beoordeel(): { goed: [], fout: [] }

  /* ─── bibliotheken pas laden als ze nodig zijn ─────────────── */

  // Eén belofte per bibliotheek; een mislukte poging wordt opgeruimd. Tot
  // v90 bleef na één mislukte keer het importeren kapot tot je herlaadde
  // ("Cannot read properties of undefined"), en kon een tweede aanroep
  // tijdens het laden al doorgaan voordat de bibliotheek er was (v91).
  var geladen = {};
  function laadScript(url) {
    // Al aanwezig (eerder geladen, of door een testreeks klaargezet).
    if ((url === XLSX_URL && window.XLSX) || (url === PDF_URL && window.pdfjsLib)) return Promise.resolve();
    if (geladen[url]) return geladen[url];
    geladen[url] = new Promise(function (ok, fout) {
      var s = document.createElement('script');
      s.src = url;
      s.setAttribute('data-lazy', url);
      s.onload = function () { ok(); };
      s.onerror = function () {
        delete geladen[url];
        if (s.parentNode) s.parentNode.removeChild(s);
        fout(new Error('Kon ' + url + ' niet laden — probeer het nog eens'));
      };
      document.head.appendChild(s);
    });
    return geladen[url];
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
  // Vanaf v89 met aanhalingstekens. Daarvoor werd er plat gesplitst, en dan
  // schoof een regel als
  //     A;"let op; buitenzijde";800;1400
  // één kolom op: 800 belandde in de hoogte en de breedte bleef leeg. Dat
  // zag niemand. Een CSV-lezer die aanhalingstekens kent is de enige manier
  // om dat uit te sluiten.

  // Een aanhalingsteken dat nooit gesloten wordt — een ditto-teken " voor
  // 'idem', of een maat als 12" — slokte tot v90 de rest van het bestand
  // op: alle regels erna verdwenen in één cel, zonder als geweigerd te
  // tellen (v91). Gebeurt dat, dan lezen we opnieuw en behandelen we dát
  // teken als gewone tekst. De regel komt dan gewoon in het controlescherm.
  function csvLees(tekst, scheiding, letterlijk) {
    letterlijk = letterlijk || {};
    var rijen = [], rij = [], cel = '', inAanhaling = false, begin = -1;
    var t = String(tekst).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (inAanhaling) {
        if (c === '"') {
          if (t[i + 1] === '"') { cel += '"'; i++; }   // "" is één aanhalingsteken
          else inAanhaling = false;
        } else cel += c;
        continue;
      }
      if (c === '"' && cel.trim() === '' && !letterlijk[i]) { inAanhaling = true; begin = i; cel = ''; continue; }
      if (c === scheiding) { rij.push(cel); cel = ''; continue; }
      if (c === '\n') { rij.push(cel); rijen.push(rij); rij = []; cel = ''; continue; }
      cel += c;
    }
    if (inAanhaling && begin >= 0 && !letterlijk[begin]) {
      letterlijk[begin] = true;
      return csvLees(tekst, scheiding, letterlijk);
    }
    if (cel !== '' || rij.length) { rij.push(cel); rijen.push(rij); }
    return rijen.map(function (r) { return r.map(function (x) { return String(x).trim(); }); })
                .filter(function (r) { return r.join('').trim() !== ''; });
  }

  // Welk scheidingsteken? Niet naar de eerste regel kijken (die kan een
  // titelregel zijn), maar naar welk teken de regels het meest gelijk
  // verdeelt: een echte tabel heeft in bijna elke regel evenveel cellen.
  function kiesScheiding(tekst) {
    var beste = null, besteScore = 0, besteKolommen = 1;
    [';', '\t', ',', '|'].forEach(function (sch) {
      var rijen = csvLees(tekst, sch).slice(0, 40);
      if (!rijen.length) return;
      var telling = {};
      rijen.forEach(function (r) { telling[r.length] = (telling[r.length] || 0) + 1; });
      var vaakste = 1, aantal = 0;
      Object.keys(telling).forEach(function (n) {
        if (telling[n] > aantal || (telling[n] === aantal && +n > vaakste)) {
          aantal = telling[n]; vaakste = +n;
        }
      });
      if (vaakste < 2) return;
      // Score: hoeveel regels passen bij het gewone aantal kolommen, en
      // hoeveel kolommen levert dat op.
      var score = (aantal / rijen.length) * 100 + vaakste;
      if (score > besteScore) { besteScore = score; beste = sch; besteKolommen = vaakste; }
    });
    return beste;
  }

  // Een csv uit de app zelf zet een apostrof vóór tekst die met = + - @
  // begint (anders voert Excel hem uit als formule). Bij inlezen weer weg.
  function geenFormuleApostrof(rij) {
    return Array.isArray(rij) ? rij.map(function (c) {
      return typeof c === 'string' && /^'[=+\-@]/.test(c) ? c.slice(1) : c;
    }) : rij;
  }

  function uitTekst(tekst) {
    // Een BOM die er via plakken of een andere weg nog voor staat, hoort
    // niet bij de eerste kolomnaam (anders herkent de app 'Merk' niet).
    tekst = String(tekst || '').replace(/^\uFEFF/, '');
    if (!tekst.trim()) return null;
    var sch = kiesScheiding(tekst);
    if (sch) return { rijen: csvLees(tekst, sch).map(geenFormuleApostrof), scheiding: sch };
    // Geen scheidingsteken te vinden: uitgelijnde kolommen met spaties.
    // Aanhalingstekens spelen dan geen rol.
    var regels = String(tekst).split(/\r?\n/).filter(function (r) { return r.trim() !== ''; });
    return { rijen: regels.map(function (r) {
      return r.split(/\s{2,}/).map(function (c) { return c.trim(); });
    }), scheiding: 'spaties' };
  }

  /* ─── inlezen: XLSX / XLS / CSV-bestand ────────────────────── */

  // Alle tabbladen inlezen, niet alleen het eerste. Zet de leverancier er
  // een voorblad voor, dan las de app tot v88 stilzwijgend het verkeerde
  // tabblad; nu kies je het zelf (v89).
  function uitWerkblad(file) {
    return laadScript(XLSX_URL).then(function () {
      return file.arrayBuffer();
    }).then(function (buf) {
      var wb = XLSX.read(buf, { type: 'array' });
      var bladen = [];
      wb.SheetNames.forEach(function (naam) {
        var ws = wb.Sheets[naam];
        if (!ws) return;
        var rijen = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' })
          .map(function (r) {
            return r.map(function (c) { return String(c === null || c === undefined ? '' : c).trim(); });
          })
          .filter(function (r) { return r.join('').trim() !== ''; });
        if (rijen.length) bladen.push({ naam: naam, rijen: rijen });
      });
      if (!bladen.length) return { rijen: [] };
      return { rijen: bladen[0].rijen, bladen: bladen, blad: bladen[0].naam };
    });
  }

  /* ─── inlezen: PDF ─────────────────────────────────────────── */
  // Woorden krijgen van pdf.js een x/y-positie mee. Alles op ongeveer
  // dezelfde hoogte is één regel; grote gaten in x zijn kolomgrenzen.

  // Ook de fotomodule gebruikt de pdf-lezer, om een kozijntekening om te
  // zetten naar een afbeelding.
  // isEvalSupported: false bij elke getDocument (v91): pdf.js 3.11 kan een
  // kwaadaardig pdf-bestand anders code laten uitvoeren (CVE-2024-4367).
  // Kozijntekeningen en lijsten komen van buiten, dus dit hoort aan.
  window.pdfBibliotheek = function () {
    return laadScript(PDF_URL).then(function () {
      var lib = window.pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
      return lib;
    });
  };

  function uitPdf(file) {
    return laadScript(PDF_URL).then(function () {
      var lib = window.pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
      return file.arrayBuffer().then(function (buf) {
        return lib.getDocument({ data: buf, isEvalSupported: false }).promise;
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
            // v123: per cel ook waar hij op de pagina staat (van–tot in x),
            // zodat naarStap2 hem onder de goede kolomkop kan zetten.
            var plekken = [], van = stukken[0].x;
            for (var i = 1; i < stukken.length; i++) {
              var gat = stukken[i].x - (vorig.x + vorig.w);
              if (gat > 6) {
                cellen.push(huidig); plekken.push([van, vorig.x + vorig.w]);
                huidig = stukken[i].t; van = stukken[i].x;
              }
              else { huidig += ' ' + stukken[i].t; }
              vorig = stukken[i];
            }
            cellen.push(huidig); plekken.push([van, vorig.x + vorig.w]);
            cellen.plek = plekken;
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
          if (veldScore(s, h) > 0) score++;
        });
      });
      if (score > besteScore) { besteScore = score; besteIndex = i; }
    }
    return besteScore >= 2 ? besteIndex : -1;
  }

  // v120: eerst de beste treffers koppelen (precies vóór los woord vóór
  // stukje), bij gelijke stand de kolom die het eerst komt. Zo wint
  // "Breedte invoer" van "Glasbreedte" en "Opmerking" van "Opmerking roeden".
  function raadMapping(kop) {
    var schoonKop = kop.map(schoon);
    // Een eigen export (v113+) heeft een kolom "Pakket" met het oordeel
    // ("past", "vlak met kozijn"); dat is geen max glaspakket.
    var eigenExport = schoonKop.indexOf('glaslat') >= 0 && schoonKop.indexOf('latzijde') >= 0;
    var kandidaten = [];
    schoonKop.forEach(function (s, i) {
      HERKEN.forEach(function (h, j) {
        if (eigenExport && h[0] === 'maxPakket' && s === 'pakket') return;
        var sc = veldScore(s, h);
        if (sc) kandidaten.push({ kolom: i, veld: h[0], score: sc, volg: j });
      });
    });
    kandidaten.sort(function (a, b) {
      return (b.score - a.score) || (a.kolom - b.kolom) || (a.volg - b.volg);
    });
    var uit = kop.map(function () { return ''; }), gebruikt = {};
    kandidaten.forEach(function (k) {
      if (uit[k.kolom] || gebruikt[k.veld]) return;
      uit[k.kolom] = k.veld;
      gebruikt[k.veld] = true;
    });
    return uit;
  }

  /* ─── schermen ─────────────────────────────────────────────── */

  function toon() { document.getElementById('impVenster').style.display = 'flex'; }
  window.impSluit = function () { document.getElementById('impVenster').style.display = 'none'; };
  window.impOpen = function () {
    tabel = null;
    beoordeeld = null;
    bladen = null;
    bron = { naam: '', soort: '', scheiding: '', blad: '' };
    document.getElementById('impStap1').style.display = 'block';
    document.getElementById('impStap2').style.display = 'none';
    if (document.getElementById('impStap3')) document.getElementById('impStap3').style.display = 'none';
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

  // Een tekstbestand lezen in de tekenset waarin het gemaakt is (v104).
  // Excel op Windows bewaart een csv niet in UTF-8 maar in Windows-1252
  // ('CSV (gescheiden door lijstscheidingsteken)'). Tot v103 las de app
  // alles als UTF-8: dan werd é een vraagteken-ruit (�), en × en ø in een
  // opmerking of merk gingen verloren. Nu:
  // - een BOM vooraan zegt het zelf (UTF-8, of UTF-16 bij 'Unicode-tekst');
  // - anders eerst UTF-8 strikt proberen; lukt dat niet, dan Windows-1252.
  function leesTekst(file) {
    var buf = file.arrayBuffer ? file.arrayBuffer()
      : new Promise(function (ok, fout) {
          var r = new FileReader();
          r.onload = function () { ok(r.result); };
          r.onerror = function () { fout(r.error || new Error('lezen mislukt')); };
          r.readAsArrayBuffer(file);
        });
    return buf.then(function (ab) { return decodeer(new Uint8Array(ab)); });
  }

  var CODERING_NAAM = { 'utf-8': 'UTF-8', 'utf-16le': 'Unicode (UTF-16)', 'utf-16be': 'Unicode (UTF-16)',
                        'windows-1252': 'Windows (Excel op Windows)', 'macintosh': 'Mac (Excel voor Mac)' };

  // Windows-1252 zelf omzetten (v104). De browser doet dat ook, maar Chromium
  // leest een byte uit 80–9F op een bepaalde plek soms als stuurteken in
  // plaats van als €, ‘ of – (gevonden bij de beoordeling). Met een eigen
  // tabel van 32 tekens maakt dat niet meer uit.
  var CP1252 = [0x20AC, 0x81, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160,
                0x2039, 0x0152, 0x8D, 0x017D, 0x8F, 0x90, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022,
                0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x9D, 0x017E, 0x0178];
  function vanWindows(b) {
    var uit = [];
    for (var i = 0; i < b.length; i++) {
      var c = b[i];
      uit.push(String.fromCharCode(c >= 0x80 && c <= 0x9F ? CP1252[c - 0x80] : c));
    }
    return uit.join('');
  }

  // Windows (Excel op Windows) of Mac (Excel voor Mac, MacRoman)? Beslist
  // op de bytes zelf.
  // - Windows: de kleine accentletters à–ü (E0–FC, behalve F7 ÷) staan in
  //   een Nederlandse Windows-csv als één byte; in een Mac-csv vrijwel nooit.
  // - Mac: é, ë, ö enz. zijn 8E, 91, 9A (80–9F); zo'n byte telt als hij
  //   direct na een letter staat (in een woord: "Belgi‘" is "België").
  //   € – ‘ “ staan in Windows-tekst na een spatie; ’ … ” ™ (92, 85, 94, 99)
  //   ook na een letter (zo’n, enz…), die tellen daarom niet mee.
  //   Daarnaast de typografische tekens van de Mac: – — “ ” ‘ ’ … en de
  //   vaste spatie (D0–D5, C9, CA); in Windows zijn dat hoofdletters met
  //   een accent, die in Nederlandse tekst bijna niet voorkomen.
  function lijktMacRoman(b) {
    var mac = 0, win = 0;
    for (var i = 0; i < b.length; i++) {
      var c = b[i];
      if (c >= 0xE0 && c <= 0xFC && c !== 0xF7) { win++; continue; }
      if ((c >= 0xD0 && c <= 0xD5) || c === 0xC9 || c === 0xCA) { mac++; continue; }
      if (c < 0x80 || c > 0x9F || c === 0x85 || c === 0x92 || c === 0x94 || c === 0x99) continue;
      var v = i > 0 ? b[i - 1] : 0;
      var letterVoor = (v >= 0x41 && v <= 0x5A) || (v >= 0x61 && v <= 0x7A) || (v >= 0x80 && v <= 0x9F);
      if (letterVoor) mac++;
    }
    return mac > win;
  }

  function decodeer(b) {
    function met(codering, vanaf) {
      return { tekst: new TextDecoder(codering).decode(b.subarray(vanaf || 0)), codering: codering };
    }
    if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return met('utf-8', 3);
    if (b[0] === 0xFF && b[1] === 0xFE) return met('utf-16le', 2);
    if (b[0] === 0xFE && b[1] === 0xFF) return met('utf-16be', 2);
    // UTF-16 zonder BOM: om en om een nulbyte.
    if (b.length > 8) {
      var nul = 0;
      for (var i = 1; i < Math.min(b.length, 200); i += 2) if (b[i] === 0) nul++;
      if (nul > Math.min(b.length, 200) / 4) return met('utf-16le');
    }
    try {
      return { tekst: new TextDecoder('utf-8', { fatal: true }).decode(b), codering: 'utf-8' };
    } catch (e) {
      // Excel voor Mac bewaart een csv in MacRoman (v104, na de beoordeling).
      if (lijktMacRoman(b)) {
        try { return met('macintosh'); } catch (e2) {}
      }
      return { tekst: vanWindows(b), codering: 'windows-1252' };
    }
  }
  window.impDecodeer = decodeer;      // voor test-v104.js

  // Voor de Excel-export in index.html (v104): dezelfde SheetJS uit lib/.
  window.glasLaadXlsx = function () { return laadScript(XLSX_URL); };

  window.impBestandGekozen = function (input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var naam = file.name.toLowerCase();
    melding('Bezig met lezen van ' + file.name + '…');
    bron = { naam: file.name, soort: naam.replace(/^.*\./, ''), scheiding: '', blad: '' };
    var lezer;
    if (naam.endsWith('.pdf')) lezer = uitPdf(file);
    else if (naam.endsWith('.xlsx') || naam.endsWith('.xls')) lezer = uitWerkblad(file);
    else if (naam.endsWith('.csv') || naam.endsWith('.txt')) {
      lezer = leesTekst(file).then(function (t) {
        bron.codering = t.codering;
        return uitTekst(t.tekst);
      });
    }
    else { melding('Onbekend bestandstype. Gebruik PDF, XLSX, XLS of CSV.', true); return; }

    lezer.then(function (res) {
      if (!res || !res.rijen.length) { melding('Geen tekst gevonden. Is het een gescande PDF?', true); return; }
      bladen = res.bladen || null;
      bron.blad = res.blad || '';
      bron.scheiding = res.scheiding || '';
      naarStap2(res.rijen);
    }).catch(function (e) {
      melding('Lezen mislukt: ' + e.message, true);
    });
  };

  window.impPlakVerwerken = function () {
    var res = uitTekst(document.getElementById('impPlak').value);
    if (!res || !res.rijen.length) { melding('Niets te lezen — plak eerst de tabel.', true); return; }
    bron = { naam: 'geplakte tekst', soort: 'tekst', scheiding: res.scheiding || '', blad: '' };
    bladen = null;
    naarStap2(res.rijen);
  };

  // Een ander tabblad van hetzelfde werkblad kiezen.
  window.impBladKiezen = function (naam) {
    if (!bladen) return;
    var blad = bladen.find(function (b) { return b.naam === naam; });
    if (!blad) return;
    bron.blad = naam;
    naarStap2(blad.rijen);
  };

  // v123 (controle v90): in een pdf is een lege cel gewoon niets op de
  // pagina. Tot v122 schoof de rest van de regel dan naar links, en kwam
  // bijvoorbeeld de hoogte onder "Breedte" te staan. Nu gaat elke cel naar
  // de kolomkop waar hij onder staat: de grens tussen twee kolommen ligt
  // midden tussen hun koppen.
  // Komen twee cellen onder dezelfde kop (twee koppen die in de pdf aan
  // elkaar vastzitten, of een kolom zonder kop), dan is niet zeker wat waar
  // hoort. Samenvoegen mag dan niet: "2 1000" leest als 21000 (spaties in een
  // maat tellen niet; gevonden bij de controle van v123). Zo'n regel blijft
  // zoals hij was en krijgt het merkteken `verschoven`: stap 3 weigert hem
  // dan, met de tekst uit het bestand erbij. Zo komt een maat nooit stil in
  // de verkeerde kolom.
  function opKolom(rij, kopPlek) {
    if (!rij.plek || !kopPlek || !kopPlek.length) return rij;
    var grenzen = [];
    for (var j = 0; j < kopPlek.length - 1; j++) grenzen.push((kopPlek[j][1] + kopPlek[j + 1][0]) / 2);
    var uit = kopPlek.map(function () { return ''; });
    var dubbel = false;
    rij.forEach(function (cel, i) {
      var p = rij.plek[i];
      if (!p) { dubbel = true; return; }
      var midden = (p[0] + p[1]) / 2, k = 0;
      while (k < grenzen.length && midden >= grenzen[k]) k++;
      if (uit[k] !== '') dubbel = true;
      uit[k] = cel;
    });
    if (dubbel) {
      var zelfde = rij.slice();
      zelfde.verschoven = true;
      return zelfde;
    }
    return uit;
  }

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
    if (kop.plek) data = data.map(function (r) { return opKolom(r, kop.plek); });
    // Rijen zonder enig getal zijn meestal kopteksten of witregels. v123
    // (controle v90): een regel met tekst maar zonder getal ("A; n.t.b.;
    // n.t.b.") verdween stil. Een maatstaat is de waarheid: zo'n regel gaat
    // nog steeds niet mee (er is geen maat), maar stap 3 noemt hem nu.
    // Een kopregel die op elke pagina van een pdf terugkomt, is geen ruit.
    var kopTekst = kop.map(function (c) { return String(c == null ? '' : c).trim().toLowerCase(); }).join('|');
    var zonderGetal = data.filter(function (r) {
      return !r.some(function (c) { return /\d/.test(c); }) &&
              r.some(function (c) { return String(c == null ? '' : c).trim() !== ''; }) &&
              r.map(function (c) { return String(c == null ? '' : c).trim().toLowerCase(); }).join('|') !== kopTekst;
    });
    data = data.filter(function (r) { return r.some(function (c) { return /\d/.test(c); }); });
    if (!data.length) {
      melding('Kolommen gevonden, maar geen rijen met maten' +
        (zonderGetal.length ? ' (' + zonderGetal.length + ' regel' + (zonderGetal.length === 1 ? '' : 's') +
          ' met alleen tekst, bijv. «' + zonderGetal[0].join(' | ').slice(0, 60) + '»)' : '') + '.', true);
      return;
    }

    tabel = { kop: kop, rijen: data, zonderGetal: zonderGetal };
    mapping = kopIndex >= 0 ? raadMapping(kop) : kop.map(function () { return ''; });
    tekenStap2();
    document.getElementById('impStap1').style.display = 'none';
    document.getElementById('impStap2').style.display = 'block';
  }

  window.impMapWijzig = function (index, waarde) {
    // Hetzelfde veld bij een andere kolom loslaten. Bleef dat staan, dan
    // won per rij de laatste gevulde kolom en kreeg je een mengsel van
    // twee breedtekolommen, zonder dat iets dat liet zien (v83).
    if (waarde) {
      mapping = mapping.map(function (v, i) { return (i !== index && v === waarde) ? '' : v; });
    }
    mapping[index] = waarde;
    tekenStap2();
  };

  /* ─── per rij beoordelen ───────────────────────────────────── */
  // Niets gaat stilzwijgend. Een maat die niet precies over te nemen is,
  // of een regel die niet bij de kop past, wordt niet geïmporteerd maar
  // apart gemeld — met de oorspronkelijke tekst erbij (v89). Er wordt
  // níet beoordeeld of een maat "logisch" is: het bestand is de waarheid.

  function maatLees(ruw) {
    var s = String(ruw === undefined || ruw === null ? '' : ruw).trim();
    if (s === '') return { leeg: true };
    var t = s.replace(/\s+/g, '').replace(/mm\.?$/i, '');
    // Duizendtalscheiding: precies drie cijfers achter de punt of komma.
    var duizend = /^(-?\d{1,3})[.,](\d{3})$/.exec(t);
    if (duizend) t = duizend[1] + duizend[2];
    if (!/^-?\d+([.,]\d+)?$/.test(t)) return { fout: '«' + s + '» is geen maat' };
    var n = parseFloat(t.replace(',', '.'));
    if (!isFinite(n)) return { fout: '«' + s + '» is geen maat' };
    if (Math.round(n) !== n) return { fout: '«' + s + '» is geen heel aantal millimeters' };
    if (n <= 0) return { fout: '«' + s + '» is niet groter dan nul' };
    return { waarde: String(n), ruw: s };
  }

  function aantalLees(ruw) {
    var s = String(ruw === undefined || ruw === null ? '' : ruw).trim();
    if (s === '') return { leeg: true };
    var m = /^(\d+)\s*(x|st|stk|stuk|stuks)?\.?$/i.exec(s.replace(/\s+/g, ' '));
    if (!m) return { fout: 'aantal «' + s + '» is niet te lezen' };
    var n = parseInt(m[1], 10);
    if (!(n > 0)) return { fout: 'aantal «' + s + '» is niet groter dan nul' };
    return { waarde: String(n), ruw: s };
  }

  // v120: het max glaspakket mag een halve mm of tekst hebben ("27,5",
  // "max 26 mm"). Eén getal erin: naar beneden afgerond (veilig: kleiner
  // max = eerder een waarschuwing). Tot v119 verdween zo'n waarde stil.
  // Niet te lezen ("past", "26/28"): in stap 3 gemeld, niet overgenomen.
  function pakketLees(ruw) {
    var s = String(ruw === undefined || ruw === null ? '' : ruw).trim();
    var getallen = s.match(/\d+(?:[.,]\d+)?/g) || [];
    if (getallen.length !== 1) return {};
    var n = Math.floor(parseFloat(getallen[0].replace(',', '.')));
    return n > 0 && n < 200 ? { waarde: String(n) } : {};
  }

  // v120: een maatsoort uit het bestand, alleen als die in de keuzelijst staat.
  function maatsoortLees(ruw) {
    var s = schoon(ruw);
    if (!s) return '';
    var lijst = Array.prototype.slice.call(document.getElementById('impMaatsoort').options)
      .map(function (o) { return o.value; });
    return lijst.find(function (m) {
      var k = schoon(m);
      return k === s || k.split(' ')[0] === s.split(' ')[0] ||
             (s.length >= 3 && k.indexOf(s) === 0);
    }) || '';
  }

  function cel(r, i) { return i < 0 || r[i] === undefined ? '' : String(r[i]).trim(); }
  function kolomVan(veld) { return mapping.indexOf(veld); }

  // Eén cel kan '1200 x 600' bevatten; dan zitten er twee maten in.
  function paarLees(tekst) {
    var m = String(tekst).match(/^\s*(.+?)\s*[x×*]\s*(.+?)\s*$/);
    if (!m) return null;
    var a = maatLees(m[1]), b = maatLees(m[2]);
    if (a.waarde && b.waarde) return { breedte: a, hoogte: b };
    return null;
  }

  function beoordeel() {
    var uit = { goed: [], fout: [], leeg: 0, kopAantal: tabel.kop.length };
    var iB = kolomVan('breedte'), iH = kolomVan('hoogte');

    tabel.rijen.forEach(function (r, n) {
      var regel = { nr: n + 1, ruw: r, redenen: [], waarden: {}, tekst: {} };

      // Meer cellen dan de kop: hier is iets verschoven. Dat is precies de
      // fout die een aanhalingsteken met een scheidingsteken erin maakte.
      // v120: lege cellen aan het eind tellen niet (Excel en een csv met
      // ";;;" achteraan); tot v119 werd zo'n regel geweigerd.
      var gevuld = r.length;
      while (gevuld > 0 && String(r[gevuld - 1] === undefined || r[gevuld - 1] === null ? '' : r[gevuld - 1]).trim() === '') gevuld--;
      if (gevuld > tabel.kop.length) {
        regel.redenen.push('deze regel heeft ' + gevuld + ' cellen, de kop ' +
                           tabel.kop.length + ' — mogelijk verschoven');
      } else if (r.verschoven) {
        // v123: uit een pdf, en twee waarden staan onder dezelfde kolomkop.
        regel.redenen.push('in de pdf staan twee waarden onder dezelfde kolomkop — mogelijk verschoven');
      }

      var breedteTekst = cel(r, iB), hoogteTekst = cel(r, iH);
      var b = maatLees(breedteTekst), h = maatLees(hoogteTekst);

      // '1200 x 600' in de breedtekolom, zonder eigen hoogtekolom.
      if (b.fout || b.leeg) {
        var paar = breedteTekst ? paarLees(breedteTekst) : null;
        if (paar && (iH < 0 || !hoogteTekst)) { b = paar.breedte; h = paar.hoogte; }
      }
      if ((h.fout || h.leeg) && hoogteTekst) {
        var paarH = paarLees(hoogteTekst);
        if (paarH) h = paarH.hoogte;
      }

      // Een regel zonder enige maat is een tussenkop of een totaalregel.
      if (b.leeg && h.leeg && !regel.redenen.length) { uit.leeg++; return; }

      if (b.fout) regel.redenen.push('breedte: ' + b.fout);
      else if (b.leeg) regel.redenen.push('geen breedte');
      if (h.fout) regel.redenen.push('hoogte: ' + h.fout);
      else if (h.leeg) regel.redenen.push('geen hoogte');

      var a = aantalLees(cel(r, kolomVan('aantal')));
      if (a.fout) regel.redenen.push(a.fout);

      if (regel.redenen.length) { uit.fout.push(regel); return; }

      regel.waarden.breedte = b.waarde;
      regel.waarden.hoogte = h.waarde;
      regel.waarden.aantal = a.waarde || '1';
      regel.tekst.breedte = b.ruw;
      regel.tekst.hoogte = h.ruw;
      regel.tekst.aantal = a.ruw || '';
      ['merk', 'glasType', 'opbouw', 'maxPakket', 'opmerking', 'maatsoort'].forEach(function (veld) {
        var v = cel(r, kolomVan(veld));
        if (!v) return;
        if (veld === 'maxPakket') {
          var mp = pakketLees(v);
          if (mp.waarde) regel.waarden.maxPakket = mp.waarde;
          if (mp.waarde !== v) regel.tekst.maxPakket = v;
          if (!mp.waarde) regel.tekst.maxPakketOnbekend = v;
          return;
        }
        if (veld === 'maatsoort') {
          var ms = maatsoortLees(v);
          if (ms) regel.waarden.maatsoort = ms;
          else regel.tekst.maatsoortOnbekend = v;
          return;
        }
        regel.waarden[veld] = v;
      });
      uit.goed.push(regel);
    });

    return uit;
  }

  // De waardenlijst zoals de rest van de module hem verwacht.
  function gemapteRijen() {
    if (!tabel) return [];
    return beoordeel().goed.map(function (regel) { return regel.waarden; });
  }

  function tekenStap2() {
    var opties = VELDEN.map(function (v) { return v; });
    var kopHtml = tabel.kop.map(function (cel, i) {
      // Alles uit het bestand gaat ge-escapet het scherm op: een cel met
      // '<…>' brak anders de weergave, of draaide zelfs code in een
      // ingelogde sessie (v91). Stap 3 deed dit al.
      return '<th><div class="imp-kolomnaam">' + esc2(cel || '—') + '</div>' +
             '<select onchange="impMapWijzig(' + i + ', this.value)">' +
             opties.map(function (v) {
               return '<option value="' + v[0] + '"' + (mapping[i] === v[0] ? ' selected' : '') + '>' + v[1] + '</option>';
             }).join('') + '</select></th>';
    }).join('');

    var voorbeeld = tabel.rijen.slice(0, 8).map(function (r) {
      return '<tr>' + tabel.kop.map(function (_, i) {
        return '<td' + (mapping[i] ? ' class="imp-actief"' : '') + '>' + esc2(r[i] === undefined ? '' : r[i]) + '</td>';
      }).join('') + '</tr>';
    }).join('');

    document.getElementById('impVoorbeeld').innerHTML =
      '<table class="imp-tabel"><thead><tr>' + kopHtml + '</tr></thead><tbody>' + voorbeeld + '</tbody></table>';

    // Tabbladkeuze bij een werkblad met meer dan één blad.
    var bladVak = document.getElementById('impBladen');
    if (bladVak) {
      if (bladen && bladen.length > 1) {
        bladVak.hidden = false;
        bladVak.innerHTML = '<label for="impBlad">Tabblad:</label>' +
          '<select id="impBlad" onchange="impBladKiezen(this.value)">' +
          bladen.map(function (b) {
            return '<option value="' + esc2(b.naam) + '"' +
              (b.naam === bron.blad ? ' selected' : '') + '>' + esc2(b.naam) +
              ' (' + b.rijen.length + ' regels)</option>';
          }).join('') + '</select>';
      } else { bladVak.hidden = true; bladVak.innerHTML = ''; }
    }

    var oordeel = beoordeel();
    beoordeeld = null;                 // pas na Controleren geldig
    toonMerkInfo();
    var mistBreedte = mapping.indexOf('breedte') < 0;
    // Hoogte mag ontbreken als de breedtekolom maatparen bevat ('1200 x 600');
    // dan komt de hoogte daaruit. Levert dat niets op, dan is er wél een
    // hoogtekolom nodig.
    var mistHoogte = mapping.indexOf('hoogte') < 0 && oordeel.goed.length === 0;
    var waarschuwing = '';
    if (mistBreedte && mistHoogte) {
      waarschuwing = 'Koppel eerst een kolom aan Breedte en aan Hoogte.';
    } else if (mistBreedte) {
      waarschuwing = 'Koppel eerst een kolom aan Breedte.';
    } else if (mistHoogte) {
      waarschuwing = 'Koppel ook een kolom aan Hoogte — of koppel een kolom met ' +
                     'maten als «1200 x 600» aan Breedte.';
    }
    // Kruiscontrole: zegt de kop iets anders dan waar je hem aan koppelt?
    // Een kolom «Hoogte (mm)» aan Breedte knopen is bijna altijd een
    // vergissing, en zou lijnrecht ingaan tegen "nooit foute maten" (v89).
    var kruis = kruisControle();
    if (!waarschuwing && kruis) waarschuwing = kruis;

    var tel = document.getElementById('impTelling');
    if (waarschuwing) {
      tel.innerHTML = '<span class="imp-fout-tekst">' + waarschuwing + '</span>';
    } else {
      tel.innerHTML = oordeel.goed.length + ' rij' + (oordeel.goed.length === 1 ? '' : 'en') +
        ' te controleren' +
        (oordeel.fout.length ? ' · <span class="imp-fout-tekst">' + oordeel.fout.length +
           ' rij' + (oordeel.fout.length === 1 ? '' : 'en') + ' met een probleem</span>' : '') +
        (oordeel.leeg ? ' · ' + oordeel.leeg + ' zonder maten overgeslagen' : '');
    }
    var knop = document.getElementById('impControleren');
    if (knop) knop.disabled = !!waarschuwing || (oordeel.goed.length === 0 && oordeel.fout.length === 0);
  }

  // Een kop die het tegenovergestelde zegt van het veld waaraan hij hangt.
  function kruisControle() {
    var woorden = { breedte: HERKEN[2][1], hoogte: HERKEN[3][1] };
    var melding = '';
    mapping.forEach(function (veld, i) {
      if (melding) return;
      if (veld !== 'breedte' && veld !== 'hoogte') return;
      var ander = veld === 'breedte' ? 'hoogte' : 'breedte';
      var s2 = schoon(tabel.kop[i]);
      if (!s2) return;
      var zegtAnder = woorden[ander].some(function (w) { return s2 === w || s2.indexOf(w) >= 0; });
      var zegtZelf = woorden[veld].some(function (w) { return s2 === w || s2.indexOf(w) >= 0; });
      if (zegtAnder && !zegtZelf) {
        melding = 'De kolom «' + tabel.kop[i] + '» is gekoppeld aan ' +
          (veld === 'breedte' ? 'Breedte' : 'Hoogte') + ', maar de kop zegt ' +
          (ander === 'breedte' ? 'breedte' : 'hoogte') + '. Kijk dat na voordat je verdergaat.';
      }
    });
    return melding;
  }

  /* ─── stap 3: controleren voordat er iets in de lijst komt ──── */

  window.impControleren = function () {
    beoordeeld = beoordeel();
    tekenStap3();
    document.getElementById('impStap2').style.display = 'none';
    document.getElementById('impStap3').style.display = 'block';
  };

  window.impTerug2 = function () {
    document.getElementById('impStap3').style.display = 'none';
    document.getElementById('impStap2').style.display = 'block';
    tekenStap2();
  };

  function esc2(t) {
    return String(t === undefined || t === null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');   // v120: ook > en '
  }

  // Kolommen die er wél naar uitzien maar niet gekoppeld zijn. Bij twee
  // breedtekolommen (sponning én glas) moet zichtbaar zijn welke je laat
  // liggen (v89).
  function nietGebruikt() {
    var uit = [];
    tabel.kop.forEach(function (k, i) {
      if (mapping[i]) return;
      var s2 = schoon(k);
      if (!s2) return;
      HERKEN.forEach(function (h) {
        if (veldScore(s2, h) > 0 && uit.indexOf(k) < 0) uit.push(k);
      });
    });
    return uit;
  }

  function herkomst() {
    var uit = [];
    [['breedte', 'Breedte'], ['hoogte', 'Hoogte'], ['aantal', 'Aantal'],
     ['merk', 'Merk'], ['glasType', 'Glas type'], ['opbouw', 'Opbouw'],
     ['maxPakket', 'Max pakket'], ['opmerking', 'Opmerking'], ['maatsoort', 'Maatsoort']].forEach(function (v) {
      var i = mapping.indexOf(v[0]);
      if (i < 0) return;
      uit.push('<li><b>' + v[1] + '</b> ← kolom ' + (i + 1) + ': «' +
               esc2(tabel.kop[i] || '—') + '»</li>');
    });
    return uit.join('');
  }

  function tekenStap3() {
    var o = beoordeeld;
    var maatsoort = document.getElementById('impMaatsoort').value;
    var splits = document.getElementById('impSplits') && document.getElementById('impSplits').checked;

    // Totalen, om tegen de lijst van de leverancier te houden.
    var posities = o.goed.length;
    var ruiten = o.goed.reduce(function (n, r) { return n + (parseInt(r.waarden.aantal, 10) || 1); }, 0);
    var breedtes = o.goed.map(function (r) { return +r.waarden.breedte; });
    var hoogtes = o.goed.map(function (r) { return +r.waarden.hoogte; });
    var reeks = function (lijst) {
      if (!lijst.length) return '—';
      var min = Math.min.apply(null, lijst), max = Math.max.apply(null, lijst);
      return min === max ? min + ' mm' : min + ' – ' + max + ' mm';
    };

    var kop = '<div class="imp-herkomst"><div><b>Uit:</b> ' + esc2(bron.naam || 'onbekend') +
      (bron.blad ? ', tabblad «' + esc2(bron.blad) + '»' : '') +
      (bron.scheiding && bron.scheiding !== 'spaties'
        ? ', gescheiden door «' + esc2(bron.scheiding === '\t' ? 'tab' : bron.scheiding) + '»' : '') +
      // Hoe de tekst gelezen is (v104): klopt een é niet, dan zie je hier waarom.
      (bron.codering ? ', gelezen als ' + esc2(CODERING_NAAM[bron.codering] || bron.codering) : '') +
      '</div><ul>' + herkomst() + '</ul>' +
      (nietGebruikt().length
        ? '<div class="imp-niet-gebruikt">Niet overgenomen: ' +
          nietGebruikt().map(function (k) { return '«' + esc2(k) + '»'; }).join(', ') +
          ' — die kolom' + (nietGebruikt().length === 1 ? ' lijkt' : 'men lijken') +
          ' wel maten of gegevens te bevatten.</div>'
        : '') +
      '<div class="imp-totalen"><b>' + posities + ' regels</b> · <b>' + ruiten + ' ruiten</b>' +
      ' · breedte ' + reeks(breedtes) + ' · hoogte ' + reeks(hoogtes) +
      (kolomVan('maatsoort') >= 0
        ? ' · maatsoort per regel uit het bestand (anders <b>' + esc2(maatsoort) + '</b>)'
        : ' · als <b>' + esc2(maatsoort) + '</b>') +
      (splits ? ' · regels met een aantal worden opgesplitst' : '') + '</div></div>';

    var metPakket = kolomVan('maxPakket') >= 0;
    var metSoort = kolomVan('maatsoort') >= 0;
    var rijenHtml = o.goed.map(function (r, i) {
      var w = r.waarden;
      var anders = function (veld) {
        var ruw = r.tekst[veld];
        return (ruw && String(ruw) !== String(w[veld]))
          ? ' <span class="imp-ruw">(stond er als «' + esc2(ruw) + '»)</span>' : '';
      };
      return '<tr><td>' + (i + 1) + '</td>' +
        '<td>' + esc2(w.merk || '') + '</td>' +
        '<td class="imp-maat">' + esc2(w.breedte) + anders('breedte') + '</td>' +
        '<td class="imp-maat">' + esc2(w.hoogte) + anders('hoogte') + '</td>' +
        '<td>' + esc2(w.aantal) + anders('aantal') + '</td>' +
        '<td>' + esc2([w.glasType, w.opbouw].filter(Boolean).join(' ')) + '</td>' +
        // v120: het max glaspakket ook hier (controle v119: je zag niet of
        // het goed gelezen was).
        (metPakket ? '<td>' + (w.maxPakket ? esc2(w.maxPakket) + ' mm' + anders('maxPakket')
          : (r.tekst.maxPakketOnbekend ? '<span class="imp-waarsch-kort">«' + esc2(r.tekst.maxPakketOnbekend) + '» niet te lezen</span>' : '')) + '</td>' : '') +
        (metSoort ? '<td>' + esc2(w.maatsoort || maatsoort) +
          (r.tekst.maatsoortOnbekend ? ' <span class="imp-waarsch-kort">(«' + esc2(r.tekst.maatsoortOnbekend) + '» onbekend)</span>' : '') + '</td>' : '') +
        '<td>' + esc2(w.opmerking || '') + '</td></tr>';
    }).join('');

    // Wat níet is overgenomen, met de tekst uit het bestand, zodat niets stil
    // verdwijnt (v120).
    var pakketMis = o.goed.filter(function (r) { return r.tekst.maxPakketOnbekend; });
    var soortMis = o.goed.filter(function (r) { return r.tekst.maatsoortOnbekend; });
    // v123: regels met alleen tekst (geen enkel getal) gaan niet mee, maar
    // worden wel genoemd (zie naarStap2).
    var zg = (tabel && tabel.zonderGetal) || [];
    var zonderGetalHtml = zg.length
      ? '<div class="imp-waarsch">⚠ ' + zg.length + ' regel' + (zg.length === 1 ? '' : 's') +
        ' zonder enig getal ' + (zg.length === 1 ? 'wordt' : 'worden') + ' niet overgenomen ' +
        '(tussenkopje, of een ruit waarvan de maat nog ontbreekt?): ' +
        zg.slice(0, 5).map(function (r) { return '«' + esc2(r.filter(function (c) { return String(c || '').trim(); }).join(' | ').slice(0, 60)) + '»'; }).join(', ') +
        (zg.length > 5 ? ' …' : '') + '. Staat daar een ruit tussen, vul hem dan met de hand in.</div>'
      : '';
    var letOpHtml = zonderGetalHtml + (pakketMis.length
        ? '<div class="imp-waarsch">⚠ Bij ' + pakketMis.length + ' regel' + (pakketMis.length === 1 ? '' : 's') +
          ' is het max glaspakket niet te lezen (bijv. «' + esc2(pakketMis[0].tekst.maxPakketOnbekend) +
          '»): niet overgenomen. Vul het zo nodig zelf in op Toebehoren.</div>' : '') +
      (soortMis.length
        ? '<div class="imp-waarsch">⚠ Bij ' + soortMis.length + ' regel' + (soortMis.length === 1 ? '' : 's') +
          ' staat een onbekende maatsoort (bijv. «' + esc2(soortMis[0].tekst.maatsoortOnbekend) +
          '»): die worden <b>' + esc2(maatsoort) + '</b>.</div>' : '');

    var foutHtml = '';
    if (o.fout.length) {
      foutHtml = '<div class="imp-geweigerd"><h4>' + o.fout.length + ' regel' +
        (o.fout.length === 1 ? '' : 's') + ' wordt NIET overgenomen</h4>' +
        '<p>Deze regels kon de app niet zonder twijfel lezen. Verbeter ze in het ' +
        'bestand en lees het opnieuw in, of typ ze met de hand bij.</p><ul>' +
        o.fout.map(function (r) {
          return '<li><b>regel ' + r.nr + ':</b> ' + esc2(r.redenen.join('; ')) +
                 '<br><span class="imp-ruw">' + esc2(r.ruw.join(' | ')) + '</span></li>';
        }).join('') + '</ul></div>';
    }

    document.getElementById('impControle').innerHTML = kop +
      (o.goed.length
        ? '<div class="imp-scroll"><table class="imp-tabel imp-controle"><thead><tr>' +
          '<th>#</th><th>Merk</th><th>Breedte</th><th>Hoogte</th><th>Aantal</th>' +
          '<th>Glas</th>' + (metPakket ? '<th>Max pakket</th>' : '') + (metSoort ? '<th>Maatsoort</th>' : '') +
          '<th>Opmerking</th></tr></thead><tbody>' + rijenHtml +
          '</tbody></table></div>'
        : '<div class="imp-geen">Er blijft geen enkele regel over om over te nemen.</div>') +
      letOpHtml + foutHtml +
      (o.leeg ? '<div class="imp-ruw">' + o.leeg + (o.leeg === 1 ? ' regel' : ' regels') + ' zonder maten overgeslagen ' +
                '(tussenkopjes of totaalregels).</div>' : '');

    document.getElementById('impToevoegen').disabled = o.goed.length === 0;
    document.getElementById('impVervangen').disabled = o.goed.length === 0;
  }

  function toonMerkInfo() {
    var info = document.getElementById('impMerkInfo');
    if (!info) return;
    var merken = {};
    gemapteRijen().forEach(function (o) {
      var k = merkBasis(o.merk);
      if (k) merken[k] = (merken[k] || 0) + 1;
    });
    var dubbel = Object.keys(merken).filter(function (k) { return merken[k] > 1; });
    var bestaat = Object.keys(merken).filter(function (k) {
      return rijen.some(function (r) {
        return merkBasis(r.merk) === k || volgnummerVan(k, r.merk) > 0;
      });
    });

    var regels = [];
    if (dubbel.length) {
      regels.push('<span class="imp-goed">✓ ' + dubbel.length +
        ' kozijn' + (dubbel.length === 1 ? '' : 'en') + ' met meerdere maten (' +
        dubbel.slice(0, 6).map(esc2).join(', ') + (dubbel.length > 6 ? '…' : '') +
        ') ' + (dubbel.length === 1 ? 'krijgt' : 'krijgen') +
        ' per ruit een nummer erachter (A → A1, A2; 1 → 1a, 1b).</span>');
    }
    if (bestaat.length) {
      regels.push('<span class="imp-let-op">⚠ De merken ' + bestaat.slice(0, 6).map(esc2).join(', ') +
        (bestaat.length > 6 ? '…' : '') + ' komen al voor in dit project. ' +
        'Bij toevoegen vraagt de app of alleen de nieuwe of ook de bestaande regels een nummer krijgen; ' +
        'wil je ze vervangen, gebruik dan \u2039Alles vervangen\u203a.</span>');
    }
    info.innerHTML = regels.join('');
  }

  /* ─── overnemen in de opname ───────────────────────────────── */

  function bouwRijen() {
    var bronLijst = beoordeeld ? beoordeeld.goed.map(function (r) { return r.waarden; })
                              : gemapteRijen();
    return bronLijst.map(function (o) {
      var r = nieuweRij();
      r.maatsoort = o.maatsoort || document.getElementById('impMaatsoort').value;
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
      // v117 (wens Jan): de app begrijpt het max glaspakket (incl. band) nu
      // zelf: Toebehoren controleert glas + band ertegen en de keuzelijst van
      // de opbouw zet te dikke opbouwen apart. Dus niet meer in de opmerking
      // (die gaat naar de leverancier).
      if (o.maxPakket) r.maxPakket = o.maxPakket;
      if (onbekend.length) {
        r.opmerking = (r.opmerking ? r.opmerking + ' — ' : '') + onbekend.join(', ');
      }
      return r;
    });
  }

  /* ─── merken per kozijn nummeren ───────────────────────────── */
  // In aangeleverde lijsten dragen alle ruiten van één kozijn dezelfde
  // letter. Heeft kozijn A twee verschillende maten, dan staan er twee
  // regels met merk A en is voor de buitenman niet te zien welke ruit
  // waar hoort. Die krijgen daarom A1 en A2. Komt een merk maar één keer
  // voor, dan blijft het zoals het op de tekening staat.

  function merkBasis(m) { return String(m || '').trim().toUpperCase(); }

  // v120 (keuze Jan): eindigt een merk op een cijfer, dan krijgen de ruiten
  // een letter erachter (1 → 1a, 1b), anders een cijfer (A → A1, A2). Tot
  // v119 werd "1" twee keer "11" en "12", en die botsten met de echte
  // merken 11 en 12.
  function opCijfer(k) { return /\d$/.test(k); }
  function achtervoegsel(k, n) {          // n = 1, 2, 3 …
    if (!opCijfer(k)) return String(n);
    var t = '';
    while (n > 0) { n--; t = String.fromCharCode(97 + n % 26) + t; n = Math.floor(n / 26); }
    return t;
  }
  // Het volgnummer van een merk binnen k ("A3" bij A = 3, "1c" bij 1 = 3),
  // 0 als het merk geen genummerde versie van k is.
  function volgnummerVan(k, merk) {
    var m = merkBasis(merk);
    if (m === k || m.indexOf(k) !== 0) return 0;
    var rest = m.slice(k.length);
    if (opCijfer(k)) {
      if (!/^[A-Z]+$/.test(rest)) return 0;
      var n = 0;
      for (var i = 0; i < rest.length; i++) n = n * 26 + (rest.charCodeAt(i) - 64);
      return n;
    }
    return /^\d+$/.test(rest) ? parseInt(rest, 10) : 0;
  }

  // Merken uit de import die al in het project staan (als zichzelf of
  // genummerd). Daarover beslis je zelf (v120).
  function botsingen(nieuw, bestaand) {
    var ks = {};
    nieuw.forEach(function (r) { var k = merkBasis(r.merk); if (k) ks[k] = true; });
    return Object.keys(ks).filter(function (k) {
      return bestaand.some(function (r) { return merkBasis(r.merk) === k || volgnummerVan(k, r.merk) > 0; });
    });
  }

  // keus 'nieuw': alleen de ingelezen regels krijgen een nummer.
  // keus 'bestaand': ook de regels in het project met precies dit merk; hun
  // bolletjes op de foto's gaan vanzelf mee (een bolletje wijst naar de
  // regel, niet naar de tekst van het merk).
  // bestaand = de regels die blijven staan (bij "Alles vervangen": geen,
  // dan wordt er ook niet doorgeteld; controle v119).
  function nummerMerken(nieuw, bestaand, keus) {
    var perMerk = {};
    nieuw.forEach(function (r) {
      var k = merkBasis(r.merk);
      if (!k) return;
      (perMerk[k] = perMerk[k] || []).push(r);
    });
    var aangepast = [];
    Object.keys(perMerk).forEach(function (k) {
      var groep = perMerk[k];
      var oud = bestaand.filter(function (r) { return merkBasis(r.merk) === k; });
      var hoogste = 0;
      bestaand.forEach(function (r) { hoogste = Math.max(hoogste, volgnummerVan(k, r.merk)); });
      if (groep.length < 2 && !oud.length && !hoogste) return;
      var zet = function (r) {
        hoogste++;
        r.merk = String(r.merk).trim() + achtervoegsel(k, hoogste);
      };
      if (keus === 'bestaand' && oud.length) {
        oud.forEach(zet);
        aangepast.push('in het project ' + k + ' → ' + oud.map(function (r) { return r.merk; }).join(', '));
      }
      groep.forEach(zet);
      aangepast.push(groep.length > 1
        ? k + ' → ' + groep[0].merk + ' t/m ' + groep[groep.length - 1].merk
        : k + ' → ' + groep[0].merk);
    });
    return aangepast;
  }

  // Wat elk van de twee keuzes zou opleveren, voor de vraag (op kopieën).
  function voorbeeldNummering(nieuw, bestaand, k, keus) {
    var n2 = nieuw.filter(function (r) { return merkBasis(r.merk) === k; })
      .map(function (r) { return { merk: r.merk }; });
    var b2 = bestaand.map(function (r) { return { merk: r.merk, oud: merkBasis(r.merk) === k }; });
    nummerMerken(n2, b2, keus);
    var oudNu = b2.filter(function (r) { return r.oud; }).map(function (r) { return r.merk; });
    var kort = function (l) { return l.length > 4 ? l.slice(0, 3).join(', ') + ' … ' + l[l.length - 1] : l.join(', '); };
    return (oudNu.length ? 'bestaand: ' + kort(oudNu) + '; ' : '') +
      'nieuw: ' + kort(n2.map(function (r) { return r.merk; }));
  }

  // Eén regel van vijf gelijke ruiten wordt vijf regels van één.
  function splitsAantallen(nieuw) {
    var uit = [];
    nieuw.forEach(function (r) {
      var n = parseInt(r.aantal, 10) || 1;
      if (n < 2) { uit.push(r); return; }
      for (var i = 0; i < n; i++) {
        var kopie = Object.assign(nieuweRij(), r, { id: nieuweRij().id, aantal: 1 });
        uit.push(kopie);
      }
    });
    return uit;
  }

  function echtLeeg(r) {
    if (!r) return false;
    var basis = (typeof isLeegLos === 'function') ? isLeegLos(r)
      : !r.fotoId && !r.merk && !r.breedte && !r.hoogte && !r.glasType && !r.opmerking;
    return basis && !r.fotoId && !r.opmerking && !r.opbouw && !r.ducoType && !r.ralKleur &&
           !r.roedenbreedte && !r.roedenopmerking &&
           (!r.roedenverdeling || r.roedenverdeling === 'Geen roedenverdeling') &&
           (!r.rooster || r.rooster === 'Nee');
  }

  window.impToevoegen = async function () {
    var nieuw = bouwRijen();
    var splitsen = document.getElementById('impSplits');
    if (splitsen && splitsen.checked) nieuw = splitsAantallen(nieuw);
    var bestaand = rijen.filter(function (r) { return !echtLeeg(r); });
    // v120 (keuze Jan): staat een merk al in het project, dan eerst vragen
    // hoe het moet heten, in plaats van stil door te nummeren.
    var keus = 'nieuw';
    var bots = botsingen(nieuw, bestaand);
    if (bots.length && window.appKeuze) {
      var k = bots[0];
      var aantalOud = bestaand.filter(function (r) { return merkBasis(r.merk) === k || volgnummerVan(k, r.merk) > 0; }).length;
      var besteld = typeof projectInfo !== 'undefined' && projectInfo && (projectInfo.bestellingen || []).some(function (b) { return !b.ingetrokken; });
      keus = await appKeuze(
        (bots.length === 1 ? 'Het merk ' + k + ' staat' : 'De merken ' + bots.slice(0, 6).join(', ') + (bots.length > 6 ? '…' : '') + ' staan') +
        ' al in dit project' + (bots.length === 1 ? ' (' + aantalOud + ' regel' + (aantalOud === 1 ? '' : 's') + ')' : '') +
        '. Twee ruiten met hetzelfde merk zijn op de bouw niet uit elkaar te houden. Hoe moeten ze heten?\n\n' +
        '• Alleen de nieuwe nummeren — ' + voorbeeldNummering(nieuw, bestaand, k, 'nieuw') + '\n' +
        '• Bestaande ook nummeren — ' + voorbeeldNummering(nieuw, bestaand, k, 'bestaand') +
        '. De bolletjes op de foto\'s gaan mee.' +
        (besteld ? '\n\nLet op: er is al besteld. Krijgt een bestelde ruit een ander merk, dan staat hij op de volgende aanvulling als gewijzigd.' : ''),
        [{ tekst: 'Stoppen', waarde: null },
         { tekst: 'Bestaande ook nummeren', waarde: 'bestaand' },
         { tekst: 'Alleen de nieuwe nummeren', waarde: 'nieuw', primair: true }],
        { kop: 'Merk bestaat al', soort: 'letop' });
      if (!keus) return;
    }
    nieuw = verwerkMerken(nieuw, bestaand, keus);
    // Lege rijen aan het eind opruimen, anders staan er gaten in de lijst.
    // Alleen écht lege: tot v102 keek dit alleen naar maten, glas en merk,
    // en verdwenen een regel bij een foto of een regel met alleen een
    // opmerking stil bij het importeren (gevonden bij de controle van v103).
    while (rijen.length && echtLeeg(rijen[rijen.length - 1])) {
      rijen.pop();
    }
    rijen = rijen.concat(nieuw);
    geenLatten(nieuw);
    afronden(nieuw.length + ' regels toegevoegd');
  };

  window.impVervangen = async function () {
    if (!await appVraag('Alle huidige rijen vervangen door de geïmporteerde rijen?',
        { kop: 'Rijen vervangen', ja: 'Vervangen', gevaarlijk: true })) return;
    var nieuw = bouwRijen();
    var splitsen = document.getElementById('impSplits');
    if (splitsen && splitsen.checked) nieuw = splitsAantallen(nieuw);
    // v120: de oude regels gaan weg, dus niet tegen hen doornummeren.
    nieuw = verwerkMerken(nieuw, [], 'nieuw');
    rijen = nieuw;
    geenLatten(nieuw);
    afronden(nieuw.length + ' regels ingelezen (lijst vervangen)');
  };

  // v115 (keuze Jan): ingelezen ruiten zijn meestal nieuwe kozijnen, en die
  // komen met hun latten. Latzijde staat dan op "geen (meegeleverd)": op
  // Toebehoren telt alleen band, kit en tape. Per ruit te veranderen.
  function geenLatten(nieuw) {
    if (!window.toebehorenZetRuit) return;
    nieuw.forEach(function (r) { toebehorenZetRuit(r.id, 'latZijde', 'geen'); });
  }

  function verwerkMerken(nieuw, bestaand, keus) {
    var gewijzigd = nummerMerken(nieuw, bestaand, keus);
    if (gewijzigd.length) {
      window.__impMelding = 'Merken genummerd: ' + gewijzigd.join(', ');
    } else {
      window.__impMelding = '';
    }
    return nieuw;
  }

  function afronden(tekst) {
    // In het logboek van het project: waar kwam dit vandaan, en hoe is het
    // gelezen. Zonder dat is later niet na te gaan waarom een maat zo in de
    // lijst staat (v89).
    if (window.glasSpoorNotitie) {
      var velden = ['breedte', 'hoogte'].map(function (v) {
        var i = mapping.indexOf(v);
        return i < 0 ? '' : v + ' uit «' + (tabel.kop[i] || ('kolom ' + (i + 1))) + '»';
      }).filter(Boolean).join(', ');
      var fout = beoordeeld && beoordeeld.fout.length ? ', ' + beoordeeld.fout.length + ' geweigerd' : '';
      var leeg = beoordeeld && beoordeeld.leeg ? ', ' + beoordeeld.leeg + ' zonder maten' : '';
      glasSpoorNotitie('import uit ' + (bron.naam || 'onbekend') +
        (bron.blad ? ' (tabblad ' + bron.blad + ')' : '') + ': ' + tekst +
        (velden ? ', ' + velden : '') + fout + leeg);
    }
    if (window.glasMarkeerWerk) glasMarkeerWerk();
    renderTabel();
    herbereken();
    opslaan();
    window.impSluit();
    var s = document.getElementById('statusBar');
    if (s) s.textContent = tekst + (window.__impMelding ? ' — ' + window.__impMelding : '');
    window.__impMelding = '';
  }

  /* ─── knop en venster in de pagina zetten ──────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    // De knop zit sinds v45 in het importmenu onder de tabbladen, dus hier
    // hoeft er geen meer bij.
  });

  // v120: Escape sluit het importvenster, net als het kruisje (niet als er
  // een vraag boven open staat).
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var v = document.getElementById('impVenster');
    if (!v || v.style.display !== 'flex') return;
    if (window.appMeldingBezig && appMeldingBezig()) return;
    window.impSluit();
  });
})();
