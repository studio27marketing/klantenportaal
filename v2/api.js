/* =============================================================================
   Studio 27 Klantenportaal v4, API / AUTH-laag
   -----------------------------------------------------------------------------
   1:1 geport uit dashboard.js (ONGEWIJZIGDE backend: gateway).
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

/* ---- Endpoints (ALLES via de Cloudflare-gateway; golf 1 (11-07) verwijderde de
   laatste directe Make-hook-URL's en het ?auth=v1-legacy-pad volledig) ---- */
const ENDPOINTS = {
  dashboard:         GATEWAY_BASE + '/dashboard',
  bedrijfContent:    GATEWAY_BASE + '/bedrijfContent',
  meetingsList:      GATEWAY_BASE + '/meetingsList',
  projectDetailV2:   GATEWAY_BASE + '/projectDetailV2',
  chatPost:          GATEWAY_BASE + '/chatPost',
  chatList:          GATEWAY_BASE + '/chatList',
  feedbackV2:        GATEWAY_BASE + '/feedbackV2',
  directMessage:     GATEWAY_BASE + '/directMessage',
  chatAttachment:    GATEWAY_BASE + '/chatAttachment',
  meetingAvailability: GATEWAY_BASE + '/meetingAvailability',
  // Huisstijl-bibliotheek (Google Drive, directe API via de gateway)
  huisstijlList:     GATEWAY_BASE + '/huisstijlList',
  huisstijlUpload:   GATEWAY_BASE + '/huisstijlUpload',
  driveEnsure:       GATEWAY_BASE + '/driveEnsure',
  // Facturatie
  facturatieSave:    GATEWAY_BASE + '/facturatieSave',
  // Bedrijf-beheer (get_team | get_offertes | update_bedrijf | save_contact | update_contact)
  bedrijfBeheer:     GATEWAY_BASE + '/bedrijfBeheer',
  // Agenda (beschikbaarheid + inplannen), scope-guard server-side actief
  beschikbaarheid:   GATEWAY_BASE + '/beschikbaarheid',
  inplannen:         GATEWAY_BASE + '/inplannen',
  // Offerte-samensteller: klant stelt zelf een offerte samen (catalogus -> PandaDoc via de gateway).
  // BE-contract: { items:[{sku,naam,prijs,aantal}], opmerking } -> { ok, offerte_task_id, offerte_task_url, pandadoc_id, message }.
  offerteGenereren:  GATEWAY_BASE + '/offerteGenereren',
  // Klantvriendelijke offerte-AANVRAAG (clientview): vrije tekst + diensten i.p.v. budgetten.
  // BE-contract: { korte, bericht, diensten:[key,...] } -> { ok, offerte_task_id, pandadoc_id, message }.
  offerteAanvraag:   GATEWAY_BASE + '/offerteAanvraag',
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
  // ADMIN-only (staff): uitgebreide social-rapportage (team-weergave) in één call, account-KPI's +
  // per-netwerk breakdown met dag-series + vergelijking + post-insights. Acting-as scope.
  metricoolStatsRich:GATEWAY_BASE + '/metricoolStatsRich',
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
  // ADMIN-only (staff): Evolutie-tab Google Ads — 24 maanden spend + leads per conversietype per
  // maand. { campaign_id? } -> { ok, linked, currency, months:[{ym,spend,conversions,cpl,
  // types:[{name,count,cpl}]}], campaigns:[{id,name}] }. Acting-as scope.
  googleAdsEvolutie: GATEWAY_BASE + '/googleAdsEvolutie',
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
  shootPlaces:       GATEWAY_BASE + '/shootPlaces',   // adres-suggesties in huisstijl (key server-side)
  fotoList:          GATEWAY_BASE + '/fotoList',      // fotogalerij: bestanden van de gedeelde Drive-map
  fotoApprove:       GATEWAY_BASE + '/fotoApprove',   // fotoreeks goedkeuren
  contactVraag:      GATEWAY_BASE + '/contactVraag',  // algemene vraag -> mail/taak naar Ilke
  portalVersionPush: GATEWAY_BASE + '/portalVersionPush', // team: versie hard doorduwen naar alle clients
  bugReport:         GATEWAY_BASE + '/bugReport',         // team: portaal-bug/feedback -> bugs-lijst
  teamLeden:         GATEWAY_BASE + '/teamLeden',         // team: teamleden voor de melder-dropdown
  facturatieNotitie: GATEWAY_BASE + '/facturatieNotitie', // team: interne notitie voor Celien (bedrijf-taak)
  // Meeting-tunnel: taskloze Google-Calendar-boeking + invite (Algemene meeting/Projectmeeting/Nieuw project).
  // { host_email, host_naam, start, eind, start_ms, online, titel, beschrijving, locatie, client_email, client_naam, project_task_id?, project_naam?, intake?, when_label? }
  //   -> { ok, event_id, meet_link, html_link }. Muteert GEEN project-due_date; host moet @studio27.be zijn.
  meetingBook:       GATEWAY_BASE + '/meetingBook',
  // Klant markeert de projectchat als gelezen → read-receipt voor het team. { task_id } -> { ok, read_at }.
  chatMarkRead:        GATEWAY_BASE + '/chatMarkRead',
  // AI-assistent: klantvraag loggen (fire-and-forget) + (staff) de gelogde vragen ophalen voor monitoring.
  botLog:              GATEWAY_BASE + '/botLog',
  botLogList:          GATEWAY_BASE + '/botLogList',
  // Altijd-open klantchat op de vaste communicatietaak (server-side taak-resolutie; client stuurt GEEN task_id).
  commsChatList:       GATEWAY_BASE + '/commsChatList',
  commsChatPost:       GATEWAY_BASE + '/commsChatPost',
  commsChatAttachment: GATEWAY_BASE + '/commsChatAttachment',
  // Webprestaties (GA4 + Search Console, direct via de Google-API's, geen Make). Team-only (staff, acting-as).
  // webTraffic: { period | from,to,compare } -> { ok, linked, totals, channels, split, trend, landingPages }.
  webTraffic:        GATEWAY_BASE + '/webTraffic',
  // webSearch: { period | from,to } -> { ok, linked, site, totals, queries, pages, trend }.
  webSearch:         GATEWAY_BASE + '/webSearch',
  // Website-supportticket: { onderwerp, omschrijving? } -> { ok, ticket_id }. Taak in de Tickets-lijst
  // (assignee Klaas, TYPE JOB Support, contact-koppeling server-side); push bij on hold/doorgestuurd.
  ticketCreate:      GATEWAY_BASE + '/ticketCreate',
  // Extra bijlage op een supportticket: { ticket_id, filename, file_data } -> { ok, attached }. 1 bestand per call.
  ticketAttach:      GATEWAY_BASE + '/ticketAttach',
  // Nieuwe social post aanmaken als concept: { text, providers[], media[], date } -> { ok, post_id, draft }.
  // Vereist het 'Socials-bewerkbaar'-recht op de bedrijf-taak (worker gate't server-side).
  metricoolCreate:   GATEWAY_BASE + '/metricoolCreate'
};

/* AUTH v2 (Firebase + Cloudflare-gateway) is het ENIGE auth-pad. Het ?auth=v1-legacy-
   vangnet (code-login + directe Make-hooks) is in golf 1 (11-07) volledig verwijderd. */
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
async function api(url, payload, opts){
  return apiV2(url, payload, opts);
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
async function apiV2(url, payload, opts){
  try {
    const key = ENDPOINT_KEYS[url];
    if(!key) return { ok:false, status:0, error:'onbekend endpoint: ' + url };
    const token = window.S27Auth ? await window.S27Auth.token() : null;
    if(!token){ if(state && state.session) handleSessionExpired('Niet ingelogd.'); return { ok:false, status:401 }; }
    const h0 = _v2Headers(token);
    if (opts && opts.noCache) h0['X-No-Cache'] = '1';   // éénmalige verse read na een write
    const r = await fetch(GATEWAY_BASE + '/' + key, {
      method:'POST',
      headers: h0,
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
// contact-lookup). Val enkel bij een technische fout terug op de oude Make-hook, zodat de login
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
  // + exacte contact-lookup over beide relatie-kanten). Geen Make-fallback meer.
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
// bedrijf_id-claim uit het HUIDIGE Firebase-token (zonder refresh): klopt die al, dan kan de
// provision-roundtrip (1,5-2,5s) uit het kritieke boot-pad en op de achtergrond draaien.
async function tokenClaimBedrijf(){
  try {
    var t = window.S27Auth ? await window.S27Auth.token() : null;
    if(!t) return '';
    var p = JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return String(p.bedrijf_id || '');
  } catch(e){ return ''; }
}
async function tryProvision(token){
  const d = await provisionFetch(token, lastSelectedBedrijf());
  return !!(d && d.ok && d.bedrijf_id);
}
// Bij login: koppel + haal de bedrijvenlijst (switcher) + forceer een verse claim.
// selectedBidOverride: het boot-snelpad geeft de token-claim mee zodat een lege/afwijkende
// localStorage de achtergrond-provision nooit naar een ÁNDER default-bedrijf (ids[0]) laat flippen.
// Retourneert de provision-respons zodat de caller een claim-mismatch kan detecteren.
async function loadCompaniesAndLink(selectedBidOverride){
  try {
    const token = window.S27Auth ? await window.S27Auth.token() : null;
    if(!token) return null;
    const d = await provisionFetch(token, selectedBidOverride || lastSelectedBedrijf());
    // geforceerde token-refresh (200-400ms) enkel als de claim écht wijzigde
    // (claim_changed ontbreekt bij een oudere worker -> dan veiligheidshalve wél verversen)
    if(d && d.ok && window.S27Auth) { if(d.claim_changed !== false) await window.S27Auth.token(true); }
    return d;
  } catch(e){ return null; }
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
