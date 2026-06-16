/* =============================================================================
 * FEEDBACK-CORE — gestandaardiseerde, multi-mediatype feedback-orkestratie.
 * -----------------------------------------------------------------------------
 * Dit is de gedeelde KERN waarop ALLE deliverable-feedback in het portaal draait:
 * elke link in het ClickUp-veld 'Bestanden' (FIELD.deliverablesRaw) krijgt één
 * uniforme afhandeling — ongeacht of het een video (Vimeo/Drive), een PDF, een
 * foto, een PowerPoint, een Office-document of audio is.
 *
 * Bewust ADDITIEF naast videoreview.mjs: de bewezen video-review-flow (pins op
 * de video, frame-accuraat) blijft 1:1 bestaan en wordt NIET aangeraakt. Deze
 * module hergebruikt de geteste bouwstenen uit videoreview.mjs (parseVimeoUrl /
 * parseDriveUrl, dezelfde HMAC-stream-conventies) en handlers.mjs (cu,
 * scopeCheckTask, FIELD, TJ, ...), en voegt daar de "reactie-per-link"-laag
 * bovenop: approve / feedback per deliverable, met de hoofdtaak die meebeweegt.
 *
 * Endpoints (POST, Firebase-authed, bedrijf-scope via scopeCheckTask):
 *   fileReviewContext  { task_id, url }
 *        → { ok, mediaType, stream_url, download_url, is_read_only, lr_state,
 *            can_download, last_bundle? }
 *   fileReviewUpload   { task_id, filename, file_data }   → bijlage-bytes naar R2
 *   linkApprove        { task_id, url, klant_naam }
 *        → { ok, all_approved, task_status }    (alle links approved → taak 'done')
 *   linkFeedback       { task_id, url, comment, annotations?, attachments?, klant_naam }
 *        → { ok, fb_task_id, ronde }            (+ FB-subtaak + taak 'feedback klant')
 * Publieke GET-routes (HMAC-signed, expirerend — <embed>/<img> kunnen geen headers):
 *   /docstream?task=&file=&exp=&tok=[&dl=1]   → Drive-bytes (pdf/office/foto) met Range
 *   /audiostream?task=&file=&exp=&tok=        → Drive-audio met Range-passthrough
 *   (video's blijven via /videostream uit videoreview.mjs; foto-mappen via /fotostream)
 *
 * GEDEELD CONTRACT met worker + frontend:
 *   linkKeyOf(url):  vimeo→'v'+id · drive-bestand→'d'+id · drive-map→'g'+id ·
 *                    anders→'u'+fnv1a(genormaliseerde url)
 *   KV: 'lr:{taskId}:{linkKey}'  = JSON {state:'approved'|'feedback', at, door, ronde?, fb_task_id?}
 *       'lr:{taskId}:__index'    = JSON {links:[linkKey,...], at}
 *   mediaType ∈ {'video','pdf','foto','pptx','office','audio','other'}
 * ============================================================================= */
import {
  cu, getCF, FIELD, TJ, typeJobUuid, ensureTjMap,
  scopeCheckTask, SCOPE_FAIL_CLOSED, isAfgerondStatus, parseDeliverables,
  mintGoogleToken, DRIVE_SCOPE,
} from './handlers.mjs';
import { parseVimeoUrl, parseDriveUrl } from './videoreview.mjs';

const str = (v) => (v == null ? '' : String(v));
const cleanId = (v) => str(v).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
const nowISO = () => new Date().toISOString();

const STREAM_TTL_SEC = 6 * 3600;        // kijk/lees/download-link geldig per portaalsessie
const FILE_TTL_SEC = 30 * 24 * 3600;    // bijlage-links (ook in ClickUp-comment) 30 dagen
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const EXT_ALLOW = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', pdf: 'application/pdf',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
  zip: 'application/zip',
};
const INLINE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']);

/* =============================================================================
 * Drive-map-URL (galerij) — zelfde regel als videoreview.parseDriveFolderUrl,
 * hier los omdat die niet geëxporteerd is.
 * ============================================================================= */
function parseDriveFolderUrl(raw) {
  const m = str(raw).match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([-\w]{15,})/);
  return m ? { id: m[1] } : null;
}

/* =============================================================================
 * Google-native-document-URL (Docs/Sheets/Slides) → {id, kind}.
 * Deze links staan op docs.google.com (niet drive.google.com/file) en dragen
 * geen extensie; we behandelen ze als een Drive-bestand met dat id, zodat de
 * SA er de mime van kan ophalen en ze naar PDF kan exporteren voor de viewer.
 * ============================================================================= */
function parseGoogleDocUrl(raw) {
  const m = str(raw).match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([-\w]{20,})/);
  if (!m) return null;
  return { id: m[2], kind: m[1] };
}

/* =============================================================================
 * linkKeyOf — stabiele, deterministische sleutel per deliverable-link.
 * GEDEELD CONTRACT: vimeo→'v'+id · drive-bestand→'d'+id · drive-map→'g'+id ·
 * anders→'u'+fnv1a(url.toLowerCase, query/hash gestript).
 * ============================================================================= */
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}
export function linkKeyOf(url) {
  const raw = str(url).trim();
  const folder = parseDriveFolderUrl(raw);
  if (folder) return 'g' + folder.id;
  const vimeo = parseVimeoUrl(raw);
  if (vimeo) return 'v' + vimeo.id;
  const drive = parseDriveUrl(raw);
  if (drive) return 'd' + drive.id;
  const gdoc = parseGoogleDocUrl(raw);
  if (gdoc) return 'd' + gdoc.id;   // native Google-doc → zelfde 'd'+id-conventie als een Drive-bestand
  const norm = raw.toLowerCase().replace(/[?#].*$/, '');
  return 'u' + fnv1a(norm);
}

/* =============================================================================
 * mediaTypeOf — extensie + Drive-mime → één van de contract-mediatypes.
 * 'video' wordt herkend maar wordt door dít bestand niet gestreamd (dat blijft
 * videoreview.mjs); we geven 'video' wél terug zodat de frontend kan routeren.
 * ============================================================================= */
const VIDEO_EXT = new Set(['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi']);
const FOTO_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'svg']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']);
const PPTX_EXT = new Set(['ppt', 'pptx', 'key']);
const OFFICE_EXT = new Set(['doc', 'docx', 'xls', 'xlsx', 'csv', 'odt', 'ods', 'odp', 'rtf', 'txt']);

function extOf(url) {
  const path = str(url).toLowerCase().replace(/[?#].*$/, '');
  const m = path.match(/\.([a-z0-9]{1,5})$/);
  return m ? m[1] : '';
}

export function mediaTypeOf(url, mime) {
  const raw = str(url);
  const u = raw.toLowerCase();
  const m = str(mime).toLowerCase();
  // 1) MIME wint als die er is (Drive-meta)
  if (m) {
    if (m.startsWith('video/')) return 'video';
    if (m.startsWith('audio/')) return 'audio';
    if (m === 'application/pdf') return 'pdf';
    if (m.startsWith('image/')) return 'foto';
    if (m.includes('presentation') || m.includes('powerpoint') || m.includes('vnd.ms-powerpoint')) return 'pptx';
    if (m.includes('word') || m.includes('excel') || m.includes('spreadsheet') ||
        m.includes('msword') || m.includes('officedocument') || m.includes('opendocument') ||
        m === 'text/plain' || m === 'text/csv') return 'office';
    if (m.startsWith('application/vnd.google-apps.')) {
      if (m.includes('presentation')) return 'pptx';
      if (m.includes('document') || m.includes('spreadsheet')) return 'office';
    }
  }
  // 2) host-heuristiek (geen extensie op Vimeo-links e.d.)
  if (u.includes('vimeo') || u.includes('youtu')) return 'video';
  if (u.includes('docs.google.com/presentation')) return 'pptx';
  if (u.includes('docs.google.com/document') || u.includes('docs.google.com/spreadsheets')) return 'office';
  // 3) extensie
  const ext = extOf(u);
  if (VIDEO_EXT.has(ext)) return 'video';
  if (AUDIO_EXT.has(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (FOTO_EXT.has(ext)) return 'foto';
  if (PPTX_EXT.has(ext)) return 'pptx';
  if (OFFICE_EXT.has(ext)) return 'office';
  return 'other';
}

/* =============================================================================
 * parseTaskLinks — alle deliverable-links van een taak met sleutel + mediatype.
 * Bron = FIELD.deliverablesRaw via de bestaande parseDeliverables-parser.
 * ============================================================================= */
export function parseTaskLinks(task) {
  const delivs = parseDeliverables(getCF(task, FIELD.deliverablesRaw));
  const out = [];
  const seen = new Set();
  for (const d of delivs) {
    const url = str(d.url);
    const linkKey = linkKeyOf(url);
    if (seen.has(linkKey)) continue;
    seen.add(linkKey);
    out.push({ url, linkKey, mediaType: mediaTypeOf(url, '') });
  }
  return out;
}

/* =============================================================================
 * KV — link-reactiestaat per (taak, link).  lrGet/lrSet + index-bijwerking.
 * ============================================================================= */
const lrKey = (taskId, linkKey) => `lr:${taskId}:${linkKey}`;
const lrIndexKey = (taskId) => `lr:${taskId}:__index`;

export async function lrGet(env, taskId, linkKey) {
  try { return await env.KV.get(lrKey(taskId, linkKey), 'json'); }
  catch (e) { return null; }
}
export async function lrSet(env, taskId, linkKey, value) {
  const v = { ...value, at: value.at || nowISO() };
  try { await env.KV.put(lrKey(taskId, linkKey), JSON.stringify(v)); } catch (e) { /* comment is primaire drager */ }
  // index bijwerken (best-effort, voor snelle "alles gereageerd?"-checks)
  try {
    const idx = (await env.KV.get(lrIndexKey(taskId), 'json')) || { links: [] };
    if (!Array.isArray(idx.links)) idx.links = [];
    if (!idx.links.includes(linkKey)) idx.links.push(linkKey);
    idx.at = nowISO();
    await env.KV.put(lrIndexKey(taskId), JSON.stringify(idx));
  } catch (e) { /* index is best-effort */ }
  return v;
}

/* =============================================================================
 * linkReactionState — overzicht van de reactiestaat van ALLE deliverable-links
 * van de taak. Voor de reminder-onderdrukking (reminders.mjs) en de frontend.
 *   { links:[{url,linkKey,mediaType,state}], reacted, approved, allApproved, allReacted }
 * ============================================================================= */
export async function linkReactionState(env, task) {
  const links = parseTaskLinks(task);
  const taskId = str(task && task.id);
  let approved = 0, reacted = 0;
  const detailed = [];
  for (const l of links) {
    let st = null;
    try { st = await lrGet(env, taskId, l.linkKey); } catch (e) { st = null; }
    const state = (st && st.state) || null;
    if (state) reacted++;
    if (state === 'approved') approved++;
    detailed.push({ ...l, state });
  }
  const n = links.length;
  return {
    links: detailed,
    reacted,
    approved,
    allApproved: n > 0 && approved === n,
    allReacted: n > 0 && reacted === n,
  };
}

/* =============================================================================
 * HMAC-tokens (GATEWAY_SECRET) — zelfde conventie als videoreview.mjs, maar met
 * eigen prefixes ('ds' docstream, 'as' audiostream, 'ff' feedbackfile) zodat de
 * twee modules elkaars tokens niet kunnen kruisgebruiken.
 * ============================================================================= */
async function hmacKey(env) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(str(env.GATEWAY_SECRET)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
}
function b64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
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

/* ---- Drive-meta (naam/mime/grootte) via SA-DWD — zelfde patroon als handlers - */
async function driveFileMeta(env, fileId) {
  const token = await mintGoogleToken(env, str(env.GDRIVE_SUBJECT), DRIVE_SCOPE);
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,mimeType,size`,
    { headers: { authorization: 'Bearer ' + token } }
  );
  if (!r.ok) return { ok: false, status: r.status };
  const d = await r.json().catch(() => ({}));
  return {
    ok: true,
    name: d.name || null,
    mimeType: d.mimeType || null,
    sizeBytes: d.size ? Number(d.size) : null,
  };
}

/* ---- scope-helper: taak ophalen + bedrijf-eigendom afdwingen (fail-closed) -- */
async function guardTask(env, bedrijfId, taskId) {
  if (!taskId) return { ok: false, res: { status: 400, body: { ok: false, error: 'missing_task' } } };
  const tr = await cu.get(env, `/task/${taskId}?include_subtasks=true`);
  const task = tr.ok && tr.data ? tr.data : { custom_fields: [] };
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.read);
  if (!sc.ok) return { ok: false, res: { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot deze taak.' } } };
  return { ok: true, task };
}

/* ---- bewaken dat een URL effectief een deliverable van DEZE taak is --------- */
function linkOnTask(task, url) {
  const want = linkKeyOf(url);
  return parseTaskLinks(task).some((l) => l.linkKey === want);
}

/* =============================================================================
 * fileReviewContext — herken een niet-video deliverable (pdf/foto/pptx/office/
 * audio), geef lees/stream-info + de reactiestaat van die ene link.
 * Video-links worden hier herkend maar doorverwezen naar de video-review-module.
 * ============================================================================= */
export async function fileReviewContext(bedrijfId, body, env) {
  const taskId = cleanId(body && body.task_id);
  const url = str(body && body.url);
  const g = await guardTask(env, bedrijfId, taskId);
  if (!g.ok) return g.res;
  if (!linkOnTask(g.task, url)) {
    return { status: 403, body: { ok: false, error: 'link_not_on_task', message: 'Dit bestand hoort niet bij deze taak.' } };
  }

  const linkKey = linkKeyOf(url);
  const lr = await lrGet(env, taskId, linkKey);
  const taakGoedgekeurd = isAfgerondStatus(g.task && g.task.status);
  const lrState = (lr && lr.state) || null;
  // read-only zodra de taak afgerond is óf deze link al goedgekeurd werd.
  const isReadOnly = taakGoedgekeurd || lrState === 'approved';
  // downloaden mag pas na goedkeuring (Vincent: content pas vrij na akkoord)
  const canDownload = taakGoedgekeurd || lrState === 'approved';

  const vimeo = parseVimeoUrl(url);
  const drive = vimeo ? null : (parseDriveUrl(url) || parseGoogleDocUrl(url));

  // Video → expliciet doorverwijzen naar de video-review-module (niet hier streamen).
  if (vimeo || mediaTypeOf(url, '') === 'video') {
    return {
      status: 200,
      body: {
        ok: true, mediaType: 'video', route: 'videoReview', open_url: url,
        stream_url: null, download_url: null, is_read_only: isReadOnly,
        lr_state: lrState, can_download: canDownload,
      },
    };
  }

  // Drive-bestand (pdf/foto/pptx/office/audio): meta ophalen, signed lees/download-URL maken.
  if (drive) {
    let meta;
    try { meta = await driveFileMeta(env, drive.id); } catch (e) { meta = { ok: false, status: 0 }; }
    if (!meta.ok) {
      return { status: 200, body: { ok: false, error: 'drive_no_access', open_url: url, message: 'Het portaal kan dit Drive-bestand niet lezen. Zet het op de gedeelde S27-Drive of deel het met portal-admin@studio27-cloud.iam.gserviceaccount.com.' } };
    }
    const mediaType = mediaTypeOf(url, meta.mimeType);
    const isNative = str(meta.mimeType).startsWith('application/vnd.google-apps.');
    // PDF-render-modus voor documenten/presentaties zodat ze met pdf.js (klik-to-comment,
    // 1 pagina = 1 slide) getoond worden i.p.v. een onbetrouwbare externe iframe:
    //   native Google-doc/sheet/slides → 'export' (Drive export → PDF)
    //   binair Office (pptx/docx/xlsx)  → 'convert' (copy→Google-type→export→PDF, R2-cache)
    //   al de rest (pdf/foto/audio)     → 'media'  (ruwe bytes, Range-passthrough)
    let viewMode = 'media';
    if (mediaType === 'office' || mediaType === 'pptx') viewMode = isNative ? 'export' : 'convert';
    const dlMode = viewMode === 'export' ? 'export' : 'media';   // native: download = PDF-export; rest = origineel
    const exp = Math.floor(Date.now() / 1000) + STREAM_TTL_SEC;
    const route = mediaType === 'audio' ? 'audiostream' : 'docstream';
    const prefix = mediaType === 'audio' ? 'as' : 'ds';
    const mkUrl = async (mode, dl) => {
      const tok = await signTok(env, `${prefix}|${taskId}|${drive.id}|${mode}|${exp}`);
      const q = `task=${encodeURIComponent(taskId)}&file=${encodeURIComponent(drive.id)}&mode=${mode}&exp=${exp}&tok=${tok}`;
      return `/${route}?${q}${dl ? '&dl=1' : ''}`;
    };
    const streamUrl = await mkUrl(viewMode, false);
    const downloadUrl = await mkUrl(dlMode, true);
    return {
      status: 200,
      body: {
        ok: true,
        mediaType,
        view_mode: viewMode,
        // native Google-doc/sheet/slides: laat de klant het in Google openen om te
        // bewerken (Google dwingt de schrijfrechten zelf af — owner/gedeeld = bewerken,
        // anders alleen-lezen). Voor binair/PDF is er geen online-editor.
        is_native: isNative,
        edit_url: isNative ? url : null,
        task_name: str(g.task && g.task.name),
        file_name: meta.name,
        mime_type: meta.mimeType,
        size_bytes: meta.sizeBytes,
        open_url: url,
        stream_url: streamUrl,
        download_url: canDownload ? downloadUrl : null,
        is_read_only: isReadOnly,
        lr_state: lrState,
        can_download: canDownload,
        last_bundle: await signBundleAtts(env, lr && lr.bundle ? lr.bundle : null),
      },
    };
  }

  // Externe link (Figma/Webflow/...): geen stream, gewoon open_url + reactiestaat.
  return {
    status: 200,
    body: {
      ok: true,
      mediaType: mediaTypeOf(url, ''),
      open_url: url,
      stream_url: null,
      download_url: null,
      is_read_only: isReadOnly,
      lr_state: lrState,
      can_download: canDownload,
    },
  };
}

/* =============================================================================
 * fileReviewUpload — bijlage (base64) naar R2, signed GET-URL terug.
 * Zelfde validatie/sleutel-opzet als videoReviewUpload, eigen R2-prefix.
 * ============================================================================= */
function base64ToBytes(raw) {
  const b64 = str(raw).replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function signedFileUrl(env, key, ttlSec) {
  const exp = Math.floor(Date.now() / 1000) + (ttlSec || FILE_TTL_SEC);
  const tok = await signTok(env, `ff|${key}|${exp}`);
  return `/feedbackfile?key=${encodeURIComponent(key)}&exp=${exp}&tok=${tok}`;
}
// Naslag-bundel: bijlagen zijn als {filename,key} opgeslagen — her-onderteken naar
// een verse tijdelijke stream-URL zodat de read-only naslag de bijlage kan tonen.
async function signBundleAtts(env, bundle) {
  if (!bundle || !Array.isArray(bundle.annotations)) return bundle || null;
  for (const a of bundle.annotations) {
    if (!Array.isArray(a.attachments)) { a.attachments = []; continue; }
    for (const x of a.attachments) {
      if (x && x.key && !x.url) { try { x.url = await signedFileUrl(env, x.key); } catch (e) { x.url = ''; } }
    }
  }
  return bundle;
}

export async function fileReviewUpload(bedrijfId, body, env) {
  const taskId = cleanId(body && body.task_id);
  const g = await guardTask(env, bedrijfId, taskId);
  if (!g.ok) return g.res;
  if (!env.R2) return { status: 500, body: { ok: false, error: 'r2_unbound', message: 'Bestandsopslag is even niet beschikbaar.' } };

  const rawName = str(body && body.filename) || 'bestand';
  const ext = (rawName.split('.').pop() || '').toLowerCase();
  const contentType = EXT_ALLOW[ext];
  if (!contentType) {
    return { status: 415, body: { ok: false, message: 'Dit bestandstype kan niet: gebruik PNG, JPG, WebP, GIF, PDF, lettertypes (TTF/OTF/WOFF) of ZIP.' } };
  }
  let bytes;
  try { bytes = base64ToBytes(body && body.file_data); } catch (e) { bytes = new Uint8Array(0); }
  if (!bytes.length) return { status: 400, body: { ok: false, message: 'Geen bestandsdata ontvangen.' } };
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return { status: 413, body: { ok: false, message: 'Bestand is groter dan 15 MB.' } };
  }

  const attachmentId = 'att_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  const safeName = rawName.replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  const key = `feedbackcore/${taskId}/${attachmentId}/${safeName}`;
  await env.R2.put(key, bytes, {
    httpMetadata: { contentType },
    customMetadata: { taskId, bedrijfId: str(bedrijfId), scope: str(body && body.scope) || 'feedback' },
  });

  return {
    status: 200,
    body: {
      ok: true,
      attachmentId,
      filename: safeName,
      contentType,
      sizeBytes: bytes.length,
      key,
      url: await signedFileUrl(env, key),
      fileUrl: await signedFileUrl(env, key),
      uploadStatus: 'stored',
      uploadedAt: nowISO(),
    },
  };
}

/* =============================================================================
 * linkApprove — klant keurt één deliverable-link goed.  Alle deliverable-links
 * van de taak approved → hoofdtaak naar 'done' (zelfde patroon als
 * videoReviewApprove, maar over álle mediatypes).
 * ============================================================================= */
export async function linkApprove(bedrijfId, body, env) {
  const taskId = cleanId(body && body.task_id);
  const url = str(body && body.url);
  const g = await guardTask(env, bedrijfId, taskId);
  if (!g.ok) return g.res;
  if (!linkOnTask(g.task, url)) {
    return { status: 403, body: { ok: false, error: 'link_not_on_task', message: 'Dit bestand hoort niet bij deze taak.' } };
  }
  const klantNaam = str(body && body.klant_naam) || 'Klant';
  const linkKey = linkKeyOf(url);

  await lrSet(env, taskId, linkKey, { state: 'approved', door: klantNaam });

  // alle deliverable-links langs: pas als élke link approved is, gaat de taak naar 'done'.
  const links = parseTaskLinks(g.task);
  let allApproved = links.length > 0;
  for (const l of links) {
    if (l.linkKey === linkKey) continue;
    let ok = false;
    try {
      if (l.mediaType === 'video') {
        // video's worden via het bestaande video-review goedgekeurd (vr:...:approved), niet via lr:
        ok = !!(await env.KV.get(`vr:${taskId}:${l.linkKey}:approved`));
      } else {
        const st = await lrGet(env, taskId, l.linkKey); ok = !!(st && st.state === 'approved');
      }
    } catch (e) { ok = false; }
    if (!ok) { allApproved = false; break; }
  }

  let taskStatus = str(g.task && g.task.status && g.task.status.status) || null;
  if (allApproved) {
    try { await cu.put(env, `/task/${taskId}`, { status: 'done' }); taskStatus = 'done'; } catch (e) { /* comment blijft */ }
  }
  try {
    await cu.comment(env, taskId,
      `✅ ${klantNaam} keurde een bestand goed via het portaal.` +
      (allApproved ? `\nAlle opgeleverde bestanden van deze taak zijn goedgekeurd — status staat op Done.` : ''), true);
  } catch (e) { /* best-effort */ }

  return { status: 200, body: { ok: true, all_approved: allApproved, task_status: taskStatus } };
}

/* =============================================================================
 * FB_VARIANT — eigen TYPE JOB → bijhorende feedback-variant. Houdt de
 * feedbackronde-subtaak in het juiste discipline-spoor.
 * ============================================================================= */
export function FB_VARIANT(uuid) {
  // accepteer een kale TYPE-JOB-UUID-string of een task-object (→ typeJobUuid).
  const u = typeof uuid === 'string' ? uuid : typeJobUuid(uuid);
  switch (u) {
    case TJ.edit: return TJ.fbEdit;
    case TJ.branding: return TJ.fbBranding;
    case TJ.webdesign: return TJ.fbWebdesign;
    case TJ.preproductie: return TJ.fbPreproductie;
    // al een FB-variant? laat ongemoeid.
    case TJ.fbEdit: return TJ.fbEdit;
    case TJ.fbBranding: return TJ.fbBranding;
    case TJ.fbWebdesign: return TJ.fbWebdesign;
    case TJ.fbPreproductie: return TJ.fbPreproductie;
    // onbekende/ontbrekende type job → FB-Edit als veilige default.
    default: return TJ.fbEdit;
  }
}

/* Type-label per annotatie (Fase 2): wijziging/vraag/idee. Onbekend → Wijziging. */
const ANN_TYPE_LABELS = { wijziging: 'Wijziging', vraag: 'Vraag', idee: 'Idee' };
function annTypeKey(k) { const v = str(k).toLowerCase(); return ANN_TYPE_LABELS[v] ? v : 'wijziging'; }
function annTypeLabel(k) { return ANN_TYPE_LABELS[annTypeKey(k)]; }
function cleanPin(p) {
  if (!p || typeof p !== 'object') return null;
  const out = {};
  if (typeof p.page === 'number') out.page = p.page;
  if (typeof p.xNorm === 'number') out.xNorm = Math.round(p.xNorm * 1e4) / 1e4;
  if (typeof p.yNorm === 'number') out.yNorm = Math.round(p.yNorm * 1e4) / 1e4;
  if (typeof p.timestampSec === 'number') out.timestampSec = Math.round(p.timestampSec * 1000) / 1000;
  return (out.page != null || out.xNorm != null || out.timestampSec != null) ? out : null;
}
function cleanReplies(r) {
  if (!Array.isArray(r)) return [];
  return r.slice(0, 30).map((x) => ({ text: str(x && x.text).slice(0, 2000), createdAt: str(x && x.createdAt).slice(0, 40) || null }))
    .filter((x) => x.text);
}

/* =============================================================================
 * createFeedbackSubtask — feedbackronde als SUBTAAK onder de deliverable-taak.
 * TYPE JOB = FB-variant van de eigen type job, status 'startklaar',
 * FIELD.bedrijf-relatie, bundel-omschrijving + portaal-deeplink.
 * Geeft de subtaak-id terug (lege string bij falen — comment blijft de vangrail).
 * ============================================================================= */
export async function createFeedbackSubtask(env, { task, taskId, bedrijfId, titel, bundleTekst, klantNaam }) {
  const listId = str(task && task.list && task.list.id);
  if (!listId) return '';
  const fbUuid = FB_VARIANT(typeJobUuid(task));
  const rootId = str((task && task.top_level_parent) || (task && task.parent) || taskId);
  const portaalLink = `https://portaal.studio27.be/?p=${rootId}`;
  const subName = `FB - ${str(titel || 'oplevering').slice(0, 60)} - ${str(klantNaam || 'Klant')}`.slice(0, 120);
  let subId = '';
  try {
    // GEEN status in de create (zoals videoReviewSubmit): een onbekende status zou de hele
    // create 400'en. 'startklaar' zetten we apart + fail-soft hieronder (geldig op de Planning-lijsten).
    const sub = await cu.post(env, `/list/${listId}/task`, {
      name: subName,
      description: `🔗 Bekijk deze feedbackronde volledig in het klantenportaal:\n${portaalLink}\n\n` + str(bundleTekst),
      parent: taskId,
      notify_all: false,
      custom_fields: [
        { id: FIELD.bedrijf, value: { add: [String(bedrijfId)], rem: [] } },
        { id: FIELD.typeJob, value: fbUuid },
      ],
    });
    if (sub.ok && sub.data && sub.data.id) {
      subId = str(sub.data.id);
      // dropdown/relatie nazetten via het dedicated field-endpoint (create-persist-gotcha)
      await cu.post(env, `/task/${subId}/field/${FIELD.typeJob}`, { value: fbUuid }).catch(() => {});
      await cu.relation(env, subId, FIELD.bedrijf, { add: [String(bedrijfId)] }).catch(() => {});
      await cu.put(env, `/task/${subId}`, { status: 'startklaar' }).catch(() => {});   // fail-soft: status apart
    }
  } catch (e) { /* best-effort: comment hieronder blijft de vangrail */ }
  return subId;
}

/* =============================================================================
 * linkFeedback — klant geeft feedback op één deliverable-link.
 * → lr=feedback + FB-subtaak (FB-variant van de type job) + hoofdtaak naar
 *   'feedback klant'. Eén bundel naar KV + R2 + leesbare ClickUp-comment +
 *   bijlagen (zelfde verwerking als videoReviewSubmit).
 * ============================================================================= */
function fmtTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
}

export async function linkFeedback(bedrijfId, body, env) {
  const taskId = cleanId(body && body.task_id);
  const url = str(body && body.url);
  const g = await guardTask(env, bedrijfId, taskId);
  if (!g.ok) return g.res;
  if (!linkOnTask(g.task, url)) {
    return { status: 403, body: { ok: false, error: 'link_not_on_task', message: 'Dit bestand hoort niet bij deze taak.' } };
  }
  // afgeronde taak = geen nieuwe ronde (frontend toont naslag).
  if (isAfgerondStatus(g.task && g.task.status)) {
    return { status: 409, body: { ok: false, error: 'review_locked', message: 'Deze oplevering is al afgerond. Het team bezorgt je een nieuwe versie zodra die klaar is.' } };
  }

  const klantNaam = str(body && body.klant_naam) || 'Klant';
  const linkKey = linkKeyOf(url);
  const mediaType = mediaTypeOf(url, '');
  const summary = str(body && body.summary || body && body.comment).slice(0, 5000);
  const annotations = Array.isArray(body && body.annotations) ? body.annotations : [];
  const reviewAttachments = Array.isArray(body && body.attachments) ? body.attachments : [];
  if (!annotations.length && !summary.trim()) {
    return { status: 400, body: { ok: false, message: 'Geen feedback om te verzenden.' } };
  }
  for (const a of annotations) {
    if (!str(a && a.comment).trim()) return { status: 400, body: { ok: false, message: 'Een feedbackpunt mist een opmerking.' } };
  }
  const cleanAtt = (x) => ({
    attachmentId: cleanId(x && x.attachmentId), filename: str(x && x.filename).slice(0, 140),
    contentType: str(x && x.contentType).slice(0, 80), sizeBytes: Number(x && x.sizeBytes) || 0,
    key: str(x && x.key).slice(0, 300), uploadStatus: 'stored',
  });

  // rondenummer: 1 + het aantal eerder aangemaakte FB-subtaken (juiste variant) onder de taak.
  // ensureTjMap warmt de orderindex->UUID-fallback zodat typeJobUuid ook werkt als een subtaak
  // geen eigen type_config meedraagt (anders telt 'ie 0 en blijft de ronde altijd 1).
  await ensureTjMap(env);
  const fbUuid = FB_VARIANT(typeJobUuid(g.task));
  const fbRondes = ((g.task && g.task.subtasks) || []).filter((s) => typeJobUuid(s) === fbUuid).length;
  const ronde = fbRondes + 1;

  const bundle = {
    schemaVersion: '1.0',
    taskId,
    linkKey,
    mediaType,
    url,
    submittedAt: nowISO(),
    status: 'submitted',
    reviewer: { name: klantNaam, role: 'client' },
    ronde,
    summary: summary || null,
    annotations: annotations.map((a, i) => {
      const pin = cleanPin(a && a.pin);
      const hasPin = !!(pin && pin.xNorm != null);
      return {
        id: cleanId(a && a.id) || 'ann_' + i,
        sequenceNumber: i + 1,
        type: annTypeKey(a && a.type),
        pin,
        page: pin && typeof pin.page === 'number' ? pin.page : null,
        timestampSec: pin && typeof pin.timestampSec === 'number' ? pin.timestampSec : null,
        hasPin,
        xPct: hasPin ? Math.round(pin.xNorm * 1000) / 10 : null,
        yPct: hasPin ? Math.round(pin.yNorm * 1000) / 10 : null,
        comment: str(a && a.comment).slice(0, 5000),
        status: 'open',
        replies: cleanReplies(a && a.replies),
        attachments: (Array.isArray(a && a.attachments) ? a.attachments : []).filter((x) => x && x.uploadStatus === 'stored').map(cleanAtt),
      };
    }),
    reviewAttachments: reviewAttachments.filter((x) => x && x.uploadStatus === 'stored').map(cleanAtt),
  };
  const attCount = bundle.reviewAttachments.length + bundle.annotations.reduce((n, a) => n + a.attachments.length, 0);
  bundle.counts = { annotations: bundle.annotations.length, attachments: attCount };

  const jsonStr = JSON.stringify(bundle);
  if (env.R2) {
    try {
      await env.R2.put(`feedbackcore/${taskId}/bundles/${linkKey}-${Date.now()}.json`, jsonStr, { httpMetadata: { contentType: 'application/json' } });
    } catch (e) { /* archief is best-effort */ }
  }

  // — Leesbare bundel-tekst (komt in de FB-subtaak + verkorte comment) ----------
  const titel = str(body && body.titel || body && body.file_name) || 'oplevering';
  const lines = [];
  lines.push(`📝 Feedback van ${klantNaam} — "${titel}"`);
  lines.push(`${bundle.counts.annotations} feedbackpunt${bundle.counts.annotations === 1 ? '' : 'en'}${attCount ? ` · ${attCount} bijlage${attCount === 1 ? '' : 'n'}` : ''} · via het portaal`);
  lines.push('');
  for (const a of bundle.annotations) {
    const loc = a.page != null ? `pagina ${a.page}` : (a.timestampSec != null ? fmtTime(a.timestampSec) : (a.hasPin ? 'pin' : ''));
    lines.push(`#${a.sequenceNumber} · ${annTypeLabel(a.type)}${loc ? ` · ${loc}` : ''}`);
    lines.push(a.comment);
    for (const att of a.attachments) lines.push(`   📎 ${att.filename}`);
    for (const r of (a.replies || [])) lines.push(`   ↳ ${r.text}`);
    lines.push('');
  }
  if (bundle.summary) { lines.push(`💬 Algemene opmerking: ${bundle.summary}`); lines.push(''); }
  if (bundle.reviewAttachments.length) {
    lines.push(`📎 Bijlagen bij de review: ${bundle.reviewAttachments.map((x) => x.filename).join(', ')}`);
    lines.push('');
  }
  lines.push(`🔗 Bestand: ${url}`);
  const bundleTekst = lines.join('\n');

  // — Feedbackronde = SUBTAAK (FB-variant van de type job) ----------------------
  const subId = await createFeedbackSubtask(env, {
    task: g.task, taskId, bedrijfId, titel, bundleTekst, klantNaam,
  });

  // — Reactiestaat opslaan (met de FB-subtaak-referentie) -----------------------
  //   We bewaren een compacte annotatie-lijst in de KV-bundel zodat de klant na
  //   het indienen de feedback nog kan BEKIJKEN (read-only naslag). Bijlagen als
  //   {filename,key}; fileReviewContext her-ondertekent de key → tijdelijke URL.
  const naslagAnnotations = bundle.annotations.slice(0, 60).map((a) => ({
    comment: a.comment, type: a.type, pin: a.pin || null,
    replies: a.replies || [],
    attachments: a.attachments.map((x) => ({ filename: x.filename, key: x.key })),
  }));
  await lrSet(env, taskId, linkKey, {
    state: 'feedback', door: klantNaam, ronde, fb_task_id: subId || null,
    bundle: { submittedAt: bundle.submittedAt, summary: bundle.summary, counts: bundle.counts, annotations: naslagAnnotations },
  });

  // — Hoofdtaak naar 'feedback klant' (de review-status) ------------------------
  try { await cu.put(env, `/task/${taskId}`, { status: 'feedback klant' }); } catch (e) { /* comment blijft de drager */ }

  // — Korte comment op de hoofdtaak (notify → bestaande push-pipeline) ----------
  const cmTxt = subId
    ? `📝 Feedback van ${klantNaam} — "${titel}"\n${bundle.counts.annotations} feedbackpunt${bundle.counts.annotations === 1 ? '' : 'en'}${attCount ? ` · ${attCount} bijlage${attCount === 1 ? '' : 'n'}` : ''} · volledige ronde staat in de subtaak.`
    : bundleTekst;
  const cm = await cu.comment(env, taskId, cmTxt, true);

  // — Bijlagen als échte ClickUp-attachments op de FB-subtaak (fallback: taak) --
  const attTarget = subId || taskId;
  let attached = 0;
  if (env.R2) {
    const all = [...bundle.reviewAttachments, ...bundle.annotations.flatMap((a) => a.attachments)].slice(0, 8);
    for (const att of all) {
      try {
        const obj = await env.R2.get(att.key);
        if (!obj) continue;
        const bytes = new Uint8Array(await obj.arrayBuffer());
        const up = await cu.uploadAttachment(env, attTarget, bytes, att.filename);
        if (up.ok) attached++;
      } catch (e) { /* best-effort */ }
    }
    try {
      const up = await cu.uploadAttachment(env, attTarget, new TextEncoder().encode(jsonStr), `feedback-${linkKey}-${Date.now()}.json`);
      if (up.ok) attached++;
    } catch (e) { /* best-effort */ }
  }

  return {
    status: 200,
    body: {
      ok: true,
      fb_task_id: subId,
      ronde,
      counts: bundle.counts,
      comment_id: cm.ok && cm.data ? str(cm.data.id) : '',
      clickup_attachments: attached,
      submitted_at: bundle.submittedAt,
    },
  };
}

/* =============================================================================
 * Publieke GET-routes (HMAC-signed, expirerend)
 * -----------------------------------------------------------------------------
 *   /docstream    — Drive-bytes voor pdf/foto/pptx/office (Range-passthrough,
 *                   inline of ?dl=1 als download)
 *   /audiostream  — Drive-audio (Range-passthrough, inline player)
 *   /feedbackfile — R2-bijlage (inline beeld/pdf, anders download)
 * ============================================================================= */
// CORS voor de publieke stream-routes: pdf.js haalt de PDF cross-origin op
// (portaal.studio27.be → gateway-worker) en heeft expliciete CORS nodig; een
// <video>/<img>/<audio> niet, maar het is hier overal veilig (HMAC-token gate't).
function withCors(h) {
  h.set('access-control-allow-origin', '*');
  h.set('access-control-expose-headers', 'content-length, content-range, accept-ranges, content-disposition');
  return h;
}

// Binair Office-mimetype/extensie → het Google-native doeltype voor conversie.
// Apple iWork (.key/.pages/.numbers) is NIET converteerbaar → null (download-only).
function officeConvertTarget(mimeType, fileName) {
  const m = str(mimeType).toLowerCase();
  const ext = extOf(fileName);
  if (m.includes('iwork') || m.includes('keynote') || ['key', 'pages', 'numbers'].includes(ext)) return null;
  const isPres = m.includes('presentation') || m.includes('powerpoint') || ['ppt', 'pptx', 'odp'].includes(ext);
  const isSheet = m.includes('spreadsheet') || m.includes('excel') || ['xls', 'xlsx', 'csv', 'ods'].includes(ext);
  const isDoc = m.includes('word') || m.includes('msword') || m.includes('wordprocessing') ||
    m.includes('opendocument.text') || ['doc', 'docx', 'rtf', 'odt', 'txt'].includes(ext);
  if (isPres) return 'application/vnd.google-apps.presentation';
  if (isSheet) return 'application/vnd.google-apps.spreadsheet';
  if (isDoc) return 'application/vnd.google-apps.document';
  return null;
}

// Binair Office-bestand → PDF: kopie mét conversie naar Google-type → export PDF →
// R2-cache (per fileId+versie) → temp-kopie wissen. Geeft Uint8Array of null.
async function officeToPdf(env, fileId) {
  const token = await mintGoogleToken(env, str(env.GDRIVE_SUBJECT), DRIVE_SCOPE);
  const auth = { authorization: 'Bearer ' + token };
  let meta = {};
  try {
    const mr = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,mimeType,modifiedTime`, { headers: auth });
    if (mr.ok) meta = await mr.json();
  } catch (e) { /* meta best-effort */ }
  const ver = str(meta.modifiedTime).replace(/\D/g, '') || '0';
  const cacheKey = `feedbackcore/pdfcache/${fileId}/${ver}.pdf`;
  if (env.R2) {
    try { const hit = await env.R2.get(cacheKey); if (hit) return new Uint8Array(await hit.arrayBuffer()); } catch (e) { /* */ }
  }
  const target = officeConvertTarget(meta.mimeType, meta.name);
  if (!target) return null;
  let tmpId = '';
  try {
    const cp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/copy?supportsAllDrives=true&fields=id`, {
      method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'fbpdf-' + fileId, mimeType: target }),
    });
    if (!cp.ok) return null;
    const cpj = await cp.json().catch(() => ({}));
    tmpId = str(cpj.id);
    if (!tmpId) return null;
    const ex = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(tmpId)}/export?mimeType=application%2Fpdf&supportsAllDrives=true`, { headers: auth });
    if (!ex.ok) return null;
    const bytes = new Uint8Array(await ex.arrayBuffer());
    if (env.R2 && bytes.length) {
      try { await env.R2.put(cacheKey, bytes, { httpMetadata: { contentType: 'application/pdf' } }); } catch (e) { /* */ }
    }
    return bytes.length ? bytes : null;
  } catch (e) {
    return null;
  } finally {
    if (tmpId) { try { await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(tmpId)}?supportsAllDrives=true`, { method: 'DELETE', headers: auth }); } catch (e) { /* temp-cleanup best-effort */ } }
  }
}

async function streamDrive(request, env, prefix, opts = {}) {
  const u = new URL(request.url);
  const taskId = cleanId(u.searchParams.get('task'));
  const fileId = cleanId(u.searchParams.get('file'));
  const mode = str(u.searchParams.get('mode') || 'media');
  const exp = str(u.searchParams.get('exp'));
  const tok = str(u.searchParams.get('tok'));
  const download = !!u.searchParams.get('dl');
  if (!(await tokOk(env, `${prefix}|${taskId}|${fileId}|${mode}|${exp}`, tok, exp))) {
    return new Response('Link verlopen — herlaad het portaal.', { status: 403, headers: withCors(new Headers()) });
  }
  let token;
  try { token = await mintGoogleToken(env, str(env.GDRIVE_SUBJECT), DRIVE_SCOPE); }
  catch (e) { return new Response('Bestand niet beschikbaar', { status: 502, headers: withCors(new Headers()) }); }
  const auth = { authorization: 'Bearer ' + token };

  // --- Office/Google → PDF (export native of convert binair), altijd volledig (geen Range) ---
  if (mode === 'export' || mode === 'convert') {
    let bytes = null;
    try {
      if (mode === 'export') {
        const exUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=application%2Fpdf`;
        let ex = await fetch(exUrl + '&supportsAllDrives=true', { headers: auth });
        if (!ex.ok) ex = await fetch(exUrl, { headers: auth });   // fallback: sommige API-edges weigeren de param
        if (ex.ok) bytes = new Uint8Array(await ex.arrayBuffer());
      } else {
        bytes = await officeToPdf(env, fileId);
      }
    } catch (e) { bytes = null; }
    if (!bytes || !bytes.length) {
      return new Response('Voorvertoning niet beschikbaar — gebruik de download-knop.', { status: 502, headers: withCors(new Headers()) });
    }
    const h = withCors(new Headers());
    h.set('content-type', 'application/pdf');
    h.set('content-length', String(bytes.length));
    h.set('cache-control', 'private, max-age=0');
    h.set('x-content-type-options', 'nosniff');
    const fn = str(u.searchParams.get('name') || (opts.defaultName || 'document')).replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'document';
    h.set('content-disposition', download ? `attachment; filename="${fn}.pdf"` : 'inline');
    return new Response(bytes, { status: 200, headers: h });
  }

  // --- Ruwe bytes (pdf/foto/audio): Range-passthrough ---
  const headers = { ...auth };
  const range = request.headers.get('range');
  if (range && !download) headers.range = range;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, { headers });
  if (!(r.ok || r.status === 206)) {
    return new Response('Bestand niet beschikbaar (' + r.status + ')', { status: r.status === 404 ? 404 : 502, headers: withCors(new Headers()) });
  }
  const h = withCors(new Headers());
  for (const k of ['content-type', 'content-length', 'content-range']) {
    const v = r.headers.get(k);
    if (v) h.set(k, v);
  }
  if (opts.acceptRanges) h.set('accept-ranges', 'bytes');
  h.set('cache-control', 'private, max-age=0');
  h.set('x-content-type-options', 'nosniff');
  if (download) {
    const fn = str(u.searchParams.get('name') || (opts.defaultName || 'bestand')).replace(/[^\w.\- ]+/g, '_').slice(0, 120) || (opts.defaultName || 'bestand');
    h.set('content-disposition', `attachment; filename="${fn}"`);
  } else {
    h.set('content-disposition', 'inline');
  }
  return new Response(r.body, { status: r.status, headers: h });
}

export async function handleDocStream(request, env) {
  return streamDrive(request, env, 'ds', { acceptRanges: true, defaultName: 'document' });
}
export async function handleAudioStream(request, env) {
  return streamDrive(request, env, 'as', { acceptRanges: true, defaultName: 'audio' });
}

export async function handleFeedbackFile(request, env) {
  const u = new URL(request.url);
  const key = str(u.searchParams.get('key'));
  const exp = str(u.searchParams.get('exp'));
  const tok = str(u.searchParams.get('tok'));
  if (!key.startsWith('feedbackcore/') || key.includes('..')) return new Response('Ongeldige sleutel', { status: 400 });
  if (!(await tokOk(env, `ff|${key}|${exp}`, tok, exp))) {
    return new Response('Link verlopen — herlaad het portaal.', { status: 403 });
  }
  if (!env.R2) return new Response('Opslag niet beschikbaar', { status: 500 });
  const obj = await env.R2.get(key);
  if (!obj) return new Response('Niet gevonden', { status: 404 });
  const h = withCors(new Headers());
  obj.writeHttpMetadata(h);
  h.set('cache-control', 'private, max-age=3600');
  h.set('x-content-type-options', 'nosniff');
  const ct = h.get('content-type') || '';
  h.set('content-disposition', INLINE_TYPES.has(ct) ? 'inline' : 'attachment');
  return new Response(obj.body, { headers: h });
}
