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
    if (aan) rijen.forEach(function (r) { selectie.add(r.id); });
    renderTabel();
    tekenBalk();
  };

  window.bulkSelectieWissen = function () { bulkAlles(false); };

  window.bulkVerwijderSelectie = function () {
    if (!selectie.size) return;
    if (!confirm(selectie.size + ' ruit' + (selectie.size === 1 ? '' : 'en') + ' verwijderen?')) return;
    rijen = rijen.filter(function (r) { return !selectie.has(r.id); });
    selectie.clear();
    if (rijen.length === 0) voegRijenToe(5);
    renderTabel(); herbereken(); opslaan(); tekenBalk();
  };

  function tekenBalk() {
    var balk = document.getElementById('bulkBalk');
    if (!balk) return;
    if (!selectie.size) { balk.style.display = 'none'; return; }
    balk.style.display = 'flex';
    document.getElementById('bulkAantal').textContent =
      selectie.size + ' ruit' + (selectie.size === 1 ? '' : 'en') + ' geselecteerd';
    var alles = document.getElementById('bulkAllesVink');
    if (alles) alles.checked = selectie.size === rijen.length;
  }

  /* ─── kolommen die doorgevoerd kunnen worden ───────────────── */
  // kop = exacte tekst in de kolomkop; groep beperkt de match als
  // dezelfde kop twee keer voorkomt (Breedte, Opmerking).

  function velden() {
    return [
      { kop: 'Aantal', titel: 'Aantal', html: function (v) {
          return '<input type="number" id="bulkVeld" min="1" max="999" value="' + (v || 1) + '">'; },
        zet: function (r, v) { r.aantal = +v || 1; },
        leeg: function (r) { return !r.aantal || r.aantal === 1; } },

      { kop: 'Merk', titel: 'Merk / kozijn', html: function (v) {
          return '<input type="text" id="bulkVeld" value="' + esc2(v) + '" placeholder="merk…">'; },
        zet: function (r, v) { r.merk = v; },
        leeg: function (r) { return !r.merk; } },

      { kop: 'Maatsoort', titel: 'Maatsoort', html: function () {
          return '<select id="bulkVeld">' + opts(MAATSOORTEN) + '</select>'; },
        zet: function (r, v) { r.maatsoort = v; },
        leeg: function (r) { return !r.maatsoort; } },

      { kop: 'Correctie', titel: 'Speling / bijtelling', html: function () {
          return '<select id="bulkVeld"><option value="">— volg algemeen —</option>' +
                 opts(DATA.speling_opties.map(function (s) { return parseInt(s, 10); })) + '</select>'; },
        zet: function (r, v) { if (v === '') delete r.correctie; else r.correctie = +v; },
        leeg: function (r) { return r.correctie == null; } },

      { kop: 'Glas Type', titel: 'Glas type en opbouw', glas: true,
        leeg: function (r) { return !r.glasType || !r.opbouw; } },
      { kop: 'Opbouw', titel: 'Glas type en opbouw', glas: true,
        leeg: function (r) { return !r.glasType || !r.opbouw; } },

      { kop: 'Rooster', titel: 'Rooster', html: function () {
          return '<select id="bulkVeld">' + opts(ROOSTER_JA_NEE) + '</select>'; },
        zet: function (r, v) { r.rooster = v; if (v === 'Nee') { r.ducoType = ''; r.ralKleur = ''; } },
        leeg: function (r) { return r.rooster !== 'Ja'; } },

      { kop: 'Duco Type', titel: 'Duco type', html: function () {
          return '<select id="bulkVeld">' + opts(DATA.roosters.map(function (r) { return r.naam; })) + '</select>'; },
        zet: function (r, v) { r.ducoType = v; if (v) r.rooster = 'Ja'; },
        leeg: function (r) { return !r.ducoType; } },

      { kop: 'RAL Kleur', titel: 'RAL kleur', html: function () {
          return '<select id="bulkVeld">' + opts(DATA.ral_kleuren) + '</select>'; },
        zet: function (r, v) { r.ralKleur = v; },
        leeg: function (r) { return !r.ralKleur; } },

      { kop: 'Glasbewerking', titel: 'Glasbewerking', html: function () {
          return '<select id="bulkVeld">' + opts(DATA.glasbewerking) + '</select>'; },
        zet: function (r, v) { r.glasbewerking = v; },
        leeg: function (r) { return !r.glasbewerking || r.glasbewerking === 'Helder (standaard)'; } },

      { kop: 'Verdeling', titel: 'Roedenverdeling', html: function () {
          return '<select id="bulkVeld">' + opts(DATA.roedenverdeling) + '</select>'; },
        zet: function (r, v) { r.roedenverdeling = v; },
        leeg: function (r) { return !r.roedenverdeling || r.roedenverdeling === 'Geen roedenverdeling'; } },

      { kop: 'Breedte', groep: 'groep-roeden', titel: 'Roedenbreedte', html: function () {
          return '<select id="bulkVeld">' + opts(DATA.roedenbreedte) + '</select>'; },
        zet: function (r, v) { r.roedenbreedte = v; },
        leeg: function (r) { return !r.roedenbreedte; } },

      { kop: 'Opmerking', groep: 'groep-glas', titel: 'Opmerking', html: function () {
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

  function doelen(bereik) {
    if (bereik === 'selectie') return rijen.filter(function (r) { return selectie.has(r.id); });
    return rijen.slice();
  }

  function openPopover(veld, th) {
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

    var aantalSel = selectie.size;
    p.innerHTML =
      '<div class="bulk-pop-kop">⤓ ' + esc2(veld.titel) + ' doorvoeren</div>' +
      '<div class="bulk-pop-body">' + body +
      '<div class="bulk-bereik">' +
      '<label><input type="radio" name="bulkBereik" value="alle" checked> Alle ruiten (' + rijen.length + ')</label>' +
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
    var gewijzigd = 0, overgeslagen = 0;

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
      doel.forEach(function (r) {
        if (bereik === 'leeg' && !veld.leeg(r)) { overgeslagen++; return; }
        veld.zet(r, waarde);
        gewijzigd++;
      });
    }

    sluitPopover();
    renderTabel(); herbereken(); opslaan();
    var s = document.getElementById('statusBar');
    if (s) {
      s.textContent = veld.titel + ' doorgevoerd op ' + gewijzigd + ' ruit' + (gewijzigd === 1 ? '' : 'en') +
        (overgeslagen ? ' (' + overgeslagen + ' overgeslagen)' : '');
    }
  };

  /* ─── knoppen in de kolomkoppen zetten ─────────────────────── */

  function plaatsKnoppen() {
    var body = document.getElementById('invoerBody');
    if (!body) return;
    var koppen = body.closest('table').querySelectorAll('thead tr:last-child th');
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
      knop.onclick = function (e) { e.stopPropagation(); openPopover(veld, th); };
      th.appendChild(knop);
    });
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
