/* Studio 27 werkplek shell bridge.
   No visual rewrite: this standardizes return context, auth subscribers and
   personal identity for existing agenda/chat topbar components. */
(function () {
  if (window.S27Shell) return;

  var RETURN_KEY = 's27_shell_return';
  var ENV_PATHS = ['/crm/', '/hr/', '/finance/', '/productie/'];
  var identity = { name: '', email: '' };
  var KNOWN_PEOPLE = {
    'vincent@studio27.be': 'Vincent Verleije',
    'anouk@studio27.be': 'Anouk de Hoon',
    'griet@studio27.be': 'Griet Smans',
    'ilke@studio27.be': 'Ilke Meeusen',
  };
  var observer = null;

  function now() { return Date.now ? Date.now() : new Date().getTime(); }
  function safeJson(v) { try { return JSON.parse(v || 'null'); } catch (e) { return null; } }
  function firstName(email) {
    var p = String(email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
    return p ? p.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : '';
  }
  function nameFromState(st) {
    var u = st && st.user;
    var email = String((st && st.email) || (u && u.email) || '').trim().toLowerCase();
    return String(KNOWN_PEOPLE[email] || (u && u.displayName) || (st && st.naam) || firstName(email) || '').trim();
  }
  function setReturn(href) {
    try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ href: href || location.href, at: now() })); } catch (e) { /* */ }
  }
  function getReturn() {
    var r = null; try { r = safeJson(sessionStorage.getItem(RETURN_KEY)); } catch (e) { r = null; }
    if (!r || !r.href || (now() - (Number(r.at) || 0)) > 12 * 3600 * 1000) return null;
    return r.href;
  }
  function applyIdentity(name, email) {
    if (name) identity.name = name;
    if (email) identity.email = email;
    var who = identity.name || firstName(identity.email) || 'Teamlid';
    try {
      document.querySelectorAll('team-chat,agenda-panel').forEach(function (el) {
        if (!el) return;
        el.setAttribute('me', who);
        try { el.me = who; if (typeof el.render === 'function') el.render(); } catch (e) { /* */ }
        if (identity.email) el.setAttribute('email', identity.email);
      });
    } catch (e) { /* */ }
    try {
      document.querySelectorAll('[data-s27-user-name]').forEach(function (el) { el.textContent = who; });
    } catch (e) { /* */ }
  }
  function sameOriginUrl(href) {
    try { return new URL(href, location.href); } catch (e) { return null; }
  }
  function isEnvUrl(url) {
    if (!url || url.origin !== location.origin) return false;
    return ENV_PATHS.some(function (p) { return url.pathname === p || url.pathname.indexOf(p) === 0; });
  }
  function productieUrl(hash) {
    var q = '';
    try {
      var cur = new URLSearchParams(location.search);
      var keep = new URLSearchParams();
      ['preview', 'demo'].forEach(function (k) { if (cur.get(k)) keep.set(k, cur.get(k)); });
      q = keep.toString();
    } catch (e) { q = ''; }
    return '/productie/' + (q ? ('?' + q) : '') + (hash || '');
  }
  function openAgendaPanel(el) {
    setReturn(location.href);
    try { location.href = productieUrl('#agenda'); } catch (e) { location.href = '/productie/'; }
  }
  function standardizeAgendaPanel(el) {
    if (!el || el.__s27ShellAgendaPatched || el.hasAttribute('inline')) return;
    var legacy = null;
    try { legacy = el.onNav; } catch (e) { legacy = null; }
    var open = function () { openAgendaPanel(el); };
    try { delete el.onNav; } catch (e) { /* */ }
    try {
      Object.defineProperty(el, 'onNav', {
        configurable: true,
        get: function () { return open; },
        set: function (fn) { legacy = typeof fn === 'function' ? fn : legacy; },
      });
      el.__s27ShellAgendaPatched = true;
      el.__s27LegacyAgendaNav = legacy || null;
    } catch (e) {
      el.onNav = open;
      el.__s27ShellAgendaPatched = true;
    }
  }
  function standardizeWeekplannerLinks() {
    try {
      document.querySelectorAll('a[href*="/productie/?go=weekplanner"]').forEach(function (a) {
        a.setAttribute('href', '/productie/#weekplanner');
      });
    } catch (e) { /* */ }
  }
  function standardizeControls() {
    try {
      document.querySelectorAll('agenda-panel').forEach(standardizeAgendaPanel);
    } catch (e) { /* */ }
    standardizeWeekplannerLinks();
  }
  function observeControls() {
    standardizeControls();
    if (observer || !window.MutationObserver || !document.documentElement) return;
    observer = new MutationObserver(function () { standardizeControls(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    var count = 0;
    var timer = setInterval(function () {
      standardizeControls();
      if (++count > 80) clearInterval(timer);
    }, 250);
  }
  function patchAuth() {
    var A = window.S27TeamAuth;
    if (!A || A.__s27ShellMultiSub || !A.subscribe) return false;
    var originalSubscribe = A.subscribe.bind(A);
    var subs = [];
    A.subscribe = function (cb) {
      if (typeof cb === 'function' && subs.indexOf(cb) < 0) subs.push(cb);
      originalSubscribe(function (state) {
        subs.slice().forEach(function (fn) {
          try { fn(state); } catch (e) { setTimeout(function () { throw e; }, 0); }
        });
      });
    };
    A.__s27ShellMultiSub = true;
    A.subscribe(function (st) {
      if (st && st.phase === 'ready') applyIdentity(nameFromState(st), st.email);
    });
    return true;
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var url = sameOriginUrl(a.getAttribute('href'));
    if (isEnvUrl(url)) setReturn(location.href);
  }, true);

  window.S27Shell = {
    identity: identity,
    setReturn: setReturn,
    getReturn: getReturn,
    back: function (fallback) {
      var href = getReturn() || fallback || '/';
      try { location.href = href; } catch (e) { location.href = '/'; }
    },
    openWeekplanner: function () {
      setReturn(location.href);
      try { location.href = productieUrl('#weekplanner'); } catch (e) { location.href = '/productie/'; }
    },
    openAgenda: function () {
      setReturn(location.href);
      try { location.href = productieUrl('#agenda'); } catch (e) { location.href = '/productie/'; }
    },
    applyIdentity: applyIdentity,
    standardizeControls: standardizeControls,
  };

  if (!patchAuth()) {
    var tries = 0;
    var timer = setInterval(function () {
      if (patchAuth() || tries++ > 80) clearInterval(timer);
    }, 80);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { applyIdentity(); observeControls(); });
  else { applyIdentity(); observeControls(); }
})();
