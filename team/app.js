/* Studio 27 Teamportaal — frontend (vanilla, huisstijl van het klantportaal).
 * Doel: alle info om projecten zelfstandig af te ronden zonder PM. Home / Mijn
 * planning / Collega's / Verlof + projectdetail (briefing, bestanden, subtaken,
 * status doorzetten, klant-/teamchat). Latere golven: Aanvragen / Berichten / AI. */
(function () {
  'use strict';
  var GATEWAY = 'https://s27-portal-gateway-v2.studio27marketing.workers.dev';
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
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'
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

  async function api(endpoint, body) {
    var t = await window.S27TeamAuth.token();
    if (!t) throw new Error('Niet ingelogd.');
    var res = await fetch(GATEWAY + '/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body || {}) });
    var txt = await res.text(); var data; try { data = JSON.parse(txt); } catch (e) { data = { _raw: txt }; }
    if (res.status === 401) { window.S27TeamAuth.logout(); throw new Error('Sessie verlopen.'); }
    return data;
  }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2400); }

  /* ---- nav ---- */
  var NAV = [
    { label: 'Overzicht', items: [{ k: 'home', br: 'br-blue', label: 'Home', ic: IC.home }, { k: 'planning', br: 'br-purple', label: 'Mijn planning', ic: IC.cal }] },
    { label: 'Team', items: [{ k: 'collega', br: 'br-blue', label: "Collega's", ic: IC.team }] },
    { label: 'Persoonlijk', items: [{ k: 'verlof', br: 'br-green', label: 'Verlof', ic: IC.palm }] },
    { label: 'Binnenkort', items: [{ k: 'aanvragen', br: 'br-orange', label: 'Aanvragen', ic: IC.bolt, soon: 1 }, { k: 'berichten', br: 'br-pink', label: 'Berichten', ic: IC.chat, soon: 1 }, { k: 'ai', br: 'br-indigo', label: 'AI-planning', ic: IC.spark, soon: 1 }] }
  ];
  function renderNav() {
    $('nav').innerHTML = NAV.map(function (g) {
      return '<div class="sb-group"><div class="sb-glabel">' + esc(g.label) + '</div>' + g.items.map(function (n) {
        return '<button class="sb-item ' + n.br + (state.route === n.k ? ' active' : '') + '" data-k="' + n.k + '">' +
          '<span class="sb-ic">' + svgIc(n.ic) + '</span><span class="sb-label">' + esc(n.label) + '</span>' +
          (n.soon ? '<span class="sb-badge" style="background:var(--s27-purple-soft);color:var(--s27-purple-ink);font-size:9px;letter-spacing:.04em">SOON</span>' : '') + '</button>';
      }).join('') + '</div>';
    }).join('');
    Array.prototype.forEach.call($('nav').querySelectorAll('.sb-item'), function (b) { b.onclick = function () { go(b.getAttribute('data-k')); closeSidebar(); }; });
    $('sbFoot').innerHTML = '<div class="sb-me"><span class="av">' + esc(initialen(state.me.naam)) + '</span><span class="tx"><b>' + esc(state.me.naam) + '</b><span>' + esc(state.email) + '</span></span>' +
      '<button class="sb-logout" id="lo" title="Uitloggen"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button></div>';
    $('lo').onclick = function () { window.S27TeamAuth.logout(); };
  }
  function go(route) { state.route = route; state.viewMember = null; if (location.hash !== '#' + route) location.hash = route; renderNav(); render(); }

  function render() {
    var titles = { home: 'Home', planning: 'Mijn planning', collega: "Collega's", verlof: 'Verlof', aanvragen: 'Aanvragen', berichten: 'Berichten', ai: 'AI-planning' };
    $('crumb').textContent = titles[state.route] || 'Teamportaal';
    var page = $('page'); page.scrollTop = 0;
    if (state.route === 'home') return renderHome(page);
    if (state.route === 'planning') return renderPlanning(page, null);
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
    if (tab === 'overzicht') wireStatus(d);
    if (tab === 'chat') wireChat(d);
  }
  function paneOverzicht(d) {
    var p = d.project;
    var meta = [];
    meta.push('<span>Status: ' + pillHtml(p.status) + '</span>');
    if (p.deadline_ymd) meta.push('<span><b>Deadline:</b> ' + dueLabel(p.deadline_ymd) + '</span>');
    if (p.bedrijf) meta.push('<span><b>Klant:</b> ' + esc(p.bedrijf) + '</span>');
    if (p.prioriteit === 'urgent' || p.prioriteit === 'high') meta.push('<span><b>Prioriteit:</b> ' + (p.prioriteit === 'urgent' ? 'urgent' : 'hoog') + '</span>');
    var avs = (p.assignees && p.assignees.length) ? '<div class="pj-block"><h4>Wie werkt eraan</h4><div class="pj-avs">' + p.assignees.map(function (a) { return '<span class="av" title="' + esc(a.naam) + '">' + esc(a.initialen || initialen(a.naam)) + '</span>'; }).join('') + '</div></div>' : '';
    var statusBtns = '<div class="pj-block"><h4>Status doorzetten</h4><div class="status-actions">' + STATUSSEN.map(function (s) {
      var on = (p.status_raw || '').toLowerCase() === s.k; return '<button class="st-btn' + (on ? ' on' : '') + '" data-st="' + s.k + '"' + (on ? ' disabled' : '') + '>' + s.l + '</button>';
    }).join('') + '</div></div>';
    var brief = '<div class="pj-block"><h4>Briefing</h4><div class="pj-brief' + (p.brief ? '' : ' leeg') + '">' + (p.brief ? esc(p.brief) : 'Geen briefing ingevuld op deze taak.') + '</div></div>';
    var subs = d.subtaken.length ? '<div class="pj-block"><h4>Onderdelen (' + d.subtaken.length + ')</h4>' + d.subtaken.map(function (s) {
      return '<div class="sub-row"><span class="sb-bar" style="background:var(--c)"></span><span class="sb-nm">' + esc(s.naam) + '</span>' + pillHtml(s.status) + '</div>';
    }).join('') + '</div>' : '';
    var open = '<a class="btn btn-outline btn-sm" href="' + esc(p.url) + '" target="_blank" rel="noopener" style="margin-top:6px">Open in ClickUp ↗</a>';
    return '<div class="pj-meta">' + meta.join('') + '</div>' + statusBtns + avs + brief + subs + open;
  }
  function wireStatus(d) {
    Array.prototype.forEach.call($('modal').querySelectorAll('.st-btn'), function (b) {
      b.onclick = async function () {
        if (b.disabled) return; var st = b.getAttribute('data-st');
        Array.prototype.forEach.call($('modal').querySelectorAll('.st-btn'), function (x) { x.disabled = true; });
        var r; try { r = await api('teamStatus', { task_id: d.project.id, status: st }); } catch (e) { r = null; }
        if (r && r.ok) { d.project.status = r.status; d.project.status_raw = st; state.taken = null; toast('Status bijgewerkt ✓'); renderModal(d, 'overzicht'); }
        else { toast('Bijwerken mislukt'); renderModal(d, 'overzicht'); }
      };
    });
  }
  function paneBestanden(d) {
    if (!d.bestanden.length) return '<div class="empty"><p>Nog geen bestanden of opleverlinks op dit project.</p></div>';
    return d.bestanden.map(function (f) {
      return '<a class="linkcard" href="' + esc(f.url) + '" target="_blank" rel="noopener"><span class="li"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg></span><div style="min-width:0"><div class="ll">' + esc(f.label) + '</div><div class="lu">' + esc(f.url) + '</div></div></a>';
    }).join('');
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
    state.me = d.me; state.roster = d.roster || [];
    $('live-name').textContent = voornaam(state.me.naam);
    var h = (location.hash || '').replace('#', ''); if (NAV.some(function (g) { return g.items.some(function (n) { return n.k === h; }); })) state.route = h;
    $('boot').style.display = 'none'; $('login').style.display = 'none'; $('app').classList.add('show');
    renderNav(); render();
  }

  window.addEventListener('DOMContentLoaded', function () {
    $('btn-google').onclick = function () { window.S27TeamAuth.google(); };
    $('hamb').onclick = openSidebar; $('sbScrim').onclick = closeSidebar;
    $('scrim').addEventListener('mousedown', function (e) { if (e.target === $('scrim')) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if ($('scrim').classList.contains('show')) closeModal(); else closeSidebar(); } });
    window.addEventListener('hashchange', function () { var h = (location.hash || '').replace('#', ''); if (NAV.some(function (g) { return g.items.some(function (n) { return n.k === h; }); }) && h !== state.route) { state.route = h; renderNav(); render(); } });

    window.S27TeamAuth.subscribe(function (e) {
      if (e.phase === 'loading') { $('boot').style.display = 'flex'; }
      else if (e.phase === 'signed_out') { showLogin(e.error); }
      else if (e.phase === 'no_access') { showLogin('Dit account (' + (e.email || '') + ') hoort niet bij Studio 27. Gebruik je @studio27.be-account.'); }
      else if (e.phase === 'ready') { state.email = e.email || ''; $('boot').style.display = 'flex'; $('boot-msg').textContent = 'Teamportaal laden…'; boot(); }
    });
    window.S27TeamAuth.init({ gatewayBase: GATEWAY });
  });

  if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js?v=2').catch(function () { }); }); }
})();
