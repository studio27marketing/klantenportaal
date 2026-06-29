// ===========================================================================
// hrdb.mjs — HR-datastore op Cloudflare D1 (kandidaten). Vervangt ClickUp als
// bron-van-waarheid voor HR. Edge-lokaal (WEUR) → snelle reads zonder ClickUp-API.
// Binding: env.HRDB (zie wrangler.toml [[d1_databases]]).
// ===========================================================================
const str = (v) => (v == null ? '' : String(v));

// Canonieke pijplijn-status uit een (ruwe) statustekst afleiden. Spiegelt de
// frontend-stageOf + voegt de eindstatussen afgewezen/aangenomen toe.
export function solCanonicalStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (/afgew|geweiger|niet weerh|reject|geen match|negatief|niet geschikt|niet aangenomen/.test(s)) return 'afgewezen';
  if (/aangenom|aanwerv|aangeworven|hired|in dienst|getekend|akkoord|aanwervi/.test(s)) return 'aangenomen';
  if (/aanbod|offer|voorstel/.test(s)) return 'aanbod';
  if (/assessment|case|proef|opdracht|test/.test(s)) return 'assessment';
  if (/gesprek|interview|meeting|kennismaking|intake/.test(s)) return 'gesprek';
  if (/screen|beoordel|review|in behandeling|bekeken/.test(s)) return 'screening';
  return 'nieuw';
}

// Vaste, propere pijplijn-statussen (vervangen de rommelige ClickUp-statussen in het keuzemenu).
export const HR_STATUSSEN = [
  { status: 'nieuw', color: '#28AFF9', type: 'open' },
  { status: 'screening', color: '#2458EA', type: 'custom' },
  { status: 'gesprek', color: '#0F2EA3', type: 'custom' },
  { status: 'assessment', color: '#C99410', type: 'custom' },
  { status: 'aanbod', color: '#4A6B0E', type: 'custom' },
  { status: 'aangenomen', color: '#2F7D32', type: 'done' },
  { status: 'afgewezen', color: '#B83A2A', type: 'closed' },
];

// D1-rij → frontend-kandidaatvorm (exact dezelfde shape als parseSollicitatie).
export function candRowToItem(r) {
  let ai = null; try { ai = r.ai_json ? JSON.parse(r.ai_json) : null; } catch (e) { ai = null; }
  return {
    id: str(r.id), naam: str(r.naam), voornaam: str(r.voornaam), achternaam: str(r.achternaam || ''),
    email: str(r.email), telefoon: str(r.telefoon), woonplaats: str(r.woonplaats),
    vacature: str(r.vacature), type: str(r.type), herkomst: str(r.bron), kanaal: str(r.kanaal),
    status: str(r.status), status_raw: str(r.status_raw || r.status), status_color: '',
    spam: !!r.spam, cv_url: str(r.cv_url), ts: Number(r.created_at) || 0,
    ai: ai, ai_score: r.ai_score == null ? null : Number(r.ai_score), cv_text: str(r.cv_text || ''),
    clickup_id: str(r.clickup_id || ''),
  };
}
export async function hrSetCvText(env, id, text) {
  await env.HRDB.prepare('UPDATE candidates SET cv_text=?, updated_at=? WHERE id=?').bind(str(text).slice(0, 9000), Date.now(), str(id)).run();
}

export async function hrCount(env) {
  try { const r = await env.HRDB.prepare('SELECT COUNT(*) AS n FROM candidates').first(); return Number(r && r.n) || 0; } catch (e) { return 0; }
}
export async function hrList(env) {
  try { const r = await env.HRDB.prepare('SELECT * FROM candidates ORDER BY created_at DESC').all(); return (r.results || []).map(candRowToItem); } catch (e) { return []; }
}
export async function hrGet(env, id) {
  try { const r = await env.HRDB.prepare('SELECT * FROM candidates WHERE id=?').bind(str(id)).first(); return r ? candRowToItem(r) : null; } catch (e) { return null; }
}
export async function hrSetStatus(env, id, statusRaw) {
  const canon = solCanonicalStatus(statusRaw);
  await env.HRDB.prepare('UPDATE candidates SET status=?, status_raw=?, updated_at=? WHERE id=?').bind(canon, str(statusRaw), Date.now(), str(id)).run();
  return canon;
}
export async function hrSetSpam(env, id, spam) {
  await env.HRDB.prepare('UPDATE candidates SET spam=?, updated_at=? WHERE id=?').bind(spam ? 1 : 0, Date.now(), str(id)).run();
}
export async function hrSetAi(env, id, ai) {
  const score = (ai && ai.score != null) ? Math.round(Number(ai.score)) : null;
  await env.HRDB.prepare('UPDATE candidates SET ai_score=?, ai_json=?, updated_at=? WHERE id=?').bind(score, ai ? JSON.stringify(ai) : null, Date.now(), str(id)).run();
}

const INS_SQL = `INSERT INTO candidates
  (id,naam,voornaam,achternaam,email,telefoon,woonplaats,vacature,type,bron,kanaal,status,spam,cv_url,motivatie,ai_score,ai_json,clickup_id,status_raw,created_at,updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
function insBinds(c, now) {
  const score = (c.ai && c.ai.score != null) ? Math.round(Number(c.ai.score)) : (c.ai_score == null ? null : Number(c.ai_score));
  const aiJson = c.ai ? JSON.stringify(c.ai) : (c.ai_json ? str(c.ai_json) : null);
  return [str(c.id), str(c.naam), str(c.voornaam), str(c.achternaam), str(c.email), str(c.telefoon), str(c.woonplaats), str(c.vacature), str(c.type), str(c.bron), str(c.kanaal), str(c.status || 'nieuw'), c.spam ? 1 : 0, str(c.cv_url), str(c.motivatie), score, aiJson, str(c.clickup_id), str(c.status_raw || c.status || 'nieuw'), Number(c.created_at) || now, now];
}

// Nieuwe kandidaat (website-intake). Genereert een id als er geen is.
export async function hrInsert(env, c) {
  const now = Date.now();
  const id = str(c.id) || ('cand_' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36));
  await env.HRDB.prepare(INS_SQL).bind(...insBinds(Object.assign({}, c, { id: id }), now)).run();
  return id;
}

// Upsert vanuit een geparste ClickUp-sollicitatie (eenmalige migratie, idempotent op id).
export async function hrUpsertFromClickup(env, it) {
  const now = Date.now();
  const c = {
    id: it.id, naam: it.naam, voornaam: it.voornaam, achternaam: it.achternaam,
    email: it.email, telefoon: it.telefoon, woonplaats: it.woonplaats, vacature: it.vacature,
    type: it.type, bron: it.herkomst || it.kanaal, kanaal: it.kanaal,
    status: solCanonicalStatus(it.status_raw || it.status), spam: it.spam, cv_url: it.cv_url,
    motivatie: '', ai: it.ai || null, clickup_id: it.id, status_raw: it.status_raw || it.status,
    created_at: it.ts,
  };
  const sql = INS_SQL + ` ON CONFLICT(id) DO UPDATE SET
    naam=excluded.naam,voornaam=excluded.voornaam,achternaam=excluded.achternaam,email=excluded.email,
    telefoon=excluded.telefoon,woonplaats=excluded.woonplaats,vacature=excluded.vacature,type=excluded.type,
    bron=excluded.bron,kanaal=excluded.kanaal,status=excluded.status,spam=excluded.spam,cv_url=excluded.cv_url,
    ai_score=excluded.ai_score,ai_json=excluded.ai_json,clickup_id=excluded.clickup_id,status_raw=excluded.status_raw,
    created_at=excluded.created_at,updated_at=excluded.updated_at`;
  await env.HRDB.prepare(sql).bind(...insBinds(c, now)).run();
}

// ---- Onboarding (D1) -------------------------------------------------------
function obRowToPerson(r) { return { id: str(r.id), name: str(r.name), role: str(r.role), dept: str(r.dept), start: str(r.start), buddy: str(r.buddy), candidate_id: str(r.candidate_id) }; }
export async function obListPeople(env) {
  try { const r = await env.HRDB.prepare('SELECT * FROM onboarding_people ORDER BY created_at DESC').all(); return (r.results || []).map(obRowToPerson); } catch (e) { return []; }
}
export async function obUpsertPerson(env, p) {
  const now = Date.now();
  const id = str(p.id) || ('ob_' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36));
  await env.HRDB.prepare(`INSERT INTO onboarding_people (id,name,role,dept,start,buddy,candidate_id,created_at) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,role=excluded.role,dept=excluded.dept,start=excluded.start,buddy=excluded.buddy,candidate_id=excluded.candidate_id`)
    .bind(id, str(p.name), str(p.role), str(p.dept), str(p.start), str(p.buddy), str(p.candidate_id), Number(p.created_at) || now).run();
  return id;
}
export async function obUpdatePerson(env, id, fields) {
  const cols = [], vals = [];
  ['name', 'role', 'dept', 'start', 'buddy'].forEach(function (k) { if (fields[k] != null) { cols.push(k + '=?'); vals.push(str(fields[k])); } });
  if (!cols.length) return; vals.push(str(id));
  await env.HRDB.prepare('UPDATE onboarding_people SET ' + cols.join(',') + ' WHERE id=?').bind(...vals).run();
}
export async function obRemovePerson(env, id) {
  await env.HRDB.prepare('DELETE FROM onboarding_people WHERE id=?').bind(str(id)).run();
  await env.HRDB.prepare('DELETE FROM onboarding_state WHERE person_id=?').bind(str(id)).run();
}
export async function obGetDone(env) {
  try { const r = await env.HRDB.prepare('SELECT person_id,key FROM onboarding_state WHERE done=1').all(); const m = {}; (r.results || []).forEach(function (x) { m[str(x.person_id) + ':' + str(x.key)] = true; }); return m; } catch (e) { return {}; }
}
export async function obSetDone(env, pid, key, done) {
  if (done) await env.HRDB.prepare('INSERT INTO onboarding_state (person_id,key,done) VALUES (?,?,1) ON CONFLICT(person_id,key) DO UPDATE SET done=1').bind(str(pid), str(key)).run();
  else await env.HRDB.prepare('DELETE FROM onboarding_state WHERE person_id=? AND key=?').bind(str(pid), str(key)).run();
}
// Idempotent: maak een onboarding-persoon van een aangenomen kandidaat (1×, op candidate_id).
export async function obAddFromCandidate(env, cand) {
  try { const ex = await env.HRDB.prepare('SELECT id FROM onboarding_people WHERE candidate_id=?').bind(str(cand.id)).first(); if (ex) return str(ex.id); } catch (e) { /* */ }
  return obUpsertPerson(env, { name: cand.naam, role: cand.vacature, dept: '', start: '', buddy: '', candidate_id: cand.id });
}

// ---- Documenten per kandidaat (D1-rij + R2-key) ----------------------------
// Het portaal is bron-van-waarheid: gegenereerde docs (contract, case, ...) worden
// in R2 (key hrdocs/<cand>/<doc>/<naam>) bewaard en hier gekoppeld, zodat ze in het
// dossier downloadbaar/zichtbaar blijven i.p.v. een eenmalige browser-download.
function docRowMap(r) {
  return { id: str(r.id), candidate_id: str(r.candidate_id), kind: str(r.kind), r2_key: str(r.r2_key),
    filename: str(r.filename), content_type: str(r.content_type), size: Number(r.size) || 0, mail_id: str(r.mail_id || ''), created_at: Number(r.created_at) || 0 };
}
export async function docList(env, candidateId) {
  try { const r = await env.HRDB.prepare('SELECT * FROM candidate_docs WHERE candidate_id=? ORDER BY created_at DESC').bind(str(candidateId)).all(); return (r.results || []).map(docRowMap); } catch (e) { return []; }
}
// Bijlagen die aan één specifieke mail hangen (voor de mailthread-detail).
export async function docByMail(env, mailId) {
  if (!mailId) return [];
  try { const r = await env.HRDB.prepare('SELECT * FROM candidate_docs WHERE mail_id=? ORDER BY created_at ASC').bind(str(mailId)).all(); return (r.results || []).map(docRowMap); } catch (e) { return []; }
}
export async function docInsert(env, d) {
  const now = Date.now();
  const id = str(d.id) || ('doc_' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36));
  await env.HRDB.prepare('INSERT INTO candidate_docs (id,candidate_id,kind,r2_key,filename,content_type,size,mail_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, str(d.candidate_id), str(d.kind), str(d.r2_key), str(d.filename), str(d.content_type), Number(d.size) || 0, str(d.mail_id || ''), now).run();
  return id;
}
export async function docGet(env, id) {
  try { const r = await env.HRDB.prepare('SELECT * FROM candidate_docs WHERE id=?').bind(str(id)).first(); return r ? docRowMap(r) : null; } catch (e) { return null; }
}

// ---- Mailverkeer per kandidaat (D1 = bron; Gmail verrijkt inkomend) --------
// Elke verzonden mail wordt hier gelogd (uitgaand), zodat de thread in het portaal
// ook werkt zonder Gmail-leestoegang. Inkomende mails worden (zodra gmail.readonly
// is toegekend) uit Gmail bijgehaald en idempotent toegevoegd op gmail_id.
function mailRowMap(r) {
  return { id: str(r.id), candidate_id: str(r.candidate_id), direction: str(r.direction) || 'out',
    from_addr: str(r.from_addr), to_addr: str(r.to_addr), subject: str(r.subject), body: str(r.body),
    gmail_id: str(r.gmail_id), read: !!r.read, has_attach: !!r.has_attach, created_at: Number(r.created_at) || 0 };
}
export async function mailList(env, candidateId) {
  try { const r = await env.HRDB.prepare('SELECT * FROM candidate_mails WHERE candidate_id=? ORDER BY created_at ASC').bind(str(candidateId)).all(); return (r.results || []).map(mailRowMap); } catch (e) { return []; }
}
export async function mailInsert(env, m) {
  const now = Date.now();
  const id = str(m.id) || ('mail_' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36));
  // uitgaand = altijd 'gelezen'; inkomend = standaard ongelezen (tenzij expliciet meegegeven)
  const read = (m.read != null) ? (m.read ? 1 : 0) : ((str(m.direction) || 'out') === 'out' ? 1 : 0);
  // INSERT OR IGNORE + partiële unieke index (candidate_id, gmail_id) WHERE gmail_id!=''
  // → een inkomende mail die al bestaat wordt stil overgeslagen (geen race-dubbels).
  // Uitgaande mails hebben gmail_id='' en vallen buiten de index, dus die inserten altijd.
  const res = await env.HRDB.prepare('INSERT OR IGNORE INTO candidate_mails (id,candidate_id,direction,from_addr,to_addr,subject,body,gmail_id,read,has_attach,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, str(m.candidate_id), str(m.direction) || 'out', str(m.from_addr), str(m.to_addr), str(m.subject), str(m.body).slice(0, 20000), str(m.gmail_id), read, m.has_attach ? 1 : 0, Number(m.created_at) || now).run();
  const inserted = !!(res && res.meta && res.meta.changes);
  return { id, inserted };
}
// Set van reeds opgeslagen gmail_id's (dedup bij het inlezen van inkomende mails).
export async function mailSeenGmail(env, candidateId) {
  try { const r = await env.HRDB.prepare("SELECT gmail_id FROM candidate_mails WHERE candidate_id=? AND gmail_id!=''").bind(str(candidateId)).all(); const s = {}; (r.results || []).forEach((x) => { s[str(x.gmail_id)] = 1; }); return s; } catch (e) { return {}; }
}
// Notificaties: ongelezen INKOMENDE mails over alle kandidaten + kandidaatnaam.
export async function mailUnread(env, limit) {
  const lim = Math.max(1, Math.min(50, Number(limit) || 30));
  try {
    const r = await env.HRDB.prepare(
      "SELECT m.id AS id, m.candidate_id AS candidate_id, m.subject AS subject, m.body AS body, m.from_addr AS from_addr, m.has_attach AS has_attach, m.created_at AS created_at, c.naam AS naam " +
      "FROM candidate_mails m LEFT JOIN candidates c ON c.id=m.candidate_id " +
      "WHERE m.direction='in' AND m.read=0 ORDER BY m.created_at DESC LIMIT ?").bind(lim).all();
    return (r.results || []).map((x) => ({ id: str(x.id), candidate_id: str(x.candidate_id), naam: str(x.naam || x.from_addr || 'Kandidaat'),
      subject: str(x.subject), snippet: str(x.body || '').replace(/\s+/g, ' ').slice(0, 120), from_addr: str(x.from_addr), has_attach: !!x.has_attach, date: Number(x.created_at) || 0 }));
  } catch (e) { return []; }
}
export async function mailUnreadCount(env) {
  try { const r = await env.HRDB.prepare("SELECT COUNT(*) AS n FROM candidate_mails WHERE direction='in' AND read=0").first(); return Number(r && r.n) || 0; } catch (e) { return 0; }
}
export async function mailMarkRead(env, mailId) {
  try { await env.HRDB.prepare('UPDATE candidate_mails SET read=1 WHERE id=?').bind(str(mailId)).run(); return true; } catch (e) { return false; }
}
export async function mailMarkAllRead(env) {
  try { await env.HRDB.prepare("UPDATE candidate_mails SET read=1 WHERE direction='in' AND read=0").run(); return true; } catch (e) { return false; }
}
