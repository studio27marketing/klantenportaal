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
  kanBeginnen:    'e99f30c7-7b5f-4ab4-ad48-9881dec38d91', // dropdown 'Kan beginnen?' (enkel optie JA, orderindex 0). GEZET = value-key aanwezig.
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
  deliverablesRaw:'b071307b-84c4-4372-9d7e-783e999c618f', // tekst 'Bestanden' (oplever-links)
  feedbackLink:   'f2610454-1961-42cf-9ba3-c7371b81353d', // url 'Feedback link' (klant-feedback-URL)
  driveFolder:    'b3a288a1-4f14-4dcf-bcc9-7833371e4fa3', // url 'Drive-projectfolder'
  meeting:        '5eab5514-5b17-4cfc-ae3b-912693d57b1f', // relatie 'Meeting'
  budget:         'c8d2dd2c-2428-4236-ba37-a3f3cd90c9ec',
  contentCreators:'dbe74db2-1083-4f2a-886f-0425718ae136', // dropdown 'Aantal Content creators' (orderindex 0=1..3=4)
  shootlink:      'c6a7da95-80b4-45c7-8004-227e01c421d4',
  startdatum:     '7086dc88-f247-430a-bed6-839fee4eea77', // date 'Startdatum' (shoot-aanvang, wegschrijven bij booking)
  locatie:        'fcbb46ff-66d5-432c-8edb-80de053197f3', // location 'Locatie' (shoot start-locatie, lat/lng + adres)
  // offerte-velden
  offerteLink:    '36264fc2-f348-4e14-b81c-063045ce1264',
  offerteBudget:  'c8d2dd2c-2428-4236-ba37-a3f3cd90c9ec',
  offerteVervaldatum:'317437a7-2508-453f-a7b9-faf040c541a9',
  offertePandadocId:'748009c1-6e97-4b87-b6bd-fadeeaa24701', // short_text 'PandaDoc Offerte ID' (offertes-lijst)
  offerteBedrijfsnaam:'8da934b5-7747-4ad3-ac2f-cc53cf2985e8', // short_text 'Bedrijfsnaam' (offertes-lijst)
  // bedrijf-velden (extra) - Metricool blogId/brandId op de bedrijf-taak
  metricoolId:    '40f6ccd2-b25e-4385-bbca-3bfdf602e542', // short_text 'Metricool ID'
  ga4PropertyId:  'e3e12841-2eee-48a0-b68e-6e35cec159ca', // short_text 'GA4 property-ID' (Webprestaties; bestaat al in ClickUp)
  gscSiteUrl:     '199aceaa-dbd8-4a97-97d8-09607f87e847', // short_text 'GSC Site URL' (override waar GSC ≠ website-domein)
  webflowSiteId:  'd3bebfae-6508-41dc-a078-72a375d6e246', // short_text 'Webflow Site ID' (formulier-integratie)
  // ad-account-ids op de bedrijf-taak (Bedrijven-lijst) — direct-API ads-rapportage
  metaAdsId:      '1658c472-496c-480d-81bf-0c19e82d84df', // short_text 'Meta Ads ID'
  metaBusinessId: 'c352892a-7cd9-4f17-9e81-4d3decdb0fad', // short_text 'Meta Business ID'
  googleAdsId:    'b1a52056-be3a-435a-95d6-1aa338bfc065', // short_text 'Google Ads ID'
  tiktokAdsId:    '35baf0a8-ec33-4f97-863e-301eb1b2815e', // short_text 'TIkTok Ads ID'
  snapchatAdsId:  '856172ba-7c88-40ce-8c01-f51f9bc885a4', // short_text 'Snapchat Ads ID'
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

/* ---- Beslissings-flag: fail-CLOSED voor reads EN writes -------------------- */
// SEC-2 (H1): vroeger waren reads fail-OPEN (count==0 => toestaan, 1:1 met de oude Make-logica).
// Dat liet een klant taken ZONDER Bedrijf-koppeling van anderen uitlezen (cross-tenant leeslek
// via projectDetailV2/chatList/beschikbaarheid). Nu fail-CLOSED voor beide: een lege of
// niet-matchende Bedrijf-koppeling geeft NOOIT toegang.
export const SCOPE_FAIL_CLOSED = { read: true, write: true };

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
  const fileId = cleanId(body && (body.file_id || body.id));
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

  // Lookup B: contactpersonen met email == X -> hun task-IDs + contact-ZIJDE relatie 'Bedrijf'.
  const contactIds = [];
  for (let page = 0; page < 25; page++) {
    const q = `/list/${LIST.contactpersonen}/task?include_closed=true&page=${page}&custom_fields=` +
      encodeURIComponent(`[{"field_id":"${FIELD.email}","operator":"=","value":"${email}"}]`);
    let r; try { r = await cu.get(env, q); } catch (e) { break; }
    const tasks = (r && r.data && r.data.tasks) || [];
    for (const t of tasks) {
      if (t && t.id) contactIds.push(str(t.id));
      const rel = getCF(t, FIELD.bedrijf);
      if (Array.isArray(rel)) for (const b of rel) { if (b && b.id && str(b.name).trim()) add(b.id, b.name); }
    }
    if (tasks.length < 100 || (r && r.data && r.data.last_page)) break;
  }
  // Lookup C: Bedrijven waarvan het contact-veld een van die contact-IDs bevat (bedrijf-ZIJDE).
  // Cruciaal: de twee relatievelden in ClickUp spiegelen NIET, dus een koppeling aan de bedrijf-kant
  // staat niet automatisch op de contactfiche. Zonder deze stap miste de oude flow die bedrijven.
  if (contactIds.length) {
    for (let page = 0; page < 25; page++) {
      const q = `/list/${LIST.bedrijven}/task?include_closed=true&page=${page}&custom_fields=` +
        encodeURIComponent(`[{"field_id":"${FIELD.contact}","operator":"ANY","value":${JSON.stringify(contactIds)}}]`);
      let r; try { r = await cu.get(env, q); } catch (e) { break; }
      const tasks = (r && r.data && r.data.tasks) || [];
      for (const t of tasks) { if (t && t.id && str(t.name).trim()) add(t.id, t.name); }
      if (tasks.length < 100 || (r && r.data && r.data.last_page)) break;
    }
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

// ADMIN-ONLY (staff @studio27.be): lijst ALLE bedrijven voor de admin-bedrijvenkiezer/zoek.
// Lichte payload: enkel { id, naam }. Gatekeeping gebeurt in worker.js — enkel een geverifieerd
// is_staff-token bereikt dit; een gewone klant krijgt 403. Bewuste tenant-overschrijding.
export async function adminCompanies(env, body) {
  const tasks = await pageAll(env, (page) =>
    `/list/${LIST.bedrijven}/task?include_closed=true&subtasks=false&page=${page}`);
  const seen = {};
  const companies = [];
  for (const t of tasks) {
    const id = str(t && t.id);
    if (!id || seen[id]) continue;
    const naam = str(t && t.name).trim();
    if (!naam) continue;
    seen[id] = 1;
    companies.push({ id, naam });
  }
  companies.sort((a, b) => a.naam.localeCompare(b.naam, 'nl', { sensitivity: 'base' }));
  return { status: 200, body: { ok: true, companies, count: companies.length } };
}

// scope-guard op veld 'Bedrijf' 4b1fb333. failClosed => count==0 levert ok:false.
export function scopeCheckTask(task, bedrijfId, failClosed = true) {
  const ids = getRelationIds(task, FIELD.bedrijf);
  const bedrCount = ids.length;
  const bedrId = ids[0] || '';
  let ok;
  if (bedrCount === 0) ok = !failClosed;                 // SEC-2: nu fail-CLOSED (reads+writes)
  else ok = ids.includes(String(bedrijfId));             // SEC-2: ELKE gekoppelde Bedrijf telt (niet enkel first())
  return { ok, bedrCount, bedrId };
}

// optionele harde lijst-guard (get_team/bedrijfVoorkeuren): task hoort in Bedrijven-lijst.
export function isCompanyTask(task) {
  return !!(task && task.list && String(task.list.id) === LIST.bedrijven);
}

// discipline uit TYPE JOB-orderindex (int). Volledige tabel (live geverifieerd):
// 0 Projectmanagement (communicatie/hoofdtaak-label, GEEN discipline -> ''),
// 1 Strategie, 2 Branding, 3 FB-Branding, 4 Preproductie, 5 FB-preproductie,
// 6 Shoot, 7 Edit, 8 FB-Edit, 9 Webdesign, 10 FB-Webdesign, 11 Copywriting,
// 12 SEO, 13 Social media, 14 Adverteren, 15 Automation, 16 Opleiding,
// 17 hosting, 18 bestelling. FB-* = feedbackronde van dezelfde discipline; de
// granulaire video-jobs (preproductie/shoot/edit) rollen naar 'video_fotografie'.
const DISCIPLINE_MAP = {
  1: 'strategie',
  2: 'branding', 3: 'branding',
  4: 'video_fotografie', 5: 'video_fotografie', 6: 'video_fotografie', 7: 'video_fotografie', 8: 'video_fotografie',
  9: 'webdesign', 10: 'webdesign', 11: 'webdesign', 17: 'webdesign',
  12: 'seo', 13: 'social', 14: 'ads', 15: 'automation', 16: 'opleiding',
  // 0 (projectmanagement) en 18 (bestelling) bewust ongemapt -> '' (val terug op lijst/naam)
};
export function disciplineMapper(typeJobValue) {
  if (typeJobValue == null || typeJobValue === '') return '';
  const n = Number(typeJobValue);
  if (!Number.isFinite(n)) return '';
  return DISCIPLINE_MAP[n] || '';
}
// Fallback: als TYPE JOB niet (correct) is ingevuld, leid de discipline af uit de LIJSTNAAM.
// Projecten zijn in ClickUp georganiseerd in disciplineе-lijsten (Webdesign, Branding, Video-en
// fotografie, ...), dus de lijst is een betrouwbare bron. Zo verschijnen altijd ALLE projecten.
export function disciplineFromList(listName) {
  const n = String(listName || '').toLowerCase();
  if (!n) return '';
  if (n.includes('webdesign') || n.includes('website')) return 'webdesign';
  if (n.includes('video') || n.includes('fotograf') || n.includes('content')) return 'video_fotografie';
  if (n.includes('brand') || n.includes('grafis')) return 'branding';
  if (n.includes('seo') || n.includes('geo')) return 'seo';
  if (n.includes('social')) return 'social';
  if (n.includes('adverteren') || n.includes('advertentie') || n.includes(' ads')) return 'ads';
  if (n.includes('strategie')) return 'strategie';
  if (n.includes('opleiding')) return 'opleiding';
  if (n.includes('automation') || n.includes('automatisat')) return 'automation';
  return '';
}

// Laatste vangnet: leid discipline af uit de TAAKNAAM. Subtaken dragen niet altijd
// een correcte TYPE JOB (bv. de subtaak 'Webdesign - X' staat op typeJob=0/PM), maar
// de naam is dan wél sprekend. Enkel als typeJob én lijst niets opleveren.
export function disciplineFromName(name) {
  const n = String(name || '').toLowerCase();
  if (!n) return '';
  if (n.includes('webdesign') || n.includes('website') || n.includes('webdev') || n.includes('figma') || n.includes('livegang') || n.includes('hosting')) return 'webdesign';
  if (n.includes('video') || n.includes('fotograf') || n.includes(' foto') || n.includes('montage') || n.includes('cameraman') || n.includes('shoot') || n.includes('nabewerking') || n.includes('headervideo')) return 'video_fotografie';
  if (n.includes('branding') || n.includes('logo') || n.includes('huisstijl') || n.includes('stylesheet') || n.includes('rebranding')) return 'branding';
  if (n.includes('seo') || n.includes('zoekmachine')) return 'seo';
  if (n.includes('social')) return 'social';
  if (n.includes('advertentie') || n.includes('adverteren') || n.includes('campagne')) return 'ads';
  if (n.includes('strategie')) return 'strategie';
  if (n.includes('opleiding')) return 'opleiding';
  if (n.includes('automation') || n.includes('automatisat')) return 'automation';
  return '';
}

// disciplineOf: de beste discipline-gok voor één (sub)taak. Volgorde: TYPE JOB ->
// lijstnaam -> taaknaam. Kan '' teruggeven (bv. een pure PM-/herinneringstaak).
export function disciplineOf(task) {
  let d = disciplineMapper(getCF(task, FIELD.typeJob));
  if (!d) d = disciplineFromList(task && task.list && task.list.name);
  if (!d) d = disciplineFromName(task && task.name);
  return d;
}

// Haalt de VOLLEDIGE taakboom (parents + alle subtaken, diep) voor één bedrijf op via
// de team-task-filter met subtasks=true. LET OP: subtasks=true is GEEN superset van
// subtasks=false in ClickUp (sommige losse top-level taken vallen weg), dus dit dient
// ENKEL als subtaak-/discipline-bron, NOOIT als bron voor de projectlijst zelf.
export async function fetchBedrijfTree(env, bedrijfId) {
  const cf = `[{"field_id":"${FIELD.bedrijf}","operator":"ANY","value":["${bedrijfId}"]}]`;
  const enc = encodeURIComponent(cf);
  const all = await pageAll(env, (page) =>
    `/team/${TEAM_ID}/task?subtasks=true&include_closed=true&page=${page}&custom_fields=${enc}`);
  // index op directe parent-id
  const childrenByParent = new Map();
  for (const t of all) {
    const p = t.parent ? String(t.parent) : '';
    if (!p) continue;
    if (!childrenByParent.has(p)) childrenByParent.set(p, []);
    childrenByParent.get(p).push(t);
  }
  return { all, childrenByParent };
}

// Alle AFSTAMMELINGEN (diep) van een taak-id, via de childrenByParent-index. Cyclus-veilig.
export function descendantsOf(rootId, childrenByParent) {
  const out = [];
  const seen = new Set();
  const stack = [...(childrenByParent.get(String(rootId)) || [])];
  while (stack.length) {
    const t = stack.pop();
    const id = String(t.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(t);
    const kids = childrenByParent.get(id);
    if (kids) for (const k of kids) stack.push(k);
  }
  return out;
}

// labels[] voor een hoofdtaak: de disciplines van haar DIRECTE kinderen (de 'types jobs'
// zoals branding/webdesign/video), gededupliceerd. Plus de eigen niet-PM TYPE JOB. Valt
// terug op lijst/naam als er niets is (kinderloze losse taak). Volgorde = vaste discipline-
// volgorde voor een rustige weergave.
const DISCIPLINE_ORDER = ['strategie', 'branding', 'video_fotografie', 'webdesign', 'copywriting', 'seo', 'social', 'ads', 'automation', 'opleiding'];
export function labelsForProject(topTask, directChildren) {
  const set = new Set();
  for (const c of (directChildren || [])) {
    const d = disciplineOf(c);
    if (d) set.add(d);
  }
  const ownTj = disciplineMapper(getCF(topTask, FIELD.typeJob)); // eigen niet-PM discipline
  if (ownTj) set.add(ownTj);
  if (set.size === 0) {
    const f = disciplineFromList(topTask && topTask.list && topTask.list.name) || disciplineFromName(topTask && topTask.name);
    if (f) set.add(f);
  }
  const arr = [...set];
  arr.sort((a, b) => {
    const ia = DISCIPLINE_ORDER.indexOf(a), ib = DISCIPLINE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return arr;
}

// Herkent pure PM-/herinnering-/voorbereidings-/fase-koptaken die geen opleverstap zijn.
function isProcesNoise(name) {
  const n = String(name || '').toLowerCase().trim();
  if (!n) return true;
  if (/^\[?\s*(herinnering|reminder)\b/.test(n)) return true;     // [Herinnering PM: ...]
  if (/\bpm\b.*doorsturen|vragen voor livegang/.test(n)) return true;
  if (/^voorbereiding\b/.test(n)) return true;
  if (/^fase\s*\d/.test(n)) return true;                          // 'Fase 1 - ...' koptaken
  if (/^\[aan te vullen\]/.test(n)) return true;                  // placeholder-taken
  if (/^checklist\b/.test(n)) return true;                        // interne checklist
  if (/^feedbackmeeting\b/.test(n)) return true;                  // interne meeting-prep
  return false;
}

// Bouwt het proces-overzicht van één project uit zijn afstammelingen (of de taak zelf als
// die kinderloos is): opgeleverd (+linkjes), wacht-op-feedback (+feedbackknop), in productie,
// een meeting-blok en afgeleide acties. Truthful: enkel uit echte ClickUp-velden.
export function buildProces(rootTask, descendants) {
  const pool = (descendants && descendants.length) ? descendants : [rootTask];
  const steps = [];
  for (const s of pool) {
    // ruis eruit (maar root altijd houden): PM-/herinnering-/fase-koptaken én de interne
    // FB-feedbackrondes (TYPE JOB 3/5/8/10) zijn geen klant-opleverstappen.
    const tjNum = Number(getCF(s, FIELD.typeJob));
    const isInterneFeedback = tjNum === 3 || tjNum === 5 || tjNum === 8 || tjNum === 10;
    if (s !== rootTask && (isProcesNoise(s.name) || isInterneFeedback)) continue;
    const st = statusMapper(s.status);
    const deliv = parseDeliverables(getCF(s, FIELD.deliverablesRaw));
    const drive = str(getCF(s, FIELD.driveFolder));
    const fb = str(getCF(s, FIELD.feedbackLink));
    const links = deliv.slice();
    if (drive && /^https?:\/\//i.test(drive)) links.push({ label: 'Projectmap', url: drive, type: 'folder' });
    let staat;
    if (st.key === 'done') staat = 'opgeleverd';
    else if (st.key === 'doorgestuurd') staat = 'wacht_feedback';
    else if (st.key === 'to_do') staat = 'te_doen';
    else staat = 'bezig';
    steps.push({
      task_id: str(s.id),
      naam: str(s.name),
      discipline: disciplineOf(s),
      staat,
      status_label: st.label,
      pct: st.pct,
      links,
      feedback_link: (staat === 'wacht_feedback' && fb && /^https?:\/\//i.test(fb)) ? fb : '',
      datum: fmtDateFromMs(s.due_date),
    });
  }
  const opgeleverd = steps.filter((s) => s.staat === 'opgeleverd');
  const wacht_feedback = steps.filter((s) => s.staat === 'wacht_feedback');
  const in_productie = steps.filter((s) => s.staat === 'bezig');
  const te_doen = steps.filter((s) => s.staat === 'te_doen');

  // geaggregeerde linkjes (alle opleveringen, inclusief die op de hoofdtaak zelf), gededupliceerd.
  const links = [];
  const linkSeen = new Set();
  const addLinks = (arr) => { for (const l of (arr || [])) { if (l && l.url && !linkSeen.has(l.url)) { linkSeen.add(l.url); links.push(l); } } };
  for (const s of steps) addLinks(s.links);
  addLinks(parseDeliverables(getCF(rootTask, FIELD.deliverablesRaw)));

  // compacte 'loopt nu'-samenvatting (zodat de klant niet 15 interne stappen ziet).
  const lopend = in_productie.concat(te_doen);
  const loopt = {
    aantal: lopend.length,
    disciplines: [...new Set(lopend.map((s) => s.discipline).filter(Boolean))],
  };

  // meeting-blok uit de Meeting-relatie op de root (of een afstammeling die er één draagt)
  let meeting = { gepland: false, naam: '', task_id: '' };
  const mRel = getRelationIds(rootTask, FIELD.meeting);
  if (mRel.length) meeting = { gepland: true, naam: '', task_id: str(mRel[0]) };

  // afgeleide acties: enkel nog feedback-acties (inplannen loopt nu via plan-items/Kan beginnen,
  // niet meer als generieke 'plan een afspraak'-knop). De frontend rendert de feedback bovendien
  // IN-PORTAL (geen externe link meer).
  const acties = [];
  for (const w of wacht_feedback) {
    acties.push({ type: 'feedback', tekst: `Geef je feedback op: ${w.naam}`, url: w.feedback_link, task_id: w.task_id });
  }

  return {
    aantal_stappen: steps.length,
    opgeleverd,
    wacht_feedback,
    in_productie,
    te_doen,
    loopt,
    links,
    meeting,
    acties,
  };
}

// Bepaalt of er bij een project een moment in te plannen valt, en welk type. Enkel twee
// scenario's tonen de plan-module; in alle andere gevallen verdwijnt ze.
//  - 'shoot'   : er is een nog-te-plannen shoot (TYPE JOB = Shoot/6) -> shootkalender-widget.
//  - 'meeting' : het woord 'meeting' staat letterlijk in de naam/beschrijving van de (sub)taak.
//  - 'none'    : niets te plannen.
// Enkel OPEN taken (status.type 'open' = te doen) tellen; al afgehandelde shoots/meetings
// hoeven niet meer ingepland te worden. Shoot heeft voorrang (concrete kalenderboeking).
// Een (sub)taak is door de KLANT in te plannen wanneer:
//  - wij 'Kan beginnen' hebben aangevinkt (veld gezet -> value-key aanwezig), EN
//  - er nog GEEN due_date staat (gezette due_date = reeds ingepland -> melding weg), EN
//  - de taak niet 'done'/afgerond is, EN
//  - het een shoot (TYPE JOB = Shoot/6) of een meeting ('meeting' in naam/beschrijving) is.
// Meerdere shoots/meetings tegelijk kan (bv. contentproject met meerdere shootdata).
function kanBeginnenGezet(t) {
  return getCF(t, FIELD.kanBeginnen) != null;       // enkel optie 'JA'; gezet = value-key aanwezig
}
function heeftDueDate(t) {
  const d = Number(t && t.due_date);
  return Number.isFinite(d) && d > 0;
}
function isDoneTask(t) {
  const ty = String(t && t.status && t.status.type || '').toLowerCase();
  return ty === 'done' || ty === 'closed' || isAfgerondStatus(t && t.status);
}
function planTypeOf(t) {
  if (Number(getCF(t, FIELD.typeJob)) === 6) return 'shoot';                         // TYPE JOB = Shoot
  const hay = (String(t.name || '') + ' ' + String(t.description || t.text_content || '')).toLowerCase();
  if (hay.indexOf('meeting') >= 0) return 'meeting';
  return '';
}
export function buildPlan(rootTask, descendants) {
  const pool = [rootTask].concat(descendants || []);
  const items = [];
  const seen = new Set();
  for (const t of pool) {
    const id = str(t.id);
    if (seen.has(id)) continue;
    if (!kanBeginnenGezet(t)) continue;        // wij hebben 't nog niet vrijgegeven
    if (heeftDueDate(t)) continue;             // reeds ingepland (due date) -> geen melding
    if (isDoneTask(t)) continue;               // afgerond -> geen melding
    const type = planTypeOf(t);
    if (!type) continue;                       // enkel shoots/meetings zijn plannbaar
    seen.add(id);
    items.push({ type, task_id: id, label: str(t.name) });
  }
  // shoots eerst (concrete kalenderboeking), dan meetings; binnen hetzelfde type op naam
  items.sort((a, b) => (a.type === b.type ? String(a.label).localeCompare(String(b.label)) : (a.type === 'shoot' ? -1 : 1)));
  return { items };
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
// SEC-3: client-geleverde ids (ClickUp-task/-contact, Metricool-post, Drive-file) zijn altijd
// alfanumeriek (+ _ -). Geef een leeg id terug bij elk ander teken, zodat path/param-injectie
// in ClickUp/Metricool-URL's onmogelijk is (bv. '..', '/', '?', '#', spaties). De bestaande
// lege-id-guards/scope-checks weigeren een leeg id daarna automatisch.
const cleanId = (v) => { const s = (v == null ? '' : String(v)).trim(); return /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : ''; };

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
  const taskId = cleanId(body && body.task_id);
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
  // proces-overzicht: DIEPE afstammelingen via de bedrijf-boom. De directe .subtasks bevatten
  // bij meerlaagse projecten (Totaalproject > Webdesign > Fase > job) geen opleveringen; die
  // zitten dieper. Kinderloze taak -> het overzicht toont de taak zelf. Additief: faalt het,
  // dan blijft de detail gewoon werken.
  let proces = { aantal_stappen: 0, opgeleverd: [], wacht_feedback: [], in_productie: [], te_doen: [], loopt: { aantal: 0, disciplines: [] }, links: [], meeting: { gepland: false, naam: '', task_id: '' }, acties: [] };
  let plan = { items: [] };
  try {
    const tree = await fetchBedrijfTree(env, bedrijfId);
    const desc = descendantsOf(taskId, tree.childrenByParent);
    proces = buildProces(task, desc);
    plan = buildPlan(task, desc);
  } catch (e) { /* proces-overzicht + plan zijn additief; nooit de detail breken */ }
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
    proces,                                                   // proces-overzicht: opgeleverd/feedback/meeting/acties
    plan,                                                     // {mode:'shoot'|'meeting'|'none', task_id, label}
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
    sae: [], taken: [],
    proces: { aantal_stappen: 0, opgeleverd: [], wacht_feedback: [], in_productie: [], te_doen: [], loopt: { aantal: 0, disciplines: [] }, links: [], meeting: { gepland: false, naam: '', task_id: '' }, acties: [] },
    plan: { mode: 'none', task_id: '', label: '' },
    comments: [], __ERROR__: err,
  };
}

/* ---- chatList ------------------------------------------------------------ */
export async function chatList(bedrijfId, body, env) {
  const taskId = cleanId(body && body.task_id);
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
  // 1) team-task-filter op 4b1fb333 (ANY), volledig gepagineerd. De projectlijst komt UIT
  //    subtasks=false (de bewezen, volledige top-level set). De subtaak-boom (voor de
  //    discipline-labels per hoofdtaak) komt APART uit fetchBedrijfTree (subtasks=true),
  //    want subtasks=true is geen superset en mist soms losse top-level taken.
  const cf = `[{"field_id":"${FIELD.bedrijf}","operator":"ANY","value":["${bedrijfId}"]}]`;
  const enc = encodeURIComponent(cf);
  const [tasks, tree] = await Promise.all([
    pageAll(env, (page) =>
      `/team/${TEAM_ID}/task?subtasks=false&include_closed=true&page=${page}&custom_fields=${enc}`),
    fetchBedrijfTree(env, bedrijfId),
  ]);
  const childrenByParent = tree.childrenByParent;

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
    // discipline-labels van de hoofdtaak = disciplines van haar DIRECTE subtaken (branding,
    // webdesign, video, ...). Meerdere labels mogelijk (bv. branding + webdesign). De primaire
    // discipline (voor de afgerond-/zichtbaarheidsfilters) = het eerste label.
    const directChildren = childrenByParent.get(String(t.id)) || [];
    const labels = labelsForProject(t, directChildren);
    let discipline = labels[0] || '';

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
          labels,                                               // [discipline,...] -> chips ook bij afgeronde
          opleverdatum: opMs,                                   // epoch-ms (contract)
          heeft_bestanden: parseDeliverables(getCF(t, FIELD.deliverablesRaw)).length > 0,
        });
      }
    }

    // (B) actieve_projecten: enkel OPEN/lopende projecten (goedgekeurde/afgeronde apart in (A)).
    if (!labels.length) continue;                             // geen enkele discipline -> geen project
    if (!labels.some((d) => showVisible(d, t.due_date, now))) continue; // ≥1 label zichtbaar deze maand
    if (isAfgerondStatus(t.status)) continue;                 // done/goedgekeurd/facturatie → afgerond_60d, niet actief
    const st = statusMapper(t.status);
    actieve.push({
      task_id: str(t.id),
      naam: str(t.name),
      discipline,
      labels,                                                 // [discipline,...] -> meerdere chips naast de hoofdtaak
      status: st.key,
      status_label: st.label,
      voortgang_pct: st.pct,
      type: str((t.list && t.list.name) || ''),
      opleverdatum: fmtDateFromMs(t.due_date),
      laatst_geupdatet: fmtDateTimeFromMs(t.date_updated),
      feedback_link: st.key === 'doorgestuurd' ? `https://studio27.be/design-feedback?taskId=${t.id}` : '',
      plan_items: buildPlan(t, descendantsOf(String(t.id), childrenByParent)).items, // plannbare shoots/meetings (Kan beginnen + geen due) -> Start-melding
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
  const taskId = cleanId(body && body.task_id);
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
  const taskId = cleanId(body && body.task_id);
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
  const taskId = cleanId(body && body.task_id);
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
  const taskId = cleanId(body && body.task_id);
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
  const taskId = cleanId(body && body.task_id);
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
  const taskId = cleanId(body && body.task_id);

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

/* ---- meetingBook (algemene/taskloze meeting-boeking; Google-event + invite) ---
 * Aparte, taskloze booker voor de meeting-tunnel in het portaal (Algemene meeting met
 * Ilke, Projectmeeting met Ilke/lead, Nieuw project met Arne). Anders dan `inplannen`:
 *   - werkt ZONDER task (nieuw project / algemeen overleg);
 *   - muteert NOOIT de due_date van een bestaande projecttaak;
 *   - host MOET een @studio27.be-adres zijn (klant kan geen externe "host" injecteren).
 * Maakt een Google-Calendar-event op de GCAL_SUBJECT-agenda met de klant + host als
 * attendees (sendUpdates=all → beiden krijgen een uitnodiging; verschijnt in de
 * host-agenda), met conferenceData (Meet) als body.online. Bij een meegegeven
 * project_task_id: scope-guard fail-CLOSED (klant mag enkel een EIGEN project refereren)
 * + een best-effort context-comment op die taak (geen andere mutatie). De client-email
 * komt — net als bij `inplannen` — uit de body (frontend leest het uit de bedrijf-taak).
 * Output: { ok, event_id, meet_link, html_link }.
 */
export async function meetingBook(bedrijfId, body, env) {
  const hostEmail = str(body && body.host_email).toLowerCase();
  const hostNaam = str(body && body.host_naam) || 'Studio 27';
  // host moet een Studio 27-adres zijn (geen externe injectie via host/attendees).
  if (!/@studio27\.be$/.test(hostEmail)) {
    return { status: 400, body: { ok: false, error: 'invalid_host', message: 'Ongeldige host.' } };
  }

  // optionele projectcontext: scope-guard fail-CLOSED (klant mag enkel een eigen project refereren).
  const taskId = cleanId(body && body.project_task_id);
  if (taskId) {
    const tr = await cu.get(env, `/task/${taskId}`);
    const task = tr.ok && tr.data ? tr.data : { custom_fields: [] };
    const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.write);
    if (!sc.ok) {
      return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot dit project.' } };
    }
  }

  if (!env || !env.SA_CLIENT_EMAIL || !env.SA_PRIVATE_KEY) {
    return { status: 500, body: { ok: false, error: 'sa_not_configured', message: 'Inplannen tijdelijk niet beschikbaar.' } };
  }
  const subject = str(env.GCAL_SUBJECT);
  let token;
  try {
    token = await mintGoogleToken(env, subject, GCAL_SCOPE_EVENTS);
  } catch (e) {
    return { status: 500, body: { ok: false, error: 'token_mint_failed', message: 'Inplannen tijdelijk niet beschikbaar.' } };
  }

  const start = str(body && body.start); // ISO
  const eind = str(body && body.eind);   // ISO
  const online = !!(body && body.online);
  const clientEmail = str(body && body.client_email);
  const clientNaam = str(body && body.client_naam);

  // attendees = klant (indien bekend) + host. sendUpdates=all stuurt beiden een invite.
  const attendees = [];
  if (clientEmail) attendees.push(clientNaam ? { email: clientEmail, displayName: clientNaam } : { email: clientEmail });
  attendees.push({ email: hostEmail, displayName: hostNaam });

  const event = {
    summary: str(body && body.titel) || ('Meeting met ' + hostNaam),
    description: str(body && body.beschrijving),
    location: str(body && body.locatie),
    start: { dateTime: start },
    end: { dateTime: eind },
    attendees,
  };
  if (online) {
    event.conferenceData = {
      createRequest: {
        requestId: 's27-mb-' + (taskId || 'evt') + '-' + Date.now(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  let eventId = '', meetLink = '', htmlLink = '';
  try {
    const calId = encodeURIComponent(subject || 'primary');
    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?conferenceDataVersion=1&sendUpdates=all`,
      { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(event) }
    );
    const data = await r.json().catch(() => ({}));
    if (r.ok && data && data.id) {
      eventId = str(data.id); htmlLink = str(data.htmlLink); meetLink = str(data.hangoutLink);
    } else {
      // anders dan `inplannen` (dat fail-open ClickUp blijft updaten) heeft dit endpoint
      // ENKEL het event als resultaat → een mislukt event is een echte fout (geen stille ok).
      return { status: 502, body: { ok: false, error: 'event_failed', message: 'De afspraak kon niet in de agenda gezet worden.' } };
    }
  } catch (e) {
    return { status: 502, body: { ok: false, error: 'event_failed', message: 'De afspraak kon niet in de agenda gezet worden.' } };
  }

  // best-effort context-comment op de projecttaak (GEEN due_date-mutatie).
  if (taskId) {
    const wanneer = str(body && body.when_label) || start;
    const c = '📅 [MEETING GEPLAND VIA PORTAAL]\n\n' +
      `Klant plande een overleg met ${hostNaam}` + (wanneer ? ` op ${wanneer}` : '') + '.\n' +
      (online ? (meetLink ? `Online (Google Meet): ${meetLink}\n` : 'Online (Google Meet).\n') : 'Locatie: Studio 27.\n') +
      'Het overleg staat in de agenda (uitnodiging verstuurd). De projectdeadline is NIET gewijzigd.';
    try { await cu.comment(env, taskId, c, true); } catch (e) { /* best-effort */ }
  }

  return { status: 200, body: { ok: true, event_id: eventId, meet_link: meetLink, html_link: htmlLink } };
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
  const contactId = cleanId(body && body.contact_id);
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
  const contactId = cleanId(body && body.contact_id);
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
  const mediaArr = Array.isArray(p && p.media) ? p.media.map((m) => str(m)).filter(Boolean) : (p && p.media ? [str(p.media)] : []);
  const text = str(p && p.text);
  const datum = (p && p.publicationDate && str(p.publicationDate.dateTime)) || '';
  const hashtags = (text.match(/#[A-Za-z0-9_]+/g) || []);
  return {
    id: str(p && p.id),
    uuid: str(p && p.uuid),                  // nodig voor bewerken (round-trip naar Metricool)
    datum,                                   // "YYYY-MM-DDTHH:mm:ss" (FE _parseDatum verwerkt dit)
    tekst: encodeURIComponent(text),         // FE doet decodeURIComponent
    media: mediaArr[0] || '',
    media_all: mediaArr,                     // volledige media-array (carrousel)
    netwerken,                               // CSV "facebook,instagram"
    providers: providers.map((x) => ({ network: str(x && x.network).toLowerCase(), status: str(x && x.status) })),
    hashtags,                                // ["#tag",...] (uit de tekst)
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
  const start = mcStamp(Date.now() - 122 * 86400000);   // ~4 maanden terug
  const end = mcStamp(Date.now() + 122 * 86400000);     // ~4 maanden vooruit
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
  // Het volledige venster ophalen (4 mnd terug + vooruit), maar concepten/drafts blijven UIT de
  // klant-weergave (op vraag). De editor werkt dus enkel op niet-draft posts.
  let posts = (arr || []).filter((p) => p && p.id != null).map(mcMapPost).filter((p) => !p.draft);
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

/* ---- metricoolStats (READ) - KPI-dashboard + trend (fase 1) ----------------
 * Per gekoppeld netwerk een tijdreeks via GET /api/v2/analytics/timelines
 * (params: from,to,timezone,blogId,userId,network,metric,subject). Aggregeert tot
 * KPI's (volgers, groei, bereik, engagement) + een trend. Fail-soft: netwerken/metrics
 * die falen worden overgeslagen, nooit 5xx (consistent met de andere Metricool-reads).
 */
const MC_NET_KEYS = { instagramData: 'instagram', facebookData: 'facebook', linkedinData: 'linkedin', tiktokData: 'tiktok', youtubeData: 'youtube' };
const MC_NET_LABEL = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube' };
// per netwerk: [metricNaam, subject] voor followers / reach / interactions (live geverifieerde metric-namen).
const MC_STAT_METRICS = {
  instagram: { followers: ['Followers', 'account'], reach: ['reach', 'account'], inter: ['postsInteractions', 'account'] },
  facebook:  { followers: ['pageFollows', 'account'], reach: ['pageImpressions', 'account'], inter: ['postsInteractions', 'account'] },
  tiktok:    { followers: ['followers_count', 'account'], reach: ['video_views', 'account'], inter: ['likes', 'account'] },
  youtube:   { followers: ['totalSubscribers', 'account'], reach: ['views', 'account'], inter: null },
  linkedin:  { followers: ['followers', 'account'], reach: ['impressions', 'account'], inter: ['interactions', 'account'] }, // best-effort
};
async function mcTimeline(env, blogId, userId, network, metric, subject, from, to) {
  const qs = new URLSearchParams({ from, to, timezone: METRICOOL_TZ, blogId: String(blogId), network, metric, subject });
  if (userId) qs.set('userId', String(userId));
  let r;
  try { r = await fetch(`${METRICOOL_BASE}/analytics/timelines?${qs.toString()}`, { headers: mcHeaders(env) }); }
  catch (e) { return []; }
  if (!r.ok) return [];
  const d = await r.json().catch(() => null);
  const vals = (d && d.data && d.data[0] && Array.isArray(d.data[0].values)) ? d.data[0].values : [];
  return vals.map((x) => ({ t: Date.parse(x.dateTime) || 0, v: Number(x.value) || 0 })).filter((x) => x.t).sort((a, b) => a.t - b.t);
}
const mcSum = (s) => (s || []).reduce((a, x) => a + (Number(x.v) || 0), 0);
const mcLast = (s) => (s && s.length ? Number(s[s.length - 1].v) || 0 : 0);
const mcFirst = (s) => (s && s.length ? Number(s[0].v) || 0 : 0);

// Aggregeert de KPI-totalen voor één venster [from,to] over de gekoppelde netwerken.
async function mcStatsWindow(env, blogId, userId, networks, from, to) {
  const perNet = await Promise.all(networks.map(async (net) => {
    const m = MC_STAT_METRICS[net]; if (!m) return null;
    const [fSer, rSer, iSer] = await Promise.all([
      m.followers ? mcTimeline(env, blogId, userId, net, m.followers[0], m.followers[1], from, to) : Promise.resolve([]),
      m.reach ? mcTimeline(env, blogId, userId, net, m.reach[0], m.reach[1], from, to) : Promise.resolve([]),
      m.inter ? mcTimeline(env, blogId, userId, net, m.inter[0], m.inter[1], from, to) : Promise.resolve([]),
    ]);
    const followers = mcLast(fSer);
    const growth = fSer.length ? (mcLast(fSer) - mcFirst(fSer)) : 0;
    const reach = mcSum(rSer);
    const interactions = mcSum(iSer);
    if (!followers && !reach && !interactions) return null;
    return { network: net, label: MC_NET_LABEL[net] || net, followers, growth, reach, interactions, trend: fSer };
  }));
  const nets = perNet.filter(Boolean);
  const totals = nets.reduce((a, n) => ({
    followers: a.followers + (n.followers || 0),
    growth: a.growth + (n.growth || 0),
    reach: a.reach + (n.reach || 0),
    interactions: a.interactions + (n.interactions || 0),
  }), { followers: 0, growth: 0, reach: 0, interactions: 0 });
  totals.engagementRate = totals.reach > 0 ? Math.round((totals.interactions / totals.reach) * 1000) / 10 : 0; // %
  return { nets, totals };
}
// RIJKE variant (team-rapportage): zoals mcStatsWindow, maar behoudt PER NETWERK de volledige
// dag-tijdreeksen voor followers/reach/interactions (voor de per-netwerk-grafieken) + engagementRate.
async function mcStatsWindowRich(env, blogId, userId, networks, from, to) {
  const toY = (s) => s.map((x) => ({ date: msToBrusselsYmd(x.t), value: x.v }));
  const perNet = await Promise.all(networks.map(async (net) => {
    const m = MC_STAT_METRICS[net]; if (!m) return null;
    const [fSer, rSer, iSer] = await Promise.all([
      m.followers ? mcTimeline(env, blogId, userId, net, m.followers[0], m.followers[1], from, to) : Promise.resolve([]),
      m.reach ? mcTimeline(env, blogId, userId, net, m.reach[0], m.reach[1], from, to) : Promise.resolve([]),
      m.inter ? mcTimeline(env, blogId, userId, net, m.inter[0], m.inter[1], from, to) : Promise.resolve([]),
    ]);
    const followers = mcLast(fSer), growth = fSer.length ? (mcLast(fSer) - mcFirst(fSer)) : 0;
    const reach = mcSum(rSer), interactions = mcSum(iSer);
    if (!followers && !reach && !interactions) return null;
    return {
      network: net, label: MC_NET_LABEL[net] || net, followers, growth, reach, interactions,
      engagementRate: reach > 0 ? Math.round((interactions / reach) * 1000) / 10 : 0,
      series: { followers: toY(fSer), reach: toY(rSer), interactions: toY(iSer) },
    };
  }));
  const nets = perNet.filter(Boolean);
  const totals = nets.reduce((a, n) => ({
    followers: a.followers + (n.followers || 0), growth: a.growth + (n.growth || 0),
    reach: a.reach + (n.reach || 0), interactions: a.interactions + (n.interactions || 0),
  }), { followers: 0, growth: 0, reach: 0, interactions: 0 });
  totals.engagementRate = totals.reach > 0 ? Math.round((totals.interactions / totals.reach) * 1000) / 10 : 0;
  return { nets, totals };
}
function mcParseStamp(s) { const ms = Date.parse(String(s || '')); return isNaN(ms) ? 0 : ms; }
// vergelijkings-venster: zelfde lengte ervoor / één maand ervoor / één jaar ervoor.
function mcShiftWindow(fromMs, toMs, mode) {
  if (mode === 'previous') { const len = Math.max(0, toMs - fromMs); return [fromMs - len, fromMs]; }
  const shift = (ms) => { const d = new Date(ms); if (mode === 'month') d.setUTCMonth(d.getUTCMonth() - 1); else d.setUTCFullYear(d.getUTCFullYear() - 1); return d.getTime(); };
  return [shift(fromMs), shift(toMs)];
}
export async function metricoolStats(bedrijfId, body, env) {
  // brand-resolutie (blogId/userId/gekoppelde netwerken) — gedeelde helper (geen drift met de rich-variant).
  const { blogId, userId, networks } = await mcResolveBrand(env, bedrijfId);
  if (!blogId) return { status: 200, body: { ok: true, linked: false } };
  // venster: expliciete from/to (ISO) of legacy 'days'. Optionele vergelijkings-modus.
  let fromMs, toMs;
  const bFrom = mcParseStamp(body && body.from), bTo = mcParseStamp(body && body.to);
  if (bFrom && bTo && bTo > bFrom) { fromMs = bFrom; toMs = bTo; }
  else { const days = Math.min(400, Math.max(1, Number(body && body.days) || 90)); toMs = Date.now(); fromMs = toMs - days * 86400000; }
  const from = mcStamp(fromMs), to = mcStamp(toMs);
  const days = Math.max(1, Math.round((toMs - fromMs) / 86400000));
  const compare = ['previous', 'month', 'year'].indexOf(str(body && body.compare)) >= 0 ? str(body.compare) : 'none';

  const cur = await mcStatsWindow(env, blogId, userId, networks, from, to);
  let prevTotals = null, compareLabel = '';
  if (compare !== 'none') {
    const sh = mcShiftWindow(fromMs, toMs, compare);
    const prev = await mcStatsWindow(env, blogId, userId, networks, mcStamp(sh[0]), mcStamp(sh[1]));
    prevTotals = prev.totals;
    compareLabel = compare === 'previous' ? 'vorige periode' : (compare === 'month' ? 'vorige maand' : 'vorig jaar');
  }
  // trend = followers per dag van het netwerk met de langste reeks (huidig venster).
  const primary = cur.nets.slice().sort((a, b) => (b.trend.length - a.trend.length))[0];
  const trend = (primary && primary.trend) ? primary.trend.map((x) => ({ date: msToBrusselsYmd(x.t), value: x.v })) : [];
  const networksOut = cur.nets.map((n) => ({ network: n.network, label: n.label, followers: n.followers, growth: n.growth, reach: n.reach, interactions: n.interactions }));
  return { status: 200, body: { ok: true, linked: true, brandId: blogId, period: { from, to, days, compare }, totals: cur.totals, prevTotals, compareLabel, networks: networksOut, trend, trendLabel: primary ? primary.label : '' } };
}

// Brand-resolver (blogId/userId/gekoppelde netwerken) — gedeeld tussen de Metricool-reads.
async function mcResolveBrand(env, bedrijfId) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const blogId = br.ok && br.data ? str(getCF(br.data, FIELD.metricoolId)).trim() : '';
  if (!blogId || !str(env && env.METRICOOL_API_KEY)) return { blogId: '', userId: '', networks: [] };
  let userId = '', networks = [];
  try {
    const r = await fetch(`${METRICOOL_ADMIN}/admin/simpleProfiles`, { headers: mcHeaders(env) });
    const list = r.ok ? await r.json().catch(() => []) : [];
    const brand = (Array.isArray(list) ? list : []).find((b) => String(b && b.id) === String(blogId));
    if (brand) { userId = str(brand.userId || brand.ownerUserId || ''); const nd = brand.networksData || {}; networks = Object.keys(MC_NET_KEYS).filter((k) => nd[k]).map((k) => MC_NET_KEYS[k]); }
  } catch (e) { /* fail-soft */ }
  if (!userId) userId = str(env && env.METRICOOL_USER_ID).trim();
  if (!networks.length) networks = ['instagram', 'facebook'];
  return { blogId, userId, networks };
}

/* ---- metricoolStatsRich (READ, ADMIN-only) — uitgebreide social-rapportage --------
 * Voor @studio27.be-teamleden (worker gate't op is_staff). Bundelt in ÉÉN call: account-KPI's
 * met periode-vergelijking, PER-NETWERK breakdown (met eigen dag-tijdreeksen + per-netwerk
 * vergelijking), én de volledige post-insights (top-posts, beste momenten, formats, hashtags).
 * Account uitsluitend uit de bedrijf-taak (FIELD.metricoolId); fail-soft, nooit 5xx.
 */
export async function metricoolStatsRich(bedrijfId, body, env) {
  const { blogId, userId, networks } = await mcResolveBrand(env, bedrijfId);
  if (!blogId) return { status: 200, body: { ok: true, linked: false } };

  let fromMs, toMs;
  const bFrom = mcParseStamp(body && body.from), bTo = mcParseStamp(body && body.to);
  if (bFrom && bTo && bTo > bFrom) { fromMs = bFrom; toMs = bTo; }
  else { const days = Math.min(400, Math.max(1, Number(body && body.days) || 90)); toMs = Date.now(); fromMs = toMs - days * 86400000; }
  const from = mcStamp(fromMs), to = mcStamp(toMs);
  const days = Math.max(1, Math.round((toMs - fromMs) / 86400000));
  const compare = ['previous', 'month', 'year'].indexOf(str(body && body.compare)) >= 0 ? str(body.compare) : 'none';

  // huidig venster (rijk, met series) + post-insights over hetzelfde venster — parallel.
  const [cur, post] = await Promise.all([
    mcStatsWindowRich(env, blogId, userId, networks, from, to),
    mcPostStatsCore(env, blogId, userId, networks, Math.min(180, days), from, to).catch(() => null),
  ]);
  let prevTotals = null, prevByNet = {}, compareLabel = '';
  if (compare !== 'none') {
    const sh = mcShiftWindow(fromMs, toMs, compare);
    const prev = await mcStatsWindow(env, blogId, userId, networks, mcStamp(sh[0]), mcStamp(sh[1]));
    prevTotals = prev.totals;
    prev.nets.forEach((n) => { prevByNet[n.network] = { followers: n.followers, growth: n.growth, reach: n.reach, interactions: n.interactions, engagementRate: n.reach > 0 ? Math.round((n.interactions / n.reach) * 1000) / 10 : 0 }; });
    compareLabel = compare === 'previous' ? 'vorige periode' : (compare === 'month' ? 'vorige maand' : 'vorig jaar');
  }
  const networksOut = cur.nets.map((n) => ({ network: n.network, label: n.label, followers: n.followers, growth: n.growth, reach: n.reach, interactions: n.interactions, engagementRate: n.engagementRate, prev: prevByNet[n.network] || null, series: n.series }));
  const primary = cur.nets.slice().sort((a, b) => ((b.series.followers.length) - (a.series.followers.length)))[0];
  const trend = primary ? primary.series.followers : [];
  return { status: 200, body: { ok: true, linked: true, brandId: blogId, period: { from, to, days, compare },
    totals: cur.totals, prevTotals, compareLabel, networks: networksOut, trend, trendLabel: primary ? primary.label : '',
    posts: post ? post.posts : [], postSummary: post ? post.summary : null, postNetworks: post ? post.networks : [],
    formats: post ? post.formats : [], hashtags: post ? post.hashtags : [], bestTimes: post ? post.bestTimes : [] } };
}

/* ---- metricoolPostStats (READ) - post-performance per gepubliceerde post (fase 2) ----
 * Per gekoppeld netwerk GET /api/v2/analytics/posts/{network} (live geverifieerde shapes).
 * Levert per post: bereik, interacties, likes/comments/shares, views, engagement-rate,
 * thumbnail + permalink. Plus aggregaten en een per-netwerk-samenvatting. Fail-soft:
 * netwerken/posts die falen worden overgeslagen, nooit 5xx (zoals de andere Metricool-reads).
 */
const MC_NUM = (v) => Number(v) || 0;
function mcPostDate(p) {
  const d = (p && (p.publishedAt || p.created)) || null;
  if (d && d.dateTime) return str(d.dateTime);            // {dateTime,timezone}
  if (p && p.createTime) return str(p.createTime);        // tiktok "YYYY-MM-DDTHH:mm:ss+02:00"
  if (p && p.timestamp) { try { return new Date(Number(p.timestamp)).toISOString().slice(0, 19); } catch (e) {} }
  return '';
}
// Eén ruwe post (per netwerk) -> uniforme performance-shape voor de FE.
function mcMapPostStat(net, p) {
  let text = '', image = '', url = '', reach = 0, impressions = 0, inter = 0, likes = 0, comments = 0, shares = 0, views = 0, eng = 0;
  const type = str(p && p.type);
  if (net === 'instagram') {
    text = str(p.content); image = str(p.imageUrl); url = str(p.url);
    reach = MC_NUM(p.reach); inter = MC_NUM(p.interactions); likes = MC_NUM(p.likes); comments = MC_NUM(p.comments); shares = MC_NUM(p.shares); views = MC_NUM(p.views); eng = MC_NUM(p.engagement);
  } else if (net === 'facebook') {
    text = str(p.text); image = str(p.picture); url = str(p.link);
    reach = MC_NUM(p.impressionsUnique); impressions = MC_NUM(p.impressions); likes = MC_NUM(p.reactions); comments = MC_NUM(p.comments); shares = MC_NUM(p.shares); inter = likes + comments + shares; eng = MC_NUM(p.engagement);
  } else if (net === 'linkedin') {
    text = str(p.comment || p.title); image = ''; url = str(p.url);
    reach = MC_NUM(p.impressions); impressions = MC_NUM(p.impressions); likes = MC_NUM(p.likes); inter = likes; eng = MC_NUM(p.engagement);
  } else if (net === 'tiktok') {
    text = str(p.videoDescription || p.title); image = str(p.coverImageUrl); url = str(p.shareUrl);
    reach = MC_NUM(p.reach); views = MC_NUM(p.viewCount); likes = MC_NUM(p.likeCount); comments = MC_NUM(p.commentCount); shares = MC_NUM(p.shareCount); inter = likes + comments + shares; eng = MC_NUM(p.engagement);
  } else if (net === 'youtube') {
    text = str(p.title); image = str(p.thumbnailUrl); url = str(p.watchUrl);
    views = MC_NUM(p.views); reach = views; likes = MC_NUM(p.likes); comments = MC_NUM(p.comments); shares = MC_NUM(p.shares); inter = likes + comments + shares;
  } else { return null; }
  if (!reach) reach = impressions || views;
  const engagementRate = reach > 0 ? Math.round((inter / reach) * 1000) / 10 : 0; // interacties / bereik, %
  const id = str((p && (p.postId || p.videoId)) || url);
  if (!id && !reach && !inter && !views) return null;
  const hashtags = (text.match(/#[A-Za-z0-9_]+/g) || []).map((t) => t.toLowerCase());   // uit de VOLLEDIGE tekst (vóór inkorten)
  return {
    id, network: net, label: MC_NET_LABEL[net] || net, date: mcPostDate(p),
    text: text.length > 280 ? text.slice(0, 280) : text, image, url, type, hashtags,
    reach, impressions, interactions: inter, likes, comments, shares, views,
    engagement: eng, engagementRate,
  };
}
// post-type -> klantvriendelijk format-label (per netwerk).
function mcFormatLabel(net, type) {
  const t = str(type).toUpperCase();
  if (net === 'youtube' || net === 'tiktok') return 'Reel / video';
  if (/REEL/.test(t)) return 'Reel / video';
  if (/VIDEO/.test(t)) return 'Video';
  if (/CAROUSEL|ALBUM/.test(t)) return 'Carrousel';
  if (/IMAGE|PHOTO|FEED_IMAGE/.test(t)) return 'Foto';
  if (/STATUS|TEXT|SHARE|LINK/.test(t)) return 'Tekst / link';
  return 'Overig';
}
// wall-clock weekdag (0=zo) + uur uit een Metricool-datumstring (lokaal, offset-agnostisch).
function mcDayHour(iso) {
  const m = String(iso || '').match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})/);
  if (!m) return null;
  return { dow: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay(), hour: +m[4] };
}
async function mcFetchPosts(env, blogId, userId, net, from, to) {
  const qs = new URLSearchParams({ from, to, timezone: METRICOOL_TZ, blogId: String(blogId) });
  if (userId) qs.set('userId', String(userId));
  let r;
  try { r = await fetch(`${METRICOOL_BASE}/analytics/posts/${net}?${qs.toString()}`, { headers: mcHeaders(env) }); }
  catch (e) { return []; }
  if (!r.ok) return [];
  const d = await r.json().catch(() => null);
  const arr = d && Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
  return arr.map((p) => mcMapPostStat(net, p)).filter(Boolean);
}
// Kern: haalt + aggregeert post-performance voor een brand. Los van ClickUp zodat lokaal testbaar.
// fromStamp/toStamp optioneel: expliciet venster (rijke rapportage); anders 'laatste N dagen'.
async function mcPostStatsCore(env, blogId, userId, networks, days, fromStamp, toStamp) {
  const from = fromStamp || mcStamp(Date.now() - days * 86400000);
  const to = toStamp || mcStamp(Date.now());
  const perNet = await Promise.all(networks.map((net) => mcFetchPosts(env, blogId, userId, net, from, to).catch(() => [])));
  let posts = [];
  const netAgg = {};
  networks.forEach((net, i) => {
    const list = perNet[i] || [];
    if (list.length) netAgg[net] = list;
    posts = posts.concat(list);
  });
  // nieuwste eerst; cap op 40 voor de FE (zware payload vermijden).
  posts.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  const capped = posts.slice(0, 40);
  // aggregaten over ALLE opgehaalde posts (niet enkel de cap).
  const sum = (k) => posts.reduce((a, p) => a + (p[k] || 0), 0);
  const totalReach = sum('reach'), totalInter = sum('interactions');
  const n = posts.length || 1;
  const best = posts.slice().sort((a, b) => (b.reach - a.reach) || (b.interactions - a.interactions))[0] || null;
  const networksOut = networks.filter((net) => netAgg[net]).map((net) => {
    const list = netAgg[net];
    const r = list.reduce((a, p) => a + p.reach, 0), it = list.reduce((a, p) => a + p.interactions, 0);
    return { network: net, label: MC_NET_LABEL[net] || net, posts: list.length, reach: r, interactions: it, engagementRate: r > 0 ? Math.round((it / r) * 1000) / 10 : 0 };
  });
  const summary = {
    posts: posts.length,
    reach: totalReach,
    interactions: totalInter,
    avgReach: Math.round(totalReach / n),
    avgInteractions: Math.round(totalInter / n),
    avgEngagementRate: totalReach > 0 ? Math.round((totalInter / totalReach) * 1000) / 10 : 0,
    bestPostId: best ? best.id : '',
  };
  // ---- fase 3: inzichten afgeleid uit de EIGEN posthistoriek (alle posts, niet de cap) ----
  const er = (re, it) => (re > 0 ? Math.round((it / re) * 1000) / 10 : 0);
  // (a) hashtag-prestaties: per hashtag gem. bereik/engagement (min. 2 posts).
  const hmap = {};
  posts.forEach((p) => (p.hashtags || []).forEach((h) => { const k = hmap[h] || (hmap[h] = { tag: h, count: 0, reach: 0, inter: 0 }); k.count++; k.reach += p.reach; k.inter += p.interactions; }));
  let hashtags = Object.keys(hmap).map((h) => hmap[h]).filter((h) => h.count >= 2)
    .map((h) => ({ tag: h.tag, count: h.count, avgReach: Math.round(h.reach / h.count), avgInteractions: Math.round(h.inter / h.count), avgEngagementRate: er(h.reach, h.inter) }))
    .sort((a, b) => (b.avgEngagementRate - a.avgEngagementRate) || (b.avgReach - a.avgReach)).slice(0, 12);
  // (b) format-prestaties: per post-type gem. bereik/engagement.
  const fmap = {};
  posts.forEach((p) => { const lab = mcFormatLabel(p.network, p.type); const k = fmap[lab] || (fmap[lab] = { format: lab, count: 0, reach: 0, inter: 0 }); k.count++; k.reach += p.reach; k.inter += p.interactions; });
  const formats = Object.keys(fmap).map((f) => fmap[f])
    .map((f) => ({ format: f.format, count: f.count, avgReach: Math.round(f.reach / f.count), avgInteractions: Math.round(f.inter / f.count), avgEngagementRate: er(f.reach, f.inter) }))
    .sort((a, b) => (b.avgEngagementRate - a.avgEngagementRate) || (b.count - a.count));
  // (c) beste momenten: weekdag x dagdeel, gem. engagement (min. 2 posts in de bucket).
  const DAYP = (h) => (h < 6 ? 'Nacht' : h < 12 ? 'Ochtend' : h < 18 ? 'Middag' : 'Avond');
  const tmap = {};
  posts.forEach((p) => { const dh = mcDayHour(p.date); if (!dh) return; const key = dh.dow + '|' + DAYP(dh.hour); const k = tmap[key] || (tmap[key] = { dow: dh.dow, part: DAYP(dh.hour), count: 0, reach: 0, inter: 0 }); k.count++; k.reach += p.reach; k.inter += p.interactions; });
  const DOW = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
  let bestTimes = Object.keys(tmap).map((t) => tmap[t]).filter((t) => t.count >= 2)
    .map((t) => ({ day: DOW[t.dow], dayIdx: t.dow, part: t.part, count: t.count, avgReach: Math.round(t.reach / t.count), avgInteractions: Math.round(t.inter / t.count), avgEngagementRate: er(t.reach, t.inter) }))
    .sort((a, b) => (b.avgEngagementRate - a.avgEngagementRate) || (b.avgReach - a.avgReach)).slice(0, 6);
  return { from, to, days, summary, networks: networksOut, posts: capped, hashtags, formats, bestTimes };
}
export async function metricoolPostStats(bedrijfId, body, env) {
  const { blogId, userId, networks } = await mcResolveBrand(env, bedrijfId);   // gedeelde brand-resolutie
  if (!blogId) return { status: 200, body: { ok: true, linked: false } };
  const days = Math.min(180, Math.max(7, Number(body && body.days) || 90));
  const core = await mcPostStatsCore(env, blogId, userId, networks, days);
  return { status: 200, body: { ok: true, linked: true, brandId: blogId, period: { from: core.from, to: core.to, days }, summary: core.summary, networks: core.networks, posts: core.posts, hashtags: core.hashtags, formats: core.formats, bestTimes: core.bestTimes } };
}

/* ---- metaAds (READ) — real-time Meta-insights RECHTSTREEKS via de Graph API ----
 * Geen Make. Leest het Meta-ad-account uit de bedrijf-taak (FIELD.metaAdsId) — dus
 * SERVER-SIDE en tenant-safe, NOOIT uit de body — en haalt live op: account-KPI's,
 * actieve campagnes (+ per-campagne insights) en actieve advertenties met hun creative
 * (foto/video/carrousel). SEC: account numeriek gevalideerd (geen path-injectie),
 * date_preset uit een allowlist, token uitsluitend server-side (env.META_SYSTEM_TOKEN).
 * Niet-gekoppeld of geen token => { ok:true, linked:false } (fail-soft, geen 5xx).
 * Output: { ok, linked, account, currency, period, kpis, campaigns:[], ads:[], error? }.
 */
const META_GRAPH = 'https://graph.facebook.com/v21.0';
const META_PRESETS = { today: 'today', yesterday: 'yesterday', last_7d: 'last_7d', last_14d: 'last_14d', last_30d: 'last_30d', this_month: 'this_month', last_month: 'last_month' };
const META_RESULT_ACTIONS = ['offsite_conversion.fb_pixel_purchase', 'purchase', 'lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'];
async function metaGet(env, path, params, token) {
  const qs = new URLSearchParams(Object.assign({ access_token: token || str(env && env.META_SYSTEM_TOKEN) }, params || {}));
  let r;
  try { r = await fetch(`${META_GRAPH}/${path}?${qs.toString()}`); }
  catch (e) { return { ok: false, data: null, err: 'unreachable' }; }
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || d.error) return { ok: false, data: d, err: (d && d.error && d.error.message) || ('http_' + r.status) };
  return { ok: true, data: d };
}
function metaActionVal(actions, types) {
  if (!Array.isArray(actions)) return 0;
  let n = 0; for (const a of actions) { if (a && types.includes(a.action_type)) n += Number(a.value) || 0; }
  return n;
}
function metaCreativeFormat(cr) {
  if (!cr) return 'image';
  if (cr.video_id) return 'video';
  const oss = cr.object_story_spec || {};
  if (oss.link_data && Array.isArray(oss.link_data.child_attachments) && oss.link_data.child_attachments.length > 1) return 'carousel';
  if (cr.asset_feed_spec && Array.isArray(cr.asset_feed_spec.images) && cr.asset_feed_spec.images.length > 1) return 'carousel';
  return 'image';
}
function metaAdVideoId(cr) {
  return cr.video_id || (cr.object_story_spec && cr.object_story_spec.video_data && cr.object_story_spec.video_data.video_id)
    || (cr.asset_feed_spec && Array.isArray(cr.asset_feed_spec.videos) && cr.asset_feed_spec.videos[0] && cr.asset_feed_spec.videos[0].video_id) || '';
}
function metaChildAtts(cr) {
  return (cr.object_story_spec && cr.object_story_spec.link_data && Array.isArray(cr.object_story_spec.link_data.child_attachments)) ? cr.object_story_spec.link_data.child_attachments : [];
}

const META_YMD = /^\d{4}-\d{2}-\d{2}$/;
// time-params: time_range bij geldige from/to, anders date_preset (legacy).
function metaTimeParams(from, to, preset) {
  if (META_YMD.test(from) && META_YMD.test(to)) return { time_range: JSON.stringify({ since: from, until: to }) };
  return { date_preset: preset || 'last_7d' };
}
function metaShiftYmd(ymd, mode) {
  const m = String(ymd).match(/(\d{4})-(\d{2})-(\d{2})/); if (!m) return ymd;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (mode === 'month') d.setUTCMonth(d.getUTCMonth() - 1);
  else if (mode === 'year') d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}
// rolling vergelijkings-venster: zelfde lengte ervoor / 1 maand / 1 jaar geleden.
function metaCompareWindow(from, to, mode) {
  if (mode === 'previous') {
    const pf = Date.parse(from + 'T00:00:00Z'), pt = Date.parse(to + 'T00:00:00Z');
    const len = Math.max(86400000, pt - pf + 86400000);
    return [new Date(pf - len).toISOString().slice(0, 10), new Date(pf - 86400000).toISOString().slice(0, 10)];
  }
  return [metaShiftYmd(from, mode), metaShiftYmd(to, mode)];
}
async function metaKpiWindow(env, act, timeParams) {
  const kins = await metaGet(env, `${act}/insights`, Object.assign({ level: 'account', fields: 'spend,impressions,reach,clicks,inline_link_clicks,ctr,cpc,cpm,frequency,actions' }, timeParams));
  const k = (kins.ok && kins.data && Array.isArray(kins.data.data) && kins.data.data[0]) || {};
  return { ok: kins.ok, err: kins.err, kpis: {
    spend: Number(k.spend) || 0, impressions: Number(k.impressions) || 0, reach: Number(k.reach) || 0,
    clicks: Number(k.clicks) || 0, linkClicks: Number(k.inline_link_clicks) || 0,
    ctr: Number(k.ctr) || 0, cpc: Number(k.cpc) || 0, cpm: Number(k.cpm) || 0,
    frequency: Number(k.frequency) || 0, results: metaActionVal(k.actions, META_RESULT_ACTIONS),
  } };
}
export async function metaAds(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const acct = br.ok && br.data ? str(getCF(br.data, FIELD.metaAdsId)).trim() : '';
  // Account UITSLUITEND uit de eigen bedrijf-taak (tenant-safe); numeriek = geen path-injectie.
  if (!/^\d{6,20}$/.test(acct)) return { status: 200, body: { ok: true, linked: false } };
  if (!str(env && env.META_SYSTEM_TOKEN)) return { status: 200, body: { ok: true, linked: false, reason: 'no_token' } };

  const from = str(body && body.from).trim(), to = str(body && body.to).trim();
  const useRange = META_YMD.test(from) && META_YMD.test(to);
  const preset = META_PRESETS[str(body && body.period).trim()] || 'last_7d';
  const compare = ['previous', 'month', 'year'].indexOf(str(body && body.compare)) >= 0 ? str(body.compare) : 'none';
  const tp = metaTimeParams(from, to, preset);
  const act = `act_${acct}`;

  // valuta (best-effort)
  const accInfo = await metaGet(env, act, { fields: 'currency,timezone_name,name' });
  const currency = (accInfo.ok && accInfo.data && accInfo.data.currency) || 'EUR';

  // account-KPI's (huidig venster) + optioneel rolling vergelijkings-venster
  const cur = await metaKpiWindow(env, act, tp);
  const kpis = cur.kpis;
  let prevKpis = null, compareLabel = '';
  // per-campagne vergelijking (vorige periode): campaign_id -> zelfde metric-shape als de campagne-objecten.
  const prevC = {};
  if (useRange && compare !== 'none') {
    const cw = metaCompareWindow(from, to, compare);
    const ctr2 = { time_range: JSON.stringify({ since: cw[0], until: cw[1] }) };
    const prev = await metaKpiWindow(env, act, ctr2);
    prevKpis = prev.kpis;
    // ÉÉN campagne-insights-call over het vergelijkingsvenster (spiegelt `cins`, met inline_link_clicks).
    const cinsPrev = await metaGet(env, `${act}/insights`, Object.assign({
      level: 'campaign', limit: '200',
      fields: 'campaign_id,spend,impressions,clicks,inline_link_clicks,ctr,cpc,cpm,reach,frequency,actions',
    }, ctr2));
    if (cinsPrev.ok && Array.isArray(cinsPrev.data.data)) for (const m of cinsPrev.data.data) {
      prevC[m.campaign_id] = {
        spend: Number(m.spend) || 0, impressions: Number(m.impressions) || 0, clicks: Number(m.clicks) || 0, linkClicks: Number(m.inline_link_clicks) || 0,
        reach: Number(m.reach) || 0, cpm: Number(m.cpm) || 0, frequency: Number(m.frequency) || 0,
        ctr: Number(m.ctr) || 0, cpc: Number(m.cpc) || 0, results: metaActionVal(m.actions, META_RESULT_ACTIONS),
      };
    }
    compareLabel = compare === 'previous' ? 'vorige periode' : (compare === 'month' ? 'vorige maand' : 'vorig jaar');
  }

  // actieve campagnes + per-campagne insights; ENKEL campagnes die spendeerden in de periode.
  const campRes = await metaGet(env, `${act}/campaigns`, {
    fields: 'name,objective,effective_status,daily_budget,lifetime_budget',
    effective_status: '["ACTIVE"]', limit: '50',
  });
  const cins = await metaGet(env, `${act}/insights`, Object.assign({
    level: 'campaign', limit: '200',
    fields: 'campaign_id,spend,impressions,clicks,inline_link_clicks,ctr,cpc,cpm,reach,frequency,actions',
  }, tp));
  const cmap = {};
  if (cins.ok && Array.isArray(cins.data.data)) for (const row of cins.data.data) cmap[row.campaign_id] = row;
  const campaigns = ((campRes.ok && Array.isArray(campRes.data.data)) ? campRes.data.data : []).map((c) => {
    const m = cmap[c.id] || {};
    return {
      id: c.id, name: c.name || '', objective: c.objective || '', status: c.effective_status || '',
      budget: Number(c.daily_budget || c.lifetime_budget || 0) / 100,
      spend: Number(m.spend) || 0, impressions: Number(m.impressions) || 0, clicks: Number(m.clicks) || 0, linkClicks: Number(m.inline_link_clicks) || 0,
      reach: Number(m.reach) || 0, cpm: Number(m.cpm) || 0, frequency: Number(m.frequency) || 0,
      ctr: Number(m.ctr) || 0, cpc: Number(m.cpc) || 0, results: metaActionVal(m.actions, META_RESULT_ACTIONS),
      prev: prevC[c.id] || null,
    };
  }).filter((c) => c.spend > 0);

  // dagelijkse trend over het GEKOZEN venster (per dag spend/impressions/clicks)
  const tins = await metaGet(env, `${act}/insights`, Object.assign({ level: 'account', time_increment: '1', fields: 'spend,impressions,clicks,inline_link_clicks', limit: '200' }, tp));
  const trend = (tins.ok && Array.isArray(tins.data.data) ? tins.data.data : []).map((d) => ({
    date: d.date_start || '', spend: Number(d.spend) || 0,
    impressions: Number(d.impressions) || 0, clicks: Number(d.clicks) || 0, linkClicks: Number(d.inline_link_clicks) || 0,
  }));

  // Alleen een 'error' als beide primaire calls faalden (bv. token/permissie) → UI toont nette melding i.p.v. nullen.
  const error = (!cur.ok && !campRes.ok) ? (cur.err || 'fetch_failed') : null;
  const period = useRange ? { from, to, compare } : { preset, compare: 'none' };
  return { status: 200, body: { ok: true, linked: true, account: acct, currency, period, kpis, prevKpis, compareLabel, campaigns, trend, error } };
}

/* ---- metaAdsRich (READ, ADMIN-only) — uitgebreide Meta-rapportage --------------
 * Voor @studio27.be-teamleden (worker gate't op is_staff). Eén rijk rapport per klant,
 * gebaseerd op Arne's MASTERPROMPT: 8 account-KPI's, Leads + CPL, per-campagne dag-
 * evolutie, adset- én ad-niveau insights, en periode-vergelijking. Alles in ~8 PARALLELLE
 * Graph-calls (geen per-campagne-loop): account-KPI's, campagne-meta, campagne-insights,
 * campagne-DAG-insights (time_increment=1), adset-insights, ad-insights, adset-meta, ad-meta.
 * Account UITSLUITEND uit de eigen bedrijf-taak (tenant-safe); token server-side.
 */
// Leads-detectie (Arne's rapport): 'lead' (on-Facebook lead form) en 'onsite_conversion.lead_grouped'.
// We nemen het MAXIMUM i.p.v. de som: rapporteert Meta beide voor dezelfde leads, dan zou sommeren
// dubbeltellen. CPL = besteed / leads (0 als geen leads). Houdt cijfers consistent met Meta Ads Manager.
function metaLeads(actions) {
  return Math.max(metaActionVal(actions, ['lead']), metaActionVal(actions, ['onsite_conversion.lead_grouped']));
}
function metaRichKpi(row) {
  row = row || {};
  const spend = Number(row.spend) || 0;
  const leads = metaLeads(row.actions);
  return {
    spend, impressions: Number(row.impressions) || 0, reach: Number(row.reach) || 0,
    clicks: Number(row.clicks) || 0, linkClicks: Number(row.inline_link_clicks) || 0,
    ctr: Number(row.ctr) || 0, cpc: Number(row.cpc) || 0, cpm: Number(row.cpm) || 0,
    frequency: Number(row.frequency) || 0,
    leads, cpl: leads > 0 ? Math.round((spend / leads) * 100) / 100 : 0,
    results: metaActionVal(row.actions, META_RESULT_ACTIONS),
  };
}
export async function metaAdsRich(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const acct = br.ok && br.data ? str(getCF(br.data, FIELD.metaAdsId)).trim() : '';
  if (!/^\d{6,20}$/.test(acct)) return { status: 200, body: { ok: true, linked: false } };
  if (!str(env && env.META_SYSTEM_TOKEN)) return { status: 200, body: { ok: true, linked: false, reason: 'no_token' } };

  const from = str(body && body.from).trim(), to = str(body && body.to).trim();
  const useRange = META_YMD.test(from) && META_YMD.test(to);
  const preset = META_PRESETS[str(body && body.period).trim()] || 'last_30d';
  const compare = ['previous', 'month', 'year'].indexOf(str(body && body.compare)) >= 0 ? str(body.compare) : 'none';
  const tp = metaTimeParams(from, to, preset);
  const act = `act_${acct}`;
  const INS = 'spend,impressions,reach,clicks,inline_link_clicks,ctr,cpc,cpm,frequency,actions';

  const accInfo = await metaGet(env, act, { fields: 'currency,timezone_name,name' });
  const currency = (accInfo.ok && accInfo.data && accInfo.data.currency) || 'EUR';

  // 8 onafhankelijke calls parallel.
  const [accCur, campMeta, campIns, campDaily, adsetIns, adIns, adsetMeta, adMeta] = await Promise.all([
    metaGet(env, `${act}/insights`, Object.assign({ level: 'account', fields: INS }, tp)),
    metaGet(env, `${act}/campaigns`, { fields: 'name,objective,effective_status,daily_budget,lifetime_budget', effective_status: '["ACTIVE","PAUSED"]', limit: '300' }),
    metaGet(env, `${act}/insights`, Object.assign({ level: 'campaign', limit: '400', fields: 'campaign_id,campaign_name,' + INS }, tp)),
    metaGet(env, `${act}/insights`, Object.assign({ level: 'campaign', time_increment: '1', limit: '800', fields: 'campaign_id,spend,impressions,clicks,inline_link_clicks,actions' }, tp)),
    metaGet(env, `${act}/insights`, Object.assign({ level: 'adset', limit: '500', fields: 'adset_id,adset_name,campaign_id,' + INS }, tp)),
    metaGet(env, `${act}/insights`, Object.assign({ level: 'ad', limit: '800', fields: 'ad_id,ad_name,adset_id,campaign_id,' + INS }, tp)),
    metaGet(env, `${act}/adsets`, { fields: 'name,effective_status,campaign_id', effective_status: '["ACTIVE","PAUSED"]', limit: '500' }),
    metaGet(env, `${act}/ads`, { fields: 'name,effective_status,adset_id,campaign_id', effective_status: '["ACTIVE","PAUSED"]', limit: '800' }),
  ]);

  const accRow = (accCur.ok && accCur.data && Array.isArray(accCur.data.data) && accCur.data.data[0]) || {};
  const kpis = metaRichKpi(accRow);

  // periode-vergelijking (account-niveau) — enkel bij een expliciet datumbereik.
  // + per-rij vergelijking op campagne/adset/ad-niveau (zelfde metaRichKpi-shape als de rijen).
  let prevKpis = null, compareLabel = '';
  const prevCamp = {}, prevAdset = {}, prevAd = {};
  if (useRange && compare !== 'none') {
    const cw = metaCompareWindow(from, to, compare);
    const cmpTr = { time_range: JSON.stringify({ since: cw[0], until: cw[1] }) };
    // account + campagne + adset + ad over het vergelijkingsvenster — parallel (enkel bij vergelijken).
    const [prev, prevCampIns, prevAdsetIns, prevAdIns] = await Promise.all([
      metaGet(env, `${act}/insights`, Object.assign({ level: 'account', fields: INS }, cmpTr)),
      metaGet(env, `${act}/insights`, Object.assign({ level: 'campaign', limit: '400', fields: 'campaign_id,campaign_name,' + INS }, cmpTr)),
      metaGet(env, `${act}/insights`, Object.assign({ level: 'adset', limit: '500', fields: 'adset_id,adset_name,campaign_id,' + INS }, cmpTr)),
      metaGet(env, `${act}/insights`, Object.assign({ level: 'ad', limit: '800', fields: 'ad_id,ad_name,adset_id,campaign_id,' + INS }, cmpTr)),
    ]);
    prevKpis = metaRichKpi((prev.ok && prev.data && Array.isArray(prev.data.data) && prev.data.data[0]) || {});
    if (prevCampIns.ok && Array.isArray(prevCampIns.data.data)) for (const r of prevCampIns.data.data) prevCamp[r.campaign_id] = metaRichKpi(r);
    if (prevAdsetIns.ok && Array.isArray(prevAdsetIns.data.data)) for (const r of prevAdsetIns.data.data) prevAdset[r.adset_id] = metaRichKpi(r);
    if (prevAdIns.ok && Array.isArray(prevAdIns.data.data)) for (const r of prevAdIns.data.data) prevAd[r.ad_id] = metaRichKpi(r);
    compareLabel = compare === 'previous' ? 'vorige periode' : (compare === 'month' ? 'vorige maand' : 'vorig jaar');
  }

  // indexeer
  const campMetaMap = {}; if (campMeta.ok && Array.isArray(campMeta.data.data)) for (const c of campMeta.data.data) campMetaMap[c.id] = c;
  const dailyByCamp = {}; if (campDaily.ok && Array.isArray(campDaily.data.data)) for (const r of campDaily.data.data) (dailyByCamp[r.campaign_id] = dailyByCamp[r.campaign_id] || []).push(r);
  const adsetMetaMap = {}; if (adsetMeta.ok && Array.isArray(adsetMeta.data.data)) for (const a of adsetMeta.data.data) adsetMetaMap[a.id] = a;
  const adMetaMap = {}; if (adMeta.ok && Array.isArray(adMeta.data.data)) for (const a of adMeta.data.data) adMetaMap[a.id] = a;
  const adsetsByCamp = {}; if (adsetIns.ok && Array.isArray(adsetIns.data.data)) for (const r of adsetIns.data.data) (adsetsByCamp[r.campaign_id] = adsetsByCamp[r.campaign_id] || []).push(r);
  const adsByCamp = {}; if (adIns.ok && Array.isArray(adIns.data.data)) for (const r of adIns.data.data) (adsByCamp[r.campaign_id] = adsByCamp[r.campaign_id] || []).push(r);

  // bouw per campagne (inclusie: spend>0 OF impressions>0 — dus alle leverende campagnes,
  // ook gepauzeerde/afgeronde die in de periode spendeerden).
  const campRows = (campIns.ok && Array.isArray(campIns.data.data)) ? campIns.data.data : [];
  const campaigns = campRows.map((ins) => {
    const cid = ins.campaign_id;
    const meta = campMetaMap[cid] || {};
    const k = metaRichKpi(ins);
    const daily = (dailyByCamp[cid] || []).map((d) => {
      const lds = metaLeads(d.actions), sp = Number(d.spend) || 0;
      return { date: d.date_start || '', spend: sp, impressions: Number(d.impressions) || 0, clicks: Number(d.clicks) || 0, linkClicks: Number(d.inline_link_clicks) || 0, leads: lds, cpl: lds > 0 ? Math.round((sp / lds) * 100) / 100 : 0 };
    }).sort((a, b) => (a.date < b.date ? -1 : 1));
    const adsets = (adsetsByCamp[cid] || []).map((r) => {
      const m = adsetMetaMap[r.adset_id] || {};
      return Object.assign({ id: r.adset_id, name: r.adset_name || m.name || '', status: m.effective_status || '', prev: prevAdset[r.adset_id] || null }, metaRichKpi(r));
    }).sort((a, b) => b.spend - a.spend);
    const ads = (adsByCamp[cid] || []).map((r) => {
      const m = adMetaMap[r.ad_id] || {};
      return Object.assign({ id: r.ad_id, name: r.ad_name || m.name || '', status: m.effective_status || '', adsetId: r.adset_id || '', prev: prevAd[r.ad_id] || null }, metaRichKpi(r));
    }).sort((a, b) => b.spend - a.spend);
    return Object.assign({
      id: cid, name: ins.campaign_name || meta.name || '', objective: meta.objective || '', status: meta.effective_status || '',
      budget: Number(meta.daily_budget || meta.lifetime_budget || 0) / 100, budgetType: meta.daily_budget ? 'daily' : (meta.lifetime_budget ? 'lifetime' : ''),
      daily, adsets, ads, prev: prevCamp[cid] || null,
    }, k);
  }).filter((c) => c.spend > 0 || c.impressions > 0).sort((a, b) => b.spend - a.spend);

  const error = (!accCur.ok && !campIns.ok && !campMeta.ok) ? (accCur.err || 'fetch_failed') : null;
  const period = useRange ? { from, to, compare } : { preset, compare: 'none' };
  return { status: 200, body: { ok: true, linked: true, account: acct, currency, period, kpis, prevKpis, compareLabel, campaigns, error } };
}

/* ---- metaCampaignAds (READ) — rijke media per campagne, ON-DEMAND ----
 * Wordt aangeroepen wanneer een klant een campagne opent. Haalt de actieve ads van
 * DIE campagne (account-scoped + campagne-filter = tenant-safe) en hun media in goede
 * kwaliteit: video-source (afspeelbaar) + poster, full-res foto, carrousel-kaarten —
 * opgehaald met het PAGE-token (de System User beheert de pagina), want het ads_read-
 * token alleen mag de post-media (dark posts) niet lezen.
 */
export async function metaCampaignAds(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const acct = br.ok && br.data ? str(getCF(br.data, FIELD.metaAdsId)).trim() : '';
  if (!/^\d{6,20}$/.test(acct)) return { status: 200, body: { ok: true, linked: false, ads: [] } };
  if (!str(env && env.META_SYSTEM_TOKEN)) return { status: 200, body: { ok: true, linked: false, ads: [] } };
  const campId = String((body && body.campaign_id) || '').trim();
  if (!/^\d{6,25}$/.test(campId)) return { status: 200, body: { ok: true, ads: [] } };
  const act = `act_${acct}`;

  const adRes = await metaGet(env, `${act}/ads`, {
    fields: 'name,effective_status,campaign_id,creative{thumbnail_url,image_url,object_type,video_id,effective_object_story_id,object_story_spec,asset_feed_spec},insights{spend,impressions,clicks,inline_link_clicks,ctr,cpc}',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campId }]),
    effective_status: '["ACTIVE"]', limit: '50',
  });
  const adRows = (adRes.ok && Array.isArray(adRes.data.data)) ? adRes.data.data : [];

  // page-tokens voor de betrokken pagina's (gericht; System User beheert de pagina's)
  const pageOf = (cr) => { const sid = cr.effective_object_story_id || ''; return sid.indexOf('_') > 0 ? sid.split('_')[0] : ''; };
  const pageIds = [...new Set(adRows.map((a) => pageOf(a.creative || {})).filter(Boolean))];
  const pageTok = {};
  await Promise.all(pageIds.map(async (pid) => { const d = await metaGet(env, pid, { fields: 'access_token' }); if (d.ok && d.data && d.data.access_token) pageTok[pid] = d.data.access_token; }));

  const ads = await Promise.all(adRows.map(async (a) => {
    const cr = a.creative || {};
    const ins = (a.insights && Array.isArray(a.insights.data) && a.insights.data[0]) || {};
    const fmt = metaCreativeFormat(cr);
    const sid = cr.effective_object_story_id || ''; const ptok = pageTok[pageOf(cr)] || '';
    const out = {
      id: a.id, name: a.name || '', campaignId: a.campaign_id || '', format: fmt,
      thumb: cr.thumbnail_url || cr.image_url || '', image: cr.image_url || '',
      spend: Number(ins.spend) || 0, impressions: Number(ins.impressions) || 0,
      clicks: Number(ins.clicks) || 0, linkClicks: Number(ins.inline_link_clicks) || 0, ctr: Number(ins.ctr) || 0, cpc: Number(ins.cpc) || 0,
    };
    const vid = metaAdVideoId(cr);
    if (fmt === 'video' && vid && ptok) {
      const v = await metaGet(env, String(vid), { fields: 'source,picture' }, ptok);
      if (v.ok && v.data) { out.videoSrc = v.data.source || ''; out.poster = v.data.picture || ''; }
    }
    if (fmt === 'carousel') {
      let cards = [];
      if (ptok && sid) {
        const pr = await metaGet(env, sid, { fields: 'attachments{subattachments{media}}' }, ptok);
        const at = pr.ok && pr.data && pr.data.attachments && Array.isArray(pr.data.attachments.data) && pr.data.attachments.data[0];
        const subs = at && at.subattachments && at.subattachments.data;
        if (Array.isArray(subs)) cards = subs.map((s) => ({ image: ((s.media || {}).image || {}).src || '', title: '' })).filter((c) => c.image);
      }
      if (!cards.length) cards = metaChildAtts(cr).map((ch) => ({ image: ch.picture || '', title: ch.name || '' })).filter((c) => c.image);
      out.cards = cards;
      if (cards[0]) out.image = cards[0].image;
    }
    if (ptok && sid && (fmt === 'image' || (fmt === 'video' && !out.poster))) {
      const pr = await metaGet(env, sid, { fields: 'full_picture' }, ptok);
      if (pr.ok && pr.data && pr.data.full_picture) { if (fmt === 'image') out.image = pr.data.full_picture; if (fmt === 'video' && !out.poster) out.poster = pr.data.full_picture; }
    }
    if (!out.image) out.image = out.poster || cr.thumbnail_url || '';
    if (!out.thumb) out.thumb = out.image;
    return out;
  }));

  return { status: 200, body: { ok: true, linked: true, campaign_id: campId, ads } };
}

/* ---- Google Ads (READ) — rechtstreeks via de Google Ads API (Explorer-toegang, geen Make) ----
 * Leest het Google Ads klant-id uit de bedrijf-taak (FIELD.googleAdsId, server-side/tenant-safe),
 * mint een access token uit de refresh token (env), en haalt via GAQL de account-KPI's, actieve
 * campagnes en een dagtrend op onder de MCC (login-customer-id). Zelfde output-vorm als metaAds,
 * zodat de frontend dezelfde KPI-/trend-/campagne-rendering kan hergebruiken.
 */
const GADS_API = 'https://googleads.googleapis.com/v20';
const GADS_MCC = '4589076421';
const GADS_PRESETS = { today: 'TODAY', yesterday: 'YESTERDAY', last_7d: 'LAST_7_DAYS', last_14d: 'LAST_14_DAYS', last_30d: 'LAST_30_DAYS', this_month: 'THIS_MONTH', last_month: 'LAST_MONTH' };
const GADS_CHANNEL = { SEARCH: 'Search', DISPLAY: 'Display', SHOPPING: 'Shopping', VIDEO: 'Video', PERFORMANCE_MAX: 'Performance Max', MULTI_CHANNEL: 'Multichannel', LOCAL: 'Lokaal', LOCAL_SERVICES: 'Lokale diensten', SMART: 'Smart', DISCOVERY: 'Demand Gen', DEMAND_GEN: 'Demand Gen' };
let _gadsTok = { v: '', exp: 0 };
async function googleAdsToken(env, now) {
  if (_gadsTok.v && _gadsTok.exp > now + 60000) return _gadsTok.v;
  if (!str(env && env.GOOGLE_OAUTH_CLIENT_ID) || !str(env && env.GOOGLE_ADS_REFRESH_TOKEN)) return '';
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: str(env.GOOGLE_OAUTH_CLIENT_ID), client_secret: str(env.GOOGLE_OAUTH_CLIENT_SECRET), refresh_token: str(env.GOOGLE_ADS_REFRESH_TOKEN), grant_type: 'refresh_token' }).toString(),
    });
    const d = await r.json().catch(() => null);
    if (d && d.access_token) { _gadsTok = { v: d.access_token, exp: now + (Number(d.expires_in) || 3600) * 1000 }; return d.access_token; }
  } catch (e) { /* fail-soft */ }
  return '';
}
async function gadsQuery(env, token, customerId, query) {
  try {
    const r = await fetch(`${GADS_API}/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'developer-token': str(env.GOOGLE_ADS_DEVELOPER_TOKEN), 'login-customer-id': GADS_MCC, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, rows: [], err: (d && d.error && d.error.message) || ('http_' + r.status) };
    const rows = [];
    if (Array.isArray(d)) for (const b of d) for (const row of (b.results || [])) rows.push(row);
    return { ok: true, rows };
  } catch (e) { return { ok: false, rows: [], err: 'unreachable' }; }
}
export async function googleAds(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const acct = (br.ok && br.data ? str(getCF(br.data, FIELD.googleAdsId)) : '').replace(/[^0-9]/g, '');
  if (!/^\d{8,12}$/.test(acct)) return { status: 200, body: { ok: true, linked: false } };
  if (!str(env && env.GOOGLE_ADS_DEVELOPER_TOKEN) || !str(env && env.GOOGLE_ADS_REFRESH_TOKEN)) return { status: 200, body: { ok: true, linked: false, reason: 'no_token' } };
  const token = await googleAdsToken(env, Date.now());
  if (!token) return { status: 200, body: { ok: true, linked: false, reason: 'no_token' } };

  // Periode: van/tot uit de gedeelde periodebalk (zelfde contract als metaAds), anders preset.
  const from = str(body && body.from).trim(), to = str(body && body.to).trim();
  const useRange = META_YMD.test(from) && META_YMD.test(to);
  const preset = GADS_PRESETS[str(body && body.period).trim()] || 'LAST_7_DAYS';
  const compare = ['previous', 'month', 'year'].indexOf(str(body && body.compare)) >= 0 ? str(body.compare) : 'none';
  const dateFilter = useRange ? `segments.date BETWEEN '${from}' AND '${to}'` : `segments.date DURING ${preset}`;
  const KPIQ = (where) => `SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM customer WHERE ${where}`;
  const aggKpi = (rows) => {
    const m = (rows && rows[0] && rows[0].metrics) || {};
    const spend = Number(m.costMicros || 0) / 1e6, impressions = Number(m.impressions || 0), clicks = Number(m.clicks || 0);
    return { spend, impressions, clicks, cpc: clicks > 0 ? spend / clicks : 0, ctr: impressions > 0 ? (clicks / impressions * 100) : 0, results: Number(m.conversions || 0) };
  };

  // KPI's (account, gekozen venster) + actieve campagnes + dagtrend — parallel.
  const [kpiRes, campRes, trendRes] = await Promise.all([
    gadsQuery(env, token, acct, KPIQ(dateFilter)),
    gadsQuery(env, token, acct,
      `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions FROM campaign WHERE campaign.status = 'ENABLED' AND ${dateFilter} ORDER BY metrics.cost_micros DESC`),
    gadsQuery(env, token, acct,
      `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks FROM customer WHERE ${dateFilter} ORDER BY segments.date`),
  ]);
  const kpis = aggKpi(kpiRes.rows);

  // periode-vergelijking (enkel bij expliciet datumbereik) — zelfde vensterlogica als Meta.
  let prevKpis = null, compareLabel = '';
  // per-campagne vergelijking: campaign.id -> zelfde metric-shape als de campagne-objecten.
  const prevC = {};
  if (useRange && compare !== 'none') {
    const cw = metaCompareWindow(from, to, compare);
    const cmpWhere = `segments.date BETWEEN '${cw[0]}' AND '${cw[1]}'`;
    // account-KPI + ÉÉN campagne-query over het vergelijkingsvenster — parallel (enkel bij vergelijken).
    const [prev, prevCamp] = await Promise.all([
      gadsQuery(env, token, acct, KPIQ(cmpWhere)),
      gadsQuery(env, token, acct,
        `SELECT campaign.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions FROM campaign WHERE campaign.status = 'ENABLED' AND ${cmpWhere}`),
    ]);
    if (prev.ok) prevKpis = aggKpi(prev.rows);
    for (const r of (prevCamp.rows || [])) {
      const c = r.campaign || {}, m = r.metrics || {};
      prevC[String(c.id || '')] = {
        spend: Number(m.costMicros || 0) / 1e6, impressions: Number(m.impressions || 0), clicks: Number(m.clicks || 0),
        ctr: Number(m.ctr || 0) * 100, cpc: Number(m.averageCpc || 0) / 1e6, results: Number(m.conversions || 0),
      };
    }
    compareLabel = compare === 'previous' ? 'vorige periode' : (compare === 'month' ? 'vorige maand' : 'vorig jaar');
  }

  const campaigns = (campRes.rows || []).map((r) => {
    const c = r.campaign || {}, m = r.metrics || {};
    const spend = Number(m.costMicros || 0) / 1e6;
    return {
      id: String(c.id || ''), name: c.name || '', status: c.status || '',
      objective: GADS_CHANNEL[c.advertisingChannelType] || str(c.advertisingChannelType),
      spend, impressions: Number(m.impressions || 0), clicks: Number(m.clicks || 0),
      ctr: Number(m.ctr || 0) * 100, cpc: Number(m.averageCpc || 0) / 1e6, results: Number(m.conversions || 0),
      prev: prevC[String(c.id || '')] || null,
    };
  }).filter((c) => c.spend > 0);

  const trend = (trendRes.rows || []).map((r) => {
    const m = r.metrics || {}, s = r.segments || {};
    return { date: s.date || '', spend: Number(m.costMicros || 0) / 1e6, impressions: Number(m.impressions || 0), clicks: Number(m.clicks || 0) };
  });

  const error = (!kpiRes.ok && !campRes.ok) ? (kpiRes.err || campRes.err || 'fetch_failed') : null;
  const period = useRange ? { from, to, compare } : { preset, compare: 'none' };
  return { status: 200, body: { ok: true, linked: true, account: acct, currency: 'EUR', period, kpis, prevKpis, compareLabel, campaigns, trend, error } };
}

/* ---- googleAdsRich (READ, ADMIN-only/staff) — uitgebreide Google-rapportage --------------
 * Voor @studio27.be-teamleden (worker gate't op is_staff, acting-as scope). Spiegelt metaAdsRich:
 * account-KPI's (10 metrics incl. conversies/waarde/CPA/conv.ratio), per-campagne dag-evolutie +
 * adgroep-breakdown + vertonings-aandeel, en de top-zoekwoorden over het account. Alles in ~5
 * PARALLELLE GAQL-queries (account / campagnes / dag / adgroepen / zoekwoorden) + 1 vergelijking.
 * Account UITSLUITEND uit de bedrijf-taak (FIELD.googleAdsId, tenant-safe); token server-side. */
export async function googleAdsRich(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const acct = (br.ok && br.data ? str(getCF(br.data, FIELD.googleAdsId)) : '').replace(/[^0-9]/g, '');
  if (!/^\d{8,12}$/.test(acct)) return { status: 200, body: { ok: true, linked: false } };
  if (!str(env && env.GOOGLE_ADS_DEVELOPER_TOKEN) || !str(env && env.GOOGLE_ADS_REFRESH_TOKEN)) return { status: 200, body: { ok: true, linked: false, reason: 'no_token' } };
  const token = await googleAdsToken(env, Date.now());
  if (!token) return { status: 200, body: { ok: true, linked: false, reason: 'no_token' } };

  const from = str(body && body.from).trim(), to = str(body && body.to).trim();
  const useRange = META_YMD.test(from) && META_YMD.test(to);
  const preset = GADS_PRESETS[str(body && body.period).trim()] || 'LAST_30_DAYS';
  const compare = ['previous', 'month', 'year'].indexOf(str(body && body.compare)) >= 0 ? str(body.compare) : 'none';
  const dateFilter = useRange ? `segments.date BETWEEN '${from}' AND '${to}'` : `segments.date DURING ${preset}`;
  const METR = 'metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.average_cpm, metrics.conversions, metrics.conversions_value';
  const richKpi = (m) => {
    m = m || {};
    const spend = Number(m.costMicros || 0) / 1e6, impressions = Number(m.impressions || 0), clicks = Number(m.clicks || 0), conv = Number(m.conversions || 0);
    return {
      spend, impressions, clicks, conversions: conv,
      ctr: impressions > 0 ? (clicks / impressions * 100) : 0,
      cpc: Number(m.averageCpc || 0) / 1e6, cpm: Number(m.averageCpm || 0) / 1e6,
      convValue: Number(m.conversionsValue || 0),
      costPerConv: conv > 0 ? spend / conv : 0,
      convRate: clicks > 0 ? (conv / clicks * 100) : 0,
    };
  };
  const KPIQ = (where) => `SELECT ${METR} FROM customer WHERE ${where}`;

  const [accRes, campRes, dailyRes, agRes, kwRes] = await Promise.all([
    gadsQuery(env, token, acct, KPIQ(dateFilter)),
    gadsQuery(env, token, acct, `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros, ${METR}, metrics.search_impression_share FROM campaign WHERE ${dateFilter} AND metrics.impressions > 0 ORDER BY metrics.cost_micros DESC`),
    gadsQuery(env, token, acct, `SELECT campaign.id, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE ${dateFilter} ORDER BY segments.date`),
    gadsQuery(env, token, acct, `SELECT campaign.id, ad_group.id, ad_group.name, ad_group.status, ${METR} FROM ad_group WHERE ${dateFilter} AND metrics.impressions > 0`),
    gadsQuery(env, token, acct, `SELECT campaign.id, campaign.name, ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions FROM keyword_view WHERE ${dateFilter} AND metrics.impressions > 0 ORDER BY metrics.cost_micros DESC LIMIT 250`),
  ]);

  const kpis = richKpi((accRes.rows && accRes.rows[0] ? accRes.rows[0].metrics : {}));

  let prevKpis = null, compareLabel = '';
  // per-rij vergelijking: campagne (richKpi-shape), adgroep (richKpi-shape), zoekwoord (eigen shape).
  const prevCamp = {}, prevAg = {}, prevKw = {};
  const kwKey = (campId, adGroup, text, matchType) => campId + '|' + adGroup + '|' + text + '|' + matchType;
  if (useRange && compare !== 'none') {
    const cw = metaCompareWindow(from, to, compare);
    const cmpWhere = `segments.date BETWEEN '${cw[0]}' AND '${cw[1]}'`;
    // account + campagnes + adgroepen + zoekwoorden over het vergelijkingsvenster — parallel (enkel bij vergelijken).
    const [prev, prevCampRes, prevAgRes, prevKwRes] = await Promise.all([
      gadsQuery(env, token, acct, KPIQ(cmpWhere)),
      gadsQuery(env, token, acct, `SELECT campaign.id, ${METR} FROM campaign WHERE ${cmpWhere} AND metrics.impressions > 0`),
      gadsQuery(env, token, acct, `SELECT campaign.id, ad_group.id, ${METR} FROM ad_group WHERE ${cmpWhere} AND metrics.impressions > 0`),
      gadsQuery(env, token, acct, `SELECT campaign.id, ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions FROM keyword_view WHERE ${cmpWhere} AND metrics.impressions > 0 LIMIT 250`),
    ]);
    if (prev.ok) prevKpis = richKpi((prev.rows && prev.rows[0] ? prev.rows[0].metrics : {}));
    for (const r of (prevCampRes.rows || [])) prevCamp[String((r.campaign || {}).id || '')] = richKpi(r.metrics);
    for (const r of (prevAgRes.rows || [])) prevAg[String((r.adGroup || {}).id || '')] = richKpi(r.metrics);
    for (const r of (prevKwRes.rows || [])) {
      const c = r.campaign || {}, ag = r.adGroup || {}, m = r.metrics || {}, kw = ((r.adGroupCriterion || {}).keyword) || {};
      const spend = Number(m.costMicros || 0) / 1e6, impressions = Number(m.impressions || 0), clicks = Number(m.clicks || 0);
      prevKw[kwKey(String(c.id || ''), ag.name || '', kw.text || '', kw.matchType || '')] = { spend, impressions, clicks, ctr: impressions > 0 ? (clicks / impressions * 100) : 0, cpc: Number(m.averageCpc || 0) / 1e6, conversions: Number(m.conversions || 0) };
    }
    compareLabel = compare === 'previous' ? 'vorige periode' : (compare === 'month' ? 'vorige maand' : 'vorig jaar');
  }

  const dailyByCamp = {};
  for (const r of (dailyRes.rows || [])) {
    const cid = String((r.campaign || {}).id || ''), m = r.metrics || {}, s = r.segments || {};
    (dailyByCamp[cid] = dailyByCamp[cid] || []).push({ date: s.date || '', spend: Number(m.costMicros || 0) / 1e6, impressions: Number(m.impressions || 0), clicks: Number(m.clicks || 0), conversions: Number(m.conversions || 0) });
  }
  const agByCamp = {};
  for (const r of (agRes.rows || [])) {
    const cid = String((r.campaign || {}).id || ''), ag = r.adGroup || {};
    (agByCamp[cid] = agByCamp[cid] || []).push(Object.assign({ id: String(ag.id || ''), name: ag.name || '', status: ag.status || '', prev: prevAg[String(ag.id || '')] || null }, richKpi(r.metrics)));
  }
  Object.keys(agByCamp).forEach((cid) => agByCamp[cid].sort((a, b) => b.spend - a.spend));

  const campaigns = (campRes.rows || []).map((r) => {
    const c = r.campaign || {}, m = r.metrics || {}, cid = String(c.id || '');
    return Object.assign({
      id: cid, name: c.name || '', status: c.status || '',
      channel: GADS_CHANNEL[c.advertisingChannelType] || str(c.advertisingChannelType),
      budget: Number((r.campaignBudget || {}).amountMicros || 0) / 1e6,
      imprShare: Number(m.searchImpressionShare || 0) * 100,
      daily: dailyByCamp[cid] || [], adGroups: agByCamp[cid] || [], prev: prevCamp[cid] || null,
    }, richKpi(m));
  });

  const keywords = (kwRes.rows || []).map((r) => {
    const c = r.campaign || {}, ag = r.adGroup || {}, m = r.metrics || {}, kw = ((r.adGroupCriterion || {}).keyword) || {};
    const spend = Number(m.costMicros || 0) / 1e6, impressions = Number(m.impressions || 0), clicks = Number(m.clicks || 0);
    return { campaign: c.name || '', campaignId: String(c.id || ''), adGroup: ag.name || '', text: kw.text || '', matchType: kw.matchType || '', spend, impressions, clicks, ctr: impressions > 0 ? (clicks / impressions * 100) : 0, cpc: Number(m.averageCpc || 0) / 1e6, conversions: Number(m.conversions || 0), prev: prevKw[kwKey(String(c.id || ''), ag.name || '', kw.text || '', kw.matchType || '')] || null };
  });

  const error = (!accRes.ok && !campRes.ok) ? (accRes.err || campRes.err || 'fetch_failed') : null;
  const period = useRange ? { from, to, compare } : { preset, compare: 'none' };
  return { status: 200, body: { ok: true, linked: true, account: acct, currency: 'EUR', period, kpis, prevKpis, compareLabel, campaigns, keywords, error } };
}

// SEC-4: bevestig dat een post-id ECHT tot de blogId van DEZE klant hoort (anti-IDOR).
// Zonder deze check kon klant A met het post-id van klant B een misleidende interne
// goedkeuring/feedback-melding triggeren. Hergebruikt het blogId-gescopete scheduler-venster.
async function mcPostBelongsToBlog(env, blogId, postId) {
  if (!blogId || !postId || !str(env && env.METRICOOL_API_KEY)) return false;
  const userId = await metricoolUserId(env, blogId).catch(() => '');
  const start = mcStamp(Date.now() - 122 * 86400000);
  const end = mcStamp(Date.now() + 122 * 86400000);
  const q = new URLSearchParams({ blogId: String(blogId), start, end, timezone: METRICOOL_TZ });
  if (userId) q.set('userId', String(userId));
  try {
    const r = await fetch(`${METRICOOL_BASE}/scheduler/posts?${q.toString()}`, { headers: mcHeaders(env) });
    const d = await r.json().catch(() => null);
    const arr = d && Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
    return (arr || []).some((p) => String(p && p.id) === String(postId));
  } catch (e) { return false; }
}

/* ---- metricoolApprove (WRITE) - keur een geplande concept-post goed -------- */
// PUT /api/v2/scheduler/posts/{id}/approval { status:"approved" } (per onderzoeksrapport).
// Defensief: bij elk niet-2xx / onbevestigd endpoint -> { ok:false, error:'approval_unsupported' }
// i.p.v. falen. We muteren NOOIT zonder een geldige scope (blogId van de bedrijf-taak).
export async function metricoolApprove(bedrijfId, body, env) {
  const postId = cleanId(body && (body.id || body.post_id));
  if (!postId) {
    return { status: 400, body: { ok: false, error: 'missing_post_id' } };
  }
  // scope-guard: de bedrijf-taak moet een Metricool-koppeling hebben (anders geen recht).
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const blogId = br.ok && br.data ? str(getCF(br.data, FIELD.metricoolId)).trim() : '';
  if (!blogId) {
    return { status: 403, body: { ok: false, error: 'not_linked', message: 'Geen Metricool-koppeling voor dit bedrijf.' } };
  }
  // SEC-4: post moet tot DEZE klant z'n blogId horen (anti-IDOR).
  if (!(await mcPostBelongsToBlog(env, blogId, postId))) {
    return { status: 404, body: { ok: false, error: 'post_not_found' } };
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
  const postId = cleanId(body && (body.id || body.post_id));
  const feedback = str(body && (body.feedback || body.bericht)).trim();
  if (!postId || !feedback) {
    return { status: 400, body: { ok: false, error: 'missing_fields' } };
  }
  const br = await cu.get(env, `/task/${bedrijfId}`);
  // SEC-4: post moet tot DEZE klant z'n blogId horen (anti-IDOR), anders geen melding.
  const blogId = br.ok && br.data ? str(getCF(br.data, FIELD.metricoolId)).trim() : '';
  if (!blogId || !(await mcPostBelongsToBlog(env, blogId, postId))) {
    return { status: 404, body: { ok: false, error: 'post_not_found' } };
  }
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

/* ---- metricoolUpdate (WRITE) - klant past een post DIRECT aan in Metricool ----
   Kanalen (providers), caption+hashtags (text) en visual (media via publieke URL). De klant
   stuurt enkel de wijzigingen; de worker haalt de volledige post op, schoont 'info' op
   (providers enkel {network}, geen read-only statusvelden) en PUT terug. LET OP: Metricool
   VERNUMMERT het id bij een update -> we geven het nieuwe id terug zodat de FE kan herladen. */
function mcCleanInfo(p) {
  const mediaArr = Array.isArray(p.media) ? p.media.map((m) => str(m)).filter(Boolean) : [];
  const origAlt = Array.isArray(p.mediaAltText) ? p.mediaAltText : [];
  const info = {
    text: str(p.text),
    media: mediaArr,
    mediaAltText: mediaArr.map((_, i) => (origAlt[i] != null ? origAlt[i] : null)),  // ALT-array moet even lang zijn als media
    providers: (Array.isArray(p.providers) ? p.providers : []).map((x) => ({ network: str(x && x.network).toLowerCase() })).filter((x) => x.network),
    publicationDate: { dateTime: str(p.publicationDate && p.publicationDate.dateTime), timezone: str((p.publicationDate && p.publicationDate.timezone) || METRICOOL_TZ) },
    draft: !!p.draft,
    autoPublish: p.autoPublish !== false,
    shortener: !!p.shortener,
    firstCommentText: str(p.firstCommentText != null ? p.firstCommentText : ''),
  };
  if (p.uuid != null) info.uuid = p.uuid;
  for (const k of Object.keys(p)) { if (/Data$/.test(k) && p[k] && typeof p[k] === 'object') info[k] = p[k]; }  // *Data-blokken 1-op-1
  return info;
}
export async function metricoolUpdate(bedrijfId, body, env) {
  const postId = cleanId(body && (body.id || body.post_id));
  if (!postId) return { status: 400, body: { ok: false, error: 'missing_post_id' } };
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const blogId = br.ok && br.data ? str(getCF(br.data, FIELD.metricoolId)).trim() : '';
  if (!blogId) return { status: 403, body: { ok: false, error: 'not_linked' } };
  if (!str(env && env.METRICOOL_API_KEY)) return { status: 200, body: { ok: false, error: 'no_key' } };

  const userId = await metricoolUserId(env, blogId).catch(() => '');
  // 1) volledige post ophalen (binnen het 8-maanden-venster).
  const start = mcStamp(Date.now() - 122 * 86400000);
  const end = mcStamp(Date.now() + 122 * 86400000);
  const gq = new URLSearchParams({ blogId: String(blogId), start, end, timezone: METRICOOL_TZ });
  if (userId) gq.set('userId', String(userId));
  let raw = null;
  try {
    const gr = await fetch(`${METRICOOL_BASE}/scheduler/posts?${gq.toString()}`, { headers: mcHeaders(env) });
    const gd = await gr.json().catch(() => null);
    const garr = gd && Array.isArray(gd.data) ? gd.data : (Array.isArray(gd) ? gd : []);
    raw = (garr || []).find((p) => String(p && p.id) === postId) || null;
  } catch (e) {}
  if (!raw) return { status: 200, body: { ok: false, error: 'post_not_found' } };
  if (raw.draft) return { status: 200, body: { ok: false, error: 'draft_not_editable' } };

  // 2) opgeschoonde info + wijzigingen toepassen.
  const info = mcCleanInfo(raw);
  if (typeof body.text === 'string') info.text = body.text;
  if (Array.isArray(body.providers)) {
    info.providers = body.providers.map((n) => ({ network: str(typeof n === 'string' ? n : (n && n.network)).toLowerCase() })).filter((x) => x.network);
    for (const pr of info.providers) { const k = pr.network + 'Data'; if (!info[k]) info[k] = {}; }
  }
  if (Array.isArray(body.media)) { info.media = body.media.map((m) => str(m)).filter(Boolean); info.mediaAltText = info.media.map(() => null); }
  if (!info.providers.length) return { status: 200, body: { ok: false, error: 'no_providers', message: 'Kies minstens één kanaal.' } };

  // 3) PUT terug (Metricool geeft een NIEUW id terug).
  let res, out;
  try {
    const pq = new URLSearchParams({ blogId: String(blogId), timezone: METRICOOL_TZ });
    if (userId) pq.set('userId', String(userId));
    res = await fetch(`${METRICOOL_BASE}/scheduler/posts/${postId}?${pq.toString()}`, {
      method: 'PUT', headers: { ...mcHeaders(env), 'Content-Type': 'application/json' }, body: JSON.stringify(info),
    });
    out = await res.json().catch(() => null);
  } catch (e) { return { status: 200, body: { ok: false, error: 'upstream' } }; }
  if (!res.ok) return { status: 200, body: { ok: false, error: 'metricool_error', detail: str((out && (out.detail || out.title)) || res.status) } };
  const newId = out && out.data && out.data.id != null ? str(out.data.id) : postId;

  // 4) cache bustten + team melden (klant paste direct aan).
  if (env.KV) { try { await env.KV.delete(cacheKey('metricool', bedrijfId)); } catch (e) {} }
  const naam = str(br.data && br.data.name) || 'Klant';
  try {
    await directMessage(bedrijfId, {
      klant_naam: naam,
      onderwerp: 'Social post aangepast via portaal',
      bericht: `De klant paste een geplande social post zelf aan via het portaal (oud id ${postId} -> nieuw id ${newId}). Kanalen: ${info.providers.map((x) => x.network).join(', ')}.`,
    }, env);
  } catch (e) {}
  return { status: 200, body: { ok: true, id: newId, providers: info.providers.map((x) => x.network) } };
}

/* =============================================================================
   AI-assistent (portaal-chatbot) - rechtstreeks via Cloudflare, GEEN Make.
   Prompt + model komen uit een ClickUp-config-taak (door Studio 27 zelf bewerkbaar in
   ClickUp): eerste regel "MODEL: <naam>", dan "---", dan de system-prompt. Modelnaam met
   'gpt'/'o' -> OpenAI, anders -> Anthropic. Sleutels: env.ANTHROPIC_API_KEY / env.OPENAI_API_KEY.
   ============================================================================= */
export const AI_CONFIG_TASK = '86ca5511h';
const AI_DEFAULT_MODEL = 'claude-3-5-sonnet-latest';
const AI_DEFAULT_PROMPT = 'Je bent de vriendelijke digitale assistent van Studio 27. Antwoord kort, warm en in het Nederlands (je-vorm). Gebruik de meegegeven projectcontext en verzin niets. Weet je iets niet, verwijs dan door naar de vaste contactpersoon via de projectchat.';
let _aiCfgCache = { val: null, exp: 0 };
async function aiConfig(env) {
  const now = Date.now();
  if (_aiCfgCache.val && now < _aiCfgCache.exp) return _aiCfgCache.val;
  let model = AI_DEFAULT_MODEL, prompt = AI_DEFAULT_PROMPT;
  try {
    const r = await cu.get(env, `/task/${AI_CONFIG_TASK}?include_markdown_description=true`);
    const desc = r.ok && r.data ? str(r.data.text_content || r.data.description) : '';
    if (desc.trim()) {
      const mMatch = desc.match(/MODEL:\s*([^\n\r]+)/i);
      if (mMatch) model = mMatch[1].trim();
      const sep = desc.indexOf('---');
      const body = (sep >= 0 ? desc.slice(sep + 3) : desc.replace(/MODEL:[^\n\r]*/i, '')).trim();
      if (body) prompt = body;
    }
  } catch (e) {}
  const val = { model, systemPrompt: prompt };
  _aiCfgCache = { val, exp: now + 60 * 1000 };   // 60s cache, zodat een prompt-wijziging snel doorwerkt
  return val;
}
async function aiComplete(env, model, system, user) {
  model = str(model) || AI_DEFAULT_MODEL;
  try {
    if (/^(gpt|o\d)/i.test(model)) {
      const key = str(env && env.OPENAI_API_KEY); if (!key) return { err: 'no_openai_key' };
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 700, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) return { err: str((d && d.error && d.error.message) || r.status) };
      const txt = d && d.choices && d.choices[0] && d.choices[0].message ? str(d.choices[0].message.content) : '';
      return txt ? { text: txt } : { err: 'empty' };
    }
    const key = str(env && env.ANTHROPIC_API_KEY); if (!key) return { err: 'no_anthropic_key' };
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 700, system, messages: [{ role: 'user', content: user }] }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return { err: str((d && d.error && d.error.message) || r.status) };
    const txt = d && Array.isArray(d.content) && d.content[0] ? str(d.content[0].text) : '';
    return txt ? { text: txt } : { err: 'empty' };
  } catch (e) { return { err: 'network' }; }
}
export async function aiChat(bedrijfId, body, env) {
  const vraag = str(body && (body.vraag || body.question)).trim();
  if (!vraag) return { status: 400, body: { ok: false, error: 'no_question', answer: '' } };
  const br = await cu.get(env, `/task/${bedrijfId}`);            // scope: geldig bedrijf
  const klantNaam = str(body && body.klant_naam) || str(br.ok && br.data && br.data.name) || 'de klant';
  const cfg = await aiConfig(env);
  const context = str(body && body.projecten_context);
  const user = `Vraag van ${klantNaam}:\n${vraag}\n\nLopende projecten van deze klant (context, niets verzinnen):\n${context || '(geen projectdata beschikbaar)'}`;
  const res = await aiComplete(env, cfg.model, cfg.systemPrompt, user);
  if (!res || res.err || !res.text) {
    // graceful: de FE toont dan haar doorverwijs-zin. error-veld helpt bij debuggen (logs).
    return { status: 200, body: { ok: false, error: (res && res.err) || 'ai_unavailable', answer: '' } };
  }
  return { status: 200, body: { ok: true, answer: res.text, model: cfg.model } };
}

/* Rijke AI-context: ALLE taken (hoofdtaken + subtaken) gekoppeld aan dit bedrijf, met status,
   tak, deadline, opleveringen EN inhoud (beschrijving). Wordt door de worker net vóór de Make-
   forward in body.projecten_context gezet, zodat de chatbot de volledige bedrijfscontext meekrijgt.
   Merge van subtasks=false (volledige top-level set) + subtasks=true (subtaken), gededupliceerd. */
export async function buildAiContext(env, bedrijfId) {
  const cf = `[{"field_id":"${FIELD.bedrijf}","operator":"ANY","value":["${bedrijfId}"]}]`;
  const enc = encodeURIComponent(cf);
  let flat = [], tree = [];
  try {
    [flat, tree] = await Promise.all([
      pageAll(env, (p) => `/team/${TEAM_ID}/task?subtasks=false&include_closed=true&page=${p}&custom_fields=${enc}`),
      pageAll(env, (p) => `/team/${TEAM_ID}/task?subtasks=true&include_closed=true&page=${p}&custom_fields=${enc}`),
    ]);
  } catch (e) { /* fail-soft: lege context i.p.v. de chatbot breken */ }
  const seen = new Set(); const lines = [];
  for (const t of (flat || []).concat(tree || [])) {
    const id = str(t && t.id); if (!id || seen.has(id)) continue; seen.add(id);
    if (!getRelationIds(t, FIELD.bedrijf).includes(String(bedrijfId))) continue;   // her-check scope
    if (lines.length >= 120) break;                                                // ruime maar begrensde context
    const naam = str(t.name).replace(/\s+/g, ' ').trim();
    const st = str(t.status && t.status.status) || 'onbekend';
    const disc = disciplineOf(t);
    const due = t.due_date ? fmtDateFromMs(t.due_date) : '';
    const sub = t.parent ? ' [subtaak]' : '';
    const deliv = parseDeliverables(getCF(t, FIELD.deliverablesRaw)).map((d) => d.url);
    const desc = str(t.text_content || t.description).replace(/\s+/g, ' ').trim().slice(0, 500);
    let line = `- ${naam}${sub} | status: ${st}` + (disc ? ` | tak: ${disc}` : '') + (due ? ` | deadline: ${due}` : '');
    if (deliv.length) line += ` | opgeleverd: ${deliv.slice(0, 4).join(' ')}`;
    if (desc) line += `\n  inhoud: ${desc}`;
    lines.push(line);
  }
  return lines.length ? lines.join('\n') : '(geen taken gekoppeld aan dit bedrijf)';
}

/* =============================================================================
   SHOOT-INPLANNEN (port van studio27.be/shoot-inplannen, VOLLEDIG zonder Make)
   -----------------------------------------------------------------------------
   1:1 met de Make-scenario's [CONT] Booking widget: availability (5662991) +
   submit (5663001). De klant kiest in het portaal een shootdag + startuur uit de
   shootkalender en vult locatie/contact in. shootContext levert validatie +
   beschikbaarheid; shootSubmit schrijft de booking weg op de shoot-taak:
   start_date/due_date (+ -_time), assignee (random vrij poollid), de custom fields
   Startdatum (date) + Locatie (location, lat/lng + adres), de VOLLEDIGE booking in
   de task-description, plus een interne ClickUp-comment voor het content-team.
   ============================================================================= */
// Hosts = content-creators-pool (ClickUp user-ids), 1:1 met de externe widget/VIDEO_POOL.
const SHOOT_HOSTS = [
  { id: 36583476, name: 'Bjorn' },
  { id: 36583478, name: 'Guus' },
  { id: 82624365, name: 'Viktor' },
  { id: 54339680, name: 'Ines' },
];
// Planning-lijsten die de beschikbaarheid voeden (1:1 met availability-scenario 5662991).
const SHOOT_AVAIL_LISTS = {
  shoots:     '901520180316', // Video-en fotografie
  shoots_27m: '901522906153', // 27M video-planning
  vakantie:   '901520180360', // Payroll/afwezigheid (= PAYROLL_LIST)
};
// TYPE JOB dropdown-optie 'Shoot' (UUID) - filter op de twee shoot-lijsten.
const SHOOT_TYPE_OPTION = 'ceaa5d14-b8c6-42ca-8509-3050eba99f9e';

// Europe/Brussels-helpers (DST-correct via Intl, geen tz-library nodig).
function brusselsOffsetMin(ms) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Brussels', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = {}; dtf.formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - ms) / 60000);
}
// Wandklok-tijd (Brussels) -> epoch-ms. Offset op de gok-instant volstaat (shoots starten >=08:00, ver van de DST-omschakeling om 02:00-03:00).
function brusselsWallToMs(ymd, hhmm) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(ymd));
  if (!m) return 0;
  const t = /^(\d{1,2}):(\d{2})$/.exec(str(hhmm) || '00:00');
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], t ? +t[1] : 0, t ? +t[2] : 0, 0, 0);
  return guess - brusselsOffsetMin(guess) * 60000;
}
function msToBrusselsYmd(ms) {
  const n = Number(ms); if (!n) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(n)); // 'YYYY-MM-DD'
}
function msToBrusselsHm(ms) {
  const n = Number(ms); if (!n) return null;
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', hour12: false, hour: '2-digit', minute: '2-digit' }).format(new Date(n)); // 'HH:mm'
}

// Eén shoot/vakantie-taak -> {dateStart, dateEnd (YYYY-MM-DD, Brussels), assignees:[ids]}.
function shootAvailNorm(t) {
  const startYmd = msToBrusselsYmd(t.start_date) || msToBrusselsYmd(t.due_date);
  const endYmd = msToBrusselsYmd(t.due_date) || startYmd;
  const assignees = (Array.isArray(t.assignees) ? t.assignees : [])
    .map((a) => (a && typeof a === 'object') ? a.id : a).filter((x) => x != null);
  return { dateStart: startYmd, dateEnd: endYmd, assignees };
}

// Beschikbaarheid: 3 planning-lijsten over [now-1d, now+365d]. Venster dekt exact het
// klikbare bereik van de frontend-kalender (SHOOT_WINDOW_DAYS=365), zodat dagen 361-365 niet
// vals als 'vrij' tonen door ontbrekende data. Fail-open (lege lijsten bij fout).
async function shootAvailability(env) {
  const van = Date.now() - 1 * 86400000;
  const tot = Date.now() + 365 * 86400000;
  const filter = encodeURIComponent(JSON.stringify([{ field_id: FIELD.typeJob, operator: '=', value: SHOOT_TYPE_OPTION }]));
  const build = (id, withFilter) => (page) =>
    `/list/${id}/task?subtasks=true&include_closed=true&due_date_gt=${van}&due_date_lt=${tot}&page=${page}` + (withFilter ? `&custom_fields=${filter}` : '');
  const [shoots, shoots27m, vakantie] = await Promise.all([
    pageAll(env, build(SHOOT_AVAIL_LISTS.shoots, true)),
    pageAll(env, build(SHOOT_AVAIL_LISTS.shoots_27m, true)),
    pageAll(env, build(SHOOT_AVAIL_LISTS.vakantie, false)),
  ]);
  return {
    shoots: shoots.map(shootAvailNorm),
    shoots_27m: shoots27m.map(shootAvailNorm),
    vakantie: vakantie.map(shootAvailNorm),
    hosts: SHOOT_HOSTS,
  };
}

// Server-side: vrije host-ids op een YYYY-MM-DD (Brussels). Zelfde regel als de widget:
// shoot -> bezet op dateStart; vakantie -> bezet als datum in [dateStart,dateEnd].
function freeHostIdsOnDate(avail, dateStr) {
  const busy = new Set();
  (avail.shoots || []).forEach((s) => { if (s.dateStart === dateStr) (s.assignees || []).forEach((a) => busy.add(Number(a))); });
  (avail.shoots_27m || []).forEach((s) => { if (s.dateStart === dateStr) (s.assignees || []).forEach((a) => busy.add(Number(a))); });
  (avail.vakantie || []).forEach((v) => { if (v.dateStart && dateStr >= v.dateStart && dateStr <= (v.dateEnd || v.dateStart)) (v.assignees || []).forEach((a) => busy.add(Number(a))); });
  return SHOOT_HOSTS.map((h) => h.id).filter((id) => !busy.has(Number(id)));
}

/* ---- publicShootAvailability (PUBLIEK, geen auth, geen klant-scope) ----------
 * Geaggregeerde shoot-capaciteit per dag voor de publieke beschikbaarheidspagina
 * die Studio 27 vrijblijvend naar prospects/klanten doorstuurt (geen offerte nodig).
 * Geeft UITSLUITEND tellingen terug: per dag het aantal vrije content creators van
 * de pool (van de SHOOT_HOSTS). NOOIT namen, task-ids, klant- of locatiedata - er mag
 * niets gevoeligs lekken via deze open endpoint. Montage valt hier bewust buiten:
 * enkel de twee shoot-lijsten (+ afwezigheid) bepalen de capaciteit, exact zoals de
 * booking-widget. opts: { days } (default 120, cap 366). Fail-open -> lege dagen.
 */
export async function publicShootAvailability(env, opts) {
  const days = Math.max(1, Math.min(366, (opts && Number(opts.days)) || 120));
  let avail;
  try { avail = await shootAvailability(env); }
  catch (e) { avail = { shoots: [], shoots_27m: [], vakantie: [], hosts: SHOOT_HOSTS }; }
  const total = SHOOT_HOSTS.length;
  // Anker op 12:00 UTC per dag -> altijd dezelfde Brusselse kalenderdag (DST-veilig).
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0);
  const out = [];
  for (let i = 0; i < days; i++) {
    const ymd = msToBrusselsYmd(base + i * 86400000);
    if (!ymd) continue;
    out.push({ date: ymd, free: freeHostIdsOnDate(avail, ymd).length });
  }
  return { ok: true, total, days: out };
}

/* ---- shootContext (READ) - validatie + beschikbaarheid in één call ----------
 * Body: { task_id }. Scope-guard fail-CLOSED (opstap naar een write).
 * Status: 'ok' | 'not_found' | 'wrong_type' | 'incomplete_metadata' | 'already_scheduled' | 'forbidden'.
 */
export async function shootContext(bedrijfId, body, env) {
  const taskId = cleanId(body && body.task_id);
  if (!taskId) return { status: 200, body: { status: 'not_found' } };
  const tr = await cu.get(env, `/task/${taskId}`);
  if (!tr.ok || !tr.data || (!tr.data.id && !tr.data.name)) return { status: 200, body: { status: 'not_found' } };
  const task = tr.data;
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.write);
  if (!sc.ok) return { status: 403, body: { status: 'forbidden', message: 'Geen toegang tot deze taak.' } };
  // TYPE JOB = Shoot (single-task GET levert de orderindex 6).
  if (Number(getCF(task, FIELD.typeJob)) !== 6) return { status: 200, body: { status: 'wrong_type' } };
  // Reeds een due_date -> al ingepland: details tonen, niet opnieuw laten boeken.
  if (heeftDueDate(task)) {
    const locVal = getCF(task, FIELD.locatie);
    const locatie = (locVal && (locVal.formatted_address || locVal.address)) || '';
    const startMs = Number(task.start_date) || 0;
    const dueMs = Number(task.due_date) || 0;
    const st = startMs ? msToBrusselsHm(startMs) : null;
    const et = dueMs ? msToBrusselsHm(dueMs) : null;
    return { status: 200, body: { status: 'already_scheduled',
      datum: msToBrusselsYmd(startMs || dueMs),
      startTime: (st && st !== '00:00') ? st : null,
      endTime: (et && et !== '00:00') ? et : null,
      locatie } };
  }
  const timeHours = task.time_estimate ? Math.round(Number(task.time_estimate) / 3600000) : null;
  const aRaw = getCF(task, FIELD.contentCreators);
  const aantalCreators = (aRaw != null && aRaw !== '') ? (parseInt(aRaw, 10) + 1) : null;
  if (!timeHours || !aantalCreators) return { status: 200, body: { status: 'incomplete_metadata' } };
  let availability;
  try { availability = await shootAvailability(env); }
  catch (e) { availability = { shoots: [], shoots_27m: [], vakantie: [], hosts: SHOOT_HOSTS }; }
  return { status: 200, body: { status: 'ok', task_name: str(task.name), timeHours, aantalCreators, availability } };
}

/* ---- shootSubmit (WRITE) - boeking wegschrijven (description + custom fields) -
 * Body: { task_id, datum, datumLeesbaar, startuur, duur, timeHours, aantalPersonen,
 *         klantVoornaam, klantEmail, locatie, locatieStraat, locatiePostcode,
 *         locatieGemeente, contactNaam, contactGsm, extraInfo, lat?, lng? }.
 * Scope-guard fail-CLOSED + dubbel-boek-guard (bestaande due_date).
 */
export async function shootSubmit(bedrijfId, body, env) {
  const taskId = cleanId(body && body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const tr = await cu.get(env, `/task/${taskId}`);
  const task = (tr.ok && tr.data) ? tr.data : { custom_fields: [] };
  const sc = scopeCheckTask(task, bedrijfId, SCOPE_FAIL_CLOSED.write);
  if (!sc.ok) return { status: 403, body: { ok: false, error: 'scope_mismatch', message: 'Geen toegang tot deze taak.' } };
  if (heeftDueDate(task)) return { status: 200, body: { ok: true, already_booked: true, message: 'Deze shoot is zonet al ingepland.' } };

  const datum = str(body.datum);                       // YYYY-MM-DD
  const startuur = str(body.startuur);                 // HH:mm
  const datumLeesbaar = str(body.datumLeesbaar) || datum;
  const timeHours = Number(body.timeHours) || 0;
  const aantalPersonen = Number(body.aantalPersonen) || 1;
  const duurLabel = str(body.duur);
  const voornaam = str(body.klantVoornaam);
  const email = str(body.klantEmail);
  const straat = str(body.locatieStraat);
  const postcode = str(body.locatiePostcode);
  const gemeente = str(body.locatieGemeente);
  const contactNaam = str(body.contactNaam);
  const contactGsm = str(body.contactGsm);
  const extraInfo = str(body.extraInfo);

  const startMs = brusselsWallToMs(datum, startuur);
  if (!startMs) return { status: 400, body: { ok: false, error: 'bad_date' } };
  // Eind = effectieve duur op locatie (totaal / aantal creators, op halfuur naar boven), zelfde regel als de slotpicker.
  const effHours = aantalPersonen > 0 ? Math.ceil((timeHours / aantalPersonen) * 2) / 2 : timeHours;
  const endMs = startMs + Math.max(1, Math.round(effHours * 3600000));

  // Host-keuze: verse server-side beschikbaarheid -> random vrij poollid op die dag.
  let pickedHost = null;
  try {
    const avail = await shootAvailability(env);
    const free = freeHostIdsOnDate(avail, datum);
    if (free.length) {
      const pid = free[Math.floor(Math.random() * free.length)];
      pickedHost = SHOOT_HOSTS.find((h) => Number(h.id) === Number(pid)) || { id: pid, name: '' };
    }
  } catch (e) { /* fail-open: PM wijst handmatig toe */ }

  // (1) native velden via PUT (persisteren WEL): start/eind + assignee.
  const putBody = { start_date: startMs, start_date_time: true, due_date: endMs, due_date_time: true };
  if (pickedHost) putBody.assignees = { add: [Number(pickedHost.id)], rem: [] };
  await cu.put(env, `/task/${taskId}`, putBody);

  // (2) Startdatum (date custom field) - via POST /field (custom_fields via PUT persisteren niet).
  await cu.post(env, `/task/${taskId}/field/${FIELD.startdatum}`, { value: startMs, value_options: { time: true } });

  // (3) Locatie (location custom field): client-coords (autocomplete) -> server-geocode -> anders overslaan.
  let coords = null;
  let formatted = str(body.locatie) || `${straat}, ${postcode} ${gemeente}, België`.replace(/\s+,/g, ',');
  const clat = Number(body.lat), clng = Number(body.lng);
  if (Number.isFinite(clat) && Number.isFinite(clng) && (clat || clng)) {
    coords = { lat: clat, lng: clng };
  } else if (env && env.GOOGLE_GEOCODE_KEY && (straat || postcode || gemeente)) {
    try {
      const gr = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' +
        encodeURIComponent(`${straat}, ${postcode} ${gemeente}, België`) + '&key=' + encodeURIComponent(env.GOOGLE_GEOCODE_KEY));
      const gd = await gr.json().catch(() => ({}));
      const r0 = gd && Array.isArray(gd.results) && gd.results[0];
      if (r0 && r0.geometry && r0.geometry.location) {
        coords = { lat: r0.geometry.location.lat, lng: r0.geometry.location.lng };
        formatted = str(r0.formatted_address) || formatted;
      }
    } catch (e) { /* geocode-fout -> geen coords, adres staat in de description */ }
  }
  if (coords) {
    await cu.field(env, taskId, FIELD.locatie, { location: { lat: coords.lat, lng: coords.lng }, formatted_address: formatted });
  }

  // (4) VOLLEDIGE booking in de task-description (Vincent: 'schrijf de data in de description').
  const L = [];
  L.push('SHOOT INGEPLAND VIA KLANTENPORTAAL');
  L.push('');
  L.push(`Klant: ${voornaam}${email ? ` (${email})` : ''}`);
  L.push(`Datum: ${datumLeesbaar}`);
  L.push(`Startuur: ${startuur} (aankomst op locatie)`);
  if (duurLabel) L.push(`Duur: ${duurLabel}`);
  L.push(`Aantal creators: ${aantalPersonen}`);
  if (pickedHost && pickedHost.name) L.push(`Voorlopig toegewezen: ${pickedHost.name}`);
  L.push('');
  L.push('Startlocatie:');
  if (straat) L.push(straat);
  const pcg = `${postcode} ${gemeente}`.trim();
  if (pcg) L.push(pcg);
  if (contactNaam || contactGsm) { L.push(''); L.push(`Contactpersoon op locatie: ${[contactNaam, contactGsm].filter(Boolean).join(' · ')}`); }
  if (extraInfo) { L.push(''); L.push('Extra info / briefing:'); L.push(extraInfo); }
  const bookingBlock = L.join('\n');
  const prev = str(task.description).trim();
  const newDesc = prev ? (bookingBlock + '\n\n----------\n\n' + prev) : bookingBlock;
  await cu.put(env, `/task/${taskId}`, { description: newDesc });

  // (5) interne comment voor het content-team (notify_all -> toegewezen host krijgt melding).
  const C = [];
  C.push('🎬 Klant heeft een shoot ingepland via het klantenportaal.');
  C.push('');
  C.push(`Klant: ${voornaam}${email ? ` (${email})` : ''}`);
  C.push(`Datum: ${datumLeesbaar} · ${startuur}${duurLabel ? ` · ${duurLabel}` : ''}`);
  C.push(`Aantal personen: ${aantalPersonen}`);
  if (pickedHost && pickedHost.name) C.push(`Voorlopig toegewezen: ${pickedHost.name}`);
  if (pcg || straat) C.push(`Startlocatie: ${[straat, pcg].filter(Boolean).join(', ')}`);
  if (contactNaam || contactGsm) C.push(`Contact op locatie: ${[contactNaam, contactGsm].filter(Boolean).join(' · ')}`);
  if (extraInfo) C.push(`Extra info: ${extraInfo}`);
  C.push('');
  C.push('Controleer de toewijzing in ClickUp en bevestig de afspraak bij de klant.');
  try { await cu.comment(env, taskId, C.join('\n'), true); } catch (e) { /* comment-fout mag de booking niet breken */ }

  return { status: 200, body: { ok: true, taskId, assignedTo: pickedHost ? pickedHost.id : null, assignedName: pickedHost ? pickedHost.name : '' } };
}

/* ---- metricoolMediaUpload (WRITE) — klant uploadt een foto/video als post-visual ----
 * Metricool's scheduler verwacht een PUBLIEKE media-URL, geen bytes. We bewaren de upload
 * daarom kort in KV en serveren ze via de publieke /media/{key}-route op de worker; die URL
 * geven we terug zodat de editor ze als media meegeeft aan metricoolUpdate. Tenant-safe
 * (enkel Metricool-gekoppelde bedrijven), type-allowlist (image/video) + nosniff bij serveren.
 */
export const MEDIA_PUBLIC_BASE = 'https://s27-portal-gateway-v2.studio27marketing.workers.dev';
export async function metricoolMediaUpload(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const blogId = br.ok && br.data ? str(getCF(br.data, FIELD.metricoolId)).trim() : '';
  if (!blogId) return { status: 403, body: { ok: false, error: 'not_linked' } };
  if (!env.KV) return { status: 200, body: { ok: false, error: 'no_storage', message: 'Upload tijdelijk niet beschikbaar.' } };
  const ct = str(body && (body.content_type || body.contentType)).toLowerCase().split(';')[0].trim();
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/.test(ct) && !/^video\/(mp4|quicktime|webm)$/.test(ct)) {
    return { status: 200, body: { ok: false, error: 'bad_type', message: 'Enkel afbeeldingen (jpg, png, gif, webp) of video (mp4, mov, webm).' } };
  }
  let bytes;
  try { bytes = base64ToBytes(str(body && (body.file_data != null ? body.file_data : body.data))); }
  catch (e) { return { status: 200, body: { ok: false, error: 'bad_base64' } }; }
  if (!bytes || !bytes.length) return { status: 200, body: { ok: false, error: 'empty' } };
  if (bytes.length > 22 * 1024 * 1024) return { status: 200, body: { ok: false, error: 'too_large', message: 'Bestand te groot (max 22 MB). Plak voor grote video\'s een URL.' } };
  const key = str(bedrijfId).replace(/[^A-Za-z0-9]/g, '').slice(0, 16) + '-' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  try { await env.KV.put('mcmedia:' + key, bytes.buffer, { expirationTtl: 60 * 86400, metadata: { ct } }); }
  catch (e) { return { status: 200, body: { ok: false, error: 'store_failed' } }; }
  return { status: 200, body: { ok: true, url: MEDIA_PUBLIC_BASE + '/media/' + key, contentType: ct } };
}

/* =============================================================================
   Handler-registry voor de router-shim + node-harness.
   READ_HANDLERS: testbaar zonder Firebase met (bedrijfId, body, env).
   ============================================================================= */
/* ---- Webprestaties (READ, staff/team) — GA4 + Search Console rechtstreeks via de Google-API's ----
 * Geen Make. Auth = de portal-SA (portal-admin@studio27-cloud) die marketing@studio27.be impersoneert
 * via domain-wide delegation: dat dekt in één keer ALLE GA4-properties + GSC-sites die marketing@
 * beheert (geverifieerd 245 GA4 + 120 GSC). mintGoogleToken met subject='marketing@studio27.be' +
 * read-only scope. Per klant resolven we GA4-property + GSC-site uit de bedrijf-taak (website-veld);
 * WEB_OVERRIDES is de pilot-bootstrap (later vervangen door een ClickUp-veld 'GA4 Property ID').
 * Output spiegelt de ads-handlers (period/trend) zodat de frontend dezelfde rendering hergebruikt. */
const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const WEB_SUBJECT = 'marketing@studio27.be';
const GA4_PRESETS = { today: ['today', 'today'], yesterday: ['yesterday', 'yesterday'], last_7d: ['7daysAgo', 'yesterday'], last_14d: ['14daysAgo', 'yesterday'], last_30d: ['30daysAgo', 'yesterday'], last_90d: ['90daysAgo', 'yesterday'] };
const GSC_LAG_DAYS = 3;
// Pilot-bootstrap: sleutel = bedrijfId OF domein -> { ga4 property-id, gsc siteUrl }.
// Vervangt later een ClickUp-veld; vorsselmans-solar live geverifieerd (GA4 263327222 / GSC sc-domain).
const WEB_OVERRIDES = {
  // pilot Vorsselmans Solar — sleutel = bedrijfId (Website-veld wijst naar het parent-domein vorsselmans.be, dus expliciet)
  '86c8cz2y7': { ga4: '263327222', gsc: 'sc-domain:vorsselmans-solar.be' },
};
function webDomain(u) { let d = str(u).trim().toLowerCase(); d = d.replace(/^https?:\/\//, ''); d = d.split('/')[0].split('?')[0]; d = d.replace(/^www\./, ''); return d; }
function _ymd(d) { return d.toISOString().slice(0, 10); }
function gscDateRange(preset, from, to) {
  if (META_YMD.test(from) && META_YMD.test(to)) return [from, to];
  const end = new Date(Date.now() - GSC_LAG_DAYS * 86400000);
  const days = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 }[preset] || 30;
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return [_ymd(start), _ymd(end)];
}
async function ga4Report(token, property, reqBody) {
  try {
    const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, rows: [], err: (d && d.error && d.error.message) || ('http_' + r.status) };
    return { ok: true, rows: (d && d.rows) || [], totals: (d && d.totals) || [] };
  } catch (e) { return { ok: false, rows: [], err: 'unreachable' }; }
}
async function gscQuery(token, siteUrl, reqBody) {
  try {
    const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, rows: [], err: (d && d.error && d.error.message) || ('http_' + r.status) };
    return { ok: true, rows: (d && d.rows) || [] };
  } catch (e) { return { ok: false, rows: [], err: 'unreachable' }; }
}
// kanaal -> bucket voor de 'betaald vs organisch'-split
function webChannelBucket(ch) {
  const c = String(ch || '').toLowerCase();
  if (c.indexOf('paid') >= 0 || c === 'cross-network' || c === 'display') return 'paid';
  if (c.indexOf('organic') >= 0) return 'organic';
  if (c === 'direct') return 'direct';
  return 'overig';
}
function webResolve(bedrijfId, br) {
  const t = br && br.ok && br.data ? br.data : null;
  const ov = WEB_OVERRIDES[bedrijfId] || {};
  // GA4: override → ClickUp-veld 'GA4 property-ID' (e3e12841). Voor uitrol: vul dat veld per klant.
  const ga4 = String(ov.ga4 || (t ? str(getCF(t, FIELD.ga4PropertyId)) : '')).replace(/[^0-9]/g, '');
  // GSC: override → ClickUp-veld 'GSC Site URL' → afgeleid uit Website (kan parent-domein zijn → dan veld/override).
  let gsc = str(ov.gsc || (t ? str(getCF(t, FIELD.gscSiteUrl)) : ''));
  if (!gsc && t) { const d = webDomain(getCF(t, FIELD.website)); if (d) gsc = 'sc-domain:' + d; }
  return { ga4, gsc };
}

export async function webTraffic(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const { ga4 } = webResolve(bedrijfId, br);
  if (!/^\d{6,20}$/.test(ga4)) return { status: 200, body: { ok: true, linked: false } };
  let token;
  try { token = await mintGoogleToken(env, WEB_SUBJECT, GA_SCOPE); }
  catch (e) { return { status: 200, body: { ok: true, linked: false, reason: 'no_token' } }; }

  const from = str(body && body.from).trim(), to = str(body && body.to).trim();
  const useRange = META_YMD.test(from) && META_YMD.test(to);
  const presetKey = str(body && body.period).trim();
  const p = GA4_PRESETS[presetKey] || GA4_PRESETS.last_30d;
  const dr = useRange ? { startDate: from, endDate: to } : { startDate: p[0], endDate: p[1] };
  const compare = ['previous', 'month', 'year'].indexOf(str(body && body.compare)) >= 0 ? str(body.compare) : 'none';

  const M = (n) => ({ name: n });
  const [chan, trend, pages, tot] = await Promise.all([
    ga4Report(token, ga4, { dateRanges: [dr], dimensions: [M('sessionDefaultChannelGroup')], metrics: [M('sessions'), M('totalUsers'), M('newUsers'), M('engagedSessions')], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 25 }),
    ga4Report(token, ga4, { dateRanges: [dr], dimensions: [M('date')], metrics: [M('sessions')], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 }),
    ga4Report(token, ga4, { dateRanges: [dr], dimensions: [M('landingPagePlusQueryString')], metrics: [M('sessions')], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 }),
    ga4Report(token, ga4, { dateRanges: [dr], metrics: [M('sessions'), M('totalUsers'), M('newUsers'), M('engagedSessions'), M('averageSessionDuration'), M('bounceRate')] }),
  ]);

  const channels = (chan.rows || []).map((r) => ({ channel: r.dimensionValues[0].value, sessions: +r.metricValues[0].value, users: +r.metricValues[1].value, newUsers: +r.metricValues[2].value, engaged: +r.metricValues[3].value }));
  const split = { paid: 0, organic: 0, direct: 0, overig: 0 };
  for (const c of channels) split[webChannelBucket(c.channel)] += c.sessions;
  const trendRows = (trend.rows || []).map((r) => ({ date: r.dimensionValues[0].value, sessions: +r.metricValues[0].value }));
  const landingPages = (pages.rows || []).map((r) => ({ page: r.dimensionValues[0].value, sessions: +r.metricValues[0].value }));
  const tm = (tot.rows && tot.rows[0] && tot.rows[0].metricValues) || [];
  const totals = tm.length
    ? { sessions: +tm[0].value, users: +tm[1].value, newUsers: +tm[2].value, engaged: +tm[3].value, avgDuration: +tm[4].value, bounceRate: +tm[5].value }
    : { sessions: channels.reduce((a, c) => a + c.sessions, 0), users: 0, newUsers: 0, engaged: 0, avgDuration: 0, bounceRate: 0 };

  let prevTotals = null, compareLabel = '';
  if (useRange && compare !== 'none') {
    const cw = metaCompareWindow(from, to, compare);
    const pv = await ga4Report(token, ga4, { dateRanges: [{ startDate: cw[0], endDate: cw[1] }], metrics: [M('sessions'), M('totalUsers')] });
    const pm = (pv.rows && pv.rows[0] && pv.rows[0].metricValues) || [];
    if (pm.length) prevTotals = { sessions: +pm[0].value, users: +pm[1].value };
    compareLabel = compare === 'previous' ? 'vorige periode' : (compare === 'month' ? 'vorige maand' : 'vorig jaar');
  }

  const error = (!chan.ok && !tot.ok) ? (chan.err || tot.err || 'fetch_failed') : null;
  const period = useRange ? { from, to, compare } : { preset: presetKey || 'last_30d', compare: 'none' };
  return { status: 200, body: { ok: true, linked: true, property: ga4, period, totals, prevTotals, compareLabel, channels, split, trend: trendRows, landingPages, error } };
}

export async function webSearch(bedrijfId, body, env) {
  const br = await cu.get(env, `/task/${bedrijfId}`);
  const { gsc } = webResolve(bedrijfId, br);
  if (!gsc) return { status: 200, body: { ok: true, linked: false } };
  let token;
  try { token = await mintGoogleToken(env, WEB_SUBJECT, GSC_SCOPE); }
  catch (e) { return { status: 200, body: { ok: true, linked: false, reason: 'no_token' } }; }

  const from = str(body && body.from).trim(), to = str(body && body.to).trim();
  const presetKey = str(body && body.period).trim();
  const [startDate, endDate] = gscDateRange(presetKey, from, to);

  const [queries, pages, totals, trend] = await Promise.all([
    gscQuery(token, gsc, { startDate, endDate, dimensions: ['query'], rowLimit: 25 }),
    gscQuery(token, gsc, { startDate, endDate, dimensions: ['page'], rowLimit: 10 }),
    gscQuery(token, gsc, { startDate, endDate }),
    gscQuery(token, gsc, { startDate, endDate, dimensions: ['date'] }),
  ]);
  const q = (queries.rows || []).map((r) => ({ query: (r.keys && r.keys[0]) || '', clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 }));
  const pg = (pages.rows || []).map((r) => ({ page: (r.keys && r.keys[0]) || '', clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 }));
  const t = (totals.rows && totals.rows[0]) || null;
  const tot = t ? { clicks: t.clicks || 0, impressions: t.impressions || 0, ctr: t.ctr || 0, position: t.position || 0 } : { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const tr = (trend.rows || []).map((r) => ({ date: (r.keys && r.keys[0]) || '', clicks: r.clicks || 0, impressions: r.impressions || 0 }));

  const error = (!queries.ok && !totals.ok) ? (queries.err || totals.err || 'fetch_failed') : null;
  const period = { from: startDate, to: endDate };
  return { status: 200, body: { ok: true, linked: true, site: gsc, period, totals: tot, queries: q, pages: pg, trend: tr, error } };
}

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
  // Metricool analytics: KPI-dashboard + trend per netwerk (fase 1 metriek-look-and-feel).
  metricoolStats,
  // Metricool post-performance: per gepubliceerde post bereik/interacties/engagement (fase 2).
  metricoolPostStats,
  // Meta Ads (DIRECT via de Graph API, geen Make): real-time KPI's + actieve campagnes +
  // advertenties met creatives. Account server-side uit FIELD.metaAdsId (tenant-safe).
  metaAds,
  // Meta-campagne-creatives (rijke media: video/foto/carrousel) ON-DEMAND, via page-tokens.
  metaCampaignAds,
  // Google Ads (DIRECT via de Google Ads API, Explorer-toegang, geen Make): KPI's + campagnes + dagtrend.
  googleAds,
  // Shoot-inplannen: validatie + beschikbaarheid (port van de externe widget, geen Make).
  shootContext,
  // NB: de AI-chatbot loopt (op vraag) weer via Make, niet via de worker. De aiChat-handler
  // hierboven blijft dormant (ongebruikt) staan, klaar mocht de keuze ooit omdraaien.
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
  // Metricool: klant uploadt een foto/video als post-visual (KV-hosting -> publieke URL).
  metricoolMediaUpload,
  metricoolUpdate,
  // Google Drive writes (directe API v3, geen Make).
  huisstijlUpload,
  huisstijlDelete,
  // Shoot-inplannen: boeking wegschrijven (description + custom fields, geen Make).
  shootSubmit,
  // Meeting-tunnel: taskloze Google-Calendar-boeking (Algemene/Project/Nieuw-project) +
  // invite. Muteert geen due_date; scope-guard enkel als er een project_task_id bij zit.
  meetingBook,
};
// bedrijfBeheer sub-acties (read vs write split voor cache/rate-decisions in de shell)
export const BEDRIJFBEHEER_READ_ACTIONS = { get_team: getTeam, get_offertes: getOffertes };
export const BEDRIJFBEHEER_WRITE_ACTIONS = new Set(['save_contact', 'update_contact', 'delete_contact', 'update_bedrijf']);
