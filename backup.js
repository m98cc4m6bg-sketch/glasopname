/* ═══════════════════════════════════════════════════════════════
   Glasopname – handmatige back-up (v120, keuze Jan: "nu een knop voor
   handmatig, tijdelijk, en voorbereiden voor een back-up in OneDrive")

   Eén zip-bestand met alles wat er in de database staat:
     projecten.json   alle projecten (ook die in de prullenbak), met alle
                      ruiten, foto-verwijzingen, bestellingen en toebehoren
     taken.json       alle taken
     gebruikers.json  wie er met de app werkt (naam, mail, actief)
     app_data.json    de gedeelde lijsten (keuzelijsten e.d.)
     fotos/…          (als je dat kiest) alle foto's en tekeningen uit de
                      opslag, in dezelfde mappen als daar (per project)
     LEESMIJ.txt      wat erin zit en hoe je het terugzet

   Het logboek gaat niet mee (dat zijn oude kopieën van de projecten; de
   huidige stand staat in projecten.json).

   Waarom in de app en niet op de server: een automatische back-up op de
   server (bijv. naar OneDrive) heeft een sleutel nodig die alles mag, en
   die hoort niet in deze openbare repository. Zie BEHEER.md, "Back-up".
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var JSZIP_URL = 'lib/jszip-3.10.1/jszip.min.js';
  var BUCKET = 'projectfotos';
  var LAATSTE = 'glasopname_laatste_backup';
  var bezigMet = false;

  function laadJsZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise(function (ok, fout) {
      var s = document.createElement('script');
      s.src = JSZIP_URL;
      s.onload = function () { ok(window.JSZip); };
      s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); fout(new Error('kon de zip-bibliotheek niet laden')); };
      document.head.appendChild(s);
    });
  }

  function tweeCijfers(n) { return String(n).padStart(2, '0'); }
  function stempel(d) {
    return d.getFullYear() + '-' + tweeCijfers(d.getMonth() + 1) + '-' + tweeCijfers(d.getDate()) +
      '_' + tweeCijfers(d.getHours()) + tweeCijfers(d.getMinutes());
  }
  function voortgang(tekst) { if (window.kortBericht) kortBericht(tekst, { soort: 'info', ms: 600000 }); }

  // Alle rijen van een tabel, per 200 (Supabase geeft er niet meer in één keer).
  async function alles(sb, tabel, kolommen, sorteer) {
    var uit = [];
    for (var van = 0; van < 100000; van += 200) {
      var q = sb.from(tabel).select(kolommen || '*');
      if (sorteer) q = q.order(sorteer, { ascending: true });
      var res = await q.range(van, van + 199);
      if (res && res.error) {
        // Een tabel die (nog) niet bestaat, slaan we over en noemen we.
        if (/42P01|PGRST205|does not exist/.test(String(res.error.code || '') + ' ' + String(res.error.message || ''))) return null;
        throw new Error(tabel + ': ' + (res.error.message || res.error.code));
      }
      var d = (res && res.data) || [];
      uit = uit.concat(d);
      if (d.length < 200) break;
    }
    return uit;
  }

  // Alle bestanden in de opslag onder één map (met submappen, zoals
  // <project>/origineel/). Zelfde aanpak als het opruimen in cloud.js.
  async function bestandenIn(sb, map, diepte) {
    var uit = [];
    for (var ronde = 0; ronde < 40; ronde++) {
      var res = await sb.storage.from(BUCKET).list(map, { limit: 500, offset: ronde * 500 });
      if (res.error || !res.data || !res.data.length) break;
      for (var i = 0; i < res.data.length; i++) {
        var f = res.data[i];
        if (!f || !f.name) continue;
        if (f.id === null) { if ((diepte || 0) < 3) uit = uit.concat(await bestandenIn(sb, map + '/' + f.name, (diepte || 0) + 1)); }
        else uit.push(map + '/' + f.name);
      }
      if (res.data.length < 500) break;
    }
    return uit;
  }

  window.glasLaatsteBackup = function () {
    try { return localStorage.getItem(LAATSTE) || ''; } catch (e) { return ''; }
  };

  window.glasBackup = async function () {
    if (bezigMet) return;
    var sb = window.glasSupabase || null;
    if (!sb) {
      await appMelding('Voor een back-up moet je ingelogd zijn en bereik hebben.', { kop: 'Back-up', soort: 'letop' });
      return;
    }
    var laatste = window.glasLaatsteBackup();
    var keus = await appKeuze('Een back-up van álle projecten, taken en gebruikers in één zip-bestand, voor je eigen archief ' +
      '(bijv. in OneDrive zetten).' + (laatste ? '\n\nVorige back-up op dit apparaat: ' + laatste.replace('_', ' om ') + '.' : '') +
      '\n\nMet foto\'s wordt het bestand groot (alle foto\'s en originelen) en duurt het langer; doe dat op wifi.',
      [{ tekst: 'Stoppen', waarde: null },
       { tekst: 'Alleen gegevens', waarde: 'gegevens' },
       { tekst: 'Met foto\'s', waarde: 'fotos', primair: true }],
      { kop: '💾 Back-up maken' });
    if (!keus) return;
    bezigMet = true;
    var nu = new Date();
    var naam = 'Glasopname-backup_' + stempel(nu) + (keus === 'fotos' ? '_met-fotos' : '') + '.zip';
    try {
      voortgang('Back-up: projecten ophalen…');
      var JSZip = await laadJsZip();
      var zip = new JSZip();
      var projecten = await alles(sb, 'projecten', '*', 'created_at');
      voortgang('Back-up: ' + projecten.length + ' projecten; taken en gebruikers ophalen…');
      var taken = await alles(sb, 'taken', '*', null);
      var gebruikers = await alles(sb, 'gebruikers', '*', null);
      var appData = await alles(sb, 'app_data', '*', null);
      zip.file('projecten.json', JSON.stringify(projecten, null, 1));
      if (taken) zip.file('taken.json', JSON.stringify(taken, null, 1));
      if (gebruikers) zip.file('gebruikers.json', JSON.stringify(gebruikers, null, 1));
      if (appData) zip.file('app_data.json', JSON.stringify(appData, null, 1));

      var fotoTeller = 0, fotoMis = [];
      if (keus === 'fotos') {
        var paden = [];
        for (var i = 0; i < projecten.length; i++) {
          voortgang('Back-up: foto\'s zoeken (' + (i + 1) + ' van ' + projecten.length + ' projecten)…');
          paden = paden.concat(await bestandenIn(sb, projecten[i].id, 0));
        }
        // Vier tegelijk ophalen: sneller, zonder de verbinding dicht te trekken.
        var volgende = 0;
        var werker = async function () {
          while (volgende < paden.length) {
            var pad = paden[volgende++];
            try {
              var r = await sb.storage.from(BUCKET).download(pad);
              if (r.error || !r.data) throw r.error || new Error('leeg');
              zip.file('fotos/' + pad, r.data, { binary: true, compression: 'STORE' });
              fotoTeller++;
            } catch (e) { fotoMis.push(pad); }
            if ((fotoTeller + fotoMis.length) % 5 === 0) voortgang('Back-up: foto\'s ophalen (' + (fotoTeller + fotoMis.length) + ' van ' + paden.length + ')…');
          }
        };
        await Promise.all([werker(), werker(), werker(), werker()]);
      }

      zip.file('LEESMIJ.txt', [
        'Back-up Glasopname, gemaakt op ' + nu.toLocaleString('nl-NL') + ' door ' + ((window.glasGebruiker && glasGebruiker().naam) || '?') + '.',
        '',
        'projecten.json   ' + projecten.length + ' projecten (ook die in de prullenbak), met alle ruiten, bestellingen en toebehoren.',
        'taken.json       ' + (taken ? taken.length + ' taken' : 'niet gevonden'),
        'gebruikers.json  ' + (gebruikers ? gebruikers.length + ' gebruikers' : 'niet gevonden'),
        'app_data.json    ' + (appData ? appData.length + ' gedeelde lijsten' : 'niet gevonden'),
        keus === 'fotos' ? 'fotos/           ' + fotoTeller + ' bestanden, per project (map = het nummer van het project)' +
          (fotoMis.length ? '; NIET gelukt: ' + fotoMis.length + ' (' + fotoMis.slice(0, 20).join(', ') + (fotoMis.length > 20 ? ' …' : '') + ')' : '')
          : 'fotos/           niet meegenomen (gekozen: alleen gegevens)',
        '',
        'Terugzetten: zie BEHEER.md in de repo, "Back-up terugzetten". Kort: een project staat in',
        'projecten.json als één regel; de kolom data is het hele project. Die gaat met de SQL Editor',
        'van Supabase terug in de tabel projecten. Foto\'s gaan terug in Storage, map projectfotos,',
        'onder dezelfde naam.'
      ].join('\r\n'));

      voortgang('Back-up: zip-bestand maken…');
      var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      var hoe = window.bestandAfleveren ? await bestandAfleveren(blob, naam) : null;
      if (hoe === 'afgebroken') { voortgang('Back-up niet bewaard (afgebroken).'); return; }
      try { localStorage.setItem(LAATSTE, stempel(nu)); } catch (e) {}
      if (window.glasSpoorNotitie) { try { glasSpoorNotitie('back-up gemaakt (' + projecten.length + ' projecten' + (keus === 'fotos' ? ', ' + fotoTeller + ' foto\'s' : '') + ')'); } catch (e) {} }
      if (window.kortBericht) kortBericht('Back-up klaar: ' + naam + ' (' + (blob.size / 1048576).toFixed(1).replace('.', ',') + ' MB). Zet hem in OneDrive.', { soort: 'info', ms: 15000 });
      if (fotoMis.length) {
        await appMelding(fotoMis.length + ' foto(\'s) konden niet worden opgehaald; ze staan in LEESMIJ.txt in de zip. Maak de back-up later nog eens.',
          { kop: 'Back-up niet compleet', soort: 'letop' });
      }
      if (window.glasBackupKnop) glasBackupKnop();
    } catch (e) {
      if (window.kortBericht) kortBericht('Back-up mislukt: ' + (e && e.message || e), { soort: 'fout', ms: 15000 });
    } finally {
      bezigMet = false;
    }
  };

  // De knop op het startscherm: valt op als er op dit apparaat nog nooit
  // (of meer dan 30 dagen geleden) een back-up is gemaakt.
  window.glasBackupKnop = function () {
    var k = document.getElementById('startBackup');
    if (!k) return;
    var l = window.glasLaatsteBackup();
    var oud = true;
    if (l) {
      var d = new Date(l.slice(0, 10) + 'T12:00:00');
      oud = !(d.getTime() > Date.now() - 30 * 864e5);
    }
    k.textContent = oud ? '💾 Back-up maken' : '💾';
    k.title = l ? 'Laatste back-up op dit apparaat: ' + l.replace('_', ' om ') : 'Nog geen back-up gemaakt op dit apparaat';
  };
})();
