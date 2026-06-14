/* =============================================================================
 * AUTO-DONE SWEEP (Workflow A) — dagelijkse cron die taken ZONDER klantfeedback
 * (Shoot, UGC-Shoot, Meeting, hosting) automatisch op 'done' zet zodra hun
 * geplande moment voorbij is. Zo wordt 'done' NOOIT handmatig gezet (Vincent 14-06:
 * "shoot/hosting en meetings/ugc-shoot mogen automatisch op done").
 * -----------------------------------------------------------------------------
 * Veilig per ontwerp:
 *  - SLAPEND tot KV `donesweep:enabled`='1' (exact zoals de reminder-engine).
 *  - PILOT: enkel PILOT_BEDRIJVEN (Studio 27) tot Vincent breder groen licht geeft.
 *  - 'done' zit NIET in NOTIFY_STATUSES (clickup-push.mjs) -> een auto-done stuurt
 *    GEEN klantmelding. Geen spam bij elke afgesloten shoot/meeting/hosting-periode.
 *  - Raakt enkel (sub)taken met de juiste TYPE JOB; de parent-projectstatus
 *    (feedback klant e.d.) blijft ongemoeid -> sluit een project niet voortijdig.
 *  - Enkel als de due date ECHT voorbij is (geplande shoot/meeting heeft plaatsgevonden).
 *    'on hold' (gepauzeerd) wordt overgeslagen.
 *  - TYPE JOB wordt op NAAM herkend via runtime-resolutie van de option-orderindex,
 *    zodat een herschikking van de dropdown deze sweep niet stilletjes laat wegdrijven
 *    (in oudere code stond 'Shoot' hardcoded op orderindex 6 — intussen verschoven).
 *    Lukt de resolutie niet, dan doet de sweep NIETS (nooit blind alles afsluiten).
 * Draait volledig in scheduled() -> nul impact op het klant-request-pad. Fail-soft.
 *
 * WIRING (in worker.js, scheduled(), onder de bestaande 07:00-cron, naast de
 * reminder-engine — 1 import + 1 regel):
 *     import * as ds from './done-sweep.mjs';
 *     ctx.waitUntil((async () => { try { await ds.doneSweep(env); } catch (e) {} })());
 * GO-LIVE: bovenstaande wiring meedeployen + KV `donesweep:enabled` op '1' zetten.
 * ============================================================================= */
import { cu, getCF, FIELD, adminCompanies, fetchBedrijfTree, isAfgerondStatus } from './handlers.mjs';

const str = (v) => (v == null ? '' : String(v));

// TYPE JOBs die auto-done mogen (Vincent 14-06). Op NAAM (case-insensitief, getrimd)
// i.p.v. hardcoded orderindex, want de dropdown-volgorde kan wijzigen.
const AUTO_DONE_TYPEJOBS = new Set(['meeting', 'shoot', 'ugc-shoot', 'hosting']);
// Eén Planning-lijst volstaat om de TYPE JOB-optiedefinitie op te halen (het veld leeft
// op de Planning-folder en is identiek op alle onderliggende lijsten).
const TYPEJOB_REF_LIST = '901520180316'; // Video- en fotografie
const PILOT_BEDRIJVEN = ['86c8cz2uu'];   // Studio 27 (zelfde pilot als de reminders)
const TARGET_STATUS = 'done';

// Huidige orderindexen voor de auto-done TYPE JOBs ophalen (naam -> index, live).
async function resolveTypeJobIndexes(env) {
  try {
    const r = await cu.get(env, `/list/${TYPEJOB_REF_LIST}/field`);
    const fields = (r && r.ok && r.data && Array.isArray(r.data.fields)) ? r.data.fields : [];
    const f = fields.find((x) => str(x.id) === FIELD.typeJob);
    const opts = (f && f.type_config && Array.isArray(f.type_config.options)) ? f.type_config.options : [];
    const set = new Set();
    for (const o of opts) {
      if (AUTO_DONE_TYPEJOBS.has(str(o.name).trim().toLowerCase())) set.add(Number(o.orderindex));
    }
    return set;
  } catch (e) { return new Set(); }
}

function isOnHold(statusObj) {
  return str(statusObj && statusObj.status).toLowerCase().includes('hold');
}

// Mag deze taak auto-done? Juiste TYPE JOB + geplande datum voorbij + nog niet afgerond/on hold.
function magAutoDone(t, jobIdx, now) {
  if (isAfgerondStatus(t.status)) return false;        // al done / (klaar voor) facturatie / gefactureerd
  if (isOnHold(t.status)) return false;                // gepauzeerd -> niet automatisch afsluiten
  const tj = Number(getCF(t, FIELD.typeJob));
  if (!Number.isFinite(tj) || !jobIdx.has(tj)) return false;
  const due = Number(t.due_date) || 0;
  if (!(due > 0 && due < now)) return false;           // enkel als het geplande moment écht voorbij is
  return true;
}

export async function doneSweep(env, ctx) {
  // noodrem 1: expliciete KV-schakelaar (default UIT -> sweep doet niets)
  let enabled = '';
  try { enabled = str(await env.KV.get('donesweep:enabled')); } catch (e) { enabled = ''; }
  if (enabled !== '1') return { skipped: 'disabled' };

  // noodrem 2: zonder herkende TYPE JOB-indexen sluiten we NIETS af
  const jobIdx = await resolveTypeJobIndexes(env);
  if (!jobIdx.size) return { skipped: 'typejobs_unresolved' };

  let companies = [];
  try {
    const r = await adminCompanies(env);
    companies = (r && r.body && Array.isArray(r.body.companies)) ? r.body.companies : [];
  } catch (e) { return { skipped: 'companies_failed' }; }
  // pilot-poort: tijdens de testfase enkel de pilot-bedrijven (Studio 27)
  if (PILOT_BEDRIJVEN.length) companies = companies.filter((c) => PILOT_BEDRIJVEN.includes(str(c && c.id).toLowerCase()));

  const now = Date.now();
  let done = 0;
  const BATCH = 5;
  for (let i = 0; i < companies.length; i += BATCH) {
    await Promise.all(companies.slice(i, i + BATCH).map(async (c) => {
      try {
        const tree = await fetchBedrijfTree(env, c.id);
        const kandidaten = (tree.all || []).filter((t) => magAutoDone(t, jobIdx, now));
        for (const t of kandidaten) {
          try {
            const r = await cu.put(env, `/task/${t.id}`, { status: TARGET_STATUS });
            if (r && r.ok) done++;
          } catch (e) { /* één taak mag de run niet breken */ }
        }
      } catch (e) { /* één bedrijf mag de run niet breken */ }
    }));
  }
  return { ok: true, done };
}
