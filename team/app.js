/* Studio 27 Teamportaal — frontend-logica (vanilla). Golf 0+1.
 * Login (Firebase staff-SSO) → teamMe (identiteit + roster) → Home / Mijn planning /
 * Collega's. Latere golven (aanvragen, payroll, berichten, AI) staan als 'binnenkort'. */
(function () {
  'use strict';
  var GATEWAY = 'https://s27-portal-gateway-v2.studio27marketing.workers.dev';
  var $ = function (id) { return document.getElementById(id); };
  var state = { me: null, roster: [], email: '', route: 'home', taken: null };

  var MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  var DISC_COLOR = {
    video_fotografie: '#9441DB', webdesign: '#3083DC', social: '#d6489b', ads: '#e8853a',
    seo: '#34b27b', branding: '#e8b93a', strategie: '#6b46c1', copywriting: '#2563eb',
    automation: '#0d9488', projectmanagement: '#8b86a3'
  };
  var DISC_LABEL = {
    video_fotografie: 'Video & fotografie', webdesign: 'Webdesign', social: 'Social media',
    ads: 'Adverteren', seo: 'SEO', branding: 'Branding', strategie: 'Strategie',
    copywriting: 'Copywriting', automation: 'Automation', projectmanagement: 'PM', opleiding: 'Opleiding'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function voornaam(n) { return String(n || '').split(' ')[0] || n; }
  function initialen(n) { var p = String(n || '').trim().split(/\s+/); return ((p[0] || ' ')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
  function groet() { var h = new Date().getHours(); return h < 6 ? 'Goeienacht' : h < 12 ? 'Goeiemorgen' : h < 18 ? 'Goeiemiddag' : 'Goeienavond'; }
  function vandaagLang() { var d = new Date(); var dows = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']; return dows[d.getDay()] + ' ' + d.getDate() + ' ' + ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'][d.getMonth()]; }
  function dueLabel(ymd) { if (!ymd) return ''; var p = ymd.split('-'); return (+p[2]) + ' ' + MONTHS[(+p[1]) - 1]; }
  function todayYmd() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /* ---- API ---- */
  async function api(endpoint, body) {
    var t = await window.S27TeamAuth.token();
    if (!t) throw new Error('Niet ingelogd.');
    var res = await fetch(GATEWAY + '/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
      body: JSON.stringify(body || {})
    });
    var txt = await res.text(); var data; try { data = JSON.parse(txt); } catch (e) { data = { _raw: txt }; }
    if (res.status === 401) { window.S27TeamAuth.logout(); throw new Error('Sessie verlopen.'); }
    return data;
  }

  /* ---- nav ---- */
  var NAV = [
    { k: 'home', ic: '🏠', label: 'Home' },
    { k: 'planning', ic: '🗓️', label: 'Mijn planning' },
    { k: 'collega', ic: '👥', label: "Collega's" },
    { k: 'aanvragen', ic: '⚡', label: 'Aanvragen', soon: true },
    { k: 'berichten', ic: '💬', label: 'Berichten', soon: true },
    { k: 'payroll', ic: '🌴', label: 'Verlof', soon: true },
    { k: 'ai', ic: '✨', label: 'AI-planning', soon: true }
  ];
  function renderNav() {
    $('nav').innerHTML = NAV.map(function (n) {
      return '<button class="nav-it' + (state.route === n.k ? ' on' : '') + '" data-k="' + n.k + '">' +
        '<span class="ic">' + n.ic + '</span>' + esc(n.label) +
        (n.soon ? '<span class="soon">binnenkort</span>' : '') + '</button>';
    }).join('');
    Array.prototype.forEach.call($('nav').children, function (b) {
      b.onclick = function () { go(b.getAttribute('data-k')); closeSidebar(); };
    });
    $('side-me').innerHTML = esc(state.me.naam) + '<small>' + esc(state.email) + '</small>';
  }
  function go(route) { state.route = route; if (location.hash !== '#' + route) location.hash = route; renderNav(); render(); }

  /* ---- render dispatch ---- */
  function render() {
    var titles = { home: 'Home', planning: 'Mijn planning', collega: "Collega's", aanvragen: 'Aanvragen', berichten: 'Berichten', payroll: 'Verlof', ai: 'AI-planning' };
    $('topbar-title').textContent = titles[state.route] || 'Teamportaal';
    $('topbar-right').innerHTML = '';
    var page = $('page');
    if (state.route === 'home') return renderHome(page);
    if (state.route === 'planning') return renderPlanning(page, null);
    if (state.route === 'collega') return renderCollega(page);
    return renderSoon(page, state.route);
  }

  /* ---- task card ---- */
  function taskCard(t, opts) {
    opts = opts || {};
    var disc = DISC_COLOR[t.discipline] || '#8b86a3';
    var due = '';
    if (opts.showDue !== false && t.due_ymd) {
      var cls = t.due_ymd < todayYmd() ? ' laat' : (t.due_ymd === todayYmd() ? ' vandaag' : '');
      due = '<div class="tk-due' + cls + '">' + dueLabel(t.due_ymd) + '<small>deadline</small></div>';
    }
    var prio = (t.prioriteit === 'urgent' || t.prioriteit === 'high') ? '<span class="chip prio-' + t.prioriteit + '">' + (t.prioriteit === 'urgent' ? 'urgent' : 'hoog') + '</span>' : '';
    var meta = [];
    if (t.bedrijf) meta.push('<span class="chip">' + esc(t.bedrijf) + '</span>');
    if (t.discipline && DISC_LABEL[t.discipline]) meta.push('<span class="chip">' + esc(DISC_LABEL[t.discipline]) + '</span>');
    meta.push('<span class="chip st-' + t.status.key + '">' + esc(t.status.label) + '</span>');
    if (prio) meta.push(prio);
    return '<a class="task" href="' + esc(t.url || '#') + '" target="_blank" rel="noopener">' +
      '<span class="tk-disc" style="background:' + disc + '"></span>' +
      '<div class="tk-main"><div class="tk-naam">' + esc(t.naam) + '</div><div class="tk-meta">' + meta.join('') + '</div></div>' +
      due + '</a>';
  }
  function tlist(arr, emptyMsg, opts) {
    if (!arr || !arr.length) return '<div class="empty">' + esc(emptyMsg) + '</div>';
    return '<div class="tlist">' + arr.map(function (t) { return taskCard(t, opts); }).join('') + '</div>';
  }

  /* ---- HOME (#8: vandaag/morgen kort + duidelijk) ---- */
  async function renderHome(page) {
    page.innerHTML = '<p class="hi">' + groet() + ', ' + esc(voornaam(state.me.naam)) + ' 👋</p>' +
      '<p class="subtle">' + esc(vandaagLang()) + '</p><div class="empty">Je planning laden…</div>';
    var d;
    try { d = await api('teamTaken', {}); } catch (e) { page.querySelector('.empty').textContent = 'Kon je planning niet laden.'; return; }
    if (!d.ok) { page.querySelector('.empty').textContent = d.error === 'no_member' ? 'Je account is nog niet aan ClickUp gekoppeld.' : 'Kon je planning niet laden.'; return; }
    state.taken = d;
    var c = d.tellingen;
    var html = '<p class="hi">' + groet() + ', ' + esc(voornaam(state.me.naam)) + ' 👋</p>' +
      '<p class="subtle">' + esc(vandaagLang()) + '</p>' +
      '<div class="row">' +
      stat(c.vandaag, 'Vandaag', c.vandaag ? 'warn' : 'good') +
      stat(c.morgen, 'Morgen', '') +
      stat(c.te_laat, 'Te laat', c.te_laat ? 'bad' : 'good') +
      stat(c.te_doen, 'Nog te plannen', '') +
      '</div>' +
      '<div class="sec"><div class="sec-h"><h2>Vandaag</h2><span class="cnt">' + c.vandaag + '</span></div>' +
      tlist(d.vandaag, 'Niets met deadline vandaag. 🎉', { showDue: false }) + '</div>' +
      '<div class="sec"><div class="sec-h"><h2>Morgen</h2><span class="cnt">' + c.morgen + '</span></div>' +
      tlist(d.morgen, 'Niets gepland voor morgen.', { showDue: false }) + '</div>';
    if (d.te_laat.length) {
      html += '<div class="sec"><div class="sec-h"><h2 style="color:var(--s27-red)">⚠ Over de deadline</h2><span class="cnt">' + c.te_laat + '</span></div>' +
        tlist(d.te_laat.slice(0, 8), '') + (d.te_laat.length > 8 ? '<p class="micro" style="margin-top:8px">+ ' + (d.te_laat.length - 8) + ' meer — zie Mijn planning</p>' : '') + '</div>';
    }
    page.innerHTML = html;
  }
  function stat(n, label, cls) { return '<div class="stat ' + (cls || '') + '"><div class="n">' + n + '</div><div class="l">' + esc(label) + '</div></div>'; }

  /* ---- MIJN PLANNING (#1, #2) ---- */
  var planFilter = 'alles';
  async function renderPlanning(page, memberId) {
    var who = memberId ? null : state.me;
    page.innerHTML = (memberId ? '<button class="backlink" id="back">← Terug naar collega\'s</button>' : '') + '<div class="empty">Planning laden…</div>';
    if (memberId) $('back').onclick = function () { go('collega'); };
    var d;
    try { d = await api('teamTaken', memberId ? { member_id: memberId } : {}); } catch (e) { page.querySelector('.empty').textContent = 'Kon de planning niet laden.'; return; }
    if (!d.ok) { page.querySelector('.empty').textContent = 'Kon de planning niet laden.'; return; }
    var c = d.tellingen;
    var head = memberId ? ('<button class="backlink" id="back2">← Terug naar collega\'s</button><p class="hi">Planning van ' + esc(d.target.naam) + '</p>') :
      ('<p class="hi">Mijn planning</p>');
    var sub = '<p class="subtle">' + c.totaal + ' actieve taken · ' + c.ingepland + ' ingepland · ' + c.te_doen + ' nog te plannen · ' + c.te_laat + ' te laat</p>';
    var tabs = '<div class="tabs">' +
      tab('alles', 'Alles', c.totaal) + tab('ingepland', 'Ingepland', c.ingepland) +
      tab('te_doen', 'Nog te plannen', c.te_doen) + tab('te_laat', 'Te laat', c.te_laat) + '</div>';
    var list;
    if (planFilter === 'ingepland') list = tlist(d.ingepland, 'Niets ingepland.');
    else if (planFilter === 'te_doen') list = tlist(d.te_doen, 'Niets staat te wachten.');
    else if (planFilter === 'te_laat') list = tlist(d.te_laat, 'Niks te laat. 👌');
    else list = tlist(d.ingepland.concat(d.te_doen), 'Geen taken.');
    page.innerHTML = head + sub + tabs + '<div id="plist">' + list + '</div>';
    if (memberId && $('back2')) $('back2').onclick = function () { go('collega'); };
    Array.prototype.forEach.call(page.querySelectorAll('.tab'), function (b) {
      b.onclick = function () { planFilter = b.getAttribute('data-f'); renderPlanning(page, memberId); };
    });
  }
  function tab(f, label, n) { return '<button class="tab' + (planFilter === f ? ' on' : '') + '" data-f="' + f + '">' + esc(label) + '<span class="b">' + n + '</span></button>'; }

  /* ---- COLLEGA'S (#6) ---- */
  function renderCollega(page) {
    page.innerHTML = '<p class="hi">Het team</p><p class="subtle">Klik op een collega om hun planning te bekijken. Werk wordt vaak onderling overgenomen — zo zie je meteen wie ruimte heeft.</p>' +
      '<div class="grid-cards">' + state.roster.map(function (m) {
        return '<button class="member" data-id="' + m.id + '"><span class="avatar">' + esc(initialen(m.naam)) + '</span>' +
          '<div><div class="m-naam">' + esc(voornaam(m.naam)) + '</div><div class="m-rol">' + (m.pool ? '📷 Content creator' : 'Team') + '</div></div></button>';
      }).join('') + '</div>';
    Array.prototype.forEach.call(page.querySelectorAll('.member'), function (b) {
      b.onclick = function () { state.route = 'collega'; renderNav(); renderPlanning($('page'), Number(b.getAttribute('data-id'))); $('topbar-title').textContent = "Collega's"; };
    });
  }

  /* ---- placeholders (#3,4,5,7) ---- */
  function renderSoon(page, route) {
    var info = {
      aanvragen: ['⚡ Aanvragen buiten kantooruren', 'Klanten kunnen straks shoots/meetings buiten de standaarduren aanvragen. Hier zie je ze binnenkomen en geef je aan of je kan — de klant krijgt automatisch je antwoord.'],
      berichten: ['💬 Klantberichten', 'Berichten van klanten op projecten waar jij de lead bent, op één plek — met een rood bolletje wanneer er op jou gewacht wordt.'],
      payroll: ['🌴 Verlof aanvragen', 'Je vakantie, recup en ziekte bekijken en nieuwe aanvragen indienen — rechtstreeks in ClickUp, zonder gedoe.'],
      ai: ['✨ AI-dagplanning', 'Eén klik en de AI stelt de meest logische volgorde voor je dag voor, op basis van je deadlines, tijdsinschattingen en agenda.']
    }[route] || ['Binnenkort', ''];
    page.innerHTML = '<div class="soon-card"><h3>' + esc(info[0]) + '</h3><p>' + esc(info[1]) + '</p><p class="micro" style="margin-top:14px">Komt in een volgende golf van het teamportaal.</p></div>';
  }

  /* ---- sidebar (mobiel) ---- */
  function openSidebar() { $('sidebar').classList.add('open'); $('scrim').hidden = false; }
  function closeSidebar() { $('sidebar').classList.remove('open'); $('scrim').hidden = true; }

  /* ---- boot ---- */
  function showLogin(err) { $('boot').hidden = true; $('app').hidden = true; $('login').hidden = false; $('login-err').textContent = err || ''; }
  async function boot() {
    $('boot').hidden = true; $('login').hidden = true; $('app').hidden = false;
    var d;
    try { d = await api('teamMe', {}); } catch (e) { $('page').innerHTML = '<div class="empty">Kon het teamportaal niet laden. Probeer opnieuw.</div>'; return; }
    if (!d.ok) {
      $('app').hidden = true; $('login').hidden = false; $('boot').hidden = true;
      $('login-sub').textContent = d.message || 'Geen teamtoegang.';
      $('login-err').textContent = ''; $('btn-google').style.display = 'none';
      return;
    }
    state.me = d.me; state.roster = d.roster || [];
    var h = (location.hash || '').replace('#', ''); if (NAV.some(function (n) { return n.k === h; })) state.route = h;
    renderNav(); render();
  }

  // auth-flow
  window.addEventListener('DOMContentLoaded', function () {
    $('btn-google').onclick = function () { window.S27TeamAuth.google(); };
    $('btn-logout').onclick = function () { window.S27TeamAuth.logout(); };
    $('hamb').onclick = openSidebar; $('scrim').onclick = closeSidebar;
    window.addEventListener('hashchange', function () { var h = (location.hash || '').replace('#', ''); if (NAV.some(function (n) { return n.k === h; }) && h !== state.route) { state.route = h; renderNav(); render(); } });

    window.S27TeamAuth.subscribe(function (e) {
      if (e.phase === 'loading') { $('boot').hidden = false; $('boot-msg').textContent = 'Even aanmelden…'; }
      else if (e.phase === 'signed_out') { showLogin(e.error); }
      else if (e.phase === 'no_access') { showLogin('Dit account (' + (e.email || '') + ') hoort niet bij Studio 27. Log in met je @studio27.be-account.'); }
      else if (e.phase === 'ready') { state.email = e.email || ''; $('boot').hidden = false; $('boot-msg').textContent = 'Teamportaal laden…'; boot(); }
    });
    window.S27TeamAuth.init({ gatewayBase: GATEWAY });
  });

  // service worker
  if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js?v=1').catch(function () { }); }); }
})();
