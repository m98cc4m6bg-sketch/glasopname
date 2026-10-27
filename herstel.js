/* ═══════════════════════════════════════════════════════════════
   Glasopname – onlangs verwijderd (v124, keuze Jan: "laag 2")

   Jan: "Als iemand per ongeluk een heel blok met invoer verwijdert, moet
   dat redelijk eenvoudig terug te halen zijn."

   Alles wat iemand in een project weggooit — een blok (foto of tekening
   met zijn ruiten), alleen de afbeelding, losse ruiten, een hele tabel, de
   foto van de leverlocatie, een taak — komt in de lijst "Onlangs
   verwijderd": wat, wie, wanneer. Met één tik terug, 30 dagen lang.

   Waar het staat: in de projectgegevens, onder een eigen sleutel
   (projectInfo.onlangsVerwijderd). Zo gaat het met het project mee naar de
   server en is het op elk apparaat te zien en terug te zetten, door
   iedereen. Het is géén onderdeel van data.rijen of data.fotos: de
   bestellijst, de pdf's, Excel en de controle van de database (script 28,
   glas_ids_fout) zien het niet.

   Wat er per keer in een item staat: de ruiten zelf (met hun nummer, hun
   plek in de lijst en hun bolletjes), of de hele foto (met bolletjes,
   tekenwerk en het pad naar het bestand). Het bestand van een foto blijft
   in de opslag staan tot het project weg is (fotoVerwijder, v83); daarom
   kan hij terug.

   Rechten: terugzetten van invoer gaat langs slotWeigert() (alleen kijken,
   of besteld en niet ontgrendeld); taken langs kijkWeigert(). Een item
   bewaren gebeurt nooit in "alleen kijken" (dan wijzigt dit apparaat het
   project niet).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SLEUTEL = 'onlangsVerwijderd';
  var DAGEN = 30;
  var MAX_ITEMS = 60;          // de oudste gaan eruit
  // Het hele project gaat bij elke opslag omhoog (ook op de bouwplaats, met
  // weinig bereik): de lijst samen hoogstens ±250 kB. Eén groot item (een
  // tekening met veel tekenwerk) blijft wel altijd staan.
  var MAX_TEKENS = 250000;
  var DAG_MS = 864e5;

  function kloon(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function info() { return (typeof projectInfo === 'object' && projectInfo) ? projectInfo : null; }
  function lijst() {
    var i = info();
    return i && Array.isArray(i[SLEUTEL]) ? i[SLEUTEL] : [];
  }
  function tijdVan(x) { var t = Date.parse(x && x.op); return isNaN(t) ? 0 : t; }
  // Verlopen: ouder dan 30 dagen (klok van dit apparaat). Een item van een
  // apparaat waarvan de klok voorloopt, telt gewoon als nieuw.
  function verlopen(x, nu) { return (nu || Date.now()) - tijdVan(x) > DAGEN * DAG_MS; }
  function zichtbaar() {
    var nu = Date.now();
    return lijst().filter(function (x) { return x && x.id && !verlopen(x, nu); });
  }
  window.glasVerwijderdLijst = zichtbaar;

  function heeftInhoud(r) {
    return !!(r && (r.merk || r.breedte || r.hoogte || r.glasType || r.opmerking));
  }
  function fotoVan(id) { return (typeof fotos !== 'undefined' ? fotos : []).find(function (f) { return f.id === id; }); }
  function soort(f) { return window.soortNaam ? soortNaam(f) : 'foto'; }
  function naamVan(f) { return f && f.titel ? '«' + f.titel + '»' : ''; }
  function labelRij(r) { return String((r && r.merk) || '(zonder merk)'); }
  function maatRij(r) { return r && r.breedte && r.hoogte ? ' (' + r.breedte + ' × ' + r.hoogte + ')' : ''; }

  /* ─── een item bewaren ─────────────────────────────────────── */

  function nieuwId() { return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function wieNu() {
    try { return (window.glasGebruiker && glasGebruiker().naam) || ''; } catch (e) { return ''; }
  }

  // Geeft het item terug (of null als er niets te bewaren viel). De
  // aanroeper slaat daarna zelf op (opslaan), zoals na elke wijziging.
  function bewaarItem(item, stil) {
    var i = info();
    if (!i) return null;
    // Alleen kijken: dit apparaat wijzigt het project niet (v106).
    if (window.glasAlleenKijken && glasAlleenKijken()) return null;
    item.id = nieuwId();
    item.wie = wieNu();
    item.op = new Date().toISOString();
    var nu = Date.now();
    var l = lijst().filter(function (x) { return x && x.id && !verlopen(x, nu); });
    l.push(item);
    while (l.length > MAX_ITEMS) l.shift();
    while (l.length > 1 && JSON.stringify(l).length > MAX_TEKENS) l.shift();
    i[SLEUTEL] = l;
    verwijderdTeller();
    if (!stil && window.kortBericht) {
      kortBericht('Verwijderd: ' + item.wat + '. Ook later terug te zetten via 🗑 Onlangs verwijderd.',
        { soort: 'info', knop: '↶ Terugzetten', ms: 12000, actie: function () { window.glasVerwijderdTerug(item.id); } });
    }
    return item;
  }

  // De ruiten met hun plek in de lijst en hun bolletjes (met het pad van de
  // foto: op een andere foto in dezelfde groep horen ze niet terug).
  // na: de ruit die er in dezelfde tabel vlak vóór stond (voor de plek bij
  // het terugzetten, zie ruitenTerug).
  function ruitenVan(ids) {
    var weg = {};
    ids.forEach(function (id) { weg[id] = true; });
    var uit = [];
    var vorigeIn = {};      // tabel -> laatst geziene ruit
    rijen.forEach(function (r, plek) {
      var blok = r.fotoId || '';
      var na = vorigeIn.hasOwnProperty(blok) ? vorigeIn[blok] : null;
      vorigeIn[blok] = r.id;
      if (!weg[r.id]) return;
      var bollen = [];
      (typeof fotos !== 'undefined' ? fotos : []).forEach(function (f) {
        (f.markeringen || []).forEach(function (m) {
          if (m && m.rijId === r.id) bollen.push({ f: f.id, pad: f.pad || null, m: kloon(m) });
        });
      });
      if (!heeftInhoud(r) && !bollen.length) return;     // lege regels niet
      uit.push({ rij: kloon(r), plek: plek, na: na, bollen: bollen });
    });
    return uit;
  }
  function ruitenTekst(lijst) {
    var n = lijst.reduce(function (s, x) { var a = parseInt(x.rij.aantal, 10); return s + (a > 0 ? a : 1); }, 0);
    if (lijst.length === 1) {
      var r = lijst[0].rij;
      return (n > 1 ? 'Regel ' + labelRij(r) + ' (' + n + ' ruiten)' : 'Ruit ' + labelRij(r) + maatRij(r));
    }
    var namen = lijst.slice(0, 6).map(function (x) { return labelRij(x.rij); }).join(', ') + (lijst.length > 6 ? ' …' : '');
    return n + ' ruiten (' + namen + ')';
  }

  // Ruiten (✕, een regel via het bolletje, de selectie). Vóór het weghalen.
  window.glasVerwijderdRuiten = function (ids, wat) {
    var r = ruitenVan(ids || []);
    if (!r.length) return null;
    return bewaarItem({ soort: 'ruiten', wat: wat || ruitenTekst(r), ruiten: r });
  };
  // Een hele tabel leeggemaakt (🗑 Leegmaken in de balk van de tabel).
  window.glasVerwijderdTabel = function (fotoId) {
    var ids = rijen.filter(function (r) { return (r.fotoId || null) === (fotoId || null); }).map(function (r) { return r.id; });
    var r = ruitenVan(ids);
    if (!r.length) return null;
    var f = fotoId ? fotoVan(fotoId) : null;
    var waar = f ? 'tabel bij ' + soort(f) + ' ' + naamVan(f) : 'tabel zonder foto of tekening';
    return bewaarItem({ soort: 'ruiten', wat: ruitenTekst(r) + ' uit de ' + waar.replace(/ $/, ''), ruiten: r });
  };
  // Een hele groep (🗑 Groep, of 🗑 Foto bij een groep zonder ruiten).
  // ookRuiten: de ruiten gaan mee weg; anders blijven ze los staan en
  // onthouden we welke het waren, zodat ze terug in de groep kunnen.
  window.glasVerwijderdGroep = function (fotoId, ookRuiten) {
    var f = fotoVan(fotoId);
    if (!f) return null;
    var eigen = rijen.filter(function (r) { return r.fotoId === fotoId; });
    var r = ookRuiten ? ruitenVan(eigen.map(function (x) { return x.id; })) : [];
    var n = r.reduce(function (s, x) { var a = parseInt(x.rij.aantal, 10); return s + (a > 0 ? a : 1); }, 0);
    var wat = (f.pad ? (soort(f) === 'tekening' ? 'Tekening ' : 'Foto ') : 'Groep ') + (naamVan(f) || ('nr. ' + (fotos.indexOf(f) + 1))) +
      (ookRuiten ? (n ? ' met ' + n + (n === 1 ? ' ruit' : ' ruiten') : '') : (eigen.length ? ' (de ruiten bleven staan)' : ''));
    return bewaarItem({ soort: 'groep', wat: wat, foto: kloon(f), plek: fotos.indexOf(f), ruiten: r,
                        los: ookRuiten ? [] : eigen.map(function (x) { return x.id; }) });
  };
  // Alleen de afbeelding (🗑 Foto; de groep en de ruiten blijven).
  window.glasVerwijderdAfbeelding = function (fotoId) {
    var f = fotoVan(fotoId);
    if (!f || !f.pad) return null;
    return bewaarItem({ soort: 'afbeelding', wat: 'Alleen de ' + soort(f) + ' ' + (naamVan(f) || '') + ' (de ruiten bleven staan)',
                        foto: kloon(f) });
  };
  // De foto van de leverlocatie.
  window.glasVerwijderdLever = function (f) {
    if (!f) return null;
    return bewaarItem({ soort: 'lever', wat: 'Foto van de leverlocatie', foto: kloon(f) });
  };
  // Taken (Project info). Alleen de velden die je bij het aanmaken kiest.
  // lokaal: de taken staan nog in het project zelf (zonder de tabel taken,
  // v87); dan volgt het item ↶ zoals de rest. Anders staan ze in de tabel,
  // buiten ↶ om, en houdt ↶ het item vast (undo.js herstel).
  window.glasVerwijderdTaken = function (lijst, wat, lokaal) {
    var t = (lijst || []).filter(function (x) { return x && String(x.tekst || '').trim(); }).map(function (x) {
      return { tekst: x.tekst, klaar: !!x.klaar, eigenaar: x.eigenaar || null, eigenaar_naam: x.eigenaar_naam || '' };
    });
    if (!t.length) return null;
    var item = { soort: 'taken', wat: wat || (t.length === 1 ? 'Taak «' + t[0].tekst + '»' : t.length + ' taken'), taken: t };
    if (lokaal) item.lokaal = true;
    return bewaarItem(item);
  };
  // Het item waarin een ruit zit (voor ✕ ↶ Terugzetten in index.html).
  window.glasVerwijderdVoorRij = function (rijId) {
    var l = zichtbaar();
    for (var i = l.length - 1; i >= 0; i--) {
      if ((l[i].ruiten || []).some(function (x) { return x.rij && x.rij.id === rijId; })) return l[i];
    }
    return null;
  };

  /* ─── terugzetten ──────────────────────────────────────────── */

  // Ruiten terug op hun plek. Een ruit die er al is (bijv. al terug met ↶)
  // slaan we over: één nummer = één ruit. Zijn foto bestaat niet meer, dan
  // komt hij bij de losse maten (zonder bolletjes). De bolletjes alleen
  // terug op dezelfde foto (hetzelfde bestand); anders is de plek op de foto
  // niets meer waard en blijft de ruit "nog aan te wijzen" (v110: het aantal
  // verandert nooit stil).
  // De plek: vlak na de ruit die er toen vóór stond (als die er nog is, in
  // dezelfde tabel); anders op volgorde van nummer tussen de ingevulde
  // ruiten van de tabel (zo komen ruiten die op verschillende momenten weg
  // gingen in de goede volgorde terug), en anders vóór de lege regels.
  // v124 (review): binnen die grenzen zo dicht mogelijk bij de plek in de
  // hele lijst waar hij toen stond (plek), zodat ook de volgorde over de
  // tabellen heen (Excel, pdf) weer klopt.
  function plekVoor(r, na, plek) {
    var blok = r.fotoId || null;
    var inBlok = function (y) { return (y.fotoId || null) === blok; };
    var lo = 0, hi = rijen.length, anker = false;
    if (na != null) {
      var i = rijen.findIndex(function (y) { return y.id === na && inBlok(y); });
      if (i >= 0) { lo = i + 1; anker = true; }
    }
    var metInhoud = rijen.some(function (y) { return inBlok(y) && heeftInhoud(y); });
    // Zonder ingevulde ruiten in de tabel: op nummer in de hele lijst.
    var telt = metInhoud ? function (y) { return inBlok(y) && heeftInhoud(y); } : heeftInhoud;
    rijen.forEach(function (y, j) {
      if (!telt(y)) return;
      if (+y.id < +r.id) { if (!anker) lo = Math.max(lo, j + 1); }
      else if (j < hi && j >= lo) hi = j;
    });
    // Vóór de lege regels (van deze tabel, of als hij leeg is: van allemaal).
    var leeg = rijen.findIndex(function (y, j) { return j >= lo && (metInhoud ? inBlok(y) : true) && !heeftInhoud(y); });
    if (leeg >= 0 && leeg < hi) hi = leeg;
    if (lo > hi) return hi;
    var p = plek == null ? lo : +plek;
    return Math.min(Math.max(p, lo), hi);
  }
  // v124 (review): een ruit kan bolletjes op meer tekeningen hebben
  // (fotos.js, ruitThuis). Elk bolletje gaat terug op de foto waar het stond,
  // als die er nog is (zelfde bestand); daarna staat de ruit in het blok van
  // de tekening met de meeste bolletjes (zoals naarBolletjes, in dezelfde
  // stap).
  function bollenVanRij(id) {
    var n = 0;
    (typeof fotos !== 'undefined' ? fotos : []).forEach(function (f) {
      (f.markeringen || []).forEach(function (m) { if (m && m.rijId === id) n++; });
    });
    return n;
  }
  function aantalVan(r) { var a = parseInt(r && r.aantal, 10); return a > 0 ? a : 1; }
  // Eén bolletje terug. metGrens: bij een ruit die al bestond niet meer
  // bolletjes dan zijn aantal (hij kan intussen opnieuw aangewezen zijn).
  function zetBol(f, m, uit, metGrens) {
    var r = m && rijen.find(function (y) { return y.id === m.rijId; });
    if (!r) { uit.bollenWeg++; return false; }
    var lijst = f.markeringen = Array.isArray(f.markeringen) ? f.markeringen : [];
    var sleutel = JSON.stringify(m);
    if (lijst.some(function (x) { return JSON.stringify(x) === sleutel; })) return false;
    if (metGrens && bollenVanRij(r.id) >= aantalVan(r)) { uit.bollenWeg++; return false; }
    lijst.push(kloon(m));
    return true;
  }
  // De ruit naar het blok van zijn tekening (fotos.js naarBolletjes); staat
  // hij daardoor in een ander blok, dan ook op een plek in dát blok.
  function naarThuis(r, na) {
    if (!r || !window.ruitThuis) return;
    var thuis = ruitThuis(r.id);
    if (!thuis || r.fotoId === thuis) return;
    r.fotoId = thuis;
    var i = rijen.indexOf(r);
    if (i >= 0) { rijen.splice(i, 1); rijen.splice(plekVoor(r, na, i), 0, r); }
  }
  function ruitenTerug(lijst, uit) {
    lijst.slice().sort(function (a, b) { return a.plek - b.plek; }).forEach(function (x) {
      var r = kloon(x.rij);
      if (!r || r.id == null || rijen.some(function (y) { return y.id === r.id; })) { uit.al++; return; }
      var hadFoto = !!r.fotoId;
      if (r.fotoId && !fotoVan(r.fotoId)) delete r.fotoId;
      rijen.splice(plekVoor(r, x.na, x.plek), 0, r);
      (x.bollen || []).forEach(function (b) {
        var g = fotoVan(b.f);
        if (!g || (b.pad || null) !== (g.pad || null)) { uit.bollenWeg++; return; }
        zetBol(g, b.m, uit, false);
      });
      naarThuis(r, x.na);
      if (hadFoto && !r.fotoId) uit.los++;
      uit.ruiten++;
    });
  }
  function nieuwFotoId() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  var TERUG = {
    ruiten: function (item, uit) { ruitenTerug(item.ruiten || [], uit); },
    groep: function (item, uit) {
      var f = kloon(item.foto);
      if (!f) return;
      if (fotoVan(f.id)) {
        // Al terug (↶ of een eerdere keer): alleen de ruiten nog.
        uit.al++;
      } else {
        var plek = Math.min(Math.max(0, item.plek | 0), fotos.length);
        f.markeringen = [];
        fotos.splice(plek, 0, f);
        uit.groep = f.id;
      }
      var doel = fotoVan(item.foto.id);
      // Ruiten die meegingen.
      ruitenTerug((item.ruiten || []).map(function (x) {
        var k = kloon(x); k.rij.fotoId = doel.id; return k;
      }), uit);
      // Ruiten die bleven staan (los): terug in de groep, als ze nog los staan.
      (item.los || []).forEach(function (id) {
        var r = rijen.find(function (y) { return y.id === id; });
        if (r && !r.fotoId) { r.fotoId = doel.id; uit.ruiten++; }
      });
      // De bolletjes van de foto, ook van ruiten die in een ander blok thuis
      // horen (v124: een ruit op meer tekeningen); niet meer dan hun aantal.
      var geraakt = {};
      (item.foto.markeringen || []).forEach(function (m) {
        if (zetBol(doel, m, uit, true)) geraakt[m.rijId] = true;
      });
      (item.los || []).forEach(function (id) { geraakt[id] = true; });
      rijen.forEach(function (r) { if (geraakt[r.id]) naarThuis(r, null); });
    },
    afbeelding: function (item, uit) {
      var oud = item.foto;
      var g = fotoVan(oud.id);
      if (g && !g.pad) {
        // De groep staat er nog zonder afbeelding: die terug, met de bolletjes
        // van de ruiten die nog in deze groep staan.
        ['pad', 'breedte', 'hoogte', 'origineel', 'bron', 'zoom'].forEach(function (k) {
          if (oud[k] !== undefined) g[k] = kloon(oud[k]);
        });
        if ((!g.inkt || !g.inkt.length) && oud.inkt) g.inkt = kloon(oud.inkt);
        // De bolletjes terug, ook van ruiten die elders thuis horen (v124),
        // niet meer dan hun aantal; daarna elke ruit in zijn blok.
        g.markeringen = [];
        var geraakt = {};
        (oud.markeringen || []).forEach(function (m) { if (zetBol(g, m, uit, true)) geraakt[m.rijId] = true; });
        rijen.forEach(function (r) { if (geraakt[r.id]) naarThuis(r, null); });
        uit.groep = g.id;
        return;
      }
      // De groep is weg of heeft intussen een andere afbeelding: als eigen
      // groep terug (zonder ruiten en bolletjes).
      var f = kloon(oud);
      f.id = g ? nieuwFotoId() : oud.id;
      f.markeringen = [];
      if (g) f.titel = (oud.titel || soort(oud)) + ' (teruggezet)';
      uit.bollenWeg += (oud.markeringen || []).length;
      fotos.push(f);
      uit.groep = f.id;
      uit.apart = true;
    },
    lever: function (item, uit) {
      if (window.leverFoto && leverFoto()) { uit.weiger = 'Er staat al een andere foto van de leverlocatie. Verwijder die eerst.'; return; }
      var f = kloon(item.foto);
      if (fotoVan(f.id)) f.id = nieuwFotoId();
      fotos.push(f);
      uit.lever = true;
    }
  };

  var bezig = false;
  window.glasVerwijderdTerug = async function (id) {
    if (bezig) return false;
    var item = lijst().find(function (x) { return x && x.id === id; });
    if (!item) return false;
    if (item.soort === 'taken') return takenTerug(item);
    // Alleen kijken, of besteld en niet ontgrendeld: dan niet.
    if (window.slotWeigert && slotWeigert()) return false;
    var label = 'Teruggezet: ' + item.wat;
    if (window.bewaarStap) bewaarStap(label);
    var uit = { ruiten: 0, al: 0, los: 0, bollenWeg: 0, groep: null, apart: false, lever: false, weiger: '' };
    (TERUG[item.soort] || function () { uit.weiger = 'Dit soort item kan deze versie niet terugzetten.'; })(item, uit);
    if (uit.weiger) {
      if (window.stapTerugnemen) stapTerugnemen(label);
      if (window.appMelding) appMelding(uit.weiger, { kop: 'Niet teruggezet', soort: 'letop' });
      return false;
    }
    weghalen(id);
    afronden();
    var extra = [];
    if (uit.al) extra.push(uit.al === 1 ? '1 onderdeel stond er al' : uit.al + ' onderdelen stonden er al');
    if (uit.los) extra.push((uit.los === 1 ? '1 ruit staat' : uit.los + ' ruiten staan') + ' bij de losse maten (de foto is er niet meer)');
    if (uit.bollenWeg) extra.push('niet alle bolletjes konden terug; wijs die ruiten opnieuw aan');
    if (uit.apart) extra.push('als eigen groep, zonder ruiten');
    // Na een bestelling (merken.js, teBestellen): een ruit die al bij de
    // leverancier geannuleerd is, komt niet stil opnieuw op de lijst; de
    // volgende bestellijst vraagt het (‹Oudere stand?›, pdf.js).
    try {
      var terugIds = {};
      (item.ruiten || []).forEach(function (x) { if (x.rij) terugIds[x.rij.id] = true; });
      var geann = window.wijzigingenSindsBestelling ? wijzigingenSindsBestelling().ouder.filter(function (o) {
        return o.geannuleerd && terugIds[o.rij.id];
      }) : [];
      if (geann.length) {
        extra.push(geann.map(function (o) { return labelRij(o.rij); }).join(', ') + ' was al geannuleerd bij de leverancier (' +
          geann[0].nr + 'e bestellijst); moet ' + (geann.length === 1 ? 'hij' : 'het') + ' er toch komen, kies bij de volgende ' +
          'bestellijst ‹Nee, toch zo bestellen›');
      }
    } catch (e) {}
    var dubbel = window.merkConflicten ? merkConflicten().length : 0;
    if (dubbel) extra.push('let op: een merkletter staat nu dubbel (rode balk, ‹Oplossen›)');
    if (window.kortBericht) kortBericht('Teruggezet: ' + item.wat + (extra.length ? ' — ' + extra.join('; ') : '') + '.',
      { soort: 'info', ms: 12000 });
    // Laten zien waar het staat.
    setTimeout(function () {
      var doel = uit.groep ? document.getElementById('blok-' + uit.groep)
        : uit.lever ? document.getElementById('leverFotoBlok')
        : (item.ruiten && item.ruiten[0]) ? document.getElementById('rij-' + item.ruiten[0].rij.id) : null;
      if (doel && doel.offsetParent && doel.scrollIntoView) doel.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
    return true;
  };

  function weghalen(id) {
    var i = info();
    if (!i) return;
    i[SLEUTEL] = lijst().filter(function (x) { return x && x.id !== id; });
    if (!i[SLEUTEL].length) delete i[SLEUTEL];
  }

  function afronden() {
    // Nummers recht (v120: wat uit een project komt, komt in de HTML), en
    // het volgende nummer nooit lager dan een teruggezette ruit (v120).
    if (window.glasVeiligeIds) { try { glasVeiligeIds(); } catch (e) {} }
    var hoogste = rijen.reduce(function (m, r) { return Math.max(m, +r.id || 0); }, 0);
    if (!(volgendId > hoogste)) volgendId = hoogste + 1;
    if (window.renderTabel) renderTabel();
    if (window.herbereken) herbereken();
    if (window.renderFotos) renderFotos();
    if (window.renderLeverFoto) renderLeverFoto();
    if (window.renderProject) renderProject();
    if (window.merkBalkBijwerken) merkBalkBijwerken();
    if (window.opslaan) opslaan();
    verwijderdTeller();
  }

  async function takenTerug(item) {
    if (window.kijkWeigert && kijkWeigert()) return false;
    if (!window.taakTerugzetten) return false;
    bezig = true;
    try {
      var goed = 0;
      for (var k = 0; k < item.taken.length; k++) {
        if (await taakTerugzetten(item.taken[k])) goed++;
      }
      if (!goed) return false;      // de fout staat al in beeld (project.js)
      weghalen(item.id);
      if (window.opslaan) opslaan();
      verwijderdTeller();
      if (window.kortBericht) kortBericht('Teruggezet: ' + item.wat + (goed < item.taken.length ? ' (niet allemaal gelukt)' : '') + '.',
        { soort: 'info', ms: 9000 });
      return true;
    } finally { bezig = false; }
  }

  /* ─── de knoppen en het venster ────────────────────────────── */

  // "🗑 Onlangs verwijderd (n)": op Invoer (alleen als er iets in staat) en
  // in Project info (altijd, zodat iedereen weet dat het er is).
  window.verwijderdTeller = function () {
    var n = zichtbaar().length;
    Array.prototype.forEach.call(document.querySelectorAll('.verwijderd-knop'), function (e) { e.textContent = '🗑 Onlangs verwijderd (' + n + ')'; });
    Array.prototype.forEach.call(document.querySelectorAll('.verwijderd-knop'), function (e) { e.hidden = !n; });
    var pi = document.getElementById('projectVerwijderdTekst');
    if (pi) pi.textContent = n
      ? (n === 1 ? '1 onderdeel' : n + ' onderdelen') + ' in de afgelopen ' + DAGEN + ' dagen weggegooid. Iedereen kan het terugzetten.'
      : 'Niets weggegooid in de afgelopen ' + DAGEN + ' dagen.';
    var piKnop = document.getElementById('projectVerwijderdKnop');
    if (piKnop) { piKnop.disabled = !n; piKnop.textContent = 'Bekijken en terugzetten (' + n + ')'; }
    var open = document.getElementById('verwijderdVenster');
    if (open) tekenLijst(open);
  };

  function wanneer(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var tijd = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === new Date().toDateString()) return 'vandaag ' + tijd;
    var gisteren = new Date(Date.now() - DAG_MS);
    if (d.toDateString() === gisteren.toDateString()) return 'gisteren ' + tijd;
    return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' + tijd;
  }
  function nogDagen(iso) {
    var rest = Math.ceil((tijdVan({ op: iso }) + DAGEN * DAG_MS - Date.now()) / DAG_MS);
    rest = Math.max(1, Math.min(DAGEN, rest));
    return 'nog ' + rest + (rest === 1 ? ' dag' : ' dagen');
  }
  function e(s) { return window.esc ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  function werkvloer() { try { return !!(window.glasWerkvloer && glasWerkvloer()); } catch (e) { return false; } }
  function waaromNiet(item) {
    // v124 (review): de werkvloer heeft geen ‹Toch bewerken› (rechten.js).
    if (werkvloer()) return 'Werkvloer';
    if (item.soort === 'taken') return window.glasAlleenKijken && glasAlleenKijken() ? 'Alleen kijken' : '';
    if (window.glasAlleenKijken && glasAlleenKijken()) return 'Alleen kijken';
    if (window.invoerOpSlot && invoerOpSlot()) return 'Besteld: eerst ontgrendelen';
    return '';
  }

  function tekenLijst(venster) {
    var l = zichtbaar().slice().reverse();     // nieuwste eerst
    var houder = venster.querySelector('.vw-lijst');
    if (!houder) return;
    if (!l.length) { houder.innerHTML = '<p class="vw-leeg">Niets weggegooid in de afgelopen ' + DAGEN + ' dagen.</p>'; return; }
    houder.innerHTML = l.map(function (x) {
      var niet = waaromNiet(x);
      return '<li class="vw-item">' +
        '<div class="vw-tekst"><b>' + e(x.wat) + '</b>' +
          '<span>' + (x.wie ? 'door ' + e(x.wie) + ' · ' : '') + e(wanneer(x.op)) + ' · ' + e(nogDagen(x.op)) + '</span></div>' +
        '<button type="button" class="btn btn-secondary btn-sm vrij-bij-slot vw-terug" data-id="' + e(x.id) + '"' +
          (niet ? ' disabled title="' + e(niet) + '"' : '') + '>↶ Terugzetten</button>' +
        '</li>';
    }).join('');
    var slot = venster.querySelector('.vw-slot');
    var reden = l.map(waaromNiet).filter(Boolean)[0] || '';
    if (slot) {
      slot.hidden = !reden;
      slot.textContent = reden === 'Werkvloer'
        ? 'Terugzetten kan alleen een collega of de beheerder.'
        : reden === 'Alleen kijken'
        ? 'Je kijkt alleen mee (dit project wordt op een ander apparaat of tabblad bewerkt). Terugzetten kan als je het project zelf bewerkt (‹Toch bewerken›).'
        : reden ? 'Dit project is besteld. Ruiten en foto\'s terugzetten kan pas na ‹Ontgrendelen› bovenaan Invoer.' : '';
    }
  }

  window.verwijderdOpenen = function () {
    var oud = document.getElementById('verwijderdVenster');
    if (oud) oud.remove();
    var laag = document.createElement('div');
    laag.className = 'melding-laag verwijderd-laag';
    laag.id = 'verwijderdVenster';
    laag.innerHTML =
      '<div class="melding-venster verwijderd-venster" role="dialog" aria-modal="true" aria-label="Onlangs verwijderd">' +
        '<h3>🗑 Onlangs verwijderd</h3>' +
        '<p class="vw-uitleg">Wat in dit project is weggegooid, blijft hier ' + DAGEN + ' dagen staan. ' +
          'Iedereen kan het terugzetten, op elk apparaat.</p>' +
        '<p class="vw-slot" hidden></p>' +
        '<ul class="vw-lijst"></ul>' +
        '<div class="melding-knoppen"><button type="button" class="btn btn-secondary vw-sluit">Sluiten</button></div>' +
      '</div>';
    var sluit = function () { if (laag.parentNode) laag.parentNode.removeChild(laag); };
    laag.addEventListener('click', function (ev) {
      if (ev.target === laag || (ev.target.closest && ev.target.closest('.vw-sluit'))) { sluit(); return; }
      var k = ev.target.closest && ev.target.closest('.vw-terug');
      if (!k || k.disabled) return;
      sluit();
      window.glasVerwijderdTerug(k.getAttribute('data-id'));
    });
    document.body.appendChild(laag);
    if (window.sluitKruis) sluitKruis(laag.querySelector('.verwijderd-venster'), sluit, 'Sluiten');
    tekenLijst(laag);
    var eerste = laag.querySelector('.vw-terug:not([disabled])') || laag.querySelector('.vw-sluit');
    if (eerste && !(window.glasMobiel && glasMobiel())) { try { eerste.focus(); } catch (er) {} }
  };

  document.addEventListener('DOMContentLoaded', function () { window.verwijderdTeller(); });
})();
