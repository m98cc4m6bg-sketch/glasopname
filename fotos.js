/* ═══════════════════════════════════════════════════════════════
   Glasopname – foto's met merkletters en eigen invoerregels

   Werkwijze: foto toevoegen, op de foto tikken waar een ruit zit.
   Er wordt dan automatisch de volgende vrije merkletter uitgedeeld
   (A…Z, daarna A1…Z1, A2…) en direct onder de foto verschijnt een
   invoerregel voor die ruit — dezelfde regel als op het tabblad
   Invoer, met alle kolommen en functies.

   De regels staan in dezelfde lijst `rijen` als de losse invoer,
   met een verwijzing naar hun foto. Zo blijven bestellijst,
   samenvatting en export met één bron werken.

   De afbeeldingen zelf gaan naar Supabase Storage; in het project
   staat alleen het pad, de markeringen en de verhoudingen.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var BUCKET = 'projectfotos';
  var MAX_ZIJDE = 1600;
  var KWALITEIT = 0.82;
  var LINK_GELDIG = 8 * 3600;

  var linkCache = {};

  function el(id) { return document.getElementById(id); }
  function sbClient() { return window.glasSupabase || null; }
  function fotoVan(id) { return fotos.find(function (f) { return f.id === id; }); }
  function rijenVan(fotoId) { return rijen.filter(function (r) { return r.fotoId === fotoId; }); }

  /* ─── merkletters ──────────────────────────────────────────── */
  // A t/m Z, daarna A1 t/m Z1, A2 … Al gebruikte letters worden
  // overgeslagen, ook die van losse regels.

  window.volgendMerk = function () {
    var gebruikt = {};
    rijen.forEach(function (r) {
      var m = (r.merk || '').trim().toUpperCase();
      if (m) gebruikt[m] = true;
    });
    for (var ronde = 0; ronde < 200; ronde++) {
      for (var i = 0; i < 26; i++) {
        var letter = String.fromCharCode(65 + i) + (ronde ? ronde : '');
        if (!gebruikt[letter]) return letter;
      }
    }
    return '?';
  };

  function labelVan(rij) {
    if (!rij) return '?';
    return (rij.merk && rij.merk.trim()) ? rij.merk.trim() : '·';
  }

  /* ─── verkleinen en uploaden ───────────────────────────────── */

  function verklein(file) {
    return new Promise(function (ok, fout) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var schaal = Math.min(1, MAX_ZIJDE / Math.max(img.width, img.height));
        var b = Math.round(img.width * schaal);
        var h = Math.round(img.height * schaal);
        var c = document.createElement('canvas');
        c.width = b; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, b, h);
        c.toBlob(function (blob) {
          if (!blob) { fout(new Error('Verkleinen mislukt')); return; }
          ok({ blob: blob, breedte: b, hoogte: h });
        }, 'image/jpeg', KWALITEIT);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fout(new Error('Kan de afbeelding niet lezen')); };
      img.src = url;
    });
  }

  var doelGroep = null;   // groep waar de volgende upload in hoort

  window.fotoAanGroep = function (fotoId) {
    doelGroep = fotoId;
    document.getElementById('fotoBestand').click();
  };

  window.fotoGekozen = function (input) {
    var file = input.files && input.files[0];
    var groep = doelGroep;
    doelGroep = null;
    input.value = '';
    if (!file) return;
    var sb = sbClient();
    if (!sb || !window.glasProjectId) {
      melding('Open eerst een project en zorg dat je online bent.', true);
      return;
    }
    melding('Foto verkleinen…');
    verklein(file).then(function (res) {
      var pad = window.glasProjectId + '/' + Date.now() + '-' +
                Math.random().toString(36).slice(2, 8) + '.jpg';
      melding('Uploaden… (' + Math.round(res.blob.size / 1024) + ' kB)');
      console.log('[foto] uploaden naar', pad, res.blob.size, 'bytes');
      // Zonder tijdslimiet blijft een verzoek dat nooit antwoordt eeuwig
      // hangen en zie je alleen 'Uploaden…' staan.
      var klaar = sb.storage.from(BUCKET).upload(pad, res.blob, { contentType: 'image/jpeg' });
      var klok = new Promise(function (_, fout) {
        setTimeout(function () {
          fout(new Error('geen antwoord van Supabase binnen 45 seconden — ' +
                         'wordt de verbinding geblokkeerd (VPN, contentblocker, firewall)?'));
        }, 45000);
      });
      return Promise.race([klaar, klok])
        .then(function (up) {
          console.log('[foto] antwoord', up);
          if (up.error) throw new Error(up.error.message + (up.error.statusCode ? ' (code ' + up.error.statusCode + ')' : ''));
          var bestaand = groep ? fotoVan(groep) : null;
          if (bestaand) {
            // Nieuwe foto in een groep die zijn foto kwijt was: de ruiten
            // blijven, de markeringen moeten opnieuw aangewezen worden.
            bestaand.pad = pad;
            bestaand.breedte = res.breedte;
            bestaand.hoogte = res.hoogte;
            bestaand.markeringen = [];
          } else {
            fotos.push({
              id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              pad: pad, titel: '', breedte: res.breedte, hoogte: res.hoogte, markeringen: []
            });
          }
          opslaan();
          renderFotos();
          melding('');
          if (bestaand && rijenVan(bestaand.id).length) {
            setTimeout(function () { fotoAanwijzen(bestaand.id); }, 300);
          }
        });
    }).catch(function (e) {
      console.error('[foto] uploaden mislukt', e);
      melding('Mislukt: ' + e.message, true);
    });
  };

  function melding(tekst, fout) {
    var m = el('fotoMelding');
    if (!m) return;
    m.textContent = tekst || '';
    m.style.color = fout ? 'var(--rood)' : 'var(--grijs-tekst)';
  }

  function link(pad) {
    if (linkCache[pad]) return Promise.resolve(linkCache[pad]);
    var sb = sbClient();
    if (!sb) return Promise.resolve(null);
    return sb.storage.from(BUCKET).createSignedUrl(pad, LINK_GELDIG).then(function (res) {
      if (res.error || !res.data) {
        console.error('[foto] geen link voor', pad, res.error);
        return null;
      }
      linkCache[pad] = res.data.signedUrl;
      return res.data.signedUrl;
    }).catch(function (e) {
      console.error('[foto] link ophalen mislukt', pad, e);
      return null;
    });
  }

  /* ─── tekenen ──────────────────────────────────────────────── */

  // Tijdelijke links verlopen en horen bij één project.
  window.fotoLinksVergeten = function () { linkCache = {}; };

  window.renderFotos = function () {
    var houder = el('fotoHouder');
    if (!houder) return;

    if (!fotos.length) {
      houder.innerHTML = '<div class="foto-leeg">Nog geen foto\'s.<br>' +
        'Voeg een foto van de bestaande situatie toe en tik daarna op elke ruit: ' +
        'die krijgt een merkletter en een invoerregel onder de foto.</div>';
      return;
    }

    houder.innerHTML = fotos.map(function (f, i) {
      var kop =
        '<div class="foto-balk">' +
          '<span class="foto-nr">' + (i + 1) + '</span>' +
          '<input type="text" placeholder="Omschrijving, bijv. Voorgevel" value="' + esc(f.titel) + '" ' +
            'oninput="fotoTitelWijzig(\'' + f.id + '\', this.value)">' +
          (f.pad ? '<button class="btn btn-ghost btn-sm" onclick="fotoVerwijder(\'' + f.id + '\')">🗑 Foto</button>' : '') +
          '<button class="btn btn-ghost btn-sm" onclick="groepVerwijder(\'' + f.id + '\')">🗑 Groep</button>' +
        '</div>';

      var zoom = f.zoom || 100;
      var midden = f.pad
        ? '<div class="foto-zoombalk">' +
            '<button class="btn btn-ghost btn-sm" onclick="fotoZoom(\'' + f.id + '\', -25)">−</button>' +
            '<span class="foto-zoomwaarde" id="zoomwaarde-' + f.id + '">' + zoom + '%</span>' +
            '<button class="btn btn-ghost btn-sm" onclick="fotoZoom(\'' + f.id + '\', 25)">+</button>' +
            '<button class="btn btn-ghost btn-sm" onclick="fotoZoom(\'' + f.id + '\', 0)">Passend</button>' +
            '<button class="btn btn-secondary btn-sm tk-schakel" onclick="tekenModus(\'' + f.id + '\')">✏️ Tekenen</button>' +
          '</div>' +
          '<div class="teken-balk" id="tekenbalk-' + f.id + '"></div>' +
          '<div class="foto-scroll"><div class="foto-doek" id="doek-' + f.id + '" style="width:' + zoom + '%">' +
            '<div class="foto-laden">Foto laden…</div></div></div>' +
          '<div class="foto-aanwijsbalk" id="aanwijs-' + f.id + '"></div>' +
          '<div class="foto-hint">Tik op de foto om een ruit toe te voegen. Sleep een bolletje om het te verplaatsen, ' +
          'of tik erop voor meer keuzes.</div>'
        : '<div class="foto-geenfoto">Deze groep heeft geen foto (meer). De ruiten hieronder blijven gewoon bestaan.' +
          '<button class="btn btn-primary btn-sm" onclick="fotoAanGroep(\'' + f.id + '\')">+ Foto toevoegen</button></div>';

      return '<section class="foto-blok' + (f.pad ? '' : ' zonder-foto') + '" id="blok-' + f.id + '">' +
        kop + midden + '<div class="foto-tabelwrap" id="tabel-' + f.id + '"></div></section>';
    }).join('');

    fotos.forEach(function (f) {
      if (!f.pad) { tekenTabel(f.id); return; }
      link(f.pad).then(function (url) {
        var doek = el('doek-' + f.id);
        if (!doek) return;
        if (!url) { doek.innerHTML = '<div class="foto-leeg">Foto niet beschikbaar — ben je offline?</div>'; return; }
        doek.innerHTML = '<img src="' + url + '" alt="" id="img-' + f.id + '" ' +
                         'onclick="fotoTik(event, \'' + f.id + '\')" ' +
                         'onerror="fotoLaadFout(\'' + f.id + '\')">';
        doek.addEventListener('click', function (ev) {
          if (Date.now() < negeerTikTot) { ev.preventDefault(); ev.stopPropagation(); }
        }, true);
        tekenMarkeringen(f.id);
        if (window.tekenInit) tekenInit(f.id);
      });
      tekenTabel(f.id);
    });
  };

  window.fotoLaadFout = function (fotoId) {
    var doek = el('doek-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!doek || !foto) return;
    console.error('[foto] afbeelding laadt niet', foto.pad);
    doek.innerHTML = '<div class="foto-leeg">De foto kon niet geladen worden.<br>' +
      'Het bestand staat er wel (' + esc(foto.pad) + '), maar dit apparaat krijgt hem niet binnen.<br>' +
      'Meestal een VPN, contentblocker of firewall die Supabase tegenhoudt.<br>' +
      '<button class="btn btn-secondary btn-sm" style="margin-top:10px" ' +
      'onclick="fotoOpnieuw(\'' + fotoId + '\')">Opnieuw proberen</button></div>';
  };

  window.fotoOpnieuw = function (fotoId) {
    var foto = fotoVan(fotoId);
    if (foto) delete linkCache[foto.pad];
    renderFotos();
  };

  // Alleen de letters in de bolletjes verversen. Het hele blok opnieuw
  // tekenen zou de cel waar je net uit stapte weggooien, en dan valt de
  // focus weg terwijl je aan het doortabben bent.
  // Alleen de tabellen en bolletjes opnieuw opbouwen. De afbeelding
  // blijft staan — die opnieuw laden geeft geflikker bij elke tik.
  window.renderFotoTabellen = function () {
    var houder = el('fotoHouder');
    if (!houder) return;
    if (!fotos.length || !houder.querySelector('.foto-blok')) { renderFotos(); return; }
    if (fotos.some(function (f) { return !el('blok-' + f.id); })) { renderFotos(); return; }
    fotos.forEach(function (f) {
      if (f.pad) {
        tekenMarkeringen(f.id);
        if (window.tekenInit) tekenInit(f.id);
      }
      tekenTabel(f.id);
    });
    tekenAanwijsbalk();
  };

  window.fotoLabelsBijwerken = function () {
    fotos.forEach(function (f) {
      var doek = el('doek-' + f.id);
      if (!doek) return;
      var bollen = doek.querySelectorAll('.foto-mark');
      f.markeringen.forEach(function (m, i) {
        var bol = bollen[i];
        if (!bol) return;
        var rij = getRij(m.rijId);
        bol.textContent = rij ? labelVan(rij) : '?';
        bol.className = 'foto-mark' + (rij ? '' : ' verweesd');
      });
    });
  };

  function tekenMarkeringen(fotoId) {
    var doek = el('doek-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!doek || !foto) return;
    Array.prototype.forEach.call(doek.querySelectorAll('.foto-mark'), function (m) { m.remove(); });
    foto.markeringen.forEach(function (m, i) {
      var rij = getRij(m.rijId);
      var b = document.createElement('button');
      b.className = 'foto-mark' + (rij ? '' : ' verweesd');
      b.style.left = (m.x * 100) + '%';
      b.style.top = (m.y * 100) + '%';
      b.textContent = rij ? labelVan(rij) : '?';
      b.title = rij ? 'Naar de regel van ' + labelVan(rij) : 'De regel bij deze markering bestaat niet meer';
      maakSleepbaar(b, fotoId, i);
      // Een klik die op het bolletje zelf landt mag nooit doorlekken
      // naar de foto eronder.
      b.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); });
      doek.appendChild(b);
    });
  }

  // Dezelfde tabel als op het tabblad Invoer: de kop wordt daar
  // letterlijk van overgenomen, zodat een extra kolom nooit op twee
  // plekken bijgehouden hoeft te worden.
  function tekenTabel(fotoId) {
    var wrap = el('tabel-' + fotoId);
    if (!wrap) return;
    var eigen = rijenVan(fotoId);
    var body = document.getElementById('invoerBody');
    var kop = body ? body.closest('table').querySelector('thead') : null;

    if (!eigen.length) {
      wrap.innerHTML = '<div class="foto-geenrijen">Nog geen ruiten in deze groep.</div>' + voetHTML(fotoId);
      return;
    }

    wrap.innerHTML =
      '<div class="invoer-wrap"><table class="invoer">' +
        (kop ? kop.outerHTML : '') +
        '<tbody id="fotoBody-' + fotoId + '"></tbody>' +
      '</table></div>' + voetHTML(fotoId);

    vulTabelBody(el('fotoBody-' + fotoId), eigen);

    var tabel = el('fotoBody-' + fotoId).closest('table');
    // De gekopieerde kop bevat de vulknopjes van het tabblad Invoer, maar
    // zonder hun klikafhandeling. Eerst weg, dan opnieuw plaatsen met het
    // bereik van déze foto.
    Array.prototype.forEach.call(tabel.querySelectorAll('.bulk-vul'), function (k) { k.remove(); });
    if (window.bulkPlaatsKnoppen) {
      bulkPlaatsKnoppen(tabel, function () { return rijenVan(fotoId); });
    }
  }

  // Ruiten die nog nergens op een foto staan. Ook losse regels tellen
  // mee, zodat je een geïmporteerde lijst alsnog op een foto kunt zetten.
  window.zonderMarkering = function (fotoId) {
    var gemarkeerd = {};
    fotos.forEach(function (f) {
      f.markeringen.forEach(function (m) { gemarkeerd[m.rijId] = true; });
    });
    return rijen.filter(function (r) {
      if (gemarkeerd[r.id]) return false;
      if (r.fotoId && r.fotoId !== fotoId) return false;
      return !!(r.merk || r.breedte || r.hoogte || r.glasType);
    });
  };

  function voetHTML(fotoId) {
    var foto = fotoVan(fotoId);
    var open = zonderMarkering(fotoId);
    return '<div class="foto-voet">' +
      '<button class="btn btn-secondary btn-sm" onclick="fotoRegelToevoegen(\'' + fotoId + '\')">' +
      '+ Regel zonder markering</button>' +
      (foto && foto.pad && open.length
        ? '<button class="btn btn-primary btn-sm" onclick="fotoAanwijzen(\'' + fotoId + '\')">' +
          '🎯 Ruiten aanwijzen (' + open.length + ')</button>'
        : '') +
      '<span class="foto-voet-info">Bestaande merkletters kun je met \u2039Ruiten aanwijzen\u203a alsnog op de foto zetten</span></div>';
  }

  // De bolletjes staan op een percentage van de fotobreedte, dus ze
  // schuiven vanzelf mee als de foto groter of kleiner wordt.
  window.fotoZoom = function (id, stap) {
    var foto = fotoVan(id);
    if (!foto) return;
    var nu = foto.zoom || 100;
    foto.zoom = stap === 0 ? 100 : Math.min(400, Math.max(50, nu + stap));
    var doek = el('doek-' + id);
    var waarde = el('zoomwaarde-' + id);
    if (doek) doek.style.width = foto.zoom + '%';
    if (waarde) waarde.textContent = foto.zoom + '%';
    opslaan();
  };

  window.fotoTitelWijzig = function (id, v) {
    var f = fotoVan(id);
    if (!f) return;
    f.titel = v;
    opslaan();
  };

  // Alleen de afbeelding weg. De groep en zijn ruiten blijven staan,
  // zodat je er een nieuwe foto in kunt hangen en de letters opnieuw
  // kunt aanwijzen.
  window.fotoVerwijder = function (id) {
    var f = fotoVan(id);
    if (!f || !f.pad) return;
    var aantal = rijenVan(id).length;
    if (!confirm('De foto verwijderen?' + (aantal
      ? '\n\nDe ' + aantal + ' ruiten eronder blijven staan. Je kunt er daarna een nieuwe foto in zetten ' +
        'en dezelfde merkletters opnieuw aanwijzen.'
      : ''))) return;
    if (window.bewaarStap) bewaarStap('Foto verwijderd');
    var sb = sbClient();
    if (sb) sb.storage.from(BUCKET).remove([f.pad]);
    f.pad = null;
    f.markeringen = [];
    aanwijzen = null;
    opslaan();
    renderFotos();
  };

  // De hele groep weg, inclusief de keuze wat er met de ruiten gebeurt.
  window.groepVerwijder = function (id) {
    var f = fotoVan(id);
    if (!f) return;
    var eigen = rijenVan(id);
    if (!confirm('Deze groep verwijderen?')) return;
    var ookRuiten = false;
    if (eigen.length) {
      ookRuiten = confirm('Wat moet er met de ' + eigen.length + ' ruiten in deze groep gebeuren?\n\n' +
        'OK = ruiten ook verwijderen\n' +
        'Annuleren = ruiten bewaren, ze verhuizen naar het tabblad Invoer');
    }
    if (window.bewaarStap) bewaarStap('Groep verwijderd');
    var sb = sbClient();
    if (sb && f.pad) sb.storage.from(BUCKET).remove([f.pad]);
    if (ookRuiten) {
      var weg = {};
      eigen.forEach(function (r) { weg[r.id] = true; });
      rijen = rijen.filter(function (r) { return !weg[r.id]; });
    } else {
      rijen.forEach(function (r) { if (r.fotoId === id) delete r.fotoId; });
    }
    fotos = fotos.filter(function (x) { return x.id !== id; });
    aanwijzen = null;
    opslaan();
    renderTabel();
    renderFotos();
  };

  /* ─── ruit aanwijzen ───────────────────────────────────────── */

  /* ─── bestaande ruiten aanwijzen ───────────────────────────── */
  // Voor een nieuwe foto bij een bestaande groep, of om geïmporteerde
  // regels alsnog een plek op de foto te geven. Je tikt ze één voor
  // één aan; de app houdt bij welke aan de beurt is.

  var aanwijzen = null;   // { fotoId, wachtrij: [rijId] }

  // Na het aanraken van een bolletje stuurt iOS alsnog een klik naar de
  // foto eronder. Zonder deze pauze komt er bij elk sleepje een extra
  // ruit bij. Wordt bij elke aanraking opnieuw opgeschoven.
  var negeerTikTot = 0;
  function pauzeerFototik(ms) { negeerTikTot = Date.now() + (ms || 700); }

  window.fotoAanwijzen = function (fotoId) {
    var open = zonderMarkering(fotoId);
    if (!open.length) { aanwijzenStop(); return; }
    aanwijzen = { fotoId: fotoId, wachtrij: open.map(function (r) { return r.id; }) };
    tekenAanwijsbalk();
  };

  window.aanwijzenStop = function () {
    aanwijzen = null;
    tekenAanwijsbalk();
  };

  window.aanwijzenOverslaan = function () {
    if (!aanwijzen) return;
    aanwijzen.wachtrij.push(aanwijzen.wachtrij.shift());
    tekenAanwijsbalk();
  };

  function tekenAanwijsbalk() {
    fotos.forEach(function (f) {
      var balk = el('aanwijs-' + f.id);
      if (!balk) return;
      if (!aanwijzen || aanwijzen.fotoId !== f.id || !aanwijzen.wachtrij.length) {
        balk.style.display = 'none';
        balk.innerHTML = '';
        return;
      }
      var rij = getRij(aanwijzen.wachtrij[0]);
      if (!rij) { aanwijzen.wachtrij.shift(); tekenAanwijsbalk(); return; }
      balk.style.display = 'flex';
      balk.innerHTML =
        '<span class="aanwijs-letter">' + esc(labelVan(rij)) + '</span>' +
        '<span class="aanwijs-tekst">Tik op de foto waar deze ruit zit' +
        (rij.breedte && rij.hoogte ? ' (' + rij.breedte + ' × ' + rij.hoogte + ')' : '') +
        ' — nog ' + aanwijzen.wachtrij.length + ' te gaan</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="aanwijzenOverslaan()">Overslaan</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="aanwijzenStop()">Klaar</button>';
    });
  }

  window.fotoTik = function (e, fotoId) {
    if (Date.now() < negeerTikTot) return;   // naklik na het slepen
    var img = el('img-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!img || !foto) return;
    var r = img.getBoundingClientRect();
    // Verhoudingen in plaats van pixels: dan staat het bolletje op
    // elk scherm en op de afdruk op dezelfde plek.
    var x = (e.clientX - r.left) / r.width;
    var y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    // In aanwijsmodus krijgt een bestaande ruit zijn plek, in plaats van
    // dat er een nieuwe ruit met een nieuwe letter bij komt.
    if (aanwijzen && aanwijzen.fotoId === fotoId && aanwijzen.wachtrij.length) {
      var bestaandeId = aanwijzen.wachtrij.shift();
      var bestaande = getRij(bestaandeId);
      if (bestaande) {
        if (window.bewaarStap) bewaarStap('Ruit ' + labelVan(bestaande) + ' aangewezen');
        fotos.forEach(function (g) {
          g.markeringen = g.markeringen.filter(function (m) { return m.rijId !== bestaandeId; });
        });
        bestaande.fotoId = fotoId;
        foto.markeringen.push({ rijId: bestaandeId, x: x, y: y });
        herbereken();
        renderTabel();
        opslaan();
      }
      if (!aanwijzen.wachtrij.length) aanwijzen = null;
      tekenAanwijsbalk();
      return;
    }

    if (window.bewaarStap) bewaarStap('Ruit aangewezen op foto');
    var rij = nieuweRij();
    rij.fotoId = fotoId;
    rij.merk = volgendMerk();
    rijen.push(rij);
    foto.markeringen.push({ rijId: rij.id, x: x, y: y });

    herbereken();
    renderTabel();
    opslaan();
    setTimeout(function () { focusRij(rij.id); }, 80);
  };

  window.fotoRegelToevoegen = function (fotoId) {
    if (window.bewaarStap) bewaarStap('Regel toegevoegd');
    var rij = nieuweRij();
    rij.fotoId = fotoId;
    rij.merk = volgendMerk();
    rijen.push(rij);
    herbereken();
    renderTabel();
    opslaan();
    setTimeout(function () { focusRij(rij.id); }, 80);
  };

  function focusRij(id) {
    var tr = el('rij-' + id);
    if (!tr) return;
    var invoer = tr.querySelector('input[type="number"], input[type="text"]');
    if (invoer) invoer.focus();
    tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // Slepen verplaatst het bolletje, tikken opent het menu. Het verschil
  // zit in de afgelegde afstand: onder de vier pixels is het een tik.
  function maakSleepbaar(bol, fotoId, index) {
    var start = null, gesleept = false, positie = null, drempel = 4;

    bol.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      start = { x: e.clientX, y: e.clientY };
      // Met een vinger sta je nooit helemaal stil; met een muis wel.
      drempel = e.pointerType === 'mouse' ? 4 : 10;
      gesleept = false;
      positie = null;
      pauzeerFototik();
      try { bol.setPointerCapture(e.pointerId); } catch (err) {}
      bol.classList.add('sleept');
    });

    bol.addEventListener('pointermove', function (e) {
      if (!start) return;
      pauzeerFototik();
      if (!gesleept &&
          Math.abs(e.clientX - start.x) < drempel && Math.abs(e.clientY - start.y) < drempel) return;
      gesleept = true;
      var img = el('img-' + fotoId);
      if (!img) return;
      var r = img.getBoundingClientRect();
      var x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      var y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      positie = { x: x, y: y };
      bol.style.left = (x * 100) + '%';
      bol.style.top = (y * 100) + '%';
    });

    function klaar(e) {
      if (!start) return;
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      pauzeerFototik();
      start = null;
      bol.classList.remove('sleept');
      try { bol.releasePointerCapture(e.pointerId); } catch (err) {}
      var foto = fotoVan(fotoId);
      if (gesleept && positie && foto && foto.markeringen[index]) {
        if (window.bewaarStap) bewaarStap('Markering verplaatst');
        foto.markeringen[index].x = positie.x;
        foto.markeringen[index].y = positie.y;
        opslaan();
      } else if (!gesleept) {
        markMenu(fotoId, index, bol);
      }
    }
    bol.addEventListener('pointerup', klaar);
    bol.addEventListener('pointercancel', klaar);
  }

  /* ─── menu bij een bolletje ────────────────────────────────── */

  var menu = null;

  function sluitMenu() {
    if (menu) { menu.remove(); menu = null; }
    document.removeEventListener('pointerdown', menuBuiten, true);
  }

  function menuBuiten(e) {
    if (menu && !menu.contains(e.target)) sluitMenu();
  }

  function markMenu(fotoId, index, bol) {
    sluitMenu();
    var foto = fotoVan(fotoId);
    var m = foto.markeringen[index];
    var rij = getRij(m.rijId);

    var d = document.createElement('div');
    d.className = 'mark-menu';
    d.innerHTML =
      '<div class="mark-menu-kop">' + esc(rij ? labelVan(rij) : '?') + '</div>' +
      (rij ? '<button onclick="markNaarRegel(\'' + fotoId + '\',' + index + ')">Naar de regel</button>' : '') +
      '<button onclick="markWeg(\'' + fotoId + '\',' + index + ')">Alleen markering verwijderen</button>' +
      (rij ? '<button class="gevaar" onclick="markRuitWeg(\'' + fotoId + '\',' + index + ')">Ruit verwijderen</button>' : '') +
      '<button onclick="markMenuSluit()">Annuleren</button>';
    document.body.appendChild(d);
    menu = d;

    var r = bol.getBoundingClientRect();
    var links = Math.min(r.left + window.scrollX,
      window.scrollX + document.documentElement.clientWidth - d.offsetWidth - 10);
    d.style.left = Math.max(window.scrollX + 8, links) + 'px';
    d.style.top = (r.bottom + window.scrollY + 6) + 'px';
    setTimeout(function () { document.addEventListener('pointerdown', menuBuiten, true); }, 0);
  }

  window.markMenuSluit = sluitMenu;

  window.markNaarRegel = function (fotoId, index) {
    sluitMenu();
    markTik(fotoId, index);
  };

  window.markWeg = function (fotoId, index) {
    sluitMenu();
    var foto = fotoVan(fotoId);
    if (!foto) return;
    if (window.bewaarStap) bewaarStap('Markering verwijderd');
    foto.markeringen.splice(index, 1);
    opslaan();
    renderFotoTabellen();
  };

  window.markRuitWeg = function (fotoId, index) {
    var foto = fotoVan(fotoId);
    var m = foto && foto.markeringen[index];
    var rij = m && getRij(m.rijId);
    sluitMenu();
    if (!rij) return;
    if (!confirm('Ruit ' + labelVan(rij) + ' helemaal verwijderen, inclusief de ingevulde maten?')) return;
    verwijderRij(rij.id);
    renderFotoTabellen();
  };

  function markTik(fotoId, index) {
    var foto = fotoVan(fotoId);
    var m = foto.markeringen[index];
    var rij = getRij(m.rijId);
    if (!rij) {
      if (confirm('De regel bij deze markering bestaat niet meer. Markering verwijderen?')) {
        foto.markeringen.splice(index, 1);
        opslaan();
        renderFotos();
      }
      return;
    }
    var tr = el('rij-' + rij.id);
    if (!tr) return;
    tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
    tr.classList.add('gemarkeerd');
    setTimeout(function () { tr.classList.remove('gemarkeerd'); }, 2200);
  }

  /* ─── markeringen opruimen bij een verwijderde regel ───────── */

  var origVerwijder = window.verwijderRij;
  window.verwijderRij = function (id) {
    fotos.forEach(function (f) {
      f.markeringen = f.markeringen.filter(function (m) { return m.rijId !== id; });
    });
    origVerwijder(id);
  };
})();
