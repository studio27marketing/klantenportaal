/* HR Orchestratie Platform — frontend (vanilla, 27 Automations-huisstijl).
 * 1-op-1 port van de Claude-design, met echte data uit de Cloudflare D1-database via de gateway.
 * Fase 0: shell + login + chrome. Fase 1: Kandidaten-pipeline + kandidaat-detail. */
(function () {
  'use strict';
  var GATEWAY = (window.S27HR && window.S27HR.GATEWAY) || 'https://s27-portal-gateway-v2.studio27marketing.workers.dev';
  // PREVIEW-modus (?preview=1 of ?demo=1): slaat de login over en toont alles met VOORBEELDDATA.
  // Raakt nooit echte data of de gateway aan. Bedoeld voor visuele opbouw/afwerking en deelbare previews.
  var PREVIEW = false; try { PREVIEW = /[?&](preview|demo)=1/.test(location.search || ''); } catch (e) {}
  var $ = function (id) { return document.getElementById(id); };
  var MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  var DOW = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

  var S = {
    ready: false, phase: 'loading', email: '', noaccess: false,
    screen: 'dashboard', candId: '', q: '', jobFilter: 'all',
    candidates: null, statussen: [], loadingCands: false,
    jobs: null, jobsErr: '', loadingJobs: false, wiz: null,
    obPeople: null, obDone: {}, obPersonId: '', loadingOb: false,
    agendaView: 'week', agendaAnchorMs: 0, agendaDay: 0, agendaEvents: null, loadingAgenda: false,
    integrations: null, connectedCount: 0, roster: null, reviewerRoles: {}, me: null, isAdmin: false, loadingInst: false,
    hrTone: null, hrToneDefault: '',
    navOpen: false, notifsOpen: false, copilotOpen: false,
    notifs: null, notifCount: 0, notifMailbox: '', notifBusy: false,
    asstMsgs: [], asstModel: '', asstModels: null, asstBusy: false,
    vw: window.innerWidth, modal: null, busy: '',
  };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var _iconT = null;
  function refreshIcons() { clearTimeout(_iconT); _iconT = setTimeout(function () { try { window.lucide && window.lucide.createIcons(); } catch (e) {} }, 30); }
  function ic(name, sz, extra) { return '<i data-lucide="' + name + '" style="font-size:' + (sz || 16) + 'px;' + (extra || '') + '"></i>'; }
  function initials(n) { n = String(n || '').trim(); if (!n) return '?'; var p = n.split(/\s+/); return ((p[0][0] || '') + (p.length > 1 ? (p[p.length - 1][0] || '') : '')).toUpperCase(); }
  function scoreCol(n) { n = Number(n) || 0; return n >= 70 ? '#4A6B0E' : n >= 50 ? '#C99410' : n > 0 ? '#B83A2A' : '#8E8979'; }
  function fmtDate(ms) { if (!ms) return ''; var d = new Date(Number(ms)); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function fmtDateTime(ms) { if (!ms) return ''; var d = new Date(Number(ms)); var hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0'); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' · ' + hh + ':' + mm; }
  function isMobile() { return S.vw < 720; } function isNarrow() { return S.vw < 1080; }

  function toast(msg) { var t = $('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2600); }

  async function api(endpoint, body, opts) {
    var t = await window.S27TeamAuth.token();
    if (!t) throw new Error('Niet ingelogd.');
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, (opts && opts.timeout) || 30000) : null;
    var res;
    try { res = await fetch(GATEWAY + '/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body || {}), signal: ctrl ? ctrl.signal : undefined }); }
    catch (e) { if (timer) clearTimeout(timer); if (e && e.name === 'AbortError') { var te = new Error('De server reageerde niet op tijd.'); te.timeout = true; throw te; } throw e; }
    if (timer) clearTimeout(timer);
    var txt = await res.text(); var data; try { data = JSON.parse(txt); } catch (e) { data = { _raw: txt }; }
    if (res.status === 401) { window.S27TeamAuth.logout(); throw new Error('Sessie verlopen.'); }
    return data;
  }

  /* ---------- pipeline-stages (status → 5 design-kolommen) ---------- */
  var STAGES = [
    { key: 'nieuw', label: 'Nieuw binnen', color: '#28AFF9' },
    { key: 'screening', label: 'AI-screening', color: '#2458EA' },
    { key: 'gesprek', label: 'Gesprek', color: '#0F2EA3' },
    { key: 'assessment', label: 'Assessment', color: '#C99410' },
    { key: 'aanbod', label: 'Aanbod', color: '#4A6B0E' },
  ];
  function stageOf(it) {
    var s = (it.status_raw || it.status || '').toLowerCase();
    if (/aanbod|aangenomen|aanwerv|contract|besluit|hired|in dienst/.test(s)) return 'aanbod';
    if (/assessment|case|hard.?case|opdracht|proef|test/.test(s)) return 'assessment';
    if (/gesprek|interview|kennismaking|communicat|gepland|meeting/.test(s)) return 'gesprek';
    if (/screening|beoordel|review|analyse|in behandeling/.test(s)) return 'screening';
    return 'nieuw';
  }
  // Statusnaam die het best bij een design-stage past (voor drag-drop).
  function statusForStage(key) {
    var rx = { nieuw: /binnen|nieuw|kandidaat|to.?do/i, screening: /screening|beoordel|review|analyse/i, gesprek: /gesprek|interview|kennismaking|communicat/i, assessment: /assessment|case|opdracht|proef/i, aanbod: /aanbod|aangenomen|aanwerv|contract|besluit/i };
    var m = (S.statussen || []).filter(function (st) { return rx[key] && rx[key].test(st.status || ''); })[0];
    return m ? m.status : '';
  }
  function srcMeta(it) {
    var h = ((it.kanaal || '') + ' ' + (it.herkomst || '') + ' ' + (it.type || '')).toLowerCase();
    if (/instagram|insta/.test(h)) return { icon: 'instagram', label: 'Instagram' };
    if (/linkedin/.test(h)) return { icon: 'linkedin', label: 'LinkedIn' };
    if (/vdab/.test(h)) return { icon: 'building-2', label: 'VDAB' };
    if (/mail|spontaan|direct/.test(h)) return { icon: 'mail', label: 'Directe mail' };
    if (/website|formulier|webflow|studio27/.test(h)) return { icon: 'globe', label: 'Website' };
    return { icon: 'radio', label: it.type === 'stage' ? 'Stage-aanvraag' : it.type === 'spontaan' ? 'Spontaan' : 'Sollicitatie' };
  }

  /* ---------- preview-voorbeelddata (uit de design-mock) ---------- */
  var STAGE_STATUS = { nieuw: 'Nieuw binnen', screening: 'AI-screening', gesprek: 'Gesprek gepland', assessment: 'Assessment', aanbod: 'Aanbod' };
  var MOCK_STATUSSEN = STAGES.map(function (s) { return { status: STAGE_STATUS[s.key], color: s.color, type: 'custom' }; });
  var MOCK_RAW = [
    ['Sofie Maes', 'Senior Software Engineer', 'gesprek', 94, 'Herentals', 'LinkedIn'],
    ['Karim Belkaïd', 'Field Service Technicus', 'assessment', 88, 'Turnhout', 'VDAB'],
    ['Jens De Backer', 'Account Manager', 'aanbod', 91, 'Antwerpen', 'LinkedIn'],
    ['Lotte Vermeulen', 'Marketing Content Specialist', 'gesprek', 86, 'Geel', 'Eigen website'],
    ['Ahmed Yilmaz', 'Customer Support', 'screening', 79, 'Mol', 'VDAB'],
    ['Emma Peeters', 'Senior Software Engineer', 'screening', 82, 'Geel', 'Indeed'],
    ['Thomas Claes', 'Senior Software Engineer', 'nieuw', 74, 'Mol', 'LinkedIn'],
    ['Nadia Saidi', 'Customer Support', 'nieuw', 71, 'Geel', 'Eigen website'],
    ['Wout Janssens', 'Account Manager', 'gesprek', 80, 'Lier', 'Jobat'],
    ['Marie Dubois', 'Marketing Content Specialist', 'screening', 77, 'Antwerpen', 'LinkedIn'],
    ['Robbe Smets', 'Field Service Technicus', 'nieuw', 68, 'Geel', 'Indeed'],
    ['Fatima El Amrani', 'Customer Support', 'assessment', 84, 'Mol', 'VDAB'],
  ];
  function mockCandidates() {
    return MOCK_RAW.map(function (r, i) {
      var naam = r[0], vac = r[1], stage = r[2], score = r[3], loc = r[4], src = r[5];
      var vn = naam.split(' ')[0];
      return {
        id: 'demo' + (i + 1), naam: naam, voornaam: vn, vacature: vac, woonplaats: loc,
        email: vn.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '') + '@voorbeeld.be', telefoon: '04xx xx xx xx',
        type: 'sollicitatie', kanaal: src, herkomst: src, spam: false, cv_url: '#', ts: Date.now() - (i + 1) * 86400000,
        status: STAGE_STATUS[stage], status_raw: STAGE_STATUS[stage],
        ai: { score: score, samenvatting: score + '% match met ' + vac + '. ' + naam + ' woont in ' + loc + ' en heeft een sterk, relevant profiel met duidelijke motivatie.', sterktes: ['Achtergrond past sterk bij ' + vac, 'Heldere, gestructureerde communicatie', 'Aantoonbare relevante ervaring'], aandachtspunten: score < 80 ? ['Beschikbaarheid pas vanaf volgende maand'] : [], oordeel: score >= 85 ? 'Sterke kandidaat, plan zeker een gesprek in.' : 'Degelijk profiel, het bekijken waard.' },
      };
    });
  }

  /* ========================================================================
   * LOGIN
   * ====================================================================== */
  function renderLogin() {
    var aside = isNarrow() ? 'none' : 'flex';
    var cols = isNarrow() ? '1fr' : '1.05fr 1fr';
    var sub = S.noaccess
      ? '<p style="font-size:14px;color:#B83A2A;margin:0 0 26px;font-weight:500;">Dit account heeft geen toegang tot het HR-portaal. Vraag de zaakvoerder om toegang.</p>'
      : '<p style="font-size:14px;color:#5E5A4F;margin:0 0 30px;">Log in met je Studio 27-account.</p>';
    var btnLabel = S.phase === 'loading' ? 'Laden…' : 'Inloggen met Google';
    return '<div style="min-height:100vh;background:#050A30;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden;">' +
      '<div style="position:relative;width:100%;max-width:1040px;display:grid;grid-template-columns:' + cols + ';gap:0;border-radius:40px;overflow:hidden;box-shadow:0 40px 80px -24px rgba(0,0,0,.5);">' +
        '<div style="background:#0F2EA3;padding:56px 52px;flex-direction:column;justify-content:space-between;min-height:560px;position:relative;overflow:hidden;display:' + aside + ';">' +
          '<img src="assets/Icon-solid-white.svg" style="width:52px;opacity:.95;" alt="27">' +
          '<div style="position:relative;">' +
            '<div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:#28AFF9;margin-bottom:18px;">HR Orchestratie</div>' +
            '<h1 style="font-size:46px;line-height:1.05;letter-spacing:-.02em;font-weight:300;color:#F7F3EA;margin:0 0 20px;">werven die<br>zichzelf<br>opvolgt.</h1>' +
            '<p style="font-size:17px;line-height:1.5;color:rgba(247,243,234,.78);max-width:38ch;font-weight:300;">Vacatures, kandidaten en gesprekken op één plek, met AI die het routinewerk overneemt. Op zijn Kempisch.</p>' +
          '</div>' +
          '<div style="display:flex;gap:8px;align-items:center;font-size:13px;color:rgba(247,243,234,.6);"><span style="width:7px;height:7px;border-radius:50%;background:#D1F24C;"></span>part of 27 automations</div>' +
          '<img src="assets/Pipe-divider-warmwhite.svg" style="position:absolute;left:40%;top:30%;width:140%;opacity:.10;pointer-events:none;" alt="">' +
        '</div>' +
        '<div style="background:#FFFDF8;padding:56px 48px;display:flex;flex-direction:column;justify-content:center;">' +
          '<h2 style="font-size:26px;font-weight:500;letter-spacing:-.01em;margin:0 0 6px;">Welkom terug</h2>' + sub +
          '<button data-act="login" ' + (S.phase === 'loading' ? 'disabled' : '') + ' style="width:100%;font-family:inherit;font-weight:600;font-size:16px;background:#D1F24C;color:#050A30;border:none;border-radius:14px;padding:9px 9px 9px 22px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' + esc(btnLabel) + '<span style="width:36px;height:36px;border-radius:10px;background:#050A30;color:#fff;display:grid;place-items:center;">' + ic('arrow-right', 18) + '</span></button>' +
          '<div style="font-size:12px;color:#8E8979;margin-top:18px;">Alleen voor medewerkers van Studio 27. Toegang verloopt via je Google-werkaccount.</div>' +
        '</div>' +
      '</div></div>';
  }

  /* ========================================================================
   * CHROME (header + nav + drawers)
   * ====================================================================== */
  var NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { key: 'vacatures', label: 'Vacatures', icon: 'briefcase' },
    { key: 'kandidaten', label: 'Kandidaten', icon: 'users' },
    { key: 'onboarding', label: 'Onboarding', icon: 'handshake' },
    { key: 'selectie', label: 'Mijn agenda', icon: 'calendar-days' },
    { key: 'automatiseringen', label: 'Automatiseringen', icon: 'workflow' },
  ];
  function navActiveKey() {
    if (S.screen === 'kandidaat') return 'kandidaten';
    if (S.screen === 'nieuwe-vacature') return 'vacatures';
    return S.screen;
  }
  function renderHeader() {
    var act = navActiveKey();
    var inline = !isNarrow();
    var navBtns = NAV.map(function (n) {
      var on = n.key === act;
      return '<button class="hov-nav" data-act="go" data-arg="' + n.key + '" style="font-family:inherit;font-size:14px;font-weight:' + (on ? 600 : 400) + ';color:' + (on ? '#050A30' : 'rgba(247,243,234,.8)') + ';background:' + (on ? '#D1F24C' : 'transparent') + ';border:none;border-radius:10px;padding:9px 15px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .18s;white-space:nowrap;">' + ic(n.icon, 16) + n.label + '</button>';
    }).join('');
    return '<header style="position:sticky;top:0;z-index:40;background:#050A30;color:#F7F3EA;padding:0 ' + (isMobile() ? '14px' : '22px') + ';height:66px;display:flex;align-items:center;gap:' + (inline ? '18px' : '10px') + ';box-shadow:0 2px 20px -8px rgba(5,10,48,.5);">' +
      '<button data-act="toggleNav" style="display:' + (inline ? 'none' : 'grid') + ';width:38px;height:38px;border-radius:10px;background:rgba(247,243,234,.08);border:none;color:#F7F3EA;cursor:pointer;place-items:center;flex:none;">' + ic('menu', 20) + '</button>' +
      '<a href="#/dashboard" data-act="go" data-arg="dashboard" style="display:flex;align-items:center;gap:9px;text-decoration:none;cursor:pointer;flex:none;"><img src="assets/Icon-pos.svg" style="height:26px;" alt="27"><span style="font-family:Outfit,sans-serif;font-size:23px;font-weight:600;letter-spacing:.01em;color:#F7F3EA;line-height:1;">HR</span></a>' +
      '<div style="display:' + (inline ? 'block' : 'none') + ';width:1px;height:26px;background:rgba(247,243,234,.16);"></div>' +
      '<nav style="display:' + (inline ? 'flex' : 'none') + ';gap:4px;">' + navBtns + '</nav>' +
      '<div style="margin-left:auto;display:flex;align-items:center;gap:10px;">' +
        (PREVIEW ? '<span style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:#D1F24C;color:#050A30;border-radius:99px;padding:5px 11px;">Voorbeeld</span>' : '') +
        '<button data-act="toggleNotifs" title="Notificaties" style="width:38px;height:38px;border-radius:10px;background:' + (S.notifsOpen ? '#D1F24C' : 'rgba(247,243,234,.08)') + ';border:none;color:' + (S.notifsOpen ? '#050A30' : '#F7F3EA') + ';cursor:pointer;display:grid;place-items:center;position:relative;flex:none;">' + ic('bell', 18) + (S.notifCount > 0 ? '<span style="position:absolute;top:-3px;right:-3px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#E5484D;color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center;box-shadow:0 0 0 2px #050A30;">' + (S.notifCount > 9 ? '9+' : S.notifCount) + '</span>' : '') + '</button>' +
        '<button data-act="toggleCopilot" style="font-family:inherit;background:' + (S.copilotOpen ? '#28AFF9' : 'rgba(40,175,249,.14)') + ';color:' + (S.copilotOpen ? '#050A30' : '#28AFF9') + ';border:1px solid rgba(40,175,249,.4);border-radius:10px;width:38px;height:38px;cursor:pointer;display:grid;place-items:center;flex:none;">' + ic('sparkles', 18) + '</button>' +
        '<button data-act="go" data-arg="instellingen" style="width:38px;height:38px;border-radius:10px;background:rgba(247,243,234,.08);border:none;color:#F7F3EA;cursor:pointer;display:grid;place-items:center;flex:none;">' + ic('user-round', 18) + '</button>' +
      '</div></header>' +
      (inline || !S.navOpen ? '' :
        '<nav style="display:flex;flex-direction:column;gap:4px;position:sticky;top:66px;z-index:39;background:#050A30;padding:8px 16px 16px;box-shadow:0 12px 24px -12px rgba(5,10,48,.5);">' +
          NAV.map(function (n) { var on = n.key === act; return '<button data-act="go" data-arg="' + n.key + '" style="font-family:inherit;font-size:15px;font-weight:' + (on ? 600 : 400) + ';color:' + (on ? '#050A30' : 'rgba(247,243,234,.8)') + ';background:' + (on ? '#D1F24C' : 'transparent') + ';border:none;border-radius:11px;padding:13px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;text-align:left;">' + ic(n.icon, 18) + n.label + '</button>'; }).join('') +
        '</nav>');
  }
  var ASST_CHIPS = ['Wie heeft de hoogste AI-matchscore?', 'Vat het CV van Doriano van de Weyer samen', 'Stel een uitnodigingsmail op voor een gesprek met Doriano van de Weyer', 'Zet Doriano van de Weyer op de fase gesprek'];
  function modelDropdown() {
    if (S.asstModels == null) return '<select id="asst-model" disabled style="font-family:inherit;font-size:12.5px;border:1px solid #DFD9C8;border-radius:9px;padding:5px 8px;background:#fff;color:#5E5A4F;"><option>laden…</option></select>';
    var provs = {}; S.asstModels.forEach(function (m) { (provs[m.provider] = provs[m.provider] || []).push(m); });
    var opts = Object.keys(provs).map(function (p) { return '<optgroup label="' + esc(p) + '">' + provs[p].map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === S.asstModel ? ' selected' : '') + (m.available ? '' : ' disabled') + '>' + esc(m.naam) + (m.available ? '' : ' (geen sleutel)') + '</option>'; }).join('') + '</optgroup>'; }).join('');
    return '<select id="asst-model" title="Kies het AI-model" style="font-family:inherit;font-size:12.5px;font-weight:600;border:1px solid #DFD9C8;border-radius:9px;padding:5px 8px;background:#fff;color:#050A30;max-width:170px;">' + opts + '</select>';
  }
  function renderCopilot() {
    if (!S.copilotOpen) return '';
    var aside = !isNarrow();
    var head = '<div style="display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid #EFEADD;flex:none;">' +
      '<span style="width:34px;height:34px;border-radius:9px;background:#050A30;color:#D1F24C;display:grid;place-items:center;flex:none;">' + ic('sparkles', 18) + '</span>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:600;">AI Assistant</div><div style="font-size:11.5px;color:#8E8979;">kent je volledige kandidatendatabase</div></div>' +
      modelDropdown() +
      '<button data-act="toggleCopilot" style="background:none;border:none;cursor:pointer;color:#8E8979;flex:none;">' + ic('x', 20) + '</button></div>';
    var body;
    if (!S.asstMsgs.length && !S.asstBusy) {
      body = '<div style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px;"><div style="text-align:center;color:#8E8979;margin-top:10px;"><div style="width:46px;height:46px;border-radius:13px;background:#F4F1E8;display:grid;place-items:center;margin:0 auto 12px;">' + ic('message-square-text', 22, 'color:#A7A293;') + '</div><div style="font-size:14px;font-weight:600;color:#050A30;">Vraag me alles over je kandidaten</div><div style="font-size:12.5px;margin-top:4px;line-height:1.5;">Ik heb toegang tot de hele database en de CV-teksten.</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">' + ASST_CHIPS.map(function (c) { return '<button data-act="asstChip" data-arg="' + esc(c) + '" class="hov-soft" style="font-family:inherit;text-align:left;font-size:13px;color:#26241F;background:#FFFDF8;border:1px solid #EFEADD;border-radius:11px;padding:10px 13px;cursor:pointer;">' + esc(c) + '</button>'; }).join('') + '</div></div>';
    } else {
      var msgs = S.asstMsgs.map(function (m) {
        if (m.role === 'user') return '<div style="align-self:flex-end;max-width:85%;background:#050A30;color:#F7F3EA;border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;">' + esc(m.content) + '</div>';
        return '<div style="align-self:flex-start;max-width:92%;background:#FFFDF8;border:1px solid #EFEADD;color:#26241F;border-radius:14px 14px 14px 4px;padding:11px 14px;font-size:13.5px;line-height:1.55;white-space:pre-wrap;box-shadow:var(--shadow-card);">' + esc(m.content) + '</div>';
      }).join('');
      if (S.asstBusy) msgs += '<div style="align-self:flex-start;background:#FFFDF8;border:1px solid #EFEADD;border-radius:14px;padding:11px 16px;"><span class="hr-dots" style="font-size:13px;color:#8E8979;">Denkt na…</span></div>';
      body = '<div id="asst-scroll" style="flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:10px;">' + msgs + '</div>';
    }
    var foot = '<div style="flex:none;padding:12px 14px;border-top:1px solid #EFEADD;background:#F7F3EA;"><div style="display:flex;gap:8px;align-items:flex-end;background:#fff;border:1px solid #DFD9C8;border-radius:14px;padding:6px 6px 6px 12px;"><textarea id="asst-input" rows="1" placeholder="Stel een vraag…" ' + (S.asstBusy ? 'disabled' : '') + ' style="flex:1;border:none;outline:none;resize:none;font-family:inherit;font-size:13.5px;line-height:1.4;max-height:120px;background:transparent;color:#050A30;padding:6px 0;"></textarea><button data-act="asstSend" ' + (S.asstBusy ? 'disabled' : '') + ' style="width:36px;height:36px;border-radius:10px;background:#D1F24C;color:#050A30;border:none;cursor:pointer;display:grid;place-items:center;flex:none;">' + ic(S.asstBusy ? 'loader' : 'arrow-up', 18) + '</button></div></div>';
    var inner = head + body + foot;
    if (aside) return '<aside style="width:420px;flex:none;background:#F7F3EA;border-left:1px solid #EFEADD;display:flex;flex-direction:column;align-self:stretch;position:sticky;top:66px;height:calc(100vh - 66px);">' + inner + '</aside>';
    return '<div data-act="toggleCopilot" style="position:fixed;inset:0;z-index:55;background:rgba(5,10,48,.3);"></div><aside style="position:fixed;top:0;right:0;z-index:56;width:min(440px,100vw);height:100vh;background:#F7F3EA;display:flex;flex-direction:column;animation:hrSlideIn .25s ease;">' + inner + '</aside>';
  }
  function renderNotifs() {
    if (!S.notifsOpen) return '';
    var list = S.notifs || [];
    var head = '<div style="display:flex;align-items:center;gap:10px;padding:15px 18px;border-bottom:1px solid #EFEADD;"><h3 style="font-size:15.5px;font-weight:600;margin:0;flex:1;">Notificaties</h3>' +
      (list.length ? '<button data-act="notifReadAll" style="font-family:inherit;font-size:12px;font-weight:600;color:#2458EA;background:none;border:none;cursor:pointer;">Alles gelezen</button>' : '') + '</div>';
    var body;
    if (S.notifs == null && S.notifBusy) {
      body = '<div style="display:grid;place-items:center;padding:34px;"><div class="hr-spin"></div></div>';
    } else if (!list.length) {
      var hint = S.notifMailbox === 'no_scope' ? 'Nieuwe berichten van kandidaten verschijnen hier zodra de Gmail-leestoegang is geactiveerd.' : 'Geen nieuwe berichten. Antwoorden van kandidaten verschijnen hier.';
      body = '<div style="padding:30px 22px;color:#8E8979;font-size:13.5px;text-align:center;line-height:1.55;"><div style="width:46px;height:46px;border-radius:13px;background:#F4F1E8;display:grid;place-items:center;margin:0 auto 12px;">' + ic('bell', 22, 'color:#A7A293;') + '</div>' + hint + '</div>';
    } else {
      body = '<div style="overflow-y:auto;">' + list.map(function (n) {
        return '<button data-act="openNotif" data-arg="' + esc(n.candidate_id + '|' + n.id) + '" class="hov-soft" style="width:100%;text-align:left;font-family:inherit;display:flex;gap:11px;padding:13px 16px;background:none;border:none;border-bottom:1px solid #F2EEE3;cursor:pointer;color:inherit;">' +
          '<span style="width:9px;height:9px;border-radius:50%;background:#28AFF9;flex:none;margin-top:5px;"></span>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:baseline;gap:8px;"><span style="font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(n.naam) + '</span><span style="font-size:11px;color:#A7A293;margin-left:auto;white-space:nowrap;">' + esc(fmtDateTime(n.date)) + '</span></div>' +
            '<div style="font-size:12.5px;font-weight:500;color:#26241F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;">' + esc(n.subject || '(geen onderwerp)') + (n.has_attach ? ' ' + ic('paperclip', 12, 'color:#8E8979;') : '') + '</div>' +
            '<div style="font-size:12px;color:#8E8979;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">' + esc(n.snippet || '') + '</div>' +
          '</div></button>';
      }).join('') + '</div>';
    }
    return '<div data-act="toggleNotifs" style="position:fixed;inset:0;z-index:50;background:rgba(5,10,48,.25);"></div>' +
      '<div style="display:flex;flex-direction:column;position:fixed;top:74px;right:16px;z-index:51;width:min(400px,calc(100vw - 32px));max-height:calc(100vh - 90px);background:#FFFDF8;border:1px solid #EFEADD;border-radius:18px;box-shadow:0 24px 60px -16px rgba(5,10,48,.35);overflow:hidden;">' +
        head + body +
      '</div>';
  }

  /* ========================================================================
   * KANDIDATEN — pipeline + detail (echte data)
   * ====================================================================== */
  function visibleCandidates() {
    var list = S.candidates || [];
    var q = S.q.toLowerCase().trim();
    return list.filter(function (it) {
      if (it.spam) return false;
      if (S.jobFilter !== 'all' && (it.vacature || '(geen)') !== S.jobFilter) return false;
      if (q) { var hay = ((it.naam || '') + ' ' + (it.vacature || '') + ' ' + (it.email || '') + ' ' + (it.kanaal || '')).toLowerCase(); if (hay.indexOf(q) < 0) return false; }
      return true;
    });
  }
  function jobOptions() {
    var seen = {}, out = [{ id: 'all', title: 'Alle vacatures' }];
    (S.candidates || []).forEach(function (it) { var v = it.vacature || ''; if (v && !seen[v]) { seen[v] = 1; out.push({ id: v, title: v }); } });
    return out;
  }
  function pipeCardHtml(it) {
    var sc = (it.ai && it.ai.score != null) ? it.ai.score : null;
    var sm = srcMeta(it);
    return '<div class="hov-card" draggable="true" data-card="' + esc(it.id) + '" data-act="openCand" data-arg="' + esc(it.id) + '" style="background:#FFFDF8;border-radius:15px;padding:14px;box-shadow:0 2px 8px rgba(5,10,48,.05);cursor:grab;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:11px;">' + ic('grip-vertical', 14, 'color:#C8C1AF;flex:none;') +
        '<div style="min-width:0;flex:1;"><div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(it.naam || 'Kandidaat') + '</div><div style="font-size:11.5px;color:#8E8979;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(it.vacature || '–') + '</div></div></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">' +
        '<span style="font-size:11px;color:#8E8979;display:inline-flex;align-items:center;gap:5px;">' + ic(sm.icon, 13) + esc(sm.label) + '</span>' +
        '<span style="font-size:12px;font-weight:700;color:' + scoreCol(sc) + ';">' + (sc != null ? sc + '%' : '–') + '</span></div>' +
      '<div style="height:5px;background:#EFEADD;border-radius:99px;overflow:hidden;"><div style="height:100%;width:' + (sc != null ? sc : 0) + '%;background:' + scoreCol(sc) + ';border-radius:99px;"></div></div>' +
    '</div>';
  }
  function renderKandidaten() {
    if (S.loadingCands || S.candidates == null) return '<div class="scr" style="max-width:1320px;margin:0 auto;"><div style="display:grid;place-items:center;padding:80px;"><div class="hr-spin"></div></div></div>';
    var vis = visibleCandidates();
    var byStage = {}; STAGES.forEach(function (st) { byStage[st.key] = []; });
    vis.forEach(function (it) { byStage[stageOf(it)].push(it); });
    var cols = STAGES.map(function (st) {
      var items = byStage[st.key];
      var cards = items.length ? items.map(pipeCardHtml).join('') : '<div style="font-size:11.5px;color:#A8A292;text-align:center;padding:14px 6px;">Leeg</div>';
      return '<div data-col="' + st.key + '" style="background:#F0ECE0;border-radius:20px;padding:12px;min-height:200px;">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px 12px;"><span style="width:8px;height:8px;border-radius:50%;background:' + st.color + ';"></span><span style="font-size:13px;font-weight:600;color:#050A30;">' + st.label + '</span><span style="font-size:12px;font-weight:600;color:#8E8979;margin-left:auto;background:#fff;border-radius:99px;padding:2px 9px;">' + items.length + '</span></div>' +
        '<div data-drop="' + st.key + '" style="display:flex;flex-direction:column;gap:10px;min-height:60px;">' + cards + '</div></div>';
    }).join('');
    var opts = jobOptions().map(function (o) { return '<option value="' + esc(o.id) + '"' + (S.jobFilter === o.id ? ' selected' : '') + '>' + esc(o.title) + '</option>'; }).join('');
    var pipeCols = isNarrow() ? 'repeat(5,minmax(240px,1fr))' : 'repeat(5,1fr)';
    return '<div class="scr" style="max-width:1320px;margin:0 auto;">' +
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px;flex-wrap:wrap;">' +
        '<div><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:#5E5A4F;margin-bottom:8px;">Kandidaatbeheer</div><h1 style="font-size:34px;font-weight:300;letter-spacing:-.02em;margin:0;">Wie solliciteerde waarvoor</h1></div>' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
          '<div style="position:relative;display:flex;align-items:center;">' + ic('search', 16, 'position:absolute;left:13px;color:#8E8979;') + '<input id="hrk-search" value="' + esc(S.q) + '" placeholder="Zoek op naam, functie of bron..." style="font-family:inherit;font-size:14px;padding:10px 14px 10px 36px;background:#FFFDF8;border:1px solid #DFD9C8;border-radius:12px;color:#050A30;width:280px;box-shadow:0 1px 2px rgba(5,10,48,.04);"></div>' +
          '<select id="hrk-jobfilter" style="font-family:inherit;font-size:14px;font-weight:500;padding:10px 16px;background:#FFFDF8;border:1px solid #DFD9C8;border-radius:12px;color:#050A30;box-shadow:0 1px 2px rgba(5,10,48,.04);">' + opts + '</select>' +
        '</div></div>' +
      '<div style="font-size:13px;color:#5E5A4F;margin-bottom:16px;">' + vis.length + ' kandidaten gevonden</div>' +
      '<div style="display:grid;grid-template-columns:' + pipeCols + ';gap:14px;align-items:start;overflow-x:' + (isNarrow() ? 'auto' : 'visible') + ';padding-bottom:8px;">' + cols + '</div>' +
    '</div>';
  }

  function curCand() { return (S.candidates || []).filter(function (x) { return x.id === S.candId; })[0]; }
  function renderKandidaat() {
    var c = curCand();
    if (!c) return '<div class="scr" style="max-width:1100px;margin:0 auto;"><div class="hr-empty">Kandidaat niet gevonden. <a href="#/kandidaten" data-act="go" data-arg="kandidaten">Terug naar pipeline</a></div></div>';
    var ai = c.ai || {}; var sc = (ai.score != null) ? ai.score : null;
    var stg = STAGES.filter(function (x) { return x.key === stageOf(c); })[0] || STAGES[0];
    var sm = srcMeta(c);
    var detCols = isNarrow() ? '1fr' : '1.1fr 1fr';
    var headCols = isMobile() ? '1fr' : '1fr auto';
    // acties op basis van fase
    var actions = [];
    var stk = stageOf(c);
    actions.push({ act: 'screen', icon: 'sparkles', label: sc != null ? 'Herbeoordeel met AI' : 'Start AI-screening', bg: '#050A30', col: '#fff', bd: 'none' });
    // Fase-afhankelijke hoofdactie
    if (stk === 'nieuw' || stk === 'screening' || stk === 'gesprek') actions.push({ act: 'uitnodiging', icon: 'calendar-plus', label: 'Uitnodigen voor gesprek', bg: '#D1F24C', col: '#050A30', bd: 'none' });
    if (stk === 'assessment') actions.push({ act: 'case', icon: 'wand-sparkles', label: 'Genereer case', bg: '#D1F24C', col: '#050A30', bd: 'none' });
    if (stk === 'aanbod') actions.push({ act: 'contract', icon: 'file-signature', label: 'Contractvoorstel', bg: '#D1F24C', col: '#050A30', bd: 'none' });
    // Altijd beschikbaar
    actions.push({ act: 'mailverkeer', icon: 'inbox', label: 'Mailverkeer', bg: '#fff', col: '#050A30', bd: '1px solid #DFD9C8' });
    actions.push({ act: 'mail', icon: 'mail', label: 'Afwijsmail', bg: '#fff', col: '#050A30', bd: '1px solid #DFD9C8' });
    actions.push({ act: 'spam', icon: 'shield-alert', label: 'Spam', bg: '#fff', col: '#B83A2A', bd: '1px solid #F0CFC9' });
    var actBtns = actions.map(function (a) { return '<button data-act="cand" data-arg="' + a.act + '" ' + (S.busy === a.act ? 'disabled' : '') + ' style="font-family:inherit;font-size:14px;font-weight:600;background:' + a.bg + ';color:' + a.col + ';border:' + a.bd + ';border-radius:12px;padding:9px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;">' + ic(S.busy === a.act ? 'loader' : a.icon, 16) + (S.busy === a.act ? 'Bezig…' : a.label) + '</button>'; }).join('');

    // "Waarom deze match" — echte sterktes/aandachtspunten
    var sterk = (ai.sterktes || []).slice(0, 5), aand = (ai.aandachtspunten || []).slice(0, 5);
    var matchCard;
    if (sc != null) {
      matchCard = '<div style="display:flex;flex-direction:column;gap:13px;">' +
        (ai.samenvatting ? '<p style="font-size:13.5px;line-height:1.6;color:#26241F;margin:0 0 4px;">' + esc(ai.samenvatting) + '</p>' : '') +
        sterk.map(function (s) { return '<div style="display:flex;gap:9px;align-items:flex-start;font-size:13.5px;"><span style="color:#4A6B0E;margin-top:1px;flex:none;">' + ic('check', 15) + '</span><span>' + esc(s) + '</span></div>'; }).join('') +
        aand.map(function (s) { return '<div style="display:flex;gap:9px;align-items:flex-start;font-size:13.5px;color:#5E5A4F;"><span style="color:#C99410;margin-top:1px;flex:none;">' + ic('alert-triangle', 15) + '</span><span>' + esc(s) + '</span></div>'; }).join('') +
        (ai.oordeel ? '<div style="font-size:13.5px;font-weight:600;margin-top:4px;">' + esc(ai.oordeel) + '</div>' : '') +
      '</div>';
    } else {
      matchCard = '<p style="font-size:13.5px;color:#5E5A4F;line-height:1.6;margin:0;">Deze kandidaat is nog niet door de AI beoordeeld. Klik op <b>Start AI-screening</b> om het CV te laten analyseren op profielmatch, sterktes en aandachtspunten.</p>';
    }

    var docs = '';
    // Mailverkeer-rij: opent de volledige conversatie IN het portaal (geen Gmail-tab).
    docs += '<button data-act="cand" data-arg="mailverkeer" class="hov-row" style="width:100%;text-align:left;font-family:inherit;display:flex;align-items:center;gap:13px;padding:13px 14px;background:#fff;border:1px solid #EFEADD;border-radius:13px;cursor:pointer;color:inherit;">' +
      '<span style="width:38px;height:38px;border-radius:10px;background:#E0F1FD;color:#0F2EA3;display:grid;place-items:center;flex:none;">' + ic('mail', 19) + '</span>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:500;">Mailverkeer</div><div style="font-size:12px;color:#8E8979;">' + (c.email ? esc(c.email) : 'geen e-mailadres bekend') + '</div></div>' +
      '<span style="font-size:12.5px;font-weight:600;color:#2458EA;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">Openen' + ic('chevron-right', 15) + '</span></button>';
    // Documenten uit het dossier (CV + gegenereerde docs zoals contract), in-portaal downloadbaar.
    var dd = (S.candDocs && S.candDocs.id === c.id) ? S.candDocs : null;
    if (dd && dd.loading) {
      docs += '<div style="display:flex;align-items:center;gap:10px;padding:13px 14px;color:#8E8979;font-size:13px;"><span class="hr-spin" style="width:16px;height:16px;"></span>Documenten laden…</div>';
    } else if (dd && dd.items && dd.items.length) {
      dd.items.forEach(function (d) {
        var isCv = d.kind === 'cv', isAtt = d.kind === 'mailbijlage';
        var meta = isCv ? 'Bijlage bij de sollicitatie' : (d.kind === 'contract' ? 'Gegenereerd contractvoorstel' : (isAtt ? 'Bijlage uit mailverkeer' : (d.created_at ? fmtDate(d.created_at) : 'Document')));
        var bg = isCv ? '#F4FBDB' : (isAtt ? '#E7F3FD' : '#ECE9FB'), col = isCv ? '#4A6B0E' : (isAtt ? '#0F2EA3' : '#5E50C8'), icn = isCv ? 'file-text' : (isAtt ? 'paperclip' : 'file-signature');
        var href = d.external ? d.url : (GATEWAY + d.url);
        docs += docRow(d.kind, d.title || 'Document', meta, d.external ? 'Openen' : 'Download', bg, col, icn, href);
      });
    } else if (c.cv_url) {
      docs += docRow('cv', 'CV', 'Bijlage bij de sollicitatie', 'Openen', '#F4FBDB', '#4A6B0E', 'file-text', c.cv_url);
    }

    var tl = [];
    if (c.ts) tl.push({ icon: 'inbox', bg: '#E0F1FD', col: '#0F2EA3', text: 'Sollicitatie ontvangen', time: fmtDate(c.ts) });
    if (sc != null) tl.push({ icon: 'sparkles', bg: '#F4FBDB', col: '#4A6B0E', text: 'AI-beoordeling (' + sc + '%)', time: 'door de wervingsassistent' });
    tl.push({ icon: 'tag', bg: '#FBF1D9', col: '#6B4D04', text: 'Huidige fase: ' + stg.label, time: c.status || '' });
    var tlHtml = tl.map(function (t) { return '<div style="display:flex;gap:13px;padding-bottom:16px;"><span style="width:32px;height:32px;border-radius:9px;flex:none;background:' + t.bg + ';color:' + t.col + ';display:grid;place-items:center;">' + ic(t.icon, 16) + '</span><div style="flex:1;"><div style="font-size:13.5px;line-height:1.4;">' + esc(t.text) + '</div><div style="font-size:11.5px;color:#8E8979;margin-top:2px;">' + esc(t.time) + '</div></div></div>'; }).join('');

    return '<div class="scr" style="max-width:1100px;margin:0 auto;">' +
      '<button data-act="go" data-arg="kandidaten" style="font-family:inherit;font-size:13px;font-weight:500;background:none;border:none;color:#5E5A4F;cursor:pointer;display:flex;align-items:center;gap:7px;margin-bottom:18px;padding:0;">' + ic('arrow-left', 16) + 'Terug naar pipeline</button>' +
      '<div style="background:#050A30;border-radius:26px;padding:28px 30px;color:#F7F3EA;display:grid;grid-template-columns:' + headCols + ';gap:22px;align-items:center;margin-bottom:16px;position:relative;overflow:hidden;">' +
        '<img src="assets/Pipe-divider-warmwhite.svg" style="position:absolute;right:-4%;bottom:-30%;width:46%;opacity:.10;pointer-events:none;" alt="">' +
        '<div style="position:relative;"><h1 style="font-size:28px;font-weight:400;letter-spacing:-.01em;margin:0 0 6px;">' + esc(c.naam || 'Kandidaat') + '</h1>' +
          '<div style="font-size:14px;color:rgba(247,243,234,.75);margin-bottom:10px;">' + esc(c.type === 'stage' ? 'Stage-aanvraag' : c.type === 'spontaan' ? 'Spontane aanvraag' : 'Sollicitatie') + (c.vacature ? ' · solliciteerde voor ' + esc(c.vacature) : '') + '</div>' +
          '<div style="display:flex;gap:16px;font-size:13px;color:rgba(247,243,234,.6);flex-wrap:wrap;">' +
            (c.woonplaats ? '<span style="display:inline-flex;align-items:center;gap:6px;">' + ic('map-pin', 14) + esc(c.woonplaats) + '</span>' : '') +
            (c.email ? '<span style="display:inline-flex;align-items:center;gap:6px;">' + ic('mail', 14) + esc(c.email) + '</span>' : '') +
            (c.telefoon ? '<span style="display:inline-flex;align-items:center;gap:6px;">' + ic('phone', 14) + esc(c.telefoon) + '</span>' : '') +
            '<span style="display:inline-flex;align-items:center;gap:6px;">' + ic('radio', 14) + 'via ' + esc(sm.label) + '</span>' +
          '</div></div>' +
        '<div style="position:relative;text-align:center;background:rgba(247,243,234,.06);border-radius:18px;padding:16px 22px;"><div style="font-size:11px;color:#28AFF9;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;">AI-match</div><div style="font-size:42px;font-weight:300;line-height:1;color:' + (sc != null ? scoreCol(sc) : 'rgba(247,243,234,.5)') + ';">' + (sc != null ? sc : '–') + (sc != null ? '<span style="font-size:20px;">%</span>' : '') + '</div></div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;flex-wrap:wrap;"><span style="font-size:13px;color:#5E5A4F;">Fase:</span><button data-act="cand" data-arg="status" title="Klik om de fase te wijzigen" class="hov-lift" style="font-family:inherit;font-size:13px;font-weight:600;color:#050A30;background:#fff;border:1px solid #DFD9C8;padding:7px 11px 7px 14px;border-radius:99px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;"><span style="width:8px;height:8px;border-radius:50%;background:' + stg.color + ';"></span>' + stg.label + ic('chevron-down', 15, 'color:#8E8979;') + '</button><span style="width:1px;height:24px;background:#DFD9C8;margin:0 4px;"></span><div style="display:flex;gap:10px;flex-wrap:wrap;">' + actBtns + '</div></div>' +
      '<div style="display:grid;grid-template-columns:' + detCols + ';gap:16px;align-items:start;">' +
        '<div style="display:flex;flex-direction:column;gap:16px;">' +
          '<div style="background:#FFFDF8;border-radius:22px;padding:24px;box-shadow:var(--shadow-card);"><div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;"><span style="width:32px;height:32px;border-radius:9px;background:#050A30;color:#D1F24C;display:grid;place-items:center;">' + ic('sparkles', 17) + '</span><h3 style="font-size:17px;font-weight:500;margin:0;">Waarom deze match?</h3></div>' + matchCard + '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:16px;">' +
          '<div style="background:#FFFDF8;border-radius:22px;padding:24px;box-shadow:var(--shadow-card);"><h3 style="font-size:17px;font-weight:500;margin:0 0 14px;">Documenten &amp; communicatie</h3><div style="display:flex;flex-direction:column;gap:10px;">' + docs + '</div></div>' +
          '<div style="background:#FFFDF8;border-radius:22px;padding:24px;box-shadow:var(--shadow-card);"><h3 style="font-size:17px;font-weight:500;margin:0 0 16px;">Tijdlijn</h3><div style="display:flex;flex-direction:column;">' + tlHtml + '</div></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function docRow(kind, title, meta, btn, bg, col, icon, href) {
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener" class="hov-row" style="display:flex;align-items:center;gap:13px;padding:13px 14px;background:#fff;border:1px solid #EFEADD;border-radius:13px;cursor:pointer;text-decoration:none;color:inherit;">' +
      '<span style="width:38px;height:38px;border-radius:10px;background:' + bg + ';color:' + col + ';display:grid;place-items:center;flex:none;">' + ic(icon, 19) + '</span>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:500;">' + esc(title) + '</div><div style="font-size:12px;color:#8E8979;">' + esc(meta) + '</div></div>' +
      '<span style="font-size:12.5px;font-weight:600;color:#2458EA;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">' + esc(btn) + ic('chevron-right', 15) + '</span></a>';
  }

  /* ========================================================================
   * AGENDA (Mijn agenda / selectie) — week/maand/dag op echte Google Calendar
   * ====================================================================== */
  var AG_HSTART = 8, AG_HEND = 19, AG_ROW = 56, AG_H = (AG_HEND - AG_HSTART) * AG_ROW;
  var AG_DOW = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  function agStartOfDay(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function agMonday(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); var wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d.getTime(); }
  function agHour(ms) { var d = new Date(ms); return d.getHours() + d.getMinutes() / 60; }
  function agTimeLabel(ms) { var d = new Date(ms); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function agEnsureAnchor() { if (!S.agendaAnchorMs) S.agendaAnchorMs = agStartOfDay(Date.now()); if (!S.agendaDay) S.agendaDay = agStartOfDay(Date.now()); }
  function agWindow() {
    agEnsureAnchor();
    if (S.agendaView === 'day') return { van: S.agendaDay, tot: S.agendaDay + 86400000 };
    if (S.agendaView === 'month') { var a = new Date(S.agendaAnchorMs); var first = agMonday(new Date(a.getFullYear(), a.getMonth(), 1).getTime()); return { van: first, tot: first + 42 * 86400000 }; }
    var mon = agMonday(S.agendaAnchorMs); return { van: mon, tot: mon + 7 * 86400000 };
  }
  function agColor(ev) { var t = (ev.titel || '').toLowerCase(); if (/gesprek|kennismaking|sollicit|interview/.test(t)) return { bar: '#7FA830', bg: '#EDF6DC', fg: '#3C5310' }; if (/assessment|case|test|proef/.test(t)) return { bar: '#C99410', bg: '#FBF1D9', fg: '#6B4D04' }; return { bar: '#2458EA', bg: '#E6EDFF', fg: '#0F2EA3' }; }
  function agEventsForDay(ms) { var s = agStartOfDay(ms), e = s + 86400000; return (S.agendaEvents || []).filter(function (ev) { return !ev.allday && ev.start_ms < e && ev.eind_ms > s; }).sort(function (a, b) { return a.start_ms - b.start_ms; }); }
  function agAlldayForDay(ms) { var s = agStartOfDay(ms), e = s + 86400000; return (S.agendaEvents || []).filter(function (ev) { return ev.allday && ev.start_ms < e && ev.eind_ms > s; }); }
  function agBlock(ev, minH) { var sh = agHour(ev.start_ms), eh = agHour(ev.eind_ms); if (eh <= sh) eh = sh + 0.5; var s = Math.max(AG_HSTART, Math.min(AG_HEND, sh)), e = Math.max(AG_HSTART, Math.min(AG_HEND, eh)); if (e <= s) e = Math.min(AG_HEND, s + 0.5); return { top: (s - AG_HSTART) * AG_ROW, height: Math.max(minH || 22, (e - s) * AG_ROW - 4), compact: (e - s) <= 0.6 }; }
  function agHoursColInner() { var s = ''; for (var h = AG_HSTART; h <= AG_HEND - 1; h++) s += '<div style="position:absolute;right:8px;top:' + ((h - AG_HSTART) * AG_ROW - 7) + 'px;font-size:11px;color:#A7A293;">' + h + ':00</div>'; return s; }
  function agRailItems() {
    if (S.candidates == null) return [];
    return S.candidates.filter(function (c) { if (c.spam) return false; var st = stageOf(c); if (st !== 'gesprek' && st !== 'assessment') return false; var nm = (c.voornaam || c.naam || '').toLowerCase(); return !(S.agendaEvents || []).some(function (ev) { return !ev.allday && nm && (ev.titel || '').toLowerCase().indexOf(nm) >= 0; }); }).map(function (c) { var st = stageOf(c); return { id: c.id, title: (st === 'assessment' ? 'Assessment — ' : 'Gesprek — ') + (c.naam || 'Kandidaat'), sub: c.vacature || '', dur: st === 'assessment' ? 1.5 : 1, color: st === 'assessment' ? '#C99410' : '#7FA830', email: c.email || '' }; });
  }
  function renderAgRail() {
    var items = agRailItems();
    var list = items.length ? items.map(function (it) {
      return '<div draggable="true" data-railitem="' + esc(it.id) + '" data-act="railPlan" data-arg="' + esc(it.id) + '" class="hov-lift" style="background:#fff;border:1px solid #ECE7DA;border-left:4px solid ' + it.color + ';border-radius:12px;padding:11px 13px;cursor:grab;"><div style="font-size:13.5px;font-weight:600;color:#050A30;display:flex;align-items:center;gap:7px;">' + ic('grip-vertical', 14, 'color:#C8C1AF;flex:none;') + esc(it.title) + '</div><div style="font-size:12px;color:#8E8979;margin-top:3px;padding-left:21px;">' + esc(it.sub) + '</div><div style="margin-top:8px;padding-left:21px;"><span style="font-size:11px;font-weight:600;color:#4A6B0E;background:#F4FBDB;border-radius:99px;padding:2px 9px;">' + (it.dur === 1 ? '1 uur' : it.dur + ' uur') + '</span></div></div>';
    }).join('') : '<div style="font-size:12.5px;color:#A7A293;text-align:center;padding:18px 8px;line-height:1.5;">Alles ingepland 🎉</div>';
    return '<div style="background:#FFFDF8;border:1px solid #ECE7DA;border-radius:20px;padding:16px;box-shadow:var(--shadow-card);"><div style="display:flex;align-items:center;gap:9px;margin-bottom:12px;"><span style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:#8E8979;">Te plannen</span><span style="font-size:12px;font-weight:700;color:#0F2EA3;background:#E0F1FD;border-radius:99px;min-width:22px;height:22px;display:grid;place-items:center;padding:0 7px;">' + items.length + '</span></div><p style="font-size:11.5px;color:#A7A293;margin:0 0 12px;line-height:1.4;">Sleep een kandidaat op de agenda (of klik) om een gesprek in te plannen.</p><div style="display:flex;flex-direction:column;gap:10px;">' + list + '</div></div>';
  }
  function renderAgWeek() {
    agEnsureAnchor(); var mon = agMonday(S.agendaAnchorMs); var today = agStartOfDay(Date.now());
    var cols = []; for (var di = 0; di < 7; di++) cols.push(mon + di * 86400000);
    var gridCols = isNarrow() ? '46px repeat(7,minmax(112px,1fr))' : '52px repeat(7,1fr)';
    var head = '<div style="border-right:1px solid #F0ECE0;"></div>' + cols.map(function (ms, di) { var d = new Date(ms); var is = agStartOfDay(ms) === today; return '<div style="text-align:center;padding:12px 6px 10px;border-right:1px solid #F0ECE0;background:' + (is ? '#F4F8FF' : 'transparent') + ';"><div style="font-size:12px;font-weight:700;letter-spacing:.04em;color:#050A30;">' + AG_DOW[di] + '</div><div style="font-size:11.5px;margin-top:1px;color:' + (is ? '#2458EA' : '#8E8979') + ';font-weight:' + (is ? 700 : 400) + ';">' + d.getDate() + '</div></div>'; }).join('');
    var strip = '<div style="border-right:1px solid #F0ECE0;"></div>' + cols.map(function (ms) { var ad = agAlldayForDay(ms); return '<div style="padding:5px 6px;border-right:1px solid #F0ECE0;display:flex;flex-direction:column;gap:4px;min-height:14px;">' + ad.map(function (ev) { return '<span data-act="openEv" data-arg="' + esc(ev.id) + '" style="font-size:11px;font-weight:600;color:#4A6B0E;background:#EAF6D6;border-radius:7px;padding:3px 8px;align-self:flex-start;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;">' + esc(ev.titel) + '</span>'; }).join('') + '</div>'; }).join('');
    var body = '<div style="position:relative;height:' + AG_H + 'px;border-right:1px solid #F0ECE0;">' + agHoursColInner() + '</div>' + cols.map(function (ms) {
      var blocks = agEventsForDay(ms).map(function (ev) { var b = agBlock(ev, 22); var c = agColor(ev); return '<div data-act="openEv" data-arg="' + esc(ev.id) + '" class="hov-lift" style="position:absolute;left:4px;right:4px;top:' + b.top + 'px;height:' + b.height + 'px;background:' + c.bg + ';border-left:3px solid ' + c.bar + ';border-radius:9px;padding:' + (b.compact ? '3px 8px' : '6px 9px') + ';overflow:hidden;cursor:pointer;"><div style="font-size:12px;font-weight:600;color:' + c.fg + ';line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + agTimeLabel(ev.start_ms) + ' ' + esc(ev.titel) + '</div>' + (b.compact || !ev.locatie ? '' : '<div style="font-size:11px;color:' + c.fg + ';opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(ev.locatie) + '</div>') + '</div>'; }).join('');
      return '<div data-agcol="' + ms + '" style="position:relative;height:' + AG_H + 'px;border-right:1px solid #F0ECE0;background-image:repeating-linear-gradient(to bottom,transparent,transparent 55px,#F0ECE0 55px,#F0ECE0 56px);">' + blocks + '</div>';
    }).join('');
    return '<div style="min-width:' + (isNarrow() ? '820px' : '0') + ';"><div style="display:grid;grid-template-columns:' + gridCols + ';border-bottom:1px solid #ECE7DA;">' + head + '</div><div style="display:grid;grid-template-columns:' + gridCols + ';border-bottom:1px solid #ECE7DA;">' + strip + '</div><div style="display:grid;grid-template-columns:' + gridCols + ';">' + body + '</div></div>';
  }
  function renderAgMonth() {
    agEnsureAnchor(); var a = new Date(S.agendaAnchorMs); var month = a.getMonth();
    var firstCell = agMonday(new Date(a.getFullYear(), a.getMonth(), 1).getTime()); var today = agStartOfDay(Date.now());
    var hdr = '<div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid #ECE7DA;">' + AG_DOW.map(function (dn) { return '<div style="padding:10px 12px;font-size:11px;font-weight:600;letter-spacing:.04em;color:#8E8979;border-right:1px solid #F0ECE0;">' + dn + '</div>'; }).join('') + '</div>';
    var cells = '';
    for (var i = 0; i < 42; i++) {
      var ms = firstCell + i * 86400000; var d = new Date(ms); var inM = d.getMonth() === month; var isT = agStartOfDay(ms) === today;
      var evs = agEventsForDay(ms).concat(agAlldayForDay(ms));
      var chips = evs.slice(0, 3).map(function (ev) { var c = agColor(ev); return '<div data-act="openEv" data-arg="' + esc(ev.id) + '" style="display:flex;align-items:center;gap:5px;background:' + c.bg + ';border-radius:5px;padding:3px 6px;overflow:hidden;cursor:pointer;"><span style="width:3px;height:13px;border-radius:2px;background:' + c.bar + ';flex:none;"></span>' + (ev.allday ? '' : '<span style="font-size:11px;font-weight:600;color:' + c.fg + ';white-space:nowrap;">' + agTimeLabel(ev.start_ms) + '</span>') + '<span style="font-size:11px;color:#6E695A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(ev.titel) + '</span></div>'; }).join('');
      var more = evs.length > 3 ? '<span data-act="ag" data-arg="day:' + ms + '" style="font-size:11px;font-weight:600;color:#2458EA;padding-left:6px;cursor:pointer;">+' + (evs.length - 3) + ' meer</span>' : '';
      var numEl = isT ? '<span style="width:24px;height:24px;border-radius:50%;background:#0F2EA3;color:#fff;display:inline-grid;place-items:center;font-size:12.5px;font-weight:700;">' + d.getDate() + '</span>' : '<span style="font-size:12.5px;font-weight:600;color:' + (inM ? '#050A30' : '#B8B2A2') + ';padding-left:3px;">' + d.getDate() + '</span>';
      cells += '<div data-act="ag" data-arg="day:' + ms + '" style="min-height:120px;border-right:1px solid #F0ECE0;border-bottom:1px solid #F0ECE0;background:' + (inM ? '#FFFDF8' : '#FBF8F1') + ';padding:7px;cursor:pointer;"><div style="margin-bottom:5px;">' + numEl + '</div><div style="display:flex;flex-direction:column;gap:3px;">' + chips + more + '</div></div>';
    }
    return '<div style="min-width:' + (isNarrow() ? '780px' : '0') + ';">' + hdr + '<div style="display:grid;grid-template-columns:repeat(7,1fr);">' + cells + '</div></div>';
  }
  function renderAgDay() {
    agEnsureAnchor(); var ms = S.agendaDay; var d = new Date(ms);
    var evs = agEventsForDay(ms); var ad = agAlldayForDay(ms);
    var dayLabel = DAYS_LONG[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_LONG[d.getMonth()];
    var head = '<div style="padding:16px 20px;border-bottom:1px solid #ECE7DA;"><div style="font-size:17px;font-weight:600;color:#050A30;letter-spacing:-.01em;">' + esc(dayLabel) + '</div><div style="font-size:12.5px;color:#8E8979;margin-top:2px;">' + (evs.length ? evs.length + ' afspra' + (evs.length === 1 ? 'ak' : 'ken') : 'geen afspraken') + '</div></div>';
    var allStrip = ad.length ? '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:12px 20px;border-bottom:1px solid #ECE7DA;background:rgba(127,168,48,.05);">' + ad.map(function (ev) { return '<span data-act="openEv" data-arg="' + esc(ev.id) + '" style="font-size:12px;font-weight:600;color:#4A6B0E;background:#EAF6D6;border-radius:8px;padding:5px 11px;cursor:pointer;">' + esc(ev.titel) + '</span>'; }).join('') + '</div>' : '';
    var grid;
    if (!evs.length && !ad.length) grid = '<div style="padding:60px 20px;text-align:center;"><div style="width:54px;height:54px;border-radius:16px;background:#F4F1E8;display:grid;place-items:center;margin:0 auto 14px;">' + ic('coffee', 24, 'color:#A7A293;') + '</div><div style="font-size:15px;font-weight:600;color:#050A30;">Geen afspraken</div><div style="font-size:13px;color:#8E8979;margin-top:3px;">Een vrije dag, tijd voor focuswerk.</div></div>';
    else { var blocks = evs.map(function (ev) { var b = agBlock(ev, 30); var c = agColor(ev); return '<div data-act="openEv" data-arg="' + esc(ev.id) + '" class="hov-lift" style="position:absolute;left:8px;right:14px;top:' + b.top + 'px;height:' + b.height + 'px;background:' + c.bg + ';border-left:4px solid ' + c.bar + ';border-radius:11px;padding:9px 14px;cursor:pointer;overflow:hidden;"><div style="display:flex;align-items:baseline;gap:9px;"><span style="font-size:12px;font-weight:700;color:' + c.bar + ';flex:none;">' + agTimeLabel(ev.start_ms) + '</span><span style="font-size:13.5px;font-weight:600;color:' + c.fg + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(ev.titel) + '</span></div>' + (ev.locatie ? '<div style="font-size:12px;color:' + c.fg + ';opacity:.8;margin-top:2px;">' + esc(ev.locatie) + '</div>' : '') + '</div>'; }).join('');
      grid = '<div style="display:grid;grid-template-columns:64px 1fr;"><div style="position:relative;height:' + AG_H + 'px;border-right:1px solid #F0ECE0;">' + agHoursColInner() + '</div><div data-agday="' + ms + '" style="position:relative;height:' + AG_H + 'px;background-image:repeating-linear-gradient(to bottom,transparent,transparent 55px,#F0ECE0 55px,#F0ECE0 56px);">' + blocks + '</div></div>'; }
    return '<div>' + head + allStrip + grid + '</div>';
  }
  function renderSelectie() {
    if (S.agendaEvents == null) return '<div class="scr" style="max-width:1320px;margin:0 auto;"><div style="display:grid;place-items:center;padding:90px;"><div class="hr-spin"></div></div></div>';
    agEnsureAnchor(); var view = S.agendaView;
    var rangeLabel;
    if (view === 'week') { var mn = new Date(agMonday(S.agendaAnchorMs)); var en = new Date(agMonday(S.agendaAnchorMs) + 6 * 86400000); rangeLabel = mn.getDate() + ' ' + MONTHS[mn.getMonth()] + ' – ' + en.getDate() + ' ' + MONTHS[en.getMonth()] + ' ' + en.getFullYear(); }
    else if (view === 'day') { var dd = new Date(S.agendaDay); rangeLabel = DAYS_LONG[dd.getDay()] + ' ' + dd.getDate() + ' ' + MONTHS_LONG[dd.getMonth()]; }
    else { var mm = new Date(S.agendaAnchorMs); rangeLabel = MONTHS_LONG[mm.getMonth()].charAt(0).toUpperCase() + MONTHS_LONG[mm.getMonth()].slice(1) + ' ' + mm.getFullYear(); }
    function tg(v, label) { var on = view === v; return '<button data-act="ag" data-arg="view:' + v + '" style="font-family:inherit;font-size:13.5px;font-weight:600;background:' + (on ? '#0F2EA3' : 'transparent') + ';color:' + (on ? '#fff' : '#5E5A4F') + ';border:none;border-radius:99px;padding:7px 18px;cursor:pointer;">' + label + '</button>'; }
    var toolbar = '<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap;"><div style="display:flex;align-items:center;gap:8px;"><button data-act="ag" data-arg="prev" style="width:38px;height:38px;border-radius:50%;background:#FFFDF8;border:1px solid #ECE7DA;color:#5E5A4F;cursor:pointer;display:grid;place-items:center;">' + ic('chevron-left', 18) + '</button><button data-act="ag" data-arg="today" style="font-family:inherit;font-size:14px;font-weight:600;background:#FFFDF8;border:1px solid #ECE7DA;color:#0F2EA3;border-radius:99px;padding:9px 18px;cursor:pointer;">Vandaag</button><button data-act="ag" data-arg="next" style="width:38px;height:38px;border-radius:50%;background:#FFFDF8;border:1px solid #ECE7DA;color:#5E5A4F;cursor:pointer;display:grid;place-items:center;">' + ic('chevron-right', 18) + '</button></div><h1 style="font-size:24px;font-weight:300;letter-spacing:-.02em;margin:0;">' + esc(rangeLabel) + '</h1><div style="margin-left:auto;display:flex;background:#FFFDF8;border:1px solid #ECE7DA;border-radius:99px;padding:4px;gap:4px;">' + tg('day', 'Dag') + tg('week', 'Week') + tg('month', 'Maand') + '</div></div>';
    var showRail = (view === 'week' || view === 'day') && !isNarrow();
    var cal = view === 'week' ? renderAgWeek() : view === 'day' ? renderAgDay() : renderAgMonth();
    var calCard = '<div style="background:#FFFDF8;border:1px solid #ECE7DA;border-radius:20px;box-shadow:var(--shadow-card);overflow:' + (isNarrow() ? 'auto' : 'hidden') + ';">' + cal + '</div>';
    return '<div class="scr" style="max-width:1320px;margin:0 auto;">' + toolbar + '<div style="display:grid;grid-template-columns:' + (showRail ? '252px 1fr' : '1fr') + ';gap:16px;align-items:start;">' + (showRail ? renderAgRail() : '') + calCard + '</div></div>';
  }
  function mockAgendaEvents() {
    var mon = agMonday(Date.now());
    function at(di, h, m) { return mon + di * 86400000 + (h * 60 + m) * 60000; }
    return [
      { id: 'demo-ev1', titel: 'Kennismaking — Sofie Maes', start_ms: at(2, 10, 0), eind_ms: at(2, 11, 0), allday: false, locatie: 'Studio 27, Geel', beschrijving: 'Eerste gesprek voor Senior Software Engineer.', link: '#' },
      { id: 'demo-ev2', titel: 'Intern — 27 sprintoverleg', start_ms: at(1, 14, 0), eind_ms: at(1, 15, 30), allday: false, locatie: '', beschrijving: '', link: '#' },
      { id: 'demo-ev3', titel: 'Assessment — Karim Belkaïd', start_ms: at(3, 9, 30), eind_ms: at(3, 11, 0), allday: false, locatie: 'Online', beschrijving: '', link: '#', meet: 'https://meet.google.com/abc-defg-hij' },
      { id: 'demo-ev4', titel: 'Gesprek — Lotte Vermeulen', start_ms: at(4, 13, 0), eind_ms: at(4, 14, 0), allday: false, locatie: 'Studio 27, Geel', beschrijving: '', link: '#' },
      { id: 'demo-wfh', titel: '🏠 Thuiswerk', start_ms: mon, eind_ms: mon + 86400000, allday: true },
    ];
  }

  /* ========================================================================
   * ONBOARDING — nieuwe-collega-lijst + welkomstpakket + fasen-checklist
   * ====================================================================== */
  var OB_PHASES = [
    { id: 'prep', title: 'Voor de eerste dag', icon: 'clipboard-list', tasks: [
      { id: 'contract', label: 'Arbeidsovereenkomst getekend', owner: 'HR' },
      { id: 'laptop', label: 'Laptop klaarmaken & software installeren', owner: 'IT' },
      { id: 'accounts', label: 'Accounts: Gmail, Slack, Drive aanmaken', owner: 'IT' },
      { id: 'desk', label: 'Bureau, stoel & dubbel scherm klaarzetten', owner: 'Office' },
      { id: 'welcomemail', label: 'Welkomstmail + planning eerste dag sturen', owner: 'HR' },
      { id: 'buddy', label: 'Buddy toewijzen', owner: 'Manager' } ] },
    { id: 'day1', title: 'Dag 1', icon: 'sun', tasks: [
      { id: 'onthaal', label: 'Onthaal & rondleiding kantoor', owner: 'Buddy' },
      { id: 'badge', label: 'Badge, sleutels & parkeerplaats', owner: 'Office' },
      { id: 'itsetup', label: 'IT-setup, wachtwoorden & 2FA', owner: 'IT' },
      { id: 'lunch', label: 'Welkomstlunch met het team', owner: 'Team' },
      { id: 'tone', label: 'Intro tone of voice & 27-tools', owner: 'Manager' } ] },
    { id: 'week1', title: 'Eerste week', icon: 'calendar-range', tasks: [
      { id: 'klanten', label: 'Kennismaking met klanten & lopende projecten', owner: 'Manager' },
      { id: 'aitools', label: 'Workshop AI-automatiseringen', owner: 'Manager' },
      { id: 'firsttask', label: 'Eerste taak / casus opstarten', owner: 'Buddy' },
      { id: 'hrpapers', label: 'HR-papierwerk afronden', owner: 'HR' } ] },
    { id: 'month1', title: 'Eerste maand', icon: 'target', tasks: [
      { id: 'feedback', label: '30-dagen feedbackgesprek', owner: 'Manager' },
      { id: 'goals', label: 'Doelen Q3 bepalen', owner: 'Manager' },
      { id: 'training', label: 'Verdiepende opleiding interne tools', owner: 'Buddy' } ] },
  ];
  var OB_GIFTS = [
    { id: 'hoodie', label: '27 hoodie (maat M)', icon: 'shirt' }, { id: 'cava', label: 'Fles cava', icon: 'wine' },
    { id: 'card', label: 'Handgeschreven welkomstkaart', icon: 'mail' }, { id: 'notebook', label: 'Moleskine notitieboek', icon: 'notebook-pen' },
    { id: 'mug', label: '27 koffiemok', icon: 'coffee' }, { id: 'plant', label: 'Plantje voor het bureau', icon: 'sprout' },
  ];
  var OWNER_STYLE = { HR: { bg: '#E0F1FD', fg: '#0F2EA3' }, IT: { bg: '#F4FBDB', fg: '#4A6B0E' }, Manager: { bg: '#FBF1D9', fg: '#6B4D04' }, Office: { bg: '#EFEADD', fg: '#7A7565' }, Buddy: { bg: '#E6EEFF', fg: '#2458EA' }, Team: { bg: '#E2F4FE', fg: '#1B7FB8' } };
  function obDn(pid, key) { return !!S.obDone[pid + ':' + key]; }
  function obTotals(pid) { var tt = 0, dd = 0; OB_PHASES.forEach(function (ph) { ph.tasks.forEach(function (t) { tt++; if (obDn(pid, t.id)) dd++; }); }); OB_GIFTS.forEach(function (g) { tt++; if (obDn(pid, 'gift_' + g.id)) dd++; }); return { tt: tt, dd: dd, pct: tt ? Math.round(dd / tt * 100) : 0 }; }
  function mockOnboardingPeople() { return [
    { id: 'p1', name: 'Jens De Backer', role: 'Account Manager Vlaanderen', dept: 'Sales', start: 'ma 1 jul', buddy: 'Ilke Janssens' },
    { id: 'p2', name: 'Karim Belkaïd', role: 'Field Service Technicus', dept: 'Field Service', start: 'ma 7 jul', buddy: 'Klaas Peeters' },
    { id: 'p3', name: 'Sofie Maes', role: 'Senior Software Engineer', dept: 'Tech', start: 'di 15 jul', buddy: 'Vincent Wouters' } ]; }
  function mockObDone() { return { 'p1:contract': true, 'p1:laptop': true, 'p1:accounts': true, 'p1:welcomemail': true, 'p1:buddy': true, 'p1:gift_hoodie': true, 'p1:gift_card': true, 'p2:contract': true, 'p2:laptop': true }; }
  function renderOnboarding() {
    if (S.obPeople == null) return '<div class="scr" style="max-width:1320px;margin:0 auto;"><div style="display:grid;place-items:center;padding:90px;"><div class="hr-spin"></div></div></div>';
    var hdr = '<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:#5E5A4F;margin-bottom:8px;">Onboarding</div><h1 style="font-size:34px;font-weight:300;letter-spacing:-.02em;margin:0 0 24px;">Klaar voor een vliegende start</h1>';
    if (!S.obPeople.length) return '<div class="scr" style="max-width:1320px;margin:0 auto;">' + hdr + '<div style="background:#FFFDF8;border-radius:24px;padding:44px;box-shadow:var(--shadow-card);text-align:center;"><div style="width:54px;height:54px;border-radius:16px;background:#F4F1E8;display:grid;place-items:center;margin:0 auto 14px;">' + ic('handshake', 24, 'color:#A7A293;') + '</div><div style="font-size:16px;font-weight:600;color:#050A30;">Nog geen onboardings</div><div style="font-size:13.5px;color:#8E8979;margin:6px auto 18px;max-width:440px;line-height:1.5;">Zet een kandidaat op “aangenomen” en die verschijnt hier automatisch, of voeg zelf een nieuwe collega toe.</div><button data-act="obAdd" style="font-family:inherit;font-size:14px;font-weight:600;background:#050A30;color:#fff;border:none;border-radius:12px;padding:10px 18px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;">' + ic('plus', 16) + 'Nieuwe collega</button></div></div>';
    if (!S.obPersonId || !S.obPeople.some(function (p) { return p.id === S.obPersonId; })) S.obPersonId = S.obPeople[0].id;
    var sel = S.obPeople.filter(function (p) { return p.id === S.obPersonId; })[0];

    // LINKER RAIL
    var rail = S.obPeople.map(function (p) {
      var t = obTotals(p.id); var on = p.id === S.obPersonId;
      var trackBg = on ? 'rgba(247,243,234,.18)' : '#EFEADD', fill = on ? '#D1F24C' : '#0F2EA3';
      return '<div class="hov-lift" data-act="obSelect" data-arg="' + esc(p.id) + '" style="background:' + (on ? '#050A30' : '#FFFDF8') + ';color:' + (on ? '#F7F3EA' : '#050A30') + ';border-radius:16px;padding:15px 16px;cursor:pointer;box-shadow:var(--shadow-card);">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;"><div style="min-width:0;"><div style="font-size:16px;font-weight:600;line-height:1.2;">' + esc(p.name) + '</div><div style="font-size:12.5px;color:' + (on ? 'rgba(247,243,234,.7)' : '#8E8979') + ';margin-top:2px;">' + esc(p.role) + '</div></div><span style="font-size:13px;font-weight:700;color:' + (on ? '#D1F24C' : '#0F2EA3') + ';flex:none;">' + t.pct + '%</span></div>' +
        '<div style="height:6px;border-radius:99px;background:' + trackBg + ';margin:11px 0 10px;overflow:hidden;"><div style="height:100%;width:' + t.pct + '%;background:' + fill + ';border-radius:99px;"></div></div>' +
        '<div style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:' + (on ? 'rgba(247,243,234,.6)' : '#A7A293') + ';">' + (p.start ? ic('calendar', 13) + 'Start ' + esc(p.start) : '') + (p.start && p.buddy ? '<span style="opacity:.5;">·</span>' : '') + (p.buddy ? ic('user', 13) + esc(p.buddy) : '') + (!p.start && !p.buddy ? '<span style="font-style:italic;">gegevens nog in te vullen</span>' : '') + '</div></div>';
    }).join('');

    // HERO
    var T = obTotals(sel.id);
    var heroKicker = (sel.dept || 'Afdeling n.t.b.') + (sel.start ? ' · start ' + sel.start : '');
    var heroSub = esc(sel.role || 'Rol n.t.b.') + (sel.buddy ? ' · buddy ' + esc(sel.buddy) : '');
    var ghostBtn = function (act, icon, label) { return '<button data-act="' + act + '" style="font-family:inherit;font-size:12.5px;font-weight:600;background:rgba(247,243,234,.1);color:#F7F3EA;border:1px solid rgba(247,243,234,.22);border-radius:9px;padding:6px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' + ic(icon, 14) + label + '</button>'; };
    var hero = '<div style="background:#050A30;border-radius:24px;padding:26px 28px;color:#F7F3EA;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;"><div><div style="font-size:12px;letter-spacing:.06em;font-weight:600;color:#28AFF9;margin-bottom:6px;">' + esc(heroKicker) + '</div><h2 style="font-size:26px;font-weight:300;letter-spacing:-.01em;margin:0;">' + esc(sel.name) + '</h2><div style="font-size:13.5px;color:rgba(247,243,234,.72);margin-top:4px;">' + heroSub + '</div><div style="display:flex;gap:8px;margin-top:14px;">' + ghostBtn('obEdit', 'pencil', 'Bewerk gegevens') + ghostBtn('obRemove', 'trash-2', 'Verwijder') + '</div></div><div style="text-align:right;"><div style="font-size:40px;font-weight:300;line-height:1;">' + T.pct + '%</div><div style="font-size:12px;color:rgba(247,243,234,.6);margin-top:4px;">' + T.dd + '/' + T.tt + ' taken klaar</div></div></div>' +
      '<div style="height:7px;border-radius:99px;background:rgba(247,243,234,.16);margin-top:-2px;overflow:hidden;"><div style="height:100%;width:' + T.pct + '%;background:#D1F24C;border-radius:99px;"></div></div>';

    // GESCHENKEN
    var giftDn = OB_GIFTS.filter(function (g) { return obDn(sel.id, 'gift_' + g.id); }).length;
    var gs = giftDn === 0 ? { l: 'Nog samen te stellen', bg: '#F0ECE0', fg: '#8E8979' } : (giftDn < OB_GIFTS.length ? { l: 'Wordt ingepakt', bg: '#FBF1D9', fg: '#6B4D04' } : { l: 'Klaar om te overhandigen', bg: '#EAF6D6', fg: '#4A6B0E' });
    var giftTiles = OB_GIFTS.map(function (g) {
      var on = obDn(sel.id, 'gift_' + g.id);
      return '<div data-act="obToggle" data-arg="' + esc(sel.id) + ':gift_' + g.id + '" style="display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:14px;cursor:pointer;background:' + (on ? '#EAF6D6' : '#FFFDF8') + ';border:1.5px solid ' + (on ? '#BFE08A' : '#ECE7DA') + ';">' +
        '<span style="width:38px;height:38px;border-radius:10px;flex:none;background:' + (on ? '#7FA830' : '#F0ECE0') + ';color:' + (on ? '#fff' : '#8E8979') + ';display:grid;place-items:center;">' + ic(g.icon, 18) + '</span>' +
        '<span style="flex:1;min-width:0;font-size:13.5px;font-weight:500;color:' + (on ? '#3C5310' : '#050A30') + ';">' + esc(g.label) + '</span>' +
        '<span style="width:22px;height:22px;border-radius:7px;flex:none;display:grid;place-items:center;background:' + (on ? '#7FA830' : 'transparent') + ';border:1.5px solid ' + (on ? '#7FA830' : '#CFC8B6') + ';color:#fff;">' + ic('check', 14, 'opacity:' + (on ? 1 : 0) + ';') + '</span></div>';
    }).join('');
    var gifts = '<div style="background:#0F2EA3;border-radius:24px;padding:24px;"><div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;"><span style="width:38px;height:38px;border-radius:11px;background:#D1F24C;color:#0F2EA3;display:grid;place-items:center;flex:none;">' + ic('gift', 19) + '</span><div style="flex:1;min-width:0;"><div style="font-size:17px;font-weight:500;color:#F7F3EA;">Welkomstpakket</div><div style="font-size:12.5px;color:rgba(247,243,234,.66);">vink af wat al ingepakt is</div></div><span style="font-size:12px;font-weight:600;color:' + gs.fg + ';background:' + gs.bg + ';padding:5px 12px;border-radius:99px;">' + gs.l + '</span></div><div style="display:grid;grid-template-columns:' + (isMobile() ? '1fr' : '1fr 1fr') + ';gap:10px;">' + giftTiles + '</div></div>';

    // FASEN
    var phases = OB_PHASES.map(function (ph) {
      var dn = ph.tasks.filter(function (t) { return obDn(sel.id, t.id); }).length; var all = dn === ph.tasks.length;
      var rows = ph.tasks.map(function (t, i) {
        var on = obDn(sel.id, t.id); var ow = OWNER_STYLE[t.owner] || { bg: '#EFEADD', fg: '#7A7565' };
        return '<div data-act="obToggle" data-arg="' + esc(sel.id) + ':' + t.id + '" style="display:flex;align-items:center;gap:12px;padding:12px 4px;cursor:pointer;' + (i ? 'border-top:1px solid #F2EEE3;' : '') + '">' +
          '<span style="width:22px;height:22px;border-radius:7px;flex:none;display:grid;place-items:center;background:' + (on ? '#0F2EA3' : 'transparent') + ';border:1.5px solid ' + (on ? '#0F2EA3' : '#CFC8B6') + ';color:#fff;">' + ic('check', 14, 'opacity:' + (on ? 1 : 0) + ';') + '</span>' +
          '<span style="flex:1;min-width:0;font-size:14px;color:' + (on ? '#A7A293' : '#050A30') + ';' + (on ? 'text-decoration:line-through;' : '') + '">' + esc(t.label) + '</span>' +
          '<span style="font-size:11px;font-weight:600;color:' + ow.fg + ';background:' + ow.bg + ';padding:3px 10px;border-radius:99px;flex:none;">' + t.owner + '</span></div>';
      }).join('');
      return '<div style="background:#FFFDF8;border:1px solid #ECE7DA;border-radius:22px;padding:20px 22px;box-shadow:var(--shadow-card);"><div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><span style="width:38px;height:38px;border-radius:10px;background:#E0F1FD;color:#0F2EA3;display:grid;place-items:center;flex:none;">' + ic(ph.icon, 19) + '</span><div style="flex:1;font-size:17px;font-weight:500;">' + ph.title + '</div><span style="font-size:12px;font-weight:600;color:' + (all ? '#4A6B0E' : '#8E8979') + ';background:' + (all ? '#EAF6D6' : '#F0ECE0') + ';padding:4px 11px;border-radius:99px;">' + dn + '/' + ph.tasks.length + '</span></div>' + rows + '</div>';
    }).join('');

    var col = isNarrow() ? '1fr' : '300px 1fr';
    return '<div class="scr" style="max-width:1320px;margin:0 auto;">' + hdr +
      '<div style="display:grid;grid-template-columns:' + col + ';gap:16px;align-items:start;">' +
        '<div style="display:flex;flex-direction:column;gap:12px;"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-left:2px;"><span style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:#8E8979;">Nieuwe collega’s</span><button data-act="obAdd" title="Nieuwe collega toevoegen" style="width:28px;height:28px;border-radius:8px;background:#050A30;color:#fff;border:none;cursor:pointer;display:grid;place-items:center;flex:none;">' + ic('plus', 16) + '</button></div>' + rail + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:16px;">' + hero + gifts + phases + '</div>' +
      '</div></div>';
  }

  /* ========================================================================
   * AUTOMATISERINGEN — "Wat de AI voor je doet" (statisch + live tellers)
   * ====================================================================== */
  var AUTOMATIONS = [
    { id: 'screening', icon: 'scan-search', title: 'CV-screening & matchscore', desc: 'Elk binnengekomen CV wordt automatisch afgetoetst aan de vacature en krijgt een matchscore met samenvatting, sterktes en aandachtspunten.', status: 'active', runs: 'automatisch bij elke sollicitatie' },
    { id: 'afwijs', icon: 'heart-handshake', title: 'Afwijzing met feedback', desc: 'Een respectvolle afwijzingsmail in jullie tone of voice, met bruikbare feedback. Jij keurt goed, de AI verstuurt.', status: 'active', runs: 'op aanvraag per kandidaat' },
    { id: 'case', icon: 'file-text', title: 'Case / assessment genereren', desc: 'De AI stelt een functiegerichte case op voor de assessmentronde, klaar om door te sturen.', status: 'active', runs: 'op aanvraag per kandidaat' },
    { id: 'contract', icon: 'file-signature', title: 'Contract automatisch opstellen', desc: 'Bij een aanbod genereert de AI een contractvoorstel op basis van het kandidaatdossier.', status: 'active', runs: 'op aanvraag per kandidaat' },
    { id: 'vacaturetekst', icon: 'wand-sparkles', title: 'AI-vacaturetekst', desc: 'Geef functie, locatie en niveau op en de AI schrijft een volledige vacaturetekst in jullie tone of voice.', status: 'active', runs: 'in de vacature-wizard' },
    { id: 'social', icon: 'share-2', title: 'Social-lancering van vacatures', desc: 'Een nieuwe vacature wordt vertaald naar een social-caption en als concept ingepland via Metricool.', status: 'active', runs: 'bij publicatie van een vacature' },
    { id: 'bevestiging', icon: 'mail-check', title: 'Bevestigingsmail bij sollicitatie', desc: 'Elke sollicitant krijgt automatisch een warme ontvangstbevestiging.', status: 'soon', runs: 'binnenkort' },
    { id: 'rapport', icon: 'bar-chart-3', title: 'Wekelijks hiring-rapport', desc: 'Elke maandag een overzicht van je pipeline in je mailbox.', status: 'soon', runs: 'binnenkort' },
  ];
  function renderAutomatiseringen() {
    var cR = S.candidates != null; var d = dashStats();
    var activeCount = AUTOMATIONS.filter(function (a) { return a.status === 'active'; }).length;
    var miniCss = 'flex:1;min-width:0;'; var mv = function (v) { return cR ? String(v) : '…'; };
    var strip = '<div style="background:#FFFDF8;border-radius:20px;box-shadow:var(--shadow-card);padding:18px 24px;margin-bottom:22px;display:flex;gap:10px;flex-wrap:wrap;">' +
      [[mv(d.scored), 'AI-screenings uitgevoerd', '#0F2EA3'], [mv(d.total), 'kandidaten in pipeline', '#050A30'], [mv(d.strong), 'sterke matches (>85%)', '#4A6B0E']].map(function (s) { return '<div style="' + miniCss + '"><div style="font-size:26px;font-weight:300;line-height:1;color:' + s[2] + ';">' + s[0] + '</div><div style="font-size:12px;color:#8E8979;margin-top:5px;">' + s[1] + '</div></div>'; }).join('') + '</div>';
    var cards = AUTOMATIONS.map(function (a) {
      var on = a.status === 'active';
      var runs = (a.id === 'screening' && cR) ? (d.scored + ' kandidaten gescreend') : a.runs;
      return '<div style="background:#FFFDF8;border-radius:20px;padding:22px;box-shadow:var(--shadow-card);display:flex;gap:15px;">' +
        '<span style="width:44px;height:44px;border-radius:12px;background:' + (on ? '#E0F1FD' : '#EFEADD') + ';color:' + (on ? '#0F2EA3' : '#8E8979') + ';display:grid;place-items:center;flex:none;">' + ic(a.icon, 22) + '</span>' +
        '<div style="flex:1;min-width:0;"><div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:6px;"><div style="flex:1;font-size:15.5px;font-weight:600;line-height:1.3;">' + esc(a.title) + '</div><span style="font-size:11px;font-weight:600;color:' + (on ? '#4A6B0E' : '#C99410') + ';background:' + (on ? '#F4FBDB' : '#FBF1D9') + ';padding:4px 10px;border-radius:99px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:6px;height:6px;border-radius:50%;background:' + (on ? '#D1F24C' : '#C99410') + ';"></span>' + (on ? 'Actief' : 'Binnenkort') + '</span></div>' +
        '<p style="font-size:13px;line-height:1.5;color:#5E5A4F;margin:0 0 12px;">' + esc(a.desc) + '</p>' +
        '<div style="font-size:12px;color:#8E8979;"><span style="font-weight:600;color:' + (on ? '#4A6B0E' : '#C99410') + ';">' + (on ? 'Actief' : 'Binnenkort') + '</span> · ' + esc(runs) + '</div></div></div>';
    }).join('');
    return '<div class="scr" style="max-width:1100px;margin:0 auto;">' +
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px;flex-wrap:wrap;"><div><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:#5E5A4F;margin-bottom:8px;">Automatiseringen</div><h1 style="font-size:34px;font-weight:300;letter-spacing:-.02em;margin:0;">Wat de AI voor je doet</h1></div><span style="display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:#4A6B0E;background:#F4FBDB;padding:8px 15px;border-radius:99px;"><span style="width:6px;height:6px;border-radius:50%;background:#D1F24C;"></span>' + activeCount + ' van ' + AUTOMATIONS.length + ' actief</span></div>' +
      strip + '<div style="display:grid;grid-template-columns:' + (isMobile() ? '1fr' : '1fr 1fr') + ';gap:14px;">' + cards + '</div></div>';
  }

  /* ========================================================================
   * INSTELLINGEN — verbonden kanalen + tone of voice + team
   * ====================================================================== */
  function mockIntegrations() { return [
    { id: 'linkedin', name: 'LinkedIn', cat: 'Jobboard', note: 'Vacatures + kandidaten', connected: true, manage_url: 'https://www.linkedin.com/' },
    { id: 'indeed', name: 'Indeed', cat: 'Jobboard', note: 'Automatisch posten', connected: true, manage_url: '' },
    { id: 'vdab', name: 'VDAB', cat: 'Jobboard', note: 'Vlaamse arbeidsmarkt', connected: true, manage_url: '' },
    { id: 'jobat', name: 'Jobat / StepStone', cat: 'Jobboard', note: 'Niet verbonden', connected: false, manage_url: '' },
    { id: 'social', name: 'Facebook & Instagram', cat: 'Social', note: 'Meta Business', connected: true, manage_url: 'https://business.facebook.com/' },
    { id: 'website', name: 'Eigen website', cat: 'Kanaal', note: 'studio27.be/vacatures', connected: true, manage_url: '' },
    { id: 'gmail', name: 'Gmail', cat: 'Communicatie', note: 'Mails versturen', connected: true, manage_url: '' },
    { id: 'gcal', name: 'Google Calendar', cat: 'Agenda', note: 'Gesprekken plannen', connected: true, manage_url: '' },
    { id: 'anthropic', name: 'AI-modellen', cat: 'AI', note: 'Claude / Gemini / GPT', connected: true, manage_url: '' } ]; }
  var INT_ICON = { linkedin: 'linkedin', indeed: 'briefcase', vdab: 'landmark', jobat: 'newspaper', social: 'share-2', website: 'globe', gmail: 'mail', gcal: 'calendar', metricool: 'megaphone', database: 'database', anthropic: 'sparkles' };
  function instTagFor(m) { return S.reviewerRoles[m.id] || (S.me && m.id === S.me.id ? 'Beheerder' : 'Beoordelaar'); }
  function instTagStyle(t) { return t === 'Beheerder' ? { bg: '#E0F1FD', fg: '#0F2EA3' } : t === 'Bekijker' ? { bg: '#F0ECE0', fg: '#5E5A4F' } : { bg: '#F4FBDB', fg: '#4A6B0E' }; }
  function renderInstellingen() {
    if (S.integrations == null) return '<div class="scr" style="max-width:1100px;margin:0 auto;"><div style="display:grid;place-items:center;padding:90px;"><div class="hr-spin"></div></div></div>';
    var cards = S.integrations.map(function (g) {
      var on = !!g.connected; var icon = INT_ICON[g.id] || 'plug';
      var btn = on
        ? '<button data-act="manageIntegration" data-arg="' + esc(g.manage_url || '') + '" style="width:100%;margin-top:14px;font-family:inherit;font-size:13px;font-weight:600;background:#F7F3EA;color:#050A30;border:none;border-radius:10px;padding:9px;cursor:pointer;">Beheer</button>'
        : '<button data-act="connectIntegration" data-arg="' + esc(g.id) + '" style="width:100%;margin-top:14px;font-family:inherit;font-size:13px;font-weight:600;background:#fff;color:#5E5A4F;border:1px solid #DFD9C8;border-radius:10px;padding:9px;cursor:pointer;">Verbind</button>';
      return '<div style="background:#FFFDF8;border-radius:18px;padding:20px;border:1.5px solid ' + (on ? '#D1F24C' : '#EFEADD') + ';opacity:' + (on ? 1 : 0.66) + ';">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;"><span style="width:44px;height:44px;border-radius:11px;background:#F7F3EA;color:#050A30;display:grid;place-items:center;">' + ic(icon, 22) + '</span><span style="font-size:11px;font-weight:600;color:' + (on ? '#4A6B0E' : '#8E8979') + ';background:' + (on ? '#F4FBDB' : '#EFEADD') + ';padding:4px 10px;border-radius:99px;display:inline-flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:' + (on ? '#D1F24C' : '#C4BEAC') + ';"></span>' + (on ? 'Verbonden' : 'Verbinden') + '</span></div>' +
        '<div style="font-size:15px;font-weight:600;">' + esc(g.name) + '</div><div style="font-size:12.5px;color:#8E8979;margin-top:2px;">' + esc(g.cat) + ' · ' + esc(g.note) + '</div>' + btn + '</div>';
    }).join('');
    var roster = (S.roster || []);
    var teamRows = roster.length ? roster.map(function (m) {
      var tag = instTagFor(m); var ts = instTagStyle(tag);
      return '<div style="display:flex;align-items:center;gap:12px;background:#FBF9F3;border:1px solid #EFEADD;border-radius:13px;padding:11px 14px;"><div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:600;color:#050A30;">' + esc(m.naam) + '</div><div style="font-size:11.5px;color:#8E8979;">' + (m.pool ? 'Productie' : 'Team') + (S.me && m.id === S.me.id ? ' · jij' : '') + '</div></div><span style="font-size:11px;font-weight:600;color:' + ts.fg + ';background:' + ts.bg + ';padding:4px 11px;border-radius:99px;">' + tag + '</span></div>';
    }).join('') : '<div style="font-size:12.5px;color:#A7A293;padding:6px 2px;">Geen teamleden gevonden.</div>';
    var ht = S.hrTone || { tone: '', extra: '' };
    var taCss = 'width:100%;font-family:inherit;font-size:13px;line-height:1.55;border:1px solid #DFD9C8;border-radius:12px;padding:12px 14px;background:#fff;color:#26241F;resize:vertical;';
    var toneCard = '<div style="background:#FFFDF8;border-radius:20px;padding:24px;box-shadow:var(--shadow-card);">' +
      '<div style="display:flex;align-items:center;gap:11px;margin-bottom:4px;flex-wrap:wrap;"><span style="width:38px;height:38px;border-radius:10px;background:#050A30;color:#D1F24C;display:grid;place-items:center;flex:none;">' + ic('message-square-quote', 19) + '</span><div style="flex:1;min-width:0;"><div style="font-size:17px;font-weight:500;">Tone of voice</div><div style="font-size:12.5px;color:#8E8979;">De AI schrijft élke mail, case en tekst in jouw stem.</div></div><button data-act="toneSave" style="font-family:inherit;font-size:13px;font-weight:600;background:#D1F24C;color:#050A30;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;">' + ic('check', 15) + 'Opslaan</button></div>' +
      (S.hrTone == null ? '<div style="display:grid;place-items:center;padding:34px;"><div class="hr-spin"></div></div>' :
        '<label style="font-size:12px;font-weight:600;margin:16px 0 6px;display:block;">Jouw schrijfstijl</label><textarea id="tone-main" rows="10" style="' + taCss + '">' + esc(ht.tone) + '</textarea>' +
        '<label style="font-size:12px;font-weight:600;margin:14px 0 6px;display:block;">Extra richtlijn (optioneel)</label><textarea id="tone-extra" rows="2" placeholder="bv. Vermeld dat we in Rijkevorsel zitten." style="' + taCss + '">' + esc(ht.extra) + '</textarea>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;flex-wrap:wrap;"><span style="font-size:11.5px;color:#A7A293;">Wordt achter elke AI-prompt gezet: afwijsmails, uitnodigingen, cases, vacatures én de AI Assistant.</span><button data-act="toneReset" style="font-family:inherit;font-size:12px;font-weight:600;background:none;border:none;color:#2458EA;cursor:pointer;">Standaard herstellen</button></div>') +
      '</div>';
    return '<div class="scr" style="max-width:1100px;margin:0 auto;">' +
      '<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:#5E5A4F;margin-bottom:8px;">Instellingen</div><h1 style="font-size:34px;font-weight:300;letter-spacing:-.02em;margin:0 0 24px;">Integraties &amp; voorkeuren</h1>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;"><h3 style="font-size:18px;font-weight:500;margin:0;">Verbonden kanalen &amp; tools</h3><span style="font-size:12px;font-weight:600;color:#0F2EA3;background:#E0F1FD;padding:4px 11px;border-radius:99px;">' + S.connectedCount + ' verbonden</span></div>' +
      '<div style="display:grid;grid-template-columns:' + (isMobile() ? '1fr' : isNarrow() ? '1fr 1fr' : '1fr 1fr 1fr') + ';gap:14px;margin-bottom:22px;">' + cards + '</div>' +
      toneCard + '</div>';
  }

  /* ========================================================================
   * DASHBOARD — KPI's + 4 kerngebieden + recente activiteit (echte data)
   * ====================================================================== */
  var MONTHS_LONG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var DAYS_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  function relTime(ts) { if (!ts) return ''; var dd = Math.floor((Date.now() - Number(ts)) / 86400000); if (dd <= 0) return 'vandaag'; if (dd === 1) return 'gisteren'; if (dd < 14) return dd + ' dagen geleden'; return fmtDate(ts); }
  function dashStats() {
    var cands = (S.candidates || []).filter(function (c) { return !c.spam; });
    var jobs = S.jobs || [];
    function st(k) { return cands.filter(function (c) { return stageOf(c) === k; }).length; }
    return {
      cands: cands, jobs: jobs,
      openVac: jobs.filter(function (j) { return j.actief; }).length,
      concept: jobs.filter(function (j) { return j.is_draft; }).length,
      archived: jobs.filter(function (j) { return j.is_archived; }).length,
      total: cands.length,
      nieuwWeek: cands.filter(function (c) { return c.ts && (Date.now() - c.ts) < 8 * 86400000; }).length,
      strong: cands.filter(function (c) { return c.ai && Number(c.ai.score) >= 85; }).length,
      scored: cands.filter(function (c) { return c.ai && Number(c.ai.score) > 0; }).length,
      nieuw: st('nieuw'), screening: st('screening'), gesprek: st('gesprek'), assessment: st('assessment'), aanbod: st('aanbod'),
    };
  }
  function renderDashboard() {
    if (S.candidates == null && S.jobs == null) return '<div class="scr" style="max-width:1180px;margin:0 auto;"><div style="display:grid;place-items:center;padding:90px;"><div class="hr-spin"></div></div></div>';
    var candR = S.candidates != null, jobR = S.jobs != null;
    var d = dashStats();
    var dv = function (v, ok) { return ok ? String(v) : '…'; };
    var now = new Date();
    var dateStr = DAYS_LONG[now.getDay()] + ' ' + now.getDate() + ' ' + MONTHS_LONG[now.getMonth()] + ' ' + now.getFullYear();
    var col4 = isMobile() ? '1fr 1fr' : (isNarrow() ? 'repeat(2,1fr)' : 'repeat(4,1fr)');
    var twoCol = isNarrow() ? '1fr' : '1.4fr 1fr';

    var kpis = [
      { value: dv(d.openVac, jobR), label: 'Open vacatures', trend: jobR && d.concept ? d.concept + ' concept' : '', trendColor: '#C99410' },
      { value: dv(d.total, candR), label: 'Sollicitanten in pipeline', trend: candR && d.nieuwWeek ? '+' + d.nieuwWeek + ' deze week' : '', trendColor: '#4A6B0E' },
      { value: dv(d.gesprek, candR), label: 'Gesprekken gepland', trend: candR && d.aanbod ? d.aanbod + ' in aanbod' : '', trendColor: '#5E5A4F' },
      { value: dv(d.scored, candR), label: 'AI-screenings', trend: 'automatisch', trendColor: '#2458EA' },
    ].map(function (k) {
      return '<div style="background:#FFFDF8;border-radius:24px;padding:22px 24px;box-shadow:var(--shadow-card);"><div style="display:flex;justify-content:flex-end;margin-bottom:14px;min-height:16px;"><span style="font-size:12px;font-weight:600;color:' + k.trendColor + ';">' + esc(k.trend) + '</span></div><div style="font-size:36px;font-weight:300;letter-spacing:-.02em;line-height:1;">' + k.value + '</div><div style="font-size:13px;color:#5E5A4F;margin-top:6px;">' + k.label + '</div></div>';
    }).join('');

    var pillars = [
      { title: 'Vacaturebeheer', subtitle: 'open functies & verspreiding', cta: 'Naar vacatures', go: 'vacatures', rows: [{ l: 'Open vacatures', v: dv(d.openVac, jobR), c: '#050A30' }, { l: 'Concepten', v: jobR ? d.concept + ' concept' : '…', c: '#C99410' }, { l: 'Gearchiveerd', v: dv(d.archived, jobR), c: '#2458EA' }] },
      { title: 'Kandidaatbeheer', subtitle: 'wie solliciteerde waarvoor', cta: 'Naar kandidaten', go: 'kandidaten', rows: [{ l: 'Totaal in pipeline', v: dv(d.total, candR), c: '#050A30' }, { l: 'Nieuw, te screenen', v: dv(d.nieuw, candR), c: '#28AFF9' }, { l: 'AI-match > 85%', v: dv(d.strong, candR), c: '#4A6B0E' }] },
      { title: 'Selectieproces', subtitle: 'gekozen voor gesprek', cta: 'Naar selectie', go: 'selectie', rows: [{ l: 'Gesprek gepland', v: dv(d.gesprek, candR), c: '#2458EA' }, { l: 'In assessment', v: dv(d.assessment, candR), c: '#050A30' }, { l: 'In aanbod-fase', v: dv(d.aanbod, candR), c: '#4A6B0E' }] },
      { title: 'Onboarding', subtitle: 'nieuwe collega’s op weg', cta: 'Naar onboarding', go: 'onboarding', rows: [{ l: 'Gepland deze maand', v: '—', c: '#8E8979' }, { l: 'Checklist afgerond', v: '—', c: '#8E8979' }, { l: 'Module in opbouw', v: 'binnenkort', c: '#C99410' }] },
    ].map(function (p) {
      var rows = p.rows.map(function (r) { return '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 13px;background:#F7F3EA;border-radius:13px;"><span style="font-size:13.5px;">' + r.l + '</span><span style="font-size:13px;font-weight:600;color:' + r.c + ';">' + r.v + '</span></div>'; }).join('');
      return '<div class="hov-card" data-act="go" data-arg="' + p.go + '" style="background:#FFFDF8;border-radius:28px;padding:24px;box-shadow:var(--shadow-card);cursor:pointer;display:flex;flex-direction:column;min-height:264px;"><div style="margin-bottom:18px;"><div style="font-size:17px;font-weight:500;letter-spacing:-.01em;">' + p.title + '</div><div style="font-size:12px;color:#5E5A4F;margin-top:2px;">' + p.subtitle + '</div></div><div style="display:flex;flex-direction:column;gap:9px;flex:1;">' + rows + '</div><div style="margin-top:16px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#2458EA;">' + p.cta + ic('arrow-right', 15) + '</div></div>';
    }).join('');

    // recente activiteit uit echte sollicitaties (nieuwste eerst)
    var feed = d.cands.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }).slice(0, 6).map(function (c) {
      var stg = stageOf(c); var sm = STAGE_STATUS[stg] || 'Pipeline';
      var hasAi = c.ai && Number(c.ai.score) > 0;
      var icon = hasAi ? 'scan-search' : 'user-plus';
      var ibg = hasAi ? '#F4FBDB' : '#E0F1FD', icol = hasAi ? '#4A6B0E' : '#0F2EA3';
      var txt = esc(c.naam || 'Kandidaat') + ' solliciteerde voor ' + esc(c.vacature || 'een functie') + (hasAi ? ' — AI-match ' + Math.round(Number(c.ai.score)) + '%' : '');
      return '<div style="display:flex;gap:14px;padding:13px 0;border-bottom:1px solid #EFEADD;"><span style="width:34px;height:34px;border-radius:10px;flex:none;background:' + ibg + ';color:' + icol + ';display:grid;place-items:center;">' + ic(icon, 17) + '</span><div style="flex:1;min-width:0;"><div style="font-size:14px;line-height:1.4;">' + txt + '</div><div style="font-size:12px;color:#8E8979;margin-top:3px;">' + esc(relTime(c.ts)) + '</div></div><span style="font-size:11px;font-weight:600;color:#0F2EA3;background:#E0F1FD;padding:4px 9px;border-radius:99px;height:fit-content;white-space:nowrap;">' + esc(sm) + '</span></div>';
    }).join('') || '<div class="hr-empty">Nog geen recente sollicitaties.</div>';

    var strongCopy = d.strong > 0 ? (d.strong + (d.strong === 1 ? ' sterke match klaar voor een gesprek' : ' sterke matches klaar voor een gesprek')) : 'Nog geen sterke matches om in te plannen';
    var nudge = '<div style="background:#0F2EA3;border-radius:28px;padding:26px;display:flex;flex-direction:column;height:100%;min-height:200px;"><span style="width:38px;height:38px;border-radius:11px;background:#D1F24C;color:#0F2EA3;display:grid;place-items:center;margin-bottom:16px;">' + ic('wand-sparkles', 19) + '</span><h3 style="font-size:20px;font-weight:500;letter-spacing:-.01em;margin:0 0 8px;color:#F7F3EA;">' + esc(strongCopy) + '</h3><p style="font-size:14px;color:rgba(247,243,234,.78);margin:0 0 20px;">Kandidaten met een AI-match boven 85%, klaar om een gesprek voor te bereiden.</p><button data-act="go" data-arg="kandidaten" style="margin-top:auto;align-self:flex-start;font-family:inherit;font-weight:600;font-size:14px;background:#D1F24C;color:#050A30;border:none;border-radius:12px;padding:7px 7px 7px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;">Bekijk kandidaten<span style="width:28px;height:28px;border-radius:8px;background:#050A30;color:#D1F24C;display:grid;place-items:center;">' + ic('arrow-right', 15) + '</span></button></div>';

    return '<div class="scr" style="max-width:1180px;margin:0 auto;">' +
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:28px;flex-wrap:wrap;"><div><h1 style="font-size:38px;font-weight:300;letter-spacing:-.02em;margin:0;">Goeiemorgen, Vincent</h1></div><div style="text-align:right;font-size:13px;color:#5E5A4F;">' + esc(dateStr) + '<br><span style="color:#4A6B0E;font-weight:500;">' + (candR ? d.total + ' kandidaten in pipeline · ' + d.scored + ' AI-gescreend' : 'Data laden…') + '</span></div></div>' +
      '<div style="display:grid;grid-template-columns:' + col4 + ';gap:16px;margin-bottom:22px;">' + kpis + '</div>' +
      '<div style="display:grid;grid-template-columns:' + col4 + ';gap:16px;margin-bottom:22px;">' + pillars + '</div>' +
      '<div style="display:grid;grid-template-columns:' + twoCol + ';gap:16px;align-items:stretch;">' +
        '<div style="background:#FFFDF8;border-radius:28px;padding:26px;box-shadow:var(--shadow-card);"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"><div style="display:flex;align-items:center;gap:10px;"><span style="width:34px;height:34px;border-radius:10px;background:#050A30;color:#D1F24C;display:grid;place-items:center;">' + ic('activity', 18) + '</span><h3 style="font-size:18px;font-weight:500;margin:0;">Recente activiteit</h3></div><span style="font-size:12px;font-weight:600;color:#4A6B0E;background:#F4FBDB;padding:5px 11px;border-radius:99px;display:inline-flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:#D1F24C;"></span>live</span></div><div style="display:flex;flex-direction:column;">' + feed + '</div></div>' +
        nudge +
      '</div></div>';
  }

  /* ========================================================================
   * VACATURES — lijst + AI-vacaturewizard (echte Webflow-data)
   * ====================================================================== */
  var PLATFORMS = [
    { key: 'website', name: 'Eigen website', icon: 'globe', desc: 'studio27.be/vacatures', backend: true },
    { key: 'linkedin', name: 'LinkedIn', icon: 'linkedin', desc: 'Professioneel netwerk' },
    { key: 'indeed', name: 'Indeed', icon: 'briefcase', desc: 'Grootste jobboard' },
    { key: 'vdab', name: 'VDAB', icon: 'landmark', desc: 'Vlaamse arbeidsmarkt' },
    { key: 'social', name: 'Facebook & Instagram', icon: 'share-2', desc: 'Metricool concept', backend: true },
    { key: 'jobat', name: 'Jobat / StepStone', icon: 'newspaper', desc: 'Premium jobboard' },
  ];
  var REACH = { website: 600, linkedin: 4500, indeed: 6200, vdab: 3100, social: 8000, jobat: 2400 };
  function vacStatus(j) {
    if (j.is_archived) return { label: 'Gearchiveerd', bg: '#EFEADD', fg: '#8E8979', dot: '#C4BEAC' };
    if (j.actief) return { label: 'Actief', bg: '#F4FBDB', fg: '#4A6B0E', dot: '#4A6B0E' };
    if (j.is_draft) return { label: 'Concept', bg: '#FBF1D9', fg: '#6B4D04', dot: '#C99410' };
    return { label: 'Niet actief', bg: '#EFEADD', fg: '#8E8979', dot: '#C4BEAC' };
  }
  function normName(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function jobApplicants(name) {
    var n = normName(name); if (!n || S.candidates == null) return { total: '–', nieuw: 0 };
    var ms = S.candidates.filter(function (c) { return !c.spam && normName(c.vacature).indexOf(n.slice(0, 12)) >= 0; });
    var nieuw = ms.filter(function (c) { return c.ts && (Date.now() - c.ts) < 8 * 86400000; }).length;
    return { total: ms.length, nieuw: nieuw };
  }
  function renderVacatures() {
    if (S.jobs == null) return '<div class="scr" style="max-width:1180px;margin:0 auto;"><div style="display:grid;place-items:center;padding:80px;"><div class="hr-spin"></div></div></div>';
    if (S.jobsErr) return '<div class="scr" style="max-width:1180px;margin:0 auto;"><div class="hr-empty">' + esc(S.jobsErr) + '</div></div>';
    var rows = S.jobs.length ? S.jobs.map(function (j) {
      var st = vacStatus(j); var ap = jobApplicants(j.name);
      var diensten = (j.diensten || []).slice(0, 3).map(function (d) { return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:#0F2EA3;background:#E0F1FD;padding:5px 11px;border-radius:8px;">' + ic('layers', 14) + esc(d) + '</span>'; }).join('');
      return '<div class="hov-card" data-act="openJob" data-arg="' + esc(j.name) + '" style="background:#FFFDF8;border-radius:24px;padding:22px 26px;box-shadow:var(--shadow-card);cursor:pointer;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;">' +
        '<div style="min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;"><span style="font-size:20px;font-weight:500;letter-spacing:-.01em;">' + esc(j.name || 'Vacature') + '</span><span style="font-size:12px;font-weight:600;background:' + st.bg + ';color:' + st.fg + ';padding:4px 11px;border-radius:99px;display:inline-flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:' + st.dot + ';"></span>' + st.label + '</span></div>' +
          '<div style="display:flex;gap:18px;font-size:13px;color:#5E5A4F;margin-bottom:14px;flex-wrap:wrap;">' +
            (j.diensten && j.diensten.length ? '<span style="display:inline-flex;align-items:center;gap:6px;">' + ic('building-2', 15, 'color:#8E8979;') + esc(j.diensten.join(', ')) + '</span>' : '') +
            (j.last_published ? '<span style="display:inline-flex;align-items:center;gap:6px;">' + ic('calendar', 15, 'color:#8E8979;') + 'geplaatst ' + esc(fmtDate(Date.parse(j.last_published) || 0) || '—') + '</span>' : '') +
            '<a href="' + esc(j.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:6px;color:#2458EA;">' + ic('external-link', 15) + 'Op studio27.be</a>' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + (diensten || '<span style="font-size:12px;color:#A8A292;">Eigen website</span>') + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:26px;"><div style="text-align:center;"><div style="font-size:30px;font-weight:300;line-height:1;">' + ap.total + '</div><div style="font-size:11px;color:#8E8979;margin-top:4px;">sollicitanten</div>' + (ap.nieuw ? '<div style="font-size:11px;font-weight:600;color:#4A6B0E;margin-top:3px;">+' + ap.nieuw + ' nieuw</div>' : '') + '</div><span style="width:40px;height:40px;border-radius:11px;background:#F7F3EA;color:#2458EA;display:grid;place-items:center;">' + ic('chevron-right', 20) + '</span></div>' +
      '</div>';
    }).join('') : '<div style="background:#FFFDF8;border-radius:24px;padding:40px;box-shadow:var(--shadow-card);text-align:center;color:#8E8979;">Nog geen vacatures. Maak er een aan met de AI-wizard.</div>';
    return '<div class="scr" style="max-width:1180px;margin:0 auto;">' +
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px;"><div><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:#5E5A4F;margin-bottom:8px;">Vacaturebeheer</div><h1 style="font-size:34px;font-weight:300;letter-spacing:-.02em;margin:0;">Open functies &amp; verspreiding</h1></div>' +
        '<button data-act="go" data-arg="nieuwe-vacature" style="font-family:inherit;font-size:14px;font-weight:600;background:#050A30;color:#fff;border:none;border-radius:12px;padding:8px 8px 8px 18px;cursor:pointer;display:flex;align-items:center;gap:11px;">Nieuwe vacature<span style="width:30px;height:30px;border-radius:9px;background:#fff;color:#050A30;display:grid;place-items:center;">' + ic('plus', 17) + '</span></button></div>' +
      '<div style="display:flex;gap:10px;margin-bottom:20px;"><span style="font-size:13px;font-weight:600;background:#050A30;color:#F7F3EA;padding:8px 16px;border-radius:99px;">Alle (' + S.jobs.length + ')</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:14px;">' + rows + '</div></div>';
  }

  function wizDraftText(d) { if (!d) return ''; var strip = function (h) { return String(h || '').replace(/<li>/g, '• ').replace(/<\/li>/g, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim(); }; return [d.intro, d.verwachten ? 'Wat je doet\n' + strip(d.verwachten) : '', d.profiel ? 'Wat we zoeken\n' + strip(d.profiel) : '', d.aanbieden ? 'Wat je krijgt\n' + strip(d.aanbieden) : ''].filter(Boolean).join('\n\n'); }
  function renderNieuweVacature() {
    var w = S.wiz || (S.wiz = { step: 1, title: '', dept: 'Engineering', loc: 'Geel', type: 'Voltijds', level: 'Medior', draft: null, generating: false, platforms: { website: true }, publishing: false });
    var col2 = isMobile() ? '1fr' : '1fr 1fr';
    var steps = [{ n: 1, label: 'Functie' }, { n: 2, label: 'AI-tekst' }, { n: 3, label: 'Kanalen' }, { n: 4, label: 'Publiceren' }].map(function (s, i, arr) {
      var circleBg = w.step > s.n ? '#4A6B0E' : (w.step === s.n ? '#050A30' : '#EFEADD');
      var circleColor = w.step >= s.n ? '#fff' : '#8E8979'; var labelColor = w.step >= s.n ? '#050A30' : '#8E8979';
      return '<div style="display:flex;align-items:center;gap:10px;"><span style="width:30px;height:30px;border-radius:50%;background:' + circleBg + ';color:' + circleColor + ';display:grid;place-items:center;font-size:13px;font-weight:600;flex:none;">' + (w.step > s.n ? ic('check', 15) : s.n) + '</span><span style="font-size:14px;font-weight:500;color:' + labelColor + ';">' + s.label + '</span></div>' + (i === arr.length - 1 ? '' : '<span style="flex:1;height:1px;background:#DFD9C8;margin:0 14px;min-width:24px;"></span>');
    }).join('');
    var body = '';
    if (w.step === 1) {
      var sel = function (id, label, val, opts) { return '<div><label style="font-size:12px;font-weight:600;margin-bottom:7px;display:block;">' + label + '</label><select id="' + id + '" style="width:100%;font-family:inherit;font-size:15px;padding:12px 14px;background:#fff;border:1px solid #DFD9C8;border-radius:11px;color:#050A30;">' + opts.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>'; };
      body = '<div style="background:#FFFDF8;border-radius:24px;padding:30px;box-shadow:var(--shadow-card);"><h3 style="font-size:18px;font-weight:500;margin:0 0 4px;">Vertel ons over de functie</h3><p style="font-size:14px;color:#5E5A4F;margin:0 0 22px;">De AI gebruikt deze gegevens om de vacaturetekst te schrijven.</p>' +
        '<div style="display:flex;flex-direction:column;gap:18px;"><div><label style="font-size:12px;font-weight:600;margin-bottom:7px;display:block;">Functietitel</label><input id="wiz-title" value="' + esc(w.title) + '" placeholder="bv. Senior Software Engineer" style="width:100%;font-family:inherit;font-size:15px;padding:12px 14px;background:#fff;border:1px solid #DFD9C8;border-radius:11px;color:#050A30;"></div>' +
        '<div style="display:grid;grid-template-columns:' + col2 + ';gap:16px;">' + sel('wiz-dept', 'Afdeling', w.dept, ['Engineering', 'Service', 'Sales', 'Marketing', 'Finance', 'Support']) + sel('wiz-loc', 'Locatie', w.loc, ['Geel', 'Turnhout', 'Antwerpen', 'Mol', 'Hybride']) + sel('wiz-type', 'Contract', w.type, ['Voltijds', '4/5', 'Deeltijds', 'Interim']) + sel('wiz-level', 'Niveau', w.level, ['Junior', 'Medior', 'Senior', 'Lead']) + '</div></div></div>';
    } else if (w.step === 2) {
      var draftBlock = w.draft
        ? '<div style="background:#fff;border:1px solid #EFEADD;border-radius:14px;padding:22px;font-size:14px;line-height:1.6;color:#26241F;white-space:pre-line;max-height:360px;overflow-y:auto;">' + esc(wizDraftText(w.draft)) + '</div>'
        : '<div style="border:1.5px dashed #DFD9C8;border-radius:14px;padding:46px 22px;text-align:center;color:#8E8979;">' + ic('file-pen-line', 34, 'color:#C4BEAC;') + '<div style="font-size:15px;margin-top:12px;font-weight:500;color:#5E5A4F;">Klik op “Genereer tekst” om te starten</div><div style="font-size:13px;margin-top:4px;">De AI schrijft een eerste draft in jullie tone of voice.</div></div>';
      body = '<div style="background:#FFFDF8;border-radius:24px;padding:30px;box-shadow:var(--shadow-card);"><div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;"><div style="display:flex;align-items:center;gap:11px;"><span style="width:36px;height:36px;border-radius:10px;background:#050A30;color:#D1F24C;display:grid;place-items:center;">' + ic('sparkles', 19) + '</span><div><h3 style="font-size:18px;font-weight:500;margin:0;">AI-vacaturetekst</h3><div style="font-size:12.5px;color:#5E5A4F;">Geschreven in jullie tone of voice, duidelijk en warm.</div></div></div>' +
        '<button data-act="wiz" data-arg="generate" ' + (w.generating ? 'disabled' : '') + ' style="font-family:inherit;font-size:13.5px;font-weight:600;background:#D1F24C;color:#050A30;border:none;border-radius:11px;padding:9px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;white-space:nowrap;">' + ic(w.generating ? 'loader' : 'wand-sparkles', 16) + (w.generating ? 'Bezig…' : (w.draft ? 'Opnieuw' : 'Genereer tekst')) + '</button></div>' + draftBlock + '</div>';
    } else if (w.step === 3) {
      var cards = PLATFORMS.map(function (p) {
        var on = !!w.platforms[p.key];
        return '<div data-act="wiz" data-arg="plat:' + p.key + '" style="display:flex;align-items:center;gap:14px;padding:16px 18px;background:' + (on ? '#F4FBDB' : '#fff') + ';border:1.5px solid ' + (on ? '#D1F24C' : '#EFEADD') + ';border-radius:14px;cursor:pointer;transition:all .15s;">' +
          '<span style="width:42px;height:42px;border-radius:11px;background:' + (on ? '#050A30' : '#F7F3EA') + ';color:' + (on ? '#D1F24C' : '#8E8979') + ';display:grid;place-items:center;flex:none;">' + ic(p.icon, 21) + '</span>' +
          '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:500;">' + esc(p.name) + (p.backend ? '' : ' <span style="font-size:10px;color:#8E8979;">(binnenkort)</span>') + '</div><div style="font-size:12.5px;color:#8E8979;">' + esc(p.desc) + '</div></div>' +
          '<span style="width:24px;height:24px;border-radius:7px;background:' + (on ? '#4A6B0E' : 'transparent') + ';color:#fff;display:grid;place-items:center;flex:none;border:1.5px solid ' + (on ? '#4A6B0E' : '#C4BEAC') + ';">' + ic('check', 15, 'opacity:' + (on ? 1 : 0) + ';') + '</span></div>';
      }).join('');
      var sel = Object.keys(w.platforms).filter(function (k) { return w.platforms[k]; });
      var num = sel.reduce(function (a, k) { return a + (REACH[k] || 0); }, 0);
      var est = num >= 1000 ? (Math.round(num / 100) / 10).toFixed(1).replace('.', ',') + 'k' : ('' + num);
      body = '<div style="background:#FFFDF8;border-radius:24px;padding:30px;box-shadow:var(--shadow-card);"><h3 style="font-size:18px;font-weight:500;margin:0 0 4px;">Waar publiceren we?</h3><p style="font-size:14px;color:#5E5A4F;margin:0 0 22px;">Vink de kanalen aan. De website en Metricool worden echt aangestuurd; de jobboards volgen later.</p>' +
        '<div style="display:grid;grid-template-columns:' + col2 + ';gap:14px;">' + cards + '</div>' +
        '<div style="margin-top:20px;padding:16px 20px;background:#050A30;border-radius:14px;display:flex;align-items:center;gap:14px;color:#F7F3EA;"><span style="width:36px;height:36px;border-radius:10px;background:rgba(40,175,249,.2);color:#28AFF9;display:grid;place-items:center;flex:none;">' + ic('radio-tower', 19) + '</span><div style="flex:1;"><div style="font-size:14px;font-weight:500;">Geschat totaalbereik</div><div style="font-size:12.5px;color:rgba(247,243,234,.65);">over ' + sel.length + ' geselecteerde kanalen</div></div><div style="font-size:24px;font-weight:300;">± ' + est + '</div></div></div>';
    } else {
      var selC = Object.keys(w.platforms).filter(function (k) { return w.platforms[k]; }).length;
      body = '<div style="background:#FFFDF8;border-radius:24px;padding:30px;box-shadow:var(--shadow-card);"><h3 style="font-size:18px;font-weight:500;margin:0 0 18px;">Klaar om te publiceren</h3>' +
        '<div style="display:grid;grid-template-columns:' + col2 + ';gap:14px;margin-bottom:20px;"><div style="padding:16px 18px;background:#F7F3EA;border-radius:13px;"><div style="font-size:12px;color:#8E8979;margin-bottom:4px;">Functie</div><div style="font-size:15px;font-weight:500;">' + esc(w.title || '(geen titel)') + '</div></div><div style="padding:16px 18px;background:#F7F3EA;border-radius:13px;"><div style="font-size:12px;color:#8E8979;margin-bottom:4px;">Locatie &amp; contract</div><div style="font-size:15px;font-weight:500;">' + esc(w.loc) + ' · ' + esc(w.type) + '</div></div></div>' +
        '<div style="padding:18px 20px;background:#F4FBDB;border-radius:14px;margin-bottom:20px;"><div style="font-size:13px;font-weight:600;color:#4A6B0E;margin-bottom:12px;display:flex;align-items:center;gap:8px;">' + ic('zap', 16) + 'Automatiseringen die mee aanslaan</div><div style="display:flex;flex-direction:column;gap:9px;">' +
          ['Sollicitanten krijgen automatisch een bevestiging in jullie tone of voice', 'CV’s worden gescreend en krijgen een matchscore', 'Sterke matches worden voorgesteld voor een gesprek'].map(function (t) { return '<div style="display:flex;align-items:center;gap:9px;font-size:13.5px;color:#26241F;">' + ic('check-circle-2', 16, 'color:#4A6B0E;') + esc(t) + '</div>'; }).join('') + '</div></div>' +
        '<button data-act="wiz" data-arg="publish" ' + (w.publishing ? 'disabled' : '') + ' style="width:100%;font-family:inherit;font-size:16px;font-weight:600;background:#D1F24C;color:#050A30;border:none;border-radius:14px;padding:10px 10px 10px 22px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' + (w.publishing ? 'Bezig met publiceren…' : 'Publiceer op ' + selC + ' kanalen') + '<span style="width:38px;height:38px;border-radius:10px;background:#050A30;color:#fff;display:grid;place-items:center;">' + ic(w.publishing ? 'loader' : 'send', 18) + '</span></button></div>';
    }
    var prevVis = w.step > 1 ? 'visible' : 'hidden'; var nextVis = w.step < 4 ? 'visible' : 'hidden';
    return '<div class="scr" style="max-width:920px;margin:0 auto;">' +
      '<button data-act="go" data-arg="vacatures" style="font-family:inherit;font-size:13px;font-weight:500;background:none;border:none;color:#5E5A4F;cursor:pointer;display:flex;align-items:center;gap:7px;margin-bottom:18px;padding:0;">' + ic('arrow-left', 16) + 'Terug naar vacatures</button>' +
      '<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:#5E5A4F;margin-bottom:8px;">Nieuwe vacature</div><h1 style="font-size:32px;font-weight:300;letter-spacing:-.02em;margin:0 0 26px;">Stel een vacature op, met de AI</h1>' +
      '<div style="display:flex;align-items:center;gap:0;margin-bottom:28px;">' + steps + '</div>' + body +
      '<div style="display:flex;justify-content:space-between;margin-top:22px;"><button data-act="wiz" data-arg="prev" style="font-family:inherit;font-size:14px;font-weight:500;background:#fff;border:1px solid #DFD9C8;color:#5E5A4F;border-radius:12px;padding:11px 20px;cursor:pointer;visibility:' + prevVis + ';">Vorige</button><button data-act="wiz" data-arg="next" style="font-family:inherit;font-size:14px;font-weight:600;background:#050A30;color:#fff;border:none;border-radius:12px;padding:11px 12px 11px 22px;cursor:pointer;display:flex;align-items:center;gap:11px;visibility:' + nextVis + ';">Volgende<span style="width:28px;height:28px;border-radius:8px;background:#fff;color:#050A30;display:grid;place-items:center;">' + ic('arrow-right', 16) + '</span></button></div></div>';
  }

  /* ---------- placeholder voor nog-te-bouwen schermen ---------- */
  function renderPlaceholder(title, sub, icon) {
    return '<div class="scr" style="max-width:1100px;margin:0 auto;">' +
      '<h1 style="font-size:34px;font-weight:300;letter-spacing:-.02em;margin:0 0 8px;">' + esc(title) + '</h1>' +
      '<p style="font-size:15px;color:#5E5A4F;margin:0 0 28px;max-width:60ch;">' + esc(sub) + '</p>' +
      '<div style="background:#FFFDF8;border-radius:24px;padding:48px 40px;box-shadow:var(--shadow-card);text-align:center;">' +
        '<span style="width:64px;height:64px;border-radius:18px;background:#E0F1FD;color:#0F2EA3;display:inline-grid;place-items:center;margin-bottom:18px;">' + ic(icon || 'sparkles', 30) + '</span>' +
        '<div style="font-size:18px;font-weight:500;margin-bottom:8px;">Dit scherm komt eraan</div>' +
        '<div style="font-size:14px;color:#8E8979;max-width:46ch;margin:0 auto;">Ik bouw de schermen gefaseerd. Dit onderdeel volgt in een volgende fase.</div>' +
        '<button data-act="go" data-arg="kandidaten" style="margin-top:22px;font-family:inherit;font-size:14px;font-weight:600;background:#050A30;color:#fff;border:none;border-radius:12px;padding:11px 20px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;">' + ic('users', 16) + 'Naar de kandidaten</button>' +
      '</div></div>';
  }

  function renderScreen() {
    switch (S.screen) {
      case 'kandidaten': return renderKandidaten();
      case 'kandidaat': return renderKandidaat();
      case 'dashboard': return renderDashboard();
      case 'vacatures': return renderVacatures();
      case 'nieuwe-vacature': return renderNieuweVacature();
      case 'onboarding': return renderOnboarding();
      case 'selectie': return renderSelectie();
      case 'automatiseringen': return renderAutomatiseringen();
      case 'instellingen': return renderInstellingen();
      default: return renderKandidaten();
    }
  }

  function render() {
    var root = $('hr-root'); if (!root) return;
    if (!S.ready) { root.innerHTML = renderLogin(); bind(root); refreshIcons(); return; }
    var mainPad = isMobile() ? '20px 14px 40px' : '30px 26px 56px';
    root.innerHTML =
      '<div style="min-height:100vh;display:flex;flex-direction:column;">' +
        renderHeader() + renderNotifs() +
        '<div style="flex:1;display:flex;align-items:stretch;">' +
          '<main style="flex:1;min-width:0;padding:' + mainPad + ';">' + renderScreen() + '</main>' +
          renderCopilot() +
        '</div>' +
      '</div>';
    bind(root); bindPipelineDnd(root); bindAgendaDnd(root); refreshIcons();
  }

  /* ---------- events ---------- */
  function bind(root) {
    root.onclick = function (e) {
      var el = e.target.closest && e.target.closest('[data-act]'); if (!el) return;
      var act = el.getAttribute('data-act'), arg = el.getAttribute('data-arg');
      if (act === 'login') { e.preventDefault(); window.S27TeamAuth.google().catch(function () { toast('Inloggen mislukt, probeer opnieuw.'); }); return; }
      if (act === 'go') { e.preventDefault(); go(arg); return; }
      if (act === 'toggleNav') { S.navOpen = !S.navOpen; render(); return; }
      if (act === 'toggleNotifs') { S.notifsOpen = !S.notifsOpen; S.copilotOpen = false; render(); if (S.notifsOpen) loadNotifs(); return; }
      if (act === 'openNotif') { e.preventDefault(); openNotif(arg); return; }
      if (act === 'notifReadAll') { e.preventDefault(); notifReadAll(); return; }
      if (act === 'toggleCopilot') { S.copilotOpen = !S.copilotOpen; S.notifsOpen = false; render(); if (S.copilotOpen && S.asstModels == null) loadAsstModels(); return; }
      if (act === 'asstSend') { e.preventDefault(); var ta = root.querySelector('#asst-input'); asstSend(ta ? ta.value : ''); return; }
      if (act === 'asstChip') { e.preventDefault(); asstSend(arg); return; }
      if (act === 'toneSave') { e.preventDefault(); saveTone(); return; }
      if (act === 'toneReset') { e.preventDefault(); resetTone(); return; }
      if (act === 'openCand') { e.preventDefault(); go('kandidaat', arg); return; }
      if (act === 'cand') { e.preventDefault(); candAction(arg); return; }
      if (act === 'openJob') {
        e.preventDefault();
        var match = 'all';
        if (S.candidates) { var nn = normName(arg).slice(0, 12); var hit = S.candidates.filter(function (c) { return nn && normName(c.vacature).indexOf(nn) >= 0; })[0]; if (hit) match = hit.vacature || 'all'; }
        S.jobFilter = match; go('kandidaten'); return;
      }
      if (act === 'wiz') { e.preventDefault(); wizAct(arg); return; }
      if (act === 'obSelect') { e.preventDefault(); S.obPersonId = arg; window.scrollTo(0, 0); render(); return; }
      if (act === 'obToggle') { e.preventDefault(); obToggle(arg); return; }
      if (act === 'obAdd') { e.preventDefault(); S.modal = { type: 'obperson', person: null }; renderModal(); return; }
      if (act === 'obEdit') { e.preventDefault(); var pe = (S.obPeople || []).filter(function (x) { return x.id === S.obPersonId; })[0]; if (pe) { S.modal = { type: 'obperson', person: pe }; renderModal(); } return; }
      if (act === 'obRemove') { e.preventDefault(); obRemovePerson(S.obPersonId); return; }
      if (act === 'ag') { e.preventDefault(); agAct(arg); return; }
      if (act === 'openEv') { e.preventDefault(); openEventModal(arg); return; }
      if (act === 'railPlan') { e.preventDefault(); openPlanModal(arg); return; }
      if (act === 'manageIntegration') { e.preventDefault(); if (arg) window.open(arg, '_blank', 'noopener'); else toast('Beheerd door Studio 27, vraag Vincent.'); return; }
      if (act === 'connectIntegration') { e.preventDefault(); toast('Beheerd door Studio 27, vraag Vincent als dit gekoppeld moet worden.'); return; }
    };
    var srch = root.querySelector('#hrk-search'); if (srch) srch.oninput = function () { S.q = this.value; var v = visibleCandidates(); renderPipelineOnly(); };
    var jf = root.querySelector('#hrk-jobfilter'); if (jf) jf.onchange = function () { S.jobFilter = this.value; render(); };
    var amSel = root.querySelector('#asst-model'); if (amSel) amSel.onchange = function () { S.asstModel = this.value; try { localStorage.setItem('s27hr_model', this.value); } catch (e) {} };
    var aIn = root.querySelector('#asst-input'); if (aIn) { aIn.onkeydown = function (ev) { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); asstSend(this.value); } }; aIn.oninput = function () { this.style.height = 'auto'; this.style.height = Math.min(120, this.scrollHeight) + 'px'; }; if (!S.asstBusy) { aIn.focus(); } }
    var asc = root.querySelector('#asst-scroll'); if (asc) asc.scrollTop = asc.scrollHeight;
  }
  // Lichte re-render van enkel de pipeline (zoekfilter), zonder focus te verliezen
  async function loadAsstModels() {
    if (PREVIEW) { S.asstModels = [{ id: 'claude-opus-4-8', naam: 'Claude Opus 4.8', provider: 'Anthropic', available: true }, { id: 'claude-sonnet-4-6', naam: 'Claude Sonnet 4.6', provider: 'Anthropic', available: true }, { id: 'gpt-5.5', naam: 'GPT-5.5', provider: 'OpenAI', available: true }, { id: 'gpt-4o', naam: 'GPT-4o', provider: 'OpenAI', available: true }, { id: 'gemini-2.5-flash', naam: 'Gemini 2.5 Flash', provider: 'Google', available: true }, { id: 'gemini-2.5-pro', naam: 'Gemini 2.5 Pro', provider: 'Google', available: true }]; S.asstModel = 'claude-sonnet-4-6'; render(); return; }
    try { var r = await api('teamHrModels', {}); if (r && r.ok) { S.asstModels = r.models || []; var avail = S.asstModels.filter(function (m) { return m.available; }); S.asstModel = (r.standaard && S.asstModels.some(function (m) { return m.id === r.standaard && m.available; })) ? r.standaard : ((avail[0] || S.asstModels[0] || {}).id || ''); var saved = ''; try { saved = localStorage.getItem('s27hr_model') || ''; } catch (e2) {} if (saved && S.asstModels.some(function (m) { return m.id === saved && m.available; })) S.asstModel = saved; render(); } } catch (e) { /* */ }
  }
  async function asstSend(text) {
    text = String(text || '').trim(); if (!text || S.asstBusy) return;
    S.asstMsgs.push({ role: 'user', content: text }); S.asstBusy = true; render();
    if (PREVIEW) { setTimeout(function () { S.asstMsgs.push({ role: 'assistant', content: 'In de voorbeeldmodus praat ik niet met de echte database. Ingelogd krijg je hier een echt antwoord op basis van al je kandidaten en hun CV-teksten, met het model dat je bovenaan koos (' + (S.asstModel || 'Claude') + ').' }); S.asstBusy = false; render(); }, 700); return; }
    try {
      var r = await api('teamHrAssistant', { messages: S.asstMsgs.slice(-12), model: S.asstModel }, { timeout: 90000 });
      if (r && r.ok && r.antwoord) { S.asstMsgs.push({ role: 'assistant', content: r.antwoord }); if (r.actie && r.actie.type === 'status') { S.candidates = null; loadCandidates(); } }
      else S.asstMsgs.push({ role: 'assistant', content: (r && r.message) || 'Er ging iets mis, probeer opnieuw.' });
    } catch (e) { S.asstMsgs.push({ role: 'assistant', content: e.timeout ? 'Dat duurde te lang. Probeer een lichter model of een kortere vraag.' : 'Er ging iets mis, probeer opnieuw.' }); }
    S.asstBusy = false; render();
  }
  function renderPipelineOnly() {
    var main = document.querySelector('main'); if (!main) { render(); return; }
    main.innerHTML = renderKandidaten(); bind($('hr-root')); bindPipelineDnd($('hr-root'));
    var s = document.querySelector('#hrk-search'); if (s) { s.focus(); try { s.setSelectionRange(s.value.length, s.value.length); } catch (e) {} }
    refreshIcons();
  }
  function bindPipelineDnd(root) {
    if (S.screen !== 'kandidaten') return;
    var dragId = null;
    Array.prototype.forEach.call(root.querySelectorAll('[data-card]'), function (card) {
      card.addEventListener('dragstart', function (e) { dragId = card.getAttribute('data-card'); card.style.opacity = '.5'; try { e.dataTransfer.setData('text/plain', dragId); } catch (x) {} });
      card.addEventListener('dragend', function () { card.style.opacity = ''; });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-drop]'), function (zone) {
      zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.parentNode.style.outline = '2px dashed #2458EA'; });
      zone.addEventListener('dragleave', function () { zone.parentNode.style.outline = ''; });
      zone.addEventListener('drop', function (e) { e.preventDefault(); zone.parentNode.style.outline = ''; var stageKey = zone.getAttribute('data-drop'); if (dragId) dropCandidate(dragId, stageKey); dragId = null; });
    });
  }

  function go(screen, id) {
    S.notifsOpen = false; S.navOpen = false;
    if (screen === 'nieuwe-vacature' && S.screen !== 'nieuwe-vacature') S.wiz = null;   // verse wizard
    S.screen = screen;
    if (screen === 'kandidaat') S.candId = id || S.candId;
    var hash = '#/' + screen + (screen === 'kandidaat' && S.candId ? '/' + S.candId : '');
    if (location.hash !== hash) location.hash = hash; else render();
    if ((screen === 'kandidaten' || screen === 'kandidaat') && S.candidates == null) loadCandidates();
    if (screen === 'vacatures' && S.jobs == null) loadVacatures();
    if (screen === 'dashboard') { if (S.candidates == null) loadCandidates(); if (S.jobs == null) loadVacatures(); }
    if (screen === 'onboarding' && S.obPeople == null) loadOnboarding();
    if (screen === 'selectie' && S.agendaEvents == null) loadAgenda();
    if (screen === 'instellingen' && S.integrations == null) loadInstellingen();
    if (screen === 'automatiseringen' && S.candidates == null) loadCandidates();
    if (screen === 'kandidaat' && S.candId) loadCandDocs(S.candId);
  }
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/');
    var sc = parts[0] || 'dashboard';
    var valid = ['dashboard', 'vacatures', 'kandidaten', 'kandidaat', 'onboarding', 'selectie', 'automatiseringen', 'instellingen', 'nieuwe-vacature'];
    S.screen = valid.indexOf(sc) >= 0 ? sc : 'dashboard';
    if (S.screen === 'kandidaat') S.candId = parts[1] || S.candId;
  }

  /* ---------- data ---------- */
  async function loadCandidates() {
    if (PREVIEW) { S.candidates = mockCandidates(); S.statussen = MOCK_STATUSSEN; render(); return; }
    if (S.loadingCands) return;
    S.loadingCands = true; if (S.screen === 'kandidaten' || S.screen === 'kandidaat') render();
    try {
      var r = await api('teamSollicitaties', {});
      if (r && r.ok) { S.candidates = r.items || []; S.statussen = r.statussen || []; }
      else { S.candidates = []; toast((r && r.message) || 'Kon de kandidaten niet laden.'); }
    } catch (e) { S.candidates = []; toast(e.timeout ? 'De server reageerde traag, probeer opnieuw.' : 'Kon de kandidaten niet laden.'); }
    S.loadingCands = false; render();
  }
  // Dossierdocumenten van een kandidaat (CV + gegenereerde docs) laden uit het portaal.
  async function loadCandDocs(candId) {
    if (!candId) return;
    if (PREVIEW) { S.candDocs = { id: candId, items: mockDocs() }; if (S.screen === 'kandidaat') render(); return; }
    if (S.candDocs && S.candDocs.id === candId && (S.candDocs.items || S.candDocs.loading)) return;
    S.candDocs = { id: candId, loading: true };
    if (S.screen === 'kandidaat' && S.candId === candId) render();
    try {
      var r = await api('teamKandidaatDocs', { task_id: candId });
      S.candDocs = { id: candId, items: (r && r.ok && r.docs) ? r.docs : [] };
    } catch (e) { S.candDocs = { id: candId, items: [] }; }
    if (S.screen === 'kandidaat' && S.candId === candId) render();
  }
  function mockDocs() { return [{ id: 'cv', kind: 'cv', title: 'CV', external: true, url: '#', created_at: Date.now() }, { id: 'd1', kind: 'contract', title: 'Contractvoorstel', external: false, url: '#', created_at: Date.now() }, { id: 'd2', kind: 'mailbijlage', title: 'portfolio.pdf', external: false, url: '#', content_type: 'application/pdf', created_at: Date.now() }]; }
  // Notificaties: nieuwe (ongelezen) berichten van kandidaten.
  function mockNotifs() { return [{ id: 'm-in-2', candidate_id: 'demo11', naam: 'Robbe Smets', subject: 'Re: Je sollicitatie bij Studio 27', snippet: 'Dag Vincent, dankjewel! Ik kijk ernaar uit. In bijlage mijn portfolio.', has_attach: true, date: Date.now() - 3600000 }]; }
  async function loadNotifs() {
    if (PREVIEW) { S.notifs = mockNotifs(); S.notifCount = S.notifs.length; S.notifMailbox = 'live'; render(); return; }
    if (S.notifBusy) return; S.notifBusy = true; if (S.notifs == null && S.notifsOpen) render();
    try { var r = await api('teamHrNotifs', {}, { timeout: 30000 }); if (r && r.ok) { S.notifs = r.items || []; S.notifCount = r.count || 0; S.notifMailbox = r.mailbox || ''; } }
    catch (e) { /* stil: notificaties zijn niet kritiek */ }
    S.notifBusy = false; render();
  }
  function openNotif(arg) {
    var parts = String(arg || '').split('|'); var candId = parts[0], mailId = parts[1];
    var notif = (S.notifs || []).filter(function (n) { return n.id === mailId; })[0];
    S.notifsOpen = false;
    markMailRead(mailId);   // idempotent (loadMailThread markeert dezelfde mail niet nog eens dubbel)
    go('kandidaat', candId);
    openMailThread({ taskId: candId, naam: notif ? notif.naam : '', selectMailId: mailId });
  }
  async function notifReadAll() {
    var ids = (S.notifs || []).map(function (n) { return n.id; });
    S.notifs = []; S.notifCount = 0; render();
    if (!PREVIEW) { try { await api('teamHrNotifMark', { all: '1' }); } catch (e) { /* */ } }
  }
  async function dropCandidate(id, stageKey) {
    var c = (S.candidates || []).filter(function (x) { return x.id === id; })[0]; if (!c) return;
    if (stageOf(c) === stageKey) return;
    if (PREVIEW) { c.status_raw = STAGE_STATUS[stageKey]; c.status = STAGE_STATUS[stageKey]; render(); toast('Fase bijgewerkt (voorbeeld)'); return; }
    var cuStatus = statusForStage(stageKey);
    if (!cuStatus) { toast('Geen fase die bij "' + (STAGES.filter(function (s) { return s.key === stageKey; })[0] || {}).label + '" past.'); return; }
    var prev = c.status_raw; c.status_raw = cuStatus; c.status = cuStatus; render();   // optimistic
    try { var r = await api('teamSolStatus', { task_id: id, status: cuStatus }); if (!r || !r.ok) throw 0; toast('Fase bijgewerkt ✓'); }
    catch (e) { c.status_raw = prev; render(); toast('Fase wijzigen mislukt.'); }
  }

  /* ---------- agenda: data + acties ---------- */
  async function loadAgenda() {
    agEnsureAnchor();
    if (PREVIEW) { if (S.agendaEvents == null) S.agendaEvents = mockAgendaEvents(); if (S.candidates == null) S.candidates = mockCandidates(); render(); return; }
    if (S.candidates == null && !S.loadingCands) loadCandidates();   // rail (fire-and-forget)
    if (S.loadingAgenda) return; S.loadingAgenda = true; render();
    var w = agWindow();
    try { var r = await api('teamPlannerAgenda', { van_ms: w.van, tot_ms: w.tot }, { timeout: 25000 }); S.agendaEvents = (r && r.ok && r.events) ? r.events : []; }
    catch (e) { if (S.agendaEvents == null) S.agendaEvents = []; toast(e.timeout ? 'De server reageerde traag, probeer opnieuw.' : 'Kon de agenda niet laden.'); }
    S.loadingAgenda = false; render();
  }
  function agAct(arg) {
    agEnsureAnchor();
    if (arg === 'prev' || arg === 'next') { var dir = arg === 'next' ? 1 : -1; if (S.agendaView === 'day') S.agendaDay += dir * 86400000; else if (S.agendaView === 'month') { var d = new Date(S.agendaAnchorMs); d.setMonth(d.getMonth() + dir, 1); S.agendaAnchorMs = agStartOfDay(d.getTime()); } else S.agendaAnchorMs = agMonday(S.agendaAnchorMs) + dir * 7 * 86400000; loadAgenda(); return; }
    if (arg === 'today') { S.agendaAnchorMs = agStartOfDay(Date.now()); S.agendaDay = agStartOfDay(Date.now()); loadAgenda(); return; }
    if (arg.indexOf('view:') === 0) { S.agendaView = arg.slice(5); loadAgenda(); return; }
    if (arg.indexOf('day:') === 0) { S.agendaDay = Number(arg.slice(4)) || agStartOfDay(Date.now()); S.agendaView = 'day'; loadAgenda(); return; }
  }
  var agDragId = null;
  function bindAgendaDnd(root) {
    if (S.screen !== 'selectie') return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-railitem]'), function (it) {
      it.addEventListener('dragstart', function (e) { agDragId = it.getAttribute('data-railitem'); it.style.opacity = '.5'; try { e.dataTransfer.setData('text/plain', agDragId); } catch (x) {} });
      it.addEventListener('dragend', function () { it.style.opacity = ''; });
    });
    function wireZone(zone, baseMs) {
      zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.style.outline = '2px dashed #2458EA'; zone.style.outlineOffset = '-2px'; });
      zone.addEventListener('dragleave', function () { zone.style.outline = ''; });
      zone.addEventListener('drop', function (e) { e.preventDefault(); zone.style.outline = ''; if (!agDragId) return; var rect = zone.getBoundingClientRect(); var hour = AG_HSTART + (e.clientY - rect.top) / AG_ROW; hour = Math.max(AG_HSTART, Math.min(AG_HEND - 0.5, Math.round(hour * 2) / 2)); var ms = baseMs + Math.round(hour * 60) * 60000; openPlanModal(agDragId, ms); agDragId = null; });
    }
    Array.prototype.forEach.call(root.querySelectorAll('[data-agcol]'), function (z) { wireZone(z, Number(z.getAttribute('data-agcol'))); });
    Array.prototype.forEach.call(root.querySelectorAll('[data-agday]'), function (z) { wireZone(z, Number(z.getAttribute('data-agday'))); });
  }
  async function openEventModal(id) {
    var local = (S.agendaEvents || []).filter(function (e) { return e.id === id; })[0];
    if (local && local.titel === 'Bezet') { toast('Dit is de afspraak van een collega, die kan je niet bewerken.'); return; }
    if (PREVIEW) { var ev = Object.assign({ attendees: [{ email: 'sofie@voorbeeld.be', naam: 'Sofie Maes', status: 'accepted' }, { email: 'vincent@studio27.be', naam: 'Vincent', self: true, organizer: true }] }, local || { id: id }); S.modal = { type: 'event', ev: ev }; renderModal(); return; }
    S.modal = { type: 'event', loading: true, ev: local || { id: id } }; renderModal();
    try { var r = await api('teamCalEvent', { event_id: id }, { timeout: 20000 }); if (r && r.ok && r.event) S.modal = { type: 'event', ev: r.event }; else { S.modal = null; toast((r && r.message) || 'Kon de afspraak niet laden.'); } }
    catch (e) { S.modal = null; toast('Kon de afspraak niet laden.'); }
    renderModal();
  }
  function agDefaultPlanMs() { var d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); if (d.getDay() === 6) d.setDate(d.getDate() + 2); else if (d.getDay() === 0) d.setDate(d.getDate() + 1); return d.getTime(); }
  function openPlanModal(candId, presetMs) {
    var c = (S.candidates || []).filter(function (x) { return x.id === candId; })[0];
    var st = c ? stageOf(c) : 'gesprek';
    S.modal = { type: 'plan', candId: candId, cand: c, startMs: presetMs || agDefaultPlanMs(), dur: st === 'assessment' ? 1.5 : 1, titel: (st === 'assessment' ? 'Assessment — ' : 'Gesprek — ') + (c ? c.naam : ''), locatie: 'Studio 27, Geel', invite: !!(c && c.email), meet: false };
    renderModal();
  }
  async function refreshEventModal(id) { try { var r = await api('teamCalEvent', { event_id: id }); if (r && r.ok && r.event) { S.modal = { type: 'event', ev: r.event }; renderModal(); } } catch (e) { /* */ } }
  async function evDelete() {
    var m = S.modal; if (!m || !m.ev) return; var id = m.ev.id;
    if (PREVIEW) { S.agendaEvents = (S.agendaEvents || []).filter(function (e) { return e.id !== id; }); S.modal = null; renderModal(); render(); toast('Verwijderd (voorbeeld)'); return; }
    if (!confirm('Deze afspraak verwijderen? Genodigden krijgen een annulering.')) return;
    toast('Verwijderen…');
    try { var r = await api('teamCalEventDelete', { event_id: id }); if (r && r.ok) { S.agendaEvents = (S.agendaEvents || []).filter(function (e) { return e.id !== id; }); S.modal = null; renderModal(); render(); toast('Afspraak verwijderd ✓'); } else toast((r && r.message) || 'Verwijderen mislukt.'); }
    catch (e) { toast('Verwijderen mislukt.'); }
  }
  async function evMeet() {
    var m = S.modal; if (!m || !m.ev) return; var enable = !m.ev.meet;
    if (PREVIEW) { m.ev.meet = enable ? 'https://meet.google.com/abc-defg-hij' : ''; renderModal(); toast(enable ? 'Meet toegevoegd (voorbeeld)' : 'Meet verwijderd (voorbeeld)'); return; }
    toast('Bezig…');
    try { var r = await api('teamCalEventMeet', { event_id: m.ev.id, enable: enable }); if (r && r.ok) { m.ev.meet = enable ? (r.meet || '') : ''; renderModal(); toast(enable ? 'Google Meet toegevoegd ✓' : 'Meet verwijderd ✓'); } else toast((r && r.message) || 'Lukte niet.'); }
    catch (e) { toast('Lukte niet.'); }
  }
  async function evInviteAdd() {
    var m = S.modal; if (!m || !m.ev) return; var inp = $('hr-inv'); var em = inp ? inp.value.trim() : ''; if (!em) return;
    if (PREVIEW) { m.ev.attendees = (m.ev.attendees || []).concat([{ email: em }]); renderModal(); toast('Genodigd (voorbeeld)'); return; }
    toast('Uitnodigen…');
    try { var r = await api('teamCalEventInvite', { event_id: m.ev.id, add: [em] }); if (r && r.ok) { await refreshEventModal(m.ev.id); toast('Uitnodiging verstuurd ✓'); } else toast((r && r.message) || 'Lukte niet.'); }
    catch (e) { toast('Lukte niet.'); }
  }
  async function evInviteRemove(em) {
    var m = S.modal; if (!m || !m.ev) return;
    if (PREVIEW) { m.ev.attendees = (m.ev.attendees || []).filter(function (a) { return a.email !== em; }); renderModal(); return; }
    try { var r = await api('teamCalEventInvite', { event_id: m.ev.id, remove: [em] }); if (r && r.ok) await refreshEventModal(m.ev.id); else toast((r && r.message) || 'Lukte niet.'); }
    catch (e) { toast('Lukte niet.'); }
  }
  async function planCreate() {
    var m = S.modal; if (!m || m.type !== 'plan') return;
    var titel = (($('hr-plan-titel') || {}).value || m.titel || '').trim(); var dt = ($('hr-plan-date') || {}).value; var tm = ($('hr-plan-time') || {}).value;
    var dur = Number(($('hr-plan-dur') || {}).value) || m.dur; var loc = (($('hr-plan-loc') || {}).value || '').trim();
    var meet = !!(($('hr-plan-meet') || {}).checked); var inv = !!(($('hr-plan-inv') || {}).checked);
    if (!titel || !dt || !tm) { toast('Vul titel, datum en tijd in.'); return; }
    var start = new Date(dt + 'T' + tm).getTime(); if (!start) { toast('Ongeldige datum/tijd.'); return; }
    var eind = start + Math.round(dur * 60) * 60000;
    var genodigden = (inv && m.cand && m.cand.email) ? [m.cand.email] : [];
    if (PREVIEW) { S.agendaEvents = (S.agendaEvents || []).concat([{ id: 'demo-' + Math.round(start), titel: titel, start_ms: start, eind_ms: eind, allday: false, locatie: loc, beschrijving: '', meet: meet ? 'https://meet.google.com/abc-defg-hij' : '' }]); S.modal = null; renderModal(); render(); toast('Gesprek ingepland (voorbeeld)'); return; }
    m.saving = true; renderModal();
    try { var r = await api('teamCalEventCreate', { titel: titel, start_ms: start, eind_ms: eind, locatie: loc, beschrijving: (m.cand ? 'Sollicitatiegesprek met ' + m.cand.naam + (m.cand.vacature ? ' voor ' + m.cand.vacature : '') + '.' : ''), genodigden: genodigden, add_meet: meet, cand_task_id: m.candId || '' }, { timeout: 30000 }); if (r && r.ok && r.event) { S.agendaEvents = (S.agendaEvents || []).concat([r.event]); S.modal = null; renderModal(); render(); toast('Gesprek ingepland ✓'); } else { m.saving = false; renderModal(); toast((r && r.message) || 'Inplannen mislukt.'); } }
    catch (e) { m.saving = false; renderModal(); toast('Inplannen mislukt.'); }
  }

  /* ---------- instellingen: data ---------- */
  async function loadInstellingen() {
    if (PREVIEW) { S.integrations = mockIntegrations(); S.connectedCount = 7; S.me = { id: 1, naam: 'Vincent' }; S.isAdmin = true; S.hrTone = { tone: 'Je schrijft in de stem van Vincent: warm, persoonlijk en direct (je/jij). Kort, helder en concreet, zonder jargon. Geen em-dashes. Sluit af met "Groetjes, Vincent".', extra: '' }; render(); return; }
    if (S.loadingInst) return; S.loadingInst = true; render();
    try {
      var res = await Promise.all([api('teamHrIntegrations', {}), api('teamHrTone', {})]);
      var ints = res[0], tn = res[1];
      if (ints && ints.ok) { S.integrations = ints.integrations || []; S.connectedCount = ints.connectedCount != null ? ints.connectedCount : S.integrations.filter(function (i) { return i.connected; }).length; }
      else { S.integrations = []; }
      if (tn && tn.ok) { S.hrTone = { tone: tn.tone || '', extra: tn.extra || '' }; S.hrToneDefault = tn.standaard || ''; } else S.hrTone = { tone: '', extra: '' };
    } catch (e) { if (S.integrations == null) S.integrations = []; if (S.hrTone == null) S.hrTone = { tone: '', extra: '' }; toast('Instellingen tijdelijk niet beschikbaar.'); }
    S.loadingInst = false; render();
  }
  async function saveTone() {
    var t = (($('tone-main') || {}).value || '').trim(); var x = (($('tone-extra') || {}).value || '').trim();
    if (!t) { toast('De schrijfstijl mag niet leeg zijn.'); return; }
    S.hrTone = { tone: t, extra: x };
    if (PREVIEW) { toast('Tone of voice opgeslagen (voorbeeld)'); return; }
    toast('Opslaan…');
    try { var r = await api('teamHrTone', { save: true, tone: t, extra: x }); if (r && r.ok) toast('Tone of voice opgeslagen ✓'); else toast('Opslaan mislukt.'); }
    catch (e) { toast('Opslaan mislukt.'); }
  }
  function resetTone() {
    if (!S.hrToneDefault) { toast('Geen standaard beschikbaar.'); return; }
    if (!confirm('De schrijfstijl terugzetten naar de standaard? Je niet-opgeslagen wijzigingen gaan verloren.')) return;
    S.hrTone = { tone: S.hrToneDefault, extra: (S.hrTone || {}).extra || '' }; render();
  }

  /* ---------- onboarding: data ---------- */
  async function loadOnboarding() {
    if (PREVIEW) { S.obPeople = mockOnboardingPeople(); S.obDone = mockObDone(); render(); return; }
    if (S.loadingOb) return; S.loadingOb = true; render();
    try {
      var res = await Promise.all([api('teamOnboardingPeople', {}), api('teamOnboardingState', { get: true })]);
      var rp = res[0], rs = res[1];
      S.obPeople = (rp && rp.ok && rp.people) ? rp.people : [];
      S.obDone = (rs && rs.ok && rs.done) ? rs.done : {};
      if (rp && rp.ok === false && rp.message) toast(rp.message);
    } catch (e) { S.obPeople = []; toast(e.timeout ? 'De server reageerde traag, probeer opnieuw.' : 'Kon de onboarding niet laden.'); }
    S.loadingOb = false; render();
  }
  async function obToggle(arg) {
    var idx = arg.indexOf(':'); if (idx < 0) return;
    var pid = arg.slice(0, idx), key = arg.slice(idx + 1);
    var cur = !!S.obDone[arg], next = !cur;
    if (next) S.obDone[arg] = true; else delete S.obDone[arg];
    render();   // optimistic
    if (PREVIEW) return;
    try { var r = await api('teamOnboardingState', { person_id: pid, key: key, done: next }); if (!r || !r.ok) throw 0; if (r.done) S.obDone = r.done; }
    catch (e) { if (cur) S.obDone[arg] = true; else delete S.obDone[arg]; render(); toast('Bijwerken mislukt.'); }
  }
  async function obSavePerson() {
    var m = S.modal; if (!m || m.type !== 'obperson') return;
    var f = { name: (($('ob-name') || {}).value || '').trim(), role: (($('ob-role') || {}).value || '').trim(), dept: (($('ob-dept') || {}).value || '').trim(), start: (($('ob-start') || {}).value || '').trim(), buddy: (($('ob-buddy') || {}).value || '').trim() };
    if (!f.name) { toast('Geef een naam in.'); return; }
    var id = m.person && m.person.id;
    if (PREVIEW) {
      if (id) { var p0 = (S.obPeople || []).filter(function (x) { return x.id === id; })[0]; if (p0) Object.assign(p0, f); }
      else { S.obPeople = (S.obPeople || []).concat([Object.assign({ id: 'ob_' + Date.now() }, f)]); }
      S.modal = null; renderModal(); render(); toast(id ? 'Bijgewerkt (voorbeeld)' : 'Toegevoegd (voorbeeld)'); return;
    }
    m.saving = true; renderModal();
    try {
      var r = await api('teamOnboardingPersonSave', Object.assign({ id: id || '' }, f));
      if (r && r.ok) { if (!id && r.id) S.obPersonId = r.id; S.modal = null; S.obPeople = null; renderModal(); loadOnboarding(); toast(id ? 'Bijgewerkt ✓' : 'Collega toegevoegd ✓'); }
      else { m.saving = false; renderModal(); toast((r && r.message) || 'Opslaan mislukt.'); }
    } catch (e) { m.saving = false; renderModal(); toast('Opslaan mislukt.'); }
  }
  async function obRemovePerson(id) {
    if (!id) return; var p = (S.obPeople || []).filter(function (x) { return x.id === id; })[0];
    if (!confirm('"' + ((p && p.name) || 'deze collega') + '" uit de onboarding verwijderen?')) return;
    if (PREVIEW) { S.obPeople = (S.obPeople || []).filter(function (x) { return x.id !== id; }); S.obPersonId = ''; render(); toast('Verwijderd (voorbeeld)'); return; }
    try { var r = await api('teamOnboardingPersonRemove', { id: id }); if (r && r.ok) { S.obPersonId = ''; S.obPeople = null; loadOnboarding(); toast('Verwijderd ✓'); } else toast('Verwijderen mislukt.'); }
    catch (e) { toast('Verwijderen mislukt.'); }
  }

  /* ---------- vacatures: data + wizard ---------- */
  function mockJobs() {
    return [
      { id: 'j1', name: 'Senior Software Engineer', slug: 'senior-software-engineer', actief: true, diensten: ['Engineering'], is_draft: false, is_archived: false, last_published: '2026-06-10', url: '#' },
      { id: 'j2', name: 'Field Service Technicus', slug: 'field-service-technicus', actief: true, diensten: ['Service'], is_draft: false, is_archived: false, last_published: '2026-06-04', url: '#' },
      { id: 'j3', name: 'Account Manager', slug: 'account-manager', actief: true, diensten: ['Sales'], is_draft: false, is_archived: false, last_published: '2026-05-28', url: '#' },
      { id: 'j4', name: 'Marketing Content Specialist', slug: 'marketing-content-specialist', actief: false, diensten: ['Marketing'], is_draft: true, is_archived: false, last_published: '', url: '#' },
      { id: 'j5', name: 'Customer Support Medewerker', slug: 'customer-support', actief: false, diensten: ['Support'], is_draft: false, is_archived: true, last_published: '2026-04-12', url: '#' },
    ];
  }
  function mockDraft(title) {
    return { intro: 'Bij Studio 27 zoeken we een ' + (title || 'collega') + ' die mee onze ambitie waarmaakt. Je komt terecht in een jong, creatief team waar initiatief en plezier centraal staan.', alt: 'Vacature ' + (title || '') + ' bij Studio 27', verwachten: '<ul><li>Je werkt mee aan uitdagende klantprojecten</li><li>Je denkt strategisch én pakt zelf aan</li><li>Je groeit samen met een team dat blijft leren</li></ul>', aanbieden: '<ul><li>Een marktconform loon met extralegale voordelen</li><li>Veel autonomie en ruimte voor eigen ideeën</li><li>Een toffe werkplek in het hart van de Kempen</li></ul>', profiel: '<ul><li>Relevante ervaring of een sterke drive om te leren</li><li>Vlot in het Nederlands, een plus in het Engels</li><li>Teamspeler met een hands-on mentaliteit</li></ul>' };
  }
  async function loadVacatures() {
    if (PREVIEW) { S.jobs = mockJobs(); if (S.candidates == null) S.candidates = mockCandidates(); render(); return; }
    if (S.loadingJobs) return; S.loadingJobs = true;
    try {
      var r = await api('teamVacatures', {});
      if (r && r.ok) { S.jobs = r.items || []; S.jobsErr = r.geen_token ? 'Webflow is nog niet gekoppeld. Zodra de Webflow-token gezet is, verschijnen hier je vacatures en kan je er nieuwe aanmaken.' : ''; }
      else { S.jobs = []; S.jobsErr = (r && r.message) || 'Kon de vacatures niet laden.'; }
    } catch (e) { S.jobs = []; S.jobsErr = e.timeout ? 'De server reageerde traag, probeer opnieuw.' : 'Kon de vacatures niet laden.'; }
    if (S.candidates == null) { try { var rc = await api('teamSollicitaties', {}); if (rc && rc.ok) { S.candidates = rc.items || []; S.statussen = rc.statussen || S.statussen; } } catch (e) { /* tellers optioneel */ } }
    S.loadingJobs = false; render();
  }
  function wizAct(arg) {
    var w = S.wiz; if (!w) return;
    if (arg === 'prev') { if (w.step > 1) { w.step--; render(); } return; }
    if (arg === 'next') {
      if (w.step === 1) {
        var t = document.querySelector('#wiz-title'); if (t) w.title = t.value.trim();
        var d = document.querySelector('#wiz-dept'); if (d) w.dept = d.value;
        var l = document.querySelector('#wiz-loc'); if (l) w.loc = l.value;
        var ty = document.querySelector('#wiz-type'); if (ty) w.type = ty.value;
        var lv = document.querySelector('#wiz-level'); if (lv) w.level = lv.value;
        if (!w.title) { toast('Geef eerst een functietitel.'); return; }
      }
      if (w.step === 2 && !w.draft) { toast('Genereer eerst de vacaturetekst.'); return; }
      if (w.step < 4) { w.step++; render(); }
      return;
    }
    if (arg === 'generate') { wizGenerate(); return; }
    if (arg.indexOf('plat:') === 0) { var k = arg.slice(5); w.platforms[k] = !w.platforms[k]; render(); return; }
    if (arg === 'publish') { wizPublish(); return; }
  }
  async function wizGenerate() {
    var w = S.wiz; if (!w || w.generating) return;
    var t = document.querySelector('#wiz-title'); if (t && t.value.trim()) w.title = t.value.trim();
    if (!w.title) { toast('Geef eerst een functietitel.'); return; }
    if (PREVIEW) { w.generating = true; render(); setTimeout(function () { w.draft = mockDraft(w.title); w.foto = { fileId: 'demo' }; w.dienst_ids = ['demo']; w.generating = false; render(); }, 650); return; }
    w.generating = true; render();
    try {
      var r = await api('teamVacatureAiDraft', { functie: w.title }, { timeout: 60000 });
      if (r && r.ok && r.draft) { w.draft = r.draft; w.foto = r.foto || null; w.dienst_ids = r.dienst_ids || []; toast('Vacaturetekst gegenereerd ✓'); }
      else toast(r && r.error === 'geen_token' ? 'Webflow is nog niet gekoppeld.' : ((r && r.message) || 'Genereren mislukt.'));
    } catch (e) { toast(e.timeout ? 'De AI had te veel tijd nodig, probeer opnieuw.' : 'Genereren mislukt.'); }
    w.generating = false; render();
  }
  async function wizPublish() {
    var w = S.wiz; if (!w || w.publishing) return;
    if (!w.draft) { toast('Genereer eerst de vacaturetekst.'); return; }
    var chans = Object.keys(w.platforms).filter(function (k) { return w.platforms[k]; });
    if (PREVIEW) { w.publishing = true; render(); setTimeout(function () { w.publishing = false; S.wiz = null; S.jobs = null; toast('Vacature gepubliceerd (voorbeeld)'); go('vacatures'); }, 800); return; }
    w.publishing = true; render();
    try {
      var r = await api('teamVacatureCreate', { naam: w.title, ai_velden: w.draft, dienst_ids: w.dienst_ids || [], foto_file_id: (w.foto && w.foto.fileId) || '' }, { timeout: 45000 });
      if (!r || !r.ok || !r.id) { w.publishing = false; render(); toast(r && r.error === 'dienst_vereist' ? 'Webflow vereist een gekoppelde dienst, dit lukte niet automatisch.' : (r && r.error === 'geen_token' ? 'Webflow is nog niet gekoppeld.' : ((r && r.message) || 'Publiceren mislukt.'))); return; }
      var id = r.id;
      if (w.platforms.website) { try { await api('teamVacatureToggle', { item_id: id, actief: true }); } catch (e) { /* blijft anders concept */ } }
      if (w.platforms.social) {
        try {
          var pv = await api('teamVacatureSocial', { item_id: id, action: 'preview' }, { timeout: 60000 });
          if (pv && pv.ok && pv.caption) await api('teamVacatureSocial', { item_id: id, action: 'schedule', caption: pv.caption, date: pv.suggest_date }, { timeout: 45000 });
        } catch (e) { /* social fail-soft */ }
      }
      var extra = chans.filter(function (k) { return k !== 'website' && k !== 'social'; });
      w.publishing = false; S.wiz = null; S.jobs = null;
      toast((w.platforms.website ? 'Vacature live ✓' : 'Vacature als concept opgeslagen ✓') + (w.platforms.social ? ' + social-concept' : '') + (extra.length ? ' (' + extra.length + ' jobboards volgen later)' : ''));
      go('vacatures');
    } catch (e) { w.publishing = false; render(); toast(e.timeout ? 'Duurde te lang, controleer even in Webflow.' : 'Publiceren mislukt.'); }
  }

  async function candAction(act) {
    var c = curCand(); if (!c) return;
    if (act === 'mailverkeer') { openMailThread(); return; }
    if (PREVIEW) {
      if (act === 'status') { S.modal = { type: 'status' }; renderModal(); return; }
      if (act === 'case') { S.modal = { type: 'text', title: 'Assessment-case (voorbeeld)', body: 'Voorbeeldcase voor ' + (c.vacature || 'de functie') + ':\n\nContext: een klant van Studio 27 wil meer leads uit social. Stel binnen 2 uur een aanpak op met (1) probleemanalyse, (2) een concreet voorstel en (3) een ruwe winstinschatting.\n\nWe beoordelen op: probleemanalyse, technische diepgang, communicatie en pragmatisme.' }; renderModal(); return; }
      if (act === 'mail' || act === 'uitnodiging') { var pv = act === 'uitnodiging'; openMailThread({ subject: pv ? 'Uitnodiging voor een gesprek bij Studio 27' : 'Je sollicitatie bij Studio 27', body: pv ? ('Dag ' + (c.voornaam || c.naam) + ',\n\nWat leuk dat je solliciteerde. Je profiel sprak ons aan en ik kom graag eens samenzitten om kennis te maken.\n\nPast een van deze momenten voor jou?\n[optie 1]\n[optie 2]\n[optie 3]\n\nLaat maar weten wat past, dan blok ik het in.\n\nGroetjes,\nVincent') : ('Dag ' + (c.voornaam || c.naam) + ',\n\nBedankt voor je interesse in Studio 27 en de moeite van je sollicitatie. Na een zorgvuldige afweging gaan we voorlopig niet verder met jouw kandidatuur. We waarderen je profiel oprecht en wensen je veel succes.\n\nGroetjes,\nVincent') }); return; }
      toast('Voorbeeldmodus, dit raakt geen echte data aan.'); return;
    }
    if (act === 'spam') { if (!confirm('Deze kandidaat als spam markeren? Hij verdwijnt uit de pipeline.')) return; }
    S.busy = act; render();
    try {
      if (act === 'screen') {
        var r = await api('teamSollicitatieScore', { task_id: c.id, force: true }, { timeout: 60000 });
        if (r && r.ok && r.ai) { c.ai = r.ai; toast('AI-beoordeling klaar ✓'); } else toast((r && r.message) || 'Beoordeling mislukt.');
      } else if (act === 'spam') {
        var rs = await api('teamKandidaatSpam', { task_id: c.id, spam: true });
        if (rs && rs.ok) { c.spam = true; toast('Gemarkeerd als spam ✓'); S.busy = ''; go('kandidaten'); return; } else toast('Lukte niet.');
      } else if (act === 'case') {
        var rc = await api('teamKandidaatCase', { task_id: c.id }, { timeout: 60000 });
        if (rc && rc.ok) { S.candDocs = null; loadCandDocs(c.id); S.modal = { type: 'text', title: 'Assessment-case' + (rc.functie ? ' · ' + rc.functie : ''), body: rc.tekst }; toast('Case gegenereerd en opgeslagen in het dossier ✓'); } else toast((rc && rc.message) || 'Genereren mislukt.');
      } else if (act === 'contract') {
        var rk = await api('teamKandidaatContract', { task_id: c.id }, { timeout: 60000 });
        if (rk && rk.ok && rk.html) {
          S.candDocs = null; loadCandDocs(c.id);   // herlaad het dossier zodat het contract verschijnt
          if (rk.doc_url) { try { window.open(GATEWAY + rk.doc_url, '_blank', 'noopener'); } catch (e) {} }
          else downloadDoc((c.naam || 'kandidaat') + '-contractvoorstel', rk.html);
          toast('Contractvoorstel opgeslagen in het dossier ✓');
        } else toast((rk && rk.message) || 'Contract genereren mislukt (vereist mogelijk extra gegevens).');
      } else if (act === 'mail' || act === 'uitnodiging') {
        var soort = act === 'uitnodiging' ? 'uitnodiging' : 'afwijzen';
        var rm = await api('teamKandidaatMail', { task_id: c.id, soort: soort, action: 'preview' }, { timeout: 60000 });
        if (rm && rm.ok) { S.busy = ''; render(); openMailThread({ subject: rm.onderwerp, body: rm.tekst, email: rm.email }); return; } else toast((rm && rm.message) || 'Mail opstellen mislukt.');
      } else if (act === 'status') {
        S.modal = { type: 'status' };
      }
    } catch (e) { toast(e.timeout ? 'De AI had te veel tijd nodig, probeer opnieuw.' : 'Er ging iets mis.'); }
    S.busy = ''; render(); renderModal();
  }

  function downloadDoc(name, html) {
    var blob = new Blob(['<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>' + html + '</body></html>'], { type: 'application/msword' });
    var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.doc';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* ---------- modal (case / mail / status) ---------- */
  function renderModal() {
    var old = $('hr-modal'); if (old) old.remove();
    if (!S.modal) return;
    var m = S.modal; var c = curCand();
    var inner;
    if (m.type === 'text') {
      inner = '<div style="font-size:14px;line-height:1.7;white-space:pre-wrap;color:#26241F;">' + esc(m.body) + '</div>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;"><button data-mod="copy" style="font-family:inherit;font-weight:600;font-size:14px;background:#fff;border:1px solid #DFD9C8;border-radius:11px;padding:10px 16px;cursor:pointer;">Kopieer</button><button data-mod="close" style="font-family:inherit;font-weight:600;font-size:14px;background:#050A30;color:#fff;border:none;border-radius:11px;padding:10px 16px;cursor:pointer;">Sluiten</button></div>';
    } else if (m.type === 'mail') {
      inner = '<div style="font-size:13px;color:#5E5A4F;margin-bottom:10px;">Naar: <b>' + esc(m.email || '(geen e-mail)') + '</b> · Onderwerp: ' + esc(m.onderwerp || '') + '</div>' +
        '<textarea id="hr-mailtext" style="width:100%;min-height:220px;font-family:inherit;font-size:14px;line-height:1.6;border:1px solid #DFD9C8;border-radius:12px;padding:14px;color:#26241F;background:#fff;">' + esc(m.body) + '</textarea>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;"><button data-mod="close" style="font-family:inherit;font-weight:600;font-size:14px;background:#fff;border:1px solid #DFD9C8;border-radius:11px;padding:10px 16px;cursor:pointer;">Annuleer</button><button data-mod="sendmail" ' + (m.email ? '' : 'disabled') + ' style="font-family:inherit;font-weight:600;font-size:14px;background:#D1F24C;color:#050A30;border:none;border-radius:11px;padding:10px 18px;cursor:pointer;display:flex;align-items:center;gap:8px;">' + ic('send', 15) + 'Verstuur</button></div>';
    } else if (m.type === 'status') {
      var opts = (S.statussen || []).map(function (st) { return '<button data-setstatus="' + esc(st.status) + '" style="font-family:inherit;font-size:14px;text-align:left;background:#fff;border:1px solid #EFEADD;border-radius:11px;padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;"><span style="width:9px;height:9px;border-radius:50%;background:' + esc(st.color || '#9e919e') + ';"></span>' + esc(st.status) + '</button>'; }).join('');
      inner = '<div style="font-size:13.5px;color:#5E5A4F;margin-bottom:14px;">Kies de nieuwe fase voor ' + esc(c ? c.naam : 'deze kandidaat') + '.</div><div style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto;">' + (opts || '<div class="hr-empty">Geen statussen gevonden.</div>') + '</div><div style="display:flex;justify-content:flex-end;margin-top:16px;"><button data-mod="close" style="font-family:inherit;font-weight:600;font-size:14px;background:#fff;border:1px solid #DFD9C8;border-radius:11px;padding:10px 16px;cursor:pointer;">Sluiten</button></div>';
    } else if (m.type === 'event') {
      var ev = m.ev || {}; m.title = ev.titel || 'Afspraak';
      if (m.loading) { inner = '<div style="display:grid;place-items:center;padding:34px;"><div class="hr-spin"></div></div>'; }
      else {
        var ds = ev.start_ms ? new Date(ev.start_ms) : null;
        var tijd = ds ? (DAYS_LONG[ds.getDay()] + ' ' + ds.getDate() + ' ' + MONTHS_LONG[ds.getMonth()] + ' · ' + agTimeLabel(ev.start_ms) + (ev.eind_ms ? '–' + agTimeLabel(ev.eind_ms) : '')) : '';
        var att = (ev.attendees || []).filter(function (a) { return !a.self; });
        var rows = [];
        if (tijd) rows.push('<div style="display:flex;align-items:center;gap:10px;font-size:14px;color:#26241F;">' + ic('clock', 16, 'color:#8E8979;flex:none;') + esc(tijd) + '</div>');
        if (ev.locatie) rows.push('<div style="display:flex;align-items:center;gap:10px;font-size:14px;color:#26241F;">' + ic('map-pin', 16, 'color:#8E8979;flex:none;') + esc(ev.locatie) + '</div>');
        if (ev.beschrijving) rows.push('<div style="display:flex;align-items:flex-start;gap:10px;font-size:13.5px;color:#5E5A4F;line-height:1.5;">' + ic('align-left', 16, 'color:#8E8979;flex:none;margin-top:2px;') + '<span style="white-space:pre-wrap;">' + esc(ev.beschrijving) + '</span></div>');
        rows.push('<div style="display:flex;align-items:center;gap:10px;font-size:14px;">' + ic('video', 16, 'color:#8E8979;flex:none;') + (ev.meet ? '<a href="' + esc(ev.meet) + '" target="_blank" rel="noopener" style="color:#2458EA;">Google Meet openen</a>' : '<span style="color:#8E8979;">Geen videogesprek</span>') + '<button data-mod="evmeet" style="margin-left:auto;font-family:inherit;font-size:12.5px;font-weight:600;background:#fff;border:1px solid #DFD9C8;border-radius:9px;padding:6px 12px;cursor:pointer;">' + (ev.meet ? 'Verwijder Meet' : 'Voeg Meet toe') + '</button></div>');
        var attHtml = att.length ? att.map(function (a) { return '<div style="display:flex;align-items:center;gap:8px;background:#F7F3EA;border-radius:10px;padding:7px 11px;"><span style="flex:1;font-size:13px;color:#26241F;">' + esc(a.naam || a.email) + (a.status === 'accepted' ? ' <span style="color:#4A6B0E;">✓</span>' : '') + '</span><button data-rm="' + esc(a.email) + '" style="background:none;border:none;color:#B83A2A;cursor:pointer;font-size:12px;">verwijder</button></div>'; }).join('') : '<div style="font-size:12.5px;color:#A7A293;">Nog geen externe genodigden.</div>';
        var section = '<div style="margin-top:16px;"><div style="font-size:12px;font-weight:600;color:#5E5A4F;margin-bottom:8px;">Genodigden</div><div style="display:flex;flex-direction:column;gap:6px;">' + attHtml + '</div><div style="display:flex;gap:8px;margin-top:10px;"><input id="hr-inv" type="email" inputmode="email" placeholder="naam@voorbeeld.be" style="flex:1;font-family:inherit;font-size:13.5px;padding:9px 12px;border:1px solid #DFD9C8;border-radius:10px;background:#fff;"><button data-mod="evinvite" style="font-family:inherit;font-size:13px;font-weight:600;background:#050A30;color:#fff;border:none;border-radius:10px;padding:9px 14px;cursor:pointer;">Nodig uit</button></div></div>';
        inner = '<div style="display:flex;flex-direction:column;gap:11px;">' + rows.join('') + '</div>' + section +
          '<div style="display:flex;justify-content:space-between;gap:10px;margin-top:20px;"><button data-mod="evdelete" style="font-family:inherit;font-weight:600;font-size:14px;background:#F7E0DB;color:#6E2218;border:none;border-radius:11px;padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:7px;">' + ic('trash-2', 15) + 'Verwijder</button>' + (ev.link && ev.link !== '#' ? '<a href="' + esc(ev.link) + '" target="_blank" rel="noopener" style="font-family:inherit;font-weight:600;font-size:14px;background:#fff;border:1px solid #DFD9C8;color:#0F2EA3;border-radius:11px;padding:10px 16px;text-decoration:none;display:flex;align-items:center;gap:7px;">' + ic('external-link', 15) + 'Open in Calendar</a>' : '<button data-mod="close" style="font-family:inherit;font-weight:600;font-size:14px;background:#050A30;color:#fff;border:none;border-radius:11px;padding:10px 16px;cursor:pointer;">Sluiten</button>') + '</div>';
      }
    } else if (m.type === 'plan') {
      m.title = 'Gesprek inplannen'; var d0 = new Date(m.startMs); var dStr = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0'); var tStr = String(d0.getHours()).padStart(2, '0') + ':' + String(d0.getMinutes()).padStart(2, '0');
      var icss = 'width:100%;font-family:inherit;font-size:14px;padding:10px 12px;border:1px solid #DFD9C8;border-radius:10px;background:#fff;color:#050A30;';
      var fld = function (lab, el) { return '<div><label style="font-size:12px;font-weight:600;margin-bottom:6px;display:block;">' + lab + '</label>' + el + '</div>'; };
      inner = '<div style="display:flex;flex-direction:column;gap:14px;">' +
        fld('Titel', '<input id="hr-plan-titel" value="' + esc(m.titel) + '" style="' + icss + '">') +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' + fld('Datum', '<input id="hr-plan-date" type="date" value="' + dStr + '" style="' + icss + '">') + fld('Tijd', '<input id="hr-plan-time" type="time" value="' + tStr + '" style="' + icss + '">') + fld('Duur', '<select id="hr-plan-dur" style="' + icss + '">' + [['0.5', '30 min'], ['1', '1 uur'], ['1.5', '1u30'], ['2', '2 uur']].map(function (o) { return '<option value="' + o[0] + '"' + (Number(o[0]) === m.dur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>') + '</div>' +
        fld('Locatie', '<input id="hr-plan-loc" value="' + esc(m.locatie || '') + '" style="' + icss + '">') +
        '<label style="display:flex;align-items:center;gap:10px;font-size:13.5px;cursor:pointer;"><input id="hr-plan-inv" type="checkbox"' + (m.invite ? ' checked' : '') + (m.cand && m.cand.email ? '' : ' disabled') + '>Nodig de kandidaat uit' + (m.cand && m.cand.email ? ' (' + esc(m.cand.email) + ')' : ' (geen e-mail bekend)') + '</label>' +
        '<label style="display:flex;align-items:center;gap:10px;font-size:13.5px;cursor:pointer;"><input id="hr-plan-meet" type="checkbox"' + (m.meet ? ' checked' : '') + '>Voeg een Google Meet-link toe</label>' +
        '</div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;"><button data-mod="close" style="font-family:inherit;font-weight:600;font-size:14px;background:#fff;border:1px solid #DFD9C8;border-radius:11px;padding:10px 16px;cursor:pointer;">Annuleer</button><button data-mod="plancreate" ' + (m.saving ? 'disabled' : '') + ' style="font-family:inherit;font-weight:600;font-size:14px;background:#D1F24C;color:#050A30;border:none;border-radius:11px;padding:10px 18px;cursor:pointer;display:flex;align-items:center;gap:8px;">' + ic(m.saving ? 'loader' : 'calendar-check', 15) + (m.saving ? 'Bezig…' : 'Plan gesprek') + '</button></div>';
    } else if (m.type === 'obperson') {
      var p = m.person || {}; m.title = p.id ? 'Collega bewerken' : 'Nieuwe collega';
      var ocss = 'width:100%;font-family:inherit;font-size:14px;padding:10px 12px;border:1px solid #DFD9C8;border-radius:10px;background:#fff;color:#050A30;';
      var ofld = function (lab, id, val, ph) { return '<div><label style="font-size:12px;font-weight:600;margin-bottom:6px;display:block;">' + lab + '</label><input id="' + id + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '" style="' + ocss + '"></div>'; };
      inner = '<div style="display:flex;flex-direction:column;gap:14px;">' +
        ofld('Naam', 'ob-name', p.name, 'bv. Jens De Backer') +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' + ofld('Rol', 'ob-role', p.role, 'bv. Account Manager') + ofld('Afdeling', 'ob-dept', p.dept, 'bv. Sales') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' + ofld('Startdatum', 'ob-start', p.start, 'bv. ma 1 jul') + ofld('Buddy', 'ob-buddy', p.buddy, 'bv. Ilke Janssens') + '</div>' +
        '</div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;"><button data-mod="close" style="font-family:inherit;font-weight:600;font-size:14px;background:#fff;border:1px solid #DFD9C8;border-radius:11px;padding:10px 16px;cursor:pointer;">Annuleer</button><button data-mod="obsave" ' + (m.saving ? 'disabled' : '') + ' style="font-family:inherit;font-weight:600;font-size:14px;background:#D1F24C;color:#050A30;border:none;border-radius:11px;padding:10px 18px;cursor:pointer;display:flex;align-items:center;gap:8px;">' + ic(m.saving ? 'loader' : 'check', 15) + (m.saving ? 'Bezig…' : 'Opslaan') + '</button></div>';
    } else if (m.type === 'mailthread') {
      m.title = 'Mailverkeer' + (m.naam ? ' · ' + m.naam : '');
      var banner = '';
      if (m.mailbox === 'no_scope') banner = '<div style="font-size:12.5px;color:#6B4D04;background:#FBF1D9;border:1px solid #F0E2BE;border-radius:10px;padding:9px 12px;margin-bottom:12px;display:flex;gap:8px;align-items:flex-start;">' + ic('info', 15, 'flex:none;margin-top:1px;') + '<span>Verzonden mails staan hier al. Inkomende antwoorden verschijnen zodra de Gmail-leestoegang is geactiveerd.</span></div>';
      var thread;
      if (m.loading) thread = '<div style="display:grid;place-items:center;padding:30px;"><div class="hr-spin"></div></div>';
      else if (!m.messages || !m.messages.length) thread = '<div style="text-align:center;color:#8E8979;font-size:13px;padding:22px 0;">Nog geen mailverkeer met deze kandidaat.</div>';
      else thread = m.messages.map(function (x) {
        var out = x.direction === 'out';
        var open = m.selected === x.id;
        var unread = !out && !x.read;
        var who = out ? 'Studio 27' : esc(x.from || m.email);
        var natt = (x.attachments || []).length;
        // klikbare kop (datum/onderwerp/thema/bijlagen in één oogopslag)
        var head = '<button data-mt="open:' + esc(x.id) + '" style="width:100%;text-align:left;font-family:inherit;background:' + (open ? '#F4F1E8' : 'none') + ';border:none;border-bottom:1px solid #F2EEE3;cursor:pointer;color:inherit;padding:11px 13px;display:flex;gap:11px;align-items:flex-start;">' +
          '<span style="width:28px;height:28px;border-radius:8px;flex:none;display:grid;place-items:center;background:' + (out ? '#050A30' : '#E0F1FD') + ';color:' + (out ? '#D1F24C' : '#0F2EA3') + ';">' + ic(out ? 'arrow-up-right' : 'arrow-down-left', 15) + '</span>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:baseline;gap:8px;"><span style="font-size:13px;font-weight:' + (unread ? '700' : '600') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(x.subject || '(geen onderwerp)') + '</span><span style="font-size:11px;color:#A7A293;margin-left:auto;white-space:nowrap;">' + esc(fmtDateTime(x.date)) + '</span></div>' +
            '<div style="display:flex;align-items:center;gap:7px;margin-top:2px;"><span style="font-size:11.5px;color:#8E8979;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;">' + (out ? 'Jij → ' : '') + who + ' · ' + esc(String(x.body || '').replace(/\s+/g, ' ').slice(0, 70)) + '</span>' +
              (natt ? '<span style="font-size:11px;color:#5E50C8;display:inline-flex;align-items:center;gap:3px;flex:none;">' + ic('paperclip', 12) + natt + '</span>' : '') +
              (unread ? '<span style="width:8px;height:8px;border-radius:50%;background:#28AFF9;flex:none;"></span>' : '') +
              ic(open ? 'chevron-up' : 'chevron-down', 15, 'color:#B8B2A2;flex:none;') + '</div>' +
          '</div></button>';
        if (!open) return head;
        var atts = (x.attachments || []).map(function (a) {
          return '<a href="' + esc(GATEWAY + (a.url || '')) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid #E2DCCD;border-radius:9px;padding:7px 11px;text-decoration:none;color:#26241F;font-size:12.5px;font-weight:500;">' + ic('paperclip', 13, 'color:#5E50C8;') + esc(a.filename || 'bijlage') + ic('download', 13, 'color:#2458EA;') + '</a>';
        }).join('');
        var detail = '<div style="padding:14px 15px 16px;background:#FFFDF8;border-bottom:1px solid #F2EEE3;">' +
          '<div style="font-size:12px;color:#8E8979;margin-bottom:9px;">' + (out ? 'Van Studio 27 (no-reply) · aan ' + esc(x.to || m.email) : 'Van ' + who) + ' · ' + esc(fmtDateTime(x.date)) + '</div>' +
          '<div style="font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:#26241F;">' + esc(x.body || '') + '</div>' +
          (atts ? '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:13px;">' + atts + '</div>' : '') +
          '<div style="margin-top:13px;"><button data-mt="reply:' + esc(x.id) + '" style="font-family:inherit;font-size:12.5px;font-weight:600;background:#fff;border:1px solid #DFD9C8;border-radius:9px;padding:7px 13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' + ic('reply', 14) + 'Beantwoorden</button></div>' +
        '</div>';
        return head + detail;
      }).join('');
      var aiBtns = [['afwijzen', 'Afwijzing'], ['uitnodiging', 'Uitnodiging'], ['cv_opvragen', 'CV opvragen']].map(function (o) { return '<button data-mt="ai:' + o[0] + '" ' + (m.aiBusy ? 'disabled' : '') + ' style="font-family:inherit;font-size:12px;font-weight:600;background:#fff;border:1px solid #DFD9C8;border-radius:9px;padding:6px 11px;cursor:pointer;">' + (m.aiBusy === o[0] ? '…' : 'AI: ' + o[1]) + '</button>'; }).join('');
      var compose = '<div style="border-top:1px solid #EFEADD;margin-top:14px;padding-top:14px;">' +
        '<div style="font-size:12px;color:#5E5A4F;margin-bottom:8px;">Aan: <b>' + esc(m.email || '(geen e-mailadres)') + '</b></div>' +
        '<input id="hr-mt-subject" value="' + esc(m.subject || '') + '" placeholder="Onderwerp" style="width:100%;font-family:inherit;font-size:13.5px;padding:9px 12px;border:1px solid #DFD9C8;border-radius:10px;background:#fff;margin-bottom:8px;box-sizing:border-box;">' +
        '<textarea id="hr-mt-body" placeholder="Schrijf een bericht…" style="width:100%;min-height:120px;font-family:inherit;font-size:13.5px;line-height:1.55;border:1px solid #DFD9C8;border-radius:10px;padding:11px;background:#fff;box-sizing:border-box;">' + esc(m.body || '') + '</textarea>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap;"><span style="font-size:11.5px;color:#8E8979;">Concept:</span>' + aiBtns +
          '<button data-mt="send" ' + (m.email && !m.sending ? '' : 'disabled') + ' style="margin-left:auto;font-family:inherit;font-weight:600;font-size:14px;background:#D1F24C;color:#050A30;border:none;border-radius:11px;padding:10px 18px;cursor:pointer;display:flex;align-items:center;gap:8px;' + (m.email ? '' : 'opacity:.5;cursor:not-allowed;') + '">' + ic(m.sending ? 'loader' : 'send', 15) + (m.sending ? 'Versturen…' : 'Verstuur') + '</button></div></div>';
      inner = banner + '<div style="max-height:46vh;overflow:auto;border:1px solid #EFEADD;border-radius:12px;background:#fff;">' + thread + '</div>' + compose;
    }
    var wrap = document.createElement('div'); wrap.id = 'hr-modal';
    wrap.innerHTML = '<div data-mod="close" style="position:fixed;inset:0;z-index:90;background:rgba(5,10,48,.4);"></div>' +
      '<div style="position:fixed;z-index:91;top:50%;left:50%;transform:translate(-50%,-50%);width:min(' + (m.type === 'mailthread' ? '720px' : '640px') + ',calc(100vw - 32px));max-height:88vh;overflow:auto;background:#FFFDF8;border-radius:22px;box-shadow:0 40px 90px -24px rgba(5,10,48,.5);padding:26px 28px;">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;"><h3 style="font-size:19px;font-weight:600;margin:0;flex:1;">' + esc(m.title || '') + '</h3><button data-mod="close" style="background:none;border:none;cursor:pointer;color:#8E8979;">' + ic('x', 22) + '</button></div>' + inner +
      '</div>';
    document.body.appendChild(wrap);
    wrap.onclick = function (e) {
      var b = e.target.closest && e.target.closest('[data-mod],[data-setstatus],[data-rm],[data-mt]'); if (!b) return;
      if (b.hasAttribute('data-rm')) { evInviteRemove(b.getAttribute('data-rm')); return; }
      if (b.hasAttribute('data-setstatus')) { setCandStatus(b.getAttribute('data-setstatus')); return; }
      if (b.hasAttribute('data-mt')) { mtAction(b.getAttribute('data-mt')); return; }
      var a = b.getAttribute('data-mod');
      if (a === 'close') { S.modal = null; wrap.remove(); }
      else if (a === 'copy') { try { navigator.clipboard.writeText(m.body); toast('Gekopieerd ✓'); } catch (x) {} }
      else if (a === 'sendmail') { sendMailNow(); }
      else if (a === 'evdelete') { evDelete(); }
      else if (a === 'evmeet') { evMeet(); }
      else if (a === 'evinvite') { evInviteAdd(); }
      else if (a === 'plancreate') { planCreate(); }
      else if (a === 'obsave') { obSavePerson(); }
    };
    refreshIcons();
  }
  async function setCandStatus(status) {
    var c = curCand(); if (!c) return; S.modal = null; renderModal();
    if (PREVIEW) { c.status_raw = status; c.status = status; render(); toast('Fase bijgewerkt (voorbeeld)'); return; }
    var prev = c.status_raw; c.status_raw = status; c.status = status; render();
    try { var r = await api('teamSolStatus', { task_id: c.id, status: status }); if (!r || !r.ok) throw 0; toast('Fase bijgewerkt ✓'); }
    catch (e) { c.status_raw = prev; render(); toast('Fase wijzigen mislukt.'); }
  }
  async function sendMailNow() {
    var m = S.modal; if (!m) return; var ta = $('hr-mailtext'); var tekst = ta ? ta.value : m.body;
    if (PREVIEW) { toast('Verzonden (voorbeeld)'); S.modal = null; renderModal(); return; }
    if (!confirm('Deze afwijsmail nu versturen naar ' + m.email + '?')) return;
    toast('Versturen…');
    try { var r = await api('teamKandidaatMail', { task_id: m.taskId, soort: m.soort || 'afwijzen', action: 'send', tekst: tekst }, { timeout: 45000 }); if (r && r.ok && r.sent) { toast('Mail verzonden ✓'); S.modal = null; renderModal(); } else toast((r && r.message) || 'Versturen mislukt.'); }
    catch (e) { toast('Versturen mislukt.'); }
  }

  /* ---------- in-portaal mailverkeer (thread + compose) ---------- */
  function openMailThread(prefill) {
    prefill = prefill || {};
    var c = curCand();
    var taskId = prefill.taskId || (c && c.id);
    if (!taskId) return;
    S.modal = { type: 'mailthread', taskId: taskId, naam: prefill.naam || (c && c.naam) || '', email: prefill.email || (c && c.email) || '', loading: !PREVIEW, mailbox: '', messages: [], selected: prefill.selectMailId || '', subject: prefill.subject || '', body: prefill.body || '', sending: false, aiBusy: '' };
    renderModal();
    if (PREVIEW) { S.modal.messages = mockThread(c || { naam: S.modal.naam, email: S.modal.email }); S.modal.mailbox = 'live'; S.modal.loading = false; if (!S.modal.selected && S.modal.messages.length) S.modal.selected = S.modal.messages[S.modal.messages.length - 1].id; renderModal(); return; }
    loadMailThread();
  }
  function mockThread(c) { return [{ id: 'm-out-1', direction: 'out', from: 'Studio 27', to: c.email, subject: 'Je sollicitatie bij Studio 27', body: 'Dag ' + (c.voornaam || c.naam || 'daar') + ',\n\nBedankt voor je sollicitatie, we bekijken ze graag.\n\nGroetjes,\nVincent', date: Date.now() - 86400000, read: true, attachments: [] }, { id: 'm-in-2', direction: 'in', from: c.email, subject: 'Re: Je sollicitatie bij Studio 27', body: 'Dag Vincent,\n\nDankjewel, ik kijk ernaar uit! In bijlage vind je mijn portfolio.', date: Date.now() - 3600000, read: false, attachments: [{ id: 'a1', filename: 'portfolio.pdf', url: '#', content_type: 'application/pdf' }] }]; }
  async function loadMailThread() {
    var m = S.modal; if (!m || m.type !== 'mailthread') return;
    try {
      var r = await api('teamKandidaatMailThread', { task_id: m.taskId }, { timeout: 30000 });
      if (S.modal !== m) return;
      if (r && r.ok) { m.messages = r.messages || []; m.mailbox = r.mailbox || ''; if (!m.email && r.email) m.email = r.email; if (!m.naam && r.naam) m.naam = r.naam; }
    } catch (e) { /* fail-soft: compose blijft werken */ }
    if (S.modal !== m) return;
    // standaard het laatste bericht open; bij deep-link het aangeklikte bericht
    if (!m.selected && m.messages.length) m.selected = m.messages[m.messages.length - 1].id;
    var sel = (m.messages || []).filter(function (x) { return x.id === m.selected; })[0];
    if (sel && sel.direction === 'in' && !sel.read) { sel.read = true; markMailRead(sel.id); }
    mtCapture(); m.loading = false; renderModal();
  }
  // markeer een mail als gelezen (server + lokale bel-teller). Idempotent: elke mail
  // wordt deze sessie hooguit één keer geteld/geserverd (deep-link + thread-open kunnen
  // dezelfde mail anders dubbel markeren → dubbele bel-aftelling).
  function markMailRead(mailId) {
    if (!mailId) return;
    S._markedRead = S._markedRead || {};
    if (S._markedRead[mailId]) return;
    S._markedRead[mailId] = 1;
    if (S.notifs) S.notifs = S.notifs.filter(function (n) { return n.id !== mailId; });
    S.notifCount = Math.max(0, (S.notifCount || 0) - 1);
    if (!PREVIEW) api('teamHrNotifMark', { mail_id: mailId }).then(function (r) { if (r && r.ok) { S.notifCount = r.count; render(); } }).catch(function () {});
  }
  function mtCapture() { var m = S.modal; if (!m) return; var s = $('hr-mt-subject'), b = $('hr-mt-body'); if (s) m.subject = s.value; if (b) m.body = b.value; }
  function mtAction(cmd) {
    if (cmd === 'send') { sendThreadMail(); return; }
    if (cmd.indexOf('ai:') === 0) { mtDraft(cmd.slice(3)); return; }
    if (cmd.indexOf('open:') === 0) { mtOpen(cmd.slice(5)); return; }
    if (cmd.indexOf('reply:') === 0) { mtReply(cmd.slice(6)); return; }
  }
  function mtOpen(id) {
    var m = S.modal; if (!m) return; mtCapture();
    m.selected = (m.selected === id) ? '' : id;
    if (m.selected === id) {
      var msg = (m.messages || []).filter(function (x) { return x.id === id; })[0];
      if (msg && msg.direction === 'in' && !msg.read) { msg.read = true; markMailRead(id); }
    }
    renderModal();
  }
  function mtReply(id) {
    var m = S.modal; if (!m) return; mtCapture();
    var msg = (m.messages || []).filter(function (x) { return x.id === id; })[0];
    var subj = msg ? String(msg.subject || '') : '';
    if (subj && !/^re:/i.test(subj)) subj = 'Re: ' + subj;
    m.subject = subj;
    renderModal();
    var ta = $('hr-mt-body'); if (ta) ta.focus();
  }
  async function mtDraft(soort) {
    var m = S.modal; if (!m) return; mtCapture();
    if (PREVIEW) { m.subject = soort === 'uitnodiging' ? 'Uitnodiging voor een gesprek bij Studio 27' : (soort === 'cv_opvragen' ? 'Je sollicitatie bij Studio 27, cv' : 'Je sollicitatie bij Studio 27'); m.body = 'Dag ' + (m.naam || 'daar') + ',\n\n[AI-concept in voorbeeldmodus]\n\nGroetjes,\nVincent'; renderModal(); return; }
    m.aiBusy = soort; renderModal();
    try { var r = await api('teamKandidaatMail', { task_id: m.taskId, soort: soort, action: 'preview' }, { timeout: 60000 }); if (S.modal === m && r && r.ok) { m.subject = r.onderwerp || m.subject; m.body = r.tekst || m.body; } else if (!(r && r.ok)) toast((r && r.message) || 'Concept opstellen mislukt.'); }
    catch (e) { toast('Concept opstellen mislukt.'); }
    if (S.modal === m) { m.aiBusy = ''; renderModal(); }
  }
  async function sendThreadMail() {
    var m = S.modal; if (!m) return; mtCapture();
    if (!m.email) { toast('Geen e-mailadres bekend.'); return; }
    if (!(m.body || '').trim()) { toast('De mail is nog leeg.'); return; }
    if (PREVIEW) { m.messages.push({ direction: 'out', from: 'Studio 27', subject: m.subject, body: m.body, date: Date.now() }); m.body = ''; renderModal(); toast('Verzonden (voorbeeld)'); return; }
    if (!confirm('Deze mail nu versturen naar ' + m.email + '?')) return;
    m.sending = true; renderModal();
    try {
      var r = await api('teamKandidaatMailSend', { task_id: m.taskId, to: m.email, subject: m.subject, body: m.body }, { timeout: 45000 });
      if (S.modal !== m) return;
      if (r && r.ok && r.sent) { m.body = ''; m.sending = false; renderModal(); toast('Mail verzonden ✓'); loadMailThread(); }
      else { m.sending = false; renderModal(); toast((r && r.message) || 'Versturen mislukt.'); }
    } catch (e) { if (S.modal === m) { m.sending = false; renderModal(); } toast('Versturen mislukt.'); }
  }

  /* ---------- boot ---------- */
  function start() {
    parseHash();
    window.addEventListener('hashchange', function () { parseHash(); if (S.ready && S.screen === 'kandidaat' && S.candId) loadCandDocs(S.candId); render(); });
    window.addEventListener('resize', function () { var w = window.innerWidth; if (Math.abs(w - S.vw) > 40) { S.vw = w; render(); } });
    if (PREVIEW) { S.ready = true; S.phase = 'ready'; S.email = 'preview'; S.candidates = mockCandidates(); S.statussen = MOCK_STATUSSEN; if (S.screen === 'vacatures' || S.screen === 'dashboard') S.jobs = mockJobs(); if (S.screen === 'onboarding') { S.obPeople = mockOnboardingPeople(); S.obDone = mockObDone(); } if (S.screen === 'selectie') { S.agendaEvents = mockAgendaEvents(); } if (S.screen === 'instellingen') loadInstellingen(); render(); return; }
    window.S27TeamAuth.init({ gatewayBase: GATEWAY });
    window.S27TeamAuth.subscribe(function (st) {
      S.phase = st.phase; S.email = st.email || '';
      if (st.phase === 'ready') { S.ready = true; S.noaccess = false; if (S.candidates == null && (S.screen === 'kandidaten' || S.screen === 'kandidaat' || S.screen === 'dashboard')) loadCandidates(); if (S.jobs == null && (S.screen === 'vacatures' || S.screen === 'dashboard')) loadVacatures(); if (S.obPeople == null && S.screen === 'onboarding') loadOnboarding(); if (S.agendaEvents == null && S.screen === 'selectie') loadAgenda(); if (S.integrations == null && S.screen === 'instellingen') loadInstellingen(); if (S.screen === 'kandidaat' && S.candId) loadCandDocs(S.candId); if (!S._notifTimer) startNotifPoll(); render(); }
      else if (st.phase === 'no_access') { S.ready = false; S.noaccess = true; render(); }
      else { S.ready = false; S.noaccess = false; render(); }
    });
    render();
  }
  // Notificaties periodiek verversen zodat een nieuw bericht in de bel verschijnt.
  function startNotifPoll() {
    if (S._notifTimer || PREVIEW) return;
    loadNotifs();
    S._notifTimer = setInterval(function () { if (!document.hidden && S.ready) loadNotifs(); }, 90000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
