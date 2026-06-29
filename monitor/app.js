/* ============================================================
   Studio 27 — Automatisatie-monitoring (s27-monitor)
   Eén scherm: live health van elke connectie + AI-duiding.
   Hergebruikt de gateway-backend + Firebase-auth (admin-only).
   ============================================================ */
(function () {
  'use strict';
  var GATEWAY = (window.S27MON && window.S27MON.GATEWAY) || '';
  var PREVIEW = /[?&](preview|demo)=1/.test(location.search);
  var $ = function (id) { return document.getElementById(id); };

  var S = { ready: false, phase: 'loading', email: '', noaccess: false, items: null, checkedAt: 0, history: [], aiText: '', loading: false, rechecking: false };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var _it = null;
  function refreshIcons() { clearTimeout(_it); _it = setTimeout(function () { try { window.lucide && window.lucide.createIcons(); } catch (e) {} }, 30); }
  function ic(name, sz, extra) { return '<i data-lucide="' + name + '" style="font-size:' + (sz || 16) + 'px;' + (extra || '') + '"></i>'; }
  function toast(msg) { var t = $('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function relTime(ms) { if (!ms) return ''; var s = Math.floor((Date.now() - ms) / 1000); if (s < 50) return 'zonet'; if (s < 3600) return Math.floor(s / 60) + ' min geleden'; if (s < 86400) return Math.floor(s / 3600) + ' u geleden'; var d = new Date(ms); return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  var ICON = { clickup: 'list-checks', webflow: 'globe', meta: 'share-2', google: 'mail', metricool: 'megaphone', anthropic: 'sparkles', firebase: 'shield-check' };
  function stMeta(s) {
    if (s === 'ok') return { label: 'Actief', bg: '#F4FBDB', fg: '#4A6B0E', dot: '#4A6B0E' };
    if (s === 'degraded') return { label: 'Traag', bg: '#FBF1D9', fg: '#6B4D04', dot: '#C99410' };
    if (s === 'down') return { label: 'Offline', bg: '#F7E0DB', fg: '#6E2218', dot: '#B83A2A' };
    if (s === 'timeout') return { label: 'Time-out', bg: '#F7E0DB', fg: '#6E2218', dot: '#B83A2A' };
    return { label: 'Onbekend', bg: '#EFEADD', fg: '#8E8979', dot: '#C4BEAC' };
  }

  async function api(endpoint, body, opts) {
    var t = await window.S27TeamAuth.token();
    if (!t) throw new Error('Niet ingelogd.');
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, (opts && opts.timeout) || 30000) : null;
    var res;
    try { res = await fetch(GATEWAY + '/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body || {}), signal: ctrl ? ctrl.signal : undefined }); }
    catch (e) { if (timer) clearTimeout(timer); if (e && e.name === 'AbortError') { var te = new Error('De server reageerde niet op tijd.'); te.timeout = true; throw te; } throw e; }
    if (timer) clearTimeout(timer);
    if (res.status === 401) { try { window.S27TeamAuth.logout(); } catch (e) {} throw new Error('Sessie verlopen.'); }
    var txt = await res.text(); var data; try { data = JSON.parse(txt); } catch (e) { data = { _raw: txt }; }
    return data;
  }

  /* ---------- mock (preview) ---------- */
  function mockItems() {
    return [
      { id: 'clickup', name: 'ClickUp', cat: 'Taken & CRM', status: 'ok', http: 200, detail: '', latency_ms: 220 },
      { id: 'webflow', name: 'Webflow', cat: 'Website & vacatures', status: 'ok', http: 200, detail: '', latency_ms: 360 },
      { id: 'meta', name: 'Meta (Facebook/Instagram)', cat: 'Advertenties', status: 'degraded', http: 200, detail: '', latency_ms: 5400 },
      { id: 'google', name: 'Google (Gmail/Agenda/GA4)', cat: 'Google-werkruimte', status: 'ok', http: 200, detail: '', latency_ms: 190 },
      { id: 'metricool', name: 'Metricool', cat: 'Social planning', status: 'down', http: 401, detail: 'token geweigerd', latency_ms: 410 },
      { id: 'anthropic', name: 'Claude (AI)', cat: 'AI-engine', status: 'ok', http: 200, detail: '', latency_ms: 2000 },
      { id: 'firebase', name: 'Firebase Auth (login)', cat: 'Authenticatie', status: 'ok', http: 200, detail: '', latency_ms: 60 },
    ];
  }
  function mockHist() { var h = []; for (var i = 12; i >= 0; i--) h.push({ t: Date.now() - i * 3600000, ok: 6, down: i === 3 ? 1 : 0, degraded: 1, unknown: 0 }); return h; }

  /* ---------- login ---------- */
  function renderLogin() {
    var loading = S.phase === 'loading';
    var btnLabel = loading ? 'Even geduld…' : (S.noaccess ? 'Andere account proberen' : 'Inloggen met Google');
    return '<div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(1200px 600px at 50% -10%,rgba(36,88,234,.12),transparent),var(--paper);">' +
      '<div style="width:min(440px,100%);background:var(--ink);color:var(--paper);border-radius:28px;padding:40px 34px;box-shadow:0 40px 90px -30px rgba(5,10,48,.6);">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:26px;"><img src="assets/Icon-pos.svg" style="height:30px;" alt="27"><span style="font-size:22px;font-weight:600;letter-spacing:.01em;">Monitoring</span></div>' +
        '<h1 style="font-size:27px;font-weight:300;line-height:1.2;letter-spacing:-.02em;margin:0 0 10px;">De automatisatie-achterkant, in één oogopslag.</h1>' +
        '<p style="font-size:14px;color:rgba(247,243,234,.66);margin:0 0 26px;line-height:1.5;">Live status van elke connectie. Enkel voor de zaakvoerder.</p>' +
        (S.noaccess ? '<div style="background:rgba(184,58,42,.18);border:1px solid rgba(184,58,42,.5);color:#F7E0DB;font-size:13px;border-radius:12px;padding:11px 14px;margin-bottom:18px;">Geen toegang met dit account. Enkel een @studio27.be-zaakvoerdersaccount kan hier binnen.</div>' : '') +
        '<button data-act="login" ' + (loading ? 'disabled' : '') + ' style="width:100%;font-family:inherit;font-weight:600;font-size:16px;background:#D1F24C;color:#050A30;border:none;border-radius:14px;padding:9px 9px 9px 22px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' + esc(btnLabel) + '<span style="width:36px;height:36px;border-radius:10px;background:#050A30;color:#fff;display:grid;place-items:center;">' + ic('arrow-right', 18) + '</span></button>' +
      '</div></div>';
  }

  /* ---------- dashboard ---------- */
  function overall() {
    var it = S.items || [];
    var cnt = function (s) { return it.filter(function (i) { return i.status === s; }).length; };
    var down = cnt('down') + cnt('timeout'), degr = cnt('degraded'), ok = cnt('ok'), unk = cnt('unknown');
    var tone = down ? { bg: '#B83A2A', sub: down + ' connectie' + (down > 1 ? 's' : '') + ' offline' } : (degr ? { bg: '#C99410', sub: degr + ' connectie' + (degr > 1 ? 's' : '') + ' traag' } : { bg: '#0F2EA3', sub: 'Alles draait normaal' });
    return { down: down, degr: degr, ok: ok, unk: unk, total: it.length, tone: tone };
  }
  function renderHistory() {
    var h = S.history || []; if (!h.length) return '';
    var max = 1; h.forEach(function (p) { max = Math.max(max, (p.ok || 0) + (p.down || 0) + (p.degraded || 0) + (p.unknown || 0)); });
    var bars = h.slice(-36).map(function (p) {
      var tot = (p.ok || 0) + (p.down || 0) + (p.degraded || 0) + (p.unknown || 0) || 1;
      var col = (p.down || 0) > 0 ? '#B83A2A' : ((p.degraded || 0) > 0 ? '#C99410' : '#4A6B0E');
      var hgt = Math.max(10, Math.round((p.ok || 0) / tot * 100));
      return '<div title="' + relTime(p.t) + '" style="flex:1;min-width:3px;height:34px;display:flex;align-items:flex-end;"><div style="width:100%;height:' + hgt + '%;background:' + col + ';border-radius:2px;opacity:.85;"></div></div>';
    }).join('');
    return '<div style="background:#FFFDF8;border-radius:18px;padding:16px 18px;box-shadow:var(--shadow-card);"><div style="font-size:12px;font-weight:600;color:#5E5A4F;margin-bottom:10px;">Historiek (laatste checks)</div><div style="display:flex;align-items:flex-end;gap:2px;">' + bars + '</div></div>';
  }
  function renderDash() {
    if (S.items == null) return '<div style="display:grid;place-items:center;padding:90px;"><div class="hr-spin"></div></div>';
    var o = overall();
    var cards = (S.items || []).map(function (i) {
      var m = stMeta(i.status); var icon = ICON[i.id] || 'plug';
      return '<div style="background:#FFFDF8;border-radius:18px;padding:18px 20px;box-shadow:var(--shadow-card);border-left:4px solid ' + m.dot + ';">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;"><span style="width:42px;height:42px;border-radius:11px;background:#F7F3EA;color:#050A30;display:grid;place-items:center;">' + ic(icon, 21) + '</span><span style="font-size:11.5px;font-weight:600;color:' + m.fg + ';background:' + m.bg + ';padding:4px 11px;border-radius:99px;display:inline-flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;border-radius:50%;background:' + m.dot + ';"></span>' + m.label + '</span></div>' +
        '<div style="font-size:15.5px;font-weight:600;">' + esc(i.name) + '</div><div style="font-size:12.5px;color:#8E8979;margin-top:2px;">' + esc(i.cat) + '</div>' +
        '<div style="display:flex;gap:14px;margin-top:12px;font-size:12px;color:#8E8979;">' + (i.latency_ms ? '<span style="display:inline-flex;align-items:center;gap:5px;">' + ic('gauge', 13) + i.latency_ms + ' ms</span>' : '') + (i.http ? '<span style="display:inline-flex;align-items:center;gap:5px;">' + ic('arrow-left-right', 13) + 'HTTP ' + i.http + '</span>' : '') + '</div>' +
        (i.detail ? '<div style="font-size:12px;margin-top:8px;border-radius:8px;padding:6px 10px;' + ((i.status === 'down' || i.status === 'timeout') ? 'color:#6E2218;background:#F7E0DB;' : 'color:#5E5A4F;background:#F7F3EA;') + '">' + esc(i.detail) + '</div>' : '') +
      '</div>';
    }).join('');
    var aiBanner = '<div style="background:#050A30;border-radius:24px;padding:22px 26px;color:#F7F3EA;display:flex;gap:16px;align-items:flex-start;">' +
      '<span style="width:40px;height:40px;border-radius:11px;background:#D1F24C;color:#0F2EA3;display:grid;place-items:center;flex:none;">' + ic('sparkles', 20) + '</span>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:12px;letter-spacing:.06em;font-weight:600;color:#28AFF9;margin-bottom:5px;">AI-bewaker</div><div style="font-size:15px;line-height:1.5;color:#F7F3EA;">' + (S.aiText ? esc(S.aiText) : '<span style="color:rgba(247,243,234,.5);">De AI bekijkt de status…</span>') + '</div></div></div>';
    var statusBar = '<div style="background:' + o.tone.bg + ';border-radius:20px;padding:18px 24px;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">' +
      '<div style="display:flex;align-items:center;gap:13px;"><span style="width:14px;height:14px;border-radius:50%;background:#fff;' + (o.down ? 'animation:hrPulse 1.4s infinite;' : '') + '"></span><div><div style="font-size:19px;font-weight:500;">' + esc(o.tone.sub) + '</div><div style="font-size:12.5px;color:rgba(255,255,255,.75);">' + o.ok + '/' + o.total + ' gezond' + (o.unk ? ' · ' + o.unk + ' onbekend' : '') + ' · gecontroleerd ' + esc(relTime(S.checkedAt)) + '</div></div></div>' +
      '<button data-act="recheck" ' + (S.rechecking ? 'disabled' : '') + ' style="font-family:inherit;font-size:14px;font-weight:600;background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:12px;padding:9px 16px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;">' + ic(S.rechecking ? 'loader' : 'refresh-cw', 16) + (S.rechecking ? 'Bezig…' : 'Nu opnieuw checken') + '</button></div>';
    return '<div class="scr" style="max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:16px;">' +
      '<div style="margin-bottom:2px;"><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:#5E5A4F;margin-bottom:8px;">Automatisatie-monitoring</div><h1 style="font-size:34px;font-weight:300;letter-spacing:-.02em;margin:0;">Status van je connecties</h1></div>' +
      statusBar + aiBanner +
      '<div style="display:grid;grid-template-columns:' + (window.innerWidth < 720 ? '1fr' : window.innerWidth < 1080 ? '1fr 1fr' : '1fr 1fr 1fr') + ';gap:14px;">' + cards + '</div>' +
      renderHistory() + '</div>';
  }

  function renderHeader() {
    return '<header style="position:sticky;top:0;z-index:40;background:#050A30;color:#F7F3EA;padding:14px 22px;display:flex;align-items:center;gap:14px;">' +
      '<div style="display:flex;align-items:center;gap:9px;flex:1;"><img src="assets/Icon-pos.svg" style="height:24px;" alt="27"><span style="font-size:20px;font-weight:600;">Monitoring</span>' + (PREVIEW ? '<span style="font-size:11px;font-weight:700;background:#D1F24C;color:#050A30;padding:3px 9px;border-radius:99px;margin-left:6px;">VOORBEELD</span>' : '') + '</div>' +
      '<button data-act="logout" title="Uitloggen" style="width:38px;height:38px;border-radius:10px;background:rgba(247,243,234,.08);border:none;color:#F7F3EA;cursor:pointer;display:grid;place-items:center;">' + ic('log-out', 18) + '</button>' +
      '</header>';
  }
  function render() {
    var root = $('mon-root'); if (!root) return;
    if (!S.ready) { root.innerHTML = renderLogin(); bind(root); refreshIcons(); return; }
    root.innerHTML = '<div style="min-height:100vh;display:flex;flex-direction:column;">' + renderHeader() + '<main style="flex:1;padding:' + (window.innerWidth < 720 ? '20px 14px 40px' : '30px 26px 56px') + ';">' + renderDash() + '</main></div>';
    bind(root); refreshIcons();
  }
  function bind(root) {
    root.onclick = function (e) {
      var el = e.target.closest && e.target.closest('[data-act]'); if (!el) return;
      var act = el.getAttribute('data-act');
      if (act === 'login') { e.preventDefault(); window.S27TeamAuth.google().catch(function () { toast('Inloggen mislukt, probeer opnieuw.'); }); return; }
      if (act === 'logout') { e.preventDefault(); if (PREVIEW) { toast('Voorbeeldmodus'); return; } window.S27TeamAuth.logout(); return; }
      if (act === 'recheck') { e.preventDefault(); recheck(); return; }
    };
  }

  /* ---------- data ---------- */
  async function loadStatus() {
    if (PREVIEW) { S.items = mockItems(); S.checkedAt = Date.now(); S.history = mockHist(); S.aiText = 'Eén connectie ligt eruit: Metricool weigert de token (401). Vernieuw de Metricool-API-sleutel. Meta reageert traag (5,4s) maar werkt. De rest draait normaal.'; render(); return; }
    if (S.loading) return; S.loading = true; render();
    try { var r = await api('teamMonitorStatus', {}, { timeout: 40000 }); if (r && r.ok) { S.items = r.items || []; S.checkedAt = r.checked_at || Date.now(); S.history = r.history || []; } else { S.items = []; toast((r && r.message) || 'Kon de status niet laden.'); } }
    catch (e) { S.items = []; toast(e.timeout ? 'De checks duurden te lang, probeer opnieuw.' : 'Kon de status niet laden.'); }
    S.loading = false; render();
    loadAi();
  }
  async function recheck() {
    if (S.rechecking) return; S.rechecking = true; render();
    if (PREVIEW) { setTimeout(function () { S.rechecking = false; S.checkedAt = Date.now(); render(); toast('Opnieuw gecontroleerd (voorbeeld)'); }, 900); return; }
    try { var r = await api('teamMonitorRecheck', {}, { timeout: 40000 }); if (r && r.ok) { S.items = r.items || S.items; S.checkedAt = r.checked_at || Date.now(); toast('Connecties opnieuw gecontroleerd ✓'); } else toast('Hercheck mislukt.'); }
    catch (e) { toast(e.timeout ? 'De checks duurden te lang.' : 'Hercheck mislukt.'); }
    S.rechecking = false; render();
    loadAi();
  }
  async function loadAi() {
    if (PREVIEW) return;
    try { var r = await api('teamMonitorAi', {}, { timeout: 40000 }); if (r && r.ok && r.tekst) { S.aiText = r.tekst; render(); } } catch (e) { /* AI optioneel */ }
  }

  /* ---------- boot ---------- */
  function start() {
    window.addEventListener('resize', function () { if (S.ready) render(); });
    if (PREVIEW) { S.ready = true; S.phase = 'ready'; S.email = 'preview'; loadStatus(); return; }
    window.S27TeamAuth.init({ gatewayBase: GATEWAY });
    window.S27TeamAuth.subscribe(function (st) {
      S.phase = st.phase; S.email = st.email || '';
      if (st.phase === 'ready') { S.ready = true; S.noaccess = false; if (S.items == null) loadStatus(); else render(); }
      else if (st.phase === 'no_access') { S.ready = false; S.noaccess = true; render(); }
      else { S.ready = false; S.noaccess = false; render(); }
    });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
