/* =============================================================================
 * Studio 27 — AI-KOSTENMONITOR (gedeelde kern)
 * -----------------------------------------------------------------------------
 * Eén plek voor alles wat met AI-verbruik te maken heeft, zodat ZOWEL het
 * klantenportaal (handlers.mjs) ALS het teamledenportaal (teamportaal.mjs) door
 * dezelfde meetlaag gaan. Elke AI-call (Claude / ChatGPT / Gemini / Whisper)
 * laat hier een verbruiks-event achter met: provider, model, tokens in/uit,
 * berekende kost (€), platform (team vs klant), de skill/feature die het
 * triggerde, het teamlid en — indien van toepassing — het klant-bedrijf.
 *
 * OPSLAG (Cloudflare KV, binding env.KV):
 *   ai:ev:<YYYY-MM-DD>:<ts>-<rand>  → losse, append-only verbruiks-events
 *                                     (geen lock/race-risico). TTL 120 dagen.
 *   ai:day:<YYYY-MM-DD>             → compacte dag-array (alle events van die
 *                                     dag, gecomprimeerd) — opgebouwd door de
 *                                     nachtelijke rollup of on-demand. TTL 800d.
 *   ai:pricing:v1                   → optionele prijs-override (admin) bovenop
 *                                     de ingebouwde standaardtarieven.
 *
 * Het dashboard leest de dag-arrays (snel: één KV-get per dag) en aggregeert
 * met VOLLEDIGE kruisfilters (platform × provider × model × skill × bedrijf),
 * omdat elke dag-array de losse events bevat i.p.v. enkel 1-dimensionale totalen.
 *
 * Kosten = schatting o.b.v. publieke tarieven (USD/1M tokens → € via koers).
 * Tarieven zijn bewust aanpasbaar (KV-override) want sommige modelnamen lopen
 * vooruit op de officiële prijslijst. Onbekende modellen krijgen een tarief uit
 * dezelfde provider-tier en worden als "geschat" (est) gemarkeerd.
 * ============================================================================= */

const s = (v) => (v == null ? '' : String(v));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/* ---- provider-detectie op modelnaam (zelfde logica als de AI-routers) ------ */
export function providerOf(model) {
  const m = s(model).toLowerCase();
  if (!m) return 'onbekend';
  if (/^gemini|^models\/gemini|^imagen/.test(m)) return 'google';
  if (/^(gpt|o\d|chatgpt|whisper|text-embedding|dall-e|davinci|tts)/.test(m)) return 'openai';
  if (/^claude/.test(m)) return 'anthropic';
  return 'onbekend';
}
export const PROVIDER_LABEL = { anthropic: 'Anthropic (Claude)', openai: 'OpenAI (ChatGPT)', google: 'Google (Gemini)', onbekend: 'Onbekend' };

/* ---- prijstabel: USD per 1.000.000 tokens (input / output) -----------------
 * Whisper rekent per minuut audio (zie WHISPER_USD_PER_MIN). Beeldgeneratie
 * rekent per beeld (IMAGE_USD), niet per token. Pas gerust aan via KV-override. */
export const PRICING_DEFAULT = {
  eur_per_usd: 0.92,                 // wisselkoers USD→EUR (aanpasbaar)
  whisper_usd_per_min: 0.006,        // OpenAI Whisper / gpt-4o-transcribe ~ per minuut
  image_usd: 0.04,                   // forfaitaire kost per gegenereerd beeld (schatting)
  models: {
    // --- Anthropic (Claude) ---
    'claude-opus-4-8':        { in: 15,   out: 75 },
    'claude-opus-4-1':        { in: 15,   out: 75 },
    'claude-opus-4':          { in: 15,   out: 75 },
    'claude-sonnet-4-6':      { in: 3,    out: 15 },
    'claude-sonnet-4-5':      { in: 3,    out: 15 },
    'claude-sonnet-4':        { in: 3,    out: 15 },
    'claude-3-7-sonnet':      { in: 3,    out: 15 },
    'claude-3-5-sonnet':      { in: 3,    out: 15 },
    'claude-3-5-haiku':       { in: 0.80, out: 4 },
    'claude-3-haiku':         { in: 0.25, out: 1.25 },
    'claude-haiku-4-5':       { in: 1,    out: 5 },
    // --- OpenAI (ChatGPT) ---
    'gpt-5.5':                { in: 1.25, out: 10 },
    'gpt-5':                  { in: 1.25, out: 10 },
    'gpt-5-mini':             { in: 0.25, out: 2 },
    'gpt-5-nano':             { in: 0.05, out: 0.40 },
    'gpt-4.1':                { in: 2,    out: 8 },
    'gpt-4.1-mini':           { in: 0.40, out: 1.60 },
    'gpt-4.1-nano':           { in: 0.10, out: 0.40 },
    'gpt-4o':                 { in: 2.50, out: 10 },
    'gpt-4o-mini':            { in: 0.15, out: 0.60 },
    'o3':                     { in: 2,    out: 8 },
    'o4-mini':                { in: 1.10, out: 4.40 },
    'whisper-1':              { in: 0,    out: 0 },   // per minuut, zie whisper_usd_per_min
    // --- Google (Gemini) ---
    'gemini-3.5-flash':       { in: 0.30, out: 2.50 },
    'gemini-2.5-pro':         { in: 1.25, out: 10 },
    'gemini-2.5-flash':       { in: 0.30, out: 2.50 },
    'gemini-2.5-flash-lite':  { in: 0.10, out: 0.40 },
    'gemini-1.5-pro':         { in: 1.25, out: 5 },
    'gemini-1.5-flash':       { in: 0.075, out: 0.30 },
  },
  // fallback-tarief per provider voor onbekende modellen (gemarkeerd als geschat)
  tier_fallback: {
    anthropic: { in: 3,    out: 15 },
    openai:    { in: 2.50, out: 10 },
    google:    { in: 0.30, out: 2.50 },
    onbekend:  { in: 2,    out: 8 },
  },
};

let _priceCache = { v: null, t: 0 };
export async function aiPricing(env) {
  const now = Date.now();
  if (_priceCache.v && (now - _priceCache.t) < 60000) return _priceCache.v;
  let over = null;
  try { over = await env.KV.get('ai:pricing:v1', 'json'); } catch (e) { /* */ }
  let p = PRICING_DEFAULT;
  if (over && typeof over === 'object') {
    p = {
      eur_per_usd: num(over.eur_per_usd) || PRICING_DEFAULT.eur_per_usd,
      whisper_usd_per_min: over.whisper_usd_per_min != null ? num(over.whisper_usd_per_min) : PRICING_DEFAULT.whisper_usd_per_min,
      image_usd: over.image_usd != null ? num(over.image_usd) : PRICING_DEFAULT.image_usd,
      models: Object.assign({}, PRICING_DEFAULT.models, (over.models && typeof over.models === 'object') ? over.models : {}),
      tier_fallback: Object.assign({}, PRICING_DEFAULT.tier_fallback, (over.tier_fallback && typeof over.tier_fallback === 'object') ? over.tier_fallback : {}),
    };
  }
  _priceCache = { v: p, t: now };
  return p;
}
export async function aiPricingSave(env, patch) {
  let cur = {};
  try { cur = (await env.KV.get('ai:pricing:v1', 'json')) || {}; } catch (e) { /* */ }
  const next = Object.assign({}, cur, patch || {});
  if (patch && patch.models) next.models = Object.assign({}, cur.models || {}, patch.models);
  await env.KV.put('ai:pricing:v1', JSON.stringify(next));
  _priceCache = { v: null, t: 0 };
  return next;
}

/* ---- modeltarief opzoeken (met fuzzy match op prefix) ---------------------- */
function rateForModel(pricing, model) {
  const m = s(model).toLowerCase().replace(/^models\//, '');
  const tbl = pricing.models || {};
  if (tbl[m]) return { rate: tbl[m], est: false };
  // strip datum-suffix (-20240620 / -latest) en probeer opnieuw
  const base = m.replace(/-(latest|\d{6,8})$/,'');
  if (tbl[base]) return { rate: tbl[base], est: false };
  // langste sleutel die een prefix is van het model (bv. 'gpt-4o' ⊂ 'gpt-4o-2024..')
  let best = '';
  for (const k of Object.keys(tbl)) { if (m.startsWith(k) && k.length > best.length) best = k; }
  if (best) return { rate: tbl[best], est: false };
  const prov = providerOf(model);
  return { rate: (pricing.tier_fallback && pricing.tier_fallback[prov]) || pricing.tier_fallback.onbekend, est: true };
}

/* ---- kostberekening (€) ---------------------------------------------------- */
export function aiCostEur(pricing, model, inTok, outTok, extra) {
  const eur = num(pricing.eur_per_usd) || 0.92;
  const prov = providerOf(model);
  let usd = 0; let est = false;
  if (extra && extra.audio_sec) { usd += (num(extra.audio_sec) / 60) * num(pricing.whisper_usd_per_min); }
  if (extra && extra.images) { usd += num(extra.images) * num(pricing.image_usd); }
  if (inTok || outTok) {
    const { rate, est: e } = rateForModel(pricing, model);
    est = e;
    usd += (num(inTok) / 1e6) * num(rate.in) + (num(outTok) / 1e6) * num(rate.out);
  }
  return { eur: Math.round(usd * eur * 1e6) / 1e6, usd, est, provider: prov };
}

/* ---- tokens uit een ruwe API-respons halen (per provider) ------------------ */
export function aiUsageFrom(model, d) {
  const prov = providerOf(model);
  if (!d || typeof d !== 'object') return { in: 0, out: 0 };
  if (prov === 'anthropic') {
    const u = d.usage || {};
    return { in: num(u.input_tokens), out: num(u.output_tokens) };
  }
  if (prov === 'openai') {
    const u = d.usage || {};
    return { in: num(u.prompt_tokens), out: num(u.completion_tokens) };
  }
  if (prov === 'google') {
    const u = d.usageMetadata || {};
    // candidates + (optioneel) thoughts tellen als output
    return { in: num(u.promptTokenCount), out: num(u.candidatesTokenCount) + num(u.thoughtsTokenCount) };
  }
  // generieke poging
  const u = d.usage || {};
  return { in: num(u.input_tokens || u.prompt_tokens), out: num(u.output_tokens || u.completion_tokens) };
}

/* ---- Brussels datum (YYYY-MM-DD) — dagbuckets volgen de lokale dag --------- */
export function brusselsYmd(ms) {
  try {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' });
    return f.format(new Date(ms == null ? Date.now() : ms));   // en-CA → YYYY-MM-DD
  } catch (e) {
    return new Date(ms == null ? Date.now() : ms).toISOString().slice(0, 10);
  }
}

/* ---- HET KERNHAAKJE: log één verbruiks-event ------------------------------- *
 * Fail-soft: een logfout mag NOOIT de AI-call zelf breken. meta = {
 *   model, in_tokens, out_tokens, platform('team'|'klant'|'cron'|'onbekend'),
 *   skill, member_id, member_naam, bedrijf_id, bedrijf_naam, audio_sec, images,
 *   ms, ok(bool), demo(bool) }. Geeft het opgeslagen event terug (of null). */
export async function logAiUsage(env, meta) {
  try {
    if (!env || !env.KV || !meta) return null;
    const m = meta || {};
    const pricing = await aiPricing(env);
    const inTok = num(m.in_tokens), outTok = num(m.out_tokens);
    const cost = aiCostEur(pricing, m.model, inTok, outTok, { audio_sec: m.audio_sec, images: m.images });
    const ts = Date.now();
    const ev = {
      t: ts,
      prov: cost.provider,
      mdl: s(m.model) || '(onbekend)',
      plat: s(m.platform) || 'onbekend',
      sk: s(m.skill) || 'overig',
      mid: m.member_id != null ? s(m.member_id) : '',
      mn: s(m.member_naam),
      bid: m.bedrijf_id != null ? s(m.bedrijf_id) : '',
      bn: s(m.bedrijf_naam),
      i: inTok,
      o: outTok,
      c: cost.eur,
      est: cost.est ? 1 : 0,
      ok: m.ok === false ? 0 : 1,
    };
    if (m.audio_sec) ev.au = num(m.audio_sec);
    if (m.images) ev.img = num(m.images);
    if (m.demo) ev.demo = 1;
    const ymd = brusselsYmd(ts);
    const key = 'ai:ev:' + ymd + ':' + ts + '-' + Math.random().toString(36).slice(2, 8);
    await env.KV.put(key, JSON.stringify(ev), { expirationTtl: 120 * 24 * 3600 });
    return ev;
  } catch (e) { return null; }
}

/* ---- dag-array opbouwen uit de losse events (rollup) ----------------------- */
export async function aiCostsRollup(env, ymd) {
  if (!env || !env.KV) return null;
  const prefix = 'ai:ev:' + ymd + ':';
  const events = [];
  let cursor = undefined;
  for (let guard = 0; guard < 50; guard++) {
    let res; try { res = await env.KV.list({ prefix, cursor, limit: 1000 }); } catch (e) { break; }
    const keys = (res && res.keys) || [];
    const vals = await Promise.all(keys.map((k) => env.KV.get(k.name, 'json').catch(() => null)));
    for (const v of vals) if (v && typeof v === 'object') events.push(v);
    if (res && res.list_complete === false && res.cursor) cursor = res.cursor; else break;
  }
  events.sort((a, b) => num(a.t) - num(b.t));
  try { await env.KV.put('ai:day:' + ymd, JSON.stringify(events), { expirationTtl: 800 * 24 * 3600 }); } catch (e) { /* */ }
  return events;
}

/* ---- events voor één dag ophalen (dag-array > live events) ----------------- *
 * todayYmd = de "nog levende" dag; daarvoor lezen we altijd live (de rollup is
 * pas 's nachts authoritatief). Voor afgesloten dagen: gebruik de cache, en
 * bouw ze on-demand op als ze nog ontbreekt (eerste keer / geen cron-historiek). */
async function dayEvents(env, ymd, todayYmd) {
  if (ymd === todayYmd) { return await aiCostsRollup(env, ymd); }   // live + ververst de cache
  let cached = null;
  try { cached = await env.KV.get('ai:day:' + ymd, 'json'); } catch (e) { /* */ }
  if (Array.isArray(cached)) return cached;
  return await aiCostsRollup(env, ymd);   // ontbreekt nog → opbouwen + cachen
}

/* ---- datum-helpers --------------------------------------------------------- */
function ymdList(from, to) {
  const out = [];
  let d = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  for (let g = 0; g < 800 && d <= end; g++) { out.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86400000); }
  return out;
}
function addDaysYmd(ymd, n) { const d = new Date(ymd + 'T00:00:00Z'); return new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10); }

/* ---- lege accumulator + merge ---------------------------------------------- */
function emptyAgg() { return { cost: 0, calls: 0, in: 0, out: 0, est: 0 }; }
function bump(acc, ev) { acc.cost += num(ev.c); acc.calls += 1; acc.in += num(ev.i); acc.out += num(ev.o); if (ev.est) acc.est += 1; }
function matchesFilters(ev, f) {
  if (f.platform && f.platform !== 'all' && s(ev.plat) !== f.platform) return false;
  if (f.provider && f.provider !== 'all' && s(ev.prov) !== f.provider) return false;
  if (f.model && f.model !== 'all' && s(ev.mdl) !== f.model) return false;
  if (f.skill && f.skill !== 'all' && s(ev.sk) !== f.skill) return false;
  if (f.bedrijf && f.bedrijf !== 'all' && s(ev.bid) !== f.bedrijf) return false;
  if (f.member && f.member !== 'all' && s(ev.mid) !== f.member) return false;
  if (f.hide_demo && ev.demo) return false;
  return true;
}

/* ---- som van een set events tot één totalenblok ---------------------------- */
function sumEvents(events, f) {
  const tot = emptyAgg();
  for (const ev of events) { if (matchesFilters(ev, f)) bump(tot, ev); }
  return tot;
}

/* =============================================================================
 * HOOFD-AGGREGATIE voor het dashboard.
 * opts = { from, to, platform, provider, model, skill, bedrijf, member,
 *          hide_demo, topN }. Geeft tijdreeks + alle breakdowns + vorige periode.
 * ============================================================================= */
export async function aiCostsAggregate(env, opts) {
  const o = opts || {};
  const todayYmd = brusselsYmd();
  let to = s(o.to) || todayYmd;
  let from = s(o.from) || addDaysYmd(to, -29);
  if (from > to) { const t = from; from = to; to = t; }
  const f = {
    platform: s(o.platform) || 'all', provider: s(o.provider) || 'all',
    model: s(o.model) || 'all', skill: s(o.skill) || 'all',
    bedrijf: s(o.bedrijf) || 'all', member: s(o.member) || 'all',
    hide_demo: !!o.hide_demo,
  };
  const days = ymdList(from, to);
  // alle dag-arrays parallel (begrensd door dag-aantal; klein volume)
  const perDay = await Promise.all(days.map((d) => dayEvents(env, d, todayYmd).then((ev) => ({ d, ev: Array.isArray(ev) ? ev : [] })).catch(() => ({ d, ev: [] }))));

  const series = [];
  const totals = emptyAgg();
  const byProvider = new Map(), byModel = new Map(), byPlatform = new Map(), bySkill = new Map(), byBedrijf = new Map(), byMember = new Map();
  // filteropties verzamelen uit ALLE events in range (vóór filtering), zodat de UI-keuzelijsten kloppen
  const optProviders = new Set(), optModels = new Map(), optPlatforms = new Set(), optSkills = new Set();
  const accGet = (map, key) => { let a = map.get(key); if (!a) { a = emptyAgg(); map.set(key, a); } return a; };
  let demoPresent = false, anyEvents = false;
  const recent = [];

  for (const { d, ev } of perDay) {
    const dayTot = emptyAgg();
    const dayPlat = {}; const dayProv = {};
    for (const e of ev) {
      anyEvents = true;
      if (e.demo) demoPresent = true;
      optProviders.add(s(e.prov)); optPlatforms.add(s(e.plat)); optSkills.add(s(e.sk));
      if (e.mdl) optModels.set(s(e.mdl), s(e.prov));
      if (!matchesFilters(e, f)) continue;
      bump(totals, e); bump(dayTot, e);
      dayPlat[e.plat] = (dayPlat[e.plat] || 0) + num(e.c);
      dayProv[e.prov] = (dayProv[e.prov] || 0) + num(e.c);
      bump(accGet(byProvider, s(e.prov)), e);
      bump(accGet(byModel, s(e.mdl)), e);
      bump(accGet(byPlatform, s(e.plat)), e);
      bump(accGet(bySkill, s(e.sk)), e);
      if (e.bid) bump(accGet(byBedrijf, s(e.bid)), e);
      if (e.mid) bump(accGet(byMember, s(e.mid)), e);
      if (recent.length < 200) recent.push(e);
    }
    series.push({ date: d, cost: r6(dayTot.cost), calls: dayTot.calls, in: dayTot.in, out: dayTot.out, byPlatform: dayPlat, byProvider: dayProv });
  }

  // vorige periode (zelfde lengte, net ervóór) — enkel totalen voor de delta-KPI's
  const lenDays = days.length;
  const prevTo = addDaysYmd(from, -1); const prevFrom = addDaysYmd(prevTo, -(lenDays - 1));
  const prevDays = ymdList(prevFrom, prevTo);
  const prevPerDay = await Promise.all(prevDays.map((d) => dayEvents(env, d, todayYmd).then((ev) => Array.isArray(ev) ? ev : []).catch(() => [])));
  const prev = emptyAgg();
  for (const ev of prevPerDay) for (const e of ev) if (matchesFilters(e, f)) bump(prev, e);

  // namen-lookup (bedrijf/member) uit de events zelf
  const bedrijfNaam = new Map(), memberNaam = new Map();
  for (const { ev } of perDay) for (const e of ev) { if (e.bid && e.bn) bedrijfNaam.set(s(e.bid), s(e.bn)); if (e.mid && e.mn) memberNaam.set(s(e.mid), s(e.mn)); }

  const topN = num(o.topN) || 12;
  const mapToArr = (map, labeller) => Array.from(map.entries())
    .map(([key, a]) => ({ key, label: labeller ? labeller(key) : key, cost: r6(a.cost), calls: a.calls, in: a.in, out: a.out, est: a.est }))
    .sort((a, b) => b.cost - a.cost);

  const out = {
    range: { from, to, days: lenDays, today: todayYmd },
    filters: f,
    totals: { cost: r6(totals.cost), calls: totals.calls, in: totals.in, out: totals.out, tokens: totals.in + totals.out, est_calls: totals.est, avg_cost: totals.calls ? r6(totals.cost / totals.calls) : 0 },
    prev: { cost: r6(prev.cost), calls: prev.calls, in: prev.in, out: prev.out },
    projection: projectMonth(series, todayYmd, from, to),
    series,
    byProvider: mapToArr(byProvider, (k) => PROVIDER_LABEL[k] || k),
    byModel: mapToArr(byModel).map((x) => Object.assign(x, { provider: providerOf(x.key) })),
    byPlatform: mapToArr(byPlatform, (k) => platformLabel(k)),
    bySkill: mapToArr(bySkill).slice(0, 40),
    byBedrijf: mapToArr(byBedrijf, (k) => bedrijfNaam.get(k) || ('#' + k)).slice(0, topN),
    byMember: mapToArr(byMember, (k) => memberNaam.get(k) || ('#' + k)).slice(0, topN),
    recent: recent.sort((a, b) => num(b.t) - num(a.t)).slice(0, 60),
    options: {
      providers: Array.from(optProviders).filter(Boolean).map((k) => ({ key: k, label: PROVIDER_LABEL[k] || k })),
      models: Array.from(optModels.entries()).map(([k, p]) => ({ key: k, label: k, provider: p })).sort((a, b) => a.label.localeCompare(b.label)),
      platforms: Array.from(optPlatforms).filter(Boolean).map((k) => ({ key: k, label: platformLabel(k) })),
      skills: Array.from(optSkills).filter(Boolean).sort(),
    },
    meta: { hasData: anyEvents, demo_present: demoPresent, generated: Date.now() },
  };
  return out;
}

function r6(n) { return Math.round(num(n) * 1e6) / 1e6; }
export function platformLabel(k) {
  return ({ team: 'Teamportaal', klant: 'Klantenportaal', cron: 'Automatisch (cron)', onbekend: 'Onbekend' })[s(k)] || s(k);
}
// eenvoudige maandprojectie: huidige maand-tot-nu → geëxtrapoleerd naar volledige maand
function projectMonth(series, todayYmd, from, to) {
  const mon = todayYmd.slice(0, 7);
  let spent = 0, daysSeen = 0;
  for (const d of series) { if (d.date.slice(0, 7) === mon && d.date <= todayYmd) { spent += num(d.cost); } }
  const dayOfMonth = num(todayYmd.slice(8, 10));
  const dim = new Date(Number(todayYmd.slice(0, 4)), Number(todayYmd.slice(5, 7)), 0).getDate();
  const projected = dayOfMonth > 0 ? (spent / dayOfMonth) * dim : 0;
  // alleen tonen als de huidige maand binnen het bereik valt
  const inRange = mon >= from.slice(0, 7) && mon <= to.slice(0, 7);
  return { month: mon, spent: r6(spent), projected: r6(projected), in_range: inRange, day_of_month: dayOfMonth, days_in_month: dim };
}

/* =============================================================================
 * DEMO-DATA — zodat het dashboard meteen iets toont vóór er echt verbruik is.
 * Schrijft gemarkeerde (demo:1) events over de laatste ~30 dagen weg; met
 * wipe weer te verwijderen. Puur voor de eerste-aanzet-demonstratie.
 * ============================================================================= */
export async function aiCostsSeedDemo(env) {
  if (!env || !env.KV) return { ok: false };
  const skills = [
    { sk: 'project:briefing-samenvatten', plat: 'team' },
    { sk: 'project:volgende-stappen', plat: 'team' },
    { sk: 'dagplanning', plat: 'team' },
    { sk: 'ads:advies', plat: 'team' },
    { sk: 'ads:vraag', plat: 'team' },
    { sk: 'ai-assistent:marketing', plat: 'team' },
    { sk: 'hr:cv-score', plat: 'team' },
    { sk: 'hr:vacature-caption', plat: 'team' },
    { sk: 'agent:meta-specialist', plat: 'team' },
    { sk: 'skill:seo-blog', plat: 'team' },
    { sk: 'klant-chatbot', plat: 'klant' },
    { sk: 'dagplanning', plat: 'cron' },
  ];
  const models = ['claude-sonnet-4-6', 'claude-opus-4-8', 'gpt-4o', 'gpt-4o-mini', 'gemini-2.5-flash', 'gemini-2.5-pro'];
  const bedrijven = [
    { id: 'demo-bolckmans', naam: 'Bolckmans' }, { id: 'demo-flor', naam: 'Flor Vastgoed' },
    { id: 'demo-ipcleaning', naam: 'IP Cleaning' }, { id: 'demo-27moments', naam: '27 Moments' },
    { id: 'demo-gymab', naam: 'Gymab' },
  ];
  const members = [
    { id: '8714037', naam: 'Vincent' }, { id: '0', naam: 'Johanna' }, { id: '1', naam: 'Arne' }, { id: '2', naam: 'Ilke' },
  ];
  const pricing = await aiPricing(env);
  const now = Date.now();
  // deterministische pseudo-random (seed) zodat het reproduceerbaar is
  let seed = 1337; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const byDay = {};
  let total = 0;
  for (let dback = 29; dback >= 0; dback--) {
    const dayMs = now - dback * 86400000;
    const ymd = brusselsYmd(dayMs);
    const arr = [];
    const weekday = new Date(dayMs).getUTCDay();
    const base = (weekday === 0 || weekday === 6) ? 3 : 10;   // minder in het weekend
    const count = base + Math.floor(rnd() * 10);
    for (let n = 0; n < count; n++) {
      const sk = skills[Math.floor(rnd() * skills.length)];
      const mdl = models[Math.floor(rnd() * models.length)];
      const inTok = 600 + Math.floor(rnd() * 6000);
      const outTok = 150 + Math.floor(rnd() * 1800);
      const cost = aiCostEur(pricing, mdl, inTok, outTok, {});
      const b = sk.plat === 'klant' || rnd() > 0.5 ? bedrijven[Math.floor(rnd() * bedrijven.length)] : null;
      const mem = sk.plat === 'team' ? members[Math.floor(rnd() * members.length)] : null;
      const t = dayMs - Math.floor(rnd() * 80000000);
      arr.push({ t, prov: cost.provider, mdl, plat: sk.plat, sk: sk.sk, mid: mem ? mem.id : '', mn: mem ? mem.naam : '',
        bid: b ? b.id : '', bn: b ? b.naam : '', i: inTok, o: outTok, c: cost.eur, est: cost.est ? 1 : 0, ok: 1, demo: 1 });
      total += cost.eur;
    }
    arr.sort((a, b2) => a.t - b2.t);
    byDay[ymd] = arr;
  }
  // schrijf per dag als losse events + dag-array (zodat zowel live als cache klopt)
  let written = 0;
  for (const ymd of Object.keys(byDay)) {
    const arr = byDay[ymd];
    for (const ev of arr) {
      const key = 'ai:ev:' + ymd + ':' + ev.t + '-' + Math.random().toString(36).slice(2, 8);
      try { await env.KV.put(key, JSON.stringify(ev), { expirationTtl: 120 * 24 * 3600 }); written++; } catch (e) { /* */ }
    }
    try { await env.KV.put('ai:day:' + ymd, JSON.stringify(arr), { expirationTtl: 800 * 24 * 3600 }); } catch (e) { /* */ }
  }
  return { ok: true, written, days: Object.keys(byDay).length, total_eur: r6(total) };
}

export async function aiCostsWipeDemo(env) {
  if (!env || !env.KV) return { ok: false };
  let removed = 0;
  // events
  let cursor = undefined;
  for (let g = 0; g < 200; g++) {
    let res; try { res = await env.KV.list({ prefix: 'ai:ev:', cursor, limit: 1000 }); } catch (e) { break; }
    const keys = (res && res.keys) || [];
    const vals = await Promise.all(keys.map((k) => env.KV.get(k.name, 'json').then((v) => ({ k: k.name, v })).catch(() => null)));
    for (const x of vals) { if (x && x.v && x.v.demo) { try { await env.KV.delete(x.k); removed++; } catch (e) { /* */ } } }
    if (res && res.list_complete === false && res.cursor) cursor = res.cursor; else break;
  }
  // dag-arrays opnieuw opbouwen (zonder demo) — eenvoudigst: verwijder de dag-cache, ze wordt on-demand herbouwd
  cursor = undefined;
  for (let g = 0; g < 50; g++) {
    let res; try { res = await env.KV.list({ prefix: 'ai:day:', cursor, limit: 1000 }); } catch (e) { break; }
    const keys = (res && res.keys) || [];
    for (const k of keys) { try { await env.KV.delete(k.name); } catch (e) { /* */ } }
    if (res && res.list_complete === false && res.cursor) cursor = res.cursor; else break;
  }
  return { ok: true, removed };
}
