/* ═══════════════════════════════════════════════════════════════
   Glasopname – originele foto's exporteren (v93)

   Sinds v93 bewaart de app bij elke foto en bij de foto van de
   leverlocatie ook het bestand zoals het van de camera of uit de
   fotobibliotheek kwam (fotos.js, bewaarOrigineel). Hier gaan ze samen
   in één zip-bestand, voor het eigen archief.

   Per foto komt het origineel erin. Een foto van vóór v93 heeft geen
   origineel; dan gaat de verkleinde versie erin, met '(verkleind)' in de
   naam, zodat het archief toch compleet is. Tekeningen komen uit een pdf
   en hebben geen origineel; die staan al in de pdf invoer en blijven hier
   buiten.

   De bestanden worden opgehaald via fotoBlob(): uit de wachtrij op dit
   apparaat als ze nog niet geüpload zijn, anders uit de cloud.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var JSZIP_URL = 'lib/jszip-3.10.1/jszip.min.js';
  var laden = null;

  function laadJsZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (laden) return laden;
    laden = new Promise(function (ok, fout) {
      var s = document.createElement('script');
      s.src = JSZIP_URL;
      s.onload = function () { ok(window.JSZip); };
      s.onerror = function () {
        laden = null;
        if (s.parentNode) s.parentNode.removeChild(s);
        fout(new Error('kon de zip-bibliotheek niet laden — probeer het nog eens'));
      };
      document.head.appendChild(s);
    });
    return laden;
  }

  function bezig(tekst) {
    var s = document.getElementById('statusBar');
    if (s) s.textContent = tekst || '';
  }

  // Tekens die Windows, macOS of iOS niet in een bestandsnaam wil.
  function veiligeNaam(t, max) {
    var n = String(t || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
    n = n.replace(/^\.+/, '');
    return n.slice(0, max || 80).trim();
  }

  function extensie(pad, standaard) {
    var m = /\.([a-z0-9]{2,5})$/i.exec(String(pad || ''));
    return m ? m[1].toLowerCase() : (standaard || 'jpg');
  }

  function vandaag() {
    var d = new Date();
    return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + d.getFullYear();
  }

  function isAanraakapparaat() { return (navigator.maxTouchPoints || 0) > 1; }

  // Zelfde volgorde als pdf.js: op een computer met Chrome of Edge eerst
  // het opslagvenster (moet direct na de klik), op een tablet of telefoon
  // het deelvenster, anders een gewone download.
  function bestandVragen(naam) {
    if (!window.showSaveFilePicker || isAanraakapparaat()) return Promise.resolve(null);
    return window.showSaveFilePicker({
      suggestedName: naam,
      types: [{ description: 'Zip-bestand', accept: { 'application/zip': ['.zip'] } }]
    }).then(function (h) { return { handvat: h }; }).catch(function (e) {
      if (e && (e.name === 'AbortError' || /abort|cancel/i.test(e.message || ''))) return { afgebroken: true };
      console.warn('[originelen] opslagvenster niet beschikbaar', e);
      return null;
    });
  }

  function downloaden(blob, naam) {
    var a = document.createElement('a');
    var u = URL.createObjectURL(blob);
    a.href = u;
    a.download = naam;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 60000);
  }

  function afleveren(blob, naam, keuze) {
    if (keuze && keuze.handvat) {
      return keuze.handvat.createWritable().then(function (w) {
        return w.write(blob).then(function () { return w.close(); });
      }).catch(function (e) {
        console.warn('[originelen] opslaan in de gekozen map mislukt, dan maar downloaden', e);
        downloaden(blob, naam);
      });
    }
    if (isAanraakapparaat()) {
      try {
        var bestand = new File([blob], naam, { type: 'application/zip' });
        if (navigator.canShare && navigator.canShare({ files: [bestand] })) {
          return navigator.share({ files: [bestand], title: naam }).catch(function (e) {
            if (e && (e.name === 'AbortError' || /abort|cancel/i.test(e.message || ''))) return;
            console.warn('[originelen] delen mislukt, dan maar downloaden', e);
            downloaden(blob, naam);
          });
        }
      } catch (e) {}
    }
    downloaden(blob, naam);
    return Promise.resolve();
  }

  // Wat er in de zip komt, op volgorde van het scherm.
  function teExporteren() {
    var lijst = (typeof fotos === 'undefined' ? [] : fotos) || [];
    var werk = lijst.filter(function (f) { return f && f.soort !== 'lever'; });
    var uit = [];
    werk.forEach(function (f, i) {
      if (!f.pad || f.bron === 'tekening') return;
      var soort = window.soortNaam ? soortNaam(f, true) : 'Foto';
      uit.push({ foto: f, basis: String(i + 1).padStart(2, '0') + ' ' + (veiligeNaam(f.titel) || soort + ' ' + (i + 1)) });
    });
    var lever = lijst.find(function (f) { return f && f.soort === 'lever' && f.pad; });
    if (lever) uit.push({ foto: lever, basis: 'Leverlocatie' });
    return uit;
  }

  window.exportOriginelen = function () {
    var project = (document.getElementById('projectNaam') || {}).value || 'project';
    var zipNaam = veiligeNaam(project, 60) + ' - Originele fotos - ' + vandaag() + '.zip';
    var lijst = teExporteren();
    if (!lijst.length) {
      appMelding('Er staan geen foto\'s in dit project (tekeningen tellen hier niet mee; die staan in de pdf invoer).',
                 { kop: 'Niets te exporteren', soort: 'letop' });
      return Promise.resolve(null);
    }
    // Het opslagvenster meteen, vóór er iets geladen wordt: daarna heeft de
    // browser de toestemming van de klik alweer ingetrokken.
    var keuzeBelofte = bestandVragen(zipNaam);

    var geenOrigineel = 0, origineelWeg = [], ontbreekt = [], namen = {};
    var overzicht = ['Glasopname — originele foto\'s', 'Project: ' + project,
                     'Geëxporteerd: ' + new Date().toLocaleString('nl-NL'), ''];

    function uniek(n) {
      var basis = n, i = 2;
      while (namen[n.toLowerCase()]) { n = basis.replace(/(\.[a-z0-9]+)$/i, ' (' + i + ')$1'); i++; }
      namen[n.toLowerCase()] = true;
      return n;
    }

    return keuzeBelofte.then(function (keuze) {
      if (keuze && keuze.afgebroken) return null;
      bezig('Originele foto\'s verzamelen…');
      return laadJsZip().then(function (JSZip) {
        var zip = new JSZip();
        return lijst.reduce(function (keten, item, nr) {
          return keten.then(function () {
            bezig('Originele foto\'s verzamelen… (' + (nr + 1) + ' van ' + lijst.length + ')');
            var f = item.foto, o = f.origineel;
            var poging = o && o.pad ? window.fotoBlob(o.pad).catch(function () { return null; }) : Promise.resolve(null);
            return poging.then(function (blob) {
              if (blob) {
                var naam = uniek(item.basis + '.' + extensie(o.pad));
                zip.file(naam, blob, { date: o.datum ? new Date(o.datum) : new Date() });
                overzicht.push(naam + '  ←  ' + (o.naam || '(naam onbekend)') +
                               (o.grootte ? ', ' + Math.round(o.grootte / 1024) + ' kB' : ''));
                return;
              }
              // Geen origineel (foto van vóór v93), of het origineel is niet op
              // te halen: dan de verkleinde versie, met dat in de naam.
              return window.fotoBlob(f.pad).catch(function () { return null; }).then(function (klein) {
                if (!klein) { ontbreekt.push(item.basis); return; }
                if (o && o.pad) origineelWeg.push(item.basis); else geenOrigineel++;
                var naam = uniek(item.basis + ' (verkleind).jpg');
                zip.file(naam, klein);
                overzicht.push(naam + '  ←  ' + (o && o.pad ? 'origineel niet op te halen' : 'geen origineel bewaard (foto van vóór v93)'));
              });
            });
          });
        }, Promise.resolve()).then(function () {
          if (!Object.keys(namen).length) {
            bezig('');
            appFout('Geen enkele foto kon opgehaald worden. Ben je offline?', { kop: 'Originele foto\'s' });
            return null;
          }
          zip.file('overzicht.txt', overzicht.join('\r\n') + '\r\n');
          bezig('Zip-bestand maken…');
          // Foto's zijn al gecomprimeerd; nog eens inpakken kost alleen tijd.
          return zip.generateAsync({ type: 'blob', compression: 'STORE', mimeType: 'application/zip' });
        });
      }).then(function (blob) {
        if (!blob) return null;
        bezig('');
        return afleveren(blob, zipNaam, keuze).then(function () {
          if (ontbreekt.length || origineelWeg.length || geenOrigineel) {
            var regels = [];
            if (geenOrigineel) regels.push(geenOrigineel + ' foto(\'s) zijn van vóór v93 en hebben geen origineel; ' +
                                           'daarvan staat de verkleinde versie in de zip, met "(verkleind)" in de naam.');
            if (origineelWeg.length) regels.push('Van ' + origineelWeg.join(', ') + ' kon het origineel niet ' +
                                                 'opgehaald worden; de verkleinde versie staat erin. Wacht het origineel ' +
                                                 'nog op een ander apparaat, of ben je offline?');
            if (ontbreekt.length) regels.push('Helemaal niet gelukt: ' + ontbreekt.join(', ') +
                                              '. Staan die nog op een ander apparaat te wachten, of ben je offline?');
            appMelding(regels.join('\n\n'), { kop: 'Originele foto\'s', soort: 'letop' });
          }
          return blob;
        });
      });
    }).catch(function (e) {
      bezig('');
      console.error('[originelen]', e);
      appFout('Exporteren mislukt: ' + ((e && e.message) || e), { kop: 'Originele foto\'s' });
      return null;
    });
  };
})();
