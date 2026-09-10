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

  window.fotoGekozen = function (input) {
    var file = input.files && input.files[0];
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
          fotos.push({
            id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            pad: pad, titel: '', breedte: res.breedte, hoogte: res.hoogte, markeringen: []
          });
          opslaan();
          renderFotos();
          melding('');
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
      return '<section class="foto-blok" id="blok-' + f.id + '">' +
        '<div class="foto-balk">' +
          '<span class="foto-nr">' + (i + 1) + '</span>' +
          '<input type="text" placeholder="Omschrijving, bijv. Voorgevel" value="' + esc(f.titel) + '" ' +
            'oninput="fotoTitelWijzig(\'' + f.id + '\', this.value)">' +
          '<button class="btn btn-ghost btn-sm" onclick="fotoVerwijder(\'' + f.id + '\')">🗑 Foto</button>' +
        '</div>' +
        '<div class="foto-doek" id="doek-' + f.id + '"><div class="foto-laden">Foto laden…</div></div>' +
        '<div class="foto-hint">Tik op de foto waar een ruit zit — hij krijgt de volgende merkletter en een regel hieronder.</div>' +
        '<div class="foto-tabelwrap" id="tabel-' + f.id + '"></div>' +
      '</section>';
    }).join('');

    fotos.forEach(function (f) {
      link(f.pad).then(function (url) {
        var doek = el('doek-' + f.id);
        if (!doek) return;
        if (!url) { doek.innerHTML = '<div class="foto-leeg">Foto niet beschikbaar — ben je offline?</div>'; return; }
        doek.innerHTML = '<img src="' + url + '" alt="" id="img-' + f.id + '" ' +
                         'onclick="fotoTik(event, \'' + f.id + '\')" ' +
                         'onerror="fotoLaadFout(\'' + f.id + '\')">';
        tekenMarkeringen(f.id);
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
      b.onclick = function (e) { e.stopPropagation(); markTik(fotoId, i); };
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
      wrap.innerHTML = '<div class="foto-geenrijen">Nog geen ruiten aangewezen op deze foto.</div>' + voetHTML(fotoId);
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

  function voetHTML(fotoId) {
    return '<div class="foto-voet">' +
      '<button class="btn btn-secondary btn-sm" onclick="fotoRegelToevoegen(\'' + fotoId + '\')">' +
      '+ Regel zonder markering</button>' +
      '<span class="foto-voet-info">Voor een ruit die je niet op de foto kunt aanwijzen</span></div>';
  }

  window.fotoTitelWijzig = function (id, v) {
    var f = fotoVan(id);
    if (!f) return;
    f.titel = v;
    opslaan();
  };

  window.fotoVerwijder = function (id) {
    var f = fotoVan(id);
    if (!f) return;
    var aantal = rijenVan(id).length;
    if (!confirm('Deze foto verwijderen?' + (aantal
      ? '\n\nDe ' + aantal + ' ruiten die eronder staan blijven bestaan en verhuizen naar het tabblad Invoer.'
      : ''))) return;
    if (window.bewaarStap) bewaarStap('Foto verwijderd');
    var sb = sbClient();
    if (sb) sb.storage.from(BUCKET).remove([f.pad]);
    rijen.forEach(function (r) { if (r.fotoId === id) delete r.fotoId; });
    fotos = fotos.filter(function (x) { return x.id !== id; });
    opslaan();
    renderTabel();
    renderFotos();
  };

  /* ─── ruit aanwijzen ───────────────────────────────────────── */

  window.fotoTik = function (e, fotoId) {
    var img = el('img-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!img || !foto) return;
    var r = img.getBoundingClientRect();
    // Verhoudingen in plaats van pixels: dan staat het bolletje op
    // elk scherm en op de afdruk op dezelfde plek.
    var x = (e.clientX - r.left) / r.width;
    var y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    if (window.bewaarStap) bewaarStap('Ruit aangewezen op foto');
    var rij = nieuweRij();
    rij.fotoId = fotoId;
    rij.merk = volgendMerk();
    rijen.push(rij);
    foto.markeringen.push({ rijId: rij.id, x: x, y: y });

    herbereken();
    renderTabel();
    renderFotos();
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
    renderFotos();
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
    renderFotos();
  };
})();
