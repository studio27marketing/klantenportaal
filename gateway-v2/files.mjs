/* =============================================================================
 * files.mjs — Centrale bestandenmodule per taak / offerte / bedrijf.
 * -----------------------------------------------------------------------------
 * Eén bewaarplaats (R2-bucket s27-portal-files, prefix `bestanden/`) + één index
 * in D1 (tabel `files` in env.CRMDB, gedeeld met de productie/CRM). Twee manieren
 * om iets toe te voegen:
 *   1. Echte upload tot 2 GB  -> R2-multipart (start/part/complete), ENKEL staff.
 *   2. Externe link           -> website / Webflow / Figma / Google Drive.
 *
 * Elk item hangt aan een entiteit (entity_type = task|offerte|company) en draagt
 * een gedenormaliseerd bedrijf_id + project_id + namen, zodat de bedrijfs-CRM-tab
 * "Bestanden" snel een Google-Drive-achtige boom kan tonen zonder dure joins.
 *
 * Zichtbaarheid per bestand: 'intern' (standaard) of 'klant' (later leesbaar in
 * portaal.studio27.be). Verwijderen gaat naar een prullenbak (status='trashed'),
 * herstelbaar; definitief wissen verwijdert ook het R2-object. Per bestand kan een
 * onraadbare magic link (share_token) gemaakt worden: publiek bekijken/downloaden
 * zonder login, intrekbaar, optioneel met vervaldatum.
 *
 * Wiring (handler-registratie als TEAM_HANDLERS + publieke GET-routes + de binaire
 * /filespart-route) gebeurt in worker.js. Deze module is zelfstandig: importeert
 * niets fragiels, eigen HMAC- en D1-helpers (spiegelt videoreview.mjs/crmdb.mjs).
 *
 * Secrets/bindings: GATEWAY_SECRET (HMAC), R2 (bucket), CRMDB (D1), KV (mpu-state).
 * ============================================================================= */

const str = (v) => (v == null ? '' : String(v));
const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const nowMs = () => Date.now();
const cleanId = (v) => str(v).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
const newId = (p) => (p || 'f') + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;   // 2 GB harde bovengrens per bestand
const PART_SIZE = 20 * 1024 * 1024;              // 20 MB per deel (client deelt zo op)
const VIEW_TTL_SEC = 6 * 3600;                   // getekende in-portaal kijk/download-link
const MPU_TTL_SEC = 24 * 3600;                   // in-vlucht multipart-state in KV
const R2_PREFIX = 'bestanden/';

const ENTITY_TYPES = new Set(['task', 'offerte', 'company']);

// Veilige inline-types: alles wat de browser zonder scriptuitvoering mag tonen.
const INLINE_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml',
  'application/pdf', 'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
  'text/plain',
]);
// svg kan script bevatten -> nooit inline serveren (forceer download).
const NEVER_INLINE = new Set(['image/svg+xml', 'text/html', 'application/xhtml+xml']);

const CT_BY_EXT = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
  svg: 'image/svg+xml', heic: 'image/heic', tif: 'image/tiff', tiff: 'image/tiff', bmp: 'image/bmp',
  pdf: 'application/pdf',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
  zip: 'application/zip', rar: 'application/vnd.rar', '7z': 'application/x-7z-compressed',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ai: 'application/postscript', psd: 'image/vnd.adobe.photoshop', eps: 'application/postscript', indd: 'application/octet-stream',
  txt: 'text/plain', csv: 'text/csv', json: 'application/json',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
};

/* ---- naamgeving -----------------------------------------------------------*/
function safeName(raw) {
  const s = str(raw).replace(/[\\/]+/g, '_').replace(/[^\w.\- ()]+/g, '_').replace(/\s+/g, ' ').trim();
  return (s || 'bestand').slice(0, 160);
}
function extOf(name) { const m = str(name).toLowerCase().match(/\.([a-z0-9]{1,8})$/); return m ? m[1] : ''; }
function guessContentType(name, given) {
  const g = str(given).trim();
  if (g && g !== 'application/octet-stream') return g;
  return CT_BY_EXT[extOf(name)] || 'application/octet-stream';
}
function detectLinkKind(url) {
  const u = str(url).toLowerCase();
  if (/figma\.com/.test(u)) return 'figma';
  if (/webflow\.(io|com)/.test(u)) return 'webflow';
  if (/(drive|docs)\.google\.com/.test(u)) return 'drive';
  if (/vimeo\.com|youtube\.com|youtu\.be/.test(u)) return 'video';
  if (/dropbox\.com|wetransfer\.com/.test(u)) return 'transfer';
  return 'website';
}

/* ---- HMAC-tokens (GATEWAY_SECRET) — zelfde mechaniek als videoreview.mjs ---*/
async function hmacKey(env) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(str(env.GATEWAY_SECRET)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
function b64url(bytes) {
  let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function signTok(env, payload) {
  const key = await hmacKey(env);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig)).slice(0, 43);
}
async function tokOk(env, payload, tok, exp) {
  if (!env.GATEWAY_SECRET || !tok) return false;
  const e = parseInt(exp, 10);
  if (!e || Date.now() / 1000 > e) return false;
  const want = await signTok(env, payload);
  if (want.length !== str(tok).length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ str(tok).charCodeAt(i);
  return diff === 0;
}
function randToken() {
  const b = new Uint8Array(24); crypto.getRandomValues(b); return b64url(b);
}
async function signedBinUrl(env, key, name) {
  const exp = Math.floor(Date.now() / 1000) + VIEW_TTL_SEC;
  const tok = await signTok(env, `bn|${key}|${exp}`);
  return `/filebin?key=${encodeURIComponent(key)}&exp=${exp}&tok=${tok}` + (name ? `&name=${encodeURIComponent(name)}` : '');
}

/* ---- D1-helpers (env.CRMDB) ----------------------------------------------*/
async function dbRun(env, sql, binds) {
  try { return await env.CRMDB.prepare(sql).bind(...(binds || [])).run(); } catch (e) { return null; }
}
async function dbAll(env, sql, binds) {
  try { const r = await env.CRMDB.prepare(sql).bind(...(binds || [])).all(); return r.results || []; } catch (e) { return []; }
}
async function dbFirst(env, sql, binds) {
  try { return (await env.CRMDB.prepare(sql).bind(...(binds || [])).first()) || null; } catch (e) { return null; }
}

// Idempotent: maak de tabel (verse install) en voeg ontbrekende kolommen toe
// (bestaande install met het oude `files`-skelet). Best-effort, faalt nooit hard.
let _schemaReady = false;
export async function ensureFilesSchema(env) {
  if (_schemaReady || !env || !env.CRMDB) return;
  try {
    await env.CRMDB.prepare(`CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL DEFAULT '',
      entity_id TEXT NOT NULL DEFAULT '',
      naam TEXT NOT NULL DEFAULT '',
      r2_key TEXT NOT NULL DEFAULT '',
      drive_url TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL DEFAULT '',
      size INTEGER NOT NULL DEFAULT 0,
      uploaded_by TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT 0
    )`).run();
  } catch (e) { /* */ }
  // Nieuwe kolommen voor de bestandenmodule (ADD COLUMN faalt als ze al bestaan -> negeren).
  const cols = [
    "bedrijf_id TEXT NOT NULL DEFAULT ''",
    "project_id TEXT NOT NULL DEFAULT ''",
    "entity_naam TEXT NOT NULL DEFAULT ''",
    "project_naam TEXT NOT NULL DEFAULT ''",
    "kind TEXT NOT NULL DEFAULT 'upload'",        // upload | link
    "source TEXT NOT NULL DEFAULT 'r2'",          // r2 | external
    "external_url TEXT NOT NULL DEFAULT ''",
    "link_kind TEXT NOT NULL DEFAULT ''",
    "visibility TEXT NOT NULL DEFAULT 'intern'",  // intern | klant
    "status TEXT NOT NULL DEFAULT 'active'",      // active | trashed
    "trashed_at INTEGER NOT NULL DEFAULT 0",
    "trashed_by TEXT NOT NULL DEFAULT ''",
    "share_token TEXT",
    "share_expires_at INTEGER NOT NULL DEFAULT 0",
    "updated_at INTEGER NOT NULL DEFAULT 0",
  ];
  for (const c of cols) { try { await env.CRMDB.prepare(`ALTER TABLE files ADD COLUMN ${c}`).run(); } catch (e) { /* bestaat al */ } }
  try { await env.CRMDB.prepare('CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_type, entity_id, status)').run(); } catch (e) { /* */ }
  try { await env.CRMDB.prepare('CREATE INDEX IF NOT EXISTS idx_files_bedrijf ON files(bedrijf_id, status)').run(); } catch (e) { /* */ }
  try { await env.CRMDB.prepare('CREATE INDEX IF NOT EXISTS idx_files_share ON files(share_token)').run(); } catch (e) { /* */ }
  _schemaReady = true;
}

/* ---- rij -> frontend-vorm -------------------------------------------------*/
async function fileRow(env, r, withUrls) {
  const o = {
    id: str(r.id), entity_type: str(r.entity_type), entity_id: str(r.entity_id),
    bedrijf_id: str(r.bedrijf_id), project_id: str(r.project_id),
    entity_naam: str(r.entity_naam), project_naam: str(r.project_naam),
    naam: str(r.naam), kind: str(r.kind) || 'upload', source: str(r.source) || 'r2',
    content_type: str(r.content_type), size: num(r.size), ext: extOf(r.naam),
    link_kind: str(r.link_kind), external_url: str(r.external_url),
    visibility: str(r.visibility) || 'intern', status: str(r.status) || 'active',
    uploaded_by: str(r.uploaded_by), created_at: num(r.created_at), updated_at: num(r.updated_at),
    has_share: !!str(r.share_token),
    share_url: str(r.share_token) ? `/f/${str(r.share_token)}` : '',
    share_expires_at: num(r.share_expires_at),
  };
  if (withUrls) {
    if (o.kind === 'link') { o.view_url = o.external_url; o.download_url = o.external_url; }
    else if (o.source === 'r2' && r.r2_key) {
      const base = await signedBinUrl(env, str(r.r2_key), o.naam);
      o.view_url = base; o.download_url = base + '&dl=1';
    }
  }
  return o;
}

/* ---- scope: staff-only, bedrijf uit de body (werkplek is intern) ----------*/
function staffGuard(body) {
  if (!body || body.__staff !== true) return { status: 403, body: { ok: false, error: 'forbidden' } };
  return null;
}
function normEntity(body) {
  let et = str(body && body.entity_type).toLowerCase();
  if (!ENTITY_TYPES.has(et)) et = 'task';
  return et;
}

/* =============================================================================
 * LEZEN — filesList: lijst voor één entiteit (taak/offerte) of een heel bedrijf
 * ============================================================================= */
export async function filesList(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  const bedrijfId = cleanId(body && body.bedrijf_id);
  const entityId = cleanId(body && body.entity_id);
  const entityType = normEntity(body);
  const inclTrash = body && (body.include_trashed === true || body.scope === 'trash');
  const statusClause = (body && body.scope === 'trash') ? "status='trashed'" : (inclTrash ? "1=1" : "status='active'");

  let rows = [];
  if (entityId) {
    rows = await dbAll(env, `SELECT * FROM files WHERE entity_type=? AND entity_id=? AND ${statusClause} ORDER BY created_at DESC`, [entityType, entityId]);
  } else if (bedrijfId) {
    rows = await dbAll(env, `SELECT * FROM files WHERE bedrijf_id=? AND ${statusClause} ORDER BY created_at DESC`, [bedrijfId]);
  } else {
    return { status: 400, body: { ok: false, error: 'missing_scope', message: 'Geef een entity_id of bedrijf_id mee.' } };
  }
  const files = [];
  for (const r of rows) files.push(await fileRow(env, r, true));
  return { status: 200, body: { ok: true, files, count: files.length, part_size: PART_SIZE, max_bytes: MAX_FILE_BYTES } };
}

/* =============================================================================
 * LINK toevoegen (manier 2)
 * ============================================================================= */
export async function filesAddLink(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  const url = str(body && body.url).trim();
  if (!/^https?:\/\//i.test(url)) return { status: 400, body: { ok: false, message: 'Geef een geldige link (http/https).' } };
  const bedrijfId = cleanId(body && body.bedrijf_id);
  const entityType = normEntity(body);
  const entityId = cleanId(body && body.entity_id);
  if (!entityId && !bedrijfId) return { status: 400, body: { ok: false, message: 'Koppel de link aan een taak of bedrijf.' } };
  const kindLink = detectLinkKind(url);
  let host = ''; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { host = url.slice(0, 40); }
  const naam = safeName(str(body && body.naam) || host);
  const id = newId('f');
  const t = nowMs();
  await dbRun(env, `INSERT INTO files
    (id, entity_type, entity_id, bedrijf_id, project_id, entity_naam, project_naam, naam,
     kind, source, external_url, link_kind, content_type, size, visibility, status,
     uploaded_by, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?, 'link','external',?,?, '', 0, ?, 'active', ?, ?, ?)`,
    [id, entityType, entityId, bedrijfId, cleanId(body && body.project_id),
     safeName(body && body.entity_naam), safeName(body && body.project_naam), naam,
     url, kindLink, (str(body && body.visibility) === 'klant' ? 'klant' : 'intern'),
     str(body && body.account_email), t, t]);
  const r = await dbFirst(env, 'SELECT * FROM files WHERE id=?', [id]);
  return { status: 200, body: { ok: true, file: await fileRow(env, r, true) } };
}

/* =============================================================================
 * UPLOAD (manier 1) — R2-multipart: start -> /filespart (binair) -> complete
 * ============================================================================= */
export async function filesStart(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  if (!env.R2) return { status: 500, body: { ok: false, error: 'r2_unbound', message: 'Bestandsopslag is even niet beschikbaar.' } };
  const bedrijfId = cleanId(body && body.bedrijf_id);
  const entityType = normEntity(body);
  const entityId = cleanId(body && body.entity_id);
  if (!entityId && !bedrijfId) return { status: 400, body: { ok: false, message: 'Koppel het bestand aan een taak of bedrijf.' } };
  const size = num(body && body.size);
  if (size > MAX_FILE_BYTES) return { status: 413, body: { ok: false, message: 'Bestand is groter dan 2 GB.' } };

  const name = safeName(body && body.filename);
  const contentType = guessContentType(name, body && body.content_type);
  const fileId = newId('f');
  const scopeSeg = bedrijfId || 'losse';
  const subSeg = cleanId(body && body.project_id) || entityId || 'algemeen';
  const r2key = `${R2_PREFIX}${scopeSeg}/${subSeg}/${fileId}__${name}`;

  let uploadId = '';
  try {
    const mpu = await env.R2.createMultipartUpload(r2key, { httpMetadata: { contentType } });
    uploadId = mpu.uploadId;
  } catch (e) {
    return { status: 502, body: { ok: false, error: 'mpu_failed', message: 'Upload kon niet starten. Probeer opnieuw.' } };
  }
  const meta = {
    fileId, key: r2key, uploadId, entity_type: entityType, entity_id: entityId,
    bedrijf_id: bedrijfId, project_id: cleanId(body && body.project_id),
    entity_naam: safeName(body && body.entity_naam), project_naam: safeName(body && body.project_naam),
    naam: name, content_type: contentType, size,
    visibility: (str(body && body.visibility) === 'klant' ? 'klant' : 'intern'),
    created_by: str(body && body.account_email), started_at: nowMs(),
  };
  try { await env.KV.put('mpu:' + fileId, JSON.stringify(meta), { expirationTtl: MPU_TTL_SEC }); } catch (e) { /* complete kan ook met client-meta */ }
  return { status: 200, body: { ok: true, file_id: fileId, upload_id: uploadId, key: r2key, part_size: PART_SIZE, max_bytes: MAX_FILE_BYTES } };
}

export async function filesComplete(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  if (!env.R2) return { status: 500, body: { ok: false, error: 'r2_unbound' } };
  const fileId = cleanId(body && body.file_id);
  let meta = null;
  try { const raw = await env.KV.get('mpu:' + fileId); if (raw) meta = JSON.parse(raw); } catch (e) { meta = null; }
  const key = str((meta && meta.key) || (body && body.key));
  const uploadId = str((meta && meta.uploadId) || (body && body.upload_id));
  if (!key.startsWith(R2_PREFIX) || !uploadId) return { status: 400, body: { ok: false, message: 'Onvolledige upload-sessie.' } };

  let parts = (body && body.parts) || [];
  if (!Array.isArray(parts) || !parts.length) return { status: 400, body: { ok: false, message: 'Geen onderdelen ontvangen.' } };
  parts = parts.map((p) => ({ partNumber: num(p.partNumber || p.part), etag: str(p.etag) }))
    .filter((p) => p.partNumber > 0 && p.etag)
    .sort((a, b) => a.partNumber - b.partNumber);

  let obj;
  try {
    const mpu = env.R2.resumeMultipartUpload(key, uploadId);
    obj = await mpu.complete(parts);
  } catch (e) {
    return { status: 502, body: { ok: false, error: 'complete_failed', message: 'Upload afronden mislukte. Probeer het bestand opnieuw.' } };
  }
  const m = meta || {};
  const size = (obj && obj.size != null) ? num(obj.size) : num(m.size);
  const id = fileId || newId('f');
  const t = nowMs();
  await dbRun(env, `INSERT INTO files
    (id, entity_type, entity_id, bedrijf_id, project_id, entity_naam, project_naam, naam,
     kind, source, r2_key, content_type, size, visibility, status, uploaded_by, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?, 'upload','r2', ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [id, str(m.entity_type) || 'task', str(m.entity_id), str(m.bedrijf_id), str(m.project_id),
     safeName(m.entity_naam), safeName(m.project_naam), safeName(m.naam) || (key.split('__').pop() || 'bestand'),
     key, str(m.content_type) || 'application/octet-stream', size,
     (m.visibility === 'klant' ? 'klant' : 'intern'), str(m.created_by), t, t]);
  try { await env.KV.delete('mpu:' + fileId); } catch (e) { /* */ }
  const r = await dbFirst(env, 'SELECT * FROM files WHERE id=?', [id]);
  return { status: 200, body: { ok: true, file: await fileRow(env, r, true) } };
}

export async function filesAbort(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  const fileId = cleanId(body && body.file_id);
  let meta = null;
  try { const raw = await env.KV.get('mpu:' + fileId); if (raw) meta = JSON.parse(raw); } catch (e) { meta = null; }
  const key = str((meta && meta.key) || (body && body.key));
  const uploadId = str((meta && meta.uploadId) || (body && body.upload_id));
  if (env.R2 && key.startsWith(R2_PREFIX) && uploadId) {
    try { env.R2.resumeMultipartUpload(key, uploadId).abort(); } catch (e) { /* */ }
  }
  try { await env.KV.delete('mpu:' + fileId); } catch (e) { /* */ }
  return { status: 200, body: { ok: true } };
}

/* =============================================================================
 * BEHEER — hernoemen / zichtbaarheid / prullenbak / definitief / magic link
 * ============================================================================= */
async function getOwnFile(env, id) {
  return dbFirst(env, 'SELECT * FROM files WHERE id=?', [cleanId(id)]);
}

export async function filesRename(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  const id = cleanId(body && body.id);
  const naam = safeName(body && body.naam);
  if (!id || !naam) return { status: 400, body: { ok: false, message: 'Naam ontbreekt.' } };
  await dbRun(env, 'UPDATE files SET naam=?, updated_at=? WHERE id=?', [naam, nowMs(), id]);
  const r = await getOwnFile(env, id);
  return { status: 200, body: { ok: true, file: r ? await fileRow(env, r, true) : null } };
}

export async function filesSetVisibility(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  const id = cleanId(body && body.id);
  const vis = (str(body && body.visibility) === 'klant') ? 'klant' : 'intern';
  if (!id) return { status: 400, body: { ok: false, message: 'Geen bestand.' } };
  await dbRun(env, 'UPDATE files SET visibility=?, updated_at=? WHERE id=?', [vis, nowMs(), id]);
  const r = await getOwnFile(env, id);
  return { status: 200, body: { ok: true, file: r ? await fileRow(env, r, true) : null } };
}

export async function filesTrash(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  const id = cleanId(body && body.id);
  if (!id) return { status: 400, body: { ok: false, message: 'Geen bestand.' } };
  await dbRun(env, "UPDATE files SET status='trashed', trashed_at=?, trashed_by=?, updated_at=? WHERE id=?",
    [nowMs(), str(body && body.account_email), nowMs(), id]);
  return { status: 200, body: { ok: true, id } };
}

export async function filesRestore(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  const id = cleanId(body && body.id);
  if (!id) return { status: 400, body: { ok: false, message: 'Geen bestand.' } };
  await dbRun(env, "UPDATE files SET status='active', trashed_at=0, updated_at=? WHERE id=?", [nowMs(), id]);
  const r = await getOwnFile(env, id);
  return { status: 200, body: { ok: true, file: r ? await fileRow(env, r, true) : null } };
}

// Definitief wissen: ook het R2-object weg. Enkel voor reeds geprullenbakte items
// (force=true overschrijft die veiligheid).
export async function filesDelete(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  const id = cleanId(body && body.id);
  const r = await getOwnFile(env, id);
  if (!r) return { status: 404, body: { ok: false, message: 'Bestand niet gevonden.' } };
  if (str(r.status) !== 'trashed' && body && body.force !== true) {
    return { status: 409, body: { ok: false, message: 'Verplaats eerst naar de prullenbak.' } };
  }
  if (env.R2 && str(r.source) === 'r2' && str(r.r2_key)) { try { await env.R2.delete(str(r.r2_key)); } catch (e) { /* */ } }
  await dbRun(env, 'DELETE FROM files WHERE id=?', [id]);
  return { status: 200, body: { ok: true, id } };
}

export async function filesShareCreate(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  const id = cleanId(body && body.id);
  const r = await getOwnFile(env, id);
  if (!r) return { status: 404, body: { ok: false, message: 'Bestand niet gevonden.' } };
  let token = str(r.share_token);
  if (!token) token = randToken();
  // expires_at: ms-timestamp of 0 = geldig tot intrekken (de gekozen standaard).
  const exp = num(body && body.expires_at);
  await dbRun(env, 'UPDATE files SET share_token=?, share_expires_at=?, updated_at=? WHERE id=?', [token, exp, nowMs(), id]);
  return { status: 200, body: { ok: true, id, share_token: token, share_url: `/f/${token}`, share_expires_at: exp } };
}

export async function filesShareRevoke(_b, body, env) {
  const g = staffGuard(body); if (g) return g;
  await ensureFilesSchema(env);
  const id = cleanId(body && body.id);
  if (!id) return { status: 400, body: { ok: false, message: 'Geen bestand.' } };
  await dbRun(env, 'UPDATE files SET share_token=NULL, share_expires_at=0, updated_at=? WHERE id=?', [nowMs(), id]);
  return { status: 200, body: { ok: true, id } };
}

// Cron: prullenbak-items ouder dan N dagen definitief opruimen (incl. R2-object).
export async function filesPurgeTrash(env, olderThanDays) {
  await ensureFilesSchema(env);
  const cutoff = nowMs() - (num(olderThanDays || 30) * 86400000);
  const rows = await dbAll(env, "SELECT id, r2_key, source FROM files WHERE status='trashed' AND trashed_at>0 AND trashed_at<?", [cutoff]);
  let n = 0;
  for (const r of rows) {
    if (env.R2 && str(r.source) === 'r2' && str(r.r2_key)) { try { await env.R2.delete(str(r.r2_key)); } catch (e) { /* */ } }
    await dbRun(env, 'DELETE FROM files WHERE id=?', [str(r.id)]);
    n++;
  }
  return { ok: true, purged: n };
}

/* =============================================================================
 * PUBLIEKE/BINAIRE ROUTES (wiring in worker.js)
 * ============================================================================= */

// Ranged R2-serve: ondersteunt Range (206) zodat grote video's/bestanden vlot
// streamen en downloads hervatbaar zijn. download=true forceert attachment.
async function serveR2(env, key, request, opts) {
  if (!env.R2) return new Response('Opslag niet beschikbaar', { status: 500 });
  const range = request.headers.get('range') || request.headers.get('Range') || '';
  let r2opts = {};
  let start = 0, end = -1, ranged = false;
  const m = range.match(/^bytes=(\d*)-(\d*)$/);
  if (m && (m[1] || m[2])) {
    ranged = true;
    if (m[1]) start = parseInt(m[1], 10);
    if (m[2]) end = parseInt(m[2], 10);
    if (m[1] && m[2]) r2opts = { range: { offset: start, length: (end - start + 1) } };
    else if (m[1]) r2opts = { range: { offset: start } };
    else if (m[2]) r2opts = { range: { suffix: end } };
  }
  const obj = await env.R2.get(key, r2opts);
  if (!obj) return new Response('Niet gevonden', { status: 404 });
  const total = obj.size != null ? Number(obj.size) : null;
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('accept-ranges', 'bytes');
  h.set('x-content-type-options', 'nosniff');
  h.set('cache-control', 'private, max-age=3600');
  let ct = h.get('content-type') || (opts && opts.contentType) || 'application/octet-stream';
  if (!h.get('content-type') && opts && opts.contentType) h.set('content-type', opts.contentType);
  const fn = safeName((opts && opts.filename) || (key.split('__').pop()) || (key.split('/').pop()) || 'bestand');
  const forceDl = !!(opts && opts.download);
  const inline = !forceDl && INLINE_TYPES.has(ct) && !NEVER_INLINE.has(ct);
  h.set('content-disposition', inline ? `inline; filename="${fn}"` : `attachment; filename="${fn}"`);
  if (ranged && obj.range && total != null) {
    const ro = obj.range;
    const rs = ro.offset != null ? ro.offset : (total - (ro.suffix || 0));
    const rl = ro.length != null ? ro.length : (total - rs);
    const re = rs + rl - 1;
    h.set('content-range', `bytes ${rs}-${re}/${total}`);
    h.set('content-length', String(rl));
    return new Response(obj.body, { status: 206, headers: h });
  }
  if (total != null) h.set('content-length', String(total));
  return new Response(obj.body, { status: 200, headers: h });
}

// /filespart?key=&uploadId=&part=  (binaire body) — staff-auth gebeurt in worker.js
export async function handleFilePart(request, env, ch) {
  const u = new URL(request.url);
  const key = str(u.searchParams.get('key'));
  const uploadId = str(u.searchParams.get('uploadId'));
  const part = parseInt(u.searchParams.get('part') || '0', 10);
  const J = (b, s) => new Response(JSON.stringify(b), { status: s || 200, headers: Object.assign({ 'content-type': 'application/json' }, ch || {}) });
  if (!key.startsWith(R2_PREFIX) || key.includes('..') || !uploadId || !(part > 0)) return J({ ok: false, error: 'bad_request' }, 400);
  if (!env.R2) return J({ ok: false, error: 'r2_unbound' }, 500);
  let buf;
  try { buf = await request.arrayBuffer(); } catch (e) { buf = null; }
  if (!buf || !buf.byteLength) return J({ ok: false, error: 'empty_part' }, 400);
  if (buf.byteLength > (PART_SIZE * 2 + 1024 * 1024)) return J({ ok: false, error: 'part_too_large' }, 413);
  try {
    const mpu = env.R2.resumeMultipartUpload(key, uploadId);
    const p = await mpu.uploadPart(part, new Uint8Array(buf));
    return J({ ok: true, part, etag: p.etag }, 200);
  } catch (e) {
    return J({ ok: false, error: 'part_failed', detail: String(e && e.message) }, 502);
  }
}

// /filebin?key=&exp=&tok=[&dl=1][&name=]  — in-portaal kijk/download (HMAC, staff-gemint)
export async function handleFileBin(request, env) {
  const u = new URL(request.url);
  const key = str(u.searchParams.get('key'));
  const exp = str(u.searchParams.get('exp'));
  const tok = str(u.searchParams.get('tok'));
  if (!key.startsWith(R2_PREFIX) || key.includes('..')) return new Response('Ongeldige sleutel', { status: 400 });
  if (!(await tokOk(env, `bn|${key}|${exp}`, tok, exp))) return new Response('Link verlopen — herlaad het portaal.', { status: 403 });
  return serveR2(env, key, request, { download: u.searchParams.get('dl') === '1', filename: u.searchParams.get('name') });
}

// /f/<token>  — publieke magic link (geen login). 302 voor externe links; stream voor R2.
export async function handleFileShare(request, env) {
  const u = new URL(request.url);
  const token = u.pathname.replace(/^\/+f\/+/, '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (!token) return new Response('Ongeldige link', { status: 400 });
  await ensureFilesSchema(env);
  const r = await dbFirst(env, "SELECT * FROM files WHERE share_token=? AND status='active'", [token]);
  if (!r) return new Response('Deze link bestaat niet (meer).', { status: 404 });
  const exp = num(r.share_expires_at);
  if (exp > 0 && nowMs() > exp) return new Response('Deze deellink is verlopen.', { status: 410 });
  if (str(r.kind) === 'link' && str(r.external_url)) {
    return new Response(null, { status: 302, headers: { location: str(r.external_url) } });
  }
  if (str(r.source) !== 'r2' || !str(r.r2_key)) return new Response('Bestand niet beschikbaar.', { status: 404 });
  return serveR2(env, str(r.r2_key), request, { download: u.searchParams.get('dl') === '1', filename: str(r.naam) });
}
