/* ═══════════════════════════════════════════════════════════════
   Glasopname – ongedaan maken
   Houdt momentopnames bij van de hele opname en zet die terug.
   Bewust géén momentopname per toetsaanslag: bij het betreden van
   een veld wordt de stand bewaard, en bij het verlaten weer
   weggegooid als er niets veranderd is. Eén bewerking = één stap.

   v124 (keuze Jan, "laag 1"): de stappen blijven ook na herladen en na
   een ander project, per apparaat en per project (IndexedDB, zie
   "blijvend" onderaan). Is het project intussen ergens anders veranderd,
   dan vervallen ze: ↶ mag nooit het werk van een ander terugdraaien.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MAX = 40;
  // v124: ook een grens in grootte (tekens JSON, alle stappen samen). Een
  // project met veel tekenwerk heeft grote momentopnames; dan minder stappen.
  var MAX_TEKENS = 4000000;
  var terug = [];      // stapel: [{staat, label}]
  var vooruit = [];
  var bijBetreden = null;
  var inBewerking = false;   // voorkomt dat één handeling meerdere stappen oplevert

  function staat() {
    return JSON.stringify({
      rijen: rijen,
      volgendId: volgendId,
      fotos: fotos,
      info: projectInfo,
      taken: projectTaken,
      project: (document.getElementById('projectNaam') || {}).value || '',
      datum: (document.getElementById('projectDatum') || {}).value || '',
      speling: (document.getElementById('spelingGlobal') || {}).value || '4',
      bijtelling: (document.getElementById('bijtelling') || {}).value || '11'
    });
  }

  function herstel(json) {
    var s = JSON.parse(json);
    rijen = s.rijen || [];
    // v120: nooit terug naar een lager nummer. Na ongedaan maken kreeg een
    // nieuwe ruit anders het nummer van een al bestelde (die werd dan
    // "VERVANGT" in plaats van annuleren + nieuw).
    volgendId = Math.max(volgendId || 1, s.volgendId || rijen.length + 1);
    var nuFotos = (typeof fotos !== 'undefined' && Array.isArray(fotos)) ? fotos : [];
    fotos = s.fotos || [];
    // v124 (review, gegevensverlies): een foto die de werkvloer toevoegde
    // (_erbij, rechten.js glas_foto_erbij) en die nu wel en in de oude stand
    // niet bestaat, blijft staan, zoals een bestelling hieronder. Hij kwam
    // binnen zonder nieuwe stand (glasErbijFotosErbij, geen zetStaat), dus de
    // stappen van vóór die foto vervielen niet; ↶ ↶ haalde hem anders stil
    // weg, ook uit de database. Geldt ook voor ↷ en na herladen (zelfde weg).
    var toenIds = {};
    fotos.forEach(function (f) { if (f && f.id) toenIds[f.id] = true; });
    var bestaatRij = {};
    rijen.forEach(function (r) { if (r) bestaatRij[r.id] = true; });
    nuFotos.forEach(function (f) {
      if (!f || !f.id || !f._erbij || toenIds[f.id]) return;
      var k = JSON.parse(JSON.stringify(f));
      // Bolletjes van ruiten die in de oude stand niet bestaan: weg.
      if (Array.isArray(k.markeringen)) k.markeringen = k.markeringen.filter(function (m) { return m && bestaatRij[m.rijId]; });
      fotos.push(k);
    });
    // De bestelling is een gebeurtenis, geen bewerking: die draai je niet
    // terug met Cmd+Z. Een momentopname van vóór de bestelmail zette status,
    // bestelmoment en slot terug — en daarmee ging het project in de
    // database terug naar 'bezig' terwijl de leverancier de bestelling al
    // had (v91).
    // 'Opgenomen door' hoort daar ook bij: die staat vast en verandert
    // alleen met een wachtwoord (v93), dus Cmd+Z mag hem niet leegmaken.
    var nuInfo = (typeof projectInfo === 'object' && projectInfo) || {};
    projectInfo = s.info || {};
    // De lijst met verstuurde bestellingen (v104) net zo: een bestelling
    // die de deur uit is, haal je niet terug met Cmd+Z.
    ['status', 'besteld', 'bestellingen', 'bestelmail', 'slot', 'opnemer'].forEach(function (k) {
      if (nuInfo[k] === undefined) delete projectInfo[k];
      else projectInfo[k] = nuInfo[k];
    });
    // v124: "Onlangs verwijderd" (herstel.js) volgt ↶, want de ruiten en
    // foto's erin volgen ↶ ook. Behalve taken uit de tabel taken: die staan
    // buiten ↶ om (een taak die weg is, komt met ↶ niet terug), dus hun item
    // blijft zoals het nu is.
    var nuWeg = Array.isArray(nuInfo.onlangsVerwijderd) ? nuInfo.onlangsVerwijderd : [];
    var toenWeg = Array.isArray(projectInfo.onlangsVerwijderd) ? projectInfo.onlangsVerwijderd : [];
    var tabelTaak = function (x) { return x && x.soort === 'taken' && !x.lokaal; };
    var samen = toenWeg.filter(function (x) { return !tabelTaak(x); }).concat(nuWeg.filter(tabelTaak))
      .sort(function (a, b) { return String(a.op || '').localeCompare(String(b.op || '')); });
    if (samen.length) projectInfo.onlangsVerwijderd = samen; else delete projectInfo.onlangsVerwijderd;
    projectTaken = s.taken || [];
    var z = function (id, v) { var e = document.getElementById(id); if (e) e.value = v; };
    z('projectNaam', s.project);
    z('projectDatum', s.datum);
    z('spelingGlobal', s.speling);
    z('bijtelling', s.bijtelling);
    renderTabel();
    herbereken();
    if (window.renderFotos) renderFotos();
    if (window.renderProject) renderProject();
    if (window.merkOpnieuwBeoordelen) merkOpnieuwBeoordelen();
    opslaan();
  }

  // Grenzen: hoogstens MAX stappen en MAX_TEKENS samen. De oudste gaan eerst.
  function bijsnijden() {
    while (terug.length > MAX) terug.shift();
    var n = 0;
    terug.forEach(function (s) { n += s.staat.length; });
    vooruit.forEach(function (s) { n += s.staat.length; });
    while (n > MAX_TEKENS && (terug.length > 1 || vooruit.length)) {
      var weg = terug.length > 1 ? terug.shift() : vooruit.shift();
      n -= weg.staat.length;
    }
  }

  // v124 (de fout met de bolletjes, gemeld door Jan in Safari): de stand bij
  // het betreden van een veld hoort alleen bij wat je ín dat veld doet. Kwam
  // er intussen een andere stap (een bolletje, ↶ in de tabel), en verdween
  // het veld daarna bij het opnieuw tekenen, dan legde het verlaten (focusout)
  // die oude stand nog als "Cel gewijzigd" bovenop. In Safari krijgt een knop
  // bij een klik geen focus, dus het veld blijft actief terwijl ↶ de tabel
  // opnieuw tekent: de volgende ↶ zette het net weggehaalde bolletje dan
  // weer terug. Nu: wat er in het veld getypt was, wordt eerst een eigen
  // stap, en daarna is de stand van het veld op.
  function veldAfsluiten() {
    var nieuw = !!(bijBetreden && bijBetreden.staat !== staat());
    if (nieuw) {
      terug.push({ staat: bijBetreden.staat, label: 'Cel gewijzigd' });
      vooruit.length = 0;
    }
    bijBetreden = null;
    return nieuw;
  }

  function bewaar(label) {
    if (inBewerking) return;   // een handeling die intern andere aanroept = één stap
    veldAfsluiten();
    terug.push({ staat: staat(), label: label || 'Wijziging' });
    vooruit.length = 0;          // na een nieuwe bewerking vervalt opnieuw-doen
    bijsnijden();
    tekenKnoppen();
    gewijzigd();
  }
  window.bewaarStap = bewaar;

  // v123: een stap die bewaard is vóór een handeling die uiteindelijk niets
  // deed (een tik zonder streek op een foto), weer weghalen. Alleen als hij
  // bovenop ligt, dat label heeft én de stand nog precies zo is: dan kan het
  // nooit een echte stap kosten.
  window.stapTerugnemen = function (label) {
    var b = terug[terug.length - 1];
    if (!b || b.label !== label || b.staat !== staat()) return;
    terug.pop();
    tekenKnoppen();
    gewijzigd();
  };

  // De bedieningsbalk per tabel leest hier de momentopnames uit, om er
  // alleen de regels van één tabel uit terug te halen.
  window.undoStapels = function () { return { terug: terug, vooruit: vooruit }; };
  // v124: voor ↶ per tabel (blokbalk.js). Vóór: wat er in een veld getypt
  // was, eerst als eigen stap. Erna: de stapel is herschreven (zie
  // blokOngedaan); opnieuw-doen van het hele project vervalt dan, zoals na
  // elke nieuwe bewerking, en de stapel gaat naar het apparaat.
  window.undoVeldAfsluiten = function () {
    if (!inBewerking && veldAfsluiten()) { bijsnijden(); tekenKnoppen(); gewijzigd(); }
  };
  window.undoBlokGedaan = function () {
    bijBetreden = null;
    vooruit.length = 0;
    bijsnijden();
    tekenKnoppen();
    gewijzigd();
  };
  // Iets uitvoeren zonder dat het opnieuw tekenen (een veld dat verdwijnt,
  // focusout) als bewerking telt.
  window.undoStil = function (fn) {
    var buitenste = !inBewerking;
    inBewerking = true;
    try { return fn(); } finally { if (buitenste) inBewerking = false; bijBetreden = null; }
  };

  // v124 (review): staat er een nieuwere stand van dit project klaar die
  // dit apparaat nog niet overnam (cloud.js vanElders: "… heeft dit project
  // gewijzigd" met ‹… versie laden›, omdat de cursor nog in een vak stond of
  // er werk openstond; ook een tweede tabblad op dezelfde pc), dan draait ↶
  // terug op een oude stand. De database weigert dat dan, en het werk eindigt
  // "apart". Daarom eerst die stand laden. Onthouden tot er een nieuwe stand
  // binnenkomt (undoLeeg), ook als iemand de balk met ✕ wegklikt.
  var nieuwerWacht = null;
  function balkMetLaden() {
    var b = document.getElementById('syncMelding');
    if (!b || b.style.display === 'none' || !b.innerHTML) return false;
    return Array.prototype.some.call(b.querySelectorAll('button'), function (k) { return /versie laden/i.test(k.textContent || ''); });
  }
  function nieuwereStandWacht() {
    var pid = window.glasProjectId || null;
    if (pid && balkMetLaden()) nieuwerWacht = pid;
    return !!pid && nieuwerWacht === pid;
  }
  function weigerOudeStand() {
    if (!nieuwereStandWacht()) return false;
    if (window.kortBericht) {
      kortBericht('Er staat een nieuwere stand van dit project klaar (van een ander apparaat of tabblad). ' +
        'Laad die eerst; ↶ zou anders terugdraaien op een oude stand.',
        { soort: 'info', knop: 'Nieuwe stand laden', ms: 12000,
          actie: function () { if (window.glasHerlaad) glasHerlaad('nog niet opgeslagen vóór het laden van de nieuwere stand'); } });
    }
    return true;
  }
  window.undoNieuwereStandWacht = nieuwereStandWacht;

  window.ongedaan = function () {
    if (weigerOudeStand()) return;
    // Stond de aandacht nog in een veld (bijvoorbeeld een net aangevinkt
    // vakje), dan zag het verlaten van dat veld de teruggezette stand als
    // 'cel gewijzigd' en wiste het opnieuw-doen (gevonden bij v104).
    // v124: wat er in dat veld veranderd was, eerst als eigen stap; die is
    // dan het eerste wat ↶ terugdraait.
    veldAfsluiten();
    // v124: stappen die niets meer veranderen overslaan. Na ↶ in een tabel
    // (blokbalk.js) zijn de stappen van die tabel gelijk aan nu; zonder dit
    // deed Cmd+Z dan een paar keer "niets".
    // Precies gelijk (alleen het volgende nummer telt niet: dat daalt nooit);
    // een stap die alleen lege regels toevoegde is dus wél een stap.
    // Lege onderdelen ({} of [] of null) tellen niet: die maakt de app zelf
    // aan (bijv. info.toebehoren bij ↶ in een tabel).
    var kaal = function (x) {
      if (Array.isArray(x)) return '[' + x.map(kaal).join(',') + ']';
      if (x && typeof x === 'object') {
        return '{' + Object.keys(x).sort().filter(function (k) {
          var v = x[k];
          // v124 (samenvoeging): het stempel van het opslaan (gewOp, gewDoor
          // op een ruit) telt niet; dat komt pas na de stap (cloud.js). Een
          // stap die daarin alleen verschilt, deed anders bij Cmd+Z "niets".
          if (k === 'gewOp' || k === 'gewDoor') return false;
          return v !== undefined && v !== null && !(Array.isArray(v) && !v.length) &&
                 !(typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
        }).map(function (k) { return JSON.stringify(k) + ':' + kaal(x[k]); }).join(',') + '}';
      }
      return JSON.stringify(x);
    };
    var zonderNr = function (j) { var s = JSON.parse(j); delete s.volgendId; return kaal(s); };
    var nuZonder = null;
    try { nuZonder = zonderNr(staat()); } catch (e) {}
    while (terug.length > 0 && nuZonder !== null) {
      var boven;
      try { boven = zonderNr(terug[terug.length - 1].staat); } catch (e) { break; }
      if (boven !== nuZonder) break;
      terug.pop();
    }
    if (!terug.length) { tekenKnoppen(); gewijzigd(); return; }
    var stap = terug.pop();
    vooruit.push({ staat: staat(), label: stap.label });
    herstel(stap.staat);
    bijBetreden = null;
    tekenKnoppen();
    gewijzigd();
    melding('Ongedaan gemaakt: ' + stap.label.toLowerCase());
  };

  window.opnieuw = function () {
    if (weigerOudeStand()) return;
    if (veldAfsluiten()) { bijsnijden(); tekenKnoppen(); gewijzigd(); }
    if (!vooruit.length) return;
    var stap = vooruit.pop();
    terug.push({ staat: staat(), label: stap.label });
    herstel(stap.staat);
    bijBetreden = null;
    tekenKnoppen();
    gewijzigd();
    melding('Opnieuw gedaan: ' + stap.label.toLowerCase());
  };

  function melding(t) {
    var s = document.getElementById('statusBar');
    if (s) s.textContent = t;
  }

  function tekenKnoppen() {
    var u = document.getElementById('knopOngedaan');
    var r = document.getElementById('knopOpnieuw');
    if (u) {
      u.disabled = !terug.length;
      u.title = terug.length
        ? 'Ongedaan maken: ' + terug[terug.length - 1].label
        : 'Niets om ongedaan te maken';
    }
    if (r) {
      r.style.display = vooruit.length ? '' : 'none';
      r.title = vooruit.length ? 'Opnieuw: ' + vooruit[vooruit.length - 1].label : '';
    }
    // v124: de knop "Onlangs verwijderd (n)" (herstel.js) telt mee met elke
    // nieuwe stand: ↶, ↷, een ander project, de versie van een collega.
    if (window.verwijderdTeller) { try { verwijderdTeller(); } catch (e) {} }
  }

  /* ─── blijvend: per apparaat en per project (v124) ─────────────
     Waarom IndexedDB: localStorage heeft in Safari maar ~5 MB, en daar staat
     de kopie van het project al in. Per project twee sleutels:
       's:<project>' de stapels (groot; alleen bij een nieuwe stap),
       'a:<project>' de afdruk van de stand waar de stapels naartoe leiden
                     (klein; na elke opslag).
     Bij het openen (en na herladen) gelden de stapels alleen als de stand op
     het scherm precies die afdruk heeft. Anders is het project ergens anders
     veranderd (een collega, een nieuwere stand van de server): dan vervallen
     ze, met een kort bericht. Nooit het nieuwere werk weg.
     Uitloggen wist alles (undoWisAlles, cloud.js). Lukt IndexedDB niet
     (privévenster, Safari zonder ruimte), dan werkt ↶ gewoon zoals vroeger,
     alleen niet na herladen. */
  var DB_NAAM = 'glasopname_ongedaan';
  var BAK = 'stapels';
  var MAX_PROJECTEN = 10;
  var dbBelofte = null;
  var actief = null;          // het project waar de stapels in het geheugen bij horen
  var laatsteJson = null;     // de stand bij de laatste opslag (van 'actief')
  var afdrukGeschreven = null;
  var stapelsVuil = false;
  var schrijfKlok = null;

  function db() {
    if (dbBelofte) return dbBelofte;
    dbBelofte = new Promise(function (ok) {
      try {
        if (!window.indexedDB) { ok(null); return; }
        var v = indexedDB.open(DB_NAAM, 1);
        v.onupgradeneeded = function () {
          try { v.result.createObjectStore(BAK); } catch (e) {}
        };
        v.onsuccess = function () { ok(v.result); };
        v.onerror = function () { ok(null); };
        v.onblocked = function () { ok(null); };
      } catch (e) { ok(null); }
    });
    return dbBelofte;
  }
  function bak(modus) {
    return db().then(function (d) {
      if (!d) return null;
      try { return d.transaction(BAK, modus).objectStore(BAK); } catch (e) { return null; }
    });
  }
  function verzoek(r) {
    return new Promise(function (ok) {
      if (!r) { ok(null); return; }
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { ok(null); };
    });
  }
  function lees(sleutel) {
    return bak('readonly').then(function (b) {
      if (!b) return null;
      try { return verzoek(b.get(sleutel)); } catch (e) { return null; }
    });
  }
  // Meerdere sleutels in één keer (één transactie): stapels en afdruk
  // horen samen; een half geschreven paar mag niet bestaan.
  function schrijf(paren) {
    return bak('readwrite').then(function (b) {
      if (!b) return false;
      try {
        paren.forEach(function (p) { if (p[1] === null) b.delete(p[0]); else b.put(p[1], p[0]); });
        return new Promise(function (ok) {
          b.transaction.oncomplete = function () { ok(true); };
          b.transaction.onerror = b.transaction.onabort = function () { ok(false); };
        });
      } catch (e) { return false; }
    }).catch(function () { return false; });
  }

  // De afdruk: dezelfde vorm als de vingerafdruk in cloud.js (sleutels op
  // volgorde: de database schudt ze door elkaar), zonder wat de app zelf
  // uitrekent of stempelt (glasmaat, gewicht, gewOp/gewDoor) en zonder lege
  // regels (die zet de app zelf klaar). volgendId telt niet: dat daalt nooit.
  var NIET_IN_AFDRUK = { glasBreedte: 1, glasHoogte: 1, totaalDikte: 1, kgM2: 1, gewDoor: 1, gewOp: 1 };
  function canon(x) {
    if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
    if (x && typeof x === 'object') {
      return '{' + Object.keys(x).filter(function (k) { return x[k] !== undefined; }).sort()
        .map(function (k) { return JSON.stringify(k) + ':' + canon(x[k]); }).join(',') + '}';
    }
    return JSON.stringify(x === undefined ? null : x);
  }
  function legeRegel(r) {
    return !Object.keys(r || {}).some(function (k) {
      return k !== 'id' && !NIET_IN_AFDRUK[k] && r[k] !== '' && r[k] != null &&
        !(k === 'aantal' && String(r[k]) === '1') && k !== 'maatsoort' &&
        !(k === 'rooster' && r[k] === 'Nee') && !(k === 'glasbewerking' && /standaard/.test(r[k])) &&
        !(k === 'roedenverdeling' && /^Geen/.test(r[k]));
    });
  }
  function afdrukVan(s) {
    s = s || {};
    var rij = (Array.isArray(s.rijen) ? s.rijen : []).filter(function (r) { return r && !legeRegel(r); })
      .map(function (r) {
        var k = {};
        Object.keys(r).forEach(function (v) { if (!NIET_IN_AFDRUK[v]) k[v] = r[v]; });
        return k;
      });
    return canon({
      rijen: rij,
      fotos: Array.isArray(s.fotos) ? s.fotos : [],
      info: (s.info && typeof s.info === 'object') ? s.info : {},
      taken: Array.isArray(s.taken) ? s.taken : [],
      project: String(s.project == null ? '' : s.project),
      datum: String(s.datum == null ? '' : s.datum),
      speling: String(s.speling == null ? '4' : s.speling),
      bijtelling: String(s.bijtelling == null ? '11' : s.bijtelling)
    });
  }
  window.undoAfdruk = function (d) { return afdrukVan(d); };   // voor de test

  function wie() {
    try { return (window.glasGebruiker && glasGebruiker().id) || null; } catch (e) { return null; }
  }

  // Na elke stap: de stapels moeten (een tel later) naar het apparaat.
  function gewijzigd() {
    stapelsVuil = true;
    if (actief === null && window.glasProjectId) actief = window.glasProjectId;
    laatsteJson = staat();
    planSchrijven();
  }
  function planSchrijven() {
    clearTimeout(schrijfKlok);
    schrijfKlok = setTimeout(function () { nuSchrijven(); }, 300);
  }
  // Schrijft voor het project 'actief' (de stand in laatsteJson hoort daarbij).
  function nuSchrijven() {
    clearTimeout(schrijfKlok);
    schrijfKlok = null;
    var pid = actief, ik = wie();
    if (!pid || !ik || laatsteJson === null) return Promise.resolve();
    var afdruk;
    try { afdruk = afdrukVan(JSON.parse(laatsteJson)); } catch (e) { return Promise.resolve(); }
    var paren = [];
    if (stapelsVuil) {
      stapelsVuil = false;
      if (!terug.length && !vooruit.length) {
        paren.push(['s:' + pid, null], ['a:' + pid, null]);
      } else {
        paren.push(['s:' + pid, { wie: ik, op: Date.now(), terug: terug.slice(), vooruit: vooruit.slice() }]);
        paren.push(['a:' + pid, { wie: ik, op: Date.now(), afdruk: afdruk }]);
      }
    } else if (afdruk !== afdrukGeschreven && (terug.length || vooruit.length)) {
      paren.push(['a:' + pid, { wie: ik, op: Date.now(), afdruk: afdruk }]);
    }
    afdrukGeschreven = afdruk;
    if (!paren.length) return Promise.resolve();
    return schrijf(paren).then(opruimenOud);
  }

  // Niet meer dan MAX_PROJECTEN projecten bewaren (de oudste eruit).
  var opgeruimd = false;
  function opruimenOud() {
    if (opgeruimd) return;
    opgeruimd = true;
    bak('readonly').then(function (b) {
      if (!b) return;
      var lijst = [];
      try {
        var c = b.openCursor();
        c.onsuccess = function () {
          var k = c.result;
          if (k) { if (/^a:/.test(k.key)) lijst.push({ pid: k.key.slice(2), op: (k.value && k.value.op) || 0 }); k.continue(); return; }
          lijst.sort(function (x, y) { return y.op - x.op; });
          var weg = lijst.slice(MAX_PROJECTEN).filter(function (x) { return x.pid !== actief; });
          if (weg.length) schrijf([].concat.apply([], weg.map(function (x) { return [['s:' + x.pid, null], ['a:' + x.pid, null]]; })));
        };
      } catch (e) {}
    });
  }

  // De stapels van een project ophalen en alleen overnemen als de stand op
  // het scherm nog precies is waar ze naartoe leidden.
  //  zeker: de stand komt net binnen (zetStaat); is hij anders, dan
  //         vervallen de stapels (weg + bericht). Bij de eerste blik na het
  //         laden (zeker = false) alleen overnemen, nooit weggooien: daar kan
  //         nog de inhoud van een ander project op het scherm staan.
  var ophalen = 0;
  function overnemen(pid, zeker) {
    var ik = wie();
    if (!pid || !ik) return Promise.resolve();
    var nr = ++ophalen;
    var json = staat();
    return Promise.all([lees('s:' + pid), lees('a:' + pid)]).then(function (r) {
      var s = r[0], a = r[1];
      if (nr !== ophalen || window.glasProjectId !== pid || actief !== pid) return;
      if (!s || !Array.isArray(s.terug) || (!s.terug.length && !(s.vooruit || []).length)) return;
      var past = s.wie === ik && a && a.wie === ik && a.afdruk === afdrukVan(JSON.parse(json)) && staat() === json;
      if (!past) {
        if (!zeker) return;
        schrijf([['s:' + pid, null], ['a:' + pid, null]]);
        if (s.wie === ik && window.kortBericht) {
          kortBericht('↶ kan niet verder terug dan nu: dit project is intussen op een ander apparaat of tabblad gewijzigd.',
                      { soort: 'info', ms: 9000 });
        }
        return;
      }
      // Wat er in deze sessie al gebeurde, komt bovenop.
      var eigenNu = terug.length || vooruit.length;
      terug = s.terug.concat(terug);
      if (!eigenNu) vooruit = (s.vooruit || []).slice();
      bijsnijden();
      tekenKnoppen();
      if (eigenNu) { stapelsVuil = true; planSchrijven(); }
    });
  }

  // Alles vergeten. Aangeroepen door cloud.js zodra er een andere inhoud
  // binnenkomt: een ander project, een nieuw project, terug naar het
  // startscherm, of de versie van een collega (v91).
  //
  // Zonder dit bleven de momentopnames van het vórige project staan. Wie
  // project A bewerkte, project B opende en Cmd+Z deed, kreeg de inhoud
  // van A in B — en die ging naar de database van B. De momentopnames van
  // vóór een wijziging van een collega horen om dezelfde reden weg: één
  // keer ongedaan maken zou zijn werk stilzwijgend terugdraaien.
  //
  // v124: eerst wordt bewaard wat er in het geheugen staat (voor het vorige
  // project, met de stand van zijn laatste opslag). Dan: is de nieuwe stand
  // hetzelfde project met precies dezelfde inhoud (bijv. de server gaf terug
  // wat dit apparaat net opsloeg), dan blijven de stappen. Anders leeg, en
  // daarna de bewaarde stappen van het nieuwe project ophalen als die er
  // precies op passen.
  window.undoLeeg = function () {
    var vorige = actief;
    var nuPid = window.glasProjectId || null;
    var nuJson = staat();
    var hadStappen = terug.length || vooruit.length;
    var zelfde = false;
    if (vorige && vorige === nuPid && hadStappen && laatsteJson !== null) {
      try { zelfde = afdrukVan(JSON.parse(laatsteJson)) === afdrukVan(JSON.parse(nuJson)); } catch (e) {}
    }
    if (vorige && vorige !== nuPid && (hadStappen || stapelsVuil || schrijfKlok)) {
      // Het vorige project: zijn stapels met de stand van zijn laatste opslag.
      stapelsVuil = stapelsVuil || !!hadStappen;
      nuSchrijven();
    }
    bijBetreden = null;
    nieuwerWacht = null;      // er kwam een nieuwe stand binnen
    if (window.blokVooruitLeeg) blokVooruitLeeg();
    if (zelfde) { laatsteJson = nuJson; tekenKnoppen(); return; }
    var wasHier = vorige && vorige === nuPid && hadStappen;
    clearTimeout(schrijfKlok);
    schrijfKlok = null;
    terug.length = 0;
    vooruit.length = 0;
    tekenKnoppen();
    actief = nuPid;
    laatsteJson = nuJson;
    afdrukGeschreven = null;
    stapelsVuil = false;
    if (!nuPid) return;
    if (wasHier) {
      // Zelfde project, andere inhoud (een collega, een nieuwere stand):
      // de stappen van dit apparaat vervallen.
      schrijf([['s:' + nuPid, null], ['a:' + nuPid, null]]);
      if (window.kortBericht) {
        kortBericht('↶ kan niet verder terug dan nu: dit project is intussen op een ander apparaat of tabblad gewijzigd.',
                    { soort: 'info', ms: 9000 });
      }
      return;
    }
    overnemen(nuPid, true);
  };

  // Uitloggen (cloud.js): alle bewaarde stappen van dit apparaat weg. Ze
  // bevatten klantgegevens, en het apparaat kan gedeeld zijn (v123).
  window.undoWisAlles = function () {
    clearTimeout(schrijfKlok);
    schrijfKlok = null;
    terug.length = 0;
    vooruit.length = 0;
    bijBetreden = null;
    actief = null;
    laatsteJson = null;
    stapelsVuil = false;
    tekenKnoppen();
    var leeg = bak('readwrite').then(function (b) {
      if (!b) return;
      try { b.clear(); } catch (e) {}
      return new Promise(function (ok) { b.transaction.oncomplete = b.transaction.onerror = b.transaction.onabort = function () { ok(); }; });
    });
    return leeg.catch(function () {});
  };

  function omhulOpslaan() {
    var orig = window.opslaan;
    if (typeof orig !== 'function' || orig.__undo) return;
    var nieuw = function () {
      var r = orig.apply(this, arguments);
      try {
        var pid = window.glasProjectId || null;
        if (pid && actief === null) { actief = pid; overnemen(pid, false); }
        if (pid && pid === actief) {
          var j = staat();
          if (j !== laatsteJson) { laatsteJson = j; planSchrijven(); }
        }
      } catch (e) {}
      return r;
    };
    nieuw.__undo = true;
    window.opslaan = nieuw;
  }

  /* ─── bewerkingen die een stap opleveren ───────────────────── */

  function omhul(naam, label) {
    var orig = window[naam];
    if (typeof orig !== 'function') return;
    window[naam] = function () {
      var l = typeof label === 'function' ? label.apply(null, arguments) : label;
      // Op slot weigert de functie zelf; dan ook geen lege stap maken. Die
      // wiste anders 'opnieuw' en gaf een ↶ die niets deed (v91).
      if (!(window.invoerOpSlot && invoerOpSlot())) bewaar(l);
      var buitenste = !inBewerking;
      inBewerking = true;
      try {
        return orig.apply(this, arguments);
      } finally {
        if (buitenste) inBewerking = false;
      }
    };
  }

  function kolomNaam(veld) {
    var namen = {
      aantal: 'Aantal', merk: 'Merk', maatsoort: 'Maatsoort', breedte: 'Breedte',
      hoogte: 'Hoogte', opbouw: 'Opbouw', rooster: 'Rooster', ducoType: 'Duco type',
      ralKleur: 'RAL kleur', glasbewerking: 'Glasbewerking', opmerking: 'Opmerking',
      roedenverdeling: 'Roedenverdeling', roedenbreedte: 'Roedenbreedte',
      roedenopmerking: 'Roeden-opmerking',
      biColor: 'Bi-color', ralBinnen: 'RAL binnen'   // v114
    };
    return namen[veld] || veld;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Geen knoppen meer in de kopbalk: elke tabel heeft zijn eigen
    // ongedaan-knop. De sneltoets blijft wel het hele project terugdraaien.
    var acties = null;
    if (acties) {
      var u = document.createElement('button');
      u.id = 'knopOngedaan';
      u.className = 'btn btn-sm btn-undo';
      u.innerHTML = '<span class="pijl">↶</span> Ongedaan';
      u.onclick = window.ongedaan;
      u.disabled = true;
      var r = document.createElement('button');
      r.id = 'knopOpnieuw';
      r.className = 'btn btn-sm btn-undo';
      r.innerHTML = '<span class="pijl">↷</span> Opnieuw';
      r.onclick = window.opnieuw;
      r.style.display = 'none';
      acties.insertBefore(r, acties.firstChild);
      acties.insertBefore(u, acties.firstChild);
    }

    // Typen in een veld: stand bewaren bij binnenkomen, weggooien als
    // er niets is veranderd. Zo levert één bewerkte cel één stap op,
    // en niet één per toetsaanslag.
    // Aan het document, niet aan één tabel: de tabellen onder een foto
    // worden pas later opgebouwd en hebben een eigen tbody. Die kregen
    // daardoor nooit een momentopname, en één keer ongedaan maken wiste
    // alles wat er onder die foto ingetypt was (v83).
    function inInvoertabel(el) {
      return el && el.closest && el.closest('table.invoer') &&
             el.matches('input, select, textarea');
    }

    document.addEventListener('focusin', function (e) {
      if (inBewerking || !inInvoertabel(e.target)) return;
      bijBetreden = { staat: staat(), label: null };
    }, true);

    // v124: was de stand van het veld op (er kwam een andere stap tussen,
    // zie veldAfsluiten) en typt of kiest de gebruiker daarna tóch weer in
    // hetzelfde veld, dan hier de stand van vóór die wijziging. Dit luistert
    // in de vangfase: het draait vóór het oninput/onchange van het veld zelf,
    // dus de gegevens zijn dan nog niet veranderd.
    ['input', 'change'].forEach(function (soort) {
      document.addEventListener(soort, function (e) {
        if (inBewerking || bijBetreden || !inInvoertabel(e.target)) return;
        bijBetreden = { staat: staat(), label: null };
      }, true);
    });

    document.addEventListener('focusout', function (e) {
      if (inBewerking || !bijBetreden || !inInvoertabel(e.target)) return;
      var voor = bijBetreden;
      bijBetreden = null;
      if (voor.staat === staat()) return;                  // niets veranderd
      terug.push({ staat: voor.staat, label: 'Cel gewijzigd' });
      vooruit.length = 0;
      bijsnijden();
      tekenKnoppen();
      gewijzigd();
    }, true);

    // Losse bewerkingen
    omhul('verwijderRij', 'Rij verwijderd');
    omhul('clearAlles', 'Alles leeggemaakt');
    omhul('setCorrectie', 'Correctie gewijzigd');
    // v111: de keuzelijst wordt bij het kiezen vervangen, dan komt er geen
    // focusout; zonder deze stap nam Cmd+Z de bediening stil mee terug.
    // (De lengte is een gewoon vak: die stap komt al via focusin/focusout;
    // omhullen zou hem dubbel geven.)
    omhul('setBediening', 'Bediening gewijzigd');
    omhul('wijzigGlasType', 'Glastype gewijzigd');
    omhul('voegRijenToe', function (n) { return (n || 1) + ' rijen toegevoegd'; });
    omhul('bulkPasToe', 'Waarde doorgevoerd');
    omhul('bulkVerwijderSelectie', 'Selectie verwijderd');
    omhul('impToevoegen', 'Import toegevoegd');
    omhul('impVervangen', 'Lijst vervangen door import');
    omhul('datumVandaag', 'Datum ingevuld');

    // v124: elke opslag vertelt de bewaarde stapels waar ze naartoe leiden.
    omhulOpslaan();
    // v124 (review): ook ↶ en ↷ per tabel (blokbalk.js) niet terugdraaien op
    // een oude stand als er een nieuwere klaarstaat (zie weigerOudeStand).
    ['blokOngedaan', 'blokOpnieuw'].forEach(function (naam) {
      var orig = window[naam];
      if (typeof orig !== 'function' || orig.__nieuwer) return;
      var nieuw = function () { if (weigerOudeStand()) return; return orig.apply(this, arguments); };
      nieuw.__nieuwer = true;
      window[naam] = nieuw;
    });
    var balk = document.getElementById('syncMelding');
    if (balk && typeof MutationObserver === 'function') {
      new MutationObserver(function () { nieuwereStandWacht(); }).observe(balk, { childList: true, subtree: true, attributes: true });
    }
    // Weg van de pagina (herladen, app naar de achtergrond): nu bewaren,
    // niet pas over 0,3 s.
    var nuWeg = function () { if (schrijfKlok) nuSchrijven(); };
    window.addEventListener('pagehide', nuWeg);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') nuWeg(); });
    // Herladen met werk dat nog omhoog moest: dan komt er geen nieuwe stand
    // binnen (zetStaat), maar is de kopie op het apparaat de stand. Even
    // kijken of de stappen daarop passen.
    var pogingen = 0;
    var kijk = setInterval(function () {
      if (++pogingen > 120 || actief !== null) { clearInterval(kijk); return; }
      if (window.glasProjectId && wie()) {
        clearInterval(kijk);
        actief = window.glasProjectId;
        laatsteJson = staat();
        overnemen(actief, false);
      }
    }, 500);

    // Sneltoets, maar niet terwijl je in een tekstveld staat:
    // daar hoort Cmd+Z de tekst zelf ongedaan te maken.
    // Ongedaan maken: Cmd+Z / Ctrl+Z. Opnieuw: Cmd+Shift+Z (Mac) en
    // Ctrl+Y of Ctrl+Shift+Z (Windows, v104: Ctrl+Y deed tot v103 niets).
    // In een invoerveld houdt de browser zijn eigen ongedaan-maken voor
    // de tekst die je net typt.
    document.addEventListener('keydown', function (e) {
      var k = String(e.key || '').toLowerCase();
      var mod = e.metaKey || e.ctrlKey;
      if (!mod || e.altKey) return;
      var terug = k === 'z' && !e.shiftKey;
      var vooruit = (k === 'z' && e.shiftKey) || (k === 'y' && e.ctrlKey && !e.metaKey && !e.shiftKey);
      if (!terug && !vooruit) return;
      // Staat er een venster open (zoals "Naar de leverancier?"), dan niets
      // terugdraaien onder dat venster door (v104).
      if (window.appMeldingBezig && appMeldingBezig()) return;
      var a = document.activeElement;
      // Alleen tekstvelden houden hun eigen ongedaan-maken; een net
      // aangevinkt vakje of een keuzelijst niet.
      if (a && (a.isContentEditable || a.matches('textarea, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])'))) return;
      e.preventDefault();
      if (vooruit) window.opnieuw(); else window.ongedaan();
    });

    tekenKnoppen();
  });
})();
