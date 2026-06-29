/* 27 platform — globale hub (login + omgevingskeuze). Vanilla, geen build.
   Echte staff-login via window.S27TeamAuth (Firebase Google-SSO, @studio27.be).
   Eén origin: subportalen op /crm/, /hr/, /finance/ delen de sessie. */
(function () {
  'use strict';
  var GATEWAY = (window.S27PORTAL && window.S27PORTAL.GATEWAY) || 'https://s27-portal-gateway-v2.studio27marketing.workers.dev';
  var LOCAL_PREVIEW = (function () { try { return location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname); } catch (e) { return false; } })();
  var PREVIEW = LOCAL_PREVIEW && /[?&]preview=1/.test(location.search);
  var S = { phase: PREVIEW ? 'ready' : 'loading', email: PREVIEW ? 'vincent@studio27.be' : '', err: '' };
  // Terugkeerpad: een subportaal stuurt niet-ingelogde bezoekers hierheen met ?next=/crm/...
  // Na inloggen sturen we ze daar weer naartoe. Enkel veilige, eigen subpaden toegestaan.
  var NEXT = (function () { try { var m = location.search.match(/[?&]next=([^&]+)/); return m ? decodeURIComponent(m[1]) : ''; } catch (e) { return ''; } })();
  function safeNext(n) { return (typeof n === 'string' && /^\/(crm|finance|hr|productie)\//.test(n)) ? n : ''; }

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function icons() { try { window.lucide && window.lucide.createIcons(); } catch (e) {} }
  function ic(name, sz, extra) { return '<i data-lucide="' + name + '" style="width:' + (sz || 18) + 'px;height:' + (sz || 18) + 'px;' + (extra || '') + '"></i>'; }
  function nameOf(email) { var p = String(email || '').split('@')[0].split(/[._-]/)[0]; return p ? p.charAt(0).toUpperCase() + p.slice(1) : 'collega'; }

  var ENVS = [
    { key: 'crm', titel: '27CRM', href: '/crm/', icon: 'building-2', tag: 'Sales · Klanten · Projecten',
      desc: 'Het commerciële hart: bedrijven, contacten, offertes, meetings en projectbriefings, met AI onder elke discipline.',
      points: ['Offertes opvolgen met sales-stappen', 'Meeting-transcripties en recap-mails', 'Bruidsparen van 27M apart beheerd'],
      variant: 'light', iconBg: 'var(--brand-deep-blue)', iconFg: '#fff' },
    { key: 'productie', titel: '27Productie', href: '/productie/', icon: 'layout-panel-left', tag: 'Taken · Planning · Productie',
      desc: 'Het operationele hart: alle taken en projecten per discipline, weekplanner met drag-and-drop, doorlopende trajecten en AI-knoppen.',
      points: ['Taken per discipline en status', 'Weekplanner met drag-and-drop', 'Doorlopende trajecten en AI-acties'],
      variant: 'dark', iconBg: 'var(--brand-lemon-lime)', iconFg: 'var(--brand-off-black)' },
    { key: 'hr', titel: '27HR', href: '/hr/', icon: 'users-round', tag: 'Recruitment · Onboarding',
      desc: 'Het HR-orchestratieplatform: vacatures, kandidatenpijplijn, agenda en onboarding, volledig AI-ondersteund.',
      points: ['Vacatures op meerdere kanalen', 'Kandidaten-pijplijn met AI-match', 'Agenda en onboardingstrajecten'],
      variant: 'dark', iconBg: 'var(--brand-lemon-lime)', iconFg: 'var(--brand-off-black)' },
    { key: 'finance', titel: '27Finance', href: '/finance/', icon: 'line-chart', tag: 'Offertes · Cijfers · Facturatie',
      desc: 'Het financiële beeld van de groep: offertes, won/lost en conversie, facturatie en cijfers per merk, met AI-adviseurs.',
      points: ['Pipeline en conversie live', 'Facturatie en cashflow-voorstel', 'AI-adviseurs voor finance en sales'],
      variant: 'light', iconBg: 'var(--brand-sky-blue)', iconFg: 'var(--brand-off-black)' },
  ];

  function render() {
    var root = $('root');
    if (S.phase === 'loading') { root.innerHTML = '<div class="p-boot"><div class="p-spin"></div></div>'; return; }
    if (S.phase === 'ready') root.innerHTML = hubView();
    else if (S.phase === 'no_access') root.innerHTML = loginView(true);
    else root.innerHTML = loginView(false);
    icons();
  }

  /* ---------- login gate ---------- */
  function loginView(noAccess) {
    var glows = '<div style="position:fixed;inset:0;pointer-events:none;overflow:hidden;">' +
      '<div style="position:absolute;top:-10%;right:-6%;width:60vw;height:60vw;background:radial-gradient(circle,rgba(40,175,249,.22),transparent 60%);"></div>' +
      '<div style="position:absolute;bottom:-14%;left:-10%;width:55vw;height:55vw;background:radial-gradient(circle,rgba(209,242,76,.10),transparent 60%);"></div></div>';
    var body;
    if (noAccess) {
      body = '<div style="text-align:center;">' +
        '<div style="width:54px;height:54px;border-radius:15px;background:rgba(184,58,42,.16);color:#FF9E8F;display:grid;place-items:center;margin:0 auto 18px;">' + ic('shield-x', 26) + '</div>' +
        '<h1 style="font-size:30px;font-weight:300;margin:0 0 10px;">Geen toegang</h1>' +
        '<p style="color:rgba(247,243,234,.66);font-size:15px;line-height:1.55;margin:0 auto 22px;max-width:34ch;">Dit platform is enkel voor het Studio 27-team. Meld je aan met je <b>@studio27.be</b>-account.</p>' +
        '<button class="p-btn" data-act="logout" style="font-size:14px;font-weight:600;background:rgba(247,243,234,.08);color:var(--brand-warm-white);border:1px solid rgba(247,243,234,.16);border-radius:13px;padding:12px 18px;">Andere account</button></div>';
    } else {
      body = '<img src="assets/Logo-neg.svg" style="height:30px;margin-bottom:30px;" alt="27">' +
        '<div style="font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;color:var(--brand-sky-blue);margin-bottom:14px;">Eén login · vier omgevingen</div>' +
        '<h1 style="font-size:34px;font-weight:200;line-height:1.1;margin:0 0 26px;">Meld je aan bij het <span style="font-weight:500;">27 platform</span>.</h1>' +
        (S.err ? '<div style="display:flex;align-items:center;gap:8px;color:#FF9E8F;font-size:13.5px;margin-bottom:16px;">' + ic('alert-circle', 16) + esc(S.err) + '</div>' : '') +
        '<button class="p-btn hovlift" data-act="google" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;font-size:15px;font-weight:600;background:var(--brand-lemon-lime);color:var(--brand-off-black);border:none;border-radius:14px;padding:15px 18px;">' + ic('log-in', 18) + 'Aanmelden met Google' + '</button>' +
        '<div style="display:flex;align-items:center;gap:8px;color:rgba(247,243,234,.5);font-size:12.5px;margin-top:18px;">' + ic('shield-check', 15, 'color:var(--brand-sky-blue);') + 'Eén keer aanmelden geeft toegang tot 27CRM, 27Productie, 27HR en 27Finance.</div>';
    }
    return glows + '<div style="position:relative;min-height:100vh;display:grid;place-items:center;padding:24px;">' +
      '<div class="fade-up" style="width:100%;max-width:420px;">' + body + '</div></div>';
  }

  /* ---------- hub ---------- */
  function card(e, i) {
    var dark = e.variant === 'dark';
    var bg = dark ? 'linear-gradient(155deg,#0B1550,#0F2EA3)' : 'var(--brand-warm-white)';
    var border = dark ? '1px solid rgba(40,175,249,.28)' : '1px solid var(--neutral-200)';
    var titleC = dark ? 'var(--brand-warm-white)' : 'var(--brand-off-black)';
    var subC = dark ? 'rgba(247,243,234,.7)' : 'var(--neutral-500)';
    var bodyC = dark ? 'rgba(247,243,234,.82)' : 'var(--neutral-600)';
    var checkC = dark ? 'var(--brand-lemon-lime)' : '#1D8A5B';
    var ctaBg = dark ? 'var(--brand-lemon-lime)' : 'var(--brand-off-black)';
    var ctaFg = dark ? 'var(--brand-off-black)' : '#fff';
    var orb = dark ? 'rgba(209,242,76,.14)' : 'rgba(40,175,249,.16)';
    return '<a class="card hovlift fade-up" href="' + e.href + '" style="animation-delay:' + (i * 0.1) + 's;position:relative;overflow:hidden;display:flex;flex-direction:column;background:' + bg + ';border:' + border + ';border-radius:28px;padding:30px;box-shadow:var(--shadow-card);">' +
      '<div style="position:absolute;top:-30%;right:-20%;width:60%;height:60%;background:radial-gradient(circle,' + orb + ',transparent 65%);pointer-events:none;"></div>' +
      '<div style="position:relative;display:flex;flex-direction:column;height:100%;">' +
        '<div style="width:54px;height:54px;border-radius:16px;background:' + e.iconBg + ';color:' + e.iconFg + ';display:grid;place-items:center;margin-bottom:18px;">' + ic(e.icon, 26) + '</div>' +
        '<div style="font-size:23px;font-weight:500;color:' + titleC + ';">' + esc(e.titel) + '</div>' +
        '<div style="font-size:13px;color:' + subC + ';margin:3px 0 14px;">' + esc(e.tag) + '</div>' +
        '<p style="font-size:14px;line-height:1.55;color:' + bodyC + ';margin:0 0 16px;">' + esc(e.desc) + '</p>' +
        '<div style="display:flex;flex-direction:column;gap:9px;margin-bottom:22px;">' +
          e.points.map(function (p) { return '<div style="display:flex;gap:9px;align-items:flex-start;font-size:13px;color:' + bodyC + ';"><span style="color:' + checkC + ';flex:none;margin-top:1px;">' + ic('check', 15) + '</span>' + esc(p) + '</div>'; }).join('') +
        '</div>' +
        '<div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;">' +
          '<span style="font-size:14px;font-weight:600;color:' + titleC + ';">Open ' + esc(e.titel) + '</span>' +
          '<span style="width:38px;height:38px;border-radius:11px;background:' + ctaBg + ';color:' + ctaFg + ';display:grid;place-items:center;">' + ic('arrow-right', 18) + '</span>' +
        '</div>' +
      '</div></a>';
  }
  function hubView() {
    var naam = nameOf(S.email);
    var initial = (naam[0] || '2').toUpperCase();
    var header = '<header style="display:flex;align-items:center;gap:16px;padding:22px clamp(16px,4vw,40px);">' +
      '<img src="assets/Logo-neg.svg" style="height:26px;" alt="27">' +
      '<div style="width:1px;height:24px;background:rgba(247,243,234,.16);"></div>' +
      '<span style="font-size:14px;color:rgba(247,243,234,.7);">Portaal</span>' +
      '<div style="margin-left:auto;display:flex;align-items:center;gap:14px;">' +
        '<span style="display:none;" data-wide="1"></span>' +
        '<div style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--brand-lemon-lime);background:rgba(209,242,76,.1);border-radius:999px;padding:6px 12px;">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:var(--brand-lemon-lime);box-shadow:0 0 0 0 rgba(209,242,76,.6);animation:pulse 2s infinite;"></span>Alle systemen operationeel</div>' +
        '<div style="display:flex;align-items:center;gap:9px;">' +
          '<div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--brand-deep-blue),var(--brand-sky-blue));display:grid;place-items:center;font-weight:600;font-size:14px;color:#fff;">' + esc(initial) + '</div>' +
          '<button class="p-btn" data-act="logout" title="Afmelden" style="background:rgba(247,243,234,.08);border:none;color:rgba(247,243,234,.7);width:34px;height:34px;border-radius:10px;display:grid;place-items:center;">' + ic('log-out', 17) + '</button>' +
        '</div></div></header>' +
      '<style>@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(209,242,76,.6)}70%{box-shadow:0 0 0 7px rgba(209,242,76,0)}100%{box-shadow:0 0 0 0 rgba(209,242,76,0)}}</style>';
    var glows = '<div style="position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0;">' +
      '<div style="position:absolute;top:-12%;right:-8%;width:55vw;height:55vw;background:radial-gradient(circle,rgba(40,175,249,.14),transparent 62%);"></div>' +
      '<div style="position:absolute;bottom:-16%;left:-12%;width:50vw;height:50vw;background:radial-gradient(circle,rgba(209,242,76,.07),transparent 62%);"></div></div>';
    var intro = '<div style="position:relative;z-index:1;padding:8px clamp(16px,4vw,40px) 0;max-width:1200px;margin:0 auto;width:100%;">' +
      '<div style="font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:var(--brand-sky-blue);margin-bottom:10px;">Welkom terug, ' + esc(naam) + '</div>' +
      '<h1 style="font-size:clamp(38px,6vw,54px);font-weight:200;line-height:1.05;margin:0 0 14px;">Kies je <span style="font-weight:500;">omgeving</span>.</h1>' +
      '<p style="font-size:15.5px;line-height:1.6;color:rgba(247,243,234,.66);max-width:62ch;margin:0 0 30px;">Eén sessie voor het hele platform. Wissel altijd tussen 27CRM, 27Productie, 27HR en 27Finance via de schakelaar in elke omgeving, zonder opnieuw aan te melden.</p>' +
      '</div>';
    var grid = '<div style="position:relative;z-index:1;padding:0 clamp(16px,4vw,40px) 40px;max-width:1200px;margin:0 auto;width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px;">' +
      ENVS.map(card).join('') + '</div>';
    var footer = '<footer style="position:relative;z-index:1;border-top:1px solid rgba(247,243,234,.08);padding:18px clamp(16px,4vw,40px);max-width:1200px;margin:0 auto;width:100%;font-family:var(--font-mono);font-size:12px;color:rgba(247,243,234,.4);">27 automations · werkplek voor Studio 27, 27A en ZVD</footer>';
    return glows + '<div style="position:relative;min-height:100vh;display:flex;flex-direction:column;">' + header + intro + grid + footer + '</div>';
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'google') { S.err = ''; render(); if (PREVIEW) { S.phase = 'ready'; render(); return; }
      try {
        if (!window.S27TeamAuth || !window.S27TeamAuth.google) { S.err = 'De inlogmodule laadde niet, herlaad de pagina (Cmd+Shift+R).'; render(); return; }
        var p = window.S27TeamAuth.google();
        if (p && p.catch) p.catch(function (e) { S.err = 'Aanmelden lukte niet' + (e && e.code ? ' (' + e.code + ')' : (e && e.message ? ': ' + e.message : '')) + '. Probeer opnieuw.'; render(); });
      } catch (x) { S.err = 'Aanmelden lukte niet (' + ((x && (x.code || x.message)) || x) + ').'; render(); } }
    else if (act === 'logout') { if (PREVIEW) { S.phase = 'signed_out'; render(); return; } try { window.S27TeamAuth.logout(); } catch (x) {} }
  });

  /* ---------- boot ----------
   * BELANGRIJK: auth.js is een module-script (uitgesteld) en draait dus NA dit
   * klassieke app.js. We starten daarom pas op DOMContentLoaded, anders bestaat
   * window.S27TeamAuth nog niet en blijft Firebase ongeladen (fb.GoogleAuthProvider
   * is not a constructor). Zelfde patroon als het HR-portaal. */
  function boot() {
    render();
    if (PREVIEW) return;
    if (!window.S27TeamAuth || !window.S27TeamAuth.init) { S.phase = 'signed_out'; S.err = 'De inlogmodule laadde niet, herlaad de pagina (Cmd+Shift+R).'; render(); return; }
    try {
      window.S27TeamAuth.subscribe(function (st) {
        S.phase = st.phase; S.email = st.email || '';
        S.err = st.error || '';   // toon de echte Firebase-reden (domein/popup/2FA)
        // ingelogd en er was een terugkeerpad -> meteen naar de gewenste pagina
        if (st.phase === 'ready' && safeNext(NEXT)) { location.replace(safeNext(NEXT)); return; }
        render();
      });
      window.S27TeamAuth.init({ gatewayBase: GATEWAY });
    } catch (e) { S.phase = 'signed_out'; S.err = 'Inlogmodule-fout: ' + ((e && e.message) || e); render(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
