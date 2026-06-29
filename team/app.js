/* Studio 27 Teamportaal, frontend (vanilla, huisstijl van het klantportaal).
 * Doel: alle info om projecten zelfstandig af te ronden zonder PM. Home / Mijn
 * planning / Collega's / Verlof + projectdetail (briefing, bestanden, subtaken,
 * status doorzetten, klant-/teamchat). Latere golven: Aanvragen / Berichten / AI. */
(function () {
  'use strict';
  var GATEWAY = 'https://s27-portal-gateway-v2.studio27marketing.workers.dev';
  var KLANTPORTAAL = 'https://portaal.studio27.be';
  var $ = function (id) { return document.getElementById(id); };
  var state = { me: null, roster: [], email: '', route: 'home', taken: null, viewMember: null, modal: null, canImpersonate: false, actingAs: null, actAsMember: (function () { try { return localStorage.getItem('s27team_actas') || ''; } catch (e) { return ''; } })() };

  var MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  var MONTHS_L = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var DOW = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  var PILL = { to_do: 'pill-todo', in_progress: 'pill-prog', on_hold: 'pill-wait', doorgestuurd: 'pill-sent', done: 'pill-done' };
  var DISC_BR = { video_fotografie: 'br-purple', webdesign: 'br-green', social: 'br-yellow', ads: 'br-orange', seo: 'br-green', branding: 'br-pink', strategie: 'br-blue', copywriting: 'br-blue', automation: 'br-indigo', projectmanagement: 'br-indigo', opleiding: 'br-indigo' };
  var DISC_LABEL = { video_fotografie: 'Video & fotografie', webdesign: 'Webdesign', social: 'Social media', ads: 'Adverteren', seo: 'SEO', branding: 'Branding', strategie: 'Strategie', copywriting: 'Copywriting', automation: 'Automation', projectmanagement: 'Projectmanagement', opleiding: 'Opleiding' };
  // Beknopt discipline-icoon i.p.v. het woord uit te schrijven (compacte menubalk).
  var DISC_IC = {
    webdesign: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    video_fotografie: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    branding: '<path d="M12 2a10 10 0 1 0 0 20c1 0 1.6-.8 1.6-1.6 0-.4-.2-.7-.5-1-.3-.3-.5-.6-.5-1 0-.9.7-1.6 1.6-1.6H16a4 4 0 0 0 4-4c0-5-3.6-9-8-9z"/><circle cx="7.5" cy="11.5" r="1.1"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="16.5" cy="11.5" r="1.1"/>',
    strategie: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    social: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    ads: '<path d="M3 11l16-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 0 1-5.8-1.6"/>',
    seo: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    copywriting: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    automation: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>',
    projectmanagement: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    opleiding: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>'
  };
  function discIcSvg(disc, sz) { var p = DISC_IC[disc] || '<circle cx="12" cy="12" r="9"/>'; sz = sz || 18; return '<svg viewBox="0 0 24 24" width="' + sz + '" height="' + sz + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
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
    chart: '<path d="M3 3v18h18M7 14l3-3 3 2 5-6"/>',
    bars: '<path d="M4 4v16h16"/><path d="M8.5 17v-4M13 17V9M17.5 17v-7"/>',
    board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.4 3-5.5A4.5 4.5 0 0 0 12 5 4.5 4.5 0 0 0 2 8.5c0 2.1 1.5 4 3 5.5l7 7 7-7z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    mega: '<path d="M3 14v-4a1 1 0 0 1 1-1h3l9-5v16l-9-5H4a1 1 0 0 1-1-1z"/><path d="M18.5 8a4 4 0 0 1 0 8M7 14v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4"/>',
    // --- line-iconen voor knoppen/acties (Lucide-set; vervangen de emoji portaalbreed) ---
    plug: '<path d="M9 2v5M15 2v5M6 7h12v3a6 6 0 0 1-12 0V7zM12 16v6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
    layers: '<path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
    pkg: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
    edit: '<path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    ul: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    play: '<path d="M5 3l16 9-16 9V3z"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    clip: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    mic: '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    cam: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    slash: '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    chevL: '<path d="M15 18l-6-6 6-6"/>',
    chevR: '<path d="M9 18l6-6-6-6"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    book: '<path d="M4 4h11a2 2 0 0 1 2 2v14a1 1 0 0 0-1-1H4z"/><path d="M4 4v15"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>'
  };
  function svgIc(p, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 20) + '" height="' + (w || 20) + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function voornaam(n) { return String(n || '').split(' ')[0] || n; }
  function initialen(n) { var p = String(n || '').trim().split(/\s+/); return ((p[0] || ' ')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
  function groet() { var h = new Date().getHours(); return h < 6 ? 'Goeienacht' : h < 12 ? 'Goeiemorgen' : h < 18 ? 'Goeiemiddag' : 'Goeienavond'; }
  function vandaagLang() { var d = new Date(); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_L[d.getMonth()]; }
  function dueLabel(ymd) { if (!ymd) return ''; var p = ymd.split('-'); return (+p[2]) + ' ' + MONTHS[(+p[1]) - 1]; }
  function dueRangeLabel(p) { if (!p.deadline_ymd && !p.start_ymd) return 'geen deadline'; if (p.start_ymd && p.deadline_ymd && p.start_ymd !== p.deadline_ymd) return dueLabel(p.start_ymd) + ' → ' + dueLabel(p.deadline_ymd); return dueLabel(p.deadline_ymd || p.start_ymd); }
  function isDoneStatus(st) { var k = ((st && st.key) || '').toLowerCase(); return /done|complete|afge|factuur|gefactureerd|closed|klaar/.test(k); }
  function subCheckSvg() { return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>'; }
  function todayYmd() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function pillHtml(st) { return '<span class="pill ' + (PILL[st.key] || 'pill-todo') + '"><span class="pdot"></span>' + esc(st.label) + '</span>'; }
  function stLabel(s) { s = String(s || ''); return s.replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function lumText(hex) { hex = String(hex || '').replace('#', ''); if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join(''); var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16); if (isNaN(r)) return '#fff'; return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1a1330' : '#fff'; }
  function discBr(d) { return DISC_BR[d] || 'br-blue'; }
  function eur(n) { return '€' + Number(n || 0).toLocaleString('nl-BE'); }
  function pct(v, max) { return Math.max(2, Math.round((v / (max || 1)) * 100)); }
  function monthLabel(mk) { var p = mk.split('-'); return MONTHS[(+p[1]) - 1] + ' ' + p[0].slice(2); }

  async function api(endpoint, body, opts) {
    var t = await window.S27TeamAuth.token();
    if (!t) { diag('api ' + endpoint + ': GEEN token (niet ingelogd)'); throw new Error('Niet ingelogd.'); }
    var headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t };
    if (state.actAsMember) headers['X-Act-As-Member'] = state.actAsMember;
    // fetch-timeout: een trage gateway mag de pagina nooit eindeloos op 'Laden…' laten staan.
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, (opts && opts.timeout) || 28000) : null;
    var res;
    try {
      res = await fetch(GATEWAY + '/' + endpoint, { method: 'POST', headers: headers, body: JSON.stringify(body || {}), signal: ctrl ? ctrl.signal : undefined });
    } catch (e) {
      if (timer) clearTimeout(timer);
      if (e && e.name === 'AbortError') { diag('timeout · ' + endpoint); var te = new Error('De server reageerde niet op tijd.'); te.timeout = true; throw te; }
      throw e;
    }
    if (timer) clearTimeout(timer);
    var txt = await res.text(); var data; try { data = JSON.parse(txt); } catch (e) { data = { _raw: txt }; }
    if (!res.ok) diag('gateway ' + res.status + ' · ' + endpoint + ((data && data.error) ? ' [' + data.error + ']' : '') + ((data && data.detail) ? ' ' + data.detail : ''));
    if (res.status === 401) { window.S27TeamAuth.logout(); throw new Error('Sessie verlopen.'); }
    return data;
  }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2400); }

  // Diagnose-logje op het loginscherm. ENKEL met ?diag=1 in de URL (verborgen in productie;
  // beschikbaar voor troubleshooting). Voorkomt dat token-claims standaard op het scherm staan.
  var DIAG_ON = false; try { DIAG_ON = /[?&]diag=1/.test(location.search || ''); } catch (e) { DIAG_ON = false; }
  function diag(m) {
    if (!DIAG_ON) return;
    try {
      var el = document.getElementById('diaglog');
      if (!el) {
        var host = document.querySelector('.login-card') || document.body;
        var wrap = document.createElement('div'); wrap.style.cssText = 'margin-top:14px;';
        el = document.createElement('div'); el.id = 'diaglog'; el.style.cssText = 'text-align:left;font-size:10.5px;line-height:1.55;color:#A097AD;max-height:200px;overflow:auto;background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;font-family:ui-monospace,Menlo,monospace;';
        var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = '📋 Kopieer log'; btn.style.cssText = 'margin-top:8px;width:100%;font-size:12px;font-weight:700;padding:9px;border:1px solid #342B4F;border-radius:10px;background:#2a2440;color:#CDC5D6;cursor:pointer;font-family:inherit;';
        btn.onclick = function () { var txt = (el.innerText || el.textContent || ''); try { navigator.clipboard.writeText(txt).then(function () { btn.textContent = '✓ Gekopieerd, plak het in de chat'; }, function () { btn.textContent = txt; }); } catch (e) { btn.textContent = txt; } };
        wrap.appendChild(el); wrap.appendChild(btn); host.appendChild(wrap);
      }
      var t = new Date(); el.innerHTML += '<div>' + String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0') + ' · ' + String(m) + '</div>'; el.scrollTop = el.scrollHeight;
    } catch (e) { /* */ }
  }
  window.S27diag = diag;

  // Nette fout + 'opnieuw proberen' wanneer een (trage) cijfer-pagina niet laadt.
  function loadFail(page, titel, retryFn) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>' + esc(titel) + '</h1></div>' +
      '<div class="empty"><p>Dit duurde te lang of er ging even iets mis. Probeer het opnieuw.</p><div style="margin-top:12px"><button class="btn btn-primary btn-sm" id="ld-retry">Opnieuw proberen</button></div></div></div>';
    var b = $('ld-retry'); if (b) b.onclick = function () { retryFn(); };
  }

  /* ---- nav (rol-afhankelijk) ---- */
  var ADS_EMAILS = { 'vincent@studio27.be': 1, 'johanna@studio27.be': 1, 'arne@studio27.be': 1, 'ilke@studio27.be': 1 };
  function navGroups() {
    var p = state.perms || {};
    var g = [{ label: 'Overzicht', items: [{ k: 'home', br: 'br-blue', label: 'Home', ic: IC.home }, { k: 'planner', br: 'br-indigo', label: 'Weekplanner', ic: IC.board }] }];
    if (p.finance || p.account) g.push({ label: 'Directie', items: [{ k: 'cijfers', br: 'br-green', label: 'Cijfers & Capaciteit', ic: IC.bars }, { k: 'bezetting', br: 'br-indigo', label: 'Bezetting', ic: IC.board }] });
    if (p.finance || p.account || state.role === 'sales') g.push({ label: 'Sales', items: [{ k: 'offertes', br: 'br-green', label: 'Offerteaanvragen', ic: IC.euro }, { k: 'meetings', br: 'br-blue', label: 'Meetings', ic: IC.cal }] });
    if (p.admin || ADS_EMAILS[(state.email || '').toLowerCase()]) g.push({ label: 'Adverteren', items: [{ k: 'adverteren', br: 'br-blue', label: 'Adverteerders', ic: IC.chart }] });
    if (p.creator || p.admin || p.account) g.push({ label: 'Social media', items: [{ k: 'socials', br: 'br-pink', label: 'Social posts', ic: IC.mega }] });   // Danique + content + admin/accountmanager
    if (p.admin) g.push({ label: 'HR', items: [{ k: 'sollicitaties', br: 'br-pink', label: 'Werving', ic: IC.team }, { k: 'vacatures', br: 'br-pink', label: 'Vacatures', ic: IC.board }] });
    if (p.admin) g.push({ label: 'Beheer', items: [{ k: 'aiknoppen', br: 'br-purple', label: 'AI-knoppen', ic: IC.spark }, { k: 'automatiseringen', br: 'br-indigo', label: 'Automatiseringen', ic: IC.bolt }] });
    var aiItems = [{ k: 'agents', br: 'br-purple', label: 'AI-agents', ic: IC.spark }];   // gespecialiseerde AI-agents, iedereen kan chatten, admin bouwt
    aiItems.push({ k: 'skills', br: 'br-green', label: 'Skills', ic: IC.layers });   // multi-step stappenplannen, iedereen runt, admin bouwt
    if (p.admin) aiItems.push({ k: 'plugins', br: 'br-orange', label: 'Plugins', ic: IC.pkg });   // bundels van skills + agents (admin)
    if (p.admin) aiItems.push({ k: 'connectoren', br: 'br-indigo', label: 'Connectoren', ic: IC.plug });   // MCP-koppelingen (admin)
    if (p.admin) aiItems.push({ k: 'aikosten', br: 'br-green', label: 'AI-kosten', ic: IC.euro });   // AI-verbruik/kostenmonitor (enkel zaakvoerder)
    g.push({ label: 'AI', items: aiItems });
    var commItems = [{ k: 'berichten', br: 'br-pink', label: 'Berichten', ic: IC.chat }];
    if (p.creator) commItems.push({ k: 'aanvragen', br: 'br-orange', label: 'Shoot-aanvragen', ic: IC.bolt });   // enkel (social) content-creators
    g.push({ label: 'Communicatie', items: commItems });
    g.push({ label: 'Team', items: [{ k: 'collega', br: 'br-blue', label: "Collega's", ic: IC.team }] });
    var pers = [{ k: 'verlof', br: 'br-green', label: 'Verlof', ic: IC.palm }, { k: 'instellingen', br: 'br-indigo', label: 'Instellingen', ic: IC.gear }];
    g.push({ label: 'Persoonlijk', items: pers });
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
    $('sbFoot').innerHTML = '<div class="sb-me"><span class="tx"><b>' + esc(state.me.naam) + '</b><span>' + (roleChip || esc(state.email)) + '</span></span>' +
      '<button class="sb-logout" id="lo" title="Uitloggen"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button></div>' +
      ((state.perms && state.perms.admin) ? '<button class="sb-pushver" onclick="pushTeamVersion(this)" title="Forceer alle teamleden naar de nieuwste versie"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg> Push v' + (APP_VERSION || '?') + ' naar iedereen</button>' : '');
    $('lo').onclick = function () { window.S27TeamAuth.logout(); };
    renderBottomNav();
  }
  // Mobiele onderbalk: 4 kern-routes (eerste die voor deze rol bestaan) + 'Meer' (opent de lade).
  function bnShort(l) { return ({ 'Weekplanner': 'Planner', 'Adverteerders': 'Ads', 'Social posts': 'Social', "Collega's": 'Team', 'Cijfers & Capaciteit': 'Cijfers', 'Offerteaanvragen': 'Offertes', 'Shoot-aanvragen': 'Shoots' })[l] || l; }
  function renderBottomNav() {
    var el = $('bottomNav'); if (!el) return;
    var all = {}; navGroups().forEach(function (g) { g.items.forEach(function (n) { all[n.k] = n; }); });
    var prio = ['home', 'planner', 'berichten', 'adverteren', 'socials', 'offertes', 'sollicitaties', 'collega'];
    var picks = []; prio.forEach(function (k) { if (all[k] && picks.length < 4) picks.push(all[k]); });
    var html = picks.map(function (n) {
      return '<button class="bn-item ' + n.br + (state.route === n.k ? ' active' : '') + '" data-k="' + n.k + '" aria-label="' + esc(n.label) + '"><span class="bn-ic">' + svgIc(n.ic, 23) + '</span><span class="bn-lbl">' + esc(bnShort(n.label)) + '</span></button>';
    }).join('');
    html += '<button class="bn-item bn-more" id="bn-more" aria-label="Meer menu"><span class="bn-ic">' + svgIc(IC.grid, 23) + '</span><span class="bn-lbl">Meer</span></button>';
    el.innerHTML = html;
    Array.prototype.forEach.call(el.querySelectorAll('.bn-item[data-k]'), function (b) { b.onclick = function () { go(b.getAttribute('data-k')); }; });
    var more = $('bn-more'); if (more) more.onclick = function () { openSidebar(); };
  }
  function go(route) { state.route = route; state.viewMember = null; state.homeList = null; state.agentChat = null; state.agentEdit = null; state.agentMonitor = null; closeAiPop(); if (location.hash !== '#' + route) location.hash = route; renderNav(); render(); }

  /* ===========================================================================
   * AI-KOSTEN — admin-dashboard (enkel de zaakvoerder). Verbruik van Claude/
   * ChatGPT/Gemini/Whisper over team- én klantenportaal, met filters
   * (periode/platform/provider/model/skill/klant) en grafieken. Data komt van
   * de teamAiCosts-handler; charts zijn hand-rolled (zelfde stijl als Cijfers).
   * =========================================================================== */
  var AIK_PROV_COL = { anthropic: 'var(--s27-purple)', openai: 'var(--s27-green)', google: 'var(--s27-blue)', onbekend: '#b9b3bd' };
  var AIK_PLAT_COL = { team: 'var(--s27-blue)', klant: 'var(--s27-orange)', cron: 'var(--s27-indigo)', onbekend: '#b9b3bd' };
  var AIK_PROV_LBL = { anthropic: 'Anthropic (Claude)', openai: 'OpenAI (ChatGPT)', google: 'Google (Gemini)', onbekend: 'Onbekend' };
  var AIK_PLAT_LBL = { team: 'Teamportaal', klant: 'Klantenportaal', cron: 'Automatisch (cron)', onbekend: 'Onbekend' };
  function aikMoney(n) { n = Number(n || 0); var dec = (n !== 0 && Math.abs(n) < 1) ? (Math.abs(n) < 0.01 ? 4 : 3) : 2; return '€ ' + n.toLocaleString('nl-BE', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function aikNum(n) { n = Number(n || 0); if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace('.', ',') + 'k'; return String(Math.round(n)); }
  function aikYmd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function aikSkillLabel(k) { k = String(k || ''); if (!k) return 'Overig'; return k.charAt(0).toUpperCase() + k.slice(1); }
  function aikRange() {
    var st = state.aik, today = new Date(), to = aikYmd(today), from;
    var d = new Date(today);
    if (st.period === '7d') { d.setDate(d.getDate() - 6); from = aikYmd(d); }
    else if (st.period === '90d') { d.setDate(d.getDate() - 89); from = aikYmd(d); }
    else if (st.period === 'maand') { from = aikYmd(new Date(today.getFullYear(), today.getMonth(), 1)); }
    else if (st.period === 'vmaand') { from = aikYmd(new Date(today.getFullYear(), today.getMonth() - 1, 1)); to = aikYmd(new Date(today.getFullYear(), today.getMonth(), 0)); }
    else if (st.period === 'custom') { from = st.from || aikYmd(new Date(today.getFullYear(), today.getMonth(), 1)); to = st.to || aikYmd(today); }
    else { d.setDate(d.getDate() - 29); from = aikYmd(d); }   // default 30d
    return { from: from, to: to };
  }
  function aikDefaults() { return { period: '30d', from: '', to: '', platform: 'all', provider: 'all', model: 'all', skill: 'all', bedrijf: 'all', member: 'all', hide_demo: false, stack: 'provider', metric: 'cost', data: null, loading: false }; }
  async function renderAiKosten(page) {
    var perms = state.perms || {};
    if (!perms.admin) { page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>AI-kosten</h1><div class="sub">Geen toegang.</div></div><div class="empty"><p>Dit overzicht is enkel voor de zaakvoerder.</p></div></div>'; return; }
    if (!state.aik) state.aik = aikDefaults();
    await loadAiKosten(page);
  }
  async function loadAiKosten(page) {
    var st = state.aik; var rng = aikRange();
    var body = { from: rng.from, to: rng.to, platform: st.platform, provider: st.provider, model: st.model, skill: st.skill, bedrijf: st.bedrijf, member: st.member, hide_demo: st.hide_demo ? 1 : 0, topN: 12 };
    if (!st.data) page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>AI-kosten</h1><div class="sub">Verbruik laden…</div></div><div class="empty"><p>AI-verbruik berekenen…</p></div></div>';
    var d = null;
    try { d = await api('teamAiCosts', body, { timeout: 45000 }); } catch (e) { d = null; }
    if (state.route !== 'aikosten') return;
    if (!d || !d.ok) {
      if (d && d.error === 'forbidden_role') { page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>AI-kosten</h1><div class="sub">Geen toegang voor jouw rol.</div></div></div>'; return; }
      loadFail(page, 'AI-kosten', function () { st.data = null; loadAiKosten(page); }); return;
    }
    st.data = d;
    drawAiKosten(page);
  }
  function aikSeg(opts, cur, attr) { return opts.map(function (o) { return '<button class="aik-seg-b' + (cur === o.k ? ' on' : '') + '" data-' + attr + '="' + o.k + '">' + esc(o.label) + '</button>'; }).join(''); }
  function aikSelect(name, opts, cur, allLabel) {
    var h = '<select class="fin-sel sm" data-aiksel="' + name + '"><option value="all">' + esc(allLabel) + '</option>';
    h += opts.map(function (o) { return '<option value="' + esc(o.key) + '"' + (String(cur) === String(o.key) ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('');
    return h + '</select>';
  }
  function drawAiKosten(page) {
    var st = state.aik, d = st.data, t = d.totals || {}, prev = d.prev || {};
    var opt = d.options || { providers: [], models: [], platforms: [], skills: [] };
    // --- delta vs vorige periode ---
    function delta(cur, was) { cur = Number(cur || 0); was = Number(was || 0); if (!was) return cur > 0 ? { txt: 'nieuw', cls: 'up' } : { txt: '—', cls: 'flat' }; var p = Math.round((cur - was) / was * 100); return { txt: (p > 0 ? '+' : p < 0 ? '−' : '') + Math.abs(p) + '%', cls: p > 0 ? 'up' : p < 0 ? 'down' : 'flat' }; }
    var dCost = delta(t.cost, prev.cost), dCalls = delta(t.calls, prev.calls);
    var proj = d.projection || {};
    // --- KPI-kaarten ---
    var kpis = [
      { lab: 'Kost in periode', val: aikMoney(t.cost), sub: dCost.txt + ' vs vorige', cls: dCost.cls, big: true },
      { lab: 'AI-calls', val: aikNum(t.calls), sub: dCalls.txt + ' vs vorige', cls: dCalls.cls },
      { lab: 'Tokens (in + uit)', val: aikNum(t.tokens), sub: aikNum(t.in) + ' in · ' + aikNum(t.out) + ' uit', cls: 'flat' },
      { lab: 'Gem. kost / call', val: aikMoney(t.avg_cost), sub: (t.est_calls ? (t.est_calls + ' geschat tarief') : 'op echte tarieven'), cls: 'flat' },
    ];
    if (proj.in_range) kpis.push({ lab: 'Projectie ' + (proj.month || 'maand'), val: aikMoney(proj.projected), sub: aikMoney(proj.spent) + ' tot nu', cls: 'flat' });
    var kpiHtml = '<div class="aik-kpis">' + kpis.map(function (k) {
      return '<div class="aik-kpi' + (k.big ? ' big' : '') + '"><div class="aik-kpi-l">' + esc(k.lab) + '</div><div class="aik-kpi-v">' + k.val + '</div><div class="aik-kpi-s ' + (k.cls || '') + '">' + esc(k.sub) + '</div></div>';
    }).join('') + '</div>';

    // --- toolbar (periode + filters) ---
    var periodOpts = [{ k: '7d', label: '7 d' }, { k: '30d', label: '30 d' }, { k: '90d', label: '90 d' }, { k: 'maand', label: 'Deze maand' }, { k: 'vmaand', label: 'Vorige maand' }, { k: 'custom', label: 'Aangepast' }];
    var toolbar = '<div class="aik-toolbar">'
      + '<div class="aik-seg" data-aikrole="period">' + aikSeg(periodOpts, st.period, 'period') + '</div>'
      + (st.period === 'custom' ? ('<span class="aik-dates"><input type="date" class="fin-sel sm" data-aikdate="from" value="' + esc(st.from || aikRange().from) + '"><span class="aik-dash">→</span><input type="date" class="fin-sel sm" data-aikdate="to" value="' + esc(st.to || aikRange().to) + '"></span>') : '')
      + '<span class="aik-filters">'
      + aikSelect('platform', opt.platforms, st.platform, 'Alle platformen')
      + aikSelect('provider', opt.providers, st.provider, 'Alle providers')
      + aikSelect('model', opt.models, st.model, 'Alle modellen')
      + aikSelect('skill', (opt.skills || []).map(function (s) { return { key: s, label: aikSkillLabel(s) }; }), st.skill, 'Alle skills')
      + aikSelect('bedrijf', (d.byBedrijf || []).map(function (b) { return { key: b.key, label: b.label }; }), st.bedrijf, 'Alle klanten')
      + aikSelect('member', (d.roster || []).map(function (m) { return { key: m.id, label: m.naam }; }), st.member, 'Alle teamleden')
      + '</span>'
      + (d.meta && d.meta.demo_present ? ('<button class="aik-mini-b' + (st.hide_demo ? ' on' : '') + '" data-aiktoggle="hide_demo">' + (st.hide_demo ? 'Voorbeelddata verborgen' : 'Verberg voorbeelddata') + '</button>') : '')
      + '</div>';

    // --- empty state (geen echte data) ---
    var hasReal = d.meta && d.meta.hasData && !(st.hide_demo && !realPresent(d));
    if (!d.meta || !d.meta.hasData) {
      page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>AI-kosten</h1><div class="sub">Monitor het AI-verbruik van Studio 27 (team + klanten) over Claude, ChatGPT en Gemini.</div></div>'
        + toolbar
        + '<div class="fincard aik-empty"><h3>Nog geen verbruiksdata</h3><p>Vanaf nu wordt elke AI-call (project-AI, dagplanning, ads-advies, agents, skills, de klant-chatbot…) automatisch gemeten: provider, model, tokens, kost, platform en de skill die het triggerde.</p><p class="aik-empty-sub">Het overzicht vult zich vanzelf naarmate het portaal gebruikt wordt. Wil je nu al zien hoe het dashboard eruitziet?</p><div class="aik-empty-act"><button class="aik-btn primary" data-aikact="seed">Vul voorbeelddata</button></div></div></div>';
      wireAiKosten(page); return;
    }

    // --- charts ---
    var series = d.series || [];
    var tsBlock = aikTimeSeries(d);
    var donutBlock = aikDonut(d.byProvider || [], 'provider');
    var provBars = aikBars('Per provider', d.byProvider || [], function (x) { return AIK_PROV_COL[x.key] || '#b9b3bd'; });
    var platBars = aikBars('Per platform', d.byPlatform || [], function (x) { return AIK_PLAT_COL[x.key] || '#b9b3bd'; });
    var modelBars = aikBars('Per model', d.byModel || [], function (x) { return AIK_PROV_COL[x.provider] || '#b9b3bd'; });
    var skillBars = aikBars('Per skill / feature', d.bySkill || [], function () { return 'var(--s27-purple)'; });
    var klantBars = aikBars('Per klant', d.byBedrijf || [], function () { return 'var(--s27-orange)'; });
    var teamBars = aikBars('Per teamlid', d.byMember || [], function () { return 'var(--s27-blue)'; });

    var demoBanner = (d.meta && d.meta.demo_present && !st.hide_demo)
      ? '<div class="aik-banner">Dit overzicht bevat <b>voorbeelddata</b> ter demonstratie. <button class="aik-link" data-aikact="wipe">Wis voorbeelddata</button> · <button class="aik-link" data-aiktoggle="hide_demo">Verberg</button></div>'
      : '';

    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>AI-kosten</h1><div class="sub">' + esc(d.range.from) + ' → ' + esc(d.range.to) + ' · ' + (d.range.days || 0) + ' dagen · alle providers</div></div>'
      + toolbar + demoBanner + kpiHtml
      + tsBlock
      + '<div class="fin-grid2">' + provBars + platBars + '</div>'
      + '<div class="fin-grid2">' + modelBars + skillBars + '</div>'
      + '<div class="fin-grid2">' + klantBars + teamBars + '</div>'
      + donutBlock
      + '<div class="fincard aik-billing-card"><div class="aik-card-head"><h3>Werkelijke facturatie bij de providers</h3><button class="aik-btn" data-aikact="billing">Echte kost ophalen</button></div>'
      + '<p class="aik-foot" style="margin:0">De cijfers hierboven zijn onze eigen meting (token × tarief), uitgesplitst per platform/skill/klant. Hieronder de <b>werkelijk gefactureerde</b> kost rechtstreeks bij Anthropic en OpenAI (org-totaal, vereist admin-keys). Google/Gemini vereist aparte Cloud Billing.</p>'
      + '<div id="aikBilling"></div></div>'
      + aikTable(d)
      + '<div class="aik-foot">Onze cijfers zijn schattingen op basis van publieke tarieven (USD→EUR). ' + (t.est_calls ? (t.est_calls + ' call(s) gebruikten een geschat tarief voor een onbekend model. ') : '') + '<button class="aik-link" data-aikact="prices">Tarieven bekijken</button></div>'
      + '</div>';
    wireAiKosten(page);
    try { wireTips(); } catch (e) { /* */ }
  }
  function realPresent(d) { return !!(d && d.meta && d.meta.hasData); }
  // --- tijdreeks: gestapelde dagbalken (stack op provider of platform) ---
  function aikTimeSeries(d) {
    var st = state.aik, series = d.series || [];
    var stackKeys, colOf, lblOf;
    if (st.stack === 'platform') { stackKeys = (d.byPlatform || []).map(function (x) { return x.key; }); colOf = function (k) { return AIK_PLAT_COL[k] || '#b9b3bd'; }; lblOf = function (k) { return AIK_PLAT_LBL[k] || k; }; }
    else { stackKeys = (d.byProvider || []).map(function (x) { return x.key; }); colOf = function (k) { return AIK_PROV_COL[k] || '#b9b3bd'; }; lblOf = function (k) { return AIK_PROV_LBL[k] || k; }; }
    var metric = st.metric === 'calls' ? 'calls' : 'cost';
    var maxT = 0.0001;
    series.forEach(function (s) { maxT = Math.max(maxT, metric === 'calls' ? (s.calls || 0) : (s.cost || 0)); });
    var byField = st.stack === 'platform' ? 'byPlatform' : 'byProvider';
    var rows = series.map(function (s) {
      var dayMap = s[byField] || {};
      var tot = metric === 'calls' ? (s.calls || 0) : (s.cost || 0);
      var segs = stackKeys.map(function (k) {
        var v = metric === 'calls' ? 0 : (dayMap[k] || 0);
        // calls-stack: we hebben enkel kost per stack/dag; voor calls tonen we de dag-totaalbalk in één kleur
        if (metric === 'calls') return '';
        if (v <= 0) return '';
        return '<span class="stk-seg" style="width:' + (v / maxT * 100) + '%;background:' + colOf(k) + '" data-tip="' + esc(aikShortDate(s.date) + ' · ' + lblOf(k) + ': ' + aikMoney(v)) + '"></span>';
      }).join('');
      if (metric === 'calls' && tot > 0) segs = '<span class="stk-seg" style="width:' + (tot / maxT * 100) + '%;background:var(--s27-purple)" data-tip="' + esc(aikShortDate(s.date) + ' · ' + tot + ' calls') + '"></span>';
      var totLbl = metric === 'calls' ? (tot ? String(tot) : '-') : (tot ? aikMoney(tot) : '-');
      return '<div class="stk-row"><span class="stk-lab">' + esc(aikShortDate(s.date)) + '</span><span class="stk-bars"><span class="stk-bar">' + segs + '</span></span><span class="stk-tot">' + totLbl + '</span></div>';
    }).join('');
    var legend = stackKeys.map(function (k) { return '<span class="aik-leg-i"><i style="background:' + colOf(k) + '"></i>' + esc(lblOf(k)) + '</span>'; }).join('');
    var head = '<div class="aik-card-head"><h3>Verloop per dag</h3><div class="aik-card-tools">'
      + '<div class="aik-seg sm" data-aikrole="metric">' + aikSeg([{ k: 'cost', label: '€ kost' }, { k: 'calls', label: 'calls' }], st.metric || 'cost', 'metric') + '</div>'
      + '<div class="aik-seg sm" data-aikrole="stack">' + aikSeg([{ k: 'provider', label: 'provider' }, { k: 'platform', label: 'platform' }], st.stack || 'provider', 'stack') + '</div>'
      + '</div></div>';
    return '<div class="fincard">' + head + (rows ? ('<div class="stk-rows aik-ts">' + rows + '</div><div class="aik-legend">' + legend + '</div>') : '<div class="empty" style="padding:14px"><p>Geen data in deze periode.</p></div>') + '</div>';
  }
  function aikShortDate(ymd) { var p = String(ymd).split('-'); return p.length === 3 ? (p[2] + '/' + p[1]) : ymd; }
  // --- horizontale balken-breakdown (cbar-stijl) ---
  function aikBars(title, arr, colorFn) {
    arr = arr || [];
    var max = 0.0001; arr.forEach(function (x) { max = Math.max(max, x.cost || 0); });
    var grandTotal = 0; arr.forEach(function (x) { grandTotal += (x.cost || 0); });
    var rows = arr.length ? arr.map(function (x) {
      var col = colorFn(x);
      var share = grandTotal > 0 ? Math.round((x.cost || 0) / grandTotal * 100) : 0;
      return '<div class="cbar"><span class="cbar-l" title="' + esc(x.label) + '">' + esc(x.label) + '</span>'
        + '<span class="cbar-t"><i style="width:' + pct(x.cost || 0, max) + '%;background:' + col + '"></i></span>'
        + '<span class="cbar-v" data-tip="' + esc(x.calls + ' calls · ' + aikNum((x.in || 0) + (x.out || 0)) + ' tokens · ' + share + '%') + '">' + aikMoney(x.cost) + '</span></div>';
    }).join('') : '<div class="empty" style="padding:12px"><p>Geen data.</p></div>';
    return '<div class="fincard"><h3>' + esc(title) + '</h3><div class="cbars">' + rows + '</div></div>';
  }
  // --- donut (SVG, geen library) provider-mix op kost ---
  function aikDonut(arr, kind) {
    arr = (arr || []).filter(function (x) { return (x.cost || 0) > 0; });
    var total = 0; arr.forEach(function (x) { total += x.cost || 0; });
    if (!total) return '';
    var R = 64, C = 2 * Math.PI * R, off = 0;
    var segs = arr.map(function (x) {
      var frac = (x.cost || 0) / total;
      var col = AIK_PROV_COL[x.key] || 'var(--s27-purple)';
      var len = frac * C;
      var seg = '<circle r="' + R + '" cx="90" cy="90" fill="none" stroke="' + col + '" stroke-width="26" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 90 90)"><title>' + esc((AIK_PROV_LBL[x.key] || x.key) + ': ' + aikMoney(x.cost) + ' (' + Math.round(frac * 100) + '%)') + '</title></circle>';
      off += len; return seg;
    }).join('');
    var legend = arr.map(function (x) { return '<div class="aik-dleg"><i style="background:' + (AIK_PROV_COL[x.key] || 'var(--s27-purple)') + '"></i><span class="aik-dleg-n">' + esc(AIK_PROV_LBL[x.key] || x.key) + '</span><span class="aik-dleg-v">' + aikMoney(x.cost) + ' · ' + Math.round((x.cost || 0) / total * 100) + '%</span></div>'; }).join('');
    return '<div class="fincard aik-donut-card"><h3>Verdeling per provider</h3><div class="aik-donut-wrap"><svg viewBox="0 0 180 180" class="aik-donut">' + segs + '<text x="90" y="84" text-anchor="middle" class="aik-donut-t">' + aikMoney(total) + '</text><text x="90" y="103" text-anchor="middle" class="aik-donut-sub">totaal</text></svg><div class="aik-dlegs">' + legend + '</div></div></div>';
  }
  // --- detailtabel: recente calls ---
  function aikTable(d) {
    var rows = (d.recent || []).slice(0, 60);
    if (!rows.length) return '';
    var body = rows.map(function (e) {
      var dt = new Date(e.t); var when = aikShortDate(aikYmd(dt)) + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
      var plat = '<span class="aik-tag" style="--tc:' + (AIK_PLAT_COL[e.plat] || '#b9b3bd') + '">' + esc(AIK_PLAT_LBL[e.plat] || e.plat) + '</span>';
      var who = e.bn ? esc(e.bn) : (e.mn ? esc(e.mn) : '—');
      return '<tr><td class="aik-td-dim">' + esc(when) + '</td><td>' + plat + '</td><td>' + esc(aikSkillLabel(e.sk)) + '</td><td class="aik-td-dim">' + esc(e.mdl) + '</td><td>' + who + '</td><td class="aik-td-r aik-td-dim">' + aikNum((e.i || 0) + (e.o || 0)) + '</td><td class="aik-td-r aik-td-strong">' + aikMoney(e.c) + (e.demo ? ' <span class="aik-demo-dot" title="voorbeelddata">•</span>' : '') + '</td></tr>';
    }).join('');
    return '<div class="fincard"><h3>Recente AI-calls</h3><div class="aik-table-wrap"><table class="aik-table"><thead><tr><th>Wanneer</th><th>Platform</th><th>Skill / feature</th><th>Model</th><th>Klant / teamlid</th><th class="aik-td-r">Tokens</th><th class="aik-td-r">Kost</th></tr></thead><tbody>' + body + '</tbody></table></div></div>';
  }
  // --- events ---
  function wireAiKosten(page) {
    var st = state.aik;
    page.querySelectorAll('[data-period]').forEach(function (b) { b.addEventListener('click', function () { st.period = b.getAttribute('data-period'); st.data = null; loadAiKosten(page); }); });
    page.querySelectorAll('[data-aikdate]').forEach(function (inp) { inp.addEventListener('change', function () { st[inp.getAttribute('data-aikdate')] = inp.value; st.period = 'custom'; st.data = null; loadAiKosten(page); }); });
    page.querySelectorAll('[data-aiksel]').forEach(function (sel) { sel.addEventListener('change', function () { st[sel.getAttribute('data-aiksel')] = sel.value; st.data = null; loadAiKosten(page); }); });
    page.querySelectorAll('[data-metric]').forEach(function (b) { b.addEventListener('click', function () { st.metric = b.getAttribute('data-metric'); drawAiKosten(page); }); });
    page.querySelectorAll('[data-stack]').forEach(function (b) { b.addEventListener('click', function () { st.stack = b.getAttribute('data-stack'); drawAiKosten(page); }); });
    page.querySelectorAll('[data-aiktoggle="hide_demo"]').forEach(function (b) { b.addEventListener('click', function () { st.hide_demo = !st.hide_demo; st.data = null; loadAiKosten(page); }); });
    page.querySelectorAll('[data-aikact]').forEach(function (b) { b.addEventListener('click', function () { aikAction(page, b.getAttribute('data-aikact')); }); });
  }
  async function aikAction(page, act) {
    var st = state.aik;
    if (act === 'seed') {
      if (!confirm('Voorbeelddata toevoegen? Dit schrijft ~30 dagen gemarkeerde demo-events weg zodat je het dashboard kan zien. Je kan ze later met één klik wissen.')) return;
      toast('Voorbeelddata aanmaken…');
      try { var r = await api('teamAiCostsSeed', {}, { timeout: 60000 }); toast(r && r.ok ? ('Voorbeelddata toegevoegd (' + (r.written || 0) + ' events).') : 'Aanmaken lukte niet.'); } catch (e) { toast('Aanmaken lukte niet.'); }
      st.data = null; loadAiKosten(page); return;
    }
    if (act === 'wipe') {
      if (!confirm('Alle voorbeelddata verwijderen? Echte verbruiksdata blijft behouden.')) return;
      toast('Voorbeelddata wissen…');
      try { var r2 = await api('teamAiCostsWipe', {}, { timeout: 60000 }); toast(r2 && r2.ok ? 'Voorbeelddata gewist.' : 'Wissen lukte niet.'); } catch (e) { toast('Wissen lukte niet.'); }
      st.data = null; st.hide_demo = false; loadAiKosten(page); return;
    }
    if (act === 'prices') { aikShowPrices(page); return; }
    if (act === 'billing') { aikLoadBilling(page); return; }
  }
  async function aikLoadBilling(page) {
    var box = page.querySelector('#aikBilling'); if (!box) return;
    var rng = aikRange();
    box.innerHTML = '<div class="empty" style="padding:14px"><p>Echte facturatie ophalen bij de providers…</p></div>';
    var d = null;
    try { d = await api('teamAiBilling', { from: rng.from, to: rng.to }, { timeout: 60000 }); } catch (e) { d = null; }
    if (!d || !d.ok) { box.innerHTML = '<div class="aik-banner">Ophalen lukte niet' + (d && d.error ? (' (' + esc(d.error) + ')') : '') + '.</div>'; return; }
    box.innerHTML = aikBillingHtml(d);
  }
  function aikBillingHtml(d) {
    var provs = d.providers || [];
    var configured = provs.filter(function (p) { return p.configured; });
    var okProvs = configured.filter(function (p) { return p.ok; });
    // onze eigen meting per provider (voor een eerlijke reconciliatie: enkel de geconfigureerde providers vergelijken)
    var ourByProv = {};
    if (d.ours && Array.isArray(d.ours.byProvider)) d.ours.byProvider.forEach(function (x) { ourByProv[x.key] = Number(x.cost || 0); });

    // ---- samenvatting-strip: totaal gefactureerd + eerlijk verschil t.o.v. onze meting ----
    var head = '';
    if (okProvs.length) {
      var billedTotal = okProvs.reduce(function (s, p) { return s + Number(p.total_eur || 0); }, 0);
      var billedUsd = okProvs.reduce(function (s, p) { return s + Number(p.total_usd || 0); }, 0);
      var oursCfg = okProvs.reduce(function (s, p) { return s + (ourByProv[p.provider] || 0); }, 0);
      var sumDiff = (oursCfg > 0 && billedTotal > 0) ? Math.round((oursCfg - billedTotal) / billedTotal * 100) : null;
      var allCfg = configured.length === provs.length && okProvs.length === provs.length;
      head = '<div class="aik-bill-sum">'
        + '<div class="aik-bill-sum-main"><span class="aik-bill-sum-lab">Werkelijk gefactureerd' + (allCfg ? '' : ' (gekoppelde providers)') + '</span>'
        + '<span class="aik-bill-sum-v">' + aikMoney(billedTotal) + '<span class="aik-bill-usd"> $' + billedUsd.toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></span></div>'
        + (sumDiff != null ? ('<div class="aik-bill-sum-diff ' + (Math.abs(sumDiff) <= 10 ? 'ok' : 'warn') + '"><span class="aik-bill-sum-diff-v">' + (sumDiff > 0 ? '+' : '') + sumDiff + '%</span><span class="aik-bill-sum-diff-l">onze schatting ' + (sumDiff >= 0 ? 'hoger' : 'lager') + ', zelfde periode</span></div>') : '')
        + '</div>';
    }

    // ---- per provider: kaart met totaal, dag-sparkline, per-model balken en reconciliatie ----
    var cards = provs.map(function (p) {
      var col = AIK_PROV_COL[p.provider] || 'var(--s27-purple)';
      if (!p.configured) {
        return '<div class="aik-bprov off"><div class="aik-bprov-h"><span class="aik-bprov-dot" style="background:#c9c4cd"></span><span class="aik-bprov-name">' + esc(p.label) + '</span><span class="aik-bprov-tag">niet gekoppeld</span></div><p class="aik-bprov-hint">' + esc(p.hint || 'Geen admin-key') + '</p></div>';
      }
      if (!p.ok) {
        return '<div class="aik-bprov off"><div class="aik-bprov-h"><span class="aik-bprov-dot" style="background:var(--s27-orange)"></span><span class="aik-bprov-name">' + esc(p.label) + '</span><span class="aik-bprov-tag warn">fout</span></div><p class="aik-bprov-hint">' + esc(p.error || 'onbekende fout') + '</p></div>';
      }
      // dag-sparkline
      var days = p.days || [];
      var maxD = 0.0001; days.forEach(function (x) { maxD = Math.max(maxD, Number(x.eur || 0)); });
      var spark = days.length ? ('<div class="aik-bprov-spark">' + days.map(function (x) {
        var h = Math.max(4, Math.round(Number(x.eur || 0) / maxD * 100));
        return '<span class="aik-bspark-bar" style="height:' + h + '%;background:' + col + '" data-tip="' + esc(aikShortDate(x.date) + ' · ' + aikMoney(x.eur)) + '"></span>';
      }).join('') + '</div>') : '';
      // per-model balken
      var models = (p.byModel || []).slice(0, 6);
      var maxM = 0.0001; models.forEach(function (m) { maxM = Math.max(maxM, Number(m.eur || 0)); });
      var modelRows = models.length ? ('<div class="aik-bprov-models">' + models.map(function (m) {
        return '<div class="cbar"><span class="cbar-l" title="' + esc(m.label) + '">' + esc(m.label) + '</span><span class="cbar-t"><i style="width:' + pct(Number(m.eur || 0), maxM) + '%;background:' + col + '"></i></span><span class="cbar-v">' + aikMoney(m.eur) + '</span></div>';
      }).join('') + '</div>') : '';
      // reconciliatie t.o.v. onze meting voor net deze provider
      var ourC = ourByProv[p.provider];
      var recon = '';
      if (ourC != null) {
        var pdiff = Number(p.total_eur) > 0 ? Math.round((ourC - Number(p.total_eur)) / Number(p.total_eur) * 100) : null;
        recon = '<div class="aik-bprov-recon"><span>Onze schatting <b>' + aikMoney(ourC) + '</b></span>' + (pdiff != null ? ('<span class="aik-bprov-recon-d ' + (Math.abs(pdiff) <= 10 ? 'ok' : 'warn') + '">' + (pdiff > 0 ? '+' : '') + pdiff + '%</span>') : '') + '</div>';
      }
      return '<div class="aik-bprov">'
        + '<div class="aik-bprov-h"><span class="aik-bprov-dot" style="background:' + col + '"></span><span class="aik-bprov-name">' + esc(p.label) + '</span></div>'
        + '<div class="aik-bprov-tot">' + aikMoney(p.total_eur) + '<span class="aik-bill-usd"> $' + Number(p.total_usd || 0).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>'
        + spark + modelRows + recon
        + '</div>';
    }).join('');

    var note = !d.any_configured
      ? '<div class="aik-banner">Nog geen admin-keys gezet. Maak een Anthropic Admin-key (sk-ant-admin-…) en/of OpenAI Admin-key (sk-admin-…) aan en zet ze als worker-secret <code>ANTHROPIC_ADMIN_KEY</code> / <code>OPENAI_ADMIN_KEY</code>. Daarna verschijnt hier de echte gefactureerde kost.</div>'
      : '';
    return head + '<div class="aik-bprov-grid">' + cards + '</div>' + note
      + '<p class="aik-foot" style="margin:10px 0 0">Periode ' + esc(d.range.from) + ' → ' + esc(d.range.to) + ' · koers 1 USD = € ' + (d.eur_per_usd || '?') + '. Provider-facturatie is een org-totaal en kan niet per skill/klant/platform worden uitgesplitst. Dat blijft het unieke van onze eigen meting hierboven.</p>';
  }
  function aikShowPrices(page) {
    var d = state.aik.data, p = (d && d.pricing) || {};
    var models = p.models || {};
    var rows = Object.keys(models).sort().map(function (m) { var r = models[m] || {}; return '<tr><td>' + esc(m) + '</td><td class="aik-td-r">$' + (r.in != null ? r.in : '?') + '</td><td class="aik-td-r">$' + (r.out != null ? r.out : '?') + '</td></tr>'; }).join('');
    var html = '<div class="aik-modal-bd"><div class="aik-modal"><div class="aik-modal-h"><h3>AI-tarieven</h3><button class="aik-modal-x" data-aikx>×</button></div>'
      + '<p class="aik-modal-p">Tarieven in USD per 1 miljoen tokens (input / output). Wisselkoers: 1 USD = € ' + (p.eur_per_usd || '?') + '. Whisper: $' + (p.whisper_usd_per_min || '?') + ' / minuut. Deze waarden zijn aanpasbaar in de gateway (KV-override <code>ai:pricing:v1</code>).</p>'
      + '<div class="aik-table-wrap"><table class="aik-table"><thead><tr><th>Model</th><th class="aik-td-r">Input ($/1M)</th><th class="aik-td-r">Output ($/1M)</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
    var div = document.createElement('div'); div.innerHTML = html; var node = div.firstChild; document.body.appendChild(node);
    function close() { try { document.body.removeChild(node); } catch (e) { /* */ } }
    node.addEventListener('click', function (ev) { if (ev.target === node || ev.target.hasAttribute('data-aikx')) close(); });
  }

  function render() {
    var titles = { home: 'Home', planner: 'Weekplanner', capaciteit: 'Cijfers & Capaciteit', cijfers: 'Cijfers & Capaciteit', bezetting: 'Bezetting', collega: "Collega's", verlof: 'Verlof', aanvragen: 'Shoot-aanvragen', berichten: 'Berichten', sollicitaties: 'Werving', vacatures: 'Vacatures', adverteren: 'Adverteerders', instellingen: 'Instellingen', aiknoppen: 'AI-knoppen', automatiseringen: 'Automatiseringen', offertes: 'Offerteaanvragen', meetings: 'Meetings', agents: 'AI-agents', skills: 'Skills', plugins: 'Plugins', connectoren: 'Connectoren', socials: 'Social posts', aikosten: 'AI-kosten' };
    $('crumb').textContent = titles[state.route] || 'Teamportaal';
    if (window.__plmCard) hideMonthCard();   // hover-kaart nooit laten blijven hangen bij navigatie
    var page = $('page'); page.scrollTop = 0;
    if (state.route === 'home') return renderHome(page);
    if (state.route === 'planner') return renderPlanner(page);
    if (state.route === 'capaciteit') return renderCapaciteit(page);
    if (state.route === 'cijfers') return renderCijfers(page);
    if (state.route === 'bezetting') return renderBezetting(page);
    if (state.route === 'collega') return renderCollega(page);
    if (state.route === 'verlof') return renderVerlof(page);
    if (state.route === 'berichten') return renderBerichten(page);
    if (state.route === 'aanvragen') return renderAanvragen(page);
    if (state.route === 'sollicitaties') return renderSollicitaties(page);
    if (state.route === 'vacatures') return renderVacatures(page);
    if (state.route === 'adverteren') return renderAdverteren(page);
    if (state.route === 'socials') return renderSocials(page);
    if (state.route === 'instellingen') return renderInstellingen(page);
    if (state.route === 'aiknoppen') return renderAiBeheer(page);
    if (state.route === 'connectoren') return renderConnectoren(page);
    if (state.route === 'skills') return renderSkills(page);
    if (state.route === 'plugins') return renderPlugins(page);
    if (state.route === 'automatiseringen') return renderAutomations(page);
    if (state.route === 'offertes') return renderOffertes(page);
    if (state.route === 'meetings') return renderMeetings(page);
    if (state.route === 'agents') return renderAgents(page);
    if (state.route === 'aikosten') return renderAiKosten(page);
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
  // Snelle, grote custom tooltip op grafiek-elementen met [data-tip] (instant, geen browser-vertraging).
  function wireTips() {
    if (window.__s27Tip) return;
    var tip = document.createElement('div'); tip.className = 's27tip'; tip.style.display = 'none'; document.body.appendChild(tip);
    window.__s27Tip = tip;
    var place = function (x, y) { var w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14)) + 'px'; tip.style.top = Math.max(8, y - h - 12) + 'px'; };
    document.addEventListener('mouseover', function (e) { var el = e.target && e.target.closest ? e.target.closest('[data-tip]') : null; if (!el) return; tip.textContent = el.getAttribute('data-tip') || ''; tip.style.display = 'block'; place(e.clientX, e.clientY); });
    document.addEventListener('mousemove', function (e) { if (tip.style.display === 'block') place(e.clientX, e.clientY); });
    document.addEventListener('mouseout', function (e) { var el = e.target && e.target.closest ? e.target.closest('[data-tip]') : null; if (el) tip.style.display = 'none'; });
  }

  /* ---- HOME = dagplanning-overzicht (AI-voorstel + agenda + taken) ---- */
  function hhmm(ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function homeEvent(ev) {
    return '<div class="ha-row"><span class="ha-time">' + (ev.allday ? 'hele dag' : (hhmm(ev.start_ms) + '-' + hhmm(ev.eind_ms))) + '</span>' +
      '<span class="ha-tx"><b>' + esc(ev.titel) + '</b>' + (ev.locatie ? '<span class="ha-loc">' + esc(ev.locatie) + '</span>' : '') + '</span></div>';
  }
  // AI-dagplan op Home: cache-first (door de 05:00-cron al klaargezet) → meestal instant.
  // Async geladen zodat Home nooit blokkeert op een trage live-berekening.
  async function loadHomeAiPlan(force) {
    var out = $('ai-out'); if (!out) return;
    if (force) out.innerHTML = '<div class="fincard"><div class="empty"><p>De AI denkt opnieuw na…</p></div></div>';
    var r; try { r = await api('teamAiPlan', force ? { refresh: true } : {}, { timeout: 45000 }); } catch (e) { r = { _e: (e && e.timeout) ? 'timeout' : 'net' }; }
    if (state.route !== 'home') return;
    out = $('ai-out'); if (!out) return;
    if (!r || !r.ok) {
      var em = r && (r.error || r._e);
      var msg = em === 'no_anthropic_key' ? 'AI-sleutel ontbreekt (zet ANTHROPIC_API_KEY).' : em === 'timeout' ? 'De AI deed er te lang over, klik ↻ om opnieuw te proberen.' : 'De AI is even niet bereikbaar, klik ↻ om opnieuw te proberen.' + (em ? ' (' + em + ')' : '');
      out.innerHTML = '<div class="fincard"><div class="empty"><p>' + esc(msg) + '</p></div></div>';
      return;
    }
    out.innerHTML = '<div class="fincard"><div class="ai-plan">' + aiFmt(r.plan) + '</div><p class="micro" style="margin-top:14px;color:var(--ink-4)">Voorstel op basis van ' + r.aantal + ' openstaande taken' + (r.cached ? ' · vanochtend automatisch klaargezet' : '') + '. Het blijft jouw planning, pas gerust aan.</p></div>';
  }
  // Aanklikbare "Te laat"/"Te plannen" vanaf Home → ingezoomde lijst met terugknop (geen aparte route).
  function renderHomeList(page, which) {
    var d = state.taken; if (!d || !d.ok) { state.homeList = null; return renderHome(page); }
    var arr = which === 'te_laat' ? (d.te_laat || []) : (d.te_doen || []);
    var titel = which === 'te_laat' ? 'Te laat' : 'Te plannen';
    var sub = which === 'te_laat' ? 'Taken waarvan de deadline voorbij is' : 'Taken zonder plek in je planning';
    page.innerHTML = '<div class="panel active"><button class="backlink" id="hl-back"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg> Terug naar home</button>' +
      '<div class="t-hero"><h1>' + titel + '</h1><div class="sub">' + arr.length + ' ' + (arr.length === 1 ? 'taak' : 'taken') + ' · ' + esc(sub) + '</div></div>' +
      projList(arr, 'Niets hier. 🎉', which === 'te_laat' ? {} : { showDue: false }) + '</div>';
    if ($('hl-back')) $('hl-back').onclick = function () { state.homeList = null; renderHome(page); };
    wireRows(page);
  }
  async function renderHome(page) {
    if (state.homeList) return renderHomeList(page, state.homeList);
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>' + esc(groet()) + ', ' + esc(voornaam(state.me.naam)) + '</h1><div class="sub">' + esc(vandaagLang()) + '</div></div><div class="empty"><p>Je dag laden…</p></div></div>';
    var t0 = new Date(); t0.setHours(0, 0, 0, 0); var vanMs = t0.getTime(), totMs = vanMs + 86400000;
    var d, ag;
    try { var res = await Promise.all([api('teamTaken', {}), api('teamPlannerAgenda', { van_ms: vanMs, tot_ms: totMs }).catch(function () { return null; })]); d = res[0]; ag = res[1]; } catch (e) { return; }
    if (state.route !== 'home') return;
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = 'Kon je planning niet laden.'; return; }
    state.taken = d; var c = d.tellingen;
    // Hoofdblokken bovenaan. "Te laat" + "Te plannen" zijn aanklikbaar → ingezoomde lijst.
    var stat = function (n, l, br, goKey) { var tag = goKey ? 'button' : 'div'; return '<' + tag + ' class="tstat ' + br + (goKey ? ' tstat-go' : '') + '"' + (goKey ? ' data-go="' + goKey + '"' : '') + '><div class="n">' + n + '</div><div class="l">' + l + (goKey ? ' <span class="tstat-arr">›</span>' : '') + '</div></' + tag + '>'; };
    var evs = (ag && ag.ok && Array.isArray(ag.events)) ? ag.events.slice().sort(function (a, b) { return a.start_ms - b.start_ms; }) : [];
    var html = '<div class="panel active"><div class="t-hero"><h1>' + esc(groet()) + ', ' + esc(voornaam(state.me.naam)) + '</h1><div class="sub">' + esc(vandaagLang()) + '</div></div>' +
      '<div class="tstats">' + stat(c.vandaag, 'Vandaag', c.vandaag ? 'br-orange' : 'br-green') + stat(c.morgen, 'Morgen', 'br-blue') + stat(c.te_laat, 'Te laat', c.te_laat ? 'br-orange' : 'br-green', c.te_laat ? 'te_laat' : '') + stat(c.te_doen, 'Te plannen', 'br-purple', c.te_doen ? 'te_doen' : '') + '</div>' +
      '<div class="section-head"><h2>Jouw voorgestelde dag</h2><button class="btn btn-outline btn-sm" id="ai-refresh">' + svgIc(IC.refresh, 14) + ' Vernieuw</button></div>' +
      '<div id="ai-out"><div class="fincard"><div class="empty"><p>De AI stelt je dag samen…</p></div></div></div>';
    if (evs.length) html += sec('Agenda vandaag', evs.length) + '<div class="home-agenda">' + evs.map(homeEvent).join('') + '</div>';
    html += sec('Te doen vandaag', c.vandaag) + projList(d.vandaag, 'Niets te doen vandaag. 🎉', { showDue: false }) +
      sec('Morgen', c.morgen) + projList(d.morgen, 'Niets gepland voor morgen.', { showDue: false });
    html += '</div>';
    page.innerHTML = html; wireRows(page);
    Array.prototype.forEach.call(page.querySelectorAll('.tstat-go'), function (b) { b.onclick = function () { state.homeList = b.getAttribute('data-go'); renderHomeList(page, state.homeList); }; });
    if ($('ai-refresh')) $('ai-refresh').onclick = function () { loadHomeAiPlan(true); };
    loadHomeAiPlan(false);
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

  /* ---- WEEKPLANNER (drag-and-drop, ClickUp-Planner-stijl) ---- */
  var DOWS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  var DAY_START = 8, DAY_END = 19, HOUR_PX = 46, SNAP_MIN = 15, PLAN_DAYS = 7, ALLDAY_PX = 24; // ma-zo, 08-19u
  var PL = { tasks: [], agenda: {}, target: null, roster: [], canPick: false, weekStart: null, member: 0 };

  function mondayOf(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x; }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function ymdOf(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function ymdFromMs(ms) { return ymdOf(new Date(ms)); }
  function sameDayMs(ms, d) { var t = new Date(ms); return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate(); }
  function hourFrac(ms) { var t = new Date(ms); return t.getHours() + t.getMinutes() / 60; }
  function estHours(t) { return t.est ? t.est / 3600000 : 1; }
  function weekKeyOf(ws) { return ymdOf(ws); }
  function rangesOverlap(s1, e1, s2, e2) { return e1 > s2 && s1 < e2; }
  function dayInRange(day, s, e) { var d0 = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime(); return s < d0 + 86400000 && e > d0; }

  async function renderPlanner(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Weekplanner</h1><div class="sub">Je week laden…</div></div><div class="empty"><p>Planning ophalen…</p></div></div>';
    if (!PL.weekStart) PL.weekStart = mondayOf(new Date());
    PL.agenda = {};   // verse agenda-cache (kan een ander teamlid zijn)
    var d; try { d = await api('teamPlanner', PL.member ? { member: PL.member } : {}); } catch (e) { return; }
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = 'Kon de planner niet laden.'; return; }
    PL.tasks = d.tasks || []; PL.target = d.target; PL.roster = d.roster || []; PL.canPick = !!d.can_pick;
    if (!PL.member && PL.target) PL.member = 0; // 0 = ikzelf
    drawPlanner(page);
    ensureAgenda(page);
  }

  // Google-agenda van het bekeken teamlid voor de zichtbare week (gecached per week).
  async function ensureAgenda(page) {
    var key = weekKeyOf(PL.weekStart);
    if (PL.agenda[key]) return;
    PL.agenda[key] = { events: [], loading: true };
    var ws = PL.weekStart;
    var van = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate(), 0, 0, 0, 0).getTime();
    var totD = addDays(ws, PLAN_DAYS); var tot = new Date(totD.getFullYear(), totD.getMonth(), totD.getDate(), 0, 0, 0, 0).getTime();
    var body = { van_ms: van, tot_ms: tot }; if (PL.member) body.member = PL.member;
    var r; try { r = await api('teamPlannerAgenda', body); } catch (e) { r = null; }
    PL.agenda[key] = (r && r.ok) ? { events: r.events || [], toonTitel: r.toon_titel } : { events: [] };
    if (state.route === 'planner') drawPlanner(page);
  }

  function gridLines() { var s = ''; for (var h = DAY_START; h < DAY_END; h++) s += '<div class="pl-line" style="top:' + ((h - DAY_START) * HOUR_PX) + 'px"></div>'; return s; }

  function plCard(t) {
    var disc = DISC_LABEL[t.discipline] || t.discipline || '';
    var due = t.due_ymd ? '<span class="pl-due' + (t.due_ymd < todayYmd() ? ' laat' : '') + '">' + dueLabel(t.due_ymd) + '</span>' : '';
    var est = t.est ? (Math.round(t.est / 3600000 * 10) / 10) + 'u' : '·';
    return '<div class="pl-card ' + discBr(t.discipline) + '" data-id="' + esc(t.id) + '" data-est="' + (t.est || 0) + '" data-due="' + (t.due || 0) + '">' +
      '<span class="bar"></span><div class="pl-card-main"><div class="pl-card-nm">' + esc(t.naam) + '</div><div class="pl-card-sub">' + esc(t.bedrijf || disc) + '</div></div><span class="pl-est">' + est + '</span>' + due + '</div>';
  }

  function plBlock(t) {
    var top = Math.max(0, (hourFrac(t.start) - DAY_START) * HOUR_PX);
    var h = Math.max(estHours(t) * HOUR_PX, 26);
    var st = new Date(t.start); var hm = String(st.getHours()).padStart(2, '0') + ':' + String(st.getMinutes()).padStart(2, '0');
    var dlChip = (t.due && t.due_ymd && t.due_ymd !== t.start_ymd) ? '<span class="pl-bl-dl">🎯 ' + dueLabel(t.due_ymd) + '</span>' : '';
    var vast = !!t.vast;
    var cls = 'pl-block ' + discBr(t.discipline) + (vast ? ' pl-vast pl-vast-' + (t.vast_soort || '') : ' pl-movable');
    var lock = vast ? '<span class="pl-lock" title="Staat vast, verschuift niet automatisch">🔒</span>' : '';
    return '<div class="' + cls + '" data-id="' + esc(t.id) + '" data-est="' + (t.est || 0) + '" data-due="' + (t.due || 0) + '"' + (vast ? ' data-vast="1"' : '') + ' style="top:' + top + 'px;height:' + h + 'px">' +
      '<span class="bar"></span>' + lock + '<div class="pl-bl-in"><div class="pl-bl-nm">' + esc(t.naam) + '</div><div class="pl-bl-meta">' + hm + ' · ' + esc(t.bedrijf || DISC_LABEL[t.discipline] || '') + '</div>' + dlChip + '</div></div>';
  }

  // Google-agenda-blok (getimed event), leesbaar; klikbaar om detail te bekijken én te
  // bewerken, maar ENKEL je eigen agenda (collega-events tonen 'Bezet', niet klikbaar).
  function plEvent(ev, editable) {
    var top = Math.max(0, (hourFrac(ev.start_ms) - DAY_START) * HOUR_PX);
    var dur = (ev.eind_ms - ev.start_ms) / 3600000;
    var h = Math.max(dur * HOUR_PX, 22);
    var st = new Date(ev.start_ms); var et = new Date(ev.eind_ms);
    var hm = String(st.getHours()).padStart(2, '0') + ':' + String(st.getMinutes()).padStart(2, '0');
    var hm2 = String(et.getHours()).padStart(2, '0') + ':' + String(et.getMinutes()).padStart(2, '0');
    var tip = ev.titel + ' · ' + hm + '-' + hm2 + (ev.locatie ? ' · ' + ev.locatie : '');
    var inner = '<div class="pl-event-nm">' + esc(ev.titel) + '</div><div class="pl-event-meta">' + hm + (ev.locatie ? ' · ' + esc(ev.locatie) : '') + '</div>';
    var sty = 'top:' + top + 'px;height:' + h + 'px;--evh:' + h + 'px';
    var can = !!(editable && ev.id);
    return '<div class="pl-event' + (can ? ' linked' : '') + '" data-evid="' + esc(ev.id || '') + '" style="' + sty + '" title="' + esc(tip) + '">' + inner + (can ? '<span class="pl-event-go">' + svgIc(IC.edit, 13) + '</span>' : '') + '</div>';
  }

  // all-day-items voor een dag = goedgekeurd verlof dat de dag dekt + all-day agenda-events
  function dayAllday(day) {
    var out = [];
    PL.tasks.forEach(function (t) { if (t.vast_soort === 'payroll' && t.start && dayInRange(day, t.start, t.due || t.start + 86400000)) out.push({ txt: t.naam || 'Verlof', cls: 'verlof' }); });
    var key = weekKeyOf(PL.weekStart); var evs = (PL.agenda[key] && PL.agenda[key].events) || [];
    evs.forEach(function (e) { if (e.allday && dayInRange(day, e.start_ms, e.eind_ms)) out.push({ txt: e.titel, cls: 'agenda', link: e.link || '' }); });
    return out;
  }

  function plViewToggle() {
    return '<div class="pl-viewtog" role="group" aria-label="Weergave"><button class="pl-vt' + (PL.view !== 'month' ? ' on' : '') + '" data-v="week" aria-pressed="' + (PL.view !== 'month' ? 'true' : 'false') + '">Week</button><button class="pl-vt' + (PL.view === 'month' ? ' on' : '') + '" data-v="month" aria-pressed="' + (PL.view === 'month' ? 'true' : 'false') + '">Maand</button></div>';
  }
  function drawPlanner(page) {
    if (PL.view === 'month') return drawPlannerMonth(page);
    var ws = PL.weekStart;
    var days = []; for (var i = 0; i < PLAN_DAYS; i++) days.push(addDays(ws, i));
    var key = weekKeyOf(ws); var weekEvents = (PL.agenda[key] && PL.agenda[key].events) || [];
    var picker = '';   // collega-kiezer verwijderd, gebruik 'Bekijk als…' (volledig portaal) i.p.v. peeken naar andermans week
    var wkLabel = days[0].getDate() + ' ' + MONTHS[days[0].getMonth()] + ' - ' + days[PLAN_DAYS - 1].getDate() + ' ' + MONTHS[days[PLAN_DAYS - 1].getMonth()];
    var toolbar = '<div class="pl-toolbar">' +
      '<div class="pl-nav"><button class="pl-arrow" id="pl-prev" aria-label="Vorige week">‹</button><button class="pl-today" id="pl-today">Deze week</button><button class="pl-arrow" id="pl-next" aria-label="Volgende week">›</button></div>' +
      '<div class="pl-week">' + esc(wkLabel) + '</div>' +
      '<div class="pl-who">' + plViewToggle() + picker + '</div>' +
    '</div>';

    var backlog = PL.tasks.filter(function (t) { return !t.start && !t.vast; });
    backlog.sort(function (a, b) { return ((a.due || Infinity) - (b.due || Infinity)) || a.naam.localeCompare(b.naam, 'nl'); });
    var blHtml = backlog.length ? backlog.map(plCard).join('') : '<div class="pl-empty">Niets te plannen, alles staat in de week. 🎉</div>';

    var gutter = '<div class="pl-gutter"><div class="pl-colhead pl-gh"></div><div class="pl-allday pl-gh"></div>';
    for (var h = DAY_START; h < DAY_END; h++) gutter += '<div class="pl-hr" style="height:' + HOUR_PX + 'px"><span>' + h + ':00</span></div>';
    gutter += '</div>';

    var cols = '';
    days.forEach(function (day, di) {
      var isToday = ymdOf(day) === todayYmd();
      var dow = day.getDay(); var weekend = (dow === 0 || dow === 6);
      var blocks = PL.tasks.filter(function (t) { return t.start && t.vast_soort !== 'payroll' && sameDayMs(t.start, day); });
      var tEvs = weekEvents.filter(function (e) { return !e.allday && sameDayMs(e.start_ms, day); });
      var bHtml = blocks.map(plBlock).join('') + tEvs.map(function (e) { return plEvent(e, !!(PL.agenda[key] && PL.agenda[key].toonTitel)); }).join('');
      var ad = dayAllday(day);
      var adHtml = ad.map(function (a) { return a.link ? '<a class="pl-ad ' + a.cls + ' linked" href="' + esc(a.link) + '" target="_blank" rel="noopener" title="' + esc(a.txt) + '">' + esc(a.txt) + '</a>' : '<span class="pl-ad ' + a.cls + '" title="' + esc(a.txt) + '">' + esc(a.txt) + '</span>'; }).join('');
      var isWfh = weekEvents.some(function (e) { return e.allday && /thuiswerk/i.test(e.titel || '') && sameDayMs(e.start_ms, day); });
      var wfhBtn = '<button class="pl-wfh' + (isWfh ? ' on' : '') + '" data-ymd="' + ymdOf(day) + '" data-on="' + (isWfh ? '1' : '0') + '" aria-label="' + (isWfh ? 'Thuiswerkdag, klik om te annuleren' : 'Markeer als thuiswerkdag') + '" title="' + (isWfh ? 'Thuiswerkdag, klik om te annuleren' : 'Markeer als thuiswerkdag') + '">' + svgIc(IC.home, 15) + '</button>';
      cols += '<div class="pl-col' + (isToday ? ' today' : '') + (weekend ? ' weekend' : '') + '" data-ymd="' + ymdOf(day) + '" data-di="' + di + '">' +
        '<div class="pl-colhead' + (isToday ? ' today' : '') + '"><div class="pl-ch-l"><b>' + DOWS[dow] + '</b><span>' + day.getDate() + ' ' + MONTHS[day.getMonth()] + '</span></div>' + wfhBtn + '</div>' +
        '<div class="pl-allday">' + adHtml + '</div>' +
        '<div class="pl-colbody" style="height:' + ((DAY_END - DAY_START) * HOUR_PX) + 'px" data-ymd="' + ymdOf(day) + '">' + gridLines() + bHtml + '</div></div>';
    });

    page.innerHTML = '<div class="panel active pl-panel">' +
      toolbar +
      '<div class="pl-wrap">' +
        '<div class="pl-backlog" id="pl-backlog"><div class="pl-bl-head">Te plannen <span class="pl-bl-n">' + backlog.length + '</span></div><div class="pl-bl-list" id="pl-bl-list">' + blHtml + '</div></div>' +
        '<div class="pl-grid">' + gutter + '<div class="pl-cols">' + cols + '</div></div>' +
      '</div></div>';
    wirePlanner(page);
  }

  function msHm(ms) { var t = new Date(ms); return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); }
  function ensureMonthAgenda(page) {
    var mk = PL.monthStart.getFullYear() + '-' + PL.monthStart.getMonth();
    if (PL.monthAgendaKey === mk && PL.monthAgenda) return;
    PL.monthAgendaKey = mk;
    var first = mondayOf(new Date(PL.monthStart.getFullYear(), PL.monthStart.getMonth(), 1));
    var van = new Date(first.getFullYear(), first.getMonth(), first.getDate(), 0, 0, 0, 0).getTime();
    var last = addDays(first, 42); var tot = new Date(last.getFullYear(), last.getMonth(), last.getDate(), 0, 0, 0, 0).getTime();
    var body = { van_ms: van, tot_ms: tot }; if (PL.member) body.member = PL.member;
    api('teamPlannerAgenda', body).then(function (r) { if (PL.monthAgendaKey !== mk) return; PL.monthAgenda = (r && r.ok) ? (r.events || []) : []; if (state.route === 'planner' && PL.view === 'month') drawPlannerMonth(page); }).catch(function () { });
  }
  function drawPlannerMonth(page) {
    var ms = PL.monthStart;
    PL._mItems = {}; PL._mEvs = {};
    var first = mondayOf(new Date(ms.getFullYear(), ms.getMonth(), 1));
    var monLabel = MONTHS[ms.getMonth()] + ' ' + ms.getFullYear();
    var toolbar = '<div class="pl-toolbar">' +
      '<div class="pl-nav"><button class="pl-arrow" id="plm-prev" aria-label="Vorige maand">‹</button><button class="pl-today" id="plm-today">Deze maand</button><button class="pl-arrow" id="plm-next" aria-label="Volgende maand">›</button></div>' +
      '<div class="pl-week">' + esc(monLabel) + '</div>' +
      '<div class="pl-who">' + plViewToggle() + '</div></div>';
    var evs = PL.monthAgenda || [];
    var head = '<div class="plm-head">' + ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map(function (d) { return '<div>' + d + '</div>'; }).join('') + '</div>';
    var cells = '';
    for (var i = 0; i < 42; i++) {
      var day = addDays(first, i);
      var inMonth = day.getMonth() === ms.getMonth();
      var isToday = ymdOf(day) === todayYmd();
      var dayTasks = PL.tasks.filter(function (t) { return t.start && t.vast_soort !== 'payroll' && sameDayMs(t.start, day); });
      var dayEvs = evs.filter(function (e) { return sameDayMs(e.start_ms, day); });
      var items = dayTasks.map(function (t) { return { ms: t.start, label: t.naam, disc: t.discipline, kind: 'task', allday: false, task: t }; })
        .concat(dayEvs.map(function (e) { return { ms: e.start_ms, label: e.titel || 'Afspraak', kind: 'ev', allday: !!e.allday, ev: e }; }));
      items.sort(function (a, b) { return (a.allday ? 0 : a.ms) - (b.allday ? 0 : b.ms); });
      var max = 3;   // past netjes binnen de vaste celhoogte (122px) + '+N meer'-regel
      var itemsHtml = items.slice(0, max).map(function (it) {
        if (it.kind === 'task' && it.task) { PL._mItems[it.task.id] = it.task; return '<span class="plm-item plm-task ' + discBr(it.disc) + '" data-id="' + esc(it.task.id) + '" title="' + esc(msHm(it.ms) + ' ' + it.label) + '"><b>' + msHm(it.ms) + '</b> ' + esc(it.label) + '</span>'; }
        if (it.ev && it.ev.id) PL._mEvs[it.ev.id] = it.ev;
        return '<span class="plm-item ev"' + (it.ev && it.ev.id ? ' data-evid="' + esc(it.ev.id) + '"' : '') + ' title="' + esc((it.allday ? '' : msHm(it.ms) + ' ') + it.label) + '">' + (it.allday ? '' : '<b>' + msHm(it.ms) + '</b> ') + esc(it.label) + '</span>';
      }).join('');
      if (items.length > max) itemsHtml += '<span class="plm-more">+' + (items.length - max) + ' meer</span>';
      cells += '<button class="plm-cell' + (inMonth ? '' : ' out') + (isToday ? ' today' : '') + '" data-ymd="' + ymdOf(day) + '"><span class="plm-d' + (isToday ? ' today' : '') + '">' + day.getDate() + '</span>' + itemsHtml + '</button>';
    }
    page.innerHTML = '<div class="panel active pl-panel">' + toolbar + '<div class="plm-grid">' + head + '<div class="plm-cells">' + cells + '</div></div></div>';
    // Klik op een cel (dagnummer, lege ruimte of "+N meer") = dag-detail met alle activiteiten van die dag.
    Array.prototype.forEach.call(page.querySelectorAll('.plm-cell'), function (c) { c.onclick = function () { openDayDetail(c.getAttribute('data-ymd'), page); }; });
    // taak-items: hover toont volledige naam + briefing (ClickUp-stijl), klik opent de taak (geen weekspring).
    Array.prototype.forEach.call(page.querySelectorAll('.plm-task'), function (el) {
      var t = PL._mItems[el.getAttribute('data-id')];
      el.addEventListener('mouseenter', function (e) { if (t) showMonthCard(t, e.clientX, e.clientY); });
      el.addEventListener('mousemove', function (e) { if (t) showMonthCard(t, e.clientX, e.clientY); });
      el.addEventListener('mouseleave', hideMonthCard);
      el.addEventListener('click', function (e) { e.stopPropagation(); hideMonthCard(); if (t) openProject(t.id); });
    });
    // agenda-events in de maand: klik opent het agenda-detail (genodigden, Meet, verwijderen).
    Array.prototype.forEach.call(page.querySelectorAll('.plm-item.ev[data-evid]'), function (el) {
      el.addEventListener('click', function (e) { e.stopPropagation(); var ev = PL._mEvs[el.getAttribute('data-evid')]; if (ev) openEventDetail(ev, page); });
    });
    wirePlanner(page);
  }
  function monthCardEl() { if (window.__plmCard) return window.__plmCard; var c = document.createElement('div'); c.className = 'plm-card'; c.style.display = 'none'; document.body.appendChild(c); window.__plmCard = c; return c; }
  function showMonthCard(t, x, y) {
    var c = monthCardEl();
    if (c.__forId === t.id && c.style.display === 'block') { var w0 = c.offsetWidth, h0 = c.offsetHeight; c.style.left = Math.min(window.innerWidth - w0 - 10, Math.max(8, x + 14)) + 'px'; c.style.top = Math.max(8, y - h0 - 12) + 'px'; return; }
    c.__forId = t.id;
    var bc = [DISC_LABEL[t.discipline] || t.discipline || '', t.bedrijf].filter(Boolean).join('   ·   ');
    var st = (t.status && (t.status.label || (typeof t.status === 'string' ? t.status : ''))) || '';
    c.innerHTML = (bc ? '<div class="plm-card-bc">' + esc(bc) + '</div>' : '') +
      '<div class="plm-card-nm">' + esc(t.naam) + '</div>' +
      (t.briefing ? '<div class="plm-card-desc">' + esc(t.briefing) + '</div>' : '') +
      '<div class="plm-card-foot">' + (st ? '<span class="plm-card-st">' + esc(st) + '</span>' : '') + '<span class="plm-card-hint">Klik om te openen</span></div>';
    c.style.display = 'block';
    var w = c.offsetWidth, h = c.offsetHeight;
    c.style.left = Math.min(window.innerWidth - w - 10, Math.max(8, x + 14)) + 'px';
    c.style.top = Math.max(8, y - h - 12) + 'px';
  }
  function hideMonthCard() { if (window.__plmCard) window.__plmCard.style.display = 'none'; }

  function wirePlanner(page) {
    var sel = $('pl-member'); if (sel) sel.onchange = function () { PL.member = Number(this.value) || 0; renderPlanner(page); };
    Array.prototype.forEach.call(page.querySelectorAll('.pl-vt'), function (b) { b.onclick = function () { var v = b.getAttribute('data-v'); if ((v === 'month') === (PL.view === 'month')) return; PL.view = v; if (v === 'month' && !PL.monthStart) PL.monthStart = new Date(PL.weekStart.getFullYear(), PL.weekStart.getMonth(), 1); drawPlanner(page); if (v === 'month') ensureMonthAgenda(page); else ensureAgenda(page); }; });
    Array.prototype.forEach.call(page.querySelectorAll('.pl-wfh'), function (b) { b.onclick = async function (e) { e.stopPropagation(); var ymd = b.getAttribute('data-ymd'); var on = b.getAttribute('data-on') !== '1'; b.disabled = true; var r; try { r = await api('teamThuiswerk', { date: ymd, on: on }); } catch (e2) { r = null; } if (r && r.ok) { toast(on ? 'Thuiswerkdag ingepland ✓' : 'Thuiswerk geannuleerd'); var key = weekKeyOf(PL.weekStart); delete PL.agenda[key]; ensureAgenda(page); } else { b.disabled = false; toast(r && r.error === 'no_token' ? 'Agenda-koppeling ontbreekt' : (r && r.error === 'geen_agenda' ? 'Geen agenda gekoppeld' : 'Lukte even niet')); } }; });
    if ($('plm-prev')) $('plm-prev').onclick = function () { PL.monthStart = new Date(PL.monthStart.getFullYear(), PL.monthStart.getMonth() - 1, 1); drawPlannerMonth(page); ensureMonthAgenda(page); };
    if ($('plm-next')) $('plm-next').onclick = function () { PL.monthStart = new Date(PL.monthStart.getFullYear(), PL.monthStart.getMonth() + 1, 1); drawPlannerMonth(page); ensureMonthAgenda(page); };
    if ($('plm-today')) $('plm-today').onclick = function () { PL.monthStart = new Date((new Date()).getFullYear(), (new Date()).getMonth(), 1); drawPlannerMonth(page); ensureMonthAgenda(page); };
    if ($('pl-prev')) $('pl-prev').onclick = function () { PL.weekStart = addDays(PL.weekStart, -7); drawPlanner(page); ensureAgenda(page); };
    if ($('pl-next')) $('pl-next').onclick = function () { PL.weekStart = addDays(PL.weekStart, 7); drawPlanner(page); ensureAgenda(page); };
    if ($('pl-today')) $('pl-today').onclick = function () { PL.weekStart = mondayOf(new Date()); drawPlanner(page); ensureAgenda(page); };
    Array.prototype.forEach.call(page.querySelectorAll('.pl-card, .pl-block.pl-movable'), function (el) {
      el.addEventListener('pointerdown', function (e) { startDrag(e, el, page); });
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); var id = el.getAttribute('data-id'); if (id) showPlannerMenu(e.clientX, e.clientY, id, page); });
    });
    Array.prototype.forEach.call(page.querySelectorAll('.pl-block.pl-vast'), function (el) {
      el.addEventListener('click', function () { var id = el.getAttribute('data-id'); if (id) openProject(id); });
    });
    Array.prototype.forEach.call(page.querySelectorAll('.pl-event.linked'), function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-evid'); if (!id) return;
        var key = weekKeyOf(PL.weekStart); var evs = (PL.agenda[key] && PL.agenda[key].events) || [];
        var ev = null; for (var i = 0; i < evs.length; i++) { if (evs[i].id === id) { ev = evs[i]; break; } }
        if (ev) openEventDetail(ev, page);
      });
    });
  }

  // Detail en bewerken van een Google-agenda-event (enkel je EIGEN agenda). Opent in de bestaande modal;
  // opslaan schrijft via teamPlannerEventUpdate. Genodigden + Google Meet + verwijderen via teamCalEvent*.
  function evtTimeVal(ms) { var d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function evAttStatusLabel(s) { return s === 'accepted' ? 'geaccepteerd' : s === 'declined' ? 'geweigerd' : s === 'tentative' ? 'misschien' : 'nog niet beantwoord'; }
  function refreshPlannerAgenda(page) {
    if (PL.view === 'month') { PL.monthAgendaKey = ''; PL.monthAgenda = null; ensureMonthAgenda(page); }
    else { var key = weekKeyOf(PL.weekStart); delete PL.agenda[key]; ensureAgenda(page); }
  }
  function openEventDetail(ev, page) {
    var m = $('modal');
    m.innerHTML = '<div class="modal-head"><div class="mh-ic" style="background:var(--s27-blue-soft);color:var(--s27-blue-ink)">' + svgIc(IC.cal, 18) + '</div><div style="flex:1;min-width:0"><div class="mh-tt">Agenda-afspraak</div><div class="mh-sub">Bewerk, nodig genodigden uit of verwijder in je Google-agenda</div></div><button class="modal-close" id="evClose" aria-label="Sluiten"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body"><div class="ev-form">' +
        '<label class="ev-lab">Titel</label><input id="evTitel" class="ev-in" type="text" value="' + esc(ev.titel || '') + '">' +
        '<div class="ev-row"><div><label class="ev-lab">Start</label><input id="evStart" class="ev-in" type="datetime-local" value="' + evtTimeVal(ev.start_ms) + '"></div>' +
        '<div><label class="ev-lab">Einde</label><input id="evEind" class="ev-in" type="datetime-local" value="' + evtTimeVal(ev.eind_ms) + '"></div></div>' +
        '<label class="ev-lab">Locatie</label><input id="evLoc" class="ev-in" type="text" value="' + esc(ev.locatie || '') + '" placeholder="(geen locatie)">' +
        '<label class="ev-lab">Beschrijving</label><textarea id="evDesc" class="ev-in ev-ta" rows="4" placeholder="(geen beschrijving)">' + esc(ev.beschrijving || '') + '</textarea>' +
        (ev.link ? '<a class="ev-glink" href="' + esc(ev.link) + '" target="_blank" rel="noopener">Openen in Google Agenda ↗</a>' : '') +
        '<div class="ev-actions"><button class="btn btn-outline" id="evCancel">Annuleer</button><button class="btn btn-primary" id="evSave">Opslaan</button></div>' +
        '<p class="ev-msg" id="evMsg"></p>' +
        '<div id="evExtra" class="ev-extra"><div class="kd-ai-loading">Genodigden laden…</div></div>' +
      '</div></div>';
    $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    $('evClose').onclick = closeModal; $('evCancel').onclick = closeModal;
    $('evSave').onclick = async function () {
      var titel = $('evTitel').value.trim();
      var sMs = new Date($('evStart').value).getTime(); var eMs = new Date($('evEind').value).getTime();
      if (!titel) { $('evMsg').textContent = 'Geef een titel.'; return; }
      if (!(sMs > 0) || !(eMs > sMs)) { $('evMsg').textContent = 'Het einde moet na de start liggen.'; return; }
      this.disabled = true; this.textContent = 'Opslaan…'; $('evMsg').textContent = '';
      var r; try {
        r = await api('teamPlannerEventUpdate', { event_id: ev.id, titel: titel, beschrijving: $('evDesc').value, locatie: $('evLoc').value, start_ms: sMs, eind_ms: eMs });
      } catch (e) { r = null; }
      if (!r || !r.ok) { this.disabled = false; this.textContent = 'Opslaan'; $('evMsg').textContent = 'Opslaan mislukt, probeer opnieuw.'; return; }
      toast('Afspraak bijgewerkt ✓'); closeModal(); refreshPlannerAgenda(page);
    };
    fillEventExtra(ev.id, page);
  }
  // Laadt vers de genodigden + Google Meet + verwijder-knop in #evExtra (na openen en na elke wijziging).
  function fillEventExtra(eventId, page) {
    var box = document.getElementById('evExtra'); if (!box) return;
    api('teamCalEvent', { event_id: eventId }, { timeout: 25000 }).then(function (r) {
      box = document.getElementById('evExtra'); if (!box) return;
      if (!r || !r.ok || !r.event) { box.innerHTML = '<p class="ev-msg">' + esc((r && r.message) || 'Kon de genodigden niet laden.') + '</p>'; return; }
      var ev = r.event;
      var atts = (ev.attendees || []).filter(function (a) { return a.email; });
      var attHtml = atts.length ? atts.map(function (a) {
        return '<span class="ev-att' + (a.self ? ' me' : '') + '" title="' + esc((a.naam || a.email) + ' · ' + evAttStatusLabel(a.status)) + '"><span class="ev-att-dot ' + esc(a.status || 'needsAction') + '"></span><span class="ev-att-nm">' + esc(a.naam || a.email) + '</span>' + (a.self || a.organizer ? '' : '<button class="ev-att-x" data-rm="' + esc(a.email) + '" title="Verwijderen" aria-label="Verwijderen">×</button>') + '</span>';
      }).join('') : '<span class="ev-att-none">Nog niemand uitgenodigd.</span>';
      var meetHtml = ev.meet
        ? '<div class="ev-meet has"><a href="' + esc(ev.meet) + '" target="_blank" rel="noopener">' + svgIc(IC.cam, 14) + ' Google Meet openen</a><button class="btn btn-outline btn-sm" id="evMeetDel">Verwijderen</button></div>'
        : '<div class="ev-meet"><button class="btn btn-outline btn-sm" id="evMeetAdd">' + svgIc(IC.cam, 14) + ' Google Meet toevoegen</button></div>';
      box.innerHTML =
        '<div class="ev-sec"><label class="ev-lab">Genodigden</label><div class="ev-atts">' + attHtml + '</div>' +
          '<div class="ev-invite"><input id="evInviteMail" class="ev-in" type="email" placeholder="naam@bedrijf.be" autocomplete="off"><button class="btn btn-outline btn-sm" id="evInviteBtn">Uitnodigen</button></div></div>' +
        '<div class="ev-sec"><label class="ev-lab">Google Meet</label>' + meetHtml + '</div>' +
        '<div class="ev-sec ev-danger"><button class="btn btn-danger btn-sm" id="evDelete">' + svgIc(IC.trash, 14) + ' Afspraak verwijderen</button></div>';
      Array.prototype.forEach.call(box.querySelectorAll('.ev-att-x'), function (b) { b.onclick = function () { var em = b.getAttribute('data-rm'); if (!confirm(em + ' verwijderen uit de afspraak? Die persoon krijgt een annulering.')) return; evAct(page, eventId, 'teamCalEventInvite', { remove: [em] }, 'Genodigde verwijderd'); }; });
      var ib = document.getElementById('evInviteBtn'); if (ib) ib.onclick = function () { var mail = ((document.getElementById('evInviteMail') || {}).value || '').trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { toast('Geef een geldig e-mailadres'); return; } if (!confirm(mail + ' uitnodigen? Die persoon krijgt een uitnodiging in de mail.')) return; evAct(page, eventId, 'teamCalEventInvite', { add: [mail] }, 'Uitnodiging verstuurd'); };
      var ma = document.getElementById('evMeetAdd'); if (ma) ma.onclick = function () { evAct(page, eventId, 'teamCalEventMeet', { enable: true }, 'Google Meet toegevoegd'); };
      var md = document.getElementById('evMeetDel'); if (md) md.onclick = function () { if (!confirm('Google Meet-link verwijderen?')) return; evAct(page, eventId, 'teamCalEventMeet', { enable: false }, 'Google Meet verwijderd'); };
      var del = document.getElementById('evDelete'); if (del) del.onclick = function () { if (!confirm('Deze afspraak definitief verwijderen? Genodigden krijgen een annulering.')) return; del.disabled = true; api('teamCalEventDelete', { event_id: eventId }, { timeout: 25000 }).then(function (r2) { if (r2 && r2.ok) { toast('Afspraak verwijderd ✓'); closeModal(); refreshPlannerAgenda(page); } else { del.disabled = false; toast((r2 && r2.message) || 'Verwijderen mislukt'); } }).catch(function () { del.disabled = false; toast('Verwijderen mislukt'); }); };
    }).catch(function () { var b2 = document.getElementById('evExtra'); if (b2) b2.innerHTML = '<p class="ev-msg">Kon de genodigden niet laden.</p>'; });
  }
  function evAct(page, eventId, ep, payload, okMsg) {
    payload.event_id = eventId;
    var box = document.getElementById('evExtra'); if (box) box.innerHTML = '<div class="kd-ai-loading">Bezig…</div>';
    api(ep, payload, { timeout: 30000 }).then(function (r) {
      if (r && r.ok) { toast(okMsg + ' ✓'); fillEventExtra(eventId, page); refreshPlannerAgenda(page); }
      else { toast((r && r.message) || 'Lukte niet'); fillEventExtra(eventId, page); }
    }).catch(function () { toast('Lukte niet'); fillEventExtra(eventId, page); });
  }
  // Dag-detail: alle activiteiten (taken + agenda) van één dag, elk aanklikbaar.
  function openDayDetail(ymd, page) {
    var p = String(ymd).split('-'); var day = new Date(+p[0], +p[1] - 1, +p[2]);
    var tasks = PL.tasks.filter(function (t) { return t.start && t.vast_soort !== 'payroll' && sameDayMs(t.start, day); });
    var evs = (PL.monthAgenda || []).filter(function (e) { return sameDayMs(e.start_ms, day); });
    var items = tasks.map(function (t) { return { ms: t.start, allday: false, kind: 'task', label: t.naam, sub: [DISC_LABEL[t.discipline] || t.discipline || '', t.bedrijf].filter(Boolean).join(' · '), id: t.id }; })
      .concat(evs.map(function (e) { return { ms: e.start_ms, allday: !!e.allday, kind: 'ev', label: e.titel || 'Afspraak', sub: e.locatie || '', ev: e }; }));
    items.sort(function (a, b) { return (a.allday ? 0 : a.ms) - (b.allday ? 0 : b.ms); });
    var dlabel = DOWS[day.getDay()] + ' ' + day.getDate() + ' ' + MONTHS[day.getMonth()];
    var rows = items.length ? items.map(function (it, i) {
      var time = it.allday ? 'Hele dag' : msHm(it.ms);
      return '<button class="dd-row" data-i="' + i + '"><span class="dd-time">' + esc(time) + '</span><span class="dd-ic ' + (it.kind === 'ev' ? 'ev' : 'task') + '">' + svgIc(it.kind === 'ev' ? IC.cal : IC.board, 15) + '</span><span class="dd-main"><span class="dd-nm">' + esc(it.label) + '</span>' + (it.sub ? '<span class="dd-sub">' + esc(it.sub) + '</span>' : '') + '</span>' + svgIc(IC.chevR, 16) + '</button>';
    }).join('') : '<div class="empty" style="padding:16px"><p>Geen activiteiten op deze dag.</p></div>';
    var m = $('modal');
    m.innerHTML = '<div class="modal-head"><div class="mh-ic" style="background:var(--s27-purple-soft);color:var(--s27-purple)">' + svgIc(IC.cal, 18) + '</div><div style="flex:1;min-width:0"><div class="mh-tt">' + esc(dlabel) + '</div><div class="mh-sub">' + items.length + ' activiteit' + (items.length !== 1 ? 'en' : '') + '</div></div><button class="modal-close" id="ddClose" aria-label="Sluiten"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body"><div class="dd-list">' + rows + '</div></div>';
    $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    $('ddClose').onclick = closeModal;
    Array.prototype.forEach.call(m.querySelectorAll('.dd-row'), function (b) { b.onclick = function () { var it = items[+b.getAttribute('data-i')]; if (!it) return; if (it.kind === 'task') { closeModal(); openProject(it.id); } else openEventDetail(it.ev, page); }; });
  }

  function highlightDrop(x, y) {
    clearHighlights();
    var el = document.elementFromPoint(x, y); if (!el || !el.closest) return;
    var cb = el.closest('.pl-colbody'); if (cb) { cb.parentNode.classList.add('pl-drop'); return; }
    var bl = el.closest('#pl-backlog'); if (bl) bl.classList.add('pl-drop');
  }
  function clearHighlights() { Array.prototype.forEach.call(document.querySelectorAll('.pl-drop'), function (e) { e.classList.remove('pl-drop'); }); }

  function startDrag(e, el, page) {
    if (e.button != null && e.button !== 0) return;
    var id = el.getAttribute('data-id'); var est = Number(el.getAttribute('data-est')) || 0; var due = Number(el.getAttribute('data-due')) || 0;
    var sx = e.clientX, sy = e.clientY, moved = false, ghost = null;
    var rect = el.getBoundingClientRect(); var offY = e.clientY - rect.top;
    // resize-modus: greep aan de onderrand van een ingepland blok (geen backlog-kaart)
    var isResize = el.classList.contains('pl-block') && (rect.height - offY) <= 10;
    var startH = rect.height;
    var estH = (est / 3600000) || 1;
    var nmEl0 = el.querySelector('.pl-card-nm, .pl-bl-nm'); var dragNm = nmEl0 ? nmEl0.textContent : 'Taak';
    var brm = (el.className.match(/br-[a-z]+/) || ['br-blue'])[0];
    var preview = null;
    function removePreview() { if (preview && preview.parentNode) preview.parentNode.removeChild(preview); }
    function fmtHM(hf) { var H = Math.floor(hf + 1e-6), M = Math.round((hf - H) * 60); if (M === 60) { H++; M = 0; } return String(H).padStart(2, '0') + ':' + String(M).padStart(2, '0'); }
    // Live voorbeeldblok in de doelkolom op de gesnapte tijdslot, hoogte = time-estimate
    function showPreview(colbody, y) {
      if (!preview) { preview = document.createElement('div'); preview.innerHTML = '<div class="pl-prev-nm"></div><div class="pl-prev-tm"></div>'; }
      preview.className = 'pl-preview ' + brm;
      var min = plSnapMin(y); var startHf = DAY_START + min / 60;
      preview.style.top = (min / 60 * HOUR_PX) + 'px';
      preview.style.height = Math.max(estH * HOUR_PX, 26) + 'px';
      preview.querySelector('.pl-prev-nm').textContent = dragNm;
      preview.querySelector('.pl-prev-tm').textContent = fmtHM(startHf) + '-' + fmtHM(startHf + estH);
      if (preview.parentNode !== colbody) colbody.appendChild(preview);
    }
    function move(ev) {
      var dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      if (!moved) {
        moved = true; el.classList.add('pl-dragging');
        if (isResize) { el.classList.add('pl-resizing'); }
        else {
          ghost = document.createElement('div'); ghost.className = 'pl-ghost ' + brm;
          ghost.textContent = dragNm; document.body.appendChild(ghost); document.body.classList.add('pl-grabbing');
        }
      }
      if (isResize) {
        var nh = Math.max(26, startH + (ev.clientY - sy));
        el.style.height = nh + 'px';
        var lbl = el.querySelector('.pl-bl-meta'); var uren = Math.round(nh / HOUR_PX * 4) / 4;
        if (lbl) lbl.setAttribute('data-resize', uren + 'u');
        el.classList.add('pl-show-resize');
        el.style.setProperty('--rz', '"' + uren + 'u"');
      } else {
        var tEl = document.elementFromPoint(ev.clientX, ev.clientY);
        var colbody = (tEl && tEl.closest) ? tEl.closest('.pl-colbody') : null;
        if (colbody) {
          if (ghost) ghost.style.display = 'none';
          var crect = colbody.getBoundingClientRect();
          showPreview(colbody, ev.clientY - crect.top - offY);
          clearHighlights(); colbody.parentNode.classList.add('pl-drop');
        } else {
          removePreview();
          if (ghost) { ghost.style.display = ''; ghost.style.left = (ev.clientX + 10) + 'px'; ghost.style.top = (ev.clientY + 10) + 'px'; }
          highlightDrop(ev.clientX, ev.clientY);
        }
      }
    }
    function cleanupDrag() {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel);
      document.body.classList.remove('pl-grabbing'); if (ghost) ghost.remove(); removePreview(); clearHighlights();
      el.classList.remove('pl-dragging'); el.classList.remove('pl-resizing'); el.classList.remove('pl-show-resize');
    }
    // pointercancel (bv. systeemgebaar, telefoon-call) → enkel opruimen, geen drop uitvoeren
    function cancel() { cleanupDrag(); }
    function up(ev) {
      cleanupDrag();
      if (!moved) { openProject(id); return; }
      if (isResize) {
        var nh = parseFloat(el.style.height) || startH;
        var newEstMs = Math.max(1, Math.round(nh / HOUR_PX * 4) / 4 * 3600000);   // snap 15 min
        var freed = est - newEstMs;
        if (freed >= 1800000) {   // ≥30 min ingekort → bied aan om het restant naar 'Te plannen' te zetten
          var fh = Math.round(freed / 3600000 * 4) / 4;
          if (confirm(fh + ' u kwam vrij door in te korten.\n\nDit restant als losse taak in “Te plannen” zetten? (zo plan je het later opnieuw in)\n\nAnnuleer = de taak gewoon korter maken.')) { splitRemainder(id, freed, page); return; }
        }
        resizeBlock(id, newEstMs, page);
        return;
      }
      var tEl = document.elementFromPoint(ev.clientX, ev.clientY);
      var colbody = (tEl && tEl.closest) ? tEl.closest('.pl-colbody') : null;
      var backlog = (tEl && tEl.closest) ? tEl.closest('#pl-backlog') : null;
      if (colbody) {
        var crect = colbody.getBoundingClientRect();
        scheduleDrop(id, est, due, colbody.getAttribute('data-ymd'), ev.clientY - crect.top - offY, page);
      } else if (backlog) {
        unscheduleDrop(id, page);
      }
    }
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', cancel);
  }

  // resize: pas alleen de duur (est) aan; start blijft, due = start + nieuwe duur.
  function resizeBlock(id, newEstMs, page) {
    var t = PL.tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    var due_ms = t.start + newEstMs;
    t.est = newEstMs; t.due = due_ms; t.due_ymd = ymdFromMs(due_ms);
    drawPlanner(page);
    api('teamTaskSchedule', { task_id: id, start_ms: t.start, due_ms: due_ms, est_ms: newEstMs }).then(function (r) {
      if (!r || !r.ok) { toast('Duur aanpassen mislukt'); renderPlanner(page); return; }
      if (r.est) t.est = r.est; if (r.due) { t.due = r.due; t.due_ymd = r.due_ymd; }
      toast('Duur aangepast ✓');
    }).catch(function () { toast('Duur aanpassen mislukt'); renderPlanner(page); });
  }

  // resize-restant: de taak wordt korter ingepland (keepEst) en het vrijgekomen
  // stuk (freedMs) komt als losse taak in 'Te plannen'. Backend = teamTaskSplit mode=restant.
  function splitRemainder(id, freedMs, page) {
    toast('Restant afsplitsen…');
    api('teamTaskSplit', { task_id: id, mode: 'restant', remainder_est: freedMs }, { timeout: 40000 }).then(function (r) {
      if (!r || !r.ok) { toast('Afsplitsen mislukt'); renderPlanner(page); return; }
      toast('Restant staat in “Te plannen” ✓'); renderPlanner(page);
    }).catch(function () { toast('Afsplitsen mislukt'); renderPlanner(page); });
  }

  // Rechtsklik-menu op een planner-blok of backlog-kaart: dupliceren / splitsen / openen.
  function closePlannerMenu() { var e = $('plCtx'); if (e) e.remove(); }
  function showPlannerMenu(x, y, id, page) {
    closePlannerMenu();
    var m = document.createElement('div'); m.className = 'pl-ctx'; m.id = 'plCtx';
    m.innerHTML = '<button data-act="dup">Dupliceren</button>' +
      '<button data-act="split">Splits in twee</button>' +
      '<button data-act="open">Openen</button>';
    document.body.appendChild(m);
    var mw = m.offsetWidth || 180, mh = m.offsetHeight || 120;
    m.style.left = Math.max(6, Math.min(x, window.innerWidth - mw - 6)) + 'px';
    m.style.top = Math.max(6, Math.min(y, window.innerHeight - mh - 6)) + 'px';
    m.querySelector('[data-act="dup"]').onclick = function () { closePlannerMenu(); dupTask(id, page); };
    m.querySelector('[data-act="split"]').onclick = function () { closePlannerMenu(); splitFromPlanner(id, page); };
    m.querySelector('[data-act="open"]').onclick = function () { closePlannerMenu(); openProject(id); };
    setTimeout(function () { document.addEventListener('pointerdown', closePlannerMenu, { once: true }); }, 0);
  }
  function dupTask(id, page) {
    toast('Dupliceren…');
    api('teamTaskSplit', { task_id: id, mode: 'duplicate' }, { timeout: 40000 }).then(function (r) {
      if (!r || !r.ok) { toast('Dupliceren mislukt'); return; }
      toast('Kopie staat in “Te plannen” ✓'); renderPlanner(page);
    }).catch(function () { toast('Dupliceren mislukt'); });
  }
  function splitFromPlanner(id, page) {
    toast('Splitsen…');
    api('teamTaskSplit', { task_id: id, mode: 'split' }, { timeout: 40000 }).then(function (r) {
      if (!r || !r.ok) { toast('Splitsen mislukt'); return; }
      toast('Deel 2 staat volgende werkdag ingepland ✓'); renderPlanner(page);
    }).catch(function () { toast('Splitsen mislukt'); });
  }

  // obstakels voor het zoeken van een vrije plek: alle ingeplande taken (behalve de
  // gesleepte + de te-verschuiven slachtoffers) + alle getimede agenda-events.
  function plObstaclesFixed(excludeId, victims) {
    var vids = {}; (victims || []).forEach(function (v) { vids[v.id] = 1; });
    var obs = [];
    PL.tasks.forEach(function (t) { if (!t.start || t.id === excludeId || vids[t.id]) return; var dur = t.est || (t.due > t.start ? t.due - t.start : 3600000); obs.push([t.start, t.start + dur]); });
    Object.keys(PL.agenda || {}).forEach(function (k) { ((PL.agenda[k] && PL.agenda[k].events) || []).forEach(function (e) { if (!e.allday) obs.push([e.start_ms, e.eind_ms]); }); });
    return obs;
  }
  // eerstvolgende vrije plek (ma-zo, 08-19u, 15-min-raster) die durMs past zonder obstakel.
  function findFreeSlot(durMs, obstacles, fromMs) {
    var STEP = 900000; var fromD = new Date(fromMs || Date.now());
    for (var off = 0; off < 60; off++) {
      var d = new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate() + off);
      var dayBegin = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DAY_START, 0, 0, 0).getTime();
      var dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DAY_END, 0, 0, 0).getTime();
      var s0 = (off === 0) ? Math.max(dayBegin, Math.ceil((fromMs || Date.now()) / STEP) * STEP) : dayBegin;
      for (var s = s0; s + durMs <= dayEnd; s += STEP) {
        var e = s + durMs;
        var free = !obstacles.some(function (o) { return e > o[0] && s < o[1]; });
        if (free) return { start: s, due: e };
      }
    }
    return null;
  }

  // Y (px in kolom) → minuten vanaf DAY_START, gesnapt op SNAP_MIN. Gedeeld door drop + live-preview.
  function plSnapMin(y) { var totalPx = (DAY_END - DAY_START) * HOUR_PX; var cy = Math.max(0, Math.min(y, totalPx - 8)); return Math.round(((cy / HOUR_PX) * 60) / SNAP_MIN) * SNAP_MIN; }
  function scheduleDrop(id, est, due, ymd, y, page) {
    var min = plSnapMin(y);
    var startH = DAY_START + Math.floor(min / 60), startM = min % 60;
    var p = ymd.split('-'); var sd = new Date(+p[0], +p[1] - 1, +p[2], startH, startM, 0, 0);
    var start_ms = sd.getTime();
    var estMs = est || 3600000;
    var due_ms = (due && due > start_ms) ? due : (start_ms + estMs);
    var t = PL.tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    var dropEnd = start_ms + estMs;
    // verplaatsbare taken die botsen → automatisch opschuiven (vaste blokken + agenda blijven staan)
    var victims = PL.tasks.filter(function (x) { return x.id !== id && x.start && !x.vast && rangesOverlap(start_ms, dropEnd, x.start, x.start + (x.est || 3600000)); });
    t.start = start_ms; t.due = due_ms; t.start_ymd = ymd; t.due_ymd = ymdFromMs(due_ms); t.ingepland = true;
    var batch = [{ task_id: id, start_ms: start_ms, due_ms: due_ms }];
    var bumped = 0, failed = 0, placed = [[start_ms, dropEnd]];
    var fixedObs = plObstaclesFixed(id, victims);
    victims.forEach(function (v) {
      var dur = v.est || 3600000;
      var slot = findFreeSlot(dur, fixedObs.concat(placed), dropEnd);
      if (slot) { v.start = slot.start; v.due = slot.due; v.start_ymd = ymdFromMs(slot.start); v.due_ymd = ymdFromMs(slot.due); placed.push([slot.start, slot.due]); batch.push({ task_id: v.id, start_ms: slot.start, due_ms: slot.due }); bumped++; }
      else { failed++; }
    });
    drawPlanner(page);
    api('teamTaskSchedule', { batch: batch }).then(function (r) {
      if (!r || !r.ok) { toast('Inplannen mislukt, opnieuw geladen'); renderPlanner(page); return; }
      (r.results || []).forEach(function (res) { if (!res.ok) return; var tt = PL.tasks.find(function (x) { return x.id === res.task_id; }); if (tt) { tt.start = res.start; tt.due = res.due; tt.start_ymd = res.start_ymd; tt.due_ymd = res.due_ymd; if (res.est) tt.est = res.est; } });
      drawPlanner(page);
      toast(bumped ? ('Ingepland ✓ - ' + bumped + (bumped > 1 ? ' taken' : ' taak') + ' automatisch opgeschoven') : 'Ingepland ✓');
      if (failed) setTimeout(function () { toast(failed + (failed > 1 ? ' taken pasten' : ' taak paste') + ' nergens, staan nog op de oude plek'); }, 900);
    }).catch(function () { toast('Inplannen mislukt'); renderPlanner(page); });
  }

  function unscheduleDrop(id, page) {
    var t = PL.tasks.find(function (x) { return x.id === id; });
    if (t && !t.start) return;
    if (t) { t.start = 0; t.start_ymd = ''; t.ingepland = t.due > 0; }
    drawPlanner(page);
    api('teamTaskSchedule', { task_id: id, clear: true }).then(function (r) {
      if (!r || !r.ok) { toast('Ontplannen mislukt'); renderPlanner(page); } else toast('Terug naar te plannen');
    }).catch(function () { renderPlanner(page); });
  }

  /* ---- CAPACITEIT (kan-beginnen-backlog per teamlid + per tak) ---- */
  async function renderCapaciteit(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Capaciteit</h1><div class="sub">Backlog berekenen…</div></div><div class="empty"><p>Alle teamleden doorrekenen… (even geduld)</p></div></div>';
    var d; try { d = await api('teamCapaciteit', {}, { timeout: 40000 }); } catch (e) { loadFail(page, 'Capaciteit', function () { renderCapaciteit(page); }); return; }
    if (state.route !== 'capaciteit' && state.route !== 'cijfers') return;   // navigatie-guard: gebruiker is al weg
    if (!d || !d.ok) { if (d && d.error === 'forbidden_role') { page.querySelector('.empty p').textContent = 'Geen toegang voor jouw rol.'; return; } loadFail(page, 'Capaciteit', function () { renderCapaciteit(page); }); return; }
    if (d.computing) {
      // eerste keer: wordt op de achtergrond berekend → toon spinner + ververs automatisch
      page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Capaciteit</h1><div class="sub">De backlog wordt voor de eerste keer berekend…</div></div><div class="empty"><div class="boot" style="position:static;background:none;margin:0 auto 10px"><div class="spin"></div></div><p>Dit duurt ±1 minuut. Dit scherm ververst vanzelf.</p></div></div>';
      if (state.route === 'capaciteit' || state.route === 'cijfers') setTimeout(function () { if (state.route === 'capaciteit' || state.route === 'cijfers') renderCapaciteit(page); }, 12000);
      return;
    }
    state.cap = d;
    var stat = function (n, l, br) { return '<div class="tstat ' + br + '"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; };
    var WEEK_CAP = 38;   // referentie werkuren per week
    var weekCol = function (label, uren, verlofDagen, isNow) {
      var vu = (verlofDagen || 0) * 7.6;
      var beschikbaar = Math.max(0, WEEK_CAP - vu);
      var pct = Math.min(100, Math.round(uren / WEEK_CAP * 100));
      var vpct = Math.min(100, Math.round(vu / WEEK_CAP * 100));
      var vol = uren >= beschikbaar - 2 && uren > 0;
      var leegW = uren < 6 && verlofDagen < 4;
      return '<div class="cw' + (isNow ? ' now' : '') + '">' +
        '<div class="cw-bar">' +
          (vpct ? '<div class="cw-verlof" style="height:' + vpct + '%" title="verlof"></div>' : '') +
          '<div class="cw-fill ' + (vol ? 'vol' : leegW ? 'leeg' : 'ok') + '" style="height:' + Math.max(3, pct) + '%"></div>' +
        '</div>' +
        '<div class="cw-n">' + uren + 'u</div>' +
        (verlofDagen ? '<div class="cw-vl">' + verlofDagen + 'd verlof</div>' : '<div class="cw-vl">&nbsp;</div>') +
        '<div class="cw-l">' + label + '</div>' +
        '</div>';
    };
    var lidRows = d.per_lid.map(function (l, i) {
      var leeg = l.uren < 4;
      var wk = l.weken || { vorige: 0, deze: 0, volgende: 0 };
      var vl = l.verlof || { deze: 0, volgende: 0 };
      var taks = (l.per_tak || []).slice(0, 5).map(function (x) { return '<span class="cap-chip">' + esc(DISC_LABEL[x.tak] || x.tak) + ' <b>' + x.uren + 'u</b></span>'; }).join('');
      var taken = l.taken || [];
      var takenH = taken.length ? taken.map(function (t) {
        return '<div class="cap-tk"><span class="cap-tk-wk ' + (t.week === 'deze' ? 'nu' : '') + '">' + (t.week === 'deze' ? 'Deze' : 'Volg.') + '</span>' +
          '<span class="cap-tk-n">' + esc(t.naam) + (t.disc ? ' <i>' + esc(DISC_LABEL[t.disc] || t.disc) + '</i>' : '') + '</span>' +
          (t.uren ? '<span class="cap-tk-u">' + t.uren + 'u</span>' : '') + '</div>';
      }).join('') : '<div class="cap-empty-sm">Niets ingepland deze of volgende week.</div>';
      var verlofNu = vl.deze ? '<span class="cap-hd-vl">🌴 ' + vl.deze + 'd verlof</span>' : '';
      return '<div class="cap-lid' + (leeg ? ' leeg' : '') + '" data-i="' + i + '">' +
        '<button class="cap-hd" type="button">' +
          '<span class="cap-hd-naam">' + esc(l.naam) + (l.pool ? ' ' + svgIc(IC.cam, 12) : '') + (leeg ? '<span class="cap-flag">ruimte</span>' : '') + '</span>' +
          '<span class="cap-hd-mid"><span class="cap-hd-wk">deze week <b>' + wk.deze + 'u</b> gepland</span>' + verlofNu + '</span>' +
          '<span class="cap-hd-bz"><b>' + l.uren + 'u</b> klaar · ' + l.aantal + ' tk</span>' +
          '<svg class="cap-chev" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="cap-detail">' +
          '<div class="cap-weken">' + weekCol('Vorige week', wk.vorige, 0, false) + weekCol('Deze week', wk.deze, vl.deze, true) + weekCol('Volgende week', wk.volgende, vl.volgende, false) + '</div>' +
          (taks ? '<div class="cap-chips"><span class="cap-lbl">Startklaar</span>' + taks + '</div>' : '') +
          '<div class="cap-tklist"><div class="cap-lbl">Waar werkt aan · deze + volgende week</div>' + takenH + '</div>' +
        '</div>' +
        '</div>';
    }).join('');
    var takRows = d.per_tak.map(function (x) {
      return '<div class="cap-row"><div class="cap-naam">' + esc(DISC_LABEL[x.tak] || x.tak) + '</div>' +
        '<div class="cap-bars"><div class="cap-bar alt" style="width:' + Math.max(3, Math.round(x.uren / (d.per_tak[0] ? d.per_tak[0].uren || 1 : 1) * 100)) + '%"></div></div>' +
        '<div class="cap-num">' + x.aantal + ' taken · <b>' + x.uren + 'u</b></div></div>';
    }).join('');
    page.innerHTML = '<div class="panel active">' +
      '<div class="t-hero gz-hero"><div><h1>Capaciteit</h1><div class="sub">Hoeveel werk staat klaar om in te plannen (status ‘startklaar’), per teamlid en per tak. Zo zie je wie ruimte heeft en wanneer een nieuw project erbij kan.</div></div><button class="fin-pdf" id="cap-pdf" title="Exporteer als PDF"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> PDF</button></div>' +
      '<div class="tstats">' + stat(d.totaal.aantal, 'Taken te plannen', 'br-purple') + stat(d.totaal.uren + 'u', 'Geschatte uren', 'br-blue') + stat('±' + d.prognose.weken_backlog + ' wk', 'Backlog voor het team', 'br-green') + stat(d.zonder_est, 'Zonder inschatting', d.zonder_est ? 'br-orange' : 'br-green') + '</div>' +
      sec('Per teamlid, wie heeft ruimte?', d.per_lid.length) + '<div class="cap-hint">Klik een teamlid open om de planning per week + verlof + waar ze aan werken te zien.</div><div class="cap-lidlist">' + lidRows + '</div>' +
      sec('Per tak', d.per_tak.length) + '<div class="cap-table">' + takRows + '</div>' +
      (d.partial ? '<div class="cap-disc" style="border-left:3px solid var(--s27-orange)"><span>⏳</span><span>Nog deels berekend (veel taken), open de pagina over een halve minuut opnieuw voor het volledige beeld.</span></div>' : '') +
      '<div class="cap-disc"><span>ⓘ</span><span>' + esc(d.disclaimer) + '</span></div>' +
      '</div>';
    Array.prototype.forEach.call(page.querySelectorAll('.cap-lid'), function (row) {
      var hd = row.querySelector('.cap-hd');
      if (hd) hd.onclick = function () { row.classList.toggle('open'); };
    });
    if ($('cap-pdf')) $('cap-pdf').onclick = function () { pdfCapaciteit(); };
  }
  // PDF-export van de capaciteitssnapshot (gebrand print-venster, geen externe library).
  function pdfCapaciteit() {
    var d = state.cap; if (!d) { toast('Nog geen data'); return; }
    var now = new Date(); var dd = now.getDate() + ' ' + MONTHS[now.getMonth()] + ' ' + now.getFullYear();
    var base = 'https://s27-teamportaal.studio27marketing.workers.dev';
    var WK = 38;
    var wkCell = function (u, vl) { u = u || 0; vl = vl || 0; var beschik = Math.max(0, WK - vl * 7.6); var cls = (u >= beschik - 2 && u > 0) ? 'vol' : (u < 6 && vl < 4) ? 'leeg' : 'ok'; return '<td class="wk ' + cls + '">' + u + 'u' + (vl ? '<i>' + vl + 'd</i>' : '') + '</td>'; };
    var lidRows = (d.per_lid || []).map(function (l) {
      var wk = l.weken || {}, vl = l.verlof || {};
      var taks = (l.per_tak || []).slice(0, 4).map(function (x) { return esc(DISC_LABEL[x.tak] || x.tak) + ' ' + x.uren + 'u'; }).join(', ');
      return '<tr' + (l.uren < 4 ? ' class="ruimte"' : '') + '><td class="nm">' + esc(l.naam) + (l.pool ? ' ' + svgIc(IC.cam, 12) : '') + (l.uren < 4 ? ' <span class="rf">ruimte</span>' : '') + '</td>' +
        '<td class="kb"><b>' + l.uren + 'u</b> · ' + l.aantal + ' tk</td>' +
        wkCell(wk.vorige, 0) + wkCell(wk.deze, vl.deze) + wkCell(wk.volgende, vl.volgende) +
        '<td class="tk">' + (taks || '-') + '</td></tr>';
    }).join('');
    var takRows = (d.per_tak || []).map(function (x) { return '<tr><td>' + esc(DISC_LABEL[x.tak] || x.tak) + '</td><td class="r">' + x.aantal + ' taken</td><td class="r"><b>' + x.uren + 'u</b></td></tr>'; }).join('');
    var kpis = '<div class="kpis">' +
      '<div class="kpi"><b>' + d.totaal.aantal + '</b><span>Taken te plannen</span></div>' +
      '<div class="kpi"><b>' + d.totaal.uren + 'u</b><span>Geschatte uren</span></div>' +
      '<div class="kpi"><b>±' + d.prognose.weken_backlog + ' wk</b><span>Backlog voor het team</span></div>' +
      '<div class="kpi"><b>' + d.zonder_est + '</b><span>Zonder inschatting</span></div></div>';
    var css = '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Montserrat,Nunito,Arial,sans-serif;color:#2a2530;padding:26px 30px;font-size:11px}h1{font-size:21px;font-weight:900}h2{font-size:13px;font-weight:800;margin:16px 0 8px;color:#5e50c8}.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #efe9ef;padding-bottom:12px;margin-bottom:14px}.hd img{height:26px}.meta{font-size:11px;color:#8a818d;margin-top:3px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0 6px}.kpi{border:1px solid #efe9ef;border-radius:10px;padding:10px 12px}.kpi b{font-size:18px;font-weight:900;display:block}.kpi span{font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#8a818d}table{width:100%;border-collapse:collapse;margin-bottom:6px}th{font-size:8.5px;text-transform:uppercase;letter-spacing:.04em;color:#8a818d;text-align:left;padding:6px 7px;border-bottom:1px solid #efe9ef}td{padding:6px 7px;border-bottom:1px solid #f4f0f4;font-size:10.5px}td.nm{font-weight:700}td.r{text-align:right}.rf{font-size:8px;font-weight:800;color:#c9781f;background:#fbeede;border-radius:8px;padding:1px 6px;text-transform:uppercase}tr.ruimte{background:#fff8f0}td.wk{text-align:center;font-weight:700}td.wk i{font-style:normal;font-size:8px;color:#2c7a4b;display:block;font-weight:700}td.wk.vol{color:#c0392b}td.wk.leeg{color:#2c7a4b}td.tk{color:#5c5560;font-size:9.5px}.disc{margin-top:16px;border-top:1px solid #efe9ef;padding-top:10px;font-size:9px;color:#8a818d;line-height:1.5}.noprint{margin:16px 0}@media print{.noprint{display:none}}';
    var html = '<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Capaciteit · Studio 27</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet"><style>' + css + '</style></head><body>' +
      '<div class="hd"><div><h1>Capaciteit</h1><div class="meta">Wie heeft ruimte om in te plannen · snapshot ' + dd + '</div></div><img src="' + base + '/wordmark.svg" alt="Studio 27"></div>' +
      kpis +
      '<h2>Per teamlid</h2><table><thead><tr><th>Teamlid</th><th>Startklaar</th><th>Vorige wk</th><th>Deze wk</th><th>Volgende wk</th><th>Werkt aan</th></tr></thead><tbody>' + lidRows + '</tbody></table>' +
      '<h2>Per tak</h2><table><tbody>' + takRows + '</tbody></table>' +
      '<div class="disc">' + esc(d.disclaimer || '') + ' Weekuren = ingeplande uren (op deadline); verlof = goedgekeurde payroll-dagen. Referentie 38u/week.</div>' +
      '<div class="noprint"><button onclick="window.print()" style="padding:9px 16px;border:0;border-radius:8px;background:#5e50c8;color:#fff;font-weight:800;font-family:inherit;cursor:pointer">Opslaan als PDF / Afdrukken</button></div>' +
      '</body></html>';
    s27EmitDoc(html, 'studio27-capaciteit.html');
  }

  /* ---- SOLLICITATIES (kandidaten uit ClickUp + AI-beoordeling van het CV) ---- */
  async function renderSollicitaties(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Sollicitaties</h1><div class="sub">Laden…</div></div><div class="empty"><p>Kandidaten ophalen uit ClickUp…</p></div></div>';
    var d; try { d = await api('teamSollicitaties', {}); } catch (e) { return; }
    if (state.route !== 'sollicitaties') return;
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = (d && d.error === 'forbidden_role') ? 'Sollicitaties zijn enkel voor de zaakvoerder.' : 'Kon de sollicitaties niet laden.'; return; }
    state.sol = d.items || [];
    state.solStatussen = d.statussen || [];
    if (!state.solF) state.solF = { type: 'alle', vac: '', status: '', q: '' };
    drawSollicitaties(page);
  }
  function typeLabel(t) { return t === 'stage' ? 'Stage' : t === 'spontaan' ? 'Spontaan' : 'Sollicitatie'; }
  // Enkel http(s) toelaten in een href (CV-link komt uit een door-derden-beïnvloedbaar veld;
  // esc() filtert geen javascript:-scheme). Lege string = knop niet renderen.
  function safeUrl(u) { u = String(u == null ? '' : u); return /^https?:\/\//i.test(u) ? u : ''; }
  function solDatum(it) { if (it.ts) { var x = new Date(it.ts); return x.getDate() + ' ' + MONTHS[x.getMonth()]; } if (it.datum) return it.datum; return ''; }
  function solStatusTag(it) {
    var stats = state.solStatussen || [];
    var curLow = (it.status_raw || '').toLowerCase();
    var cur = stats.filter(function (s) { return s.status.toLowerCase() === curLow; })[0] || { status: it.status_raw || 'Status', color: it.status_color || '#9e919e' };
    return '<div class="st-tagwrap sol-st" data-id="' + esc(it.id) + '">' +
      '<button class="st-tag sol-sttag" style="--sc:' + esc(cur.color || '#9e919e') + ';color:' + lumText(cur.color || '#9e919e') + '"><span class="st-lbl">' + esc(stLabel(cur.status)) + '</span><svg class="st-chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<div class="st-menu" hidden>' + (stats.length ? stats.map(function (s) { var on = s.status.toLowerCase() === curLow; return '<button class="st-opt' + (on ? ' on' : '') + '" data-st="' + esc(s.status) + '"><span class="st-dot" style="background:' + esc(s.color || '#9e919e') + '"></span><span class="st-on">' + esc(stLabel(s.status)) + '</span>' + (on ? '<span class="st-check">✓</span>' : '') + '</button>'; }).join('') : '<div class="st-empty">Geen statussen</div>') + '</div></div>';
  }
  function solCard(it) {
    var ai = it.ai, badge = '';
    if (ai) { var goed = !!ai.goede_kandidaat; var sc = (ai.score != null) ? ai.score : ''; badge = '<span class="sol-score ' + (goed ? 'goed' : 'neutraal') + '" title="' + (goed ? 'Goede kandidaat' : 'Neutraal beoordeeld') + ', score ' + (sc !== '' ? sc + '/100' : 'onbekend') + '">' + (goed ? '★ ' : '') + (sc !== '' ? sc + '/100' : 'beoordeeld') + '</span>'; }
    var spamB = it.spam ? '<span class="sol-spamb">spam?</span>' : '';
    var meta = [it.vacature || 'Vacature onbekend', it.woonplaats || '', solDatum(it)].filter(Boolean).join(' · ');
    var contact = [it.email ? '<a href="mailto:' + esc(it.email) + '" onclick="event.stopPropagation()">' + esc(it.email) + '</a>' : '', it.telefoon ? '<a href="tel:' + esc(it.telefoon.replace(/\s/g, '')) + '" onclick="event.stopPropagation()">' + esc(it.telefoon) + '</a>' : ''].filter(Boolean).join(' · ');
    var snip = (ai && ai.samenvatting) ? '<div class="sol-snip">' + esc(ai.samenvatting) + '</div>' : '';
    var cvUrl = safeUrl(it.cv_url);
    return '<div class="sol-card br-pink' + (it.spam ? ' is-spam' : '') + '" data-id="' + esc(it.id) + '"><span class="bar"></span>' +
      '<div class="sol-main"><div class="sol-top"><span class="sol-naam">' + esc(it.naam || 'Kandidaat') + '</span>' + spamB + badge + solStatusTag(it) + '</div>' +
      '<div class="sol-vac">' + esc(meta) + '</div>' +
      snip +
      (contact ? '<div class="sol-contact">' + contact + '</div>' : '') + '</div>' +
      '<div class="sol-acts">' +
        (cvUrl ? '<a class="btn btn-outline btn-sm" href="' + esc(cvUrl) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">CV ↗</a>' : '') +
        '<button class="btn btn-primary btn-sm sol-ai" data-id="' + esc(it.id) + '">Open dossier →</button>' +
      '</div></div>';
  }
  function solStatusColor(it) { var s = (state.solStatussen || []).filter(function (x) { return x.status.toLowerCase() === (it.status_raw || '').toLowerCase(); })[0]; return (s && s.color) || it.status_color || '#9e919e'; }
  function kandRow(it) {
    var ai = it.ai;
    var sc = (ai && ai.score != null) ? ai.score : null;
    var scoreCls = sc == null ? 'none' : (ai.goede_kandidaat ? 'goed' : (sc >= 55 ? 'mid' : 'laag'));
    var snip = (ai && ai.samenvatting) ? esc(ai.samenvatting) : (it.email ? esc(it.email) : '');
    return '<div class="kand-row" data-id="' + esc(it.id) + '">' +
      '<span class="kand-dot" style="background:' + esc(solStatusColor(it)) + '" title="' + esc(stLabel(it.status_raw) || '') + '"></span>' +
      '<span class="kand-nm">' + esc(it.naam || 'Kandidaat') + (it.spam ? '<span class="kand-spam">spam?</span>' : '') + '</span>' +
      '<span class="kand-vac">' + esc(it.vacature || '-') + '</span>' +
      '<span class="kand-snip">' + snip + '</span>' +
      '<span class="kand-score ' + scoreCls + '">' + (sc != null ? sc : '-') + '</span>' +
      '<span class="kand-type t-' + esc(it.type || 'sollicitatie') + '">' + typeLabel(it.type) + '</span>' +
      '<span class="kand-date">' + esc(solDatum(it) || '') + '</span>' +
      '</div>';
  }
  function solGroupedHtml(items) {
    if (!items.length) return '';
    if (!state.solCollapsed) state.solCollapsed = {};
    var order = (state.solStatussen || []).map(function (s) { return s.status.toLowerCase(); });
    var groups = {};
    items.forEach(function (it) { var k = it.status_raw || 'Overig'; (groups[k] = groups[k] || []).push(it); });
    var keys = Object.keys(groups).sort(function (a, b) { var ia = order.indexOf(a.toLowerCase()), ib = order.indexOf(b.toLowerCase()); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    return keys.map(function (k) {
      var arr = groups[k];
      var sdef = (state.solStatussen || []).filter(function (x) { return x.status.toLowerCase() === k.toLowerCase(); })[0];
      var col = (sdef && sdef.color) || '#9e919e';
      var collapsed = !!state.solCollapsed[k];
      return '<div class="kand-grp-wrap">' +
        '<button class="kand-grp' + (collapsed ? ' collapsed' : '') + '" data-grp="' + esc(k) + '"><svg class="kand-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg><span class="kand-grp-dot" style="background:' + esc(col) + '"></span><span class="kand-grp-nm">' + esc(stLabel(k)) + '</span><span class="kand-grp-n">' + arr.length + '</span></button>' +
        (collapsed ? '' : '<div class="kand-rows">' + arr.map(kandRow).join('') + '</div>') + '</div>';
    }).join('');
  }
  // status-type uit de ClickUp-statusdefinitie (open/custom/done/closed)
  function solStatusType(it) {
    var s = (state.solStatussen || []).filter(function (x) { return x.status.toLowerCase() === (it.status_raw || '').toLowerCase(); })[0];
    return s ? (s.type || '') : '';
  }
  // afgerond/afgewezen/aangenomen = uit het actieve overzicht (naar Archief)
  function solIsArchived(it) {
    var t = solStatusType(it);
    if (t === 'closed' || t === 'done') return true;
    return /afgewez|niet.?geschikt|aangenomen|gearchiveerd|archief/i.test(it.status_raw || '');
  }
  function solFiltered() {
    var f = state.solF || {}, items = state.sol || [];
    return items.filter(function (it) {
      if (f.type === 'spam') { if (!it.spam) return false; }
      else if (f.type === 'alle') { if (it.spam) return false; }   // iedereen die gesolliciteerd heeft (incl. archief), zonder spam
      else if (f.type === 'archief') { if (it.spam || !solIsArchived(it)) return false; }
      else { if (it.spam || solIsArchived(it)) return false; if (f.type && (it.type || 'sollicitatie') !== f.type) return false; }
      if (f.vac && (it.vacature || 'Vacature onbekend') !== f.vac) return false;
      if (f.status && (it.status_raw || '').toLowerCase() !== f.status.toLowerCase()) return false;
      if (f.q) { var q = f.q.toLowerCase(); if (((it.naam || '') + ' ' + (it.email || '') + ' ' + (it.vacature || '') + ' ' + (it.woonplaats || '')).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    });
  }
  function solTypeCounts() {
    var c = { alle: 0, sollicitatie: 0, stage: 0, spontaan: 0, spam: 0, archief: 0 };
    (state.sol || []).forEach(function (it) {
      if (it.spam) { c.spam++; return; }
      c.alle++;
      if (solIsArchived(it)) { c.archief++; return; }
      c[(it.type || 'sollicitatie')] = (c[(it.type || 'sollicitatie')] || 0) + 1;
    });
    return c;
  }
  function drawSollicitaties(page) {
    var all = state.sol || [], f = state.solF || {};
    var vacs = []; all.forEach(function (it) { if (it.spam) return; var v = it.vacature || 'Vacature onbekend'; if (vacs.indexOf(v) < 0) vacs.push(v); }); vacs.sort();
    var stats = state.solStatussen || [];
    var items = solFiltered();
    var cnt = solTypeCounts();
    var TABS = [['alle', 'Alle', cnt.alle], ['sollicitatie', 'Sollicitaties', cnt.sollicitatie], ['stage', 'Stages', cnt.stage], ['spontaan', 'Spontaan', cnt.spontaan], ['archief', 'Archief', cnt.archief], ['spam', 'Spam', cnt.spam]];
    var tabs = '<div class="werv-tabs">' + TABS.map(function (t) {
      return '<button class="werv-tab' + (f.type === t[0] ? ' on' : '') + (t[0] === 'spam' ? ' spam' : '') + '" data-type="' + t[0] + '">' + esc(t[1]) + (t[2] ? '<span class="werv-n">' + t[2] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
    var vacSel = '<select id="sol-f-vac" class="fin-sel"><option value="">Alle vacatures</option>' + vacs.map(function (v) { return '<option value="' + esc(v) + '"' + (f.vac === v ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select>';
    var stSel = '<select id="sol-f-st" class="fin-sel"><option value="">Alle statussen</option>' + stats.map(function (s) { return '<option value="' + esc(s.status) + '"' + ((f.status || '').toLowerCase() === s.status.toLowerCase() ? ' selected' : '') + '>' + esc(stLabel(s.status)) + '</option>'; }).join('') + '</select>';
    var search = '<input id="sol-f-q" class="sol-search" type="search" placeholder="Zoek op naam, e-mail…" value="' + esc(f.q || '') + '">';
    var sub = all.length ? (all.length + ' ' + (all.length === 1 ? 'aanvraag' : 'aanvragen') + ' uit ClickUp · elke kandidaat krijgt automatisch een AI-beoordeling') : 'Nog geen aanvragen binnen.';
    var head = '<div class="fin-top"><div class="t-hero"><h1>Werving</h1><div class="sub">' + sub + '</div></div><div class="fin-toolbar">' + search + vacSel + stSel + '</div></div>';
    var leeg = f.type === 'spam' ? 'Geen spam. Mooi.' : (all.length ? 'Geen kandidaten in deze categorie.' : 'Zodra iemand solliciteert via studio27.be, verschijnt die hier automatisch.');
    var body = items.length ? '<div class="kand-list">' + solGroupedHtml(items) + '</div>' : '<div class="empty"><p>' + leeg + '</p></div>';
    page.innerHTML = '<div class="panel active">' + head + tabs + body + '</div>';
    var redraw = function () { drawSollicitaties(page); };
    Array.prototype.forEach.call(page.querySelectorAll('.werv-tab'), function (b) { b.onclick = function () { state.solF.type = b.getAttribute('data-type'); state.solF.status = ''; redraw(); }; });
    if ($('sol-f-vac')) $('sol-f-vac').onchange = function () { state.solF.vac = this.value; redraw(); };
    if ($('sol-f-st')) $('sol-f-st').onchange = function () { state.solF.status = this.value; redraw(); };
    if ($('sol-f-q')) { $('sol-f-q').oninput = function () { state.solF.q = this.value; }; $('sol-f-q').onsearch = redraw; $('sol-f-q').onkeydown = function (e) { if (e.key === 'Enter') redraw(); }; }
    var open = function (id) { var it = (state.sol || []).find(function (x) { return x.id === id; }); if (it) openKandidaat(it); };
    Array.prototype.forEach.call(page.querySelectorAll('.kand-row'), function (c) { c.onclick = function () { open(c.getAttribute('data-id')); }; });
    Array.prototype.forEach.call(page.querySelectorAll('.kand-grp'), function (g) { g.onclick = function () { var k = g.getAttribute('data-grp'); state.solCollapsed[k] = !state.solCollapsed[k]; drawSollicitaties(page); }; });
  }
  async function setSolStatus(id, status, page) {
    var r; try { r = await api('teamSolStatus', { task_id: id, status: status }); } catch (e) { r = null; }
    if (!r || !r.ok) { toast('Status wijzigen mislukt'); return; }
    var it = (state.sol || []).find(function (x) { return x.id === id; }); if (it) { it.status_raw = status; if (r.status) it.status = r.status; }
    toast('Status: ' + stLabel(status)); drawSollicitaties(page);
  }
  /* ===== KANDIDAAT-DOSSIER (Econstruct-stijl: fasen + profiel + AI + acties + historiek) ===== */
  function kdSolDatum(it) { return solDatum(it) || '-'; }
  var KD_CHECK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  function phaseStepper(it) {
    var stats = (state.solStatussen || []).filter(function (s) { return !/spam|afgewez|niet.?geschikt/i.test(s.status); });
    if (!stats.length) return '';
    var curLow = (it.status_raw || '').toLowerCase();
    var curIdx = -1; stats.forEach(function (s, i) { if (s.status.toLowerCase() === curLow) curIdx = i; });
    return '<div class="kd-steps">' + stats.map(function (s, i) {
      var st = i < curIdx ? 'done' : (i === curIdx ? 'now' : 'todo');
      return '<button class="kd-step ' + st + '" data-st="' + esc(s.status) + '" style="--sc:' + esc(s.color || '#9e919e') + '" title="Zet op: ' + esc(stLabel(s.status)) + '"><span class="kd-step-dot">' + (st === 'done' ? KD_CHECK : '') + '</span><span class="kd-step-lbl">' + esc(stLabel(s.status)) + '</span></button>';
    }).join('') + '</div>';
  }
  function kdFaseDesc(it) {
    var s = (it.status_raw || '').toLowerCase();
    if (/binnen|nieuw|to.?do/.test(s)) return 'Nieuwe aanvraag. De AI heeft de kandidaat beoordeeld. Beslis of je contact opneemt of vriendelijk afwijst.';
    if (/communic/.test(s)) return 'Laat de kandidaat iets weten (positief of negatief) en beslis of je een gesprek inplant.';
    if (/vindt plaats/.test(s)) return 'Het gesprek vindt plaats. Neem het op vanuit dit dossier zodat de AI het achteraf transcribeert en samenvat.';
    if (/meeting|gepland/.test(s)) return 'Het gesprek is ingepland. Je kunt het straks opnemen vanuit dit dossier.';
    if (/analyse/.test(s)) return 'De transcriptie is geanalyseerd. Beslis of de kandidaat doorgaat naar de hard case.';
    if (/hard.?case/.test(s)) return 'Genereer een fysieke case uit de functie die de kandidaat ter plaatse uitwerkt.';
    if (/besluit/.test(s)) return 'Laatste stap: beslis of je de kandidaat aanwerft. Bij ja genereer je meteen een contract.';
    if (/aangenomen/.test(s)) return 'Aangenomen. Genereer het contract en rond af.';
    if (/afgewez|niet.?geschikt/.test(s)) return 'Afgewezen. Deze kandidaat staat in het archief.';
    return 'Volg de kandidaat door de wervingsfasen met de AI-acties hieronder.';
  }
  function kdProfile(it) {
    var rows = [
      ['E-mail', it.email ? '<a href="mailto:' + esc(it.email) + '">' + esc(it.email) + '</a>' : '<span class="kd-miss">ontbreekt</span>'],
      ['Telefoon', it.telefoon ? '<a href="tel:' + esc(it.telefoon.replace(/\s/g, '')) + '">' + esc(it.telefoon) + '</a>' : '-'],
      ['Woonplaats', esc(it.woonplaats || '-')],
      ['Functie', esc(it.vacature || '-')],
      ['Type aanvraag', typeLabel(it.type)],
      ['Binnengekomen', esc(kdSolDatum(it))],
      ['Herkomst', esc(it.kanaal || it.herkomst || '-')]
    ];
    return '<table class="kd-tbl"><tbody>' + rows.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>';
  }
  function kdAiBlock(it) {
    var ai = it.ai;
    if (!ai) return '<div id="kdAiBox" class="kd-aibox"><div class="kd-ai-loading">AI leest het CV en beoordeelt…</div></div>';
    var goed = !!ai.goede_kandidaat;
    var chips = [['Achtergrond past', ai.achtergrond_past], ['Motivatie zichtbaar', ai.motivatie_zichtbaar], ['Leergierig', ai.leergierig]].map(function (c) { return '<span class="sol-chip ' + (c[1] ? 'ja' : 'nee') + '">' + (c[1] ? '✓' : '✕') + ' ' + c[0] + '</span>'; }).join('');
    var lijst = function (arr) { return (arr && arr.length) ? '<ul class="sol-ul">' + arr.map(function (x) { return '<li>' + esc(String(x)) + '</li>'; }).join('') + '</ul>' : ''; };
    return '<div id="kdAiBox" class="kd-aibox">' +
      '<div class="sol-verdict ' + (goed ? 'goed' : 'neutraal') + '"><div class="sol-vscore">' + (ai.score != null ? ai.score : '-') + '<small>/100</small></div><div class="sol-vtx"><b>' + (goed ? '★ Sterke kandidaat' : 'Kandidaat') + '</b><span>' + esc(ai.oordeel || '') + '</span></div></div>' +
      (ai.samenvatting ? '<p class="kd-samv">' + esc(ai.samenvatting) + '</p>' : '') +
      '<div class="sol-chips">' + chips + '</div>' +
      (ai.cv_design ? '<div class="kd-sub"><h4>CV & presentatie</h4><p>' + esc(ai.cv_design) + '</p></div>' : '') +
      (lijst(ai.sterktes) ? '<div class="kd-sub"><h4>Sterktes</h4>' + lijst(ai.sterktes) + '</div>' : '') +
      (lijst(ai.aandachtspunten) ? '<div class="kd-sub"><h4>Aandachtspunten</h4>' + lijst(ai.aandachtspunten) + '</div>' : '') +
      '<button class="btn btn-outline btn-sm" id="kdRescore" style="margin-top:10px">Opnieuw beoordelen</button>' +
      '</div>';
  }
  var curKdId = null;   // welk dossier nu open is, gate voor async callbacks (geen verkeerd dossier herrenderen)
  function openKandidaat(it) {
    if (!it) return; curProject = null; curKdId = it.id;
    var cvUrl = safeUrl(it.cv_url);
    var typeBadge = '<span class="kd-typebadge t-' + esc(it.type || 'sollicitatie') + '">' + typeLabel(it.type) + '</span>';
    var spamBanner = it.spam ? '<div class="kd-spamban">⚠️ Gemarkeerd als mogelijke spam. Markeer als spam om op te ruimen, of wijzig de fase om de markering weg te halen.</div>' : '';
    var acts = '<div class="kd-acts">' +
      '<button class="btn btn-outline btn-sm kd-a" data-a="afwijzen">' + svgIc(IC.mail, 15) + ' Vriendelijk afwijzen</button>' +
      '<button class="btn btn-outline btn-sm kd-a" data-a="cv">' + svgIc(IC.file, 15) + ' CV opvragen</button>' +
      '<button class="btn btn-outline btn-sm kd-a" data-a="case">' + svgIc(IC.grid, 15) + ' Hard case genereren</button>' +
      '<button class="btn btn-outline btn-sm kd-a" data-a="opname">' + svgIc(IC.mic, 15) + ' Gesprek opnemen</button>' +
      '<button class="btn btn-outline btn-sm kd-a" data-a="mailsync">' + svgIc(IC.inbox, 15) + ' Mails ophalen</button>' +
      '<button class="btn btn-outline btn-sm kd-a" data-a="contract">' + svgIc(IC.file, 15) + ' Genereer contract</button>' +
      (cvUrl ? '<a class="btn btn-outline btn-sm" href="' + esc(cvUrl) + '" target="_blank" rel="noopener">CV openen ↗</a>' : '') +
      (it.spam ? '' : '<button class="btn btn-outline btn-sm kd-a danger" data-a="spam">' + svgIc(IC.slash, 15) + ' Als spam markeren</button>') +
      '</div>';
    var faseNaam = stLabel(it.status_raw) || 'Nieuw';
    $('modal').innerHTML = '<div class="modal-head br-pink"><span class="bar"></span><div style="flex:1;min-width:0"><div class="sub">' + esc(it.vacature || 'Sollicitatie') + ' ' + typeBadge + '</div><h2>' + esc(it.naam || 'Kandidaat') + '</h2></div><span class="kd-phase-pill"><span class="kd-pp-dot"></span>Huidige fase: ' + esc(faseNaam) + '</span><button class="modal-close" id="mclose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body">' +
      spamBanner +
      '<div class="kd-steps-wrap">' + phaseStepper(it) + '</div>' +
      '<div class="kd-grid2">' +
        '<div class="kd-main">' +
          '<div class="kd-fasecard"><span class="kd-fase-tag">Huidige fase</span><h2 class="kd-fase-h">' + esc(faseNaam) + '</h2>' +
            '<p class="kd-fase-desc">' + esc(kdFaseDesc(it)) + '</p>' +
            '<div class="kd-fase-actsh">✦ AI-acties bij deze fase</div>' + acts + '</div>' +
          '<div class="kd-sec"><h3>Profiel</h3>' + kdProfile(it) + '</div>' +
          '<div class="kd-sec"><h3>AI-beoordeling' + (it.ai && it.ai.cv_gelezen ? ' · CV gelezen' : '') + '</h3>' + kdAiBlock(it) + '</div>' +
        '</div>' +
        '<div class="kd-side"><div class="kd-sec kd-tl-sec"><h3>Dossier-tijdlijn</h3><div id="kdHist" class="kd-timeline"><div class="kd-ai-loading">Laden…</div></div></div></div>' +
      '</div>' +
      '</div>';
    $('modal').classList.add('modal-kd'); $('mclose').onclick = closeModal; $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    Array.prototype.forEach.call($('modal').querySelectorAll('.kd-step'), function (b) { b.onclick = function () { setKdStatus(it, b.getAttribute('data-st')); }; });
    Array.prototype.forEach.call($('modal').querySelectorAll('.kd-a'), function (b) { b.onclick = function () { var a = b.getAttribute('data-a'); if (a === 'afwijzen') kdMail(it, 'afwijzen'); else if (a === 'cv') kdMail(it, 'cv_opvragen'); else if (a === 'case') kdCase(it); else if (a === 'contract') kdContract(it); else if (a === 'opname') kdRecord(it); else if (a === 'mailsync') kdMailSync(it); else if (a === 'spam') kdSpam(it); }; });
    var rs = document.getElementById('kdRescore'); if (rs) rs.onclick = function () { this.disabled = true; this.textContent = 'AI leest opnieuw…'; this.style.cursor = 'wait'; rescoreKd(it); };
    if (!it.ai) scoreKd(it);   // standaard AI-beoordeling bij openen
    loadKdHistory(it);
  }
  // herteken de Werving-lijst eronder zodat status/spam/tellers meelopen na een dossier-actie
  function kdSyncLijst() { if (state.route === 'sollicitaties' && $('page')) drawSollicitaties($('page')); }
  // is het dossier voor DEZE kandidaat nog open? (anders niet herrenderen, verkeerd dossier vermijden)
  function kdOpen(it) { return curKdId === it.id && $('scrim').classList.contains('show') && document.getElementById('kdAiBox'); }
  async function scoreKd(it) {
    var r; try { r = await api('teamSollicitatieScore', { task_id: it.id }); } catch (e) { r = null; }
    if (!r || !r.ok) { var box = document.getElementById('kdAiBox'); if (box && curKdId === it.id) box.innerHTML = '<p class="micro" style="color:var(--ink-4)">' + (r && r.error === 'no_anthropic_key' ? 'AI-sleutel ontbreekt.' : 'AI-beoordeling mislukt.') + '</p>'; return; }
    it.ai = r.ai; if (r.ai && r.ai.spam) it.spam = true;
    if (kdOpen(it)) openKandidaat(it);   // enkel herrenderen als ditzelfde dossier nog open is
    if (r.ai && r.ai.spam) kdSyncLijst();
  }
  async function rescoreKd(it) {
    var r; try { r = await api('teamSollicitatieScore', { task_id: it.id, force: true }); } catch (e) { r = null; }
    if (r && r.ok) { it.ai = r.ai; if (r.ai && r.ai.spam) it.spam = true; toast('Opnieuw beoordeeld ✓'); if (kdOpen(it)) openKandidaat(it); kdSyncLijst(); }
    else { toast('Mislukt'); var rs = document.getElementById('kdRescore'); if (rs) { rs.disabled = false; rs.textContent = 'Opnieuw beoordelen'; } }
  }
  var _kdStatusBusy = false;
  async function setKdStatus(it, status) {
    if (_kdStatusBusy) return; _kdStatusBusy = true;   // voorkom dubbele fase-wissel bij snel klikken
    var r; try { r = await api('teamSolStatus', { task_id: it.id, status: status }); } catch (e) { r = null; }
    _kdStatusBusy = false;
    if (!r || !r.ok) { toast('Fase wijzigen mislukt'); return; }
    it.status_raw = status; if (r.status) it.status = r.status;
    toast('Fase: ' + stLabel(status));
    if (kdOpen(it)) openKandidaat(it);
    kdSyncLijst();
  }
  async function kdSpam(it) {
    it.spam = true;
    // persisteer de spam-markering server-side (Spam-veld + KV + spam-status) zodat ze na herladen blijft
    var r; try { r = await api('teamKandidaatSpam', { task_id: it.id, spam: true }); } catch (e) { r = null; }
    if (!r || !r.ok) { it.spam = false; toast('Markeren mislukt'); return; }
    var spamSt = (state.solStatussen || []).filter(function (s) { return /spam/i.test(s.status); })[0];
    if (spamSt) it.status_raw = spamSt.status;
    toast('Als spam gemarkeerd ✓');
    if (kdOpen(it)) openKandidaat(it);
    kdSyncLijst();
  }
  function kdDatum(ms) { var n = Number(ms); if (!n) return ''; var x = new Date(n); return x.getDate() + ' ' + MONTHS[x.getMonth()] + ' ' + (x.getHours() < 10 ? '0' : '') + x.getHours() + ':' + (x.getMinutes() < 10 ? '0' : '') + x.getMinutes(); }
  function kdTlSource(txt) {
    if (/^✉️/.test(txt)) return { lbl: 'mail', cls: 'mail', ic: '✉️' };
    if (/^📥/.test(txt)) return { lbl: 'inbox', cls: 'mail', ic: '📥' };
    if (/^🎙️/.test(txt)) return { lbl: 'ai', cls: 'ai', ic: '🎙️' };
    if (/^📄/.test(txt)) return { lbl: 'document', cls: 'doc', ic: '📄' };
    if (/^🤖/.test(txt)) return { lbl: 'ai', cls: 'ai', ic: '🤖' };
    if (/^\[INTERN\]/.test(txt) || txt.indexOf('[INTERN]') === 0) return { lbl: 'notitie', cls: 'intern', ic: '🗒️' };
    return { lbl: 'team', cls: 'team', ic: '💬' };
  }
  function kdTlTitle(txt) {
    var m = txt.match(/^[^\n\[]*\[([^\]]+)\]/);   // bv. "✉️ [MAIL VERZONDEN · Afwijzing]" → "Mail verzonden · Afwijzing"
    if (m) { var t = m[1].toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); }
    var first = txt.split('\n')[0].replace(/^[^\w]+/, '').trim();
    return first.length > 70 ? first.slice(0, 70) + '…' : (first || 'Notitie');
  }
  async function loadKdHistory(it) {
    var r; try { r = await api('teamProjectChat', { task_id: it.id }); } catch (e) { r = null; }
    var box = document.getElementById('kdHist'); if (!box || curKdId !== it.id) return;
    var cs = (r && r.ok && r.comments) ? r.comments : [];
    if (!cs.length) { box.innerHTML = '<p class="micro" style="color:var(--ink-4)">Nog geen activiteit. Verzonden mails, opnames, contracten en notities verschijnen hier automatisch.</p>'; return; }
    box.innerHTML = cs.slice().reverse().map(function (c) {
      var src = kdTlSource(c.tekst || '');
      var titel = kdTlTitle(c.tekst || '');
      var body = (c.tekst || '').replace(/^[^\n\[]*\[[^\]]+\]\s*/, '').trim();   // de [LABEL]-prefix uit de body halen
      return '<div class="kd-tl-item ' + src.cls + '"><span class="kd-tl-ic">' + src.ic + '</span><div class="kd-tl-body"><div class="kd-tl-top"><span class="kd-tl-titel">' + esc(titel) + '</span><span class="kd-tl-badge ' + src.cls + '">' + src.lbl + '</span></div>' +
        (body ? '<div class="kd-tl-txt">' + esc(body.length > 320 ? body.slice(0, 320) + '…' : body).replace(/\n/g, '<br>') + '</div>' : '') +
        '<div class="kd-tl-meta">' + esc(c.auteur || 'Studio 27') + (c.datum ? ' · ' + esc(kdDatum(c.datum)) : '') + '</div></div></div>';
    }).join('');
  }
  async function kdMail(it, soort) {
    showAiPop(soort === 'afwijzen' ? 'Vriendelijk afwijzen' : 'CV opvragen', '<div class="kd-ai-loading">AI schrijft een voorstel in jouw tone of voice…</div>');
    var r; try { r = await api('teamKandidaatMail', { task_id: it.id, soort: soort, action: 'preview' }); } catch (e) { r = null; }
    var body = document.querySelector('#tpAiPop .tp-aipop-body'); if (!body) return;
    if (!r || !r.ok) { body.innerHTML = '<p class="micro">' + (r && r.error === 'geen_email' ? 'Geen e-mailadres bij deze kandidaat.' : 'Kon geen voorstel maken.') + '</p>'; return; }
    var heeftMail = !!r.email;
    body.innerHTML = '<div class="kd-mailto">Naar: <b>' + esc(r.email || '-') + '</b><br>Onderwerp: ' + esc(r.onderwerp || '') + '</div>' +
      '<textarea id="kdMailTa" class="ai-input" rows="11">' + esc(r.tekst || '') + '</textarea>' +
      '<p class="micro" style="color:var(--ink-4);margin:6px 0 10px">Pas de tekst gerust aan vóór verzenden. Hij gaat als no-reply@studio27.be, met antwoord naar marketing@.</p>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" id="kdMailSend"' + (heeftMail ? '' : ' disabled title="Geen e-mailadres bekend"') + '>Verzenden</button><button class="btn btn-outline btn-sm" id="kdMailCancel">Annuleren</button></div>' +
      (heeftMail ? '' : '<p class="micro" style="margin-top:8px;color:#c0392b">Geen e-mailadres bekend. Vul dit eerst in ClickUp in.</p>');
    document.getElementById('kdMailCancel').onclick = closeAiPop;
    var sendBtn = document.getElementById('kdMailSend');
    if (sendBtn) sendBtn.onclick = async function () {
      this.disabled = true; this.textContent = 'Versturen…';
      var tekst = (document.getElementById('kdMailTa') || {}).value || '';
      var s; try { s = await api('teamKandidaatMail', { task_id: it.id, soort: soort, action: 'send', tekst: tekst }); } catch (e) { s = null; }
      if (s && s.ok && s.sent) {
        closeAiPop(); toast('Mail verzonden ✓');
        if (soort === 'afwijzen') { var afw = (state.solStatussen || []).filter(function (x) { return /afgewez/i.test(x.status); })[0]; if (afw) setKdStatus(it, afw.status); else loadKdHistory(it); }
        else loadKdHistory(it);
      } else { toast(s && s.error === 'geen_email' ? 'Geen e-mailadres' : 'Versturen mislukt'); this.disabled = false; this.textContent = 'Verzenden'; }
    };
  }
  async function kdCase(it) {
    showAiPop('🧩 Hard case', '<div class="kd-ai-loading">AI stelt een case op uit de functie…</div>');
    var r; try { r = await api('teamKandidaatCase', { task_id: it.id }); } catch (e) { r = null; }
    var body = document.querySelector('#tpAiPop .tp-aipop-body'); if (!body) return;
    if (!r || !r.ok) { body.innerHTML = '<p class="micro">Kon geen case genereren.</p>'; return; }
    body.innerHTML = '<div class="ai-plan">' + aiFmt(r.tekst || '') + '</div><div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-outline btn-sm" id="kdCaseCopy">Kopiëren</button></div>';
    var cb = document.getElementById('kdCaseCopy'); if (cb) cb.onclick = function () { copyText(r.tekst || ''); };
  }
  function kdContract(it) {
    showAiPop('📑 Contract genereren',
      '<div class="vac-field"><label>Type contract</label><div class="kc-radio"><label><input type="radio" name="kcDuur" value="onbepaald" checked> Onbepaalde duur</label><label><input type="radio" name="kcDuur" value="bepaald"> Bepaalde duur</label></div></div>' +
      '<div class="vac-field" id="kcEindWrap" style="display:none"><label>Einddatum (bij bepaalde duur)</label><input id="kcEind" class="ev-in" type="date"></div>' +
      '<div class="vac-field"><label>Functie</label><input id="kcFunctie" class="ev-in" type="text" value="' + esc(it.vacature || '') + '"></div>' +
      '<div class="kc-row"><div class="vac-field"><label>Geboortedatum</label><input id="kcGeb" class="ev-in" type="date"></div><div class="vac-field"><label>Rijksregister-/ID-nummer</label><input id="kcId" class="ev-in" type="text" placeholder="bv. 90.01.01-123.45" autocomplete="off"></div></div>' +
      '<div class="kc-row"><div class="vac-field"><label>Startdatum (optioneel)</label><input id="kcStart" class="ev-in" type="date"></div><div class="vac-field"><label>Brutoloon (optioneel)</label><input id="kcLoon" class="ev-in" type="text" placeholder="bv. € 2.800/maand"></div></div>' +
      '<p class="micro" style="color:var(--ink-4);margin:6px 0 10px">AI maakt een ontwerp-arbeidsovereenkomst (Word). Laat het altijd nakijken door je sociaal secretariaat vóór ondertekening.</p>' +
      '<button class="btn btn-primary btn-sm" id="kcGen">Genereer contract</button>');
    var durRadios = document.getElementsByName('kcDuur');
    Array.prototype.forEach.call(durRadios, function (r) { r.onchange = function () { var w = document.getElementById('kcEindWrap'); if (w) w.style.display = (this.value === 'bepaald' && this.checked) ? '' : 'none'; }; });
    var btn = document.getElementById('kcGen');
    if (btn) btn.onclick = async function () {
      var duur = 'onbepaald'; Array.prototype.forEach.call(durRadios, function (r) { if (r.checked) duur = r.value; });
      this.disabled = true; this.textContent = 'AI stelt het contract op…';
      var g = function (id) { return (document.getElementById(id) || {}).value || ''; };
      var payload = { task_id: it.id, duur: duur, einddatum: g('kcEind'), functie: g('kcFunctie'), geboortedatum: g('kcGeb'), id_nummer: g('kcId'), startdatum: g('kcStart'), loon: g('kcLoon') };
      var r; try { r = await api('teamKandidaatContract', payload); } catch (e) { r = null; }
      if (r && r.ok && r.html) {
        try {
          var blob = new Blob(['﻿' + r.html], { type: 'application/msword' });
          var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = r.filename || 'contract.doc'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        } catch (e) { }
        closeAiPop(); toast('Contract gegenereerd ✓' + (r.attached ? ', ook aan de taak gehangen' : '')); loadKdHistory(it);
      } else { toast('Genereren mislukt'); this.disabled = false; this.textContent = 'Genereer contract'; }
    };
  }
  // HR-5: mails van de kandidaat uit marketing@ ophalen en bij de taak zetten
  async function kdMailSync(it) {
    toast('Mails ophalen…');
    var r; try { r = await api('teamKandidaatMailSync', { task_id: it.id }, { timeout: 60000 }); } catch (e) { r = null; }
    if (!r || !r.ok) { toast(r && r.error === 'no_scope' ? 'Gmail-leestoegang nog niet toegekend' : (r && r.error === 'geen_email' ? 'Geen e-mailadres bij deze kandidaat' : 'Synchroniseren mislukt')); return; }
    toast(r.imported ? (r.imported + ' nieuwe mail(s) geïmporteerd ✓') : 'Geen nieuwe mails');
    loadKdHistory(it);
  }
  function blobToB64(blob) { return new Promise(function (resolve) { var fr = new FileReader(); fr.onload = function () { var s = String(fr.result || ''); resolve(s.slice(s.indexOf(',') + 1)); }; fr.onerror = function () { resolve(''); }; fr.readAsDataURL(blob); }); }
  // HR-6: gesprek opnemen in de browser, transcriberen via de worker (Whisper), bij de taak zetten
  function kdRecord(it) {
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Opname wordt niet ondersteund in deze browser'); return; }
    showAiPop('Gesprek opnemen', '<p class="micro" style="color:var(--ink-4);margin:0 0 12px">Neem het sollicitatiegesprek op. Na het stoppen transcribeert de AI het en zet samenvatting + transcriptie bij de kandidaat (voor de Analyse-fase).</p><button class="btn btn-primary btn-sm" id="recBtn">● Start opname</button><div id="recStat" style="margin-top:12px"></div>');
    var chunks = [], rec = null, stream = null, t0 = 0, timer = null, recording = false;
    var stat = function (html) { var e = document.getElementById('recStat'); if (e) e.innerHTML = html; };
    var btn = document.getElementById('recBtn');
    btn.onclick = async function () {
      if (!recording) {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Geen microfoontoegang'); return; }
        rec = new MediaRecorder(stream); chunks = [];
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = async function () {
          try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { }
          if (timer) clearInterval(timer);
          var blob = new Blob(chunks, { type: 'audio/webm' });
          stat('<p class="micro">AI transcribeert de opname (' + Math.round(blob.size / 1024) + ' KB)…</p>');
          var b64 = await blobToB64(blob);
          var r; try { r = await api('teamKandidaatTranscribe', { task_id: it.id, audio_b64: b64, mime: 'audio/webm' }, { timeout: 180000 }); } catch (e) { r = null; }
          if (r && r.ok) { stat('<div class="kd-sub"><h4>Samenvatting</h4><p>' + esc(r.samenvatting || '(geen)') + '</p></div><details style="margin-top:8px"><summary class="micro" style="cursor:pointer">Volledige transcriptie</summary><p class="micro" style="white-space:pre-wrap;margin-top:6px">' + esc(r.transcript || '') + '</p></details><p class="micro" style="color:var(--ink-4);margin-top:8px">Opgeslagen bij de kandidaat ✓</p>'); loadKdHistory(it); }
          else { stat('<p class="micro" style="color:#c0392b">' + (r && r.error === 'no_transcribe_key' ? 'Transcriptie-sleutel (OPENAI_API_KEY) ontbreekt nog in de worker.' : (r && r.error === 'te_groot' ? 'De opname is te lang (max ~24 MB).' : 'Transcriberen mislukt.')) + '</p>'); var rb = document.getElementById('recBtn'); if (rb) { rb.disabled = false; rb.textContent = '● Opnieuw opnemen'; } }
        };
        rec.start(); recording = true; t0 = Date.now();
        btn.textContent = '■ Stop opname'; btn.classList.add('rec-on');
        timer = setInterval(function () { var s = Math.floor((Date.now() - t0) / 1000); stat('<span class="rec-dot"></span> Opname loopt · ' + Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60)); }, 500);
      } else {
        if (rec && rec.state !== 'inactive') rec.stop();
        recording = false; btn.disabled = true; btn.textContent = 'Verwerken…'; btn.classList.remove('rec-on');
      }
    };
  }

  /* ===== VACATURES-BEHEER (Golf HR-2. Webflow open/dicht + nieuwe uit template) ===== */
  async function renderVacatures(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Vacatures</h1><div class="sub">Laden…</div></div><div class="empty"><p>Vacatures ophalen uit Webflow…</p></div></div>';
    var d; try { d = await api('teamVacatures', {}); } catch (e) { d = null; }
    if (state.route !== 'vacatures') return;
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = (d && d.error === 'forbidden_role') ? 'Vacaturebeheer is enkel voor de zaakvoerder.' : 'Kon de vacatures niet laden.'; return; }
    state.vac = d.items || [];
    state.vacNoToken = !!d.geen_token;
    drawVacatures(page);
  }
  function vacCard(v) {
    var tags = (v.diensten || []).map(function (x) { return '<span class="vac-tag">' + esc(x) + '</span>'; }).join('');
    var badge = v.is_archived ? '<span class="vac-badge arch">gearchiveerd</span>' : (v.is_draft ? '<span class="vac-badge draft">concept</span>' : '');
    return '<div class="vac-card br-pink' + (v.actief ? ' on' : '') + '" data-id="' + esc(v.id) + '"><span class="bar"></span>' +
      '<div class="vac-main"><div class="vac-top"><span class="vac-naam">' + esc(v.name || 'Vacature') + '</span>' + badge + '</div>' +
      (v.intro ? '<div class="vac-intro">' + esc(v.intro) + '</div>' : '') +
      (tags ? '<div class="vac-tags">' + tags + '</div>' : '') + '</div>' +
      '<div class="vac-acts">' +
        '<a class="vac-link" href="' + esc(v.url) + '" target="_blank" rel="noopener" title="Bekijk op de site">Bekijk ↗</a>' +
        // gearchiveerde vacature: GEEN aan/uit-schakelaar (die zou via de Webflow-fallback de archivering ongedaan maken)
        (v.is_archived ? '' : '<label class="vac-switch" title="' + (v.actief ? 'Online, klik om te sluiten' : 'Gesloten, klik om te openen') + '"><input type="checkbox" class="vac-toggle"' + (v.actief ? ' checked' : '') + ' data-id="' + esc(v.id) + '"><span class="vac-sl"></span><span class="vac-st">' + (v.actief ? 'Online' : 'Gesloten') + '</span></label>') +
      '</div></div>';
  }
  function drawVacatures(page) {
    var all = state.vac || [];
    if (!state.vacTab) state.vacTab = 'lijst';
    var aantalOnline = all.filter(function (v) { return v.actief && !v.is_archived; }).length;
    var sub = state.vacTab === 'stats' ? 'Bezoek & herkomst van je vacaturepagina’s (GA4)' : (state.vacNoToken ? 'Eénmalige Webflow-koppeling nodig' : (all.length ? (all.length + ' vacatures · ' + aantalOnline + ' online') : 'Nog geen vacatures in Webflow.'));
    var subnav = '<div class="werv-tabs" style="margin-bottom:14px">' +
      '<button class="werv-tab' + (state.vacTab === 'lijst' ? ' on' : '') + '" data-vt="lijst">Vacatures</button>' +
      '<button class="werv-tab' + (state.vacTab === 'stats' ? ' on' : '') + '" data-vt="stats">Statistieken</button></div>';
    var toolbar = (state.vacTab === 'lijst' && !state.vacNoToken) ? '<div class="fin-toolbar"><button class="btn btn-primary btn-sm" id="vac-new">+ Nieuwe vacature</button></div>' : '';
    var head = '<div class="fin-top"><div class="t-hero"><h1>Vacatures</h1><div class="sub">' + esc(sub) + '</div></div>' + toolbar + '</div>';
    var body;
    if (state.vacTab === 'stats') {
      body = '<div id="hrStatsBox"><div class="empty"><p>Cijfers ophalen uit GA4…</p></div></div>';
    } else if (state.vacNoToken) {
      body = '<div class="fincard" style="margin-top:8px"><div class="section-head"><h2>Webflow nog te koppelen</h2></div>' +
        '<p style="font-size:13.5px;color:var(--ink-3);line-height:1.55;margin:0 0 10px">Het vacaturebeheer staat klaar. Om vacatures te openen/sluiten en nieuwe aan te maken heb ik eenmalig een Webflow API-token nodig (instructies kreeg je in de chat). De statistieken-tab werkt los daarvan al.</p>' +
        '<a class="btn btn-outline btn-sm" href="https://www.studio27.be/vacatures" target="_blank" rel="noopener">Bekijk de vacaturepagina ↗</a></div>';
    } else {
      var live = all.filter(function (v) { return v.actief && !v.is_archived; });
      var rest = all.filter(function (v) { return !(v.actief && !v.is_archived); });
      var sect = function (titel, arr) { return arr.length ? '<div class="vac-sech">' + titel + '</div><div class="vac-list">' + arr.map(vacCard).join('') + '</div>' : ''; };
      body = all.length ? (sect('Online', live) + sect('Niet online', rest)) : '<div class="empty"><p>Maak je eerste vacature aan met de knop hierboven.</p></div>';
    }
    page.innerHTML = '<div class="panel active">' + head + subnav + body + '</div>';
    Array.prototype.forEach.call(page.querySelectorAll('.werv-tab[data-vt]'), function (b) { b.onclick = function () { state.vacTab = b.getAttribute('data-vt'); drawVacatures(page); }; });
    if ($('vac-new')) $('vac-new').onclick = function () { openVacCreate(page); };
    Array.prototype.forEach.call(page.querySelectorAll('.vac-toggle'), function (t) { t.onchange = function () { t.disabled = true; toggleVac(t.getAttribute('data-id'), t.checked, page); }; });
    Array.prototype.forEach.call(page.querySelectorAll('.vac-card'), function (c) { c.onclick = function (e) { if (e.target.closest('.vac-acts')) return; var v = (state.vac || []).find(function (x) { return x.id === c.getAttribute('data-id'); }); if (v) openVacDetail(v, page); }; });
    if (state.vacTab === 'stats') loadHrStats(page);
  }
  /* ---- HR-statistieken (GA4-cijfers vacaturepagina’s) ---- */
  function hrChannelIcon(ch) { var c = (ch || '').toLowerCase(); if (/social/.test(c)) return '📱'; if (/organic|search/.test(c)) return '🔍'; if (/direct/.test(c)) return '➡️'; if (/referral/.test(c)) return '🔗'; if (/paid|display/.test(c)) return '💶'; if (/email/.test(c)) return '✉️'; return '•'; }
  function hrSourceLabel(s) { var m = { 'l.instagram.com': 'Instagram', 'instagram.com': 'Instagram', 'ig': 'Instagram', 'instagram': 'Instagram', 'tiktok.com': 'TikTok', 'tiktok': 'TikTok', 'vdab.be': 'VDAB', 'lnkd.in': 'LinkedIn', 'linkedin.com': 'LinkedIn', 'facebook.com': 'Facebook', 'm.facebook.com': 'Facebook', 'l.facebook.com': 'Facebook', 'google': 'Google', '(direct)': 'Direct', '(none)': 'Direct' }; return m[(s || '').toLowerCase()] || s || '-'; }
  async function loadHrStats(page) {
    var box = document.getElementById('hrStatsBox'); if (!box) return;
    if (!state.hrPeriod) state.hrPeriod = 'last_30d';
    var seq = (state._hrSeq = (state._hrSeq || 0) + 1);   // last-writer-wins-guard bij snel periode-wisselen
    var d; try { d = await api('teamHrStats', { period: state.hrPeriod }); } catch (e) { d = null; }
    if (seq !== state._hrSeq || state.route !== 'vacatures' || state.vacTab !== 'stats') return;
    box = document.getElementById('hrStatsBox'); if (!box) return;
    if (!d || !d.ok) { box.innerHTML = '<div class="empty"><p>Kon de statistieken niet laden.</p></div>'; return; }
    if (!d.linked) {
      var msg = d.reason === 'no_property' ? 'Ik kon het GA4-property voor studio27.be niet automatisch vinden. Vul het GA4 property-ID in op de Studio 27-bedrijfstaak in ClickUp, dan verschijnen de cijfers hier.'
        : (d.reason === 'no_token' ? 'De Google-koppeling (service-account) kon geen token aanmaken. Even nakijken bij de beheerder.' : 'GA4 is even niet bereikbaar.');
      box.innerHTML = '<div class="fincard"><div class="section-head"><h2>GA4 nog niet gekoppeld</h2></div><p style="font-size:13.5px;color:var(--ink-3);line-height:1.55;margin:0">' + msg + '</p></div>'; return;
    }
    drawHrStats(box, d, page);
  }
  function drawHrStats(box, d, page) {
    var t = d.totals || { views: 0, users: 0, sessions: 0 };
    var PER = [['last_7d', '7 dagen'], ['last_14d', '14 dagen'], ['last_30d', '30 dagen'], ['last_90d', '90 dagen']];
    var perSel = '<div class="hr-perw">' + PER.map(function (p) { return '<button class="hr-per' + (state.hrPeriod === p[0] ? ' on' : '') + '" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>';
    var kpis = '<div class="hr-kpis">' +
      '<div class="hr-kpi"><b>' + (t.views || 0).toLocaleString('nl-BE') + '</b><span>Paginaweergaven</span></div>' +
      '<div class="hr-kpi"><b>' + (t.users || 0).toLocaleString('nl-BE') + '</b><span>Unieke bezoekers</span></div>' +
      '<div class="hr-kpi"><b>' + (t.sessions || 0).toLocaleString('nl-BE') + '</b><span>Sessies</span></div></div>';
    // kanalen als balken
    var chans = (d.channels || []).slice(0, 8);
    var maxC = chans.reduce(function (a, c) { return Math.max(a, c.sessions); }, 0) || 1;
    var chanRows = chans.length ? chans.map(function (c) {
      var pct = Math.round((c.sessions / maxC) * 100);
      return '<div class="hr-bar"><div class="hr-bar-lbl">' + hrChannelIcon(c.channel) + ' ' + esc(c.channel || '-') + '</div><div class="hr-bar-track"><i style="width:' + pct + '%"></i></div><div class="hr-bar-val">' + c.sessions.toLocaleString('nl-BE') + '</div></div>';
    }).join('') : '<p class="micro" style="color:var(--ink-4)">Geen kanaaldata in deze periode.</p>';
    // herkomst-bronnen (tabel, Instagram/TikTok/VDAB herkenbaar)
    var srcs = (d.sources || []).filter(function (s) { return s.sessions > 0; }).slice(0, 12);
    var srcRows = srcs.length ? srcs.map(function (s) {
      return '<tr><td class="nm">' + esc(hrSourceLabel(s.source)) + '</td><td class="dim">' + esc(s.medium || '-') + '</td><td class="r">' + s.sessions.toLocaleString('nl-BE') + '</td><td class="r">' + s.users.toLocaleString('nl-BE') + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="dim">Geen bronnen in deze periode.</td></tr>';
    // per vacaturepagina + sollicitaties-koppeling (uit state.sol indien geladen)
    var solPerSlug = {};
    (state.sol || []).forEach(function (it) { if (it.spam) return; var m = (it.herkomst || '').match(/\/vacatures\/([a-z0-9-]+)/i); var slug = m ? m[1].toLowerCase() : ''; if (slug) solPerSlug[slug] = (solPerSlug[slug] || 0) + 1; });
    var pages = (d.pages || []).filter(function (p) { return /\/vacatures\/[a-z0-9]/i.test(p.path); }).slice(0, 20);
    var pageRows = pages.length ? pages.map(function (p) {
      var slug = (p.path.match(/\/vacatures\/([a-z0-9-]+)/i) || [])[1] || '';
      var titel = slug ? slug.replace(/-+/g, ' ') : p.path;
      var sols = solPerSlug[(slug || '').toLowerCase()] || 0;
      return '<tr><td class="nm">' + esc(titel) + '</td><td class="r">' + p.views.toLocaleString('nl-BE') + '</td><td class="r">' + p.users.toLocaleString('nl-BE') + '</td><td class="r">' + (sols ? '<b>' + sols + '</b>' : '-') + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="dim">Geen vacaturepagina’s bezocht in deze periode.</td></tr>';
    box.innerHTML = perSel + kpis +
      '<div class="fincard" style="margin-top:16px"><div class="section-head"><h2>Via welk kanaal</h2></div><div class="hr-bars">' + chanRows + '</div></div>' +
      '<div class="fincard" style="margin-top:16px"><div class="section-head"><h2>Herkomst-bronnen</h2></div><table class="hr-tbl"><thead><tr><th>Bron</th><th>Medium</th><th class="r">Sessies</th><th class="r">Bezoekers</th></tr></thead><tbody>' + srcRows + '</tbody></table></div>' +
      '<div class="fincard" style="margin-top:16px"><div class="section-head"><h2>Per vacaturepagina</h2></div><table class="hr-tbl"><thead><tr><th>Vacature</th><th class="r">Weergaven</th><th class="r">Bezoekers</th><th class="r">Sollicitaties</th></tr></thead><tbody>' + pageRows + '</tbody></table><p class="micro" style="margin-top:8px;color:var(--ink-4)">Sollicitaties gekoppeld via de herkomst-URL van de kandidaat' + ((state.sol && state.sol.length) ? '' : ' (open eerst “Werving” om dit te vullen)') + '.</p></div>';
    Array.prototype.forEach.call(box.querySelectorAll('.hr-per'), function (b) { b.onclick = function () { state.hrPeriod = b.getAttribute('data-p'); loadHrStats(page); }; });
  }
  async function toggleVac(id, actief, page) {
    var v = (state.vac || []).find(function (x) { return x.id === id; }); if (v) v.actief = actief;
    var r; try { r = await api('teamVacatureToggle', { item_id: id, actief: actief }); } catch (e) { r = null; }
    if (!r || !r.ok) { toast(r && r.error === 'geen_token' ? 'Webflow nog niet gekoppeld' : 'Wijzigen mislukt'); if (v) v.actief = !actief; drawVacatures(page); return; }
    toast(actief ? 'Vacature online gezet ✓' : 'Vacature gesloten ✓');
    drawVacatures(page);
  }
  function openVacCreate(page) {
    var tmpls = (state.vac || []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var opts = '<option value="">Kies een bestaande vacature…</option>' + tmpls.map(function (v) { return '<option value="' + esc(v.id) + '">' + esc(v.name) + '</option>'; }).join('');
    showAiPop('➕ Nieuwe vacature',
      '<div class="kc-radio" style="margin-bottom:12px"><label><input type="radio" name="vacMode" value="template" checked> Op basis van bestaande</label><label><input type="radio" name="vacMode" value="ai"> Nieuw met AI</label></div>' +
      '<div class="vac-field"><label>Functietitel</label><input id="vacNaam" class="ev-in" type="text" placeholder="bv. Junior Performance Marketeer" maxlength="120"></div>' +
      '<div id="vacTmplWrap" class="vac-field"><label>Baseer op (template)</label><select id="vacTmpl" class="ev-in">' + opts + '</select></div>' +
      '<p id="vacHint" class="micro" style="color:var(--ink-4);margin:8px 0 12px">Neem een bestaande vacature over (incl. de gekoppelde dienst). Ze wordt als <b>concept</b> aangemaakt.</p>' +
      '<div id="vacAiOut"></div>' +
      '<button class="btn btn-primary btn-sm" id="vacCreate">Aanmaken</button>');
    var modeRadios = document.getElementsByName('vacMode');
    var setMode = function (m) {
      var w = document.getElementById('vacTmplWrap'); if (w) w.style.display = m === 'ai' ? 'none' : '';
      var h = document.getElementById('vacHint'); if (h) h.innerHTML = m === 'ai' ? 'De AI analyseert de tone-of-voice van je openstaande vacatures, schrijft een aanzet voor deze functie en kiest een passende Studio 27-foto. Je kunt alles nog aanpassen.' : 'Neem een bestaande vacature over (incl. de gekoppelde dienst). Ze wordt als <b>concept</b> aangemaakt.';
      var b = document.getElementById('vacCreate'); if (b) b.textContent = m === 'ai' ? '✦ AI-aanzet maken' : 'Aanmaken';
      var out = document.getElementById('vacAiOut'); if (out) out.innerHTML = ''; state.vacAiDraft = null;
    };
    Array.prototype.forEach.call(modeRadios, function (r) { r.onchange = function () { if (this.checked) setMode(this.value); }; });
    var btn = document.getElementById('vacCreate');
    var mode = function () { var m = 'template'; Array.prototype.forEach.call(modeRadios, function (r) { if (r.checked) m = r.value; }); return m; };
    if (btn) btn.onclick = async function () {
      var naam = ((document.getElementById('vacNaam') || {}).value || '').trim();
      if (!naam) { toast('Geef een functietitel'); return; }
      var m = mode();
      if (m === 'ai' && !state.vacAiDraft) {
        // stap 1: AI-aanzet ophalen
        this.disabled = true; this.textContent = 'AI schrijft…';
        var dr; try { dr = await api('teamVacatureAiDraft', { functie: naam }, { timeout: 60000 }); } catch (e) { dr = null; }
        this.disabled = false;
        if (!dr || !dr.ok) { toast('AI-aanzet mislukt'); this.textContent = '✦ AI-aanzet maken'; return; }
        state.vacAiDraft = { draft: dr.draft || {}, foto: dr.foto || null, dienst_ids: dr.dienst_ids || [] };
        var d2 = state.vacAiDraft.draft;
        var out = document.getElementById('vacAiOut');
        out.innerHTML = '<div class="vac-field"><label>Introtekst</label><textarea id="vacAiIntro" class="ai-input" rows="2">' + esc(d2.intro || '') + '</textarea></div>' +
          '<div class="vac-field"><label>Verwachten (HTML)</label><textarea id="vacAiVerw" class="ai-input" rows="3">' + esc(d2.verwachten || '') + '</textarea></div>' +
          '<div class="vac-field"><label>Aanbieden (HTML)</label><textarea id="vacAiAanb" class="ai-input" rows="3">' + esc(d2.aanbieden || '') + '</textarea></div>' +
          '<div class="vac-field"><label>Profiel (HTML)</label><textarea id="vacAiProf" class="ai-input" rows="3">' + esc(d2.profiel || '') + '</textarea></div>' +
          (state.vacAiDraft.foto && state.vacAiDraft.foto.url ? '<div class="vac-field"><label>Gekozen foto</label><img class="vd-img" src="' + esc(state.vacAiDraft.foto.url) + '" alt=""></div>' : '') +
          (state.vacAiDraft.dienst_ids.length ? '' : '<p class="micro" style="color:#c0392b">Geen dienst gevonden om over te nemen. Maak er eentje via een template.</p>');
        this.textContent = 'Vacature aanmaken';
        return;
      }
      this.disabled = true; this.textContent = 'Aanmaken…';
      var payload = { naam: naam };
      if (m === 'ai') {
        var g = function (id) { return (document.getElementById(id) || {}).value || ''; };
        payload.ai_velden = { intro: g('vacAiIntro'), alt: 'Vacature ' + naam + ' bij Studio 27.', verwachten: g('vacAiVerw'), aanbieden: g('vacAiAanb'), profiel: g('vacAiProf') };
        payload.foto_file_id = (state.vacAiDraft.foto && state.vacAiDraft.foto.fileId) || '';
        payload.dienst_ids = state.vacAiDraft.dienst_ids || [];
      } else {
        var tmpl = (document.getElementById('vacTmpl') || {}).value || '';
        if (!tmpl) { toast('Kies een vacature om over te nemen'); this.disabled = false; this.textContent = 'Aanmaken'; return; }
        payload.template_id = tmpl;
      }
      var r; try { r = await api('teamVacatureCreate', payload); } catch (e) { r = null; }
      if (r && r.ok) { closeAiPop(); toast('Concept-vacature aangemaakt ✓'); state.vacAiDraft = null; renderVacatures(page); }
      else { toast(r && r.error === 'geen_token' ? 'Webflow nog niet gekoppeld' : (r && r.error === 'dienst_vereist' ? 'Geen dienst om te koppelen' : 'Aanmaken mislukt')); this.disabled = false; this.textContent = m === 'ai' ? 'Vacature aanmaken' : 'Aanmaken'; }
    };
  }
  /* ---- Vacature-detail/editor (HR-7) + social-lancering (HR-8) ---- */
  async function openVacDetail(v, page) {
    $('modal').classList.add('modal-kd');
    $('modal').innerHTML = '<div class="modal-head br-pink"><span class="bar"></span><div style="flex:1;min-width:0"><div class="sub">Vacature</div><h2>' + esc(v.name || 'Vacature') + '</h2></div><button class="modal-close" id="mclose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div><div class="modal-body"><div class="empty"><p>Vacature laden…</p></div></div>';
    $('mclose').onclick = closeModal; $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    var d; try { d = await api('teamVacatureGet', { item_id: v.id }); } catch (e) { d = null; }
    if (!$('scrim').classList.contains('show')) return;
    var body = $('modal').querySelector('.modal-body'); if (!body) return;
    if (!d || !d.ok || !d.item) { body.innerHTML = '<div class="empty"><p>Kon de vacature niet laden.</p></div>'; return; }
    drawVacDetail(d.item, page);
  }
  function drawVacDetail(it, page) {
    var body = $('modal').querySelector('.modal-body'); if (!body) return;
    var img = it.image_url ? '<img class="vd-img" src="' + esc(it.image_url) + '" alt="">' : '<div class="vd-noimg">Nog geen foto</div>';
    // Uniform met het werving-/offerte-traject: statuspil in de kop + kd-grid2 (brede inhoud + smalle zijkolom).
    var head = $('modal').querySelector('.modal-head');
    if (head && !head.querySelector('.kd-phase-pill')) {
      var pill = document.createElement('span'); pill.className = 'kd-phase-pill'; pill.id = 'vd-statuspill';
      pill.innerHTML = '<span class="kd-pp-dot"></span>' + (it.actief ? 'Online' : 'Gesloten');
      var mc = head.querySelector('.modal-close'); if (mc) head.insertBefore(pill, mc); else head.appendChild(pill);
    }
    body.innerHTML = '<div class="kd-grid2">' +
      '<div class="kd-main"><div class="kd-sec"><h3>Inhoud bewerken</h3>' +
        '<div class="vac-field"><label>Titel</label><input id="vd-name" class="ev-in" value="' + esc(it.name) + '"></div>' +
        '<div class="vac-field"><label>Korte introtekst</label><textarea id="vd-intro" class="ai-input" rows="3">' + esc(it.intro) + '</textarea></div>' +
        '<div class="vac-field"><label>Alt-tekst foto (SEO, max 150)</label><input id="vd-alt" class="ev-in" maxlength="150" value="' + esc(it.alt) + '"></div>' +
        '<div class="vac-field"><label>Wat mag de sollicitant verwachten</label><textarea id="vd-verw" class="ai-input" rows="5">' + esc(it.verwachten) + '</textarea></div>' +
        '<div class="vac-field"><label>Wat kan je aanbieden</label><textarea id="vd-aanb" class="ai-input" rows="5">' + esc(it.aanbieden) + '</textarea></div>' +
        '<div class="vac-field"><label>Profiel van de sollicitant</label><textarea id="vd-prof" class="ai-input" rows="5">' + esc(it.profiel) + '</textarea></div>' +
        '<button class="btn btn-primary btn-sm" id="vd-save">Opslaan op Webflow</button>' +
      '</div></div>' +
      '<div class="kd-side">' +
        '<div class="kd-sec"><h3>Foto</h3><div id="vd-imgwrap">' + img + '</div><input type="file" id="vd-file" accept="image/*" hidden><button class="btn btn-outline btn-sm" id="vd-photo" style="margin-top:10px">' + svgIc(IC.cam, 15) + ' Foto vervangen</button><p class="micro" style="color:var(--ink-4);margin-top:8px">De foto wordt rechtstreeks naar Webflow geüpload. Max 4 MB.</p></div>' +
        '<div class="kd-sec"><h3>Status</h3><label class="vac-switch"><input type="checkbox" id="vd-actief"' + (it.actief ? ' checked' : '') + '><span class="vac-sl"></span><span class="vac-st" id="vd-actief-lbl">' + (it.actief ? 'Online' : 'Gesloten') + '</span></label>' +
          '<div style="margin-top:10px"><a class="vac-link" href="' + esc(it.url) + '" target="_blank" rel="noopener">Bekijk op de site ↗</a></div></div>' +
        '<div class="kd-sec"><h3>Lanceren</h3><div class="kd-acts">' +
          '<button class="btn btn-outline btn-sm vd-launch" data-l="web">' + svgIc(IC.monitor, 15) + ' Publiceer op de website</button>' +
          '<button class="btn btn-outline btn-sm vd-launch" data-l="social">📱 Publiceer op social</button>' +
          '<button class="btn btn-outline btn-sm vd-launch" data-l="ads">💶 Lanceer advertentiecampagne</button>' +
        '</div></div>' +
      '</div></div>';
    $('vd-save').onclick = async function () {
      this.disabled = true; this.textContent = 'Opslaan…';
      var g = function (id) { return (document.getElementById(id) || {}).value; };
      var r; try { r = await api('teamVacatureUpdate', { item_id: it.id, name: g('vd-name'), intro: g('vd-intro'), alt: g('vd-alt'), verwachten: g('vd-verw'), aanbieden: g('vd-aanb'), profiel: g('vd-prof') }); } catch (e) { r = null; }
      this.disabled = false; this.textContent = 'Opslaan op Webflow';
      if (r && r.ok) { toast('Opgeslagen op Webflow ✓'); it.name = g('vd-name'); var lv = (state.vac || []).find(function (x) { return x.id === it.id; }); if (lv) lv.name = it.name; }
      else { toast('Opslaan mislukt'); }
    };
    var act = document.getElementById('vd-actief');
    if (act) act.onchange = async function () {
      var on = this.checked; var r; try { r = await api('teamVacatureToggle', { item_id: it.id, actief: on }); } catch (e) { r = null; }
      if (r && r.ok) { it.actief = on; var lbl = document.getElementById('vd-actief-lbl'); if (lbl) lbl.textContent = on ? 'Online' : 'Gesloten'; var pill = document.getElementById('vd-statuspill'); if (pill) pill.innerHTML = '<span class="kd-pp-dot"></span>' + (on ? 'Online' : 'Gesloten'); var lv = (state.vac || []).find(function (x) { return x.id === it.id; }); if (lv) lv.actief = on; toast(on ? 'Online gezet ✓' : 'Gesloten ✓'); }
      else { this.checked = !on; toast('Wijzigen mislukt'); }
    };
    Array.prototype.forEach.call($('modal').querySelectorAll('.vd-launch'), function (b) { b.onclick = function () {
      var l = b.getAttribute('data-l');
      if (l === 'web') { var a2 = document.getElementById('vd-actief'); if (a2 && !a2.checked) { a2.checked = true; a2.onchange(); } else { toast('Deze vacature staat al online'); } }
      else if (l === 'social') { vacSocial(it); }
      else if (l === 'ads') { toast('Advertentiecampagne via Meta volgt (HR-9)'); }
    }; });
    var pBtn = document.getElementById('vd-photo'), fIn = document.getElementById('vd-file');
    if (pBtn && fIn) {
      pBtn.onclick = function () { fIn.click(); };
      fIn.onchange = async function () {
        var file = this.files && this.files[0]; if (!file) return;
        if (file.size > 4 * 1024 * 1024) { toast('Foto is te groot (max 4 MB)'); return; }
        pBtn.disabled = true; pBtn.textContent = 'Uploaden naar Webflow…';
        var b64 = await blobToB64(file);
        var r; try { r = await api('teamVacaturePhoto', { item_id: it.id, filename: file.name, data_b64: b64, mime: file.type }, { timeout: 90000 }); } catch (e) { r = null; }
        pBtn.disabled = false; pBtn.innerHTML = svgIc(IC.cam, 15) + ' Foto vervangen';
        if (r && r.ok) { toast('Foto vervangen ✓'); if (r.url) { it.image_url = r.url; var w = document.getElementById('vd-imgwrap'); if (w) w.innerHTML = '<img class="vd-img" src="' + esc(r.url) + '" alt="">'; } else { toast('Foto staat op Webflow; herlaad om te zien.'); } }
        else { toast(r && r.error === 'geen_token' ? 'Webflow niet gekoppeld' : 'Upload mislukt'); }
      };
    }
  }
  // HR-8: social-lancering. AI-caption + carrousel (Gemini fail-soft) → Metricool concept
  async function vacSocial(it) {
    showAiPop('📱 Social-lancering', '<div class="kd-ai-loading">AI maakt een caption en bereidt de carrousel voor…</div>');
    var r; try { r = await api('teamVacatureSocial', { item_id: it.id, action: 'preview' }); } catch (e) { r = null; }
    var body = document.querySelector('#tpAiPop .tp-aipop-body'); if (!body) return;
    if (!r || !r.ok) { body.innerHTML = '<p class="micro">' + (r && r.error === 'no_metricool' ? 'Metricool is nog niet gekoppeld voor Studio 27 (blogId ontbreekt op de S27-bedrijfstaak).' : (r && r.error === 'geen_foto' ? 'Deze vacature heeft nog geen foto om te delen.' : 'Kon de social-post niet voorbereiden.')) + '</p>'; return; }
    var slidesNote = r.gemini ? (r.slides_count + ' carrousel-slides door Gemini gemaakt') : 'Carrousel met de vacaturefoto (Gemini-visuals activeren zodra de GEMINI_API_KEY gezet is)';
    var prev = (r.media || []).slice(0, 6).map(function (u) { return '<img class="vs-thumb" src="' + esc(u) + '" alt="">'; }).join('');
    body.innerHTML = '<div class="vs-prev">' + prev + '</div>' +
      '<p class="micro" style="color:var(--ink-4);margin:4px 0 8px">' + esc(slidesNote) + '</p>' +
      '<div class="vac-field"><label>Caption</label><textarea id="vsCap" class="ai-input" rows="6">' + esc(r.caption || '') + '</textarea></div>' +
      '<div class="vac-field"><label>Inplannen op</label><input id="vsDate" class="ev-in" type="datetime-local" value="' + esc(r.suggest_date || '') + '"></div>' +
      '<p class="micro" style="color:var(--ink-4);margin:0 0 10px">Wordt als <b>concept</b> ingepland in Metricool op de social van Studio 27. Je finaliseert daar.</p>' +
      '<button class="btn btn-primary btn-sm" id="vsPlan">Plan als concept in</button>';
    document.getElementById('vsPlan').onclick = async function () {
      var cap = (document.getElementById('vsCap') || {}).value || '';
      var dt = (document.getElementById('vsDate') || {}).value || '';
      if (!dt) { toast('Kies een datum en tijd'); return; }
      this.disabled = true; this.textContent = 'Inplannen…';
      var s; try { s = await api('teamVacatureSocial', { item_id: it.id, action: 'schedule', caption: cap, date: dt }); } catch (e) { s = null; }
      if (s && s.ok) { closeAiPop(); toast('Concept ingepland in Metricool ✓'); }
      else { toast(s && s.error === 'no_metricool' ? 'Metricool niet gekoppeld' : 'Inplannen mislukt'); this.disabled = false; this.textContent = 'Plan als concept in'; }
    };
  }

  /* ===== ADVERTEERDERSPORTAAL (ADV-1): klant-overzicht met kleurstatus ===== */
  var ADS_STATUS = { goed: ['Goed', '#2c7a4b', '#e7f4ec'], boven: ['Bovengemiddeld', '#1f6feb', '#e6f0fb'], onder: ['Onderpresteert', '#c9781f', '#fbeede'], probleem: ['Probleem', '#c0392b', '#fdecea'], neutraal: ['Geen data', '#9e919e', '#f2eef2'] };
  function adsTrendIcon(t) { return t === 'up' ? '▲' : (t === 'down' ? '▼' : '-'); }
  async function renderAdverteren(page) {
    if (!state.adsPeriod) state.adsPeriod = 'last_7d';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Adverteerders</h1><div class="sub">Cijfers ophalen uit Meta…</div></div><div class="empty"><p>Even geduld, we halen de live-data per klant op.</p></div></div>';
    var d; try { d = await api('teamAdsOverview', { period: state.adsPeriod }, { timeout: 90000 }); } catch (e) { d = null; }
    if (state.route !== 'adverteren') return;
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = (d && d.error === 'forbidden_role') ? 'Dit overzicht is voor de advertentie-collega’s.' : 'Kon het overzicht niet laden.'; return; }
    state.ads = d.items || [];
    drawAds(page);
  }
  function adsPlatDot(p, plat) {
    if (!plat) return '';
    var col = (ADS_STATUS[plat.status] || ADS_STATUS.neutraal)[1];
    return '<span class="ads-pd' + (plat.linked ? '' : ' off') + '" style="background:' + col + '" title="' + (p === 'meta' ? 'Meta' : 'Google') + ': ' + esc(plat.reden || 'geen data') + '">' + (p === 'meta' ? 'M' : 'G') + '</span>';
  }
  function adsCard(c) {
    // COMPACTE rij-kaart (Vincent: de oude kaarten waren te groot). Eén lijn: status-stip · naam ·
    // platform-letters · besteed/resultaten · trend. Veel meer klanten per scherm zichtbaar.
    var s = ADS_STATUS[c.status] || ADS_STATUS.neutraal;
    var dots = adsPlatDot('meta', c.meta) + adsPlatDot('google', c.google);
    var cur = c.currency === 'EUR' ? '€' : (c.currency + ' ');
    var noSpend = !(c.spend > 0);
    var metrics = noSpend
      ? '<span class="ads-c-nospend">geen budget</span>'
      : ('<span class="ads-c-spend"><b>' + cur + (c.spend || 0).toLocaleString('nl-BE', { maximumFractionDigits: 0 }) + '</b></span><span class="ads-c-res">' + (c.results || 0).toLocaleString('nl-BE') + ' res.</span>');
    return '<button class="ads-card' + (noSpend ? ' nospend' : '') + '" data-id="' + esc(c.id) + '" style="--sc:' + s[1] + ';--sb:' + s[2] + '" title="' + esc((ADS_STATUS[c.status] || ADS_STATUS.neutraal)[0]) + '">' +
      '<span class="ads-c-stat" style="background:' + s[1] + '"></span>' +
      '<span class="ads-c-naam">' + esc(c.naam) + '</span>' +
      '<span class="ads-c-pds">' + dots + '</span>' +
      '<span class="ads-c-metrics">' + metrics + '</span>' +
      '<span class="ads-c-trend t-' + c.trend + '">' + adsTrendIcon(c.trend) + '</span>' +
      '</button>';
  }
  function adsFiltered() {
    var f = state.adsF || {}, all = state.ads || [];
    return all.filter(function (c) {
      if (f.hideInactive && !(c.spend > 0)) return false;
      if (f.who === 'mij' && (c.ass_ids || []).indexOf(Number(state.me && state.me.id)) < 0) return false;
      if (f.who && f.who !== 'mij' && f.who !== 'alle') { if ((c.ass_ids || []).indexOf(Number(f.who)) < 0) return false; }
      return true;
    });
  }
  function drawAds(page) {
    if (!state.adsF) state.adsF = { hideInactive: false, who: 'alle' };
    var f = state.adsF, all = state.ads || [];
    var items = adsFiltered();
    var PER = [['last_7d', '7 dagen'], ['last_14d', '14 dagen'], ['last_30d', '30 dagen']];
    var perSel = '<div class="hr-perw">' + PER.map(function (p) { return '<button class="hr-per' + (state.adsPeriod === p[0] ? ' on' : '') + '" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>';
    // owner-filter: unieke assignees uit de klanten (id → initialen)
    var owners = {}; all.forEach(function (c) { (c.ass || []).forEach(function (a) { if (a.id) owners[a.id] = a.i; }); });
    var ownerOpts = '<option value="alle">Alle klanten</option><option value="mij"' + (f.who === 'mij' ? ' selected' : '') + '>Mijn klanten</option>' + Object.keys(owners).map(function (id) { return '<option value="' + id + '"' + (String(f.who) === id ? ' selected' : '') + '>' + esc(owners[id]) + '</option>'; }).join('');
    var legend = '<div class="ads-legend">' + ['goed', 'boven', 'onder', 'probleem', 'neutraal'].map(function (k) { return '<span class="ads-leg"><span class="ads-leg-dot" style="background:' + ADS_STATUS[k][1] + '"></span>' + ADS_STATUS[k][0] + '</span>'; }).join('') + '</div>';
    var toolbar = '<div class="off-toolbar">' + perSel + '<select id="ads-who" class="fin-sel">' + ownerOpts + '</select><label class="off-toggle"><input type="checkbox" id="ads-inact"' + (f.hideInactive ? ' checked' : '') + '> Verberg zonder budget</label></div>';
    var sub = all.length ? (all.length + ' klanten met advertenties · M = Meta, G = Google, kleur = prestatie') : 'Nog geen klanten met een gekoppeld advertentieaccount.';
    var head = '<div class="fin-top"><div class="t-hero"><h1>Adverteerders</h1><div class="sub">' + esc(sub) + '</div></div></div>';
    var grid = items.length ? '<div class="ads-grid">' + items.map(adsCard).join('') + '</div>' : '<div class="empty"><p>Geen klanten voor deze filter.</p></div>';
    page.innerHTML = '<div class="panel active">' + head + toolbar + legend + grid + '</div>';
    Array.prototype.forEach.call(page.querySelectorAll('.hr-per'), function (b) { b.onclick = function () { state.adsPeriod = b.getAttribute('data-p'); renderAdverteren(page); }; });
    if ($('ads-who')) $('ads-who').onchange = function () { state.adsF.who = this.value; drawAds(page); };
    if ($('ads-inact')) $('ads-inact').onchange = function () { state.adsF.hideInactive = this.checked; drawAds(page); };
    Array.prototype.forEach.call(page.querySelectorAll('.ads-card'), function (b) { b.onclick = function () { var c = (state.ads || []).find(function (x) { return x.id === b.getAttribute('data-id'); }); if (c) openAdsDetail(c); }; });
  }
  function openAdsDetail(c) {
    $('modal').classList.add('modal-kd');
    $('scrim').classList.add('tp-mode');   // schermvullend adverteerderdetail (linker + top-menu blijven)
    var plats = c.platforms || [];
    if (!state.adsDetPlat || plats.indexOf(state.adsDetPlat) < 0) state.adsDetPlat = plats[0] || 'meta';
    state.adsProp = null;   // verse voorstellen per platform/klant (voorkomt dat oude campagne-ids blijven hangen)
    var tabs = plats.length > 1 ? '<div class="werv-tabs" style="margin:0 0 14px">' + plats.map(function (p) { return '<button class="werv-tab' + (state.adsDetPlat === p ? ' on' : '') + '" data-plat="' + p + '">' + (p === 'meta' ? 'Meta Ads' : 'Google Ads') + '</button>'; }).join('') + '</div>' : '';
    var plat = c[state.adsDetPlat] || {};
    var ps = ADS_STATUS[plat.status] || ADS_STATUS.neutraal;
    $('modal').innerHTML = '<div class="modal-head br-blue"><span class="bar"></span><div style="flex:1;min-width:0"><div class="sub">Adverteerder · ' + (state.adsDetPlat === 'meta' ? 'Meta' : 'Google') + '</div><h2>' + esc(c.naam) + '</h2></div><span class="kd-phase-pill" style="background:' + ps[1] + '"><span class="kd-pp-dot"></span>' + esc(ps[0]) + '</span><button class="modal-close" id="mclose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body"><div class="ads-rich-wrap">' +
        '<div class="ads-rich-main">' + tabs + '<div id="adsDetBox"><div class="empty" style="padding:50px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>De uitgebreide rapportage wordt opgehaald…</p></div></div></div>' +
        '<aside class="ads-rich-ai" id="adsAIcol"></aside>' +
      '</div></div>';
    $('mclose').onclick = closeModal; $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    Array.prototype.forEach.call($('modal').querySelectorAll('.werv-tab[data-plat]'), function (b) { b.onclick = function () { state.adsDetPlat = b.getAttribute('data-plat'); openAdsDetail(c); }; });
    loadAdsDetail(c);
  }
  async function loadAdsDetail(c) {
    // LINKS: de rijke rapportage (1-op-1 uit het klantenportaal, via teamAdsRich + ads-rich.js).
    var platform = state.adsDetPlat;
    var d; try { d = await api('teamAdsRich', { bedrijf_id: c.id, platform: platform, period: (state.adsPeriod || 'last_30d') }, { timeout: 90000 }); } catch (e) { d = null; }
    if (state.adsDetPlat !== platform) return;   // platform-switch tijdens laden → nieuwste wint
    var box = document.getElementById('adsDetBox');
    if (box) {
      if (!d || !d.ok) { box.innerHTML = '<div class="empty"><p>Kon de uitgebreide rapportage niet laden.</p></div>'; }
      else if (window.S27TeamAdsRich) { try { window.S27TeamAdsRich.render(box, platform, d); } catch (e) { box.innerHTML = '<div class="empty"><p>De rijke weergave kon niet renderen. ' + esc(String(e && e.message || e)) + '</p></div>'; } }
      else { box.innerHTML = '<div class="empty"><p>Rijke weergave niet geladen, herlaad de pagina.</p></div>'; }
    }
    // RECHTS: de AI-specialist-kolom (advies + acties + bespreken).
    renderAdsAIcol(c, platform);
  }
  // Rechter AI-kolom: DRIE stemmen (segmented control). Auto-analyse = de bestaande adviespunten +
  // acties; Meta-specialist en Google-specialist = ECHTE doorlopende chats (teamAgentChat met de
  // geseede agents ag-meta-spec/ag-google-spec + klant-context + per-klant-geheugen).
  function renderAdsAIcol(c, platform) {
    var col = document.getElementById('adsAIcol'); if (!col) return;
    // specialist-gesprekken resetten bij klant-wissel (niet bij periode/platform-wissel → dialoog loopt door).
    // Bij een nieuwe klant ook terug naar de auto-analyse als default-stem.
    if (state.adsVoiceChatBid !== c.id) { state.adsVoiceChatBid = c.id; state.adsVoice = 'auto'; state.adsVoiceChat = { meta: { agent_id: 'ag-meta-spec', msgs: [], busy: false }, google: { agent_id: 'ag-google-spec', msgs: [], busy: false } }; }
    if (!state.adsVoice) state.adsVoice = 'auto';
    var voices = [['auto', 'Auto-analyse', IC.spark], ['meta', 'Meta', IC.chat], ['google', 'Google', IC.chat]];
    var tabs = '<div class="ads-voice-tabs" id="adsVoiceTabs">' + voices.map(function (v) { return '<button class="ads-voice-tab' + (state.adsVoice === v[0] ? ' on' : '') + '" data-voice="' + v[0] + '">' + svgIc(v[2], 13) + '<span>' + v[1] + '</span></button>'; }).join('') + '</div>';
    col.innerHTML = '<div class="ads-aicol-h">' + svgIc(IC.spark, 16) + ' AI-specialisten</div>' + tabs + '<div id="adsVoiceBody"></div>';
    Array.prototype.forEach.call(col.querySelectorAll('.ads-voice-tab'), function (b) { b.onclick = function () { state.adsVoice = b.getAttribute('data-voice'); renderAdsAIcol(c, platform); }; });
    drawAdsVoiceBody(c, platform);
  }
  function drawAdsVoiceBody(c, platform) {
    var box = document.getElementById('adsVoiceBody'); if (!box) return;
    if (state.adsVoice === 'meta' || state.adsVoice === 'google') { drawAdsVoiceChat(c, state.adsVoice); return; }
    // AUTO-ANALYSE: agent-knoppen + vraag-aan-specialist + automatische analyse (per punt voer-uit/niet/bespreek) + concrete-wijzigingen
    box.innerHTML =
      '<div id="adsAgentKnoppen"></div>' +
      '<div class="ads-ask"><div class="ads-ask-row"><input id="ads-ask-q" class="ev-in" placeholder="Vraag de specialist iets…" autocomplete="off"><button class="btn btn-outline btn-sm" id="ads-ask-go">Vraag</button></div><div id="ads-ask-a" class="ads-ask-a"></div></div>' +
      '<div class="ads-an-head">Automatische analyse <span class="ads-an-sub">· per punt: voer uit, sla over of bespreek</span></div>' +
      '<div id="adsAdviesBox" class="ads-advies-box"><div class="kd-ai-loading">AI-advies laden…</div></div>' +
      '<div class="ads-approve"><button class="btn btn-primary btn-sm btn-block" id="ads-propose">' + svgIc(IC.spark, 15) + ' Genereer concrete wijzigingen</button><div id="adsProp" style="margin-top:12px"></div><p class="micro" style="color:var(--ink-4);margin-top:10px">De specialist stelt doorvoerbare wijzigingen voor (budget ±20%, pauzeren/heractiveren). Jij vinkt af en bevestigt; pas dan gaat het via de Ads-API naar de live campagne. Alles wordt gelogd bij de klant.</p></div>';
    var pb = document.getElementById('ads-propose'); if (pb) pb.onclick = function () { adsPropose(c); };
    var ag = document.getElementById('ads-ask-go'); if (ag) ag.onclick = function () { adsAsk(c); };
    var aq = document.getElementById('ads-ask-q'); if (aq) aq.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); adsAsk(c); } };
    loadAgentKnoppenInto('adsAgentKnoppen', 'adverteerders', c);
    loadAdsAdvies(c);
  }
  var ADS_SEND_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  function drawAdsVoiceChat(c, voice) {
    var box = document.getElementById('adsVoiceBody'); if (!box) return;
    var vc = state.adsVoiceChat[voice]; if (!vc) return;
    var naam = voice === 'meta' ? 'Meta Ads-specialist' : 'Google Ads-specialist';
    var ico = voice === 'meta' ? '📘' : '🔍';
    var agent = { naam: naam, ic: ico };
    var intro = '<div class="msg"><div class="av" style="background:var(--s27-purple,#6b4bd1);font-size:18px">' + ico + '</div><div class="bubble"><div class="who">' + esc(naam) + '</div><div class="tx">Ik kijk naar de ' + (voice === 'meta' ? 'Meta' : 'Google') + ' Ads van <b>' + esc(c.naam) + '</b> met de live cijfers en mijn geheugen van eerdere gesprekken en acties. Stel je vraag, of klik op de knop.</div></div></div>';
    var msgs = vc.msgs.map(function (m) { return agentMsgHtml(m, agent); }).join('');
    var typing = vc.busy ? '<div class="msg"><div class="av" style="background:var(--s27-purple,#6b4bd1);font-size:18px">' + ico + '</div><div class="bubble"><div class="tx ag-dots"><span></span><span></span><span></span></div></div></div>' : '';
    var quick = vc.msgs.length ? '' : '<button class="btn btn-outline btn-sm btn-block ads-voice-quick" style="margin:8px 0">' + svgIc(IC.spark, 14) + ' Analyseer dit account</button>';
    box.innerHTML = '<div class="ads-voice-chat"><div class="ads-voice-log" id="adsVoiceLog">' + intro + msgs + typing + '</div>' + quick +
      '<div class="ads-voice-comp"><textarea id="ads-voice-in" rows="1" placeholder="Vraag de ' + (voice === 'meta' ? 'Meta' : 'Google') + '-specialist iets…" ' + (vc.busy ? 'disabled' : '') + '></textarea>' +
      '<button class="ag-send" id="ads-voice-send" ' + (vc.busy ? 'disabled' : '') + ' aria-label="Versturen">' + ADS_SEND_SVG + '</button></div></div>';
    var log = document.getElementById('adsVoiceLog'); if (log) log.scrollTop = log.scrollHeight;
    var inp = document.getElementById('ads-voice-in'), snd = document.getElementById('ads-voice-send');
    var send = function () { var t = (inp && inp.value || '').trim(); if (!t) return; sendAdsVoiceMessage(c, voice, t); };
    if (snd) snd.onclick = send;
    if (inp) { inp.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }; if (!vc.busy) inp.focus(); }
    var q = box.querySelector('.ads-voice-quick'); if (q) q.onclick = function () { sendAdsVoiceMessage(c, voice, voice === 'meta' ? 'Analyseer de Meta Ads van deze klant: wat loopt goed, wat moet beter, en welke 3 concrete acties raad je aan?' : 'Analyseer de Google Ads van deze klant: wat loopt goed, wat moet beter, en welke 3 concrete acties raad je aan?'); };
  }
  function sendAdsVoiceMessage(c, voice, txt) {
    var vc = state.adsVoiceChat[voice]; if (!vc || vc.busy) return;
    txt = (txt || '').trim(); if (!txt) return;
    var hist = vc.msgs.slice();
    vc.msgs.push({ role: 'gebruiker', content: txt });
    vc.busy = true; drawAdsVoiceChat(c, voice);
    var fresh = function () { return state.adsVoice === voice && state.adsVoiceChatBid === c.id; };
    api('teamAgentChat', { agent_id: vc.agent_id, vraag: txt, messages: hist, bedrijf_id: c.id }, { timeout: 90000 }).then(function (r) {
      vc.busy = false;
      if (r && r.ok && r.antwoord) vc.msgs.push({ role: 'agent', content: r.antwoord, bronnen: r.bronnen || [] });
      else vc.msgs.push({ role: 'agent', content: '⚠️ ' + ((r && r.message) || 'Er ging iets mis. Probeer het zo opnieuw.') });
      if (fresh()) drawAdsVoiceChat(c, voice);
    }).catch(function () { vc.busy = false; vc.msgs.push({ role: 'agent', content: '⚠️ Verbinding mislukt. Probeer het zo opnieuw.' }); if (fresh()) drawAdsVoiceChat(c, voice); });
  }
  // AI-advies apart laden zodat het statische detail meteen verschijnt. force=true berekent vers.
  async function loadAdsAdvies(c, force) {
    var platform = state.adsDetPlat, period = state.adsPeriod;
    var box = document.getElementById('adsAdviesBox'); if (!box) return;
    if (force) box.innerHTML = '<div class="kd-ai-loading">Vers advies berekenen…</div>';
    var r; try { r = await api('teamAdsAdvies', { bedrijf_id: c.id, platform: platform, period: period, force: !!force }, { timeout: 70000 }); } catch (e) { r = null; }
    if (state.adsDetPlat !== platform || state.adsPeriod !== period) return;   // gewisseld tijdens het laden
    box = document.getElementById('adsAdviesBox'); if (!box) return;
    if (!r || !r.ok) {
      box.innerHTML = '<p class="micro" style="color:var(--ink-4)">Nog geen AI-advies voor deze periode. <button class="btn btn-outline btn-sm" id="ads-adv-gen" style="margin-left:6px">✦ Genereer nu</button></p>';
      var g = document.getElementById('ads-adv-gen'); if (g) g.onclick = function () { loadAdsAdvies(c, true); };
      return;
    }
    state.adsAdvies = r.analyse_rows || [];
    box.innerHTML = adsAdviesHtml(r);
    wireAdsAdvies(c);
  }
  function adsAdviesAge(t) {
    if (!t) return '';
    var mins = Math.round((Date.now() - t) / 60000);
    if (mins < 60) return mins <= 1 ? 'zojuist' : mins + ' min geleden';
    var h = Math.round(mins / 60); if (h < 24) return h + ' u geleden';
    return Math.round(h / 24) + ' d geleden';
  }
  function adsAdviesHtml(r) {
    var rows = r.analyse_rows || [];
    if (!rows.length) return '<p class="micro" style="color:var(--ink-4)">' + (r.analyse ? aiFmt(r.analyse) : 'De specialist ziet nu geen concrete adviespunten.') + '</p>';
    var prioPill = function (p) { var cls = p === 'hoog' ? 'pr-hoog' : p === 'laag' ? 'pr-laag' : 'pr-mid'; return '<span class="ads-prio ' + cls + '">' + esc(p || 'midden') + '</span>'; };
    var flag = function (st) { return st === 'done' ? '<span class="ads-adv-flag done">✓ uitgevoerd</span>' : (st === 'skip' ? '<span class="ads-adv-flag skip">niet uitvoeren</span>' : ''); };
    return '<div class="ads-advies-list">' + rows.map(function (row, i) {
      var st = row.status || '';
      return '<div class="ads-adv' + (st ? ' adv-' + st : '') + '" data-id="' + esc(row.id) + '" data-i="' + i + '">' +
        '<div class="ads-adv-head"><span class="ads-adv-aspect">' + esc(row.aspect || '-') + '</span>' + prioPill(row.prioriteit) + flag(st) + '</div>' +
        (row.bevinding ? '<div class="ads-adv-bev">' + esc(row.bevinding) + '</div>' : '') +
        '<div class="ads-adv-actie">' + esc(row.actie || '') + '</div>' +
        '<div class="ads-adv-btns">' +
          '<button class="ads-adv-b do' + (st === 'done' ? ' on' : '') + '" data-act="done">✓ Voer uit</button>' +
          '<button class="ads-adv-b skip' + (st === 'skip' ? ' on' : '') + '" data-act="skip">✕ Niet uitvoeren</button>' +
          '<button class="ads-adv-b talk" data-act="talk">' + svgIc(IC.chat, 13) + ' Bespreek</button>' +
        '</div>' +
        '<div class="ads-adv-chat" hidden></div>' +
      '</div>';
    }).join('') + '</div>' +
    '<div class="ads-adv-foot"><button class="btn btn-outline btn-sm" id="ads-adv-regen">↻ Vernieuw advies</button>' + (r._t ? '<span class="micro" style="color:var(--ink-4);margin-left:10px">advies van ' + adsAdviesAge(r._t) + '</span>' : '') + '</div>';
  }
  function wireAdsAdvies(c) {
    var box = document.getElementById('adsAdviesBox'); if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('.ads-adv'), function (el) {
      var id = el.getAttribute('data-id');
      Array.prototype.forEach.call(el.querySelectorAll('.ads-adv-b'), function (b) {
        b.onclick = function () {
          var act = b.getAttribute('data-act');
          if (act === 'talk') { adsAdvTalk(c, el, id); return; }
          adsAdvSetStatus(c, el, id, act);
        };
      });
    });
    var rg = document.getElementById('ads-adv-regen'); if (rg) rg.onclick = function () { loadAdsAdvies(c, true); };
  }
  function adsAdvSetStatus(c, el, id, act) {
    var cur = (state.adsAdvies || []).find(function (x) { return x.id === id; });
    var newSt = (cur && cur.status === act) ? '' : act;   // klik op de actieve knop = markering wissen
    if (cur) cur.status = newSt;
    el.classList.remove('adv-done', 'adv-skip'); if (newSt) el.classList.add('adv-' + newSt);
    var doB = el.querySelector('.ads-adv-b.do'), skB = el.querySelector('.ads-adv-b.skip');
    if (doB) doB.classList.toggle('on', newSt === 'done');
    if (skB) skB.classList.toggle('on', newSt === 'skip');
    var head = el.querySelector('.ads-adv-head'); var oldFlag = head && head.querySelector('.ads-adv-flag'); if (oldFlag) oldFlag.remove();
    if (head && newSt) { var f = document.createElement('span'); f.className = 'ads-adv-flag ' + newSt; f.textContent = newSt === 'done' ? '✓ uitgevoerd' : 'niet uitvoeren'; head.appendChild(f); }
    api('teamAdsItemStatus', { bedrijf_id: c.id, platform: state.adsDetPlat, period: state.adsPeriod, item_id: id, status: newSt }, { timeout: 20000 }).then(function (rr) {
      if (rr && rr.ok) toast(newSt === 'done' ? 'Gemarkeerd als uitgevoerd ✓' : (newSt === 'skip' ? 'Op niet-uitvoeren gezet' : 'Markering gewist'));
      else toast('Kon de markering niet bewaren');
    }).catch(function () { toast('Kon de markering niet bewaren'); });
  }
  function adsAdvTalk(c, el, id) {
    var chat = el.querySelector('.ads-adv-chat'); if (!chat) return;
    if (!chat.hasAttribute('hidden')) { chat.setAttribute('hidden', ''); return; }   // toggle dicht
    chat.removeAttribute('hidden');
    if (chat.getAttribute('data-init')) { var inp0 = chat.querySelector('.adv-q'); if (inp0) inp0.focus(); return; }
    chat.setAttribute('data-init', '1');
    var row = (state.adsAdvies || []).find(function (x) { return x.id === id; }) || {};
    chat.innerHTML = '<div class="ads-adv-chat-row"><input class="ev-in adv-q" placeholder="Vraag de specialist over dit punt…" autocomplete="off"><button class="btn btn-outline btn-sm adv-q-go">Vraag</button></div><div class="adv-a"></div>';
    var inp = chat.querySelector('.adv-q'), go = chat.querySelector('.adv-q-go'), ans = chat.querySelector('.adv-a');
    var ask = function () {
      var q = (inp.value || '').trim(); if (!q) { toast('Typ een vraag'); return; }
      go.disabled = true; go.textContent = 'Bezig…'; ans.innerHTML = '<div class="kd-ai-loading">De specialist denkt na…</div>';
      var vraag = 'Over het adviespunt "' + (row.aspect || '') + '" (' + (row.actie || '') + '): ' + q;
      api('teamAdsAsk', { bedrijf_id: c.id, platform: state.adsDetPlat, period: state.adsPeriod, vraag: vraag }, { timeout: 60000 }).then(function (rr) {
        go.disabled = false; go.textContent = 'Vraag';
        ans.innerHTML = (rr && rr.ok) ? '<div class="ai-plan ads-ask-ans">' + aiFmt(rr.antwoord || '') + '</div>' : '<p class="micro">Kon de vraag niet beantwoorden.</p>';
      }).catch(function () { go.disabled = false; go.textContent = 'Vraag'; ans.innerHTML = '<p class="micro">Lukte even niet.</p>'; });
    };
    go.onclick = ask; inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); ask(); } };
    inp.focus();
  }
  function adsAsk(c) {
    var inp = document.getElementById('ads-ask-q'); var btn = document.getElementById('ads-ask-go');
    var q = (inp && inp.value || '').trim(); if (!q) { toast('Typ een vraag'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Bezig…'; }
    var box = document.getElementById('ads-ask-a'); if (box) box.innerHTML = '<div class="kd-ai-loading">De specialist bekijkt het account…</div>';
    api('teamAdsAsk', { bedrijf_id: c.id, platform: state.adsDetPlat, period: state.adsPeriod, vraag: q }, { timeout: 60000 }).then(function (r) {
      if (btn) { btn.disabled = false; btn.textContent = 'Vraag'; }
      var box = document.getElementById('ads-ask-a'); if (!box) return;
      if (!r || !r.ok) { box.innerHTML = '<p class="micro" style="color:var(--s27-red-ink,#c0392b)">' + esc((r && r.message) || 'Kon de vraag niet beantwoorden.') + '</p>'; return; }
      box.innerHTML = '<div class="ai-plan ads-ask-ans">' + aiFmt(r.antwoord || '') + '</div>';
    }).catch(function () { if (btn) { btn.disabled = false; btn.textContent = 'Vraag'; } var box = document.getElementById('ads-ask-a'); if (box) box.innerHTML = '<p class="micro">Lukte even niet.</p>'; });
  }
  async function adsPropose(c) {
    var btn = document.getElementById('ads-propose');
    if (btn) { btn.disabled = true; btn.textContent = 'AI denkt na…'; }
    var r; try { r = await api('teamAdsPropose', { bedrijf_id: c.id, platform: state.adsDetPlat, period: state.adsPeriod }, { timeout: 60000 }); } catch (e) { r = null; }
    // DOM-refs opnieuw ophalen na de await (de detail kan intussen herrenderd/gesloten zijn)
    btn = document.getElementById('ads-propose');
    if (btn) { btn.disabled = false; btn.textContent = '✦ Genereer concrete wijzigingen'; }
    var box = document.getElementById('adsProp');
    if (!box) return;
    if (!r || !r.ok) { box.innerHTML = '<p class="micro">Kon geen voorstellen maken.</p>'; return; }
    var changes = r.changes || [];
    if (!changes.length) { box.innerHTML = '<p class="micro" style="color:var(--ink-4)">De AI ziet nu geen concrete optimalisaties.</p>'; return; }
    state.adsProp = changes;
    box.innerHTML = '<div class="ads-chs">' + changes.map(function (ch, i) {
      var icon = ch.kind === 'budget' ? '💶' : (ch.kind === 'pause' ? '⏸️' : (ch.kind === 'activate' ? '▶️' : (ch.kind === 'bid' ? '🎯' : '💡')));
      var actie = ch.kind === 'budget' ? ('Budget ' + (ch.pct > 0 ? '+' : '') + ch.pct + '%') : (ch.kind === 'pause' ? 'Pauzeren' : (ch.kind === 'activate' ? 'Heractiveren' : (ch.kind === 'bid' ? 'Bod aanpassen' : 'Advies')));
      return '<label class="ads-ch' + (ch.auto ? '' : ' advisory') + '"><input type="checkbox" class="ads-chk" data-i="' + i + '"' + (ch.auto ? ' checked' : ' disabled') + '><span class="ads-ch-ic">' + icon + '</span><span class="ads-ch-main"><b>' + esc(ch.name || 'Campagne') + '</b> · ' + actie + '<span class="ads-ch-reason">' + esc(ch.reason || '') + '</span>' + (ch.auto ? '' : '<span class="ads-ch-adv">enkel advies, voer zelf door</span>') + '</span></label>';
    }).join('') + '</div><button class="btn btn-primary btn-sm" id="ads-doit" style="margin-top:12px">✓ Geselecteerde doorvoeren</button>';
    var db = document.getElementById('ads-doit'); if (db) db.onclick = function () { adsApply(c); };
  }
  async function adsApply(c) {
    var sel = Array.prototype.slice.call(document.querySelectorAll('#adsProp .ads-chk:checked')).map(function (ch) { return (state.adsProp || [])[Number(ch.getAttribute('data-i'))]; }).filter(Boolean);
    if (!sel.length) { toast('Vink eerst een wijziging aan'); return; }
    if (!confirm('WAARSCHUWING: ' + sel.length + ' live campagne-wijziging(en) doorvoeren. Dit kan je advertentie-budgets wijzigen.\n\nDoorgaan?')) return;
    var btn = document.getElementById('ads-doit'); if (btn) { btn.disabled = true; btn.textContent = 'Doorvoeren…'; }
    var r; try { r = await api('teamAdsApply', { bedrijf_id: c.id, platform: state.adsDetPlat, period: state.adsPeriod, changes: sel }, { timeout: 60000 }); } catch (e) { r = null; }
    // Toast eerst (de wijziging is server-side al doorgevoerd, ook als de modal intussen gesloten is).
    if (r && r.ok) toast(r.applied + ' van ' + r.total + ' doorgevoerd ✓');
    else { toast('Doorvoeren mislukt'); var btn2 = document.getElementById('ads-doit'); if (btn2) { btn2.disabled = false; btn2.textContent = '✓ Geselecteerde doorvoeren'; } }
    var box = document.getElementById('adsProp'); if (!box) return;
    if (r && r.ok) { box.innerHTML = '<div class="ads-results">' + (r.results || []).map(function (x) { return '<div class="ads-res ' + (x.ok ? 'ok' : 'fail') + '">' + (x.ok ? '✓' : '✗') + ' ' + esc(x.name || x.id) + ' · ' + esc(x.kind) + (x.ok ? '' : ' · ' + esc(x.err === 'enkel_advies' ? 'enkel advies' : (x.err || 'mislukt'))) + '</div>'; }).join('') + '</div><p class="micro" style="color:var(--ink-4);margin-top:8px">Doorgevoerd en gelogd bij de klant. De cijfers volgen bij de volgende verversing.</p>'; }
  }

  /* ---- GEZONDHEID (strikt enkel Vincent; server-side gegate op real_me) ---- */
  function gzProg(label, v, max) { var p = Math.min(100, Math.round((Number(v) / (Number(max) || 1)) * 100)); return '<div class="gz-prog"><div class="gz-prog-top"><span>' + esc(label) + '</span><span>' + (v == null ? '-' : v) + ' / ' + max + '</span></div><div class="gz-prog-bar"><i style="width:' + p + '%"></i></div></div>'; }
  async function renderGezondheid(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Gezondheid</h1><div class="sub">Je dag laden…</div></div><div class="empty"><p>Cijfers ophalen…</p></div></div>';
    var d; try { d = await api('teamHealthDag', {}, { timeout: 30000 }); } catch (e) { loadFail(page, 'Gezondheid', function () { renderGezondheid(page); }); return; }
    if (!d || !d.ok) { if (d && d.error === 'forbidden') { page.querySelector('.empty p').textContent = 'Dit is een persoonlijk scherm.'; return; } loadFail(page, 'Gezondheid', function () { renderGezondheid(page); }); return; }
    var v = d.vandaag || {}, vg = d.voortgang || {}, gl = d.gelogd || { week_aantal: 0, week_min: 0, doel: 4 }, settings = d.settings || {};
    var stat = function (n, l, br) { return '<div class="tstat ' + br + '"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; };
    var nz = function (x, suf) { return (x == null) ? '-' : (x.toLocaleString('nl-BE') + (suf || '')); };
    var heeftAH = !!(v.steps != null || v.weight_kg != null || v.resting_hr != null || v.sleep_minutes != null || v.active_energy != null);
    var TYPES = d.types || ['Kracht, bovenlichaam', 'Kracht, onderlichaam', 'Kracht, full body', 'Cardio', 'Wandelband', 'Wandeling / loop', 'Andere'];
    var GEV = d.gevoelens || ['licht', 'normaal', 'zwaar', 'uitgeput'];
    var gevCls = function (g) { return g === 'zwaar' ? 'zw' : g === 'uitgeput' ? 'op' : g === 'licht' ? 'li' : 'no'; };
    var woDat = function (w) { if (w.date) { var p = w.date.split('-'); return parseInt(p[2], 10) + ' ' + MONTHS[parseInt(p[1], 10) - 1]; } if (w.ts) { var x = new Date(w.ts); return x.getDate() + ' ' + MONTHS[x.getMonth()]; } return ''; };
    // ── LOG-kaart (de nieuwe hoofdactie) ──
    var typeChips = TYPES.map(function (t) { return '<button type="button" class="gz-chip" data-v="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
    var gevChips = GEV.map(function (g) { return '<button type="button" class="gz-chip gev ' + gevCls(g) + (g === 'normaal' ? ' on' : '') + '" data-v="' + esc(g) + '">' + esc(g) + '</button>'; }).join('');
    var defDuur = (settings.duur || 40);
    var logCard = '<div class="fincard gz-log" style="margin-top:18px"><div class="section-head"><h2>Log een workout</h2></div>' +
      '<div class="gz-field"><label>Type</label><div class="gz-chips" id="gz-types">' + typeChips + '</div></div>' +
      '<div class="gz-row2">' +
        '<div class="gz-field"><label>Duur</label><div class="gz-dur"><button type="button" data-d="-5">-</button><input id="gz-dur" type="number" inputmode="numeric" value="' + defDuur + '" min="1" max="300"><span>min</span><button type="button" data-d="5">+</button></div></div>' +
        '<div class="gz-field"><label>Hoe voelde het?</label><div class="gz-chips" id="gz-gevoel">' + gevChips + '</div></div>' +
      '</div>' +
      '<div class="gz-field"><label>Hartslag, optioneel (lees af van je Apple Watch)</label><div class="gz-hr"><span class="gz-hr-ic">❤️</span><input id="gz-hravg" type="number" inputmode="numeric" min="30" max="250" placeholder="gem."><span class="gz-hr-sep">/</span><input id="gz-hrmax" type="number" inputmode="numeric" min="30" max="250" placeholder="max"><span class="gz-hr-u">bpm</span></div></div>' +
      '<div class="gz-field"><label>Notitie (optioneel)</label><input id="gz-note" type="text" maxlength="200" placeholder="bv. borst + triceps · of 5 km wandelband"></div>' +
      '<button class="btn btn-primary" id="gz-save" style="margin-top:4px">Workout bewaren</button></div>';
    // ── recent gelogd ──
    var recent = d.workouts_recent || [];
    var recentHtml = recent.length ? recent.map(function (w) {
      return '<div class="gz-wo" data-id="' + esc(w.id) + '" data-date="' + esc(w.date) + '">' +
        '<div class="gz-wo-main"><span class="gz-wo-type">' + esc(w.type) + '</span>' +
        '<span class="gz-wo-meta">' + (w.duur || 0) + ' min · <span class="gz-gev ' + gevCls(w.gevoel) + '">' + esc(w.gevoel || 'normaal') + '</span>' + ((w.avg_hr || w.max_hr) ? ' · <span class="gz-wo-hr">❤️ ' + (w.avg_hr || '-') + (w.max_hr ? '/' + w.max_hr : '') + '</span>' : '') + ' · ' + esc(woDat(w)) + '</span>' +
        (w.note ? '<span class="gz-wo-note">' + esc(w.note) + '</span>' : '') + '</div>' +
        '<button class="gz-wo-del" title="Verwijderen" aria-label="Verwijderen">✕</button></div>';
    }).join('') : '<div class="empty" style="padding:16px"><p>Nog niets gelogd. Voeg hierboven je eerste workout toe.</p></div>';
    var recentCard = '<div class="fincard" style="margin-top:18px"><div class="section-head"><h2>Recent gelogd</h2></div>' + recentHtml + '</div>';
    // ── AI-advies ──
    var aiCard = '<div class="fincard" style="margin-top:18px"><div class="section-head"><h2>Sportadvies</h2></div><div id="gz-ai-out"></div><div style="display:flex;gap:10px;margin-top:6px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="gz-dag">Stel mijn sessie voor</button><button class="btn btn-outline btn-sm" id="gz-week">Weekplan</button></div><p class="micro" style="margin-top:10px;color:var(--ink-4)">Werkt op je gelogde workouts en herstel. Ondersteunend, geen medisch advies.</p></div>';
    // ── voortgang ──
    var vgRows = gzProg('Workouts deze week', gl.week_aantal || 0, gl.doel || 4) + (vg.stappen_7d != null ? gzProg('Stappen (7d gem.)', vg.stappen_7d, vg.stappen_doel || 10000) : '');
    var vgCard = '<div class="fincard" style="margin-top:18px"><div class="section-head"><h2>Deze week</h2></div>' + vgRows + (gl.week_min ? '<p class="micro" style="margin-top:8px;color:var(--ink-4)">' + gl.week_min + ' minuten getraind deze week.</p>' : '') + '</div>';
    // ── ingeplande sportblokken (agenda) ──
    var sessHtml = (d.sessies && d.sessies.length) ? d.sessies.map(function (x) { return '<div class="vl-row"><span class="vl-type">' + esc(x.titel) + '</span><span class="vl-dates">' + esc(x.datum_ymd) + (x.uur ? ' · ' + x.uur : '') + '</span></div>'; }).join('') : '<div class="empty" style="padding:16px"><p>Nog niets ingepland deze week, vraag de AI om een voorstel of zet een sportblok in je agenda.</p></div>';
    var sessCard = '<div class="fincard" style="margin-top:18px"><div class="section-head"><h2>Ingepland deze week</h2></div>' + sessHtml + '</div>';
    // ── Apple Health: optioneel, gedemoveerd ──
    var slaap = v.sleep_minutes != null ? (Math.floor(v.sleep_minutes / 60) + 'u' + String(v.sleep_minutes % 60).padStart(2, '0')) : '-';
    var gwD = (v.weight_kg != null && d.vorige_gewicht != null) ? (v.weight_kg > d.vorige_gewicht ? ' ▲' : v.weight_kg < d.vorige_gewicht ? ' ▼' : '') : '';
    var ahCard;
    if (heeftAH) {
      ahCard = '<div class="fincard" style="margin-top:18px"><div class="section-head"><h2>Apple Health</h2></div><div class="tstats" style="margin-top:0">' +
        stat(nz(v.steps), 'Stappen' + (vg.stappen_doel ? ' / ' + vg.stappen_doel.toLocaleString('nl-BE') : ''), 'br-green') +
        stat(nz(v.active_energy, ' kcal'), 'Actieve energie', 'br-orange') +
        stat(nz(v.resting_hr, ' bpm'), 'Rust-HR', 'br-pink') +
        stat(slaap, 'Slaap', 'br-indigo') +
        stat((v.weight_kg != null ? v.weight_kg + ' kg' : '-') + gwD, 'Gewicht', 'br-blue') +
        '</div><p class="micro" style="margin-top:6px;color:var(--ink-4)">' + (d.gesynct_ts ? 'Gesynct · ' + tijd(d.gesynct_ts) : '') + '</p></div>';
    } else {
      ahCard = '<details class="gz-ah-opt" style="margin-top:18px"><summary>Apple Health koppelen, optioneel</summary><div class="cap-disc" style="margin-top:8px;border-left:3px solid var(--s27-green,#36b36b)"><span>📲</span><span>Je hebt Apple Health <b>niet nodig</b>, je workouts hier loggen volstaat voor het advies en je voortgang. Wil je er tóch je stappen, gewicht of slaap bij? Laat dan je Apple Watch je cardio registreren, of vraag me één keer om het Kortcommando-recept. Geheel vrijblijvend.</span></div></details>';
    }
    page.innerHTML = '<div class="panel active"><div class="t-hero gz-hero"><div><h1>Gezondheid</h1><div class="sub">' + esc(vandaagLang()) + '</div></div><button class="btn btn-outline btn-sm" id="gz-doelen">' + svgIc(IC.gear, 15) + ' Mijn doelen</button></div>' +
      logCard + vgCard + aiCard + recentCard + sessCard + ahCard +
      '<div class="cap-disc"><span>ⓘ</span><span>Dit is ondersteunende leefstijl-info, geen medisch advies. Bij pijn, blessures of symptomen: raadpleeg een arts of kinesist.</span></div></div>';
    $('gz-doelen').onclick = function () { go('gezondheid-doelen'); };
    // log-interactie
    var logState = { type: '', gevoel: 'normaal' };
    var setSel = function (cid, el) { var c = $(cid); Array.prototype.forEach.call(c.querySelectorAll('.gz-chip'), function (x) { x.classList.remove('on'); }); el.classList.add('on'); };
    Array.prototype.forEach.call(page.querySelectorAll('#gz-types .gz-chip'), function (c) { c.onclick = function () { logState.type = c.getAttribute('data-v'); setSel('gz-types', c); }; });
    Array.prototype.forEach.call(page.querySelectorAll('#gz-gevoel .gz-chip'), function (c) { c.onclick = function () { logState.gevoel = c.getAttribute('data-v'); setSel('gz-gevoel', c); }; });
    Array.prototype.forEach.call(page.querySelectorAll('.gz-dur button'), function (b) { b.onclick = function () { var inp = $('gz-dur'); inp.value = Math.min(300, Math.max(1, (parseInt(inp.value, 10) || 0) + parseInt(b.getAttribute('data-d'), 10))); }; });
    $('gz-save').onclick = async function () {
      var dur = parseInt($('gz-dur').value, 10) || 0;
      if (!logState.type) { toast('Kies eerst een type'); return; }
      if (!dur) { toast('Vul een duur in'); return; }
      var avgHr = parseInt($('gz-hravg').value, 10) || 0, maxHr = parseInt($('gz-hrmax').value, 10) || 0;
      var btn = this; btn.disabled = true; btn.textContent = 'Bewaren…';
      var r; try { r = await api('teamHealthLog', { add: 1, type: logState.type, duur: dur, gevoel: logState.gevoel, note: $('gz-note').value || '', avg_hr: avgHr, max_hr: maxHr }); } catch (e) { r = null; }
      btn.disabled = false; btn.textContent = 'Workout bewaren';
      if (!r || !r.ok) { toast('Opslaan mislukt'); return; }
      toast('Workout gelogd 💪'); renderGezondheid(page);
    };
    Array.prototype.forEach.call(page.querySelectorAll('.gz-wo-del'), function (b) {
      b.onclick = async function () {
        var row = b.parentNode; while (row && !row.classList.contains('gz-wo')) row = row.parentNode;
        if (!row) return;
        var id = row.getAttribute('data-id'), dt = row.getAttribute('data-date');
        b.disabled = true;
        var r; try { r = await api('teamHealthLog', { del: id, date: dt }); } catch (e) { r = null; }
        if (!r || !r.ok) { toast('Verwijderen mislukt'); b.disabled = false; return; }
        renderGezondheid(page);
      };
    });
    var vraagAdvies = async function (scope, btn) {
      var out = $('gz-ai-out'); out.innerHTML = '<div class="empty" style="padding:14px"><p>De AI bekijkt je gelogde workouts, doelen en agenda…</p></div>';
      btn.disabled = true;
      var r; try { r = await api('teamHealthAdvies', { scope: scope }, { timeout: 30000 }); } catch (e) { r = null; }
      btn.disabled = false;
      if (!r || !r.ok) { out.innerHTML = '<div class="empty" style="padding:14px"><p>' + (r && r.error === 'no_anthropic_key' ? 'AI-sleutel ontbreekt.' : 'De AI is even niet bereikbaar, probeer zo opnieuw.') + '</p></div>'; return; }
      out.innerHTML = '<div class="ai-plan">' + aiFmt(r.advies) + '</div>';
    };
    $('gz-dag').onclick = function () { vraagAdvies('dag', this); };
    $('gz-week').onclick = function () { vraagAdvies('week', this); };
  }

  async function renderGezondheidDoelen(page) {
    page.innerHTML = '<div class="panel active"><button class="backlink" id="gz-b"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg> Gezondheid</button><div class="t-hero"><h1>Mijn doelen</h1><div class="sub">Laden…</div></div></div>';
    $('gz-b').onclick = function () { go('gezondheid'); };
    var d; try { d = await api('teamHealthSettings', {}); } catch (e) { return; }
    if (!d || !d.ok) { if (d && d.error === 'forbidden') { page.querySelector('.sub').textContent = 'Persoonlijk scherm.'; } return; }
    var s = d.settings || {};
    var doelen = ['Spiervolume + lean blijven', 'Spiervolume opbouwen', 'Lean blijven', 'Onderhoud', 'Cardio-conditie'];
    var slotCb = function (val) { return '<label class="gz-cb"><input type="checkbox" class="gz-slot" value="' + val + '"' + ((s.slots && s.slots.indexOf(val) >= 0) ? ' checked' : '') + '> ' + val + '</label>'; };
    var form = '<div class="setsec"><h3>Trainingsdoelen</h3>' +
      '<div class="vl-grid">' +
      '<div class="field"><label>Hoofddoel</label><select id="gz-doel">' + doelen.map(function (o) { return '<option' + (s.doel === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Dagen per week</label><input type="number" id="gz-dagen" min="1" max="7" value="' + (s.dagen || 4) + '"></div>' +
      '<div class="field"><label>Sessieduur (min)</label><select id="gz-duur">' + [30, 40, 45, 60].map(function (o) { return '<option' + (s.duur === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Kracht / cardio</label><input type="text" id="gz-split" value="' + esc(s.split || '') + '"></div>' +
      '</div>' +
      '<div class="field" style="margin-top:12px"><label>Voorkeurslots om te sporten</label><div class="gz-slots">' + slotCb('10:30') + slotCb('11:00') + slotCb('13:30') + '</div></div>' +
      '<div class="vl-grid" style="margin-top:12px">' +
      '<div class="field"><label>Stappendoel per dag</label><input type="number" id="gz-stappen" min="1000" max="50000" step="500" value="' + (s.stappen_doel || 10000) + '"></div>' +
      '<div class="field"><label>Streefgewicht (kg, optioneel)</label><input type="number" id="gz-gewicht" step="0.1" value="' + (s.streefgewicht != null ? s.streefgewicht : '') + '"></div>' +
      '</div>' +
      '<div class="field" style="margin-top:12px"><label class="gz-cb"><input type="checkbox" id="gz-wb"' + (s.wandelband ? ' checked' : '') + '> Ik gebruik een wandelband (wandelen tijdens licht werk)</label></div>' +
      '<div class="field"><label class="gz-cb"><input type="checkbox" id="gz-rem"' + (s.reminders ? ' checked' : '') + '> Stuur me reminders voor mijn sportmomenten</label></div>' +
      '<div class="field" style="margin-top:12px"><label>Thuisadres (voor reistijd-inschatting, optioneel)</label><input type="text" id="gz-thuis" value="' + esc(s.thuisadres || '') + '" placeholder="Straat, gemeente"></div>' +
      '<button class="btn btn-primary" id="gz-save" style="margin-top:18px">Doelen opslaan</button></div>' +
      '<div class="cap-disc"><span>ⓘ</span><span>Ondersteunende leefstijl-info, geen medisch advies.</span></div>';
    page.innerHTML = '<div class="panel active"><button class="backlink" id="gz-b2"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg> Gezondheid</button><div class="t-hero"><h1>Mijn doelen</h1><div class="sub">Stel je fitnessdoelen in, de AI-coach houdt hier rekening mee.</div></div>' + form + '</div>';
    $('gz-b2').onclick = function () { go('gezondheid'); };
    $('gz-save').onclick = async function () {
      this.disabled = true; this.textContent = 'Opslaan…';
      var slots = []; Array.prototype.forEach.call(document.querySelectorAll('.gz-slot'), function (c) { if (c.checked) slots.push(c.value); });
      var payload = { save: true, doel: $('gz-doel').value, dagen: $('gz-dagen').value, duur: $('gz-duur').value, split: $('gz-split').value, slots: slots, stappen_doel: $('gz-stappen').value, streefgewicht: $('gz-gewicht').value, wandelband: $('gz-wb').checked, reminders: $('gz-rem').checked, thuisadres: $('gz-thuis').value };
      var r; try { r = await api('teamHealthSettings', payload); } catch (e) { r = null; }
      if (r && r.ok) { toast('Doelen opgeslagen ✓'); go('gezondheid'); } else { toast('Opslaan mislukt'); this.disabled = false; this.textContent = 'Doelen opslaan'; }
    };
  }

  /* ---- COLLEGA'S ---- */
  async function renderCollega(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Het team</h1><div class="sub">Klik op een collega om hun planning te bekijken, zo zie je wie ruimte heeft om werk over te nemen.</div></div><div class="empty"><p>Teamleden laden…</p></div></div>';
    var g; try { g = await api('teamGroups', {}); } catch (e) { g = null; }
    if (state.route !== 'collega') return;   // navigatie-guard: niet renderen als de gebruiker al weg is
    state.teamGroups = (g && g.ok && Array.isArray(g.groups)) ? g.groups : [];
    drawCollega(page);
  }
  function drawCollega(page) {
    page = page || $('page');
    var isAdmin = !!(state.perms && state.perms.admin);
    var byMember = {};
    (state.teamGroups || []).forEach(function (grp) { (grp.members || []).forEach(function (mid) { (byMember[mid] = byMember[mid] || []).push(grp.naam); }); });
    var sub = isAdmin
      ? 'Klik op een collega voor hun planning. Met ⚙ beheer je in welke teams iemand zit, gesynct met ClickUp.'
      : 'Klik op een collega om hun planning te bekijken, zo zie je wie ruimte heeft om werk over te nemen.';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Het team</h1><div class="sub">' + esc(sub) + '</div></div>' +
      '<div class="tmembers" style="margin-top:18px">' + state.roster.map(function (m) {
        var teams = (byMember[m.id] || []).map(function (n) { return '<span class="tm-team">' + esc(n) + '</span>'; }).join('');
        var rol = teams || (m.pool ? 'Content creator' : 'Team');
        var gear = isAdmin ? '<button class="tm-gear" data-mid="' + m.id + '" title="Teams beheren" aria-label="Teams beheren">' + svgIc(IC.gear, 15) + '</button>' : '';
        return '<button class="tmember" data-id="' + m.id + '"><span class="av">' + esc(initialen(m.naam)) + '</span><div class="tm-info"><div class="nm">' + esc(voornaam(m.naam)) + '</div><div class="rol">' + rol + '</div></div>' + gear + '</button>';
      }).join('') + '</div></div>';
    Array.prototype.forEach.call(page.querySelectorAll('.tmember'), function (b) {
      b.onclick = function () { state.route = 'collega'; renderNav(); $('crumb').textContent = "Collega's"; renderPlanning($('page'), Number(b.getAttribute('data-id'))); };
    });
    Array.prototype.forEach.call(page.querySelectorAll('.tm-gear'), function (s) {
      s.onclick = function (e) { e.stopPropagation(); e.preventDefault(); manageTeams(Number(s.getAttribute('data-mid'))); };
    });
  }
  // Admin: beheer in welke ClickUp-teams (user-groups) een collega zit. Wijzigingen gaan meteen naar ClickUp.
  function manageTeams(mid) {
    var m = (state.roster || []).find(function (x) { return x.id === mid; }); if (!m) return;
    var groups = state.teamGroups || [];
    var chipsHtml = function () {
      if (!groups.length) return '<p class="micro" style="color:var(--ink-4)">Er zijn nog geen teams in ClickUp. Maak ze aan in ClickUp (Instellingen → Teams), dan verschijnen ze hier.</p>';
      return '<div class="mt-chips">' + groups.map(function (gr) {
        var on = (gr.members || []).indexOf(mid) >= 0;
        return '<button class="mt-chip' + (on ? ' on' : '') + '" data-gid="' + esc(gr.id) + '">' + esc(gr.naam) + '</button>';
      }).join('') + '</div>';
    };
    showAiPop('Teams van ' + voornaam(m.naam), '<p class="micro" style="color:var(--ink-4);margin:0 0 12px">Vink de teams aan waar <b>' + esc(voornaam(m.naam)) + '</b> lid van is. Elke wijziging gaat meteen naar ClickUp.</p>' + chipsHtml() + '<div id="mt-stat" class="micro" style="margin-top:12px;color:var(--ink-4)"></div>', { compact: true });
    Array.prototype.forEach.call(document.querySelectorAll('#tpAiPop .mt-chip'), function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-gid'); var action = b.classList.contains('on') ? 'rem' : 'add';
        var stat = document.getElementById('mt-stat'); if (stat) stat.textContent = 'Bezig met synchroniseren…';
        b.disabled = true;
        api('teamGroupMember', { group_id: gid, member_id: mid, action: action }).then(function (r) {
          b.disabled = false;
          if (!r || !r.ok) { if (stat) stat.textContent = (r && r.message) || 'Wijzigen mislukt.'; toast((r && r.message) || 'Wijzigen mislukt'); return; }
          var gr = (state.teamGroups || []).find(function (x) { return String(x.id) === String(gid); });
          if (gr) { gr.members = gr.members || []; var i = gr.members.indexOf(mid); if (action === 'add' && i < 0) gr.members.push(mid); if (action === 'rem' && i >= 0) gr.members.splice(i, 1); }
          b.classList.toggle('on');
          if (stat) stat.textContent = (action === 'add' ? 'Toegevoegd aan ' : 'Verwijderd uit ') + (gr ? gr.naam : 'team') + ' ✓ (gesynct met ClickUp)';
          toast('Bijgewerkt in ClickUp ✓');
          drawCollega();   // ververs de team-chips op de achterliggende pagina
        }).catch(function () { b.disabled = false; if (stat) stat.textContent = 'Wijzigen mislukt.'; });
      };
    });
  }

  /* ---- OFFERTEAANVRAGEN (CRM, ClickUp-lijst) ---- */
  async function renderOffertes(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Offerteaanvragen</h1><div class="sub">Alle offertes uit ClickUp, status, klant, contact en de PandaDoc-link op één plek.</div></div><div class="empty"><p>Offertes ophalen…</p></div></div>';
    var d; try { d = await api('teamOffertes', {}, { timeout: 45000 }); } catch (e) { d = null; }
    if (state.route !== 'offertes') return;
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = (d && d.error === 'forbidden_role') ? 'Geen toegang voor jouw rol.' : 'Kon de offertes niet laden.'; return; }
    state.offertes = d.items || [];
    state.offStatussen = d.statussen || [];
    if (!state.offF) state.offF = { who: 'mij', done: false, q: '' };
    drawOffertes(page);
  }
  function offFinished(o) { return o.status_type === 'done' || o.status_type === 'closed' || /afgerond|gewonnen|verloren|gefactureerd|geannuleerd|afgewerkt/i.test(o.status_raw || ''); }
  function offMine(o) { return (o.assignee_ids || []).indexOf(Number(state.me && state.me.id)) >= 0; }
  function offRow(o) {
    var avs = (o.assignees || []).map(function (a) { return '<span class="sr-av" style="background:' + (a.c || 'var(--ink-4)') + '">' + esc(a.i || '?') + '</span>'; }).join('');
    return '<div class="off-row" data-id="' + esc(o.id) + '" title="' + esc((o.extra || 'Geen omschrijving').slice(0, 280)) + '">' +
      '<span class="off-dot" style="background:' + esc(o.status_color || '#9e919e') + '"></span>' +
      '<span class="off-nm2">' + esc(o.naam) + '</span>' +
      '<span class="off-bd">' + esc(o.bedrijf || '-') + (o.contact ? ' · ' + esc(o.contact) : '') + '</span>' +
      '<span class="off-bud">' + (o.budget ? '€' + esc(o.budget) : '') + '</span>' +
      '<span class="off-status" style="--sc:' + esc(o.status_color || '#9e919e') + '">' + esc(stLabel(o.status_raw) || o.status || '') + '</span>' +
      '<span class="off-avs">' + avs + '</span>' +
      '</div>';
  }
  function offFiltered() {
    var f = state.offF || {}, items = state.offertes || [];
    return items.filter(function (o) {
      if (!f.done && offFinished(o)) return false;
      if (f.who === 'mij' && !offMine(o)) return false;
      if (f.who && f.who !== 'mij' && f.who !== 'alle') { if ((o.assignee_ids || []).indexOf(Number(f.who)) < 0) return false; }
      if (f.q) { var ql = f.q.toLowerCase(); if ((o.naam + ' ' + o.bedrijf + ' ' + o.contact).toLowerCase().indexOf(ql) < 0) return false; }
      return true;
    });
  }
  function drawOffertes(page) {
    var f = state.offF || {};
    var items = offFiltered();
    var mineN = (state.offertes || []).filter(function (o) { return !offFinished(o) && offMine(o); }).length;
    var alleN = (state.offertes || []).filter(function (o) { return !offFinished(o); }).length;
    var whoTabs = '<div class="werv-tabs" style="margin-bottom:0"><button class="werv-tab' + (f.who === 'mij' ? ' on' : '') + '" data-who="mij">Mijn offertes<span class="werv-n">' + mineN + '</span></button><button class="werv-tab' + (f.who === 'alle' ? ' on' : '') + '" data-who="alle">Alle<span class="werv-n">' + alleN + '</span></button></div>';
    // persoonsfilter: iedereen die op ≥1 offerte als assignee staat (zodat ook Ilke's offertes apart te bekijken zijn)
    var ownerIds = {}; (state.offertes || []).forEach(function (o) { (o.assignee_ids || []).forEach(function (id) { ownerIds[id] = 1; }); });
    var rosterMap = {}; (state.roster || []).forEach(function (m) { rosterMap[m.id] = m.naam; });
    var personSel = '<select class="ev-in off-person" id="off-person"><option value="">Filter op persoon…</option>' + Object.keys(ownerIds).map(function (id) { return '<option value="' + id + '"' + (String(f.who) === id ? ' selected' : '') + '>' + esc(rosterMap[id] || ('ID ' + id)) + '</option>'; }).join('') + '</select>';
    var doneToggle = '<label class="off-toggle"><input type="checkbox" id="off-done"' + (f.done ? ' checked' : '') + '> Toon afgeronde</label>';
    var search = '<div class="acc-search" style="margin:0;flex:1;min-width:180px"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="off-q" placeholder="Zoek op offerte, klant…" autocomplete="off" value="' + esc(f.q || '') + '"></div>';
    var rows = items.length ? '<div class="off-rows">' + items.map(offRow).join('') + '</div>' : '<div class="empty"><p>' + (f.who === 'mij' ? 'Geen lopende offertes op jouw naam. Zet de filter op “Alle”.' : 'Geen offertes gevonden.') + '</p></div>';
    page.innerHTML = '<div class="panel active"><div class="fin-top"><div class="t-hero"><h1>Offerteaanvragen</h1><div class="sub">Klik een offerte voor het volledige traject, de vraag en de AI-opvolging.</div></div></div>' +
      '<div class="off-toolbar">' + whoTabs + personSel + doneToggle + search + '</div>' + rows + '</div>';
    Array.prototype.forEach.call(page.querySelectorAll('.werv-tab[data-who]'), function (b) { b.onclick = function () { state.offF.who = b.getAttribute('data-who'); drawOffertes(page); }; });
    if ($('off-person')) $('off-person').onchange = function () { state.offF.who = this.value || 'alle'; drawOffertes(page); };
    if ($('off-done')) $('off-done').onchange = function () { state.offF.done = this.checked; drawOffertes(page); };
    var qi = $('off-q'); if (qi) qi.oninput = function () { var s = this.selectionStart; state.offF.q = this.value; drawOffertes(page); var n = $('off-q'); if (n) { n.focus(); try { n.setSelectionRange(s, s); } catch (e) { } } };
    Array.prototype.forEach.call(page.querySelectorAll('.off-row'), function (r) { r.onclick = function () { var o = (state.offertes || []).find(function (x) { return x.id === r.getAttribute('data-id'); }); if (o) openOfferte(o); }; });
  }
  /* ---- Offerte-traject (Econstruct-stijl: fasen + vraag + mailverkeer + AI-acties) ---- */
  function offStepper(o) {
    var stats = (state.offStatussen || []);
    if (!stats.length) return '';
    var curLow = (o.status_raw || '').toLowerCase();
    var curIdx = -1; stats.forEach(function (s, i) { if (s.status.toLowerCase() === curLow) curIdx = i; });
    return '<div class="kd-steps">' + stats.map(function (s, i) {
      var st = i < curIdx ? 'done' : (i === curIdx ? 'now' : 'todo');
      return '<button class="kd-step ' + st + '" data-st="' + esc(s.status) + '" style="--sc:' + esc(s.color || '#9e919e') + '" title="Zet op: ' + esc(stLabel(s.status)) + '"><span class="kd-step-dot">' + (st === 'done' ? KD_CHECK : '') + '</span><span class="kd-step-lbl">' + esc(stLabel(s.status)) + '</span></button>';
    }).join('') + '</div>';
  }
  function reloadOfferteDetail(id) {
    api('teamOffertes', { refresh: true }).then(function (r) { if (r && r.ok) { state.offertes = r.items; var o = (r.items || []).find(function (x) { return x.id === id; }); if (o && $('scrim').classList.contains('show')) openOfferte(o); } });
  }
  function openOfferte(o) {
    curProject = null;
    $('modal').classList.add('modal-kd');
    $('scrim').classList.add('tp-mode');   // schermvullend (linker + top-menu blijven), zoals de sollicitaties
    var faseNaam = stLabel(o.status_raw) || o.status || 'Offerte';
    // contacten 1-op-1 uit ClickUp (meerdere mogelijk) + ontkoppel-kruisje; bedrijf; meeting-koppeling.
    var contactChips = (o.contacten && o.contacten.length)
      ? o.contacten.map(function (c) {
          if (c.via_bedrijf) return '<span class="off-kchip viab" title="Contact van het bedrijf (niet rechtstreeks op de offerte)">👤 ' + esc(c.naam || 'contact') + ' <small>via bedrijf</small></span>';
          return '<span class="off-kchip on">👤 ' + esc(c.naam || 'contact') + '<button class="off-kx" data-rem="contact" data-id="' + esc(c.id) + '" title="Ontkoppelen">×</button></span>';
        }).join('')
      : '<span class="off-kchip warn">👤 geen contactpersoon gekoppeld</span>';
    var meetN = (o.meeting_ids || []).length;
    var koppel = '<div class="off-koppel">' +
      '<span class="off-kchip' + (o.bedrijf ? ' on' : '') + '">🏢 ' + (o.bedrijf ? esc(o.bedrijf) : 'geen bedrijf') + '</span>' +
      contactChips +
      (meetN ? '<span class="off-kchip on">📅 ' + meetN + ' meeting' + (meetN > 1 ? 's' : '') + '</span>' : '') +
      (o.budget ? '<span class="off-kchip on">€ ' + esc(o.budget) + '</span>' : '') +
      '<button class="off-kadd" data-add="contact">+ contact</button>' +
      '<button class="off-kadd" data-add="meeting">+ meeting</button>' +
      (o.bedrijf ? '' : '<button class="off-kadd" data-add="bedrijf">+ bedrijf</button>') + '</div>';
    var acts = '<div class="kd-acts">' +
      '<button class="btn btn-primary btn-sm off-a" data-a="opstarten">' + svgIc(IC.rocket, 15) + ' Project opstarten</button>' +
      '<button class="btn btn-outline btn-sm off-a" data-a="opvolg">' + svgIc(IC.mail, 15) + ' Opvolg-mail sturen</button>' +
      '<button class="btn btn-outline btn-sm off-a" data-a="meeting">' + svgIc(IC.cal, 15) + ' Meeting inplannen</button>' +
      (o.pandadoc_link ? '<a class="btn btn-outline btn-sm" href="' + esc(o.pandadoc_link) + '" target="_blank" rel="noopener">📄 PandaDoc ↗</a>' : '') +
      (o.url ? '<a class="btn btn-outline btn-sm" href="' + esc(o.url) + '" target="_blank" rel="noopener">ClickUp ↗</a>' : '') +
      '</div>';
    $('modal').innerHTML = '<div class="modal-head br-green"><span class="bar"></span><div style="flex:1;min-width:0"><div class="sub">Offerte</div><h2>' + esc(o.naam || 'Offerte') + '</h2></div><span class="kd-phase-pill"><span class="kd-pp-dot"></span>Fase: ' + esc(faseNaam) + '</span><button class="modal-close" id="mclose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body">' +
      '<div class="kd-steps-wrap">' + offStepper(o) + '</div>' +
      '<div class="kd-grid2"><div class="kd-main">' +
        '<div class="kd-fasecard"><span class="kd-fase-tag">De vraag</span><p class="kd-fase-desc" style="margin-top:10px;white-space:pre-wrap">' + esc(o.extra || 'Geen omschrijving toegevoegd.') + '</p>' + koppel + '<div class="kd-fase-actsh" style="margin-top:14px">✦ Acties</div>' + acts + '</div>' +
      '</div><div class="kd-side"><div class="kd-sec kd-tl-sec"><h3>Mailverkeer & activiteit</h3><div id="offHist" class="kd-timeline"><div class="kd-ai-loading">Laden…</div></div></div></div></div>' +
      '</div>';
    $('mclose').onclick = closeModal; $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    Array.prototype.forEach.call($('modal').querySelectorAll('.kd-step'), function (b) { b.onclick = function () { setOffStatus(o, b.getAttribute('data-st')); }; });
    Array.prototype.forEach.call($('modal').querySelectorAll('.off-a'), function (b) { b.onclick = function () { var a = b.getAttribute('data-a'); if (a === 'opvolg') offMailPopup(o); else if (a === 'opstarten') offProjectStart(o); else if (a === 'meeting') { closeModal(); go('meetings'); toast('Plan de meeting en koppel ze aan deze offerte.'); } }; });
    // koppelen vanuit het detail (contact / meeting / bedrijf) → doorzoekbare picker → sync ClickUp
    Array.prototype.forEach.call($('modal').querySelectorAll('.off-kadd'), function (b) { b.onclick = function () {
      var kind = b.getAttribute('data-add'); var titel = kind === 'contact' ? 'Contactpersoon koppelen' : kind === 'meeting' ? 'Meeting koppelen' : 'Bedrijf koppelen';
      koppelPicker(kind === 'bedrijf' ? 'bedrijf' : kind, titel, function (it) { api('teamOfferteKoppel', { offerte_id: o.id, kind: kind, target_id: it.id, action: 'add' }).then(function (r) { if (r && r.ok) { toast('Gekoppeld ✓ (gesynct met ClickUp)'); closeAiPop(); reloadOfferteDetail(o.id); } else toast((r && r.message) || 'Koppelen mislukt'); }); });
    }; });
    Array.prototype.forEach.call($('modal').querySelectorAll('.off-kx'), function (b) { b.onclick = function (e) { e.stopPropagation(); var kind = b.getAttribute('data-rem'), id = b.getAttribute('data-id'); api('teamOfferteKoppel', { offerte_id: o.id, kind: kind, target_id: id, action: 'rem' }).then(function (r) { if (r && r.ok) { toast('Ontkoppeld ✓'); reloadOfferteDetail(o.id); } else toast('Ontkoppelen mislukt'); }); }; });
    loadOffHist(o);
  }
  // Generieke doorzoekbare koppel-picker (contact/offerte/bedrijf/meeting). onPick({id,naam}).
  function koppelPicker(kind, titel, onPick) {
    showAiPop(titel, '<input id="kp-q" class="ai-input" placeholder="Typ om te zoeken…" autocomplete="off"><div id="kp-res" class="kp-res"><div class="kd-ai-loading">Typ om te zoeken…</div></div>', { compact: true });
    var inp = $('kp-q'); if (inp) inp.focus();
    var tmr = null, seq = 0;
    var run = function () {
      var q = (inp && inp.value || '').trim(); var my = ++seq; var box = $('kp-res'); if (box) box.innerHTML = '<div class="kd-ai-loading">Zoeken…</div>';
      api('teamKoppelSearch', { kind: kind, q: q }).then(function (r) {
        if (my !== seq) return; var box = $('kp-res'); if (!box) return;
        var items = (r && r.ok && r.items) || [];
        if (!items.length) { box.innerHTML = '<div class="micro" style="padding:10px;color:var(--ink-4)">Niets gevonden.</div>'; return; }
        box.innerHTML = items.map(function (it) { return '<button class="kp-item" data-id="' + esc(it.id) + '" data-naam="' + esc(it.naam) + '"><span class="kp-nm">' + esc(it.naam) + '</span>' + (it.sub ? '<span class="kp-sub">' + esc(it.sub) + '</span>' : '') + '</button>'; }).join('');
        Array.prototype.forEach.call(box.querySelectorAll('.kp-item'), function (b) { b.onclick = function () { onPick({ id: b.getAttribute('data-id'), naam: b.getAttribute('data-naam') }); }; });
      }).catch(function () { var box = $('kp-res'); if (box) box.innerHTML = '<div class="micro" style="padding:10px;color:var(--ink-4)">Zoeken lukte even niet.</div>'; });
    };
    if (inp) inp.oninput = function () { clearTimeout(tmr); tmr = setTimeout(run, 200); };
    run();
  }
  // [13] Project opstarten → maakt de Drive-mapstructuur (klant → jaar → project → hoofdtaken) in de gedeelde S27-drive. Idempotent.
  function offProjectStart(o) {
    var jaar = new Date().getFullYear();
    showAiPop('Project opstarten', '<p class="micro" style="color:var(--ink-4);margin:0 0 14px;max-width:620px">Maakt de mapstructuur aan in de gedeelde <b>S27 - Drive</b>: <b>' + esc(o.bedrijf || 'klant') + '</b> → ' + jaar + ' → <b>' + esc(o.naam || 'project') + '</b>, met een map per hoofdtaak (de subtaken van deze offerte). Opnieuw klikken maakt geen dubbele mappen, het synct enkel nieuwe hoofdtaken bij. De projectmap-link komt op de offerte te staan, de klant-map-link op het bedrijf.</p><button class="btn btn-primary btn-sm" id="ps-go">' + svgIc(IC.layers, 15) + ' Mapstructuur aanmaken</button><div id="ps-out" style="margin-top:16px"></div>');
    var btn = document.getElementById('ps-go');
    if (btn) btn.onclick = function () {
      btn.disabled = true; btn.textContent = 'Bezig met aanmaken…';
      var out = document.getElementById('ps-out'); if (out) out.innerHTML = '<div class="kd-ai-loading">Mappen aanmaken in S27 - Drive…</div>';
      api('teamProjectStart', { task_id: o.id }, { timeout: 60000 }).then(function (r) {
        btn.disabled = false; btn.textContent = '↻ Opnieuw uitvoeren';
        out = document.getElementById('ps-out'); if (!out) return;
        if (!r || !r.ok) { out.innerHTML = '<p class="micro" style="color:var(--s27-red-ink,#c0392b)">' + esc((r && r.message) || 'Aanmaken mislukt. Probeer zo opnieuw.') + '</p>'; return; }
        var tm = (r.taakmappen || []).map(function (x) { return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.naam) + '</a></li>'; }).join('');
        out.innerHTML = '<div class="ps-done"><p style="font-family:var(--font-display);font-weight:800;color:var(--s27-green-ink,#0e6b40);margin:0 0 10px">✓ Mapstructuur klaar' + (r.created_company ? ' · nieuwe klant-map aangemaakt' : '') + '</p>' +
          '<a class="btn btn-outline btn-sm" href="' + esc(r.project_folder_url) + '" target="_blank" rel="noopener">📂 Projectmap openen ↗</a> ' +
          '<a class="btn btn-outline btn-sm" href="' + esc(r.company_folder_url) + '" target="_blank" rel="noopener">🏢 Klant-map ↗</a>' +
          (tm ? '<p class="micro" style="margin:14px 0 5px;color:var(--ink-4)">Map per hoofdtaak:</p><ul class="ps-list">' + tm + '</ul>' : '<p class="micro" style="margin-top:12px;color:var(--ink-4)">Geen subtaken op deze offerte gevonden, dus enkel de projectmap is gemaakt. Voeg subtaken (hoofdtaken) toe en klik opnieuw om er mappen voor bij te maken.</p>') + '</div>';
        toast('Projectmappen aangemaakt ✓');
      }).catch(function () { btn.disabled = false; btn.textContent = '↻ Opnieuw uitvoeren'; var o2 = document.getElementById('ps-out'); if (o2) o2.innerHTML = '<p class="micro">Aanmaken mislukt.</p>'; });
    };
  }
  async function setOffStatus(o, status) {
    var r; try { r = await api('teamStatus', { task_id: o.id, status: status }); } catch (e) { r = null; }
    if (!r || !r.ok) { toast('Fase wijzigen mislukt'); return; }
    o.status_raw = status; if (r.status) o.status = r.status;
    var sdef = (state.offStatussen || []).filter(function (x) { return x.status.toLowerCase() === status.toLowerCase(); })[0]; if (sdef) o.status_color = sdef.color;
    toast('Fase: ' + stLabel(status));
    if ($('scrim').classList.contains('show') && document.getElementById('offHist')) openOfferte(o);
  }
  async function loadOffHist(o) {
    var r; try { r = await api('teamProjectChat', { task_id: o.id }); } catch (e) { r = null; }
    var box = document.getElementById('offHist'); if (!box) return;
    var cs = (r && r.ok && r.comments) ? r.comments : [];
    if (!cs.length) { box.innerHTML = '<p class="micro" style="color:var(--ink-4)">Nog geen mailverkeer of notities. Verzonden opvolg-mails verschijnen hier.</p>'; return; }
    box.innerHTML = cs.slice().reverse().map(function (c) {
      var src = kdTlSource(c.tekst || ''); var titel = kdTlTitle(c.tekst || '');
      var body = (c.tekst || '').replace(/^[^\n\[]*\[[^\]]+\]\s*/, '').trim();
      return '<div class="kd-tl-item ' + src.cls + '"><span class="kd-tl-ic">' + src.ic + '</span><div class="kd-tl-body"><div class="kd-tl-top"><span class="kd-tl-titel">' + esc(titel) + '</span><span class="kd-tl-badge ' + src.cls + '">' + src.lbl + '</span></div>' + (body ? '<div class="kd-tl-txt">' + esc(body.length > 280 ? body.slice(0, 280) + '…' : body).replace(/\n/g, '<br>') + '</div>' : '') + '<div class="kd-tl-meta">' + esc(c.auteur || 'Studio 27') + (c.datum ? ' · ' + esc(kdDatum(c.datum)) : '') + '</div></div></div>';
    }).join('');
  }
  async function offMailPopup(o) {
    showAiPop('Opvolg-mail', '<div class="kd-ai-loading">AI schrijft een opvolg-mail in S27-tone…</div>');
    var r; try { r = await api('teamOfferteMail', { task_id: o.id, action: 'preview' }); } catch (e) { r = null; }
    var body = document.querySelector('#tpAiPop .tp-aipop-body'); if (!body) return;
    if (!r || !r.ok) { body.innerHTML = '<p class="micro">Kon geen opvolg-mail maken.</p>'; return; }
    var heeftMail = !!r.email;
    body.innerHTML = '<div class="kd-mailto">Naar: <b>' + esc(r.email || 'geen e-mailadres') + '</b><br>Onderwerp: ' + esc(r.onderwerp || '') + '</div>' +
      '<textarea id="offMailTa" class="ai-input" rows="10">' + esc(r.tekst || '') + '</textarea>' +
      '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary btn-sm" id="offMailSend"' + (heeftMail ? '' : ' disabled') + '>Verzenden</button><button class="btn btn-outline btn-sm" id="offMailCancel">Annuleren</button></div>' +
      (heeftMail ? '' : '<p class="micro" style="margin-top:8px;color:#c0392b">Geen e-mailadres bij het contact. Vul dit eerst in ClickUp in.</p>');
    document.getElementById('offMailCancel').onclick = closeAiPop;
    var sb = document.getElementById('offMailSend');
    if (sb) sb.onclick = async function () { this.disabled = true; this.textContent = 'Versturen…'; var tekst = (document.getElementById('offMailTa') || {}).value || ''; var s; try { s = await api('teamOfferteMail', { task_id: o.id, action: 'send', tekst: tekst }); } catch (e) { s = null; } if (s && s.ok && s.sent) { closeAiPop(); toast('Opvolg-mail verzonden ✓'); } else { toast(s && s.error === 'geen_email' ? 'Geen e-mailadres' : 'Versturen mislukt'); this.disabled = false; this.textContent = 'Verzenden'; } };
  }
  /* ---- MEETINGS (CRM, ClickUp-lijst), koppelbaar aan offertes ---- */
  async function renderMeetings(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Meetings</h1><div class="sub">Alle meetings uit ClickUp, koppel ze aan de juiste offerte en voeg info toe.</div></div><div class="empty"><p>Meetings ophalen…</p></div></div>';
    var res; try { res = await Promise.all([api('teamMeetings', {}, { timeout: 45000 }), api('teamOffertes', {}, { timeout: 45000 }).catch(function () { return null; })]); } catch (e) { res = [null, null]; }
    if (state.route !== 'meetings') return;
    var d = res[0], od = res[1];
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = (d && d.error === 'forbidden_role') ? 'Geen toegang voor jouw rol.' : 'Kon de meetings niet laden.'; return; }
    state.meetings = d.items || []; state.offForLink = (od && od.ok) ? od.items : [];
    drawMeetings(page, '');
  }
  function mtgRow(m) {
    var typeChip = m.type ? '<span class="mtg-type mtg-type-' + m.type.toLowerCase() + '">' + esc(m.type) + '</span>' : '';
    var hasOff = (m.offerte_ids || []).length, hasC = (m.contact_ids || []).length;
    var badges = '<span class="mtg-cb' + (m.bedrijf_id ? ' on' : '') + '" title="' + (m.bedrijf ? 'Bedrijf: ' + esc(m.bedrijf) : 'Geen bedrijf') + '">🏢</span>' +
      '<span class="mtg-cb' + (hasOff ? ' on' : '') + '" title="' + (hasOff ? 'Gekoppeld aan offerte' : 'Geen offerte') + '">📄</span>' +
      '<span class="mtg-cb' + (hasC ? ' on' : '') + '" title="' + (hasC ? 'Contact: ' + esc(m.contact) : 'Geen contact') + '">👤</span>';
    return '<div class="off-row" data-id="' + esc(m.id) + '" title="' + esc((m.extra || 'Geen info').slice(0, 280)) + '">' +
      '<span class="off-dot" style="background:' + esc(m.status_color || '#9e919e') + '"></span>' +
      '<span class="off-nm2">' + esc(m.titel) + (typeChip ? ' ' + typeChip : '') + '</span>' +
      '<span class="off-bd">' + esc(m.bedrijf || '-') + (m.datum ? ' · ' + esc(kdDatum(m.datum)) : '') + '</span>' +
      '<span class="mtg-badges">' + badges + '</span>' +
      '<svg class="arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
      '</div>';
  }
  function drawMeetings(page) {
    if (!state.mtgF) state.mtgF = { q: '', type: '' };
    var f = state.mtgF; var ql = (f.q || '').toLowerCase();
    var items = (state.meetings || []).filter(function (m) {
      if (f.type && m.type !== f.type) return false;
      if (ql && (m.titel + ' ' + m.bedrijf + ' ' + (m.contact || '')).toLowerCase().indexOf(ql) < 0) return false;
      return true;
    }).sort(function (a, b) { return (b.datum || 0) - (a.datum || 0); });   // meest recente bovenaan
    var typeTabs = '<div class="werv-tabs" style="margin-bottom:0">' +
      '<button class="werv-tab' + (!f.type ? ' on' : '') + '" data-type="">Alle<span class="werv-n">' + (state.meetings || []).length + '</span></button>' +
      '<button class="werv-tab' + (f.type === 'SALES' ? ' on' : '') + '" data-type="SALES">Sales</button>' +
      '<button class="werv-tab' + (f.type === 'PROJECT' ? ' on' : '') + '" data-type="PROJECT">Project</button></div>';
    var search = '<div class="acc-search" style="margin:0;flex:1;min-width:180px"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="mtg-q" placeholder="Zoek op meeting, klant of contact…" autocomplete="off" value="' + esc(f.q || '') + '"></div>';
    var rows = items.length ? '<div class="off-rows">' + items.map(mtgRow).join('') + '</div>' : '<div class="empty"><p>Geen meetings in deze weergave.</p></div>';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Meetings</h1><div class="sub">Gefilterd op type, recentste bovenaan. De bolletjes tonen de koppeling met bedrijf, offerte en contact. Klik voor het verslag en om te koppelen.</div></div>' +
      '<div class="off-toolbar">' + typeTabs + search + '</div>' + rows + '</div>';
    Array.prototype.forEach.call(page.querySelectorAll('.werv-tab[data-type]'), function (b) { b.onclick = function () { state.mtgF.type = b.getAttribute('data-type'); drawMeetings(page); }; });
    var qi = $('mtg-q'); if (qi) qi.oninput = function () { var s = this.selectionStart; state.mtgF.q = this.value; drawMeetings(page); var n = $('mtg-q'); if (n) { n.focus(); try { n.setSelectionRange(s, s); } catch (e) { } } };
    Array.prototype.forEach.call(page.querySelectorAll('.off-row'), function (r) { r.onclick = function () { meetingDetail(page, r.getAttribute('data-id')); }; });
  }
  function reloadMeetings(page, reopenId) {
    api('teamMeetings', { refresh: true }).then(function (r) { if (r && r.ok) { state.meetings = r.items; if (reopenId && document.getElementById('tpAiPop')) meetingDetail(page, reopenId); else drawMeetings(page); } });
  }
  function meetingKoppel(page, mid, kind) {
    var titel = kind === 'contact' ? '👤 Contactpersoon koppelen' : kind === 'offerte' ? '📄 Offerte koppelen' : '🏢 Bedrijf koppelen';
    koppelPicker(kind, titel, function (it) { api('teamMeetingKoppel', { meeting_id: mid, kind: kind, target_id: it.id, action: 'add' }).then(function (r) { if (r && r.ok) { toast('Gekoppeld ✓ (gesynct met ClickUp)'); reloadMeetings(page, mid); } else toast((r && r.message) || 'Koppelen mislukt'); }); });
  }
  function meetingDetail(page, mid) {
    var m = (state.meetings || []).filter(function (x) { return x.id === mid; })[0]; if (!m) return;
    var contactChips = (m.contacten && m.contacten.length)
      ? m.contacten.map(function (c) { return '<span class="off-kchip on">👤 ' + esc(c.naam || 'contact') + '<button class="off-kx" data-rem="contact" data-id="' + esc(c.id) + '" title="Ontkoppelen">×</button></span>'; }).join('')
      : '<span class="off-kchip warn">👤 geen contact gekoppeld</span>';
    var offChips = (m.offerte_ids && m.offerte_ids.length)
      ? m.offerte_ids.map(function (oid) { var o = (state.offForLink || []).find(function (x) { return x.id === oid; }); return '<span class="off-kchip on">📄 ' + esc(o ? o.naam : 'offerte') + '<button class="off-kx" data-rem="offerte" data-id="' + esc(oid) + '" title="Ontkoppelen">×</button></span>'; }).join('')
      : '<span class="off-kchip warn">📄 geen offerte gekoppeld</span>';
    var koppel = '<div class="off-koppel">' +
      '<span class="off-kchip' + (m.bedrijf ? ' on' : '') + '">🏢 ' + (m.bedrijf ? esc(m.bedrijf) : 'geen bedrijf') + (m.bedrijf ? '<button class="off-kx" data-rem="bedrijf" data-id="' + esc(m.bedrijf_id) + '" title="Ontkoppelen">×</button>' : '') + '</span>' +
      contactChips + offChips +
      '<button class="off-kadd" data-add="contact">+ contact</button>' +
      '<button class="off-kadd" data-add="offerte">+ offerte</button>' +
      (m.bedrijf ? '' : '<button class="off-kadd" data-add="bedrijf">+ bedrijf</button>') + '</div>';
    var meta = (m.type ? '<span class="mtg-type mtg-type-' + m.type.toLowerCase() + '">' + esc(m.type) + '</span> ' : '') + (m.datum ? '<span class="mtg-date">' + esc(kdDatum(m.datum)) + '</span>' : '');
    var ff = m.fireflies ? '<a class="btn btn-outline btn-sm" href="' + esc(m.fireflies) + '" target="_blank" rel="noopener">🎙️ Fireflies-opname ↗</a>' : '';
    showAiPop('📅 ' + (m.titel || 'Meeting'),
      '<div class="mtg-meta">' + meta + '</div>' + koppel +
      '<div class="kd-fase-actsh" style="margin-top:16px">📝 Verslag</div><div class="off-mt-info">' + aiFmt(m.extra || 'Nog geen verslag toegevoegd.') + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn btn-outline btn-sm" id="mtg-d-extra">' + svgIc(IC.edit, 14) + ' Verslag bewerken</button>' + ff + (m.url ? '<a class="btn btn-outline btn-sm" href="' + esc(m.url) + '" target="_blank" rel="noopener">ClickUp ↗</a>' : '') + '</div>');
    Array.prototype.forEach.call(document.querySelectorAll('#tpAiPop .off-kadd'), function (b) { b.onclick = function () { meetingKoppel(page, mid, b.getAttribute('data-add')); }; });
    Array.prototype.forEach.call(document.querySelectorAll('#tpAiPop .off-kx'), function (b) { b.onclick = function () { var kind = b.getAttribute('data-rem'), id = b.getAttribute('data-id'); api('teamMeetingKoppel', { meeting_id: mid, kind: kind, target_id: id, action: 'rem' }).then(function (r) { if (r && r.ok) { toast('Ontkoppeld ✓'); reloadMeetings(page, mid); } else toast('Ontkoppelen mislukt'); }); }; });
    var eb = document.getElementById('mtg-d-extra'); if (eb) eb.onclick = function () { meetingExtraPopup(page, mid); };
  }
  function meetingLinkPopup(page, mid) {
    var offs = (state.offForLink || []).slice(0, 200);
    var rows = offs.length ? offs.map(function (o) { return '<button class="tp-pick" data-oid="' + esc(o.id) + '"><span class="tp-pick-nm">' + esc(o.naam) + (o.bedrijf ? ' - ' + esc(o.bedrijf) : '') + '</span></button>'; }).join('') : '<div class="micro" style="padding:8px;color:var(--ink-4)">Geen offertes gevonden.</div>';
    showAiPop('📄 Koppel een offerte', '<div class="tp-pick-list">' + rows + '</div><button class="btn btn-outline btn-sm" id="mtg-unlink" style="margin-top:10px">Ontkoppelen</button>', { compact: true });
    Array.prototype.forEach.call(document.querySelectorAll('#tpAiPop .tp-pick'), function (b) { b.onclick = function () { var oid = b.getAttribute('data-oid'); api('teamMeetingLink', { meeting_id: mid, offerte_id: oid }).then(function (r) { if (r && r.ok) { closeAiPop(); toast('Gekoppeld ✓'); var m = (state.meetings || []).filter(function (x) { return x.id === mid; })[0]; if (m) m.offerte_id = oid; drawMeetings(page, ($('mtg-q') || {}).value || ''); } else toast('Koppelen mislukt'); }); }; });
    var unl = document.getElementById('mtg-unlink'); if (unl) unl.onclick = function () { api('teamMeetingLink', { meeting_id: mid, offerte_id: '' }).then(function (r) { if (r && r.ok) { closeAiPop(); toast('Ontkoppeld ✓'); var m = (state.meetings || []).filter(function (x) { return x.id === mid; })[0]; if (m) m.offerte_id = ''; drawMeetings(page, ($('mtg-q') || {}).value || ''); } }); };
  }
  function meetingExtraPopup(page, mid) {
    var m = (state.meetings || []).filter(function (x) { return x.id === mid; })[0]; var cur = m ? m.extra : '';
    showAiPop('Extra info bij de meeting', '<textarea id="mtg-extra-in" class="ai-input" rows="6">' + esc(cur) + '</textarea><button class="btn btn-primary btn-sm" id="mtg-extra-go" style="margin-top:8px">Opslaan</button>', { compact: true });
    var ta = document.getElementById('mtg-extra-in'); if (ta) ta.focus();
    document.getElementById('mtg-extra-go').onclick = function () { var btn = this; if (btn.disabled) return; btn.disabled = true; btn.textContent = 'Opslaan…'; var v = (document.getElementById('mtg-extra-in') || {}).value || ''; api('teamMeetingExtra', { meeting_id: mid, extra: v }).then(function (r) { if (r && r.ok) { closeAiPop(); toast('Opgeslagen ✓'); if (m) m.extra = v; drawMeetings(page, ($('mtg-q') || {}).value || ''); } else { toast('Opslaan mislukt'); btn.disabled = false; btn.textContent = 'Opslaan'; } }).catch(function () { toast('Opslaan mislukt'); btn.disabled = false; btn.textContent = 'Opslaan'; }); };
  }

  /* ---- ACCOUNT (Ilke/admin): alle lopende projecten per klant ---- */
  async function renderAccount(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Accountbeheer</h1><div class="sub">Laden…</div></div><div class="empty"><p>Projecten + weekplanning ophalen…</p></div></div>';
    var dP = api('teamAllProjects', {}, { timeout: 40000 }).catch(function () { return null; });
    var hP = api('teamHealth', {}, { timeout: 40000 }).catch(function () { return null; });
    var d = await dP; var h = await hP;
    if (!d || !d.ok) { if (d && d.error === 'forbidden_role') { page.querySelector('.sub').textContent = 'Geen toegang voor jouw rol.'; if (page.querySelector('.empty')) page.querySelector('.empty').remove(); return; } loadFail(page, 'Accountbeheer', function () { renderAccount(page); }); return; }
    state.account = d; var t = d.totaal;
    var stat = function (n, l, br) { return '<div class="tstat ' + br + '"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; };
    var healthCard = '';
    if (h && h.ok && h.leden.length) {
      var maxU = Math.max(h.target, Math.max.apply(null, h.leden.map(function (l) { return l.uren; }).concat([1])));
      var rows = h.leden.map(function (l) {
        var w = Math.min(100, Math.round(l.uren / maxU * 100));
        var col = l.uren >= h.target * 0.8 ? 'var(--s27-green)' : (l.uren >= h.target * 0.4 ? 'var(--s27-yellow)' : 'var(--s27-orange)');
        return '<div class="uren-row"><span class="un">' + esc(voornaam(l.naam)) + (l.pool ? ' ' + svgIc(IC.cam, 12) : '') + '</span><span class="ut"><i style="width:' + w + '%;background:' + col + '"></i></span><span class="uv">' + l.uren + 'u</span></div>';
      }).join('');
      healthCard = '<div class="fincard"><h3>Deze week · ingeplande uren <span class="micro" style="font-weight:600;color:var(--ink-4)">· richtlijn ' + h.target + 'u/week</span></h3>' + rows +
        '<div class="disclaimer-note" style="margin-top:13px"><span>ⓘ</span><span>' + esc(h.disclaimer) + '</span></div></div>';
    }
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Accountbeheer</h1><div class="sub">Weekplanning van het team + alle lopende projecten, klaar om een klant meteen te helpen.</div></div>' +
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
      var fb = (c.feedback >= 3) ? '<span class="acc-fb" title="Veel feedbackrondes, mogelijk handmatig opvolgen">🔁 ' + c.feedback + '</span>' : '';
      var teLaat = c.te_laat ? '<span class="acc-badge bad">' + c.te_laat + ' te laat</span>' : '';
      var next = c.next_due ? ' · eerstvolgend ' + dueLabel(c.next_due) : '';
      var discs = c.disciplines.slice(0, 5).map(function (dd) { return esc(DISC_LABEL[dd] || dd); }).join(' · ');
      return '<div class="acc-card"><button class="acc-head" data-bid="' + esc(c.bedrijf_id) + '"><span class="acc-sw"></span>' +
        '<div class="acc-main"><div class="acc-nm">' + esc(c.bedrijf) + '</div><div class="acc-subline">' + esc(discs) + next + '</div></div>' +
        '<div class="acc-meta">' + fb + teLaat + '<span class="acc-badge">' + c.active + ' actief</span></div>' +
        '<svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>' +
        '<div class="acc-card-body" data-bid="' + esc(c.bedrijf_id) + '"></div></div>';
    }).join('');
  }
  function wireAcc() {
    Array.prototype.forEach.call(document.querySelectorAll('.acc-head'), function (h) {
      h.onclick = function () {
        var bid = h.getAttribute('data-bid'); var body = document.querySelector('.acc-card-body[data-bid="' + bid + '"]');
        var open = h.classList.toggle('open');
        if (open && !body.innerHTML) { var c = state.account.clients.find(function (x) { return x.bedrijf_id === bid; }); if (c) { body.innerHTML = '<div class="proj-list" style="padding:8px 0 6px">' + c.items.map(function (t) { return projRow(t); }).join('') + '</div>'; wireRows(body); } }
        body.classList.toggle('open', open);
      };
    });
  }

  /* ---- CIJFERS (admin/sales): financieel ---- */
  // ── periode-rekenkunde (unit-getest: kwartaal/jaargrenzen) ──
  function finAddM(ym, dd) { var p = ym.split('-'); var t = (+p[0]) * 12 + (+p[1] - 1) + dd; var y = Math.floor(t / 12), m = (t % 12 + 12) % 12 + 1; return y + '-' + String(m).padStart(2, '0'); }
  function finRange(a, b) { if (a > b) { var t = a; a = b; b = t; } var out = [], c = a, g = 0; while (c <= b && g++ < 600) { out.push(c); c = finAddM(c, 1); } return out; }
  function finMonths(per, params, nu) {
    var Y = +nu.split('-')[0], M = +nu.split('-')[1];
    var qStart = Y + '-' + String(Math.floor((M - 1) / 3) * 3 + 1).padStart(2, '0');
    switch (per) {
      case 'deze_maand': return [nu];
      case 'vorige_maand': return [finAddM(nu, -1)];
      case 'dit_kwartaal': return [qStart, finAddM(qStart, 1), finAddM(qStart, 2)];
      case 'vorig_kwartaal': var pq = finAddM(qStart, -3); return [pq, finAddM(pq, 1), finAddM(pq, 2)];
      case 'dit_jaar': return finRange(Y + '-01', Y + '-12');
      case 'vorig_jaar': return finRange((Y - 1) + '-01', (Y - 1) + '-12');
      case 'laatste_12_maanden': return finRange(finAddM(nu, -11), nu);
      case 'custom': return (params && params.van && params.tot) ? finRange(params.van, params.tot) : [];
      case 'alles': return null;
      default: if (/^jaar:\d{4}$/.test(per)) { var yy = per.slice(5); return finRange(yy + '-01', yy + '-12'); } return finRange(finAddM(nu, -11), nu);
    }
  }
  var FIN_PAL = ['#3083DC', '#5e50c8', '#36b36b', '#e8932f', '#e0567f', '#7b6ef0', '#2bb3c0', '#c95a9b', '#8aa12b', '#d2503f', '#4a9d8e', '#b07cd8', '#d98c3a', '#6a8caf'];
  var FIN_PERLBL = { deze_maand: 'Deze maand', vorige_maand: 'Vorige maand', dit_kwartaal: 'Dit kwartaal', vorig_kwartaal: 'Vorig kwartaal', dit_jaar: 'Dit jaar', vorig_jaar: 'Vorig jaar', laatste_12_maanden: 'Laatste 12 maanden', custom: 'Aangepast', alles: 'Alles' };
  function finPerLabel(p) { return FIN_PERLBL[p] || (/^jaar:/.test(p) ? ('Jaar ' + p.slice(5)) : p); }
  function finCmpLabel(c) { return c === 'vorige_periode' ? 'vs vorige periode' : c === 'vorig_jaar' ? 'vs vorig jaar' : ''; }
  // ── filterstaat ↔ URL + localStorage (deelbaar + onthouden) ──
  function finSyncUrl(f) {
    try {
      // Filterstaat wordt onthouden in localStorage. NIET in de URL (die blijft schoon: #cijfers).
      localStorage.setItem('s27team_finF', JSON.stringify({ periode: f.periode, compare: f.compare, van: f.van, tot: f.tot, catsOff: f.catsOff, persOff: f.persOff }));
      if (location.search) { try { history.replaceState(null, '', location.pathname + (location.hash || '#cijfers')); } catch (e) { /* */ } }   // ruim oude ?per=…-rommel op
    } catch (e) { /* */ }
  }
  function finReadState() {
    var f = { periode: 'laatste_12_maanden', van: '', tot: '', compare: '', catsOff: {}, persOff: {}, _y: (new Date()).getFullYear() };
    var o = null;
    try { var qs = location.search.replace(/^\?/, ''); if (/(^|&)per=/.test(qs)) { o = {}; qs.split('&').forEach(function (kv) { var x = kv.split('='); o[x[0]] = decodeURIComponent(x[1] || ''); }); } } catch (e) { /* */ }
    if (!o) { try { var ls = JSON.parse(localStorage.getItem('s27team_finF') || 'null'); if (ls) o = { per: ls.periode, cmp: ls.compare, van: ls.van, tot: ls.tot, coff: Object.keys(ls.catsOff || {}).join('~'), poff: Object.keys(ls.persOff || {}).join('~') }; } catch (e) { /* */ } }
    if (o) {
      if (o.per) f.periode = o.per;
      if (o.cmp) f.compare = o.cmp;
      if (o.van) f.van = o.van; if (o.tot) f.tot = o.tot;
      if (o.coff) o.coff.split('~').forEach(function (k) { if (k) f.catsOff[k] = 1; });
      if (o.poff) o.poff.split('~').forEach(function (k) { if (k) f.persOff[k] = 1; });
    }
    return f;
  }
  // ── PDF-export van de huidige gefilterde view (gebrand print-venster, geen externe library) ──
  function pdfCijfers() {
    var d = state.fin, f = state.finF;
    var cube = d.cube || { maanden: [], offMaand: {}, offCountMaand: {}, offZonderMaand: {}, catMaand: {}, persMaand: {}, persNaam: {} };
    var now = new Date(); var nuYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var winSet = {}; (cube.maanden || []).forEach(function (m) { winSet[m] = 1; });
    var months = finMonths(f.periode, { van: f.van, tot: f.tot }, nuYM);
    if (months === null) months = (cube.maanden || []).filter(function (m) { return cube.offMaand[m] || cube.catMaand[m] || cube.persMaand[m]; });
    months = months.filter(function (m) { return winSet[m]; });
    var cmp = null;
    if (f.compare === 'vorige_periode' && months.length) cmp = months.map(function (m) { return finAddM(m, -months.length); });
    else if (f.compare === 'vorig_jaar' && months.length) cmp = months.map(function (m) { return finAddM(m, -12); });
    // cmp NIET filteren op venster → blijft 1-op-1 met months uitgelijnd (buiten-venster = €0)
    function agg(ms) { var r = { off: 0, offC: 0, offZ: 0, plan: 0 }; (ms || []).forEach(function (m) { r.off += cube.offMaand[m] || 0; r.offC += cube.offCountMaand[m] || 0; r.offZ += cube.offZonderMaand[m] || 0; var cm = cube.catMaand[m]; if (cm) for (var c in cm) r.plan += cm[c]; }); return r; }
    var A = agg(months), C = cmp ? agg(cmp) : null;
    var dl = function (cur, prev) { if (!C || prev == null) return ''; if (prev <= 0) return cur > 0 ? '<span class="dl up">▲</span>' : ''; var p = Math.round((cur - prev) / prev * 100); return '<span class="dl ' + (p > 0 ? 'up' : p < 0 ? 'down' : '') + '">' + (p > 0 ? '▲ +' : p < 0 ? '▼ ' : '') + p + '%</span>'; };
    function dimPrint(title, dimMap, orderedKeys, colorOf, labelOf, offMap) {
      if (!months.length || !Object.keys(dimMap || {}).length) return '';
      var tot = {}; orderedKeys.forEach(function (k) { tot[k] = 0; });
      months.forEach(function (m) { var dm = dimMap[m]; if (dm) for (var k in dm) { if (tot[k] == null) tot[k] = 0; tot[k] += dm[k]; } });
      var vis = orderedKeys.filter(function (k) { return !offMap[k] && (tot[k] || 0) > 0; }).sort(function (a, b) { return tot[b] - tot[a]; });
      var shown = vis.slice(0, 7), rest = vis.slice(7);
      var valAt = function (m, k) { return (dimMap[m] && dimMap[m][k]) || 0; };
      var restAt = function (m) { var s = 0; rest.forEach(function (k) { s += valAt(m, k); }); return s; };
      var stackTot = function (m) { var s = restAt(m); shown.forEach(function (k) { s += valAt(m, k); }); return s; };
      var monTot = months.map(stackTot), cmpTot = cmp ? cmp.map(stackTot) : null;
      var maxT = Math.max.apply(null, monTot.concat(cmpTot || []).concat([1]));
      var segs = function (m) { var o = shown.map(function (k) { var v = valAt(m, k); return v > 0 ? '<span style="width:' + (v / maxT * 100) + '%;background:' + colorOf(k) + '"></span>' : ''; }).join(''); var rv = restAt(m); if (rv > 0) o += '<span style="width:' + (rv / maxT * 100) + '%;background:#b9b3bd"></span>'; return o; };
      var leg = shown.map(function (k) { return '<span class="lg"><i style="background:' + colorOf(k) + '"></i>' + esc(labelOf(k)) + ' ' + eur(tot[k] || 0) + '</span>'; }).join('') + (rest.length ? '<span class="lg"><i style="background:#b9b3bd"></i>Overig (' + rest.length + ')</span>' : '');
      var rows = months.map(function (m, i) {
        var cb = cmp ? '<span class="pbar pbarc">' + segs(cmp[i]) + '</span>' : '';
        return '<div class="prow"><span class="plab">' + monthLabel(m) + '</span><span class="pbars"><span class="pbar">' + segs(m) + '</span>' + cb + '</span><span class="ptot">' + (monTot[i] ? eur(monTot[i]) : '-') + '</span></div>';
      }).join('');
      return '<div class="sec"><h2>' + esc(title) + '</h2><div class="leg">' + leg + '</div>' + rows + '</div>';
    }
    var catSec = dimPrint('Omzet per maand · per type job', cube.catMaand, (d.categorie || []).map(function (c) { return c.categorie; }), function (k) { return d._catCol[k] || '#999'; }, function (k) { return k; }, f.catsOff);
    var persSec = (d.per_persoon && d.per_persoon.length && cube.persMaand && Object.keys(cube.persMaand).length) ? dimPrint('Omzet per maand · per teamlid', cube.persMaand, (d.per_persoon || []).map(function (p) { return String(p.id); }), function (k) { return d._persCol[k] || '#999'; }, function (k) { return voornaam(cube.persNaam[k] || ('#' + k)); }, f.persOff) : '';
    var per = finPerLabel(f.periode) + (months.length ? ' · ' + monthLabel(months[0]) + '-' + monthLabel(months[months.length - 1]) : '');
    var cl = finCmpLabel(f.compare);
    var dd = now.getDate() + ' ' + MONTHS[now.getMonth()] + ' ' + now.getFullYear();
    var base = 'https://s27-teamportaal.studio27marketing.workers.dev';
    var kpis = '<div class="kpis">' +
      '<div class="kpi"><b>' + eur(A.off) + dl(A.off, C ? C.off : null) + '</b><span>Offertes uitgebracht</span></div>' +
      '<div class="kpi"><b>' + A.offC + '</b><span>Aantal offertes</span></div>' +
      '<div class="kpi"><b>' + eur(A.plan) + dl(A.plan, C ? C.plan : null) + '</b><span>Gepland budget</span></div>' +
      '<div class="kpi"><b>' + A.offZ + '</b><span>Zonder bedrag</span></div></div>';
    var css = '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Montserrat,Nunito,Arial,sans-serif;color:#2a2530;padding:26px 30px;font-size:12px}h1{font-size:21px;font-weight:900}h2{font-size:13px;font-weight:800;margin:0 0 8px;color:#5e50c8}.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #efe9ef;padding-bottom:12px;margin-bottom:14px}.hd img{height:26px}.meta{font-size:11px;color:#8a818d;margin-top:3px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0 18px}.kpi{border:1px solid #efe9ef;border-radius:10px;padding:10px 12px}.kpi b{font-size:18px;font-weight:900;display:block;letter-spacing:-.02em}.kpi span{font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:#8a818d}.dl{font-size:10px;font-weight:800;margin-left:0;display:block;margin-top:2px}.dl.up{color:#1f6b3f}.dl.down{color:#c0392b}.sec{margin:16px 0;page-break-inside:avoid}.leg{display:flex;flex-wrap:wrap;gap:5px 12px;margin-bottom:10px}.lg{font-size:10px;color:#5c5560;display:inline-flex;align-items:center;gap:5px}.lg i{width:9px;height:9px;border-radius:2px;display:inline-block}.prow{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:9px;margin-bottom:5px}.plab{font-size:10px;font-weight:700;color:#8a818d;text-transform:capitalize}.pbars{display:flex;flex-direction:column;gap:2px}.pbar{display:flex;height:14px;border-radius:4px;overflow:hidden;background:#efeaef}.pbar span{height:100%}.pbarc{opacity:.5;height:8px}.pbar.pbarc{height:8px}.ptot{font-size:11px;font-weight:800;text-align:right;white-space:nowrap;min-width:66px}.disc{margin-top:18px;border-top:1px solid #efe9ef;padding-top:10px;font-size:9.5px;color:#8a818d;line-height:1.5}.noprint{margin:18px 0}@media print{.noprint{display:none}}';
    var html = '<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Cijfers & omzet · Studio 27</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet"><style>' + css + '</style></head><body>' +
      '<div class="hd"><div><h1>Cijfers & omzet</h1><div class="meta">' + esc(per) + (cl ? ' · ' + esc(cl) : '') + ' · gegenereerd ' + dd + '</div></div><img src="' + base + '/wordmark.svg" alt="Studio 27"></div>' +
      kpis + (catSec || '<p class="meta">Geen data voor de geselecteerde periode.</p>') + persSec +
      '<div class="disc">' + esc(d.disclaimer || '') + '</div>' +
      '<div class="noprint"><button onclick="window.print()" style="padding:9px 16px;border:0;border-radius:8px;background:#5e50c8;color:#fff;font-weight:800;font-family:inherit;cursor:pointer">Opslaan als PDF / Afdrukken</button></div>' +
      '</body></html>';
    s27EmitDoc(html, 'studio27-cijfers.html');
  }
  // print-venster met download-fallback wanneer pop-ups geblokkeerd zijn (MDM/zakelijke browsers)
  function s27EmitDoc(html, name) {
    var w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); setTimeout(function () { try { w.focus(); w.print(); } catch (e) { } }, 600); return; }
    try {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob); var a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 200);
      toast('Pop-up geblokkeerd, bestand gedownload, open het en druk af (Ctrl/Cmd+P)');
    } catch (e) { toast('Sta pop-ups toe voor de PDF'); }
  }
  // CSV-export van de gefilterde view (maand-rijen × offertes/budget/per type job), geen library
  function csvCijfers() {
    var d = state.fin, f = state.finF; if (!d) return;
    var cube = d.cube || { maanden: [], offMaand: {}, offCountMaand: {}, catMaand: {}, persMaand: {} };
    var now = new Date(); var nuYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var winSet = {}; (cube.maanden || []).forEach(function (m) { winSet[m] = 1; });
    var months = finMonths(f.periode, { van: f.van, tot: f.tot }, nuYM);
    if (months === null) months = (cube.maanden || []).filter(function (m) { return cube.offMaand[m] || cube.catMaand[m] || cube.persMaand[m]; });
    months = months.filter(function (m) { return winSet[m]; });
    var cats = (d.categorie || []).map(function (c) { return c.categorie; }).filter(function (c) { return !f.catsOff[c]; });
    var cell = function (s) { s = String(s == null ? '' : s); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var lines = [['Maand', 'Offertes (EUR)', 'Aantal offertes', 'Gepland budget (EUR)'].concat(cats).map(cell).join(';')];
    months.forEach(function (m) {
      var cm = cube.catMaand[m] || {}; var plan = 0; for (var c in cm) plan += cm[c];
      var row = [m, cube.offMaand[m] || 0, cube.offCountMaand[m] || 0, Math.round(plan)];
      cats.forEach(function (c) { row.push(Math.round(cm[c] || 0)); });
      lines.push(row.map(cell).join(';'));
    });
    try {
      var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob); var a = document.createElement('a');
      a.href = url; a.download = 'studio27-cijfers-' + (months[0] || '') + '_' + (months[months.length - 1] || '') + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 200);
      toast('CSV gedownload');
    } catch (e) { toast('Export mislukt'); }
  }
  /* ---- BEZETTING v2 (ClickUp-workload-stijl): dag-grid per teamlid ---- */
  var WL = { kind: 'week', period_ms: 0, group_id: '', member_id: 0, data: null };
  var WL_SEQ = 0;
  function fmtUur(h) { h = Math.round((Number(h) || 0) * 10) / 10; return (h % 1 === 0 ? String(h) : String(h).replace('.', ',')) + 'u'; }
  function fmtBud(n) { n = Math.round(Number(n) || 0); return n ? '€ ' + n.toLocaleString('nl-BE') : ''; }
  function wlPad(n) { return String(n).padStart(2, '0'); }
  function wlMonday(ms) { var d = new Date(ms); var dow = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - dow); return d.getTime(); }
  function wlBarColor(pct) { return pct > 115 ? 'var(--s27-red,#e24b4a)' : pct > 100 ? 'var(--s27-orange,#e08600)' : pct >= 65 ? 'var(--s27-green,#1FA463)' : 'var(--s27-blue,#3083dc)'; }
  function wlShift(dir) {
    if (WL.kind === 'maand') { var m = new Date(WL.period_ms || Date.now()); m.setDate(1); m.setMonth(m.getMonth() + dir); return m.getTime(); }
    return (WL.period_ms || wlMonday(Date.now())) + dir * 7 * 86400000;
  }
  function wlPeriodLabel() {
    var d = WL.data; if (!d || !d.periode) return '';
    var van = new Date(d.periode.van), tot = new Date(d.periode.tot);
    if (d.kind === 'maand') return MONTHS_L[van.getMonth()] + ' ' + van.getFullYear();
    return van.getDate() + ' ' + MONTHS[van.getMonth()] + ' - ' + tot.getDate() + ' ' + MONTHS[tot.getMonth()];
  }
  function wlTodayYmd() { var t = new Date(); return t.getFullYear() + '-' + wlPad(t.getMonth() + 1) + '-' + wlPad(t.getDate()); }
  function wlMsToYmd(ms) { var d = new Date(ms); return d.getFullYear() + '-' + wlPad(d.getMonth() + 1) + '-' + wlPad(d.getDate()); }

  /* --- week view helpers --- */
  var WL_DN = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  function wlWeekDays() {
    var d = WL.data; if (!d || !d.periode) return [];
    var today = wlTodayYmd(), out = [];
    for (var i = 0; i < 7; i++) {
      var ms = d.periode.van + i * 86400000, dt = new Date(ms), ymd = wlMsToYmd(ms);
      out.push({ ymd: ymd, label: WL_DN[dt.getDay()] + ' ' + dt.getDate(), today: ymd === today, wknd: dt.getDay() === 0 || dt.getDay() === 6 });
    }
    return out;
  }

  /* --- week grid render --- */
  function wlWeekGrid(leden) {
    var days = wlWeekDays();
    var headCols = days.map(function (dy) {
      return '<div class="wlg-dh' + (dy.today ? ' today' : '') + (dy.wknd ? ' wknd' : '') + '">' + dy.label + '</div>';
    }).join('');
    var head = '<div class="wlg-head-row"><div class="wlg-who-cell"></div><div class="wlg-days">' + headCols + '</div></div>';

    var rows = leden.map(function (m) {
      var pct = m.pct || 0, col = wlBarColor(pct), fill = Math.min(100, pct);
      var over = pct > 100;
      var statusTxt = over ? '+' + fmtUur(m.uren - m.capaciteit) + ' over' : pct >= 95 ? 'Vol' : pct >= 50 ? fmtUur(m.uren) + ' / ' + fmtUur(m.capaciteit) : 'Vrij';
      var statusCls = over ? ' wlg-stat-over' : pct >= 95 ? ' wlg-stat-full' : '';
      var bud = fmtBud(m.budget_total);
      // group by day
      var byDay = {};
      days.forEach(function (dy) { byDay[dy.ymd] = []; });
      (m.taken || []).forEach(function (t) { if (byDay[t.day_ymd] !== undefined) byDay[t.day_ymd].push(t); });
      // day columns
      var dayCols = days.map(function (dy) {
        var chips = byDay[dy.ymd].map(function (t) {
          var tip = t.naam + (t.bedrijf ? '  ·  ' + t.bedrijf : '') + (t.uren ? '  ·  ' + fmtUur(t.uren) : '') + (t.due_ymd ? '  ·  ' + t.due_ymd : '');
          return '<button class="wl-chip ' + discBr(t.disc) + '" data-id="' + esc(t.id) + '" data-tip="' + esc(tip) + '">' +
            '<span class="wl-chip-nm">' + esc(t.naam) + '</span>' +
            (t.uren ? '<span class="wl-chip-h">' + fmtUur(t.uren) + '</span>' : '') +
            '</button>';
        }).join('');
        var dayH = byDay[dy.ymd].reduce(function (s, t) { return s + (t.uren || 0); }, 0);
        return '<div class="wlg-dc' + (dy.today ? ' today' : '') + (dy.wknd ? ' wknd' : '') + '">' +
          chips +
          (dayH > 0 ? '<div class="wlg-dc-tot">' + fmtUur(dayH) + '</div>' : '') +
          '</div>';
      }).join('');
      return '<div class="wlg-member">' +
        '<div class="wlg-member-top">' +
          '<div class="wlg-who-cell">' +
            '<div class="av wlg-av">' + esc(initialen(m.naam)) + '</div>' +
            '<div class="wlg-who-tx">' +
              '<div class="wlg-nm">' + esc(m.naam) + '</div>' +
              '<div class="wlg-rol">' + (m.pool ? 'Content Creator' : 'Team') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wlg-stat' + statusCls + '">' +
            '<span class="wlg-stat-lbl">' + esc(statusTxt) + '</span>' +
            '<div class="wlg-bar"><div class="wlg-bar-fill" style="width:' + fill + '%;background:' + col + '"></div></div>' +
            '<span class="wlg-hours" style="color:' + col + '">' + fmtUur(m.uren) + '<span class="wlg-cap-of">/' + fmtUur(m.capaciteit) + '</span></span>' +
            (bud ? '<span class="wlg-bud">' + bud + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="wlg-task-row"><div class="wlg-who-spacer"></div><div class="wlg-days">' + dayCols + '</div></div>' +
        '</div>';
    }).join('');

    return '<div class="wlg-outer"><div class="wlg-scroll"><div class="wlg-inner">' + head + rows + '</div></div></div>';
  }

  /* --- month view: week buckets --- */
  var WL_MONTHS_S = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  function wlMonthWeeks() {
    var d = WL.data; if (!d || !d.periode) return [];
    var van = d.periode.van, tot = d.periode.tot, today = wlTodayYmd(), weeks = [];
    var ms = van - ((new Date(van).getDay() + 6) % 7) * 86400000; // back to Monday
    while (ms <= tot + 6 * 86400000) {
      var wE = ms + 6 * 86400000, wVan = new Date(ms), wTot = new Date(wE);
      var yv = wlMsToYmd(ms), yt = wlMsToYmd(wE);
      if (ms <= tot && wE >= van) weeks.push({ ymd_van: yv, ymd_tot: yt, isCur: yv <= today && today <= yt, label: wVan.getDate() + ' ' + WL_MONTHS_S[wVan.getMonth()] });
      ms += 7 * 86400000;
    }
    return weeks;
  }
  function wlMonthView(leden) {
    var weeks = wlMonthWeeks();
    var rows = leden.map(function (m) {
      var pct = m.pct || 0, col = wlBarColor(pct), bud = fmtBud(m.budget_total);
      // week-capaciteit per teamlid (respecteert deeltijders) i.p.v. een vaste 40u
      var weekCap = (m.capaciteit && weeks.length) ? (m.capaciteit / weeks.length) : 40;
      var weekBars = weeks.map(function (w) {
        var wH = (m.taken || []).filter(function (t) { return t.day_ymd >= w.ymd_van && t.day_ymd <= w.ymd_tot; }).reduce(function (s, t) { return s + (t.uren || 0); }, 0);
        var wPct = Math.min(130, Math.round(wH / (weekCap || 40) * 100));
        var wCol = wlBarColor(wPct);
        return '<div class="wlm-wk' + (w.isCur ? ' today' : '') + '">' +
          '<div class="wlm-wk-lbl">' + w.label + '</div>' +
          '<div class="wlm-wk-bar"><div class="wlm-wk-fill" style="height:' + Math.min(100, wPct) + '%;background:' + wCol + '"></div></div>' +
          (wH > 0 ? '<div class="wlm-wk-tot">' + fmtUur(wH) + '</div>' : '<div class="wlm-wk-tot wlm-wk-tot--none">-</div>') +
          '</div>';
      }).join('');
      return '<div class="wlm-row">' +
        '<div class="wlm-who">' +
          '<div class="av wlg-av">' + esc(initialen(m.naam)) + '</div>' +
          '<div class="wlg-who-tx">' +
            '<div class="wlg-nm">' + esc(m.naam) + '</div>' +
            '<div class="wlg-rol">' + fmtUur(m.uren) + ' / ' + fmtUur(m.capaciteit) + ' &middot; ' + pct + '%' + (bud ? ' &middot; ' + bud : '') + '</div>' +
            '<div class="wlm-bar"><div class="wlm-bar-fill" style="width:' + Math.min(100, pct) + '%;background:' + col + '"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="wlm-weeks">' + weekBars + '</div>' +
        '</div>';
    }).join('');
    return '<div class="wlm-outer">' + rows + '</div>';
  }

  async function renderBezetting(page) {
    if (!WL.period_ms) WL.period_ms = WL.kind === 'maand' ? Date.now() : wlMonday(Date.now());
    var my = ++WL_SEQ;
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Bezetting</h1><div class="sub">Bezetting laden…</div></div><div class="empty"><p>Even geduld…</p></div></div>';
    var body = { kind: WL.kind, period_ms: WL.period_ms };
    if (WL.member_id) body.member_ids = [WL.member_id]; else if (WL.group_id) body.group_id = WL.group_id;
    var d; try { d = await api('teamWorkload', body, { timeout: 40000 }); } catch (e) { d = null; }
    if (my !== WL_SEQ || state.route !== 'bezetting') return;
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = (d && d.error === 'forbidden_role') ? 'Enkel de zaakvoerder en accountmanager zien de bezetting.' : 'Kon de bezetting niet laden.'; return; }
    WL.data = d; drawBezetting(page);
  }

  function drawBezetting(page) {
    var d = WL.data;
    var groupOpts = '<option value="">Alle teams</option>' + (d.groups || []).map(function (g) { return '<option value="' + esc(g.id) + '"' + (WL.group_id === g.id ? ' selected' : '') + '>' + esc(g.naam) + ' (' + g.n + ')</option>'; }).join('');
    var personOpts = '<option value="0">Iedereen</option>' + (d.roster || []).map(function (m) { return '<option value="' + m.id + '"' + (WL.member_id === m.id ? ' selected' : '') + '>' + esc(m.naam) + '</option>'; }).join('');
    var toolbar = '<div class="wl-tools">' +
      '<div class="wl-toggle" role="group" aria-label="Periode"><button class="wl-tg' + (WL.kind === 'week' ? ' on' : '') + '" data-k="week" aria-pressed="' + (WL.kind === 'week' ? 'true' : 'false') + '">Week</button><button class="wl-tg' + (WL.kind === 'maand' ? ' on' : '') + '" data-k="maand" aria-pressed="' + (WL.kind === 'maand' ? 'true' : 'false') + '">Maand</button></div>' +
      '<div class="wl-nav"><button class="wl-navb" id="wl-prev" aria-label="Vorige">‹</button><span class="wl-period">' + esc(wlPeriodLabel()) + '</span><button class="wl-navb" id="wl-next" aria-label="Volgende">›</button><button class="btn btn-outline btn-sm" id="wl-today">Vandaag</button></div>' +
      '<select class="ev-in wl-sel" id="wl-group" title="Team">' + groupOpts + '</select>' +
      '<select class="ev-in wl-sel" id="wl-person" title="Persoon">' + personOpts + '</select>' +
      '<button class="btn btn-primary btn-sm" id="wl-new">+ Nieuwe taak</button>' +
      '</div>';
    var leden = d.leden_bezetting || [];
    var content = leden.length
      ? (d.kind === 'maand' ? wlMonthView(leden) : wlWeekGrid(leden))
      : '<div class="empty"><p>Geen teamleden in deze selectie.</p></div>';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Bezetting</h1><div class="sub">Uren per dag o.b.v. startdatum taak (zelfde logica als ClickUp). Klik een taak om ze in ClickUp te openen.</div></div>' + toolbar + content + '</div>';
    Array.prototype.forEach.call(page.querySelectorAll('.wl-tg'), function (b) { b.onclick = function () { WL.kind = b.getAttribute('data-k'); WL.period_ms = WL.kind === 'maand' ? (WL.period_ms || Date.now()) : wlMonday(WL.period_ms || Date.now()); renderBezetting(page); }; });
    if ($('wl-prev')) $('wl-prev').onclick = function () { WL.period_ms = wlShift(-1); renderBezetting(page); };
    if ($('wl-next')) $('wl-next').onclick = function () { WL.period_ms = wlShift(1); renderBezetting(page); };
    if ($('wl-today')) $('wl-today').onclick = function () { WL.period_ms = WL.kind === 'maand' ? Date.now() : wlMonday(Date.now()); renderBezetting(page); };
    if ($('wl-group')) $('wl-group').onchange = function () { WL.group_id = this.value; WL.member_id = 0; renderBezetting(page); };
    if ($('wl-person')) $('wl-person').onchange = function () { WL.member_id = Number(this.value) || 0; renderBezetting(page); };
    if ($('wl-new')) $('wl-new').onclick = function () { wlNewTask(); };
    Array.prototype.forEach.call(page.querySelectorAll('.wl-chip'), function (b) { b.onclick = function () { openProject(b.getAttribute('data-id')); }; });
    wireTips();
  }
  function wlNewTask() {
    var d = WL.data || {}; var roster = d.roster || [], lijsten = d.lijsten || [];
    var memOpts = '<option value="0">- kies teamlid -</option>' + roster.map(function (m) { return '<option value="' + m.id + '"' + (WL.member_id === m.id ? ' selected' : '') + '>' + esc(m.naam) + '</option>'; }).join('');
    var lijstOpts = lijsten.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.naam) + '</option>'; }).join('');
    var t = new Date(); var ymd = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    showAiPop('+ Nieuwe taak', '<p class="micro" style="color:var(--ink-4);margin:0 0 12px">De taak komt rechtstreeks in ClickUp, toegewezen + ingepland, en verschijnt meteen in de bezetting.</p>' +
      '<div class="vac-field"><label>Taaknaam</label><input id="wlc-name" class="ai-input" placeholder="bv. Montage video - Klant"></div>' +
      '<div class="vac-field"><label>Teamlid</label><select id="wlc-mem" class="ai-input">' + memOpts + '</select></div>' +
      '<div class="vac-field"><label>Lijst</label><select id="wlc-list" class="ai-input">' + lijstOpts + '</select></div>' +
      '<div class="wlc-row2"><div class="vac-field"><label>Geschatte uren</label><input id="wlc-est" class="ai-input" type="number" min="0" step="0.5" value="1"></div><div class="vac-field"><label>Startdatum</label><input id="wlc-date" class="ai-input" type="date" value="' + ymd + '"></div></div>' +
      '<button class="btn btn-primary btn-sm" id="wlc-go" style="margin-top:6px">Taak aanmaken in ClickUp</button>', { compact: true });
    var go = $('wlc-go'); if (go) go.onclick = function () {
      var name = (($('wlc-name') || {}).value || '').trim(); if (!name) { toast('Geef de taak een naam'); return; }
      if (!(($('wlc-list') || {}).value)) { toast('Kies een lijst'); return; }
      go.disabled = true; go.textContent = 'Aanmaken…';
      api('teamWorkloadCreate', { name: name, member_id: Number(($('wlc-mem') || {}).value) || 0, list_id: ($('wlc-list') || {}).value || '', est_h: Number(($('wlc-est') || {}).value) || 0, start_ymd: ($('wlc-date') || {}).value || '' }).then(function (r) {
        go.disabled = false; go.textContent = 'Taak aanmaken in ClickUp';
        if (r && r.ok) { toast('Taak aangemaakt in ClickUp ✓'); closeAiPop(); renderBezetting($('page')); }
        else toast((r && r.message) || 'Aanmaken mislukt');
      }).catch(function () { go.disabled = false; go.textContent = 'Taak aanmaken in ClickUp'; toast('Aanmaken mislukt'); });
    };
  }
  async function renderCijfers(page) {
    var perms = state.perms || {};
    // account-only (bv. Ilke): geen finance-recht → toon enkel de capaciteit.
    if (!perms.finance && perms.account) return renderCapaciteit(page);
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Cijfers & Capaciteit</h1><div class="sub">Laden…</div></div><div class="empty"><p>Cijfers berekenen… (dit duurt even)</p></div></div>';
    var d = null, cap = null;
    try { var res = await Promise.all([api('teamFinance', {}, { timeout: 40000 }), api('teamCapaciteit', {}, { timeout: 40000 }).catch(function () { return null; })]); d = res[0]; cap = res[1]; } catch (e) { d = null; }
    if (state.route !== 'cijfers') return;
    if (!d || !d.ok) { if (d && d.error === 'forbidden_role') { page.querySelector('.sub').textContent = 'Geen toegang voor jouw rol.'; if (page.querySelector('.empty')) page.querySelector('.empty').remove(); return; } loadFail(page, 'Cijfers & Capaciteit', function () { renderCijfers(page); }); return; }
    if (d.computing) {
      page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Cijfers & Capaciteit</h1><div class="sub">Voor de eerste keer berekenen…</div></div><div class="empty"><div class="boot" style="position:static;background:none;margin:0 auto 10px"><div class="spin"></div></div><p>Dit duurt ±1 minuut. Dit scherm ververst vanzelf.</p></div></div>';
      if (state.route === 'cijfers') setTimeout(function () { if (state.route === 'cijfers') renderCijfers(page); }, 12000);
      return;
    }
    // stabiele kleur-maps op totaal-rang (niet op array-index → uitvinken verandert kleur niet)
    d._catCol = {}; (d.categorie || []).forEach(function (c, i) { d._catCol[c.categorie] = FIN_PAL[i % FIN_PAL.length]; });
    d._persCol = {}; (d.per_persoon || []).forEach(function (p, i) { d._persCol[String(p.id)] = FIN_PAL[i % FIN_PAL.length]; });
    state.fin = d;
    state.cap = (cap && cap.ok && !cap.computing) ? cap : null;
    state.finF = finReadState();
    drawCijfers(page);
  }
  function drawCijfers(page) {
    var d = state.fin, f = state.finF;
    if (!f.acc) f.acc = {};   // open/dicht-staat van uitklap-secties (overleeft redraws)
    if (!f.tab) f.tab = 'econ';   // sales | econ | rendement
    if (!d._catCol) { d._catCol = {}; (d.categorie || []).forEach(function (c, i) { d._catCol[c.categorie] = FIN_PAL[i % FIN_PAL.length]; }); }   // lazy: nooit ongebouwd
    if (!d._persCol) { d._persCol = {}; (d.per_persoon || []).forEach(function (p, i) { d._persCol[String(p.id)] = FIN_PAL[i % FIN_PAL.length]; }); }
    var cube = d.cube || { maanden: [], offMaand: {}, offCountMaand: {}, offZonderMaand: {}, catMaand: {}, persMaand: {}, persNaam: {} };
    var now = new Date(); var nuYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var winSet = {}; (cube.maanden || []).forEach(function (m) { winSet[m] = 1; });
    var validYM = function (x) { return /^\d{4}-\d{2}$/.test(x); };
    // custom: nooit lege/ongeldige/omgekeerde range → val terug op zinnige defaults + normaliseer
    if (f.periode === 'custom') {
      if (!validYM(f.van) || !validYM(f.tot)) { var def = finMonths('laatste_12_maanden', {}, nuYM).filter(function (m) { return winSet[m]; }); if (!validYM(f.van)) f.van = def[0] || (cube.maanden || [])[0] || nuYM; if (!validYM(f.tot)) f.tot = def[def.length - 1] || nuYM; }
      if (f.van > f.tot) { var t = f.van; f.van = f.tot; f.tot = t; }
    }
    finSyncUrl(f);
    var months = finMonths(f.periode, { van: f.van, tot: f.tot }, nuYM);
    if (months === null) months = (cube.maanden || []).filter(function (m) { return cube.offMaand[m] || cube.catMaand[m] || cube.persMaand[m]; });
    months = months.filter(function (m) { return winSet[m]; });
    var cmp = null;
    if (f.compare === 'vorige_periode' && months.length) cmp = months.map(function (m) { return finAddM(m, -months.length); });
    else if (f.compare === 'vorig_jaar' && months.length) cmp = months.map(function (m) { return finAddM(m, -12); });
    // cmp NIET filteren op venster → blijft 1-op-1 met months uitgelijnd (buiten-venster = €0)
    function agg(ms) { var r = { off: 0, offC: 0, offZ: 0, cat: {}, pers: {}, plan: 0 }; (ms || []).forEach(function (m) { r.off += cube.offMaand[m] || 0; r.offC += cube.offCountMaand[m] || 0; r.offZ += cube.offZonderMaand[m] || 0; var cm = cube.catMaand[m]; if (cm) for (var c in cm) { r.cat[c] = (r.cat[c] || 0) + cm[c]; r.plan += cm[c]; } var pm = cube.persMaand[m]; if (pm) for (var id in pm) { r.pers[id] = (r.pers[id] || 0) + pm[id]; } }); return r; }
    var A = agg(months), C = cmp ? agg(cmp) : null;
    var dlt = function (cur, prev) { if (prev == null || prev <= 0) return ''; var p = Math.round((cur - prev) / prev * 100); if (p === 0) return ''; var cls = p > 0 ? 'up' : 'down'; return '<span class="dlt ' + cls + '">' + (p > 0 ? '+' : '−') + Math.abs(p) + '%</span>'; };
    var stat = function (n, l, br, del) { return '<div class="tstat ' + br + '"><div class="n">' + n + (del || '') + '</div><div class="l">' + l + '</div></div>'; };
    // gestapelde grafiek + filterchips voor één dimensie
    function dimBlock(dimKey, dimMap, orderedKeys, colorOf, labelOf, offMap) {
      var tot = {}; orderedKeys.forEach(function (k) { tot[k] = 0; });
      months.forEach(function (m) { var dm = dimMap[m]; if (dm) for (var k in dm) { if (tot[k] == null) tot[k] = 0; tot[k] += dm[k]; } });
      var grand = 0; orderedKeys.forEach(function (k) { grand += tot[k] || 0; });
      var vis = orderedKeys.filter(function (k) { return !offMap[k] && (tot[k] || 0) > 0; }).sort(function (a, b) { return tot[b] - tot[a]; });
      var shown = vis.slice(0, 7), rest = vis.slice(7);
      var valAt = function (m, k) { return (dimMap[m] && dimMap[m][k]) || 0; };
      var restAt = function (m) { var s = 0; rest.forEach(function (k) { s += valAt(m, k); }); return s; };
      var stackTot = function (m) { var s = restAt(m); shown.forEach(function (k) { s += valAt(m, k); }); return s; };
      var monTot = months.map(stackTot);
      var ghost = months.map(function (m) { var s = 0; orderedKeys.forEach(function (k) { if (offMap[k]) s += valAt(m, k); }); return s; });
      var cmpTot = cmp ? cmp.map(stackTot) : null;
      var maxT = Math.max.apply(null, months.map(function (_m, i) { return monTot[i] + ghost[i]; }).concat(cmpTot || []).concat([1]));
      var barSegs = function (m, withTitle) {
        var out = shown.map(function (k) { var v = valAt(m, k); if (v <= 0) return ''; return '<span class="stk-seg" style="width:' + (v / maxT * 100) + '%;background:' + colorOf(k) + '"' + (withTitle ? ' data-tip="' + esc(monthLabel(m) + ' · ' + labelOf(k) + ': ' + eur(v)) + '"' : '') + '></span>'; }).join('');
        var rv = restAt(m); if (rv > 0) out += '<span class="stk-seg" style="width:' + (rv / maxT * 100) + '%;background:#b9b3bd"' + (withTitle ? ' data-tip="' + esc(monthLabel(m) + ' · Overig: ' + eur(rv)) + '"' : '') + '></span>';
        return out;
      };
      var chips = orderedKeys.filter(function (k) { return (tot[k] || 0) > 0 || offMap[k]; }).map(function (k) {
        var on = !offMap[k], pv = grand ? Math.round((tot[k] || 0) / grand * 100) : 0;
        return '<button class="fin-chip' + (on ? '' : ' off') + '" data-dim="' + dimKey + '" data-k="' + esc(String(k)) + '"><i style="background:' + colorOf(k) + '"></i><span class="fc-n">' + esc(labelOf(k)) + '</span><span class="fc-v">' + eur(tot[k] || 0) + ' · ' + pv + '%</span></button>';
      }).join('');
      var rows = months.length ? months.map(function (m, i) {
        var gh = ghost[i] > 0 ? '<span class="stk-ghost" style="width:' + (ghost[i] / maxT * 100) + '%" title="weggefilterd: ' + eur(ghost[i]) + '"></span>' : '';
        var mainBar = '<span class="stk-bar">' + barSegs(m, true) + gh + '</span>';
        var cmpBar = '', dl = '';
        if (cmp) {
          cmpBar = '<span class="stk-bar stk-bar-c" title="' + monthLabel(cmp[i]) + ': ' + eur(cmpTot[i]) + '">' + barSegs(cmp[i], false) + '</span>';
          var pp = cmpTot[i] > 0 ? Math.round((monTot[i] - cmpTot[i]) / cmpTot[i] * 100) : null;
          if (pp != null) dl = '<span class="stk-dl ' + (pp > 0 ? 'up' : pp < 0 ? 'down' : 'flat') + '">' + (pp > 0 ? '+' : pp < 0 ? '−' : '') + Math.abs(pp) + '%</span>';
        }
        return '<div class="stk-row' + (cmp ? ' has-cmp' : '') + '"><span class="stk-lab">' + monthLabel(m) + '</span><span class="stk-bars">' + mainBar + cmpBar + '</span><span class="stk-tot">' + (monTot[i] ? eur(monTot[i]) : '-') + dl + '</span></div>';
      }).join('') : '<div class="empty" style="padding:14px"><p>Geen data in deze periode.</p></div>';
      // grootste stijger/daler (enkel bij vergelijking)
      var moversHtml = '';
      if (cmp) {
        var cmpByKey = {}; orderedKeys.forEach(function (k) { cmpByKey[k] = 0; });
        cmp.forEach(function (m) { var dm = dimMap[m]; if (dm) for (var k in dm) { if (cmpByKey[k] == null) cmpByKey[k] = 0; cmpByKey[k] += dm[k]; } });
        var mv = orderedKeys.map(function (k) { if (offMap[k]) return null; var prev = cmpByKey[k] || 0; if (prev <= 0) return null; return { k: k, pc: Math.round(((tot[k] || 0) - prev) / prev * 100) }; }).filter(Boolean);
        var ris = mv.filter(function (x) { return x.pc > 0; }).sort(function (a, b) { return b.pc - a.pc; })[0];
        var fal = mv.filter(function (x) { return x.pc < 0; }).sort(function (a, b) { return a.pc - b.pc; })[0];
        var pl = '';
        if (ris) pl += '<span class="fin-mover up">' + esc(labelOf(ris.k)) + ' +' + ris.pc + '%</span>';
        if (fal) pl += '<span class="fin-mover down">' + esc(labelOf(fal.k)) + ' −' + Math.abs(fal.pc) + '%</span>';
        if (pl) moversHtml = '<div class="fin-movers"><span class="fin-mlbl">t.o.v. vorige periode:</span>' + pl + '</div>';
      }
      var allOff = (!shown.length && months.length) ? '<div class="empty" style="padding:10px"><p>Alles uitgevinkt, klik “Alles” of een chip om weer te tonen.</p></div>' : '';
      return '<div class="fin-chiprow">' + chips + '</div><div class="fin-quick"><button data-act="all" data-dim="' + dimKey + '">Alles</button><button data-act="none" data-dim="' + dimKey + '">Geen</button><button data-act="inv" data-dim="' + dimKey + '">Omkeren</button></div>' + moversHtml + (cmp ? '<div class="stk-cmp-note">Lichte balk = vergelijkingsperiode · delta = deze maand t.o.v. die maand</div>' : '') + allOff + '<div class="stk"><div class="stk-rows">' + rows + '</div></div>';
    }
    var catKeys = (d.categorie || []).map(function (c) { return c.categorie; });
    var catBlock = '<div class="fincard"><h3>Per type job <span class="fc-hint">klik om te filteren</span></h3>' +
      dimBlock('cat', cube.catMaand, catKeys, function (k) { return d._catCol[k] || '#999'; }, function (k) { return k; }, f.catsOff) + '</div>';
    var hasPers = d.per_persoon && d.per_persoon.length && cube.persMaand && Object.keys(cube.persMaand).length;
    var persBlock = hasPers ? '<div class="fincard"><h3>Per teamlid <span class="fc-hint">klik om te filteren</span></h3>' +
      dimBlock('pers', cube.persMaand, (d.per_persoon || []).map(function (p) { return String(p.id); }), function (k) { return d._persCol[k] || '#999'; }, function (k) { return voornaam(cube.persNaam[k] || ('#' + k)); }, f.persOff) + '</div>' : '';
    // offertes per maand (geselecteerde periode)
    var offMax = Math.max.apply(null, months.map(function (m) { return cube.offMaand[m] || 0; }).concat([1]));
    var offBars = months.length ? months.map(function (m) { var v = cube.offMaand[m] || 0; return '<div class="cbar' + (v ? '' : ' green') + '"><span class="cbar-l">' + monthLabel(m) + '</span><span class="cbar-t"><i style="width:' + pct(v, offMax) + '%"></i></span><span class="cbar-v">' + (v ? eur(v) : '-') + '</span></div>'; }).join('') : '<div class="empty" style="padding:14px"><p>Geen offertes in deze periode.</p></div>';
    // filterbalk
    var yrs = []; for (var y = f._y; y >= f._y - 3; y--) yrs.push(y);
    var perOpts = [['laatste_12_maanden', 'Laatste 12 maanden'], ['deze_maand', 'Deze maand'], ['vorige_maand', 'Vorige maand'], ['dit_kwartaal', 'Dit kwartaal'], ['vorig_kwartaal', 'Vorig kwartaal'], ['dit_jaar', 'Dit jaar'], ['vorig_jaar', 'Vorig jaar']].concat(yrs.map(function (yy) { return ['jaar:' + yy, 'Jaar ' + yy]; })).concat([['custom', 'Aangepast (van-tot)'], ['alles', 'Alles']]);
    var perSel = '<select id="fin-per" class="fin-sel" aria-label="Periode">' + perOpts.map(function (o) { return '<option value="' + o[0] + '"' + (f.periode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
    var cmpSel = '<select id="fin-cmp" class="fin-sel" aria-label="Vergelijk">' + [['', 'Niet vergelijken'], ['vorige_periode', 'vs vorige periode'], ['vorig_jaar', 'vs vorig jaar']].map(function (o) { return '<option value="' + o[0] + '"' + (f.compare === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
    var cubeYrs = []; (cube.maanden || []).forEach(function (m) { var y = m.slice(0, 4); if (cubeYrs.indexOf(y) < 0) cubeYrs.push(y); });
    var MND = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], MNDLBL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    var ymSel = function (idp, val) {
      var y = (val || '').slice(0, 4), mm = (val || '').slice(5, 7);
      var yo = cubeYrs.map(function (yy) { return '<option value="' + yy + '"' + (yy === y ? ' selected' : '') + '>' + yy + '</option>'; }).join('');
      var mo = MND.map(function (mn, i) { return '<option value="' + mn + '"' + (mn === mm ? ' selected' : '') + '>' + MNDLBL[i] + '</option>'; }).join('');
      return '<select class="fin-sel sm" id="' + idp + '-y">' + yo + '</select><select class="fin-sel sm" id="' + idp + '-m">' + mo + '</select>';
    };
    var customBox = f.periode === 'custom' ? '<label class="fin-fld"><span>Van-tot</span><span class="fin-custom">' + ymSel('fin-van', f.van) + '<span>tot</span>' + ymSel('fin-tot', f.tot) + '</span></label>' : '';
    var perLabels = { deze_maand: 'Deze maand', vorige_maand: 'Vorige maand', dit_kwartaal: 'Dit kwartaal', vorig_kwartaal: 'Vorig kwartaal', dit_jaar: 'Dit jaar', vorig_jaar: 'Vorig jaar', laatste_12_maanden: 'Laatste 12 maanden', custom: 'Aangepast', alles: 'Alles' };
    var perLabel = perLabels[f.periode] || (/^jaar:/.test(f.periode) ? ('Jaar ' + f.periode.slice(5)) : f.periode);
    var cmpLabel = f.compare === 'vorige_periode' ? ' · vs vorige periode' : f.compare === 'vorig_jaar' ? ' · vs vorig jaar' : '';
    var expBtns ='<span class="fin-exp"><button class="fin-pdf" id="fin-pdf" title="Exporteer deze view als PDF"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> PDF</button><button class="fin-pdf" id="fin-csv" title="Exporteer als CSV (Excel)"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg> CSV</button></span>';
    // ── omzet per onderneming (S27/27M/27A/ZVD) over de geselecteerde periode ──
    var ORG_COL = { S27: '#3083DC', '27M': '#F697CE', '27A': '#9441DB', ZVD: '#12AC4E', Onbekend: '#b9b3bd' };
    var orgTot = {}; months.forEach(function (m) { var om = cube.orgMaand && cube.orgMaand[m]; if (om) for (var k in om) orgTot[k] = (orgTot[k] || 0) + om[k]; });
    var orgKeys = Object.keys(orgTot).filter(function (k) { return orgTot[k] > 0; }).sort(function (a, b) { return orgTot[b] - orgTot[a]; });
    var orgGrand = orgKeys.reduce(function (s, k) { return s + orgTot[k]; }, 0);
    var orgMax = Math.max.apply(null, orgKeys.map(function (k) { return orgTot[k]; }).concat([1]));
    var orgBars = orgKeys.length ? orgKeys.map(function (k) { var v = orgTot[k]; return '<div class="cbar"><span class="cbar-l">' + esc(k) + '</span><span class="cbar-t"><i style="width:' + pct(v, orgMax) + '%;background:' + (ORG_COL[k] || '#999') + '"></i></span><span class="cbar-v">' + eur(v) + ' · ' + pct(v, orgGrand) + '%</span></div>'; }).join('') : '<div class="empty" style="padding:14px"><p>Geen omzet in deze periode.</p></div>';
    var orgBlock = '<div class="fincard"><h3>Per onderneming</h3><div class="cbars">' + orgBars + '</div></div>';
    // ── capaciteit & bezetting (uit teamCapaciteit) ──
    var cap = state.cap; var capHtml = '';
    if (cap && cap.ok && Array.isArray(cap.per_lid) && cap.per_lid.length) {
      var WK = 38, MK = 160;   // ~voltijds per week / per maand
      var pw = function (u, c) { return Math.min(100, Math.round(u / c * 100)); };
      var ccls = function (u, c) { return u < c * 0.1 ? ' low' : (u > c ? ' over' : ''); };
      var capBar = function (u, c) { return '<span class="fcap-wk"><i class="fcap-bar' + ccls(u, c) + '"><b style="width:' + pw(u, c) + '%"></b></i><span class="fcap-u">' + (Math.round(u * 10) / 10) + 'u</span></span>'; };
      var capRows = cap.per_lid.map(function (l) {
        var maand = (l.maand != null ? l.maand : 0), deze = (l.weken && l.weken.deze) || 0, vol = (l.weken && l.weken.volgende) || 0;
        return '<div class="fcap-row"><span class="fcap-nm">' + esc(voornaam(l.naam)) + '</span>' +
          capBar(maand, MK) + capBar(deze, WK) + capBar(vol, WK) +
          '<span class="fcap-bl">' + (l.aantal || 0) + ' · ' + (Math.round((l.uren || 0) * 10) / 10) + 'u</span></div>';
      }).join('');
      var prog = cap.prognose || {};
      capHtml = '<div class="fincard"><h3>Bezetting van het team</h3><div class="fcap-scroll"><div class="fcap-head"><span>Teamlid</span><span>Deze maand</span><span>Deze week</span><span>Volg. week</span><span>Te plannen</span></div>' + capRows + '</div>' +
        '<details class="fin-mini"><summary>Hoe lees ik dit?</summary><p>Week-uren tegenover ' + WK + 'u (groen = ruimte, rood = overboekt). "Deze maand" = ingeplande uren met deadline deze maand (voor wie met maandplanning werkt). "Te plannen" = startklare backlog' + (prog.weken_backlog != null ? ' · ±' + prog.weken_backlog + ' wk teambreed' : '') + '.</p></details></div>';
    }
    // ── AI-winstadviseur (laadt async; periode-onafhankelijk → 1x laden, cache in state) ──
    var adviesBlock = advBlock('fin');
    var salesAdviesBlock = advBlock('sales');
    var rendAdviesBlock = advBlock('rend');
    // ── omzet vs target per UITVOEREND teamlid (Vincent + Ilke niet; pro rata deeltijd + startdatum) ──
    var TARGET_PM = 11000, NON_EXEC = { '8714037': 1, '48338421': 1, '8725564': 1, '82651156': 1, '60375565': 1 };   // Vincent, Ilke, Wout + ex (Eva, Lara)
    var FTE_CFG = { '82624365': { fte: 0.6, start: '2026-06' }, '106597135': { fte: 1, start: '2026-03' } };   // Viktor 3/5 sinds juni; Griet Beyens sinds maart 2026
    var monthsEl = months.filter(function (m) { return m <= nuYM; });   // enkel t/m vandaag (geen toekomst)
    var persPer = {}; monthsEl.forEach(function (m) { var pm = cube.persMaand[m]; if (pm) for (var id in pm) { if (NON_EXEC[id]) continue; persPer[id] = (persPer[id] || 0) + pm[id]; } });
    var persTargetFor = function (id) { var c = FTE_CFG[id] || {}; var fte = (c.fte != null) ? c.fte : 1; var act = c.start ? monthsEl.filter(function (m) { return m >= c.start; }).length : monthsEl.length; return TARGET_PM * fte * (act || 0); };
    var tIds = Object.keys(persPer).filter(function (id) { return persPer[id] > 0; }).sort(function (a, b) { return persPer[b] - persPer[a]; });
    var targetBlock = '';
    if (tIds.length) {
      var tMax = Math.max.apply(null, tIds.map(function (id) { return Math.max(persPer[id], persTargetFor(id)); }).concat([1]));
      var tRows = tIds.map(function (id) {
        var v = persPer[id], tgt = persTargetFor(id), hit = tgt > 0 && v >= tgt, pctT = tgt ? Math.round(v / tgt * 100) : 0;
        var c = FTE_CFG[id], note = (c && c.fte && c.fte < 1) ? ' <span class="tgt-ft">' + Math.round(c.fte * 5) + '/5</span>' : '';
        return '<button class="tgt-row" data-mid="' + esc(id) + '" title="Klik om te zien welke taken deze omzet opbrachten">' +
          '<span class="tgt-nm">' + esc(voornaam(cube.persNaam[id] || ('#' + id))) + note + '</span>' +
          '<span class="tgt-track"><i class="tgt-fill ' + (hit ? 'hit' : 'miss') + '" style="width:' + Math.min(100, v / tMax * 100) + '%"></i><span class="tgt-line" style="left:' + (tgt / tMax * 100) + '%" title="target € ' + Math.round(tgt) + '"></span></span>' +
          '<span class="tgt-val">' + eur(v) + ' <span class="tgt-pct ' + (hit ? 'hit' : 'miss') + '">' + pctT + '%</span></span></button>';
      }).join('');
      targetBlock = '<div class="fincard"><h3>Omzet vs target <span class="fc-hint">uitvoerend team · €' + (TARGET_PM / 1000) + 'k/maand per VTE · klik voor de taken</span></h3><div class="tgt-list">' + tRows + '</div></div>';
    }
    // ── uitgebrachte offertes per maand · gesplitst Arne vs Vincent (productiviteit) ──
    var OI_COL = { Arne: '#3083DC', Vincent: '#9441DB', Overig: '#b9b3bd' };
    var oiSum = { Arne: { n: 0, eur: 0 }, Vincent: { n: 0, eur: 0 }, Overig: { n: 0, eur: 0 } };
    var oiMonths = months.map(function (m) {
      var o = (cube.offIssuerMaand && cube.offIssuerMaand[m]) || {};
      ['Arne', 'Vincent', 'Overig'].forEach(function (k) { if (o[k]) { oiSum[k].n += o[k].n; oiSum[k].eur += o[k].eur; } });
      return { m: m, a: (o.Arne || { n: 0, eur: 0 }), v: (o.Vincent || { n: 0, eur: 0 }), o: (o.Overig || { n: 0, eur: 0 }) };
    });
    var oiMax = Math.max.apply(null, oiMonths.map(function (x) { return x.a.n + x.v.n + x.o.n; }).concat([1]));
    var oiTotN = oiSum.Arne.n + oiSum.Vincent.n + oiSum.Overig.n;
    var offIssuerBlock = '';
    if (oiTotN > 0) {
      var oiRows = oiMonths.filter(function (x) { return (x.a.n + x.v.n + x.o.n) > 0; }).map(function (x) {
        var bar = (x.a.n > 0 ? '<span class="stk-seg" style="width:' + (x.a.n / oiMax * 100) + '%;background:' + OI_COL.Arne + '" data-tip="' + esc(monthLabel(x.m) + ' · Arne: ' + x.a.n + ' offerte(s) · ' + eur(x.a.eur)) + '"></span>' : '') +
          (x.v.n > 0 ? '<span class="stk-seg" style="width:' + (x.v.n / oiMax * 100) + '%;background:' + OI_COL.Vincent + '" data-tip="' + esc(monthLabel(x.m) + ' · Vincent: ' + x.v.n + ' offerte(s) · ' + eur(x.v.eur)) + '"></span>' : '') +
          (x.o.n > 0 ? '<span class="stk-seg" style="width:' + (x.o.n / oiMax * 100) + '%;background:' + OI_COL.Overig + '" data-tip="' + esc(monthLabel(x.m) + ' · Overig: ' + x.o.n) + '"></span>' : '');
        return '<div class="stk-row"><span class="stk-lab">' + monthLabel(x.m) + '</span><span class="stk-bars"><span class="stk-bar">' + bar + '</span></span><span class="stk-tot">' + (x.a.n + x.v.n + x.o.n) + '</span></div>';
      }).join('');
      var oiChip = function (naam, d) { return '<span class="fin-chip" style="cursor:default"><i style="background:' + OI_COL[naam] + '"></i><span class="fc-n">' + naam + '</span><span class="fc-v">' + d.n + ' offertes · ' + eur(d.eur) + '</span></span>'; };
      var oiLegend = '<div class="fin-chiprow">' + oiChip('Arne', oiSum.Arne) + oiChip('Vincent', oiSum.Vincent) + (oiSum.Overig.n ? '<span class="fin-chip" style="cursor:default"><i style="background:' + OI_COL.Overig + '"></i><span class="fc-n">Overig</span><span class="fc-v">' + oiSum.Overig.n + ' offertes</span></span>' : '') + '</div>';
      offIssuerBlock = '<div class="fincard"><h3>Offertes · Arne vs Vincent <span class="fc-hint">aantal per maand</span></h3>' + oiLegend + '<div class="stk"><div class="stk-rows">' + oiRows + '</div></div></div>';
    }
    var topOff = (d.offertes && d.offertes.top) || [];
    var topOffBlock = '<div class="fincard"><h3>Top offertes <span class="fc-hint">hoogste bedragen</span></h3><div class="cbars">' + (topOff.length ? topOff.map(function (t) { return '<div class="cbar"><span class="cbar-l" style="width:auto;flex:1">' + esc(t.naam) + '</span><span class="cbar-v">' + eur(t.bedrag) + '</span></div>'; }).join('') : '<div class="empty" style="padding:10px"><p>Nog geen offertes met bedrag.</p></div>') + '</div></div>';
    var offBarsBlock = '<div class="fincard"><h3>Offertes per maand</h3><div class="cbars">' + offBars + '</div></div>';
    // ── UURTARIEVEN (bedrijfseconomie): omzet ÷ uren per tak/persoon (intern al gefilterd in backend) ──
    var TARGET = d.tarief_target || 85;
    var aggMap = function (map, ms) { var r = {}; (ms || []).forEach(function (m) { var dm = map[m]; if (dm) for (var k in dm) r[k] = (r[k] || 0) + dm[k]; }); return r; };
    var catUur = aggMap(cube.catUurMaand || {}, months);
    var persUur = aggMap(cube.persUurMaand || {}, months);
    var tarTier = function (r) { return r < (TARGET - 15) ? 'rood' : r < TARGET ? 'geel' : 'groen'; };
    var tarTable = function (omzetMap, uurMap, labelOf) {
      var keys = Object.keys(omzetMap).filter(function (k) { return omzetMap[k] > 0; }).sort(function (a, b) { return omzetMap[b] - omzetMap[a]; });
      if (!keys.length) return '<div class="empty" style="padding:10px"><p>Geen omzet in deze periode.</p></div>';
      return '<div class="tar-row tar-head"><span class="tar-nm"></span><span class="tar-omz">omzet</span><span class="tar-uren">uren</span><span class="tar-eu">€/u</span></div>' + keys.map(function (k) {
        var omzet = omzetMap[k], uur = uurMap[k] || 0, euc;
        if (uur > 0) { var rr = Math.round(omzet / uur); euc = '<span class="tar-eu ' + tarTier(rr) + '">€' + rr + '</span>'; } else euc = '<span class="tar-eu none">-</span>';
        return '<div class="tar-row"><span class="tar-nm">' + esc(labelOf(k)) + '</span><span class="tar-omz">' + eur(omzet) + '</span><span class="tar-uren">' + (uur ? Math.round(uur) + 'u' : '-') + '</span>' + euc + '</div>';
      }).join('');
    };
    var tarTakBlock = '<div class="fincard"><h3>Uurtarief per tak <span class="fc-hint">omzet ÷ alle klantenuren · doel €' + TARGET + '/u</span></h3>' + tarTable(A.cat, catUur, function (k) { return k; }) + '</div>';
    var tarPersBlock = '<div class="fincard"><h3>Uurtarief per persoon <span class="fc-hint">doel €' + TARGET + '/u</span></h3>' + tarTable(A.pers, persUur, function (id) { return voornaam(cube.persNaam[id] || ('#' + id)); }) + '</div>';
    var totOmzet = 0, totUur = 0; for (var _ko in A.cat) totOmzet += A.cat[_ko]; for (var _ku in catUur) totUur += catUur[_ku];
    var gemTar = totUur > 0 ? Math.round(totOmzet / totUur) : 0;
    var internInfo = d.intern || { budget: 0, uren: 0 };
    // ── KPI-rijen per tab ──
    var salesKpis = '<div class="tstats tstats-3">' + stat(eur(A.off), 'Offertes uitgebracht', 'br-green', C ? dlt(A.off, C.off) : '') + stat(A.offC, 'Aantal offertes', 'br-blue', C ? dlt(A.offC, C.offC) : '') + stat(A.offZ, 'Zonder bedrag', A.offZ ? 'br-orange' : 'br-green') + '</div>';
    var econKpis = '<div class="tstats tstats-3">' + stat(eur(A.plan), 'Omzet (gepland)', 'br-purple', C ? dlt(A.plan, C.plan) : '') + stat(gemTar ? '€' + gemTar : '-', 'Gem. uurtarief', gemTar ? (gemTar >= TARGET ? 'br-green' : 'br-orange') : 'br-blue') + stat(internInfo.uren ? Math.round(internInfo.uren) + 'u' : '0u', 'Intern werk (excl.)', 'br-blue') + '</div>';
    // ── tab-bar + per-tab content ──
    var FIN_TABS = [['sales', 'Sales & offertes'], ['econ', 'Bedrijfseconomie'], ['rendement', 'Projectrendement']];
    var tabBar = '<div class="fin-tabs">' + FIN_TABS.map(function (t) { return '<button class="fin-tab' + (f.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var content;
    if (f.tab === 'sales') {
      content = salesAdviesBlock + salesKpis + '<div class="fin-grid2">' + offBarsBlock + (offIssuerBlock || '<div class="fincard"><h3>Offertes · Arne vs Vincent</h3><div class="empty" style="padding:10px"><p>Geen data in deze periode.</p></div></div>') + '</div>' + topOffBlock;
    } else if (f.tab === 'rendement') {
      content = rendAdviesBlock + '<div id="rend-mount">' + (state.rend ? renderRendement(state.rend) : '<div class="fincard"><div class="adv2-loading">Projectrendement berekenen…</div></div>') + '</div>';
    } else {
      content = adviesBlock + econKpis +
        '<div class="fin-grid2">' + orgBlock + tarTakBlock + '</div>' +
        tarPersBlock + targetBlock + capHtml +
        '<details class="fin-acc" data-acc="detail"' + (f.acc.detail ? ' open' : '') + '><summary>Omzet-evolutie in detail<span class="acc-sub">per tak &amp; per teamlid, per maand</span></summary><div class="fin-acc-bd">' + catBlock + persBlock + '</div></details>';
    }
    var headSub = (f.tab === 'rendement') ? 'lopende projecten' : (esc(perLabel) + (months.length ? ' · ' + months.length + ' maanden' : '') + cmpLabel);
    page.innerHTML = '<div class="panel active">' +
      '<div class="fin-top"><div class="t-hero"><h1>Cijfers &amp; Capaciteit</h1><div class="sub">' + headSub + '</div></div>' +
      (f.tab !== 'rendement' ? '<div class="fin-toolbar">' + perSel + cmpSel + customBox + expBtns + '</div>' : '') + '</div>' +
      tabBar + content +
      '<p class="fin-note">' + esc(d.disclaimer) + '</p></div>';
    // ── wiring ──
    wireTips();
    var redraw = function () { drawCijfers(page); };
    if ($('fin-per')) $('fin-per').onchange = function () { f.periode = this.value; redraw(); };
    if ($('fin-cmp')) $('fin-cmp').onchange = function () { f.compare = this.value; redraw(); };
    if ($('fin-pdf')) $('fin-pdf').onclick = function () { pdfCijfers(); };
    if ($('fin-csv')) $('fin-csv').onclick = function () { csvCijfers(); };
    if ($('fin-van-y')) { var updYM = function () { var vy = $('fin-van-y'), vm = $('fin-van-m'), ty = $('fin-tot-y'), tm = $('fin-tot-m'); f.van = vy.value + '-' + vm.value; f.tot = ty.value + '-' + tm.value; redraw(); }; $('fin-van-y').onchange = updYM; $('fin-van-m').onchange = updYM; $('fin-tot-y').onchange = updYM; $('fin-tot-m').onchange = updYM; }
    // tab-wissel
    Array.prototype.forEach.call(page.querySelectorAll('.fin-tab'), function (b) { b.onclick = function () { f.tab = b.getAttribute('data-tab'); redraw(); if (f.tab === 'rendement' && !state.rend) loadRendement(page); }; });
    Array.prototype.forEach.call(page.querySelectorAll('.fin-chip'), function (c) { c.onclick = function () { var dim = c.getAttribute('data-dim') === 'pers' ? f.persOff : f.catsOff; var k = c.getAttribute('data-k'); if (dim[k]) delete dim[k]; else dim[k] = 1; redraw(); }; });
    Array.prototype.forEach.call(page.querySelectorAll('.fin-quick button'), function (b) {
      b.onclick = function () {
        var isPers = b.getAttribute('data-dim') === 'pers', off = isPers ? f.persOff : f.catsOff, keys = isPers ? (d.per_persoon || []).map(function (p) { return String(p.id); }) : (d.categorie || []).map(function (c) { return c.categorie; });
        var act = b.getAttribute('data-act');
        if (act === 'all') { if (isPers) f.persOff = {}; else f.catsOff = {}; }
        else if (act === 'none') { var n = {}; keys.forEach(function (k) { n[k] = 1; }); if (isPers) f.persOff = n; else f.catsOff = n; }
        else { var inv = {}; keys.forEach(function (k) { if (!off[k]) inv[k] = 1; }); if (isPers) f.persOff = inv; else f.catsOff = inv; }
        redraw();
      };
    });
    // AI-adviseurs per tab: refresh-knoppen + lazy laden (1x per tab)
    // AI-adviseurs (checklist + feedback): gedelegeerde clicks (1x gebonden) + lazy laden per tab
    if (!page._advDeleg) {
      page._advDeleg = true;
      page.addEventListener('click', function (e) {
        var el = e.target.closest && e.target.closest('[data-chkbox],[data-advref],[data-fbtoggle],[data-fbsend]'); if (!el) return;
        if (el.hasAttribute('data-chkbox')) { e.preventDefault(); checkAdviesItem(el.getAttribute('data-type'), el.getAttribute('data-chkbox')); }
        else if (el.hasAttribute('data-advref')) refreshAdvisor(el.getAttribute('data-advref'));
        else if (el.hasAttribute('data-fbtoggle')) toggleAdvFb(el.getAttribute('data-fbtoggle'));
        else if (el.hasAttribute('data-fbsend')) sendAdvFb(el.getAttribute('data-fbsend'));
      });
    }
    if (f.tab === 'econ' && !advState('fin').loaded) loadAdvisor('fin');
    if (f.tab === 'sales' && !advState('sales').loaded) loadAdvisor('sales');
    // klik op een teamlid in de targetlijst → drill-down naar de taken per maand
    Array.prototype.forEach.call(page.querySelectorAll('.tgt-row'), function (b) { b.onclick = function () { openOmzetDetail(b.getAttribute('data-mid'), voornaam(cube.persNaam[b.getAttribute('data-mid')] || '')); }; });
    // uitklap-secties: open/dicht onthouden zodat een filterwijziging ze niet dichtklapt
    Array.prototype.forEach.call(page.querySelectorAll('details.fin-acc[data-acc]'), function (dt) { dt.ontoggle = function () { f.acc[dt.getAttribute('data-acc')] = dt.open; }; });
    // projectrendement laden bij (eerste) bezoek aan die tab
    if (f.tab === 'rendement' && !state.rend) loadRendement(page);
    else if (f.tab === 'rendement' && state.rend) drawRendement();   // al geladen → wire periode/vergelijk/export
  }
  // ── PROJECTRENDEMENT: €/u per lopend project laden + renderen ──
  async function loadRendement(page) {
    var r; try { r = await api('teamRendement', {}, { timeout: 40000 }); } catch (e) { r = null; }
    if (state.route !== 'cijfers') return;
    var box = $('rend-mount'); if (!box) return;
    if (r && r.ok && r.computing) { box.innerHTML = '<div class="fincard"><div class="adv2-loading">Projectrendement wordt voor de eerste keer berekend (±1 min)…</div></div>'; setTimeout(function () { if (state.route === 'cijfers' && (state.finF || {}).tab === 'rendement') loadRendement(page); }, 12000); return; }
    if (!r || !r.ok) { box.innerHTML = '<div class="fincard"><div class="adv2-loading">Kon het projectrendement niet laden, open de tab opnieuw.</div></div>'; return; }
    state.rend = r;
    drawRendement();   // rendert + wiret periode/vergelijk/PDF/CSV
    if (!advState('rend').loaded) loadAdvisor('rend');   // rendementdata is nu klaar → adviseur kan laden
  }
  // (oude losse adviseur-loaders vervangen door de uniforme component onderaan: advBlock/loadAdvisor/...)
  // ── Projectrendement: periode-filter + vergelijken + PDF/CSV-export ──
  function rendMonths(per) { if (per === 'lopend') return null; var now = new Date(); var nuYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); return finMonths(per, {}, nuYM) || []; }
  function rendFilter(projs, per) { if (per === 'lopend') return projs.filter(function (p) { return p.actief; }); var ms = rendMonths(per); if (!ms || !ms.length) return projs.filter(function (p) { return p.actief; }); var set = {}; ms.forEach(function (m) { set[m] = 1; }); return projs.filter(function (p) { return (p.maanden || []).some(function (m) { return set[m]; }); }); }
  function rendPrevSet(projs, per) { var ms = rendMonths(per); if (!ms || !ms.length) return null; var prev = ms.map(function (m) { return finAddM(m, -ms.length); }); var set = {}; prev.forEach(function (m) { set[m] = 1; }); return projs.filter(function (p) { return (p.maanden || []).some(function (m) { return set[m]; }); }); }
  function rendSum(set, target) { var onder = 0, tb = 0, tu = 0; set.forEach(function (p) { if (p.tarief < target) onder++; tb += p.budget; tu += p.uren; }); return { aantal: set.length, onder: onder, gem: tu ? Math.round(tb / tu) : 0 }; }
  function rendCurrent() { var r = state.rend || {}; var per = (state.finF && state.finF.rendPer) || 'lopend'; var projs = rendFilter(r.projecten || [], per).slice().sort(function (a, b) { return a.tarief - b.tarief; }); return { r: r, per: per, projs: projs, target: r.target || 85 }; }
  function renderRendement(r) {
    var f = state.finF; if (!f.rendPer) f.rendPer = 'lopend'; if (f.rendCmp == null) f.rendCmp = '';
    var TARGET = r.target || 85, per = f.rendPer, cmp = f.rendCmp, all = r.projecten || [];
    var projs = rendFilter(all, per).slice().sort(function (a, b) { return a.tarief - b.tarief; });
    var sum = rendSum(projs, TARGET);
    var cmpSum = (per !== 'lopend' && cmp === 'vorige_periode') ? (function () { var pv = rendPrevSet(all, per); return pv ? rendSum(pv, TARGET) : null; })() : null;
    var perOpts = [['lopend', 'Lopende projecten'], ['dit_kwartaal', 'Dit kwartaal'], ['vorig_kwartaal', 'Vorig kwartaal'], ['dit_jaar', 'Dit jaar'], ['vorig_jaar', 'Vorig jaar'], ['laatste_12_maanden', 'Laatste 12 maanden']];
    var perSel = '<select id="rend-per" class="fin-sel" aria-label="Periode">' + perOpts.map(function (o) { return '<option value="' + o[0] + '"' + (per === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
    var cmpSel = per === 'lopend' ? '' : '<select id="rend-cmp" class="fin-sel" aria-label="Vergelijk"><option value=""' + (cmp === '' ? ' selected' : '') + '>Niet vergelijken</option><option value="vorige_periode"' + (cmp === 'vorige_periode' ? ' selected' : '') + '>vs vorige periode</option></select>';
    var exp = '<span class="fin-exp"><button class="fin-pdf" id="rend-pdf" title="Exporteer als PDF"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> PDF</button><button class="fin-pdf" id="rend-csv" title="Exporteer als CSV"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg> CSV</button></span>';
    var toolbar = '<div class="fin-toolbar rend-tools">' + perSel + cmpSel + exp + '</div>';
    var dlt2 = function (cur, prev) { if (cmpSum == null || prev == null || prev <= 0) return ''; var p = Math.round((cur - prev) / prev * 100); if (p === 0) return ''; return ' <span class="dlt ' + (p > 0 ? 'up' : 'down') + '">' + (p > 0 ? '+' : '−') + Math.abs(p) + '%</span>'; };
    var k = function (n, l, br) { return '<div class="tstat ' + br + '"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; };
    var kpis = '<div class="tstats tstats-3">' + k(sum.aantal, per === 'lopend' ? 'Lopende projecten' : 'Projecten', 'br-blue') + k(sum.onder, 'Onder €' + TARGET + '/u', sum.onder > 0 ? 'br-orange' : 'br-green') + k('€' + sum.gem + dlt2(sum.gem, cmpSum ? cmpSum.gem : null), 'Gem. €/u', sum.gem >= TARGET ? 'br-green' : 'br-orange') + '</div>';
    if (!projs.length) return toolbar + kpis + '<div class="fincard"><div class="empty"><p>Geen projecten in deze periode (met budget én geplande uren).</p></div></div>';
    var maxT = Math.max.apply(null, projs.map(function (p) { return p.tarief; }).concat([TARGET, 1]));
    var rows = projs.map(function (p) {
      var w = Math.min(100, p.tarief / maxT * 100), tw = TARGET / maxT * 100;
      var flag = (per !== 'lopend' && !p.actief) ? '<span class="rend-flag">afgewerkt</span>' : '';
      return '<div class="rend-row"><span class="rend-nm">' + esc(p.naam) + flag + (p.bedrijf ? '<span class="rend-bd">' + esc(p.bedrijf) + '</span>' : '') + '</span>' +
        '<span class="rend-track"><i class="rend-fill ' + p.tier + '" style="width:' + w + '%"></i><span class="rend-line" style="left:' + tw + '%"></span></span>' +
        '<span class="rend-meta">' + eur(p.budget) + ' · ' + p.uren + 'u</span>' +
        '<span class="rend-eu ' + p.tier + '">€' + p.tarief + '/u</span></div>';
    }).join('');
    var head = (per === 'lopend' ? 'Lopende projecten' : finPerLabel(per) + ' · projecten') + ' · €/u';
    return toolbar + kpis + '<div class="fincard"><h3>' + esc(head) + ' <span class="fc-hint">budget ÷ geplande uren · doel €' + TARGET + '/u · laagste eerst</span></h3>' +
      '<div class="rend-list">' + rows + '</div>' +
      '<details class="fin-mini" style="margin-top:14px"><summary>Hoe lees ik dit?</summary><p>' + esc(r.disclaimer || '') + ' Streeplijn = doel €' + TARGET + '/u. Rood onder €' + (TARGET - 15) + ' · geel €' + (TARGET - 15) + '-' + TARGET + ' · groen ≥€' + TARGET + '.</p></details></div>';
  }
  function drawRendement() {
    var box = $('rend-mount'); if (!box || !state.rend) return;
    box.innerHTML = renderRendement(state.rend);
    var f = state.finF;
    if ($('rend-per')) $('rend-per').onchange = function () { f.rendPer = this.value; if (f.rendPer === 'lopend') f.rendCmp = ''; drawRendement(); };
    if ($('rend-cmp')) $('rend-cmp').onchange = function () { f.rendCmp = this.value; drawRendement(); };
    if ($('rend-pdf')) $('rend-pdf').onclick = function () { pdfRendement(); };
    if ($('rend-csv')) $('rend-csv').onclick = function () { csvRendement(); };
    wireTips();
  }
  function csvRendement() {
    var c = rendCurrent(); if (!c.projs.length) { toast('Geen projecten om te exporteren'); return; }
    var cell = function (s) { s = String(s == null ? '' : s); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var lines = [['Project', 'Klant', 'Budget (EUR)', 'Geplande uren', 'Uurtarief (EUR/u)', 'Status'].map(cell).join(';')];
    c.projs.forEach(function (p) { lines.push([p.naam, p.bedrijf || '', p.budget, p.uren, p.tarief, p.actief ? 'lopend' : 'afgewerkt'].map(cell).join(';')); });
    try { var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'studio27-projectrendement-' + c.per + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 200); } catch (e) { toast('Export mislukt'); }
  }
  function pdfRendement() {
    var c = rendCurrent(); var TARGET = c.target; var sum = rendSum(c.projs, TARGET);
    var now = new Date(); var dd = now.getDate() + ' ' + MONTHS[now.getMonth()] + ' ' + now.getFullYear();
    var base = 'https://s27-teamportaal.studio27marketing.workers.dev';
    var perLbl = c.per === 'lopend' ? 'Lopende projecten' : finPerLabel(c.per);
    var rows = c.projs.map(function (p) { var col = p.tier === 'groen' ? '#1f6b3f' : p.tier === 'geel' ? '#7a5800' : '#b3271a'; return '<tr><td>' + esc(p.naam) + (p.actief ? '' : ' <em>(afgewerkt)</em>') + '</td><td>' + esc(p.bedrijf || '-') + '</td><td class="r">' + eur(p.budget) + '</td><td class="r">' + p.uren + 'u</td><td class="r" style="color:' + col + ';font-weight:800">€' + p.tarief + '/u</td></tr>'; }).join('');
    var css = '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Montserrat,Nunito,Arial,sans-serif;color:#2a2530;padding:26px 30px;font-size:12px}h1{font-size:21px;font-weight:900}.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #efe9ef;padding-bottom:12px;margin-bottom:14px}.hd img{height:26px}.meta{font-size:11px;color:#8a818d;margin-top:3px}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0 18px}.kpi{border:1px solid #efe9ef;border-radius:10px;padding:10px 12px}.kpi b{font-size:18px;font-weight:900;display:block}.kpi span{font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:#8a818d}table{width:100%;border-collapse:collapse;margin-top:4px}th{text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.03em;color:#8a818d;border-bottom:1px solid #efe9ef;padding:6px 8px}td{font-size:11px;padding:7px 8px;border-bottom:1px solid #f3eff3}td.r{text-align:right;white-space:nowrap}.disc{margin-top:16px;border-top:1px solid #efe9ef;padding-top:10px;font-size:9.5px;color:#8a818d;line-height:1.5}.noprint{margin:18px 0}@media print{.noprint{display:none}}';
    var html = '<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Projectrendement · Studio 27</title><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet"><style>' + css + '</style></head><body>' +
      '<div class="hd"><div><h1>Projectrendement · €/u</h1><div class="meta">' + esc(perLbl) + ' · doel €' + TARGET + '/u · gegenereerd ' + dd + '</div></div><img src="' + base + '/wordmark.svg" alt="Studio 27"></div>' +
      '<div class="kpis"><div class="kpi"><b>' + sum.aantal + '</b><span>Projecten</span></div><div class="kpi"><b>' + sum.onder + '</b><span>Onder €' + TARGET + '/u</span></div><div class="kpi"><b>€' + sum.gem + '</b><span>Gem. €/u</span></div></div>' +
      (c.projs.length ? '<table><thead><tr><th>Project</th><th>Klant</th><th class="r">Budget</th><th class="r">Uren</th><th class="r">€/u</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p class="meta">Geen projecten in deze periode.</p>') +
      '<div class="disc">' + esc((state.rend && state.rend.disclaimer) || '') + '</div>' +
      '<div class="noprint"><button onclick="window.print()" style="padding:9px 16px;border:0;border-radius:8px;background:#5e50c8;color:#fff;font-weight:800;font-family:inherit;cursor:pointer">Opslaan als PDF / Afdrukken</button></div>' +
      '</body></html>';
    s27EmitDoc(html, 'studio27-projectrendement.html');
  }
  // ══ UNIFORME AI-ADVISEUR: analyse + AFVINKBARE CHECKLIST (check → AI vervangt) + FEEDBACK-geheugen ══
  var ADV_TITLE = { fin: 'AI-winstadviseur', sales: 'AI-salesadviseur', rend: 'AI-rendementsadviseur' };
  var ADV_EP = { fin: 'teamFinanceAdvies', sales: 'teamSalesAdvies', rend: 'teamRendementAdvies' };
  function advState(t) { if (!state.adv) state.adv = {}; if (!state.adv[t]) state.adv[t] = { advies: null, chk: null, loaded: false, fbOpen: false, fbItems: null, busy: {} }; return state.adv[t]; }
  function advBlock(t) { var s = advState(t); var inner = (s.advies || s.chk) ? renderAdvisor(t) : '<div class="fincard adv2"><div class="adv2-loading">De adviseur analyseert…</div></div>'; return '<div class="adv-bar"><h2>' + ADV_TITLE[t] + '</h2><button class="adv-refresh" data-advref="' + t + '">Vernieuw</button></div><div id="adv-' + t + '" class="adv-wrap">' + inner + '</div>'; }
  function impCls(imp) { var im = String(imp || '').toLowerCase(); return im.indexOf('hoog') >= 0 ? 'hi' : im.indexOf('mid') >= 0 ? 'mid' : 'lo'; }
  function impLbl(cl) { return cl === 'hi' ? 'Hoog' : cl === 'mid' ? 'Middel' : 'Laag'; }
  function wieChip(w) { w = (w && String(w).trim()) || ''; return (w && w !== '-') ? '<span class="adv2-act-wie">' + esc(w) + '</span>' : ''; }
  function renderChecklistItems(t) {
    var s = advState(t), chk = s.chk || { open: [], done: [] };
    var open = (chk.open || []).map(function (ac) {
      var cl = impCls(ac.impact), busy = s.busy && s.busy[ac.id];
      return '<li class="chk-item' + (busy ? ' chk-busy' : '') + '">' +
        '<button class="chk-box" data-chkbox="' + esc(ac.id) + '" data-type="' + t + '" aria-label="Punt afvinken"' + (busy ? ' disabled' : '') + '></button>' +
        '<span class="chk-tx"><span class="chk-t">' + esc(ac.titel || '') + wieChip(ac.wie) + '</span>' + (ac.waarom ? '<span class="chk-w">' + esc(ac.waarom) + '</span>' : '') + '</span>' +
        '<span class="adv-imp ' + cl + '">' + impLbl(cl) + '</span></li>';
    }).join('');
    if (!open) open = '<li class="chk-empty">Geen openstaande punten. Klik “Vernieuw” voor een nieuwe analyse.</li>';
    var done = (chk.done || []).slice().reverse();
    var doneHtml = done.length ? '<details class="fin-mini chk-done"><summary>Afgewerkt (' + done.length + ')</summary><ul class="chk-donelist">' + done.map(function (d) { return '<li><span class="chk-done-t">' + esc(d.titel || '') + '</span>' + wieChip(d.wie) + '</li>'; }).join('') + '</ul></details>' : '';
    return '<ul class="chk-list">' + open + '</ul>' + doneHtml;
  }
  function renderAdvisor(t) {
    var s = advState(t), a = s.advies || {};
    var h = '<div class="fincard adv2">';
    if (a.samenvatting) h += '<p class="adv2-lead">' + esc(a.samenvatting) + '</p>';
    h += '<div class="chk-wrap" id="chk-' + t + '">' + renderChecklistItems(t) + '</div>';
    var lst = function (title, items, cls) { if (!items || !items.length) return ''; return '<div class="adv2-lst ' + cls + '"><div class="adv2-lst-h">' + title + '</div><ul>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; };
    var detail = '';
    if (a.kpis && a.kpis.length) detail += '<div class="adv2-kpis">' + a.kpis.slice(0, 4).map(function (k) { return '<div class="adv2-kpi"><span class="adv2-kpi-v">' + esc(k.waarde || '') + '</span><span class="adv2-kpi-l">' + esc(k.label || '') + '</span></div>'; }).join('') + '</div>';
    var grid = lst('Wat loopt goed', a.goed, 'good') + lst('Aandachtspunten', a.aandacht, 'warn');
    if (grid) detail += '<div class="adv2-grid">' + grid + '</div>';
    if (detail) h += '<details class="fin-mini adv2-more"><summary>Meer inzicht</summary><div class="adv2-more-bd">' + detail + '</div></details>';
    h += '<div class="adv-fb"><button class="adv-fb-toggle" data-fbtoggle="' + t + '">' + (s.fbOpen ? '− Feedback verbergen' : '+ Feedback geven aan de AI') + '</button>' +
      (s.fbOpen ? ('<div class="adv-fb-box"><textarea class="adv-fb-txt" id="fbtxt-' + t + '" rows="2" placeholder="Argumenteer of corrigeer, de AI onthoudt dit en weegt het mee in élk volgend advies…"></textarea><div class="adv-fb-row"><button class="btn btn-primary btn-sm" data-fbsend="' + t + '">Opslaan in AI-geheugen</button><span class="adv-fb-hint" id="fbhint-' + t + '"></span></div>' +
        (s.fbItems && s.fbItems.length ? '<div class="adv-fb-list"><div class="adv-fb-lbl">Eerder onthouden:</div>' + s.fbItems.slice(0, 6).map(function (f) { return '<div class="adv-fb-item">' + esc(f.text || '') + '</div>'; }).join('') + '</div>' : '') + '</div>') : '') + '</div>';
    return h + '</div>';
  }
  async function loadAdvisor(t, force) {
    var s = advState(t); s.loaded = true;
    var mount = $('adv-' + t); if (force && mount) mount.innerHTML = '<div class="fincard adv2"><div class="adv2-loading">De adviseur denkt opnieuw na…</div></div>';
    var advP = api(ADV_EP[t], force ? { refresh: true } : {}, { timeout: 45000 }).catch(function () { return null; });
    var chkP = api(force ? 'teamAdviesRefresh' : 'teamAdviesChecklist', { type: t }, { timeout: 50000 }).catch(function () { return null; });
    var adv = await advP, chk = await chkP;
    if (state.route !== 'cijfers') return;
    if (adv && adv.ok) s.advies = adv.advies;
    if (chk && chk.ok) s.chk = { open: chk.open || [], done: chk.done || [] };
    else if (chk && chk.advies) s.advies = chk.advies;
    mount = $('adv-' + t); if (!mount) return;
    if (!s.advies && !(s.chk && s.chk.open && s.chk.open.length)) { mount.innerHTML = '<div class="fincard adv2"><div class="adv2-loading">' + ((((adv && adv.error) || (chk && chk.error)) === 'geen_cijfers') ? 'De cijfers worden nog berekend, klik op Vernieuw.' : 'De adviseur is even niet bereikbaar, klik op Vernieuw.') + '</div></div>'; return; }
    mount.innerHTML = renderAdvisor(t);
  }
  async function checkAdviesItem(t, id) {
    var s = advState(t); if (!s.chk) return; s.busy = s.busy || {}; if (s.busy[id]) return; s.busy[id] = true;
    var box = $('chk-' + t); if (box) box.innerHTML = renderChecklistItems(t);
    var r; try { r = await api('teamAdviesCheck', { type: t, id: id }, { timeout: 30000 }); } catch (e) { r = null; }
    delete s.busy[id];
    if (r && r.ok) { s.chk = { open: r.open || [], done: r.done || [] }; } else { toast('Afvinken mislukt, probeer opnieuw'); }
    box = $('chk-' + t); if (box) box.innerHTML = renderChecklistItems(t);
  }
  function toggleAdvFb(t) {
    var s = advState(t); s.fbOpen = !s.fbOpen; var m = $('adv-' + t); if (m) m.innerHTML = renderAdvisor(t);
    if (s.fbOpen && !s.fbItems) { api('teamAdviesFeedbackList', { type: t }).then(function (r) { if (r && r.ok) { s.fbItems = r.items || []; var mm = $('adv-' + t); if (mm && s.fbOpen) mm.innerHTML = renderAdvisor(t); } }).catch(function () { }); }
  }
  async function sendAdvFb(t) {
    var ta = $('fbtxt-' + t); if (!ta) return; var text = (ta.value || '').trim(); if (!text) { ta.focus(); return; }
    var hint = $('fbhint-' + t); if (hint) hint.textContent = 'Opslaan…';
    var r; try { r = await api('teamAdviesFeedback', { type: t, text: text }, { timeout: 20000 }); } catch (e) { r = null; }
    var s = advState(t);
    if (r && r.ok) { s.fbItems = [{ text: text }].concat(s.fbItems || []); ta.value = ''; var m = $('adv-' + t); if (m) m.innerHTML = renderAdvisor(t); toast('Feedback opgeslagen, de AI weegt dit voortaan mee'); }
    else if (hint) hint.textContent = 'Opslaan mislukt.';
  }
  function refreshAdvisor(t) { var s = advState(t); s.advies = null; s.chk = null; loadAdvisor(t, true); }
  // drill-down: omzet van één teamlid per maand → klik een maand voor de onderliggende taken.
  function openOmzetDetail(mid, naam) {
    var d = state.fin, f = state.finF; var cube = d.cube || {};
    var now = new Date(), nuYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var months = finMonths(f.periode, { van: f.van, tot: f.tot }, nuYM) || (cube.maanden || []);
    months = months.filter(function (m) { var pm = cube.persMaand[m]; return pm && pm[mid] > 0; });
    var rows = months.length ? months.map(function (mm) { var v = (cube.persMaand[mm] && cube.persMaand[mm][mid]) || 0; return '<button class="od-mrow" data-maand="' + mm + '"><span class="od-mlab">' + monthLabel(mm) + '</span><span class="od-mval">' + eur(v) + '</span><span class="od-mgo">›</span></button>'; }).join('') : '<div class="empty" style="padding:14px"><p>Geen omzet in deze periode.</p></div>';
    var m = $('modal');
    m.innerHTML = '<div class="modal-head"><div class="mh-ic" style="background:var(--s27-purple-soft);color:var(--s27-purple-ink)">€</div><div style="flex:1;min-width:0"><div class="mh-tt">' + esc(naam || 'Teamlid') + '</div><div class="mh-sub">Omzet per maand · klik een maand voor de taken erachter</div></div><button class="modal-close" id="odClose" aria-label="Sluiten"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body"><div class="od-months">' + rows + '</div><div id="od-tasks"></div></div>';
    $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    $('odClose').onclick = closeModal;
    Array.prototype.forEach.call(m.querySelectorAll('.od-mrow'), function (b) { b.onclick = function () { loadOmzetTasks(mid, b.getAttribute('data-maand'), b); }; });
    if (months.length === 1) { var only = m.querySelector('.od-mrow'); if (only) only.click(); }   // 1 maand → meteen openen
  }
  async function loadOmzetTasks(mid, maand, btn) {
    var box = $('od-tasks'); if (!box) return;
    Array.prototype.forEach.call(document.querySelectorAll('.od-mrow'), function (x) { x.classList.remove('on'); }); if (btn) btn.classList.add('on');
    box.innerHTML = '<div class="empty" style="padding:14px"><p>Taken ophalen…</p></div>';
    var r; try { r = await api('teamFinanceDetail', { member_id: Number(mid), maand: maand }, { timeout: 30000 }); } catch (e) { r = null; }
    box = $('od-tasks'); if (!box) return;
    if (!r || !r.ok) { box.innerHTML = '<div class="empty" style="padding:14px"><p>Kon de taken niet laden.</p></div>'; return; }
    if (!r.taken.length) { box.innerHTML = '<div class="empty" style="padding:14px"><p>Geen taken met budget in deze maand.</p></div>'; return; }
    box.innerHTML = '<div class="od-thead">' + monthLabel(maand) + ' · ' + r.aantal + ' taken · ' + eur(r.totaal) + '</div>' + r.taken.map(function (t) { return '<div class="od-task"><span class="od-tnm">' + esc(t.naam) + '<span class="od-tsub">' + esc(t.discipline || '') + (t.bedrijf ? ' · ' + esc(t.bedrijf) : '') + (t.gedeeld ? ' · gedeeld' : '') + '</span></span><span class="od-tval">' + eur(t.bedrag) + '</span></div>'; }).join('');
  }

  /* ---- VERLOF ---- */
  async function renderVerlof(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Verlof</h1><div class="sub">Je vakantie, recup en ziekte, en hier dien je een nieuwe aanvraag in.</div></div><div class="empty"><p>Laden…</p></div></div>';
    var d; try { d = await api('teamVerlof', {}); } catch (e) { return; }
    if (state.route !== 'verlof') return;
    if (!d.ok) { page.querySelector('.empty p').textContent = 'Kon verlof niet laden.'; return; }
    var typeOpts = d.types.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
    var form = '<div class="setsec"><h3>Nieuwe aanvraag</h3><p class="sdesc">Zolang een aanvraag niet is goedgekeurd, blokkeert ze niets in de shoot-planning.</p>' +
      '<div class="vl-grid"><div class="field"><label>Type</label><select id="vl-type">' + typeOpts + '</select></div><div class="field"><label>&nbsp;</label><div></div></div>' +
      '<div class="field"><label>Van</label><input type="date" id="vl-van"></div><div class="field"><label>Tot en met</label><input type="date" id="vl-tot"></div></div>' +
      '<button class="btn btn-primary" id="vl-submit" style="margin-top:16px">Aanvraag indienen</button></div>';
    var lijst = d.items.length ? d.items.map(function (i) {
      var st = i.goedgekeurd ? '<span class="pill pill-done"><span class="pdot"></span>Goedgekeurd</span>' : '<span class="pill pill-wait"><span class="pdot"></span>In aanvraag</span>';
      var range = i.van_ymd === i.tot_ymd ? dueLabel(i.van_ymd) : (dueLabel(i.van_ymd) + ' - ' + dueLabel(i.tot_ymd));
      return '<div class="vl-row"><span class="vl-type">' + esc(i.type) + '</span><span class="vl-dates">' + range + '</span>' + st + '</div>';
    }).join('') : '<div class="empty"><p>Nog geen verlof geregistreerd.</p></div>';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Verlof</h1><div class="sub">Je vakantie, recup en ziekte, en hier dien je een nieuwe aanvraag in.</div></div>' +
      form + sec('Mijn verlof', d.items.length) + lijst + '</div>';
    var today = todayYmd(); $('vl-van').min = today; $('vl-tot').min = today; $('vl-van').value = today; $('vl-tot').value = today;
    $('vl-van').onchange = function () { if ($('vl-tot').value < $('vl-van').value) $('vl-tot').value = $('vl-van').value; $('vl-tot').min = $('vl-van').value; };
    $('vl-submit').onclick = async function () {
      if (!$('vl-van').value || !$('vl-tot').value) { toast('Vul beide datums in'); return; }
      this.disabled = true; this.textContent = 'Indienen…';
      var r; try { r = await api('teamVerlofAanvraag', { type: $('vl-type').value, van: $('vl-van').value, tot: $('vl-tot').value }); } catch (e) { r = null; }
      if (r && r.ok) { toast('Verlofaanvraag ingediend ✓'); renderVerlof(page); } else { toast('Indienen mislukt'); this.disabled = false; this.textContent = 'Aanvraag indienen'; }
    };
  }

  /* ---- INSTELLINGEN = persoonlijke werkuren + werkdagen + thuiswerkdagen ---- */
  // Dag-index = JS getDay(): 0=zo .. 6=za. UI toont ma→zo. Voedt AI-dagplan + klant-meetingplanner.
  async function renderInstellingen(page) {
    var sub = 'Je werkuren en werkdagen, hierop baseert de AI je dagplanning, en op een thuiswerkdag boeken klanten geen meeting in je agenda.';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Instellingen</h1><div class="sub">' + esc(sub) + '</div></div><div class="empty"><p>Laden…</p></div></div>';
    var d; try { d = await api('teamWorkhoursGet', {}); } catch (e) { d = null; }
    if (state.route !== 'instellingen') return;   // gebruiker is intussen weg genavigeerd
    if (!d || !d.ok) { var ep = page.querySelector('.empty p'); if (ep) ep.textContent = 'Kon je instellingen niet laden.'; return; }
    var wh = d.workhours || {};
    var DAGEN = [['ma', 1], ['di', 2], ['wo', 3], ['do', 4], ['vr', 5], ['za', 6], ['zo', 0]];
    var werk = {}; (wh.werkdagen || []).forEach(function (x) { werk[x] = 1; });
    var thuis = {}; (wh.thuisdagen || []).forEach(function (x) { thuis[x] = 1; });
    function chips(kind, sel) { return DAGEN.map(function (p) { return '<button type="button" class="day-chip' + (sel[p[1]] ? ' on' : '') + '" data-kind="' + kind + '" data-d="' + p[1] + '">' + p[0] + '</button>'; }).join(''); }
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Instellingen</h1><div class="sub">' + esc(sub) + '</div></div>' +
      '<div class="setsec"><h3>Werkuren</h3><p class="sdesc">Tussen welke uren werk je op een normale dag?</p>' +
        '<div class="vl-grid"><div class="field"><label>Start</label><input type="time" id="wh-start" value="' + esc(wh.start || '08:00') + '"></div><div class="field"><label>Einde</label><input type="time" id="wh-end" value="' + esc(wh.end || '17:00') + '"></div></div></div>' +
      '<div class="setsec"><h3>Werkdagen</h3><p class="sdesc">Op welke dagen werk je?</p><div class="day-row">' + chips('werk', werk) + '</div></div>' +
      '<div class="setsec"><h3>Thuiswerkdagen</h3><p class="sdesc">Op deze dagen plannen we geen klant-meetings in je agenda. Een thuiswerkdag is altijd ook een werkdag.</p><div class="day-row">' + chips('thuis', thuis) + '</div></div>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-top:4px"><button class="btn btn-primary" id="wh-save">Opslaan</button><span class="micro" id="wh-msg" style="color:var(--ink-4)"></span></div>' +
      ((state.perms && state.perms.admin) ? '<div id="ai-model-sec" class="setsec" style="margin-top:24px"><h3>AI-model</h3><p class="sdesc">Laden…</p></div>' : '') + '</div>';
    function collect(kind) { var out = []; Array.prototype.forEach.call(page.querySelectorAll('.day-chip[data-kind="' + kind + '"].on'), function (b) { out.push(Number(b.getAttribute('data-d'))); }); return out; }
    Array.prototype.forEach.call(page.querySelectorAll('.day-chip'), function (b) {
      b.onclick = function () {
        var kind = b.getAttribute('data-kind'), dd = b.getAttribute('data-d');
        b.classList.toggle('on');
        if (kind === 'werk' && !b.classList.contains('on')) { var tc = page.querySelector('.day-chip[data-kind="thuis"][data-d="' + dd + '"]'); if (tc) tc.classList.remove('on'); }
        if (kind === 'thuis' && b.classList.contains('on')) { var wc = page.querySelector('.day-chip[data-kind="werk"][data-d="' + dd + '"]'); if (wc) wc.classList.add('on'); }
      };
    });
    $('wh-save').onclick = async function () {
      if (!$('wh-start').value || !$('wh-end').value || !Object.keys(collect('werk')).length) { toast('Vul alle velden in en kies minstens 1 werkdag'); return; }
      var msg = $('wh-msg'); msg.textContent = ''; msg.style.color = 'var(--ink-4)';
      this.disabled = true; this.textContent = 'Opslaan…';
      var payload = { start: $('wh-start').value, end: $('wh-end').value, werkdagen: collect('werk'), thuisdagen: collect('thuis') };
      var r; try { r = await api('teamWorkhoursSave', payload); } catch (e) { r = null; }
      this.disabled = false; this.textContent = 'Opslaan';
      if (r && r.ok) { toast('Werkuren opgeslagen ✓'); msg.textContent = 'De AI-dagplanning houdt hier voortaan rekening mee.'; }
      else { var em = (r && r.message) || 'Opslaan mislukt, probeer zo opnieuw.'; msg.textContent = em; msg.style.color = 'var(--s27-red-ink,#c0392b)'; }
    };
    if (state.perms && state.perms.admin) loadAiModelSec(page);
  }
  // Globale AI-model-keuze (admin). AI-agnostisch wisselen Claude/Gemini/GPT voor het hele portaal.
  async function loadAiModelSec(page) {
    var sec = document.getElementById('ai-model-sec'); if (!sec) return;
    var d; try { d = await api('teamAiModel', {}); } catch (e) { d = null; }
    if (!d || !d.ok) { sec.innerHTML = '<h3>AI-model</h3><p class="sdesc">Kon de AI-instelling niet laden.</p>'; return; }
    var opts = (d.models || []).map(function (m) { return '<option value="' + esc(m.id) + '"' + (d.model === m.id ? ' selected' : '') + (m.beschikbaar ? '' : ' disabled') + '>' + esc(m.provider + ' - ' + m.naam) + (m.beschikbaar ? '' : ' (geen sleutel)') + '</option>'; }).join('');
    sec.innerHTML = '<h3>AI-model voor het hele portaal</h3><p class="sdesc">Welk model gebruiken alle AI-knoppen? Je kan vrij wisselen tussen Claude, Gemini en GPT. Per knop kan je hiervan afwijken in AI-knoppen-beheer. Modellen zonder API-sleutel staan uitgegrijsd.</p>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><select id="aimodel-sel" class="ev-in" style="max-width:300px">' + opts + '</select><button class="btn btn-primary btn-sm" id="aimodel-save">Instellen</button><span class="micro" id="aimodel-msg" style="color:var(--ink-4)"></span></div>';
    var sv = document.getElementById('aimodel-save'); if (sv) sv.onclick = function () {
      var m = (document.getElementById('aimodel-sel') || {}).value; sv.disabled = true; sv.textContent = '…';
      api('teamAiModel', { save: true, model: m }).then(function (r) {
        sv.disabled = false; sv.textContent = 'Instellen'; var msg = document.getElementById('aimodel-msg');
        if (r && r.ok) { toast('AI-model ingesteld ✓'); if (msg) { msg.textContent = 'Het hele portaal gebruikt nu dit model.'; msg.style.color = 'var(--ink-4)'; } }
        else { if (msg) { msg.textContent = (r && r.message) || 'Instellen mislukt'; msg.style.color = 'var(--s27-red-ink,#c0392b)'; } toast((r && r.message) || 'Instellen mislukt'); }
      }).catch(function () { sv.disabled = false; sv.textContent = 'Instellen'; });
    };
  }

  /* ---- AI-KNOPPEN BEHEER (admin), acties per type job + review-slot ---- */
  function aibBlank() { return { key: '', label: '', ic: '✨', sys: '', input: false, lbl: '', max: 900, scope: 'algemeen', vis: { roles: [], members: [] }, actief: true, bron: 'kv' }; }
  async function renderAiBeheer(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>AI-knoppen</h1><div class="sub">Bepaal welke AI-acties verschijnen per type job. De basisacties gelden altijd, voor iedereen.</div></div><div class="empty"><p>Laden…</p></div></div>';
    state.aibEdit = null;
    var d; try { d = await api('teamAiCatalog', {}); } catch (e) { d = null; }
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = 'Kon de AI-knoppen niet laden.'; return; }
    if (!d.is_admin) { page.querySelector('.empty p').textContent = 'Alleen de zaakvoerder beheert de AI-knoppen.'; return; }
    state.aiBeheer = d; drawAiBeheer(page);
  }
  function aibChip(lab, on, attr) { return '<button type="button" class="aib-sc' + (on ? ' on' : '') + '" ' + attr + '>' + esc(lab) + '</button>'; }
  function aibItemHtml(a, d) {
    var scope = a.scope === 'algemeen' ? '<span class="aib-chip alg">Algemeen</span>' : (a.scope || []).map(function (s) { var lab = ((d.typejobs || []).filter(function (x) { return x.key === s; })[0] || {}).label || s; return '<span class="aib-chip">' + esc(lab) + '</span>'; }).join('');
    var core = a.bron === 'core', special = !!a.type;
    var badge = special ? '<span class="aib-badge basis">' + (a.bewerkt ? 'aangepast' : 'speciaal') + '</span>' : (core ? '<span class="aib-badge basis">' + (a.bewerkt ? 'aangepast' : 'basis') + '</span>' : (a.actief === false ? '<span class="aib-badge concept">in afwachting</span>' : ''));
    var actions = core
      ? '<button class="aib-btn" data-edit="' + esc(a.key) + '">Bewerken</button>' + (a.bewerkt ? '<button class="aib-btn" data-del="' + esc(a.key) + '" title="Terug naar standaard">↺</button>' : '')
      : '<button class="aib-btn" data-edit="' + esc(a.key) + '">Bewerken</button><button class="aib-btn del" data-del="' + esc(a.key) + '" title="Verwijderen" aria-label="Verwijderen">' + svgIc(IC.trash, 15) + '</button>';
    return '<div class="aib-item' + (a.actief === false ? ' off' : '') + '"><span class="aib-ic">' + esc(a.ic || '✨') + '</span>' +
      '<div class="aib-main"><div class="aib-label">' + esc(a.label) + ' ' + badge + '</div><div class="aib-scope">' + scope + (a.aangevraagd_door ? '<span class="aib-by">aangevraagd door ' + esc(a.aangevraagd_door) + '</span>' : '') + '</div></div>' +
      '<label class="aib-toggle" title="Actief / uit"><input type="checkbox" data-toggle="' + esc(a.key) + '"' + (a.actief !== false ? ' checked' : '') + '></label>' +
      actions + '</div>';
  }
  function aibFormHtml(it, d) {
    var special = !!it.type;
    var tj = '<button type="button" class="aib-sc' + (it.scope === 'algemeen' ? ' on' : '') + '" data-scope="algemeen">Algemeen</button>' +
      (d.typejobs || []).map(function (x) { var on = it.scope !== 'algemeen' && (it.scope || []).indexOf(x.key) >= 0; return aibChip(x.label, on, 'data-scope="' + esc(x.key) + '"'); }).join('');
    var roles = [['team', 'Team'], ['accountmanager', 'Accountmanager'], ['sales', 'Sales'], ['admin', 'Zaakvoerder']].map(function (r) { var on = (it.vis.roles || []).indexOf(r[0]) >= 0; return '<button type="button" class="aib-vc' + (on ? ' on' : '') + '" data-role="' + r[0] + '">' + r[1] + '</button>'; }).join('');
    var mems = (d.roster || []).map(function (m) { var on = (it.vis.members || []).indexOf(m.id) >= 0; return '<button type="button" class="aib-vc' + (on ? ' on' : '') + '" data-mem="' + m.id + '">' + esc(m.naam) + '</button>'; }).join('');
    var promptBlock = (it.type === 'v9')
      ? '<p class="micro" style="color:var(--ink-4);margin:0 0 13px">Speciale cloud-routine met een eigen pijplijn, de prompt zit in de routine zelf en is hier niet bewerkbaar. Je kunt wel de naam, het type job en de zichtbaarheid aanpassen.</p>'
      : (it.type === 'html')
      ? '<p class="micro" style="color:var(--ink-4);margin:0 0 10px">Dit is de volledige systeem-instructie waarmee de AI de HTML-pagina bouwt (de "MD-file" achter deze knop). Pas ze gerust aan. Met ↺ in de lijst zet je ze terug naar de standaard.</p><div class="field"><label>AI-instructie (systeemprompt)</label><textarea id="aibf-sys" rows="14" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.55">' + esc(it.sys) + '</textarea></div>'
      : '<div class="field"><label>AI-instructie (prompt)</label><textarea id="aibf-sys" rows="4" placeholder="Wat moet de AI doen? Bv. Stel beknopte wireframe-secties op uit de briefing (hero, USP\'s, diensten, CTA)…">' + esc(it.sys) + '</textarea></div>' +
        '<div class="aib-row2"><label class="aib-check"><input type="checkbox" id="aibf-input"' + (it.input ? ' checked' : '') + '> Vraagt eerst input van het teamlid</label><div class="field aib-maxf"><label>Max. lengte</label><input type="number" id="aibf-max" value="' + (it.max || 900) + '" min="200" max="4000" step="100"></div></div>' +
        '<div class="field aibf-lblwrap" style="' + (it.input ? '' : 'display:none') + '"><label>Label boven het inputveld</label><input type="text" id="aibf-lbl" value="' + esc(it.lbl || '') + '" maxlength="60" placeholder="bv. TE VERBETEREN TEKST"></div>';
    return '<div class="aib-form"><div class="aib-form-h">' + (it.key ? 'Knop bewerken' : 'Nieuwe AI-knop') + '</div>' +
      '<div class="aib-grid"><div class="field"><label>Naam van de knop</label><input type="text" id="aibf-label" value="' + esc(it.label) + '" maxlength="80" placeholder="bv. Wireframe-tekst opzet"></div><div class="field aib-icf"><label>Icoon</label><input type="text" id="aibf-ic" value="' + esc(it.ic || '✨') + '" maxlength="4"></div></div>' +
      promptBlock +
      '<div class="aib-seg"><label>Voor welk type job?</label><div class="aib-chips" id="aibf-scope">' + tj + '</div></div>' +
      '<div class="aib-seg"><label>Zichtbaar voor <span class="micro" style="color:var(--ink-4)">(niets aangevinkt = iedereen)</span></label><div class="aib-chips" id="aibf-roles">' + roles + '</div><div class="aib-chips" id="aibf-mems" style="margin-top:6px">' + mems + '</div></div>' +
      (it.type === 'v9' ? '' : '<div class="aib-seg"><label>AI-model voor deze knop</label><select id="aibf-model" class="ev-in" style="max-width:320px"><option value="">Standaard (volg het globale model' + (d.globaal_model ? ' - ' + esc(d.globaal_model) : '') + ')</option>' + (d.modellen || []).map(function (m) { return '<option value="' + esc(m.id) + '"' + (it.model === m.id ? ' selected' : '') + '>' + esc(m.provider + ' - ' + m.naam) + '</option>'; }).join('') + '</select></div>') +
      '<div class="aib-form-actions"><button class="btn btn-primary" id="aibf-save">Opslaan</button><button class="btn btn-outline" id="aibf-cancel">Annuleren</button></div></div>';
  }
  function drawAiBeheer(page) {
    var d = state.aiBeheer; var items = d.items || [];
    var concepts = items.filter(function (a) { return a.bron === 'kv' && a.actief === false; });
    var top = state.aibEdit ? aibFormHtml(state.aibEdit, d) : '<button class="btn btn-primary" id="aib-new" style="margin-bottom:16px">+ Nieuwe AI-knop</button>';
    var pend = concepts.length ? '<div class="aib-pending">⏳ ' + concepts.length + ' aangevraagde knop' + (concepts.length > 1 ? 'pen' : '') + ' in afwachting, verfijn de prompt en zet op actief om ze live te brengen.</div>' : '';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>AI-knoppen</h1><div class="sub">Bepaal welke AI-acties verschijnen per type job. De basisacties gelden altijd, voor iedereen.</div></div>' +
      pend + top + '<div class="aib-list">' + items.map(function (a) { return aibItemHtml(a, d); }).join('') + '</div></div>';
    wireAiBeheer(page);
  }
  function syncScopeChips(page) {
    var sc = state.aibEdit.scope;
    Array.prototype.forEach.call(page.querySelectorAll('#aibf-scope .aib-sc'), function (b) { var s = b.getAttribute('data-scope'); var on = (s === 'algemeen') ? (sc === 'algemeen') : (sc !== 'algemeen' && sc.indexOf(s) >= 0); b.classList.toggle('on', on); });
  }
  function wireAiBeheer(page) {
    var nb = $('aib-new'); if (nb) nb.onclick = function () { state.aibEdit = aibBlank(); drawAiBeheer(page); };
    Array.prototype.forEach.call(page.querySelectorAll('[data-toggle]'), function (c) {
      c.onchange = function () { var key = c.getAttribute('data-toggle'); var on = c.checked; api('teamAiActieToggle', { key: key, actief: on }).then(function (r) { if (r && r.ok) { var it = state.aiBeheer.items.filter(function (x) { return x.key === key; })[0]; if (it) it.actief = on; toast('Bijgewerkt ✓'); loadAiCatalog(); } else { toast((r && r.message) || 'Bijwerken mislukt'); c.checked = !on; } }); };
    });
    Array.prototype.forEach.call(page.querySelectorAll('[data-edit]'), function (b) { b.onclick = function () { var it = state.aiBeheer.items.filter(function (x) { return x.key === b.getAttribute('data-edit'); })[0]; if (it) { state.aibEdit = JSON.parse(JSON.stringify(it)); if (!state.aibEdit.vis) state.aibEdit.vis = { roles: [], members: [] }; drawAiBeheer(page); window.scrollTo(0, 0); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-del]'), function (b) { b.onclick = function () { var key = b.getAttribute('data-del'); var it = (state.aiBeheer.items || []).filter(function (x) { return x.key === key; })[0]; var isCore = it && (it.bron === 'core' || it.bewerkt); if (!confirm(isCore ? 'Deze standaard-knop terugzetten naar de oorspronkelijke instelling?' : 'Deze AI-knop verwijderen?')) return; api('teamAiActieDelete', { key: key }).then(function (r) { if (r && r.ok) { if (r.reset) { toast('Teruggezet naar standaard ✓'); renderAiBeheer(page); } else { state.aiBeheer.items = state.aiBeheer.items.filter(function (x) { return x.key !== key; }); toast('Verwijderd ✓'); loadAiCatalog(); drawAiBeheer(page); } } else toast((r && r.message) || 'Verwijderen mislukt'); }); }; });
    if (state.aibEdit) wireAibForm(page);
  }
  function wireAibForm(page) {
    var inp = $('aibf-input'); if (inp) inp.onchange = function () { var w = page.querySelector('.aibf-lblwrap'); if (w) w.style.display = inp.checked ? '' : 'none'; };
    Array.prototype.forEach.call(page.querySelectorAll('#aibf-scope .aib-sc'), function (b) {
      b.onclick = function () { var s = b.getAttribute('data-scope'); var e = state.aibEdit; if (s === 'algemeen') { e.scope = 'algemeen'; } else { if (e.scope === 'algemeen') e.scope = []; var i = e.scope.indexOf(s); if (i >= 0) e.scope.splice(i, 1); else e.scope.push(s); if (!e.scope.length) e.scope = 'algemeen'; } syncScopeChips(page); };
    });
    Array.prototype.forEach.call(page.querySelectorAll('#aibf-roles .aib-vc'), function (b) { b.onclick = function () { var r = b.getAttribute('data-role'); var arr = state.aibEdit.vis.roles; var i = arr.indexOf(r); if (i >= 0) arr.splice(i, 1); else arr.push(r); b.classList.toggle('on'); }; });
    Array.prototype.forEach.call(page.querySelectorAll('#aibf-mems .aib-vc'), function (b) { b.onclick = function () { var m = Number(b.getAttribute('data-mem')); var arr = state.aibEdit.vis.members; var i = arr.indexOf(m); if (i >= 0) arr.splice(i, 1); else arr.push(m); b.classList.toggle('on'); }; });
    var cancel = $('aibf-cancel'); if (cancel) cancel.onclick = function () { state.aibEdit = null; drawAiBeheer(page); };
    var save = $('aibf-save'); if (save) save.onclick = function () {
      var it = state.aibEdit; var special = !!it.type; var promptEditable = !it.type || it.type === 'html';
      it.label = (($('aibf-label') || {}).value || '').trim(); it.ic = ($('aibf-ic') || {}).value || '✨';
      if (promptEditable) it.sys = (($('aibf-sys') || {}).value || '').trim();
      if (!special) { it.input = !!($('aibf-input') || {}).checked; it.lbl = ($('aibf-lbl') || {}).value || ''; it.max = Number(($('aibf-max') || {}).value) || 900; }
      if (it.type !== 'v9') it.model = ($('aibf-model') || {}).value || '';
      if (!it.label) { toast('Geef de knop een naam'); return; }
      if (promptEditable && !it.sys) { toast('Geef een AI-instructie (prompt)'); return; }
      save.disabled = true; save.textContent = 'Opslaan…';
      api('teamAiActieSave', { item: it }).then(function (r) {
        save.disabled = false; save.textContent = 'Opslaan';
        if (r && r.ok && r.item) { toast('Opgeslagen ✓'); state.aibEdit = null; var items = state.aiBeheer.items; var idx = -1; for (var i = 0; i < items.length; i++) if (items[i].key === r.item.key) { idx = i; break; } if (idx >= 0) items[idx] = r.item; else items.push(r.item); loadAiCatalog(); drawAiBeheer(page); }
        else { toast((r && r.message) || 'Opslaan mislukt'); }
      }).catch(function () { save.disabled = false; save.textContent = 'Opslaan'; toast('Opslaan mislukt'); });
    };
  }

  /* ---- AUTOMATISERINGEN-OVERZICHT (make.com-stijl) ---- */
  var AUTO_STATUS = {
    live: { lab: 'Werkt', cls: 'au-live', dot: '#1FA463', uit: 'Actief en operationeel' },
    config: { lab: 'Wacht op koppeling', cls: 'au-config', dot: '#E08600', uit: 'Klaar, maar mist nog een sleutel of instelling' },
    slaapt: { lab: 'Staat uit', cls: 'au-slaapt', dot: '#9098A6', uit: 'Volledig klaar maar bewust uitgeschakeld' },
    extern: { lab: 'Draait in Make', cls: 'au-extern', dot: '#5B4BC4', uit: 'Loopt buiten dit portaal, in Make' }
  };
  function autoCounts(groepen) {
    var c = { live: 0, config: 0, slaapt: 0, extern: 0, totaal: 0 };
    (groepen || []).forEach(function (g) { (g.items || []).forEach(function (it) { c.totaal++; if (c[it.status] != null) c[it.status]++; }); });
    return c;
  }
  function autoItemHtml(it) {
    var s = AUTO_STATUS[it.status] || AUTO_STATUS.config;
    var meta = [];
    if (it.waar) meta.push('<span class="au-where">' + esc(it.waar) + '</span>');
    if (it.schema) meta.push('<span class="au-where">⏱ ' + esc(it.schema) + '</span>');
    return '<div class="au-item" data-tip="' + esc(s.uit + (it.detail ? ' - ' + it.detail : '')) + '">' +
      '<span class="au-dot" style="background:' + s.dot + '"></span>' +
      '<div class="au-main"><div class="au-nm">' + esc(it.naam) + '</div>' +
      '<div class="au-wat">' + esc(it.wat || '') + (meta.length ? ' <span class="au-metasep">·</span> ' + meta.join(' ') : '') + '</div>' +
      (it.detail ? '<div class="au-detail">' + esc(it.detail) + '</div>' : '') + '</div>' +
      '<span class="au-badge ' + s.cls + '">' + esc(s.lab) + '</span></div>';
  }
  function drawAutomations(page, d) {
    var groepen = d.groepen || [];
    var c = autoCounts(groepen);
    var stat = function (n, l, color) { return '<div class="au-stat"><span class="au-stat-dot" style="background:' + color + '"></span><b>' + n + '</b> ' + l + '</div>'; };
    var legend = '<div class="au-legend">' +
      stat(c.live, 'werken', AUTO_STATUS.live.dot) +
      stat(c.config, 'wachten op koppeling', AUTO_STATUS.config.dot) +
      stat(c.slaapt, 'staan uit', AUTO_STATUS.slaapt.dot) +
      stat(c.extern, 'in Make', AUTO_STATUS.extern.dot) + '</div>';
    var groupsHtml = groepen.map(function (g) {
      return '<div class="au-group"><div class="au-ghead"><h2>' + esc(g.titel) + '</h2><span class="count">' + (g.items || []).length + '</span></div>' +
        '<div class="au-list">' + (g.items || []).map(autoItemHtml).join('') + '</div></div>';
    }).join('');
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Automatiseringen</h1><div class="sub">Alle koppelingen, AI-knoppen, geplande taken en scenario\'s op één plek, met hun status. ' + c.totaal + ' automatiseringen in totaal.</div></div>' +
      legend + groupsHtml + '</div>';
    wireTips();
  }
  async function renderAutomations(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Automatiseringen</h1><div class="sub">Status van alle automatiseringen laden…</div></div><div class="empty"><p>Laden…</p></div></div>';
    var d; try { d = await api('teamAutomations', {}); } catch (e) { d = null; }
    if (state.route !== 'automatiseringen') return;
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = (d && d.error === 'forbidden_role') ? 'Alleen de zaakvoerder ziet dit overzicht.' : 'Kon het overzicht niet laden.'; return; }
    drawAutomations(page, d);
  }

  /* =====================================================================
     AI-AGENTS, gespecialiseerde, opgeslagen AI's (eigen prompt + model +
     geplakte kennis). Iedereen van het team kan ermee chatten; enkel de
     zaakvoerder bouwt/bewerkt ze. Alles loopt via de AI-agnostische laag.
     ===================================================================== */
  /* ---- MCP-CONNECTOREN (admin): externe MCP-servers koppelen ---- */
  function connBlank() { return { id: '', naam: '', ic: '🔌', url: '', heeft_token: false }; }
  async function renderConnectoren(page) {
    state.connEdit = null;
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Connectoren</h1><div class="sub">Koppel externe MCP-servers (Model Context Protocol) zodat je AI-agents hun tools live kunnen gebruiken. Net als een integratie koppelen in Make of ClickUp Brain.</div></div><div class="empty"><p>Laden…</p></div></div>';
    var d; try { d = await api('teamMcpList', {}); } catch (e) { d = null; }
    if (state.route !== 'connectoren') return;
    if (!d || !d.ok) { var ep = page.querySelector('.empty p'); if (ep) ep.textContent = (d && d.error === 'forbidden_role') ? 'Alleen de zaakvoerder beheert connectoren.' : 'Kon de connectoren niet laden.'; return; }
    state.connData = d.items || [];
    state.connRedirect = d.redirect_uri || '';
    drawConnectoren(page);
  }
  function connCardHtml(c) {
    return '<div class="conn-card"><div class="conn-ic">' + esc(c.ic || '🔌') + '</div>' +
      '<div class="conn-main"><div class="conn-nm">' + esc(c.naam) + (c.server_naam ? ' <span class="conn-srv">' + esc(c.server_naam) + '</span>' : '') + '</div>' +
      '<div class="conn-url">' + esc(c.url) + '</div>' +
      '<div class="conn-meta">' + (c.tools_count ? '<span class="conn-toolsb">🛠 ' + c.tools_count + ' tool' + (c.tools_count > 1 ? 's' : '') + '</span>' : '<span class="conn-toolsb off">nog niet getest</span>') + (c.auth_mode === 'oauth' ? '<span class="conn-auth' + (c.verbonden ? ' ok' : '') + '">🔐 ' + (c.verbonden ? 'verbonden' : 'login nodig') + '</span>' : (c.heeft_token ? '<span class="conn-auth">🔑 token</span>' : '')) + '</div></div>' +
      '<div class="agc-act"><button class="agc-btn" data-test="' + esc(c.id) + '" title="Testen + tools verversen" aria-label="Testen">' + svgIc(IC.refresh, 15) + '</button><button class="agc-btn" data-cedit="' + esc(c.id) + '" title="Bewerken" aria-label="Bewerken">' + svgIc(IC.edit, 15) + '</button><button class="agc-btn del" data-cdel="' + esc(c.id) + '" title="Verwijderen" aria-label="Verwijderen">' + svgIc(IC.trash, 15) + '</button></div></div>';
  }
  function connFormHtml(it) {
    return '<div class="aib-form"><div class="aib-form-h">' + (it.id ? 'Connector bewerken' : 'Nieuwe connector') + '</div>' +
      '<div class="aib-grid"><div class="field"><label>Naam</label><input type="text" id="cf-naam" value="' + esc(it.naam) + '" maxlength="60" placeholder="bv. Notion, ClickUp, eigen MCP"></div><div class="field aib-icf"><label>Icoon</label><input type="text" id="cf-ic" value="' + esc(it.ic || '🔌') + '" maxlength="4"></div></div>' +
      '<div class="field"><label>MCP-server-URL (https)</label><input type="text" id="cf-url" value="' + esc(it.url) + '" placeholder="https://voorbeeld.com/mcp" autocomplete="off" spellcheck="false"></div>' +
      '<div class="field"><label>Verbinden</label><div class="conn-auth-row"><button type="button" class="btn btn-primary btn-sm" id="cf-oauth">🔐 Verbinden via login</button>' + ((it.auth_mode === 'oauth' && it.verbonden) ? '<span class="conn-test-res ok">✓ verbonden via login</span>' : '') + '</div><div class="micro" style="color:var(--ink-4);margin-top:5px">Ondersteunt de server OAuth, dan word je doorgestuurd om in te loggen en toegang te geven (zoals bij Make of Claude). Anders plak je hieronder een token.</div></div>' +
      '<div class="field"><label>Token (handmatig) <span class="micro" style="color:var(--ink-4)">(optioneel Bearer-token. Leeg = ' + (it.id ? 'huidige behouden' : 'geen') + '. Versleuteld bewaard.)</span></label><input type="password" id="cf-token" value="" placeholder="' + (it.heeft_token && it.auth_mode !== 'oauth' ? '•••••••• (token is gezet)' : 'plak hier het token') + '" autocomplete="off"></div>' +
      '<details class="conn-adv"' + (it.app_client_id ? ' open' : '') + '><summary>Eigen OAuth-app (voor Meta, Google, …)</summary>' +
        '<div class="micro" style="color:var(--ink-4);margin:6px 0 10px">Sommige aanbieders (Meta, Google) registreren apps niet automatisch. Maak dan een OAuth-app aan bij de aanbieder, registreer daar onderstaande redirect-URL, en vul het client-ID + secret in. Daarna werkt "Verbinden via login".</div>' +
        '<div class="conn-redirect"><span>Redirect-URL (registreer deze bij de aanbieder):</span><code id="cf-redirect">' + esc(state.connRedirect || '') + '</code><button type="button" class="btn btn-outline btn-sm" id="cf-copyredir">Kopieer</button></div>' +
        '<div class="aib-grid"><div class="field"><label>Client-ID / App-ID</label><input type="text" id="cf-appid" value="' + esc(it.app_client_id || '') + '" placeholder="bv. je Meta App-ID" autocomplete="off" spellcheck="false"></div><div class="field"><label>Client secret</label><input type="password" id="cf-appsecret" value="" placeholder="' + (it.heeft_app_secret ? '•••••••• (gezet)' : 'app secret') + '" autocomplete="off"></div></div>' +
      '</details>' +
      '<div class="conn-test-row"><button class="btn btn-outline btn-sm" id="cf-test">' + svgIc(IC.refresh, 14) + ' Testen + tools ophalen</button><span id="cf-test-res" class="conn-test-res"></span></div>' +
      '<div id="cf-tools" class="conn-tools-list"></div>' +
      '<div class="aib-form-actions"><button class="btn btn-primary" id="cf-save">Opslaan</button><button class="btn btn-outline" id="cf-cancel">Annuleren</button></div></div>';
  }
  function drawConnectoren(page) {
    var items = state.connData || [];
    var top = state.connEdit ? connFormHtml(state.connEdit) : '<button class="btn btn-primary" id="conn-new" style="margin-bottom:16px">+ Nieuwe connector</button>';
    var list = items.length ? '<div class="conn-list">' + items.map(connCardHtml).join('') + '</div>' : '<div class="empty"><p>Nog geen connectoren. Koppel een MCP-server om externe tools aan je agents toe te voegen.</p></div>';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Connectoren</h1><div class="sub">Koppel externe MCP-servers zodat je AI-agents hun tools live kunnen gebruiken.</div></div>' + top + list + '</div>';
    wireConnectoren(page);
  }
  function wireConnectoren(page) {
    var nb = $('conn-new'); if (nb) nb.onclick = function () { state.connEdit = connBlank(); drawConnectoren(page); window.scrollTo(0, 0); };
    Array.prototype.forEach.call(page.querySelectorAll('[data-cedit]'), function (b) { b.onclick = function () { var c = (state.connData || []).filter(function (x) { return x.id === b.getAttribute('data-cedit'); })[0]; if (c) { state.connEdit = JSON.parse(JSON.stringify(c)); drawConnectoren(page); window.scrollTo(0, 0); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-cdel]'), function (b) { b.onclick = function () { var id = b.getAttribute('data-cdel'); var c = (state.connData || []).filter(function (x) { return x.id === id; })[0]; if (!confirm('Connector "' + ((c && c.naam) || '') + '" verwijderen?')) return; api('teamMcpDelete', { id: id }).then(function (r) { if (r && r.ok) { state.connData = state.connData.filter(function (x) { return x.id !== id; }); toast('Verwijderd ✓'); drawConnectoren(page); } else toast('Verwijderen mislukt'); }); }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-test]'), function (b) { b.onclick = function () { var id = b.getAttribute('data-test'); var old = b.textContent; b.textContent = '⏳'; api('teamMcpTest', { id: id }, { timeout: 30000 }).then(function (r) { b.textContent = old; if (r && r.ok) { toast(r.tools_count + ' tools opgehaald ✓'); renderConnectoren(page); } else toast((r && r.message) || 'Test mislukt'); }).catch(function () { b.textContent = old; toast('Test mislukt'); }); }; });
    if (state.connEdit) wireConnForm(page);
  }
  function wireConnForm(page) {
    var test = $('cf-test'); if (test) test.onclick = function () {
      var url = (($('cf-url') || {}).value || '').trim(); var token = ($('cf-token') || {}).value || '';
      if (!/^https:\/\//i.test(url)) { toast('Geef een geldige https-URL'); return; }
      test.disabled = true; test.textContent = '⏳ Testen…';
      var resEl = $('cf-test-res'); if (resEl) resEl.textContent = '';
      var body = { url: url }; if (token) body.auth_token = token; else if (state.connEdit.id) body.id = state.connEdit.id;
      api('teamMcpTest', body, { timeout: 30000 }).then(function (r) {
        test.disabled = false; test.textContent = '🔄 Testen + tools ophalen';
        var res = $('cf-test-res'), tl = $('cf-tools');
        if (r && r.error === 'oauth_required') { if (res) { res.textContent = '🔐 deze server vereist inloggen → gebruik "Verbinden via login"'; res.className = 'conn-test-res'; } var ob = $('cf-oauth'); if (ob) ob.classList.add('pulse'); return; }
        if (!r || !r.ok) { if (res) { res.textContent = '✗ ' + ((r && r.message) || 'mislukt'); res.className = 'conn-test-res bad'; } if (tl) tl.innerHTML = ''; return; }
        if (res) { res.textContent = '✓ verbonden' + (r.server && r.server.name ? ' met ' + r.server.name : '') + ' · ' + r.tools_count + ' tools'; res.className = 'conn-test-res ok'; }
        if (tl) tl.innerHTML = (r.tools || []).map(function (t) { return '<div class="conn-tool"><b>' + esc(t.name) + '</b>' + (t.description ? '<span>' + esc(t.description) + '</span>' : '') + '</div>'; }).join('');
      }).catch(function () { test.disabled = false; test.textContent = '🔄 Testen + tools ophalen'; var res = $('cf-test-res'); if (res) { res.textContent = '✗ verbinding mislukt'; res.className = 'conn-test-res bad'; } });
    };
    var oauth = $('cf-oauth'); if (oauth) oauth.onclick = function () { connOauthConnect(page); };
    var cpr = $('cf-copyredir'); if (cpr) cpr.onclick = function () { var t = (($('cf-redirect') || {}).textContent || ''); try { navigator.clipboard.writeText(t); toast('Redirect-URL gekopieerd ✓'); } catch (e) { toast(t); } };
    var cancel = $('cf-cancel'); if (cancel) cancel.onclick = function () { state.connEdit = null; drawConnectoren(page); };
    var save = $('cf-save'); if (save) save.onclick = function () {
      var it = state.connEdit;
      it.naam = (($('cf-naam') || {}).value || '').trim();
      it.ic = (($('cf-ic') || {}).value || '🔌').trim() || '🔌';
      it.url = (($('cf-url') || {}).value || '').trim();
      var tok = ($('cf-token') || {}).value || '';
      if (!it.naam) { toast('Geef de connector een naam'); return; }
      if (!/^https:\/\//i.test(it.url)) { toast('Geef een geldige https-URL'); return; }
      var item = { id: it.id, naam: it.naam, ic: it.ic, url: it.url, app_client_id: (($('cf-appid') || {}).value || '').trim() };
      if (tok) item.auth_token = tok;
      var appsec = ($('cf-appsecret') || {}).value || ''; if (appsec) item.app_client_secret = appsec;
      save.disabled = true; save.textContent = 'Opslaan…';
      api('teamMcpSave', { item: item }).then(function (r) {
        save.disabled = false; save.textContent = 'Opslaan';
        if (r && r.ok && r.item) { toast('Opgeslagen ✓'); state.connEdit = null; var items = state.connData; var idx = -1; for (var i = 0; i < items.length; i++) if (items[i].id === r.item.id) { idx = i; break; } if (idx >= 0) items[idx] = r.item; else items.push(r.item); drawConnectoren(page); }
        else toast((r && r.message) || 'Opslaan mislukt');
      }).catch(function () { save.disabled = false; save.textContent = 'Opslaan'; toast('Opslaan mislukt'); });
    };
  }
  // OAuth-login-flow: vraag de authorize-URL op, open een popup, en wacht op het callback-signaal.
  function connOauthConnect(page) {
    var it = state.connEdit || {};
    var url = (($('cf-url') || {}).value || '').trim();
    if (!/^https:\/\//i.test(url)) { toast('Geef eerst een geldige https-URL'); return; }
    var body = { url: url };
    if (it.id) body.id = it.id;
    else { body.naam = (($('cf-naam') || {}).value || '').trim() || 'MCP-connector'; body.ic = (($('cf-ic') || {}).value || '🔌').trim(); }
    // eigen OAuth-app uit de form meesturen (voor Meta/Google die geen auto-registratie doen)
    var appid = (($('cf-appid') || {}).value || '').trim(); if (appid) body.app_client_id = appid;
    var appsec = ($('cf-appsecret') || {}).value || ''; if (appsec) body.app_client_secret = appsec;
    var btn = $('cf-oauth'); if (btn) { btn.disabled = true; btn.textContent = '⏳ Verbinden…'; btn.classList.remove('pulse'); }
    api('teamMcpOauthStart', body, { timeout: 30000 }).then(function (r) {
      if (btn) { btn.disabled = false; btn.textContent = '🔐 Verbinden via login'; }
      if (!r || !r.ok || !r.authorize_url) { toast((r && r.message) || 'Kon de login niet starten'); return; }
      var pop = window.open(r.authorize_url, 'mcp-oauth', 'width=620,height=780,menubar=no,toolbar=no');
      if (!pop) { toast('Sta pop-ups toe om te verbinden'); return; }
      var done = false;
      function onMsg(ev) { if (ev && ev.data && ev.data.type === 'mcp-oauth') { done = true; window.removeEventListener('message', onMsg); clearInterval(iv); if (ev.data.ok) { toast('Verbonden ✓'); renderConnectoren(page); } else toast('Verbinden mislukt'); } }
      window.addEventListener('message', onMsg);
      // fallback als postMessage geblokkeerd is: ververs zodra de popup sluit
      var iv = setInterval(function () { if (pop.closed) { clearInterval(iv); window.removeEventListener('message', onMsg); if (!done) renderConnectoren(page); } }, 1200);
    }).catch(function () { if (btn) { btn.disabled = false; btn.textContent = '🔐 Verbinden via login'; } toast('Kon de login niet starten'); });
  }

  /* ---- SKILLS: multi-step stappenplannen (admin bouwt, iedereen runt) ---- */
  function skillBlank() { return { id: '', naam: '', ic: '✨', beschrijving: '', model: '', categorie: '', invoer_label: '', access: { tools: [], mcp_servers: [] }, stappen: [{ id: 's' + Date.now().toString(36), naam: '', prompt: '', tools: [], mcp_servers: [], parallel: false }], knop: { aan: false, label: '', prompt: '', views: [], type_jobs: [], vis: { roles: [], members: [] } } }; }
  async function renderSkills(page) {
    state.skillEdit = null; state.skillRun = null;
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Skills</h1><div class="sub">Herbruikbare AI-taken met een vast stappenplan. Stappen kunnen parallel lopen (meerdere agents tegelijk) en elkaars uitvoer gebruiken.</div></div><div class="empty"><p>Laden…</p></div></div>';
    var d; try { d = await api('teamSkills', {}); } catch (e) { d = null; }
    if (state.route !== 'skills') return;
    if (!d || !d.ok) { var ep = page.querySelector('.empty p'); if (ep) ep.textContent = 'Kon de skills niet laden.'; return; }
    state.skillsData = d;
    // Geopend vanuit een skill-knop in een andere view: meteen runnen met de meegegeven invoer.
    if (state.pendingSkillRun) {
      var pend = state.pendingSkillRun; state.pendingSkillRun = null;
      var full = (d.items || []).filter(function (x) { return x.id === pend.skill.id; })[0] || pend.skill;
      state.skillRun = { skill: full, invoer: pend.invoer || '', outputs: null, busy: false };
      drawSkillRun(page); skillRunGo(page);
      return;
    }
    drawSkills(page);
  }
  function skillCardHtml(s) {
    var n = s.stappen ? s.stappen.length : (s.stappen_count || 0);
    return '<div class="agc" data-skrun="' + esc(s.id) + '">' +
      '<div class="agc-ic">' + esc(s.ic || '✨') + '</div>' +
      '<div class="agc-main"><div class="agc-nm">' + esc(s.naam) + '</div>' +
      '<div class="agc-meta"><span class="agc-mdl">' + svgIc(IC.layers, 13) + ' ' + n + ' stap' + (n !== 1 ? 'pen' : '') + '</span>' + (s.beschrijving ? '<span class="sk-desc">' + esc(s.beschrijving) + '</span>' : '') + '</div></div>' +
      (state.skillsData && state.skillsData.is_admin ? '<div class="agc-act"><button class="agc-btn" data-skedit="' + esc(s.id) + '" title="Bewerken" aria-label="Bewerken">' + svgIc(IC.edit, 15) + '</button><button class="agc-btn del" data-skdel="' + esc(s.id) + '" title="Verwijderen" aria-label="Verwijderen">' + svgIc(IC.trash, 15) + '</button></div>' : '') +
      '<svg class="arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></div>';
  }
  function skillStepHtml(step, d, si) {
    return '<div class="sk-step' + (step._collapsed ? ' collapsed' : '') + '" data-si="' + si + '">' +
      '<div class="sk-step-h"><span class="sk-step-num">' + (si + 1) + '</span>' +
        '<input type="text" class="sk-step-naam" data-si="' + si + '" value="' + esc(step.naam || '') + '" placeholder="Naam van de stap (bv. Data ophalen)" maxlength="60">' +
        '<label class="sk-par" title="Loopt samen met de vorige parallelle stap"><input type="checkbox" class="sk-step-par" data-si="' + si + '"' + (step.parallel ? ' checked' : '') + '> parallel</label>' +
        '<button type="button" class="sk-step-toggle" data-si="' + si + '" title="Open of sluit deze stap" aria-label="Open of sluit deze stap">' + svgIc(IC.chev, 16) + '</button>' +
        '<button type="button" class="sk-step-del" data-si="' + si + '" title="Stap verwijderen" aria-label="Stap verwijderen">' + svgIc(IC.trash, 14) + '</button></div>' +
      '<div class="sk-step-body">' +
        '<textarea class="sk-step-prompt" data-si="' + si + '" rows="3" placeholder="Wat moet deze stap doen?">' + esc(step.prompt || '') + '</textarea>' +
        '<details class="sk-step-override"' + (step._override ? ' open' : '') + '><summary>Andere bronnen voor enkel deze stap</summary>' + accessChipsHtml(step, d, { label: 'Bronnen voor deze stap' }) + '</details>' +
      '</div></div>';
  }
  function skillFormHtml(it, d) {
    it.access = it.access || { tools: [], mcp_servers: [] };
    var steps = (it.stappen || []).map(function (s, i) { return skillStepHtml(s, d, i); }).join('');
    var manualOpen = (it.id || it._manualOpen) ? ' open' : '';
    return '<div class="aib-form ag-form mk-form"><div class="aib-form-h">' + (it.id ? 'Skill bewerken' : 'Nieuwe skill') + '</div>' +
      aiHeroHtml(d, 'skill', !!it.id, it) +
      '<details class="mk-manual"' + manualOpen + '><summary>' + (it.id ? 'Velden' : 'Of vul het zelf in') + '</summary>' +
        '<div class="mk-blok">' +
          '<div class="aib-grid"><div class="field"><label>Naam<span class="mk-req"></span></label><input type="text" id="skf-naam" value="' + esc(it.naam) + '" maxlength="80" placeholder="bv. Klant-onderzoek, Wekelijkse adsrapportage"></div><div class="field aib-icf"><label>Icoon</label><input type="text" id="skf-ic" value="' + esc(it.ic || '✨') + '" maxlength="4"></div></div>' +
          '<div class="field"><label>Korte omschrijving</label><input type="text" id="skf-besch" value="' + esc(it.beschrijving || '') + '" maxlength="200" placeholder="Wat doet deze skill? (1 zin)"></div>' +
        '</div>' +
        '<div class="mk-blok"><div class="sk-steps-h"><label>Stappenplan<span class="mk-req"></span></label><span class="fc-hint">gebruik {invoer} en {stap1}, {stap2} om eerdere uitvoer te hergebruiken; vink parallel om stappen samen te laten lopen</span></div>' +
          '<div id="skf-steps">' + steps + '</div>' +
          '<button type="button" class="btn btn-outline btn-sm" id="skf-addstep" style="margin:4px 0 14px">+ Stap toevoegen</button>' +
          '<div id="skf-access">' + accessChipsHtml(it.access, d, { label: 'Bronnen die elke stap mag gebruiken' }) + '</div>' +
        '</div>' +
        '<details class="mk-adv" data-adv="Gea"' + mkAdvOpen(it, 'Gea') + '>' + advSummary('Geavanceerd', [(it.invoer_label || '').trim() ? 'invoerveld' : '', (it.categorie || '').trim() ? 'categorie' : '']) +
          '<div class="field"><label>Invoerveld <span class="fc-hint">label van het startveld, leeg = geen invoer</span></label><input type="text" id="skf-invoer" value="' + esc(it.invoer_label || '') + '" maxlength="80" placeholder="bv. Klantnaam, Onderwerp"></div>' +
          categorieFieldHtml(it, d, 'skf-cat') +
        '</details>' +
        '<details class="mk-adv" data-adv="Knop"' + mkAdvOpen(it, 'Knop', it.knop && it.knop.aan) + '>' + advSummary('Publiceren als knop', [(it.knop && it.knop.aan) ? 'knop actief' : '']) +
          agfKnopHtml(it, d) +
        '</details>' +
      '</details>' +
      '<div class="aib-form-actions"><button class="btn btn-primary" id="skf-save">Opslaan</button><button class="btn btn-outline" id="skf-cancel">Annuleren</button></div></div>';
  }
  function drawSkills(page) {
    var d = state.skillsData, items = d.items || [], admin = d.is_admin;
    if (state.skillRun) { drawSkillRun(page); return; }
    var top = '';
    if (admin) top = state.skillEdit ? skillFormHtml(state.skillEdit, d) : '<button class="btn btn-primary" id="sk-new" style="margin-bottom:16px">+ Nieuwe skill</button>';
    var list = items.length ? groupedCardsHtml(items, skillCardHtml) : '<div class="empty"><p>' + (admin ? 'Nog geen skills. Bouw je eerste stappenplan.' : 'Er zijn nog geen skills. De zaakvoerder maakt ze aan.') + '</p></div>';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Skills</h1><div class="sub">Herbruikbare AI-taken met een vast stappenplan. Stappen kunnen parallel lopen en elkaars uitvoer gebruiken.</div></div>' + top + list + '</div>';
    wireSkills(page);
  }
  function wireSkills(page) {
    var nb = $('sk-new'); if (nb) nb.onclick = function () { state.skillEdit = skillBlank(); drawSkills(page); window.scrollTo(0, 0); };
    Array.prototype.forEach.call(page.querySelectorAll('.agc[data-skrun]'), function (c) { c.onclick = function (e) { if (e.target && e.target.closest && e.target.closest('.agc-act')) return; var s = (state.skillsData.items || []).filter(function (x) { return x.id === c.getAttribute('data-skrun'); })[0]; if (s) { state.skillRun = { skill: s, outputs: null, busy: false }; drawSkills(page); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-skedit]'), function (b) { if (!b.closest('.agc')) return; b.onclick = function (e) { e.stopPropagation(); var s = (state.skillsData.items || []).filter(function (x) { return x.id === b.getAttribute('data-skedit'); })[0]; if (s) { state.skillEdit = JSON.parse(JSON.stringify(s)); if (!state.skillEdit.stappen || !state.skillEdit.stappen.length) state.skillEdit.stappen = skillBlank().stappen; skillEnsureAccess(state.skillEdit); drawSkills(page); window.scrollTo(0, 0); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-skdel]'), function (b) { if (!b.closest('.agc')) return; b.onclick = function (e) { e.stopPropagation(); var id = b.getAttribute('data-skdel'); var s = (state.skillsData.items || []).filter(function (x) { return x.id === id; })[0]; if (!confirm('Skill "' + ((s && s.naam) || '') + '" verwijderen?')) return; api('teamSkillDelete', { id: id }).then(function (r) { if (r && r.ok) { state.skillsData.items = state.skillsData.items.filter(function (x) { return x.id !== id; }); toast('Verwijderd ✓'); drawSkills(page); } else toast('Verwijderen mislukt'); }); }; });
    if (state.skillEdit) wireSkillForm(page);
  }
  function syncSkillForm(it) {
    it._manualOpen = true;
    it._aibDesc = ($('skill-aib-desc') || {}).value || it._aibDesc || '';
    it.naam = (($('skf-naam') || {}).value || '').trim();
    it.ic = (($('skf-ic') || {}).value || '✨').trim() || '✨';
    it.beschrijving = (($('skf-besch') || {}).value || '').trim();
    it.model = ($('skill-aib-model') || {}).value || it.model || '';
    it.categorie = (($('skf-cat') || {}).value || '').trim();
    it.invoer_label = (($('skf-invoer') || {}).value || '').trim();
    if ($('agf-knop-aan')) { if (!it.knop) it.knop = { aan: false, label: '', prompt: '', views: [], type_jobs: [], vis: { roles: [], members: [] } }; it.knop.aan = !!$('agf-knop-aan').checked; it.knop.label = (($('agf-knop-label') || {}).value || '').trim(); it.knop.prompt = (($('agf-knop-prompt') || {}).value || '').trim(); }
  }
  function wireSkillForm(page) {
    var d = state.skillsData, it = state.skillEdit;
    // stap-velden: direct in de state houden (geen herrender = geen focus-verlies)
    Array.prototype.forEach.call(page.querySelectorAll('.sk-step-naam'), function (el) { el.oninput = function () { var i = +el.getAttribute('data-si'); if (it.stappen[i]) it.stappen[i].naam = el.value; }; });
    Array.prototype.forEach.call(page.querySelectorAll('.sk-step-prompt'), function (el) { el.oninput = function () { var i = +el.getAttribute('data-si'); if (it.stappen[i]) it.stappen[i].prompt = el.value; }; });
    Array.prototype.forEach.call(page.querySelectorAll('.sk-step-par'), function (el) { el.onchange = function () { var i = +el.getAttribute('data-si'); if (it.stappen[i]) it.stappen[i].parallel = el.checked; }; });
    // Skill-niveau bronnen-zone (scoped, zodat het de per-stap-overrides niet meepakt)
    if (!it.access) it.access = { tools: [], mcp_servers: [] };
    wireAccessChips(page, function () { return it.access; }, document.getElementById('skf-access'));
    // Per-stap override-bronnen: scoped per stap; elke toggle markeert de stap als _override
    Array.prototype.forEach.call(page.querySelectorAll('.sk-step'), function (stepEl) { var i = +stepEl.getAttribute('data-si'); var st = it.stappen[i]; if (!st) return; wireAccessChips(page, function () { st._override = true; return st; }, stepEl.querySelector('.sk-step-override')); });
    // Stap open/dicht
    Array.prototype.forEach.call(page.querySelectorAll('.sk-step-toggle'), function (b) { b.onclick = function () { var st = b.closest('.sk-step'); if (!st) return; st.classList.toggle('collapsed'); var i = +st.getAttribute('data-si'); if (it.stappen[i]) it.stappen[i]._collapsed = st.classList.contains('collapsed'); }; });
    Array.prototype.forEach.call(page.querySelectorAll('.sk-step-del'), function (b) { b.onclick = function () { syncSkillForm(it); var i = +b.getAttribute('data-si'); it.stappen.splice(i, 1); if (!it.stappen.length) it.stappen = skillBlank().stappen; drawSkills(page); }; });
    var add = $('skf-addstep'); if (add) add.onclick = function () { syncSkillForm(it); it.stappen.push({ id: 's' + Date.now().toString(36), naam: '', prompt: '', tools: [], mcp_servers: [], parallel: false }); drawSkills(page); };
    // AI-knop views- + type-job-chips (hergebruik agent-knop-wiring)
    Array.prototype.forEach.call(page.querySelectorAll('.ag-view'), function (b) { b.onclick = function () { var key = b.getAttribute('data-view'); if (!it.knop) it.knop = { aan: true, label: '', prompt: '', views: [], type_jobs: [] }; if (!Array.isArray(it.knop.views)) it.knop.views = []; var k = it.knop.views.indexOf(key); if (k >= 0) { it.knop.views.splice(k, 1); b.classList.remove('on'); } else { it.knop.views.push(key); b.classList.add('on'); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('.ag-typejob'), function (b) { b.onclick = function () { var key = b.getAttribute('data-typejob'); if (!it.knop) it.knop = { aan: true, label: '', prompt: '', views: [], type_jobs: [] }; if (!Array.isArray(it.knop.type_jobs)) it.knop.type_jobs = []; var k = it.knop.type_jobs.indexOf(key); if (k >= 0) { it.knop.type_jobs.splice(k, 1); b.classList.remove('on'); } else { it.knop.type_jobs.push(key); b.classList.add('on'); } }; });
    wireKnopVis(page, function () { return it; });
    wireMkAdv(page, function () { return it; });
    wireAiBuildBox(page, 'skill', function () { return it; }, function () { drawSkills(page); window.scrollTo(0, 0); }, function (x) { x.model = ($('skill-aib-model') || {}).value || x.model; });
    var knopAan = $('agf-knop-aan'); if (knopAan) knopAan.onchange = function () { var bd = $('agf-knop-body'); if (bd) bd.style.display = this.checked ? '' : 'none'; };
    var cancel = $('skf-cancel'); if (cancel) cancel.onclick = function () { state.skillEdit = null; drawSkills(page); };
    var save = $('skf-save'); if (save) save.onclick = function () {
      it.naam = (($('skf-naam') || {}).value || '').trim();
      it.ic = (($('skf-ic') || {}).value || '✨').trim() || '✨';
      it.beschrijving = (($('skf-besch') || {}).value || '').trim();
      it.model = ($('skill-aib-model') || {}).value || it.model || '';
      it.categorie = (($('skf-cat') || {}).value || '').trim();
      it.invoer_label = (($('skf-invoer') || {}).value || '').trim();
      it.knop = { aan: !!(($('agf-knop-aan') || {}).checked), label: (($('agf-knop-label') || {}).value || '').trim(), prompt: (($('agf-knop-prompt') || {}).value || '').trim(), views: (it.knop && Array.isArray(it.knop.views)) ? it.knop.views : [], type_jobs: (it.knop && Array.isArray(it.knop.type_jobs)) ? it.knop.type_jobs : [], vis: knopVisOut(it) };
      // bronnen op skill-niveau verdelen over elke stap (behalve waar de stap een eigen override koos), zodat de runner ongewijzigd blijft
      var aTools = (it.access && Array.isArray(it.access.tools)) ? it.access.tools : [];
      var aMcp = (it.access && Array.isArray(it.access.mcp_servers)) ? it.access.mcp_servers : [];
      it.stappen = (it.stappen || []).filter(function (s) { return (s.prompt || '').trim(); }).map(function (s) { var ov = s._override; delete s._collapsed; delete s._override; if (!ov) { s.tools = aTools.slice(); s.mcp_servers = aMcp.slice(); } return s; });
      delete it._manualOpen; delete it._aibDesc; delete it._advGeaOpen; delete it._advKnopOpen;
      if (!it.naam) { toast('Geef de skill een naam'); return; }
      if (!it.stappen.length) { toast('Voeg minstens één stap met een prompt toe'); return; }
      if (it.knop.aan && !it.knop.views.length && !it.knop.type_jobs.length) { toast('Kies een view of een type job voor de knop'); return; }
      save.disabled = true; save.textContent = 'Opslaan…';
      api('teamSkillSave', { item: it }).then(function (r) {
        save.disabled = false; save.textContent = 'Opslaan';
        if (r && r.ok && r.item) { toast('Opgeslagen ✓'); state.skillEdit = null; var items = state.skillsData.items; var idx = -1; for (var i = 0; i < items.length; i++) if (items[i].id === r.item.id) { idx = i; break; } if (idx >= 0) items[idx] = r.item; else items.push(r.item); drawSkills(page); }
        else toast((r && r.message) || 'Opslaan mislukt');
      }).catch(function () { save.disabled = false; save.textContent = 'Opslaan'; toast('Opslaan mislukt'); });
    };
  }
  function drawSkillRun(page) {
    var rs = state.skillRun, s = rs.skill;
    var out = '';
    if (rs.busy) out = '<div class="sk-out"><div class="kd-ai-loading">De skill loopt (' + ((s.stappen && s.stappen.length) || s.stappen_count || '') + ' stappen)… dit kan even duren.</div></div>';
    else if (rs.outputs) out = '<div class="sk-out">' + rs.outputs.map(function (o, i) { return '<div class="sk-out-step"><div class="sk-out-h"><span class="sk-out-num">' + (i + 1) + '</span><b>' + esc(o.naam) + '</b>' + (o.parallel ? '<span class="sk-out-par">parallel</span>' : '') + (o.bronnen && o.bronnen.length ? '<span class="sk-out-br">📡 ' + o.bronnen.length + '</span>' : '') + '</div><div class="sk-out-tx">' + agentFmt(o.tekst) + '</div></div>'; }).join('') + '</div>';
    page.innerHTML = '<div class="panel active"><button class="backlink" id="sk-back"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg> Skills</button>' +
      '<div class="t-hero"><h1>' + esc(s.ic || '✨') + ' ' + esc(s.naam) + '</h1>' + (s.beschrijving ? '<div class="sub">' + esc(s.beschrijving) + '</div>' : '') + '</div>' +
      '<div class="sk-run">' + (s.invoer_label ? '<div class="field"><label>' + esc(s.invoer_label) + '</label><textarea id="skr-in" rows="2" ' + (rs.busy ? 'disabled' : '') + '>' + esc(rs.invoer || '') + '</textarea></div>' : '') +
      '<button class="btn btn-primary" id="skr-go" ' + (rs.busy ? 'disabled' : '') + '>▶ Skill uitvoeren</button>' + out + '</div></div>';
    var back = $('sk-back'); if (back) back.onclick = function () { state.skillRun = null; drawSkills(page); };
    var go = $('skr-go'); if (go) go.onclick = function () { skillRunGo(page); };
  }
  function skillRunGo(page) {
    var rs2 = state.skillRun; if (!rs2 || rs2.busy) return;
    var inEl = $('skr-in'); if (inEl) rs2.invoer = (inEl.value || '').trim();
    rs2.busy = true; rs2.outputs = null; drawSkillRun(page);
    api('teamSkillRun', { skill_id: rs2.skill.id, invoer: rs2.invoer || '' }, { timeout: 180000 }).then(function (r) {
      rs2.busy = false;
      if (r && r.ok) rs2.outputs = r.outputs || [];
      else { rs2.outputs = [{ naam: 'Fout', tekst: '⚠️ ' + ((r && r.message) || 'Er ging iets mis.'), bronnen: [] }]; }
      if (state.route === 'skills' && state.skillRun === rs2) drawSkillRun(page);
    }).catch(function () { rs2.busy = false; rs2.outputs = [{ naam: 'Fout', tekst: '⚠️ Verbinding mislukt of duurde te lang.', bronnen: [] }]; if (state.route === 'skills' && state.skillRun === rs2) drawSkillRun(page); });
  }

  /* ---- PLUGINS: bundels van skills + agents (admin) ---- */
  function pluginBlank() { return { id: '', naam: '', ic: '🧩', beschrijving: '', categorie: '', skill_ids: [], agent_ids: [], access: { tools: [], mcp_servers: [] }, knop: { aan: false, label: '', prompt: '', views: [], type_jobs: [], vis: { roles: [], members: [] } } }; }
  async function renderPlugins(page) {
    state.pluginEdit = null; state.pluginRun = null;
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Plugins</h1><div class="sub">Bundel skills tot één pakket dat als keten loopt. Geef het een knop bij de juiste type jobs of zet het als 1-klik-knop in een view.</div></div><div class="empty"><p>Laden…</p></div></div>';
    var d; try { d = await api('teamPlugins', {}); } catch (e) { d = null; }
    if (state.route !== 'plugins') return;
    if (!d || !d.ok) { var ep = page.querySelector('.empty p'); if (ep) ep.textContent = 'Kon de plugins niet laden.'; return; }
    state.pluginsData = d;
    if (state.pendingPluginRun) {
      var pp = state.pendingPluginRun; state.pendingPluginRun = null;
      var full = (d.items || []).filter(function (x) { return x.id === pp.plugin.id; })[0] || pp.plugin;
      state.pluginRun = { plugin: full, invoer: pp.invoer || '', blokken: null, busy: false };
      drawPluginRun(page); pluginRunGo(page);
      return;
    }
    drawPlugins(page);
  }
  function pluginCardHtml(p) {
    var all = (p.skills || []).map(function (s) { return { ag: false, t: (s.ic || '✨') + ' ' + s.naam }; }).concat((p.agents || []).map(function (a) { return { ag: true, t: (a.ic || '🤖') + ' ' + a.naam }; }));
    var chips = all.slice(0, 3).map(function (c) { return '<span class="pl-chip' + (c.ag ? ' pl-chip-ag' : '') + '">' + esc(c.t) + '</span>'; }).join('') + (all.length > 3 ? '<span class="pl-chip pl-more">+' + (all.length - 3) + '</span>' : '');
    var runnable = (p.skill_ids || []).length > 0;
    var meta = (p.knop && p.knop.aan ? '<span class="agc-kn">🔘 knop</span>' : '');
    return '<div class="agc pl-card"' + (runnable ? ' data-plrun="' + esc(p.id) + '"' : '') + '>' +
      '<div class="agc-ic">' + esc(p.ic || '🧩') + '</div>' +
      '<div class="agc-main"><div class="agc-nm">' + esc(p.naam) + (meta ? ' ' + meta : '') + '</div>' + (p.beschrijving ? '<div class="sk-desc">' + esc(p.beschrijving) + '</div>' : '') +
      '<div class="pl-chips">' + (chips || '<span class="micro" style="color:var(--ink-4)">nog leeg</span>') + '</div></div>' +
      '<div class="agc-act"><button class="agc-btn" data-plexp="' + esc(p.id) + '" title="Exporteren als JSON" aria-label="Exporteren">' + svgIc(IC.dl, 15) + '</button><button class="agc-btn" data-pledit="' + esc(p.id) + '" title="Bewerken" aria-label="Bewerken">' + svgIc(IC.edit, 15) + '</button><button class="agc-btn del" data-pldel="' + esc(p.id) + '" title="Verwijderen" aria-label="Verwijderen">' + svgIc(IC.trash, 15) + '</button></div>' +
      (runnable ? '<svg class="arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' : '') + '</div>';
  }
  function pluginFormHtml(it, d) {
    var skChips = (d.alle_skills || []).map(function (s) { var on = (it.skill_ids || []).indexOf(s.id) >= 0; var ord = (it.skill_ids || []).indexOf(s.id); return '<button type="button" class="mt-chip pl-sel' + (on ? ' on' : '') + '" data-plsk="' + esc(s.id) + '">' + (on ? '<span class="pl-ord">' + (ord + 1) + '</span> ' : '') + esc((s.ic || '✨') + ' ' + s.naam) + '</button>'; }).join('') || '<span class="micro" style="color:var(--ink-4)">nog geen skills gebouwd</span>';
    var agChips = (d.alle_agents || []).map(function (a) { var on = (it.agent_ids || []).indexOf(a.id) >= 0; return '<button type="button" class="mt-chip pl-sel pl-sel-ag' + (on ? ' on' : '') + '" data-plag="' + esc(a.id) + '">' + esc((a.ic || '🤖') + ' ' + a.naam) + '</button>'; }).join('') || '<span class="micro" style="color:var(--ink-4)">nog geen agents gebouwd</span>';
    var manualOpen = (it.id || it._manualOpen) ? ' open' : '';
    return '<div class="aib-form ag-form mk-form"><div class="aib-form-h">' + (it.id ? 'Plugin bewerken' : 'Nieuwe plugin') + '</div>' +
      aiHeroHtml(d, 'plugin', !!it.id, it) +
      '<details class="mk-manual"' + manualOpen + '><summary>' + (it.id ? 'Velden' : 'Of vul het zelf in') + '</summary>' +
        '<div class="mk-blok">' +
          '<div class="aib-grid"><div class="field"><label>Naam<span class="mk-req"></span></label><input type="text" id="plf-naam" value="' + esc(it.naam) + '" maxlength="80" placeholder="bv. Klant-onboarding, Wekelijkse rapportage"></div><div class="field aib-icf"><label>Icoon</label><input type="text" id="plf-ic" value="' + esc(it.ic || '🧩') + '" maxlength="4"></div></div>' +
          '<div class="field"><label>Omschrijving</label><input type="text" id="plf-besch" value="' + esc(it.beschrijving || '') + '" maxlength="200" placeholder="Wat zit er in dit pakket?"></div>' +
        '</div>' +
        '<div class="mk-blok"><div class="field"><label>Skills in deze keten<span class="mk-req"></span> <span class="fc-hint">lopen na elkaar, uitvoer wordt de volgende invoer</span></label><div class="mt-chips">' + skChips + '</div></div>' +
          '<div class="field"><label>Agents meebundelen <span class="fc-hint">mee bij export, draaien niet in de keten</span></label><div class="mt-chips">' + agChips + '</div></div>' +
          accessChipsHtml(it.access, d, { label: 'Bronnen die elke skill in de keten mag gebruiken' }) +
        '</div>' +
        '<details class="mk-adv" data-adv="Gea"' + mkAdvOpen(it, 'Gea') + '>' + advSummary('Geavanceerd', [(it.categorie || '').trim() ? 'categorie' : '']) +
          categorieFieldHtml(it, d, 'plf-cat') +
        '</details>' +
        '<details class="mk-adv" data-adv="Knop"' + mkAdvOpen(it, 'Knop', it.knop && it.knop.aan) + '>' + advSummary('Publiceren als knop', [(it.knop && it.knop.aan) ? 'knop actief' : '']) +
          agfKnopHtml(it, d) +
        '</details>' +
      '</details>' +
      '<div class="aib-form-actions"><button class="btn btn-primary" id="plf-save">Opslaan</button><button class="btn btn-outline" id="plf-cancel">Annuleren</button></div></div>';
  }
  function drawPlugins(page) {
    if (state.pluginRun) { drawPluginRun(page); return; }
    var d = state.pluginsData, items = d.items || [];
    var top = state.pluginEdit ? pluginFormHtml(state.pluginEdit, d) : (d.is_admin ? '<div class="pl-top" style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap"><button class="btn btn-primary" id="pl-new">+ Nieuwe plugin</button><button class="btn btn-outline btn-sm" id="pl-import">⬆ Importeren</button></div>' : '');
    var list = items.length ? groupedCardsHtml(items, pluginCardHtml) : '<div class="empty"><p>Nog geen plugins. Bundel skills tot een herbruikbaar pakket dat als keten loopt.</p></div>';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Plugins</h1><div class="sub">Bundel skills tot één pakket dat als keten loopt. Geef het een knop bij de juiste type jobs of zet het als 1-klik-knop in een view.</div></div>' + top + list + '</div>';
    wirePlugins(page);
  }
  function wirePlugins(page) {
    var nb = $('pl-new'); if (nb) nb.onclick = function () { state.pluginEdit = pluginBlank(); drawPlugins(page); window.scrollTo(0, 0); };
    var imp = $('pl-import'); if (imp) imp.onclick = function () { pluginImport(page); };
    Array.prototype.forEach.call(page.querySelectorAll('.agc[data-plrun]'), function (c) { c.onclick = function (e) { if (e.target && e.target.closest && e.target.closest('.agc-act')) return; var p = (state.pluginsData.items || []).filter(function (x) { return x.id === c.getAttribute('data-plrun'); })[0]; if (p) { state.pluginRun = { plugin: p, invoer: '', blokken: null, busy: false }; drawPluginRun(page); window.scrollTo(0, 0); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-pledit]'), function (b) { b.onclick = function () { var p = (state.pluginsData.items || []).filter(function (x) { return x.id === b.getAttribute('data-pledit'); })[0]; if (p) { state.pluginEdit = JSON.parse(JSON.stringify(p)); if (!state.pluginEdit.access) state.pluginEdit.access = { tools: [], mcp_servers: [] }; if (!state.pluginEdit.knop) state.pluginEdit.knop = { aan: false, label: '', prompt: '', views: [], type_jobs: [], vis: { roles: [], members: [] } }; drawPlugins(page); window.scrollTo(0, 0); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-pldel]'), function (b) { b.onclick = function () { var id = b.getAttribute('data-pldel'); var p = (state.pluginsData.items || []).filter(function (x) { return x.id === id; })[0]; if (!confirm('Plugin "' + ((p && p.naam) || '') + '" verwijderen? (de skills/agents zelf blijven bestaan)')) return; api('teamPluginDelete', { id: id }).then(function (r) { if (r && r.ok) { state.pluginsData.items = state.pluginsData.items.filter(function (x) { return x.id !== id; }); toast('Verwijderd ✓'); drawPlugins(page); } else toast('Verwijderen mislukt'); }); }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-plexp]'), function (b) { b.onclick = function () { var id = b.getAttribute('data-plexp'); var p = (state.pluginsData.items || []).filter(function (x) { return x.id === id; })[0]; pluginExport(id, p && p.naam); }; });
    if (state.pluginEdit) wirePluginForm(page);
  }
  function syncPluginForm(it) {
    it._manualOpen = true;   // we zitten in het handmatige blok; houd het open bij een redraw
    it._aibDesc = ($('plugin-aib-desc') || {}).value || it._aibDesc || '';
    it.naam = (($('plf-naam') || {}).value || '').trim();
    it.ic = (($('plf-ic') || {}).value || '🧩').trim() || '🧩';
    it.beschrijving = (($('plf-besch') || {}).value || '').trim();
    it.categorie = (($('plf-cat') || {}).value || '').trim();
    // knop-velden (label/prompt/aan) ook bewaren, anders verloren bij een redraw na skill-toggle
    if ($('agf-knop-aan')) { if (!it.knop) it.knop = { aan: false, label: '', prompt: '', views: [], type_jobs: [], vis: { roles: [], members: [] } }; it.knop.aan = !!$('agf-knop-aan').checked; it.knop.label = (($('agf-knop-label') || {}).value || '').trim(); it.knop.prompt = (($('agf-knop-prompt') || {}).value || '').trim(); }
  }
  function wirePluginForm(page) {
    var it = state.pluginEdit;
    if (!it.access) it.access = { tools: [], mcp_servers: [] };
    // Skills = keten: aanklikken voegt achteraan toe (= volgorde); opnieuw klikken verwijdert. Herrender om de volgnummers bij te werken.
    Array.prototype.forEach.call(page.querySelectorAll('[data-plsk]'), function (b) { b.onclick = function () { var id = b.getAttribute('data-plsk'); if (!Array.isArray(it.skill_ids)) it.skill_ids = []; var i = it.skill_ids.indexOf(id); if (i >= 0) it.skill_ids.splice(i, 1); else it.skill_ids.push(id); syncPluginForm(it); drawPlugins(page); }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-plag]'), function (b) { b.onclick = function () { var id = b.getAttribute('data-plag'); if (!Array.isArray(it.agent_ids)) it.agent_ids = []; var i = it.agent_ids.indexOf(id); if (i >= 0) { it.agent_ids.splice(i, 1); b.classList.remove('on'); } else { it.agent_ids.push(id); b.classList.add('on'); } }; });
    wireAccessChips(page, function () { return it.access; });
    // AI-knop: views + type-jobs + vis (hergebruik agent/skill-knop-wiring)
    Array.prototype.forEach.call(page.querySelectorAll('.ag-view'), function (b) { b.onclick = function () { var key = b.getAttribute('data-view'); if (!it.knop) it.knop = { aan: true, label: '', prompt: '', views: [], type_jobs: [] }; if (!Array.isArray(it.knop.views)) it.knop.views = []; var k = it.knop.views.indexOf(key); if (k >= 0) { it.knop.views.splice(k, 1); b.classList.remove('on'); } else { it.knop.views.push(key); b.classList.add('on'); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('.ag-typejob'), function (b) { b.onclick = function () { var key = b.getAttribute('data-typejob'); if (!it.knop) it.knop = { aan: true, label: '', prompt: '', views: [], type_jobs: [] }; if (!Array.isArray(it.knop.type_jobs)) it.knop.type_jobs = []; var k = it.knop.type_jobs.indexOf(key); if (k >= 0) { it.knop.type_jobs.splice(k, 1); b.classList.remove('on'); } else { it.knop.type_jobs.push(key); b.classList.add('on'); } }; });
    wireKnopVis(page, function () { return it; });
    wireMkAdv(page, function () { return it; });
    wireAiBuildBox(page, 'plugin', function () { return it; }, function () { drawPlugins(page); window.scrollTo(0, 0); }, function (x) { syncPluginForm(x); });
    var knopAan = $('agf-knop-aan'); if (knopAan) knopAan.onchange = function () { var bd = $('agf-knop-body'); if (bd) bd.style.display = this.checked ? '' : 'none'; };
    var cancel = $('plf-cancel'); if (cancel) cancel.onclick = function () { state.pluginEdit = null; drawPlugins(page); };
    var save = $('plf-save'); if (save) save.onclick = function () {
      syncPluginForm(it);
      it.knop = { aan: !!(($('agf-knop-aan') || {}).checked), label: (($('agf-knop-label') || {}).value || '').trim(), prompt: (($('agf-knop-prompt') || {}).value || '').trim(), views: (it.knop && Array.isArray(it.knop.views)) ? it.knop.views : [], type_jobs: (it.knop && Array.isArray(it.knop.type_jobs)) ? it.knop.type_jobs : [], vis: knopVisOut(it) };
      if (!it.naam) { toast('Geef de plugin een naam'); return; }
      if (it.knop.aan && !it.knop.views.length && !it.knop.type_jobs.length) { toast('Kies een view of een type job voor de knop'); return; }
      if (it.knop.aan && !(it.skill_ids || []).length) { toast('Een plugin-knop heeft minstens één skill nodig om uit te voeren'); return; }
      delete it._manualOpen; delete it._aibDesc; delete it._advGeaOpen; delete it._advKnopOpen;
      save.disabled = true; save.textContent = 'Opslaan…';
      api('teamPluginSave', { item: it }).then(function (r) {
        save.disabled = false; save.textContent = 'Opslaan';
        if (r && r.ok) { toast('Opgeslagen ✓'); state.pluginEdit = null; renderPlugins(page); }
        else toast((r && r.message) || 'Opslaan mislukt');
      }).catch(function () { save.disabled = false; save.textContent = 'Opslaan'; toast('Opslaan mislukt'); });
    };
  }
  // Plugin-keten uitvoeren: toont per skill een blok met uitvoer (zoals een skill-run, maar over meerdere skills).
  function drawPluginRun(page) {
    var rs = state.pluginRun, p = rs.plugin;
    var n = (p.skill_ids || []).length;
    var out = '';
    if (rs.busy) out = '<div class="sk-out"><div class="kd-ai-loading">De plugin loopt als keten (' + n + ' skill' + (n !== 1 ? 's' : '') + ')… dit kan even duren.</div></div>';
    else if (rs.blokken) out = '<div class="sk-out">' + rs.blokken.map(function (b, i) { return '<div class="sk-out-step"><div class="sk-out-h"><span class="sk-out-num">' + (i + 1) + '</span><b>' + esc((b.ic || '✨') + ' ' + b.naam) + '</b>' + (b.ok ? '' : '<span class="sk-out-par" style="background:#fde2e2;color:#b42318">mislukt</span>') + '</div><div class="sk-out-tx">' + agentFmt(b.resultaat || '(geen uitvoer)') + '</div></div>'; }).join('') + '</div>';
    page.innerHTML = '<div class="panel active"><button class="backlink" id="pl-back"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg> Plugins</button>' +
      '<div class="t-hero"><h1>' + esc(p.ic || '🧩') + ' ' + esc(p.naam) + '</h1>' + (p.beschrijving ? '<div class="sub">' + esc(p.beschrijving) + '</div>' : '') + '</div>' +
      '<div class="sk-run"><div class="field"><label>Invoer <span class="micro" style="color:var(--ink-4)">(optioneel startpunt voor de eerste skill)</span></label><textarea id="plr-in" rows="2" ' + (rs.busy ? 'disabled' : '') + '>' + esc(rs.invoer || '') + '</textarea></div>' +
      '<button class="btn btn-primary" id="plr-go" ' + (rs.busy ? 'disabled' : '') + '>▶ Plugin uitvoeren</button>' + out + '</div></div>';
    var back = $('pl-back'); if (back) back.onclick = function () { state.pluginRun = null; drawPlugins(page); };
    var go = $('plr-go'); if (go) go.onclick = function () { pluginRunGo(page); };
  }
  function pluginRunGo(page) {
    var rs = state.pluginRun; if (!rs || rs.busy) return;
    var inEl = $('plr-in'); if (inEl) rs.invoer = (inEl.value || '').trim();
    rs.busy = true; rs.blokken = null; drawPluginRun(page);
    api('teamPluginRun', { plugin_id: rs.plugin.id, invoer: rs.invoer || '' }, { timeout: 240000 }).then(function (r) {
      rs.busy = false;
      if (r && r.ok) rs.blokken = r.blokken || [];
      else { rs.blokken = []; toast((r && r.message) || 'Uitvoeren mislukt'); }
      drawPluginRun(page);
    }).catch(function () { rs.busy = false; rs.blokken = []; toast('Uitvoeren mislukt'); drawPluginRun(page); });
  }
  function pluginExport(id, naam) {
    api('teamPluginExport', { id: id }).then(function (r) {
      if (!r || !r.ok || !r.bundle) { toast('Export mislukt'); return; }
      try {
        var blob = new Blob([JSON.stringify(r.bundle, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob); var a = document.createElement('a');
        a.href = url; a.download = (naam || 'plugin').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.s27plugin.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        toast('Geëxporteerd ✓');
      } catch (e) { toast('Download mislukt'); }
    }).catch(function () { toast('Export mislukt'); });
  }
  function pluginImport(page) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var bundle; try { bundle = JSON.parse(String(rd.result)); } catch (e) { toast('Ongeldig JSON-bestand'); return; }
        api('teamPluginImport', { bundle: bundle }).then(function (r) {
          if (r && r.ok) { toast('Geïmporteerd: ' + (r.geimporteerd ? r.geimporteerd.skills + ' skills, ' + r.geimporteerd.agents + ' agents' : 'klaar') + ' ✓'); renderPlugins(page); }
          else toast((r && r.message) || 'Import mislukt');
        }).catch(function () { toast('Import mislukt'); });
      };
      rd.readAsText(f);
    };
    inp.click();
  }

  /* ---- SOCIAL MEDIA (Danique + content + admin): per klant posts schrijven + AI-concepten + inplannen ---- */
  var SOC_NETS = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['tiktok', 'TikTok']];
  function socDecode(p) { var t = ''; try { t = decodeURIComponent(String(p.tekst || '')); } catch (e) { t = String(p.tekst || ''); } return t; }
  function socNetChips(sel, cls) { return SOC_NETS.map(function (n) { var on = (sel || []).indexOf(n[0]) >= 0; return '<button type="button" class="mt-chip soc-net ' + (cls || '') + (on ? ' on' : '') + '" data-net="' + n[0] + '">' + n[1] + '</button>'; }).join(''); }
  async function renderSocials(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Social posts</h1><div class="sub">Schrijf en plan social-media-posts per klant. De AI haalt de klantcontext en eerdere posts op en zet kant-en-klare concepten in Metricool.</div></div><div class="empty"><p>Klanten laden…</p></div></div>';
    if (!state.socClients) { var d; try { d = await api('teamSocials', {}); } catch (e) { d = null; } if (state.route !== 'socials') return; if (!d || !d.ok) { var ep = page.querySelector('.empty p'); if (ep) ep.textContent = 'Kon de klanten niet laden.'; return; } state.socClients = d.clients || []; }
    if (state.socSel) { await loadSocialClient(page); return; }
    drawSocialPicker(page);
  }
  function drawSocialPicker(page) {
    var q = (state.socQ || '').toLowerCase();
    var list = (state.socClients || []).filter(function (c) { return c.naam.toLowerCase().indexOf(q) >= 0; });
    var cards = list.length ? list.map(function (c) { return '<button class="soc-cli" data-cli="' + esc(c.id) + '"><span class="soc-cli-ic">' + svgIc(IC.mega, 17) + '</span><span class="soc-cli-nm">' + esc(c.naam) + '</span><svg class="arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>'; }).join('') : '<div class="empty"><p>Geen klant met een Metricool-koppeling gevonden.</p></div>';
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Social posts</h1><div class="sub">Kies een klant om posts te schrijven en in te plannen. ' + (state.socClients || []).length + ' klanten met Metricool.</div></div>' +
      '<div class="acc-search" style="max-width:420px;margin-bottom:14px"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="soc-q" placeholder="Zoek een klant…" autocomplete="off" value="' + esc(state.socQ || '') + '"></div>' +
      '<div class="soc-clilist">' + cards + '</div></div>';
    var qi = $('soc-q'); if (qi) { qi.oninput = function () { state.socQ = this.value; var l = page.querySelector('.soc-clilist'); var qq = this.value.toLowerCase(); if (l) l.innerHTML = (state.socClients || []).filter(function (c) { return c.naam.toLowerCase().indexOf(qq) >= 0; }).map(function (c) { return '<button class="soc-cli" data-cli="' + esc(c.id) + '"><span class="soc-cli-ic">' + svgIc(IC.mega, 17) + '</span><span class="soc-cli-nm">' + esc(c.naam) + '</span><svg class="arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>'; }).join('') || '<div class="empty"><p>Geen klant gevonden.</p></div>'; wireSocPicker(page); }; }
    wireSocPicker(page);
  }
  function wireSocPicker(page) {
    Array.prototype.forEach.call(page.querySelectorAll('[data-cli]'), function (b) { b.onclick = function () { var id = b.getAttribute('data-cli'); var c = (state.socClients || []).filter(function (x) { return x.id === id; })[0]; state.socSel = c || { id: id, naam: '' }; state.socDrafts = null; state.socNets = ['instagram', 'facebook']; renderSocials(page); }; });
  }
  async function loadSocialClient(page) {
    page.innerHTML = '<div class="panel active"><button class="backlink" id="soc-back"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg> Klanten</button><div class="t-hero"><h1>' + esc(state.socSel.naam || 'Klant') + '</h1><div class="sub">Social-planning laden…</div></div><div class="empty"><p>Metricool ophalen…</p></div></div>';
    var bk = $('soc-back'); if (bk) bk.onclick = function () { state.socSel = null; renderSocials(page); };
    var d; try { d = await api('teamSocials', { bedrijf_id: state.socSel.id }, { timeout: 40000 }); } catch (e) { d = null; }
    if (state.route !== 'socials' || !state.socSel) return;
    state.socData = d;
    drawSocialClient(page);
  }
  function drawSocialClient(page) {
    var d = state.socData, c = state.socSel;
    if (!state.socNets) state.socNets = ['instagram', 'facebook'];
    var linked = d && d.ok && d.linked;
    var posts = (d && d.posts) || [];
    posts = posts.slice().sort(function (a, b) { return String(b.datum || '').localeCompare(String(a.datum || '')); });
    var brand = d && d.ok ? (d.brandName || '') : '';
    // AI-concepten + composer + drafts
    var draftsHtml = '';
    if (state.socDrafts && state.socDrafts.length) {
      draftsHtml = '<div class="soc-drafts">' + state.socDrafts.map(function (dr, i) {
        return '<div class="soc-draft" data-di="' + i + '">' + (dr.in_metricool ? '<span class="soc-done">✓ in Metricool</span>' : '') +
          '<textarea class="soc-draft-tx" data-di="' + i + '" rows="4">' + esc(dr.tekst || '') + '</textarea>' +
          '<div class="soc-draft-foot"><div class="soc-mininets">' + socNetChips([dr.netwerk], 'mini') + '</div>' +
          '<input type="datetime-local" class="soc-draft-dt" data-di="' + i + '" value="' + esc(dr.date || socDefaultDate(i)) + '">' +
          (dr.in_metricool ? '' : '<button class="btn btn-primary btn-sm soc-draft-go" data-di="' + i + '">Zet als concept in Metricool</button>') + '</div></div>';
      }).join('') + '</div>';
    }
    var aiBox = '<div class="soc-ai"><div class="soc-ai-h">' + svgIc(IC.spark, 17) + ' AI-concepten</div>' +
      '<div class="micro" style="color:var(--ink-4);margin-bottom:8px">De AI leest de klantcontext en eerdere posts en schrijft concepten in dezelfde stijl. Geef hieronder optioneel een aanleiding mee (bv. een evenement).</div>' +
      '<textarea id="soc-ai-in" rows="2" placeholder="Optionele aanleiding, bv. ‘volgende week opendeurdag op zaterdag 14u’…"></textarea>' +
      '<div class="soc-ai-row"><div class="soc-nets mt-chips">' + socNetChips(state.socNets) + '</div>' +
      '<label class="soc-aantal">Aantal <select id="soc-aantal"><option>1</option><option>2</option><option selected>3</option><option>4</option><option>5</option></select></label></div>' +
      '<div class="soc-ai-btns"><button class="btn btn-primary" id="soc-gen">' + svgIc(IC.spark, 16) + ' Genereer concepten</button><button class="btn btn-outline" id="soc-gen-place">Genereer + zet meteen in Metricool</button></div>' +
      '<div id="soc-ai-out">' + draftsHtml + '</div></div>';
    // manuele composer
    var composer = '<div class="soc-comp"><div class="soc-comp-h">Zelf een post schrijven</div>' +
      '<textarea id="soc-comp-tx" rows="3" placeholder="Schrijf hier je post…"></textarea>' +
      '<div class="soc-ai-row"><div class="soc-comp-nets mt-chips">' + socNetChips(state.socNets) + '</div><input type="datetime-local" id="soc-comp-dt" value="' + esc(socDefaultDate(0)) + '"></div>' +
      '<button class="btn btn-primary btn-sm" id="soc-comp-go">Plan als concept</button></div>';
    // content uit Drive (B3): vink af wat al gepost is, of laat de AI er posts van maken (lazy-load)
    var driveBox = '<div class="soc-sec-h">Content uit Drive <span class="ads-an-sub">· vink af wat al gepost is, of laat de AI er posts van maken</span></div>' +
      '<div id="socDriveBox" class="soc-drive-box"><div class="kd-ai-loading">Drive-content laden…</div></div>';
    // eerdere posts (agenda-lijst)
    var agenda = posts.length ? '<div class="soc-agenda">' + posts.slice(0, 40).map(function (p) {
      var dt = String(p.datum || '').slice(0, 16).replace('T', ' ');
      var st = String(p.status || '').toUpperCase(); var stcls = st.indexOf('PUBLISHED') >= 0 ? 'pub' : (p.draft || st === 'DRAFT' ? 'draft' : (st.indexOf('ERROR') >= 0 ? 'err' : 'plan'));
      var stlbl = stcls === 'pub' ? 'gepubliceerd' : stcls === 'draft' ? 'concept' : stcls === 'err' ? 'fout' : 'gepland';
      return '<div class="soc-ag-row"><span class="soc-ag-dot ' + stcls + '"></span><div class="soc-ag-main"><div class="soc-ag-top"><span class="soc-ag-net">' + esc(String(p.netwerken || '').replace(/,/g, ' · ')) + '</span><span class="soc-ag-dt">' + esc(dt) + '</span><span class="soc-ag-st ' + stcls + '">' + stlbl + '</span></div><div class="soc-ag-tx">' + esc(socDecode(p).replace(/\s+/g, ' ').slice(0, 160)) + '</div></div></div>';
    }).join('') + '</div>' : '<div class="empty" style="padding:16px"><p>Nog geen posts in Metricool voor deze klant.</p></div>';
    page.innerHTML = '<div class="panel active"><button class="backlink" id="soc-back"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg> Klanten</button>' +
      '<div class="t-hero"><h1>' + esc(c.naam) + '</h1><div class="sub">' + (linked ? ('Metricool' + (brand ? ' · ' + esc(brand) : '') + ' · ' + posts.length + ' posts') : 'Geen Metricool-koppeling gevonden voor deze klant.') + '</div></div>' +
      (linked ? (aiBox + composer + driveBox + '<div class="soc-sec-h">Eerdere posts</div>' + agenda) : '<div class="kd-sec"><p class="micro">Koppel eerst een Metricool-ID op de bedrijf-taak in ClickUp.</p></div>') +
      '</div>';
    wireSocialClient(page);
  }
  function socDefaultDate(offsetDays) {
    var dt = new Date(Date.now() + ((offsetDays || 0) + 1) * 86400000); dt.setHours(10, 0, 0, 0);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return dt.getFullYear() + '-' + p(dt.getMonth() + 1) + '-' + p(dt.getDate()) + 'T' + p(dt.getHours()) + ':' + p(dt.getMinutes());
  }
  function wireSocialClient(page) {
    var bk = $('soc-back'); if (bk) bk.onclick = function () { state.socSel = null; state.socDrafts = null; renderSocials(page); };
    // netwerk-chips (AI + composer delen state.socNets)
    Array.prototype.forEach.call(page.querySelectorAll('.soc-net:not(.mini)'), function (b) { b.onclick = function () { var net = b.getAttribute('data-net'); if (!Array.isArray(state.socNets)) state.socNets = []; var i = state.socNets.indexOf(net); if (i >= 0) state.socNets.splice(i, 1); else state.socNets.push(net); Array.prototype.forEach.call(page.querySelectorAll('.soc-net.mini'), function (x) { }); Array.prototype.forEach.call(page.querySelectorAll('.soc-net[data-net="' + net + '"]:not(.mini)'), function (x) { x.classList.toggle('on', state.socNets.indexOf(net) >= 0); }); }; });
    // AI genereren
    function genDrafts(plaats) {
      var inEl = $('soc-ai-in'); var input = (inEl && inEl.value || '').trim();
      var aantal = Number(($('soc-aantal') || {}).value) || 3;
      if (!state.socNets || !state.socNets.length) { toast('Kies minstens één kanaal'); return; }
      var btns = [$('soc-gen'), $('soc-gen-place')]; btns.forEach(function (b) { if (b) b.disabled = true; });
      var out = $('soc-ai-out'); if (out) out.innerHTML = '<div class="kd-ai-loading">De AI schrijft ' + aantal + ' concepten in de stijl van ' + esc(state.socSel.naam) + '…</div>';
      api('teamSocialAiDraft', { bedrijf_id: state.socSel.id, aantal: aantal, providers: state.socNets, input: input, plaats: !!plaats }, { timeout: 90000 }).then(function (r) {
        btns.forEach(function (b) { if (b) b.disabled = false; });
        if (!r || !r.ok) { var o = $('soc-ai-out'); if (o) o.innerHTML = '<p class="micro" style="color:var(--s27-red-ink,#c0392b)">' + esc((r && r.message) || 'Lukte niet.') + '</p>'; return; }
        state.socDrafts = r.drafts || [];
        if (plaats && r.geplaatst) toast(r.geplaatst + ' concept(en) in Metricool gezet ✓');
        drawSocialClient(page);
      }).catch(function () { btns.forEach(function (b) { if (b) b.disabled = false; }); var o = $('soc-ai-out'); if (o) o.innerHTML = '<p class="micro">Lukte even niet.</p>'; });
    }
    var g1 = $('soc-gen'); if (g1) g1.onclick = function () { genDrafts(false); };
    var g2 = $('soc-gen-place'); if (g2) g2.onclick = function () { genDrafts(true); };
    // draft-veld-edits in state houden
    Array.prototype.forEach.call(page.querySelectorAll('.soc-draft-tx'), function (el) { el.oninput = function () { var i = +el.getAttribute('data-di'); if (state.socDrafts[i]) state.socDrafts[i].tekst = el.value; }; });
    Array.prototype.forEach.call(page.querySelectorAll('.soc-draft-dt'), function (el) { el.onchange = function () { var i = +el.getAttribute('data-di'); if (state.socDrafts[i]) state.socDrafts[i].date = el.value; }; });
    Array.prototype.forEach.call(page.querySelectorAll('.soc-draft .soc-net'), function (b) { b.onclick = function () { var i = +(b.closest('.soc-draft') || {}).getAttribute('data-di'); var net = b.getAttribute('data-net'); if (state.socDrafts[i]) { state.socDrafts[i].netwerk = net; Array.prototype.forEach.call(b.parentNode.querySelectorAll('.soc-net'), function (x) { x.classList.toggle('on', x === b); }); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('.soc-draft-go'), function (b) { b.onclick = function () { var i = +b.getAttribute('data-di'); var dr = state.socDrafts[i]; if (!dr) return; var dt = (($('soc-ai-out') || page).querySelector('.soc-draft-dt[data-di="' + i + '"]') || {}).value || socDefaultDate(i); b.disabled = true; b.textContent = 'Bezig…'; api('teamSocialCreate', { bedrijf_id: state.socSel.id, text: dr.tekst, providers: [dr.netwerk], date: dt }, { timeout: 40000 }).then(function (r) { if (r && r.ok) { dr.in_metricool = true; dr.date = dt; toast('Concept in Metricool ✓'); drawSocialClient(page); } else { b.disabled = false; b.textContent = 'Zet als concept in Metricool'; toast((r && r.message) || 'Lukte niet'); } }).catch(function () { b.disabled = false; b.textContent = 'Zet als concept in Metricool'; toast('Lukte niet'); }); }; });
    // manuele composer
    var cg = $('soc-comp-go'); if (cg) cg.onclick = function () {
      var tx = (($('soc-comp-tx') || {}).value || '').trim(); var dt = ($('soc-comp-dt') || {}).value || socDefaultDate(0);
      var nets = []; Array.prototype.forEach.call(page.querySelectorAll('.soc-comp-nets .soc-net.on'), function (x) { nets.push(x.getAttribute('data-net')); });
      if (!tx) { toast('Schrijf eerst een tekst'); return; } if (!nets.length) { toast('Kies minstens één kanaal'); return; }
      cg.disabled = true; cg.textContent = 'Bezig…';
      api('teamSocialCreate', { bedrijf_id: state.socSel.id, text: tx, providers: nets, date: dt }, { timeout: 40000 }).then(function (r) { cg.disabled = false; cg.textContent = 'Plan als concept'; if (r && r.ok) { toast('Concept in Metricool ✓'); var t = $('soc-comp-tx'); if (t) t.value = ''; loadSocialClient(page); } else toast((r && r.message) || 'Lukte niet'); }).catch(function () { cg.disabled = false; cg.textContent = 'Plan als concept'; toast('Lukte niet'); });
    };
    loadSocialDrive(page);   // Drive-content apart laden (kan traag zijn) zodat de rest meteen staat
  }

  /* ---- CONTENT UIT DRIVE (B3): afvinksysteem + AI-herschrijf in huisstijl ---- */
  async function loadSocialDrive(page) {
    var box = document.getElementById('socDriveBox'); if (!box) return;
    var bid = state.socSel && state.socSel.id; if (!bid) return;
    var d; try { d = await api('teamSocialDrive', { bedrijf_id: bid }, { timeout: 45000 }); } catch (e) { d = null; }
    if (state.route !== 'socials' || !state.socSel || state.socSel.id !== bid) return;
    if (!document.getElementById('socDriveBox')) return;
    state.socDrive = d; state.socDriveSug = state.socDriveSug || {};
    drawSocialDrive(page);
  }
  function socDriveIcon(mime) { mime = String(mime || ''); if (mime.indexOf('video') >= 0) return '🎬'; if (mime.indexOf('image') >= 0) return '🖼️'; if (mime.indexOf('pdf') >= 0) return '📄'; if (mime.indexOf('presentation') >= 0) return '📊'; if (mime.indexOf('document') >= 0 || mime.indexOf('word') >= 0) return '📝'; return '📎'; }
  function socDriveCard(f) {
    var sug = (state.socDriveSug || {})[f.id];
    var thumb = f.thumb ? '<img class="soc-dc-thumb" src="' + esc(f.thumb) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="soc-dc-noimg">' + socDriveIcon(f.mime) + '</span>';
    return '<div class="soc-dc' + (f.used ? ' used' : '') + (sug && !f.used ? ' sug' : '') + '" data-fid="' + esc(f.id) + '" data-fn="' + esc(f.name) + '">' +
      '<div class="soc-dc-media">' + thumb +
        (f.used ? '<span class="soc-dc-badge">✓ gebruikt</span>' : (sug ? '<span class="soc-dc-badge warn" title="' + esc(sug) + '">⚠ mogelijk al gepost</span>' : '')) +
      '</div>' +
      '<div class="soc-dc-nm" title="' + esc(f.name) + '">' + esc(f.name) + '</div>' +
      '<div class="soc-dc-btns">' +
        '<button class="soc-dc-b mark" data-fid="' + esc(f.id) + '">' + (f.used ? 'Zet op ongebruikt' : '✓ Gebruikt') + '</button>' +
        '<button class="soc-dc-b make" data-fid="' + esc(f.id) + '">✦ Maak post</button>' +
        (f.url ? '<a class="soc-dc-b open" href="' + esc(f.url) + '" target="_blank" rel="noopener">Open ↗</a>' : '') +
      '</div>' +
      '<div class="soc-dc-out" hidden></div>' +
    '</div>';
  }
  function drawSocialDrive(page) {
    var box = document.getElementById('socDriveBox'); if (!box) return;
    var d = state.socDrive;
    if (!d || !d.ok) { box.innerHTML = '<p class="micro" style="color:var(--ink-4)">Kon de Drive-content niet laden.</p>'; return; }
    if (!d.linked) { box.innerHTML = '<p class="micro" style="color:var(--ink-4)">' + esc(d.message || 'Geen Drive-map gekoppeld aan deze klant.') + ' Koppel de Drive-map op de bedrijf-taak in ClickUp.</p>'; return; }
    var files = d.files || [];
    var q = (state.socDriveQ || '').toLowerCase();
    var onlyUnused = !!state.socDriveUnused;
    var shown = files.filter(function (f) { if (onlyUnused && f.used) return false; if (q && String(f.name).toLowerCase().indexOf(q) < 0) return false; return true; });
    var usedCount = files.filter(function (f) { return f.used; }).length;
    var cfg = d.needs_config ? '<div class="soc-drive-cfg">⚙ Geen aparte social-map gevonden, dit toont de hele klantmap. Maak in Drive een submap (bv. <b>’S Share</b> of <b>Social</b>) met enkel social-content, dan toont dit scherm net die map.</div>' : '';
    var bar = '<div class="soc-drive-bar">' +
      '<input id="soc-drive-q" class="ev-in" placeholder="Zoek bestand…" value="' + esc(state.socDriveQ || '') + '" style="max-width:200px">' +
      '<label class="off-toggle"><input type="checkbox" id="soc-drive-unused"' + (onlyUnused ? ' checked' : '') + '> Enkel ongebruikt</label>' +
      '<button class="btn btn-outline btn-sm" id="soc-drive-scan">🔎 Scan: al gepost?</button>' +
      '<button class="btn btn-outline btn-sm" id="soc-drive-auto">✦ Posts van alle ongebruikte</button>' +
      '<span class="soc-drive-stat">' + usedCount + '/' + files.length + ' gebruikt</span>' +
      '</div>';
    var folders = (d.folders || []).length ? '<div class="soc-drive-folders">' + d.folders.map(function (fo) { return '<button class="soc-drive-folder" data-fid="' + esc(fo.id) + '">📁 ' + esc(fo.name) + '</button>'; }).join('') + '</div>' : '';
    var grid = shown.length ? '<div class="soc-drive-grid">' + shown.map(socDriveCard).join('') + '</div>' : '<div class="empty" style="padding:14px"><p>' + (files.length ? 'Geen bestand voor deze filter.' : 'Deze map is leeg.') + '</p></div>';
    box.innerHTML = cfg + bar + folders + grid;
    wireSocialDrive(page);
  }
  function wireSocialDrive(page) {
    var box = document.getElementById('socDriveBox'); if (!box) return;
    var bid = state.socSel && state.socSel.id;
    var qi = document.getElementById('soc-drive-q'); if (qi) qi.oninput = function () { state.socDriveQ = this.value; drawSocialDrive(page); var n = document.getElementById('soc-drive-q'); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) { } } };
    var un = document.getElementById('soc-drive-unused'); if (un) un.onchange = function () { state.socDriveUnused = this.checked; drawSocialDrive(page); };
    Array.prototype.forEach.call(box.querySelectorAll('.soc-drive-folder'), function (b) { b.onclick = function () { var fid = b.getAttribute('data-fid'); box.innerHTML = '<div class="kd-ai-loading">Map openen…</div>'; api('teamSocialDrive', { bedrijf_id: bid, folder_id: fid }, { timeout: 45000 }).then(function (r) { state.socDrive = r; state.socDriveSug = {}; drawSocialDrive(page); }).catch(function () { loadSocialDrive(page); }); }; });
    var sc = document.getElementById('soc-drive-scan'); if (sc) sc.onclick = function () {
      sc.disabled = true; sc.textContent = 'Scannen…';
      api('teamSocialDriveScan', { bedrijf_id: bid }, { timeout: 60000 }).then(function (r) {
        sc.disabled = false; sc.textContent = '🔎 Scan: al gepost?';
        var sug = (r && r.ok && r.suggestions) || [];
        if (!sug.length) { toast('Geen duidelijke matches gevonden'); return; }
        state.socDriveSug = {}; sug.forEach(function (s) { state.socDriveSug[s.file_id] = s.reason || 'lijkt al gepost'; });
        toast(sug.length + ' bestand(en) mogelijk al gepost, zijn nu gemarkeerd'); drawSocialDrive(page);
      }).catch(function () { sc.disabled = false; sc.textContent = '🔎 Scan: al gepost?'; toast('Scan lukte niet'); });
    };
    var au = document.getElementById('soc-drive-auto'); if (au) au.onclick = function () { socDriveAuto(page, au); };
    Array.prototype.forEach.call(box.querySelectorAll('.soc-dc-b.mark'), function (b) { b.onclick = function () { socDriveMark(page, b.getAttribute('data-fid')); }; });
    Array.prototype.forEach.call(box.querySelectorAll('.soc-dc-b.make'), function (b) { b.onclick = function () { socDriveMake(page, b.closest('.soc-dc')); }; });
  }
  function socDriveMark(page, fid) {
    var bid = state.socSel && state.socSel.id; if (!bid || !fid) return;
    var f = ((state.socDrive && state.socDrive.files) || []).filter(function (x) { return x.id === fid; })[0]; if (!f) return;
    var newUsed = !f.used; f.used = newUsed;
    if (newUsed && state.socDriveSug) delete state.socDriveSug[fid];
    drawSocialDrive(page);
    api('teamSocialDriveMark', { bedrijf_id: bid, file_id: fid, used: newUsed }, { timeout: 20000 }).then(function (r) {
      if (!r || !r.ok) { f.used = !newUsed; drawSocialDrive(page); toast('Kon niet opslaan'); }
      else toast(newUsed ? 'Op gebruikt gezet ✓' : 'Op ongebruikt gezet');
    }).catch(function () { f.used = !newUsed; drawSocialDrive(page); toast('Kon niet opslaan'); });
  }
  function socDriveMake(page, el) {
    if (!el) return;
    var fid = el.getAttribute('data-fid'); var fn = el.getAttribute('data-fn');
    var out = el.querySelector('.soc-dc-out'); if (!out) return;
    if (!out.hasAttribute('hidden')) { out.setAttribute('hidden', ''); return; }
    Array.prototype.forEach.call((el.parentNode || document).querySelectorAll('.soc-dc-out'), function (o) { if (o !== out) o.setAttribute('hidden', ''); });
    out.removeAttribute('hidden');
    var sel = (state.socNets && state.socNets.length ? state.socNets : ['instagram', 'facebook']).slice();
    out.innerHTML = '<input class="ev-in soc-dc-in" placeholder="Optionele aanleiding/context…" autocomplete="off"><div class="soc-dc-mk-row"><div class="soc-mininets mt-chips">' + socNetChips(sel, 'mini') + '</div><button class="btn btn-primary btn-sm soc-dc-gen">✦ Schrijf post</button></div><div class="soc-dc-res"></div>';
    Array.prototype.forEach.call(out.querySelectorAll('.soc-net.mini'), function (b) { b.onclick = function () { var net = b.getAttribute('data-net'); var i = sel.indexOf(net); if (i >= 0) sel.splice(i, 1); else sel.push(net); b.classList.toggle('on', sel.indexOf(net) >= 0); }; });
    var gen = out.querySelector('.soc-dc-gen');
    gen.onclick = function () {
      var input = (out.querySelector('.soc-dc-in') || {}).value || '';
      if (!sel.length) { toast('Kies minstens één kanaal'); return; }
      gen.disabled = true; gen.textContent = 'Bezig…';
      var res = out.querySelector('.soc-dc-res'); res.innerHTML = '<div class="kd-ai-loading">De AI schrijft een post rond ' + esc(fn) + '…</div>';
      api('teamSocialDriveRewrite', { bedrijf_id: state.socSel.id, file_id: fid, file_name: fn, providers: sel, input: input, aantal: 1 }, { timeout: 90000 }).then(function (r) {
        gen.disabled = false; gen.textContent = '✦ Schrijf post';
        if (!r || !r.ok || !(r.drafts && r.drafts.length)) { res.innerHTML = '<p class="micro" style="color:var(--s27-red-ink,#c0392b)">' + esc((r && r.message) || 'Lukte niet.') + '</p>'; return; }
        var dr = r.drafts[0];
        res.innerHTML = '<textarea class="soc-dc-tx" rows="5">' + esc(dr.tekst || '') + '</textarea><div class="soc-dc-mk-row"><input type="datetime-local" class="soc-dc-dt" value="' + esc(socDefaultDate(0)) + '"><button class="btn btn-primary btn-sm soc-dc-place">Zet als concept in Metricool</button></div>';
        var place = res.querySelector('.soc-dc-place');
        place.onclick = function () {
          var tx = (res.querySelector('.soc-dc-tx') || {}).value || ''; var dt = (res.querySelector('.soc-dc-dt') || {}).value || socDefaultDate(0);
          if (!tx.trim()) { toast('Tekst is leeg'); return; }
          place.disabled = true; place.textContent = 'Bezig…';
          api('teamSocialCreate', { bedrijf_id: state.socSel.id, text: tx, providers: [dr.netwerk || sel[0]], date: dt }, { timeout: 40000 }).then(function (cr) {
            if (cr && cr.ok) {
              toast('Concept in Metricool ✓. Bestand op gebruikt gezet');
              api('teamSocialDriveMark', { bedrijf_id: state.socSel.id, file_id: fid, used: true }, { timeout: 20000 });
              var f = ((state.socDrive && state.socDrive.files) || []).filter(function (x) { return x.id === fid; })[0]; if (f) f.used = true;
              if (state.socDriveSug) delete state.socDriveSug[fid];
              drawSocialDrive(page);
            } else { place.disabled = false; place.textContent = 'Zet als concept in Metricool'; toast((cr && cr.message) || 'Lukte niet'); }
          }).catch(function () { place.disabled = false; place.textContent = 'Zet als concept in Metricool'; toast('Lukte niet'); });
        };
      }).catch(function () { gen.disabled = false; gen.textContent = '✦ Schrijf post'; res.innerHTML = '<p class="micro">Lukte even niet.</p>'; });
    };
  }
  function socDriveAuto(page, au) {
    var files = ((state.socDrive && state.socDrive.files) || []).filter(function (f) { return !f.used; }).slice(0, 5);
    if (!files.length) { toast('Geen ongebruikte bestanden'); return; }
    if (!confirm('De AI schrijft een post voor ' + files.length + ' ongebruikt(e) bestand(en) en zet ze als concept in Metricool (gespreid over de komende dagen). Doorgaan?')) return;
    au.disabled = true; au.textContent = 'Bezig… (0/' + files.length + ')';
    var i = 0, done = 0;
    (function next() {
      if (i >= files.length) { au.disabled = false; au.textContent = '✦ Posts van alle ongebruikte'; toast(done + ' concept(en) in Metricool ✓'); loadSocialDrive(page); return; }
      var f = files[i++]; au.textContent = 'Bezig… (' + i + '/' + files.length + ')';
      api('teamSocialDriveRewrite', { bedrijf_id: state.socSel.id, file_id: f.id, file_name: f.name, providers: (state.socNets && state.socNets.length ? state.socNets : ['instagram', 'facebook']), aantal: 1, plaats: true }, { timeout: 90000 }).then(function (r) { if (r && r.geplaatst) done++; next(); }).catch(function () { next(); });
    })();
  }

  function agentBlank() { return { id: '', naam: '', ic: '🤖', sys: '', model: '', categorie: '', kennis: '', docs: [], tools: [], mcp_servers: [], skill_ids: [], plugin_ids: [], knop: { aan: false, label: '', prompt: '', views: [], type_jobs: [], vis: { roles: [], members: [] } } }; }
  function agentModelLabel(d, id) { if (!id) return 'Volgt globaal model'; var m = (d.modellen || []).filter(function (x) { return x.id === id; })[0]; return m ? (m.provider + ' - ' + m.naam) : id; }
  function agdSize(n) { if (!n) return ''; if (n < 1024) return n + ' B'; if (n < 1048576) return Math.round(n / 102.4) / 10 + ' KB'; return Math.round(n / 104857.6) / 10 + ' MB'; }
  function fmtRelTime(ts) { if (!ts) return ''; var s = Math.floor((Date.now() - ts) / 1000); if (s < 60) return 'zonet'; if (s < 3600) return Math.floor(s / 60) + 'min geleden'; if (s < 86400) return Math.floor(s / 3600) + 'u geleden'; if (s < 604800) return Math.floor(s / 86400) + 'd geleden'; return new Date(ts).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }); }
  // lichte opmaak van een AI-antwoord: **vet**, `code`, opsommingen en regeleinden.
  function agentFmt(t) {
    var h = esc(String(t == null ? '' : t));
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/^[ \t]*[-*]\s+(.+)$/gm, '• $1');
    h = h.replace(/\n/g, '<br>');
    return h;
  }
  function agfDocsItemsHtml(docs) {
    if (!docs || !docs.length) return '<div class="agd-none">Nog geen documenten. Voeg .txt, .md of .csv bestanden toe als extra kennisbron.</div>';
    return docs.map(function (d) { return '<div class="agd-item"><span class="agd-ic">📄</span><span class="agd-nm">' + esc(d.naam) + '</span><span class="agd-sz">' + agdSize(d.size) + '</span><button class="agd-del" data-docid="' + esc(d.id) + '" title="Verwijderen">×</button></div>'; }).join('');
  }
  function agfDocsHtml(it) {
    if (!it.id) return '<div class="agd-section agd-disabled"><div class="agd-lbl">Documenten</div><div class="agd-none">Sla de agent eerst op om bestanden te kunnen uploaden.</div></div>';
    return '<div class="agd-section"><div class="agd-lbl">Documenten <span class="agd-hint">(.txt .md .csv, max 12 bestanden)</span></div>' +
      '<div class="agd-list" id="agf-docs">' + agfDocsItemsHtml(it.docs) + '</div>' +
      '<label class="agd-upload-btn" for="agf-upload">+ Bestand toevoegen</label>' +
      '<input type="file" id="agf-upload" accept=".txt,.md,.csv" multiple style="display:none"></div>';
  }
  function refreshDocList(page) {
    var list = document.getElementById('agf-docs'); if (!list) return;
    list.innerHTML = agfDocsItemsHtml(state.agentEdit && state.agentEdit.docs);
  }
  async function renderAgents(page) {
    state.agentEdit = null;
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>AI-agents</h1><div class="sub">Gespecialiseerde AI-assistenten met een eigen opdracht, model en kennis. Klik een agent aan om ermee te chatten.</div></div><div class="empty"><p>Laden…</p></div></div>';
    var d; try { d = await api('teamAgents', {}); } catch (e) { d = null; }
    if (state.route !== 'agents') return;
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = 'Kon de agents niet laden.'; return; }
    state.agentsData = d;
    // Geopend vanuit een AI-knop in een andere view (bv. Adverteerders): direct chatten met context.
    if (state.pendingAgentChat) {
      var pend = state.pendingAgentChat; state.pendingAgentChat = null;
      var full = (d.items || []).filter(function (x) { return x.id === pend.agent.id; })[0] || pend.agent;
      openAgentChat(page, full, { bedrijf_id: pend.bedrijf_id, bedrijf_naam: pend.bedrijf_naam, starter: pend.starter });
      return;
    }
    if (state.agentMonitor) drawAgentMonitor(page);
    else if (state.agentChat) drawAgentChat(page);
    else drawAgents(page);
  }
  function agentCardHtml(a, d) {
    var hasK = a.kennis === true || (typeof a.kennis === 'string' && a.kennis.trim());
    var docsN = Array.isArray(a.docs) ? a.docs.length : (a.docs_count || 0);
    var admin = state.agentsData && state.agentsData.is_admin;
    return '<div class="agc" data-chat="' + esc(a.id) + '">' +
      '<div class="agc-ic">' + esc(a.ic || '🤖') + '</div>' +
      '<div class="agc-main"><div class="agc-nm">' + esc(a.naam) + '</div>' +
      '<div class="agc-meta"><span class="agc-mdl">' + esc(agentModelLabel(d, a.model)) + '</span>' + (hasK ? '<span class="agc-kn">📎 kennis</span>' : '') + (docsN ? '<span class="agc-kn">📄 ' + docsN + ' doc' + (docsN > 1 ? 's' : '') + '</span>' : '') + '</div></div>' +
      (admin ? '<div class="agc-act"><button class="agc-btn" data-monitor="' + esc(a.id) + '" title="Monitor" aria-label="Monitor">' + svgIc(IC.bars, 15) + '</button><button class="agc-btn" data-edit="' + esc(a.id) + '" title="Bewerken" aria-label="Bewerken">' + svgIc(IC.edit, 15) + '</button><button class="agc-btn del" data-del="' + esc(a.id) + '" title="Verwijderen" aria-label="Verwijderen">' + svgIc(IC.trash, 15) + '</button></div>' : '') +
      '<svg class="arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></div>';
  }
  function agfKnopHtml(it, d) {
    var views = (d && d.views) || [];
    var typejobs = (d && d.typejobs) || [];
    var k = it.knop || { aan: false, label: '', prompt: '', views: [], type_jobs: [] };
    var vchips = views.map(function (v) {
      var on = (k.views || []).indexOf(v.key) >= 0;
      return '<button type="button" class="mt-chip ag-view' + (on ? ' on' : '') + '" data-view="' + esc(v.key) + '">' + esc(v.label) + '</button>';
    }).join('');
    var tjchips = typejobs.map(function (v) {
      var on = (k.type_jobs || []).indexOf(v.key) >= 0;
      return '<button type="button" class="mt-chip ag-typejob' + (on ? ' on' : '') + '" data-typejob="' + esc(v.key) + '">' + esc(v.label) + '</button>';
    }).join('');
    var visR = (k.vis && k.vis.roles) || [], visM = (k.vis && k.vis.members) || [];
    var rchips = [['team', 'Team'], ['accountmanager', 'Accountmanager'], ['sales', 'Sales'], ['admin', 'Zaakvoerder']].map(function (r) {
      return '<button type="button" class="mt-chip ag-visrole' + (visR.indexOf(r[0]) >= 0 ? ' on' : '') + '" data-role="' + r[0] + '">' + esc(r[1]) + '</button>';
    }).join('');
    var mchips = ((d && d.roster) || []).map(function (m) {
      return '<button type="button" class="mt-chip ag-vismember' + (visM.indexOf(m.id) >= 0 ? ' on' : '') + '" data-member="' + m.id + '">' + esc(m.naam || ('#' + m.id)) + '</button>';
    }).join('');
    return '<div class="ag-knop-sec"><label class="ag-knop-toggle"><input type="checkbox" id="agf-knop-aan"' + (k.aan ? ' checked' : '') + '> <span>Toon dit als 1-klik-knop (in vaste views en/of bij bepaalde type jobs)</span></label>' +
      '<div class="ag-knop-body" id="agf-knop-body" style="' + (k.aan ? '' : 'display:none') + '">' +
        '<div class="field"><label>Knoptekst</label><input type="text" id="agf-knop-label" value="' + esc(k.label || '') + '" maxlength="50" placeholder="' + esc(it.naam || 'bv. Analyseer ads') + '"></div>' +
        '<div class="field"><label>In welke views?</label><div class="ag-views mt-chips">' + (vchips || '<span class="micro" style="color:var(--ink-4)">geen views beschikbaar</span>') + '</div></div>' +
        '<div class="field"><label>Bij welke type jobs? <span class="micro" style="color:var(--ink-4)">(de knop verschijnt dan in de taakdetail van élke taak met dat type job)</span></label><div class="ag-typejobs mt-chips">' + (tjchips || '<span class="micro" style="color:var(--ink-4)">geen type jobs beschikbaar</span>') + '</div></div>' +
        '<div class="field"><label>Voor wie zichtbaar? <span class="micro" style="color:var(--ink-4)">(leeg = iedereen; rollen en/of personen)</span></label><div class="ag-vis mt-chips">' + rchips + (mchips ? '<span class="ag-vis-sep"></span>' + mchips : '') + '</div></div>' +
        '<div class="field"><label>Startvraag <span class="micro" style="color:var(--ink-4)">(optioneel, wordt automatisch gesteld bij het klikken. Gebruik {klant} voor de klantnaam.)</span></label><textarea id="agf-knop-prompt" rows="3" placeholder="bv. Analyseer de Meta Ads van {klant} en geef 3 concrete verbeteracties.">' + esc(k.prompt || '') + '</textarea></div>' +
      '</div></div>';
  }
  // gedeelde wiring voor de "voor wie zichtbaar"-chips (rollen + leden), hergebruikt door agent- én skill-form.
  function wireKnopVis(page, getIt) {
    var ensure = function () { var it = getIt(); if (!it.knop) it.knop = { aan: true, label: '', prompt: '', views: [], type_jobs: [], vis: { roles: [], members: [] } }; if (!it.knop.vis) it.knop.vis = { roles: [], members: [] }; if (!Array.isArray(it.knop.vis.roles)) it.knop.vis.roles = []; if (!Array.isArray(it.knop.vis.members)) it.knop.vis.members = []; return it.knop.vis; };
    Array.prototype.forEach.call(page.querySelectorAll('.ag-visrole'), function (b) { b.onclick = function () { var v = ensure(); var key = b.getAttribute('data-role'); var i = v.roles.indexOf(key); if (i >= 0) { v.roles.splice(i, 1); b.classList.remove('on'); } else { v.roles.push(key); b.classList.add('on'); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('.ag-vismember'), function (b) { b.onclick = function () { var v = ensure(); var id = Number(b.getAttribute('data-member')); var i = v.members.indexOf(id); if (i >= 0) { v.members.splice(i, 1); b.classList.remove('on'); } else { v.members.push(id); b.classList.add('on'); } }; });
  }
  function knopVisOut(it) { return (it.knop && it.knop.vis && typeof it.knop.vis === 'object') ? { roles: Array.isArray(it.knop.vis.roles) ? it.knop.vis.roles : [], members: Array.isArray(it.knop.vis.members) ? it.knop.vis.members : [] } : { roles: [], members: [] }; }
  // Gedeelde, compacte bronnen-zone: ingebouwde tools + externe connectoren + (voor agents) skills/plugins-als-tool,
  // gegroepeerd onder stille sub-kopjes, twee accenten (paars = bron/skill/plugin, blauw = connector), line-icoon-prefix,
  // status-stip + koppel-link op een connector. opts = { label, withSkillsPlugins, skillIds, pluginIds }.
  function accessChipsHtml(access, d, opts) {
    opts = opts || {};
    access = access || { tools: [], mcp_servers: [] };
    var tools = (d && d.tools) || [], conns = (d && d.mcp_connectoren) || [];
    if (!tools.length && !conns.length && !opts.withSkillsPlugins) return '';
    var tchips = tools.map(function (t) { var on = (access.tools || []).indexOf(t.key) >= 0; return '<button type="button" class="mt-chip ag-acc-tool' + (on ? ' on' : '') + '" data-acctool="' + esc(t.key) + '" title="' + esc(t.omschrijving || '') + '">' + svgIc(IC.book, 13) + ' ' + esc(t.naam) + '</button>'; }).join('');
    var cchips = conns.map(function (c) {
      var on = (access.mcp_servers || []).indexOf(c.id) >= 0; var n = c.tools_count || 0; var ok = n > 0;
      var dot = '<span class="mk-mcp-dot' + (ok ? ' ok' : '') + '"></span>';
      var cnt = ok ? ' <span class="ag-mcp-n">' + n + '</span>' : '';
      var koppel = ok ? '' : ' <a href="#" class="mk-koppel" data-koppel="1">koppel</a>';
      return '<button type="button" class="mt-chip ag-acc-mcp' + (on ? ' on' : '') + '" data-accmcp="' + esc(c.id) + '" title="' + esc(c.url + (ok ? ' · ' + n + ' tools' : ' · nog koppelen bij Connectoren')) + '">' + dot + svgIc(IC.plug, 13) + ' ' + esc(c.naam) + cnt + koppel + '</button>';
    }).join('');
    var html = '<div class="field mk-srcfield"><label>' + esc(opts.label || 'Bronnen die dit mag gebruiken') + '</label>';
    if (tchips) html += '<div class="mk-srcgrp-h">Ingebouwd</div><div class="mt-chips">' + tchips + '</div>';
    if (cchips) html += '<div class="mk-srcgrp-h">Connectoren</div><div class="mt-chips">' + cchips + '</div>';
    if (opts.withSkillsPlugins) {
      var sks = (d && d.alle_skills) || [], pls = (d && d.alle_plugins) || [];
      var sSel = opts.skillIds || [], pSel = opts.pluginIds || [];
      var sp = sks.map(function (s) { var on = sSel.indexOf(s.id) >= 0; return '<button type="button" class="mt-chip ag-skilltool' + (on ? ' on' : '') + '" data-agskill="' + esc(s.id) + '">' + svgIc(IC.spark, 13) + ' ' + esc(s.naam) + '</button>'; }).join('') +
        pls.map(function (p) { var on = pSel.indexOf(p.id) >= 0; return '<button type="button" class="mt-chip ag-plugintool' + (on ? ' on' : '') + '" data-agplugin="' + esc(p.id) + '">' + svgIc(IC.grid, 13) + ' ' + esc(p.naam) + '</button>'; }).join('');
      if (sp) html += '<div class="mk-srcgrp-h">Skills en plugins</div><div class="mt-chips">' + sp + '</div>';
      else html += '<div class="fc-hint">Bouw eerst skills of plugins om ze hier als tool te koppelen.</div>';
    }
    return html + '</div>';
  }
  function wireAccessChips(page, getAccess, root) {
    var scope = root || page;
    Array.prototype.forEach.call(scope.querySelectorAll('.ag-acc-tool'), function (b) { b.onclick = function () { var a = getAccess(); if (!Array.isArray(a.tools)) a.tools = []; var k = b.getAttribute('data-acctool'); var i = a.tools.indexOf(k); if (i >= 0) { a.tools.splice(i, 1); b.classList.remove('on'); } else { a.tools.push(k); b.classList.add('on'); } }; });
    Array.prototype.forEach.call(scope.querySelectorAll('.ag-acc-mcp'), function (b) { b.onclick = function () { var a = getAccess(); if (!Array.isArray(a.mcp_servers)) a.mcp_servers = []; var k = b.getAttribute('data-accmcp'); var i = a.mcp_servers.indexOf(k); if (i >= 0) { a.mcp_servers.splice(i, 1); b.classList.remove('on'); } else { a.mcp_servers.push(k); b.classList.add('on'); } }; });
    Array.prototype.forEach.call(scope.querySelectorAll('.mk-koppel'), function (a) { a.onclick = function (e) { e.preventDefault(); e.stopPropagation(); go('connectoren'); }; });
  }
  // Gedeelde categorie-invoer (datalist met bestaande categorieën). Gebruikt door agent/skill/plugin-form.
  function categorieFieldHtml(it, d, listId) {
    var seen = {}, cats = [];
    ((d && d.items) || []).forEach(function (x) { var c = (x && x.categorie || '').trim(); if (c && !seen[c.toLowerCase()]) { seen[c.toLowerCase()] = 1; cats.push(c); } });
    var opts = cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
    return '<div class="field"><label>Categorie <span class="micro" style="color:var(--ink-4)">(optioneel, om te groeperen)</span></label>' +
      '<input type="text" id="' + listId + '" list="' + listId + '-dl" value="' + esc(it.categorie || '') + '" maxlength="40" placeholder="bv. Sales, SEO, Webdesign, Content">' +
      '<datalist id="' + listId + '-dl">' + opts + '</datalist></div>';
  }
  // Lijst met kaarten, gegroepeerd op categorie als er minstens één gezet is (anders gewoon een platte lijst).
  function groupedCardsHtml(items, cardFn) {
    var anyCat = items.some(function (x) { return (x.categorie || '').trim(); });
    if (!anyCat) return '<div class="agc-list">' + items.map(cardFn).join('') + '</div>';
    var groups = {}, order = [];
    items.forEach(function (x) { var c = (x.categorie || '').trim() || 'Overige'; if (!groups[c]) { groups[c] = []; order.push(c); } groups[c].push(x); });
    order.sort(function (a, b) { if (a === 'Overige') return 1; if (b === 'Overige') return -1; return 0; });
    return order.map(function (c) { return '<div class="agc-group-h">' + esc(c) + '</div><div class="agc-list">' + groups[c].map(cardFn).join('') + '</div>'; }).join('');
  }
  // AI-EERST: de hero is de prominente eerste keuze om iets te maken. Bij een nieuw item groot en open;
  // bij bewerken ingeklapt tot een smalle "opnieuw met AI"-balk. kind = 'agent' | 'skill' | 'plugin'.
  function heroBodyHtml(kind, ph, modelOpts, it) {
    return '<textarea class="mk-hero-desc" id="' + kind + '-aib-desc" rows="4" placeholder="' + esc(ph) + '">' + esc((it && it._aibDesc) || '') + '</textarea>' +
      '<div class="mk-hero-row">' +
        '<select id="' + kind + '-aib-model" class="ev-in mk-hero-model">' + modelOpts + '</select>' +
        '<button type="button" class="btn btn-primary" id="' + kind + '-aib-go">' + svgIc(IC.spark, 15) + ' Bouw met AI</button>' +
      '</div>' +
      '<div class="mk-hero-status" id="' + kind + '-aib-status"></div>';
  }
  function aiHeroHtml(d, kind, isEdit, it) {
    var cur = (it && it.model) || '';
    var modelOpts = '<option value="">Standaard model</option>' + ((d && d.modellen) || []).map(function (m) { return '<option value="' + esc(m.id) + '"' + (cur === m.id ? ' selected' : '') + (m.beschikbaar ? '' : ' disabled') + '>' + esc(m.provider + ' - ' + m.naam) + (m.beschikbaar ? '' : ' (geen sleutel)') + '</option>'; }).join('');
    var ph = kind === 'agent'
      ? 'bv. Een agent die de Meta Ads van een klant analyseert en 3 concrete verbeteracties geeft, in een vriendelijke toon.'
      : kind === 'plugin'
        ? 'bv. Een plugin die eerst klantonderzoek doet, dan een socialplan opstelt en er 5 advertentieteksten uit haalt.'
        : 'bv. Een skill die de klantinfo ophaalt, de socials van de afgelopen maand samenvat en er 5 postideeen uit haalt.';
    if (isEdit) {
      return '<div class="mk-hero mk-hero-collapsed" id="' + kind + '-hero">' +
        '<button type="button" class="mk-hero-reopen" id="' + kind + '-aib-tg">' + svgIc(IC.spark, 16) + ' Opnieuw met AI laten bouwen</button>' +
        '<div class="mk-hero-full" id="' + kind + '-hero-full" style="display:none">' + heroBodyHtml(kind, ph, modelOpts, it) + '</div></div>';
    }
    return '<div class="mk-hero" id="' + kind + '-hero">' +
      '<div class="mk-hero-h">' + svgIc(IC.spark, 18) + ' Beschrijf wat je wil maken</div>' +
      '<div class="mk-hero-sub">AI bouwt een eerste versie, jij verfijnt.</div>' +
      heroBodyHtml(kind, ph, modelOpts, it) + '</div>';
  }
  // Telbadge-samenvatting voor een ingeklapte sectie, zodat ingevulde maar verborgen inhoud zichtbaar blijft.
  function advSummary(label, parts) {
    var t = (parts || []).filter(Boolean).join(' · ');
    return '<summary>' + esc(label) + (t ? ' <span class="mk-badge">' + esc(t) + '</span>' : '') + '</summary>';
  }
  // Onthoud of een geavanceerd/publiceer-blok open staat, zodat het na een redraw (chip/stap-toggle) open blijft.
  function mkAdvOpen(it, key, alsoIf) { var f = it && it['_adv' + key + 'Open']; if (f === true) return ' open'; if (f === false) return ''; return alsoIf ? ' open' : ''; }
  function wireMkAdv(page, getIt) {
    Array.prototype.forEach.call(page.querySelectorAll('.mk-adv[data-adv]'), function (dt) {
      dt.addEventListener('toggle', function () { var it = getIt(); if (!it) return; var k = dt.getAttribute('data-adv'); it['_adv' + k + 'Open'] = dt.open; });
    });
  }
  // Read-only modelchip (agent): toont het gekozen model met een potlood dat de hero opent.
  function modelChipHtml(d, it) {
    var lbl = agentModelLabel(d, it.model) || 'Standaard model';
    // Het potlood opent de ingeklapte hero; dat element bestaat alleen bij bewerken. Bij een nieuwe agent staat de
    // hero (met de model-keuze) toch al open, dus tonen we het potlood enkel bij bewerken.
    return '<div class="mk-modelchip" id="agf-modelchip">' + svgIc(IC.spark, 13) + ' <span>Model: ' + esc(lbl) + '</span>' +
      (it.id ? '<button type="button" class="mk-modelchip-edit" id="agf-model-edit" title="Model wijzigen">' + svgIc(IC.edit, 13) + '</button>' : '') + '</div>';
  }
  // Til bestaande per-stap-bronnen op naar skill-niveau (it.access) bij het openen van een oude skill, zodat
  // niets stil verdwijnt. Stappen die afwijken van de unie worden als _override gemarkeerd.
  function skillEnsureAccess(it) {
    if (!it) return;
    if (it.access && (Array.isArray(it.access.tools) || Array.isArray(it.access.mcp_servers))) { it.access.tools = it.access.tools || []; it.access.mcp_servers = it.access.mcp_servers || []; return; }
    var t = {}, m = {};
    (it.stappen || []).forEach(function (s) { (s.tools || []).forEach(function (k) { t[k] = 1; }); (s.mcp_servers || []).forEach(function (k) { m[k] = 1; }); });
    it.access = { tools: Object.keys(t), mcp_servers: Object.keys(m) };
    (it.stappen || []).forEach(function (s) {
      var full = (s.tools || []).length === it.access.tools.length && (s.mcp_servers || []).length === it.access.mcp_servers.length;
      if (!full && ((s.tools || []).length || (s.mcp_servers || []).length)) s._override = true;
    });
  }
  function wireAiBuildBox(page, kind, getIt, redraw, syncModel) {
    // Bij bewerken klapt de "opnieuw met AI"-balk de hero uit; bij een nieuw item is de hero al open.
    var tg = $(kind + '-aib-tg'); if (tg) tg.onclick = function () { var f = $(kind + '-hero-full'); if (f) f.style.display = f.style.display === 'none' ? '' : 'none'; };
    var go = $(kind + '-aib-go'); if (!go) return;
    var btnHtml = svgIc(IC.spark, 15) + ' Bouw met AI';
    var reset = function () { go.disabled = false; go.innerHTML = btnHtml; };
    go.onclick = function () {
      var desc = (($(kind + '-aib-desc') || {}).value || '').trim();
      if (!desc) { toast('Beschrijf eerst kort wat je wil'); return; }
      var model = ($(kind + '-aib-model') || {}).value || '';
      var st = $(kind + '-aib-status'); if (st) st.innerHTML = '<span class="mk-build-busy">De AI bouwt een concept, dit duurt een paar tellen.</span>';
      go.disabled = true; go.textContent = 'Bezig…';
      var ep = kind === 'agent' ? 'teamAgentGenerate' : kind === 'plugin' ? 'teamPluginGenerate' : 'teamSkillGenerate';
      api(ep, { beschrijving: desc, model: model }, { timeout: 90000 }).then(function (r) {
        reset();
        if (r && r.ok && r.concept) {
          var it = getIt(); var c = r.concept; if (syncModel) syncModel(it);
          if (kind === 'agent') { it.naam = c.naam; it.ic = c.ic; it.categorie = c.categorie; it.sys = c.sys; it.kennis = c.kennis; it.tools = c.tools || []; it.access = { tools: (c.tools || []).slice(), mcp_servers: (it.mcp_servers || []).slice() }; }
          else if (kind === 'plugin') { it.naam = c.naam; it.ic = c.ic; it.beschrijving = c.beschrijving; it.categorie = c.categorie; if (c.skill_ids && c.skill_ids.length) it.skill_ids = c.skill_ids; }
          else { it.naam = c.naam; it.ic = c.ic; it.beschrijving = c.beschrijving; it.categorie = c.categorie; it.invoer_label = c.invoer_label; if (c.stappen && c.stappen.length) it.stappen = c.stappen; }
          it._manualOpen = true;   // klap het handmatige blok open zodat het concept meteen zichtbaar is
          toast('Concept klaar. Verfijn het en sla op.'); redraw();
        } else if (st) st.innerHTML = '<span class="mk-build-err">' + esc((r && r.message) || 'Bouwen mislukt, probeer opnieuw.') + '</span>';
      }).catch(function () { reset(); if (st) st.innerHTML = '<span class="mk-build-err">Verbinding mislukt, probeer opnieuw.</span>'; });
    };
  }
  function agentFormHtml(it, d) {
    // access-shim: de bronnen-zone werkt met it.access{tools,mcp_servers}; agents dragen die plat.
    it.access = it.access || { tools: [], mcp_servers: [] };
    if (!Array.isArray(it.access.tools) || !it.access.tools.length) it.access.tools = (it.tools || []).slice();
    if (!Array.isArray(it.access.mcp_servers) || !it.access.mcp_servers.length) it.access.mcp_servers = (it.mcp_servers || []).slice();
    var manualOpen = (it.id || it._manualOpen) ? ' open' : '';
    var advBadge = [(it.kennis && String(it.kennis).trim()) ? 'kennis' : '', (it.docs && it.docs.length) ? (it.docs.length + ' docs') : '', (it.categorie || '').trim() ? 'categorie' : ''];
    return '<div class="aib-form ag-form mk-form"><div class="aib-form-h">' + (it.id ? 'Agent bewerken' : 'Nieuwe agent') + '</div>' +
      aiHeroHtml(d, 'agent', !!it.id, it) +
      '<details class="mk-manual"' + manualOpen + '><summary>' + (it.id ? 'Velden' : 'Of vul het zelf in') + '</summary>' +
        '<div class="mk-blok">' +
          '<div class="aib-grid"><div class="field"><label>Naam van de agent<span class="mk-req"></span></label><input type="text" id="agf-naam" value="' + esc(it.naam) + '" maxlength="80" placeholder="bv. Copywriter, Offerte-assistent, SEO-specialist"></div><div class="field aib-icf"><label>Icoon</label><input type="text" id="agf-ic" value="' + esc(it.ic || '🤖') + '" maxlength="4"></div></div>' +
          '<div class="field"><label>Opdracht (systeemprompt)<span class="mk-req"></span></label><textarea id="agf-sys" rows="6" placeholder="Wie is deze agent en wat doet hij? Bv. Je bent een ervaren copywriter voor Studio 27. Je schrijft kort, menselijk en zonder dashes. Antwoord altijd in het Nederlands.">' + esc(it.sys) + '</textarea></div>' +
          modelChipHtml(d, it) +
        '</div>' +
        accessChipsHtml(it.access, d, { withSkillsPlugins: true, skillIds: it.skill_ids, pluginIds: it.plugin_ids }) +
        '<details class="mk-adv" data-adv="Gea"' + mkAdvOpen(it, 'Gea') + '>' + advSummary('Geavanceerd', advBadge) +
          categorieFieldHtml(it, d, 'agf-cat') +
          '<div class="field"><label>Kennis <span class="fc-hint">achtergrondinfo die de agent als bron gebruikt</span></label><textarea id="agf-kennis" rows="7" placeholder="Plak hier kennis: tone-of-voice, productinfo, veelgestelde vragen, voorbeelden.">' + esc(typeof it.kennis === 'string' ? it.kennis : '') + '</textarea><div class="micro ag-klen" style="color:var(--ink-4);margin-top:4px"></div></div>' +
          agfDocsHtml(it) +
        '</details>' +
        '<details class="mk-adv" data-adv="Knop"' + mkAdvOpen(it, 'Knop', it.knop && it.knop.aan) + '>' + advSummary('Publiceren als knop', [(it.knop && it.knop.aan) ? 'knop actief' : '']) +
          agfKnopHtml(it, d) +
        '</details>' +
      '</details>' +
      '<div class="aib-form-actions"><button class="btn btn-primary" id="agf-save">Opslaan</button><button class="btn btn-outline" id="agf-cancel">Annuleren</button></div></div>';
  }
  function drawAgents(page) {
    var d = state.agentsData; var items = d.items || []; var admin = d.is_admin;
    var top = '';
    if (admin) top = state.agentEdit ? agentFormHtml(state.agentEdit, d) : '<button class="btn btn-primary" id="ag-new" style="margin-bottom:16px">+ Nieuwe agent</button>';
    var list;
    if (!items.length) list = '<div class="empty"><p>' + (admin ? 'Nog geen agents. Maak je eerste gespecialiseerde AI-agent aan.' : 'Er zijn nog geen agents. De zaakvoerder maakt ze aan.') + '</p></div>';
    else list = groupedCardsHtml(items, function (a) { return agentCardHtml(a, d); });
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>AI-agents</h1><div class="sub">Gespecialiseerde AI-assistenten met een eigen opdracht, model en kennis. Klik een agent aan om ermee te chatten.</div></div>' +
      top + list + '</div>';
    wireAgents(page);
  }
  function wireAgents(page) {
    var nb = $('ag-new'); if (nb) nb.onclick = function () { state.agentEdit = agentBlank(); drawAgents(page); window.scrollTo(0, 0); };
    Array.prototype.forEach.call(page.querySelectorAll('.agc[data-chat]'), function (c) {
      c.onclick = function (e) { if (e.target && e.target.closest && e.target.closest('.agc-act')) return; var id = c.getAttribute('data-chat'); var a = (state.agentsData.items || []).filter(function (x) { return x.id === id; })[0]; if (a) openAgentChat(page, a); };
    });
    Array.prototype.forEach.call(page.querySelectorAll('[data-monitor]'), function (b) { if (!b.closest('.agc')) return; b.onclick = function (e) { e.stopPropagation(); var id = b.getAttribute('data-monitor'); var a = (state.agentsData.items || []).filter(function (x) { return x.id === id; })[0]; if (a) { state.agentMonitor = { agent: a }; drawAgentMonitor(page); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-edit]'), function (b) { if (!b.closest('.agc')) return; b.onclick = function (e) { e.stopPropagation(); var a = (state.agentsData.items || []).filter(function (x) { return x.id === b.getAttribute('data-edit'); })[0]; if (a) { state.agentEdit = JSON.parse(JSON.stringify(a)); drawAgents(page); window.scrollTo(0, 0); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('[data-del]'), function (b) { if (!b.closest('.agc')) return; b.onclick = function (e) { e.stopPropagation(); var id = b.getAttribute('data-del'); var a = (state.agentsData.items || []).filter(function (x) { return x.id === id; })[0]; if (!confirm('Agent "' + ((a && a.naam) || '') + '" verwijderen?')) return; api('teamAgentDelete', { id: id }).then(function (r) { if (r && r.ok) { state.agentsData.items = state.agentsData.items.filter(function (x) { return x.id !== id; }); toast('Verwijderd ✓'); drawAgents(page); } else toast((r && r.message) || 'Verwijderen mislukt'); }); }; });
    if (state.agentEdit) wireAgentForm(page);
  }
  function wireAgentForm(page) {
    var kta = $('agf-kennis'), klen = page.querySelector('.ag-klen');
    function upd() { if (klen) { var n = (kta.value || '').length; klen.textContent = n ? (n.toLocaleString('nl-BE') + ' tekens kennis') : ''; } }
    if (kta) { kta.oninput = upd; upd(); }
    // Docs: file upload
    var upload = $('agf-upload');
    if (upload) {
      upload.onchange = function () {
        var files = upload.files; if (!files || !files.length) return;
        var agId = state.agentEdit && state.agentEdit.id; if (!agId) return;
        Array.prototype.forEach.call(files, function (file) {
          if (file.size > 3 * 1024 * 1024) { toast(file.name + ' is te groot (max 3 MB)'); return; }
          var reader = new FileReader();
          reader.onload = function (ev) {
            var tekst = (ev.target.result || '').slice(0, 25000);
            if (!tekst.trim()) { toast(file.name + ': leeg bestand'); return; }
            var lbl = page.querySelector('.agd-upload-btn');
            if (lbl) { lbl.textContent = 'Uploaden…'; lbl.style.pointerEvents = 'none'; }
            api('teamAgentAddDoc', { agent_id: agId, naam: file.name, tekst: tekst }).then(function (r) {
              if (lbl) { lbl.textContent = '+ Bestand toevoegen'; lbl.style.pointerEvents = ''; }
              if (r && r.ok && r.doc) {
                if (!Array.isArray(state.agentEdit.docs)) state.agentEdit.docs = [];
                state.agentEdit.docs.push(r.doc);
                refreshDocList(page); toast(file.name + ' toegevoegd ✓');
              } else toast((r && r.message) || 'Upload mislukt');
            }).catch(function () { if (lbl) { lbl.textContent = '+ Bestand toevoegen'; lbl.style.pointerEvents = ''; } toast('Upload mislukt'); });
          };
          reader.readAsText(file, 'UTF-8');
        });
        upload.value = '';
      };
    }
    // Docs: delete via event delegation on the list container
    var docsList = document.getElementById('agf-docs');
    if (docsList) {
      docsList.onclick = function (e) {
        var btn = e.target.closest && e.target.closest('.agd-del'); if (!btn) return;
        e.stopPropagation();
        var docId = btn.getAttribute('data-docid');
        var docItem = (state.agentEdit && state.agentEdit.docs || []).filter(function (x) { return x.id === docId; })[0];
        if (!confirm('Verwijder "' + (docItem ? docItem.naam : docId) + '"?')) return;
        api('teamAgentDelDoc', { agent_id: state.agentEdit.id, doc_id: docId }).then(function (r) {
          if (r && r.ok) { state.agentEdit.docs = (state.agentEdit.docs || []).filter(function (x) { return x.id !== docId; }); refreshDocList(page); toast('Verwijderd ✓'); }
          else toast((r && r.message) || 'Verwijderen mislukt');
        }).catch(function () { toast('Verwijderen mislukt'); });
      };
    }
    // Bronnen-zone (ingebouwde tools + connectoren): toggle zonder herrender
    wireAccessChips(page, function () { return state.agentEdit.access || (state.agentEdit.access = { tools: [], mcp_servers: [] }); });
    // Model wijzigen: opent de hero (waar de model-keuze staat)
    var modelEdit = $('agf-model-edit'); if (modelEdit) modelEdit.onclick = function () { var f = $('agent-hero-full'); if (f) { f.style.display = ''; f.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
    // AI-knop: views-chips
    Array.prototype.forEach.call(page.querySelectorAll('.ag-view'), function (b) {
      b.onclick = function () {
        var key = b.getAttribute('data-view'); var it = state.agentEdit; if (!it.knop) it.knop = { aan: true, label: '', prompt: '', views: [], type_jobs: [] }; if (!Array.isArray(it.knop.views)) it.knop.views = [];
        var i = it.knop.views.indexOf(key);
        if (i >= 0) { it.knop.views.splice(i, 1); b.classList.remove('on'); } else { it.knop.views.push(key); b.classList.add('on'); }
      };
    });
    Array.prototype.forEach.call(page.querySelectorAll('.ag-typejob'), function (b) {
      b.onclick = function () {
        var key = b.getAttribute('data-typejob'); var it = state.agentEdit; if (!it.knop) it.knop = { aan: true, label: '', prompt: '', views: [], type_jobs: [] }; if (!Array.isArray(it.knop.type_jobs)) it.knop.type_jobs = [];
        var i = it.knop.type_jobs.indexOf(key);
        if (i >= 0) { it.knop.type_jobs.splice(i, 1); b.classList.remove('on'); } else { it.knop.type_jobs.push(key); b.classList.add('on'); }
      };
    });
    // Skills/plugins als tool: toggle-chips
    Array.prototype.forEach.call(page.querySelectorAll('.ag-skilltool'), function (b) { b.onclick = function () { var id = b.getAttribute('data-agskill'); var it = state.agentEdit; if (!Array.isArray(it.skill_ids)) it.skill_ids = []; var i = it.skill_ids.indexOf(id); if (i >= 0) { it.skill_ids.splice(i, 1); b.classList.remove('on'); } else { it.skill_ids.push(id); b.classList.add('on'); } }; });
    Array.prototype.forEach.call(page.querySelectorAll('.ag-plugintool'), function (b) { b.onclick = function () { var id = b.getAttribute('data-agplugin'); var it = state.agentEdit; if (!Array.isArray(it.plugin_ids)) it.plugin_ids = []; var i = it.plugin_ids.indexOf(id); if (i >= 0) { it.plugin_ids.splice(i, 1); b.classList.remove('on'); } else { it.plugin_ids.push(id); b.classList.add('on'); } }; });
    wireKnopVis(page, function () { return state.agentEdit; });
    wireMkAdv(page, function () { return state.agentEdit; });
    wireAiBuildBox(page, 'agent', function () { return state.agentEdit; }, function () { drawAgents(page); window.scrollTo(0, 0); }, function (it) { it.model = ($('agent-aib-model') || {}).value || it.model; });
    // AI-knop: aan/uit toggle toont/verbergt de rest
    var knopAan = $('agf-knop-aan'); if (knopAan) knopAan.onchange = function () { var body = $('agf-knop-body'); if (body) body.style.display = this.checked ? '' : 'none'; };
    var cancel = $('agf-cancel'); if (cancel) cancel.onclick = function () { state.agentEdit = null; drawAgents(page); };
    var save = $('agf-save'); if (save) save.onclick = function () {
      var it = state.agentEdit;
      it.naam = (($('agf-naam') || {}).value || '').trim();
      it.ic = (($('agf-ic') || {}).value || '🤖').trim() || '🤖';
      it.sys = (($('agf-sys') || {}).value || '').trim();
      it.model = ($('agent-aib-model') || {}).value || it.model || '';
      it.categorie = (($('agf-cat') || {}).value || '').trim();
      it.kennis = ($('agf-kennis') || {}).value || '';
      // AI-knop-config uit het formulier
      it.knop = {
        aan: !!(($('agf-knop-aan') || {}).checked),
        label: (($('agf-knop-label') || {}).value || '').trim(),
        prompt: (($('agf-knop-prompt') || {}).value || '').trim(),
        views: (it.knop && Array.isArray(it.knop.views)) ? it.knop.views : [],
        type_jobs: (it.knop && Array.isArray(it.knop.type_jobs)) ? it.knop.type_jobs : [],
        vis: knopVisOut(it),
      };
      if (it.knop.aan && !it.knop.views.length && !it.knop.type_jobs.length) { toast('Kies een view of een type job voor de knop'); return; }
      // access-shim terug naar platte arrays (backend-payload identiek aan vroeger)
      it.tools = (it.access && Array.isArray(it.access.tools)) ? it.access.tools.slice() : (it.tools || []);
      it.mcp_servers = (it.access && Array.isArray(it.access.mcp_servers)) ? it.access.mcp_servers.slice() : (it.mcp_servers || []);
      delete it.access; delete it._manualOpen; delete it._aibDesc; delete it._advGeaOpen; delete it._advKnopOpen;
      if (!it.naam) { toast('Geef de agent een naam'); return; }
      if (!it.sys) { toast('Geef de agent een opdracht (systeemprompt)'); return; }
      save.disabled = true; save.textContent = 'Opslaan…';
      api('teamAgentSave', { item: it }).then(function (r) {
        save.disabled = false; save.textContent = 'Opslaan';
        if (r && r.ok && r.item) { toast('Opgeslagen ✓'); state.agentEdit = null; var items = state.agentsData.items; var idx = -1; for (var i = 0; i < items.length; i++) if (items[i].id === r.item.id) { idx = i; break; } if (idx >= 0) items[idx] = r.item; else items.push(r.item); drawAgents(page); }
        else { toast((r && r.message) || 'Opslaan mislukt'); }
      }).catch(function () { save.disabled = false; save.textContent = 'Opslaan'; toast('Opslaan mislukt'); });
    };
  }
  /* ---- monitor per agent (admin) ---- */
  async function drawAgentMonitor(page) {
    var m = state.agentMonitor; if (!m || !m.agent) { drawAgents(page); return; }
    var a = m.agent;
    page.innerHTML = '<div class="panel active"><div class="agm-head"><button class="ag-back" id="agm-back">‹ AI-agents</button>' +
      '<div class="ag-ch-id"><span class="ag-ch-ic">' + esc(a.ic || '🤖') + '</span><div><div class="ag-ch-nm">' + esc(a.naam) + '</div><div class="ag-ch-mdl">Monitor</div></div></div>' +
      '<button class="agc-btn" id="agm-edit" title="Bewerken" aria-label="Bewerken">' + svgIc(IC.edit, 15) + '</button></div>' +
      '<div class="agm-loading">Gesprekken laden…</div></div>';
    var backBtn = $('agm-back'); if (backBtn) backBtn.onclick = function () { state.agentMonitor = null; drawAgents(page); };
    var editBtn = $('agm-edit'); if (editBtn) editBtn.onclick = function () { state.agentMonitor = null; state.agentEdit = JSON.parse(JSON.stringify(a)); drawAgents(page); window.scrollTo(0, 0); };
    var r; try { r = await api('teamAgentLogs', { agent_id: a.id }); } catch (e) { r = null; }
    var items = (r && r.items) || [];
    var total = items.length;
    var statsHtml = '<div class="agm-stats"><div class="agm-stat"><div class="agm-stat-v">' + total + '</div><div class="agm-stat-l">gesprekken</div></div>' +
      (total ? '<div class="agm-stat"><div class="agm-stat-v">' + fmtRelTime(items[0]._t) + '</div><div class="agm-stat-l">laatste gesprek</div></div>' : '') + '</div>';
    var logsHtml;
    if (!total) {
      logsHtml = '<div class="agm-empty">Nog geen gesprekken. Start een chat met ' + esc(a.naam) + ' om statistieken hier te zien.</div>';
    } else {
      logsHtml = '<div class="agm-log-list">' + items.map(function (log, i) {
        return '<div class="agm-log" data-i="' + i + '">' +
          '<div class="agm-log-row"><span class="agm-log-t">' + fmtRelTime(log._t) + '</span><span class="agm-log-u">' + esc(log.user_naam || '?') + '</span><span class="agm-log-mdl">' + esc((log.model || '').split('-').slice(0, 2).join('-')) + '</span></div>' +
          '<div class="agm-log-q">' + esc((log.vraag || '').slice(0, 120)) + '</div>' +
          '<div class="agm-log-detail" id="agm-d-' + i + '" style="display:none">' +
          '<div class="agm-log-sect"><strong>Vraag</strong>' + esc(log.vraag || '') + '</div>' +
          '<div class="agm-log-sect agm-a"><strong>Antwoord</strong>' + esc(log.antwoord || '') + '</div>' +
          '<button class="btn btn-outline agm-bijstuur" data-agentid="' + esc(a.id) + '" style="margin-top:8px">' + svgIc(IC.edit, 14) + ' Bijsturen op basis hiervan</button>' +
          '</div></div>';
      }).join('') + '</div>';
    }
    page.innerHTML = '<div class="panel active"><div class="agm-head"><button class="ag-back" id="agm-back2">‹ AI-agents</button>' +
      '<div class="ag-ch-id"><span class="ag-ch-ic">' + esc(a.ic || '🤖') + '</span><div><div class="ag-ch-nm">' + esc(a.naam) + '</div><div class="ag-ch-mdl">Monitor</div></div></div>' +
      '<button class="agc-btn" id="agm-edit2" title="Bewerken" aria-label="Bewerken">' + svgIc(IC.edit, 15) + '</button></div>' +
      statsHtml +
      '<h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--ink)">Recente gesprekken</h3>' +
      logsHtml + '</div>';
    wireAgentMonitor(page, a);
  }
  function wireAgentMonitor(page, a) {
    var back = $('agm-back2'); if (back) back.onclick = function () { state.agentMonitor = null; drawAgents(page); };
    var edit = $('agm-edit2'); if (edit) edit.onclick = function () { state.agentMonitor = null; state.agentEdit = JSON.parse(JSON.stringify(a)); drawAgents(page); window.scrollTo(0, 0); };
    Array.prototype.forEach.call(page.querySelectorAll('.agm-log'), function (row) {
      var i = row.getAttribute('data-i'); var detail = document.getElementById('agm-d-' + i);
      row.onclick = function (e) {
        if (e.target.closest && e.target.closest('.agm-bijstuur')) return;
        if (detail) { var open = detail.style.display !== 'none'; row.classList.toggle('open', !open); detail.style.display = open ? 'none' : 'block'; }
      };
    });
    Array.prototype.forEach.call(page.querySelectorAll('.agm-bijstuur'), function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        state.agentMonitor = null; state.agentEdit = JSON.parse(JSON.stringify(a));
        toast('Prompt van ' + a.naam + ' open ter bijsturing');
        drawAgents(page); window.scrollTo(0, 0);
      };
    });
  }
  /* ---- chat met een agent ---- */
  function openAgentChat(page, a, opts) {
    opts = opts || {};
    state.agentChat = { agent: a, msgs: [], busy: false, ctx: { bedrijf_id: opts.bedrijf_id || '', bedrijf_naam: opts.bedrijf_naam || '' } };
    drawAgentChat(page);
    if (opts.starter) sendAgentMessage(page, opts.starter);
  }
  // Start een agent-chat vanuit een AI-knop in een andere view (bv. Adverteerders),
  // met de klant als context en de (ingevulde) startvraag automatisch verstuurd.
  function startAgentKnop(knop, c) {
    // skill-knop → run de skill met de klant als invoer; plugin-knop → run de keten; agent-knop → open de chat met klantcontext
    if (knop.soort === 'skill') {
      var invoer = String(knop.prompt || '{klant}').replace(/\{klant\}/gi, (c && c.naam) || '');
      state.pendingSkillRun = { skill: { id: knop.id, naam: knop.naam, ic: knop.ic, invoer_label: knop.invoer_label || 'Invoer' }, invoer: invoer };
      closeModal();
      go('skills');
      return;
    }
    if (knop.soort === 'plugin') {
      var pinvoer = String(knop.prompt || '{klant}').replace(/\{klant\}/gi, (c && c.naam) || '');
      state.pendingPluginRun = { plugin: { id: knop.id, naam: knop.naam, ic: knop.ic }, invoer: pinvoer };
      closeModal();
      go('plugins');
      return;
    }
    var starter = String(knop.prompt || '').replace(/\{klant\}/gi, (c && c.naam) || '');
    state.pendingAgentChat = { agent: { id: knop.id, naam: knop.naam, ic: knop.ic }, bedrijf_id: (c && c.id) || '', bedrijf_naam: (c && c.naam) || '', starter: starter };
    closeModal();
    go('agents');
  }
  // Laad de knop-agents voor een view en render ze in een container (async, fail-soft).
  function loadAgentKnoppenInto(containerId, view, c, opts) {
    var body = {}; if (view) body.view = view; if (opts && opts.type_job) body.type_job = opts.type_job;
    var titel = (opts && opts.titel) || '✦ AI-agents';
    var sub = (opts && opts.sub) || ('Opent de agent met <b>' + esc((c && c.naam) || 'deze klant') + '</b> als context.');
    api('teamAgentKnoppen', body).then(function (r) {
      var el = document.getElementById(containerId); if (!el) return;
      var items = (r && r.ok && r.items) || [];
      if (!items.length) { el.innerHTML = ''; return; }
      el.innerHTML = '<div class="kd-sec ag-knop-sec-view"><h3>' + esc(titel) + '</h3><div class="ag-knop-row">' +
        items.map(function (k) { return '<button class="ag-knop-btn" data-agk="' + esc(k.id) + '">' + esc(k.ic || '🤖') + ' ' + esc(k.label || k.naam) + (k.heeft_tools ? '<span class="ag-knop-live">live data</span>' : '') + '</button>'; }).join('') +
        '</div><p class="micro" style="color:var(--ink-4);margin-top:8px">' + sub + '</p></div>';
      Array.prototype.forEach.call(el.querySelectorAll('.ag-knop-btn'), function (b) {
        b.onclick = function () { var k = items.filter(function (x) { return x.id === b.getAttribute('data-agk'); })[0]; if (k) startAgentKnop(k, c, opts); };
      });
    }).catch(function () {});
  }
  // Eén bericht versturen (herbruikbaar: handmatig typen én auto-startvraag van een knop).
  function sendAgentMessage(page, txt) {
    var c2 = state.agentChat; if (!c2 || c2.busy) return;
    txt = (txt || '').trim(); if (!txt) return;
    var hist = c2.msgs.slice();
    c2.msgs.push({ role: 'gebruiker', content: txt });
    c2.busy = true; drawAgentChat(page);
    var body = { agent_id: c2.agent.id, vraag: txt, messages: hist };
    if (c2.ctx && c2.ctx.bedrijf_id) body.bedrijf_id = c2.ctx.bedrijf_id;
    var fresh = function () { return state.route === 'agents' && state.agentChat === c2; };   // nog op dit gesprek?
    api('teamAgentChat', body, { timeout: 60000 }).then(function (r) {
      c2.busy = false;
      if (r && r.ok && r.antwoord) c2.msgs.push({ role: 'agent', content: r.antwoord, bronnen: r.bronnen || [] });
      else c2.msgs.push({ role: 'agent', content: '⚠️ ' + ((r && r.message) || 'Er ging iets mis. Probeer het zo opnieuw.') });
      if (fresh()) drawAgentChat(page);
    }).catch(function () { c2.busy = false; c2.msgs.push({ role: 'agent', content: '⚠️ Verbinding mislukt. Probeer het zo opnieuw.' }); if (fresh()) drawAgentChat(page); });
  }
  function agentMsgHtml(m, agent) {
    var me = m.role === 'gebruiker';
    var av = me ? (((state.me && state.me.naam) || 'Ik').slice(0, 1).toUpperCase()) : (agent.ic || '🤖');
    var who = me ? 'Jij' : agent.naam;
    var body = me ? esc(m.content) : agentFmt(m.content);
    var bronnen = (!me && Array.isArray(m.bronnen) && m.bronnen.length) ? '<div class="ag-bronnen">📡 geraadpleegd: ' + m.bronnen.map(function (x) { return esc(x); }).join(', ') + '</div>' : '';
    return '<div class="msg' + (me ? ' me' : '') + '"><div class="av"' + (me ? '' : ' style="background:var(--s27-purple,#6b4bd1);font-size:18px"') + '>' + esc(av) + '</div>' +
      '<div class="bubble"><div class="who">' + esc(who) + '</div><div class="tx">' + body + '</div>' + bronnen + '</div></div>';
  }
  function drawAgentChat(page) {
    var c = state.agentChat; if (!c) { drawAgents(page); return; }
    var a = c.agent;
    var admin = state.agentsData && state.agentsData.is_admin;
    var toolN = (Array.isArray(a.tools) ? a.tools.length : 0) + (Array.isArray(a.mcp_servers) ? a.mcp_servers.length : (a.mcp_count || 0));
    var ctxNaam = c.ctx && c.ctx.bedrijf_naam;
    var head = '<div class="ag-chat-head"><button class="ag-back" id="ag-back">‹ AI-agents</button>' +
      '<div class="ag-ch-id"><span class="ag-ch-ic">' + esc(a.ic || '🤖') + '</span><div><div class="ag-ch-nm">' + esc(a.naam) + (toolN ? ' <span class="ag-ch-tools">📡 ' + toolN + ' bron' + (toolN > 1 ? 'nen' : '') + '</span>' : '') + '</div><div class="ag-ch-mdl">' + esc(agentModelLabel(state.agentsData, a.model)) + (ctxNaam ? ' · klant: ' + esc(ctxNaam) : '') + '</div></div></div>' +
      (admin ? '<button class="agc-btn" id="ag-ch-monitor" title="Monitor" aria-label="Monitor" style="margin-right:4px">' + svgIc(IC.bars, 15) + '</button><button class="agc-btn" id="ag-ch-edit" title="Bewerken">' + svgIc(IC.edit, 14) + ' Bewerken</button>' : '<span></span>') + '</div>';
    var intro = '<div class="msg"><div class="av" style="background:var(--s27-purple,#6b4bd1);font-size:18px">' + esc(a.ic || '🤖') + '</div><div class="bubble"><div class="who">' + esc(a.naam) + '</div><div class="tx">Hoi, ik ben <b>' + esc(a.naam) + '</b>. Waarmee kan ik je helpen?</div></div></div>';
    var msgs = c.msgs.map(function (m) { return agentMsgHtml(m, a); }).join('');
    var typing = c.busy ? '<div class="msg" id="ag-typing"><div class="av" style="background:var(--s27-purple,#6b4bd1);font-size:18px">' + esc(a.ic || '🤖') + '</div><div class="bubble"><div class="tx ag-dots"><span></span><span></span><span></span></div></div></div>' : '';
    page.innerHTML = '<div class="panel active ag-chat-panel">' + head +
      '<div class="chat-list ag-chat-log" id="ag-log">' + intro + msgs + typing + '</div>' +
      '<div class="chat-input ag-composer"><textarea id="ag-in" rows="1" placeholder="Schrijf een bericht…" ' + (c.busy ? 'disabled' : '') + '></textarea>' +
      '<button class="ag-send" id="ag-send" ' + (c.busy ? 'disabled' : '') + ' aria-label="Versturen"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div></div>';
    wireAgentChat(page);
  }
  function wireAgentChat(page) {
    var c = state.agentChat; var log = $('ag-log'); if (log) log.scrollTop = log.scrollHeight;
    var back = $('ag-back'); if (back) back.onclick = function () { state.agentChat = null; drawAgents(page); };
    var mon = $('ag-ch-monitor'); if (mon) mon.onclick = function () { state.agentMonitor = { agent: c.agent }; state.agentChat = null; drawAgentMonitor(page); };
    var ed = $('ag-ch-edit'); if (ed) ed.onclick = function () { state.agentChat = null; state.agentEdit = JSON.parse(JSON.stringify(c.agent)); drawAgents(page); window.scrollTo(0, 0); };
    var ta = $('ag-in'), send = $('ag-send');
    if (ta && !c.busy) { ta.focus(); ta.oninput = function () { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; }; ta.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } }; }
    if (send) send.onclick = doSend;
    function doSend() { var t = (($('ag-in') || {}).value || '').trim(); if (!t) return; sendAgentMessage(page, t); }
  }

  /* ---- PROJECTDETAIL MODAL ---- */
  var curProject = null, _openSeq = 0;
  async function openProject(taskId, tab, opts) {
    var myseq = ++_openSeq;   // race-guard: een latere open/sluit maakt deze response ongeldig
    var scrim = $('scrim'), modal = $('modal');
    modal.innerHTML = '<div class="modal-body" style="padding:48px;text-align:center;color:var(--ink-4)"><div class="boot" style="position:static;background:none"><div class="spin"></div></div></div>';
    scrim.classList.add('show'); scrim.classList.add('tp-mode'); document.body.style.overflow = 'hidden';   // fullscreen taakpagina
    var d; try { d = await api('teamProject', { task_id: taskId }); } catch (e) { d = null; }
    if (myseq !== _openSeq) return;   // gebruiker sloot de modal of opende een ander project
    if (!d || !d.ok) { modal.innerHTML = '<div class="modal-body"><div class="empty"><p>Kon dit project niet laden.</p></div><div style="text-align:center"><button class="btn btn-outline btn-sm" id="mclose2">Sluiten</button></div></div>'; $('mclose2').onclick = closeModal; return; }
    curProject = d; renderModal(d, tab || 'overzicht');
    // deelbare deep-link in de URL (#taak/<id>), pushState zodat de browser-terug-knop de modal sluit.
    if (!(opts && opts.noPush)) { var hash = '#taak/' + taskId; if (location.hash !== hash) { try { history.pushState({ tp: taskId }, '', hash); } catch (e) { location.hash = 'taak/' + taskId; } } }
  }
  function parseTaskHash() { var m = (location.hash || '').match(/^#(taak|project)\/([A-Za-z0-9]+)/); return m ? { kind: m[1].toLowerCase(), id: m[2] } : null; }
  function maybeOpenDeepLink() { var dl = parseTaskHash(); if (dl) openProject(dl.id, null, { noPush: true }); }
  // GLOBALE ZOEKBALK (ClickUp-stijl): debounced, race-guard, toetsenbord-navigatie, ⌘K.
  var _searchTmr = null, _searchSeq = 0, _searchSel = -1;
  function wireSearch() {
    var inp = $('taskSearch'), box = $('searchResults'); if (!inp || !box) return;
    var hide = function () { box.hidden = true; box.innerHTML = ''; _searchSel = -1; };
    var run = function () {
      var q = inp.value.trim(); if (q.length < 2) { hide(); return; }
      var seq = ++_searchSeq;
      box.innerHTML = '<div class="sr-empty">Zoeken…</div>'; box.hidden = false;   // directe feedback tijdens het typen
      api('teamTaskSearch', { q: q }, { timeout: 25000 }).then(function (r) {
        if (seq !== _searchSeq) return;   // een nieuwere zoekopdracht won
        if (!r || !r.ok) { box.innerHTML = '<div class="sr-empty">Zoeken lukte even niet, probeer opnieuw.</div>'; box.hidden = false; return; }
        if (r.building) { box.innerHTML = '<div class="sr-empty">Zoekindex wordt opgebouwd, een paar seconden…</div>'; box.hidden = false; clearTimeout(_searchTmr); _searchTmr = setTimeout(function () { if (inp.value.trim() === q) run(); }, 3000); return; }
        var rows = r.results || []; _searchSel = -1;
        if (!rows.length) { box.innerHTML = '<div class="sr-empty">Geen taak gevonden voor “' + esc(q) + '”.</div>'; box.hidden = false; return; }
        box.innerHTML = rows.map(function (t, i) {
          var dotc = t.color || (t.done ? 'var(--s27-green)' : 'var(--ink-4)');
          var ctxPlain = [t.bedrijf, t.lijst].filter(Boolean).join(' · ');
          var ctx = esc(ctxPlain);
          var full = t.naam + (ctxPlain ? '   ·   ' + ctxPlain : '') + (t.status ? '   -   ' + t.status : '');
          var avs = (t.ass || []).map(function (a) { return '<span class="sr-av" style="background:' + (a.c || 'var(--ink-4)') + '">' + esc(a.i || '?') + '</span>'; }).join('');
          var statusChip = t.status ? '<span class="sr-status" style="--sc:' + esc(t.color || '#9e919e') + '">' + esc(t.status) + '</span>' : '';
          return '<button class="sr-row" data-id="' + esc(t.id) + '" data-tip="' + esc(full) + '"><span class="sr-dot" style="background:' + esc(dotc) + '"></span><span class="sr-main"><span class="sr-nm">' + esc(t.naam) + '</span>' + (ctx ? '<span class="sr-sub">' + ctx + '</span>' : '') + '</span>' + statusChip + (avs ? '<span class="sr-avs">' + avs + '</span>' : '') + '</button>';
        }).join('');
        box.hidden = false; wireTips();
        Array.prototype.forEach.call(box.querySelectorAll('.sr-row'), function (b) { b.onclick = function () { var id = b.getAttribute('data-id'); hide(); inp.value = ''; inp.blur(); openProject(id); }; });
      }).catch(function () { if (seq === _searchSeq) { box.innerHTML = '<div class="sr-empty">Zoeken lukte even niet, probeer opnieuw.</div>'; box.hidden = false; } });
    };
    inp.oninput = function () { clearTimeout(_searchTmr); _searchTmr = setTimeout(run, 160); };
    inp.onkeydown = function (e) {
      if (e.key === 'Escape') { hide(); inp.blur(); return; }
      if (box.hidden) return;
      var rows = box.querySelectorAll('.sr-row'); if (!rows.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); _searchSel = Math.min(_searchSel + 1, rows.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); _searchSel = Math.max(_searchSel - 1, 0); }
      else if (e.key === 'Enter') { e.preventDefault(); var sel = _searchSel >= 0 ? rows[_searchSel] : rows[0]; if (sel) sel.click(); return; }
      else return;
      Array.prototype.forEach.call(rows, function (r, i) { r.classList.toggle('sel', i === _searchSel); });
      if (rows[_searchSel]) rows[_searchSel].scrollIntoView({ block: 'nearest' });
    };
    document.addEventListener('pointerdown', function (e) { if (box.hidden) return; if (!box.contains(e.target) && e.target !== inp) hide(); });
    document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); inp.focus(); inp.select(); } });
  }
  function assigneeChipHtml(p) {
    if (p.assignees && p.assignees.length) {
      var avs = p.assignees.slice(0, 4).map(function (a) { return '<span class="tp-av">' + esc(a.initialen || initialen(a.naam)) + '</span>'; }).join('');
      return '<span class="tp-avs">' + avs + (p.assignees.length > 4 ? '<span class="tp-av tp-av-more">+' + (p.assignees.length - 4) + '</span>' : '') + '</span>';
    }
    return '<span class="tp-assign-empty">+ toewijzen</span>';
  }
  function renderModal(d, tab) {
    if ($('modal')) $('modal').classList.remove('modal-kd');   // projectmodal = standaardbreedte (geen kandidaat-dossier)
    if (tab !== 'overzicht' && tab !== 'chat') tab = 'overzicht';   // tabs teruggebracht tot 2 (bestanden→overzicht, AI→rechts)
    var p = d.project, br = discBr(p.discipline);
    var disc = DISC_LABEL[p.discipline] || p.discipline || 'Project';
    var veldenHtml = (d.velden && d.velden.length) ? '<div class="tp-velden">' + d.velden.map(function (v) { var val = (v.type === 'url') ? ('<a href="' + esc(v.waarde) + '" target="_blank" rel="noopener">' + esc(v.waarde) + '</a>') : esc(v.waarde); return '<span class="tp-veld"><b>' + (v.ic || '') + ' ' + esc(v.label) + ':</b> ' + val + '</span>'; }).join('') + '</div>' : '';
    var stats = d.statussen || [];
    var curLow = (p.status_raw || '').toLowerCase();
    var curStat = stats.filter(function (s) { return s.status.toLowerCase() === curLow; })[0] || { status: p.status_raw || 'Status', color: '#9e919e' };
    var statusTag = '<div class="st-tagwrap">' +
      '<button class="st-tag" id="st-tag" style="--sc:' + esc(curStat.color || '#9e919e') + ';color:' + lumText(curStat.color || '#9e919e') + '"><span class="st-lbl">' + esc(stLabel(curStat.status)) + '</span><svg class="st-chev" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<div class="st-menu" id="st-menu" hidden>' + (stats.length ? stats.map(function (s) { var on = s.status.toLowerCase() === curLow; return '<button class="st-opt' + (on ? ' on' : '') + '" data-st="' + esc(s.status) + '"><span class="st-dot" style="background:' + esc(s.color || '#9e919e') + '"></span><span class="st-on">' + esc(stLabel(s.status)) + '</span>' + (on ? '<span class="st-check">✓</span>' : '') + '</button>'; }).join('') : '<div class="st-empty">Geen statussen</div>') + '</div></div>';
    var head = '<div class="tp-head ' + br + '"><span class="bar"></span>' +
      '<div class="tp-htop"><div class="tp-titlewrap"><span class="tp-disc ' + br + '" title="' + esc(disc) + '">' + discIcSvg(p.discipline, 17) + '</span><h1 class="tp-title">' + esc(p.naam) + '</h1></div>' +
      '<div class="tp-hactions"><button class="tp-iconbtn" id="tp-copylink" title="Kopieer een link naar deze taak"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg></button>' +
      '<button class="modal-close tp-close" id="mclose" aria-label="Sluiten"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div></div>' +
      '<div class="tp-hbar">' + statusTag +
      '<button class="tp-meta tp-edit" id="tp-assignee" title="Wie werkt eraan, klik om aan te passen">' + assigneeChipHtml(p) + '</button>' +
      '<button class="tp-meta tp-edit" id="tp-est" title="Tijdsinschatting, klik om te bewerken">⏱ ' + (p.est_uren ? (p.est_uren + 'u') : '-') + '</button>' +
      '<button class="tp-meta tp-edit" id="tp-due" title="Periode/deadline, klik om te bewerken">📅 ' + dueRangeLabel(p) + '</button>' +
      '<span class="tp-timer" id="tp-timer"></span></div>' + veldenHtml + '</div>';
    var tabs = '<div class="modal-tabs">' + [['overzicht', 'Overzicht'], ['chat', 'Communicatie']].map(function (t) {
      return '<button class="mtab ' + br + (tab === t[0] ? ' active' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    var pane = tab === 'overzicht' ? paneOverzicht(d) : paneChat(d);
    var body = '<div class="tp-body">' + renderTaskTree(d) + '<div class="tp-main">' + tabs + '<div class="modal-body">' + pane + '</div></div>' + renderTaskAside(d) + '</div>';
    $('modal').innerHTML = head + body;
    $('mclose').onclick = function () { closeModal(); };
    var _cl = $('tp-copylink'); if (_cl) _cl.onclick = function () { copyText(location.origin + location.pathname + '#taak/' + d.project.id); toast('Link gekopieerd ✓, stuur dit naar een collega'); };
    Array.prototype.forEach.call($('modal').querySelectorAll('.mtab'), function (b) { b.onclick = function () { renderModal(curProject, b.getAttribute('data-t')); }; });
    wireStatusTag(d); wireTimer(d); wireTaskAside(d); wireHeaderEditors(d); wireTaskTree(d);
    if (tab === 'overzicht') wireOverzicht(d);
    if (tab === 'chat') wireChat(d);
  }
  // Inline-editors in de bovenbalk: assignee-kiezer, tijdsinschatting, deadline (ClickUp-stijl popovers).
  function closeTpPop() { var e = $('tpPop'); if (e) e.remove(); }
  function openTpPop(anchorBtn, html) {
    closeTpPop();
    var pop = document.createElement('div'); pop.className = 'tp-pop'; pop.id = 'tpPop'; pop.innerHTML = html;
    document.body.appendChild(pop);
    var r = anchorBtn.getBoundingClientRect(); var pw = pop.offsetWidth || 240;
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8)) + 'px';
    pop.style.top = (r.bottom + 6) + 'px';
    setTimeout(function () { document.addEventListener('pointerdown', function h(e) { if (!pop.contains(e.target) && e.target !== anchorBtn) { closeTpPop(); document.removeEventListener('pointerdown', h); } }); }, 0);
    return pop;
  }
  function wireHeaderEditors(d) {
    var p = d.project;
    var est = $('tp-est');
    if (est) est.onclick = function () {
      var asn = p.assignees || [], ids = p.assignee_ids || [], split = p.est_split || {};
      if (asn.length >= 1) {
        // per-persoon-verdeling (ClickUp-stijl assignee-breakdown)
        var rows = asn.map(function (a, i) { var id = ids[i]; var v = (split[id] != null) ? split[id] : ''; return '<div class="tp-estrow"><span class="av tp-estav">' + esc(a.initialen || initialen(a.naam)) + '</span><span class="tp-estnm">' + esc(voornaam(a.naam)) + '</span><input type="number" min="0" step="0.5" class="tp-estin" data-id="' + id + '" value="' + esc(String(v)) + '" placeholder="uren"><span class="tp-pop-u">u</span></div>'; }).join('');
        var pop = openTpPop(est, '<div class="tp-pop-h">Tijdsinschatting per persoon</div>' + rows + '<div class="tp-esttot">Totaal: <b id="pop-esttot">' + (p.est_uren || 0) + 'u</b></div><button class="btn btn-primary btn-sm" id="pop-est-go" style="width:100%;margin-top:9px">Opslaan</button>');
        var ins = pop.querySelectorAll('.tp-estin');
        var recalc = function () { var t = 0; Array.prototype.forEach.call(ins, function (x) { var n = Number(x.value); if (isFinite(n) && n > 0) t += n; }); var el = pop.querySelector('#pop-esttot'); if (el) el.textContent = (Math.round(t * 10) / 10) + 'u'; };
        Array.prototype.forEach.call(ins, function (x) { x.oninput = recalc; });
        if (ins[0]) ins[0].focus();
        pop.querySelector('#pop-est-go').onclick = function () {
          var splits = []; Array.prototype.forEach.call(ins, function (x) { splits.push({ id: Number(x.getAttribute('data-id')), uren: Number(x.value) || 0 }); });
          closeTpPop();
          api('teamEstSplit', { task_id: p.id, splits: splits }).then(function (r) { if (r && r.ok) { d.project.est_uren = r.est_uren; d.project.est_split = r.est_split; state.taken = null; state.account = null; toast('Opgeslagen ✓'); renderModal(d, 'overzicht'); } else toast('Opslaan mislukt'); }).catch(function () { toast('Opslaan mislukt'); });
        };
      } else {
        var pop2 = openTpPop(est, '<div class="tp-pop-h">Tijdsinschatting</div><div class="tp-pop-row"><input type="number" min="0" step="0.5" id="pop-uren" value="' + (p.est_uren || '') + '" placeholder="uren"><span class="tp-pop-u">uur</span></div><button class="btn btn-primary btn-sm" id="pop-uren-go" style="width:100%;margin-top:8px">Opslaan</button>');
        var i = pop2.querySelector('#pop-uren'); if (i) i.focus();
        var go = function () { closeTpPop(); saveField(d, { uren: (i ? i.value : '') }, function () { renderModal(d, 'overzicht'); }); };
        pop2.querySelector('#pop-uren-go').onclick = go; if (i) i.onkeydown = function (e) { if (e.key === 'Enter') go(); };
      }
    };
    var due = $('tp-due');
    if (due) due.onclick = function () {
      var html = '<div class="tp-pop-h">Periode / deadline</div>' +
        '<div class="tp-pop-2"><div class="field"><label>Van (start)</label><input type="date" id="pop-start" value="' + esc(p.start_ymd || '') + '"></div><div class="field"><label>Tot (deadline)</label><input type="date" id="pop-due" value="' + esc(p.deadline_ymd || '') + '"></div></div>' +
        '<p class="micro" style="color:var(--ink-4);margin:6px 0 0">Laat "Van" leeg voor één vaste dag.</p>' +
        '<div class="tp-pop-actions"><button class="btn btn-primary btn-sm" id="pop-due-go">Opslaan</button>' + ((p.deadline_ymd || p.start_ymd) ? '<button class="btn btn-outline btn-sm" id="pop-due-clr">Wissen</button>' : '') + '</div>';
      var pop = openTpPop(due, html);
      var st = pop.querySelector('#pop-start'), dz = pop.querySelector('#pop-due'); if (dz) dz.focus();
      if (st && dz) st.onchange = function () { if (st.value && (!dz.value || dz.value < st.value)) dz.value = st.value; };
      pop.querySelector('#pop-due-go').onclick = function () { closeTpPop(); saveField(d, { start: (st ? st.value : ''), due: (dz ? dz.value : '') }, function () { renderModal(d, 'overzicht'); }); };
      var clr = pop.querySelector('#pop-due-clr'); if (clr) clr.onclick = function () { closeTpPop(); saveField(d, { start: '', due: '' }, function () { renderModal(d, 'overzicht'); }); };
    };
    var asg = $('tp-assignee');
    if (asg) asg.onclick = function () {
      var roster = state.roster || [];
      var rows = roster.length ? roster.map(function (m) {
        var on = p.assignee_ids.indexOf(m.id) >= 0;
        return '<button class="tp-pick' + (on ? ' on' : '') + '" data-id="' + m.id + '"><span class="av">' + esc(initialen(m.naam)) + '</span><span class="tp-pick-nm">' + esc(m.naam) + (m.pool ? ' ' + svgIc(IC.cam, 12) : '') + '</span>' + (on ? '<span class="tp-pick-ck">✓</span>' : '') + '</button>';
      }).join('') : '<div class="micro" style="padding:8px;color:var(--ink-4)">Geen teamleden geladen.</div>';
      var pop = openTpPop(asg, '<div class="tp-pop-h">Wie werkt eraan</div><div class="tp-pick-list">' + rows + '</div>');
      Array.prototype.forEach.call(pop.querySelectorAll('.tp-pick'), function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-id'); var on = b.classList.contains('on');
          closeTpPop();
          saveAssignee(d, on ? { rem_assignee: id } : { add_assignee: id });
        };
      });
    };
  }
  // contact + bedrijf-zijpaneel op de taakpagina
  // RECHTERKOLOM: één beknopt klant-blok (contact + bedrijf samen) + de AI-acties-lijst.
  function renderTaskAside(d) {
    var p = d.project, c = d.contact;
    var rows = '';
    if (c) {
      if (c.email) rows += '<a class="tpc-row" href="mailto:' + esc(c.email) + '"><span class="tpc-ic">' + svgIc(IC.mail, 15) + '</span><span class="tpc-v">' + esc(c.email) + '</span></a>';
      if (c.gsm) rows += '<a class="tpc-row" href="tel:' + esc(c.gsm.replace(/\s/g, '')) + '"><span class="tpc-ic">📞</span><span class="tpc-v">' + esc(c.gsm) + '</span></a>';
    }
    var portalHref = p.bedrijf_id ? (KLANTPORTAAL + '/?klant=' + esc(p.bedrijf_id)) : '';
    var naam = c ? (c.naam || '') : '';
    var card = '<div class="tpc-card"><div class="tpc-h">Klant</div>' +
      (p.bedrijf ? '<div class="tpc-bedrijfnm">' + esc(p.bedrijf) + '</div>' : '') +
      (naam ? '<div class="tpc-naam">' + esc(naam) + '</div>' : '') +
      (rows || (c ? '' : '<div class="micro" style="color:var(--ink-4);margin-top:3px">Geen contactpersoon gekoppeld</div>')) +
      (c && !rows ? '<div class="micro" style="color:var(--ink-4);margin-top:3px">Geen e-mail/telefoon ingevuld</div>' : '') +
      (portalHref ? '<a class="tpc-portal" id="tp-bedrijf" href="' + portalHref + '" target="_blank" rel="noopener" title="Open het klantportaal van deze klant">Klantportaal ↗</a>' : '') +
      '</div>';
    return '<aside class="tp-aside">' + card + aiAsideHtml(d) + '</aside>';
  }
  // AI-catalogus (per type job/discipline beheerd). Geladen bij boot; modal filtert client-side.
  function loadAiCatalog() { api('teamAiCatalog', {}).then(function (r) { if (r && r.ok) state.aiCat = r; }).catch(function () { }); }
  function aiActVisible(a, disc, role, mid) {
    if (!a || a.actief === false) return false;
    var scopeOk = a.scope === 'algemeen' || (Array.isArray(a.scope) && a.scope.indexOf(disc) >= 0);
    if (!scopeOk) return false;
    var vr = (a.vis && a.vis.roles) || [], vm = (a.vis && a.vis.members) || [];
    if (!vr.length && !vm.length) return true;
    return vr.indexOf(role) >= 0 || (mid && vm.indexOf(Number(mid)) >= 0);
  }
  function aiActByKey(key) {
    var cat = (state.aiCat && state.aiCat.items) || [];
    for (var i = 0; i < cat.length; i++) if (cat[i].key === key) return cat[i];
    for (var j = 0; j < AI_ACTS.length; j++) if (AI_ACTS[j].k === key) return { key: key, label: AI_ACTS[j].label, input: AI_ACTS[j].input, ph: AI_ACTS[j].ph };
    return { key: key, label: 'AI', input: false };
  }
  function aiAsideHtml(d) {
    var cat = (state.aiCat && state.aiCat.items) || null;
    var meId = (state.me && state.me.id) || (state.aiCat && state.aiCat.me_id) || 0;
    var list = cat ? cat.filter(function (a) { return aiActVisible(a, d.project.type_job_key || d.project.discipline, state.role, meId); }) : AI_ACTS.map(function (a) { return { key: a.k, label: a.label, ic: a.ic, input: a.input }; });
    var btns = list.length ? list.map(function (a) { return '<button class="tp-aibtn" data-k="' + esc(a.key) + '" data-input="' + (a.input ? 1 : 0) + '"><span class="tp-aibtn-ic">' + esc(a.ic || '✨') + '</span><span>' + esc(a.label) + '</span></button>'; }).join('') : '<div class="micro" style="color:var(--ink-4)">Geen AI-acties voor dit type job.</div>';
    // HTML-voorbereiden + V9 zitten nu als 'speciale' catalogus-acties (type html/v9) in de lijst hierboven -
    // niet langer hardcoded, zodat ze ook op de AI-knoppen-pagina verschijnen.
    var req = '<button class="tp-ai-req" id="tp-ai-req">+ Nieuwe AI-knop aanvragen</button>';
    var manage = (state.aiCat && state.aiCat.is_admin) ? '<button class="tp-ai-manage" id="tp-ai-manage">' + svgIc(IC.gear, 14) + ' AI-knoppen beheren</button>' : '';
    return '<div class="tpc-card tp-aicard"><div class="tpc-h">AI-acties</div><div class="tp-ailist">' + btns + '</div>' + req + manage + '<div id="tpTypeJobKnoppen"></div></div>';
  }
  function aiRequestPopup(d) {
    var disc = (state.aiCat && (state.aiCat.typejobs || []).filter(function (x) { return x.key === d.project.type_job_key; })[0] || {}).label || DISC_LABEL[d.project.discipline] || 'dit type job';
    showAiPop('💡 Nieuwe AI-knop aanvragen', '<p class="micro" style="color:var(--ink-4);margin:0 0 10px">Voor <b>' + esc(disc) + '</b>. Vincent verfijnt de prompt en zet de knop live na review.</p><input type="text" id="airq-t" class="ai-input" placeholder="Naam van de knop (bv. Wireframe-tekst)" style="margin-bottom:8px"><textarea id="airq-d" class="ai-input" rows="3" placeholder="Wat moet de AI doen?"></textarea><button class="btn btn-primary btn-sm" id="airq-go" style="margin-top:8px">Aanvragen</button>');
    var ti = document.getElementById('airq-t'); if (ti) ti.focus();
    document.getElementById('airq-go').onclick = function () {
      var t = (document.getElementById('airq-t') || {}).value || ''; var om = (document.getElementById('airq-d') || {}).value || '';
      if (!t.trim() && !om.trim()) { toast('Beschrijf eerst de knop'); return; }
      var btn = this; btn.disabled = true; btn.textContent = 'Aanvragen…';
      api('teamFeatureRequest', { soort: 'ai-knop', type_job: (d.project.type_job_key || d.project.discipline), titel: t, omschrijving: om, portaal: 'Teamportaal', onderdeel: 'AI-knop' }).then(function (r) {
        if (r && r.ok) { closeAiPop(); toast('Aangevraagd ✓. Vincent zet ’m live na review'); }
        else { btn.disabled = false; btn.textContent = 'Aanvragen'; toast('Aanvragen mislukt'); }
      }).catch(function () { btn.disabled = false; btn.textContent = 'Aanvragen'; toast('Aanvragen mislukt'); });
    };
  }
  function wireTaskAside(d) { wireAiAside(d); }
  // AI-resultaat-popup (gecentreerd over de modal)
  function closeAiPop() {
    var e = document.getElementById('tpAiPop'); if (e) e.remove();
    if (window.__aipopEsc) { document.removeEventListener('keydown', window.__aipopEsc); window.__aipopEsc = null; }
    // Achtergrond-scroll enkel vrijgeven als WIJ 'm gelockt hadden (niet een open modal clobberen).
    if (window.__aipopLockedBody) { document.body.style.overflow = ''; window.__aipopLockedBody = false; }
  }
  // AI-knoppen schermvullend: vult de content-zone (sidebar + topbar blijven zichtbaar), dichtklikbaar via ✕ of Escape.
  // opts.compact = kleine gecentreerde kaart (voor lichte CRUD/bevestiging i.p.v. een volledig scherm).
  function showAiPop(title, html, opts) {
    closeAiPop();
    var ov = document.createElement('div'); ov.className = 'tp-aipop-scrim' + (opts && opts.compact ? ' compact' : ''); ov.id = 'tpAiPop';
    ov.innerHTML = '<div class="tp-aipop"><div class="tp-aipop-top"><span class="ai-tag">' + esc(title) + '</span><button class="tp-aipop-x" id="aipopX" aria-label="Sluiten">✕</button></div><div class="tp-aipop-body">' + html + '</div></div>';
    document.body.appendChild(ov);
    // Lock de achtergrond-scroll zodat er niets achter het venster wegschuift (mobiel). Enkel als nog niet gelockt
    // (een ouder-modal kan 'm al op hidden hebben gezet) → dan laten we die met rust.
    if (document.body.style.overflow !== 'hidden') { document.body.style.overflow = 'hidden'; window.__aipopLockedBody = true; }
    ov.addEventListener('pointerdown', function (e) { if (e.target === ov) closeAiPop(); });
    var x = document.getElementById('aipopX'); if (x) x.onclick = closeAiPop;
    window.__aipopEsc = function (e) { if (e.key === 'Escape') closeAiPop(); };
    document.addEventListener('keydown', window.__aipopEsc);
    return ov;
  }
  function runAiAction(d, k, input) {
    var act = aiActByKey(k);
    showAiPop('✨ ' + (act.label || 'AI'), '<div class="empty" style="padding:18px"><div class="boot" style="position:static;background:none;margin:0 auto 8px"><div class="spin"></div></div><p>De AI denkt na…</p></div>');
    api('teamAiAction', { task_id: d.project.id, action: k, input: input || '' }, { timeout: 40000 }).then(function (r) {
      var body = document.querySelector('#tpAiPop .tp-aipop-body'); if (!body) return;
      if (!r || !r.ok) { var msg = (r && r.error === 'no_anthropic_key') ? 'AI-sleutel ontbreekt.' : (r && r.error === 'rate_limited') ? (r.message || 'AI-limiet bereikt.') : 'De AI is even niet bereikbaar, probeer zo opnieuw.'; body.innerHTML = '<p class="micro" style="color:var(--s27-red-ink,#c0392b)">' + esc(msg) + '</p>'; return; }
      var raw = r.text || '';
      body.innerHTML = '<div class="ai-plan">' + aiFmt(raw) + '</div><button class="btn btn-outline btn-sm" id="aipopCopy" style="margin-top:12px">Kopiëren</button>';
      var cb = document.getElementById('aipopCopy'); if (cb) cb.onclick = function () { copyText(raw); };
    }).catch(function () { var body = document.querySelector('#tpAiPop .tp-aipop-body'); if (body) body.innerHTML = '<p class="micro">De AI is even niet bereikbaar.</p>'; });
  }
  function wireAiAside(d) {
    Array.prototype.forEach.call($('modal').querySelectorAll('.tp-aibtn[data-k]'), function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-k'); var act = aiActByKey(k);
        if (act.type === 'html') { aiHtmlPopup(d); return; }
        if (act.type === 'v9') { runV9(d); return; }
        var needs = b.getAttribute('data-input') === '1';
        if (needs) {
          showAiPop('✨ ' + (act.label || 'AI'), '<textarea id="aipopIn" class="ai-input" rows="4" placeholder="' + esc(act.ph || act.lbl || 'Typ hier je input…') + '"></textarea><button class="btn btn-primary btn-sm" id="aipopRun" style="margin-top:8px">Uitvoeren ✨</button>');
          var ta = document.getElementById('aipopIn'); if (ta) ta.focus();
          document.getElementById('aipopRun').onclick = function () { var v = (ta && ta.value.trim()) || ''; if (!v) { toast('Vul eerst iets in'); return; } runAiAction(d, k, v); };
        } else runAiAction(d, k, '');
      };
    });
    var rq = $('tp-ai-req'); if (rq) rq.onclick = function () { aiRequestPopup(d); };
    var mg = $('tp-ai-manage'); if (mg) mg.onclick = function () { closeModal(); go('aiknoppen'); };
    // agent/skill-knoppen die op DIT type job zijn gericht, tonen in de taakdetail (naast de AI-acties).
    if (d.project && d.project.type_job_key) loadAgentKnoppenInto('tpTypeJobKnoppen', null, { id: d.project.bedrijf_id || '', naam: d.project.bedrijf || '' }, { type_job: d.project.type_job_key, titel: '✦ Agents & skills voor dit type job', sub: 'AI-knoppen die je voor dit type job instelde.' });
  }
  function aiHtmlPopup(d) {
    showAiPop('🌐 HTML-voorbereiding', '<p class="micro" style="color:var(--ink-4);margin:0 0 10px">Genereert een eerste responsive HTML-pagina uit de briefing (kern van de V9-plugin).</p><div class="html-prep-row"><select id="aipopType" class="ev-in html-sel"><option value="homepage">Homepage</option><option value="dienstpagina">Dienstpagina</option><option value="over-ons">Over ons</option><option value="contact">Contact</option></select><button class="btn btn-primary btn-sm" id="aipopGen">Genereren ✨</button></div><div id="aipopOut" style="margin-top:10px"></div>');
    document.getElementById('aipopGen').onclick = function () {
      var typ = (document.getElementById('aipopType') || {}).value || 'homepage'; var out = document.getElementById('aipopOut'); var btn = document.getElementById('aipopGen');
      btn.disabled = true; var old = btn.textContent; btn.textContent = 'Genereren…';
      out.innerHTML = '<div class="empty" style="padding:14px"><div class="boot" style="position:static;background:none;margin:0 auto 8px"><div class="spin"></div></div><p>De AI bouwt de pagina… (±20 sec)</p></div>';
      api('teamHtmlPrepare', { task_id: d.project.id, page_type: typ }, { timeout: 70000 }).then(function (r) {
        btn.disabled = false; btn.textContent = old;
        if (!r || !r.ok || !r.html) { out.innerHTML = '<p class="micro" style="color:var(--s27-red-ink,#c0392b)">Genereren mislukt, probeer zo opnieuw.</p>'; return; }
        var blob = new Blob([r.html], { type: 'text/html' }); var url = URL.createObjectURL(blob);
        var fn = ((r.bedrijf || 'pagina').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '') || 'pagina') + '-' + (r.page_type || typ) + '.html';
        out.innerHTML = '<div style="display:flex;gap:6px"><a class="btn btn-outline btn-sm" href="' + url + '" target="_blank" rel="noopener">Openen ↗</a><a class="btn btn-primary btn-sm" href="' + url + '" download="' + esc(fn) + '">Download</a></div>';
      }).catch(function () { btn.disabled = false; btn.textContent = old; out.innerHTML = '<p class="micro">Genereren mislukt.</p>'; });
    };
  }
  function runV9(d) {
    toast('V9 starten in de cloud…');
    api('teamV9Run', { task_id: d.project.id, pages: 'homepage' }, { timeout: 40000 }).then(function (r) {
      if (!r || !r.ok) { toast((r && r.error === 'not_configured') ? (r.message || 'V9-cloudroutine nog niet gekoppeld.') : 'Starten mislukt, probeer zo opnieuw.'); return; }
      toast('V9 gestart in de cloud ✓');
      showAiPop('☁️ V9 gestart in de cloud', '<p class="micro" style="color:var(--ink-4)">De lichte V9-pijplijn draait op platform.claude (SE Ranking → master-plan → HTML). Het resultaat verschijnt als comment + bijlage op deze taak.</p>' + (r.session_url ? '<a class="btn btn-outline btn-sm" href="' + esc(r.session_url) + '" target="_blank" rel="noopener" style="margin-top:10px">Live volgen ↗</a>' : ''), { compact: true });
    }).catch(function () { toast('Starten mislukt'); });
  }
  // LINKER PROJECTBOOM, inklapbaar, met lazy-load van diepere subtaken (teamSubtree).
  function treeDot(st) { var k = ((st && st.key) || '').toLowerCase(); var c = /done|complete|afge|factuur|gefactureerd|closed|klaar/.test(k) ? 'var(--s27-green)' : /progress|werk|prod|bezig/.test(k) ? 'var(--s27-blue)' : 'var(--ink-4)'; return '<span class="tpt-dot2" style="background:' + c + '"></span>'; }
  function treeChev() { return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'; }
  function treeNode(node, curId, open, preKids) {
    return '<div class="tpt-node" data-id="' + esc(node.id) + '">' +
      '<div class="tpt-row' + (curId === node.id ? ' on' : '') + '">' +
        '<button class="tpt-chev' + (open ? ' open' : '') + '" data-id="' + esc(node.id) + '" title="Subtaken in-/uitklappen" aria-label="In-/uitklappen">' + treeChev() + '</button>' +
        '<button class="tpt-task" data-id="' + esc(node.id) + '" title="' + esc(node.naam) + '">' + treeDot(node.status) + '<span class="tpt-nm">' + esc(node.naam) + '</span></button>' +
      '</div>' +
      '<div class="tpt-children" data-parent="' + esc(node.id) + '"' + (open ? '' : ' hidden') + ' data-loaded="' + (open ? '1' : '0') + '">' + (preKids != null ? preKids : '') + '</div>' +
    '</div>';
  }
  function renderTaskTree(d) {
    var t = d.tree; if (!t || !t.root) return '';
    var curId = d.project.id;
    var kids = (t.taken || []).map(function (k) { return treeNode(k, curId, false, null); }).join('');
    var rootKids = kids || '<div class="micro" style="color:var(--ink-4);padding:6px 10px">Geen onderdelen</div>';
    var rootNode = treeNode(t.root, curId, true, rootKids);   // root staat standaard open
    return '<aside class="tp-tree"><div class="tpt-h"><span>Project</span><button class="tpt-allbtn" id="tpt-all" title="Hele boom in-/uitklappen">' + treeChev() + '</button></div><div class="tpt-scroll" id="tptScroll">' + rootNode + '</div></aside>';
  }
  function curPid() { return (curProject && curProject.project && curProject.project.id) || ''; }
  function wireTreeNodes(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll('.tpt-task'), function (b) { b.onclick = function () { var id = b.getAttribute('data-id'); if (id && id !== curPid()) openProject(id); }; });
    Array.prototype.forEach.call(scope.querySelectorAll('.tpt-chev'), function (ch) { ch.onclick = function (e) { e.stopPropagation(); treeToggle(ch); }; });
  }
  function wireTaskTree(d) {
    var scroll = $('tptScroll'); if (scroll) wireTreeNodes(scroll);
    var all = $('tpt-all'); if (all) all.onclick = treeToggleAll;
  }
  function treeToggle(chev) {
    var node = chev.parentNode && chev.parentNode.parentNode; if (!node) return;   // .tpt-chev → .tpt-row → .tpt-node
    var box = node.querySelector('.tpt-children'); if (!box) return;
    if (!box.hidden) { box.hidden = true; chev.classList.remove('open'); return; }
    box.hidden = false; chev.classList.add('open');
    if (box.getAttribute('data-loaded') !== '1') {
      box.setAttribute('data-loaded', '1');
      box.innerHTML = '<div class="micro" style="padding:6px 10px;color:var(--ink-4)">Laden…</div>';
      api('teamSubtree', { task_id: chev.getAttribute('data-id') }).then(function (r) {
        if (!r || !r.ok) { box.innerHTML = '<div class="micro" style="padding:6px 10px;color:var(--ink-4)">Kon subtaken niet laden.</div>'; return; }
        var kids = r.taken || [];
        if (!kids.length) { box.innerHTML = '<div class="micro" style="padding:6px 10px;color:var(--ink-4)">Geen subtaken.</div>'; return; }
        box.innerHTML = kids.map(function (k) { return treeNode(k, curPid(), false, null); }).join('');
        wireTreeNodes(box);
      }).catch(function () { box.innerHTML = '<div class="micro" style="padding:6px 10px;color:var(--ink-4)">Kon subtaken niet laden.</div>'; });
    }
  }
  function treeToggleAll() {
    var scroll = $('tptScroll'); if (!scroll) return;
    var open = scroll.querySelectorAll('.tpt-children:not([hidden])');
    if (open.length) {
      Array.prototype.forEach.call(scroll.querySelectorAll('.tpt-children'), function (b) { b.hidden = true; });
      Array.prototype.forEach.call(scroll.querySelectorAll('.tpt-chev'), function (c) { c.classList.remove('open'); });
    } else {
      var rc = scroll.querySelector('.tpt-node > .tpt-row > .tpt-chev'); if (rc) treeToggle(rc);
    }
  }
  // status-tag (ClickUp-stijl), werkt op elke tab (zit in de header)
  function wireStatusTag(d) {
    var tag = $('st-tag'), menu = $('st-menu'); if (!tag || !menu) return;
    tag.onclick = function (e) { e.stopPropagation(); var open = menu.hidden; menu.hidden = !open; if (open) { var close = function () { if (menu) menu.hidden = true; document.removeEventListener('click', close); }; setTimeout(function () { document.addEventListener('click', close); }, 0); } };
    Array.prototype.forEach.call(menu.querySelectorAll('.st-opt'), function (o) { o.onclick = function (e) { e.stopPropagation(); menu.hidden = true; var st = o.getAttribute('data-st'); if (st && st.toLowerCase() !== (d.project.status_raw || '').toLowerCase()) setStatus(d, st); }; });
  }
  // echte ClickUp time-tracking: start/stop + realtime teller
  var _timerTick = null;
  function fmtDur(ms) { var s = Math.floor(ms / 1000); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); var ss = s % 60; return (h ? (h + ':') : '') + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); }
  // ── tijds-helpers ──
  function fmtHm(ms) { var m = Math.round((ms || 0) / 60000); var h = Math.floor(m / 60), mm = m % 60; return h ? (h + 'u' + (mm ? (' ' + mm + 'm') : '')) : (mm + 'm'); }
  function parseDur(s) { s = String(s || '').toLowerCase().replace(',', '.').trim(); if (!s) return 0; var ms = 0, matched = false; var h = s.match(/(\d+(?:\.\d+)?)\s*(?:u|h)/); if (h) { ms += parseFloat(h[1]) * 3600000; matched = true; } var mn = s.match(/(\d+(?:\.\d+)?)\s*m/); if (mn) { ms += parseFloat(mn[1]) * 60000; matched = true; } if (!matched) { var n = parseFloat(s); if (isFinite(n)) ms = n * 60000; }  return Math.round(ms); }
  function toLocalInput(ms) { var dd = new Date(ms || Date.now()); var pad = function (n) { return String(n).padStart(2, '0'); }; return dd.getFullYear() + '-' + pad(dd.getMonth() + 1) + '-' + pad(dd.getDate()) + 'T' + pad(dd.getHours()) + ':' + pad(dd.getMinutes()); }
  function wireTimer(d) {
    if (_timerTick) { clearInterval(_timerTick); _timerTick = null; }
    var box = $('tp-timer'); if (!box) return;
    box.innerHTML = '<span class="micro" style="color:var(--ink-4)">…</span>';
    Promise.all([
      api('teamTimerCurrent', {}).catch(function () { return null; }),
      api('teamTimeList', { task_id: d.project.id }).catch(function () { return null; })
    ]).then(function (res) {
      if ($('tp-timer') !== box) return;   // pagina gewisseld
      var cur = res[0], tl = res[1];
      var running = !!(cur && cur.ok && cur.running && cur.task_id === d.project.id);
      var entries = (tl && tl.ok && tl.entries) ? tl.entries : [];
      d._timeEntries = entries;
      var loggedMs = entries.reduce(function (a, e) { return a + (e.duration || 0); }, 0);
      paintTimer(d, box, running, running ? Number(cur.started) : 0, loggedMs);
    });
  }
  function paintTimer(d, box, running, started, loggedMs) {
    if (_timerTick) { clearInterval(_timerTick); _timerTick = null; }
    var log = '<button class="tpt-log" id="tpt-log" title="Tijdsregistratie bekijken/bewerken">' + (loggedMs ? ('Σ ' + fmtHm(loggedMs)) : '⏱') + '</button>';
    if (running) {
      box.innerHTML = '<span class="tpt-dot"></span><span class="tpt-time" id="tpt-time">0:00</span><button class="tpt-btn stop" id="tpt-pause">⏸ Pauze</button>' + log;
      var upd = function () { var t = $('tpt-time'); if (t) t.textContent = fmtDur(Date.now() - started); };
      upd(); _timerTick = setInterval(upd, 1000);
      $('tpt-pause').onclick = function () { stopTimer(d); };
    } else {
      box.innerHTML = '<button class="tpt-btn start" id="tpt-start">▶ ' + (loggedMs ? 'Hervat' : 'Start') + '</button>' + log;
      $('tpt-start').onclick = function () { startTimer(d); };
    }
    var lg = $('tpt-log'); if (lg) lg.onclick = function () { timePopup(d); };
  }
  async function startTimer(d) {
    var r; try { r = await api('teamTimerStart', { task_id: d.project.id, naam: d.project.naam }); } catch (e) { r = null; }
    if (!r || !r.ok) { toast('Timer starten mislukt'); return; }
    toast('Tijd loopt ▶'); wireTimer(d);
  }
  async function stopTimer(d) {
    if (_timerTick) { clearInterval(_timerTick); _timerTick = null; }
    var r; try { r = await api('teamTimerStop', {}); } catch (e) { r = null; }
    if (!r || !r.ok) { toast('Pauzeren mislukt'); wireTimer(d); return; }
    toast(r.geboekt ? ('Gepauzeerd - ' + fmtDur(r.logged_ms || 0) + ' geboekt ✓') : 'Gepauzeerd'); wireTimer(d);
  }
  function timePopup(d) {
    var entries = d._timeEntries || [];
    var totMs = entries.reduce(function (a, e) { return a + (e.duration || 0); }, 0);
    var rows = entries.length ? entries.map(function (e) {
      return '<div class="tm-row"><span class="tm-when">' + esc(tijd(e.start)) + '</span><span class="tm-dur">' + fmtHm(e.duration) + '</span><span class="tm-who">' + esc(e.who || '') + '</span><button class="tm-edit" data-id="' + esc(e.id) + '" title="Bewerken" aria-label="Bewerken">' + svgIc(IC.edit, 14) + '</button><button class="tm-del" data-id="' + esc(e.id) + '" title="Verwijderen" aria-label="Verwijderen">' + svgIc(IC.trash, 14) + '</button></div>';
    }).join('') : '<div class="micro" style="color:var(--ink-4);padding:8px 0">Nog geen tijd geregistreerd op deze taak.</div>';
    showAiPop('⏱ Tijdsregistratie · totaal ' + fmtHm(totMs),
      '<div class="tm-add"><label class="tm-lbl">Tijd achteraf toevoegen</label><input type="datetime-local" id="tm-when" class="ai-input" value="' + toLocalInput(Date.now()) + '" style="margin-bottom:6px"><div style="display:flex;gap:6px"><input type="text" id="tm-dur" class="ai-input" placeholder="duur, bv. 1u 30m of 45m" style="flex:1"><button class="btn btn-primary btn-sm" id="tm-add-go">Toevoegen</button></div></div><div class="tm-list">' + rows + '</div>', { compact: true });
    var addBtn = document.getElementById('tm-add-go');
    if (addBtn) addBtn.onclick = function () {
      var w = (document.getElementById('tm-when') || {}).value, durMs = parseDur((document.getElementById('tm-dur') || {}).value);
      var startMs = w ? new Date(w).getTime() : 0;
      if (!startMs || !durMs) { toast('Vul een tijdstip én duur in (bv. 1u 30m)'); return; }
      api('teamTimeAdd', { task_id: d.project.id, start_ms: startMs, duration_ms: durMs }).then(function (r) { if (r && r.ok) { toast('Toegevoegd ✓'); closeAiPop(); wireTimer(d); } else toast('Toevoegen mislukt'); }).catch(function () { toast('Toevoegen mislukt'); });
    };
    Array.prototype.forEach.call(document.querySelectorAll('#tpAiPop .tm-del'), function (b) { b.onclick = function () { var id = b.getAttribute('data-id'); if (!confirm('Deze registratie verwijderen?')) return; api('teamTimeDelete', { entry_id: id }).then(function (r) { if (r && r.ok) { toast('Verwijderd ✓'); closeAiPop(); wireTimer(d); } else toast('Verwijderen mislukt'); }); }; });
    Array.prototype.forEach.call(document.querySelectorAll('#tpAiPop .tm-edit'), function (b) { b.onclick = function () { var id = b.getAttribute('data-id'); var e = (d._timeEntries || []).filter(function (x) { return x.id === id; })[0]; if (e) timeEditPopup(d, e); }; });
  }
  function timeEditPopup(d, e) {
    showAiPop('Registratie bewerken', '<label class="tm-lbl">Start</label><input type="datetime-local" id="tme-when" class="ai-input" value="' + toLocalInput(e.start) + '" style="margin-bottom:6px"><label class="tm-lbl">Duur</label><div style="display:flex;gap:6px"><input type="text" id="tme-dur" class="ai-input" value="' + esc(fmtHm(e.duration)) + '" style="flex:1"><button class="btn btn-primary btn-sm" id="tme-go">Opslaan</button></div>', { compact: true });
    document.getElementById('tme-go').onclick = function () {
      var w = (document.getElementById('tme-when') || {}).value, durMs = parseDur((document.getElementById('tme-dur') || {}).value);
      var startMs = w ? new Date(w).getTime() : 0;
      if (!startMs || !durMs) { toast('Vul tijdstip én duur in'); return; }
      api('teamTimeUpdate', { entry_id: e.id, start_ms: startMs, end_ms: startMs + durMs }).then(function (r) { if (r && r.ok) { toast('Bijgewerkt ✓'); closeAiPop(); wireTimer(d); } else toast((r && r.message) || 'Bijwerken mislukt'); }).catch(function () { toast('Bijwerken mislukt'); });
    };
  }
  function paneOverzicht(d) {
    var p = d.project;
    // Briefing = de ClickUp-omschrijving (bewerkbaar).
    var brief = '<div class="pj-block"><h4>Briefing / omschrijving</h4><textarea id="ed-brief" class="pj-brieftext" placeholder="Voeg de opdracht / briefing toe…">' + esc(p.brief) + '</textarea><button class="btn btn-outline btn-sm" id="ed-brief-save" style="margin-top:8px" disabled>Briefing opslaan</button></div>';
    // Bestanden/bijlagen, op de overzichtspagina i.p.v. een aparte tab.
    var dlIc = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>';
    var fileList = (d.bestanden && d.bestanden.length) ? d.bestanden.map(function (f) {
      return '<a class="linkcard" href="' + esc(f.url) + '" target="_blank" rel="noopener" download><span class="li">' + dlIc + '</span><div style="min-width:0"><div class="ll">' + esc(f.label) + '</div><div class="lu">' + esc(f.url) + '</div></div></a>';
    }).join('') : '<div class="micro" style="color:var(--ink-4)">Nog geen bestanden of opleverlinks.</div>';
    var files = '<div class="pj-block"><h4>Bestanden' + (d.bestanden && d.bestanden.length ? (' (' + d.bestanden.length + ')') : '') + '</h4>' + fileList +
      '<label class="btn btn-outline btn-sm" id="ed-file-lbl" style="margin-top:10px;cursor:pointer;display:inline-flex">+ Bestand toevoegen<input type="file" id="ed-file" hidden></label></div>';
    var subs = d.subtaken.length ? '<div class="pj-block"><h4>Onderdelen (' + d.subtaken.length + ')</h4>' + d.subtaken.map(function (s) {
      var done = isDoneStatus(s.status);
      return '<div class="sub-row' + (done ? ' done' : '') + '"><button class="sub-check' + (done ? ' on' : '') + '" data-sid="' + esc(s.id) + '" title="Afvinken">' + (done ? subCheckSvg() : '') + '</button><span class="sb-nm">' + esc(s.naam) + '</span>' + pillHtml(s.status) + '</div>';
    }).join('') + '</div>' : '';
    return brief + files + subs + taskActiesHtml();
  }
  // splits/subtaak-acties, zitten nu onder de AI-tab
  function taskActiesHtml() {
    return '<div class="pj-block"><h4>Acties op deze taak</h4><div class="pj-acties">' +
      '<button class="btn btn-outline btn-sm" id="act-split">✂️ Splits in 2</button>' +
      '<button class="btn btn-outline btn-sm" id="act-sub">＋ Subtaak</button></div>' +
      '<div class="sub-add" id="sub-add" hidden><input id="sub-naam" type="text" placeholder="Naam van de subtaak…" maxlength="200" autocomplete="off"><button class="btn btn-primary btn-sm" id="sub-go">Toevoegen</button></div>' +
      '<p class="micro" style="color:var(--ink-4);margin-top:8px">Splitsen maakt “deel 1” (blijft staan) + “deel 2” (in ‘Te plannen’), uren en budget worden gehalveerd, klant/contact/type job/… gaan mee.</p></div>';
  }
  function wireTaskActies(d) {
    var asub = $('act-sub'), subAdd = $('sub-add');
    if (asub && subAdd) asub.onclick = function () { subAdd.hidden = !subAdd.hidden; if (!subAdd.hidden) { var i = $('sub-naam'); if (i) i.focus(); } };
    var subGo = $('sub-go'), subNaam = $('sub-naam');
    if (subGo && subNaam) { var doSub = function () { addSubtask(d, subNaam.value.trim(), subGo); }; subGo.onclick = doSub; subNaam.onkeydown = function (e) { if (e.key === 'Enter') doSub(); }; }
    var sp = $('act-split'); if (sp) sp.onclick = function () { splitTask(d, sp); };
  }
  async function saveField(d, patch, after) {
    var r; try { r = await api('teamTaskUpdate', Object.assign({ task_id: d.project.id }, patch)); } catch (e) { r = null; }
    if (r && r.ok) { if (r.est_uren != null) d.project.est_uren = r.est_uren; if (patch.due !== undefined) d.project.deadline_ymd = r.due_ymd; if (patch.start !== undefined) d.project.start_ymd = r.start_ymd; state.taken = null; state.account = null; toast('Opgeslagen ✓'); if (after) after(); }
    else toast('Opslaan mislukt');
  }
  async function saveAssignee(d, patch) {
    var r; try { r = await api('teamTaskUpdate', Object.assign({ task_id: d.project.id }, patch)); } catch (e) { r = null; }
    if (r && r.ok) { d.project.assignees = r.assignees; d.project.assignee_ids = r.assignee_ids; state.taken = null; state.account = null; toast('Team bijgewerkt ✓'); renderModal(d, 'overzicht'); }
    else toast('Bijwerken mislukt');
  }
  function wireOverzicht(d) {
    // briefing/omschrijving opslaan
    var bt = $('ed-brief'), bs = $('ed-brief-save');
    if (bt && bs) { var orig = d.project.brief || ''; bt.oninput = function () { bs.disabled = (bt.value === orig); }; bs.onclick = function () { bs.disabled = true; saveField(d, { brief: bt.value }, function () { d.project.brief = bt.value; }); }; }
    wireBestanden(d);     // bestand-upload (bestanden staan nu op het overzicht)
    wireTaskActies(d);    // splits / subtaak
    // subtaken afvinken (ClickUp-checkbox-gedrag), optimistisch + server
    Array.prototype.forEach.call($('modal').querySelectorAll('.sub-check'), function (b) {
      b.onclick = function () {
        var sid = b.getAttribute('data-sid'); var s = (d.subtaken || []).filter(function (x) { return x.id === sid; })[0]; if (!s) return;
        var nowDone = !isDoneStatus(s.status);
        var row = b.closest('.sub-row'); b.classList.toggle('on', nowDone); if (row) row.classList.toggle('done', nowDone); b.innerHTML = nowDone ? subCheckSvg() : '';
        api('teamSubtaskToggle', { task_id: sid, done: nowDone }).then(function (r) { if (r && r.ok) { s.status = r.status || s.status; state.taken = null; state.account = null; } else { toast('Afvinken mislukt'); renderModal(d, 'overzicht'); } }).catch(function () { toast('Afvinken mislukt'); renderModal(d, 'overzicht'); });
      };
    });
  }
  async function splitTask(d, btn) {
    if (!confirm('Deze taak in 2 splitsen?\n\n“deel 1” blijft staan; “deel 2” wordt automatisch de eerstvolgende werkdag ingepland (zelfde tijdstip). Uren en budget worden gehalveerd; klant, contact, type job, organisatie … gaan mee.')) return;
    var old = btn.textContent; btn.disabled = true; btn.textContent = 'Splitsen…';
    var r; try { r = await api('teamTaskSplit', { task_id: d.project.id, mode: 'split' }, { timeout: 40000 }); } catch (e) { r = null; }
    btn.disabled = false; btn.textContent = old;
    if (!r || !r.ok) { toast('Splitsen mislukt, probeer zo opnieuw'); return; }
    state.taken = null; state.account = null; PL.tasks = [];
    toast('Gesplitst ✓ - “deel 2” staat volgende werkdag ingepland');
    openProject(d.project.id);   // herlaad de modal (toont nu “deel 1”)
  }
  async function setStatus(d, st) {
    var r; try { r = await api('teamStatus', { task_id: d.project.id, status: st }); } catch (e) { r = null; }
    if (!r || !r.ok) { toast('Status wijzigen mislukt'); return; }
    d.project.status_raw = st; if (r.status) d.project.status = r.status;
    state.taken = null; state.account = null; PL.tasks = [];
    toast('Status: ' + stLabel(st)); renderModal(d, 'overzicht');
  }
  async function addSubtask(d, naam, btn) {
    if (!naam) { toast('Vul een naam in'); return; }
    var old = btn.textContent; btn.disabled = true; btn.textContent = 'Toevoegen…';
    var r; try { r = await api('teamSubtaskAdd', { task_id: d.project.id, naam: naam }); } catch (e) { r = null; }
    btn.disabled = false; btn.textContent = old;
    if (!r || !r.ok) { toast('Subtaak toevoegen mislukt'); return; }
    d.subtaken = d.subtaken || []; d.subtaken.push({ id: r.id, naam: r.naam, status: r.status || { key: 'to do', label: 'Te doen' }, assignees: [], due: 0, due_ymd: '' });
    state.taken = null; state.account = null;
    toast('Subtaak toegevoegd ✓'); renderModal(d, 'overzicht');
  }
  function paneBestanden(d) {
    var list = (d.bestanden && d.bestanden.length) ? d.bestanden.map(function (f) {
      return '<a class="linkcard" href="' + esc(f.url) + '" target="_blank" rel="noopener" download><span class="li"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></span><div style="min-width:0"><div class="ll">' + esc(f.label) + '</div><div class="lu">' + esc(f.url) + '</div></div></a>';
    }).join('') : '<div class="empty" style="padding:24px"><p>Nog geen bestanden of opleverlinks op dit project.</p></div>';
    return list + '<label class="btn btn-outline btn-sm" id="ed-file-lbl" style="margin-top:10px;cursor:pointer;display:inline-flex"><span id="ed-file-tx">+ Bestand toevoegen</span><input type="file" id="ed-file" hidden></label>';
  }
  function wireBestanden(d) {
    var f = $('ed-file'); if (!f) return;
    // Tekst zit in een aparte <span> zodat het wijzigen van het label de file-input niet sloopt
    // (textContent op het <label> zelf zou de <input> als child verwijderen → tweede upload onmogelijk).
    var setTx = function (t) { var s = $('ed-file-tx'); if (s) s.textContent = t; };
    f.onchange = function () {
      var file = f.files && f.files[0]; if (!file) return;
      if (file.size > 20 * 1024 * 1024) { toast('Bestand te groot (max 20 MB)'); return; }
      setTx('Uploaden…');
      var rd = new FileReader();
      rd.onerror = function () { toast('Kon het bestand niet lezen'); setTx('+ Bestand toevoegen'); f.value = ''; };
      rd.onload = async function () {
        var data = String(rd.result); var b64 = data.indexOf(',') >= 0 ? data.split(',')[1] : data;
        var r; try { r = await api('teamTaskAttach', { task_id: d.project.id, filename: file.name, file_data: b64 }); } catch (e) { r = null; }
        if (r && r.ok) { d.bestanden = d.bestanden || []; d.bestanden.push({ url: r.url, label: r.filename }); toast('Bestand toegevoegd ✓'); renderModal(d, 'overzicht'); }
        else { toast('Upload mislukt' + (r && r.error === 'te_groot' ? ' (te groot)' : '')); setTx('+ Bestand toevoegen'); f.value = ''; }
      };
      rd.readAsDataURL(file);
    };
  }
  // chat zit altijd op de HOOFDTAAK (PM-taak) → één projectgesprek voor alle teamleden
  function chatTid(d) { return (d.project && d.project.top_id) || (d.tree && d.tree.root && d.tree.root.id) || d.project.id; }
  function paneChat(d) {
    var isSub = d.tree && d.tree.root && d.tree.root.id !== d.project.id;
    var hint = isSub ? '<div class="chat-hint">Dit is het projectgesprek op de hoofdtaak <b>' + esc(d.tree.root.naam) + '</b>. Iedereen in het project ziet dit.</div>' : '';
    var msgs = (d.chat || []).map(function (c) {
      var cls = c.is_intern ? 'intern' : (c.is_klant ? '' : 'me');
      var who = c.is_klant ? esc(c.auteur || 'Klant') : esc(c.auteur || 'Studio 27');
      return '<div class="msg ' + cls + '"><span class="av">' + esc(initialen(who)) + '</span><div class="bubble"><div class="who">' + who + '</div><div class="tx">' + esc(c.tekst) + '</div><div class="tm">' + tijd(c.datum) + '</div></div></div>';
    }).join('');
    return hint + '<div class="chat-list">' + (msgs || '<div class="empty" style="padding:24px"><p>Nog geen berichten op dit project.</p></div>') + '</div>' +
      '<div class="chat-tools"><label class="chat-toggle"><input type="checkbox" id="ch-intern"> Interne notitie (niet zichtbaar voor de klant)</label></div>' +
      '<div class="chat-input"><input id="ch-txt" placeholder="Bericht aan de klant of een interne notitie…" autocomplete="off"><button class="chat-send" id="ch-send"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div>';
  }
  function wireChat(d) {
    var inp = $('ch-txt'), send = $('ch-send');
    var post = async function () {
      if (send.disabled) return;   // al aan het versturen (voorkomt dubbel posten via snelle Enter)
      var tekst = inp.value.trim(); if (!tekst) return; var intern = $('ch-intern').checked;
      send.disabled = true; inp.disabled = true;
      var r; try { r = await api('teamProjectChatPost', { task_id: chatTid(d), tekst: tekst, intern: intern }); } catch (e) { r = null; }
      if (r && r.ok) { var ch; try { ch = await api('teamProjectChat', { task_id: chatTid(d) }); } catch (e) { ch = null; } if (ch && ch.ok) d.chat = ch.comments; toast(intern ? 'Notitie opgeslagen ✓' : 'Bericht verstuurd ✓'); renderModal(d, 'chat'); }
      else { toast('Versturen mislukt'); send.disabled = false; inp.disabled = false; }
    };
    send.onclick = post; inp.onkeydown = function (e) { if (e.key === 'Enter') post(); };
  }
  /* ---- AI-acties op een project (één-klik, briefing wordt automatisch meegestuurd) ---- */
  var AI_ACTS = [
    { k: 'samenvatten', label: 'Briefing samenvatten', ic: '📋', input: false },
    { k: 'stappen', label: 'Volgende stappen', ic: '✅', input: false },
    { k: 'vraag', label: 'Vrije vraag', ic: '❓', input: true, ph: 'Stel een vraag over dit project…' },
    { k: 'verbeter', label: 'Tekst verbeteren', ic: '✍️', input: true, ph: 'Plak hier de tekst die je wil verbeteren of herschrijven…' }
  ];
  function paneAi(d) {
    var btns = AI_ACTS.map(function (a) { return '<button class="ai-act" data-k="' + a.k + '" data-input="' + (a.input ? 1 : 0) + '"><span class="ai-ic">' + a.ic + '</span><span>' + a.label + '</span></button>'; }).join('');
    var htmlBlock = (d.project.discipline === 'webdesign') ?
      '<div class="html-prep"><div class="html-prep-h">🌐 HTML-voorbereiding</div>' +
      '<p class="micro" style="color:var(--ink-4);margin:2px 0 10px">Genereer een eerste responsive HTML-pagina uit de briefing van deze taak, de basis die we anders met de V9-copywritingplugin maken. Verfijn daarna in Webflow of via de volledige V9-pijplijn.</p>' +
      '<div class="html-prep-row"><select id="html-type" class="ev-in html-sel"><option value="homepage">Homepage</option><option value="dienstpagina">Dienstpagina</option><option value="over-ons">Over ons</option><option value="contact">Contact</option></select>' +
      '<button class="btn btn-primary btn-sm" id="html-gen">HTML genereren ✨</button>' +
      '<button class="btn btn-outline btn-sm" id="v9-run" title="Draait de volledige lichte V9-pijplijn (SE Ranking + master-plan + HTML) op platform.claude; resultaat verschijnt op deze taak">☁️ Volledige V9 in de cloud</button></div>' +
      '<div id="html-out" style="margin-top:10px"></div></div>' : '';
    return taskActiesHtml() + '<div class="ai-pane">' + htmlBlock +
      '<div class="ai-intro">Kies een AI-actie, het project en de briefing worden automatisch meegestuurd.</div>' +
      '<div class="ai-acts">' + btns + '</div>' +
      '<div class="ai-inputwrap" id="ai-inputwrap" style="display:none"><textarea id="ai-input" class="ai-input" rows="4"></textarea><button class="btn btn-primary btn-sm" id="ai-run" style="margin-top:8px">Uitvoeren ✨</button></div>' +
      '<div id="ai-out" class="ai-out"></div>' +
      '<p class="micro" style="color:var(--ink-4);margin-top:12px">Controleer het resultaat altijd vóór gebruik.</p></div>';
  }
  function wireAi(d) {
    wireTaskActies(d);
    wireHtmlPrep(d);
    var iw = $('ai-inputwrap'), inp = $('ai-input'), out = $('ai-out');
    var run = function (action, input) {
      out.innerHTML = '<div class="empty" style="padding:20px"><div class="boot" style="position:static;background:none;margin:0 auto 8px"><div class="spin"></div></div><p>De AI denkt na…</p></div>';
      api('teamAiAction', { task_id: d.project.id, action: action, input: input || '' }, { timeout: 40000 }).then(function (r) {
        if (!r || !r.ok) {
          var msg = (r && r.error === 'no_anthropic_key') ? 'AI-sleutel ontbreekt.' : (r && r.error === 'geen_input') ? 'Vul eerst iets in.' : (r && r.error === 'rate_limited') ? (r.message || 'AI-limiet bereikt.') : 'De AI is even niet bereikbaar, probeer zo opnieuw.';
          out.innerHTML = '<div class="empty" style="padding:18px"><p>' + esc(msg) + '</p></div>'; return;
        }
        var raw = r.text || '';
        out.innerHTML = '<div class="ai-result"><div class="ai-result-top"><span class="ai-tag">AI-resultaat</span><button class="btn btn-outline btn-sm" id="ai-copy">Kopiëren</button></div><div class="ai-plan">' + aiFmt(raw) + '</div></div>';
        var cb = $('ai-copy'); if (cb) cb.onclick = function () { copyText(raw); };
      }).catch(function () { out.innerHTML = '<div class="empty" style="padding:18px"><p>De AI is even niet bereikbaar, probeer zo opnieuw.</p></div>'; });
    };
    Array.prototype.forEach.call($('modal').querySelectorAll('.ai-act'), function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-k'), needs = b.getAttribute('data-input') === '1';
        Array.prototype.forEach.call($('modal').querySelectorAll('.ai-act'), function (x) { x.classList.remove('on'); }); b.classList.add('on');
        if (needs) {
          var act = AI_ACTS.filter(function (a) { return a.k === k; })[0] || {};
          iw.style.display = 'block'; inp.placeholder = act.ph || ''; inp.value = ''; inp.focus();
          $('ai-run').onclick = function () { var v = inp.value.trim(); if (!v) { toast('Vul eerst iets in'); return; } run(k, v); };
        } else { iw.style.display = 'none'; run(k, ''); }
      };
    });
  }
  // HTML-voorbereiding (webdesigntaken): genereer een responsive HTML-pagina uit de briefing.
  function wireHtmlPrep(d) {
    var hg = $('html-gen'); if (!hg) return;
    hg.onclick = function () {
      var hout = $('html-out'); var typ = ($('html-type') || {}).value || 'homepage';
      var old = hg.textContent; hg.disabled = true; hg.textContent = 'Genereren…';
      hout.innerHTML = '<div class="empty" style="padding:16px"><div class="boot" style="position:static;background:none;margin:0 auto 8px"><div class="spin"></div></div><p>De AI bouwt de pagina… (±20 sec)</p></div>';
      api('teamHtmlPrepare', { task_id: d.project.id, page_type: typ }, { timeout: 70000 }).then(function (r) {
        hg.disabled = false; hg.textContent = old;
        if (!r || !r.ok || !r.html) {
          var em = (r && r.error === 'no_anthropic_key') ? 'AI-sleutel ontbreekt.' : (r && r.error === 'geen_html') ? 'De AI gaf geen geldige HTML terug, probeer opnieuw.' : 'Genereren mislukt, probeer zo opnieuw.';
          hout.innerHTML = '<p class="micro" style="color:var(--s27-red-ink,#c0392b)">' + esc(em) + '</p>'; return;
        }
        var blob = new Blob([r.html], { type: 'text/html' }); var url = URL.createObjectURL(blob);
        var fn = ((r.bedrijf || 'pagina').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '') || 'pagina') + '-' + (r.page_type || typ) + '.html';
        hout.innerHTML = '<div class="ai-result"><div class="ai-result-top"><span class="ai-tag">🌐 HTML klaar</span>' +
          '<span style="display:flex;gap:6px"><a class="btn btn-outline btn-sm" href="' + url + '" target="_blank" rel="noopener">Openen ↗</a>' +
          '<a class="btn btn-primary btn-sm" href="' + url + '" download="' + esc(fn) + '">Download</a></span></div>' +
          '<p class="micro" style="color:var(--ink-4);margin-top:8px">Eerste opzet uit de taakbriefing. Aannames staan als <code>&lt;!-- aanname --&gt;</code> in de code. Verfijn in Webflow of laat Vincent de volledige V9-pijplijn draaien.</p></div>';
      }).catch(function () { hg.disabled = false; hg.textContent = old; hout.innerHTML = '<p class="micro" style="color:var(--s27-red-ink,#c0392b)">Genereren mislukt, probeer zo opnieuw.</p>'; });
    };
    var vr = $('v9-run'); if (!vr) return;
    vr.onclick = function () {
      var hout = $('html-out'); var typ = ($('html-type') || {}).value || 'homepage';
      var old = vr.textContent; vr.disabled = true; vr.textContent = 'Starten…';
      hout.innerHTML = '<div class="empty" style="padding:14px"><p>De V9-cloudpijplijn starten op platform.claude…</p></div>';
      api('teamV9Run', { task_id: d.project.id, pages: typ }, { timeout: 40000 }).then(function (r) {
        vr.disabled = false; vr.textContent = old;
        if (!r || !r.ok) {
          var em = (r && r.error === 'not_configured') ? (r.message || 'De V9-cloudroutine is nog niet gekoppeld (Vincent).') : (r && r.message) || 'Starten mislukt, probeer zo opnieuw.';
          hout.innerHTML = '<p class="micro" style="color:var(--s27-red-ink,#c0392b)">' + esc(em) + '</p>'; return;
        }
        hout.innerHTML = '<div class="ai-result"><div class="ai-result-top"><span class="ai-tag">☁️ V9 gestart in de cloud</span>' +
          (r.session_url ? '<a class="btn btn-outline btn-sm" href="' + esc(r.session_url) + '" target="_blank" rel="noopener">Live volgen ↗</a>' : '') + '</div>' +
          '<p class="micro" style="color:var(--ink-4);margin-top:8px">De pijplijn draait op platform.claude (SE Ranking → master-plan → HTML). Het resultaat verschijnt straks als comment + bijlage op deze taak.</p></div>';
      }).catch(function () { vr.disabled = false; vr.textContent = old; hout.innerHTML = '<p class="micro" style="color:var(--s27-red-ink,#c0392b)">Starten mislukt, probeer zo opnieuw.</p>'; });
    };
  }
  function copyText(t) {
    var done = function () { toast('Gekopieerd ✓'); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t, done); }); return; } } catch (e) { /* */ }
    fallbackCopy(t, done);
  }
  function fallbackCopy(t, done) {
    try { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); ta.remove(); done(); } catch (e) { toast('Kopiëren mislukt'); }
  }
  function tijd(ms) { var n = Number(ms); if (!n) return ''; var d = new Date(n); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  // chat moet eerst geladen worden vóór de pane render → openProject laadt project, chat lazy bij eerste chat-tab
  var origRenderModal = renderModal;
  renderModal = async function (d, tab) {
    if (tab === 'chat' && !d.chat) { try { var ch = await api('teamProjectChat', { task_id: chatTid(d) }); d.chat = (ch && ch.ok) ? ch.comments : []; } catch (e) { d.chat = []; } }
    origRenderModal(d, tab);
  };
  function closeModal(opts) {
    _openSeq++;   // invalideer een nog lopende openProject-fetch zodat een trage response de modal niet heropent
    $('scrim').classList.remove('show'); $('scrim').classList.remove('tp-mode'); if ($('modal')) $('modal').classList.remove('modal-kd'); if (_timerTick) { clearInterval(_timerTick); _timerTick = null; } document.body.style.overflow = ''; curProject = null; if (state.route === 'home') { state.taken = null; }
    closeTpPop(); closeAiPop();
    // URL terug naar de onderliggende route (tenzij de sluiting al van de terug-knop kwam)
    if (!(opts && opts.noHash) && parseTaskHash()) { var rh = '#' + (state.route || 'home'); try { history.replaceState(null, '', rh); } catch (e) { try { location.hash = state.route || 'home'; } catch (e2) { } } }
  }

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
      '<p class="micro" style="margin-top:10px;color:var(--ink-4)">Komt in de ClickUp-lijst “Portaal - Feature Requests”, met jou als aanvrager en het portaal duidelijk vermeld.</p></div>';
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

  /* ---- ADMIN-IMPERSONATIE (enkel zaakvoerder): bekijk het portaal van een collega ---- */
  var EYE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  function renderImpersonateCtl() {
    var el = $('impCtl'); if (!el) return; el.innerHTML = '';
    if (state.actingAs) {
      el.innerHTML = '<button class="imp-banner" id="impBack" title="Terug naar je eigen portaal">' + EYE + ' Je bekijkt ' + esc(voornaam(state.actingAs.naam)) + ' · terug</button>';
      $('impBack').onclick = function () { setActAs(''); };
    } else if (state.canImpersonate) {
      el.innerHTML = '<button class="imp-btn" id="impOpen" title="Bekijk het portaal van een collega">' + EYE + ' Bekijk als…</button>';
      $('impOpen').onclick = openImpersonate;
    }
  }
  function openImpersonate() {
    curProject = null;
    var rows = (state.roster || []).map(function (m) { return '<button class="imp-row" data-id="' + m.id + '"><span class="av">' + esc(initialen(m.naam)) + '</span><div><div class="nm">' + esc(m.naam) + '</div><div class="rol">' + (m.pool ? '📷 Content creator' : 'Team') + '</div></div></button>'; }).join('');
    $('modal').innerHTML = '<div class="modal-head br-purple"><span class="bar"></span><div style="flex:1;min-width:0"><div class="sub">Zaakvoerder</div><h2>👁 Bekijk het portaal van een collega</h2></div><button class="modal-close" id="mclose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div><div class="modal-body"><p class="micro" style="color:var(--ink-4);margin:0 0 12px">Je ziet exact wat dat teamlid ziet, handig om hun planning te checken. Alleen jij kan dit.</p><div class="imp-list">' + rows + '</div></div>';
    $('mclose').onclick = closeModal; $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    Array.prototype.forEach.call($('modal').querySelectorAll('.imp-row'), function (b) { b.onclick = function () { setActAs(b.getAttribute('data-id')); }; });
  }
  function setActAs(id) {
    state.actAsMember = String(id || ''); state.taken = null; state.account = null; state.homeList = null;
    try { if (id) localStorage.setItem('s27team_actas', state.actAsMember); else localStorage.removeItem('s27team_actas'); } catch (e) { }
    closeModal();
    $('boot').style.display = 'flex'; $('boot-msg').textContent = id ? 'Portaal laden…' : 'Terug naar jezelf…';
    boot();
  }

  /* ---- AI-DAGPLANNING ---- */
  function aiFmt(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/\n/g, '<br>'); }
  /* renderAi verwijderd. AI-dagplanning is nu geïntegreerd in renderHome (loadHomeAiPlan). */

  /* ---- binnenkort ---- */
  /* ---- BERICHTEN-INBOX (klant wacht op antwoord) ---- */
  async function renderBerichten(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Berichten</h1><div class="sub">Projecten waar de klant op jouw antwoord wacht.</div></div><div class="empty"><p>Je inbox laden…</p></div></div>';
    var d; try { d = await api('teamBerichten', {}); } catch (e) { return; }
    if (state.route !== 'berichten') return;
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = 'Kon de berichten niet laden.'; return; }
    var items = d.items || [];
    var subtitle = items.length ? (items.length + ' ' + (items.length === 1 ? 'klant wacht' : 'klanten wachten') + ' op jouw antwoord.') : 'Geen openstaande klantvragen, je bent helemaal bij. 🎉';
    var head = '<div class="t-hero"><h1>Berichten</h1><div class="sub">' + esc(subtitle) + '</div></div>';
    var body = items.length
      ? '<div class="msg-inbox">' + items.map(inboxRow).join('') + '</div>'
      : '<div class="empty"><p>Niets in je inbox. Zodra een klant iets stuurt op een van jouw projecten, verschijnt het hier, klaar om te beantwoorden.</p></div>';
    page.innerHTML = '<div class="panel active">' + head + body + '</div>';
    Array.prototype.forEach.call(page.querySelectorAll('.mi-row'), function (b) { b.onclick = function () { openProject(b.getAttribute('data-id'), 'chat'); }; });
  }
  function inboxRow(it) {
    return '<button class="mi-row ' + discBr(it.discipline) + '" data-id="' + esc(it.task_id) + '">' +
      '<span class="bar"></span>' +
      '<div class="mi-main"><div class="mi-top"><span class="mi-bedrijf">' + esc(it.bedrijf || 'Klant') + '</span><span class="mi-tijd">' + tijd(it.ts) + '</span></div>' +
      '<div class="mi-naam">' + esc(it.naam) + '</div>' +
      '<div class="mi-snippet">' + esc(it.snippet || '') + '</div></div>' +
      '<span class="mi-badge">Antwoorden ›</span></button>';
  }

  /* ---- SHOOT-AANVRAGEN BUITEN UREN (creator-accept) ---- */
  async function renderAanvragen(page) {
    page.innerHTML = '<div class="panel active"><div class="t-hero"><h1>Shoot-aanvragen</h1><div class="sub">Shoots buiten de standaarduren, accepteer als jij kan, of geef aan dat het niet lukt.</div></div><div class="empty"><p>Aanvragen laden…</p></div></div>';
    var d; try { d = await api('teamShootRequests', {}); } catch (e) { return; }
    if (state.route !== 'aanvragen') return;
    if (!d || !d.ok) { page.querySelector('.empty p').textContent = 'Kon de aanvragen niet laden.'; return; }
    state.aanvragen = d; drawAanvragen(page);
  }
  function arDatum(it) { if (!it.datum_ymd) return ''; var p = it.datum_ymd.split('-'); return (+p[2]) + ' ' + MONTHS[(+p[1]) - 1] + (it.van ? ' · ' + it.van + (it.tot ? '-' + it.tot : '') : ''); }
  function arCard(it) {
    return '<div class="ar-card br-orange"><span class="bar"></span>' +
      '<div class="ar-main"><div class="ar-top"><span class="ar-bedrijf">' + esc(it.bedrijf || 'Klant') + '</span><span class="ar-when">' + esc(arDatum(it)) + '</span></div>' +
      (it.locatie ? '<div class="ar-loc">📍 ' + esc(it.locatie) + '</div>' : '') +
      (it.opmerking ? '<div class="ar-note">' + esc(it.opmerking) + '</div>' : '') +
      '<div class="ar-by">Aangevraagd door ' + esc(it.aangevraagd_door || '-') + '</div></div>' +
      '<div class="ar-acts"><button class="btn btn-primary btn-sm ar-accept" data-id="' + esc(it.id) + '">Accepteren</button><button class="btn btn-outline btn-sm ar-decline" data-id="' + esc(it.id) + '">Lukt niet</button></div></div>';
  }
  function arDoneCard(it) {
    var ok = it.status === 'accepted';
    return '<div class="ar-card ' + (ok ? 'br-green' : 'br-pink') + ' ar-mini"><span class="bar"></span><div class="ar-main"><div class="ar-top"><span class="ar-bedrijf">' + esc(it.bedrijf || 'Klant') + '</span><span class="ar-when">' + esc(arDatum(it)) + '</span></div><div class="ar-by">' + (ok ? '✅ Geaccepteerd door ' + esc(it.creator || '-') : '✕ Niet ingepland' + (it.reden ? ' - ' + esc(it.reden) : '')) + '</div></div></div>';
  }
  function drawAanvragen(page) {
    var d = state.aanvragen, pend = d.pending || [], done = d.afgehandeld || [];
    var head = '<div class="t-hero ar-hero"><div><h1>Shoot-aanvragen</h1><div class="sub">' + (pend.length ? pend.length + ' ' + (pend.length === 1 ? 'aanvraag wacht' : 'aanvragen wachten') + ' op een creator.' : 'Geen openstaande aanvragen.') + '</div></div><button class="btn btn-primary btn-sm" id="ar-new">+ Nieuwe aanvraag</button></div>';
    var pendHtml = pend.length ? '<div class="ar-list">' + pend.map(arCard).join('') + '</div>' : '<div class="empty"><p>Niets openstaand. Avond- of weekendshoots die binnenkomen verschijnen hier.</p></div>';
    var doneHtml = done.length ? sec('Recent afgehandeld', done.length) + '<div class="ar-list ar-done">' + done.map(arDoneCard).join('') + '</div>' : '';
    page.innerHTML = '<div class="panel active">' + head + pendHtml + doneHtml + '</div>';
    $('ar-new').onclick = openShootReqForm;
    Array.prototype.forEach.call(page.querySelectorAll('.ar-accept'), function (b) { b.onclick = function () { respondReq(b.getAttribute('data-id'), 'accept', '', page); }; });
    Array.prototype.forEach.call(page.querySelectorAll('.ar-decline'), function (b) { b.onclick = function () { openDeclineForm(b.getAttribute('data-id'), page); }; });
  }
  var _respBusy = false;
  async function respondReq(id, actie, reden, page) {
    if (_respBusy) return; _respBusy = true;   // voorkom dubbele afhandeling bij snel/dubbel klikken
    toast(actie === 'accept' ? 'Inplannen…' : 'Versturen…');
    var r; try { r = await api('teamShootRequestRespond', { id: id, actie: actie, reden: reden || '' }); } catch (e) { r = null; }
    _respBusy = false;
    if (r && r.ok) toast(actie === 'accept' ? 'Geaccepteerd ✓, shoot staat in de planning' : 'Doorgegeven ✓');
    else toast(r && r.error === 'al_afgehandeld' ? 'Was al afgehandeld' : 'Mislukt');
    if (state.route === 'aanvragen') renderAanvragen($('page'));   // verse page-ref + guard tegen stale overschrijven
  }
  function openShootReqForm() {
    curProject = null;
    $('modal').innerHTML = '<div class="modal-head br-orange"><span class="bar"></span><div style="flex:1;min-width:0"><div class="sub">Buiten kantooruren</div><h2>Nieuwe shoot-aanvraag</h2></div><button class="modal-close" id="mclose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body"><div class="vl-grid">' +
      '<div class="field"><label>Datum</label><input type="date" id="ar-datum"></div>' +
      '<div class="field"><label>Klant / bedrijf</label><input type="text" id="ar-bedrijf" placeholder="Bv. Vorsselmans Solar" autocomplete="off"></div>' +
      '<div class="field"><label>Van</label><input type="time" id="ar-van" value="18:00"></div>' +
      '<div class="field"><label>Tot</label><input type="time" id="ar-tot" value="20:00"></div></div>' +
      '<div class="field" style="margin-top:12px"><label>Locatie</label><input type="text" id="ar-loc" placeholder="Adres of locatie van de shoot" autocomplete="off"></div>' +
      '<div class="field" style="margin-top:12px"><label>Toelichting</label><textarea id="ar-note" rows="3" placeholder="Wat moet er geschoten worden? Bijzonderheden?"></textarea></div>' +
      '<div class="field" style="margin-top:12px"><label>ClickUp-taak-ID <span style="color:var(--ink-4);font-weight:500">(optioneel, koppelt de aanvraag aan een bestaand shootproject)</span></label><input type="text" id="ar-task" placeholder="bv. 86ca7e612" autocomplete="off"></div>' +
      '<button class="btn btn-primary" id="ar-submit" style="margin-top:16px;width:100%">Aanvraag toevoegen</button></div>';
    $('mclose').onclick = closeModal; $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    var t = todayYmd(); $('ar-datum').min = t; $('ar-datum').value = t;
    $('ar-submit').onclick = async function () {
      var datum = $('ar-datum').value, van = $('ar-van').value;
      if (!datum || !van) { toast('Geef minstens een datum en starttijd.'); return; }
      this.disabled = true; this.textContent = 'Toevoegen…';
      var r; try { r = await api('teamShootRequestCreate', { datum_ymd: datum, van: van, tot: $('ar-tot').value, bedrijf: $('ar-bedrijf').value, locatie: $('ar-loc').value, opmerking: $('ar-note').value, task_id: $('ar-task').value.trim() }); } catch (e) { r = null; }
      if (r && r.ok) { toast('Aanvraag toegevoegd ✓'); closeModal(); if (state.route === 'aanvragen') renderAanvragen($('page')); }
      else { toast('Toevoegen mislukt'); this.disabled = false; this.textContent = 'Aanvraag toevoegen'; }
    };
  }
  function openDeclineForm(id, page) {
    curProject = null;
    $('modal').innerHTML = '<div class="modal-head br-pink"><span class="bar"></span><div style="flex:1;min-width:0"><div class="sub">Shoot-aanvraag</div><h2>Lukt het niet?</h2></div><button class="modal-close" id="mclose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body"><p class="micro" style="color:var(--ink-4);margin:0 0 12px">De klant krijgt een nette boodschap dat dit moment niet lukt en dat jullie samen een ander zoeken.</p>' +
      '<div class="field"><label>Reden (optioneel, kort)</label><textarea id="dc-reden" rows="3" placeholder="Bv. al een shoot op dat moment"></textarea></div>' +
      '<button class="btn btn-primary" id="dc-submit" style="margin-top:16px;width:100%">Doorgeven aan klant</button></div>';
    $('mclose').onclick = closeModal; $('scrim').classList.add('show'); document.body.style.overflow = 'hidden';
    $('dc-submit').onclick = function () { var reden = $('dc-reden').value; closeModal(); respondReq(id, 'decline', reden, page); };
  }

  function renderSoon(page, route) {
    var info = {
      aanvragen: ['⚡', 'Aanvragen buiten kantooruren', 'Klanten kunnen straks shoots/meetings buiten de standaarduren aanvragen. Hier zie je ze binnenkomen en geef je aan of je kan, de klant krijgt automatisch je antwoord.'],
      ai: ['✨', 'AI-dagplanning', 'Eén klik en de AI stelt de meest logische volgorde voor je dag voor, op basis van deadlines, tijdsinschattingen en je agenda.']
    }[route] || ['', 'Binnenkort', ''];
    page.innerHTML = '<div class="panel active"><div class="soon-card"><div class="ic">' + info[0] + '</div><h3>' + esc(info[1]) + '</h3><p>' + esc(info[2]) + '</p><span class="tag">Volgende golf</span></div></div>';
  }

  /* ---- sidebar mobiel ---- */
  function openSidebar() { $('sidebar').classList.add('open'); $('sbScrim').classList.add('show'); document.documentElement.classList.add('sb-open'); document.body.classList.add('sb-open'); }
  function closeSidebar() { $('sidebar').classList.remove('open'); $('sbScrim').classList.remove('show'); document.documentElement.classList.remove('sb-open'); document.body.classList.remove('sb-open'); }

  /* ---- boot ---- */
  function showLogin(err) { $('boot').style.display = 'none'; $('app').classList.remove('show'); $('login').style.display = 'flex'; $('login-err').textContent = err || ''; }
  async function boot() {
    // token-claims tonen (zo zien we exact wat de gateway beoordeelt)
    try {
      var _tk = await window.S27TeamAuth.token();
      if (!_tk) { diag('token: GEEN (geen sessie)'); }
      else {
        var _pl = JSON.parse(decodeURIComponent(atob(_tk.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')));
        var _now = Math.floor(Date.now() / 1000);
        diag('token: ' + (_pl.email || '?') + ' · ev=' + _pl.email_verified + ' · 2f=' + ((_pl.firebase || {}).sign_in_second_factor || '-') + ' · aud=' + _pl.aud + ' · iat' + (_pl.iat - _now >= 0 ? '+' : '') + (_pl.iat - _now) + 's · exp' + (_pl.exp - _now) + 's');
      }
    } catch (e) { diag('token-decode-fout: ' + ((e && e.message) || e)); }
    diag('boot: teamMe ophalen…');
    var d; try { d = await api('teamMe', {}); } catch (e) { diag('teamMe faalde: ' + ((e && e.message) || 'netwerk')); showLogin('Kon het teamportaal niet bereiken (' + ((e && e.message) || 'netwerk') + ').'); return; }
    if (!d.ok) {
      diag('teamMe → ok:false [' + (d.error || '?') + ']');
      $('boot').style.display = 'none'; $('login').style.display = 'flex'; $('app').classList.remove('show');
      $('login-err').textContent = (d.message || 'Geen teamtoegang.') + (d.error ? ' [' + d.error + ']' : '');
      // 'no_member' = ingelogd maar (nog) niet aan een ClickUp-teamlid gekoppeld → laat opnieuw inloggen toe
      $('btn-google').style.display = (d.error === 'no_member') ? '' : 'none';
      return;
    }
    diag('teamMe OK · rol ' + (d.role || '?') + ' → portaal laden');
    state.me = d.me; state.roster = d.roster || []; state.role = d.role || 'team'; state.perms = d.perms || { team: true };
    state.canImpersonate = !!d.can_impersonate; state.actingAs = d.acting_as || null;
    if (!state.actingAs && state.actAsMember) { state.actAsMember = ''; try { localStorage.removeItem('s27team_actas'); } catch (e) { } }   // zelf-herstel: verweesde 'bekijk als'-id opruimen
    $('live-name').textContent = voornaam(state.me.naam);
    var h = (location.hash || '').replace('#', '');
    if (routeExists(h)) state.route = h;
    else if (!routeExists(state.route)) state.route = 'home';            // route ongeldig voor deze rol → home
    $('boot').style.display = 'none'; $('login').style.display = 'none'; $('app').classList.add('show');
    renderNav(); renderImpersonateCtl(); render();
    loadAiCatalog();       // AI-acties-catalogus (per type job) klaarzetten voor de taakmodal
    maybeOpenDeepLink();   // #taak/<id> in de URL → open de taak direct (na auth)
  }

  window.addEventListener('DOMContentLoaded', function () {
    $('btn-google').onclick = function () { window.S27TeamAuth.google(); };
    var _be = $('btn-enroll'); if (_be) _be.onclick = function () { diag('2-staps instellen geklikt'); window.S27TeamAuth.enrollTotp(); };
    $('hamb').onclick = openSidebar; $('sbScrim').onclick = closeSidebar;
    var _fb = $('featBtn'); if (_fb) _fb.onclick = openFeature;
    $('scrim').addEventListener('mousedown', function (e) { if (e.target === $('scrim')) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if ($('scrim').classList.contains('show')) closeModal(); else closeSidebar(); } });
    window.addEventListener('hashchange', function () { var h = (location.hash || '').replace('#', ''); if (routeExists(h) && h !== state.route) { go(h); } });   // via go(): reset openstaande chats/popups + closeAiPop, niet enkel de route
    // deep-link / terug-knop: open de taak of sluit de modal bij history-navigatie
    window.addEventListener('popstate', function () {
      var dl = parseTaskHash(); var open = $('scrim').classList.contains('show');
      if (dl) { if (!curProject || !curProject.project || curProject.project.id !== dl.id) openProject(dl.id, null, { noPush: true }); }
      else if (open) { closeModal({ noHash: true }); }
    });
    wireSearch();

    window.S27TeamAuth.subscribe(function (e) {
      diag('auth-status: ' + e.phase + (e.email ? ' (' + e.email + ')' : '') + (e.error ? ' - ' + e.error : ''));
      if (e.phase === 'loading') { $('boot').style.display = 'flex'; }
      else if (e.phase === 'signed_out') { showLogin(e.error); }
      else if (e.phase === 'no_access') { showLogin('Dit account (' + (e.email || '') + ') hoort niet bij Studio 27. Gebruik je @studio27.be-account.'); }
      else if (e.phase === 'ready') { state.email = e.email || ''; $('boot').style.display = 'flex'; $('boot-msg').textContent = 'Teamportaal laden…'; boot(); }
    });
    window.S27TeamAuth.init({ gatewayBase: GATEWAY });
  });

  /* ---- Versie-bewaking: iedereen gegarandeerd op de nieuwste versie ---- */
  // Eigen versie zelf-detecterend uit de app.js-script-tag (?v=N), geen extra bump-plek.
  var APP_VERSION = (function () { try { var s = document.querySelector('script[src*="app.js?v="]'); var m = s && s.src.match(/[?&]v=(\d+)/); return m ? Number(m[1]) : 0; } catch (e) { return 0; } })();
  // Check bij boot, bij terugkeer naar de app (PWA!) en elke 5 min. Hoger servernummer = caches
  // leeg + harde herlaad. Loop-guard: max één poging per gepushte versie per sessie.
  async function checkTeamVersion() {
    if (!APP_VERSION) return;
    var now = Date.now();
    if (state._verLastCheck && (now - state._verLastCheck) < 45000) return;   // throttle
    state._verLastCheck = now;
    var v = 0;
    try { var r = await fetch(GATEWAY + '/teamversion', { cache: 'no-store' }); var d = await r.json(); v = Number(d && d.v) || 0; } catch (e) { return; }
    if (v > APP_VERSION) forceTeamUpdate(v);
  }
  async function forceTeamUpdate(target) {
    window._verTried = window._verTried || {};
    if (window._verTried[target]) return;
    window._verTried[target] = 1;
    var k = 's27team_verupd_' + target;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { }
    try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'FLUSH' }); } catch (e) { }
    try { var keys = await caches.keys(); await Promise.all(keys.map(function (x) { return caches.delete(x); })); } catch (e) { }
    try { var reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) { }
    setTimeout(function () { location.reload(); }, 350);
  }
  (function startVersionWatch() {
    setTimeout(checkTeamVersion, 4000);                                  // na de boot, niet blokkerend
    setInterval(checkTeamVersion, 300000);                              // elke 5 min
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') checkTeamVersion(); });
  })();
  // Admin-pushknop (footer): duw de versie van DEZE client als minimum naar alle teamleden.
  window.pushTeamVersion = async function (btn) {
    if (!APP_VERSION) { toast('Versienummer niet detecteerbaar.'); return; }
    if (!confirm('Versie ' + APP_VERSION + ' nu hard doorduwen naar alle teamleden? Iedereen herlaadt automatisch (open formulieren kunnen daarbij verloren gaan).')) return;
    var old = btn.innerHTML; btn.disabled = true; btn.textContent = 'Pushen…';
    var r; try { r = await api('teamVersionPush', { version: APP_VERSION }); } catch (e) { r = null; }
    btn.disabled = false; btn.innerHTML = old;
    toast((r && r.message) || ((r && r.ok) ? 'Versie gepusht.' : 'Pushen lukte niet, probeer zo opnieuw.'));
  };

  if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js?v=' + (APP_VERSION || '1')).catch(function () { }); }); }
})();
