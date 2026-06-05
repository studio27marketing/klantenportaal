/* =============================================================================
 * Studio 27 Klantenportaal - Gateway V2 - ClickUp-client + handlers
 * -----------------------------------------------------------------------------
 * Pure-ClickUp REST v2 herbouw van de v2-PORTAL Make-scenario's. Geen Firebase
 * hierin: elke handler krijgt (bedrijfId, body, env) en is daarmee TESTBAAR met
 * een node-harness zonder de gateway-shell (zie _v2test.mjs).
 *
 * Universele port-regels (uit consolidated.json):
 *   1. ClickUp-auth = header Authorization: env.CLICKUP_TOKEN  (KALE token, GEEN "Bearer").
 *   2. Bouw output met JS-objecten + 1x JSON.stringify (de gateway-shell stringify't).
 *      NIET Make's handmatige \/\"-escaping nabootsen (zou dubbel escapen).
 *   3. reads fail-OPEN, writes fail-CLOSED (403 scope_mismatch bij count==0) - via SCOPE_FAIL_CLOSED.
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

// S27-Planning (folder 901513606896): 8 discipline-lijsten + Payroll(afwezigheid).
// 1:1 met Make-scenario 6014538 (module 4 list_ids[]). Volgorde behouden zoals in
// de blueprint-URL. Payroll-lijst (afwezigheid) markeert blokken als 'afwezig'.
// LET OP: bij een nieuwe disciplinelijst in deze folder MOET die hier (en in Make)
// handmatig worden toegevoegd - er is geen folder-discovery (zie spec 'gaps').
export const PLANNING_LISTS = [
  '901520180314', // (Make module 4, idx 0)
  '901520180306',
  '901520180316',
  '901520180322',
  '901520180312',
  '901520180307',
  '901520180311',
  '901520180326',
  '901520180360', // Payroll = afwezigheid
];
export const PAYROLL_LIST = '901520180360';

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
  offertePandadocId:'748009c1-6e97-4b87-b6bd-fadeeaa24701', // short_text 'PandaDoc Offerte ID' (offertes-lijst)
  offerteBedrijfsnaam:'8da934b5-7747-4ad3-ac2f-cc53cf2985e8', // short_text 'Bedrijfsnaam' (offertes-lijst)
  // bedrijf-velden (extra) - Metricool blogId/brandId op de bedrijf-taak
  metricoolId:    '40f6ccd2-b25e-4385-bbca-3bfdf602e542', // short_text 'Metricool ID'
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
   ClickUp-client (cu) - kale token, gestructureerde fouten i.p.v. throw
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

/* =============================================================================
   Google service-account token (RS256-JWT met domain-wide delegation)
   -----------------------------------------------------------------------------
   Spiegelt het worker.js getGoogleAccessToken/importPkcs8/b64url-patroon, maar:
     - impersonatie via "sub" (subject) - DWD namens no-reply@studio27.be e.d.
     - generieke scope-param (calendar.readonly voor free/busy, calendar.events voor write)
     - cache per (subject|scope) i.p.v. één globale token (worker.js _saToken).
   globalThis.crypto.subtle werkt in Workers EN node18+, dus testbaar in de node-harness.
   PEM uit env.SA_PRIVATE_KEY (\\n -> newline + headers strippen, net als importPkcs8).
   ============================================================================= */
const _gTokens = new Map(); // key = subject + '|' + scope -> { token, exp(sec) }

function _b64urlBytes(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function _importSaKey(pem) {
  const b64 = String(pem || '')
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/[^A-Za-z0-9+/=]/g, '');
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return globalThis.crypto.subtle.importKey('pkcs8', der.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

// mintGoogleToken(env, subject, scope) -> access_token (string). Gooit een nette
// Error bij ontbrekende SA-config of als Google geen token teruggeeft (caller vangt).
export async function mintGoogleToken(env, subject, scope) {
  if (!env || !env.SA_CLIENT_EMAIL || !env.SA_PRIVATE_KEY) {
    throw new Error('sa_not_configured');
  }
  const sub = String(subject || '');
  const cacheKey = sub + '|' + scope;
  const now = Math.floor(Date.now() / 1000);
  const cached = _gTokens.get(cacheKey);
  if (cached && cached.token && now < cached.exp - 60) return cached.token;

  const claims = {
    iss: env.SA_CLIENT_EMAIL,
    sub: sub,                 // impersonatie (domain-wide delegation)
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const enc = (o) => _b64urlBytes(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc(claims);
  const key = await _importSaKey(env.SA_PRIVATE_KEY);
  const sig = await globalThis.crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = unsigned + '.' + _b64urlBytes(new Uint8Array(sig));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt),
  });
  const data = await res.json().catch(() => ({}));
  if (!data || !data.access_token) {
    throw new Error('geen access_token: ' + JSON.stringify(data || {}));
  }
  _gTokens.set(cacheKey, { token: data.access_token, exp: now + (data.expires_in || 3600) });
  return data.access_token;
}

// Google Calendar scope. LET OP: de domain-wide-delegation-config van dit SA staat
// ENKEL de brede scope '.../auth/calendar' toe - de granulaire calendar.readonly /
// calendar.events geven 'unauthorized_client' (live geverifieerd). Eén constante voor
// zowel free/busy (read) als event-create (write); breder is hier de enige optie die werkt.
const GCAL_SCOPE_READONLY = 'https://www.googleapis.com/auth/calendar';
const GCAL_SCOPE_EVENTS = 'https://www.googleapis.com/auth/calendar';
// free/busy-hosts (1:1 met Make-scenario 5945987 items[] + hosts[]-output).
const GCAL_FREEBUSY_ITEMS = ['ilke@studio27.be', 'arne@studio27.be'];
const GCAL_HOSTS = [
  { key: 'ilke', email: 'ilke@studio27.be', naam: 'Ilke Meeusen', rol: 'Accountmanager' },
  { key: 'arne', email: 'arne@studio27.be', naam: 'Arne Goetschalckx', rol: 'Zaakvoerder' },
];
// formatDate(...;"YYYY-MM-DDTHH:mm:ssZ") equivalent (UTC, sec-precisie, 'Z'-suffix).
function gcalTime(ms) {
  return new Date(Number(ms)).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/* =============================================================================
   SCHEDULING - pool/specifiek-beschikbaarheid (doorsnede Agenda ∩ ClickUp)
   -----------------------------------------------------------------------------
   Vastgelegd ontwerp van de eigenaar:
   - Vrij = vrij in Google Agenda EN in ClickUp-planning (doorsnede bron-blokken).
   - Trigger specifiek-vs-pool = de ClickUp-ASSIGNEE van de taak (geen custom field).
   - POOL-modus ENKEL voor discipline VIDEO/FOTOGRAFIE (planning-lijst 901520180316)
     ALS de taak GEEN assignee heeft. Pool = de 4 content creators hieronder.
     Een slot is boekbaar zodra >=1 poollid vrij is; we tonen HOEVEEL er vrij zijn.
   - SPECIFIEK-modus voor de rest (en video-taken MET assignee): enkel de assignee(s)
     van de taak; een slot is vrij enkel als ELKE assignee vrij is (in Agenda EN ClickUp).
   ============================================================================= */
// Video/fotografie-planning-lijst (= PLANNING_LISTS[2]). Pool-trigger.
export const VIDEO_LIST = '901520180316';
// Content-creators-pool (id = ClickUp user-id; email = Google-agenda voor freeBusy).
export const VIDEO_POOL = [
  { id: '36583478', email: 'guus@studio27.be',   naam: 'Guus' },
  { id: '54339680', email: 'ines@studio27.be',   naam: 'Ines' },
  { id: '36583476', email: 'bjorn@studio27.be',  naam: 'Bjorn' },
  { id: '82624365', email: 'viktor@studio27.be', naam: 'Viktor' },
];

// Werkuren/slot-raster 1:1 met v2/portal.js computeFreeSlots (live-logica is leidend):
//   weekdagen, 08:00–17:00 lokale tijd, 30-min raster, slot moet binnen 17:00 eindigen,
//   minstens now+2u, horizon t/m 31 dagen, cap 150 slots. Default-duur 90min (cap 6u).
const PLAN_DUR_MS = 90 * 60000;
const PLAN_DUR_MAX = 6 * 3600000;
function planDurMs(est) { const e = Number(est) || 0; return (e > 0 && e <= PLAN_DUR_MAX) ? e : PLAN_DUR_MS; }
// Kandidaat-slots (start-ms) over het raster - identiek aan de frontend, zodat de
// server-telling exact de slots dekt die de picker straks toont.
function candidateSlots(durMs) {
  const slots = [];
  const now = Date.now();
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  for (let day = 1; day <= 31 && slots.length < 150; day++) {
    const dt = new Date(day0.getTime() + day * 86400000);
    const dw = dt.getDay();
    if (dw === 0 || dw === 6) continue;
    for (let m = 480; m + durMs / 60000 <= 1020; m += 30) {
      const ss = new Date(dt); ss.setHours(0, m, 0, 0);
      const t0 = ss.getTime();
      if (t0 < now + 2 * 3600000) continue;
      slots.push(t0);
    }
  }
  return slots;
}
// Eén busy-interval [s,e] uit een ClickUp-planning-blok (zelfde regel als de frontend:
// afwezig = hele blok; anders est vanaf start; anders start→due). Geeft null bij geen span.
function blokToInterval(b) {
  const s = Number(b.start) || 0, d = Number(b.due) || 0, e = Number(b.est) || 0;
  let bs = 0, be = 0;
  if (b.afwezig) { bs = s; be = d > s ? d : (s + (e || 86400000)); }
  else if (e > 0) { bs = s; be = s + e; }
  else if (d > s) { bs = s; be = d; }
  return (bs && be > bs) ? [bs, be] : null;
}
const overlaps = (t0, t1, iv) => t0 < iv[1] && t1 > iv[0];

// ClickUp planning-blokken voor één set assignee-ids over de 9 S27-Planning-lijsten in
// [van,tot]. 1:1 met de bestaande beschikbaarheid-query (herhaalde list_ids[]/assignees[],
// subtasks, include_closed=false). Fail-open: bij fout → []. Geeft rauwe {start,due,est,afwezig}.
async function cuPlanningBlocks(env, assigneeIds, van, tot) {
  if (!assigneeIds || assigneeIds.length === 0) return [];
  let qs = PLANNING_LISTS.map((id) => `list_ids%5B%5D=${encodeURIComponent(id)}`).join('&');
  qs += '&' + assigneeIds.map((id) => `assignees%5B%5D=${encodeURIComponent(id)}`).join('&');
  if (van) qs += `&due_date_gt=${encodeURIComponent(van)}`;
  if (tot) qs += `&due_date_lt=${encodeURIComponent(tot)}`;
  qs += '&subtasks=true&include_closed=false';
  const tr = await cu.get(env, `/team/${TEAM_ID}/task?${qs}`);
  const tasks = tr.ok && tr.data && Array.isArray(tr.data.tasks) ? tr.data.tasks : [];
  return tasks.map((t) => ({
    start: Number(t.start_date) || 0,
    due: Number(t.due_date) || 0,
    est: Number(t.time_estimate) || 0,
    afwezig: str(t.list && t.list.id) === PAYROLL_LIST,
  }));
}

// Google-Agenda busy-intervallen voor een set e-mails: ÉÉN freeBusy-call (items = alle
// e-mails) over [van,tot] (epoch-ms). Geeft Map<email -> [[startMs,endMs],...]>. Fail-open:
// bij ontbrekende SA-config / token-fout / API-fout → lege intervallen per e-mail (geen busy),
// zodat de beschikbaarheid nooit 5xx geeft (consistent met de Make onerror-Resume).
async function gcalBusyForEmails(env, emails, van, tot) {
  const out = new Map();
  const uniq = [...new Set((emails || []).map((e) => String(e || '').trim()).filter(Boolean))];
  for (const e of uniq) out.set(e, []);
  if (uniq.length === 0) return out;
  if (!env || !env.SA_CLIENT_EMAIL || !env.SA_PRIVATE_KEY) return out;
  const timeMin = gcalTime(Number(van) || Date.now());
  const timeMax = gcalTime(Number(tot) || (Date.now() + 21 * 86400000));
  let token;
  try { token = await mintGoogleToken(env, str(env.GCAL_SUBJECT), GCAL_SCOPE_READONLY); }
  catch (e) { return out; } // fail-open
  try {
    const r = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin, timeMax, items: uniq.map((id) => ({ id })) }),
    });
    const data = await r.json().catch(() => ({}));
    const cals = (r.ok && data && data.calendars) ? data.calendars : {};
    for (const e of uniq) {
      const busy = (cals[e] && Array.isArray(cals[e].busy)) ? cals[e].busy : [];
      out.set(e, busy.map((b) => [Date.parse(b.start) || 0, Date.parse(b.end) || 0]).filter((iv) => iv[1] > iv[0]));
    }
  } catch (e) { /* fail-open: behoud lege intervallen */ }
  return out;
}

// Gecombineerde busy-intervallen (Agenda ∪ ClickUp) voor één lid.
// cuBlocks = rauwe ClickUp-planning-blokken van dat lid; gcalIv = [[s,e],...] uit freeBusy.
function memberBusyIntervals(cuBlocks, gcalIv) {
  const iv = [];
  for (const b of (cuBlocks || [])) { const x = blokToInterval(b); if (x) iv.push(x); }
  for (const g of (gcalIv || [])) { if (g && g[1] > g[0]) iv.push([g[0], g[1]]); }
  return iv;
}

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
  // POST /task/{id}/field/{fieldId} - generiek custom-field-zetten.
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
   GOOGLE DRIVE (v3) - directe port van de Make huisstijl-scenario's (zonder Make)
   -----------------------------------------------------------------------------
   1:1 met LEARNINGS #11. Auth = SA-JWT via mintGoogleToken(env, env.GDRIVE_SUBJECT,
   DRIVE_SCOPE) (domain-wide delegation namens arne@studio27.be). We werken in de
   GEDEELDE drive 'S27 - Drive' (DRIVE_SHARED_ID), dus elke call draagt
   supportsAllDrives=true&includeItemsFromAllDrives=true; list-queries ook
   corpora=drive&driveId=<shared>.
   Structuur per bedrijf: S27-Drive -> <Bedrijf> (company-folder, ClickUp-veld
   0a0781cc op de bedrijf-taak) -> 'Huisstijl' (subfolder).
   ============================================================================= */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
export const DRIVE_SHARED_ID = '0AKAHMRq7JrrEUk9PVA'; // gedeelde drive 'S27 - Drive'
// ClickUp URL-customfield 'Drive-map' op de Bedrijven-taak (wijst naar de company-folder).
const FIELD_DRIVE_MAP = '0a0781cc-a10a-4949-82b9-ab099956214a';
const HUISSTIJL_FOLDER_NAME = 'Huisstijl';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
// shared-drive query-suffix (op ELKE call). 'fields' apart toevoegen per call.
const DRIVE_SD = 'supportsAllDrives=true&includeItemsFromAllDrives=true';

// company-folder-id uit een Drive-map-URL (of kale id). Robuust tegen
// https://drive.google.com/drive/folders/<id>?... én tegen een al-kale id.
function driveFolderIdFromUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const m = s.match(/\/folders\/([^/?#]+)/);
  if (m) return m[1];
  if (/^https?:\/\//i.test(s)) return ''; // andere URL-vorm -> geen id
  return s.replace(/^\/+|\/+$/g, ''); // kale id
}

// één Drive-fetch met SA-token. Gooit NOOIT (geeft {ok,status,data}); reads fail-open.
async function driveFetch(env, url, init) {
  let token;
  try { token = await mintGoogleToken(env, str(env.GDRIVE_SUBJECT), DRIVE_SCOPE); }
  catch (e) { return { ok: false, status: 0, data: null, error: 'drive_auth' }; }
  const headers = { Authorization: 'Bearer ' + token, ...((init && init.headers) || {}) };
  let r;
  try { r = await fetch(url, { ...(init || {}), headers }); }
  catch (e) { return { ok: false, status: 0, data: null, error: 'network' }; }
  let data = null;
  const text = await r.text().catch(() => '');
  if (text) { try { data = JSON.parse(text); } catch (e) { data = { _raw: text }; } }
  return { ok: r.ok, status: r.status, data };
}

// Drive-map (company-folder-id) van de bedrijf-taak lezen via ClickUp.
async function driveCompanyFolderId(env, bedrijfId) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  if (!br.ok || !br.data) return '';
  return driveFolderIdFromUrl(getCF(br.data, FIELD_DRIVE_MAP));
}

// Maak een map in de shared drive onder parentId (makeApiCall-POST-equivalent).
// Geeft de nieuwe folder-id (of '' bij fout).
async function driveCreateFolder(env, name, parentId) {
  const body = { name: name || 'Map', mimeType: 'application/vnd.google-apps.folder', parents: [parentId] };
  const r = await driveFetch(env, `${DRIVE_FILES}?${DRIVE_SD}&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.ok && r.data && r.data.id ? str(r.data.id) : '';
}

// Vind (of maak) de 'Huisstijl'-subfolder onder de company-folder. '' bij fout.
async function driveHuisstijlFolderId(env, companyFolderId, { create = false } = {}) {
  if (!companyFolderId) return '';
  const q = `'${companyFolderId}' in parents and name = '${HUISSTIJL_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `${DRIVE_FILES}?${DRIVE_SD}&corpora=drive&driveId=${DRIVE_SHARED_ID}&q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const r = await driveFetch(env, url, { method: 'GET' });
  const found = r.ok && r.data && Array.isArray(r.data.files) && r.data.files[0];
  if (found && found.id) return str(found.id);
  if (create) return driveCreateFolder(env, HUISSTIJL_FOLDER_NAME, companyFolderId);
  return '';
}

// driveEnsure: zorg dat de bedrijf-taak een company-folder + Huisstijl-subfolder heeft.
// Leest de Drive-map (0a0781cc); ontbreekt die -> maak een nieuwe klant-map AAN in de
// shared drive (productie-doel: alle klantmappen automatisch in S27-Drive) en schrijf de
// folder-URL terug naar ClickUp. Idempotent. Fail-open (200 + ensured-flag).
async function driveEnsure(bedrijfId, body, env) {
  let companyFolderId = await driveCompanyFolderId(env, bedrijfId);
  let created = false;
  if (!companyFolderId) {
    // bedrijfsnaam als mapnaam (val terug op de taaknaam, anders het id).
    const br = await cu.get(env, `/task/${bedrijfId}`);
    const naam = (br.ok && br.data && str(br.data.name).trim()) || `Klant ${bedrijfId}`;
    companyFolderId = await driveCreateFolder(env, naam, DRIVE_SHARED_ID);
    if (companyFolderId) {
      created = true;
      // Drive-map-URL terugschrijven naar ClickUp (url-customfield).
      const url = `https://drive.google.com/drive/folders/${companyFolderId}`;
      await cu.field(env, bedrijfId, FIELD_DRIVE_MAP, url);
    }
  }
  if (!companyFolderId) return { status: 200, body: { ok: true, ensured: false } };
  const hsId = await driveHuisstijlFolderId(env, companyFolderId, { create: true });
  return { status: 200, body: { ok: true, ensured: !!hsId, created, company_folder_id: companyFolderId, huisstijl_folder_id: hsId } };
}

// één Drive-file -> output-shape die v2/data.js loadHuisstijl + panels.js verwachten
// ({name/filename, url, mime, size, modified, id}). 'name' is wat panels.js leest;
// 'filename' meegegeven omdat de spec dat noemt.
function driveFileOut(f) {
  const name = str(f && f.name);
  const link = (f && (f.webViewLink || f.webContentLink)) || '';
  return {
    id: str(f && f.id),
    name,
    filename: name,
    url: str(link),
    mime: str(f && f.mimeType),
    size: f && f.size != null ? Number(f.size) : null,
    modified: str(f && f.modifiedTime),
  };
}

// huisstijlList: GET de bestanden in de Huisstijl-folder. Fail-open: {files:[]} bij iets mis.
async function huisstijlList(bedrijfId, body, env) {
  const companyFolderId = await driveCompanyFolderId(env, bedrijfId);
  const hsId = await driveHuisstijlFolderId(env, companyFolderId, { create: false });
  if (!hsId) return { status: 200, body: { ok: true, files: [] } };
  const q = `'${hsId}' in parents and trashed = false`;
  const fields = 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink)';
  const url = `${DRIVE_FILES}?${DRIVE_SD}&corpora=drive&driveId=${DRIVE_SHARED_ID}&orderBy=folder,name&q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}`;
  const r = await driveFetch(env, url, { method: 'GET' });
  const files = (r.ok && r.data && Array.isArray(r.data.files)) ? r.data.files : [];
  // mappen niet tonen als bestand
  const out = files
    .filter((f) => f.mimeType !== 'application/vnd.google-apps.folder')
    .map(driveFileOut);
  return { status: 200, body: { ok: true, files: out } };
}

// huisstijlUpload: multipart/related upload naar de Huisstijl-folder. body.filename +
// body.file_data (base64). We bouwen de multipart-body ZELF in de Worker. Fail-closed-ish:
// geeft ok:false als de upload niet lukt, maar nooit een 5xx.
async function huisstijlUpload(bedrijfId, body, env) {
  const filename = str(body && body.filename) || 'bestand';
  const b64 = str(body && body.file_data);
  if (!b64) return { status: 200, body: { ok: false, error: 'no_file' } };
  // company + Huisstijl-folder garanderen (maakt aan indien nodig).
  let companyFolderId = await driveCompanyFolderId(env, bedrijfId);
  if (!companyFolderId) { const e = await driveEnsure(bedrijfId, {}, env); companyFolderId = (e.body && e.body.company_folder_id) || ''; }
  const hsId = await driveHuisstijlFolderId(env, companyFolderId, { create: true });
  if (!hsId) return { status: 200, body: { ok: false, error: 'no_folder' } };

  // base64 -> bytes
  let bytes;
  try {
    const clean = b64.replace(/^data:[^;]+;base64,/, '');
    const bin = atob(clean);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch (e) { return { status: 200, body: { ok: false, error: 'bad_base64' } }; }

  // multipart/related: deel 1 = metadata (JSON), deel 2 = de ruwe bytes.
  const boundary = 's27bnd' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const meta = { name: filename, parents: [hsId] };
  const enc = new TextEncoder();
  const pre = enc.encode(
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(meta) + '\r\n' +
    `--${boundary}\r\n` +
    'Content-Type: application/octet-stream\r\n\r\n'
  );
  const post = enc.encode(`\r\n--${boundary}--\r\n`);
  const payload = new Uint8Array(pre.length + bytes.length + post.length);
  payload.set(pre, 0);
  payload.set(bytes, pre.length);
  payload.set(post, pre.length + bytes.length);

  const url = `${DRIVE_UPLOAD}?uploadType=multipart&${DRIVE_SD}&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink`;
  const r = await driveFetch(env, url, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: payload,
  });
  if (!r.ok || !r.data || !r.data.id) return { status: 200, body: { ok: false, error: 'upload_failed' } };
  return { status: 200, body: { ok: true, file: driveFileOut(r.data) } };
}

// huisstijlDelete: soft-delete (trashed:true). SECURITY (LEARNINGS #11): eerst de parents
// van de file ophalen en bevestigen dat de file IN de Huisstijl-folder van DIT bedrijf zit
// vóór trashen - zo kan een klant geen vreemde Drive-file verwijderen via een gespoofte id.
async function huisstijlDelete(bedrijfId, body, env) {
  const fileId = str(body && (body.file_id || body.id));
  if (!fileId) return { status: 200, body: { ok: false, error: 'no_file_id' } };
  const companyFolderId = await driveCompanyFolderId(env, bedrijfId);
  const hsId = await driveHuisstijlFolderId(env, companyFolderId, { create: false });
  if (!hsId) return { status: 403, body: { ok: false, error: 'scope_violation' } };
  // parents van de file ophalen + check
  const meta = await driveFetch(env, `${DRIVE_FILES}/${encodeURIComponent(fileId)}?${DRIVE_SD}&fields=id,parents`, { method: 'GET' });
  const parents = (meta.ok && meta.data && Array.isArray(meta.data.parents)) ? meta.data.parents : [];
  if (!parents.includes(hsId)) return { status: 403, body: { ok: false, error: 'scope_violation' } };
  // soft-delete (recoverable), NIET hard DELETE
  const r = await driveFetch(env, `${DRIVE_FILES}/${encodeURIComponent(fileId)}?${DRIVE_SD}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  });
  if (!r.ok) return { status: 200, body: { ok: false, error: 'delete_failed' } };
  return { status: 200, body: { ok: true, deleted: true, file_id: fileId } };
}

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

// Naam-escaping voor het "id::Naam|id::Naam"-formaat dat de frontend (zipCompanies) parset.
function cleanCompanyName(n) { n = str(n).replace(/\|/g, '/').replace(/::/g, ':').trim(); return n || 'Bedrijf'; }

// PROVISIONING-lookup (vervangt het Make-scenario): bedrijven van een gebruiker op GEVERIFIEERD e-mailadres.
// Lookup B (contactpersonen, exacte e-mailmatch -> relatie Bedrijf) EERST -> eigen bedrijf staat vooraan.
// Lookup A (Bedrijven met portaalToegang-CSV, EXACTE token-match, geen substring). Beide gepagineerd.
// Output: { companies:"id::Naam|id::Naam" (STRING), ids:[...], bid } met server-side scope-guard op bid.
export async function provisionLookup(env, email, selectedBid) {
  email = str(email).trim().toLowerCase();
  if (!email) return { companies: '', ids: [], bid: '' };
  const rows = []; const seen = {};
  const add = (id, naam) => { id = str(id); if (!id || seen[id]) return; seen[id] = 1; rows.push(`${id}::${cleanCompanyName(naam)}`); };

  // Lookup B: contactpersonen met email == X -> relatie 'Bedrijf'.
  for (let page = 0; page < 25; page++) {
    const q = `/list/${LIST.contactpersonen}/task?include_closed=true&page=${page}&custom_fields=` +
      encodeURIComponent(`[{"field_id":"${FIELD.email}","operator":"=","value":"${email}"}]`);
    let r; try { r = await cu.get(env, q); } catch (e) { break; }
    const tasks = (r && r.data && r.data.tasks) || [];
    for (const t of tasks) {
      const rel = getCF(t, FIELD.bedrijf);
      if (Array.isArray(rel)) for (const b of rel) { if (b && b.id && str(b.name).trim()) add(b.id, b.name); }
    }
    if (tasks.length < 100 || (r && r.data && r.data.last_page)) break;
  }
  // Lookup A: Bedrijven met portaalToegang-CSV die het e-mailadres EXACT als token bevat.
  for (let page = 0; page < 25; page++) {
    const q = `/list/${LIST.bedrijven}/task?include_closed=true&page=${page}&custom_fields=` +
      encodeURIComponent(`[{"field_id":"${FIELD.portaalToegang}","operator":"IS NOT NULL"}]`);
    let r; try { r = await cu.get(env, q); } catch (e) { break; }
    const tasks = (r && r.data && r.data.tasks) || [];
    for (const t of tasks) {
      const toks = str(getCF(t, FIELD.portaalToegang)).toLowerCase().split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
      if (toks.includes(email)) add(t.id, t.name);
    }
    if (tasks.length < 100 || (r && r.data && r.data.last_page)) break;
  }

  const companies = rows.join('|');
  const ids = rows.map((x) => x.split('::')[0]);
  let bid = '';
  if (ids.length) bid = (selectedBid && ids.includes(str(selectedBid))) ? str(selectedBid) : ids[0];
  return { companies, ids, bid };
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

// "afgerond"-statussen voor afgerond_60d: enkel {done, goedgekeurd, klaar voor
// facturatie, gefactureerd}. Matcht op de RAUWE ClickUp-status-string (substring,
// lowercase) zodat 'klaar voor facturatie'/'gefactureerd' ook pakken. LET OP:
// 'doorgestuurd' valt hier bewust BUITEN (ook al is status.type==='done').
export function isAfgerondStatus(statusObj) {
  const label = String((statusObj && statusObj.status) || '').toLowerCase();
  if (!label) return false;
  if (label.includes('doorgestuur')) return false;           // expliciet NIET (review-status)
  if (label.includes('goedgekeur')) return true;             // goedgekeurd
  if (label.includes('gefactureer')) return true;            // gefactureerd
  if (label.includes('facturati')) return true;              // (klaar voor) facturatie
  return label === 'done';                                    // ClickUp default done-status
}

// "afgerond/opgeleverd"-tijdstip van een taak (ms): date_done > date_closed > due_date.
// Gebruikt om de 60-dagen-cutoff op te leggen voor afgerond_60d.
export function afgerondMs(task) {
  const dd = Number(task && task.date_done) || 0;
  const dc = Number(task && task.date_closed) || 0;
  const du = Number(task && task.due_date) || 0;
  return dd || dc || du || 0;
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

// now-ISO helper (let op: 'Z' i.p.v. tz-offset - functioneel ok voor de frontend).
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
   Deliverables-parser + SAE (assignees) - gedeeld door dashboard + projectDetailV2.
   ============================================================================= */

// type-classificatie van een deliverable-URL (contract: video/img/doc/bestand).
//   video  -> vimeo / youtu(.be|be.com)
//   img    -> google drive / .jpg/.jpeg/.png/.gif/.webp
//   doc    -> figma / webflow
//   bestand-> al de rest (fallback)
export function deliverableType(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('vimeo') || u.includes('youtu')) return 'video';
  if (u.includes('drive.google') || /\.(jpe?g|png|gif|webp)(\?|#|$)/.test(u)) return 'img';
  if (u.includes('figma') || u.includes('webflow')) return 'doc';
  return 'bestand';
}

// label = sprekend label per bron (1:1 met v2/data.js urlLabel zodat de getoonde
// tekst niet meer afhangt van wie wint - frontend of backend). Een kaal URL-segment
// ('000111', '1187258957') is enkel het laatste redmiddel.
function deliverableLabel(url) {
  const raw = String(url || '').trim();
  const u = raw.toLowerCase();
  if (u.includes('vimeo')) return 'Bekijk video (Vimeo)';
  if (u.includes('youtu')) return 'Bekijk video (YouTube)';
  if (u.includes('webflow')) return 'Bekijk website (Webflow)';
  if (u.includes('figma')) return 'Bekijk ontwerp (Figma)';
  if (u.includes('drive.google')) return 'Open in Drive';
  try {
    const p = new URL(raw);
    const segs = p.pathname.split('/').filter(Boolean);
    const last = segs.length ? decodeURIComponent(segs[segs.length - 1]) : '';
    // kaal nummeriek/kort segment = onleesbaar -> val terug op host i.p.v. '000111'
    if (last && !/^(view|edit|videos)$/i.test(last) && !/^\d+$/.test(last)) return last;
    if (segs.length >= 2) {
      const prev = decodeURIComponent(segs[segs.length - 2]);
      if (prev && !/^\d+$/.test(prev)) return prev;
    }
    return p.hostname.replace(/^www\./, '');
  } catch (e) {
    return raw || 'Open bestand';
  }
}

// Parse het ClickUp-veld 'bestanden' (deliverablesRaw b071307b) -> [{label,url,type}].
// Bron is een vrije tekst met URL's gescheiden door whitespace/newlines (live-vorm).
// Robuust: pak alle http(s)-URL's; geen URL's -> []. Nooit gooien.
export function parseDeliverables(rawValue) {
  const text = String(rawValue == null ? '' : rawValue);
  if (!text.trim()) return [];
  const urls = text.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  const out = [];
  const seen = new Set();
  for (const u of urls) {
    const url = u.replace(/[.,;]+$/, ''); // strip trailing leestekens
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ label: deliverableLabel(url), url, type: deliverableType(url) });
  }
  return out;
}

// initialen uit een naam: eerste letter van de eerste 2 woorden (uppercase).
function initialenVan(naam) {
  const words = String(naam || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// SAE = assignees van een taak -> [{naam, initialen}]. naam = username; initialen
// uit de naam (val terug op ClickUp's eigen .initials als de naam leeg is).
export function buildSae(task) {
  const assignees = (task && Array.isArray(task.assignees)) ? task.assignees : [];
  return assignees.map((a) => {
    const naam = str(a && a.username);
    const initialen = initialenVan(naam) || str(a && a.initials);
    return { naam, initialen };
  });
}

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
  // deliverables van het project zelf, geparset uit het veld 'bestanden' (b071307b).
  const deliverables = parseDeliverables(getCF(task, FIELD.deliverablesRaw));
  const taken = (task.subtasks || []).map((s) => {
    // subtasks in de parent-payload bevatten WEL custom_fields (live geverifieerd),
    // dus per subtaak kunnen we het veld 'bestanden' parsen zonder extra call.
    const subDeliv = parseDeliverables(getCF(s, FIELD.deliverablesRaw));
    return {
      task_id: str(s.id),
      naam: str(s.name),
      status: str(s.status && s.status.status),
      status_color: str((s.status && s.status.color) || '#cccccc'),
      datum: str(s.due_date),
      start_date: str(s.start_date),
      orderindex: str(s.orderindex != null ? s.orderindex : '0'),
      url: str(s.url),
      heeft_bestanden: subDeliv.length > 0,                   // goedgekeurde subtaak met bestanden = klikbaar in de tijdlijn
      bestanden: subDeliv,                                    // [{label, url, type}]
    };
  });
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
    deliverables,                                             // [{label, url, type}] geparset uit het veld bestanden
    feedback_link: str(getCF(task, FIELD.feedbackLink)),
    budget: str(getCF(task, FIELD.budget)),
    time_estimate: str(task.time_estimate),
    content_creators: str(getCF(task, FIELD.contentCreators)),
    type_job: str(getCF(task, FIELD.typeJob)),
    shootlink: str(getCF(task, FIELD.shootlink)),
    has_contact: getRelationIds(task, FIELD.contact).length > 0 ? 'yes' : 'no',
    has_bedrijf: getRelationIds(task, FIELD.bedrijf).length > 0 ? 'yes' : 'no',
    sae: buildSae(task),                                      // assignees [{naam, initialen}]
    taken,
    comments: [],
  };
  return { status: 200, body: out };
}
function detailSkeleton(taskId, err) {
  return {
    ok: true, task_id: str(taskId), naam: '', status: '', status_color: '#cccccc',
    beschrijving: '', due_date: '', start_date: '', date_created: '', url: '',
    deliverables_raw: '', deliverables: [], feedback_link: '', budget: '', time_estimate: '',
    content_creators: '', type_job: '', shootlink: '', has_contact: 'no', has_bedrijf: 'no',
    sae: [], taken: [], comments: [], __ERROR__: err,
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
    ondernemingsnummer: str(getCF(b, FIELD.btw)),             // alias (contract-naam) - zelfde veld 034f4443
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
  // Offerte-facturatie voor de Offertes-pagina (zelfde bron als bedrijfContent; de
  // bedrijf-taak is hier al opgehaald). ondernemingsnummer=034f4443, facturatie_email=
  // 9613b4aa, facturatie_opmerkingen=36d11828. facturatie_opmerkingen is schrijfbaar
  // via facturatieSave (POST /task/{id}/field/{id}). Additief - bestaande shape intact.
  const facturatie = {
    ondernemingsnummer: str(getCF(bedrijf, FIELD.btw)),
    facturatie_email: str(getCF(bedrijf, FIELD.facturatieEmail)),
    facturatie_opmerkingen: str(getCF(bedrijf, FIELD.facturatieOpm)),
  };
  return { status: 200, body: { ok: true, offertes, facturatie } };
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
  const cutoff60 = now - 60 * 86400000;
  const actieve = [];
  const afgerond60 = [];
  for (const t of tasks) {
    // her-check scope per taak (bedrijf_match), 1:1 met Make filter 12
    const rel = getRelationIds(t, FIELD.bedrijf);
    if (!rel.includes(String(bedrijfId))) continue;
    const discipline = disciplineMapper(getCF(t, FIELD.typeJob));

    // (A) afgerond_60d: status in {done, goedgekeurd, klaar voor facturatie, gefactureerd}
    //     EN afgerond/opgeleverd (date_done>date_closed>due_date) in de laatste 60 dagen.
    //     Onafhankelijk van het discipline-filter - een opgeleverde taak telt mee, ook als
    //     er (nog) geen TYPE JOB is. ENKEL echte project-/productietaken (discipline-lijst);
    //     contact/offerte/meeting-lijsten hebben geen TYPE JOB en vallen vanzelf weg via 'isAfgerondStatus'.
    if (isAfgerondStatus(t.status)) {
      const opMs = afgerondMs(t);
      if (opMs && opMs >= cutoff60) {
        afgerond60.push({
          task_id: str(t.id),
          naam: str(t.name),
          discipline,
          opleverdatum: opMs,                                   // epoch-ms (contract)
          heeft_bestanden: parseDeliverables(getCF(t, FIELD.deliverablesRaw)).length > 0,
        });
      }
    }

    // (B) actieve_projecten: enkel OPEN/lopende projecten (goedgekeurde/afgeronde apart in (A)).
    if (discipline === '') continue;                          // disc != ''
    if (!showVisible(discipline, t.due_date, now)) continue;  // show == yes
    if (isAfgerondStatus(t.status)) continue;                 // done/goedgekeurd/facturatie → afgerond_60d, niet actief
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
      sae: buildSae(t),                                        // assignees [{naam, initialen}]
    });
  }

  const out = {
    klant: { bedrijfsnaam: 'Klant', klantcode: '', account_manager: 'Ilke Meeusen' },
    stats: { actieve_projecten: actieve.length, openstaande_feedback: 0, deze_week: 0, opgeleverd_30d: afgerond60.length },
    actieve_projecten: actieve,
    afgerond_60d: afgerond60,
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

/* ---- beschikbaarheid (Agenda-slotpicker; doorsnede Agenda ∩ ClickUp) -------
 * Vrij = vrij in Google Agenda EN in de ClickUp-planning. Twee modi (trigger = de
 * ClickUp-ASSIGNEE van de taak, NIET een custom field):
 *
 *  SPECIFIEK (default; ook video-taken MET assignee): relevante leden = de assignees.
 *    blokken = UNIE van elk lid zijn (Agenda ∪ ClickUp) busy → computeFreeSlots in de
 *    frontend levert enkel slots waar IEDEREEN vrij is (doorsnede der vrije tijd).
 *
 *  POOL (enkel discipline video/fotografie = lijst 901520180316 ÉN geen assignee):
 *    relevante leden = de 4 content creators (VIDEO_POOL). Een slot is boekbaar zodra
 *    >=1 poollid vrij is, dus blokken = DOORSNEDE van busy (een slot is enkel "bezet"
 *    als ALLE poolleden bezet zijn). Daarnaast tellen we per kandidaat-slot hoeveel
 *    poolleden vrij zijn en geven pool:true + vrij_count (max over de getoonde slots)
 *    + vrij_per_slot (start-ms -> aantal) + pool_naam, zodat de picker "X content
 *    creators beschikbaar" kan tonen.
 *
 * Stappen: 1 task-read (assignees/list/est/scope) + 1 ClickUp-planning-query PER
 * relevant lid + 1 gedeelde Google-freeBusy-call (alle relevante e-mails). Fail-OPEN:
 * elke deelfout → die bron levert geen busy (nooit 5xx; consistent met Make-Resume).
 * Output behoudt de bestaande vorm {ok, assignee_*, list_id, taak_est, blokken:[{start,
 * due,est,afwezig}]} en voegt in pool-modus optioneel pool/vrij_count/vrij_per_slot/
 * pool_naam toe (negeerbaar door oudere frontends).
 * Cache: GEEN - planning wijzigt vaak; een 60s-cache zou een net-geboekt/verwijderd
 *   blok 1 minuut verbergen en zo dubbele-boekingen of valse vrije slots geven.
 */
export async function beschikbaarheid(bedrijfId, body, env) {
  const taskId = str(body && body.task_id);
  const van = str(body && body.van);   // epoch-ms, 1:1 doorgeven (geen conversie)
  const tot = str(body && body.tot);

  // (1) doel-taak ophalen; bij fout -> leeg fallback-object (Make onerror-Resume).
  let task = { list: { id: '' }, assignees: [], custom_fields: [], time_estimate: null };
  if (taskId) {
    const r = await cu.get(env, `/task/${taskId}`);
    if (r.ok && r.data) task = r.data;
  }

  // scope-guard op veld 'Bedrijf' 4b1fb333 (read => fail-open: leeg Bedrijf = toestaan).
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.read);
  if (!sc.ok) {
    return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot deze taak.' } };
  }

  // assignee-afgeleiden van de taak.
  const assignees = Array.isArray(task.assignees) ? task.assignees : [];
  const assigneeIds = assignees.map((a) => str(a && a.id)).filter(Boolean);
  const assigneeEmails = assignees.map((a) => str(a && a.email)).filter(Boolean);
  const assigneeNamen = assignees.map((a) => str(a && a.username)).filter(Boolean);
  const alist = str(task.list && task.list.id);
  const tek = Number(task.time_estimate) || 0;

  // (2) modusbepaling: video-lijst ÉN geen assignee -> POOL, anders SPECIFIEK.
  const isPool = (alist === VIDEO_LIST) && (assigneeIds.length === 0);

  // relevante leden = {id,email,naam}. SPECIFIEK uit de taak-assignees; POOL = VIDEO_POOL.
  const leden = isPool
    ? VIDEO_POOL.slice()
    : assignees.map((a) => ({ id: str(a && a.id), email: str(a && a.email), naam: str(a && a.username) })).filter((m) => m.id);

  // SPECIFIEK zonder geldig teamlid (bv. nog niemand toegewezen aan een webdesign-project):
  // NIET alles-vrij tonen. Eén bezet-blok over het hele venster -> 0 slots -> de picker stuurt
  // de klant naar 'Plan via Meetings'. (Pool valt hier nooit onder: die heeft altijd 4 leden.)
  if (!isPool && leden.length === 0) {
    const vanN = Number(van) || Date.now();
    const totN = Number(tot) || (vanN + 31 * 86400000);
    return { status: 200, body: { ok: true, assignee_id: '', assignee_email: '', assignee_emails: '', assignee_naam: '', list_id: alist, taak_est: tek, blokken: [{ start: vanN, due: totN, est: 0, afwezig: true }], no_member: true } };
  }

  // (3) bron-busy verzamelen PER lid: ClickUp-planning (1 query/lid) + Google-Agenda
  //     (1 gedeelde freeBusy-call voor alle e-mails). Beide fail-open.
  const ledenEmails = leden.map((m) => m.email).filter(Boolean);
  const [gcalMap, ...cuPerLid] = await Promise.all([
    gcalBusyForEmails(env, ledenEmails, van, tot),
    ...leden.map((m) => cuPlanningBlocks(env, [m.id], van, tot)),
  ]);

  // per lid: gecombineerde busy-intervallen (Agenda ∪ ClickUp) + behoud rauwe CU-blokken.
  const memberBusy = [];      // [[s,e],...] per lid (voor pool-telling)
  const allCuBlocks = [];     // rauwe ClickUp-blokken (voor de SPECIFIEK-blokken-output)
  leden.forEach((m, i) => {
    const cuBlocks = cuPerLid[i] || [];
    allCuBlocks.push(...cuBlocks);
    memberBusy.push(memberBusyIntervals(cuBlocks, gcalMap.get(m.email) || []));
  });

  // (4a) SPECIFIEK: blokken = UNIE van alle leden hun busy als generieke {start,due}-blokken
  //      (est=0, due=einde → de frontend leest dit 1:1 als bezet-interval). computeFreeSlots
  //      laat dan enkel slots over waar ELKE assignee vrij is.
  // (4b) POOL: blokken = DOORSNEDE van busy → een slot is enkel bezet als ALLE poolleden
  //      bezet zijn. Bereken die doorsnede-intervallen op het kandidaat-slot-raster.
  let blokken;
  let extra = {};
  if (!isPool) {
    blokken = [];
    for (const iv of memberBusy) for (const x of iv) blokken.push({ start: x[0], due: x[1], est: 0, afwezig: false });
  } else {
    const durMs = planDurMs(tek);
    const slots = candidateSlots(durMs);
    const vrijPerSlot = {};
    let maxVrij = 0;
    const busySlots = []; // slots waar ALLE poolleden bezet zijn -> als bezet-blok terug
    for (const t0 of slots) {
      const t1 = t0 + durMs;
      let vrij = 0;
      for (const iv of memberBusy) { if (!iv.some((b) => overlaps(t0, t1, b))) vrij++; }
      vrijPerSlot[t0] = vrij;
      if (vrij > maxVrij) maxVrij = vrij;
      if (vrij === 0) busySlots.push([t0, t1]);
    }
    // doorsnede-bezet als generieke blokken (est=0): dekt exact de slots waar niemand vrij is.
    blokken = busySlots.map(([s, e]) => ({ start: s, due: e, est: 0, afwezig: false }));
    extra = {
      pool: true,
      pool_naam: VIDEO_POOL.map((m) => m.naam).join(', '),
      vrij_count: maxVrij,            // headline: max # content creators vrij over de getoonde slots
      vrij_per_slot: vrijPerSlot,     // start-ms -> # vrije creators (voor per-slot weergave)
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      assignee_id: assigneeIds[0] || '',
      assignee_email: assigneeEmails[0] || '',
      assignee_emails: (isPool ? VIDEO_POOL.map((m) => m.email) : assigneeEmails).join(','),
      assignee_naam: isPool ? 'een content creator' : assigneeNamen.join(' & '),
      list_id: alist,
      taak_est: tek,
      blokken,
      ...extra,
    },
  };
}

/* ---- meetingAvailability (Google free/busy; port van Make-scenario 5945987) --
 * GEEN ClickUp, GEEN task-scope: dit is de ALGEMENE S27-beschikbaarheid (Ilke/Arne),
 * niet klantspecifiek. De gateway-shell heeft al een geldig Firebase-token + een
 * bedrijf-koppeling geverifieerd (dat vervangt de session_token>10-check uit Make).
 *
 * Mint een token namens env.GCAL_SUBJECT (no-reply@studio27.be, DWD) en POST naar
 * Calendar freeBusy voor [now+48h, now+21d] op ilke@/arne@ - exact het venster en
 * de kalenders uit de blueprint. De gcal-`calendars`-map gaat 1:1 door zodat de
 * frontend (loadMeetSlots/computeFreeFromBusy) res.data.calendars[email].busy
 * ([{start,end}] ISO) ongewijzigd kan lezen. Fail-OPEN: bij elke fout → lege
 * calendars (200) i.p.v. 5xx, net als de Make onerror-Resume.
 */
export async function meetingAvailability(bedrijfId, body, env) {
  if (!env || !env.SA_CLIENT_EMAIL || !env.SA_PRIVATE_KEY) {
    // SA niet geconfigureerd → nette lege respons (frontend valt terug op "geen momenten"), geen crash.
    return { status: 200, body: { ok: false, error: 'sa_not_configured', message: 'Beschikbaarheid tijdelijk niet beschikbaar.', calendars: {}, hosts: GCAL_HOSTS } };
  }
  const subject = str(env.GCAL_SUBJECT);
  const timeMin = gcalTime(Date.now() + 48 * 3600000); // now + 48h
  const timeMax = gcalTime(Date.now() + 21 * 86400000); // now + 21d

  let token;
  try {
    token = await mintGoogleToken(env, subject, GCAL_SCOPE_READONLY);
  } catch (e) {
    return { status: 200, body: { ok: false, error: 'token_mint_failed', calendars: {}, hosts: GCAL_HOSTS } };
  }

  let calendars = {};
  try {
    const r = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin, timeMax, items: GCAL_FREEBUSY_ITEMS.map((id) => ({ id })) }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data && data.calendars && typeof data.calendars === 'object') {
      calendars = data.calendars; // 1:1 doorgeven (per email: { busy:[{start,end}] })
    }
  } catch (e) { /* fail-open: lege calendars */ }

  return { status: 200, body: { ok: true, calendars, hosts: GCAL_HOSTS } };
}

/* =============================================================================
   WRITE-HANDLERS (puur ClickUp). reads fail-open, writes fail-CLOSED.
   ============================================================================= */

/* ---- bedrijfVoorkeuren (1 PUT description, destructief) ------------------ */
export async function bedrijfVoorkeuren(bedrijfId, body, env) {
  const voorkeuren = str(body && body.voorkeuren);
  const r = await cu.put(env, `/task/${bedrijfId}`, { description: voorkeuren });
  if (!r.ok) {
    return { status: 500, body: { ok: false, message: 'Voorkeuren konden niet worden opgeslagen - probeer het opnieuw.' } };
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
    '@ilke @arne - gelieve dit bij te werken in de administratie + PandaDoc-template + boekhouding.';
  await Promise.allSettled([
    cu.field(env, bedrijfId, FIELD.btw, ondernemingsnummer),
    cu.field(env, bedrijfId, FIELD.facturatieEmail, facturatie_email),
    cu.field(env, bedrijfId, FIELD.facturatieOpm, facturatie_opmerkingen),
    cu.comment(env, bedrijfId, comment, true),
  ]);
  return { status: 200, body: { ok: true, message: 'Facturatiegegevens opgeslagen - Ilke en Arne verwerken dit in de administratie.' } };
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
    '🧾 [FACTURATIE - PROJECT GOEDGEKEURD VIA PORTAAL]\n\n' +
    `Klant: ${klant_naam}\nProject: ${project_naam}\nDatum: ${fmtDateTime()}\n\n` +
    'Bevestigde facturatiegegevens voor dit project:\n' +
    `• Ondernemingsnummer/BTW: ${onr || '-'}\n• Facturatie-e-mail: ${mail || '-'}\n• Opmerking: ${opm || '-'}\n\n` +
    '@ilke @arne - controleer of dit afwijkt van de standaard bedrijfsgegevens vóór facturatie.';
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
    return { status: 500, body: { ok: false, message: 'Upload mislukt - controleer bestand en probeer opnieuw.' } };
  }
  let bytes;
  try { bytes = base64ToBytes(raw); } catch (e) {
    return { status: 500, body: { ok: false, message: 'Upload mislukt - controleer bestand en probeer opnieuw.' } };
  }
  const r = await cu.uploadAttachment(env, bedrijfId, bytes, filename);
  if (!r.ok || !r.data) {
    return { status: 500, body: { ok: false, message: 'Upload mislukt - controleer bestand en probeer opnieuw.' } };
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
    return { status: 500, body: { ok: false, message: 'Bericht kon niet geplaatst worden - probeer het opnieuw.' } };
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
    return { status: 500, body: { ok: false, message: 'Bericht kon niet bezorgd worden - probeer opnieuw of bel ons rechtstreeks op +32 14 70 50 27.' } };
  }
  return {
    status: 200,
    body: {
      ok: true,
      message: `Bericht ontvangen - ${ont.naam} ziet het direct in ${ont.pron} planning en reageert binnenkort.`,
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
      name: `Feedback ronde 1 - ${klant_naam}`,
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
      ? '✅ Alles goedgekeurd - status automatisch op goedgekeurd gezet.'
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

/* ---- inplannen (Google-Calendar-event + ClickUp due_date; port van 6014783) --
 * WRITE → scope-guard fail-CLOSED op body.task_id (veld Bedrijf 4b1fb333). LET OP:
 * Make is hier fail-OPEN (geen Bedrijf-koppeling = toestaan); wij sluiten dit dicht
 * (403 bij count==0) conform de verplichte write-beslissing (SCOPE_FAIL_CLOSED.write).
 *
 * Stappen:
 *  1) GET /task/{task_id} → scope-check. Bij mismatch/leeg → 403 scope_mismatch.
 *  2) mint token namens env.GCAL_SUBJECT (DWD) met calendar.events-scope.
 *  2b) POOL-AUTO-ASSIGN: als dit een pool-shoot is (video-lijst 901520180316 ÉN geen
 *      assignee), kies een poollid dat op [start,eind] vrij is (Agenda EN ClickUp), zet
 *      die als ClickUp-assignee (PUT /task {assignees:{add:[id]}}) en voeg die toe als
 *      event-attendee. Bij SPECIFIEK ongewijzigd (bestaande assignee blijft).
 *  3) POST events op de primary-kalender van GCAL_SUBJECT met conferenceDataVersion=1 &
 *     sendUpdates=all; summary/description/location/start/end/attendees uit body +
 *     conferenceData (Google Meet) ALS body.online truthy is. Event-fout = fail-open:
 *     lege event-velden, maar ga door naar de ClickUp-update.
 *  4) PUT /task/{task_id} { due_date:Number(start_ms), due_date_time:true } - native
 *     velden persisteren WEL via PUT (anders dan custom_fields). Best-effort.
 * Output: { ok:true, event_id, meet_link, html_link, assigned_member? }.
 */
export async function inplannen(bedrijfId, body, env) {
  const taskId = str(body && body.task_id);

  // (1) scope-guard fail-CLOSED. Geen task_id → behandelen als lege task = 403.
  let task = { custom_fields: [] };
  if (taskId) {
    const tr = await cu.get(env, `/task/${taskId}`);
    if (tr.ok && tr.data) task = tr.data;
  }
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.write);
  if (!sc.ok) {
    return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot deze taak.' } };
  }

  if (!env || !env.SA_CLIENT_EMAIL || !env.SA_PRIVATE_KEY) {
    return { status: 500, body: { ok: false, error: 'sa_not_configured', message: 'Inplannen tijdelijk niet beschikbaar.' } };
  }
  const subject = str(env.GCAL_SUBJECT);

  // (2) token (events-scope).
  let token;
  try {
    token = await mintGoogleToken(env, subject, GCAL_SCOPE_EVENTS);
  } catch (e) {
    return { status: 500, body: { ok: false, error: 'token_mint_failed', message: 'Inplannen tijdelijk niet beschikbaar.' } };
  }

  // (3) Google-Calendar-event op de primary-kalender van GCAL_SUBJECT.
  const start = str(body && body.start);   // ISO (frontend stuurt iso(start))
  const eind = str(body && body.eind);     // ISO
  const online = !!(body && body.online);
  const attendeesIn = Array.isArray(body && body.attendees) ? body.attendees : [];
  const attendees = attendeesIn
    .map((a) => {
      if (!a) return null;
      const email = str(a.email);
      if (!email) return null;
      const o = { email };
      if (a.displayName) o.displayName = str(a.displayName);
      return o;
    })
    .filter(Boolean);

  // (2b) POOL-AUTO-ASSIGN. Pool-shoot = video-lijst ÉN geen assignee op de taak.
  let assignedMember = null;
  const taakAssignees = Array.isArray(task.assignees) ? task.assignees : [];
  const isPoolShoot = (str(task.list && task.list.id) === VIDEO_LIST) && (taakAssignees.length === 0);
  if (isPoolShoot && taskId) {
    // compare-before-write: re-lees vlak vóór de boeking. Staat er intussen al een assignee
    // of due_date (iemand anders boekte deze shoot net), dan niet dubbel boeken/inplannen.
    const fresh = await cu.get(env, `/task/${taskId}`);
    if (fresh.ok && fresh.data && ((Array.isArray(fresh.data.assignees) && fresh.data.assignees.length > 0) || fresh.data.due_date)) {
      return { status: 200, body: { ok: true, already_booked: true, message: 'Deze shoot is zonet al ingepland.', event_id: '', meet_link: '', html_link: '', assigned_member: null } };
    }
    const startMsSel = Date.parse(start) || Number(body && body.start_ms) || 0;
    const eindMsSel = Date.parse(eind) || (startMsSel ? startMsSel + (planDurMs(task.time_estimate)) : 0);
    if (startMsSel && eindMsSel > startMsSel) {
      // venster iets verbreed zodat freeBusy/planning-query het slot zeker dekt.
      const qVan = String(startMsSel - 86400000);
      const qTot = String(eindMsSel + 86400000);
      const poolEmails = VIDEO_POOL.map((m) => m.email);
      const [gcalMap, ...cuPerLid] = await Promise.all([
        gcalBusyForEmails(env, poolEmails, qVan, qTot),
        ...VIDEO_POOL.map((m) => cuPlanningBlocks(env, [m.id], qVan, qTot)),
      ]);
      // kies het EERSTE poollid dat op [start,eind] vrij is (Agenda ∪ ClickUp geen overlap).
      for (let i = 0; i < VIDEO_POOL.length; i++) {
        const m = VIDEO_POOL[i];
        const busy = memberBusyIntervals(cuPerLid[i] || [], gcalMap.get(m.email) || []);
        if (!busy.some((b) => overlaps(startMsSel, eindMsSel, b))) { assignedMember = m; break; }
      }
      if (assignedMember) {
        // zet als ClickUp-assignee (additief) - native veld, persisteert via PUT.
        await cu.put(env, `/task/${taskId}`, { assignees: { add: [Number(assignedMember.id)], rem: [] } });
        // voeg toe als event-attendee als die e-mail nog niet in de lijst staat.
        if (!attendees.some((a) => a.email.toLowerCase() === assignedMember.email.toLowerCase())) {
          attendees.push({ email: assignedMember.email, displayName: assignedMember.naam });
        }
      }
    }
  }

  const event = {
    summary: str(body && body.titel),
    description: str(body && body.beschrijving),
    location: str(body && body.locatie),
    start: { dateTime: start },
    end: { dateTime: eind },
    attendees,
  };
  if (online) {
    event.conferenceData = {
      createRequest: {
        // unieke request-id; Google maakt hierop een Meet-link aan.
        requestId: 's27-' + (taskId || 'evt') + '-' + Date.now(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  let eventId = '';
  let meetLink = '';
  let htmlLink = '';
  try {
    const calId = encodeURIComponent(subject || 'primary');
    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }
    );
    const data = await r.json().catch(() => ({}));
    if (r.ok && data) {
      eventId = str(data.id);
      htmlLink = str(data.htmlLink);
      meetLink = str(data.hangoutLink);
    }
  } catch (e) { /* fail-open (Make Resume): lege event-velden, ga door */ }

  // (4) ClickUp due_date op de planning-taak (native veld; PUT persisteert WEL).
  const startMs = Number(body && body.start_ms) || Date.parse(start) || 0;
  if (taskId && Number.isFinite(startMs) && startMs > 0) {
    await cu.put(env, `/task/${taskId}`, { due_date: startMs, due_date_time: true });
  }

  return {
    status: 200,
    body: {
      ok: true,
      event_id: eventId,
      meet_link: meetLink,
      html_link: htmlLink,
      // bij een pool-shoot: het automatisch toegewezen poollid (id/email/naam), anders null.
      assigned_member: assignedMember ? { id: assignedMember.id, email: assignedMember.email, naam: assignedMember.naam } : null,
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
  if (Number.isFinite(n)) cfs.push({ id: FIELD.aantalMedewerkers, value: n }); // number-veld
  // LET OP: PUT /task met custom_fields-array persisteert NIET - ClickUp geeft 200 maar
  // negeert de waarden stilzwijgend. Zet elk veld via POST /task/{id}/field/{fieldId}.
  await Promise.allSettled(cfs.map((f) => cu.field(env, bedrijfId, f.id, f.value))); // best-effort
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
  // toegang_verleend weerspiegelt of er een CSV-mutatie was: enkel waar als er een
  // contact-email is (zonder email = geen toegang toegevoegd).
  return { status: 200, body: { ok: true, contact_id: contactId, toegang_verleend: !!contactEmail } };
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
  // CRITICAL: lees de HUIDIGE contact-email VOOR we het email-veld overschrijven, zodat we
  // de oude waarde uit de Portaal-toegang-CSV (f0de5c6c) van de bedrijf-taak kunnen halen.
  // Zonder dit blijft de oude email als orphan-toegang hangen (zie audit, live geverifieerd).
  const cr = await cu.get(env, `/task/${contactId}`);
  const oudEmail = cr.ok && cr.data ? str(getCF(cr.data, FIELD.email)).trim() : '';
  // naam NIET herschrijven (1:1 Make); enkel custom_fields.
  // LET OP: PUT /task met custom_fields-array persisteert NIET - ClickUp geeft 200 maar
  // negeert de waarden stilzwijgend (live geverifieerd op email-veld d453a72f). Zet elk
  // veld via POST /task/{id}/field/{fieldId}, dat WEL persisteert.
  const cfs = contactCustomFields(body, contactEmail);
  await Promise.allSettled(cfs.map((f) => cu.field(env, contactId, f.id, f.value)));
  // read-modify-write op de toegang-CSV: vervang OUD door NIEUW (idempotent, ontdubbelt).
  // Enkel als er een nieuwe email meekomt en die afwijkt van de oude (anders niets te doen).
  const nieuwEmail = str(contactEmail).trim();
  if (nieuwEmail && nieuwEmail.toLowerCase() !== oudEmail.toLowerCase()) {
    const br = await cu.get(env, `/task/${bedrijfId}`);
    const huidig = br.ok && br.data ? str(getCF(br.data, FIELD.portaalToegang)) : '';
    const parts = huidig.split(',').map((s) => s.trim()).filter(Boolean);
    // strip de oude email + elk bestaand voorkomen van de nieuwe (ontdubbelen), voeg nieuwe toe
    const kept = parts.filter((s) => {
      const lo = s.toLowerCase();
      return lo !== oudEmail.toLowerCase() && lo !== nieuwEmail.toLowerCase();
    });
    kept.push(nieuwEmail);
    const nieuw = kept.join(', ');
    if (nieuw !== huidig) await cu.field(env, bedrijfId, FIELD.portaalToegang, nieuw);
  }
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
   OFFERTE GENEREREN (WRITE) - ClickUp-offertetaak + PandaDoc CONCEPT-document
   -----------------------------------------------------------------------------
   FE-contract:  api(ENDPOINTS.offerteGenereren, { items:[{sku,naam,prijs,aantal}], opmerking })
   BE-respons:   { ok, offerte_task_id, offerte_task_url, pandadoc_id, message }

   Flow:
     1. valideer items[] + bereken budget = Σ(prijs*aantal).
     2. lees de bedrijf-taak (Company-naam + 1e contact voor de Klant-tokens).
     3. maak een ClickUp-offertetaak in lijst 901520180289, met:
          - Bedrijf-relatie 4b1fb333 = bedrijfId (scope-guard + backlink Offertes)
          - Budget c8d2dd2c = budget (currency)
          - Bedrijfsnaam 8da934b5 = Company
          - omschrijving = de gekozen items + totaal
     4. maak een PandaDoc CONCEPT-document (NIET verzonden) van template
        HQRvZ3sdrEm2GcuNsdP2Uf, met de items als pricing-table-rijen (data_merge),
        en schrijf de PandaDoc-id terug naar de offertetaak (veld 748009c1).

   PANDADOC create-call: zie buildPandadocCreate() -> { url, method, headers, body }.
   KRITIEKE CREDIT-LIMIET: de create wordt ENKEL uitgevoerd als
   env.PANDADOC_CREATE_ENABLED === 'true' (default UIT). Staat hij uit, dan bouwt de
   handler de payload wel (en geeft hem terug onder _pandadoc_create voor inspectie),
   maar maakt GEEN document aan -> 0 credits. In productie zet je de flag op 'true'.
   ============================================================================= */
export const OFFERTE_LIST = LIST.offertes;                  // 901520180289
export const PANDADOC_BASE = 'https://api.pandadoc.com/public/v1';
export const PANDADOC_TEMPLATE_OFFERTE = 'HQRvZ3sdrEm2GcuNsdP2Uf'; // 'Offerte template + vraag voor facturatiegegevens'
// Rollen op de template (uit /templates/.../details): Projectmanager + Klant.
export const PANDADOC_ROLE_PM = 'Projectmanager';
export const PANDADOC_ROLE_KLANT = 'Klant';
// Quote-sectie-naam in de template (pricing.quotes[0].sections[0].name). pricing_tables[].name
// moet matchen met de pricing-table/quote-naam in de template; de enige sectie heet 'Adverteren'.
export const PANDADOC_PRICING_TABLE_NAME = 'Adverteren'; // (legacy, niet meer gebruikt)
// Portaal-offerte -> sectie-tabel: elke productgroep (catalog.group) mapt op een prijstabel in
// de PandaDoc-template. We vullen de tabellen rechtstreeks (standaardvelden name/price/qty),
// dus de data_merge-toggle in de template is niet relevant. Onbekende groep -> 'Strategie'.
export const OFFERTE_TABLE_MAP = {
  'Content & video': 'Video en fotografie',
  'Fotografie': 'Video en fotografie',
  'Audio': 'Video en fotografie',
  'Social media': 'Social media',
  'Branding & grafisch': 'Branding',
  'Webdesign': 'Webdesign',
  'Adverteren': 'Adverteren',
  'Strategie': 'Strategie',
  'Opleidingen': 'Opleidingen',
};
export const OFFERTE_TABLE_ORDER = ['Strategie', 'Branding', 'Video en fotografie', 'Webdesign', 'Social media', 'Adverteren', 'Opleidingen'];
function offerteTableFor(groep) { return OFFERTE_TABLE_MAP[str(groep).trim()] || 'Strategie'; }
// Vaste Projectmanager-recipient/token-bron (Studio 27). Eén bron zodat de rol altijd
// preassigned is; tokens vullen het PM-blok in de offerte.
export const PANDADOC_PM = {
  email: 'ilke@studio27.be',
  first_name: 'Ilke',
  last_name: 'Meeusen',
  phone: '',
};

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Normaliseer + valideer de inkomende items[]. Geeft { items, budget } of null bij leeg.
function normalizeOfferteItems(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const items = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const naam = str(it.naam).trim();
    const sku = str(it.sku).trim();
    const prijs = num(it.prijs);
    const aantal = Math.max(0, Math.round(num(it.aantal)) || 0);
    if (!naam && !sku) continue;
    if (aantal <= 0) continue;
    items.push({ sku, naam: naam || sku, groep: str(it.groep).trim(), prijs: round2(prijs), aantal, regel_totaal: round2(prijs * aantal) });
  }
  if (items.length === 0) return null;
  const budget = round2(items.reduce((s, i) => s + i.regel_totaal, 0));
  return { items, budget };
}

// Klant-token-bron: Company = bedrijf-naam; FirstName/LastName = 1e gekoppeld contact.
function deriveKlantFromTasks(bedrijfTask, contactTask) {
  const company = str(bedrijfTask && bedrijfTask.name).trim();
  let first = '', last = '', email = '';
  if (contactTask) {
    first = str(getCF(contactTask, FIELD.voornaam)).trim();
    last = str(getCF(contactTask, FIELD.achternaam)).trim();
    email = str(getCF(contactTask, FIELD.email)).trim();
    // fallback: contact-taaknaam 'Voornaam Achternaam' splitsen
    if (!first && !last) {
      const parts = str(contactTask.name).trim().split(/\s+/);
      if (parts.length) { first = parts[0]; last = parts.slice(1).join(' '); }
    }
  }
  return { company, first_name: first, last_name: last, email };
}

// Bouw EXACT de PandaDoc create-call (POST /public/v1/documents). Wordt 1:1 gebruikt
// door fetch() én teruggegeven voor inspectie. Documenten worden ALTIJD als concept
// aangemaakt (geen 'send' in de body; verzenden is een aparte POST /documents/{id}/send).
export function buildPandadocCreate(env, { docName, items, klant, pm }) {
  // Groepeer de items per sectie-tabel (productgroep -> template-prijstabel). We vullen de
  // tabellen rechtstreeks (standaardvelden name/price/qty), dus geen data_merge nodig.
  const byTable = {};
  for (const it of items) {
    const tbl = offerteTableFor(it.groep);
    (byTable[tbl] = byTable[tbl] || []).push({
      options: { qty_editable: false, optional: false, optional_selected: true },
      data: { name: it.naam, description: '', price: it.prijs, qty: it.aantal, sku: it.sku },
    });
  }
  const pricing_tables = OFFERTE_TABLE_ORDER.filter((t) => byTable[t]).map((t) => ({
    name: t,
    sections: [{ title: t, default: true, rows: byTable[t] }],
  }));
  const body = {
    name: docName,
    template_uuid: PANDADOC_TEMPLATE_OFFERTE,
    recipients: [
      { role: PANDADOC_ROLE_PM, email: pm.email, first_name: pm.first_name, last_name: pm.last_name },
      // Klant-recipient: e-mail alleen meesturen als we er een hebben (anders rol zonder e-mail,
      // wat PandaDoc toelaat bij een concept; de klant-gegevens komen verder uit de tokens).
      Object.assign({ role: PANDADOC_ROLE_KLANT }, klant.email ? { email: klant.email } : {},
        klant.first_name ? { first_name: klant.first_name } : {},
        klant.last_name ? { last_name: klant.last_name } : {}),
    ],
    tokens: [
      { name: 'Klant.Company', value: klant.company || '' },
      { name: 'Klant.FirstName', value: klant.first_name || '' },
      { name: 'Klant.LastName', value: klant.last_name || '' },
      { name: 'Projectmanager.FirstName', value: pm.first_name || '' },
      { name: 'Projectmanager.LastName', value: pm.last_name || '' },
      { name: 'Projectmanager.Email', value: pm.email || '' },
      { name: 'Projectmanager.Phone', value: pm.phone || '' },
    ],
    pricing_tables,
  };
  return {
    url: `${PANDADOC_BASE}/documents`,
    method: 'POST',
    headers: { Authorization: `API-Key ${str(env && env.PANDADOC_API_KEY)}`, 'Content-Type': 'application/json' },
    body,
  };
}

// Voer de PandaDoc-create UIT (alleen als de flag aan staat). Geeft { id } of { error }.
async function pandadocCreate(env, call) {
  if (str(env && env.PANDADOC_CREATE_ENABLED) !== 'true') {
    return { skipped: true, id: '', reason: 'create_disabled' };
  }
  let r;
  try {
    r = await fetch(call.url, { method: call.method, headers: call.headers, body: JSON.stringify(call.body) });
  } catch (e) {
    return { error: 'network', id: '' };
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data || !data.id) return { error: 'pandadoc_' + r.status, id: '', detail: data };
  return { id: str(data.id), status: str(data.status) };
}

export async function offerteGenereren(bedrijfId, body, env) {
  // (1) items valideren + budget
  const norm = normalizeOfferteItems(body && body.items);
  if (!norm) {
    return { status: 400, body: { ok: false, error: 'no_items', message: 'Selecteer minstens één product met een aantal.' } };
  }
  const { items, budget } = norm;
  const opmerking = str(body && body.opmerking).trim();

  // (2) bedrijf-taak + 1e contact (voor Company/FirstName/LastName-tokens)
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const bedrijfTask = br.ok && br.data ? br.data : null;
  if (!bedrijfTask || !bedrijfTask.id) {
    return { status: 404, body: { ok: false, error: 'company_not_found', message: 'Bedrijf niet gevonden.' } };
  }
  const contactIds = getRelationIds(bedrijfTask, FIELD.contact);
  let contactTask = null;
  if (contactIds.length) {
    const cr = await cu.get(env, `/task/${contactIds[0]}`);
    if (cr.ok && cr.data) contactTask = cr.data;
  }
  const klant = deriveKlantFromTasks(bedrijfTask, contactTask);
  const company = klant.company || `Klant ${bedrijfId}`;

  // (3) ClickUp-offertetaak. Bedrijf-relatie 4b1fb333 = bedrijfId (scope-guard + Offertes-backlink).
  const datum = fmtDateNL();
  const taskName = `Offerte ${company} - ${datum}`;
  const regelsTekst = items
    .map((i) => `• ${i.aantal}x ${i.naam}${i.sku ? ` (${i.sku})` : ''} - €${i.prijs.toFixed(2)} = €${i.regel_totaal.toFixed(2)}`)
    .join('\n');
  const omschrijving =
    `Offerte aangevraagd via het klantenportaal op ${fmtDateTime()}.\n\n` +
    `Gekozen producten:\n${regelsTekst}\n\n` +
    `Totaal (excl. btw): €${budget.toFixed(2)}` +
    (opmerking ? `\n\nOpmerking van de klant:\n${opmerking}` : '');

  const created = await cu.post(env, `/list/${OFFERTE_LIST}/task`, {
    name: taskName,
    description: omschrijving,
    custom_fields: [
      { id: FIELD.bedrijf, value: { add: [String(bedrijfId)], rem: [] } }, // relatie -> bedrijf
      { id: FIELD.offerteBudget, value: budget },                          // currency
      { id: FIELD.offerteBedrijfsnaam, value: company },                   // short_text
    ],
  });
  if (!created.ok || !created.data || !created.data.id) {
    return { status: 502, body: { ok: false, error: 'clickup_create_failed', message: 'Offertetaak kon niet worden aangemaakt - probeer het later opnieuw.' } };
  }
  const offerteTaskId = str(created.data.id);
  const offerteTaskUrl = str(created.data.url) || `https://app.clickup.com/t/${offerteTaskId}`;

  // (3b) Bedrijf-relatie nazetten via het dedicated relation-endpoint (custom_fields bij create
  // zet relaties niet altijd betrouwbaar; idempotent + best-effort, mirror van de cu.field-gotcha).
  await cu.relation(env, offerteTaskId, FIELD.bedrijf, { add: [String(bedrijfId)] }).catch(() => {});

  // (4) PandaDoc CONCEPT-document. Payload ALTIJD bouwen; create alleen bij flag (0 credits default).
  const docName = `Offerte ${company} - ${datum}`;
  const pdCall = buildPandadocCreate(env, { docName, items, klant, pm: PANDADOC_PM });
  const pd = await pandadocCreate(env, pdCall);
  const pandadocId = str(pd.id);

  // (4b) PandaDoc-id terugschrijven naar de offertetaak (veld 748009c1) - alleen als we er een hebben.
  if (pandadocId) {
    await cu.field(env, offerteTaskId, FIELD.offertePandadocId, pandadocId).catch(() => {});
  }

  const message = pandadocId
    ? 'Je offerte-aanvraag is ontvangen. We bezorgen je binnenkort de definitieve offerte.'
    : 'Je offerte-aanvraag is ontvangen. Studio 27 stelt je offerte op en bezorgt ze je binnenkort.';

  const out = {
    ok: true,
    offerte_task_id: offerteTaskId,
    offerte_task_url: offerteTaskUrl,
    pandadoc_id: pandadocId,
    message,
  };
  // Bij uitgeschakelde create geven we de exacte payload mee voor inspectie/debug (geen secret:
  // de Authorization-header wordt geredigeerd). In productie (flag aan) blijft dit veld weg.
  if (str(env && env.PANDADOC_CREATE_ENABLED) !== 'true') {
    out._pandadoc_create_disabled = true;
    out._pandadoc_create = {
      url: pdCall.url,
      method: pdCall.method,
      headers: { ...pdCall.headers, Authorization: 'API-Key ***redacted***' },
      body: pdCall.body,
    };
  }
  return { status: 200, body: out };
}

/* =============================================================================
   METRICOOL (READ) - geplande/concept social posts, directe v2-API (geen Make)
   -----------------------------------------------------------------------------
   FE-contract (data.js loadMetricool): { ok, linked, brandId, posts:[ {
     id, datum, tekst(url-encoded), media, netwerken("a,b,c"-csv), status, draft, detail, url } ] }

   - blogId/brandId komt uit ClickUp-veld 40f6ccd2 op de bedrijf-taak. Geen veld -> linked:false.
   - GET https://app.metricool.com/api/v2/scheduler/posts?blogId=<id>&userId=<uid>
       &start=<-31d>&end=<+90d>&timezone=Europe/Brussels   header X-Mc-Auth: <key>
   - userId is OPTIONEEL (de call werkt identiek zonder), maar we sturen hem mee als we
     hem kennen: auto-discovery via /api/admin/simpleProfiles (match op brand-id), met
     fallback env.METRICOOL_USER_ID. Lukt geen van beide -> we laten userId weg (werkt nog).
   ============================================================================= */
export const METRICOOL_BASE = 'https://app.metricool.com/api/v2';
export const METRICOOL_ADMIN = 'https://app.metricool.com/api';
export const METRICOOL_TZ = 'Europe/Brussels';

function mcHeaders(env) {
  return { 'X-Mc-Auth': str(env && env.METRICOOL_API_KEY), Accept: 'application/json' };
}
// ISO zonder ms/zone, zoals de scheduler-API verwacht (lokale wandklok).
function mcStamp(ms) { return new Date(ms).toISOString().slice(0, 19); }

// Achterhaal de userId die bij een brand hoort. (1) env.METRICOOL_USER_ID wint;
// (2) anders /api/admin/simpleProfiles -> match op id==blogId -> userId/ownerUserId.
// Gecachet per isolate zodat we het niet elke call opnieuw doen.
let _mcUserCache = { byBlog: new Map(), all: null, allExp: 0 };
async function metricoolUserId(env, blogId) {
  const fromEnv = str(env && env.METRICOOL_USER_ID).trim();
  if (fromEnv) return fromEnv;
  if (_mcUserCache.byBlog.has(String(blogId))) return _mcUserCache.byBlog.get(String(blogId));
  let list = _mcUserCache.all;
  const now = Date.now();
  if (!list || now > _mcUserCache.allExp) {
    try {
      const r = await fetch(`${METRICOOL_ADMIN}/admin/simpleProfiles`, { headers: mcHeaders(env) });
      const data = await r.json().catch(() => null);
      list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      _mcUserCache.all = list; _mcUserCache.allExp = now + 10 * 60 * 1000;
    } catch (e) { list = []; }
  }
  let uid = '';
  for (const b of list || []) {
    if (String(b && (b.id != null ? b.id : '')) === String(blogId)) {
      uid = str(b.userId || b.ownerUserId || '');
      break;
    }
  }
  // als de brand niet in de lijst zit maar er is precies 1 account, neem die userId.
  if (!uid && list && list.length === 1) uid = str(list[0].userId || list[0].ownerUserId || '');
  _mcUserCache.byBlog.set(String(blogId), uid);
  return uid;
}

// Eén Metricool-post -> de platte FE-shape (data.js parseert verder).
function mcMapPost(p) {
  const providers = Array.isArray(p && p.providers) ? p.providers : [];
  const netwerken = providers.map((x) => str(x && x.network).toLowerCase()).filter(Boolean).join(',');
  // overall status: PUBLISHED als alles published; ERROR/FAILED domineert; anders 1e provider-status;
  // valt terug op DRAFT/PENDING. data.js doet .toUpperCase().
  let status = '';
  const sts = providers.map((x) => str(x && x.status).toUpperCase()).filter(Boolean);
  if (sts.length) {
    if (sts.some((s) => s.includes('ERROR') || s.includes('FAIL'))) status = sts.find((s) => s.includes('ERROR') || s.includes('FAIL'));
    else if (sts.every((s) => s === 'PUBLISHED')) status = 'PUBLISHED';
    else status = sts[0];
  }
  if (!status) status = p && p.draft ? 'DRAFT' : 'PENDING';
  // publieke URL/detail (eerste provider die er een heeft).
  let url = '';
  for (const x of providers) { if (x && x.publicUrl) { url = str(x.publicUrl); break; } }
  const media = Array.isArray(p && p.media) ? str(p.media[0]) : str(p && p.media);
  const datum = (p && p.publicationDate && str(p.publicationDate.dateTime)) || '';
  return {
    id: str(p && p.id),
    datum,                                   // "YYYY-MM-DDTHH:mm:ss" (FE _parseDatum verwerkt dit)
    tekst: encodeURIComponent(str(p && p.text)),  // FE doet decodeURIComponent
    media,
    netwerken,                               // CSV "facebook,instagram"
    status,                                  // FE .toUpperCase()
    draft: !!(p && p.draft),
    detail: '',
    url,
  };
}

export async function metricool(bedrijfId, body, env) {
  // (1) blogId/brandId uit de bedrijf-taak (veld 40f6ccd2).
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const blogId = br.ok && br.data ? str(getCF(br.data, FIELD.metricoolId)).trim() : '';
  if (!blogId) {
    return { status: 200, body: { ok: true, linked: false, posts: [] } };
  }
  if (!str(env && env.METRICOOL_API_KEY)) {
    // geen key -> behandel als 'niet gekoppeld' i.p.v. fout (read fail-open).
    return { status: 200, body: { ok: true, linked: false, posts: [] } };
  }

  // (2) userId (optioneel) + venster -31d .. +90d.
  const userId = await metricoolUserId(env, blogId).catch(() => '');
  const start = mcStamp(Date.now() - 31 * 86400000);
  const end = mcStamp(Date.now() + 90 * 86400000);
  const qs = new URLSearchParams({ blogId: String(blogId), start, end, timezone: METRICOOL_TZ });
  if (userId) qs.set('userId', String(userId));

  let r;
  try {
    r = await fetch(`${METRICOOL_BASE}/scheduler/posts?${qs.toString()}`, { headers: mcHeaders(env) });
  } catch (e) {
    // upstream onbereikbaar -> read fail-open: gekoppeld maar (tijdelijk) geen posts.
    return { status: 200, body: { ok: true, linked: true, brandId: blogId, posts: [] } };
  }
  if (!r.ok) {
    return { status: 200, body: { ok: true, linked: true, brandId: blogId, posts: [] } };
  }
  const data = await r.json().catch(() => null);
  const arr = data && Array.isArray(data.data) ? data.data
    : (Array.isArray(data) ? data : (data && Array.isArray(data.posts) ? data.posts : []));
  let posts = (arr || []).filter((p) => p && p.id != null).map(mcMapPost)
    .filter((p) => !p.draft);   // concepten/drafts blijven uit de klant-weergave (op vraag)
  // Klant-goedkeuringen uit KV mergen (portaal-eigen, los van Metricool's interne reviewer-flow).
  if (env.KV && posts.length) {
    try {
      const lst = await env.KV.list({ prefix: `mcappr:${bedrijfId}:` });
      const approved = new Set((lst.keys || []).map((k) => str(k.name).split(':').pop()));
      if (approved.size) posts.forEach((p) => { if (approved.has(String(p.id))) p.approved = true; });
    } catch (e) {}
  }
  return { status: 200, body: { ok: true, linked: true, brandId: blogId, posts } };
}

/* ---- metricoolApprove (WRITE) - keur een geplande concept-post goed -------- */
// PUT /api/v2/scheduler/posts/{id}/approval { status:"approved" } (per onderzoeksrapport).
// Defensief: bij elk niet-2xx / onbevestigd endpoint -> { ok:false, error:'approval_unsupported' }
// i.p.v. falen. We muteren NOOIT zonder een geldige scope (blogId van de bedrijf-taak).
export async function metricoolApprove(bedrijfId, body, env) {
  const postId = str(body && (body.id || body.post_id)).trim();
  if (!postId) {
    return { status: 400, body: { ok: false, error: 'missing_post_id' } };
  }
  // scope-guard: de bedrijf-taak moet een Metricool-koppeling hebben (anders geen recht).
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const blogId = br.ok && br.data ? str(getCF(br.data, FIELD.metricoolId)).trim() : '';
  if (!blogId) {
    return { status: 403, body: { ok: false, error: 'not_linked', message: 'Geen Metricool-koppeling voor dit bedrijf.' } };
  }
  // De klant is geen Metricool-reviewer: we bewaren de goedkeuring portaal-eigen in KV
  // (zodat de social-kalender 'goedgekeurd' toont) en melden het team via de ClickUp-inbox.
  if (env.KV) {
    try { await env.KV.put(`mcappr:${bedrijfId}:${postId}`, JSON.stringify({ at: Date.now() })); } catch (e) {}
    try { await env.KV.delete(cacheKey('metricool', bedrijfId)); } catch (e) {}
  }
  const naam = str(br.data && br.data.name) || 'Klant';
  try {
    await directMessage(bedrijfId, {
      klant_naam: naam,
      onderwerp: 'Social post goedgekeurd via portaal',
      bericht: `De klant keurde de geplande social post (${postId}) goed via het portaal. Je kan ze verder inplannen.`,
    }, env);
  } catch (e) {}
  return { status: 200, body: { ok: true, id: postId, approved: true } };
}

/* ---- metricoolFeedback (WRITE) - klant geeft feedback/aanpassing op een post --- */
// Geen directe Metricool-mutatie: de feedback (incl. een gewenste tekstaanpassing) gaat
// als opdracht naar de ClickUp-inbox, zodat Studio 27 ze veilig verwerkt.
export async function metricoolFeedback(bedrijfId, body, env) {
  const postId = str(body && (body.id || body.post_id)).trim();
  const feedback = str(body && (body.feedback || body.bericht)).trim();
  if (!postId || !feedback) {
    return { status: 400, body: { ok: false, error: 'missing_fields' } };
  }
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const naam = str(br.ok && br.data && br.data.name) || 'Klant';
  try {
    await directMessage(bedrijfId, {
      klant_naam: naam,
      onderwerp: 'Feedback op social post (via portaal)',
      bericht: `Feedback/aanpassing op de geplande social post (${postId}):\n\n${feedback}`,
    }, env);
  } catch (e) {
    return { status: 200, body: { ok: false, error: 'send_failed' } };
  }
  return { status: 200, body: { ok: true, id: postId } };
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
  beschikbaarheid,
  meetingAvailability,
  // Google Drive (directe API v3, geen Make). driveEnsure idempotent; huisstijlList GET.
  huisstijlList,
  driveEnsure,
  // Metricool (directe v2-API, geen Make). Leest blogId uit veld 40f6ccd2 op de bedrijf-taak.
  metricool,
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
  inplannen,
  // Offerte genereren (ClickUp-offertetaak + PandaDoc CONCEPT-document, geen Make).
  offerteGenereren,
  // Metricool: klant keurt een geplande post goed (KV + ClickUp-melding) of geeft feedback.
  metricoolApprove,
  metricoolFeedback,
  // Google Drive writes (directe API v3, geen Make).
  huisstijlUpload,
  huisstijlDelete,
};
// bedrijfBeheer sub-acties (read vs write split voor cache/rate-decisions in de shell)
export const BEDRIJFBEHEER_READ_ACTIONS = { get_team: getTeam, get_offertes: getOffertes };
export const BEDRIJFBEHEER_WRITE_ACTIONS = new Set(['save_contact', 'update_contact', 'delete_contact', 'update_bedrijf']);
