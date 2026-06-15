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
import { cu, getCF, FIELD, adminCompanies, fetchBedrijfTree, isAfgerondStatus, TJ, typeJobUuid, ensureTjMap } from './handlers.mjs';

const str = (v) => (v == null ? '' : String(v));

// TYPE JOBs die auto-done mogen (Vincent 14-06), op STABIELE option-UUID — immuun voor zowel
// herordenen ALS hernoemen van de dropdown. typeJobUuid() resolvet de opgeslagen orderindex live.
const AUTO_DONE_UUIDS = new Set([TJ.meeting, TJ.shoot, TJ.ugcShoot, TJ.hosting]);
const PILOT_BEDRIJVEN = ['86c8cz2uu'];   // Studio 27 (zelfde pilot als de reminders)
const TARGET_STATUS = 'done';

function isOnHold(statusObj) {
  return str(statusObj && statusObj.status).toLowerCase().includes('hold');
}

// Mag deze taak auto-done? Juiste TYPE JOB (UUID) + geplande datum voorbij + nog niet afgerond/on hold.
function magAutoDone(t, now) {
  if (isAfgerondStatus(t.status)) return false;        // al done / (klaar voor) facturatie / gefactureerd
  if (isOnHold(t.status)) return false;                // gepauzeerd -> niet automatisch afsluiten
  if (!AUTO_DONE_UUIDS.has(typeJobUuid(t))) return false;
  const due = Number(t.due_date) || 0;
  if (!(due > 0 && due < now)) return false;           // enkel als het geplande moment écht voorbij is
  return true;
}

export async function doneSweep(env, ctx) {
  // noodrem 1: expliciete KV-schakelaar (default UIT -> sweep doet niets)
  let enabled = '';
  try { enabled = str(await env.KV.get('donesweep:enabled')); } catch (e) { enabled = ''; }
  if (enabled !== '1') return { skipped: 'disabled' };

  // noodrem 2: zonder beschikbare TYPE JOB-optielijst sluiten we NIETS af. typeJobUuid gebruikt
  // per-taak type_config, maar we warmen de fallbackcache als gordel-en-bretels + gate erop.
  const tjm = await ensureTjMap(env);
  if (!tjm) return { skipped: 'typejobs_unresolved' };

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
        const kandidaten = (tree.all || []).filter((t) => magAutoDone(t, now));
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
