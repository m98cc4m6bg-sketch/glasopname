/* ═══════════════════════════════════════════════════════════════
   Glasopname – rollen en rechten, en het tabblad Beheer (v124)
   Hoort bij script 30 (30_rollen_en_beheer.sql). Keuzes van Jan,
   26-10-2026:
   - drie rollen: beheerder (alles, plus Beheer), collega (zoals altijd,
     met vier rechten die de beheerder per persoon kan uitzetten:
     bestellen, ontgrendelen, nieuw project, weggooien), werkvloer
     (kijken, foto's toevoegen, eigen taken afvinken);
   - de back-up 💾 en de prullenbak met de hand legen: alleen de beheerder.
   De database houdt het echt tegen; dit bestand zorgt dat de knoppen
   kloppen, dat iemand hoort wáárom iets niet kan, en dat de foto van de
   werkvloer het project in gaat (via glas_foto_erbij: de werkvloer bewerkt
   het project niet, dus hij zit niemand op kantoor in de weg).

   Is script 30 nog niet gedraaid (de kolom rol ontbreekt in gebruikers),
   dan doet dit bestand niets: de app werkt dan zoals v123.
   Geladen ná cloud.js, bewerkslot.js, start.js, project.js, pdf.js en
   backup.js: een paar van hun functies krijgen hier een controle ervoor.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var rij = null;          // mijn eigen regel uit gebruikers (rol, mag_…)
  var actief30 = false;    // script 30 gedraaid (de regel heeft een rol)
  var LS_RECHTEN = 'glasopname_rechten_';   // + id: laatst bekende rechten (ook zonder bereik)
  var LS_ERBIJ = 'glasopname_erbij';         // foto's van de werkvloer die nog omhoog moeten
  var RECHTEN = ['bestellen', 'ontgrendelen', 'nieuw', 'weggooien'];
  var RECHT_NAAM = { bestellen: 'bestellen', ontgrendelen: 'ontgrendelen', nieuw: 'nieuw project', weggooien: 'weggooien' };
  var ROL_NAAM = { beheerder: 'Beheerder', collega: 'Collega', werkvloer: 'Werkvloer' };

  function el(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t === undefined || t === null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function sb() { return window.glasSupabase || null; }
  function mijnId() { var g = window.glasGebruiker ? glasGebruiker() : null; return (g && g.id) || null; }

  // De laatst bekende rechten van dit account op dit apparaat: zonder bereik
  // moet de werkvloer ook gewoon "alleen kijken" zijn.
  function uitGeheugen() {
    var id = mijnId();
    if (!id || (rij && rij.id === id)) return;
    try {
      var k = JSON.parse(localStorage.getItem(LS_RECHTEN + id) || 'null');
      if (k && k.id === id && k.rol) { rij = k; actief30 = true; }
    } catch (e) {}
  }
  function huidig() { uitGeheugen(); var id = mijnId(); return (rij && id && rij.id === id) ? rij : null; }

  /* ─── wat mag ik ────────────────────────────────────────────── */

  window.glasRechtenActief = function () { return !!(huidig() && actief30); };
  window.glasRol = function () { var r = huidig(); return r && actief30 ? r.rol : null; };
  window.glasWerkvloer = function () { return window.glasRol() === 'werkvloer'; };
  window.glasIsBeheerder = function () { return window.glasRol() === 'beheerder'; };
  // Zonder script 30 (of nog niet bekend): alles, zoals v123.
  window.glasMag = function (recht) {
    var r = huidig();
    if (!r || !actief30) return true;
    if (r.rol === 'beheerder') return true;
    if (r.rol !== 'collega') return false;
    return r['mag_' + recht] !== false;
  };

  function zet(r) {
    if (!r || !r.id) return;
    actief30 = Object.prototype.hasOwnProperty.call(r, 'rol') && !!r.rol;
    if (!actief30) { rij = null; try { localStorage.removeItem(LS_RECHTEN + r.id); } catch (e) {} pasToe(); return; }
    rij = { id: r.id, rol: r.rol, mag_bestellen: r.mag_bestellen, mag_ontgrendelen: r.mag_ontgrendelen,
            mag_nieuw: r.mag_nieuw, mag_weggooien: r.mag_weggooien };
    try { localStorage.setItem(LS_RECHTEN + r.id, JSON.stringify(rij)); } catch (e) {}
    pasToe();
    aanwezig();
    erbijVersturen();
  }

  // Mijn regel komt binnen via glasMijnLaden (cloud.js, bij het inloggen en
  // op het startscherm); daar luisteren we mee.
  var origMijn = window.glasMijnLaden;
  window.glasMijnLaden = function () {
    var p = origMijn ? origMijn.apply(this, arguments) : Promise.resolve(null);
    return Promise.resolve(p).then(function (r) {
      if (r) {
        zetGeblokkeerd(false); zet(r);
        // v125: weet de app of script 31 er is? (werkvloer: leverfoto, taken
        // zonder eigenaar). Eén vraag per sessie (cloud.js onthoudt het
        // antwoord, ook op het apparaat voor zonder bereik).
        if (window.glasNaamVrijInPrullenbak) {
          glasNaamVrijInPrullenbak().then(function () { pasToe(); }, function () {});
        }
        return r;
      }
      uitGeheugen(); pasToe();    // geen bereik: wat dit apparaat al wist
      // Geen eigen regel terug: geen bereik, of geen toegang meer
      // (geblokkeerd). Dat vraagt glas_mijn_status (werkt ook zonder toegang).
      return mijnStatus().then(function () { return r; });
    });
  };
  window.glasRechtenVernieuwen = function () { return window.glasMijnLaden(); };

  // v124 (reparatie A5): vlak vóór iets dat niet terug kan (‹Ja, verstuurd›,
  // ontgrendelen, de bestellijst voor de leverancier, de bestelmail) de
  // rechten opnieuw ophalen: de beheerder kan ze net uitgezet hebben. Hooguit
  // een paar seconden wachten; zonder bereik geldt wat dit apparaat al wist
  // (en de database houdt het hoe dan ook tegen).
  window.glasRechtenVers = function (ms) {
    if (!sb() || !mijnId()) return Promise.resolve();
    var p = Promise.resolve(window.glasMijnLaden()).then(function () {}, function () {});
    return Promise.race([p, new Promise(function (r) { setTimeout(r, ms || 3000); })]);
  };

  /* ─── geblokkeerd (A6) ─────────────────────────────────────── */
  // Een collega die de beheerder blokkeerde, ziet geen projecten meer. Niet
  // een leeg startscherm laten zien, maar zeggen wat er is.
  var geblokkeerd = false;
  window.glasGeblokkeerd = function () { return geblokkeerd; };
  function zetGeblokkeerd(aan) {
    geblokkeerd = !!aan;
    if (document.body) document.body.classList.toggle('geblokkeerd', geblokkeerd);
    var vak = el('startGeblokkeerd');
    if (vak) vak.hidden = !geblokkeerd;
  }
  function mijnStatus() {
    var c = sb();
    if (!c || typeof c.rpc !== 'function' || !mijnId() || navigator.onLine === false) return Promise.resolve();
    return Promise.resolve(c.rpc('glas_mijn_status')).then(function (res) {
      var d = res && !res.error ? res.data : null;
      if (d && typeof d === 'object') zetGeblokkeerd(d.actief === false);
    }, function () {});
  }

  /* ─── het scherm ───────────────────────────────────────────── */

  function pasToe() {
    var b = document.body;
    if (!b) return;
    var rol = window.glasRol();
    b.classList.toggle('rechten-30', !!rol);
    ['beheerder', 'collega', 'werkvloer'].forEach(function (x) { b.classList.toggle('rol-' + x, rol === x); });
    RECHTEN.forEach(function (x) { b.classList.toggle('geen-' + x, !!rol && !window.glasMag(x)); });
    b.classList.toggle('geen-beheer', !!rol && rol !== 'beheerder');
    var tab = el('startTabBeheer');
    if (tab) tab.hidden = rol !== 'beheerder';
    var vak = el('startRechten');
    if (vak) {
      var t = '';
      if (rol === 'werkvloer') t = 'Werkvloer: kijken, foto\'s toevoegen, eigen taken afvinken';
      else if (rol === 'beheerder') t = 'Beheerder';
      else if (rol === 'collega') {
        var uit = RECHTEN.filter(function (x) { return !window.glasMag(x); }).map(function (x) { return RECHT_NAAM[x]; });
        if (uit.length) t = 'Staat voor jou uit: ' + uit.join(', ');
      }
      vak.hidden = !t;
      vak.textContent = t;
      vak.title = t ? 'Je rechten zet de beheerder (tabblad Beheer)' : '';
    }
    if (rol !== 'beheerder' && el('startBeheer') && !el('startBeheer').hidden) window.startTab('start');
    if (window.glasProjectId) {
      if (window.slotToepassen) try { slotToepassen(); } catch (e) {}
      if (window.renderTaken) try { renderTaken(); } catch (e) {}
    }
  }

  function zeg(tekst, kop) {
    if (window.appMelding) appMelding(tekst, { kop: kop || 'Niet voor jouw account', soort: 'letop' });
    return false;
  }
  window.glasWerkvloerUitleg = function () {
    return 'Je account staat op werkvloer: je kunt alles bekijken, foto\'s toevoegen en je eigen taken ' +
      'afvinken. Iets anders wijzigen doet een collega (de beheerder kan je rol veranderen).';
  };
  function weigerTekst(recht) {
    if (window.glasWerkvloer()) return window.glasWerkvloerUitleg();
    var wat = { bestellen: 'een bestelling vastleggen, versturen of intrekken', ontgrendelen: 'een besteld project ontgrendelen',
                nieuw: 'een nieuw project maken', weggooien: 'een project weggooien' }[recht];
    return 'Jouw account mag geen ' + wat.replace(/^een /, '') + ' (de beheerder heeft dat uitgezet). ' +
      'Vraag een collega, of vraag de beheerder het aan te zetten.';
  }

  window.glasWeigerTekst = weigerTekst;

  // Een controle vóór een bestaande functie (de knop roept window.x aan).
  function bewaak(naam, recht, waarde) {
    var orig = window[naam];
    if (typeof orig !== 'function') return;
    window[naam] = function () {
      if (!window.glasMag(recht)) { zeg(weigerTekst(recht)); return waarde; }
      return orig.apply(this, arguments);
    };
  }
  // v124 (A5): eerst de rechten vers ophalen, dan pas kijken.
  function bewaakVers(naam, recht, waarde) {
    var orig = window[naam];
    if (typeof orig !== 'function') return;
    window[naam] = function () {
      var dit = this, args = arguments;
      // Ook als het volgens dit apparaat niet mag: misschien zette de
      // beheerder het net weer aan.
      return window.glasRechtenVers().then(function () {
        if (!window.glasMag(recht)) { zeg(weigerTekst(recht)); return waarde; }
        return orig.apply(dit, args);
      });
    };
  }
  bewaak('cloudNieuw', 'nieuw', undefined);
  bewaak('cloudVerwijder', 'weggooien', Promise.resolve(false));
  bewaakVers('slotOntgrendel', 'ontgrendelen', undefined);
  bewaakVers('bestellingIntrekken', 'bestellen', false);

  function alleenBeheer(naam, tekst, waarde) {
    var orig = window[naam];
    if (typeof orig !== 'function') return;
    window[naam] = function () {
      if (window.glasRol() && !window.glasIsBeheerder()) { zeg(tekst); return waarde; }
      return orig.apply(this, arguments);
    };
  }
  alleenBeheer('glasNuDefinitief', 'Nu definitief verwijderen kan alleen de beheerder. Na 30 dagen in de prullenbak ' +
    'ruimt de app een project vanzelf op.', Promise.resolve(false));
  alleenBeheer('startDefinitief', 'Nu definitief verwijderen kan alleen de beheerder. Na 30 dagen in de prullenbak ' +
    'ruimt de app een project vanzelf op.', undefined);
  alleenBeheer('glasBackup', 'De back-up maken kan alleen de beheerder (er gaat elke nacht ook vanzelf een back-up ' +
    'naar Dropbox).', Promise.resolve(false));

  // Terugzetten uit de prullenbak: niet voor de werkvloer.
  (function () {
    var orig = window.startTerugzetten;
    if (typeof orig !== 'function') return;
    window.startTerugzetten = function () {
      if (window.glasWerkvloer()) { zeg(window.glasWerkvloerUitleg()); return; }
      return orig.apply(this, arguments);
    };
  })();

  // Het automatisch opruimen (na 30 dagen) doet een collega of de beheerder,
  // niet de werkvloer (de database laat de werkvloer niets verwijderen).
  (function () {
    var orig = window.glasPrullenbakOpruimen;
    if (typeof orig !== 'function') return;
    window.glasPrullenbakOpruimen = function () {
      var dit = this, args = arguments;
      // Eerst weten wie er is (het startscherm vraagt dit meteen na het inloggen).
      return Promise.resolve(window.glasMijnLaden ? window.glasMijnLaden() : null).then(function () {
        if (window.glasWerkvloer()) return 0;
        return orig.apply(dit, args);
      }, function () { return orig.apply(dit, args); });
    };
  })();

  // De mailfunctie (als die ooit wordt ingesteld) kijkt zelf ook.
  (function () {
    var orig = window.glasMail;
    if (typeof orig !== 'function') return;
    window.glasMail = function (bericht) {
      var dit = this, args = arguments;
      var soort = (bericht && bericht.soort) || 'bestelling';
      var mag = function () { return !(window.glasWerkvloer() || (soort === 'bestelling' && !window.glasMag('bestellen'))); };
      if (!mag()) return Promise.resolve({ ok: false, fout: weigerTekst('bestellen') });
      return window.glasRechtenVers().then(function () {
        if (!mag()) return { ok: false, fout: weigerTekst('bestellen') };
        return orig.apply(dit, args);
      });
    };
  })();

  /* ─── laatst actief, versie en apparaat (voor Beheer) ──────── */

  var aanwezigOp = 0;
  function aanwezig() {
    var c = sb();
    if (!c || typeof c.rpc !== 'function' || !window.glasRol() || Date.now() - aanwezigOp < 10 * 60 * 1000) return;
    aanwezigOp = Date.now();
    var velden = window.glasBewerkslotVelden ? glasBewerkslotVelden() : {};
    var versie = (typeof APP_VERSIE !== 'undefined') ? APP_VERSIE : '';
    Promise.resolve(c.rpc('glas_aanwezig', { p_versie: versie, p_apparaat: velden._apparaatSoort || '' }))
      .then(function () {}, function () {});
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') aanwezig(); });

  /* ─── de werkvloer: een foto toevoegen ─────────────────────── */
  // De werkvloer kijkt alleen (bewerkslot.js neemt het project niet). Een
  // foto gaat zo: verkleinen en bewaren zoals altijd (fotos.js, de wachtrij
  // op het apparaat), en dan niet het hele project opslaan maar alleen
  // deze foto erbij zetten (glas_foto_erbij). Zonder bereik blijft hij in
  // de rij hieronder staan (localStorage) tot het wel lukt; niets weg.

  function erbijLijst() {
    try { var l = JSON.parse(localStorage.getItem(LS_ERBIJ) || '[]'); return Array.isArray(l) ? l : []; }
    catch (e) { return []; }
  }
  function erbijBewaar(l) {
    try {
      if (l.length) localStorage.setItem(LS_ERBIJ, JSON.stringify(l)); else localStorage.removeItem(LS_ERBIJ);
      return true;
    } catch (e) { return false; }
  }
  window.glasErbijWachtend = function (pid) {
    var id = mijnId();
    return erbijLijst().filter(function (x) { return x.wie === id && (!pid || x.project === pid); }).length;
  };

  // Door fotos.js aangeroepen zodra een foto (of zijn origineel) bewaard is.
  // true = afgehandeld (dan slaat fotos.js het project niet op).
  window.glasWerkvloerFoto = function (foto, pid) {
    if (!window.glasWerkvloer() || !foto || !foto.id || !foto.pad) return false;
    var project = pid || window.glasProjectId;
    if (!project) return false;
    var kort = { id: foto.id, pad: foto.pad, titel: foto.titel || '', breedte: foto.breedte, hoogte: foto.hoogte };
    if (foto.soort === 'lever') kort.soort = 'lever';   // v125: de leverfoto (script 31)
    if (foto.origineel) kort.origineel = foto.origineel;
    var l = erbijLijst().filter(function (x) { return !(x.project === project && x.foto && x.foto.id === foto.id); });
    l.push({ wie: mijnId(), project: project, foto: kort, op: Date.now() });
    if (!erbijBewaar(l)) {
      if (window.appFout) appFout('De foto kon niet op dit apparaat bewaard worden (opslag vol?). Probeer het nog eens.', { kop: 'Foto' });
      return true;
    }
    if (window.slotToepassen) try { slotToepassen(); } catch (e) {}
    erbijVersturen();
    return true;
  };

  var erbijBezig = false;
  var erbijKlok = null;
  var erbijGemeld = {};
  function erbijVersturen() {
    var c = sb();
    var id = mijnId();
    if (erbijBezig || !c || typeof c.rpc !== 'function' || !id || navigator.onLine === false) return Promise.resolve();
    var alle = erbijLijst().filter(function (x) { return x.wie === id; });
    // Eerst het bestand zelf in de opslag (de wachtrij uploadt het), dan pas
    // in het project: anders ziet kantoor een foto die nog niet binnenkomt.
    var mijn = alle.filter(function (x) { return !(window.glasWachtrij && x.foto && glasWachtrij.wacht(x.foto.pad)); });
    if (mijn.length < alle.length) { clearTimeout(erbijKlok); erbijKlok = setTimeout(erbijVersturen, 3000); }
    if (!mijn.length) return Promise.resolve();
    erbijBezig = true;
    var stap = Promise.resolve();
    var genoeg = {};   // v124: project dat zei "veel foto's in korte tijd": deze ronde niet verder
    mijn.forEach(function (x) {
      stap = stap.then(function () {
        if (genoeg[x.project]) return;
        return Promise.resolve(c.rpc('glas_foto_erbij', { p_project: x.project, p_foto: x.foto })).then(function (res) {
          var fout = res && res.error ? String(res.error.message || res.error.code || '') : '';
          // v124: het logboek van het project kreeg net veel foto-regels; de
          // rest wacht (de klok hieronder probeert het elke minuut opnieuw).
          if (/Veel foto/.test(fout)) { genoeg[x.project] = true; return; }
          if (!fout && res && res.data && res.data.ok) { haalUitRij(x); return; }
          // Het project is definitief weg: niets meer om de foto aan te hangen.
          if (/bestaat niet meer/.test(fout)) { haalUitRij(x); console.warn('[werkvloer] project weg; foto niet toegevoegd', x.project); return; }
          if (/Foto onleesbaar/.test(fout)) { haalUitRij(x); console.warn('[werkvloer] foto geweigerd', x.foto && x.foto.id); return; }
          // Prullenbak, geen recht, geen bereik: blijft staan, nog eens later.
          if (fout && !erbijGemeld[x.project + fout] && /prullenbak|Geen recht/.test(fout) && window.appMelding) {
            erbijGemeld[x.project + fout] = true;
            appMelding('Je foto staat op dit apparaat, maar kon nog niet in het project: ' + fout +
              ' Hij blijft bewaard en gaat er alsnog in zodra het kan.', { kop: 'Foto nog niet in het project', soort: 'letop' });
          }
        }, function () {});
      });
    });
    return stap.then(function () {}, function () {}).then(function () {
      erbijBezig = false;
      if (window.slotToepassen) try { slotToepassen(); } catch (e) {}
    });
  }
  function haalUitRij(x) {
    erbijBewaar(erbijLijst().filter(function (y) {
      return !(y.wie === x.wie && y.project === x.project && y.foto && x.foto && y.foto.id === x.foto.id && y.op === x.op);
    }));
  }
  window.glasErbijVersturen = erbijVersturen;

  // Een foto van de werkvloer in een stand die binnenkomt (cloud.js
  // vanElders, ook onze eigen opslag die terugkaatst): hier op het scherm
  // erbij, zonder iets anders aan te raken. Dan stuurt de volgende opslag hem
  // ook mee (anders bleef de database hem terugzetten, script 30).
  window.glasErbijFotosErbij = function (data) {
    if (!data || !Array.isArray(data.fotos) || typeof fotos === 'undefined' || !Array.isArray(fotos)) return 0;
    var heb = {};
    fotos.forEach(function (f) { if (f && f.id) heb[f.id] = f; });
    var bij = 0;
    data.fotos.forEach(function (f) {
      if (!f || !f.id || !f._erbij) return;
      var h = heb[f.id];
      if (!h) {
        // v125: een nieuwe leverfoto van de werkvloer vervangt de oude.
        if (f.soort === 'lever') fotos = fotos.filter(function (x) { return x.soort !== 'lever'; });
        fotos.push(JSON.parse(JSON.stringify(f))); bij++; return;
      }
      if (f.origineel && !h.origineel && h.pad === f.pad) { h.origineel = JSON.parse(JSON.stringify(f.origineel)); bij++; }
      if (!h._erbij) h._erbij = JSON.parse(JSON.stringify(f._erbij));
    });
    if (bij && window.renderFotos) try { renderFotos(); } catch (e) {}
    if (bij && window.renderLeverFoto) try { renderLeverFoto(); } catch (e) {}
    return bij;
  };
  window.addEventListener('online', function () { setTimeout(erbijVersturen, 1500); });
  setInterval(function () { if (window.glasErbijWachtend()) erbijVersturen(); }, 60000);

  // De knop "📷 Foto toevoegen" in de balk "alleen kijken" (bewerkslot.js
  // vraagt de tekst hier op). Een eigen bestandsveld buiten Invoer: dat van
  // Invoer staat uit zolang je alleen kijkt.
  window.glasWerkvloerTekst = function () {
    var n = window.glasErbijWachtend(window.glasProjectId);
    return '<strong>Werkvloer: je kunt dit project bekijken.</strong> Foto\'s toevoegen' +
      (window.glasScript31 ? ', de leverfoto zetten' : '') + ' en je eigen taken' +
      (window.glasScript31 ? ' (en taken zonder eigenaar)' : '') + ' afvinken kan wel.' + (n ? ' <span class="wv-wacht">' + n + (n === 1 ? ' foto wacht' : ' foto\'s wachten') +
      ' op bereik.</span>' : '') +
      ' <button type="button" class="btn btn-primary btn-sm vrij-bij-slot wv-foto-knop" onclick="glasWerkvloerFotoKies()">📷 Foto toevoegen</button>' +
      (window.glasScript31 ? ' <button type="button" class="btn btn-secondary btn-sm vrij-bij-slot wv-lever-knop" ' +
        'onclick="glasWerkvloerLeverKies()">📍 Leverfoto</button>' : '');
  };
  // De vaste knop "📷 Foto toevoegen" bovenaan Invoer doet voor de werkvloer
  // hetzelfde (anders zei hij "alleen kijken").
  (function () {
    var orig = window.importKies;
    if (typeof orig !== 'function') return;
    window.importKies = function (wat) {
      if (wat === 'foto' && window.glasWerkvloer() && window.glasProjectId) {
        if (window.exportSluit) try { exportSluit(); } catch (e) {}
        return window.glasWerkvloerFotoKies();
      }
      return orig.apply(this, arguments);
    };
  })();

  // v125 (keuze Jan): de werkvloer mag ook de leverfoto zetten (script 31).
  window.glasWerkvloerLeverKies = function () {
    if (!window.glasWerkvloer() || !window.leverFotoWerkvloer) return;
    var v = el('wvLeverBestand');
    if (!v) {
      v = document.createElement('input');
      v.type = 'file'; v.accept = 'image/*'; v.id = 'wvLeverBestand'; v.hidden = true;
      v.addEventListener('change', function () { leverFotoWerkvloer(v); });
      document.body.appendChild(v);
    }
    v.click();
  };
  window.glasWerkvloerFotoKies = function () {
    if (!window.glasWerkvloer() || !window.fotoGekozen) return;
    var v = el('wvFotoBestand');
    if (!v) {
      v = document.createElement('input');
      v.type = 'file'; v.accept = 'image/*'; v.id = 'wvFotoBestand'; v.hidden = true;
      v.addEventListener('change', function () { fotoGekozen(v); });
      document.body.appendChild(v);
    }
    v.click();
  };

  /* ─── tabblad Beheer (startscherm, alleen de beheerder) ────── */

  (function () {
    var orig = window.startTab;
    if (typeof orig !== 'function') return;
    window.startTab = function (welk) {
      var beheer = welk === 'beheer' && window.glasIsBeheerder();
      var vak = el('startBeheer'), tab = el('startTabBeheer');
      if (vak) vak.hidden = !beheer;
      if (tab) { tab.classList.toggle('aan', beheer); tab.setAttribute('aria-selected', beheer ? 'true' : 'false'); }
      if (!beheer) return orig.call(this, welk === 'beheer' ? 'start' : welk);
      orig.call(this, 'start');
      // Start en Naslag uit; de inhoud van Start weg.
      ['startTabStart', 'startTabNaslag'].forEach(function (k) {
        var t = el(k); if (t) { t.classList.remove('aan'); t.setAttribute('aria-selected', 'false'); }
      });
      if (el('startInhoud')) el('startInhoud').hidden = true;
      if (vak) vak.hidden = false;
      renderBeheer();
    };
  })();

  function datumTijd(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var tijd = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === new Date().toDateString()) return 'vandaag ' + tijd;
    return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' + tijd;
  }
  function mb(bytes) { return (Math.round((bytes || 0) / 104857.6) / 10).toLocaleString('nl-NL') + ' MB'; }

  var gebruikersLijst = [];
  var opslagUitkomst = null;

  function renderBeheer() {
    var vak = el('startBeheer');
    if (!vak) return;
    vak.innerHTML =
      '<section class="start-blok beheer-blok"><div class="start-blokkop"><h2>Gebruikers</h2>' +
        '<button class="btn btn-ghost btn-sm" onclick="glasBeheerVernieuw()">↻</button></div>' +
        '<div class="beheer-uitleg">Een rol per persoon. <b>Collega</b>: werkt zoals altijd; vinkjes uit = dat mag hij niet. ' +
        '<b>Werkvloer</b>: kijken, foto\'s toevoegen en eigen taken afvinken. <b>Beheerder</b>: alles, ook dit tabblad. ' +
        'Een nieuw account maak je in Supabase (Authentication → Users → Add user); het begint als werkvloer. ' +
        'Je eigen rol verander je niet zelf.</div>' +
        '<div id="beheerGebruikers" class="beheer-gebruikers"><div class="taken-leeg">Ophalen…</div></div></section>' +
      '<section class="start-blok beheer-blok"><div class="start-blokkop"><h2>Back-up</h2></div>' +
        '<div class="beheer-uitleg">Elke nacht gaat er vanzelf een back-up naar Dropbox. Hier maak je er zelf een als zip ' +
        'op dit apparaat.' + (window.glasLaatsteBackup && glasLaatsteBackup() ? ' Laatste op dit apparaat: ' +
        esc(String(glasLaatsteBackup()).replace('_', ' om ')) + '.' : '') + '</div>' +
        '<button class="btn btn-secondary btn-sm" onclick="glasBackup()">💾 Back-up maken</button></section>' +
      '<section class="start-blok beheer-blok"><div class="start-blokkop"><h2>Prullenbak</h2></div>' +
        '<div class="beheer-uitleg">Na 30 dagen ruimt de app de prullenbak vanzelf op. Wil je eerder ruimte, dan leeg je hem hier. ' +
        'Dat kan niet ongedaan gemaakt worden: de projecten, hun foto\'s en hun logboek gaan weg.</div>' +
        '<div id="beheerPrullenbak"><div class="taken-leeg">Ophalen…</div></div></section>' +
      '<section class="start-blok beheer-blok"><div class="start-blokkop"><h2>Opslag nakijken</h2></div>' +
        '<div class="beheer-uitleg">Welke foto\'s staan er in de opslag, en horen ze nog ergens bij?</div>' +
        '<div id="beheerOpslag"></div>' +
        '<button class="btn btn-secondary btn-sm" onclick="glasBeheerOpslag()">Opslag nakijken</button></section>';
    gebruikersLaden();
    prullenbakLaden();
    if (opslagUitkomst) toonOpslag(opslagUitkomst);
  }
  window.glasBeheerVernieuw = function () { gebruikersLaden(); prullenbakLaden(); };

  function rpcFout(res) {
    var t = res && res.error ? String(res.error.message || res.error.code || 'mislukt') : '';
    if (/PGRST202|42883|Could not find the function/.test(t)) return 'Script 30 is nog niet gedraaid (Supabase → SQL Editor).';
    return t;
  }

  function gebruikersLaden() {
    var c = sb();
    var vak = el('beheerGebruikers');
    if (!vak) return;
    if (!c) { vak.innerHTML = '<div class="taken-leeg">Niet verbonden.</div>'; return; }
    Promise.resolve(c.rpc('glas_beheer_gebruikers')).then(function (res) {
      var fout = rpcFout(res);
      if (fout) { vak.innerHTML = '<div class="taken-leeg">' + esc(fout) + '</div>'; return; }
      gebruikersLijst = (res && res.data) || [];
      toonGebruikers();
    }, function () { vak.innerHTML = '<div class="taken-leeg">Ophalen mislukt (geen bereik?).</div>'; });
  }

  function toonGebruikers() {
    var vak = el('beheerGebruikers');
    if (!vak) return;
    var ik = mijnId();
    vak.innerHTML = '<table class="beheer-tabel"><thead><tr><th>Naam</th><th>Rol</th><th>Mag</th><th>Toegang</th>' +
      '<th>Laatst</th><th>Nu bezig in</th></tr></thead><tbody>' +
      gebruikersLijst.map(function (g) {
        var zelf = g.id === ik;
        var back = g.alleen_lezen === true;
        var vast = zelf || back;
        var rol = back ? '<span class="beheer-vast">back-up (alleen lezen)</span>' :
          '<select data-wie="' + esc(g.id) + '" onchange="glasBeheerZet(this, \'rol\', this.value)"' + (vast ? ' disabled' : '') + '>' +
          ['beheerder', 'collega', 'werkvloer'].map(function (r) {
            return '<option value="' + r + '"' + (g.rol === r ? ' selected' : '') + '>' + ROL_NAAM[r] + '</option>';
          }).join('') + '</select>' + (zelf ? ' <small>(jij)</small>' : '');
        var mag = g.rol === 'collega' && !back ? RECHTEN.map(function (x) {
          return '<label class="beheer-recht"><input type="checkbox" data-wie="' + esc(g.id) + '" data-recht="' + x + '"' +
            (g['mag_' + x] !== false ? ' checked' : '') + (vast ? ' disabled' : '') +
            ' onchange="glasBeheerZet(this, \'mag_' + x + '\', this.checked ? \'true\' : \'false\')"> ' + RECHT_NAAM[x] + '</label>';
        }).join('') : '<small>' + (g.rol === 'beheerder' ? 'alles' : (g.rol === 'werkvloer' ? 'kijken, foto\'s, eigen taken' : '—')) + '</small>';
        var toegang = vast ? (g.actief ? 'ja' : 'geblokkeerd') :
          '<button type="button" class="btn btn-ghost btn-sm" data-wie="' + esc(g.id) + '" onclick="glasBeheerToegang(this)">' +
          (g.actief ? 'Blokkeren' : 'Vrijgeven') + '</button>' + (g.actief ? '' : ' <span class="beheer-geblokkeerd">geblokkeerd</span>');
        var laatst = 'ingelogd ' + datumTijd(g.laatst_ingelogd) + '<br>actief ' + datumTijd(g.gezien_op) +
          (g.app_versie ? ' · ' + esc(g.app_versie) : '') + (g.apparaat ? ' · ' + esc(g.apparaat) : '');
        return '<tr class="' + (g.actief ? '' : 'beheer-uit') + '" data-wie="' + esc(g.id) + '">' +
          '<td data-kop="Naam"><b>' + esc(g.naam || '') + '</b><br><small>' + esc(g.email || '') + '</small></td>' +
          '<td data-kop="Rol">' + rol + '</td><td data-kop="Mag">' + mag + '</td><td data-kop="Toegang">' + toegang + '</td>' +
          '<td data-kop="Laatst"><small>' + laatst + '</small></td><td data-kop="Nu bezig in">' + esc(g.bezig_in || '—') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function gebruikerVan(id) { return gebruikersLijst.filter(function (g) { return g.id === id; })[0] || null; }

  function zetBijDatabase(id, veld, waarde) {
    var c = sb();
    if (!c) return Promise.resolve(false);
    return Promise.resolve(c.rpc('glas_beheer_zet', { p_id: id, p_veld: veld, p_waarde: String(waarde) })).then(function (res) {
      var fout = rpcFout(res);
      if (fout) {
        if (window.appFout) appFout('Niet gewijzigd: ' + fout, { kop: 'Beheer' });
        toonGebruikers();
        return false;
      }
      var g = gebruikerVan(id);
      if (g && res.data) Object.assign(g, res.data);
      toonGebruikers();
      if (window.kortBericht) kortBericht('Opgeslagen. ' + ((g && g.naam) || 'Deze collega') + ' merkt het bij het volgende scherm (of na herladen).', { soort: 'info' });
      return true;
    }, function () {
      if (window.appFout) appFout('Niet gewijzigd: geen verbinding.', { kop: 'Beheer' });
      toonGebruikers();
      return false;
    });
  }

  window.glasBeheerZet = async function (veldEl, veld, waarde) {
    var id = veldEl && veldEl.getAttribute('data-wie');
    var g = gebruikerVan(id);
    if (!g) return;
    if (veld === 'rol' && waarde === 'beheerder' && window.appVraag &&
        !await appVraag((g.naam || g.email) + ' wordt beheerder: mag alles, ook gebruikers en rechten beheren en de ' +
          'prullenbak legen.', { kop: 'Beheerder maken', ja: 'Beheerder maken' })) { toonGebruikers(); return; }
    if (veld === 'rol' && g.rol === 'beheerder' && window.appVraag &&
        !await appVraag((g.naam || g.email) + ' is dan geen beheerder meer.', { kop: 'Rol veranderen', ja: 'Veranderen' })) {
      toonGebruikers(); return;
    }
    return zetBijDatabase(id, veld, waarde);
  };

  window.glasBeheerToegang = async function (knop) {
    var id = knop && knop.getAttribute('data-wie');
    var g = gebruikerVan(id);
    if (!g) return;
    if (g.actief && window.appVraag &&
        !await appVraag((g.naam || g.email) + ' blokkeren? Hij kan daarna niets meer zien of wijzigen. Zijn account blijft ' +
          'bestaan (en zijn naam in het logboek); vrijgeven kan altijd weer.', { kop: 'Blokkeren', ja: 'Blokkeren', gevaarlijk: true })) return;
    return zetBijDatabase(id, 'actief', g.actief ? 'false' : 'true');
  };

  var prulLijst = [];
  function prullenbakLaden() {
    var vak = el('beheerPrullenbak');
    if (!vak) return;
    Promise.resolve(window.glasPrullenbak ? glasPrullenbak() : []).then(function (l) {
      prulLijst = l || [];
      vak.innerHTML = prulLijst.length
        ? '<p>' + (prulLijst.totaal || prulLijst.length) + (prulLijst.length === 1 ? ' project' : ' projecten') +
          ' in de prullenbak.</p><button class="btn btn-secondary btn-sm beheer-gevaar" onclick="glasBeheerPrullenbakLegen()">' +
          'Prullenbak nu legen</button>'
        : '<p>De prullenbak is leeg.</p>';
    }, function () { vak.innerHTML = '<div class="taken-leeg">Ophalen mislukt.</div>'; });
  }

  window.glasBeheerPrullenbakLegen = async function () {
    if (!window.glasIsBeheerder() || !prulLijst.length || !window.glasDefinitiefZonderVraag) return;
    var n = prulLijst.length;
    if (!window.appVraag || !await appVraag(n + (n === 1 ? ' project' : ' projecten') + ' uit de prullenbak nu definitief ' +
        'verwijderen, met foto\'s en logboek? Dit kan niet ongedaan gemaakt worden.',
        { kop: 'Prullenbak legen', ja: 'Definitief verwijderen', gevaarlijk: true })) return;
    var gelukt = 0;
    for (var i = 0; i < prulLijst.length; i++) {
      try { if (await glasDefinitiefZonderVraag(prulLijst[i].id)) gelukt++; } catch (e) {}
    }
    if (window.kortBericht) kortBericht(gelukt + ' van ' + n + ' definitief verwijderd.', { soort: gelukt === n ? 'info' : 'fout' });
    prullenbakLaden();
  };

  var SOORT = {
    1: ['Zonder project', 'geen project noemt ze en hun project bestaat niet meer; deze kunnen weg'],
    2: ['Project in de prullenbak', 'alleen nog genoemd door een project in de prullenbak; gaan mee weg als dat weggaat'],
    3: ['Weggehaald in een project', 'blijven staan zolang het project bestaat (voor ↶)'],
    4: ['Alleen in een oudere stand (logboek)', 'blijven staan zolang het project bestaat'],
    5: ['In gebruik', 'een project noemt ze (ook een apart bewaarde kopie)']
  };
  window.glasBeheerOpslag = function () {
    var c = sb();
    var vak = el('beheerOpslag');
    if (!c || !vak) return Promise.resolve();
    vak.innerHTML = '<div class="taken-leeg">Nakijken…</div>';
    return Promise.resolve(c.rpc('glas_beheer_opslag')).then(function (res) {
      var fout = rpcFout(res);
      if (fout) { vak.innerHTML = '<div class="taken-leeg">' + esc(fout) + '</div>'; return; }
      opslagUitkomst = res.data || [];
      toonOpslag(opslagUitkomst);
    }, function () { vak.innerHTML = '<div class="taken-leeg">Nakijken mislukt (geen bereik?).</div>'; });
  };
  function toonOpslag(lijst) {
    var vak = el('beheerOpslag');
    if (!vak) return;
    var wees = lijst.filter(function (x) { return Number(x.soort) === 1; })[0];
    vak.innerHTML = '<table class="beheer-tabel beheer-opslag"><thead><tr><th>Soort</th><th>Foto\'s</th><th>Grootte</th></tr></thead><tbody>' +
      [1, 2, 3, 4, 5].map(function (s) {
        var x = lijst.filter(function (y) { return Number(y.soort) === s; })[0] || { bestanden: 0, bytes: 0 };
        return '<tr data-soort="' + s + '"><td data-kop="Soort"><b>' + SOORT[s][0] + '</b>' + (SOORT[s][1] ? '<br><small>' + SOORT[s][1] + '</small>' : '') +
          '</td><td data-kop="Foto\'s">' + Number(x.bestanden || 0) + '</td><td data-kop="Grootte">' + mb(Number(x.bytes || 0)) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      (wees && Number(wees.bestanden) > 0
        ? '<button class="btn btn-secondary btn-sm beheer-gevaar" onclick="glasBeheerWeesWeg()">' + Number(wees.bestanden) +
          ' foto\'s zonder project opruimen</button>'
        : '<p>Er staan geen foto\'s zonder project in de opslag.</p>');
  }

  window.glasBeheerWeesWeg = async function () {
    var c = sb();
    if (!c || !window.glasIsBeheerder()) return;
    if (!window.appVraag || !await appVraag('De foto\'s zonder project (hun project is definitief verwijderd) uit de opslag ' +
        'halen? Ze horen nergens meer bij.', { kop: 'Opslag opruimen', ja: 'Opruimen', gevaarlijk: true })) return;
    var res = await Promise.resolve(c.rpc('glas_beheer_wees', { p_max: 1000 })).catch(function () { return null; });
    var fout = rpcFout(res);
    if (fout || !res) { if (window.appFout) appFout('Niet opgeruimd: ' + (fout || 'geen verbinding'), { kop: 'Opslag' }); return; }
    var namen = (res.data || []).map(function (x) { return x.naam; }).filter(Boolean);
    // v124: ook niet wat op dít apparaat nog in een redding staat.
    if (window.glasWachtrij && typeof glasWachtrij.nogNodig === 'function') {
      var nodig = await glasWachtrij.nogNodig(namen);
      if (!nodig) { if (window.appFout) appFout('Niet opgeruimd: kon niet nakijken of de foto\'s nog ergens bij horen.', { kop: 'Opslag' }); return; }
      namen = namen.filter(function (n) { return !nodig[n]; });
    }
    var weg = 0;
    for (var i = 0; i < namen.length; i += 100) {
      var deel = namen.slice(i, i + 100);
      try {
        var r = await c.storage.from('projectfotos').remove(deel);
        if (r && !r.error) weg += deel.length;
      } catch (e) {}
    }
    if (window.kortBericht) kortBericht(weg + ' van ' + namen.length + ' foto\'s opgeruimd.', { soort: weg === namen.length ? 'info' : 'fout' });
    return window.glasBeheerOpslag();
  };

  // Bij het laden: wat dit apparaat al wist (zonder bereik).
  setTimeout(function () { uitGeheugen(); pasToe(); }, 0);
})();
