/* ═══════════════════════════════════════════════════════════════
   Glasopname – doorvoeren & selectie
     • ⤓ in elke kolomkop: waarde doorvoeren naar alle ruiten,
       alleen de lege, of alleen de geselecteerde
     • vinkje bij het rijnummer om ruiten te selecteren
     • kolom Correctie: afwijkende speling/bijtelling per ruit
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var selectie = new Set();
  var popover = null;

  function esc2(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Zonder lege eerste optie staat de bovenste waarde meteen geselecteerd:
  // één tik op Doorvoeren zette dan bijvoorbeeld elke ruit op 'Glasmaat
  // (direct)' en verdween de speling-aftrek uit alle maten (v83).
  var LEEGKEUZE = '<option value="">— kies —</option>';

  function opts(lijst, huidig) {
    return lijst.map(function (v) {
      return '<option value="' + esc2(v) + '"' + (v === huidig ? ' selected' : '') + '>' + esc2(v) + '</option>';
    }).join('');
  }

  /* ─── selectie ─────────────────────────────────────────────── */

  window.bulkToggle = function (id, aan) {
    if (aan) selectie.add(id); else selectie.delete(id);
    tekenBalk();
    var tr = document.getElementById('rij-' + id);
    if (tr) tr.classList.toggle('geselecteerd', aan);
  };

  window.bulkAlles = function (aan) {
    selectie.clear();
    if (aan) losseRijen().forEach(function (r) { selectie.add(r.id); });
    renderTabel();
    tekenBalk();
  };

  window.bulkSelectieWissen = function () { bulkAlles(false); };

  // Bij het wisselen van project (v91). Ruit-id's tellen per project vanaf
  // 1, dus een selectie {3, 5} uit project A wees in project B naar andere
  // ruiten — en 'Geselecteerde verwijderen' raakte die dan.
  window.bulkSelectieLeeg = function () {
    selectie.clear();
    tekenBalk();
  };

  window.bulkVerwijderSelectie = async function () {
    if (!selectie.size) return;
    if (!await appVraag(selectie.size + ' ruit' + (selectie.size === 1 ? '' : 'en') +
        ' verwijderen?', { kop: 'Ruiten verwijderen', ja: 'Verwijderen', gevaarlijk: true })) return;
    // markeringen van verwijderde ruiten gaan mee
    if (typeof fotos !== 'undefined') {
      fotos.forEach(function (f) {
        f.markeringen = f.markeringen.filter(function (m) { return !selectie.has(m.rijId); });
      });
    }
    rijen = rijen.filter(function (r) { return !selectie.has(r.id); });
    selectie.clear();
    if (losseRijen().length === 0) voegRijenToe(5);
    renderTabel(); herbereken(); opslaan(); tekenBalk();
  };

  // Waar staan de geselecteerde ruiten? Zonder die vermelding is bij een
  // zwevende balk niet te zien op welke tabel hij slaat.
  function herkomst() {
    var groepen = {};
    rijen.forEach(function (r) {
      if (!selectie.has(r.id)) return;
      groepen[r.fotoId || ''] = true;
    });
    var sleutels = Object.keys(groepen);
    if (sleutels.length !== 1) return sleutels.length + ' groepen';
    if (!sleutels[0]) return 'de losse maten';
    var f = (typeof fotos !== 'undefined') ? fotos.find(function (x) { return x.id === sleutels[0]; }) : null;
    if (!f) return '';
    var n = fotos.indexOf(f) + 1;
    return f.titel || (f.pad ? 'foto ' + n : 'groep ' + n);
  }

  function tekenBalk() {
    var balk = document.getElementById('bulkBalk');
    if (!balk) return;
    if (!selectie.size) {
      balk.style.display = 'none';
      document.body.classList.remove('bulk-open');
      return;
    }
    balk.style.display = 'flex';
    var waar = herkomst();
    document.getElementById('bulkAantal').textContent =
      selectie.size + ' ruit' + (selectie.size === 1 ? '' : 'en') + ' geselecteerd' +
      (waar ? ' in ' + waar : '');
    var alles = document.getElementById('bulkAllesVink');
    if (alles) alles.checked = selectie.size === losseRijen().length;

    // De tabbalk moet onder de zwevende balk blijven staan, niet erachter.
    document.body.classList.add('bulk-open');
    document.documentElement.style.setProperty('--bulkhoogte', balk.offsetHeight + 'px');
  }

  /* ─── kolommen die doorgevoerd kunnen worden ───────────────── */
  // kop = exacte tekst in de kolomkop; groep beperkt de match als
  // dezelfde kop twee keer voorkomt (Breedte, Opmerking).

  function velden() {
    return [
      { kop: 'Aantal', titel: 'Aantal', html: function (v) {
          return '<input type="number" id="bulkVeld" min="1" max="999" value="' + (v || 1) + '">'; },
        zet: function (r, v) { r.aantal = +v || 1; },
        leeg: function (r) { return !r.aantal || r.aantal === 1; },
        // v110: een regel met bolletjes op de foto houdt zijn aantal; dat
        // gaat alleen samen met de bolletjes (optie A, keuze van Jan).
        mag: function (r) { return !(window.aantalVolgtBolletjes && aantalVolgtBolletjes(r)); },
        nietReden: 'aantal volgt de bolletjes op de foto' },

      // Merk staat hier bewust niet tussen: een merkletter hoort bij
      // precies één ruit, dus dezelfde waarde over meerdere regels
      // zetten levert altijd een botsing op.

      { kop: 'Maatsoort', titel: 'Maatsoort', html: function () {
          return '<select id="bulkVeld">' + LEEGKEUZE + opts(MAATSOORTEN) + '</select>'; },
        zet: function (r, v) { r.maatsoort = v; },
        leeg: function (r) { return !r.maatsoort; } },

      { kop: 'Corr.', titel: 'Speling / bijtelling', leegMag: true, html: function () {
          return '<select id="bulkVeld"><option value="">— volg algemeen —</option>' +
                 opts(DATA.speling_opties.map(function (s) { return parseInt(s, 10); })) + '</select>'; },
        zet: function (r, v) { if (v === '') delete r.correctie; else r.correctie = +v; },
        leeg: function (r) { return r.correctie == null; } },

      { kop: 'Glas Type', titel: 'Glas type en opbouw', glas: true,
        leeg: function (r) { return !r.glasType || !r.opbouw; } },
      { kop: 'Opbouw', titel: 'Glas type en opbouw', glas: true,
        leeg: function (r) { return !r.glasType || !r.opbouw; } },

      { kop: 'Rooster', titel: 'Rooster', html: function () {
          return '<select id="bulkVeld">' + LEEGKEUZE + opts(ROOSTER_JA_NEE) + '</select>'; },
        // v111: geen rooster = ook geen extra bediening (stang/koord).
        // v114: en ook geen bi-color.
        zet: function (r, v) { r.rooster = v; if (v === 'Nee') { r.ducoType = ''; r.ralKleur = '';
          delete r.bediening; delete r.bedieningAantal; delete r.bedieningLengte; delete r.biColor; delete r.ralBinnen; } },
        leeg: function (r) { return r.rooster !== 'Ja'; } },

      { kop: 'Duco Type', titel: 'Duco type', html: function () {
          return '<select id="bulkVeld">' + LEEGKEUZE + opts(DATA.roosters.map(function (r) { return r.naam; })) + '</select>'; },
        zet: function (r, v) { r.ducoType = v; if (v) r.rooster = 'Ja'; },
        leeg: function (r) { return !r.ducoType; } },

      // v114: de kop heet "RAL Kleur" of "RAL buiten" (bi-color); de eigen
      // tekst van de kop is in beide gevallen "RAL".
      { kop: 'RAL', groep: 'kol-ral', titel: 'RAL kleur (bij bi-color: buiten)', html: function () {
          return '<select id="bulkVeld">' + LEEGKEUZE + opts(DATA.ral_kleuren) + '</select>'; },
        zet: function (r, v) { r.ralKleur = v; },
        leeg: function (r) { return !r.ralKleur; } },

      // v114: bi-color (binnen een andere kleur). Alleen bij een rooster; Nee
      // haalt ook de kleur binnen weg.
      { kop: 'Bi-color', groep: 'kol-bi', titel: 'Bi-color rooster', html: function () {
          return '<select id="bulkVeld">' + LEEGKEUZE + opts(['Nee', 'Ja']) + '</select>'; },
        zet: function (r, v) {
          if (v === 'Ja') { if (r.rooster === 'Ja') r.biColor = 'Ja'; }
          else { delete r.biColor; delete r.ralBinnen; } },
        leeg: function (r) { return r.rooster === 'Ja' && r.biColor !== 'Ja'; } },
      { kop: 'RAL binnen', groep: 'kol-ralbin', titel: 'RAL kleur binnen (bi-color)', html: function () {
          return '<select id="bulkVeld">' + LEEGKEUZE + opts(DATA.ral_kleuren) + '</select>'; },
        zet: function (r, v) { if (r.rooster === 'Ja') { r.ralBinnen = v; r.biColor = 'Ja'; } },
        leeg: function (r) { return r.biColor === 'Ja' && !r.ralBinnen; } },

      { kop: 'Bewerking', titel: 'Glasbewerking', html: function () {
          return '<select id="bulkVeld">' + LEEGKEUZE + opts(DATA.glasbewerking) + '</select>'; },
        zet: function (r, v) { r.glasbewerking = v; },
        leeg: function (r) { return !r.glasbewerking || r.glasbewerking === 'Helder (standaard)'; } },

      { kop: 'Verdeling', titel: 'Roedenverdeling', html: function () {
          return '<select id="bulkVeld">' + LEEGKEUZE + opts(DATA.roedenverdeling) + '</select>'; },
        zet: function (r, v) { r.roedenverdeling = v; },
        leeg: function (r) { return !r.roedenverdeling || r.roedenverdeling === 'Geen roedenverdeling'; } },

      { kop: 'Breedte', groep: 'groep-roeden', titel: 'Roedenbreedte', html: function () {
          return '<select id="bulkVeld">' + LEEGKEUZE + opts(DATA.roedenbreedte) + '</select>'; },
        zet: function (r, v) { r.roedenbreedte = v; },
        leeg: function (r) { return !r.roedenbreedte; } },

      // v113: sponningdiepte en glaslat (latten.js). Het oordeel (past/krap)
      // rekent de app daarna per ruit zelf uit.
      // Tekstvak, geen getalvak: "44,5" gaf in een getalvak in Safari een lege
      // waarde, en leeg = wissen (controle v113). Een ongeldige waarde wordt
      // geweigerd vóór er iets verandert (controle()).
      // De waarden staan bij Toebehoren per ruit (latten.js rw()).
      { kop: 'Diepte', groep: 'kol-spon', titel: 'Sponningdiepte zij en boven (mm)', leegMag: true, html: function () {
          return '<input type="text" id="bulkVeld" inputmode="decimal" placeholder="mm (leeg = wissen)">'; },
        controle: function (v) {
          return window.GlasLatten && GlasLatten.diepteVan(v) === undefined
            ? '"' + v + '" is geen sponningdiepte. Vul de diepte in mm in (bijv. 45), of laat het vak leeg om te wissen.' : '';
        },
        zet: function (r, v) {
          var n = window.GlasLatten ? GlasLatten.diepteVan(v) : undefined;
          if (n !== undefined && window.toebehorenZetRuit) toebehorenZetRuit(r.id, 'sponningDiepte', n == null ? '' : n);
        },
        leeg: function (r) { return !(window.GlasLatten && GlasLatten.ruit(r).sponningDiepte > 0); } },

      // v115: op Invoer alleen nog de diepten (Jan). Onder = de onderdorpel
      // (leeg = gelijk aan Diepte). Glaslat en latzijde kies je op Toebehoren
      // (daar ook voor alle ruiten tegelijk, of per foto).
      { kop: 'Onder', groep: 'kol-sponon', titel: 'Sponningdiepte onder (mm)', leegMag: true, html: function () {
          return '<input type="text" id="bulkVeld" inputmode="decimal" placeholder="mm (leeg = gelijk aan Diepte)">'; },
        controle: function (v) {
          return window.GlasLatten && GlasLatten.diepteVan(v) === undefined
            ? '"' + v + '" is geen diepte. Vul de diepte onderin in mm in, of laat het vak leeg (= gelijk aan Diepte).' : '';
        },
        zet: function (r, v) {
          var n = window.GlasLatten ? GlasLatten.diepteVan(v) : undefined;
          if (n !== undefined && window.toebehorenZetRuit) toebehorenZetRuit(r.id, 'diepteOnder', n == null ? '' : n);
        },
        leeg: function (r) { return !(window.GlasLatten && GlasLatten.ruit(r).diepteOnder > 0); } },

      { kop: 'Opm.', groep: 'groep-glas', titel: 'Opmerking', leegMag: true, html: function () {
          return '<input type="text" id="bulkVeld" placeholder="opmerking…">'; },
        zet: function (r, v) { r.opmerking = v; },
        leeg: function (r) { return !r.opmerking; } }
    ];
  }

  /* ─── popover ──────────────────────────────────────────────── */

  function sluitPopover() {
    if (popover) { popover.remove(); popover = null; }
    document.removeEventListener('mousedown', buitenKlik, true);
  }

  function buitenKlik(e) {
    if (popover && !popover.contains(e.target)) sluitPopover();
  }

  // Elke tabel heeft zijn eigen bereik: het tabblad Invoer werkt op de
  // losse regels, een fototabel alleen op de ruiten van díe foto.
  function bereikVan() {
    var fn = popover && popover._bereik;
    return typeof fn === 'function' ? fn() : rijen.slice();
  }

  function doelen(bereik) {
    var basis = bereikVan();
    if (bereik === 'selectie') return basis.filter(function (r) { return selectie.has(r.id); });
    return basis.slice();
  }

  function openPopover(veld, th, bereikFn) {
    sluitPopover();
    var p = document.createElement('div');
    p.className = 'bulk-pop';

    var body;
    if (veld.glas) {
      var types = Object.keys(DATA.opbouw_per_type);
      body =
        '<label>Glas type</label>' +
        '<select id="bulkType" onchange="bulkTypeGewijzigd()">' +
        '<option value="">— niet wijzigen —</option>' + opts(types) + '</select>' +
        '<label style="margin-top:8px;">Opbouw</label>' +
        '<select id="bulkOpbouw"><option value="">— kies eerst een type —</option></select>';
    } else {
      body = '<label>' + esc2(veld.titel) + '</label>' + veld.html('');
    }

    var basis = typeof bereikFn === 'function' ? bereikFn() : rijen;
    var idsInBereik = {};
    basis.forEach(function (r) { idsInBereik[r.id] = true; });
    var aantalSel = 0;
    selectie.forEach(function (id) { if (idsInBereik[id]) aantalSel++; });
    p.innerHTML =
      '<div class="bulk-pop-kop">⤓ ' + esc2(veld.titel) + ' doorvoeren</div>' +
      '<div class="bulk-pop-body">' + body +
      '<div class="bulk-bereik">' +
      '<label><input type="radio" name="bulkBereik" value="alle" checked> Alle ruiten hier (' + basis.length + ')</label>' +
      '<label><input type="radio" name="bulkBereik" value="leeg"> Alleen nog lege</label>' +
      '<label' + (aantalSel ? '' : ' class="uit"') + '><input type="radio" name="bulkBereik" value="selectie"' +
      (aantalSel ? '' : ' disabled') + '> Geselecteerde (' + aantalSel + ')</label>' +
      '</div>' +
      '<div class="bulk-pop-knoppen">' +
      '<button class="btn btn-secondary btn-sm" onclick="bulkAnnuleer()">Annuleren</button>' +
      '<button class="btn btn-primary btn-sm" onclick="bulkPasToe()">Doorvoeren</button>' +
      '</div></div>';

    document.body.appendChild(p);
    popover = p;
    p._veld = veld;
    p._bereik = bereikFn;

    var r = th.getBoundingClientRect();
    var breedte = p.offsetWidth;
    var links = Math.min(r.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - breedte - 12);
    p.style.left = Math.max(window.scrollX + 8, links) + 'px';
    p.style.top = (r.bottom + window.scrollY + 4) + 'px';

    var eerste = p.querySelector('#bulkVeld, #bulkType');
    if (eerste) eerste.focus();
    setTimeout(function () { document.addEventListener('mousedown', buitenKlik, true); }, 0);
  }

  window.bulkAnnuleer = sluitPopover;


  window.bulkTypeGewijzigd = function () {
    var type = document.getElementById('bulkType').value;
    var sel = document.getElementById('bulkOpbouw');
    var lijst = type ? (DATA.opbouw_per_type[type] || []) : [];
    sel.innerHTML = '<option value="">— opbouw niet wijzigen —</option>' + opts(lijst);
  };

  window.bulkPasToe = function () {
    if (!popover) return;
    var veld = popover._veld;
    var bereik = popover.querySelector('input[name="bulkBereik"]:checked').value;
    var doel = doelen(bereik);
    var gewijzigd = 0, overgeslagen = 0, vast = 0;

    if (veld.glas) {
      var type = document.getElementById('bulkType').value;
      var opbouw = document.getElementById('bulkOpbouw').value;
      if (!type && !opbouw) { sluitPopover(); return; }
      doel.forEach(function (r) {
        if (bereik === 'leeg' && !veld.leeg(r)) { overgeslagen++; return; }
        if (type) { r.glasType = type; if (r.opbouw && (DATA.opbouw_per_type[type] || []).indexOf(r.opbouw) < 0) r.opbouw = ''; }
        if (opbouw) {
          var t = type || r.glasType;
          if (t && (DATA.opbouw_per_type[t] || []).indexOf(opbouw) >= 0) r.opbouw = opbouw;
          else { overgeslagen++; return; }
        }
        gewijzigd++;
      });
    } else {
      var el = document.getElementById('bulkVeld');
      var waarde = el.value;
      // Niets gekozen? Dan ook niets doorvoeren.
      if (waarde === '' && !veld.leegMag) { sluitPopover(); return; }
      // Een waarde die niet kan (v113): melden, niets veranderen, venster open laten.
      var fout = veld.controle ? veld.controle(waarde) : '';
      if (fout) { if (window.appFout) appFout(fout, { kop: veld.titel }); return; }
      doel.forEach(function (r) {
        if (bereik === 'leeg' && !veld.leeg(r)) { overgeslagen++; return; }
        if (veld.mag && !veld.mag(r)) { vast++; return; }
        veld.zet(r, waarde);
        gewijzigd++;
      });
    }

    sluitPopover();
    renderTabel(); herbereken(); opslaan();
    var s = document.getElementById('statusBar');
    if (s) {
      s.textContent = veld.titel + ' doorgevoerd op ' + gewijzigd + ' ruit' + (gewijzigd === 1 ? '' : 'en') +
        (overgeslagen ? ' (' + overgeslagen + ' overgeslagen)' : '') +
        (vast ? ' — ' + vast + ' niet: ' + veld.nietReden : '');
    }
    // Ook als venster (v110): de statusregel valt op een iPad weg onder de
    // balk, en dan lijkt het of alles is doorgevoerd.
    if (vast && window.appMelding) {
      appMelding(vast + (vast === 1 ? ' regel heeft' : ' regels hebben') + ' bolletjes op de foto; daar ' +
        'is het aantal niet veranderd. Bij een regel met bolletjes gaat het aantal samen met de bolletjes: ' +
        'tik op een bolletje voor een ruit erbij of eraf.', { kop: 'Aantal doorgevoerd op ' + gewijzigd +
        (gewijzigd === 1 ? ' regel' : ' regels') });
    }
  };

  /* ─── knoppen in de kolomkoppen zetten ─────────────────────── */

  window.bulkPlaatsKnoppen = function (tabel, bereikFn) {
    if (!tabel) return;
    var koppen = tabel.querySelectorAll('thead tr:last-child th');
    var lijst = velden();
    Array.prototype.forEach.call(koppen, function (th) {
      if (th.querySelector('.bulk-vul')) return;
      // alleen de eigen tekst van de kop: info-icoon en knoppen tellen niet mee
      var tekst = Array.prototype.filter.call(th.childNodes, function (n) { return n.nodeType === 3; })
        .map(function (n) { return n.textContent; }).join('')
        .replace(/\u00ad/g, '').trim();
      var veld = lijst.find(function (v) {
        if (v.kop !== tekst) return false;
        if (v.groep && !th.classList.contains(v.groep)) return false;
        return true;
      });
      if (!veld) return;
      var knop = document.createElement('span');
      knop.className = 'bulk-vul';
      knop.textContent = '⤓';
      knop.title = veld.titel + ' doorvoeren naar meerdere ruiten';
      knop.onclick = function (e) { e.stopPropagation(); openPopover(veld, th, bereikFn); };
      th.appendChild(knop);
    });
  };

  function plaatsKnoppen() {
    var body = document.getElementById('invoerBody');
    if (!body) return;
    bulkPlaatsKnoppen(body.closest('table'), function () { return losseRijen(); });
  }

  /* ─── renderTabel uitbreiden ───────────────────────────────── */

  var origRender = window.renderTabel;
  window.renderTabel = function () {
    origRender();
    rijen.forEach(function (r) {
      if (!selectie.has(r.id)) return;
      var tr = document.getElementById('rij-' + r.id);
      if (tr) tr.classList.add('geselecteerd');
    });
    // ids die niet meer bestaan uit de selectie halen
    var bestaand = new Set(rijen.map(function (r) { return r.id; }));
    Array.from(selectie).forEach(function (id) { if (!bestaand.has(id)) selectie.delete(id); });
    tekenBalk();
  };

  window.bulkIsGeselecteerd = function (id) { return selectie.has(id); };

  document.addEventListener('DOMContentLoaded', function () {
    plaatsKnoppen();
    tekenBalk();
  });
})();
