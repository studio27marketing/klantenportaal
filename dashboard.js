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
  meetingAvailability:'https://hook.eu1.make.com/s4tuw763p9x4dc7o8n1h9sm48vhs77rb',
  // v3 — AI Status Bot (folder 348572, scenario 5946454). Beantwoordt projectvragen, escaleert via DM.
  aiStatusBot:       'https://hook.eu1.make.com/3uor4cy6vmhe77sh2uvujg9iufoewj3u',
  // v3 — PandaDoc prijslijst (scenario 5946435). Stap 2 nieuw-project: kostprijs-detail.
  pandadocPricelist: 'https://hook.eu1.make.com/uw2974b7b2yurygsgcn2i97x4lh9h86e',
  // Bestaand werkend booking-systeem (read-only hergebruik via CORS *)
  shootAvailability: 'https://hook.eu1.make.com/c1aekp5r567tqvgvp4e2a4juu3npanap',
  // v3.1-6 — Huisstijl-bibliotheek op Google Drive (s27-drive). list/upload/delete via service-account.
  huisstijlList:     'https://hook.eu1.make.com/v3z3t67otw7d96s37qciedt3uykimiru',
  huisstijlUpload:   'https://hook.eu1.make.com/3eqyxbkejfhyz8w2kl62lp1lsxwfr2d0',
  huisstijlDelete:   'https://hook.eu1.make.com/irpo6iemme6qpfe75rr83brkj7ybftsd',
  // v3.1-6 — find-or-create Drive-structuur (nieuwe klanten krijgen automatisch een map + Huisstijl-submap)
  driveEnsure:       'https://hook.eu1.make.com/cy5n1y0377ovy2yso5f4dev1n792u71k',
  // v3.1-7 — Facturatiegegevens opslaan (schrijft direct naar Bedrijven-taak custom fields)
  facturatieSave:    'https://hook.eu1.make.com/41635fjyidjts4hlixkgxcsmo6apoe02',
  // v3.1-7 deel B — Per-project facturatie-bevestiging bij goedkeuring (schrijft naar projecttaak-veld 42a0fd8e)
  projectFacturatieSave: 'https://hook.eu1.make.com/cmqf97ej6aewxokt9g23tbff6gxg7frm',
  // v3 Feature 1 — Performance Dashboard. mode=list → rapporten per bedrijf; mode=data&task_id=… → volledige rapport-JSON (via custom s27fetch-app, gzip-proof). Scenario 5964345.
  performance:       'https://hook.eu1.make.com/chmsfitxr12m8cpjp4x3fb8ru1nqr7gg'
};

/* ===== AUTH v2 (Firebase + Cloudflare-gateway) — alleen actief achter ?auth=v2
   of localStorage s27_auth_v2=1. Raakt de bestaande gedeelde-code-login NIET.
   Zie AUTH_UPGRADE_PLAN.md. ===== */
// CUTOVER 01-06: de nieuwe Firebase-login (2FA + gateway) is nu de DEFAULT voor iedereen.
// Het portaal is nog niet in klantgebruik, dus geen migratie nodig. Fallback naar de oude
// gedeelde-code-login kan via ?auth=v1 (vangnet tijdens testen).
const AUTH_V2 = !/[?&]auth=v1(?:&|$)/.test(location.search);
const GATEWAY_BASE = 'https://s27-portal-gateway.studio27marketing.workers.dev';
// JIT-provisioning (Deel B): eerste login zonder bedrijf-koppeling → Make zoekt het bedrijf
// op via het ClickUp-veld "Portaal-toegang" en zet de koppeling. Zie MODULES_EN_TOEGANG_PLAN.md.
const PROVISION_URL = 'https://hook.eu1.make.com/hjmc9k1w9ry027kom3rfiwci9pejub78';
const ENDPOINT_KEYS = Object.keys(ENDPOINTS).reduce(function(m, k){ m[ENDPOINTS[k]] = k; return m; }, {});
const AUTH_JS_URL = (function(){
  try {
    var sc = document.querySelector('script[data-s27-portal-js]');
    if (sc && sc.src) return sc.src.replace(/dashboard\.js(\?.*)?$/, 'auth.js');
  } catch(e){}
  return 'https://raw.githack.com/studio27marketing/klantenportaal/main/auth.js';
})();

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
    btw: 'BE0123.456.789',
    facturatie_email: 'facturen@testclient.be',
    facturatie_opmerkingen: 'PO-nummer PO-2026-001 vermelden op elke factuur',
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

// v3.1-5: project-categorie bepaalt in welke tab een project hoort.
// deliverable = feedback/goedgekeurd-flow (Projecten-tab). doorlopend = retainer, werkt anders (Doorlopend-tab). opleiding = eigen tab.
const DISC_CATEGORY = {
  webdesign:'deliverable', branding:'deliverable', video_fotografie:'deliverable', strategie:'deliverable', automation:'deliverable',
  social:'doorlopend', ads:'doorlopend', seo:'doorlopend',
  opleiding:'opleiding'
};
function disciplineCategory(disc){ return DISC_CATEGORY[disc] || 'deliverable'; }
function projectsInCategory(d, cat){ return ((d && d.actieve_projecten) || []).filter(p => disciplineCategory(p.discipline) === cat); }

/* =================================================================
   DESIGN-SYSTEM: canonieke tak→kleur (de "bijbel", colors_and_type.css)
   Strategie=blauw · Branding=roze · Video&fotografie=paars ·
   Website&SEO/GEO=groen · Online adverteren=oranje · Social media=geel.
   Eén bron van waarheid — overal (hub, tabs, status-chips) hieruit putten.
   ================================================================= */
const DISC_COLOR = {
  strategie:'#3083DC', branding:'#F697CE', video_fotografie:'#9441DB',
  webdesign:'#12AC4E', seo:'#12AC4E', ads:'#F66131', social:'#F8C028',
  opleiding:'#5B6CFF', automation:'#230F23', performance:'#9441DB'
};
function discColor(id){ return DISC_COLOR[id] || '#3083DC'; }

// De ECHTE merk-stempels uit het design system (/assets/, kleur zit in de SVG zelf).
// SEO = "Website en SEO" → dezelfde groene web-stempel (zo staat het in de bijbel).
const STAMP_FILE = {
  strategie:'icon-strategie.svg', branding:'icon-branding-heart.svg',
  video_fotografie:'icon-video-fotografie.svg', webdesign:'icon-webdesign.svg',
  seo:'icon-webdesign.svg', ads:'icon-adverteren.svg', social:'icon-socialmedia.svg',
  opleiding:'sparkles-blue.svg'
};
function stampSrc(disc){ const f = STAMP_FILE[disc]; return f ? (s27AssetBase() + '/assets/' + f) : ''; }
function discStampImg(disc, size){
  const src = stampSrc(disc); size = size || 52;
  return src ? '<img class="s27-stamp" src="' + esc(src) + '" alt="" width="' + size + '" height="' + size + '" loading="lazy">' : '';
}
// Is een tak vergrendeld voor deze klant? (voor nav-zichtbaarheid)
function isDiscLocked(disc){
  const h = DISCIPLINE_HUB.find(x => x.disc === disc);
  if(!h || !state.dashboard) return false;
  return disciplineState(state.dashboard, h) === 'locked';
}
// Vul de discipline-nav-items met hun echte mini-merkstempel.
function injectNavStamps(){
  document.querySelectorAll('.s27-navstamp[data-disc]').forEach(el => {
    if(el.getAttribute('data-filled')) return;
    const src = stampSrc(el.getAttribute('data-disc'));
    if(src){ el.innerHTML = '<img src="' + esc(src) + '" alt="" width="18" height="18" loading="lazy">'; el.setAttribute('data-filled', '1'); }
  });
}

/* De 8 klant-zichtbare takken voor de "Onze diensten voor jou"-hub.
   moduleKey = sleutel in de dashboard-feed `modules` + ClickUp-label.
   targetTab = waar een actieve tak naartoe deeplinkt.
   teaser    = verleidelijke FOMO-copy voor een nog-niet-actieve tak. */
const DISCIPLINE_HUB = [
  { disc:'strategie',        moduleKey:'strategie',   targetTab:'projecten',    icon:'s27p-strat', label:'Strategie',          teaser:'Een scherpe strategie als fundament — ontdek waar groei voor jou zit.' },
  { disc:'branding',         moduleKey:'branding',    targetTab:'projecten',    icon:'s27p-brand', label:'Branding',           teaser:'Een merk dat blijft plakken — ontdek wat sterke branding voor je doet.' },
  { disc:'video_fotografie', moduleKey:'video_fotografie', targetTab:'projecten', icon:'s27p-cam', label:'Video & fotografie', teaser:'Beeld dat blijft hangen — laat ons jouw verhaal in beeld brengen.' },
  { disc:'webdesign',        moduleKey:'webdesign',   targetTab:'projecten',    icon:'s27p-web',   label:'Webdesign',          teaser:'Een website die verkoopt — ontdek wat we voor je kunnen bouwen.' },
  { disc:'seo',              moduleKey:'seo',         targetTab:'seo',          icon:'s27p-seo',   label:'SEO & GEO',          teaser:'Bovenaan in Google én in AI-antwoorden — ontdek je vindbaarheid.' },
  { disc:'ads',              moduleKey:'ads',         targetTab:'ads',          icon:'s27p-ads',   label:'Online adverteren',  teaser:'Meer klanten via gerichte advertenties — ontdek wat adverteren oplevert.' },
  { disc:'social',           moduleKey:'socials',     targetTab:'socials',      icon:'s27p-soc',   label:'Social media',       teaser:'Elke dag zichtbaar bij je doelpubliek — laat ons je socials dragen.' },
  { disc:'opleiding',        moduleKey:'opleidingen', targetTab:'opleidingen',  icon:'s27p-opl',   label:'Opleidingen',        teaser:'Je team sterker maken — ontdek onze opleidingen en workshops.' }
];

// Bepaalt of een tak voor deze klant ACTIEF of GELOCKED (teaser) is.
// Voorrang: expliciete feed-vlag > inferentie (heeft de klant er projecten in?).
// Zo werkt het nu al (inferentie) én exact zodra de feed alle 8 vlaggen stuurt.
function disciplineState(d, h){
  const m = d && d.modules;
  if(m && typeof m === 'object' && typeof m[h.moduleKey] === 'boolean'){
    return m[h.moduleKey] ? 'active' : 'locked';
  }
  const projs = ((d && d.actieve_projecten) || []).concat((d && d.historie_3mnd) || []);
  const heeft = projs.some(p => p.discipline === h.disc);
  return heeft ? 'active' : 'locked';
}
function disciplineCount(d, disc){
  const projs = (d && d.actieve_projecten) || [];
  const n = projs.filter(p => p.discipline === disc && !isAfgerondStatus(p)).length;
  return n;
}
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
  if (AUTH_V2) return apiV2(url, payload);
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

// AUTH v2: route elke api()-call via de Cloudflare-gateway met het Firebase ID-token.
// bedrijf_id wordt server-side door de gateway gezet; session_token uit payload wordt genegeerd.
async function apiV2(url, payload){
  try {
    const key = ENDPOINT_KEYS[url];
    if(!key) return { ok:false, status:0, error:'onbekend endpoint: ' + url };
    const token = window.S27Auth ? await window.S27Auth.token() : null;
    if(!token){ if(state && state.session) handleSessionExpired('Niet ingelogd.'); return { ok:false, status:401 }; }
    const r = await fetch(GATEWAY_BASE + '/' + key, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token },
      body: JSON.stringify(payload || {})
    });
    const t = await r.text();
    let parsed;
    try { parsed = { ok:r.ok, status:r.status, data:JSON.parse(t) }; }
    catch { parsed = { ok:r.ok, status:r.status, data:{ _raw:t } }; }
    // Deel B — JIT-provisioning: ingelogd maar nog geen bedrijf-koppeling → koppel via Make,
    // vernieuw het token (nieuwe bedrijf_id-claim) en herprobeer de call exact één keer.
    if(parsed.status === 403 && parsed.data && parsed.data.error === 'no_company_link' && !state._provisionTried){
      state._provisionTried = true;
      const linked = await tryProvision(token);
      if(linked){
        const fresh = (window.S27Auth ? await window.S27Auth.token(true) : token) || token;
        const r2 = await fetch(GATEWAY_BASE + '/' + key, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + fresh },
          body: JSON.stringify(payload || {})
        });
        const t2 = await r2.text();
        try { return { ok:r2.ok, status:r2.status, data:JSON.parse(t2) }; }
        catch { return { ok:r2.ok, status:r2.status, data:{ _raw:t2 } }; }
      }
    }
    if(parsed.status === 401 && state && state.session){ handleSessionExpired(parsed.data && parsed.data.message); }
    return parsed;
  } catch(e){ return { ok:false, status:0, error:e.message }; }
}

// Deel B — koppel het ingelogde account aan een bedrijf via het Make portal-provision-scenario.
// Stuurt het Firebase ID-token (Make verifieert het server-side via Firebase + zoekt de bedrijven
// op in ClickUp). Body = application/x-www-form-urlencoded: dat is een CORS-"simple" content-type
// (dus GEEN preflight op de Make-webhook) ÉN Make parset er de velden uit (text/plain deed dat niet
// → idToken kwam leeg binnen → lege e-mail; dat was de bug).
// Multi-bedrijf: provision geeft ALLE bedrijven voor de e-mail terug + zet de claim op het gekozen
// (of eerste) bedrijf. selectedBid kiest welk bedrijf actief wordt (Make verifieert toegang).
// Parse de provision-respons "id::Naam|id::Naam" → [{id, naam}].
function zipCompanies(combined){
  return String(combined || '').split('|').filter(Boolean).map(function(row){
    const idx = row.indexOf('::');
    const id = idx >= 0 ? row.slice(0, idx) : row;
    const naam = idx >= 0 ? row.slice(idx + 2) : 'Bedrijf';
    return { id: id.trim(), naam: (naam || 'Bedrijf').trim() };
  });
}
async function provisionFetch(token, selectedBid){
  try {
    const r = await fetch(PROVISION_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: 'idToken=' + encodeURIComponent(token) + '&selected_bedrijf_id=' + encodeURIComponent(selectedBid || '')
    });
    const d = await r.json().catch(function(){ return {}; });
    if(d && d.ok){
      state.portalCompanies = zipCompanies(d.companies);
      state.activeBedrijf = d.bedrijf_id || '';
      try { if(d.bedrijf_id) localStorage.setItem('s27_active_bedrijf', d.bedrijf_id); } catch(e){}
    }
    return d || {};
  } catch(e){ return {}; }
}
function lastSelectedBedrijf(){ try { return localStorage.getItem('s27_active_bedrijf') || ''; } catch(e){ return ''; } }
async function tryProvision(token){
  const d = await provisionFetch(token, lastSelectedBedrijf());
  return !!(d && d.ok && d.bedrijf_id);
}
// Bij login: koppel + haal de bedrijvenlijst (voor de switcher) + forceer een verse claim.
async function loadCompaniesAndLink(){
  try {
    const token = window.S27Auth ? await window.S27Auth.token() : null;
    if(!token) return;
    const d = await provisionFetch(token, lastSelectedBedrijf());
    if(d && d.ok && window.S27Auth) { await window.S27Auth.token(true); }
  } catch(e){}
}
// Bedrijf-switcher in de topbalk — enkel zichtbaar bij >1 bedrijf.
function renderCompanySwitcher(){
  const host = document.querySelector('.s27-topbar-left');
  if(!host) return;
  let el = document.getElementById('s27-company-switch');
  const comps = state.portalCompanies || [];
  if(comps.length < 2){ if(el) el.remove(); return; }
  if(!el){
    el = document.createElement('select');
    el.id = 's27-company-switch';
    el.title = 'Wissel van bedrijf';
    el.style.cssText = 'margin-left:14px;padding:7px 28px 7px 11px;border:1px solid var(--s27-line,#e7e2e8);border-radius:10px;background:#fff;font:600 13px/1 var(--font-body,system-ui);color:var(--s27-ink,#2a1f2b);cursor:pointer;max-width:240px';
    el.addEventListener('change', function(){ switchCompany(el.value); });
    host.appendChild(el);
  }
  el.innerHTML = comps.map(function(c){ return '<option value="' + esc(c.id) + '"' + (c.id === state.activeBedrijf ? ' selected' : '') + '>' + esc(c.naam) + '</option>'; }).join('');
}
async function switchCompany(id){
  if(!id || id === state.activeBedrijf) return;
  try { localStorage.setItem('s27_active_bedrijf', id); } catch(e){}
  const token = window.S27Auth ? await window.S27Auth.token() : null;
  if(!token) return;
  const upd = $('s27-updated'); if(upd) upd.textContent = 'Wisselen…';
  const d = await provisionFetch(token, id);
  if(d && d.ok){
    if(window.S27Auth) await window.S27Auth.token(true);   // verse claim met het nieuwe bedrijf
    state._provisionTried = false;
    loadDashboard();
    renderCompanySwitcher();
  }
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
  // AI-bot verbergen op login
  const fab = $('s27-bot-fab'), panel = $('s27-bot-panel');
  if(fab) fab.style.display = 'none';
  if(panel) panel.setAttribute('aria-hidden', 'true');
}
function showDashboard(){
  $('s27-login-view').style.display = 'none';
  $('s27-dash-view').style.display = 'block';
  // AI Status Bot beschikbaar maken (eenmalig injecteren, daarna tonen)
  injectStatusBot();
  const fab = $('s27-bot-fab');
  if(fab) fab.style.display = '';
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
  if (AUTH_V2) { if (window.S27Auth) window.S27Auth.logout(); return; }
  clearSession();
  $('s27-bedrijfsnaam').value = '';
  $('s27-token').value = '';
  showLogin();
}

// v3.1: harde cache-reset. Wist alle opslag + browsercaches, logt uit en forceert een
// verse herlaad met ?nocache=1 (loader gebruikt dan een timestamp-cache-bust → verse assets).
// Lost op dat je na navigeren nog een oude dashboard-versie ziet.
function forceCacheClearAndReload(){
  // 1. Alle lokale opslag wissen
  try { localStorage.clear(); } catch(e){}
  try { sessionStorage.clear(); } catch(e){}
  // 2. Cache Storage API legen (verse CDN-assets)
  try { if(window.caches && caches.keys) caches.keys().then(function(ks){ ks.forEach(function(k){ caches.delete(k); }); }); } catch(e){}
  // 3. Eventuele service workers afmelden
  try {
    if(navigator.serviceWorker && navigator.serviceWorker.getRegistrations)
      navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); });
  } catch(e){}
  // 4. Sessie in geheugen weg
  state.session = null;
  try { showSettingsStatus('s27-notif-status', 'Cache gewist — portaal wordt vers herladen, log zo opnieuw in…', 'info'); } catch(e){}
  // 5. Harde herlaad met nocache → loader haalt verse dashboard-assets, geen sessie → login
  setTimeout(function(){
    try {
      var fresh = location.origin + location.pathname + '?nocache=1&_=' + Date.now();
      location.replace(fresh);
    } catch(e){ location.reload(); }
  }, 700);
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
    contact: d.contact || { am_naam:'Ilke Meeusen', am_email:'ilke@studio27.be', am_rol:'Account manager' },
    // Module-zichtbaarheid per klant (bron: ClickUp → dashboard-feed). Object met booleans,
    // bv. {"performance":false}. Afwezig/null = alles tonen (backward-safe, geen regressie).
    modules: (d.modules && typeof d.modules === 'object') ? d.modules : null
  };
}

/* =================================================================
   RENDER DASHBOARD
   ================================================================= */
// v3.1: Dashboard-tab = HUB/overzichtspagina. Projectenlijst verhuist naar de Projecten-tab.
function renderDashboard(d){
  const greetingName = firstNameFromCompany(d.klant && d.klant.bedrijfsnaam);
  const heroTitle = $('s27-hero-title');
  if(heroTitle) heroTitle.innerHTML = '<span class="greeting">Hey ' + esc(greetingName) + ',</span><span class="s27-hero-subline">Welkom in je portaal — hier volg en regel je alles.</span>';
  if(!localStorage.getItem('s27_tour_completed')){ setTimeout(() => showWelcomeTour(true), 400); }
  injectHelpButton();
  const heroLead = document.querySelector('#s27-tab-dashboard .s27-hero-lead'); if(heroLead) heroLead.style.display = 'none';
  const heroTag  = document.querySelector('#s27-tab-dashboard .s27-hero-tag');  if(heroTag) heroTag.style.display = 'none';
  applyModuleVisibility();   // verberg nav-tabs van uitgezette modules (vóór render = geen flikkering)
  renderHubBody(d);
  renderProjecten();   // pre-render zodat tabwissel instant is
  const upd = $('s27-updated'); if(upd) upd.textContent = 'Bijgewerkt om ' + new Date().toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'});
}

function isAfgerondStatus(p){
  const s = (p.status || '').toLowerCase().replace(/\s+/g,'_');
  return s === 'goedgekeurd' || s === 'done' || s === 'klaar_voor_facturatie' || s === 'gefactureerd';
}

/* =================================================================
   COCKPIT — centrale "Te doen"-actiehub (v3.2-1 #92)
   Bundelt alle openstaande klantacties bovenaan de homepage:
   feedback geven · shoot inplannen · facturatie bevestigen.
   ================================================================= */
// Detecteert of een te-plannen taak om een afspraak vraagt (strategiesessie /
// opstartmeeting / meeting-keyword). Doorgetrokken over ALLE takken (Vincent-eis).
const SCHEDULE_KW = {
  strategie: /strategie.?sessie|strategiesessie|strategie.?meeting/i,
  opstart:   /opstart|kick.?off|start.?meeting|startmeeting|pre.?productie|preproductie/i,
  meeting:   /\bmeeting\b|overleg|afspraak|gesprek|sessie/i
};
function taskScheduleType(p){
  if(!p) return '';
  const st = (p.status || '').toLowerCase().replace(/\s+/g, '_');
  if(st !== 'to_do') return '';            // enkel "Te plannen"
  if(p.discipline === 'video_fotografie') return 'shoot';   // shoot-blok regelt eligibility zelf (opleverdatum = leverdatum, niet shootdatum)
  if(p.opleverdatum) return '';            // meeting/sessie mét datum = al ingepland
  const nm = p.naam || '';
  if(SCHEDULE_KW.strategie.test(nm) || p.discipline === 'strategie') return 'strategie';
  if(SCHEDULE_KW.opstart.test(nm))  return 'opstart';
  if(SCHEDULE_KW.meeting.test(nm))  return 'meeting';
  return '';
}

function collectCockpitActions(d){
  const projs = (d && d.actieve_projecten) || [];
  const factuurDone = loadFactuurConfirmCache();
  const actions = [];
  projs.forEach(p => {
    const st = (p.status || '').toLowerCase().replace(/\s+/g, '_');
    const cat = disciplineCategory(p.discipline);
    // 1) Feedback geven — status doorgestuurd, ronde nog actief (niet al ingediend)
    if((st === 'doorgestuurd' || p.feedback_link) && !hasFreshFbLock(p)){
      actions.push({ type:'feedback', icon:'🔔', accent:'#F66131', label:'Geef je feedback', sub: p.naam || 'Project', cta:'Feedback geven', proj:p });
    }
    // 2) Inplannen — shoot (video) OF strategiesessie/opstart/meeting (alle takken)
    const sched = taskScheduleType(p);
    if(sched === 'shoot' && !p.shoot_gepland){
      actions.push({ type:'shoot', icon:'📸', accent:discColor('video_fotografie'), label:'Plan je shoot in', sub: p.naam || 'Shoot', cta:'Shoot inplannen', proj:p });
    } else if(sched){
      const m = { strategie:{ic:'🎯',label:'Plan je strategiesessie',cta:'Sessie inplannen'}, opstart:{ic:'🚀',label:'Plan je opstartmeeting',cta:'Opstart inplannen'}, meeting:{ic:'📅',label:'Plan een afspraak in',cta:'Afspraak inplannen'} }[sched];
      actions.push({ type:'plan', icon:m.ic, accent:discColor(p.discipline), label:m.label, sub: p.naam || 'Afspraak', cta:m.cta, proj:p, schedType:sched });
    }
    // 3) Facturatie bevestigen — opgeleverde deliverable die je nog niet bevestigde
    if(cat === 'deliverable' && isAfgerondStatus(p) && !factuurDone[p.task_id]){
      actions.push({ type:'facturatie', icon:'🧾', accent:'#12AC4E', label:'Bevestig de facturatie', sub: p.naam || 'Project', cta:'Facturatie nakijken', proj:p });
    }
  });
  return actions;
}

function renderCockpitActions(d){
  const actions = collectCockpitActions(d);
  state.cockpitActions = actions;
  if(!actions.length){
    return '<div class="s27-cockpit s27-cockpit-clear">' +
      '<div class="s27-cockpit-clear-ic">✅</div>' +
      '<div><strong>Alles is in orde</strong><p>Je hebt nu niets openstaan. Zodra er iets jouw aandacht vraagt — feedback, een shoot of een bevestiging — verschijnt het hier bovenaan.</p></div>' +
    '</div>';
  }
  return '<div class="s27-cockpit">' +
    '<div class="s27-cockpit-head"><span class="s27-cockpit-tag">Te doen</span><h2>Dit vraagt jouw aandacht</h2><p>' + actions.length + ' ' + (actions.length === 1 ? 'actie' : 'acties') + ' — telkens één klik.</p></div>' +
    '<div class="s27-cockpit-list">' +
      actions.map((a, i) =>
        '<button type="button" class="s27-cockpit-card" data-cockpit-idx="' + i + '" style="--accent:' + a.accent + '">' +
          '<span class="s27-cockpit-ic">' + a.icon + '</span>' +
          '<span class="s27-cockpit-txt"><strong>' + esc(a.label) + '</strong><small>' + esc(a.sub) + '</small></span>' +
          '<span class="s27-cockpit-cta">' + esc(a.cta) + ' →</span>' +
        '</button>'
      ).join('') +
    '</div>' +
  '</div>';
}

function handleCockpitAction(a){
  if(!a) return;
  if(a.type === 'feedback' || a.type === 'shoot' || a.type === 'plan'){
    if(a.proj && a.proj.task_id) openProjectDetail(a.proj.task_id, a.type === 'feedback' ? 'feedback' : 'overzicht');
  } else if(a.type === 'facturatie'){
    state.facturatiePendingProject = a.proj && a.proj.task_id;
    switchTab('facturatie');
  }
}

function renderHubBody(d){
  const body = $('s27-dash-body'); if(!body) return;
  const deliverable = projectsInCategory(d, 'deliverable');
  const lopend = deliverable.filter(p => !isAfgerondStatus(p)).length;
  const wacht = deliverable.filter(p => matchesStatusFilter(p, 'wacht_feedback')).length;
  const doorlopend = projectsInCategory(d, 'doorlopend');
  const socialsCount = doorlopend.filter(p => p.discipline === 'social').length;
  const adsCount = doorlopend.filter(p => p.discipline === 'ads').length;
  const seoCount = doorlopend.filter(p => p.discipline === 'seo').length;
  const opleidingCount = projectsInCategory(d, 'opleiding').length;
  const meetings = d.aankomende_meetings || [];
  const projMeta = (lopend ? lopend + ' lopend' : 'Geen lopende') + (wacht ? ' · ' + wacht + ' wacht op jou' : '');
  const dienstenGrid = renderDienstenGrid(d);
  // "Snel naar" — niet-discipline-gebonden tools (altijd zichtbaar)
  const snelGrid = [
    hubCard('performance','s27p-chart', discColor('performance'),'Performance', moduleEnabled('performance') ? 'Bekijk je cijfers' : 'Nog niet actief', 'Je advertentie- en social-resultaten, helder gevisualiseerd.', !moduleEnabled('performance')),
    hubCard('meetings','s27p-cal','#3083DC','Meetings', (meetings.length ? meetings.length + ' gepland' : 'Plan een meeting'), 'Bekijk je agenda en plan zelf een nieuw overleg in.'),
    hubCard('bedrijf','s27p-brand','#9441DB','Mijn bedrijf','Huisstijl, team & gegevens','Logo\'s, fonts, kleuren, je team en je bedrijfsgegevens — alles op één plek.'),
    hubCard('nieuw','s27p-upload','#F8C028','Nieuw project','Start hier','Vertel je idee en krijg meteen een prijsindicatie op maat.'),
    hubCard('instellingen','s27p-user','#6B5B6B','Instellingen','Gegevens & notificaties','Je contactgegevens, voorkeuren en notificaties — allemaal hier.')
  ].join('');
  body.innerHTML =
    renderCockpitActions(d) +
    '<button type="button" class="s27-hub-bot" data-bot-open="1">' +
      '<span class="s27-hub-bot-ic">✦</span>' +
      '<span class="s27-hub-bot-txt"><strong>Vraag het de assistent</strong><span>Hoever staat een project? Wanneer is iets klaar? Stel je vraag — je krijgt meteen antwoord.</span></span>' +
      '<span class="s27-hub-bot-cta">Open chat →</span>' +
    '</button>' +
    '<div class="s27-diensten">' +
      '<div class="s27-section-head"><span class="s27-section-eyebrow">Onze diensten voor jou</span><h2>Waar we samen aan werken</h2></div>' +
      '<div class="s27-hub-grid s27-diensten-grid">' + dienstenGrid + '</div>' +
    '</div>' +
    '<div class="s27-snel">' +
      '<div class="s27-section-head"><span class="s27-section-eyebrow">Snel naar</span></div>' +
      '<div class="s27-hub-grid s27-snel-grid">' + snelGrid + '</div>' +
    '</div>' +
    '<div class="s27-meetings-mini">' +
      '<div class="s27-meetings-mini-head"><strong>Aankomende meetings</strong>' +
      (meetings.length ? '<button class="s27-mini-cta" data-go-tab="meetings">Alle ' + meetings.length + ' bekijken →</button>' : '') + '</div>' +
      (meetings.length ? '<div class="s27-meetings-mini-list">' + meetings.slice(0,2).map(renderMiniMeeting).join('') + '</div>' : '<p class="s27-meetings-mini-empty">Geen meetings gepland.</p>') +
    '</div>' +
    '<div class="s27-home-contact" id="contact">' + renderContact(d.contact || {}) + '</div>';
  // Handlers
  body.querySelectorAll('[data-hub-card]').forEach(el => el.addEventListener('click', () => {
    const t = el.dataset.hubCard;
    switchTab(t);
  }));
  body.querySelectorAll('[data-dienst-locked]').forEach(el => el.addEventListener('click', () => {
    const dienst = el.dataset.dienstLocked;
    openDMModal('dienst', { ontvanger:'ilke', onderwerp:'Interesse in ' + dienst,
      placeholder:'Vertel ons kort wat je zoekt rond ' + dienst.toLowerCase() + ' — we sturen je vrijblijvend een voorstel op maat.' });
  }));
  body.querySelectorAll('[data-go-tab]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); switchTab(el.dataset.goTab); }));
  body.querySelectorAll('[data-cockpit-idx]').forEach(el => el.addEventListener('click', () => handleCockpitAction((state.cockpitActions || [])[parseInt(el.dataset.cockpitIdx, 10)])));
  const botBtn = body.querySelector('[data-bot-open]');
  if(botBtn) botBtn.addEventListener('click', () => { if(typeof toggleStatusBot === 'function') toggleStatusBot(true); });
}

function hubCard(tab, icon, accent, title, meta, desc, soon){
  return '<button type="button" class="s27-hub-card' + (soon ? ' is-soon' : '') + '" data-hub-card="' + esc(tab) + '" style="--accent:' + accent + '">' +
    '<span class="s27-hub-card-ic"><svg width="20" height="20" viewBox="0 0 24 24"><use href="#' + icon + '"/></svg></span>' +
    '<span class="s27-hub-card-title">' + esc(title) + (soon ? '<span class="s27-hub-soon">binnenkort</span>' : '') + '</span>' +
    '<span class="s27-hub-card-meta">' + esc(meta) + '</span>' +
    '<span class="s27-hub-card-desc">' + esc(desc) + '</span>' +
  '</button>';
}

/* "Onze diensten voor jou" — alle 8 takken in hun bijbel-kleur.
   Actieve tak → deeplink. Niet-actieve tak → subtiele FOMO-teaser
   die een vrijblijvend interesse-bericht opent (geen harde paywall). */
function renderDienstenGrid(d){
  return DISCIPLINE_HUB.map(h => {
    const st = disciplineState(d, h);
    const col = discColor(h.disc);
    if(st === 'active'){
      const n = disciplineCount(d, h.disc);
      const doorlopend = (h.disc === 'social' || h.disc === 'ads' || h.disc === 'seo');
      const meta = doorlopend ? (n ? n + ' actief' : 'Loopt continu') : (n ? n + ' lopend' : 'Bekijk');
      return '<button type="button" class="s27-hub-card s27-dienst" data-hub-card="' + esc(h.targetTab) + '" style="--accent:' + col + '">' +
        '<span class="s27-dienst-stamp">' + discStampImg(h.disc, 54) + '</span>' +
        '<span class="s27-hub-card-title">' + esc(h.label) + '</span>' +
        '<span class="s27-hub-card-meta">' + esc(meta) + '</span>' +
        '<span class="s27-hub-card-desc">' + esc(h.teaser) + '</span>' +
      '</button>';
    }
    // GELOCKED → subtiele teaser (FOMO by design, niet irritant)
    return '<button type="button" class="s27-hub-card s27-dienst is-locked" data-dienst-locked="' + esc(h.label) + '" style="--accent:' + col + '">' +
      '<span class="s27-dienst-stamp">' + discStampImg(h.disc, 54) + '</span>' +
      '<span class="s27-dienst-lockbadge"><svg width="10" height="10" viewBox="0 0 24 24"><use href="#s27p-lock"/></svg> Nog niet actief</span>' +
      '<span class="s27-hub-card-title">' + esc(h.label) + '</span>' +
      '<span class="s27-hub-card-desc">' + esc(h.teaser) + '</span>' +
      '<span class="s27-dienst-cta">Meer weten? →</span>' +
    '</button>';
  }).join('');
}

// v3.1: Projecten-tab — de volledige lijst + filters. "Opgeleverd" toont het archief.
function renderProjecten(){
  const body = $('s27-projecten-body'); if(!body) return;
  const d = state.dashboard;
  if(!d){ body.innerHTML = '<div class="s27-loading">Projecten laden</div>'; return; }
  // v3.1-5: enkel deliverable-disciplines (web, branding, video, strategie). Doorlopend + opleiding hebben eigen tab.
  const allProjecten = projectsInCategory(d, 'deliverable');

  // Tellingen per filter (opgeleverd = archief-telling)
  const counts = {};
  STATUS_FILTERS.forEach(f => {
    counts[f.id] = (f.id === 'opgeleverd') ? getOpgeleverdProjects(d).length : allProjecten.filter(p => matchesStatusFilter(p, f.id)).length;
  });

  let listHtml;
  if(state.statusFilter === 'opgeleverd'){
    listHtml = renderOpgeleverdArchive(d);
  } else {
    const filtered = allProjecten.filter(p => matchesStatusFilter(p, state.statusFilter));
    const projectenByDisc = groupBy(filtered, p => p.discipline);
    // Default uitklappen
    if(!state.expandedDisciplines){
      state.expandedDisciplines = {};
      const keys = Object.keys(projectenByDisc);
      if(keys.length <= 4){ keys.forEach(k => state.expandedDisciplines[k] = true); }
      else {
        keys.forEach(k => { state.expandedDisciplines[k] = projectenByDisc[k].some(p => (p.status||'').toLowerCase() === 'doorgestuurd'); });
        if(!Object.values(state.expandedDisciplines).some(Boolean)) state.expandedDisciplines[keys[0]] = true;
      }
    }
    listHtml = renderDisciplinesAccordion(projectenByDisc);
  }

  body.innerHTML =
    '<div class="s27-home-filterhead"><div class="s27-home-filterhead-label">Filter op status</div>' + renderFilterBar(counts) + '</div>' +
    listHtml;
  attachProjectenHandlers();
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
  { id:'ilke',    naam:'Ilke Meeusen',      rol:'Accountmanager' },
  { id:'arne',    naam:'Arne Goetschalckx', rol:'Vertegenwoordiger' },
  { id:'vincent', naam:'Vincent Verleije',  rol:'Zaakvoerder' }
];

const DM_PRESETS = {
  vraag:     { defaultTo:'ilke',    title:'Stel een vraag',         subject:'Vraag via portaal',     icon:'💬', cta:'Bericht versturen' },
  terugbel:  { defaultTo:'ilke',    title:'Vraag een terugbel',     subject:'Terugbel-verzoek',      icon:'📞', cta:'Verstuur terugbel-verzoek' },
  meeting:   { defaultTo:'ilke',    title:'Plan een meeting in',    subject:'Meeting-aanvraag',      icon:'📅', cta:'Verstuur meeting-aanvraag' },
  shoot:     { defaultTo:'ilke',    title:'Plan een shoot in',      subject:'Shoot-aanvraag',        icon:'📸', cta:'Verstuur shoot-aanvraag' },
  archief:   { defaultTo:'ilke',    title:'Vraag oude deliverables op', subject:'Vraag oud project op', icon:'📁', cta:'Bericht versturen' },
  upload:    { defaultTo:'ilke',    title:'Hulp bij grote bestanden', subject:'Hulp bij upload',     icon:'📦', cta:'Stuur verzoek' },
  dienst:    { defaultTo:'ilke',    title:'Ontdek wat we voor je kunnen doen', subject:'Interesse in een nieuwe dienst', icon:'✨', cta:'Stuur mijn interesse' }
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
// Spotlight-doelen per stap (dynamische rondleiding: ring + inzoom op de echte nav).
[null, '.s27-navgroup[data-group="werk"]', '.s27-tab[data-tab="berichten"]', '.s27-navgroup[data-group="bedrijf"]', '.s27-tab[data-tab="dashboard"]']
  .forEach((t, i) => { if(TOUR_STEPS[i]) TOUR_STEPS[i].target = t; });

// Markeer het doel-element met een pulserende ring + scroll het in beeld.
function spotlightTour(selector){
  document.querySelectorAll('.s27-tour-spot').forEach(el => el.classList.remove('s27-tour-spot'));
  if(!selector) return;
  const el = document.querySelector(selector);
  if(!el) return;
  el.classList.add('s27-tour-spot');
  try { el.scrollIntoView({ behavior:'smooth', block:'center', inline:'center' }); } catch(e){}
}
function clearTourSpotlight(){ document.querySelectorAll('.s27-tour-spot').forEach(el => el.classList.remove('s27-tour-spot')); }

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
      <button type="button" class="s27-tour-never" id="s27-tour-never">De rondleiding niet meer tonen</button>
    </div>
  `;
  spotlightTour(step.target);
  // Handlers
  const close = () => {
    clearTourSpotlight();
    try { modal.remove(); } catch(e){}
    if(firstTime) try { localStorage.setItem('s27_tour_completed', new Date().toISOString()); } catch(e){}
  };
  // Expliciete opt-out: zet de tour permanent uit (ook bij handmatig heropenen).
  const neverShow = () => {
    try { localStorage.setItem('s27_tour_completed', new Date().toISOString()); } catch(e){}
    close();
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
  const neverBtn = $('s27-tour-never'); if(neverBtn) neverBtn.addEventListener('click', neverShow);
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

// Jouw contactpersonen bij Studio 27 — de vaste trio (Vincent: meervoud!).
// Ilke = accountmanager · Arne = vertegenwoordiger · Vincent = zaakvoerder.
// Berichten landen via [data-dm] → directMessage-scenario → ClickUp.
const STUDIO_CONTACTS = [
  { id:'ilke',    naam:'Ilke Meeusen',      rol:'Accountmanager',    tip:'Je vaste aanspreekpunt — overzicht over al je projecten.' },
  { id:'arne',    naam:'Arne Goetschalckx', rol:'Vertegenwoordiger', tip:'Voor advertenties, nieuwe projecten en advies op maat.' },
  { id:'vincent', naam:'Vincent Verleije',  rol:'Zaakvoerder',       tip:'Voor strategie en de grote beslissingen.' }
];
function renderContact(c){
  c = c || {};
  const amName = (c.am_naam || '').toLowerCase().trim();
  return '<div class="s27-team">' +
    '<div class="s27-section-head"><span class="s27-section-eyebrow">Jouw contactpersonen bij Studio 27</span></div>' +
    '<div class="s27-team-grid">' +
      STUDIO_CONTACTS.map(p => {
        const foto = teamPhotoFor(p.naam);
        const isAM = amName && amName === p.naam.toLowerCase();
        const gsm = (isAM && c.am_gsm) ? c.am_gsm : '';
        const first = p.naam.split(' ')[0];
        return '<div class="s27-team-card">' +
          '<div class="s27-team-avatar">' + (foto ? '<img src="' + esc(foto) + '" alt="' + esc(p.naam) + '" loading="lazy">' : esc(getInitials(p.naam))) + '</div>' +
          '<div class="s27-team-info">' +
            '<span class="s27-team-rol">' + esc(p.rol) + '</span>' +
            '<span class="s27-team-naam">' + esc(p.naam) + '</span>' +
            '<span class="s27-team-tip">' + esc(p.tip) + '</span>' +
          '</div>' +
          '<div class="s27-team-actions">' +
            '<a href="#" data-dm="vraag" data-dm-ontvanger="' + p.id + '" data-dm-onderwerp="Vraag voor ' + esc(first) + '"><svg width="13" height="13"><use href="#s27p-mail"/></svg> Bericht ' + esc(first) + '</a>' +
            (gsm ? '<a href="tel:' + esc(gsm) + '" class="s27-team-call"><svg width="13" height="13"><use href="#s27p-phone"/></svg> Bel direct</a>' : '') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>';
}

/* =================================================================
   DASHBOARD HANDLERS
   ================================================================= */
function attachProjectenHandlers(){
  const scope = $('s27-projecten-body') || document;
  // project klik
  scope.querySelectorAll('.s27-projc, .s27-proj').forEach(el => {
    el.addEventListener('click', () => openProjectDetail(el.dataset.taskId));
    el.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProjectDetail(el.dataset.taskId); } });
  });
  // status filter chips → her-render de projectenlijst
  scope.querySelectorAll('.s27-chip[data-filter]').forEach(el => {
    el.addEventListener('click', () => { state.statusFilter = el.dataset.filter; renderProjecten(); });
  });
  // accordion uitklap
  scope.querySelectorAll('[data-disc-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.discToggle;
      state.expandedDisciplines[k] = !state.expandedDisciplines[k];
      renderProjecten();
    });
  });
}

// v3.1-5: DOORLOPENDE projecten (social/ads/seo) — retainer, geen feedback/goedgekeurd-flow.
// v4 modules-split: Doorlopend is opgesplitst in 3 eigen tabs (Socials/Ads/SEO-GEO).
// Eén generieke renderer, gefilterd op discipline. Categorie blijft intern 'doorlopend'.
const DOORLOPEND_COPY = {
  social: { intro:'Je social media loopt continu — content, planning en opvolging. De cijfers vind je in <em>Performance</em>.', empty:'Zodra je social-mediatraject loopt, vind je het hier terug.' },
  ads:    { intro:'Je advertenties draaien continu — Meta, Google en meer, doorlopend bijgestuurd. De cijfers vind je in <em>Performance</em>.', empty:'Zodra een advertentiecampagne loopt, vind je ze hier terug.' },
  seo:    { intro:'Je SEO/GEO-traject loopt continu — werken aan je vindbaarheid in zoekmachines én AI-antwoorden.', empty:'Zodra je SEO/GEO-traject loopt, vind je het hier terug.' }
};
function renderDoorlopendDisc(tabKey, discipline){
  const body = $('s27-' + tabKey + '-body'); if(!body) return;
  const d = state.dashboard;
  if(!d){ body.innerHTML = '<div class="s27-loading">Laden…</div>'; return; }
  const projs = projectsInCategory(d, 'doorlopend').filter(p => p.discipline === discipline);
  const copy = DOORLOPEND_COPY[discipline] || { intro:'', empty:'Nog niets om te tonen.' };
  const intro = '<div class="s27-doorlopend-intro">' +
    '<span class="s27-doorlopend-intro-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><polyline points="21 4 21 9 16 9"/></svg></span>' +
    '<div><strong>Doorlopend traject</strong><p>' + copy.intro + '</p></div></div>';
  if(!projs.length){
    body.innerHTML = intro + '<div class="s27-empty"><div class="s27-empty-title">Nog geen lopend traject</div><p class="s27-empty-sub">' + copy.empty + '</p></div>';
    return;
  }
  body.innerHTML = intro + '<div class="s27-acc-list"><div class="s27-acc-body">' + projs.map(renderDoorlopendCard).join('') + '</div></div>';
  body.querySelectorAll('.s27-projc').forEach(el => {
    el.addEventListener('click', () => openProjectDetail(el.dataset.taskId));
    el.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openProjectDetail(el.dataset.taskId); } });
  });
}

function renderDoorlopendCard(p){
  const statusKey = (p.status || 'in_progress').toLowerCase().replace(/\s+/g,'_');
  const statusLabel = p.status_label || STATUS_LABELS[statusKey] || p.status || 'Loopt';
  return '<div class="s27-projc" data-task-id="' + esc(p.task_id || '') + '" tabindex="0" role="button" aria-label="' + esc(p.naam) + '">' +
    '<div class="s27-projc-main"><div class="s27-projc-name">' + esc(p.naam || 'Traject') + '</div>' +
      '<div class="s27-projc-meta"><span>🔄 Loopt continu</span>' + (p.laatst_geupdatet ? '<span>· ' + esc(fmtRelTime(p.laatst_geupdatet)) + '</span>' : '') + '</div></div>' +
    '<div class="s27-projc-right"><span class="s27-projc-status" data-status="' + esc(statusKey) + '">' + esc(statusLabel) + '</span><span class="s27-projc-arrow">→</span></div></div>';
}

// v3.1-5: OPLEIDINGEN — eigen tab.
function renderOpleidingen(){
  const body = $('s27-opleidingen-body'); if(!body) return;
  const d = state.dashboard;
  if(!d){ body.innerHTML = '<div class="s27-loading">Laden…</div>'; return; }
  const projs = projectsInCategory(d, 'opleiding');
  if(!projs.length){
    body.innerHTML = '<div class="s27-empty"><div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-opl"/></svg></div>' +
      '<div class="s27-empty-title">Nog geen opleidingen</div><p class="s27-empty-sub">Zodra je een opleiding of workshop bij Studio 27 volgt, vind je hier de planning en het materiaal terug.</p></div>';
    return;
  }
  body.innerHTML = '<div class="s27-acc-list"><div class="s27-acc-body">' + projs.map(renderProjectCompact).join('') + '</div></div>';
  body.querySelectorAll('.s27-projc').forEach(el => {
    el.addEventListener('click', () => openProjectDetail(el.dataset.taskId));
    el.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openProjectDetail(el.dataset.taskId); } });
  });
}

// v3-C: global handler — links met data-goto-tab springen naar een tab
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-goto-tab]');
  if(!t) return;
  e.preventDefault();
  switchTab(t.dataset.gotoTab);
});

/* =================================================================
   PORTAL-MODULES — zichtbaarheid per klant (toggle vanuit ClickUp)
   De dashboard-feed geeft optioneel een booleans-object `modules` terug,
   afgeleid van een ClickUp-veld op de Bedrijf-taak. Een module wordt
   verborgen zodra de feed hem expliciet op `false` zet. Geen `modules`
   in de feed (oude klanten / demo) ⇒ alles zichtbaar (geen regressie).
   Kern-tabs (start, berichten, projecten, meetings, bedrijf, facturatie,
   nieuw, instellingen) staan bewust NIET in deze lijst — die zijn altijd aan.
   Uitbreiden = sleutel hier toevoegen + label in ClickUp + mapping in Make.
   ================================================================= */
const PORTAL_MODULES = ['performance', 'socials', 'ads', 'seo', 'opleidingen'];
function moduleEnabled(key){
  if(PORTAL_MODULES.indexOf(key) === -1) return true;            // kern-tab → altijd zichtbaar
  const m = state.dashboard && state.dashboard.modules;
  if(!m || typeof m !== 'object') return true;                   // geen config ⇒ alles tonen
  return m[key] !== false;                                       // enkel een expliciete false verbergt
}
function applyModuleVisibility(){
  // 1) Tab-knoppen in de navigatie tonen/verbergen
  PORTAL_MODULES.forEach(key => {
    const show = moduleEnabled(key);
    document.querySelectorAll('.s27-tab[data-tab="' + key + '"]').forEach(b => { b.style.display = show ? '' : 'none'; });
  });
  // 1b) Vergrendelde deliverable-takken (strategie/branding/video/webdesign) uit de nav halen
  ['strategie','branding','video_fotografie','webdesign'].forEach(disc => {
    const locked = isDiscLocked(disc);
    document.querySelectorAll('.s27-tab-disc[data-disc="' + disc + '"]').forEach(b => { b.style.display = locked ? 'none' : ''; });
  });
  injectNavStamps();   // echte mini-stempels in de takken-nav
  // 2) Een navigatiegroep verbergen als al z'n tabs weg zijn (bv. lege "Mijn werk")
  document.querySelectorAll('.s27-navgroup').forEach(g => {
    const anyVisible = Array.prototype.some.call(g.querySelectorAll('.s27-tab'), b => b.style.display !== 'none');
    g.style.display = anyVisible ? '' : 'none';
  });
  // 3) Staat de klant op een tab die net verborgen werd? → terug naar Start
  if(state.activeTab && !moduleEnabled(state.activeTab)) switchTab('dashboard');
}

function switchTab(tabId){
  if(!moduleEnabled(tabId)) tabId = 'dashboard';                 // hard slot: nooit naar een uitgezette module
  state.activeTab = tabId;
  document.querySelectorAll('.s27-tab').forEach(b => {
    const isActive = b.dataset.tab === tabId;
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  // #93 dropdown-nav: markeer de groep waar de actieve tab in zit + sluit alle dropdowns
  document.querySelectorAll('.s27-navgroup').forEach(g => {
    g.classList.toggle('is-active', !!g.querySelector('.s27-tab[aria-selected="true"]'));
    g.classList.remove('is-open');
  });
  document.querySelectorAll('.s27-tabview').forEach(v => {
    v.hidden = (v.id !== 's27-tab-' + tabId);
  });
  // Lazy-render placeholder tabs
  if(tabId === 'projecten')    renderProjecten();
  if(tabId === 'socials')      renderDoorlopendDisc('socials', 'social');
  if(tabId === 'ads')          renderDoorlopendDisc('ads', 'ads');
  if(tabId === 'seo')          renderDoorlopendDisc('seo', 'seo');
  if(tabId === 'berichten')    renderBerichtenTab();
  if(tabId === 'performance')  renderPerformanceTab();
  if(tabId === 'opleidingen')  renderOpleidingen();
  if(tabId === 'bedrijf')      renderBedrijfTab();
  if(tabId === 'facturatie')   renderFacturatieTab();
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
   BERICHTEN-INBOX (v3.2-4 #95)
   Eén centrale plek voor alle teamcommunicatie: een gesprek per project
   (hergebruik van de bestaande per-project chat) + een directe lijn voor
   algemene vragen. Previews laden lui per project.
   ================================================================= */
function loadConvSeen(){ try { return JSON.parse(localStorage.getItem('s27_conv_seen_' + (state.session && state.session.bedrijf_id)) || '{}'); } catch(e){ return {}; } }
function markConvSeen(taskId){ try { const c = loadConvSeen(); c[taskId] = Date.now(); localStorage.setItem('s27_conv_seen_' + (state.session && state.session.bedrijf_id), JSON.stringify(c)); } catch(e){} }

async function renderBerichtenTab(){
  const body = $('s27-berichten-body');
  if(!body) return;
  const d = state.dashboard || {};
  const projs = (d.actieve_projecten || []).slice();
  const am = d.contact || {};
  const header =
    '<div class="s27-msg-top">' +
      '<div class="s27-msg-top-info">' +
        '<strong>Een algemene vraag?</strong>' +
        '<span>Stuur het team rechtstreeks een bericht — of gebruik de ✦ assistent rechtsonder voor een snel antwoord.</span>' +
      '</div>' +
      '<button class="s27-btn s27-btn-primary" data-dm="vraag" data-dm-onderwerp="Bericht voor ' + esc(am.am_naam || 'het team') + '">✉️ Nieuw bericht</button>' +
    '</div>';
  if(!projs.length){
    body.innerHTML = header + '<div class="s27-empty"><div class="s27-empty-title">Nog geen gesprekken</div><p class="s27-empty-sub">Zodra er een project loopt, vind je hier per project de chat met ons team terug.</p></div>';
    return;
  }
  body.innerHTML = header +
    '<div class="s27-msg-list">' + projs.map(renderConversationRow).join('') + '</div>';
  body.querySelectorAll('[data-conv-task]').forEach(el => el.addEventListener('click', () => {
    markConvSeen(el.dataset.convTask);
    openProjectDetail(el.dataset.convTask);
  }));
  loadConversationPreviews(projs);
}

function renderConversationRow(p){
  const di = getDisciplineInfo(p.discipline);
  return '<button type="button" class="s27-msg-row" data-conv-task="' + esc(p.task_id) + '">' +
    '<span class="s27-msg-ava" style="--accent:' + di.accent + '"><svg width="17" height="17" viewBox="0 0 24 24"><use href="#' + di.icon + '"/></svg></span>' +
    '<span class="s27-msg-main">' +
      '<span class="s27-msg-row-top"><strong class="s27-msg-name">' + esc(p.naam || 'Project') + '</strong><small class="s27-msg-time" data-conv-time="' + esc(p.task_id) + '"></small></span>' +
      '<span class="s27-msg-preview" data-conv-prev="' + esc(p.task_id) + '">' + esc(di.label) + ' · gesprek laden…</span>' +
    '</span>' +
    '<span class="s27-msg-unread" data-conv-unread="' + esc(p.task_id) + '" hidden></span>' +
  '</button>';
}

async function loadConversationPreviews(projs){
  for(const p of projs){
    let comments = [];
    try {
      if(state.demoMode){
        comments = (getDemoDetail(p.task_id, p).comments) || [];
      } else if(ENDPOINTS.chatList){
        const r = await api(ENDPOINTS.chatList, { task_id: p.task_id, bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token });
        comments = (r.ok && r.data && r.data.comments) || [];
      }
    } catch(e){ /* preview faalt stil */ }
    updateConversationRow(p, comments);
  }
}

function updateConversationRow(p, comments){
  const sel = id => '[data-conv-' + id + '="' + p.task_id + '"]';
  const prevEl = document.querySelector(sel('prev'));
  const timeEl = document.querySelector(sel('time'));
  const unreadEl = document.querySelector(sel('unread'));
  const di = getDisciplineInfo(p.discipline);
  if(!comments.length){
    if(prevEl) prevEl.textContent = di.label + ' · nog geen berichten — stuur de eerste';
    return;
  }
  const last = comments[comments.length - 1];
  const auteur = last.auteur || last.author || '';
  const fromTeam = /studio\s*27/i.test(auteur) || !!last.intern;
  const txt = (last.tekst || last.text || last.comment_text || '').replace(/\s+/g, ' ').trim();
  if(prevEl) prevEl.textContent = (fromTeam ? '' : 'Jij: ') + (txt.slice(0, 90) || '📎 bijlage');
  const ts = last.datum || last.date;
  if(timeEl && ts){ try { timeEl.textContent = fmtRelTime(ts); } catch(e){} }
  const lastSeen = loadConvSeen()[p.task_id] || 0;
  const lastMs = ts ? Date.parse(ts) : 0;
  if(unreadEl && fromTeam && lastMs && lastMs > lastSeen) unreadEl.hidden = false;
}

/* =================================================================
   PERFORMANCE DASHBOARD (v3 Feature 1, #84)
   mode=list → rapporten per bedrijf (task_id, naam, discipline, bestand)
   mode=data&task_id → volledige rapport-JSON (1.6MB, gzip-proof via custom
   s27fetch-app). Het rapport zelf rendert in een iframe (performance-report.html,
   de standalone engine) zodat de zware Chart.js-render geïsoleerd blijft van de SPA.
   ================================================================= */
const _perfState = { reports: [], activeTaskId: null, listenerBound: false, loadTimer: null, loaded: false };
// Bump bij elke performance-report.html-wijziging → forceert verse CDN-fetch (omzeilt stale/404-edgecache)
const PERF_ENGINE_VER = '20260530a';

// Basis-URL waar de portal-assets staan (raw.githack in productie, lokaal bij _bottest)
function s27AssetBase(){
  let src = '';
  const tagged = document.querySelector('script[data-s27-portal-js]');
  if(tagged && tagged.src) src = tagged.src;
  if(!src){
    const all = document.querySelectorAll('script[src]');
    for(const sc of all){ if(/dashboard\.js(\?|$)/.test(sc.src)){ src = sc.src; break; } }
  }
  if(src) return src.split('?')[0].replace(/\/dashboard\.js.*$/, '');
  return 'https://raw.githack.com/studio27marketing/klantenportaal/main';
}

// mode=data URL die de iframe-engine ophaalt (GET met query-params + CORS *)
function buildPerfDataUrl(taskId){
  const tok = (state.session && state.session.session_token) || '';
  const bid = (state.session && state.session.bedrijf_id) || '';
  // In demomodus heeft de sessie geen geldige token → val terug op de publieke demo-token
  const realTok = (state.demoMode || tok === 'demo' || tok.length <= 10) ? 'DEMOSESSIONTOKEN1234567890' : tok;
  return ENDPOINTS.performance + '?mode=data'
    + '&task_id='       + encodeURIComponent(taskId)
    + '&session_token=' + encodeURIComponent(realTok)
    + '&bedrijf_id='    + encodeURIComponent(bid);
}

// Periode uit de bestandsnaam halen: "<client>2026-02-252026-03-31.json" → {start,end}
function parsePerfPeriod(bestand){
  const m = String(bestand||'').match(/(\d{4}-\d{2}-\d{2})(\d{4}-\d{2}-\d{2})\.json/i);
  return m ? { start:m[1], end:m[2] } : null;
}
const _PERF_MND = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const _PERF_MND_VOL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
function _perfDayLabel(iso){
  const d = (iso||'').split('-'); if(d.length<3) return iso||'';
  return parseInt(d[2],10) + ' ' + (_PERF_MND[parseInt(d[1],10)-1] || '');
}
function formatPerfPeriod(p){
  if(!p) return 'Rapportperiode';
  const jaar = (p.end||'').split('-')[0] || '';
  return _perfDayLabel(p.start) + ' – ' + _perfDayLabel(p.end) + ' ' + jaar;
}
// Maand-titel voor een rapport (de eindmaand bepaalt 'de maand')
function perfMonthTitle(p){
  if(!p) return 'Rapport';
  const parts = (p.end||'').split('-'); if(parts.length<3) return 'Rapport';
  const m = _PERF_MND_VOL[parseInt(parts[1],10)-1] || '';
  return (m ? m.charAt(0).toUpperCase()+m.slice(1) : 'Rapport') + ' ' + parts[0];
}
function perfDisciplineMeta(disc){
  if(disc === 'social') return { label:'Social media', icon:'s27p-soc', accent:'#9441DB' };
  return { label:'Advertenties', icon:'s27p-ads', accent:'#F66131' };
}

function getMockPerformanceReports(){
  return [
    { task_id:'86ca0hp3f', naam:'Advertenties — TEST CLIENT BV', discipline:'ads', bestand:'TEST CLIENT BV - advertenties2026-04-012026-04-30.json' },
    { task_id:'86ca0hp13', naam:'Social media — TEST CLIENT BV', discipline:'social', bestand:'Sporta Kampen (vzw)2026-02-252026-03-31.json' }
  ];
}

// AUTH v2: één gescopet rapport per bedrijf, via de gateway (/perfreport) uit de ads-cache
// (key = bedrijf_id, server-side afgedwongen). Geen losse rapport-taken/chips → geen cross-client lek.
async function renderPerformanceV2(body){
  const token = window.S27Auth ? await window.S27Auth.token() : null;
  if(!token){ body.innerHTML = '<div class="s27-error">Niet ingelogd — log opnieuw in.</div>'; return; }
  const dataUrl = GATEWAY_BASE + '/perfreport?token=' + encodeURIComponent(token);
  let has = false;
  try {
    const r = await fetch(dataUrl);
    if(r.ok){ const j = await r.json(); has = !!(j && (j.client_name || j.start_date || j.periode_meta_campaign)); }
  } catch(e){}
  if(!has){
    body.innerHTML = ''
      + '<div class="s27-perf-empty">'
      +   '<div class="s27-perf-empty-icon"><svg width="26" height="26" viewBox="0 0 24 24"><use href="#s27p-chart"/></svg></div>'
      +   '<strong>Nog geen performance-rapporten</strong>'
      +   '<p>Zodra er advertenties of social media voor je lopen bij Studio 27, verschijnt hier automatisch een helder rapport met al je cijfers.</p>'
      + '</div>';
    return;
  }
  body.innerHTML = ''
    + '<div class="s27-perf-frame-wrap">'
    +   '<div class="s27-perf-frame-loader" id="s27-perf-frame-loader"><span class="s27-spin"></span><span>Rapport laden…</span></div>'
    +   '<iframe id="s27-perf-frame" class="s27-perf-frame" title="Performance-rapport" loading="lazy" referrerpolicy="no-referrer"></iframe>'
    + '</div>';
  bindPerfHeightListener();
  const frame = $('s27-perf-frame'), loader = $('s27-perf-frame-loader');
  if(frame){
    frame.style.height = '640px';
    frame.onload = () => { if(loader) loader.style.display = 'none'; };
    frame.src = s27AssetBase() + '/performance-report.html?_v=' + PERF_ENGINE_VER + '&data=' + encodeURIComponent(dataUrl);
  }
}

async function renderPerformanceTab(){
  const body = $('s27-performance-body');
  if(!body) return;
  body.innerHTML = '<div class="s27-loading">Performance laden</div>';

  if (AUTH_V2 && !state.demoMode) return renderPerformanceV2(body);

  let reports = [];
  if(state.demoMode){
    reports = getMockPerformanceReports();
  } else {
    const res = await api(ENDPOINTS.performance, { mode:'list', bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token });
    if(res.ok && res.data && Array.isArray(res.data.reports)) reports = res.data.reports;
  }

  // Nieuwste eerst (einddatum uit bestandsnaam)
  reports.sort((a,b) => {
    const pa = parsePerfPeriod(a.bestand), pb = parsePerfPeriod(b.bestand);
    return (pb && pb.end ? pb.end : '').localeCompare(pa && pa.end ? pa.end : '');
  });
  _perfState.reports = reports;

  if(!reports.length){
    body.innerHTML = ''
      + '<div class="s27-perf-empty">'
      +   '<div class="s27-perf-empty-icon"><svg width="26" height="26" viewBox="0 0 24 24"><use href="#s27p-chart"/></svg></div>'
      +   '<strong>Nog geen performance-rapporten</strong>'
      +   '<p>Zodra er advertenties of social media voor je lopen bij Studio 27, verschijnt hier elke maand automatisch een helder rapport met al je cijfers.</p>'
      + '</div>';
    return;
  }

  const chips = reports.map((r, i) => {
    const p = parsePerfPeriod(r.bestand);
    const meta = perfDisciplineMeta(r.discipline);
    return ''
      + '<button class="s27-perf-chip" data-task-id="' + esc(r.task_id) + '" data-idx="' + i + '" style="--chip:' + meta.accent + '">'
      +   '<span class="s27-perf-chip-ic"><svg width="15" height="15" viewBox="0 0 24 24"><use href="#' + meta.icon + '"/></svg></span>'
      +   '<span class="s27-perf-chip-txt"><strong>' + esc(perfMonthTitle(p)) + '</strong><small>' + esc(meta.label) + ' · ' + esc(formatPerfPeriod(p)) + '</small></span>'
      + '</button>';
  }).join('');

  body.innerHTML = ''
    + (reports.length > 1
        ? '<div class="s27-perf-selector"><span class="s27-perf-selector-lbl">Kies een rapport</span><div class="s27-perf-chips">' + chips + '</div></div>'
        : '')
    + '<div class="s27-perf-frame-wrap">'
    +   '<div class="s27-perf-frame-loader" id="s27-perf-frame-loader"><span class="s27-spin"></span><span>Rapport laden…</span></div>'
    +   '<iframe id="s27-perf-frame" class="s27-perf-frame" title="Performance-rapport" loading="lazy" referrerpolicy="no-referrer"></iframe>'
    + '</div>';

  bindPerfHeightListener();
  perfSelect(reports[0].task_id, 0);

  body.querySelectorAll('.s27-perf-chip').forEach(btn => {
    btn.addEventListener('click', () => perfSelect(btn.dataset.taskId, parseInt(btn.dataset.idx,10)));
  });
}

function perfSelect(taskId){
  _perfState.activeTaskId = taskId;
  document.querySelectorAll('.s27-perf-chip').forEach(b => b.classList.toggle('is-active', b.dataset.taskId === taskId));
  const frame = $('s27-perf-frame');
  const loader = $('s27-perf-frame-loader');
  if(!frame) return;
  if(loader){ loader.style.display = 'flex'; loader.innerHTML = '<span class="s27-spin"></span><span>Rapport laden…</span>'; }
  frame.style.height = '640px';
  _perfState.loaded = false;
  if(_perfState.loadTimer) clearTimeout(_perfState.loadTimer);
  const engineUrl = s27AssetBase() + '/performance-report.html?_v=' + PERF_ENGINE_VER + '&data=' + encodeURIComponent(buildPerfDataUrl(taskId));
  frame.onload = () => { _perfState.loaded = true; if(_perfState.loadTimer) clearTimeout(_perfState.loadTimer); if(loader) loader.style.display = 'none'; };
  // Fallback als de iframe-HTML zelf niet laadt (bv. CDN-hapering): toon retry i.p.v. eindeloze spinner
  _perfState.loadTimer = setTimeout(() => {
    if(_perfState.loaded || !loader) return;
    loader.innerHTML =
      '<div style="text-align:center;padding:0 20px">' +
        '<div style="font-size:26px;margin-bottom:8px">⚠️</div>' +
        '<div style="font-family:var(--font-display);font-weight:800;color:var(--s27-ink);margin-bottom:6px">Het rapport laadt traag</div>' +
        '<p style="font-family:var(--font-body);font-size:13px;color:var(--s27-ink-3);max-width:340px;margin:0 auto 14px;line-height:1.5">Soms heeft de server even een momentje nodig. Probeer het zo opnieuw.</p>' +
        '<button class="s27-btn s27-btn-sm s27-btn-primary" id="s27-perf-retry" style="width:auto">Opnieuw proberen</button>' +
      '</div>';
    const rb = document.getElementById('s27-perf-retry');
    if(rb) rb.addEventListener('click', () => perfSelect(taskId));
  }, 15000);
  frame.src = engineUrl;
}

function bindPerfHeightListener(){
  if(_perfState.listenerBound) return;
  _perfState.listenerBound = true;
  window.addEventListener('message', ev => {
    const d = ev && ev.data;
    if(d && d.s27perf && d.height){
      const fr = $('s27-perf-frame');
      if(fr) fr.style.height = Math.max(600, Math.min(20000, d.height + 40)) + 'px';
    }
  });
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

  // Voorkeuren = platte tekst (geen ---STRUCTURED--- blob meer; server stript die ook)
  const voorkeurenTekst = decodeMakeString(data.algemene_voorkeuren || '').replace(/<[^>]+>/g,'').replace(/---STRUCTURED---[\s\S]*/,'').trim();

  // v3-B: contact = ClickUp Contact-taak (voornaam/achternaam/gsm/email) + company fields + lokale edits
  const cc = data.contact || {};
  const localC = loadContactCache();
  const c = {
    voornaam:   localC.voornaam || cc.voornaam || '',
    achternaam: localC.achternaam || cc.achternaam || '',
    gsm:        localC.gsm || cc.gsm || '',
    email:      localC.email || cc.email || data.facturatie_email || '',
    btw:        localC.btw || data.btw || '',
    adres:      localC.adres || '',
    website:    localC.website || data.website || ''
  };
  const rf = (label, name, val, ph) =>
    `<div class="s27-form-field s27-readfield"><span class="s27-readlabel">${esc(label)}</span><div class="s27-readvalue">${val ? esc(val) : '—'}</div><input type="text" name="${name}" value="${esc(val||'')}" placeholder="${esc(ph||'')}" hidden/></div>`;

  body.innerHTML = `
    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Huisstijl-bibliotheek</h2>
          <p class="s27-section-sub">Logo's, fonts, kleurpaletten, brand-PDFs, foto's… alles op één plek. Sleep bestanden in het kader of klik om te uploaden — wij en jij kunnen hier downloaden.</p>
        </div>
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
        <div class="s27-loading">Bibliotheek laden</div>
      </div>
    </div>
  `;

  attachBedrijfHandlers();
  loadHuisstijlFiles();
}

// v2.2 #74: lokale contact-cache per bedrijf (persoonsvelden die niet op Bedrijven-task staan)
function loadContactCache(){
  try { return JSON.parse(localStorage.getItem('s27_contact_' + (state.session && state.session.bedrijf_id)) || '{}'); }
  catch(e){ return {}; }
}
function saveContactCache(obj){
  try { localStorage.setItem('s27_contact_' + (state.session && state.session.bedrijf_id), JSON.stringify(obj)); } catch(e){}
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

// v3.1-6 — Huisstijl-bibliotheek staat nu op Google Drive (s27-drive, per-bedrijf map).
// list/upload/delete via service-account scenarios. De klant kan toevoegen + (zacht) verwijderen.
async function loadHuisstijlFiles(){
  const container = $('s27-files-flat');
  if(state.demoMode || !ENDPOINTS.huisstijlList){
    state.huisstijlFiles = getMockHuisstijlFiles();
    if(container) container.innerHTML = renderDriveFilesFlat(state.huisstijlFiles);
    return;
  }
  // v3.1-6 — zorg dat de Drive-structuur bestaat (idempotent; nieuwe klanten krijgen automatisch hun map)
  if(ENDPOINTS.driveEnsure){
    try { await api(ENDPOINTS.driveEnsure, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token }); } catch(e){}
  }
  try {
    const res = await api(ENDPOINTS.huisstijlList, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token });
    state.huisstijlFiles = (res.ok && res.data && Array.isArray(res.data.files)) ? res.data.files : [];
  } catch(e){
    state.huisstijlFiles = [];
  }
  if(container) container.innerHTML = renderDriveFilesFlat(state.huisstijlFiles);
}

function refreshFilesFlat(){
  const container = $('s27-files-flat');
  if(!container) return;
  container.innerHTML = renderDriveFilesFlat(state.huisstijlFiles || []);
}

function renderDriveFilesFlat(files){
  files = (files || []).slice(); // server levert al nieuwste-eerst
  if(!files.length){
    return '<div class="s27-files-empty"><div class="s27-files-empty-icon">📁</div><strong>Nog geen bestanden</strong><p>Upload je eerste huisstijl-bestand hierboven. Alles wat je hier zet, bewaren we veilig in jouw eigen map op onze Drive.</p></div>';
  }
  return files.map(renderDriveFileCard).join('');
}

function renderDriveFileCard(f){
  const fname = (f.name || 'bestand').replace(/^\[[A-Z]+\]\s*/, ''); // strip oude [CAT] prefix
  const ext = (fname.split('.').pop() || '').toLowerCase();
  const ico = ext === 'pdf' ? '📄' : (['jpg','jpeg','png','gif','webp','heic','svg'].includes(ext) ? '🖼️' : (['mp4','mov','avi','webm'].includes(ext) ? '🎬' : (['ai','psd','eps','indd'].includes(ext) ? '🎨' : (['ttf','otf','woff','woff2'].includes(ext) ? '🔤' : (['zip','rar','7z'].includes(ext) ? '🗜️' : '📎')))));
  const ts = f.modified ? new Date(f.modified).getTime() : 0;
  const dateStr = ts ? new Date(ts).toLocaleDateString('nl-BE', {day:'2-digit', month:'short', year:'numeric'}) : '';
  const sizeStr = f.size ? bytes(parseInt(f.size, 10)) : '';
  const meta = [dateStr, sizeStr].filter(Boolean).join(' · ');
  return `<div class="s27-filecard" data-file-id="${esc(f.id)}">
    <div class="s27-filecard-ico">${ico}</div>
    <div class="s27-filecard-body">
      <div class="s27-filecard-name">${esc(fname)}</div>
      <div class="s27-filecard-meta">${esc(meta)}</div>
    </div>
    <a class="s27-filecard-dl" href="${esc(f.url || '#')}" target="_blank" rel="noopener" title="Open ${esc(fname)}">
      <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M5 20h14v-2H5v2zM12 2v12l4-4 1.4 1.4L12 17l-5.4-5.6L8 10l4 4V2h0z"/></svg>
      Open
    </a>
    <button type="button" class="s27-filecard-del" data-file-id="${esc(f.id)}" data-file-name="${esc(fname)}" title="Verwijder ${esc(fname)}" aria-label="Verwijder ${esc(fname)}">
      <svg width="15" height="15" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
    </button>
  </div>`;
}

async function handleHuisstijlDelete(fileId, fileName){
  if(!fileId) return;
  const ok = window.confirm('"' + fileName + '" verwijderen uit je huisstijl-bibliotheek?\n\nHet bestand gaat naar de prullenbak — indien nodig kunnen we het nog herstellen.');
  if(!ok) return;
  const sel = (window.CSS && CSS.escape) ? CSS.escape(fileId) : fileId;
  const card = document.querySelector('.s27-filecard[data-file-id="' + sel + '"]');
  if(card){ card.style.opacity = '0.45'; card.style.pointerEvents = 'none'; }
  if(state.demoMode || !ENDPOINTS.huisstijlDelete){
    state.huisstijlFiles = (state.huisstijlFiles || []).filter(f => f.id !== fileId);
    refreshFilesFlat();
    return;
  }
  try {
    const res = await api(ENDPOINTS.huisstijlDelete, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token, file_id: fileId });
    if(res.ok && res.data && res.data.ok){
      state.huisstijlFiles = (state.huisstijlFiles || []).filter(f => f.id !== fileId);
      refreshFilesFlat();
    } else {
      if(card){ card.style.opacity = ''; card.style.pointerEvents = ''; }
      alert((res.data && res.data.message) || 'Verwijderen lukte niet — probeer het zo nog eens.');
    }
  } catch(e){
    if(card){ card.style.opacity = ''; card.style.pointerEvents = ''; }
    alert('Verwijderen lukte niet — probeer het zo nog eens.');
  }
}

function getMockHuisstijlFiles(){
  return [
    { id:'demo1', name:'logo-primair.svg', url:'#', mime:'image/svg+xml', size:24576, modified:'2026-05-20T10:00:00Z' },
    { id:'demo2', name:'brandbook-2026.pdf', url:'#', mime:'application/pdf', size:3145728, modified:'2026-05-18T14:30:00Z' },
    { id:'demo3', name:'kleurpalet.png', url:'#', mime:'image/png', size:102400, modified:'2026-05-15T09:12:00Z' }
  ];
}

/* =================================================================
   FACTURATIE-TABBLAD (v3.1-7) — bedrijfsbrede gegevens + per-project bevestiging
   ================================================================= */
async function renderFacturatieTab(){
  const body = $('s27-facturatie-body');
  if(!body) return;
  body.innerHTML = '<div class="s27-loading">Facturatie laden</div>';
  let data;
  if(state.demoMode || !ENDPOINTS.bedrijfContent){
    data = getMockBedrijfContent();
  } else {
    const res = await api(ENDPOINTS.bedrijfContent, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token });
    data = (res.ok && res.data && !res.data.error) ? res.data : getMockBedrijfContent();
  }
  state.bedrijfContent = data;

  const projs = ((state.dashboard && state.dashboard.actieve_projecten) || []).filter(p => disciplineCategory(p.discipline) === 'deliverable');
  const confirmed = loadFactuurConfirmCache();

  body.innerHTML = `
    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Algemene facturatiegegevens</h2>
          <p class="s27-section-sub">Deze gegevens gebruiken we standaard voor àl je facturen. Pas je iets aan? Dan verwerken Ilke en Arne het in onze administratie.</p>
        </div>
        <button class="s27-btn s27-btn-ghost s27-btn-sm" id="s27-factuur-edit-btn">✏️ Bewerken</button>
      </div>
      <div class="s27-contactform s27-contactform-readonly" id="s27-factuurform" data-edit-mode="off">
        <div class="s27-form-row">
          <div class="s27-form-field s27-readfield"><span class="s27-readlabel">Ondernemingsnummer / BTW</span><div class="s27-readvalue">${data.btw ? esc(data.btw) : '—'}</div><input type="text" name="ondernemingsnummer" value="${esc(data.btw||'')}" placeholder="BE0xxx.xxx.xxx" hidden/></div>
          <div class="s27-form-field s27-readfield"><span class="s27-readlabel">Facturatie-e-mail</span><div class="s27-readvalue">${data.facturatie_email ? esc(data.facturatie_email) : '—'}</div><input type="email" name="facturatie_email" value="${esc(data.facturatie_email||'')}" placeholder="facturen@bedrijf.be" hidden/></div>
        </div>
        <div class="s27-form-field s27-readfield">
          <span class="s27-readlabel">Facturatie-opmerkingen <span class="s27-info" tabindex="0" title="Bv. een PO-nummer dat verplicht op elke factuur moet, een vaste referentie, kostenplaats of afdeling.">&#9432;</span></span>
          <div class="s27-readvalue">${data.facturatie_opmerkingen ? esc(data.facturatie_opmerkingen) : '—'}</div>
          <input type="text" name="facturatie_opmerkingen" value="${esc(data.facturatie_opmerkingen||'')}" placeholder="Bv. PO-nummer PO-2026-001 vermelden op elke factuur" hidden/>
        </div>
        <div class="s27-contactform-foot" id="s27-factuurform-foot" hidden>
          <span class="s27-contactform-state" id="s27-factuurform-state"></span>
          <button class="s27-btn s27-btn-ghost s27-btn-sm" id="s27-factuurform-cancel">Annuleer</button>
          <button class="s27-btn s27-btn-sm s27-btn-primary" id="s27-factuurform-save">Wijzigingen opslaan</button>
        </div>
      </div>
    </div>

    <div class="s27-section">
      <div class="s27-section-head">
        <div>
          <h2 class="s27-section-title">Facturatie per project</h2>
          <p class="s27-section-sub">Wijkt de facturatie voor een specifiek project af (ander BTW-nummer, PO-nummer, aparte referentie)? Bevestig of pas het hier aan — enkel voor dat project. Doorlopende trajecten (social, ads, SEO) staan hier niet tussen.</p>
        </div>
      </div>
      <div class="s27-factuurprojects" id="s27-factuurprojects">
        ${projs.length ? projs.map(p => renderFactuurProjectRow(p, confirmed[p.task_id])).join('') : '<div class="s27-files-empty"><div class="s27-files-empty-icon">🧾</div><strong>Nog geen projecten om te factureren</strong><p>Zodra je een project hebt dat we factureren, verschijnt het hier.</p></div>'}
      </div>
    </div>
  `;
  wireFacturatieForm();
  attachFactuurProjectHandlers();

  // deep-link vanuit de goedkeuring-pop-up: open meteen de juiste project-rij
  if(state.facturatiePendingProject){
    const pid = state.facturatiePendingProject; state.facturatiePendingProject = null;
    const sel = (window.CSS && CSS.escape) ? CSS.escape(pid) : pid;
    const row = document.querySelector('.s27-fpr[data-task-id="' + sel + '"]');
    if(row){ const btn = row.querySelector('.s27-fpr-toggle'); if(btn) btn.click(); setTimeout(() => row.scrollIntoView({ behavior:'smooth', block:'center' }), 60); }
  }
}

function renderFactuurProjectRow(p, isConfirmed){
  const di = getDisciplineInfo(p.discipline);
  const bc = state.bedrijfContent || {};
  return `<div class="s27-fpr" data-task-id="${esc(p.task_id)}">
    <div class="s27-fpr-head">
      <span class="s27-fpr-disc" style="--accent:${di.accent}">${esc(di.label)}</span>
      <div class="s27-fpr-name">${esc(p.naam || 'Project')}</div>
      ${isConfirmed ? '<span class="s27-fpr-badge">✓ Bevestigd</span>' : ''}
      <button type="button" class="s27-btn s27-btn-ghost s27-btn-sm s27-fpr-toggle">${isConfirmed ? 'Aanpassen' : 'Bevestig facturatie'}</button>
    </div>
    <div class="s27-fpr-editor" hidden>
      <div class="s27-form-row">
        <div class="s27-form-field"><label class="s27-readlabel">Ondernemingsnummer / BTW</label><input type="text" name="ondernemingsnummer" value="${esc(bc.btw||'')}" placeholder="BE0xxx.xxx.xxx"></div>
        <div class="s27-form-field"><label class="s27-readlabel">Facturatie-e-mail</label><input type="email" name="facturatie_email" value="${esc(bc.facturatie_email||'')}" placeholder="facturen@bedrijf.be"></div>
      </div>
      <div class="s27-form-field"><label class="s27-readlabel">Opmerking voor dit project <span class="s27-info" tabindex="0" title="Bv. een PO-nummer, aparte referentie of afwijkend facturatie-adres specifiek voor dit project.">&#9432;</span></label><input type="text" name="opmerking" placeholder="Bv. PO-nummer PO-2026-044"></div>
      <p class="s27-factuurcheck-note">Wijzigingen gelden enkel voor dit project; je algemene gegevens blijven ongewijzigd.</p>
      <div class="s27-fpr-foot">
        <span class="s27-fpr-state"></span>
        <button type="button" class="s27-btn s27-btn-ghost s27-btn-sm s27-fpr-cancel">Annuleer</button>
        <button type="button" class="s27-btn s27-btn-sm s27-btn-primary s27-fpr-save">Bevestigen</button>
      </div>
    </div>
  </div>`;
}

function attachFactuurProjectHandlers(){
  document.querySelectorAll('.s27-fpr').forEach(row => {
    const toggle = row.querySelector('.s27-fpr-toggle');
    const editor = row.querySelector('.s27-fpr-editor');
    const cancel = row.querySelector('.s27-fpr-cancel');
    const save = row.querySelector('.s27-fpr-save');
    const stateEl = row.querySelector('.s27-fpr-state');
    if(toggle && editor) toggle.addEventListener('click', () => { editor.hidden = !editor.hidden; });
    if(cancel && editor) cancel.addEventListener('click', () => { editor.hidden = true; });
    if(save) save.addEventListener('click', async () => {
      save.disabled = true; save.textContent = 'Bevestigen…'; if(stateEl) stateEl.textContent = 'Bezig…';
      const get = n => { const el = row.querySelector('[name="'+n+'"]'); return el ? el.value.trim() : ''; };
      const payload = {
        task_id: row.dataset.taskId,
        bedrijf_id: state.session.bedrijf_id,
        session_token: state.session.session_token,
        klant_naam: state.session.bedrijfsnaam,
        project_naam: ((row.querySelector('.s27-fpr-name') || {}).textContent || '').trim(),
        ondernemingsnummer: get('ondernemingsnummer'),
        facturatie_email: get('facturatie_email'),
        opmerking: get('opmerking')
      };
      try {
        if(ENDPOINTS.projectFacturatieSave && !state.demoMode) await api(ENDPOINTS.projectFacturatieSave, payload);
        else await new Promise(r => setTimeout(r, 300));
        markFactuurConfirmed(payload.task_id);
        if(stateEl) stateEl.textContent = '✓ Bevestigd';
        setTimeout(() => renderFacturatieTab(), 700);
      } catch(err){
        console.error('[Studio 27] project-facturatie save failed:', err);
        if(stateEl) stateEl.textContent = 'Iets ging mis — probeer opnieuw';
        save.disabled = false; save.textContent = 'Bevestigen';
      }
    });
  });
}

// Company-brede facturatie-form (verplaatst uit Mijn bedrijf naar Facturatie-tab)
function wireFacturatieForm(){
  const factuurForm = $('s27-factuurform');
  const factuurEditBtn = $('s27-factuur-edit-btn');
  const factuurSave = $('s27-factuurform-save');
  const factuurCancel = $('s27-factuurform-cancel');
  const factuurFoot = $('s27-factuurform-foot');
  const factuurState = $('s27-factuurform-state');
  function toggleFactuurEdit(on){
    if(!factuurForm) return;
    factuurForm.dataset.editMode = on ? 'on' : 'off';
    factuurForm.classList.toggle('s27-contactform-readonly', !on);
    factuurForm.querySelectorAll('.s27-readfield').forEach(field => {
      const readValue = field.querySelector('.s27-readvalue');
      const input = field.querySelector('input');
      if(readValue) readValue.hidden = on;
      if(input) input.hidden = !on;
    });
    if(factuurFoot) factuurFoot.hidden = !on;
    if(factuurEditBtn) factuurEditBtn.hidden = on;
  }
  if(factuurEditBtn) factuurEditBtn.addEventListener('click', () => toggleFactuurEdit(true));
  if(factuurCancel) factuurCancel.addEventListener('click', () => { renderFacturatieTab(); });
  if(factuurForm && factuurSave){
    factuurSave.addEventListener('click', async () => {
      factuurSave.disabled = true; factuurSave.textContent = 'Opslaan…';
      if(factuurState) factuurState.textContent = 'Bezig…';
      const get = n => { const el = factuurForm.querySelector('[name="'+n+'"]'); return el ? el.value.trim() : ''; };
      const payload = {
        bedrijf_id: state.session.bedrijf_id,
        session_token: state.session.session_token,
        klant_naam: state.session.bedrijfsnaam,
        ondernemingsnummer: get('ondernemingsnummer'),
        facturatie_email: get('facturatie_email'),
        facturatie_opmerkingen: get('facturatie_opmerkingen')
      };
      try {
        if(ENDPOINTS.facturatieSave && !state.demoMode){ await api(ENDPOINTS.facturatieSave, payload); }
        else { await new Promise(r => setTimeout(r, 400)); }
        if(state.bedrijfContent){
          state.bedrijfContent.btw = payload.ondernemingsnummer;
          state.bedrijfContent.facturatie_email = payload.facturatie_email;
          state.bedrijfContent.facturatie_opmerkingen = payload.facturatie_opmerkingen;
        }
        factuurForm.querySelectorAll('.s27-readfield').forEach(field => {
          const input = field.querySelector('input');
          const readValue = field.querySelector('.s27-readvalue');
          if(input && readValue) readValue.textContent = input.value || '—';
        });
        if(factuurState) factuurState.textContent = '✓ Opgeslagen — Ilke en Arne werken het bij';
        setTimeout(() => toggleFactuurEdit(false), 900);
      } catch(err){
        console.error('[Studio 27] facturatie save failed:', err);
        if(factuurState) factuurState.textContent = 'Iets ging mis — probeer opnieuw';
      }
      factuurSave.disabled = false; factuurSave.textContent = 'Wijzigingen opslaan';
      setTimeout(() => { if(factuurState) factuurState.textContent = ''; }, 4000);
    });
  }
}

function loadFactuurConfirmCache(){
  try { return JSON.parse(localStorage.getItem('s27_factuur_confirm_' + (state.session && state.session.bedrijf_id)) || '{}'); }
  catch(e){ return {}; }
}
function markFactuurConfirmed(taskId){
  try { const c = loadFactuurConfirmCache(); c[taskId] = true; localStorage.setItem('s27_factuur_confirm_' + (state.session && state.session.bedrijf_id), JSON.stringify(c)); } catch(e){}
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
  // Voorkeuren editor — PLATTE TEKST (geen blob meer, #75)
  const ta = $('s27-voorkeuren-input');
  const btn = $('s27-voorkeuren-save');
  const stateLabel = $('s27-voorkeuren-state');

  if(ta && btn){
    ta.addEventListener('input', () => { btn.disabled = false; if(stateLabel) stateLabel.textContent = 'Niet opgeslagen'; });
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Bezig…';
      if(stateLabel) stateLabel.textContent = 'Bezig met opslaan…';
      const plain = ta.value.trim();
      if(ENDPOINTS.bedrijfVoorkeuren && !state.demoMode){
        await api(ENDPOINTS.bedrijfVoorkeuren, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token, voorkeuren: plain });
        if(state.bedrijfContent) state.bedrijfContent.algemene_voorkeuren = plain;
      } else {
        await new Promise(r => setTimeout(r, 400));
      }
      btn.textContent = 'Opslaan';
      if(stateLabel) stateLabel.textContent = '✓ Opgeslagen';
      setTimeout(() => { if(stateLabel) stateLabel.textContent = ''; }, 2500);
    });
  }

  // Contact form edit-modus (read-only default, #67/#74)
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
  if(contactCancel) contactCancel.addEventListener('click', () => { renderInstellingenTab(); });

  if(contactForm && contactSave){
    contactSave.addEventListener('click', async () => {
      contactSave.disabled = true; contactSave.textContent = 'Versturen…';
      if(contactState) contactState.textContent = 'Bezig…';
      const get = n => { const el = contactForm.querySelector('[name="'+n+'"]'); return el ? el.value.trim() : ''; };
      const payload = {
        bedrijf_id: state.session.bedrijf_id,
        session_token: state.session.session_token,
        klant_naam: state.session.bedrijfsnaam,
        voornaam: get('voornaam'), achternaam: get('achternaam'), gsm: get('gsm'),
        email: get('email'), btw: get('btw'), adres: get('adres'), website: get('website')
      };
      try {
        // Persist lokaal (client ziet eigen wijziging direct) + stuur naar team via bedrijfContact
        saveContactCache({ voornaam:payload.voornaam, achternaam:payload.achternaam, gsm:payload.gsm, email:payload.email, btw:payload.btw, adres:payload.adres, website:payload.website });
        if(ENDPOINTS.bedrijfContact && !state.demoMode){
          await api(ENDPOINTS.bedrijfContact, payload);
        }
        if(contactState) contactState.textContent = '✓ Opgeslagen — Ilke en Arne werken het binnen 24u bij';
        contactForm.querySelectorAll('.s27-readfield').forEach(field => {
          const input = field.querySelector('input');
          const readValue = field.querySelector('.s27-readvalue');
          if(input && readValue) readValue.textContent = input.value || '—';
        });
        setTimeout(() => toggleEditMode(false), 900);
      } catch(err){
        console.error('[Studio 27] contact save failed:', err);
        if(contactState) contactState.textContent = 'Iets ging mis — probeer opnieuw';
      }
      contactSave.disabled = false; contactSave.textContent = 'Wijzigingen opslaan';
      setTimeout(() => { if(contactState) contactState.textContent = ''; }, 4000);
    });
  }

  // Upload zone (één enkele, #68/#75)
  const drop = $('s27-drop-bedrijf');
  const input = $('s27-up-input-bedrijf');
  if(input) input.addEventListener('change', e => handleFiles(e.target.files, 'bedrijf', 'overig'));
  if(drop){
    ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('dragover'); }));
    drop.addEventListener('drop', e => handleFiles(e.dataTransfer.files, 'bedrijf', 'overig'));
  }

  // v3.1-6 — gedelegeerde 🗑-handler op de bibliotheek-lijst (overleeft re-renders van innerHTML)
  const filesFlat = $('s27-files-flat');
  if(filesFlat){
    filesFlat.addEventListener('click', e => {
      const del = e.target.closest('.s27-filecard-del');
      if(del){ e.preventDefault(); handleHuisstijlDelete(del.dataset.fileId, del.dataset.fileName || 'dit bestand'); }
    });
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
// v3.1: opgeleverde/goedgekeurde projecten (archief) — bron voor de "Opgeleverd"-filter in Projecten.
function getOpgeleverdProjects(dash){
  dash = dash || state.dashboard || {};
  const goedgekeurdActief = (dash.actieve_projecten || []).filter(p => isAfgerondStatus(p) && disciplineCategory(p.discipline) === 'deliverable').map(p => ({
    task_id: p.task_id, naam: p.naam, discipline: p.discipline,
    afgerond_op: p.opleverdatum || '', deliverables: p.deliverables || []
  }));
  const historie = (dash.historie_3mnd || []).filter(p => disciplineCategory(p.discipline) === 'deliverable').map(p => ({
    task_id: p.task_id, naam: p.naam, discipline: p.discipline,
    afgerond_op: p.afgerond_op || '', deliverables: p.deliverables || []
  }));
  const seen = new Set();
  const all = [...goedgekeurdActief, ...historie].filter(p => {
    if(!p.task_id || seen.has(p.task_id)) return p.task_id ? false : true;
    seen.add(p.task_id); return true;
  });
  all.sort((a,b) => (b.afgerond_op ? new Date(b.afgerond_op).getTime() : 0) - (a.afgerond_op ? new Date(a.afgerond_op).getTime() : 0));
  return all;
}

function renderOpgeleverdArchive(dash){
  const all = getOpgeleverdProjects(dash);
  if(!all.length){
    return '<div class="s27-empty">' +
      '<div class="s27-empty-icon"><svg width="22" height="22"><use href="#s27p-check"/></svg></div>' +
      '<div class="s27-empty-title">Nog geen opgeleverde projecten</div>' +
      '<p class="s27-empty-sub">Zodra je eerste project is opgeleverd, vind je hier alle deliverables — voor altijd bewaard, klik en download.</p>' +
    '</div>';
  }
  const byYear = {};
  all.forEach(p => {
    const year = p.afgerond_op ? new Date(p.afgerond_op).getFullYear() : 'Onbekend';
    (byYear[year] = byYear[year] || []).push(p);
  });
  const years = Object.keys(byYear).sort((a,b) => Number(b)-Number(a));
  let html = '<div class="s27-archive-intro"><h3>Opgeleverde projecten</h3>' +
    '<p>Klik op een project om de deliverables te zien. Alle links blijven werkend.</p></div>';
  years.forEach(y => {
    html += '<div class="s27-archive-year"><h4>' + esc(y) + ' <span class="s27-badge s27-badge-muted">' + byYear[y].length + '</span></h4>' +
      '<div class="s27-archive-list">' + byYear[y].map(renderArchiveCard).join('') + '</div></div>';
  });
  return html;
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
  { id:'arne',    naam:'Arne Goetschalckx', email:'arne@studio27.be',    rol:'Zaakvoerder — offertes & nieuwe projecten' },
  { id:'ilke',    naam:'Ilke Meeusen',      email:'ilke@studio27.be',    rol:'Accountmanager — bestaande klanten / opstart' },
  { id:'vincent', naam:'Vincent Verleije',  email:'vincent@studio27.be', rol:'Zaakvoerder — strategie & grote trajecten' }
];

// v3-D: project_type → PandaDoc template-ID voor échte prijsindicatie (stap 2).
// Alleen Adverteren bekend (28/5). Andere disciplines: template-ID nog van Vincent → ochtendlijst.
const PROJECT_TEMPLATES = {
  'Advertentiebeheer': 'HQRvZ3sdrEm2GcuNsdP2Uf'
};
const PROJECT_TYPE_OPTIONS = [
  { v:'Video + Fotografie',                              l:'Video + Fotografie' },
  { v:'Webdesign',                                       l:'Webdesign / nieuwe site' },
  { v:'Branding / huisstijl / grafisch ontwerp',         l:'Branding, huisstijl of grafisch ontwerp' },
  { v:'Social media beheer',                             l:'Social media beheer' },
  { v:'Advertentiebeheer',                               l:'Advertentiebeheer' },
  { v:'Online organische vindbaarheid (SEO + GEO)',      l:'Online organische vindbaarheid (SEO + GEO)' },
  { v:'Opleiding op maat',                               l:'Opleiding op maat' },
  { v:'AI & automatisatie',                              l:'AI & automatisatie' },
  { v:'Anders',                                          l:'Iets anders…' }
];

function renderNieuwTab(){
  const body = $('s27-nieuw-body');
  if(!body) return;
  if(state._nieuwProjectSubmitted){
    body.innerHTML = renderNieuwProjectSuccess(state._nieuwProjectSubmitted);
    wireNieuwSuccess();
    return;
  }
  if(!state._nieuwStep) state._nieuwStep = 1;
  if(!state._nieuwData) state._nieuwData = {};
  const step = state._nieuwStep;
  body.innerHTML = renderNieuwStepper(step) +
    (step === 1 ? renderNieuwStep1() : step === 2 ? renderNieuwStep2() : renderNieuwStep3());
  if(step === 1) wireNieuwStep1();
  else if(step === 2) wireNieuwStep2();
  else wireNieuwStep3();
}

function renderNieuwStepper(active){
  const steps = [{n:1,label:'Wat wil je?'},{n:2,label:'Prijsindicatie'},{n:3,label:'Bevestigen'}];
  return '<div class="s27-wiz-steps">' + steps.map((s,i) =>
    (i ? '<span class="s27-wiz-sep"></span>' : '') +
    `<div class="s27-wiz-step${s.n===active?' is-active':''}${s.n<active?' is-done':''}">` +
      `<span class="s27-wiz-num">${s.n<active?'✓':s.n}</span>` +
      `<span class="s27-wiz-label">${esc(s.label)}</span>` +
    '</div>'
  ).join('') + '</div>';
}

function renderNieuwStep1(){
  const d = state._nieuwData;
  return `
    <div class="s27-nieuw-intro">
      <h3>Wat heb je nodig?</h3>
      <p>Vertel ons je idee in een paar regels. Op basis hiervan tonen we je meteen een <strong>prijsindicatie</strong> — vrijblijvend.</p>
    </div>
    <form class="s27-nieuw-form" id="s27-nieuw-form" autocomplete="off">
      <label class="s27-form-field">
        <span>Type project <em>*</em></span>
        <select name="project_type" id="s27-pt-select" required>
          <option value="">Kies een type…</option>
          ${PROJECT_TYPE_OPTIONS.map(o => `<option value="${esc(o.v)}"${d.project_type===o.v?' selected':''}>${esc(o.l)}</option>`).join('')}
        </select>
      </label>

      <div id="s27-pt-sub" class="s27-pt-sub" hidden></div>

      <label class="s27-form-field">
        <span>Gewenste opleverdatum</span>
        <input type="date" name="gewenste_opleverdatum" value="${esc(d.gewenste_opleverdatum || '')}"/>
      </label>

      <label class="s27-form-field">
        <span>Omschrijf je idee in een paar regels <em>*</em></span>
        <textarea name="omschrijving" rows="6" required placeholder="Voorbeeld: nieuwe corporate website met meertalig CMS, koppeling met onze Odoo-database en focus op SEO. Designstijl: modern, donker, met veel beweging.">${esc(d.omschrijving || '')}</textarea>
      </label>

      <div class="s27-form-actions">
        <button type="submit" class="s27-btn s27-btn-primary" id="s27-nieuw-next1">Volgende → Prijsindicatie</button>
        <p class="s27-form-info">Stap 1 van 3 — je kan altijd terug en aanpassen.</p>
      </div>
      <p class="s27-form-error" id="s27-nieuw-error" style="display:none"></p>
    </form>
  `;
}

function wireNieuwStep1(){
  const form = $('s27-nieuw-form');
  const ptSelect = $('s27-pt-select');
  if(ptSelect) ptSelect.addEventListener('change', () => renderProjectSubQuestions(ptSelect.value));
  // Herstel sub-vragen + antwoorden bij terugkeer naar stap 1
  const d = state._nieuwData;
  if(d.project_type){
    renderProjectSubQuestions(d.project_type);
    if(d.sub_answers){
      Object.entries(d.sub_answers).forEach(([k,v]) => {
        const el = form && form.querySelector(`[name="sub_${k}"]`);
        if(el){ el.value = v; }
      });
      // shoot stap-2 opnieuw tonen als die gekozen was
      const shootSel = form && form.querySelector('[data-triggers-shootstep]');
      if(shootSel && /ja|we willen/i.test(shootSel.value)){
        const step2 = $('s27-shoot-step2');
        if(step2){ step2.hidden = false; step2.innerHTML = renderShootStep2(); wireShootStep2();
          Object.entries(d.sub_answers).forEach(([k,v]) => { const el = step2.querySelector(`[name="sub_${k}"]`); if(el) el.value = v; });
        }
      }
    }
  }
  if(form) form.addEventListener('submit', e => {
    e.preventDefault();
    const errEl = $('s27-nieuw-error');
    if(!form.project_type.value){ if(errEl){errEl.style.display='block';errEl.textContent='Kies eerst een type project.';} return; }
    if(!form.omschrijving.value.trim()){ if(errEl){errEl.style.display='block';errEl.textContent='Vertel ons kort wat je wil.';} return; }
    // verzamel sub-antwoorden
    const subAnswers = {};
    Array.from(form.querySelectorAll('[name^="sub_"]')).forEach(el => { if(el.value) subAnswers[el.name.replace('sub_','')] = el.value; });
    state._nieuwData = Object.assign({}, state._nieuwData, {
      project_type: form.project_type.value,
      gewenste_opleverdatum: form.gewenste_opleverdatum.value,
      omschrijving: form.omschrijving.value.trim(),
      sub_answers: subAnswers
    });
    state._nieuwStep = 2;
    renderNieuwTab();
  });
}

function renderNieuwStep2(){
  return `
    <div class="s27-nieuw-intro">
      <h3>Jouw prijsindicatie</h3>
      <p>Op basis van je keuze. Dit is een richtprijs — je definitieve offerte stemmen we samen af.</p>
    </div>
    <div id="s27-price-box" class="s27-price-box"><div class="s27-loading" style="padding:20px">Prijzen ophalen…</div></div>
    <div class="s27-form-actions s27-wiz-nav">
      <button type="button" class="s27-btn s27-btn-ghost" id="s27-wiz-back2">← Terug</button>
      <button type="button" class="s27-btn s27-btn-primary" id="s27-wiz-next2">Volgende → Bevestigen</button>
    </div>
  `;
}

function wireNieuwStep2(){
  const back = $('s27-wiz-back2'), next = $('s27-wiz-next2');
  if(back) back.addEventListener('click', () => { state._nieuwStep = 1; renderNieuwTab(); });
  if(next) next.addEventListener('click', () => { state._nieuwStep = 3; renderNieuwTab(); });
  loadPricing();
}

async function loadPricing(){
  const box = $('s27-price-box');
  if(!box) return;
  const d = state._nieuwData;
  const template = PROJECT_TEMPLATES[d.project_type];
  // Geen bekend template → nette indicatieve weergave (richtprijs op maat)
  if(!template){
    state._nieuwData.prijs_indicatie = 'Op maat — wordt in de offerte gedetailleerd';
    box.innerHTML = `
      <div class="s27-price-onmaat">
        <div class="s27-price-onmaat-icon">✦</div>
        <strong>Prijs op maat voor ${esc(d.project_type)}</strong>
        <p>Voor dit type stellen we je prijs persoonlijk samen op basis van je antwoorden. Je krijgt het volledige detail in je offerte — transparant en zonder verrassingen.</p>
      </div>`;
    return;
  }
  try {
    const res = await api(ENDPOINTS.pandadocPricelist, { session_token: state.session.session_token, template });
    if(res.ok && res.data && res.data.ok && Array.isArray(res.data.sections) && res.data.sections.length){
      box.innerHTML = renderPriceSections(res.data.sections);
      // bewaar totaal voor mee te sturen
      const totaal = res.data.sections.reduce((sum, s) => sum + (parseFloat(s.total || s.summary && s.summary.total || 0) || 0), 0);
      state._nieuwData.prijs_indicatie = res.data.sections.map(s => (s.name||'Sectie') + ': €' + (s.total||'?')).join(' · ');
    } else {
      throw new Error('geen prijsdata');
    }
  } catch(e){
    state._nieuwData.prijs_indicatie = 'Op maat (prijslijst niet beschikbaar)';
    box.innerHTML = `
      <div class="s27-price-onmaat">
        <div class="s27-price-onmaat-icon">✦</div>
        <strong>Prijs op maat</strong>
        <p>We konden de standaard-prijslijst nu niet ophalen, maar geen zorgen — je krijgt een offerte op maat met het volledige detail.</p>
      </div>`;
  }
}

function stripHtml(s){ return (s==null?'':String(s)).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim(); }
function fmtEuro(v){ const n = parseFloat(v); if(isNaN(n)) return ''; return '€' + n.toLocaleString('nl-BE', {minimumFractionDigits:0, maximumFractionDigits:2}); }

function renderPriceSections(sections){
  return sections.map(sec => {
    const items = Array.isArray(sec.items) ? sec.items : [];
    return `<div class="s27-price-section">
      <div class="s27-price-sec-head"><strong>${esc(sec.name || 'Pakket')}</strong>${sec.total ? `<span class="s27-price-sec-total">${esc(fmtEuro(sec.total))}</span>` : ''}</div>
      <div class="s27-price-items">
        ${items.map(it => `<div class="s27-price-item">
          <div class="s27-price-item-main">
            <span class="s27-price-item-name">${esc(it.name || '')}</span>
            ${it.description ? `<span class="s27-price-item-desc">${esc(stripHtml(it.description))}</span>` : ''}
          </div>
          <span class="s27-price-item-price">${esc(fmtEuro(it.price))}${it.qty && parseFloat(it.qty)>1 ? ' <small>× '+esc(it.qty)+'</small>' : ''}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('') + '<p class="s27-price-note">Richtprijzen excl. btw. Je definitieve offerte stemmen we samen af op je specifieke wensen.</p>';
}

function renderNieuwStep3(){
  const d = state._nieuwData;
  const isShoot = d.project_type === 'Video + Fotografie';
  const intentie = d._intentie || '';
  return `
    <div class="s27-nieuw-intro">
      <h3>Hoe wil je verder?</h3>
      <p>Kies wat het beste past. Je aanvraag komt sowieso bij ons binnen — we pakken het meteen op.</p>
    </div>
    <div class="s27-choice-cards">
      <button type="button" class="s27-choice-card${intentie==='offerte_meeting'?' is-chosen':''}" data-intentie="offerte_meeting">
        <span class="s27-choice-icon">📄</span>
        <strong>Gedetailleerde offerte + gesprek</strong>
        <span class="s27-choice-sub">We maken een offerte op maat en plannen een kort gesprek om alles scherp te krijgen.</span>
      </button>
      <button type="button" class="s27-choice-card${intentie==='direct_start'?' is-chosen':''}" data-intentie="direct_start">
        <span class="s27-choice-icon">🚀</span>
        <strong>Dit klopt — laten we starten</strong>
        <span class="s27-choice-sub">Bevestig en plan meteen je ${isShoot ? 'shoot' : 'opstartmoment'} in. We zetten alles in gang.</span>
      </button>
    </div>
    <form class="s27-nieuw-form" id="s27-nieuw-form3" autocomplete="off"${intentie ? '' : ' hidden'}>
      <label class="s27-form-field">
        <span>Naar wie sturen we het? <em>*</em></span>
        <select name="contact_owner" id="s27-contact-owner" required>
          ${PROJECT_CONTACT_OPTIONS.map(o => `<option value="${esc(o.id)}"${o.id === (d.contact_owner||'arne') ? ' selected' : ''}>${esc(o.naam)} — ${esc(o.rol)}</option>`).join('')}
        </select>
      </label>
      <div class="s27-form-actions s27-wiz-nav">
        <button type="button" class="s27-btn s27-btn-ghost" id="s27-wiz-back3">← Terug</button>
        <button type="submit" class="s27-btn s27-btn-primary" id="s27-nieuw-submit">${intentie==='direct_start'?'Bevestigen & inplannen':'Aanvraag versturen'}</button>
      </div>
      <p class="s27-form-error" id="s27-nieuw-error" style="display:none"></p>
    </form>
  `;
}

function wireNieuwStep3(){
  const back = $('s27-wiz-back3');
  if(back) back.addEventListener('click', () => { state._nieuwStep = 2; renderNieuwTab(); });
  document.querySelectorAll('.s27-choice-card').forEach(card => {
    card.addEventListener('click', () => {
      state._nieuwData._intentie = card.dataset.intentie;
      renderNieuwTab(); // re-render om de juiste knop-tekst + form te tonen
    });
  });
  const form = $('s27-nieuw-form3');
  if(form) form.addEventListener('submit', submitNieuwProject);
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
  // v2.2 #76: GEEN keuze per content creator. Klant kiest een shootMOMENT (dag).
  // We tellen per dag hoeveel content creators vrij zijn; tonen dagen waar genoeg vrij zijn voor het gekozen aantal.
  const hosts = data.hosts || [];
  const shoots = (data.shoots || []).concat(data.shoots_27m || []);
  const vakantie = data.vakantie || [];
  const now = Date.now();
  const startMs = now + 48 * 3600000; // geen last-minute
  const horizonMs = now + (28 * 86400000); // 4 weken vooruit
  // hoeveel creators nodig? uit sub_shoot_creators select
  const creatorsSel = document.querySelector('[name="sub_shoot_creators"]');
  const needed = creatorsSel && /2\+/.test(creatorsSel.value) ? 2 : 1;

  // Per host: bezette dagen (shoots + vakantie)
  const bezetByHost = {};
  hosts.forEach(h => bezetByHost[h.id] = new Set());
  shoots.forEach(t => {
    const due = parseInt(t.due_date, 10);
    if(!due || due > horizonMs) return;
    const day = new Date(due).toISOString().slice(0,10);
    (t.assignees || []).forEach(a => { if(bezetByHost[a.id]) bezetByHost[a.id].add(day); });
  });
  vakantie.forEach(v => {
    const start = parseInt(v.start_date || v.due_date, 10);
    const end = parseInt(v.due_date || v.start_date, 10);
    if(!start) return;
    for(let cur = start; cur <= end && cur <= horizonMs; cur += 86400000){
      const day = new Date(cur).toISOString().slice(0,10);
      (v.assignees || []).forEach(a => { if(bezetByHost[a.id]) bezetByHost[a.id].add(day); });
    }
  });
  // Per dag: tel vrije content creators; toon dagen met >= needed vrij
  const dagen = [];
  for(let d = Math.ceil(startMs / 86400000) * 86400000; d <= horizonMs && dagen.length < 8; d += 86400000){
    const dt = new Date(d);
    const dow = dt.getDay();
    if(dow === 0 || dow === 6) continue;
    const dayKey = dt.toISOString().slice(0,10);
    const vrijCount = hosts.filter(h => !bezetByHost[h.id].has(dayKey)).length;
    if(vrijCount >= needed){
      dagen.push({ day: dayKey, label: dt.toLocaleDateString('nl-BE',{weekday:'long',day:'2-digit',month:'long'}), vrij: vrijCount });
    }
  }
  const creatorTxt = needed === 1 ? '1 content creator' : needed + ' content creators';
  if(!dagen.length){
    return '<div class="s27-shoot-head"><strong>📸 Beschikbare shootdagen</strong><span>Geen dagen met ' + esc(creatorTxt) + ' vrij in de komende 4 weken</span></div>' +
      '<p class="s27-shoot-info">Geen geschikt moment? <a href="#" data-dm="shoot" data-dm-onderwerp="Shoot inplannen — geen geschikt moment gevonden">Stuur ons je voorkeuren</a> en we zoeken samen.</p>';
  }
  return '<div class="s27-shoot-head"><strong>📸 Beschikbare shootdagen</strong><span>Kies een dag — we wijzen ' + esc(creatorTxt) + ' toe (jij hoeft niet te kiezen wie)</span></div>' +
    '<div class="s27-shoot-daygrid">' +
      dagen.map(dg => `<button type="button" class="s27-shoot-day" data-day="${esc(dg.day)}" data-label="${esc(dg.label)}">
        <span class="s27-shoot-day-label">${esc(dg.label)}</span>
        <span class="s27-shoot-day-free">${dg.vrij} creator${dg.vrij===1?'':'s'} vrij</span>
      </button>`).join('') +
    '</div>' +
    '<p class="s27-shoot-info">⚡ Klik op een dag om die als voorkeur mee te sturen. Definitieve bevestiging volgt na de offerte.</p>';
}

// Globale click handler voor shoot-dag keuze → toevoegen aan formulier
document.addEventListener('click', e => {
  const slot = e.target.closest && e.target.closest('.s27-shoot-day');
  if(!slot) return;
  document.querySelectorAll('.s27-shoot-day').forEach(s => s.classList.remove('is-chosen'));
  slot.classList.add('is-chosen');
  const form = $('s27-nieuw-form');
  if(!form) return;
  Array.from(form.querySelectorAll('input[name="sub_shoot_voorkeur"]')).forEach(el => el.remove());
  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.name = 'sub_shoot_voorkeur';
  hidden.value = 'Voorkeursdatum: ' + slot.dataset.label;
  form.appendChild(hidden);
});

/* =================================================================
   SHOOT INPLANNEN IN DE PROJECT-VIEW (v3.2-3 #94)
   Op een shoot-taak met voorwaarden vervuld (contact/bedrijf + time-estimate +
   aantal content creators) tonen we de beschikbare shootdagen. Een dag kiezen
   opent de berichten-composer met de dag ingevuld → team bevestigt de afspraak.
   ================================================================= */
function projectShootEligible(proj, detail){
  const st = (proj.status || '').toLowerCase().replace(/\s+/g, '_');
  const d = detail || {};
  const isShoot = d.type_job === '6' || proj.discipline === 'video_fotografie';
  if(!isShoot) return 'none';
  if(st === 'goedgekeurd' || isAfgerondStatus(proj)) return 'none'; // al opgeleverd → niet meer inplannen
  const hasOwner = d.has_contact === 'yes' || d.has_bedrijf === 'yes' || proj.discipline === 'video_fotografie';
  const hasTime = d.time_estimate && parseInt(d.time_estimate, 10) > 0;
  const hasCreators = d.content_creators !== '' && d.content_creators != null;
  return (hasOwner && hasTime && hasCreators) ? 'eligible' : 'incomplete';
}

function renderProjectShootBlock(proj, detail){
  const mode = projectShootEligible(proj, detail);
  if(mode === 'none') return '';
  if(mode === 'incomplete'){
    return '<div class="s27-pv-section s27-pv-section-shoot">' +
      '<h3 class="s27-pv-section-title">📸 Shoot inplannen</h3>' +
      '<p class="s27-pv-fb-lead">We bereiden je shoot voor. Zodra de duur en het aantal content creators vastliggen, kan je hier meteen een moment kiezen. Een vraag? <a href="#" data-dm="shoot" data-dm-onderwerp="Shoot inplannen — ' + esc(proj.naam || '') + '">stuur ons een bericht</a>.</p>' +
    '</div>';
  }
  return '<div class="s27-pv-section s27-pv-section-shoot">' +
    '<h3 class="s27-pv-section-title">📸 Plan je shoot in</h3>' +
    '<p class="s27-pv-fb-lead">Kies een dag die jou past — wij wijzen de juiste content creator(s) toe, jij hoeft niet te kiezen wie. Na je keuze bevestigt het team de definitieve afspraak.</p>' +
    '<div id="s27-pv-shootbox"><div class="s27-loading" style="padding:14px">Beschikbare shootdagen ophalen…</div></div>' +
  '</div>';
}

// Veralgemeend inplan-blok: shoot (bestaand) OF strategiesessie / opstartmeeting / meeting.
function renderProjectScheduleBlock(proj, detail){
  const t = taskScheduleType(proj);
  if(t === 'shoot') return renderProjectShootBlock(proj, detail);
  if(!t) return '';
  const cfg = {
    strategie: { ic:'🎯', title:'Plan je strategiesessie', lead:'Kies je voorkeursmoment — we plannen de sessie met de juiste strateeg en sturen je nadien een agenda-uitnodiging met alle betrokkenen.', hint:'' },
    opstart:   { ic:'🚀', title:'Plan je opstartmeeting', lead:'Een sterke start maakt het verschil. Geef je voorkeur door en we bevestigen met een agenda-uitnodiging.', hint:'Voorkeur: fysiek bij ons in Studio 27 — persoonlijker en efficiënter.' },
    meeting:   { ic:'📅', title:'Plan een afspraak in', lead:'Geef je voorkeursmoment door; we bevestigen met de juiste persoon en sturen een agenda-uitnodiging.', hint:'' }
  }[t];
  const accent = discColor(proj.discipline);
  const subj = cfg.title + ' — ' + (proj.naam || '');
  return '<div class="s27-pv-section s27-pv-section-plan" style="--accent:' + accent + '">' +
    '<h3 class="s27-pv-section-title">' + cfg.ic + ' ' + esc(cfg.title) + '</h3>' +
    '<p class="s27-pv-fb-lead">' + esc(cfg.lead) + (cfg.hint ? ' <strong>' + esc(cfg.hint) + '</strong>' : '') + '</p>' +
    '<button type="button" class="s27-btn s27-btn-inline" data-dm="meeting" data-dm-onderwerp="' + esc(subj) + '" data-dm-placeholder="Geef 2-3 voorkeursmomenten door (dag + voor-/namiddag). Online of fysiek bij Studio 27?">Stel een moment voor →</button>' +
  '</div>';
}

async function loadProjectShootSlots(proj, detail){
  const box = $('s27-pv-shootbox');
  if(!box) return;
  const needed = Math.max(1, (parseInt((detail && detail.content_creators) || '0', 10) || 0) + 1);
  try {
    if(!_shootDataCache){
      const r = await fetch(ENDPOINTS.shootAvailability, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      _shootDataCache = await r.json();
    }
    box.innerHTML = renderProjectShootDays(_shootDataCache, needed, proj);
  } catch(e){
    box.innerHTML = '<div class="s27-form-error">Beschikbare momenten konden niet geladen worden — <a href="#" data-dm="shoot" data-dm-onderwerp="Shoot inplannen — ' + esc(proj.naam || '') + '">stuur een aanvraag</a>.</div>';
  }
}

function renderProjectShootDays(data, needed, proj){
  const hosts = (data && data.hosts) || [];
  const shoots = ((data && data.shoots) || []).concat((data && data.shoots_27m) || []);
  const vakantie = (data && data.vakantie) || [];
  const now = Date.now();
  const startMs = now + 48 * 3600000;
  const horizonMs = now + (28 * 86400000);
  const bezetByHost = {};
  hosts.forEach(h => bezetByHost[h.id] = new Set());
  shoots.forEach(t => {
    const due = parseInt(t.due_date, 10);
    if(!due || due > horizonMs) return;
    const day = new Date(due).toISOString().slice(0,10);
    (t.assignees || []).forEach(a => { if(bezetByHost[a.id]) bezetByHost[a.id].add(day); });
  });
  vakantie.forEach(v => {
    const start = parseInt(v.start_date || v.due_date, 10);
    const end = parseInt(v.due_date || v.start_date, 10);
    if(!start) return;
    for(let cur = start; cur <= end && cur <= horizonMs; cur += 86400000){
      const day = new Date(cur).toISOString().slice(0,10);
      (v.assignees || []).forEach(a => { if(bezetByHost[a.id]) bezetByHost[a.id].add(day); });
    }
  });
  const dagen = [];
  for(let d = Math.ceil(startMs / 86400000) * 86400000; d <= horizonMs && dagen.length < 8; d += 86400000){
    const dt = new Date(d);
    const dow = dt.getDay();
    if(dow === 0 || dow === 6) continue;
    const dayKey = dt.toISOString().slice(0,10);
    const vrijCount = hosts.filter(h => !bezetByHost[h.id].has(dayKey)).length;
    if(vrijCount >= needed){
      dagen.push({ day: dayKey, label: dt.toLocaleDateString('nl-BE', {weekday:'long', day:'2-digit', month:'long'}), vrij: vrijCount });
    }
  }
  const creatorTxt = needed === 1 ? '1 content creator' : needed + ' content creators';
  const pname = (proj && proj.naam) || 'shoot';
  if(!dagen.length){
    return '<div class="s27-shoot-head"><strong>📸 Beschikbare shootdagen</strong><span>Geen dag met ' + esc(creatorTxt) + ' vrij in de komende 4 weken</span></div>' +
      '<p class="s27-shoot-info">Geen geschikt moment? <a href="#" data-dm="shoot" data-dm-onderwerp="Shoot inplannen — ' + esc(pname) + ' — geen geschikt moment">Stuur ons je voorkeuren</a> en we zoeken samen.</p>';
  }
  return '<div class="s27-shoot-head"><strong>📸 Kies je shootdag</strong><span>We wijzen ' + esc(creatorTxt) + ' toe</span></div>' +
    '<div class="s27-shoot-daygrid">' +
      dagen.map(dg => '<button type="button" class="s27-shoot-day" data-dm="shoot"' +
        ' data-dm-onderwerp="Shoot inplannen — ' + esc(pname) + ' — voorkeur ' + esc(dg.label) + '"' +
        ' data-dm-placeholder="Bevestig je voorkeur of geef een opmerking mee (bv. locatie, voor- of namiddag)…">' +
        '<span class="s27-shoot-day-label">' + esc(dg.label) + '</span>' +
        '<span class="s27-shoot-day-free">' + dg.vrij + ' creator' + (dg.vrij === 1 ? '' : 's') + ' vrij</span>' +
      '</button>').join('') +
    '</div>' +
    '<p class="s27-shoot-info">⚡ Klik op een dag om die als voorkeur door te geven. Het team bevestigt de definitieve afspraak.</p>';
}

function renderNieuwProjectSuccess(result){
  const direct = result._intentie === 'direct_start';
  const isShoot = result._project_type === 'Video + Fotografie';
  const planLabel = isShoot ? '📸 Plan je shoot in' : '📅 Plan je opstartmoment';
  const planPreset = isShoot ? 'shoot' : 'meeting';
  return `
    <div class="s27-nieuw-success">
      <div class="s27-success-icon"><svg width="32" height="32"><use href="#s27p-check"/></svg></div>
      <h3>${direct ? 'Top — we hebben je bevestiging!' : 'Bedankt — je aanvraag is binnen!'}</h3>
      <p>${direct
        ? 'We zetten alles in gang. Plan hieronder meteen je ' + (isShoot ? 'shoot' : 'opstartmoment') + ', dan kunnen we direct starten.'
        : 'Je krijgt een offerte op maat én we plannen een kort gesprek om alles scherp te krijgen. We nemen binnen 24u contact op.'}</p>
      ${result.offerte_task_url ? `<p class="s27-success-meta">Status van je aanvraag: <a href="${esc(result.offerte_task_url)}" target="_blank" rel="noopener">bekijk in onze planning</a></p>` : ''}
      <div class="s27-success-actions">
        ${direct ? `<button class="s27-btn s27-btn-primary" data-dm="${esc(planPreset)}" data-dm-onderwerp="${esc((isShoot?'Shoot':'Opstartmoment')+' inplannen — '+(result._project_type||'nieuw project'))}">${planLabel}</button>` : ''}
        <button class="s27-btn s27-btn-ghost" id="s27-nieuw-again">Nog een aanvraag indienen</button>
      </div>
    </div>
  `;
}

function wireNieuwSuccess(){
  const again = $('s27-nieuw-again');
  if(again) again.addEventListener('click', () => {
    state._nieuwProjectSubmitted = null;
    state._nieuwStep = 1;
    state._nieuwData = {};
    renderNieuwTab();
  });
}

async function submitNieuwProject(e){
  e.preventDefault();
  const form = e.target;
  const btn = $('s27-nieuw-submit');
  const errEl = $('s27-nieuw-error');
  if(errEl) errEl.style.display = 'none';
  const d = state._nieuwData || {};
  const intentie = d._intentie || 'offerte_meeting';
  if(btn){ btn.disabled = true; btn.textContent = 'Versturen…'; }

  // Bouw omschrijving met sub-antwoorden + gekozen prijs + intentie
  const subAnswers = d.sub_answers || {};
  const subText = Object.keys(subAnswers).length
    ? '\n\n— Antwoorden op vervolgvragen:\n' + Object.entries(subAnswers).map(([k,v]) => '• ' + k + ': ' + v).join('\n')
    : '';
  const intentieText = intentie === 'direct_start'
    ? '\n\n✅ KLANT BEVESTIGT — wil meteen starten (' + (d.project_type === 'Video + Fotografie' ? 'shoot' : 'opstartmoment') + ' inplannen).'
    : '\n\n📄 Klant vraagt gedetailleerde offerte + gesprek.';
  const prijsText = d.prijs_indicatie ? '\n💶 Getoonde prijsindicatie: ' + d.prijs_indicatie : '';

  const contactOwner = (form.contact_owner ? form.contact_owner.value : d.contact_owner) || 'arne';
  state._nieuwData.contact_owner = contactOwner;
  const owner = PROJECT_CONTACT_OPTIONS.find(o => o.id === contactOwner) || PROJECT_CONTACT_OPTIONS[0];
  const payload = {
    bedrijf_id: state.session.bedrijf_id,
    klant_naam: state.session.bedrijfsnaam,
    session_token: state.session.session_token,
    project_type: d.project_type,
    gewenste_opleverdatum: d.gewenste_opleverdatum || '',
    omschrijving: (d.omschrijving || '') + subText + prijsText + intentieText,
    contactpersoon_email: owner.email,
    contactpersoon_naam: owner.naam,
    sub_answers: subAnswers,
    intentie: intentie,
    prijs_indicatie: d.prijs_indicatie || ''
  };

  try {
    if(state.demoMode){
      state._nieuwProjectSubmitted = { ok:true, offerte_task_id:'DEMO-001', message:'Bedankt — demo mode', _intentie:intentie, _project_type:d.project_type };
      renderNieuwTab();
      return;
    }
    const res = await api(ENDPOINTS.newProjectIntake, payload);
    if(res.ok && res.data && res.data.ok){
      state._nieuwProjectSubmitted = Object.assign({}, res.data, { _intentie:intentie, _project_type:d.project_type });
      renderNieuwTab();
    } else {
      const msg = (res.data && res.data.message) || 'Aanvraag kon niet worden verzonden. Stuur ons gerust een bericht via "Stuur bericht".';
      if(errEl){ errEl.style.display = 'block'; errEl.textContent = msg; }
      if(btn){ btn.disabled = false; btn.textContent = intentie==='direct_start'?'Bevestigen & inplannen':'Aanvraag versturen'; }
    }
  } catch(err){
    if(errEl){ errEl.style.display = 'block'; errEl.textContent = 'Netwerkfout — probeer opnieuw.'; }
    if(btn){ btn.disabled = false; btn.textContent = intentie==='direct_start'?'Bevestigen & inplannen':'Aanvraag versturen'; }
  }
}
async function renderInstellingenTab(){
  const body = $('s27-instellingen-body');
  if(!body) return;
  // v3.2: contactgegevens + voorkeuren wonen nu hier → bedrijfContent ophalen indien nog niet geladen
  let data = state.bedrijfContent;
  if(!data){
    if(state.demoMode || !ENDPOINTS.bedrijfContent){ data = getMockBedrijfContent(); }
    else {
      body.innerHTML = '<div class="s27-loading">Instellingen laden</div>';
      const res = await api(ENDPOINTS.bedrijfContent, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token });
      data = (res.ok && res.data && !res.data.error) ? res.data : getMockBedrijfContent();
    }
    state.bedrijfContent = data;
  }
  const sess = state.session || {};
  const dash = state.dashboard || {};
  const contact = dash.contact || {};
  const prefs = loadNotifPrefs();
  const contactC = loadContactCache();
  const cc = data.contact || {};
  const c = {
    voornaam:   contactC.voornaam || cc.voornaam || '',
    achternaam: contactC.achternaam || cc.achternaam || '',
    gsm:        contactC.gsm || cc.gsm || '',
    email:      contactC.email || cc.email || data.facturatie_email || '',
    btw:        contactC.btw || data.btw || '',
    adres:      contactC.adres || '',
    website:    contactC.website || data.website || ''
  };
  const rf = (label, name, val, ph) =>
    `<div class="s27-form-field s27-readfield"><span class="s27-readlabel">${esc(label)}</span><div class="s27-readvalue">${val ? esc(val) : '—'}</div><input type="text" name="${name}" value="${esc(val||'')}" placeholder="${esc(ph||'')}" hidden/></div>`;
  const voorkeurenTekst = decodeMakeString(data.algemene_voorkeuren || '').replace(/<[^>]+>/g,'').replace(/---STRUCTURED---[\s\S]*/,'').trim();
  const waGsm = c.gsm || '';
  const waEmail = c.email || sess.bedrijfsnaam;
  const expiresStr = sess.expires_at ? new Date(sess.expires_at).toLocaleString('nl-BE', {dateStyle:'long', timeStyle:'short'}) : '–';
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
        <div class="s27-form-row">${rf('Voornaam','voornaam',c.voornaam,'Bv. Vincent')}${rf('Achternaam','achternaam',c.achternaam,'Bv. Verleije')}</div>
        <div class="s27-form-row">${rf('GSM','gsm',c.gsm,'+32 4xx xx xx xx')}${rf('E-mail','email',c.email,'naam@bedrijf.be')}</div>
        ${rf('Bedrijfsadres (factuur-adres)','adres',c.adres,'Straat nummer, postcode stad')}
        ${rf('Website','website',c.website,'https://...')}
        <div class="s27-contactform-foot" id="s27-contactform-foot" hidden>
          <span class="s27-contactform-state" id="s27-contactform-state"></span>
          <button class="s27-btn s27-btn-ghost s27-btn-sm" id="s27-contactform-cancel">Annuleer</button>
          <button class="s27-btn s27-btn-sm s27-btn-primary" id="s27-contactform-save">Wijzigingen opslaan</button>
        </div>
      </div>
    </div>

    <div class="s27-section">
      <div class="s27-section-head"><div>
        <h2 class="s27-section-title">Algemene voorkeuren</h2>
        <p class="s27-section-sub">Wat moeten we zeker (niet) doen voor jouw merk? Wat hier staat zien al onze teamleden voor elk project.</p>
      </div></div>
      <div class="s27-voorkeuren">
        <textarea id="s27-voorkeuren-input" placeholder="Bv. We houden van minimalistische typografie. Geen stockfoto's. Onze kleur is altijd warm. Vermijd: gradients, drop shadows…">${esc(voorkeurenTekst)}</textarea>
        <div class="s27-voorkeuren-foot">
          <span class="s27-voorkeuren-state" id="s27-voorkeuren-state"></span>
          <button class="s27-btn s27-btn-sm" id="s27-voorkeuren-save" disabled>Opslaan</button>
        </div>
      </div>
    </div>

    <div class="s27-settings-grid">
      <section class="s27-settings-card">
        <h3 class="s27-settings-title"><svg width="16" height="16"><use href="#s27p-spark"/></svg> Notificatie-voorkeuren</h3>
        <p class="s27-settings-sub">Hoe wil je dat we je waarschuwen bij nieuwe feedback-vraag, opleveringen of vragen vanuit het team?</p>
        <div class="s27-notif-options">
          <label class="s27-notif-opt"><input type="radio" name="notif" value="mail" ${prefs.kanaal === 'mail' ? 'checked' : ''}/><div><strong>Alleen e-mail</strong><span>Klassieke updates in je inbox</span></div></label>
          <label class="s27-notif-opt"><input type="radio" name="notif" value="whatsapp" ${prefs.kanaal === 'whatsapp' ? 'checked' : ''}/><div><strong>Alleen WhatsApp</strong><span>Snel, direct, op je telefoon</span></div></label>
          <label class="s27-notif-opt"><input type="radio" name="notif" value="beide" ${prefs.kanaal === 'beide' || !prefs.kanaal ? 'checked' : ''}/><div><strong>Beide kanalen</strong><span>Niets missen — aanbevolen</span></div></label>
        </div>
        <div class="s27-notif-targets">
          <div class="s27-notif-target"><span>📱 WhatsApp naar</span><strong>${waGsm ? esc(waGsm) : 'geen gsm ingesteld'}</strong></div>
          <div class="s27-notif-target"><span>✉️ E-mail naar</span><strong>${esc(waEmail || '—')}</strong></div>
          <p class="s27-notif-target-hint">Klopt dit niet? Pas je gsm/e-mail aan hierboven bij <strong>Contactgegevens</strong>.</p>
        </div>
        <button class="s27-btn s27-btn-primary" id="s27-save-notif" style="margin-top:14px">Voorkeuren opslaan</button>
        <p class="s27-settings-status" id="s27-notif-status" style="display:none"></p>
      </section>

      <section class="s27-settings-card">
        <h3 class="s27-settings-title"><svg width="16" height="16"><use href="#s27p-lock"/></svg> Inloggen &amp; beveiliging</h3>
        ${AUTH_V2 ? `
          <p class="s27-settings-sub">Je logt veilig in met je Google-account of een e-maillink, beveiligd met tweestapsverificatie. Er is geen apart wachtwoord om te resetten. Geen toegang meer? Vraag op de loginpagina een nieuwe e-maillink aan, of bericht hieronder je contactpersoon.</p>
        ` : `
          <p class="s27-settings-sub">Reset je toegangscode. Je krijgt meteen een nieuwe code per e-mail${waEmail ? ' op <strong>' + esc(waEmail) + '</strong>' : ' bij je contactpersoon'}. Je huidige code werkt daarna niet meer.</p>
          <button class="s27-btn s27-btn-ghost" id="s27-reset-pw"><svg width="15" height="15" style="margin-right:6px"><use href="#s27p-lock"/></svg> Wachtwoord resetten</button>
          <p class="s27-settings-status" id="s27-reset-pw-status" style="display:none"></p>
        `}
      </section>

      <section class="s27-settings-card">
        ${renderContact(contact)}
      </section>

      <section class="s27-settings-card">
        <h3 class="s27-settings-title"><svg width="16" height="16"><use href="#s27p-lock"/></svg> Sessie & toegang</h3>
        <dl class="s27-settings-dl">
          <dt>Ingelogd als</dt><dd>${esc(sess.bedrijfsnaam || '–')}</dd>
          <dt>Bedrijf-ID</dt><dd><code>${esc(sess.bedrijf_id || '–')}</code></dd>
          <dt>Sessie geldig tot</dt><dd>${esc(expiresStr)}</dd>
        </dl>
        <div class="s27-settings-actions">
          <button class="s27-btn s27-btn-danger" id="s27-logout-btn">Uitloggen</button>
        </div>
        <p class="s27-settings-hint">Zie je een oude versie? <button type="button" id="s27-clear-cache" class="s27-textlink">Cache wissen &amp; vers herladen</button> — leegt alles, logt je uit en haalt het portaal volledig vers op.</p>
      </section>
    </div>
  `;
  // Wire up handlers
  attachBedrijfHandlers(); // contactgegevens-edit + algemene-voorkeuren (null-guarded, wired waar de velden staan)
  wirePasswordReset();
  const saveBtn = $('s27-save-notif');
  if(saveBtn) saveBtn.addEventListener('click', saveNotifPrefs);
  const clearBtn = $('s27-clear-cache');
  if(clearBtn) clearBtn.addEventListener('click', () => {
    if(!confirm('Cache wissen, uitloggen en het portaal vers herladen?\n\nJe moet daarna opnieuw inloggen.')) return;
    forceCacheClearAndReload();
  });
  const logoutBtn = $('s27-logout-btn');
  if(logoutBtn) logoutBtn.addEventListener('click', () => {
    try { localStorage.removeItem('s27_portal_session'); } catch(e){}
    state.session = null;
    state.viewMode = 'login';
    renderApp();
  });
}

// v3.2: wachtwoord/toegangscode resetten → Make genereert nieuwe code, schrijft naar ClickUp en mailt de contactpersoon
function wirePasswordReset(){
  const btn = $('s27-reset-pw');
  if(!btn) return;
  btn.addEventListener('click', async () => {
    if(!confirm('Een nieuwe toegangscode aanmaken?\n\nJe huidige code werkt daarna niet meer. De nieuwe code sturen we naar het e-mailadres van je contactpersoon.')) return;
    const status = $('s27-reset-pw-status');
    btn.disabled = true; const orig = btn.innerHTML; btn.textContent = 'Bezig…';
    if(status){ status.style.display = 'block'; status.className = 's27-settings-status'; status.textContent = 'Nieuwe code aanmaken…'; }
    try {
      if(state.demoMode || !ENDPOINTS.passwordReset){
        await new Promise(r => setTimeout(r, 700));
        if(status) status.textContent = '✓ (demo) In productie sturen we nu een nieuwe code naar je contactpersoon.';
      } else {
        const res = await api(ENDPOINTS.passwordReset, { bedrijf_id: state.session.bedrijf_id, session_token: state.session.session_token, klant_naam: state.session.bedrijfsnaam });
        if(res.ok && res.data && res.data.ok){
          if(status) status.innerHTML = '✓ Gelukt! We hebben een nieuwe code gemaild naar <strong>' + esc(res.data.email || 'je contactpersoon') + '</strong>. Log met je huidige code uit zodra je de nieuwe hebt.';
        } else {
          if(status){ status.classList.add('is-error'); status.textContent = (res.data && res.data.message) || '⚠️ Resetten lukte niet. Probeer opnieuw of stuur ons een bericht.'; }
        }
      }
    } catch(e){
      if(status){ status.classList.add('is-error'); status.textContent = '⚠️ Er ging iets mis (' + (e.message || 'onbekend') + ').'; }
    }
    btn.disabled = false; btn.innerHTML = orig;
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

let _meetingAvailCache = null;
async function loadMeetingSlots(externalBookingUrl){
  const box = $('s27-book-slots');
  if(!box) return;
  box.hidden = false;
  box.innerHTML = '<div class="s27-loading" style="padding:18px">Echte agenda\'s checken…</div>';
  try {
    if(!_meetingAvailCache){
      const res = await api(ENDPOINTS.meetingAvailability, { session_token: state.session.session_token });
      _meetingAvailCache = (res.ok && res.data) ? res.data : { calendars:{}, hosts:[] };
    }
    box.innerHTML = renderMeetingSlots(_meetingAvailCache);
    // Wire location toggle — updates slot onderwerp met online/op-locatie
    document.querySelectorAll('input[name="s27-meet-loc"]').forEach(r => {
      r.addEventListener('change', () => {
        const loc = document.querySelector('input[name="s27-meet-loc"]:checked');
        if(!loc) return;
        document.querySelectorAll('.s27-book-slot-time').forEach(slot => {
          if(slot.dataset.dmOnderwerpBase) slot.dataset.dmOnderwerp = slot.dataset.dmOnderwerpBase + ' — ' + loc.value;
        });
      });
    });
  } catch(err){
    console.error('[Studio 27] meeting availability failed:', err);
    box.innerHTML = '<div class="s27-form-error">Beschikbaarheid kon niet opgehaald worden — <a href="#" data-dm="meeting" data-dm-onderwerp="Meeting-aanvraag (beschikbaarheid kon niet laden)">stuur een vraag</a>.</div>';
  }
}

// v2.2 #72: bouw 90-min vrije slots uit echte Google Calendar busy-blokken
function computeFreeSlots(busyBlocks){
  // busyBlocks: [{start, end}] in ISO (UTC). Genereer kandidaat-slots 10:00 + 14:00 lokale tijd,
  // vanaf +48u tot +14 dagen, werkdagen, en filter wat overlapt met busy.
  const SLOT_HOURS = [10, 14]; // lokale starttijden
  const DURATION_MIN = 90;
  const busy = (busyBlocks || []).map(b => ({ s: new Date(b.start).getTime(), e: new Date(b.end).getTime() })).filter(b => b.s && b.e);
  const now = Date.now();
  const startMs = now + 48 * 3600000;
  const slots = [];
  for(let dayOffset = 0; dayOffset <= 16 && slots.length < 6; dayOffset++){
    const day = new Date(now + dayOffset * 86400000);
    const dow = day.getDay();
    if(dow === 0 || dow === 6) continue; // weekend
    for(const h of SLOT_HOURS){
      if(slots.length >= 6) break;
      const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0, 0);
      const slotStartMs = slotStart.getTime();
      const slotEndMs = slotStartMs + DURATION_MIN * 60000;
      if(slotStartMs < startMs) continue; // geen last-minute
      // overlap check
      const overlaps = busy.some(b => slotStartMs < b.e && slotEndMs > b.s);
      if(overlaps) continue;
      slots.push({
        startMs: slotStartMs,
        tijd: slotStart.toLocaleTimeString('nl-BE', {hour:'2-digit', minute:'2-digit'}) + ' – ' + new Date(slotEndMs).toLocaleTimeString('nl-BE', {hour:'2-digit', minute:'2-digit'}),
        dateLabel: slotStart.toLocaleDateString('nl-BE', {weekday:'short', day:'2-digit', month:'short'}),
        dateLong: slotStart.toLocaleDateString('nl-BE', {weekday:'long', day:'numeric', month:'long'})
      });
    }
  }
  return slots;
}

function renderMeetingSlots(data){
  const calendars = data.calendars || {};
  const hosts = (data.hosts && data.hosts.length) ? data.hosts : [
    { key:'ilke', email:'ilke@studio27.be', naam:'Ilke Meeusen', rol:'Accountmanager' },
    { key:'arne', email:'arne@studio27.be', naam:'Arne Goetschalckx', rol:'Zaakvoerder' }
  ];
  // Per host: echte busy-blokken uit Google Calendar → 90-min vrije slots
  const slotsByHost = hosts.map(h => {
    const cal = calendars[h.email] || {};
    const busy = cal.busy || [];
    return { ...h, slots: computeFreeSlots(busy) };
  });
  return '<div class="s27-book-head">' +
    '<div><strong>📅 Eerstvolgende vrije momenten (1u30 meeting)</strong>' +
    '<span>Live uit onze agenda — kies eerst je locatie-voorkeur, dan een tijdslot</span></div>' +
    '<button type="button" class="s27-book-close" id="s27-book-close" aria-label="Sluiten">×</button>' +
    '</div>' +
    '<div class="s27-meet-locchoice">' +
      '<label class="s27-meet-locopt"><input type="radio" name="s27-meet-loc" value="online" checked/><div><strong>💻 Online</strong><span>Google Meet — geen reistijd</span></div></label>' +
      '<label class="s27-meet-locopt"><input type="radio" name="s27-meet-loc" value="bij Studio 27"/><div><strong>🏢 Bij Studio 27</strong><span>Geel — koffie staat klaar</span></div></label>' +
    '</div>' +
    '<div class="s27-book-grid">' +
      slotsByHost.map(h => `
        <div class="s27-book-host">
          <div class="s27-book-host-head">
            <strong>${esc(h.naam)}</strong>
            <span>${esc(h.rol)}</span>
          </div>
          ${h.slots.length
            ? '<div class="s27-book-slot-list">' + h.slots.map(s => {
                const baseSubject = 'Meeting-aanvraag met ' + h.naam + ' op ' + s.dateLong + ' om ' + s.tijd;
                return `<button type="button" class="s27-book-slot-time" data-dm="meeting" data-dm-ontvanger="${esc(h.key)}" data-dm-onderwerp="${esc(baseSubject + ' — online')}" data-dm-onderwerp-base="${esc(baseSubject)}" data-dm-placeholder="Bespreekonderwerp: &#10;Eventuele opmerkingen: ">
                  <span class="s27-book-slot-date">${esc(s.dateLabel)}</span>
                  <span class="s27-book-slot-time-val">${esc(s.tijd)}</span>
                </button>`;
              }).join('') + '</div>'
            : '<p class="s27-book-empty">Volgeboekt komende 2 weken — probeer een andere collega</p>'
          }
        </div>
      `).join('') +
    '</div>' +
    '<p class="s27-book-fallback">Of <a href="#" data-dm="meeting" data-dm-onderwerp="Meeting-aanvraag (vrij voorstel)">stuur ons een vrij voorstel</a>. Na bevestiging ontvang je een Google Calendar invite.</p>';
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
    // Plaats de project-view tussen de tabs (vóór de footer) i.p.v. helemaal onderaan,
    // anders verschijnt de footer + lege ruimte bóven de project-inhoud.
    const foot = wrap.querySelector('.s27-foot');
    if(foot) wrap.insertBefore(fsView, foot); else wrap.appendChild(fsView);
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
            deliverables: (Array.isArray(r.data.deliverables) && r.data.deliverables.length) ? r.data.deliverables : parseDeliverablesRaw(r.data.deliverables_raw),
            deliverables_raw: r.data.deliverables_raw || '',
            feedback_link: r.data.feedback_link || '',
            feedback_status: r.data.feedback_status || '',
            time_estimate: r.data.time_estimate || '',
            content_creators: r.data.content_creators != null ? String(r.data.content_creators) : '',
            type_job: r.data.type_job != null ? String(r.data.type_job) : '',
            shootlink: r.data.shootlink || '',
            has_contact: r.data.has_contact || '',
            has_bedrijf: r.data.has_bedrijf || '',
            budget: r.data.budget || '',
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
    renderProjectView(proj, detail, feedbackRoundState(proj, detail));
  } catch(err){
    console.error('[Studio 27] renderProjectView crashed:', err, '\nproj=', proj, '\ndetail=', detail);
    const fsView = $('s27-tab-project');
    if(fsView){
      fsView.innerHTML = '<div style="padding:40px 20px;text-align:center;font-family:system-ui">' +
        '<h3 style="margin:0 0 10px;color:#991b1b">Project kon niet getoond worden</h3>' +
        '<p style="color:#7f1d1d;font-size:14px;margin:0 0 16px">Er ging iets mis bij het laden. Probeer opnieuw of <a href="#" data-dm="vraag" data-dm-onderwerp="Project laadt niet">stuur ons een bericht</a>.</p>' +
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

function renderProjectView(proj, detail, roundState){
  const fsView = $('s27-tab-project');
  if(!fsView){ console.warn('[Studio 27] Project view container niet gevonden'); return; }
  // #88 feedback-ronde: 'active' | 'submitted' | 'approved' | 'none' (backwards-compat met oude bool)
  if(typeof roundState !== 'string') roundState = roundState ? 'active' : 'none';
  const needsFeedback = roundState === 'active';
  const discipline = getDisciplineInfo(proj.discipline);
  const accent = discipline.accent;
  const discLabel = discipline.label;
  const statusKey = (proj.status || '').toLowerCase().replace(/\s+/g,'_');
  const statusLabel = proj.status_label || STATUS_LABELS[statusKey] || proj.status || '';
  const eta = computeETA(proj);
  const commentCount = (detail.comments || []).length;
  // v3.1: chat ENKEL bij actieve statussen. Op afgeronde/doorgestuurde taken krijgt het team
  // geen melding en reageert het niet → chat verbergen. (to do / in progress / on hold = open)
  const stForChat = statusKey || 'in_progress';
  const chatAllowed = (stForChat === 'to_do' || stForChat === 'in_progress' || stForChat === 'on_hold');
  const chatClosedNote =
    roundState === 'active'    ? 'Reageren doe je via het <strong>feedback-paneel hiernaast</strong> — daar geef je per onderdeel goedkeuring of opmerkingen door.' :
    roundState === 'submitted' ? 'Je feedback is verstuurd — we verwerken die en sturen je de aangepaste versie. Een tussentijdse vraag? Gebruik de <strong>✦ assistent</strong> rechtsonder.' :
    'Dit project is afgerond, dus de chat is gesloten — ons team volgt afgeronde taken niet meer op. Heb je nog een vraag? Gebruik de <strong>✦ assistent</strong> rechtsonder of <a href="#" data-dm="vraag" data-dm-onderwerp="Vraag over ' + esc(proj.naam || 'afgerond project') + '">stuur een bericht</a>.';

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
        ${renderProjectScheduleBlock(proj, detail)}
        ${roundState === 'active' ? `
          <div class="s27-pv-section s27-pv-section-fb">
            <h3 class="s27-pv-section-title">🔔 Dit project wacht op jouw feedback</h3>
            <p class="s27-pv-fb-lead">Bekijk de deliverables hieronder en geef per onderdeel aan of het goedgekeurd is of feedback nodig heeft.</p>
            <div id="s27-pv-fbbox"></div>
          </div>
        ` : ''}
        ${(roundState === 'submitted' || roundState === 'approved') ? `
          <div class="s27-pv-section s27-pv-section-fb">${renderFeedbackReadonly(proj, detail, roundState)}</div>
        ` : ''}
        <div class="s27-pv-section">
          <h3 class="s27-pv-section-title">📋 Projectomschrijving</h3>
          <div class="s27-pv-overview">${renderOverzichtTab(proj, detail)}</div>
        </div>
      </div>

      <div class="s27-pv-section s27-pv-section-chat">
        ${chatAllowed ? `
          <h3 class="s27-pv-section-title">💬 Chat over dit project ${commentCount ? `<span class="s27-pv-tab-badge" style="margin-left:8px">${commentCount}</span>` : ''}</h3>
          <p class="s27-pv-chat-hint">Dit gesprek gaat specifiek over <strong>${esc(proj.naam || 'dit project')}</strong> — je praat hier rechtstreeks met het team dat eraan werkt. Een algemene vraag of snel een antwoord nodig? Gebruik de <strong>✦ assistent</strong> rechtsonder.</p>
          <div id="s27-pv-chatbox" class="s27-pv-chatbox"></div>
        ` : `
          <h3 class="s27-pv-section-title">💬 Chat gesloten</h3>
          <div class="s27-pv-chat-closed">${chatClosedNote}</div>
        `}
      </div>
    </div>
  `;

  // v3.1: chat enkel renderen + pollen wanneer toegestaan (open status). Anders: gesloten-note al getoond.
  if(chatAllowed){
    try {
      const chatBox = $('s27-pv-chatbox');
      if(chatBox){
        chatBox.innerHTML = renderChatTab(proj, detail);
        attachChatHandlers();
        setTimeout(() => { const thread = $('s27-chat-thread'); if(thread) thread.scrollTop = thread.scrollHeight; }, 30);
        startChatPolling(proj.task_id);
      }
    } catch(e){
      console.error('[Studio 27] Chat render failed:', e);
      const chatBox = $('s27-pv-chatbox');
      if(chatBox) chatBox.innerHTML = '<div class="s27-form-error">Chat kon niet geladen worden (' + esc(String(e && e.message || e)) + '). <a href="#" data-dm="vraag" data-dm-onderwerp="Chat in dashboard werkt niet">Stuur ons een bericht</a>.</div>';
    }
  } else {
    stopChatPolling();   // geen polling op gesloten chat
  }

  // Wire up handlers
  const back = $('s27-pv-back-btn');
  if(back) back.addEventListener('click', exitProjectView);

  // #94: shoot-inplanblok laden (enkel aanwezig bij een shoot-klare taak)
  loadProjectShootSlots(proj, detail);

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

/* =================================================================
   FEEDBACK-RONDE LOGICA (v3.1-4 #88)
   Een deliverable doorloopt feedbackrondes. Per ronde:
   - status 'doorgestuurd' + nog niet ingediend → ACTIEF (klant geeft feedback)
   - status 'doorgestuurd' + al ingediend       → INGEDIEND (read-only, "we verwerken het")
   - status 'goedgekeurd'                        → GOEDGEKEURD (read-only, afgerond)
   Bron-of-truth voor "al ingediend": server-veld detail.feedback_status === 'Ontvangen'.
   Fallback: lokale lock per device (localStorage), die vervalt zodra de taak ná het
   indienen opnieuw is geüpdatet (= team leverde een nieuwe versie → nieuwe ronde).
   ================================================================= */
const FB_LOCK_KEY = 's27_fb_rondes';
function _fbLockAll(){ try { return JSON.parse(localStorage.getItem(FB_LOCK_KEY) || '{}') || {}; } catch(e){ return {}; } }
function setFbLock(taskId){
  if(!taskId) return;
  const all = _fbLockAll();
  all[taskId] = { at: Date.now() };
  try { localStorage.setItem(FB_LOCK_KEY, JSON.stringify(all)); } catch(e){}
}
function clearFbLock(taskId){
  const all = _fbLockAll();
  if(all[taskId]){ delete all[taskId]; try { localStorage.setItem(FB_LOCK_KEY, JSON.stringify(all)); } catch(e){} }
}
function projUpdatedMs(proj){
  const t = proj && proj.laatst_geupdatet;
  if(!t) return 0;
  if(typeof t === 'number') return t;
  const ms = Date.parse(t); return isNaN(ms) ? 0 : ms;
}
function hasFreshFbLock(proj){
  const rec = _fbLockAll()[proj && proj.task_id];
  if(!rec) return false;
  // Lock vervalt als de taak ná het indienen duidelijk opnieuw is geüpdatet (team leverde nieuwe versie).
  // 5 min marge: het indienen zelf (comment op de taak) bumpt 'laatst_geupdatet' ook.
  const upd = projUpdatedMs(proj);
  if(upd && rec.at && upd > rec.at + 5 * 60 * 1000){ clearFbLock(proj.task_id); return false; }
  return true;
}
// 'active' | 'submitted' | 'approved' | 'none'
function feedbackRoundState(proj, detail){
  const st = (proj.status || '').toLowerCase().replace(/\s+/g, '_');
  if(st === 'goedgekeurd') return 'approved';
  const isReview = st === 'doorgestuurd' || proj.feedback_link;
  if(!isReview) return 'none';
  const fb = String((detail && detail.feedback_status) || '').toLowerCase();
  if(fb === 'ontvangen' || fb === 'auto-goedgekeurd') return 'submitted';
  if(hasFreshFbLock(proj)) return 'submitted';
  return 'active';
}

// Read-only weergave voor een ingediende of goedgekeurde ronde
function renderFeedbackReadonly(proj, detail, mode){
  const deliverables = (detail && detail.deliverables) || parseDeliverablesFromProj(proj);
  const approved = mode === 'approved';
  const head =
    '<div class="s27-fb-ro-head' + (approved ? ' s27-fb-ro-ok' : '') + '">' +
      '<span class="s27-fb-ro-ic">' + (approved ? '✅' : '📨') + '</span>' +
      '<div>' +
        '<strong>' + (approved ? 'Dit project is goedgekeurd' : 'Je feedback voor deze ronde is verstuurd') + '</strong>' +
        '<p>' + (approved
          ? 'Bedankt — alles staat op groen. Je hoeft hier niets meer te doen.'
          : 'We verwerken je opmerkingen en sturen je binnenkort de aangepaste versie. Zodra die klaar is, kan je hier opnieuw feedback geven.') +
        '</p>' +
      '</div>' +
    '</div>';
  const list = deliverables.length
    ? '<div class="s27-fb-ro-list"><span class="s27-fb-ro-label">' + (approved ? 'Wat je goedkeurde' : 'Wat je beoordeelde') + '</span>' +
        deliverables.map(d => {
          const tl = ({vimeo:'Video op Vimeo', picflow:'Foto-album op Picflow', webflow:'Website preview', drive:'Drive folder', figma:'Figma ontwerp'})[d.type] || 'Bestand';
          return '<a class="s27-fb-ro-item" href="' + esc(d.url) + '" target="_blank" rel="noopener"><span>' + esc(d.label) + '</span><small>' + esc(tl) + ' →</small></a>';
        }).join('') +
      '</div>'
    : '';
  return '<div class="s27-fb-ro">' + head + list + '</div>';
}

function renderFeedbackV2Tab(proj, detail){
  const deliverables = detail.deliverables || parseDeliverablesFromProj(proj);
  const intro = '<div class="s27-fb-intro">' +
    '<strong>Klaar voor review.</strong> Voor elk onderdeel kies je: ✅ <em>Goedgekeurd</em> of 💬 <em>Feedback gegeven</em>. ' +
    'Bij feedback kies je waar je het hebt achtergelaten (Vimeo, Picflow, Webflow comments, tekst hieronder, of upload). ' +
    'Bevestig onderaan zodat we direct verder kunnen.' +
    '</div>';
  if(!deliverables.length){
    return intro + '<div class="s27-empty"><div class="s27-empty-title">Nog geen deliverables klaar</div><p class="s27-empty-sub">Zodra we iets opleveren verschijnt het hier. Benieuwd naar de stand van zaken? <a href="#" data-dm="vraag" data-dm-onderwerp="Vraag over deliverables">Stuur ons even een bericht</a>.</p></div>';
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
  // v2.2 #71: deliverables komen nu uit project-detail-v2 (Bestanden custom field).
  // Deze fallback parseert eventueel het detail dat al in state zit.
  const detail = state.activeProjectDetail;
  if(detail && detail.deliverables_raw) return parseDeliverablesRaw(detail.deliverables_raw);
  return [];
}

// v2.2 #71: parse de "Bestanden" custom-field tekst (URLs gescheiden door spaties/newlines) naar deliverable-objecten
function parseDeliverablesRaw(raw){
  if(!raw || typeof raw !== 'string') return [];
  const urls = raw.match(/https?:\/\/[^\s]+/g) || [];
  return urls.map(url => {
    const u = url.replace(/[).,;]+$/, ''); // trailing leestekens weg
    let type = 'bestand', label = 'Deliverable';
    if(/youtube\.com|youtu\.be/i.test(u)) { type = 'youtube'; label = 'Video (YouTube)'; }
    else if(/vimeo\.com/i.test(u))        { type = 'vimeo'; label = 'Video (Vimeo)'; }
    else if(/picflow\.com/i.test(u))      { type = 'picflow'; label = 'Foto-album (Picflow)'; }
    else if(/figma\.com/i.test(u))        { type = 'figma'; label = 'Ontwerp (Figma)'; }
    else if(/webflow\.io|\.webflow\./i.test(u)) { type = 'webflow'; label = 'Website preview'; }
    else if(/drive\.google|docs\.google/i.test(u)) { type = 'drive'; label = 'Drive bestand'; }
    else { try { label = new URL(u).hostname.replace(/^www\./,''); } catch(e){} }
    return { label, url: u, type };
  });
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

  // v3-A FIX: upload feedback-bestanden ECHT naar de taak via chat-attachment (uploadTaskAttachment).
  // De feedbackV2-scenario doet enkel subtaak+comment, geen attachment-upload.
  let uploadCount = 0;
  if(ENDPOINTS.chatAttachment && !state.demoMode){
    for(let i = 0; i < deliverables.length; i++){
      const files = (state.fbState[i] && state.fbState[i].files) || [];
      for(const f of files){
        try {
          const r = await api(ENDPOINTS.chatAttachment, {
            task_id: proj.task_id,
            bedrijf_id: state.session.bedrijf_id,
            session_token: state.session.session_token,
            klant_naam: state.session.bedrijfsnaam,
            filename: f.filename,
            data: f.data,
            comment_text: 'Feedback-bestand bij "' + (deliverables[i].label || ('deliverable ' + (i+1))) + '"'
          });
          if(r.ok && r.data && r.data.ok) uploadCount++;
        } catch(e){ console.warn('[Studio 27] feedback-attachment faalde:', f.filename, e); }
      }
    }
  }

  const payload = {
    task_id: proj.task_id,
    bedrijf_id: state.session.bedrijf_id,
    session_token: state.session.session_token,
    klant_naam: state.session.bedrijfsnaam,
    // strip de base64-data uit deliverables (bestanden zijn al geüpload); behoud metadata
    deliverables: deliverables.map((d, i) => {
      const st = Object.assign({}, state.fbState[i] || {});
      if(st.files) st.files = st.files.map(f => ({ filename:f.filename, size:f.size }));
      return Object.assign({}, d, st);
    }),
    aantal_bestanden: uploadCount,
    algemene_opmerking: ($('s27-fb-general') || {}).value || ''
  };
  if(ENDPOINTS.feedbackV2){
    await api(ENDPOINTS.feedbackV2, payload);
  } else {
    await new Promise(r => setTimeout(r, 800)); // mock
  }
  const allApproved = deliverables.every((_,i) => (state.fbState[i] || {}).choice === 'goedgekeurd');
  state.fbState = {};
  // #88 feedback-ronde: vergrendel deze ronde meteen (read-only) zodat de klant niet dubbel indient.
  // De onderliggende project-view herrendert read-only; de success-modal komt eroverheen.
  setFbLock(proj.task_id);
  if(state.activeProjectDetail) state.activeProjectDetail.feedback_status = 'Ontvangen';
  try {
    if(state.viewMode === 'project' && state.activeProject && state.activeProject.task_id === proj.task_id){
      renderProjectView(proj, state.activeProjectDetail || detail, allApproved ? 'approved' : 'submitted');
    }
  } catch(e){ console.warn('[Studio 27] herrender na feedback faalde:', e); }
  // v3.1-7 deel B: bij volledige goedkeuring van een DELIVERABLE-project → facturatiegegevens bevestigen.
  // Enkel webdesign/branding/video/strategie/automation — NIET doorlopend (social/ads/seo) of opleidingen.
  if(allApproved && disciplineCategory(proj.discipline) === 'deliverable'){
    let choice = 'later';
    try { choice = await showFactuurConfirmStep(proj); } catch(e){ console.warn('[Studio 27] facturatie-stap overgeslagen:', e); }
    if(choice === 'goto') return; // klant navigeerde naar Facturatie-tab → geen success-modal tonen
  }
  showFeedbackSuccess(allApproved);
}

// v3.1-7 deel B — feedback-successcherm (apart zodat de facturatie-stap ervóór kan komen)
function showFeedbackSuccess(allApproved){
  const modal = $('s27-modal');
  const title = $('s27-modal-title'); if(title) title.textContent = allApproved ? 'Goedgekeurd' : 'Feedback ontvangen';
  const sub = $('s27-modal-sub'); if(sub) sub.textContent = '';
  $('s27-modal-body').innerHTML = '<div class="s27-success" style="min-height:240px"><svg class="s27-success-check" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="#12AC4E" opacity="0.12"/><circle cx="60" cy="60" r="40" fill="#12AC4E"/><path d="M42 60 L54 72 L78 48" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>' +
    '<h2 class="s27-success-h2">' + (allApproved ? 'Bedankt — alles staat op <span style="color:var(--s27-green-ink)">groen</span>!' : 'Bedankt voor de <span style="color:var(--s27-blue-ink)">feedback</span>!') + '</h2>' +
    '<p class="s27-success-p">' + (allApproved ? 'Top dat alles in orde is — we ronden de taak nu af.' : 'We nemen je feedback mee. Je hoort van ons met de aangepaste versie.') + '</p>' +
  '</div>';
  $('s27-modal-foot').innerHTML = '<button type="button" class="s27-btn" id="s27-modal-cancel">Sluiten</button>';
  const cl = $('s27-modal-cancel'); if(cl) cl.addEventListener('click', closeModal);
  if(modal) modal.classList.add('open');
}

// v3.1-7 — na volledige goedkeuring van een deliverable-project: korte melding die naar het
// Facturatie-tabblad linkt (het echte bevestigen/aanpassen gebeurt daar, niet meer in een pop-up form).
// Resolve't met 'goto' (klant ging naar de tab) of 'later'.
function showFactuurConfirmStep(proj){
  return new Promise((resolve) => {
    const modal = $('s27-modal');
    const title = $('s27-modal-title'); if(title) title.textContent = 'Project goedgekeurd 🎉';
    const sub = $('s27-modal-sub'); if(sub) sub.textContent = '';
    $('s27-modal-body').innerHTML =
      '<div class="s27-factuurcheck">' +
        '<p class="s27-factuurcheck-lead">Top dat alles goedgekeurd is! We factureren straks <strong>' + esc(proj.naam || 'dit project') + '</strong>. Wil je de facturatiegegevens voor dit project nog even nakijken of bevestigen?</p>' +
        '<p class="s27-factuurcheck-note">Het volledige overzicht — algemeen én per project — vind je onder het tabblad <strong>Facturatie</strong>. We tonen daar geen bedragen; die staan in je offerte.</p>' +
      '</div>';
    $('s27-modal-foot').innerHTML =
      '<button type="button" class="s27-btn s27-btn-ghost" id="s27-fc-later">Later</button>' +
      '<button type="button" class="s27-btn s27-btn-primary" id="s27-fc-goto">Naar facturatie-overzicht →</button>';
    if(modal) modal.classList.add('open');
    let done = false;
    const later = $('s27-fc-later');
    if(later) later.addEventListener('click', () => { if(done) return; done = true; resolve('later'); });
    const goNow = $('s27-fc-goto');
    if(goNow) goNow.addEventListener('click', () => {
      if(done) return; done = true;
      state.facturatiePendingProject = proj.task_id;
      closeModal();
      try { exitProjectView(); } catch(e){}
      switchTab('facturatie');
      resolve('goto');
    });
  });
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
      if(scope === 'bedrijf'){
        // v3.1-6 — huisstijl-bibliotheek staat op Google Drive (s27-drive, per-bedrijf map)
        const res = await api(ENDPOINTS.huisstijlUpload, {
          bedrijf_id: state.session.bedrijf_id,
          session_token: state.session.session_token,
          filename: f.name,
          file_data: b64
        });
        if(res.ok && res.data && res.data.ok && res.data.file){
          updateUploadRow(li, 'done', 'Geüpload ✓');
          if(!Array.isArray(state.huisstijlFiles)) state.huisstijlFiles = [];
          state.huisstijlFiles.unshift({
            id: res.data.file.id,
            name: res.data.file.name || f.name,
            url: res.data.file.url || '',
            mime: f.type || '',
            size: f.size,
            modified: new Date().toISOString()
          });
          refreshFilesFlat();
        } else {
          updateUploadRow(li, 'error', 'Mislukt');
        }
      } else {
        // scope algemeen → bestaand uploadAlg (Drive integratie op projecttaak)
        const res = await api(ENDPOINTS.uploadAlg, {
          bedrijf_id: state.session.bedrijf_id,
          session_token: state.session.session_token,
          filename: f.name,
          size: f.size,
          type: f.type,
          data: b64,
          klant_naam: state.session.bedrijfsnaam,
          categorie: category,
          scope: scope
        });
        if(res.ok && (!res.data || !res.data.error)){
          updateUploadRow(li, 'done', 'Geüpload ✓');
        } else updateUploadRow(li, 'error', 'Mislukt');
      }
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
      { task_id:'demo-vid-3', naam:'Reels-shoot zomercampagne', discipline:'video_fotografie', status:'to_do', opleverdatum:'2026-06-25', voortgang_pct:0, type:'Reels shoot', laatst_geupdatet: new Date(Date.now()-3600000*5).toISOString() },
      { task_id:'demo-web-1', naam:'Rebuild website testclient.be', discipline:'webdesign', status:'in_progress', opleverdatum:'2026-07-01', voortgang_pct:55, type:'Webflow rebuild', laatst_geupdatet: new Date(Date.now()-3600000*8).toISOString() },
      { task_id:'demo-web-2', naam:'Landingspagina voorjaarscampagne', discipline:'webdesign', status:'doorgestuurd', opleverdatum:'2026-06-08', voortgang_pct:90, type:'Landing page', laatst_geupdatet: new Date(Date.now()-3600000*1).toISOString(), feedback_link:'https://studio27.be/design-feedback?taskId=demo-web-2' },
      { task_id:'demo-web-3', naam:'Nieuwsbrief-template mei', discipline:'webdesign', status:'goedgekeurd', opleverdatum:'2026-05-20', voortgang_pct:100, type:'E-mail template', laatst_geupdatet: new Date(Date.now()-3600000*72).toISOString() },
      { task_id:'demo-brd-1', naam:'Brand refresh logo + kleuren',  discipline:'branding',  status:'in_progress', opleverdatum:'2026-06-20', voortgang_pct:35, type:'Brand identity', laatst_geupdatet: new Date(Date.now()-3600000*48).toISOString() },
      { task_id:'demo-soc-1', naam:'Social media juni 2026',         discipline:'social',    status:'in_progress', opleverdatum:'2026-06-01', voortgang_pct:60, type:'Retainer maandelijks', laatst_geupdatet: new Date(Date.now()-3600000*12).toISOString() },
      { task_id:'demo-ads-1', naam:'Google Ads + Meta zomercampagne',discipline:'ads',       status:'in_progress', opleverdatum:'2026-06-01', voortgang_pct:50, type:'Performance', laatst_geupdatet: new Date(Date.now()-3600000*36).toISOString() },
      { task_id:'demo-seo-1', naam:'SEO/GEO optimalisatie',          discipline:'seo',       status:'in_progress', type:'Doorlopend traject', laatst_geupdatet: new Date(Date.now()-3600000*20).toISOString() },
      { task_id:'demo-opl-1', naam:'Opleiding social media beheer',  discipline:'opleiding', status:'in_progress', opleverdatum:'2026-06-18', type:'1-op-1 sessie', laatst_geupdatet: new Date(Date.now()-3600000*30).toISOString() },
      { task_id:'demo-str-1', naam:'Strategie kick-off traject',     discipline:'strategie', status:'klaar voor facturatie', opleverdatum:'2026-05-20', type:'Strategiesessie', laatst_geupdatet: new Date(Date.now()-86400000*6).toISOString() },
      { task_id:'demo-str-2', naam:'Strategiesessie groei Q3',       discipline:'strategie', status:'to_do', voortgang_pct:5, type:'Strategiesessie', laatst_geupdatet: new Date(Date.now()-3600000*2).toISOString() },
      { task_id:'demo-web-4', naam:'Opstartmeeting nieuwe website',  discipline:'webdesign', status:'to_do', voortgang_pct:5, type:'Kickoff', laatst_geupdatet: new Date(Date.now()-3600000*3).toISOString() }
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
    ],
    type_job: proj.discipline === 'video_fotografie' ? '6' : '',
    time_estimate: proj.discipline === 'video_fotografie' ? '14400000' : '',
    content_creators: proj.discipline === 'video_fotografie' ? '1' : '',
    has_contact: 'yes',
    has_bedrijf: 'yes'
  };
}

/* =================================================================
   AI STATUS BOT — floating assistent (v3 Feature 2B)
   Backend: scenario 5946454 (folder 348572). Beantwoordt projectvragen,
   escaleert via DM (directMessage) als het buiten data/te complex/klacht is.
   ESCALATE-conventie: eerste regel "ESCALATE: <Ilke|Arne|Vincent> | <reden>"
   gevolgd door een warme klant-boodschap. Klant ziet enkel die boodschap.
   ================================================================= */
const BOT_SUGGESTIONS = [
  'Hoever staat mijn project?',
  'Wanneer is alles klaar?',
  'Wat wacht er nog op mij?'
];

function botRecipientId(naam){
  const n = (naam || '').toLowerCase();
  if(n.indexOf('vincent') >= 0) return 'vincent';
  if(n.indexOf('arne') >= 0)    return 'arne';
  return 'ilke';
}

function buildProjectenContext(){
  const projs = (state.dashboard && state.dashboard.actieve_projecten) || [];
  const today = new Date().toLocaleDateString('nl-BE', { day:'numeric', month:'long', year:'numeric' });
  if(!projs.length) return 'Datum vandaag: ' + today + '\n\n(geen lopende projecten gevonden)';
  const lines = projs.map(p => {
    const disc = discMeta(p.discipline).label;
    const statusKey = (p.status || '').toLowerCase().replace(/\s+/g, '_');
    const statusLabel = p.status_label || STATUS_LABELS[statusKey] || p.status || 'in productie';
    const waits = (statusKey === 'doorgestuurd' || p.feedback_link) ? ' (wacht op feedback van de klant)' : '';
    const due = p.opleverdatum ? fmtDate(p.opleverdatum) : 'geen datum';
    return '- ' + (p.naam || 'Project') + ' (' + disc + ') | status: ' + statusLabel + waits + ' | opleverdatum: ' + due;
  }).join('\n');
  return 'Datum vandaag: ' + today + '\n\n' + lines;
}

function parseEscalation(answer){
  const m = (answer || '').match(/^\s*ESCALATE:\s*(Ilke|Arne|Vincent)\s*\|\s*([^\n]+)/i);
  if(!m) return null;
  const persoon = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  const reden = m[2].trim();
  const nlIdx = answer.indexOf('\n');
  let klantBoodschap = nlIdx >= 0 ? answer.slice(nlIdx + 1).trim() : '';
  // Soms staat de hele rest op dezelfde regel na de reden — pak dan een nette fallback
  if(!klantBoodschap){
    const heenWeer = persoon === 'Ilke' ? 'haar' : 'hem';
    klantBoodschap = 'Ik geef dit even persoonlijk door aan ' + persoon + ' van ons team — je hoort snel van ' + heenWeer + '.';
  }
  return { persoon, reden, klantBoodschap };
}

function fireEscalationDM(persoon, reden, vraag){
  if(state.demoMode || !ENDPOINTS.directMessage) return;
  try {
    api(ENDPOINTS.directMessage, {
      bedrijf_id: state.session.bedrijf_id,
      klant_naam: state.session.bedrijfsnaam,
      session_token: state.session.session_token,
      ontvanger: botRecipientId(persoon),
      type: 'vraag',
      onderwerp: 'AI-assistent: ' + vraag.slice(0, 60),
      bericht: 'Deze vraag kwam binnen via de AI-assistent in het klantenportaal en is automatisch naar jou doorgezet.\n\nVRAAG VAN DE KLANT:\n"' + vraag + '"\n\nREDEN ESCALATIE (ingeschat door AI):\n' + reden + '\n\nGraag persoonlijk opvolgen.'
    });
  } catch(e){ /* stil falen — klant ziet sowieso de warme boodschap */ }
}

function botMsgsEl(){ return $('s27-bot-msgs'); }

function appendBotMsg(role, html){
  const el = botMsgsEl(); if(!el) return null;
  const wrap = document.createElement('div');
  wrap.className = 's27-bot-msg s27-bot-msg-' + role;
  wrap.innerHTML = (role === 'bot' ? '<span class="s27-bot-msg-av">✦</span>' : '') +
    '<div class="s27-bot-bubble">' + html + '</div>';
  el.appendChild(wrap);
  el.scrollTop = el.scrollHeight;
  return wrap;
}

function appendBotTyping(){
  const el = botMsgsEl(); if(!el) return null;
  const wrap = document.createElement('div');
  wrap.className = 's27-bot-msg s27-bot-msg-bot';
  wrap.innerHTML = '<span class="s27-bot-msg-av">✦</span><div class="s27-bot-bubble s27-bot-typing"><span></span><span></span><span></span></div>';
  el.appendChild(wrap);
  el.scrollTop = el.scrollHeight;
  return wrap;
}

function appendBotEscBadge(persoon){
  const el = botMsgsEl(); if(!el) return;
  const wrap = document.createElement('div');
  wrap.className = 's27-bot-escbadge';
  wrap.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Doorgegeven aan <strong>' + esc(persoon) + '</strong> — je krijgt persoonlijk antwoord.';
  el.appendChild(wrap);
  el.scrollTop = el.scrollHeight;
}

function demoBotAnswer(text){
  const t = (text || '').toLowerCase();
  if(t.indexOf('klacht') >= 0 || t.indexOf('ontevreden') >= 0 || t.indexOf('belachelijk') >= 0)
    return 'ESCALATE: Vincent | Klant lijkt ontevreden in demo-modus.\nWat vervelend om te horen! Ik laat Vincent dit persoonlijk met je opnemen.';
  if(t.indexOf('prijs') >= 0 || t.indexOf('kost') >= 0 || t.indexOf('offerte') >= 0 || t.indexOf('nieuw project') >= 0)
    return 'ESCALATE: Arne | Vraag over prijs/nieuw project in demo-modus.\nLeuk dat je verder wil! Ik laat Arne contact met je opnemen om de mogelijkheden te bespreken.';
  return 'Dit is de demo-modus, dus ik geef geen live antwoorden. In jouw echte portaal kijk ik naar je lopende projecten en vertel ik precies hoever alles staat en wanneer het klaar is. 👍';
}

let _botFirstOpen = true;
function botGreet(){
  if(!_botFirstOpen) return;
  _botFirstOpen = false;
  appendBotMsg('bot', 'Hey! Ik ben de Studio&nbsp;27-assistent.<br>Vraag me gerust hoever een project staat, wanneer iets klaar is of wat er nog op jou wacht. 👋');
  const sug = $('s27-bot-suggest');
  if(sug) sug.innerHTML = BOT_SUGGESTIONS.map(s =>
    '<button type="button" class="s27-bot-sugbtn" data-bot-suggest="' + esc(s) + '">' + esc(s) + '</button>'
  ).join('');
}

async function sendBotMessage(text){
  text = (text || '').trim();
  if(!text || state._botBusy) return;
  state._botBusy = true;
  const sug = $('s27-bot-suggest'); if(sug) sug.innerHTML = '';
  appendBotMsg('user', esc(text).replace(/\n/g, '<br>'));
  const input = $('s27-bot-input');
  if(input){ input.value = ''; input.style.height = 'auto'; }
  const typing = appendBotTyping();

  let answer = '';
  try {
    if(state.demoMode){
      await new Promise(r => setTimeout(r, 650));
      answer = demoBotAnswer(text);
    } else {
      const res = await api(ENDPOINTS.aiStatusBot, {
        bedrijf_id: state.session.bedrijf_id,
        session_token: state.session.session_token,
        klant_naam: state.session.bedrijfsnaam,
        vraag: text,
        projecten_context: buildProjectenContext()
      });
      if(res.ok && res.data && res.data.ok && res.data.answer){
        answer = decodeMakeString(res.data.answer);
      } else {
        answer = 'Sorry, ik kan je vraag nu even niet beantwoorden. Stuur gerust een bericht via "Stuur bericht", dan pakt iemand van het team het meteen op.';
      }
    }
  } catch(e){
    answer = 'Er ging iets mis met de verbinding. Probeer het zo nog eens, of stuur ons een bericht.';
  }

  if(typing) try { typing.remove(); } catch(e){}

  const escResult = parseEscalation(answer);
  if(escResult){
    appendBotMsg('bot', esc(escResult.klantBoodschap).replace(/\n/g, '<br>'));
    appendBotEscBadge(escResult.persoon);
    fireEscalationDM(escResult.persoon, escResult.reden, text);
  } else {
    appendBotMsg('bot', esc(answer).replace(/\n/g, '<br>'));
  }
  state._botBusy = false;
}

function toggleStatusBot(forceOpen){
  const panel = $('s27-bot-panel'), fab = $('s27-bot-fab');
  if(!panel || !fab) return;
  const willOpen = (forceOpen === true) || (forceOpen === undefined && panel.getAttribute('aria-hidden') === 'true');
  panel.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
  fab.classList.toggle('s27-bot-fab-open', willOpen);
  if(willOpen){
    botGreet();
    setTimeout(() => { const i = $('s27-bot-input'); if(i) i.focus(); }, 120);
  }
}

function injectStatusBot(){
  if($('s27-bot-fab')) return;                       // al geïnjecteerd
  if(!state.demoMode && !ENDPOINTS.aiStatusBot) return;

  const fab = document.createElement('button');
  fab.id = 's27-bot-fab';
  fab.className = 's27-bot-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Vraag het de Studio 27-assistent');
  fab.innerHTML =
    '<svg class="s27-bot-fab-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
    '<svg class="s27-bot-fab-x" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>' +
    '<span class="s27-bot-fab-spark">✦</span>';
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.id = 's27-bot-panel';
  panel.className = 's27-bot-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Studio 27-assistent');
  panel.innerHTML =
    '<div class="s27-bot-head">' +
      '<span class="s27-bot-head-av">✦</span>' +
      '<div class="s27-bot-head-txt"><strong>Studio&nbsp;27-assistent</strong><span>Antwoordt direct · schakelt het team bij waar nodig</span></div>' +
      '<button class="s27-bot-close" type="button" aria-label="Sluiten">×</button>' +
    '</div>' +
    '<div class="s27-bot-msgs" id="s27-bot-msgs"></div>' +
    '<div class="s27-bot-suggest" id="s27-bot-suggest"></div>' +
    '<form class="s27-bot-inputbar" id="s27-bot-form">' +
      '<textarea id="s27-bot-input" rows="1" placeholder="Stel je vraag…" autocomplete="off"></textarea>' +
      '<button type="submit" class="s27-bot-send" aria-label="Versturen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
    '</form>';
  document.body.appendChild(panel);

  // Handlers
  fab.addEventListener('click', () => toggleStatusBot());
  panel.querySelector('.s27-bot-close').addEventListener('click', () => toggleStatusBot(false));
  const form = $('s27-bot-form');
  const input = $('s27-bot-input');
  form.addEventListener('submit', e => { e.preventDefault(); sendBotMessage(input.value); });
  // Enter = verstuur, Shift+Enter = nieuwe regel; auto-grow
  input.addEventListener('keydown', e => {
    if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendBotMessage(input.value); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  // Suggestie-knoppen (event delegation)
  $('s27-bot-suggest').addEventListener('click', e => {
    const b = e.target.closest('[data-bot-suggest]');
    if(b) sendBotMessage(b.dataset.botSuggest);
  });
}

/* =================================================================
   AUTH v2 — Firebase-login UI (achter ?auth=v2)
   ================================================================= */
var _authV2 = { enrollStarted:false };

function v2LoadScriptOnce(src, id){
  return new Promise(function(resolve, reject){
    if(document.getElementById(id)){ resolve(); return; }
    var s = document.createElement('script');
    s.src = src; s.id = id;
    s.onload = function(){ resolve(); };
    s.onerror = function(){ reject(new Error('kon script niet laden: ' + src)); };
    document.head.appendChild(s);
  });
}

function v2Err(msg){
  var el = $('s27-v2-err');
  if(!el) return;
  if(!msg){ el.style.display = 'none'; return; }
  el.textContent = msg; el.style.display = 'block';
}

function v2ShowPhase(phase){
  ['s27-v2-signin','s27-v2-mfa','s27-v2-enroll'].forEach(function(id){ var el = $(id); if(el) el.style.display = 'none'; });
  var map = { signed_out:'s27-v2-signin', mfa_challenge:'s27-v2-mfa', needs_enrollment:'s27-v2-enroll' };
  var t = map[phase]; if(t && $(t)) $(t).style.display = 'block';
}

function buildV2LoginUI(){
  var card = document.querySelector('#s27-login-view .s27-login-card');
  if(!card || document.getElementById('s27-v2-auth')) return;
  var oldForm = $('s27-login-form'); if(oldForm) oldForm.style.display = 'none';
  var oldHelp = document.querySelector('#s27-login-view .s27-login-help'); if(oldHelp) oldHelp.style.display = 'none';
  var inS = 'width:100%;padding:11px;border:1px solid #d9d9e0;border-radius:10px;font-size:15px;box-sizing:border-box;margin-bottom:8px';
  var coS = 'width:100%;padding:11px;border:1px solid #d9d9e0;border-radius:10px;font-size:18px;letter-spacing:3px;text-align:center;box-sizing:border-box;margin-bottom:8px';
  var wrap = document.createElement('div');
  wrap.id = 's27-v2-auth';
  wrap.innerHTML =
    '<div id="s27-v2-err" class="s27-login-error" style="display:none"></div>' +
    '<div id="s27-v2-signin">' +
      '<button type="button" id="s27-v2-google" class="s27-btn"><span>Inloggen met Google</span></button>' +
      '<div style="text-align:center;margin:14px 0;color:#9a9a9a;font-size:13px">— of met e-maillink —</div>' +
      '<input id="s27-v2-email" type="email" autocomplete="email" placeholder="jij@bedrijf.be" style="' + inS + '">' +
      '<button type="button" id="s27-v2-emaillink" class="s27-btn" style="background:#1a1a1a"><span>Stuur inloglink</span></button>' +
      '<p id="s27-v2-emailsent" style="display:none;color:#166534;font-size:13px;margin-top:10px">Link verstuurd — open de link in dezelfde browser.</p>' +
    '</div>' +
    '<div id="s27-v2-mfa" style="display:none">' +
      '<p style="font-size:14px;color:#555;margin-top:0">Voer de 6-cijfercode uit je authenticator-app in.</p>' +
      '<input id="s27-v2-mfacode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="' + coS + '">' +
      '<button type="button" id="s27-v2-mfaverify" class="s27-btn"><span>Bevestigen</span></button>' +
    '</div>' +
    '<div id="s27-v2-enroll" style="display:none">' +
      '<p style="font-size:14px;color:#555;margin-top:0"><b>Tweestapsverificatie instellen (verplicht)</b><br>Scan de QR met Google Authenticator of Authy — of voer de sleutel handmatig in. Geef daarna de 6-cijfercode die je app toont.</p>' +
      '<div id="s27-v2-qr" style="display:flex;justify-content:center;margin:10px 0;min-height:160px"></div>' +
      '<p style="font-size:12px;color:#777;text-align:center;word-break:break-all">Sleutel: <code id="s27-v2-secret"></code></p>' +
      '<input id="s27-v2-enrollcode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-cijfercode uit je app" style="' + coS + '">' +
      '<button type="button" id="s27-v2-enrollbtn" class="s27-btn"><span>Activeren</span></button>' +
    '</div>';
  card.appendChild(wrap);
  $('s27-v2-google').addEventListener('click', function(){ v2Err(''); window.S27Auth.google(); });
  $('s27-v2-emaillink').addEventListener('click', function(){
    var e = ($('s27-v2-email').value || '').trim();
    if(!e){ v2Err('Vul je e-mailadres in.'); return; }
    v2Err(''); window.S27Auth.emailLink(e).catch(function(x){ v2Err(x.message); });
  });
  $('s27-v2-mfaverify').addEventListener('click', function(){
    window.S27Auth.mfaVerify(($('s27-v2-mfacode').value || '').trim()).catch(function(x){ v2Err(x.message); });
  });
  $('s27-v2-enrollbtn').addEventListener('click', function(){
    window.S27Auth.enrollVerify(($('s27-v2-enrollcode').value || '').trim()).catch(function(x){ v2Err(x.message); });
  });
}

async function initAuthV2(){
  showLogin();
  buildV2LoginUI();
  v2LoadScriptOnce('https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js', 's27-qrcode-lib').catch(function(){});
  try {
    await import(AUTH_JS_URL);
  } catch(e){
    console.error('[S27] auth.js import faalde:', e);
    v2Err('Kon de loginmodule niet laden. Ververs de pagina.');
    return;
  }
  if(!window.S27Auth){ v2Err('Loginmodule niet beschikbaar.'); return; }

  window.S27Auth.subscribe(async function(s){
    if(s.phase === 'signed_out'){
      _authV2.enrollStarted = false;
      showLogin(); v2ShowPhase('signed_out'); v2Err(s.error || '');
    } else if(s.phase === 'email_sent'){
      var es = $('s27-v2-emailsent'); if(es) es.style.display = 'block';
    } else if(s.phase === 'mfa_challenge'){
      v2Err(s.error || ''); showLogin(); v2ShowPhase('mfa_challenge');
    } else if(s.phase === 'needs_enrollment'){
      v2Err(s.error || ''); showLogin(); v2ShowPhase('needs_enrollment');
      if(!_authV2.enrollStarted){
        _authV2.enrollStarted = true;
        try {
          var r = await window.S27Auth.enrollBegin();
          var sec = $('s27-v2-secret'); if(sec) sec.textContent = r.secret;
          var qrEl = $('s27-v2-qr');
          if(qrEl){ qrEl.innerHTML = ''; if(window.QRCode){ new window.QRCode(qrEl, { text:r.qrUrl, width:160, height:160 }); } else { qrEl.textContent = '(QR-lib laadt nog — gebruik de sleutel hieronder)'; } }
        } catch(e){ _authV2.enrollStarted = false; v2Err(e.message); }
      }
    } else if(s.phase === 'ready'){
      var u = s.user || {};
      state.session = { bedrijf_id:'via-gateway', bedrijfsnaam:(u.email || 'Klant'), session_token:'firebase', uid:u.uid };
      state.demoMode = false;
      v2Err('');
      showDashboard();
      await loadCompaniesAndLink();   // multi-bedrijf: koppel + haal bedrijvenlijst, verse claim
      loadDashboard();
      renderCompanySwitcher();        // toont de bedrijf-switcher in de topbalk bij >1 bedrijf
    }
  });

  window.S27Auth.init({ gatewayBase: GATEWAY_BASE }).catch(function(e){ v2Err('Init faalde: ' + e.message); });
}

/* =================================================================
   INIT
   ================================================================= */
function init(){
  const params = qs();
  if (AUTH_V2) {
    initAuthV2();
  } else if(params.get('demo') === '1'){
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

  // Login (legacy gedeelde-code): alleen bedraden als AUTH_V2 uit staat.
  if (!AUTH_V2) {
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
  }

  $('s27-lock-btn').addEventListener('click', handleLogout);
  $('s27-modal-close').addEventListener('click', closeModal);
  $('s27-modal').addEventListener('click', e => { if(e.target.id === 's27-modal') closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

  // Tab navigatie handlers
  document.querySelectorAll('.s27-tab[data-tab]').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });
  // #93 dropdown-nav: groep-knoppen openen/sluiten (klik = touch-vriendelijk; hover = CSS)
  document.querySelectorAll('.s27-navgroup-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const grp = btn.closest('.s27-navgroup');
      const wasOpen = grp.classList.contains('is-open');
      document.querySelectorAll('.s27-navgroup').forEach(g => g.classList.remove('is-open'));
      if(!wasOpen) grp.classList.add('is-open');
      btn.setAttribute('aria-expanded', String(!wasOpen));
    });
  });
  document.addEventListener('click', e => {
    if(!e.target.closest('.s27-navgroup')) document.querySelectorAll('.s27-navgroup').forEach(g => g.classList.remove('is-open'));
  });
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();