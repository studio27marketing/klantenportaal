/* =============================================================================
 * VIDEO-REVIEW — frame-accurate klantfeedback op video's uit het Bestanden-veld.
 * -----------------------------------------------------------------------------
 * Klantflow: deliverable-link (Vimeo of Google Drive) in een projecttaak →
 * portaal opent de review-module → klant zet genummerde pins (x,y + tijdstip)
 * met comments + bijlagen → "Verzenden" → één bundel naar KV + R2-archief +
 * leesbare ClickUp-comment (notify) + bijlagen op de taak.
 *
 * Bewust een ZELFSTANDIGE module: importeert enkel stabiele exports uit
 * handlers.mjs (cu, scopeCheckTask, mintGoogleToken, DRIVE_SCOPE). De wiring
 * (handler-registratie + publieke GET-routes) gebeurt in worker.js.
 *
 * Endpoints (POST, Firebase-authed, bedrijf-scope via scopeCheckTask):
 *   videoReviewContext  { task_id, url }                  → video-meta + signed stream/download-URL
 *   videoReviewUpload   { task_id, filename, file_data }  → bijlage-bytes naar R2
 *   videoReviewSubmit   { task_id, video, annotations[], reviewAttachments[], summary, klant_naam }
 * Publieke GET-routes (HMAC-signed, expirerend — <video src>/<img src> kunnen geen headers sturen):
 *   /videostream?task=&file=&exp=&tok=[&dl=1]   → Drive-bytes met Range-passthrough
 *   /videofile?key=&exp=&tok=                   → R2-bijlage (inline beeld/pdf, anders download)
 * Secrets/bindings: GATEWAY_SECRET (HMAC), SA_* + GDRIVE_SUBJECT (Drive), R2 (bucket).
 * ============================================================================= */
import { cu, scopeCheckTask, mintGoogleToken, DRIVE_SCOPE, isAfgerondStatus } from './handlers.mjs';

const str = (v) => (v == null ? '' : String(v));
const cleanId = (v) => str(v).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
const nowISO = () => new Date().toISOString();

const STREAM_TTL_SEC = 6 * 3600;        // kijk/download-link geldig per portaalsessie
const FILE_TTL_SEC = 30 * 24 * 3600;    // bijlage-links (ook in ClickUp-comment) 30 dagen
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const EXT_ALLOW = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', pdf: 'application/pdf',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
  zip: 'application/zip',
};
const INLINE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']);

/* ---- URL-parsers (zelfde regels als de geteste POC) ---------------------- */
export function parseVimeoUrl(raw) {
  const s = str(raw).trim();
  if (!s) return null;
  let m = s.match(/player\.vimeo\.com\/video\/(\d+)(?:\?.*h=([a-zA-Z0-9]+))?/);
  if (m) return { id: m[1], hash: m[2] || null };
  m = s.match(/vimeo\.com\/(?:manage\/videos\/)?(\d+)(?:\/([a-zA-Z0-9]+))?/);
  if (m) return { id: m[1], hash: m[2] || null };
  return null;
}
export function parseDriveUrl(raw) {
  const s = str(raw).trim();
  if (!s) return null;
  let m = s.match(/drive\.google\.com\/file\/d\/([-\w]{20,})/);
  if (m) return { id: m[1] };
  m = s.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([-\w]{20,})/);
  if (m) return { id: m[1] };
  return null;
}

/* ---- HMAC-tokens (GATEWAY_SECRET): korte, expirerende GET-toegang -------- */
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

/* ---- Drive: meta + Range-stream via SA (DWD, zelfde patroon als handlers) - */
async function driveFileMeta(env, fileId) {
  const token = await mintGoogleToken(env, str(env.GDRIVE_SUBJECT), DRIVE_SCOPE);
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,mimeType,size,videoMediaMetadata`,
    { headers: { authorization: 'Bearer ' + token } }
  );
  if (!r.ok) return { ok: false, status: r.status };
  const d = await r.json().catch(() => ({}));
  const vm = d.videoMediaMetadata || {};
  return {
    ok: true,
    name: d.name || null,
    mimeType: d.mimeType || null,
    sizeBytes: d.size ? Number(d.size) : null,
    videoWidth: vm.width || null,
    videoHeight: vm.height || null,
    durationSec: vm.durationMillis ? Math.round(Number(vm.durationMillis)) / 1000 : null,
  };
}

const videoKey = (source, id) => (source === 'vimeo' ? 'v' : 'd') + str(id);
const kvKey = (taskId, vKey) => `vr:${taskId}:${vKey}`;

/* ---- scope-helper: taak ophalen + bedrijf-eigendom afdwingen (fail-closed) */
async function guardTask(env, bedrijfId, taskId) {
  if (!taskId) return { ok: false, res: { status: 400, body: { ok: false, error: 'missing_task' } } };
  const tr = await cu.get(env, `/task/${taskId}`);
  const task = tr.ok && tr.data ? tr.data : { custom_fields: [] };
  const sc = scopeCheckTask(task, bedrijfId, true);
  if (!sc.ok) return { ok: false, res: { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot deze taak.' } } };
  return { ok: true, task };
}

/* =============================================================================
 * videoReviewContext — herken de video, geef speel/stream-info + review-status
 * ============================================================================= */
export async function videoReviewContext(bedrijfId, body, env) {
  const taskId = cleanId(body && body.task_id);
  const url = str(body && body.url);
  const g = await guardTask(env, bedrijfId, taskId);
  if (!g.ok) return g.res;

  const vimeo = parseVimeoUrl(url);
  const drive = vimeo ? null : parseDriveUrl(url);
  if (!vimeo && !drive) {
    return { status: 200, body: { ok: false, error: 'not_video', open_url: url } };
  }

  let video, streamUrl = null, downloadUrl = null;
  if (vimeo) {
    const canonical = vimeo.hash ? `https://vimeo.com/${vimeo.id}/${vimeo.hash}` : `https://vimeo.com/${vimeo.id}`;
    let meta = {};
    try {
      const oe = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(canonical)}`, { signal: AbortSignal.timeout(5000) });
      if (oe.ok) { const d = await oe.json(); meta = { title: d.title || null, durationSec: d.duration || null, videoWidth: d.width || null, videoHeight: d.height || null }; }
    } catch (e) { /* speler haalt titel/duur zelf ook op */ }
    video = { source: 'vimeo', externalId: vimeo.id, hash: vimeo.hash, url: canonical, ...meta };
  } else {
    let meta;
    try { meta = await driveFileMeta(env, drive.id); } catch (e) { meta = { ok: false, status: 0 }; }
    if (!meta.ok) {
      return { status: 200, body: { ok: false, error: 'drive_no_access', open_url: url, message: 'Het portaal kan dit Drive-bestand niet lezen. Zet het op de gedeelde S27-Drive of deel het met portal-admin@studio27-cloud.iam.gserviceaccount.com.' } };
    }
    if (!/^video\//.test(str(meta.mimeType))) {
      return { status: 200, body: { ok: false, error: 'not_video', open_url: url } };
    }
    video = {
      source: 'drive', externalId: drive.id, url: `https://drive.google.com/file/d/${drive.id}/view`,
      title: meta.name, durationSec: meta.durationSec, videoWidth: meta.videoWidth,
      videoHeight: meta.videoHeight, mimeType: meta.mimeType, sizeBytes: meta.sizeBytes,
    };
    const exp = Math.floor(Date.now() / 1000) + STREAM_TTL_SEC;
    const tok = await signTok(env, `vs|${taskId}|${drive.id}|${exp}`);
    const q = `task=${encodeURIComponent(taskId)}&file=${encodeURIComponent(drive.id)}&exp=${exp}&tok=${tok}`;
    streamUrl = `/videostream?${q}`;
    downloadUrl = `/videostream?${q}&dl=1`;
  }

  let last = null;
  try { last = await env.KV.get(kvKey(taskId, videoKey(video.source, video.externalId)), 'json'); } catch (e) { /* leeg */ }

  // FEEDBACK-LOCK (dakstructuur Q, slice 3): eenmaal definitief doorgestuurd = read-only naslag.
  // Locked zodra (a) er voor deze video al een bundel verzonden is, of (b) de taak voorbij de
  // reviewfase is (goedgekeurd/afgerond). Een nieuwe montageversie = nieuwe link = nieuwe key = open.
  const isLocked = !!last || isAfgerondStatus(g.task && g.task.status);

  // naslag-bundel voor de read-only weergave: punten + comments + bijlagen met VERSE signed urls
  let lastBundle = null;
  if (last) {
    const att = async (a) => ({ filename: str(a.filename), url: a.key ? await signedFileUrl(env, a.key) : '' });
    const anns = [];
    for (const a of (Array.isArray(last.annotations) ? last.annotations : [])) {
      anns.push({
        sequenceNumber: a.sequenceNumber, timestampSec: a.timestampSec, hasPin: !!a.hasPin,
        xPct: a.xPct, yPct: a.yPct, comment: str(a.comment),
        attachments: await Promise.all((Array.isArray(a.attachments) ? a.attachments : []).map(att)),
      });
    }
    lastBundle = {
      submittedAt: last.submittedAt || null,
      summary: last.summary || null,
      annotations: anns,
      reviewAttachments: await Promise.all((Array.isArray(last.reviewAttachments) ? last.reviewAttachments : []).map(att)),
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      task_name: str((g.task && g.task.name) || ''),
      video,
      stream_url: streamUrl,
      download_url: downloadUrl,
      is_read_only: isLocked,
      last_bundle: lastBundle,
      last_submitted_at: last && last.submittedAt ? last.submittedAt : null,
      last_counts: last && last.counts ? last.counts : null,
    },
  };
}

/* =============================================================================
 * videoReviewUpload — bijlage (base64) naar R2, signed GET-URL terug
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
  const tok = await signTok(env, `vf|${key}|${exp}`);
  return `/videofile?key=${encodeURIComponent(key)}&exp=${exp}&tok=${tok}`;
}

export async function videoReviewUpload(bedrijfId, body, env) {
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
  const key = `videoreview/${taskId}/${attachmentId}/${safeName}`;
  await env.R2.put(key, bytes, {
    httpMetadata: { contentType },
    customMetadata: { taskId, bedrijfId: str(bedrijfId), scope: str(body && body.scope) || 'annotation' },
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
      fileUrl: await signedFileUrl(env, key),
      uploadStatus: 'stored',
      uploadedAt: nowISO(),
    },
  };
}

/* =============================================================================
 * videoReviewSubmit — bundel valideren, bewaren en leesbaar naar ClickUp
 * ============================================================================= */
function fmtTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
}

export async function videoReviewSubmit(bedrijfId, body, env) {
  const taskId = cleanId(body && body.task_id);
  const g = await guardTask(env, bedrijfId, taskId);
  if (!g.ok) return g.res;

  const vIn = (body && body.video) || {};
  const source = vIn.source === 'drive' ? 'drive' : 'vimeo';
  const externalId = cleanId(vIn.externalId);
  if (!externalId) return { status: 400, body: { ok: false, message: 'Video-referentie ontbreekt.' } };

  // FEEDBACK-LOCK server-side: na definitieve verzending (of goedgekeurde taak) geen nieuwe ronde
  // op dezelfde video — de frontend toont dan de naslag-modus. Nieuwe versie = nieuwe video-key.
  try {
    const existing = await env.KV.get(kvKey(taskId, videoKey(source, externalId)), 'json');
    if (existing || isAfgerondStatus(g.task && g.task.status)) {
      return { status: 409, body: { ok: false, error: 'review_locked', message: 'Je feedback op deze versie is al definitief doorgestuurd. Het team bezorgt je een nieuwe versie zodra die klaar is.' } };
    }
  } catch (e) { /* KV-storing: niet blokkeren */ }

  const annotations = Array.isArray(body && body.annotations) ? body.annotations : [];
  const reviewAttachments = Array.isArray(body && body.reviewAttachments) ? body.reviewAttachments : [];
  if (!annotations.length && !str(body && body.summary).trim()) {
    return { status: 400, body: { ok: false, message: 'Geen feedback om te verzenden.' } };
  }
  for (const a of annotations) {
    if (typeof a.timestampSec !== 'number' || a.timestampSec < 0) return { status: 400, body: { ok: false, message: 'Feedbackpunt zonder geldig tijdstip.' } };
    if (!str(a.comment).trim()) return { status: 400, body: { ok: false, message: 'Een feedbackpunt mist een opmerking.' } };
    if (a.hasPin) {
      for (const v of [a.xPct, a.yPct]) {
        if (typeof v !== 'number' || v < 0 || v > 100) return { status: 400, body: { ok: false, message: 'Feedbackpunt met ongeldige positie.' } };
      }
    }
  }
  const cleanAtt = (x) => ({
    attachmentId: cleanId(x && x.attachmentId), filename: str(x && x.filename).slice(0, 140),
    contentType: str(x && x.contentType).slice(0, 80), sizeBytes: Number(x && x.sizeBytes) || 0,
    key: str(x && x.key).slice(0, 300), uploadStatus: 'stored',
  });

  const klantNaam = str(body && body.klant_naam) || 'Klant';
  const vKey = videoKey(source, externalId);
  const bundle = {
    schemaVersion: '1.1',
    taskId,
    submittedAt: nowISO(),
    status: 'submitted',
    video: {
      source, externalId, url: str(vIn.url), title: str(vIn.title) || null,
      durationSec: Number(vIn.durationSec) || null,
      videoWidth: Number(vIn.videoWidth) || null, videoHeight: Number(vIn.videoHeight) || null,
    },
    reviewer: { name: str(body && body.reviewer && body.reviewer.name).slice(0, 120) || klantNaam, email: str(body && body.reviewer && body.reviewer.email).slice(0, 200) || null, role: 'client' },
    summary: str(body && body.summary).slice(0, 5000) || null,
    annotations: annotations
      .slice()
      .sort((x, y) => x.timestampSec - y.timestampSec)
      .map((a, i) => ({
        id: cleanId(a.id) || 'ann_' + i,
        sequenceNumber: i + 1,
        timestampSec: Math.round(a.timestampSec * 1000) / 1000,
        hasPin: !!a.hasPin,
        xPct: a.hasPin ? Math.round(a.xPct * 10) / 10 : null,
        yPct: a.hasPin ? Math.round(a.yPct * 10) / 10 : null,
        comment: str(a.comment).slice(0, 5000),
        status: 'open',
        attachments: (Array.isArray(a.attachments) ? a.attachments : []).filter((x) => x && x.uploadStatus === 'stored').map(cleanAtt),
      })),
    reviewAttachments: reviewAttachments.filter((x) => x && x.uploadStatus === 'stored').map(cleanAtt),
  };
  const attCount = bundle.reviewAttachments.length + bundle.annotations.reduce((n, a) => n + a.attachments.length, 0);
  bundle.counts = { annotations: bundle.annotations.length, attachments: attCount };

  const jsonStr = JSON.stringify(bundle);
  try { await env.KV.put(kvKey(taskId, vKey), jsonStr); } catch (e) { /* comment is de primaire drager */ }
  if (env.R2) {
    try {
      await env.R2.put(`videoreview/${taskId}/bundles/${Date.now()}.json`, jsonStr, { httpMetadata: { contentType: 'application/json' } });
    } catch (e) { /* archief is best-effort */ }
  }

  // — Leesbare ClickUp-comment (notify) — dit is wat het team ziet/gebruikt
  const lines = [];
  lines.push(`🎬 Video-feedback van ${klantNaam}${bundle.video.title ? ` — "${bundle.video.title}"` : ''}`);
  lines.push(`${bundle.counts.annotations} feedbackpunt${bundle.counts.annotations === 1 ? '' : 'en'}${attCount ? ` · ${attCount} bijlage${attCount === 1 ? '' : 'n'}` : ''} · via het portaal`);
  lines.push('');
  for (const a of bundle.annotations) {
    lines.push(`#${a.sequenceNumber} · ${fmtTime(a.timestampSec)}${a.hasPin ? ` · positie ${a.xPct}%, ${a.yPct}%` : ''}`);
    lines.push(a.comment);
    for (const att of a.attachments) {
      lines.push(`   📎 ${att.filename}`);
    }
    lines.push('');
  }
  if (bundle.summary) {
    lines.push(`💬 Algemene opmerking: ${bundle.summary}`);
    lines.push('');
  }
  if (bundle.reviewAttachments.length) {
    lines.push(`📎 Bijlagen bij de review: ${bundle.reviewAttachments.map((x) => x.filename).join(', ')}`);
    lines.push('');
  }
  lines.push(`🔗 Video: ${bundle.video.url}`);
  const cm = await cu.comment(env, taskId, lines.join('\n'), true);

  // — Bijlagen ook als échte ClickUp-attachments op de taak (blijvend, geen expiry)
  let attached = 0;
  if (env.R2) {
    const all = [...bundle.reviewAttachments, ...bundle.annotations.flatMap((a) => a.attachments)].slice(0, 8);
    for (const att of all) {
      try {
        const obj = await env.R2.get(att.key);
        if (!obj) continue;
        const bytes = new Uint8Array(await obj.arrayBuffer());
        const up = await cu.uploadAttachment(env, taskId, bytes, att.filename);
        if (up.ok) attached++;
      } catch (e) { /* best-effort */ }
    }
    try {
      const up = await cu.uploadAttachment(env, taskId, new TextEncoder().encode(jsonStr), `video-feedback-${Date.now()}.json`);
      if (up.ok) attached++;
    } catch (e) { /* best-effort */ }
  }

  return {
    status: 200,
    body: { ok: true, counts: bundle.counts, comment_id: cm.ok && cm.data ? str(cm.data.id) : '', clickup_attachments: attached, submitted_at: bundle.submittedAt },
  };
}

/* =============================================================================
 * Publieke GET-routes (HMAC-signed, expirerend)
 * ============================================================================= */
export async function handleVideoStream(request, env) {
  const u = new URL(request.url);
  const taskId = cleanId(u.searchParams.get('task'));
  const fileId = cleanId(u.searchParams.get('file'));
  const exp = str(u.searchParams.get('exp'));
  const tok = str(u.searchParams.get('tok'));
  const download = !!u.searchParams.get('dl');
  if (!(await tokOk(env, `vs|${taskId}|${fileId}|${exp}`, tok, exp))) {
    return new Response('Link verlopen — herlaad het portaal.', { status: 403 });
  }
  let token;
  try { token = await mintGoogleToken(env, str(env.GDRIVE_SUBJECT), DRIVE_SCOPE); }
  catch (e) { return new Response('Video niet beschikbaar', { status: 502 }); }

  const headers = { authorization: 'Bearer ' + token };
  const range = request.headers.get('range');
  if (range && !download) headers.range = range;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, { headers });
  if (!(r.ok || r.status === 206)) {
    return new Response('Video niet beschikbaar (' + r.status + ')', { status: r.status === 404 ? 404 : 502 });
  }
  const h = new Headers();
  for (const k of ['content-type', 'content-length', 'content-range']) {
    const v = r.headers.get(k);
    if (v) h.set(k, v);
  }
  h.set('accept-ranges', 'bytes');
  h.set('cache-control', 'private, max-age=0');
  h.set('x-content-type-options', 'nosniff');
  if (download) {
    const fn = str(u.searchParams.get('name') || 'video.mp4').replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'video.mp4';
    h.set('content-disposition', `attachment; filename="${fn}"`);
  }
  return new Response(r.body, { status: r.status, headers: h });
}

export async function handleVideoFile(request, env) {
  const u = new URL(request.url);
  const key = str(u.searchParams.get('key'));
  const exp = str(u.searchParams.get('exp'));
  const tok = str(u.searchParams.get('tok'));
  if (!key.startsWith('videoreview/') || key.includes('..')) return new Response('Ongeldige sleutel', { status: 400 });
  if (!(await tokOk(env, `vf|${key}|${exp}`, tok, exp))) {
    return new Response('Link verlopen — herlaad het portaal.', { status: 403 });
  }
  if (!env.R2) return new Response('Opslag niet beschikbaar', { status: 500 });
  const obj = await env.R2.get(key);
  if (!obj) return new Response('Niet gevonden', { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('cache-control', 'private, max-age=3600');
  h.set('x-content-type-options', 'nosniff');
  const ct = h.get('content-type') || '';
  h.set('content-disposition', INLINE_TYPES.has(ct) ? 'inline' : 'attachment');
  return new Response(obj.body, { headers: h });
}
