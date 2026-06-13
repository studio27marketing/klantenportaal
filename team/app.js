/* Studio 27 Teamportaal — frontend (vanilla, huisstijl van het klantportaal).
 * Doel: alle info om projecten zelfstandig af te ronden zonder PM. Home / Mijn
 * planning / Collega's / Verlof + projectdetail (briefing, bestanden, subtaken,
 * status doorzetten, klant-/teamchat). Latere golven: Aanvragen / Berichten / AI. */
(function () {
  'use strict';
  var GATEWAY = 'https://s27-portal-gateway-v2.studio27marketing.workers.dev';
  var KLANTPORTAAL = 'https://portaal.studio27.be';
  var $ = function (id) { return document.getElementById(id); };
  var state = { me: null, roster: [], email: '', route: 'home', taken: null, viewMember: null, modal: null };

  var MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  var MONTHS_L = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var DOW = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  var PILL = { to_do: 'pill-todo', in_progress: 'pill-prog', on_hold: 'pill-wait', doorgestuurd: 'pill-sent', done: 'pill-done' };
  var DISC_BR = { video_fotografie: 'br-purple', webdesign: 'br-green', social: 'br-yellow', ads: 'br-orange', seo: 'br-green', branding: 'br-pink', strategie: 'br-blue', copywriting: 'br-blue', automation: 'br-indigo', projectmanagement: 'br-indigo', opleiding: 'br-indigo' };
  var DISC_LABEL = { video_fotografie: 'Video & fotografie', webdesign: 'Webdesign', social: 'Social media', ads: 'Adverteren', seo: 'SEO', branding: 'Branding', strategie: 'Strategie', copywriting: 'Copywriting', automation: 'Automation', projectmanagement: 'Projectmanagement', opleiding: 'Opleiding' };
  var STATUSSEN = [{ k: 'to do', l: 'Te doen' }, { k: 'in progress', l: 'In productie' }, { k: 'on hold', l: 'On hold' }, { k: 'doorgestuurd', l: 'Klaar voor review' }];

  var IC = {
    home: '<path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10"/>',
    cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    team: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    palm: '<path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l-1 1 1 1M13 8c0-2.76 2.46-5 5.5-5S24 5.24 24 8h-2l1 1-1 1M13 8c2.76 0 5 2.46 5 5.5S15.76 19 13 19M13 8c-2.76 0-5 2.46-5 5.5S10.24 19 13 19M13 8v13"/>',
    bolt: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>',
    chat: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    euro: '<path d="M15 8a4.5 4.5 0 1 0 0 8M4 11h7M4 14h7"/>',
    chart: '<path d="M3 3v18h18M7 14l3-3 3 2 5-6"/>'
  };
  function svgIc(p, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 20) + '" height="' + (w || 20) + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function voornaam(n) { return String(n || '').split(' ')[0] || n; }
  function initialen(n) { var p = String(n || '').trim().split(/\s+/); return ((p[0] || ' ')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
  function groet() { var h = new Date().getHours(); return h < 6 ? 'Goeienacht' : h < 12 ? 'Goeiemorgen' : h < 18 ? 'Goeiemiddag' : 'Goeienavond'; }
  function vandaagLang() { var d = new Date(); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_L[d.getMonth()]; }
  function dueLabel(ymd) { if (!ymd) return ''; var p = ymd.split('-'); return (+p[2]) + ' ' + MONTHS[(+p[1]) - 1]; }
  function todayYmd() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function pillHtml(st) { return '<span class="pill ' + (PILL[st.key] || 'pill-todo') + '"><span class="pdot"></span>' + esc(st.label) + '</span>'; }
  function discBr(d) { return DISC_BR[d] || 'br-blue'; }
  function eur(n) { return '€' + Number(n || 0).toLocaleString('nl-BE'); }
  function pct(v, max) { return Math.max(2, Math.round((v / (max || 1)) * 100)); }
  function monthLabel(mk) { var p = mk.split('-'); return MONTHS[(+p[1]) - 1] + ' ' + p[0].slice(2); }

  async function api(endpoint, body) {
    var t = await window.S27TeamAuth.token();
    if (!t) throw new Error('Niet ingelogd.');
    var res = await fetch(GATEWAY + '/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body || {}) });
    var txt = await res.text(); var data; try { data = JSON.parse(txt); } catch (e) { data = { _raw: txt }; }
    if (res.status === 401) { window.S27TeamAuth.logout(); throw new Error('Sessie verlopen.'); }
    return data;
  }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2400); }

  /* ---- nav (rol-afhankelijk) ---- */
  function navGroups() {
    var p = state.perms || {};
    var g = [{ label: 'Overzicht', items: [{ k: 'home', br: 'br-blue', label: 'Home', ic: IC.home }, { k: 'planning', br: 'br-purple', label: 'Mijn planning', ic: IC.cal }] }];
    if (p.account) g.push({ label: 'Accountbeheer', items: [{ k: 'account', br: 'br-pink', label: 'Alle projecten', ic: IC.grid }] });
    if (p.finance) g.push({ label: 'Directie', items: [{ k: 'cijfers', br: 'br-green', label: 'Cijfers & omzet', ic: IC.euro }] });
    g.push({ label: 'Team', items: [{ k: 'collega', br: 'br-blue', label: "Collega's", ic: IC.team }] });
    g.push({ label: 'Persoonlijk', items: [{ k: 'verlof', br: 'br-green', label: 'Verlof', ic: IC.palm }] });
    g.push({ label: 'Binnenkort', items: [{ k: 'aanvragen', br: 'br-orange', label: 'Aanvragen', ic: IC.bolt, soon: 1 }, { k: 'berichten', br: 'br-pink', label: 'Berichten', ic: IC.chat, soon: 1 }, { k: 'ai', br: 'br-indigo', label: 'AI-planning', ic: IC.spark, soon: 1 }] });
    return g;
  }
  function routeExists(k) { return navGroups().some(function (g) { return g.items.some(function (n) { return n.k === k; }); }); }
  function renderNav() {
    $('nav').innerHTML = navGroups().map(function (g) {
      return '<div class="sb-group"><div class="sb-glabel">' + esc(g.label) + '</div>' + g.items.map(function (n) {
        return '<button class="sb-item ' + n.br + (state.route === n.k ? ' active' : '') + '" data-k="' + n.k + '">' +
          '<span class="sb-ic">' + svgIc(n.ic) + '</span><span class="sb-label">' + esc(n.label) + '</span>' +
          (n.soon ? '<span class="sb-badge" style="background:var(--s27-purple-soft);color:var(--s27-purple-ink);font-size:9px;letter-spacing:.04em">SOON</span>' : '') + '</button>';
      }).join('') + '</div>';
    }).join('');
    Array.prototype.forEach.call($('nav').querySelectorAll('.sb-item'), function (b) { b.onclick = function () { go(b.getAttribute('data-k')); closeSidebar(); }; });
    var roleLabel = { admin: 'Zaakvoerder', sales: 'Sales', accountmanager: 'Accountmanager' }[state.role] || '';
    var roleChip = roleLabel ? '<span class="role-chip role-' + state.role + '">' + roleLabel + '</span>' : '';
    $('sbFoot').innerHTML = '<div class="sb-me"><span class="av">' + esc(initialen(state.me.naam)) + '</span><span class="tx"><b>' + esc(state.me.naam) + '</b><span>' + (roleChip || esc(state.email)) + '</span></span>' +
      '<button class="sb-logout" id="lo" title="Uitloggen"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button></div>';
    $('lo').onclick = function () { window.S27TeamAuth.logout(); };
  }
  function go(route) { state.route = route; state.viewMember = null; if (location.hash !== '#' + route) location.hash = route; renderNav(); render(); }

  function render() {
    var titles = { home: 'Home', planning: 'Mijn planning', account: 'Alle projecten', cijfers: 'Cijfers & omzet', collega: "Collega's", verlof: 'Verlof', aanvragen: 'Aanvragen', berichten: 'Berichten', ai: 'AI-planning' };
    $('crumb').textContent = titles[state.route] || 'Teamportaal';
    var page = $('page'); page.scrollTop = 0;
    if (state.route === 'home') return renderHome(page);
    if (state.route === 'planning') return renderPlanning(page, null);
    if (state.route === 'account') return renderAccount(page);
    if (state.route === 'cijfers') return renderCijfers(page);
    if (state.route === 'collega') return renderCollega(page);
    if (state.route === 'verlof') return renderVerlof(page);
    return renderSoon(page, state.route);
  }

  /* ---- proj-row ---- */
  function projRow(t, opts) {
    opts = opts || {};
    var disc = DISC_LABEL[t.discipline] || t.discipline || '';
    var sub = disc + (t.bedrijf ? ' <span class="at">· ' + esc(t.bedrijf) + '</span>' : '');
    var due = '';
    if (opts.showDue !== false && t.due_ymd) { var laat = t.due_ymd < todayYmd() ? ' laat' : ''; due = '<span class="due' + laat + '">' + dueLabel(t.due_ymd) + '<small>deadline</small></span>'; }
    return '<button class="proj-row ' + discBr(t.discipline) + '" data-id="' + esc(t.id) + '">' +
      '<span class="bar"></span>' +
      '<div class="pr-main"><div class="pr-name">' + esc(t.naam) + '</div><div class="pr-disc">' + sub + '</div></div>' +
      pillHtml(t.status) + due +
      '<svg class="arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>';
  }
  function projList(arr, emptyMsg, opts) {
    if (!arr || !arr.length) return '<div class="empty"><p>' + esc(emptyMsg) + '</p></div>';
    var html = '<div class="proj-list">' + arr.map(function (t) { return projRow(t, opts); }).join('') + '</div>';
    return html;
  }
  function wireRows(scope) { Array.prototype.forEach.call(scope.querySelectorAll('.proj-row'), function (b) { b.onclick = function () { openProject(b.getAttribute('data-id')); }; }); }

  /* ---- HOME ---- */
  async function renderHome(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>' + esc(groet()) + ', ' + esc(voornaam(state.me.naam)) + ' 👋</h1><div class="sub">' + esc(vandaagLang()) + '</div></div><div class="empty"><p>Je planning laden…</p></div></div>';
    var d; try { d = await api('teamTaken', {}); } catch (e) { return; }
    if (!d.ok) { page.querySelector('.empty p').textContent = 'Kon je planning niet laden.'; return; }
    state.taken = d; var c = d.tellingen;
    var stat = function (n, l, br) { return '<div class="tstat ' + br + '"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; };
    var html = '<div class="panel active"><div class="t-hero"><h1>' + esc(groet()) + ', ' + esc(voornaam(state.me.naam)) + ' 👋</h1><div class="sub">' + esc(vandaagLang()) + ' · alles wat vandaag telt op één plek</div></div>' +
      '<div class="tstats">' + stat(c.vandaag, 'Vandaag', c.vandaag ? 'br-orange' : 'br-green') + stat(c.morgen, 'Morgen', 'br-blue') + stat(c.te_laat, 'Te laat', c.te_laat ? 'br-orange' : 'br-green') + stat(c.te_doen, 'Te plannen', 'br-purple') + '</div>' +
      sec('Vandaag', c.vandaag) + projList(d.vandaag, 'Niets met een deadline vandaag. 🎉', { showDue: false }) +
      sec('Morgen', c.morgen) + projList(d.morgen, 'Niets gepland voor morgen.', { showDue: false });
    if (d.te_laat.length) html += sec('⚠ Over de deadline', c.te_laat) + projList(d.te_laat.slice(0, 8), '') + (d.te_laat.length > 8 ? '<p class="micro" style="margin-top:8px;color:var(--ink-4)">+ ' + (d.te_laat.length - 8) + ' meer in Mijn planning</p>' : '');
    html += '</div>';
    page.innerHTML = html; wireRows(page);
  }
  function sec(title, n) { return '<div class="section-head"><h2>' + esc(title) + '</h2>' + (n != null ? '<span class="count">' + n + '</span>' : '') + '</div>'; }

  /* ---- MIJN PLANNING / collega-planning ---- */
  var planFilter = 'alles';
  async function renderPlanning(page, memberId) {
    var back = memberId ? '<button class="backlink" id="back"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg> Terug naar collega\'s</button>' : '';
    page.innerHTML = '<div class="panel active">' + back + '<div class="empty"><p>Planning laden…</p></div></div>';
    if (memberId && $('back')) $('back').onclick = function () { go('collega'); };
    var d; try { d = await api('teamTaken', memberId ? { member_id: memberId } : {}); } catch (e) { return; }
    if (!d.ok) { page.querySelector('.empty p').textContent = 'Kon de planning niet laden.'; return; }
    var c = d.tellingen;
    var head = '<div class="t-hero"><h1>' + (memberId ? 'Planning van ' + esc(d.target.naam) : 'Mijn planning') + '</h1><div class="sub">' + c.totaal + ' actieve taken · ' + c.ingepland + ' ingepland · ' + c.te_doen + ' te plannen · ' + c.te_laat + ' te laat</div></div>';
    var fp = function (f, l, n) { return '<button class="fpill' + (planFilter === f ? ' active' : '') + '" data-f="' + f + '">' + l + '<span class="n">' + n + '</span></button>'; };
    var bar = '<div class="filterbar">' + fp('alles', 'Alles', c.totaal) + fp('ingepland', 'Ingepland', c.ingepland) + fp('te_doen', 'Te plannen', c.te_doen) + fp('te_laat', 'Te laat', c.te_laat) + '</div>';
    var arr = planFilter === 'ingepland' ? d.ingepland : planFilter === 'te_doen' ? d.te_doen : planFilter === 'te_laat' ? d.te_laat : d.ingepland.concat(d.te_doen);
    page.innerHTML = '<div class="panel active">' + back + head + bar + '<div id="plist">' + projList(arr, 'Geen taken in deze weergave.') + '</div></div>';
    if (memberId && $('back')) $('back').onclick = function () { go('collega'); };
    Array.prototype.forEach.call(page.querySelectorAll('.fpill'), function (b) { b.onclick = function () { planFilter = b.getAttribute('data-f'); renderPlanning(page, memberId); }; });
    wireRows(page);
  }

  /* ---- COLLEGA'S ---- */
  function renderCollega(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Het team</h1><div class="sub">Klik op een collega om hun planning te bekijken — zo zie je wie ruimte heeft om werk over te nemen.</div></div>' +
      '<div class="tmembers" style="margin-top:18px">' + state.roster.map(function (m) {
        return '<button class="tmember" data-id="' + m.id + '"><span class="av">' + esc(initialen(m.naam)) + '</span><div><div class="nm">' + esc(voornaam(m.naam)) + '</div><div class="rol">' + (m.pool ? '📷 Content creator' : 'Team') + '</div></div></button>';
      }).join('') + '</div></div>';
    Array.prototype.forEach.call(page.querySelectorAll('.tmember'), function (b) {
      b.onclick = function () { state.route = 'collega'; renderNav(); $('crumb').textContent = "Collega's"; renderPlanning($('page'), Number(b.getAttribute('data-id'))); };
    });
  }

  /* ---- ACCOUNT (Ilke/admin): alle lopende projecten per klant ---- */
  async function renderAccount(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Accountbeheer</h1><div class="sub">Laden…</div></div><div class="empty"><p>Projecten + weekplanning ophalen…</p></div></div>';
    var dP = api('teamAllProjects', {}).catch(function () { return null; });
    var hP = api('teamHealth', {}).catch(function () { return null; });
    var d = await dP; var h = await hP;
    if (!d || !d.ok) { page.querySelector('.sub').textContent = (d && d.error === 'forbidden_role') ? 'Geen toegang voor jouw rol.' : 'Kon de projecten niet laden.'; if (page.querySelector('.empty')) page.querySelector('.empty').remove(); return; }
    state.account = d; var t = d.totaal;
    var stat = function (n, l, br) { return '<div class="tstat ' + br + '"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; };
    var healthCard = '';
    if (h && h.ok && h.leden.length) {
      var maxU = Math.max(h.target, Math.max.apply(null, h.leden.map(function (l) { return l.uren; }).concat([1])));
      var rows = h.leden.map(function (l) {
        var w = Math.min(100, Math.round(l.uren / maxU * 100));
        var col = l.uren >= h.target * 0.8 ? 'var(--s27-green)' : (l.uren >= h.target * 0.4 ? 'var(--s27-yellow)' : 'var(--s27-orange)');
        return '<div class="uren-row"><span class="un">' + esc(voornaam(l.naam)) + (l.pool ? ' 📷' : '') + '</span><span class="ut"><i style="width:' + w + '%;background:' + col + '"></i></span><span class="uv">' + l.uren + 'u</span></div>';
      }).join('');
      healthCard = '<div class="fincard"><h3>Deze week · ingeplande uren <span class="micro" style="font-weight:600;color:var(--ink-4)">· richtlijn ' + h.target + 'u/week</span></h3>' + rows +
        '<div class="disclaimer-note" style="margin-top:13px"><span>ⓘ</span><span>' + esc(h.disclaimer) + '</span></div></div>';
    }
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Accountbeheer</h1><div class="sub">Weekplanning van het team + alle lopende projecten — klaar om een klant meteen te helpen.</div></div>' +
      healthCard +
      '<div class="section-head"><h2>Alle lopende projecten</h2></div>' +
      '<div class="tstats" style="grid-template-columns:repeat(3,1fr)">' + stat(t.klanten, 'Klanten met werk', 'br-blue') + stat(t.actief, 'Open taken', 'br-purple') + stat(t.te_laat, 'Over deadline', t.te_laat ? 'br-orange' : 'br-green') + '</div>' +
      '<div class="acc-search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="acc-q" placeholder="Zoek een klant…" autocomplete="off"></div>' +
      '<div id="acc-list">' + accList(d.clients) + '</div></div>';
    $('acc-q').oninput = function () { var q = this.value.toLowerCase(); $('acc-list').innerHTML = accList(d.clients.filter(function (c) { return c.bedrijf.toLowerCase().indexOf(q) >= 0; })); wireAcc(); };
    wireAcc();
  }
  function accList(clients) {
    if (!clients.length) return '<div class="empty"><p>Geen klanten gevonden.</p></div>';
    return clients.map(function (c) {
      var fb = (c.feedback >= 3) ? '<span class="acc-fb" title="Veel feedbackrondes — mogelijk handmatig opvolgen">🔁 ' + c.feedback + '</span>' : '';
      var teLaat = c.te_laat ? '<span class="acc-badge bad">' + c.te_laat + ' te laat</span>' : '';
      var next = c.next_due ? ' · eerstvolgend ' + dueLabel(c.next_due) : '';
      var discs = c.disciplines.slice(0, 5).map(function (dd) { return esc(DISC_LABEL[dd] || dd); }).join(' · ');
      return '<div class="acc-card"><button class="acc-head" data-bid="' + esc(c.bedrijf_id) + '"><span class="acc-sw"></span>' +
        '<div class="acc-main"><div class="acc-nm">' + esc(c.bedrijf) + '</div><div class="acc-subline">' + esc(discs) + next + '</div></div>' +
        '<div class="acc-meta">' + fb + teLaat + '<span class="acc-badge">' + c.active + ' actief</span></div>' +
        '<svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>' +
        '<div class="acc-body" data-bid="' + esc(c.bedrijf_id) + '"></div></div>';
    }).join('');
  }
  function wireAcc() {
    Array.prototype.forEach.call(document.querySelectorAll('.acc-head'), function (h) {
      h.onclick = function () {
        var bid = h.getAttribute('data-bid'); var body = document.querySelector('.acc-body[data-bid="' + bid + '"]');
        var open = h.classList.toggle('open');
        if (open && !body.innerHTML) { var c = state.account.clients.find(function (x) { return x.bedrijf_id === bid; }); if (c) { body.innerHTML = '<div class="proj-list" style="padding:8px 0 6px">' + c.items.map(function (t) { return projRow(t); }).join('') + '</div>'; wireRows(body); } }
        body.classList.toggle('open', open);
      };
    });
  }

  /* ---- CIJFERS (admin/sales): financieel ---- */
  async function renderCijfers(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Cijfers & omzet</h1><div class="sub">Laden…</div></div><div class="empty"><p>Cijfers berekenen… (dit duurt even)</p></div></div>';
    var d; try { d = await api('teamFinance', {}); } catch (e) { d = null; }
    if (!d || !d.ok) { page.querySelector('.sub').textContent = (d && d.error === 'forbidden_role') ? 'Geen toegang voor jouw rol.' : 'Kon de cijfers niet laden.'; if (page.querySelector('.empty')) page.querySelector('.empty').remove(); return; }
    var o = d.offertes;
    var stat = function (n, l, br) { return '<div class="tstat ' + br + '"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; };
    var maxM = Math.max.apply(null, o.maand.map(function (m) { return m.bedrag; }).concat([1]));
    var maandBars = o.maand.map(function (m) { return '<div class="cbar' + (m.bedrag ? '' : ' green') + '"><span class="cbar-l">' + monthLabel(m.maand) + '</span><span class="cbar-t"><i style="width:' + pct(m.bedrag, maxM) + '%"></i></span><span class="cbar-v">' + eur(m.bedrag) + '</span></div>'; }).join('');
    var maxC = Math.max.apply(null, d.categorie.map(function (c) { return c.bedrag; }).concat([1]));
    var catBars = d.categorie.map(function (c) { return '<div class="cbar"><span class="cbar-l">' + esc(c.categorie) + '</span><span class="cbar-t"><i style="width:' + pct(c.bedrag, maxC) + '%"></i></span><span class="cbar-v">' + eur(c.bedrag) + '</span></div>'; }).join('');
    var perPersoon = '';
    if (d.per_persoon && d.per_persoon.length) {
      var maxP = Math.max.apply(null, d.per_persoon.map(function (p) { return p.bedrag; }).concat([1]));
      perPersoon = '<div class="fincard"><h3>Omzet per persoon <span class="micro" style="font-weight:600;color:var(--ink-4)">· taakbudget gedeeld over de assignees</span></h3><div class="cbars">' +
        d.per_persoon.map(function (p) { return '<div class="cbar green"><span class="cbar-l">' + esc(voornaam(p.naam)) + '</span><span class="cbar-t"><i style="width:' + pct(p.bedrag, maxP) + '%"></i></span><span class="cbar-v">' + eur(p.bedrag) + '</span></div>'; }).join('') + '</div></div>';
    }
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Cijfers & omzet</h1><div class="sub">Financieel overzicht · ' + (state.role === 'admin' ? 'zaakvoerder' : 'sales') + '</div></div>' +
      '<div class="tstats">' + stat(eur(o.totaal), 'Offertes uitgebracht', 'br-green') + stat(o.aantal, 'Aantal offertes', 'br-blue') + stat(eur(d.plan_totaal), 'Gepland budget', 'br-purple') + stat(o.zonder_bedrag, 'Zonder bedrag', o.zonder_bedrag ? 'br-orange' : 'br-green') + '</div>' +
      '<div class="fincard"><h3>Uitgebrachte offertes per maand</h3><div class="cbars">' + maandBars + '</div></div>' +
      '<div class="fincard"><h3>Omzet per categorie <span class="micro" style="font-weight:600;color:var(--ink-4)">· ingevuld taakbudget, vulgraad ' + d.plan_vulgraad + '%</span></h3><div class="cbars">' + catBars + '</div></div>' +
      perPersoon +
      '<div class="fincard"><h3>Top offertes</h3><div class="cbars">' + o.top.map(function (t) { return '<div class="cbar"><span class="cbar-l" style="width:auto;flex:1">' + esc(t.naam) + '</span><span class="cbar-v">' + eur(t.bedrag) + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="disclaimer-note"><span>ⓘ</span><span>' + esc(d.disclaimer) + '</span></div></div>';
  }

  /* ---- VERLOF ---- */
  async function renderVerlof(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Verlof</h1><div class="sub">Je vakantie, recup en ziekte — en hier dien je een nieuwe aanvraag in.</div></div><div class="empty"><p>Laden…</p></div></div>';
    var d; try { d = await api('teamVerlof', {}); } catch (e) { return; }
    if (!d.ok) { page.querySelector('.empty p').textContent = 'Kon verlof niet laden.'; return; }
    var typeOpts = d.types.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
    var form = '<div class="setsec"><h3>Nieuwe aanvraag</h3><p class="sdesc">Zolang een aanvraag niet is goedgekeurd, blokkeert ze niets in de shoot-planning.</p>' +
      '<div class="vl-grid"><div class="field"><label>Type</label><select id="vl-type">' + typeOpts + '</select></div><div class="field"><label>&nbsp;</label><div></div></div>' +
      '<div class="field"><label>Van</label><input type="date" id="vl-van"></div><div class="field"><label>Tot en met</label><input type="date" id="vl-tot"></div></div>' +
      '<button class="btn btn-primary" id="vl-submit" style="margin-top:16px">Aanvraag indienen</button></div>';
    var lijst = d.items.length ? d.items.map(function (i) {
      var st = i.goedgekeurd ? '<span class="pill pill-done"><span class="pdot"></span>Goedgekeurd</span>' : '<span class="pill pill-wait"><span class="pdot"></span>In aanvraag</span>';
      var range = i.van_ymd === i.tot_ymd ? dueLabel(i.van_ymd) : (dueLabel(i.van_ymd) + ' – ' + dueLabel(i.tot_ymd));
      return '<div class="vl-row"><span class="vl-type">' + esc(i.type) + '</span><span class="vl-dates">' + range + '</span>' + st + '</div>';
    }).join('') : '<div class="empty"><p>Nog geen verlof geregistreerd.</p></div>';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Verlof</h1><div class="sub">Je vakantie, recup en ziekte — en hier dien je een nieuwe aanvraag in.</div></div>' +
      form + sec('Mijn verlof', d.items.length) + lijst + '</div>';
    var today = todayYmd(); $('vl-van').min = today; $('vl-tot').min = today; $('vl-van').value = today; $('vl-tot').value = today;
    $('vl-van').onchange = function () { if ($('vl-tot').value < $('vl-van').value) $('vl-tot').value = $('vl-van').value; $('vl-tot').min = $('vl-van').value; };
    $('vl-submit').onclick = async function () {
      this.disabled = true; this.textContent = 'Indienen…';
      var r; try { r = await api('teamVerlofAanvraag', { type: $('vl-type').value, van: $('vl-van').value, tot: $('vl-tot').value }); } catch (e) { r = null; }
      if (r && r.ok) { toast('Verlofaanvraag ingediend ✓'); renderVerlof(page); } else { toast('Indienen mislukt'); this.disabled = false; this.textContent = 'Aanvraag indienen'; }
    };
  }

  /* ---- PROJECTDETAIL MODAL ---- */
  var curProject = null;
  async function openProject(taskId) {
    var scrim = $('scrim'), modal = $('modal');
    modal.innerHTML = '<div class="modal-body" style="padding:48px;text-align:center;color:var(--ink-4)"><div class="boot" style="position:static;background:none"><div class="spin"></div></div></div>';
    scrim.classList.add('show'); document.body.style.overflow = 'hidden';
    var d; try { d = await api('teamProject', { task_id: taskId }); } catch (e) { d = null; }
    if (!d || !d.ok) { modal.innerHTML = '<div class="modal-body"><div class="empty"><p>Kon dit project niet laden.</p></div><div style="text-align:center"><button class="btn btn-outline btn-sm" id="mclose2">Sluiten</button></div></div>'; $('mclose2').onclick = closeModal; return; }
    curProject = d; renderModal(d, 'overzicht');
  }
  function renderModal(d, tab) {
    var p = d.project, br = discBr(p.discipline);
    var disc = DISC_LABEL[p.discipline] || p.discipline || 'Project';
    var head = '<div class="modal-head ' + br + '"><span class="bar"></span><div style="flex:1;min-width:0"><div class="sub">' + esc(disc) + (p.bedrijf ? ' · ' + esc(p.bedrijf) : '') + '</div><h2>' + esc(p.naam) + '</h2></div>' +
      '<button class="modal-close" id="mclose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>';
    var tabs = '<div class="modal-tabs">' + [['overzicht', 'Overzicht'], ['bestanden', 'Bestanden' + (d.bestanden.length ? ' (' + d.bestanden.length + ')' : '')], ['chat', 'Communicatie']].map(function (t) {
      return '<button class="mtab ' + br + (tab === t[0] ? ' active' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    var body = '<div class="modal-body">' + (tab === 'overzicht' ? paneOverzicht(d) : tab === 'bestanden' ? paneBestanden(d) : paneChat(d)) + '</div>';
    $('modal').innerHTML = head + tabs + body;
    $('mclose').onclick = closeModal;
    Array.prototype.forEach.call($('modal').querySelectorAll('.mtab'), function (b) { b.onclick = function () { renderModal(curProject, b.getAttribute('data-t')); }; });
    if (tab === 'overzicht') wireOverzicht(d);
    if (tab === 'bestanden') wireBestanden(d);
    if (tab === 'chat') wireChat(d);
  }
  function paneOverzicht(d) {
    var p = d.project;
    var klantLink = p.bedrijf_id ? '<a class="klant-jump" href="' + KLANTPORTAAL + '/?klant=' + esc(p.bedrijf_id) + '" target="_blank" rel="noopener" title="Bekijk dit als de klant in z\'n portaal">Bekijk klantportaal ↗</a>' : '';
    var meta = '<div class="pj-meta"><span>Status: ' + pillHtml(p.status) + '</span>' + (p.bedrijf ? '<span><b>Klant:</b> ' + esc(p.bedrijf) + '</span>' : '') + (p.prioriteit === 'urgent' || p.prioriteit === 'high' ? '<span><b>Prioriteit:</b> ' + (p.prioriteit === 'urgent' ? 'urgent' : 'hoog') + '</span>' : '') + (klantLink ? '<span>' + klantLink + '</span>' : '') + '</div>';
    var statusBtns = '<div class="pj-block"><h4>Status doorzetten</h4><div class="status-actions">' + STATUSSEN.map(function (s) {
      var on = (p.status_raw || '').toLowerCase() === s.k; return '<button class="st-btn' + (on ? ' on' : '') + '" data-st="' + s.k + '"' + (on ? ' disabled' : '') + '>' + s.l + '</button>';
    }).join('') + '</div></div>';
    var editRow = '<div class="pj-block"><div class="pj-edit-grid">' +
      '<div class="field"><label>Tijdsinschatting (uren)</label><input type="number" min="0" step="0.5" id="ed-uren" value="' + (p.est_uren || '') + '"></div>' +
      '<div class="field"><label>Deadline</label><input type="date" id="ed-due" value="' + esc(p.deadline_ymd || '') + '"></div></div></div>';
    var avail = (state.roster || []).filter(function (m) { return p.assignee_ids.indexOf(m.id) < 0; });
    var chips = p.assignees.map(function (a, i) { var id = p.assignee_ids[i]; return '<span class="as-chip"><span class="av">' + esc(a.initialen || initialen(a.naam)) + '</span>' + esc(voornaam(a.naam)) + '<button class="as-x" data-rem="' + id + '" title="Verwijderen">×</button></span>'; }).join('');
    var addSel = '<select id="ed-add" class="as-add"><option value="">+ teamlid toevoegen…</option>' + avail.map(function (m) { return '<option value="' + m.id + '">' + esc(m.naam) + (m.pool ? ' 📷' : '') + '</option>'; }).join('') + '</select>';
    var assignBlock = '<div class="pj-block"><h4>Wie werkt eraan</h4><div class="as-wrap">' + (chips || '<span class="micro" style="color:var(--ink-4)">Nog niemand toegewezen</span>') + addSel + '</div></div>';
    var brief = '<div class="pj-block"><h4>Briefing</h4><textarea id="ed-brief" class="pj-brieftext" placeholder="Voeg de opdracht / briefing toe…">' + esc(p.brief) + '</textarea><button class="btn btn-outline btn-sm" id="ed-brief-save" style="margin-top:8px" disabled>Briefing opslaan</button></div>';
    var subs = d.subtaken.length ? '<div class="pj-block"><h4>Onderdelen (' + d.subtaken.length + ')</h4>' + d.subtaken.map(function (s) {
      return '<div class="sub-row"><span class="sb-bar" style="background:var(--c)"></span><span class="sb-nm">' + esc(s.naam) + '</span>' + pillHtml(s.status) + '</div>';
    }).join('') + '</div>' : '';
    var open = '<a class="btn btn-outline btn-sm" href="' + esc(p.url) + '" target="_blank" rel="noopener">Open in ClickUp ↗</a>';
    return meta + statusBtns + editRow + assignBlock + brief + subs + open;
  }
  async function saveField(d, patch, after) {
    var r; try { r = await api('teamTaskUpdate', Object.assign({ task_id: d.project.id }, patch)); } catch (e) { r = null; }
    if (r && r.ok) { if (r.est_uren != null) d.project.est_uren = r.est_uren; if (patch.due !== undefined) d.project.deadline_ymd = r.due_ymd; state.taken = null; state.account = null; toast('Opgeslagen ✓'); if (after) after(); }
    else toast('Opslaan mislukt');
  }
  async function saveAssignee(d, patch) {
    var r; try { r = await api('teamTaskUpdate', Object.assign({ task_id: d.project.id }, patch)); } catch (e) { r = null; }
    if (r && r.ok) { d.project.assignees = r.assignees; d.project.assignee_ids = r.assignee_ids; state.taken = null; state.account = null; toast('Team bijgewerkt ✓'); renderModal(d, 'overzicht'); }
    else toast('Bijwerken mislukt');
  }
  function wireOverzicht(d) {
    Array.prototype.forEach.call($('modal').querySelectorAll('.st-btn'), function (b) {
      b.onclick = async function () {
        if (b.disabled) return; var st = b.getAttribute('data-st');
        Array.prototype.forEach.call($('modal').querySelectorAll('.st-btn'), function (x) { x.disabled = true; });
        var r; try { r = await api('teamStatus', { task_id: d.project.id, status: st }); } catch (e) { r = null; }
        if (r && r.ok) { d.project.status = r.status; d.project.status_raw = st; state.taken = null; state.account = null; toast('Status bijgewerkt ✓'); }
        else toast('Bijwerken mislukt');
        renderModal(d, 'overzicht');
      };
    });
    var u = $('ed-uren'); if (u) u.onchange = function () { saveField(d, { uren: u.value }); };
    var dd = $('ed-due'); if (dd) dd.onchange = function () { saveField(d, { due: dd.value }); };
    var as = $('ed-add'); if (as) as.onchange = function () { if (as.value) saveAssignee(d, { add_assignee: as.value }); };
    Array.prototype.forEach.call($('modal').querySelectorAll('.as-x'), function (x) { x.onclick = function () { saveAssignee(d, { rem_assignee: x.getAttribute('data-rem') }); }; });
    var bt = $('ed-brief'), bs = $('ed-brief-save');
    if (bt && bs) { var orig = d.project.brief || ''; bt.oninput = function () { bs.disabled = (bt.value === orig); }; bs.onclick = function () { bs.disabled = true; saveField(d, { brief: bt.value }, function () { d.project.brief = bt.value; }); }; }
  }
  function paneBestanden(d) {
    var list = (d.bestanden && d.bestanden.length) ? d.bestanden.map(function (f) {
      return '<a class="linkcard" href="' + esc(f.url) + '" target="_blank" rel="noopener" download><span class="li"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></span><div style="min-width:0"><div class="ll">' + esc(f.label) + '</div><div class="lu">' + esc(f.url) + '</div></div></a>';
    }).join('') : '<div class="empty" style="padding:24px"><p>Nog geen bestanden of opleverlinks op dit project.</p></div>';
    return list + '<label class="btn btn-outline btn-sm" id="ed-file-lbl" style="margin-top:10px;cursor:pointer;display:inline-flex">+ Bestand toevoegen<input type="file" id="ed-file" hidden></label>';
  }
  function wireBestanden(d) {
    var f = $('ed-file'), lbl = $('ed-file-lbl'); if (!f) return;
    f.onchange = function () {
      var file = f.files && f.files[0]; if (!file) return;
      if (file.size > 20 * 1024 * 1024) { toast('Bestand te groot (max 20 MB)'); return; }
      if (lbl) lbl.textContent = 'Uploaden…';
      var rd = new FileReader();
      rd.onload = async function () {
        var data = String(rd.result); var b64 = data.indexOf(',') >= 0 ? data.split(',')[1] : data;
        var r; try { r = await api('teamTaskAttach', { task_id: d.project.id, filename: file.name, file_data: b64 }); } catch (e) { r = null; }
        if (r && r.ok) { d.bestanden = d.bestanden || []; d.bestanden.push({ url: r.url, label: r.filename }); toast('Bestand toegevoegd ✓'); renderModal(d, 'bestanden'); }
        else { toast('Upload mislukt' + (r && r.error === 'te_groot' ? ' (te groot)' : '')); if (lbl) lbl.textContent = '+ Bestand toevoegen'; }
      };
      rd.readAsDataURL(file);
    };
  }
  function paneChat(d) {
    var msgs = (d.chat || []).map(function (c) {
      var cls = c.is_intern ? 'intern' : (c.is_klant ? '' : 'me');
      var who = c.is_klant ? esc(c.auteur || 'Klant') : esc(c.auteur || 'Studio 27');
      return '<div class="msg ' + cls + '"><span class="av">' + esc(initialen(who)) + '</span><div class="bubble"><div class="who">' + who + '</div><div class="tx">' + esc(c.tekst) + '</div><div class="tm">' + tijd(c.datum) + '</div></div></div>';
    }).join('');
    return '<div class="chat-list">' + (msgs || '<div class="empty" style="padding:24px"><p>Nog geen berichten op dit project.</p></div>') + '</div>' +
      '<div class="chat-tools"><label class="chat-toggle"><input type="checkbox" id="ch-intern"> Interne notitie (niet zichtbaar voor de klant)</label></div>' +
      '<div class="chat-input"><input id="ch-txt" placeholder="Bericht aan de klant of een interne notitie…" autocomplete="off"><button class="chat-send" id="ch-send"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div>';
  }
  function wireChat(d) {
    var inp = $('ch-txt'), send = $('ch-send');
    var post = async function () {
      var tekst = inp.value.trim(); if (!tekst) return; var intern = $('ch-intern').checked;
      send.disabled = true; inp.disabled = true;
      var r; try { r = await api('teamProjectChatPost', { task_id: d.project.id, tekst: tekst, intern: intern }); } catch (e) { r = null; }
      if (r && r.ok) { var ch; try { ch = await api('teamProjectChat', { task_id: d.project.id }); } catch (e) { ch = null; } if (ch && ch.ok) d.chat = ch.comments; toast(intern ? 'Notitie opgeslagen ✓' : 'Bericht verstuurd ✓'); renderModal(d, 'chat'); }
      else { toast('Versturen mislukt'); send.disabled = false; inp.disabled = false; }
    };
    send.onclick = post; inp.onkeydown = function (e) { if (e.key === 'Enter') post(); };
  }
  function tijd(ms) { var n = Number(ms); if (!n) return ''; var d = new Date(n); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  // chat moet eerst geladen worden vóór de pane render → openProject laadt project, chat lazy bij eerste chat-tab
  var origRenderModal = renderModal;
  renderModal = async function (d, tab) {
    if (tab === 'chat' && !d.chat) { try { var ch = await api('teamProjectChat', { task_id: d.project.id }); d.chat = (ch && ch.ok) ? ch.comments : []; } catch (e) { d.chat = []; } }
    origRenderModal(d, tab);
  };
  function closeModal() { $('scrim').classList.remove('show'); document.body.style.overflow = ''; curProject = null; if (state.route === 'home' || state.route === 'planning') { state.taken = null; } }

  /* ---- FEATURE REQUEST (in ieders portaal, → ClickUp feature-lijst) ---- */
  function openFeature() {
    curProject = null;
    var portalen = ['Teamportaal', 'Klantenportaal', 'Shoot-planner', 'Anders'];
    $('modal').innerHTML = '<div class="modal-head br-purple"><span class="bar"></span><div style="flex:1;min-width:0"><div class="sub">Feature request</div><h2>💡 Een idee voor de portalen</h2></div><button class="modal-close" id="mclose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body">' +
      '<div class="vl-grid"><div class="field"><label>Welk portaal?</label><select id="ft-portaal">' + portalen.map(function (p) { return '<option value="' + p + '">' + p + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Onderdeel (optioneel)</label><input type="text" id="ft-ond" placeholder="bv. Cijfers, Planning…"></div></div>' +
      '<div class="field" style="margin-top:12px"><label>Titel</label><input type="text" id="ft-titel" placeholder="Korte titel van je idee"></div>' +
      '<div class="field" style="margin-top:12px"><label>Omschrijving</label><textarea id="ft-oms" class="pj-brieftext" placeholder="Wat zou je willen kunnen, en waarom?"></textarea></div>' +
      '<button class="btn btn-primary" id="ft-send" style="margin-top:14px">Versturen</button>' +
      '<p class="micro" style="margin-top:10px;color:var(--ink-4)">Komt in de ClickUp-lijst “Portaal — Feature Requests”, met jou als aanvrager en het portaal duidelijk vermeld.</p></div>';
    $('mclose').onclick = closeModal;
    $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    $('ft-send').onclick = async function () {
      var titel = $('ft-titel').value.trim(), oms = $('ft-oms').value.trim();
      if (!titel && !oms) { toast('Beschrijf eerst je idee'); return; }
      this.disabled = true; this.textContent = 'Versturen…';
      var r; try { r = await api('teamFeatureRequest', { titel: titel, omschrijving: oms, portaal: $('ft-portaal').value, onderdeel: $('ft-ond').value }); } catch (e) { r = null; }
      if (r && r.ok) { toast('Idee verstuurd ✓'); closeModal(); } else { toast('Versturen mislukt'); this.disabled = false; this.textContent = 'Versturen'; }
    };
  }

  /* ---- binnenkort ---- */
  function renderSoon(page, route) {
    var info = {
      aanvragen: ['⚡', 'Aanvragen buiten kantooruren', 'Klanten kunnen straks shoots/meetings buiten de standaarduren aanvragen. Hier zie je ze binnenkomen en geef je aan of je kan — de klant krijgt automatisch je antwoord.'],
      berichten: ['💬', 'Berichten-inbox', 'Alle klantberichten op projecten waar jij de lead bent, op één plek — met een signaal wanneer er op jou gewacht wordt. (Communiceren kan nu al per project, via de Communicatie-tab.)'],
      ai: ['✨', 'AI-dagplanning', 'Eén klik en de AI stelt de meest logische volgorde voor je dag voor, op basis van deadlines, tijdsinschattingen en je agenda.']
    }[route] || ['', 'Binnenkort', ''];
    page.innerHTML = '<div class="panel active"><div class="soon-card"><div class="ic">' + info[0] + '</div><h3>' + esc(info[1]) + '</h3><p>' + esc(info[2]) + '</p><span class="tag">Volgende golf</span></div></div>';
  }

  /* ---- sidebar mobiel ---- */
  function openSidebar() { $('sidebar').classList.add('open'); $('sbScrim').classList.add('show'); }
  function closeSidebar() { $('sidebar').classList.remove('open'); $('sbScrim').classList.remove('show'); }

  /* ---- boot ---- */
  function showLogin(err) { $('boot').style.display = 'none'; $('app').classList.remove('show'); $('login').style.display = 'flex'; $('login-err').textContent = err || ''; }
  async function boot() {
    var d; try { d = await api('teamMe', {}); } catch (e) { showLogin('Kon het teamportaal niet bereiken.'); return; }
    if (!d.ok) { $('boot').style.display = 'none'; $('login').style.display = 'flex'; $('app').classList.remove('show'); $('login-err').textContent = d.message || 'Geen teamtoegang.'; $('btn-google').style.display = 'none'; return; }
    state.me = d.me; state.roster = d.roster || []; state.role = d.role || 'team'; state.perms = d.perms || { team: true };
    $('live-name').textContent = voornaam(state.me.naam);
    var h = (location.hash || '').replace('#', '');
    if (routeExists(h)) state.route = h;
    else if (state.role === 'accountmanager') state.route = 'account';   // Ilke landt op haar projectoverzicht
    $('boot').style.display = 'none'; $('login').style.display = 'none'; $('app').classList.add('show');
    renderNav(); render();
  }

  window.addEventListener('DOMContentLoaded', function () {
    $('btn-google').onclick = function () { window.S27TeamAuth.google(); };
    $('hamb').onclick = openSidebar; $('sbScrim').onclick = closeSidebar;
    var _fb = $('featBtn'); if (_fb) _fb.onclick = openFeature;
    $('scrim').addEventListener('mousedown', function (e) { if (e.target === $('scrim')) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if ($('scrim').classList.contains('show')) closeModal(); else closeSidebar(); } });
    window.addEventListener('hashchange', function () { var h = (location.hash || '').replace('#', ''); if (routeExists(h) && h !== state.route) { state.route = h; renderNav(); render(); } });

    window.S27TeamAuth.subscribe(function (e) {
      if (e.phase === 'loading') { $('boot').style.display = 'flex'; }
      else if (e.phase === 'signed_out') { showLogin(e.error); }
      else if (e.phase === 'no_access') { showLogin('Dit account (' + (e.email || '') + ') hoort niet bij Studio 27. Gebruik je @studio27.be-account.'); }
      else if (e.phase === 'ready') { state.email = e.email || ''; $('boot').style.display = 'flex'; $('boot-msg').textContent = 'Teamportaal laden…'; boot(); }
    });
    window.S27TeamAuth.init({ gatewayBase: GATEWAY });
  });

  if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js?v=4').catch(function () { }); }); }
})();
