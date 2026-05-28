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
  // v2 — folder 13 KLANTPORTAAL v2 (all robust met session validation, alle native modules)
  bedrijfContent:    'https://hook.eu1.make.com/o1gvlndn934h2u77vug6k59xgt2qgz6g',
  bedrijfVoorkeuren: 'https://hook.eu1.make.com/fhenjvxv47ldoea5k8h646ovn5gzvgnv',
  bedrijfUpload:     'https://hook.eu1.make.com/vdi231a5w9c8wronm71panyc2okq716y',
  meetingsList:      'https://hook.eu1.make.com/5vkfigdkwwowpmhbmicsyddkjt5k18f5',
  projectDetailV2:   'https://hook.eu1.make.com/tp6jpd91vyecsz693pj2hmdd1bs8pd5e',
  chatPost:          'https://hook.eu1.make.com/vi12objw9nkrjg1i8ve13jwj354pvg9n',
  chatList:          'https://hook.eu1.make.com/a43sc5vjuic6lpjdehq8pvhn8sjftbn3',
  feedbackV2:        'https://hook.eu1.make.com/vpd7to9pn8ritsih38s4apika49lg31o',
  newProjectIntake:  'https://hook.eu1.make.com/kbomkcljmi9b2oyphmk938wb1qgwll1j',
  directMessage:     'https://hook.eu1.make.com/s7g32st1esmxxarw0k35ej3j8hthdr2b',
  chatAttachment:    'https://hook.eu1.make.com/fxaqt9waonf63moiloj1bnm28w1kduj6',
  bedrijfContact:    'https://hook.eu1.make.com/459dayjdq34xgkt9bcbv8g1nxd9r9ubs',
  // Bestaand werkend booking-systeem (read-only hergebruik via CORS *)
  shootAvailability: 'https://hook.eu1.make.com/c1aekp5r567tqvgvp4e2a4juu3npanap'
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

// v2.2: Decode Make.com-encoded strings (newlines + quotes komen dubbel-escaped uit WebhookRespond body)
function decodeMakeString(s){
  if(s == null) return '';
  return String(s)
    .replace(/\\n/g, '\n')       // \n → newline
    .replace(/\\r/g, '\r')       // \r → carriage return
    .replace(/\\t/g, '\t')       // \t → tab
    .replace(/\\"/g, '"')        // \" → "
    .replace(/\\\\/g, '\\');     // \\ → \ (last om recursie te voorkomen)
}

async function api(url, payload){
  try {
    const r = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload || {})
    });
    const t = await r.text();
    let parsed;
    try { parsed = { ok:r.ok, status:r.status, data:JSON.parse(t) }; }
    catch { parsed = { ok:r.ok, status:r.status, data:{ _raw:t } }; }
    // v2.1 Foundation: 401 = expired session → auto-logout
    if(parsed.status === 401 && state && state.session){
      handleSessionExpired(parsed.data && parsed.data.message);
    }
    return parsed;
  } catch(e){ return { ok:false, status:0, error:e.message }; }
}

function handleSessionExpired(message){
  // Voorkom infinite loop: alleen één keer triggeren per sessie
  if(state._sessionExpiredHandled) return;
  state._sessionExpiredHandled = true;
  try { localStorage.removeItem('s27_portal_session'); } catch(e){}
  // Toon korte melding voor we naar login springen
  const msg = message || 'Je sessie is verlopen — log opnieuw in.';
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:14px 22px;border-radius:12px;font:600 14px/1.4 system-ui;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.08)';
  banner.textContent = msg;
  document.body.appendChild(banner);
  setTimeout(() => {
    try { banner.remove(); } catch(e){}
    state.session = null;
    state.viewMode = 'login';
    renderApp();
  }, 1600);
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
    // v2.1 #30: prefer sessionStorage (single-tab, browser-close clears) over localStorage
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    if(s.expires_at && new Date(s.expires_at) < new Date()) {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    // v2.1 #30: token rotation soft-warning — als token >7 dagen oud, vraag herlogin (security debt mitigation)
    if(s.created_at){
      const ageDays = (Date.now() - new Date(s.created_at).getTime()) / 86400000;
      if(ageDays > 7){
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
    } else {
      // Geen created_at = oude sessie zonder rotatie info → flush
      s.created_at = new Date().toISOString();
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
    expires_at: res.data.expires_at,
    created_at: new Date().toISOString()  // v2.1 #30: voor token rotation
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
      $('s27-dash-body').innerHTML = '<div class="s27-error">We krijgen geen verbinding met het portaal. Probeer zo opnieuw of <a href="#" data-dm="vraag" data-dm-onderwerp="Portal verbinding gefaald">stuur ons een bericht</a>.</div>';
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
  // v2 Fase 32: tutorial bij eerste bezoek
  if(!localStorage.getItem('s27_tour_completed')){
    setTimeout(() => showWelcomeTour(true), 400);
  }
  // Help-knop in header injecteren als nog niet bestaat
  injectHelpButton();
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
  const eta = computeETA(p);
  return '<div class="s27-projc" data-task-id="' + esc(p.task_id || '') + '" tabindex="0" role="button" aria-label="' + esc(p.naam) + '">' +
    '<div class="s27-projc-main">' +
      '<div class="s27-projc-name">' + esc(p.naam || 'Project') + '</div>' +
      '<div class="s27-projc-meta">' +
        (p.opleverdatum ? '<span>📅 ' + esc(fmtDate(p.opleverdatum)) + '</span>' : '') +
        (p.type ? '<span>· ' + esc(p.type) + '</span>' : '') +
        (p.laatst_geupdatet ? '<span>· ' + esc(fmtRelTime(p.laatst_geupdatet)) + '</span>' : '') +
      '</div>' +
      (eta.label ? '<div class="s27-projc-eta" data-urgency="' + esc(eta.urgency) + '">' + eta.icon + ' ' + esc(eta.label) + '</div>' : '') +
    '</div>' +
    '<div class="s27-projc-right">' +
      (needsFeedback ? '<span class="s27-projc-flag">🔔 Wacht op jou</span>' : '') +
      '<span class="s27-projc-status" data-status="' + esc(statusKey) + '">' + esc(statusLabel) + '</span>' +
      '<span class="s27-projc-arrow">→</span>' +
    '</div>' +
  '</div>';
}

/* =================================================================
   DIRECT MESSAGE naar Studio27 teamlid (v2.2 #51)
   Filosofie Vincent: alle klant-communicatie via ClickUp, geen mailto.
   Make scenario bedrijf-direct-message maakt taak in Strategie-lijst.
   ================================================================= */
const DM_RECIPIENTS = [
  { id:'ilke',    naam:'Ilke Meeusen',      rol:'Account manager — projectopvolging' },
  { id:'arne',    naam:'Arne Goetschalckx', rol:'Sales — offertes & opstart' },
  { id:'vincent', naam:'Vincent Verleije',  rol:'Zaakvoerder — strategie' }
];

const DM_PRESETS = {
  vraag:     { defaultTo:'ilke',    title:'Stel een vraag',         subject:'Vraag via portaal',     icon:'💬', cta:'Bericht versturen' },
  terugbel:  { defaultTo:'ilke',    title:'Vraag een terugbel',     subject:'Terugbel-verzoek',      icon:'📞', cta:'Verstuur terugbel-verzoek' },
  meeting:   { defaultTo:'ilke',    title:'Plan een meeting in',    subject:'Meeting-aanvraag',      icon:'📅', cta:'Verstuur meeting-aanvraag' },
  shoot:     { defaultTo:'ilke',    title:'Plan een shoot in',      subject:'Shoot-aanvraag',        icon:'📸', cta:'Verstuur shoot-aanvraag' },
  archief:   { defaultTo:'ilke',    title:'Vraag oude deliverables op', subject:'Vraag oud project op', icon:'📁', cta:'Bericht versturen' },
  upload:    { defaultTo:'ilke',    title:'Hulp bij grote bestanden', subject:'Hulp bij upload',     icon:'📦', cta:'Stuur verzoek' }
};

function openDMModal(presetKey, prefills){
  const preset = DM_PRESETS[presetKey] || DM_PRESETS.vraag;
  prefills = prefills || {};
  let modal = $('s27-dm-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 's27-dm-modal';
    modal.className = 's27-dm-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="s27-dm-dialog" role="document">
      <button class="s27-dm-close" aria-label="Sluiten">×</button>
      <div class="s27-dm-icon">${preset.icon}</div>
      <h3 class="s27-dm-title">${esc(preset.title)}</h3>
      <p class="s27-dm-sub">Je bericht komt direct in onze planning bij de juiste persoon. Sneller dan mail, en wij kunnen meteen actie ondernemen.</p>
      <form id="s27-dm-form">
        <label class="s27-form-field">
          <span>Naar wie?</span>
          <select name="ontvanger" required>
            ${DM_RECIPIENTS.map(r => `<option value="${esc(r.id)}"${r.id === (prefills.ontvanger || preset.defaultTo) ? ' selected' : ''}>${esc(r.naam)} — ${esc(r.rol)}</option>`).join('')}
          </select>
        </label>
        <label class="s27-form-field">
          <span>Onderwerp</span>
          <input type="text" name="onderwerp" value="${esc(prefills.onderwerp || preset.subject)}" required/>
        </label>
        <label class="s27-form-field">
          <span>Je bericht</span>
          <textarea name="bericht" rows="6" required placeholder="${esc(prefills.placeholder || 'Type hier je bericht…')}">${esc(prefills.bericht || '')}</textarea>
        </label>
        <p class="s27-form-error" id="s27-dm-error" style="display:none"></p>
        <div class="s27-dm-actions">
          <button type="button" class="s27-btn s27-btn-ghost" id="s27-dm-cancel">Annuleer</button>
          <button type="submit" class="s27-btn s27-btn-primary">${esc(preset.cta)}</button>
        </div>
      </form>
    </div>
  `;
  // Handlers
  const close = () => { try { modal.remove(); } catch(e){} };
  modal.querySelector('.s27-dm-close').addEventListener('click', close);
  $('s27-dm-cancel').addEventListener('click', close);
  // Esc to close
  const escHandler = e => { if(e.key === 'Escape'){ close(); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);
  // Submit
  $('s27-dm-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const errEl = $('s27-dm-error');
    if(errEl) errEl.style.display = 'none';
    if(btn){ btn.disabled = true; btn.textContent = 'Versturen…'; }
    try {
      const res = await api(ENDPOINTS.directMessage, {
        bedrijf_id: state.session.bedrijf_id,
        klant_naam: state.session.bedrijfsnaam,
        session_token: state.session.session_token,
        ontvanger: form.ontvanger.value,
        type: presetKey,
        onderwerp: form.onderwerp.value,
        bericht: form.bericht.value
      });
      if(res.ok && res.data && res.data.ok){
        // Success — toon bevestiging in modal
        modal.querySelector('.s27-dm-dialog').innerHTML = `
          <div class="s27-dm-icon">✅</div>
          <h3 class="s27-dm-title">Bericht onderweg!</h3>
          <p class="s27-dm-sub">${esc(res.data.message || 'We pakken het zo snel mogelijk op.')}</p>
          <p class="s27-dm-meta">Verzonden naar <strong>${esc(res.data.ontvanger || 'Studio 27')}</strong></p>
          <button type="button" class="s27-btn s27-btn-primary" id="s27-dm-ok">Sluiten</button>
        `;
        $('s27-dm-ok').addEventListener('click', close);
        setTimeout(close, 3500);
      } else {
        const msg = (res.data && res.data.message) || 'Bericht kon niet verstuurd worden — probeer opnieuw of bel +32 14 70 50 27.';
        if(errEl){ errEl.style.display = 'block'; errEl.textContent = msg; }
        if(btn){ btn.disabled = false; btn.textContent = preset.cta; }
      }
    } catch(err){
      if(errEl){ errEl.style.display = 'block'; errEl.textContent = 'Netwerkfout — probeer opnieuw.'; }
      if(btn){ btn.disabled = false; btn.textContent = preset.cta; }
    }
  });
}

// Globale event delegator voor [data-dm] buttons/links — vervangt mailto:
document.addEventListener('click', e => {
  const trg = e.target.closest && e.target.closest('[data-dm]');
  if(!trg) return;
  e.preventDefault();
  const presetKey = trg.dataset.dm || 'vraag';
  const prefills = {};
  if(trg.dataset.dmOntvanger) prefills.ontvanger = trg.dataset.dmOntvanger;
  if(trg.dataset.dmOnderwerp) prefills.onderwerp = trg.dataset.dmOnderwerp;
  if(trg.dataset.dmBericht) prefills.bericht = trg.dataset.dmBericht;
  if(trg.dataset.dmPlaceholder) prefills.placeholder = trg.dataset.dmPlaceholder;
  openDMModal(presetKey, prefills);
});

/* =================================================================
   TUTORIAL / WALKTHROUGH (v2 Fase 32)
   ================================================================= */
const TOUR_STEPS = [
  {
    icon: '👋',
    title: 'Welkom in jouw klantenportaal!',
    body: 'Hier vind je alles van Studio 27 op één plek: lopende projecten, deliverables, meetings en directe chat met ons team. We hebben dit gebouwd zodat je nooit meer hoeft te wachten op een antwoord.'
  },
  {
    icon: '📁',
    title: 'Lopende projecten in 1 oogopslag',
    body: 'Per discipline (video, web, branding…) zie je elke taak. Filter op status, klik om in te zoomen, en zie altijd de verwachte oplevering — onze Smart ETA berekent dit live op basis van de echte planning.'
  },
  {
    icon: '💬',
    title: 'Chat per project — direct met het team',
    body: 'Sinds je officieel klant bent, loopt ALLE communicatie via dit portaal. Vraag iets via een project of via "Stuur bericht" — het komt direct in onze planning. Geen mail meer heen-en-weer: sneller antwoord en je kan onze acties live volgen.'
  },
  {
    icon: '🎨',
    title: 'Mijn bedrijf — jouw huisstijl-cloud',
    body: 'Upload logos, fonts, kleurpaletten, brand PDFs en foto\'s. Onze designers en content creators putten direct hieruit — geen "kun je nog eens de fonts sturen?" meer. En je voorkeuren tekst bovenaan helpt ons je merk te begrijpen.'
  },
  {
    icon: '🚀',
    title: 'Klaar om te starten',
    body: 'Vragen? Klik op "Stuur bericht" of "Vraag terugbel" — alles loopt rechtstreeks naar de juiste persoon. Wij zien het meteen en kunnen direct actie ondernemen. Veel succes!'
  }
];

function showWelcomeTour(firstTime){
  // Build modal
  let modal = $('s27-tour-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 's27-tour-modal';
    modal.className = 's27-tour-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 's27-tour-title');
    document.body.appendChild(modal);
  }
  state._tourStep = 0;
  renderTourStep(modal, firstTime);
}

function renderTourStep(modal, firstTime){
  const step = TOUR_STEPS[state._tourStep] || TOUR_STEPS[0];
  const isLast = state._tourStep === TOUR_STEPS.length - 1;
  const isFirst = state._tourStep === 0;
  modal.innerHTML = `
    <div class="s27-tour-dialog" role="document">
      <button class="s27-tour-close" aria-label="Tour sluiten">×</button>
      <div class="s27-tour-icon">${step.icon}</div>
      <h3 class="s27-tour-title" id="s27-tour-title">${esc(step.title)}</h3>
      <p class="s27-tour-body">${esc(step.body)}</p>
      <div class="s27-tour-dots">
        ${TOUR_STEPS.map((_, i) => `<span class="s27-tour-dot${i === state._tourStep ? ' is-active' : ''}" data-step="${i}"></span>`).join('')}
      </div>
      <div class="s27-tour-actions">
        ${!isFirst ? `<button class="s27-btn s27-btn-ghost" id="s27-tour-prev">← Vorige</button>` : (firstTime ? `<button class="s27-btn s27-btn-ghost" id="s27-tour-skip">Tour overslaan</button>` : '<span></span>')}
        ${!isLast
          ? `<button class="s27-btn s27-btn-primary" id="s27-tour-next">Volgende →</button>`
          : `<button class="s27-btn s27-btn-primary" id="s27-tour-done">${firstTime ? 'Aan de slag' : 'Sluiten'}</button>`}
      </div>
    </div>
  `;
  // Handlers
  const close = () => {
    try { modal.remove(); } catch(e){}
    if(firstTime) try { localStorage.setItem('s27_tour_completed', new Date().toISOString()); } catch(e){}
  };
  const next = () => {
    if(state._tourStep < TOUR_STEPS.length - 1){
      state._tourStep += 1;
      renderTourStep(modal, firstTime);
    }
  };
  const prev = () => {
    if(state._tourStep > 0){
      state._tourStep -= 1;
      renderTourStep(modal, firstTime);
    }
  };
  modal.querySelector('.s27-tour-close').addEventListener('click', close);
  const skip = $('s27-tour-skip'); if(skip) skip.addEventListener('click', close);
  const nextBtn = $('s27-tour-next'); if(nextBtn) nextBtn.addEventListener('click', next);
  const prevBtn = $('s27-tour-prev'); if(prevBtn) prevBtn.addEventListener('click', prev);
  const doneBtn = $('s27-tour-done'); if(doneBtn) doneBtn.addEventListener('click', close);
  modal.querySelectorAll('.s27-tour-dot').forEach(d => {
    d.addEventListener('click', () => {
      state._tourStep = parseInt(d.dataset.step, 10) || 0;
      renderTourStep(modal, firstTime);
    });
  });
}

function injectHelpButton(){
  if($('s27-help-btn')) return;
  const header = document.querySelector('.s27-header-actions') || document.querySelector('.s27-header');
  if(!header) return;
  const btn = document.createElement('button');
  btn.id = 's27-help-btn';
  btn.className = 's27-help-btn';
  btn.setAttribute('aria-label', 'Help / rondleiding heropenen');
  btn.title = 'Rondleiding heropenen';
  btn.innerHTML = '?';
  btn.addEventListener('click', () => showWelcomeTour(false));
  header.appendChild(btn);
}

/* =================================================================
   SMART ETA — transparante "wanneer?"-uitleg per project
   ================================================================= */
function computeETA(p){
  if(!p) return { label:'', urgency:'low', icon:'⏱️' };
  const statusKey = (p.status || '').toLowerCase().replace(/\s+/g,'_');
  const now = Date.now();
  const dueMs = p.opleverdatum ? new Date(p.opleverdatum).getTime() : 0;
  const updMs = p.laatst_geupdatet ? new Date(p.laatst_geupdatet).getTime() : 0;
  const daysToDue = dueMs > 0 ? Math.ceil((dueMs - now) / 86400000) : null;
  const daysSinceUpdate = updMs > 0 ? Math.floor((now - updMs) / 86400000) : null;

  // Klant moet iets doen
  if(statusKey === 'doorgestuurd' || p.feedback_link){
    return { label:'Wachtend op jouw feedback', urgency:'high', icon:'⏳' };
  }
  // On hold
  if(statusKey === 'on_hold'){
    return { label:'Tijdelijk gepauzeerd', urgency:'low', icon:'⏸️' };
  }
  // Klaar / opgeleverd
  if(statusKey === 'done' || statusKey === 'goedgekeurd'){
    return { label:'Opgeleverd', urgency:'low', icon:'✅' };
  }
  // Achterstand: due date verstreken
  if(daysToDue !== null && daysToDue < 0){
    return { label:'Loopt achter — we kijken hieraan', urgency:'high', icon:'⚠️' };
  }
  // Bijna klaar: <=3 dagen tot due
  if(daysToDue !== null && daysToDue <= 3 && daysToDue >= 0){
    return { label:'Bijna klaar — ' + (daysToDue === 0 ? 'vandaag' : daysToDue === 1 ? 'morgen' : 'binnen ' + daysToDue + ' dagen'), urgency:'medium', icon:'🚀' };
  }
  // Op planning: 4-30 dagen
  if(daysToDue !== null && daysToDue <= 30){
    return { label:'Op planning — klaar ' + fmtDate(p.opleverdatum), urgency:'low', icon:'📅' };
  }
  // Geen due date maar wel updates → in productie
  if(daysSinceUpdate !== null && daysSinceUpdate <= 7){
    return { label:'Actief in productie', urgency:'low', icon:'🛠️' };
  }
  if(daysSinceUpdate !== null && daysSinceUpdate > 14){
    return { label:'Sluimerend — neem contact op als je wil bijsturen', urgency:'medium', icon:'💤' };
  }
  return { label:'In productie', urgency:'low', icon:'🛠️' };
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
    <div class="s27-upload-sub">Logo's, brand-bestanden, referenties of andere assets. Max 5 MB per bestand, 25 MB totaal.<br>Grotere bestanden? <a href="#" data-dm="upload" data-dm-onderwerp="Hulp bij grote bestanden" data-dm-placeholder="Hoeveel GB? Welk bestandstype? We sturen je een WeTransfer-link of FTP-toegang.">Vraag een upload-link aan</a>.</div>
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
      <p class="s27-contact-tip">💡 Vraag over een lopend project? Open het project en chat direct met het team — sneller dan bellen, alles bij je dossier.</p>
    </div>
    <div class="s27-contact-actions">
      <a class="primary" href="#" data-dm="vraag" data-dm-onderwerp="Vraag voor ${esc(c.am_naam || 'team')}"><svg width="13" height="13"><use href="#s27p-mail"/></svg> Bericht sturen naar ${esc(c.am_naam ? c.am_naam.split(' ')[0] : 'team')}</a>
      <a href="#" data-dm="terugbel" data-dm-onderwerp="Terugbel-verzoek ${esc(state.session && state.session.bedrijfsnaam || '')}" data-dm-placeholder="Beste moment om te bellen: bv. morgen voormiddag, of vrijdag 14u-16u.&#10;&#10;Bespreek onderwerp: "><svg width="13" height="13"><use href="#s27p-phone"/></svg> Vraag terugbel</a>
      ${c.am_gsm ? `<a href="tel:${esc(c.am_gsm)}" class="s27-contact-call-direct"><svg width="13" height="13"><use href="#s27p-phone"/></svg> Direct bellen</a>` : ''}
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
/* =================================================================
   GESTRUCTUREERDE HUISSTIJL-DATA (v2.2 #52)
   Voorkeuren-string format:
     <vrije tekst>
     ---STRUCTURED---
     {"kleuren":{"primary":"#FF0066","secondary":"#000000",...},"fontGebruik":"Inter voor headings"}
   ================================================================= */
const STRUCT_SEPARATOR = '---STRUCTURED---';

function parseBedrijfVoorkeuren(raw){
  if(!raw) return { tekst:'', kleuren:{}, fontGebruik:'', contact:{} };
  const idx = raw.indexOf(STRUCT_SEPARATOR);
  if(idx < 0) return { tekst:raw.trim(), kleuren:{}, fontGebruik:'', contact:{} };
  const tekst = raw.slice(0, idx).trim();
  const jsonStr = raw.slice(idx + STRUCT_SEPARATOR.length).trim();
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      tekst,
      kleuren: parsed.kleuren || {},
      fontGebruik: parsed.fontGebruik || '',
      contact: parsed.contact || {}
    };
  } catch(e){
    return { tekst, kleuren:{}, fontGebruik:'', contact:{} };
  }
}

function serializeBedrijfVoorkeuren(tekst, kleuren, fontGebruik, contact){
  const blob = { kleuren: kleuren || {}, fontGebruik: fontGebruik || '', contact: contact || {} };
  return (tekst || '').trim() + '\n\n' + STRUCT_SEPARATOR + '\n' + JSON.stringify(blob);
}

function renderKleurInput(id, label, hint, value){
  const safeValue = (value || '').match(/^#[0-9a-fA-F]{6}$/) ? value : '';
  return `<div class="s27-kleur-field">
    <div class="s27-kleur-preview" style="background:${safeValue || '#fff'}; ${safeValue ? '' : 'background-image:repeating-linear-gradient(45deg,#eee 0,#eee 6px,#fff 6px,#fff 12px)'}"></div>
    <div class="s27-kleur-meta">
      <span class="s27-kleur-label">${esc(label)}</span>
      <span class="s27-kleur-hint">${esc(hint)}</span>
      <div class="s27-kleur-inputs">
        <input type="color" data-kleur-id="${esc(id)}" value="${esc(safeValue || '#3083DC')}" aria-label="${esc(label)} kleurpicker"/>
        <input type="text" data-kleur-hex="${esc(id)}" value="${esc(safeValue)}" placeholder="#000000" maxlength="7" pattern="^#[0-9a-fA-F]{6}$"/>
      </div>
    </div>
  </div>`;
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

  // v2.2 #45 fix: Make scenario double-encodes \n + \" — decode terug naar echte chars
  const fullVoorkeuren = decodeMakeString(data.algemene_voorkeuren || '').replace(/<[^>]+>/g,'').trim();
  // v2.2 #52: parse vrije tekst + gestructureerde data (JSON na separator)
  const parsed = parseBedrijfVoorkeuren(fullVoorkeuren);
  const voorkeurenTekst = parsed.tekst;
  const merkkleuren = parsed.kleuren || { primary:'', secondary:'', accent:'', tekst:'' };
  const fontGebruik = parsed.fontGebruik || '';

  // Contactgegevens: parse uit description-blob OR session
  const savedContact = parsed.contact || {};
  body.innerHTML = `
    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Contactgegevens</h2>
          <p class="s27-section-sub">Deze gegevens gebruiken we voor offertes, facturen en projectcommunicatie. Klik op "Bewerken" om iets aan te passen.</p>
        </div>
        <button class="s27-btn s27-btn-ghost s27-btn-sm" id="s27-contact-edit-btn">✏️ Bewerken</button>
      </div>
      <div class="s27-contactform s27-contactform-readonly" id="s27-contactform" data-edit-mode="off">
        <div class="s27-form-row">
          <div class="s27-form-field s27-readfield"><span class="s27-readlabel">Voornaam</span><div class="s27-readvalue">${esc(savedContact.voornaam || (state.session && state.session.bedrijfsnaam ? state.session.bedrijfsnaam.split(' ')[0] : '—'))}</div><input type="text" name="voornaam" value="${esc(savedContact.voornaam || '')}" placeholder="Bv. Vincent" hidden/></div>
          <div class="s27-form-field s27-readfield"><span class="s27-readlabel">Achternaam</span><div class="s27-readvalue">${esc(savedContact.achternaam || '—')}</div><input type="text" name="achternaam" value="${esc(savedContact.achternaam || '')}" placeholder="Bv. Verleije" hidden/></div>
        </div>
        <div class="s27-form-row">
          <div class="s27-form-field s27-readfield"><span class="s27-readlabel">GSM</span><div class="s27-readvalue">${esc(savedContact.gsm || '—')}</div><input type="tel" name="gsm" value="${esc(savedContact.gsm || '')}" placeholder="+32 4xx xx xx xx" hidden/></div>
          <div class="s27-form-field s27-readfield"><span class="s27-readlabel">E-mail</span><div class="s27-readvalue">${esc(savedContact.email || (data._raw_email || '—'))}</div><input type="email" name="email" value="${esc(savedContact.email || '')}" placeholder="naam@bedrijf.be" hidden/></div>
        </div>
        <div class="s27-form-field s27-readfield"><span class="s27-readlabel">BTW-nummer</span><div class="s27-readvalue">${esc(savedContact.btw || (data._raw_btw || '—'))}</div><input type="text" name="btw" value="${esc(savedContact.btw || '')}" placeholder="BE0xxx.xxx.xxx" hidden/></div>
        <div class="s27-form-field s27-readfield"><span class="s27-readlabel">Bedrijfsadres (factuur-adres)</span><div class="s27-readvalue">${esc(savedContact.adres || '—')}</div><input type="text" name="adres" value="${esc(savedContact.adres || '')}" placeholder="Straat nummer, postcode stad" hidden/></div>
        <div class="s27-contactform-foot" id="s27-contactform-foot" hidden>
          <span class="s27-contactform-state" id="s27-contactform-state"></span>
          <button class="s27-btn s27-btn-ghost s27-btn-sm" id="s27-contactform-cancel">Annuleer</button>
          <button class="s27-btn s27-btn-sm s27-btn-primary" id="s27-contactform-save">Wijzigingen opslaan</button>
        </div>
      </div>
    </div>

    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Algemene voorkeuren</h2>
          <p class="s27-section-sub">Wat moeten we zeker (niet) doen voor jouw merk? Wat hier staat zien al onze teamleden voor elk project.</p>
        </div>
      </div>
      <div class="s27-voorkeuren">
        <textarea id="s27-voorkeuren-input" placeholder="Bv. We houden van minimalistische typografie. Geen stockfoto's. Onze kleur is altijd warm. Vermijd: gradients, drop shadows…">${esc(voorkeurenTekst)}</textarea>
        <div class="s27-voorkeuren-foot">
          <span class="s27-voorkeuren-state" id="s27-voorkeuren-state"></span>
          <button class="s27-btn s27-btn-sm" id="s27-voorkeuren-save" disabled>Opslaan</button>
        </div>
      </div>
    </div>

    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Merk-kleuren <small style="font-weight:400;color:var(--s27-ink-3);font-size:13px">— hex codes voor AI-assets</small></h2>
          <p class="s27-section-sub">Vul de hex-codes in. Onze designers én onze AI gebruiken deze automatisch voor templates, social media en presentaties.</p>
        </div>
      </div>
      <div class="s27-kleuren-grid" id="s27-kleuren-grid">
        ${renderKleurInput('primary', 'Primaire kleur', 'De hoofdkleur van je merk', merkkleuren.primary || '')}
        ${renderKleurInput('secondary', 'Secundair', 'Steunkleur', merkkleuren.secondary || '')}
        ${renderKleurInput('accent', 'Accent', 'Opvallend, voor CTAs of highlights', merkkleuren.accent || '')}
        ${renderKleurInput('tekst', 'Tekst-kleur', 'Voor body-tekst', merkkleuren.tekst || '')}
      </div>
    </div>

    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Huisstijl-bibliotheek</h2>
          <p class="s27-section-sub">Logo's, fonts, kleurpaletten, brand-PDFs en foto's — alles op één plek. Sleep bestanden in het kader hieronder of klik om te uploaden.</p>
        </div>
      </div>
      <div class="s27-fontuse">
        <label>
          <span><strong>Welke fonts gebruik je voor wat?</strong> Bv. "Inter voor headings, Open Sans voor body, Caveat voor accenten."</span>
          <input type="text" id="s27-fontuse-input" value="${esc(fontGebruik)}" placeholder="Inter voor headings, Open Sans voor body…"/>
        </label>
      </div>
      <div class="s27-uploadzone" id="s27-drop-bedrijf" data-category="overig">
        <input id="s27-up-input-bedrijf" type="file" multiple style="display:none">
        <label for="s27-up-input-bedrijf" class="s27-uploadzone-cta">
          <svg width="22" height="22"><use href="#s27p-upload"/></svg>
          <strong>Klik of sleep bestanden hier</strong>
          <span>Max 5 MB per bestand · 25 MB totaal</span>
        </label>
        <ul id="s27-up-list-bedrijf" class="s27-upload-list"></ul>
      </div>
      <div class="s27-files-flat" id="s27-files-flat">
        ${renderFilesFlat(data.attachments || [])}
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

// v2.2 #68: flat lijst van ALLE bestanden (geen categorieën meer)
function renderFilesFlat(attachments){
  const files = (attachments || []).slice().sort((a, b) => {
    const da = parseInt(a.uploaded_at, 10) || 0;
    const db = parseInt(b.uploaded_at, 10) || 0;
    return db - da; // nieuwste eerst
  });
  if(!files.length){
    return '<div class="s27-files-empty"><div class="s27-files-empty-icon">📁</div><strong>Nog geen bestanden</strong><p>Upload je eerste huisstijl-bestand hierboven.</p></div>';
  }
  return files.map(renderFileCard).join('');
}

function renderFileCard(a){
  const fname = (a.filename || a.name || 'bestand').replace(/^\[[A-Z]+\]\s*/, ''); // strip oude prefix
  const ext = (fname.split('.').pop() || '').toLowerCase();
  const ico = ext === 'pdf' ? '📄' : (['jpg','jpeg','png','gif','webp','heic','svg'].includes(ext) ? '🖼️' : (['mp4','mov','avi'].includes(ext) ? '🎬' : (['ai','psd','eps'].includes(ext) ? '🎨' : (['ttf','otf','woff','woff2'].includes(ext) ? '🔤' : '📎'))));
  const by = a.uploaded_by === 'studio27' ? 'Door Studio 27' : 'Door jou';
  const ts = parseInt(a.uploaded_at, 10);
  const dateStr = ts ? new Date(ts).toLocaleDateString('nl-BE', {day:'2-digit', month:'short', year:'numeric'}) : '';
  const sizeStr = a.size ? bytes(a.size) : '';
  return `<div class="s27-filecard">
    <div class="s27-filecard-ico">${ico}</div>
    <div class="s27-filecard-body">
      <div class="s27-filecard-name">${esc(fname)}</div>
      <div class="s27-filecard-meta">${esc(by)}${dateStr ? ' · ' + esc(dateStr) : ''}${sizeStr ? ' · ' + esc(sizeStr) : ''}</div>
    </div>
    <a class="s27-filecard-dl" href="${esc(a.url || '#')}" download="${esc(fname)}" target="_blank" rel="noopener" title="Download ${esc(fname)}">
      <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M5 20h14v-2H5v2zM12 2v12l4-4 1.4 1.4L12 17l-5.4-5.6L8 10l4 4V2h0z"/></svg>
      Download
    </a>
  </div>`;
}

function refreshFilesFlat(){
  if(!state.bedrijfContent) return;
  const container = $('s27-files-flat');
  if(!container) return;
  container.innerHTML = renderFilesFlat(state.bedrijfContent.attachments || []);
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
    <div class="s27-upload-sub">Max 5 MB per bestand · 25 MB totaal. Grotere bestanden? <a href="#" data-dm="upload" data-dm-onderwerp="Hulp bij grote brand-bestanden" data-dm-placeholder="Welke bestanden? Hoeveel GB? We sturen je een upload-link.">Vraag een upload-link aan</a>.</div>
    <label class="s27-upload-btn" for="${inputId}"><svg width="12" height="12"><use href="#s27p-upload"/></svg> Bestand kiezen</label>
    <input id="${inputId}" type="file" multiple style="display:none">
    <ul class="s27-upload-list" id="${listId}"></ul>
  </div>`;
}

function attachBedrijfHandlers(){
  // Voorkeuren editor + gestructureerde data (kleuren + fontGebruik)
  const ta = $('s27-voorkeuren-input');
  const btn = $('s27-voorkeuren-save');
  const stateLabel = $('s27-voorkeuren-state');
  const fontInput = $('s27-fontuse-input');

  const enableSave = () => { btn.disabled = false; if(stateLabel) stateLabel.textContent = 'Niet opgeslagen'; };

  if(ta){
    ta.addEventListener('input', enableSave);
  }
  if(fontInput){
    fontInput.addEventListener('input', enableSave);
  }
  // Kleur inputs sync — color picker ↔ hex text
  document.querySelectorAll('[data-kleur-id]').forEach(picker => {
    picker.addEventListener('input', () => {
      const id = picker.dataset.kleurId;
      const hex = document.querySelector(`[data-kleur-hex="${id}"]`);
      if(hex) hex.value = picker.value.toUpperCase();
      const preview = picker.closest('.s27-kleur-field').querySelector('.s27-kleur-preview');
      if(preview){ preview.style.background = picker.value; preview.style.backgroundImage = ''; }
      enableSave();
    });
  });
  document.querySelectorAll('[data-kleur-hex]').forEach(hex => {
    hex.addEventListener('input', () => {
      const id = hex.dataset.kleurHex;
      const picker = document.querySelector(`[data-kleur-id="${id}"]`);
      if(/^#[0-9a-fA-F]{6}$/.test(hex.value)){
        if(picker) picker.value = hex.value;
        const preview = hex.closest('.s27-kleur-field').querySelector('.s27-kleur-preview');
        if(preview){ preview.style.background = hex.value; preview.style.backgroundImage = ''; }
      }
      enableSave();
    });
  });

  if(btn){
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Bezig…';
      if(stateLabel) stateLabel.textContent = 'Bezig met opslaan…';
      // Verzamel gestructureerde data
      const kleuren = {};
      document.querySelectorAll('[data-kleur-hex]').forEach(hex => {
        kleuren[hex.dataset.kleurHex] = hex.value || '';
      });
      const fontGebruik = fontInput ? fontInput.value : '';
      // v2.2 #60: behoud bestaande contact info in serialize
      const existingContact = (state.bedrijfContent && parseBedrijfVoorkeuren(decodeMakeString(state.bedrijfContent.algemene_voorkeuren || '')).contact) || {};
      const combined = serializeBedrijfVoorkeuren(ta ? ta.value : '', kleuren, fontGebruik, existingContact);
      if(ENDPOINTS.bedrijfVoorkeuren && !state.demoMode){
        await api(ENDPOINTS.bedrijfVoorkeuren, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token, voorkeuren: combined });
        if(state.bedrijfContent) state.bedrijfContent.algemene_voorkeuren = combined;
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
      btn.textContent = 'Opslaan';
      if(stateLabel) stateLabel.textContent = '✓ Opgeslagen (voorkeuren + kleuren + fonts)';
      setTimeout(() => { if(stateLabel) stateLabel.textContent = ''; }, 3000);
    });
  }

  // v2.2 #67: contact form edit-modus (read-only by default → Bewerken → invoer → save terug read-only)
  const contactForm = $('s27-contactform');
  const contactEditBtn = $('s27-contact-edit-btn');
  const contactSave = $('s27-contactform-save');
  const contactCancel = $('s27-contactform-cancel');
  const contactFoot = $('s27-contactform-foot');
  const contactState = $('s27-contactform-state');

  function toggleEditMode(on){
    if(!contactForm) return;
    contactForm.dataset.editMode = on ? 'on' : 'off';
    contactForm.classList.toggle('s27-contactform-readonly', !on);
    contactForm.querySelectorAll('.s27-readfield').forEach(field => {
      const readValue = field.querySelector('.s27-readvalue');
      const input = field.querySelector('input');
      if(readValue) readValue.hidden = on;
      if(input) input.hidden = !on;
    });
    if(contactFoot) contactFoot.hidden = !on;
    if(contactEditBtn) contactEditBtn.hidden = on;
  }

  if(contactEditBtn) contactEditBtn.addEventListener('click', () => toggleEditMode(true));
  if(contactCancel) contactCancel.addEventListener('click', () => toggleEditMode(false));

  if(contactForm && contactSave){
    contactSave.addEventListener('click', async () => {
      contactSave.disabled = true; contactSave.textContent = 'Versturen…';
      if(contactState) contactState.textContent = 'Bezig…';
      const payload = {
        bedrijf_id: state.session.bedrijf_id,
        session_token: state.session.session_token,
        klant_naam: state.session.bedrijfsnaam,
        voornaam: contactForm.querySelector('[name="voornaam"]').value.trim(),
        achternaam: contactForm.querySelector('[name="achternaam"]').value.trim(),
        gsm: contactForm.querySelector('[name="gsm"]').value.trim(),
        email: contactForm.querySelector('[name="email"]').value.trim(),
        btw: contactForm.querySelector('[name="btw"]').value.trim(),
        adres: contactForm.querySelector('[name="adres"]').value.trim()
      };
      try {
        // 1. Stuur audit-comment via bedrijfContact endpoint
        if(ENDPOINTS.bedrijfContact && !state.demoMode){
          await api(ENDPOINTS.bedrijfContact, payload);
        }
        // 2. Bewaar lokaal in voorkeuren-blob zodat het zichtbaar blijft voor klant
        const parsedNow = parseBedrijfVoorkeuren(decodeMakeString((state.bedrijfContent && state.bedrijfContent.algemene_voorkeuren) || ''));
        const updatedContact = { voornaam: payload.voornaam, achternaam: payload.achternaam, gsm: payload.gsm, email: payload.email, btw: payload.btw, adres: payload.adres };
        const combined = serializeBedrijfVoorkeuren(parsedNow.tekst, parsedNow.kleuren, parsedNow.fontGebruik, updatedContact);
        if(ENDPOINTS.bedrijfVoorkeuren && !state.demoMode){
          await api(ENDPOINTS.bedrijfVoorkeuren, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token, voorkeuren: combined });
          if(state.bedrijfContent) state.bedrijfContent.algemene_voorkeuren = combined;
        }
        if(contactState) contactState.textContent = '✓ Opgeslagen — Ilke en Arne werken het binnen 24u bij';
        // Update read-only values met nieuwe data, ga terug naar read mode
        contactForm.querySelectorAll('.s27-readfield').forEach(field => {
          const input = field.querySelector('input');
          const readValue = field.querySelector('.s27-readvalue');
          if(input && readValue) readValue.textContent = input.value || '—';
        });
        setTimeout(() => toggleEditMode(false), 1000);
      } catch(err){
        console.error('[Studio 27] contact save failed:', err);
        if(contactState) contactState.textContent = 'Iets ging mis — probeer opnieuw';
      }
      contactSave.disabled = false; contactSave.textContent = 'Wijzigingen opslaan';
      setTimeout(() => { if(contactState) contactState.textContent = ''; }, 4000);
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
  const body = $('s27-goedgekeurd-body');
  if(!body) return;
  const dash = state.dashboard || {};
  // Combineer 2 bronnen: actieve projecten met status goedgekeurd + historie_3mnd
  const goedgekeurdActief = (dash.actieve_projecten || []).filter(p => {
    const s = (p.status || '').toLowerCase().replace(/\s+/g,'_');
    return s === 'goedgekeurd' || s === 'done';
  }).map(p => ({
    task_id: p.task_id,
    naam: p.naam,
    discipline: p.discipline,
    afgerond_op: p.opleverdatum || '',
    deliverables: p.deliverables || []
  }));
  const historie = (dash.historie_3mnd || []).map(p => ({
    task_id: p.task_id,
    naam: p.naam,
    discipline: p.discipline,
    afgerond_op: p.afgerond_op || '',
    deliverables: p.deliverables || []
  }));
  // Dedupe op task_id (actief wint)
  const seen = new Set();
  const all = [...goedgekeurdActief, ...historie].filter(p => {
    if(seen.has(p.task_id)) return false;
    seen.add(p.task_id);
    return true;
  });
  // Sort recent eerst
  all.sort((a,b) => {
    const da = a.afgerond_op ? new Date(a.afgerond_op).getTime() : 0;
    const db = b.afgerond_op ? new Date(b.afgerond_op).getTime() : 0;
    return db - da;
  });
  if(!all.length){
    body.innerHTML = '<div class="s27-empty">' +
      '<div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-check"/></svg></div>' +
      '<div class="s27-empty-title">Nog geen afgeronde projecten</div>' +
      '<p class="s27-empty-sub">Zodra je eerste project is opgeleverd, vind je hier alle deliverables — voor altijd bewaard, klik en download.</p>' +
    '</div>';
    return;
  }
  // Groepeer per jaar voor archief-look
  const byYear = {};
  all.forEach(p => {
    const year = p.afgerond_op ? new Date(p.afgerond_op).getFullYear() : 'Onbekend';
    if(!byYear[year]) byYear[year] = [];
    byYear[year].push(p);
  });
  const years = Object.keys(byYear).sort((a,b) => Number(b)-Number(a));
  let html = '<div class="s27-archive-intro"><h3>Archief — alle opgeleverde projecten</h3>' +
    '<p>Klik op een project om deliverables te zien. Alle links blijven werkend, ook na 3 maanden.</p></div>';
  years.forEach(y => {
    html += '<div class="s27-archive-year"><h4>' + esc(y) + ' <span class="s27-badge s27-badge-muted">' + byYear[y].length + '</span></h4>' +
      '<div class="s27-archive-list">' + byYear[y].map(renderArchiveCard).join('') + '</div></div>';
  });
  body.innerHTML = html;
}

function renderArchiveCard(p){
  const dLabel = p.afgerond_op ? new Date(p.afgerond_op).toLocaleDateString('nl-BE', {day:'2-digit', month:'short', year:'numeric'}) : '–';
  const di = getDisciplineInfo(p.discipline);
  const discAccent = di.accent;
  const discLabel = di.label;
  const dels = Array.isArray(p.deliverables) ? p.deliverables : [];
  return '<details class="s27-archive-card">' +
    '<summary>' +
      '<div class="s27-archive-card-head">' +
        '<span class="s27-archive-disc" style="--accent:' + discAccent + '">' + esc(discLabel) + '</span>' +
        '<strong>' + esc(p.naam || 'Onbenoemd project') + '</strong>' +
      '</div>' +
      '<span class="s27-archive-date">' + esc(dLabel) + '</span>' +
      '<svg class="s27-archive-chevron" width="14" height="14" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '</summary>' +
    '<div class="s27-archive-body">' +
      (dels.length
        ? '<div class="s27-archive-dels">' + dels.map(d => '<a href="' + esc(d.url||'#') + '" target="_blank" rel="noopener" class="s27-archive-del"><svg width="13" height="13"><use href="#s27p-link"/></svg>' + esc(d.label || d.type || 'Deliverable') + '</a>').join('') + '</div>'
        : '<p class="s27-archive-empty">Geen deliverables-links beschikbaar. <a href="#" data-dm="archief" data-dm-onderwerp="Oude deliverables opvragen: ' + esc(p.naam || '') + '" data-dm-placeholder="Welke bestanden zoek je? We zoeken het op en sturen ze door.">Vraag de bestanden bij ons op →</a></p>') +
    '</div>' +
  '</details>';
}
/* Dynamische vervolgvragen per project-type — v2.2 #62 (Studio27 tone of voice) */
const PROJECT_SUB_QUESTIONS = {
  'Video + Fotografie': [
    { id:'vf_type',     label:'Wat voor content?',               type:'select', opts:['Corporate / bedrijfsfilm','Promovideo / reclame','Social media reels (verticaal)','Interview / testimonial','Event-coverage','Productvideo + productfoto\'s','Bedrijfsfoto\'s / team','Lifestyle / brand'] },
    { id:'vf_shoot',    label:'Shoot inplannen voor dit project?', type:'select', opts:['Ja, we willen een shoot','Bestaand beeldmateriaal hergebruiken','Nog niet zeker — eerst overleg'] },
    { id:'vf_lengte',   label:'Verwachte lengte van de video',    type:'select', opts:['15 sec','30 sec','60 sec','1 – 2 min','2 – 5 min','5+ min','Geen video — enkel foto'] },
    { id:'vf_aantal',   label:'Hoeveel deliverables verwacht je?',type:'select', opts:['1 versie','2 – 3 versies','4 – 6 versies','7+ versies (campagne)'] }
  ],
  'Webdesign': [
    { id:'web_type',    label:'Wat voor site?',          type:'select', opts:['Nieuwe website (one-pager)','Nieuwe website (5 – 10 pagina\'s)','Nieuwe website (10+ pagina\'s)','Webshop / ecommerce','Landing page','Restyling bestaande site'] },
    { id:'web_talen',   label:'Aantal taalversies',      type:'select', opts:['1 taal','2 talen','3+ talen'] },
    { id:'web_cms',     label:'CMS / zelf kunnen wijzigen?', type:'select', opts:['Ja, ik wil zelf updates kunnen doen','Nee, jullie beheren','Twijfel nog'] }
  ],
  'Branding / huisstijl / grafisch ontwerp': [
    { id:'brand_scope', label:'Wat heb je nodig?', type:'select', opts:['Eenmalig grafisch ontwerp (banner, flyer, advertentie…)','Alleen logo','Logo + basis-huisstijl','Volledige rebranding','Brandbook + guidelines'] }
  ],
  'Social media beheer': [
    { id:'soc_freq',    label:'Hoeveel posts per maand?', type:'select', opts:['4 – 8 posts','8 – 16 posts','16 – 30 posts','30+ posts'] },
    { id:'soc_kanalen', label:'Welke kanalen?',           type:'select', opts:['Instagram + Facebook','+ LinkedIn','+ TikTok','Multichannel (alles)'] }
  ],
  'Advertentiebeheer': [
    { id:'ads_kanalen',  label:'Welke kanalen wil je inzetten?',         type:'select', opts:['Google Ads','Meta (Facebook + Instagram)','TikTok / Snapchat','LinkedIn','Multichannel'] },
    { id:'ads_doel',     label:'Hoofddoel van de campagne',              type:'select', opts:['Meer leads','Meer omzet (ecommerce)','Naamsbekendheid','Recruitment / employer branding'] }
  ],
  'Online organische vindbaarheid (SEO + GEO)': [
    { id:'seo_status',  label:'Huidige situatie?',   type:'select', opts:['Nooit echt mee bezig','Basis opgezet maar geen opvolging','Loopt al maar moet beter','Optimaliseren voor AI (GEO)'] }
  ],
  'Opleiding op maat': [
    { id:'opl_thema',   label:'Welk onderwerp?',           type:'select', opts:['Social media beheer','Content creation','SEO + GEO','Advertentiebeheer-basis','AI & automatisatie','Op maat'] },
    { id:'opl_groep',   label:'Hoeveel deelnemers?',       type:'select', opts:['1 op 1','2 – 5','6 – 12','13+'] }
  ],
  'AI & automatisatie': [
    { id:'auto_tools',  label:'Welke tools wil je koppelen?',  type:'text',   placeholder:'Bv. ClickUp + Gmail + Slack' },
    { id:'auto_doel',   label:'Wat moet de automation oplossen?', type:'text',placeholder:'Bv. "Lead vanuit website automatisch in CRM + welkomstmail"' }
  ]
};

// Wie krijgt welke offerte? Arne default (offertes), Ilke (opstart bestaande klant), Vincent (zaakvoerder)
const PROJECT_CONTACT_OPTIONS = [
  { id:'arne',    naam:'Arne Goetschalckx', email:'arne@studio27.be',    rol:'Sales — offertes & nieuwe projecten' },
  { id:'ilke',    naam:'Ilke Meeusen',      email:'ilke@studio27.be',    rol:'Account manager — bestaande klanten / opstart' },
  { id:'vincent', naam:'Vincent Verleije',  email:'vincent@studio27.be', rol:'Zaakvoerder — strategie & grote trajecten' }
];

function renderNieuwTab(){
  const body = $('s27-nieuw-body');
  if(!body) return;
  if(state._nieuwProjectSubmitted){
    body.innerHTML = renderNieuwProjectSuccess(state._nieuwProjectSubmitted);
    return;
  }
  body.innerHTML = `
    <div class="s27-nieuw-intro">
      <h3>Nieuw project aanvragen</h3>
      <p>Vertel ons in een paar regels wat je wil. We sturen je <strong>vandaag nog</strong> een offerte op maat — vrijblijvend.</p>
    </div>
    <form class="s27-nieuw-form" id="s27-nieuw-form" autocomplete="off">
      <label class="s27-form-field">
        <span>Type project <em>*</em></span>
        <select name="project_type" id="s27-pt-select" required>
          <option value="">Kies een type…</option>
          <option value="Video + Fotografie">Video + Fotografie</option>
          <option value="Webdesign">Webdesign / nieuwe site</option>
          <option value="Branding / huisstijl / grafisch ontwerp">Branding, huisstijl of grafisch ontwerp</option>
          <option value="Social media beheer">Social media beheer</option>
          <option value="Advertentiebeheer">Advertentiebeheer</option>
          <option value="Online organische vindbaarheid (SEO + GEO)">Online organische vindbaarheid (SEO + GEO)</option>
          <option value="Opleiding op maat">Opleiding op maat</option>
          <option value="AI & automatisatie">AI &amp; automatisatie</option>
          <option value="Anders">Iets anders…</option>
        </select>
      </label>

      <div id="s27-pt-sub" class="s27-pt-sub" hidden></div>

      <label class="s27-form-field">
        <span>Gewenste opleverdatum</span>
        <input type="date" name="gewenste_opleverdatum"/>
      </label>

      <label class="s27-form-field">
        <span>Omschrijf je idee in een paar regels <em>*</em></span>
        <textarea name="omschrijving" rows="6" required placeholder="Voorbeeld: nieuwe corporate website met meertalig CMS, koppeling met onze Odoo-database en focus op SEO. Designstijl: modern, donker, met veel beweging."></textarea>
      </label>

      <label class="s27-form-field">
        <span>Naar wie sturen we de offerte? <em>*</em></span>
        <select name="contact_owner" id="s27-contact-owner" required>
          ${PROJECT_CONTACT_OPTIONS.map(o => `<option value="${esc(o.id)}"${o.id === 'arne' ? ' selected' : ''}>${esc(o.naam)} — ${esc(o.rol)}</option>`).join('')}
        </select>
      </label>

      <div class="s27-form-actions">
        <button type="submit" class="s27-btn s27-btn-primary" id="s27-nieuw-submit">Stuur aanvraag</button>
        <p class="s27-form-info">We reageren binnen 24u. Geen verplichting tot iets — eerst luisteren, dan offerte.</p>
      </div>
      <p class="s27-form-error" id="s27-nieuw-error" style="display:none"></p>
    </form>
  `;
  const form = $('s27-nieuw-form');
  if(form) form.addEventListener('submit', submitNieuwProject);
  const ptSelect = $('s27-pt-select');
  if(ptSelect) ptSelect.addEventListener('change', () => renderProjectSubQuestions(ptSelect.value));
}

function renderProjectSubQuestions(projectType){
  const subBox = $('s27-pt-sub');
  if(!subBox) return;
  const qs = PROJECT_SUB_QUESTIONS[projectType];
  if(!qs || !qs.length){
    subBox.hidden = true;
    subBox.innerHTML = '';
    return;
  }
  subBox.hidden = false;
  const needsShoot = projectType === 'Video + Fotografie';
  subBox.innerHTML = '<div class="s27-pt-sub-head"><strong>📋 Help ons je offerte sneller op maat maken</strong><span>Beantwoord wat je al weet — je kan altijd later aanpassen</span></div>' +
    qs.map(q => {
      if(q.type === 'select'){
        return `<label class="s27-form-field">
          <span>${esc(q.label)}</span>
          <select name="sub_${esc(q.id)}" ${q.id === 'vf_shoot' ? 'data-triggers-shootstep="1"' : ''}>
            <option value="">Nog niet zeker</option>
            ${q.opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
          </select>
        </label>`;
      }
      if(q.type === 'text'){
        return `<label class="s27-form-field">
          <span>${esc(q.label)}</span>
          <input type="text" name="sub_${esc(q.id)}" placeholder="${esc(q.placeholder || '')}"/>
        </label>`;
      }
      return '';
    }).join('') +
    (needsShoot ? '<div id="s27-shoot-step2" class="s27-shoot-step2" hidden></div>' : '');
  // v2.2 #62: shoot is 2-stap. Stap 1 = ja/nee in sub-vragen. Stap 2 = duur + tijdsloten + opmerkingen.
  if(needsShoot){
    subBox.querySelectorAll('[data-triggers-shootstep]').forEach(sel => {
      sel.addEventListener('change', () => {
        const wantsShoot = /ja|we willen/i.test(sel.value);
        const step2 = $('s27-shoot-step2');
        if(!step2) return;
        if(wantsShoot){
          step2.hidden = false;
          step2.innerHTML = renderShootStep2();
          wireShootStep2();
        } else {
          step2.hidden = true;
          step2.innerHTML = '';
        }
      });
    });
  }
}

function renderShootStep2(){
  return `
    <div class="s27-shoot-step2-head"><strong>📸 Stap 2 — Shoot in detail</strong><span>Geef de duur door, kies een dag, of laat een opmerking achter</span></div>
    <div class="s27-form-row">
      <label class="s27-form-field">
        <span>Verwachte duur van de shoot <em>*</em></span>
        <select name="sub_shoot_duur" id="s27-shoot-duur">
          <option value="">Kies een duur…</option>
          <option value="halve dag">Halve dag (incl. reistijd ±4u)</option>
          <option value="hele dag">Hele dag (incl. reistijd ±8u)</option>
          <option value="meerdere dagen">Meerdere dagen — overleg nodig</option>
        </select>
      </label>
      <label class="s27-form-field">
        <span>Hoeveel content creators? <em>*</em></span>
        <select name="sub_shoot_creators">
          <option value="">Kies een aantal…</option>
          <option value="1 content creator">1 content creator</option>
          <option value="2+ content creators">2 of meer content creators</option>
        </select>
      </label>
    </div>
    <div id="s27-shoot-availability" class="s27-shoot-availability" hidden>
      <div class="s27-loading" style="padding:14px">Beschikbare momenten ophalen…</div>
    </div>
    <label class="s27-form-field">
      <span>Opmerkingen / afwijkingen</span>
      <textarea name="sub_shoot_opmerkingen" rows="3" placeholder="Bv. graag in de namiddag, of een specifieke datum, of beschikbaarheid van locatie…"></textarea>
    </label>
  `;
}

function wireShootStep2(){
  const duurSel = $('s27-shoot-duur');
  if(!duurSel) return;
  duurSel.addEventListener('change', () => {
    if(duurSel.value) loadShootPreview();
    else {
      const av = $('s27-shoot-availability');
      if(av){ av.hidden = true; av.innerHTML = ''; }
    }
  });
}

/* =================================================================
   SHOOT BESCHIKBAARHEID (v2.2 #49) — hergebruik bestaand booking systeem
   Endpoint: ENDPOINTS.shootAvailability geeft {shoots, shoots_27m, vakantie, hosts}
   We tonen eerstvolgende 5 vrije voormiddag/namiddag slots per host
   ================================================================= */
let _shootDataCache = null;

async function loadShootPreview(){
  // v2.2 #62: schrijft naar nieuwe stap-2 container (s27-shoot-availability) of legacy s27-shoot-preview
  const box = $('s27-shoot-availability') || $('s27-shoot-preview');
  if(!box) return;
  box.hidden = false;
  box.innerHTML = '<div class="s27-loading" style="padding:14px">Beschikbare shoot-momenten ophalen…</div>';
  try {
    if(!_shootDataCache){
      const r = await fetch(ENDPOINTS.shootAvailability, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      _shootDataCache = await r.json();
    }
    box.innerHTML = renderShootSlots(_shootDataCache);
  } catch(err){
    box.innerHTML = '<div class="s27-form-error">Beschikbare momenten konden niet geladen worden — <a href="#" data-dm="shoot" data-dm-onderwerp="Shoot manueel inplannen">stuur een aanvraag</a>.</div>';
  }
}

function renderShootSlots(data){
  const hosts = data.hosts || [];
  const shoots = (data.shoots || []).concat(data.shoots_27m || []);
  const vakantie = data.vakantie || [];
  const now = Date.now();
  const horizonMs = now + (21 * 86400000); // 3 weken vooruit
  // Per host: bezette dagen identificeren
  const bezetByHost = {};
  hosts.forEach(h => bezetByHost[h.id] = new Set());
  shoots.forEach(t => {
    const due = parseInt(t.due_date, 10);
    if(!due || due < now || due > horizonMs) return;
    const day = new Date(due).toISOString().slice(0,10);
    (t.assignees || []).forEach(a => {
      if(bezetByHost[a.id]) bezetByHost[a.id].add(day);
    });
  });
  vakantie.forEach(v => {
    const start = parseInt(v.start_date, 10);
    const end = parseInt(v.due_date || v.start_date, 10);
    if(!start) return;
    let cur = start;
    while(cur <= end && cur <= horizonMs){
      const day = new Date(cur).toISOString().slice(0,10);
      (v.assignees || []).forEach(a => {
        if(bezetByHost[a.id]) bezetByHost[a.id].add(day);
      });
      cur += 86400000;
    }
  });
  // Per host: eerste 3 vrije werkdagen vinden (ma-vr)
  const slotsByHost = hosts.map(h => {
    const vrij = [];
    for(let d = now; d <= horizonMs && vrij.length < 3; d += 86400000){
      const dt = new Date(d);
      const dow = dt.getDay(); // 0=zo, 6=za
      if(dow === 0 || dow === 6) continue;
      const dayKey = dt.toISOString().slice(0,10);
      if(!bezetByHost[h.id].has(dayKey)) vrij.push(dayKey);
    }
    return { naam: h.name, slots: vrij };
  });
  return '<div class="s27-shoot-head"><strong>📸 Eerstvolgende vrije momenten</strong><span>Onze content creators per dag — kies wat het beste past</span></div>' +
    '<div class="s27-shoot-grid">' +
      slotsByHost.map(h => {
        if(!h.slots.length){
          return `<div class="s27-shoot-host"><strong>${esc(h.naam)}</strong><span class="s27-shoot-empty">Volgeboekt komende 3 weken</span></div>`;
        }
        return `<div class="s27-shoot-host"><strong>${esc(h.naam)}</strong>` +
          h.slots.map(s => `<button type="button" class="s27-shoot-slot" data-host="${esc(h.naam)}" data-day="${esc(s)}">${esc(new Date(s).toLocaleDateString('nl-BE',{weekday:'short',day:'2-digit',month:'short'}))}</button>`).join('') +
        '</div>';
      }).join('') +
    '</div>' +
    '<p class="s27-shoot-info">⚡ Tip: klik op een dag om die voorkeur door te geven met je aanvraag.</p>';
}

// Globale click handler voor shoot-slot keuze → toevoegen aan sub_answers
document.addEventListener('click', e => {
  const slot = e.target.closest && e.target.closest('.s27-shoot-slot');
  if(!slot) return;
  document.querySelectorAll('.s27-shoot-slot').forEach(s => s.classList.remove('is-chosen'));
  slot.classList.add('is-chosen');
  const form = $('s27-nieuw-form');
  if(!form) return;
  // Verwijder eerdere shoot-keuze
  Array.from(form.querySelectorAll('input[name="sub_shoot_voorkeur"]')).forEach(el => el.remove());
  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.name = 'sub_shoot_voorkeur';
  hidden.value = slot.dataset.host + ' op ' + slot.dataset.day;
  form.appendChild(hidden);
});

function renderNieuwProjectSuccess(result){
  return `
    <div class="s27-nieuw-success">
      <div class="s27-success-icon"><svg width="32" height="32"><use href="#s27p-check"/></svg></div>
      <h3>Bedankt — we hebben je aanvraag goed ontvangen!</h3>
      <p>Onze account manager neemt binnen 24u contact op met een offerte op maat. Geen verplichting.</p>
      ${result.offerte_task_url ? `<p class="s27-success-meta">Status van je aanvraag: <a href="${esc(result.offerte_task_url)}" target="_blank" rel="noopener">bekijk in onze planning</a></p>` : ''}
      <button class="s27-btn s27-btn-ghost" onclick="state._nieuwProjectSubmitted=null; renderNieuwTab()">Nog een aanvraag indienen</button>
    </div>
  `;
}

async function submitNieuwProject(e){
  e.preventDefault();
  const form = e.target;
  const btn = $('s27-nieuw-submit');
  const errEl = $('s27-nieuw-error');
  if(errEl) errEl.style.display = 'none';
  if(btn){ btn.disabled = true; btn.textContent = 'Aanvraag versturen…'; }

  // Verzamel dynamische sub-vragen
  const subAnswers = {};
  Array.from(form.querySelectorAll('[name^="sub_"]')).forEach(el => {
    if(el.value) subAnswers[el.name.replace('sub_','')] = el.value;
  });
  const subText = Object.keys(subAnswers).length
    ? '\n\n— Antwoorden op vervolgvragen:\n' + Object.entries(subAnswers).map(([k,v]) => '• ' + k + ': ' + v).join('\n')
    : '';
  // Resolve contactpersoon
  const contactOwner = form.contact_owner ? form.contact_owner.value : 'arne';
  const owner = PROJECT_CONTACT_OPTIONS.find(o => o.id === contactOwner) || PROJECT_CONTACT_OPTIONS[0];
  const payload = {
    bedrijf_id: state.session.bedrijf_id,
    klant_naam: state.session.bedrijfsnaam,
    session_token: state.session.session_token,
    project_type: form.project_type.value,
    gewenste_opleverdatum: form.gewenste_opleverdatum.value,
    omschrijving: form.omschrijving.value + subText,
    contactpersoon_email: owner.email,
    contactpersoon_naam: owner.naam,
    sub_answers: subAnswers
  };

  try {
    if(state.demoMode){
      // Demo mode — toon success met dummy ID
      state._nieuwProjectSubmitted = {ok:true, offerte_task_id:'DEMO-001', message:'Bedankt — demo mode'};
      renderNieuwTab();
      return;
    }
    const res = await api(ENDPOINTS.newProjectIntake, payload);
    if(res.ok && res.data && res.data.ok){
      state._nieuwProjectSubmitted = res.data;
      renderNieuwTab();
    } else {
      const msg = (res.data && res.data.message) || 'Aanvraag kon niet worden verzonden. Mail rechtstreeks naar ilke@studio27.be.';
      if(errEl){ errEl.style.display = 'block'; errEl.textContent = msg; }
      if(btn){ btn.disabled = false; btn.textContent = 'Stuur aanvraag'; }
    }
  } catch(err){
    if(errEl){ errEl.style.display = 'block'; errEl.textContent = 'Netwerkfout — probeer opnieuw.'; }
    if(btn){ btn.disabled = false; btn.textContent = 'Stuur aanvraag'; }
  }
}
function renderInstellingenTab(){
  const body = $('s27-instellingen-body');
  if(!body) return;
  const sess = state.session || {};
  const dash = state.dashboard || {};
  const contact = dash.contact || {};
  const prefs = loadNotifPrefs();
  const expiresStr = sess.expires_at ? new Date(sess.expires_at).toLocaleString('nl-BE', {dateStyle:'long', timeStyle:'short'}) : '–';
  body.innerHTML = `
    <div class="s27-settings-grid">
      <section class="s27-settings-card">
        <h3 class="s27-settings-title"><svg width="16" height="16"><use href="#s27p-spark"/></svg> Notificatie-voorkeuren</h3>
        <p class="s27-settings-sub">Hoe wil je dat we je waarschuwen bij nieuwe feedback-vraag, opleveringen of vragen vanuit het team?</p>
        <div class="s27-notif-options">
          <label class="s27-notif-opt"><input type="radio" name="notif" value="mail" ${prefs.kanaal === 'mail' ? 'checked' : ''}/><div><strong>Alleen e-mail</strong><span>Klassieke updates in je inbox</span></div></label>
          <label class="s27-notif-opt"><input type="radio" name="notif" value="whatsapp" ${prefs.kanaal === 'whatsapp' ? 'checked' : ''}/><div><strong>Alleen WhatsApp</strong><span>Snel, direct, op je telefoon</span></div></label>
          <label class="s27-notif-opt"><input type="radio" name="notif" value="beide" ${prefs.kanaal === 'beide' || !prefs.kanaal ? 'checked' : ''}/><div><strong>Beide kanalen</strong><span>Niets missen — aanbevolen</span></div></label>
        </div>
        <button class="s27-btn s27-btn-primary" id="s27-save-notif" style="margin-top:14px">Voorkeuren opslaan</button>
        <p class="s27-settings-status" id="s27-notif-status" style="display:none"></p>
      </section>

      <section class="s27-settings-card">
        <h3 class="s27-settings-title"><svg width="16" height="16"><use href="#s27p-user"/></svg> Jouw contactpersoon bij Studio 27</h3>
        ${contact.am_naam ? `
          <div class="s27-am-card">
            ${contact.am_foto_url ? `<img src="${esc(contact.am_foto_url)}" alt="${esc(contact.am_naam)}" class="s27-am-photo"/>` : '<div class="s27-am-photo s27-am-photo-fallback">' + esc((contact.am_naam||'?')[0]) + '</div>'}
            <div>
              <strong>${esc(contact.am_naam)}</strong>
              <span>${esc(contact.am_rol || 'Account manager')}</span>
              <a href="#" data-dm="vraag" data-dm-onderwerp="Bericht voor ${esc(contact.am_naam || 'team')}">💬 Bericht sturen naar ${esc(contact.am_naam ? contact.am_naam.split(' ')[0] : 'team')}</a>
              ${contact.am_gsm ? `<a href="tel:${esc(contact.am_gsm)}" class="s27-contact-call-direct">📞 ${esc(contact.am_gsm)}</a>` : ''}
            </div>
          </div>
        ` : '<p class="s27-settings-sub">Contact info wordt binnenkort getoond.</p>'}
      </section>

      <section class="s27-settings-card">
        <h3 class="s27-settings-title"><svg width="16" height="16"><use href="#s27p-lock"/></svg> Sessie & toegang</h3>
        <dl class="s27-settings-dl">
          <dt>Ingelogd als</dt><dd>${esc(sess.bedrijfsnaam || '–')}</dd>
          <dt>Bedrijf-ID</dt><dd><code>${esc(sess.bedrijf_id || '–')}</code></dd>
          <dt>Sessie geldig tot</dt><dd>${esc(expiresStr)}</dd>
        </dl>
        <div class="s27-settings-actions">
          <button class="s27-btn s27-btn-ghost" id="s27-clear-cache">Wis lokale cache</button>
          <button class="s27-btn s27-btn-danger" id="s27-logout-btn">Uitloggen</button>
        </div>
      </section>

      <section class="s27-settings-card s27-settings-card-muted">
        <h3 class="s27-settings-title">🚧 Binnenkort</h3>
        <ul class="s27-coming-list">
          <li>Auto-reminders bij openstaande feedback (mail + WhatsApp)</li>
          <li>Wachtwoord/PIN ipv login-token</li>
          <li>Multi-user toegang per bedrijf (collega's uitnodigen)</li>
          <li>API-koppeling voor jouw eigen tools</li>
        </ul>
      </section>
    </div>
  `;
  // Wire up handlers
  const saveBtn = $('s27-save-notif');
  if(saveBtn) saveBtn.addEventListener('click', saveNotifPrefs);
  const clearBtn = $('s27-clear-cache');
  if(clearBtn) clearBtn.addEventListener('click', () => {
    try { localStorage.clear(); } catch(e){}
    showSettingsStatus('s27-notif-status', 'Lokale cache gewist. Login opnieuw om vers te starten.', 'info');
  });
  const logoutBtn = $('s27-logout-btn');
  if(logoutBtn) logoutBtn.addEventListener('click', () => {
    try { localStorage.removeItem('s27_portal_session'); } catch(e){}
    state.session = null;
    state.viewMode = 'login';
    renderApp();
  });
}

function loadNotifPrefs(){
  try { return JSON.parse(localStorage.getItem('s27_notif_prefs') || '{}'); }
  catch(e){ return {}; }
}

function saveNotifPrefs(){
  const checked = document.querySelector('input[name="notif"]:checked');
  if(!checked) return;
  const kanaal = checked.value;
  try { localStorage.setItem('s27_notif_prefs', JSON.stringify({kanaal, savedAt: new Date().toISOString()})); } catch(e){}
  // Audit trail naar ClickUp via chat-post op Bedrijf-task
  if(ENDPOINTS.chatPost && !state.demoMode){
    api(ENDPOINTS.chatPost, {
      task_id: state.session.bedrijf_id,
      klant_naam: state.session.bedrijfsnaam,
      comment_text: '[INTERN] Klantvoorkeuren bijgewerkt via portaal — notificatiekanaal: ' + kanaal,
      session_token: state.session.session_token
    }).catch(() => {});
  }
  showSettingsStatus('s27-notif-status', 'Voorkeur opgeslagen — we sturen voortaan via "' + kanaal + '".', 'success');
}

function showSettingsStatus(id, msg, type){
  const el = $(id);
  if(!el) return;
  el.style.display = 'block';
  el.textContent = msg;
  el.setAttribute('data-status', type || 'info');
  setTimeout(() => { try { el.style.display = 'none'; } catch(e){} }, 4500);
}

async function renderMeetingsTab(){
  const body = $('s27-meetings-body');
  if(!body) return;
  body.innerHTML = '<div class="s27-loading">Meetings laden…</div>';

  // Probeer live data uit ClickUp Meetings-lijst (v2 endpoint), fallback naar dashboard.aankomende_meetings
  let live = null;
  if(ENDPOINTS.meetingsList && !state.demoMode){
    try {
      const res = await api(ENDPOINTS.meetingsList, {
        bedrijf_id: state.session.bedrijf_id,
        session_token: state.session.session_token,
        bedrijfsnaam: state.session.bedrijfsnaam
      });
      if(res.ok && res.data && Array.isArray(res.data.meetings)) live = res.data;
    } catch(e){ /* fallback */ }
  }

  let meetings = [];
  let bookingUrl = null; // Fallback: open DM-modal ipv mailto
  if(live){
    // Filter client-side op bedrijfsnaam
    const bn = (state.session.bedrijfsnaam || '').toUpperCase().trim();
    const allMeetings = live.meetings.filter(m => {
      const title = (m.titel || '').toUpperCase();
      // Match bedrijfsnaam in titel (case-insensitive)
      return bn && title.includes(bn);
    }).map(m => {
      const dateMs = m.datum ? parseInt(m.datum, 10) : 0;
      return {
        meeting_id: m.meeting_id,
        titel: m.titel,
        datum: dateMs ? new Date(dateMs).toISOString() : '',
        datum_ms: dateMs,
        status: m.status,
        link: m.link,
        type: m.titel && m.titel.toLowerCase().includes('kickoff') ? 'Kickoff' : ''
      };
    });
    meetings = allMeetings;
    if(live.booking_url) bookingUrl = live.booking_url;
  } else {
    // Fallback naar v1 dashboard data
    meetings = (state.dashboard && state.dashboard.aankomende_meetings) || [];
  }

  // Split: upcoming (datum_ms >= now) vs past
  const now = Date.now();
  const upcoming = meetings.filter(m => !m.datum_ms || m.datum_ms >= now).sort((a,b) => (a.datum_ms||0) - (b.datum_ms||0));
  const past = meetings.filter(m => m.datum_ms && m.datum_ms < now).sort((a,b) => (b.datum_ms||0) - (a.datum_ms||0));

  const bookingBtn = '<button class="s27-btn s27-btn-primary s27-meetings-cta" id="s27-meetings-book-btn" type="button">' +
    '<svg width="16" height="16"><use href="#s27p-cal"/></svg> <span>Nieuwe meeting inplannen</span></button>';

  // Header met titel + CTA rechtsboven — altijd zichtbaar
  const header = '<div class="s27-meetings-head">' +
    '<div><h3 class="s27-meetings-h">Jouw meetings</h3>' +
      '<p class="s27-meetings-sub">Een overzicht van wat aankomt en wat al langs is gekomen.</p></div>' +
    bookingBtn +
  '</div>';

  // Booking slots overlay container (toegevoegd onder header)
  const slotsBox = '<div id="s27-book-slots" class="s27-book-slots" hidden></div>';

  if(!meetings.length){
    body.innerHTML = header + slotsBox +
      '<div class="s27-empty"><div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-cal"/></svg></div>' +
      '<div class="s27-empty-title">Nog geen meetings ingepland</div>' +
      '<p class="s27-empty-sub">Klik bovenaan op <strong>Nieuwe meeting inplannen</strong> — we tonen meteen de eerstvolgende vrije momenten.</p></div>';
    wireBookingButton(bookingUrl);
    return;
  }

  let html = header + slotsBox;
  if(upcoming.length){
    html += '<div class="s27-section"><h3 class="s27-section-title">Aankomende meetings <span class="s27-badge">' + upcoming.length + '</span></h3>' +
      '<div class="s27-meetings-list">' + upcoming.map(renderMeetingCard).join('') + '</div></div>';
  }
  if(past.length){
    html += '<div class="s27-section" style="margin-top:24px"><h3 class="s27-section-title">Eerdere meetings <span class="s27-badge s27-badge-muted">' + past.length + '</span></h3>' +
      '<div class="s27-meetings-list">' + past.slice(0,10).map(renderMeetingCard).join('') + '</div></div>';
  }
  body.innerHTML = html;
  wireBookingButton(bookingUrl);
}

function wireBookingButton(externalBookingUrl){
  const btn = $('s27-meetings-book-btn');
  if(!btn) return;
  btn.addEventListener('click', () => loadMeetingSlots(externalBookingUrl));
}

async function loadMeetingSlots(externalBookingUrl){
  const box = $('s27-book-slots');
  if(!box) return;
  box.hidden = false;
  box.innerHTML = '<div class="s27-loading" style="padding:18px">Eerstvolgende vrije momenten zoeken…</div>';
  try {
    if(!_shootDataCache){
      const r = await fetch(ENDPOINTS.shootAvailability, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      _shootDataCache = await r.json();
    }
    box.innerHTML = renderMeetingSlots(_shootDataCache);
    // Wire location toggle — updates BOTH oude .s27-book-slot en nieuwe .s27-book-slot-time
    document.querySelectorAll('input[name="s27-meet-loc"]').forEach(r => {
      r.addEventListener('change', () => {
        const loc = document.querySelector('input[name="s27-meet-loc"]:checked');
        if(!loc) return;
        document.querySelectorAll('.s27-book-slot, .s27-book-slot-time').forEach(slot => {
          if(slot.dataset.dmOnderwerpBase) slot.dataset.dmOnderwerp = slot.dataset.dmOnderwerpBase + ' — ' + loc.value;
        });
      });
    });
  } catch(err){
    box.innerHTML = '<div class="s27-form-error">Beschikbaarheid kon niet opgehaald worden — <a href="#" data-dm="meeting" data-dm-onderwerp="Meeting-aanvraag (beschikbaarheid kon niet laden)">stuur een vraag</a>.</div>';
  }
}

function renderMeetingSlots(data){
  const teamHosts = [
    { id:48338421, naam:'Ilke Meeusen',      rol:'Account manager — projectopvolging' },
    { id:8714037,  naam:'Vincent Verleije',  rol:'Zaakvoerder — strategie' },
    { id:54513254, naam:'Arne Goetschalckx', rol:'Sales — nieuwe projecten' }
  ];
  // v2.2 #70: 90-min meeting slots in office hours, geen last-minute
  const SLOT_TEMPLATES = [
    { tijd: '10:00 – 11:30', startHour: 10 },
    { tijd: '14:00 – 15:30', startHour: 14 }
  ];
  const allBusy = (data.shoots || []).concat(data.shoots_27m || []).concat(data.vakantie || []);
  const now = Date.now();
  const startMs = now + (48 * 3600000); // +48u (geen vandaag/morgen)
  const horizonMs = now + (14 * 86400000);
  const bezetByHost = {};
  teamHosts.forEach(h => bezetByHost[h.id] = new Set());
  allBusy.forEach(t => {
    const due = parseInt(t.due_date || t.start_date, 10);
    if(!due || due < now || due > horizonMs) return;
    const day = new Date(due).toISOString().slice(0,10);
    (t.assignees || []).forEach(a => {
      if(bezetByHost[a.id]) bezetByHost[a.id].add(day);
    });
  });
  // Per host: bouw lijst van {dag, tijd, ts} slots (voor 4 dagen)
  const slotsByHost = teamHosts.map(h => {
    const slots = [];
    for(let d = Math.ceil(startMs / 86400000) * 86400000; d <= horizonMs && slots.length < 6; d += 86400000){
      const dt = new Date(d);
      const dow = dt.getDay();
      if(dow === 0 || dow === 6) continue;
      const dayKey = dt.toISOString().slice(0,10);
      if(bezetByHost[h.id].has(dayKey)) continue;
      SLOT_TEMPLATES.forEach(tpl => {
        if(slots.length >= 6) return;
        const slotDate = new Date(d);
        slotDate.setHours(tpl.startHour, 0, 0, 0);
        slots.push({ dag: dayKey, tijd: tpl.tijd, dateLabel: slotDate.toLocaleDateString('nl-BE',{weekday:'short',day:'2-digit',month:'short'}), dateLong: slotDate.toLocaleDateString('nl-BE',{weekday:'long',day:'numeric',month:'long'}) });
      });
    }
    return { ...h, slots };
  });
  return '<div class="s27-book-head">' +
    '<div><strong>📅 Eerstvolgende vrije momenten (1u30 meeting)</strong>' +
    '<span>Vanaf overmorgen — kies eerst je locatie-voorkeur, dan een tijdslot</span></div>' +
    '<button type="button" class="s27-book-close" id="s27-book-close" aria-label="Sluiten">×</button>' +
    '</div>' +
    '<div class="s27-meet-locchoice">' +
      '<label class="s27-meet-locopt"><input type="radio" name="s27-meet-loc" value="online" checked/><div><strong>💻 Online</strong><span>Google Meet — geen reistijd</span></div></label>' +
      '<label class="s27-meet-locopt"><input type="radio" name="s27-meet-loc" value="bij Studio 27"/><div><strong>🏢 Bij Studio 27</strong><span>Geel — koffie staat klaar</span></div></label>' +
    '</div>' +
    '<div class="s27-book-grid">' +
      slotsByHost.map(h => {
        const ontvKey = h.id === 48338421 ? 'ilke' : (h.id === 8714037 ? 'vincent' : 'arne');
        return `
        <div class="s27-book-host">
          <div class="s27-book-host-head">
            <strong>${esc(h.naam)}</strong>
            <span>${esc(h.rol)}</span>
          </div>
          ${h.slots.length
            ? '<div class="s27-book-slot-list">' + h.slots.map(s => {
                const baseSubject = 'Meeting-aanvraag met ' + h.naam + ' op ' + s.dateLong + ' om ' + s.tijd;
                return `<button type="button" class="s27-book-slot-time" data-dm="meeting" data-dm-ontvanger="${esc(ontvKey)}" data-dm-onderwerp="${esc(baseSubject + ' — online')}" data-dm-onderwerp-base="${esc(baseSubject)}" data-dm-placeholder="Bespreekonderwerp: &#10;Eventuele opmerkingen: ">
                  <span class="s27-book-slot-date">${esc(s.dateLabel)}</span>
                  <span class="s27-book-slot-time-val">${esc(s.tijd)}</span>
                </button>`;
              }).join('') + '</div>'
            : '<p class="s27-book-empty">Volgeboekt komende 2 weken — probeer een andere collega</p>'
          }
        </div>
      `;}).join('') +
    '</div>' +
    '<p class="s27-book-fallback">Of <a href="#" data-dm="meeting" data-dm-onderwerp="Meeting-aanvraag (vrij voorstel)">stuur ons een vrij voorstel</a>. Na bevestiging maken we een Google Calendar invite aan.</p>';
}

// Globale handler voor sluiten van booking slots
document.addEventListener('click', e => {
  if(e.target && e.target.id === 's27-book-close'){
    const box = $('s27-book-slots');
    if(box){ box.hidden = true; box.innerHTML = ''; }
  }
});

function renderMeetingCard(m){
  const d = m.datum_ms ? new Date(m.datum_ms) : null;
  const hasDate = !!d;
  // Compact 2-letter dag + dag-getal + maand 3-letter (past in date-block ZONDER overflow)
  const dayWeek = hasDate ? d.toLocaleDateString('nl-BE', {weekday:'short'}).slice(0,2).toUpperCase() : '';
  const dayNum  = hasDate ? d.getDate() : '?';
  const month   = hasDate ? d.toLocaleDateString('nl-BE', {month:'short'}).slice(0,3).toLowerCase() : '';
  const timeLabel = hasDate ? d.toLocaleTimeString('nl-BE', {hour:'2-digit', minute:'2-digit'}) : '';
  const link = ''; // ClickUp-link niet meer tonen — klanten werken niet in ClickUp
  const dateBlock = hasDate
    ? '<div class="s27-meeting-date"><span class="dw">' + esc(dayWeek) + '</span><strong>' + dayNum + '</strong><span class="dm">' + esc(month) + '</span></div>'
    : '<div class="s27-meeting-date s27-meeting-date-tbd"><strong>?</strong><span>nog te<br>bevestigen</span></div>';
  return '<div class="s27-meeting-card">' +
    dateBlock +
    '<div class="s27-meeting-body">' +
      '<div class="s27-meeting-title">' + esc(m.titel || 'Meeting') + '</div>' +
      (timeLabel ? '<div class="s27-meeting-time">⏰ ' + esc(timeLabel) + '</div>' : '') +
      (m.type ? '<div class="s27-meeting-type">' + esc(m.type) + '</div>' : '') +
      link +
    '</div>' +
  '</div>';
}

/* =================================================================
   PROJECT DETAIL MODAL
   ================================================================= */
async function openProjectDetail(taskId, openOnTab){
  if(!taskId) { console.warn('[Studio 27] openProjectDetail zonder taskId'); return; }
  if(!state.dashboard || !Array.isArray(state.dashboard.actieve_projecten)){
    console.error('[Studio 27] state.dashboard ontbreekt of heeft geen actieve_projecten');
    return;
  }
  const proj = state.dashboard.actieve_projecten.find(p => p.task_id === taskId);
  if(!proj){
    console.warn('[Studio 27] Project niet gevonden voor task_id:', taskId);
    return;
  }
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
    const wrap = document.querySelector('.s27-wrap');
    if(!wrap){
      console.error('[Studio 27] .s27-wrap niet gevonden — kan project view niet plaatsen');
      return;
    }
    wrap.appendChild(fsView);
  }
  fsView.hidden = false;
  fsView.innerHTML = '<div class="s27-loading">Project laden…</div>';

  // Parallel: project detail (v2 endpoint preferred, v1 fallback) + chat-list-comments
  const detailEndpoint = ENDPOINTS.projectDetailV2 || ENDPOINTS.projectDetail;
  const detailPromise = state.demoMode
    ? Promise.resolve(getDemoDetail(taskId, proj))
    : api(detailEndpoint, { task_id: taskId, bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token })
        .then(r => {
          if(!r.ok || !r.data) return { beschrijving:'', taken:[], deliverables:[] };
          if(r.data.error || r.data.ok === false) return { beschrijving:'', taken:[], deliverables:[] };
          // Normaliseer v2-shape naar wat renderProjectView verwacht
          return {
            beschrijving: r.data.beschrijving || '',
            taken: Array.isArray(r.data.taken) ? r.data.taken.map(t => ({
              naam: t.naam || '',
              status: (t.status || '').toLowerCase().replace(/\s+/g, '_'),
              status_label: t.status || '',
              status_color: t.status_color || '#cccccc',
              datum: t.datum ? new Date(parseInt(t.datum, 10)).toISOString() : '',
              link: t.url || ''
            })) : [],
            deliverables: r.data.deliverables || [],
            project_status: r.data.status || '',
            project_url: r.data.url || ''
          };
        });
  const chatPromise = (state.demoMode || !ENDPOINTS.chatList)
    ? Promise.resolve({ comments: [] })
    : api(ENDPOINTS.chatList, { task_id: taskId, bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token })
        .then(r => (r.ok && r.data && !r.data.error) ? r.data : { comments: [] });

  let detail, chat;
  try {
    [detail, chat] = await Promise.all([detailPromise, chatPromise]);
  } catch(err){
    console.error('[Studio 27] Detail/chat fetch failed:', err);
    detail = { beschrijving:'', taken:[], deliverables:[] };
    chat = { comments: [] };
  }
  detail = detail || { beschrijving:'', taken:[], deliverables:[] };
  detail.comments = (chat && chat.comments) || detail.comments || [];
  state.activeProjectDetail = detail;
  try {
    renderProjectView(proj, detail, needsFeedback);
  } catch(err){
    console.error('[Studio 27] renderProjectView crashed:', err, '\nproj=', proj, '\ndetail=', detail);
    const fsView = $('s27-tab-project');
    if(fsView){
      fsView.innerHTML = '<div style="padding:40px 20px;text-align:center;font-family:system-ui">' +
        '<h3 style="margin:0 0 10px;color:#991b1b">Project kon niet getoond worden</h3>' +
        '<p style="color:#7f1d1d;font-size:14px;margin:0 0 16px">Er ging iets mis bij het laden. Probeer opnieuw of mail naar ilke@studio27.be.</p>' +
        '<details style="text-align:left;max-width:600px;margin:0 auto;font-size:12px;color:#444"><summary>Technische details</summary>' +
        '<pre style="white-space:pre-wrap;background:#f8f8f8;padding:10px;border-radius:6px">' + esc(String(err && err.message || err)) + '</pre></details>' +
        '<button onclick="exitProjectView()" style="margin-top:20px;padding:10px 20px;background:#3083DC;color:#fff;border:none;border-radius:8px;cursor:pointer">← Terug naar projecten</button>' +
      '</div>';
    }
  }
}

// Discipline-accent mapping (DISCIPLINES const heeft alleen id+label+icon, geen accent)
const DISCIPLINE_ACCENTS = {
  video_fotografie: '#9441DB',
  webdesign:        '#12AC4E',
  branding:         '#F697CE',
  social:           '#3083DC',
  ads:              '#F66131',
  seo:              '#F8C028',
  opleiding:        '#6B5B6B',
  automation:       '#0D8A8A',
  strategie:        '#0D8A8A'
};

function getDisciplineInfo(disc){
  const found = Array.isArray(DISCIPLINES) ? DISCIPLINES.find(d => d.id === disc) : null;
  return {
    label: found ? found.label : (disc || '').replace(/_/g, ' '),
    accent: DISCIPLINE_ACCENTS[disc] || '#3083DC',
    icon: found ? found.icon : 's27p-spark'
  };
}

function renderProjectView(proj, detail, needsFeedback){
  const fsView = $('s27-tab-project');
  if(!fsView){ console.warn('[Studio 27] Project view container niet gevonden'); return; }
  const discipline = getDisciplineInfo(proj.discipline);
  const accent = discipline.accent;
  const discLabel = discipline.label;
  const statusKey = (proj.status || '').toLowerCase().replace(/\s+/g,'_');
  const statusLabel = proj.status_label || STATUS_LABELS[statusKey] || proj.status || '';
  const eta = computeETA(proj);
  const commentCount = (detail.comments || []).length;

  // v2.2 fix #51b: 1-kolom layout. Chat ALTIJD direct zichtbaar onder overzicht.
  // Feedback (indien nodig) bovenaan als prominente actie-banner — opent feedback panel.
  fsView.innerHTML = `
    <div class="s27-pv-head">
      <button class="s27-pv-back" id="s27-pv-back-btn"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M5 12h14M13 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Terug naar projecten</button>
      <div class="s27-pv-titlerow">
        <div style="flex:1; min-width:0">
          <span class="s27-pv-disc" style="--accent:${accent}">${esc(discLabel)}</span>
          <h2 class="s27-pv-title">${esc(proj.naam || 'Project')}</h2>
          <div class="s27-pv-meta">
            ${proj.opleverdatum ? `<span>📅 ${esc(fmtDate(proj.opleverdatum))}</span>` : ''}
            ${proj.type ? `<span>· ${esc(proj.type)}</span>` : ''}
            ${proj.laatst_geupdatet ? `<span>· laatst geüpdatet ${esc(fmtRelTime(proj.laatst_geupdatet))}</span>` : ''}
          </div>
          ${eta.label ? `<div class="s27-pv-eta" data-urgency="${esc(eta.urgency)}">${eta.icon} ${esc(eta.label)}</div>` : ''}
        </div>
        <div class="s27-pv-status-col">
          ${statusLabel ? `<span class="s27-projc-status" data-status="${esc(statusKey)}">${esc(statusLabel)}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="s27-pv-twocol">
      <div class="s27-pv-leftcol">
        ${needsFeedback ? `
          <div class="s27-pv-section s27-pv-section-fb">
            <h3 class="s27-pv-section-title">🔔 Dit project wacht op jouw feedback</h3>
            <p class="s27-pv-fb-lead">Bekijk de deliverables hieronder en geef per onderdeel aan of het goedgekeurd is of feedback nodig heeft.</p>
            <div id="s27-pv-fbbox"></div>
          </div>
        ` : ''}
        <div class="s27-pv-section">
          <h3 class="s27-pv-section-title">📋 Projectomschrijving</h3>
          <div class="s27-pv-overview">${renderOverzichtTab(proj, detail)}</div>
        </div>
      </div>

      <div class="s27-pv-section s27-pv-section-chat">
        <h3 class="s27-pv-section-title">💬 Chat met het team ${commentCount ? `<span class="s27-pv-tab-badge" style="margin-left:8px">${commentCount}</span>` : ''}</h3>
        <div id="s27-pv-chatbox" class="s27-pv-chatbox"></div>
      </div>
    </div>
  `;

  // Render chat in box (altijd zichtbaar)
  console.log('[Studio 27] renderProjectView: project=', proj.task_id, 'comments=', (detail.comments || []).length, 'needsFeedback=', needsFeedback);
  try {
    const chatBox = $('s27-pv-chatbox');
    if(!chatBox){
      console.error('[Studio 27] #s27-pv-chatbox container niet gevonden in DOM');
    } else {
      chatBox.innerHTML = renderChatTab(proj, detail);
      attachChatHandlers();
      // Auto-scroll naar nieuwste (onderkant) zoals WhatsApp/Slack
      setTimeout(() => {
        const thread = $('s27-chat-thread');
        if(thread) thread.scrollTop = thread.scrollHeight;
      }, 30);
      // Start polling voor real-time updates
      startChatPolling(proj.task_id);
    }
  } catch(e){
    console.error('[Studio 27] Chat render failed:', e);
    const chatBox = $('s27-pv-chatbox');
    if(chatBox) chatBox.innerHTML = '<div class="s27-form-error">Chat kon niet geladen worden (' + esc(String(e && e.message || e)) + '). <a href="#" data-dm="vraag" data-dm-onderwerp="Chat in dashboard werkt niet">Stuur ons een bericht</a>.</div>';
  }

  // Wire up handlers
  const back = $('s27-pv-back-btn');
  if(back) back.addEventListener('click', exitProjectView);

  // v2.2 #64: feedback widget renders DIRECT in linkerkolom — geen knop meer nodig
  if(needsFeedback){
    try {
      const fbBox = $('s27-pv-fbbox');
      if(fbBox){
        fbBox.innerHTML = renderFeedbackV2Tab(proj, detail);
        attachFeedbackV2Handlers();
      }
    } catch(e){
      console.error('[Studio 27] Feedback render failed:', e);
      const fbBox = $('s27-pv-fbbox');
      if(fbBox) fbBox.innerHTML = '<div class="s27-form-error">Feedback widget kon niet laden. <a href="#" data-dm="vraag" data-dm-onderwerp="Feedback widget probleem">Stuur ons een bericht</a>.</div>';
    }
  }
}

// renderProjectViewSideTab (oude 2-kolom helper) — niet meer gebruikt na 1-kolom refactor #53, verwijderd

/* =================================================================
   CHAT POLLING (v2.2 #58) — real-time team-reacties zonder webhooks
   ================================================================= */
let _chatPollTimer = null;
let _chatPollTaskId = null;

function startChatPolling(taskId){
  stopChatPolling();
  if(!taskId || !ENDPOINTS.chatList || state.demoMode) return;
  _chatPollTaskId = taskId;
  _chatPollTimer = setInterval(() => pollChatTick(taskId), 15000);
}

function stopChatPolling(){
  if(_chatPollTimer){ clearInterval(_chatPollTimer); _chatPollTimer = null; }
  _chatPollTaskId = null;
}

async function pollChatTick(taskId){
  // Stop als gebruiker niet meer in project view of andere taak heeft geopend
  if(state.viewMode !== 'project' || !state.activeProject || state.activeProject.task_id !== taskId){
    stopChatPolling();
    return;
  }
  // Pause als tab in background staat
  if(document.hidden) return;
  try {
    const res = await api(ENDPOINTS.chatList, { task_id: taskId, session_token: state.session.session_token });
    if(!res.ok || !res.data || !Array.isArray(res.data.comments)) return;
    const newComments = res.data.comments;
    const oldComments = (state.activeProjectDetail && state.activeProjectDetail.comments) || [];
    // Vergelijk: zijn er nieuwe id's?
    const oldIds = new Set(oldComments.map(c => c.id).filter(Boolean));
    const newOnes = newComments.filter(c => c.id && !oldIds.has(c.id));
    if(!newOnes.length) return;
    // Update state + re-render
    state.activeProjectDetail.comments = newComments;
    const chatBox = $('s27-pv-chatbox');
    if(chatBox){
      const wasAtBottom = chatScrollAtBottom();
      chatBox.innerHTML = renderChatTab(state.activeProject, state.activeProjectDetail);
      attachChatHandlers();
      // Highlight nieuwe berichten
      newOnes.forEach(c => {
        const el = chatBox.querySelector(`[data-comment-id="${c.id}"]`);
        if(el) el.classList.add('s27-chat-msg-new');
      });
      // Auto-scroll als gebruiker al onderaan zat
      if(wasAtBottom){
        const thread = $('s27-chat-thread');
        if(thread) thread.scrollTop = thread.scrollHeight;
      }
    }
  } catch(e){ /* silent fail — volgende tick probeert opnieuw */ }
}

function chatScrollAtBottom(){
  const thread = $('s27-chat-thread');
  if(!thread) return true;
  return (thread.scrollHeight - thread.scrollTop - thread.clientHeight) < 50;
}

function exitProjectView(){
  // Verberg fullscreen, toon normale tabs terug
  stopChatPolling();
  const fsView = $('s27-tab-project');
  if(fsView){ fsView.hidden = true; fsView.innerHTML = ''; }
  state.viewMode = 'dashboard';
  state.activeProject = null;
  state.activeProjectDetail = null;
  if(location.hash.startsWith('#/project/')){
    history.pushState('', document.title, window.location.pathname + window.location.search);
  }
  // Toon de actieve tab opnieuw
  const activeTab = state.activeTab || 'home';
  document.querySelectorAll('.s27-tabview').forEach(v => {
    if(v.id === 's27-tab-project') return;
    v.hidden = v.id !== ('s27-tab-' + activeTab);
  });
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
  // Sort: oudste BOVEN, nieuwste ONDER (zoals WhatsApp/Slack)
  const sorted = comments.slice().sort((a, b) => {
    const da = parseChatDate(a.datum);
    const db = parseChatDate(b.datum);
    return da - db;
  });
  // Groepeer per dag voor day-dividers
  const groups = groupChatByDay(sorted);
  const thread = sorted.length
    ? '<div class="s27-chat-thread" id="s27-chat-thread">' + groups.map(g =>
        `<div class="s27-chat-day-divider"><span>${esc(g.label)}</span></div>` +
        g.messages.map(renderChatMessage).join('')
      ).join('') + '</div>'
    : '<div class="s27-chat-empty"><div class="s27-chat-empty-icon">💬</div><strong>Start het gesprek</strong><p>Stel je vraag, wij antwoorden via dit kanaal. Je krijgt automatisch een notificatie.</p></div>';
  return thread +
    '<div class="s27-chat-compose">' +
      '<textarea id="s27-chat-input" placeholder="Typ je bericht voor het team…" rows="2"></textarea>' +
      '<div class="s27-chat-actions">' +
        '<label class="s27-chat-attach" for="s27-chat-file" title="Bestand toevoegen">' +
          '<svg width="14" height="14"><use href="#s27p-upload"/></svg> <span>Bestand</span>' +
        '</label>' +
        '<input id="s27-chat-file" type="file" multiple style="display:none">' +
        '<button class="s27-btn s27-btn-sm s27-btn-primary" id="s27-chat-send"><svg width="13" height="13" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor"/></svg> Versturen</button>' +
      '</div>' +
      '<ul id="s27-chat-files" class="s27-chat-files"></ul>' +
    '</div>';
}

function parseChatDate(d){
  if(!d) return 0;
  // ClickUp datum kan ms unix timestamp string zijn of ISO string
  const asNum = parseInt(d, 10);
  if(!isNaN(asNum) && asNum > 1000000000) return asNum;
  const t = new Date(d).getTime();
  return isNaN(t) ? 0 : t;
}

function groupChatByDay(messages){
  const groups = [];
  let currentDay = null;
  let currentGroup = null;
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const todayKey = today.toISOString().slice(0,10);
  const yesterdayKey = yesterday.toISOString().slice(0,10);
  messages.forEach(m => {
    const ts = parseChatDate(m.datum);
    const dayKey = ts ? new Date(ts).toISOString().slice(0,10) : 'onbekend';
    if(dayKey !== currentDay){
      currentDay = dayKey;
      let label = 'Eerder';
      if(dayKey === todayKey) label = 'Vandaag';
      else if(dayKey === yesterdayKey) label = 'Gisteren';
      else if(ts) label = new Date(ts).toLocaleDateString('nl-BE', {weekday:'long', day:'numeric', month:'long'});
      currentGroup = { label, messages: [] };
      groups.push(currentGroup);
    }
    currentGroup.messages.push(m);
  });
  return groups;
}

function renderChatMessage(c){
  const rawText = decodeMakeString(c.tekst || '');
  // v2.2 #65: detecteer klant-prefix + extract bedrijfsnaam (API account = "Vincent Verleije", maar dit is een klant-post)
  const klantMatch = rawText.match(/^💬 \[Klant: ([^\]]+)\]/);
  const isKlant = c.is_klant === true || !!klantMatch;
  const side = isKlant ? 'klant' : 'team';
  // Auteur: bij klant-post → bedrijfsnaam uit prefix. Bij team-post → user.username.
  const displayAuthor = isKlant && klantMatch ? klantMatch[1].trim() : (c.auteur || 'Studio 27');
  let cleanText = rawText.replace(/^💬 \[Klant: [^\]]+\]\s*/, '').trim();
  // v2.2 #65: chat-attachment scenario plaatst "📎 Bestand gedeeld: name\n{url}" in tekst — extract als attachment
  const inlineAttMatches = [];
  cleanText = cleanText.replace(/📎 Bestand gedeeld: ([^\n]+)\n(https:\/\/[^\s\n]+)/g, (m, fname, url) => {
    inlineAttMatches.push({ filename: fname.trim(), url: url.trim() });
    return '';
  }).trim();
  const allAtts = (c.attachments || []).concat(inlineAttMatches);
  // v2.2 #65: download-attribute → 1-klik download. Plus file-type icoon.
  const atts = allAtts.map(a => {
    const ext = ((a.filename || '').split('.').pop() || '').toLowerCase();
    const ico = ext === 'pdf' ? '📄' : (['jpg','jpeg','png','gif','webp','heic','svg'].includes(ext) ? '🖼️' : (['mp4','mov','avi'].includes(ext) ? '🎬' : (['ai','psd','eps'].includes(ext) ? '🎨' : (['ttf','otf','woff','woff2'].includes(ext) ? '🔤' : '📎'))));
    return '<a class="s27-chat-att" href="' + esc(a.url || '#') + '" download="' + esc(a.filename || 'bestand') + '" target="_blank" rel="noopener" title="Download ' + esc(a.filename || 'bestand') + '">' + ico + ' <span>' + esc(a.filename || 'bestand') + '</span><svg width="11" height="11" viewBox="0 0 24 24" style="flex-shrink:0"><path fill="currentColor" d="M5 20h14v-2H5v2zM12 2v12l4-4 1.4 1.4L12 17l-5.4-5.6L8 10l4 4V2h0z"/></svg></a>';
  }).join('');
  const likeKey = 's27_like_' + (c.id || '');
  const isLiked = c.id ? (localStorage.getItem(likeKey) === '1') : false;
  const ts = parseChatDate(c.datum);
  const timeStr = ts ? new Date(ts).toLocaleTimeString('nl-BE', {hour:'2-digit', minute:'2-digit'}) : '';
  // Initialen: 1-2 letters (Vincent Verleije → VV, TEST CLIENT BV → TC)
  const initials = displayAuthor.split(/\s+/).filter(w => /[A-Za-zÀ-ÿ]/.test(w)).slice(0,2).map(w => w[0].toUpperCase()).join('') || '?';
  return '<div class="s27-chat-msg s27-chat-msg-' + side + '" data-comment-id="' + esc(c.id || '') + '">' +
    '<div class="s27-chat-avatar">' + esc(initials) + '</div>' +
    '<div class="s27-chat-bubble">' +
      '<div class="s27-chat-head"><strong>' + esc(displayAuthor) + '</strong>' + (timeStr ? '<span>' + esc(timeStr) + '</span>' : '') + '</div>' +
      (cleanText ? '<div class="s27-chat-body">' + esc(cleanText).replace(/\n/g,'<br>') + '</div>' : '') +
      (atts ? '<div class="s27-chat-atts">' + atts + '</div>' : '') +
      '<div class="s27-chat-msg-actions">' +
        (c.id ? '<button class="s27-chat-react' + (isLiked ? ' is-liked' : '') + '" data-action="like" data-cid="' + esc(c.id) + '" aria-label="Bericht liken">👍</button>' : '') +
        '<button class="s27-chat-react" data-action="reply" data-author="' + esc(displayAuthor) + '" aria-label="Reageren">↩</button>' +
      '</div>' +
    '</div>' +
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
      send.disabled = true; send.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor"/></svg> Versturen…';
      const optimisticAttachments = [];
      try {
        // v2.2 #57: heb je bestanden? Upload elk via chat-attachment scenario (uploadt + post comment in 1)
        if(pending.length && ENDPOINTS.chatAttachment){
          for(const f of pending){
            try {
              const res = await api(ENDPOINTS.chatAttachment, {
                task_id: state.activeProject.task_id,
                bedrijf_id: state.session.bedrijf_id,
                session_token: state.session.session_token,
                klant_naam: state.session.bedrijfsnaam,
                filename: f.filename,
                data: f.data,
                comment_text: text || ''
              });
              if(res.ok && res.data && res.data.ok && res.data.attachment_url){
                optimisticAttachments.push({ filename: res.data.filename || f.filename, url: res.data.attachment_url });
              }
            } catch(err){ console.warn('[Studio 27] chat-attachment failed for', f.filename, err); }
          }
        }
        // Tekst-only of als pending leeg en text bestaat: gewone chat-post
        if(text && !pending.length && ENDPOINTS.chatPost){
          await api(ENDPOINTS.chatPost, {
            task_id: state.activeProject.task_id,
            bedrijf_id: state.session.bedrijf_id,
            session_token: state.session.session_token,
            klant_naam: state.session.bedrijfsnaam,
            comment_text: text
          });
        }
      } catch(e){ console.error('[Studio 27] chat send failed:', e); }

      send.disabled = false;
      send.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor"/></svg> Versturen';
      input.value = '';
      filesList.innerHTML = '';
      pending.length = 0;
      // Optimistisch toevoegen aan thread (zo lijkt het direct verstuurd)
      const newMsg = {
        id: 'optimistic-' + Date.now(),
        auteur: state.session.bedrijfsnaam,
        is_klant: true,
        tekst: text || (optimisticAttachments.length ? '📎 ' + optimisticAttachments.map(a => a.filename).join(', ') : ''),
        datum: new Date().toISOString(),
        attachments: optimisticAttachments
      };
      state.activeProjectDetail.comments = (state.activeProjectDetail.comments || []).concat([newMsg]);
      const chatBox = $('s27-pv-chatbox');
      if(chatBox){
        chatBox.innerHTML = renderChatTab(state.activeProject, state.activeProjectDetail);
        attachChatHandlers();
        const thread = $('s27-chat-thread');
        if(thread) thread.scrollTop = thread.scrollHeight;
      } else if(typeof renderProjectModalTab === 'function' && $('s27-modaltab-content')){
        renderProjectModalTab('chat');
      }
    });
  }
  // v2.2 #39: Like + Reply handlers
  document.querySelectorAll('.s27-chat-react[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const action = btn.dataset.action;
      if(action === 'like'){
        const cid = btn.dataset.cid;
        const key = 's27_like_' + cid;
        const isLiked = localStorage.getItem(key) === '1';
        try {
          if(isLiked){
            localStorage.removeItem(key);
            btn.classList.remove('is-liked');
          } else {
            localStorage.setItem(key, '1');
            btn.classList.add('is-liked');
            // Subtle bounce-animation
            btn.style.animation = 's27like .3s var(--ease-out)';
            setTimeout(() => { try { btn.style.animation = ''; } catch(e){} }, 320);
          }
        } catch(err){}
      } else if(action === 'reply'){
        const author = btn.dataset.author || '';
        const inputEl = $('s27-chat-input');
        if(inputEl){
          const mention = '@' + (author.split(' ')[0] || 'team') + ' ';
          inputEl.value = mention + inputEl.value;
          inputEl.focus();
          inputEl.setSelectionRange(mention.length, mention.length);
          inputEl.scrollIntoView({behavior:'smooth', block:'nearest'});
        }
      }
    });
  });
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
      // v2.1 — scope bedrijf gaat naar nieuw bedrijfUpload endpoint (native uploadTaskAttachment)
      // scope algemeen blijft v1 uploadAlg (Drive integratie)
      const endpoint = (scope === 'bedrijf' && ENDPOINTS.bedrijfUpload) ? ENDPOINTS.bedrijfUpload : ENDPOINTS.uploadAlg;
      const res = await api(endpoint, {
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
        updateUploadRow(li, 'done', 'Geüpload ✓');
        // v2.2 #59 + #68: surgical flat-list update zonder hele tab re-render
        if(scope === 'bedrijf' && state.bedrijfContent){
          if(!Array.isArray(state.bedrijfContent.attachments)) state.bedrijfContent.attachments = [];
          state.bedrijfContent.attachments.push({
            filename: filenameWithCat,
            url: (res.data && res.data.url) || '',
            uploaded_by: 'klant',
            uploaded_at: String(Date.now()),
            size: f.size
          });
          refreshFilesFlat();
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