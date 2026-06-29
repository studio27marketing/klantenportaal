/* =============================================================================
 * Studio 27 Klantenportaal — Auth Gateway (Cloudflare Worker)
 * -----------------------------------------------------------------------------
 * Zit tussen de widget (browser) en de Make-webhooks. Zie AUTH_UPGRADE_PLAN.md §5.
 *
 * Per request:
 *   1. CORS / origin-allowlist
 *   2. Verifieert het Firebase ID-token (RS256) tegen Google's publieke sleutels
 *      + controleert issuer / audience / expiry   (projectId = studio27-cloud)
 *   3. Leest het GEVERIFIEERDE bedrijf_id uit de custom claims (NIET uit de body)
 *   4. Rate limiting per gebruiker (alleen als een KV-namespace gebonden is)
 *   5. [NIEUW] OPTIONELE D1-dispatch (achter env.D1_ENDPOINTS feature-flag) —
 *      OFF by default: zonder flag is er ZERO gedragsverandering, 100% Make.
 *   6. Forward naar de juiste Make-webhook met header X-Gateway-Secret
 *
 * Zero-dependency: dit bestand kan rechtstreeks in de Cloudflare Workers-editor
 * geplakt worden — geen build, geen npm.
 *
 * Variabelen (Cloudflare → Worker → Settings → Variables and Secrets):
 *   PROJECT_ID       = "studio27-cloud"                                  (plain)
 *   ALLOWED_ORIGINS  = "https://www.studio27.be,https://studio27.be"     (plain)
 *   GATEWAY_SECRET   = <openssl rand -hex 32>                            (SECRET!)
 *   D1_ENDPOINTS     = '["meetingsList","bedrijfContent", ...]'  (plain, OPTIONEEL)
 *                      JSON-array string van ingeschakelde D1-keys. Sub-acties als
 *                      "bedrijfBeheer:get_team". Leeg/ongezet => geen enkel endpoint
 *                      gebruikt D1 (100% Make, geen gedragsverandering).
 *   MEETINGS_BOOKING_URL = "https://..."  (plain, OPTIONEEL — booking-deeplink)
 * Binding (optioneel, aanbevolen voor rate limiting):
 *   KV               = een KV-namespace
 * Binding (NIEUW, vereist zodra een D1-endpoint in D1_ENDPOINTS staat):
 *   CRMDB            = D1Database  →  s27-crm-db (0c50db87-9a69-4cdc-9f43-4c1dc92dd801)
 * ============================================================================= */

// Pad → Make-webhook. Deze URLs zijn niet geheim (staan al in dashboard.js).
// "login" staat hier bewust NIET in: inloggen gebeurt voortaan bij Firebase.
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
  meetingAvailability:   'https://hook.eu1.make.com/s4tuw763p9x4dc7o8n1h9sm48vhs77rb',
  chatPost:              'https://hook.eu1.make.com/vi12objw9nkrjg1i8ve13jwj354pvg9n',
  chatList:              'https://hook.eu1.make.com/a43sc5vjuic6lpjdehq8pvhn8sjftbn3',
  chatAttachment:        'https://hook.eu1.make.com/fxaqt9waonf63moiloj1bnm28w1kduj6',
  directMessage:         'https://hook.eu1.make.com/s7g32st1esmxxarw0k35ej3j8hthdr2b',
  feedbackV2:            'https://hook.eu1.make.com/vpd7to9pn8ritsih38s4apika49lg31o',
  newProjectIntake:      'https://hook.eu1.make.com/kbomkcljmi9b2oyphmk938wb1qgwll1j',
  aiStatusBot:           'https://hook.eu1.make.com/3uor4cy6vmhe77sh2uvujg9iufoewj3u',
  pandadocPricelist:     'https://hook.eu1.make.com/uw2974b7b2yurygsgcn2i97x4lh9h86e',
  shootAvailability:     'https://hook.eu1.make.com/c1aekp5r567tqvgvp4e2a4juu3npanap',
  huisstijlList:         'https://hook.eu1.make.com/v3z3t67otw7d96s37qciedt3uykimiru',
  huisstijlUpload:       'https://hook.eu1.make.com/3eqyxbkejfhyz8w2kl62lp1lsxwfr2d0',
  huisstijlDelete:       'https://hook.eu1.make.com/irpo6iemme6qpfe75rr83brkj7ybftsd',
  driveEnsure:           'https://hook.eu1.make.com/cy5n1y0377ovy2yso5f4dev1n792u71k',
  facturatieSave:        'https://hook.eu1.make.com/41635fjyidjts4hlixkgxcsmo6apoe02',
  projectFacturatieSave: 'https://hook.eu1.make.com/cmqf97ej6aewxokt9g23tbff6gxg7frm',
  performance:           'https://hook.eu1.make.com/chmsfitxr12m8cpjp4x3fb8ru1nqr7gg',
  bedrijfBeheer:         'https://hook.eu1.make.com/bf5xp3rkbh7dik9rp6jvue4w9p2moctn',
  beschikbaarheid:       'https://hook.eu1.make.com/jn1ael12s6b4xp6fsdqd49x9p27v8cht',
  inplannen:             'https://hook.eu1.make.com/4r3y6ba68spfgcgng7v0lvso11il6p6u',
};

// Strengere limiet voor schrijf-/upload-acties; ruimer voor leesacties.
const SENSITIVE = new Set([
  'uploadProject', 'uploadAlg', 'bedrijfUpload', 'huisstijlUpload', 'huisstijlDelete',
  'chatAttachment', 'chatPost', 'directMessage', 'feedbackV2', 'newProjectIntake',
  'facturatieSave', 'projectFacturatieSave', 'bedrijfVoorkeuren', 'bedrijfContact',
  'bedrijfBeheer', 'inplannen',
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
  return p; // bevat sub (uid), email en custom claim bedrijf_id
}

/* ---- Helpers ------------------------------------------------------------- */
function corsHeaders(origin, allowed) {
  const ok = origin && allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : (allowed[0] || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } });

/* ---- ADMIN: koppel een account aan een bedrijf (zet custom claim bedrijf_id) ----
   Vereist Worker-secrets ADMIN_SECRET, SA_CLIENT_EMAIL, SA_PRIVATE_KEY (Firebase
   service-account). Tot die gezet zijn → 501. Tot dan blijft het Cloud Shell-
   commando de werkende manier om te koppelen.
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
  if ((request.headers.get('X-Admin-Secret') || '') !== env.ADMIN_SECRET)
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
  if (!user) return json({ ok: false, error: 'user_not_found', message: 'Geen account met dat e-mailadres — laat de klant eerst één keer inloggen.' }, 404, cors);

  const updRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + env.PROJECT_ID + '/accounts:update', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: user.localId, customAttributes: JSON.stringify({ bedrijf_id: bedrijfId }) }),
  });
  if (!updRes.ok) { const t = await updRes.text(); return json({ ok: false, error: 'update_failed', detail: t }, 500, cors); }
  return json({ ok: true, uid: user.localId, email: email, bedrijf_id: bedrijfId }, 200, cors);
}

/* ---- PERFORMANCE-RAPPORT: gescopet ophalen uit de ads-cache (key = bedrijf_id) ----
   De ads-company-master cachet het rapport onder key = bedrijf_id (datastore ADS_RAPPORTEN,
   serve-hook). Hier halen we het op met de bedrijf_id uit het GEVERIFIEERDE token, zodat een
   klant nooit een andere key kan opvragen. Token via ?token= (iframe-GET) of Bearer-header. */
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

/* =============================================================================
 * ===========================  D1 SECTION (NIEUW)  ============================
 * =============================================================================
 *  ⚠️ OFF BY DEFAULT. Niets hieronder draait tenzij env.D1_ENDPOINTS een
 *     JSON-array van keys bevat (bv. '["meetingsList","bedrijfBeheer:get_team"]').
 *     Bij lege/ongezette D1_ENDPOINTS gedraagt de gateway zich 100% identiek aan
 *     vroeger: elke request gaat door naar Make (zie hoofd-fetch hieronder).
 *
 *  Architectuur (AUDIT_HUB_MIGRATION.md §9, Optie A):
 *   - Binding env.CRMDB (D1Database) → s27-crm-db.
 *   - Per endpoint een async handler h_<key>(c) met
 *       c = { env, db (=env.CRMDB), bedrijfId, body, claims, maps, util }.
 *     Een handler geeft het response-BODY object terug (dezelfde JSON die de
 *     Make-webhook vandaag teruggeeft) — of null/undefined om DOOR TE VALLEN
 *     naar Make (fail-closed: bv. bedrijf niet in D1).
 *   - Elke query scope't STRIKT op de geverifieerde claim-id (c.bedrijfId).
 *     Body bedrijf_id/task_id/room_id worden NOOIT vertrouwd.
 *
 *  Identiteit: Firebase-claim bedrijf_id == companies.id == companies.clickup_id
 *  (geverifieerd 491/491). Dus WHERE id=? / WHERE company_id=? / WHERE bedrijf_id=?
 *  binden de claim rechtstreeks; geen vertaallaag nodig.
 * ========================================================================== */

/* ---- maps: status- en discipline-vertaling (audit G2/G3) ----------------- */
const maps = {
  // D1 hyphen-status -> portal underscore-status (audit G2).
  statusD1ToPortal(s) {
    switch (String(s || '')) {
      case 'op-te-starten':         return 'to_do';
      case 'in-progress':           return 'in_progress';
      case 'feedback-klant':        return 'doorgestuurd';
      case 'doorgestuurd':          return 'doorgestuurd';
      case 'on-hold':               return 'on_hold';
      case 'done':                  return 'done';
      case 'klaar-voor-facturatie': return 'done';
      case 'gefactureerd':          return 'done';
      default:                      return 'to_do'; // unknown -> to_do
    }
  },
  // tasks.branch -> portal discipline-key (audit G3).
  branchToDisc(b) {
    switch (String(b || '')) {
      case 'strat':  return 'strategie';
      case 'video':  return 'video_fotografie';
      case 'web':    return 'webdesign';
      case 'social': return 'social';
      case 'ads':    return 'ads';
      case 'brand':  return 'branding';
      case 'opl':    return 'opleiding';
      case 'auto':   return 'automation';
      case 'seo':    return 'seo';
      default:       return '';
    }
  },
};

/* ---- util: datum-coercie (audit G11) ------------------------------------- */
const util = {
  // Coerce een datum naar een epoch-MILLISECONDS STRING (frontend parseInt()'t deze
  // voor meetings.datum, projectDetail taken[].datum, chat datum). null/0 -> ''.
  msStr(v) {
    if (v === null || v === undefined || v === '') return '';
    // Reeds numeriek (D1 epoch-ms integer) of een numerieke string.
    if (typeof v === 'number') {
      if (!isFinite(v) || v === 0) return '';
      return String(Math.trunc(v));
    }
    const s = String(v).trim();
    if (!s) return '';
    // Pure cijferreeks -> al epoch-ms.
    if (/^\d+$/.test(s)) {
      if (s === '0') return '';
      return s;
    }
    // Anders: probeer als datum te parsen (ISO/tekst) -> epoch-ms.
    const t = Date.parse(s);
    if (isNaN(t) || t === 0) return '';
    return String(t);
  },
  // ISO-string waar de frontend new Date() rechtstreeks aanroept. null/0 -> ''.
  iso(v) {
    if (v === null || v === undefined || v === '') return '';
    let t;
    if (typeof v === 'number') {
      if (!isFinite(v) || v === 0) return '';
      t = v;
    } else {
      const s = String(v).trim();
      if (!s) return '';
      if (/^\d+$/.test(s)) {
        if (s === '0') return '';
        t = parseInt(s, 10);
      } else {
        t = Date.parse(s);
      }
    }
    if (isNaN(t) || t === 0) return '';
    try { return new Date(t).toISOString(); } catch (e) { return ''; }
  },
};

/* ---- team_members id-set loader (per-isolate cache) ----------------------
   Voor is_klant-afleiding: from_member NOT IN team_members ⇒ klant. Gecachet per
   isolate (13 staff-rows, verandert zelden). Niet load-bearing voor de huidige
   handlers (chatList leidt is_klant af via een LEFT JOIN), maar beschikbaar
   gesteld zoals de DESIGN vraagt voor toekomstige handlers.                   */
let _teamIdsCache = { ids: null, exp: 0 };
async function getTeamMemberIds(db) {
  const now = Date.now();
  if (_teamIdsCache.ids && now < _teamIdsCache.exp) return _teamIdsCache.ids;
  const set = new Set();
  try {
    const res = await db.prepare('SELECT id FROM team_members').all();
    for (const r of (res && res.results) || []) set.add(String(r.id));
  } catch (e) { /* op fout: lege set; chatList valt terug op de JOIN */ }
  _teamIdsCache = { ids: set, exp: now + 5 * 60 * 1000 }; // 5 min
  return set;
}

/* ---- d1Scoped: helper die afdwingt dat de claim-id mee-gebind wordt --------
   Elke portal-query MOET op de geverifieerde claim-id scopen. Deze helper bindt
   de claim als eerste parameter (?1) zodat de aanroeper niet kan vergeten te
   scopen. De individuele handlers binden de claim sowieso expliciet; dit is de
   gedeelde vangrail uit DESIGN/R3.                                            */
async function d1Scoped(db, sql, bedrijfId, extra) {
  const binds = [bedrijfId].concat(extra || []);
  return db.prepare(sql).bind(...binds).all();
}

/* ---- D1 dispatch ---------------------------------------------------------- */
// Map van dispatchKey -> handler. Sub-acties gebruiken "endpoint:action".
const D1_HANDLERS = {
  'bedrijfContent':            h_bedrijfContent,
  'bedrijfBeheer:get_team':    h_bedrijfBeheer_get_team,
  'bedrijfBeheer:get_offertes':h_bedrijfBeheer_get_offertes,
  'meetingsList':              h_meetingsList,
  'dashboard':                 h_dashboard,
  'chatList':                  h_chatList,
  'chatPost':                  h_chatPost,
  // Writes (P4) — schrijven naar D1 + stempelen portal_overrides (audit R1).
  'facturatieSave':              h_facturatieSave,
  'bedrijfBeheer:update_bedrijf':  h_bedrijfBeheer_update_bedrijf,
  'bedrijfBeheer:update_contact':  h_bedrijfBeheer_update_contact,
};

async function d1Dispatch(dispatchKey, c) {
  const handler = D1_HANDLERS[dispatchKey];
  if (!handler) return null; // geen handler -> val door naar Make
  // Een onverwachte fout in een handler mag de live-portal NOOIT breken:
  // log en val door naar Make (zelfde gedrag als vroeger).
  return await handler(c);
}

/* =============================================================================
 * ===========================  D1 HANDLERS (NIEUW)  ==========================
 *  Allemaal achter de D1_ENDPOINTS-flag. Read-only tenzij anders vermeld.
 *  chatPost is een WRITE-handler en blijft achter de flag UIT tot P2.
 * ========================================================================== */

// ===== bedrijfContent (read-only) ==========================================
async function h_bedrijfContent(c) {
  const { db, bedrijfId } = c;

  // --- Company profile (scope strikt op de geverifieerde claim-id) ---
  const co = await db.prepare(
    "SELECT id, naam, kbo, mw, website, fact_email, fact_opm, hoofd_contact, portal_overrides " +
    "FROM companies WHERE id = ?"
  ).bind(bedrijfId).first();

  // Fail-closed: geen company voor deze claim -> val door naar Make.
  if (!co) return null;
  // Defensieve her-check (single-record read): row-id moet de claim zijn.
  if (String(co.id) !== String(bedrijfId)) return null;

  // --- algemene_voorkeuren: geen kolom (audit G8). Alleen uit portal_overrides
  //     json als die een STRING draagt; anders '' (frontend tolereert). ---
  let algVoork = '';
  if (co.portal_overrides) {
    try {
      const ov = JSON.parse(co.portal_overrides);
      const cand = (ov && (ov.algemene_voorkeuren ?? ov.brand_prefs ?? ov.voorkeuren));
      if (typeof cand === 'string') algVoork = cand;
    } catch (e) { /* portal_overrides niet text-bearing -> '' */ }
  }

  // --- Contactpersonen (scope op bedrijf_id = claim) ---
  const cps = await db.prepare(
    "SELECT id, voornaam, achternaam, email, gsm, notif " +
    "FROM contacts WHERE bedrijf_id = ? ORDER BY achternaam, voornaam"
  ).bind(bedrijfId).all();
  const rows = (cps && cps.results) || [];

  const contactpersonen = rows.map((r) => ({
    id:         String(r.id || ''),
    voornaam:   r.voornaam || '',
    achternaam: r.achternaam || '',
    email:      r.email || '',
    gsm:        r.gsm || '',
    rol:        '',                 // contacts heeft GEEN rol-kolom (G9) -> '' (renderContactRow valt terug op 'Contactpersoon')
    voorkeur:   r.notif || '',      // notif leeg voor alle 261 (R17) -> '' verbergt de chip; NIET 'Geen' hier
    ondernemingsleider: false,      // geen kolom -> false
  }));

  // --- contact{} : hoofdcontact voor de bedrijfsgegevens/instellingen-view.
  //     companies.hoofd_contact is een NAAM-string (bv. 'Koen Van dun'), GEEN
  //     contact-id, dus match op volledige naam; anders val terug op 1e contact.
  let hc = null;
  const hcName = String(co.hoofd_contact || '').trim().toLowerCase();
  if (hcName) {
    hc = rows.find((r) => ((r.voornaam || '') + ' ' + (r.achternaam || '')).trim().toLowerCase() === hcName) || null;
  }
  if (!hc) hc = rows[0] || null;
  const contact = {
    voornaam:   hc ? (hc.voornaam || '') : '',
    achternaam: hc ? (hc.achternaam || '') : '',
    gsm:        hc ? (hc.gsm || '') : '',
    email:      hc ? (hc.email || '') : (co.fact_email || ''),
  };

  // --- categorieen: files-tabel = 0 rows (G5). Lege structuur; echte huisstijl
  //     laadt via het aparte huisstijlList-endpoint (buiten scope).
  const categorieen = { logos: [], fonts: [], kleuren: [], brand_pdfs: [], fotos: [], overig: [] };

  // --- Bouw de TOP-LEVEL body (gateway wrapt als {ok,status,data}).
  //     GEEN 'error' key bij succes (die triggert de mock-data fallback).
  return {
    bedrijfsnaam:           co.naam || '',
    btw:                    co.kbo || '',                          // companies.kbo -> btw
    aantal_medewerkers:     (co.mw == null ? '' : co.mw),          // mw NULL voor alle 491 -> '' (get_team overschrijft)
    website:                co.website || '',
    facturatie_email:       co.fact_email || '',                  // fact_email -> facturatie_email
    facturatie_opmerkingen: co.fact_opm || '',                    // fact_opm -> facturatie_opmerkingen
    algemene_voorkeuren:    algVoork,                             // platte tekst, geen double-escape (G8/G12)
    contact:                contact,
    contactpersonen:        contactpersonen,
    categorieen:            categorieen,
  };
}

// ===== bedrijfBeheer:get_team (read-only) ==================================
async function h_bedrijfBeheer_get_team(c) {
  const { db, bedrijfId } = c;

  // Company-velden: scope strikt op de geverifieerde claim-id.
  // Renames: kbo->btw, mw->aantal_medewerkers, website->website.
  const co = await db
    .prepare('SELECT kbo, mw, website FROM companies WHERE id = ? LIMIT 1')
    .bind(bedrijfId)
    .first();

  // Fail-closed: onbekende company -> lege, frontend-veilige team-payload.
  if (!co) {
    return { ok: true, aantal_medewerkers: '', btw: '', website: '', contact_count: 0, contactpersonen: [] };
  }

  // Contacts: autoritatieve bron voor contactpersonen[]. Via bedrijf_id
  // (NOOIT join op companies.hoofd_contact — dat is een NAAM-string).
  const rowsRes = await db
    .prepare('SELECT id, voornaam, achternaam, email, gsm, notif FROM contacts WHERE bedrijf_id = ? ORDER BY rowid')
    .bind(bedrijfId)
    .all();
  const contacts = (rowsRes && rowsRes.results) ? rowsRes.results : [];

  const contactpersonen = contacts.map(function (r) {
    return {
      id: String(r.id || ''),
      voornaam: r.voornaam || '',
      achternaam: r.achternaam || '',
      email: r.email || '',
      gsm: r.gsm || '',
      rol: '',               // geen rol-kolom -> '' (renderContactRow valt terug op 'Contactpersoon')
      voorkeur: r.notif || '', // notif leeg (R17) -> '' verbergt de chip; edit-modal default 'Geen' blijft
    };
  });

  // mw NULL voor alle 491 -> '' zodat frontend het overslaat (L2131) en de
  // bedrijfContent-waarde bewaard blijft. Niet-null mw passeert as-is.
  const aantal = (co.mw === null || co.mw === undefined) ? '' : co.mw;

  return {
    ok: true,
    aantal_medewerkers: aantal,
    btw: co.kbo || '',
    website: co.website || '',
    contact_count: contactpersonen.length,
    contactpersonen: contactpersonen,
  };
}

// ===== bedrijfBeheer:get_offertes (read-only) ==============================
async function h_bedrijfBeheer_get_offertes(c) {
  const { db, bedrijfId, util } = c;

  // Resolve de eigen bedrijfsnaam SERVER-SIDE uit de claim-id (nooit uit body).
  // Nodig voor de bedrijf_naam-fallback (offertes zonder bedrijf_id). Scope op claim.
  const company = await db
    .prepare('SELECT id, naam FROM companies WHERE id = ?1 OR clickup_id = ?1 LIMIT 1')
    .bind(bedrijfId)
    .first();

  // Onbekende company -> lege lijst (fail-closed). Frontend toont "Nog geen offertes".
  if (!company) return { ok: true, offertes: [] };

  const claimId = company.id;
  const naam = company.naam || '';

  // Scope: bedrijf_id == claim, OF (bedrijf_id leeg EN bedrijf_naam == onze naam).
  // De bedrijf_id='' guard op de fallback voorkomt cross-company-lek.
  // Drop status='draft' (mirror van offerteVisible() boundary); houd
  // sent/viewed/completed/declined/expired (raw lifecycle, geen vertaling).
  const rowsRes = await db
    .prepare(
      "SELECT id, titel, status, budget, panda_link, verval " +
      "FROM offertes " +
      "WHERE (bedrijf_id = ?1 OR (bedrijf_id = '' AND bedrijf_naam = ?2)) " +
      "AND status <> 'draft' " +
      "ORDER BY (verval IS NULL) ASC, verval DESC, created_at DESC"
    )
    .bind(claimId, naam)
    .all();

  const list = ((rowsRes && rowsRes.results) || []).map(function (o) {
    return {
      id: String(o.id || ''),
      naam: o.titel || '',                          // titel -> naam (PLAIN)
      link: o.panda_link || '',                     // panda_link -> link
      budget: (o.budget == null ? '' : o.budget),   // REAL; frontend coerce't via Number()
      vervaldatum: util.msStr(o.verval),            // verval (epoch-ms int|NULL) -> ms-string|''
      status: o.status || '',                       // RAW PandaDoc lifecycle (PLAIN)
    };
  });

  return { ok: true, offertes: list };
}

// ===== meetingsList (read-only) ============================================
async function h_meetingsList(c) {
  // Scope op de geverifieerde claim-id (companies.id == clickup_id == bedrijf_id).
  // Nooit body bedrijf_id/bedrijfsnaam vertrouwen. Vervangt de fragiele client-titel-match.
  // Filter INTERN-meetings (G10/§3). NULL/empty type rows blijven behouden
  // (type IS NULL OR type != 'INTERN' — '!=' alleen zou NULL droppen onder 3-valued logic).
  const { db, bedrijfId, util } = c;

  const rowsRes = await db
    .prepare(
      "SELECT id AS meeting_id, titel, datum, status " +
      "FROM meetings " +
      "WHERE bedrijf_id = ? AND (type IS NULL OR type != 'INTERN') " +
      "ORDER BY datum ASC"
    )
    .bind(bedrijfId)
    .all();
  const rows = (rowsRes && rowsRes.results) || [];

  const meetings = rows.map((r) => ({
    meeting_id: String(r.meeting_id || ''),
    titel: r.titel == null ? '' : String(r.titel),
    // Frontend parseInt()'t dit -> epoch-MILLISECONDS STRING. NULL/0 -> '' ("nog te bevestigen").
    datum: util.msStr(r.datum),
    // meetings.status is raw ClickUp ('niet klaar'); doorgegeven, nauwelijks gerenderd. Niet status-mapped.
    status: r.status == null ? '' : String(r.status),
    // Geen Meet/booking-kolom (alleen ff_url Fireflies). Frontend onderdrukt link sowieso (L4089).
    link: '',
  }));

  // Geen booking_url-kolom in D1. Emit een worker-constante zodat de Meetings-CTA
  // kan deep-linken i.p.v. de DM-modal-fallback. ⚠️ INTEGRATOR: zet de echte URL.
  const BOOKING_URL = (c.env && c.env.MEETINGS_BOOKING_URL) || '';

  const out = { meetings };
  if (BOOKING_URL) out.booking_url = BOOKING_URL;
  return out;
}

// ===== dashboard (read-only) ===============================================
// ⚠️ Houd flag-OFF tot de 8 ClickUp-discipline-lijsten in tasks zijn gesynct
//    (audit P1/G4): tasks zijn nu offerte-intake-stubs met NULL deadline.
async function h_dashboard(c) {
  const { db, bedrijfId, maps, util } = c;

  // ---- 1. company (klant + contact-basis) -----------------------------------
  const company = await db
    .prepare('SELECT id, naam, pm, hoofd_contact FROM companies WHERE id = ?')
    .bind(bedrijfId)
    .first();
  // Fail-closed: onbekende claim -> null -> gateway valt door naar Make.
  if (!company || String(company.id) !== String(bedrijfId)) return null;

  const bedrijfsnaam = company.naam || '';

  // ---- 2. tasks (company-scoped, niet-archived) -----------------------------
  const DONE = ['done', 'klaar-voor-facturatie', 'gefactureerd'];
  const FEEDBACK = ['feedback-klant', 'doorgestuurd'];

  const taskRowsRes = await db
    .prepare(
      'SELECT id, name, branch, status, deadline, fb_link, type_job, last_activity_at, completed_at ' +
      'FROM tasks WHERE company_id = ? AND COALESCE(archived,0) = 0'
    )
    .bind(bedrijfId)
    .all();
  const taskRows = (taskRowsRes && taskRowsRes.results) || [];

  const mapProject = (t) => {
    const portalStatus = maps.statusD1ToPortal(t.status);
    const disc = maps.branchToDisc(t.branch);
    return {
      task_id:          t.id || '',
      naam:             t.name || 'Project',
      discipline:       disc,                        // portal-key (G3)
      status:           portalStatus,               // portal underscore-key (G2)
      // dashboard-datums worden direct new Date()'d -> ISO (NIET ms-string).
      opleverdatum:     util.iso(t.deadline),       // '' bij NULL
      type:             t.type_job || '',
      laatst_geupdatet: util.iso(t.last_activity_at), // '' bij NULL
      voortgang_pct:    undefined,                  // geen kolom -> weglaten (optioneel)
      feedback_link:    t.fb_link || '',
      kan_beginnen:     false,                       // geen kolom -> safe default
      shoot_gepland:    false,
      deliverables:     [],                          // files-tabel 0 rows (G5)
    };
  };

  const isDone = (s) => DONE.indexOf(s) !== -1;
  const actieve_projecten = [];
  const historie_3mnd = [];
  for (const t of taskRows) {
    const proj = mapProject(t);
    if (isDone(t.status)) {
      const ts = Number(t.completed_at || t.last_activity_at || 0);
      const cutoff = Date.now() - 90 * 86400000;
      if (ts >= cutoff) {
        proj.afgerond_op = util.iso(t.completed_at || t.last_activity_at);
        historie_3mnd.push(proj);
      }
    } else {
      actieve_projecten.push(proj);
    }
  }

  // ---- 3. stats (aggregate counts) ------------------------------------------
  const donePh = DONE.map(() => '?').join(',');
  const fbPh = FEEDBACK.map(() => '?').join(',');
  const now = Date.now();
  const weekAhead = now + 7 * 86400000;
  const days30Ago = now - 30 * 86400000;

  const statActief = await db
    .prepare(
      'SELECT COUNT(*) AS n FROM tasks WHERE company_id = ? AND COALESCE(archived,0)=0 ' +
      'AND status NOT IN (' + donePh + ')'
    ).bind(bedrijfId, ...DONE).first();

  const statFeedback = await db
    .prepare(
      'SELECT COUNT(*) AS n FROM tasks WHERE company_id = ? AND COALESCE(archived,0)=0 ' +
      'AND status IN (' + fbPh + ')'
    ).bind(bedrijfId, ...FEEDBACK).first();

  const statWeek = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM meetings WHERE bedrijf_id = ? AND COALESCE(type,'')<>'INTERN' " +
      'AND CAST(COALESCE(datum,0) AS INTEGER) BETWEEN ? AND ?'
    ).bind(bedrijfId, now, weekAhead).first();  // numerieke binds: INTEGER-vergelijking (geen TEXT-affinity-bug)

  const statOpgeleverd = await db
    .prepare(
      'SELECT COUNT(*) AS n FROM tasks WHERE company_id = ? ' +
      'AND status IN (' + donePh + ') AND completed_at IS NOT NULL ' +
      'AND CAST(completed_at AS INTEGER) >= ?'
    ).bind(bedrijfId, ...DONE, days30Ago).first();

  const stats = {
    actieve_projecten: (statActief && statActief.n) || 0,
    openstaande_feedback: (statFeedback && statFeedback.n) || 0,
    deze_week: (statWeek && statWeek.n) || 0,
    opgeleverd_30d: (statOpgeleverd && statOpgeleverd.n) || 0,
  };

  // ---- 4. aankomende_meetings (toekomst, niet-INTERN) -----------------------
  const meetingRowsRes = await db
    .prepare(
      "SELECT id, titel, type, datum FROM meetings WHERE bedrijf_id = ? " +
      "AND COALESCE(type,'')<>'INTERN' AND CAST(COALESCE(datum,0) AS INTEGER) >= ? " +
      'ORDER BY CAST(COALESCE(datum,0) AS INTEGER) ASC LIMIT 10'
    )
    .bind(bedrijfId, now)  // numerieke bind: INTEGER-vergelijking (geen TEXT-affinity-bug)
    .all();
  const meetingRows = (meetingRowsRes && meetingRowsRes.results) || [];

  const aankomende_meetings = meetingRows.map((m) => ({
    titel:    m.titel || 'Meeting',
    datum:    util.iso(m.datum),   // ISO (dashboard new Date()'t direct)
    tijdslot: '',                  // geen slot-kolom
    type:     m.type || '',
    link:     '',                  // geen Meet-URL-kolom (alleen ff_url, intern)
  }));

  // ---- 5. contact (account manager) -----------------------------------------
  let am = { am_naam: '', am_email: '', am_rol: '' };
  const pmName = (company.pm || '').trim();
  if (pmName) {
    const tm = await db
      .prepare('SELECT naam, email, functie FROM team_members WHERE LOWER(naam) = LOWER(?) LIMIT 1')
      .bind(pmName)
      .first();
    am = {
      am_naam: (tm && tm.naam) || pmName,
      am_email: (tm && tm.email) || '',
      am_rol: (tm && tm.functie) || 'Account manager',
    };
  }

  // ---- 6. modules: null = toon alle tabs (geen regressie; R17). -------------
  // Active disciplines afgeleid voor toekomstig gebruik, maar NIET gebruikt om te disablen.
  const branchRowsRes = await db
    .prepare('SELECT DISTINCT branch FROM tasks WHERE company_id = ? AND COALESCE(archived,0)=0')
    .bind(bedrijfId)
    .all();
  const branchRows = (branchRowsRes && branchRowsRes.results) || [];
  const activeDiscs = {};
  for (const b of branchRows) {
    const d = maps.branchToDisc(b.branch);
    if (d) activeDiscs[d] = true;
  }
  const modules = null; // null => frontend toont alle tabs (backward-safe)

  // ---- assemble response BODY (top-level; gateway wrapt {ok,status,data}) ---
  return {
    klant: { bedrijfsnaam: bedrijfsnaam },
    stats: stats,
    actieve_projecten: actieve_projecten,
    historie_3mnd: historie_3mnd,
    aankomende_meetings: aankomende_meetings,
    contact: am,
    modules: modules,
  };
}

// ===== chatList (read-only) ================================================
// ⚠️ Houd flag-OFF tot ClickUp-comments zijn gebackfilld (R10): chat_messages=0
//    rows vandaag, dus een flip zou bestaande threads blanken.
async function h_chatList(c) {
  const { db, bedrijfId, body, util } = c;

  // Room SERVER-SIDE afgeleid uit de claim. NOOIT body.bedrijf_id/room_id vertrouwen.
  const roomId = 'co_' + bedrijfId;

  // Optionele per-task-scoping: alleen filteren op task_ref als body een task_id stuurt.
  // NIET voor auth (room_id WHERE fence't al op de claim-company).
  const taskId = body && body.task_id ? String(body.task_id) : '';

  let sql =
    'SELECT m.id AS id, m.from_member AS from_member, m.text AS text, ' +
    '       m.files AS files, m.ts AS ts, ' +
    '       tm.naam AS tm_naam, ' +
    '       c.voornaam AS c_voornaam, c.achternaam AS c_achternaam, ' +
    '       co.naam AS company_naam ' +
    'FROM chat_messages m ' +
    'LEFT JOIN team_members tm ON tm.id = m.from_member ' +
    'LEFT JOIN contacts c ON (c.id = m.from_member OR lower(c.email) = lower(m.from_member)) ' +
    '       AND c.bedrijf_id = ? ' +
    'LEFT JOIN companies co ON co.id = ? ' +
    'WHERE m.room_id = ?';
  const binds = [bedrijfId, bedrijfId, roomId];
  if (taskId) {
    sql += ' AND m.task_ref = ?';
    binds.push(taskId);
  }
  sql += ' ORDER BY m.ts ASC';

  let rows = [];
  try {
    const res = await db.prepare(sql).bind(...binds).all();
    rows = (res && res.results) ? res.results : [];
  } catch (e) {
    // Fail-closed: bij DB-fout een lege thread (frontend rendert leeg, geen error-key).
    return { comments: [] };
  }

  const comments = rows.map((r) => {
    const isStaff = !!r.tm_naam; // from_member resolveerde naar een team member => staff
    const isKlant = !isStaff;    // from_member NOT IN team_members => klant

    // auteur-prioriteit: team_member naam -> contact-volledige-naam -> company-naam -> 'Studio 27'
    let auteur = '';
    if (isStaff) {
      auteur = r.tm_naam || '';
    } else {
      const fn = (r.c_voornaam || '').trim();
      const ln = (r.c_achternaam || '').trim();
      const full = (fn + ' ' + ln).trim();
      auteur = full || r.company_naam || '';
    }
    if (!auteur) auteur = isKlant ? (r.company_naam || '') : 'Studio 27';

    // attachments: chat_messages.files is JSON. Map naar {filename,url}. Tolerant.
    let attachments = [];
    if (r.files) {
      try {
        const parsed = typeof r.files === 'string' ? JSON.parse(r.files) : r.files;
        if (Array.isArray(parsed)) {
          attachments = parsed.map((f) => ({
            filename: (f && (f.filename || f.naam || f.name)) || 'bestand',
            url: (f && (f.url || f.drive_url)) || '',
          })).filter((a) => a.url);
        }
      } catch (e) { /* malformed files json -> geen attachments */ }
    }

    return {
      id: String(r.id || ''),
      auteur: auteur,
      is_klant: isKlant,        // strikt boolean; frontend checkt === true
      tekst: r.text || '',      // platte tekst, geen Make-encoding
      datum: util.msStr(r.ts),  // epoch-MILLISECONDS STRING ('' voor null/0)
      attachments: attachments, // altijd een array
    };
  });

  return { comments: comments };
}

// ===== chatPost (WRITE — blijft achter de flag UIT tot P2) =================
// ⚠️ WRITE-endpoint. Schrijft alleen portal-owned tabellen (chat_rooms upsert +
//    chat_messages insert), die NIET in de ClickUp->D1-mirror zitten, dus geen
//    portal_overrides-stamp nodig (audit R1). Blijft UIT in D1_ENDPOINTS tot P2.
async function h_chatPost(c) {
  const { db, bedrijfId, body, claims, util } = c;

  // Room-id volledig server-side uit de claim. Negeer body room_id/from_member/bedrijf_id.
  const roomId = 'co_' + bedrijfId;

  // Leid from_member SERVER-SIDE af (nooit body author/klant_naam).
  // Prefer contacts.id waar email == claims.email AND bedrijf_id == claim;
  // anders de lowercased claim-email.
  const claimEmail = String((claims && claims.email) || '').trim().toLowerCase();
  let fromMember = claimEmail;
  if (claimEmail) {
    const ct = await db
      .prepare('SELECT id FROM contacts WHERE bedrijf_id = ? AND lower(email) = ? LIMIT 1')
      .bind(bedrijfId, claimEmail)
      .first();
    if (ct && ct.id) fromMember = ct.id;
  }
  if (!fromMember) {
    // Geen bruikbare identiteit -> fail closed naar Make i.p.v. een anonieme row schrijven.
    return null;
  }

  // Message body: live frontend stuurt comment_text; v4/v2 kunnen bericht/tekst sturen.
  const text = String(
    (body && (body.comment_text != null ? body.comment_text
      : body.bericht != null ? body.bericht
      : body.tekst != null ? body.tekst
      : '')) || ''
  );

  // task_ref: optionele per-project anker. Body task_id is untrusted voor SCOPING
  // (we queryen er nooit op), maar onschadelijk als label op onze eigen row.
  const taskRef = String((body && body.task_id) || '');

  const now = Date.now();              // server-stamp, epoch-ms (NIET body-gestuurd)
  const id = crypto.randomUUID();

  // 1) Upsert de company chat-room indien afwezig (greenfield: alleen id='team' bestaat).
  await db
    .prepare(
      "INSERT INTO chat_rooms (id, type, name, members, created_at) " +
      "VALUES (?, 'group', '', '[]', ?) " +
      "ON CONFLICT(id) DO NOTHING"
    )
    .bind(roomId, now)
    .run();

  // 2) Insert de message. chat_messages/* zijn portal-owned (R1), niet geclobbered
  //    door de ClickUp->D1-sync, dus geen portal_overrides-stamp nodig.
  await db
    .prepare(
      "INSERT INTO chat_messages (id, room_id, from_member, text, files, task_ref, ts) " +
      "VALUES (?, ?, ?, ?, '[]', ?, ?)"
    )
    .bind(id, roomId, fromMember, text, taskRef, now)
    .run();

  // Response: v2-shape. Live frontend negeert de body (fire-and-forget).
  return { ok: true, comment_id: id, posted_at: util.msStr(now) };
}

/* =============================================================================
 * ===========================  D1 WRITE-HANDLERS (P4)  =======================
 *  Schrijven naar D1 én stempelen portal_overrides zodat de ClickUp->D1-sync
 *  (cdbUpsertGuarded) de portaal-edit NIET overschrijft (audit R1). Mirrort het
 *  bewezen hub-patroon crmEntityUpdate. Blijven achter de flag; zet ze pas in
 *  D1_ENDPOINTS na een smoke-test op de live gateway.
 * ========================================================================== */

/* ---- d1PortalWrite: gedeelde write + override-stamp + IDOR-scope ---------- */
// table/whereCol/scopeCol zijn ALTIJD code-constanten (nooit body) -> geen injectie.
async function d1PortalWrite(db, table, patch, whereCol, whereVal, scopeCol, scopeVal) {
  let sel = 'SELECT id, portal_overrides FROM ' + table + ' WHERE ' + whereCol + ' = ?';
  const selBinds = [whereVal];
  if (scopeCol) { sel += ' AND ' + scopeCol + ' = ?'; selBinds.push(scopeVal); }
  const cur = await db.prepare(sel).bind(...selBinds).first();
  if (!cur) return false; // niet gevonden / niet van deze klant -> caller valt door naar Make

  let ovr = {};
  try { ovr = JSON.parse(cur.portal_overrides || '{}') || {}; } catch (e) { ovr = {}; }

  const setCols = [];
  const binds = [];
  for (const col in patch) {
    if (!Object.prototype.hasOwnProperty.call(patch, col)) continue;
    setCols.push(col + ' = ?');
    binds.push(patch[col]);
    ovr[col] = Date.now();           // stempel: deze kolom is portaal-owned -> sync laat 'm staan
  }
  if (!setCols.length) return true;  // niets te schrijven

  setCols.push('portal_overrides = ?'); binds.push(JSON.stringify(ovr));
  setCols.push('updated_at = ?');       binds.push(Date.now());

  let upd = 'UPDATE ' + table + ' SET ' + setCols.join(', ') + ' WHERE ' + whereCol + ' = ?';
  binds.push(whereVal);
  if (scopeCol) { upd += ' AND ' + scopeCol + ' = ?'; binds.push(scopeVal); }
  await db.prepare(upd).bind(...binds).run();
  return true;
}

// ===== facturatieSave (WRITE — companies kbo/fact_email/fact_opm) ==========
async function h_facturatieSave(c) {
  const { db, bedrijfId, body } = c;
  const patch = {};
  if (body && body.ondernemingsnummer !== undefined)     patch.kbo = String(body.ondernemingsnummer || '');
  if (body && body.facturatie_email !== undefined)       patch.fact_email = String(body.facturatie_email || '');
  if (body && body.facturatie_opmerkingen !== undefined) patch.fact_opm = String(body.facturatie_opmerkingen || '');
  // Scope = de claim-id zelf (companies.id == claim). Bedrijf niet in D1 -> val door naar Make.
  const ok = await d1PortalWrite(db, 'companies', patch, 'id', bedrijfId);
  if (!ok) return null;
  return { ok: true, message: 'Opgeslagen' };
}

// ===== bedrijfBeheer:update_bedrijf (WRITE — companies kbo/mw/website) =====
async function h_bedrijfBeheer_update_bedrijf(c) {
  const { db, bedrijfId, body } = c;
  const patch = {};
  if (body && body.ondernemingsnummer !== undefined) patch.kbo = String(body.ondernemingsnummer || '');
  if (body && body.website !== undefined)            patch.website = String(body.website || '');
  if (body && body.aantal_medewerkers !== undefined) {
    const raw = String(body.aantal_medewerkers).replace(/[^0-9]/g, '');
    const n = raw === '' ? null : parseInt(raw, 10);   // mw is INTEGER; leeg -> null
    patch.mw = (n == null || isNaN(n)) ? null : n;
  }
  const ok = await d1PortalWrite(db, 'companies', patch, 'id', bedrijfId);
  if (!ok) return null;
  return { ok: true };
}

// ===== bedrijfBeheer:update_contact (WRITE — contacts, IDOR-scoped) ========
// Alleen BESTAANDE contacten (body.contact_id). Het create-pad (save_contact) blijft
// bewust op ClickUp: een D1-native id zou de sync-identiteit + portaaltoegang breken (audit R12).
async function h_bedrijfBeheer_update_contact(c) {
  const { db, bedrijfId, body } = c;
  const contactId = String((body && body.contact_id) || '');
  if (!contactId) return null; // geen id (= create) -> val door naar Make (ClickUp)

  const patch = {};
  if (body && body.voornaam !== undefined)   patch.voornaam = String(body.voornaam || '');
  if (body && body.achternaam !== undefined) patch.achternaam = String(body.achternaam || '');
  if (body && body.email !== undefined)      patch.email = String(body.email || '');
  if (body && body.gsm !== undefined)        patch.gsm = String(body.gsm || '');
  if (body && body.voorkeur !== undefined)   patch.notif = String(body.voorkeur || ''); // voorkeur -> notif

  // IDOR-guard: het contact MOET aan DEZE klant hangen (bedrijf_id == geverifieerde claim).
  // Zo niet (of onbekend) -> false -> val door naar Make i.p.v. een vreemd contact te raken.
  const ok = await d1PortalWrite(db, 'contacts', patch, 'id', contactId, 'bedrijf_id', bedrijfId);
  if (!ok) return null;
  return { ok: true, updated: true, contact_id: contactId };
}

/* =============================================================================
 * =========================  EINDE D1 SECTION (NIEUW)  =======================
 * ========================================================================== */

/* ---- Worker -------------------------------------------------------------- */
export default {
  async fetch(request, env, ctx) {
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const ch = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: ch });

    // perfreport: het performance-rapport voor het INGELOGDE bedrijf. Wordt door een iframe
    // (GET) opgehaald, die geen Authorization-header kan sturen → token via ?token=. Scoping
    // gebeurt server-side: bedrijf_id komt uit het geverifieerde token, niet uit de URL.
    if (new URL(request.url).pathname.replace(/^\/+|\/+$/g, '') === 'perfreport')
      return handlePerfReport(request, env);

    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, ch);

    // Browser-origin allowlist (niet-browser clients sturen geen Origin → token is de echte poort)
    if (origin && allowed.length && !allowed.includes(origin))
      return json({ ok: false, error: 'forbidden_origin' }, 403, ch);

    const path = new URL(request.url).pathname.replace(/^\/+|\/+$/g, '');
    if (path === 'admin/link') return handleAdminLink(request, env, ch);
    const target = MAKE_ENDPOINTS[path];
    if (!target) return json({ ok: false, error: 'unknown_endpoint' }, 404, ch);

    if (!env.GATEWAY_SECRET || !env.PROJECT_ID)
      return json({ ok: false, error: 'gateway_misconfigured' }, 500, ch);

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

    const bedrijfId = claims.bedrijf_id;
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

    // 3. Body + server-vertrouwd bedrijf_id, dan doorsturen naar Make
    //    LET OP: de JSON-parse is HIERHEEN verplaatst (was net hieronder), zodat
    //    body.action al beschikbaar is voor de D1-dispatchkey. De override (bedrijf_id/
    //    uid/email/session_token) blijft EXACT identiek en gebeurt nog steeds vóór de
    //    Make-forward — dus voor Make verandert er niets.
    let body = {};
    try { body = await request.json(); } catch (e) { body = {}; }
    if (body && typeof body === 'object') {
      body.bedrijf_id = bedrijfId;   // override alles wat de client meestuurde
      body.uid = claims.sub;
      body.email = claims.email || '';
      // De v2 PORTAL-scenario's checken length(session_token) > 10. Deze call is al via het
      // Firebase-token geverifieerd + bedrijf_id is server-side gezet, dus we leveren een token
      // van geldige lengte zodat die legacy-check slaagt. (Bij cutover vervangen door X-Gateway-Secret.)
      body.session_token = 'gw-verified-' + claims.sub;
    }

    /* ===== D1-DISPATCH (NIEUW — OFF BY DEFAULT) ============================
       Komt NA het afleiden van bedrijfId uit de geverifieerde claim en NA de
       body-override, maar VÓÓR de Make-forward. Zonder env.D1_ENDPOINTS is
       D1_ENABLED leeg en gebeurt hier NIETS → 100% Make, geen gedragsverandering.
       Een handler die null/undefined teruggeeft (bv. bedrijf niet in D1) valt
       door naar Make. Elke onverwachte fout in D1 valt eveneens door naar Make,
       zodat de live-portal nooit door D1 gebroken kan worden.                 */
    let D1_ENABLED;
    try { D1_ENABLED = new Set(JSON.parse(env.D1_ENDPOINTS || '[]')); }
    catch (e) { D1_ENABLED = new Set(); }

    if (D1_ENABLED.size && env.CRMDB) {
      const dispatchKey = path === 'bedrijfBeheer'
        ? 'bedrijfBeheer:' + (body && body.action ? String(body.action) : '')
        : path;
      if (D1_ENABLED.has(dispatchKey)) {
        try {
          const out = await d1Dispatch(dispatchKey, {
            env,
            db: env.CRMDB,
            bedrijfId,
            body,
            claims,
            maps,
            util,
          });
          if (out !== null && out !== undefined) return json(out, 200, ch);
          // null/undefined => bewust doorvallen naar Make (fail-closed).
        } catch (e) {
          // D1-fout mag de portal niet breken → val door naar Make (zelfde als vroeger).
        }
      }
    }
    /* ===== EINDE D1-DISPATCH ============================================== */

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
};
