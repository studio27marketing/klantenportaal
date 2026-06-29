// ===========================================================================
// opsdb.mjs — datalaag voor het operationele model (tasks/projects/team/...) op
// dezelfde D1 (env.CRMDB). Generieke upsert + JSON-bewuste row-mappers. Spiegelt
// crmdb.mjs. Vervangt ClickUp als bron-van-waarheid voor de Productie-module e.a.
// ===========================================================================
const str = (v) => (v == null ? '' : String(v));
const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const J = (v, d) => { try { return v ? JSON.parse(v) : d; } catch (e) { return d; } };

// Generieke upsert op id (ON CONFLICT(id) DO UPDATE). obj-keys = kolomnamen.
export async function opsUpsert(env, table, obj) {
  const cols = Object.keys(obj); if (!cols.length) return;
  const ph = cols.map(() => '?').join(',');
  const set = cols.filter((c) => c !== 'id').map((c) => `"${c}"=excluded."${c}"`).join(',');
  const sql = `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${ph}) ON CONFLICT(id) DO UPDATE SET ${set}`;
  await env.CRMDB.prepare(sql).bind(...cols.map((c) => obj[c])).run();
}
export async function opsRun(env, sql, binds) { try { const r = await env.CRMDB.prepare(sql).bind(...(binds || [])).run(); return r; } catch (e) { return null; } }
export async function opsAll(env, sql, binds) { try { const r = await env.CRMDB.prepare(sql).bind(...(binds || [])).all(); return r.results || []; } catch (e) { return []; } }
export async function opsGet(env, table, id) { try { return (await env.CRMDB.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(str(id)).first()) || null; } catch (e) { return null; } }
export async function opsCount(env, table) { try { const r = await env.CRMDB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first(); return Number(r && r.n) || 0; } catch (e) { return 0; } }
export async function opsDel(env, table, id) { try { await env.CRMDB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(str(id)).run(); return true; } catch (e) { return false; } }
export function newId(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

const clampLimit = (v, d, max) => Math.max(1, Math.min(max || 5000, Number(v) || d || 1000));
const taskTerminal = (status) => /^(done|klaar-voor-facturatie|gefactureerd|archived|afgehandeld)$/i.test(str(status));

function addEq(where, binds, col, val) {
  if (val == null || val === '') return;
  where.push(`${col}=?`);
  binds.push(str(val));
}

function addArchiveFilter(where, opts) {
  if (opts && opts.archived === true) where.push('archived=1');
  else if (!(opts && opts.include_archived)) where.push('(archived=0 OR archived IS NULL)');
}

function peopleKeys(people) {
  const arr = Array.isArray(people) ? people : J(people, []);
  return arr.map((p) => str(p).trim()).filter(Boolean);
}

export async function syncTaskAssignees(env, taskId, people) {
  const id = str(taskId);
  if (!id) return;
  const names = peopleKeys(people);
  try { await env.CRMDB.prepare('DELETE FROM task_assignees WHERE task_id=?').bind(id).run(); } catch (e) { return; }
  if (!names.length) return;
  const rows = await opsAll(env, 'SELECT id, naam, voornaam, email FROM team_members WHERE active=1');
  const byKey = {};
  rows.forEach((m) => {
    const keys = [m.id, m.naam, m.voornaam, m.email].map((x) => str(x).trim().toLowerCase()).filter(Boolean);
    keys.forEach((k) => { byKey[k] = str(m.id); });
  });
  const ids = [];
  names.forEach((n) => {
    const mid = byKey[n.toLowerCase()];
    if (mid && ids.indexOf(mid) < 0) ids.push(mid);
  });
  for (const mid of ids) {
    try { await env.CRMDB.prepare('INSERT OR IGNORE INTO task_assignees (task_id,member_id) VALUES (?,?)').bind(id, mid).run(); } catch (e) { /* */ }
  }
}

export async function entityLinkPut(env, link) {
  const now = Date.now();
  const srcT = str(link && link.source_type);
  const srcId = str(link && link.source_id);
  const dstT = str(link && link.target_type);
  const dstId = str(link && link.target_id);
  const relation = str((link && link.relation) || 'related');
  if (!srcT || !srcId || !dstT || !dstId) return null;
  const id = str(link.id) || ('rel_' + srcT + '_' + srcId + '_' + dstT + '_' + dstId + '_' + relation).replace(/[^a-zA-Z0-9_]+/g, '_').slice(0, 180);
  await opsUpsert(env, 'entity_links', {
    id,
    source_type: srcT,
    source_id: srcId,
    target_type: dstT,
    target_id: dstId,
    relation,
    sort: Number(link.sort) || 0,
    meta: JSON.stringify(link.meta || {}),
    created_at: Number(link.created_at) || now,
    updated_at: now,
  });
  return id;
}

export async function entityLinksFor(env, type, id) {
  return await opsAll(env,
    'SELECT * FROM entity_links WHERE (source_type=? AND source_id=?) OR (target_type=? AND target_id=?) ORDER BY sort ASC, created_at ASC',
    [str(type), str(id), str(type), str(id)]);
}

// ---- row-mappers (JSON-kolommen ontleden) --------------------------------
export function memberRow(r) {
  return { id: str(r.id), naam: str(r.naam), voornaam: str(r.voornaam), email: str(r.email), phone: str(r.phone),
    city: str(r.city), functie: str(r.functie), prole: str(r.prole), role: str(r.role) || 'team',
    teams: J(r.teams, []), personas: J(r.personas, []), org: str(r.org), color: str(r.color),
    week_hours: num(r.week_hours), reg: J(r.reg, {}), verlof_hours: num(r.verlof_hours), jeugd_hours: num(r.jeugd_hours),
    feest_hours: num(r.feest_hours), active: !!r.active };
}
export function taskRow(r) {
  return { id: str(r.id), name: str(r.name), company_id: str(r.company_id), project_id: str(r.project_id),
    contact_id: str(r.contact_id), candidate_id: str(r.candidate_id), vacature_id: str(r.vacature_id), wedding_id: str(r.wedding_id),
    parent_id: str(r.parent_id), type_job: str(r.type_job), branch: str(r.branch), org: str(r.org), status: str(r.status),
    priority: str(r.priority) || 'medium',
    pm: str(r.pm), people: J(r.people, []), budget: num(r.budget), regie: !!r.regie, start: r.start == null ? null : num(r.start),
    deadline: r.deadline == null ? null : num(r.deadline), est_min: num(r.est_min), brief: str(r.brief), rating: num(r.rating),
    drive: str(r.drive), is_ticket: !!r.is_ticket, is_autofb: !!r.is_autofb, fb_status: str(r.fb_status), fb_link: str(r.fb_link),
    pm_veld: str(r.pm_veld), track: !!r.track, metricool: str(r.metricool), posts: num(r.posts), platform: J(r.platform, []),
    metabiz: str(r.metabiz), adspend: num(r.adspend), offerte_id: str(r.offerte_id), briefing_id: str(r.briefing_id),
    plan_start: r.plan_start == null ? null : num(r.plan_start), plan_end: r.plan_end == null ? null : num(r.plan_end),
    archived: !!r.archived, archived_at: r.archived_at == null ? null : num(r.archived_at), archived_by: str(r.archived_by),
    archive_reason: str(r.archive_reason), archive_batch_id: str(r.archive_batch_id),
    completed_at: r.completed_at == null ? null : num(r.completed_at), last_activity_at: num(r.last_activity_at),
    ts: num(r.created_at) };
}
export function projectRow(r) {
  return { id: str(r.id), naam: str(r.naam), company_id: str(r.company_id), branch: str(r.branch), org: str(r.org),
    contact_id: str(r.contact_id), candidate_id: str(r.candidate_id), vacature_id: str(r.vacature_id), wedding_id: str(r.wedding_id),
    status: str(r.status), pm: str(r.pm), budget: num(r.budget), start: r.start == null ? null : num(r.start),
    deadline: r.deadline == null ? null : num(r.deadline), brief: str(r.brief), pm_veld: str(r.pm_veld),
    offerte_id: str(r.offerte_id), briefing_id: str(r.briefing_id), drive: str(r.drive),
    archived: !!r.archived, archived_at: r.archived_at == null ? null : num(r.archived_at), archived_by: str(r.archived_by),
    archive_reason: str(r.archive_reason), archive_batch_id: str(r.archive_batch_id),
    completed_at: r.completed_at == null ? null : num(r.completed_at), last_activity_at: num(r.last_activity_at) };
}
export function weddingRow(r) {
  return { id: str(r.id), partner_a: str(r.partner_a), partner_b: str(r.partner_b), trouwdatum: r.trouwdatum == null ? null : num(r.trouwdatum),
    maand: str(r.maand), locatie: str(r.locatie), gasten: num(r.gasten), pakket: str(r.pakket), fotograaf: str(r.fotograaf),
    status: str(r.status), budget: num(r.budget), voorschot: !!r.voorschot, social: str(r.social), company_id: str(r.company_id),
    contact_id: str(r.contact_id), offerte_id: str(r.offerte_id), meeting_id: str(r.meeting_id), project_id: str(r.project_id),
    archived: !!r.archived, archived_at: r.archived_at == null ? null : num(r.archived_at) };
}
export function leaveRow(r) {
  return { id: str(r.id), member_id: str(r.member_id), type: str(r.type), from_date: r.from_date == null ? null : num(r.from_date),
    to_date: r.to_date == null ? null : num(r.to_date), status: str(r.status), reason: str(r.reason),
    requested_at: r.requested_at == null ? null : num(r.requested_at), approved_by: str(r.approved_by),
    clickup_task_id: str(r.clickup_task_id), gcal_event_id: str(r.gcal_event_id), est_min: num(r.est_min) };
}
export function automationRow(r) {
  return { id: str(r.id), naam: str(r.naam), cat: str(r.cat), descr: str(r.descr), icon: str(r.icon), status: str(r.status),
    throughput: str(r.throughput), last_run: r.last_run == null ? null : num(r.last_run), make_scenario_id: str(r.make_scenario_id), enabled: !!r.enabled };
}
export function integrationRow(r) {
  return { id: str(r.id), naam: str(r.naam), descr: str(r.descr), icon: str(r.icon), kind: str(r.kind), status: str(r.status), org: str(r.org), enabled: !!r.enabled };
}
export function aiButtonRow(r) {
  return { id: str(r.id), label: str(r.label), icon: str(r.icon), model: str(r.model), prompt: str(r.prompt),
    job_types: J(r.job_types, []), views: J(r.views, []), assignees: J(r.assignees, []), statuses: J(r.statuses, []),
    vis_roles: J(r.vis_roles, []), vis_members: J(r.vis_members, []), enabled: !!r.enabled, sort: num(r.sort) };
}
export function aiMemoryRow(r) {
  return { id: str(r.id), member_id: str(r.member_id), agent_id: str(r.agent_id), bedrijf_id: str(r.bedrijf_id),
    kind: str(r.kind), rol: str(r.rol), tekst: str(r.tekst), bronnen: J(r.bronnen, []), pinned: !!r.pinned, ts: num(r.created_at) };
}
export function commentRow(r) {
  return { id: str(r.id), task_id: str(r.task_id), who: str(r.who), member_id: str(r.member_id), text: str(r.text), internal: !!r.internal, ts: num(r.created_at) };
}

// ---- veelgebruikte queries -----------------------------------------------
export async function membersAll(env) { return (await opsAll(env, 'SELECT * FROM team_members WHERE active=1 ORDER BY naam ASC')).map(memberRow); }
export async function memberByEmail(env, email) { const r = await opsAll(env, 'SELECT * FROM team_members WHERE email=? LIMIT 1', [str(email).toLowerCase()]); return r[0] ? memberRow(r[0]) : null; }
export async function tasksList(env, opts) {
  opts = opts || {};
  const where = [], binds = [];
  addArchiveFilter(where, opts);
  addEq(where, binds, 'branch', opts.branch);
  addEq(where, binds, 'status', opts.status);
  addEq(where, binds, 'company_id', opts.company_id);
  addEq(where, binds, 'contact_id', opts.contact_id);
  addEq(where, binds, 'project_id', opts.project_id);
  addEq(where, binds, 'offerte_id', opts.offerte_id);
  addEq(where, binds, 'wedding_id', opts.wedding_id);
  addEq(where, binds, 'candidate_id', opts.candidate_id);
  addEq(where, binds, 'vacature_id', opts.vacature_id);
  addEq(where, binds, 'pm', opts.pm);
  addEq(where, binds, 'org', opts.org);
  if (opts.parent_id != null) addEq(where, binds, 'parent_id', opts.parent_id);
  if (opts.updated_after != null) { where.push('updated_at>=?'); binds.push(Number(opts.updated_after) || 0); }
  if (opts.deadline_from != null) { where.push('deadline>=?'); binds.push(Number(opts.deadline_from) || 0); }
  if (opts.deadline_to != null) { where.push('deadline<=?'); binds.push(Number(opts.deadline_to) || 0); }
  const lim = clampLimit(opts.limit, 1000, 5000);
  const off = Math.max(0, Number(opts.offset) || 0);
  binds.push(lim, off);
  const sql = 'SELECT * FROM tasks' + (where.length ? (' WHERE ' + where.join(' AND ')) : '') +
    ' ORDER BY CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC, updated_at DESC LIMIT ? OFFSET ?';
  return (await opsAll(env, sql, binds)).map(taskRow);
}
export async function tasksCount(env, opts) {
  opts = opts || {};
  const where = [], binds = [];
  addArchiveFilter(where, opts);
  addEq(where, binds, 'branch', opts.branch);
  addEq(where, binds, 'status', opts.status);
  addEq(where, binds, 'company_id', opts.company_id);
  addEq(where, binds, 'project_id', opts.project_id);
  const r = await opsAll(env, 'SELECT COUNT(*) AS n FROM tasks' + (where.length ? (' WHERE ' + where.join(' AND ')) : ''), binds);
  return Number(r && r[0] && r[0].n) || 0;
}
export async function tasksAll(env) { return tasksList(env, { limit: 5000 }); }
export async function tasksForBranch(env, branch) { return tasksList(env, { branch, limit: 5000 }); }
export async function taskGet(env, id) { const r = await opsGet(env, 'tasks', id); return r ? taskRow(r) : null; }
export async function projectsList(env, opts) {
  opts = opts || {};
  const where = [], binds = [];
  addArchiveFilter(where, opts);
  addEq(where, binds, 'branch', opts.branch);
  addEq(where, binds, 'status', opts.status);
  addEq(where, binds, 'company_id', opts.company_id);
  addEq(where, binds, 'contact_id', opts.contact_id);
  addEq(where, binds, 'offerte_id', opts.offerte_id);
  addEq(where, binds, 'wedding_id', opts.wedding_id);
  const lim = clampLimit(opts.limit, 1000, 5000);
  const off = Math.max(0, Number(opts.offset) || 0);
  binds.push(lim, off);
  const sql = 'SELECT * FROM projects' + (where.length ? (' WHERE ' + where.join(' AND ')) : '') +
    ' ORDER BY CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC, updated_at DESC LIMIT ? OFFSET ?';
  return (await opsAll(env, sql, binds)).map(projectRow);
}
export async function projectsAll(env) { return projectsList(env, { limit: 5000 }); }
export async function weddingsAll(env, opts) {
  opts = opts || {};
  const where = [], binds = [];
  addArchiveFilter(where, opts);
  addEq(where, binds, 'status', opts.status);
  addEq(where, binds, 'company_id', opts.company_id);
  addEq(where, binds, 'contact_id', opts.contact_id);
  addEq(where, binds, 'offerte_id', opts.offerte_id);
  const lim = clampLimit(opts.limit, 1000, 5000);
  const off = Math.max(0, Number(opts.offset) || 0);
  binds.push(lim, off);
  return (await opsAll(env, 'SELECT * FROM weddings' + (where.length ? (' WHERE ' + where.join(' AND ')) : '') +
    ' ORDER BY CASE WHEN trouwdatum IS NULL THEN 1 ELSE 0 END, trouwdatum ASC LIMIT ? OFFSET ?', binds)).map(weddingRow);
}
export async function leavesAll(env) { return (await opsAll(env, 'SELECT * FROM leaves ORDER BY from_date DESC')).map(leaveRow); }
export async function automationsAll(env) { return (await opsAll(env, 'SELECT * FROM automations ORDER BY sort ASC, naam ASC')).map(automationRow); }
export async function integrationsAll(env) { return (await opsAll(env, 'SELECT * FROM integrations ORDER BY naam ASC')).map(integrationRow); }
export async function aiButtonsAll(env) { return (await opsAll(env, 'SELECT * FROM ai_buttons ORDER BY sort ASC')).map(aiButtonRow); }
export async function commentsForTask(env, taskId) { return (await opsAll(env, 'SELECT * FROM task_comments WHERE task_id=? ORDER BY created_at ASC', [str(taskId)])).map(commentRow); }
export async function aiMemoryFor(env, memberId, limit) { return (await opsAll(env, 'SELECT * FROM ai_memory WHERE member_id=? ORDER BY pinned DESC, created_at DESC LIMIT ?', [str(memberId), Math.min(200, Number(limit) || 100)])).map(aiMemoryRow); }
export async function settingsUser(env, memberId) { const r = await opsGet(env, 'settings_user', memberId); return r ? { member_id: str(r.member_id), tone: J(r.tone, {}), notif: J(r.notif, {}), whatsapp: str(r.whatsapp) } : null; }

export async function taskArchive(env, id, by, reason) {
  const taskId = str(id);
  if (!taskId) return false;
  const now = Date.now();
  try {
    await env.CRMDB.prepare(
      'UPDATE tasks SET archived=1, archived_at=?, archived_by=?, archive_reason=?, updated_at=?, last_activity_at=? WHERE id=? OR parent_id=?'
    ).bind(now, str(by), str(reason || 'manual'), now, now, taskId, taskId).run();
    return true;
  } catch (e) { return false; }
}

export async function taskStatusPatch(env, id, status) {
  const taskId = str(id);
  const st = str(status);
  if (!taskId) return false;
  const now = Date.now();
  const done = taskTerminal(st);
  try {
    await env.CRMDB.prepare('UPDATE tasks SET status=?, completed_at=?, updated_at=?, last_activity_at=? WHERE id=?')
      .bind(st, done ? now : null, now, now, taskId).run();
    return true;
  } catch (e) { return false; }
}
