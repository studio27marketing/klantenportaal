/* =============================================================================
 * Studio 27 - TEAMPORTAAL backend (gateway-v2 module)
 * -----------------------------------------------------------------------------
 * Team-only endpoints voor het @studio27.be-medewerkersportaal (aparte frontend
 * op s27-teamportaal.workers.dev). Hergebruikt de bestaande auth-shell: de worker
 * verifieert het Firebase-token, zet body.__staff + body.account_email, en
 * dispatcht TEAM_HANDLERS vóór de klant-bedrijf-gate. Geen Make.
 *
 * Identiteit: de ingelogde @studio27.be-email -> ClickUp user-id via teamLeden()
 * (KV-gecached). Planning/status/discipline-logica komt 1:1 uit handlers.mjs zodat
 * team- en klantportaal nooit uiteenlopen (geen tweede waarheid).
 *
 * Golf 0+1: teamMe (identiteit + roster) en teamTaken (taken per teamlid: vandaag/
 * morgen/te-laat + ingepland vs nog-te-doen). Latere golven (aanvragen, payroll,
 * berichten, AI-planning) breiden TEAM_HANDLERS uit.
 * ============================================================================= */

import {
  cu, pageAll, getCF, getRelationIds, statusMapper, disciplineOf, buildSae, teamLeden,
  FIELD, LIST, PLANNING_LISTS, PAYROLL_LIST, TEAM_ID, VIDEO_POOL, _teamHelpers,
} from './handlers.mjs';

const { isDoneTask, kanBeginnenGezet, heeftDueDate, planTypeOf, msToBrusselsYmd, brusselsWallToMs } = _teamHelpers;

const str = (v) => (v == null ? '' : String(v));

/* ---- roster-config -------------------------------------------------------- */
// Ex-medewerkers die nog als ClickUp-member bestaan maar niet in het roster horen.
const EX_MEMBERS = new Set([82651156 /* Eva */, 60375565 /* Lara */]);
// Content-creators-pool (camera) -> rol-badge in het roster.
const POOL_IDS = new Set(VIDEO_POOL.map((m) => Number(m.id)));
// E-mail-alias: Vincent logt in met @studio27.be maar staat in ClickUp op een
// ander domein (vincent@zorgvoordigitaal.be, id 8714037).
const EMAIL_ALIAS = { 'vincent@studio27.be': 8714037 };
// Agenda-e-mail (DWD-impersonatie mag enkel binnen @studio27.be).
function agendaEmail(lid) {
  if (Number(lid.id) === 8714037) return 'vincent@studio27.be';
  return str(lid.email);
}

// Disciplinelijsten = de planning-lijsten zonder Payroll (afwezigheid hoort niet in de takenlijst).
const DISCIPLINE_LISTS = PLANNING_LISTS.filter((id) => id !== PAYROLL_LIST);

const okStaff = (body) => body && body.__staff === true;

/* ---- identiteit ----------------------------------------------------------- */
async function ledenLijst(env) {
  const r = await teamLeden('', { __staff: true }, env);
  return (r && r.body && Array.isArray(r.body.leden)) ? r.body.leden : [];
}
function resolveMember(email, leden) {
  const e = str(email).trim().toLowerCase();
  if (!e) return null;
  let m = leden.find((l) => l.email === e);
  if (!m && EMAIL_ALIAS[e]) m = leden.find((l) => Number(l.id) === EMAIL_ALIAS[e]);
  return m ? { id: Number(m.id), naam: m.naam, email: m.email, pool: POOL_IDS.has(Number(m.id)) } : null;
}
function rosterFrom(leden) {
  return leden
    .filter((l) => !EX_MEMBERS.has(Number(l.id)))
    .map((l) => ({ id: Number(l.id), naam: l.naam, pool: POOL_IDS.has(Number(l.id)) }))
    .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
}

// teamMe: wie ben ik (ClickUp-lid) + het volledige actieve roster (voor collega-inzicht).
export async function teamMe(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false, message: 'Alleen voor het Studio 27-team.' } };
  const leden = await ledenLijst(env);
  if (!leden.length) return { status: 502, body: { ok: false, error: 'roster_unavailable' } };
  const me = resolveMember(str(body.account_email), leden);
  if (!me) {
    return { status: 200, body: { ok: false, error: 'no_member', email: str(body.account_email),
      message: 'Je @studio27.be-account is nog niet gekoppeld aan een ClickUp-teamlid. Vraag Vincent je toe te voegen aan de ClickUp-workspace.' } };
  }
  return { status: 200, body: { ok: true, me, roster: rosterFrom(leden) } };
}

/* ---- taken per teamlid ---------------------------------------------------- */
// YYYY-MM-DD + n dagen (Brussels, DST-veilig via UTC-middag-anker).
function ymdPlus(ymd, n) { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return msToBrusselsYmd(d.getTime()); }

// Alle (open) taken van één teamlid over de disciplinelijsten. subtasks=true is in
// ClickUp GEEN superset van subtasks=false -> beide ophalen en dedupliceren.
async function tasksForMember(env, memberId) {
  const listQ = DISCIPLINE_LISTS.map((id) => `list_ids%5B%5D=${encodeURIComponent(id)}`).join('&');
  const base = (sub, page) => `/team/${TEAM_ID}/task?${listQ}&assignees%5B%5D=${encodeURIComponent(memberId)}&include_closed=false&subtasks=${sub}&page=${page}`;
  const collect = async (sub) => {
    const out = [];
    for (let p = 0; p < 15; p++) {
      const r = await cu.get(env, base(sub, p));
      const tasks = (r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : [];
      out.push(...tasks);
      if (!tasks.length || r.data.last_page === true) break;
    }
    return out;
  };
  const [a, b] = await Promise.all([collect('true'), collect('false')]);
  const byId = new Map();
  for (const t of [...a, ...b]) byId.set(str(t.id), t);
  return [...byId.values()];
}

// id -> bedrijfsnaam (Bedrijven-lijst), KV-gecached (6u).
async function bedrijvenNaamMap(env) {
  try { const hit = await env.KV.get('team:bedrijfnamen:v1', 'json'); if (hit && typeof hit === 'object') return hit; } catch (e) { /* miss */ }
  let map = {};
  try {
    const tasks = await pageAll(env, (p) => `/list/${LIST.bedrijven}/task?subtasks=false&include_closed=true&page=${p}`);
    for (const t of tasks) map[str(t.id)] = str(t.name);
  } catch (e) { map = {}; }
  try { if (env.KV) await env.KV.put('team:bedrijfnamen:v1', JSON.stringify(map), { expirationTtl: 21600 }); } catch (e) { /* best-effort */ }
  return map;
}

function shapeTask(t, naamMap) {
  const due = Number(t.due_date) || 0;
  const start = Number(t.start_date) || 0;
  const bid = (getRelationIds(t, FIELD.bedrijf)[0]) || '';
  const planActie = (kanBeginnenGezet(t) && !heeftDueDate(t) && !isDoneTask(t)) ? planTypeOf(t) : '';
  return {
    id: str(t.id), naam: str(t.name),
    status: statusMapper(t.status),
    discipline: disciplineOf(t),
    bedrijf_id: bid, bedrijf: naamMap[bid] || '',
    due, start, est: Number(t.time_estimate) || 0,
    prioriteit: (t.priority && t.priority.priority) ? str(t.priority.priority) : '',
    ingepland: due > 0 || start > 0,
    plan_actie: planActie,                 // 'shoot' | 'meeting' | '' (nog in te plannen)
    due_ymd: due ? msToBrusselsYmd(due) : '',
    url: str(t.url),
  };
}

// teamTaken: { member_id? } -> taken van dat teamlid (default: ikzelf), met buckets.
export async function teamTaken(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false, message: 'Alleen voor het Studio 27-team.' } };
  const leden = await ledenLijst(env);
  const me = resolveMember(str(body.account_email), leden);
  if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };

  // staff mag elk teamlid bekijken (collega-overzicht); default = ikzelf.
  let target = me;
  const reqId = Number(body.member_id) || 0;
  if (reqId && reqId !== me.id) {
    const c = leden.find((l) => Number(l.id) === reqId && !EX_MEMBERS.has(Number(l.id)));
    if (c) target = { id: Number(c.id), naam: c.naam, email: c.email, pool: POOL_IDS.has(Number(c.id)) };
  }

  const [raw, naamMap] = await Promise.all([tasksForMember(env, target.id), bedrijvenNaamMap(env)]);
  const taken = raw.filter((t) => !isDoneTask(t)).map((t) => shapeTask(t, naamMap));

  const now = Date.now();
  const todayY = msToBrusselsYmd(now);
  const tomY = ymdPlus(todayY, 1);

  const vandaag = taken.filter((t) => t.due_ymd === todayY);
  const morgen = taken.filter((t) => t.due_ymd === tomY);
  const teLaat = taken.filter((t) => t.due_ymd && t.due_ymd < todayY);
  const ingepland = taken.filter((t) => t.ingepland);
  const teDoen = taken.filter((t) => !t.ingepland);
  const planAanvragen = taken.filter((t) => t.plan_actie); // nog in te plannen shoots/meetings

  // sorteer takenlijsten op due (leeg achteraan), dan op naam
  const byDue = (a, b) => ((a.due || Infinity) - (b.due || Infinity)) || a.naam.localeCompare(b.naam, 'nl');
  [vandaag, morgen, teLaat, ingepland, teDoen].forEach((arr) => arr.sort(byDue));

  return {
    status: 200,
    body: {
      ok: true,
      gegenereerd: now,
      target,
      is_mij: target.id === me.id,
      vandaag, morgen, te_laat: teLaat,
      ingepland, te_doen: teDoen, plan_aanvragen: planAanvragen,
      tellingen: {
        totaal: taken.length, vandaag: vandaag.length, morgen: morgen.length,
        te_laat: teLaat.length, ingepland: ingepland.length, te_doen: teDoen.length,
      },
    },
  };
}

/* ===========================================================================
 * PROJECTDETAIL + STATUS + CHAT — alles wat een teamlid nodig heeft om een
 * project zelfstandig af te ronden zonder PM-tussenkomst.
 * =========================================================================== */
function cleanTaskId(v) { const s = str(v).trim(); return /^[A-Za-z0-9_-]{1,40}$/.test(s) ? s : ''; }

// links uit een vrije-tekst-veld (Bestanden) halen.
function linksUit(txt) {
  const out = [];
  const re = /(https?:\/\/[^\s)<>"']+)/g; let m;
  while ((m = re.exec(str(txt))) && out.length < 40) out.push(m[1]);
  return out;
}
function linkLabel(u) {
  try {
    if (/drive\.google|docs\.google/.test(u)) return 'Google Drive';
    if (/vimeo\.com/.test(u)) return 'Vimeo';
    if (/youtu/.test(u)) return 'YouTube';
    if (/pandadoc/.test(u)) return 'PandaDoc';
    if (/figma/.test(u)) return 'Figma';
    if (/webflow|\.studio27|wetransfer|dropbox/.test(u)) return 'Webflow / link';
    const h = new URL(u).hostname.replace(/^www\./, '');
    return h.length > 28 ? h.slice(0, 28) : h;
  } catch (e) { return 'Link'; }
}

// comments -> chat-shape (klant '💬 [' / intern '[INTERN]' / team).
function parseComments(comments) {
  return (Array.isArray(comments) ? comments : []).map((c) => {
    let txt = '';
    if (c.comment_text != null) txt = str(c.comment_text);
    else if (Array.isArray(c.comment)) txt = c.comment.map((x) => str(x.text)).join('');
    const isKlant = txt.indexOf('💬 [') === 0;
    const isIntern = txt.indexOf('[INTERN]') === 0;
    const tekst = txt.replace(/^💬 \[Klant:[^\]]*\]\s*/, '').replace(/^\[INTERN\]\s*/, '').trim();
    return { id: str(c.id), auteur: str(c.user && c.user.username) || 'Studio 27', is_klant: isKlant, is_intern: isIntern, tekst, datum: str(c.date) };
  }).filter((c) => c.tekst);
}

// teamProject: rijke detail van één taak/project — briefing, klant, deadline,
// bestanden, subtaken, teamleden, status. Schrijft niets.
export async function teamProject(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const tr = await cu.get(env, `/task/${taskId}?include_subtasks=true`);
  if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const t = tr.data;
  const [naamMap] = await Promise.all([bedrijvenNaamMap(env)]);
  const bid = (getRelationIds(t, FIELD.bedrijf)[0]) || '';
  const bestanden = [];
  const seen = new Set();
  const pushLinks = (raw) => { for (const u of linksUit(raw)) { if (!seen.has(u)) { seen.add(u); bestanden.push({ url: u, label: linkLabel(u) }); } } };
  pushLinks(getCF(t, FIELD.deliverablesRaw));
  const drive = str(getCF(t, FIELD.driveFolder)); if (drive) pushLinks(drive);
  const fb = str(getCF(t, FIELD.feedbackLink)); if (fb) pushLinks(fb);
  const subtaken = (Array.isArray(t.subtasks) ? t.subtasks : []).map((s) => ({
    id: str(s.id), naam: str(s.name), status: statusMapper(s.status),
    assignees: buildSae(s), due: Number(s.due_date) || 0, due_ymd: s.due_date ? msToBrusselsYmd(Number(s.due_date)) : '',
  }));
  const due = Number(t.due_date) || 0;
  return {
    status: 200,
    body: {
      ok: true,
      project: {
        id: str(t.id), naam: str(t.name),
        status: statusMapper(t.status), status_raw: str(t.status && t.status.status),
        discipline: disciplineOf(t),
        bedrijf_id: bid, bedrijf: naamMap[bid] || '',
        brief: str(t.description || t.text_content || ''),
        deadline: due, deadline_ymd: due ? msToBrusselsYmd(due) : '',
        assignees: buildSae(t),
        prioriteit: (t.priority && t.priority.priority) ? str(t.priority.priority) : '',
        parent: str(t.parent || ''), url: str(t.url),
      },
      bestanden,
      subtaken,
    },
  };
}

// statussen die een teamlid zelf mag zetten om werk vooruit te duwen.
export const TEAM_STATUSSEN = [
  { key: 'to do', label: 'Te doen' },
  { key: 'in progress', label: 'In productie' },
  { key: 'on hold', label: 'On hold' },
  { key: 'doorgestuurd', label: 'Klaar voor review' },
];
const TEAM_STATUS_SET = new Set(TEAM_STATUSSEN.map((s) => s.key));

// teamStatus: zet de status van een taak (workflow vooruit). Staff-write.
export async function teamStatus(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  const status = str(body.status).toLowerCase().trim();
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  if (!TEAM_STATUS_SET.has(status)) return { status: 400, body: { ok: false, error: 'bad_status' } };
  const r = await cu.put(env, `/task/${taskId}`, { status });
  if (!r.ok) return { status: 200, body: { ok: false, error: 'update_failed', detail: (r.data && r.data.err) || '' } };
  return { status: 200, body: { ok: true, status: statusMapper(r.data && r.data.status) } };
}

// teamProjectChat: lees de communicatie op een taak (klant + team + interne notities).
export async function teamProjectChat(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const r = await cu.get(env, `/task/${taskId}/comment`);
  const comments = (r.ok && r.data && Array.isArray(r.data.comments)) ? r.data.comments : [];
  return { status: 200, body: { ok: true, comments: parseComments(comments) } };
}

// teamProjectChatPost: plaats een bericht — naar de klant (zichtbaar) of een
// interne notitie ([INTERN], nooit klant-zichtbaar). Staff-write.
export async function teamProjectChatPost(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  const tekst = str(body.tekst).trim().slice(0, 4000);
  if (!taskId || !tekst) return { status: 400, body: { ok: false, error: 'leeg' } };
  const intern = body.intern === true;
  const out = intern ? ('[INTERN] ' + tekst) : tekst;
  const r = await cu.comment(env, taskId, out, true);
  if (!r.ok) return { status: 200, body: { ok: false, error: 'post_failed' } };
  return { status: 200, body: { ok: true } };
}

/* ===========================================================================
 * VERLOF / PAYROLL — zelf aanvragen + bekijken (zonder PM).
 * =========================================================================== */
const HR_FIELD = 'e4f701e4-5aa4-42e0-a61a-0a36a01ba549';
const HR_TYPES = [
  { uuid: 'c5613bc3-ccb8-4b6e-be8c-d43ddf8bee7e', label: 'Vakantie' },
  { uuid: 'e9411405-3a5b-4e1b-a19a-983c553cb8ee', label: 'Jeugdvakantie' },
  { uuid: '51f69dd8-a836-4353-b4c2-da78ae000bc9', label: 'Feestdag' },
  { uuid: '27b97780-5807-40e1-b27b-69157c285892', label: 'Ziekte' },
  { uuid: 'e137e073-a9d4-4f21-a5df-df3b5e003efa', label: 'Recup' },
  { uuid: 'fc76b458-ded7-4580-8c71-0ab2af4ac975', label: 'Toegestane afwezigheid' },
  { uuid: '62761e6c-7079-45c6-aa7a-f92f00794ac5', label: 'Klein verlet' },
  { uuid: '486a5452-a3ec-44e2-b524-c9d4e0df31db', label: 'Ouderschapsverlof' },
  { uuid: '9759e0a0-c1be-4269-b271-e5d0defe953a', label: 'Sollicitatieverlof' },
];

// teamVerlof: mijn verlof (aangevraagd + goedgekeurd).
export async function teamVerlof(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const leden = await ledenLijst(env);
  const me = resolveMember(str(body.account_email), leden);
  if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  let tasks = [];
  try {
    tasks = await pageAll(env, (p) => `/list/${PAYROLL_LIST}/task?assignees%5B%5D=${encodeURIComponent(me.id)}&include_closed=true&subtasks=true&page=${p}`);
  } catch (e) { tasks = []; }
  const items = tasks.map((t) => {
    const idx = parseInt(getCF(t, HR_FIELD), 10);
    const type = (idx >= 0 && HR_TYPES[idx]) ? HR_TYPES[idx].label : (str(t.name) || 'Afwezig');
    const s = Number(t.start_date) || Number(t.due_date) || 0;
    const d = Number(t.due_date) || s;
    const statusNaam = str(t.status && t.status.status).toLowerCase();
    return { id: str(t.id), type, van: s, tot: d, van_ymd: s ? msToBrusselsYmd(s) : '', tot_ymd: d ? msToBrusselsYmd(d) : '', goedgekeurd: statusNaam.includes('goedgekeur') };
  }).sort((a, b) => (b.van || 0) - (a.van || 0));
  return { status: 200, body: { ok: true, items, types: HR_TYPES.map((h) => h.label) } };
}

// teamVerlofAanvraag: nieuwe verlofaanvraag (status 'aanvraag', telt NIET als geblokkeerd).
export async function teamVerlofAanvraag(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const leden = await ledenLijst(env);
  const me = resolveMember(str(body.account_email), leden);
  if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  const typeLabel = str(body.type).trim();
  const hr = HR_TYPES.find((h) => h.label.toLowerCase() === typeLabel.toLowerCase());
  if (!hr) return { status: 400, body: { ok: false, error: 'bad_type' } };
  const vanYmd = str(body.van); const totYmd = str(body.tot) || vanYmd;
  const vanMs = brusselsWallToMs(vanYmd, '09:00');
  const totMs = brusselsWallToMs(totYmd, '17:00');
  if (!vanMs || !totMs || totMs < vanMs) return { status: 400, body: { ok: false, error: 'bad_dates' } };
  // 1) taak aanmaken
  const cr = await cu.post(env, `/list/${PAYROLL_LIST}/task`, {
    name: hr.label, assignees: [Number(me.id)], status: 'aanvraag',
    start_date: vanMs, start_date_time: false, due_date: totMs, due_date_time: false,
  });
  if (!cr.ok || !cr.data || !cr.data.id) return { status: 200, body: { ok: false, error: 'create_failed' } };
  // 2) HR-type via los field-endpoint (custom_fields persist-gotcha)
  try { await cu.field(env, str(cr.data.id), HR_FIELD, hr.uuid); } catch (e) { /* type best-effort */ }
  return { status: 200, body: { ok: true, id: str(cr.data.id) } };
}

/* ---- dispatch-tabel (worker.js gate't op is_staff) ------------------------ */
export const TEAM_HANDLERS = {
  teamMe,
  teamTaken,
  teamProject,
  teamStatus,
  teamProjectChat,
  teamProjectChatPost,
  teamVerlof,
  teamVerlofAanvraag,
};
