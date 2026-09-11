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
    volgendId = state.volgendId || (rijen.length + 1);
    fotos = state.fotos || [];
    projectInfo = state.info || {};
    projectTaken = state.taken || [];
    if (el('projectNaam'))   el('projectNaam').value   = state.project || '';
    if (el('projectDatum'))  el('projectDatum').value  = state.datum || '';
    if (el('spelingGlobal') && state.speling)     el('spelingGlobal').value = state.speling;
    if (el('bijtelling')    && state.bijtelling)  el('bijtelling').value    = state.bijtelling;
    if (rijen.length === 0) voegRijenToe(20);
    renderTabel();
    herbereken();
    if (window.renderFotos) renderFotos();
    if (window.renderProject) renderProject();
  }

  function ingevuldeRijen(state) {
    return (state.rijen || []).filter(function (r) {
      return r.glasType || r.breedte || r.hoogte;
    }).length;
  }

  /* ─── statusbalkje rechtsboven ─────────────────────────────── */

  function status(tekst, kleur) {
    var s = el('cloudStatus');
    if (!s) return;
    s.textContent = tekst;
    s.style.background = kleur || 'rgba(255,255,255,0.14)';
  }

  function statusOpgeslagen() {
    var t = new Date();
    status('✓ Opgeslagen ' + String(t.getHours()).padStart(2, '0') + ':' +
           String(t.getMinutes()).padStart(2, '0'), 'rgba(33,122,69,0.85)');
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
    origClearAlles();
    window.opslaan();
  };

  var timer = null;
  function plan() {
    clearTimeout(timer);
    timer = setTimeout(synchroniseer, 1200);
  }

  function synchroniseer() {
    if (!sb || !gebruiker || !projectId || !vuil || bezig) return;
    if (!navigator.onLine) { status('⚠ Offline — lokaal', 'rgba(192,57,43,0.85)'); return; }
    bezig = true;
    status('… Opslaan');
    var state = huidigeStaat();
    sb.from('projecten').update({
      naam: state.project || '(naamloos)',
      datum: state.datum || '',
      data: state,
      aantal_ruiten: ingevuldeRijen(state),
      status: (state.info && state.info.status) || 'open',
      gewijzigd_door: gebruiker.id
    }).eq('id', projectId).then(function (res) {
      bezig = false;
      if (res.error) {
        if (res.error.code === '23505') {
          status('⚠ Naam al in gebruik', 'rgba(192,57,43,0.85)');
          toonNaamWaarschuwing('⚠ Deze projectnaam is al in gebruik. Kies een andere naam; ' +
                               'je metingen blijven zolang lokaal bewaard.');
        } else {
          status('⚠ Niet opgeslagen — ' + res.error.message, 'rgba(192,57,43,0.85)');
        }
        setTimeout(plan, 8000);
      } else {
        vuil = false;
        localStorage.removeItem(LS_PENDING);
        statusOpgeslagen();
      }
    });
  }

  window.addEventListener('online', function () { if (vuil) synchroniseer(); });
  window.addEventListener('offline', function () {
    status('⚠ Offline — lokaal', 'rgba(192,57,43,0.85)');
  });
  setInterval(function () { if (vuil) synchroniseer(); }, 20000);

  /* ─── keuzelijsten uit de database ─────────────────────────── */

  function pasDataToe(nieuw) {
    if (!nieuw || typeof nieuw !== 'object') return;
    Object.keys(nieuw).forEach(function (k) { DATA[k] = nieuw[k]; });
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
  }

  function verbergLogin() { el('cloudLogin').style.display = 'none'; }

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

  function uitloggen() {
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
    var vraag = sb.from('projecten').select('id,naam,datum,status,aantal_ruiten,updated_at');
    if (zoekTerm.trim()) {
      var t = '%' + zoekTerm.trim().replace(/[%_]/g, '') + '%';
      vraag = vraag.or('naam.ilike.' + t + ',datum.ilike.' + t);
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
                 n + ' ruiten' + (p.datum ? ' · ' + markeer(p.datum, zoekTerm) : '') +
                 ' · gewijzigd ' + stamp + '</span>' +
                 '</div>' +
                 '<button class="btn btn-ghost btn-sm" onclick="cloudVerwijder(\'' + p.id + '\')" title="Project verwijderen">🗑</button>' +
                 '</div>';
        }).join('');
      });
  }

  window.cloudOpen = function (id) {
    if (vuil) synchroniseer();
    sb.from('projecten').select('id,data').eq('id', id).single().then(function (res) {
      if (res.error) { alert('Openen mislukt: ' + res.error.message); return; }
      projectId = res.data.id;
      window.glasProjectId = projectId;
      localStorage.setItem(LS_PROJECT, projectId);
      if (window.fotoLinksVergeten) fotoLinksVergeten();
      zetStaat(res.data.data || {});
      opslaanLokaal();
      laatsteJson = JSON.stringify(huidigeStaat());
      vuil = false;
      el('cloudProjecten').style.display = 'none';
      statusOpgeslagen();
      controleerNaam();
    });
  };

  window.cloudNieuw = function (voorstel) {
    var naam = prompt('Naam van het nieuwe project (bijv. adres):', voorstel || '');
    if (naam === null) return;
    if (!naam.trim()) { alert('Geef het project een naam.'); window.cloudNieuw(); return; }
    zoekNaam(naam, null).then(function (bestaand) {
      if (bestaand) {
        alert('Er bestaat al een project met de naam ‹' + bestaand.naam + '›.\n\n' +
              'Kies een andere naam, of open het bestaande project via de lijst.');
        window.cloudNieuw(naam);
        return;
      }
      maakProject(naam);
    });
  };

  function maakProject(naam) {
    sb.from('projecten').insert({
      naam: naam || '(naamloos)',
      datum: '',
      data: { rijen: [], volgendId: 1, fotos: [], info: {}, taken: [],
              project: naam || '', datum: '', speling: '4', bijtelling: '11' },
      aantal_ruiten: 0,
      gewijzigd_door: gebruiker.id
    }).select('id').single().then(function (res) {
      if (res.error) { alert('Aanmaken mislukt: ' + res.error.message); return; }
      projectId = res.data.id;
      window.glasProjectId = projectId;
      localStorage.setItem(LS_PROJECT, projectId);
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

  window.cloudVerwijder = function (id) {
    if (!confirm('Dit project definitief verwijderen? Dit geldt voor iedereen.\n\n' +
                 'De foto\'s van dit project worden ook verwijderd.')) return;
    var lijst = document.getElementById('cloudProjectLijst');
    if (lijst) lijst.style.opacity = '0.5';
    fotosOpruimen(id).then(function () {
      return sb.from('projecten').delete().eq('id', id);
    }).then(function (res) {
      if (lijst) lijst.style.opacity = '';
      if (res && res.error) { alert('Verwijderen mislukt: ' + res.error.message); return; }
      if (id === projectId) {
        projectId = null;
        window.glasProjectId = null;
        localStorage.removeItem(LS_PROJECT);
      }
      toonProjecten();
    }).catch(function (e) {
      if (lijst) lijst.style.opacity = '';
      alert('Verwijderen mislukt: ' + e.message);
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

  function start() {
    haalData();
    if (projectId) {
      sb.from('projecten').select('id,data,updated_at').eq('id', projectId).maybeSingle()
        .then(function (res) {
          if (res.error || !res.data) { projectId = null; localStorage.removeItem(LS_PROJECT); toonProjecten(); return; }
          // Lokale, nog niet gesynchroniseerde wijzigingen winnen.
          if (localStorage.getItem(LS_PENDING) === '1') {
            vuil = true;
            status('⚠ Nog niet opgeslagen', 'rgba(240,165,0,0.9)');
            synchroniseer();
          } else {
            zetStaat(res.data.data || {});
            opslaanLokaal();
            laatsteJson = JSON.stringify(huidigeStaat());
            statusOpgeslagen();
          }
        });
    } else {
      toonProjecten();
    }
  }

  function init() {
    laadGecachteData();

    if (!window.supabase || !cfg.url || cfg.url.indexOf('VUL_IN') === 0) {
      status('⚠ Niet verbonden — alleen lokaal', 'rgba(192,57,43,0.85)');
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

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
