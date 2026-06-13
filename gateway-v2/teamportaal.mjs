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

const { isDoneTask, kanBeginnenGezet, heeftDueDate, planTypeOf, msToBrusselsYmd, brusselsWallToMs, aiComplete } = _teamHelpers;
// Dit Anthropic-account heeft enkel Claude 4-toegang (3.5/3.7/haiku → not_found).
const AI_MODEL = 'claude-sonnet-4-20250514';

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

// FINANCIEEL: budget-veld (currency EUR) op offertes ÉN planningstaken (zelfde id),
// + offerte-velden. Categorie-omzet/omzet-per-persoon = uit de planningstaken (TYPE JOB
// + Budget + assignees). Vulgraad ~40% → indicatief, eerlijk labelen.
const BUDGET_FIELD = 'c8d2dd2c-2428-4236-ba37-a3f3cd90c9ec';
const OFFERTES_LIST = '901520180289';
const OFFERTE_NAAM = '8da934b5-7747-4ad3-ac2f-cc53cf2985e8'; // short_text 'Bedrijfsnaam'
// TYPE JOB orderindex -> rapportcategorie (de namen die Vincent noemt: socials/ads/content/...).
const CAT_BY_IDX = ['Projectmanagement', 'Strategie', 'Branding', 'Branding', 'Content', 'Content', 'Content', 'Content', 'Content', 'Webdesign', 'Webdesign', 'Content', 'SEO', 'Socials', 'Ads', 'Automation', 'Opleiding', 'Overig', 'Webdesign', 'Support'];
function catOf(v) { const i = parseInt(v, 10); return (i >= 0 && CAT_BY_IDX[i]) ? CAT_BY_IDX[i] : 'Overig'; }
function num(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
function monthOf(ms) { const y = msToBrusselsYmd(Number(ms) || 0); return y ? y.slice(0, 7) : ''; }
function last12Months() { const out = []; const d = new Date(); for (let i = 11; i >= 0; i--) { const dd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)); out.push(dd.getUTCFullYear() + '-' + String(dd.getUTCMonth() + 1).padStart(2, '0')); } return out; }
// feedbackronde-detectie op taaknaam (geen ronde-teller-veld in ClickUp).
const FB_RE = /feedback|\bv\d+\b/i;

const okStaff = (body) => body && body.__staff === true;

/* ---- rollen & toegang (server-side; nooit enkel frontend) ----------------- */
// Alleen Vincent = admin. Arne = sales (cijfers/offertes). Ilke = accountmanager.
// Iedereen anders = team. ID's: Vincent 8714037, Arne 54513254, Ilke 48338421.
const ROLES = { 8714037: 'admin', 54513254: 'sales', 48338421: 'accountmanager' };
function roleOf(id) { return ROLES[Number(id)] || 'team'; }
function permsFor(role) {
  return {
    admin: role === 'admin',                                   // volledige controle — ENKEL Vincent
    finance: role === 'admin' || role === 'sales',             // cijfers/omzet/offertes — Vincent + Arne
    finance_full: role === 'admin',                            // omzet per persoon — ENKEL Vincent
    account: role === 'admin' || role === 'accountmanager',    // alle projecten + planning + health — Vincent + Ilke
    team: true,
  };
}
// resolveRole -> { me, role, perms } of { error:{status,body} }.
async function resolveRole(env, body) {
  const leden = await ledenLijst(env);
  const me = resolveMember(str(body.account_email), leden);
  if (!me) return { error: { status: 200, body: { ok: false, error: 'no_member' } }, leden };
  const role = roleOf(me.id);
  return { me, role, perms: permsFor(role), leden };
}
// poort voor rol-only endpoints; geeft null als toegelaten, anders een 403-body.
function denyUnless(perms, key) {
  return perms && perms[key] ? null : { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Geen toegang voor jouw rol.' } };
}

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

// teamMe: wie ben ik (ClickUp-lid) + rol + rechten + het actieve roster.
export async function teamMe(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false, message: 'Alleen voor het Studio 27-team.' } };
  const leden = await ledenLijst(env);
  if (!leden.length) return { status: 502, body: { ok: false, error: 'roster_unavailable' } };
  const me = resolveMember(str(body.account_email), leden);
  if (!me) {
    return { status: 200, body: { ok: false, error: 'no_member', email: str(body.account_email),
      message: 'Je @studio27.be-account is nog niet gekoppeld aan een ClickUp-teamlid. Vraag Vincent je toe te voegen aan de ClickUp-workspace.' } };
  }
  const role = roleOf(me.id);
  return { status: 200, body: { ok: true, me, role, perms: permsFor(role), roster: rosterFrom(leden) } };
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
        start_ymd: t.start_date ? msToBrusselsYmd(Number(t.start_date)) : '',
        assignees: buildSae(t),
        assignee_ids: (Array.isArray(t.assignees) ? t.assignees : []).map((a) => Number(a && a.id)).filter(Boolean),
        est_uren: t.time_estimate ? Math.round(Number(t.time_estimate) / 3600000 * 10) / 10 : 0,
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

/* ===========================================================================
 * ACCOUNTMANAGER (Ilke) — alle lopende projecten per klant in één oogopslag.
 * Gegroepeerd per bedrijf, gesorteerd op urgentie (te laat → actief). Klik een
 * item -> teamProject-detail (zelfde modal). Gated op de 'account'-rol.
 * =========================================================================== */
export async function teamAllProjects(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'account'); if (deny) return deny;

  const CK = 'team:allprojects:v1';
  try { const hit = await env.KV.get(CK, 'json'); if (hit && hit.clients) return { status: 200, body: hit }; } catch (e) { /* miss */ }

  const listQ = DISCIPLINE_LISTS.map((id) => `list_ids%5B%5D=${encodeURIComponent(id)}`).join('&');
  const collect = async (sub) => {
    const out = [];
    for (let p = 0; p < 20; p++) {
      const r = await cu.get(env, `/team/${TEAM_ID}/task?${listQ}&include_closed=false&subtasks=${sub}&page=${p}`);
      const tasks = (r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : [];
      out.push(...tasks);
      if (!tasks.length || r.data.last_page === true) break;
    }
    return out;
  };
  const [a, b, naamMap] = await Promise.all([collect('true'), collect('false'), bedrijvenNaamMap(env)]);
  const byId = new Map();
  for (const t of [...a, ...b]) byId.set(str(t.id), t);

  const today = msToBrusselsYmd(Date.now());
  const groups = new Map();
  for (const t of byId.values()) {
    if (isDoneTask(t)) continue;
    const bid = (getRelationIds(t, FIELD.bedrijf)[0]) || '';
    if (!bid) continue;                                        // enkel taken met een klant-koppeling
    if (!groups.has(bid)) groups.set(bid, { bedrijf_id: bid, bedrijf: naamMap[bid] || '', items: [], disc: new Set(), fb: 0 });
    const g = groups.get(bid);
    const item = shapeTask(t, naamMap);
    g.items.push(item); if (item.discipline) g.disc.add(item.discipline);
    if (FB_RE.test(item.naam)) g.fb += 1;
  }
  // onbekende klant-namen gericht bijresolven (relatie wijst soms buiten de Bedrijven-lijst);
  // gecapt + gepersisteerd in de namen-cache zodat het overzicht clean is.
  const onbekend = [...groups.values()].filter((g) => !g.bedrijf).slice(0, 80);
  if (onbekend.length) {
    const resolved = await Promise.all(onbekend.map(async (g) => {
      try { const r = await cu.get(env, `/task/${g.bedrijf_id}`); return [g.bedrijf_id, (r.ok && r.data && str(r.data.name)) || '']; } catch (e) { return [g.bedrijf_id, '']; }
    }));
    for (const [bid, naam] of resolved) { if (naam) { naamMap[bid] = naam; groups.get(bid).bedrijf = naam; } }
    try { if (env.KV) await env.KV.put('team:bedrijfnamen:v1', JSON.stringify(naamMap), { expirationTtl: 21600 }); } catch (e) { /* best-effort */ }
  }
  for (const g of groups.values()) { for (const it of g.items) { if (!it.bedrijf && naamMap[g.bedrijf_id]) it.bedrijf = naamMap[g.bedrijf_id]; } if (!g.bedrijf) g.bedrijf = '(onbekende klant)'; }
  const clients = [...groups.values()].map((g) => {
    g.items.sort((x, y) => ((x.due || Infinity) - (y.due || Infinity)) || x.naam.localeCompare(y.naam, 'nl'));
    const teLaat = g.items.filter((i) => i.due_ymd && i.due_ymd < today).length;
    const next = g.items.find((i) => i.due_ymd && i.due_ymd >= today);
    return { bedrijf_id: g.bedrijf_id, bedrijf: g.bedrijf, active: g.items.length, te_laat: teLaat, feedback: g.fb, disciplines: [...g.disc], next_due: next ? next.due_ymd : '', items: g.items };
  }).sort((x, y) => (y.te_laat - x.te_laat) || (y.active - x.active) || x.bedrijf.localeCompare(y.bedrijf, 'nl'));

  const out = {
    ok: true, gegenereerd: Date.now(), clients,
    totaal: { klanten: clients.length, actief: clients.reduce((s, c) => s + c.active, 0), te_laat: clients.reduce((s, c) => s + c.te_laat, 0) },
  };
  try { if (env.KV) await env.KV.put(CK, JSON.stringify(out), { expirationTtl: 180 }); } catch (e) { /* best-effort */ }
  return { status: 200, body: out };
}

/* ===========================================================================
 * DIRECTIE (Vincent admin / Arne sales) — financieel.
 * Offertes = SUM(Budget) per maand op due_date (UITGEBRACHT, geen won/lost-veld).
 * Omzet per categorie = SUM(taakbudget) per TYPE JOB. Omzet per persoon (admin) =
 * taakbudget / #assignees. Budget ~40% gevuld → indicatief, eerlijk gelabeld.
 * =========================================================================== */
async function collectPlanningBudget(env) {
  const out = [];
  for (const id of DISCIPLINE_LISTS) {
    for (let p = 0; p < 25; p++) {
      const r = await cu.get(env, `/list/${id}/task?include_closed=true&subtasks=true&page=${p}`);
      const tasks = (r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : [];
      out.push(...tasks);
      if (!tasks.length || r.data.last_page === true) break;
    }
  }
  return out;
}

export async function teamFinance(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;

  const CK = 'team:finance:v1';
  let cached = null;
  try { cached = await env.KV.get(CK, 'json'); } catch (e) { /* miss */ }
  if (cached) return { status: 200, body: rr.perms.finance_full ? cached : Object.assign({}, cached, { per_persoon: null }) };

  // offertes
  let off = [];
  try { off = await pageAll(env, (p) => `/list/${OFFERTES_LIST}/task?include_closed=true&subtasks=false&page=${p}`, 60); } catch (e) { off = []; }
  let offTotaal = 0, offZonder = 0; const maand = {}; const top = [];
  for (const t of off) {
    const b = num(getCF(t, BUDGET_FIELD));
    if (b <= 0) { offZonder++; continue; }
    offTotaal += b;
    const mk = monthOf(t.due_date); if (mk) maand[mk] = (maand[mk] || 0) + b;
    top.push({ naam: str(getCF(t, OFFERTE_NAAM)) || str(t.name), bedrag: Math.round(b), maand: mk });
  }
  top.sort((a, b) => b.bedrag - a.bedrag);

  // planningstaken: categorie + per persoon
  let plan = [];
  try { plan = await collectPlanningBudget(env); } catch (e) { plan = []; }
  const cat = {}; const persoon = {}; let planTotaal = 0, planGevuld = 0, planTotaalTaken = 0;
  for (const t of plan) {
    planTotaalTaken++;
    const b = num(getCF(t, BUDGET_FIELD)); if (b <= 0) continue;
    planGevuld++; planTotaal += b;
    const c = catOf(getCF(t, FIELD.typeJob)); cat[c] = (cat[c] || 0) + b;
    const as = (Array.isArray(t.assignees) ? t.assignees : []).filter((a) => a && a.id);
    if (as.length) { const share = b / as.length; for (const a of as) { const k = Number(a.id); persoon[k] = (persoon[k] || 0) + share; } }
  }
  const naamById = new Map(rr.leden.map((l) => [Number(l.id), l.naam]));
  const out = {
    ok: true, gegenereerd: Date.now(),
    offertes: { totaal: Math.round(offTotaal), aantal: off.length, zonder_bedrag: offZonder, maand: last12Months().map((mk) => ({ maand: mk, bedrag: Math.round(maand[mk] || 0) })), top: top.slice(0, 8) },
    categorie: Object.keys(cat).map((k) => ({ categorie: k, bedrag: Math.round(cat[k]) })).sort((a, b) => b.bedrag - a.bedrag),
    plan_totaal: Math.round(planTotaal), plan_vulgraad: planTotaalTaken ? Math.round(planGevuld / planTotaalTaken * 100) : 0,
    per_persoon: Object.keys(persoon).map((id) => ({ id: Number(id), naam: naamById.get(Number(id)) || ('#' + id), bedrag: Math.round(persoon[id]) })).sort((a, b) => b.bedrag - a.bedrag),
    disclaimer: 'Offertebedragen = UITGEBRACHT (ClickUp heeft nog geen won/verloren-veld). Omzet per categorie/persoon komt uit het ingevulde taakbudget (±40% vulgraad) en is dus INDICATIEF, geen sluitende boekhouding.',
  };
  try { if (env.KV) await env.KV.put(CK, JSON.stringify(out), { expirationTtl: 3600 }); } catch (e) { /* best-effort */ }
  return { status: 200, body: rr.perms.finance_full ? out : Object.assign({}, out, { per_persoon: null }) };
}

/* ---- HEALTH (Ilke/admin): ingeplande uren per teamlid deze week ----------- */
function weekWindow() {
  const today = msToBrusselsYmd(Date.now());
  const wd = new Date(today + 'T12:00:00Z').getUTCDay();   // 0=zo..6=za
  const monYmd = ymdPlus(today, wd === 0 ? -6 : 1 - wd);
  const sunYmd = ymdPlus(monYmd, 6);
  return { van: brusselsWallToMs(monYmd, '00:00'), tot: brusselsWallToMs(sunYmd, '23:59'), monYmd, sunYmd };
}
export async function teamHealth(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'account'); if (deny) return deny;

  const w = weekWindow();
  const listQ = DISCIPLINE_LISTS.map((id) => `list_ids%5B%5D=${encodeURIComponent(id)}`).join('&');
  const tasks = [];
  for (let p = 0; p < 12; p++) {
    const r = await cu.get(env, `/team/${TEAM_ID}/task?${listQ}&include_closed=false&subtasks=true&due_date_gt=${w.van}&due_date_lt=${w.tot}&page=${p}`);
    const ts = (r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : [];
    tasks.push(...ts);
    if (!ts.length || r.data.last_page === true) break;
  }
  const uren = {};
  for (const t of tasks) {
    if (isDoneTask(t)) continue;
    const est = Number(t.time_estimate) || 0; if (!est) continue;
    const as = (Array.isArray(t.assignees) ? t.assignees : []).filter((a) => a && a.id);
    if (!as.length) continue;
    const share = est / as.length;
    for (const a of as) { const k = Number(a.id); uren[k] = (uren[k] || 0) + share; }
  }
  const TARGET = 38;
  const leden = rosterFrom(rr.leden).map((m) => ({ id: m.id, naam: m.naam, pool: m.pool, uren: Math.round((uren[m.id] || 0) / 3600000 * 10) / 10 })).sort((a, b) => b.uren - a.uren);
  return { status: 200, body: { ok: true, week: { van: w.monYmd, tot: w.sunYmd }, target: TARGET, leden, disclaimer: 'INGEPLANDE uren (time_estimate van taken met deadline deze week, gedeeld over de assignees). ClickUp-tijdregistratie is niet actief — dit zijn dus geplande, geen gepresteerde uren.' } };
}

/* ===========================================================================
 * VOLLEDIGE CLICKUP-SYNC — elk teamlid mag bewerken: assignees wisselen, uren,
 * due/start, briefing, bestanden toevoegen. 1 PUT per wijziging (ClickUp-native).
 * =========================================================================== */
export async function teamTaskUpdate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const put = {};
  if (typeof body.brief === 'string') put.description = body.brief.slice(0, 20000);
  if (body.uren != null && body.uren !== '') { const h = Number(body.uren); if (isFinite(h) && h >= 0) put.time_estimate = Math.round(h * 3600000); }
  if (body.due !== undefined) { const ymd = str(body.due); put.due_date = ymd ? brusselsWallToMs(ymd, '17:00') : null; put.due_date_time = !!ymd; }
  if (body.start !== undefined) { const ymd = str(body.start); put.start_date = ymd ? brusselsWallToMs(ymd, '09:00') : null; put.start_date_time = !!ymd; }
  const addA = []; const remA = [];
  if (body.add_assignee) addA.push(Number(body.add_assignee));
  if (body.rem_assignee) remA.push(Number(body.rem_assignee));
  if (addA.length || remA.length) put.assignees = { add: addA, rem: remA };
  if (!Object.keys(put).length) return { status: 400, body: { ok: false, error: 'niets' } };
  const r = await cu.put(env, `/task/${taskId}`, put);
  if (!r.ok) return { status: 200, body: { ok: false, error: 'update_failed', detail: (r.data && r.data.err) || '' } };
  const t = r.data || {};
  return {
    status: 200, body: {
      ok: true,
      assignee_ids: (Array.isArray(t.assignees) ? t.assignees : []).map((a) => Number(a && a.id)).filter(Boolean),
      assignees: buildSae(t),
      est_uren: t.time_estimate ? Math.round(Number(t.time_estimate) / 3600000 * 10) / 10 : 0,
      due_ymd: t.due_date ? msToBrusselsYmd(Number(t.due_date)) : '',
      start_ymd: t.start_date ? msToBrusselsYmd(Number(t.start_date)) : '',
    },
  };
}

// teamTaskAttach: bestand toevoegen aan een taak (base64) + de link aan het
// Bestanden-veld hangen zodat hij in de Bestanden-tab verschijnt (downloadbaar).
export async function teamTaskAttach(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  const filename = (str(body.filename).replace(/[^\w. ()\-]/g, '').slice(0, 140)) || 'bestand';
  const b64 = str(body.file_data);
  if (!taskId || !b64) return { status: 400, body: { ok: false, error: 'leeg' } };
  if (b64.length > 28 * 1024 * 1024) return { status: 200, body: { ok: false, error: 'te_groot' } };
  let bytes;
  try { const bin = atob(b64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '')); bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }
  catch (e) { return { status: 200, body: { ok: false, error: 'bad_file' } }; }
  if (!bytes.length || bytes.length > 22 * 1024 * 1024) return { status: 200, body: { ok: false, error: 'te_groot' } };
  const up = await cu.uploadAttachment(env, taskId, bytes, filename);
  if (!up || !up.ok || !up.data) return { status: 200, body: { ok: false, error: 'upload_failed' } };
  const url = str(up.data.url || up.data.url_w_query || '');
  try {
    const cur = await cu.get(env, `/task/${taskId}`);
    const prev = str(getCF(cur.data, FIELD.deliverablesRaw));
    await cu.field(env, taskId, FIELD.deliverablesRaw, (prev ? prev + '\n' : '') + filename + ' ' + url);
  } catch (e) { /* best-effort */ }
  return { status: 200, body: { ok: true, url, filename } };
}

/* ===========================================================================
 * FEATURE REQUESTS — eigen ClickUp-lijst (901523887267), met portaal-aanduiding
 * + aanvrager (als assignee), zodat een AI ze dagelijks per persoon kan verwerken.
 * =========================================================================== */
const FEATURE_LIST = '901523887267';
const PORTALEN = ['Teamportaal', 'Klantenportaal', 'Shoot-planner', 'Anders'];
export async function teamFeatureRequest(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const titel = str(body.titel).trim().slice(0, 140);
  const omschrijving = str(body.omschrijving).trim().slice(0, 6000);
  const portaal = PORTALEN.indexOf(str(body.portaal)) >= 0 ? str(body.portaal) : 'Teamportaal';
  const onderdeel = str(body.onderdeel).slice(0, 120);
  const email = str(body.account_email);
  if (!titel && !omschrijving) return { status: 400, body: { ok: false, message: 'Beschrijf eerst je idee.' } };
  const leden = await ledenLijst(env);
  const me = resolveMember(email, leden);
  const created = await cu.post(env, `/list/${FEATURE_LIST}/task`, {
    name: `✨ [${portaal}] ${titel || omschrijving.slice(0, 80)}`,
    description: ['FEATURE REQUEST', '', `Portaal: ${portaal}`, onderdeel ? `Onderdeel: ${onderdeel}` : '', me ? `Gevraagd door: ${me.naam} (${email})` : `Gevraagd door: ${email}`, '', omschrijving || '(geen omschrijving)'].filter((x) => x !== '').join('\n'),
    due_date: Date.now(), due_date_time: true,
    ...(me ? { assignees: [Number(me.id)] } : {}),
    notify_all: false,
  });
  if (!created || !created.ok || !created.data || !created.data.id) return { status: 200, body: { ok: false, error: 'create_failed' } };
  return { status: 200, body: { ok: true, id: str(created.data.id), portalen: PORTALEN } };
}

/* ===========================================================================
 * AI-DAGPLANNING — Claude stelt op basis van de open taken (deadline + geschatte
 * tijd) een logische dag-/weekindeling voor. Verzint niets buiten de takenlijst.
 * =========================================================================== */
export async function teamAiPlan(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const leden = await ledenLijst(env);
  const me = resolveMember(str(body.account_email), leden);
  if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  const [raw, naamMap] = await Promise.all([tasksForMember(env, me.id), bedrijvenNaamMap(env)]);
  const taken = raw.filter((t) => !isDoneTask(t)).map((t) => shapeTask(t, naamMap));
  if (!taken.length) return { status: 200, body: { ok: true, plan: 'Je hebt momenteel geen openstaande taken. 🎉', aantal: 0 } };
  const today = msToBrusselsYmd(Date.now());
  const laat = (t) => (t.due_ymd && t.due_ymd < today) ? 0 : 1;
  const sorted = taken.slice().sort((a, b) => (laat(a) - laat(b)) || ((a.due || Infinity) - (b.due || Infinity)));
  const lines = sorted.slice(0, 35).map((t, i) => {
    const uren = t.est ? (Math.round(t.est / 3600000 * 10) / 10) + 'u' : '? u';
    const dl = t.due_ymd ? (t.due_ymd < today ? ('TE LAAT (deadline ' + t.due_ymd + ')') : ('deadline ' + t.due_ymd)) : 'geen deadline';
    return (i + 1) + '. ' + t.naam + ' — klant ' + (t.bedrijf || 'intern') + ', ' + (t.discipline || 'overig') + ', ' + dl + ', geschat ' + uren + ', status ' + t.status.label;
  });
  const system = 'Je bent de persoonlijke planningassistent van Studio 27. Maak voor dit teamlid een concrete, logische werkplanning voor VANDAAG en MORGEN op basis van de openstaande taken. Regels: werk binnen 08:00–18:00 op weekdagen; plan te-late taken en taken met de vroegste deadline eerst; gebruik de geschatte tijd als blokduur; verzin GEEN taken die niet in de lijst staan; als er te veel werk is voor twee dagen, zeg dat eerlijk en zet de rest onder "Later deze week". Antwoord in het Nederlands, beknopt, met per dag een lijst tijdsblokken in het formaat "09:00–11:00 — Taaknaam (klant)". Begin direct met "**Vandaag**", geen inleiding.';
  const user = 'Teamlid: ' + me.naam + '\nVandaag is ' + today + '.\n\nOpenstaande taken:\n' + lines.join('\n') + '\n\nGeef de dagplanning voor vandaag en morgen.';
  const res = await aiComplete(env, AI_MODEL, system, user);
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: (res && res.err) || 'ai_fout', aantal: taken.length } };
  return { status: 200, body: { ok: true, plan: res.text, aantal: taken.length, gegenereerd: Date.now() } };
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
  teamAllProjects,
  teamFinance,
  teamHealth,
  teamTaskUpdate,
  teamTaskAttach,
  teamFeatureRequest,
  teamAiPlan,
};
