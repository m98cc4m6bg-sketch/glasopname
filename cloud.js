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
  var vuil      = false;   // er zijn wijzigingen die nog niet omhoog zijn
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
      project: waarde('projectNaam'),
      datum: waarde('projectDatum'),
      speling: waarde('spelingGlobal'),
      bijtelling: waarde('bijtelling') || '11'
    };
  }

  function zetStaat(state) {
    rijen = state.rijen || [];
    volgendId = state.volgendId || (rijen.length + 1);
    if (el('projectNaam'))   el('projectNaam').value   = state.project || '';
    if (el('projectDatum'))  el('projectDatum').value  = state.datum || '';
    if (el('spelingGlobal') && state.speling)     el('spelingGlobal').value = state.speling;
    if (el('bijtelling')    && state.bijtelling)  el('bijtelling').value    = state.bijtelling;
    if (rijen.length === 0) voegRijenToe(20);
    renderTabel();
    herbereken();
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
    if (!navigator.onLine) { status('⚠ Offline — lokaal bewaard', 'rgba(192,57,43,0.85)'); return; }
    bezig = true;
    status('… Opslaan');
    var state = huidigeStaat();
    sb.from('projecten').update({
      naam: state.project || '(naamloos)',
      datum: state.datum || '',
      data: state,
      gewijzigd_door: gebruiker.id
    }).eq('id', projectId).then(function (res) {
      bezig = false;
      if (res.error) {
        status('⚠ Niet opgeslagen — ' + res.error.message, 'rgba(192,57,43,0.85)');
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
    status('⚠ Offline — lokaal bewaard', 'rgba(192,57,43,0.85)');
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

  /* ─── projectenlijst ───────────────────────────────────────── */

  function toonProjecten() {
    if (!sb || !gebruiker) return;
    var lijst = el('cloudProjectLijst');
    lijst.innerHTML = '<div style="padding:20px;color:var(--grijs-tekst)">Projecten ophalen…</div>';
    el('cloudProjecten').style.display = 'flex';
    sb.from('projecten').select('id,naam,datum,status,data,updated_at')
      .order('updated_at', { ascending: false }).limit(200)
      .then(function (res) {
        if (res.error) {
          lijst.innerHTML = '<div style="padding:20px;color:var(--rood)">Ophalen mislukt: ' + res.error.message + '</div>';
          return;
        }
        if (!res.data.length) {
          lijst.innerHTML = '<div style="padding:20px;color:var(--grijs-tekst)">Nog geen projecten. Maak er hieronder een aan.</div>';
          return;
        }
        lijst.innerHTML = res.data.map(function (p) {
          var n = ingevuldeRijen(p.data || {});
          var d = new Date(p.updated_at);
          var stamp = String(d.getDate()).padStart(2, '0') + '-' +
                      String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' +
                      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
          return '<div class="cloud-project' + (p.id === projectId ? ' actief' : '') + '">' +
                 '<div class="cloud-project-info" onclick="cloudOpen(\'' + p.id + '\')">' +
                 '<strong>' + (p.naam || '(naamloos)') + '</strong>' +
                 '<span>' + n + ' ruiten' + (p.datum ? ' · ' + p.datum : '') + ' · gewijzigd ' + stamp + '</span>' +
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
      localStorage.setItem(LS_PROJECT, projectId);
      zetStaat(res.data.data || {});
      opslaanLokaal();
      vuil = false;
      el('cloudProjecten').style.display = 'none';
      statusOpgeslagen();
    });
  };

  window.cloudNieuw = function () {
    var naam = prompt('Naam van het nieuwe project (bijv. adres):', '');
    if (naam === null) return;
    sb.from('projecten').insert({
      naam: naam || '(naamloos)',
      datum: '',
      data: { rijen: [], volgendId: 1, project: naam || '', datum: '', speling: '4', bijtelling: '11' },
      gewijzigd_door: gebruiker.id
    }).select('id').single().then(function (res) {
      if (res.error) { alert('Aanmaken mislukt: ' + res.error.message); return; }
      projectId = res.data.id;
      localStorage.setItem(LS_PROJECT, projectId);
      rijen = []; volgendId = 1;
      zetStaat({ project: naam, datum: '', speling: '4', bijtelling: '11' });
      el('cloudProjecten').style.display = 'none';
      window.opslaan();
    });
  };

  window.cloudVerwijder = function (id) {
    if (!confirm('Dit project definitief verwijderen? Dit geldt voor iedereen.')) return;
    sb.from('projecten').delete().eq('id', id).then(function (res) {
      if (res.error) { alert('Verwijderen mislukt: ' + res.error.message); return; }
      if (id === projectId) { projectId = null; localStorage.removeItem(LS_PROJECT); }
      toonProjecten();
    });
  };

  window.cloudProjectenTonen = toonProjecten;
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

    sb.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        gebruiker = res.data.session.user;
        verbergLogin();
        start();
      } else {
        toonLogin('');
      }
    });

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
