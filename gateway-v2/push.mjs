/* =============================================================================
 * Studio 27 Klantenportaal - Web Push module (gateway-v2)
 * -----------------------------------------------------------------------------
 * Zero-dependency web-push (WebCrypto + fetch), zoals de rest van de worker.
 *   - RFC 8291 payload-encryptie (aes128gcm) + RFC 8292 VAPID (ES256).
 *   - Subscriptions in KV onder `push:subs:{email}` (JSON-array, dedup op endpoint).
 *
 * PILOT (juni 2026): pushmeldingen staan ENKEL aan voor vincent@studio27.be.
 * Zowel subscribe/test (Firebase-token) als notify (secret) gaten hard op dat
 * e-mailadres. Uitrol naar klanten = PILOT_EMAIL -> allowlist/altijd-aan zetten.
 *
 * Endpoints (geregeld in worker.js):
 *   POST /push/subscribe    (Firebase-token)  body {subscription:{endpoint,keys:{p256dh,auth}}, ua?}
 *   POST /push/unsubscribe  (Firebase-token)  body {endpoint}
 *   POST /push/test         (Firebase-token)  -> stuurt een testmelding naar je eigen toestellen
 *   POST /push/notify       (X-Push-Secret)   body {email,title,body,url?,tag?,icon?}  <- Make/automation
 *
 * Worker-secrets:
 *   VAPID_PRIVATE_JWK = '{"kty":"EC","crv":"P-256","d":"...","x":"...","y":"..."}'  (SECRET!)
 *   PUSH_SECRET       = <willekeurig, voor /push/notify>                            (SECRET!)
 *   VAPID_SUBJECT     = "mailto:vincent@studio27.be"   (optioneel; default hieronder)
 * De publieke VAPID-sleutel staat (publiek, niet geheim) in v2/push.js.
 * ============================================================================= */

const PILOT_EMAIL = 'vincent@studio27.be';
const VAPID_SUBJECT_DEFAULT = 'mailto:vincent@studio27.be';
const SUBS_TTL = 7776000; // 90 dagen

/* ---- base64url + byte-helpers -------------------------------------------- */
function b64urlToBytes(s) {
  s = String(s == null ? '' : s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
function bytesToB64url(u8) {
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function concatBytes() {
  let len = 0;
  for (let i = 0; i < arguments.length; i++) len += arguments[i].length;
  const out = new Uint8Array(len);
  let o = 0;
  for (let i = 0; i < arguments.length; i++) { out.set(arguments[i], o); o += arguments[i].length; }
  return out;
}
const utf8 = (s) => new TextEncoder().encode(s);
const NUL = new Uint8Array([0]);

/* ---- kleine, zelfstandige helpers (geen koppeling met worker.js) --------- */
function timingSafeEqual(a, b) {
  const ea = utf8(String(a == null ? '' : a));
  const eb = utf8(String(b == null ? '' : b));
  if (ea.length !== eb.length) return false;
  let r = 0;
  for (let i = 0; i < ea.length; i++) r |= ea[i] ^ eb[i];
  return r === 0;
}
const jsonRes = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...(headers || {}) } });
const isPilot = (email) => String(email == null ? '' : email).trim().toLowerCase() === PILOT_EMAIL;

/* ---- VAPID (RFC 8292) ----------------------------------------------------- */
async function importVapid(env) {
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: jwk.d, x: jwk.x, y: jwk.y, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  // Publiek punt 0x04||X||Y uit de JWK-coordinaten (matcht gegarandeerd de private sleutel).
  const pub = concatBytes(new Uint8Array([4]), b64urlToBytes(jwk.x), b64urlToBytes(jwk.y));
  return { key, pub };
}
export async function vapidAuthHeader(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const sub = env.VAPID_SUBJECT || VAPID_SUBJECT_DEFAULT;
  const enc = (o) => bytesToB64url(utf8(JSON.stringify(o)));
  const signingInput = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc({ aud, exp: now + 12 * 3600, sub });
  const { key, pub } = await importVapid(env);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(signingInput)));
  const jwt = signingInput + '.' + bytesToB64url(sig);
  return 'vapid t=' + jwt + ', k=' + bytesToB64url(pub);
}

/* ---- aes128gcm payload-encryptie (RFC 8291 + RFC 8188) ------------------- */
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8);
  return new Uint8Array(bits);
}
// opts (alleen voor tests): { asKeyPair:{privateKey,publicKey}, salt, rs }
export async function encryptPayload(plaintextBytes, p256dhB64, authB64, opts) {
  opts = opts || {};
  const uaPublic = b64urlToBytes(p256dhB64);   // 65 bytes
  const authSecret = b64urlToBytes(authB64);   // 16 bytes

  const asKeyPair = opts.asKeyPair ||
    await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey)); // 65
  const salt = opts.salt || crypto.getRandomValues(new Uint8Array(16));

  // ECDH-gedeeld geheim (de X-coordinaat, 32 bytes).
  const uaPubKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPubKey }, asKeyPair.privateKey, 256));

  // IKM = HKDF(salt=auth_secret, IKM=ecdh, info="WebPush: info"||0x00||ua_pub||as_pub, 32)
  const keyInfo = concatBytes(utf8('WebPush: info'), NUL, uaPublic, asPublicRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  // CEK + nonce uit de message-salt (info = label||0x00 per RFC 8188).
  const cek = await hkdf(salt, ikm, concatBytes(utf8('Content-Encoding: aes128gcm'), NUL), 16);
  const nonce = await hkdf(salt, ikm, concatBytes(utf8('Content-Encoding: nonce'), NUL), 12);

  // Een record: plaintext || 0x02 (delimiter laatste record), geen extra padding.
  const record = concatBytes(plaintextBytes, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, record));

  // Header (RFC 8188): salt(16) || rs(4, big-endian) || idlen(1)=65 || keyid=as_public(65)
  const rs = opts.rs || 4096;
  const rsBytes = new Uint8Array([(rs >>> 24) & 255, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255]);
  const header = concatBytes(salt, rsBytes, new Uint8Array([asPublicRaw.length]), asPublicRaw);
  return concatBytes(header, ciphertext);
}

/* ---- een push versturen --------------------------------------------------- */
// Geeft de HTTP-status terug (201/200 = ok; 404/410 = subscription dood).
async function sendOne(subscription, payloadObj, env) {
  const encrypted = await encryptPayload(utf8(JSON.stringify(payloadObj)), subscription.keys.p256dh, subscription.keys.auth);
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': await vapidAuthHeader(subscription.endpoint, env),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '2419200',
      'Urgency': 'high',
    },
    body: encrypted,
  });
  return res.status;
}

/* ---- KV-opslag ------------------------------------------------------------ */
const subsKey = (email) => 'push:subs:' + String(email).trim().toLowerCase();
async function loadSubs(env, email) {
  try { const raw = await env.KV.get(subsKey(email)); return raw ? JSON.parse(raw) : []; }
  catch (e) { return []; }
}
async function saveSubs(env, email, subs) {
  await env.KV.put(subsKey(email), JSON.stringify(subs), { expirationTtl: SUBS_TTL });
}

/* ---- DISPATCH: token-authed routes (subscribe/unsubscribe/test) ----------- */
// Aangeroepen vanuit worker.js NA tokenverificatie; `claims` = geverifieerd token.
export async function handlePush(path, claims, body, env, ctx, ch) {
  const sub = path.slice('push/'.length); // subscribe | unsubscribe | test
  const email = String(claims.email || '').trim().toLowerCase();

  if (!env.VAPID_PRIVATE_JWK) return jsonRes({ ok: false, error: 'push_not_configured', message: 'VAPID_PRIVATE_JWK ontbreekt.' }, 501, ch);
  if (!env.KV) return jsonRes({ ok: false, error: 'kv_unavailable' }, 500, ch);
  // PILOT: enkel vincent@studio27.be.
  if (!isPilot(email)) return jsonRes({ ok: false, error: 'pilot_only', message: 'Pushmeldingen staan in pilot (enkel vincent@studio27.be).' }, 403, ch);

  if (sub === 'subscribe') {
    const s = body && body.subscription;
    if (!s || !s.endpoint || !s.keys || !s.keys.p256dh || !s.keys.auth)
      return jsonRes({ ok: false, error: 'bad_subscription' }, 400, ch);
    const list = (await loadSubs(env, email)).filter((x) => x.endpoint !== s.endpoint);
    list.push({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth }, ua: String(body.ua || '').slice(0, 200), ts: Date.now() });
    while (list.length > 10) list.shift();
    await saveSubs(env, email, list);
    return jsonRes({ ok: true, count: list.length }, 200, ch);
  }

  if (sub === 'unsubscribe') {
    const ep = body && body.endpoint;
    const list = (await loadSubs(env, email)).filter((x) => x.endpoint !== ep);
    await saveSubs(env, email, list);
    return jsonRes({ ok: true, count: list.length }, 200, ch);
  }

  if (sub === 'test') {
    const list = await loadSubs(env, email);
    if (!list.length) return jsonRes({ ok: false, error: 'no_subscriptions', message: 'Nog geen toestel ingeschreven op dit account.' }, 200, ch);
    const payload = { title: 'Studio 27 - testmelding', body: 'Top! Pushmeldingen werken op dit toestel. 🎉', url: '/', tag: 's27-test', icon: '/icons/icon-192.png' };
    const results = [], dead = [];
    for (const sd of list) {
      let status = 0;
      try { status = await sendOne(sd, payload, env); } catch (e) { status = -1; }
      results.push({ endpoint: sd.endpoint.slice(0, 40) + '…', status });
      if (status === 404 || status === 410) dead.push(sd.endpoint);
    }
    if (dead.length) await saveSubs(env, email, list.filter((x) => !dead.includes(x.endpoint)));
    const sent = results.filter((r) => r.status >= 200 && r.status < 300).length;
    return jsonRes({ ok: sent > 0, sent, total: list.length, removed: dead.length, results }, 200, ch);
  }

  return jsonRes({ ok: false, error: 'unknown_push_route' }, 404, ch);
}

/* ---- secret-gated notify (Make/automation; GEEN Firebase-token) ----------- */
export async function handlePushNotify(request, env, ctx, ch) {
  if (!env.VAPID_PRIVATE_JWK || !env.PUSH_SECRET) return jsonRes({ ok: false, error: 'push_not_configured' }, 501, ch);
  if (!env.KV) return jsonRes({ ok: false, error: 'kv_unavailable' }, 500, ch);

  // Per-IP throttle (brute-force op het secret afremmen), fail-open op de teller.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const tkey = 'rlip:pushnotify:' + ip + ':' + Math.floor(Date.now() / 60000);
  try {
    const cur = parseInt((await env.KV.get(tkey)) || '0', 10);
    if (cur >= 60) return jsonRes({ ok: false, error: 'rate_limited' }, 429, ch);
    ctx.waitUntil(env.KV.put(tkey, String(cur + 1), { expirationTtl: 120 }));
  } catch (e) { /* fail-open */ }

  if (!timingSafeEqual(request.headers.get('X-Push-Secret') || '', env.PUSH_SECRET))
    return jsonRes({ ok: false, error: 'forbidden' }, 403, ch);

  let body = {};
  try { body = await request.json(); } catch (e) { body = {}; }
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return jsonRes({ ok: false, error: 'missing_email' }, 400, ch);
  // PILOT: stille no-op voor iedereen behalve Vincent (zo kan Make al alles aanroepen).
  if (!isPilot(email)) return jsonRes({ ok: true, skipped: 'pilot_only', sent: 0 }, 200, ch);

  const list = await loadSubs(env, email);
  if (!list.length) return jsonRes({ ok: true, sent: 0, note: 'no_subscriptions' }, 200, ch);
  const payload = {
    title: String(body.title || 'Studio 27 portaal').slice(0, 120),
    body: String(body.body || 'Er is een update in je portaal.').slice(0, 300),
    url: body.url || '/',
    tag: body.tag || 's27-portaal',
    icon: body.icon || '/icons/icon-192.png',
  };
  const dead = []; let sent = 0;
  for (const sd of list) {
    let st = 0;
    try { st = await sendOne(sd, payload, env); } catch (e) { st = -1; }
    if (st >= 200 && st < 300) sent++;
    if (st === 404 || st === 410) dead.push(sd.endpoint);
  }
  if (dead.length) await saveSubs(env, email, list.filter((x) => !dead.includes(x.endpoint)));
  return jsonRes({ ok: sent > 0, sent, total: list.length, removed: dead.length }, 200, ch);
}
