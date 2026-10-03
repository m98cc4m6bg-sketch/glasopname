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
  // Waar komt dit vandaan, en hoe is het gelezen? Alleen om te melden en om
  // in het logboek te zetten (v89).
  var bron = { naam: '', soort: '', scheiding: '', blad: '' };
  var bladen = null;   // de tabbladen van een werkblad, als er meer zijn
  var beoordeeld = null;  // uitkomst van beoordeel(): { goed: [], fout: [] }

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
  // Vanaf v89 met aanhalingstekens. Daarvoor werd er plat gesplitst, en dan
  // schoof een regel als
  //     A;"let op; buitenzijde";800;1400
  // één kolom op: 800 belandde in de hoogte en de breedte bleef leeg. Dat
  // zag niemand. Een CSV-lezer die aanhalingstekens kent is de enige manier
  // om dat uit te sluiten.

  function csvLees(tekst, scheiding) {
    var rijen = [], rij = [], cel = '', inAanhaling = false;
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
      if (c === '"' && cel.trim() === '') { inAanhaling = true; cel = ''; continue; }
      if (c === scheiding) { rij.push(cel); cel = ''; continue; }
      if (c === '\n') { rij.push(cel); rijen.push(rij); rij = []; cel = ''; continue; }
      cel += c;
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

  function uitTekst(tekst) {
    if (!String(tekst || '').trim()) return null;
    var sch = kiesScheiding(tekst);
    if (sch) return { rijen: csvLees(tekst, sch), scheiding: sch };
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

  window.impBestandGekozen = function (input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var naam = file.name.toLowerCase();
    melding('Bezig met lezen van ' + file.name + '…');
    bron = { naam: file.name, soort: naam.replace(/^.*\./, ''), scheiding: '', blad: '' };
    var lezer;
    if (naam.endsWith('.pdf')) lezer = uitPdf(file);
    else if (naam.endsWith('.xlsx') || naam.endsWith('.xls')) lezer = uitWerkblad(file);
    else if (naam.endsWith('.csv') || naam.endsWith('.txt')) lezer = file.text().then(uitTekst);
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
      if (r.length > tabel.kop.length) {
        regel.redenen.push('deze regel heeft ' + r.length + ' cellen, de kop ' +
                           tabel.kop.length + ' — mogelijk verschoven');
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
      ['merk', 'glasType', 'opbouw', 'maxPakket', 'opmerking'].forEach(function (veld) {
        var v = cel(r, kolomVan(veld));
        if (!v) return;
        if (veld === 'maxPakket') {
          var mp = maatLees(v);
          if (mp.waarde) regel.waarden.maxPakket = mp.waarde;
          else regel.tekst.maxPakketOnbekend = v;
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

    // Tabbladkeuze bij een werkblad met meer dan één blad.
    var bladVak = document.getElementById('impBladen');
    if (bladVak) {
      if (bladen && bladen.length > 1) {
        bladVak.hidden = false;
        bladVak.innerHTML = '<label for="impBlad">Tabblad:</label>' +
          '<select id="impBlad" onchange="impBladKiezen(this.value)">' +
          bladen.map(function (b) {
            return '<option value="' + b.naam.replace(/"/g, '&quot;') + '"' +
              (b.naam === bron.blad ? ' selected' : '') + '>' + b.naam +
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
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
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
        if (h[1].some(function (w) { return s2 === w || (w.length > 3 && s2.indexOf(w) >= 0); })) {
          if (uit.indexOf(k) < 0) uit.push(k);
        }
      });
    });
    return uit;
  }

  function herkomst() {
    var uit = [];
    [['breedte', 'Breedte'], ['hoogte', 'Hoogte'], ['aantal', 'Aantal'],
     ['merk', 'Merk'], ['glasType', 'Glas type'], ['opbouw', 'Opbouw'],
     ['maxPakket', 'Max pakket'], ['opmerking', 'Opmerking']].forEach(function (v) {
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
      '</div><ul>' + herkomst() + '</ul>' +
      (nietGebruikt().length
        ? '<div class="imp-niet-gebruikt">Niet overgenomen: ' +
          nietGebruikt().map(function (k) { return '«' + esc2(k) + '»'; }).join(', ') +
          ' — die kolom' + (nietGebruikt().length === 1 ? ' lijkt' : 'men lijken') +
          ' wel maten of gegevens te bevatten.</div>'
        : '') +
      '<div class="imp-totalen"><b>' + posities + ' regels</b> · <b>' + ruiten + ' ruiten</b>' +
      ' · breedte ' + reeks(breedtes) + ' · hoogte ' + reeks(hoogtes) +
      ' · als <b>' + esc2(maatsoort) + '</b>' +
      (splits ? ' · regels met een aantal worden opgesplitst' : '') + '</div></div>';

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
        '<td>' + esc2(w.opmerking || '') + '</td></tr>';
    }).join('');

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
          '<th>Glas</th><th>Opmerking</th></tr></thead><tbody>' + rijenHtml +
          '</tbody></table></div>'
        : '<div class="imp-geen">Er blijft geen enkele regel over om over te nemen.</div>') +
      foutHtml +
      (o.leeg ? '<div class="imp-ruw">' + o.leeg + ' regel(s) zonder maten overgeslagen ' +
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
        var m = merkBasis(r.merk);
        return m === k || (m.indexOf(k) === 0 && /^\d+$/.test(m.slice(k.length)));
      });
    });

    var regels = [];
    if (dubbel.length) {
      regels.push('<span class="imp-goed">✓ ' + dubbel.length +
        ' kozijn' + (dubbel.length === 1 ? '' : 'en') + ' met meerdere maten (' +
        dubbel.slice(0, 6).join(', ') + (dubbel.length > 6 ? '…' : '') +
        ') ' + (dubbel.length === 1 ? 'krijgt' : 'krijgen') +
        ' een nummer achter de letter.</span>');
    }
    if (bestaat.length) {
      regels.push('<span class="imp-let-op">⚠ De merken ' + bestaat.slice(0, 6).join(', ') +
        (bestaat.length > 6 ? '…' : '') + ' komen al voor in dit project. ' +
        'Bij toevoegen wordt doorgeteld; wil je ze vervangen, gebruik dan \u2039Alles vervangen\u203a.</span>');
    }
    info.innerHTML = regels.join('');
  }

  /* ─── overnemen in de opname ───────────────────────────────── */

  function bouwRijen() {
    var bronLijst = beoordeeld ? beoordeeld.goed.map(function (r) { return r.waarden; })
                              : gemapteRijen();
    return bronLijst.map(function (o) {
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

  /* ─── merken per kozijn nummeren ───────────────────────────── */
  // In aangeleverde lijsten dragen alle ruiten van één kozijn dezelfde
  // letter. Heeft kozijn A twee verschillende maten, dan staan er twee
  // regels met merk A en is voor de buitenman niet te zien welke ruit
  // waar hoort. Die krijgen daarom A1 en A2. Komt een merk maar één keer
  // voor, dan blijft het zoals het op de tekening staat.

  function merkBasis(m) { return String(m || '').trim().toUpperCase(); }

  // Bestaat A3 al in het project, dan begint een nieuwe import bij A4.
  function hoogsteNummer(letter) {
    var hoogste = 0;
    rijen.forEach(function (r) {
      var m = merkBasis(r.merk);
      if (m.indexOf(letter) !== 0) return;
      var rest = m.slice(letter.length);
      if (!/^\d+$/.test(rest)) return;
      hoogste = Math.max(hoogste, parseInt(rest, 10));
    });
    return hoogste;
  }

  function nummerMerken(nieuw) {
    var perMerk = {};
    nieuw.forEach(function (r) {
      var k = merkBasis(r.merk);
      if (!k) return;
      (perMerk[k] = perMerk[k] || []).push(r);
    });
    var aangepast = [];
    Object.keys(perMerk).forEach(function (k) {
      var groep = perMerk[k];
      // Nummeren is nodig bij meerdere maten in één kozijn, en ook als de
      // letter al in het project voorkomt — anders levert een import
      // alsnog twee ruiten met dezelfde letter op.
      var bestaatAl = rijen.some(function (r) {
        return merkBasis(r.merk) === k && groep.indexOf(r) < 0;
      });
      if (groep.length < 2 && !bestaatAl) return;
      var start = hoogsteNummer(k);
      groep.forEach(function (r, i) { r.merk = k + (start + i + 1); });
      aangepast.push(groep.length > 1
        ? k + ' → ' + groep[0].merk + ' t/m ' + groep[groep.length - 1].merk
        : k + ' → ' + groep[0].merk);
    });
    return aangepast;
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

  window.impToevoegen = function () {
    var nieuw = verwerkMerken(bouwRijen());
    // lege rijen aan het eind opruimen, anders staan er gaten in de lijst
    while (rijen.length && !rijen[rijen.length - 1].breedte && !rijen[rijen.length - 1].hoogte &&
           !rijen[rijen.length - 1].glasType && !rijen[rijen.length - 1].merk) {
      rijen.pop();
    }
    rijen = rijen.concat(nieuw);
    afronden(nieuw.length + ' regels toegevoegd');
  };

  window.impVervangen = async function () {
    if (!await appVraag('Alle huidige rijen vervangen door de geïmporteerde rijen?',
        { kop: 'Rijen vervangen', ja: 'Vervangen', gevaarlijk: true })) return;
    var nieuw = verwerkMerken(bouwRijen());
    rijen = nieuw;
    afronden(nieuw.length + ' regels ingelezen (lijst vervangen)');
  };

  function verwerkMerken(nieuw) {
    var splitsen = document.getElementById('impSplits');
    if (splitsen && splitsen.checked) nieuw = splitsAantallen(nieuw);
    var gewijzigd = nummerMerken(nieuw);
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
})();
