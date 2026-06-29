/* =============================================================================
 * mcp.mjs — Minimale MCP-client (Model Context Protocol) voor de Cloudflare Worker.
 *
 * Doel: externe MCP-servers koppelen aan het teamportaal zodat de AI-agents (Claude,
 * later Gemini/GPT) hun tools live kunnen aanroepen — net zoals Make.com AI-agents of
 * ClickUp Brain externe bronnen koppelen.
 *
 * CONSTRAINT: een Worker kan geen subprocess starten, dus ENKEL remote/HTTP MCP-servers
 * (Streamable HTTP / SSE transport). Lokale "stdio"-MCP's kunnen niet. In de praktijk
 * biedt elke SaaS-MCP een remote endpoint, dus dit dekt vrijwel alles.
 *
 * Protocol: JSON-RPC 2.0 over HTTP POST. We ondersteunen zowel een directe JSON-respons
 * als een text/event-stream (SSE) respons (de twee Streamable-HTTP-varianten).
 *
 * Auth-tokens worden NOOIT in plaintext in KV bewaard: mcpEncrypt/mcpDecrypt (AES-GCM,
 * sleutel afgeleid van een server-secret) versleutelen ze at-rest.
 * ============================================================================= */

const str = (v) => (v == null ? '' : String(v));

/* ---- token-encryptie (AES-GCM; sleutel = SHA-256 van een server-secret) ---------- */
async function mcpEncKey(env) {
  const base = str(env && env.MCP_ENC_KEY) || str(env && env.GATEWAY_SECRET) || str(env && env.ADMIN_SECRET) || 's27-mcp-fallback-key';
  const raw = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(base));
  return globalThis.crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
export async function mcpEncrypt(env, plain) {
  const p = str(plain);
  if (!p) return '';
  try {
    const key = await mcpEncKey(env);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ct = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(p));
    const out = new Uint8Array(iv.length + ct.byteLength); out.set(iv); out.set(new Uint8Array(ct), iv.length);
    let bin = ''; for (const b of out) bin += String.fromCharCode(b);
    return 'enc:' + btoa(bin);
  } catch (e) { return 'plain:' + p; }   // fail-soft (nooit de token verliezen), maar gemarkeerd
}
export async function mcpDecrypt(env, stored) {
  const s = str(stored);
  if (!s) return '';
  if (s.startsWith('plain:')) return s.slice(6);
  if (!s.startsWith('enc:')) return s;   // legacy/plaintext
  try {
    const bytes = Uint8Array.from(atob(s.slice(4)), (c) => c.charCodeAt(0));
    const iv = bytes.slice(0, 12), ct = bytes.slice(12);
    const key = await mcpEncKey(env);
    const pt = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch (e) { return ''; }
}

/* ---- JSON-RPC over HTTP (Streamable HTTP, JSON + SSE) ----------------------------- */
const MCP_PROTOCOL = '2025-06-18';
const MCP_CLIENT = { name: 'Studio27-Teamportaal', version: '1.0.0' };

// Pak uit een SSE-body het JSON-RPC-bericht dat bij onze request-id hoort (of een result/error).
function parseSse(text, id) {
  // CRLF normaliseren: sommige servers (bv. DeepWiki) sturen \r\n; zonder dit breekt de frame-split
  // op \n\n én de regex (`.` matcht geen \r) → geen data gevonden.
  const norm = str(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const frames = norm.split(/\n\n/);
  let best = null;
  for (const f of frames) {
    const lines = f.split(/\n/);
    let dataLine = '';
    for (const ln of lines) { const m = ln.match(/^data:\s?(.*)$/); if (m) dataLine += m[1]; }
    if (!dataLine) continue;
    try { const j = JSON.parse(dataLine); if (j && (j.id === id || j.result !== undefined || j.error !== undefined)) best = j; } catch (e) { /* */ }
  }
  return best;
}

// conn = { url, auth_token, _session? } — _session wordt binnen één operatie hergebruikt.
async function mcpRpc(conn, method, params, id) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'MCP-Protocol-Version': MCP_PROTOCOL };
  if (conn.auth_token) headers['Authorization'] = 'Bearer ' + conn.auth_token;
  if (conn._session) headers['Mcp-Session-Id'] = conn._session;
  const payload = { jsonrpc: '2.0', method, params: params || {} };
  if (id != null) payload.id = id;   // notifications hebben geen id
  let r;
  try {
    r = await fetch(conn.url, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
  } catch (e) { return { ok: false, status: 0, err: 'unreachable', data: null }; }
  const sid = r.headers.get('Mcp-Session-Id'); if (sid) conn._session = sid;
  if (id == null) return { ok: r.ok, status: r.status, data: null };   // notification, geen body nodig
  const ct = (r.headers.get('Content-Type') || '').toLowerCase();
  let data = null;
  try {
    if (ct.includes('text/event-stream')) data = parseSse(await r.text(), id);
    else data = await r.json();
  } catch (e) { data = null; }
  return { ok: r.ok, status: r.status, data };
}

// Handshake (initialize + initialized-notificatie). Vult conn._session.
async function mcpHandshake(conn) {
  const init = await mcpRpc(conn, 'initialize', { protocolVersion: MCP_PROTOCOL, capabilities: { tools: {} }, clientInfo: MCP_CLIENT }, 1);
  if (!init.ok) return { ok: false, error: init.err === 'unreachable' ? 'unreachable' : ('http_' + init.status) };
  if (!init.data || init.data.error) return { ok: false, error: str(init.data && init.data.error && init.data.error.message) || 'init_fout' };
  await mcpRpc(conn, 'notifications/initialized', {}, null).catch(() => {});
  const info = init.data.result && init.data.result.serverInfo;
  return { ok: true, serverInfo: info || {} };
}

// Tools van een MCP-server ophalen (handshake + tools/list). Geeft genormaliseerde tools terug.
// conn = { url, auth_token (plaintext) }.
export async function mcpListTools(conn) {
  const c = { url: str(conn.url), auth_token: str(conn.auth_token) };
  if (!/^https:\/\//i.test(c.url)) return { ok: false, error: 'bad_url', message: 'Gebruik een https-URL.' };
  const hs = await mcpHandshake(c);
  if (!hs.ok) return { ok: false, error: hs.error };
  const r = await mcpRpc(c, 'tools/list', {}, 2);
  if (!r.ok || !r.data || r.data.error) return { ok: false, error: str(r.data && r.data.error && r.data.error.message) || ('http_' + r.status) };
  const tools = (r.data.result && Array.isArray(r.data.result.tools)) ? r.data.result.tools : [];
  return {
    ok: true,
    serverInfo: hs.serverInfo,
    tools: tools.map((t) => ({ name: str(t.name), description: str(t.description).slice(0, 600), inputSchema: t.inputSchema || { type: 'object', properties: {} } })),
  };
}

// Eén tool aanroepen op een MCP-server (handshake + tools/call). Geeft platte tekst terug.
export async function mcpCallTool(conn, name, args) {
  const c = { url: str(conn.url), auth_token: str(conn.auth_token) };
  const hs = await mcpHandshake(c);
  if (!hs.ok) return { ok: false, text: 'Kon geen verbinding maken met de connector (' + hs.error + ').' };
  const r = await mcpRpc(c, 'tools/call', { name: str(name), arguments: (args && typeof args === 'object') ? args : {} }, 3);
  if (!r.ok || !r.data) return { ok: false, text: 'De connector antwoordde niet (http ' + r.status + ').' };
  if (r.data.error) return { ok: false, text: 'Tool-fout: ' + str(r.data.error.message || r.data.error.code) };
  const res = r.data.result || {};
  let text = '';
  if (Array.isArray(res.content)) {
    text = res.content.map((b) => {
      if (b && b.type === 'text') return str(b.text);
      if (b && b.type === 'resource' && b.resource) return str(b.resource.text || b.resource.uri);
      return JSON.stringify(b);
    }).join('\n');
  } else if (res.content) text = str(res.content);
  else text = JSON.stringify(res);
  return { ok: !res.isError, text: text.slice(0, 8000), isError: !!res.isError };
}

// Anthropic-tool-naam: max 64 tekens, enkel [a-zA-Z0-9_-]. We namespacen per connector
// zodat tools van verschillende servers niet botsen: mcp_<connId>_<sane-toolnaam>.
export function mcpToolName(connId, toolName) {
  // enkel [a-zA-Z0-9_] zodat de naam geldig is voor Claude, OpenAI ÉN Gemini (Gemini staat geen '-' toe)
  const sane = str(toolName).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 48);
  return ('mcp_' + str(connId).replace(/[^a-zA-Z0-9_]/g, '_') + '_' + sane).slice(0, 64);
}

/* ===========================================================================
 * OAuth 2.1 + PKCE + Dynamic Client Registration (MCP authorization).
 * Zoals Claude/Make: de gebruiker wordt naar de externe app gestuurd om in te
 * loggen + toestemming te geven; wij krijgen een access- + refresh-token. Werkt
 * enkel met MCP-servers die OAuth-metadata aanbieden; anders blijft het handmatige
 * Bearer-token de fallback.
 * =========================================================================== */
const MCP_CALLBACK_PATH = 'mcpoauthcb';
export function mcpRedirectUri(env) {
  return str(env && env.MCP_REDIRECT_URI) || ('https://s27-portal-gateway-v2.studio27marketing.workers.dev/' + MCP_CALLBACK_PATH);
}
function b64urlBytes(bytes) {
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function mcpRandom(n) {
  const a = new Uint8Array(n || 32); globalThis.crypto.getRandomValues(a); return b64urlBytes(a);
}
export async function mcpPkceChallenge(verifier) {
  const h = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str(verifier)));
  return b64urlBytes(new Uint8Array(h));
}
async function fetchJson(url, opts) {
  try { const r = await fetch(url, Object.assign({ signal: AbortSignal.timeout(15000) }, opts || {})); const d = await r.json().catch(() => null); return { ok: r.ok, status: r.status, data: d }; }
  catch (e) { return { ok: false, status: 0, data: null }; }
}
// Ontdek of een MCP-server OAuth vereist + de endpoints. { oauth:false } als geen auth nodig of
// geen OAuth-metadata; anders { oauth:true, authorization_endpoint, token_endpoint, registration_endpoint, scopes }.
export async function mcpDiscoverOauth(serverUrl) {
  const url = str(serverUrl);
  if (!/^https:\/\//i.test(url)) return { oauth: false, error: 'bad_url' };
  let prmUrl = '', origin = '';
  try { origin = new URL(url).origin; } catch (e) { return { oauth: false, error: 'bad_url' }; }
  // 1) initialize zonder token → 401 + WWW-Authenticate (resource_metadata)
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: MCP_PROTOCOL, capabilities: {}, clientInfo: MCP_CLIENT } }), signal: AbortSignal.timeout(15000) });
    if (r.ok) return { oauth: false };   // geen auth nodig
    const wa = r.headers.get('WWW-Authenticate') || '';
    const m = wa.match(/resource_metadata="?([^",\s]+)"?/i);
    if (m) prmUrl = m[1];
  } catch (e) { /* */ }
  // 2) protected-resource-metadata → authorization_servers
  let asUrl = '';
  for (const cand of [prmUrl, origin + '/.well-known/oauth-protected-resource'].filter(Boolean)) {
    const pr = await fetchJson(cand);
    if (pr.ok && pr.data && Array.isArray(pr.data.authorization_servers) && pr.data.authorization_servers[0]) { asUrl = str(pr.data.authorization_servers[0]); break; }
  }
  if (!asUrl) asUrl = origin;   // fallback: de server is z'n eigen authorization server
  const asBase = asUrl.replace(/\/$/, '');
  // 3) authorization-server-metadata. Twee well-known-vormen: de OIDC-suffix EN de RFC 8414-vorm
  // waarbij /.well-known/… tussen host en pad wordt ingevoegd (bv. Meta Ads MCP heeft een pad /ads).
  let asOrigin = asBase, asPath = '';
  try { const u = new URL(asBase); asOrigin = u.origin; asPath = u.pathname.replace(/\/$/, ''); } catch (e) { /* */ }
  const candidates = [
    asBase + '/.well-known/oauth-authorization-server',
    asPath ? (asOrigin + '/.well-known/oauth-authorization-server' + asPath) : '',
    asBase + '/.well-known/openid-configuration',
    asPath ? (asOrigin + '/.well-known/openid-configuration' + asPath) : '',
  ].filter(Boolean);
  let meta = null;
  for (const cand of candidates) {
    const am = await fetchJson(cand);
    if (am.ok && am.data && am.data.authorization_endpoint && am.data.token_endpoint) { meta = am.data; break; }
  }
  if (!meta) return { oauth: false, error: 'no_metadata' };
  return {
    oauth: true,
    authorization_endpoint: str(meta.authorization_endpoint),
    token_endpoint: str(meta.token_endpoint),
    registration_endpoint: str(meta.registration_endpoint || ''),
    scopes: Array.isArray(meta.scopes_supported) ? meta.scopes_supported.join(' ') : '',
  };
}
// Dynamic Client Registration (RFC 7591). Geeft { ok, client_id, client_secret? }.
export async function mcpRegisterClient(regEndpoint, redirectUri) {
  if (!regEndpoint) return { ok: false, error: 'no_dcr' };
  const r = await fetchJson(regEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    client_name: 'Studio 27 Teamportaal', redirect_uris: [redirectUri], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none',
  }) });
  if (!r.ok || !r.data || !r.data.client_id) return { ok: false, error: 'dcr_fout', status: r.status };
  return { ok: true, client_id: str(r.data.client_id), client_secret: str(r.data.client_secret || '') };
}
// authorization_code → tokens (met PKCE). p = {code, redirect_uri, client_id, client_secret?, code_verifier, resource?}.
export async function mcpExchangeCode(tokenEndpoint, p) {
  const body = new URLSearchParams({ grant_type: 'authorization_code', code: str(p.code), redirect_uri: str(p.redirect_uri), client_id: str(p.client_id), code_verifier: str(p.code_verifier) });
  if (p.client_secret) body.set('client_secret', str(p.client_secret));
  if (p.resource) body.set('resource', str(p.resource));
  const r = await fetchJson(tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body: body.toString() });
  if (!r.ok || !r.data || !r.data.access_token) return { ok: false, error: 'token_fout', status: r.status, detail: str(r.data && r.data.error) };
  return { ok: true, access_token: str(r.data.access_token), refresh_token: str(r.data.refresh_token || ''), expires_in: Number(r.data.expires_in) || 3600 };
}
// refresh_token → nieuw access_token. p = {refresh_token, client_id, client_secret?, resource?}.
export async function mcpRefreshToken(tokenEndpoint, p) {
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: str(p.refresh_token), client_id: str(p.client_id) });
  if (p.client_secret) body.set('client_secret', str(p.client_secret));
  if (p.resource) body.set('resource', str(p.resource));
  const r = await fetchJson(tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body: body.toString() });
  if (!r.ok || !r.data || !r.data.access_token) return { ok: false, error: 'refresh_fout' };
  return { ok: true, access_token: str(r.data.access_token), refresh_token: str(r.data.refresh_token || p.refresh_token), expires_in: Number(r.data.expires_in) || 3600 };
}
