/* =============================================================================
 * Studio 27 Klantenportaal - Auth Gateway V2 (Cloudflare Worker)
 * -----------------------------------------------------------------------------
 * Behoudt de bestaande auth/CORS/rate-limit-shell van de v1-gateway, maar serveert
 * de ClickUp-native endpoints RECHTSTREEKS uit de ClickUp REST v2-API (zie
 * handlers.mjs) i.p.v. ze door te sturen naar Make. Niet-geporte paden vallen
 * door naar Make (router-shim → MAKE_ENDPOINTS-forward).
 *
 * Per request:
 *   1. CORS / origin-allowlist
 *   2. Verifieert het Firebase ID-token (RS256) tegen Google's publieke sleutels
 *      + controleert issuer / audience / expiry   (projectId = studio27-cloud)
 *   3. Leest het GEVERIFIEERDE bedrijf_id uit de custom claims (NIET uit de body)
 *   4. Rate limiting per gebruiker (alleen als een KV-namespace gebonden is)
 *   5. ROUTER-SHIM: if(handlers[path]) → directe ClickUp-handler;
 *      bedrijfBeheer → sub-switch op body.action; anders → Make-forward.
 *
 * Variabelen (Cloudflare → Worker → Settings → Variables and Secrets):
 *   PROJECT_ID       = "studio27-cloud"                                  (plain)
 *   ALLOWED_ORIGINS  = "https://www.studio27.be,https://studio27.be,..." (plain)
 *   GATEWAY_SECRET   = <openssl rand -hex 32>                            (SECRET!)
 *   CLICKUP_TOKEN    = <ClickUp personal token pk_...>                   (SECRET!)
 * Binding (aanbevolen voor rate limiting + read-cache):
 *   KV               = een KV-namespace
 * ============================================================================= */

import {
  READ_HANDLERS,
  WRITE_HANDLERS,
  BEDRIJFBEHEER_READ_ACTIONS,
  BEDRIJFBEHEER_WRITE_ACTIONS,
  bedrijfBeheerContacts,
  withCache,
  bustCache,
  provisionLookup,
  buildAiContext,
  publicShootAvailability,
  adminCompanies,
  metaAdsRich,
  googleAdsRich,
  googleMonthly,
  metricoolStatsRich,
  webTraffic,
  webSearch,
  adsWorkspace,
  adsWorkspaceSave,
  adsUploadAdd,
  adsSnapshotGet,
  adsSnapshotWrite,
} from './handlers.mjs';
import { handlePush, handlePushNotify } from './push.mjs';
import { handleClickupHook } from './clickup-push.mjs';
import * as vr from './videoreview.mjs';

// Video-review (frame-accurate klantfeedback op Bestanden-veld-video's): registratie
// hier i.p.v. in handlers.mjs zodat de module zelfstandig blijft (zie videoreview.mjs).
READ_HANDLERS.videoReviewContext = vr.videoReviewContext;
WRITE_HANDLERS.videoReviewUpload = vr.videoReviewUpload;
WRITE_HANDLERS.videoReviewSubmit = vr.videoReviewSubmit;

// Staff-only (is_staff) rijke-rapportage-handlers: gescoped op het acting-as-bedrijf, (bedrijfId, body, env).
// webTraffic/webSearch = Webprestaties (GA4 + GSC); v1 team-only, later evt. naar READ_HANDLERS voor klanten.
// adsWorkspace*/adsUploadAdd = per-bedrijf KV-werkblad voor de ads-meeting (notities + recs + uploads), staff-only.
// adsSnapshotGet = bewaarde maandtotalen (#22) uit KV; staff-only, acting-as scope. De maandelijkse
// CRON (zie scheduled() onderaan) schrijft die snapshots weg via adsSnapshotWrite() per bedrijf.
const STAFF_DATA_HANDLERS = { metaAdsRich, googleAdsRich, googleMonthly, metricoolStatsRich, webTraffic, webSearch, adsWorkspace, adsWorkspaceSave, adsUploadAdd, adsSnapshotGet };

// Pad → Make-webhook. Deze URLs zijn niet geheim (staan al in dashboard.js).
// Geporte paden gebruiken deze NIET meer (router-shim vangt ze af); de rest valt door.
const MAKE_ENDPOINTS = {
  dashboard:             'https://hook.eu1.make.com/q1hklcvhum7m14ie57p6t6ci7l6un48e',
  projectDetail:         'https://hook.eu1.make.com/1mmhcsa0sie22po3kbwcx423dakidc44',
  projectDetailV2:       'https://hook.eu1.make.com/tp6jpd91vyecsz693pj2hmdd1bs8pd5e',
  calendar:              'https://hook.eu1.make.com/5e1chj9seh9jlw7nejhytwjg66i7vzyd',
  uploadProject:         'https://hook.eu1.make.com/rk5ui1ueb4j42hiqye8dfzfmka0gf318',
  uploadAlg:             'https://hook.eu1.make.com/hyf7ejtbskq743d56nveucv9xto5yo8c',
  bedrijfContent:        'https://hook.eu1.make.com/o1gvlndn934h2u77vug6k59xgt2qgz6g',
  bedrijfVoorkeuren:     'https://hook.eu1.make.com/fhenjvxv47ldoea5k8h646ovn5gzvgnv',
  bedrijfUpload:         'https://hook.eu1.make.com/vdi231a5w9c8wronm71panyc2okq716y',
  bedrijfContact:        'https://hook.eu1.make.com/459dayjdq34xgkt9bcbv8g1nxd9r9ubs',
  meetingsList:          'https://hook.eu1.make.com/5vkfigdkwwowpmhbmicsyddkjt5k18f5',
  // meetingAvailability: GEPORT naar de gateway (READ_HANDLERS.meetingAvailability -
  // Google free/busy via SA + domain-wide delegation, port van Make-scenario 5945987).
  // De router-shim vangt dit pad af vóór de forward; deze hook is enkel nog vangnet.
  meetingAvailability:   'https://hook.eu1.make.com/s4tuw763p9x4dc7o8n1h9sm48vhs77rb',
  chatPost:              'https://hook.eu1.make.com/vi12objw9nkrjg1i8ve13jwj354pvg9n',
  chatList:              'https://hook.eu1.make.com/a43sc5vjuic6lpjdehq8pvhn8sjftbn3',
  chatAttachment:        'https://hook.eu1.make.com/fxaqt9waonf63moiloj1bnm28w1kduj6',
  directMessage:         'https://hook.eu1.make.com/s7g32st1esmxxarw0k35ej3j8hthdr2b',
  feedbackV2:            'https://hook.eu1.make.com/vpd7to9pn8ritsih38s4apika49lg31o',
  newProjectIntake:      'https://hook.eu1.make.com/kbomkcljmi9b2oyphmk938wb1qgwll1j',
  aiStatusBot:           'https://hook.eu1.make.com/3uor4cy6vmhe77sh2uvujg9iufoewj3u',
  pandadocPricelist:     'https://hook.eu1.make.com/uw2974b7b2yurygsgcn2i97x4lh9h86e',
  // shootAvailability: LEGACY/DOOD. De hook hangt aan GEEN actief Make-scenario meer
  // (niet in hooks_list van team 507999) en het v2-frontend roept hem NERGENS aan
  // (api.js definieert de key wel, maar geen enkele callsite). Shoots lopen via de
  // geporte 'beschikbaarheid'-handler: een video-taak ZONDER assignee (lijst
  // 901520180316) krijgt POOL-modus (de 4 content creators, doorsnede Agenda∩ClickUp,
  // met vrij_count); een video-taak MÉT assignee valt in SPECIFIEK-modus. We laten de
  // entry staan als inert vangnet; geen port nodig. Zie report/openIssues.
  shootAvailability:     'https://hook.eu1.make.com/c1aekp5r567tqvgvp4e2a4juu3npanap',
  huisstijlList:         'https://hook.eu1.make.com/v3z3t67otw7d96s37qciedt3uykimiru',
  huisstijlUpload:       'https://hook.eu1.make.com/3eqyxbkejfhyz8w2kl62lp1lsxwfr2d0',
  huisstijlDelete:       'https://hook.eu1.make.com/irpo6iemme6qpfe75rr83brkj7ybftsd',
  driveEnsure:           'https://hook.eu1.make.com/cy5n1y0377ovy2yso5f4dev1n792u71k',
  facturatieSave:        'https://hook.eu1.make.com/41635fjyidjts4hlixkgxcsmo6apoe02',
  projectFacturatieSave: 'https://hook.eu1.make.com/cmqf97ej6aewxokt9g23tbff6gxg7frm',
  performance:           'https://hook.eu1.make.com/chmsfitxr12m8cpjp4x3fb8ru1nqr7gg',
  bedrijfBeheer:         'https://hook.eu1.make.com/bf5xp3rkbh7dik9rp6jvue4w9p2moctn',
  // SEC-6: ads-insights via de gateway i.p.v. de directe ADS_DIRECT-hook. De worker
  // injecteert bedrijf_id uit het geverifieerde token (overschrijft client-waarde), zodat
  // een klant niet langer de ads-cijfers van een ander bedrijf kan opvragen (read-IDOR).
  ads:                   'https://hook.eu1.make.com/wvb3qfpqpm28kq6ksrduqywwrymokdjv',
  // beschikbaarheid: GEPORT naar de gateway (READ_HANDLERS.beschikbaarheid). Doorsnede
  // Google-Agenda ∩ ClickUp-planning. Trigger pool/specifiek = de ClickUp-assignee:
  // video-lijst 901520180316 ZONDER assignee → POOL (4 content creators, vrij_count);
  // anders SPECIFIEK (enkel de assignees, slot vrij als IEDEREEN vrij is). Gebruikt SA
  // (freeBusy via DWD, fail-open). De router-shim vangt dit pad af vóór de forward; deze
  // Make-hook is enkel nog vangnet. NIET gecachet (planning wijzigt vaak).
  beschikbaarheid:       'https://hook.eu1.make.com/jn1ael12s6b4xp6fsdqd49x9p27v8cht',
  // inplannen: GEPORT naar de gateway (WRITE_HANDLERS.inplannen - Google-Calendar-event
  // via SA + domain-wide delegation + ClickUp due_date). Bij een POOL-shoot (video-lijst
  // zonder assignee) wijst de handler AUTOMATISCH een op dat slot vrij poollid toe als
  // ClickUp-assignee + event-attendee (assigned_member in de respons). De router-shim
  // vangt dit pad af vóór de forward; deze hook is enkel nog vangnet.
  inplannen:             'https://hook.eu1.make.com/4r3y6ba68spfgcgng7v0lvso11il6p6u',
};

// Strengere limiet voor schrijf-/upload-acties; ruimer voor leesacties.
const SENSITIVE = new Set([
  'uploadProject', 'uploadAlg', 'bedrijfUpload', 'huisstijlUpload', 'huisstijlDelete',
  'chatAttachment', 'chatPost', 'commsChatPost', 'commsChatAttachment', 'directMessage', 'feedbackV2', 'newProjectIntake',
  'facturatieSave', 'projectFacturatieSave', 'bedrijfVoorkeuren', 'bedrijfContact',
  'bedrijfBeheer', 'inplannen', 'offerteGenereren', 'metricoolApprove', 'metricoolUpdate',
  'metricoolMediaUpload', 'metricoolCreate', 'shootSubmit', 'meetingBook', 'ticketCreate', 'ticketAttach',
]);
const LIMIT_SENSITIVE = 15; // per minuut, per gebruiker
const LIMIT_DEFAULT   = 80;

/* ---- Firebase ID-token verificatie (RS256, zero-dep) --------------------- */
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let JWK_CACHE = { keys: null, exp: 0 }; // module-scope cache (per isolate)

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64urlToString = (s) => new TextDecoder().decode(b64urlToBytes(s));

async function getJwks() {
  const now = Date.now();
  if (JWK_CACHE.keys && now < JWK_CACHE.exp) return JWK_CACHE.keys;
  const r = await fetch(JWK_URL);
  if (!r.ok) throw new Error('jwks_fetch_failed');
  const data = await r.json();
  let ttl = 3600;
  const m = (r.headers.get('Cache-Control') || '').match(/max-age=(\d+)/);
  if (m) ttl = Math.max(300, parseInt(m[1], 10));
  JWK_CACHE = { keys: data.keys || [], exp: now + ttl * 1000 };
  return JWK_CACHE.keys;
}

async function verifyFirebaseToken(idToken, projectId) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('malformed');

  const header = JSON.parse(b64urlToString(parts[0]));
  if (header.alg !== 'RS256' || !header.kid) throw new Error('bad_header');

  const jwk = (await getJwks()).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('unknown_kid');

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const signed = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), signed);
  if (!ok) throw new Error('bad_signature');

  const p = JSON.parse(b64urlToString(parts[1]));
  const now = Math.floor(Date.now() / 1000);
  if (p.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('bad_iss');
  if (p.aud !== projectId) throw new Error('bad_aud');
  if (!p.sub) throw new Error('no_sub');
  if (typeof p.exp !== 'number' || p.exp < now) throw new Error('expired');
  if (typeof p.iat !== 'number' || p.iat > now + 300) throw new Error('bad_iat');
  if (p.auth_time && p.auth_time > now + 300) throw new Error('bad_auth_time');
  // SEC-1a (K1): mailbox-eigendom AFDWINGEN. Provisioning matcht op e-mailstring, dus een
  // niet-geverifieerd e-mailadres (bv. via een rechtstreekse e-mail/wachtwoord-signup buiten
  // de portaal-UI) mag NOOIT toegang geven. Niet vertrouwen op Firebase-console-config.
  if (p.email && p.email_verified !== true) throw new Error('email_not_verified');
  // SEC-1b (K2): tweede factor (Google Authenticator/TOTP) SERVER-SIDE afdwingen. Firebase zet
  // firebase.sign_in_second_factor enkel in tokens die NA een geslaagde MFA-challenge zijn
  // uitgegeven. Zo is 2FA niet langer enkel een frontend-scherm dat omzeild kan worden door de
  // worker rechtstreeks aan te roepen met een 1e-factor-token.
  //
  // STAFF-UITZONDERING (Vincent-akkoord, juni 2026): geverifieerde @studio27.be-medewerkers loggen
  // in via Google Workspace-SSO, dat z'n EIGEN 2FA-beleid afdwingt. Voor hen is app-niveau-TOTP niet
  // vereist. De poort is het GEVERIFIEERDE bedrijfsdomein: email_verified===true (al afgedwongen
  // hierboven) + exact achtervoegsel @studio27.be (isStaffEmail, end-anchored tegen spoofing).
  // Deze uitzondering geeft GEEN extra rechten in verifyFirebaseToken zelf; de admin-bevoegdheden
  // (acting-as / adminCompanies) worden pas in de fetch-router op p.is_staff gegate.
  const _staff = p.email_verified === true && isStaffEmail(p.email);
  const _sf = p.firebase && p.firebase.sign_in_second_factor;
  if (!_staff && _sf !== 'totp' && _sf !== 'phone') throw new Error('mfa_required');
  p.is_staff = _staff;
  return p; // bevat sub (uid), email, custom claim bedrijf_id en is_staff
}

// STAFF-POORT: exact e-maildomein @studio27.be. End-anchored ($) zodat spoof-adressen als
// "x@studio27.be.evil.com" of "x@notstudio27.be" NIET matchen. Lowercase + trim. Het mailbox-
// eigendom zelf is geborgd door email_verified===true (Google verifieert de @studio27.be-mailbox).
function isStaffEmail(email) {
  const e = String(email == null ? '' : email).trim().toLowerCase();
  return /@studio27\.be$/.test(e);
}

/* ---- Helpers ------------------------------------------------------------- */
function corsHeaders(origin, allowed) {
  const ok = origin && allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : (allowed[0] || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-No-Cache, X-Act-As-Bedrijf',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } });

// SEC-5: constant-tijd vergelijking (geen timing-orakel bij het vergelijken van secrets).
function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(String(a == null ? '' : a));
  const bb = enc.encode(String(b == null ? '' : b));
  if (ab.length !== bb.length) return false;
  let r = 0;
  for (let i = 0; i < ab.length; i++) r |= ab[i] ^ bb[i];
  return r === 0;
}
// SEC-5: per-IP throttle voor de niet-ingelogde endpoints (/provision, /admin/link) die VÓÓR
// de KV-rate-limit-sectie draaien. Fail-open op de teller (zoals de hoofd-limiet) zodat een
// KV-storing de login niet breekt.
async function ipThrottle(env, request, bucket, limit) {
  if (!env || !env.KV) return true;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rlip:${bucket}:${ip}:${Math.floor(Date.now() / 60000)}`;
  try {
    const cur = parseInt((await env.KV.get(key)) || '0', 10);
    if (cur >= limit) return false;
    await env.KV.put(key, String(cur + 1), { expirationTtl: 120 });
  } catch (e) { /* fail-open op de teller */ }
  return true;
}

/* ---- ADMIN: koppel een account aan een bedrijf (zet custom claim bedrijf_id) ----
   Vereist Worker-secrets ADMIN_SECRET, SA_CLIENT_EMAIL, SA_PRIVATE_KEY (Firebase
   service-account). Tot die gezet zijn → 501.
   Aanroep: POST /admin/link  header "X-Admin-Secret: <ADMIN_SECRET>"
            body {"email":"klant@x.be","bedrijf_id":"86c9yv1wy"}                    */
function b64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function importPkcs8(pem) {
  const b64 = String(pem).replace(/\\n/g, '\n').replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/[^A-Za-z0-9+/=]/g, '');
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return crypto.subtle.importKey('pkcs8', der.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}
let _saToken = { token: null, exp: 0 };
async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (_saToken.token && now < _saToken.exp - 60) return _saToken.token;
  const claims = {
    iss: env.SA_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  };
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc(claims);
  const key = await importPkcs8(env.SA_PRIVATE_KEY);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = unsigned + '.' + b64url(new Uint8Array(sig));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('geen access_token: ' + JSON.stringify(data));
  _saToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return data.access_token;
}
async function handleAdminLink(request, env, cors) {
  if (!env.ADMIN_SECRET || !env.SA_CLIENT_EMAIL || !env.SA_PRIVATE_KEY)
    return json({ ok: false, error: 'admin_not_configured', message: 'Service-account/ADMIN_SECRET nog niet ingesteld.' }, 501, cors);
  // SEC-5: per-IP throttle (brute-force op het secret afremmen) + constant-tijd vergelijking.
  if (!(await ipThrottle(env, request, 'adminlink', 10)))
    return json({ ok: false, error: 'rate_limited' }, 429, cors);
  if (!timingSafeEqual(request.headers.get('X-Admin-Secret') || '', env.ADMIN_SECRET))
    return json({ ok: false, error: 'forbidden' }, 403, cors);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const email = String(body.email || '').trim().toLowerCase();
  const bedrijfId = String(body.bedrijf_id || '').trim();
  if (!email || !bedrijfId) return json({ ok: false, error: 'missing_params', message: 'email en bedrijf_id vereist' }, 400, cors);

  let accessToken;
  try { accessToken = await getGoogleAccessToken(env); }
  catch (e) { return json({ ok: false, error: 'token_mint_failed', detail: e.message }, 500, cors); }

  const lookupRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + env.PROJECT_ID + '/accounts:lookup', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: [email] }),
  });
  if (!lookupRes.ok) return json({ ok: false, error: 'lookup_failed', detail: await lookupRes.text() }, 502, cors);
  const lookup = await lookupRes.json();
  const user = lookup && lookup.users && lookup.users[0];
  if (!user) return json({ ok: false, error: 'user_not_found', message: 'Geen account met dat e-mailadres - laat de klant eerst één keer inloggen.' }, 404, cors);

  const updRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + env.PROJECT_ID + '/accounts:update', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: user.localId, customAttributes: JSON.stringify({ bedrijf_id: bedrijfId }) }),
  });
  if (!updRes.ok) { const t = await updRes.text(); return json({ ok: false, error: 'update_failed', detail: t }, 500, cors); }
  return json({ ok: true, uid: user.localId, email: email, bedrijf_id: bedrijfId }, 200, cors);
}

// Zet de Firebase custom claim bedrijf_id voor een (reeds bestaand) e-mailadres. Herbruikt door provision.
async function setBedrijfClaim(env, email, bedrijfId) {
  const accessToken = await getGoogleAccessToken(env);
  const lk = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + env.PROJECT_ID + '/accounts:lookup', {
    method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: [String(email)] }),
  });
  if (!lk.ok) throw new Error('lookup_failed');
  const data = await lk.json();
  const user = data && data.users && data.users[0];
  if (!user) throw new Error('user_not_found');
  const up = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + env.PROJECT_ID + '/accounts:update', {
    method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: user.localId, customAttributes: JSON.stringify({ bedrijf_id: String(bedrijfId) }) }),
  });
  if (!up.ok) throw new Error('update_failed');
  return user.localId;
}

// PROVISIONING (off-Make): verifieert het Firebase-token (volledige RS256), zoekt de bedrijven uit ClickUp
// (provisionLookup) en zet de claim inline. Antwoord-shape 1:1 met de oude Make-flow (companies = STRING).
async function handleProvision(request, env, cors) {
  // SEC-5: per-IP throttle (provisioning doet zware ClickUp-paginering -> DoS/kosten-rem).
  if (!(await ipThrottle(env, request, 'provision', 20)))
    return json({ ok: false, error: 'rate_limited', bedrijf_id: '', email: '', companies: '' }, 429, cors);
  const ct = request.headers.get('Content-Type') || '';
  let idToken = '', selectedBid = '';
  try {
    if (ct.includes('application/json')) { const b = await request.json(); idToken = b.idToken || ''; selectedBid = b.selected_bedrijf_id || ''; }
    else { const f = new URLSearchParams(await request.text()); idToken = f.get('idToken') || ''; selectedBid = f.get('selected_bedrijf_id') || ''; }
  } catch (e) {}
  const fail = (extra) => json(Object.assign({ ok: false, bedrijf_id: '', email: '', companies: '' }, extra || {}), 200, cors);
  if (!idToken) return fail();
  if (!env.PROJECT_ID || !env.CLICKUP_TOKEN) return fail({ error: 'gateway_misconfigured' });
  let claims;
  try { claims = await verifyFirebaseToken(idToken, env.PROJECT_ID); }
  catch (e) { return fail({ error: 'invalid_token' }); }
  const email = String(claims.email || '').trim().toLowerCase();
  if (!email) return fail({ error: 'no_email' });
  let res;
  try { res = await provisionLookup(env, email, selectedBid); }
  catch (e) { return fail({ email, error: 'lookup_failed' }); }
  // claim zetten mag de bedrijvenlijst niet breken (best-effort). Enkel schrijven als de claim
  // écht wijzigt: de SA-mint + 2 Firebase-REST-calls kosten 400-800ms en zijn anders zinloos.
  // Ook bij VOLLEDIGE revocatie (res.bid leeg, claim nog gezet) schrijven we — de claim wordt dan
  // gewist zodat de eerstvolgende call in het 403/JIT-pad valt i.p.v. blijvend toegang te houden.
  const claimChanged = String(claims.bedrijf_id || '') !== String(res.bid || '');
  if (claimChanged) { try { await setBedrijfClaim(env, email, res.bid || ''); } catch (e) {} }
  return json({ ok: !!res.bid, bedrijf_id: res.bid, email, companies: res.companies, claim_changed: claimChanged }, 200, cors);
}

/* ---- PERFORMANCE-RAPPORT: gescopet ophalen uit de ads-cache (key = bedrijf_id) ---- */
const ADS_SERVE_URL = 'https://hook.eu1.make.com/n4gmm74o1r7icidm4ra1q5pt861e2k46';
async function handlePerfReport(request, env) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Vary': 'Origin' };
  const url = new URL(request.url);
  const idToken = url.searchParams.get('token') || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!idToken) return json({ ok: false, error: 'missing_token' }, 401, cors);
  let claims;
  try { claims = await verifyFirebaseToken(idToken, env.PROJECT_ID); }
  catch (e) { return json({ ok: false, error: 'invalid_token' }, 401, cors); }
  const bedrijfId = claims.bedrijf_id;
  if (!bedrijfId) return json({ ok: false, error: 'no_company_link', message: 'Account nog niet aan een bedrijf gekoppeld.' }, 403, cors);
  let r;
  try { r = await fetch(ADS_SERVE_URL + '?key=' + encodeURIComponent(bedrijfId)); }
  catch (e) { return json({ ok: false, error: 'upstream_unreachable' }, 502, cors); }
  const text = await r.text();
  return new Response(text, { status: r.status, headers: { 'Content-Type': 'application/json', ...cors } });
}

/* ---- ROUTER-SHIM: directe ClickUp-handlers vóór de Make-forward ---------- */
// Geeft een Response terug als het pad geport is; anders null (→ val door naar Make).
async function tryHandle(path, bedrijfId, body, claims, env, ctx, ch, noCache) {
  // TEAM (staff/acting-as): stale-while-revalidate toegestaan -> klant-wissel voelt instant,
  // data kan tot 5 min achterlopen (alleen voor het team; klanten blijven vers laden).
  const swr = !!(claims && claims.is_staff === true);
  // READS (met KV-cache voor dashboard/bedrijfContent)
  if (READ_HANDLERS[path]) {
    const cacheable = (path === 'dashboard' || path === 'bedrijfContent' || path === 'metricoolPostStats' || path === 'archiefList');
    const run = () => READ_HANDLERS[path](bedrijfId, body, env);
    const res = cacheable
      ? await withCache(env, ctx, path, bedrijfId, noCache, run, swr)
      : await run();
    return json(res.body, res.status, ch);
  }

  // bedrijfBeheer: sub-switch op body.action (get_team/get_offertes reads + 4 writes)
  if (path === 'bedrijfBeheer') {
    const action = String((body && body.action) || '');
    if (BEDRIJFBEHEER_READ_ACTIONS[action]) {
      const run = () => BEDRIJFBEHEER_READ_ACTIONS[action](bedrijfId, body, env);
      // alleen get_team cachen (get_offertes is goedkoop + minder hot)
      const res = action === 'get_team'
        ? await withCache(env, ctx, 'get_team', bedrijfId, noCache, run, swr)
        : await run();
      return json(res.body, res.status, ch);
    }
    if (BEDRIJFBEHEER_WRITE_ACTIONS.has(action)) {
      // contact-email = APART body-veld (NIET de geïnjecteerde account-email)
      const contactEmail = (body && typeof body.email === 'string') ? body.email.trim() : '';
      const res = await bedrijfBeheerContacts(bedrijfId, body, env, contactEmail);
      bustCache(env, ctx, bedrijfId); // contact-mutatie raakt get_team-cache
      return json(res.body, res.status, ch);
    }
    return null; // onbekende action → val door naar Make (toekomstige acties)
  }

  // WRITES (puur ClickUp)
  if (WRITE_HANDLERS[path]) {
    // ticket-paden: server-side identiteit injecteren (overschrijft client-input) zodat de handler
    // het ticket aan de juiste contactpersoon kan koppelen; claims is hier al geverifieerd.
    if (path === 'ticketCreate' || path === 'ticketAttach') {
      body.account_email = String((claims && claims.email) || '').trim().toLowerCase();
    }
    // staff-vlag ALTIJD server-side zetten (overschrijft elke client-waarde — niet spoofbaar):
    // handlers gebruiken dit voor permissie-gates (bv. socials-bewerken: team mag altijd).
    body.__staff = claims.is_staff === true;
    const res = await WRITE_HANDLERS[path](bedrijfId, body, env);
    // writes op de bedrijf-taak bust de read-caches van dat bedrijf
    // (offerteGenereren voegt een offerte toe -> raakt dashboard/get_offertes-views;
    //  ticketCreate maakt een nieuw support-project -> klant moet het meteen onder Projecten zien)
    if (path === 'bedrijfVoorkeuren' || path === 'facturatieSave' || path === 'bedrijfUpload' || path === 'offerteGenereren' || path === 'ticketCreate') {
      bustCache(env, ctx, bedrijfId);
    }
    return json(res.body, res.status, ch);
  }

  return null; // niet geport → Make-forward
}

/* ---- PUBLIEK: geaggregeerde shoot-capaciteit (geen auth, alleen tellingen) ----
   Open GET-endpoint voor de publieke beschikbaarheidspagina (vrijblijvend door te
   sturen, geen offerte/login nodig). Lekt NIETS gevoeligs: enkel het aantal vrije
   content creators per dag. KV-cache (10 min) begrenst ClickUp-load en misbruik. */
async function handlePublicShoot(request, env, ctx) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Vary': 'Origin' };
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405, cors);
  if (!env.CLICKUP_TOKEN) return json({ ok: false, error: 'gateway_misconfigured' }, 500, cors);
  const CK = 'pubshoot:v1';
  if (env.KV) {
    try { const hit = await env.KV.get(CK); if (hit) return new Response(hit, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', 'X-Cache': 'hit', ...cors } }); } catch (e) {}
  }
  let res;
  try { res = await publicShootAvailability(env, { days: 120 }); }
  catch (e) { return json({ ok: false, error: 'unavailable', total: 4, days: [] }, 200, cors); }
  const payload = JSON.stringify(res);
  if (env.KV) { try { ctx.waitUntil(env.KV.put(CK, payload, { expirationTtl: 600 })); } catch (e) {} }
  return new Response(payload, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', 'X-Cache': 'miss', ...cors } });
}

/* ---- Worker -------------------------------------------------------------- */
// Serveert een klant-geüploade post-visual uit KV (mcmedia:{key}). Publiek leesbaar zodat
// Metricool de URL kan ophalen; sleutel is onraadbaar; content-type vast + nosniff.
async function handleMediaServe(key, env) {
  key = String(key || '').trim();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(key) || !env || !env.KV) return new Response('Not found', { status: 404 });
  let res;
  try { res = await env.KV.getWithMetadata('mcmedia:' + key, 'arrayBuffer'); }
  catch (e) { return new Response('Not found', { status: 404 }); }
  if (!res || !res.value) return new Response('Not found', { status: 404 });
  const ct = (res.metadata && res.metadata.ct) || 'application/octet-stream';
  return new Response(res.value, { status: 200, headers: {
    'Content-Type': ct,
    'Cache-Control': 'public, max-age=604800, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
    'Access-Control-Allow-Origin': '*',
  } });
}

export default {
  async fetch(request, env, ctx) {
    // PUBLIEKE shoot-capaciteitspagina (geen auth): vroege, geisoleerde route met open
    // CORS, vóór de origin-allowlist en de Firebase-gate. Raakt de auth-router niet.
    {
      const _pub = new URL(request.url).pathname.replace(/^\/+|\/+$/g, '');
      if (_pub === 'public/shoot-beschikbaarheid' || _pub === 'shoot-capaciteit') {
        return handlePublicShoot(request, env, ctx);
      }
      // Publieke media-serve (klant-geüploade post-visuals) zodat Metricool ze kan ophalen.
      // GET-only, onraadbare sleutel, vaste content-type + nosniff (geen HTML/JS-uitvoering).
      if (_pub.indexOf('media/') === 0 && request.method === 'GET') {
        return handleMediaServe(_pub.slice(6), env);
      }
      // Video-review: <video src>/<img src> kunnen geen Authorization-header sturen →
      // GET met HMAC-signed, expirerend token (GATEWAY_SECRET), uitgereikt door
      // videoReviewContext/-Upload ná Firebase-auth + bedrijf-scope-check.
      if (_pub === 'videostream' && request.method === 'GET') {
        return vr.handleVideoStream(request, env);
      }
      if (_pub === 'videofile' && request.method === 'GET') {
        return vr.handleVideoFile(request, env);
      }
    }
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const ch = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: ch });

    // perfreport: GET via iframe → token via ?token=
    if (new URL(request.url).pathname.replace(/^\/+|\/+$/g, '') === 'perfreport')
      return handlePerfReport(request, env);

    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, ch);

    if (origin && allowed.length && !allowed.includes(origin))
      return json({ ok: false, error: 'forbidden_origin' }, 403, ch);

    const path = new URL(request.url).pathname.replace(/^\/+|\/+$/g, '');
    if (path === 'admin/link') return handleAdminLink(request, env, ch);
    if (path === 'provision') return handleProvision(request, env, ch);
    // Web-push: secret-gated notify (automation roept dit aan met X-Push-Secret, GEEN Firebase-token).
    if (path === 'push/notify') return handlePushNotify(request, env, ctx, ch);
    // ClickUp-webhook -> push (publiek, HMAC-SHA256 X-Signature geverifieerd, GEEN Firebase-token).
    if (path === 'clickup/hook') return handleClickupHook(request, env, ctx, ch);

    const isAdminApi = (path === 'adminCompanies');   // admin-only ClickUp-read (enkel staff)
    const isStaffData = !!STAFF_DATA_HANDLERS[path];   // admin-only rijke rapportage (enkel staff, acting-as)
    const isPorted = !!(READ_HANDLERS[path] || WRITE_HANDLERS[path] || path === 'bedrijfBeheer');
    // Web-push token-authed routes (subscribe/unsubscribe/test): vereisen het Firebase-token, geen ClickUp/Make.
    const isPushAuthed = (path === 'push/subscribe' || path === 'push/unsubscribe');
    const target = MAKE_ENDPOINTS[path];
    if (!isAdminApi && !isStaffData && !isPorted && !isPushAuthed && !target) return json({ ok: false, error: 'unknown_endpoint' }, 404, ch);

    if (!env.PROJECT_ID) return json({ ok: false, error: 'gateway_misconfigured' }, 500, ch);
    // Geporte ClickUp-paden (en admin-API's) vereisen CLICKUP_TOKEN; Make-forward vereist GATEWAY_SECRET.
    if ((isPorted || isAdminApi || isStaffData) && !env.CLICKUP_TOKEN) return json({ ok: false, error: 'gateway_misconfigured' }, 500, ch);
    if (!isPorted && !isAdminApi && !isStaffData && !isPushAuthed && !env.GATEWAY_SECRET) return json({ ok: false, error: 'gateway_misconfigured' }, 500, ch);

    // 1. Firebase ID-token
    const authz = request.headers.get('Authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7).trim() : '';
    if (!idToken) return json({ ok: false, error: 'missing_token' }, 401, ch);

    let claims;
    try {
      claims = await verifyFirebaseToken(idToken, env.PROJECT_ID);
    } catch (e) {
      return json({ ok: false, error: 'invalid_token', detail: e.message }, 401, ch);
    }

    // ADMIN/STAFF (@studio27.be): mag als ELK bedrijf acteren via een expliciete, gevalideerde
    // header X-Act-As-Bedrijf, en mag de admin-only endpoints zonder bedrijfskoppeling aanroepen.
    // Dit doorbreekt BEWUST de tenant-isolatie (Vincent: "iedereen met @studio27.be moet kunnen").
    // De gate is strikt p.is_staff (geverifieerd domein). Een gewone klant (is_staff=false) kan de
    // header NIET gebruiken en bereikt adminCompanies niet — die houdt z'n eigen claim-scope.
    const isStaff = claims.is_staff === true;
    let bedrijfId = claims.bedrijf_id;
    if (isStaff) {
      const actAs = (request.headers.get('X-Act-As-Bedrijf') || '').trim();
      if (actAs) {
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(actAs)) return json({ ok: false, error: 'bad_act_as' }, 400, ch);
        bedrijfId = actAs;
      }
    }

    // Web-push: token-authed routes (subscribe/unsubscribe/test). Vóór de bedrijfId-gate, want staff
    // (Vincent) heeft zelf geen bedrijfskoppeling. De PILOT-gate (enkel vincent@studio27.be) zit in push.mjs.
    if (isPushAuthed) {
      let pbody = {};
      try { pbody = await request.json(); } catch (e) { pbody = {}; }
      return handlePush(path, claims, pbody || {}, env, ctx, ch);
    }

    // Admin-only: lijst ALLE bedrijven (bedrijvenkiezer/zoek). Vóór de bedrijfId-gate, want admins
    // hebben zelf geen bedrijfskoppeling. Niet-staff → 403 (ook met geldige eigen claim).
    if (isAdminApi) {
      if (!isStaff) return json({ ok: false, error: 'forbidden' }, 403, ch);
      if (env.KV) {
        const rlKey = 'rl:' + claims.sub + ':' + Math.floor(Date.now() / 60000);
        try {
          const cur = parseInt((await env.KV.get(rlKey)) || '0', 10);
          if (cur >= LIMIT_DEFAULT) return json({ ok: false, error: 'rate_limited' }, 429, ch);
          ctx.waitUntil(env.KV.put(rlKey, String(cur + 1), { expirationTtl: 120 }));
        } catch (e) { /* fail-open op de teller */ }
      }
      let abody = {};
      try { abody = await request.json(); } catch (e) { abody = {}; }
      try {
        // staff-picker: volledige Bedrijven-paginering is zwaar -> 300s KV-cache (bedrijvenlijst
        // wijzigt zelden; -500 a -1500ms per staff-login). Cache is staff-only data.
        if (env.KV) {
          try { const hit = await env.KV.get('cache:adminCompanies'); if (hit) return json(JSON.parse(hit), 200, ch); } catch (e) {}
        }
        const r = await adminCompanies(env, abody || {});
        if (r.status === 200 && env.KV) {
          try { ctx.waitUntil(env.KV.put('cache:adminCompanies', JSON.stringify(r.body), { expirationTtl: 300 })); } catch (e) {}
        }
        return json(r.body, r.status, ch);
      } catch (e) {
        return json({ ok: false, error: 'handler_error' }, 502, ch);
      }
    }

    // Admin-only rijke ads-rapportage: enkel staff, gescoped op het acting-as-bedrijf. De heavy
    // Graph-call blijft zo strikt intern (klanten krijgen de simpele metaAds-weergave).
    if (isStaffData) {
      if (!isStaff) return json({ ok: false, error: 'forbidden' }, 403, ch);
      if (!bedrijfId) return json({ ok: false, error: 'no_company_link', message: 'Kies eerst een klant.' }, 403, ch);
      if (env.KV) {
        const rlKey = 'rl:' + claims.sub + ':' + Math.floor(Date.now() / 60000);
        try {
          const cur = parseInt((await env.KV.get(rlKey)) || '0', 10);
          if (cur >= LIMIT_SENSITIVE) return json({ ok: false, error: 'rate_limited' }, 429, ch);
          ctx.waitUntil(env.KV.put(rlKey, String(cur + 1), { expirationTtl: 120 }));
        } catch (e) { /* fail-open op de teller */ }
      }
      let rbody = {};
      try { rbody = await request.json(); } catch (e) { rbody = {}; }
      try {
        const r = await STAFF_DATA_HANDLERS[path](bedrijfId, rbody || {}, env);
        return json(r.body, r.status, ch);
      } catch (e) {
        return json({ ok: false, error: 'handler_error' }, 502, ch);
      }
    }

    if (!bedrijfId)
      return json({ ok: false, error: 'no_company_link',
        message: 'Je account is nog niet aan een bedrijf gekoppeld. Mail ilke@studio27.be.' }, 403, ch);

    // 2. Rate limiting (alleen als KV gebonden is)
    if (env.KV) {
      const rlKey = 'rl:' + claims.sub + ':' + Math.floor(Date.now() / 60000);
      const limit = SENSITIVE.has(path) ? LIMIT_SENSITIVE : LIMIT_DEFAULT;
      try {
        const cur = parseInt((await env.KV.get(rlKey)) || '0', 10);
        if (cur >= limit) return json({ ok: false, error: 'rate_limited' }, 429, ch);
        ctx.waitUntil(env.KV.put(rlKey, String(cur + 1), { expirationTtl: 120 }));
      } catch (e) {
        /* KV-storing mag auth niet breken → fail open op enkel de teller */
      }
    }

    // 3. Body
    let body = {};
    try { body = await request.json(); } catch (e) { body = {}; }
    if (!body || typeof body !== 'object') body = {};

    // 4a. GEPORTE paden → directe ClickUp-handler (bedrijf_id ALTIJD uit claim).
    //     We injecteren GEEN account-email in body (de contacts-handler heeft het
    //     ruwe contact-email uit body.email nodig; account-email zou dat clobberen).
    if (isPorted) {
      let noCache = (request.headers.get('X-No-Cache') || '') !== '';
      // Anti-abuse: client-geforceerde cache-bypass max 1x/min per (path, bedrijf). De frontend
      // stuurt deze header nooit; dit dempt enkel een DoS-vector (cache-miss = volle ClickUp-fanout).
      if (noCache) {
        try {
          const nk = `nocache:${path}:${bedrijfId}`;
          if (await env.KV.get(nk)) { noCache = false; }
          else { ctx.waitUntil(env.KV.put(nk, '1', { expirationTtl: 60 })); }
        } catch (e) { /* fail-open bij KV-storing */ }
      }
      try {
        const handled = await tryHandle(path, bedrijfId, body, claims, env, ctx, ch, noCache);
        if (handled) return handled;
      } catch (e) {
        // Reads mogen nooit 5xx geven waar Make 200+lege-data gaf; voor de zekerheid
        // geven we een nette 502 terug i.p.v. een ongevangen exception.
        return json({ ok: false, error: 'handler_error' }, 502, ch);
      }
      // bedrijfBeheer met onbekende action valt hier door naar de Make-forward.
    }

    // 4b. NIET-GEPORTE paden (of bedrijfBeheer/onbekende action) → Make-forward.
    //     Hier WEL bedrijf_id/uid/email/session_token injecteren (1:1 v1-gedrag).
    if (body && typeof body === 'object') {
      body.bedrijf_id = bedrijfId;            // override alles wat de client meestuurde
      body.uid = claims.sub;
      body.email = claims.email || '';
      body.session_token = 'gw-verified-' + claims.sub;
    }

    // Chatbot: server-side de VOLLEDIGE bedrijfscontext (alle taken + inhoud) injecteren, zodat
    // de AI niet afhangt van de dunne frontend-context. Overschrijft wat de client meestuurde.
    if (path === 'aiStatusBot') {
      try { body.projecten_context = await buildAiContext(env, bedrijfId); } catch (e) { /* fail-soft */ }
    }

    let makeRes;
    try {
      makeRes = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gateway-Secret': env.GATEWAY_SECRET },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return json({ ok: false, error: 'upstream_unreachable' }, 502, ch);
    }

    const text = await makeRes.text();
    return new Response(text, {
      status: makeRes.status,
      headers: { 'Content-Type': makeRes.headers.get('Content-Type') || 'application/json', ...ch },
    });
  },

  /* ---- CRON (#22): maandelijkse ads-snapshot ------------------------------
   * Trigger: wrangler.toml [triggers] crons = ["0 3 1 * *"] (03:00 op de 1e).
   * Enumereert ALLE bedrijven exact zoals adminCompanies (ClickUp Bedrijven-lijst)
   * en schrijft per bedrijf de maandtotalen weg via adsSnapshotWrite(). Die helper
   * leest zelf de account-ids uit de bedrijf-taak en slaat een platform stilletjes
   * over als het niet gekoppeld is (Meta of Google) — dus enkel gekoppelde bedrijven
   * leveren een snapshot op. Verwerkt in batches van 5 (concurrency-cap) en wrapt
   * alles in try/catch zodat één fout de hele run niet breekt. */
  async scheduled(event, env, ctx) {
    const run = async () => {
      if (!env || !env.KV || !env.CLICKUP_TOKEN) return;
      let companies = [];
      try {
        const r = await adminCompanies(env);
        companies = (r && r.body && Array.isArray(r.body.companies)) ? r.body.companies : [];
      } catch (e) { companies = []; }

      const BATCH = 5;   // concurrency-cap
      for (let i = 0; i < companies.length; i += BATCH) {
        const slice = companies.slice(i, i + BATCH);
        await Promise.all(slice.map(async (c) => {
          try { await adsSnapshotWrite(c && c.id, env); }
          catch (e) { /* één bedrijf mag de run niet breken */ }
        }));
      }
    };
    // Houd de worker in leven tot alle snapshots weggeschreven zijn.
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(run());
    else await run();
  },
};
