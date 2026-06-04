/* =============================================================================
 * gateway-v2 — node-harness
 * -----------------------------------------------------------------------------
 * Roept elke READ-handler aan voor het test-bedrijf 86c9yv1wy met de CLICKUP_TOKEN
 * uit .dev.vars (of env) en print de output-shape. Vergelijkt top-level sleutels
 * met wat v4/data.js verwacht. GEEN Firebase nodig (handlers nemen bedrijfId direct).
 *
 * Gebruik:  node _v2test.mjs           (leest .dev.vars)
 *           CLICKUP_TOKEN=pk_... node _v2test.mjs
 *           node _v2test.mjs --writes  (voert OOK de read-only-veilige write-dry-checks uit; default: alleen reads)
 * ============================================================================= */
import { readFileSync } from 'node:fs';
import {
  projectDetailV2, chatList, bedrijfContent, dashboard, meetingsList,
  getTeam, getOffertes,
} from './handlers.mjs';

const BEDRIJF = process.env.TEST_BEDRIJF || '86c9yv1wy';

/* ---- .dev.vars laden (KEY=value per regel) ---- */
function loadDevVars() {
  const env = { ...process.env };
  try {
    const txt = readFileSync(new URL('./.dev.vars', import.meta.url), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] == null) env[m[1]] = m[2];
    }
  } catch (e) { /* geen .dev.vars; val terug op process.env */ }
  return env;
}
const env = loadDevVars();
if (!env.CLICKUP_TOKEN) {
  console.error('FOUT: geen CLICKUP_TOKEN (zet .dev.vars of env). Afbreken.');
  process.exit(1);
}

/* ---- verwachte top-level sleutels uit v4/data.js ---- */
const EXPECT = {
  dashboard:        ['klant', 'stats', 'actieve_projecten', 'afgerond_60d', 'historie_3mnd', 'aankomende_meetings', 'contact', 'modules'],
  projectDetailV2:  ['ok', 'task_id', 'naam', 'status', 'beschrijving', 'deliverables_raw', 'deliverables', 'sae', 'has_contact', 'has_bedrijf', 'taken', 'comments'],
  chatList:         ['ok', 'comments'],
  bedrijfContent:   ['ok', 'algemene_voorkeuren', 'btw', 'ondernemingsnummer', 'facturatie_email', 'facturatie_opmerkingen', 'website', 'contact', 'attachments', 'categorieen'],
  meetingsList:     ['ok', 'meetings', 'booking_url'],
  get_team:         ['ok', 'aantal_medewerkers', 'btw', 'website', 'contactpersonen'],
  get_offertes:     ['ok', 'offertes', 'facturatie'],
};
const COMMENT_KEYS = ['id', 'auteur', 'is_klant', 'tekst', 'datum', 'attachments'];
const PROJECT_KEYS = ['task_id', 'naam', 'discipline', 'status', 'status_label', 'voortgang_pct', 'type', 'opleverdatum', 'laatst_geupdatet', 'feedback_link', 'sae'];
const AFGEROND_KEYS = ['task_id', 'naam', 'discipline', 'opleverdatum', 'heeft_bestanden'];
const DELIVERABLE_KEYS = ['label', 'url', 'type'];
const SAE_KEYS = ['naam', 'initialen'];
const FACT_KEYS = ['ondernemingsnummer', 'facturatie_email', 'facturatie_opmerkingen'];
const CONTACT_KEYS = ['id', 'voornaam', 'achternaam', 'email', 'gsm', 'voorkeur'];
const OFFERTE_KEYS = ['id', 'naam', 'status', 'link', 'budget', 'vervaldatum'];
const MODULE_KEYS  = ['performance', 'socials', 'ads', 'seo', 'opleidingen', 'strategie', 'branding', 'video_fotografie', 'webdesign'];

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`   ✓ ${name}`); }
  else { fail++; console.log(`   ✗ ${name}${detail ? '  → ' + detail : ''}`); }
}
function keyDiff(got, want) {
  const g = new Set(Object.keys(got || {}));
  const missing = want.filter((k) => !g.has(k));
  return missing;
}
function preview(obj) {
  const s = JSON.stringify(obj);
  return s.length > 360 ? s.slice(0, 360) + '…' : s;
}

async function run() {
  console.log(`\n=== gateway-v2 read-harness — bedrijf ${BEDRIJF} ===\n`);

  /* dashboard */
  console.log('[dashboard]');
  let r = await dashboard(BEDRIJF, {}, env);
  check('status 200', r.status === 200, 'got ' + r.status);
  let miss = keyDiff(r.body, EXPECT.dashboard);
  check('top-level keys', miss.length === 0, 'missing: ' + miss.join(','));
  check('modules keys', keyDiff(r.body.modules, MODULE_KEYS).length === 0, 'missing: ' + keyDiff(r.body.modules, MODULE_KEYS).join(','));
  check('actieve_projecten is array', Array.isArray(r.body.actieve_projecten));
  check('historie_3mnd === []', Array.isArray(r.body.historie_3mnd) && r.body.historie_3mnd.length === 0);
  check('klant.bedrijfsnaam === "Klant"', r.body.klant && r.body.klant.bedrijfsnaam === 'Klant');
  check('stats.actieve_projecten == count', r.body.stats && r.body.stats.actieve_projecten === r.body.actieve_projecten.length);
  if (r.body.actieve_projecten[0]) {
    const p = r.body.actieve_projecten[0];
    check('project keys', keyDiff(p, PROJECT_KEYS).length === 0, 'missing: ' + keyDiff(p, PROJECT_KEYS).join(','));
    check('project.discipline non-empty', p.discipline !== '', 'discipline empty (should be filtered)');
    check('project.voortgang_pct is number', typeof p.voortgang_pct === 'number');
    check('project.sae is array', Array.isArray(p.sae));
    console.log('     sample project:', preview(p));
  }
  // afgerond_60d (contract: [{task_id, naam, discipline, opleverdatum(ms), heeft_bestanden}])
  check('afgerond_60d is array', Array.isArray(r.body.afgerond_60d));
  check('actieve ∩ afgerond_60d leeg (geen dubbeltelling)',
    !r.body.actieve_projecten.some((p) => (r.body.afgerond_60d || []).some((a) => a.task_id === p.task_id)),
    'een taak zit zowel in actief als afgerond');
  if ((r.body.afgerond_60d || [])[0]) {
    const a = r.body.afgerond_60d[0];
    check('afgerond keys', keyDiff(a, AFGEROND_KEYS).length === 0, 'missing: ' + keyDiff(a, AFGEROND_KEYS).join(','));
    check('afgerond.opleverdatum is ms-number', typeof a.opleverdatum === 'number' && a.opleverdatum > 1e12, 'got ' + a.opleverdatum);
    check('afgerond.heeft_bestanden is boolean', typeof a.heeft_bestanden === 'boolean');
    const within60 = Date.now() - a.opleverdatum <= 60 * 86400000 + 86400000;
    check('afgerond.opleverdatum binnen 60d', within60, new Date(a.opleverdatum).toISOString());
    console.log('     sample afgerond:', preview(a));
  }
  // een afgerond-item met bestanden (heeft_bestanden=true) bewijst de parsing-koppeling
  const afgMetBestanden = (r.body.afgerond_60d || []).find((a) => a.heeft_bestanden);
  check('≥1 afgerond_60d met heeft_bestanden=true (live-bewijs)', !!afgMetBestanden,
    'geen afgeronde taak met bestanden — controleer veld b071307b op de done-taken');
  console.log(`     #actieve_projecten=${r.body.actieve_projecten.length}, #afgerond_60d=${(r.body.afgerond_60d || []).length}, modules.performance=${r.body.modules.performance}, modules.seo=${r.body.modules.seo}`);
  const firstTaskId = (r.body.actieve_projecten[0] || {}).task_id || '';

  /* projectDetailV2 */
  console.log('\n[projectDetailV2]  (task_id=' + (firstTaskId || 'n/a') + ')');
  if (firstTaskId) {
    r = await projectDetailV2(BEDRIJF, { task_id: firstTaskId }, env);
    check('status 200', r.status === 200, 'got ' + r.status);
    miss = keyDiff(r.body, EXPECT.projectDetailV2);
    check('top-level keys', miss.length === 0, 'missing: ' + miss.join(','));
    check('all scalar fields are strings', ['task_id', 'naam', 'status', 'beschrijving', 'deliverables_raw', 'time_estimate', 'type_job'].every((k) => typeof r.body[k] === 'string'));
    check('has_contact yes|no', r.body.has_contact === 'yes' || r.body.has_contact === 'no');
    check('deliverables is array', Array.isArray(r.body.deliverables));
    check('sae is array', Array.isArray(r.body.sae));
    check('taken is array', Array.isArray(r.body.taken));
    if (r.body.taken[0]) {
      check('taak heeft_bestanden is boolean', typeof r.body.taken[0].heeft_bestanden === 'boolean');
      check('taak bestanden is array', Array.isArray(r.body.taken[0].bestanden));
    }
    check('comments === []', Array.isArray(r.body.comments) && r.body.comments.length === 0);
    console.log('     sample:', preview({ ...r.body, taken: '[' + r.body.taken.length + ']' }));
  } else { console.log('   (overgeslagen: geen project-task gevonden)'); }

  /* projectDetailV2 deliverables-parsing op een ECHT project met bestanden */
  const projMetBestanden = afgMetBestanden ? afgMetBestanden.task_id : '';
  console.log('\n[projectDetailV2 deliverables]  (project met bestanden=' + (projMetBestanden || 'n/a') + ')');
  if (projMetBestanden) {
    r = await projectDetailV2(BEDRIJF, { task_id: projMetBestanden }, env);
    check('status 200', r.status === 200, 'got ' + r.status);
    check('deliverables non-empty', Array.isArray(r.body.deliverables) && r.body.deliverables.length > 0, '#=' + (r.body.deliverables || []).length);
    if ((r.body.deliverables || [])[0]) {
      const d = r.body.deliverables[0];
      check('deliverable keys {label,url,type}', keyDiff(d, DELIVERABLE_KEYS).length === 0, 'missing: ' + keyDiff(d, DELIVERABLE_KEYS).join(','));
      check('deliverable.url is http(s)', /^https?:\/\//.test(d.url), 'url="' + d.url + '"');
      check('deliverable.type in {video,img,doc,bestand}', ['video', 'img', 'doc', 'bestand'].includes(d.type), 'type="' + d.type + '"');
      console.log('     deliverables:', preview(r.body.deliverables));
    }
  } else { console.log('   (overgeslagen: geen project met bestanden gevonden)'); }

  /* projectDetailV2 scope-mismatch: een task van een ander bedrijf moet 403 geven */
  console.log('\n[projectDetailV2 scope-guard]  (vreemd bedrijf moet 403)');
  if (firstTaskId) {
    const rBad = await projectDetailV2('zzzNONEXISTbedrijf', { task_id: firstTaskId }, env);
    check('403 voor vreemd bedrijf', rBad.status === 403, 'got ' + rBad.status + ' (fail-open zou 200 geven als task wél Bedrijf-rel heeft)');
  }

  /* chatList */
  console.log('\n[chatList]  (task_id=' + (firstTaskId || 'n/a') + ')');
  if (firstTaskId) {
    r = await chatList(BEDRIJF, { task_id: firstTaskId }, env);
    check('status 200', r.status === 200, 'got ' + r.status);
    check('top-level keys', keyDiff(r.body, EXPECT.chatList).length === 0);
    check('comments is array', Array.isArray(r.body.comments));
    if (r.body.comments[0]) {
      check('comment keys', keyDiff(r.body.comments[0], COMMENT_KEYS).length === 0, 'missing: ' + keyDiff(r.body.comments[0], COMMENT_KEYS).join(','));
      check('is_klant is boolean', typeof r.body.comments[0].is_klant === 'boolean');
    }
    console.log(`     #comments=${r.body.comments.length}`);
  }

  /* bedrijfContent */
  console.log('\n[bedrijfContent]');
  r = await bedrijfContent(BEDRIJF, {}, env);
  check('status 200', r.status === 200, 'got ' + r.status);
  miss = keyDiff(r.body, EXPECT.bedrijfContent);
  check('top-level keys', miss.length === 0, 'missing: ' + miss.join(','));
  check('contact subkeys', keyDiff(r.body.contact, ['voornaam', 'achternaam', 'gsm', 'email']).length === 0);
  check('categorieen === null', r.body.categorieen === null);
  check('attachments is array', Array.isArray(r.body.attachments));
  console.log('     sample:', preview({ ...r.body, attachments: '[' + r.body.attachments.length + ']' }));

  /* get_team */
  console.log('\n[bedrijfBeheer:get_team]');
  r = await getTeam(BEDRIJF, { action: 'get_team' }, env);
  check('status 200', r.status === 200, 'got ' + r.status);
  miss = keyDiff(r.body, EXPECT.get_team);
  check('top-level keys', miss.length === 0, 'missing: ' + miss.join(','));
  check('contactpersonen is array', Array.isArray(r.body.contactpersonen));
  if (r.body.contactpersonen[0]) {
    const c = r.body.contactpersonen[0];
    check('contact keys', keyDiff(c, CONTACT_KEYS).length === 0, 'missing: ' + keyDiff(c, CONTACT_KEYS).join(','));
    check('voorkeur is enum', ['E-mail', 'Beide', 'Geen', 'WhatsApp'].includes(c.voorkeur), 'got "' + c.voorkeur + '"');
    console.log('     sample contact:', preview(c));
  }
  console.log(`     #contactpersonen=${r.body.contactpersonen.length}`);

  /* get_offertes */
  console.log('\n[bedrijfBeheer:get_offertes]');
  r = await getOffertes(BEDRIJF, { action: 'get_offertes' }, env);
  check('status 200', r.status === 200, 'got ' + r.status);
  check('top-level keys', keyDiff(r.body, EXPECT.get_offertes).length === 0);
  check('offertes is array', Array.isArray(r.body.offertes));
  // offerte-facturatie (contract: {ondernemingsnummer, facturatie_email, facturatie_opmerkingen})
  check('facturatie object', r.body.facturatie && typeof r.body.facturatie === 'object');
  if (r.body.facturatie) {
    check('facturatie keys', keyDiff(r.body.facturatie, FACT_KEYS).length === 0, 'missing: ' + keyDiff(r.body.facturatie, FACT_KEYS).join(','));
    check('facturatie velden zijn strings', FACT_KEYS.every((k) => typeof r.body.facturatie[k] === 'string'));
    console.log('     facturatie:', preview(r.body.facturatie));
  }
  if (r.body.offertes[0]) {
    const o = r.body.offertes[0];
    check('offerte keys', keyDiff(o, OFFERTE_KEYS).length === 0, 'missing: ' + keyDiff(o, OFFERTE_KEYS).join(','));
    let decoded = ''; try { decoded = decodeURIComponent(o.naam); } catch (e) {}
    check('naam is URL-encoded (decodeerbaar)', decoded !== '' && /%|[^%]/.test(o.naam), 'naam="' + o.naam + '"');
    console.log('     sample offerte:', preview(o), '| naam decoded:', decoded);
  }
  console.log(`     #offertes=${r.body.offertes.length}`);

  /* meetingsList */
  console.log('\n[meetingsList]  (server-side Bedrijf-scope)');
  r = await meetingsList(BEDRIJF, {}, env);
  check('status 200', r.status === 200, 'got ' + r.status);
  miss = keyDiff(r.body, EXPECT.meetingsList);
  check('top-level keys', miss.length === 0, 'missing: ' + miss.join(','));
  check('meetings is array', Array.isArray(r.body.meetings));
  check('booking_url hardcoded', r.body.booking_url === 'https://calendar.app.google/studio27klantenmeeting');
  if (r.body.meetings[0]) {
    check('meeting keys', keyDiff(r.body.meetings[0], ['meeting_id', 'titel', 'datum', 'status', 'link']).length === 0);
  }
  console.log(`     #meetings=${r.body.meetings.length} (server-side gefilterd op Bedrijf — kan 0 zijn als veld niet gevuld is)`);

  console.log(`\n=== RESULTAAT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('HARNESS-CRASH:', e); process.exit(2); });
