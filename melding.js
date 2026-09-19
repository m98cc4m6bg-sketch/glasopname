/* ═══════════════════════════════════════════════════════════════
   Glasopname – meldingen in de huisstijl

   Vervangt alert(), confirm() en prompt(). Die vensters komen van de
   browser: op een iPhone staat er "jelierbouw.github.io zegt", de
   knoppen heten OK en Annuleren wat je ook vraagt, ze zijn niet te
   lezen met de app-kleuren erbij, en in een app vanaf het beginscherm
   zien ze er ronduit slordig uit.

   Alles hier geeft een belofte (Promise) terug, dus een aanroep wordt:

       if (!await appVraag('Alles wissen?')) return;
       await appMelding('Dat is gelukt.');
       var naam = await appInvoer('Naam van het project');
       var wat = await appKeuze('Wat moet ermee gebeuren?', [...]);

   Waarom een belofte en geen terugroepfunctie: confirm() stond midden
   in de code en gaf meteen antwoord. Met await blijft die volgorde
   leesbaar en hoeft de rest van de functie niet uit elkaar getrokken
   te worden.

   Valt dit bestand weg, dan vangt een terugval in index.html het op met
   de vensters van de browser. Lelijk, maar niets breekt.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SOORTEN = {
    vraag:  { kleur: 'var(--merk)',  kop: 'Even bevestigen' },
    fout:   { kleur: 'var(--rood)',  kop: 'Er ging iets mis' },
    letop:  { kleur: '#b8860b',      kop: 'Let op' },
    info:   { kleur: 'var(--blauw)', kop: 'Melding' }
  };

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Meerdere regels blijven meerdere alinea's; een lege regel is een witregel.
  function alineas(tekst) {
    return String(tekst === null || tekst === undefined ? '' : tekst)
      .split('\n')
      .map(function (r) { return r.trim(); })
      .filter(function (r) { return r !== ''; })
      .map(function (r) { return '<p>' + esc(r) + '</p>'; })
      .join('');
  }

  /* ─── het venster ──────────────────────────────────────────── */
  // opties: { kop, soort, knoppen: [{tekst, waarde, soort, primair}],
  //           invoer: {waarde, plaatshouder}, annuleer: <waarde bij Escape> }
  function venster(tekst, opties) {
    var o = opties || {};
    var soort = SOORTEN[o.soort] || SOORTEN.info;
    var knoppen = o.knoppen || [{ tekst: 'Oké', waarde: true, primair: true }];

    return new Promise(function (klaar) {
      var laag = document.createElement('div');
      laag.className = 'melding-laag';
      laag.innerHTML =
        '<div class="melding-venster" role="alertdialog" aria-modal="true" ' +
             'aria-label="' + esc(o.kop || soort.kop) + '" style="border-top-color:' + soort.kleur + '">' +
          '<h3 style="color:' + soort.kleur + '">' + esc(o.kop || soort.kop) + '</h3>' +
          '<div class="melding-tekst">' + alineas(tekst) + '</div>' +
          (o.invoer ? '<input type="text" class="melding-invoer" ' +
             'value="' + esc(o.invoer.waarde || '') + '" ' +
             'placeholder="' + esc(o.invoer.plaatshouder || '') + '" ' +
             'autocomplete="off" autocapitalize="sentences" spellcheck="false">' : '') +
          '<div class="melding-knoppen"></div>' +
        '</div>';

      var venst = laag.querySelector('.melding-venster');
      var veld = laag.querySelector('.melding-invoer');
      var rij = laag.querySelector('.melding-knoppen');
      var af = false;
      var hoofdKnop = null;

      function sluit(waarde) {
        if (af) return;
        af = true;
        document.removeEventListener('keydown', toets, true);
        if (laag.parentNode) laag.parentNode.removeChild(laag);
        klaar(waarde);
      }

      knoppen.forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + (k.soort || (k.primair ? 'btn-primary' : 'btn-secondary'));
        b.textContent = k.tekst;
        b.onclick = function () {
          // Bij een invoerveld geeft de hoofdknop terug wat er getypt is.
          sluit(k.primair && veld ? veld.value : k.waarde);
        };
        if (k.primair) hoofdKnop = b;
        rij.appendChild(b);
      });

      function toets(e) {
        if (e.key === 'Escape') { e.preventDefault(); sluit(o.annuleer); }
        // Enter in een invoerveld is hetzelfde als op de hoofdknop tikken.
        if (e.key === 'Enter' && veld && document.activeElement === veld) {
          e.preventDefault();
          sluit(veld.value);
        }
      }
      document.addEventListener('keydown', toets, true);

      // Naast het venster tikken telt als annuleren.
      laag.addEventListener('pointerdown', function (e) {
        if (e.target === laag) sluit(o.annuleer);
      });

      document.body.appendChild(laag);
      // Aandacht naar het invoerveld, anders naar de hoofdknop: op een
      // telefoon komt het toetsenbord dan meteen op.
      var eerst = veld || hoofdKnop || venst.querySelector('.btn');
      if (eerst) {
        try { eerst.focus(); } catch (err) {}
        if (veld && veld.setSelectionRange) {
          try { veld.setSelectionRange(veld.value.length, veld.value.length); } catch (err) {}
        }
      }
    });
  }

  /* ─── de vier vormen ───────────────────────────────────────── */

  // Iets meedelen. Eén knop.
  window.appMelding = function (tekst, opties) {
    var o = opties || {};
    return venster(tekst, {
      kop: o.kop,
      soort: o.soort || 'info',
      annuleer: true,
      knoppen: [{ tekst: o.knop || 'Oké', waarde: true, primair: true }]
    });
  };

  // Een fout melden. Zelfde venster, rode rand.
  window.appFout = function (tekst, opties) {
    var o = opties || {};
    return window.appMelding(tekst, { kop: o.kop, soort: 'fout', knop: o.knop });
  };

  // Ja of nee. Geeft true of false.
  window.appVraag = function (tekst, opties) {
    var o = opties || {};
    return venster(tekst, {
      kop: o.kop,
      soort: o.soort || 'vraag',
      annuleer: false,
      knoppen: [
        { tekst: o.nee || 'Annuleren', waarde: false },
        { tekst: o.ja || 'Doorgaan', waarde: true, primair: true,
          soort: o.gevaarlijk ? 'btn-danger' : 'btn-primary' }
      ]
    });
  };

  // Iets laten intypen. Geeft de tekst, of null bij annuleren.
  window.appInvoer = function (tekst, opties) {
    var o = opties || {};
    return venster(tekst, {
      kop: o.kop,
      soort: o.soort || 'vraag',
      annuleer: null,
      invoer: { waarde: o.waarde || '', plaatshouder: o.plaatshouder || '' },
      knoppen: [
        { tekst: o.nee || 'Annuleren', waarde: null },
        { tekst: o.ja || 'Opslaan', primair: true }
      ]
    });
  };

  // Meer dan twee antwoorden. knoppen: [{tekst, waarde, soort, primair}]
  window.appKeuze = function (tekst, knoppen, opties) {
    var o = opties || {};
    return venster(tekst, {
      kop: o.kop,
      soort: o.soort || 'vraag',
      annuleer: o.annuleer === undefined ? null : o.annuleer,
      knoppen: knoppen
    });
  };

  window.appMeldingBezig = function () {
    return !!document.querySelector('.melding-laag');
  };
})();
