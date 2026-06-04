/* =============================================================================
 * Studio 27 Klantenportaal — Gateway V2 — ClickUp-client + handlers
 * -----------------------------------------------------------------------------
 * Pure-ClickUp REST v2 herbouw van de v2-PORTAL Make-scenario's. Geen Firebase
 * hierin: elke handler krijgt (bedrijfId, body, env) en is daarmee TESTBAAR met
 * een node-harness zonder de gateway-shell (zie _v2test.mjs).
 *
 * Universele port-regels (uit consolidated.json):
 *   1. ClickUp-auth = header Authorization: env.CLICKUP_TOKEN  (KALE token, GEEN "Bearer").
 *   2. Bouw output met JS-objecten + 1x JSON.stringify (de gateway-shell stringify't).
 *      NIET Make's handmatige \/\"-escaping nabootsen (zou dubbel escapen).
 *   3. reads fail-OPEN, writes fail-CLOSED (403 scope_mismatch bij count==0) — via SCOPE_FAIL_CLOSED.
 *   4. Handlers zetten GEEN eigen CORS-header; ze geven {status, body} terug en de shell
 *      levert de origin-allowlist-CORS.
 *   5. Nooit 5xx waar Make 200+lege-data gaf (reads). Token NOOIT in een respons-body.
 *
 * Handler-contract: async (bedrijfId, body, env, ctx?) => { status:Number, body:Object }
 *   - ctx is optioneel (KV-cache via ctx.waitUntil); ontbreekt in de node-harness.
 * ============================================================================= */

/* ---- ClickUp veld-/lijst-constanten -------------------------------------- */
export const CU_BASE = 'https://api.clickup.com/api/v2';
export const TEAM_ID = '24419872';

export const LIST = {
  bedrijven:       '901520180288',
  contactpersonen: '901520180286',
  offertes:        '901520180289',
  meetings:        '901520180293',
  portaalInbox:    '901520180314',
};

export const FIELD = {
  bedrijf:        '4b1fb333-f47a-41bb-a976-dce63ed36657', // relatie 'Bedrijf' (scope-guard)
  contact:        '1bce8db8-717f-4e94-abdc-64feb241087c', // relatie 'Contactpersonen' op bedrijf-taak
  offertes:       'eb145449-a8bd-4865-a931-23eed06a9df4', // relatie 'Offertes' op bedrijf-taak
  modules:        'b8effbfe-c4d6-42fb-b8ac-bc7d48a71734', // labels 'Actieve portaal-modules'
  typeJob:        '3e76c134-a270-483c-a82a-d9a6817f375d', // dropdown TYPE JOB
  // contact-velden
  voornaam:       '626a0441-8824-4381-a89a-4639ac547e23',
  achternaam:     '79cbda71-626b-424c-8f78-d0785c52126a',
  gsm:            '8cee9669-26f3-4380-b592-175c1c481c7c',
  email:          'd453a72f-e08e-46bb-b82f-24c311fad13f',
  voorkeur:       'ad6f0803-857b-451c-96cb-fdd15b70cc5b', // dropdown voorkeur
  // bedrijf-velden
  btw:            '034f4443-5b50-4176-8c91-0b6d60e5870e', // Ondernemingsnummer / BTW
  facturatieEmail:'9613b4aa-2285-485b-80a6-d1d34a96884c',
  facturatieOpm:  '36d11828-4199-4373-81db-e72f960cf902',
  website:        '90b63173-378a-4fa8-bae8-1a513eea4eca',
  aantalMedewerkers:'e72680d9-9706-40b8-9e67-564bc21855d7',
  portaalToegang: 'f0de5c6c-0eea-4809-8e40-145fc7359a3d', // tekst-CSV e-mails met portaaltoegang
  // projectDetail-velden
  deliverablesRaw:'b071307b-84c4-4372-9d7e-783e999c618f',
  feedbackLink:   'f2610454-1961-42cf-9ba3-c7371b81353d',
  budget:         'c8d2dd2c-2428-4236-ba37-a3f3cd90c9ec',
  contentCreators:'dbe74db2-1083-4f2a-886f-0425718ae136',
  shootlink:      'c6a7da95-80b4-45c7-8004-227e01c421d4',
  // offerte-velden
  offerteLink:    '36264fc2-f348-4e14-b81c-063045ce1264',
  offerteBudget:  'c8d2dd2c-2428-4236-ba37-a3f3cd90c9ec',
  offerteVervaldatum:'317437a7-2508-453f-a7b9-faf040c541a9',
  // project-facturatie
  factuurNote:    '42a0fd8e-5e24-4018-a698-5f76f87e6449',
};

// S27 Make-bot user-id: attachments van deze user gelden als 'studio27'.
const S27_BOT_USER_ID = '6022087';

// directMessage: ontvanger -> ClickUp user-id + naam + voornaamwoord.
const DM_ONTVANGERS = {
  vincent: { id: '8714037',  naam: 'Vincent', pron: 'zijn' },
  arne:    { id: '54513254', naam: 'Arne',    pron: 'zijn' },
  // default (incl. 'ilke' en leeg):
  _default:{ id: '48338421', naam: 'Ilke',    pron: 'haar' },
};

/* ---- Beslissings-flag: fail-open (reads) vs fail-closed (writes) ---------- */
// 1:1 met Make = FAIL-OPEN (count==0 => toestaan). Voor writes zetten we fail-closed
// (de VERPLICHTE BESLISSING). Eén plek zodat de gaps-keuze centraal staat.
export const SCOPE_FAIL_CLOSED = { read: false, write: true };

/* =============================================================================
   ClickUp-client (cu) — kale token, gestructureerde fouten i.p.v. throw
   ============================================================================= */
function cuHeaders(env) {
  return { Authorization: env.CLICKUP_TOKEN };
}

// Eén fetch met 429-retry-once (Retry-After/backoff). Gooit NOOIT op non-2xx.
async function cuFetch(url, init, env, _retried) {
  let r;
  try {
    r = await fetch(url, init);
  } catch (e) {
    return { ok: false, status: 0, error: 'network', data: null };
  }
  if (r.status === 429 && !_retried) {
    const ra = parseInt(r.headers.get('Retry-After') || '', 10);
    const waitMs = Number.isFinite(ra) ? Math.min(ra * 1000, 5000) : 1000;
    await sleep(waitMs);
    return cuFetch(url, init, env, true);
  }
  let data = null;
  const text = await r.text().catch(() => '');
  if (text) { try { data = JSON.parse(text); } catch (e) { data = { _raw: text }; } }
  return { ok: r.ok, status: r.status, data };
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export const cu = {
  get: (env, path) =>
    cuFetch(CU_BASE + path, { method: 'GET', headers: cuHeaders(env) }, env),
  post: (env, path, jsonBody) =>
    cuFetch(CU_BASE + path, {
      method: 'POST',
      headers: { ...cuHeaders(env), 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonBody || {}),
    }, env),
  put: (env, path, jsonBody) =>
    cuFetch(CU_BASE + path, {
      method: 'PUT',
      headers: { ...cuHeaders(env), 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonBody || {}),
    }, env),
  // POST /task/{id}/field/{fieldId} — generiek custom-field-zetten.
  field: (env, taskId, fieldId, value) =>
    cu.post(env, `/task/${taskId}/field/${fieldId}`, { value }),
  // relatie add/rem op een task-relatieveld
  relation: (env, taskId, fieldId, { add = [], rem = [] }) =>
    cu.post(env, `/task/${taskId}/field/${fieldId}`, { value: { add, rem } }),
  comment: (env, taskId, text, notifyAll = true) =>
    cu.post(env, `/task/${taskId}/comment`, { comment_text: text, notify_all: !!notifyAll }),
  // multipart attachment-upload. Content-Type NIET zelf zetten (boundary).
  uploadAttachment: (env, taskId, bytes, filename) => {
    const fd = new FormData();
    fd.append('attachment', new Blob([bytes]), filename || 'bestand');
    return cuFetch(CU_BASE + `/task/${taskId}/attachment`, {
      method: 'POST',
      headers: cuHeaders(env), // GEEN Content-Type -> fetch zet multipart boundary
      body: fd,
    }, env);
  },
};

/* =============================================================================
   Gedeelde helpers
   ============================================================================= */
// page=0,1,2... tot last_page===true; accumuleert .tasks. Fixt Make's page0-bug.
export async function pageAll(env, buildPath, maxPages = 50) {
  const out = [];
  for (let page = 0; page < maxPages; page++) {
    const r = await cu.get(env, buildPath(page));
    if (!r.ok || !r.data) break;            // fail-open: stop, geef wat we hebben
    const tasks = r.data.tasks || [];
    out.push(...tasks);
    if (r.data.last_page === true || tasks.length === 0) break;
  }
  return out;
}

// custom-field-waarde lezen (rauw).
export function getCF(task, fieldId) {
  const f = ((task && task.custom_fields) || []).find((x) => x.id === fieldId);
  return f ? f.value : undefined;
}

// relatie-ids: dekt array-van-objecten EN string-array; .id/.task_id/string.
export function getRelationIds(task, fieldId) {
  const v = getCF(task, fieldId);
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === 'string' ? x : (x && (x.id || x.task_id)) || ''))
    .filter(Boolean);
}
export function getRelationFirstId(task, fieldId) {
  return getRelationIds(task, fieldId)[0] || '';
}

// scope-guard op veld 'Bedrijf' 4b1fb333. failClosed => count==0 levert ok:false.
export function scopeCheckTask(task, bedrijfId, failClosed = false) {
  const ids = getRelationIds(task, FIELD.bedrijf);
  const bedrCount = ids.length;
  const bedrId = ids[0] || '';
  let ok;
  if (bedrCount === 0) ok = !failClosed;                 // fail-open default
  else ok = String(bedrId) === String(bedrijfId);        // alleen eerste, 1:1 Make (first())
  return { ok, bedrCount, bedrId };
}

// optionele harde lijst-guard (get_team/bedrijfVoorkeuren): task hoort in Bedrijven-lijst.
export function isCompanyTask(task) {
  return !!(task && task.list && String(task.list.id) === LIST.bedrijven);
}

// discipline uit TYPE JOB-orderindex (int). 1:1 uit blueprint.
const DISCIPLINE_MAP = {
  1: 'strategie', 2: 'branding',
  4: 'video_fotografie', 6: 'video_fotografie', 7: 'video_fotografie',
  9: 'webdesign', 11: 'webdesign',
  12: 'seo', 13: 'social', 14: 'ads', 15: 'automation', 16: 'opleiding',
};
export function disciplineMapper(typeJobValue) {
  if (typeJobValue == null || typeJobValue === '') return '';
  const n = Number(typeJobValue);
  if (!Number.isFinite(n)) return '';
  return DISCIPLINE_MAP[n] || '';
}

// status-mapper (substring + status.type) -> genormaliseerd + label + pct.
export function statusMapper(statusObj) {
  const label = String((statusObj && statusObj.status) || '').toLowerCase();
  const type = String((statusObj && statusObj.type) || '').toLowerCase();
  let key;
  if (label.includes('doorgestuur')) key = 'doorgestuurd';
  else if (label.includes('goedgekeur')) key = 'done';
  else if (type === 'done') key = 'done';
  else if (type === 'closed') key = 'done';
  else if (type === 'open') key = 'to_do';
  else if (label.includes('hold')) key = 'on_hold';
  else key = 'in_progress';
  const LABELS = { to_do: 'Te plannen', in_progress: 'In productie', on_hold: 'On hold', doorgestuurd: 'Klaar voor review', done: 'Afgerond' };
  const PCT = { to_do: 5, in_progress: 45, on_hold: 30, doorgestuurd: 85, done: 100 };
  return { key, label: LABELS[key] || 'Afgerond', pct: PCT[key] != null ? PCT[key] : 100 };
}

// monthKey(ms) = YYYY-MM (UTC-consistent met Make formatDate).
export function monthKey(ms) {
  const d = new Date(Number(ms));
  if (isNaN(d.getTime())) return '';
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
// showVisible: doorlopende disciplines (social/ads/seo) enkel als due_date in huidige maand.
export function showVisible(discipline, dueDateMs, nowMs = Date.now()) {
  if (!['social', 'ads', 'seo'].includes(discipline)) return true;
  if (!dueDateMs) return false;
  return monthKey(dueDateMs) === monthKey(nowMs);
}

// module-labels: UUID->key. moduleOn = mods leeg (default-on) OF uuid aanwezig.
export const MODULE_UUIDS = {
  performance:      '74c2e17b-faa8-482f-97c2-ecdc21962d91',
  socials:          'c7255337-8ef8-4186-8766-5f7de709d1d3',
  ads:              'c321b00c-d18f-444a-bd6d-db980f7c2b05',
  seo:              'ef4d645f-002b-4a7d-bc76-3b2160eb72e6',
  opleidingen:      '5b7be1df-c838-4d59-8a38-794fa79c3adc',
  strategie:        '8218c9f6-f12c-4eee-b1eb-10d1fb541ecf',
  branding:         'bc054eb2-7088-4642-9dcb-fed35296bdb2',
  video_fotografie: '3f28a417-3ea9-4859-a3d7-14fb2d151e8e',
  webdesign:        '6e3f0a32-fdc5-4f96-81bc-468ea3ed1922',
};
// mods = array van geselecteerde option-UUID's (kan ook objecten zijn) of null.
function normalizeModuleLabels(value) {
  if (!Array.isArray(value)) return [];
  return value.map((x) => (typeof x === 'string' ? x : (x && (x.id || x.value)) || '')).filter(Boolean);
}
export function moduleOn(mods, uuid) {
  return mods.length === 0 || mods.includes(uuid);
}

// voorkeur-dropdown bidirectioneel (ad6f0803). READ: int-orderindex primair, uuid-fallback.
const VOORKEUR_UUID_TO_LABEL = {
  'e7534000-2f15-4690-8e33-944f8874f7c4': 'E-mail',
  '9041d265-a2dc-4131-8a6d-f4da4da5a668': 'Beide',
  '2fd124e0-d50e-405f-83f6-dfa6ff6f56cc': 'WhatsApp',
  '249174c9-7f71-489c-b299-8c8c2adbd072': 'Geen',
};
const VOORKEUR_LABEL_TO_UUID = {
  'E-mail':   'e7534000-2f15-4690-8e33-944f8874f7c4',
  'Beide':    '9041d265-a2dc-4131-8a6d-f4da4da5a668',
  'WhatsApp': '2fd124e0-d50e-405f-83f6-dfa6ff6f56cc',
  'Geen':     '249174c9-7f71-489c-b299-8c8c2adbd072',
};
export function voorkeurRead(value) {
  if (value == null || value === '') return 'WhatsApp'; // else-tak (orderindex 0)
  // UUID-pad (ClickUp kan uuid geven i.p.v. int)
  if (typeof value === 'string' && VOORKEUR_UUID_TO_LABEL[value]) return VOORKEUR_UUID_TO_LABEL[value];
  if (typeof value === 'object' && value && VOORKEUR_UUID_TO_LABEL[value.id]) return VOORKEUR_UUID_TO_LABEL[value.id];
  const n = Number(value);                              // int-orderindex-pad (live = int)
  if (n === 1) return 'E-mail';
  if (n === 2) return 'Beide';
  if (n === 3) return 'Geen';
  return 'WhatsApp';                                    // 0/onbekend
}
export function voorkeurWriteUUID(label) {
  return VOORKEUR_LABEL_TO_UUID[label] || VOORKEUR_LABEL_TO_UUID['Geen']; // default Geen
}

// base64 -> Uint8Array (1x decoden). Accepteert file_data ?? data, strip data-URL-prefix defensief.
export function base64ToBytes(b64) {
  let s = String(b64 || '');
  const comma = s.indexOf(',');
  if (s.slice(0, 5) === 'data:' && comma >= 0) s = s.slice(comma + 1); // defensief
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// now-ISO helper (let op: 'Z' i.p.v. tz-offset — functioneel ok voor de frontend).
export const nowISO = () => new Date().toISOString();
// datum 'YYYY-MM-DD HH:mm' (server-tijd) voor comment-templates.
function fmtDateTime(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
// datum 'DD/MM/YYYY'
function fmtDateNL(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// epoch-ms -> 'YYYY-MM-DD' / 'YYYY-MM-DDTHH:mm:ssZ' (voor dashboard opleverdatum/laatst_geupdatet).
function fmtDateFromMs(ms) {
  if (!ms) return '';
  const d = new Date(Number(ms));
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}
function fmtDateTimeFromMs(ms) {
  if (!ms) return '';
  const d = new Date(Number(ms));
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z'); // YYYY-MM-DDTHH:mm:ssZ
}

const str = (v) => (v == null ? '' : String(v));

/* =============================================================================
   KV-cache-wrapper (TTL 60s) voor reads dashboard/bedrijfContent/get_team.
   key = endpoint:bedrijfId, bypass via header X-No-Cache, bust bij writes.
   ============================================================================= */
const CACHE_TTL = 60;
function cacheKey(endpoint, bedrijfId) { return `cache:${endpoint}:${bedrijfId}`; }

export async function withCache(env, ctx, endpoint, bedrijfId, noCache, producer) {
  if (!env.KV || noCache) return producer();
  try {
    const hit = await env.KV.get(cacheKey(endpoint, bedrijfId));
    if (hit) { try { return { status: 200, body: JSON.parse(hit) }; } catch (e) {} }
  } catch (e) { /* KV-storing mag read niet breken */ }
  const res = await producer();
  if (res && res.status === 200 && env.KV) {
    try { ctx && ctx.waitUntil && ctx.waitUntil(env.KV.put(cacheKey(endpoint, bedrijfId), JSON.stringify(res.body), { expirationTtl: CACHE_TTL })); } catch (e) {}
  }
  return res;
}
// bust de read-caches voor een bedrijf-taak na een write op datzelfde bedrijf.
export function bustCache(env, ctx, bedrijfId) {
  if (!env.KV) return;
  for (const ep of ['dashboard', 'bedrijfContent', 'get_team']) {
    try { ctx && ctx.waitUntil && ctx.waitUntil(env.KV.delete(cacheKey(ep, bedrijfId))); } catch (e) {}
  }
}

/* =============================================================================
   READ-HANDLERS
   ============================================================================= */

/* ---- projectDetailV2 ----------------------------------------------------- */
export async function projectDetailV2(bedrijfId, body, env) {
  const taskId = str(body && body.task_id);
  if (!taskId) {
    // geen task_id -> skeleton (200, 1:1 Make Resume-stijl), nooit 5xx
    return { status: 200, body: detailSkeleton('', '__ERROR__') };
  }
  const r = await cu.get(env, `/task/${taskId}?subtasks=true&include_subtasks=true`);
  if (!r.ok || !r.data) {
    return { status: 200, body: detailSkeleton(taskId, 'task_fetch_failed') };
  }
  const task = r.data;
  // scope-guard (read => fail-open default)
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.read);
  if (!sc.ok) {
    return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot dit project.', taken: [], comments: [] } };
  }
  const beschrijving = str(task.description).replace(/\r?\n/g, '\\n');
  const taken = (task.subtasks || []).map((s) => ({
    task_id: str(s.id),
    naam: str(s.name),
    status: str(s.status && s.status.status),
    status_color: str((s.status && s.status.color) || '#cccccc'),
    datum: str(s.due_date),
    start_date: str(s.start_date),
    orderindex: str(s.orderindex != null ? s.orderindex : '0'),
    url: str(s.url),
  }));
  const out = {
    ok: true,
    task_id: str(task.id || taskId),
    naam: str(task.name),
    status: str(task.status && task.status.status),
    status_color: str((task.status && task.status.color) || '#cccccc'),
    beschrijving,
    due_date: str(task.due_date),
    start_date: str(task.start_date),
    date_created: str(task.date_created),
    url: str(task.url),
    deliverables_raw: str(getCF(task, FIELD.deliverablesRaw)).replace(/\r?\n/g, ' '),
    feedback_link: str(getCF(task, FIELD.feedbackLink)),
    budget: str(getCF(task, FIELD.budget)),
    time_estimate: str(task.time_estimate),
    content_creators: str(getCF(task, FIELD.contentCreators)),
    type_job: str(getCF(task, FIELD.typeJob)),
    shootlink: str(getCF(task, FIELD.shootlink)),
    has_contact: getRelationIds(task, FIELD.contact).length > 0 ? 'yes' : 'no',
    has_bedrijf: getRelationIds(task, FIELD.bedrijf).length > 0 ? 'yes' : 'no',
    taken,
    comments: [],
  };
  return { status: 200, body: out };
}
function detailSkeleton(taskId, err) {
  return {
    ok: true, task_id: str(taskId), naam: '', status: '', status_color: '#cccccc',
    beschrijving: '', due_date: '', start_date: '', date_created: '', url: '',
    deliverables_raw: '', feedback_link: '', budget: '', time_estimate: '',
    content_creators: '', type_job: '', shootlink: '', has_contact: 'no', has_bedrijf: 'no',
    taken: [], comments: [], __ERROR__: err,
  };
}

/* ---- chatList ------------------------------------------------------------ */
export async function chatList(bedrijfId, body, env) {
  const taskId = str(body && body.task_id);
  if (!taskId) return { status: 200, body: { ok: true, comments: [] } };
  const tr = await cu.get(env, `/task/${taskId}`);
  const task = tr.ok && tr.data ? tr.data : { custom_fields: [] };
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.read);
  if (!sc.ok) {
    return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot deze taak.', comments: [] } };
  }
  const cr = await cu.get(env, `/task/${taskId}/comment`);
  const raw = cr.ok && cr.data && Array.isArray(cr.data.comments) ? cr.data.comments : [];
  const comments = [];
  for (const c of raw) {
    const tekst = str(c.comment_text);
    if (tekst.slice(0, 8) === '[INTERN]') continue;          // interne notities niet tonen
    comments.push({
      id: str(c.id),
      auteur: str((c.user && c.user.username) || 'Onbekend'),
      is_klant: tekst.startsWith('💬 ['),                    // heuristiek (prefix van chat-post)
      tekst,                                                  // RAUW (prefix NIET strippen)
      datum: str(c.date),                                    // epoch-ms-string ongewijzigd
      attachments: [],
    });
  }
  return { status: 200, body: { ok: true, comments } };
}

/* ---- bedrijfContent ------------------------------------------------------ */
export async function bedrijfContent(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}?include_subtasks=false`);
  const b = br.ok && br.data ? br.data : null;
  const contactId = b ? getRelationFirstId(b, FIELD.contact) : '';
  let c = null;
  if (contactId) {
    const cr = await cu.get(env, `/task/${contactId}?include_subtasks=false`);
    c = cr.ok && cr.data ? cr.data : null;
  }
  const voorkeuren = str(b && b.description).replace(/---STRUCTURED---[\s\S]*/, '').trim();
  const out = {
    ok: true,
    algemene_voorkeuren: voorkeuren,
    btw: str(getCF(b, FIELD.btw)),
    facturatie_email: str(getCF(b, FIELD.facturatieEmail)),
    facturatie_opmerkingen: str(getCF(b, FIELD.facturatieOpm)),
    website: str(getCF(b, FIELD.website)),
    contact: {
      voornaam: str(getCF(c, FIELD.voornaam)),
      achternaam: str(getCF(c, FIELD.achternaam)),
      gsm: str(getCF(c, FIELD.gsm)),
      email: str(getCF(c, FIELD.email)),
    },
    attachments: ((b && b.attachments) || []).map((a) => ({
      filename: str(a.title),
      url: str(a.url),
      uploaded_by: str(a.user && a.user.id) === S27_BOT_USER_ID ? 'studio27' : 'klant',
      uploaded_at: str(a.date),
      size: a.size || 0,
    })),
    categorieen: null,
  };
  return { status: 200, body: out };
}

/* ---- bedrijfBeheer:get_team --------------------------------------------- */
export async function getTeam(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  if (!br.ok || !br.data) {
    return { status: 200, body: { ok: true, aantal_medewerkers: '', btw: '', website: '', contactpersonen: [] } };
  }
  const bedrijf = br.data;
  // optionele harde guard die Make mist: taak moet in Bedrijven-lijst zitten.
  if (bedrijf.list && bedrijf.list.id && !isCompanyTask(bedrijf)) {
    return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang.' } };
  }
  const ids = getRelationIds(bedrijf, FIELD.contact);
  const results = await Promise.all(ids.map((id) => cu.get(env, `/task/${id}`)));
  const contactpersonen = results
    .filter((r) => r.ok && r.data && r.data.id)              // filter lege/verwijderde contacten
    .map((r) => {
      const c = r.data;
      return {
        id: str(c.id),
        voornaam: str(getCF(c, FIELD.voornaam)),
        achternaam: str(getCF(c, FIELD.achternaam)),
        email: str(getCF(c, FIELD.email)),
        gsm: str(getCF(c, FIELD.gsm)),
        voorkeur: voorkeurRead(getCF(c, FIELD.voorkeur)),
      };
    });
  return {
    status: 200,
    body: {
      ok: true,
      aantal_medewerkers: str(getCF(bedrijf, FIELD.aantalMedewerkers)),
      btw: str(getCF(bedrijf, FIELD.btw)),
      website: str(getCF(bedrijf, FIELD.website)),
      contactpersonen,
    },
  };
}

/* ---- bedrijfBeheer:get_offertes ----------------------------------------- */
export async function getOffertes(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const bedrijf = br.ok && br.data ? br.data : null;
  const ids = bedrijf ? getRelationIds(bedrijf, FIELD.offertes) : [];
  const results = await Promise.all(ids.map((id) => cu.get(env, `/task/${id}`)));
  const offertes = [];
  for (const r of results) {
    if (!r.ok || !r.data || !r.data.id) continue;
    const o = r.data;
    // hardening: enkel offertes die ook echt aan dit bedrijf hangen (4b1fb333)
    const rel = getRelationIds(o, FIELD.bedrijf);
    if (rel.length > 0 && !rel.includes(String(bedrijfId))) continue;
    offertes.push({
      id: str(o.id),
      naam: encodeURIComponent(str(o.name)),                 // frontend doet decodeURIComponent
      status: encodeURIComponent(str(o.status && o.status.status)),
      link: str(getCF(o, FIELD.offerteLink)),                // NIET encoden
      budget: str(getCF(o, FIELD.offerteBudget)),
      vervaldatum: str(getCF(o, FIELD.offerteVervaldatum)),
    });
  }
  return { status: 200, body: { ok: true, offertes } };
}

/* ---- dashboard ----------------------------------------------------------- */
export async function dashboard(bedrijfId, body, env) {
  // 1) team-task-filter op 4b1fb333 (ANY), volledig gepagineerd
  const cf = `[{"field_id":"${FIELD.bedrijf}","operator":"ANY","value":["${bedrijfId}"]}]`;
  const enc = encodeURIComponent(cf);
  const tasks = await pageAll(env, (page) =>
    `/team/${TEAM_ID}/task?subtasks=false&include_closed=true&page=${page}&custom_fields=${enc}`);

  // 2) module-labels op de bedrijf-taak zelf
  const cr = await cu.get(env, `/task/${bedrijfId}`);
  const mods = cr.ok && cr.data ? normalizeModuleLabels(getCF(cr.data, FIELD.modules)) : [];

  const now = Date.now();
  const actieve = [];
  for (const t of tasks) {
    // her-check scope per taak (bedrijf_match), 1:1 met Make filter 12
    const rel = getRelationIds(t, FIELD.bedrijf);
    if (!rel.includes(String(bedrijfId))) continue;
    const discipline = disciplineMapper(getCF(t, FIELD.typeJob));
    if (discipline === '') continue;                          // disc != ''
    if (!showVisible(discipline, t.due_date, now)) continue;  // show == yes
    const st = statusMapper(t.status);
    actieve.push({
      task_id: str(t.id),
      naam: str(t.name),
      discipline,
      status: st.key,
      status_label: st.label,
      voortgang_pct: st.pct,
      type: str((t.list && t.list.name) || ''),
      opleverdatum: fmtDateFromMs(t.due_date),
      laatst_geupdatet: fmtDateTimeFromMs(t.date_updated),
      feedback_link: st.key === 'doorgestuurd' ? `https://studio27.be/design-feedback?taskId=${t.id}` : '',
    });
  }

  const out = {
    klant: { bedrijfsnaam: 'Klant', klantcode: '', account_manager: 'Ilke Meeusen' },
    stats: { actieve_projecten: actieve.length, openstaande_feedback: 0, deze_week: 0, opgeleverd_30d: 0 },
    actieve_projecten: actieve,
    historie_3mnd: [],
    aankomende_meetings: [],
    contact: { am_naam: 'Ilke Meeusen', am_email: 'ilke@studio27.be', am_rol: 'Account manager Studio 27' },
    modules: {
      performance: moduleOn(mods, MODULE_UUIDS.performance),
      socials: moduleOn(mods, MODULE_UUIDS.socials),
      ads: moduleOn(mods, MODULE_UUIDS.ads),
      seo: moduleOn(mods, MODULE_UUIDS.seo),
      opleidingen: moduleOn(mods, MODULE_UUIDS.opleidingen),
      strategie: moduleOn(mods, MODULE_UUIDS.strategie),
      branding: moduleOn(mods, MODULE_UUIDS.branding),
      video_fotografie: moduleOn(mods, MODULE_UUIDS.video_fotografie),
      webdesign: moduleOn(mods, MODULE_UUIDS.webdesign),
    },
  };
  return { status: 200, body: out };
}

/* ---- meetingsList (server-side Bedrijf-scope = security-fix) ------------- */
export async function meetingsList(bedrijfId, body, env) {
  const cf = `[{"field_id":"${FIELD.bedrijf}","operator":"ANY","value":["${bedrijfId}"]}]`;
  const enc = encodeURIComponent(cf);
  const tasks = await pageAll(env, (page) =>
    `/list/${LIST.meetings}/task?archived=false&include_closed=true&subtasks=false&order_by=created&page=${page}&custom_fields=${enc}`);
  // her-check (verdediging tegen te-ruime ANY-match)
  const meetings = tasks
    .filter((t) => getRelationIds(t, FIELD.bedrijf).includes(String(bedrijfId)))
    .map((t) => ({
      meeting_id: str(t.id),
      titel: str(t.name),
      datum: str(t.due_date),
      status: str(t.status && t.status.status),
      link: str(t.url),
    }));
  return {
    status: 200,
    body: { ok: true, meetings, booking_url: 'https://calendar.app.google/studio27klantenmeeting' },
  };
}

/* =============================================================================
   WRITE-HANDLERS (puur ClickUp). reads fail-open, writes fail-CLOSED.
   ============================================================================= */

/* ---- bedrijfVoorkeuren (1 PUT description, destructief) ------------------ */
export async function bedrijfVoorkeuren(bedrijfId, body, env) {
  const voorkeuren = str(body && body.voorkeuren);
  const r = await cu.put(env, `/task/${bedrijfId}`, { description: voorkeuren });
  if (!r.ok) {
    return { status: 500, body: { ok: false, message: 'Voorkeuren konden niet worden opgeslagen — probeer het opnieuw.' } };
  }
  return { status: 200, body: { ok: true, message: 'Voorkeuren opgeslagen', task_id: str((r.data && r.data.id) || bedrijfId), saved_at: nowISO() } };
}

/* ---- facturatieSave (bedrijf-niveau, 4 best-effort calls) ---------------- */
export async function facturatieSave(bedrijfId, body, env) {
  const ondernemingsnummer = str(body && body.ondernemingsnummer);
  const facturatie_email = str(body && body.facturatie_email);
  const facturatie_opmerkingen = str(body && body.facturatie_opmerkingen);
  const klant_naam = str((body && body.klant_naam) || 'Onbekend');
  const comment =
    '🧾 [FACTURATIEGEGEVENS GEWIJZIGD VIA PORTAAL]\n\n' +
    `Klant: ${klant_naam}\n` +
    `Datum: ${fmtDateTime()}\n\n` +
    `• Ondernemingsnummer / BTW: ${ondernemingsnummer || '-'}\n` +
    `• Facturatie-e-mail: ${facturatie_email || '-'}\n` +
    `• Facturatie-opmerkingen: ${facturatie_opmerkingen || '-'}\n\n` +
    '@ilke @arne — gelieve dit bij te werken in de administratie + PandaDoc-template + boekhouding.';
  await Promise.allSettled([
    cu.field(env, bedrijfId, FIELD.btw, ondernemingsnummer),
    cu.field(env, bedrijfId, FIELD.facturatieEmail, facturatie_email),
    cu.field(env, bedrijfId, FIELD.facturatieOpm, facturatie_opmerkingen),
    cu.comment(env, bedrijfId, comment, true),
  ]);
  return { status: 200, body: { ok: true, message: 'Facturatiegegevens opgeslagen — Ilke en Arne verwerken dit in de administratie.' } };
}

/* ---- projectFacturatieSave (project-niveau, GET+2 best-effort) ----------- */
export async function projectFacturatieSave(bedrijfId, body, env) {
  const taskId = str(body && body.task_id);
  const klant_naam = str((body && body.klant_naam) || 'Onbekend');
  const project_naam = str((body && body.project_naam) || '');
  const onr = str(body && body.ondernemingsnummer);
  const mail = str(body && body.facturatie_email);
  const opm = str(body && body.opmerking);

  const tr = await cu.get(env, `/task/${taskId}`);
  const task = tr.ok && tr.data ? tr.data : { custom_fields: [] };
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.write);
  if (!sc.ok) {
    return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot deze taak.' } };
  }
  const note = (`BTW: ${onr || '-'} · Mail: ${mail || '-'}` + (opm ? ` · ${opm}` : '') + ` (via portaal ${fmtDateNL()})`).trim();
  const comment =
    '🧾 [FACTURATIE — PROJECT GOEDGEKEURD VIA PORTAAL]\n\n' +
    `Klant: ${klant_naam}\nProject: ${project_naam}\nDatum: ${fmtDateTime()}\n\n` +
    'Bevestigde facturatiegegevens voor dit project:\n' +
    `• Ondernemingsnummer/BTW: ${onr || '-'}\n• Facturatie-e-mail: ${mail || '-'}\n• Opmerking: ${opm || '-'}\n\n` +
    '@ilke @arne — controleer of dit afwijkt van de standaard bedrijfsgegevens vóór facturatie.';
  await Promise.allSettled([
    cu.field(env, taskId, FIELD.factuurNote, note),
    cu.comment(env, taskId, comment, true),
  ]);
  return { status: 200, body: { ok: true, message: 'Facturatiegegevens voor dit project bevestigd.' } };
}

/* ---- bedrijfUpload (1 multipart POST op de bedrijf-taak) ----------------- */
export async function bedrijfUpload(bedrijfId, body, env) {
  const filename = str(body && body.filename);
  const raw = (body && (body.file_data != null ? body.file_data : body.data)) || '';
  if (!filename || !raw) {
    return { status: 500, body: { ok: false, message: 'Upload mislukt — controleer bestand en probeer opnieuw.' } };
  }
  let bytes;
  try { bytes = base64ToBytes(raw); } catch (e) {
    return { status: 500, body: { ok: false, message: 'Upload mislukt — controleer bestand en probeer opnieuw.' } };
  }
  const r = await cu.uploadAttachment(env, bedrijfId, bytes, filename);
  if (!r.ok || !r.data) {
    return { status: 500, body: { ok: false, message: 'Upload mislukt — controleer bestand en probeer opnieuw.' } };
  }
  return {
    status: 200,
    body: { ok: true, message: 'Bestand geüpload', attachment_id: str(r.data.id), url: str(r.data.url), filename: str(r.data.title || filename), uploaded_at: nowISO() },
  };
}

/* ---- chatPost (GET scope + POST comment; prefix kritisch) ---------------- */
export async function chatPost(bedrijfId, body, env) {
  const taskId = str(body && body.task_id);
  const commentText = str(body && body.comment_text);
  const klantNaam = str((body && body.klant_naam) || 'Onbekend');
  const tr = await cu.get(env, `/task/${taskId}`);
  const task = tr.ok && tr.data ? tr.data : { custom_fields: [] };
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.write);
  if (!sc.ok) {
    return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot deze taak.' } };
  }
  const commentBody = `💬 [Klant: ${klantNaam}]\n\n${commentText}`;
  const r = await cu.comment(env, taskId, commentBody, true);
  if (!r.ok) {
    return { status: 500, body: { ok: false, message: 'Bericht kon niet geplaatst worden — probeer het opnieuw.' } };
  }
  return { status: 200, body: { ok: true, comment_id: str((r.data && r.data.id) || 'posted'), posted_at: nowISO() } };
}

/* ---- chatAttachment (GET scope + upload + comment) ----------------------- */
export async function chatAttachment(bedrijfId, body, env) {
  const taskId = str(body && body.task_id);
  const filename = str(body && body.filename);
  const klantNaam = str((body && body.klant_naam) || 'Onbekend');
  const commentText = str(body && body.comment_text);
  const raw = (body && (body.file_data != null ? body.file_data : body.data)) || '';

  const tr = await cu.get(env, `/task/${taskId}`);
  const task = tr.ok && tr.data ? tr.data : { custom_fields: [] };
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.write);
  if (!sc.ok) {
    return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot deze taak.' } };
  }
  let bytes;
  try { bytes = base64ToBytes(raw); } catch (e) { bytes = new Uint8Array(0); }
  const up = await cu.uploadAttachment(env, taskId, bytes, filename);
  const uploadOk = up.ok && up.data;
  const attUrl = uploadOk ? str(up.data.url) : '';
  const attId = uploadOk ? str(up.data.id) : '';

  let commentId = '';
  if (uploadOk) {
    const commentBody =
      `💬 [Klant: ${klantNaam}]\n\n📎 Bestand gedeeld: ${filename}\n${attUrl}\n\n${commentText}`;
    const cm = await cu.comment(env, taskId, commentBody, true);
    commentId = cm.ok && cm.data ? str(cm.data.id) : '';
  }
  return {
    status: 200,
    body: { ok: !!uploadOk, attachment_id: attId, attachment_url: attUrl, comment_id: commentId, filename, posted_at: nowISO() },
  };
}

/* ---- directMessage (1 POST create in PORTAAL-inbox) ---------------------- */
export async function directMessage(bedrijfId, body, env) {
  const klant_naam = str((body && body.klant_naam) || '');
  const onderwerp = str(body && body.onderwerp);
  const bericht = str(body && body.bericht);
  const type = str(body && body.type).toLowerCase();
  const ontvangerKey = str(body && body.ontvanger).toLowerCase();

  const TYPE = {
    terugbel: { emoji: '📞', prio: 1 },
    meeting:  { emoji: '📅', prio: 2 },
    shoot:    { emoji: '📸', prio: 3 },
  };
  const tm = TYPE[type] || { emoji: '💬', prio: 3 };
  const ont = DM_ONTVANGERS[ontvangerKey] || DM_ONTVANGERS._default;

  const name = `[PORTAAL] ${tm.emoji} ${klant_naam} → ${ont.naam}: ${onderwerp || 'Vraag via portaal'}`;
  const content =
    'Bericht vanuit het klantenportaal\n\n' +
    `Klant: ${klant_naam}\nType: ${type}\nOnderwerp: ${onderwerp || '-'}\n\n` +
    `Bericht:\n${bericht || '(leeg)'}\n\n---\n` +
    'Beantwoord rechtstreeks in dit ClickUp-comment.\n' +
    'De klant ziet je antwoord in zijn portal-chat van het bovenliggende project (indien gekoppeld), of via algemene notificatie.';

  let r = await cu.post(env, `/list/${LIST.portaalInbox}/task`, {
    name, content, priority: tm.prio, assignees: [Number(ont.id)], notify_all: true,
    custom_fields: [{ id: FIELD.bedrijf, value: { add: [bedrijfId], rem: [] } }],
  });
  // fallback: als inline custom_fields niet pakte maar de taak wel bestaat -> aparte field-call
  if (r.ok && r.data && r.data.id) {
    const created = r.data;
    const relSet = getRelationIds(created, FIELD.bedrijf).includes(String(bedrijfId));
    if (!relSet) { await cu.relation(env, created.id, FIELD.bedrijf, { add: [bedrijfId], rem: [] }); }
  }
  if (!r.ok || !r.data) {
    return { status: 500, body: { ok: false, message: 'Bericht kon niet bezorgd worden — probeer opnieuw of bel ons rechtstreeks op +32 14 70 50 27.' } };
  }
  return {
    status: 200,
    body: {
      ok: true,
      message: `Bericht ontvangen — ${ont.naam} ziet het direct in ${ont.pron} planning en reageert binnenkort.`,
      task_id: str(r.data.id),
      task_url: str(r.data.url),
      ontvanger: ont.naam,
      sent_at: nowISO(),
    },
  };
}

/* ---- feedbackV2 (GET scope + tot 3 voorwaardelijke best-effort writes) --- */
export async function feedbackV2(bedrijfId, body, env) {
  const taskId = str(body && body.task_id);
  const klant_naam = str((body && body.klant_naam) || 'Onbekend');
  const deliverables = Array.isArray(body && body.deliverables) ? body.deliverables : [];
  const algemene_opmerking = str(body && body.algemene_opmerking);

  const total = deliverables.length;
  const approved = deliverables.filter((d) => d && d.choice === 'goedgekeurd').length;
  const feedback = deliverables.filter((d) => d && d.choice === 'feedback').length;
  const allApproved = total > 0 && total === approved;
  const feedbackSummary = deliverables.filter((d) => d && d.choice === 'feedback').map((d) => str(d.label)).join(', ');
  const viaKanaal =
    str(body && body.kanaal_label) ||
    str((deliverables.find((d) => d && d.kanaal_label) || {}).kanaal_label) ||
    'het portaal';
  const opmerkingen = (deliverables.map((d) => str(d && d.opmerking)).join(' • ').trim()) || algemene_opmerking || '';

  const tr = await cu.get(env, `/task/${taskId}?include_subtasks=false`);
  const task = tr.ok && tr.data ? tr.data : { list: { id: '' }, custom_fields: [] };
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.write);
  if (!sc.ok) {
    return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot deze taak.' } };
  }

  const writes = [];
  // (a) feedback-subtaak als er feedback is en list-id bekend
  const listId = task.list && task.list.id;
  if (feedback > 0 && listId) {
    writes.push(cu.post(env, `/list/${listId}/task`, {
      name: `Feedback ronde 1 — ${klant_naam}`,
      content:
        `Feedbackronde ingediend via klantportaal.\n\nGoedgekeurd: ${approved}/${total}\nFeedback: ${feedback}/${total}` +
        (feedbackSummary ? `\n\nDeliverables met feedback: ${feedbackSummary}` : '') +
        (opmerkingen ? `\n\nOpmerking: ${opmerkingen}` : ''),
      parent: taskId,
      notify_all: false,
      custom_fields: [{ id: FIELD.bedrijf, value: { add: [bedrijfId], rem: [] } }],
    }));
  }
  // (b) status -> goedgekeurd als alles goedgekeurd
  if (allApproved) {
    writes.push(cu.put(env, `/task/${taskId}`, { status: 'goedgekeurd' }));
  }
  // (c) altijd een klant-comment
  const comment =
    `💬 [Klant: ${klant_naam}]\n\nFeedback ronde 1 ingediend via klantportaal.\n\n` +
    `Goedgekeurd: ${approved}/${total}\nFeedback: ${feedback}/${total}\n\n` +
    (allApproved
      ? '✅ Alles goedgekeurd — status automatisch op goedgekeurd gezet.'
      : '📝 Deliverables met feedback: ' + feedbackSummary) +
    `\n\n📲 Doorgegeven via: ${viaKanaal}` + (opmerkingen ? `\n📝 Opmerking: ${opmerkingen}` : '');
  writes.push(cu.comment(env, taskId, comment, true));

  await Promise.allSettled(writes);
  return {
    status: 200,
    body: {
      ok: true,
      feedback_count: feedback,
      approved_count: approved,
      total_deliverables: total,
      all_approved: allApproved,
      parent_status_changed: allApproved,
      submitted_at: nowISO(),
    },
  };
}

/* ---- bedrijfBeheer:contacts (4 routes; IDOR-fix; contact-email apart) ---- */
// LET OP: contactEmail komt apart binnen (NIET de gateway-geïnjecteerde account-email).
export async function bedrijfBeheerContacts(bedrijfId, body, env, contactEmail) {
  const action = str(body && body.action);
  if (action === 'update_bedrijf') return updateBedrijf(bedrijfId, body, env);
  if (action === 'save_contact') return saveContact(bedrijfId, body, env, contactEmail);
  if (action === 'update_contact') return updateContact(bedrijfId, body, env, contactEmail);
  if (action === 'delete_contact') return deleteContact(bedrijfId, body, env, contactEmail);
  // onbekende/ontbrekende actie -> no-op 200 (Make: geen route-match = geen respond)
  return { status: 200, body: { ok: true } };
}

function contactCustomFields(body, contactEmail) {
  const cfs = [
    { id: FIELD.voornaam, value: str(body && body.voornaam) },
    { id: FIELD.achternaam, value: str(body && body.achternaam) },
    { id: FIELD.gsm, value: str(body && body.gsm) },
    { id: FIELD.voorkeur, value: voorkeurWriteUUID(str((body && body.voorkeur) || 'Geen')) },
  ];
  // contact-email = APART veld (niet account-email); enkel zetten als meegegeven
  if (contactEmail) cfs.push({ id: FIELD.email, value: contactEmail });
  return cfs;
}

async function updateBedrijf(bedrijfId, body, env) {
  const cfs = [
    { id: FIELD.btw, value: str(body && body.ondernemingsnummer) },
    { id: FIELD.website, value: str(body && body.website) },
  ];
  const aantal = body && body.aantal_medewerkers;
  const n = parseInt(str(aantal), 10);
  if (Number.isFinite(n)) cfs.push({ id: FIELD.aantalMedewerkers, value: n });
  await cu.put(env, `/task/${bedrijfId}`, { custom_fields: cfs }); // best-effort
  return { status: 200, body: { ok: true, saved: true } };
}

async function saveContact(bedrijfId, body, env, contactEmail) {
  const naam = `${str(body && body.voornaam)} ${str(body && body.achternaam)}`.trim();
  // 1) maak contact-taak; zet meteen Bedrijf 4b1fb333 (Make doet dit NIET -> nodig voor IDOR-guard)
  const create = await cu.post(env, `/list/${LIST.contactpersonen}/task`, {
    name: naam || 'Contact',
    custom_fields: [
      ...contactCustomFields(body, contactEmail),
      { id: FIELD.bedrijf, value: { add: [bedrijfId], rem: [] } },
    ],
  });
  const contactId = create.ok && create.data && create.data.id ? str(create.data.id) : '';
  if (contactId) {
    // 2) koppel additief op de bedrijf-taak (omgekeerde relatie 1bce8db8)
    await cu.relation(env, bedrijfId, FIELD.contact, { add: [contactId], rem: [] });
    // 3) read-modify-write Portaal-toegang CSV (enkel als contact-email bekend)
    if (contactEmail) {
      const br = await cu.get(env, `/task/${bedrijfId}`);
      const huidig = br.ok && br.data ? str(getCF(br.data, FIELD.portaalToegang)) : '';
      const nieuw = huidig ? `${huidig}, ${contactEmail}` : contactEmail;
      await cu.field(env, bedrijfId, FIELD.portaalToegang, nieuw);
    }
  }
  return { status: 200, body: { ok: true, contact_id: contactId, toegang_verleend: true } };
}

// IDOR-preflight: contact moet aan dit bedrijf hangen (4b1fb333), anders 403.
async function assertContactInBedrijf(bedrijfId, contactId, env) {
  const cr = await cu.get(env, `/task/${contactId}`);
  if (!cr.ok || !cr.data) return false;
  const rel = getRelationIds(cr.data, FIELD.bedrijf);
  return rel.includes(String(bedrijfId));
}

async function updateContact(bedrijfId, body, env, contactEmail) {
  const contactId = str(body && body.contact_id);
  if (!contactId) return { status: 200, body: { ok: true, updated: true, contact_id: '' } };
  const allowed = await assertContactInBedrijf(bedrijfId, contactId, env);
  if (!allowed) return { status: 403, body: { ok: false, error: 'scope_violation' } };
  // naam NIET herschrijven (1:1 Make); enkel custom_fields
  await cu.put(env, `/task/${contactId}`, { custom_fields: contactCustomFields(body, contactEmail) });
  return { status: 200, body: { ok: true, updated: true, contact_id: contactId } };
}

async function deleteContact(bedrijfId, body, env, contactEmail) {
  const contactId = str(body && body.contact_id);
  if (!contactId) return { status: 200, body: { ok: true, deleted: true, contact_id: '' } };
  const allowed = await assertContactInBedrijf(bedrijfId, contactId, env);
  if (!allowed) return { status: 403, body: { ok: false, error: 'scope_violation' } };
  // 1) ontkoppel van bedrijf (relatie 1bce8db8 rem). Taak zelf NIET verwijderen (1:1 Make).
  await cu.relation(env, bedrijfId, FIELD.contact, { add: [], rem: [contactId] });
  // 2) verwijder e-mail uit Portaal-toegang CSV (netjes: split/filter/join)
  if (contactEmail) {
    const br = await cu.get(env, `/task/${bedrijfId}`);
    const huidig = br.ok && br.data ? str(getCF(br.data, FIELD.portaalToegang)) : '';
    const nieuw = huidig.split(',').map((s) => s.trim()).filter((s) => s && s.toLowerCase() !== contactEmail.toLowerCase()).join(', ');
    await cu.field(env, bedrijfId, FIELD.portaalToegang, nieuw);
  }
  return { status: 200, body: { ok: true, deleted: true, contact_id: contactId } };
}

/* =============================================================================
   Handler-registry voor de router-shim + node-harness.
   READ_HANDLERS: testbaar zonder Firebase met (bedrijfId, body, env).
   ============================================================================= */
export const READ_HANDLERS = {
  projectDetailV2,
  chatList,
  bedrijfContent,
  dashboard,
  meetingsList,
};
export const WRITE_HANDLERS = {
  bedrijfVoorkeuren,
  facturatieSave,
  projectFacturatieSave,
  bedrijfUpload,
  chatPost,
  chatAttachment,
  directMessage,
  feedbackV2,
};
// bedrijfBeheer sub-acties (read vs write split voor cache/rate-decisions in de shell)
export const BEDRIJFBEHEER_READ_ACTIONS = { get_team: getTeam, get_offertes: getOffertes };
export const BEDRIJFBEHEER_WRITE_ACTIONS = new Set(['save_contact', 'update_contact', 'delete_contact', 'update_bedrijf']);
