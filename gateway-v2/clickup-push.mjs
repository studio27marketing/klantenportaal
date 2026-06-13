/* =============================================================================
 * Studio 27 Klantenportaal - ClickUp-webhook -> Web Push (gateway-v2)
 * -----------------------------------------------------------------------------
 * VOLLEDIG Make-vrij: ClickUp post wijzigingen rechtstreeks naar de worker
 * (POST /clickup/hook). De worker verifieert de HMAC-SHA256-signature, herleidt
 * de taak -> bedrijf -> contacten via de ClickUp REST-API, en stuurt de melding via
 * de gedeelde dispatcher (notify.mjs) over de kanalen die de contact koos (push/e-mail/
 * WhatsApp) — met een DEEP-LINK rechtstreeks naar het project of de chat. PILOT (notify.mjs):
 * enkel Vincent + Studio 27.
 *
 * Signature: header X-Signature = HMAC-SHA256(rawBody, webhook-secret) in hex.
 * Webhook-secret = worker-secret CLICKUP_WEBHOOK_SECRET (gezet bij registratie).
 *
 * Events: taskStatusUpdated + taskCommentPosted (bij registratie zo gefilterd).
 * ============================================================================= */

import { kanalenRead } from './handlers.mjs';
import { notifyContacts, portalLink } from './notify.mjs';

const CU_BASE = 'https://api.clickup.com/api/v2';

// ClickUp custom-field UUID's (uit handlers.mjs).
const FIELD = {
  bedrijf: '4b1fb333-f47a-41bb-a976-dce63ed36657', // taak -> bedrijf (relatie)
  contact: '1bce8db8-717f-4e94-abdc-64feb241087c', // bedrijf -> contactpersonen (relatie)
  email:   'd453a72f-e08e-46bb-b82f-24c311fad13f', // contact-e-mail (text)
  gsm:     '8cee9669-26f3-4380-b592-175c1c481c7c', // contact-GSM (text, voor WhatsApp)
  notifKanalen: '1f10ca20-50b2-472a-80d5-4e7ddcdfc3d2', // labels 'Notificatie-kanalen'
  portaalToegang: 'f0de5c6c-0eea-4809-8e40-145fc7359a3d', // CSV e-mails met portaaltoegang
};

const jsonRes = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...(headers || {}) } });
const str = (v) => String(v == null ? '' : v).trim();
const normStatus = (s) => String(s == null ? '' : s).trim().toLowerCase();

// Statussen die een klantmelding triggeren (genormaliseerd lowercase). Geldt voor
// gewone taken én social-media-taken; matcht de NIEUWE status na een taskStatusUpdated.
const NOTIFY_STATUSES = ['doorgestuurd', 'input gevraagd', 'feedback verwerkt', 'on hold'];
const STATUS_COPY = {
  'doorgestuurd':      { title: 'Klaar voor jou', body: (n) => '“' + n + '” staat klaar in je portaal.' },
  'input gevraagd':    { title: 'We hebben je input nodig', body: (n) => 'Voor “' + n + '” hebben we iets van jou nodig.' },
  'feedback verwerkt': { title: 'Feedback verwerkt', body: (n) => 'Je feedback op “' + n + '” is verwerkt.' },
  'on hold':           { title: 'Even on hold', body: (n) => '“' + n + '” staat tijdelijk on hold.' },
};

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

/* ---- taak -> bedrijf -> contacten (e-mail + GSM + gekozen kanalen) --------- */
export async function resolveContactsForTask(env, task) {
  const bedrijfIds = getRelationIds(task, FIELD.bedrijf);
  if (!bedrijfIds.length) return { bedrijfId: '', contacts: [] };
  const bedrijfId = bedrijfIds[0];
  const br = await cuGet(env, '/task/' + bedrijfId);
  if (!br.ok || !br.data) return { bedrijfId, contacts: [] };
  const bedrijf = br.data;
  const byEmail = new Map();
  // login-CSV e-mails (geen contactfiche -> geen kanaal-voorkeur/GSM): default push-kanaal
  csvEmails(getCF(bedrijf, FIELD.portaalToegang)).forEach((e) => { if (e && !byEmail.has(e)) byEmail.set(e, { email: e, gsm: '', kanalen: [] }); });
  const contactIds = getRelationIds(bedrijf, FIELD.contact);
  if (contactIds.length) {
    const rs = await Promise.all(contactIds.slice(0, 10).map((id) => cuGet(env, '/task/' + id)));
    rs.forEach((r) => {
      if (!(r.ok && r.data)) return;
      const e = str(getCF(r.data, FIELD.email)).toLowerCase();
      if (!e) return;
      byEmail.set(e, { email: e, gsm: str(getCF(r.data, FIELD.gsm)), kanalen: kanalenRead(getCF(r.data, FIELD.notifKanalen)) });
    });
  }
  return { bedrijfId, contacts: [...byEmail.values()] };
}

/* ---- bouw de melding (mét deep-link naar de juiste plek) ------------------- */
function buildPayload(event, task) {
  const name = str(task && task.name) || 'je project';
  const tag = 's27-cu-' + str(task && task.id);
  // De klant ziet het PROJECT (top-level taak); een subtaak-update linkt naar dat project.
  const rootId = str(task && task.top_level_parent) || str(task && task.parent) || str(task && task.id);
  if (event === 'taskStatusUpdated') {
    const st = normStatus(task && task.status && task.status.status);
    const c = STATUS_COPY[st];
    return { title: c ? c.title : 'Update', body: c ? c.body(name) : ('“' + name + '”: ' + (st || 'status bijgewerkt')), url: portalLink(rootId), tag, icon: '/icons/icon-192.png' };
  }
  // taskCommentPosted -> rechtstreeks naar de chat van het project
  return { title: 'Nieuw bericht', body: name + ' — er is een reactie geplaatst.', url: portalLink(rootId, { chat: true }), tag, icon: '/icons/icon-192.png' };
}
async function processEvent(env, event, taskId) {
  const tr = await cuGet(env, '/task/' + taskId);
  if (!tr.ok || !tr.data) return;
  const task = tr.data;
  // Statuswijziging: enkel melden bij een notify-waardige NIEUWE status (goedkope check vóór resolutie).
  if (event === 'taskStatusUpdated' && !NOTIFY_STATUSES.includes(normStatus(task.status && task.status.status))) return;
  const { bedrijfId, contacts } = await resolveContactsForTask(env, task);
  if (!contacts.length) return;
  // Verzenden via de gedeelde dispatcher: per contact via z'n gekozen kanalen (push/e-mail/WhatsApp),
  // PILOT-gated op Vincent + Studio 27 (in notify.mjs). Geen koppeling -> contact wordt overgeslagen.
  const payload = buildPayload(event, task);
  await notifyContacts(env, contacts, payload, bedrijfId, ['push']);
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

  // Echo-filter: comments die de WORKER zelf plaatst (klant-chatberichten '💬 [', ticket-briefings,
  // interne notities) horen GEEN push naar de klant te geven — enkel échte team-reacties.
  // Robuustst: alles gepost via het CLICKUP_TOKEN (bot-user 6022087) is per definitie geen team-reactie.
  if (event === 'taskCommentPosted') {
    const cm = (evt.history_items && evt.history_items[0] && evt.history_items[0].comment) || null;
    const tekst = str(cm && cm.comment_text || (cm && Array.isArray(cm.comment) ? cm.comment.map((c) => str(c.text)).join('') : ''));
    const authorId = str(cm && cm.user && cm.user.id);
    if (authorId === '6022087') return jsonRes({ ok: true, note: 'own_bot_comment' }, 200, ch);
    if (tekst.startsWith('💬 [') || tekst.slice(0, 8) === '[INTERN]') return jsonRes({ ok: true, note: 'client_or_internal' }, 200, ch);
  }

  // Snel 200 teruggeven; het echte werk async (ClickUp verwacht een snelle 2xx).
  ctx.waitUntil(processEvent(env, event, taskId).catch(() => {}));
  return jsonRes({ ok: true, queued: true }, 200, ch);
}
