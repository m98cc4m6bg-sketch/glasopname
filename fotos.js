/* ═══════════════════════════════════════════════════════════════
   Glasopname – foto's met merkmarkeringen
   Een foto van de bestaande situatie, met daarop bolletjes die aan
   een regel uit de invoerlijst vastzitten. Verandert het merk in de
   tabel, dan verandert het bolletje mee; verdwijnt de regel, dan
   verdwijnt het bolletje. De markeringen zijn dus gegevens, geen
   tekening.

   Foto's zelf gaan naar Supabase Storage. In het project staat
   alleen het pad, de markeringen en de verhoudingen — nooit de
   afbeelding, want het project wordt bij elke wijziging in zijn
   geheel opnieuw weggeschreven.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var BUCKET = 'projectfotos';
  var MAX_ZIJDE = 1600;      // langste zijde na verkleinen
  var KWALITEIT = 0.82;
  var LINK_GELDIG = 8 * 3600;

  var actieveFoto = null;    // id van de foto die opengeslagen is
  var wachtOpRij = null;     // {x, y} van de tik die op een regel wacht
  var linkCache = {};        // pad -> tijdelijke link

  function el(id) { return document.getElementById(id); }
  function sbClient() { return window.glasSupabase || null; }

  /* ─── merkletter van een regel ─────────────────────────────── */

  function labelVan(rij) {
    if (!rij) return '?';
    if (rij.merk && rij.merk.trim()) return rij.merk.trim();
    var n = rijen.indexOf(rij);
    return n >= 0 ? String(n + 1) : '?';
  }

  function omschrijving(rij) {
    var maten = (rij.breedte && rij.hoogte) ? rij.breedte + ' × ' + rij.hoogte : 'geen maat';
    return maten + (rij.glasType ? ' · ' + rij.glasType : '');
  }

  /* ─── foto verkleinen vóór het uploaden ────────────────────── */

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

  /* ─── uploaden ─────────────────────────────────────────────── */

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
      var naam = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      var pad = window.glasProjectId + '/' + naam;
      melding('Uploaden… (' + Math.round(res.blob.size / 1024) + ' kB)');
      return sb.storage.from(BUCKET).upload(pad, res.blob, { contentType: 'image/jpeg' })
        .then(function (up) {
          if (up.error) throw new Error(up.error.message);
          fotos.push({
            id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            pad: pad,
            titel: '',
            breedte: res.breedte,
            hoogte: res.hoogte,
            markeringen: []
          });
          actieveFoto = fotos[fotos.length - 1].id;
          opslaan();
          renderFotos();
          melding('');
        });
    }).catch(function (e) {
      melding('Mislukt: ' + e.message, true);
    });
  };

  function melding(tekst, fout) {
    var m = el('fotoMelding');
    if (!m) return;
    m.textContent = tekst || '';
    m.style.color = fout ? 'var(--rood)' : 'var(--grijs-tekst)';
  }

  /* ─── tijdelijke links ophalen ─────────────────────────────── */

  function link(pad) {
    if (linkCache[pad]) return Promise.resolve(linkCache[pad]);
    var sb = sbClient();
    if (!sb) return Promise.resolve(null);
    return sb.storage.from(BUCKET).createSignedUrl(pad, LINK_GELDIG).then(function (res) {
      if (res.error || !res.data) return null;
      linkCache[pad] = res.data.signedUrl;
      return res.data.signedUrl;
    });
  }

  /* ─── tekenen ──────────────────────────────────────────────── */

  window.renderFotos = function () {
    var lijst = el('fotoLijst');
    var werkblad = el('fotoWerkblad');
    if (!lijst || !werkblad) return;

    if (!fotos.length) {
      lijst.innerHTML = '';
      werkblad.innerHTML = '<div class="foto-leeg">Nog geen foto\'s. Voeg een foto van de bestaande situatie toe ' +
        'en tik erop om een ruit aan te wijzen.</div>';
      return;
    }

    if (!fotos.some(function (f) { return f.id === actieveFoto; })) actieveFoto = fotos[0].id;

    lijst.innerHTML = fotos.map(function (f) {
      return '<button class="foto-tab' + (f.id === actieveFoto ? ' actief' : '') + '" onclick="fotoKies(\'' + f.id + '\')">' +
        (f.titel || 'Foto ' + (fotos.indexOf(f) + 1)) +
        ' <span class="foto-telling">' + f.markeringen.length + '</span></button>';
    }).join('');

    var foto = fotos.find(function (f) { return f.id === actieveFoto; });
    werkblad.innerHTML =
      '<div class="foto-balk">' +
        '<input type="text" id="fotoTitel" placeholder="Omschrijving, bijv. Voorgevel" value="' +
          esc(foto.titel) + '" oninput="fotoTitelWijzig(this.value)">' +
        '<button class="btn btn-ghost btn-sm" onclick="fotoVerwijder()">🗑 Foto verwijderen</button>' +
      '</div>' +
      '<div class="foto-doek" id="fotoDoek"><div class="foto-laden">Foto laden…</div></div>' +
      '<div class="foto-hint">Tik op de foto om een ruit aan te wijzen. Tik op een bolletje om de regel te zien.</div>';

    link(foto.pad).then(function (url) {
      var doek = el('fotoDoek');
      if (!doek) return;
      if (!url) { doek.innerHTML = '<div class="foto-leeg">Foto niet beschikbaar — ben je offline?</div>'; return; }
      doek.innerHTML = '<img src="' + url + '" alt="" id="fotoAfbeelding" onclick="fotoTik(event)">';
      tekenMarkeringen();
    });
  };

  function tekenMarkeringen() {
    var doek = el('fotoDoek');
    var foto = fotos.find(function (f) { return f.id === actieveFoto; });
    if (!doek || !foto) return;
    doek.querySelectorAll('.foto-mark').forEach(function (m) { m.remove(); });
    foto.markeringen.forEach(function (m, i) {
      var rij = getRij(m.rijId);
      var b = document.createElement('button');
      b.className = 'foto-mark' + (rij ? '' : ' verweesd');
      b.style.left = (m.x * 100) + '%';
      b.style.top = (m.y * 100) + '%';
      b.textContent = rij ? labelVan(rij) : '?';
      b.title = rij ? omschrijving(rij) : 'De regel bij deze markering bestaat niet meer';
      b.onclick = function (e) { e.stopPropagation(); markTik(i); };
      doek.appendChild(b);
    });
  }

  window.fotoKies = function (id) { actieveFoto = id; renderFotos(); };

  window.fotoTitelWijzig = function (v) {
    var foto = fotos.find(function (f) { return f.id === actieveFoto; });
    if (!foto) return;
    foto.titel = v;
    opslaan();
  };

  window.fotoVerwijder = function () {
    var foto = fotos.find(function (f) { return f.id === actieveFoto; });
    if (!foto) return;
    if (!confirm('Deze foto en zijn markeringen verwijderen?')) return;
    var sb = sbClient();
    if (sb) sb.storage.from(BUCKET).remove([foto.pad]);
    fotos = fotos.filter(function (f) { return f.id !== foto.id; });
    actieveFoto = fotos.length ? fotos[0].id : null;
    opslaan();
    renderFotos();
  };

  /* ─── markering plaatsen ───────────────────────────────────── */

  window.fotoTik = function (e) {
    var img = el('fotoAfbeelding');
    if (!img) return;
    var r = img.getBoundingClientRect();
    // Verhoudingen, geen pixels: dan klopt het bolletje op elk scherm
    // en op de afdruk, ongeacht hoe groot de foto getoond wordt.
    wachtOpRij = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    toonRijKiezer();
  };

  function toonRijKiezer() {
    var venster = el('fotoRijKiezer');
    var lijst = el('fotoRijLijst');
    var bruikbaar = rijen.filter(function (r) { return r.merk || r.breedte || r.hoogte || r.glasType; });
    if (!bruikbaar.length) {
      melding('Vul eerst een paar ruiten in op het tabblad Invoer.', true);
      wachtOpRij = null;
      return;
    }
    lijst.innerHTML = bruikbaar.map(function (r) {
      return '<button class="foto-rijknop" onclick="fotoKiesRij(' + r.id + ')">' +
        '<span class="foto-rijletter">' + esc(labelVan(r)) + '</span>' +
        '<span class="foto-rijtekst">' + esc(omschrijving(r)) + '</span></button>';
    }).join('');
    venster.style.display = 'flex';
  }

  window.fotoSluitKiezer = function () {
    el('fotoRijKiezer').style.display = 'none';
    wachtOpRij = null;
  };

  window.fotoKiesRij = function (rijId) {
    var foto = fotos.find(function (f) { return f.id === actieveFoto; });
    if (!foto || !wachtOpRij) return;
    foto.markeringen.push({ rijId: rijId, x: wachtOpRij.x, y: wachtOpRij.y });
    wachtOpRij = null;
    el('fotoRijKiezer').style.display = 'none';
    opslaan();
    renderFotos();
  };

  function markTik(index) {
    var foto = fotos.find(function (f) { return f.id === actieveFoto; });
    var m = foto.markeringen[index];
    var rij = getRij(m.rijId);
    if (!rij) {
      if (confirm('De regel bij deze markering bestaat niet meer. Markering verwijderen?')) {
        foto.markeringen.splice(index, 1);
        opslaan(); renderFotos();
      }
      return;
    }
    var keuze = confirm(labelVan(rij) + ' — ' + omschrijving(rij) +
      '\n\nOK = naar deze regel in de invoerlijst\nAnnuleren = markering laten staan');
    if (keuze) gaNaarRij(m.rijId);
  }

  function gaNaarRij(id) {
    var knop = document.querySelector('.tab-btn');
    if (knop) knop.click();
    setTimeout(function () {
      var tr = el('rij-' + id);
      if (!tr) return;
      tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
      tr.classList.add('gemarkeerd');
      setTimeout(function () { tr.classList.remove('gemarkeerd'); }, 2500);
    }, 60);
  }

  /* ─── opruimen als een regel verdwijnt ─────────────────────── */

  window.fotoOpschonen = function () {
    var bestaand = {};
    rijen.forEach(function (r) { bestaand[r.id] = true; });
    var weg = 0;
    fotos.forEach(function (f) {
      var voor = f.markeringen.length;
      f.markeringen = f.markeringen.filter(function (m) { return bestaand[m.rijId]; });
      weg += voor - f.markeringen.length;
    });
    return weg;
  };
})();
