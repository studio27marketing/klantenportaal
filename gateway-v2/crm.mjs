// ===========================================================================
// crm.mjs — ClickUp -> D1 sync voor 27CRM + 27Finance (bron-van-waarheid in CRMDB).
// Eenmalige import + uurlijkse spiegeling van de 4 offertelijsten + bedrijven +
// contactpersonen + meetings. Read-only t.o.v. ClickUp (ClickUp blijft voorlopig draaien).
// ===========================================================================
import { cu, pageAll, getCF, getRelationIds, FIELD, PANDADOC_BASE } from './handlers.mjs';
import { cdbUpsert, cdbUpsertGuarded, loadPortalOverrides, syncMetaSet, companyList, contactList, offerteList, meetingList, offerteRow } from './crmdb.mjs';
import { opsGenerateForOfferte } from './teamportaal.mjs';   // offerte gewonnen -> projecttaken per discipline

const str = (v) => (v == null ? '' : String(v));
const money = (v) => { if (v == null || v === '') return 0; const n = Number(v); return isNaN(n) ? 0 : n; };
const dateMs = (v) => { if (v == null || v === '') return null; const n = Number(v); return isNaN(n) ? null : n; };

// 4 offertelijsten (onderneming afgeleid uit de lijst).
const OFFERTE_LISTS = [['901520180289', 'S27'], ['901523697887', '27M'], ['901523698125', '27A'], ['901523698213', 'ZVD']];
const BEDR_LIST = '901520180288';
const CONT_LIST = '901520180286';
const MEET_LIST = '901520180293';

// ClickUp custom-field-ids (stabiel; gecentraliseerd zodat geen orderindex/id hardcoded raakt in de logica).
const CF = {
  // offerte
  offBudget: 'c8d2dd2c-2428-4236-ba37-a3f3cd90c9ec', offLink: '36264fc2-f348-4e14-b81c-063045ce1264',
  offPanda: '748009c1-6e97-4b87-b6bd-fadeeaa24701', offVerval: '317437a7-2508-453f-a7b9-faf040c541a9',
  offNaam: '8da934b5-7747-4ad3-ac2f-cc53cf2985e8', offUniek: 'da5a77e8-8f99-4300-880e-0c5920906b5f',
  offDoorzet: '69823cc3-e29b-48e2-a7ad-50022b47d0af', offOpstartIlke: '8044007d-2c4d-4f6e-9c4f-2f0a3e7d6b00',
  bedrijfModern: 'eb145449-a8bd-4865-a931-23eed06a9df4',  // 'Bedrijven' list_relationship op de offerte
  bedrijfLegacy: '4b1fb333-f47a-41bb-a976-dce63ed36657',
  contModern: '68a1c8f6-bdf7-417e-bced-c8bda463a239', contLegacy: '1bce8db8-717f-4e94-abdc-64feb241087c',
  meetModern: 'c3bf6723-1572-4b1b-ae1c-ef4f13f4dbca', meetLegacy: '5eab5514-5b17-4cfc-ae3b-912693d57b1f',
  // bedrijf
  org: 'd320e913-8507-4fe0-8e49-3ab669b17779', statusS27: 'e9ba9e50-752e-41a4-8697-03bb8236fa60',
  statusZvd: '33f84be4-5ffc-406c-b796-d6035153f5a3', status27a: 'bf50e27c-8877-4958-8624-49df03b54e9f',
  pm: '7fe89951-ec24-48e0-8772-16f719490205', website: '90b63173-378a-4fa8-bae8-1a513eea4eca',
  locatie: 'fcbb46ff-66d5-432c-8edb-80de053197f3', kbo: '034f4443-5b50-4176-8c91-0b6d60e5870e',
  mw: 'e72680d9-9706-40b8-9e67-564bc21855d7', factEmail: '9613b4aa-2285-485b-80a6-d1d34a96884c',
  factOpm: '36d11828-4199-4373-81db-e72f960cf902', drive: '0a0781cc-a10a-4949-82b9-ab099956214a',
  ga4: 'e3e12841-2eee-48a0-b68e-6e35cec159ca', gsc: '199aceaa-dbd8-4a97-97d8-09607f87e847',
  gads: 'b1a52056-be3a-435a-95d6-1aa338bfc065', metaAds: '1658c472-496c-480d-81bf-0c19e82d84df',
  metricool: '40f6ccd2-b25e-4385-bbca-3bfdf602e542',
  portaalUrl: 'f7a4dcae-7269-425f-b64b-d9c571d3da50', portaalToken: '4474d855-2a87-480b-b74d-83ae01420db6',
  portaalModules: 'b8effbfe-c4d6-42fb-b8ac-bc7d48a71734',
  // contact
  cVoornaam: '626a0441-8824-4381-a89a-4639ac547e23', cAchternaam: '79cbda71-626b-424c-8f78-d0785c52126a',
  cEmail: 'd453a72f-e08e-46bb-b82f-24c311fad13f', cGsm: '8cee9669-26f3-4380-b592-175c1c481c7c',
  cBedrijf: '4b1fb333-f47a-41bb-a976-dce63ed36657', cKanalen: '1f10ca20-50b2-472a-80d5-4e7ddcdfc3d2',
  // meeting
  mType: '7e9217d7-63e6-4838-9c70-15a080e33d24', mBedrijven: '64868b3a-9f0b-4f3b-a0ec-e3a81e002e17',
  mContacten: '9127fbd0-1380-4309-ade1-88c6ba92d1e4',
  mFfId: '0ffa4305-0cb3-49e2-9f12-c1d68a7f0ccc', mFfUrl: '5e63f66f-3e45-451c-ad00-84ce358e8111',
};
// 8 per-discipline budgetvelden (som vormt de offerte). Label = finance-discipline.
const DISC_FIELDS = [
  ['Strategie', '4886e03f-b1c5-4f3d-b008-8bcfa705d61b'],
  ['Branding', '202a3a48-4359-417c-8dc0-f55f387e0193'],
  ['Video- en fotografie', 'e62b02a6-7b3d-4dd7-9d2c-fbd8ac49685d'],
  ['Webdesign', 'a323d440-9b0d-4d59-8506-a605e4606d03'],
  ['Social media', 'ee9b588c-47b7-4fc9-9f52-96c7119ce223'],
  ['Adverteren', '5aa490a4-6987-4851-96e9-3fc6e9c6e513'],
  ['Automations', '58316ada-9581-417d-bf97-274b7a64687a'],
  ['Opleidingen', 'bd049d39-3464-496f-afb2-b6418e57af67'],
];
const ORG_BY_IDX = { 0: 'S27', 1: 'ZVD', 2: '27A', 3: '27M' };

function statusCat(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'completed') return 'won';
  if (s === 'declined' || s === 'expired') return 'lost';
  if (s === 'archived') return 'archived';
  return 'open';
}
function locText(v) { if (!v) return ''; if (typeof v === 'object') return str(v.formatted_address || v.location || ''); return str(v); }
function firstUser(v) { if (Array.isArray(v) && v.length) return str(v[0].username || v[0].email || v[0].initials || ''); return ''; }
function labelArr(v) { if (!Array.isArray(v)) return []; return v.map((x) => str((x && (x.label || x.name)) || x)).filter(Boolean); }

// Dropdown-optie-resolver per lijst (orderindex -> naam), gecachet per isolate.
const _optCache = {};
async function listOptions(env, listId) {
  if (_optCache[listId] && (Date.now() - _optCache[listId]._at) < 6 * 3600 * 1000) return _optCache[listId];
  const out = { _at: Date.now() };
  try {
    const r = await cu.get(env, `/list/${listId}/field`);
    const fields = (r && r.ok && r.data && Array.isArray(r.data.fields)) ? r.data.fields : [];
    for (const f of fields) {
      const opts = (f.type_config && Array.isArray(f.type_config.options)) ? f.type_config.options : [];
      if (opts.length) { const m = {}; for (const o of opts) m[Number(o.orderindex)] = str(o.name != null ? o.name : o.label); out[str(f.id)] = m; }
    }
  } catch (e) { /* */ }
  _optCache[listId] = out; return out;
}
function dropLabel(opts, fieldId, val) { if (val == null || val === '') return ''; const m = opts[str(fieldId)]; return (m && m[Number(val)] != null) ? m[Number(val)] : ''; }

// ---- BEDRIJVEN ------------------------------------------------------------
export async function crmSyncCompanies(env) {
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  const opts = await listOptions(env, BEDR_LIST);
  const tasks = await pageAll(env, (p) => `/list/${BEDR_LIST}/task?archived=false&include_closed=true&subtasks=false&page=${p}`, 12);
  const ovr = await loadPortalOverrides(env, 'companies');
  let n = 0;
  for (const t of tasks) {
    const org = ORG_BY_IDX[Number(getCF(t, CF.org))] || dropLabel(opts, CF.org, getCF(t, CF.org)) || '';
    const sS27 = dropLabel(opts, CF.statusS27, getCF(t, CF.statusS27));
    const sZvd = dropLabel(opts, CF.statusZvd, getCF(t, CF.statusZvd));
    const s27a = dropLabel(opts, CF.status27a, getCF(t, CF.status27a));
    // kaart: actief klant ergens -> klant; anders potentieel; intern als naam/merk intern is
    const statuses = [sS27, sZvd, s27a].map((x) => x.toLowerCase());
    let kaart = 'potentieel';
    if (statuses.some((x) => /actief klant/.test(x))) kaart = 'klant';
    else if (statuses.every((x) => !x || /geen potentieel|geen actieve/.test(x))) kaart = 'potentieel';
    await cdbUpsertGuarded(env, 'companies', {
      id: str(t.id), naam: str(t.name), org, kaart, status_s27: sS27, status_zvd: sZvd, status_27a: s27a,
      pm: firstUser(getCF(t, CF.pm)), type_job: '', website: str(getCF(t, CF.website)), locatie: locText(getCF(t, CF.locatie)),
      kbo: str(getCF(t, CF.kbo)), mw: (getCF(t, CF.mw) == null ? null : Number(getCF(t, CF.mw))),
      fact_email: str(getCF(t, CF.factEmail)), fact_opm: str(getCF(t, CF.factOpm)), drive: str(getCF(t, CF.drive)),
      hoofd_contact: '', ga4: str(getCF(t, CF.ga4)), gsc: str(getCF(t, CF.gsc)), gads: str(getCF(t, CF.gads)), meta_ads: str(getCF(t, CF.metaAds)),
      metricool: str(getCF(t, CF.metricool)), webflow: '', portaal_url: str(getCF(t, CF.portaalUrl)),
      portaal_token: str(getCF(t, CF.portaalToken)), portaal_modules: labelArr(getCF(t, CF.portaalModules)).join(', '),
      clickup_id: str(t.id), created_at: Number(t.date_created) || Date.now(), updated_at: Date.now(),
    }, ovr);
    n++;
  }
  return { ok: true, n };
}

// ---- CONTACTPERSONEN ------------------------------------------------------
export async function crmSyncContacts(env) {
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  const tasks = await pageAll(env, (p) => `/list/${CONT_LIST}/task?archived=false&include_closed=true&subtasks=false&page=${p}`, 12);
  const ovr = await loadPortalOverrides(env, 'contacts');
  let n = 0;
  for (const t of tasks) {
    const vn = str(getCF(t, CF.cVoornaam)), an = str(getCF(t, CF.cAchternaam));
    await cdbUpsertGuarded(env, 'contacts', {
      id: str(t.id), voornaam: vn || str(t.name), achternaam: an, email: str(getCF(t, CF.cEmail)), gsm: str(getCF(t, CF.cGsm)),
      bedrijf_id: getRelationIds(t, CF.cBedrijf)[0] || '', notif: '', kanalen: JSON.stringify(labelArr(getCF(t, CF.cKanalen))),
      clickup_id: str(t.id), created_at: Number(t.date_created) || Date.now(), updated_at: Date.now(),
    }, ovr);
    n++;
  }
  return { ok: true, n };
}

// ---- MEETINGS -------------------------------------------------------------
export async function crmSyncMeetings(env) {
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  const opts = await listOptions(env, MEET_LIST);
  const tasks = await pageAll(env, (p) => `/list/${MEET_LIST}/task?archived=false&include_closed=true&subtasks=false&order_by=due_date&reverse=true&page=${p}`, 10);
  const ovr = await loadPortalOverrides(env, 'meetings');
  let n = 0;
  for (const t of tasks) {
    const typeIdx = getCF(t, CF.mType);
    const type = typeIdx == null ? '' : (Number(typeIdx) === 0 ? 'SALES' : Number(typeIdx) === 1 ? 'PROJECT' : dropLabel(opts, CF.mType, typeIdx));
    const sam = str(t.markdown_description || t.text_content || t.description || '');
    await cdbUpsertGuarded(env, 'meetings', {
      id: str(t.id), titel: str(t.name), type, org: dropLabel(opts, CF.org, getCF(t, CF.org)) || '', datum: dateMs(t.due_date),
      status: str(t.status && t.status.status), bedrijf_id: getRelationIds(t, CF.mBedrijven)[0] || getRelationIds(t, CF.bedrijfLegacy)[0] || '',
      contact_id: getRelationIds(t, CF.mContacten)[0] || '', ff: str(getCF(t, CF.mFfId)), ff_url: str(getCF(t, CF.mFfUrl)), samenvatting: sam,
      clickup_id: str(t.id), created_at: Number(t.date_created) || Date.now(), updated_at: Date.now(),
    }, ovr);
    n++;
  }
  return { ok: true, n };
}

// ---- OFFERTES (de spil) ---------------------------------------------------
export async function crmSyncOffertes(env) {
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  // Cutoff: ClickUp/Make-offertes die NA dit tijdstip zijn aangemaakt komen NIET in het portaal
  // (transitieperiode: nieuwe offertes ontstaan in het nieuwe systeem; historische blijven). 0 = uit.
  let cutoff = 0; try { cutoff = Number(await env.KV.get('crm:offerte-cutoff')) || 0; } catch (e) { /* */ }
  // naam-maps uit D1 (bedrijven/contacten zijn vooraf gesynct in crmSyncAll)
  const comps = await companyList(env); const compName = {}; comps.forEach((c) => { compName[c.id] = c.naam; });
  const conts = await contactList(env); const contName = {}; conts.forEach((c) => { contName[c.id] = c.naam; });
  const ovr = await loadPortalOverrides(env, 'offertes');
  let n = 0, skipped = 0;
  for (const [listId, org] of OFFERTE_LISTS) {
    let tasks = [];
    try { tasks = await pageAll(env, (p) => `/list/${listId}/task?archived=false&include_closed=true&subtasks=false&order_by=created&reverse=true&page=${p}`, 12); } catch (e) { tasks = []; }
    for (const t of tasks) {
      if (cutoff && Number(t.date_created) > cutoff) { skipped++; continue; }   // nieuwe ClickUp/Make-offerte -> niet in portaal
      const bid = getRelationIds(t, CF.bedrijfLegacy)[0] || getRelationIds(t, CF.bedrijfModern)[0] || '';
      const cid = getRelationIds(t, CF.contModern)[0] || getRelationIds(t, CF.contLegacy)[0] || '';
      const mid = getRelationIds(t, CF.meetModern)[0] || getRelationIds(t, CF.meetLegacy)[0] || '';
      const raw = str(t.status && t.status.status).toLowerCase();
      const disc = {}; for (const [lab, fid] of DISC_FIELDS) { const v = money(getCF(t, fid)); if (v) disc[lab] = v; }
      await cdbUpsertGuarded(env, 'offertes', {
        id: str(t.id), titel: str(t.name), onderneming: org, status: raw, status_cat: statusCat(raw),
        bedrijf_id: bid, bedrijf_naam: compName[bid] || str(getCF(t, CF.offNaam)) || '',
        contact_id: cid, contact_naam: contName[cid] || '', meeting_id: mid, briefing_id: '',
        // Project manager = de ClickUp-ASSIGNEE (e-mail bij voorkeur, mapt naar teamnaam in de frontend).
        // Geen assignee -> terugvallen op de creator (= altijd Vincent): onbeheerde offertes komen zo bij Vincent.
        owner: (Array.isArray(t.assignees) && t.assignees[0] ? str(t.assignees[0].email || t.assignees[0].username).toLowerCase() : '') || str(t.creator && t.creator.username),
        budget: money(getCF(t, CF.offBudget)), disc: JSON.stringify(disc),
        panda_id: str(getCF(t, CF.offPanda)), panda_link: str(getCF(t, CF.offLink)), code: str(getCF(t, CF.offUniek)),
        verval: dateMs(getCF(t, CF.offVerval)), doorzet: '', opstart: (getCF(t, CF.offOpstartIlke) ? 1 : 0),
        clickup_id: str(t.id), created_at: Number(t.date_created) || Date.now(), updated_at: Date.now(),
      }, ovr);
      n++;
    }
  }
  return { ok: true, n, skipped, cutoff };
}

// ---- RELINK: koppel contacten <-> bedrijven uit ALLE ClickUp-signalen --------
// Vult lege contact.bedrijf_id (en offerte.bedrijf_id) op basis van: (1) het
// "Contact"-relatieveld op het bedrijf (1bce8db8), (2) transitief via offertes en
// meetings die zowel een bedrijf als contact koppelen. Raakt nooit een al ingevuld
// veld aan (expliciete contact.Bedrijf-relatie blijft leidend). Idempotent.
export async function crmRelink(env) {
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  const c2b = {};   // contactId -> companyId (afgeleid)
  // 1) bedrijf "Contact"-relatie (inverse: bedrijf -> contacten)
  let fromCompanyRel = 0;
  try {
    const compTasks = await pageAll(env, (p) => `/list/${BEDR_LIST}/task?archived=false&include_closed=true&subtasks=false&page=${p}`, 12);
    for (const t of compTasks) {
      for (const cid of getRelationIds(t, CF.contLegacy)) { if (cid && !c2b[cid]) { c2b[cid] = str(t.id); fromCompanyRel++; } }
    }
  } catch (e) { /* */ }
  // 2) transitief uit D1 (offertes + meetings die bedrijf én contact koppelen)
  let offs = [], meets = [], conts = [];
  try { [offs, meets, conts] = await Promise.all([offerteList(env), meetingList(env), contactList(env)]); } catch (e) { /* */ }
  for (const o of offs) { if (o.contact_id && o.bedrijf_id && !c2b[o.contact_id]) c2b[o.contact_id] = o.bedrijf_id; }
  for (const m of meets) { if (m.contact_id && m.bedrijf_id && !c2b[m.contact_id]) c2b[m.contact_id] = m.bedrijf_id; }
  // 3) contacten met lege bedrijf_id invullen
  let linkedContacts = 0;
  for (const c of conts) {
    if (c.bedrijf_id) continue;
    const bid = c2b[c.id];
    if (bid) { try { await env.CRMDB.prepare('UPDATE contacts SET bedrijf_id=?, updated_at=? WHERE id=?').bind(str(bid), Date.now(), str(c.id)).run(); linkedContacts++; } catch (e) { /* */ } }
  }
  // 4) offertes zonder bedrijf maar met contact -> bedrijf van dat contact
  const contComp = {}; conts.forEach((c) => { if (c.bedrijf_id) contComp[c.id] = c.bedrijf_id; });
  const c2bAll = Object.assign({}, contComp, c2b);
  let linkedOffertes = 0;
  for (const o of offs) {
    if (!o.bedrijf_id && o.contact_id && c2bAll[o.contact_id]) {
      const bid = c2bAll[o.contact_id];
      try { await env.CRMDB.prepare("UPDATE offertes SET bedrijf_id=?, bedrijf_naam=CASE WHEN bedrijf_naam IS NULL OR bedrijf_naam='' THEN (SELECT naam FROM companies WHERE id=?) ELSE bedrijf_naam END, updated_at=? WHERE id=?").bind(str(bid), str(bid), Date.now(), str(o.id)).run(); linkedOffertes++; } catch (e) { /* */ }
    }
  }
  // 5) e-maildomein <-> bedrijfswebsite (enkel zakelijke domeinen + UNIEKE match; nooit gokken)
  let linkedByDomain = 0;
  try {
    const FREE = new Set(['gmail.com', 'hotmail.com', 'hotmail.be', 'outlook.com', 'outlook.be', 'live.com', 'live.be', 'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'mac.com', 'msn.com', 'telenet.be', 'skynet.be', 'proximus.be', 'scarlet.be', 'pandora.be', 'belgacom.net', 'gmx.com', 'gmx.net', 'mail.com', 'ziggo.nl', 'kpnmail.nl', 'home.nl', 'planet.nl']);
    const INTERN = new Set(['studio27.be', '27moments.be', 'zorgvoordigitaal.be', '27automations.be']);
    const norm = (h) => String(h || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').replace(/\s+/g, '').trim();
    const comps = await companyList(env);
    const byDomain = {}, dup = {};
    for (const c of comps) { const d = norm(c.website); if (!d || d.indexOf('.') < 0) continue; if (byDomain[d] && byDomain[d] !== c.id) dup[d] = true; else byDomain[d] = c.id; }
    const conts3 = await contactList(env);
    for (const c of conts3) {
      if (c.bedrijf_id) continue;
      const em = String(c.email || '').toLowerCase().trim(); const at = em.indexOf('@'); if (at < 0) continue;
      const dom = em.slice(at + 1).trim(); if (!dom || FREE.has(dom) || INTERN.has(dom) || dup[dom]) continue;
      const bid = byDomain[dom];
      if (bid) { try { await env.CRMDB.prepare('UPDATE contacts SET bedrijf_id=?, updated_at=? WHERE id=?').bind(str(bid), Date.now(), str(c.id)).run(); linkedByDomain++; } catch (e) { /* */ } }
    }
  } catch (e) { /* */ }
  // 6) bedrijf.hoofd_contact invullen waar leeg (één vertegenwoordiger per bedrijf)
  let namedCompanies = 0;
  try {
    const conts2 = await contactList(env); const byComp = {};
    conts2.forEach((c) => { if (c.bedrijf_id && !byComp[c.bedrijf_id]) byComp[c.bedrijf_id] = ((c.voornaam || '') + ' ' + (c.achternaam || '')).trim(); });
    for (const bid in byComp) { if (!byComp[bid]) continue; try { const r = await env.CRMDB.prepare("UPDATE companies SET hoofd_contact=? WHERE id=? AND (hoofd_contact IS NULL OR hoofd_contact='')").bind(byComp[bid], str(bid)).run(); if (r && r.meta && r.meta.changes) namedCompanies += r.meta.changes; } catch (e) { /* */ } }
  } catch (e) { /* */ }
  return { ok: true, linkedContacts, linkedByDomain, linkedOffertes, namedCompanies, fromCompanyRel };
}

// ---- PANDADOC status-sync (direct, los van ClickUp) -----------------------
// Pollt de PandaDoc-API per offerte (GET /documents/{id}) en werkt offerte.status +
// status_cat bij. Standaard enkel NIET-terminale offertes (open: draft/sent/viewed) —
// completed/declined/expired veranderen niet meer. Opts: {all:true} = alle, {limit:n}.
const PD_STATUS_MAP = {
  'document.draft': 'draft', 'document.sent': 'sent', 'document.viewed': 'viewed',
  'document.waiting_approval': 'sent', 'document.approved': 'sent', 'document.external_review': 'viewed',
  'document.rejected': 'declined', 'document.declined': 'declined', 'document.voided': 'declined',
  'document.waiting_pay': 'completed', 'document.paid': 'completed', 'document.completed': 'completed',
  'document.expired': 'expired',
};
// Leidt 'verzonden door' af uit een PandaDoc-document: het @studio27.be-teamlid dat als
// Projectmanager (of anders als recipient/eigenaar) gekoppeld is. Leeg = onbekend.
export function senderFromDoc(d) {
  const recs = (d && d.recipients) || [];
  const pm = recs.find((x) => /projectmanager/i.test(str(x && x.role)) && /@/.test(str(x && x.email)));
  if (pm) return str(pm.email).toLowerCase();
  const s27 = recs.find((x) => /@studio27\.be$/i.test(str(x && x.email).trim()));
  if (s27) return str(s27.email).toLowerCase();
  const owner = d && (d.created_by || d.sent_by || d.owner);
  if (owner && owner.email) return str(owner.email).toLowerCase();
  return '';
}
export async function pandadocSyncStatuses(env, opts) {
  opts = opts || {};
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  if (!env.PANDADOC_API_KEY) return { ok: false, reason: 'no_pandadoc_key' };
  // PandaDoc-limiet ~100/min + worker-tijdslimiet -> batch-gewijs, stalest-first (oudst gecontroleerde
  // open offertes eerst). Elke gecontroleerde offerte krijgt updated_at bijgewerkt zodat de uurlijkse
  // cron alles roteert. opts: {all:true}=ook terminale, {limit:n}=batchgrootte, {delay:ms}.
  const limit = Math.max(1, Math.min(60, Number(opts.limit) || 25));
  const where = opts.all ? "panda_id!=''" : "panda_id!='' AND status_cat='open'";
  let list = [];
  try { const rr = await env.CRMDB.prepare(`SELECT id, panda_id, status FROM offertes WHERE ${where} ORDER BY updated_at ASC LIMIT ?`).bind(limit).all(); list = (rr && rr.results) || []; } catch (e) { list = []; }
  const delay = opts.delay == null ? 650 : Number(opts.delay);   // ~92/min, onder de PandaDoc-limiet
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  let checked = 0, changed = 0, errors = 0;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (i > 0 && delay) await sleep(delay);
    try {
      let r = await fetch(`${PANDADOC_BASE}/documents/${str(o.panda_id)}`, { headers: { Authorization: `API-Key ${str(env.PANDADOC_API_KEY)}` } });
      if (r.status === 429) { await sleep(3000); r = await fetch(`${PANDADOC_BASE}/documents/${str(o.panda_id)}`, { headers: { Authorization: `API-Key ${str(env.PANDADOC_API_KEY)}` } }); }   // 1x backoff-retry
      if (!r.ok) { errors++; try { await env.CRMDB.prepare('UPDATE offertes SET updated_at=? WHERE id=?').bind(Date.now(), str(o.id)).run(); } catch (e) { /* */ } continue; }   // ontoegankelijk/verwijderd PandaDoc-doc -> roteer naar achter
      const d = await r.json().catch(() => ({}));
      const mapped = PD_STATUS_MAP[str(d.status)] || '';
      checked++;
      const now = Date.now();
      if (mapped && mapped !== str(o.status)) {
        const cat = (mapped === 'completed') ? 'won' : (mapped === 'declined' || mapped === 'expired') ? 'lost' : 'open';
        await env.CRMDB.prepare('UPDATE offertes SET status=?, status_cat=?, updated_at=? WHERE id=?').bind(mapped, cat, now, str(o.id)).run();
        changed++;
        if (mapped === 'completed') { try { const row = await env.CRMDB.prepare('SELECT * FROM offertes WHERE id=?').bind(str(o.id)).first(); if (row) await opsGenerateForOfferte(env, offerteRow(row)); } catch (e) { /* */ } }   // gewonnen -> taken

      } else {
        await env.CRMDB.prepare('UPDATE offertes SET updated_at=? WHERE id=?').bind(now, str(o.id)).run();   // roteer naar achter
      }
      // 'verzonden door' uit PandaDoc (PM-mail), enkel als niet handmatig overschreven
      const sender = senderFromDoc(d);
      if (sender) { try { await env.CRMDB.prepare("UPDATE offertes SET verzonden_door=? WHERE id=? AND vd_override=0").bind(sender, str(o.id)).run(); } catch (e) { /* */ } }
    } catch (e) { errors++; }
  }
  try { await syncMetaSet(env, 'crm:pandasync', JSON.stringify({ at: Date.now(), checked, changed, errors, considered: list.length })); } catch (e) { /* */ }
  return { ok: true, checked, changed, errors, considered: list.length };
}

// Zet de offerte-cutoff (transitie): nieuwe ClickUp/Make-offertes (date_created > cutoff) komen niet
// meer in het portaal. Ruimt meteen reeds-gesyncte ClickUp-offertes na de cutoff op (nieuwe-systeem-
// offertes hebben clickup_id='' en blijven dus staan). cutoff weglaten = nu; cutoff:0 = uitschakelen.
export async function crmSetOfferteCutoff(env, opts) {
  opts = opts || {};
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  const cutoff = (opts.cutoff != null) ? Number(opts.cutoff) : Date.now();
  try { await env.KV.put('crm:offerte-cutoff', String(cutoff)); } catch (e) { /* */ }
  let removed = 0;
  if (cutoff > 0) { try { const r = await env.CRMDB.prepare("DELETE FROM offertes WHERE clickup_id!='' AND created_at>?").bind(cutoff).run(); removed = (r && r.meta && r.meta.changes) || 0; } catch (e) { /* */ } }
  try { await env.KV.delete('crm:boot:v1'); } catch (e) { /* */ }   // CRM-cache leeg zodat de portaalweergave meteen klopt
  return { ok: true, cutoff, cutoff_iso: cutoff ? new Date(cutoff).toISOString() : null, removed_already_synced: removed };
}

// ---- PANDADOC webhook-ontvanger (live status-push i.p.v. pollen) -----------
// PandaDoc stuurt bij elke statuswijziging een POST met een array events. Body wordt
// ondertekend met de shared key (HMAC-SHA256 hex in ?signature=). Verifieert + werkt de
// offerte met dat document-id bij. Geen cron meer nodig.
export async function pandadocHandleWebhook(env, rawBody, signature, token) {
  if (!env.CRMDB) return { ok: false, reason: 'no_d1' };
  // Auth: óf een geldig zelf-geregistreerd token (uit KV, in de webhook-URL) óf een geldige
  // HMAC-handtekening met de shared key (env). Anti-spoofing; minstens één moet kloppen.
  let authed = false;
  try { const want = await env.KV.get('crm:pandahook:token'); if (want && token && str(token) === want) authed = true; } catch (e) { /* */ }
  if (!authed && env.PANDADOC_WEBHOOK_SECRET) {
    try {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(str(env.PANDADOC_WEBHOOK_SECRET)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody || ''));
      const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (str(signature).toLowerCase() === hex) authed = true;
    } catch (e) { /* */ }
  }
  if (!authed) return { ok: false, reason: 'unauthorized' };
  let events = []; try { events = JSON.parse(rawBody || '[]'); } catch (e) { return { ok: false, reason: 'bad_json' }; }
  if (!Array.isArray(events)) events = [events];
  let updated = 0;
  for (const ev of events) {
    const doc = ev && ev.data; if (!doc || !doc.id) continue;
    const mapped = PD_STATUS_MAP[str(doc.status)] || '';
    if (mapped) {
      const cat = (mapped === 'completed') ? 'won' : (mapped === 'declined' || mapped === 'expired') ? 'lost' : 'open';
      try { const r = await env.CRMDB.prepare('UPDATE offertes SET status=?, status_cat=?, updated_at=? WHERE panda_id=?').bind(mapped, cat, Date.now(), str(doc.id)).run(); if (r && r.meta && r.meta.changes) updated += r.meta.changes; } catch (e) { /* */ }
      // Offerte gewonnen -> projecttaken per discipline genereren (idempotent).
      if (mapped === 'completed') { try { const row = await env.CRMDB.prepare('SELECT * FROM offertes WHERE panda_id=?').bind(str(doc.id)).first(); if (row) await opsGenerateForOfferte(env, offerteRow(row)); } catch (e) { /* */ } }
    }
    // 'verzonden door' bijwerken uit de PandaDoc-recipients (enkel als niet handmatig overschreven).
    // Webhook-payload bevat geen recipients -> haal het document op als ze ontbreken.
    let sender = senderFromDoc(doc);
    if (!sender && env.PANDADOC_API_KEY) {
      try { const dr = await fetch(`${PANDADOC_BASE}/documents/${str(doc.id)}/details`, { headers: { Authorization: `API-Key ${str(env.PANDADOC_API_KEY)}` } }); const dd = await dr.json().catch(() => ({})); sender = senderFromDoc(dd); } catch (e) { /* */ }
    }
    if (sender) { try { await env.CRMDB.prepare("UPDATE offertes SET verzonden_door=? WHERE panda_id=? AND vd_override=0").bind(sender, str(doc.id)).run(); } catch (e) { /* */ } }
  }
  try { await syncMetaSet(env, 'crm:pandahook', JSON.stringify({ at: Date.now(), events: events.length, updated })); } catch (e) { /* */ }
  return { ok: true, events: events.length, updated };
}

// Ruimt dubbele PandaDoc-webhooks naar /pandadoc/hook op (houdt er één over).
export async function pandadocCleanupWebhooks(env) {
  if (!env.PANDADOC_API_KEY) return { ok: false, reason: 'no_pandadoc_key' };
  const hdr = { Authorization: `API-Key ${str(env.PANDADOC_API_KEY)}` };
  let ld = {}; try { const lr = await fetch(`${PANDADOC_BASE}/webhook-subscriptions`, { headers: hdr }); ld = await lr.json().catch(() => ({})); } catch (e) { return { ok: false, error: String(e && e.message) }; }
  const arr = Array.isArray(ld) ? ld : (ld.items || ld.results || ld.subscriptions || ld.data || []);
  const ours = (Array.isArray(arr) ? arr : []).filter((s) => String((s && s.url) || '').indexOf('/pandadoc/hook') >= 0);
  const kept = ours[0] ? (ours[0].uuid || ours[0].id) : null;
  let deleted = 0;
  for (let i = 1; i < ours.length; i++) { const id = ours[i].uuid || ours[i].id; if (!id) continue; try { await fetch(`${PANDADOC_BASE}/webhook-subscriptions/${id}`, { method: 'DELETE', headers: hdr }); deleted++; } catch (e) { /* */ } }
  return { ok: true, total: Array.isArray(arr) ? arr.length : 0, ours: ours.length, kept, deleted, shape: Array.isArray(ld) ? 'array' : Object.keys(ld || {}) };
}

// Registreert de PandaDoc-webhook rechtstreeks via hun API (zelf-service). Genereert een geheim
// token, bewaart het in KV, en maakt de subscription aan met dat token in de URL (zo hoeft niemand
// handmatig een shared key te zetten). Idempotent-ish: opts.rotate=true vernieuwt het token.
export async function pandadocCreateWebhook(env, opts) {
  opts = opts || {};
  if (!env.PANDADOC_API_KEY) return { ok: false, reason: 'no_pandadoc_key' };
  const base = str(opts.base) || 'https://s27-portal-gateway-v2.studio27marketing.workers.dev';
  let token = ''; try { token = await env.KV.get('crm:pandahook:token'); } catch (e) { /* */ }
  if (!token || opts.rotate) { token = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '') : (Date.now().toString(36) + Math.random().toString(36).slice(2)); try { await env.KV.put('crm:pandahook:token', token); } catch (e) { /* */ } }
  const hookUrl = `${base}/pandadoc/hook?token=${token}`;
  const body = { name: 'S27 CRM offerte-status', url: hookUrl, triggers: ['document_state_changed'], payload: ['fields'], active: true };
  const hdr = { Authorization: `API-Key ${str(env.PANDADOC_API_KEY)}`, 'Content-Type': 'application/json' };
  try {
    // idempotent: hergebruik een bestaande subscription naar /pandadoc/hook (vermijd duplicaten)
    let existing = null;
    try { const lr = await fetch(`${PANDADOC_BASE}/webhook-subscriptions`, { headers: hdr }); const ld = await lr.json().catch(() => ({})); const arr = Array.isArray(ld) ? ld : (ld.items || ld.results || []); existing = (Array.isArray(arr) ? arr : []).find((s) => String(s && s.url || '').indexOf('/pandadoc/hook') >= 0) || null; } catch (e) { /* */ }
    let r, d;
    if (existing && !opts.force) { d = existing; r = { ok: true, status: 200 }; }
    else { r = await fetch(`${PANDADOC_BASE}/webhook-subscriptions`, { method: 'POST', headers: hdr, body: JSON.stringify(body) }); d = await r.json().catch(() => ({})); }
    const out = { ok: !!r.ok, http: r.status, reused: !!(existing && !opts.force), sub_id: (d && (d.uuid || d.id)) || null, name: (d && d.name) || null, triggers: (d && d.triggers) || null, hook_url_masked: `${base}/pandadoc/hook?token=${token.slice(0, 6)}…`, detail: r.ok ? null : d };
    if (opts.selftest) {
      // bewijs de token-auth + verwerking met een no-op event (zelfde status) op een bestaande offerte
      let probe = null; try { probe = await env.CRMDB.prepare("SELECT panda_id, status FROM offertes WHERE panda_id!='' LIMIT 1").first(); } catch (e) { /* */ }
      if (probe) {
        const back = Object.keys(PD_STATUS_MAP).find((k) => PD_STATUS_MAP[k] === str(probe.status)) || 'document.viewed';
        const ev = JSON.stringify([{ event: 'document_state_changed', data: { id: str(probe.panda_id), status: back } }]);
        out.selftest = await pandadocHandleWebhook(env, ev, '', token);
      }
    }
    return out;
  } catch (e) { return { ok: false, error: String(e && e.message) }; }
}

// ---- Volledige sync (bedrijven -> contacten -> meetings -> offertes) -------
export async function crmSyncAll(env, opts) {
  opts = opts || {};
  const res = { companies: 0, contacts: 0, meetings: 0, offertes: 0 };
  try { const r = await crmSyncCompanies(env); res.companies = (r && r.n) || 0; } catch (e) { res.companies_err = String(e && e.message || e); }
  try { const r = await crmSyncContacts(env); res.contacts = (r && r.n) || 0; } catch (e) { res.contacts_err = String(e && e.message || e); }
  if (!opts.skipMeetings) { try { const r = await crmSyncMeetings(env); res.meetings = (r && r.n) || 0; } catch (e) { res.meetings_err = String(e && e.message || e); } }
  try { const r = await crmSyncOffertes(env); res.offertes = (r && r.n) || 0; } catch (e) { res.offertes_err = String(e && e.message || e); }
  try { const r = await crmRelink(env); res.relink = r; } catch (e) { res.relink_err = String(e && e.message || e); }
  try { await syncMetaSet(env, 'crm:lastsync', JSON.stringify({ at: Date.now(), res })); } catch (e) { /* */ }
  return res;
}
