/* ═══════════════════════════════════════════════════════════════
   Glasopname – cloudlaag
   Voegt aan het bestaande formulier toe:
     • inloggen (e-mail + wachtwoord)
     • projecten opslaan in Supabase, gedeeld met het hele team
     • offline doorwerken: alles blijft lokaal staan en gaat
       vanzelf omhoog zodra er weer verbinding is
     • keuzelijsten (DATA) uit de database i.p.v. uit dit bestand
   Deze file gaat NA het hoofdscript in index.html.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var LS_STATE   = 'glasopname_v2';        // lokale kopie huidige opname
  var LS_PROJECT = 'glasopname_project';   // id van geopend project
  var LS_DATA    = 'glasopname_glasdata';  // gecachete keuzelijsten
  var LS_PENDING = 'glasopname_pending';   // wacht op verbinding (true/false)

  var cfg      = window.GLASOPNAME_CONFIG || {};
  var sb       = null;
  var gebruiker = null;
  var projectId = localStorage.getItem(LS_PROJECT) || null;
  window.glasProjectId = projectId;
  var vuil      = false;   // er zijn wijzigingen die nog niet omhoog zijn
  var laatsteJson = null;  // stand zoals die het laatst is weggeschreven
  var bezig     = false;
  var origOpslaan   = window.opslaan;
  var origClearAlles = window.clearAlles;

  /* ─── kleine helpers ───────────────────────────────────────── */

  function el(id) { return document.getElementById(id); }
  function waarde(id) { var e = el(id); return e ? e.value : ''; }

  function huidigeStaat() {
    return {
      rijen: rijen,
      volgendId: volgendId,
      fotos: fotos,
      info: projectInfo,
      taken: projectTaken,
      project: waarde('projectNaam'),
      datum: waarde('projectDatum'),
      speling: waarde('spelingGlobal'),
      bijtelling: waarde('bijtelling') || '11'
    };
  }

  function zetStaat(state) {
    rijen = state.rijen || [];
    // Projecten van vóór v63 dragen nog waarden uit de oude keuzelijst
    // Glasbewerking. Omzetten moet hier gebeuren en niet alleen bij het
    // laden van de lokale kopie, anders blijft elk project dat uit de
    // cloud komt op de oude waarden staan.
    if (window.bewerkingBijwerken) bewerkingBijwerken(rijen);
    volgendId = state.volgendId || (rijen.length + 1);
    fotos = state.fotos || [];
    projectInfo = state.info || {};
    vulOpnemer();
    projectTaken = state.taken || [];
    if (el('projectNaam'))   el('projectNaam').value   = state.project || '';
    if (el('projectDatum'))  el('projectDatum').value  = state.datum || '';
    // Altijd zetten, ook als het project ze niet bewaard heeft. Stond er
    // eerder een controle op state.speling, dan hield het formulier de
    // waarde van het vórige project en rekende de app dit project met een
    // andere speling door — zonder enige melding (v83).
    if (el('spelingGlobal')) el('spelingGlobal').value = state.speling || '4';
    if (el('bijtelling'))    el('bijtelling').value    = state.bijtelling || '11';
    // Ruiten die naar een groep wijzen die niet in dit project zit weer
    // losmaken; anders zijn ze nergens op het scherm te zien.
    if (window.verweesdeRijenLosmaken) {
      var losgemaakt = verweesdeRijenLosmaken();
      if (losgemaakt && window.appMelding) {
        appMelding(losgemaakt + (losgemaakt === 1 ? ' ruit hoorde' : ' ruiten hoorden') +
          ' bij een foto die niet in dit project staat. ' +
          (losgemaakt === 1 ? 'Hij staat' : 'Ze staan') + ' nu bij "Zonder foto of tekening".',
          { kop: 'Ruiten teruggezet', soort: 'letop' });
      }
    }
    if (rijen.length === 0) voegRijenToe(typeof START_REGELS !== 'undefined' ? START_REGELS : 5);
    renderTabel();
    herbereken();
    if (window.renderFotos) renderFotos();
    if (window.renderProject) renderProject();
    // Meldingen die bij de vórige inhoud hoorden opruimen.
    if (window.merkOpnieuwBeoordelen) merkOpnieuwBeoordelen();
    toonNaamWaarschuwing('');
    toonMelding('');
  }

  // 'Opgenomen door' invullen met de naam waarmee je bent ingelogd: alles
  // vóór de @ uit het e-mailadres, dus jan@jelierbouw.nl wordt 'jan'.
  // Alleen als het veld nog leeg is — anders zou je de collega overschrijven
  // die de opname werkelijk gedaan heeft zodra jij zijn project opent.
  // Het veld blijft gewoon met de hand aan te passen.
  function gebruikersNaam() {
    if (!gebruiker || !gebruiker.email) return '';
    return String(gebruiker.email).split('@')[0].trim();
  }

  function vulOpnemer() {
    if (String(projectInfo.opnemer || '').trim()) return;
    var naam = gebruikersNaam();
    if (naam) projectInfo.opnemer = naam;
  }

  // 'Ingelogd als …' in de kopbalk. Handig op een gedeeld apparaat: je ziet
  // met wiens account je aan het inmeten bent zonder een menu te openen.
  function toonGebruiker() {
    var vak = el('ingelogdAls');
    if (!vak) return;
    var naam = gebruikersNaam();
    if (!naam) { vak.hidden = true; vak.innerHTML = ''; return; }
    vak.hidden = false;
    vak.innerHTML = 'Ingelogd als <b></b>';
    vak.querySelector('b').textContent = naam;
    vak.title = gebruiker.email;
  }

  // Wat de projectlijst moet tonen bewaren we apart, zodat die lijst niet
  // de volledige inhoud van elk project hoeft op te halen.
  function adresVan(state) {
    var i = (state && state.info) || {};
    var plaats = [i.postcode, i.plaats].filter(Boolean).join(' ').trim();
    return [i.straat, plaats].filter(Boolean).join(', ');
  }

  function openTaken(state) {
    var t = (state && state.taken) || [];
    return t.filter(function (x) { return !x.klaar; }).length;
  }

  function ingevuldeRijen(state) {
    return (state.rijen || []).filter(function (r) {
      return r.glasType || r.breedte || r.hoogte;
    }).length;
  }

  /* ─── statusbalkje rechtsboven ─────────────────────────────── */

  // Met een gekleurde achtergrond moet de tekst mee veranderen, anders
  // blijft het lichtgrijs op groen staan en is het onleesbaar.
  function status(tekst, kleur) {
    var s = el('cloudStatus');
    if (!s) return;
    s.textContent = tekst;
    if (kleur) {
      s.style.background = kleur;
      s.style.color = '#ffffff';
      s.style.borderColor = kleur;
      s.style.fontWeight = '600';
    } else {
      s.style.background = '';
      s.style.color = '';
      s.style.borderColor = '';
      s.style.fontWeight = '';
    }
  }

  function statusOpgeslagen() {
    var t = new Date();
    status('✓ Opgeslagen ' + String(t.getHours()).padStart(2, '0') + ':' +
           String(t.getMinutes()).padStart(2, '0'), '#1a6b3c');
  }

  /* ─── opslaan: lokaal altijd, cloud zodra het kan ──────────── */

  function opslaanLokaal() {
    try { localStorage.setItem(LS_STATE, JSON.stringify(huidigeStaat())); } catch (e) {}
  }

  window.opslaan = function () {
    // De app roept dit ook elke tien seconden vanzelf aan. Is er niets
    // veranderd, dan hoeft er niets te gebeuren: anders knippert het
    // statuspilletje elke tien seconden en verspringt de pagina.
    var nu = JSON.stringify(huidigeStaat());
    if (nu === laatsteJson && !vuil) return;
    laatsteJson = nu;
    opslaanLokaal();
    vuil = true;
    localStorage.setItem(LS_PENDING, '1');
    plan();
  };

  window.clearAlles = function () {
    // Eerst de bevestiging afwachten. Zonder await werd er opgeslagen
    // vóórdat er gewist was, en kwam de oude opname bij de volgende start
    // gewoon weer terug (v83).
    return Promise.resolve(origClearAlles()).then(function (gewist) {
      if (gewist === false) return;
      window.opslaan();
    });
  };

  var timer = null;
  var wachtKlok = null;
  function plan() {
    clearTimeout(timer);
    timer = setTimeout(synchroniseer, 1200);
  }

  // Gaat er een stand omhoog waarin ruiten naar een foto wijzen die er
  // niet is, dan klopt de stand niet en zou het verzenden ervan de goede
  // gegevens in de database overschrijven. Dat is precies wat er in
  // september 2026 bij één project gebeurd is (v83).
  function standDeugt(state) {
    if (!state || !Array.isArray(state.rijen)) return false;
    var ids = {};
    (Array.isArray(state.fotos) ? state.fotos : []).forEach(function (f) { if (f) ids[f.id] = true; });
    return !state.rijen.some(function (r) { return r && r.fotoId && !ids[r.fotoId]; });
  }

  var standGemeld = false;
  // Naar buiten voor test-herstel.js; verder gebruikt niemand dit.
  window.standDeugt = standDeugt;

  function synchroniseer() {
    if (!sb || !gebruiker || !projectId || !vuil || bezig) return;
    if (!navigator.onLine) { status('⚠ Offline — lokaal', '#a3231a'); return; }
    if (!standDeugt(huidigeStaat())) {
      status('⚠ Niet verstuurd — zie melding', '#a3231a');
      if (!standGemeld && window.appFout) {
        standGemeld = true;
        appFout('Er staan ruiten in deze opname die bij een foto horen die niet in het project zit. ' +
                'Om te voorkomen dat er werk overschreven wordt, is er niets naar de server gestuurd. ' +
                'Ververs de pagina (knop ↻ Bijwerken); de ruiten komen dan terug bij "Zonder foto of tekening".',
                { kop: 'Opname niet verstuurd' });
      }
      return;
    }
    standGemeld = false;
    bezig = true;
    // Een verzoek dat nooit antwoordt liet `bezig` voor altijd aan staan;
    // daarna werd er de hele dag niets meer opgeslagen, met "… Opslaan"
    // in beeld (v83). Na 30 seconden geven we het op en proberen opnieuw.
    clearTimeout(wachtKlok);
    wachtKlok = setTimeout(function () {
      if (!bezig) return;
      bezig = false;
      status('⚠ Niet opgeslagen — geen antwoord', '#a3231a');
      setTimeout(plan, 5000);
    }, 30000);
    status('… Opslaan');
    // Een vaste kopie van wat er nu omhoog gaat. huidigeStaat() geeft de
    // levende lijsten terug; typ je door terwijl het opslaan onderweg is,
    // dan veranderen die mee en klopt de vingerafdruk achteraf niet meer
    // met wat er werkelijk verstuurd is (v80 en eerder: valse melding
    // "een collega heeft dit project gewijzigd").
    var json = JSON.stringify(huidigeStaat());
    var state = JSON.parse(json);
    state._sessie = SESSIE;
    // Vóór het versturen onthouden: het live bericht van de database kan
    // eerder binnen zijn dan het antwoord op de update.
    var afdruk = vingerafdruk(state);
    eigenSchrijfsels.push(afdruk);
    if (eigenSchrijfsels.length > 8) eigenSchrijfsels.shift();
    sb.from('projecten').update({
      naam: state.project || '(naamloos)',
      datum: state.datum || '',
      data: state,
      aantal_ruiten: ingevuldeRijen(state),
      adres: adresVan(state),
      open_taken: openTaken(state),
      status: (state.info && state.info.status) || 'open',
      gewijzigd_door: gebruiker.id
    }).eq('id', projectId).select('id').then(function (res) {
      bezig = false;
      clearTimeout(wachtKlok);
      // Een update die geen enkele rij raakt geeft géén fout. Zonder deze
      // controle bleef de app "✓ Opgeslagen" melden terwijl er niets
      // werd weggeschreven — bijvoorbeeld als een collega het project
      // intussen verwijderd had (v83).
      if (!res.error && Array.isArray(res.data) && res.data.length === 0) {
        var i2 = eigenSchrijfsels.lastIndexOf(afdruk);
        if (i2 >= 0) eigenSchrijfsels.splice(i2, 1);
        status('⚠ Niet opgeslagen — project weg?', '#a3231a');
        if (window.appFout) {
          appFout('Het opslaan kwam niet aan: dit project bestaat niet meer, of je mag er niet meer bij. ' +
                  'Je werk staat nog op dit apparaat. Maak een nieuw project aan en exporteer of kopieer ' +
                  'de maten daarheen voordat je de app sluit.',
                  { kop: 'Niet opgeslagen' });
        }
        return;
      }
      if (res.error) {
        var i = eigenSchrijfsels.lastIndexOf(afdruk);
        if (i >= 0) eigenSchrijfsels.splice(i, 1);
        if (res.error.code === '23505') {
          status('⚠ Naam al in gebruik', '#a3231a');
          toonNaamWaarschuwing('⚠ Deze projectnaam is al in gebruik. Kies een andere naam; ' +
                               'je metingen blijven zolang lokaal bewaard.');
        } else {
          status('⚠ Niet opgeslagen — ' + res.error.message, '#a3231a');
        }
        setTimeout(plan, 8000);
      } else if (JSON.stringify(huidigeStaat()) !== json) {
        // Tijdens het opslaan is er doorgetypt. Dat staat nog niet in de
        // database: open laten en meteen de volgende ronde plannen.
        vuil = true;
        localStorage.setItem(LS_PENDING, '1');
        plan();
      } else {
        vuil = false;
        localStorage.removeItem(LS_PENDING);
        statusOpgeslagen();
      }
    }, function (e) {
      // Netwerkfout zonder antwoord: niets is zeker weggeschreven.
      bezig = false;
      clearTimeout(wachtKlok);
      status('⚠ Niet opgeslagen — ' + ((e && e.message) || 'geen verbinding'), '#a3231a');
      setTimeout(plan, 8000);
    });
  }

  window.addEventListener('online', function () { if (vuil) synchroniseer(); });
  window.addEventListener('offline', function () {
    status('⚠ Offline — lokaal', '#a3231a');
  });
  setInterval(function () { if (vuil) synchroniseer(); }, 20000);

  /* ─── live bijwerken ───────────────────────────────────────── */
  // Postgres bewaart JSON met zijn eigen volgorde van sleutels, dus twee
  // gelijke toestanden kunnen als tekst verschillen. Voor het vergelijken
  // zetten we alles eerst in een vaste volgorde.
  function diepCanon(x) {
    if (Array.isArray(x)) return '[' + x.map(diepCanon).join(',') + ']';
    if (x && typeof x === 'object') {
      // Sleutels met de waarde undefined overslaan: JSON (en dus de
      // database) laat ze weg, dus anders lijkt je eigen stand verschillend.
      return '{' + Object.keys(x).filter(function (k) { return x[k] !== undefined; })
        .sort().map(function (k) {
          return JSON.stringify(k) + ':' + diepCanon(x[k]);
        }).join(',') + '}';
    }
    return JSON.stringify(x === undefined ? null : x);
  }

  // Een project dat eerder is opgeslagen kan velden missen die de app nu
  // wél altijd meestuurt — 'taken' en 'info' bijvoorbeeld, of een getal
  // waar nu tekst staat. Zonder gelijktrekken van die vorm lijkt elke
  // vergelijking een verschil, en dat leest als 'een collega heeft iets
  // gewijzigd' terwijl er niets aan de hand is.
  function normaliseer(d) {
    d = d || {};
    return {
      rijen: Array.isArray(d.rijen) ? d.rijen : [],
      volgendId: d.volgendId || 1,
      fotos: Array.isArray(d.fotos) ? d.fotos : [],
      info: (d.info && typeof d.info === 'object') ? d.info : {},
      taken: Array.isArray(d.taken) ? d.taken : [],
      project: String(d.project === undefined ? '' : d.project),
      datum: String(d.datum === undefined ? '' : d.datum),
      speling: String(d.speling === undefined ? '4' : d.speling),
      bijtelling: String(d.bijtelling === undefined ? '11' : d.bijtelling)
    };
  }

  function vingerafdruk(d) { return diepCanon(normaliseer(d)); }

  var kanaal = null;
  // Wat we zelf hebben weggeschreven. De database stuurt elke wijziging
  // terug, ook de onze; die komt aan als jij alweer verder hebt getypt en
  // is dan niet meer te herkennen aan wat er op het scherm staat.
  var eigenSchrijfsels = [];
  // Elke geopende pagina krijgt een eigen kenmerk dat met de opslag
  // meegaat. Zo herken je je eigen terugkaatsende opslag ook als je
  // intussen verder bent gegaan. Bewust niet het gebruikers-id: dezelfde
  // gebruiker op een tweede apparaat moet wél live bijgewerkt worden.
  var SESSIE = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  function luisterOpProject() {
    // Een oudere bibliotheek uit de cache kent geen kanalen. Dan werkt de
    // app gewoon door, alleen zonder live bijwerken.
    if (!sb || !projectId || typeof sb.channel !== 'function') return;
    if (kanaal) { try { sb.removeChannel(kanaal); } catch (e) {} kanaal = null; }
    try {
      kanaal = sb.channel('project-' + projectId)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'projecten', filter: 'id=eq.' + projectId
        }, function (bericht) { vanElders(bericht.new); })
        .subscribe();
    } catch (e) {
      console.warn('[cloud] live bijwerken niet beschikbaar', e);
      kanaal = null;
    }
  }

  function vanElders(rij) {
    if (!rij || !rij.data) return;
    // Onze eigen opslag die terugkaatst — ook een oudere: er is sindsdien
    // alleen nog meer van onszelf bijgekomen.
    if (rij.data._sessie === SESSIE) return;
    var binnen = vingerafdruk(rij.data);
    // Gelijk aan wat er nu staat: niets aan de hand.
    if (binnen === vingerafdruk(huidigeStaat())) return;
    // Of het is een van onze eigen opslagbeurten die terugkaatst.
    if (eigenSchrijfsels.indexOf(binnen) >= 0) return;

    var veldActief = document.activeElement &&
      document.activeElement.matches && document.activeElement.matches('input, select, textarea');

    if (!vuil && !veldActief) {
      zetStaat(rij.data);
      laatsteJson = JSON.stringify(huidigeStaat());
      opslaanLokaal();
      toonMelding('');
      status('↻ Bijgewerkt door collega', '#1a6b3c');
      setTimeout(statusOpgeslagen, 4000);
      return;
    }

    // Er staat lokaal werk open of je bent aan het typen: dan niets
    // overschrijven, maar wel zeggen dat het er is.
    toonMelding('Een collega heeft dit project gewijzigd.' +
      (vuil ? ' Jouw wijzigingen staan nog open en overschrijven die van hem zodra ze omhoog gaan.' : ''),
      'Hun versie laden', async function () {
        if (vuil && !await appVraag(
            'Jouw nog niet opgeslagen wijzigingen gaan hiermee verloren.',
            { kop: 'Versie van je collega laden', ja: 'Laden en mijn werk laten vallen',
              gevaarlijk: true })) return;
        zetStaat(rij.data);
        laatsteJson = JSON.stringify(huidigeStaat());
        vuil = false;
        localStorage.removeItem(LS_PENDING);
        opslaanLokaal();
        toonMelding('');
        statusOpgeslagen();
      });
  }

  function toonMelding(tekst, knopTekst, actie) {
    var balk = el('syncMelding');
    if (!balk) return;
    if (!tekst) { balk.style.display = 'none'; balk.innerHTML = ''; return; }
    balk.style.display = 'flex';
    balk.innerHTML = '<span>↻ ' + tekst + '</span>';
    if (knopTekst) {
      var knop = document.createElement('button');
      knop.textContent = knopTekst;
      knop.onclick = function () { balk.style.display = 'none'; actie(); };
      balk.appendChild(knop);
    }
    var weg = document.createElement('button');
    weg.className = 'sluit';
    weg.textContent = '✕';
    weg.onclick = function () { balk.style.display = 'none'; };
    balk.appendChild(weg);
  }

  // Terugkeren naar de app: openstaand werk wegschrijven en kijken of er
  // intussen iets veranderd is. Dit vangt ook wat een gemiste live-melding
  // laat liggen, bijvoorbeeld na een tijd zonder bereik.
  function bijTerugkeer() {
    if (document.visibilityState !== 'visible' || !sb || !gebruiker || !projectId) return;
    luisterOpProject();

    // Staat er eigen werk open, dan wijkt de database per definitie af van
    // je scherm. Dat is geen wijziging van een collega maar je eigen
    // invoer die nog omhoog moet. Eerst wegschrijven; wat er daarna echt
    // van een ander komt, meldt de live verbinding vanzelf.
    if (vuil) { synchroniseer(); return; }
    // Opslaan nog onderweg: wat de database nu teruggeeft is ouder dan je
    // scherm. Het antwoord op die opslag regelt de rest.
    if (bezig) return;

    sb.from('projecten').select('data').eq('id', projectId).maybeSingle().then(function (res) {
      if (res.error || !res.data) return;
      if (vuil || bezig) return;     // intussen toch weer iets getypt
      vanElders({ data: res.data.data });
    });
  }
  document.addEventListener('visibilitychange', bijTerugkeer);
  window.addEventListener('focus', bijTerugkeer);

  /* ─── keuzelijsten uit de database ─────────────────────────── */

  function pasDataToe(nieuw) {
    if (!nieuw || typeof nieuw !== 'object') return;
    Object.keys(nieuw).forEach(function (k) {
      // De keuzelijst uit de database wint normaal van die in index.html.
      // Eén uitzondering: is dat nog een oudere lijst — die van vóór v63
      // zonder figuurglas, of die van v63 t/m v72 mét maten in de namen —
      // dan zou de app achteruit gaan zodra hij online komt. Draai
      // 11_glasbewerking_namen.sql en dit valt vanzelf weg.
      // Dezelfde afspraak voor de roeden: staan de opplakroeden er nog in,
      // of de breedtes die alleen bij hen hoorden, dan is de lijst ouder
      // dan de app en wint die van index.html niet.
      if (k === 'roedenverdeling' && Array.isArray(nieuw[k]) &&
          nieuw[k].some(function (v) { return /^Opplak/i.test(v); })) {
        console.warn('[cloud] roedenverdeling in de database is nog de oude lijst; ' +
                     'draai 12_roeden_en_canale.sql.');
        return;
      }
      if (k === 'roedenbreedte' && Array.isArray(nieuw[k]) &&
          nieuw[k].some(function (v) { return v === '28 mm' || v === '38 mm'; })) {
        console.warn('[cloud] roedenbreedte in de database is nog de oude lijst; ' +
                     'draai 12_roeden_en_canale.sql.');
        return;
      }
      if (k === 'glasbewerking' && oudeBewerkingslijst(nieuw[k])) {
        console.warn('[cloud] glasbewerking in de database is nog een oude lijst; ' +
                     'draai 12_roeden_en_canale.sql. Tot die tijd gebruikt de app zijn eigen lijst.');
        return;
      }
      DATA[k] = nieuw[k];
    });
  }

  function oudeBewerkingslijst(lijst) {
    if (!Array.isArray(lijst)) return true;
    // Twee kenmerken van de huidige lijst:
    //  • een kastlijntje ('Figuurglas — Crepi blank'); tot v62 stond daar
    //    een streepje;
    //  • geen maten meer in de naam; van v63 tot en met v72 stonden die
    //    erachter ('… (4/6/8/10 mm)') en kwamen ze zo op de bestellijst.
    var kastlijn = lijst.some(function (b) { return b.indexOf('Figuurglas — ') === 0; });
    // Canale mat blank kwam er in v76 bij; ontbreekt hij, dan is de lijst
    // van vóór die versie.
    var compleet = lijst.indexOf('Figuurglas — Canale mat blank') >= 0;
    var metMaat = lijst.some(function (b) { return /\(\s*\d[\d/.,\s]*mm\s*\)\s*$/.test(b); });
    return !kastlijn || metMaat || !compleet;
  }

  function laadGecachteData() {
    try {
      var raw = localStorage.getItem(LS_DATA);
      if (raw) pasDataToe(JSON.parse(raw));
    } catch (e) {}
  }

  function haalData() {
    if (!sb) return Promise.resolve();
    return sb.from('app_data').select('waarde').eq('key', 'glas_data').maybeSingle()
      .then(function (res) {
        if (res.error || !res.data) return;
        pasDataToe(res.data.waarde);
        try { localStorage.setItem(LS_DATA, JSON.stringify(res.data.waarde)); } catch (e) {}
        renderTabel();
        herbereken();
      });
  }

  /* ─── inlogscherm ──────────────────────────────────────────── */

  function toonLogin(melding) {
    el('cloudLoginFout').textContent = melding || '';
    el('cloudLogin').style.display = 'flex';
    el('cloudEmail').focus();
    toonGebruiker();
  }

  function verbergLogin() {
    el('cloudLogin').style.display = 'none';
    toonGebruiker();
  }

  function login() {
    var email = el('cloudEmail').value.trim();
    var pw = el('cloudWachtwoord').value;
    if (!email || !pw) { el('cloudLoginFout').textContent = 'Vul e-mail en wachtwoord in.'; return; }
    el('cloudLoginKnop').disabled = true;
    el('cloudLoginFout').textContent = 'Bezig met inloggen…';
    sb.auth.signInWithPassword({ email: email, password: pw }).then(function (res) {
      el('cloudLoginKnop').disabled = false;
      if (res.error) { el('cloudLoginFout').textContent = 'Inloggen mislukt: ' + res.error.message; return; }
      gebruiker = res.data.user;
      verbergLogin();
      start();
    });
  }

  async function uitloggen() {
    if (!await magVerlaten('uitloggen')) return;
    localStorage.removeItem(LS_PENDING);
    sb.auth.signOut().then(function () {
      gebruiker = null;
      projectId = null;
      localStorage.removeItem(LS_PROJECT);
      toonLogin('Je bent uitgelogd.');
    });
  }

  /* ─── naamcontrole ─────────────────────────────────────────── */
  // Twee projecten met dezelfde naam zijn in het veld niet uit elkaar te
  // houden, dus we controleren zowel bij aanmaken als bij hernoemen.

  function naamVergelijk(n) { return String(n || '').trim().toLowerCase(); }

  function zoekNaam(naam, behalveId) {
    if (!sb || !gebruiker) return Promise.resolve(null);
    return sb.from('projecten').select('id,naam').then(function (res) {
      if (res.error || !res.data) return null;
      return res.data.find(function (p) {
        return naamVergelijk(p.naam) === naamVergelijk(naam) && p.id !== behalveId;
      }) || null;
    });
  }

  function toonNaamWaarschuwing(tekst) {
    var balk = document.getElementById('naamWaarschuwing');
    var veld = el('projectNaam');
    if (balk) {
      balk.textContent = tekst || '';
      balk.style.display = tekst ? 'block' : 'none';
    }
    if (veld) veld.classList.toggle('dubbel', !!tekst);
  }

  function controleerNaam() {
    var naam = waarde('projectNaam');
    if (!naam.trim() || !projectId) { toonNaamWaarschuwing(''); return; }
    zoekNaam(naam, projectId).then(function (bestaand) {
      toonNaamWaarschuwing(bestaand
        ? '⚠ Er bestaat al een ander project met de naam ‹' + bestaand.naam +
          '›. Geef dit project een andere naam om verwarring te voorkomen.'
        : '');
    });
  }

  /* ─── projectenlijst ───────────────────────────────────────── */

  var zoekTimer = null;
  var zoekTerm = '';

  window.cloudZoek = function (term) {
    zoekTerm = term || '';
    clearTimeout(zoekTimer);
    // Even wachten met zoeken: anders gaat er per toetsaanslag een
    // verzoek naar de database.
    zoekTimer = setTimeout(function () { toonProjecten(true); }, 250);
  };

  window.cloudZoekWissen = function () {
    var veld = el('cloudZoekVeld');
    if (veld) { veld.value = ''; veld.focus(); }
    zoekTerm = '';
    toonProjecten(true);
  };

  function markeer(tekst, term) {
    var veilig = esc(tekst);
    if (!term) return veilig;
    var i = veilig.toLowerCase().indexOf(esc(term).toLowerCase());
    if (i < 0) return veilig;
    return veilig.slice(0, i) + '<mark>' + veilig.slice(i, i + term.length) + '</mark>' +
           veilig.slice(i + term.length);
  }

  function toonProjecten(behoudVenster) {
    if (!sb || !gebruiker) return;
    var lijst = el('cloudProjectLijst');
    if (!behoudVenster) {
      zoekTerm = '';
      var veld = el('cloudZoekVeld');
      if (veld) veld.value = '';
    }
    lijst.innerHTML = '<div style="padding:20px;color:var(--grijs-tekst)">Projecten ophalen…</div>';
    el('cloudProjecten').style.display = 'flex';

    // Alleen de velden die de lijst toont; de inhoud van een project
    // wordt pas opgehaald als je hem opent.
    var vraag = sb.from('projecten').select('id,naam,datum,status,aantal_ruiten,adres,open_taken,updated_at');
    if (zoekTerm.trim()) {
      var t = '%' + zoekTerm.trim().replace(/[%_]/g, '') + '%';
      vraag = vraag.or('naam.ilike.' + t + ',datum.ilike.' + t + ',adres.ilike.' + t);
    }
    vraag.order('updated_at', { ascending: false }).limit(200)
      .then(function (res) {
        if (res.error) {
          lijst.innerHTML = '<div style="padding:20px;color:var(--rood)">Ophalen mislukt: ' + res.error.message + '</div>';
          return;
        }
        var telling = el('cloudTelling');
        if (telling) {
          telling.textContent = zoekTerm.trim()
            ? res.data.length + ' van de projecten komt overeen'
            : (res.data.length ? res.data.length + ' projecten' : '');
        }
        if (!res.data.length) {
          lijst.innerHTML = zoekTerm.trim()
            ? '<div style="padding:20px;color:var(--grijs-tekst)">Geen project gevonden voor ‹' + esc(zoekTerm) + '›.</div>'
            : '<div style="padding:20px;color:var(--grijs-tekst)">Nog geen projecten. Maak er hieronder een aan.</div>';
          return;
        }
        lijst.innerHTML = res.data.map(function (p) {
          var n = p.aantal_ruiten || 0;
          var d = new Date(p.updated_at);
          var stamp = String(d.getDate()).padStart(2, '0') + '-' +
                      String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' +
                      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
          return '<div class="cloud-project' + (p.id === projectId ? ' actief' : '') + '">' +
                 '<div class="cloud-project-info" onclick="cloudOpen(\'' + p.id + '\')">' +
                 '<strong>' + markeer(p.naam || '(naamloos)', zoekTerm) + '</strong>' +
                 '<span>' + (p.status && p.status !== 'open'
                     ? '<em class="pl-status">' + esc(p.status) + '</em> · ' : '') +
                 (p.adres ? markeer(p.adres, zoekTerm) + ' · ' : '') +
                 n + ' ruiten' +
                 (p.open_taken ? ' · <b class="pl-taken">' + p.open_taken + ' open ' +
                    (p.open_taken === 1 ? 'taak' : 'taken') + '</b>' : '') +
                 (p.datum ? ' · ' + markeer(p.datum, zoekTerm) : '') +
                 ' · gewijzigd ' + stamp + '</span>' +
                 '</div>' +
                 '<button class="btn btn-ghost btn-sm" onclick="cloudVerwijder(\'' + p.id + '\')" title="Project verwijderen">🗑</button>' +
                 '</div>';
        }).join('');
      });
  }

  // Is er werk dat nog niet op de server staat? Dan mag je niet zomaar
  // een ander project openen, uitloggen of een nieuw project maken: de
  // lokale kopie wordt daarbij overschreven en dat werk is dan weg (v83).
  function openstaandWerk() {
    return vuil || localStorage.getItem(LS_PENDING) === '1';
  }

  function wacht(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function magVerlaten(wat) {
    if (!openstaandWerk()) return true;
    // Eerst gewoon proberen alsnog op te slaan.
    if (navigator.onLine) {
      synchroniseer();
      for (var i = 0; i < 12 && openstaandWerk(); i++) await wacht(500);
      if (!openstaandWerk()) return true;
    }
    var keus = await appKeuze('Er staat werk in dit project dat nog niet op de server is opgeslagen. ' +
      'Ga je nu ' + wat + ', dan is dat werk weg.',
      [{ tekst: 'Annuleren', waarde: null },
       { tekst: 'Opnieuw proberen', waarde: 'opnieuw' },
       { tekst: 'Toch doorgaan', waarde: 'door', soort: 'btn-danger' }],
      { kop: 'Nog niet opgeslagen' });
    if (keus === 'opnieuw') return magVerlaten(wat);
    return keus === 'door';
  }

  window.cloudOpen = async function (id) {
    if (!await magVerlaten('een ander project openen')) return;
    localStorage.removeItem(LS_PENDING);
    vuil = false;
    sb.from('projecten').select('id,data').eq('id', id).single().then(function (res) {
      if (res.error) { appFout('Openen mislukt: ' + res.error.message); return; }
      projectId = res.data.id;
      window.glasProjectId = projectId;
      localStorage.setItem(LS_PROJECT, projectId);
      if (window.fotoLinksVergeten) fotoLinksVergeten();
      zetStaat(res.data.data || {});
      opslaanLokaal();
      laatsteJson = JSON.stringify(huidigeStaat());
      vuil = false;
      luisterOpProject();
      el('cloudProjecten').style.display = 'none';
      statusOpgeslagen();
      controleerNaam();
    });
  };

  window.cloudNieuw = async function (voorstel, melding) {
    if (!melding && !await magVerlaten('een nieuw project aanmaken')) return;
    var naam = await appInvoer(melding || 'Waar gaat dit project over? Meestal het adres.',
      { kop: 'Nieuw project', waarde: voorstel || '',
        plaatshouder: 'bijv. Teststraat 12', ja: 'Aanmaken' });
    if (naam === null) return;
    if (!naam.trim()) {
      window.cloudNieuw('', 'Een project heeft een naam nodig. Meestal het adres.');
      return;
    }
    var bestaand = await zoekNaam(naam, null);
    if (bestaand) {
      window.cloudNieuw(naam, 'Er bestaat al een project met de naam \u2039' + bestaand.naam +
        '\u203a. Kies een andere naam, of open het bestaande project via de lijst.');
      return;
    }
    maakProject(naam);
  };

  function maakProject(naam) {
    sb.from('projecten').insert({
      naam: naam || '(naamloos)',
      datum: '',
      data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [],
              project: naam || '', datum: '', speling: '4', bijtelling: '11' },
      aantal_ruiten: 0, adres: '', open_taken: 0,
      gewijzigd_door: gebruiker.id
    }).select('id').single().then(function (res) {
      if (res.error) { appFout('Aanmaken mislukt: ' + res.error.message); return; }
      projectId = res.data.id;
      window.glasProjectId = projectId;
      localStorage.setItem(LS_PROJECT, projectId);
      luisterOpProject();
      rijen = []; volgendId = 1; fotos = []; projectInfo = {}; projectTaken = [];
      zetStaat({ project: naam, datum: '', speling: '4', bijtelling: '11' });
      toonNaamWaarschuwing('');
      el('cloudProjecten').style.display = 'none';
      window.opslaan();
    });
  }

  // Foto's moeten via de Storage-API weg; rechtstreeks uit de
  // opslagtabellen verwijderen staat Supabase niet toe. Daarom eerst
  // de map van dit project leegmaken, dan pas de projectrij.
  function fotosOpruimen(id) {
    if (!sb) return Promise.resolve();
    return sb.storage.from('projectfotos').list(id, { limit: 500 })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return null;
        var paden = res.data.map(function (f) { return id + '/' + f.name; });
        return sb.storage.from('projectfotos').remove(paden);
      })
      .catch(function (e) { console.warn('[cloud] foto\'s opruimen mislukt', e); });
  }

  window.cloudVerwijder = async function (id) {
    if (!await appVraag('Dit project definitief verwijderen? Dit geldt voor iedereen.\n' +
        'De foto\'s van dit project worden ook verwijderd.',
        { kop: 'Project verwijderen', ja: 'Definitief verwijderen', gevaarlijk: true })) return;
    var lijst = document.getElementById('cloudProjectLijst');
    if (lijst) lijst.style.opacity = '0.5';
    // Eerst de projectrij weg, dan pas de foto's. Andersom stonden bij een
    // mislukte verwijdering de foto's al onherstelbaar weg terwijl de app
    // meldde dat het niet gelukt was (v83).
    sb.from('projecten').delete().eq('id', id).then(function (res) {
      if (res && res.error) {
        if (lijst) lijst.style.opacity = '';
        appFout('Verwijderen mislukt: ' + res.error.message);
        return null;
      }
      return fotosOpruimen(id);
    }).then(function (res) {
      if (res === null) return;
      if (lijst) lijst.style.opacity = '';
      if (id === projectId) {
        projectId = null;
        window.glasProjectId = null;
        localStorage.removeItem(LS_PROJECT);
        // Het scherm leegmaken hoort erbij: anders typ je door in een
        // project dat niet meer bestaat en gaat dat werk alsnog verloren.
        localStorage.removeItem(LS_PENDING);
        localStorage.removeItem(LS_STATE);
        vuil = false;
        zetStaat({});
        status('Project verwijderd', '#6b6862');
      }
      toonProjecten();
    }).catch(function (e) {
      if (lijst) lijst.style.opacity = '';
      appFout('Verwijderen mislukt: ' + e.message);
    });
  };

  window.cloudProjectenTonen = function () {
    toonProjecten(false);
    setTimeout(function () {
      var veld = el('cloudZoekVeld');
      if (veld && window.innerWidth > 900) veld.focus();
    }, 60);
  };
  window.cloudSluitProjecten = function () { el('cloudProjecten').style.display = 'none'; };
  window.cloudUitloggen = uitloggen;
  window.cloudLogin = login;

  /* ─── opstarten ────────────────────────────────────────────── */

  // Openstaand lokaal werk wint van de database. Maar als er ruiten in
  // dat werk naar een foto wijzen die lokaal niet meer bestaat, halen we
  // die foto alsnog uit de database terug — met markeringen en tekening.
  // Lukt dat niet, dan maken we de ruiten los, zodat ze zichtbaar zijn en
  // het opslaan niet geblokkeerd raakt (v83).
  function herstelOntbrekendeFotos(serverStaat) {
    if (typeof rijen === 'undefined' || typeof fotos === 'undefined') return;
    var heb = {};
    (fotos || []).forEach(function (f) { if (f) heb[f.id] = true; });
    var mist = {};
    (rijen || []).forEach(function (r) { if (r && r.fotoId && !heb[r.fotoId]) mist[r.fotoId] = true; });
    if (!Object.keys(mist).length) return;

    var terug = 0;
    (Array.isArray(serverStaat.fotos) ? serverStaat.fotos : []).forEach(function (f) {
      if (f && mist[f.id]) { fotos.push(f); heb[f.id] = true; delete mist[f.id]; terug++; }
    });
    var los = window.verweesdeRijenLosmaken ? verweesdeRijenLosmaken() : 0;

    if (window.renderFotos) renderFotos();
    if (window.renderTabel) renderTabel();
    if (window.herbereken) herbereken();

    if (window.appMelding && (terug || los)) {
      appMelding((terug ? terug + (terug === 1 ? ' foto is' : ' foto\'s zijn') +
                   ' teruggehaald uit de opgeslagen versie. ' : '') +
                 (los ? los + (los === 1 ? ' ruit hoorde' : ' ruiten hoorden') +
                   ' bij een foto die nergens meer te vinden is; ' +
                   (los === 1 ? 'die staat' : 'die staan') + ' nu bij "Zonder foto of tekening". ' : '') +
                 'Controleer de invoer voordat je verder gaat.',
                 { kop: 'Opname hersteld', soort: 'letop' });
    }
  }

  function start() {
    haalData();
    if (projectId) {
      sb.from('projecten').select('id,data,updated_at').eq('id', projectId).maybeSingle()
        .then(function (res) {
          // Een fout is iets anders dan een project dat niet bestaat.
          // Eerder werd élke fout — ook 'geen verbinding' — behandeld als
          // 'project weg': de koppeling werd gewist en daarna ging er
          // niets meer omhoog, terwijl het werk op het scherm stond (v83).
          if (res.error) {
            status('⚠ Geen verbinding — lokaal', '#a3231a');
            laatsteJson = JSON.stringify(huidigeStaat());
            if (localStorage.getItem(LS_PENDING) === '1') { vuil = true; }
            luisterOpProject();
            setTimeout(function () { if (vuil) synchroniseer(); }, 5000);
            return;
          }
          if (!res.data) { projectId = null; localStorage.removeItem(LS_PROJECT); toonProjecten(); return; }
          // Lokale, nog niet gesynchroniseerde wijzigingen winnen.
          if (localStorage.getItem(LS_PENDING) === '1') {
            // Openstaand werk wint; zetStaat wordt hier dus niet gedraaid en
            // 'Opgenomen door' moet apart nagelopen worden.
            vulOpnemer();
            herstelOntbrekendeFotos(res.data.data || {});
            vuil = true;
            status('⚠ Nog niet opgeslagen', '#8a5a00');
            laatsteJson = JSON.stringify(huidigeStaat());
            luisterOpProject();
            synchroniseer();
          } else {
            zetStaat(res.data.data || {});
            opslaanLokaal();
            laatsteJson = JSON.stringify(huidigeStaat());
            statusOpgeslagen();
            luisterOpProject();
          }
        });
    } else {
      toonProjecten();
    }
  }

  function init() {
    laadGecachteData();

    if (!window.supabase || !cfg.url || cfg.url.indexOf('VUL_IN') === 0) {
      status('⚠ Niet verbonden — alleen lokaal', '#a3231a');
      var k = el('cloudProjectKnop'); if (k) k.style.display = 'none';
      return;
    }
    sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    window.glasSupabase = sb;

    sb.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        gebruiker = res.data.session.user;
        verbergLogin();
        start();
      } else {
        toonLogin('');
      }
    });

    if (el('projectNaam')) el('projectNaam').addEventListener('blur', controleerNaam);

    el('cloudWachtwoord').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') login();
    });

    var herlaadt = false;
    var stilleOvername = false;
    var registratie = null;

    // Handmatige uitweg: controleren en zo nodig meteen overschakelen.
    // Handig als een melding weggeklikt is, of als er iets blijft hangen.
    window.appBijwerken = function () {
      if (!registratie) { location.reload(); return; }
      status('… Versie controleren');
      registratie.update().catch(function () {}).then(function () {
        if (registratie.waiting) {
          if (vuil) synchroniseer();
          setTimeout(function () { registratie.waiting.postMessage('skipWaiting'); }, vuil ? 900 : 0);
        } else {
          location.reload();
        }
      });
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        registratie = reg;
        // Bij het openen en bij elke terugkeer naar de app kijken of er
        // een nieuwe versie op de server staat.
        reg.update().catch(function () {});
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') reg.update().catch(function () {});
        });

        function let_op(nieuwe) {
          if (!nieuwe) return;
          nieuwe.addEventListener('statechange', function () {
            if (nieuwe.state === 'installed' && navigator.serviceWorker.controller) {
              beoordeel(nieuwe);
            }
          });
        }
        if (reg.waiting && navigator.serviceWorker.controller) beoordeel(reg.waiting);
        reg.addEventListener('updatefound', function () { let_op(reg.installing); });
      }).catch(function () {});

      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (herlaadt) return;
        // Bij een stille overname draait er al dezelfde versie; herladen
        // zou de gebruiker alleen maar uit zijn werk halen.
        if (stilleOvername) { stilleOvername = false; return; }
        herlaadt = true;
        location.reload();
      });
    }

    // Een wachtende service worker betekent niet altijd dat de pagina
    // verouderd is: de bestanden worden namelijk eerst van het net
    // gehaald en pas daarna uit de cache. Blijkt zijn versienummer
    // gelijk aan wat er draait, dan laten we hem stilletjes overnemen
    // in plaats van te melden dat er iets nieuws is.
    function beoordeel(worker) {
      var kanaal = new MessageChannel();
      var beantwoord = false;
      kanaal.port1.onmessage = function (e) {
        beantwoord = true;
        var versie = e.data && e.data.versie;
        if (versie && typeof APP_VERSIE !== 'undefined' && versie === APP_VERSIE) {
          stilleOvername = true;
          worker.postMessage('skipWaiting');
        } else {
          meldNieuweVersie(worker);
        }
      };
      try { worker.postMessage({ vraag: 'versie' }, [kanaal.port2]); } catch (e) {}
      // Antwoordt hij niet (oudere versie zonder die mogelijkheid), dan
      // is het hoe dan ook een andere versie.
      setTimeout(function () { if (!beantwoord) meldNieuweVersie(worker); }, 1200);
    }

    function meldNieuweVersie(worker) {
      toonMelding('Er is een nieuwe versie van de app beschikbaar.',
        'Nu bijwerken', function () {
          if (vuil) synchroniseer();
          // Even wachten zodat openstaand werk nog omhoog kan.
          setTimeout(function () { worker.postMessage('skipWaiting'); }, vuil ? 900 : 0);
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
