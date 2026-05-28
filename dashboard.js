(function(){
'use strict';

/* =================================================================
   CONFIG
   ================================================================= */
const ENDPOINTS = {
  // v1 — folder 12 KLANTPORTAAL (existing portal scenarios)
  login:           'https://hook.eu1.make.com/gk7fxusnnrwkyfhcpyup8w39ygoz5m5u',
  dashboard:       'https://hook.eu1.make.com/q1hklcvhum7m14ie57p6t6ci7l6un48e',
  projectDetail:   'https://hook.eu1.make.com/1mmhcsa0sie22po3kbwcx423dakidc44',
  calendar:        'https://hook.eu1.make.com/5e1chj9seh9jlw7nejhytwjg66i7vzyd',
  uploadProject:   'https://hook.eu1.make.com/rk5ui1ueb4j42hiqye8dfzfmka0gf318',
  uploadAlg:       'https://hook.eu1.make.com/hyf7ejtbskq743d56nveucv9xto5yo8c',
  // v2 — folder 13 KLANTPORTAAL v2 (built by background agent #1, all active)
  bedrijfContent:    'https://hook.eu1.make.com/o1gvlndn934h2u77vug6k59xgt2qgz6g',
  bedrijfVoorkeuren: 'https://hook.eu1.make.com/fhenjvxv47ldoea5k8h646ovn5gzvgnv',
  chatPost:          'https://hook.eu1.make.com/vi12objw9nkrjg1i8ve13jwj354pvg9n',
  chatList:          'https://hook.eu1.make.com/a43sc5vjuic6lpjdehq8pvhn8sjftbn3',
  feedbackV2:        'https://hook.eu1.make.com/vpd7to9pn8ritsih38s4apika49lg31o',
  newProjectIntake:  'https://hook.eu1.make.com/kbomkcljmi9b2oyphmk938wb1qgwll1j'
};

/* =================================================================
   BRAND CATEGORIEËN (Mijn bedrijf tab)
   ================================================================= */
const BRAND_CATEGORIES = [
  { id:'logos',      label:"Logo's",        icon:'s27p-brand', accent:'#9441DB', accept:'.png,.svg,.jpg,.jpeg,.ai,.eps,.pdf', hint:'PNG / SVG / AI / EPS' },
  { id:'fonts',      label:'Fonts',         icon:'s27p-spark', accent:'#F66131', accept:'.ttf,.otf,.woff,.woff2,.pdf,.zip', hint:'TTF / OTF / WOFF / PDF spec' },
  { id:'kleuren',    label:'Kleuren',       icon:'s27p-brand', accent:'#3083DC', accept:'.pdf,.png,.jpg,.jpeg,.ase,.txt', hint:'PDF palette / hex-codes' },
  { id:'brand_pdfs', label:'Brand-PDFs',    icon:'s27p-inbox', accent:'#12AC4E', accept:'.pdf', hint:'Style guides / brand books' },
  { id:'fotos',      label: "Foto's",       icon:'s27p-cam',   accent:'#F8C028', accept:'.jpg,.jpeg,.png,.heic,.tif,.tiff,.raw', hint:'JPG / PNG / HEIC' },
  { id:'overig',     label:'Overig',        icon:'s27p-link',  accent:'#6B5B6B', accept:'*', hint:'Alle andere assets' }
];

function categoryFromFilename(name){
  const lower = (name||'').toLowerCase();
  // Prefix-based (preferred): [LOGO] xxx, [FONT] xxx, ...
  const prefixMatch = lower.match(/^\[(logo|font|kleur|brand|foto|overig)\]/);
  if(prefixMatch){
    const map = { logo:'logos', font:'fonts', kleur:'kleuren', brand:'brand_pdfs', foto:'fotos', overig:'overig' };
    return map[prefixMatch[1]];
  }
  // Extension-based fallback
  const ext = lower.split('.').pop();
  if(['png','svg','ai','eps'].includes(ext)) return 'logos';
  if(['ttf','otf','woff','woff2'].includes(ext)) return 'fonts';
  if(['ase'].includes(ext)) return 'kleuren';
  if(['pdf'].includes(ext)) return 'brand_pdfs';
  if(['jpg','jpeg','heic','tif','tiff','raw'].includes(ext)) return 'fotos';
  return 'overig';
}

function getMockBedrijfContent(){
  return {
    algemene_voorkeuren: '',
    categorieen: {
      logos: [], fonts: [], kleuren: [], brand_pdfs: [], fotos: [], overig: []
    }
  };
}
const FEEDBACK_BASE_URL = 'https://studio27.be/feedback'; // wordt: ?taskId=...
const SESSION_KEY = 's27_session_v1';
const REMEMBER_KEY = 's27_remember_v1';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

const DISCIPLINES = [
  { id:'video_fotografie', label:'Video & fotografie', icon:'s27p-cam' },
  { id:'webdesign',        label:'Webdesign',          icon:'s27p-web' },
  { id:'branding',         label:'Branding',           icon:'s27p-brand' },
  { id:'social',           label:'Social media',       icon:'s27p-soc' },
  { id:'ads',              label:'Adverteren',         icon:'s27p-ads' },
  { id:'seo',              label:'SEO & GEO',          icon:'s27p-seo' },
  { id:'opleiding',        label:'Opleidingen',        icon:'s27p-opl' },
  { id:'automation',       label:'Automations',        icon:'s27p-auto' },
  { id:'strategie',        label:'Strategie',          icon:'s27p-strat' }
];
const STATUS_LABELS = {
  'to_do':'Te plannen', 'in_progress':'In productie', 'doorgestuurd':'Klaar voor review',
  'goedgekeurd':'Goedgekeurd', 'done':'Afgerond', 'on_hold':'On hold',
  'klaar_voor_facturatie':'Afgerond', 'gefactureerd':'Afgerond'
};

/* =================================================================
   STATE
   ================================================================= */
const state = {
  session: null,             // { bedrijf_id, bedrijfsnaam, session_token, expires_at }
  dashboard: null,           // gerenderde data
  demoMode: false,
  uploadQueue: [],
  activeTab: 'dashboard',    // 'dashboard' | 'bedrijf' | 'goedgekeurd' | 'nieuw' | 'instellingen'
  statusFilter: 'alle'       // 'alle' | 'in_te_plannen' | 'ingepland' | 'wacht_feedback' | 'opgeleverd'
};

const STATUS_FILTERS = [
  { id:'alle',           label:'Alle' },
  { id:'in_te_plannen',  label:'In te plannen' },
  { id:'ingepland',      label:'Ingepland' },
  { id:'wacht_feedback', label:'Wacht op jouw feedback' },
  { id:'opgeleverd',     label:'Opgeleverd' }
];

function matchesStatusFilter(p, filter){
  const st = (p.status || '').toLowerCase().replace(/\s+/g, '_');
  switch(filter){
    case 'alle':           return true;
    case 'in_te_plannen':  return st === 'to_do';
    case 'ingepland':      return st === 'in_progress' || p.kan_beginnen === true;
    case 'wacht_feedback': return st === 'doorgestuurd';
    case 'opgeleverd':     return st === 'goedgekeurd' || st === 'done' || st === 'klaar_voor_facturatie' || st === 'gefactureerd';
    default:               return true;
  }
}

function firstNameFromCompany(n){
  if(!n) return 'daar';
  // Strip legal suffix (BV, NV, BVBA, BVOF, Comm.V, etc.)
  return n.replace(/\s+(BV|NV|BVBA|BVOF|Comm\.?V|VOF|VZW|N\.V\.|B\.V\.|S\.A\.|SARL)\b\.?$/i, '').trim();
}

/* =================================================================
   UTILS
   ================================================================= */
const $ = id => document.getElementById(id);
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function qs(){ return new URLSearchParams(window.location.search); }

async function api(url, payload){
  try {
    const r = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload || {})
    });
    const t = await r.text();
    try { return { ok:r.ok, status:r.status, data:JSON.parse(t) }; }
    catch { return { ok:r.ok, status:r.status, data:{ _raw:t } }; }
  } catch(e){ return { ok:false, status:0, error:e.message }; }
}

function fmtDate(d){
  if(!d) return '';
  try {
    const dt = (typeof d === 'string' || typeof d === 'number') ? new Date(d) : d;
    if(isNaN(dt)) return '';
    return dt.toLocaleDateString('nl-BE',{day:'numeric',month:'short',year:'numeric'});
  } catch { return ''; }
}
function fmtDay(d){ try{ const dt=new Date(d); return isNaN(dt)?'':dt.getDate(); } catch{ return ''; } }
function fmtMonth(d){ try{ const dt=new Date(d); return isNaN(dt)?'':dt.toLocaleDateString('nl-BE',{month:'short'}).replace('.','').toUpperCase(); } catch{ return ''; } }
function fmtRelTime(d){
  if(!d) return '';
  try {
    const dt = new Date(d), now = new Date();
    const ms = now - dt, m = Math.floor(ms/60000), h = Math.floor(m/60), days = Math.floor(h/24);
    if(m < 1)  return 'net nu';
    if(m < 60) return m + ' min geleden';
    if(h < 24) return h + ' uur geleden';
    if(days < 7) return days + ' d geleden';
    return fmtDate(d);
  } catch { return ''; }
}
function bytes(b){ if(b<1024) return b+' B'; if(b<1024*1024) return (b/1024).toFixed(0)+' KB'; return (b/(1024*1024)).toFixed(1)+' MB'; }
function getInitials(name){
  if(!name) return '??';
  const p = name.trim().split(/\s+/);
  if(p.length === 1) return p[0].substr(0,2).toUpperCase();
  return (p[0][0] + p[p.length-1][0]).toUpperCase();
}
function discMeta(id){ return DISCIPLINES.find(d => d.id === id) || { id, label:id||'Onbekend', icon:'s27p-spark' }; }

/* =================================================================
   SESSION HANDLING
   ================================================================= */
function loadSession(){
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    if(s.expires_at && new Date(s.expires_at) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}
function saveSession(s, remember){
  state.session = s;
  if(remember) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
function clearSession(){
  state.session = null;
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

/* =================================================================
   LOGIN FLOW
   ================================================================= */
function showLogin(){
  $('s27-login-view').style.display = 'flex';
  $('s27-dash-view').style.display = 'none';
}
function showDashboard(){
  $('s27-login-view').style.display = 'none';
  $('s27-dash-view').style.display = 'block';
}
function showLoginError(msg){
  const el = $('s27-login-err');
  el.textContent = msg;
  el.style.display = 'block';
}

async function handleLogin(e){
  if(e && e.preventDefault) e.preventDefault();
  if(e && e.stopPropagation) e.stopPropagation();
  // hide Webflow's form fail/done feedback (in case form is wrapped in w-form)
  document.querySelectorAll('#s27-portal .w-form-fail, #s27-portal .w-form-done').forEach(el => el.style.display = 'none');
  const btn = $('s27-login-btn');
  const bedrijfsnaam = $('s27-bedrijfsnaam').value.trim();
  const token = $('s27-token').value.trim();
  const remember = $('s27-remember').checked;
  $('s27-login-err').style.display = 'none';
  if(!bedrijfsnaam || !token){ showLoginError('Vul beide velden in.'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span>Even controleren…</span>';

  const res = await api(ENDPOINTS.login, { bedrijf_naam: bedrijfsnaam, token: token });
  btn.disabled = false;
  btn.innerHTML = '<span>Inloggen</span>';

  if(!res.ok || !res.data || res.data.ok === false){
    showLoginError(res.data && res.data.message ? res.data.message : 'Inloggen mislukt. Controleer je bedrijfsnaam en code.');
    return;
  }
  const sess = {
    bedrijf_id: res.data.bedrijf_id,
    bedrijfsnaam: res.data.bedrijfsnaam || bedrijfsnaam,
    session_token: res.data.session_token,
    expires_at: res.data.expires_at
  };
  saveSession(sess, remember);
  showDashboard();
  loadDashboard();
}

function handleLogout(){
  if(!confirm('Wil je echt uitloggen? Je kan altijd opnieuw inloggen met je code.')) return;
  clearSession();
  $('s27-bedrijfsnaam').value = '';
  $('s27-token').value = '';
  showLogin();
}

/* =================================================================
   DASHBOARD LOAD
   ================================================================= */
async function loadDashboard(){
  $('s27-klant-naam').innerHTML = '<small>Portaal</small><span>' + esc(state.session.bedrijfsnaam) + '</span>';
  $('s27-dash-body').innerHTML = '<div class="s27-loading">Dashboard laden</div>';

  let data;
  if(state.demoMode){
    data = getDemoData();
  } else {
    const res = await api(ENDPOINTS.dashboard, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token });
    if(!res.ok || !res.data || res.data.error){
      $('s27-dash-body').innerHTML = '<div class="s27-error">We krijgen geen verbinding met het portaal. Probeer zo opnieuw of mail naar <a href="mailto:ilke@studio27.be">ilke@studio27.be</a>.</div>';
      return;
    }
    data = normaliseDashboard(res.data);
  }
  state.dashboard = data;
  renderDashboard(data);
}

function normaliseDashboard(d){
  // defensive defaults — als webhook nog geen volledige data teruggeeft, vallen we netjes terug
  return {
    klant: d.klant || { bedrijfsnaam: state.session.bedrijfsnaam },
    stats: d.stats || {},
    actieve_projecten: Array.isArray(d.actieve_projecten) ? d.actieve_projecten : [],
    historie_3mnd: Array.isArray(d.historie_3mnd) ? d.historie_3mnd : [],
    aankomende_meetings: Array.isArray(d.aankomende_meetings) ? d.aankomende_meetings : [],
    contact: d.contact || { am_naam:'Ilke Meeusen', am_email:'ilke@studio27.be', am_rol:'Account manager' }
  };
}

/* =================================================================
   RENDER DASHBOARD
   ================================================================= */
function renderDashboard(d){
  // Persoonlijke compacte begroeting in hero (1 regel)
  const greetingName = firstNameFromCompany(d.klant && d.klant.bedrijfsnaam);
  const heroTitle = $('s27-hero-title');
  if(heroTitle) heroTitle.innerHTML = '<span class="greeting">Hey ' + esc(greetingName) + ',</span><span class="s27-hero-subline">Hier zijn jouw lopende projecten.</span>';
  // Verberg verbose hero-lead voor compacter overzicht
  const heroLead = document.querySelector('#s27-tab-dashboard .s27-hero-lead'); if(heroLead) heroLead.style.display = 'none';
  const heroTag  = document.querySelector('#s27-tab-dashboard .s27-hero-tag');  if(heroTag) heroTag.style.display = 'none';

  const body = $('s27-dash-body');
  const allProjecten = d.actieve_projecten || [];
  const filtered = allProjecten.filter(p => matchesStatusFilter(p, state.statusFilter));
  const projectenByDisc = groupBy(filtered, p => p.discipline);
  const meetings = d.aankomende_meetings || [];

  // Count per filter voor chip badges
  const counts = {};
  STATUS_FILTERS.forEach(f => { counts[f.id] = allProjecten.filter(p => matchesStatusFilter(p, f.id)).length; });

  // Default uitklappen: als <= 4 disciplines, alles open; anders alleen waar projecten met "wacht op feedback" zijn + eerste discipline
  if(!state.expandedDisciplines){
    state.expandedDisciplines = {};
    const disciplineKeys = Object.keys(projectenByDisc);
    if(disciplineKeys.length <= 4){
      disciplineKeys.forEach(k => state.expandedDisciplines[k] = true);
    } else {
      // Open disciplines die feedback nodig hebben
      disciplineKeys.forEach(k => {
        const hasWaiting = projectenByDisc[k].some(p => (p.status||'').toLowerCase() === 'doorgestuurd');
        state.expandedDisciplines[k] = hasWaiting;
      });
      // Als geen enkele open, open de eerste
      if(!Object.values(state.expandedDisciplines).some(Boolean)) state.expandedDisciplines[disciplineKeys[0]] = true;
    }
  }

  body.innerHTML = `
    <div class="s27-home-filterhead">
      <div class="s27-home-filterhead-label">Filter op status</div>
      ${renderFilterBar(counts)}
    </div>
    ${renderDisciplinesAccordion(projectenByDisc)}
    <div class="s27-meetings-mini">
      <div class="s27-meetings-mini-head">
        <strong>Aankomende meetings</strong>
        ${meetings.length ? '<button class="s27-mini-cta" data-go-tab="meetings">Alle ' + meetings.length + ' bekijken →</button>' : ''}
      </div>
      ${meetings.length ? '<div class="s27-meetings-mini-list">' + meetings.slice(0,2).map(renderMiniMeeting).join('') + '</div>' : '<p class="s27-meetings-mini-empty">Geen meetings gepland.</p>'}
    </div>
    <div class="s27-home-contact" id="contact">${renderContact(d.contact || {})}</div>
  `;

  attachDashboardHandlers();
  $('s27-updated').textContent = 'Bijgewerkt om ' + new Date().toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'});
}

function renderDisciplinesAccordion(grouped){
  const orderedKeys = DISCIPLINES.map(d=>d.id).filter(k => grouped[k] && grouped[k].length);
  if(!orderedKeys.length){
    return '<div class="s27-empty"><div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-inbox"/></svg></div><div class="s27-empty-title">Niets in deze filter</div><p class="s27-empty-sub">Probeer een andere status of "Alle".</p></div>';
  }
  return '<div class="s27-acc-list">' + orderedKeys.map(key => {
    const meta = discMeta(key);
    const projs = grouped[key];
    const isOpen = !!state.expandedDisciplines[key];
    const waitingCount = projs.filter(p => (p.status||'').toLowerCase() === 'doorgestuurd').length;
    return '<div class="s27-acc" data-disc="' + esc(key) + '" data-discipline="' + esc(key) + '">' +
      '<button class="s27-acc-head" aria-expanded="' + (isOpen ? 'true' : 'false') + '" data-disc-toggle="' + esc(key) + '">' +
        '<span class="s27-acc-chevron">' + (isOpen ? '▼' : '▶') + '</span>' +
        '<span class="s27-acc-icon"><svg width="16" height="16" viewBox="0 0 24 24"><use href="#' + meta.icon + '"/></svg></span>' +
        '<span class="s27-acc-title">' + esc(meta.label) + '</span>' +
        '<span class="s27-acc-count">' + projs.length + '</span>' +
        (waitingCount ? '<span class="s27-acc-flag">' + waitingCount + ' wacht op jou</span>' : '') +
      '</button>' +
      (isOpen ? '<div class="s27-acc-body">' + projs.map(renderProjectCompact).join('') + '</div>' : '') +
    '</div>';
  }).join('') + '</div>';
}

function renderProjectCompact(p){
  const statusKey = (p.status || 'in_progress').toLowerCase().replace(/\s+/g,'_');
  const statusLabel = p.status_label || STATUS_LABELS[statusKey] || p.status || 'In productie';
  const needsFeedback = statusKey === 'doorgestuurd' || p.feedback_link;
  return '<div class="s27-projc" data-task-id="' + esc(p.task_id || '') + '" tabindex="0" role="button" aria-label="' + esc(p.naam) + '">' +
    '<div class="s27-projc-main">' +
      '<div class="s27-projc-name">' + esc(p.naam || 'Project') + '</div>' +
      '<div class="s27-projc-meta">' +
        (p.opleverdatum ? '<span>📅 ' + esc(fmtDate(p.opleverdatum)) + '</span>' : '') +
        (p.type ? '<span>· ' + esc(p.type) + '</span>' : '') +
        (p.laatst_geupdatet ? '<span>· ' + esc(fmtRelTime(p.laatst_geupdatet)) + '</span>' : '') +
      '</div>' +
    '</div>' +
    '<div class="s27-projc-right">' +
      (needsFeedback ? '<span class="s27-projc-flag">🔔 Wacht op jou</span>' : '') +
      '<span class="s27-projc-status" data-status="' + esc(statusKey) + '">' + esc(statusLabel) + '</span>' +
      '<span class="s27-projc-arrow">→</span>' +
    '</div>' +
  '</div>';
}

function renderMiniMeeting(m){
  return '<div class="s27-mini-meeting">' +
    '<span class="s27-mini-meeting-date"><strong>' + fmtDay(m.datum) + '</strong>' + fmtMonth(m.datum) + '</span>' +
    '<div><div class="s27-mini-meeting-title">' + esc(m.titel || 'Meeting') + '</div>' +
    '<div class="s27-mini-meeting-meta">' + esc(m.tijdslot || '') + (m.type ? ' · ' + esc(m.type) : '') + '</div></div>' +
  '</div>';
}

function renderFilterBar(counts){
  return '<div class="s27-filterbar" role="tablist">' +
    STATUS_FILTERS.map(f =>
      '<button class="s27-chip" data-filter="' + f.id + '" aria-pressed="' + (state.statusFilter === f.id ? 'true' : 'false') + '">' +
        esc(f.label) +
        '<span class="count">' + (counts[f.id] || 0) + '</span>' +
      '</button>'
    ).join('') +
  '</div>';
}

function renderStats(stats, totalProjecten, totalDisc){
  const items = [
    { tone:'',       label:'Actieve projecten',     value: stats.actieve_projecten ?? totalProjecten, hint: totalDisc + ' discipline' + (totalDisc===1?'':'s') + ' actief' },
    { tone:'orange', label:'Wacht op jouw feedback', value: stats.openstaande_feedback ?? 0, hint:'Klik op een project hieronder' },
    { tone:'purple', label:'Geplande deze week',    value: stats.deze_week ?? 0, hint:'Shoots, meetings of opleveringen' },
    { tone:'green',  label:'Opgeleverd 30 dagen',   value: stats.opgeleverd_30d ?? 0, hint:'Klaar en goedgekeurd' }
  ];
  return `<div class="s27-stats">${items.map(s => `
    <div class="s27-stat" ${s.tone?'data-tone="'+s.tone+'"':''}>
      <div class="s27-stat-label">${esc(s.label)}</div>
      <div class="s27-stat-value">${esc(s.value)}</div>
      <div class="s27-stat-hint">${esc(s.hint)}</div>
    </div>
  `).join('')}</div>`;
}

function renderDisciplines(grouped){
  const orderedKeys = DISCIPLINES.map(d=>d.id).filter(k => grouped[k] && grouped[k].length);
  if(!orderedKeys.length){
    return `<div class="s27-empty">
      <div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-inbox"/></svg></div>
      <div class="s27-empty-title">Geen lopende projecten</div>
      <p class="s27-empty-sub">Op dit moment loopt er niets. Zodra we voor jou aan de slag gaan, verschijnt het hier automatisch.</p>
    </div>`;
  }
  return orderedKeys.map(key => {
    const meta = discMeta(key);
    const projs = grouped[key];
    return `<div class="s27-disc-group" data-discipline="${esc(key)}">
      <div class="s27-disc-head">
        <span class="s27-disc-icon"><svg style="color:var(--accent-ink)"><use href="#${meta.icon}"/></svg></span>
        <span class="s27-disc-title">${esc(meta.label)}</span>
        <span class="s27-disc-count">${projs.length} ${projs.length===1?'project':'projecten'}</span>
      </div>
      <div class="s27-proj-grid">${projs.map(renderProject).join('')}</div>
    </div>`;
  }).join('');
}

function renderProject(p){
  const statusKey = (p.status || 'in_progress').toLowerCase().replace(/\s+/g,'_');
  const statusLabel = p.status_label || STATUS_LABELS[statusKey] || p.status || 'In productie';
  const needsFeedback = statusKey === 'doorgestuurd' || p.feedback_link;
  // Voortgangsbalken verwijderd in v2 — niet indicatief voor klant
  return `<div class="s27-proj" data-task-id="${esc(p.task_id || '')}" tabindex="0" role="button" aria-label="Bekijk ${esc(p.naam)}">
    ${needsFeedback ? '<span class="s27-proj-flag">Wacht op jou</span>' : ''}
    <div class="s27-proj-head">
      <div class="s27-proj-name">${esc(p.naam || 'Project')}</div>
      <span class="s27-proj-status" data-status="${esc(statusKey)}">${esc(statusLabel)}</span>
    </div>
    <div class="s27-proj-meta">
      ${p.opleverdatum ? `<span><svg><use href="#s27p-cal"/></svg> Oplevering: ${esc(fmtDate(p.opleverdatum))}</span>` : ''}
      ${p.type        ? `<span><svg><use href="#s27p-spark"/></svg> ${esc(p.type)}</span>` : ''}
      ${p.laatst_geupdatet ? `<span><svg><use href="#s27p-clock"/></svg> ${esc(fmtRelTime(p.laatst_geupdatet))}</span>` : ''}
    </div>
    <div class="s27-proj-cta">
      <span class="s27-proj-cta-text">${needsFeedback ? 'Geef feedback' : 'Bekijk details'}</span>
      <span class="s27-proj-cta-arrow">→</span>
    </div>
  </div>`;
}

function renderMeetings(meetings){
  if(!meetings.length){
    return `<div class="s27-empty">
      <div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-cal"/></svg></div>
      <div class="s27-empty-title">Geen aankomende meetings</div>
      <p class="s27-empty-sub">Zodra er een meeting wordt ingepland, zie je het hier verschijnen.</p>
    </div>`;
  }
  return `<div class="s27-meetings">${meetings.map(m => `
    <div class="s27-meeting">
      <div class="s27-meeting-date">
        <div class="s27-meeting-day">${fmtDay(m.datum)}</div>
        <div class="s27-meeting-month">${fmtMonth(m.datum)}</div>
      </div>
      <div class="s27-meeting-body">
        <div class="s27-meeting-title">${esc(m.titel || 'Meeting')}</div>
        <div class="s27-meeting-meta">
          ${m.tijdslot ? `<span><svg><use href="#s27p-clock"/></svg> ${esc(m.tijdslot)}</span>` : ''}
          ${m.type     ? `<span><svg><use href="#s27p-spark"/></svg> ${esc(m.type)}</span>` : ''}
          ${m.locatie  ? `<span><svg><use href="#s27p-pin"/></svg> ${esc(m.locatie)}</span>` : ''}
        </div>
      </div>
      ${m.link ? `<div class="s27-meeting-action"><a href="${esc(m.link)}" target="_blank" rel="noopener"><svg width="13" height="13"><use href="#s27p-link"/></svg> Open</a></div>` : ''}
    </div>
  `).join('')}</div>`;
}

function renderHistorie(items){
  if(!items.length){
    return `<div class="s27-empty">
      <div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-spark"/></svg></div>
      <div class="s27-empty-title">Nog niets opgeleverd in de laatste 3 maanden</div>
      <p class="s27-empty-sub">Zodra een project wordt afgerond, vind je hier de definitieve bestanden.</p>
    </div>`;
  }
  return `<div class="s27-historie">${items.map(h => {
    const meta = discMeta(h.discipline);
    return `<div class="s27-hist">
      <div class="s27-hist-head">
        <span class="s27-hist-disc">${esc(meta.label)}</span>
        <span class="s27-hist-date">${esc(fmtDate(h.afgerond_op))}</span>
      </div>
      <div class="s27-hist-name">${esc(h.naam || 'Project')}</div>
      <div class="s27-hist-deliv">
        ${(h.deliverables||[]).map(d => `<a href="${esc(d.url)}" target="_blank" rel="noopener"><svg width="11" height="11"><use href="#s27p-link"/></svg> ${esc(d.label || 'Link')}</a>`).join('')}
      </div>
    </div>`;
  }).join('')}</div>`;
}

function renderUploadZone(){
  return `<div class="s27-upload" id="s27-drop">
    <div class="s27-upload-icon"><svg width="22" height="22"><use href="#s27p-upload"/></svg></div>
    <div class="s27-upload-title">Sleep bestanden hier of klik om te uploaden</div>
    <div class="s27-upload-sub">Logo's, brand-bestanden, referenties of andere assets. Max 5 MB per bestand, 25 MB totaal.<br>Grotere bestanden? Stuur via WeTransfer naar <a href="mailto:ilke@studio27.be">ilke@studio27.be</a>.</div>
    <label class="s27-upload-btn" for="s27-up-input"><svg width="12" height="12"><use href="#s27p-upload"/></svg> Bestand kiezen</label>
    <input id="s27-up-input" type="file" multiple style="display:none">
    <ul class="s27-upload-list" id="s27-up-list"></ul>
  </div>`;
}

const TEAM_PHOTOS = {
  'ilke meeusen':       'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/6901f37c53ba7dde08b1b67d_Ilke1.webp',
  'arne goetschalckx':  'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/6901f59fb2e09fb90990219e_Arne1.webp',
  'vincent verleije':   'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/690461794835cbd36d6b5504_Vincent1.webp',
  'bjorn borgers':      'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/690213e0b51b9994b2004649_Bjorn1.webp',
  'guus van den heuvel':'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/690212a2b6375b61606b5e93_Guus1.webp',
  'ines permentiers':   'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/690213ee2448e852bd82586d_Ines1.webp',
  'anouk de hoon':      'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/69046d5be50f353389303b75_Anouk1.webp',
  'griet beyens':       'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/69a97f8cea8b957932ac841b_Griet1.webp',
  'johanna augustyns':  'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/6901f9323e951d8eeba050a4_Johanna1.webp',
  'klaas vanhove':      'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/69020f1ff19e3a4db9b97ffa_Klaas1.webp',
  'danique bosch':      'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/69020f14e0e331cd429f9c36_Danique1.webp',
  'lara hooyberghs':    'https://cdn.prod.website-files.com/6836e01bc97620980f99aacc/6901f371b8bc70f2c4403146_Lara1.webp'
};
function teamPhotoFor(name){ return TEAM_PHOTOS[(name||'').toLowerCase().trim()] || null; }

function renderContact(c){
  const initials = getInitials(c.am_naam);
  // Use team photo if available (fallback if Make-scenario didn't supply foto_url)
  if(!c.am_foto_url) c.am_foto_url = teamPhotoFor(c.am_naam);
  return `<div class="s27-contact">
    <div class="s27-contact-avatar">${c.am_foto_url ? `<img src="${esc(c.am_foto_url)}" alt="${esc(c.am_naam)}">` : esc(initials)}</div>
    <div class="s27-contact-body">
      <div class="s27-contact-tag">Account manager</div>
      <div class="s27-contact-name">${esc(c.am_naam || 'Ilke Meeusen')}</div>
      <div class="s27-contact-role">${esc(c.am_rol || 'Jouw vast aanspreekpunt bij Studio 27')}</div>
    </div>
    <div class="s27-contact-actions">
      ${c.am_gsm   ? `<a href="tel:${esc(c.am_gsm)}"><svg width="13" height="13"><use href="#s27p-phone"/></svg> Bellen</a>` : ''}
      <a class="primary" href="mailto:${esc(c.am_email || 'ilke@studio27.be')}"><svg width="13" height="13"><use href="#s27p-mail"/></svg> Mail sturen</a>
    </div>
  </div>`;
}

/* =================================================================
   DASHBOARD HANDLERS
   ================================================================= */
function attachDashboardHandlers(){
  // project klik (zowel compact als oude variant)
  document.querySelectorAll('.s27-projc, .s27-proj').forEach(el => {
    el.addEventListener('click', () => openProjectDetail(el.dataset.taskId));
    el.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProjectDetail(el.dataset.taskId); } });
  });
  // status filter chips
  document.querySelectorAll('.s27-chip[data-filter]').forEach(el => {
    el.addEventListener('click', () => {
      state.statusFilter = el.dataset.filter;
      if(state.dashboard) renderDashboard(state.dashboard);
    });
  });
  // accordion uitklap
  document.querySelectorAll('[data-disc-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.discToggle;
      state.expandedDisciplines[k] = !state.expandedDisciplines[k];
      if(state.dashboard) renderDashboard(state.dashboard);
    });
  });
  // mini cta naar andere tab
  document.querySelectorAll('[data-go-tab]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.goTab));
  });
}

function switchTab(tabId){
  state.activeTab = tabId;
  document.querySelectorAll('.s27-tab').forEach(b => {
    const isActive = b.dataset.tab === tabId;
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('.s27-tabview').forEach(v => {
    v.hidden = (v.id !== 's27-tab-' + tabId);
  });
  // Lazy-render placeholder tabs
  if(tabId === 'bedrijf')      renderBedrijfTab();
  if(tabId === 'goedgekeurd')  renderGoedgekeurdTab();
  if(tabId === 'nieuw')        renderNieuwTab();
  if(tabId === 'instellingen') renderInstellingenTab();
  if(tabId === 'meetings')     renderMeetingsTab();
  window.scrollTo({ top:0, behavior:'smooth' });
}

function renderPlaceholderTab(bodyId, title, body){
  const el = $(bodyId);
  if(!el) return;
  el.innerHTML = '<div class="s27-empty">' +
    '<div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-spark"/></svg></div>' +
    '<div class="s27-empty-title">' + esc(title) + '</div>' +
    '<p class="s27-empty-sub">' + body + '</p>' +
  '</div>';
}
async function renderBedrijfTab(){
  const body = $('s27-bedrijf-body');
  if(!body) return;
  body.innerHTML = '<div class="s27-loading">Huisstijl laden</div>';

  let data;
  if(state.demoMode || !ENDPOINTS.bedrijfContent){
    data = getMockBedrijfContent();
  } else {
    const res = await api(ENDPOINTS.bedrijfContent, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token });
    data = (res.ok && res.data && !res.data.error) ? res.data : getMockBedrijfContent();
  }
  state.bedrijfContent = data;

  // Build categorieën uit ofwel server-side (data.categorieen) ofwel client-side parsing van plain attachments[]
  let cats = data.categorieen;
  if(!cats && Array.isArray(data.attachments)){
    cats = { logos:[], fonts:[], kleuren:[], brand_pdfs:[], fotos:[], overig:[] };
    data.attachments.forEach(a => {
      const cat = categoryFromFilename(a.filename || a.name || '');
      if(cats[cat]) cats[cat].push(a);
    });
  }
  cats = cats || { logos:[], fonts:[], kleuren:[], brand_pdfs:[], fotos:[], overig:[] };

  const voorkeuren = (data.algemene_voorkeuren || '').replace(/<[^>]+>/g,'').trim();

  body.innerHTML = `
    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Algemene voorkeuren</h2>
          <p class="s27-section-sub">Wat moeten we zeker (niet) doen voor jouw merk? Wat hier staat zien al onze teamleden voor elk project.</p>
        </div>
      </div>
      <div class="s27-voorkeuren">
        <textarea id="s27-voorkeuren-input" placeholder="Bv. We houden van minimalistische typografie. Geen stockfoto's. Onze kleur is altijd warm. Vermijd: gradients, drop shadows…">${esc(voorkeuren)}</textarea>
        <div class="s27-voorkeuren-foot">
          <span class="s27-voorkeuren-state" id="s27-voorkeuren-state"></span>
          <button class="s27-btn s27-btn-sm" id="s27-voorkeuren-save" disabled>Opslaan</button>
        </div>
      </div>
    </div>

    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Huisstijl-bibliotheek</h2>
          <p class="s27-section-sub">Logo's, fonts, brand-PDFs en foto's — gestructureerd op één plek. Jij en wij kunnen hier bestanden toevoegen. Alles wordt automatisch opgeslagen in ClickUp.</p>
        </div>
      </div>
      <div class="s27-catgrid">
        ${BRAND_CATEGORIES.map(c => renderCategoryCard(c, cats[c.id] || [])).join('')}
      </div>
    </div>

    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Snel bestand toevoegen</h2>
          <p class="s27-section-sub">Of klik op een specifieke categorie hierboven om gericht toe te voegen.</p>
        </div>
      </div>
      ${renderUploadZone('bedrijf', 'overig')}
    </div>
  `;

  attachBedrijfHandlers();
}

function renderCategoryCard(cat, items){
  const count = items.length;
  const previews = items.slice(0, 3);
  const previewsHtml = previews.length
    ? '<div class="s27-cat-previews">' + previews.map(it => renderFilePreviewTiny(it, cat)).join('') + '</div>'
    : '<div class="s27-cat-empty">Nog geen bestanden in deze categorie</div>';

  return `<button type="button" class="s27-catcard" data-category="${esc(cat.id)}" style="--cat-accent:${cat.accent}" aria-expanded="false">
    <div class="s27-catcard-head">
      <span class="s27-catcard-icon"><svg><use href="#${cat.icon}"/></svg></span>
      <span class="s27-catcard-title">${esc(cat.label)}</span>
      <span class="s27-catcard-count">${count}</span>
    </div>
    ${previewsHtml}
    <span class="s27-catcard-cta">${count ? 'Bekijk alle' : 'Voeg toe'} →</span>
  </button>`;
}

function renderFilePreviewTiny(item, cat){
  const fn = item.filename || item.name || '';
  const ext = (fn.split('.').pop() || '').toLowerCase();
  if(['png','jpg','jpeg','svg','webp','gif','heic'].includes(ext) && item.url){
    return '<div class="s27-tile s27-tile-img" style="background-image:url(\'' + esc(item.url) + '\')" title="' + esc(fn) + '"></div>';
  }
  // Tekstuele preview
  const label = ext.toUpperCase() || '·';
  return '<div class="s27-tile s27-tile-text" title="' + esc(fn) + '"><strong>' + esc(label) + '</strong><span>' + esc(fn.length > 18 ? fn.substring(0,16)+'…' : fn) + '</span></div>';
}

function renderUploadZone(scope, category){
  const id = scope === 'bedrijf' ? 's27-drop-bedrijf' : 's27-drop';
  const inputId = scope === 'bedrijf' ? 's27-up-input-bedrijf' : 's27-up-input';
  const listId = scope === 'bedrijf' ? 's27-up-list-bedrijf' : 's27-up-list';
  return `<div class="s27-upload" id="${id}" data-scope="${esc(scope)}" data-category="${esc(category || 'overig')}">
    <div class="s27-upload-icon"><svg width="22" height="22"><use href="#s27p-upload"/></svg></div>
    <div class="s27-upload-title">Sleep bestanden hier of klik om te uploaden</div>
    <div class="s27-upload-sub">Max 5 MB per bestand · 25 MB totaal. Grotere bestanden? Stuur via WeTransfer naar <a href="mailto:ilke@studio27.be">ilke@studio27.be</a>.</div>
    <label class="s27-upload-btn" for="${inputId}"><svg width="12" height="12"><use href="#s27p-upload"/></svg> Bestand kiezen</label>
    <input id="${inputId}" type="file" multiple style="display:none">
    <ul class="s27-upload-list" id="${listId}"></ul>
  </div>`;
}

function attachBedrijfHandlers(){
  // Voorkeuren editor
  const ta = $('s27-voorkeuren-input');
  const btn = $('s27-voorkeuren-save');
  const stateLabel = $('s27-voorkeuren-state');
  if(ta && btn){
    const original = ta.value;
    ta.addEventListener('input', () => {
      btn.disabled = (ta.value.trim() === original.trim());
      stateLabel.textContent = btn.disabled ? '' : 'Niet opgeslagen';
    });
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Bezig…';
      stateLabel.textContent = 'Bezig met opslaan…';
      if(ENDPOINTS.bedrijfVoorkeuren && !state.demoMode){
        await api(ENDPOINTS.bedrijfVoorkeuren, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token, voorkeuren: ta.value });
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
      btn.textContent = 'Opslaan';
      stateLabel.textContent = '✓ Opgeslagen';
      setTimeout(() => { stateLabel.textContent = ''; }, 2500);
    });
  }

  // Category cards → openen modal of inline expand
  document.querySelectorAll('.s27-catcard[data-category]').forEach(card => {
    card.addEventListener('click', () => openCategoryModal(card.dataset.category));
  });

  // Generic upload zone in bedrijf-tab
  const drop = $('s27-drop-bedrijf');
  const input = $('s27-up-input-bedrijf');
  if(input) input.addEventListener('change', e => handleFiles(e.target.files, 'bedrijf', drop.dataset.category || 'overig'));
  if(drop){
    ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('dragover'); }));
    drop.addEventListener('drop', e => handleFiles(e.dataTransfer.files, 'bedrijf', drop.dataset.category || 'overig'));
  }
}

function openCategoryModal(catId){
  const cat = BRAND_CATEGORIES.find(c => c.id === catId);
  if(!cat) return;
  const items = (state.bedrijfContent && state.bedrijfContent.categorieen && state.bedrijfContent.categorieen[catId]) || [];

  const itemsHtml = items.length
    ? '<div class="s27-cat-items">' + items.map(it => renderCategoryItem(it, cat)).join('') + '</div>'
    : '<div class="s27-empty"><div class="s27-empty-icon"><svg width="22" height="22"><use href="#' + cat.icon + '"/></svg></div><div class="s27-empty-title">Nog geen bestanden in ' + esc(cat.label) + '</div><p class="s27-empty-sub">Sleep ze hieronder erin of klik op "Bestand kiezen".</p></div>';

  $('s27-modal-title').textContent = cat.label;
  $('s27-modal-sub').textContent = items.length + ' bestand' + (items.length === 1 ? '' : 'en') + ' · ' + cat.hint;
  $('s27-modal-body').innerHTML = itemsHtml + renderUploadZone('bedrijf', catId);
  $('s27-modal-foot').innerHTML = '<button type="button" class="s27-btn" id="s27-cat-close" style="background:var(--s27-paper);color:var(--s27-ink);border:1.5px solid var(--s27-line)">Sluiten</button>';
  $('s27-modal').classList.add('open');

  const drop = $('s27-drop-bedrijf');
  const input = $('s27-up-input-bedrijf');
  if(input) input.addEventListener('change', e => handleFiles(e.target.files, 'bedrijf', catId));
  if(drop){
    ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('dragover'); }));
    drop.addEventListener('drop', e => handleFiles(e.dataTransfer.files, 'bedrijf', catId));
  }
  const close = $('s27-cat-close');
  if(close) close.addEventListener('click', closeModal);
}

function renderCategoryItem(item, cat){
  const fn = item.filename || item.name || 'bestand';
  const ext = (fn.split('.').pop() || '').toLowerCase();
  const isImg = ['png','jpg','jpeg','svg','webp','gif'].includes(ext);
  const by = item.uploaded_by === 'studio27' ? '<span class="s27-cat-tag" style="background:var(--s27-blue-soft);color:var(--s27-blue-ink)">Door Studio 27</span>' : '<span class="s27-cat-tag">Door jou</span>';
  const date = item.uploaded_at ? '<span class="s27-cat-meta">' + esc(fmtDate(item.uploaded_at)) + '</span>' : '';
  const preview = isImg && item.url
    ? '<div class="s27-cat-item-preview" style="background-image:url(\'' + esc(item.url) + '\')"></div>'
    : '<div class="s27-cat-item-preview s27-cat-item-icon"><strong>' + esc(ext.toUpperCase() || '·') + '</strong></div>';
  const dl = item.url ? '<a href="' + esc(item.url) + '" download="' + esc(fn) + '" target="_blank" rel="noopener" class="s27-cat-dl">↓ Download</a>' : '';
  return `<div class="s27-cat-item">
    ${preview}
    <div class="s27-cat-item-body">
      <div class="s27-cat-item-name">${esc(fn)}</div>
      <div class="s27-cat-item-row">${by}${date}</div>
      ${dl}
    </div>
  </div>`;
}
function renderGoedgekeurdTab(){
  renderPlaceholderTab('s27-goedgekeurd-body', 'Goedgekeurde projecten (binnenkort)',
    'Alle deliverables van projecten die we voor jou hebben afgerond, gesorteerd in de tijd. Links blijven altijd beschikbaar.');
}
function renderNieuwTab(){
  renderPlaceholderTab('s27-nieuw-body', 'Nieuw project aanmelden (binnenkort)',
    'Vertel ons wat je wil en we sturen je vandaag nog een offerte op maat. Geen verplichting.');
}
function renderInstellingenTab(){
  renderPlaceholderTab('s27-instellingen-body', 'Instellingen (binnenkort)',
    'Wijzig je contactgegevens. Krijg updates per mail, WhatsApp, of beide. Pas notificatie-voorkeuren aan.');
}
function renderMeetingsTab(){
  const body = $('s27-meetings-body');
  if(!body) return;
  const meetings = (state.dashboard && state.dashboard.aankomende_meetings) || [];
  if(!meetings.length){
    body.innerHTML = '<div class="s27-empty"><div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-cal"/></svg></div><div class="s27-empty-title">Geen aankomende meetings</div><p class="s27-empty-sub">Wil je iets bespreken? Plan rechtsstreeks een tijdslot in via de knop hieronder.</p></div>' +
      '<div style="text-align:center;margin-top:18px"><a class="s27-btn" href="mailto:ilke@studio27.be?subject=Meeting%20aanvraag" style="display:inline-flex;width:auto;padding:14px 26px;text-decoration:none;gap:8px">📅 Plan een meeting in</a></div>';
    return;
  }
  // gebruik bestaande renderMeetings() die de volledige <div class="s27-meetings"> wrapper bevat
  body.innerHTML = renderMeetings(meetings) +
    '<div style="text-align:center;margin-top:22px"><a class="s27-btn" href="mailto:ilke@studio27.be?subject=Meeting%20aanvraag" style="display:inline-flex;width:auto;padding:12px 22px;text-decoration:none;gap:8px;background:var(--s27-paper);color:var(--s27-blue-ink);border:1.5px solid var(--s27-blue)">📅 Nieuwe meeting inplannen</a></div>';
}

/* =================================================================
   PROJECT DETAIL MODAL
   ================================================================= */
async function openProjectDetail(taskId, openOnTab){
  if(!taskId) return;
  const proj = state.dashboard.actieve_projecten.find(p => p.task_id === taskId);
  if(!proj) return;
  state.activeProject = proj;
  state.viewMode = 'project';
  const stKey = (proj.status||'').toLowerCase().replace(/\s+/g,'_');
  const needsFeedback = stKey === 'doorgestuurd' || proj.feedback_link;
  state.projectViewTab = openOnTab || (needsFeedback ? 'feedback' : 'overzicht');
  if(location.hash !== '#/project/' + taskId) location.hash = '#/project/' + taskId;

  // Verberg alle tabs, render fullscreen project view
  document.querySelectorAll('.s27-tabview').forEach(v => v.hidden = true);
  let fsView = document.getElementById('s27-tab-project');
  if(!fsView){
    fsView = document.createElement('div');
    fsView.id = 's27-tab-project';
    fsView.className = 's27-tabview s27-projectview';
    document.querySelector('.s27-wrap').appendChild(fsView);
  }
  fsView.hidden = false;
  fsView.innerHTML = '<div class="s27-loading">Project laden…</div>';

  // Parallel: project detail + chat-list-comments
  const detailPromise = state.demoMode
    ? Promise.resolve(getDemoDetail(taskId, proj))
    : api(ENDPOINTS.projectDetail, { task_id: taskId, bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token })
        .then(r => (r.ok && r.data && !r.data.error) ? r.data : { beschrijving:'', taken:[], deliverables:[] });
  const chatPromise = (state.demoMode || !ENDPOINTS.chatList)
    ? Promise.resolve({ comments: [] })
    : api(ENDPOINTS.chatList, { task_id: taskId, bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token })
        .then(r => (r.ok && r.data && !r.data.error) ? r.data : { comments: [] });

  const [detail, chat] = await Promise.all([detailPromise, chatPromise]);
  detail.comments = (chat.comments || detail.comments || []);
  state.activeProjectDetail = detail;
  renderProjectView(proj, detail, needsFeedback);
}

function renderProjectModal(proj, detail, needsFeedback){
  const tabs = [
    { id:'overzicht', label:'Overzicht', icon:'s27p-spark' },
    { id:'chat',      label:'Chat',      icon:'s27p-mail',  badge: (detail.comments||[]).length || null },
  ];
  if(needsFeedback) tabs.push({ id:'feedback', label:'Geef feedback', icon:'s27p-spark', flag:true });

  const tabsHtml = '<div class="s27-modaltabs" role="tablist">' + tabs.map(t =>
    '<button class="s27-modaltab' + (t.flag ? ' s27-modaltab-flag' : '') + '" data-modaltab="' + t.id + '" role="tab" aria-selected="' + (state.projectModalTab === t.id ? 'true' : 'false') + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" style="flex-shrink:0"><use href="#' + t.icon + '"/></svg><span>' + esc(t.label) + '</span>' +
      (t.badge ? '<span class="s27-modaltab-badge">' + t.badge + '</span>' : '') +
    '</button>'
  ).join('') + '</div>';

  $('s27-modal-body').innerHTML = tabsHtml + '<div id="s27-modaltab-content"></div>';
  renderProjectModalTab(state.projectModalTab);

  $('s27-modal-foot').innerHTML = '<button type="button" class="s27-btn" style="background:var(--s27-paper);color:var(--s27-ink);border:1.5px solid var(--s27-line)" id="s27-modal-cancel">Sluiten</button>';
  const cancel = $('s27-modal-cancel');
  if(cancel) cancel.addEventListener('click', closeModal);

  document.querySelectorAll('.s27-modaltab[data-modaltab]').forEach(b => {
    b.addEventListener('click', () => {
      state.projectModalTab = b.dataset.modaltab;
      document.querySelectorAll('.s27-modaltab').forEach(x => x.setAttribute('aria-selected', x.dataset.modaltab === state.projectModalTab ? 'true' : 'false'));
      renderProjectModalTab(state.projectModalTab);
    });
  });
}

function renderProjectModalTab(tabId){
  const proj = state.activeProject; const detail = state.activeProjectDetail || {};
  const c = $('s27-modaltab-content'); if(!c) return;
  if(tabId === 'overzicht') c.innerHTML = renderOverzichtTab(proj, detail);
  if(tabId === 'chat')      { c.innerHTML = renderChatTab(proj, detail); attachChatHandlers(); }
  if(tabId === 'feedback')  { c.innerHTML = renderFeedbackV2Tab(proj, detail); attachFeedbackV2Handlers(); }
}

function renderOverzichtTab(proj, detail){
  const taken = detail.taken || detail.subtasks || [];
  const timelineHtml = taken.length ? '<div class="s27-tline">' + taken.map(t => {
    const stKey = (t.status || 'to_do').toLowerCase().replace(/\s+/g,'_');
    const stLabel = STATUS_LABELS[stKey] || t.status || 'Gepland';
    return '<div class="s27-tline-item" data-state="' + esc(stKey) + '">' +
      '<div class="s27-tline-name">' + esc(t.naam) + '</div>' +
      '<div class="s27-tline-meta">' + esc(stLabel) + (t.datum ? ' · ' + esc(fmtDate(t.datum)) : '') + (t.update ? ' · ' + esc(t.update) : '') + '</div>' +
      (t.link ? '<a class="s27-tline-link" href="' + esc(t.link) + '" target="_blank" rel="noopener"><svg width="11" height="11"><use href="#s27p-link"/></svg> Open</a>' : '') +
    '</div>';
  }).join('') + '</div>' : '<p style="font-family:var(--font-body);font-size:13px;color:var(--s27-ink-3)">Tijdlijn wordt binnenkort zichtbaar.</p>';
  return (detail.beschrijving ? '<p class="s27-modal-desc">' + esc(detail.beschrijving) + '</p>' : '') +
    '<h3 class="s27-modal-h3">Tijdlijn</h3>' + timelineHtml;
}

function renderChatTab(proj, detail){
  const comments = detail.comments || [];
  const thread = comments.length
    ? '<div class="s27-chat-thread">' + comments.map(renderChatMessage).join('') + '</div>'
    : '<div class="s27-empty"><div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-mail"/></svg></div><div class="s27-empty-title">Nog geen berichten</div><p class="s27-empty-sub">Start het gesprek met je team. Antwoorden komen hier direct te staan.</p></div>';
  return thread +
    '<div class="s27-chat-compose">' +
      '<textarea id="s27-chat-input" placeholder="Typ je bericht voor het team…"></textarea>' +
      '<div class="s27-chat-actions">' +
        '<label class="s27-chat-attach" for="s27-chat-file">' +
          '<svg width="14" height="14"><use href="#s27p-upload"/></svg> Bestand toevoegen' +
        '</label>' +
        '<input id="s27-chat-file" type="file" multiple style="display:none">' +
        '<button class="s27-btn s27-btn-sm" id="s27-chat-send">Versturen</button>' +
      '</div>' +
      '<ul id="s27-chat-files" class="s27-chat-files"></ul>' +
    '</div>';
}

function renderChatMessage(c){
  const isKlant = c.is_klant === true || (c.tekst || '').startsWith('💬 [Klant');
  const side = isKlant ? 'klant' : 'team';
  const cleanText = (c.tekst || '').replace(/^💬 \[Klant: [^\]]+\]\s*/, '').trim();
  const atts = (c.attachments || []).map(a => '<a class="s27-chat-att" href="' + esc(a.url || '#') + '" target="_blank" rel="noopener">📎 ' + esc(a.filename || 'bestand') + '</a>').join('');
  return '<div class="s27-chat-msg s27-chat-msg-' + side + '">' +
    '<div class="s27-chat-head"><strong>' + esc(c.auteur || 'Studio 27') + '</strong><span>' + esc(fmtRelTime(c.datum)) + '</span></div>' +
    '<div class="s27-chat-body">' + esc(cleanText).replace(/\n/g,'<br>') + '</div>' +
    (atts ? '<div class="s27-chat-atts">' + atts + '</div>' : '') +
  '</div>';
}

function attachChatHandlers(){
  const send = $('s27-chat-send');
  const input = $('s27-chat-input');
  const fileInput = $('s27-chat-file');
  const filesList = $('s27-chat-files');
  const pending = [];
  if(fileInput){
    fileInput.addEventListener('change', async e => {
      for(const f of Array.from(e.target.files || [])){
        if(f.size > MAX_FILE_BYTES){ alert(f.name + ' is te groot (max 5 MB)'); continue; }
        const b64 = await fileToBase64(f);
        pending.push({ filename:f.name, data:b64, type:f.type, size:f.size });
        const li = document.createElement('li');
        li.innerHTML = '<span>📎 ' + esc(f.name) + '</span>';
        filesList.appendChild(li);
      }
      fileInput.value = '';
    });
  }
  if(send){
    send.addEventListener('click', async () => {
      const text = (input.value || '').trim();
      if(!text && !pending.length){ input.focus(); return; }
      send.disabled = true; send.textContent = 'Versturen…';
      const url = ENDPOINTS.chatPost;
      if(url){
        await api(url, {
          task_id: state.activeProject.task_id,
          bedrijf_id: state.session.bedrijf_id,
          session_token: state.session.session_token,
          klant_naam: state.session.bedrijfsnaam,
          comment_text: text,
          attachments: pending
        });
      } else {
        await new Promise(r => setTimeout(r, 600)); // mock
      }
      send.disabled = false; send.textContent = 'Versturen';
      input.value = '';
      filesList.innerHTML = '';
      pending.length = 0;
      // Optimistisch toevoegen aan thread
      const newMsg = { auteur:state.session.bedrijfsnaam, is_klant:true, tekst:text, datum:new Date().toISOString(), attachments:[] };
      state.activeProjectDetail.comments = (state.activeProjectDetail.comments || []).concat([newMsg]);
      renderProjectModalTab('chat');
    });
  }
}

function renderFeedbackV2Tab(proj, detail){
  const deliverables = detail.deliverables || parseDeliverablesFromProj(proj);
  const intro = '<div class="s27-fb-intro">' +
    '<strong>Klaar voor review.</strong> Voor elk onderdeel kies je: ✅ <em>Goedgekeurd</em> of 💬 <em>Feedback gegeven</em>. ' +
    'Bij feedback kies je waar je het hebt achtergelaten (Vimeo, Picflow, Webflow comments, tekst hieronder, of upload). ' +
    'Bevestig onderaan zodat we direct verder kunnen.' +
    '</div>';
  if(!deliverables.length){
    return intro + '<div class="s27-empty"><div class="s27-empty-title">Geen deliverables gevonden</div><p class="s27-empty-sub">Mail naar ilke@studio27.be om dit te laten oplossen.</p></div>';
  }
  return intro +
    '<div class="s27-fb-list">' +
      deliverables.map((d,i) => renderFeedbackDeliverable(d,i)).join('') +
    '</div>' +
    '<div class="s27-fb-general">' +
      '<label>Extra algemene opmerking (optioneel)</label>' +
      '<textarea id="s27-fb-general" placeholder="Iets dat over alles gaat? Zet het hier."></textarea>' +
    '</div>' +
    '<div class="s27-fb-foot">' +
      '<span class="s27-fb-state" id="s27-fb-state"></span>' +
      '<button class="s27-btn" id="s27-fb-submit" disabled>Bevestig mijn feedback</button>' +
    '</div>';
}

function parseDeliverablesFromProj(proj){
  // Stub: mock voor MVP — voor demo Ads project. Echte deliverables uit ClickUp komen in v4 via Project Detail endpoint extension.
  const taskId = proj.task_id;
  if(taskId === '86ca0hp3f') return [
    { label:'Vimeo edit v1',     url:'https://vimeo.com/example/edit-v1',          type:'vimeo' },
    { label:'Square + 9:16 cuts', url:'https://drive.google.com/example/cuts',     type:'drive' }
  ];
  return [];
}

function renderFeedbackDeliverable(d, i){
  const typeLabel = ({vimeo:'Video op Vimeo', picflow:'Foto-album op Picflow', webflow:'Website preview', drive:'Drive folder', figma:'Figma ontwerp'})[d.type] || 'Bestand';
  return '<div class="s27-fb-item" data-idx="' + i + '">' +
    '<div class="s27-fb-item-head">' +
      '<div><span class="s27-fb-num">' + (i+1) + '</span> ' + esc(d.label) + '</div>' +
      '<span class="s27-fb-type">' + esc(typeLabel) + '</span>' +
    '</div>' +
    '<a class="s27-fb-open" href="' + esc(d.url) + '" target="_blank" rel="noopener">Open ' + esc(typeLabel) + ' →</a>' +
    '<div class="s27-fb-choice">' +
      '<button class="s27-fb-btn s27-fb-approve" data-choice="goedgekeurd" data-idx="' + i + '"><span class="dot"></span>✅ Goedgekeurd</button>' +
      '<button class="s27-fb-btn s27-fb-fb" data-choice="feedback" data-idx="' + i + '"><span class="dot"></span>💬 Feedback gegeven</button>' +
    '</div>' +
    '<div class="s27-fb-panel" hidden>' +
      '<label class="s27-fb-label">Via welke weg gaf je feedback?</label>' +
      '<div class="s27-fb-channels">' +
        ['vimeo','picflow','webflow','figma','drive','tekst'].map(ch =>
          '<label><input type="checkbox" data-channel="' + ch + '" data-idx="' + i + '"> ' + ch.charAt(0).toUpperCase()+ch.slice(1) + (ch==='tekst' ? ' (hieronder)' : ' comments') + '</label>'
        ).join('') +
      '</div>' +
      '<label class="s27-fb-label">Of typ hier je feedback</label>' +
      '<textarea class="s27-fb-text" data-idx="' + i + '" placeholder="Beschrijf wat je anders wil zien…"></textarea>' +
      '<label class="s27-fb-attach"><svg width="13" height="13"><use href="#s27p-upload"/></svg> Bestanden toevoegen<input type="file" multiple data-idx="' + i + '" style="display:none"></label>' +
      '<ul class="s27-fb-files" data-idx="' + i + '"></ul>' +
    '</div>' +
  '</div>';
}

function attachFeedbackV2Handlers(){
  if(!state.fbState) state.fbState = {};
  // Choice buttons
  document.querySelectorAll('.s27-fb-btn').forEach(b => {
    b.addEventListener('click', () => {
      const idx = b.dataset.idx; const choice = b.dataset.choice;
      state.fbState[idx] = Object.assign(state.fbState[idx] || {}, { choice });
      const item = b.closest('.s27-fb-item');
      item.querySelectorAll('.s27-fb-btn').forEach(x => x.classList.toggle('selected', x.dataset.choice === choice));
      item.classList.toggle('s27-fb-item-feedback', choice === 'feedback');
      item.classList.toggle('s27-fb-item-approved', choice === 'goedgekeurd');
      const panel = item.querySelector('.s27-fb-panel'); if(panel) panel.hidden = choice !== 'feedback';
      updateFeedbackSubmitState();
    });
  });
  // Channels
  document.querySelectorAll('input[data-channel]').forEach(cb => {
    cb.addEventListener('change', () => {
      const idx = cb.dataset.idx; const ch = cb.dataset.channel;
      state.fbState[idx] = state.fbState[idx] || {};
      state.fbState[idx].channels = state.fbState[idx].channels || {};
      state.fbState[idx].channels[ch] = cb.checked;
    });
  });
  // Tekstvelden
  document.querySelectorAll('.s27-fb-text').forEach(ta => {
    ta.addEventListener('input', () => {
      const idx = ta.dataset.idx;
      state.fbState[idx] = state.fbState[idx] || {};
      state.fbState[idx].tekst = ta.value;
    });
  });
  // Files per item
  document.querySelectorAll('.s27-fb-attach input[type=file]').forEach(inp => {
    inp.addEventListener('change', async e => {
      const idx = inp.dataset.idx;
      state.fbState[idx] = state.fbState[idx] || {};
      state.fbState[idx].files = state.fbState[idx].files || [];
      const list = document.querySelector('.s27-fb-files[data-idx="' + idx + '"]');
      for(const f of Array.from(e.target.files || [])){
        if(f.size > MAX_FILE_BYTES){ alert(f.name + ' te groot'); continue; }
        const b64 = await fileToBase64(f);
        state.fbState[idx].files.push({ filename:f.name, data:b64, type:f.type, size:f.size });
        const li = document.createElement('li'); li.textContent = '📎 ' + f.name; list.appendChild(li);
      }
      e.target.value = '';
    });
  });
  // Submit
  const submit = $('s27-fb-submit');
  if(submit) submit.addEventListener('click', submitFeedbackV2);
}

function updateFeedbackSubmitState(){
  const proj = state.activeProject; const detail = state.activeProjectDetail || {};
  const deliverables = detail.deliverables || parseDeliverablesFromProj(proj);
  const allChosen = deliverables.every((_, i) => (state.fbState[i] || {}).choice);
  const btn = $('s27-fb-submit'); if(btn) btn.disabled = !allChosen;
}

async function submitFeedbackV2(){
  const proj = state.activeProject; const detail = state.activeProjectDetail || {};
  const deliverables = detail.deliverables || parseDeliverablesFromProj(proj);
  const stateLabel = $('s27-fb-state'); const submit = $('s27-fb-submit');
  submit.disabled = true; submit.textContent = 'Versturen…'; stateLabel.textContent = 'Bezig…';
  const payload = {
    task_id: proj.task_id,
    bedrijf_id: state.session.bedrijf_id,
    session_token: state.session.session_token,
    klant_naam: state.session.bedrijfsnaam,
    deliverables: deliverables.map((d, i) => Object.assign({}, d, state.fbState[i] || {})),
    algemene_opmerking: ($('s27-fb-general') || {}).value || ''
  };
  if(ENDPOINTS.feedbackV2){
    await api(ENDPOINTS.feedbackV2, payload);
  } else {
    await new Promise(r => setTimeout(r, 800)); // mock
  }
  const allApproved = deliverables.every((_,i) => (state.fbState[i] || {}).choice === 'goedgekeurd');
  $('s27-modal-body').innerHTML = '<div class="s27-success" style="min-height:240px"><svg class="s27-success-check" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="#12AC4E" opacity="0.12"/><circle cx="60" cy="60" r="40" fill="#12AC4E"/><path d="M42 60 L54 72 L78 48" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>' +
    '<h2 class="s27-success-h2">' + (allApproved ? 'Bedankt — alles staat op <span style="color:var(--s27-green-ink)">groen</span>!' : 'Bedankt voor de <span style="color:var(--s27-blue-ink)">feedback</span>!') + '</h2>' +
    '<p class="s27-success-p">' + (allApproved ? 'Top dat alles in orde is — we ronden de taak nu af.' : 'We nemen je feedback mee. Je hoort van ons met de aangepaste versie.') + '</p>' +
  '</div>';
  $('s27-modal-foot').innerHTML = '<button type="button" class="s27-btn" id="s27-modal-cancel">Sluiten</button>';
  const cl = $('s27-modal-cancel'); if(cl) cl.addEventListener('click', closeModal);
  state.fbState = {};
}

function closeModal(){ $('s27-modal').classList.remove('open'); }

/* =================================================================
   UPLOADS
   ================================================================= */
function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const v = r.result || ''; const i = v.indexOf(','); resolve(i>=0 ? v.slice(i+1) : v); };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
async function handleFiles(fileList, scope, category){
  scope = scope || 'algemeen';
  category = category || 'overig';
  const listId = scope === 'bedrijf' ? 's27-up-list-bedrijf' : 's27-up-list';
  const files = Array.from(fileList || []);
  for(const f of files){
    if(f.size > MAX_FILE_BYTES){
      addUploadRow(f.name, 'error', 'Te groot (max 5 MB)', listId);
      continue;
    }
    const li = addUploadRow(f.name, 'uploading', bytes(f.size), listId);
    try {
      const b64 = await fileToBase64(f);
      // Voeg categorie prefix toe aan filename voor server-side categorisering
      const catLabel = ({logos:'LOGO',fonts:'FONT',kleuren:'KLEUR',brand_pdfs:'BRAND',fotos:'FOTO',overig:'OVERIG'})[category] || 'OVERIG';
      const filenameWithCat = scope === 'bedrijf' ? '[' + catLabel + '] ' + f.name : f.name;
      const res = await api(ENDPOINTS.uploadAlg, {
        bedrijf_id: state.session.bedrijf_id,
        session_token: state.session.session_token,
        filename: filenameWithCat,
        size: f.size,
        type: f.type,
        data: b64,
        klant_naam: state.session.bedrijfsnaam,
        categorie: category,
        scope: scope
      });
      if(res.ok && (!res.data || !res.data.error)){
        updateUploadRow(li, 'done', 'Geüpload');
        // Auto-refresh bedrijf-tab indien actief
        if(scope === 'bedrijf' && state.activeTab === 'bedrijf'){
          setTimeout(() => renderBedrijfTab(), 1000);
        }
      } else updateUploadRow(li, 'error', 'Mislukt');
    } catch(e){ updateUploadRow(li, 'error', 'Mislukt'); }
  }
  const inputId = scope === 'bedrijf' ? 's27-up-input-bedrijf' : 's27-up-input';
  const input = $(inputId); if(input) input.value = '';
}
function addUploadRow(name, state, status, listId){
  const ul = $(listId || 's27-up-list'); if(!ul) return null;
  const li = document.createElement('li');
  li.className = 's27-upload-item';
  li.innerHTML = `<svg width="14" height="14" style="color:var(--s27-ink-3)"><use href="#s27p-upload"/></svg>
    <span class="s27-upload-item-name">${esc(name)}</span>
    <span class="s27-upload-item-status" data-state="${state}">${esc(status)}</span>`;
  ul.appendChild(li);
  return li;
}
function updateUploadRow(li, state, status){
  if(!li) return;
  const s = li.querySelector('.s27-upload-item-status');
  if(s){ s.setAttribute('data-state', state); s.textContent = status; }
}

/* =================================================================
   GROUPING HELPERS
   ================================================================= */
function groupBy(arr, keyFn){
  const out = {};
  (arr||[]).forEach(item => {
    const k = keyFn(item) || 'onbekend';
    if(!out[k]) out[k] = [];
    out[k].push(item);
  });
  return out;
}

/* =================================================================
   DEMO DATA (voor ?demo=1 preview in Webflow)
   ================================================================= */
function getDemoData(){
  return {
    klant: { bedrijfsnaam:'TEST CLIENT BV', klantcode:'TST', account_manager:'Ilke Meeusen' },
    stats: { actieve_projecten:7, openstaande_feedback:2, deze_week:3, opgeleverd_30d:5 },
    actieve_projecten: [
      { task_id:'demo-vid-1', naam:'Bedrijfsvideo employer branding', discipline:'video_fotografie', status:'doorgestuurd', opleverdatum:'2026-06-04', voortgang_pct:75, type:'Corporate video', laatst_geupdatet: new Date(Date.now()-3600000*4).toISOString(), feedback_link:'https://studio27.be/video-feedback?taskId=demo-vid-1' },
      { task_id:'demo-vid-2', naam:'Productfotografie najaarscampagne', discipline:'video_fotografie', status:'in_progress', opleverdatum:'2026-06-15', voortgang_pct:40, type:'Productfoto', laatst_geupdatet: new Date(Date.now()-3600000*26).toISOString() },
      { task_id:'demo-web-1', naam:'Rebuild website testclient.be', discipline:'webdesign', status:'in_progress', opleverdatum:'2026-07-01', voortgang_pct:55, type:'Webflow rebuild', laatst_geupdatet: new Date(Date.now()-3600000*8).toISOString() },
      { task_id:'demo-web-2', naam:'Landingspagina voorjaarscampagne', discipline:'webdesign', status:'doorgestuurd', opleverdatum:'2026-06-08', voortgang_pct:90, type:'Landing page', laatst_geupdatet: new Date(Date.now()-3600000*1).toISOString(), feedback_link:'https://studio27.be/design-feedback?taskId=demo-web-2' },
      { task_id:'demo-brd-1', naam:'Brand refresh logo + kleuren',  discipline:'branding',  status:'in_progress', opleverdatum:'2026-06-20', voortgang_pct:35, type:'Brand identity', laatst_geupdatet: new Date(Date.now()-3600000*48).toISOString() },
      { task_id:'demo-soc-1', naam:'Social media juni 2026',         discipline:'social',    status:'in_progress', opleverdatum:'2026-06-01', voortgang_pct:60, type:'Retainer maandelijks', laatst_geupdatet: new Date(Date.now()-3600000*12).toISOString() },
      { task_id:'demo-ads-1', naam:'Google Ads + Meta zomercampagne',discipline:'ads',       status:'in_progress', opleverdatum:'2026-06-01', voortgang_pct:50, type:'Performance', laatst_geupdatet: new Date(Date.now()-3600000*36).toISOString() }
    ],
    historie_3mnd: [
      { task_id:'demo-h1', naam:'Aftermovie teamevent maart', discipline:'video_fotografie', afgerond_op:'2026-04-12', deliverables:[ { label:'Vimeo final', url:'https://vimeo.com/example' }, { label:'Drive', url:'https://drive.google.com/example' } ] },
      { task_id:'demo-h2', naam:'Brand guidelines v2',         discipline:'branding',         afgerond_op:'2026-04-28', deliverables:[ { label:'PDF', url:'https://drive.google.com/example' } ] },
      { task_id:'demo-h3', naam:'SEO audit Q1',                discipline:'seo',              afgerond_op:'2026-05-02', deliverables:[ { label:'Rapport', url:'https://example.com' } ] }
    ],
    aankomende_meetings: [
      { meeting_id:'m1', titel:'Strategie-update Q2', datum:'2026-06-02', tijdslot:'14:00 - 15:00', type:'Strategiesessie', locatie:'Studio 27, Rijkevorsel', link:'https://meet.google.com/example' },
      { meeting_id:'m2', titel:'Feedback rondetafel website', datum:'2026-06-09', tijdslot:'10:30 - 11:15', type:'Feedback meeting', locatie:'Online', link:'https://meet.google.com/example' }
    ],
    contact: { am_naam:'Ilke Meeusen', am_email:'ilke@studio27.be', am_gsm:'+32486000000', am_rol:'Jouw vast aanspreekpunt bij Studio 27' }
  };
}
function getDemoDetail(taskId, proj){
  return {
    beschrijving: 'Demo-detail voor ' + proj.naam + '. In live versie haalt dit data uit ClickUp via Make-webhook (' + ENDPOINTS.projectDetail + ').',
    taken: [
      { naam:'Briefing & intake',     status:'done',         datum:'2026-05-10' },
      { naam:'Pre-productie',         status:'done',         datum:'2026-05-18' },
      { naam:'Shoot / productie',     status:'done',         datum:'2026-05-24' },
      { naam:'Eerste versie editing', status:'doorgestuurd', datum:'2026-05-28', update:'Wacht op feedback', link:'https://vimeo.com/example' },
      { naam:'Finale oplevering',     status:'to_do',        datum:'2026-06-04' }
    ],
    comments: [
      { auteur:'Bjorn (Studio 27)', datum:new Date(Date.now()-3600000*4).toISOString(), tekst:'Eerste edit staat klaar op Vimeo — laat ons weten wat je vindt!' },
      { auteur:'Ilke (Studio 27)',  datum:new Date(Date.now()-86400000*2).toISOString(), tekst:'Shoot is goed verlopen. We hebben extra B-roll opgenomen die we kunnen gebruiken voor social cuts.' }
    ]
  };
}

/* =================================================================
   INIT
   ================================================================= */
function init(){
  const params = qs();
  if(params.get('demo') === '1'){
    state.demoMode = true;
    state.session = { bedrijf_id:'demo', bedrijfsnaam:'TEST CLIENT BV', session_token:'demo', expires_at:null };
    showDashboard();
    loadDashboard();
  } else {
    const sess = loadSession() || (function(){
      try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
    })();
    if(sess && sess.session_token){
      state.session = sess;
      showDashboard();
      loadDashboard();
    } else {
      showLogin();
    }
  }

  // Login: use button click + Enter key (skip form-submit because Webflow wraps form in w-form widget)
  const loginBtn = $('s27-login-btn');
  if(loginBtn) loginBtn.addEventListener('click', handleLogin);
  ['s27-bedrijfsnaam','s27-token'].forEach(id => {
    const el = $(id);
    if(el) el.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); handleLogin(e); } });
  });
  // Block default form submit completely (Webflow form-wrapper triggers fail-message)
  const loginForm = $('s27-login-form');
  if(loginForm) loginForm.addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); handleLogin(e); return false; });
  // Hide Webflow w-form-done / w-form-fail divs if Webflow wrapped our form
  document.querySelectorAll('#s27-portal .w-form-fail, #s27-portal .w-form-done').forEach(el => el.style.display = 'none');

  $('s27-lock-btn').addEventListener('click', handleLogout);
  $('s27-modal-close').addEventListener('click', closeModal);
  $('s27-modal').addEventListener('click', e => { if(e.target.id === 's27-modal') closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

  // Tab navigatie handlers
  document.querySelectorAll('.s27-tab[data-tab]').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();