/* ═══════════════════════════════════════════════════════════════
   Glasopname – wachtrij voor foto's (v93)

   Tot v92 ging een foto alleen in het project als het uploaden meteen
   lukte. Op een dak of in een kelder zonder bereik kreeg je 'Mislukt'
   en was de foto weg; je moest later terug om hem opnieuw te maken.

   Nu gaat elke afbeelding eerst hier in, op het apparaat zelf
   (IndexedDB), en meteen daarna in het project. Het scherm, de pdf en
   het draaien halen hem uit deze wachtrij zolang hij nog niet in de
   cloud staat. Op de achtergrond probeert de app hem te uploaden:
   meteen, bij elke start, zodra er weer bereik is, als je de app weer
   voor je haalt, en verder elke halve minuut. Is de upload gelukt, dan
   gaat hij hier weer uit.

   Wat hier in staat:
     meta   — per pad: projectId, soort ('beeld' of 'origineel'), type,
              grootte, wanneer, aantal pogingen en de laatste fout
     blobs  — per pad: het bestand zelf
   Gescheiden, zodat het tellen en tonen nooit alle bestanden in het
   geheugen hoeft te laden.

   Kan dit apparaat geen IndexedDB gebruiken (Safari privé, opslag vol),
   dan geeft zet() een fout en uploadt fotos.js zoals vóór v93: meteen,
   en alleen met bereik.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DB_NAAM = 'glasopname-wachtrij';
  var BUCKET = 'projectfotos';
  var PAUZE = 30000;                 // ms tussen twee rondes
  var TIJDSLIMIET_BASIS = 60000;     // ms per upload, plus …
  var TIJDSLIMIET_PER_MB = 15000;    // … wat extra per MB (originelen)

  var dbBelofte = null;
  var bekend = {};          // pad → meta, voor wacht() zonder te wachten
  var geweigerd = {};       // pad → reden; deze sessie niet opnieuw proberen
  var bezig = false;
  var nogEenRonde = false;
  var urls = {};            // pad → object-URL (blob:…)
  var laatsteFout = '';
  var vol = false;          // de cloudopslag gaf 'vol' (v103)

  function sb() { return window.glasSupabase || null; }
  function ingelogd() {
    try { return !!(window.glasGebruiker && glasGebruiker().id); } catch (e) { return false; }
  }

  /* ─── de database ──────────────────────────────────────────── */

  function open() {
    if (dbBelofte) return dbBelofte;
    dbBelofte = new Promise(function (ok, fout) {
      var idb;
      try { idb = window.indexedDB; } catch (e) { idb = null; }
      if (!idb) { fout(new Error('IndexedDB niet beschikbaar')); return; }
      var verzoek;
      try { verzoek = idb.open(DB_NAAM, 1); } catch (e) { fout(e); return; }
      verzoek.onupgradeneeded = function () {
        var d = verzoek.result;
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'pad' });
        if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs');
      };
      verzoek.onsuccess = function () {
        var d = verzoek.result;
        // Een tweede tabblad met een nieuwere versie: netjes loslaten.
        d.onversionchange = function () { try { d.close(); } catch (e) {} dbBelofte = null; };
        ok(d);
      };
      verzoek.onerror = function () { fout(verzoek.error || new Error('IndexedDB openen mislukt')); };
      verzoek.onblocked = function () { fout(new Error('IndexedDB geblokkeerd')); };
    });
    // Een mislukte poging niet onthouden: misschien lukt het later wel.
    dbBelofte.catch(function () { dbBelofte = null; });
    return dbBelofte;
  }

  function transactie(winkels, modus, werk) {
    return open().then(function (d) {
      return new Promise(function (ok, fout) {
        var t = d.transaction(winkels, modus);
        var uit;
        t.oncomplete = function () { ok(uit); };
        t.onerror = function () { fout(t.error || new Error('IndexedDB-fout')); };
        t.onabort = function () { fout(t.error || new Error('IndexedDB afgebroken (opslag vol?)')); };
        uit = werk(t);
      });
    });
  }

  function vraag(verzoek) {
    return new Promise(function (ok, fout) {
      verzoek.onsuccess = function () { ok(verzoek.result); };
      verzoek.onerror = function () { fout(verzoek.error); };
    });
  }

  function alleMeta() {
    return open().then(function (d) {
      return vraag(d.transaction('meta', 'readonly').objectStore('meta').getAll());
    }).then(function (lijst) {
      bekend = {};
      (lijst || []).forEach(function (m) { bekend[m.pad] = m; });
      return lijst || [];
    });
  }

  /* ─── erin, eruit ──────────────────────────────────────────── */

  // Een bestand in de wachtrij zetten. Pas als dit gelukt is, staat het
  // veilig op het apparaat; dan mag het pad in het project.
  function zet(pad, blob, opties) {
    var o = opties || {};
    var meta = {
      pad: pad,
      projectId: o.projectId || String(pad).split('/')[0],
      soort: o.soort || 'beeld',
      type: o.type || blob.type || 'image/jpeg',
      grootte: blob.size || 0,
      naam: o.naam || '',
      gemaakt: Date.now(),
      pogingen: 0,
      fout: ''
    };
    return transactie(['meta', 'blobs'], 'readwrite', function (t) {
      t.objectStore('blobs').put(blob, pad);
      t.objectStore('meta').put(meta);
    }).then(function () {
      bekend[pad] = meta;
      vraagBlijvendeOpslag();
      melden();
      // 'Altijd meteen' (keuze van Jan): niet wachten op de volgende ronde.
      setTimeout(verwerk, 0);
      return pad;
    });
  }

  // Altijd in IndexedDB zelf kijken, niet in `bekend`: vlak na de start is
  // die lijst nog niet ingelezen, en dan zou een foto die alleen op dit
  // apparaat staat als 'niet beschikbaar' op het scherm komen.
  function leesBlob(pad) {
    return open().then(function (d) {
      return vraag(d.transaction('blobs', 'readonly').objectStore('blobs').get(pad));
    });
  }
  function haalBlob(pad) {
    if (!pad) return Promise.resolve(null);
    return leesBlob(pad).then(function (b) { return b || null; }, function () { return null; });
  }

  function haalWeg(pad) {
    return transactie(['meta', 'blobs'], 'readwrite', function (t) {
      t.objectStore('blobs').delete(pad);
      t.objectStore('meta').delete(pad);
    }).then(function () {
      delete bekend[pad];
      delete geweigerd[pad];
      melden();
    });
  }

  // Een object-URL om te tonen. Blijft geldig tot de pagina sluit of tot
  // fotos.js hem vrijgeeft; ook ná het uploaden, zodat het beeld op het
  // scherm niet opnieuw geladen hoeft te worden.
  function url(pad) {
    if (urls[pad]) return Promise.resolve(urls[pad]);
    return haalBlob(pad).then(function (b) {
      if (!b) return null;
      urls[pad] = URL.createObjectURL(b);
      return urls[pad];
    });
  }

  function vergeetUrls() {
    Object.keys(urls).forEach(function (p) { try { URL.revokeObjectURL(urls[p]); } catch (e) {} });
    urls = {};
  }

  // Alles van een project dat definitief weg is: niet meer uploaden. Zou
  // het toch doorgaan, dan stond er een map in Storage bij een project dat
  // niet meer bestaat.
  function vergeetProject(projectId) {
    if (!projectId) return Promise.resolve(0);
    return alleMeta().then(function (lijst) {
      var weg = lijst.filter(function (m) { return m.projectId === projectId; });
      return Promise.all(weg.map(function (m) { return haalWeg(m.pad); }))
        .then(function () { return weg.length; });
    }).catch(function () { return 0; });
  }

  /* ─── uploaden ─────────────────────────────────────────────── */

  function foutTekst(e) {
    if (!e) return 'onbekende fout';
    return String(e.message || e.error || e) +
      (e.statusCode || e.status ? ' (code ' + (e.statusCode || e.status) + ')' : '');
  }

  // Bestaat al: een eerdere poging is toch aangekomen (het antwoord ging
  // verloren). Dat telt als gelukt.
  function alAanwezig(e) {
    var t = foutTekst(e);
    return /already exists|Duplicate|\b409\b/i.test(t);
  }

  // Fouten die bij opnieuw proberen niet weggaan: te groot of een soort
  // bestand dat de opslag niet aanneemt. Meestal is 19_originelen.sql dan
  // nog niet gedraaid. Deze sessie niet opnieuw; na een herstart wel, want
  // dan kan het script inmiddels gedraaid zijn.
  function blijvend(e) {
    var t = foutTekst(e);
    if (opslagVol(e)) return false;     // gaat over zodra er ruimte is (v103)
    return /\b(413|415)\b|too large|maximum allowed size|exceeded|mime type|invalid_mime/i.test(t);
  }

  // De cloudopslag zelf zit vol (gratis plan: 1 GB). Iets anders dan één
  // te groot bestand, en het helpt niet om 19_originelen.sql te draaien.
  // Tot v102 kreeg je die (verkeerde) raad (v103).
  function opslagVol(e) {
    var t = foutTekst(e);
    return /quota|storage limit|insufficient storage|\b507\b|exceed(ed)? (the )?(storage|space)/i.test(t);
  }

  // Geen verbinding (of geen antwoord): dan heeft de rest van de ronde
  // ook geen zin. Een fout van de server over dít bestand (4xx) mag de
  // andere bestanden niet tegenhouden. Tot v102 stopte elke ronde bij
  // het eerste bestand dat niet lukte; zat dat vast, dan ging er nooit
  // meer een foto omhoog (gevonden bij de controle van v103).
  function geenVerbinding(e) {
    var code = Number((e && (e.statusCode || e.status)) || 0);
    if (code >= 400 && code < 500) return false;
    var t = foutTekst(e);
    if (/\(code 4\d\d\)/.test(t)) return false;
    return true;
  }

  function metTijdslimiet(belofte, ms) {
    var klok;
    var grens = new Promise(function (_, fout) {
      klok = setTimeout(function () { fout(new Error('geen antwoord binnen ' + Math.round(ms / 1000) + ' seconden')); }, ms);
    });
    return Promise.race([belofte, grens]).then(function (r) { clearTimeout(klok); return r; },
      function (e) { clearTimeout(klok); throw e; });
  }

  function uploadEen(meta) {
    // leesBlob en niet haalBlob: een leesfout mag hier niet als 'leeg'
    // tellen, want dan zou het bestand uit de wachtrij verdwijnen.
    return leesBlob(meta.pad).then(function (blob) {
      if (!blob) return haalWeg(meta.pad);          // niets meer te doen
      var ms = TIJDSLIMIET_BASIS + Math.ceil((meta.grootte || 0) / 1048576) * TIJDSLIMIET_PER_MB;
      var verzoek = sb().storage.from(BUCKET).upload(meta.pad, blob,
        { contentType: meta.type || 'image/jpeg', upsert: false });
      return metTijdslimiet(Promise.resolve(verzoek), ms).then(function (res) {
        if (res && res.error) throw res.error;
        vol = false;
        return haalWeg(meta.pad);
      }).catch(function (e) {
        if (alAanwezig(e)) return haalWeg(meta.pad);
        meta.pogingen = (meta.pogingen || 0) + 1;
        meta.fout = foutTekst(e);
        meta.laatstePoging = Date.now();
        laatsteFout = meta.fout;
        if (opslagVol(e)) vol = true;
        if (blijvend(e)) geweigerd[meta.pad] = meta.fout;
        console.warn('[wachtrij] upload mislukt', meta.pad, meta.fout);
        return transactie('meta', 'readwrite', function (t) { t.objectStore('meta').put(meta); })
          .catch(function () {})
          .then(function () { bekend[meta.pad] = meta; melden(); throw e; });
      });
    });
  }

  // Eén ronde: alles één voor één, de verkleinde foto's eerst — die heeft
  // een collega nodig om de foto te zien; een origineel kan wachten.
  function verwerk() {
    if (bezig) { nogEenRonde = true; return Promise.resolve(); }
    if (!sb() || !ingelogd()) return Promise.resolve();
    if (navigator.onLine === false) return Promise.resolve();
    bezig = true;
    nogEenRonde = false;
    return alleMeta().then(function (lijst) {
      var rij = lijst.filter(function (m) { return !geweigerd[m.pad]; }).sort(function (a, b) {
        var sa = a.soort === 'origineel' ? 1 : 0, sb2 = b.soort === 'origineel' ? 1 : 0;
        return sa - sb2 || a.gemaakt - b.gemaakt;
      });
      var stop = false;
      return rij.reduce(function (keten, m) {
        return keten.then(function () {
          if (stop || navigator.onLine === false) return;
          return uploadEen(m).catch(function (e) {
            // Geen verbinding, of de opslag is vol: de rest heeft nu ook
            // geen zin. Een fout over alleen dit bestand: door met de rest.
            if (opslagVol(e) || (!blijvend(e) && geenVerbinding(e))) stop = true;
          });
        });
      }, Promise.resolve());
    }).catch(function (e) {
      console.warn('[wachtrij] ronde mislukt', e);
    }).then(function () {
      bezig = false;
      melden();
      if (nogEenRonde) setTimeout(verwerk, 0);
    });
  }

  /* ─── laten zien wat er nog wacht ──────────────────────────── */

  var DAG = 24 * 3600 * 1000;

  // oudste: wanneer het oudste bestand in de wachtrij kwam. Staat er iets
  // langer dan een dag, dan klopt er iets niet (v103): dan wordt de teller
  // rood en zegt het startscherm het.
  function telling() {
    var t = { beeld: 0, origineel: 0, geweigerd: 0, totaal: 0, mb: 0,
              oudste: null, fout: laatsteFout, vol: vol, lang: false };
    Object.keys(bekend).forEach(function (p) {
      var m = bekend[p];
      t.totaal++;
      t[m.soort === 'origineel' ? 'origineel' : 'beeld']++;
      t.mb += (m.grootte || 0) / 1048576;
      if (geweigerd[p]) t.geweigerd++;
      if (m.gemaakt && (t.oudste === null || m.gemaakt < t.oudste)) t.oudste = m.gemaakt;
      if (!t.fout && m.fout) t.fout = m.fout;
    });
    t.lang = !!(t.oudste && Date.now() - t.oudste > DAG);
    return t;
  }

  function hoeLang(ms) {
    var uur = Math.floor(ms / 3600000);
    if (uur < 1) return 'minder dan een uur';
    if (uur < 48) return uur + ' uur';
    return Math.floor(uur / 24) + ' dagen';
  }

  function melden() {
    var t = telling();
    var vak = document.getElementById('wachtrijTeller');
    if (vak) {
      vak.hidden = !t.totaal;
      vak.textContent = t.totaal ? '⇡ ' + t.totaal + ' te uploaden' : '';
      vak.classList.toggle('probleem', !!(t.geweigerd || t.vol || t.lang));
      vak.title = t.totaal
        ? t.beeld + ' foto(\'s) en ' + t.origineel + ' origine(e)l(en) staan alleen nog op dit apparaat. ' +
          'Ze gaan vanzelf naar de cloud zodra er verbinding is. Tik voor meer.'
        : '';
    }
    try {
      document.dispatchEvent(new CustomEvent('glaswachtrij', { detail: t }));
    } catch (e) {}
  }

  window.wachtrijUitleg = function () {
    var t = telling();
    if (!t.totaal) {
      appMelding('Alle foto\'s staan in de cloud.', { kop: 'Uploaden' });
      return;
    }
    var regels = [];
    regels.push('Op dit apparaat wachten nog ' + t.totaal + ' bestand(en) op uploaden (' +
                (Math.round(t.mb * 10) / 10).toString().replace('.', ',') + ' MB):');
    if (t.beeld) regels.push('• ' + t.beeld + ' foto(\'s) of tekening(en) zoals ze in het project staan');
    if (t.origineel) regels.push('• ' + t.origineel + ' originele foto(\'s)');
    regels.push('');
    if (t.oudste) regels.push('Het oudste wacht al ' + hoeLang(Date.now() - t.oudste) + '.');
    if (t.vol) {
      regels.push('');
      regels.push('De opslag in de cloud is VOL en neemt geen foto\'s meer aan. Ze blijven op dit apparaat ' +
                  'bewaard. Voor Jan: ruim oude projecten op (prullenbak definitief legen) of zet Supabase ' +
                  'op een betaald plan; daarna gaan ze vanzelf.');
    }
    if (navigator.onLine === false) regels.push('Dit apparaat is nu offline. Zodra er bereik is, gaan ze vanzelf.');
    else if (!ingelogd()) regels.push('Je bent niet ingelogd. Na het inloggen gaan ze vanzelf.');
    else regels.push('De app probeert het elke halve minuut, en meteen als er weer bereik is.');
    if (t.geweigerd) {
      regels.push('');
      regels.push(t.geweigerd + ' bestand(en) worden door de opslag geweigerd, omdat ze te groot ' +
                  'zijn of een soort bestand dat de opslag niet aanneemt. Voor Jan: controleer in Supabase ' +
                  '(Storage → projectfotos) de maximale bestandsgrootte en de toegestane soorten ' +
                  '(19_originelen.sql). Daarna de app opnieuw starten. (' + (laatsteFout || '') + ')');
    } else if (t.fout && (t.lang || t.vol)) {
      regels.push('');
      regels.push('Laatste foutmelding: ' + t.fout);
    }
    regels.push('');
    regels.push('Belangrijk: verwijder de app niet van het beginscherm en wis de websitegegevens niet ' +
                'zolang hier iets staat — dan zijn deze foto\'s weg.');
    appMelding(regels.join('\n'), { kop: 'Wachten op uploaden' });
    verwerk();
  };

  /* ─── blijvende opslag ─────────────────────────────────────── */
  // Vraag de browser deze opslag niet op te ruimen als het apparaat vol
  // raakt. Chrome geeft dat bij een geïnstalleerde app meestal; Safari
  // vanaf versie 17. Lukt het niet, dan werkt alles gewoon, met iets meer
  // risico — daarom uploadt de app ook altijd meteen.
  var persistGevraagd = false;
  function vraagBlijvendeOpslag() {
    if (persistGevraagd) return;
    persistGevraagd = true;
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(function () {});
      }
    } catch (e) {}
  }

  /* ─── wanneer proberen ─────────────────────────────────────── */

  window.addEventListener('online', function () { setTimeout(verwerk, 500); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') verwerk();
  });
  setInterval(verwerk, PAUZE);
  // Bij de start: eerst kijken wat er staat (voor de teller), en zodra
  // cloud.js ingelogd is ook uploaden — de interval hierboven vangt dat.
  setTimeout(function () {
    alleMeta().then(function () { melden(); verwerk(); }).catch(function () {});
  }, 1500);

  window.glasWachtrij = {
    zet: zet,
    blob: haalBlob,
    url: url,
    wacht: function (pad) { return !!(pad && bekend[pad]); },
    telling: telling,
    verwerk: verwerk,
    vergeetProject: vergeetProject,
    vergeetPad: function (pad) { return pad && bekend[pad] ? haalWeg(pad) : Promise.resolve(); },
    vergeetUrls: vergeetUrls,
    lijst: alleMeta,
    // Alleen voor de testreeks: hoeveel staat er nu echt in IndexedDB.
    _open: open
  };
})();
