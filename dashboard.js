(function(){
'use strict';

/* =================================================================
   CONFIG
   ================================================================= */
const ENDPOINTS = {
  login:        'https://hook.eu1.make.com/gk7fxusnnrwkyfhcpyup8w39ygoz5m5u',
  dashboard:    'https://hook.eu1.make.com/q1hklcvhum7m14ie57p6t6ci7l6un48e',
  projectDetail:'https://hook.eu1.make.com/1mmhcsa0sie22po3kbwcx423dakidc44',
  calendar:     'https://hook.eu1.make.com/5e1chj9seh9jlw7nejhytwjg66i7vzyd',
  uploadProject:'https://hook.eu1.make.com/rk5ui1ueb4j42hiqye8dfzfmka0gf318',
  uploadAlg:    'https://hook.eu1.make.com/hyf7ejtbskq743d56nveucv9xto5yo8c'
};
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
  // Persoonlijke begroeting in hero
  const greetingName = firstNameFromCompany(d.klant && d.klant.bedrijfsnaam);
  const heroTitle = $('s27-hero-title');
  if(heroTitle) heroTitle.innerHTML = '<span class="greeting">Hey ' + esc(greetingName) + ',</span>Alles wat we voor jou <span class="accent">aan het doen</span> zijn';

  const body = $('s27-dash-body');
  const allProjecten = d.actieve_projecten || [];
  const filtered = allProjecten.filter(p => matchesStatusFilter(p, state.statusFilter));
  const projectenByDisc = groupBy(filtered, p => p.discipline);
  const aantalDisciplines = Object.keys(projectenByDisc).length;

  // Count per filter voor chip badges
  const counts = {};
  STATUS_FILTERS.forEach(f => { counts[f.id] = allProjecten.filter(p => matchesStatusFilter(p, f.id)).length; });

  const statsHtml = renderStats(d.stats, allProjecten.length, aantalDisciplines);
  const filterbarHtml = renderFilterBar(counts);
  const disciplinesHtml = renderDisciplines(projectenByDisc);
  const meetingsHtml = renderMeetings(d.aankomende_meetings || []);
  const contactHtml = renderContact(d.contact || {});

  body.innerHTML = `
    <div class="s27-section">${statsHtml}</div>

    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Lopende projecten <span class="count">${allProjecten.length}</span></h2>
          <p class="s27-section-sub">Filter op wat voor jou relevant is.</p>
        </div>
      </div>
      ${filterbarHtml}
      ${disciplinesHtml}
    </div>

    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Aankomende meetings <span class="count">${(d.aankomende_meetings||[]).length}</span></h2>
          <p class="s27-section-sub">Wat staat er gepland tussen jou en het Studio 27-team?</p>
        </div>
      </div>
      ${meetingsHtml}
    </div>

    <div class="s27-section" id="contact">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Jouw aanspreekpunt</h2>
          <p class="s27-section-sub">Vragen, ideeën of even sparren? Eén klik en je staat in contact.</p>
        </div>
      </div>
      ${contactHtml}
    </div>
  `;

  attachDashboardHandlers();
  $('s27-updated').textContent = 'Bijgewerkt om ' + new Date().toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'});
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

function renderContact(c){
  const initials = getInitials(c.am_naam);
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
  // project klik
  document.querySelectorAll('.s27-proj').forEach(el => {
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
function renderBedrijfTab(){
  renderPlaceholderTab('s27-bedrijf-body', 'Mijn bedrijfsgegevens (binnenkort)',
    'Hier komt jouw huisstijl-content: logo\'s, fonts, brand-bestanden + algemene voorkeuren in tekst. Alles wat hier staat geldt voor àl je projecten.');
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

/* =================================================================
   PROJECT DETAIL MODAL
   ================================================================= */
async function openProjectDetail(taskId){
  if(!taskId) return;
  const modal = $('s27-modal');
  const proj = state.dashboard.actieve_projecten.find(p => p.task_id === taskId);
  if(!proj) return;
  const meta = discMeta(proj.discipline);
  $('s27-modal-title').textContent = proj.naam || 'Project';
  $('s27-modal-sub').textContent = meta.label + ' · ' + (proj.status_label || STATUS_LABELS[(proj.status||'').toLowerCase()] || 'In productie');
  $('s27-modal-body').innerHTML = '<div class="s27-loading">Detail laden</div>';
  $('s27-modal-foot').innerHTML = '';
  modal.classList.add('open');

  let detail;
  if(state.demoMode) {
    detail = getDemoDetail(taskId, proj);
  } else {
    const res = await api(ENDPOINTS.projectDetail, { task_id: taskId, bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token });
    if(!res.ok || !res.data || res.data.error){
      $('s27-modal-body').innerHTML = '<div class="s27-error">Kon dit project niet laden. Mail naar <a href="mailto:ilke@studio27.be">ilke@studio27.be</a> als dit blijft gebeuren.</div>';
      return;
    }
    detail = res.data;
  }
  renderProjectDetail(proj, detail);
}

function renderProjectDetail(proj, detail){
  const taken = detail.taken || detail.subtasks || [];
  const comments = detail.comments || [];

  const timelineHtml = taken.length ? `<div class="s27-tline">${taken.map(t => {
    const stKey = (t.status || 'to_do').toLowerCase().replace(/\s+/g,'_');
    const stLabel = STATUS_LABELS[stKey] || t.status || 'Gepland';
    return `<div class="s27-tline-item" data-state="${esc(stKey)}">
      <div class="s27-tline-name">${esc(t.naam)}</div>
      <div class="s27-tline-meta">${esc(stLabel)}${t.datum ? ' · ' + esc(fmtDate(t.datum)) : ''}${t.update ? ' · ' + esc(t.update) : ''}</div>
      ${t.link ? `<a class="s27-tline-link" href="${esc(t.link)}" target="_blank" rel="noopener"><svg width="11" height="11"><use href="#s27p-link"/></svg> Open</a>` : ''}
    </div>`;
  }).join('')}</div>` : '';

  const commentsHtml = comments.length ? `
    <h3 style="font-family:var(--font-display);font-size:13px;font-weight:800;color:var(--s27-ink);margin:24px 0 12px;letter-spacing:0.02em;text-transform:uppercase">Laatste updates van het team</h3>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${comments.slice(0,5).map(c => `<div style="padding:12px 14px;background:var(--s27-paper-2);border-left:3px solid var(--s27-blue);border-radius:8px">
        <div style="font-family:var(--font-display);font-size:11px;font-weight:700;color:var(--s27-ink-3);margin-bottom:4px">${esc(c.auteur||'Studio 27')} · ${esc(fmtRelTime(c.datum))}</div>
        <div style="font-family:var(--font-body);font-size:13px;color:var(--s27-ink-2);line-height:1.5;white-space:pre-wrap">${esc(c.tekst||'')}</div>
      </div>`).join('')}
    </div>
  ` : '';

  $('s27-modal-body').innerHTML = `
    ${detail.beschrijving ? `<p style="font-family:var(--font-body);font-size:14px;color:var(--s27-ink-2);line-height:1.6;margin:0 0 22px">${esc(detail.beschrijving)}</p>` : ''}
    <h3 style="font-family:var(--font-display);font-size:13px;font-weight:800;color:var(--s27-ink);margin:0 0 12px;letter-spacing:0.02em;text-transform:uppercase">Tijdlijn</h3>
    ${timelineHtml || '<p style="font-family:var(--font-body);font-size:13px;color:var(--s27-ink-3)">Tijdlijn wordt binnenkort zichtbaar.</p>'}
    ${commentsHtml}
  `;

  const stKey = (proj.status||'').toLowerCase().replace(/\s+/g,'_');
  const needsFeedback = stKey === 'doorgestuurd' || proj.feedback_link;
  $('s27-modal-foot').innerHTML = `
    ${needsFeedback ? `<a href="${esc(proj.feedback_link || (FEEDBACK_BASE_URL + '?taskId=' + proj.task_id))}" target="_blank" rel="noopener" class="s27-btn" style="text-decoration:none">Geef nu je feedback</a>` : ''}
    <button type="button" class="s27-btn" style="background:var(--s27-paper);color:var(--s27-ink);border:1.5px solid var(--s27-line)" id="s27-modal-cancel">Sluiten</button>
  `;
  const cancel = $('s27-modal-cancel');
  if(cancel) cancel.addEventListener('click', closeModal);
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
async function handleFiles(fileList){
  const files = Array.from(fileList || []);
  for(const f of files){
    if(f.size > MAX_FILE_BYTES){
      addUploadRow(f.name, 'error', 'Te groot (max 5 MB)');
      continue;
    }
    const li = addUploadRow(f.name, 'uploading', bytes(f.size));
    try {
      const b64 = await fileToBase64(f);
      const res = await api(ENDPOINTS.uploadAlg, {
        bedrijf_id: state.session.bedrijf_id,
        session_token: state.session.session_token,
        filename: f.name,
        size: f.size,
        type: f.type,
        data: b64,
        klant_naam: state.session.bedrijfsnaam
      });
      if(res.ok && (!res.data || !res.data.error)) updateUploadRow(li, 'done', 'Geüpload');
      else updateUploadRow(li, 'error', 'Mislukt');
    } catch(e){ updateUploadRow(li, 'error', 'Mislukt'); }
  }
  const input = $('s27-up-input'); if(input) input.value = '';
}
function addUploadRow(name, state, status){
  const ul = $('s27-up-list'); if(!ul) return null;
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