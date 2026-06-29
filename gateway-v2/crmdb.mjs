// ===========================================================================
// crmdb.mjs — D1-datalaag voor 27CRM + 27Finance (binding env.CRMDB).
// Pure ES-module; generieke upsert + getypeerde query-helpers. Spiegelt hrdb.mjs.
// Tabellen: companies, contacts, offertes, meetings, invoices, recurring, company_subscriptions, sync_meta.
// ===========================================================================
const str = (v) => (v == null ? '' : String(v));
const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

// Generieke upsert op primaire sleutel id. obj-keys MOETEN kolomnamen zijn.
export async function cdbUpsert(env, table, obj) {
  const cols = Object.keys(obj);
  if (!cols.length) return;
  const ph = cols.map(() => '?').join(',');
  const set = cols.filter((c) => c !== 'id').map((c) => `${c}=excluded.${c}`).join(',');
  const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph}) ON CONFLICT(id) DO UPDATE SET ${set}`;
  await env.CRMDB.prepare(sql).bind(...cols.map((c) => obj[c])).run();
}

// Portal-overrides: kolommen die in het portaal handmatig gezet zijn en die de
// (eenrichtings) ClickUp->D1-sync NIET mag overschrijven. Veralgemening van het
// vd_override-patroon. Per rij staat in kolom `portal_overrides` een JSON-object
// {kolomnaam: timestamp} van velden die het portaal "bezit".
export async function loadPortalOverrides(env, table) {
  const m = {};
  try {
    const rs = await env.CRMDB.prepare(`SELECT id, portal_overrides FROM ${table} WHERE portal_overrides IS NOT NULL AND portal_overrides!=''`).all();
    for (const r of (rs.results || [])) { try { const o = JSON.parse(r.portal_overrides || '{}'); if (o && typeof o === 'object') m[str(r.id)] = o; } catch (e) { /* */ } }
  } catch (e) { /* kolom bestaat (nog) niet -> geen overrides */ }
  return m;
}
// Upsert die door het portaal overschreven kolommen voor déze rij ongemoeid laat,
// zodat een handmatige portaal-wijziging de uurlijkse ClickUp-sync overleeft.
export async function cdbUpsertGuarded(env, table, obj, ovrMap) {
  const ov = ovrMap && ovrMap[str(obj && obj.id)];
  if (ov) { const o = Object.assign({}, obj); for (const k in ov) { if (k !== 'id') delete o[k]; } return cdbUpsert(env, table, o); }
  return cdbUpsert(env, table, obj);
}
export async function crmCount(env, table) {
  try { const r = await env.CRMDB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first(); return Number(r && r.n) || 0; } catch (e) { return 0; }
}
async function allRows(env, sql, binds) {
  try { const r = await env.CRMDB.prepare(sql).bind(...(binds || [])).all(); return r.results || []; } catch (e) { return []; }
}
async function firstRow(env, sql, binds) {
  try { return (await env.CRMDB.prepare(sql).bind(...(binds || [])).first()) || null; } catch (e) { return null; }
}

// ---- mappers (D1-rij -> frontend-vorm) ------------------------------------
export function offerteRow(r) {
  let disc = {}; try { disc = r.disc ? JSON.parse(r.disc) : {}; } catch (e) { disc = {}; }
  return {
    id: str(r.id), titel: str(r.titel), onderneming: str(r.onderneming),
    status: str(r.status), status_cat: str(r.status_cat),
    bedrijf_id: str(r.bedrijf_id), bedrijf: str(r.bedrijf_naam),
    contact_id: str(r.contact_id), contact: str(r.contact_naam),
    meeting_id: str(r.meeting_id), briefing_id: str(r.briefing_id),
    owner: str(r.owner), budget: num(r.budget), disc: disc,
    panda_id: str(r.panda_id), panda_link: str(r.panda_link), code: str(r.code),
    verval: r.verval == null ? null : Number(r.verval), doorzet: str(r.doorzet),
    verzonden_door: str(r.verzonden_door), vd_override: !!r.vd_override, brief: str(r.brief),
    opstart: !!r.opstart, ts: Number(r.created_at) || 0,
  };
}
export function companyRow(r) {
  return {
    id: str(r.id), naam: str(r.naam), org: str(r.org), kaart: str(r.kaart),
    status_s27: str(r.status_s27), status_zvd: str(r.status_zvd), status_27a: str(r.status_27a),
    pm: str(r.pm), type_job: str(r.type_job), website: str(r.website), locatie: str(r.locatie),
    kbo: str(r.kbo), mw: r.mw == null ? null : Number(r.mw), fact_email: str(r.fact_email), fact_opm: str(r.fact_opm),
    drive: str(r.drive), hoofd_contact: str(r.hoofd_contact),
    ga4: str(r.ga4), gsc: str(r.gsc), gads: str(r.gads), meta_ads: str(r.meta_ads), metricool: str(r.metricool), webflow: str(r.webflow),
    portaal_url: str(r.portaal_url), portaal_token: str(r.portaal_token), portaal_modules: str(r.portaal_modules),
    belangrijk: !!r.belangrijk,
    ts: Number(r.created_at) || 0,
  };
}
export function contactRow(r) {
  let kan = []; try { kan = r.kanalen ? JSON.parse(r.kanalen) : []; } catch (e) { kan = []; }
  return { id: str(r.id), voornaam: str(r.voornaam), achternaam: str(r.achternaam), naam: (str(r.voornaam) + ' ' + str(r.achternaam)).trim(),
    email: str(r.email), gsm: str(r.gsm), bedrijf_id: str(r.bedrijf_id), notif: str(r.notif), kanalen: kan, ts: Number(r.created_at) || 0 };
}
export function meetingRow(r) {
  return { id: str(r.id), titel: str(r.titel), type: str(r.type), org: str(r.org), datum: r.datum == null ? null : Number(r.datum),
    status: str(r.status), bedrijf_id: str(r.bedrijf_id), contact_id: str(r.contact_id), ff: str(r.ff), ff_url: str(r.ff_url),
    samenvatting: str(r.samenvatting), ts: Number(r.created_at) || 0 };
}
export function invoiceRow(r) {
  return { id: str(r.id), nr: str(r.nr), bedrijf_id: str(r.bedrijf_id), bedrijf: str(r.bedrijf_naam), offerte_id: str(r.offerte_id),
    amount: num(r.amount), inv_date: r.inv_date == null ? null : Number(r.inv_date), due_date: r.due_date == null ? null : Number(r.due_date),
    status: str(r.status), note: str(r.note), source: str(r.source), ts: Number(r.created_at) || 0 };
}
export function recurringRow(r) {
  return { id: str(r.id), bedrijf_id: str(r.bedrijf_id), client: str(r.client), brand: str(r.brand), type: str(r.type), mrr: num(r.mrr), active: !!r.active };
}
export function companySubscriptionRow(r) {
  return {
    id: str(r.id), bedrijf_id: str(r.bedrijf_id), type: str(r.type), label: str(r.label),
    active: !!r.active, budget: num(r.budget), budget_period: str(r.budget_period) || 'maand',
    context: str(r.context), org: str(r.org), sort: num(r.sort), source: str(r.source),
    ts: Number(r.created_at) || 0,
  };
}

// ---- lijsten / detail -----------------------------------------------------
export async function offerteList(env) {
  return (await allRows(env, 'SELECT * FROM offertes ORDER BY created_at DESC')).map(offerteRow);
}
export async function offerteGet(env, id) {
  const r = await firstRow(env, 'SELECT * FROM offertes WHERE id=?', [str(id)]); return r ? offerteRow(r) : null;
}
export async function offertesForCompany(env, bedrijfId) {
  return (await allRows(env, 'SELECT * FROM offertes WHERE bedrijf_id=? ORDER BY created_at DESC', [str(bedrijfId)])).map(offerteRow);
}
export async function companyList(env) {
  return (await allRows(env, 'SELECT * FROM companies ORDER BY naam COLLATE NOCASE ASC')).map(companyRow);
}
export async function companyGet(env, id) {
  const r = await firstRow(env, 'SELECT * FROM companies WHERE id=?', [str(id)]); return r ? companyRow(r) : null;
}
export async function contactList(env) {
  return (await allRows(env, 'SELECT * FROM contacts ORDER BY voornaam COLLATE NOCASE ASC')).map(contactRow);
}
export async function contactsForCompany(env, bedrijfId) {
  return (await allRows(env, 'SELECT * FROM contacts WHERE bedrijf_id=? ORDER BY voornaam ASC', [str(bedrijfId)])).map(contactRow);
}
export async function contactGet(env, id) {
  const r = await firstRow(env, 'SELECT * FROM contacts WHERE id=?', [str(id)]); return r ? contactRow(r) : null;
}
export async function meetingList(env) {
  return (await allRows(env, 'SELECT * FROM meetings ORDER BY datum DESC')).map(meetingRow);
}
export async function meetingGet(env, id) {
  const r = await firstRow(env, 'SELECT * FROM meetings WHERE id=?', [str(id)]); return r ? meetingRow(r) : null;
}
export async function invoiceList(env) {
  return (await allRows(env, 'SELECT * FROM invoices ORDER BY inv_date DESC')).map(invoiceRow);
}
export async function recurringList(env) {
  return (await allRows(env, 'SELECT * FROM recurring WHERE active=1 ORDER BY mrr DESC')).map(recurringRow);
}
export async function ensureCompanySubscriptions(env) {
  if (!env || !env.CRMDB) return;
  try {
    await env.CRMDB.prepare("CREATE TABLE IF NOT EXISTS company_subscriptions (id TEXT PRIMARY KEY, bedrijf_id TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT '', label TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, budget REAL NOT NULL DEFAULT 0, budget_period TEXT NOT NULL DEFAULT 'maand', context TEXT NOT NULL DEFAULT '', org TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'portal', created_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0)").run();
    await env.CRMDB.prepare('CREATE INDEX IF NOT EXISTS idx_csub_bedrijf ON company_subscriptions(bedrijf_id, active)').run();
    await env.CRMDB.prepare('CREATE INDEX IF NOT EXISTS idx_csub_type ON company_subscriptions(type, active)').run();
  } catch (e) { /* DDL is best-effort: bestaande installaties kunnen apart migreren */ }
}
export async function companySubscriptionList(env) {
  await ensureCompanySubscriptions(env);
  return (await allRows(env, 'SELECT * FROM company_subscriptions ORDER BY bedrijf_id, sort ASC, type ASC')).map(companySubscriptionRow);
}
export async function companySubscriptionGet(env, id) {
  await ensureCompanySubscriptions(env);
  const r = await firstRow(env, 'SELECT * FROM company_subscriptions WHERE id=?', [str(id)]);
  return r ? companySubscriptionRow(r) : null;
}

// ---- sync-meta ------------------------------------------------------------
export async function syncMetaSet(env, k, v) {
  try { await env.CRMDB.prepare('INSERT INTO sync_meta (k,v,updated_at) VALUES (?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v,updated_at=excluded.updated_at').bind(str(k), str(v), Date.now()).run(); } catch (e) { /* */ }
}
export async function syncMetaGet(env, k) {
  const r = await firstRow(env, 'SELECT v,updated_at FROM sync_meta WHERE k=?', [str(k)]); return r ? { v: str(r.v), at: Number(r.updated_at) || 0 } : null;
}
