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
  TJ, typeJobUuid, typeJobKey, ensureTjMap,
  getWorkhours, whKey, whNormHm, whNormDays, WH_DEFAULT, sendGmail,
  mintGoogleToken, ga4Report, GA_SCOPE, WEB_SUBJECT, metricoolCreate, metricool, metaAds,
  metaKpiWindow, metaTimeParams, metaCompareWindow, googleAds, metaApplyChange, googleApplyChange,
  metaAdsRich, googleAdsRich,
  driveEnsure, driveFindOrCreateSubfolder, driveListFolder, driveResolveContentFolder, driveCompanyFolderId,
  buildPandadocCreate, pandadocCreate, PANDADOC_PM, pandadocTemplateForOrg, pandadocPmRoleForOrg, pandadocSkipPmForOrg, PANDADOC_BASE,
} from './handlers.mjs';
import { mcpListTools, mcpCallTool, mcpEncrypt, mcpDecrypt, mcpToolName,
  mcpRedirectUri, mcpRandom, mcpPkceChallenge, mcpDiscoverOauth, mcpRegisterClient, mcpExchangeCode, mcpRefreshToken } from './mcp.mjs';
import { logAiUsage, aiUsageFrom, aiCostsAggregate, aiCostsRollup, aiCostsSeedDemo, aiCostsWipeDemo, aiPricing, aiPricingSave, PRICING_DEFAULT } from './aicost.mjs';   // AI-kostenmonitor
import { aiBillingFetch } from './providerbilling.mjs';   // echte provider-facturatie (admin-keys)
import { hrCount, hrList, hrGet, hrSetStatus, hrSetSpam, hrSetAi, hrSetCvText, hrInsert, hrUpsertFromClickup, HR_STATUSSEN,
  obListPeople, obUpsertPerson, obUpdatePerson, obRemovePerson, obGetDone, obSetDone, obAddFromCandidate,
  docList, docInsert, docGet, docByMail, mailList, mailInsert, mailSeenGmail,
  mailUnread, mailUnreadCount, mailMarkRead, mailMarkAllRead } from './hrdb.mjs';   // HR-datastore (D1) i.p.v. ClickUp
import { signedHrFileUrl } from './videoreview.mjs';   // getekende dossierlink (R2 hrdocs/ via /hrfile)
import { offerteList, offerteGet, offertesForCompany, companyList, companyGet, contactList, contactsForCompany, contactGet, meetingList, invoiceList, recurringList, companySubscriptionList, ensureCompanySubscriptions, cdbUpsert, cdbUpsertGuarded, loadPortalOverrides } from './crmdb.mjs';   // 27CRM + 27Finance datalaag (D1 s27-crm-db)
import { opsUpsert, opsGet, opsDel, newId, membersAll, memberByEmail, memberRow, leaveRow, tasksAll, tasksList, tasksCount, taskGet, taskArchive, taskStatusPatch, projectsAll, projectsList, weddingsAll, leavesAll, automationsAll, integrationsAll, aiButtonsAll, commentsForTask, aiMemoryFor, settingsUser, opsAll, syncTaskAssignees, entityLinkPut } from './opsdb.mjs';   // operationele datalaag (Productie/team/registry)

const { isDoneTask, heeftDueDate, planTypeOf, msToBrusselsYmd, msToBrusselsHm, brusselsWallToMs, aiComplete: aiCompleteRaw, gcalEventsForHost, gcalPatchEvent, isClickupSyncEvent, gcalEventToInterval } = _teamHelpers;
// Dit Anthropic-account heeft enkel Claude 4-toegang (3.5/3.7/haiku → not_found).
const AI_MODEL = 'claude-sonnet-4-6';   // was claude-sonnet-4-20250514 (mei-2025-snapshot, geretireerd → 'niet bereikbaar')

/* ===========================================================================
 * AI-AGNOSTISCHE LAAG. Alle portaal-AI gaat door deze ene wrapper, zodat je
 * GLOBAAL (en straks per AI-knop) kan wisselen tussen Claude / Gemini / GPT.
 * aiCompleteRaw (handlers.mjs) routeert op modelnaam-prefix: gemini → Google,
 * gpt of o-modellen → OpenAI, anders → Anthropic. Wij kiezen hier enkel WELK model.
 * =========================================================================== */
const AI_MODELS = [
  { id: 'claude-sonnet-4-6', naam: 'Claude Sonnet 4.6', provider: 'Anthropic', env: 'ANTHROPIC_API_KEY' },
  { id: 'claude-opus-4-8', naam: 'Claude Opus 4.8', provider: 'Anthropic', env: 'ANTHROPIC_API_KEY' },
  { id: 'claude-haiku-4-5-20251001', naam: 'Claude Haiku 4.5', provider: 'Anthropic', env: 'ANTHROPIC_API_KEY' },
  { id: 'gpt-5.5', naam: 'GPT-5.5', provider: 'OpenAI', env: 'OPENAI_API_KEY' },
  { id: 'gpt-4.1', naam: 'GPT-4.1', provider: 'OpenAI', env: 'OPENAI_API_KEY' },
  { id: 'gpt-4o', naam: 'GPT-4o', provider: 'OpenAI', env: 'OPENAI_API_KEY' },
  { id: 'gpt-4o-mini', naam: 'GPT-4o mini', provider: 'OpenAI', env: 'OPENAI_API_KEY' },
  { id: 'gemini-3.5-flash', naam: 'Gemini 3.5 Flash', provider: 'Google', env: 'GEMINI_API_KEY' },
  { id: 'gemini-2.5-flash', naam: 'Gemini 2.5 Flash', provider: 'Google', env: 'GEMINI_API_KEY' },
  { id: 'gemini-2.5-pro', naam: 'Gemini 2.5 Pro', provider: 'Google', env: 'GEMINI_API_KEY' },
];
const AI_MODEL_IDS = new Set(AI_MODELS.map((m) => m.id));
const AIMODEL_CK = 'team:aimodel:global';
let _aiGlobalCache = { v: '', t: 0 };
async function aiGlobalModel(env) {
  const now = Date.now();
  if (_aiGlobalCache.v && (now - _aiGlobalCache.t) < 30000) return _aiGlobalCache.v;
  let m = ''; try { m = str(await env.KV.get(AIMODEL_CK)); } catch (e) { /* */ }
  _aiGlobalCache = { v: (m && AI_MODEL_IDS.has(m)) ? m : AI_MODEL, t: now };
  return _aiGlobalCache.v;
}
// effectief model voor een AI-knop: per-knop override (catalogus) > globaal > AI_MODEL.
async function aiActiveModel(env, knopKey) {
  if (knopKey) { try { const cat = await getAiCatalog(env); const it = cat.find((a) => a.key === knopKey); if (it && it.model && AI_MODEL_IDS.has(it.model)) return it.model; } catch (e) { /* */ } }
  return aiGlobalModel(env);
}
// Wrapper: identieke signatuur als de oude aiComplete, maar kiest het ACTIEVE model.
// Caller geeft AI_MODEL door (= "gebruik de standaard") → wij vervangen door het globale model.
// Een caller die bewust een ander geldig model meegeeft, wordt gerespecteerd. opts.knop = per-knop override.
// opts draagt ook de kostenmonitor-context: { skill, member_id, member_naam, bedrijf_id, bedrijf_naam, platform }.
// Dat geven we als 6e arg ('meta') aan aiCompleteRaw door; alle team-AI logt zo platform='team' + de skill.
async function aiComplete(env, model, system, user, maxTokens, opts) {
  let m = str(model);
  if (opts && opts.knop) m = await aiActiveModel(env, opts.knop);
  else if (!m || m === AI_MODEL || !AI_MODEL_IDS.has(m)) m = await aiGlobalModel(env);
  const o = opts || {};
  const meta = { platform: o.platform || 'team', skill: o.skill || o.knop || 'overig', member_id: o.member_id, member_naam: o.member_naam, bedrijf_id: o.bedrijf_id, bedrijf_naam: o.bedrijf_naam };
  return aiCompleteRaw(env, m, system, user, maxTokens, meta);
}

const str = (v) => (v == null ? '' : String(v));

/* ---- roster-config -------------------------------------------------------- */
// Ex-medewerkers die nog als ClickUp-member bestaan maar niet in het roster horen.
const EX_MEMBERS = new Set([82651156 /* Eva */, 60375565 /* Lara */]);
// Stagiairs (ClickUp-guests): WÉL meetellen in de totaalomzet, NIET in de individuele per-persoon-tabellen.
const STAGE_IDS = new Set([106544827 /* Eline Meyvis */, 106702219 /* Ward Frijters */]);
// Niet individueel rapporteren (= ex-leden + stagiairs). Totalen (per categorie/onderneming/maand) blijven ongemoeid.
const PERS_HIDE = new Set([...EX_MEMBERS, ...STAGE_IDS]);
// Content-creators-pool (camera) -> rol-badge in het roster.
const POOL_IDS = new Set(VIDEO_POOL.map((m) => Number(m.id)));
// E-mail-alias: Vincent logt in met @studio27.be maar staat in ClickUp op een
// ander domein (vincent@zorgvoordigitaal.be, id 8714037).
const EMAIL_ALIAS = { 'vincent@studio27.be': 8714037 };
// Agenda-e-mail (DWD-impersonatie mag enkel binnen @studio27.be). Elk teamlid wordt zo
// AUTOMATISCH aan zijn/haar eigen Google-agenda gekoppeld: we mappen de ClickUp-gebruiker
// naar het juiste @studio27.be-adres. ClickUp bewaart soms een ander e-mailadres (bv.
// Vincent = vincent@zorgvoordigitaal.be), daarom: 1) expliciete override per id, 2) anders
// het ClickUp-adres als dat al @studio27.be is, 3) anders afgeleid uit de VOORNAAM
// (Studio 27-conventie voornaam@studio27.be). Bestaat het afgeleide adres niet, dan faalt
// de impersonatie netjes (lege agenda, geen fout).
const AGENDA_EMAIL_OVERRIDE = {
  8714037: 'vincent@studio27.be',   // ClickUp = vincent@zorgvoordigitaal.be
};
function agendaEmail(lid) {
  const ov = AGENDA_EMAIL_OVERRIDE[Number(lid.id)];
  if (ov) return ov;
  const e = str(lid.email).trim().toLowerCase();
  if (e.endsWith('@studio27.be')) return e;
  const vn = str(lid.naam).trim().split(/\s+/)[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  return vn ? vn + '@studio27.be' : e;
}

// Disciplinelijsten = de planning-lijsten zonder Payroll (afwezigheid hoort niet in de takenlijst).
const DISCIPLINE_LISTS = PLANNING_LISTS.filter((id) => id !== PAYROLL_LIST);

// FINANCIEEL: budget-veld (currency EUR) op offertes ÉN planningstaken (zelfde id),
// + offerte-velden. Categorie-omzet/omzet-per-persoon = uit de planningstaken (TYPE JOB
// + Budget + assignees). Vulgraad ~40% → indicatief, eerlijk labelen.
const BUDGET_FIELD = 'c8d2dd2c-2428-4236-ba37-a3f3cd90c9ec';
// Intern werk (klant = een eigen merk) telt NIET als externe omzet → uit bedrijfseconomie + uurtarieven.
const INTERN_CLIENTS = new Set(['86c8cz2uu' /* Studio 27 */, '86ca31qc1' /* 27 Automations */]);
// Uurtarief-richtgetal (€/u). €11k/maand bij 38u-weken (~164u) vergt ~€67/u bij 100% billable; met non-billable werk → ~€85/u realistisch. Beslissing Vincent 2026-06-16.
const UURTARIEF_TARGET = 85;
const OFFERTES_LIST = '901520180289';
const OFFERTE_NAAM = '8da934b5-7747-4ad3-ac2f-cc53cf2985e8'; // short_text 'Bedrijfsnaam'
// Organisatie (drop_down) → omzet/pipeline per onderneming. Waarde = orderindex (96% gevuld).
const ORG_FIELD = 'd320e913-8507-4fe0-8e49-3ab669b17779';
const ORG_NAMES = { 0: 'S27', 1: 'ZVD', 2: '27A', 3: '27M' };
const ORG_ORDER = ['S27', '27M', '27A', 'ZVD', 'Onbekend'];
function orgOf(t) { const v = getCF(t, ORG_FIELD); const n = Number(v); return (v != null && v !== '' && ORG_NAMES[n]) ? ORG_NAMES[n] : 'Onbekend'; }
// offerte-lijsten per onderneming (pipeline-splitsing): S27 / 27M / 27A / ZVD.
const OFFERTE_LISTS = [['901520180289', 'S27'], ['901523697887', '27M'], ['901523698125', '27A'], ['901523698213', 'ZVD']];
// TYPE JOB -> rapportcategorie, op STABIELE option-UUID (immuun voor herordenen). Was een
// positionele orderindex-array (CAT_BY_IDX) die na het toevoegen van dropdown-opties fout
// labelde (bv. omzet van Content viel deels onder Webdesign/Overig).
const CAT_BY_UUID = {
  [TJ.projectmanagement]: 'Projectmanagement',
  [TJ.meeting]: 'Overig',
  [TJ.strategie]: 'Strategie',
  [TJ.branding]: 'Branding', [TJ.fbBranding]: 'Branding',
  [TJ.preproductie]: 'Content', [TJ.fbPreproductie]: 'Content', [TJ.shoot]: 'Content', [TJ.ugcShoot]: 'Content', [TJ.edit]: 'Content', [TJ.fbEdit]: 'Content', [TJ.copywriting]: 'Content',
  [TJ.webdesign]: 'Webdesign', [TJ.fbWebdesign]: 'Webdesign',
  [TJ.seo]: 'SEO', [TJ.socialMedia]: 'Socials', [TJ.adverteren]: 'Ads', [TJ.automation]: 'Automation', [TJ.opleiding]: 'Opleiding',
  [TJ.hosting]: 'Overig', [TJ.bestelling]: 'Overig',
  [TJ.support]: 'Support',
};
function catOf(t) { return CAT_BY_UUID[typeJobUuid(t)] || 'Overig'; }
function num(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
function monthOf(ms) { const y = msToBrusselsYmd(Number(ms) || 0); return y ? y.slice(0, 7) : ''; }
// 'startklaar'-status = taak klaar om in te plannen (vervangt het 'Kan beginnen?'-veld).
function isStartklaar(t) { return /startklaar|start ?klaar/i.test(str(t.status && t.status.status)); }
// huidige maand-venster (1e 00:00 → laatste dag 23:59, Brussels).
function maandVenster() {
  const ym = msToBrusselsYmd(Date.now()).slice(0, 7); const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
  const nextYm = m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');
  return { van: brusselsWallToMs(ym + '-01', '00:00'), tot: brusselsWallToMs(nextYm + '-01', '00:00') - 1, ym };
}
function last12Months() { const out = []; const d = new Date(); for (let i = 11; i >= 0; i--) { const dd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)); out.push(dd.getUTCFullYear() + '-' + String(dd.getUTCMonth() + 1).padStart(2, '0')); } return out; }
// feedbackronde-detectie op taaknaam (geen ronde-teller-veld in ClickUp).
const FB_RE = /feedback|\bv\d+\b/i;

const okStaff = (body) => body && body.__staff === true;

/* ---- rollen & toegang (server-side; nooit enkel frontend) ----------------- */
// Alleen Vincent = admin. Arne = sales (cijfers/offertes). Ilke = accountmanager.
// Iedereen anders = team. ID's: Vincent 8714037, Arne 54513254, Ilke 48338421.
const ROLES = { 8714037: 'admin', 54513254: 'sales', 48338421: 'accountmanager' };
function roleOf(id) { return ROLES[Number(id)] || 'team'; }
// (Social) content-creators. ENKEL zij zien & gebruiken Shoot-aanvragen.
// Op ClickUp-id (robuust; Danique zit niet in VIDEO_POOL en die pool stuurt ook
// camera-/freeBusy-logica aan, dus bewust een aparte allowlist).
const SHOOT_CREATOR_IDS = new Set([36583478 /* Guus */, 54339680 /* Ines */, 36583476 /* Bjorn */, 82624365 /* Viktor */, 94564122 /* Danique */]);
function isCreator(id) { return SHOOT_CREATOR_IDS.has(Number(id)); }
// Uitvoerend team (omzet-target €11k/maand): IEDEREEN BEHALVE Vincent, Ilke + Wout (zaakvoerder/verkoper ZVD, geen uitvoerend teamlid).
const NON_EXEC_IDS = new Set([8714037 /* Vincent */, 48338421 /* Ilke */, 8725564 /* Wout Goos */]);
// Werken met MAANDplanning/maandbudget → géén weekbezetting beoordelen (heeft geen zin).
const MONTHLY_PLAN_IDS = new Set([82749837 /* Johanna */, 54513254 /* Arne */, 94564122 /* Danique */]);
// ── ORGANISATIE-KENNIS voor de AI-adviseurs: rollen, merk-verantwoordelijkheden, ex-leden ──
// Zodat de adviseur acties aan de JUISTE persoon kan toewijzen ("geef X deze opdracht").
const ORG_CONTEXT = [
  'ACHTERGROND STUDIO 27 GROUP (gebruik dit om elke actie aan de JUISTE persoon toe te wijzen):',
  'VIER MERKEN: (1) Studio 27 (S27) = kernbureau, branding, webdesign, content, social, ads, SEO, AI-automatisering; grootste omzet. (2) 27 Automations (27A) = AI-flows & procesdigitalisering, in opbouw. (3) Zorg voor Digitaal (ZVD) = marketing voor de zorgsector. (4) 27 Moments (27M) = trouwfoto/-video; herstart ~sep 2026 voor seizoen 2027.',
  'ZAAKVOERDERS: Vincent Verleije, zaakvoerder, focus innovatie/AI/strategie; NIET-uitvoerend (geen uurtarget) maar stuurt het geheel, je MAG Vincent expliciet opdrachten geven (closingrate, prijszetting/uurtarief, onderbenutting, strategische keuzes). Wout Goos, mede-zaakvoerder van S27 maar GEEN actief uitvoerend teamlid: hij is VERKOPER en focust op Zorg voor Digitaal; beoordeel hem niet op bezetting, zijn hefboom = ZVD-omzet laten groeien.',
  'VERANTWOORDELIJKHEDEN PER MERK (wijs sturing hieraan toe): 27 Moments → hoofdverantwoordelijke Viktor Hendrickx, sales/opvolging Arne Goetschalckx. 27 Automations → uitbouw/sales Arne Goetschalckx (+ Vincent voor de AI-inhoud). Zorg voor Digitaal → Wout Goos (verkoop). Studio 27 kern → Arne (sales), Ilke (accounts), het creatie-team voor uitvoering.',
  'TEAM & HEFBOMEN: Arne Goetschalckx. SALES (S27 + 27A + opvolging 27M), schoof van performance marketing naar sales om Vincent te ontlasten (maandplanning); centrale hefboom voor offerteconversie & prijszetting. Ilke Meeusen, accountmanager (nam over van Lara), NIET-uitvoerend; hefboom = retentie/opvolging/upsell. Klaas Vanhove, webdesign/development + projectopvolging/tickets. Viktor Hendrickx, Danique Bosch, Ines Permentiers, Bjorn Borgers, Guus Van den Heuvel, content/creatie & camera (video/foto/social). Johanna Augustyns, Griet Beyens (gestart maart 2026), Anouk de Hoon, team/uitvoering. Danique, Johanna en Arne werken met MAANDplanning.',
  'NIET MEER ACTIEF (nooit als huidig teamlid of hefboom opvoeren): Eva (vertrokken, copy→AI), Lara Hooyberghs (vertrokken; Ilke nam over). Stagiairs Ward Frijters & Eline Meyvis = stages (zo goed als) afgelopen, geen kernteam. Openstaande vacature: performance marketeer.',
  'UITVOEREND vs NIET-UITVOEREND (voor het €-target): uitvoerend = iedereen BEHALVE Vincent, Ilke en Wout (en de ex-leden/stagiairs). Wijs acties toe aan wie er écht iets aan kan doen; geef bij voorkeur per actie een concrete "wie".',
].join('\n');
function permsFor(role) {
  return {
    admin: role === 'admin',                                   // volledige controle. ENKEL Vincent
    finance: role === 'admin' || role === 'sales',             // cijfers/omzet/offertes. Vincent + Arne
    finance_full: role === 'admin',                            // omzet per persoon. ENKEL Vincent
    account: role === 'admin' || role === 'accountmanager',    // alle projecten + planning + health. Vincent + Ilke
    team: true,
  };
}
// resolveRole -> { me, role, perms, real_admin, actingAs } of { error }.
// ADMIN-IMPERSONATIE: enkel een admin (Vincent) mag via body.act_as_member het
// portaal van een ander teamlid 'worden'. De EFFECTIEVE identiteit (me/role/perms)
// wordt dan dat teamlid, zodat admin exact ziet wat die persoon ziet. real_admin
// blijft true zodat de frontend de wissel-knop + 'terug'-banner kan tonen.
async function resolveRole(env, body) {
  const leden = await ledenLijst(env);
  const realMe = resolveMember(str(body.account_email), leden);
  if (!realMe) return { error: { status: 200, body: { ok: false, error: 'no_member' } }, leden };
  const realRole = roleOf(realMe.id);
  // Payroll-poort (zacht): enkel een teamlid dat in Payroll EXPLICIET op 'inactief' staat wordt geweigerd.
  // Admins worden NOOIT geweigerd (anti-lockout: een admin moet altijd kunnen heractiveren). Default leeg -> geen effect.
  // Fail-soft: een KV/D1-fout mag nooit iemand buitensluiten.
  if (realRole !== 'admin') { try { const deny = await payrollDenySet(env); if (deny.has(Number(realMe.id))) return { error: { status: 200, body: { ok: false, error: 'deactivated', message: 'Je portaaltoegang staat op pauze. Vraag Vincent om je in Payroll terug op actief te zetten.' } }, leden }; } catch (e) { /* nooit blokkeren bij fout */ } }
  let me = realMe, role = realRole, actingAs = null;
  const actId = Number(body.act_as_member) || 0;
  if (actId && realRole === 'admin' && actId !== realMe.id) {
    const t = leden.find((l) => Number(l.id) === actId && !EX_MEMBERS.has(Number(l.id)));
    if (t) { me = { id: Number(t.id), naam: t.naam, email: t.email, pool: POOL_IDS.has(Number(t.id)) }; role = roleOf(me.id); actingAs = me; }
  }
  return { me, role, perms: Object.assign(permsFor(role), { creator: isCreator(me.id) }), leden, real_admin: realRole === 'admin', real_me: realMe, actingAs };
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

// teamMe: wie ben ik (effectief, incl. admin-impersonatie) + rol + rechten + roster.
export async function teamMe(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false, message: 'Alleen voor het Studio 27-team.' } };
  const rr = await resolveRole(env, body);
  if (rr.error) {
    if (!rr.leden || !rr.leden.length) return { status: 502, body: { ok: false, error: 'roster_unavailable' } };
    if (rr.error.body && rr.error.body.error === 'deactivated') return rr.error;   // 'op pauze'-boodschap doorgeven (niet als 'no_member' tonen)
    return { status: 200, body: { ok: false, error: 'no_member', email: str(body.account_email),
      message: 'Je @studio27.be-account is nog niet gekoppeld aan een ClickUp-teamlid. Vraag Vincent je toe te voegen aan de ClickUp-workspace.' } };
  }
  return {
    status: 200, body: {
      ok: true, me: rr.me, role: rr.role, perms: rr.perms, roster: rosterFrom(rr.leden),
      can_impersonate: rr.real_admin, acting_as: rr.actingAs, real_naam: rr.real_me.naam,
    },
  };
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
  const pType = planTypeOf(t);           // 'shoot' | 'meeting' | ''
  const planActie = (isStartklaar(t) && !heeftDueDate(t) && !isDoneTask(t)) ? pType : '';
  // VAST = staat vast in de tijd, mag NOOIT auto-verschuiven bij het herplannen:
  // shoots, meetings en payroll/verlof. (Google-agenda-events komen apart binnen,
  // ook als vaste obstakels.) Alles anders = verplaatsbaar.
  const isPayroll = str(t.list && t.list.id) === PAYROLL_LIST;
  const vastSoort = pType === 'shoot' ? 'shoot' : pType === 'meeting' ? 'meeting' : (isPayroll ? 'payroll' : '');
  return {
    id: str(t.id), naam: str(t.name),
    status: statusMapper(t.status),
    discipline: disciplineOf(t),
    bedrijf_id: bid, bedrijf: naamMap[bid] || '',
    due, start, est: Number(t.time_estimate) || 0,
    prioriteit: (t.priority && t.priority.priority) ? str(t.priority.priority) : '',
    ingepland: due > 0 || start > 0,
    plan_actie: planActie,                 // 'shoot' | 'meeting' | '' (nog in te plannen)
    vast: !!vastSoort,                     // true = niet auto-verschuifbaar
    vast_soort: vastSoort,                 // 'shoot' | 'meeting' | 'payroll' | ''
    due_ymd: due ? msToBrusselsYmd(due) : '',
    start_ymd: start ? msToBrusselsYmd(start) : '',
    url: str(t.url),
  };
}

// teamTaken: { member_id? } -> taken van dat teamlid (default: ikzelf), met buckets.
export async function teamTaken(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false, message: 'Alleen voor het Studio 27-team.' } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const me = rr.me; const leden = rr.leden;

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
 * WEEKPLANNER (multi-lid): voor een set teamleden + weekvenster, in ÉÉN call
 * de Google-agenda-events (DWD per lid) + hun (open) portaal-taken. Voedt de
 * weekplanner zodat iedereen ieders agenda + taken ziet, met filters frontend.
 * =========================================================================== */
export async function teamWeekplanner(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const leden = rr.leden;
  const roster = rosterFrom(leden);
  const van = Number(body.van_ms) || 0, tot = Number(body.tot_ms) || 0;
  if (!van || !tot || tot <= van || (tot - van) > 45 * 86400000) return { status: 400, body: { ok: false, error: 'bad_window' } };
  // Welke leden: expliciete lijst, anders default = enkel ikzelf (snel; frontend voegt collega's bij via filter).
  let ids = (Array.isArray(body.member_ids) && body.member_ids.length) ? body.member_ids.map(Number).filter(Boolean) : [rr.me.id];
  ids = ids.filter((id) => !EX_MEMBERS.has(id)).slice(0, 20);
  const wantCal = body.calendar !== false, wantTasks = body.tasks !== false;
  const naamMap = wantTasks ? await bedrijvenNaamMap(env) : {};
  const out = [];
  await Promise.all(ids.map(async (mid) => {
    const lid = leden.find((l) => Number(l.id) === mid);
    if (!lid) return;
    const isSelf = mid === rr.me.id;
    const canTitel = isSelf || rr.real_admin || (rr.perms && rr.perms.account);   // collega-titels enkel voor admin/account; anders 'Bezet'
    let events = [], taken = [];
    if (wantCal) {
      try {
        const email = agendaEmail(lid);
        if (email) {
          const raw = await gcalEventsForHost(env, email, van, tot);
          for (const ev of (raw || [])) {
            if (isClickupSyncEvent(ev)) continue;
            const iv = gcalEventToInterval(ev); if (!iv) continue;
            const allday = !!(ev.start && ev.start.date && !ev.start.dateTime);
            events.push({ id: str(ev.id || ''), titel: canTitel ? (str(ev.summary) || 'Afspraak') : 'Bezet', start_ms: iv[0], eind_ms: iv[1], allday, locatie: canTitel ? str(ev.location || '') : '', link: canTitel ? str(ev.htmlLink || '') : '' });
          }
        }
      } catch (e) { /* fail-soft per lid */ }
    }
    if (wantTasks) {
      try { const raw = await tasksForMember(env, mid); taken = raw.filter((t) => !isDoneTask(t)).map((t) => shapeTask(t, naamMap)); } catch (e) { /* */ }
    }
    out.push({ id: mid, naam: lid.naam, events, taken, can_titel: canTitel });
  }));
  out.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  return { status: 200, body: { ok: true, members: out, roster, me_id: rr.me.id, van_ms: van, tot_ms: tot } };
}

/* ===========================================================================
 * PROJECTDETAIL + STATUS + CHAT, alles wat een teamlid nodig heeft om een
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

// teamProject: rijke detail van één taak/project, briefing, klant, deadline,
// bestanden, subtaken, teamleden, status. Schrijft niets.
export async function teamProject(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const tr = await cu.get(env, `/task/${taskId}?include_subtasks=true`);
  if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const t = tr.data;
  const listId = (t.list && t.list.id) || '';
  const bid = (getRelationIds(t, FIELD.bedrijf)[0]) || '';
  const cid = (getRelationIds(t, FIELD.contact)[0]) || '';
  const [naamMap, lr, ctr] = await Promise.all([
    bedrijvenNaamMap(env),
    listId ? cu.get(env, `/list/${listId}`) : Promise.resolve(null),
    cid ? cu.get(env, `/task/${cid}`) : Promise.resolve(null),
  ]);
  let statussen = [];
  if (lr && lr.ok && lr.data && Array.isArray(lr.data.statuses)) statussen = lr.data.statuses.map((s) => ({ status: str(s.status), color: str(s.color), type: str(s.type) })).filter((s) => s.status);
  // contactpersoon + gegevens (voornaam/achternaam/email/gsm) voor de taakpagina
  let contact = null;
  if (ctr && ctr.ok && ctr.data) {
    const ct = ctr.data;
    const vn = str(getCF(ct, '626a0441-8824-4381-a89a-4639ac547e23'));   // Voornaam
    const an = str(getCF(ct, '79cbda71-626b-424c-8f78-d0785c52126a'));   // Achternaam
    contact = { id: str(ct.id), naam: ((vn + ' ' + an).trim() || str(ct.name)), voornaam: vn, achternaam: an, email: str(getCF(ct, FIELD.email)), gsm: str(getCF(ct, FIELD.gsm)) };
  }
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
  // RELEVANTE custom fields per type job: locatie/afstand enkel bij een shoot, niet bij montage/edit.
  const tjUuid = typeJobUuid(t);
  const velden = [];
  if (tjUuid === TJ.shoot || tjUuid === TJ.ugcShoot || tjUuid === TJ.preproductie) {
    const locVal = getCF(t, 'fcbb46ff-66d5-432c-8edb-80de053197f3');   // Locatie (location)
    const locStr = locVal ? str(locVal.formatted_address || (locVal.location && locVal.location.formatted_address) || (typeof locVal === 'string' ? locVal : '')) : '';
    if (locStr) velden.push({ label: 'Locatie', waarde: locStr, ic: '📍', type: 'locatie' });
    const km = num(getCF(t, '3348d0b2-730a-4c48-bd7a-5f9e29d4bf87'));   // Km's - P1
    if (km > 0) velden.push({ label: 'Afstand', waarde: km + ' km', ic: '🚗', type: 'km' });
  }
  // PROJECTBOOM: wandel omhoog tot de ABSOLUTE top-parent (max 6 niveaus) → boom + chat hangen
  // altijd aan de top-level taak (niet aan een tussenliggende sub-parent).
  let tree = null; let topId = str(t.id);
  try {
    let rt = t;
    for (let g = 0; g < 6 && rt && str(rt.parent); g++) {
      const pr = await cu.get(env, `/task/${str(rt.parent)}?include_subtasks=true`);
      if (pr && pr.ok && pr.data) rt = pr.data; else break;
    }
    if (rt) {
      topId = str(rt.id);
      const kids = (Array.isArray(rt.subtasks) ? rt.subtasks : []).map((s) => ({ id: str(s.id), naam: str(s.name), status: statusMapper(s.status) }));
      tree = { root: { id: str(rt.id), naam: str(rt.name), status: statusMapper(rt.status) }, taken: kids };
    }
  } catch (e) { /* fail-soft: geen boom = geen linkernavigatie */ }
  // per-persoon time-estimate-verdeling (eigen KV-spiegel) → {assigneeId: uren}
  const est_split = {};
  try { const es = await env.KV.get('team:estsplit:' + taskId, 'json'); if (es && typeof es === 'object') for (const k of Object.keys(es)) est_split[k] = Math.round(Number(es[k]) / 3600000 * 100) / 100; } catch (e) { /* */ }
  return {
    status: 200,
    body: {
      ok: true,
      project: {
        id: str(t.id), naam: str(t.name),
        status: statusMapper(t.status), status_raw: str(t.status && t.status.status),
        discipline: disciplineOf(t), type_job_key: typeJobKey(t),
        bedrijf_id: bid, bedrijf: naamMap[bid] || '',
        brief: str(t.description || t.text_content || ''),
        deadline: due, deadline_ymd: due ? msToBrusselsYmd(due) : '',
        start_ymd: t.start_date ? msToBrusselsYmd(Number(t.start_date)) : '',
        assignees: buildSae(t),
        assignee_ids: (Array.isArray(t.assignees) ? t.assignees : []).map((a) => Number(a && a.id)).filter(Boolean),
        est_uren: t.time_estimate ? Math.round(Number(t.time_estimate) / 3600000 * 10) / 10 : 0,
        prioriteit: (t.priority && t.priority.priority) ? str(t.priority.priority) : '',
        parent: str(t.parent || ''), top_id: topId, url: str(t.url), lijst_id: listId,
        est_split,
      },
      bestanden,
      subtaken,
      statussen,
      contact,
      velden,
      tree,
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
  // ELKE geldige lijst-status mag (de dropdown toont enkel echte statussen; ClickUp valideert finaal).
  if (!status || status.length > 80) return { status: 400, body: { ok: false, error: 'bad_status' } };
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

// teamProjectChatPost: plaats een bericht, naar de klant (zichtbaar) of een
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
 * VERLOF / PAYROLL, zelf aanvragen + bekijken (zonder PM).
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
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const me = rr.me; const leden = rr.leden;
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
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const me = rr.me; const leden = rr.leden;
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
 * PAYROLL-MODULE — teamleden (contact + team-indeling + weekregime) en afwezigheid
 * (verlof/jeugdvakantie/ziekte/...) in D1 (CRMDB: team_members + leaves). De
 * teamleden komen uit ClickUp (eenmalige seed, daarna verrijkt Vincent ze) en zijn
 * de canonieke roster + de basis voor portaaltoegang (zachte poort). Goedgekeurde
 * afwezigheid verschijnt als hele-dag-event in de Google-agenda van het teamlid.
 * =========================================================================== */
const PAYROLL_TEAM_KEYS = ['management', 'uitvoerend', 'ai'];
const PAYROLL_REG_DEFAULT = { ma: 'full', di: 'full', wo: 'full', do: 'full', vr: 'full', za: 'off', zo: 'off' };
// Standaard team-indeling + functie bij de EERSTE seed; Vincent verfijnt nadien (re-seed overschrijft dit niet).
const PAYROLL_TEAM_DEFAULTS = {
  8714037: { teams: ['management'], functie: 'Zaakvoerder' },            // Vincent
  54513254: { teams: ['management'], functie: 'Zaakvoerder / Sales' },   // Arne
  82624365: { teams: ['management'], functie: 'Zaakvoerder' },           // Viktor
  8725564: { teams: ['management'], functie: 'Zaakvoerder' },            // Wout
  48338421: { teams: ['uitvoerend'], functie: 'Accountmanager' },        // Ilke
  82749837: { teams: ['uitvoerend'], functie: 'Adverteerder' },          // Johanna
  36517215: { teams: ['ai'], functie: 'Automations & support' },        // Klaas
  106597135: { teams: ['uitvoerend'], functie: '' },                     // Griet
  94564122: { teams: ['uitvoerend'], functie: '' },                      // Danique
  82518014: { teams: ['uitvoerend'], functie: 'Webdesign' },            // Anouk
  54339680: { teams: ['uitvoerend'], functie: 'Content & video' },      // Ines
  36583478: { teams: ['uitvoerend'], functie: 'Video' },                // Guus
  36583476: { teams: ['uitvoerend'], functie: 'Video' },                // Bjorn
};
function payrollTypeLabel(s) {
  const t = str(s).trim().toLowerCase();
  const hit = HR_TYPES.find((h) => h.label.toLowerCase() === t);
  return hit ? hit.label : (str(s).trim() || 'Afwezig');
}
function payrollMemberOut(row) {
  return Object.assign(memberRow(row), { clickup_member_id: str(row.clickup_member_id), active: !!row.active });
}

// Zachte login-poort: set met ClickUp-id's van teamleden die in Payroll op 'inactief' staan.
// KV-cache 120s; default leeg -> geen effect. payrollInvalidateDeny() wist de cache bij een wijziging.
const PAYROLL_DENY_CK = 'team:payroll:deny:v1';
async function payrollDenySet(env) {
  try { const hit = await env.KV.get(PAYROLL_DENY_CK, 'json'); if (hit && Array.isArray(hit.ids)) return new Set(hit.ids.map(Number)); } catch (e) { /* */ }
  let ids = [];
  try { const rows = await opsAll(env, "SELECT clickup_member_id FROM team_members WHERE active=0 AND clickup_member_id<>''"); ids = rows.map((r) => Number(r.clickup_member_id)).filter(Boolean); } catch (e) { ids = []; }
  try { await env.KV.put(PAYROLL_DENY_CK, JSON.stringify({ ids }), { expirationTtl: 120 }); } catch (e) { /* */ }
  return new Set(ids);
}
async function payrollInvalidateDeny(env) { try { await env.KV.delete(PAYROLL_DENY_CK); } catch (e) { /* */ } }

// Hele-dag-afwezigheid op de eigen Google-agenda van het teamlid (DWD). Geeft het event-id of '' terug.
async function payrollCalCreate(env, member, leave) {
  try {
    const email = agendaEmail({ id: Number(member.clickup_member_id) || 0, naam: member.naam, email: member.email });
    if (!email || !email.endsWith('@studio27.be')) return '';
    const vanYmd = msToBrusselsYmd(Number(leave.from_date) || 0);
    const totYmd = msToBrusselsYmd(Number(leave.to_date) || Number(leave.from_date) || 0);
    if (!vanYmd) return '';
    const endExcl = ymdPlus(totYmd || vanYmd, 1);   // Google: einddatum is exclusief bij hele-dag-events.
    const token = await mintGoogleToken(env, email, GCAL_SCOPE_EVENTS_HR);
    const ev = { summary: str(leave.type) + ' — afwezig', start: { date: vanYmd }, end: { date: endExcl }, transparency: 'opaque', visibility: 'private' };
    if (str(leave.reason).trim()) ev.description = str(leave.reason).trim().slice(0, 1000);
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(ev) });
    const data = await r.json().catch(() => null);
    return (r.ok && data && data.id) ? str(data.id) : '';
  } catch (e) { return ''; }
}
async function payrollCalDelete(env, member, eventId) {
  try {
    if (!eventId) return;
    const email = agendaEmail({ id: Number(member.clickup_member_id) || 0, naam: member.naam, email: member.email });
    if (!email || !email.endsWith('@studio27.be')) return;
    const token = await mintGoogleToken(env, email, GCAL_SCOPE_EVENTS_HR);
    await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(eventId), { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  } catch (e) { /* best-effort */ }
}

// Seed/sync: ClickUp-roster -> team_members. Idempotent. Bewaart Vincents handmatige aanvullingen
// (telefoon/woonplaats/team/weekregime/uren) bij re-runs; ververst enkel naam/email/koppeling + voegt nieuwe toe.
export async function opsPayrollSeedTeam(env, opts) {
  opts = opts || {};
  const leden = await ledenLijst(env);
  let created = 0, updated = 0, skipped = 0; const now = Date.now();
  for (const l of leden) {
    const cid = Number(l.id);
    if (EX_MEMBERS.has(cid) || STAGE_IDS.has(cid)) { skipped++; continue; }
    const id = 'tm_' + cid;
    const email = agendaEmail({ id: cid, naam: l.naam, email: l.email });
    const existing = await opsGet(env, 'team_members', id);
    if (existing) {
      // Bestaand lid: enkel de ClickUp-koppeling + timestamp herbevestigen. Naam/e-mail NIET overschrijven,
      // zodat Vincents handmatige aanpassingen (incl. team/weekregime/uren/telefoon) bewaard blijven.
      await opsUpsert(env, 'team_members', { id, clickup_member_id: String(cid), updated_at: now });
      updated++;
    } else {
      const def = PAYROLL_TEAM_DEFAULTS[cid] || { teams: ['uitvoerend'], functie: '' };
      await opsUpsert(env, 'team_members', {
        id, naam: str(l.naam), voornaam: str(l.naam).split(/\s+/)[0], email,
        phone: '', city: '', functie: def.functie || '', prole: '', role: roleOf(cid),
        teams: JSON.stringify(def.teams || ['uitvoerend']), personas: '[]', org: 'S27', color: '',
        week_hours: 40, reg: JSON.stringify(PAYROLL_REG_DEFAULT), verlof_hours: 160, jeugd_hours: 0, feest_hours: 80,
        active: 1, clickup_member_id: String(cid), created_at: now, updated_at: now,
      });
      created++;
    }
  }
  await payrollInvalidateDeny(env);
  return { ok: true, created, updated, skipped, total: created + updated };
}

// Import: ClickUp PAYROLL_LIST-taken -> D1 leaves. Idempotent op het ClickUp-taak-id (lv_ck_<id>).
// Ongekoppelde/ex-leden (niet in team_members) en taken zonder datum worden overgeslagen.
export async function opsPayrollImportLeaves(env, opts) {
  opts = opts || {};
  let tasks = [];
  try { tasks = await pageAll(env, (p) => `/list/${PAYROLL_LIST}/task?include_closed=true&subtasks=true&page=${p}`, 30); } catch (e) { tasks = []; }
  const members = await opsAll(env, "SELECT id, clickup_member_id FROM team_members WHERE clickup_member_id<>''");
  const byCk = new Map(members.map((m) => [String(m.clickup_member_id), String(m.id)]));
  let imported = 0, skipped = 0; const now = Date.now();
  for (const t of tasks) {
    const a = (Array.isArray(t.assignees) && t.assignees[0]) ? Number(t.assignees[0].id) : 0;
    const memberId = byCk.get(String(a)) || '';
    if (!memberId) { skipped++; continue; }
    const idx = parseInt(getCF(t, HR_FIELD), 10);
    const type = (idx >= 0 && HR_TYPES[idx]) ? HR_TYPES[idx].label : payrollTypeLabel(t.name);
    const s = Number(t.start_date) || Number(t.due_date) || 0;
    const d = Number(t.due_date) || s;
    if (!s) { skipped++; continue; }
    const statusNaam = str(t.status && t.status.status).toLowerCase();
    const status = statusNaam.includes('aanvraag') ? 'pending' : 'approved';
    const estMin = Math.round((Number(t.time_estimate) || 0) / 60000);   // ClickUp legt de echte (deel)uren in time_estimate
    const id = 'lv_ck_' + str(t.id);
    const exist = await opsGet(env, 'leaves', id);
    if (exist) {
      // Her-import: enkel de ClickUp-bronvelden verversen (incl. est_min). NOOIT status/approved_by/gcal_event_id/reason
      // overschrijven, anders verweest een via het portaal goedgekeurd agenda-event.
      await opsUpsert(env, 'leaves', { id, member_id: memberId, type, from_date: s, to_date: d, clickup_task_id: str(t.id), est_min: estMin });
    } else {
      await opsUpsert(env, 'leaves', {
        id, member_id: memberId, type, from_date: s, to_date: d, status,
        reason: '', requested_at: Number(t.date_created) || s, approved_by: status === 'approved' ? 'clickup' : '',
        clickup_task_id: str(t.id), gcal_event_id: '', est_min: estMin, created_at: now,
      });
    }
    imported++;
  }
  return { ok: true, imported, skipped, total: tasks.length };
}

// teamPayrollMembers: alle teamleden (incl. inactieve) met contact + team-indeling + weekregime + saldo-uren.
// Leesbaar voor elk staff-lid (canonieke roster, koppelbaar aan taken); enkel admin mag bewerken.
export async function teamPayrollMembers(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const rows = await opsAll(env, 'SELECT * FROM team_members ORDER BY naam ASC');
  return { status: 200, body: { ok: true, members: rows.map(payrollMemberOut), teams: PAYROLL_TEAM_KEYS, can_edit: !!(rr.perms && rr.perms.admin), me_id: 'tm_' + rr.me.id } };
}

// teamPayrollMemberSave: één teamlid bijwerken (admin). Velden zijn optioneel — enkel meegegeven velden wijzigen.
export async function teamPayrollMemberSave(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'admin'); if (deny) return deny;
  const id = str(body.id).trim(); if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  const existing = await opsGet(env, 'team_members', id); if (!existing) return { status: 404, body: { ok: false, error: 'not_found' } };
  const patch = { id, updated_at: Date.now() };
  if ('naam' in body) patch.naam = str(body.naam).slice(0, 80);
  if ('email' in body) patch.email = str(body.email).trim().toLowerCase().slice(0, 120);
  if ('phone' in body) patch.phone = str(body.phone).slice(0, 40);
  if ('city' in body) patch.city = str(body.city).slice(0, 80);
  if ('functie' in body) patch.functie = str(body.functie).slice(0, 80);
  if ('role' in body && ['admin', 'sales', 'accountmanager', 'team'].includes(str(body.role))) patch.role = str(body.role);
  if (Array.isArray(body.teams)) patch.teams = JSON.stringify(body.teams.map(str).filter((t) => PAYROLL_TEAM_KEYS.includes(t)).slice(0, 3));
  if (body.reg && typeof body.reg === 'object') { const r = {}; ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].forEach((dd) => { const v = str(body.reg[dd]); r[dd] = (v === 'full' || v === 'half') ? v : 'off'; }); patch.reg = JSON.stringify(r); }
  if ('week_hours' in body) patch.week_hours = Math.max(0, Math.min(80, Number(body.week_hours) || 0));
  if ('verlof_hours' in body) patch.verlof_hours = Math.max(0, Math.min(2000, Number(body.verlof_hours) || 0));
  if ('jeugd_hours' in body) patch.jeugd_hours = Math.max(0, Math.min(2000, Number(body.jeugd_hours) || 0));
  if ('feest_hours' in body) patch.feest_hours = Math.max(0, Math.min(2000, Number(body.feest_hours) || 0));
  if ('active' in body) patch.active = body.active ? 1 : 0;
  await opsUpsert(env, 'team_members', patch);
  if ('active' in body) await payrollInvalidateDeny(env);
  const updated = await opsGet(env, 'team_members', id);
  return { status: 200, body: { ok: true, member: payrollMemberOut(updated) } };
}

// teamPayrollLeaves: alle afwezigheid (kalender + aanvragen), met naam van het teamlid erbij.
export async function teamPayrollLeaves(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const rows = await opsAll(env, 'SELECT l.*, m.naam AS member_naam FROM leaves l LEFT JOIN team_members m ON m.id=l.member_id ORDER BY l.from_date DESC');
  const leaves = rows.map((r) => ({
    id: str(r.id), member_id: str(r.member_id), member_naam: str(r.member_naam), type: str(r.type),
    from_date: r.from_date == null ? null : Number(r.from_date), to_date: r.to_date == null ? null : Number(r.to_date),
    from_ymd: r.from_date ? msToBrusselsYmd(Number(r.from_date)) : '', to_ymd: r.to_date ? msToBrusselsYmd(Number(r.to_date)) : '',
    status: str(r.status), reason: str(r.reason), requested_at: r.requested_at == null ? null : Number(r.requested_at), approved_by: str(r.approved_by),
    est_min: Number(r.est_min) || 0,
  }));
  return { status: 200, body: { ok: true, leaves, types: HR_TYPES.map((h) => h.label) } };
}

// teamPayrollLeaveCreate: afwezigheid invoeren (admin). status 'approved' (direct) of 'pending' (aanvraag).
// Bij 'approved' meteen een hele-dag-event in de agenda van het teamlid.
export async function teamPayrollLeaveCreate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'admin'); if (deny) return deny;
  const memberId = str(body.member_id).trim();
  const member = memberId ? await opsGet(env, 'team_members', memberId) : null;
  if (!member) return { status: 400, body: { ok: false, error: 'no_member' } };
  const type = payrollTypeLabel(body.type);
  const vanYmd = str(body.van); const totYmd = str(body.tot) || vanYmd;
  const vanMs = brusselsWallToMs(vanYmd, '00:00'); const totMs = brusselsWallToMs(totYmd, '00:00');
  if (!vanMs || !totMs || totMs < vanMs) return { status: 400, body: { ok: false, error: 'bad_dates' } };
  const status = str(body.status) === 'pending' ? 'pending' : 'approved';
  const id = newId('lv');
  const m = payrollMemberOut(member);
  const estMin = Number(body.uren) > 0 ? Math.round(Number(body.uren) * 60) : 0;   // optioneel: deeluren (bv. halve dag = 4u); leeg = volledige dag(en) via regime
  let gcal = '';
  if (status === 'approved') gcal = await payrollCalCreate(env, m, { type, from_date: vanMs, to_date: totMs, reason: str(body.reason) });
  await opsUpsert(env, 'leaves', {
    id, member_id: memberId, type, from_date: vanMs, to_date: totMs, status,
    reason: str(body.reason).slice(0, 500), requested_at: Date.now(), approved_by: status === 'approved' ? str(rr.me.id) : '',
    clickup_task_id: '', gcal_event_id: gcal, est_min: estMin, created_at: Date.now(),
  });
  return { status: 200, body: { ok: true, id, gcal: !!gcal } };
}

// teamPayrollLeaveDecide: aanvraag goedkeuren of afwijzen (admin). Goedkeuren = agenda-event aanmaken.
export async function teamPayrollLeaveDecide(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'admin'); if (deny) return deny;
  const id = str(body.id).trim(); const decision = str(body.decision);
  if (!id || ['approve', 'reject'].indexOf(decision) < 0) return { status: 400, body: { ok: false, error: 'bad_input' } };
  const row = await opsGet(env, 'leaves', id); if (!row) return { status: 404, body: { ok: false, error: 'not_found' } };
  const member = await opsGet(env, 'team_members', str(row.member_id));
  const m = member ? payrollMemberOut(member) : null;
  if (decision === 'approve') {
    let gcal = str(row.gcal_event_id);
    if (!gcal && m) gcal = await payrollCalCreate(env, m, leaveRow(row));
    await opsUpsert(env, 'leaves', { id, status: 'approved', approved_by: str(rr.me.id), gcal_event_id: gcal });
    return { status: 200, body: { ok: true, gcal: !!gcal } };
  }
  if (m && row.gcal_event_id) await payrollCalDelete(env, m, str(row.gcal_event_id));
  await opsUpsert(env, 'leaves', { id, status: 'rejected', gcal_event_id: '' });
  return { status: 200, body: { ok: true } };
}

// teamPayrollLeaveDelete: afwezigheid verwijderen (admin) + bijhorend agenda-event opruimen.
export async function teamPayrollLeaveDelete(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'admin'); if (deny) return deny;
  const id = str(body.id).trim(); if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  const row = await opsGet(env, 'leaves', id); if (!row) return { status: 200, body: { ok: true } };
  if (row.gcal_event_id) { const member = await opsGet(env, 'team_members', str(row.member_id)); if (member) await payrollCalDelete(env, payrollMemberOut(member), str(row.gcal_event_id)); }
  await opsDel(env, 'leaves', id);
  return { status: 200, body: { ok: true } };
}

/* ===========================================================================
 * ACCOUNTMANAGER (Ilke), alle lopende projecten per klant in één oogopslag.
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
 * DIRECTIE (Vincent admin / Arne sales), financieel.
 * Offertes = SUM(Budget) per maand op due_date (UITGEBRACHT, geen won/lost-veld).
 * Omzet per categorie = SUM(taakbudget) per TYPE JOB. Omzet per persoon (admin) =
 * taakbudget / #assignees. Budget ~40% gevuld → indicatief, eerlijk gelabeld.
 * =========================================================================== */
const FIN_CK = 'team:finance:v8';   // v8 = uurtarief = omzet ÷ ÁLLE klantenuren (ook 0-euro taken), op aggregaat-niveau
// computeFinance: de zware scan (offertes + planningstaken-budget). MEMORY-SAFE: aggregeert
// PER PAGINA en gooit de dikke taakobjecten meteen weg (nooit fat-arrays vasthouden) +
// begrensde concurrency (max 2 lijsten tegelijk) → geen OOM. try/finally → lock altijd vrij.
// Draait op de ACHTERGROND (cron + ctx.waitUntil); klein resultaat → KV (7d).
export async function computeFinance(env) {
  try { if (await env.KV.get('team:finance:lock')) return null; await env.KV.put('team:finance:lock', '1', { expirationTtl: 180 }); } catch (e) { /* */ }
  try {
    await ensureTjMap(env);   // warm de orderindex->UUID-fallbackcache voor catOf (list-reads dragen type_config meestal zelf)
    const leden = await ledenLijst(env);
    // Scan een lijst met PARALLELLE pagina-batches en aggregeer inline via onTask (geen fat-array
    // vasthouden = geheugen-veilig; batches = snel genoeg voor cron + live-waitUntil).
    const scanList = async (id, q, onTask, maxPages, batch) => {
      let base = 0, done = false;
      while (!done && base < maxPages) {
        const ps = []; for (let i = 0; i < batch && base + i < maxPages; i++) ps.push(base + i);
        const ress = await Promise.all(ps.map((p) => cu.get(env, `/list/${id}/task?${q}&page=${p}`).catch(() => ({ ok: false }))));
        let full = 0;
        for (const r of ress) {
          const tasks = (r && r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : [];
          if (tasks.length >= 100) full++;
          if (r && r.ok && r.data && r.data.last_page === true) done = true;
          for (const t of tasks) onTask(t);
        }
        if (full < ps.length) done = true;   // een niet-volle pagina = de laatste
        base += batch;
      }
    };
    // ── OFFERTES (alle 4 ondernemingen, per offerte-lijst getagd) ──
    let offTotaal = 0, offZonder = 0, offAantal = 0; const maand = {}; const offCountM = {}; const offZonderM = {}; let top = []; const offOrg = {}; const offIssuerM = {};
    for (const [olid, oorg] of OFFERTE_LISTS) {
      await scanList(olid, 'include_closed=true&subtasks=false', (t) => {
        offAantal++;
        const mk = monthOf(t.due_date); if (mk) offCountM[mk] = (offCountM[mk] || 0) + 1;
        const b = num(getCF(t, BUDGET_FIELD));
        // uitbrenger = de toegewezene (Arne / Vincent / Overig) → productiviteit per persoon
        const as = (Array.isArray(t.assignees) ? t.assignees : []).map((a) => Number(a && a.id));
        const issuer = as.indexOf(54513254) >= 0 ? 'Arne' : (as.indexOf(8714037) >= 0 ? 'Vincent' : 'Overig');
        if (mk) { const o = (offIssuerM[mk] || (offIssuerM[mk] = {})); const e = (o[issuer] || (o[issuer] = { n: 0, eur: 0 })); e.n++; if (b > 0) e.eur += b; }
        if (b <= 0) { offZonder++; if (mk) offZonderM[mk] = (offZonderM[mk] || 0) + 1; return; }
        offTotaal += b; offOrg[oorg] = (offOrg[oorg] || 0) + b;
        if (mk) maand[mk] = (maand[mk] || 0) + b;
        top.push({ naam: (str(getCF(t, OFFERTE_NAAM)) || str(t.name)).slice(0, 80), bedrag: Math.round(b), maand: mk, onderneming: oorg });
        if (top.length > 200) { top.sort((a, b) => b.bedrag - a.bedrag); top = top.slice(0, 40); }
      }, 40, 6);
    }
    top.sort((a, b) => b.bedrag - a.bedrag);
    // ── PLANNINGSBUDGET: 3 lijsten tegelijk, pagina's per lijst in batches van 5 ──
    const cat = {}; const persoon = {}; const catM = {}; const persM = {}; const orgTot = {}; const orgM = {}; let planTotaal = 0, planGevuld = 0, planTotaalTaken = 0;
    const catUur = {}; const persUur = {}; const catUurM = {}; const persUurM = {};   // ÁLLE klantenuren (ook 0-euro feedback/meetings) per tak/persoon, per maand → noemer van het uurtarief
    let internBud = 0, internUur = 0;   // intern werk (klant = eigen merk) apart bijgehouden
    const onPlan = (t) => {
      planTotaalTaken++;
      const b = num(getCF(t, BUDGET_FIELD));
      const hrs = (Number(t.time_estimate) || 0) / 3600000;
      const bid = (getRelationIds(t, FIELD.bedrijf)[0]) || '';
      if (INTERN_CLIENTS.has(bid)) { if (b > 0) internBud += b; internUur += hrs; return; }   // intern werk = geen externe omzet
      const c = catOf(t); const og = orgOf(t); const mk = monthOf(t.due_date);   // maand-bucket (op deadline)
      // UREN: élke klantentaak met uren telt mee voor het uurtarief, ook 0-euro feedback/meetings (= gepresteerde uren)
      if (hrs > 0) {
        catUur[c] = (catUur[c] || 0) + hrs;
        if (mk) (catUurM[mk] || (catUurM[mk] = {}))[c] = (catUurM[mk][c] || 0) + hrs;
      }
      // OMZET: enkel taken met budget
      if (b > 0) {
        planGevuld++; planTotaal += b;
        cat[c] = (cat[c] || 0) + b;
        orgTot[og] = (orgTot[og] || 0) + b;
        if (mk) { (catM[mk] || (catM[mk] = {}))[c] = (catM[mk][c] || 0) + b; (orgM[mk] || (orgM[mk] = {}))[og] = (orgM[mk][og] || 0) + b; }
      }
      const as = (Array.isArray(t.assignees) ? t.assignees : []).filter((a) => a && a.id);
      if (as.length) {
        const hShare = hrs / as.length, share = b / as.length;
        for (const a of as) {
          const k = Number(a.id); if (PERS_HIDE.has(k)) continue;
          if (hrs > 0) { persUur[k] = (persUur[k] || 0) + hShare; if (mk) (persUurM[mk] || (persUurM[mk] = {}))[k] = (persUurM[mk][k] || 0) + hShare; }
          if (b > 0) { persoon[k] = (persoon[k] || 0) + share; if (mk) (persM[mk] || (persM[mk] = {}))[k] = (persM[mk][k] || 0) + share; }
        }
      }
    };
    const queue = DISCIPLINE_LISTS.slice();
    await Promise.all([0, 1, 2].map(async () => { while (queue.length) { const id = queue.shift(); if (id != null) await scanList(id, 'include_closed=true&subtasks=true', onPlan, 20, 5); } }));
    const naamById = new Map(leden.map((l) => [Number(l.id), l.naam]));
    // ── maand-evolutie-series (laatste 12 maanden, op deadline) ──
    const months = last12Months();
    const catNames = Object.keys(cat).sort((a, b) => cat[b] - cat[a]);
    const categorie_maand = { labels: months, series: catNames.map((cn) => ({ naam: cn, data: months.map((m) => Math.round((catM[m] && catM[m][cn]) || 0)) })) };
    const persSorted = Object.keys(persoon).sort((a, b) => persoon[b] - persoon[a]);
    const topIds = persSorted.slice(0, 8);
    const persoon_maand = { labels: months, series: topIds.map((id) => ({ naam: naamById.get(Number(id)) || ('#' + id), data: months.map((m) => Math.round((persM[m] && persM[m][id]) || 0)) })) };
    if (persSorted.length > 8) { persoon_maand.series.push({ naam: 'Overig', data: months.map((m) => { let s = 0; for (const id of persSorted.slice(8)) s += (persM[m] && persM[m][id]) || 0; return Math.round(s); }) }); }
    // ── DATA-KUBUS (48 maanden: jaar-2 t/m jaar+1) → frontend filtert client-side op elke periode ──
    const curY = parseInt(msToBrusselsYmd(Date.now()).slice(0, 4), 10) || 2026;
    const cubeMonths = [];
    for (let y = curY - 2; y <= curY + 1; y++) for (let mm = 1; mm <= 12; mm++) cubeMonths.push(y + '-' + String(mm).padStart(2, '0'));
    const cube = { maanden: cubeMonths, offMaand: {}, offCountMaand: {}, offZonderMaand: {}, catMaand: {}, catUurMaand: {}, persMaand: {}, persUurMaand: {}, persNaam: {}, orgMaand: {}, offIssuerMaand: {} };
    for (const m of cubeMonths) {
      if (maand[m]) cube.offMaand[m] = Math.round(maand[m]);
      if (offCountM[m]) cube.offCountMaand[m] = offCountM[m];
      if (offZonderM[m]) cube.offZonderMaand[m] = offZonderM[m];
      if (catM[m]) { const o = {}; for (const c in catM[m]) o[c] = Math.round(catM[m][c]); cube.catMaand[m] = o; }
      if (catUurM[m]) { const o = {}; for (const c in catUurM[m]) o[c] = Math.round(catUurM[m][c] * 10) / 10; cube.catUurMaand[m] = o; }
      if (orgM[m]) { const o = {}; for (const k in orgM[m]) o[k] = Math.round(orgM[m][k]); cube.orgMaand[m] = o; }
      if (offIssuerM[m]) { const o = {}; for (const k in offIssuerM[m]) o[k] = { n: offIssuerM[m][k].n, eur: Math.round(offIssuerM[m][k].eur) }; cube.offIssuerMaand[m] = o; }
      if (persM[m]) { const o = {}; for (const id in persM[m]) { o[id] = Math.round(persM[m][id]); if (!cube.persNaam[id]) cube.persNaam[id] = naamById.get(Number(id)) || ('#' + id); } cube.persMaand[m] = o; }
      if (persUurM[m]) { const o = {}; for (const id in persUurM[m]) o[id] = Math.round(persUurM[m][id] * 10) / 10; cube.persUurMaand[m] = o; }
    }
    const out = {
      ok: true, gegenereerd: Date.now(),
      offertes: { totaal: Math.round(offTotaal), aantal: offAantal, zonder_bedrag: offZonder, maand: months.map((mk) => ({ maand: mk, bedrag: Math.round(maand[mk] || 0) })), top: top.slice(0, 8), per_onderneming: ORG_ORDER.filter((o) => offOrg[o]).map((o) => ({ onderneming: o, bedrag: Math.round(offOrg[o]) })) },
      categorie: Object.keys(cat).map((k) => ({ categorie: k, bedrag: Math.round(cat[k]) })).sort((a, b) => b.bedrag - a.bedrag),
      categorie_maand, persoon_maand, cube,
      plan_totaal: Math.round(planTotaal), plan_vulgraad: planTotaalTaken ? Math.round(planGevuld / planTotaalTaken * 100) : 0,
      per_persoon: Object.keys(persoon).map((id) => ({ id: Number(id), naam: naamById.get(Number(id)) || ('#' + id), bedrag: Math.round(persoon[id]) })).sort((a, b) => b.bedrag - a.bedrag),
      per_onderneming: ORG_ORDER.filter((o) => orgTot[o]).map((o) => ({ onderneming: o, bedrag: Math.round(orgTot[o]) })),
      tarief_target: UURTARIEF_TARGET,
      intern: { budget: Math.round(internBud), uren: Math.round(internUur) },
      disclaimer: 'Offertebedragen = UITGEBRACHT (ClickUp heeft nog geen won/verloren-veld). Omzet uit ingevuld taakbudget (±40% gevuld); uurtarief = omzet ÷ ÁLLE gepresteerde klantenuren (incl. 0-euro feedback/meetings), berekend op aggregaat-niveau. INDICATIEF, geen sluitende boekhouding. Intern werk (klant = Studio 27 of 27 Automations) is uit omzet/uurtarief gefilterd.',
    };
    try { await env.KV.put(FIN_CK, JSON.stringify({ _t: Date.now(), body: out }), { expirationTtl: 7 * 24 * 3600 }); } catch (e) { /* */ }
    return out;
  } catch (e) {
    return null;
  } finally {
    try { await env.KV.delete('team:finance:lock'); } catch (e) { /* */ }
  }
}
export async function teamFinance(_b, body, env, ctx) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  const mask = (b) => {
    if (rr.perms.finance_full) return b;   // Vincent = volledig; anders alle per-persoon-data eruit
    const c = Object.assign({}, b, { per_persoon: null, persoon_maand: null });
    if (b && b.cube) c.cube = Object.assign({}, b.cube, { persMaand: {}, persUurMaand: {}, persNaam: {} });
    return c;
  };
  let hit = null;
  try { hit = await env.KV.get(FIN_CK, 'json'); } catch (e) { /* miss */ }
  const bg = () => { try { if (ctx && ctx.waitUntil) ctx.waitUntil(computeFinance(env)); else computeFinance(env); } catch (e) { /* */ } };
  if (hit && hit.body) {
    if (!hit._t || (Date.now() - hit._t) > 60 * 60 * 1000) bg();   // ouder dan 1u → stil verversen
    return { status: 200, body: mask(Object.assign({}, hit.body, { gegenereerd: hit._t || 0 })) };
  }
  bg();
  return { status: 200, body: mask({ ok: true, computing: true, offertes: { totaal: 0, aantal: 0, zonder_bedrag: 0, maand: [], top: [] }, categorie: [], plan_totaal: 0, plan_vulgraad: 0, per_persoon: [], disclaimer: 'De cijfers worden voor de eerste keer berekend (even geduld, ±1 min). Dit scherm ververst automatisch.' }) };
}

/* ---- PROJECTRENDEMENT: €/u per LOPEND project (budget ÷ geplande uren) ----- */
const REND_CK = 'team:rendement:v2';   // v2 = + per-project maanden + actief (periode-filter/-vergelijking)
export async function computeRendement(env) {
  try { const lock = await env.KV.get('team:rendement:lock'); if (lock) return null; await env.KV.put('team:rendement:lock', '1', { expirationTtl: 180 }); } catch (e) { /* */ }
  try {
    const naamMap = await bedrijvenNaamMap(env);
    const proj = new Map();   // top-level-project-id -> aggregaat
    const onTask = (t) => {
      const key = str(t.top_level_parent || t.parent || t.id);
      let p = proj.get(key);
      if (!p) { p = { id: key, naam: '', bedrijf_id: '', budget: 0, uren: 0, actief: false, maanden: new Set() }; proj.set(key, p); }
      const b = num(getCF(t, BUDGET_FIELD)); if (b > 0) p.budget += b;
      const hrs = (Number(t.time_estimate) || 0) / 3600000; if (hrs > 0) p.uren += hrs;
      const mk = monthOf(t.due_date); if (mk) p.maanden.add(mk);   // periode-bucket (deadline) voor kwartaalfilter/-vergelijking
      if (!isDoneTask(t)) p.actief = true;
      const bid = (getRelationIds(t, FIELD.bedrijf)[0]) || ''; if (bid && !p.bedrijf_id) p.bedrijf_id = bid;
      if (str(t.id) === key) p.naam = str(t.name);   // de top-level-taak levert de projectnaam
    };
    const fetchList = async (id) => {
      let base = 0, done = false;
      while (!done && base < 20) {
        const ps = []; for (let i = 0; i < 5 && base + i < 20; i++) ps.push(base + i);
        const ress = await Promise.all(ps.map((p) => cu.get(env, `/list/${id}/task?include_closed=true&subtasks=true&page=${p}`).catch(() => ({ ok: false }))));
        let full = 0;
        for (const r of ress) {
          const tasks = (r && r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : [];
          if (tasks.length >= 100) full++;
          if (r && r.ok && r.data && r.data.last_page === true) done = true;
          for (const t of tasks) onTask(t);
        }
        if (full < ps.length) done = true;
        base += 5;
      }
    };
    const queue = DISCIPLINE_LISTS.slice();
    await Promise.all([0, 1, 2].map(async () => { while (queue.length) { const id = queue.shift(); if (id != null) await fetchList(id); } }));
    // namen ophalen voor projecten waarvan de top-level-taak niet in de gescande set zat (cap 60)
    const missing = [...proj.values()].filter((p) => !p.naam).slice(0, 60);
    if (missing.length) {
      const resolved = await Promise.all(missing.map((p) => cu.get(env, `/task/${p.id}`).then((r) => [p.id, (r.ok && r.data) ? r.data : null]).catch(() => [p.id, null])));
      for (const [id, data] of resolved) { const p = proj.get(id); if (p && data) { p.naam = str(data.name); const bid = (getRelationIds(data, FIELD.bedrijf)[0]) || ''; if (bid && !p.bedrijf_id) p.bedrijf_id = bid; } }
    }
    const target = UURTARIEF_TARGET;
    // cutoff = 18 maanden terug → recent-afgewerkte projecten blijven erbij voor periode/kwartaalvergelijking
    const nuYM = msToBrusselsYmd(Date.now()).slice(0, 7); let _cy = Number(nuYM.slice(0, 4)), _cm = Number(nuYM.slice(5, 7)) - 18; while (_cm <= 0) { _cm += 12; _cy--; } const cutoff = _cy + '-' + String(_cm).padStart(2, '0');
    const projecten = [...proj.values()]
      .filter((p) => p.budget > 0 && p.uren >= 1 && !INTERN_CLIENTS.has(p.bedrijf_id))   // beprijsd, extern; ≥1u zodat bijna-nul-uren (data-fouten) geen absurd tarief geven
      .filter((p) => p.actief || (([...p.maanden].sort().pop()) || '9999-99') >= cutoff)   // lopend OF recent afgewerkt (≤18 mnd)
      .map((p) => {
        const tarief = Math.round(p.budget / p.uren);
        const tier = tarief < (target - 15) ? 'rood' : tarief < target ? 'geel' : 'groen';   // <70 / 70-84 / ≥85
        return { id: p.id, naam: p.naam || '(naamloos project)', bedrijf: naamMap[p.bedrijf_id] || '', budget: Math.round(p.budget), uren: Math.round(p.uren * 10) / 10, tarief, tier, actief: !!p.actief, maanden: [...p.maanden].sort() };
      })
      .sort((a, b) => a.tarief - b.tarief);   // laagste tarief eerst = meest urgent
    const actief = projecten.filter((p) => p.actief);   // standaard-samenvatting = lopende projecten
    const onder = actief.filter((p) => p.tarief < target).length;
    const totBud = actief.reduce((s, p) => s + p.budget, 0), totUur = actief.reduce((s, p) => s + p.uren, 0);
    const out = {
      ok: true, gegenereerd: Date.now(), target, aantal: actief.length, onder_target: onder,
      gemiddeld_tarief: totUur ? Math.round(totBud / totUur) : 0, projecten,
      disclaimer: 'Uurtarief = totaal projectbudget ÷ ÁLLE geplande uren van het project (incl. 0-euro feedback/meetings, ook gepresteerde uren), op projectniveau. INDICATIEF: budget ±40% / uren ±80% ingevuld; geplande uren ≠ exact gepresteerde uren (geen tijdregistratie). Projecten zonder budget of onder 1u vallen weg. Periodefilter = projecten met werk (deadline) in die periode; recent-afgewerkte projecten (≤18 mnd) blijven beschikbaar voor vergelijking.',
    };
    try { await env.KV.put(REND_CK, JSON.stringify({ _t: Date.now(), body: out }), { expirationTtl: 7 * 24 * 3600 }); } catch (e) { /* */ }
    return out;
  } catch (e) {
    return null;
  } finally {
    try { await env.KV.delete('team:rendement:lock'); } catch (e) { /* */ }
  }
}
export async function teamRendement(_b, body, env, ctx) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  let hit = null;
  try { hit = await env.KV.get(REND_CK, 'json'); } catch (e) { /* */ }
  const bg = () => { try { if (ctx && ctx.waitUntil) ctx.waitUntil(computeRendement(env)); else computeRendement(env); } catch (e) { /* */ } };
  if (hit && hit.body) {
    if (!hit._t || (Date.now() - hit._t) > 60 * 60 * 1000) bg();   // ouder dan 1u → stil verversen
    return { status: 200, body: Object.assign({}, hit.body, { gegenereerd: hit._t || 0 }) };
  }
  bg();
  return { status: 200, body: { ok: true, computing: true, target: UURTARIEF_TARGET, aantal: 0, onder_target: 0, projecten: [] } };
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
  return { status: 200, body: { ok: true, week: { van: w.monYmd, tot: w.sunYmd }, target: TARGET, leden, disclaimer: 'INGEPLANDE uren (time_estimate van taken met deadline deze week, gedeeld over de assignees). ClickUp-tijdregistratie is niet actief, dit zijn dus geplande, geen gepresteerde uren.' } };
}

/* ===========================================================================
 * VOLLEDIGE CLICKUP-SYNC, elk teamlid mag bewerken: assignees wisselen, uren,
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
 * FEATURE REQUESTS, eigen ClickUp-lijst (901523887267), met portaal-aanduiding
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
  // 'Nieuwe AI-knop'-aanvraag → óók een KV-concept (actief:false, review-slot) gekoppeld aan het type job.
  let ai_concept = false;
  if (str(body.soort) === 'ai-knop') {
    try {
      const items = await readAiKvItems(env);
      const key = aiGenKey(titel || omschrijving.slice(0, 40), AI_CORE_KEYS.concat(items.map((x) => str(x.key))));
      const disc = str(body.type_job || '').slice(0, 40);
      items.push({ key, label: (titel || omschrijving.slice(0, 60)), ic: '✨', sys: (omschrijving || titel || 'Beschrijf wat deze AI-knop moet doen.'), input: false, lbl: '', max: 900, scope: disc ? [disc] : 'algemeen', vis: { roles: [], members: [] }, bron: 'kv', actief: false, volgorde: 50, aangevraagd_door: me ? me.naam : email });
      ai_concept = await saveAiKvItems(env, items);
    } catch (e) { /* fail-soft: de feature-taak staat er al */ }
  }
  return { status: 200, body: { ok: true, id: str(created.data.id), portalen: PORTALEN, ai_concept } };
}

/* ===========================================================================
 * THUISWERKDAGEN, een teamlid markeert een dag als thuiswerk rechtstreeks in de
 * planner. Dat maakt een all-day "Thuiswerk"-event (opaque) op zijn Google-agenda:
 * (1) zichtbaar in Google Calendar (sync), (2) zichtbaar in de planner-agenda,
 * (3) geblokkeerd in de meeting-beschikbaarheid (freeBusy ziet het als bezet).
 * Het event-id wordt in KV bewaard zodat ontmarkeren het juiste event verwijdert.
 * =========================================================================== */
// LET OP: de domain-wide-delegation-config van dit SA staat ENKEL de brede scope
// '.../auth/calendar' toe, de granulaire calendar.events geeft 'unauthorized_client'
// (live geverifieerd, zie handlers.mjs). Daarom de brede scope, net als free/busy + meeting-create.
const GCAL_SCOPE_EVENTS_HR = 'https://www.googleapis.com/auth/calendar';
export async function teamThuiswerk(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const me = rr.me;
  const email = agendaEmail(me);
  if (!email) return { status: 200, body: { ok: false, error: 'geen_agenda', message: 'Geen gekoppelde agenda voor dit teamlid.' } };
  const date = str(body.date).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: 400, body: { ok: false, error: 'bad_date' } };
  const on = body.on !== false;
  const kvKey = 'team:wfh:' + me.id + ':' + date;
  let token;
  try { token = await mintGoogleToken(env, email, GCAL_SCOPE_EVENTS_HR); } catch (e) { return { status: 200, body: { ok: false, error: 'no_token' } }; }
  if (on) {
    let existing = null; try { existing = await env.KV.get(kvKey); } catch (e) { /* */ }
    if (existing) return { status: 200, body: { ok: true, on: true, event_id: existing } };
    const nx = new Date(date + 'T00:00:00Z'); nx.setUTCDate(nx.getUTCDate() + 1);
    const ev = { summary: '🏠 Thuiswerk', start: { date }, end: { date: nx.toISOString().slice(0, 10) }, transparency: 'opaque', description: 'Thuiswerkdag, ingepland via het teamportaal. Geen meetings op kantoor.' };
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(ev) });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || !d.id) return { status: 200, body: { ok: false, error: 'create_failed', detail: str(d && d.error && d.error.message) } };
    try { await env.KV.put(kvKey, str(d.id), { expirationTtl: 400 * 24 * 3600 }); } catch (e) { /* */ }
    return { status: 200, body: { ok: true, on: true, event_id: str(d.id) } };
  }
  let eid = null; try { eid = await env.KV.get(kvKey); } catch (e) { /* */ }
  if (eid) {
    try { await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(eid), { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }); } catch (e) { /* */ }
    try { await env.KV.delete(kvKey); } catch (e) { /* */ }
  }
  return { status: 200, body: { ok: true, on: false } };
}

/* ===========================================================================
 * AI-DAGPLANNING. Claude stelt op basis van de open taken (deadline + geschatte
 * tijd) een logische dag-/weekindeling voor. Verzint niets buiten de takenlijst.
 * =========================================================================== */
// AI-dagplan per teamlid, herbruikbaar door de on-demand handler ÉN de 05:00-cron.
// Resultaat → KV (team:aiplan:<id>:<ymd>, 36u) zodat de ingelogde gebruiker zijn
// verse dagplan INSTANT op Home ziet. De AI plant rond de echte agenda-afspraken.
const aiPlanKey = (id) => 'team:aiplan:' + Number(id) + ':' + msToBrusselsYmd(Date.now());
async function computeAiPlanFor(env, member) {
  const [raw, naamMap] = await Promise.all([tasksForMember(env, member.id), bedrijvenNaamMap(env)]);
  const taken = raw.filter((t) => !isDoneTask(t)).map((t) => shapeTask(t, naamMap));
  const today = msToBrusselsYmd(Date.now());
  const wh = await getWorkhours(env, member.id);
  let body;
  if (!taken.length) {
    body = { ok: true, plan: 'Je hebt momenteel geen openstaande taken. 🎉', aantal: 0, gegenereerd: Date.now() };
  } else {
    const laat = (t) => (t.due_ymd && t.due_ymd < today) ? 0 : 1;
    const sorted = taken.slice().sort((a, b) => (laat(a) - laat(b)) || ((a.due || Infinity) - (b.due || Infinity)));
    const lines = sorted.slice(0, 35).map((t, i) => {
      const uren = t.est ? (Math.round(t.est / 3600000 * 10) / 10) + 'u' : '? u';
      const dl = t.due_ymd ? (t.due_ymd < today ? ('TE LAAT (deadline ' + t.due_ymd + ')') : ('deadline ' + t.due_ymd)) : 'geen deadline';
      return (i + 1) + '. ' + t.naam + ', klant ' + (t.bedrijf || 'intern') + ', ' + (t.discipline || 'overig') + ', ' + dl + ', geschat ' + uren + ', status ' + t.status.label;
    });
    // Vaste agenda-afspraken (Google) vandaag+morgen → AI moet eromheen plannen.
    let agendaTxt = '';
    try {
      const email = agendaEmail(member);
      if (email) {
        const van = brusselsWallToMs(today, '00:00'); const tot = van + 2 * 86400000;
        const evs = await gcalEventsForHost(env, email, van, tot);
        const items = [];
        for (const ev of (evs || [])) {
          if (isClickupSyncEvent(ev)) continue;
          const iv = gcalEventToInterval(ev); if (!iv) continue;
          const allday = !!(ev.start && ev.start.date && !ev.start.dateTime);
          const dag = msToBrusselsYmd(iv[0]) === today ? 'vandaag' : 'morgen';
          items.push('- ' + (allday ? (dag + ' (hele dag)') : (dag + ' ' + msToBrusselsHm(iv[0]) + '-' + msToBrusselsHm(iv[1]))) + ': ' + (str(ev.summary) || 'Afspraak'));
        }
        if (items.length) agendaTxt = '\n\nVaste afspraken in de agenda (hou deze tijdsloten VRIJ, plan eromheen):\n' + items.join('\n');
      }
    } catch (e) { /* fail-soft: geen agenda = enkel op taken plannen */ }
    // Werkuren + werkdagen van dit teamlid (uit het instellingenscherm) → AI plant hierbinnen.
    const NL_DAG = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
    const dow = (ymd) => new Date(ymd + 'T12:00:00Z').getUTCDay();
    const morgen = ymdPlus(today, 1);
    const dagInfo = [['Vandaag', today], ['Morgen', morgen]].map(([lbl, d]) => {
      const wd = dow(d);
      if (wh.werkdagen.indexOf(wd) < 0) return '- ' + lbl + ' (' + d + ') is GEEN werkdag voor dit teamlid, plan hier niets.';
      const thuis = wh.thuisdagen.indexOf(wd) >= 0 ? ' (thuiswerkdag)' : '';
      return '- ' + lbl + ' (' + d + ') is een werkdag' + thuis + '.';
    });
    const urenTxt = '\n\nWerkuren van dit teamlid: ' + wh.start + '-' + wh.end + '. Werkdagen: ' + wh.werkdagen.map((d) => NL_DAG[d]).join(' ') + '.\n' + dagInfo.join('\n') + '\nPlan ENKEL binnen deze werkuren en op werkdagen.';
    const system = 'Je bent de persoonlijke planningassistent van Studio 27. Maak voor dit teamlid een concrete, logische werkplanning voor VANDAAG en MORGEN op basis van de openstaande taken. Regels: plan uitsluitend binnen de opgegeven werkuren van dit teamlid en op diens werkdagen (plan niets op een niet-werkdag); respecteer de vaste agenda-afspraken (plan daar GEEN taken overheen); plan te-late taken en taken met de vroegste deadline eerst; gebruik de geschatte tijd als blokduur; verzin GEEN taken die niet in de lijst staan; als er te veel werk is voor twee dagen, zeg dat eerlijk en zet de rest onder "Later deze week". Antwoord in het Nederlands, beknopt, met per dag een lijst tijdsblokken in het formaat "09:00-11:00. Taaknaam (klant)". Begin direct met "**Vandaag**", geen inleiding.';
    const user = 'Teamlid: ' + member.naam + '\nVandaag is ' + today + '.' + urenTxt + '\n\nOpenstaande taken:\n' + lines.join('\n') + agendaTxt + '\n\nGeef de dagplanning voor vandaag en morgen.';
    const res = await Promise.race([
      aiComplete(env, AI_MODEL, system, user, undefined, { skill: 'dagplanning', member_id: member && member.id, member_naam: member && member.naam }),
      new Promise((resolve) => setTimeout(() => resolve({ err: 'ai_timeout' }), 18000)),
    ]);
    if (!res || res.err || !res.text) { body = { ok: false, error: (res && res.err) || 'ai_fout', aantal: taken.length }; }
    else { body = { ok: true, plan: res.text, aantal: taken.length, gegenereerd: Date.now() }; }
  }
  if (body.ok) { try { await env.KV.put(aiPlanKey(member.id), JSON.stringify({ _t: Date.now(), body }), { expirationTtl: 36 * 3600 }); } catch (e) { /* */ } }
  return body;
}
// teamAiPlan: cache-first (KV per dag); body.refresh forceert herberekenen.
export async function teamAiPlan(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const me = rr.me;
  if (!body.refresh) {
    try { const hit = await env.KV.get(aiPlanKey(me.id), 'json'); if (hit && hit.body) return { status: 200, body: Object.assign({}, hit.body, { cached: true, gegenereerd: hit._t || hit.body.gegenereerd || 0 }) }; } catch (e) { /* miss */ }
  }
  const out = await computeAiPlanFor(env, me);
  return { status: 200, body: out };
}
// computeAllAiPlans: 05:00-cron, bereken voor élk actief teamlid het dagplan vooruit
// naar KV (golven van 3, Claude-vriendelijk), zodat Home 's ochtends instant laadt.
export async function computeAllAiPlans(env) {
  try { if (await env.KV.get('team:aiplan:lock')) return null; await env.KV.put('team:aiplan:lock', '1', { expirationTtl: 600 }); } catch (e) { /* */ }
  try {
    const leden = (await ledenLijst(env)).filter((l) => !EX_MEMBERS.has(Number(l.id)));
    for (let i = 0; i < leden.length; i += 3) {
      const slice = leden.slice(i, i + 3);
      await Promise.all(slice.map((l) => computeAiPlanFor(env, { id: Number(l.id), naam: l.naam, email: str(l.email) }).catch(() => null)));
    }
    return { ok: true, aantal: leden.length };
  } finally {
    try { await env.KV.delete('team:aiplan:lock'); } catch (e) { /* */ }
  }
}

/* ===========================================================================
 * DRAG-AND-DROP PLANNER (ClickUp-Planner-stijl), weekkalender per teamlid.
 * teamPlanner geeft alle open taken (geshaped, met start/due/est in ms) zodat de
 * frontend ze in een weekraster plaatst: ingeplande taken = blokken (hoogte = est),
 * dateloze taken = backlog-rail om in te slepen. teamTaskSchedule zet de EXACTE
 * start- en eindtijd (ms) bij een drop, i.t.t. teamTaskUpdate dat enkel ymd→9u/17u doet.
 * =========================================================================== */
export async function teamPlanner(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false, message: 'Alleen voor het Studio 27-team.' } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const me = rr.me, leden = rr.leden, perms = rr.perms;
  // wiens week? eigen planning by default; account/admin mag een collega kiezen.
  let target = me;
  const reqId = Number(body.member) || 0;
  if (reqId && reqId !== me.id && (perms.account || rr.real_admin)) {
    const c = leden.find((l) => Number(l.id) === reqId && !EX_MEMBERS.has(Number(l.id)));
    if (c) target = { id: Number(c.id), naam: c.naam, email: c.email, pool: POOL_IDS.has(Number(c.id)) };
  }
  const [raw, naamMap] = await Promise.all([tasksForMember(env, target.id), bedrijvenNaamMap(env)]);
  // + korte briefing-snippet voor de hover-kaart in de maandweergave (ClickUp-stijl).
  const tasks = raw.filter((t) => !isDoneTask(t)).map((t) => Object.assign(shapeTask(t, naamMap), { briefing: str(t.description || t.text_content || '').replace(/\s+/g, ' ').trim().slice(0, 200) }));
  // Payroll/verlof als VASTE pseudo-blokken (nooit auto-verschuifbaar). Enkel
  // GOEDGEKEURD verlof (status != 'aanvraag') telt als hard obstakel, consistent
  // met de shoot-engine: een open aanvraag blokkeert niets.
  let payroll = [];
  try {
    const praw = await pageAll(env, (p) => `/list/${PAYROLL_LIST}/task?assignees%5B%5D=${encodeURIComponent(target.id)}&include_closed=false&subtasks=false&page=${p}`);
    payroll = praw
      .filter((t) => !isDoneTask(t) && Number(t.start_date) > 0 && !str(t.status && t.status.status).toLowerCase().includes('aanvraag'))
      .map((t) => {
        const s = Number(t.start_date) || 0, d = Number(t.due_date) || 0;
        return {
          id: str(t.id), naam: str(t.name) || 'Afwezig', status: statusMapper(t.status),
          discipline: 'verlof', bedrijf_id: '', bedrijf: '',
          start: s, due: d > s ? d : s + 86400000, est: d > s ? (d - s) : 86400000,
          prioriteit: '', ingepland: true, plan_actie: '', vast: true, vast_soort: 'payroll',
          due_ymd: d ? msToBrusselsYmd(d) : '', start_ymd: s ? msToBrusselsYmd(s) : '', url: str(t.url),
        };
      });
  } catch (e) { /* fail-soft */ }
  return {
    status: 200, body: {
      ok: true, target, is_mij: target.id === me.id,
      can_pick: !!(perms.account || rr.real_admin),
      roster: (perms.account || rr.real_admin) ? rosterFrom(leden) : [],
      tasks: tasks.concat(payroll),
    },
  };
}

// teamTaskSchedule: zet de exacte start/eind (drag-drop). Ondersteunt:
//  - { task_id, start_ms, due_ms, est_ms? }  → één taak (est_ms = duur bij resize)
//  - { task_id, clear:true }                 → startdatum weg (terug naar backlog; deadline blijft)
//  - { batch:[{task_id,start_ms,due_ms,est_ms?}, ...] } → meerdere ineens (auto-herplannen)
export async function teamTaskSchedule(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const MIN = Date.UTC(2024, 0, 1), MAX = Date.UTC(2031, 0, 1);
  const okMs = (v) => { const n = Number(v); return isFinite(n) && n > MIN && n < MAX ? Math.round(n) : null; };
  async function applyOne(item) {
    const taskId = cleanTaskId(item.task_id);
    if (!taskId) return { ok: false, error: 'no_task' };
    const put = {};
    if (item.clear) {
      put.start_date = null; put.start_date_time = false;   // deadline (due) bewust ongemoeid
    } else {
      const s = okMs(item.start_ms); if (s == null) return { ok: false, error: 'bad_start', task_id: taskId };
      put.start_date = s; put.start_date_time = true;
      const d = okMs(item.due_ms);
      if (d != null) { put.due_date = Math.max(d, s); put.due_date_time = true; }   // due nooit vóór start
      // duur (resize): zet time_estimate mee zodat de blokhoogte consistent blijft.
      if (item.est_ms != null) { const e = Number(item.est_ms); if (isFinite(e) && e > 0 && e < MAX) put.time_estimate = Math.round(e); }
      else if (item.est_uren != null) { const h = Number(item.est_uren); if (isFinite(h) && h > 0 && h < 1000) put.time_estimate = Math.round(h * 3600000); }
    }
    const r = await cu.put(env, `/task/${taskId}`, put);
    if (!r.ok) return { ok: false, error: 'update_failed', task_id: taskId };
    const t = r.data || {};
    return {
      ok: true, task_id: taskId,
      start: Number(t.start_date) || 0, due: Number(t.due_date) || 0, est: Number(t.time_estimate) || 0,
      start_ymd: t.start_date ? msToBrusselsYmd(Number(t.start_date)) : '',
      due_ymd: t.due_date ? msToBrusselsYmd(Number(t.due_date)) : '',
    };
  }
  if (Array.isArray(body.batch) && body.batch.length) {
    if (body.batch.length > 24) return { status: 400, body: { ok: false, error: 'too_many' } };
    const results = [];
    for (const it of body.batch) results.push(await applyOne(it));   // serieel = ClickUp-vriendelijk
    return { status: 200, body: { ok: results.every((r) => r.ok), results } };
  }
  const one = await applyOne(body || {});
  if (!one.ok && (one.error === 'no_task' || one.error === 'bad_start')) return { status: 400, body: { ok: false, error: one.error } };
  return { status: 200, body: one };
}

/* ===========================================================================
 * BERICHTEN-INBOX, projecten waar de KLANT het laatst sprak (= wij moeten
 * antwoorden), zodat een teamlid zelf reageert zonder PM. Zelfde '💬 ['-prefix-
 * heuristiek als het klantportaal-dashboard. Klant-posts = prefix; teamreplies =
 * plain comment; [INTERN]-notities tellen niet mee.
 * =========================================================================== */
const BERICHTEN_MAX = 18;       // hoeveel recentste taken we op comments checken
const BERICHTEN_BUDGET_MS = 2600; // stragglers nooit de inbox laten ophouden (fail-soft)
export async function teamBerichten(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false, message: 'Alleen voor het Studio 27-team.' } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const me = rr.me;
  const [raw, naamMap] = await Promise.all([tasksForMember(env, me.id), bedrijvenNaamMap(env)]);
  const open = raw.filter((t) => !isDoneTask(t));
  // klant chat zit op actieve projecten -> check de recentst bijgewerkte eerst.
  const cand = open.slice().sort((a, b) => (Number(b.date_updated) || 0) - (Number(a.date_updated) || 0)).slice(0, BERICHTEN_MAX);
  const items = [];
  await Promise.race([
    Promise.all(cand.map(async (t) => {
      try {
        const cwr = await cu.get(env, `/task/${t.id}/comment`);
        const cs = (cwr.ok && cwr.data && Array.isArray(cwr.data.comments)) ? cwr.data.comments : [];
        let last = null;
        for (const c of cs) { if (str(c.comment_text).slice(0, 8) === '[INTERN]') continue; if (!last || Number(c.date || 0) > Number(last.date || 0)) last = c; }
        if (!last) return;
        if (!str(last.comment_text).startsWith('💬 [')) return; // klant sprak NIET het laatst -> niets te doen
        let sn = str(last.comment_text); const i = sn.indexOf(']'); if (i > 0) sn = sn.slice(i + 1);
        const bid = (getRelationIds(t, FIELD.bedrijf)[0]) || '';
        items.push({
          task_id: str(t.id), naam: str(t.name),
          bedrijf: naamMap[bid] || '', bedrijf_id: bid,
          discipline: disciplineOf(t), status: statusMapper(t.status),
          snippet: sn.replace(/\s+/g, ' ').trim().slice(0, 130),
          ts: Number(last.date) || 0,
        });
      } catch (e) { /* fail-soft */ }
    })),
    new Promise((resolve) => setTimeout(resolve, BERICHTEN_BUDGET_MS)),
  ]);
  items.sort((a, b) => b.ts - a.ts);
  return { status: 200, body: { ok: true, target: me, count: items.length, items } };
}

/* ===========================================================================
 * SHOOT-AANVRAGEN BUITEN KANTOORUREN, creator-accept-portaal.
 * Een aanvraag (avond/weekend-shoot die niet in de standaard-beschikbaarheid valt)
 * wordt als KV-record bewaard (NIET in ClickUp → blokkeert de beschikbaarheid nooit,
 * geen 'aanvraag'-status nodig; Cloudflare-only, geen Make). Een pool-creator ziet de
 * pending aanvragen in 'Aanvragen' en kan ACCEPTEREN (shoot inplannen op de taak +
 * zichzelf toewijzen + klant-bevestiging) of WEIGEREN (met reden → klant-bericht).
 * Een teamlid (bv. sales aan de telefoon) kan zelf een aanvraag loggen; de klant-zelf-
 * service in het klantportaal kan later op dezelfde endpoints aansluiten.
 * =========================================================================== */
const SHOOTREQ_PREFIX = 'team:shootreq:';
async function shootReqLoadAll(env) {
  const out = [];
  try {
    let cursor; let guard = 0;
    do {
      const res = await env.KV.list({ prefix: SHOOTREQ_PREFIX, cursor, limit: 1000 });
      for (const k of (res.keys || [])) {
        try { const v = await env.KV.get(k.name, 'json'); if (v && typeof v === 'object') out.push(v); } catch (e) { /* skip */ }
      }
      cursor = res.list_complete ? null : res.cursor;
    } while (cursor && ++guard < 8);
  } catch (e) { /* KV down → lege lijst, fail-soft */ }
  return out;
}
function shootReqClean(r) {
  return {
    id: str(r.id), task_id: str(r.task_id || ''), bedrijf_id: str(r.bedrijf_id || ''), bedrijf: str(r.bedrijf || ''),
    datum_ymd: str(r.datum_ymd || ''), van: str(r.van || ''), tot: str(r.tot || ''),
    start: Number(r.start) || 0, eind: Number(r.eind) || 0,
    locatie: str(r.locatie || ''), opmerking: str(r.opmerking || ''),
    status: str(r.status || 'pending'), reden: str(r.reden || ''),
    aangevraagd_door: str(r.aangevraagd_door || ''), creator: str(r.creator || ''),
    ts: Number(r.ts) || 0, afgehandeld_ts: Number(r.afgehandeld_ts) || 0,
  };
}

// teamShootRequests: lijst pending + recent afgehandelde aanvragen (alle staff).
export async function teamShootRequests(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (!rr.perms.creator && !rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Shoot-aanvragen zijn enkel voor de content-creators.' } };
  const all = (await shootReqLoadAll(env)).map(shootReqClean);
  const pending = all.filter((r) => r.status === 'pending').sort((a, b) => a.start - b.start || b.ts - a.ts);
  const afgehandeld = all.filter((r) => r.status !== 'pending').sort((a, b) => b.afgehandeld_ts - a.afgehandeld_ts).slice(0, 12);
  return { status: 200, body: { ok: true, me: rr.me, pending, afgehandeld, count: pending.length } };
}

// teamShootRequestCreate: log een nieuwe buiten-uren-aanvraag (staff of, later, klant).
export async function teamShootRequestCreate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (!rr.perms.creator && !rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Shoot-aanvragen zijn enkel voor de content-creators.' } };
  const datum = str(body.datum_ymd).trim();
  const van = str(body.van).trim(), tot = str(body.tot).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || !/^\d{2}:\d{2}$/.test(van)) return { status: 400, body: { ok: false, error: 'bad_input', message: 'Geef minstens een datum en starttijd.' } };
  const start = brusselsWallToMs(datum, van);
  const eind = /^\d{2}:\d{2}$/.test(tot) ? brusselsWallToMs(datum, tot) : (start + 7200000);
  let bedrijf = str(body.bedrijf).trim();
  const bedrijfId = cleanTaskId(body.bedrijf_id) || '';
  if (!bedrijf && bedrijfId) { try { const nm = await bedrijvenNaamMap(env); bedrijf = nm[bedrijfId] || ''; } catch (e) { /* */ } }
  const rec = {
    id: 'sr_' + (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.round(Math.random() * 1e6).toString(36))),
    task_id: cleanTaskId(body.task_id) || '', bedrijf_id: bedrijfId, bedrijf,
    datum_ymd: datum, van, tot: /^\d{2}:\d{2}$/.test(tot) ? tot : '', start, eind,
    locatie: str(body.locatie).slice(0, 240), opmerking: str(body.opmerking).slice(0, 1000),
    status: 'pending', aangevraagd_door: rr.me.naam, ts: Date.now(),
  };
  try { await env.KV.put(SHOOTREQ_PREFIX + rec.id, JSON.stringify(rec), { expirationTtl: 60 * 24 * 3600 }); }
  catch (e) { return { status: 200, body: { ok: false, error: 'kv_write_failed' } }; }
  return { status: 200, body: { ok: true, request: shootReqClean(rec) } };
}

// teamShootRequestRespond: { id, actie:'accept'|'decline', reden? }.
//  accept  -> shoot inplannen op de taak (start+due) + creator als assignee + klant-bevestiging.
//  decline -> aanvraag sluiten + (indien task_id) klant-bericht met de reden.
export async function teamShootRequestRespond(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (!rr.perms.creator && !rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Shoot-aanvragen zijn enkel voor de content-creators.' } };
  const id = str(body.id).trim();
  const actie = str(body.actie).trim();
  if (!/^sr_[\w-]{6,}$/.test(id) || (actie !== 'accept' && actie !== 'decline')) return { status: 400, body: { ok: false, error: 'bad_input' } };
  let rec;
  try { rec = await env.KV.get(SHOOTREQ_PREFIX + id, 'json'); } catch (e) { rec = null; }
  if (!rec || typeof rec !== 'object') return { status: 200, body: { ok: false, error: 'not_found' } };
  if (rec.status !== 'pending') return { status: 200, body: { ok: false, error: 'al_afgehandeld', status: rec.status } };
  const me = rr.me;
  const taskId = cleanTaskId(rec.task_id);
  const datumLabel = str(rec.datum_ymd) + (rec.van ? (' om ' + rec.van + (rec.tot ? '-' + rec.tot : '')) : '');
  if (actie === 'accept') {
    if (taskId) {
      const start = Number(rec.start) || 0; const eind = Math.max(Number(rec.eind) || 0, start + 1800000);
      try { await cu.put(env, `/task/${taskId}`, { start_date: start, start_date_time: true, due_date: eind, due_date_time: true, assignees: { add: [Number(me.id)] } }); } catch (e) { /* best-effort */ }
      try { await cu.comment(env, taskId, `✅ Shoot-aanvraag geaccepteerd door ${me.naam}. Ingepland op ${datumLabel}${rec.locatie ? ' - ' + rec.locatie : ''}.`, true); } catch (e) { /* */ }
    }
    rec.status = 'accepted'; rec.creator = me.naam;
  } else {
    if (taskId) { try { await cu.comment(env, taskId, `Shoot-aanvraag voor ${datumLabel} kon niet worden ingepland${str(body.reden).trim() ? ': ' + str(body.reden).trim().slice(0, 400) : '.'} We zoeken samen een ander moment.`, true); } catch (e) { /* */ } }
    rec.status = 'declined'; rec.reden = str(body.reden).slice(0, 400); rec.creator = me.naam;
  }
  rec.afgehandeld_ts = Date.now();
  try { await env.KV.put(SHOOTREQ_PREFIX + id, JSON.stringify(rec), { expirationTtl: 60 * 24 * 3600 }); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, request: shootReqClean(rec) } };
}

/* ===========================================================================
 * PLANNER-AGENDA-OVERLAY, de Google-Calendar-activiteiten van een teamlid voor
 * een week-venster, zodat ÉCHT alles wat ze moeten doen in hun planner staat.
 * ClickUp-gesyncte events (🔄) worden eruit gefilterd (die staan al als taakblok).
 * PRIVACY: titels enkel voor je EIGEN agenda of als zaakvoerder; een collega via de
 * member-picker wordt gemaskeerd als 'Bezet'.
 * =========================================================================== */
export async function teamPlannerAgenda(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const me = rr.me, leden = rr.leden, perms = rr.perms;
  let target = me;
  const reqId = Number(body.member) || 0;
  if (reqId && reqId !== me.id && (perms.account || rr.real_admin)) {
    const c = leden.find((l) => Number(l.id) === reqId && !EX_MEMBERS.has(Number(l.id)));
    if (c) target = { id: Number(c.id), naam: c.naam, email: c.email, pool: POOL_IDS.has(Number(c.id)) };
  }
  const van = Number(body.van_ms) || 0, tot = Number(body.tot_ms) || 0;
  // Max venster 45 dagen: de weekweergave vraagt een week, de maandweergave het volledige 6-weken-rooster (42 dagen + DST-marge).
  if (!van || !tot || tot <= van || (tot - van) > 45 * 86400000) return { status: 400, body: { ok: false, error: 'bad_window' } };
  const toonTitel = target.id === rr.real_me.id || rr.real_admin;   // eigen agenda of zaakvoerder
  const lid = leden.find((l) => Number(l.id) === target.id);
  const email = lid ? agendaEmail(lid) : '';
  if (!email) return { status: 200, body: { ok: true, target, events: [], toon_titel: toonTitel } };
  const events = [];
  try {
    const raw = await gcalEventsForHost(env, email, van, tot);
    for (const ev of (raw || [])) {
      if (isClickupSyncEvent(ev)) continue;                    // ClickUp-taak → al een blok, niet dubbel
      const iv = gcalEventToInterval(ev);
      if (!iv) continue;
      const allday = !!(ev.start && ev.start.date && !ev.start.dateTime);
      events.push({
        id: str(ev.id || ''),
        titel: toonTitel ? (str(ev.summary) || 'Afspraak') : 'Bezet',
        start_ms: iv[0], eind_ms: iv[1], allday,
        locatie: toonTitel ? str(ev.location || '') : '',
        beschrijving: toonTitel ? str(ev.description || '') : '',
        link: toonTitel ? str(ev.htmlLink || '') : '',   // open in Google Calendar (enkel eigen agenda/admin)
      });
    }
  } catch (e) {
    return { status: 200, body: { ok: true, target, events: [], toon_titel: toonTitel, err: 'gcal_' + ((e && e.message) || 'fout') } };
  }
  events.sort((a, b) => a.start_ms - b.start_ms);
  return { status: 200, body: { ok: true, target, events, toon_titel: toonTitel } };
}

// teamPlannerEventUpdate: wijzig een Google-agenda-event (titel/beschrijving/locatie/tijd).
// ENKEL je EIGEN agenda (of de zaakvoerder), collega-events tonen 'Bezet' en zijn niet
// bewerkbaar. PATCH-semantiek: enkel meegegeven velden wijzigen.
export async function teamPlannerEventUpdate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const eventId = str(body.event_id).trim();
  if (!eventId) return { status: 400, body: { ok: false, error: 'no_event' } };
  // schrijf altijd op de EIGEN agenda van de (effectieve) gebruiker, nooit die van een collega.
  const lid = rr.leden.find((l) => Number(l.id) === rr.me.id);
  const email = lid ? agendaEmail(lid) : agendaEmail(rr.me);
  if (!email) return { status: 400, body: { ok: false, error: 'no_calendar', message: 'Geen agenda gekoppeld.' } };
  const patch = {};
  if (body.titel != null) patch.summary = str(body.titel).slice(0, 500);
  if (body.beschrijving != null) patch.description = str(body.beschrijving).slice(0, 5000);
  if (body.locatie != null) patch.location = str(body.locatie).slice(0, 500);
  const s = Number(body.start_ms) || 0, e = Number(body.eind_ms) || 0;
  if (s > 0 && e > s) { patch.start = { dateTime: new Date(s).toISOString() }; patch.end = { dateTime: new Date(e).toISOString() }; }
  if (!Object.keys(patch).length) return { status: 400, body: { ok: false, error: 'niets_te_wijzigen' } };
  try {
    const out = await gcalPatchEvent(env, email, eventId, patch);
    return { status: 200, body: { ok: true, event: out } };
  } catch (err) {
    return { status: 200, body: { ok: false, error: 'gcal_' + ((err && err.message) || 'fout') } };
  }
}
// Schrijf-email = ALTIJD de eigen agenda van de (effectieve) gebruiker; je beheert nooit andermans events.
function plannerOwnEmail(rr) { const lid = rr.leden.find((l) => Number(l.id) === rr.me.id); return lid ? agendaEmail(lid) : agendaEmail(rr.me); }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const gcalMeetUri = (ev) => str(ev && ev.hangoutLink) || (((ev && ev.conferenceData && Array.isArray(ev.conferenceData.entryPoints)) ? (ev.conferenceData.entryPoints.find((e) => e.entryPointType === 'video') || {}).uri : '') || '');
// teamCalEvent: vers detail van één eigen agenda-event (titel/tijd/locatie/beschrijving + genodigden + Meet).
export async function teamCalEvent(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const eventId = str(body.event_id).trim(); if (!eventId) return { status: 400, body: { ok: false, error: 'no_event' } };
  const email = plannerOwnEmail(rr); if (!email) return { status: 200, body: { ok: false, error: 'no_calendar', message: 'Geen agenda gekoppeld.' } };
  try {
    const token = await mintGoogleToken(env, email, GCAL_SCOPE_EVENTS_HR);
    const fields = 'id,summary,description,location,htmlLink,hangoutLink,start,end,status,attendees(email,displayName,responseStatus,organizer,self,resource),conferenceData(entryPoints(uri,entryPointType))';
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(eventId) + '?fields=' + encodeURIComponent(fields), { headers: { Authorization: 'Bearer ' + token } });
    if (r.status === 404) return { status: 200, body: { ok: false, error: 'not_found', message: 'Deze afspraak staat niet in je eigen agenda. Je kan enkel je eigen afspraken beheren.' } };
    const ev = await r.json().catch(() => null);
    if (!r.ok || !ev) return { status: 200, body: { ok: false, error: 'gcal_' + r.status } };
    const iv = gcalEventToInterval(ev) || [Number(ev.start && ev.start.dateTime ? new Date(ev.start.dateTime).getTime() : 0) || 0, 0];
    const att = (Array.isArray(ev.attendees) ? ev.attendees : []).filter((a) => !a.resource).map((a) => ({ email: str(a.email), naam: str(a.displayName), status: str(a.responseStatus), self: !!a.self, organizer: !!a.organizer }));
    return { status: 200, body: { ok: true, event: { id: str(ev.id), titel: str(ev.summary), beschrijving: str(ev.description), locatie: str(ev.location), link: str(ev.htmlLink), start_ms: iv[0], eind_ms: iv[1], allday: !!(ev.start && ev.start.date && !ev.start.dateTime), meet: gcalMeetUri(ev), attendees: att } } };
  } catch (e) { return { status: 200, body: { ok: false, error: 'gcal_fout' } }; }
}
// teamCalEventDelete: verwijder een eigen agenda-event (sendUpdates=all → genodigden krijgen de annulering).
export async function teamCalEventDelete(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const eventId = str(body.event_id).trim(); if (!eventId) return { status: 400, body: { ok: false, error: 'no_event' } };
  const email = plannerOwnEmail(rr); if (!email) return { status: 200, body: { ok: false, error: 'no_calendar', message: 'Geen agenda gekoppeld.' } };
  try {
    const token = await mintGoogleToken(env, email, GCAL_SCOPE_EVENTS_HR);
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(eventId) + '?sendUpdates=all', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    if (r.status === 404 || r.status === 410) return { status: 200, body: { ok: false, error: 'not_found', message: 'Deze afspraak staat niet (meer) in je eigen agenda.' } };
    if (!(r.status === 204 || r.ok)) return { status: 200, body: { ok: false, error: 'gcal_' + r.status } };
    return { status: 200, body: { ok: true } };
  } catch (e) { return { status: 200, body: { ok: false, error: 'gcal_fout' } }; }
}
// teamCalEventInvite: voeg externe genodigden toe / verwijder ze (sendUpdates=all → uitnodiging/annulering).
export async function teamCalEventInvite(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const eventId = str(body.event_id).trim(); if (!eventId) return { status: 400, body: { ok: false, error: 'no_event' } };
  const email = plannerOwnEmail(rr); if (!email) return { status: 200, body: { ok: false, error: 'no_calendar', message: 'Geen agenda gekoppeld.' } };
  const add = (Array.isArray(body.add) ? body.add : []).map((x) => str(x).trim().toLowerCase()).filter((x) => EMAIL_RE.test(x)).slice(0, 20);
  const remove = (Array.isArray(body.remove) ? body.remove : []).map((x) => str(x).trim().toLowerCase()).filter(Boolean).slice(0, 20);
  if (!add.length && !remove.length) return { status: 400, body: { ok: false, error: 'niets' } };
  try {
    const token = await mintGoogleToken(env, email, GCAL_SCOPE_EVENTS_HR);
    const gr = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(eventId) + '?fields=attendees(email,displayName,responseStatus,organizer,self,resource)', { headers: { Authorization: 'Bearer ' + token } });
    if (gr.status === 404 || gr.status === 410) return { status: 200, body: { ok: false, error: 'not_found', message: 'Deze afspraak staat niet (meer) in je eigen agenda.' } };
    // KRITISCH: nooit verder met een onvolledig antwoord. Google VERVANGT de attendees-array, dus bij een
    // mislukte GET (401/403/429/5xx) zou een lege/onvolledige lijst alle genodigden + de organisator wissen.
    if (!gr.ok) return { status: 200, body: { ok: false, error: 'gcal_' + gr.status, message: 'Kon de genodigden niet ophalen, probeer opnieuw.' } };
    const cur = await gr.json().catch(() => null);
    if (!cur || typeof cur !== 'object') return { status: 200, body: { ok: false, error: 'gcal_parse', message: 'Kon de genodigden niet lezen, probeer opnieuw.' } };
    let attendees = Array.isArray(cur.attendees) ? cur.attendees.slice() : [];
    attendees = attendees.filter((a) => a.self || remove.indexOf(str(a.email).toLowerCase()) < 0);   // organisator/jezelf nooit verwijderen
    add.forEach((em) => { if (!attendees.some((a) => str(a.email).toLowerCase() === em)) attendees.push({ email: em }); });
    await gcalPatchEvent(env, email, eventId, { attendees });
    return { status: 200, body: { ok: true } };
  } catch (e) { return { status: 200, body: { ok: false, error: 'gcal_fout' } }; }
}
// teamCalEventMeet: voeg een Google Meet-link toe (enable) of verwijder ze (disable).
export async function teamCalEventMeet(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const eventId = str(body.event_id).trim(); if (!eventId) return { status: 400, body: { ok: false, error: 'no_event' } };
  const email = plannerOwnEmail(rr); if (!email) return { status: 200, body: { ok: false, error: 'no_calendar', message: 'Geen agenda gekoppeld.' } };
  const enable = !!body.enable;
  try {
    const token = await mintGoogleToken(env, email, GCAL_SCOPE_EVENTS_HR);
    const reqId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('meet-' + eventId.slice(0, 16) + '-' + Date.now());
    const patch = enable
      ? { conferenceData: { createRequest: { requestId: reqId, conferenceSolutionKey: { type: 'hangoutsMeet' } } } }
      : { conferenceData: null };
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(eventId) + '?conferenceDataVersion=1&sendUpdates=all', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (r.status === 404 || r.status === 410) return { status: 200, body: { ok: false, error: 'not_found', message: 'Deze afspraak staat niet (meer) in je eigen agenda.' } };
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { status: 200, body: { ok: false, error: 'gcal_' + r.status } };
    return { status: 200, body: { ok: true, meet: enable ? gcalMeetUri(data) : '' } };
  } catch (e) { return { status: 200, body: { ok: false, error: 'gcal_fout' } }; }
}
// teamCalEventCreate (HR Fase 4): maak een NIEUWE afspraak (sollicitatiegesprek) op de eigen
// agenda. Het enige bestaande schrijf-pad maakt enkel het vaste 🏠-thuiswerk-event; dit laat de
// HR-agenda een gesprek inplannen met tijd/locatie/genodigden/Meet. sendUpdates=all → de externe
// genodigden krijgen meteen een uitnodiging.
export async function teamCalEventCreate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const email = plannerOwnEmail(rr); if (!email) return { status: 200, body: { ok: false, error: 'no_calendar', message: 'Geen agenda gekoppeld.' } };
  const titel = str(body.titel).trim().slice(0, 500);
  const s = Number(body.start_ms) || 0, e = Number(body.eind_ms) || 0;
  if (!titel || !(s > 0) || !(e > s) || (e - s) > 12 * 3600000) return { status: 400, body: { ok: false, error: 'bad_input' } };
  const genodigden = (Array.isArray(body.genodigden) ? body.genodigden : []).map((x) => str(x).trim().toLowerCase()).filter((x) => EMAIL_RE.test(x)).slice(0, 20);
  const ev = { summary: titel, start: { dateTime: new Date(s).toISOString() }, end: { dateTime: new Date(e).toISOString() } };
  if (str(body.locatie).trim()) ev.location = str(body.locatie).trim().slice(0, 500);
  if (str(body.beschrijving).trim()) ev.description = str(body.beschrijving).trim().slice(0, 5000);
  if (genodigden.length) ev.attendees = genodigden.map((em) => ({ email: em }));
  if (body.add_meet) { const reqId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('meet-' + Date.now()); ev.conferenceData = { createRequest: { requestId: reqId, conferenceSolutionKey: { type: 'hangoutsMeet' } } }; }
  try {
    const token = await mintGoogleToken(env, email, GCAL_SCOPE_EVENTS_HR);
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(ev) });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data) return { status: 200, body: { ok: false, error: 'gcal_' + r.status } };
    const iv = gcalEventToInterval(data) || [s, e];
    return { status: 200, body: { ok: true, event: { id: str(data.id), titel: str(data.summary), start_ms: iv[0], eind_ms: iv[1], allday: false, locatie: str(data.location), beschrijving: str(data.description), link: str(data.htmlLink), meet: gcalMeetUri(data) } } };
  } catch (e2) { return { status: 200, body: { ok: false, error: 'gcal_fout' } }; }
}

/* ===========================================================================
 * CAPACITEITS-OVERZICHT, hoeveel taken + uren staan er nog in 'kan beginnen'
 * (de te-plannen backlog) per teamlid en per tak. Signaleert wie zonder werk dreigt
 * te vallen + geeft een ruwe prognose wanneer een nieuw project kan starten.
 * Zichtbaar voor account (Vincent + Ilke) EN finance (Vincent + Arne). KV-cache 5min.
 * =========================================================================== */
const CAP_CK = 'team:capaciteit:v5';   // v5 = + maand-uren per lid + backlog op status 'startklaar'
// drie weekvensters (vorige/deze/volgende) als ms-grenzen, ma 00:00 → zo 23:59 (Brussels).
function weekVensters() {
  const today = msToBrusselsYmd(Date.now());
  const wd = new Date(today + 'T12:00:00Z').getUTCDay();   // 0=zo..6=za
  const monThis = ymdPlus(today, wd === 0 ? -6 : 1 - wd);
  const win = (mon) => ({ van: brusselsWallToMs(mon, '00:00'), tot: brusselsWallToMs(ymdPlus(mon, 6), '23:59') });
  return { prev: win(ymdPlus(monThis, -7)), deze: win(monThis), volgende: win(ymdPlus(monThis, 7)) };
}

// teamCapaciteit: serveert het (kleine) resultaat uit KV = INSTANT. De ZWARE scan draait
// op de achtergrond (cron + ctx.waitUntil), nooit in een live request → geen time-out meer.
// Dit is het patroon van grote apps (ClickUp/Motion): dashboards zijn voorberekend.
export async function teamCapaciteit(_b, body, env, ctx) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'account') && denyUnless(rr.perms, 'finance')) {
    return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Geen toegang voor jouw rol.' } };
  }
  let hit = null;
  try { hit = await env.KV.get(CAP_CK, 'json'); } catch (e) { /* miss */ }
  const bg = () => { try { if (ctx && ctx.waitUntil) ctx.waitUntil(computeCapaciteit(env)); else computeCapaciteit(env); } catch (e) { /* */ } };
  if (hit && hit.body) {
    if (!hit._t || (Date.now() - hit._t) > 20 * 60 * 1000) bg();   // ouder dan 20 min → stil verversen
    return { status: 200, body: Object.assign({}, hit.body, { gegenereerd: hit._t || 0 }) };
  }
  bg();   // nog niets berekend → start de achtergrondberekening, meld 'wordt berekend'
  return { status: 200, body: { ok: true, computing: true, per_lid: [], per_tak: [], totaal: { aantal: 0, uren: 0 }, prognose: { uren_per_week_team: 0, uren_per_persoon: 38, leden: 0, weken_backlog: 0 }, zonder_est: 0, disclaimer: 'De capaciteit wordt voor de eerste keer berekend (even geduld, ±1 min). Dit scherm ververst automatisch.' } };
}

// computeCapaciteit: de zware scan. subtasks=false volstaat (vangt alle 'kan beginnen'-taken),
// pagina's parallel in golven van 8, per pagina meteen enkel de slanke backlog-velden uitpakken
// (zware taaktekst direct weggegooid → laag geheugen). Klein resultaat → KV (7 dagen).
export async function computeCapaciteit(env) {
  // lock: voorkom dat meerdere achtergrond-scans tegelijk lopen (auto-retry elke 12s).
  try { if (await env.KV.get('team:capaciteit:lock')) return null; await env.KV.put('team:capaciteit:lock', '1', { expirationTtl: 90 }); } catch (e) { /* */ }
  const roster = rosterFrom(await ledenLijst(env));
  const rosterById = new Map(roster.map((l) => [Number(l.id), l]));
  const listQ = DISCIPLINE_LISTS.map((id) => `list_ids%5B%5D=${encodeURIComponent(id)}`).join('&');
  const slimById = new Map();
  let base = 0, done = false, guard = 0;
  while (!done && guard++ < 9) {                  // tot 72 pagina's
    const reqs = [];
    for (let i = 0; i < 8; i++) reqs.push(cu.get(env, `/team/${TEAM_ID}/task?${listQ}&include_closed=false&subtasks=false&page=${base + i}`).catch(() => ({ ok: false })));
    const ress = await Promise.all(reqs);
    let anyFull = false;
    for (const r of ress) {
      const ts = (r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : [];
      if (ts.length >= 100) anyFull = true;
      if (r.ok && r.data && r.data.last_page === true) done = true;
      for (const t of ts) {
        if (!(isStartklaar(t) && !isDoneTask(t))) continue;   // status 'startklaar' = klaar om in te plannen (backlog)
        const id = str(t.id); if (slimById.has(id)) continue;
        slimById.set(id, {
          est: Number(t.time_estimate) || 0,
          disc: disciplineOf(t) || 'overig',
          ass: (Array.isArray(t.assignees) ? t.assignees : []).map((a) => Number(a && a.id)).filter(Boolean),
        });
      }
    }
    if (!anyFull) done = true;
    base += 8;
  }
  const perLidMap = new Map();
  const perDisc = {};
  let zonderEst = 0, totTaken = 0, totUren = 0;
  for (const s of slimById.values()) {
    const est = s.est;
    if (!est) zonderEst++;
    const uren = est / 3600000;
    totTaken++; totUren += uren;                                                  // totaal = elke taak ÉÉN keer
    const dsc = s.disc;
    if (!perDisc[dsc]) perDisc[dsc] = { aantal: 0, uren: 0 };
    perDisc[dsc].aantal++; perDisc[dsc].uren += uren;
    for (const id of s.ass) {                                                     // per teamlid: bij elke toegewezene
      if (!rosterById.has(id)) continue;
      if (!perLidMap.has(id)) perLidMap.set(id, { aantal: 0, uren: 0, pd: {} });
      const e = perLidMap.get(id); e.aantal++; e.uren += uren;
      if (!e.pd[dsc]) e.pd[dsc] = { aantal: 0, uren: 0 };
      e.pd[dsc].aantal++; e.pd[dsc].uren += uren;
    }
  }
  // ── INGEPLANDE UREN per teamlid per week (vorige/deze/volgende) + DEZE MAAND + waar-werkt-aan ──
  const wv = weekVensters();
  const mv = maandVenster();
  const wkBy = new Map();      // id -> {prev, deze, volgende} uren
  const maandBy = new Map();   // id -> uren deze maand (relevant voor wie met maandplanning werkt)
  const taakBy = new Map();    // id -> [{naam,id,week,uren}] (deze+volgende week)
  {
    const lo = Math.min(wv.prev.van, mv.van), hi = Math.max(wv.volgende.tot, mv.tot);   // venster dekt 3 weken ÉN de maand
    let base = 0, done = false, guard = 0;
    while (!done && guard++ < 8) {
      const reqs = [];
      for (let i = 0; i < 8; i++) reqs.push(cu.get(env, `/team/${TEAM_ID}/task?${listQ}&include_closed=false&subtasks=true&due_date_gt=${lo}&due_date_lt=${hi}&page=${base + i}`).catch(() => ({ ok: false })));
      const ress = await Promise.all(reqs);
      let anyFull = false;
      for (const r of ress) {
        const ts = (r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : [];
        if (ts.length >= 100) anyFull = true;
        if (r.ok && r.data && r.data.last_page === true) done = true;
        for (const t of ts) {
          if (isDoneTask(t)) continue;
          const due = Number(t.due_date) || 0; if (!due) continue;
          const inMaand = (due >= mv.van && due <= mv.tot);
          const wk = (due >= wv.deze.van && due <= wv.deze.tot) ? 'deze' : (due >= wv.prev.van && due <= wv.prev.tot) ? 'prev' : (due >= wv.volgende.van && due <= wv.volgende.tot) ? 'volgende' : '';
          if (!wk && !inMaand) continue;
          const est = Number(t.time_estimate) || 0;
          const as = (Array.isArray(t.assignees) ? t.assignees : []).map((a) => Number(a && a.id)).filter(Boolean);
          if (!as.length) continue;
          const share = est / as.length / 3600000;
          for (const id of as) {
            if (!rosterById.has(id)) continue;
            if (wk) {
              if (!wkBy.has(id)) wkBy.set(id, { prev: 0, deze: 0, volgende: 0 });
              wkBy.get(id)[wk] += share;
              if (wk === 'deze' || wk === 'volgende') { if (!taakBy.has(id)) taakBy.set(id, []); const lijst = taakBy.get(id); if (lijst.length < 16) lijst.push({ naam: str(t.name).slice(0, 80), id: str(t.id), week: wk, uren: Math.round(share * 10) / 10, disc: disciplineOf(t) || '' }); }
            }
            if (inMaand) maandBy.set(id, (maandBy.get(id) || 0) + share);
          }
        }
      }
      if (!anyFull) done = true;
      base += 8;
    }
  }
  // ── VERLOF/PAYROLL (goedgekeurd) per teamlid: dagen deze + volgende week ──
  const verlofBy = new Map();   // id -> {deze, volgende} dagen
  try {
    const praw = await pageAll(env, (p) => `/list/${PAYROLL_LIST}/task?include_closed=false&subtasks=false&page=${p}`, 10);
    for (const t of praw) {
      if (isDoneTask(t) || str(t.status && t.status.status).toLowerCase().includes('aanvraag')) continue;   // enkel goedgekeurd verlof
      const s0 = Number(t.start_date) || 0; if (!s0) continue;
      const d0 = Number(t.due_date) || (s0 + 86400000);
      const as = (Array.isArray(t.assignees) ? t.assignees : []).map((a) => Number(a && a.id)).filter(Boolean);
      if (!as.length) continue;
      for (const wkName of ['deze', 'volgende']) {
        const w = wv[wkName]; const ovS = Math.max(s0, w.van), ovE = Math.min(d0, w.tot);
        if (ovE <= ovS) continue;
        const dagen = Math.min(5, Math.max(1, Math.round((ovE - ovS) / 86400000)));   // werkdagen, cap 5/week
        for (const id of as) { if (!rosterById.has(id)) continue; if (!verlofBy.has(id)) verlofBy.set(id, { deze: 0, volgende: 0 }); verlofBy.get(id)[wkName] = Math.min(5, verlofBy.get(id)[wkName] + dagen); }
      }
    }
  } catch (e) { /* fail-soft */ }
  const perLid = roster.map((l) => {
    const e = perLidMap.get(Number(l.id)) || { aantal: 0, uren: 0, pd: {} };
    const wk = wkBy.get(Number(l.id)) || { prev: 0, deze: 0, volgende: 0 };
    const vl = verlofBy.get(Number(l.id)) || { deze: 0, volgende: 0 };
    return {
      id: l.id, naam: l.naam, pool: l.pool, aantal: e.aantal, uren: Math.round(e.uren * 10) / 10,
      per_tak: Object.entries(e.pd).map(([k, v]) => ({ tak: k, aantal: v.aantal, uren: Math.round(v.uren * 10) / 10 })).sort((x, y) => y.uren - x.uren),
      weken: { vorige: Math.round(wk.prev * 10) / 10, deze: Math.round(wk.deze * 10) / 10, volgende: Math.round(wk.volgende * 10) / 10 },
      maand: Math.round((maandBy.get(Number(l.id)) || 0) * 10) / 10,   // ingeplande uren deze kalendermaand
      verlof: { deze: vl.deze, volgende: vl.volgende },
      taken: (taakBy.get(Number(l.id)) || []).sort((a, b) => (a.week === b.week ? b.uren - a.uren : a.week === 'deze' ? -1 : 1)),
    };
  }).sort((x, y) => x.uren - y.uren);   // minste werk eerst = wie dreigt leeg te vallen
  const perTak = Object.entries(perDisc).map(([k, v]) => ({ tak: k, aantal: v.aantal, uren: Math.round(v.uren * 10) / 10 })).sort((a, b) => b.uren - a.uren);
  const weekPerPersoon = 38;
  const actieveLeden = roster.length || 1;
  const teamWeekUren = weekPerPersoon * actieveLeden;
  const body2 = {
    ok: true, gegenereerd: Date.now(),
    per_lid: perLid, per_tak: perTak,
    totaal: { aantal: totTaken, uren: Math.round(totUren * 10) / 10 },
    prognose: {
      uren_per_week_team: teamWeekUren, uren_per_persoon: weekPerPersoon, leden: actieveLeden,
      weken_backlog: Math.round((totUren / teamWeekUren) * 10) / 10,
    },
    zonder_est: zonderEst,
    disclaimer: 'Backlog = taken met status ‘startklaar’ (klaar om in te plannen). “Deze maand” = ingeplande uren met deadline deze kalendermaand (relevant voor wie met maandplanning werkt). Uren = geschat (time_estimate), niet gepresteerd' + (zonderEst ? ' - ' + zonderEst + ' taken missen nog een inschatting' : '') + '.',
  };
  try { await env.KV.put(CAP_CK, JSON.stringify({ _t: Date.now(), body: body2 }), { expirationTtl: 7 * 24 * 3600 }); } catch (e) { /* best-effort */ }
  try { await env.KV.delete('team:capaciteit:lock'); } catch (e) { /* */ }
  return body2;
}

/* ===========================================================================
 * SOLLICITATIES, kandidaten uit ClickUp (HR/Sollicitaties 901520180359) in het
 * portaal: naam/contact/vacature/CV, gesynct met ClickUp. AI-beoordeling leest het
 * CV-PDF écht (inhoud + design, wij zijn een marketingbureau, presentatie telt).
 * Strikt enkel voor de zaakvoerder (admin). Aanvragen komen via de Webflow→Make→
 * ClickUp-flow; dit leest enkel + scoort.
 * =========================================================================== */
const SOLLICITATIE_LIST = '901520180359';

// SSRF-guard: de CV-URL komt uit een ClickUp-veld (door derden beïnvloedbaar via het
// sollicitatieformulier). De worker mag die NOOIT blind ophalen → enkel https + bekende
// CV-hosts (Webflow-uploads / ClickUp-bijlagen op S3). Zo geen interne/metadata-URLs.
function cvHostToegelaten(u) {
  try {
    const url = new URL(u);
    if (url.protocol !== 'https:') return false;
    const h = url.hostname.toLowerCase();
    const ok = ['webflow.com', 'clickup.com', 'clickup-attachments.com', 'clickupusercontent.com', 'amazonaws.com'];
    return ok.some((d) => h === d || h.endsWith('.' + d));
  } catch (e) { return false; }
}

/* ---- HR custom-field-laag (op NAAM, niet op ID) -----------------------------
 * Vincent maakt de custom fields in de ClickUp-UI aan (API kan dat niet). Wij
 * lezen/schrijven ze hier op hun NAAM, zodat Vincent ons nooit field-ID's hoeft
 * te bezorgen, bestaat een veld nog niet, dan valt alles terug op het oude
 * description-parsen. De veld-definities cachen we ~1u (KV). */
const HR_FIELDS_CK = 'team:hrfields:v1';
async function hrFieldMap(env) {
  try { const hit = await env.KV.get(HR_FIELDS_CK, 'json'); if (hit && typeof hit === 'object') return hit; } catch (e) { /* */ }
  const map = {};
  try {
    const r = await cu.get(env, `/list/${SOLLICITATIE_LIST}/field`);
    const fields = (r.ok && r.data && Array.isArray(r.data.fields)) ? r.data.fields : [];
    for (const f of fields) {
      const nm = str(f.name).toLowerCase().trim();
      if (nm) map[nm] = { id: str(f.id), type: str(f.type), options: (f.type_config && Array.isArray(f.type_config.options)) ? f.type_config.options : [] };
    }
  } catch (e) { /* */ }
  // Zelf-herstel: ontbreekt een van de kern-HR-velden, cache dan maar 60s (i.p.v. 600s)
  // zodat een net-aangemaakt veld snel opgepikt wordt zonder handmatige cache-bust.
  const compleet = ['type aanvraag', 'ai-score', 'spam', 'ai-samenvatting'].every((n) => map[n]);
  try { await env.KV.put(HR_FIELDS_CK, JSON.stringify(map), { expirationTtl: compleet ? 600 : 60 }); } catch (e) { /* */ }
  return map;
}
// Lees een custom-field-waarde uit een taak; names[] = synoniemen (eerste match wint).
function hrReadField(task, fmap, names) {
  for (const n of names) {
    const f = fmap[str(n).toLowerCase()];
    if (!f) continue;
    const v = getCF(task, f.id);
    if (v == null || v === '') continue;
    if (f.type === 'drop_down') {
      const opt = (f.options || []).find((o) => str(o.id) === str(v) || str(o.orderindex) === str(v));
      return opt ? str(opt.name) : '';
    }
    if (f.type === 'checkbox') return (v === true || v === 'true') ? 'true' : 'false';
    if (typeof v === 'object') return str(v.formatted_address || v.value || '');
    return str(v);
  }
  return '';
}
// Schrijf een custom-field op naam (no-op als het veld niet bestaat). Best-effort.
async function hrWriteField(env, taskId, fmap, name, value) {
  const f = fmap[str(name).toLowerCase()];
  if (!f) return false;
  let val = value;
  if (f.type === 'drop_down') {
    const opt = (f.options || []).find((o) => str(o.name).toLowerCase() === str(value).toLowerCase());
    if (!opt) return false;
    val = str(opt.id);
  } else if (f.type === 'checkbox') {
    val = (value === true || value === 'true');   // ClickUp checkbox verwacht een boolean
  } else if (f.type === 'number') {
    val = Number(value) || 0;
  }
  try { const r = await cu.field(env, taskId, f.id, val); return !!(r && r.ok); } catch (e) { return false; }
}

function parseSollicitatie(t, fmap) {
  fmap = fmap || {};
  const desc = str(t.description || t.text_content || '');
  const grab = (re) => { const m = desc.match(re); return m ? str(m[1]).trim() : ''; };
  // 1) structured custom fields (door Vincent aangemaakt) ; 2) anders description-parse.
  const vn = hrReadField(t, fmap, ['voornaam']);
  const an = hrReadField(t, fmap, ['achternaam']);
  let naam = (vn + ' ' + an).trim();
  if (!naam) naam = grab(/Naam:\s*(.+)/i) || str(t.name).replace(/\s*[—-]\s*$/, '').trim();
  const email = hrReadField(t, fmap, ['e-mailadres', 'email', 'e-mail']) || grab(/E-?mail(?:adres)?:\s*(\S+)/i);
  const tel = hrReadField(t, fmap, ['telefoon', 'telefoonnummer', 'gsm']) || grab(/Telefoon(?:nummer)?:\s*(.+)/i);
  const woonplaats = hrReadField(t, fmap, ['woonplaats', 'gemeente', 'stad']) || grab(/Woonplaats:\s*(.+)/i);
  const datum = grab(/Sollicitatiedatum:\s*(.+)/i);
  const herkomst = grab(/Herkomst:\s*(\S+)/i);
  const kanaal = hrReadField(t, fmap, ['herkomst-kanaal', 'kanaal', 'bron']);
  let cv = hrReadField(t, fmap, ['cv-link', 'cv', 'cv-url']);
  if (!cv) {
    const cm = desc.match(/(https?:\/\/[^\s)]+\.pdf)/i) || desc.match(/(https?:\/\/webflow\.com\/files\/[^\s)]+)/i);
    if (cm) cv = cm[1];
  }
  // CV als ECHTE ClickUp-bijlage (de Webflow->Make-flow upload het bestand op de taak).
  if (!cv && Array.isArray(t.attachments) && t.attachments.length) {
    const att = t.attachments.find((a) => /\.(pdf|docx?|odt|rtf|pages)(\?|$)/i.test(str(a && (a.url || a.title))))
      || t.attachments.find((a) => /cv|resume|sollicit|motivat/i.test(str(a && a.title)))
      || t.attachments[0];
    if (att && att.url) cv = str(att.url);
  }
  let vacature = hrReadField(t, fmap, ['gesolliciteerde functie', 'functie', 'vacature']);
  if (!vacature) {
    const vm = (herkomst || '').match(/\/vacatures\/([a-z0-9-]+)/i);
    if (vm) { const s = vm[1].replace(/-+/g, ' ').trim(); vacature = s.charAt(0).toUpperCase() + s.slice(1); }
  }
  // type aanvraag: structured field, anders afgeleid (stage/spontaan in tekst).
  let type = hrReadField(t, fmap, ['type aanvraag', 'type', 'soort']).toLowerCase();
  if (!type) { const hay = (vacature + ' ' + str(t.name) + ' ' + desc).toLowerCase(); type = /stage/.test(hay) ? 'stage' : 'sollicitatie'; }
  if (/stage/.test(type)) type = 'stage'; else if (/spont/.test(type)) type = 'spontaan'; else type = 'sollicitatie';
  const spam = hrReadField(t, fmap, ['spam']) === 'true';
  // ts = de sollicitatiedatum die we tonen/sorteren. Prefereer start_date (= de echte sollicitatiedatum die we
  // zetten, want de aanmaakdatum klopt niet bij bulk-import) en val terug op de aanmaakdatum.
  return { id: str(t.id), naam, voornaam: vn, achternaam: an, email, telefoon: tel, woonplaats, datum, herkomst, kanaal, vacature, type, spam, cv_url: cv, status: statusMapper(t.status), status_raw: str(t.status && t.status.status), status_color: str(t.status && t.status.color), ts: Number(t.start_date) || Number(t.date_created) || 0 };
}

// Eenmalige migratie: lees alle ClickUp-sollicitaties (hergebruikt parseSollicitatie +
// AI-scores uit KV) en upsert ze in D1. Idempotent op id. Aangeroepen via de key-gated
// /hr/migrate-route in worker.js.
export async function hrMigrateFromClickup(env, opts) {
  opts = opts || {};
  if (!env.HRDB) return { ok: false, error: 'no_d1' };
  const fmap = await hrFieldMap(env);
  let tasks = [];
  try { tasks = await pageAll(env, (p) => `/list/${SOLLICITATIE_LIST}/task?include_closed=true&subtasks=false&page=${p}`); } catch (e) { return { ok: false, error: 'clickup_fout' }; }
  let items = tasks.map((t) => parseSollicitatie(t, fmap));
  const totalAll = items.length;
  // Optioneel enkel de recente kandidaten (bv. laatste 2 maanden).
  if (opts.sinceDays) { const cutoff = Date.now() - Number(opts.sinceDays) * 864e5; items = items.filter((it) => (Number(it.ts) || 0) >= cutoff); }
  const scores = await Promise.all(items.map((it) => env.KV.get('sol:score:' + it.id, 'json').then((s) => [it.id, s]).catch(() => [it.id, null])));
  const sm = new Map(scores);
  for (const it of items) { const s = sm.get(it.id); if (s) { it.ai = s; if (s.spam) it.spam = true; } if (/spam/i.test(it.status_raw || '')) it.spam = true; }
  // Optioneel iedereen op één status zetten (bv. allemaal onder 'Nieuw').
  if (opts.forceStatus) { for (const it of items) { it.status = str(opts.forceStatus); it.status_raw = str(opts.forceStatus); } }
  let ok = 0, metCv = 0; const fouten = [];
  for (const it of items) { try { await hrUpsertFromClickup(env, it); ok++; if (it.cv_url) metCv++; } catch (e) { fouten.push(str(it.id) + ':' + str(e && e.message)); } }
  return { ok: true, total_all: totalAll, total: items.length, imported: ok, met_cv: metCv, since_days: opts.sinceDays || 0, force_status: opts.forceStatus || '', fouten: fouten.slice(0, 5) };
}

// hrApplyIntake: website-sollicitatie rechtstreeks in D1 (vervangt het ClickUp-pad). Wordt
// aangeroepen door de key-gated /hr/apply-route die het Make-/Webflow-formulier post.
// Het CV komt als URL binnen (Webflow hostt de upload), dus geen file-handling nodig.
export async function hrApplyIntake(env, body) {
  if (!env.HRDB) return { ok: false, error: 'no_d1' };
  const voornaam = str(body.voornaam || body.Voornaam).trim();
  const achternaam = str(body.achternaam || body.Achternaam).trim();
  const naam = (voornaam + ' ' + achternaam).trim();
  const email = str(body.email || body.Email).trim();
  if (!naam && !email) return { ok: false, error: 'leeg' };
  let ts = 0; const sd = str(body.submitted_at || body.Submitted_at || body.datum); if (sd) { const d = Date.parse(sd); if (d) ts = d; } if (!ts) ts = Date.now();
  const herkomst = str(body.herkomst || body.Herkomst).trim();
  let vacature = str(body.vacature || body.Vacature).trim();
  if (!vacature && herkomst) { const vm = herkomst.match(/\/vacatures\/([a-z0-9-]+)/i); if (vm) { const s = vm[1].replace(/-+/g, ' ').trim(); vacature = s.charAt(0).toUpperCase() + s.slice(1); } }
  const id = await hrInsert(env, {
    naam, voornaam, achternaam, email,
    telefoon: str(body.gsm || body.Gsm || body.telefoon), woonplaats: str(body.woonplaats || body.Woonplaats),
    vacature, type: /stage/i.test(vacature + ' ' + herkomst) ? 'stage' : 'sollicitatie',
    bron: herkomst || 'website', kanaal: str(body.kanaal),
    status: 'nieuw', cv_url: str(body.cv_url || body.CV_url || body.cv), motivatie: str(body.motivatie),
    created_at: ts,
  });
  return { ok: true, id };
}

export async function teamSollicitaties(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Sollicitaties zijn enkel voor de zaakvoerder.' } };
  // D1 = bron-van-waarheid zodra er kandidaten in staan. Anders fail-soft terug naar ClickUp.
  if (env.HRDB && (await hrCount(env)) > 0) {
    const items = await hrList(env);
    return { status: 200, body: { ok: true, count: items.length, items, statussen: HR_STATUSSEN, source: 'd1' } };
  }
  const fmap = await hrFieldMap(env);
  let tasks = [];
  try { tasks = await pageAll(env, (p) => `/list/${SOLLICITATIE_LIST}/task?include_closed=true&subtasks=false&page=${p}`); } catch (e) { tasks = []; }
  const items = tasks.map((t) => parseSollicitatie(t, fmap)).sort((a, b) => b.ts - a.ts);
  // gecachte AI-scores PARALLEL ophalen (niet 1-voor-1) → veel sneller bij veel kandidaten.
  const scores = await Promise.all(items.map((it) => env.KV.get('sol:score:' + it.id, 'json').then((s) => [it.id, s]).catch(() => [it.id, null])));
  const scoreMap = new Map(scores);
  for (const it of items) { const s = scoreMap.get(it.id); if (s) { it.ai = s; if (s.spam) it.spam = true; } if (/spam/i.test(it.status_raw || '')) it.spam = true; }
  let statussen = [];
  try { const lr = await cu.get(env, `/list/${SOLLICITATIE_LIST}`); if (lr.ok && lr.data && Array.isArray(lr.data.statuses)) statussen = lr.data.statuses.map((s) => ({ status: str(s.status), color: str(s.color), type: str(s.type) })).filter((s) => s.status); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, count: items.length, items, statussen } };
}

// teamSollicitatieScore: { task_id, force? } → AI-beoordeling op basis van het CV-PDF.
export async function teamSollicitatieScore(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  if (!body.force) { try { const c = await env.KV.get('sol:score:' + taskId, 'json'); if (c) return { status: 200, body: { ok: true, ai: c, cached: true } }; } catch (e) { /* */ } }
  const key = str(env.ANTHROPIC_API_KEY); if (!key) return { status: 200, body: { ok: false, error: 'no_anthropic_key' } };
  const tr = await cu.get(env, `/task/${taskId}`);
  if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const fmap = await hrFieldMap(env);
  const cand = parseSollicitatie(tr.data, fmap);
  // CV-url: echte bijlage > description-link
  let cvUrl = cand.cv_url;
  const atts = Array.isArray(tr.data.attachments) ? tr.data.attachments : [];
  const pdfAtt = atts.find((a) => /\.pdf$/i.test(str(a.title || a.url)) || /pdf/i.test(str(a.extension)));
  if (pdfAtt && (pdfAtt.url || pdfAtt.url_w_query)) cvUrl = str(pdfAtt.url_w_query || pdfAtt.url);
  // PDF/afbeelding ophalen → base64 (cap ~9MB). Enkel van toegelaten hosts (SSRF-guard) + timeout.
  let b64 = '', mediaType = 'application/pdf';
  if (cvUrl && cvHostToegelaten(cvUrl)) {
    try {
      const fr = await fetch(cvUrl, { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(15000) : undefined });
      if (fr.ok) {
        const ct = str(fr.headers.get('content-type') || '');
        const buf = new Uint8Array(await fr.arrayBuffer());
        if (buf.length && buf.length < 9 * 1024 * 1024) {
          let bin = ''; const CH = 8192;
          for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
          b64 = btoa(bin);
          if (/image\//.test(ct)) mediaType = ct.split(';')[0].trim();
        }
      }
    } catch (e) { /* fail-soft → tekst-only */ }
  }
  const system = 'Je bent de wervingsassistent van Studio 27, een Vlaams marketing- en communicatiebureau. Beoordeel een sollicitant. Een GOEDE kandidaat is NIET per se iemand met veel ervaring, maar iemand met (1) de juiste achtergrond/opleiding voor de rol, (2) zichtbare motivatie, (3) een leergierige houding, en (4), extra belangrijk omdat wij een marketingbureau zijn, een CV/sollicitatie met sterke presentatie, look & feel en design. Detecteer ook SPAM: lege/onzinnige inzendingen, bots, ongerelateerde commerciële berichten of duidelijk nep-sollicitaties. Wees eerlijk, concreet en kort, in het Nederlands. Antwoord UITSLUITEND met geldige JSON, niets eromheen.';
  const vraag = 'Vacature: ' + (cand.vacature || 'onbekend') + '\nType aanvraag: ' + (cand.type || 'sollicitatie') + '\nKandidaat: ' + (cand.naam || 'onbekend') + '\n\nBeoordeel het bijgevoegde CV/sollicitatie-document op inhoud ÉN op visuele presentatie/design. Geef JSON met exact deze velden: {"score": <getal 0-100>, "goede_kandidaat": <true|false>, "spam": <true|false>, "samenvatting": "<2-3 zinnen achtergrond/profiel van de kandidaat>", "oordeel": "<1 korte zin eindoordeel>", "sterktes": ["...","..."], "aandachtspunten": ["..."], "cv_design": "<korte beoordeling van presentatie/design>", "achtergrond_past": <true|false>, "motivatie_zichtbaar": <true|false>, "leergierig": <true|false>}. Zet "goede_kandidaat" op true als de achtergrond past ÉN motivatie/leergierigheid blijkt ÉN het document er verzorgd uitziet. Zet "spam" op true bij lege/onzinnige/bot/commerciële niet-sollicitaties (dan score=0).';
  async function callAnthropic(withDoc) {
    const content = [];
    if (withDoc && b64) content.push({ type: (mediaType === 'application/pdf' ? 'document' : 'image'), source: { type: 'base64', media_type: mediaType, data: b64 } });
    content.push({ type: 'text', text: vraag + ((withDoc && b64) ? '' : '\n\n(LET OP: het CV-bestand kon niet geladen of gelezen worden, beoordeel enkel op de beschikbare gegevens en vermeld dat in aandachtspunten.)') });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 800, system, messages: [{ role: 'user', content }] }),
    });
    const d = await r.json().catch(() => null);
    return { ok: r.ok, d };
  }
  let res = await callAnthropic(!!b64);
  if (!res.ok && b64) res = await callAnthropic(false);   // document geweigerd → tekst-only herproberen
  if (!res.ok || !res.d || !Array.isArray(res.d.content) || !res.d.content[0]) {
    return { status: 200, body: { ok: false, error: str((res.d && res.d.error && res.d.error.message) || 'ai_fout') } };
  }
  try { const u = aiUsageFrom(AI_MODEL, res.d); await logAiUsage(env, { platform: 'team', skill: 'hr:cv-score', model: AI_MODEL, in_tokens: u.in, out_tokens: u.out, member_id: rr.me && rr.me.id, member_naam: rr.me && rr.me.naam, bedrijf_id: taskId }); } catch (e) { /* */ }
  let ai = null;
  const txt = str(res.d.content[0].text);
  const jm = txt.match(/\{[\s\S]*\}/);
  if (jm) { try { ai = JSON.parse(jm[0]); } catch (e) { ai = null; } }
  if (!ai) return { status: 200, body: { ok: false, error: 'parse' } };
  ai.gescoord = Date.now(); ai.cv_gelezen = !!b64;
  try { await env.KV.put('sol:score:' + taskId, JSON.stringify(ai), { expirationTtl: 90 * 24 * 3600 }); } catch (e) { /* */ }
  try { if (env.HRDB) await hrSetAi(env, taskId, ai); } catch (e) { /* D1-score, portaal leest hieruit */ }
  // Terugschrijven naar ClickUp (best-effort, no-op als de velden nog niet bestaan):
  // de zaakvoerder ziet de AI-score/spam/samenvatting óók in ClickUp zelf.
  try {
    if (ai.score != null) await hrWriteField(env, taskId, fmap, 'ai-score', Math.round(Number(ai.score) || 0));
    await hrWriteField(env, taskId, fmap, 'spam', !!ai.spam);
    const samv = str(ai.samenvatting || ai.oordeel || '');
    if (samv) await hrWriteField(env, taskId, fmap, 'ai-samenvatting', samv);
    // afgeleid type aanvraag enkel invullen als het veld nog leeg is (Vincents keuze nooit overschrijven)
    const huidigType = hrReadField(tr.data, fmap, ['type aanvraag']);
    if (!huidigType && cand.type) await hrWriteField(env, taskId, fmap, 'type aanvraag', cand.type);
  } catch (e) { /* */ }
  return { status: 200, body: { ok: true, ai } };
}

/* ===========================================================================
 * WERVINGS-AI-KNOPPEN (per kandidaat, enkel zaakvoerder)
 *  - teamKandidaatMail: AI-mail in Studio 27-tone (afwijzen | cv_opvragen),
 *    preview (bewerkbaar) → verzenden via Gmail naar het kandidaat-adres.
 *  - teamKandidaatCase: genereert een fictieve "hard case"-opdracht uit de functie.
 * =========================================================================== */
// Kandidaat ophalen voor de wervings-acties. D1 is bron-van-waarheid (werkt ook voor
// website-intake-kandidaten zonder ClickUp-taak); valt fail-soft terug op ClickUp.
async function hrCandResolve(env, id) {
  const cid = cleanTaskId(id);
  if (!cid) return null;
  try { if (env.HRDB && (await hrCount(env)) > 0) { const c = await hrGet(env, cid); if (c) return c; } } catch (e) { /* */ }
  try { const tr = await cu.get(env, `/task/${cid}`); if (tr.ok && tr.data) { const fmap = await hrFieldMap(env); return parseSollicitatie(tr.data, fmap); } } catch (e) { /* */ }
  return null;
}
// Is dit een echte ClickUp-taak (imported kandidaat) waar we best-effort naar loggen?
function hrClickupId(cand, id) { return str((cand && cand.clickup_id) || '') || (/^cand_|^ob_/.test(str(id)) ? '' : cleanTaskId(id)); }

const HR_MAIL_CFG = {
  afwijzen: {
    onderwerp: 'Je sollicitatie bij Studio 27',
    sys: 'Schrijf een warme, vriendelijke en respectvolle afwijzingsmail namens Studio 27, een Vlaams marketing- en communicatiebureau. Persoonlijke, menselijke tone of voice (geen kil standaardsjabloon). Bedank de kandidaat oprecht voor de interesse en moeite, laat op een zachte manier weten dat we nu niet verdergaan, en wens hem/haar veel succes. Kort (max ~120 woorden). Geef ENKEL de mailtekst met aanhef ("Dag <voornaam>,") en afsluiting ("Met vriendelijke groet,\\nVincent van Studio 27"). Geen onderwerpregel, geen extra uitleg.',
  },
  cv_opvragen: {
    onderwerp: 'Je sollicitatie bij Studio 27, cv',
    sys: 'Schrijf een korte, vriendelijke mail namens Studio 27 die de kandidaat vraagt om zijn/haar cv toe te sturen, omdat we het nog niet ontvingen maar de interesse waarderen en de sollicitatie graag verder bekijken. Persoonlijke, warme tone of voice. Geef ENKEL de mailtekst met aanhef ("Dag <voornaam>,") en afsluiting ("Met vriendelijke groet,\\nVincent van Studio 27"). Geen onderwerpregel.',
  },
  uitnodiging: {
    onderwerp: 'Uitnodiging voor een kennismakingsgesprek bij Studio 27',
    sys: 'Schrijf een warme, persoonlijke mail namens Studio 27 die de kandidaat uitnodigt voor een kennismakingsgesprek op kantoor (Studio 27, Merksplassesteenweg 97 bus 16, 2310 Rijkevorsel). Toon oprechte interesse in het profiel, stel voor om eens samen te zitten, en bied een paar concrete momenten aan met de placeholder [optie 1], [optie 2], [optie 3] zodat Vincent ze nog kan invullen. Vraag de kandidaat te laten weten wat past. Geef ENKEL de mailtekst met aanhef ("Dag <voornaam>,") en afsluiting ("Groetjes,\\nVincent"). Geen onderwerpregel, geen extra uitleg.',
  },
};
export async function teamKandidaatMail(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const soort = HR_MAIL_CFG[str(body.soort)] ? str(body.soort) : 'afwijzen';
  const action = (str(body.action) === 'send') ? 'send' : 'preview';
  const cfg = HR_MAIL_CFG[soort];
  const cand = await hrCandResolve(env, taskId);
  if (!cand) return { status: 200, body: { ok: false, error: 'not_found' } };
  const voornaam = str(cand.voornaam || (cand.naam || '').split(' ')[0] || 'daar');
  let tekst = str(body.tekst || '').trim();   // bij verzenden mag de (bewerkte) tekst meekomen
  if (!tekst) {
    const sys = cfg.sys + ' Schrijf in vlot Nederlands (Vlaams).' + toneBlock(await hrTone(env));
    const user = 'Voornaam: ' + voornaam + (cand.vacature ? ('\nGesolliciteerde functie: ' + cand.vacature) : '') + '\nType aanvraag: ' + (cand.type || 'sollicitatie') + '.';
    const res = await aiComplete(env, AI_MODEL, sys, user, 600, { skill: 'hr:kandidaat-mail' });
    if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: str((res && res.err) || 'ai_fout') } };
    tekst = str(res.text).trim();
  }
  if (action === 'preview') return { status: 200, body: { ok: true, tekst, email: cand.email, onderwerp: cfg.onderwerp, naam: cand.naam } };
  if (!cand.email) return { status: 200, body: { ok: false, error: 'geen_email', message: 'Er is geen e-mailadres bij deze kandidaat.' } };
  const r = await sendGmail(env, { to: cand.email, subject: cfg.onderwerp, body: tekst, fromName: 'Studio 27', replyTo: 'marketing@studio27.be' });
  if (!r.ok) return { status: 200, body: { ok: false, error: 'mail_failed', message: 'Versturen is mislukt.' } };
  // Bron-van-waarheid: de verzonden mail in het portaal-dossier (D1) loggen.
  try { await mailInsert(env, { candidate_id: cleanTaskId(taskId), direction: 'out', from_addr: 'no-reply@studio27.be', to_addr: cand.email, subject: cfg.onderwerp, body: tekst }); } catch (e) { /* */ }
  // + best-effort in de ClickUp-taakhistoriek (zolang die nog bestaat).
  const _cu = hrClickupId(cand, taskId);
  if (_cu) { try { await cu.comment(env, _cu, '✉️ [MAIL VERZONDEN · ' + (HR_MAIL_CFG[soort] ? cfg.onderwerp : 'Afwijzing') + ']\nNaar: ' + cand.email + '\n\n' + tekst, false); } catch (e) { /* */ } }
  return { status: 200, body: { ok: true, sent: true } };
}

export async function teamKandidaatCase(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const cand = await hrCandResolve(env, taskId);
  if (!cand) return { status: 200, body: { ok: false, error: 'not_found' } };
  const sys = 'Je bent de wervingsverantwoordelijke van Studio 27, een Vlaams marketing- en communicatiebureau. Stel een realistische, fictieve "hard case"-opdracht op die een kandidaat voor de gegeven functie TER PLAATSE bij ons op kantoor binnen 3 uur kan uitwerken. De case test de kernvaardigheden van de functie in een herkenbaar Studio 27-scenario (een klant, een briefing, een deadline). Geef in beknopte Markdown: (1) een korte context/briefing, (2) de concrete opdracht, (3) de verwachte deliverables binnen 3 uur, en (4) de beoordelingscriteria waarop wij kijken. Concreet en uitvoerbaar, in het Nederlands.' + toneBlock(await hrTone(env));
  const user = 'Functie: ' + (cand.vacature || 'algemene marketing-/communicatierol') + '.\nType aanvraag: ' + (cand.type || 'sollicitatie') + '.\nKandidaat: ' + (cand.naam || 'onbekend') + '.';
  const res = await aiComplete(env, AI_MODEL, sys, user, 1500, { skill: 'hr:hard-case' });
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: str((res && res.err) || 'ai_fout') } };
  const tekst = str(res.text).trim();
  // Bron-van-waarheid: de case ook als dossierdocument bewaren (downloadbaar in het portaal).
  const titel = 'Assessment-case' + (cand.vacature ? ' · ' + cand.vacature : '') + ' - Studio 27';
  const inner = '<h1>' + HR_ESC('Assessment-case' + (cand.vacature ? ' · ' + cand.vacature : '')) + '</h1>' + hrMdToHtml(tekst);
  const html = hrWordDocHtml(titel, inner, 'Door AI gegenereerde oefencase voor de selectieprocedure van Studio 27.');
  const veilig = (cand.naam || 'kandidaat').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kandidaat';
  const filename = 'Assessment-case-' + veilig + '.doc';
  const bytes = new TextEncoder().encode(html);
  const _st = await hrStoreCandidateDoc(env, cleanTaskId(taskId), 'case', filename, bytes, 'application/msword');
  const _cu = hrClickupId(cand, taskId);
  if (_cu) { try { await cu.comment(env, _cu, '🧪 [ASSESSMENT-CASE gegenereerd' + (cand.vacature ? ' · ' + cand.vacature : '') + '] In het dossier bewaard.', false); } catch (e) { /* */ } }
  return { status: 200, body: { ok: true, tekst, functie: cand.vacature, doc_url: _st.docUrl, doc_id: _st.docId } };
}

// teamSolStatus: admin-gegate status-wijziging voor sollicitatie-/kandidaattaken
// (teamStatus is enkel okStaff; HR-data mag enkel de zaakvoerder bewegen).
export async function teamSolStatus(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id);
  const status = str(body.status).toLowerCase().trim();
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  if (!status || status.length > 80) return { status: 400, body: { ok: false, error: 'bad_status' } };
  // D1 = bron-van-waarheid zodra gemigreerd.
  if (env.HRDB && (await hrCount(env)) > 0) {
    const canon = await hrSetStatus(env, taskId, status);
    // 'aangenomen' → automatisch een onboarding-persoon aanmaken (idempotent).
    if (canon === 'aangenomen') { try { const c = await hrGet(env, taskId); if (c) await obAddFromCandidate(env, c); } catch (e) { /* */ } }
    return { status: 200, body: { ok: true, status: canon } };
  }
  const r = await cu.put(env, `/task/${taskId}`, { status });
  if (!r.ok) return { status: 200, body: { ok: false, error: 'update_failed' } };
  return { status: 200, body: { ok: true, status: statusMapper(r.data && r.data.status) } };
}

// teamKandidaatSpam: markeer/ontmarkeer als spam, schrijft de Spam-checkbox + de
// gecachte AI-vlag + (indien aanwezig) een spam-status, zodat de markering ALTIJD
// persisteert na herladen, ongeacht of het Spam-veld in ClickUp bestaat.
export async function teamKandidaatSpam(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const spam = body.spam !== false;   // default true
  // D1 = bron-van-waarheid zodra gemigreerd.
  if (env.HRDB && (await hrCount(env)) > 0) { await hrSetSpam(env, taskId, spam); return { status: 200, body: { ok: true, spam } }; }
  const fmap = await hrFieldMap(env);
  await hrWriteField(env, taskId, fmap, 'spam', spam);
  try { const c = await env.KV.get('sol:score:' + taskId, 'json'); const ai = (c && typeof c === 'object') ? c : {}; ai.spam = spam; await env.KV.put('sol:score:' + taskId, JSON.stringify(ai), { expirationTtl: 90 * 24 * 3600 }); } catch (e) { /* */ }
  try {
    const lr = await cu.get(env, `/list/${SOLLICITATIE_LIST}`);
    const sps = (lr.ok && lr.data && Array.isArray(lr.data.statuses)) ? lr.data.statuses.filter((s) => /spam/i.test(str(s.status)))[0] : null;
    if (spam && sps) await cu.put(env, `/task/${taskId}`, { status: str(sps.status) });
  } catch (e) { /* */ }
  return { status: 200, body: { ok: true, spam } };
}

// teamKandidaatContract (Golf HR-4): AI genereert een Belgisch arbeidscontract-VOORSTEL
// (bepaalde/onbepaalde duur) als Word-document, hangt het aan de kandidaat-taak en geeft
// de HTML terug zodat de frontend het als .doc kan downloaden. ID-nummer/geboortedatum
// worden enkel transient gebruikt (niet in KV bewaard).
const HR_ESC = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Lichte Markdown -> veilige HTML (headings/lijsten/bold) voor gegenereerde dossierdocs.
function hrMdToHtml(md) {
  const inline = (s) => HR_ESC(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  const out = []; let inList = false;
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { closeList(); continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { closeList(); const lvl = h[1].length; out.push('<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>'); continue; }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) { if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>' + inline(li[1]) + '</li>'); continue; }
    closeList(); out.push('<p>' + inline(line) + '</p>');
  }
  closeList();
  return out.join('\n');
}
// Word-compatibele HTML-shell (opent/bewerkt in Word, downloadbaar als .doc).
function hrWordDocHtml(titel, inner, disclaimer) {
  return '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + HR_ESC(titel) + '</title>'
    + '<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a1a1a;line-height:1.5;} h1{font-size:18pt;color:#2a2530;} h2{font-size:12.5pt;color:#5e50c8;margin-top:16pt;} h3{font-size:11.5pt;color:#5e50c8;} .disc{font-size:8.5pt;color:#888;border-top:1px solid #ddd;margin-top:24pt;padding-top:8pt;}</style></head><body>'
    + inner
    + (disclaimer ? '<p class="disc">' + HR_ESC(disclaimer) + '</p>' : '')
    + '</body></html>';
}
// Herbruikbaar: een gegenereerd document in het portaal-dossier bewaren (R2 + D1) en een
// getekende /hrfile-link teruggeven. Eén plek voor contract, case en toekomstige docs.
async function hrStoreCandidateDoc(env, candId, kind, filename, bytes, contentType, mailId) {
  let docUrl = '', docId = '';
  try {
    if (env.R2 && env.HRDB) {
      docId = 'doc_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      const safe = String(filename || 'document').replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'document';
      const key = 'hrdocs/' + candId + '/' + docId + '/' + safe;
      await env.R2.put(key, bytes, { httpMetadata: { contentType }, customMetadata: { candidateId: candId, kind } });
      await docInsert(env, { id: docId, candidate_id: candId, kind, r2_key: key, filename: safe, content_type: contentType, size: bytes.length, mail_id: str(mailId || '') });
      docUrl = await signedHrFileUrl(env, key);
    }
  } catch (e) { /* */ }
  return { docUrl, docId };
}

/* ---- veilige mailbijlagen: extensie-allowlist + grootte-cap (geen executables) -- */
const HR_ATT_MAX = 15 * 1024 * 1024;   // 15 MB
const HR_ATT_TYPES = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv', rtf: 'application/rtf', odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet',
};
// Verdachte/gevaarlijke extensies die we NOOIT opslaan (uitvoerbaar / script / macro / archief).
const HR_ATT_BLOCK = /\.(exe|scr|bat|cmd|com|pif|msi|dll|js|jse|vbs|vbe|wsf|wsh|ps1|sh|jar|apk|app|deb|dmg|gadget|hta|cpl|reg|lnk|iso|img|zip|rar|7z|gz|tar|ace|cab|z|bz2|docm|xlsm|pptm|dotm)$/i;
function hrAttExt(name) { const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; }
function hrAttSafe(name) {
  const n = String(name || '').trim();
  if (!n || n.length > 200) return false;
  if (/[\\/]/.test(n) || n.includes('..')) return false;     // pad-injectie
  if (HR_ATT_BLOCK.test(n)) return false;                    // geblokkeerde extensie
  const dots = n.split('.').length - 1;                       // dubbele extensie (cv.pdf.exe) → verdacht
  if (dots > 1 && HR_ATT_BLOCK.test('.' + n.split('.').slice(-2)[0])) return false;
  return !!HR_ATT_TYPES[hrAttExt(n)];                         // enkel expliciete allowlist
}
function hrAttType(name) { return HR_ATT_TYPES[hrAttExt(name)] || 'application/octet-stream'; }
export async function teamKandidaatContract(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const cand = await hrCandResolve(env, taskId);
  if (!cand) return { status: 200, body: { ok: false, error: 'not_found' } };
  const duur = (str(body.duur) === 'bepaald') ? 'bepaald' : 'onbepaald';
  const einddatum = str(body.einddatum).trim();
  const idnr = str(body.id_nummer).trim();
  const geboorte = str(body.geboortedatum).trim();
  const functie = str(body.functie).trim() || cand.vacature || '';
  const startdatum = str(body.startdatum).trim();
  const loon = str(body.loon).trim();
  const sys = 'Je bent juridisch-administratief assistent van Studio 27, een Vlaams marketing- en communicatiebureau (werkgever, gevestigd in Hoogstraten, België). Stel een Belgisch arbeidsovereenkomst-VOORSTEL op naar Belgisch arbeidsrecht. BELANGRIJK: dit is een ontwerp dat nog door het sociaal secretariaat / een jurist nagekeken moet worden; gebruik [in te vullen door Studio 27]-placeholders waar gegevens ontbreken (zoals brutoloon, exacte arbeidsduur, paritair comité, ondernemingsnummer). Antwoord UITSLUITEND met nette HTML voor de body (gebruik <h1> voor de titel, <h2> voor artikelkoppen, <p>, <ul>/<li>; GEEN <html>/<head>/<style>-tags, GEEN markdown, GEEN uitleg eromheen). Schrijf in correct, formeel Nederlands (Vlaams).';
  const user = [
    'Type contract: arbeidsovereenkomst van ' + (duur === 'bepaald' ? ('BEPAALDE duur' + (einddatum ? ' (einddatum ' + einddatum + ')' : '')) : 'ONBEPAALDE duur') + '.',
    'Werkgever: Studio 27 (marketing- en communicatiebureau, Hoogstraten).',
    'Werknemer: ' + (cand.naam || '[naam]') + (geboorte ? (', geboren op ' + geboorte) : '') + (idnr ? (', rijksregister-/identiteitskaartnummer ' + idnr) : '') + '.',
    'Functie: ' + (functie || '[functie]') + '.',
    startdatum ? ('Aanvangsdatum: ' + startdatum + '.') : 'Aanvangsdatum: [in te vullen].',
    loon ? ('Brutoloon: ' + loon + '.') : 'Brutoloon: [in te vullen].',
    'Neem de gebruikelijke artikelen op: partijen, functie en taken, plaats van tewerkstelling, aanvang en duur, arbeidsduur en uurrooster, loon en voordelen, jaarlijkse vakantie, geheimhouding, opzegging conform de Wet van 3 juli 1978, en slotbepalingen met handtekeningvelden voor werkgever en werknemer. Houd het beknopt en correct.',
  ].join('\n');
  const res = await aiComplete(env, AI_MODEL, sys, user, 2600, { skill: 'hr:contract' });
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: str((res && res.err) || 'ai_fout') } };
  let inner = str(res.text).trim().replace(/^```html?\s*/i, '').replace(/```$/i, '').trim();
  const titel = 'Arbeidsovereenkomst ' + (cand.naam || '') + ' - Studio 27';
  const html = hrWordDocHtml(titel, inner, 'Dit is een door AI gegenereerd ontwerp. Laat het nakijken door je sociaal secretariaat of een jurist vóór ondertekening.');
  const veilig = (cand.naam || 'kandidaat').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kandidaat';
  const filename = 'Arbeidsovereenkomst-' + veilig + '.doc';
  const bytes = new TextEncoder().encode(html);
  // Bron-van-waarheid: het contract in het portaal-dossier bewaren (R2 + D1), zodat het
  // downloadbaar/zichtbaar blijft bij de kandidaat i.p.v. enkel een eenmalige download.
  const _st = await hrStoreCandidateDoc(env, cleanTaskId(taskId), 'contract', filename, bytes, 'application/msword');
  const docUrl = _st.docUrl, docId = _st.docId;
  // + best-effort als ClickUp-bijlage (zolang de taak nog bestaat).
  let attached = false;
  const _cu = hrClickupId(cand, taskId);
  if (_cu) {
    try { const ar = await cu.uploadAttachment(env, _cu, bytes, filename); attached = !!(ar && ar.ok); } catch (e) { /* */ }
    try { await cu.comment(env, _cu, '📄 [CONTRACTVOORSTEL gegenereerd · ' + (duur === 'bepaald' ? 'bepaalde duur' : 'onbepaalde duur') + ']' + (attached ? ' Als bijlage toegevoegd.' : ''), false); } catch (e) { /* */ }
  }
  return { status: 200, body: { ok: true, html, filename, naam: cand.naam, attached, doc_url: docUrl, doc_id: docId } };
}

/* ===========================================================================
 * HR-5: e-mail-import (Cloudflare-native), antwoorden + cv's van een kandidaat
 * uit de marketing@-inbox halen en aan de kandidaat-taak hangen. Auth = SA via DWD
 * met gmail.readonly. FAIL-SOFT: zonder die scope geeft het 'no_scope' terug.
 * HR-6: in-taak transcriptie, opgenomen audio → Whisper (OPENAI_API_KEY) → comment
 * + AI-samenvatting voor de Analyse-fase. FAIL-SOFT zonder key.
 * =========================================================================== */
const GMAIL_READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const HR_MAIL_SUBJECT = 'marketing@studio27.be';
function b64urlToBytes(s) {
  s = String(s || '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}
function b64ToBytes(s) { const bin = atob(String(s || '')); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
function gmailWalk(part, fn) { if (!part) return; fn(part); const ps = part.parts || []; for (const p of ps) gmailWalk(p, fn); }
function gmailText(payload) {
  let txt = '';
  gmailWalk(payload, (p) => { if (!txt && p.mimeType === 'text/plain' && p.body && p.body.data) txt = new TextDecoder().decode(b64urlToBytes(p.body.data)); });
  if (!txt) gmailWalk(payload, (p) => { if (!txt && p.mimeType === 'text/html' && p.body && p.body.data) txt = new TextDecoder().decode(b64urlToBytes(p.body.data)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); });
  return txt;
}
function gmailAttachments(payload) {
  const out = [];
  gmailWalk(payload, (p) => { if (p.filename && p.body && p.body.attachmentId) out.push({ id: p.body.attachmentId, filename: p.filename }); });
  return out;
}
export async function teamKandidaatMailSync(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id); if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const tr = await cu.get(env, `/task/${taskId}`); if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const fmap = await hrFieldMap(env); const cand = parseSollicitatie(tr.data, fmap);
  if (!cand.email) return { status: 200, body: { ok: false, error: 'geen_email' } };
  let token;
  try { token = await mintGoogleToken(env, HR_MAIL_SUBJECT, GMAIL_READ_SCOPE); } catch (e) { return { status: 200, body: { ok: false, error: 'no_scope', message: 'Gmail-leestoegang (gmail.readonly) is nog niet toegekend aan de service-account.' } }; }
  const q = encodeURIComponent('from:' + cand.email);
  const lr = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=' + q, { headers: { Authorization: 'Bearer ' + token } });
  const ld = await lr.json().catch(() => null);
  if (!lr.ok) return { status: 200, body: { ok: false, error: 'gmail_fout', detail: str(ld && ld.error && ld.error.message) } };
  const msgs = (ld && Array.isArray(ld.messages)) ? ld.messages : [];
  const seenKey = 'hr:mailseen:' + taskId;
  let seen = {}; try { seen = (await env.KV.get(seenKey, 'json')) || {}; } catch (e) { /* */ }
  let imported = 0;
  for (const m of msgs.slice(0, 10)) {
    if (seen[m.id]) continue;
    const mg = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + m.id + '?format=full', { headers: { Authorization: 'Bearer ' + token } });
    const md = await mg.json().catch(() => null); if (!md) continue;
    const hs = (md.payload && md.payload.headers) || [];
    const subj = str((hs.find((h) => h.name.toLowerCase() === 'subject') || {}).value);
    const date = str((hs.find((h) => h.name.toLowerCase() === 'date') || {}).value);
    const txt = gmailText(md.payload);
    try { await cu.comment(env, taskId, '📥 [MAIL VAN KANDIDAAT · ' + date + ']\n' + subj + '\n\n' + txt.slice(0, 3000), false); } catch (e) { /* */ }
    const atts = gmailAttachments(md.payload);
    for (const a of atts.slice(0, 5)) {
      try {
        const ag = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + m.id + '/attachments/' + a.id, { headers: { Authorization: 'Bearer ' + token } });
        const ad = await ag.json().catch(() => null);
        if (ad && ad.data) await cu.uploadAttachment(env, taskId, b64urlToBytes(ad.data), a.filename || 'bijlage');
      } catch (e) { /* */ }
    }
    seen[m.id] = 1; imported++;
  }
  try { await env.KV.put(seenKey, JSON.stringify(seen), { expirationTtl: 180 * 24 * 3600 }); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, imported, total: msgs.length } };
}

/* ===========================================================================
 * IN-PORTAAL MAILVERKEER + DOSSIERDOCUMENTEN (single source of truth)
 * Het volledige mailverkeer en alle gegenereerde documenten blijven BINNEN het
 * portaal: D1 (candidate_mails / candidate_docs) is de bron, Gmail verrijkt enkel
 * het inkomende deel. Geen externe Gmail-tab, geen losse downloads.
 * =========================================================================== */
// E-mailadres uit een From-header halen ("Naam" <x@y> | x@y).
function hrEmailOf(fromHeader) { const s = str(fromHeader); const m = s.match(/<([^>]+)>/); return (m ? m[1] : s).trim().toLowerCase(); }

// Eén Gmail-bericht als inkomende mail in D1 opslaan + veilige bijlagen in het dossier.
// Gmail blokkeert upstream al bekende malware; wij filteren extra op extensie + grootte.
async function hrIngestInbound(env, candId, token, gmailId) {
  const mg = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + gmailId + '?format=full', { headers: { Authorization: 'Bearer ' + token } });
  const md = await mg.json().catch(() => null); if (!md) return 0;
  const hs = (md.payload && md.payload.headers) || [];
  const hv = (n) => str((hs.find((h) => h.name.toLowerCase() === n) || {}).value);
  const subj = hv('subject');
  const fromH = hv('from');
  const dateStr = hv('date');
  const txt = gmailText(md.payload);
  let ts = Date.parse(dateStr); if (isNaN(ts)) ts = Number(md.internalDate) || Date.now();
  const atts = gmailAttachments(md.payload).filter((a) => hrAttSafe(a.filename));
  const mailId = 'mail_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const ins = await mailInsert(env, { id: mailId, candidate_id: candId, direction: 'in', from_addr: fromH || HR_MAIL_SUBJECT, to_addr: HR_MAIL_SUBJECT, subject: subj, body: txt.slice(0, 18000), gmail_id: gmailId, created_at: ts, read: 0, has_attach: atts.length ? 1 : 0 });
  if (!ins || !ins.inserted) return 0;   // bestond al (race/dubbele sync) → geen dubbele rij of bijlagen
  for (const a of atts.slice(0, 8)) {
    try {
      const ag = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + gmailId + '/attachments/' + a.id, { headers: { Authorization: 'Bearer ' + token } });
      const ad = await ag.json().catch(() => null);
      if (!ad || !ad.data) continue;
      const bytes = b64urlToBytes(ad.data);
      if (!bytes.length || bytes.length > HR_ATT_MAX) continue;
      await hrStoreCandidateDoc(env, candId, 'mailbijlage', a.filename, bytes, hrAttType(a.filename), mailId);
    } catch (e) { /* */ }
  }
  return 1;
}

// Inkomende mails van één kandidaat ophalen (from:email), dedup op gmail_id. Fail-soft no_scope.
async function hrFetchInboundMails(env, candId, email) {
  let token;
  try { token = await mintGoogleToken(env, HR_MAIL_SUBJECT, GMAIL_READ_SCOPE); } catch (e) { return { ok: false, reason: 'no_scope' }; }
  const q = encodeURIComponent('from:' + email + ' newer_than:1y');
  const lr = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=' + q, { headers: { Authorization: 'Bearer ' + token } });
  const ld = await lr.json().catch(() => null);
  if (!lr.ok) return { ok: false, reason: 'gmail_error' };
  const list = (ld && Array.isArray(ld.messages)) ? ld.messages : [];
  const seen = await mailSeenGmail(env, candId);
  let imported = 0;
  for (const m of list.slice(0, 20)) { if (seen[m.id]) continue; try { imported += await hrIngestInbound(env, candId, token, m.id); } catch (e) { /* */ } }
  return { ok: true, imported };
}

// hrSyncInbox: globaal — scan de HR-mailbox op recente inkomende mails, match de afzender
// op een kandidaat-e-mailadres en sla nieuwe berichten (+ bijlagen) op. Voedt de notificaties
// zonder dat elke kandidaat geopend moet worden. Wordt uurlijks (cron) + on-demand gedraaid.
export async function hrSyncInbox(env, opts) {
  opts = opts || {};
  if (!env.HRDB) return { ok: false, reason: 'no_d1' };
  let token;
  try { token = await mintGoogleToken(env, HR_MAIL_SUBJECT, GMAIL_READ_SCOPE); } catch (e) { return { ok: false, reason: 'no_scope' }; }
  const cands = await hrList(env);
  const byEmail = {};
  for (const c of cands) { const e = str(c.email).trim().toLowerCase(); if (e) byEmail[e] = c.id; }
  if (!Object.keys(byEmail).length) return { ok: true, imported: 0, scanned: 0 };
  const days = Math.max(1, Math.min(60, Number(opts.days) || 14));
  const max = Math.max(5, Math.min(120, Number(opts.max) || 80));
  const lr = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=' + max + '&q=' + encodeURIComponent('newer_than:' + days + 'd -in:sent -in:chats'), { headers: { Authorization: 'Bearer ' + token } });
  const ld = await lr.json().catch(() => null);
  if (!lr.ok) return { ok: false, reason: 'gmail_error' };
  const list = (ld && Array.isArray(ld.messages)) ? ld.messages : [];
  const seenCache = {};
  let imported = 0, scanned = 0;
  for (const m of list.slice(0, max)) {
    scanned++;
    try {
      const mr = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + m.id + '?format=metadata&metadataHeaders=From', { headers: { Authorization: 'Bearer ' + token } });
      const mdm = await mr.json().catch(() => null); if (!mdm) continue;
      const fromH = str(((mdm.payload && mdm.payload.headers) || []).map((h) => (h.name.toLowerCase() === 'from' ? h.value : '')).join(''));
      const candId = byEmail[hrEmailOf(fromH)];
      if (!candId) continue;
      if (!seenCache[candId]) seenCache[candId] = await mailSeenGmail(env, candId);
      if (seenCache[candId][m.id]) continue;
      imported += await hrIngestInbound(env, candId, token, m.id);
      seenCache[candId][m.id] = 1;
    } catch (e) { /* */ }
  }
  return { ok: true, imported, scanned };
}

// teamKandidaatMailThread: het volledige mailverkeer met een kandidaat IN het portaal.
// D1 = bron (uitgaand altijd zichtbaar); Gmail vult inkomend aan zodra gmail.readonly
// is toegekend. mailbox: 'live' (Gmail mee) | 'no_scope' (enkel portaal-log) | 'partial'.
export async function teamKandidaatMailThread(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const cand = await hrCandResolve(env, taskId);
  if (!cand) return { status: 200, body: { ok: false, error: 'not_found' } };
  let mailbox = 'partial';
  if (cand.email && str(body.sync) !== '0') {
    try {
      const inb = await hrFetchInboundMails(env, taskId, cand.email);
      if (inb && inb.ok) mailbox = 'live';
      else if (inb && inb.reason === 'no_scope') mailbox = 'no_scope';
    } catch (e) { /* */ }
  }
  let msgs = [];
  try {
    const raw = await mailList(env, taskId);
    for (const m of raw) {
      let atts = [];
      if (m.has_attach) {
        try {
          const docs = await docByMail(env, m.id);
          for (const d of docs) { let url = ''; try { url = await signedHrFileUrl(env, d.r2_key); } catch (e) { url = ''; } atts.push({ id: d.id, filename: d.filename, url, content_type: d.content_type, size: d.size }); }
        } catch (e) { atts = []; }
      }
      msgs.push({ id: m.id, direction: m.direction, from: m.from_addr, to: m.to_addr, subject: m.subject, body: m.body, date: m.created_at, read: m.read, has_attach: m.has_attach, attachments: atts });
    }
  } catch (e) { msgs = []; }
  msgs.sort((a, b) => (a.date || 0) - (b.date || 0));
  return { status: 200, body: { ok: true, email: cand.email, naam: cand.naam, mailbox, messages: msgs } };
}

// teamKandidaatMailSend: vrije mail (Aan/Onderwerp/Body) vanuit het portaal versturen.
// Verstuurt via Gmail (DWD) en logt uitgaand in D1 → verschijnt meteen in de thread.
export async function teamKandidaatMailSend(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const cand = await hrCandResolve(env, taskId);
  if (!cand) return { status: 200, body: { ok: false, error: 'not_found' } };
  const to = str(body.to || cand.email).trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { status: 200, body: { ok: false, error: 'geen_email', message: 'Geen geldig e-mailadres.' } };
  const subject = str(body.subject).trim().slice(0, 200) || 'Studio 27';
  const tekst = str(body.body).trim();
  if (!tekst) return { status: 200, body: { ok: false, error: 'leeg', message: 'De mail is leeg.' } };
  const r = await sendGmail(env, { to, subject, body: tekst, fromName: 'Studio 27', replyTo: 'marketing@studio27.be' });
  if (!r.ok) return { status: 200, body: { ok: false, error: 'mail_failed', message: 'Versturen is mislukt.' } };
  try { await mailInsert(env, { candidate_id: taskId, direction: 'out', from_addr: 'no-reply@studio27.be', to_addr: to, subject, body: tekst }); } catch (e) { /* */ }
  const _cu = hrClickupId(cand, taskId);
  if (_cu) { try { await cu.comment(env, _cu, '✉️ [MAIL VERZONDEN]\nNaar: ' + to + '\nOnderwerp: ' + subject + '\n\n' + tekst, false); } catch (e) { /* */ } }
  return { status: 200, body: { ok: true, sent: true } };
}

// teamKandidaatDocs: documenten van een kandidaat (CV + gegenereerde dossierdocs),
// elk met een getekende, expirerende /hrfile-link om in het portaal te downloaden/openen.
export async function teamKandidaatDocs(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const cand = await hrCandResolve(env, taskId);
  const out = [];
  if (cand && cand.cv_url) out.push({ id: 'cv', kind: 'cv', title: 'CV', filename: 'CV', url: cand.cv_url, external: true, created_at: (cand && cand.ts) || 0 });
  let rows = [];
  try { rows = await docList(env, taskId); } catch (e) { rows = []; }
  for (const d of rows) {
    let url = '';
    try { url = await signedHrFileUrl(env, d.r2_key); } catch (e) { url = ''; }
    const title = d.kind === 'contract' ? 'Contractvoorstel' : (d.kind === 'case' ? 'Assessment-case' : (d.filename || 'Document'));
    out.push({ id: d.id, kind: d.kind, title, filename: d.filename, url, external: false, content_type: d.content_type, size: d.size, created_at: d.created_at });
  }
  return { status: 200, body: { ok: true, docs: out } };
}

// teamHrNotifs: ongelezen nieuwe berichten van kandidaten (voor de bel-notificaties).
// Doet (hooguit) elke 5 min een lichte inbox-sync zodat nieuwe mails opduiken zonder
// elke kandidaat te openen; daarbuiten enkel D1 lezen. Fail-soft zonder gmail.readonly.
export async function teamHrNotifs(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  let mailbox = '';
  try { mailbox = str(await env.KV.get('hr:inbox:state')); } catch (e) { /* */ }
  try {
    let last = 0; try { last = Number(await env.KV.get('hr:inbox:lastsync')) || 0; } catch (e) { /* */ }
    if (env.HRDB && (Date.now() - last > 5 * 60 * 1000)) {
      const r = await hrSyncInbox(env, { days: 7, max: 25 });   // lichte on-demand sync; de cron doet de brede
      mailbox = (r && r.ok) ? 'live' : (r && r.reason === 'no_scope' ? 'no_scope' : 'error');
      try { await env.KV.put('hr:inbox:state', mailbox); if (r && r.ok) await env.KV.put('hr:inbox:lastsync', String(Date.now())); } catch (e) { /* */ }
    }
  } catch (e) { /* */ }
  const items = await mailUnread(env, 30);
  const count = await mailUnreadCount(env);
  return { status: 200, body: { ok: true, items, count, mailbox } };
}

// teamHrNotifMark: markeer een specifieke mail (mail_id) of alles ('all') als gelezen.
export async function teamHrNotifMark(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (body && (body.all === true || str(body.all) === '1')) { await mailMarkAllRead(env); }
  else { const id = str(body && body.mail_id).trim(); if (id) await mailMarkRead(env, id); }
  return { status: 200, body: { ok: true, count: await mailUnreadCount(env) } };
}

export async function teamKandidaatTranscribe(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = cleanTaskId(body.task_id); if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const key = str(env.OPENAI_API_KEY);
  if (!key) return { status: 200, body: { ok: false, error: 'no_transcribe_key', message: 'Transcriptie vereist een OPENAI_API_KEY (Whisper) in de worker.' } };
  const b64 = str(body.audio_b64); if (!b64) return { status: 400, body: { ok: false, error: 'no_audio' } };
  let bytes; try { bytes = b64ToBytes(b64); } catch (e) { return { status: 400, body: { ok: false, error: 'bad_audio' } }; }
  if (bytes.length > 24 * 1024 * 1024) return { status: 200, body: { ok: false, error: 'te_groot', message: 'De opname is te groot (max 24 MB).' } };
  // Safari/iPhone neemt mp4 op i.p.v. webm; Whisper leidt het formaat af uit de
  // bestandsnaam, dus de extensie moet bij het echte mimetype passen.
  const mime = str(body.mime) || 'audio/webm';
  const ext = /mp4|m4a|aac/i.test(mime) ? 'mp4' : /mpeg|mp3/i.test(mime) ? 'mp3' : /wav/i.test(mime) ? 'wav' : (/ogg|opus/i.test(mime) && !/webm/i.test(mime)) ? 'ogg' : 'webm';
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: mime }), 'gesprek.' + ext);
  fd.append('model', 'whisper-1');
  fd.append('language', 'nl');
  fd.append('response_format', 'verbose_json');   // identieke .text + extra .duration (sec) voor de kostenmonitor
  let wr;
  try { wr = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd }); } catch (e) { return { status: 200, body: { ok: false, error: 'netwerk' } }; }
  const wd = await wr.json().catch(() => null);
  if (!wr.ok || !wd || !wd.text) return { status: 200, body: { ok: false, error: 'transcribe_fout', detail: str(wd && wd.error && wd.error.message) } };
  try { await logAiUsage(env, { platform: 'team', skill: 'hr:transcriptie', model: 'whisper-1', audio_sec: Number(wd.duration) || 0, member_id: rr.me && rr.me.id, member_naam: rr.me && rr.me.naam, bedrijf_id: taskId }); } catch (e) { /* */ }
  const transcript = str(wd.text).trim();
  let samenvatting = '';
  try { const res = await aiComplete(env, AI_MODEL, 'Je bent wervingsassistent van Studio 27. Vat dit sollicitatiegesprek bondig samen in het Nederlands: sterke punten, aandachtspunten, en een helder advies (doorgaan naar de volgende ronde of niet, met reden). Beknopt.', 'Transcriptie van het gesprek:\n' + transcript.slice(0, 12000), 700, { skill: 'hr:transcriptie-samenvatting', member_id: rr.me && rr.me.id, member_naam: rr.me && rr.me.naam, bedrijf_id: taskId }); if (res && res.text) samenvatting = str(res.text).trim(); } catch (e) { /* */ }
  try { await cu.comment(env, taskId, '🎙️ [MEETING-TRANSCRIPTIE]\n\n' + (samenvatting ? ('SAMENVATTING:\n' + samenvatting + '\n\n...\n\n') : '') + transcript.slice(0, 12000), false); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, transcript, samenvatting } };
}

/* ===========================================================================
 * VACATURES-BEHEER (Golf HR-2). Webflow CMS open/dicht + nieuwe uit template.
 * Enkel zaakvoerder. FAIL-SOFT: zonder env.WEBFLOW_TOKEN geeft alles netjes
 * 'geen_token' terug (zelfde patroon als de Twilio-secrets) en activeert het
 * zich automatisch zodra Vincent het token zet. Webflow Data API v2.
 * Vacatures-collectie 68a46f38..., Diensten-ref 68a5bdd3..., Switch-veld 'actief'.
 * =========================================================================== */
const WF_BASE = 'https://api.webflow.com/v2';
const VACATURES_COLL = '68a46f38f22e381d13568798';
const DIENSTEN_COLL = '68a5bdd30a0e760b1f375345';
const WF_SITE = '6836e01bc97620980f99aab1';
async function wfFetch(env, path, opts) {
  const token = str(env.WEBFLOW_TOKEN);
  if (!token) return { ok: false, status: 0, noToken: true };
  opts = opts || {};
  try {
    const r = await fetch(WF_BASE + path, {
      method: opts.method || 'GET',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', accept: 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const d = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data: d };
  } catch (e) { return { ok: false, status: 0, error: 'network' }; }
}
const DIENSTEN_CK = 'team:wf:diensten:v1';
async function dienstenMap(env) {
  try { const h = await env.KV.get(DIENSTEN_CK, 'json'); if (h && typeof h === 'object') return h; } catch (e) { /* */ }
  const map = {};
  const r = await wfFetch(env, `/collections/${DIENSTEN_COLL}/items?limit=100`);
  if (r.ok && r.data && Array.isArray(r.data.items)) for (const it of r.data.items) { const fd = it.fieldData || {}; map[str(it.id)] = str(fd.name); }
  try { await env.KV.put(DIENSTEN_CK, JSON.stringify(map), { expirationTtl: 6 * 3600 }); } catch (e) { /* */ }
  return map;
}
// Volledig (dynamisch) veldschema van de Vacatures-collectie uit Webflow, zodat de portaal-editor
// 1:1 meeloopt met de custom fields zoals ze in Webflow staan (en automatisch mee verandert als
// Vincent ze daar aanpast). 'slug' blijft read-only (URL); de rest is bewerkbaar. 6u-cache.
const VAC_SCHEMA_CK = 'team:wf:vacschema:v2';
async function vacFields(env, force) {
  if (!force) { try { const h = await env.KV.get(VAC_SCHEMA_CK, 'json'); if (h && Array.isArray(h) && h.length) return h; } catch (e) { /* */ } }
  const r = await wfFetch(env, `/collections/${VACATURES_COLL}`);
  let fields = [];
  if (r.ok && r.data && Array.isArray(r.data.fields)) {
    fields = r.data.fields
      .filter((f) => f && f.isEditable && f.slug !== 'slug')
      .map((f) => ({ slug: str(f.slug), label: str(f.displayName), type: str(f.type), required: !!f.isRequired, help: str(f.helpText || ''), ref_coll: str((f.validations && f.validations.collectionId) || ''), maxLength: Number(f.validations && f.validations.maxLength) || 0, opts: (f.validations && Array.isArray(f.validations.options)) ? f.validations.options.map((o) => ({ id: str(o.id), name: str(o.name) })) : [] }));
  }
  try { if (fields.length) await env.KV.put(VAC_SCHEMA_CK, JSON.stringify(fields), { expirationTtl: 6 * 3600 }); } catch (e) { /* */ }
  return fields;
}
function vacShape(it, dmap) {
  const fd = it.fieldData || {};
  const diensten = (Array.isArray(fd['voor-welke-dienst']) ? fd['voor-welke-dienst'] : []).map((id) => dmap[str(id)] || '').filter(Boolean);
  // 'actief' = ECHT live: de CMS-toggle AÉN gepubliceerd (niet draft, niet gearchiveerd). Een
  // gearchiveerde/draft-vacature met de actief-vinkje nog aan heeft GEEN live pagina (404), dus
  // telt niet als open functie.
  const live = !it.isDraft && !it.isArchived;
  return { id: str(it.id), name: str(fd.name), slug: str(fd.slug), actief: !!fd.actief && live, actief_flag: !!fd.actief, intro: str(fd['introductietekst-beknopt']), diensten, is_draft: !!it.isDraft, is_archived: !!it.isArchived, last_published: str(it.lastPublished || ''), url: 'https://www.studio27.be/vacatures/' + str(fd.slug) };
}
export async function teamVacatures(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Vacaturebeheer is enkel voor de zaakvoerder.' } };
  if (!str(env.WEBFLOW_TOKEN)) return { status: 200, body: { ok: true, items: [], geen_token: true } };
  const [r, dmap] = await Promise.all([wfFetch(env, `/collections/${VACATURES_COLL}/items?limit=100`), dienstenMap(env)]);
  if (!r.ok) return { status: 200, body: { ok: false, error: 'webflow_fout', status: r.status } };
  const items = ((r.data && r.data.items) || []).map((it) => vacShape(it, dmap))
    .sort((a, b) => (b.actief ? 1 : 0) - (a.actief ? 1 : 0) || a.name.localeCompare(b.name));
  return { status: 200, body: { ok: true, items, site: WF_SITE } };
}
export async function teamVacatureToggle(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (!str(env.WEBFLOW_TOKEN)) return { status: 200, body: { ok: false, error: 'geen_token' } };
  const id = str(body.item_id); const actief = body.actief === true;
  if (!id) return { status: 400, body: { ok: false, error: 'no_item' } };
  // live-update (zet 'actief' + publiceert het item in één call)
  let r = await wfFetch(env, `/collections/${VACATURES_COLL}/items/${id}/live`, { method: 'PATCH', body: { fieldData: { actief } } });
  if (!r.ok) {
    // fallback: staged patch + publish (bv. item was nooit gepubliceerd)
    const p = await wfFetch(env, `/collections/${VACATURES_COLL}/items/${id}`, { method: 'PATCH', body: { isArchived: false, isDraft: false, fieldData: { actief } } });
    if (!p.ok) return { status: 200, body: { ok: false, error: 'webflow_fout', status: p.status, detail: str(p.data && (p.data.message || p.data.code)) } };
    await wfFetch(env, `/collections/${VACATURES_COLL}/items/publish`, { method: 'POST', body: { itemIds: [id] } });
  }
  return { status: 200, body: { ok: true, actief } };
}
export async function teamVacatureCreate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (!str(env.WEBFLOW_TOKEN)) return { status: 200, body: { ok: false, error: 'geen_token' } };
  const naam = str(body.naam).trim();
  if (!naam) return { status: 400, body: { ok: false, error: 'geen_naam' } };
  const tmplId = str(body.template_id);
  let fd = { 'alt-tekst': 'Vacature ' + naam + ' bij Studio 27.', 'voor-welke-dienst': [] };
  // AI-pad (geen template): de meegegeven AI-velden + hergebruikte foto/dienst gebruiken.
  if (body.ai_velden && typeof body.ai_velden === 'object') {
    const v = body.ai_velden;
    fd = {
      'introductietekst-beknopt': str(v.intro || ''),
      'alt-tekst': (str(v.alt || ('Vacature ' + naam + ' bij Studio 27.'))).slice(0, 150),
      'voor-welke-dienst': Array.isArray(body.dienst_ids) ? body.dienst_ids.map((x) => str(x)) : [],
      'wat-mag-de-sollicitant-verwachten': str(v.verwachten || ''),
      'wat-kan-je-de-sollicitant-aanbieden': str(v.aanbieden || ''),
      'profiel-van-de-sollicitant': str(v.profiel || ''),
    };
    if (str(body.foto_file_id)) fd['afbeelding-max-150-kb'] = { fileId: str(body.foto_file_id) };
  } else if (tmplId) {
    const tr = await wfFetch(env, `/collections/${VACATURES_COLL}/items/${tmplId}`);
    if (tr.ok && tr.data && tr.data.fieldData) {
      const t = tr.data.fieldData;
      fd = {
        'introductietekst-beknopt': str(t['introductietekst-beknopt']),
        'alt-tekst': str(t['alt-tekst'] || ('Vacature ' + naam + ' bij Studio 27.')).slice(0, 150),
        'voor-welke-dienst': Array.isArray(t['voor-welke-dienst']) ? t['voor-welke-dienst'] : [],
        'wat-mag-de-sollicitant-verwachten': str(t['wat-mag-de-sollicitant-verwachten']),
        'wat-kan-je-de-sollicitant-aanbieden': str(t['wat-kan-je-de-sollicitant-aanbieden']),
        'profiel-van-de-sollicitant': str(t['profiel-van-de-sollicitant']),
      };
      if (t['afbeelding-max-150-kb'] && t['afbeelding-max-150-kb'].fileId) fd['afbeelding-max-150-kb'] = { fileId: t['afbeelding-max-150-kb'].fileId };
    }
  }
  // 'voor-welke-dienst' is een REQUIRED MultiReference in Webflow \u2192 een lege array wordt
  // geweigerd. Vang dit netjes af i.p.v. de create te laten knallen op validatie.
  if (!Array.isArray(fd['voor-welke-dienst']) || fd['voor-welke-dienst'].length === 0) {
    // Blanco nieuwe vacature: Webflow vereist 'voor-welke-dienst' → auto-kies de eerste dienst (de
    // gebruiker past dit aan in de multi-select van de editor).
    try { const dm = await dienstenMap(env); const firstId = Object.keys(dm)[0]; if (firstId) fd['voor-welke-dienst'] = [firstId]; } catch (e) { /* */ }
    if (!Array.isArray(fd['voor-welke-dienst']) || fd['voor-welke-dienst'].length === 0) return { status: 200, body: { ok: false, error: 'dienst_vereist', message: 'Geen dienst beschikbaar in Webflow.' } };
  }
  // Unieke slug afdwingen: Webflow dedupliceert een expliciete slug niet en faalt bij botsing.
  let slug = (naam.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)) || ('vacature-' + Date.now());
  try {
    const lst = await wfFetch(env, `/collections/${VACATURES_COLL}/items?limit=100`);
    const slugs = new Set(((lst.data && lst.data.items) || []).map((it) => str(it.fieldData && it.fieldData.slug)));
    if (slugs.has(slug)) { const base = slug.slice(0, 54); let n = 2; while (slugs.has(base + '-' + n)) n++; slug = base + '-' + n; }
  } catch (e) { /* */ }
  fd.name = naam; fd.slug = slug; fd.actief = false;
  const cr = await wfFetch(env, `/collections/${VACATURES_COLL}/items`, { method: 'POST', body: { isArchived: false, isDraft: true, fieldData: fd } });
  if (!cr.ok) return { status: 200, body: { ok: false, error: 'webflow_fout', status: cr.status, detail: str(cr.data && (cr.data.message || cr.data.code)) } };
  return { status: 200, body: { ok: true, id: str(cr.data && cr.data.id), naam, draft: true } };
}

// teamVacatureGet (HR-7): volledige velden van één vacature voor de editor.
export async function teamVacatureGet(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (!str(env.WEBFLOW_TOKEN)) return { status: 200, body: { ok: false, error: 'geen_token' } };
  const id = str(body.item_id); if (!id) return { status: 400, body: { ok: false, error: 'no_item' } };
  const [r, dmap, schema] = await Promise.all([wfFetch(env, `/collections/${VACATURES_COLL}/items/${id}`), dienstenMap(env), vacFields(env)]);
  if (!r.ok || !r.data) return { status: 200, body: { ok: false, error: 'webflow_fout' } };
  const fd = r.data.fieldData || {};
  const img = fd['afbeelding-max-150-kb'];
  // Dynamische 1:1 custom-field-lijst (bewerkbaar in het portaal, schrijft terug naar Webflow).
  const dlist = Object.entries(dmap).map(([did, dnaam]) => ({ id: did, name: dnaam }));
  const fields = schema.map((f) => {
    const raw = fd[f.slug];
    if (f.type === 'Image' || f.type === 'MultiImage') {
      const url = (raw && raw.url) ? str(raw.url) : (Array.isArray(raw) && raw[0] && raw[0].url ? str(raw[0].url) : '');
      return { ...f, value: url, display: url };
    }
    if (f.type === 'Switch') return { ...f, value: !!raw, display: raw ? 'Aan' : 'Uit' };
    if (f.type === 'MultiReference' || f.type === 'Reference') {
      const ids = Array.isArray(raw) ? raw.map(str) : (raw ? [str(raw)] : []);
      return { ...f, value: ids, display: ids.map((x) => dmap[x] || '').filter(Boolean).join(', '), options: dlist };
    }
    if (f.type === 'Option') {
      const id = str(raw == null ? '' : raw); const opt = (f.opts || []).find((o) => o.id === id);
      return { ...f, value: id, display: opt ? opt.name : id, options: f.opts || [] };
    }
    return { ...f, value: str(raw == null ? '' : raw), display: str(raw == null ? '' : raw) };
  });
  return { status: 200, body: { ok: true, item: {
    id: str(r.data.id), name: str(fd.name), slug: str(fd.slug), actief: !!fd.actief,
    intro: str(fd['introductietekst-beknopt']), alt: str(fd['alt-tekst']),
    verwachten: str(fd['wat-mag-de-sollicitant-verwachten']),
    aanbieden: str(fd['wat-kan-je-de-sollicitant-aanbieden']),
    profiel: str(fd['profiel-van-de-sollicitant']),
    image_url: (img && img.url) ? str(img.url) : '',
    diensten: (Array.isArray(fd['voor-welke-dienst']) ? fd['voor-welke-dienst'] : []).map((x) => dmap[str(x)] || '').filter(Boolean),
    is_draft: !!r.data.isDraft, url: 'https://www.studio27.be/vacatures/' + str(fd.slug),
    fields,
  } } };
}

// teamVacatureUpdate (HR-7): werk tekstvelden + actief bij van een (online) vacature.
export async function teamVacatureUpdate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (!str(env.WEBFLOW_TOKEN)) return { status: 200, body: { ok: false, error: 'geen_token' } };
  const id = str(body.item_id); if (!id) return { status: 400, body: { ok: false, error: 'no_item' } };
  const fd = {};
  // Generiek pad: body.fields = { slug: waarde } voor ELK Webflow-veld (type-bewust). Image laten we
  // hier ongemoeid (aparte upload-flow). Zo loopt de editor 1:1 met de Webflow custom fields.
  if (body.fields && typeof body.fields === 'object') {
    const schema = await vacFields(env); const bySlug = {}; schema.forEach((f) => { bySlug[f.slug] = f; });
    for (const slug of Object.keys(body.fields)) {
      const f = bySlug[slug]; if (!f) continue; const val = body.fields[slug];
      if (f.type === 'Switch') fd[slug] = !!val;
      else if (f.type === 'MultiReference' || f.type === 'Reference') fd[slug] = Array.isArray(val) ? val.map(str) : (val ? [str(val)] : []);
      else if (f.type === 'Option') fd[slug] = val ? str(val) : null;
      else if (f.type === 'Image' || f.type === 'MultiImage') { if (val && val.fileId) fd[slug] = { fileId: str(val.fileId) }; }
      else fd[slug] = f.maxLength ? str(val).slice(0, f.maxLength) : str(val);
    }
  }
  // Legacy-pad (backward compat met het standalone HR-portaal).
  if (body.name != null) fd.name = str(body.name).slice(0, 256);
  if (body.intro != null) fd['introductietekst-beknopt'] = str(body.intro).slice(0, 500);
  if (body.alt != null) fd['alt-tekst'] = str(body.alt).slice(0, 150);
  if (body.verwachten != null) fd['wat-mag-de-sollicitant-verwachten'] = str(body.verwachten);
  if (body.aanbieden != null) fd['wat-kan-je-de-sollicitant-aanbieden'] = str(body.aanbieden);
  if (body.profiel != null) fd['profiel-van-de-sollicitant'] = str(body.profiel);
  if (typeof body.actief === 'boolean') fd.actief = body.actief;
  if (!Object.keys(fd).length) return { status: 400, body: { ok: false, error: 'niets' } };
  let r = await wfFetch(env, `/collections/${VACATURES_COLL}/items/${id}/live`, { method: 'PATCH', body: { fieldData: fd } });
  if (!r.ok) {
    const p = await wfFetch(env, `/collections/${VACATURES_COLL}/items/${id}`, { method: 'PATCH', body: { isArchived: false, isDraft: false, fieldData: fd } });
    if (!p.ok) return { status: 200, body: { ok: false, error: 'webflow_fout', detail: str(p.data && (p.data.message || p.data.code)) } };
    await wfFetch(env, `/collections/${VACATURES_COLL}/items/publish`, { method: 'POST', body: { itemIds: [id] } });
  }
  return { status: 200, body: { ok: true } };
}

// teamVacatureSocial (HR-8): social-lancering van een vacature. preview = AI-caption (Claude,
// S27-tone) + carrousel-media (Gemini-visuals fail-soft op GEMINI_API_KEY, anders de
// vacaturefoto); schedule = concept inplannen in Metricool op de Studio 27-social.
export async function teamVacatureSocial(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (!str(env.WEBFLOW_TOKEN)) return { status: 200, body: { ok: false, error: 'geen_token' } };
  const id = str(body.item_id); if (!id) return { status: 400, body: { ok: false, error: 'no_item' } };
  const r = await wfFetch(env, `/collections/${VACATURES_COLL}/items/${id}`);
  if (!r.ok || !r.data) return { status: 200, body: { ok: false, error: 'webflow_fout' } };
  const fd = r.data.fieldData || {};
  const naam = str(fd.name);
  const intro = str(fd['introductietekst-beknopt']);
  const slug = str(fd.slug);
  const vacUrl = 'https://www.studio27.be/vacatures/' + slug;
  const img = (fd['afbeelding-max-150-kb'] && fd['afbeelding-max-150-kb'].url) ? str(fd['afbeelding-max-150-kb'].url) : '';
  // Metricool gekoppeld voor Studio 27?
  let blogId = '';
  try { const br = await cu.get(env, `/task/${S27_BEDRIJF_TASK}`); blogId = (br.ok && br.data) ? str(getCF(br.data, FIELD.metricoolId)).trim() : ''; } catch (e) { /* */ }
  if (!blogId) return { status: 200, body: { ok: false, error: 'no_metricool' } };
  const action = (str(body.action) === 'schedule') ? 'schedule' : 'preview';
  if (action === 'preview') {
    if (!img) return { status: 200, body: { ok: false, error: 'geen_foto' } };
    const sys = 'Je bent social-media-copywriter van Studio 27, een Vlaams marketing- en communicatiebureau. Schrijf een wervende, enthousiaste social-media-caption voor een vacature die we online zetten. Tone of voice: jong, creatief, menselijk, een tikje speels maar professioneel. Eindig met een duidelijke oproep om te solliciteren en de link. Voeg 4 tot 6 relevante hashtags toe. Schrijf in vlot Nederlands (Vlaams). Geef ENKEL de captiontekst, niets eromheen.' + toneBlock(await hrTone(env));
    const user = 'Vacature: ' + (naam || 'nieuwe functie') + '.\n' + (intro ? ('Korte inhoud: ' + intro + '\n') : '') + 'Link: ' + vacUrl;
    const res = await aiComplete(env, AI_MODEL, sys, user, 500, { skill: 'hr:vacature-caption' });
    const caption = (res && res.text) ? str(res.text).trim() : (naam + '\nSolliciteer via ' + vacUrl);
    const gemini = !!str(env.GEMINI_API_KEY);   // Gemini-carrousel-visuals: activeren zodra de key gezet is
    const media = [img];
    // Brussels-datum van morgen (niet de UTC-datum: die kan 's avonds een dag verspringen)
    const suggest = msToBrusselsYmd(Date.now() + 24 * 3600 * 1000) + 'T10:00';
    return { status: 200, body: { ok: true, caption, media, gemini, slides_count: media.length, suggest_date: suggest, vac_url: vacUrl } };
  }
  // schedule -> Metricool concept op de Studio 27-social
  const caption = str(body.caption).slice(0, 4000);
  const date = str(body.date).trim();
  const media = img ? [img] : [];
  const mc = await metricoolCreate(S27_BEDRIJF_TASK, { text: caption, providers: ['instagram', 'facebook'], media, date, __staff: true }, env);
  if (mc && mc.body && mc.body.ok) return { status: 200, body: { ok: true, post_id: str(mc.body.post_id || ''), draft: true } };
  return { status: 200, body: { ok: false, error: str((mc && mc.body && mc.body.error) || 'create_failed') } };
}

// ---- MD5 (Webflow-asset-upload vereist een fileHash), compacte, standaard MD5 over bytes ----
function md5hex(bytes) {
  function rl(x, c) { return (x << c) | (x >>> (32 - c)); }
  function ad(a, b) { return (a + b) & 0xFFFFFFFF; }
  function cmn(q, a, b, x, s, t) { return ad(rl(ad(ad(a, q), ad(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  const n = bytes.length;
  const nblk = ((n + 8) >> 6) + 1; const len = nblk * 16;
  const M = new Int32Array(len);
  for (let i = 0; i < n; i++) M[i >> 2] |= bytes[i] << ((i % 4) * 8);
  M[n >> 2] |= 0x80 << ((n % 4) * 8);
  const bits = n * 8; M[len - 2] = bits & 0xFFFFFFFF; M[len - 1] = Math.floor(bits / 0x100000000);
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let o = 0; o < len; o += 16) {
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, M[o + 0], 7, -680876936); d = ff(d, a, b, c, M[o + 1], 12, -389564586); c = ff(c, d, a, b, M[o + 2], 17, 606105819); b = ff(b, c, d, a, M[o + 3], 22, -1044525330);
    a = ff(a, b, c, d, M[o + 4], 7, -176418897); d = ff(d, a, b, c, M[o + 5], 12, 1200080426); c = ff(c, d, a, b, M[o + 6], 17, -1473231341); b = ff(b, c, d, a, M[o + 7], 22, -45705983);
    a = ff(a, b, c, d, M[o + 8], 7, 1770035416); d = ff(d, a, b, c, M[o + 9], 12, -1958414417); c = ff(c, d, a, b, M[o + 10], 17, -42063); b = ff(b, c, d, a, M[o + 11], 22, -1990404162);
    a = ff(a, b, c, d, M[o + 12], 7, 1804603682); d = ff(d, a, b, c, M[o + 13], 12, -40341101); c = ff(c, d, a, b, M[o + 14], 17, -1502002290); b = ff(b, c, d, a, M[o + 15], 22, 1236535329);
    a = gg(a, b, c, d, M[o + 1], 5, -165796510); d = gg(d, a, b, c, M[o + 6], 9, -1069501632); c = gg(c, d, a, b, M[o + 11], 14, 643717713); b = gg(b, c, d, a, M[o + 0], 20, -373897302);
    a = gg(a, b, c, d, M[o + 5], 5, -701558691); d = gg(d, a, b, c, M[o + 10], 9, 38016083); c = gg(c, d, a, b, M[o + 15], 14, -660478335); b = gg(b, c, d, a, M[o + 4], 20, -405537848);
    a = gg(a, b, c, d, M[o + 9], 5, 568446438); d = gg(d, a, b, c, M[o + 14], 9, -1019803690); c = gg(c, d, a, b, M[o + 3], 14, -187363961); b = gg(b, c, d, a, M[o + 8], 20, 1163531501);
    a = gg(a, b, c, d, M[o + 13], 5, -1444681467); d = gg(d, a, b, c, M[o + 2], 9, -51403784); c = gg(c, d, a, b, M[o + 7], 14, 1735328473); b = gg(b, c, d, a, M[o + 12], 20, -1926607734);
    a = hh(a, b, c, d, M[o + 5], 4, -378558); d = hh(d, a, b, c, M[o + 8], 11, -2022574463); c = hh(c, d, a, b, M[o + 11], 16, 1839030562); b = hh(b, c, d, a, M[o + 14], 23, -35309556);
    a = hh(a, b, c, d, M[o + 1], 4, -1530992060); d = hh(d, a, b, c, M[o + 4], 11, 1272893353); c = hh(c, d, a, b, M[o + 7], 16, -155497632); b = hh(b, c, d, a, M[o + 10], 23, -1094730640);
    a = hh(a, b, c, d, M[o + 13], 4, 681279174); d = hh(d, a, b, c, M[o + 0], 11, -358537222); c = hh(c, d, a, b, M[o + 3], 16, -722521979); b = hh(b, c, d, a, M[o + 6], 23, 76029189);
    a = hh(a, b, c, d, M[o + 9], 4, -640364487); d = hh(d, a, b, c, M[o + 12], 11, -421815835); c = hh(c, d, a, b, M[o + 15], 16, 530742520); b = hh(b, c, d, a, M[o + 2], 23, -995338651);
    a = ii(a, b, c, d, M[o + 0], 6, -198630844); d = ii(d, a, b, c, M[o + 7], 10, 1126891415); c = ii(c, d, a, b, M[o + 14], 15, -1416354905); b = ii(b, c, d, a, M[o + 5], 21, -57434055);
    a = ii(a, b, c, d, M[o + 12], 6, 1700485571); d = ii(d, a, b, c, M[o + 3], 10, -1894986606); c = ii(c, d, a, b, M[o + 10], 15, -1051523); b = ii(b, c, d, a, M[o + 1], 21, -2054922799);
    a = ii(a, b, c, d, M[o + 8], 6, 1873313359); d = ii(d, a, b, c, M[o + 15], 10, -30611744); c = ii(c, d, a, b, M[o + 6], 15, -1560198380); b = ii(b, c, d, a, M[o + 13], 21, 1309151649);
    a = ii(a, b, c, d, M[o + 4], 6, -145523070); d = ii(d, a, b, c, M[o + 11], 10, -1120210379); c = ii(c, d, a, b, M[o + 2], 15, 718787259); b = ii(b, c, d, a, M[o + 9], 21, -343485551);
    a = ad(a, oa); b = ad(b, ob); c = ad(c, oc); d = ad(d, od);
  }
  const hx = (x) => { let s = ''; for (let j = 0; j < 4; j++) s += (((x >> (j * 8)) & 0xff) + 0x100).toString(16).slice(1); return s; };
  return hx(a) + hx(b) + hx(c) + hx(d);
}
// teamVacaturePhoto (HR-7+): vervang/zet de foto van een vacature. Upload de bytes naar Webflow
// assets (md5 + presigned S3) en koppel de nieuwe asset aan het afbeelding-veld.
export async function teamVacaturePhoto(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (!str(env.WEBFLOW_TOKEN)) return { status: 200, body: { ok: false, error: 'geen_token' } };
  const id = str(body.item_id); if (!id) return { status: 400, body: { ok: false, error: 'no_item' } };
  const b64 = str(body.data_b64); if (!b64) return { status: 400, body: { ok: false, error: 'no_data' } };
  let bytes; try { bytes = b64ToBytes(b64); } catch (e) { return { status: 400, body: { ok: false, error: 'bad_data' } }; }
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) return { status: 200, body: { ok: false, error: 'te_groot', message: 'Max 4 MB.' } };
  const fileName = (str(body.filename) || 'vacature.jpg').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const hash = md5hex(bytes);
  // 1) asset-metadata aanmaken → presigned upload-url + velden
  const ar = await wfFetch(env, `/sites/${WF_SITE}/assets`, { method: 'POST', body: { fileName, fileHash: hash } });
  if (!ar.ok || !ar.data || !ar.data.uploadUrl || !ar.data.uploadDetails) return { status: 200, body: { ok: false, error: 'asset_init', detail: str(ar.data && (ar.data.message || ar.data.code)) } };
  const assetId = str(ar.data.id);
  // 2) bytes naar S3 (multipart, exact de velden uit uploadDetails + 'file' als laatste)
  try {
    const fd = new FormData();
    const det = ar.data.uploadDetails || {};
    for (const k of Object.keys(det)) fd.append(k, str(det[k]));
    fd.append('file', new Blob([bytes], { type: str(det['content-type'] || body.mime || 'image/jpeg') }), fileName);
    const up = await fetch(str(ar.data.uploadUrl), { method: 'POST', body: fd });
    if (!up.ok && up.status !== 201 && up.status !== 204) return { status: 200, body: { ok: false, error: 's3_upload', detail: 'http_' + up.status } };
  } catch (e) { return { status: 200, body: { ok: false, error: 's3_upload' } }; }
  // 3) de nieuwe asset aan de vacature koppelen. Webflow-image-veld verwacht een OBJECT {fileId}, geen kale string.
  let pr = await wfFetch(env, `/collections/${VACATURES_COLL}/items/${id}/live`, { method: 'PATCH', body: { fieldData: { 'afbeelding-max-150-kb': { fileId: assetId } } } });
  if (!pr.ok) pr = await wfFetch(env, `/collections/${VACATURES_COLL}/items/${id}`, { method: 'PATCH', body: { fieldData: { 'afbeelding-max-150-kb': { fileId: assetId } } } });
  const hosted = str(ar.data.hostedUrl || ar.data.assetUrl || '');
  return { status: 200, body: { ok: pr.ok, asset_id: assetId, url: hosted, coupled: pr.ok } };
}
// teamVacatureAiDraft (HR-7+): AI maakt een nieuwe vacature ZONDER template, analyseert de
// tone-of-voice van de openstaande vacatures, schrijft de inhoud voor de gevraagde functie,
// en kiest een passende bestaande Studio 27-vacaturefoto (asset hergebruikt).
export async function teamVacatureAiDraft(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (!str(env.WEBFLOW_TOKEN)) return { status: 200, body: { ok: false, error: 'geen_token' } };
  const functie = str(body.functie).trim(); if (!functie) return { status: 400, body: { ok: false, error: 'geen_functie' } };
  const r = await wfFetch(env, `/collections/${VACATURES_COLL}/items?limit=100`);
  const open = ((r.data && r.data.items) || []).filter((it) => it.fieldData && it.fieldData.actief && !it.isArchived);
  const tov = open.slice(0, 4).map((it) => { const fd = it.fieldData || {}; return str(fd.name) + ': ' + str(fd['introductietekst-beknopt']); }).join('\n');
  const sys = 'Je bent recruiter-copywriter van Studio 27, een Vlaams marketing- en communicatiebureau. Schrijf een nieuwe vacature in EXACT de tone of voice van de bestaande Studio 27-vacatures (jong, creatief, menselijk, een tikje speels, professioneel). Antwoord UITSLUITEND met geldige JSON: {"intro":"<beknopte introtekst, 1-2 zinnen>","alt":"<alt-tekst voor de foto, max 150 tekens>","verwachten":"<HTML: <p>...</p> of <ul><li>...</li></ul>>","aanbieden":"<HTML lijst>","profiel":"<HTML lijst>"}. Geen markdown, geen uitleg eromheen.' + toneBlock(await hrTone(env));
  const user = 'Nieuwe functie: ' + functie + '.\n\nTone of voice van bestaande vacatures:\n' + (tov || '(geen voorbeelden beschikbaar)');
  const res = await aiComplete(env, AI_MODEL, sys, user, 1500, { skill: 'hr:vacature-tekst' });
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: str((res && res.err) || 'ai_fout') } };
  let parsed = null; const jm = str(res.text).match(/\{[\s\S]*\}/); if (jm) { try { parsed = JSON.parse(jm[0]); } catch (e) { parsed = null; } }
  if (!parsed) return { status: 200, body: { ok: false, error: 'parse' } };
  // een passende bestaande vacaturefoto (asset) + dienst hergebruiken (Webflow vereist 'voor-welke-dienst')
  let foto = null, dienst_ids = [];
  const withImg = (open.length ? open : ((r.data && r.data.items) || [])).filter((it) => it.fieldData && it.fieldData['afbeelding-max-150-kb'] && it.fieldData['afbeelding-max-150-kb'].fileId);
  if (withImg.length) { const src = withImg[0].fieldData; const pick = src['afbeelding-max-150-kb']; foto = { fileId: str(pick.fileId), url: str(pick.url || '') }; if (Array.isArray(src['voor-welke-dienst'])) dienst_ids = src['voor-welke-dienst'].map((x) => str(x)); }
  return { status: 200, body: { ok: true, draft: { intro: str(parsed.intro || ''), alt: str(parsed.alt || '').slice(0, 150), verwachten: str(parsed.verwachten || ''), aanbieden: str(parsed.aanbieden || ''), profiel: str(parsed.profiel || '') }, foto, dienst_ids } };
}

/* ===========================================================================
 * HR-STATISTIEKEN (Golf HR-3), vacaturepagina-cijfers uit GA4 (studio27.be).
 * Welke kanalen kandidaten vandaan komen (Instagram/TikTok/VDAB/website) +
 * bezoekersaantallen per vacaturepagina. Auth = de portal-SA (marketing@ via DWD,
 * dekt alle 245 GA4-properties). Het studio27.be-property wordt AUTOMATISCH
 * geresolved (ClickUp-veld → KV-cache → GA4 Admin-API op naam), geen handwerk.
 * =========================================================================== */
const GA4_STUDIO27_CK = 'team:ga4:studio27:v1';
const S27_BEDRIJF_TASK = '86c8cz2uu';   // ClickUp-bedrijfstaak "Studio 27"
async function studio27Ga4Property(env, token) {
  // 1) ClickUp-veld 'GA4 property-ID' op de S27-taak wint (als Vincent het later invult)
  try { const br = await cu.get(env, `/task/${S27_BEDRIJF_TASK}`); if (br.ok && br.data) { const v = str(getCF(br.data, FIELD.ga4PropertyId)).replace(/[^0-9]/g, ''); if (/^\d{6,20}$/.test(v)) return v; } } catch (e) { /* */ }
  // 2) KV-cache
  try { const h = await env.KV.get(GA4_STUDIO27_CK); if (h && /^\d{6,20}$/.test(h)) return h; } catch (e) { /* */ }
  // 3) GA4 Admin-API: zoek het property op displaynaam (studio 27, niet 27 Moments/ZVD/27A)
  try {
    const r = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json().catch(() => null);
    const accs = (d && Array.isArray(d.accountSummaries)) ? d.accountSummaries : [];
    let found = '';
    for (const a of accs) {
      for (const p of (Array.isArray(a.propertySummaries) ? a.propertySummaries : [])) {
        const nm = str(p.displayName).toLowerCase();
        if (/studio\s*-?\s*27/.test(nm) && !/moments|zorg|27a|max\s*pro|orison/.test(nm)) { found = str(p.property).replace(/[^0-9]/g, ''); break; }
      }
      if (found) break;
    }
    if (found) { try { await env.KV.put(GA4_STUDIO27_CK, found, { expirationTtl: 30 * 24 * 3600 }); } catch (e) { /* */ } }
    return found;
  } catch (e) { return ''; }
}
export async function teamHrStats(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  let token;
  try { token = await mintGoogleToken(env, WEB_SUBJECT, GA_SCOPE); } catch (e) { return { status: 200, body: { ok: true, linked: false, reason: 'no_token' } }; }
  const prop = await studio27Ga4Property(env, token);
  if (!/^\d{6,20}$/.test(prop)) return { status: 200, body: { ok: true, linked: false, reason: 'no_property' } };
  const preset = ['last_7d', 'last_14d', 'last_30d', 'last_90d'].indexOf(str(body && body.period)) >= 0 ? str(body.period) : 'last_30d';
  const PR = { last_7d: ['7daysAgo', 'yesterday'], last_14d: ['14daysAgo', 'yesterday'], last_30d: ['30daysAgo', 'yesterday'], last_90d: ['90daysAgo', 'yesterday'] };
  const pp = PR[preset]; const dr = { startDate: pp[0], endDate: pp[1] };
  const M = (n) => ({ name: n });
  const vacFilter = { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/vacatures' } } };
  const [tot, chan, src, perPage, trend] = await Promise.all([
    ga4Report(token, prop, { dateRanges: [dr], dimensionFilter: vacFilter, metrics: [M('screenPageViews'), M('totalUsers'), M('sessions')] }),
    ga4Report(token, prop, { dateRanges: [dr], dimensionFilter: vacFilter, dimensions: [M('sessionDefaultChannelGroup')], metrics: [M('sessions'), M('totalUsers')], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 15 }),
    ga4Report(token, prop, { dateRanges: [dr], dimensionFilter: vacFilter, dimensions: [M('sessionSource'), M('sessionMedium')], metrics: [M('sessions'), M('totalUsers')], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 20 }),
    ga4Report(token, prop, { dateRanges: [dr], dimensionFilter: vacFilter, dimensions: [M('pagePath')], metrics: [M('screenPageViews'), M('totalUsers')], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 25 }),
    ga4Report(token, prop, { dateRanges: [dr], dimensionFilter: vacFilter, dimensions: [M('date')], metrics: [M('screenPageViews')], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 200 }),
  ]);
  const tm = (tot.rows && tot.rows[0] && tot.rows[0].metricValues) || [];
  const totals = tm.length ? { views: +tm[0].value, users: +tm[1].value, sessions: +tm[2].value } : { views: 0, users: 0, sessions: 0 };
  const channels = (chan.rows || []).map((r) => ({ channel: str(r.dimensionValues[0].value), sessions: +r.metricValues[0].value, users: +r.metricValues[1].value }));
  const sources = (src.rows || []).map((r) => ({ source: str(r.dimensionValues[0].value), medium: str(r.dimensionValues[1].value), sessions: +r.metricValues[0].value, users: +r.metricValues[1].value }));
  const pages = (perPage.rows || []).map((r) => ({ path: str(r.dimensionValues[0].value), views: +r.metricValues[0].value, users: +r.metricValues[1].value }));
  const trendRows = (trend.rows || []).map((r) => ({ date: str(r.dimensionValues[0].value), views: +r.metricValues[0].value }));
  const error = (!tot.ok && !chan.ok) ? str(tot.err || chan.err || 'fetch_failed') : null;
  return { status: 200, body: { ok: true, linked: true, property: prop, period: preset, totals, channels, sources, pages, trend: trendRows, error } };
}

/* ===========================================================================
 * ADVERTEERDERSPORTAAL (ADV-1), overzicht van alle klanten met Meta/Google-ads,
 * met een kleurstatus per klant (goed/onder/probleem/boven) op basis van
 * resultaten+uitgaven, CTR en trend vs vorige periode. Sectorgemiddelde = ADV-4.
 * Toegang: admin + de adverteerders (allowlist). Read-only; cache 10 min.
 * =========================================================================== */
const ADS_TEAM = new Set(['vincent@studio27.be', 'johanna@studio27.be', 'arne@studio27.be', 'ilke@studio27.be']);
// Gebruikt een lijst tool-sleutels live advertentiedata? (zelfde gevoelige bron als de ads-endpoints)
const usesAdsTool = (arr) => Array.isArray(arr) && (arr.indexOf('meta_ads') >= 0 || arr.indexOf('google_ads') >= 0);
// True = deze gebruiker mag GEEN advertentiedata zien (geen admin én niet in ADS_TEAM). Zelfde poort als alle ads-endpoints.
function adsGateBlocked(rr, body) { return !rr.perms.admin && !ADS_TEAM.has(str(body.account_email).toLowerCase()); }
const ADS_ORDER = { probleem: 0, onder: 1, neutraal: 2, goed: 3, boven: 4 };
function adsRound2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function adsRange(period) {
  const days = period === 'last_30d' ? 30 : (period === 'last_14d' ? 14 : 7);
  return { from: msToBrusselsYmd(Date.now() - days * 86400000), to: msToBrusselsYmd(Date.now() - 86400000) };
}
function adsStatus(kpis, prev) {
  if (!kpis) return { status: 'neutraal', trend: 'flat', reden: 'Geen data' };
  const spend = Number(kpis.spend) || 0, results = Number(kpis.results) || 0, ctr = Number(kpis.ctr) || 0;
  let trend = 'flat';
  if (prev) { const pr = Number(prev.results) || 0; if (results > pr * 1.1 && results > pr) trend = 'up'; else if (results < pr * 0.9) trend = 'down'; }
  if (spend <= 0) return { status: 'neutraal', trend, reden: 'Geen uitgaven in deze periode' };
  if (results === 0) return { status: 'probleem', trend, reden: 'Budget verbruikt zonder resultaten' };
  if (ctr > 0 && ctr < 0.8) return { status: 'onder', trend, reden: 'Lage doorklikratio (' + ctr.toFixed(2) + '%)' };
  if (trend === 'down') return { status: 'onder', trend, reden: 'Resultaten dalen vs vorige periode' };
  if (trend === 'up' && ctr >= 1.5) return { status: 'boven', trend, reden: 'Sterke prestaties, resultaten stijgen' };
  return { status: 'goed', trend, reden: 'Loopt goed' };
}
export async function teamAdsOverview(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  // De cron (__cron) is een vertrouwde server-side aanroep zonder echte gebruiker → sla rol-resolutie over.
  if (!body.__cron) {
    const rr = await resolveRole(env, body);
    if (rr.error) return rr.error;
    const email = str(body.account_email).toLowerCase();
    if (!rr.perms.admin && !ADS_TEAM.has(email)) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Het adverteerdersoverzicht is voor de advertentie-collega’s.' } };
  }
  const period = ['last_7d', 'last_14d', 'last_30d'].indexOf(str(body.period)) >= 0 ? str(body.period) : 'last_7d';
  const ck = 'team:adsoverview:' + period;
  if (!body.force) { try { const c = await env.KV.get(ck, 'json'); if (c && c.items) return { status: 200, body: Object.assign({ ok: true, cached: true }, c) }; } catch (e) { /* */ } }
  let tasks = [];
  try { tasks = await pageAll(env, (p) => `/list/${LIST.bedrijven}/task?include_closed=true&subtasks=false&page=${p}`); } catch (e) { tasks = []; }
  const advs = [];
  for (const t of tasks) {
    const metaId = str(getCF(t, FIELD.metaAdsId)).replace(/[^0-9]/g, '');
    const gId = str(getCF(t, FIELD.googleAdsId)).trim();
    if (metaId || gId) {
      const ass = (Array.isArray(t.assignees) ? t.assignees : []).map((a) => ({ i: str(a.initials || (a.username || '').slice(0, 2)).slice(0, 3).toUpperCase(), c: str(a.color || ''), id: Number(a.id) }));
      advs.push({ id: str(t.id), naam: str(t.name).trim(), metaId, gId, ass, ass_ids: ass.map((a) => a.id) });
    }
  }
  const range = adsRange(period);
  const hasToken = !!str(env.META_SYSTEM_TOKEN);
  const platShape = (kp, st) => ({ linked: !!kp, status: st ? st.status : 'neutraal', reden: st ? st.reden : '', trend: st ? st.trend : 'flat', spend: kp ? adsRound2(kp.spend) : 0, results: kp ? Math.round(kp.results || 0) : 0, ctr: kp ? adsRound2(kp.ctr) : 0 });
  const items = await Promise.all(advs.map(async (a) => {
    let meta = null, metaPrev = null, google = null, googlePrev = null, currency = 'EUR';
    const jobs = [];
    if (a.metaId && hasToken) jobs.push((async () => { try { const act = 'act_' + a.metaId; const cw = metaCompareWindow(range.from, range.to, 'previous'); const [c, p] = await Promise.all([metaKpiWindow(env, act, metaTimeParams(range.from, range.to)), metaKpiWindow(env, act, metaTimeParams(cw[0], cw[1]))]); if (c && c.ok) meta = c.kpis; if (p && p.ok) metaPrev = p.kpis; } catch (e) { /* */ } })());
    if (a.gId) jobs.push((async () => { try { const gr = await googleAds(a.id, { from: range.from, to: range.to, compare: 'previous' }, env); const gb = gr && gr.body; if (gb && gb.ok && gb.linked) { google = gb.kpis; googlePrev = gb.prevKpis; if (gb.currency) currency = gb.currency; } } catch (e) { /* */ } })());
    await Promise.all(jobs);
    const metaSt = a.metaId ? adsStatus(meta, metaPrev) : null;
    const googSt = a.gId ? adsStatus(google, googlePrev) : null;
    const cand = [metaSt, googSt].filter(Boolean);
    const overall = cand.length ? cand.reduce((w, s) => (ADS_ORDER[s.status] < ADS_ORDER[w.status] ? s : w)) : { status: 'neutraal', trend: 'flat', reden: 'Geen data' };
    const spend = adsRound2((meta ? meta.spend : 0) + (google ? google.spend : 0));
    const results = Math.round((meta ? meta.results : 0) + (google ? google.results : 0));
    return {
      id: a.id, naam: a.naam, ass: a.ass, ass_ids: a.ass_ids,
      platforms: [a.metaId ? 'meta' : null, a.gId ? 'google' : null].filter(Boolean), currency,
      meta: a.metaId ? platShape(meta, metaSt) : null, google: a.gId ? platShape(google, googSt) : null,
      status: overall.status, trend: overall.trend, reden: overall.reden, spend, results,
    };
  }));
  // klanten ZONDER uitgaven onderaan; daarbinnen op status (probleem eerst) en spend.
  items.sort((a, b) => ((a.spend > 0 ? 0 : 1) - (b.spend > 0 ? 0 : 1)) || (ADS_ORDER[a.status] - ADS_ORDER[b.status]) || (b.spend - a.spend) || a.naam.localeCompare(b.naam));
  const out = { items, period, count: items.length, range, _t: Date.now() };
  // Lang houdbaar (26u): de cron warmt het 2×/dag (ochtend + middag), zodat de Ads-tab INSTANT laadt.
  // Tussendoor max ~½ dag oud, wat ruim volstaat voor advertentie-opvolging.
  try { await env.KV.put(ck, JSON.stringify(out), { expirationTtl: 26 * 3600 }); } catch (e) { /* */ }
  return { status: 200, body: Object.assign({ ok: true }, out) };
}
// warmAdsOverview: pre-compute het adverteerdersoverzicht voor de DEFAULT-periode (last_7d), dat is
// wat de Ads-tab standaard toont. Andere periodes berekenen on-demand (en cachen dan 26u). We houden
// het bij één periode om binnen de Worker-subrequestlimiet te blijven (±76 adverteerders × Meta+Google).
export async function warmAdsOverview(env) {
  try { await teamAdsOverview(null, { __staff: true, __cron: true, force: true, period: 'last_7d' }, env); } catch (e) { /* fail-soft */ }
  return true;
}

// teamAdsDetail (ADV-2): rijke gegevens van ÉÉN klant voor ÉÉN platform + AI-analyse
// (read-only aanbevelingen over data-instellingen + budget; GEEN visuals).
export async function teamAdsDetail(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const email = str(body.account_email).toLowerCase();
  if (!rr.perms.admin && !ADS_TEAM.has(email)) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const bedrijfId = cleanTaskId(body.bedrijf_id); if (!bedrijfId) return { status: 400, body: { ok: false, error: 'no_bedrijf' } };
  const platform = (str(body.platform) === 'google') ? 'google' : 'meta';
  const period = ['last_7d', 'last_14d', 'last_30d'].indexOf(str(body.period)) >= 0 ? str(body.period) : 'last_7d';
  const range = adsRange(period);
  const req = { from: range.from, to: range.to, compare: 'previous' };
  let data = null;
  try { const r = (platform === 'google') ? await googleAds(bedrijfId, req, env) : await metaAds(bedrijfId, req, env); data = r && r.body; } catch (e) { data = null; }
  if (!data || !data.ok) return { status: 200, body: { ok: false, error: 'fetch_failed' } };
  if (!data.linked) return { status: 200, body: { ok: true, linked: false, reason: str(data.reason || 'not_linked'), platform } };
  const kpis = data.kpis || {}; const prev = data.prevKpis || null;
  const campaigns = (Array.isArray(data.campaigns) ? data.campaigns : []).slice(0, 25);
  // AI-analyse NIET meer inline (dat maakte het detail traag). De statische data komt nu snel terug;
  // het AI-advies wordt apart via teamAdsAdvies geladen (cache-first, 's ochtends geprewarmd).
  let analyse = '', analyse_rows = [];
  try { const c = await env.KV.get(adsAdviesKey(bedrijfId, platform, period), 'json'); if (c && c.ok) { analyse = str(c.analyse || ''); analyse_rows = Array.isArray(c.analyse_rows) ? c.analyse_rows : []; } } catch (e) { /* */ }
  return { status: 200, body: { ok: true, linked: true, platform, period, currency: str(data.currency || 'EUR'), kpis, prevKpis: prev, campaigns, analyse, analyse_rows, advies_cached: analyse_rows.length > 0 } };
}
// teamAdsRich: de UITGEBREIDE rapportage (identiek aan het klantenportaal) voor het teamportaal-
// adverteerderdetail. Hergebruikt de bestaande staff-gated metaAdsRich/googleAdsRich 1-op-1.
// Body: { bedrijf_id, platform, period?, compare?, from?, to? }. Geeft de volle rich-data terug
// (kpis/prevKpis/campaigns met daily[]/adsets/ads of adgroups + keywords).
export async function teamAdsRich(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const email = str(body.account_email).toLowerCase();
  if (!rr.perms.admin && !ADS_TEAM.has(email)) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const bedrijfId = cleanTaskId(body.bedrijf_id); if (!bedrijfId) return { status: 400, body: { ok: false, error: 'no_bedrijf' } };
  const platform = (str(body.platform) === 'google') ? 'google' : 'meta';
  const period = ['last_7d', 'last_14d', 'last_30d'].indexOf(str(body.period)) >= 0 ? str(body.period) : 'last_30d';
  const r = adsRange(period);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(str(body.from)) ? str(body.from) : r.from;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(str(body.to)) ? str(body.to) : r.to;
  const compare = ['previous', 'month', 'year', 'none'].indexOf(str(body.compare)) >= 0 ? str(body.compare) : 'previous';
  let out = null;
  try { out = (platform === 'google') ? await googleAdsRich(bedrijfId, { from, to, compare }, env) : await metaAdsRich(bedrijfId, { from, to, compare }, env); } catch (e) { out = null; }
  if (!out || !out.body) return { status: 200, body: { ok: false, error: 'fetch_failed', platform } };
  const b = out.body; b.platform = platform; b.period = period; b.from = from; b.to = to;
  return { status: 200, body: b };
}

// --- AI-advies losgekoppeld + gecachet (team:adsadvies:<bid>:<platform>:<period>) ---
function adsAdviesKey(bedrijfId, platform, period) { return 'team:adsadvies:' + bedrijfId + ':' + platform + ':' + period; }
function adsItemStatusKey(bedrijfId, platform, period) { return 'team:adsitemstatus:' + bedrijfId + ':' + platform + ':' + period; }
function adsRowId(r) { return 'r' + Math.abs(Array.from(str(r.aspect) + '|' + str(r.actie)).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)).toString(36); }
async function computeAdsAdvies(env, bedrijfId, platform, period, preData) {
  const range = adsRange(period);
  let data = preData || null;
  if (!data) { try { const r = (platform === 'google') ? await googleAds(bedrijfId, { from: range.from, to: range.to, compare: 'previous' }, env) : await metaAds(bedrijfId, { from: range.from, to: range.to, compare: 'previous' }, env); data = r && r.body; } catch (e) { data = null; } }
  if (!data || !data.ok || !data.linked) return { ok: false };
  const kpis = data.kpis || {}; const prev = data.prevKpis || null;
  const campaigns = (Array.isArray(data.campaigns) ? data.campaigns : []).slice(0, 25);
  const platLabel = platform === 'google' ? 'Google Ads' : 'Meta Ads';
  const top = campaigns.slice(0, 12).map((c) => `- ${str(c.name)}: budget ${c.budget || '?'}, besteed ${adsRound2(c.spend)}, resultaten ${Math.round(c.results || 0)}, CTR ${adsRound2(c.ctr)}%, CPC ${adsRound2(c.cpc)}`).join('\n');
  const sys = 'Je bent senior performance-marketeer bij Studio 27. Analyseer de ' + platLabel + '-cijfers van één klant. Geef 3 tot 6 CONCRETE, doorvoerbare aanbevelingen, ENKEL over data-instellingen en BUDGETVERDELING (NOOIT visuals/creatives genereren of aanpassen). Wees scherp en eerlijk. Antwoord UITSLUITEND met geldige JSON, geen tekst eromheen: {"rows":[{"aspect":"korte titel","bevinding":"wat de data toont, 1 zin","actie":"concrete aanbeveling met getal waar mogelijk, 1 zin","prioriteit":"hoog|midden|laag"}]}. Nederlands.';
  const user = 'Klant-account (' + platLabel + '), periode ' + period + '.\nAccount-KPIs: besteed ' + adsRound2(kpis.spend) + ', resultaten ' + Math.round(kpis.results || 0) + ', CTR ' + adsRound2(kpis.ctr) + '%, CPC ' + adsRound2(kpis.cpc) + (prev ? (', vorige periode resultaten ' + Math.round(prev.results || 0)) : '') + '.\nActieve campagnes:\n' + (top || '(geen actieve campagnes)');
  const res = await aiComplete(env, AI_MODEL, sys, user, 1300, { skill: 'ads:advies', bedrijf_id: bedrijfId });
  let analyse = '', analyse_rows = [];
  if (res && res.text) {
    analyse = str(res.text).trim();
    try { const m = analyse.match(/\{[\s\S]*\}/); if (m) { const j = JSON.parse(m[0]); if (Array.isArray(j.rows)) analyse_rows = j.rows.map((r) => { const o = { aspect: str(r.aspect).slice(0, 90), bevinding: str(r.bevinding).slice(0, 320), actie: str(r.actie).slice(0, 320), prioriteit: str(r.prioriteit).toLowerCase() }; o.id = adsRowId(o); return o; }).filter((r) => r.aspect || r.actie).slice(0, 8); } } catch (e) { /* */ }
  }
  const out = { ok: true, analyse, analyse_rows, _t: Date.now() };
  try { await env.KV.put(adsAdviesKey(bedrijfId, platform, period), JSON.stringify(out), { expirationTtl: 26 * 3600 }); } catch (e) { /* */ }
  return out;
}
// teamAdsAdvies: het AI-advies voor één klant/platform/periode (cache-first; force = vers berekenen).
// Voegt per-item-status (uitvoeren/overgeslagen) toe uit KV.
export async function teamAdsAdvies(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const email = str(body.account_email).toLowerCase();
  if (!rr.perms.admin && !ADS_TEAM.has(email)) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const bid = cleanTaskId(body.bedrijf_id); if (!bid) return { status: 400, body: { ok: false, error: 'no_bedrijf' } };
  const platform = (str(body.platform) === 'google') ? 'google' : 'meta';
  const period = ['last_7d', 'last_14d', 'last_30d'].indexOf(str(body.period)) >= 0 ? str(body.period) : 'last_7d';
  let out = null;
  if (!body.force) { try { const c = await env.KV.get(adsAdviesKey(bid, platform, period), 'json'); if (c && c.ok) out = c; } catch (e) { /* */ } }
  if (!out) out = await computeAdsAdvies(env, bid, platform, period);
  if (!out || !out.ok) return { status: 200, body: { ok: false, error: 'no_advies', message: 'Geen advies beschikbaar (geen data of koppeling).' } };
  let status = {}; try { status = (await env.KV.get(adsItemStatusKey(bid, platform, period), 'json')) || {}; } catch (e) { status = {}; }
  const rows = (out.analyse_rows || []).map((r) => ({ ...r, status: str(status[r.id] || '') }));
  return { status: 200, body: { ok: true, analyse: out.analyse, analyse_rows: rows, _t: out._t, cached: !body.force } };
}
// teamAdsItemStatus: markeer een advies-item als 'done' (uitgevoerd) of 'skip' (niet uitvoeren). Body: { bedrijf_id, platform, period, item_id, status }.
export async function teamAdsItemStatus(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const email = str(body.account_email).toLowerCase();
  if (!rr.perms.admin && !ADS_TEAM.has(email)) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const bid = cleanTaskId(body.bedrijf_id); if (!bid) return { status: 400, body: { ok: false } };
  const platform = (str(body.platform) === 'google') ? 'google' : 'meta';
  const period = ['last_7d', 'last_14d', 'last_30d'].indexOf(str(body.period)) >= 0 ? str(body.period) : 'last_7d';
  const itemId = str(body.item_id).slice(0, 20); const st = ['done', 'skip', ''].indexOf(str(body.status)) >= 0 ? str(body.status) : '';
  if (!itemId) return { status: 400, body: { ok: false } };
  const k = adsItemStatusKey(bid, platform, period);
  let cur = {}; try { cur = (await env.KV.get(k, 'json')) || {}; } catch (e) { cur = {}; }
  if (st) cur[itemId] = st; else delete cur[itemId];
  try { await env.KV.put(k, JSON.stringify(cur), { expirationTtl: 40 * 24 * 3600 }); } catch (e) { /* */ }
  // Geheugen (Stage 4): markeer een uitgevoerd adviespunt bij de specialist (met de echte adviestekst uit cache).
  if (st === 'done') { try {
    let txt = 'Een AI-adviespunt uitgevoerd op het ' + (platform === 'google' ? 'Google' : 'Meta') + '-account.';
    const c = await env.KV.get(adsAdviesKey(bid, platform, period), 'json');
    if (c && Array.isArray(c.analyse_rows)) { const row = c.analyse_rows.find((r) => r.id === itemId); if (row) txt = 'Adviespunt UITGEVOERD (' + (platform === 'google' ? 'Google' : 'Meta') + '): ' + str(row.aspect) + ' — ' + str(row.actie); }
    await adsSpecMemAction(env, platform, bid, txt, str(rr.me && (rr.me.naam || rr.me.email)));
  } catch (e) { /* */ } }
  return { status: 200, body: { ok: true, item_id: itemId, status: st } };
}
// warmAdsAdvies: pre-compute het AI-advies voor de ACTIEVE adverteerders (spend>0) in de default-periode,
// zodat het detail 's ochtends instant het advies toont. Gecapt om binnen de Worker-subrequestlimiet te blijven.
export async function warmAdsAdvies(env) {
  try {
    const ov = await teamAdsOverview(null, { __staff: true, __cron: true, period: 'last_7d' }, env);
    const items = (ov && ov.body && ov.body.items) || [];
    const actief = items.filter((x) => x.spend > 0).slice(0, 35);
    for (const a of actief) {
      const plats = a.platforms || [];
      for (const p of plats.slice(0, 1)) {   // enkel het primaire platform prewarmen (kostenbewust)
        try { await computeAdsAdvies(env, a.id, p, 'last_7d'); } catch (e) { /* */ }
      }
    }
  } catch (e) { /* fail-soft */ }
  return true;
}

// teamAdsAsk: vrije vraag aan de in-portaal Ads-specialist over één klant-account. De AI antwoordt
// ENKEL op basis van de live account-data (KPIs + campagnes). Voor Johanna/Arne zonder Claude te openen.
export async function teamAdsAsk(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const email = str(body.account_email).toLowerCase();
  if (!rr.perms.admin && !ADS_TEAM.has(email)) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const bedrijfId = cleanTaskId(body.bedrijf_id); if (!bedrijfId) return { status: 400, body: { ok: false, error: 'no_bedrijf' } };
  const platform = (str(body.platform) === 'google') ? 'google' : 'meta';
  const vraag = str(body.vraag || '').trim().slice(0, 600); if (!vraag) return { status: 400, body: { ok: false, error: 'no_vraag' } };
  const period = ['last_7d', 'last_14d', 'last_30d'].indexOf(str(body.period)) >= 0 ? str(body.period) : 'last_7d';
  const range = adsRange(period);
  let data = null;
  try { const r = (platform === 'google') ? await googleAds(bedrijfId, { from: range.from, to: range.to, compare: 'previous' }, env) : await metaAds(bedrijfId, { from: range.from, to: range.to, compare: 'previous' }, env); data = r && r.body; } catch (e) { data = null; }
  if (!data || !data.ok || !data.linked) return { status: 200, body: { ok: false, error: 'no_data', message: 'Geen data of koppeling voor dit platform/periode.' } };
  const kpis = data.kpis || {}; const prev = data.prevKpis || null;
  const camps = (Array.isArray(data.campaigns) ? data.campaigns : []).slice(0, 18);
  const platLabel = platform === 'google' ? 'Google Ads' : 'Meta Ads';
  const ctx = 'Account-KPIs (' + platLabel + ', periode ' + period + '): besteed ' + adsRound2(kpis.spend) + ', resultaten ' + Math.round(kpis.results || 0) + ', CTR ' + adsRound2(kpis.ctr) + '%, CPC ' + adsRound2(kpis.cpc) + (prev ? (', vorige periode resultaten ' + Math.round(prev.results || 0)) : '') + '.\nCampagnes:\n' + (camps.map((c) => `- ${str(c.name)}: budget ${c.budget || '?'}, besteed ${adsRound2(c.spend)}, resultaten ${Math.round(c.results || 0)}, CTR ${adsRound2(c.ctr)}%, CPC ${adsRound2(c.cpc)}`).join('\n') || '(geen actieve campagnes)');
  const sys = 'Je bent de ' + platLabel + '-specialist van Studio 27. Beantwoord de vraag van de collega over dit klant-account ENKEL op basis van de meegegeven data. Wees concreet, scherp en eerlijk; zeg het expliciet als de data het antwoord niet bevat in plaats van te gokken. Antwoord in helder Nederlands met korte alinea\'s of bullets (geen tabellen). Stel NOOIT voor om visuals/creatives te genereren.';
  const res = await aiComplete(env, AI_MODEL, sys, 'Vraag: ' + vraag + '\n\n' + ctx, 1200, { skill: 'ads:vraag', bedrijf_id: str(body.bedrijf_id) });
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: (res && res.err) || 'ai_fout' } };
  return { status: 200, body: { ok: true, antwoord: str(res.text).trim() } };
}

// teamAdsPropose (ADV-3 stap 1, read-only): AI stelt concrete wijzigingen voor (budget/pauzeren/
// heractiveren/bod) per campagne. Budget-pct server-side gecapt op ±20%. Niets wordt doorgevoerd.
const ADS_KINDS = new Set(['budget', 'pause', 'activate', 'bid', 'advies']);
export async function teamAdsPropose(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const email = str(body.account_email).toLowerCase();
  if (!rr.perms.admin && !ADS_TEAM.has(email)) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const bedrijfId = cleanTaskId(body.bedrijf_id); if (!bedrijfId) return { status: 400, body: { ok: false, error: 'no_bedrijf' } };
  const platform = (str(body.platform) === 'google') ? 'google' : 'meta';
  const period = ['last_7d', 'last_14d', 'last_30d'].indexOf(str(body.period)) >= 0 ? str(body.period) : 'last_7d';
  const range = adsRange(period);
  let data = null;
  try { const r = (platform === 'google') ? await googleAds(bedrijfId, { from: range.from, to: range.to, compare: 'previous' }, env) : await metaAds(bedrijfId, { from: range.from, to: range.to, compare: 'previous' }, env); data = r && r.body; } catch (e) { data = null; }
  if (!data || !data.ok || !data.linked) return { status: 200, body: { ok: false, error: 'not_linked' } };
  const camps = (Array.isArray(data.campaigns) ? data.campaigns : []).slice(0, 20);
  if (!camps.length) return { status: 200, body: { ok: true, changes: [] } };
  const list = camps.map((c) => `id=${str(c.id)} | "${str(c.name)}" | status=${str(c.status || '')} | besteed=${adsRound2(c.spend)} | resultaten=${Math.round(c.results || 0)} | CTR=${adsRound2(c.ctr)}% | CPC=${adsRound2(c.cpc)} | dagbudget=${c.budget || '?'}`).join('\n');
  const sys = 'Je bent senior performance-marketeer bij Studio 27. Stel op basis van de campagnecijfers CONCRETE optimalisaties voor, ENKEL over data-instellingen en budget (NOOIT visuals). Antwoord UITSLUITEND met geldige JSON: {"changes":[{"kind":"budget|pause|activate|bid|advies","id":"<campagne-id uit de lijst>","name":"<naam>","pct":<getal -20..20 enkel bij budget>,"reason":"<1 korte zin waarom>"}]}. Regels: budget-pct mag NOOIT buiten -20..20. "pause" voor campagnes die verbranden zonder resultaat; "activate" voor sterk presterende die op pauze staan; "budget" om te herverdelen naar wat werkt; "bid" of "advies" voor de rest (wordt niet automatisch doorgevoerd). Maximaal 6 voorstellen, de meest impactvolle eerst. Verzin geen id\'s buiten de lijst.';
  const res = await aiComplete(env, AI_MODEL, sys, 'Campagnes (' + (platform === 'google' ? 'Google Ads' : 'Meta Ads') + '):\n' + list, 1100, { skill: 'ads:voorstel', bedrijf_id: str(body.bedrijf_id) });
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: str((res && res.err) || 'ai_fout') } };
  let parsed = null; const jm = str(res.text).match(/\{[\s\S]*\}/); if (jm) { try { parsed = JSON.parse(jm[0]); } catch (e) { parsed = null; } }
  const valIds = new Set(camps.map((c) => str(c.id)));
  const changes = ((parsed && Array.isArray(parsed.changes)) ? parsed.changes : []).filter((c) => c && ADS_KINDS.has(str(c.kind)) && valIds.has(str(c.id))).slice(0, 8).map((c) => ({
    kind: str(c.kind), id: str(c.id), name: str(c.name || (camps.find((x) => str(x.id) === str(c.id)) || {}).name || ''),
    pct: (str(c.kind) === 'budget') ? Math.max(-20, Math.min(20, Math.round(Number(c.pct) || 0))) : null,
    reason: str(c.reason || '').slice(0, 200),
    auto: (str(c.kind) === 'budget' || str(c.kind) === 'pause' || str(c.kind) === 'activate'),   // doorvoerbaar via de API
  }));
  return { status: 200, body: { ok: true, platform, changes } };
}

// teamAdsApply (ADV-3 stap 2): voer de GOEDGEKEURDE wijzigingen één voor één door via de Ads-API.
// Server-side her-validatie + budget ±20%-clamp zit in metaApplyChange/googleApplyChange. Alles gelogd.
export async function teamAdsApply(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const email = str(body.account_email).toLowerCase();
  if (!rr.perms.admin && !ADS_TEAM.has(email)) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const bedrijfId = cleanTaskId(body.bedrijf_id); if (!bedrijfId) return { status: 400, body: { ok: false, error: 'no_bedrijf' } };
  const platform = (str(body.platform) === 'google') ? 'google' : 'meta';
  const changes = (Array.isArray(body.changes) ? body.changes : []).filter((c) => c && ADS_KINDS.has(str(c.kind)) && str(c.id)).slice(0, 10);
  if (!changes.length) return { status: 200, body: { ok: false, error: 'geen_wijzigingen' } };
  let gCustomer = '';
  if (platform === 'google') { try { const br = await cu.get(env, `/task/${bedrijfId}`); if (br && br.ok && br.data) gCustomer = str(getCF(br.data, FIELD.googleAdsId)).replace(/[^0-9]/g, ''); } catch (e) { /* */ } }
  if (platform === 'google' && !gCustomer) return { status: 200, body: { ok: false, error: 'geen_account', message: 'Kon het Google Ads-account van deze klant niet bevestigen; niets doorgevoerd.' } };
  // VEILIGHEID: bind elke change-id aan de campagnes van DÉZE klant/dit account. Het Meta-systeemtoken
  // schrijft account-overschrijdend, dus een verwisselde id zou anders een vreemde live campagne raken.
  const period = ['last_7d', 'last_14d', 'last_30d'].indexOf(str(body.period)) >= 0 ? str(body.period) : 'last_30d';
  const vrange = adsRange(period);
  let validIds = new Set();
  try { const vr = (platform === 'google') ? await googleAds(bedrijfId, { from: vrange.from, to: vrange.to }, env) : await metaAds(bedrijfId, { from: vrange.from, to: vrange.to }, env); const vb = vr && vr.body; if (vb && vb.ok && Array.isArray(vb.campaigns)) validIds = new Set(vb.campaigns.map((c) => str(c.id))); } catch (e) { /* */ }
  if (!validIds.size) return { status: 200, body: { ok: false, error: 'geen_campagnes', message: 'Kon de campagnes van deze klant niet bevestigen; uit veiligheid niets doorgevoerd.' } };
  const results = [];
  for (const c of changes) {
    if (str(c.kind) === 'bid' || str(c.kind) === 'advies') { results.push({ id: str(c.id), kind: str(c.kind), ok: false, err: 'enkel_advies' }); continue; }
    if (!validIds.has(str(c.id))) { results.push({ id: str(c.id), name: str(c.name || ''), kind: str(c.kind), ok: false, err: 'onbekende_campagne' }); continue; }
    let r;
    try { r = (platform === 'google') ? await googleApplyChange(env, gCustomer, c) : await metaApplyChange(env, c); } catch (e) { r = { ok: false, err: 'fout' }; }
    results.push({ id: str(c.id), name: str(c.name || ''), kind: str(c.kind), ok: !!(r && r.ok), applied: r && r.applied, err: r && r.err });
  }
  const okN = results.filter((x) => x.ok).length;
  // logboek op de bedrijf-taak (zo blijft elke automatische wijziging traceerbaar)
  try {
    const lines = results.map((x) => (x.ok ? '✓' : '✗') + ' ' + x.kind + ' · ' + (x.name || x.id) + (x.applied && x.applied.from != null ? (' (' + x.applied.from + '→' + x.applied.to + ')') : '') + (x.ok ? '' : ' [' + str(x.err) + ']')).join('\n');
    await cu.comment(env, bedrijfId, '✦ [AI-ADVERTENTIEWIJZIGINGEN · ' + (platform === 'google' ? 'Google Ads' : 'Meta Ads') + ' · door ' + (rr.me && rr.me.naam || email) + ']\n' + lines, false);
  } catch (e) { /* */ }
  // Geheugen (Stage 4): de juiste specialist onthoudt welke wijzigingen zijn doorgevoerd.
  if (okN > 0) { try { const done = results.filter((x) => x.ok).map((x) => x.kind + ' op ' + (x.name || x.id)).join(', '); await adsSpecMemAction(env, platform, bedrijfId, 'Doorgevoerde ' + (platform === 'google' ? 'Google' : 'Meta') + '-wijziging(en) via het portaal: ' + done + ' (door ' + (rr.me && rr.me.naam || email) + ').', str(rr.me && (rr.me.naam || email))); } catch (e) { /* */ } }
  try { for (const p of ['last_7d', 'last_14d', 'last_30d']) await env.KV.delete('team:adsoverview:' + p); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, applied: okN, total: results.length, results } };
}

/* ===========================================================================
 * AUTOMATISERINGEN-OVERZICHT (make.com-stijl), alle integraties, AI-knoppen,
 * geplande taken, externe scenario's en portaal-automatiseringen op één scherm,
 * met live status (verbonden / slaapt / config nodig / extern). Enkel admin.
 * =========================================================================== */
export async function teamAutomations(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'admin'); if (deny) return deny;
  const has = (k) => !!str(env && env[k]);
  let remOn = false; try { remOn = str(await env.KV.get('reminders:enabled')) === '1'; } catch (e) { /* */ }
  // status: 'live' (werkt) | 'config' (wacht op koppeling/sleutel) | 'slaapt' (klaar maar uit) | 'extern' (draait in Make)
  const integraties = [
    { naam: 'ClickUp', wat: 'Taken, projecten, offertes, meetings, kandidaten, bedrijven', status: has('CLICKUP_TOKEN') ? 'live' : 'config' },
    { naam: 'Webflow', wat: 'Vacatures lezen/bewerken, foto-upload, open/dicht', status: has('WEBFLOW_TOKEN') ? 'live' : 'config', detail: 'CMS lezen+schrijven + assets' },
    { naam: 'Meta Ads', wat: 'Advertentiecijfers + wijzigingen doorvoeren (ADV)', status: has('META_SYSTEM_TOKEN') ? 'live' : 'config' },
    { naam: 'Google Ads', wat: 'Advertentiecijfers + wijzigingen doorvoeren (ADV)', status: (has('GOOGLE_ADS_DEVELOPER_TOKEN') && has('GOOGLE_ADS_REFRESH_TOKEN')) ? 'live' : 'config' },
    { naam: 'Google Analytics 4 + Search Console', wat: 'Web- en vacaturepagina-statistieken', status: (has('SA_CLIENT_EMAIL') && has('SA_PRIVATE_KEY')) ? 'live' : 'config' },
    { naam: 'Metricool', wat: 'Social posts inplannen (vacature-lancering, socials-planner)', status: has('METRICOOL_API_KEY') ? 'live' : 'config' },
    { naam: 'Gmail (verzenden)', wat: 'AI-mails: afwijzen, CV opvragen, offerte-opvolging', status: (has('SA_CLIENT_EMAIL') && has('SA_PRIVATE_KEY')) ? 'live' : 'config', detail: 'no-reply@studio27.be via service-account' },
    { naam: 'Gmail (lezen / HR-5)', wat: 'Antwoorden + cv\'s van kandidaten auto-importeren', status: 'config', detail: 'Wacht op gmail.readonly-scope op de service-account' },
    { naam: 'Google Drive', wat: 'Mappen + bestanden van klanten', status: (has('SA_CLIENT_EMAIL') && has('SA_PRIVATE_KEY')) ? 'live' : 'config' },
    { naam: 'PandaDoc', wat: 'Offertes genereren en versturen', status: has('PANDADOC_API_KEY') ? 'live' : 'config' },
    { naam: 'Twilio (WhatsApp)', wat: 'WhatsApp-notificaties (pilot)', status: (has('TWILIO_ACCOUNT_SID') && has('TWILIO_AUTH_TOKEN')) ? 'live' : 'config' },
    { naam: 'Web Push', wat: 'Pushmeldingen in het portaal', status: has('VAPID_PRIVATE_JWK') ? 'live' : 'config' },
    { naam: 'Anthropic (Claude)', wat: 'Alle AI-knoppen en analyses', status: has('ANTHROPIC_API_KEY') ? 'live' : 'config' },
    { naam: 'OpenAI Whisper (HR-6)', wat: 'Gesprek opnemen + transcriberen', status: has('OPENAI_API_KEY') ? 'live' : 'config', detail: 'Wacht op OPENAI_API_KEY' },
    { naam: 'Google Gemini', wat: 'Carrousel-visuals voor social-vacaturelancering', status: has('GEMINI_API_KEY') ? 'live' : 'config', detail: 'Wacht op GEMINI_API_KEY (valt terug op de vacaturefoto)' },
  ];
  const aiKnoppen = [
    { naam: 'Briefing samenvatten / Volgende stappen / Vrije vraag / Tekst verbeteren', waar: 'Elk project (taakdetail)', wat: 'Project-AI op basis van de briefing', status: has('ANTHROPIC_API_KEY') ? 'live' : 'config' },
    { naam: 'HTML voorbereiden + Volledige V9 (cloud)', waar: 'Webdesign-taken', wat: 'Genereert website-HTML', status: 'live', detail: 'V9-cloudroutine wacht op trigger-URL+token' },
    { naam: 'Vriendelijk afwijzen / CV opvragen', waar: 'Werving (kandidaat-dossier)', wat: 'AI-mail in S27-tone naar de kandidaat', status: 'live' },
    { naam: 'Hard case genereren', waar: 'Werving (kandidaat-dossier)', wat: 'Fictieve case uit de functie', status: 'live' },
    { naam: 'Gesprek opnemen + transcriberen', waar: 'Werving (kandidaat-dossier)', wat: 'Opname → Whisper → samenvatting', status: has('OPENAI_API_KEY') ? 'live' : 'config' },
    { naam: 'Mails ophalen', waar: 'Werving (kandidaat-dossier)', wat: 'Antwoorden + cv\'s importeren', status: 'config', detail: 'Wacht op gmail.readonly' },
    { naam: 'Contract genereren', waar: 'Werving (kandidaat-dossier)', wat: 'AI-arbeidsovereenkomst (Word)', status: 'live' },
    { naam: 'Vacature-AI (nieuw zonder template)', waar: 'Vacatures', wat: 'Tone-of-voice + aanzet + foto', status: has('WEBFLOW_TOKEN') ? 'live' : 'config' },
    { naam: 'Social-lancering vacature', waar: 'Vacatures', wat: 'AI-caption → Metricool concept', status: has('METRICOOL_API_KEY') ? 'live' : 'config' },
    { naam: 'Offerte-opvolgmail', waar: 'Offerteaanvragen (detail)', wat: 'AI-opvolgmail naar het contact', status: 'live' },
    { naam: 'Advertentie-analyse + wijzigingen', waar: 'Adverteerders (klantdetail)', wat: 'AI-voorstellen → doorvoeren via Ads-API', status: 'live', detail: 'Budget gecapt ±20%, per wijziging goedkeuren' },
    { naam: 'AI-dagplanning', waar: 'Home', wat: 'Claude plant je dag rond je agenda', status: has('ANTHROPIC_API_KEY') ? 'live' : 'config' },
  ];
  const geplandeTaken = [
    { naam: 'Reminder-engine', wat: 'Automatische herinneringen op taken', schema: 'Dagelijks 07:00 UTC', status: remOn ? 'live' : 'slaapt', detail: remOn ? 'Pilot actief' : 'KV-switch uit' },
    { naam: 'Zoekindex warmhouden', wat: 'De ⌘K-zoekindex vooraf opbouwen', schema: 'Dagelijks 07:00 UTC', status: 'live' },
    { naam: 'Capaciteit / cijfers / rendement-snapshots', wat: 'Dashboards vooraf berekenen', schema: 'Dagelijks 07:00 UTC', status: 'live' },
    { naam: 'AI-dagplan vooraf berekenen', wat: 'Ieders dagplanning klaarzetten voor Home', schema: 'Dagelijks 03:00 UTC', status: has('ANTHROPIC_API_KEY') ? 'live' : 'config' },
    { naam: 'Maandelijkse ads-snapshot', wat: 'Meta-maandtotalen wegschrijven', schema: '1e van de maand 03:00 UTC', status: 'live' },
  ];
  const extern = [
    { naam: 'Sollicitatie-intake', wat: 'Vacatureformulier → ClickUp-taak + cv-bijlage', waar: 'Make', status: 'extern' },
    { naam: 'Ticket-mail → ClickUp', wat: 'Ticketmail → ClickUp-ticket + bedrijf/contact', waar: 'Make', status: 'extern' },
    { naam: '27 Moments sales→planning', wat: 'Trouw-offerte → projecttaken + mails', waar: 'Make', status: 'extern' },
  ];
  const portaal = [
    { naam: 'Thuiswerkdag → Google Calendar', wat: 'Markeren in planner → agenda-event + blokkeert meetings', status: 'live' },
    { naam: 'Versie-push', wat: 'Hele team naar de nieuwste versie duwen', status: 'live' },
    { naam: 'Offerte goedgekeurd → Drive-map', wat: 'Auto-map in de S27-shared drive + link op het bedrijf', status: 'config', detail: 'In aanbouw; wacht op de drive-id van de nieuwe S27-shared drive' },
  ];
  return { status: 200, body: { ok: true, groepen: [
    { titel: 'Integraties & koppelingen', items: integraties },
    { titel: 'AI-knoppen', items: aiKnoppen },
    { titel: 'Geplande taken (cron)', items: geplandeTaken },
    { titel: 'Portaal-automatiseringen', items: portaal },
    { titel: 'Externe scenario\'s (Make)', items: extern },
  ] } };
}

/* ===========================================================================
 * [13] PROJECT OPSTARTEN → Google Drive-mapstructuur (gedeelde 'S27 - Drive').
 * Trigger: knop in het offerte-traject (geen auto). Volledig idempotent
 * (find-or-create), dus opnieuw klikken maakt geen dubbele mappen en synct
 * nieuwe hoofdtaken bij. Structuur: <Klant> → <jaar> → <projectnaam> → één map
 * per hoofdtaak (= subtaak van de offerte). De klant-map-link staat al op het
 * bedrijf ('Drive-map' via driveEnsure); de projectmap-link schrijven we naar
 * het 'Drive-projectfolder'-veld op de offerte-taak. Admin/sales/finance.
 * =========================================================================== */
export async function teamProjectStart(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (!(rr.perms.admin || rr.role === 'sales' || rr.perms.finance)) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const taskId = str(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  // offerte-taak ophalen, inclusief subtaken (= de hoofdtaken van het project)
  let tr; try { tr = await cu.get(env, `/task/${taskId}?include_subtasks=true`); } catch (e) { tr = null; }
  if (!tr || !tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'task_not_found', message: 'Kon de offerte-taak niet ophalen.' } };
  const t = tr.data;
  const bedrijfId = getRelationIds(t, FIELD.bedrijf)[0] || str(body.bedrijf_id) || '';
  if (!bedrijfId) return { status: 200, body: { ok: false, error: 'no_bedrijf', message: 'Deze offerte is nog niet aan een bedrijf gekoppeld. Koppel eerst het bedrijf.' } };
  // 1. klant-map (idempotent; schrijft tegelijk de 'Drive-map'-URL op het bedrijf)
  let ens; try { ens = await driveEnsure(bedrijfId, { __staff: true }, env); } catch (e) { ens = null; }
  const companyFolderId = ens && ens.body && ens.body.company_folder_id;
  if (!companyFolderId) return { status: 200, body: { ok: false, error: 'drive_unavailable', message: 'Kon de klant-map niet aanmaken. Controleer de Drive-koppeling (GDRIVE_SUBJECT).' } };
  // 2. jaar-map
  const jaar = String(new Date().getFullYear());
  const yearFolderId = await driveFindOrCreateSubfolder(env, companyFolderId, jaar);
  // 3. project-map (val terug op de klant-map als de jaar-map faalt)
  const projNaam = (str(t.name).trim() || 'Project').slice(0, 120);
  const projectFolderId = await driveFindOrCreateSubfolder(env, yearFolderId || companyFolderId, projNaam);
  if (!projectFolderId) return { status: 200, body: { ok: false, error: 'drive_unavailable', message: 'Kon de projectmap niet aanmaken.' } };
  const projectUrl = `https://drive.google.com/drive/folders/${projectFolderId}`;
  // 4. één map per hoofdtaak (subtaak van de offerte), idempotent
  const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
  const taakmappen = [];
  for (const s of subs) {
    const nm = str(s && s.name).trim(); if (!nm) continue;
    const fid = await driveFindOrCreateSubfolder(env, projectFolderId, nm.slice(0, 120));
    if (fid) taakmappen.push({ naam: nm, url: `https://drive.google.com/drive/folders/${fid}` });
  }
  // 5. projectmap-URL terugschrijven naar de offerte-taak ('Drive-projectfolder')
  try { await cu.field(env, taskId, FIELD.driveFolder, projectUrl); } catch (e) { /* veld optioneel */ }
  return { status: 200, body: { ok: true, bedrijf_id: bedrijfId, jaar,
    company_folder_url: `https://drive.google.com/drive/folders/${companyFolderId}`,
    project_folder_url: projectUrl, project_naam: projNaam, taakmappen,
    created_company: !!(ens.body && ens.body.created) } };
}

/* ===========================================================================
 * GEZONDHEID / FITNESS (STRIKT enkel Vincent), dagoverzicht uit Apple Health
 * (via iOS-Shortcut-ingest), doelen/instellingen, en een AI-sportcoach (Claude 4)
 * die rekening houdt met doelen + recente cijfers + vrije agenda-slots.
 * PRIVACY: gegate op rr.real_me.id (de ECHTE ingelogde persoon) zodat zelfs admin-
 * impersonatie het nooit kan tonen. Niet-medisch (system-prompt + UI-disclaimer).
 * =========================================================================== */
const HEALTH_OWNER = 8714037;   // Vincent, enige eigenaar van dit scherm
const SPORT_VENSTERS = [['10:30', '11:00'], ['11:00', '12:00'], ['13:30', '14:30']];
function denyHealth(rr) {
  if (!rr || !rr.real_me || Number(rr.real_me.id) !== HEALTH_OWNER) return { status: 403, body: { ok: false, error: 'forbidden', message: 'Persoonlijk scherm.' } };
  return null;
}
function ctEqual(a, b) {
  a = String(a == null ? '' : a); b = String(b == null ? '' : b);
  if (a.length !== b.length) return false;
  let out = 0; for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
const HEALTH_DEFAULTS = { doel: 'Spiervolume + lean blijven', dagen: 4, duur: 40, slots: ['10:30', '11:00', '13:30'], split: '60% kracht / 40% cardio', wandelband: true, wandelband_freq: 'op cardio-dagen', thuisadres: '', stappen_doel: 10000, streefgewicht: null, reminders: true };

async function healthSampleDagen(env, n) {
  const out = [];
  const keys = [];
  for (let i = 0; i < n; i++) { const ymd = msToBrusselsYmd(Date.now() - i * 86400000); keys.push(ymd); }
  const recs = await Promise.all(keys.map((ymd) => env.KV.get('health:samples:' + HEALTH_OWNER + ':' + ymd, 'json').then((v) => [ymd, v]).catch(() => [ymd, null])));
  for (const [ymd, v] of recs) if (v) out.push(Object.assign({ date: ymd }, v));
  return out;   // nieuwste eerst
}
// In-app gelogde workouts (de NIEUWE bron. Vincent logt zelf i.p.v. uit Apple Health te lezen).
const WORKOUT_TYPES = ['Kracht, bovenlichaam', 'Kracht, onderlichaam', 'Kracht, full body', 'Cardio', 'Wandelband', 'Wandeling / loop', 'Andere'];
const WORKOUT_GEVOEL = ['licht', 'normaal', 'zwaar', 'uitgeput'];
async function healthWorkoutDagen(env, n) {
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(msToBrusselsYmd(Date.now() - i * 86400000));
  const recs = await Promise.all(keys.map((ymd) => env.KV.get('health:workouts:' + HEALTH_OWNER + ':' + ymd, 'json').then((v) => [ymd, v]).catch(() => [ymd, null])));
  const out = [];
  for (const [ymd, v] of recs) if (Array.isArray(v)) for (const w of v) out.push(Object.assign({ date: ymd }, w));
  return out.sort((a, b) => (b.ts || 0) - (a.ts || 0));   // nieuwste eerst
}
async function gezondheidVrijeSlots(env, ymd) {
  let busy = [];
  try { const evs = await gcalEventsForHost(env, 'vincent@studio27.be', brusselsWallToMs(ymd, '00:00'), brusselsWallToMs(ymd, '23:59')); busy = (evs || []).map(gcalEventToInterval).filter(Boolean); } catch (e) { busy = []; }
  return SPORT_VENSTERS.map(([van, tot]) => { const s = brusselsWallToMs(ymd, van), e = brusselsWallToMs(ymd, tot); return { van, tot, vrij: !busy.some((b) => e > b[0] && s < b[1]) }; });
}
async function aiCall(env, system, user, maxTokens) {
  // gaat nu door de agnostische wrapper → volgt de globale modelkeuze (Claude/Gemini/GPT).
  return aiComplete(env, AI_MODEL, system, user, maxTokens || 1000, { skill: 'sportcoach' });
}

// teamHealthSettings: doelen ophalen/opslaan (KV, permanent).
export async function teamHealthSettings(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const d = denyHealth(rr); if (d) return d;
  const CK = 'health:settings:' + HEALTH_OWNER;
  if (body.save) {
    let cur = {}; try { cur = (await env.KV.get(CK, 'json')) || {}; } catch (e) { /* */ }
    const clampN = (v, lo, hi, def) => { const n = Number(v); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
    const s = Object.assign({}, HEALTH_DEFAULTS, cur, {
      doel: str(body.doel || cur.doel || HEALTH_DEFAULTS.doel).slice(0, 80),
      dagen: clampN(body.dagen, 1, 7, cur.dagen || 4),
      duur: clampN(body.duur, 15, 120, cur.duur || 40),
      slots: Array.isArray(body.slots) ? body.slots.filter((x) => /^\d{1,2}:\d{2}$/.test(str(x))).slice(0, 6) : (cur.slots || HEALTH_DEFAULTS.slots),
      split: str(body.split || cur.split || HEALTH_DEFAULTS.split).slice(0, 40),
      wandelband: body.wandelband != null ? !!body.wandelband : (cur.wandelband != null ? cur.wandelband : true),
      wandelband_freq: str(body.wandelband_freq || cur.wandelband_freq || HEALTH_DEFAULTS.wandelband_freq).slice(0, 40),
      thuisadres: str(body.thuisadres != null ? body.thuisadres : (cur.thuisadres || '')).slice(0, 200),
      stappen_doel: clampN(body.stappen_doel, 1000, 50000, cur.stappen_doel || 10000),
      streefgewicht: (body.streefgewicht === '' || body.streefgewicht == null) ? (cur.streefgewicht ?? null) : clampN(body.streefgewicht, 30, 250, null),
      reminders: body.reminders != null ? !!body.reminders : (cur.reminders != null ? cur.reminders : true),
    });
    try { await env.KV.put(CK, JSON.stringify(s)); } catch (e) { return { status: 200, body: { ok: false, error: 'kv' } }; }
    return { status: 200, body: { ok: true, settings: s } };
  }
  let cur = {}; try { cur = (await env.KV.get(CK, 'json')) || {}; } catch (e) { /* */ }
  return { status: 200, body: { ok: true, settings: Object.assign({}, HEALTH_DEFAULTS, cur) } };
}

// teamHealthDag: dagoverzicht (Apple Health-cijfers + agenda-sessies + voortgang).
export async function teamHealthDag(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const d = denyHealth(rr); if (d) return d;
  let settings = {}; try { settings = Object.assign({}, HEALTH_DEFAULTS, (await env.KV.get('health:settings:' + HEALTH_OWNER, 'json')) || {}); } catch (e) { settings = HEALTH_DEFAULTS; }
  const samples = await healthSampleDagen(env, 30);
  const vandaagYmd = msToBrusselsYmd(Date.now());
  const vandaag = samples.find((s) => s.date === vandaagYmd) || null;
  const metGewicht = samples.filter((s) => s.weight_kg != null);
  const vorigeGewicht = metGewicht.length > 1 ? metGewicht[1].weight_kg : null;
  // agenda-sportsessies deze week
  let sessies = [];
  try {
    const wkStart = Date.now(), wkTot = Date.now() + 7 * 86400000;
    const evs = await gcalEventsForHost(env, 'vincent@studio27.be', wkStart, wkTot);
    const re = /sport|training|gym|workout|fitness|loop|cardio|kracht|wandel|hardloop|fiets/i;
    sessies = (evs || []).filter((ev) => re.test(str(ev.summary)) && ev.start && (ev.start.dateTime || ev.start.date)).map((ev) => {
      const ms = ev.start.dateTime ? Date.parse(ev.start.dateTime) : brusselsWallToMs(str(ev.start.date), '09:00');
      return { titel: str(ev.summary), datum_ymd: msToBrusselsYmd(ms), uur: ev.start.dateTime ? msToBrusselsHm(ms) : '' };
    }).sort((a, b) => (a.datum_ymd + a.uur).localeCompare(b.datum_ymd + b.uur)).slice(0, 12);
  } catch (e) { sessies = []; }
  const last7 = samples.filter((s) => s.date >= msToBrusselsYmd(Date.now() - 7 * 86400000));
  const stappen7 = last7.filter((s) => s.steps != null);
  const stappen7Gem = stappen7.length ? Math.round(stappen7.reduce((a, s) => a + s.steps, 0) / stappen7.length) : null;
  const gesyncTs = vandaag ? (vandaag.ingest_ts || 0) : (samples[0] ? samples[0].ingest_ts || 0 : 0);
  // ── gelogde workouts (de nieuwe bron) ──
  const loggedAll = await healthWorkoutDagen(env, 21);
  const wv2 = weekVensters();
  const dezeWk = loggedAll.filter((w) => w.ts >= wv2.deze.van && w.ts <= wv2.deze.tot);
  const gelogd = { week_aantal: dezeWk.length, week_min: dezeWk.reduce((a, w) => a + (Number(w.duur) || 0), 0), doel: settings.dagen };
  const workoutsRecent = loggedAll.slice(0, 10);
  return {
    status: 200, body: {
      ok: true, vandaag, vorige_gewicht: vorigeGewicht, gesynct_ts: gesyncTs,
      sessies, settings,
      workouts_recent: workoutsRecent, gelogd, types: WORKOUT_TYPES, gevoelens: WORKOUT_GEVOEL,
      voortgang: {
        sessies_week: sessies.filter((s) => s.datum_ymd >= vandaagYmd && s.datum_ymd < msToBrusselsYmd(Date.now() + 7 * 86400000)).length,
        sessies_doel: settings.dagen,
        stappen_7d: stappen7Gem, stappen_doel: settings.stappen_doel,
        gewicht_30d: metGewicht.slice(0, 14).map((s) => ({ date: s.date, kg: s.weight_kg })).reverse(),
      },
      heeft_data: samples.length > 0 || loggedAll.length > 0,
    },
  };
}

// teamHealthAdvies: Claude-sportcoach (scope dag/week) op basis van doelen + cijfers + vrije slots.
export async function teamHealthAdvies(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const d = denyHealth(rr); if (d) return d;
  const scope = str(body.scope) === 'week' ? 'week' : 'dag';
  let settings = {}; try { settings = Object.assign({}, HEALTH_DEFAULTS, (await env.KV.get('health:settings:' + HEALTH_OWNER, 'json')) || {}); } catch (e) { settings = HEALTH_DEFAULTS; }
  const samples = await healthSampleDagen(env, 7);
  const dagen = scope === 'week' ? 7 : 1;
  const slotLijnen = [];
  for (let i = 0; i < dagen; i++) {
    const ymd = msToBrusselsYmd(Date.now() + i * 86400000);
    const dow = new Date(ymd + 'T12:00:00Z').getUTCDay();
    if (dow === 0 || dow === 6) { slotLijnen.push(ymd + ' (weekend)'); continue; }
    const vs = await gezondheidVrijeSlots(env, ymd);
    slotLijnen.push(ymd + ': ' + vs.map((s) => s.van + '-' + s.tot + (s.vrij ? ' VRIJ' : ' bezet')).join(', '));
  }
  // GELOGDE workouts = primaire bron (wat Vincent écht deed). Apple Health-cijfers = optionele context.
  const logged = await healthWorkoutDagen(env, 7);
  const gedaan = logged.length ? logged.map((w) => w.date + ': ' + str(w.type) + ' · ' + (Number(w.duur) || 0) + 'min · ' + str(w.gevoel || 'normaal') + (w.avg_hr ? ' · ' + w.avg_hr + 'bpm gem' + (w.max_hr ? '/' + w.max_hr + ' max' : '') : '') + (w.note ? ' (' + str(w.note) + ')' : '')).join('\n') : '(nog geen workouts gelogd deze week)';
  const passief = samples.length ? samples.map((s) => s.date + ': ' + [s.steps != null ? s.steps + ' stappen' : '', s.sleep_minutes ? Math.round(s.sleep_minutes / 6) / 10 + 'u slaap' : '', s.weight_kg ? s.weight_kg + 'kg' : '', s.resting_hr ? s.resting_hr + 'bpm rust' : ''].filter(Boolean).join(', ')).filter((l) => l.indexOf(': ') < l.length - 2).join('\n') : '(geen Apple Health-cijfers, niet nodig)';
  const system = 'Je bent de persoonlijke sport- en leefstijlcoach van Vincent (zaakvoerder van Studio 27). Je geeft een concreet, haalbaar trainingsvoorstel op basis van zijn doelen, de workouts die hij zélf logde in de app, eventuele extra cijfers en vrije agenda-slots. Eerlijk, nuchter, ondersteunend, Vlaams. DOEL: meer spiervolume opbouwen én lean blijven; kracht + cardio, korte sessies, hij heeft een wandelband. Respecteer zijn ingestelde dagen/week, sessieduur, kracht/cardio-split en voorkeurslots. Werk vooral op CONSISTENTIE, AFWISSELING (niet 2x na elkaar dezelfde spiergroep) en HERSTEL op basis van de gelogde sessies, hoe zwaar ze aanvoelden én de hartslag indien aanwezig (hoge gem./max bpm = hoge intensiteit → meer herstel nodig; dalende rust-/werkhartslag over weken = conditie verbetert). HARDE REGELS: geen medisch advies/diagnoses/medicatie/klinische voedingsschema\'s; bij pijn/blessure/duizeligheid/hartklachten/extreme vermoeidheid → adviseer rust + arts/kinesist, niet doortrainen; verzin geen cijfers die niet in de data staan; plan enkel in VRIJE slots; herstel telt mee (gisteren "zwaar"/"uitgeput" of dezelfde spiergroep recent → lichtere dag, andere spiergroep of wandelband). Antwoord in Markdown met **vetgedrukte** koppen. ' + (scope === 'week' ? 'Geef een korte weekindeling per trainingsdag (kracht/cardio afgewisseld volgens de split, rustdagen expliciet) + 2-3 aandachtspunten over balans/herstel.' : 'Geef "**Vandaag**" met 1 concreet sessievoorstel (type, slot, duur, 3-5 oefeningen/cardio, afgestemd op wat hij recent al deed) en "**Herstel & voeding**" met 2-3 ondersteunende niet-medische tips.') + ' Begin direct met de eerste kop, geen inleiding.';
  const user = 'Doelen: ' + JSON.stringify(settings) + '\n\nGelogde workouts (laatste 7 dagen, nieuwste eerst):\n' + gedaan + '\n\nExtra cijfers (optioneel):\n' + passief + '\n\nVrije voorkeurslots:\n' + slotLijnen.join('\n') + '\n\nGeef het ' + (scope === 'week' ? 'weekplan' : 'advies voor vandaag') + '.';
  const res = await Promise.race([aiCall(env, system, user, scope === 'week' ? 1500 : 900), new Promise((r) => setTimeout(() => r({ err: 'ai_timeout' }), 15000))]);
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: (res && res.err) || 'ai_fout' } };
  return { status: 200, body: { ok: true, advies: res.text, scope, gegenereerd: Date.now() } };
}

// teamHealthLog: workout zélf loggen in de app (de nieuwe hoofdbron). add / del / lijst.
export async function teamHealthLog(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const d = denyHealth(rr); if (d) return d;
  const dayKey = (ymd) => 'health:workouts:' + HEALTH_OWNER + ':' + ymd;
  const TTL = 400 * 24 * 3600;
  if (body.add) {
    const ymd = /^\d{4}-\d{2}-\d{2}$/.test(str(body.date)) ? str(body.date) : msToBrusselsYmd(Date.now());
    const dur = Math.min(300, Math.max(1, Math.round(Number(body.duur) || 0)));
    if (!dur) return { status: 200, body: { ok: false, error: 'geen_duur' } };
    const type = WORKOUT_TYPES.includes(str(body.type)) ? str(body.type) : 'Andere';
    const gevoel = WORKOUT_GEVOEL.includes(str(body.gevoel)) ? str(body.gevoel) : 'normaal';
    const note = str(body.note || '').slice(0, 200);
    const hr = (v) => { const n = Math.round(Number(v) || 0); return (n >= 30 && n <= 250) ? n : 0; };
    const avgHr = hr(body.avg_hr), maxHr = hr(body.max_hr);
    const entry = { id: 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36), ts: Date.now(), type, duur: dur, gevoel, note };
    if (avgHr) entry.avg_hr = avgHr;
    if (maxHr) entry.max_hr = maxHr;
    let arr = []; try { arr = (await env.KV.get(dayKey(ymd), 'json')) || []; } catch (e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    arr.push(entry); if (arr.length > 12) arr = arr.slice(-12);
    try { await env.KV.put(dayKey(ymd), JSON.stringify(arr), { expirationTtl: TTL }); } catch (e) { return { status: 200, body: { ok: false, error: 'kv' } }; }
    return { status: 200, body: { ok: true, entry: Object.assign({ date: ymd }, entry) } };
  }
  if (body.del) {
    const ymd = /^\d{4}-\d{2}-\d{2}$/.test(str(body.date)) ? str(body.date) : '';
    const id = str(body.del);
    if (!ymd || !id) return { status: 200, body: { ok: false, error: 'param' } };
    let arr = []; try { arr = (await env.KV.get(dayKey(ymd), 'json')) || []; } catch (e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    const next = arr.filter((w) => str(w.id) !== id);
    try { await env.KV.put(dayKey(ymd), JSON.stringify(next), { expirationTtl: TTL }); } catch (e) { return { status: 200, body: { ok: false, error: 'kv' } }; }
    return { status: 200, body: { ok: true } };
  }
  const recent = await healthWorkoutDagen(env, 30);
  return { status: 200, body: { ok: true, workouts: recent, types: WORKOUT_TYPES, gevoelens: WORKOUT_GEVOEL } };
}

// handleHealthIngest: Apple Health → KV. SECRET-gated (geen Firebase-token), voor de iOS-Shortcut.
// Wordt vanuit worker.js geroute (publiek pad /health/ingest), NIET via TEAM_HANDLERS.
export async function handleHealthIngest(request, env) {
  if (request.method !== 'POST') return { status: 405, body: { ok: false, error: 'method' } };
  if (!env || !env.HEALTH_INGEST_SECRET || !env.KV) return { status: 501, body: { ok: false, error: 'not_configured' } };
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'x';
    const rk = 'rlip:healthingest:' + ip + ':' + Math.floor(Date.now() / 60000);
    const cur = parseInt((await env.KV.get(rk)) || '0', 10);
    if (cur >= 30) return { status: 429, body: { ok: false, error: 'rate_limited' } };
    await env.KV.put(rk, String(cur + 1), { expirationTtl: 120 });
  } catch (e) { /* fail-open op de teller */ }
  if (!ctEqual(request.headers.get('X-Health-Secret') || '', str(env.HEALTH_INGEST_SECRET))) return { status: 403, body: { ok: false, error: 'forbidden' } };
  let b = {}; try { b = await request.json(); } catch (e) { b = {}; }
  if (!b || typeof b !== 'object') b = {};
  const ymd = /^\d{4}-\d{2}-\d{2}$/.test(str(b.date)) ? str(b.date) : msToBrusselsYmd(Date.now());
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };
  const key = 'health:samples:' + HEALTH_OWNER + ':' + ymd;
  let prev = {}; try { prev = (await env.KV.get(key, 'json')) || {}; } catch (e) { prev = {}; }
  const keep = (nw, old) => (nw != null ? nw : (old != null ? old : null));
  const rec = {
    steps: keep(num(b.steps), prev.steps), active_energy: keep(num(b.active_energy), prev.active_energy),
    resting_hr: keep(num(b.resting_hr), prev.resting_hr), hrv: keep(num(b.hrv), prev.hrv),
    sleep_minutes: keep(num(b.sleep_minutes), prev.sleep_minutes), weight_kg: keep(num(b.weight_kg), prev.weight_kg),
    body_fat: keep(num(b.body_fat), prev.body_fat), workouts: keep(num(b.workouts), prev.workouts),
    workout_minutes: keep(num(b.workout_minutes), prev.workout_minutes), ingest_ts: Date.now(),
  };
  try { await env.KV.put(key, JSON.stringify(rec), { expirationTtl: 400 * 24 * 3600 }); } catch (e) { return { status: 200, body: { ok: false, error: 'kv' } }; }
  // OPTIONEEL: workout-hartslag (van een Kortcommando dat na een workout de HR-summary post) →
  // hangen aan de laatste gelogde workout van die dag die nog geen HR heeft.
  let hrAttached = false;
  const aHr = num(b.workout_avg_hr), mHr = num(b.workout_max_hr);
  if (aHr || mHr) {
    const clamp = (n) => (n != null && n >= 30 && n <= 250) ? Math.round(n) : 0;
    const wkey = 'health:workouts:' + HEALTH_OWNER + ':' + ymd;
    try {
      let arr = (await env.KV.get(wkey, 'json')) || [];
      if (Array.isArray(arr) && arr.length) {
        let tgt = null;
        for (let i = arr.length - 1; i >= 0; i--) { if (!arr[i].avg_hr && !arr[i].max_hr) { tgt = arr[i]; break; } }
        if (!tgt) tgt = arr[arr.length - 1];
        const ca = clamp(aHr), cm = clamp(mHr);
        if (ca) tgt.avg_hr = ca; if (cm) tgt.max_hr = cm;
        if (ca || cm) { await env.KV.put(wkey, JSON.stringify(arr), { expirationTtl: 400 * 24 * 3600 }); hrAttached = true; }
      }
    } catch (e) { /* fail-soft */ }
  }
  return { status: 200, body: { ok: true, date: ymd, hr_attached: hrAttached } };
}

// teamVersionPush (admin): zet team:appversion → alle teamclients herladen hard naar deze versie.
export async function teamVersionPush(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'admin'); if (deny) return deny;   // enkel de zaakvoerder
  const v = Math.round(Number(body && body.version)) || 0;
  if (!v || v < 1 || v > 100000) return { status: 400, body: { ok: false, message: 'Ongeldig versienummer.' } };
  let cur = 0; try { cur = Number(await env.KV.get('team:appversion')) || 0; } catch (e) { cur = 0; }
  if (v < cur) return { status: 200, body: { ok: false, message: `Er staat al een nieuwere versie (v${cur}) gepusht.`, huidige: cur } };
  try { await env.KV.put('team:appversion', String(v)); } catch (e) { return { status: 502, body: { ok: false, message: 'Opslaan lukte niet, probeer zo opnieuw.' } }; }
  return { status: 200, body: { ok: true, versie: v, message: `Versie ${v} wordt nu bij alle teamleden doorgeduwd (binnen ~5 min, of meteen bij het openen van de app).` } };
}

/* ===========================================================================
 * AI-ACTIES op projecten (één-klik, per actie geoptimaliseerd prompt + projectcontext).
 * Provider-onafhankelijk via llmComplete: nu Claude (werkt), Gemini/OpenAI = haakjes
 * klaar voor zodra de sleutels gezet zijn. Start = ALGEMENE set (elk project).
 * =========================================================================== */
/* ===========================================================================
 * AI-ACTIES PER TYPE JOB (discipline). AI_CORE = vaste org-brede acties (hard in
 * code, nooit wisbaar). KV team:aiacties:v1 = door de admin beheerde extra acties,
 * elk met scope (discipline-keys of 'algemeen') + zichtbaarheid (rollen/personen).
 * De effectieve catalogus = AI_CORE ∪ KV-items (core wint bij key-conflict).
 * =========================================================================== */
const AI_CORE = [
  { key: 'samenvatten', label: 'Briefing samenvatten', ic: '📋', input: false, lbl: '', max: 700, scope: 'algemeen', actief: true, bron: 'core', volgorde: 1, sys: 'Vat de projectbriefing bondig samen in heldere bullets: doel, doelgroep, deliverables, deadline en aandachtspunten. Is de briefing dun of onduidelijk, benoem dan kort wat nog ontbreekt om goed te kunnen starten.' },
  { key: 'stappen', label: 'Volgende stappen', ic: '✅', input: false, lbl: '', max: 800, scope: 'algemeen', actief: true, bron: 'core', volgorde: 2, sys: 'Geef een concreet, geprioriteerd stappenplan om dit project vooruit te helpen: korte, uitvoerbare acties in logische volgorde. Praktisch, geen vaagheid.' },
  { key: 'vraag', label: 'Vrije vraag', ic: '❓', input: true, lbl: 'VRAAG VAN HET TEAMLID', max: 1000, scope: 'algemeen', actief: true, bron: 'core', volgorde: 3, sys: 'Beantwoord de vraag van het teamlid over dit project op basis van de projectcontext. Wees concreet en eerlijk; zeg het expliciet als de context het antwoord niet bevat in plaats van te gokken.' },
  { key: 'verbeter', label: 'Tekst verbeteren', ic: '✍️', input: true, lbl: 'TE VERBETEREN TEKST', max: 1400, scope: 'algemeen', actief: true, bron: 'core', volgorde: 4, sys: 'Herschrijf de aangeleverde tekst zodat ze helderder, vlotter en professioneel-marketingwaardig wordt, in de stijl die past bij een marketingbureau en de klant. Behoud de kernboodschap, taal en feiten. Geef ENKEL de verbeterde tekst terug, zonder uitleg eromheen.' },
  // Speciale (niet-prompt) AI-knoppen: aangedreven door een eigen handler i.p.v. teamAiAction. 'type' stuurt de frontend-dispatch.
  { key: 'html-prep', label: 'HTML voorbereiden', ic: '🌐', input: false, lbl: '', max: 0, scope: ['webdesign'], actief: true, bron: 'core', volgorde: 10, type: 'html', sys: '' },
  { key: 'v9-cloud', label: 'Volledige V9 (cloud)', ic: '☁️', input: false, lbl: '', max: 0, scope: ['webdesign'], actief: true, bron: 'core', volgorde: 11, type: 'v9', sys: '' },
];
// disciplines (1:1 met de frontend DISC_LABEL-keys), voor de admin-keuzechips.
// Scope per TYPE JOB (de ClickUp TYPE JOB-keys, incl. shoot/edit), labels voor de beheer-chips.
const TYPEJOB_KEUZE = [
  { key: 'webdesign', label: 'Webdesign' }, { key: 'fbWebdesign', label: 'Webdesign, feedback' },
  { key: 'shoot', label: 'Shoot' }, { key: 'ugcShoot', label: 'UGC-shoot' }, { key: 'preproductie', label: 'Preproductie' },
  { key: 'edit', label: 'Edit / montage' }, { key: 'fbEdit', label: 'Edit, feedback' },
  { key: 'branding', label: 'Branding' }, { key: 'strategie', label: 'Strategie' }, { key: 'copywriting', label: 'Copywriting' },
  { key: 'seo', label: 'SEO' }, { key: 'socialMedia', label: 'Social media' }, { key: 'adverteren', label: 'Adverteren' },
  { key: 'automation', label: 'Automation' }, { key: 'opleiding', label: 'Opleiding' }, { key: 'meeting', label: 'Meeting' },
  { key: 'projectmanagement', label: 'Projectmanagement' }, { key: 'support', label: 'Support' }, { key: 'hosting', label: 'Hosting' }, { key: 'bestelling', label: 'Bestelling' },
];
const AIACT_CK = 'team:aiacties:v1';
const AI_CORE_KEYS = AI_CORE.map((a) => a.key);
// geldige type-job-keys (gedeeld door AI-acties EN de agent/skill/plugin-knoppen, zodat een knop
// per type job zichtbaar wordt in de taakdetail — niet enkel in de view-tabs).
const TYPEJOB_KEYS = new Set(TYPEJOB_KEUZE.map((x) => x.key));
function aiNormScope(s) { if (s === 'algemeen') return 'algemeen'; if (Array.isArray(s)) { const v = s.map((x) => str(x).trim()).filter(Boolean).slice(0, 20); return v.length ? v : 'algemeen'; } return 'algemeen'; }
function aiNormItem(raw, bron) {
  if (!raw || typeof raw !== 'object') return null;
  const label = str(raw.label).trim().slice(0, 80); if (!label) return null;
  const sys = str(raw.sys).trim().slice(0, 4000); if (!sys) return null;
  return {
    key: str(raw.key).trim().slice(0, 50), label, ic: (str(raw.ic).slice(0, 4) || '✨'),
    sys, input: !!raw.input, lbl: str(raw.lbl).slice(0, 60), max: Math.max(200, Math.min(4000, Number(raw.max) || 900)),
    scope: aiNormScope(raw.scope),
    vis: { roles: (raw.vis && Array.isArray(raw.vis.roles)) ? raw.vis.roles.map(String).slice(0, 8) : [], members: (raw.vis && Array.isArray(raw.vis.members)) ? raw.vis.members.map(Number).filter(Boolean).slice(0, 40) : [] },
    bron: bron || 'kv', actief: raw.actief !== false, volgorde: Number(raw.volgorde) || 50,
    aangevraagd_door: str(raw.aangevraagd_door).slice(0, 80),
    model: AI_MODEL_IDS.has(str(raw.model)) ? str(raw.model) : '',   // '' = volg het globale model
  };
}
async function readAiKvItems(env) { let kv = null; try { kv = await env.KV.get(AIACT_CK, 'json'); } catch (e) { /* */ } return (kv && Array.isArray(kv.items)) ? kv.items : []; }
async function saveAiKvItems(env, items) { try { await env.KV.put(AIACT_CK, JSON.stringify({ _t: Date.now(), items })); return true; } catch (e) { return false; } }
// Een core-item kan door de admin bewerkt worden: de KV-override (zelfde key) wint per veld;
// key/type/bron blijven van de code-default (prompt enkel bewerkbaar voor niet-speciale items).
function applyCoreOverride(core, ov) {
  if (!ov) return core;
  const m = Object.assign({}, core);
  if (typeof ov.label === 'string' && ov.label.trim()) m.label = ov.label.trim().slice(0, 80);
  if (typeof ov.ic === 'string' && ov.ic) m.ic = ov.ic.slice(0, 4);
  if ((!core.type || core.type === 'html') && typeof ov.sys === 'string' && ov.sys.trim()) m.sys = ov.sys.trim().slice(0, 4000);
  if (typeof ov.input === 'boolean') m.input = ov.input;
  if (typeof ov.lbl === 'string') m.lbl = ov.lbl.slice(0, 60);
  if (ov.max != null) m.max = Math.max(200, Math.min(4000, Number(ov.max) || core.max));
  if (ov.scope !== undefined) m.scope = aiNormScope(ov.scope);
  if (ov.vis !== undefined) m.vis = { roles: (ov.vis && Array.isArray(ov.vis.roles)) ? ov.vis.roles.map(String).slice(0, 8) : [], members: (ov.vis && Array.isArray(ov.vis.members)) ? ov.vis.members.map(Number).filter(Boolean).slice(0, 40) : [] };
  if (typeof ov.actief === 'boolean') m.actief = ov.actief;
  if (typeof ov.model === 'string') m.model = AI_MODEL_IDS.has(ov.model) ? ov.model : '';
  m.bewerkt = true;
  return m;
}
async function getAiCatalog(env) {
  const kvRaw = await readAiKvItems(env);
  const kvByKey = {}; for (const raw of kvRaw) { const k = str(raw.key); if (k) kvByKey[k] = raw; }
  const out = []; const seen = new Set();
  for (const c of AI_CORE) {
    // altijd een kloon (override clonet al; anders zelf clonen) → AI_CORE nooit muteren
    let item = kvByKey[c.key] ? applyCoreOverride(c, kvByKey[c.key]) : Object.assign({}, c);
    // 'HTML voorbereiden' toont/bewerkt de echte systeemprompt: vul de default in als er geen override is.
    if (c.key === 'html-prep' && !str(item.sys).trim()) item.sys = HTML_SYS;
    out.push(item); seen.add(c.key);
  }
  for (const raw of kvRaw) { const k = str(raw.key); if (!k || seen.has(k)) continue; seen.add(k); const n = aiNormItem(raw, 'kv'); if (n) out.push(n); }
  out.sort((a, b) => (a.volgorde - b.volgorde) || a.label.localeCompare(b.label, 'nl'));
  return out;
}
function aiItemFor(catalog, key) { for (const a of catalog) if (a.key === key) return a; return null; }
function aiVisible(item, disc, role, memberId) {
  if (!item || !item.actief) return false;
  const scopeOk = item.scope === 'algemeen' || (Array.isArray(item.scope) && item.scope.indexOf(disc) >= 0);
  if (!scopeOk) return false;
  const vr = (item.vis && item.vis.roles) || [], vm = (item.vis && item.vis.members) || [];
  if (!vr.length && !vm.length) return true;
  return vr.indexOf(role) >= 0 || vm.indexOf(Number(memberId)) >= 0;
}
function aiGenKey(label, taken) { let base = str(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'actie'; let k = base, n = 2; while (taken.indexOf(k) >= 0) { k = base + '-' + n; n++; } return k; }
// Provider-onafhankelijke completion. provider: 'claude' (nu) | 'gemini' | 'openai' (haakjes).
async function llmComplete(env, opts) {
  const provider = str(opts.provider || 'claude');
  if (provider === 'claude') return aiCall(env, opts.system, opts.user, opts.maxTokens);
  if (provider === 'gemini') return str(env && env.GEMINI_API_KEY) ? { err: 'gemini_todo' } : { err: 'gemini_niet_geconfigureerd' };
  if (provider === 'openai') return str(env && env.OPENAI_API_KEY) ? { err: 'openai_todo' } : { err: 'openai_niet_geconfigureerd' };
  return { err: 'onbekende_provider' };
}
// taakContextBlob: verzamelt ALLE relevante data van één taak (hoofdtaak + custom fields + gekoppeld
// bedrijf + contactpersoon + ALLE subtasks) als één tekst-context-blob voor de AI. Zo heeft elke
// AI-knop (en straks ook agent/skill-knoppen) bij het indienen de volledige projectcontext.
async function taakContextBlob(env, taskId) {
  let tr; try { tr = await cu.get(env, `/task/${taskId}?include_subtasks=true`); } catch (e) { tr = null; }
  if (!tr || !tr.ok || !tr.data) return { ok: false, tekst: '', tj: '', naam: '', bedrijf: '' };
  const t = tr.data;
  const bid = (getRelationIds(t, FIELD.bedrijf)[0]) || '';
  const cid = (getRelationIds(t, FIELD.contact)[0]) || '';
  let bedrijf = '';
  if (bid) { try { bedrijf = str((await bedrijvenNaamMap(env))[bid] || ''); } catch (e) { /* */ } }
  let contact = '';
  if (cid) { try { const ctr = await cu.get(env, `/task/${cid}`); if (ctr && ctr.ok && ctr.data) { const ct = ctr.data; const vn = str(getCF(ct, '626a0441-8824-4381-a89a-4639ac547e23')); const an = str(getCF(ct, '79cbda71-626b-424c-8f78-d0785c52126a')); const naam = (vn + ' ' + an).trim() || str(ct.name); const email = str(getCF(ct, FIELD.email)); const gsm = str(getCF(ct, FIELD.gsm)); contact = [naam, email && ('e-mail ' + email), gsm && ('gsm ' + gsm)].filter(Boolean).join(', '); } } catch (e) { /* */ } }
  const subs = (Array.isArray(t.subtasks) ? t.subtasks : []).map((s) => { const st = statusMapper(s.status); const due = s.due_date ? msToBrusselsYmd(Number(s.due_date)) : ''; const ass = buildSae(s).map((a) => a.naam || a.initialen).filter(Boolean).join('/'); return '- ' + str(s.name) + ' [' + ((st && st.label) || '?') + ']' + (ass ? ' · ' + ass : '') + (due ? ' · deadline ' + due : ''); }).join('\n');
  const due = Number(t.due_date) || 0;
  const ass = buildSae(t).map((a) => a.naam || a.initialen).filter(Boolean).join(', ');
  const tjLabel = (TYPEJOB_KEUZE.find((x) => x.key === typeJobKey(t)) || {}).label || disciplineOf(t) || '';
  const status = (statusMapper(t.status) || {}).label || str(t.status && t.status.status) || '-';
  const brief = str(t.description || t.text_content || '').slice(0, 8000);
  const lines = [
    'Taak: ' + str(t.name),
    tjLabel ? 'Type job: ' + tjLabel : '',
    'Status: ' + status,
    bedrijf ? 'Klant: ' + bedrijf : '',
    contact ? 'Contactpersoon: ' + contact : '',
    ass ? 'Toegewezen aan: ' + ass : '',
    (t.priority && t.priority.priority) ? 'Prioriteit: ' + str(t.priority.priority) : '',
    due ? 'Deadline: ' + msToBrusselsYmd(due) : '',
    t.time_estimate ? 'Tijdsinschatting: ' + (Math.round(Number(t.time_estimate) / 3600000 * 10) / 10) + ' u' : '',
    subs ? ('Subtaken (' + (t.subtasks || []).length + '):\n' + subs) : 'Geen subtaken.',
    brief ? ('Briefing:\n' + brief) : '(geen briefing ingevuld)',
  ].filter(Boolean);
  return { ok: true, tekst: lines.join('\n'), tj: str(typeJobKey(t)), naam: str(t.name), bedrijf };
}

export async function teamAiAction(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const catalog = await getAiCatalog(env);
  const act = aiItemFor(catalog, str(body.action));
  if (!act) return { status: 400, body: { ok: false, error: 'bad_action' } };
  if (act.type) return { status: 400, body: { ok: false, error: 'special_action' } };   // html-prep/v9-cloud lopen via hun eigen endpoint
  const input = str(body.input || '').slice(0, 6000);
  if (act.input && !input) return { status: 200, body: { ok: false, error: 'geen_input' } };
  // lichte per-gebruiker-throttle (AI kost geld): 40/uur
  try {
    const who = str(body.account_email || 'x').toLowerCase();
    const rk = 'rl:aiaction:' + who + ':' + Math.floor(Date.now() / 3600000);
    const cur = parseInt((await env.KV.get(rk)) || '0', 10);
    if (cur >= 40) return { status: 200, body: { ok: false, error: 'rate_limited', message: 'Je AI-limiet voor dit uur is bereikt, probeer straks opnieuw.' } };
    await env.KV.put(rk, String(cur + 1), { expirationTtl: 3700 });
  } catch (e) { /* fail-open */ }
  // VOLLEDIGE projectcontext: hoofdtaak + custom fields + gekoppeld bedrijf + contactpersoon + ALLE subtasks.
  const blob = await taakContextBlob(env, taskId);
  const tj = blob.tj;
  // server-side poort (anti-spoof): de actie moet zichtbaar zijn voor dit TYPE JOB + deze rol
  if (!aiVisible(act, tj, rr.role, rr.me.id)) return { status: 403, body: { ok: false, error: 'not_allowed', message: 'Deze AI-actie is niet beschikbaar voor dit type job.' } };
  const ctx = blob.ok ? blob.tekst : '(taakgegevens niet beschikbaar)';
  const system = 'Je bent de AI-projectassistent van Studio 27, een Vlaams marketingbureau. Je helpt teamleden vooruit op hun projecten. Antwoord in vlot, professioneel Nederlands (Vlaams), concreet en direct bruikbaar, in beknopte Markdown. Verzin nooit feiten die niet in de projectcontext staan. ' + act.sys;
  const user = 'PROJECTCONTEXT:\n' + ctx + (act.input ? ('\n\n' + (act.lbl || 'INPUT') + ':\n' + input) : '') + '\n\nGeef je antwoord.';
  // per-knop model (opts.knop) > globaal model; gaat door de agnostische wrapper.
  const res = await Promise.race([aiComplete(env, AI_MODEL, system, user, act.max, { knop: act.key }), new Promise((r) => setTimeout(() => r({ err: 'ai_timeout' }), 30000))]);
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: (res && res.err) || 'ai_fout' } };
  return { status: 200, body: { ok: true, text: res.text, action: str(body.action) } };
}
// teamAiCatalog: de modal haalt de catalogus + context op (filtert client-side per discipline+rol).
export async function teamAiCatalog(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  return { status: 200, body: { ok: true, items: await getAiCatalog(env), role: rr.role, me_id: rr.me.id, is_admin: rr.real_admin, roster: rosterFrom(rr.leden), typejobs: TYPEJOB_KEUZE, modellen: AI_MODELS.map((x) => ({ id: x.id, naam: x.naam, provider: x.provider })), globaal_model: await aiGlobalModel(env) } };
}
// teamAiActieSave/Delete/Toggle: ALLEEN de echte admin (Vincent) beheert de catalogus.
// Core-items zijn nu óók bewerkbaar: een wijziging wordt als KV-override (zelfde key) bewaard.
export async function teamAiActieSave(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder beheert de AI-knoppen.' } };
  const inItem = (body.item && typeof body.item === 'object') ? body.item : {};
  let key = str(inItem.key).trim();
  const core = AI_CORE.find((c) => c.key === key);
  if (core) {
    // core-override: bewaar de bewerkte velden in KV onder de core-key
    const ov = {
      key, label: str(inItem.label).slice(0, 80) || core.label, ic: str(inItem.ic).slice(0, 4) || core.ic,
      input: !!inItem.input, lbl: str(inItem.lbl).slice(0, 60), max: Math.max(200, Math.min(4000, Number(inItem.max) || core.max || 900)),
      scope: aiNormScope(inItem.scope),
      vis: { roles: (inItem.vis && Array.isArray(inItem.vis.roles)) ? inItem.vis.roles.map(String).slice(0, 8) : [], members: (inItem.vis && Array.isArray(inItem.vis.members)) ? inItem.vis.members.map(Number).filter(Boolean).slice(0, 40) : [] },
      actief: inItem.actief !== false,
      model: AI_MODEL_IDS.has(str(inItem.model)) ? str(inItem.model) : '',
    };
    if (!core.type || core.type === 'html') { const sys = str(inItem.sys).trim().slice(0, 4000); if (!sys) return { status: 200, body: { ok: false, error: 'geen_prompt', message: 'Geef een AI-instructie (prompt).' } }; ov.sys = sys; }
    const items = (await readAiKvItems(env)).filter((x) => str(x.key) !== key); items.push(ov);
    if (!await saveAiKvItems(env, items)) return { status: 502, body: { ok: false, message: 'Opslaan lukte niet, probeer zo opnieuw.' } };
    return { status: 200, body: { ok: true, item: applyCoreOverride(core, ov) } };
  }
  const norm = aiNormItem(body.item, 'kv');
  if (!norm) return { status: 200, body: { ok: false, error: 'ongeldig', message: 'Geef minstens een naam én een AI-instructie (prompt).' } };
  const items = await readAiKvItems(env);
  if (!norm.key) norm.key = aiGenKey(norm.label, AI_CORE_KEYS.concat(items.map((x) => str(x.key))));
  const idx = items.findIndex((x) => str(x.key) === norm.key);
  if (idx >= 0) items[idx] = norm; else items.push(norm);
  if (!await saveAiKvItems(env, items)) return { status: 502, body: { ok: false, message: 'Opslaan lukte niet, probeer zo opnieuw.' } };
  return { status: 200, body: { ok: true, item: norm } };
}
export async function teamAiActieDelete(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const key = str(body.key || '');
  // core-key: verwijder enkel de override → terug naar de standaard (reset). pure KV: weg.
  const items = (await readAiKvItems(env)).filter((x) => str(x.key) !== key);
  if (!await saveAiKvItems(env, items)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true, reset: AI_CORE_KEYS.indexOf(key) >= 0 } };
}
export async function teamAiActieToggle(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const key = str(body.key || ''); const actief = !!body.actief;
  const items = await readAiKvItems(env); let it = items.find((x) => str(x.key) === key);
  if (it) it.actief = actief;
  else if (AI_CORE_KEYS.indexOf(key) >= 0) items.push({ key, actief });   // core-override: minimale actief-vlag
  else return { status: 200, body: { ok: false, error: 'not_found' } };
  if (!await saveAiKvItems(env, items)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true } };
}
// teamAiModel: globaal AI-model lezen/instellen (AI-agnostisch wisselen Claude/Gemini/GPT). Zetten = enkel admin.
export async function teamAiModel(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (body.save) {
    if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder kiest het AI-model.' } };
    const m = str(body.model); if (!AI_MODEL_IDS.has(m)) return { status: 400, body: { ok: false, error: 'bad_model' } };
    const def = AI_MODELS.find((x) => x.id === m);
    if (def && !str(env[def.env])) return { status: 200, body: { ok: false, error: 'no_key', message: 'De API-sleutel voor ' + def.provider + ' (' + def.env + ') is nog niet gezet.' } };
    try { await env.KV.put(AIMODEL_CK, m); } catch (e) { return { status: 502, body: { ok: false } }; }
    _aiGlobalCache = { v: '', t: 0 };
    return { status: 200, body: { ok: true, model: m } };
  }
  // status per provider (sleutel aanwezig?) zodat de UI toont wat bruikbaar is.
  const models = AI_MODELS.map((x) => ({ id: x.id, naam: x.naam, provider: x.provider, beschikbaar: !!str(env[x.env]) }));
  return { status: 200, body: { ok: true, model: await aiGlobalModel(env), models, is_admin: rr.real_admin } };
}

/* ===========================================================================
 * AGENT-BOUWER. Een "agent" is een opgeslagen, gespecialiseerde AI: eigen naam,
 * icoon, systeemprompt, gekozen model (uit AI_MODELS, of leeg = volg globaal) en
 * geplakte kennis. Iedereen van het team kan ermee chatten; enkel de zaakvoerder
 * maakt/bewerkt/verwijdert ze. Alles gaat door de AI-agnostische aiComplete().
 * KV: team:agents:v1 = { _t, items:[ {id,naam,ic,sys,model,kennis} ] }.
 * =========================================================================== */
const AGENTS_CK = 'team:agents:v1';
async function readAgents(env) {
  let kv = null; try { kv = await env.KV.get(AGENTS_CK, 'json'); } catch (e) { /* */ }
  return (kv && Array.isArray(kv.items)) ? kv.items : [];
}
async function saveAgents(env, items) {
  try { await env.KV.put(AGENTS_CK, JSON.stringify({ _t: Date.now(), items })); return true; } catch (e) { return false; }
}
// Ingebouwde specialist-agents (Stage 4): idempotent geseed in team:agents:v1 zodat ze in de agent-bouwer
// bewerkbaar zijn én als 1-klik-knop in Adverteerders verschijnen. Vaste id's. Bestaand id NOOIT overschrijven
// (admin-edits blijven behouden). Model leeg = volgt het globale model (tool-capabel via agentToolLoop).
const SEED_AGENTS = [
  {
    id: 'ag-meta-spec', naam: 'Meta Ads-specialist', ic: '📘', model: '',
    sys: 'Je bent een senior Meta (Facebook/Instagram) performance-marketeer bij Studio 27. Je analyseert het advertentieaccount van één klant en geeft scherpe, eerlijke, concrete adviezen. Roep ALTIJD eerst de meta_ads-tool aan voor de live cijfers vóór je iets beweert; verzin nooit getallen. Je advies gaat UITSLUITEND over data-instellingen en budgetverdeling (budget herverdelen, pauzeren/heractiveren, biedingen, targeting), NOOIT over het genereren of aanpassen van visuals/creatives. Blijf bij de klant uit de huidige context, tenzij de gebruiker expliciet een andere klant noemt. Wees bondig en concreet in het Nederlands, met getallen waar mogelijk.',
    tools: ['meta_ads', 'klant_info'],
    knop: { aan: true, label: 'Meta-specialist', prompt: 'Analyseer de Meta Ads van deze klant: wat loopt goed, wat moet beter, en welke 3 concrete acties raad je aan?', views: ['adverteerders'] },
  },
  {
    id: 'ag-google-spec', naam: 'Google Ads-specialist', ic: '🔍', model: '',
    sys: 'Je bent een senior Google Ads-specialist bij Studio 27. Je analyseert het Google Ads-account van één klant en geeft scherpe, eerlijke, concrete adviezen. Roep ALTIJD eerst de google_ads-tool aan voor de live cijfers vóór je iets beweert; verzin nooit getallen. Je advies gaat over campagne-instellingen, budgetverdeling, zoekwoorden/zoektermen, biedingen en kwaliteitsscore, NOOIT over visuals. Blijf bij de klant uit de huidige context, tenzij de gebruiker expliciet een andere klant noemt. Wees bondig en concreet in het Nederlands, met getallen waar mogelijk.',
    tools: ['google_ads', 'klant_info'],
    knop: { aan: true, label: 'Google-specialist', prompt: 'Analyseer de Google Ads van deze klant: wat loopt goed, wat moet beter, en welke 3 concrete acties raad je aan?', views: ['adverteerders'] },
  },
];
let _seedAgentsDone = false;
const SEED_FLAG_CK = 'team:agentseed:v1';
async function ensureSeedAgents(env) {
  if (_seedAgentsDone) return;   // per-isolate cache: geen KV-leesactie bij elke agent-call
  try {
    // EÉN keer ooit seeden (KV-vlag), niet per isolate. Zo blijven latere admin-edits én -verwijderingen
    // van de specialisten behouden (anders zou een vers isolate een verwijderde specialist terugzetten).
    let flag = null; try { flag = await env.KV.get(SEED_FLAG_CK); } catch (e) { /* */ }
    if (flag === '1') { _seedAgentsDone = true; return; }
    const items = await readAgents(env);
    const have = new Set(items.map((a) => a.id));
    let changed = false;
    for (const s of SEED_AGENTS) { if (!have.has(s.id)) { items.push(agentNorm(s)); changed = true; } }
    if (changed) await saveAgents(env, items);
    try { await env.KV.put(SEED_FLAG_CK, '1'); } catch (e) { /* */ }
    _seedAgentsDone = true;
  } catch (e) { /* fail-soft */ }
}
function docNorm(raw) {
  const d = (raw && typeof raw === 'object') ? raw : {};
  return { id: str(d.id), naam: str(d.naam).trim().slice(0, 120), size: Number(d.size) || 0, tekst: str(d.tekst).slice(0, 25000), _t: Number(d._t) || 0 };
}
function knopNorm(raw) {
  const k = (raw && typeof raw === 'object') ? raw : {};
  return {
    aan: !!k.aan,
    label: str(k.label).trim().slice(0, 50),
    prompt: str(k.prompt).trim().slice(0, 1200),
    views: Array.isArray(k.views) ? Array.from(new Set(k.views.map(String).filter((v) => AGENT_VIEW_KEYS.has(v)))).slice(0, 8) : [],
    // NIEUW: een knop kan ook één of meer TYPE JOBS targeten → hij verschijnt dan in de taakdetail
    // van elke taak met dat type job (naast de view-tabs). Backward-compat: leeg = geen type-job-targeting.
    type_jobs: Array.isArray(k.type_jobs) ? Array.from(new Set(k.type_jobs.map(String).filter((v) => TYPEJOB_KEYS.has(v)))).slice(0, 20) : [],
    // NIEUW: per-knop zichtbaarheid (voor wie), net als de AI-acties. Leeg = iedereen.
    vis: {
      roles: (k.vis && Array.isArray(k.vis.roles)) ? Array.from(new Set(k.vis.roles.map(String).filter((r) => ['admin', 'sales', 'accountmanager', 'team'].indexOf(r) >= 0))).slice(0, 8) : [],
      members: (k.vis && Array.isArray(k.vis.members)) ? Array.from(new Set(k.vis.members.map(Number).filter(Boolean))).slice(0, 40) : [],
    },
  };
}
function agentNorm(raw) {
  const a = (raw && typeof raw === 'object') ? raw : {};
  return {
    id: str(a.id),
    naam: str(a.naam).trim().slice(0, 80),
    ic: str(a.ic).trim().slice(0, 4) || '🤖',
    categorie: str(a.categorie).trim().slice(0, 40),
    sys: str(a.sys).trim().slice(0, 8000),
    model: AI_MODEL_IDS.has(str(a.model)) ? str(a.model) : '',
    kennis: str(a.kennis).slice(0, 40000),
    docs: Array.isArray(a.docs) ? a.docs.slice(0, 12).map(docNorm) : [],
    tools: Array.isArray(a.tools) ? Array.from(new Set(a.tools.map(String).filter((t) => AGENT_TOOL_KEYS.has(t)))).slice(0, 12) : [],
    mcp_servers: Array.isArray(a.mcp_servers) ? Array.from(new Set(a.mcp_servers.map(String).filter(Boolean))).slice(0, 12) : [],
    // NIEUW (#3): een agent mag bepaalde skills/plugins als tool aanroepen tijdens een gesprek.
    skill_ids: Array.isArray(a.skill_ids) ? Array.from(new Set(a.skill_ids.map(String).filter(Boolean))).slice(0, 8) : [],
    plugin_ids: Array.isArray(a.plugin_ids) ? Array.from(new Set(a.plugin_ids.map(String).filter(Boolean))).slice(0, 8) : [],
    knop: knopNorm(a.knop),
  };
}
async function appendAgentLog(env, agent_id, entry) {
  const ck = 'team:agentlog:' + str(agent_id);
  let kv = null; try { kv = await env.KV.get(ck, 'json'); } catch (e) { /* */ }
  const items = (kv && Array.isArray(kv.items)) ? kv.items : [];
  items.push(entry);
  try { await env.KV.put(ck, JSON.stringify({ _t: Date.now(), items: items.slice(-50) })); } catch (e) { /* */ }
}
// --- PER-KLANT AGENT-GEHEUGEN (Stage 4): persistente conversatie + doorgevoerde acties per agent+klant.
// Gedeeld over alle teamleden (samen één klantaccount beheren). KV: team:agentmem:<agent_id>:<bedrijf_id>.
// Max 40 entries, TTL 120 dagen. Entry: { t, rol:'gebruiker'|'agent'|'actie', tekst, user_naam?, bronnen? }.
function agentMemKey(agent_id, bedrijf_id) { return 'team:agentmem:' + str(agent_id) + ':' + str(bedrijf_id); }
async function readAgentMem(env, agent_id, bedrijf_id) {
  if (!agent_id || !bedrijf_id) return [];
  let kv = null; try { kv = await env.KV.get(agentMemKey(agent_id, bedrijf_id), 'json'); } catch (e) { /* */ }
  return (kv && Array.isArray(kv.items)) ? kv.items : [];
}
async function appendAgentMem(env, agent_id, bedrijf_id, entries) {
  if (!agent_id || !bedrijf_id) return;
  const add = (Array.isArray(entries) ? entries : [entries]).filter(Boolean).map((e) => ({
    t: Number(e.t) || Date.now(),
    rol: ['gebruiker', 'agent', 'actie'].indexOf(str(e.rol)) >= 0 ? str(e.rol) : 'agent',
    tekst: str(e.tekst).slice(0, 2500),
    user_naam: str(e.user_naam || '').slice(0, 60),
    bronnen: Array.isArray(e.bronnen) ? e.bronnen.slice(0, 8) : [],
  })).filter((e) => e.tekst);
  if (!add.length) return;
  const k = agentMemKey(agent_id, bedrijf_id);
  // Bij een TRANSIENTE leesfout NIET overschrijven: een blinde write zou het volledige geheugen wissen.
  let cur = [], readOk = true;
  try { const kv = await env.KV.get(k, 'json'); if (kv && Array.isArray(kv.items)) cur = kv.items; } catch (e) { readOk = false; }
  if (!readOk) return;
  try { await env.KV.put(k, JSON.stringify({ _t: Date.now(), items: cur.concat(add).slice(-40) }), { expirationTtl: 120 * 24 * 3600 }); } catch (e) { /* */ }
}
// Log een doorgevoerde/menselijke actie naar het geheugen van de juiste ads-specialist (platform-specifiek),
// zodat de specialist bij een volgend gesprek ziet wat al gedaan is.
async function adsSpecMemAction(env, platform, bedrijfId, tekst, user_naam) {
  if (!bedrijfId || !str(tekst)) return;
  const id = (platform === 'google') ? 'ag-google-spec' : 'ag-meta-spec';
  try { await appendAgentMem(env, id, bedrijfId, { rol: 'actie', tekst: tekst, user_naam: user_naam }); } catch (e) { /* */ }
}

/* ===========================================================================
 * MCP-CONNECTOREN. Externe Model-Context-Protocol-servers koppelen (Make/ClickUp
 * Brain-stijl): de admin plakt een https-endpoint + token, wij doen de handshake
 * en halen de tools op. Agents (en straks skills) kunnen die tools dan live
 * aanroepen. KV: team:mcp:v1 = { _t, items:[ {id,naam,ic,url,auth_token(enc),tools_cache,_t} ] }.
 * Auth-tokens worden versleuteld bewaard (mcpEncrypt/mcpDecrypt in mcp.mjs).
 * =========================================================================== */
const MCP_CK = 'team:mcp:v1';
async function readMcpConns(env) {
  let kv = null; try { kv = await env.KV.get(MCP_CK, 'json'); } catch (e) { /* */ }
  return (kv && Array.isArray(kv.items)) ? kv.items : [];
}
async function saveMcpConns(env, items) {
  try { await env.KV.put(MCP_CK, JSON.stringify({ _t: Date.now(), items })); return true; } catch (e) { return false; }
}
function mcpConnNorm(raw) {
  const c = (raw && typeof raw === 'object') ? raw : {};
  const o = (c.oauth && typeof c.oauth === 'object') ? c.oauth : null;
  return {
    id: str(c.id),
    naam: str(c.naam).trim().slice(0, 60),
    ic: str(c.ic).trim().slice(0, 4) || '🔌',
    url: str(c.url).trim().slice(0, 400),
    auth_token: str(c.auth_token),         // versleuteld bewaard (enc:...) — bij OAuth = het access-token
    auth_mode: c.auth_mode === 'oauth' ? 'oauth' : 'token',
    // Eigen OAuth-app (voor servers zonder dynamic client registration, bv. Meta/Google): de admin
    // maakt een app aan bij de aanbieder en vult het client-ID + secret in. Het secret is versleuteld.
    app_client_id: str(c.app_client_id).slice(0, 200),
    app_client_secret: str(c.app_client_secret),
    // OAuth-config voor refresh (server-side gezet via de callback; tokens/secret versleuteld)
    oauth: o ? { token_endpoint: str(o.token_endpoint).slice(0, 400), client_id: str(o.client_id).slice(0, 200), client_secret: str(o.client_secret), refresh_token: str(o.refresh_token), expiry: Number(o.expiry) || 0, resource: str(o.resource).slice(0, 400) } : null,
    tools_cache: Array.isArray(c.tools_cache) ? c.tools_cache.slice(0, 80).map((t) => ({ name: str(t.name).slice(0, 64), description: str(t.description).slice(0, 600), inputSchema: t.inputSchema || { type: 'object', properties: {} } })) : [],
    server_naam: str(c.server_naam).slice(0, 80),
    _t: Number(c._t) || 0,
  };
}
// Publieke vorm voor de frontend: NOOIT tokens/secrets meesturen, enkel of ze gezet zijn.
function mcpConnPublic(c) {
  return { id: c.id, naam: c.naam, ic: c.ic, url: c.url, heeft_token: !!c.auth_token, auth_mode: c.auth_mode || 'token', verbonden: c.auth_mode === 'oauth' ? !!(c.oauth && c.oauth.refresh_token) || !!c.auth_token : !!c.auth_token, app_client_id: str(c.app_client_id || ''), heeft_app_secret: !!c.app_client_secret, server_naam: c.server_naam, tools: (c.tools_cache || []).map((t) => ({ name: t.name, description: t.description })), tools_count: (c.tools_cache || []).length, _t: c._t };
}
// Geef een GELDIG access-token voor een connector (refresht een verlopen OAuth-token + persisteert).
// Voor token-mode: gewoon het opgeslagen token ontsleutelen. Retourneert '' als geen token.
async function mcpResolveToken(env, conn) {
  if (!conn) return '';
  if (conn.auth_mode === 'oauth' && conn.oauth) {
    const o = conn.oauth;
    const now = Date.now();
    if (conn.auth_token && o.expiry && now < o.expiry - 60000) {
      try { return await mcpDecrypt(env, conn.auth_token); } catch (e) { /* */ }
    }
    // verlopen (of geen expiry): refreshen
    let refresh = ''; try { refresh = await mcpDecrypt(env, o.refresh_token); } catch (e) { refresh = ''; }
    if (!refresh) { try { return await mcpDecrypt(env, conn.auth_token); } catch (e) { return ''; } }
    let secret = ''; if (o.client_secret) { try { secret = await mcpDecrypt(env, o.client_secret); } catch (e) { secret = ''; } }
    const rr = await mcpRefreshToken(o.token_endpoint, { refresh_token: refresh, client_id: o.client_id, client_secret: secret, resource: o.resource });
    if (!rr.ok) { try { return await mcpDecrypt(env, conn.auth_token); } catch (e) { return ''; } }
    // persisteer het verse token (+ evt. geroteerde refresh) op de connector
    try {
      const conns = await readMcpConns(env);
      const cur = conns.find((x) => x.id === conn.id);
      if (cur) {
        cur.auth_token = await mcpEncrypt(env, rr.access_token);
        cur.oauth = cur.oauth || {};
        cur.oauth.refresh_token = await mcpEncrypt(env, rr.refresh_token);
        cur.oauth.expiry = Date.now() + (rr.expires_in * 1000);
        await saveMcpConns(env, conns);
      }
    } catch (e) { /* best-effort */ }
    return rr.access_token;
  }
  try { return await mcpDecrypt(env, conn.auth_token); } catch (e) { return ''; }
}
// Laad de aanroepbare MCP-tools voor een agent (uit de gekoppelde connectoren). Geeft
// Anthropic-tool-defs terug PLUS een dispatch-map (sane-naam -> {conn, realName}).
async function loadAgentMcpTools(env, agent) {
  const ids = Array.isArray(agent && agent.mcp_servers) ? agent.mcp_servers : [];
  if (!ids.length) return { defs: [], map: {} };
  const conns = await readMcpConns(env);
  const defs = [], map = {};
  for (const id of ids) {
    const c = conns.find((x) => x.id === id);
    if (!c || !Array.isArray(c.tools_cache) || !c.tools_cache.length) continue;
    let token = ''; try { token = await mcpResolveToken(env, c); } catch (e) { token = ''; }   // refresht een verlopen OAuth-token
    for (const t of c.tools_cache) {
      const sane = mcpToolName(c.id, t.name);
      if (map[sane]) continue;
      map[sane] = { conn: { url: c.url, auth_token: token }, realName: t.name };
      defs.push({ name: sane, description: (c.naam ? '[' + c.naam + '] ' : '') + str(t.description).slice(0, 500), input_schema: (t.inputSchema && typeof t.inputSchema === 'object') ? t.inputSchema : { type: 'object', properties: {} } });
    }
  }
  return { defs, map };
}

/* ===========================================================================
 * AGENT-TOOLS (function calling). Een agent kan info-bronnen krijgen: live
 * databronnen die hij ZELF mag opvragen tijdens een gesprek (Meta Ads, Google
 * Ads, Metricool-socials, ClickUp-klantinfo). Dit zijn dezelfde server-side
 * functies + tokens als de rest van het portaal (tenant-safe: account-id's komen
 * UITSLUITEND uit de eigen bedrijf-taak in ClickUp, nooit van het model).
 *
 * Tool-calling werkt via de Anthropic messages-API (tools[]). Daarom forceren we
 * voor agents MET tools een Claude-model, ook als het globale model Gemini/GPT is.
 * Nieuwe tool toevoegen = 1 entry in AGENT_TOOLS + 1 case in execAgentTool.
 * =========================================================================== */
const AGENT_TOOLS = [
  {
    key: 'meta_ads', naam: 'Meta Ads', ic: '📘',
    omschrijving: 'Live Facebook/Instagram-advertentiedata van een klant (campagnes, uitgaven, leads, CTR, CPC).',
    schema: {
      name: 'meta_ads',
      description: 'Haal de ACTUELE Meta (Facebook/Instagram) advertentieprestaties van een klant op: account-KPI\'s (spend, impressies, klikken, resultaten, CTR, CPC, CPM), de actieve campagnes met hun cijfers, en optioneel een vergelijking met de vorige periode. Roep dit ALTIJD aan vóór je advies geeft over Meta-ads, in plaats van naar cijfers te vragen.',
      input_schema: { type: 'object', properties: {
        klant: { type: 'string', description: 'Naam van de klant/het bedrijf (bv. "ABW"). Laat leeg om de klant uit de huidige context te gebruiken.' },
        periode: { type: 'string', enum: ['last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month'], description: 'Rapportageperiode. Standaard last_30d.' },
      } },
    },
  },
  {
    key: 'google_ads', naam: 'Google Ads', ic: '🔍',
    omschrijving: 'Live Google Ads-data van een klant (campagnes, kosten, conversies, CTR, CPC).',
    schema: {
      name: 'google_ads',
      description: 'Haal de ACTUELE Google Ads-prestaties van een klant op: account-KPI\'s (kosten, impressies, klikken, conversies, CTR, CPC) en de actieve campagnes. Roep dit aan vóór je advies geeft over Google-ads.',
      input_schema: { type: 'object', properties: {
        klant: { type: 'string', description: 'Naam van de klant/het bedrijf. Laat leeg voor de klant uit de huidige context.' },
        periode: { type: 'string', enum: ['last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month'], description: 'Rapportageperiode. Standaard last_30d.' },
      } },
    },
  },
  {
    key: 'metricool_socials', naam: 'Socials (Metricool)', ic: '📅',
    omschrijving: 'Geplande en gepubliceerde social-media-posts van een klant via Metricool.',
    schema: {
      name: 'metricool_socials',
      description: 'Haal de social-media-planning van een klant op uit Metricool: geplande en gepubliceerde posts met netwerk (Instagram/Facebook/...), datum, status en tekst. Gebruik dit voor vragen over de social-contentkalender.',
      input_schema: { type: 'object', properties: {
        klant: { type: 'string', description: 'Naam van de klant/het bedrijf. Laat leeg voor de klant uit de huidige context.' },
      } },
    },
  },
  {
    key: 'klant_info', naam: 'Klantinfo (ClickUp)', ic: '🗂️',
    omschrijving: 'Basisgegevens van een klant uit ClickUp: sector, website en welke datakoppelingen actief zijn. Dient ook om de juiste klant te vinden.',
    schema: {
      name: 'klant_info',
      description: 'Zoek een klant in ClickUp en krijg de basisgegevens terug: officiële naam, website, en welke koppelingen actief zijn (Meta Ads, Google Ads, Metricool). Gebruik dit als je niet zeker bent van de juiste klantnaam, of om te checken welke databronnen voor een klant beschikbaar zijn vóór je andere tools aanroept. Zonder zoekterm krijg je een lijst van klanten.',
      input_schema: { type: 'object', properties: {
        zoek: { type: 'string', description: '(deel van) de klantnaam. Laat leeg voor een lijst van alle klanten.' },
      } },
    },
  },
];
const AGENT_TOOL_KEYS = new Set(AGENT_TOOLS.map((t) => t.key));
function agentToolByName(name) { return AGENT_TOOLS.find((t) => t.schema.name === name) || null; }

// Views waar een agent als 1-klik-knop kan verschijnen.
const AGENT_KNOP_VIEWS = [
  { key: 'adverteerders', label: 'Adverteerders' },
  { key: 'agents', label: 'AI-agents (eigen tab)' },
  { key: 'home', label: 'Home' },
];
const AGENT_VIEW_KEYS = new Set(AGENT_KNOP_VIEWS.map((v) => v.key));

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const fmtEur = (n) => '€' + r2(n).toLocaleString('nl-BE');

// Klantnaam of -id -> ClickUp-bedrijf-taak-id (fuzzy op naam; exacte id wint).
async function resolveBedrijfId(env, naamOrId) {
  const q = str(naamOrId).trim();
  if (!q) return '';
  const map = await bedrijvenNaamMap(env);
  if (map[q]) return q;                                   // exacte id
  const ql = q.toLowerCase();
  let starts = '', contains = '';
  for (const id of Object.keys(map)) {
    const nl = str(map[id]).toLowerCase();
    if (nl === ql) return id;                             // exacte naam
    if (!starts && nl.startsWith(ql)) starts = id;
    if (!contains && nl.indexOf(ql) >= 0) contains = id;
  }
  return starts || contains || '';
}

// --- compacte tool-resultaten (token-zuinig; het model krijgt tekst, geen rauwe JSON) ---
function metaCompact(b, naam) {
  const k = b.kpis || {};
  const per = b.period && (b.period.preset || ((b.period.from || '') + ' t/m ' + (b.period.to || ''))) || '';
  const out = [`Meta Ads voor ${naam} (account ${b.account}, ${b.currency || 'EUR'}, periode ${per}):`];
  out.push(`Totaal: spend ${fmtEur(k.spend)}, impressies ${k.impressions || 0}, klikken ${k.clicks || 0}, resultaten ${k.results || 0}, CTR ${r2(k.ctr)}%, CPC ${fmtEur(k.cpc)}, CPM ${fmtEur(k.cpm)}.`);
  if (b.prevKpis) { const p = b.prevKpis; out.push(`Vorige periode (${b.compareLabel || 'vergelijking'}): spend ${fmtEur(p.spend)}, resultaten ${p.results || 0}, CTR ${r2(p.ctr)}%, CPC ${fmtEur(p.cpc)}.`); }
  const cs = (b.campaigns || []).slice(0, 15);
  if (cs.length) {
    out.push('Actieve campagnes met uitgaven (' + cs.length + '):');
    cs.forEach(function (c) {
      let line = '- ' + c.name + ' [' + (c.objective || '-') + ', ' + c.status + ']: spend ' + fmtEur(c.spend) + ', resultaten ' + (c.results || 0) + ', bereik ' + (c.reach || 0) + ', CTR ' + r2(c.ctr) + '%, CPC ' + fmtEur(c.cpc) + ', freq ' + r2(c.frequency);
      if (c.prev) line += ' (vorige: spend ' + fmtEur(c.prev.spend) + ', res ' + (c.prev.results || 0) + ')';
      out.push(line);
    });
  } else out.push('Geen campagnes met uitgaven in deze periode.');
  return out.join('\n');
}
function googleCompact(b, naam) {
  const k = b.kpis || {};
  const out = [`Google Ads voor ${naam} (account ${b.account}, ${b.currency || 'EUR'}):`];
  out.push(`Totaal: kosten ${fmtEur(k.spend)}, impressies ${k.impressions || 0}, klikken ${k.clicks || 0}, conversies ${r2(k.results)}, CTR ${r2(k.ctr)}%, CPC ${fmtEur(k.cpc)}.`);
  if (b.prevKpis) { const p = b.prevKpis; out.push(`Vorige periode (${b.compareLabel || 'vergelijking'}): kosten ${fmtEur(p.spend)}, conversies ${r2(p.results)}, CTR ${r2(p.ctr)}%.`); }
  const cs = (b.campaigns || []).slice(0, 15);
  if (cs.length) {
    out.push('Actieve campagnes (' + cs.length + '):');
    cs.forEach(function (c) {
      out.push('- ' + c.name + ' [' + (c.channel || c.type || '-') + ', ' + c.status + ']: kosten ' + fmtEur(c.spend) + ', conversies ' + r2(c.results) + ', klikken ' + (c.clicks || 0) + ', CTR ' + r2(c.ctr) + '%, CPC ' + fmtEur(c.cpc));
    });
  } else out.push('Geen actieve campagnes met data in deze periode.');
  return out.join('\n');
}
function metricoolCompact(b, naam) {
  const posts = (b.posts || []).slice().sort((a, c) => str(a.datum).localeCompare(str(c.datum)));
  if (!posts.length) return `Geen geplande of gepubliceerde social-posts gevonden voor ${naam}.`;
  const out = [`Social-planning voor ${naam} via Metricool (${posts.length} posts, merk ${b.brandName || b.brandId || '-'}):`];
  posts.slice(0, 30).forEach((p) => {
    const dt = str(p.datum || '').slice(0, 16).replace('T', ' ');
    const net = str(p.netwerken || '').replace(/,/g, '/');
    const st = String(p.status || '').toUpperCase();
    const stLbl = st.indexOf('PUBLISHED') >= 0 ? 'gepubliceerd' : (p.draft || st === 'DRAFT' ? 'concept' : (st.indexOf('ERROR') >= 0 || st.indexOf('FAIL') >= 0 ? 'fout' : 'gepland'));
    let txt = ''; try { txt = decodeURIComponent(str(p.tekst || '')); } catch (e) { txt = str(p.tekst || ''); }
    txt = txt.replace(/\s+/g, ' ').slice(0, 90);
    out.push(`- ${dt || '(geen datum)'} [${net || '-'}, ${stLbl}]: ${txt}`);
  });
  if (posts.length > 30) out.push(`(+${posts.length - 30} meer)`);
  return out.join('\n');
}
async function klantInfoCompact(env, zoek) {
  const map = await bedrijvenNaamMap(env);
  const q = str(zoek).trim().toLowerCase();
  if (!q) {
    const namen = Object.keys(map).map((id) => map[id]).filter(Boolean).sort((a, b) => a.localeCompare(b, 'nl'));
    return `Bekende klanten (${namen.length}). Geef een (deel van een) naam mee om details + koppelingen te zien. Eerste 60:\n` + namen.slice(0, 60).join(', ');
  }
  const hits = Object.keys(map).filter((id) => str(map[id]).toLowerCase().indexOf(q) >= 0);
  if (!hits.length) return `Geen klant gevonden met "${zoek}". Probeer een andere schrijfwijze of laat leeg voor de volledige lijst.`;
  if (hits.length > 8) return `Meerdere klanten matchen "${zoek}" (${hits.length}). Verfijn de naam. Voorbeelden: ` + hits.slice(0, 12).map((id) => map[id]).join(', ');
  const out = [];
  for (const id of hits.slice(0, 5)) {
    let t = null; try { const br = await cu.get(env, `/task/${id}`); if (br.ok) t = br.data; } catch (e) { /* */ }
    const meta = t ? /^\d{6,20}$/.test(str(getCF(t, FIELD.metaAdsId)).trim()) : false;
    const goog = t ? /\d{10}/.test(str(getCF(t, FIELD.googleAdsId)).replace(/[^0-9]/g, '')) : false;
    const social = t ? !!str(getCF(t, FIELD.metricoolId)).trim() : false;
    const web = t ? str(getCF(t, FIELD.website) || '').trim() : '';
    const koppel = [meta ? 'Meta Ads' : '', goog ? 'Google Ads' : '', social ? 'Metricool/socials' : ''].filter(Boolean).join(', ') || 'geen datakoppelingen';
    out.push(`${map[id]} (id ${id}): ${web ? 'website ' + web + ', ' : ''}koppelingen: ${koppel}.`);
  }
  return out.join('\n');
}

// Eén tool uitvoeren; geeft ALTIJD een leesbare string terug (nooit een exception naar buiten).
async function execAgentTool(env, name, input, ctx, mcpMap) {
  input = (input && typeof input === 'object') ? input : {};
  // Skill/plugin-tool (agent roept een gekoppelde skill of plugin-keten aan) of externe MCP-connector-tool.
  if (mcpMap && mcpMap[name]) {
    const m = mcpMap[name];
    if (m.kind === 'skill') {
      try { const r = await runOneSkill(env, m.sk, str(input.invoer || ''), m.sk.access || { tools: [], mcp_servers: [] }); return r.ok ? (str(r.resultaat) || '(geen output)') : 'De skill kon niet volledig uitgevoerd worden.'; }
      catch (e) { return 'De skill gaf een fout terug.'; }
    }
    if (m.kind === 'plugin') {
      try {
        const all = await readSkills(env); const access = m.pl.access || { tools: [], mcp_servers: [] };
        let inv = str(input.invoer || ''), last = '';
        for (const sid of (m.pl.skill_ids || []).slice(0, 8)) { const s = all.find((x) => x.id === sid); if (!s) continue; const r = await runOneSkill(env, s, inv, access); if (r.resultaat) { inv = r.resultaat; last = r.resultaat; } }
        return last || '(geen output)';
      } catch (e) { return 'De plugin gaf een fout terug.'; }
    }
    // anders: externe MCP-connector-tool (genamespaced als mcp_<connId>_<naam>) → via de externe MCP-server
    try { const r = await mcpCallTool(m.conn, m.realName, input); return (r && r.ok) ? (str(r.text) || '(geen output)') : ('De connector gaf een fout terug: ' + str(r && r.text)); }
    catch (e) { return 'De connector-tool kon niet uitgevoerd worden.'; }
  }
  const ctxBid = str(ctx && ctx.bedrijf_id || '');
  const periodMap = { last_7d: 'last_7d', last_14d: 'last_14d', last_30d: 'last_30d', this_month: 'this_month', last_month: 'last_month' };
  if (name === 'meta_ads' || name === 'google_ads') {
    const bid = input.klant ? await resolveBedrijfId(env, input.klant) : ctxBid;
    if (!bid) return 'Geen klant gevonden. Gebruik eerst klant_info om de juiste klantnaam te bepalen, of geef een klantnaam mee.';
    const naam = (await bedrijvenNaamMap(env))[bid] || str(input.klant) || 'de klant';
    const period = periodMap[str(input.periode)] || 'last_30d';
    const fn = name === 'meta_ads' ? metaAds : googleAds;
    // Bij de rollende presets sturen we een datumbereik + vergelijking mee zodat het model ook de
    // evolutie t.o.v. de vorige periode ziet (metaAds/googleAds activeren compare enkel met from/to).
    const useCmp = ['last_7d', 'last_14d', 'last_30d'].indexOf(period) >= 0;
    const reqBody = useCmp ? { from: adsRange(period).from, to: adsRange(period).to, compare: 'previous' } : { period };
    let b = null; try { const r = await fn(bid, reqBody, env); b = r && r.body; } catch (e) { return `Kon de ${name === 'meta_ads' ? 'Meta' : 'Google'}-data niet ophalen (technische fout).`; }
    if (!b || !b.ok) return 'De advertentiedata kon niet opgehaald worden.';
    if (!b.linked) return `${naam} heeft geen gekoppeld ${name === 'meta_ads' ? 'Meta Ads' : 'Google Ads'}-account in ClickUp (of de koppeling staat verkeerd).`;
    return name === 'meta_ads' ? metaCompact(b, naam) : googleCompact(b, naam);
  }
  if (name === 'metricool_socials') {
    const bid = input.klant ? await resolveBedrijfId(env, input.klant) : ctxBid;
    if (!bid) return 'Geen klant gevonden. Gebruik eerst klant_info, of geef een klantnaam mee.';
    const naam = (await bedrijvenNaamMap(env))[bid] || str(input.klant) || 'de klant';
    let b = null; try { const r = await metricool(bid, {}, env); b = r && r.body; } catch (e) { return 'Kon de social-planning niet ophalen (technische fout).'; }
    if (!b || !b.ok) return 'De social-planning kon niet opgehaald worden.';
    if (!b.linked) return `${naam} heeft geen gekoppelde Metricool-omgeving in ClickUp.`;
    return metricoolCompact(b, naam);
  }
  if (name === 'klant_info') return klantInfoCompact(env, input.zoek);
  return 'Onbekende tool.';
}

// Agentic tool-loop op de Anthropic messages-API. baseMessages = [{role:'user'|'assistant', content}].
// Retourneert { text, tools_used } of { err }. Tools = enkel Claude.
const TOOL_NOT_DONE = 'Ik heb meerdere databronnen geraadpleegd maar kon niet tot een afgerond antwoord komen. Probeer je vraag iets te verfijnen.';
// Gemini accepteert enkel een OpenAPI-subset als parameter-schema: strip niet-ondersteunde velden
// (additionalProperties, $schema, $ref, …) recursief, vlak anyOf/oneOf/allOf af naar één concreet
// type (Gemini snapt geen unions), en geef elke property een type (Gemini vereist dat).
function geminiSchema(s) {
  if (!s || typeof s !== 'object') return { type: 'string' };
  const union = s.anyOf || s.oneOf || s.allOf;
  if (Array.isArray(union) && union.length) {
    const pick = union.find((u) => u && u.type && u.type !== 'null') || union[0] || {};
    return geminiSchema({ type: pick.type, description: s.description || pick.description, enum: pick.enum, properties: pick.properties, items: pick.items, required: pick.required });
  }
  const out = { type: str(s.type) || 'string' };
  if (s.description) out.description = str(s.description).slice(0, 300);
  if (Array.isArray(s.enum)) out.enum = s.enum;
  if (s.properties && typeof s.properties === 'object') { out.type = 'object'; out.properties = {}; for (const k of Object.keys(s.properties)) out.properties[k] = geminiSchema(s.properties[k]); }
  if (s.items) { out.type = 'array'; out.items = geminiSchema(s.items); }
  if (Array.isArray(s.required) && s.required.length) out.required = s.required;
  return out;
}
// Bouwt synthetische tool-defs voor de skills/plugins die deze agent mag aanroepen, en registreert de
// uitvoerders in `intoMap` (dezelfde map die execAgentTool ontvangt) met een 'kind'-vlag. Geeft de defs terug.
async function loadAgentSkillPluginTools(env, agent, intoMap) {
  const defs = [];
  const sane = (s) => str(s).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 48);
  const sids = Array.isArray(agent.skill_ids) ? agent.skill_ids.slice(0, 8) : [];
  const pids = Array.isArray(agent.plugin_ids) ? agent.plugin_ids.slice(0, 8) : [];
  if (sids.length) {
    const all = await readSkills(env);
    for (const sid of sids) {
      const s = all.find((x) => x.id === sid); if (!s) continue;
      const nm = 'skill_' + sane(s.id);
      defs.push({ name: nm, description: ('Voer de skill "' + str(s.naam) + '" uit' + (s.beschrijving ? ': ' + str(s.beschrijving) : '') + '. Geef in "invoer" mee waarmee de skill moet starten.').slice(0, 900), schema: { type: 'object', properties: { invoer: { type: 'string', description: str(s.invoer_label) || 'Waarmee de skill moet starten.' } } } });
      if (intoMap) intoMap[nm] = { kind: 'skill', sk: s };
    }
  }
  if (pids.length) {
    const all = await readPlugins(env);
    for (const pid of pids) {
      const p = all.find((x) => x.id === pid); if (!p) continue;
      const nm = 'plugin_' + sane(p.id);
      defs.push({ name: nm, description: ('Voer de plugin "' + str(p.naam) + '" uit (een keten van skills)' + (p.beschrijving ? ': ' + str(p.beschrijving) : '') + '.').slice(0, 900), schema: { type: 'object', properties: { invoer: { type: 'string', description: 'Startinvoer voor de keten.' } } } });
      if (intoMap) intoMap[nm] = { kind: 'plugin', pl: pluginNorm(p) };
    }
  }
  return defs;
}
// PROVIDER-AGNOSTISCHE agentic tool-loop. Dispatcht op modelnaam naar Claude/OpenAI/Gemini, zodat
// agents én skills met info-bronnen/connectoren werken ongeacht het gekozen AI-model. De uitvoering
// van een tool (execAgentTool) is voor alle drie identiek; enkel de API-vorm verschilt per provider.
async function agentToolLoop(env, agent, system, baseMessages, ctx, model, meta) {
  const builtin = (agent.tools || []).map((k) => AGENT_TOOLS.find((t) => t.key === k)).filter(Boolean).map((t) => ({ name: t.schema.name, description: t.schema.description, schema: t.schema.input_schema }));
  const mcp = await loadAgentMcpTools(env, agent);
  // NIEUW (#3): de agent mag gekoppelde skills/plugins als tool aanroepen. We bouwen synthetische tool-defs
  // en hangen de uitvoerders aan dezelfde map die execAgentTool al krijgt (mcp.map), met een 'kind'-vlag.
  const localDefs = await loadAgentSkillPluginTools(env, agent, mcp.map);
  const tools = builtin.concat(mcp.defs.map((d) => ({ name: d.name, description: d.description, schema: d.input_schema }))).concat(localDefs);
  if (!tools.length) return { err: 'geen_tools' };
  const userPrompt = (baseMessages && baseMessages[0] && str(baseMessages[0].content)) || '';
  const m = str(model);
  // kostenmonitor-context: skill = agentnaam (tenzij caller een eigen label meegeeft), platform = team.
  const lm = Object.assign({ platform: 'team', skill: 'agent:' + (str(agent && agent.naam) || 'agent') }, meta || {});
  if (/^gemini/i.test(m)) return geminiToolLoop(env, m, system, userPrompt, tools, mcp.map, ctx, lm);
  if (/^(gpt|o\d|chatgpt)/i.test(m)) return openaiToolLoop(env, m, system, userPrompt, tools, mcp.map, ctx, lm);
  return claudeToolLoop(env, m || AI_MODEL, system, userPrompt, tools, mcp.map, ctx, lm);
}
// --- Anthropic (Claude): tools[] met input_schema, tool_use-blocks, tool_result terug ---
async function claudeToolLoop(env, model, system, userPrompt, tools, mcpMap, ctx, meta) {
  const key = str(env && env.ANTHROPIC_API_KEY);
  if (!key) return { err: 'no_anthropic_key' };
  const toolDefs = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema || { type: 'object', properties: {} } }));
  const messages = [{ role: 'user', content: userPrompt }];
  const used = [];
  let inTok = 0, outTok = 0;   // som over alle loop-iteraties (elke turn verbruikt tokens)
  const flush = () => { try { return logAiUsage(env, Object.assign({ platform: 'team', skill: 'agent' }, meta || {}, { model, in_tokens: inTok, out_tokens: outTok })); } catch (e) { /* */ } };
  for (let i = 0; i < 6; i++) {
    let d = null;
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 1800, system, tools: toolDefs, messages }) });
      d = await r.json().catch(() => null);
      if (!r.ok || !d) { if (inTok || outTok) await flush(); return { err: str((d && d.error && d.error.message) || ('http_' + (r && r.status))) }; }
    } catch (e) { if (inTok || outTok) await flush(); return { err: 'network' }; }
    const u = aiUsageFrom(model, d); inTok += u.in; outTok += u.out;
    const blocks = Array.isArray(d.content) ? d.content : [];
    const toolUses = blocks.filter((b) => b && b.type === 'tool_use');
    if (d.stop_reason !== 'tool_use' || !toolUses.length) { await flush(); return { text: blocks.filter((b) => b && b.type === 'text').map((b) => str(b.text)).join('').trim(), tools_used: used, model }; }
    messages.push({ role: 'assistant', content: blocks });
    const results = [];
    for (const tu of toolUses) { used.push(str(tu.name)); let out = ''; try { out = await execAgentTool(env, str(tu.name), tu.input || {}, ctx, mcpMap); } catch (e) { out = 'De tool gaf een fout terug.'; } results.push({ type: 'tool_result', tool_use_id: tu.id, content: str(out).slice(0, 7000) }); }
    messages.push({ role: 'user', content: results });
  }
  await flush();
  return { text: TOOL_NOT_DONE, tools_used: used, model };
}
// --- OpenAI (GPT): tools[] type:function, message.tool_calls, role:'tool' terug ---
async function openaiToolLoop(env, model, system, userPrompt, tools, mcpMap, ctx, meta) {
  const key = str(env && env.OPENAI_API_KEY);
  if (!key) return { err: 'no_openai_key' };
  const toolDefs = tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.schema || { type: 'object', properties: {} } } }));
  const messages = [{ role: 'system', content: system }, { role: 'user', content: userPrompt }];
  const reasoning = /^(o\d|gpt-5)/i.test(model);
  const used = [];
  let inTok = 0, outTok = 0;
  const flush = () => { try { return logAiUsage(env, Object.assign({ platform: 'team', skill: 'agent' }, meta || {}, { model, in_tokens: inTok, out_tokens: outTok })); } catch (e) { /* */ } };
  for (let i = 0; i < 6; i++) {
    let d = null;
    try {
      const body = { model, messages, tools: toolDefs, tool_choice: 'auto' };
      body[reasoning ? 'max_completion_tokens' : 'max_tokens'] = reasoning ? 2200 : 1800;
      const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      d = await r.json().catch(() => null);
      if (!r.ok || !d) { if (inTok || outTok) await flush(); return { err: str((d && d.error && d.error.message) || ('http_' + (r && r.status))) }; }
    } catch (e) { if (inTok || outTok) await flush(); return { err: 'network' }; }
    const u = aiUsageFrom(model, d); inTok += u.in; outTok += u.out;
    const msg = d.choices && d.choices[0] && d.choices[0].message;
    if (!msg) { await flush(); return { err: 'empty' }; }
    const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
    if (!calls.length) { await flush(); return { text: str(msg.content).trim(), tools_used: used, model }; }
    messages.push(msg);
    for (const tc of calls) {
      const nm = str(tc.function && tc.function.name); used.push(nm);
      let args = {}; try { args = JSON.parse(str(tc.function && tc.function.arguments) || '{}'); } catch (e) { args = {}; }
      let out = ''; try { out = await execAgentTool(env, nm, args, ctx, mcpMap); } catch (e) { out = 'De tool gaf een fout terug.'; }
      messages.push({ role: 'tool', tool_call_id: tc.id, content: str(out).slice(0, 7000) });
    }
  }
  await flush();
  return { text: TOOL_NOT_DONE, tools_used: used, model };
}
// --- Google (Gemini): tools[].functionDeclarations, functionCall-parts, functionResponse terug ---
async function geminiToolLoop(env, model, system, userPrompt, tools, mcpMap, ctx, meta) {
  const key = str(env && env.GEMINI_API_KEY);
  if (!key) return { err: 'no_gemini_key' };
  const funcDecls = tools.map((t) => ({ name: t.name, description: t.description, parameters: geminiSchema(t.schema) }));
  const contents = [{ role: 'user', parts: [{ text: userPrompt }] }];
  const used = [];
  let inTok = 0, outTok = 0;
  const flush = () => { try { return logAiUsage(env, Object.assign({ platform: 'team', skill: 'agent' }, meta || {}, { model, in_tokens: inTok, out_tokens: outTok })); } catch (e) { /* */ } };
  for (let i = 0; i < 6; i++) {
    let d = null;
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, tools: [{ functionDeclarations: funcDecls }], generationConfig: { maxOutputTokens: 1800 } }) });
      d = await r.json().catch(() => null);
      if (!r.ok || !d) { if (inTok || outTok) await flush(); return { err: str((d && d.error && d.error.message) || ('http_' + (r && r.status))) }; }
    } catch (e) { if (inTok || outTok) await flush(); return { err: 'network' }; }
    const u = aiUsageFrom(model, d); inTok += u.in; outTok += u.out;
    const cand = d.candidates && d.candidates[0];
    const parts = (cand && cand.content && Array.isArray(cand.content.parts)) ? cand.content.parts : [];
    const calls = parts.filter((p) => p && p.functionCall);
    if (!calls.length) { await flush(); return { text: parts.map((p) => str(p.text)).join('').trim(), tools_used: used, model }; }
    contents.push({ role: 'model', parts });
    const respParts = [];
    for (const p of calls) { const fc = p.functionCall; const nm = str(fc.name); used.push(nm); let out = ''; try { out = await execAgentTool(env, nm, fc.args || {}, ctx, mcpMap); } catch (e) { out = 'De tool gaf een fout terug.'; } respParts.push({ functionResponse: { name: fc.name, response: { result: str(out).slice(0, 7000) } } }); }
    contents.push({ role: 'user', parts: respParts });
  }
  await flush();
  return { text: TOOL_NOT_DONE, tools_used: used, model };
}

// teamAgents: lijst + modellenkeuze voor de bouwer. Iedere medewerker mag de lijst zien
// (om te chatten); enkel admin krijgt sys/kennis terug (om te bewerken).
export async function teamAgents(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const isAdmin = rr.real_admin;
  await ensureSeedAgents(env);   // ingebouwde Meta/Google-specialisten bestaanbaar maken (idempotent)
  const agents = await readAgents(env);
  const items = agents.map((a) => isAdmin
    ? { ...a, knop: knopNorm(a.knop), tools: Array.isArray(a.tools) ? a.tools : [], mcp_servers: Array.isArray(a.mcp_servers) ? a.mcp_servers : [], docs: (a.docs || []).map((d) => ({ id: d.id, naam: d.naam, size: d.size, _t: d._t })) }
    : { id: a.id, naam: a.naam, ic: a.ic, model: a.model, kennis: a.kennis ? true : false, docs_count: (a.docs || []).length, tools: Array.isArray(a.tools) ? a.tools : [], mcp_count: (Array.isArray(a.mcp_servers) ? a.mcp_servers : []).length, knop: knopNorm(a.knop) });
  // gekoppelde MCP-connectoren (publieke vorm, zonder tokens) — enkel admin bouwt/koppelt
  const conns = isAdmin ? (await readMcpConns(env)).map(mcpConnPublic) : [];
  // skills/plugins die een agent als tool mag aanroepen (enkel admin bouwt) — lichte vorm.
  const alle_skills = isAdmin ? (await readSkills(env)).map((s) => ({ id: s.id, naam: s.naam, ic: s.ic })) : [];
  const alle_plugins = isAdmin ? (await readPlugins(env)).map((p) => ({ id: p.id, naam: p.naam, ic: p.ic })) : [];
  return {
    status: 200,
    body: {
      ok: true, items, is_admin: isAdmin,
      modellen: AI_MODELS.map((x) => ({ id: x.id, naam: x.naam, provider: x.provider, beschikbaar: !!str(env[x.env]) })),
      tools: AGENT_TOOLS.map((t) => ({ key: t.key, naam: t.naam, ic: t.ic, omschrijving: t.omschrijving })),
      mcp_connectoren: conns,
      alle_skills, alle_plugins,
      views: AGENT_KNOP_VIEWS,
      typejobs: TYPEJOB_KEUZE,
      roster: rosterFrom(rr.leden),
      globaal_model: await aiGlobalModel(env),
    },
  };
}

/* ---- MCP-connector-beheer (admin) -------------------------------------------------- */
// teamMcpList: alle gekoppelde connectoren (zonder tokens).
export async function teamMcpList(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder beheert connectoren.' } };
  return { status: 200, body: { ok: true, items: (await readMcpConns(env)).map(mcpConnPublic), redirect_uri: mcpRedirectUri(env) } };
}
// teamMcpSave: connector aanmaken/bijwerken. Body: { item:{id?,naam,ic,url,auth_token?} }.
// Het token wordt enkel (her)versleuteld als er een NIEUW token is meegestuurd; anders behouden.
export async function teamMcpSave(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder koppelt connectoren.' } };
  const inItem = (body.item && typeof body.item === 'object') ? body.item : {};
  const norm = mcpConnNorm(inItem);
  if (!norm.naam) return { status: 200, body: { ok: false, error: 'geen_naam', message: 'Geef de connector een naam.' } };
  if (!/^https:\/\//i.test(norm.url)) return { status: 200, body: { ok: false, error: 'bad_url', message: 'Geef een geldige https-URL van de MCP-server.' } };
  const conns = await readMcpConns(env);
  const idx = norm.id ? conns.findIndex((x) => x.id === norm.id) : -1;
  const incoming = str(inItem.auth_token);
  if (incoming) { norm.auth_token = await mcpEncrypt(env, incoming); norm.auth_mode = 'token'; norm.oauth = null; }   // handmatig token → token-modus
  else if (idx >= 0) { norm.auth_token = conns[idx].auth_token; norm.auth_mode = conns[idx].auth_mode || 'token'; norm.oauth = conns[idx].oauth || null; }   // behoud bestaande auth (incl. OAuth)
  else { norm.auth_token = ''; norm.auth_mode = 'token'; norm.oauth = null; }
  // eigen OAuth-app-credentials: app-ID is zichtbaar (komt mee van de frontend); het secret enkel
  // (her)versleutelen als er een nieuw is meegestuurd, anders het bestaande behouden.
  norm.app_client_id = str(inItem.app_client_id != null ? inItem.app_client_id : (idx >= 0 ? conns[idx].app_client_id : '')).slice(0, 200);
  const incSecret = str(inItem.app_client_secret);
  if (incSecret) norm.app_client_secret = await mcpEncrypt(env, incSecret);
  else if (idx >= 0) norm.app_client_secret = conns[idx].app_client_secret || '';
  else norm.app_client_secret = '';
  if (idx >= 0) { norm.tools_cache = conns[idx].tools_cache; norm.server_naam = conns[idx].server_naam; }   // cache blijft tot Test
  if (!norm.id) norm.id = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  norm._t = Date.now();
  if (idx >= 0) conns[idx] = norm; else conns.push(norm);
  if (!await saveMcpConns(env, conns)) return { status: 502, body: { ok: false, message: 'Opslaan lukte niet.' } };
  return { status: 200, body: { ok: true, item: mcpConnPublic(norm) } };
}
// teamMcpDelete: connector verwijderen. Body: { id }.
export async function teamMcpDelete(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const id = str(body.id); if (!id) return { status: 400, body: { ok: false } };
  const conns = (await readMcpConns(env)).filter((x) => x.id !== id);
  if (!await saveMcpConns(env, conns)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true } };
}
// teamMcpTest: verbinding testen + tools ophalen + cachen. Body: { id } (bestaande) of { url, auth_token } (ad-hoc, vóór opslaan).
export async function teamMcpTest(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  let url = str(body.url).trim(), token = str(body.auth_token), id = str(body.id);
  const conns = await readMcpConns(env);
  const conn = id ? conns.find((x) => x.id === id) : null;
  if (conn) { url = conn.url; if (!token) { try { token = await mcpResolveToken(env, conn); } catch (e) { token = ''; } } }
  if (!/^https:\/\//i.test(url)) return { status: 200, body: { ok: false, error: 'bad_url', message: 'Geef een geldige https-URL.' } };
  const res = await mcpListTools({ url, auth_token: token });
  if (!res.ok) {
    // mislukt zonder token? kijk of de server een login-koppeling (OAuth) aanbiedt → frontend toont dan "Verbinden via login"
    if (!token) { try { const disc = await mcpDiscoverOauth(url); if (disc.oauth) return { status: 200, body: { ok: false, error: 'oauth_required', oauth_mogelijk: true, message: 'Deze server vereist inloggen. Gebruik "Verbinden via login".' } }; } catch (e) { /* */ } }
    return { status: 200, body: { ok: false, error: res.error, message: 'Geen tools opgehaald (' + str(res.error) + '). Klopt de URL en het token?' } };
  }
  if (conn) {   // cache verversen op de bestaande connector
    conn.tools_cache = res.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
    conn.server_naam = str(res.serverInfo && res.serverInfo.name);
    conn._t = Date.now();
    await saveMcpConns(env, conns);
  }
  return { status: 200, body: { ok: true, server: res.serverInfo || {}, tools: res.tools.map((t) => ({ name: t.name, description: t.description })), tools_count: res.tools.length } };
}
// teamMcpOauthStart: start de OAuth-login-flow (admin). Ontdekt de OAuth-config van de MCP-server,
// registreert dynamisch een client (DCR), genereert PKCE + state, en geeft de authorize-URL terug.
// De frontend opent die in een popup; de externe app stuurt na login terug naar /mcpoauthcb.
// Body: { id } (bestaande connector) of { url, naam?, ic? } (nieuwe).
export async function teamMcpOauthStart(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  let url = str(body.url).trim(), id = str(body.id);
  const conns = await readMcpConns(env);
  const conn = id ? conns.find((x) => x.id === id) : null;
  if (conn) url = conn.url;
  if (!/^https:\/\//i.test(url)) return { status: 200, body: { ok: false, error: 'bad_url', message: 'Geef een geldige https-URL.' } };
  const disc = await mcpDiscoverOauth(url);
  if (!disc.oauth) return { status: 200, body: { ok: false, error: 'no_oauth', message: 'Deze server ondersteunt geen login-koppeling (OAuth). Gebruik een token.' } };
  const redirect = mcpRedirectUri(env);
  // client-ID bepalen: (1) eigen OAuth-app van de admin heeft voorrang (nodig voor Meta/Google),
  // (2) anders dynamic client registration proberen, (3) anders nette uitleg.
  let client_id = '', client_secret = '';
  const ownId = str((conn && conn.app_client_id) || body.app_client_id);
  if (ownId) {
    client_id = ownId;
    if (conn && conn.app_client_secret) { try { client_secret = await mcpDecrypt(env, conn.app_client_secret); } catch (e) { client_secret = ''; } }
    if (!client_secret) client_secret = str(body.app_client_secret);
  } else if (disc.registration_endpoint) {
    const reg = await mcpRegisterClient(disc.registration_endpoint, redirect);
    if (reg.ok) { client_id = reg.client_id; client_secret = reg.client_secret; }
  }
  if (!client_id) return { status: 200, body: { ok: false, error: 'no_client', redirect_uri: redirect, message: 'Deze server (bv. Meta of Google) registreert apps niet automatisch. Maak een OAuth-app aan bij de aanbieder, vul het client-ID + secret in onder "Eigen OAuth-app", en registreer daar deze redirect-URL: ' + redirect } };
  const verifier = mcpRandom(48);
  const challenge = await mcpPkceChallenge(verifier);
  const state = mcpRandom(24);
  const stObj = { conn_id: id, url, code_verifier: verifier, client_id, client_secret, token_endpoint: disc.token_endpoint, redirect_uri: redirect, resource: url, naam: conn ? conn.naam : str(body.naam).slice(0, 60), ic: conn ? conn.ic : (str(body.ic).slice(0, 4) || '🔌') };
  try { await env.KV.put('mcp:oauth:' + state, JSON.stringify(stObj), { expirationTtl: 600 }); } catch (e) { return { status: 502, body: { ok: false } }; }
  const qs = new URLSearchParams({ response_type: 'code', client_id, redirect_uri: redirect, state, code_challenge: challenge, code_challenge_method: 'S256', resource: url });
  if (disc.scopes) qs.set('scope', disc.scopes);
  const authorize_url = disc.authorization_endpoint + (disc.authorization_endpoint.indexOf('?') >= 0 ? '&' : '?') + qs.toString();
  return { status: 200, body: { ok: true, authorize_url } };
}
// mcpOauthCallback: GET-handler (vanuit worker.js, publiek) waar de externe app na login naar
// terugkeert. Wisselt de code in voor tokens (PKCE) en bewaart ze versleuteld op de connector.
// Beveiliging = de onraadbare, eenmalige `state` die enkel door de admin-gated start is aangemaakt.
export async function mcpOauthCallback(request, env) {
  const u = new URL(request.url);
  const code = u.searchParams.get('code') || '', state = u.searchParams.get('state') || '', err = u.searchParams.get('error') || '';
  const html = (ok, msg) => new Response('<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:-apple-system,system-ui,sans-serif;padding:48px 24px;text-align:center;color:#230F23"><div style="font-size:38px">' + (ok ? '✅' : '⚠️') + '</div><h2 style="margin:10px 0 6px">' + (ok ? 'Verbonden' : 'Niet gelukt') + '</h2><p style="color:#6B5B6B">' + msg + '</p><script>try{window.opener&&window.opener.postMessage({type:"mcp-oauth",ok:' + (ok ? 'true' : 'false') + '},"*")}catch(e){}setTimeout(function(){window.close()},900)</script></body></html>', { headers: { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'no-store' } });
  if (err) return html(false, 'De externe app gaf een foutmelding terug (' + err + ').');
  if (!code || !state) return html(false, 'Ongeldige terugkoppeling.');
  let st = null; try { st = await env.KV.get('mcp:oauth:' + state, 'json'); } catch (e) { /* */ }
  if (!st) return html(false, 'De koppelsessie is verlopen. Probeer opnieuw te verbinden.');
  try { await env.KV.delete('mcp:oauth:' + state); } catch (e) { /* */ }
  const tok = await mcpExchangeCode(st.token_endpoint, { code, redirect_uri: st.redirect_uri, client_id: st.client_id, client_secret: st.client_secret, code_verifier: st.code_verifier, resource: st.resource });
  if (!tok.ok) return html(false, 'Kon geen toegangstoken ophalen (' + str(tok.detail || tok.error) + ').');
  const conns = await readMcpConns(env);
  let conn = st.conn_id ? conns.find((x) => x.id === st.conn_id) : null;
  if (!conn) { conn = mcpConnNorm({ naam: st.naam || 'MCP-connector', ic: st.ic || '🔌', url: st.url }); conn.id = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); conns.push(conn); }
  conn.auth_mode = 'oauth';
  conn.auth_token = await mcpEncrypt(env, tok.access_token);
  conn.oauth = { token_endpoint: st.token_endpoint, client_id: st.client_id, client_secret: st.client_secret ? await mcpEncrypt(env, st.client_secret) : '', refresh_token: await mcpEncrypt(env, tok.refresh_token), expiry: Date.now() + tok.expires_in * 1000, resource: st.resource };
  conn._t = Date.now();
  try { const lt = await mcpListTools({ url: conn.url, auth_token: tok.access_token }); if (lt.ok) { conn.tools_cache = lt.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })); conn.server_naam = str(lt.serverInfo && lt.serverInfo.name); } } catch (e) { /* */ }
  await saveMcpConns(env, conns);
  return html(true, 'De connector is gekoppeld. Je kunt dit venster sluiten.');
}

// teamAgentKnoppen: lichte lijst van agents die als 1-klik-knop in een view verschijnen.
// Body: { view } (bv. 'adverteerders'). Elke medewerker mag knoppen zien/gebruiken.
export async function teamAgentKnoppen(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const view = str(body.view || '').trim();
  const tj = str(body.type_job || '').trim();
  // Knop verschijnt als hij aanstaat EN (de gevraagde VIEW matcht OF het gevraagde TYPE JOB matcht).
  // Geen filter meegegeven = alle aan-knoppen. Zo werkt 1 knop zowel in een view-tab als in elke
  // taakdetail van het juiste type job (lost de webchecklist-launcher-zichtbaarheid op).
  const myRole = rr.role, myId = Number(rr.me && rr.me.id) || 0;
  // per-knop zichtbaarheid (voor wie): leeg = iedereen, anders rol- of lid-match.
  const visOk = (k) => { const vr = (k.vis && k.vis.roles) || [], vm = (k.vis && k.vis.members) || []; if (!vr.length && !vm.length) return true; return vr.indexOf(myRole) >= 0 || vm.indexOf(myId) >= 0; };
  const inScope = (k) => {
    if (!k || !k.aan || !visOk(k)) return false;
    if (!view && !tj) return true;
    const vM = view && Array.isArray(k.views) && k.views.indexOf(view) >= 0;
    const tM = tj && Array.isArray(k.type_jobs) && k.type_jobs.indexOf(tj) >= 0;
    return !!(vM || tM);
  };
  await ensureSeedAgents(env);   // specialisten als knop in Adverteerders beschikbaar maken
  const [agents, skills, plugins] = await Promise.all([readAgents(env), readSkills(env), readPlugins(env)]);
  const agentItems = agents.filter((a) => inScope(a.knop))
    .map((a) => ({ soort: 'agent', id: a.id, naam: a.naam, ic: a.ic, label: str(a.knop.label || a.naam), prompt: str(a.knop.prompt || ''), views: a.knop.views || [], type_jobs: a.knop.type_jobs || [], heeft_tools: !!((a.tools && a.tools.length) || (a.mcp_servers && a.mcp_servers.length)) }));
  const skillItems = skills.filter((s) => inScope(s.knop))
    .map((s) => ({ soort: 'skill', id: s.id, naam: s.naam, ic: s.ic, label: str(s.knop.label || s.naam), prompt: str(s.knop.prompt || ''), invoer_label: str(s.invoer_label || ''), views: s.knop.views || [], type_jobs: s.knop.type_jobs || [], heeft_tools: true }));
  const pluginItems = plugins.map(pluginNorm).filter((p) => inScope(p.knop))
    .map((p) => ({ soort: 'plugin', id: p.id, naam: p.naam, ic: p.ic, label: str(p.knop.label || p.naam), prompt: str(p.knop.prompt || ''), views: p.knop.views || [], type_jobs: p.knop.type_jobs || [], heeft_tools: !!((p.skill_ids && p.skill_ids.length) || (p.access && (p.access.tools.length || p.access.mcp_servers.length))) }));
  return { status: 200, body: { ok: true, items: agentItems.concat(skillItems).concat(pluginItems) } };
}

// teamAgentSave: agent aanmaken of bijwerken (admin). Body: { item:{id?,naam,ic,sys,model,kennis} }.
export async function teamAgentSave(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder bouwt agents.' } };
  const item = agentNorm(body.item);
  if (!item.naam) return { status: 200, body: { ok: false, error: 'geen_naam', message: 'Geef de agent een naam.' } };
  if (!item.sys) return { status: 200, body: { ok: false, error: 'geen_prompt', message: 'Geef de agent een opdracht (systeemprompt).' } };
  if (item.model) { const def = AI_MODELS.find((x) => x.id === item.model); if (def && !str(env[def.env])) return { status: 200, body: { ok: false, error: 'no_key', message: 'De API-sleutel voor ' + def.provider + ' ontbreekt nog.' } }; }
  const agents = await readAgents(env);
  if (!item.id) item.id = 'a' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const idx = agents.findIndex((x) => x.id === item.id);
  // Docs worden UITSLUITEND via teamAgentAddDoc/teamAgentDelDoc beheerd. De frontend stuurt
  // ze zonder tekst terug (bandbreedte), dus nooit overschrijven bij een gewone save → anders
  // gaat alle geüploade kennis verloren. Behoud de docs-met-tekst uit KV.
  if (idx >= 0) { item.docs = Array.isArray(agents[idx].docs) ? agents[idx].docs : []; agents[idx] = item; }
  else { item.docs = []; agents.push(item); }
  if (!await saveAgents(env, agents)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true, item: { ...item, docs: (item.docs || []).map((d) => ({ id: d.id, naam: d.naam, size: d.size, _t: d._t })) } } };
}

// teamAgentDelete: agent verwijderen (admin). Body: { id }.
export async function teamAgentDelete(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const id = str(body.id); if (!id) return { status: 400, body: { ok: false } };
  const agents = await readAgents(env);
  const next = agents.filter((x) => x.id !== id);
  if (next.length === agents.length) return { status: 200, body: { ok: false, error: 'not_found' } };
  if (!await saveAgents(env, next)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true } };
}

// teamAgentAddDoc: voeg een bestand toe als kennisbron (admin). Body: { agent_id, naam, tekst }.
export async function teamAgentAddDoc(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, message: 'Alleen de zaakvoerder upload documenten.' } };
  const agent_id = str(body.agent_id); if (!agent_id) return { status: 400, body: { ok: false } };
  const naam = str(body.naam).trim().slice(0, 120); if (!naam) return { status: 400, body: { ok: false } };
  const tekst = str(body.tekst).trim().slice(0, 25000); if (!tekst) return { status: 200, body: { ok: false, message: 'Leeg bestand, niets toe te voegen.' } };
  const agents = await readAgents(env);
  const ag = agents.find((x) => x.id === agent_id);
  if (!ag) return { status: 200, body: { ok: false, error: 'no_agent' } };
  if (!Array.isArray(ag.docs)) ag.docs = [];
  if (ag.docs.length >= 12) return { status: 200, body: { ok: false, message: 'Maximum 12 documenten per agent bereikt.' } };
  const doc = { id: 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), naam, size: tekst.length, tekst, _t: Date.now() };
  ag.docs.push(doc);
  if (!await saveAgents(env, agents)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true, doc: { id: doc.id, naam: doc.naam, size: doc.size, _t: doc._t } } };
}

// teamAgentDelDoc: verwijder een document. Body: { agent_id, doc_id }.
export async function teamAgentDelDoc(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false } };
  const agent_id = str(body.agent_id); if (!agent_id) return { status: 400, body: { ok: false } };
  const doc_id = str(body.doc_id); if (!doc_id) return { status: 400, body: { ok: false } };
  const agents = await readAgents(env);
  const ag = agents.find((x) => x.id === agent_id);
  if (!ag) return { status: 200, body: { ok: false, error: 'no_agent' } };
  const before = Array.isArray(ag.docs) ? ag.docs.length : 0;
  ag.docs = (ag.docs || []).filter((d) => d.id !== doc_id);
  if (ag.docs.length === before) return { status: 200, body: { ok: false, error: 'not_found' } };
  if (!await saveAgents(env, agents)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true } };
}

// teamAgentLogs: gesprekslog per agent (admin). Body: { agent_id }.
export async function teamAgentLogs(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false } };
  const agent_id = str(body.agent_id); if (!agent_id) return { status: 400, body: { ok: false } };
  const ck = 'team:agentlog:' + agent_id;
  let kv = null; try { kv = await env.KV.get(ck, 'json'); } catch (e) { /* */ }
  const items = (kv && Array.isArray(kv.items)) ? kv.items : [];
  return { status: 200, body: { ok: true, items: items.slice().reverse().slice(0, 50) } };
}
// teamAgentMem: admin-inzage in het per-klant-geheugen van een agent. Body: { agent_id, bedrijf_id }.
export async function teamAgentMem(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false } };
  const agent_id = str(body.agent_id); const bid = await resolveBedrijfId(env, str(body.bedrijf_id || '').trim());
  if (!agent_id || !bid) return { status: 400, body: { ok: false } };
  const items = await readAgentMem(env, agent_id, bid);
  return { status: 200, body: { ok: true, items: items.slice().reverse() } };
}
// teamAgentMemClear: admin wist het per-klant-geheugen van een agent. Body: { agent_id, bedrijf_id }.
export async function teamAgentMemClear(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false } };
  const agent_id = str(body.agent_id); const bid = await resolveBedrijfId(env, str(body.bedrijf_id || '').trim());
  if (!agent_id || !bid) return { status: 400, body: { ok: false } };
  try { await env.KV.delete(agentMemKey(agent_id, bid)); } catch (e) { /* */ }
  return { status: 200, body: { ok: true } };
}

function agentErrMsg(err) {
  const e = str(err);
  if (e === 'no_anthropic_key') return 'De Claude-sleutel ontbreekt nog (ANTHROPIC_API_KEY).';
  if (e === 'no_openai_key') return 'De OpenAI-sleutel ontbreekt nog (OPENAI_API_KEY). Kies Claude, of zet de sleutel.';
  if (e === 'no_gemini_key') return 'De Gemini-sleutel ontbreekt nog (GEMINI_API_KEY). Kies Claude, of zet de sleutel.';
  if (e === 'geen_tools') return 'Deze agent heeft geen geldige tools meer.';
  if (e === 'ai_timeout') return 'Het duurde te lang. Probeer je vraag iets eenvoudiger te stellen.';
  return 'Geen antwoord van het AI-model. Probeer het zo opnieuw.';
}
// teamAgentChat: chat met een agent. Body: { agent_id, vraag, messages:[{role:'gebruiker'|'agent',content}], bedrijf_id? }.
// Heeft de agent INFO-BRONNEN (tools), dan loopt het gesprek via de Anthropic tool-loop:
// de agent haalt zelf live data op (Meta/Google/Metricool/ClickUp) voor hij antwoordt.
// Zonder tools: de klassieke tekst-completie via de AI-agnostische wrapper (alle modellen).
export async function teamAgentChat(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.agent_id);
  const agents = await readAgents(env);
  const a = agents.find((x) => x.id === id);
  if (!a) return { status: 200, body: { ok: false, error: 'no_agent', message: 'Die agent bestaat niet (meer).' } };
  // TENANT-VEILIGHEID: agents met advertentie-tools (meta_ads/google_ads) ontsluiten klant-advertentiedata
  // én het per-klant-geheugen. Dat is, net als alle andere ads-endpoints, voorbehouden aan admin + ADS_TEAM.
  let isAdsAgent = Array.isArray(a.tools) && (a.tools.indexOf('meta_ads') >= 0 || a.tools.indexOf('google_ads') >= 0);
  // Ook gekoppelde skills/plugins kunnen ads-tools dragen → dan geldt dezelfde ADS_TEAM-poort.
  if (!isAdsAgent && ((a.skill_ids && a.skill_ids.length) || (a.plugin_ids && a.plugin_ids.length))) {
    try {
      const sset = new Set(a.skill_ids || []), pset = new Set(a.plugin_ids || []);
      const sk = await readSkills(env);
      isAdsAgent = sk.some((s) => sset.has(s.id) && Array.isArray(s.stappen) && s.stappen.some((st) => usesAdsTool(st.tools)));
      if (!isAdsAgent && pset.size) { const pl = await readPlugins(env); isAdsAgent = pl.some((p) => pset.has(p.id) && (usesAdsTool((p.access && p.access.tools) || []) || (p.skill_ids || []).some((sid) => { const s = sk.find((x) => x.id === sid); return s && Array.isArray(s.stappen) && s.stappen.some((st) => usesAdsTool(st.tools)); }))); }
    } catch (e) { /* fail-soft: bij twijfel niet hard blokkeren op een leesfout */ }
  }
  if (isAdsAgent && !rr.perms.admin && !ADS_TEAM.has(str(body.account_email).toLowerCase())) {
    return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'De advertentie-specialisten zijn voor de advertentie-collega\'s.' } };
  }
  const vraag = str(body.vraag).trim().slice(0, 6000);
  if (!vraag) return { status: 200, body: { ok: false, error: 'geen_vraag' } };
  const hist = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const histTxt = hist
    .filter((m) => m && str(m.content).trim())
    .map((m) => (str(m.role) === 'agent' ? 'Agent: ' : 'Gebruiker: ') + str(m.content).trim().slice(0, 2500))
    .join('\n\n');
  const docsTxt = Array.isArray(a.docs) && a.docs.length
    ? a.docs.map((d) => '=== DOCUMENT: ' + str(d.naam) + ' ===\n' + str(d.tekst).slice(0, 25000)).join('\n\n').slice(0, 60000)
    : '';
  // optionele view-context: een klant waarvoor dit gesprek loopt (bv. geopend vanuit Adverteerders).
  let ctxBid = '', ctxNaam = '';
  const rawBid = str(body.bedrijf_id || '').trim();
  if (rawBid) { ctxBid = await resolveBedrijfId(env, rawBid); if (ctxBid) { try { ctxNaam = (await bedrijvenNaamMap(env))[ctxBid] || ''; } catch (e) { /* */ } } }
  // GEHEUGEN (Stage 4): eerdere gesprekken + doorgevoerde acties met DEZE klant, gedeeld over het team.
  let memTxt = '';
  if (ctxBid) { try { const mem = await readAgentMem(env, id, ctxBid); if (mem.length) memTxt = mem.slice(-24).map((m) => { const p = m.rol === 'actie' ? '[ACTIE] ' : (m.rol === 'agent' ? 'Jij (agent): ' : 'Teamlid: '); return p + str(m.tekst).slice(0, 500); }).join('\n'); } catch (e) { /* */ } }
  const hasTools = (Array.isArray(a.tools) && a.tools.length > 0) || (Array.isArray(a.mcp_servers) && a.mcp_servers.length > 0) || (Array.isArray(a.skill_ids) && a.skill_ids.length > 0) || (Array.isArray(a.plugin_ids) && a.plugin_ids.length > 0);
  let system = str(a.sys || 'Je bent een behulpzame AI-assistent van Studio 27. Antwoord in het Nederlands.')
    + (a.kennis ? ('\n\n=== KENNISBANK (gebruik dit als primaire bron; verzin niets buiten wat hier staat als de vraag erover gaat) ===\n' + str(a.kennis).slice(0, 38000)) : '')
    + (docsTxt ? ('\n\n=== GEÜPLOADE DOCUMENTEN ===\n' + docsTxt) : '');
  if (ctxNaam) system += '\n\n=== HUIDIGE CONTEXT ===\nDit gesprek loopt binnen het dossier van klant: ' + ctxNaam + '. Gebruik standaard deze klant in je tools (je hoeft de klantnaam dan niet apart te bepalen), tenzij de gebruiker expliciet een andere klant noemt.';
  if (ctxNaam && memTxt) system += '\n\n=== EERDERE GESPREKKEN EN ACTIES MET DEZE KLANT (geheugen, ouder dan deze sessie; gebruik dit om voort te bouwen op wat al besproken/gedaan is) ===\n' + memTxt;
  if (hasTools) system += '\n\nJe hebt toegang tot live databronnen via tools. Roep de relevante tool(s) aan om ECHTE, actuele cijfers op te halen vóór je antwoordt; verzin nooit cijfers of resultaten. Heeft een klant een bepaalde koppeling niet, zeg dat dan eerlijk. Antwoord daarna bondig en concreet in het Nederlands (Markdown).';
  const user = (histTxt ? ('Gesprek tot nu toe:\n' + histTxt + '\n\n') : '') + 'Nieuwe vraag van de gebruiker:\n' + vraag;

  let res, usedTools = [];
  try {
    if (hasTools) {
      // tool-calling werkt nu voor Claude, OpenAI én Gemini; gebruik het gekozen model van de agent (of het globale model).
      const tm = str(a.model) || await aiGlobalModel(env);
      res = await Promise.race([
        agentToolLoop(env, a, system, [{ role: 'user', content: user }], { bedrijf_id: ctxBid }, tm, { skill: 'agent:' + (str(a.naam) || 'agent'), member_id: rr.me && rr.me.id, member_naam: rr.me && rr.me.naam, bedrijf_id: ctxBid, bedrijf_naam: ctxNaam }),
        new Promise((r) => setTimeout(() => r({ err: 'ai_timeout' }), 55000)),
      ]);
      if (res && Array.isArray(res.tools_used)) usedTools = res.tools_used;
    } else {
      const model = str(a.model) || AI_MODEL;
      res = await Promise.race([
        aiComplete(env, model, system, user, 1600, { skill: 'agent:' + (str(a.naam) || 'agent'), member_id: rr.me && rr.me.id, member_naam: rr.me && rr.me.naam, bedrijf_id: ctxBid, bedrijf_naam: ctxNaam }),
        new Promise((r) => setTimeout(() => r({ err: 'ai_timeout' }), 40000)),
      ]);
    }
  } catch (e) { res = { err: 'ai_fout' }; }
  const txt = str(res && (res.text || res.content || res.antwoord)).trim();
  if (!txt) return { status: 200, body: { ok: false, error: (res && res.err) || 'ai_leeg', message: agentErrMsg(res && res.err) } };
  const usedModel = (res && res.model) || (hasTools ? 'claude (tools)' : (str(a.model) || AI_MODEL));
  const bronnen = Array.from(new Set(usedTools)).map((n) => { const t = agentToolByName(n); return t ? t.naam : n; });
  await appendAgentLog(env, id, { _t: Date.now(), user_naam: str(rr.me && (rr.me.naam || rr.me.email)).slice(0, 60), vraag: vraag.slice(0, 300), antwoord: txt.slice(0, 600), model: usedModel, bronnen });
  // GEHEUGEN bijwerken: deze beurt (vraag + antwoord) bewaren per klant, voor volgende gesprekken.
  if (ctxBid) { try { await appendAgentMem(env, id, ctxBid, [{ rol: 'gebruiker', tekst: vraag, user_naam: str(rr.me && (rr.me.naam || rr.me.email)) }, { rol: 'agent', tekst: txt, bronnen }]); } catch (e) { /* */ } }
  return { status: 200, body: { ok: true, antwoord: txt, model: usedModel, bronnen } };
}

/* ===========================================================================
 * SKILLS. Een skill is een herbruikbare AI-taak met een STAPPENPLAN (1+ stappen).
 * Elke stap heeft een eigen prompt + optioneel info-bronnen/connectoren. Stappen
 * lopen sequentieel; opeenvolgende stappen die als 'parallel' gemarkeerd zijn,
 * draaien samen (meerdere agents tegelijk). Latere stappen kunnen de uitvoer van
 * eerdere gebruiken via {invoer} en {stap1}/{stap2}/… placeholders.
 * KV: team:skills:v1 = { _t, items:[ {id,naam,ic,beschrijving,model,invoer_label,stappen,knop} ] }.
 * =========================================================================== */
const SKILLS_CK = 'team:skills:v1';
async function readSkills(env) {
  let kv = null; try { kv = await env.KV.get(SKILLS_CK, 'json'); } catch (e) { /* */ }
  return (kv && Array.isArray(kv.items)) ? kv.items : [];
}
async function saveSkills(env, items) {
  try { await env.KV.put(SKILLS_CK, JSON.stringify({ _t: Date.now(), items })); return true; } catch (e) { return false; }
}
function skillStepNorm(raw) {
  const s = (raw && typeof raw === 'object') ? raw : {};
  return {
    id: str(s.id) || ('s' + Math.floor(Math.random() * 1e6).toString(36)),
    naam: str(s.naam).trim().slice(0, 60),
    prompt: str(s.prompt).trim().slice(0, 6000),
    tools: Array.isArray(s.tools) ? Array.from(new Set(s.tools.map(String).filter((t) => AGENT_TOOL_KEYS.has(t)))).slice(0, 12) : [],
    mcp_servers: Array.isArray(s.mcp_servers) ? Array.from(new Set(s.mcp_servers.map(String).filter(Boolean))).slice(0, 12) : [],
    parallel: !!s.parallel,
  };
}
function skillNorm(raw) {
  const a = (raw && typeof raw === 'object') ? raw : {};
  return {
    id: str(a.id),
    naam: str(a.naam).trim().slice(0, 80),
    ic: str(a.ic).trim().slice(0, 4) || '✨',
    beschrijving: str(a.beschrijving).trim().slice(0, 400),
    categorie: str(a.categorie).trim().slice(0, 40),
    model: AI_MODEL_IDS.has(str(a.model)) ? str(a.model) : '',
    invoer_label: str(a.invoer_label).trim().slice(0, 80),
    stappen: Array.isArray(a.stappen) ? a.stappen.slice(0, 8).map(skillStepNorm).filter((s) => s.prompt) : [],
    knop: knopNorm(a.knop),
  };
}
// Eén skill-stap uitvoeren: placeholders invullen + via tools-loop of platte completie.
async function runSkillStep(env, step, vars, model, skillNaam) {
  let prompt = str(step.prompt);
  for (const k of Object.keys(vars)) prompt = prompt.split('{' + k + '}').join(str(vars[k] == null ? '' : vars[k]));
  const system = 'Je voert ÉÉN stap uit in het stappenplan van de skill "' + str(skillNaam) + '" van Studio 27, een Vlaams marketingbureau.'
    + (step.naam ? ' Deze stap heet: "' + str(step.naam) + '".' : '')
    + ' Voer enkel deze stap uit en geef een helder, direct bruikbaar resultaat in het Nederlands (Markdown). Verzin geen feiten.';
  const hasTools = (step.tools && step.tools.length) || (step.mcp_servers && step.mcp_servers.length);
  if (hasTools) {
    const tm = str(model) || AI_MODEL;   // tool-calling werkt nu voor alle providers (Claude/OpenAI/Gemini)
    const pseudo = { tools: step.tools, mcp_servers: step.mcp_servers, model: tm };
    const res = await Promise.race([
      agentToolLoop(env, pseudo, system, [{ role: 'user', content: prompt }], {}, tm, { skill: 'skill:' + str(skillNaam) }),
      new Promise((r) => setTimeout(() => r({ err: 'ai_timeout' }), 50000)),
    ]);
    return { tekst: str(res && res.text).trim() || ('(' + ((res && res.err) || 'geen output') + ')'), bronnen: (res && res.tools_used) || [] };
  }
  const res = await Promise.race([
    aiComplete(env, model, system, prompt, 1600, { skill: 'skill:' + str(skillNaam) }),
    new Promise((r) => setTimeout(() => r({ err: 'ai_timeout' }), 40000)),
  ]);
  return { tekst: str(res && (res.text || res.content)).trim() || ('(' + ((res && res.err) || 'geen output') + ')'), bronnen: [] };
}
// runOneSkill: voer alle stappen van één skill uit (sequentieel + parallelle groepen), met een optionele
// access-uitbreiding (plugin-connectoren/tools) die in elke stap mee-unioned wordt. Geeft {ok, outputs, resultaat}.
async function runOneSkill(env, sk, invoer, accessExtra) {
  const steps = Array.isArray(sk.stappen) ? sk.stappen.slice(0, 8) : [];
  if (!steps.length) return { ok: false, outputs: [], resultaat: '' };
  const model = str(sk.model) || await aiGlobalModel(env);
  const vars = { invoer: str(invoer || '').slice(0, 6000) };
  const ex = accessExtra || { tools: [], mcp_servers: [] };
  const withAccess = (s) => ((ex.tools && ex.tools.length) || (ex.mcp_servers && ex.mcp_servers.length))
    ? { ...s, tools: Array.from(new Set((s.tools || []).concat(ex.tools || []))), mcp_servers: Array.from(new Set((s.mcp_servers || []).concat(ex.mcp_servers || []))) }
    : s;
  const outputs = []; let i = 0;
  try {
    while (i < steps.length) {
      if (steps[i].parallel) {
        const group = []; while (i < steps.length && steps[i].parallel) { group.push(steps[i]); i++; }
        const results = await Promise.all(group.map((s) => runSkillStep(env, withAccess(s), vars, model, sk.naam)));
        group.forEach((s, gi) => { const n = outputs.length + 1; outputs.push({ naam: s.naam || ('Stap ' + n), tekst: results[gi].tekst, bronnen: results[gi].bronnen }); vars['stap' + n] = results[gi].tekst; });
      } else {
        const r = await runSkillStep(env, withAccess(steps[i]), vars, model, sk.naam);
        const n = outputs.length + 1; outputs.push({ naam: steps[i].naam || ('Stap ' + n), tekst: r.tekst, bronnen: r.bronnen }); vars['stap' + n] = r.tekst; i++;
      }
    }
  } catch (e) { return { ok: false, outputs, resultaat: outputs.length ? outputs[outputs.length - 1].tekst : '' }; }
  return { ok: true, outputs, resultaat: outputs.length ? outputs[outputs.length - 1].tekst : '' };
}
/* ===========================================================================
 * AI-GEASSISTEERDE BOUW (#3): "beschrijf wat je wil → de AI bouwt een concept".
 * Levert een bewerkbaar concept (geen id) dat de admin in het formulier verfijnt
 * en daarna zelf opslaat. Throttle gedeeld (rl:aigen). Admin-only.
 * =========================================================================== */
function extractJson(txt) {
  let t = str(txt).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fence) t = fence[1].trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch (e) { return null; }
}
async function aiGenThrottle(env, rr) {
  try {
    const who = str(rr.me && (rr.me.email || rr.me.id)).toLowerCase();
    const rk = 'rl:aigen:' + who + ':' + Math.floor(Date.now() / 3600000);
    const cur = parseInt((await env.KV.get(rk)) || '0', 10);
    if (cur >= 20) return false;
    await env.KV.put(rk, String(cur + 1), { expirationTtl: 3700 });
  } catch (e) { /* fail-open */ }
  return true;
}
const AGEN_TOOLS_BLURB = () => AGENT_TOOLS.map((t) => '- ' + t.key + ': ' + t.naam + ' — ' + t.omschrijving).join('\n');
// teamAgentGenerate: ontwerp een agent-concept uit een vrije beschrijving. Body: { beschrijving, model? }.
export async function teamAgentGenerate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder bouwt agents.' } };
  const beschrijving = str(body.beschrijving).trim().slice(0, 2000);
  if (!beschrijving) return { status: 200, body: { ok: false, error: 'geen_beschrijving', message: 'Beschrijf kort wat de agent moet kunnen.' } };
  if (!await aiGenThrottle(env, rr)) return { status: 200, body: { ok: false, error: 'rate_limited', message: 'Even pauzeren, je AI-bouwlimiet voor dit uur is bereikt.' } };
  const model = AI_MODEL_IDS.has(str(body.model)) ? str(body.model) : await aiGlobalModel(env);
  const system = 'Je bent de agent-bouwer van Studio 27, een Vlaams marketingbureau. Je ontwerpt uit een vrije beschrijving één GESPECIALISEERDE AI-agent. '
    + 'Antwoord met UITSLUITEND één geldig JSON-object (geen uitleg, geen code-fences) met exact deze velden: '
    + '{"naam": korte naam (max 60), "ic": één passende emoji, "categorie": korte categorie van 1 woord (bv. Sales, SEO, Content, Webdesign, Ads), '
    + '"sys": de systeemprompt voor de agent in het Nederlands (wie hij is, wat hij doet, zijn toon en regels; schrijf menselijk en concreet; gebruik GEEN en-dash of em-dash), '
    + '"tools": array met 0 of meer van de onderstaande tool-sleutels die de agent echt live nodig heeft (anders lege array), '
    + '"kennis": optionele korte achtergrondkennis als platte tekst, of "" }. '
    + 'Beschikbare tools (kies alleen wat nodig is):\n' + AGEN_TOOLS_BLURB();
  let res; try { res = await aiComplete(env, model, system, 'Beschrijving van de gewenste agent:\n' + beschrijving, 1800, { skill: 'bouwer:agent' }); } catch (e) { res = null; }
  const obj = extractJson(str(res && (res.text || res.content)));
  if (!obj) return { status: 200, body: { ok: false, error: 'geen_json', message: 'De AI gaf geen bruikbaar concept terug. Maak je beschrijving wat concreter en probeer opnieuw.' } };
  const concept = agentNorm(obj); concept.id = ''; concept.docs = []; concept.mcp_servers = []; concept.knop = knopNorm(null); concept.model = '';
  return { status: 200, body: { ok: true, concept } };
}
// teamSkillGenerate: ontwerp een skill-stappenplan uit een vrije beschrijving. Body: { beschrijving, model? }.
export async function teamSkillGenerate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder bouwt skills.' } };
  const beschrijving = str(body.beschrijving).trim().slice(0, 2000);
  if (!beschrijving) return { status: 200, body: { ok: false, error: 'geen_beschrijving', message: 'Beschrijf kort wat de skill moet doen.' } };
  if (!await aiGenThrottle(env, rr)) return { status: 200, body: { ok: false, error: 'rate_limited', message: 'Even pauzeren, je AI-bouwlimiet voor dit uur is bereikt.' } };
  const model = AI_MODEL_IDS.has(str(body.model)) ? str(body.model) : await aiGlobalModel(env);
  const system = 'Je bent de skill-bouwer van Studio 27, een Vlaams marketingbureau. Een skill is een vast STAPPENPLAN dat de AI achter elkaar uitvoert. '
    + 'Antwoord met UITSLUITEND één geldig JSON-object (geen uitleg, geen code-fences) met exact deze velden: '
    + '{"naam": korte naam, "ic": één passende emoji, "beschrijving": 1 zin wat de skill doet, "categorie": korte categorie van 1 woord, '
    + '"invoer_label": label van het invoerveld (bv. "Klantnaam") of "" als er geen invoer nodig is, '
    + '"stappen": array van 1 tot 6 stappen, elk {"naam": korte stapnaam, "prompt": wat deze stap moet doen — gebruik {invoer} voor de invoer en {stap1}, {stap2}... voor de uitvoer van eerdere stappen, '
    + '"tools": array met tool-sleutels als de stap live data nodig heeft (anders lege array), "parallel": boolean (true = loopt samen met de vorige parallelle stap)} }. '
    + 'Schrijf menselijk Nederlands, gebruik GEEN en-dash of em-dash. Beschikbare tools:\n' + AGEN_TOOLS_BLURB();
  let res; try { res = await aiComplete(env, model, system, 'Beschrijving van de gewenste skill:\n' + beschrijving, 2200, { skill: 'bouwer:skill' }); } catch (e) { res = null; }
  const obj = extractJson(str(res && (res.text || res.content)));
  if (!obj) return { status: 200, body: { ok: false, error: 'geen_json', message: 'De AI gaf geen bruikbaar concept terug. Maak je beschrijving wat concreter en probeer opnieuw.' } };
  const concept = skillNorm(obj); concept.id = ''; concept.knop = knopNorm(null); concept.model = '';
  if (!concept.stappen.length) return { status: 200, body: { ok: false, error: 'geen_stappen', message: 'De AI gaf geen bruikbare stappen terug. Probeer je beschrijving concreter te maken.' } };
  return { status: 200, body: { ok: true, concept } };
}
// teamPluginGenerate: stel een plugin-KETEN samen uit BESTAANDE skills op basis van een vrije beschrijving.
// Body: { beschrijving, model? }. De AI kiest enkel uit de bestaande skills (id's gevalideerd).
export async function teamPluginGenerate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder bouwt plugins.' } };
  const beschrijving = str(body.beschrijving).trim().slice(0, 2000);
  if (!beschrijving) return { status: 200, body: { ok: false, error: 'geen_beschrijving', message: 'Beschrijf kort wat de plugin moet doen.' } };
  const skills = await readSkills(env);
  if (!skills.length) return { status: 200, body: { ok: false, error: 'geen_skills', message: 'Bouw eerst enkele skills; een plugin ketent bestaande skills aan elkaar.' } };
  if (!await aiGenThrottle(env, rr)) return { status: 200, body: { ok: false, error: 'rate_limited', message: 'Even pauzeren, je AI-bouwlimiet voor dit uur is bereikt.' } };
  const model = AI_MODEL_IDS.has(str(body.model)) ? str(body.model) : await aiGlobalModel(env);
  const skillCat = skills.slice(0, 60).map((s) => '- id:' + s.id + ' | ' + s.naam + (s.beschrijving ? ' — ' + s.beschrijving : '')).join('\n');
  const system = 'Je bent de plugin-bouwer van Studio 27, een Vlaams marketingbureau. Een plugin is een KETEN van BESTAANDE skills die na elkaar lopen (de uitvoer van een skill is de invoer van de volgende). '
    + 'Kies UITSLUITEND uit de onderstaande bestaande skills. Antwoord met UITSLUITEND één geldig JSON-object (geen uitleg, geen code-fences): '
    + '{"naam": korte naam, "ic": één passende emoji, "beschrijving": 1 zin wat de plugin doet, "categorie": korte categorie van 1 woord, '
    + '"skill_ids": array van skill-id\'s UIT DE LIJST in de juiste uitvoervolgorde}. Gebruik enkel id\'s die letterlijk in de lijst staan. Schrijf menselijk Nederlands, geen dashes.\n'
    + 'Bestaande skills:\n' + skillCat;
  let res; try { res = await aiComplete(env, model, system, 'Beschrijving van de gewenste plugin:\n' + beschrijving, 1400, { skill: 'bouwer:plugin' }); } catch (e) { res = null; }
  const obj = extractJson(str(res && (res.text || res.content)));
  if (!obj) return { status: 200, body: { ok: false, error: 'geen_json', message: 'De AI gaf geen bruikbaar concept terug. Maak je beschrijving wat concreter en probeer opnieuw.' } };
  const validIds = new Set(skills.map((s) => s.id));
  const chosen = Array.isArray(obj.skill_ids) ? obj.skill_ids.map(String).filter((id) => validIds.has(id)).slice(0, 8) : [];
  if (!chosen.length) return { status: 200, body: { ok: false, error: 'geen_match', message: 'De AI koos geen bestaande skills. Beschrijf concreter welke stappen je wil, of bouw eerst de nodige skills.' } };
  const concept = pluginNorm({ naam: obj.naam, ic: obj.ic, beschrijving: obj.beschrijving, categorie: obj.categorie, skill_ids: chosen });
  concept.id = '';
  return { status: 200, body: { ok: true, concept, gekozen_skills: chosen.length } };
}
// teamSkills: lijst + bouw-context (modellen, tools, connectoren, views). Iedereen ziet de
// lijst (om te runnen); enkel admin krijgt de volledige definitie (stappen) om te bewerken.
export async function teamSkills(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const isAdmin = rr.real_admin;
  const skills = await readSkills(env);
  const items = skills.map((s) => isAdmin
    ? { ...s, knop: knopNorm(s.knop) }
    : { id: s.id, naam: s.naam, ic: s.ic, beschrijving: s.beschrijving, invoer_label: s.invoer_label, stappen_count: (s.stappen || []).length, knop: knopNorm(s.knop) });
  const conns = isAdmin ? (await readMcpConns(env)).map(mcpConnPublic) : [];
  return {
    status: 200,
    body: {
      ok: true, items, is_admin: isAdmin,
      modellen: AI_MODELS.map((x) => ({ id: x.id, naam: x.naam, provider: x.provider, beschikbaar: !!str(env[x.env]) })),
      tools: AGENT_TOOLS.map((t) => ({ key: t.key, naam: t.naam, ic: t.ic, omschrijving: t.omschrijving })),
      mcp_connectoren: conns,
      views: AGENT_KNOP_VIEWS,
      typejobs: TYPEJOB_KEUZE,
      roster: rosterFrom(rr.leden),
      globaal_model: await aiGlobalModel(env),
    },
  };
}
// teamSkillSave: skill aanmaken/bijwerken (admin). Body: { item }.
export async function teamSkillSave(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder bouwt skills.' } };
  const item = skillNorm(body.item);
  if (!item.naam) return { status: 200, body: { ok: false, error: 'geen_naam', message: 'Geef de skill een naam.' } };
  if (!item.stappen.length) return { status: 200, body: { ok: false, error: 'geen_stappen', message: 'Voeg minstens één stap met een prompt toe.' } };
  const skills = await readSkills(env);
  if (!item.id) item.id = 'sk' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const idx = skills.findIndex((x) => x.id === item.id);
  if (idx >= 0) skills[idx] = item; else skills.push(item);
  if (!await saveSkills(env, skills)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true, item } };
}
// teamSkillDelete: skill verwijderen (admin). Body: { id }.
export async function teamSkillDelete(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const id = str(body.id); if (!id) return { status: 400, body: { ok: false } };
  const next = (await readSkills(env)).filter((x) => x.id !== id);
  if (!await saveSkills(env, next)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true } };
}
// teamSkillRun: voer een skill uit (elke medewerker). Body: { skill_id, invoer? }.
// Stappen sequentieel; opeenvolgende parallel-stappen via Promise.all. Geeft per-stap uitvoer terug.
export async function teamSkillRun(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.skill_id);
  const sk = (await readSkills(env)).find((x) => x.id === id);
  if (!sk) return { status: 200, body: { ok: false, error: 'no_skill', message: 'Die skill bestaat niet (meer).' } };
  const steps = Array.isArray(sk.stappen) ? sk.stappen.slice(0, 8) : [];
  if (!steps.length) return { status: 200, body: { ok: false, error: 'geen_stappen' } };
  // Ads-poort: een skill met meta_ads/google_ads-stappen haalt live advertentiedata op → zelfde regel als de ads-endpoints.
  if (steps.some((s) => usesAdsTool(s.tools)) && adsGateBlocked(rr, body)) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Deze skill gebruikt advertentiedata; dat is voor de advertentie-collega\'s.' } };
  // lichte per-gebruiker-throttle (skills kunnen veel AI-calls doen): 20/uur
  try {
    const who = str(rr.me && (rr.me.email || rr.me.id)).toLowerCase();
    const rk = 'rl:skillrun:' + who + ':' + Math.floor(Date.now() / 3600000);
    const cur = parseInt((await env.KV.get(rk)) || '0', 10);
    if (cur >= 20) return { status: 200, body: { ok: false, error: 'rate_limited', message: 'Je skill-limiet voor dit uur is bereikt, probeer straks opnieuw.' } };
    await env.KV.put(rk, String(cur + 1), { expirationTtl: 3700 });
  } catch (e) { /* fail-open */ }
  const model = str(sk.model) || await aiGlobalModel(env);
  const vars = { invoer: str(body.invoer || '').slice(0, 4000) };
  const outputs = [];
  let i = 0;
  try {
    while (i < steps.length) {
      if (steps[i].parallel) {
        const group = [];
        while (i < steps.length && steps[i].parallel) { group.push(steps[i]); i++; }
        const results = await Promise.all(group.map((s) => runSkillStep(env, s, vars, model, sk.naam)));
        group.forEach((s, gi) => { const n = outputs.length + 1; outputs.push({ naam: s.naam || ('Stap ' + n), tekst: results[gi].tekst, bronnen: results[gi].bronnen, parallel: true }); vars['stap' + n] = results[gi].tekst; });
      } else {
        const r = await runSkillStep(env, steps[i], vars, model, sk.naam);
        const n = outputs.length + 1; outputs.push({ naam: steps[i].naam || ('Stap ' + n), tekst: r.tekst, bronnen: r.bronnen, parallel: false }); vars['stap' + n] = r.tekst;
        i++;
      }
    }
  } catch (e) { return { status: 200, body: { ok: false, error: 'run_fout', message: 'Er ging iets mis tijdens het uitvoeren.', outputs } }; }
  return { status: 200, body: { ok: true, outputs, resultaat: outputs.length ? outputs[outputs.length - 1].tekst : '' } };
}

/* ===========================================================================
 * PLUGINS. Een plugin bundelt skills + agents onder één noemer (zoals een
 * Claude/ChatGPT-plugin een set skills bundelt). Puur organisatie + delen: je
 * kunt een plugin exporteren als JSON en elders importeren. MCP-tokens gaan NOOIT
 * mee in een export. KV: team:plugins:v1 = { _t, items:[ {id,naam,ic,beschrijving,skill_ids,agent_ids} ] }.
 * =========================================================================== */
const PLUGINS_CK = 'team:plugins:v1';
async function readPlugins(env) {
  let kv = null; try { kv = await env.KV.get(PLUGINS_CK, 'json'); } catch (e) { /* */ }
  return (kv && Array.isArray(kv.items)) ? kv.items : [];
}
async function savePlugins(env, items) {
  try { await env.KV.put(PLUGINS_CK, JSON.stringify({ _t: Date.now(), items })); return true; } catch (e) { return false; }
}
// Gedeeld access-model (tools + externe connectoren). Hergebruikt door plugins (en straks agents/skills).
function accessNorm(raw) {
  const a = (raw && typeof raw === 'object') ? raw : {};
  return {
    tools: Array.isArray(a.tools) ? Array.from(new Set(a.tools.map(String).filter((t) => AGENT_TOOL_KEYS.has(t)))).slice(0, 12) : [],
    mcp_servers: Array.isArray(a.mcp_servers) ? Array.from(new Set(a.mcp_servers.map(String).filter(Boolean))).slice(0, 12) : [],
  };
}
function pluginNorm(raw) {
  const a = (raw && typeof raw === 'object') ? raw : {};
  return {
    id: str(a.id),
    naam: str(a.naam).trim().slice(0, 80),
    ic: str(a.ic).trim().slice(0, 4) || '🧩',
    beschrijving: str(a.beschrijving).trim().slice(0, 400),
    categorie: str(a.categorie).trim().slice(0, 40),                 // NIEUW: categorisering
    skill_ids: Array.isArray(a.skill_ids) ? Array.from(new Set(a.skill_ids.map(String).filter(Boolean))).slice(0, 40) : [],
    agent_ids: Array.isArray(a.agent_ids) ? Array.from(new Set(a.agent_ids.map(String).filter(Boolean))).slice(0, 40) : [],
    access: accessNorm(a.access),                                    // NIEUW: connector-/tool-toegang (union in de keten)
    knop: knopNorm(a.knop),                                          // NIEUW: plugin als 1-klik-knop (view/type-job/vis)
  };
}
// teamPlugins: lijst plugins (verrijkt met de namen van de gebundelde skills/agents) + (admin)
// de keuzelijsten om mee te bundelen.
export async function teamPlugins(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const isAdmin = rr.real_admin;
  const [plugins, skills, agents] = await Promise.all([readPlugins(env), readSkills(env), readAgents(env)]);
  const skMap = {}; skills.forEach((s) => { skMap[s.id] = { id: s.id, naam: s.naam, ic: s.ic }; });
  const agMap = {}; agents.forEach((a) => { agMap[a.id] = { id: a.id, naam: a.naam, ic: a.ic }; });
  const items = plugins.map(pluginNorm).map((p) => ({
    id: p.id, naam: p.naam, ic: p.ic, beschrijving: p.beschrijving, categorie: p.categorie,
    skill_ids: p.skill_ids || [], agent_ids: p.agent_ids || [],
    access: p.access, knop: p.knop,
    skills: (p.skill_ids || []).map((id) => skMap[id]).filter(Boolean),
    agents: (p.agent_ids || []).map((id) => agMap[id]).filter(Boolean),
  }));
  const conns = isAdmin ? (await readMcpConns(env)).map(mcpConnPublic) : [];
  return {
    status: 200,
    body: {
      ok: true, items, is_admin: isAdmin,
      alle_skills: Object.values(skMap),
      alle_agents: Object.values(agMap),
      tools: AGENT_TOOLS.map((t) => ({ key: t.key, naam: t.naam, ic: t.ic, omschrijving: t.omschrijving })),
      mcp_connectoren: conns,
      views: AGENT_KNOP_VIEWS,
      typejobs: TYPEJOB_KEUZE,
      roster: rosterFrom(rr.leden),
    },
  };
}
// teamPluginSave: plugin aanmaken/bijwerken (admin). Body: { item }.
export async function teamPluginSave(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder bouwt plugins.' } };
  const item = pluginNorm(body.item);
  if (!item.naam) return { status: 200, body: { ok: false, error: 'geen_naam', message: 'Geef de plugin een naam.' } };
  const plugins = await readPlugins(env);
  if (!item.id) item.id = 'pl' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const idx = plugins.findIndex((x) => x.id === item.id);
  if (idx >= 0) plugins[idx] = item; else plugins.push(item);
  if (!await savePlugins(env, plugins)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true, item } };
}
// teamPluginDelete: plugin verwijderen (admin). Body: { id }.
export async function teamPluginDelete(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const id = str(body.id); if (!id) return { status: 400, body: { ok: false } };
  const next = (await readPlugins(env)).filter((x) => x.id !== id);
  if (!await savePlugins(env, next)) return { status: 502, body: { ok: false } };
  return { status: 200, body: { ok: true } };
}
// teamPluginRun: voer een plugin uit als KETEN — de gebundelde skills lopen na elkaar, waarbij de output
// van skill N de invoer wordt van skill N+1. De plugin-access (connectoren/tools) wordt in elke stap
// mee-unioned. Body: { plugin_id, invoer? }. Elke medewerker (throttle 12/uur).
export async function teamPluginRun(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.plugin_id);
  const pl = (await readPlugins(env)).find((x) => x.id === id);
  if (!pl) return { status: 200, body: { ok: false, error: 'no_plugin', message: 'Die plugin bestaat niet (meer).' } };
  const skillIds = Array.isArray(pl.skill_ids) ? pl.skill_ids.slice(0, 8) : [];
  if (!skillIds.length) return { status: 200, body: { ok: false, error: 'geen_skills', message: 'Deze plugin heeft nog geen gekoppelde skills om uit te voeren.' } };
  const allSkills = await readSkills(env);
  // Ads-poort: de plugin-access of een van z'n skills kan meta_ads/google_ads gebruiken → zelfde regel als de ads-endpoints.
  const plUsesAds = usesAdsTool((pl.access && pl.access.tools) || []) || skillIds.some((sid) => { const s = allSkills.find((x) => x.id === sid); return s && Array.isArray(s.stappen) && s.stappen.some((st) => usesAdsTool(st.tools)); });
  if (plUsesAds && adsGateBlocked(rr, body)) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Deze plugin gebruikt advertentiedata; dat is voor de advertentie-collega\'s.' } };
  try {
    const who = str(rr.me && (rr.me.email || rr.me.id)).toLowerCase();
    const rk = 'rl:pluginrun:' + who + ':' + Math.floor(Date.now() / 3600000);
    const cur = parseInt((await env.KV.get(rk)) || '0', 10);
    if (cur >= 12) return { status: 200, body: { ok: false, error: 'rate_limited', message: 'Je plugin-limiet voor dit uur is bereikt, probeer straks opnieuw.' } };
    await env.KV.put(rk, String(cur + 1), { expirationTtl: 3700 });
  } catch (e) { /* fail-open */ }
  const access = pl.access || { tools: [], mcp_servers: [] };
  const blokken = [];
  let invoer = str(body.invoer || '').slice(0, 6000);
  for (const sid of skillIds) {
    const sk = allSkills.find((x) => x.id === sid); if (!sk) continue;
    const r = await runOneSkill(env, sk, invoer, access);
    blokken.push({ skill_id: sid, naam: sk.naam, ic: sk.ic, ok: r.ok, outputs: r.outputs, resultaat: r.resultaat });
    if (r.resultaat) invoer = r.resultaat;   // KETEN: output van deze skill = invoer van de volgende
  }
  if (!blokken.length) return { status: 200, body: { ok: false, error: 'geen_skills', message: 'Geen geldige skills gevonden in deze plugin.' } };
  return { status: 200, body: { ok: true, blokken, resultaat: blokken[blokken.length - 1].resultaat } };
}
// teamPluginExport: een plugin + z'n volledige skills/agents als JSON (admin). MCP-referenties en
// kennis-docs gaan NIET mee (server-specifiek/gevoelig). Body: { id }.
export async function teamPluginExport(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const id = str(body.id);
  const [plugins, skills, agents] = await Promise.all([readPlugins(env), readSkills(env), readAgents(env)]);
  const p = plugins.find((x) => x.id === id);
  if (!p) return { status: 200, body: { ok: false, error: 'no_plugin' } };
  const expSkill = (s) => ({ naam: s.naam, ic: s.ic, beschrijving: s.beschrijving, model: s.model, invoer_label: s.invoer_label, stappen: (s.stappen || []).map((st) => ({ naam: st.naam, prompt: st.prompt, tools: st.tools, parallel: st.parallel })) });   // mcp_servers weggelaten
  const expAgent = (a) => ({ naam: a.naam, ic: a.ic, sys: a.sys, model: a.model, kennis: a.kennis, tools: a.tools });   // mcp_servers + docs weggelaten
  const bundle = {
    _type: 's27-plugin', _v: 1,
    plugin: { naam: p.naam, ic: p.ic, beschrijving: p.beschrijving },
    skills: (p.skill_ids || []).map((sid) => skills.find((s) => s.id === sid)).filter(Boolean).map(expSkill),
    agents: (p.agent_ids || []).map((aid) => agents.find((a) => a.id === aid)).filter(Boolean).map(expAgent),
  };
  return { status: 200, body: { ok: true, bundle } };
}
// teamPluginImport: importeer een geëxporteerde bundel als nieuwe plugin + skills + agents (admin).
// Nieuwe ids; mcp_servers leeg (de importeur koppelt z'n eigen connectoren). Body: { bundle }.
export async function teamPluginImport(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const b = (body.bundle && typeof body.bundle === 'object') ? body.bundle : null;
  if (!b || b._type !== 's27-plugin') return { status: 200, body: { ok: false, error: 'bad_bundle', message: 'Dit is geen geldige plugin-export.' } };
  const skills = await readSkills(env), agents = await readAgents(env);
  const newSkillIds = [], newAgentIds = [];
  const rnd = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  for (const s of (Array.isArray(b.skills) ? b.skills.slice(0, 40) : [])) {
    const n = skillNorm(s); n.id = 'sk' + rnd(); n.knop = knopNorm(null); skills.push(n); newSkillIds.push(n.id);
  }
  for (const a of (Array.isArray(b.agents) ? b.agents.slice(0, 40) : [])) {
    const n = agentNorm(a); n.id = 'a' + rnd(); n.mcp_servers = []; n.knop = knopNorm(null); n.docs = []; agents.push(n); newAgentIds.push(n.id);
  }
  await saveSkills(env, skills); await saveAgents(env, agents);
  const plugins = await readPlugins(env);
  const pl = pluginNorm({ naam: (b.plugin && b.plugin.naam) || 'Geïmporteerde plugin', ic: (b.plugin && b.plugin.ic) || '🧩', beschrijving: (b.plugin && b.plugin.beschrijving) || '', skill_ids: newSkillIds, agent_ids: newAgentIds });
  pl.id = 'pl' + rnd(); plugins.push(pl);
  await savePlugins(env, plugins);
  return { status: 200, body: { ok: true, item: pl, geimporteerd: { skills: newSkillIds.length, agents: newAgentIds.length } } };
}

/* ===========================================================================
 * SOCIAL-MEDIA-MODULE (Danique + content + admin). Per klant: Metricool-posts
 * bekijken, zelf een concept schrijven + inplannen, en een AI-knop die de
 * klantcontext + eerdere posts ophaalt en kant-en-klare concepten genereert die
 * (na review of meteen) als DRAFT in Metricool klaargezet worden. Tenant-safe:
 * de Metricool-brand komt UITSLUITEND uit de bedrijf-taak in ClickUp.
 * =========================================================================== */
// klanten met een gekoppelde Metricool-brand (gecachet 6u).
async function socialsClients(env) {
  try { const hit = await env.KV.get('team:socialclients:v1', 'json'); if (hit && Array.isArray(hit.items)) return hit.items; } catch (e) { /* */ }
  let items = [];
  try {
    const tasks = await pageAll(env, (p) => `/list/${LIST.bedrijven}/task?subtasks=false&include_closed=false&page=${p}`);
    items = tasks.filter((t) => str(getCF(t, FIELD.metricoolId)).trim()).map((t) => ({ id: str(t.id), naam: str(t.name) })).sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  } catch (e) { items = []; }
  try { await env.KV.put('team:socialclients:v1', JSON.stringify({ _t: Date.now(), items }), { expirationTtl: 21600 }); } catch (e) { /* */ }
  return items;
}
// teamSocials: zonder bedrijf_id → klantenlijst; met bedrijf_id → Metricool-posts + brand.
export async function teamSocials(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const bid = cleanTaskId(body.bedrijf_id);
  if (!bid) return { status: 200, body: { ok: true, clients: await socialsClients(env) } };
  let b = null; try { const r = await metricool(bid, {}, env); b = r && r.body; } catch (e) { /* */ }
  const naam = (await bedrijvenNaamMap(env))[bid] || '';
  if (!b || !b.ok) return { status: 200, body: { ok: false, message: 'Kon de social-planning niet laden.' } };
  return { status: 200, body: { ok: true, bedrijf_id: bid, naam, linked: !!b.linked, brandName: str(b.brandName || ''), accounts: b.accounts || [], posts: b.posts || [] } };
}
// teamSocialCreate: zet één post als CONCEPT klaar in Metricool (staff). Body: { bedrijf_id, text, providers, media, date }.
export async function teamSocialCreate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const bid = cleanTaskId(body.bedrijf_id); if (!bid) return { status: 400, body: { ok: false, error: 'no_bedrijf' } };
  // __staff server-side gezet ná auth (nooit van de client): zo passeert de socials-edit-gate voor het team.
  const r = await metricoolCreate(bid, { text: body.text, providers: body.providers, media: body.media, date: body.date, __staff: true }, env);
  return r;
}
// teamSocialAiDraft: AI schrijft N concepten op basis van klantcontext + eerdere posts + optionele
// manuele aanleiding. Body: { bedrijf_id, aantal?, providers?, input?, plaats? }. plaats=true → meteen
// als concept in Metricool (gespreid over de komende dagen); anders enkel teruggeven ter review.
export async function teamSocialAiDraft(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const bid = cleanTaskId(body.bedrijf_id); if (!bid) return { status: 400, body: { ok: false, error: 'no_bedrijf' } };
  const naam = (await bedrijvenNaamMap(env))[bid] || 'de klant';
  // eerdere posts (stijl) + klant-info (sector/website/briefing)
  let posts = []; try { const r = await metricool(bid, {}, env); if (r && r.body && r.body.ok) posts = r.body.posts || []; } catch (e) { /* */ }
  let website = '', brief = '';
  try { const br = await cu.get(env, `/task/${bid}`); if (br.ok && br.data) { website = str(getCF(br.data, FIELD.website) || ''); brief = str(br.data.description || br.data.text_content || '').slice(0, 1500); } } catch (e) { /* */ }
  const aantal = Math.min(5, Math.max(1, Number(body.aantal) || 3));
  const netwerken = (Array.isArray(body.providers) && body.providers.length) ? body.providers.map((n) => str(n).toLowerCase()).filter(Boolean) : ['instagram', 'facebook'];
  const manueel = str(body.input || '').slice(0, 1000);
  const eerdere = posts.slice(0, 12).map((p) => { let t = ''; try { t = decodeURIComponent(str(p.tekst || '')); } catch (e) { t = str(p.tekst || ''); } return '- [' + str(p.netwerken || '') + '] ' + t.replace(/\s+/g, ' ').slice(0, 150); }).join('\n');
  const sys = 'Je bent de social-media-copywriter van Studio 27 voor de klant "' + naam + '". Schrijf ' + aantal + ' kant-en-klare social-media-posts in exact dezelfde tone-of-voice, taal en stijl als de eerdere posts van deze klant. Vlaams, menselijk, geen em-dashes of en-dashes. Per post: een pakkende openingszin, waardevolle inhoud, een passende call-to-action en relevante hashtags. Verzin geen feiten die niet uit de context volgen. Antwoord UITSLUITEND met geldige JSON: {"posts":[{"tekst":"...","netwerk":"instagram"}]} (netwerk = een van de gekozen kanalen).';
  const user = 'Klant: ' + naam + (website ? ' (website ' + website + ')' : '') + '.\n' + (manueel ? ('Specifieke aanleiding/opdracht: ' + manueel + '\n') : '') + (brief ? ('Achtergrond uit ClickUp: ' + brief + '\n') : '') + 'Gewenste kanalen: ' + netwerken.join(', ') + '.\n\nEERDERE POSTS (volg deze stijl en toon):\n' + (eerdere || '(geen eerdere posts gevonden)') + '\n\nGeef ' + aantal + ' nieuwe posts als JSON.';
  const res = await Promise.race([aiComplete(env, AI_MODEL, sys, user, 2000, { skill: 'social:posts', bedrijf_id: str(body.bedrijf_id) }), new Promise((r) => setTimeout(() => r({ err: 'ai_timeout' }), 45000))]);
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: (res && res.err) || 'ai_fout', message: 'De AI gaf geen concepten terug.' } };
  let drafts = [];
  try { const m = str(res.text).match(/\{[\s\S]*\}/); const j = JSON.parse(m ? m[0] : res.text); drafts = Array.isArray(j.posts) ? j.posts : []; } catch (e) { drafts = []; }
  drafts = drafts.slice(0, aantal).map((d) => ({ tekst: str(d && d.tekst).slice(0, 2000), netwerk: (str(d && d.netwerk).toLowerCase() || netwerken[0]) }));
  if (!drafts.length) return { status: 200, body: { ok: false, error: 'leeg', message: 'Geen bruikbare concepten ontvangen.' } };
  // optioneel meteen als concept in Metricool zetten, gespreid: morgen, overmorgen, … om 10:00
  let geplaatst = 0;
  if (body.plaats === true) {
    for (let i = 0; i < drafts.length; i++) {
      const dt = msToBrusselsYmd(Date.now() + (i + 1) * 86400000) + 'T10:00';
      try { const cr = await metricoolCreate(bid, { text: drafts[i].tekst, providers: [drafts[i].netwerk], media: [], date: dt, __staff: true }, env); if (cr && cr.body && cr.body.ok) { geplaatst++; drafts[i].date = dt; drafts[i].in_metricool = true; } } catch (e) { /* */ }
    }
  }
  return { status: 200, body: { ok: true, naam, drafts, geplaatst } };
}

/* ===========================================================================
 * SOCIAL-CONTENT UIT DRIVE (B3): analyseer de klant-Drive-map, houd bij welk
 * materiaal al op social verscheen (afvinksysteem in KV), en herschrijf
 * ongebruikte content in de huisstijl → meteen als Metricool-concept.
 *  - team:socialused:<bid>        → { [fileId]: { used, ts, by, note, postId } }  (persist)
 *  - team:socialdrivefolder:<bid> → { folderId }  (onthouden mappenkeuze)
 * De content-map wordt auto-gedetecteerd ('S Share / Share / Social / …); als
 * er geen herkenbare map is, valt hij terug op de company-folder (needs_config).
 * =========================================================================== */
function socialUsedKey(bid) { return 'team:socialused:' + bid; }
function socialDriveCfgKey(bid) { return 'team:socialdrivefolder:' + bid; }
// teamSocialDrive: lijst de content in de Drive-map van een klant + per bestand de used-status.
// Body: { bedrijf_id, folder_id? }. folder_id zetten = die map onthouden voor deze klant.
export async function teamSocialDrive(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const bid = cleanTaskId(body.bedrijf_id); if (!bid) return { status: 400, body: { ok: false, error: 'no_bedrijf' } };
  const naam = (await bedrijvenNaamMap(env))[bid] || '';
  let folderId = str(body.folder_id || '').trim();
  if (!folderId) { try { const c = await env.KV.get(socialDriveCfgKey(bid), 'json'); if (c && c.folderId) folderId = str(c.folderId); } catch (e) { /* */ } }
  const res = await driveResolveContentFolder(env, bid, { folderId });
  if (str(body.folder_id || '').trim()) { try { await env.KV.put(socialDriveCfgKey(bid), JSON.stringify({ folderId: res.folderId, _t: Date.now() })); } catch (e) { /* */ } }
  if (!res.folderId) return { status: 200, body: { ok: true, naam, linked: false, source: res.source, files: [], folders: [], message: 'Geen Drive-map gekoppeld aan deze klant (ClickUp-veld Drive-map leeg).' } };
  const listing = await driveListFolder(env, res.folderId);
  let used = {}; try { used = (await env.KV.get(socialUsedKey(bid), 'json')) || {}; } catch (e) { used = {}; }
  const files = listing.files.map((f) => { const u = used[f.id] || null; return { ...f, used: !!(u && u.used), usedAt: (u && u.ts) || 0, note: (u && u.note) || '' }; });
  return { status: 200, body: { ok: true, naam, linked: true, source: res.source, folder_id: res.folderId, folder_name: res.folderName || '', candidates: res.candidates || [], files, folders: listing.folders, needs_config: res.source === 'company' } };
}
// teamSocialDriveMark: zet een bestand op gebruikt/ongebruikt. Body: { bedrijf_id, file_id, used:bool, note?, post_id? }.
export async function teamSocialDriveMark(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const bid = cleanTaskId(body.bedrijf_id); if (!bid) return { status: 400, body: { ok: false } };
  const fid = str(body.file_id).slice(0, 80); if (!fid) return { status: 400, body: { ok: false } };
  const k = socialUsedKey(bid);
  let cur = {}; try { cur = (await env.KV.get(k, 'json')) || {}; } catch (e) { cur = {}; }
  if (body.used === false) { delete cur[fid]; }
  else { cur[fid] = { used: true, ts: Date.now(), by: str(body.account_email || '').toLowerCase(), note: str(body.note || '').slice(0, 200), postId: str(body.post_id || '') }; }
  try { await env.KV.put(k, JSON.stringify(cur)); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, file_id: fid, used: body.used !== false } };
}
// teamSocialDriveRewrite: AI schrijft post(s) rond één Drive-bestand in de huisstijl.
// Body: { bedrijf_id, file_id, file_name, providers?, input?, aantal?, plaats? }. plaats=true →
// meteen als Metricool-concept + bestand op 'gebruikt' zetten.
export async function teamSocialDriveRewrite(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const bid = cleanTaskId(body.bedrijf_id); if (!bid) return { status: 400, body: { ok: false, error: 'no_bedrijf' } };
  const naam = (await bedrijvenNaamMap(env))[bid] || 'de klant';
  const fileName = str(body.file_name || '').slice(0, 200);
  const fileId = str(body.file_id || '').slice(0, 80);
  let posts = []; try { const r = await metricool(bid, {}, env); if (r && r.body && r.body.ok) posts = r.body.posts || []; } catch (e) { /* */ }
  let website = '', brief = '';
  try { const br = await cu.get(env, `/task/${bid}`); if (br.ok && br.data) { website = str(getCF(br.data, FIELD.website) || ''); brief = str(br.data.description || br.data.text_content || '').slice(0, 1200); } } catch (e) { /* */ }
  const netwerken = (Array.isArray(body.providers) && body.providers.length) ? body.providers.map((n) => str(n).toLowerCase()).filter(Boolean) : ['instagram', 'facebook'];
  const aantal = Math.min(3, Math.max(1, Number(body.aantal) || 1));
  const manueel = str(body.input || '').slice(0, 800);
  const eerdere = posts.slice(0, 10).map((p) => { let t = ''; try { t = decodeURIComponent(str(p.tekst || '')); } catch (e) { t = str(p.tekst || ''); } return '- ' + t.replace(/\s+/g, ' ').slice(0, 140); }).join('\n');
  const sys = 'Je bent de social-media-copywriter van Studio 27 voor "' + naam + '". Je krijgt een stuk CONTENT uit de Drive van de klant (een bestand: foto/video/document). Schrijf ' + aantal + ' kant-en-klare social-media-post(s) rond deze content, in exact dezelfde tone-of-voice, taal en stijl als de eerdere posts. Vlaams, menselijk, geen em-dashes of en-dashes. Per post: pakkende opening, waardevolle inhoud, passende call-to-action, relevante hashtags. Verzin geen feiten die niet uit de context volgen. Antwoord UITSLUITEND met geldige JSON: {"posts":[{"tekst":"...","netwerk":"instagram"}]}.';
  const user = 'Klant: ' + naam + (website ? (' (website ' + website + ')') : '') + '.\nDrive-bestand: "' + (fileName || fileId) + '".\n' + (manueel ? ('Context/aanleiding van de collega: ' + manueel + '\n') : '') + (brief ? ('Achtergrond uit ClickUp: ' + brief + '\n') : '') + 'Kanalen: ' + netwerken.join(', ') + '.\n\nEERDERE POSTS (volg stijl):\n' + (eerdere || '(geen eerdere posts)') + '\n\nGeef ' + aantal + ' post(s) als JSON.';
  const res = await Promise.race([aiComplete(env, AI_MODEL, sys, user, 1600, { skill: 'social:drive-herschrijf', bedrijf_id: str(body.bedrijf_id) }), new Promise((r) => setTimeout(() => r({ err: 'ai_timeout' }), 45000))]);
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: (res && res.err) || 'ai_fout', message: 'De AI gaf geen tekst terug.' } };
  let drafts = [];
  try { const m = str(res.text).match(/\{[\s\S]*\}/); const j = JSON.parse(m ? m[0] : res.text); drafts = Array.isArray(j.posts) ? j.posts : []; } catch (e) { drafts = []; }
  drafts = drafts.slice(0, aantal).map((d) => ({ tekst: str(d && d.tekst).slice(0, 2000), netwerk: (str(d && d.netwerk).toLowerCase() || netwerken[0]) }));
  if (!drafts.length) return { status: 200, body: { ok: false, error: 'leeg', message: 'Geen bruikbare tekst ontvangen.' } };
  let geplaatst = 0;
  if (body.plaats === true) {
    for (let i = 0; i < drafts.length; i++) { const dt = msToBrusselsYmd(Date.now() + (i + 1) * 86400000) + 'T10:00'; try { const cr = await metricoolCreate(bid, { text: drafts[i].tekst, providers: [drafts[i].netwerk], media: [], date: dt, __staff: true }, env); if (cr && cr.body && cr.body.ok) { geplaatst++; drafts[i].date = dt; drafts[i].in_metricool = true; } } catch (e) { /* */ } }
    if (geplaatst > 0 && fileId) { try { const k = socialUsedKey(bid); const cur = (await env.KV.get(k, 'json')) || {}; cur[fileId] = { used: true, ts: Date.now(), by: str(body.account_email || '').toLowerCase(), note: 'via AI-herschrijf' }; await env.KV.put(k, JSON.stringify(cur)); } catch (e) { /* */ } }
  }
  return { status: 200, body: { ok: true, naam, file_id: fileId, drafts, geplaatst } };
}
// teamSocialDriveScan: best-effort AI-kruisvergelijking tussen Drive-bestanden en recente
// posts → markeert welke bestanden WAARSCHIJNLIJK al gepost zijn (suggesties, niet auto-toegepast).
export async function teamSocialDriveScan(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const bid = cleanTaskId(body.bedrijf_id); if (!bid) return { status: 400, body: { ok: false } };
  let folderId = str(body.folder_id || '').trim();
  if (!folderId) { try { const c = await env.KV.get(socialDriveCfgKey(bid), 'json'); if (c && c.folderId) folderId = str(c.folderId); } catch (e) { /* */ } }
  const res = await driveResolveContentFolder(env, bid, { folderId });
  if (!res.folderId) return { status: 200, body: { ok: true, suggestions: [] } };
  const listing = await driveListFolder(env, res.folderId);
  if (!listing.files.length) return { status: 200, body: { ok: true, suggestions: [] } };
  let posts = []; try { const r = await metricool(bid, {}, env); if (r && r.body && r.body.ok) posts = r.body.posts || []; } catch (e) { /* */ }
  const postTxt = posts.slice(0, 40).map((p) => { let t = ''; try { t = decodeURIComponent(str(p.tekst || '')); } catch (e) { t = str(p.tekst || ''); } return t.replace(/\s+/g, ' ').slice(0, 180); }).filter(Boolean);
  const fileLines = listing.files.slice(0, 60).map((f, i) => i + '. ' + str(f.name)).join('\n');
  const sys = 'Je vergelijkt bestandsnamen uit een Drive-map met recente social-media-posts van dezelfde klant. Bepaal per bestand of het WAARSCHIJNLIJK al gepost is (naam-overlap, onderwerp, datum in de naam). Wees voorzichtig: enkel opnemen bij duidelijke overlap. Antwoord UITSLUITEND met JSON: {"used":[{"i":0,"reason":"korte reden"}]} (i = bestandsindex).';
  const user = 'BESTANDEN:\n' + fileLines + '\n\nRECENTE POSTS:\n' + (postTxt.join('\n') || '(geen posts)') + '\n\nWelke bestanden zijn waarschijnlijk al gepost?';
  const r2 = await Promise.race([aiComplete(env, AI_MODEL, sys, user, 1200, { skill: 'social:drive-scan', bedrijf_id: str(body.bedrijf_id) }), new Promise((r) => setTimeout(() => r({ err: 't' }), 40000))]);
  let idxs = [];
  if (r2 && r2.text) { try { const m = str(r2.text).match(/\{[\s\S]*\}/); const j = JSON.parse(m ? m[0] : r2.text); if (Array.isArray(j.used)) idxs = j.used; } catch (e) { /* */ } }
  const suggestions = idxs.map((u) => { const i = Number(u && u.i); const f = listing.files[i]; if (!f) return null; return { file_id: f.id, name: f.name, reason: str(u && u.reason || '').slice(0, 160) }; }).filter(Boolean);
  return { status: 200, body: { ok: true, suggestions } };
}

// teamTaskSplit: splitst een taak in 2. Origineel → "…, deel 1" (halve est+budget, blijft
// ingepland staan). Nieuw → "…, deel 2": kopie met halve est+budget + ALLE custom fields
// (klant/contact/meeting/type job/organisatie/…) + assignees/status/deadline/parent, maar
// ZONDER start_date → komt in 'Te plannen' zodat het op een andere dag ingepland kan worden.
export async function teamTaskSplit(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const tr = await cu.get(env, `/task/${taskId}`);
  if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const t = tr.data;
  const listId = t.list && t.list.id;
  if (!listId) return { status: 200, body: { ok: false, error: 'no_list' } };
  const mode = (body.mode === 'duplicate' || body.mode === 'restant') ? body.mode : 'split';   // split | restant | duplicate
  const base = (str(t.name).replace(/\s*[—-]\s*deel\s*\d+\s*$/i, '').replace(/\s*\((kopie|restant)\)\s*$/i, '').trim()) || str(t.name);
  const est = Number(t.time_estimate) || 0;
  // hoeveel uren krijgt het NIEUWE deel?
  let newEst;
  if (mode === 'duplicate') newEst = est;
  else if (mode === 'restant') { const rem = Math.round(Number(body.remainder_est) || 0); newEst = (rem > 0 && rem < est) ? rem : (est > 0 ? Math.round(est / 2) : 0); }
  else newEst = est > 0 ? Math.round(est / 2) : 0;
  const keepEst = (mode === 'duplicate') ? est : (est > 0 ? Math.max(0, est - newEst) : 0);
  const b = num(getCF(t, BUDGET_FIELD));
  let newB = null, keepB = null;
  if (b > 0) {
    if (mode === 'duplicate') newB = Math.round(b * 100) / 100;
    else if (est > 0) { newB = Math.round(b * newEst / est * 100) / 100; keepB = Math.round((b - newB) * 100) / 100; }
    else { newB = Math.round(b / 2 * 100) / 100; keepB = newB; }
  }
  const newName = mode === 'duplicate' ? (base + ' (kopie)') : mode === 'restant' ? (base + ' (restant)') : (base + ', deel 2');
  // 1) nieuwe taak aanmaken
  const cbody = { name: newName, assignees: (Array.isArray(t.assignees) ? t.assignees : []).map((a) => Number(a && a.id)).filter(Boolean) };
  if (t.status && t.status.status) cbody.status = str(t.status.status);
  if (newEst) cbody.time_estimate = newEst;
  if (t.priority && t.priority.id) cbody.priority = Number(t.priority.id);
  if (t.parent) cbody.parent = str(t.parent);
  const desc = str(t.description || ''); if (desc) cbody.description = desc;
  if (mode === 'split') {
    // deel 2 → eerstvolgende WERKDAG, zelfde tijdstip als origineel (of 09:00)
    const startHm = t.start_date ? msToBrusselsHm(Number(t.start_date)) : '09:00';
    let ny = ymdPlus(msToBrusselsYmd(t.start_date ? Number(t.start_date) : Date.now()), 1);
    for (let g = 0; g < 5; g++) { const wd = new Date(ny + 'T12:00:00Z').getUTCDay(); if (wd === 0 || wd === 6) ny = ymdPlus(ny, 1); else break; }
    const s2 = brusselsWallToMs(ny, startHm); cbody.start_date = s2; cbody.start_date_time = true; cbody.due_date = s2 + (newEst || 3600000); cbody.due_date_time = true;
  }   // restant + duplicate → geen start (backlog 'Te plannen')
  const cr = await cu.post(env, `/list/${listId}/task`, cbody);
  if (!cr.ok || !cr.data || !cr.data.id) return { status: 200, body: { ok: false, error: 'create_failed', detail: str(cr.data && cr.data.err) } };
  const newId = str(cr.data.id);
  // 2) ALLE custom fields overnemen (budget apart = half). Per type de juiste value-vorm.
  const RO = { formula: 1, rollup: 1, automatic_progress: 1, manual_progress: 1, progress: 1 };
  for (const f of (Array.isArray(t.custom_fields) ? t.custom_fields : [])) {
    if (!f || f.value == null || f.id === BUDGET_FIELD || RO[f.type]) continue;
    try {
      if (f.type === 'tasks' || f.type === 'list_relationship') {
        const ids = getRelationIds(t, f.id);
        if (ids.length) await cu.relation(env, newId, f.id, { add: ids });
      } else if (f.type === 'labels') {
        const ids = (Array.isArray(f.value) ? f.value : []).map((x) => (x && typeof x === 'object' ? (x.id || '') : x)).filter(Boolean);
        if (ids.length) await cu.relation(env, newId, f.id, { add: ids });
      } else if (f.type === 'users') {
        const ids = (Array.isArray(f.value) ? f.value : []).map((x) => Number(x && typeof x === 'object' ? x.id : x)).filter(Boolean);
        if (ids.length) await cu.relation(env, newId, f.id, { add: ids });
      } else {
        await cu.field(env, newId, f.id, f.value);
      }
    } catch (e) { /* één veld faalt = doorgaan */ }
  }
  // 3) budget zetten (proportioneel; duplicate = volledige kopie, origineel ongemoeid)
  if (newB != null) { try { await cu.field(env, newId, BUDGET_FIELD, newB); } catch (e) { /* */ } }
  if (keepB != null) { try { await cu.field(env, taskId, BUDGET_FIELD, keepB); } catch (e) { /* */ } }
  // 4) origineel bijwerken per modus
  if (mode === 'split') {
    try { await cu.put(env, `/task/${taskId}`, keepEst ? { name: base + ', deel 1', time_estimate: keepEst } : { name: base + ', deel 1' }); } catch (e) { /* */ }
  } else if (mode === 'restant') {
    // origineel houdt z'n start, krijgt de KORTERE est + due = start + keepEst (de "ingekorte" taak)
    const upd = {}; if (keepEst) upd.time_estimate = keepEst; if (t.start_date && keepEst) { upd.due_date = Number(t.start_date) + keepEst; upd.due_date_time = true; }
    if (Object.keys(upd).length) { try { await cu.put(env, `/task/${taskId}`, upd); } catch (e) { /* */ } }
  }   // duplicate → origineel volledig ongewijzigd
  return { status: 200, body: { ok: true, mode, deel1_id: taskId, deel2_id: newId, new_id: newId } };
}

// teamGroups: ClickUp user-groups ("teams") + hun leden → toon team-lidmaatschap in de collega's-tab.
export async function teamGroups(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  try { const hit = await env.KV.get('team:groups:v1', 'json'); if (hit && Array.isArray(hit.groups)) return { status: 200, body: { ok: true, groups: hit.groups } }; } catch (e) { /* */ }
  let groups = [];
  try {
    const r = await cu.get(env, `/group?team_id=${TEAM_ID}`);
    const gs = (r.ok && r.data && Array.isArray(r.data.groups)) ? r.data.groups : [];
    groups = gs.map((g) => ({ id: str(g.id), naam: str(g.name), members: (Array.isArray(g.members) ? g.members : []).map((m) => Number(m && m.id)).filter(Boolean) }));
  } catch (e) { /* */ }
  try { await env.KV.put('team:groups:v1', JSON.stringify({ groups }), { expirationTtl: 21600 }); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, groups } };
}

// teamGroupMember: voeg een collega toe aan / haal weg uit een ClickUp user-group ("team").
// Synct rechtstreeks naar ClickUp (PUT /group/{id} met members.add/rem). Enkel de zaakvoerder.
export async function teamGroupMember(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder beheert teams.' } };
  const groupId = str(body.group_id);
  const memberId = Number(body.member_id) || 0;
  const action = str(body.action) === 'rem' ? 'rem' : 'add';
  if (!groupId || !memberId) return { status: 400, body: { ok: false, error: 'bad_input' } };
  const payload = { members: {} }; payload.members[action] = [memberId];
  let r; try { r = await cu.put(env, `/group/${groupId}`, payload); } catch (e) { r = null; }
  if (!r || !r.ok) {
    const msg = (r && r.data && (r.data.err || r.data.ECODE)) ? str(r.data.err || r.data.ECODE) : 'ClickUp weigerde de wijziging. Mogelijk is dit teamlid een gast en kan die niet in een team.';
    return { status: 200, body: { ok: false, error: 'clickup_fout', message: msg } };
  }
  // verse ledenlijst uit de ClickUp-respons (val terug op een lege lijst)
  let members = [];
  try { const g = r.data || {}; members = (Array.isArray(g.members) ? g.members : []).map((m) => Number(m && (m.id != null ? m.id : m))).filter(Boolean); } catch (e) { /* */ }
  try { await env.KV.delete('team:groups:v1'); } catch (e) { /* */ }   // cache vers → volgende teamGroups herbouwt
  return { status: 200, body: { ok: true, group_id: groupId, action, member_id: memberId, members } };
}

/* ===========================================================================
 * BEZETTING-VIEW (ClickUp-workload-getrouw), per teamlid de INGEPLANDE uren vs
 * capaciteit, per week of maand, met team-switcher + persoonsfilter. Model 1:1
 * met ClickUp's Workload: VOLLE time_estimate per toegewezene (NIET delen),
 * verdeeld over de werkdagen van [start..due], capaciteit = werkdagen × 8u.
 * Enkel zaakvoerder (admin) + accountmanager (Ilke).
 * =========================================================================== */
const WL_DAILY_CAP_H = 8;   // ClickUp Weekly Availability default = 8u/dag (= 40u/week)
function wlPeriodWindow(anchorMs, kind) {
  const ymd = msToBrusselsYmd(anchorMs || Date.now());
  if (kind === 'maand') {
    const y = Number(ymd.slice(0, 4)), m = Number(ymd.slice(5, 7));
    const nextYm = m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');
    return { van: brusselsWallToMs(ymd.slice(0, 7) + '-01', '00:00'), tot: brusselsWallToMs(nextYm + '-01', '00:00') - 1, kind: 'maand', label: ymd.slice(0, 7) };
  }
  const wd = new Date(ymd + 'T12:00:00Z').getUTCDay();   // 0=zo..6=za
  const mon = ymdPlus(ymd, wd === 0 ? -6 : 1 - wd);
  return { van: brusselsWallToMs(mon, '00:00'), tot: brusselsWallToMs(ymdPlus(mon, 6), '23:59'), kind: 'week', label: mon };
}
// werkdagen (ma-vr standaard, of lid-specifieke set 1=ma..7=zo) tussen twee ms-grenzen, inclusief.
function wlWorkdays(vanMs, totMs, werkdagen) {
  if (totMs < vanMs) return 0;
  const wset = new Set((werkdagen && werkdagen.length ? werkdagen : [1, 2, 3, 4, 5]).map(Number));
  let n = 0, d = msToBrusselsYmd(vanMs); const end = msToBrusselsYmd(totMs); let guard = 0;
  while (d <= end && guard++ < 400) {
    const dow = new Date(d + 'T12:00:00Z').getUTCDay();   // 0=zo..6=za, zelfde conventie als de rest van de code
    if (wset.has(dow)) n++;
    d = ymdPlus(d, 1);
  }
  return n;
}
export async function teamWorkload(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!(rr.perms.admin || rr.perms.account)) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Enkel de zaakvoerder en accountmanager zien de bezetting.' } };
  const kind = str(body.kind) === 'maand' ? 'maand' : 'week';
  const win = wlPeriodWindow(Number(body.period_ms) || Date.now(), kind);
  const roster = rosterFrom(await ledenLijst(env));
  const rosterById = new Map(roster.map((l) => [Number(l.id), l]));
  let groups = [];
  try { const gr = await teamGroups('', { __staff: true }, env); if (gr && gr.body && gr.body.ok) groups = gr.body.groups || []; } catch (e) { /* */ }
  // doel-leden: expliciete personen > gekozen team > iedereen
  let targetIds = null;
  if (Array.isArray(body.member_ids) && body.member_ids.length) targetIds = new Set(body.member_ids.map(Number).filter((id) => rosterById.has(id)));
  else if (str(body.group_id)) { const g = groups.find((x) => String(x.id) === String(body.group_id)); if (g) targetIds = new Set((g.members || []).map(Number).filter((id) => rosterById.has(id))); }
  if (!targetIds || !targetIds.size) targetIds = new Set(roster.map((l) => Number(l.id)));
  // Taken: haal breed venster op (ook taken die STARTEN in de periode maar later vervallen).
  // Uren worden VOLLEDIG toegewezen aan de start_date (of due_date bij geen start) → zelfde logica als ClickUp workload.
  const listQ = DISCIPLINE_LISTS.map((id) => `list_ids%5B%5D=${encodeURIComponent(id)}`).join('&');
  const lo = win.van - 90 * 86400000, hi = win.tot + 90 * 86400000;
  const byTask = new Map();
  { let base = 0, done = false, guard = 0;
    while (!done && guard++ < 6) {
      const reqs = [];
      for (let i = 0; i < 8; i++) reqs.push(cu.get(env, `/team/${TEAM_ID}/task?${listQ}&include_closed=false&subtasks=true&due_date_gt=${lo}&due_date_lt=${hi}&page=${base + i}`).catch(() => ({ ok: false })));
      const ress = await Promise.all(reqs); let anyFull = false;
      for (const r of ress) { const ts = (r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : []; if (ts.length >= 100) anyFull = true; if (r.ok && r.data && r.data.last_page === true) done = true; for (const t of ts) byTask.set(str(t.id), t); }
      if (!anyFull) done = true; base += 8;
    }
  }
  const naamMap = await bedrijvenNaamMap(env);
  const perLid = new Map();   // id -> { uren, budget, taken:[] }
  for (const t of byTask.values()) {
    if (isDoneTask(t)) continue;
    const as = (Array.isArray(t.assignees) ? t.assignees : []).map((a) => Number(a && a.id)).filter((id) => targetIds.has(id));
    if (!as.length) continue;
    const eh = (Number(t.time_estimate) || 0) / 3600000;
    const s = Number(t.start_date) || 0, d = Number(t.due_date) || 0;
    // Plaatsingsdatum: start_date heeft prioriteit; bij ontbreken valt terug op due_date
    const placeMs = s || d;
    if (!placeMs) continue;   // backlog zonder datum → niet zichtbaar in de bezetting
    // Alleen tellen als de plaatsingsdatum binnen de geselecteerde periode valt
    if (placeMs < win.van || placeMs > win.tot) continue;
    const placeYmd = msToBrusselsYmd(placeMs);
    const bid = getRelationIds(t, FIELD.bedrijf)[0] || '';
    // Budget uit custom-field (currency, opgeslagen als getal)
    const budgetEur = Math.max(0, Number(getCF(t, FIELD.budget) || 0));
    for (const id of as) {
      if (!perLid.has(id)) perLid.set(id, { uren: 0, budget: 0, taken: [] });
      const e = perLid.get(id);
      e.uren += eh;   // volledige schatting op plaatsingsdatum (= ClickUp-gedrag)
      e.budget += budgetEur;
      if (e.taken.length < 120) e.taken.push({ id: str(t.id), naam: str(t.name).slice(0, 90), uren: Math.round(eh * 10) / 10, bedrijf: naamMap[bid] || '', disc: disciplineOf(t) || '', status: statusMapper(t.status), day_ymd: placeYmd, start_ymd: s ? msToBrusselsYmd(s) : '', due_ymd: d ? msToBrusselsYmd(d) : '' });
    }
  }
  const leden = [...targetIds].map((id) => rosterById.get(id)).filter(Boolean);
  const whs = await Promise.all(leden.map((l) => getWorkhours(env, l.id).catch(() => null)));
  const ledenBezetting = leden.map((l, i) => {
    const wh = whs[i] || { werkdagen: [1, 2, 3, 4, 5] };
    const cap = wlWorkdays(win.van, win.tot, wh.werkdagen) * WL_DAILY_CAP_H;
    const e = perLid.get(Number(l.id)) || { uren: 0, budget: 0, taken: [] };
    const uren = Math.round(e.uren * 10) / 10;
    return { id: l.id, naam: l.naam, pool: l.pool, uren, capaciteit: cap, pct: cap ? Math.round(uren / cap * 100) : 0, budget_total: Math.round(e.budget), taken: e.taken.sort((a, b) => (a.day_ymd || '').localeCompare(b.day_ymd || '')) };
  }).sort((a, b) => b.pct - a.pct);
  return { status: 200, body: { ok: true, kind: win.kind, periode: { van: win.van, tot: win.tot, label: win.label }, dag_cap: WL_DAILY_CAP_H,
    leden_bezetting: ledenBezetting,
    groups: groups.map((g) => ({ id: g.id, naam: g.naam, n: (g.members || []).map(Number).filter((m) => rosterById.has(m)).length })),
    roster, lijsten: await wlPlanningLists(env), group_id: str(body.group_id || ''), member_ids: [...targetIds] } };
}
// planning-lijsten met naam (voor de taak-aanmaak-keuze), 24u KV-cache.
async function wlPlanningLists(env) {
  try { const hit = await env.KV.get('team:planlists:v1', 'json'); if (hit && Array.isArray(hit) && hit.length) return hit; } catch (e) { /* */ }
  const out = [];
  await Promise.all(DISCIPLINE_LISTS.map(async (id) => { try { const r = await cu.get(env, `/list/${id}`); if (r.ok && r.data && r.data.name) out.push({ id, naam: str(r.data.name) }); } catch (e) { /* */ } }));
  out.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  try { await env.KV.put('team:planlists:v1', JSON.stringify(out), { expirationTtl: 86400 }); } catch (e) { /* */ }
  return out;
}
// teamWorkloadCreate: nieuwe taak rechtstreeks vanuit de bezetting-view (toewijzen + uren + dag). Admin + accountmanager.
export async function teamWorkloadCreate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!(rr.perms.admin || rr.perms.account)) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const name = str(body.name).trim().slice(0, 200); if (!name) return { status: 400, body: { ok: false, error: 'no_name' } };
  const listId = str(body.list_id); if (!DISCIPLINE_LISTS.includes(listId)) return { status: 400, body: { ok: false, error: 'bad_list' } };
  const memberId = Number(body.member_id) || 0;
  if (memberId) { const rs = rosterFrom(await ledenLijst(env)); if (!rs.some((l) => Number(l.id) === memberId)) return { status: 400, body: { ok: false, error: 'bad_member' } }; }
  const estH = Math.max(0, Math.min(400, Number(body.est_h) || 0));
  const cbody = { name };
  if (memberId) cbody.assignees = [memberId];
  if (estH > 0) cbody.time_estimate = Math.round(estH * 3600000);
  const sy = str(body.start_ymd);
  if (/^\d{4}-\d{2}-\d{2}$/.test(sy)) { const s = brusselsWallToMs(sy, '09:00'); cbody.start_date = s; cbody.start_date_time = true; const dur = estH > 0 ? Math.round(estH * 3600000) : 3600000; cbody.due_date = s + dur; cbody.due_date_time = true; }
  const cr = await cu.post(env, `/list/${listId}/task`, cbody);
  if (!cr.ok || !cr.data || !cr.data.id) return { status: 200, body: { ok: false, error: 'create_failed', message: str(cr.data && cr.data.err) || 'ClickUp weigerde de taak.' } };
  return { status: 200, body: { ok: true, task_id: str(cr.data.id), url: str(cr.data.url || '') } };
}

// teamSubtree: directe kinderen van één knoop (lazy-load voor de inklapbare projectboom).
export async function teamSubtree(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const tr = await cu.get(env, `/task/${taskId}?include_subtasks=true`);
  if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const kids = (Array.isArray(tr.data.subtasks) ? tr.data.subtasks : []).map((s) => ({ id: str(s.id), naam: str(s.name), status: statusMapper(s.status) }));
  return { status: 200, body: { ok: true, taken: kids } };
}

// teamTaskSearch: globale ClickUp-stijl zoekbalk. Lichte KV-index over de planning-lijsten
// (id+naam+bedrijf+status+parent), 5 min TTL; bij een hit filteren we in-memory op naam/klant.
const SEARCH_CK = 'team:searchidx:v1';
async function buildSearchIndex(env) {
  const naamMap = await bedrijvenNaamMap(env);
  const idx = []; const seen = new Set();
  // BREED: alle taken die de token ziet (lijsten + productielijsten + gearchiveerde/gesloten taken),
  // meest recent bijgewerkt eerst. Verrijkt met status (+kleur), lijst-naam en assignee-initialen,
  // zodat de dropdown in één oogopslag status + wie + naam toont (ClickUp-stijl).
  for (let p = 0; p < 60; p++) {
    const r = await cu.get(env, `/team/${TEAM_ID}/task?include_closed=true&subtasks=true&order_by=updated&page=${p}`);
    const ts = (r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : [];
    for (const t of ts) {
      if (seen.has(t.id)) continue; seen.add(t.id);
      const bid = (getRelationIds(t, FIELD.bedrijf)[0]) || '';
      const ass = (Array.isArray(t.assignees) ? t.assignees : []).map((a) => ({ i: str(a.initials || (a.username || '').slice(0, 2)).slice(0, 3).toUpperCase(), c: str(a.color || '') })).slice(0, 3);
      idx.push({ id: str(t.id), naam: str(t.name), bedrijf: naamMap[bid] || '', lijst: str(t.list && t.list.name), status: str(t.status && t.status.status), color: str(t.status && t.status.color), done: isDoneTask(t) ? 1 : 0, ass });
    }
    if (ts.length < 100) break;
  }
  return idx;
}
// Dagelijkse cron-warmer: bouwt de zoek-index en cachet 'm 24u zodat ⌘K altijd instant is.
export async function warmSearchIndex(env) {
  try { const idx = await buildSearchIndex(env); await env.KV.put(SEARCH_CK, JSON.stringify({ idx, at: Date.now() }), { expirationTtl: 24 * 3600 }); return idx.length; } catch (e) { return 0; }
}
export async function teamTaskSearch(_b, body, env, ctx) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const q = str(body.q || '').trim().toLowerCase();
  if (q.length < 2) return { status: 200, body: { ok: true, results: [] } };
  let idx = null, stamp = null;
  try { stamp = await env.KV.get(SEARCH_CK, 'json'); } catch (e) { /* */ }
  if (stamp && Array.isArray(stamp.idx)) {
    idx = stamp.idx;
    // achtergrond-verversing als de index ouder is dan 15 min (blokkeert de zoekopdracht NIET → blijft snel)
    if (ctx && ctx.waitUntil && (Date.now() - (stamp.at || 0)) > 15 * 60 * 1000) {
      ctx.waitUntil((async () => { try { const fresh = await buildSearchIndex(env); await env.KV.put(SEARCH_CK, JSON.stringify({ idx: fresh, at: Date.now() }), { expirationTtl: 24 * 3600 }); } catch (e) { /* */ } })());
    }
  } else {
    // KOUDE cache: NIET blokkeren. Bouw in de achtergrond en vraag de gebruiker zo opnieuw.
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil((async () => { try { const fresh = await buildSearchIndex(env); await env.KV.put(SEARCH_CK, JSON.stringify({ idx: fresh, at: Date.now() }), { expirationTtl: 24 * 3600 }); } catch (e) { /* */ } })());
      return { status: 200, body: { ok: true, building: true, results: [] } };
    }
    idx = await buildSearchIndex(env);
    try { await env.KV.put(SEARCH_CK, JSON.stringify({ idx, at: Date.now() }), { expirationTtl: 24 * 3600 }); } catch (e) { /* */ }
  }
  const words = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const it of idx) {
    const naam = (it.naam || '').toLowerCase(), bedr = (it.bedrijf || '').toLowerCase(), lijst = (it.lijst || '').toLowerCase();
    const hay = naam + ' ' + bedr + ' ' + lijst;
    if (!words.every((w) => hay.indexOf(w) >= 0)) continue;   // alle woorden moeten matchen
    let score = 0;
    if (naam.indexOf(q) === 0) score += 100;          // naam begint met de query
    else if (naam.indexOf(q) >= 0) score += 60;        // query staat in de naam
    else if (bedr.indexOf(q) === 0) score += 40;       // bedrijf begint ermee
    else if (bedr.indexOf(q) >= 0) score += 25;        // bedrijf bevat het
    else if (lijst.indexOf(q) >= 0) score += 10;       // lijst-naam bevat het
    if (!it.done) score += 15;                          // open taken iets hoger
    scored.push({ it, score });
  }
  scored.sort((a, b) => (b.score - a.score) || ((a.it.naam || '').length - (b.it.naam || '').length));
  return { status: 200, body: { ok: true, results: scored.slice(0, 12).map((s) => s.it), total: scored.length } };
}

// teamSubtaskToggle: vink een subtaak (of taak) af / terug open, zet de status naar de eerste
// 'done'-status van de lijst, of terug naar de eerste 'open'-status. (ClickUp-checkbox-gedrag.)
export async function teamSubtaskToggle(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const tr = await cu.get(env, `/task/${taskId}`);
  if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const listId = tr.data.list && tr.data.list.id;
  let statuses = [];
  try { const lr = await cu.get(env, `/list/${listId}`); if (lr.ok && lr.data && Array.isArray(lr.data.statuses)) statuses = lr.data.statuses; } catch (e) { /* */ }
  let target = null;
  if (body.done) target = statuses.find((s) => str(s.type) === 'closed') || statuses.find((s) => str(s.type) === 'done') || statuses.find((s) => /done|complete|afge|klaar|factuur|gefactureerd/.test(str(s.status).toLowerCase()));
  else target = statuses.find((s) => str(s.type) === 'open') || statuses.find((s) => str(s.type) === 'custom') || statuses[0];
  if (!target) return { status: 200, body: { ok: false, error: 'geen_status' } };
  const r = await cu.put(env, `/task/${taskId}`, { status: str(target.status) });
  if (!r.ok) return { status: 200, body: { ok: false, error: 'update_failed' } };
  return { status: 200, body: { ok: true, status: statusMapper(r.data && r.data.status) } };
}

// teamSubtaskAdd: voeg een subtaak toe aan een taak (zelfde lijst, parent = de taak).
export async function teamSubtaskAdd(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  const naam = str(body.naam || '').trim().slice(0, 200);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  if (!naam) return { status: 200, body: { ok: false, error: 'geen_naam' } };
  const tr = await cu.get(env, `/task/${taskId}`);
  if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const listId = tr.data.list && tr.data.list.id;
  if (!listId) return { status: 200, body: { ok: false, error: 'no_list' } };
  const cr = await cu.post(env, `/list/${listId}/task`, { name: naam, parent: str(taskId) });
  if (!cr.ok || !cr.data || !cr.data.id) return { status: 200, body: { ok: false, error: 'create_failed', detail: str(cr.data && cr.data.err) } };
  return { status: 200, body: { ok: true, id: str(cr.data.id), naam: str(cr.data.name), status: statusMapper(cr.data.status) } };
}

// teamFinanceDetail: drill-down, welke taken zorgden voor de omzet van één teamlid
// in één maand (klik op een staaf-segment in het dashboard). Enkel admin (per-persoon).
export async function teamFinanceDetail(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  if (!rr.perms.finance_full) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const mid = Number(body.member_id) || 0;
  const maand = str(body.maand).trim();
  if (!mid || !/^\d{4}-\d{2}$/.test(maand)) return { status: 400, body: { ok: false, error: 'bad_input' } };
  const van = brusselsWallToMs(maand + '-01', '00:00'), tot = van + 33 * 86400000;
  const naamMap = await bedrijvenNaamMap(env);
  const listQ = DISCIPLINE_LISTS.map((id) => `list_ids%5B%5D=${encodeURIComponent(id)}`).join('&');
  const taken = []; let totaal = 0; const seen = new Set();
  for (let p = 0; p < 12; p++) {
    const r = await cu.get(env, `/team/${TEAM_ID}/task?${listQ}&assignees%5B%5D=${encodeURIComponent(mid)}&include_closed=true&subtasks=true&due_date_gt=${van - 1}&due_date_lt=${tot}&page=${p}`);
    const ts = (r.ok && r.data && Array.isArray(r.data.tasks)) ? r.data.tasks : [];
    for (const t of ts) {
      if (seen.has(str(t.id))) continue; seen.add(str(t.id));
      if (monthOf(t.due_date) !== maand) continue;
      const b = num(getCF(t, BUDGET_FIELD)); if (b <= 0) continue;
      const as = (Array.isArray(t.assignees) ? t.assignees : []).filter((a) => a && a.id);
      const share = as.length ? b / as.length : b;   // zelfde verdeling als computeFinance (budget / #assignees)
      totaal += share;
      const st = shapeTask(t, naamMap);
      taken.push({ id: st.id, naam: st.naam, bedrijf: st.bedrijf, discipline: catOf(t), bedrag: Math.round(share), gedeeld: as.length > 1, due_ymd: msToBrusselsYmd(t.due_date), status: st.status });
    }
    if (!ts.length || (r.data && r.data.last_page === true)) break;
  }
  taken.sort((a, b) => b.bedrag - a.bedrag);
  return { status: 200, body: { ok: true, member_id: mid, maand, totaal: Math.round(totaal), aantal: taken.length, taken } };
}

// ══════════════════════════════════════════════════════════════════════════
// AI-ADVIES: gedeelde context + FEEDBACK-GEHEUGEN + afvinkbare CHECKLIST
// ──────────────────────────────────────────────────────────────────────────
// Feedback die Vincent geeft, wordt per adviseur-type bewaard en in ELKE prompt
// geïnjecteerd → de AI "leert". Adviezen worden een checklist: een punt afvinken
// verplaatst het naar 'done' en de AI denkt één vervangend punt terug.
const ADV_TYPES = { fin: 1, sales: 1, rend: 1 };
const advFbKey = (t) => 'team:advfb:' + t + ':v1';
const advChkKey = (t) => 'team:advchk:' + t + ':v1';
async function advFeedbackList(env, t) { try { const a = await env.KV.get(advFbKey(t), 'json'); if (Array.isArray(a)) return a; } catch (e) { /* */ } return []; }
function advFeedbackBlock(list) {
  if (!list || !list.length) return '';
  return ' FEEDBACK & CONTEXT VAN VINCENT (door de tijd opgebouwd, weeg ZWAAR, pas je advies hierop aan): ' + list.slice(-14).map((f, i) => (i + 1) + '. ' + String((f && f.text) || '').slice(0, 240)).join('  ') + '.';
}
function rid() { return 'a' + Math.random().toString(36).slice(2, 9); }
// Bouwt {ok, sys, data, target} voor een adviseur-type uit de bestaande snapshots, incl. ORG_CONTEXT + feedback.
async function adviesContext(env, rr, type) {
  const fb = advFeedbackBlock(await advFeedbackList(env, type));
  if (type === 'rend') {
    let rend = null; try { const h = await env.KV.get(REND_CK, 'json'); rend = h && h.body; } catch (e) { /* */ }
    if (!rend || !Array.isArray(rend.projecten) || !rend.projecten.length) return { ok: false };
    const T = rend.target || UURTARIEF_TARGET;
    const projs = rend.projecten.filter((p) => p.actief !== false);
    const byClient = {};
    projs.forEach((p) => { const c = p.bedrijf || '(geen klant)'; const x = byClient[c] || (byClient[c] = { bud: 0, uur: 0, n: 0, onder: 0 }); x.bud += p.budget; x.uur += p.uren; x.n++; if (p.tarief < T) x.onder++; });
    const clientArr = Object.keys(byClient).map((c) => ({ klant: c, tarief: byClient[c].uur > 0 ? Math.round(byClient[c].bud / byClient[c].uur) : 0, n: byClient[c].n, onder: byClient[c].onder })).filter((c) => c.tarief > 0).sort((a, b) => a.tarief - b.tarief);
    const sorted = projs.slice().sort((a, b) => a.tarief - b.tarief);
    const L = [];
    L.push('Uurtarief-doel = €' + T + '/u. Tarief = projectbudget ÷ ALLE geplande projecturen (incl. 0-euro feedback/meetings).');
    L.push('Lopende externe projecten: ' + projs.length + ', waarvan ' + sorted.filter((p) => p.tarief < T).length + ' onder €' + T + '/u; gemiddeld €' + (rend.gemiddeld_tarief || 0) + '/u.');
    L.push('LAAGSTE projecten (€/u, meest urgent): ' + sorted.slice(0, 12).map((p) => String(p.naam).slice(0, 32) + (p.bedrijf ? ' (' + p.bedrijf + ')' : '') + ' €' + p.tarief + '/u').join('; ') + '.');
    if (clientArr.length) L.push('Per klant (laagste tarief eerst): ' + clientArr.slice(0, 10).map((c) => c.klant + ' €' + c.tarief + '/u (' + c.n + ' proj' + (c.onder ? ', ' + c.onder + ' onder doel' : '') + ')').join('; ') + '.');
    const sys = 'Je bent een nuchtere prijs-/rendementsadviseur voor Studio 27 (marketingbureau). Deze adviseur staat op de PROJECTRENDEMENT-pagina. ' + ORG_CONTEXT + fb + ' DOEL = het effectieve uurtarief van lopende projecten omhoog krijgen richting €' + T + '/u. Analyseer welke projecten/klanten het rendement omlaag trekken, welke patronen erin zitten, en geef concrete acties: herprijzen/heronderhandelen, scope inperken, minder feedbackrondes, vaste prijzen herzien, laagrenderende diensten afbouwen. Eerlijk: uurtarief = budget ÷ GEPLANDE uren (geen tijdregistratie), indicatief; een laag tarief kan ook onderbudgettering zijn.';
    return { ok: true, sys, data: 'Projectrendement van Studio 27:\n' + L.join('\n'), target: T };
  }
  // fin + sales delen de finance-cube + capaciteit
  let fin = null, cap = null;
  try { const h = await env.KV.get(FIN_CK, 'json'); fin = h && h.body; } catch (e) { /* */ }
  try { const h = await env.KV.get(CAP_CK, 'json'); cap = h && h.body; } catch (e) { /* */ }
  if (!fin) return { ok: false };
  const CUBE = fin.cube || {};
  const curYM = msToBrusselsYmd(Date.now()).slice(0, 7), yrn = curYM.slice(0, 4);
  const ytd = []; for (let mm = 1; mm <= Number(curYM.slice(5, 7)); mm++) ytd.push(yrn + '-' + String(mm).padStart(2, '0'));
  if (type === 'sales') {
    const T = UURTARIEF_TARGET; let offYtd = 0; const catOms = {}, catUur = {}, oiSum = {};
    for (const m of ytd) {
      offYtd += (CUBE.offMaand && CUBE.offMaand[m]) || 0;
      const cm = CUBE.catMaand && CUBE.catMaand[m]; if (cm) for (const c in cm) catOms[c] = (catOms[c] || 0) + cm[c];
      const cuM = CUBE.catUurMaand && CUBE.catUurMaand[m]; if (cuM) for (const c in cuM) catUur[c] = (catUur[c] || 0) + cuM[c];
      const oi = CUBE.offIssuerMaand && CUBE.offIssuerMaand[m]; if (oi) for (const k in oi) { oiSum[k] = oiSum[k] || { n: 0, eur: 0 }; oiSum[k].n += oi[k].n; oiSum[k].eur += oi[k].eur; }
    }
    const taks = Object.keys(catOms).filter((c) => catOms[c] > 0).map((c) => ({ tak: c, omzet: Math.round(catOms[c]), tarief: (catUur[c] > 0 ? Math.round(catOms[c] / catUur[c]) : 0) }));
    const byOmzet = taks.slice().sort((a, b) => b.omzet - a.omzet);
    const byMarge = taks.filter((t) => t.tarief > 0).sort((a, b) => b.tarief - a.tarief);
    const L = [];
    L.push('PERIODE = dit jaar tot vandaag (' + ytd[0] + ' t/m ' + curYM + '). Uurtarief-doel = €' + T + '/u.');
    L.push('Offertepijplijn UITGEBRACHT dit jaar: €' + Math.round(offYtd) + '.');
    if (oiSum.Arne || oiSum.Vincent) L.push('Offertes uitgebracht: Arne ' + ((oiSum.Arne || {}).n || 0) + ' (€' + Math.round((oiSum.Arne || {}).eur || 0) + '), Vincent ' + ((oiSum.Vincent || {}).n || 0) + ' (€' + Math.round((oiSum.Vincent || {}).eur || 0) + ').');
    L.push('Per discipline, omzet & effectief uurtarief: ' + byOmzet.map((t) => t.tak + ' €' + t.omzet + ' @ €' + t.tarief + '/u').join(', ') + '.');
    L.push('Hoogste marge eerst: ' + byMarge.slice(0, 6).map((t) => t.tak + ' €' + t.tarief + '/u').join(', ') + '. Onder €' + T + '/u = onderbeprijsd → duurder budgetteren.');
    if (cap && cap.totaal) L.push('Backlog (startklare projecten) = ' + cap.totaal.aantal + ' projecten / ' + Math.round(cap.totaal.uren) + 'u' + (cap.prognose ? ' (±' + cap.prognose.weken_backlog + ' wk werk)' : '') + '. Lage backlog = ruimte om méér te verkopen.');
    if (cap && Array.isArray(cap.per_lid)) L.push('Ingeplande uren deze maand per teamlid (laag = ruimte): ' + cap.per_lid.map((l) => (l.naam ? l.naam.split(' ')[0] : '?') + ' ' + Math.round(l.maand != null ? l.maand : 0) + 'u').join(', ') + '.');
    const sys = 'Je bent een nuchtere SALES- en prijsstrateeg voor Studio 27 (marketingbureau; subbedrijven S27, ZVD, 27A, 27M). Deze adviseur staat op de SALES & OFFERTES-pagina. ' + ORG_CONTEXT + fb + ' DOEL = WINSTGEVENDE GROEI: wat méér verkopen (hoogste marge + ruimte), wat duurder budgetteren (uurtarief onder €' + T + '/u), waar de hoogste marge zit, en waar planningsruimte is de komende ~3 maanden. Eerlijk over datalimieten: geen won/verloren-veld; budget-vulgraad indicatief. Acties moeten verkoop-/prijsgericht zijn.';
    return { ok: true, sys, data: 'Sales- & margecijfers van Studio 27:\n' + L.join('\n'), target: T };
  }
  // fin (winstadviseur)
  const TARGET = 11000; let planYtd = 0, offYtd = 0; const orgYtd = {}, catYtd = {}, persYtd = {};
  for (const m of ytd) {
    offYtd += (CUBE.offMaand && CUBE.offMaand[m]) || 0;
    const cm = CUBE.catMaand && CUBE.catMaand[m]; if (cm) for (const c in cm) { catYtd[c] = (catYtd[c] || 0) + cm[c]; planYtd += cm[c]; }
    const om = CUBE.orgMaand && CUBE.orgMaand[m]; if (om) for (const o in om) orgYtd[o] = (orgYtd[o] || 0) + om[o];
    const pm = CUBE.persMaand && CUBE.persMaand[m]; if (pm) for (const id in pm) { if (NON_EXEC_IDS.has(Number(id)) || PERS_HIDE.has(Number(id))) continue; persYtd[id] = (persYtd[id] || 0) + pm[id]; }
  }
  const maanden = ytd.length, targetTot = TARGET * maanden;
  const L = [];
  L.push('PERIODE = dit jaar tot vandaag (' + ytd[0] + ' t/m ' + curYM + ', ' + maanden + ' mnd).');
  L.push('Offertepijplijn UITGEBRACHT: €' + Math.round(offYtd) + '. Gepland budget (indicatief, vulgraad ' + (fin.plan_vulgraad || 0) + '%): €' + Math.round(planYtd) + '.');
  const orgArr = Object.keys(orgYtd).filter((o) => orgYtd[o] > 0).sort((a, b) => orgYtd[b] - orgYtd[a]);
  if (orgArr.length) L.push('Omzet per onderneming: ' + orgArr.map((o) => o + ' €' + Math.round(orgYtd[o])).join(', ') + '.');
  const catArr = Object.keys(catYtd).filter((c) => catYtd[c] > 0).sort((a, b) => catYtd[b] - catYtd[a]);
  if (catArr.length) L.push('Omzet per discipline: ' + catArr.slice(0, 12).map((c) => c + ' €' + Math.round(catYtd[c])).join(', ') + '.');
  if (rr.perms.finance_full) {
    const pArr = Object.keys(persYtd).filter((id) => persYtd[id] > 0).sort((a, b) => persYtd[b] - persYtd[a]);
    if (pArr.length) L.push('Omzet per UITVOEREND teamlid (target €' + TARGET + '/mnd → €' + targetTot + ' over ' + maanden + ' mnd): ' + pArr.map((id) => { const nm = (CUBE.persNaam && CUBE.persNaam[id]) || ('#' + id); const v = Math.round(persYtd[id]); const pc = targetTot ? Math.round(v / targetTot * 100) : 0; return nm.split(' ')[0] + ' €' + v + ' (' + pc + '%)'; }).join(', ') + '.');
  }
  if (cap && Array.isArray(cap.per_lid)) { const wk = cap.per_lid.filter((l) => !MONTHLY_PLAN_IDS.has(Number(l.id))); if (wk.length) L.push('Weekbezetting (vs 38u, enkel weekplanners): ' + wk.map((l) => (l.naam ? l.naam.split(' ')[0] : '?') + ' ' + Math.round((l.weken && l.weken.deze) || 0) + 'u').join(', ') + '.'); }
  if (cap && cap.totaal) L.push('BACKLOG (startklaar) = ' + cap.totaal.aantal + ' projecten / ' + Math.round(cap.totaal.uren) + 'u' + (cap.prognose ? ' (±' + cap.prognose.weken_backlog + ' wk)' : '') + ' = dé bezettingsindicator.');
  const sys = 'Je bent een nuchtere financieel strateeg/bedrijfsadviseur voor Studio 27 (marketingbureau; subbedrijven S27, ZVD, 27A, 27M). DOEL = WINSTMAXIMALISATIE. ' + ORG_CONTEXT + fb + ' Cijfers gelden over DIT JAAR TOT VANDAAG. Hefbomen: meer sales/leads, hogere closingrate, betere opvolging, efficiënter webdesign-proces, te veel feedbackrondes, backlog/onderbenutting, prijszetting/uurtarief. Uitvoerend team (target €' + TARGET + '/mnd) = iedereen behalve Vincent, Ilke en Wout. Eerlijk: geen won/verloren-veld (closingrate niet meetbaar); vulgraad indicatief. Stel bij data_activatie NOOIT tijdregistratie voor.';
  return { ok: true, sys, data: 'Cijfers van Studio 27:\n' + L.join('\n'), target: TARGET };
}
// Vraag de AI om ÉÉN nieuw, vervangend checklist-punt (anders dan de gegeven titels).
async function adviesOneAction(env, rr, type, exclude) {
  const c = await adviesContext(env, rr, type);
  if (!c.ok) return null;
  const ex = (exclude || []).filter(Boolean).slice(0, 40);
  const sys = c.sys + ' Geef PRECIES ÉÉN nieuwe, concrete actie die NIET overlapt met de reeds gegeven/afgewerkte acties. Wijs ze toe aan de verantwoordelijke persoon (veld "wie", voornaam) en formuleer als opdracht. Antwoord met UITSLUITEND geldige JSON (geen markdown): {"titel":"korte actie","waarom":"1 zin","impact":"hoog|midden|laag","wie":"voornaam of -"}.';
  const user = c.data + '\n\nReeds gegeven/afgewerkte acties (NIET herhalen): ' + (ex.length ? ex.map((t, i) => (i + 1) + '. ' + t).join('  ') : '(geen)') + '\n\nGeef één nieuw punt als JSON.';
  const res = await Promise.race([aiComplete(env, AI_MODEL, sys, user, 350, { skill: 'advies:' + str(type), member_id: rr.me && rr.me.id, member_naam: rr.me && rr.me.naam }), new Promise((r) => setTimeout(() => r({ err: 'to' }), 24000))]);
  if (!res || res.err || !res.text) return null;
  try { const m = res.text.match(/\{[\s\S]*\}/); const a = JSON.parse(m ? m[0] : res.text); if (a && a.titel) return { id: rid(), titel: String(a.titel).slice(0, 160), waarom: String(a.waarom || '').slice(0, 200), impact: String(a.impact || 'midden'), wie: String(a.wie || '').slice(0, 40) }; } catch (e) { /* */ }
  return null;
}

// teamFinanceAdvies: AI-winstadviseur. Leest de reeds berekende finance- + capaciteit-
// snapshots (geen herscan), stuurt een compacte samenvatting naar Claude en vraagt een
// geprioriteerde analyse voor winstmaximalisatie. Cache per dag (body.refresh forceert).
export async function teamFinanceAdvies(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  const key = 'team:finadvies:v6:' + msToBrusselsYmd(Date.now());
  if (!body.refresh) { try { const h = await env.KV.get(key, 'json'); if (h && h.body) return { status: 200, body: Object.assign({}, h.body, { cached: true }) }; } catch (e) { /* */ } }
  const c = await adviesContext(env, rr, 'fin');
  if (!c.ok) return { status: 200, body: { ok: false, error: 'geen_cijfers', message: 'De cijfers worden nog berekend, probeer zo opnieuw.' } };
  const system = c.sys + ' Antwoord met UITSLUITEND geldige JSON (geen markdown, geen tekst eromheen) in EXACT dit schema: ' + ADVIES_SCHEMA;
  return runAdvies(env, key, system, c.data + '\n\nGeef je analyse als JSON volgens het schema.');
}

// Gedeelde AI-advies-runner: race + JSON-parse + KV-cache (36u). Schema = renderAdviesHtml-compatibel.
async function runAdvies(env, key, system, user) {
  const res = await Promise.race([aiComplete(env, AI_MODEL, system, user, 1600, { skill: 'advies:' + str(key) }), new Promise((r) => setTimeout(() => r({ err: 'ai_timeout' }), 28000))]);
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: (res && res.err) || 'ai_fout' } };
  let advies = null;
  try { const m = res.text.match(/\{[\s\S]*\}/); advies = JSON.parse(m ? m[0] : res.text); } catch (e) { advies = null; }
  const out = advies ? { ok: true, advies, gegenereerd: Date.now() } : { ok: true, advies: { tekst: res.text }, gegenereerd: Date.now() };
  try { await env.KV.put(key, JSON.stringify({ _t: Date.now(), body: out }), { expirationTtl: 36 * 3600 }); } catch (e) { /* */ }
  return { status: 200, body: out };
}
const ADVIES_SCHEMA = '{"samenvatting":"max 1 zin","kpis":[{"label":"...","waarde":"..."}],"goed":["..."],"aandacht":["..."],"acties":[{"titel":"korte actie","waarom":"1 zin","impact":"hoog|midden|laag","wie":"voornaam van de verantwoordelijke, of -"}],"data_activatie":"1 zin"}. Max 3 kpis, 3 goed, 3 aandacht, 5 acties. Wijs ELKE actie toe aan de verantwoordelijke persoon (veld "wie", voornaam) volgens de organisatie-rollen hierboven, en formuleer ze als een concrete opdracht aan die persoon; je mag Vincent of Wout ook taken geven. Elke bullet KORT (max ~18 woorden). Nederlands, concreet, alleen wat uit DEZE cijfers + de organisatiekennis volgt. Stel bij data_activatie NOOIT tijdregistratie voor (Studio 27 gebruikt dat bewust niet).';

// ── AI-SALESADVISEUR (Sales & offertes-pagina): wat méér/duurder verkopen, waar de marge zit, planningsruimte.
export async function teamSalesAdvies(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  const key = 'team:salesadvies:v2:' + msToBrusselsYmd(Date.now());
  if (!body.refresh) { try { const h = await env.KV.get(key, 'json'); if (h && h.body) return { status: 200, body: Object.assign({}, h.body, { cached: true }) }; } catch (e) { /* */ } }
  const c = await adviesContext(env, rr, 'sales');
  if (!c.ok) return { status: 200, body: { ok: false, error: 'geen_cijfers' } };
  const system = c.sys + ' Antwoord met UITSLUITEND geldige JSON (geen markdown) in EXACT dit schema: ' + ADVIES_SCHEMA + ' Acties moeten verkoop-/prijsgericht zijn.';
  return runAdvies(env, key, system, c.data + '\n\nGeef je analyse als JSON volgens het schema.');
}

// ── AI-RENDEMENTSADVISEUR (Projectrendement-pagina): welke projecten/klanten trekken het tarief omlaag + acties.
export async function teamRendementAdvies(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  const key = 'team:rendadvies:v2:' + msToBrusselsYmd(Date.now());
  if (!body.refresh) { try { const h = await env.KV.get(key, 'json'); if (h && h.body) return { status: 200, body: Object.assign({}, h.body, { cached: true }) }; } catch (e) { /* */ } }
  const c = await adviesContext(env, rr, 'rend');
  if (!c.ok) return { status: 200, body: { ok: false, error: 'geen_cijfers' } };
  const system = c.sys + ' Antwoord met UITSLUITEND geldige JSON (geen markdown) in EXACT dit schema: ' + ADVIES_SCHEMA;
  return runAdvies(env, key, system, c.data + '\n\nGeef je analyse als JSON volgens het schema.');
}

// ── CHECKLIST-state per type {open:[{id,titel,waarom,impact,wie}], done:[{id,titel,wie,ts}]} ──
async function advChkGet(env, t) { try { const x = await env.KV.get(advChkKey(t), 'json'); if (x && Array.isArray(x.open)) return x; } catch (e) { /* */ } return null; }
async function advChkPut(env, t, st) { try { await env.KV.put(advChkKey(t), JSON.stringify(st), { expirationTtl: 90 * 24 * 3600 }); } catch (e) { /* */ } }
function mapAct(a) { return { id: rid(), titel: String((a && a.titel) || '').slice(0, 160), waarom: String((a && a.waarom) || '').slice(0, 220), impact: String((a && a.impact) || 'midden'), wie: String((a && a.wie) || '').slice(0, 40) }; }
const advFnFor = (t) => (t === 'fin' ? teamFinanceAdvies : t === 'sales' ? teamSalesAdvies : teamRendementAdvies);

// Feedback opslaan in het AI-geheugen (per type) → wordt in elke prompt geïnjecteerd.
export async function teamAdviesFeedback(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  const type = str(body.type); if (!ADV_TYPES[type]) return { status: 400, body: { ok: false, error: 'type' } };
  const text = str(body.text).trim().slice(0, 400); if (!text) return { status: 400, body: { ok: false, error: 'leeg' } };
  const list = await advFeedbackList(env, type);
  list.push({ text, ts: Date.now(), by: (rr.me && rr.me.naam) || '' });
  const trimmed = list.slice(-40);
  try { await env.KV.put(advFbKey(type), JSON.stringify(trimmed), { expirationTtl: 365 * 24 * 3600 }); } catch (e) { return { status: 200, body: { ok: false, error: 'kv' } }; }
  return { status: 200, body: { ok: true, count: trimmed.length } };
}
export async function teamAdviesFeedbackList(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  const type = str(body.type); if (!ADV_TYPES[type]) return { status: 400, body: { ok: false } };
  const list = await advFeedbackList(env, type);
  return { status: 200, body: { ok: true, items: list.slice(-30).reverse() } };
}
// Checklist ophalen (seed bij eerste keer uit het advies; daarna persistent + evoluerend).
export async function teamAdviesChecklist(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  const type = str(body.type); if (!ADV_TYPES[type]) return { status: 400, body: { ok: false } };
  let st = await advChkGet(env, type);
  if (st && Array.isArray(st.open) && st.open.length) return { status: 200, body: { ok: true, open: st.open, done: (st.done || []).slice(-30) } };
  const r = await advFnFor(type)(_b, Object.assign({}, body, { refresh: false }), env);   // genereert/cachet het advies indien nodig
  const adv = r && r.body && r.body.advies;
  if (!adv || !Array.isArray(adv.acties) || !adv.acties.length) return { status: 200, body: { ok: false, error: (r && r.body && r.body.error) || 'geen_cijfers' } };
  const open = adv.acties.slice(0, 5).map(mapAct);
  st = { open, done: (st && st.done) || [], _t: Date.now() };
  await advChkPut(env, type, st);
  return { status: 200, body: { ok: true, open, done: st.done.slice(-30) } };
}
// Een punt afvinken → naar 'done' + de AI denkt één vervangend punt terug.
export async function teamAdviesCheck(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  const type = str(body.type); if (!ADV_TYPES[type]) return { status: 400, body: { ok: false } };
  const id = str(body.id);
  const st = await advChkGet(env, type) || { open: [], done: [] };
  const idx = st.open.findIndex((x) => x.id === id);
  if (idx < 0) return { status: 200, body: { ok: false, error: 'niet_gevonden' } };
  const item = st.open.splice(idx, 1)[0];
  st.done = st.done || []; st.done.push({ id: item.id, titel: item.titel, wie: item.wie, ts: Date.now() });
  if (st.done.length > 80) st.done = st.done.slice(-80);
  const exclude = st.open.map((x) => x.titel).concat(st.done.slice(-25).map((x) => x.titel));
  const nieuw = await adviesOneAction(env, rr, type, exclude);
  if (nieuw) st.open.push(nieuw);
  await advChkPut(env, type, st);
  return { status: 200, body: { ok: true, added: nieuw || null, open: st.open, done: st.done.slice(-30) } };
}
// Volledige checklist opnieuw genereren (vers advies → nieuwe punten; 'done' blijft als historiek).
export async function teamAdviesRefresh(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const deny = denyUnless(rr.perms, 'finance'); if (deny) return deny;
  const type = str(body.type); if (!ADV_TYPES[type]) return { status: 400, body: { ok: false } };
  const r = await advFnFor(type)(_b, Object.assign({}, body, { refresh: true }), env);
  const adv = r && r.body && r.body.advies;
  if (!adv || !Array.isArray(adv.acties) || !adv.acties.length) return { status: 200, body: { ok: false, error: (r && r.body && r.body.error) || 'geen_cijfers' } };
  const prev = await advChkGet(env, type);
  const st = { open: adv.acties.slice(0, 5).map(mapAct), done: (prev && prev.done) || [], _t: Date.now() };
  await advChkPut(env, type, st);
  return { status: 200, body: { ok: true, open: st.open, done: st.done.slice(-30), advies: adv } };
}

// ── TIME-TRACKING ── echte ClickUp-tijdregistratie op naam van het teamlid.
// Start = onthoud het startmoment in KV (realtime teller portal-side); Stop = schrijf
// één afgeronde time-entry naar ClickUp (start+duur+assignee=teamlid). Current = lopende timer.
export async function teamTimerStart(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const rec = { task_id: taskId, naam: str(body.naam || ''), started: Date.now(), member: Number(rr.me.id) };
  try { await env.KV.put('team:timer:' + rr.me.id, JSON.stringify(rec), { expirationTtl: 16 * 3600 }); } catch (e) { return { status: 200, body: { ok: false, error: 'kv' } }; }
  return { status: 200, body: { ok: true, started: rec.started, task_id: taskId } };
}
export async function teamTimerCurrent(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  let rec = null; try { rec = await env.KV.get('team:timer:' + rr.me.id, 'json'); } catch (e) { /* */ }
  if (!rec) return { status: 200, body: { ok: true, running: false } };
  return { status: 200, body: { ok: true, running: true, task_id: rec.task_id, naam: rec.naam, started: rec.started } };
}
export async function teamTimerStop(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  let rec = null; try { rec = await env.KV.get('team:timer:' + rr.me.id, 'json'); } catch (e) { /* */ }
  if (!rec) return { status: 200, body: { ok: false, error: 'geen_timer' } };
  const dur = Math.max(60000, Date.now() - Number(rec.started || Date.now()));   // min 1 minuut
  let cr = null;
  try { cr = await cu.post(env, `/team/${TEAM_ID}/time_entries`, { tid: rec.task_id, start: Number(rec.started), duration: dur, assignee: Number(rr.me.id), description: 'Teamportaal' }); } catch (e) { cr = { ok: false }; }
  try { await env.KV.delete('team:timer:' + rr.me.id); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, geboekt: !!(cr && cr.ok), logged_ms: dur, task_id: rec.task_id } };
}

/* ===========================================================================
 * TIME ESTIMATE PER PERSOON (ClickUp-stijl assignee-breakdown). ClickUp's eigen
 * per-assignee-estimate is enkel schrijfbaar op Business+ én niet leesbaar via de
 * API → we spiegelen de verdeling zelf in KV (team:estsplit:<taskId>) en zetten de
 * ClickUp-aggregate (time_estimate) op de SOM. Plan-onafhankelijk + altijd leesbaar.
 * =========================================================================== */
const estSplitKey = (id) => 'team:estsplit:' + cleanTaskId(id);
export async function teamEstSplit(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const splits = Array.isArray(body.splits) ? body.splits : [];
  const map = {}; let totalMs = 0;
  for (const s of splits.slice(0, 20)) {
    const id = Number(s && s.id) || 0; if (!id) continue;
    const h = Number(s.uren); if (!isFinite(h) || h < 0) continue;
    const ms = Math.round(h * 3600000); if (ms > 0) { map[id] = ms; totalMs += ms; }
  }
  try { if (Object.keys(map).length) await env.KV.put(estSplitKey(taskId), JSON.stringify(map)); else await env.KV.delete(estSplitKey(taskId)); } catch (e) { /* */ }
  let est_uren = Math.round(totalMs / 3600000 * 10) / 10;
  try { const r = await cu.put(env, `/task/${taskId}`, { time_estimate: totalMs }); if (r.ok && r.data && r.data.time_estimate) est_uren = Math.round(Number(r.data.time_estimate) / 3600000 * 10) / 10; } catch (e) { /* */ }
  const est_split = {}; for (const k of Object.keys(map)) est_split[k] = Math.round(map[k] / 3600000 * 100) / 100;
  return { status: 200, body: { ok: true, est_uren, est_split } };
}

/* ===========================================================================
 * TIJDSREGISTRATIE (ClickUp time entries), lijst/toevoegen/bewerken/verwijderen.
 * De lopende play/pauze-timer blijft teamTimerStart/Stop (pauze = stop = segment).
 * =========================================================================== */
export async function teamTimeList(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const startW = Date.now() - 180 * 86400000, endW = Date.now() + 2 * 86400000;
  let entries = [];
  try {
    const r = await cu.get(env, `/team/${TEAM_ID}/time_entries?task_id=${encodeURIComponent(taskId)}&start_date=${startW}&end_date=${endW}`);
    const data = (r.ok && r.data && Array.isArray(r.data.data)) ? r.data.data : [];
    const leden = await ledenLijst(env); const nm = {}; leden.forEach((l) => { nm[Number(l.id)] = l.naam; });
    entries = data.map((e) => {
      const dur = Number(e.duration) || 0; const uid = Number(e.user && e.user.id) || 0;
      return { id: str(e.id), start: Number(e.start) || 0, end: Number(e.end) || 0, duration: dur, who: str(nm[uid] || (e.user && e.user.username) || ''), description: str(e.description || '') };
    }).filter((e) => e.duration > 0);   // lopende timer (negatieve duur) niet in de bewerklijst
    entries.sort((a, b) => b.start - a.start);
  } catch (e) { /* */ }
  return { status: 200, body: { ok: true, entries } };
}
export async function teamTimeAdd(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const taskId = cleanTaskId(body.task_id); if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const start = Number(body.start_ms) || 0; const dur = Math.round(Number(body.duration_ms) || 0);
  if (!start || dur <= 0) return { status: 200, body: { ok: false, error: 'bad_input', message: 'Vul een geldige tijd in.' } };
  let r; try { r = await cu.post(env, `/team/${TEAM_ID}/time_entries`, { tid: taskId, start, duration: dur, assignee: Number(rr.me.id), description: str(body.description || 'Teamportaal') }); } catch (e) { r = { ok: false }; }
  if (!r || !r.ok) return { status: 200, body: { ok: false, error: 'add_failed' } };
  return { status: 200, body: { ok: true } };
}
export async function teamTimeUpdate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const id = str(body.entry_id || '').replace(/[^0-9]/g, ''); if (!id) return { status: 400, body: { ok: false, error: 'no_entry' } };
  const start = Number(body.start_ms) || 0; const end = Number(body.end_ms) || 0;
  if (!start || !end || end <= start) return { status: 200, body: { ok: false, error: 'bad_input', message: 'De eindtijd moet na de starttijd liggen.' } };
  let r; try { r = await cu.put(env, `/team/${TEAM_ID}/time_entries/${id}`, { start, end }); } catch (e) { r = { ok: false }; }
  if (!r || !r.ok) return { status: 200, body: { ok: false, error: 'update_failed' } };
  return { status: 200, body: { ok: true } };
}
export async function teamTimeDelete(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const id = str(body.entry_id || '').replace(/[^0-9]/g, ''); if (!id) return { status: 400, body: { ok: false, error: 'no_entry' } };
  let r; try { r = await cu.del(env, `/team/${TEAM_ID}/time_entries/${id}`); } catch (e) { r = { ok: false }; }
  if (!r || !r.ok) return { status: 200, body: { ok: false, error: 'delete_failed' } };
  return { status: 200, body: { ok: true } };
}

/* ===========================================================================
 * WERKUREN PER PERSOON (instellingenscherm). Elk teamlid zet z'n eigen werkuren,
 * werkdagen en thuiswerkdagen. De lees-helper getWorkhours + de normalisatie zitten
 * in handlers.mjs (gedeeld met de klant-meetingplanner); hier enkel de 2 endpoints.
 * =========================================================================== */
export async function teamWorkhoursGet(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  return { status: 200, body: { ok: true, workhours: await getWorkhours(env, rr.me.id) } };
}
export async function teamWorkhoursSave(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  const start = whNormHm(body.start, WH_DEFAULT.start);
  const end = whNormHm(body.end, WH_DEFAULT.end);
  if (start >= end) return { status: 200, body: { ok: false, error: 'eind_voor_start', message: 'De eindtijd moet na de starttijd liggen.' } };
  const werkdagen = whNormDays(body.werkdagen, WH_DEFAULT.werkdagen);
  if (!werkdagen.length) return { status: 200, body: { ok: false, error: 'geen_werkdag', message: 'Kies minstens één werkdag.' } };
  const thuisdagen = whNormDays(body.thuisdagen, []).filter((d) => werkdagen.indexOf(d) >= 0);   // een thuiswerkdag is altijd ook een werkdag
  const wh = { start, end, werkdagen, thuisdagen };
  try { await env.KV.put(whKey(rr.me.id), JSON.stringify(wh)); } catch (e) { return { status: 502, body: { ok: false, message: 'Opslaan lukte niet, probeer zo opnieuw.' } }; }
  try { await env.KV.delete(aiPlanKey(rr.me.id)); } catch (e) { /* */ }   // dagplan met nieuwe uren laten herberekenen
  return { status: 200, body: { ok: true, workhours: wh } };
}

/* ===========================================================================
 * HTML-VOORBEREIDING (webdesigntaken). Single-shot Claude-generatie van een
 * responsive Studio 27-stijl HTML-pagina uit de taakbriefing, de draagbare kern
 * van de V9 sample-html-bouwer. De VOLLEDIGE V9-pijplijn (SE Ranking-keyword-
 * onderzoek, concurrentie, master-plan, Webflow-push) draait NIET in de worker
 * (vereist Claude Code-subagents + MCP-connectors) en wordt apart begeleid.
 * =========================================================================== */
const HTML_SYS = [
  'Je bent de webpagina-bouwer van Studio 27, een Vlaams marketing- en webdesignbureau.',
  'Je bouwt op basis van een projectbriefing ÉÉN volledige, zelfstandige, responsive HTML-pagina voor de WEBSITE VAN DE KLANT (niet van Studio 27 zelf).',
  'Eisen:',
  '- Eén bestand: semantische HTML5 + alle CSS embedded in <style> in de <head>. Geen externe libraries, geen JS tenzij strikt nodig (bv. mobiel menu).',
  '- Modern, clean, professioneel, mobile-first responsive (flexbox/grid, max-width-container, leesbare typografie, ruime witruimte, duidelijke visuele hiërarchie). Toegankelijk (alt-teksten, semantische tags, voldoende contrast).',
  '- Opbouw passend bij het paginatype: sticky header met logo-tekst + nav, hero met heldere kop + subkop + primaire CTA, 2-4 inhoudssecties (diensten/USP\'s/over/sociale bewijskracht), een contact/CTA-blok en een footer.',
  '- Nederlandstalige, wervende maar zakelijke copy in de sector en toon van de klant. Verzin GEEN harde feiten (telefoonnummers, prijzen, adressen, cijfers): gebruik daar duidelijke placeholders zoals [telefoonnummer] of [adres].',
  '- Markeer inhoud die je zelf hebt aangenomen subtiel met een HTML-commentaar <!-- aanname: ... --> zodat het team weet wat nog geverifieerd moet worden.',
  '- Kies een tasteful kleurenpalet dat past bij de sector van de klant (CSS-variabelen voor de hoofd- en accentkleur).',
  'Lever UITSLUITEND de volledige HTML-code, beginnend met <!DOCTYPE html>. Geen uitleg, geen markdown-codeblok eromheen.',
].join('\n');
export async function teamHtmlPrepare(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const tr = await cu.get(env, `/task/${taskId}`);
  if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const t = tr.data;
  const naamMap = await bedrijvenNaamMap(env);
  const shaped = shapeTask(t, naamMap);
  const bedrijf = shaped.bedrijf || 'de klant';
  const PT = { homepage: 'Homepage', dienstpagina: 'Dienstpagina', 'over-ons': 'Over ons', contact: 'Contactpagina' };
  const pageKey = str(body.page_type || 'homepage');
  const pageType = PT[pageKey] || 'Homepage';
  const briefing = [
    'Klant/bedrijf: ' + bedrijf,
    'Paginatype: ' + pageType,
    'Discipline: ' + (disciplineOf(t) || 'webdesign'),
    'Projecttaak: ' + str(t.name),
    'Briefing/omschrijving uit de taak:',
    (str(t.description).trim() || '(geen omschrijving ingevuld, leid een plausibele invulling af uit de bedrijfsnaam en het paginatype, en markeer aannames)'),
  ].join('\n');
  const user = 'Bouw de ' + pageType + ' voor deze klant.\n\n' + briefing;
  // Effectieve systeemprompt: de (eventueel door de admin bewerkte) html-prep-prompt, anders de default.
  let sysPrompt = HTML_SYS;
  try { const hp = aiItemFor(await getAiCatalog(env), 'html-prep'); if (hp && str(hp.sys).trim()) sysPrompt = str(hp.sys).trim(); } catch (e) { /* val terug op default */ }
  const res = await aiComplete(env, AI_MODEL, sysPrompt, user, 8000, { skill: 'html-prepare' });
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: (res && res.err) || 'ai_fout' } };
  let html = str(res.text).trim();
  html = html.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();   // strip eventuele codefences
  if (html.slice(0, 200).toLowerCase().indexOf('<!doctype') < 0 && html.toLowerCase().indexOf('<html') < 0) {
    return { status: 200, body: { ok: false, error: 'geen_html' } };
  }
  return { status: 200, body: { ok: true, html, bedrijf, page_type: pageKey } };
}

/* ===========================================================================
 * VOLLEDIGE V9-PIJPLIJN (lichte variant) OP platform.claude, via een Cloud Routine.
 * De routine draait in Anthropic's cloud (subagents + MCP-connectors SE Ranking +
 * ClickUp) en plaatst het resultaat terug op de taak. Deze handler stelt de briefing
 * samen uit de ClickUp-taak en VUURT de routine af via haar API-trigger.
 * Secrets (door Vincent te zetten uit de routine-UI): V9_ROUTINE_URL + V9_ROUTINE_TOKEN.
 * Triggervorm: POST {url} Bearer {token} + experimental-cc-routine-header, body {text}.
 * =========================================================================== */
export async function teamV9Run(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id);
  if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const url = str(env.V9_ROUTINE_URL).trim(), token = str(env.V9_ROUTINE_TOKEN).trim();
  if (!url || !token) return { status: 200, body: { ok: false, error: 'not_configured', message: 'De V9-cloudroutine is nog niet gekoppeld. Vincent moet eerst de trigger-URL + token instellen.' } };
  const tr = await cu.get(env, `/task/${taskId}`);
  if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const t = tr.data;
  const naamMap = await bedrijvenNaamMap(env);
  const shaped = shapeTask(t, naamMap);
  const bedrijf = shaped.bedrijf || 'de klant';
  const pages = str(body.pages || 'homepage').slice(0, 200);
  const briefing = [
    'OPDRACHT. LICHTE V9-WEBSITEPIJPLIJN. Genereer responsive website-HTML in Studio 27-stijl voor onderstaande klant en PLAATS HET RESULTAAT TERUG OP DE CLICKUP-TAAK (comment + bijlage) via de ClickUp-connector.',
    'Werkwijze: (1) lees deze briefing, (2) doe SE Ranking keyword-onderzoek voor het domein + concurrenten indien beschikbaar, (3) maak een beknopt master-plan (sitemap + focus-keyword per pagina), (4) genereer per gevraagde pagina één zelfstandige responsive HTML5-pagina (embedded CSS, semantisch, mobile-first), (5) post de HTML als bijlage(n) + een korte samenvatting als comment op de ClickUp-taak hieronder.',
    '',
    'ClickUp-taak-ID (post hier het resultaat): ' + taskId,
    'Klant/bedrijf: ' + bedrijf,
    'Te bouwen pagina(s): ' + pages,
    'Discipline: ' + (disciplineOf(t) || 'webdesign'),
    'Projecttaak: ' + str(t.name),
    'Briefing/omschrijving uit de taak:',
    (str(t.description).trim() || '(geen omschrijving ingevuld, leid een plausibele invulling af uit de bedrijfsnaam, markeer aannames)'),
  ].join('\n');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'anthropic-beta': 'experimental-cc-routine-2026-04-01',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: briefing }),
    });
  } catch (e) { return { status: 200, body: { ok: false, error: 'fire_failed', message: 'De cloudroutine kon niet gestart worden, probeer zo opnieuw.' } }; }
  const data = await res.json().catch(() => null);
  if (!res.ok) return { status: 200, body: { ok: false, error: 'fire_http_' + res.status, message: 'Starten mislukt (' + res.status + '). Is de trigger-URL/token nog geldig?', detail: str(data && ((data.error && data.error.message) || data.message)) } };
  const sessionUrl = str(data && (data.claude_code_session_url || data.session_url));
  try { await cu.comment(env, taskId, '🤖 [V9-CLOUDPIJPLIJN GESTART]\n\nDe lichte V9-websitepijplijn draait nu op platform.claude. Het resultaat (HTML + keyword-onderzoek) verschijnt zo op deze taak.' + (sessionUrl ? ('\n\nLive volgen: ' + sessionUrl) : ''), false); } catch (e) { /* best-effort */ }
  return { status: 200, body: { ok: true, session_url: sessionUrl } };
}

/* ===========================================================================
 * CRM. OFFERTEAANVRAGEN + MEETINGS (team-brede monitoring, op de ClickUp-lijsten).
 * Offertes-lijst 901520180289, Meetings-lijst 901520180293. Meetings koppelen we aan
 * offertes via een eigen KV-link (team:meetlinks:v1). ClickUp heeft geen vast
 * offerte↔meeting-relatieveld. Beide gecachet (5 min) tegen ClickUp-rate-limits.
 * =========================================================================== */
const OFFERTES_CK = 'team:offertes:v1';
const MEETINGS_CK = 'team:meetings:v1';
const MEETLINKS_K = 'team:meetlinks:v1';
async function readMeetLinks(env) { try { const m = await env.KV.get(MEETLINKS_K, 'json'); return (m && typeof m === 'object') ? m : {}; } catch (e) { return {}; } }
export async function teamOffertes(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  if (!body.refresh) { try { const hit = await env.KV.get(OFFERTES_CK, 'json'); if (hit && Array.isArray(hit.items)) return { status: 200, body: { ok: true, items: hit.items, statussen: hit.statussen || [], cached: true } }; } catch (e) { /* */ } }
  const naamMap = await bedrijvenNaamMap(env);
  const [tasks, lr] = await Promise.all([
    pageAll(env, (p) => `/list/${LIST.offertes}/task?archived=false&include_closed=true&subtasks=false&order_by=created&reverse=true&page=${p}`, 8),
    cu.get(env, `/list/${LIST.offertes}`),
  ]);
  const statussen = (lr && lr.ok && lr.data && Array.isArray(lr.data.statuses)) ? lr.data.statuses.map((s) => ({ status: str(s.status), color: str(s.color), type: str(s.type) })).filter((s) => s.status) : [];
  // Contacten staan op het MODERNE 'Contactpersonen'-veld (list_relationship, MEERDERE) + het legacy 'Contact'-veld.
  // We lezen ze allebei (modern eerst), zodat de koppeling 1-op-1 uit ClickUp zichtbaar wordt.
  const offCids = (o) => { const out = [], seen = new Set(); for (const id of getRelationIds(o, FIELD.offerteContacten).concat(getRelationIds(o, FIELD.contact))) { if (id && !seen.has(id)) { seen.add(id); out.push(id); } } return out; };
  const offMids = (o) => { const out = [], seen = new Set(); for (const id of getRelationIds(o, FIELD.offerteMeetings).concat(getRelationIds(o, FIELD.meeting))) { if (id && !seen.has(id)) { seen.add(id); out.push(id); } } return out; };
  const allCids = new Set(); for (const o of tasks) offCids(o).forEach((id) => allCids.add(id));
  const cidArr = [...allCids].slice(0, 250);
  const cres = await Promise.all(cidArr.map((cid) => cu.get(env, `/task/${cid}`).catch(() => null)));
  const cmap = {}; cidArr.forEach((cid, i) => { const cr = cres[i]; if (cr && cr.ok && cr.data) { const vn = str(getCF(cr.data, FIELD.voornaam)), an = str(getCF(cr.data, FIELD.achternaam)); cmap[cid] = ((vn + ' ' + an).trim() || str(cr.data.name)); } });
  const items = tasks.map((o) => {
    const bid = getRelationIds(o, FIELD.bedrijf)[0] || getRelationIds(o, FIELD.offertes)[0] || '';
    const cidList = offCids(o);
    const contacten = cidList.map((id) => ({ id, naam: cmap[id] || '' })).filter((c) => c.id);
    const ass = Array.isArray(o.assignees) ? o.assignees : [];
    return {
      id: str(o.id), naam: str(o.name), status: statusMapper(o.status), status_raw: str(o.status && o.status.status), status_color: str(o.status && o.status.color), status_type: str(o.status && o.status.type),
      bedrijf: naamMap[bid] || str(getCF(o, FIELD.offerteBedrijfsnaam)) || '', bedrijf_id: bid,
      contact: contacten[0] ? contacten[0].naam : '', contact_id: contacten[0] ? contacten[0].id : '',
      contacten: contacten, contact_ids: cidList, meeting_ids: offMids(o),
      assignee_ids: ass.map((a) => Number(a.id)), assignees: ass.map((a) => ({ i: str(a.initials || (a.username || '').slice(0, 2)).slice(0, 3).toUpperCase(), c: str(a.color || '') })).slice(0, 3),
      pandadoc_link: str(getCF(o, FIELD.offerteLink)), pandadoc_id: str(getCF(o, FIELD.offertePandadocId)),
      budget: str(getCF(o, FIELD.offerteBudget)), vervaldatum: str(getCF(o, FIELD.offerteVervaldatum)),
      extra: str(o.description || '').slice(0, 4000), datum: Number(o.date_created) || 0, url: str(o.url),
    };
  });
  // FALLBACK: offertes zonder eigen contact → toon de contactpersonen van het gekoppelde BEDRIJF (gemarkeerd 'via bedrijf').
  const needB = [...new Set(items.filter((it) => !it.contacten.length && it.bedrijf_id).map((it) => it.bedrijf_id))].slice(0, 120);
  if (needB.length) {
    const bres = await Promise.all(needB.map((b) => cu.get(env, `/task/${b}`).catch(() => null)));
    const bContacts = {}; const extraCids = new Set();
    needB.forEach((b, i) => { const br = bres[i]; if (br && br.ok && br.data) { const ids = getRelationIds(br.data, FIELD.contact); bContacts[b] = ids; ids.forEach((id) => { if (!(id in cmap)) extraCids.add(id); }); } });
    const extraArr = [...extraCids].slice(0, 200);
    const eres = await Promise.all(extraArr.map((cid) => cu.get(env, `/task/${cid}`).catch(() => null)));
    extraArr.forEach((cid, i) => { const cr = eres[i]; if (cr && cr.ok && cr.data) { const vn = str(getCF(cr.data, FIELD.voornaam)), an = str(getCF(cr.data, FIELD.achternaam)); cmap[cid] = ((vn + ' ' + an).trim() || str(cr.data.name)); } });
    for (const it of items) {
      if (!it.contacten.length && bContacts[it.bedrijf_id] && bContacts[it.bedrijf_id].length) {
        it.contacten = bContacts[it.bedrijf_id].map((id) => ({ id, naam: cmap[id] || '', via_bedrijf: true }));
        it.contact = it.contacten[0] ? it.contacten[0].naam : ''; it.contact_id = it.contacten[0] ? it.contacten[0].id : '';
      }
    }
  }
  try { await env.KV.put(OFFERTES_CK, JSON.stringify({ _t: Date.now(), items, statussen }), { expirationTtl: 300 }); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, items, statussen } };
}
const MEETING_TYPE_LABELS = ['SALES', 'PROJECT'];
export async function teamMeetings(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const links = await readMeetLinks(env);
  if (!body.refresh) { try { const hit = await env.KV.get(MEETINGS_CK, 'json'); if (hit && Array.isArray(hit.items)) return { status: 200, body: { ok: true, items: hit.items, cached: true } }; } catch (e) { /* */ } }
  const naamMap = await bedrijvenNaamMap(env);
  const tasks = await pageAll(env, (p) => `/list/${LIST.meetings}/task?archived=false&include_closed=true&subtasks=false&order_by=due_date&reverse=true&page=${p}`, 8);
  // contacten staan (net als bij offertes) op het MODERNE 'Contactpersonen'-veld + legacy 'Contact'.
  const mCids = (t) => { const out = [], seen = new Set(); for (const id of getRelationIds(t, FIELD.meetingContacten).concat(getRelationIds(t, FIELD.contact))) { if (id && !seen.has(id)) { seen.add(id); out.push(id); } } return out; };
  const allCids = new Set(); for (const t of tasks) mCids(t).forEach((id) => allCids.add(id));
  const cidArr = [...allCids].slice(0, 250);
  const cres = await Promise.all(cidArr.map((c) => cu.get(env, `/task/${c}`).catch(() => null)));
  const cmap = {}; cidArr.forEach((c, i) => { const cr = cres[i]; if (cr && cr.ok && cr.data) { const vn = str(getCF(cr.data, FIELD.voornaam)), an = str(getCF(cr.data, FIELD.achternaam)); cmap[c] = ((vn + ' ' + an).trim() || str(cr.data.name)); } });
  const items = tasks.map((t) => {
    const bid = getRelationIds(t, FIELD.meetingBedrijven)[0] || getRelationIds(t, FIELD.bedrijf)[0] || '';
    const cidList = mCids(t);
    const contacten = cidList.map((id) => ({ id, naam: cmap[id] || '' }));
    const offIds = getRelationIds(t, FIELD.offerteMeetings);   // op de meeting heet dit veld 'Offertes'
    const tv = getCF(t, FIELD.meetingType); const typeIdx = (tv === 0 || tv) ? Number(tv) : null;
    const ass = Array.isArray(t.assignees) ? t.assignees : [];
    return {
      id: str(t.id), titel: str(t.name), status: statusMapper(t.status), status_raw: str(t.status && t.status.status), status_color: str(t.status && t.status.color),
      datum: Number(t.due_date) || Number(t.start_date) || 0,
      type: (typeIdx != null && !isNaN(typeIdx)) ? (MEETING_TYPE_LABELS[typeIdx] || '') : '',
      bedrijf: naamMap[bid] || '', bedrijf_id: bid,
      contact: contacten[0] ? contacten[0].naam : '', contact_id: contacten[0] ? contacten[0].id : '', contacten: contacten, contact_ids: cidList,
      offerte_id: offIds[0] || str(links[str(t.id)] || ''), offerte_ids: offIds,
      fireflies: str(getCF(t, FIELD.firefliesUrl)),
      assignees: ass.map((a) => ({ i: str(a.initials || (a.username || '').slice(0, 2)).slice(0, 3).toUpperCase(), c: str(a.color || '') })).slice(0, 3),
      extra: str(t.description || '').slice(0, 8000), url: str(t.url),
    };
  });
  try { await env.KV.put(MEETINGS_CK, JSON.stringify({ _t: Date.now(), items }), { expirationTtl: 300 }); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, items } };
}
// teamMeetingKoppel: koppel/ontkoppel bedrijf/contact/offerte op een MEETING (moderne list_relationship-velden) → sync ClickUp.
export async function teamMeetingKoppel(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const mid = cleanTaskId(body.meeting_id); if (!mid) return { status: 400, body: { ok: false, error: 'no_meeting' } };
  const target = cleanTaskId(body.target_id); if (!target) return { status: 400, body: { ok: false, error: 'no_target' } };
  const kind = str(body.kind); const action = str(body.action) === 'rem' ? 'rem' : 'add';
  const fieldId = kind === 'bedrijf' ? FIELD.meetingBedrijven : kind === 'contact' ? FIELD.meetingContacten : kind === 'offerte' ? FIELD.offerteMeetings : '';
  if (!fieldId) return { status: 400, body: { ok: false, error: 'bad_kind' } };
  const r = await cu.relation(env, mid, fieldId, action === 'add' ? { add: [target] } : { rem: [target] });
  if (!r || !r.ok) return { status: 200, body: { ok: false, error: 'koppel_fout', message: 'ClickUp weigerde de koppeling.' } };
  try { await env.KV.delete(MEETINGS_CK); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, kind, action, target_id: target } };
}
export async function teamMeetingLink(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const mid = cleanTaskId(body.meeting_id); if (!mid) return { status: 400, body: { ok: false, error: 'no_meeting' } };
  const oid = cleanTaskId(body.offerte_id);
  const links = await readMeetLinks(env);
  if (oid) links[mid] = oid; else delete links[mid];
  try { await env.KV.put(MEETLINKS_K, JSON.stringify(links)); } catch (e) { return { status: 502, body: { ok: false } }; }
  return { status: 200, body: { ok: true, offerte_id: oid } };
}
export async function teamMeetingExtra(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const mid = cleanTaskId(body.meeting_id); if (!mid) return { status: 400, body: { ok: false, error: 'no_meeting' } };
  const extra = str(body.extra || '').slice(0, 20000);
  const r = await cu.put(env, `/task/${mid}`, { description: extra });
  if (!r.ok) return { status: 200, body: { ok: false, error: 'update_failed' } };
  try { await env.KV.delete(MEETINGS_CK); } catch (e) { /* */ }   // cache verversen
  return { status: 200, body: { ok: true } };
}
// teamKoppelSearch: doorzoekbare picker voor bedrijf/contact/offerte/meeting (id+naam), 5min KV-cache.
export async function teamKoppelSearch(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const kind = str(body.kind); const q = str(body.q || '').toLowerCase().trim();
  const listId = kind === 'contact' ? LIST.contactpersonen : kind === 'offerte' ? LIST.offertes : kind === 'bedrijf' ? LIST.bedrijven : kind === 'meeting' ? LIST.meetings : '';
  if (!listId) return { status: 400, body: { ok: false, error: 'bad_kind' } };
  const ck = 'team:koppel:' + kind + ':v1';
  let all = null; try { const hit = await env.KV.get(ck, 'json'); if (hit && Array.isArray(hit)) all = hit; } catch (e) { /* */ }
  if (!all) {
    const tasks = await pageAll(env, (p) => `/list/${listId}/task?archived=false&include_closed=true&subtasks=false&order_by=created&reverse=true&page=${p}`, 10);
    all = tasks.map((t) => {
      let naam = str(t.name), sub = '';
      if (kind === 'contact') { const vn = str(getCF(t, FIELD.voornaam)), an = str(getCF(t, FIELD.achternaam)); const full = (vn + ' ' + an).trim(); if (full) naam = full; sub = str(getCF(t, FIELD.email)); }
      else if (kind === 'meeting') { const dd = Number(t.due_date) || Number(t.start_date) || 0; sub = dd ? msToBrusselsYmd(dd) : ''; }
      return { id: str(t.id), naam, sub };
    });
    try { await env.KV.put(ck, JSON.stringify(all), { expirationTtl: 300 }); } catch (e) { /* */ }
  }
  let res = all;
  if (q) res = all.filter((x) => (x.naam + ' ' + (x.sub || '')).toLowerCase().indexOf(q) >= 0);
  return { status: 200, body: { ok: true, kind, items: res.slice(0, 40) } };
}
// teamOfferteKoppel: koppel/ontkoppel bedrijf/contact/meeting op een OFFERTE (moderne list_relationship-velden) → sync ClickUp.
export async function teamOfferteKoppel(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const oid = cleanTaskId(body.offerte_id); if (!oid) return { status: 400, body: { ok: false, error: 'no_offerte' } };
  const target = cleanTaskId(body.target_id); if (!target) return { status: 400, body: { ok: false, error: 'no_target' } };
  const kind = str(body.kind); const action = str(body.action) === 'rem' ? 'rem' : 'add';
  const fieldId = kind === 'contact' ? FIELD.offerteContacten : kind === 'meeting' ? FIELD.offerteMeetings : kind === 'bedrijf' ? FIELD.bedrijf : '';
  if (!fieldId) return { status: 400, body: { ok: false, error: 'bad_kind' } };
  const r = await cu.relation(env, oid, fieldId, action === 'add' ? { add: [target] } : { rem: [target] });
  if (!r || !r.ok) return { status: 200, body: { ok: false, error: 'koppel_fout', message: 'ClickUp weigerde de koppeling.' } };
  try { await env.KV.delete(OFFERTES_CK); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, kind, action, target_id: target } };
}
// teamOfferteMail (cluster 1): AI-opvolgmail naar het offerte-contact. preview|send via Gmail.
export async function teamOfferteMail(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const taskId = cleanTaskId(body.task_id); if (!taskId) return { status: 400, body: { ok: false, error: 'no_task' } };
  const tr = await cu.get(env, `/task/${taskId}`); if (!tr.ok || !tr.data) return { status: 200, body: { ok: false, error: 'not_found' } };
  const o = tr.data; const naam = str(o.name);
  const naamMap = await bedrijvenNaamMap(env);
  const bid = getRelationIds(o, FIELD.bedrijf)[0] || ''; const bedrijf = naamMap[bid] || str(getCF(o, FIELD.offerteBedrijfsnaam));
  const cid = getRelationIds(o, FIELD.offerteContacten)[0] || getRelationIds(o, FIELD.contact)[0] || '';
  let email = '', voornaam = '';
  if (cid) { try { const cr = await cu.get(env, `/task/${cid}`); if (cr.ok && cr.data) { email = str(getCF(cr.data, FIELD.email)); voornaam = str(getCF(cr.data, FIELD.voornaam)) || str(cr.data.name).split(' ')[0]; } } catch (e) { /* */ } }
  const onderwerp = 'Opvolging van je offerte (Studio 27)';
  const action = (str(body.action) === 'send') ? 'send' : 'preview';
  let tekst = str(body.tekst || '').trim();
  if (!tekst) {
    const sys = 'Schrijf een korte, vriendelijke opvolg-mail namens Studio 27 over een eerder uitgebrachte offerte. Persoonlijke, warme tone of voice (geen kil sjabloon). Vraag vrijblijvend of er nog vragen zijn en of we de offerte samen even kunnen doornemen of inplannen. Kort. Geef ENKEL de mailtekst, met aanhef ("Dag <voornaam>,") en afsluiting ("Met vriendelijke groet,\\nHet team van Studio 27"). Schrijf in vlot Nederlands (Vlaams). Geen onderwerpregel.';
    const user = 'Offerte: ' + (naam || 'onze offerte') + (bedrijf ? (' voor ' + bedrijf) : '') + '.\nVoornaam contact: ' + (voornaam || 'daar') + '.';
    const res = await aiComplete(env, AI_MODEL, sys, user, 500, { skill: 'offerte:mail' });
    if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: str((res && res.err) || 'ai_fout') } };
    tekst = str(res.text).trim();
  }
  if (action === 'preview') return { status: 200, body: { ok: true, tekst, email, onderwerp } };
  if (!email) return { status: 200, body: { ok: false, error: 'geen_email', message: 'Geen e-mailadres bij het contact van deze offerte.' } };
  const r = await sendGmail(env, { to: email, subject: onderwerp, body: tekst, fromName: 'Studio 27', replyTo: 'marketing@studio27.be' });
  if (!r.ok) return { status: 200, body: { ok: false, error: 'mail_failed' } };
  try { await cu.comment(env, taskId, '✉️ [OPVOLG-MAIL VERZONDEN]\nNaar: ' + email + '\n\n' + tekst, false); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, sent: true } };
}

/* ===========================================================================
 * AI-KOSTENMONITOR — admin-dashboard (enkel de zaakvoerder).
 * teamAiCosts: aggregeert het AI-verbruik (Claude/ChatGPT/Gemini/Whisper) over
 * een periode met filters (platform/provider/model/skill/bedrijf/teamlid) →
 * KPI's, tijdreeks en breakdowns voor het dashboard. teamAiCostsSeed/Wipe:
 * voorbeelddata aan/uit (eerste-aanzet-demonstratie). teamAiPricing: tarieven
 * bekijken/aanpassen zonder redeploy.
 * =========================================================================== */
export async function teamAiCosts(_b, body, env, ctx) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder ziet het AI-kostenoverzicht.' } };
  let data;
  try {
    data = await aiCostsAggregate(env, {
      from: str(body.from), to: str(body.to),
      platform: str(body.platform), provider: str(body.provider), model: str(body.model),
      skill: str(body.skill), bedrijf: str(body.bedrijf), member: str(body.member),
      hide_demo: !!body.hide_demo, topN: Number(body.topN) || 12,
    });
  } catch (e) { return { status: 200, body: { ok: false, error: 'aggregatie_fout' } }; }
  // teamleden-namen meegeven zodat het dashboard id→naam kan tonen in de filter
  let roster = [];
  try { roster = rosterFrom(rr.leden).map((m) => ({ id: str(m.id), naam: str(m.naam) })); } catch (e) { /* */ }
  let pricing = null; try { pricing = await aiPricing(env); } catch (e) { /* */ }
  return { status: 200, body: Object.assign({ ok: true, is_admin: true, roster, pricing }, data) };
}
export async function teamAiCostsSeed(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  try { const r = await aiCostsSeedDemo(env); return { status: 200, body: Object.assign({ ok: true }, r) }; }
  catch (e) { return { status: 200, body: { ok: false, error: 'seed_fout' } }; }
}
export async function teamAiCostsWipe(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  try { const r = await aiCostsWipeDemo(env); return { status: 200, body: Object.assign({ ok: true }, r) }; }
  catch (e) { return { status: 200, body: { ok: false, error: 'wipe_fout' } }; }
}
export async function teamAiPricing(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (body.save && typeof body.save === 'object') {
    try { const saved = await aiPricingSave(env, body.save); return { status: 200, body: { ok: true, pricing: saved } }; }
    catch (e) { return { status: 200, body: { ok: false, error: 'save_fout' } }; }
  }
  let pricing = null; try { pricing = await aiPricing(env); } catch (e) { pricing = PRICING_DEFAULT; }
  return { status: 200, body: { ok: true, pricing, defaults: PRICING_DEFAULT } };
}
// teamAiBilling: ECHTE provider-facturatie (Anthropic + OpenAI admin-API's) + reconciliatie
// met onze eigen meting over dezelfde periode. Admin-only; fail-soft zonder admin-keys.
export async function teamAiBilling(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!rr.real_admin) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Alleen de zaakvoerder ziet de facturatie.' } };
  let billing, ours = null;
  try { billing = await aiBillingFetch(env, { from: str(body.from), to: str(body.to) }); }
  catch (e) { return { status: 200, body: { ok: false, error: 'billing_fout' } }; }
  // onze eigen schatting over hetzelfde bereik, voor de reconciliatie-vergelijking
  try { const agg = await aiCostsAggregate(env, { from: billing.range.from, to: billing.range.to, hide_demo: true }); ours = { cost_eur: agg.totals.cost, byProvider: agg.byProvider }; } catch (e) { /* */ }
  return { status: 200, body: Object.assign({ ok: true, is_admin: true, ours }, billing) };
}

/* ===========================================================================
 * ONBOARDING (HR Fase 5) — nieuwe-collega-lijst + checklist-state (KV).
 * Admin-only (zoals teamSollicitaties). Geen ClickUp/Make/AI: de lijst komt uit
 * KV 'team:onboarding:people' (met ingebouwde default zodat het scherm altijd
 * werkt), de afvink-/cadeau-status uit één workspace-brede map in KV
 * 'team:onboarding:done' ({ '<personId>:<key>': true }).
 * =========================================================================== */
const OB_PEOPLE_CK = 'team:onboarding:people';
const OB_DONE_CK = 'team:onboarding:done';
const OB_DEFAULT_PEOPLE = [
  { id: 'p1', name: 'Jens De Backer', role: 'Account Manager Vlaanderen', dept: 'Sales', start: 'ma 1 jul', buddy: 'Ilke Meeusen' },
  { id: 'p2', name: 'Karim Belkaïd', role: 'Field Service Technicus', dept: 'Field Service', start: 'ma 7 jul', buddy: 'Klaas Govaerts' },
  { id: 'p3', name: 'Sofie Maes', role: 'Senior Software Engineer', dept: 'Tech', start: 'di 15 jul', buddy: 'Vincent Verleije' },
];
function obPersonShape(p) {
  return { id: str(p.id), name: str(p.name), role: str(p.role), dept: str(p.dept), start: str(p.start), buddy: str(p.buddy) };
}
export async function teamOnboardingPeople(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Onboarding is enkel voor de zaakvoerder.' } };
  if (env.HRDB) return { status: 200, body: { ok: true, people: await obListPeople(env) } };   // D1 = bron
  let people = null;
  try { const hit = await env.KV.get(OB_PEOPLE_CK, 'json'); if (Array.isArray(hit) && hit.length) people = hit.map(obPersonShape).filter((p) => p.id && p.name); } catch (e) { /* miss */ }
  if (!people || !people.length) people = OB_DEFAULT_PEOPLE.map(obPersonShape);
  return { status: 200, body: { ok: true, people } };
}
const OB_KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;
export async function teamOnboardingState(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body);
  if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (env.HRDB) {
    if (body && body.get) return { status: 200, body: { ok: true, done: await obGetDone(env) } };
    const pid = str(body && body.person_id).trim(), key = str(body && body.key).trim();
    if (!pid || !key || !OB_KEY_RE.test(pid) || !OB_KEY_RE.test(key)) return { status: 400, body: { ok: false, error: 'bad_key' } };
    await obSetDone(env, pid, key, !!body.done);
    return { status: 200, body: { ok: true, done: await obGetDone(env) } };
  }
  let map = {};
  try { const hit = await env.KV.get(OB_DONE_CK, 'json'); if (hit && typeof hit === 'object') map = hit; } catch (e) { /* miss → leeg */ }
  if (body && body.get) return { status: 200, body: { ok: true, done: map } };
  const pid = str(body && body.person_id).trim();
  const key = str(body && body.key).trim();
  if (!pid || !key || !OB_KEY_RE.test(pid) || !OB_KEY_RE.test(key)) return { status: 400, body: { ok: false, error: 'bad_key' } };
  const mk = pid + ':' + key;
  if (body.done) map[mk] = true; else delete map[mk];
  try { await env.KV.put(OB_DONE_CK, JSON.stringify(map)); } catch (e) { return { status: 200, body: { ok: false, error: 'kv_fout' } }; }
  return { status: 200, body: { ok: true, done: map } };
}
// teamOnboardingPersonSave: nieuwe collega toevoegen (geen id) of bestaande bewerken (met id).
export async function teamOnboardingPersonSave(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (!env.HRDB) return { status: 200, body: { ok: false, error: 'no_d1' } };
  const id = str(body.id).trim();
  const fields = { name: str(body.name).slice(0, 120), role: str(body.role).slice(0, 120), dept: str(body.dept).slice(0, 80), start: str(body.start).slice(0, 40), buddy: str(body.buddy).slice(0, 120) };
  if (id) { await obUpdatePerson(env, id, fields); return { status: 200, body: { ok: true, id } }; }
  if (!fields.name.trim()) return { status: 400, body: { ok: false, error: 'geen_naam' } };
  const newId = await obUpsertPerson(env, fields);
  return { status: 200, body: { ok: true, id: newId } };
}
export async function teamOnboardingPersonRemove(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (!env.HRDB) return { status: 200, body: { ok: false, error: 'no_d1' } };
  const id = str(body.id).trim(); if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  await obRemovePerson(env, id);
  return { status: 200, body: { ok: true } };
}

// teamHrIntegrations (HR Fase 6): read-only status van de gekoppelde kanalen/tools, AFGELEID uit
// de aanwezigheid van de env-secrets. Geeft NOOIT een secret-waarde terug, enkel connected:bool.
export async function teamHrIntegrations(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const has = (k) => !!str(env[k]).trim();
  const WF = has('WEBFLOW_TOKEN'), META = has('META_SYSTEM_TOKEN'), G = has('SA_CLIENT_EMAIL') && has('SA_PRIVATE_KEY'), MC = has('METRICOOL_API_KEY') && has('METRICOOL_USER_ID');
  const integrations = [
    { id: 'linkedin', name: 'LinkedIn', cat: 'Jobboard', note: 'Vacatures + kandidaten', connected: WF, manage_url: 'https://www.linkedin.com/' },
    { id: 'indeed', name: 'Indeed', cat: 'Jobboard', note: 'Automatisch posten', connected: WF, manage_url: '' },
    { id: 'vdab', name: 'VDAB', cat: 'Jobboard', note: 'Vlaamse arbeidsmarkt', connected: WF, manage_url: '' },
    { id: 'jobat', name: 'Jobat / StepStone', cat: 'Jobboard', note: 'Premium jobboard', connected: false, manage_url: '' },
    { id: 'social', name: 'Facebook & Instagram', cat: 'Social', note: 'Meta Business', connected: META, manage_url: 'https://business.facebook.com/' },
    { id: 'website', name: 'Eigen website', cat: 'Kanaal', note: 'studio27.be/vacatures', connected: WF, manage_url: 'https://www.studio27.be/vacatures' },
    { id: 'gmail', name: 'Mailbox', cat: 'Communicatie', note: 'Mailverkeer in het portaal (versturen live; inkomend lezen vereist de gmail.readonly-scope)', connected: G, manage_url: '' },
    { id: 'gcal', name: 'Google Calendar', cat: 'Agenda', note: 'Gesprekken plannen', connected: G, manage_url: '' },
    { id: 'metricool', name: 'Metricool', cat: 'Social', note: 'Social plannen', connected: MC, manage_url: 'https://metricool.com/' },
    { id: 'database', name: 'Kandidatendatabase', cat: 'Data', note: 'Cloudflare D1', connected: !!env.HRDB, manage_url: '' },
    { id: 'anthropic', name: 'Claude (AI)', cat: 'AI', note: 'Screening & teksten', connected: has('ANTHROPIC_API_KEY'), manage_url: '' },
  ];
  return { status: 200, body: { ok: true, integrations, connectedCount: integrations.filter((d) => d.connected).length } };
}

/* ===========================================================================
 * AUTOMATISATIE-MONITORING (portaal #4) — actieve health-checks van elke
 * connectie (ClickUp/Webflow/Meta/Google/Metricool/Claude/Firebase). Pingt
 * elke connectie ECHT aan (lichte API-call), meet latency, slaat de laatste
 * stand + historiek op in KV, en laat een AI de status duiden. Admin-only.
 * =========================================================================== */
const MON_CK = 'monitor:health:v1';
const MON_HIST = 'monitor:hist:v1';
async function monPing(url, opts, ms) {
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const t = ctrl ? setTimeout(() => ctrl.abort(), ms || 8000) : null;
  try { return await fetch(url, Object.assign({ signal: ctrl ? ctrl.signal : undefined }, opts || {})); }
  finally { if (t) clearTimeout(t); }
}
function monChecks(env) {
  const has = (k) => !!str(env[k]).trim();
  return [
    { id: 'clickup', name: 'ClickUp', cat: 'Taken & CRM', secret: has('CLICKUP_TOKEN'), run: async () => { const r = await monPing('https://api.clickup.com/api/v2/user', { headers: { Authorization: str(env.CLICKUP_TOKEN) } }); return { ok: r.ok, http: r.status }; } },
    { id: 'webflow', name: 'Webflow', cat: 'Website & vacatures', secret: has('WEBFLOW_TOKEN'), run: async () => { const r = await monPing('https://api.webflow.com/v2/token/authorized_by', { headers: { Authorization: 'Bearer ' + str(env.WEBFLOW_TOKEN) } }); return { ok: r.ok, http: r.status }; } },
    { id: 'meta', name: 'Meta (Facebook/Instagram)', cat: 'Advertenties', secret: has('META_SYSTEM_TOKEN'), run: async () => { const r = await monPing('https://graph.facebook.com/v21.0/me?fields=id&access_token=' + encodeURIComponent(str(env.META_SYSTEM_TOKEN))); const d = await r.json().catch(() => null); return { ok: r.ok && d && !d.error, http: r.status, detail: (d && d.error) ? str(d.error.message) : '' }; } },
    { id: 'google', name: 'Google (Gmail/Agenda/GA4)', cat: 'Google-werkruimte', secret: has('SA_CLIENT_EMAIL') && has('SA_PRIVATE_KEY'), run: async () => { const tok = await mintGoogleToken(env, 'marketing@studio27.be', 'https://www.googleapis.com/auth/analytics.readonly'); return { ok: !!tok, http: tok ? 200 : 0, detail: tok ? '' : 'token-mint mislukt' }; } },
    { id: 'metricool', name: 'Metricool', cat: 'Social planning', secret: has('METRICOOL_API_KEY'), run: async () => { if (!str(env.METRICOOL_USER_ID).trim()) return { ok: true, http: 0, detail: 'API-sleutel gekoppeld · per-klant-blogId' }; const r = await monPing('https://app.metricool.com/api/admin/simpleProfiles?userId=' + encodeURIComponent(str(env.METRICOOL_USER_ID)) + '&userToken=' + encodeURIComponent(str(env.METRICOOL_API_KEY))); return { ok: r.ok, http: r.status }; } },
    { id: 'anthropic', name: 'Claude (AI)', cat: 'AI-engine', secret: has('ANTHROPIC_API_KEY'), run: async () => { const r = await monPing('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': str(env.ANTHROPIC_API_KEY), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: AI_MODEL, max_tokens: 1, messages: [{ role: 'user', content: 'ok' }] }) }, 12000); return { ok: r.ok, http: r.status }; } },
    { id: 'firebase', name: 'Firebase Auth (login)', cat: 'Authenticatie', secret: true, run: async () => { const r = await monPing('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'); return { ok: r.ok, http: r.status }; } },
  ];
}
export async function runHealthChecks(env) {
  const defs = monChecks(env);
  const items = await Promise.all(defs.map(async (c) => {
    if (!c.secret) return { id: c.id, name: c.name, cat: c.cat, status: 'unknown', http: 0, detail: 'niet geconfigureerd', latency_ms: 0 };
    const t0 = Date.now();
    try { const r = await c.run(); const lat = Date.now() - t0; const st = r.ok ? (lat > 5000 ? 'degraded' : 'ok') : 'down'; return { id: c.id, name: c.name, cat: c.cat, status: st, http: r.http || 0, detail: str(r.detail || ''), latency_ms: lat }; }
    catch (e) { return { id: c.id, name: c.name, cat: c.cat, status: (e && e.name === 'AbortError') ? 'timeout' : 'down', http: 0, detail: str(e && e.message).slice(0, 140), latency_ms: Date.now() - t0 }; }
  }));
  const snap = { checked_at: Date.now(), items };
  try { await env.KV.put(MON_CK, JSON.stringify(snap)); } catch (e) { /* */ }
  try { let hist = (await env.KV.get(MON_HIST, 'json')) || []; if (!Array.isArray(hist)) hist = []; const cnt = (s) => items.filter((i) => i.status === s).length; hist.push({ t: snap.checked_at, ok: cnt('ok'), down: cnt('down') + cnt('timeout'), degraded: cnt('degraded'), unknown: cnt('unknown') }); hist = hist.slice(-48); await env.KV.put(MON_HIST, JSON.stringify(hist)); } catch (e) { /* */ }
  return snap;
}
async function monAiSummary(env, snap) {
  const sys = 'Je bent de automatisatie-bewaker van Studio 27. Vat de status van de connecties kort samen in het Nederlands (max 3 zinnen): draait alles, of is er een probleem? Bij een probleem: noem de connectie + 1 concrete actie om het op te lossen. Direct en menselijk, geen opsmuk.';
  const user = 'Connecties:\n' + snap.items.map((i) => '- ' + i.name + ': ' + i.status + (i.detail ? ' (' + i.detail + ')' : '') + ' [' + i.latency_ms + 'ms]').join('\n');
  const res = await aiComplete(env, AI_MODEL, sys, user, 300, { skill: 'monitor:summary' });
  const down = snap.items.filter((i) => i.status === 'down' || i.status === 'timeout').length;
  return (res && res.text) ? str(res.text).trim() : (down ? down + ' connectie(s) reageren niet.' : 'Alle connecties draaien normaal.');
}
export async function teamMonitorStatus(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Monitoring is enkel voor de zaakvoerder.' } };
  let snap = null; try { snap = await env.KV.get(MON_CK, 'json'); } catch (e) { /* */ }
  if (!snap || !snap.items || (Date.now() - (snap.checked_at || 0)) > 3600000) snap = await runHealthChecks(env);
  let hist = []; try { hist = (await env.KV.get(MON_HIST, 'json')) || []; } catch (e) { /* */ }
  return { status: 200, body: { ok: true, checked_at: snap.checked_at, items: snap.items, history: Array.isArray(hist) ? hist : [] } };
}
export async function teamMonitorRecheck(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const snap = await runHealthChecks(env);
  return { status: 200, body: { ok: true, checked_at: snap.checked_at, items: snap.items } };
}
export async function teamMonitorAi(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  let snap = null; try { snap = await env.KV.get(MON_CK, 'json'); } catch (e) { /* */ }
  if (!snap || !snap.items) snap = await runHealthChecks(env);
  return { status: 200, body: { ok: true, tekst: await monAiSummary(env, snap) } };
}

/* ===========================================================================
 * AI-ASSISTENT (HR) — chat met toegang tot de VOLLEDIGE D1-database + CV-teksten.
 * Kies vrij het model (Claude/Gemini/GPT). CV's worden eenmalig naar tekst
 * geëxtraheerd (Claude leest het PDF) en in D1 bewaard (cv_text), zodat je
 * rechtstreeks vragen over iemands CV kan stellen. Admin-only.
 * =========================================================================== */
// Tone of voice van Vincent — wordt achter ELKE HR-tekst/mail/prompt gezet. Bewerkbaar
// op de Instellingen-pagina (KV team:hr:tone:v1 = { tone, extra }).
const DEFAULT_TONE = 'Je schrijft in de stem van Vincent, zaakvoerder van Studio 27 (een jong, creatief Vlaams marketing- en communicatiebureau).\n' +
  '• Toon: warm, persoonlijk en oprecht, met een lichte positieve energie. Professioneel maar nooit stijf; een tikje luchtig mag.\n' +
  '• Aanspreking: tutoyeren (je/jij). Open vlot en menselijk, bijvoorbeeld "Hey [voornaam],".\n' +
  '• Schrijfwijze: kort, helder en concreet. Geen omhaal, geen jargon, geen holle marketingtaal. Kom snel tot de kern en bied waar nuttig een duidelijke volgende stap of concrete opties aan (bv. een paar voorstellen voor een gesprek).\n' +
  '• Ook bij minder leuk nieuws (zoals een afwijzing) blijf je respectvol, eerlijk en waarderend, en geef je waar mogelijk een korte bruikbare reden of tip.\n' +
  '• Leestekens: gebruik gewone leestekens (punt, komma). Gebruik NOOIT en-dashes of em-dashes; die voelen onpersoonlijk en AI-achtig. Splits zinnen met een punt of komma.\n' +
  '• Afsluiting: informeel met "Groetjes, Vincent" voor gewone mails, "Met vriendelijke groet, Vincent" voor formelere.\n' +
  '• Vermijd cliches, overdreven enthousiasme en emoji-overdaad (een enkele subtiele emoji mag, spaarzaam). Klink als een echte, betrokken zaakvoerder die mensen serieus neemt.';
async function hrTone(env) {
  let t = { tone: DEFAULT_TONE, extra: '' };
  try { const h = await env.KV.get('team:hr:tone:v1', 'json'); if (h && typeof h === 'object' && str(h.tone).trim()) t = { tone: str(h.tone), extra: str(h.extra) }; } catch (e) { /* */ }
  return t;
}
function toneBlock(t) { return '\n\n=== SCHRIJFSTIJL (tone of voice van Vincent, volg dit strikt in ELKE tekst en mail) ===\n' + t.tone + (t.extra && t.extra.trim() ? '\n\nExtra richtlijn van Vincent:\n' + t.extra : ''); }
export async function teamHrTone(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'Enkel de zaakvoerder.' } };
  if (body && body.save) {
    const t = { tone: str(body.tone).slice(0, 4000), extra: str(body.extra).slice(0, 2000) };
    try { await env.KV.put('team:hr:tone:v1', JSON.stringify(t)); } catch (e) { return { status: 200, body: { ok: false, error: 'kv_fout' } }; }
    return { status: 200, body: { ok: true, tone: t.tone, extra: t.extra } };
  }
  const t = await hrTone(env);
  return { status: 200, body: { ok: true, tone: t.tone, extra: t.extra, standaard: DEFAULT_TONE } };
}

async function claudeExtractCvText(env, b64, mediaType) {
  const key = str(env.ANTHROPIC_API_KEY); if (!key || !b64) return '';
  const block = /pdf/i.test(mediaType) ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } } : { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: AI_MODEL, max_tokens: 2500, messages: [{ role: 'user', content: [block, { type: 'text', text: 'Geef de VOLLEDIGE platte tekst van dit CV terug: naam, contact, werkervaring (met jaren), opleiding, vaardigheden, talen. Enkel de tekst, geen commentaar.' }] }] }) });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d) return '';
    return (Array.isArray(d.content) && d.content[0]) ? str(d.content[0].text).trim() : '';
  } catch (e) { return ''; }
}
async function hrIngestCv(env, cand) {
  const url = str(cand.cv_url); if (!url || !/^https?:/i.test(url)) return false;
  if (typeof cvHostToegelaten === 'function' && !cvHostToegelaten(url)) return false;
  let b64 = '', mt = 'application/pdf';
  try {
    const fr = await fetch(url, { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(15000) : undefined });
    if (!fr.ok) return false;
    const ct = str(fr.headers.get('content-type') || '');
    if (/html|text\//i.test(ct)) return false;   // portfolio-pagina e.d. → geen leesbaar CV
    const buf = new Uint8Array(await fr.arrayBuffer());
    if (!buf.length || buf.length >= 9 * 1024 * 1024) return false;
    let bin = ''; const CH = 8192; for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
    b64 = btoa(bin);
    if (/image\//.test(ct)) mt = ct.split(';')[0].trim();
  } catch (e) { return false; }
  const text = await claudeExtractCvText(env, b64, mt);
  if (text && text.length > 40) { await hrSetCvText(env, cand.id, text); return true; }
  return false;
}
export async function hrIngestCvsBatch(env, limit) {
  if (!env.HRDB) return { ok: false };
  const cands = await hrList(env);
  const todo = cands.filter((c) => str(c.cv_url) && /^https?:/i.test(c.cv_url) && !str(c.cv_text).trim()).slice(0, limit || 6);
  let gelukt = 0;
  for (const c of todo) { try { if (await hrIngestCv(env, c)) gelukt++; else await hrSetCvText(env, c.id, '(CV niet automatisch leesbaar — open de cv-link)'); } catch (e) { /* */ } }
  return { ok: true, geprobeerd: todo.length, gelukt };
}
function hrAssistantContext(cands, onb) {
  const vis = cands.filter((c) => !c.spam);
  const byStatus = {}; vis.forEach((c) => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
  let s = 'KANDIDATENDATABASE: ' + vis.length + ' actieve kandidaten' + (cands.length - vis.length ? ' (+' + (cands.length - vis.length) + ' als spam gemarkeerd)' : '') + '. Statusverdeling: ' + Object.keys(byStatus).map((k) => k + '=' + byStatus[k]).join(', ') + '.\n\n';
  vis.forEach((c, i) => {
    s += (i + 1) + '. ' + c.naam + ' — ' + (c.vacature || 'geen functie') + ' | status: ' + c.status + (c.ai_score != null ? ' | AI-matchscore: ' + c.ai_score + '/100' : '') + '\n';
    s += '   contact: ' + (c.email || '-') + ' / ' + (c.telefoon || '-') + ' | bron: ' + (c.herkomst || '-') + ' | sollicitatiedatum: ' + (c.ts ? new Date(c.ts).toISOString().slice(0, 10) : '-') + '\n';
    const ai = c.ai || {};
    if (ai.samenvatting) s += '   AI-samenvatting: ' + str(ai.samenvatting).slice(0, 400) + '\n';
    if (ai.sterktes) s += '   Sterktes: ' + (Array.isArray(ai.sterktes) ? ai.sterktes.join('; ') : str(ai.sterktes)).slice(0, 300) + '\n';
    if (ai.aandachtspunten) s += '   Aandachtspunten: ' + (Array.isArray(ai.aandachtspunten) ? ai.aandachtspunten.join('; ') : str(ai.aandachtspunten)).slice(0, 300) + '\n';
    const cvt = str(c.cv_text).trim();
    if (cvt && !/niet automatisch leesbaar/.test(cvt)) s += '   CV-TEKST:\n   ' + cvt.slice(0, 1400).replace(/\n+/g, ' ') + '\n';
    else if (c.cv_url) s += '   CV-link (nog niet als tekst ingelezen): ' + c.cv_url + '\n';
    s += '\n';
  });
  if (onb && onb.length) { s += 'ONBOARDING (' + onb.length + ' nieuwe collega\'s): ' + onb.map((p) => p.name + ' (' + (p.role || '?') + (p.start ? ', start ' + p.start : '') + ')').join('; ') + '.\n'; }
  return s;
}
export async function teamHrModels(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const has = (k) => !!str(env[k]).trim();
  return { status: 200, body: { ok: true, standaard: AI_MODEL, models: AI_MODELS.map((m) => ({ id: m.id, naam: m.naam, provider: m.provider, available: has(m.env) })) } };
}
export async function teamHrAssistant(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (denyUnless(rr.perms, 'admin')) return { status: 403, body: { ok: false, error: 'forbidden_role', message: 'De AI-assistent is enkel voor de zaakvoerder.' } };
  let model = str(body.model); if (!AI_MODEL_IDS.has(model)) model = AI_MODEL;
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const vraag = str((msgs[msgs.length - 1] || {}).content).trim();
  if (!vraag) return { status: 400, body: { ok: false, error: 'geen_vraag' } };
  let cands = [], onb = [];
  try { cands = await hrList(env); } catch (e) { /* */ }
  try { onb = await obListPeople(env); } catch (e) { /* */ }
  const tone = await hrTone(env);
  const sys = 'Je bent de AI-assistent van het HR-portaal van Studio 27, een Vlaams marketing- en communicatiebureau. Je werkt voor Vincent (de zaakvoerder). Je hebt toegang tot de VOLLEDIGE kandidatendatabase en de CV-teksten (hieronder). Beantwoord concreet, eerlijk en in vlot Nederlands, uitsluitend op basis van de gegeven data. Verwijs naar kandidaten bij naam. Staat iets niet in de data, zeg dat eerlijk. Bondig tenzij om detail gevraagd.\n\n' +
    'ACTIES die je kan uitvoeren:\n' +
    '1. FASE WIJZIGEN: als Vincent vraagt om een kandidaat naar een andere fase te zetten, eindig je antwoord met EXACT deze regel (op een aparte laatste regel): <<SETFASE:Volledige Naam:fase>> met fase = nieuw, screening, gesprek, assessment, aanbod, aangenomen of afgewezen. Gebruik de exacte naam zoals in de data. Bevestig in gewone taal dat je het aanpast. Doe dit ENKEL bij een duidelijke vraag.\n' +
    '2. E-MAILS OPSTELLEN: als Vincent een mail vraagt (afwijzing, uitnodiging voor een gesprek/meeting, opvolging...), schrijf je de VOLLEDIGE mail uit in je antwoord, klaar om te kopieren. Verstuur zelf niets.\n' +
    'Schrijf elke mail en tekst strikt in onderstaande tone of voice.' + toneBlock(tone) +
    '\n\n=== DATA ===\n' + hrAssistantContext(cands, onb);
  const gesprek = msgs.slice(0, -1).map((m) => (m.role === 'assistant' ? 'Assistent: ' : 'Vincent: ') + str(m.content)).join('\n');
  const user = (gesprek ? 'Gesprek tot nu toe:\n' + gesprek + '\n\n' : '') + 'Vraag van Vincent: ' + vraag;
  const res = await aiComplete(env, model, sys, user, 1600, { platform: 'hr', skill: 'hr:assistent' });
  if (!res || res.err || !res.text) {
    let m2 = 'Er ging iets mis met het AI-model.';
    const e = str(res && res.err);
    if (/no_gemini_key/.test(e)) m2 = 'De Gemini-sleutel ontbreekt nog. Kies een Claude- of GPT-model.';
    else if (/no_openai_key/.test(e)) m2 = 'De OpenAI-sleutel ontbreekt nog. Kies een Claude- of Gemini-model.';
    else if (/no_anthropic_key/.test(e)) m2 = 'De Claude-sleutel ontbreekt nog.';
    else if (e) m2 = 'AI-fout: ' + e;
    return { status: 200, body: { ok: false, error: e || 'ai_fout', message: m2 } };
  }
  let antwoord = str(res.text).trim();
  let actie = null;
  const am = antwoord.match(/<<\s*SETFASE\s*:\s*([^:>]+?)\s*:\s*([a-zA-Z]+)\s*>>/);
  if (am) {
    antwoord = antwoord.replace(am[0], '').trim();
    const naam = str(am[1]).trim().toLowerCase(); const fase = str(am[2]).trim().toLowerCase();
    const geldig = ['nieuw', 'screening', 'gesprek', 'assessment', 'aanbod', 'aangenomen', 'afgewezen'];
    let target = cands.filter((c) => c.id === am[1].trim())[0] || cands.filter((c) => str(c.naam).toLowerCase() === naam)[0] || cands.filter((c) => str(c.naam).toLowerCase().indexOf(naam) >= 0)[0];
    if (target && geldig.indexOf(fase) >= 0) {
      try { const canon = await hrSetStatus(env, target.id, fase); if (canon === 'aangenomen') { try { const c2 = await hrGet(env, target.id); if (c2) await obAddFromCandidate(env, c2); } catch (e) { /* */ } } actie = { type: 'status', naam: target.naam, fase: canon }; antwoord += '\n\n✅ ' + target.naam + ' staat nu op fase "' + canon + '".'; }
      catch (e) { antwoord += '\n\n(De fase kon niet automatisch aangepast worden.)'; }
    }
  }
  return { status: 200, body: { ok: true, antwoord: antwoord, model, actie } };
}

export async function hrAssistantTest(env, vraag, model) {
  let m = str(model); if (!AI_MODEL_IDS.has(m)) m = AI_MODEL;
  const cands = await hrList(env); let onb = []; try { onb = await obListPeople(env); } catch (e) { /* */ }
  const sys = 'Je bent de AI-assistent van het HR-portaal van Studio 27. Antwoord concreet in het Nederlands, enkel op basis van de data.\n\n=== DATA ===\n' + hrAssistantContext(cands, onb);
  const res = await aiComplete(env, m, sys, 'Vraag van Vincent: ' + str(vraag), 1600, { platform: 'hr', skill: 'hr:assistent-test' });
  return { ok: !!(res && res.text), model: m, antwoord: str(res && res.text), err: str(res && res.err) };
}

/* ===========================================================================
 * UNIFORME AI-ASSISTENT (alle portalen). Per collega een PERSOONLIJKE assistent
 * met eigen chat-sessies + persoonlijk geheugen (KV, e-mail-gesleuteld), modelkeuze,
 * en de CONTEXT van het scherm/item waar de gebruiker naar kijkt. Voor ALLE staff.
 * Actie-modus genereert tekst (bv. afwijzingsmail) voor de actieknoppen.
 * KV: ai:chat:<email>:<sid> (sessie), ai:chatidx:<email> (lijst), ai:prof:<email> (geheugen).
 * =========================================================================== */
const AI_SESS_TTL = 120 * 24 * 3600;
function aiSessKey(email, sid) { return 'ai:chat:' + email + ':' + sid; }
function aiIdxKey(email) { return 'ai:chatidx:' + email; }
function aiProfKey(email) { return 'ai:prof:' + email; }
function aiErrMsg(e) { if (/no_gemini_key/.test(e)) return 'De Gemini-sleutel ontbreekt nog. Kies een Claude- of GPT-model.'; if (/no_openai_key/.test(e)) return 'De OpenAI-sleutel ontbreekt nog.'; if (/no_anthropic_key/.test(e)) return 'De Claude-sleutel ontbreekt nog.'; return 'Er ging iets mis met het AI-model.'; }
async function aiUserMemory(env, email) { try { return str(await env.KV.get(aiProfKey(email))); } catch (e) { return ''; } }
async function aiSaveMemory(env, email, fact) { try { let cur = await aiUserMemory(env, email); const line = '- ' + str(fact).trim().slice(0, 280); if (!line || cur.indexOf(line) >= 0) return; cur = (cur ? cur + '\n' : '') + line; await env.KV.put(aiProfKey(email), cur.split('\n').slice(-60).join('\n'), { expirationTtl: 365 * 24 * 3600 }); } catch (e) { /* */ } }
function aiPersona(portal, naam) {
  const p = { crm: 'het 27CRM (sales, klanten, offertes, meetings)', hr: 'het 27HR-portaal (werving, kandidaten, vacatures)', finance: 'het 27Finance-portaal (offertes, cijfers)', productie: 'het 27Productie-portaal (taken, planning)' }[str(portal).toLowerCase()] || 'het Studio 27-werkplekportaal';
  return 'Je bent de persoonlijke AI-assistent van ' + (naam || 'een teamlid') + ' bij Studio 27, een Vlaams marketing- en communicatiebureau. Je werkt mee in ' + p + '. Antwoord concreet, eerlijk en in vlot, menselijk Nederlands zonder em-dashes. Gebruik de meegegeven context van het scherm waar de gebruiker net naar kijkt. Weet je iets niet, zeg dat eerlijk.\n\nGEHEUGEN: wil je iets onthouden voor latere gesprekken (een voorkeur of feit over de gebruiker/het werk), eindig dan met een aparte regel <<ONTHOUD: ...>>.\nMAILS/TEKST: als om een mail of tekst gevraagd wordt, schrijf die volledig uit, klaar om te gebruiken. Verstuur zelf niets.';
}
async function aiSessIndex(env, email) { try { const r = await env.KV.get(aiIdxKey(email), 'json'); return Array.isArray(r) ? r : []; } catch (e) { return []; } }
async function aiSessIndexPut(env, email, sess) { try { let idx = await aiSessIndex(env, email); idx = idx.filter((x) => x.id !== sess.id); idx.unshift({ id: sess.id, title: sess.title, portal: sess.portal, updated: sess.updated }); await env.KV.put(aiIdxKey(email), JSON.stringify(idx.slice(0, 100)), { expirationTtl: AI_SESS_TTL }); } catch (e) { /* */ } }

export async function teamAssistantChat(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const email = str(rr.me && rr.me.email).toLowerCase(); if (!email) return { status: 200, body: { ok: false, error: 'no_user' } };
  const naam = str(rr.me && rr.me.naam) || email.split('@')[0];
  const portal = str(body.portal || 'werkplek');
  const message = str(body.message).trim(); if (!message) return { status: 400, body: { ok: false, error: 'geen_bericht' } };
  let model = str(body.model); if (!AI_MODEL_IDS.has(model)) model = await aiGlobalModel(env);
  const ctx = str(body.context).slice(0, 8000);
  let sid = str(body.session_id); let sess = null;
  if (sid) { try { sess = await env.KV.get(aiSessKey(email, sid), 'json'); } catch (e) { /* */ } }
  if (!sess) { sid = 'sess_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); sess = { id: sid, title: message.slice(0, 48) || 'Nieuwe chat', portal, model, messages: [], created: Date.now() }; }
  const mem = await aiUserMemory(env, email);
  const sys = aiPersona(portal, naam) + (mem ? '\n\n=== WAT JE OVER ' + naam.toUpperCase() + ' WEET (geheugen) ===\n' + mem : '') + (ctx ? '\n\n=== CONTEXT (scherm/item nu) ===\n' + ctx : '');
  const hist = (sess.messages || []).slice(-12).map((m) => (m.role === 'assistant' ? 'Assistent: ' : naam + ': ') + str(m.text)).join('\n');
  const user = (hist ? hist + '\n' : '') + naam + ': ' + message;
  const res = await aiComplete(env, model, sys, user, 1600, { platform: portal, skill: 'assistent', member_id: rr.me.id, member_naam: naam });
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: str(res && res.err) || 'ai_fout', message: aiErrMsg(str(res && res.err)) } };
  let reply = str(res.text).trim();
  const mm = reply.match(/<<\s*ONTHOUD\s*:\s*([^>]+?)\s*>>/i); if (mm) { reply = reply.replace(mm[0], '').trim(); await aiSaveMemory(env, email, mm[1]); }
  sess.messages = (sess.messages || []).concat([{ role: 'user', text: message, ts: Date.now() }, { role: 'assistant', text: reply, ts: Date.now() }]).slice(-60);
  sess.updated = Date.now(); sess.model = model;
  try { await env.KV.put(aiSessKey(email, sid), JSON.stringify(sess), { expirationTtl: AI_SESS_TTL }); } catch (e) { /* */ }
  await aiSessIndexPut(env, email, sess);
  return { status: 200, body: { ok: true, reply, session_id: sid, title: sess.title, model } };
}
export async function teamAssistantSessions(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const email = str(rr.me && rr.me.email).toLowerCase();
  return { status: 200, body: { ok: true, sessions: await aiSessIndex(env, email), memory: await aiUserMemory(env, email), models: AI_MODELS.map((x) => ({ id: x.id, naam: x.naam, provider: x.provider })), globaal_model: await aiGlobalModel(env), me: { naam: str(rr.me && rr.me.naam), email } } };
}
export async function teamAssistantSession(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const email = str(rr.me && rr.me.email).toLowerCase(); const sid = str(body.session_id);
  if (!sid) return { status: 400, body: { ok: false, error: 'no_sid' } };
  let sess = null; try { sess = await env.KV.get(aiSessKey(email, sid), 'json'); } catch (e) { /* */ }
  if (!sess) return { status: 200, body: { ok: false, error: 'not_found' } };
  return { status: 200, body: { ok: true, session: sess } };
}
export async function teamAssistantDelete(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const email = str(rr.me && rr.me.email).toLowerCase(); const sid = str(body.session_id);
  if (sid) { try { await env.KV.delete(aiSessKey(email, sid)); } catch (e) { /* */ } let idx = await aiSessIndex(env, email); idx = idx.filter((x) => x.id !== sid); try { await env.KV.put(aiIdxKey(email), JSON.stringify(idx), { expirationTtl: AI_SESS_TTL }); } catch (e) { /* */ } }
  return { status: 200, body: { ok: true } };
}
// Actie-modus: eenmalige generatie (bv. afwijzingsmail) voor de actieknoppen. Geen sessie.
export async function teamAssistantGen(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const naam = str(rr.me && rr.me.naam) || 'teamlid';
  let model = str(body.model); if (!AI_MODEL_IDS.has(model)) model = await aiGlobalModel(env);
  const portal = str(body.portal || 'werkplek');
  const instruction = str(body.instruction).trim(); if (!instruction) return { status: 400, body: { ok: false, error: 'geen_instructie' } };
  const ctx = str(body.context).slice(0, 8000);
  const sys = aiPersona(portal, naam) + '\n\nJe krijgt een opdracht om een tekst (vaak een e-mail) te genereren. Geef ENKEL de gevraagde tekst terug, klaar om te gebruiken, zonder inleiding of meta-commentaar.';
  const user = (ctx ? '=== CONTEXT ===\n' + ctx + '\n\n' : '') + 'OPDRACHT: ' + instruction;
  const res = await aiComplete(env, model, sys, user, 1400, { platform: portal, skill: 'assistent:actie', member_id: rr.me.id, member_naam: naam });
  if (!res || res.err || !res.text) return { status: 200, body: { ok: false, error: str(res && res.err) || 'ai_fout', message: aiErrMsg(str(res && res.err)) } };
  return { status: 200, body: { ok: true, text: str(res.text).trim(), model } };
}

/* ===========================================================================
 * 27CRM + 27FINANCE — leeshandlers op D1 (s27-crm-db). Staff-gated (router) +
 * finance-rolgate. Bootstrap-endpoints: de SPA's laden de data 1x en aggregeren
 * client-side (zoals de .dc.html-ontwerpen). KV-cache 60s. Data komt uit de
 * uurlijkse ClickUp->D1-sync (crmSyncAll). Zie crm.mjs / crmdb.mjs.
 * =========================================================================== */
const CRM_BOOT_CK = 'crm:boot:v1';
const FIN_BOOT_CK = 'fin:boot:v1';
async function crmMeInfo(env, body) {
  const rr = await resolveRole(env, body);
  if (rr.error) return null;
  return { rr, me: { naam: str(rr.me && rr.me.naam) || str(body.account_email) || '', role: str(rr.role || 'team'),
    showMoney: !denyUnless(rr.perms, 'finance'), showPerPerson: !denyUnless(rr.perms, 'finance_full'), real_admin: !!rr.real_admin } };
}
export async function crmData(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const id = await crmMeInfo(env, body); if (!id) return { status: 200, body: { ok: false, error: 'no_member' } };
  if (!env.CRMDB) return { status: 200, body: { ok: true, me: id.me, companies: [], contacts: [], offertes: [], meetings: [], subscriptions: [], empty: true } };
  if (str(body.refresh) !== '1') { try { const hit = await env.KV.get(CRM_BOOT_CK, 'json'); if (hit && hit.companies) return { status: 200, body: Object.assign({ ok: true, me: id.me, cached: true }, hit) }; } catch (e) { /* */ } }
  let companies = [], contacts = [], offertes = [], meetings = [], subscriptions = [], team = [];
  try { [companies, contacts, offertes, meetings, subscriptions] = await Promise.all([companyList(env), contactList(env), offerteList(env), meetingList(env), companySubscriptionList(env)]); } catch (e) { /* */ }
  try { team = (await membersAll(env)).map((m) => ({ id: m.id, naam: m.naam, voornaam: m.voornaam, email: m.email })); } catch (e) { /* */ }
  const payload = { companies, contacts, offertes, meetings, subscriptions, team };
  try { await env.KV.put(CRM_BOOT_CK, JSON.stringify(payload), { expirationTtl: 60 }); } catch (e) { /* */ }
  return { status: 200, body: Object.assign({ ok: true, me: id.me }, payload) };
}
// Fireflies-transcript van een meeting (op aanvraag). Leest de Fireflies-ID uit D1 en haalt
// het volledige transcript via de Fireflies GraphQL-API. Fail-soft zonder FIREFLIES_API_KEY:
// geeft dan de samenvatting + Fireflies-URL terug zodat de gebruiker het in Fireflies opent.
export async function crmMeetingTranscript(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.id); if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  let m = null; try { m = await env.CRMDB.prepare('SELECT id, titel, ff, ff_url, samenvatting FROM meetings WHERE id=?').bind(id).first(); } catch (e) { /* */ }
  if (!m) return { status: 200, body: { ok: false, error: 'no_meeting' } };
  const ffId = str(m.ff), ffUrl = str(m.ff_url);
  if (!env.FIREFLIES_API_KEY) return { status: 200, body: { ok: false, reason: 'no_fireflies_key', ff_url: ffUrl, samenvatting: str(m.samenvatting), titel: str(m.titel) } };
  if (!ffId) return { status: 200, body: { ok: false, reason: 'no_fireflies_id', ff_url: ffUrl } };
  try {
    const q = { query: 'query T($id: String!){ transcript(id:$id){ id title dateString duration sentences{ speaker_name text } summary{ overview action_items keywords short_summary } } }', variables: { id: ffId } };
    const r = await fetch('https://api.fireflies.ai/graphql', { method: 'POST', headers: { Authorization: `Bearer ${str(env.FIREFLIES_API_KEY)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
    const d = await r.json().catch(() => ({}));
    const t = d && d.data && d.data.transcript;
    if (!t) return { status: 200, body: { ok: false, reason: 'fireflies_error', detail: (d && d.errors) || null, ff_url: ffUrl } };
    const lines = (t.sentences || []).map((s) => (str(s.speaker_name) ? str(s.speaker_name) + ': ' : '') + str(s.text));
    return { status: 200, body: { ok: true, titel: str(t.title || m.titel), datum: str(t.dateString || ''), duur: t.duration || 0, overview: (t.summary && str(t.summary.overview)) || '', actie_items: (t.summary && t.summary.action_items) || '', transcript: lines.join('\n'), regels: lines.length, ff_url: ffUrl } };
  } catch (e) { return { status: 200, body: { ok: false, reason: 'fetch_error', error: String(e && e.message), ff_url: ffUrl } }; }
}
// Nieuwe offerte vanuit het CRM: maakt een PandaDoc-CONCEPT (per-merk template) + schrijft de offerte
// naar D1 (status draft, gekoppeld aan bedrijf+contact, met panda_id zodat de webhook 'm later bijwerkt).
export async function crmOfferteCreate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!env.CRMDB) return { status: 200, body: { ok: false, error: 'no_d1' } };
  const org = String(body.org || 'S27').toUpperCase();
  const bedrijfId = str(body.bedrijf_id || body.bedrijfId || '');
  const contactId = str(body.contact_id || body.contactId || '');
  const titel = str(body.titel || '').trim() || 'Nieuwe offerte';
  const budget = Math.max(0, Math.round(Number(body.budget) || 0));
  const verval = (body.verval != null && body.verval !== '') ? Number(body.verval) : null;
  if (!bedrijfId && org !== '27M') return { status: 200, body: { ok: false, error: 'no_company' } };
  const comp = bedrijfId ? await companyGet(env, bedrijfId) : null;
  const cont = contactId ? await contactGet(env, contactId) : null;
  const klant = {
    company: (comp && comp.naam) || str(body.bedrijf_naam) || 'Klant',
    first_name: (cont && cont.voornaam) || '',
    last_name: (cont && cont.achternaam) || '',
    email: (cont && cont.email) || (comp && comp.fact_email) || '',
  };
  const items = [{ sku: '', naam: titel, groep: '', prijs: budget, aantal: 1, regel_totaal: budget }];
  // PM/afzender = de ingelogde maker (zodat 'verzonden door' meteen klopt); fallback = Ilke.
  const meEmail = str(rr.me && rr.me.email).toLowerCase();
  const meNaam = str(rr.me && rr.me.naam);
  const pm = meEmail ? { email: meEmail, first_name: meNaam.split(/\s+/)[0] || '', last_name: meNaam.split(/\s+/).slice(1).join(' ') || '', phone: '' } : PANDADOC_PM;
  const verzonden_door = meEmail;
  const datum = new Date().toLocaleDateString('nl-BE');
  const docName = `Offerte ${klant.company} - ${datum}`;
  let panda_id = '', panda_status = '', panda_err = '';
  try {
    const call = buildPandadocCreate(env, { docName, items, klant, pm, template: pandadocTemplateForOrg(org), pmRole: pandadocPmRoleForOrg(org), skipPm: pandadocSkipPmForOrg(org) });
    const pd = await pandadocCreate(env, call);
    panda_id = str(pd && pd.id); panda_status = str(pd && pd.status);
    if (!panda_id && pd && pd.error) panda_err = str(pd.error);
  } catch (e) { panda_err = String(e && e.message); }
  const id = 'off_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const code = 'S27-' + Date.now().toString(36).toUpperCase().slice(-6);
  const now = Date.now();
  await cdbUpsert(env, 'offertes', {
    id, titel, onderneming: org, status: 'draft', status_cat: 'open',
    bedrijf_id: bedrijfId, bedrijf_naam: klant.company, contact_id: contactId, contact_naam: (klant.first_name + ' ' + klant.last_name).trim(),
    meeting_id: '', briefing_id: '', owner: (rr.me && rr.me.naam) || '', budget, disc: '{}',
    panda_id, panda_link: '', code, verval, doorzet: '', opstart: 0,
    verzonden_door, vd_override: 0,
    clickup_id: '', created_at: now, updated_at: now,
  });
  try { await env.KV.delete(CRM_BOOT_CK); } catch (e) { /* cache invalideren zodat de offerte meteen verschijnt */ }
  return { status: 200, body: { ok: true, id, code, titel, org, budget, bedrijf_id: bedrijfId, contact_id: contactId, panda_id, panda_status, panda_err, panda_enabled: str(env.PANDADOC_CREATE_ENABLED) === 'true' } };
}
// Handmatig de 'verzonden door' (accountmanager) van een offerte aanpassen. D1 onthoudt het ALTIJD
// (vd_override=1, zodat de PandaDoc-sync het niet meer overschrijft). Staat het PandaDoc-document nog
// in draft, dan proberen we de PM-recipient mee te wijzigen (best-effort; PandaDoc laat het e-mail van
// een PandaDoc-gebruiker niet altijd wijzigen). Bij niet-draft: enkel in ons portaal onthouden.
async function pandadocReassignPM(env, docId, email) {
  const PB = 'https://api.pandadoc.com/public/v1';
  const auth = `API-Key ${str(env.PANDADOC_API_KEY)}`;
  try {
    const dr = await fetch(`${PB}/documents/${docId}/details`, { headers: { Authorization: auth } });
    const dd = await dr.json().catch(() => ({}));
    const recs = (dd && dd.recipients) || [];
    const pm = recs.find((x) => /projectmanager/i.test(str(x && x.role))) || recs.find((x) => /@studio27\.be$/i.test(str(x && x.email)));
    const rid = pm && (pm.id || pm.recipient_id);
    if (!rid) return { attempted: true, ok: false, reason: 'no_pm_recipient' };
    const pr = await fetch(`${PB}/documents/${docId}/recipients/recipient/${rid}`, { method: 'PATCH', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const pd = await pr.json().catch(() => ({}));
    return { attempted: true, ok: !!pr.ok, http: pr.status, detail: pr.ok ? null : pd };
  } catch (e) { return { attempted: true, ok: false, error: String(e && e.message) }; }
}
// Handmatig projecttaken genereren uit een offerte (knop "Taken genereren" in het offerte-detail).
export async function crmOfferteGenerateTasks(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.offerte_id || body.id); if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  const off = await offerteGet(env, id); if (!off) return { status: 200, body: { ok: false, error: 'no_offerte' } };
  const r = await opsGenerateForOfferte(env, off, { briefing: true });
  return { status: 200, body: Object.assign({ ok: true, offerte_id: id }, r) };
}
export async function crmOfferteSetManager(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!env.CRMDB) return { status: 200, body: { ok: false, error: 'no_d1' } };
  const id = str(body.offerte_id || body.id);
  const email = str(body.email || '').toLowerCase().trim();
  if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  const off = await offerteGet(env, id); if (!off) return { status: 200, body: { ok: false, error: 'no_offerte' } };
  await env.CRMDB.prepare('UPDATE offertes SET verzonden_door=?, vd_override=1, updated_at=? WHERE id=?').bind(email, Date.now(), id).run();
  let pandadoc = { attempted: false, draft: off.status === 'draft' };
  if (off.panda_id && off.status === 'draft' && email) { pandadoc = await pandadocReassignPM(env, off.panda_id, email); }
  try { await env.KV.delete(CRM_BOOT_CK); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, id, verzonden_door: email, override: true, pandadoc } };
}
// Offerte manueel op een terminale status zetten (enkel 'completed'/'declined'; bv. klant laat telefonisch
// weten). Werkt D1 bij + registreert het in PandaDoc via PATCH /documents/{id}/status, ZONDER mail naar de
// klant (notify_recipients:false). PandaDoc-statusverandering triggert ook de webhook -> taken bij 'completed'.
export async function crmOfferteSetStatus(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!env.CRMDB) return { status: 200, body: { ok: false, error: 'no_d1' } };
  const id = str(body.offerte_id || body.id);
  const want = str(body.status || '').toLowerCase();
  if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  if (want !== 'completed' && want !== 'declined') return { status: 400, body: { ok: false, error: 'bad_status' } };
  const off = await offerteGet(env, id); if (!off) return { status: 200, body: { ok: false, error: 'no_offerte' } };
  const cat = want === 'completed' ? 'won' : 'declined';
  // Onthoud dat status door het portaal is gezet (portal_overrides), zodat de uurlijkse ClickUp-sync het niet terugdraait.
  let ovrSt = {}; try { const cr = await env.CRMDB.prepare('SELECT portal_overrides FROM offertes WHERE id=?').bind(id).first(); ovrSt = JSON.parse((cr && cr.portal_overrides) || '{}') || {}; } catch (e) { ovrSt = {}; }
  ovrSt.status = Date.now(); ovrSt.status_cat = Date.now();
  try { await env.CRMDB.prepare('UPDATE offertes SET status=?, status_cat=?, portal_overrides=?, updated_at=? WHERE id=?').bind(want, cat, JSON.stringify(ovrSt), Date.now(), id).run(); } catch (e) { return { status: 200, body: { ok: false, error: 'd1_fail' } }; }
  // PandaDoc registreren (best-effort), zonder mail naar de klant.
  let pandadoc = { attempted: false };
  const pid = str(off.panda_id);
  if (pid && env.PANDADOC_API_KEY) {
    pandadoc = { attempted: true };
    try {
      const code = want === 'completed' ? 2 : 12;
      const who = str(rr.me && rr.me.naam) || '27CRM';
      const r = await fetch(`${PANDADOC_BASE}/documents/${pid}/status`, { method: 'PATCH', headers: { Authorization: `API-Key ${str(env.PANDADOC_API_KEY)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: code, notify_recipients: false, note: `Manueel bijgewerkt via 27CRM (${who})` }) });
      pandadoc.ok = r.ok; pandadoc.http = r.status; if (!r.ok) { try { pandadoc.detail = await r.json(); } catch (e) { /* */ } }
    } catch (e) { pandadoc.ok = false; pandadoc.error = String(e && e.message); }
  }
  try { await env.KV.delete(CRM_BOOT_CK); await env.KV.delete(FIN_BOOT_CK); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, offerte_id: id, status: want, status_cat: cat, pandadoc } };
}

// ===========================================================================
// crmEntityUpdate: GENERIEKE real-time veld-update op een CRMDB-entiteit
// (companies/contacts/offertes/meetings). Schrijft de gewijzigde velden 1-op-1
// naar D1 en onthoudt in portal_overrides welke kolommen het portaal "bezit",
// zodat de uurlijkse ClickUp->D1-sync (cdbUpsertGuarded) ze niet terugdraait.
// Body: { entity, id, patch:{kolom:waarde, ...} }  OF  { entity, id, field, value }.
// ===========================================================================
const CRM_UPDATE_WL = {
  companies: ['naam', 'org', 'kaart', 'belangrijk', 'status_s27', 'status_zvd', 'status_27a', 'pm', 'type_job', 'website', 'locatie', 'kbo', 'mw', 'fact_email', 'fact_opm', 'drive', 'hoofd_contact', 'ga4', 'gsc', 'gads', 'meta_ads', 'metricool', 'webflow', 'portaal_url', 'portaal_modules'],
  contacts: ['voornaam', 'achternaam', 'email', 'gsm', 'bedrijf_id', 'notif', 'kanalen'],
  offertes: ['titel', 'onderneming', 'status', 'status_cat', 'bedrijf_id', 'bedrijf_naam', 'contact_id', 'contact_naam', 'meeting_id', 'owner', 'budget', 'disc', 'code', 'verval', 'doorzet', 'opstart', 'brief', 'verzonden_door'],
  meetings: ['titel', 'type', 'org', 'datum', 'status', 'bedrijf_id', 'contact_id', 'ff', 'ff_url', 'samenvatting'],
};
const CRM_NUM_COLS = { mw: 1, budget: 1, verval: 1, datum: 1 };
const CRM_BOOL_COLS = { opstart: 1, vd_override: 1, belangrijk: 1 };
function crmCoerce(col, v) {
  if (col === 'kanalen' || col === 'disc') { try { return typeof v === 'string' ? v : JSON.stringify(v || (col === 'kanalen' ? [] : {})); } catch (e) { return col === 'kanalen' ? '[]' : '{}'; } }
  if (CRM_BOOL_COLS[col]) return v ? 1 : 0;
  if (CRM_NUM_COLS[col]) { if (v === '' || v == null) return null; const n = Number(v); return isNaN(n) ? null : n; }
  return v == null ? '' : String(v);
}
export async function crmEntityUpdate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!env.CRMDB) return { status: 200, body: { ok: false, error: 'no_d1' } };
  const entity = str(body.entity);
  const id = str(body.id);
  const wl = CRM_UPDATE_WL[entity];
  if (!wl) return { status: 400, body: { ok: false, error: 'bad_entity' } };
  if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  let patch = (body.patch && typeof body.patch === 'object') ? body.patch : {};
  if (body.field != null) patch = Object.assign({}, patch, { [str(body.field)]: body.value });
  const cols = Object.keys(patch).filter((c) => wl.indexOf(c) >= 0);
  if (!cols.length) return { status: 400, body: { ok: false, error: 'no_fields' } };
  let cur = null; try { cur = await env.CRMDB.prepare(`SELECT id, portal_overrides FROM ${entity} WHERE id=?`).bind(id).first(); } catch (e) { cur = null; }
  if (!cur) return { status: 200, body: { ok: false, error: 'not_found' } };
  let ovr = {}; try { ovr = JSON.parse(cur.portal_overrides || '{}') || {}; } catch (e) { ovr = {}; }
  const extra = {};
  if (entity === 'offertes' && cols.indexOf('status') >= 0 && cols.indexOf('status_cat') < 0) {
    const st = String(patch.status || '').toLowerCase();
    extra.status_cat = st === 'completed' ? 'won' : (st === 'declined' ? 'declined' : (st === 'expired' ? 'lost' : 'open'));
  }
  if (entity === 'offertes' && cols.indexOf('verzonden_door') >= 0) extra.vd_override = 1;
  const setCols = []; const binds = [];
  for (const c of cols) { setCols.push(`${c}=?`); binds.push(crmCoerce(c, patch[c])); ovr[c] = Date.now(); }
  for (const c in extra) { setCols.push(`${c}=?`); binds.push(extra[c]); ovr[c] = Date.now(); }
  setCols.push('portal_overrides=?'); binds.push(JSON.stringify(ovr));
  setCols.push('updated_at=?'); binds.push(Date.now());
  const sql = `UPDATE ${entity} SET ${setCols.join(', ')} WHERE id=?`; binds.push(id);
  try { await env.CRMDB.prepare(sql).bind(...binds).run(); } catch (e) { return { status: 200, body: { ok: false, error: 'd1_fail', detail: String(e && e.message) } }; }
  try { await env.KV.delete(CRM_BOOT_CK); if (entity === 'offertes') await env.KV.delete(FIN_BOOT_CK); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, entity, id, updated: cols.concat(Object.keys(extra)) } };
}
const SUB_TYPES = ['seo', 'ads', 'email', 'social', 'hosting', 'automation'];
const SUB_LABELS = { seo: 'SEO + GEO', ads: 'Advertenties', email: 'E-mailmarketing', social: 'Social media beheer', hosting: 'Hosting', automation: 'Automatisering' };
export async function crmSubscriptionUpdate(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  if (!env.CRMDB) return { status: 200, body: { ok: false, error: 'no_d1' } };
  await ensureCompanySubscriptions(env);
  const bedrijfId = str(body.bedrijf_id || body.company_id);
  const type = str(body.type).toLowerCase();
  if (!bedrijfId || SUB_TYPES.indexOf(type) < 0) return { status: 400, body: { ok: false, error: 'bad_subscription' } };
  const company = await companyGet(env, bedrijfId);
  if (!company) return { status: 200, body: { ok: false, error: 'no_company' } };
  const id = 'sub_' + bedrijfId + '_' + type;
  const now = Date.now();
  const label = str(body.label || SUB_LABELS[type] || type);
  const active = body.active ? 1 : 0;
  const budget = Math.max(0, Number(body.budget) || 0);
  const budgetPeriod = str(body.budget_period || body.period || 'maand') === 'kwartaal' ? 'kwartaal' : 'maand';
  const context = str(body.context).slice(0, 1000);
  const org = str(body.org || company.org || 'S27').toUpperCase();
  const sort = Math.max(0, Number(body.sort) || SUB_TYPES.indexOf(type));
  await cdbUpsert(env, 'company_subscriptions', {
    id, bedrijf_id: bedrijfId, type, label, active, budget, budget_period: budgetPeriod, context, org, sort,
    source: 'portal', created_at: now, updated_at: now,
  });
  try { await env.KV.delete(CRM_BOOT_CK); await env.KV.delete(FIN_BOOT_CK); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, subscription: { id, bedrijf_id: bedrijfId, type, label, active: !!active, budget, budget_period: budgetPeriod, context, org, sort, source: 'portal', ts: now } } };
}
// ===========================================================================
// crmOfferteMail: echt Gmail-mailverkeer op de offertepagina. Zoekt de thread
// met het contactadres van de offerte (from/to) in de mailbox van de verzender
// (of marketing@studio27.be als fallback) en geeft de berichten chronologisch
// terug. Read-only; fail-soft als de gmail.readonly-scope nog niet is toegekend.
// Body: { offerte_id, email?(contactadres), mailbox?(verzender @studio27.be) }
// ===========================================================================
export async function crmOfferteMail(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  let email = str(body.email).trim().toLowerCase();
  const offId = str(body.offerte_id || '');
  if (!email && offId && env.CRMDB) {
    try { const o = await offerteGet(env, offId); if (o && o.contact_id) { const c = await contactGet(env, o.contact_id); if (c) email = str(c.email).trim().toLowerCase(); } } catch (e) { /* */ }
  }
  if (!email || email.indexOf('@') < 0) return { status: 200, body: { ok: false, error: 'no_email', message: 'Geen e-mailadres gekoppeld aan deze offerte.' } };
  const mbRaw = str(body.mailbox).trim().toLowerCase();
  const mailbox = /@studio27\.be$/.test(mbRaw) ? mbRaw : HR_MAIL_SUBJECT;
  let token;
  try { token = await mintGoogleToken(env, mailbox, GMAIL_READ_SCOPE); } catch (e) { return { status: 200, body: { ok: false, error: 'no_scope', message: 'Gmail-leestoegang (gmail.readonly) is nog niet toegekend aan de service-account.' } }; }
  const q = encodeURIComponent('{from:' + email + ' to:' + email + '}');
  const lr = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=' + q, { headers: { Authorization: 'Bearer ' + token } });
  const ld = await lr.json().catch(() => null);
  if (!lr.ok) return { status: 200, body: { ok: false, error: 'gmail_fout', detail: str(ld && ld.error && ld.error.message) } };
  const msgs = (ld && Array.isArray(ld.messages)) ? ld.messages : [];
  const out = [];
  for (const m of msgs.slice(0, 18)) {
    const mg = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + m.id + '?format=full', { headers: { Authorization: 'Bearer ' + token } });
    const md = await mg.json().catch(() => null); if (!md) continue;
    const hs = (md.payload && md.payload.headers) || [];
    const hv = (n) => str((hs.find((h) => h.name.toLowerCase() === n) || {}).value);
    const fromH = hv('from'); const toH = hv('to'); const subj = hv('subject'); const dateStr = hv('date');
    let ts = Date.parse(dateStr); if (isNaN(ts)) ts = Number(md.internalDate) || 0;
    const fromEmail = hrEmailOf(fromH);
    const dir = (fromEmail === email) ? 'in' : 'out';
    const txt = gmailText(md.payload);
    const atts = gmailAttachments(md.payload).map((a) => ({ name: a.filename || 'bijlage' }));
    out.push({ id: m.id, dir, from: fromH, fromEmail, to: toH, subject: subj, snippet: str(md.snippet), body: txt.slice(0, 8000), ts, attachments: atts });
  }
  out.sort((a, b) => a.ts - b.ts);
  return { status: 200, body: { ok: true, email, mailbox, count: out.length, mails: out } };
}
// ===========================================================================
// firefliesWebhook: zet elke voltooide Fireflies-meeting automatisch in het CRM.
// Fireflies POST't { meetingId, eventType } zodra een transcriptie klaar is. Wij
// halen het transcript op via de GraphQL-API en upserten een meeting in D1
// (id = ff_<meetingId>), met best-effort koppeling aan een bestaand contact/bedrijf
// via de deelnemers-mailadressen. Publiek endpoint (token-gated in worker.js).
// ===========================================================================
export async function firefliesWebhook(env, body) {
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  if (!env.FIREFLIES_API_KEY) return { ok: false, reason: 'no_fireflies_key' };
  const p = body || {};
  const mid = str(p.meetingId || p.meeting_id || p.transcriptId || (p.data && (p.data.meetingId || p.data.transcriptId)) || '');
  const evt = str(p.eventType || p.event || '');
  if (!mid) return { ok: false, reason: 'no_meeting_id' };
  // alleen voltooide transcripties verwerken; andere events negeren maar 200 teruggeven
  if (evt && !/complet|transcri|ready|done/i.test(evt)) return { ok: true, ignored: evt };
  const q = { query: 'query T($id: String!){ transcript(id:$id){ id title dateString date duration host_email organizer_email participants meeting_attendees{ displayName email } summary{ overview short_summary } } }', variables: { id: mid } };
  let t = null;
  try {
    const r = await fetch('https://api.fireflies.ai/graphql', { method: 'POST', headers: { Authorization: `Bearer ${str(env.FIREFLIES_API_KEY)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
    const d = await r.json().catch(() => null);
    t = d && d.data && d.data.transcript;
    if (!t) return { ok: false, reason: 'fireflies_error', detail: (d && d.errors) || null };
  } catch (e) { return { ok: false, reason: 'fireflies_fetch', detail: String(e && e.message) }; }
  let ts = 0;
  if (t.dateString) ts = Date.parse(t.dateString);
  if ((!ts || isNaN(ts)) && t.date) { const n = Number(t.date); ts = isNaN(n) ? Date.parse(str(t.date)) : n; }
  if (!ts || isNaN(ts)) ts = Date.now();
  const emails = [];
  (Array.isArray(t.participants) ? t.participants : []).forEach((e) => { const s = str(e).toLowerCase(); if (s.indexOf('@') >= 0) emails.push(s); });
  (Array.isArray(t.meeting_attendees) ? t.meeting_attendees : []).forEach((a) => { const s = str(a && a.email).toLowerCase(); if (s.indexOf('@') >= 0) emails.push(s); });
  const ext = emails.filter((e) => !/@studio27\.be$/.test(e));
  let bedrijf_id = '', contact_id = '';
  try {
    for (const e of ext) {
      const c = await env.CRMDB.prepare('SELECT id, bedrijf_id FROM contacts WHERE lower(email)=? LIMIT 1').bind(e).first();
      if (c) { contact_id = str(c.id); bedrijf_id = str(c.bedrijf_id || ''); break; }
    }
  } catch (e) { /* */ }
  const samen = str((t.summary && (t.summary.overview || t.summary.short_summary)) || '');
  const id = 'ff_' + mid;
  const now = Date.now();
  const ovr = await loadPortalOverrides(env, 'meetings');   // respecteer eventuele latere portaal-edits bij her-levering
  try {
    await cdbUpsertGuarded(env, 'meetings', {
      id, titel: str(t.title || 'Meeting'), type: 'SALES', org: '', datum: ts,
      status: 'niet klaar', bedrijf_id, contact_id, ff: str(t.id || mid),
      ff_url: 'https://app.fireflies.ai/view/' + mid, samenvatting: samen.slice(0, 8000),
      clickup_id: '', created_at: now, updated_at: now,
    }, ovr);
  } catch (e) { return { ok: false, reason: 'd1_fail', detail: String(e && e.message) }; }
  try { await env.KV.delete(CRM_BOOT_CK); } catch (e) { /* */ }
  return { ok: true, id, matched: !!contact_id, bedrijf_id, contact_id, datum: ts };
}
// Webflow contactformulier -> AI sales-detectie -> CRM. Per site (org via de webhook-URL), token-gated.
// Bij een salesvraag: dedup/aanmaak bedrijf + contact in D1 (juiste org), AI bedenkt een heldere
// offertetitel, en er wordt een offerte + PandaDoc-concept klaargezet. Niet-sales -> enkel loggen.
export async function webflowIntake(env, body, org) {
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  org = String(org || 'S27').toUpperCase();
  const p = (body && (body.payload || body.data)) ? (body.payload || body) : (body || {});
  const data = (p && (p.data || p.fields)) || p || {};
  const fields = {}; try { Object.keys(data).forEach((k) => { fields[k] = data[k]; }); } catch (e) { /* */ }
  const pick = (res) => { for (const k of Object.keys(fields)) { if (res.some((re) => re.test(k))) { const v = String(fields[k] == null ? '' : fields[k]).trim(); if (v) return v; } } return ''; };
  const naam = pick([/^naam$/i, /volledige.?naam/i, /full.?name/i, /^name$/i, /voornaam/i, /your.?name/i]);
  const email = pick([/e-?mail/i, /mailadres/i]).toLowerCase();
  const bericht = pick([/bericht/i, /message/i, /vraag/i, /opmerking/i, /comment/i, /toelichting/i, /project/i]);
  const bedrijfNaam = pick([/bedrijf/i, /company/i, /organisat/i, /firma/i, /zaak/i]);
  const tel = pick([/tel/i, /phone/i, /gsm/i, /nummer/i]);
  const subject = pick([/onderwerp/i, /subject/i, /dienst/i, /interesse/i]);
  if (!email && !naam && !bericht) return { ok: false, reason: 'empty_form' };
  const subId = 'wf:' + org + ':' + String((p && p.id) || (p && p.submittedAt) || (email + '|' + bericht.slice(0, 60)));
  try { const seen = await env.KV.get(subId); if (seen) return { ok: true, duplicate: true }; } catch (e) { /* */ }
  // AI: sales? + heldere offertetitel (heel kort)
  const ctx = `Merk/website: ${org}\nNaam: ${naam}\nE-mail: ${email}\nBedrijf: ${bedrijfNaam}\nTelefoon: ${tel}\nOnderwerp: ${subject}\nBericht:\n${bericht}`;
  let sales = true, offerteTitel = '', reden = '', _aiRaw = '', _aiErr = '', _aiModel = '';
  const sys = 'Je beoordeelt contactformulier-inzendingen voor een Vlaams marketing-/mediabureau. Antwoord UITSLUITEND met geldige JSON, niets anders: {"sales": boolean, "reden": "korte reden", "offerte_titel": "korte heldere titel"}. sales=true wanneer iemand interesse heeft in een dienst, samenwerking, website, video, branding, advertenties, een trouwfilm/-reportage (27 Moments) of een offerte vraagt. sales=false bij sollicitatie, supportvraag, factuur-/administratievraag, leveranciers, spam of louter algemene info. offerte_titel: een korte, duidelijke Nederlandse titel voor de offerte op basis van de vraag, met de bedrijfs- of persoonsnaam erin (bv. "Nieuwe website + SEO - Bakkerij Jansen" of "Trouwreportage - Sofie & Tom").';
  // Provider-fallback (Anthropic-krediet kan op zijn): probeer Gemini -> GPT -> Claude tot er output is.
  // aiCompleteRaw routeert strikt op modelnaam-prefix (geen global-model-override).
  for (const mdl of ['gemini-2.5-flash', 'gpt-4o-mini', AI_MODEL]) {
    try { const r = await aiCompleteRaw(env, mdl, sys, ctx, 320, { platform: 'crm', skill: 'webflow-intake' }); if (r && r.text) { _aiRaw = str(r.text); _aiModel = mdl; break; } if (r && r.err) _aiErr = str(r.err); } catch (e) { _aiErr = String(e && e.message); }
  }
  if (_aiRaw) { try { const m = _aiRaw.match(/\{[\s\S]*\}/); const j = m ? JSON.parse(m[0]) : {}; sales = j.sales !== false; offerteTitel = String(j.offerte_titel || '').trim(); reden = String(j.reden || '').trim(); } catch (e) { _aiErr = 'parse:' + String(e && e.message); } }
  if (body && body._debug) return { status: 200, body: { ok: true, _debug: true, ai_model: _aiModel, ai_raw: _aiRaw.slice(0, 400), ai_err: _aiErr, sales, offerteTitel, reden, parsed_fields: { naam, email, bedrijfNaam, bericht: bericht.slice(0, 80) } } };
  try { await env.KV.put(subId, '1', { expirationTtl: 7 * 24 * 3600 }); } catch (e) { /* */ }
  if (!sales) return { status: 200, body: { ok: true, sales: false, reden, naam, email, org } };
  // bedrijf dedup/aanmaak
  const dom = email && email.indexOf('@') >= 0 ? email.split('@')[1] : '';
  const FREE = ['gmail.com', 'hotmail.com', 'hotmail.be', 'outlook.com', 'live.be', 'live.com', 'telenet.be', 'skynet.be', 'yahoo.com', 'icloud.com', 'proximus.be', 'msn.com'];
  const isFree = !dom || FREE.indexOf(dom) >= 0;
  let companyId = '', companyNaam = bedrijfNaam;
  try {
    const comps = await companyList(env); let hit = null;
    if (bedrijfNaam) hit = comps.find((c) => String(c.naam).toLowerCase() === bedrijfNaam.toLowerCase());
    if (!hit && !isFree) { const norm = (h) => String(h || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim(); hit = comps.find((c) => norm(c.website) === dom); }
    if (hit) { companyId = hit.id; companyNaam = hit.naam; }
  } catch (e) { /* */ }
  if (!companyId) {
    companyId = 'comp_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    companyNaam = bedrijfNaam || (!isFree && dom ? dom.split('.')[0] : naam) || 'Nieuwe aanvraag';
    await cdbUpsert(env, 'companies', { id: companyId, naam: companyNaam, org, kaart: 'potentieel', website: (!isFree && dom) ? ('https://' + dom) : '', created_at: Date.now(), updated_at: Date.now() });
  }
  // contact dedup/aanmaak
  const vn = naam ? naam.split(/\s+/)[0] : ''; const an = naam ? naam.split(/\s+/).slice(1).join(' ') : '';
  let contactId = '';
  try { const conts = await contactList(env); const hit = email ? conts.find((c) => String(c.email).toLowerCase() === email) : null; if (hit) contactId = hit.id; } catch (e) { /* */ }
  if (!contactId) {
    contactId = 'cont_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    await cdbUpsert(env, 'contacts', { id: contactId, voornaam: vn || naam || '(onbekend)', achternaam: an, email, gsm: tel, bedrijf_id: companyId, created_at: Date.now(), updated_at: Date.now() });
  } else { try { await env.CRMDB.prepare("UPDATE contacts SET bedrijf_id=CASE WHEN bedrijf_id='' OR bedrijf_id IS NULL THEN ? ELSE bedrijf_id END, updated_at=? WHERE id=?").bind(companyId, Date.now(), contactId).run(); } catch (e) { /* */ } }
  // offerte + PandaDoc-concept
  if (!offerteTitel) offerteTitel = 'Aanvraag ' + (companyNaam || naam) + ' - ' + new Date().toLocaleDateString('nl-BE');
  const klant = { company: companyNaam || naam, first_name: vn, last_name: an, email };
  let panda_id = '', panda_err = '';
  try {
    const call = buildPandadocCreate(env, { docName: offerteTitel, items: [{ sku: '', naam: offerteTitel, groep: '', prijs: 0, aantal: 1, regel_totaal: 0 }], klant, pm: PANDADOC_PM, template: pandadocTemplateForOrg(org), pmRole: pandadocPmRoleForOrg(org), skipPm: pandadocSkipPmForOrg(org) });
    const pd = await pandadocCreate(env, call); panda_id = str(pd && pd.id); if (!panda_id && pd && pd.error) panda_err = str(pd.error);
  } catch (e) { panda_err = String(e && e.message); }
  const offId = 'off_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const code = 'S27-' + Date.now().toString(36).toUpperCase().slice(-6);
  const now = Date.now();
  await cdbUpsert(env, 'offertes', { id: offId, titel: offerteTitel, onderneming: org, status: 'draft', status_cat: 'open', bedrijf_id: companyId, bedrijf_naam: companyNaam, contact_id: contactId, contact_naam: naam, meeting_id: '', briefing_id: '', owner: '', budget: 0, disc: '{}', panda_id, panda_link: '', code, verval: null, doorzet: 'Websiteformulier', opstart: 0, verzonden_door: '', vd_override: 0, brief: bericht, clickup_id: '', created_at: now, updated_at: now });
  try { await env.KV.delete(CRM_BOOT_CK); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, sales: true, org, offerte_id: offId, titel: offerteTitel, company: companyNaam, company_id: companyId, contact_id: contactId, email, panda_id, panda_err } };
}
// Zelf-opruimende verificatie: maakt een ECHT PandaDoc-concept (merk-template) en verwijdert het meteen.
export async function pandadocCreateProbe(env, opts) {
  opts = opts || {};
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  const org = String(opts.org || 'S27').toUpperCase();
  const comp = await env.CRMDB.prepare("SELECT id, naam, fact_email FROM companies WHERE naam!='' LIMIT 1").first().catch(() => null);
  if (!comp) return { ok: false, reason: 'no_company' };
  const klant = { company: str(comp.naam), first_name: 'Test', last_name: 'Concept', email: str(comp.fact_email) };
  const items = [{ sku: '', naam: 'TEST - automatische verificatie, mag weg', groep: '', prijs: 1000, aantal: 1, regel_totaal: 1000 }];
  const call = buildPandadocCreate(env, { docName: 'TEST ' + org + ' ' + str(comp.naam), items, klant, pm: PANDADOC_PM, template: pandadocTemplateForOrg(org), pmRole: pandadocPmRoleForOrg(org), skipPm: pandadocSkipPmForOrg(org) });
  const pd = await pandadocCreate(env, call);
  const deleted_http = pd && pd.id ? await pandadocDeleteById(env, str(pd.id)) : null;
  let roles = null; if (!(pd && pd.id) && opts.roles) { try { const tr = await fetch(`https://api.pandadoc.com/public/v1/templates/${pandadocTemplateForOrg(org)}/details`, { headers: { Authorization: `API-Key ${str(env.PANDADOC_API_KEY)}` } }); const td = await tr.json().catch(() => ({})); roles = (td && td.roles) ? td.roles.map((r) => r && r.name) : null; } catch (e) { /* */ } }
  return { ok: !!(pd && pd.id), org, template: pandadocTemplateForOrg(org), panda_id: (pd && pd.id) || '', panda_status: (pd && pd.status) || '', panda_error: (pd && pd.error) || null, panda_detail: (pd && pd.detail) || null, template_roles: roles, deleted_http, company: str(comp.naam) };
}
// Verwijdert een PandaDoc-document; wacht eerst tot het niet meer 'uploaded' is (vers concept is
// nog niet meteen verwijderbaar -> 404). Retourneert de uiteindelijke DELETE-statuscode.
export async function pandadocDeleteById(env, id) {
  if (!env.PANDADOC_API_KEY || !id) return null;
  const hdr = { Authorization: `API-Key ${str(env.PANDADOC_API_KEY)}` };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 8; i++) {
    try { const sr = await fetch(`https://api.pandadoc.com/public/v1/documents/${id}`, { headers: hdr }); const sd = await sr.json().catch(() => ({})); if (str(sd.status) && str(sd.status) !== 'document.uploaded') break; } catch (e) { /* */ }
    await sleep(1200);
  }
  try { const dr = await fetch(`https://api.pandadoc.com/public/v1/documents/${id}`, { method: 'DELETE', headers: hdr }); return dr.status; } catch (e) { return -1; }
}
export async function crmCompany(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.id); if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  const company = await companyGet(env, id);
  if (!company) return { status: 200, body: { ok: false, error: 'not_found' } };
  const [offertes, contacten, subscriptions] = await Promise.all([
    offertesForCompany(env, id),
    contactsForCompany(env, id),
    companySubscriptionList(env).then((rows) => rows.filter((s) => s.bedrijf_id === id)).catch(() => []),
  ]);
  return { status: 200, body: { ok: true, company, offertes, contacten, subscriptions } };
}
export async function crmOfferte(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.id); if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  const offerte = await offerteGet(env, id);
  if (!offerte) return { status: 200, body: { ok: false, error: 'not_found' } };
  const company = offerte.bedrijf_id ? await companyGet(env, offerte.bedrijf_id) : null;
  const contact = offerte.contact_id ? await contactGet(env, offerte.contact_id) : null;
  return { status: 200, body: { ok: true, offerte, company, contact } };
}
export async function financeData(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const dn = denyUnless(rr.perms, 'finance'); if (dn) return dn;   // finance = admin + sales
  const me = { naam: str(rr.me && rr.me.naam), role: str(rr.role), showPerPerson: !denyUnless(rr.perms, 'finance_full') };
  if (!env.CRMDB) return { status: 200, body: { ok: true, me, offertes: [], recurring: [], invoices: [], empty: true } };
  if (str(body.refresh) !== '1') { try { const hit = await env.KV.get(FIN_BOOT_CK, 'json'); if (hit && hit.offertes) return { status: 200, body: Object.assign({ ok: true, me, cached: true }, hit) }; } catch (e) { /* */ } }
  let offertes = [], recurring = [], invoices = [];
  try { [offertes, recurring, invoices] = await Promise.all([offerteList(env), recurringList(env), invoiceList(env)]); } catch (e) { /* */ }
  const payload = { offertes, recurring, invoices };
  try { await env.KV.put(FIN_BOOT_CK, JSON.stringify(payload), { expirationTtl: 60 }); } catch (e) { /* */ }
  return { status: 200, body: Object.assign({ ok: true, me }, payload) };
}

/* ===========================================================================
 * 27PRODUCTIE + PROFIEL + REGISTRY — operationele laag op D1 (opsdb.mjs).
 * Taken/projecten (los van ClickUp), team, weddings, automatiseringen-registry,
 * per-teamlid AI-geheugen + tone-of-voice. Rollen #17 via teams (management/
 * uitvoerend/ai) → access-flags (finance/automations/hr).
 * =========================================================================== */
const PROD_BRANCHES = [
  { key: 'doorlopend', label: 'Doorlopende trajecten', icon: 'repeat' },
  { key: 'strat', label: 'Strategie', icon: 'target' }, { key: 'brand', label: 'Branding', icon: 'palette' },
  { key: 'web', label: 'Webdesign', icon: 'globe' }, { key: 'video', label: 'Video & foto', icon: 'video' },
  { key: 'social', label: 'Social Media Beheer', icon: 'share-2' }, { key: 'ads', label: 'Advertentiebeheer', icon: 'megaphone' },
  { key: 'auto', label: 'Automations', icon: 'zap' }, { key: 'opl', label: 'Opleidingen', icon: 'graduation-cap' },
  { key: 'support', label: 'Support & tickets', icon: 'life-buoy' },
];
const PROD_STATUSES = ['op-te-starten', 'startklaar', 'in-progress', 'on-hold', 'feedback-klant', 'done', 'klaar-voor-facturatie', 'gefactureerd'];
const PROD_JOBTYPES = ['Webdesign', 'Copywriting', 'SEO', 'hosting', 'Branding', 'Strategie', 'Preproductie', 'Shoot', 'UGC-Shoot', 'Edit', 'Social media', 'Adverteren', 'Automation', 'Opleiding', 'Support', 'Projectmanagement', 'Onderzoek'];
const DISC_BRANCH = { 'Strategie': ['strat', 'Strategie'], 'Branding': ['brand', 'Branding'], 'Video- en fotografie': ['video', 'Shoot'], 'Webdesign': ['web', 'Webdesign'], 'Social media': ['social', 'Social media'], 'Adverteren': ['ads', 'Adverteren'], 'Opleidingen': ['opl', 'Opleiding'], 'Automations': ['auto', 'Automation'] };

// Productie-templates per discipline: de vaste productiestappen (subtaken) die het Make-scenario
// "[S27] [SLS] [OFF] Genereer Projecttaken" via ClickUp-task-templates instantieert. Gemodelleerd op
// de seedTemplates van het Productie-ontwerp. Per subtaak een eigen type_job + richtinggevende est (min).
// n=naam, j=type_job (PROD_JOBTYPES), m=est_min (team verfijnt in de planner).
const TASK_TEMPLATES = {
  web: [{ n: 'Sitemap & structuur', j: 'Webdesign', m: 120 }, { n: 'Wireframes', j: 'Webdesign', m: 180 }, { n: 'UI-design homepage', j: 'Webdesign', m: 240 }, { n: "UI-design subpagina's", j: 'Webdesign', m: 240 }, { n: 'Copywriting', j: 'Copywriting', m: 240 }, { n: 'Webflow build', j: 'Webdesign', m: 480 }, { n: 'Responsive & QA', j: 'Webdesign', m: 120 }, { n: 'SEO-basis', j: 'SEO', m: 120 }, { n: 'Oplevering & overdracht', j: 'Projectmanagement', m: 60 }],
  brand: [{ n: 'Merkstrategie-intake', j: 'Strategie', m: 90 }, { n: 'Moodboard', j: 'Branding', m: 120 }, { n: 'Logo-routes', j: 'Branding', m: 240 }, { n: 'Logo-uitwerking', j: 'Branding', m: 180 }, { n: 'Kleur & typografie', j: 'Branding', m: 120 }, { n: 'Stylesheet', j: 'Branding', m: 120 }, { n: 'Canva-templates', j: 'Branding', m: 120 }, { n: 'Brandbook', j: 'Branding', m: 180 }],
  video: [{ n: 'Preproductie & storyboard', j: 'Preproductie', m: 180 }, { n: 'Shootplanning', j: 'Preproductie', m: 90 }, { n: 'Shootdag', j: 'Shoot', m: 480 }, { n: 'Ruwe montage', j: 'Edit', m: 300 }, { n: 'Feedback verwerken', j: 'Edit', m: 120 }, { n: 'Kleurcorrectie & sound', j: 'Edit', m: 120 }, { n: 'Finale export', j: 'Edit', m: 60 }, { n: 'Oplevering', j: 'Projectmanagement', m: 30 }],
  social: [{ n: 'Contentkalender', j: 'Social media', m: 120 }, { n: 'Copywriting captions', j: 'Social media', m: 120 }, { n: 'Visuals & design', j: 'Social media', m: 180 }, { n: 'Inplannen in Metricool', j: 'Social media', m: 60 }, { n: 'Community management', j: 'Social media', m: 120 }, { n: 'Maandrapport', j: 'Social media', m: 90 }],
  ads: [{ n: 'Account-audit', j: 'Adverteren', m: 90 }, { n: 'Campagnestructuur', j: 'Adverteren', m: 120 }, { n: 'Creatives aanleveren', j: 'Adverteren', m: 120 }, { n: 'Campagne live zetten', j: 'Adverteren', m: 60 }, { n: 'Optimalisatie', j: 'Adverteren', m: 120 }, { n: 'Maandrapportage', j: 'Adverteren', m: 90 }],
  strat: [{ n: 'Intake & onderzoek', j: 'Onderzoek', m: 120 }, { n: 'Doelgroep & positionering', j: 'Strategie', m: 120 }, { n: 'Contentpijlers', j: 'Strategie', m: 120 }, { n: 'Strategie-deck', j: 'Strategie', m: 180 }, { n: 'Presentatie klant', j: 'Strategie', m: 60 }],
  opl: [{ n: 'Intake & doelstelling', j: 'Opleiding', m: 60 }, { n: 'Cursusmateriaal', j: 'Opleiding', m: 240 }, { n: 'Sessie voorbereiden', j: 'Opleiding', m: 120 }, { n: 'Opleiding geven', j: 'Opleiding', m: 240 }, { n: 'Nazorg & evaluatie', j: 'Opleiding', m: 60 }],
  auto: [{ n: 'Proces in kaart', j: 'Onderzoek', m: 120 }, { n: 'Scenario-ontwerp', j: 'Automation', m: 120 }, { n: 'Bouw & koppelingen', j: 'Automation', m: 300 }, { n: 'Test & debug', j: 'Automation', m: 120 }, { n: 'Oplevering & documentatie', j: 'Automation', m: 90 }],
};

// AI-briefing per discipline-taak, zoals het Make-scenario ("Je bent projectmanager Ilke ... briefing
// voor een teamlid, geen budgetten"). Best-effort met de gangbare fallback-keten; lege string bij falen.
async function genTaskBriefing(env, o, discipline) {
  const sys = 'Je bent projectmanager Ilke bij Studio 27. Schrijf een korte, concrete interne briefing voor het teamlid dat aan dit onderdeel gaat werken. Geef enkel relevante projectinfo, doelen en aandachtspunten. Vermeld GEEN budgetten of prijzen. Nederlands, vlot en menselijk, geen em-dashes, max ~120 woorden.';
  const ctx = `Klant: ${o.bedrijf || ''}\nOnderneming: ${o.onderneming || 'S27'}\nOfferte: ${o.titel || ''}\nOnderdeel: ${discipline}\nContext uit de offerte/aanvraag:\n${(o.brief || '').slice(0, 1500) || '(geen extra context beschikbaar)'}`;
  for (const mdl of ['gemini-2.5-flash', 'gpt-4o-mini', AI_MODEL]) {
    try { const r = await aiCompleteRaw(env, mdl, sys, ctx, 400, { platform: 'productie', skill: 'taak-briefing' }); if (r && r.text) return str(r.text).trim(); } catch (e) { /* volgende model */ }
  }
  return '';
}

// Identiteit + teams + access-flags (rollen #17).
async function opsMe(env, body) {
  const rr = await resolveRole(env, body);
  if (rr.error) return { rr, me: null };
  const email = str((rr.me && rr.me.email) || body.account_email).toLowerCase();
  let m = null; try { m = await memberByEmail(env, email); } catch (e) { /* */ }
  const teams = (m && m.teams && m.teams.length) ? m.teams : (rr.role === 'admin' ? ['management', 'ai'] : (rr.role === 'sales' || rr.role === 'accountmanager' ? ['management'] : ['uitvoerend']));
  const isMgmt = teams.indexOf('management') >= 0, isAI = teams.indexOf('ai') >= 0;
  const me = { id: (m && m.id) || '', naam: (m && m.naam) || str(rr.me && rr.me.naam), email, role: str(rr.role), teams,
    access: { finance: isMgmt, automations: isMgmt || isAI, hr: isMgmt, productie: true, crm: true } };
  return { rr, me };
}

// Genereer projecten + taken uit één gewonnen offerte. Gemodelleerd op het Make-scenario
// "[S27] [SLS] [OFF] Genereer Projecttaken": per discipline een hoofdtaak met daaronder de vaste
// productiestappen (subtaken uit TASK_TEMPLATES, elk met eigen type_job + est_min), budget op de
// hoofdtaak, en (bij opts.briefing) een AI-briefing per discipline. Taken op 'op-te-starten', pm Ilke,
// GEEN assignees (Ilke wijst manueel toe; eis #9). Alles relateert terug naar de offerte (offerte_id).
// Idempotent via vaste ids (proj_off_<id> / task_off_<id>_<branch> / sub_off_<id>_<branch>_<i>).
export async function opsGenerateForOfferte(env, o, opts) {
  opts = opts || {};
  if (!env.CRMDB || !o || !o.id) return { ok: false, reason: 'no_offerte' };
  const disc = o.disc || {};
  const discs = Object.keys(disc).filter((d) => Number(disc[d]) > 0);
  if (!discs.length) return { ok: true, projects: 0, tasks: 0, subtasks: 0, reason: 'no_disciplines' };
  const klant = o.bedrijf || 'Klant';
  const org = o.onderneming || 'S27';
  const projId = 'proj_off_' + o.id;
  const primary = discs.slice().sort((a, b) => Number(disc[b]) - Number(disc[a]))[0];
  const pb = DISC_BRANCH[primary] || ['web', 'Projectmanagement'];
  const won = o.status_cat === 'won';
  const existedP = await opsGet(env, 'projects', projId);
  const now = Date.now();
  await opsUpsert(env, 'projects', { id: projId, naam: klant + ' - ' + (o.titel || ''), company_id: o.bedrijf_id || '', contact_id: o.contact_id || '', branch: pb[0], org, status: won ? 'in-progress' : 'op-te-starten', pm: 'Ilke', budget: o.budget || 0, brief: o.brief || '', offerte_id: o.id, drive: '', created_at: o.ts || now, updated_at: now, last_activity_at: now });
  try {
    await entityLinkPut(env, { source_type: 'project', source_id: projId, target_type: 'offerte', target_id: o.id, relation: 'generated_from' });
    if (o.bedrijf_id) await entityLinkPut(env, { source_type: 'project', source_id: projId, target_type: 'company', target_id: o.bedrijf_id, relation: 'for' });
    if (o.contact_id) await entityLinkPut(env, { source_type: 'project', source_id: projId, target_type: 'contact', target_id: o.contact_id, relation: 'contact' });
  } catch (e) { /* */ }
  let projects = existedP ? 0 : 1, tasks = 0, subs = 0; const made = [];
  for (const d of discs) {
    const mb = DISC_BRANCH[d] || ['web', 'Projectmanagement'];
    const tid = 'task_off_' + o.id + '_' + mb[0];
    const tpl = TASK_TEMPLATES[mb[0]] || [];
    const existedT = await opsGet(env, 'tasks', tid);
    // AI-briefing (best-effort) enkel wanneer gevraagd, en niet overschrijven als ze al bestaat.
    let brief = (existedT && str(existedT.brief)) || o.brief || '';
    if (opts.briefing && !(existedT && str(existedT.brief).length > 40)) {
      const b = await genTaskBriefing(env, o, d); if (b) brief = b;
    }
    const estTotal = tpl.reduce((s, t) => s + (Number(t.m) || 0), 0);
    // Hoofdtaak = container: est_min 0 zodat de Bezetting-view de uren niet dubbel telt (de subtaken
    // dragen de echte raming; rollup is louter weergave). Spiegelt ClickUp-parent-semantiek.
    await opsUpsert(env, 'tasks', { id: tid, name: d + ' - ' + klant, company_id: o.bedrijf_id || '', contact_id: o.contact_id || '', project_id: projId, parent_id: '', type_job: mb[1], branch: mb[0], org, status: 'op-te-starten', pm: 'Ilke', people: '[]', budget: Number(disc[d]) || 0, est_min: 0, brief, offerte_id: o.id, briefing_id: o.briefing_id || '', created_at: (existedT && existedT.created_at) || now, updated_at: now, last_activity_at: now });
    try {
      await entityLinkPut(env, { source_type: 'task', source_id: tid, target_type: 'project', target_id: projId, relation: 'belongs_to' });
      await entityLinkPut(env, { source_type: 'task', source_id: tid, target_type: 'offerte', target_id: o.id, relation: 'generated_from' });
      if (o.bedrijf_id) await entityLinkPut(env, { source_type: 'task', source_id: tid, target_type: 'company', target_id: o.bedrijf_id, relation: 'for' });
      if (o.contact_id) await entityLinkPut(env, { source_type: 'task', source_id: tid, target_type: 'contact', target_id: o.contact_id, relation: 'contact' });
    } catch (e) { /* */ }
    if (!existedT) { tasks++; made.push({ id: tid, discipline: d, branch: mb[0], budget: Number(disc[d]) || 0, subtasks: tpl.length }); }
    // Vaste productiestappen als subtaken onder de hoofdtaak.
    for (let i = 0; i < tpl.length; i++) {
      const st = tpl[i]; const sid = 'sub_off_' + o.id + '_' + mb[0] + '_' + i;
      const existedS = await opsGet(env, 'tasks', sid);
      await opsUpsert(env, 'tasks', { id: sid, name: st.n, company_id: o.bedrijf_id || '', contact_id: o.contact_id || '', project_id: projId, parent_id: tid, type_job: st.j || mb[1], branch: mb[0], org, status: 'op-te-starten', pm: 'Ilke', people: '[]', budget: 0, est_min: Number(st.m) || 0, brief: '', offerte_id: o.id, created_at: (existedS && existedS.created_at) || now, updated_at: now, last_activity_at: now });
      try {
        await entityLinkPut(env, { source_type: 'task', source_id: sid, target_type: 'task', target_id: tid, relation: 'subtask_of' });
        await entityLinkPut(env, { source_type: 'task', source_id: sid, target_type: 'project', target_id: projId, relation: 'belongs_to' });
      } catch (e) { /* */ }
      if (!existedS) subs++;
    }
  }
  return { ok: true, project_id: projId, projects, tasks, subtasks: subs, made };
}
export async function opsGenerateFromOffertes(env, opts) {
  opts = opts || {};
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  const sinceDays = Number(opts.sinceDays) || 120;
  const cutoff = Date.now() - sinceDays * 24 * 3600 * 1000;
  const offs = await offerteList(env);
  let projects = 0, tasks = 0;
  for (const o of offs) {
    const active = o.status_cat === 'open' || (o.status_cat === 'won' && (o.ts || 0) >= cutoff);
    if (!active) continue;
    const r = await opsGenerateForOfferte(env, o);
    projects += (r && r.projects) || 0; tasks += (r && r.tasks) || 0;
  }
  return { ok: true, projects, tasks };
}

export async function prodData(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const { me } = await opsMe(env, body); if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  let members = [], tasks = [], projects = [], weddings = [], leaves = [], companies = [], contacts = [], subscriptions = [];
  const limit = Math.max(1, Math.min(5000, Number(body.limit) || 1000));
  const offset = Math.max(0, Number(body.offset) || 0);
  const listOpts = {
    limit,
    offset,
    include_archived: body.include_archived === true || body.include_archived === '1',
    archived: body.archived === true || body.archived === '1',
    branch: str(body.branch),
    status: str(body.status),
    company_id: str(body.company_id),
    project_id: str(body.project_id),
  };
  let task_total = 0;
  try {
    [members, tasks, projects, weddings, leaves, task_total] = await Promise.all([
      membersAll(env),
      tasksList(env, listOpts),
      projectsList(env, { limit: 1000, include_archived: listOpts.include_archived, archived: listOpts.archived }),
      weddingsAll(env, { limit: 1000, include_archived: listOpts.include_archived, archived: listOpts.archived }),
      leavesAll(env),
      tasksCount(env, listOpts),
    ]);
  } catch (e) { /* */ }
  try {
    [companies, contacts, subscriptions] = await Promise.all([
      companyList(env).then((rows) => rows.map((c) => ({
        id: c.id, naam: c.naam, org: c.org, website: c.website, locatie: c.locatie, drive: c.drive,
        contact: c.hoofd_contact, fact_email: c.fact_email, pm: c.pm, belangrijk: !!c.belangrijk,
        type_job: c.type_job, ga4: c.ga4, gsc: c.gsc, gads: c.gads, meta_ads: c.meta_ads,
        metricool: c.metricool, webflow: c.webflow, portaal_url: c.portaal_url, portaal_modules: c.portaal_modules,
      }))),
      contactList(env),
      companySubscriptionList(env),
    ]);
  } catch (e) { /* */ }
  return { status: 200, body: { ok: true, me, members, tasks, projects, weddings, leaves, companies, contacts, subscriptions, paging: { limit, offset, total: task_total, has_more: offset + tasks.length < task_total }, branches: PROD_BRANCHES, statuses: PROD_STATUSES, jobtypes: PROD_JOBTYPES, aiButtons: await aiButtonsAll(env).catch(() => []) } };
}
export async function prodTaskGet(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const t = await taskGet(env, str(body.id)); if (!t) return { status: 200, body: { ok: false, error: 'not_found' } };
  const company = t.company_id ? await companyGet(env, t.company_id) : null;
  return { status: 200, body: { ok: true, task: t, company, comments: await commentsForTask(env, t.id) } };
}
export async function prodTaskSave(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const { me } = await opsMe(env, body); if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  const t = body.task || {}; const id = str(t.id) || newId('task');
  const now = Date.now();
  const people = Array.isArray(t.people) ? t.people : [];
  const obj = { id, name: str(t.name), company_id: str(t.company_id), project_id: str(t.project_id), parent_id: str(t.parent_id),
    contact_id: str(t.contact_id), candidate_id: str(t.candidate_id), vacature_id: str(t.vacature_id), wedding_id: str(t.wedding_id),
    type_job: str(t.type_job), branch: str(t.branch), org: str(t.org) || 'S27', status: str(t.status) || 'op-te-starten',
    priority: ['low', 'medium', 'high'].indexOf(str(t.priority)) >= 0 ? str(t.priority) : 'medium', pm: str(t.pm),
    people: JSON.stringify(people), budget: Number(t.budget) || 0, regie: t.regie ? 1 : 0,
    start: t.start || null, deadline: t.deadline || null, est_min: Number(t.est_min) || 0, brief: str(t.brief),
    offerte_id: str(t.offerte_id), briefing_id: str(t.briefing_id), updated_at: now, last_activity_at: now };
  if (!str(t.id)) obj.created_at = now;
  await opsUpsert(env, 'tasks', obj);
  await syncTaskAssignees(env, id, people);
  try {
    if (obj.project_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'project', target_id: obj.project_id, relation: obj.parent_id ? 'subtask_in_project' : 'belongs_to' });
    if (obj.company_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'company', target_id: obj.company_id, relation: 'for' });
    if (obj.contact_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'contact', target_id: obj.contact_id, relation: 'contact' });
    if (obj.offerte_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'offerte', target_id: obj.offerte_id, relation: 'related' });
    if (obj.wedding_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'wedding', target_id: obj.wedding_id, relation: 'related' });
    if (obj.candidate_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'candidate', target_id: obj.candidate_id, relation: 'related' });
    if (obj.vacature_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'vacature', target_id: obj.vacature_id, relation: 'related' });
  } catch (e) { /* */ }
  return { status: 200, body: { ok: true, task: await taskGet(env, id) } };
}
export async function prodTaskStatus(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.id), status = str(body.status); if (!id || PROD_STATUSES.indexOf(status) < 0) return { status: 400, body: { ok: false, error: 'bad' } };
  await taskStatusPatch(env, id, status);
  return { status: 200, body: { ok: true } };
}
export async function prodTaskComment(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const { me } = await opsMe(env, body); if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  const id = newId('cm');
  await opsUpsert(env, 'task_comments', { id, task_id: str(body.task_id), who: me.naam, member_id: me.id, text: str(body.text).slice(0, 6000), internal: body.internal === false ? 0 : 1, created_at: Date.now() });
  try { await opsUpsert(env, 'tasks', { id: str(body.task_id), updated_at: Date.now(), last_activity_at: Date.now() }); } catch (e) { /* */ }
  return { status: 200, body: { ok: true, comments: await commentsForTask(env, str(body.task_id)) } };
}
export async function prodWeekplan(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.id); if (!id) return { status: 400, body: { ok: false } };
  await opsUpsert(env, 'tasks', { id, plan_start: body.plan_start || null, plan_end: body.plan_end || null, updated_at: Date.now(), last_activity_at: Date.now() });
  return { status: 200, body: { ok: true } };
}
export async function prodTaskDelete(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.id); if (!id) return { status: 400, body: { ok: false } };
  const ok = await taskArchive(env, id, str(rr.me && rr.me.naam), str(body.reason || 'manual'));
  return { status: 200, body: { ok, archived: ok } };
}
// prodTaskPatch: generieke real-time veld-update op een opsdb-productietaak (assignee/deadline/
// est/type/org/regie/budget/brief/planning). Whitelist + type-coercie + partiële opsUpsert.
const PROD_TASK_WL = ['name', 'company_id', 'contact_id', 'project_id', 'parent_id', 'candidate_id', 'vacature_id', 'wedding_id', 'type_job', 'branch', 'org', 'status', 'priority', 'pm', 'people', 'budget', 'regie', 'start', 'deadline', 'est_min', 'brief', 'pm_veld', 'rating', 'drive', 'track', 'offerte_id', 'plan_start', 'plan_end', 'archived'];
const PROD_TASK_NUM = { budget: 1, start: 1, deadline: 1, est_min: 1, rating: 1, plan_start: 1, plan_end: 1 };
const PROD_TASK_BOOL = { regie: 1, track: 1, archived: 1 };
export async function prodTaskPatch(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  const id = str(body.id); if (!id) return { status: 400, body: { ok: false, error: 'no_id' } };
  const patch = (body.patch && typeof body.patch === 'object') ? body.patch : {};
  const ex = await taskGet(env, id); if (!ex) return { status: 200, body: { ok: false, error: 'not_found' } };
  const obj = { id, updated_at: Date.now(), last_activity_at: Date.now() }; let n = 0, peopleUpdated = false;
  for (const c of Object.keys(patch)) {
    if (PROD_TASK_WL.indexOf(c) < 0) continue;
    let v = patch[c];
    if (c === 'people') { peopleUpdated = true; v = JSON.stringify(Array.isArray(v) ? v : []); }
    else if (PROD_TASK_BOOL[c]) v = v ? 1 : 0;
    else if (PROD_TASK_NUM[c]) { if (v === '' || v == null) { v = null; } else { v = Number(v); if (isNaN(v)) v = null; } }
    else if (c === 'priority') v = ['low', 'medium', 'high'].indexOf(String(v)) >= 0 ? String(v) : 'medium';
    else v = (v == null) ? '' : String(v);
    obj[c] = v; n++;
  }
  if (!n) return { status: 400, body: { ok: false, error: 'no_fields' } };
  if (obj.status && /^(done|klaar-voor-facturatie|gefactureerd)$/i.test(obj.status)) obj.completed_at = Date.now();
  else if (obj.status && !/^(done|klaar-voor-facturatie|gefactureerd)$/i.test(obj.status)) obj.completed_at = null;
  await opsUpsert(env, 'tasks', obj);
  if (peopleUpdated) await syncTaskAssignees(env, id, patch.people);
  try {
    const next = Object.assign({}, ex, patch);
    if (next.project_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'project', target_id: next.project_id, relation: next.parent_id ? 'subtask_in_project' : 'belongs_to' });
    if (next.company_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'company', target_id: next.company_id, relation: 'for' });
    if (next.contact_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'contact', target_id: next.contact_id, relation: 'contact' });
    if (next.offerte_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'offerte', target_id: next.offerte_id, relation: 'related' });
    if (next.wedding_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'wedding', target_id: next.wedding_id, relation: 'related' });
    if (next.candidate_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'candidate', target_id: next.candidate_id, relation: 'related' });
    if (next.vacature_id) await entityLinkPut(env, { source_type: 'task', source_id: id, target_type: 'vacature', target_id: next.vacature_id, relation: 'related' });
  } catch (e) { /* */ }
  return { status: 200, body: { ok: true, id, updated: Object.keys(obj).filter((k) => k !== 'id' && k !== 'updated_at') } };
}
export async function crmWeddings(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const rr = await resolveRole(env, body); if (rr.error) return rr.error;
  return { status: 200, body: { ok: true, weddings: await weddingsAll(env) } };
}
export async function opsRegistry(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const { me } = await opsMe(env, body); if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  if (!me.access.automations) return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  const [automations, integrations, aiButtons] = await Promise.all([automationsAll(env), integrationsAll(env), aiButtonsAll(env)]);
  return { status: 200, body: { ok: true, automations, integrations, aiButtons } };
}
export async function profielData(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const { me } = await opsMe(env, body); if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  // admin mag een ander teamlid bekijken (profiel-van + AI-geheugen)
  let target = me.id; const reqId = str(body.member_id);
  if (reqId && reqId !== me.id && me.role === 'admin') target = reqId;
  const settings = await settingsUser(env, target);
  return { status: 200, body: { ok: true, me, target, settings, members: me.role === 'admin' ? await membersAll(env) : [] } };
}
export async function profielSave(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const { me } = await opsMe(env, body); if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  await opsUpsert(env, 'settings_user', { member_id: me.id, tone: JSON.stringify(body.tone || {}), notif: JSON.stringify(body.notif || {}), whatsapp: str(body.whatsapp), updated_at: Date.now() });
  return { status: 200, body: { ok: true } };
}
export async function aiMemory(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const { me } = await opsMe(env, body); if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  let target = me.id; const reqId = str(body.member_id);
  if (reqId && reqId !== me.id && me.role !== 'admin') return { status: 403, body: { ok: false, error: 'forbidden_role' } };
  if (reqId) target = reqId;
  return { status: 200, body: { ok: true, target, items: await aiMemoryFor(env, target, 150) } };
}
export async function aiMemoryAdd(_b, body, env) {
  if (!okStaff(body)) return { status: 403, body: { ok: false } };
  const { me } = await opsMe(env, body); if (!me) return { status: 200, body: { ok: false, error: 'no_member' } };
  const id = newId('mem');
  await opsUpsert(env, 'ai_memory', { id, member_id: me.id, agent_id: str(body.agent_id), bedrijf_id: str(body.bedrijf_id), kind: str(body.kind) || 'note', rol: str(body.rol) || 'gebruiker', tekst: str(body.tekst).slice(0, 8000), bronnen: JSON.stringify(body.bronnen || []), pinned: body.pinned ? 1 : 0, created_at: Date.now() });
  return { status: 200, body: { ok: true, items: await aiMemoryFor(env, me.id, 150) } };
}

/* ---- dispatch-tabel (worker.js gate't op is_staff) ------------------------ */
export const TEAM_HANDLERS = {
  crmData,
  crmMeetingTranscript,
  crmEntityUpdate,
  crmSubscriptionUpdate,
  crmOfferteMail,
  crmOfferteCreate,
  crmOfferteSetManager,
  crmOfferteSetStatus,
  crmOfferteGenerateTasks,
  crmCompany,
  crmOfferte,
  financeData,
  prodData,
  prodTaskGet,
  prodTaskSave,
  prodTaskStatus,
  prodTaskComment,
  prodWeekplan,
  prodTaskDelete,
  prodTaskPatch,
  crmWeddings,
  opsRegistry,
  profielData,
  profielSave,
  aiMemory,
  aiMemoryAdd,
  teamMe,
  teamTaken,
  teamProject,
  teamTimerStart,
  teamTimerStop,
  teamTimerCurrent,
  teamStatus,
  teamProjectChat,
  teamProjectChatPost,
  teamVerlof,
  teamVerlofAanvraag,
  teamPayrollMembers,
  teamPayrollMemberSave,
  teamPayrollLeaves,
  teamPayrollLeaveCreate,
  teamPayrollLeaveDecide,
  teamPayrollLeaveDelete,
  teamAllProjects,
  teamFinance,
  teamFinanceDetail,
  teamFinanceAdvies,
  teamSalesAdvies,
  teamRendement,
  teamRendementAdvies,
  teamAdviesChecklist,
  teamAdviesCheck,
  teamAdviesRefresh,
  teamAdviesFeedback,
  teamAdviesFeedbackList,
  teamHealth,
  teamTaskUpdate,
  teamTaskAttach,
  teamFeatureRequest,
  teamAiPlan,
  teamPlanner,
  teamPlannerAgenda,
  teamWeekplanner,
  teamThuiswerk,
  teamPlannerEventUpdate,
  teamCalEvent,
  teamCalEventDelete,
  teamCalEventInvite,
  teamCalEventMeet,
  teamCalEventCreate,
  teamTaskSchedule,
  teamCapaciteit,
  teamBerichten,
  teamShootRequests,
  teamShootRequestCreate,
  teamShootRequestRespond,
  teamSollicitaties,
  teamSollicitatieScore,
  teamKandidaatMail,
  teamKandidaatCase,
  teamKandidaatSpam,
  teamKandidaatContract,
  teamKandidaatMailSync,
  teamKandidaatMailThread,
  teamKandidaatMailSend,
  teamKandidaatDocs,
  teamHrNotifs,
  teamHrNotifMark,
  teamKandidaatTranscribe,
  teamSolStatus,
  teamVacatures,
  teamVacatureToggle,
  teamVacatureCreate,
  teamVacatureGet,
  teamVacatureUpdate,
  teamVacatureSocial,
  teamVacaturePhoto,
  teamVacatureAiDraft,
  teamOnboardingPeople,
  teamOnboardingState,
  teamOnboardingPersonSave,
  teamOnboardingPersonRemove,
  teamHrIntegrations,
  teamMonitorStatus,
  teamMonitorRecheck,
  teamMonitorAi,
  teamHrModels,
  teamHrAssistant,
  teamAssistantChat,
  teamAssistantSessions,
  teamAssistantSession,
  teamAssistantDelete,
  teamAssistantGen,
  teamHrTone,
  teamHrStats,
  teamAdsOverview,
  teamAdsDetail,
  teamAdsAsk,
  teamAdsPropose,
  teamAdsApply,
  teamAutomations,
  teamProjectStart,
  teamHealthSettings,
  teamHealthDag,
  teamHealthAdvies,
  teamHealthLog,
  teamVersionPush,
  teamAiAction,
  teamAiCatalog,
  teamAiModel,
  teamAgents,
  teamAgentKnoppen,
  teamMcpList,
  teamMcpSave,
  teamMcpDelete,
  teamMcpTest,
  teamMcpOauthStart,
  teamSkills,
  teamSkillSave,
  teamSkillDelete,
  teamSkillRun,
  teamSkillGenerate,
  teamAgentGenerate,
  teamPlugins,
  teamPluginSave,
  teamPluginDelete,
  teamPluginRun,
  teamPluginGenerate,
  teamPluginExport,
  teamPluginImport,
  teamSocials,
  teamSocialCreate,
  teamSocialAiDraft,
  teamSocialDrive,
  teamSocialDriveMark,
  teamSocialDriveRewrite,
  teamSocialDriveScan,
  teamAdsAdvies,
  teamAdsItemStatus,
  teamAdsRich,
  teamAgentSave,
  teamAgentDelete,
  teamAgentAddDoc,
  teamAgentDelDoc,
  teamAgentLogs,
  teamAgentMem,
  teamAgentMemClear,
  teamAgentChat,
  teamAiActieSave,
  teamAiActieDelete,
  teamAiActieToggle,
  teamTaskSplit,
  teamSubtaskAdd,
  teamSubtaskToggle,
  teamSubtree,
  teamGroups,
  teamGroupMember,
  teamWorkload,
  teamWorkloadCreate,
  teamEstSplit,
  teamTimeList,
  teamTimeAdd,
  teamTimeUpdate,
  teamTimeDelete,
  teamTaskSearch,
  teamWorkhoursGet,
  teamWorkhoursSave,
  teamHtmlPrepare,
  teamV9Run,
  teamOffertes,
  teamMeetings,
  teamMeetingLink,
  teamMeetingKoppel,
  teamMeetingExtra,
  teamKoppelSearch,
  teamOfferteKoppel,
  teamOfferteMail,
  teamAiCosts,
  teamAiCostsSeed,
  teamAiCostsWipe,
  teamAiPricing,
  teamAiBilling,
};
