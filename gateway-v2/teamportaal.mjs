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
  cu, pageAll, getCF, getRelationIds, statusMapper, disciplineOf, teamLeden,
  FIELD, LIST, PLANNING_LISTS, PAYROLL_LIST, TEAM_ID, VIDEO_POOL, _teamHelpers,
} from './handlers.mjs';

const { isDoneTask, kanBeginnenGezet, heeftDueDate, planTypeOf, msToBrusselsYmd } = _teamHelpers;

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

/* ---- dispatch-tabel (worker.js gate't op is_staff) ------------------------ */
export const TEAM_HANDLERS = {
  teamMe,
  teamTaken,
};
