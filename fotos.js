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
  // De foto van de leverlocatie staat in dezelfde lijst — zo werken het
  // tekenen, draaien en zoomen er onveranderd op — maar hij hoort niet
  // thuis in de rij kozijnen op het invoertabblad.
  function werkFotos() { return fotos.filter(function (f) { return f.soort !== 'lever'; }); }
  window.werkFotos = werkFotos;
  window.leverFoto = function () { return fotos.find(function (f) { return f.soort === 'lever'; }); };
  function rijenVan(fotoId) { return rijen.filter(function (r) { return r.fotoId === fotoId; }); }

  /* ─── merkletters ──────────────────────────────────────────── */
  // A t/m Z, daarna A1 t/m Z1, A2 … Al gebruikte letters worden
  // overgeslagen, ook die van losse regels.

  // A t/m Z, daarna AA, AB, AC — zoals kolommen in een spreadsheet.
  // Bewust geen A1, B1: een merk met een cijfer betekent in deze app
  // altijd 'ruit zoveel van kozijn zoveel' en dat mag niet dubbelzinnig
  // worden zodra er ook geïmporteerde maten in het project staan.
  window.volgendMerk = function () {
    var gebruikt = {};
    rijen.forEach(function (r) {
      var m = (r.merk || '').trim().toUpperCase();
      if (m) gebruikt[m] = true;
    });
    for (var n = 0; n < 20000; n++) {
      var letter = '', rest = n;
      do {
        letter = String.fromCharCode(65 + (rest % 26)) + letter;
        rest = Math.floor(rest / 26) - 1;
      } while (rest >= 0);
      if (!gebruikt[letter]) return letter;
    }
    return '?';
  };

  function labelVan(rij) {
    if (!rij) return '?';
    return (rij.merk && rij.merk.trim()) ? rij.merk.trim() : '·';
  }

  /* ─── meer bolletjes bij een aantal groter dan 1 ───────────── */
  // Een regel met aantal 3 is drie gelijke ruiten op één bestelregel. Die
  // krijgt dus drie bolletjes, elk met hetzelfde merk. Zo blijft de
  // bestellijst compact (één regel ×3 in plaats van drie regels ×1) en
  // staat toch elke ruit op de foto.

  function aantalVan(rij) {
    var n = parseInt(rij && rij.aantal, 10);
    return n > 0 ? n : 1;
  }

  // Hoeveel bolletjes deze regel al heeft, over alle foto's heen.
  function bollenVan(rijId) {
    var n = 0;
    fotos.forEach(function (f) {
      (f.markeringen || []).forEach(function (m) { if (m.rijId === rijId) n++; });
    });
    return n;
  }

  // Het hoeveelste bolletje van zijn regel dit is (1, 2, 3 …), op volgorde
  // van de foto's en daarbinnen van plaatsing. Bolletjes boven het aantal
  // zijn er te veel — bijvoorbeeld als het aantal achteraf omlaag ging.
  function volgnummerVan(fotoId, index) {
    var foto = fotoVan(fotoId);
    var doel = foto && foto.markeringen[index];
    if (!doel) return 0;
    var n = 0;
    for (var i = 0; i < fotos.length; i++) {
      var lijst = fotos[i].markeringen || [];
      for (var j = 0; j < lijst.length; j++) {
        if (lijst[j].rijId !== doel.rijId) continue;
        n++;
        if (lijst[j] === doel) return n;
      }
    }
    return n;
  }

  /* ─── v124: één ruit, bolletjes verdeeld over de tekeningen ────
     Keuze van Jan (26-10-2026): een regel uit de maatstaat (bijv. A, 3
     stuks) blijft één ruit en één regel op de bestellijst; zijn bolletjes
     mogen op verschillende tekeningen staan (3 ruiten uit één regel in 2 of
     3 kozijnen). De ruit zelf staat in het blok van de tekening met de
     meeste bolletjes (bij gelijk: de eerste); in de andere blokken staat
     een verwijzing ("A1 ×1 hier, staat bij tekening 1"). Een ruit zonder
     bolletjes blijft waar hij is. Verhuizen gebeurt alleen bij een
     handeling met de bolletjes (aanwijzen, weghalen), in dezelfde stap voor
     ↶; nooit vanzelf bij het openen. Het blok (fotoId) zit niet in het
     kenmerk (ruitKenmerk), dus verhuizen is geen wijziging van de bestelling. */

  // Per foto hoeveel bolletjes een ruit heeft: [{ foto, n }] op volgorde
  // van de foto's (de leverfoto telt niet).
  function bollenPerFoto(rijId) {
    var uit = [];
    werkFotos().forEach(function (f) {
      var n = (f.markeringen || []).filter(function (m) { return m.rijId === rijId; }).length;
      if (n) uit.push({ foto: f, n: n });
    });
    return uit;
  }
  window.bollenPerFoto = bollenPerFoto;

  // De tekening waar de ruit thuishoort: de meeste bolletjes, bij gelijk de
  // eerste. Geen bolletjes: null (de ruit blijft dan waar hij is).
  function thuisVan(rijId) {
    var beste = null;
    bollenPerFoto(rijId).forEach(function (x) { if (!beste || x.n > beste.n) beste = x; });
    return beste ? beste.foto.id : null;
  }
  window.ruitThuis = thuisVan;

  // De ruit naar zijn tekening verhuizen (alleen fotoId; de bolletjes
  // blijven waar ze staan). Geeft true als hij verhuisde.
  function naarBolletjes(rij) {
    if (!rij) return false;
    var thuis = thuisVan(rij.id);
    if (!thuis || rij.fotoId === thuis) return false;
    rij.fotoId = thuis;
    return true;
  }

  // Het nummer en de naam van een blok zoals in de kop ("tekening 2").
  function blokNaam(fotoId) {
    var lijst = werkFotos();
    var f = fotoVan(fotoId);
    var i = lijst.indexOf(f);
    if (!f || i < 0) return 'de losse maten';
    return (f.pad || f.bron === 'tekening' ? soortNaam(f) : 'groep') + ' ' + (i + 1);
  }

  // Ruiten die (ook) op deze foto bolletjes hebben, maar in een ander blok
  // staan: de verwijzingen. En voor het eigen blok: waar de eigen ruiten nog
  // meer staan. Voor het scherm en de pdf invoer.
  window.fotoVerwijzingen = function (fotoId) {
    var foto = fotoVan(fotoId);
    if (!foto) return { elders: [], ookElders: [] };
    var gezien = {}, elders = [], ookElders = [];
    (foto.markeringen || []).forEach(function (m) {
      if (gezien[m.rijId]) return;
      gezien[m.rijId] = true;
      var rij = getRij(m.rijId);
      if (!rij || rij.fotoId === fotoId) return;
      var per = bollenPerFoto(rij.id);
      var hier = (per.filter(function (x) { return x.foto.id === fotoId; })[0] || { n: 0 }).n;
      var nr = werkFotos().indexOf(fotoVan(rij.fotoId)) + 1;
      elders.push({ rij: rij, hier: hier, thuis: rij.fotoId || null, thuisNr: nr, thuisNaam: blokNaam(rij.fotoId) });
    });
    rijenVan(fotoId).forEach(function (rij) {
      bollenPerFoto(rij.id).forEach(function (x) {
        if (x.foto.id === fotoId) return;
        ookElders.push({ rij: rij, n: x.n, foto: x.foto.id, nr: werkFotos().indexOf(x.foto) + 1, naam: blokNaam(x.foto.id) });
      });
    });
    return { elders: elders, ookElders: ookElders };
  };

  // Naar een ruit in zijn eigen blok (een tik op de verwijzing): het blok
  // openklappen, ernaartoe en de regel even laten oplichten. Alleen kijken:
  // ook op slot en bij alleen kijken.
  window.naarRuit = function (rijId) {
    var rij = getRij(rijId);
    if (!rij) return;
    var blok = rij.fotoId && fotoVan(rij.fotoId) ? rij.fotoId : 'los';
    if (typeof blokDicht !== 'undefined' && blokDicht[blok] && window.blokKlap) blokKlap(blok);
    var tr = el('rij-' + rijId);
    if (!tr) return;
    tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
    tr.classList.add('gemarkeerd');
    setTimeout(function () { tr.classList.remove('gemarkeerd'); }, 2200);
  };
  // Naar een andere tekening (vanuit "ook op tekening 2").
  window.naarFoto = function (fotoId) {
    if (typeof blokDicht !== 'undefined' && blokDicht[fotoId] && window.blokKlap) blokKlap(fotoId);
    var b = el('blok-' + fotoId);
    if (b) b.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  // Klasse en uitleg van een bolletje op één plek, zodat tekenen en
  // bijwerken hetzelfde laten zien.
  function bolStaat(fotoId, index) {
    var foto = fotoVan(fotoId);
    var m = foto && foto.markeringen[index];
    var rij = m ? getRij(m.rijId) : null;
    if (!rij) {
      return { klasse: 'foto-mark verweesd', label: '?',
               titel: 'De regel bij deze markering bestaat niet meer' };
    }
    var label = labelVan(rij);
    var aantal = aantalVan(rij);
    var nr = volgnummerVan(fotoId, index);
    var klasse = 'foto-mark' + (label.length > 2 ? ' lang' : '');
    var titel = 'Naar de regel van ' + label;
    if (aantal > 1) titel = label + ' · ruit ' + Math.min(nr, aantal) + ' van ' + aantal;
    if (nr > aantal) {
      klasse += ' teveel';
      titel = label + ' · één bolletje te veel: het aantal is ' + aantal;
    }
    return { klasse: klasse, label: label, titel: titel, nr: nr, aantal: aantal };
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
      img.onerror = function () {
        URL.revokeObjectURL(url);
        // Herkennen aan naam en type, en anders aan de eerste bytes: de
        // fotokiezer op Android geeft vaak geen extensie en soms geen type.
        Promise.resolve(isHeic(file) || heicVanBinnen(file)).then(function (heic) {
          if (heic) { heicMelding(); var h = new Error(HEIC_KORT); h.heic = true; fout(h); return; }
          fout(new Error('Kan de afbeelding niet lezen'));
        });
      };
      img.src = url;
    });
  }

  // HEIC is het fotoformaat van de iPhone (v104). Safari op iPhone, iPad
  // en Mac kan het lezen, Chrome en Edge op Windows en Android niet. Een
  // iPhone-foto die via AirDrop, mail of OneDrive op een Windows-pc of
  // Android-toestel komt, gaf tot v103 alleen 'Mislukt: Kan de afbeelding
  // niet lezen'. Omzetten in de browser vraagt een bibliotheek van ruim een
  // megabyte; dat weegt niet op tegen een duidelijke uitleg. Er gaat niets
  // verloren: de foto staat nog gewoon waar hij vandaan kwam.
  var HEIC_KORT = 'deze foto is HEIC (iPhone-formaat) en kan in deze browser niet geopend worden';
  function isHeic(file) {
    var t = String((file && file.type) || '').toLowerCase();
    return /image\/hei[cf]/.test(t) || /\.(heic|heif)$/i.test((file && file.name) || '');
  }
  window.glasIsHeic = isHeic;
  // Een HEIC/HEIF-bestand begint met '....ftyp' en een merk als heic, heix,
  // hevc, mif1 (ISO-container). Zo herkennen we hem ook zonder naam of type.
  function heicVanBinnen(file) {
    if (!file || !file.slice) return Promise.resolve(false);
    var stuk = file.slice(0, 16);
    var lees = stuk.arrayBuffer ? stuk.arrayBuffer() : new Response(stuk).arrayBuffer();
    return lees.then(function (ab) {
      var b = new Uint8Array(ab);
      if (b.length < 12) return false;
      var t = String.fromCharCode.apply(null, Array.prototype.slice.call(b, 4, 12));
      return /^ftyp(hei[cxms]|hev[cxms]|mif1|msf1|avci)$/.test(t);
    }, function () { return false; });
  }
  function heicMelding() {
    if (!window.appFout) return;
    appFout('Deze foto is in HEIC/HEIF-formaat (de zuinige opslag van iPhones en sommige Samsung-' +
            'telefoons). Deze browser kan dat niet openen, dus de foto is niet toegevoegd. Er is niets ' +
            'verloren: de foto staat nog waar hij vandaan kwam.\n' +
            'Zo lukt het wel:\n' +
            '• voeg de foto toe vanaf de iPhone of iPad zelf (die zet hem vanzelf om), of\n' +
            '• laat nieuwe foto\'s voortaan als JPG maken: op de iPhone Instellingen → Camera → ' +
            'Formaten → "Meest compatibel"; op een Samsung in de camera-instellingen ' +
            '"Hoge-efficiëntiefoto\'s" uitzetten.',
            { kop: 'Foto in HEIC-formaat' });
  }

  /* ─── bewaren: eerst op het apparaat, dan naar de cloud (v93) ── */
  // Tot v92 ging een foto pas in het project als de upload meteen lukte.
  // Zonder bereik was hij weg. Nu gaat hij eerst in de wachtrij op het
  // apparaat (wachtrij.js) en meteen in het project; het uploaden gebeurt
  // op de achtergrond zodra het kan.
  //
  // Werkt de wachtrij op dit apparaat niet (Safari privé, opslag vol), dan
  // uploaden we zoals vroeger: meteen, met een tijdslimiet.

  function nieuwPad(voorvoegsel, extensie) {
    return window.glasProjectId + '/' + (voorvoegsel || '') + Date.now() + '-' +
           Math.random().toString(36).slice(2, 8) + '.' + (extensie || 'jpg');
  }

  /* ─── een foto die nog verwerkt wordt (v123) ─────────────────
     Uit de controle van v90: verkleinen kan op een iPad een paar seconden
     duren. Opende je intussen een ander project, dan kwam de foto in dát
     project terecht. Nu:
      - telt de app hoeveel foto's er nog verwerkt worden (glasFotoBezig);
        cloud.js wacht daarop vóór er een ander project opent;
      - kijkt elke stap of het project nog hetzelfde is (zelfdeProject); zo
        niet, dan stopt hij met een melding en komt de foto nergens anders
        in (het bestand zelf staat dan nog in je fotobibliotheek). */
  var bezigTeller = 0;
  window.glasFotoBezig = function () { return bezigTeller > 0; };
  // Hoogstens 2 minuten "bezig" per foto: hangt er iets (bijv. de opslag
  // van Safari na het hervatten van de app), dan houdt dat het wisselen van
  // project niet voor altijd op. Komt hij daarna nog, dan houdt bijProject
  // hem uit een ander project (controle v123).
  var BEZIG_MAX_MS = 120000;
  function metBezig(belofte) {
    bezigTeller++;
    var klaar = false;
    var af = function () { if (klaar) return; klaar = true; bezigTeller--; };
    var klok = setTimeout(af, BEZIG_MAX_MS);
    return Promise.resolve(belofte).then(function (x) { clearTimeout(klok); af(); return x; },
                                         function (e) { clearTimeout(klok); af(); throw e; });
  }
  function zelfdeProject(pid) { return (window.glasProjectId || null) === (pid || null); }
  function bijProject(pid) {
    if (zelfdeProject(pid)) return;
    var e = new Error('er is intussen een ander project geopend, dus de foto is niet toegevoegd. ' +
                      'Open het project opnieuw en voeg hem nog een keer toe.');
    e.anderProject = true;
    throw e;
  }

  function rechtstreeks(pad, blob, type) {
    var sb = sbClient();
    if (!sb) return Promise.reject(new Error('geen verbinding met de cloud'));
    var klaar = sb.storage.from(BUCKET).upload(pad, blob, { contentType: type || 'image/jpeg' });
    var ms = 45000 + Math.ceil((blob.size || 0) / 1048576) * 15000;
    var klok;
    var grens = new Promise(function (_, fout) {
      // Zonder tijdslimiet blijft een verzoek dat nooit antwoordt eeuwig
      // hangen en zie je alleen 'Uploaden…' staan.
      klok = setTimeout(function () {
        fout(new Error('geen antwoord van Supabase binnen ' + Math.round(ms / 1000) + ' seconden — ' +
                       'wordt de verbinding geblokkeerd (VPN, contentblocker, firewall)?'));
      }, ms);
    });
    return Promise.race([klaar, grens]).then(function (up) {
      clearTimeout(klok);
      if (up && up.error) {
        throw new Error(up.error.message + (up.error.statusCode ? ' (code ' + up.error.statusCode + ')' : ''));
      }
      return pad;
    }, function (e) { clearTimeout(klok); throw e; });
  }

  // Geeft het pad terug zodra het bestand veilig is: in de wachtrij, of
  // (zonder wachtrij) in de cloud.
  function bewaarBestand(pad, blob, opties) {
    var o = opties || {};
    var type = o.type || blob.type || 'image/jpeg';
    if (!window.glasWachtrij) return rechtstreeks(pad, blob, type);
    return glasWachtrij.zet(pad, blob, { soort: o.soort, type: type, naam: o.naam,
                                         projectId: window.glasProjectId })
      .catch(function (e) {
        console.warn('[foto] wachtrij niet bruikbaar, dan meteen uploaden', e);
        return rechtstreeks(pad, blob, type);
      });
  }

  // Kan er nu een foto bij? Met de wachtrij is alleen een open project
  // nodig; zonder wachtrij ook verbinding.
  function kanBewaren() {
    if (!window.glasProjectId) return 'Open eerst een project.';
    if (!window.glasWachtrij && !sbClient()) return 'Open eerst een project en zorg dat je online bent.';
    return '';
  }

  /* ─── het origineel (v93, keuze van Jan) ───────────────────── */
  // Naast de verkleinde foto (1600 px, voor het scherm en de pdf) gaat het
  // bestand zoals het van de camera of uit de fotobibliotheek kwam
  // ongewijzigd mee, in de map <project>/origineel/. Alleen voor foto's en
  // de leverlocatie; een tekening komt uit een pdf en heeft geen origineel.
  // Exporteren gaat via ‹Exporteren → Originele foto's› (originelen.js).
  var TYPE_VAN = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
                   heic: 'image/heic', heif: 'image/heif', avif: 'image/avif', gif: 'image/gif',
                   tif: 'image/tiff', tiff: 'image/tiff' };
  function extensieVan(file) {
    var m = /\.([a-z0-9]{2,5})$/i.exec(file.name || '');
    var e = m ? m[1].toLowerCase() : '';
    if (!e && file.type) e = String(file.type).split('/')[1] || '';
    e = e.replace('jpeg', 'jpg');
    return e || 'jpg';
  }

  function bewaarOrigineel(file) {
    var ext = extensieVan(file);
    var type = file.type || TYPE_VAN[ext] || 'image/jpeg';
    var pad = nieuwPad('origineel/', ext);
    return bewaarBestand(pad, file, { soort: 'origineel', type: type, naam: file.name || '' })
      .then(function () {
        return {
          pad: pad,
          naam: file.name || '',
          type: type,
          grootte: file.size || 0,
          datum: file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString()
        };
      }, function (e) {
        // Het origineel is een extra; de foto zelf staat er al. Wel melden.
        console.warn('[foto] origineel bewaren mislukt', e);
        return null;
      });
  }

  // Het origineel na de foto zelf: de foto staat dan al in beeld. Met de
  // wachtrij is dat een fractie van een seconde later; zonder wachtrij
  // (rechtstreeks uploaden) kan een groot origineel even duren, en daar
  // hoeft niemand op te wachten. Is de foto intussen vervangen, dan hoort
  // dit origineel er niet meer bij.
  function origineelErbij(file, fotoId, pad, opnieuwTonen, pid) {
    // v123: niet meer bezig met dit project? Dan het origineel niet onder
    // het nieuwe project bewaren (nieuwPad gebruikt het open project).
    if (pid !== undefined && !zelfdeProject(pid)) return Promise.resolve();
    return bewaarOrigineel(file).then(function (o) {
      if (pid !== undefined && !zelfdeProject(pid)) return;
      var f = fotos.find(function (x) { return x.id === fotoId; });
      if (!f || f.pad !== pad) return;
      if (!o) {
        (opnieuwTonen === renderLeverFoto ? leverMelding : melding)(
          'De foto staat erin, maar het origineel kon niet bewaard worden.', true);
        return;
      }
      f.origineel = o;
      // v124: de werkvloer bewerkt het project niet; zijn foto gaat via
      // rechten.js (glas_foto_erbij) het project in, nu met het origineel.
      if (window.glasWerkvloerFoto && glasWerkvloerFoto(f, pid)) return;
      opslaan();
    });
  }

  var doelGroep = null;   // groep waar de volgende upload in hoort

  window.fotoAanGroep = function (fotoId) {
    doelGroep = fotoId;
    document.getElementById('fotoBestand').click();
  };

  /* ─── kozijntekening uit een pdf ───────────────────────────── */
  // Kozijntekeningen komen bijna altijd als pdf binnen. Die zetten we om
  // naar een afbeelding, waarna het verder een blok is als elk ander:
  // merkletters aanwijzen, erop tekenen, en mee in de pdf-uitvoer.

  var tekeningPdf = null;      // ingelezen pdf waaruit gekozen wordt
  var tekeningNaam = '';
  var tekeningGroep = null;

  window.tekeningGekozen = function (input) {
    var file = input.files && input.files[0];
    var groep = doelGroep;
    doelGroep = null;
    input.value = '';
    if (!file) return;
    var nietKlaar = kanBewaren();
    if (nietKlaar) { melding(nietKlaar, true); return; }
    if (!/\.pdf$/i.test(file.name)) { verwerkAfbeelding(file, groep, file.name); return; }
    if (!window.pdfBibliotheek) { melding('De pdf-lezer is niet beschikbaar.', true); return; }

    melding('Tekening lezen…');
    tekeningGroep = groep;
    tekeningNaam = file.name.replace(/\.pdf$/i, '');

    window.pdfBibliotheek().then(function (lib) {
      return file.arrayBuffer().then(function (buf) {
        return lib.getDocument({ data: buf, isEvalSupported: false }).promise;
      });
    }).then(function (pdf) {
      tekeningPdf = pdf;
      melding('');
      if (pdf.numPages === 1) return maakPaginas([1]);
      return toonPaginaKiezer(pdf);
    }).catch(function (e) {
      console.error('[tekening]', e);
      melding('Tekening inlezen mislukt: ' + e.message, true);
    });
  };

  /* ─── kiezen welke pagina's ─────────────────────────────────── */
  // Een kozijntekening van tien pagina's is aan de bestandsnaam niet te
  // herkennen. Je ziet daarom eerst kleine afbeeldingen van elke pagina
  // en vinkt aan wat je nodig hebt; elke gekozen pagina wordt een eigen
  // blok met een eigen invoertabel.

  function toonPaginaKiezer(pdf) {
    var venster = el('pdfKiezer');
    var raster = el('pdfPaginas');
    if (!venster || !raster) return maakPaginas([1]);
    raster.innerHTML = '';
    venster.style.display = 'flex';
    el('pdfKiezerTitel').textContent = tekeningNaam + ' — ' + pdf.numPages + ' pagina\'s';
    paginaTellingBij();

    for (var n = 1; n <= pdf.numPages; n++) {
      (function (nr) {
        var vak = document.createElement('label');
        vak.className = 'pdf-pagina';
        vak.innerHTML = '<input type="checkbox" value="' + nr + '" onchange="paginaTellingBij()">' +
          '<span class="pdf-nr">' + nr + '</span>' +
          '<canvas data-pagina="' + nr + '"></canvas>';
        raster.appendChild(vak);

        pdf.getPage(nr).then(function (p) {
          var basis = p.getViewport({ scale: 1 });
          var schaal = 220 / Math.max(basis.width, basis.height);
          var viewport = p.getViewport({ scale: schaal });
          var c = vak.querySelector('canvas');
          c.width = Math.round(viewport.width);
          c.height = Math.round(viewport.height);
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
          return p.render({ canvasContext: ctx, viewport: viewport }).promise;
        }).catch(function () {});
      })(n);
    }
    return null;
  }

  window.paginaTellingBij = function () {
    var gekozen = [].slice.call(document.querySelectorAll('#pdfPaginas input:checked'));
    var knop = el('pdfKiezerKnop');
    var telling = el('pdfKiezerTelling');
    if (telling) {
      telling.textContent = gekozen.length
        ? gekozen.length + ' pagina' + (gekozen.length === 1 ? '' : "'s") + ' gekozen'
        : 'Nog niets gekozen';
    }
    if (knop) knop.disabled = !gekozen.length;
  };

  window.pdfKiezerSluit = function () {
    var venster = el('pdfKiezer');
    if (venster) venster.style.display = 'none';
    tekeningPdf = null;
  };

  window.pdfKiezerKlaar = function () {
    var nummers = [].slice.call(document.querySelectorAll('#pdfPaginas input:checked'))
      .map(function (v) { return parseInt(v.value, 10); });
    var venster = el('pdfKiezer');
    if (venster) venster.style.display = 'none';
    if (nummers.length) maakPaginas(nummers);
  };

  // Elke gekozen pagina wordt een eigen blok, één voor één opgeslagen
  // zodat de volgorde klopt.
  function maakPaginas(nummers) {
    var pdf = tekeningPdf;
    if (!pdf) return;
    var groep = tekeningGroep;
    tekeningGroep = null;
    var meer = pdf.numPages > 1;
    var pid = window.glasProjectId;     // v123

    return metBezig(nummers.reduce(function (rij, nr, i) {
      return rij.then(function () {
        melding('Pagina ' + nr + ' omzetten… (' + (i + 1) + ' van ' + nummers.length + ')');
        return pdf.getPage(nr).then(function (p) {
          var basis = p.getViewport({ scale: 1 });
          var schaal = Math.min(3, MAX_ZIJDE / Math.max(basis.width, basis.height));
          var viewport = p.getViewport({ scale: schaal });
          var c = document.createElement('canvas');
          c.width = Math.round(viewport.width);
          c.height = Math.round(viewport.height);
          var ctx = c.getContext('2d');
          // Een pdf is doorzichtig; zonder witte ondergrond wordt hij zwart.
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
          return p.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
            return new Promise(function (ok, fout) {
              c.toBlob(function (blob) {
                if (!blob) { fout(new Error('omzetten mislukt')); return; }
                ok({ blob: blob, breedte: c.width, hoogte: c.height,
                     titel: tekeningNaam + (meer ? ' — pagina ' + nr : '') });
              }, 'image/jpeg', 0.9);
            });
          });
        }).then(function (res) {
          // Alleen de eerste pagina mag in een bestaande groep landen.
          return zetWeg(res, i === 0 ? groep : null, res.titel, 'tekening', null, pid);
        });
      });
    }, Promise.resolve())).then(function () {
      melding('');
      tekeningPdf = null;
      // v124: staan er nu meer tekeningen en ruiten zonder plek (de maatstaat
      // was al ingelezen), dan de route om ze aan te wijzen.
      if (zelfdeProject(pid)) window.aanwijsRouteNaImport();
    }).catch(function (e) {
      console.error('[tekening]', e);
      melding('Omzetten mislukt: ' + e.message, true);
    });
  }

  function verwerkAfbeelding(file, groep, titel) {
    melding('Afbeelding verkleinen…');
    var pid = window.glasProjectId;
    metBezig(verklein(file).then(function (res) { return zetWeg(res, groep, titel, 'tekening', null, pid); }))
      .catch(function (e) { melding('Mislukt: ' + e.message, true); });
  }

  // Uploaden en als blok toevoegen — gedeeld door foto's en tekeningen.
  // Een blok kan een foto of een ingelezen tekening zijn. Dat onthouden
  // we, zodat knoppen en meldingen het juiste woord gebruiken.
  function soortNaam(f, hoofdletter) {
    var w = f && f.bron === 'tekening' ? 'tekening' : 'foto';
    return hoofdletter ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }
  window.soortNaam = soortNaam;

  // pid (v123): het project waarvoor de afbeelding gekozen werd.
  function zetWeg(res, groep, titel, bron, origineel, pid) {
    if (pid !== undefined) bijProject(pid);
    var pad = nieuwPad('', 'jpg');
    melding('Opslaan… (' + Math.round(res.blob.size / 1024) + ' kB)');
    return bewaarBestand(pad, res.blob, { soort: 'beeld', type: 'image/jpeg' })
      .then(function () {
        if (pid !== undefined) bijProject(pid);
        var bestaand = groep ? fotoVan(groep) : null;
        if (bestaand) {
          bestaand.pad = pad;
          bestaand.breedte = res.breedte;
          bestaand.hoogte = res.hoogte;
          bestaand.markeringen = [];
          // De tekening hoorde bij de vorige afbeelding en stond in de
          // verhouding daarvan; op een nieuwe foto komt hij scheef en op de
          // verkeerde plek te liggen, ook in de pdf (v83).
          bestaand.inkt = [];
          bestaand.bron = bron || bestaand.bron || 'foto';
          if (titel && !bestaand.titel) bestaand.titel = titel;
          // Het origineel hoort bij déze afbeelding; een tekening heeft er
          // geen, en dan ook niet dat van de vorige foto houden (v93).
          if (origineel) bestaand.origineel = origineel; else delete bestaand.origineel;
        } else {
          var nieuw = {
            id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            pad: pad, titel: titel || '', bron: bron || 'foto',
            breedte: res.breedte, hoogte: res.hoogte, markeringen: []
          };
          if (origineel) nieuw.origineel = origineel;
          fotos.push(nieuw);
        }
        opslaan();
        renderFotos();
        melding('');
        if (bestaand && rijenVan(bestaand.id).length) {
          setTimeout(function () { fotoAanwijzen(bestaand.id); }, 300);
        }
      });
  }

  /* ─── foto van de leverlocatie ─────────────────────────────── */

  window.leverFotoGekozen = function (input) {
    var file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    var nietKlaar = kanBewaren();
    if (nietKlaar) { leverMelding(nietKlaar, true); return; }
    leverMelding('Foto verkleinen…');
    var pid = window.glasProjectId;     // v123
    metBezig(verklein(file).then(function (res) {
      bijProject(pid);
      var pad = nieuwPad('lever-', 'jpg');
      leverMelding('Opslaan…');
      return bewaarBestand(pad, res.blob, { soort: 'beeld', type: 'image/jpeg' })
        .then(function () {
          bijProject(pid);
          var bestaand = window.leverFoto();
          if (bestaand) {
            bestaand.pad = pad; bestaand.breedte = res.breedte; bestaand.hoogte = res.hoogte;
            bestaand.markeringen = []; bestaand.inkt = [];
            delete bestaand.origineel;     // dat van de vorige foto
          } else {
            bestaand = {
              id: 'lever' + Date.now().toString(36),
              soort: 'lever', pad: pad, titel: 'Leverlocatie',
              breedte: res.breedte, hoogte: res.hoogte, markeringen: [], inkt: []
            };
            fotos.push(bestaand);
          }
          opslaan();
          renderLeverFoto();
          leverMelding('');
          return origineelErbij(file, bestaand.id, pad, renderLeverFoto, pid);
        });
    })).catch(function (e) {
      (e && (e.heic || e.anderProject) ? console.warn : console.error)('[leverfoto]', e);
      leverMelding('Mislukt: ' + e.message, true);
    });
  };

  function leverMelding(tekst, fout) {
    var m = el('leverMelding');
    if (!m) return;
    m.textContent = tekst || '';
    m.style.color = fout ? 'var(--rood)' : 'var(--grijs-tekst)';
  }

  window.leverFotoWeg = async function () {
    var f = window.leverFoto();
    if (!f) return;
    if (!await appVraag('De foto van de leverlocatie verwijderen?',
        { kop: 'Foto verwijderen', ja: 'Verwijderen', gevaarlijk: true })) return;
    f = window.leverFoto();
    if (!f) return;
    // v124 (keuze Jan: alles terug te halen): het bestand blijft in de
    // opslag staan, net als bij fotoVerwijder (v83), en ook wat nog in de
    // wachtrij stond gaat gewoon omhoog. Zo kan de foto met ↶ of via
    // "Onlangs verwijderd" terug. Tot v123 ging hij meteen uit de opslag
    // (v93: "hier is geen ongedaan maken"). Opruimen gebeurt als het project
    // verwijderd wordt (fotosOpruimen, met de map origineel/).
    if (window.bewaarStap) bewaarStap('Foto van de leverlocatie verwijderd');
    if (window.glasVerwijderdLever) glasVerwijderdLever(f);
    fotos = fotos.filter(function (x) { return x.soort !== 'lever'; });
    opslaan();
    renderLeverFoto();
  };

  window.renderLeverFoto = function () {
    var houder = el('leverFotoBlok');
    if (!houder) return;
    var f = window.leverFoto();
    if (!f || !f.pad) {
      houder.innerHTML = '<label class="btn btn-secondary btn-sm foto-knop">📷 Foto van de leverlocatie' +
        '<input type="file" accept="image/*" onchange="leverFotoGekozen(this)" hidden></label>' +
        '<span class="lever-hint">Bijvoorbeeld de inrit, de plek waar het glas mag staan, ' +
        'of een bordje met huisnummer.</span>';
      return;
    }
    var zoom = f.zoom || 100;
    houder.innerHTML =
      '<section class="foto-blok" id="blok-' + f.id + '">' +
        '<div class="foto-zoombalk">' +
          '<button class="btn btn-ghost btn-sm vrij-bij-slot" onclick="fotoZoom(\'' + f.id + '\', -20)">−</button>' +
          '<span class="foto-zoomwaarde" id="zoomwaarde-' + f.id + '">' + zoom + '%</span>' +
          '<button class="btn btn-ghost btn-sm vrij-bij-slot" onclick="fotoZoom(\'' + f.id + '\', 20)">+</button>' +
          '<button class="btn btn-ghost btn-sm vrij-bij-slot" onclick="fotoZoom(\'' + f.id + '\', 0)">Passend</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="fotoDraaien(\'' + f.id + '\')" title="Kwartslag draaien">↻</button>' +
          '<button class="btn btn-secondary btn-sm tk-schakel" onclick="tekenModus(\'' + f.id + '\')">✏️ Tekenen</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="leverFotoWeg()">🗑 Foto</button>' +
        '</div>' +
        '<div class="teken-balk" id="tekenbalk-' + f.id + '"></div>' +
        '<div class="foto-scroll"><div class="foto-doek" id="doek-' + f.id + '" style="width:' + zoom + '%">' +
          '<div class="foto-laden">Foto laden…</div></div></div>' +
      '</section>';

    link(f.pad).then(function (url) {
      var doek = el('doek-' + f.id);
      if (!doek) return;
      if (!url) { doek.innerHTML = '<div class="foto-leeg">' + nietBeschikbaar(f.pad) + '</div>'; return; }
      doek.innerHTML = '<img src="' + url + '" alt="" id="img-' + f.id + '">';
      if (window.tekenInit) tekenInit(f.id);
    });
  };

  window.fotoGekozen = function (input) {
    var file = input.files && input.files[0];
    var groep = doelGroep;
    doelGroep = null;
    input.value = '';
    if (!file) return;
    var nietKlaar = kanBewaren();
    if (nietKlaar) { melding(nietKlaar, true); return; }
    melding('Foto verkleinen…');
    var pid = window.glasProjectId;     // v123
    metBezig(verklein(file).then(function (res) {
      bijProject(pid);
      var pad = nieuwPad('', 'jpg');
      melding('Opslaan… (' + Math.round(res.blob.size / 1024) + ' kB)');
      return bewaarBestand(pad, res.blob, { soort: 'beeld', type: 'image/jpeg' })
        .then(function () {
          bijProject(pid);
          var bestaand = groep ? fotoVan(groep) : null;
          if (bestaand) {
            // Nieuwe foto in een groep die zijn foto kwijt was: de ruiten
            // blijven, de markeringen moeten opnieuw aangewezen worden.
            bestaand.pad = pad;
            bestaand.breedte = res.breedte;
            bestaand.hoogte = res.hoogte;
            bestaand.markeringen = [];
            bestaand.inkt = [];
            delete bestaand.origineel;     // dat van de vorige foto
          }
          var doel = bestaand || {
            id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            pad: pad, titel: '', breedte: res.breedte, hoogte: res.hoogte, markeringen: []
          };
          if (!bestaand) fotos.push(doel);
          // v124 (keuze Jan): de werkvloer mag foto's toevoegen, maar het
          // project niet bewerken: de foto gaat apart het project in.
          if (!(window.glasWerkvloerFoto && glasWerkvloerFoto(doel, pid))) opslaan();
          renderFotos();
          melding('');
          if (bestaand && rijenVan(bestaand.id).length) {
            setTimeout(function () { fotoAanwijzen(bestaand.id); }, 300);
          }
          return origineelErbij(file, doel.id, pad, renderFotos, pid);
        });
    })).catch(function (e) {
      (e && (e.heic || e.anderProject) ? console.warn : console.error)('[foto] niet toegevoegd', e);
      melding('Mislukt: ' + e.message, true);
    });
  };

  function melding(tekst, fout) {
    var m = el('fotoMelding');
    if (!m) return;
    m.textContent = tekst || '';
    m.style.color = fout ? 'var(--rood)' : 'var(--grijs-tekst)';
  }

  // Waarom er geen link kwam, per pad; renderFotos gebruikt dat voor de
  // melding (v93).
  var linkFout = {};

  function link(pad) {
    if (linkCache[pad]) return Promise.resolve(linkCache[pad]);
    // Eerst de wachtrij: een foto die nog niet geüpload is, staat alleen
    // op dit apparaat (v93).
    var lokaal = window.glasWachtrij ? glasWachtrij.url(pad) : Promise.resolve(null);
    return lokaal.then(function (u) {
      if (u) { linkCache[pad] = u; delete linkFout[pad]; return u; }
      return linkUitCloud(pad);
    });
  }

  function linkUitCloud(pad) {
    var sb = sbClient();
    if (!sb) { linkFout[pad] = 'offline'; return Promise.resolve(null); }
    return sb.storage.from(BUCKET).createSignedUrl(pad, LINK_GELDIG).then(function (res) {
      if (res.error || !res.data) {
        console.error('[foto] geen link voor', pad, res.error);
        var t = String((res.error && (res.error.message || res.error.error)) || '') + ' ' +
                String((res.error && (res.error.statusCode || res.error.status)) || '');
        linkFout[pad] = /not.?found|404/i.test(t) ? 'ontbreekt' : 'offline';
        return null;
      }
      delete linkFout[pad];
      linkCache[pad] = res.data.signedUrl;
      return res.data.signedUrl;
    }).catch(function (e) {
      console.error('[foto] link ophalen mislukt', pad, e);
      linkFout[pad] = 'offline';
      return null;
    });
  }

  // De afbeelding zelf, als bestand: uit de wachtrij als hij daar nog
  // staat, anders uit de cloud. Voor de pdf, het draaien en het
  // exporteren van de originelen (v93).
  window.fotoBlob = function (pad) {
    if (!pad) return Promise.resolve(null);
    var lokaal = window.glasWachtrij ? glasWachtrij.blob(pad) : Promise.resolve(null);
    return lokaal.then(function (b) {
      if (b) return b;
      return linkUitCloud(pad).then(function (url) {
        if (!url) return null;
        return fetch(url).then(function (r) {
          if (!r.ok) throw new Error('ophalen mislukt (' + r.status + ')');
          return r.blob();
        });
      });
    });
  };

  // De tekst als een afbeelding er niet is.
  function nietBeschikbaar(pad) {
    if (linkFout[pad] === 'ontbreekt') {
      return 'Deze foto staat nog niet in de cloud.<br>Hij wacht waarschijnlijk nog op het apparaat ' +
             'waarmee hij gemaakt is, tot dat weer bereik heeft. Daarna verschijnt hij hier vanzelf.';
    }
    return 'Foto niet beschikbaar — ben je offline?';
  }

  /* ─── tekenen ──────────────────────────────────────────────── */

  // Tijdelijke links verlopen en horen bij één project.
  window.fotoLinksVergeten = function () {
    linkCache = {};
    linkFout = {};
    if (window.glasWachtrij) glasWachtrij.vergeetUrls();
  };

  window.renderFotos = function () {
    var houder = el('fotoHouder');
    if (!houder) return;
    // Het hele scherm opnieuw (ander project, Cmd+Z, ander tabblad, een
    // collega): een half gekozen "nog een ruit" vervalt, anders verhoogde
    // de volgende tik stil een aantal zonder balk die het zei (beoordeling
    // v110). Gewoon aanwijzen blijft, maar alleen op een foto die er nog is;
    // de balk wordt onderaan opnieuw getekend.
    if (aanwijzen && (aanwijzen.erbij || !fotoVan(aanwijzen.fotoId))) aanwijzen = null;

    var lijst = werkFotos();
    if (!lijst.length) {
      houder.innerHTML = '<div class="foto-leeg">Nog geen foto of tekening.<br>' +
        'Gebruik <b>⬆ Importeren</b> hierboven om een foto van de bestaande situatie ' +
        'of een kozijntekening toe te voegen.<br>' +
        'Tik daarna op elke ruit: die krijgt een merkletter en een invoerregel eronder.<br>' +
        'Losse maten zonder afbeelding vul je onderaan in.</div>';
      return;
    }

    houder.innerHTML = lijst.map(function (f, i) {
      var kop =
        '<div class="foto-balk">' +
          '<span class="foto-nr">' + (i + 1) + '</span>' +
          '<input type="text" placeholder="Omschrijving, bijv. Voorgevel" value="' + esc(f.titel) + '" ' +
            'oninput="fotoTitelWijzig(\'' + f.id + '\', this.value)">' +
          (f.pad ? '<button class="btn btn-ghost btn-sm" onclick="fotoVerwijder(\'' + f.id + '\')">' +
            '🗑 ' + soortNaam(f, true) + '</button>' : '') +
          '<button class="btn btn-ghost btn-sm" onclick="groepVerwijder(\'' + f.id + '\')">🗑 Groep</button>' +
        '</div>';

      var zoom = f.zoom || 100;
      var midden = f.pad
        ? '<div class="foto-zoombalk">' +
            '<button class="btn btn-ghost btn-sm vrij-bij-slot" onclick="fotoZoom(\'' + f.id + '\', -20)">−</button>' +
            '<span class="foto-zoomwaarde" id="zoomwaarde-' + f.id + '">' + zoom + '%</span>' +
            '<button class="btn btn-ghost btn-sm vrij-bij-slot" onclick="fotoZoom(\'' + f.id + '\', 20)">+</button>' +
            '<button class="btn btn-ghost btn-sm vrij-bij-slot" onclick="fotoZoom(\'' + f.id + '\', 0)">Passend</button>' +
            '<button class="btn btn-ghost btn-sm" onclick="fotoDraaien(\'' + f.id + '\')" ' +
              'title="Foto een kwartslag draaien">↻</button>' +
            '<button class="btn btn-secondary btn-sm tk-schakel" onclick="tekenModus(\'' + f.id + '\')">✏️ Tekenen</button>' +
          '</div>' +
          '<div class="teken-balk" id="tekenbalk-' + f.id + '"></div>' +
          '<div class="foto-scroll"><div class="foto-doek" id="doek-' + f.id + '" style="width:' + zoom + '%">' +
            '<div class="foto-laden">Foto laden…</div></div></div>' +
          '<div class="foto-aanwijsbalk" id="aanwijs-' + f.id + '"></div>' +
          '<div class="foto-hint">Tik op de foto om een ruit toe te voegen. Sleep een bolletje om het te verplaatsen, ' +
          'of tik erop voor meer keuzes.</div>'
        // Tot v91 stond hier dat de ruiten naar "zonder foto of tekening"
        // verhuisd waren. Dat klopte niet: ze blijven in deze groep staan.
        // Alleen bij '🗑 Groep' met 'Ruiten bewaren' gaan ze daarheen (v92).
        : '<div class="foto-geenfoto">' + (rijenVan(f.id).length
            ? 'Deze groep heeft geen foto (meer). De ruiten hieronder blijven gewoon in deze groep ' +
              'staan. Zet er een nieuwe foto in om ze opnieuw aan te wijzen.'
            : 'Deze groep heeft geen foto en geen ruiten. Zet er een foto in, of verwijder de groep met ' +
              '\u2039\ud83d\uddd1 Groep\u203a.') +
          '<button class="btn btn-primary btn-sm" onclick="fotoAanGroep(\'' + f.id + '\')">+ Foto toevoegen</button></div>';

      var aantal = rijenVan(f.id).length;
      // Ruiten tellen, niet regels (v110): tot v109 stond hier bij het
      // openen "5 ruiten" voor vijf regels met samen acht ruiten; pas na een
      // wijziging kwam telBlok met de juiste telling.
      var telling = window.ruitenTelling ? ruitenTelling(rijenVan(f.id), 'nog geen ruiten')
        : (aantal ? aantal + (aantal === 1 ? ' ruit' : ' ruiten') : 'nog geen ruiten');
      telling = metElders(f.id, telling);     // v124
      var balk =
        '<div class="blok-balk" onclick="blokKlap(\'' + f.id + '\')">' +
          '<span class="blok-pijl" id="pijl-' + f.id + '">▾</span>' +
          '<h3>' + esc(f.titel || (f.pad ? soortNaam(f, true) + ' ' + (i + 1) : 'Groep ' + (i + 1))) + '</h3>' +
          '<span class="blok-telling">' + esc(telling) + '</span>' +
        '</div>';

      return '<section class="foto-blok' + (f.pad ? '' : ' zonder-foto') + '" id="blok-' + f.id + '">' +
        balk + '<div class="blok-inhoud" id="inhoud-' + f.id + '">' +
        kop + midden + '<div class="foto-tabelwrap" id="tabel-' + f.id + '"></div></div></section>';
    }).join('');

    lijst.forEach(function (f) {
      if (window.zetBlok) zetBlok(f.id);
      if (!f.pad) { tekenTabel(f.id); return; }
      link(f.pad).then(function (url) {
        var doek = el('doek-' + f.id);
        if (!doek) return;
        if (!url) {
          doek.innerHTML = '<div class="foto-leeg">' + nietBeschikbaar(f.pad) +
            '<br><button class="btn btn-secondary btn-sm" style="margin-top:10px" ' +
            'onclick="fotoOpnieuw(\'' + f.id + '\')">Opnieuw proberen</button></div>';
          return;
        }
        doek.innerHTML = '<img src="' + url + '" alt="" id="img-' + f.id + '" ' +
                         'onclick="fotoTik(event, \'' + f.id + '\')" ' +
                         'onerror="fotoLaadFout(\'' + f.id + '\')">';
        doek.addEventListener('click', function (ev) {
          if (Date.now() < negeerTikTot) { ev.preventDefault(); ev.stopPropagation(); }
        }, true);
        tekenMarkeringen(f.id);
        bolGrootte(f.id);
        if (window.tekenInit) tekenInit(f.id);
      });
      tekenTabel(f.id);
    });
    // Zie renderFotoTabellen: ook hier komen er verse invoervelden bij, en
    // die moeten dicht blijven als het project besteld is (v90).
    if (window.slotToepassen) slotToepassen();
    tekenAanwijsbalk();
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
    var lijst = werkFotos();
    if (!lijst.length || !houder.querySelector('.foto-blok')) { renderFotos(); return; }
    if (lijst.some(function (f) { return !el('blok-' + f.id); })) { renderFotos(); return; }
    lijst.forEach(function (f) {
      if (f.pad) {
        tekenMarkeringen(f.id);
        if (window.tekenInit) tekenInit(f.id);
      }
      tekenTabel(f.id);
      telBlok(f.id);
    });
    tekenAanwijsbalk();
    // Verse invoervelden staan standaard open; is het project besteld, dan
    // moeten ze meteen weer dicht (v90).
    if (window.slotToepassen) slotToepassen();
  };

  window.fotoLabelsBijwerken = function () {
    fotos.forEach(function (f) {
      var doek = el('doek-' + f.id);
      if (!doek) return;
      var bollen = doek.querySelectorAll('.foto-mark');
      f.markeringen.forEach(function (m, i) {
        var bol = bollen[i];
        if (!bol) return;
        var st = bolStaat(f.id, i);
        bol.textContent = st.label;
        bol.className = st.klasse;
        bol.title = st.titel;
      });
    });
  };

  // Na het wijzigen van een aantal: telling, bolletjes en de knop
  // 'Ruiten aanwijzen (n)' bijwerken zonder de tabel opnieuw op te bouwen
  // — dan blijft de cursor waar hij was.
  window.bolletjesBijwerken = function () {
    window.fotoLabelsBijwerken();
    werkFotos().forEach(function (f) {
      telBlok(f.id);
      var wrap = el('tabel-' + f.id);
      var voet = wrap && wrap.querySelector('.foto-voet');
      // De strook 'klopt niet' (v110) staat vlak boven de voet en gaat mee.
      var scheef = wrap && wrap.querySelector('.foto-scheef');
      if (scheef) scheef.remove();
      if (voet) voet.outerHTML = voetHTML(f.id);
    });
    tekenAanwijsbalk();
  };
  // Bubbelfase: de inline onchange van het veld (setVal) is dan al geweest.
  document.addEventListener('change', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('aantal-input')) {
      window.bolletjesBijwerken();
    }
  });

  // De telling in de balk van een blok bijwerken zonder alles opnieuw
  // op te bouwen — anders blijft er 'nog geen ruiten' staan nadat je er
  // net een hebt aangewezen.
  function telBlok(fotoId) {
    var blok = el('blok-' + fotoId);
    if (!blok) return;
    var teller = blok.querySelector('.blok-telling');
    if (!teller) return;
    teller.textContent = tellingVan(fotoId);
  }

  // De telling in de kop van een blok; v124: plus de ruiten die hier een
  // bolletje hebben maar bij een andere tekening staan.
  function tellingVan(fotoId) {
    var eigen = rijenVan(fotoId);
    return metElders(fotoId, window.ruitenTelling ? ruitenTelling(eigen, 'nog geen ruiten')
      : (eigen.length ? eigen.length + (eigen.length === 1 ? ' ruit' : ' ruiten') : 'nog geen ruiten'));
  }
  function metElders(fotoId, t) {
    var n = window.fotoVerwijzingen(fotoId).elders.reduce(function (s, x) { return s + x.hier; }, 0);
    return n ? t + ' \u00b7 ' + n + ' van elders' : t;
  }

  window.fotoTellingen = function () { fotos.forEach(function (f) { telBlok(f.id); }); };

  function tekenMarkeringen(fotoId) {
    var doek = el('doek-' + fotoId);
    var foto = fotoVan(fotoId);
    if (!doek || !foto) return;
    Array.prototype.forEach.call(doek.querySelectorAll('.foto-mark'), function (m) { m.remove(); });
    foto.markeringen.forEach(function (m, i) {
      var st = bolStaat(fotoId, i);
      var b = document.createElement('button');
      // langere merken (A12) krijgen iets meer ruimte; een bolletje boven
      // het aantal van zijn regel krijgt een waarschuwingsrand
      b.className = st.klasse;
      b.style.left = (m.x * 100) + '%';
      b.style.top = (m.y * 100) + '%';
      b.textContent = st.label;
      b.title = st.titel;
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
      var verw = verwijzingHTML(fotoId);
      wrap.innerHTML = (window.blokBalkHTML ? blokBalkHTML(fotoId) : '') +
        (verw ? '' : '<div class="foto-geenrijen">Nog geen ruiten in deze groep.</div>') + verw + voetHTML(fotoId);
      return;
    }

    wrap.innerHTML =
      (window.blokBalkHTML ? blokBalkHTML(fotoId) : '') +
      '<div class="invoer-wrap"><table class="invoer">' +
        (kop ? kop.outerHTML : '') +
        '<tbody id="fotoBody-' + fotoId + '"></tbody>' +
      '</table></div>' + verwijzingHTML(fotoId) + voetHTML(fotoId);

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

  // Regels die nog niet al hun bolletjes hebben. Een regel met aantal 3 en
  // één bolletje staat er dus nog in. Ook losse regels tellen mee, zodat
  // je een geïmporteerde lijst alsnog op een foto kunt zetten.
  // v124 (wens Jan): ook de regels van een ander blok. Tot v123 bleef een
  // regel die al bij een andere foto hoorde daar ("alle ruiten van één regel
  // in één groep"), en werkte aanwijzen maar op één blok, ook bij een pdf met
  // meer tekeningen. Volgorde: eerst die van dit blok, dan de losse, dan die
  // van een ander blok.
  window.zonderMarkering = function (fotoId) {
    var geteld = {};
    fotos.forEach(function (f) {
      (f.markeringen || []).forEach(function (m) { geteld[m.rijId] = (geteld[m.rijId] || 0) + 1; });
    });
    var plek = function (r) { return r.fotoId === fotoId ? 0 : (!r.fotoId || !fotoVan(r.fotoId)) ? 1 : 2; };
    return rijen.filter(function (r) {
      if ((geteld[r.id] || 0) >= aantalVan(r)) return false;
      return !!(r.merk || r.breedte || r.hoogte || r.glasType);
    }).map(function (r, i) { return { r: r, i: i }; })
      .sort(function (a, b) { return plek(a.r) - plek(b.r) || a.i - b.i; })
      .map(function (x) { return x.r; });
  };

  // Elke nog open ruit afzonderlijk, voor de wachtrij van het aanwijzen:
  // A4 met aantal 3 en één bolletje staat er twee keer in, achter elkaar.
  function openPlekken(fotoId) {
    var uit = [];
    zonderMarkering(fotoId).forEach(function (r) {
      var open = aantalVan(r) - bollenVan(r.id);
      for (var i = 0; i < open; i++) uit.push(r.id);
    });
    return uit;
  }
  window.openPlekken = openPlekken;

  // Regels in deze groep waar het aantal en de bolletjes niet kloppen
  // (v110). Sinds v110 kan dat niet meer ontstaan door het aantal te typen,
  // maar wel in een project van vóór v110, of als een ruit nog half is
  // aangewezen. Niets wordt stil rechtgezet (afspraak met Jan): per regel
  // kies je zelf wat klopt.
  // Elke regel staat in precies één strook (beoordeling v110): tot v123 die
  // van de foto met zijn eerste bolletje, sinds v124 die van de tekening waar
  // hij thuishoort (thuisVan). Tijdens het aanwijzen op deze
  // foto blijven de regels die nog aangewezen worden weg: dat is geen fout,
  // en een misser op "aantal wordt 1" zou een ingelezen aantal verlagen.
  function scheefIn(fotoId) {
    return rijen.map(function (r) {
      return { rij: r, bol: bollenVan(r.id), aantal: aantalVan(r) };
    }).filter(function (x) {
      if (!(x.bol > 0 && x.bol !== x.aantal)) return false;
      // v124: de strook staat bij de tekening waar de ruit thuishoort (de
      // meeste bolletjes; bij gelijk de eerste), niet bij die met het eerste
      // bolletje: de ruit kan nu over meer tekeningen verdeeld zijn.
      if (thuisVan(x.rij.id) !== fotoId) return false;
      // v124: ook als hij op een ándere tekening aangewezen wordt.
      if (x.bol < x.aantal && aanwijzen &&
          aanwijzen.wachtrij.indexOf(x.rij.id) >= 0) return false;
      return true;
    });
  }
  window.scheefIn = scheefIn;

  function scheefHTML(fotoId) {
    var lijst = scheefIn(fotoId);
    if (!lijst.length) return '';
    return '<div class="foto-scheef">' + lijst.map(function (x) {
      var id = x.rij.id, l = esc(labelVan(x.rij));
      var bollen = x.bol === 1 ? 'één bolletje' : x.bol + ' bolletjes';
      // v124: verdeeld over meer tekeningen? Dan zegt "op de foto" te weinig.
      var per = bollenPerFoto(id);
      var opDe = per.length > 1 ? ' op ' + per.length + ' ' + (per.every(function (p) { return p.foto.bron === 'tekening'; })
        ? 'tekeningen' : "foto's") : ' op de foto';
      if (x.bol > x.aantal) {
        var teveel = x.bol - x.aantal;
        return '<div class="foto-scheef-regel"><span><b>' + l + '</b>: aantal ' + x.aantal + ', maar ' + bollen +
          opDe + '. Wat klopt?</span>' +
          '<button class="btn btn-secondary btn-sm" onclick="markAantalNaarBollen(' + id + ')">' +
            'Er zijn er ' + x.bol + ' (aantal wordt ' + x.bol + ')</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="markTeveelWeg(' + id + ')">' +
            'Er ' + (x.aantal === 1 ? 'is er' : 'zijn er') + ' ' + x.aantal + ' (' +
            (teveel === 1 ? 'het bolletje' : 'de ' + teveel + ' bolletjes') + ' met de rode stippelrand weg)</button></div>';
      }
      var open = x.aantal - x.bol;
      return '<div class="foto-scheef-regel"><span><b>' + l + '</b>: aantal ' + x.aantal + ', ' + bollen +
        opDe + ': nog ' + open + ' aan te wijzen.</span>' +
        '<button class="btn btn-secondary btn-sm" onclick="markAanwijzenRij(\'' + fotoId + '\',' + id + ')">' +
          'Aanwijzen</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="markAantalNaarBollen(' + id + ')">' +
          'Er ' + (x.bol === 1 ? 'is er' : 'zijn er') + ' maar ' + x.bol + ' (aantal wordt ' + x.bol + ')</button></div>';
    }).join('') + '</div>';
  }

  // v124: de verwijzingen onder de tabel. Een ruit die hier bolletjes heeft
  // maar in een ander blok staat ("A1 ×1 hier, staat bij tekening 1"), en
  // bij een eigen ruit waar zijn andere bolletjes staan. Aantikken = erheen
  // (alleen kijken, dus ook op slot: vrij-bij-slot).
  function verwijzingHTML(fotoId) {
    var v = window.fotoVerwijzingen(fotoId);
    if (!v.elders.length && !v.ookElders.length) return '';
    var knop = function (actie, tekst, titel) {
      return '<button type="button" class="btn btn-ghost btn-sm elders-knop vrij-bij-slot" onclick="' + actie + '" title="' +
        esc(titel) + '">' + tekst + '</button>';
    };
    return '<div class="foto-elders">' +
      v.elders.map(function (x) {
        return knop('naarRuit(' + (+x.rij.id) + ')',
          '<b>' + esc(labelVan(x.rij)) + '</b> ×' + x.hier + ' hier, staat bij ' + esc(x.thuisNaam) + ' →',
          'De regel van ' + labelVan(x.rij) + ' (' + aantalVan(x.rij) + ' stuks) staat bij ' + x.thuisNaam + '. Tik om erheen te gaan.');
      }).join('') +
      v.ookElders.map(function (x) {
        return knop('naarFoto(\'' + esc(x.foto) + '\')',
          '<b>' + esc(labelVan(x.rij)) + '</b> ook ×' + x.n + ' op ' + esc(x.naam) + ' →',
          labelVan(x.rij) + ' heeft ook ' + x.n + (x.n === 1 ? ' bolletje' : ' bolletjes') + ' op ' + x.naam + '.');
      }).join('') + '</div>';
  }

  function voetHTML(fotoId) {
    var foto = fotoVan(fotoId);
    var open = openPlekken(fotoId);
    return scheefHTML(fotoId) + '<div class="foto-voet">' +
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
  // De bolletjes stonden op een vaste grootte in beeldpunten. Op een
  // uitgezoomde foto — of gewoon op een telefoon — liepen ze daardoor
  // over elkaar heen. Ze volgen nu de breedte waarop de foto werkelijk
  // getoond wordt, met een onder- en bovengrens zodat ze leesbaar en
  // aanraakbaar blijven.
  window.bolGrootte = function (fotoId) {
    var doek = el('doek-' + fotoId);
    if (!doek) return;
    var breed = doek.getBoundingClientRect().width;
    if (!breed) return;
    // v120: op een aanraakscherm minstens 22 px (plus 44 px tik-plek in CSS).
    var klein = window.matchMedia && matchMedia('(pointer: coarse)').matches ? 22 : 13;
    var maat = Math.max(klein, Math.min(38, breed * 0.045));
    doek.style.setProperty('--bol', maat.toFixed(1) + 'px');
  };

  window.bolGroottes = function () {
    fotos.forEach(function (f) { bolGrootte(f.id); });
  };

  window.addEventListener('resize', function () {
    clearTimeout(window.__bolTimer);
    window.__bolTimer = setTimeout(bolGroottes, 150);
  });

  window.fotoZoom = function (id, stap) {
    var foto = fotoVan(id);
    if (!foto) return;
    var nu = foto.zoom || 100;
    foto.zoom = stap === 0 ? 100 : Math.min(400, Math.max(20, nu + stap));
    var doek = el('doek-' + id);
    var waarde = el('zoomwaarde-' + id);
    if (doek) doek.style.width = foto.zoom + '%';
    if (waarde) waarde.textContent = foto.zoom + '%';
    setTimeout(function () { bolGrootte(id); }, 0);
    // v120: zoomen mag ook op slot of als je alleen kijkt (de knoppen zijn
    // vrij-bij-slot); dan alleen op het scherm, niet opslaan.
    if ((window.invoerOpSlot && invoerOpSlot()) || (window.glasAlleenKijken && glasAlleenKijken())) return;
    opslaan();
  };

  /* ─── foto een kwartslag draaien ───────────────────────────── */
  // De beeldpunten zelf worden gedraaid en opnieuw opgeslagen, in plaats
  // van de foto op het scherm te kantelen. Daarmee hoeven het aanwijzen,
  // het slepen van bolletjes, het tekenen en de pdf nergens rekening te
  // houden met een draaistand — alles blijft gewoon rechtop rekenen.

  // v123 (controle v90): twee keer snel op ↻ startte twee keer draaien
  // vanaf dezelfde foto: de foto draaide een kwartslag, de bolletjes een
  // halve slag. Nu wacht een tweede tik tot de eerste klaar is.
  var draaitNu = {};
  window.fotoDraaien = function (fotoId) {
    var foto = fotoVan(fotoId);
    if (!foto || !foto.pad) return;
    if (draaitNu[fotoId]) { melding('Even geduld: de foto wordt nog gedraaid.'); return; }
    if (!window.glasWachtrij && !sbClient()) { melding('Draaien kan alleen met internet.', true); return; }

    melding('Foto draaien…');
    var mijnBeurt = {};
    draaitNu[fotoId] = mijnBeurt;
    var vrij = function () { if (draaitNu[fotoId] === mijnBeurt) delete draaitNu[fotoId]; };
    setTimeout(vrij, BEZIG_MAX_MS);   // nooit voor altijd vast
    var pid = window.glasProjectId;
    var vanPad = foto.pad;
    // Uit de wachtrij of uit de cloud: ook een foto die nog niet geüpload
    // is, kan nu gedraaid worden (v93). Het origineel draait niet mee; dat
    // blijft zoals het van de camera kwam.
    metBezig(window.fotoBlob(foto.pad).then(function (blob) {
      if (!blob) throw new Error('foto niet beschikbaar');
      return new Promise(function (ok, fout) {
        var img = new Image();
        var tijdelijk = URL.createObjectURL(blob);
        img.onload = function () {
          URL.revokeObjectURL(tijdelijk);
          // Een kwartslag met de klok mee: breedte en hoogte wisselen om.
          var c = document.createElement('canvas');
          c.width = img.height;
          c.height = img.width;
          var ctx = c.getContext('2d');
          ctx.translate(c.width / 2, c.height / 2);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          c.toBlob(function (nieuw) {
            if (!nieuw) { fout(new Error('draaien mislukt')); return; }
            ok({ blob: nieuw, breedte: c.width, hoogte: c.height });
          }, 'image/jpeg', KWALITEIT);
        };
        img.onerror = function () { URL.revokeObjectURL(tijdelijk); fout(new Error('afbeelding onleesbaar')); };
        img.src = tijdelijk;
      });
    }).then(function (res) {
      bijProject(pid);
      var oudPad = foto.pad;
      var draaiPad = nieuwPad('', 'jpg');
      melding('Opslaan…');
      return bewaarBestand(draaiPad, res.blob, { soort: 'beeld', type: 'image/jpeg' })
        .then(function () {
          bijProject(pid);
          // De foto is intussen vervangen (of een collega's stand kwam
          // binnen): dan niet draaien op iets anders dan wat we lazen.
          foto = fotoVan(fotoId);
          if (!foto || foto.pad !== vanPad) { melding('De foto is intussen veranderd; niet gedraaid.', true); return; }
          if (window.bewaarStap) bewaarStap('Foto gedraaid');
          draaiCoordinaten(foto);
          foto.pad = draaiPad;
          foto.breedte = res.breedte;
          foto.hoogte = res.hoogte;
          delete linkCache[oudPad];
          // De ongedraaide foto blijft staan: ongedaan maken zet de
          // verwijzing ernaartoe terug, en dan moet het bestand er nog
          // zijn. Bij het verwijderen van het project gaat de hele map
          // toch in één keer weg.
          opslaan();
          renderFotos();
          // De foto van de leverlocatie staat op het tabblad Project; die
          // werd tot v92 na het draaien niet opnieuw getoond (v93).
          if (foto.soort === 'lever' && window.renderLeverFoto) renderLeverFoto();
          melding('');
        });
    })).catch(function (e) {
      console.error('[foto] draaien mislukt', e);
      melding('Draaien mislukt: ' + e.message, true);
    }).then(vrij);
  };

  // Een punt (x, y) op de oude foto komt na een kwartslag met de klok mee
  // terecht op (1 − y, x). Dat geldt voor de bolletjes én voor elk punt
  // van elke streek.
  function draaiCoordinaten(foto) {
    foto.markeringen.forEach(function (m) {
      var x = m.x, y = m.y;
      m.x = 1 - y;
      m.y = x;
    });
    if (!Array.isArray(foto.inkt) || !foto.inkt.length) return;
    var vbOud = Math.round(1000 * (foto.hoogte || 3) / (foto.breedte || 4)) || 750;
    var vbNieuw = Math.round(1000 * (foto.breedte || 4) / (foto.hoogte || 3)) || 750;
    var draai = function (p) {
      var nx = p[0] / 1000, ny = p[1] / vbOud;
      return [Math.round((1 - ny) * 1000 * 10) / 10,
              Math.round(nx * vbNieuw * 10) / 10];
    };
    foto.inkt.forEach(function (s) {
      // v123 (controle v90): een tekstvak blijft rechtop staan; p[0] is zijn
      // linkerbovenhoek. Die hoek draaien zette het vak naast de plek waar de
      // tekst hoorde. Nu draait het midden van het vak mee, en komt het vak
      // daar met dezelfde maat omheen.
      if (s.t === 'tekst' && s.p && s.p[0] && s.w && s.h) {
        var m = draai([s.p[0][0] + s.w / 2, s.p[0][1] + s.h / 2]);
        s.p = [[Math.round((m[0] - s.w / 2) * 10) / 10, Math.round((m[1] - s.h / 2) * 10) / 10]].concat(s.p.slice(1).map(draai));
        return;
      }
      s.p = s.p.map(draai);
    });
  }

  window.fotoTitelWijzig = function (id, v) {
    var f = fotoVan(id);
    if (!f) return;
    f.titel = v;
    opslaan();
  };

  // Alleen de afbeelding weg. De groep en zijn ruiten blijven staan,
  // zodat je er een nieuwe foto in kunt hangen en de letters opnieuw
  // kunt aanwijzen.
  window.fotoVerwijder = async function (id) {
    var f = fotoVan(id);
    if (!f || !f.pad) return;
    var aantal = rijenVan(id).length;
    // Zonder ruiten heeft een groep zonder foto geen enkele functie meer;
    // dan gaat de hele groep weg. Tot v91 bleef er een lege groep staan met
    // een melding over ruiten die er niet waren (gemeld door Jan, v92).
    if (!await appVraag('De ' + soortNaam(f) + ' verwijderen?' + (aantal
        ? '\nDe ' + aantal + (aantal === 1 ? ' ruit eronder blijft' : ' ruiten eronder blijven') +
          ' in deze groep staan. Je kunt er daarna een nieuwe ' +
          soortNaam(f) + ' in zetten en dezelfde merkletters opnieuw aanwijzen.'
        : '\nEr staan geen ruiten in deze groep, dus de groep gaat ook weg.'),
        { kop: 'Afbeelding verwijderen', ja: 'Verwijderen', gevaarlijk: true })) return;
    f = fotoVan(id);
    if (!f || !f.pad) return;
    if (!rijenVan(id).length) {
      if (window.bewaarStap) bewaarStap('Foto en lege groep verwijderd');
      // v124: in "Onlangs verwijderd" (herstel.js), na de stap voor ↶.
      if (window.glasVerwijderdGroep) glasVerwijderdGroep(id, false);
      // Het bestand blijft in Storage staan, net als hieronder (ongedaan maken).
      fotos = fotos.filter(function (x) { return x.id !== id; });
      aanwijzen = null;
      opslaan();
      renderTabel();
      renderFotos();
      return;
    }
    if (window.bewaarStap) bewaarStap('Foto verwijderd');
    if (window.glasVerwijderdAfbeelding) glasVerwijderdAfbeelding(id);   // v124
    // Het bestand blijft in Storage staan: anders is ongedaan maken een
    // lege huls en krijg je de melding dat de foto 'er wel staat maar niet
    // binnenkomt' (v83). Opruimen gebeurt als het project verwijderd wordt.
    f.pad = null;
    f.markeringen = [];
    aanwijzen = null;
    opslaan();
    renderFotos();
  };

  // De hele groep weg, inclusief de keuze wat er met de ruiten gebeurt.
  window.groepVerwijder = async function (id) {
    var f = fotoVan(id);
    if (!f) return;
    var eigen = rijenVan(id);
    var ookRuiten = false;
    if (eigen.length) {
      // Eén venster met drie antwoorden in plaats van twee keer een vraag
      // waarbij 'OK' en 'Annuleren' iets heel anders betekenden.
      var keus = await appKeuze('Deze groep heeft ' + eigen.length + ' ruit' +
        (eigen.length === 1 ? '' : 'en') + '. Wat moet daarmee gebeuren?',
        [{ tekst: 'Annuleren', waarde: null },
         { tekst: 'Ruiten bewaren', waarde: 'bewaren' },
         { tekst: 'Ruiten ook weg', waarde: 'weg', soort: 'btn-danger' }],
        { kop: 'Groep verwijderen' });
      if (keus === null) return;
      ookRuiten = keus === 'weg';
    } else {
      if (!await appVraag('Deze groep verwijderen?',
          { kop: 'Groep verwijderen', ja: 'Verwijderen', gevaarlijk: true })) return;
    }
    f = fotoVan(id);
    if (!f) return;
    eigen = rijenVan(id);
    if (window.bewaarStap) bewaarStap('Groep verwijderd');
    // v124: de groep met zijn foto, bolletjes en (als ze meegaan) ruiten in
    // "Onlangs verwijderd"; terugzetten kan dus ook later en op een ander
    // apparaat. Na de stap voor ↶: ↶ haalt het item dan ook weer weg.
    if (window.glasVerwijderdGroep) glasVerwijderdGroep(id, ookRuiten);
    // Zie fotoVerwijder: het bestand blijft staan zodat ongedaan maken
    // werkt. Het wordt opgeruimd bij het verwijderen van het project.
    if (ookRuiten) {
      var weg = {};
      eigen.forEach(function (r) { weg[r.id] = true; });
      rijen = rijen.filter(function (r) { return !weg[r.id]; });
      // v124 (review): ook hun bolletjes op andere tekeningen (een ruit kan
      // op meer tekeningen staan); anders bleven daar losse bolletjes achter.
      // Ze staan in "Onlangs verwijderd" en komen daarmee terug.
      fotos.forEach(function (x) {
        if (x.id !== id) x.markeringen = (x.markeringen || []).filter(function (m) { return !weg[m.rijId]; });
      });
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

  // { fotoId, wachtrij: [rijId] }; met erbij: true (v110) is het één extra
  // ruit voor een regel die al bolletjes heeft: de tik zet het aantal +1.
  var aanwijzen = null;

  // Na het aanraken van een bolletje stuurt iOS alsnog een klik naar de
  // foto eronder. Zonder deze pauze komt er bij elk sleepje een extra
  // ruit bij. Wordt bij elke aanraking opnieuw opgeschoven.
  var negeerTikTot = 0;
  function pauzeerFototik(ms) { negeerTikTot = Date.now() + (ms || 700); }

  window.fotoAanwijzen = function (fotoId) {
    var open = openPlekken(fotoId);
    if (!open.length) { aanwijzenStop(); return; }
    aanwijzen = { fotoId: fotoId, wachtrij: open };
    tekenAanwijsbalk();
    voetenBijwerken();
  };

  window.aanwijzenStop = function () {
    aanwijzen = null;
    tekenAanwijsbalk();
    voetenBijwerken();
  };

  // De strook en de knoppen onder één foto opnieuw (v110): de strook laat
  // tijdens het aanwijzen de regels weg die nog aangewezen worden.
  function voetBijwerken(fotoId) {
    var wrap = el('tabel-' + fotoId);
    if (!wrap) return;
    var scheef = wrap.querySelector('.foto-scheef');
    if (scheef) scheef.remove();
    var voet = wrap.querySelector('.foto-voet');
    if (voet) voet.outerHTML = voetHTML(fotoId);
    if (window.slotToepassen) slotToepassen();
  }
  // v124: aanwijzen gaat over alle tekeningen, dus alle voeten (en stroken).
  function voetenBijwerken() { werkFotos().forEach(function (f) { voetBijwerken(f.id); }); }

  window.aanwijzenOverslaan = function () {
    if (!aanwijzen) return;
    aanwijzen.alle = false;
    aanwijzen.wachtrij.push(aanwijzen.wachtrij.shift());
    tekenAanwijsbalk();
  };

  // v124: zelf kiezen welke ruit je aanwijst (wens Jan: uit álle ruiten van
  // het project). Een tik op de ruit in de gele balk zet hem vooraan.
  window.aanwijzenKies = function (rijId) {
    if (!aanwijzen || aanwijzen.erbij) return;
    rijId = +rijId;
    var zijn = aanwijzen.wachtrij.filter(function (id) { return id === rijId; });
    if (!zijn.length) return;
    aanwijzen.wachtrij = zijn.concat(aanwijzen.wachtrij.filter(function (id) { return id !== rijId; }));
    aanwijzen.alle = false;
    tekenAanwijsbalk();
  };

  // v124: een tekening met "3 getek." toont één kozijn voor drie gelijke:
  // dan alle open ruiten van deze regel met één tik op die plek (iets naast
  // elkaar, zodat je ze ziet). Nog een keer = uit.
  window.aanwijzenAlle = function () {
    if (!aanwijzen || aanwijzen.erbij || !aanwijzen.wachtrij.length) return;
    aanwijzen.alle = !aanwijzen.alle;
    tekenAanwijsbalk();
  };

  // De ruiten die nog een plek nodig hebben, één keer per regel, voor de
  // keuze in de balk: [{ rij, open }].
  function keuzeRuiten() {
    var uit = [], bij = {};
    aanwijzen.wachtrij.forEach(function (id) {
      if (bij[id]) return;
      var rij = getRij(id);
      if (!rij) return;
      var open = aantalVan(rij) - bollenVan(id);
      if (open < 1) return;
      bij[id] = true;
      uit.push({ rij: rij, open: open });
    });
    return uit;
  }

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
      if (aanwijzen.erbij) {
        if (!rij) { aanwijzen = null; tekenAanwijsbalk(); return; }
        var nu = aantalVan(rij);
        balk.style.display = 'flex';
        balk.innerHTML =
          '<span class="aanwijs-letter">' + esc(labelVan(rij)) + '</span>' +
          '<span class="aanwijs-tekst">Tik op de foto waar de extra ruit ' + esc(labelVan(rij)) + ' zit' +
          ' — het aantal wordt dan ' + (nu + 1) + '</span>' +
          '<button class="btn btn-secondary btn-sm" onclick="aanwijzenStop()">Annuleren</button>';
        return;
      }
      // Weg, of het aantal is intussen verlaagd: deze plek overslaan.
      if (!rij || bollenVan(rij.id) >= aantalVan(rij)) {
        aanwijzen.wachtrij.shift(); tekenAanwijsbalk(); return;
      }
      var aantal = aantalVan(rij);
      var open = aantal - bollenVan(rij.id);
      var welke = aantal > 1 ? ' — ruit ' + (bollenVan(rij.id) + 1) + ' van ' + aantal : '';
      // v124: staat de ruit (nog) bij een ander blok, dan zeggen we dat.
      var elders = rij.fotoId && rij.fotoId !== f.id && fotoVan(rij.fotoId) ? ' · staat nu bij ' + blokNaam(rij.fotoId) : '';
      var keuze = keuzeRuiten();
      var volgende = routeVolgende(f.id);
      balk.style.display = 'flex';
      balk.innerHTML =
        '<span class="aanwijs-letter">' + esc(labelVan(rij)) + '</span>' +
        '<span class="aanwijs-tekst">' + (aanwijzen.alle && open > 1
          ? 'Tik op de ' + soortNaam(f) + ': alle ' + open + ' ruiten ' + esc(labelVan(rij)) + ' komen op die plek'
          : 'Tik op de ' + soortNaam(f) + ' waar deze ruit zit' +
            (rij.breedte && rij.hoogte ? ' (' + rij.breedte + ' × ' + rij.hoogte + ')' : '') + welke) +
        elders + ' · nog ' + aanwijzen.wachtrij.length + ' te gaan</span>' +
        (open > 1 ? '<button class="btn btn-ghost btn-sm' + (aanwijzen.alle ? ' aan' : '') + '" onclick="aanwijzenAlle()" ' +
          'title="Eén kozijn op de tekening voor ' + open + ' gelijke ruiten: alle ' + open + ' met één tik">' +
          (aanwijzen.alle ? '✓ ' : '') + 'Alle ' + open + ' op één plek</button>' : '') +
        '<button class="btn btn-ghost btn-sm" onclick="aanwijzenOverslaan()">Overslaan</button>' +
        (volgende ? '<button class="btn btn-secondary btn-sm" onclick="aanwijsOpTekening(\'' + esc(volgende) + '\')">' +
          'Volgende ' + soortNaam(fotoVan(volgende)) + ' →</button>' : '') +
        '<button class="btn btn-secondary btn-sm" onclick="aanwijzenStop()">Klaar</button>' +
        // De keuze uit alle ruiten die nog een plek nodig hebben (v124).
        (keuze.length > 1 ? '<div class="aanwijs-keuze" role="group" aria-label="Kies de ruit">' +
          '<span class="aanwijs-keuze-kop">Of kies:</span>' +
          keuze.map(function (k) {
            var waar = k.rij.fotoId && fotoVan(k.rij.fotoId) ? blokNaam(k.rij.fotoId) : 'nog geen plek';
            return '<button type="button" class="aanwijs-ruit' + (k.rij.id === rij.id ? ' nu' : '') + '" ' +
              'onclick="aanwijzenKies(' + (+k.rij.id) + ')" title="' + esc(labelVan(k.rij) + ' · ' + waar) + '">' +
              '<b>' + esc(labelVan(k.rij)) + '</b>' +
              (k.rij.breedte && k.rij.hoogte ? '<span>' + esc(k.rij.breedte + '×' + k.rij.hoogte) + '</span>' : '') +
              (k.open > 1 ? '<i>×' + k.open + '</i>' : '') + '</button>';
          }).join('') + '</div>' : '');
    });
    routeBijwerken();
  }

  /* ─── v124: de route na de import ────────────────────────────────
     Een maatstaat en een pdf met meer tekeningen (wens Jan): na de import
     bovenaan een korte route "Wijs de ruiten aan op de tekeningen", met per
     tekening een knop. De knop opent het aanwijzen op die tekening; in de
     gele balk staat dan "Volgende tekening →". Alleen in het geheugen (niet
     in het project): na herladen staat de knop "🎯 Ruiten aanwijzen" er nog. */
  var route = null;     // { pid }
  var routeDicht = {};  // per project: met ✕ gesloten (alleen in het geheugen)
  function routeTekeningen() { return werkFotos().filter(function (f) { return f.pad; }); }
  // Meer dan één tekening (uit een pdf of als afbeelding ingelezen)?
  function meerTekeningen() {
    return routeTekeningen().filter(function (f) { return f.bron === 'tekening'; }).length >= 2;
  }
  // "Volgende tekening →" in de gele balk: bij meer tekeningen altijd.
  function routeVolgende(fotoId) {
    if (!meerTekeningen()) return null;
    var lijst = routeTekeningen();
    var i = lijst.findIndex(function (f) { return f.id === fotoId; });
    return i >= 0 && i < lijst.length - 1 ? lijst[i + 1].id : null;
  }

  // Na een import (maatstaat of tekening): de route als er meer tekeningen
  // zijn en er ruiten nog een plek nodig hebben. Op slot of alleen kijken:
  // niet (aanwijzen mag dan niet).
  window.aanwijsRouteNaImport = function () {
    if (window.invoerOpSlot && invoerOpSlot()) return;
    if (!meerTekeningen() || !openPlekken(null).length) return;
    delete routeDicht[window.glasProjectId];
    route = { pid: window.glasProjectId };
    routeBijwerken();
    var r = el('aanwijsRoute');
    if (r && r.scrollIntoView) setTimeout(function () { r.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
  };
  window.aanwijsRouteSluit = function () {
    if (window.glasProjectId) routeDicht[window.glasProjectId] = true;
    route = null;
    routeBijwerken();
  };
  // Aanwijzen op deze tekening: openklappen, erheen, en de gele balk.
  window.aanwijsOpTekening = function (fotoId) {
    if (!fotoVan(fotoId)) return;
    if (typeof blokDicht !== 'undefined' && blokDicht[fotoId] && window.blokKlap) blokKlap(fotoId);
    window.fotoAanwijzen(fotoId);
    var b = el('blok-' + fotoId);
    if (b && b.scrollIntoView) b.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  function routeHTML() {
    if (window.invoerOpSlot && invoerOpSlot()) return '';
    if (!meerTekeningen()) return '';
    var open = openPlekken(null).length;
    // Ook bij het openen van zo'n project (de werkvloer opent wat kantoor
    // importeerde), zolang er ruiten zonder plek zijn en hij niet met ✕ dicht
    // is gedaan.
    if ((!route || route.pid !== window.glasProjectId) && open && window.glasProjectId && !routeDicht[window.glasProjectId]) {
      route = { pid: window.glasProjectId };
    }
    if (!route || route.pid !== window.glasProjectId) return '';
    var lijst = routeTekeningen();
    var bezig = aanwijzen && !aanwijzen.erbij ? aanwijzen.fotoId : null;
    var eerste = true;
    return '<div class="aanwijs-route" id="aanwijsRoute">' +
      '<button type="button" class="sluit-x vrij-bij-slot" aria-label="Route sluiten" onclick="aanwijsRouteSluit()">✕</button>' +
      '<div class="ar-kop"><b>🎯 Wijs de ruiten aan op de tekeningen</b> <span>' + (open
        ? (open === 1 ? 'nog 1 ruit zonder plek' : 'nog ' + open + ' ruiten zonder plek')
        : '✓ alle ruiten hebben een plek') + '</span></div>' +
      (open ? '<div class="ar-uitleg">Tik op een tekening hieronder. Kies in de gele balk de ruit, en tik op de tekening waar hij zit.</div>' : '') +
      '<div class="ar-stappen">' + lijst.map(function (f, i) {
        var n = (f.markeringen || []).filter(function (m) { return getRij(m.rijId); }).length;
        var primair = open && !bezig && eerste;
        eerste = false;
        return '<button type="button" class="btn btn-sm ar-stap ' + (primair ? 'btn-primary' : 'btn-secondary') +
          (bezig === f.id ? ' nu' : '') + '" onclick="aanwijsOpTekening(\'' + esc(f.id) + '\')">' +
          '<span class="ar-nr">' + (i + 1) + '</span>' + esc(f.titel || soortNaam(f, true) + ' ' + (i + 1)) +
          '<small>' + (n ? n + ' aangewezen' : 'nog niets') + '</small></button>';
      }).join('') + '</div></div>';
  }
  // De route bovenaan bijwerken, alleen als hij anders is (een
  // MutationObserver kijkt mee, v93).
  function routeBijwerken() {
    var houder = el('fotoHouder');
    if (!houder) return;
    var html = routeHTML();
    var oud = el('aanwijsRoute');
    if (!html) { if (oud) oud.remove(); return; }
    if (oud && oud.getAttribute('data-html') === html) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var nieuw = tmp.firstChild;
    nieuw.setAttribute('data-html', html);
    if (oud) oud.replaceWith(nieuw); else houder.insertBefore(nieuw, houder.firstChild);
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
    // Eén ruit erbij voor een regel met bolletjes (v110): het aantal en het
    // bolletje veranderen in één stap, zodat ze nooit uit elkaar lopen en
    // Cmd+Z ze ook samen terugzet.
    if (aanwijzen && aanwijzen.erbij && aanwijzen.fotoId === fotoId) {
      var erbijRij = getRij(aanwijzen.wachtrij[0]);
      aanwijzen = null;
      if (erbijRij) {
        var was = aantalVan(erbijRij);
        if (window.bewaarStap) bewaarStap('Ruit ' + labelVan(erbijRij) + ' erbij: aantal ' + was + ' → ' + (was + 1));
        erbijRij.aantal = was + 1;
        foto.markeringen.push({ rijId: erbijRij.id, x: x, y: y });
        // v124: de ruit staat bij de tekening met de meeste bolletjes (tot
        // v123: hoorde hij al bij een groep, dan bleef hij daar).
        naarBolletjes(erbijRij);
        herbereken();
        renderTabel();
        opslaan();
      }
      tekenAanwijsbalk();
      return;
    }
    // v124: een tik op een ándere tekening tijdens het aanwijzen zet de ruit
    // dáár (aanwijzen werkt op elke tekening); tot v123 kwam er dan stil een
    // nieuwe ruit met een nieuwe letter bij. De gele balk verhuist mee.
    if (aanwijzen && !aanwijzen.erbij && aanwijzen.fotoId !== fotoId && aanwijzen.wachtrij.length && foto.pad) {
      aanwijzen.fotoId = fotoId;
    }
    if (aanwijzen && aanwijzen.fotoId === fotoId && aanwijzen.wachtrij.length) {
      var bestaandeId = aanwijzen.wachtrij.shift();
      var bestaande = getRij(bestaandeId);
      // Tot v79 werden de bestaande bolletjes van deze regel hier eerst
      // weggehaald: één bolletje per merk. Nu komt er een bij, zolang de
      // regel er nog niet genoeg heeft voor zijn aantal.
      if (bestaande && bollenVan(bestaandeId) < aantalVan(bestaande)) {
        // v124: "Alle N op één plek": alle open ruiten van deze regel met deze
        // tik, iets naast elkaar. Eén stap voor ↶.
        var erbij = aanwijzen.alle ? aantalVan(bestaande) - bollenVan(bestaandeId) : 1;
        aanwijzen.alle = false;
        if (window.bewaarStap) bewaarStap('Ruit ' + labelVan(bestaande) + ' aangewezen' + (erbij > 1 ? ' (' + erbij + '×)' : ''));
        // Ongeveer een bolletje breed uit elkaar (het bolletje is ±4,5 % van
        // de breedte), met de tik in het midden.
        for (var k = 0; k < erbij; k++) {
          var nx = Math.min(1, Math.max(0, x + (k - (erbij - 1) / 2) * 0.045));
          foto.markeringen.push({ rijId: bestaandeId, x: nx, y: y });
        }
        if (erbij > 1) aanwijzen.wachtrij = aanwijzen.wachtrij.filter(function (id) { return id !== bestaandeId; });
        // v124: de ruit staat bij de tekening met de meeste bolletjes; tot
        // v123 altijd bij de foto waarop hij aangewezen werd.
        naarBolletjes(bestaande);
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
    // Bewust niet naar de regel springen: je bent bezig met aanwijzen op
    // de foto, en op een tablet schiet het beeld dan bij elke ruit weg.
    // Naar de tabel scrollen doe je zelf als je klaar bent.
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
      // In een besteld project staat de foto vast (v91). slotWeigert tekent
      // het scherm opnieuw, dus het bolletje springt terug.
      if (gesleept && window.invoerOpSlot && invoerOpSlot()) { slotWeigert(); return; }
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

    var st = bolStaat(fotoId, index);
    // Een bolletje boven het aantal (rode stippelrand): alleen weghalen. Eén
    // ruit minder zou het aantal nog verder van de bolletjes brengen.
    var teveel = rij && st.nr > st.aantal;
    var meer = rij && st.aantal > 1 && !teveel;
    var d = document.createElement('div');
    d.className = 'mark-menu';
    d.innerHTML =
      '<div class="mark-menu-kop">' + esc(rij ? labelVan(rij) : '?') +
        (meer ? ' <span>· ruit ' + Math.min(st.nr, st.aantal) + ' van ' + st.aantal + '</span>' : '') +
        (rij && st.nr > st.aantal ? ' <span class="teveel">· te veel</span>' : '') +
      '</div>' +
      (rij ? '<button onclick="markNaarRegel(\'' + fotoId + '\',' + index + ')">Naar de regel</button>' : '') +
      // Een open plek (minder bolletjes dan het aantal): eerst die aanwijzen
      // (tweede controle v110: wie de ontbrekende ruit zocht, verhoogde
      // anders het aantal).
      (rij && !teveel && bollenVan(rij.id) < st.aantal
        ? '<button onclick="markAanwijzenRij(\'' + fotoId + '\',' + rij.id + ')">🎯 De ontbrekende ' +
          (st.aantal - bollenVan(rij.id) === 1 ? 'ruit' : st.aantal - bollenVan(rij.id) + ' ruiten') + ' aanwijzen</button>' : '') +
      // v110: een ruit erbij gaat via het bolletje, want het aantal is in
      // een fotoblok niet meer te typen (optie A).
      (rij && !teveel ? '<button onclick="markErbij(\'' + fotoId + '\',' + index + ')">' +
        '＋ Nog een ruit met deze letter (aantal ' + st.aantal + ' → ' + (st.aantal + 1) + ')</button>' : '') +
      '<button onclick="markWeg(\'' + fotoId + '\',' + index + ')">' +
        (teveel ? 'Dit bolletje weghalen (het is er een te veel)'
          : rij ? 'Alleen het bolletje weghalen (aantal blijft ' + st.aantal + ')' : 'Markering verwijderen') + '</button>' +
      // Bij een regel ×3 wil je meestal één van de drie kwijt, niet de
      // hele bestelregel. Dat haalt dit bolletje weg én het aantal omlaag.
      (meer ? '<button onclick="markEenMinder(\'' + fotoId + '\',' + index + ')">' +
        'Één ruit minder (aantal ' + st.aantal + ' → ' + (st.aantal - 1) + ')</button>' : '') +
      (rij && !teveel ? '<button class="gevaar" onclick="markRuitWeg(\'' + fotoId + '\',' + index + ')">' +
        (meer ? 'Hele regel verwijderen (' + st.aantal + ' ruiten)' : 'Ruit verwijderen') + '</button>' : '') +
      '<button onclick="markMenuSluit()">Annuleren</button>';
    if (window.sluitKruis) sluitKruis(d, sluitMenu, 'Menu sluiten');   // v118
    document.body.appendChild(d);
    menu = d;

    var r = bol.getBoundingClientRect();
    var links = Math.min(r.left + window.scrollX,
      window.scrollX + document.documentElement.clientWidth - d.offsetWidth - 10);
    d.style.left = Math.max(window.scrollX + 8, links) + 'px';
    // Past het niet meer onder het bolletje (iPhone liggend), dan erboven.
    var hoog = window.visualViewport ? window.visualViewport.height : document.documentElement.clientHeight;
    var onder = r.bottom + 6 + d.offsetHeight <= hoog;
    var boven = r.top - 6 - d.offsetHeight >= 0;
    if (!onder && !boven) {
      // Past nergens (iPhone liggend): bovenin het beeld, en dan schuiven.
      d.style.maxHeight = Math.max(120, hoog - 16) + 'px';
      d.style.overflowY = 'auto';
      d.style.top = (window.scrollY + 8) + 'px';
    } else {
      d.style.top = (!onder ? r.top + window.scrollY - 6 - d.offsetHeight
                            : r.bottom + window.scrollY + 6) + 'px';
    }
    setTimeout(function () { document.addEventListener('pointerdown', menuBuiten, true); }, 0);
  }

  window.markMenuSluit = sluitMenu;

  /* ─── v110: aantal en bolletjes samen ──────────────────────── */

  // ‹＋ Nog een ruit met deze letter›: de volgende tik op de foto zet het
  // bolletje en verhoogt het aantal, in één stap. Annuleren verandert niets.
  window.markErbij = function (fotoId, index) {
    sluitMenu();
    var foto = fotoVan(fotoId);
    var m = foto && foto.markeringen[index];
    var rij = m && getRij(m.rijId);
    if (!rij) return;
    aanwijzen = { fotoId: fotoId, wachtrij: [rij.id], erbij: true };
    tekenAanwijsbalk();
  };

  // Strook 'klopt niet', "Er zijn er N": het aantal wordt het aantal
  // bolletjes. Alleen op een tik van de gebruiker, nooit vanzelf.
  window.markAantalNaarBollen = async function (rijId) {
    var rij = getRij(rijId);
    var n = bollenVan(rijId);
    if (!rij || !n) return;
    var was = aantalVan(rij);
    var project = window.glasProjectId;
    // Lager: het aantal kan uit een ingelezen maatstaat komen (de waarheid,
    // afspraak met Jan). Eerst even vragen; een misser op een iPad is zo
    // gemaakt.
    if (n < was && window.appVraag && !await appVraag('Het aantal van ' + labelVan(rij) + ' van ' + was + ' naar ' + n +
        '? Er ' + (was - n === 1 ? 'is dan één ruit' : 'zijn dan ' + (was - n) + ' ruiten') + ' minder. Komt het aantal ' +
        'uit een ingelezen maatstaat, kijk die dan eerst na.', { kop: 'Aantal verlagen', ja: 'Ja, ' + n })) return;
    rij = getRij(rijId);
    // Intussen iets veranderd (een collega, ander project)? Dan niets doen.
    if (!rij || bollenVan(rijId) !== n || aantalVan(rij) !== was || window.glasProjectId !== project) return;
    // Intussen besteld (een collega) of overgenomen: dan niet meer.
    if (window.invoerOpSlot && invoerOpSlot()) { if (window.slotWeigert) slotWeigert(); return; }
    if (window.bewaarStap) bewaarStap('Ruit ' + labelVan(rij) + ': aantal ' + aantalVan(rij) + ' → ' + n);
    rij.aantal = n;
    herbereken();
    renderTabel();
    opslaan();
  };

  // Strook 'klopt niet', te veel bolletjes: de gestreepte weg (die boven
  // het aantal: het laatst geplaatst, en zo ook al niet in de pdf).
  window.markTeveelWeg = function (rijId) {
    var rij = getRij(rijId);
    if (!rij) return;
    var max = aantalVan(rij);
    if (bollenVan(rijId) <= max) return;
    if (window.bewaarStap) bewaarStap('Ruit ' + labelVan(rij) + ': bolletjes te veel weg');
    var n = 0;
    fotos.forEach(function (f) {
      f.markeringen = (f.markeringen || []).filter(function (mk) {
        if (mk.rijId !== rijId) return true;
        return ++n <= max;
      });
    });
    naarBolletjes(rij);     // v124
    herbereken();
    renderTabel();
    opslaan();
  };

  // Strook 'klopt niet', nog aan te wijzen: alleen deze regel aanwijzen.
  window.markAanwijzenRij = function (fotoId, rijId) {
    sluitMenu();
    var rij = getRij(rijId);
    if (!rij) return;
    var open = aantalVan(rij) - bollenVan(rijId);
    if (open < 1) return;
    var rij2 = [];
    for (var i = 0; i < open; i++) rij2.push(rijId);
    aanwijzen = { fotoId: fotoId, wachtrij: rij2 };
    tekenAanwijsbalk();
    voetenBijwerken();
  };

  window.markNaarRegel = function (fotoId, index) {
    sluitMenu();
    markTik(fotoId, index);
  };

  window.markWeg = function (fotoId, index) {
    sluitMenu();
    var foto = fotoVan(fotoId);
    if (!foto) return;
    if (window.bewaarStap) bewaarStap('Markering verwijderd');
    var weg = foto.markeringen.splice(index, 1)[0];
    // v124: staan de andere bolletjes nu vooral op een andere tekening, dan
    // gaat de ruit mee (zelfde stap). Zonder bolletjes blijft hij staan.
    if (weg) naarBolletjes(getRij(weg.rijId));
    opslaan();
    // renderTabel (v110): zonder bolletje is het aantal weer vrij, ook als de
    // regel in de losse tabel staat.
    renderTabel();
  };

  // Eén van de gelijke ruiten eruit: dit bolletje weg en het aantal één
  // lager. De bestelregel zelf blijft staan.
  window.markEenMinder = function (fotoId, index) {
    sluitMenu();
    var foto = fotoVan(fotoId);
    var m = foto && foto.markeringen[index];
    var rij = m && getRij(m.rijId);
    if (!rij) return;
    var aantal = aantalVan(rij);
    if (aantal < 2) return;
    if (window.bewaarStap) bewaarStap('Ruit ' + labelVan(rij) + ': aantal ' + aantal + ' → ' + (aantal - 1));
    foto.markeringen.splice(index, 1);
    rij.aantal = aantal - 1;
    naarBolletjes(rij);     // v124
    herbereken();
    renderTabel();
    opslaan();
  };

  window.markRuitWeg = async function (fotoId, index) {
    var foto = fotoVan(fotoId);
    var m = foto && foto.markeringen[index];
    var rij = m && getRij(m.rijId);
    sluitMenu();
    if (!rij) return;
    var n = aantalVan(rij);
    if (!await appVraag(n > 1
        ? 'Regel ' + labelVan(rij) + ' helemaal verwijderen? Dat zijn ' + n + ' ruiten, met al ' +
          'hun bolletjes en de ingevulde maten.'
        : 'Ruit ' + labelVan(rij) + ' helemaal verwijderen, inclusief de ingevulde maten?',
        { kop: n > 1 ? 'Regel verwijderen' : 'Ruit verwijderen', ja: 'Verwijderen',
          gevaarlijk: true })) return;
    if (!getRij(rij.id)) return;
    verwijderRij(rij.id);
    renderFotoTabellen();
  };

  async function markTik(fotoId, index) {
    var foto = fotoVan(fotoId);
    var m = foto.markeringen[index];
    var rij = getRij(m.rijId);
    if (!rij) {
      if (await appVraag('De regel bij deze markering bestaat niet meer. Markering verwijderen?',
          { kop: 'Losse markering', ja: 'Markering weghalen' })) {
        var nu = fotoVan(fotoId);
        if (nu && nu.markeringen[index] === m) {
          nu.markeringen.splice(index, 1);
          opslaan();
          renderFotos();
        }
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
    // Op slot: de oorspronkelijke functie weigert, en dan horen de
    // bolletjes ook te blijven staan. Tot v90 waren ze dan al weggehaald,
    // en de volgende opslag nam dat mee (v91).
    if (window.invoerOpSlot && invoerOpSlot()) return origVerwijder(id);
    // v124: de ruit met zijn bolletjes in "Onlangs verwijderd" (herstel.js),
    // vóór de bolletjes hieronder weg zijn. De stap voor ↶ is er dan al
    // (undo.js omhult verwijderRij van buitenaf).
    if (window.glasVerwijderdRuiten) glasVerwijderdRuiten([id]);
    fotos.forEach(function (f) {
      f.markeringen = f.markeringen.filter(function (m) { return m.rijId !== id; });
    });
    origVerwijder(id);
  };

  /* ─── v115: voorbeeld van een foto (alleen kijken) ─────────────── */
  // Op Toebehoren en in de vensters van de latten (wens Jan): de foto of
  // tekening met de merkletters (en de tekening erop), zodat je ziet over
  // welke ruit het gaat. Alleen kijken: geen tikken op de foto, geen slepen.
  // opties: { klein: true } voor een duimnagel, { rijId } om de bolletjes van
  // die ruit op te laten lichten.
  function voorbeeldInhoud(f, url, opties) {
    opties = opties || {};
    var marks = (f.markeringen || []).map(function (m) {
      var rij = getRij(m.rijId);
      var label = rij ? labelVan(rij) : '?';
      var licht = opties.rijId != null && m.rijId === opties.rijId;
      return '<span class="fv-mark' + (licht ? ' licht' : '') + (label.length > 2 ? ' lang' : '') + '" style="left:' + (m.x * 100) + '%;top:' + (m.y * 100) +
        '%">' + esc(label) + '</span>';
    }).join('');
    return '<img src="' + esc(url) + '" alt="">' + (window.inktSVGHTML ? inktSVGHTML(f) : '') + marks;
  }
  window.fotoVoorbeeldHTML = function (fotoId, opties) {
    opties = opties || {};
    var f = fotoVan(fotoId);
    if (!f || !f.pad) return '';
    var url = linkCache[f.pad];
    return '<span class="fv' + (opties.klein ? ' fv-klein' : '') + '" data-fv="' + esc(fotoId) + '"' +
      (opties.rijId != null ? ' data-rij="' + esc(opties.rijId) + '"' : '') + ' role="button" tabindex="0" title="Groter bekijken" ' +
      'onclick="event.stopPropagation(); fotoGroot(\'' + esc(fotoId) + '\'' + (opties.rijId != null ? ', ' + (+opties.rijId) : '') + ')">' +
      (url ? voorbeeldInhoud(f, url, opties) : '<span class="fv-laden">foto…</span>') + '</span>';
  };
  // De voorbeelden zonder afbeelding (link nog niet bekend) alsnog vullen.
  window.fotoVoorbeeldenVullen = function (houder) {
    if (!houder || !houder.querySelectorAll) return;
    Array.prototype.forEach.call(houder.querySelectorAll('.fv[data-fv]'), function (vak) {
      if (vak.querySelector('img')) return;
      var f = fotoVan(vak.getAttribute('data-fv'));
      if (!f || !f.pad) return;
      var rijAttr = vak.getAttribute('data-rij');
      var opties = { klein: vak.classList.contains('fv-klein'), rijId: rijAttr != null ? +rijAttr : null };
      link(f.pad).then(function (url) {
        if (!vak.isConnected) return;
        vak.innerHTML = url ? voorbeeldInhoud(f, url, opties) : '<span class="fv-laden">foto niet beschikbaar</span>';
      });
    });
  };
  // Groot: over het hele scherm (sluit met een tik of Escape, zoals de foto
  // van een lat; latten.js ruimt .lat-groot op bij Escape).
  window.fotoGroot = function (fotoId, rijId) {
    var f = fotoVan(fotoId);
    if (!f || !f.pad) return;
    var oud = document.querySelector('.lat-groot');
    if (oud && oud.parentNode) oud.parentNode.removeChild(oud);
    var g = document.createElement('div');
    g.className = 'lat-groot fv-groot';
    g.innerHTML = '<div class="lat-groot-inhoud fv-groot-inhoud">' +
      window.fotoVoorbeeldHTML(fotoId, { rijId: rijId }).replace('onclick=', 'data-x=') +
      '<p><b>' + esc(f.titel || soortNaam(f, true)) + '</b></p><button type="button" class="btn btn-secondary btn-sm">Sluiten</button>' +
      '<button type="button" class="sluit-x" aria-label="Sluiten">✕</button></div>';   // v118: kruisje
    var weg = function (e) {
      if (e && e.type === 'keydown' && e.key !== 'Escape') return;
      if (g.parentNode) g.parentNode.removeChild(g);
      document.removeEventListener('keydown', weg, true);
    };
    g.addEventListener('click', weg);
    // Zonder een venster van de latten eronder moet Escape het zelf doen.
    if (!(window.latVensterOpen && document.querySelector('.lat-laag'))) document.addEventListener('keydown', weg, true);
    document.body.appendChild(g);
    window.fotoVoorbeeldenVullen(g);
  };
})();
