/* =============================================================================
   Studio 27 Klantenportaal v4 — API / AUTH-laag
   -----------------------------------------------------------------------------
   1:1 geport uit dashboard.js (ONGEWIJZIGDE backend: Make/ClickUp/gateway).
   Framework-agnostisch: GEEN UI hierin. portal.js zet de hooks:
     S27.onSessionExpired(msg)   — toon melding + terug naar login
     S27.reloadDashboard()       — herlaad de dashboarddata (na bedrijf-switch)
   Laadvolgorde in index.html: api.js  →  assets-data.js  →  panels.js  →  portal.js
   ============================================================================= */

/* ---- Gedeelde state (portal.js + panels.js bouwen hierop verder) ---- */
var state = window.S27State = {
  session: null,
  demoMode: false,
  viewMode: 'login',          // 'login' | 'app'
  portalCompanies: [],        // [{id, naam}] voor de bedrijf-switcher
  activeBedrijf: '',
  _provisionTried: false,
  _sessionExpiredHandled: false,
  data: {},                   // gecachte API-data (bedrijfContent, projecten, performance, …)
  route: null                 // deep-link pending route (zie portal.js router)
};

/* ---- UI-hooks (portal.js vult deze in) ---- */
var S27 = window.S27 = { onSessionExpired: null, reloadDashboard: null };

/* ---- Endpoints (EXACT uit dashboard.js — backend ongewijzigd) ---- */
const ENDPOINTS = {
  // v1 — folder 12 KLANTPORTAAL (legacy)
  login:           'https://hook.eu1.make.com/gk7fxusnnrwkyfhcpyup8w39ygoz5m5u',
  dashboard:       'https://hook.eu1.make.com/q1hklcvhum7m14ie57p6t6ci7l6un48e',
  projectDetail:   'https://hook.eu1.make.com/1mmhcsa0sie22po3kbwcx423dakidc44',
  calendar:        'https://hook.eu1.make.com/5e1chj9seh9jlw7nejhytwjg66i7vzyd',
  uploadProject:   'https://hook.eu1.make.com/rk5ui1ueb4j42hiqye8dfzfmka0gf318',
  uploadAlg:       'https://hook.eu1.make.com/hyf7ejtbskq743d56nveucv9xto5yo8c',
  // v2 — folder 13 KLANTPORTAAL v2 (robuust, native modules, session-validatie)
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
  // v3 — AI Status Bot
  aiStatusBot:       'https://hook.eu1.make.com/3uor4cy6vmhe77sh2uvujg9iufoewj3u',
  pandadocPricelist: 'https://hook.eu1.make.com/uw2974b7b2yurygsgcn2i97x4lh9h86e',
  shootAvailability: 'https://hook.eu1.make.com/c1aekp5r567tqvgvp4e2a4juu3npanap',
  // v3.1-6 — Huisstijl-bibliotheek (Google Drive)
  huisstijlList:     'https://hook.eu1.make.com/v3z3t67otw7d96s37qciedt3uykimiru',
  huisstijlUpload:   'https://hook.eu1.make.com/3eqyxbkejfhyz8w2kl62lp1lsxwfr2d0',
  huisstijlDelete:   'https://hook.eu1.make.com/irpo6iemme6qpfe75rr83brkj7ybftsd',
  driveEnsure:       'https://hook.eu1.make.com/cy5n1y0377ovy2yso5f4dev1n792u71k',
  // v3.1-7 — Facturatie
  facturatieSave:        'https://hook.eu1.make.com/41635fjyidjts4hlixkgxcsmo6apoe02',
  projectFacturatieSave: 'https://hook.eu1.make.com/cmqf97ej6aewxokt9g23tbff6gxg7frm',
  // v3 — Performance Dashboard (mode=list | mode=data&task_id=…)
  performance:       'https://hook.eu1.make.com/chmsfitxr12m8cpjp4x3fb8ru1nqr7gg',
  // v3 — Bedrijf-beheer (get_team | update_bedrijf | save_contact | update_contact)
  bedrijfBeheer:     'https://hook.eu1.make.com/bf5xp3rkbh7dik9rp6jvue4w9p2moctn',
  // Agenda (beschikbaarheid + inplannen) — scope-guard server-side actief
  beschikbaarheid:   'https://hook.eu1.make.com/jn1ael12s6b4xp6fsdqd49x9p27v8cht',
  inplannen:         'https://hook.eu1.make.com/4r3y6ba68spfgcgng7v0lvso11il6p6u'
};

/* AUTH v2 (Firebase + Cloudflare-gateway) is de DEFAULT. ?auth=v1 = legacy-vangnet. */
const AUTH_V2 = !/[?&]auth=v1(?:&|$)/.test(location.search);
const GATEWAY_BASE = 'https://s27-portal-gateway.studio27marketing.workers.dev';
const PROVISION_URL = 'https://hook.eu1.make.com/hjmc9k1w9ry027kom3rfiwci9pejub78';
const ENDPOINT_KEYS = Object.keys(ENDPOINTS).reduce(function(m, k){ m[ENDPOINTS[k]] = k; return m; }, {});
// auth.js wordt relatief naast api.js geladen (CDN of lokaal); fallback = v4-branch.
const AUTH_JS_URL = (function(){
  try {
    var sc = document.querySelector('script[data-s27-api]');
    if (sc && sc.src) return sc.src.replace(/api\.js(\?.*)?$/, 'auth.js');
  } catch(e){}
  return 'https://raw.githack.com/studio27marketing/klantenportaal/portal-v4-redesign/v4/auth.js';
})();

/* =============================================================================
   api() / apiV2() — elke call gaat in live via de gateway (bedrijf_id server-side)
   ============================================================================= */
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
    if(parsed.status === 401 && state && state.session){ handleSessionExpired(parsed.data && parsed.data.message); }
    return parsed;
  } catch(e){ return { ok:false, status:0, error:e.message }; }
}

// AUTH v2: route elke call via de Cloudflare-gateway met het Firebase ID-token.
// bedrijf_id wordt server-side door de gateway gezet; meegestuurde session_token wordt genegeerd.
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
    // JIT-provisioning: ingelogd maar nog geen bedrijf-koppeling → koppel via Make,
    // vernieuw het token (nieuwe bedrijf_id-claim) en herprobeer exact één keer.
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

/* =============================================================================
   Provisioning + multi-bedrijf (koppel ingelogd account aan bedrijf via Make)
   Provision-respons "id::Naam|id::Naam" → [{id, naam}]. x-www-form-urlencoded
   = CORS-"simple" (geen preflight) ÉN Make parset de velden correct.
   ============================================================================= */
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
// Bij login: koppel + haal de bedrijvenlijst (switcher) + forceer een verse claim.
async function loadCompaniesAndLink(){
  try {
    const token = window.S27Auth ? await window.S27Auth.token() : null;
    if(!token) return;
    const d = await provisionFetch(token, lastSelectedBedrijf());
    if(d && d.ok && window.S27Auth) { await window.S27Auth.token(true); }
  } catch(e){}
}
// Wissel van actief bedrijf (>1 bedrijf): verse claim + herlaad dashboard via hook.
async function switchCompany(id){
  if(!id || id === state.activeBedrijf) return;
  try { localStorage.setItem('s27_active_bedrijf', id); } catch(e){}
  const token = window.S27Auth ? await window.S27Auth.token() : null;
  if(!token) return;
  const d = await provisionFetch(token, id);
  if(d && d.ok){
    if(window.S27Auth) await window.S27Auth.token(true);   // verse claim met het nieuwe bedrijf
    state._provisionTried = false;
    if(typeof S27.reloadDashboard === 'function') S27.reloadDashboard();
  }
}

/* =============================================================================
   Sessie verlopen (401) — UI-ontkoppeld via hook
   ============================================================================= */
function handleSessionExpired(message){
  if(state._sessionExpiredHandled) return;          // niet in een loop terechtkomen
  state._sessionExpiredHandled = true;
  try { localStorage.removeItem('s27_portal_session'); } catch(e){}
  const msg = message || 'Je sessie is verlopen — log opnieuw in.';
  if(typeof S27.onSessionExpired === 'function'){ S27.onSessionExpired(msg); return; }
  state.session = null; state.viewMode = 'login';
  if(typeof S27.reloadDashboard === 'function') S27.reloadDashboard();
}
