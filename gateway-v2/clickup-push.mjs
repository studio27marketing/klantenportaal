/* =============================================================================
 * Studio 27 Klantenportaal - ClickUp-webhook -> Web Push (gateway-v2)
 * -----------------------------------------------------------------------------
 * VOLLEDIG Make-vrij: ClickUp post wijzigingen rechtstreeks naar de worker
 * (POST /clickup/hook). De worker verifieert de HMAC-SHA256-signature, herleidt
 * de taak -> bedrijf -> contact-e-mail(s) via de ClickUp REST-API, en stuurt een
 * web-push. PILOT: pushToEmailPilot() laat enkel vincent@studio27.be door.
 *
 * Signature: header X-Signature = HMAC-SHA256(rawBody, webhook-secret) in hex.
 * Webhook-secret = worker-secret CLICKUP_WEBHOOK_SECRET (gezet bij registratie).
 *
 * Events: taskStatusUpdated + taskCommentPosted (bij registratie zo gefilterd).
 * ============================================================================= */

import { pushToEmailPilot } from './push.mjs';

const PILOT_EMAIL = 'vincent@studio27.be';
const CU_BASE = 'https://api.clickup.com/api/v2';

// ClickUp custom-field UUID's (uit handlers.mjs).
const FIELD = {
  bedrijf: '4b1fb333-f47a-41bb-a976-dce63ed36657', // taak -> bedrijf (relatie)
  contact: '1bce8db8-717f-4e94-abdc-64feb241087c', // bedrijf -> contactpersonen (relatie)
  email:   'd453a72f-e08e-46bb-b82f-24c311fad13f', // contact-e-mail (text)
  portaalToegang: 'f0de5c6c-0eea-4809-8e40-145fc7359a3d', // CSV e-mails met portaaltoegang
};

const jsonRes = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...(headers || {}) } });
const str = (v) => String(v == null ? '' : v).trim();

/* ---- ClickUp-leeshelper (kale token, geen Bearer) ------------------------ */
async function cuGet(env, path) {
  try {
    const r = await fetch(CU_BASE + path, { headers: { Authorization: env.CLICKUP_TOKEN } });
    let data = null;
    try { data = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, data };
  } catch (e) { return { ok: false, status: 0, data: null }; }
}
function getCF(task, fieldId) {
  const f = ((task && task.custom_fields) || []).find((x) => x.id === fieldId);
  return f ? f.value : undefined;
}
function getRelationIds(task, fieldId) {
  const v = getCF(task, fieldId);
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? x : (x && (x.id || x.task_id)) || '')).filter(Boolean);
}
function csvEmails(v) {
  return str(v).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/* ---- HMAC-SHA256 signature-verificatie ----------------------------------- */
function hex(u8) { let s = ''; for (let i = 0; i < u8.length; i++) s += u8[i].toString(16).padStart(2, '0'); return s; }
function timingSafeHex(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function verifySignature(rawBody, sigHex, secret) {
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
    return timingSafeHex(hex(mac), String(sigHex || '').trim().toLowerCase());
  } catch (e) { return false; }
}

/* ---- taak -> bedrijf -> contact-e-mails ----------------------------------- */
export async function resolveEmailsForTask(env, task) {
  const bedrijfIds = getRelationIds(task, FIELD.bedrijf);
  if (!bedrijfIds.length) return [];
  const out = new Set();
  const br = await cuGet(env, '/task/' + bedrijfIds[0]);
  if (!br.ok || !br.data) return [];
  const bedrijf = br.data;
  csvEmails(getCF(bedrijf, FIELD.portaalToegang)).forEach((e) => out.add(e));
  const contactIds = getRelationIds(bedrijf, FIELD.contact);
  if (contactIds.length) {
    const rs = await Promise.all(contactIds.slice(0, 10).map((id) => cuGet(env, '/task/' + id)));
    rs.forEach((r) => { if (r.ok && r.data) { const e = str(getCF(r.data, FIELD.email)).toLowerCase(); if (e) out.add(e); } });
  }
  return [...out];
}

/* ---- bouw de melding + verstuur (pilot-gated) ----------------------------- */
function buildPayload(event, task) {
  const name = str(task && task.name) || 'je project';
  const tag = 's27-cu-' + str(task && task.id);
  if (event === 'taskStatusUpdated') {
    const stt = task && task.status && task.status.status ? str(task.status.status) : '';
    return { title: 'Update in ' + name, body: stt ? ('Nieuwe status: ' + stt) : 'De status is bijgewerkt.', url: '/', tag, icon: '/icons/icon-192.png' };
  }
  // taskCommentPosted
  return { title: 'Nieuw bericht', body: name + ' — er is een reactie geplaatst.', url: '/', tag, icon: '/icons/icon-192.png' };
}
async function processEvent(env, event, taskId) {
  const tr = await cuGet(env, '/task/' + taskId);
  if (!tr.ok || !tr.data) return;
  const task = tr.data;
  const emails = await resolveEmailsForTask(env, task);
  if (!emails.length) return;
  // PILOT: enkel doorgaan als de pilot-gebruiker bij de ontvangers zit (spaart werk).
  if (!emails.includes(PILOT_EMAIL)) return;
  const payload = buildPayload(event, task);
  for (const email of emails) { await pushToEmailPilot(env, email, payload); }
}

/* ---- webhook-endpoint (publiek, signature-geverifieerd) ------------------- */
export async function handleClickupHook(request, env, ctx, ch) {
  const raw = await request.text();
  // Nog niet geconfigureerd: 200 teruggeven zodat ClickUp de webhook niet uitschakelt (doet niets).
  if (!env.CLICKUP_WEBHOOK_SECRET) return jsonRes({ ok: true, note: 'webhook_secret_missing' }, 200, ch);
  const ok = await verifySignature(raw, request.headers.get('X-Signature') || '', env.CLICKUP_WEBHOOK_SECRET);
  if (!ok) return jsonRes({ ok: false, error: 'bad_signature' }, 401, ch);

  let evt = {};
  try { evt = JSON.parse(raw); } catch (e) { return jsonRes({ ok: true, note: 'bad_json' }, 200, ch); }
  const event = str(evt.event);
  const taskId = str(evt.task_id);

  // Idempotentie (ClickUp kan retryen): webhook_id:history_item_id, 1u TTL.
  const hiId = (evt.history_items && evt.history_items[0] && evt.history_items[0].id) || '';
  if (env.KV && evt.webhook_id && hiId) {
    const ik = 'push:cuhook:' + evt.webhook_id + ':' + hiId;
    try { if (await env.KV.get(ik)) return jsonRes({ ok: true, note: 'dup' }, 200, ch); ctx.waitUntil(env.KV.put(ik, '1', { expirationTtl: 3600 })); } catch (e) {}
  }

  if (event !== 'taskStatusUpdated' && event !== 'taskCommentPosted') return jsonRes({ ok: true, note: 'ignored_event' }, 200, ch);
  if (!taskId) return jsonRes({ ok: true, note: 'no_task' }, 200, ch);
  if (!env.CLICKUP_TOKEN || !env.VAPID_PRIVATE_JWK) return jsonRes({ ok: true, note: 'not_configured' }, 200, ch);

  // Snel 200 teruggeven; het echte werk async (ClickUp verwacht een snelle 2xx).
  ctx.waitUntil(processEvent(env, event, taskId).catch(() => {}));
  return jsonRes({ ok: true, queued: true }, 200, ch);
}
