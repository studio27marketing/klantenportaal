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
 *   5. Forward naar de juiste Make-webhook met header X-Gateway-Secret
 *
 * Zero-dependency: dit bestand kan rechtstreeks in de Cloudflare Workers-editor
 * geplakt worden — geen build, geen npm.
 *
 * Variabelen (Cloudflare → Worker → Settings → Variables and Secrets):
 *   PROJECT_ID       = "studio27-cloud"                                  (plain)
 *   ALLOWED_ORIGINS  = "https://www.studio27.be,https://studio27.be"     (plain)
 *   GATEWAY_SECRET   = <openssl rand -hex 32>                            (SECRET!)
 * Binding (optioneel, aanbevolen voor rate limiting):
 *   KV               = een KV-namespace
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
};

// Strengere limiet voor schrijf-/upload-acties; ruimer voor leesacties.
const SENSITIVE = new Set([
  'uploadProject', 'uploadAlg', 'bedrijfUpload', 'huisstijlUpload', 'huisstijlDelete',
  'chatAttachment', 'chatPost', 'directMessage', 'feedbackV2', 'newProjectIntake',
  'facturatieSave', 'projectFacturatieSave', 'bedrijfVoorkeuren', 'bedrijfContact',
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
