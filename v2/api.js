/* =============================================================================
   Studio 27 Klantenportaal v4, API / AUTH-laag
   -----------------------------------------------------------------------------
   1:1 geport uit dashboard.js (ONGEWIJZIGDE backend: Make/ClickUp/gateway).
   Framework-agnostisch: GEEN UI hierin. portal.js zet de hooks:
     S27.onSessionExpired(msg), toon melding + terug naar login
     S27.reloadDashboard(), herlaad de dashboarddata (na bedrijf-switch)
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
  data: { dashboard:null, details:{}, chats:{}, meetings:null, bedrijf:null, team:null, huisstijl:null, offertes:null, metricool:null, ads:null, commsTaskId:null, commsTeam:null },  // gecachte API-data

  route: null                 // deep-link pending route (zie portal.js router)
};

/* ---- UI-hooks (portal.js vult deze in) ---- */
var S27 = window.S27 = { onSessionExpired: null, reloadDashboard: null, onSwitchFailed: null, closeSwitchMenu: null, stopChatPoll: null, showSwitching: null, stashData: null };

/* Cloudflare-gateway-basis (de v2-handlers achter Firebase-auth). Vooraan gedeclareerd
   zodat ENDPOINTS hieronder de gateway-gerouteerde endpoints kan opbouwen. */
const GATEWAY_BASE = (function(){
  try {
    var h = location.hostname || '';
    // Enkel wanneer de worker de frontend ZELF serveert (workers.dev) is het zelfde origin.
    // Op Cloudflare Pages (portaal.studio27.be) draait de frontend los van de worker:
    // dan praten we cross-origin met de worker-URL hieronder (CORS staat dat toe).
    if (/\.workers\.dev$/.test(h)) return location.origin;
  } catch(e){}
  return 'https://s27-portal-gateway-v2.studio27marketing.workers.dev';
})();

/* ---- Endpoints (EXACT uit dashboard.js, backend ongewijzigd) ---- */
const ENDPOINTS = {
  // v1, folder 12 KLANTPORTAAL (legacy)
  login:           'https://hook.eu1.make.com/gk7fxusnnrwkyfhcpyup8w39ygoz5m5u',
  dashboard:       'https://hook.eu1.make.com/q1hklcvhum7m14ie57p6t6ci7l6un48e',
  projectDetail:   'https://hook.eu1.make.com/1mmhcsa0sie22po3kbwcx423dakidc44',
  calendar:        'https://hook.eu1.make.com/5e1chj9seh9jlw7nejhytwjg66i7vzyd',
  uploadProject:   'https://hook.eu1.make.com/rk5ui1ueb4j42hiqye8dfzfmka0gf318',
  uploadAlg:       'https://hook.eu1.make.com/hyf7ejtbskq743d56nveucv9xto5yo8c',
  // v2, folder 13 KLANTPORTAAL v2 (robuust, native modules, session-validatie)
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
  // v3, AI Status Bot
  aiStatusBot:       'https://hook.eu1.make.com/3uor4cy6vmhe77sh2uvujg9iufoewj3u',
  pandadocPricelist: 'https://hook.eu1.make.com/uw2974b7b2yurygsgcn2i97x4lh9h86e',
  shootAvailability: 'https://hook.eu1.make.com/c1aekp5r567tqvgvp4e2a4juu3npanap',
  // v3.1-6, Huisstijl-bibliotheek (Google Drive)
  huisstijlList:     'https://hook.eu1.make.com/v3z3t67otw7d96s37qciedt3uykimiru',
  huisstijlUpload:   'https://hook.eu1.make.com/3eqyxbkejfhyz8w2kl62lp1lsxwfr2d0',
  huisstijlDelete:   'https://hook.eu1.make.com/irpo6iemme6qpfe75rr83brkj7ybftsd',
  driveEnsure:       'https://hook.eu1.make.com/cy5n1y0377ovy2yso5f4dev1n792u71k',
  // v3.1-7, Facturatie
  facturatieSave:        'https://hook.eu1.make.com/41635fjyidjts4hlixkgxcsmo6apoe02',
  projectFacturatieSave: 'https://hook.eu1.make.com/cmqf97ej6aewxokt9g23tbff6gxg7frm',
  // v3, Performance Dashboard (mode=list | mode=data&task_id=…)
  performance:       'https://hook.eu1.make.com/chmsfitxr12m8cpjp4x3fb8ru1nqr7gg',
  // v3, Bedrijf-beheer (get_team | update_bedrijf | save_contact | update_contact)
  bedrijfBeheer:     'https://hook.eu1.make.com/bf5xp3rkbh7dik9rp6jvue4w9p2moctn',
  // Agenda (beschikbaarheid + inplannen), scope-guard server-side actief
  beschikbaarheid:   'https://hook.eu1.make.com/jn1ael12s6b4xp6fsdqd49x9p27v8cht',
  inplannen:         'https://hook.eu1.make.com/4r3y6ba68spfgcgng7v0lvso11il6p6u',
  // Offerte-samensteller: klant stelt zelf een offerte samen (catalogus -> PandaDoc via Make).
  // BE-contract: { items:[{sku,naam,prijs,aantal}], opmerking } -> { ok, offerte_task_id, offerte_task_url, pandadoc_id, message }.
  offerteGenereren:  GATEWAY_BASE + '/offerteGenereren',
  // Metricool (geplande social posts) via de gateway i.p.v. de directe Make-hook.
  // BE-contract: { ok, linked, posts:[{id,datum,tekst,media,netwerken:[{netwerk,status}]}] }.
  metricool:         GATEWAY_BASE + '/metricool',
  // Metricool post goedkeuren vanuit het portaal: { post_id } -> { ok, approved }.
  metricoolApprove:  GATEWAY_BASE + '/metricoolApprove',
  // Klant geeft feedback/aanpassing op een geplande post: { post_id, feedback } -> { ok }.
  metricoolFeedback: GATEWAY_BASE + '/metricoolFeedback',
  // Klant past een post DIRECT aan in Metricool: { post_id, text, providers:[net], media:[url] } -> { ok, id }.
  metricoolUpdate:   GATEWAY_BASE + '/metricoolUpdate',
  // Klant uploadt een foto/video als post-visual: { filename, content_type, file_data(b64) } -> { ok, url }.
  metricoolMediaUpload: GATEWAY_BASE + '/metricoolMediaUpload',
  // Metricool analytics (KPI-dashboard + trend): { days? } -> { ok, linked, totals, networks:[], trend:[] }.
  metricoolStats:    GATEWAY_BASE + '/metricoolStats',
  metricoolPostStats:GATEWAY_BASE + '/metricoolPostStats',
  // ADMIN-only (staff): uitgebreide social-rapportage (team-weergave) in één call — account-KPI's +
  // per-netwerk breakdown met dag-series + vergelijking + post-insights. Acting-as scope.
  metricoolStatsRich:GATEWAY_BASE + '/metricoolStatsRich',
  // SEC-6: ads-insights via de gateway (bedrijf_id server-side uit het token), niet meer direct.
  ads:               GATEWAY_BASE + '/ads',
  // Meta Ads real-time (direct via Graph API, geen Make): { period? } -> { ok, linked, account,
  // currency, period, kpis, campaigns:[], ads:[] }. bedrijf_id + account server-side bepaald.
  metaAds:           GATEWAY_BASE + '/metaAds',
  // Campagne-creatives (rijke media: video/foto/carrousel) ON-DEMAND: { campaign_id } -> { ok, ads:[] }.
  metaCampaignAds:   GATEWAY_BASE + '/metaCampaignAds',
  // Google Ads real-time (direct via Google Ads API, geen Make): { from,to,compare } -> zelfde vorm als
  // metaAds { ok, linked, account, currency, kpis, prevKpis, compareLabel, campaigns:[], trend:[] }.
  googleAds:         GATEWAY_BASE + '/googleAds',
  // ADMIN-only (staff): Google-maandoverzicht (12 maanden) voor de dynamische maandgrafiek. {} ->
  // { ok, linked, currency, campaigns:[{id,name}], months:[{month:'YYYY-MM',spend,clicks,conversions,
  // convValue,campaigns:[{id,name,spend,clicks,conversions,convValue}]}] }. Acting-as scope.
  googleMonthly:     GATEWAY_BASE + '/googleMonthly',
  // ADMIN-only (staff): per-bedrijf KV-meeting-werkblad (notities + recs + uploads).
  adsWorkspace:      GATEWAY_BASE + '/adsWorkspace',
  adsWorkspaceSave:  GATEWAY_BASE + '/adsWorkspaceSave',
  adsUploadAdd:      GATEWAY_BASE + '/adsUploadAdd',
  // ADMIN-only (staff): uitgebreide Google-rapportage (team-weergave). { from,to,compare } ->
  // { ok, linked, kpis(10), prevKpis, campaigns:[{...,daily,adGroups,imprShare}], keywords:[] }. Acting-as scope.
  googleAdsRich:     GATEWAY_BASE + '/googleAdsRich',
  // ADMIN-only (staff): uitgebreide Meta-rapportage voor de team-weergave. { from,to,compare } ->
  // { ok, linked, kpis(8+leads/cpl), prevKpis, campaigns:[{...,daily,adsets,ads}] }. Acting-as scope.
  metaAdsRich:       GATEWAY_BASE + '/metaAdsRich',
  // ADMIN-only (staff @studio27.be): lijst ALLE bedrijven voor de admin-bedrijvenkiezer/zoek.
  // {} -> { ok, companies:[{id,naam}], count }. Worker gate't strikt op het geverifieerde domein.
  adminCompanies:    GATEWAY_BASE + '/adminCompanies',
  // Shoot-inplannen (port van studio27.be/shoot-inplannen, VOLLEDIG via de gateway, geen Make).
  // shootContext: { task_id } -> { status:'ok'|'wrong_type'|'incomplete_metadata'|'already_scheduled'|'not_found'|'forbidden', timeHours, aantalCreators, availability:{shoots,shoots_27m,vakantie,hosts} }.
  shootContext:      GATEWAY_BASE + '/shootContext',
  // shootSubmit: { task_id, datum, startuur, timeHours, aantalPersonen, klant*, locatie*, contact*, extraInfo, lat?, lng? } -> { ok, taskId, assignedTo, assignedName }.
  shootSubmit:       GATEWAY_BASE + '/shootSubmit',
  // Meeting-tunnel: taskloze Google-Calendar-boeking + invite (Algemene meeting/Projectmeeting/Nieuw project).
  // { host_email, host_naam, start, eind, start_ms, online, titel, beschrijving, locatie, client_email, client_naam, project_task_id?, project_naam?, intake?, when_label? }
  //   -> { ok, event_id, meet_link, html_link }. Muteert GEEN project-due_date; host moet @studio27.be zijn.
  meetingBook:       GATEWAY_BASE + '/meetingBook',
  // Altijd-open klantchat op de vaste communicatietaak (server-side taak-resolutie; client stuurt GEEN task_id).
  commsChatList:       GATEWAY_BASE + '/commsChatList',
  commsChatPost:       GATEWAY_BASE + '/commsChatPost',
  commsChatAttachment: GATEWAY_BASE + '/commsChatAttachment',
  // Webprestaties (GA4 + Search Console, direct via de Google-API's, geen Make). Team-only (staff, acting-as).
  // webTraffic: { period | from,to,compare } -> { ok, linked, totals, channels, split, trend, landingPages }.
  webTraffic:        GATEWAY_BASE + '/webTraffic',
  // webSearch: { period | from,to } -> { ok, linked, site, totals, queries, pages, trend }.
  webSearch:         GATEWAY_BASE + '/webSearch',
  // Website-supportticket: { onderwerp, omschrijving?, klant_naam?, filename?, file_data? } -> { ok, ticket_id }.
  // Taak in de Tickets-lijst (assignee Klaas) + Bedrijf-relatie; push bij status on hold/doorgestuurd.
  ticketCreate:      GATEWAY_BASE + '/ticketCreate'
};

/* AUTH v2 (Firebase + Cloudflare-gateway) is de DEFAULT. ?auth=v1 = legacy-vangnet. */
const AUTH_V2 = !/[?&]auth=v1(?:&|$)/.test(location.search);
/* GATEWAY_BASE staat hierboven gedeclareerd (vóór ENDPOINTS). */
const PROVISION_URL = 'https://hook.eu1.make.com/hjmc9k1w9ry027kom3rfiwci9pejub78';
/* Metricool-posts: LEGACY directe Make-hook. De frontend gebruikt nu ENDPOINTS.metricool
   (via de gateway) i.p.v. deze hook; bewaard als vangnet/referentie, niet meer aangeroepen. */
const METRICOOL_DIRECT = 'https://hook.eu1.make.com/a5ndvvcb5ipoivw86byv0a3mfvsfd24v';
/* Advertentie-campagnes (Meta-insights, later Google): GEÏSOLEERD Make-scenario,
   directe form-encoded call (CORS-safe). Leest de Meta Ads ID + Business ID server-side
   uit de bedrijf-taak en haalt campagne-insights (90d) op via de facebook-connectie. */
const ADS_DIRECT = 'https://hook.eu1.make.com/wvb3qfpqpm28kq6ksrduqywwrymokdjv';
const ENDPOINT_KEYS = Object.keys(ENDPOINTS).reduce(function(m, k){ m[ENDPOINTS[k]] = k; return m; }, {});
// auth.js wordt relatief naast api.js geladen (CDN of lokaal); fallback = v2-branch.
const AUTH_JS_URL = (function(){
  try {
    var sc = document.querySelector('script[data-s27-api]');
    if (sc && sc.src) return sc.src.replace(/api\.js(\?.*)?$/, 'auth.js');
  } catch(e){}
  return 'https://raw.githack.com/studio27marketing/klantenportaal/portal-v2-direct/v2/auth.js';
})();

/* =============================================================================
   api() / apiV2(), elke call gaat in live via de gateway (bedrijf_id server-side)
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

// Standaard v2-headers + (enkel voor staff/admin) de acting-as-header X-Act-As-Bedrijf.
// De worker honoreert die header UITSLUITEND voor een geverifieerd @studio27.be-token; voor een
// gewone klant wordt ze genegeerd. Zo scope't één en dezelfde frontend-call naar het door de
// admin gekozen bedrijf, zonder dat de klant-flow ook maar iets verandert.
function _v2Headers(token){
  const h = { 'Content-Type':'application/json', 'Authorization':'Bearer ' + token };
  if(typeof state!=='undefined' && state && state.adminMode && state.activeBedrijf){
    h['X-Act-As-Bedrijf'] = String(state.activeBedrijf);
  }
  return h;
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
      headers: _v2Headers(token),
      body: JSON.stringify(payload || {})
    });
    const t = await r.text();
    let parsed;
    try { parsed = { ok:r.ok, status:r.status, data:JSON.parse(t) }; }
    catch { parsed = { ok:r.ok, status:r.status, data:{ _raw:t } }; }
    // JIT-provisioning: ingelogd maar nog geen bedrijf-koppeling → koppel via Make,
    // vernieuw het token (nieuwe bedrijf_id-claim) en herprobeer exact één keer.
    // NIET voor admin/staff: die hebben bewust geen bedrijfskoppeling en scopen via X-Act-As-Bedrijf.
    if(parsed.status === 403 && parsed.data && parsed.data.error === 'no_company_link' && !state._provisionTried && !(state && state.adminMode)){
      state._provisionTried = true;
      const linked = await tryProvision(token);
      if(linked){
        const fresh = (window.S27Auth ? await window.S27Auth.token(true) : token) || token;
        const r2 = await fetch(GATEWAY_BASE + '/' + key, {
          method:'POST',
          headers: _v2Headers(fresh),
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
  // ontdubbel op id: een bedrijf kan zowel via f0de5c6c-toegang als via een contactpersoon binnenkomen
  var seen={}, out=[];
  String(combined || '').split('|').filter(Boolean).forEach(function(row){
    const idx = row.indexOf('::');
    const id = (idx >= 0 ? row.slice(0, idx) : row).trim();
    const naam = ((idx >= 0 ? row.slice(idx + 2) : 'Bedrijf').trim()) || 'Bedrijf';
    if(!id || seen[id]) return;
    seen[id] = 1; out.push({ id: id, naam: naam });
  });
  return out;
}
// Provisioning: probeer EERST de worker (off-Make, met volledige Firebase-tokenvalidatie + exacte
// ClickUp-lookup). Val enkel bij een technische fout terug op de oude Make-hook, zodat de login
// nooit kan breken tijdens de overgang. Na bevestiging halen we de Make-fallback weg.
async function _provisionTry(url, token, selectedBid){
  try {
    const r = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: 'idToken=' + encodeURIComponent(token) + '&selected_bedrijf_id=' + encodeURIComponent(selectedBid || '')
    });
    if(r.status >= 500) return { _neterr:true };
    const d = await r.json().catch(function(){ return null; });
    return (d && typeof d.ok !== 'undefined') ? d : { _neterr:true };
  } catch(e){ return { _neterr:true }; }
}
async function provisionFetch(token, selectedBid){
  // 100% off-Make: provisioning loopt nu volledig via de worker (volledige Firebase-tokenvalidatie
  // + exacte ClickUp-lookup over beide relatie-kanten). Geen Make-fallback meer.
  var d = await _provisionTry(GATEWAY_BASE + '/provision', token, selectedBid);
  d = d || {};
  if(d && d.ok){
    state.portalCompanies = zipCompanies(d.companies);
    state.activeBedrijf = d.bedrijf_id || '';
    try { if(d.bedrijf_id) localStorage.setItem('s27_active_bedrijf', d.bedrijf_id); } catch(e){}
  }
  return d;
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
// localStorage wordt PAS geschreven na een bevestigde provision (d.ok && d.bedrijf_id); zo blijft een
// geweigerd bedrijf niet als "laatst gekozen" hangen. Bij falen: nette melding, geen reload.
async function switchCompany(id){
  if(!id || id === state.activeBedrijf) return;
  // menu sluiten + chat-poll stoppen aan het begin (los van slagen/falen)
  if(typeof S27.closeSwitchMenu === 'function') S27.closeSwitchMenu();
  if(typeof S27.stopChatPoll === 'function') S27.stopChatPoll();
  // snapshot van de huidige (nog het OUDE bedrijf) data bewaren voor instant terugschakelen
  if(typeof S27.stashData === 'function') S27.stashData(state.activeBedrijf);
  // ONMIDDELLIJK de loader tonen: provision + forced token-refresh hieronder kunnen seconden kosten
  // vóór loadAndEnter de loader zelf opzet -> anders voelt de switch "blind" aan.
  if(typeof S27.showSwitching === 'function') S27.showSwitching(id);
  const token = window.S27Auth ? await window.S27Auth.token() : null;
  if(!token){ if(typeof S27.onSwitchFailed === 'function') S27.onSwitchFailed('Je bent niet meer ingelogd. Log opnieuw in om van bedrijf te wisselen.'); return; }
  const d = await provisionFetch(token, id);
  if(d && d.ok && d.bedrijf_id){
    try { localStorage.setItem('s27_active_bedrijf', d.bedrijf_id); } catch(e){}
    if(window.S27Auth) await window.S27Auth.token(true);   // verse claim met het nieuwe bedrijf
    state._provisionTried = false;
    if(typeof S27.reloadDashboard === 'function') S27.reloadDashboard(true);   // skipLink: niet dubbel provisionen
  } else {
    if(typeof S27.onSwitchFailed === 'function') S27.onSwitchFailed('Wisselen van bedrijf lukte niet. Probeer het zo opnieuw.');
  }
}

/* =============================================================================
   Sessie verlopen (401), UI-ontkoppeld via hook
   ============================================================================= */
function handleSessionExpired(message){
  if(state._sessionExpiredHandled) return;          // niet in een loop terechtkomen
  state._sessionExpiredHandled = true;
  try { localStorage.removeItem('s27_portal_session'); } catch(e){}
  const msg = message || 'Je sessie is verlopen, log opnieuw in.';
  if(typeof S27.onSessionExpired === 'function'){ S27.onSessionExpired(msg); return; }
  state.session = null; state.viewMode = 'login';
  if(typeof S27.reloadDashboard === 'function') S27.reloadDashboard();
}
