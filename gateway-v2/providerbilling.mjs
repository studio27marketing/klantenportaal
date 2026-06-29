/* =============================================================================
 * Studio 27 — ECHTE PROVIDER-FACTURATIE
 * -----------------------------------------------------------------------------
 * Haalt de WERKELIJKE gefactureerde AI-kost rechtstreeks bij de providers op
 * (i.t.t. onze eigen token×tarief-schatting in aicost.mjs). Dit vereist een
 * APARTE admin/billing-credential per provider — NIET de inference-key:
 *
 *   Anthropic  → ANTHROPIC_ADMIN_KEY  (sk-ant-admin-…, console → Settings → Admin keys)
 *                GET /v1/organizations/cost_report  (amount = cents-string!)
 *   OpenAI     → OPENAI_ADMIN_KEY      (sk-admin-…, met scope api.usage.read)
 *                GET /v1/organization/costs         (amount.value = USD)
 *   Google     → geen per-key endpoint; echte kost zit in Google Cloud Billing
 *                (BigQuery-export). Hier nog niet geïntegreerd.
 *
 * Alles fail-soft: ontbreekt een admin-key, dan { configured:false } i.p.v. fout.
 * Bedragen worden naar EUR omgezet via de (aanpasbare) koers uit aicost.mjs.
 * Provider-facturatie geeft enkel ORG-TOTALEN (per dag/model) — NIET per
 * platform/skill/klant; die uitsplitsing kan alleen onze eigen meting.
 * ============================================================================= */

import { aiPricing } from './aicost.mjs';

const s = (v) => (v == null ? '' : String(v));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(num(n) * 100) / 100;
const r4 = (n) => Math.round(num(n) * 1e4) / 1e4;

function addDaysYmd(ymd, n) { const d = new Date(ymd + 'T00:00:00Z'); return new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10); }

/* ---- Anthropic Cost Report -------------------------------------------------- */
// amount = "kost in laagste munteenheid (cents) als decimal-string" → USD = amount/100.
async function fetchAnthropicCost(env, from, to, eurPerUsd) {
  const key = s(env && env.ANTHROPIC_ADMIN_KEY);
  if (!key) return { provider: 'anthropic', label: 'Anthropic (Claude)', configured: false, hint: 'ANTHROPIC_ADMIN_KEY (sk-ant-admin-…) ontbreekt' };
  const startingAt = from + 'T00:00:00Z';
  const endingAt = addDaysYmd(to, 1) + 'T00:00:00Z';
  const days = {}; const byModel = {};
  let total = 0; let page = ''; let ok = true; let err = '';
  try {
    for (let guard = 0; guard < 40; guard++) {
      const qs = new URLSearchParams();
      qs.set('starting_at', startingAt); qs.set('ending_at', endingAt); qs.set('bucket_width', '1d');
      qs.append('group_by[]', 'description');
      qs.set('limit', '31');
      if (page) qs.set('page', page);
      const r = await fetch('https://api.anthropic.com/v1/organizations/cost_report?' + qs.toString(), {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) { ok = false; err = s((d && d.error && d.error.message) || ('http_' + (r && r.status))); break; }
      for (const bucket of (Array.isArray(d.data) ? d.data : [])) {
        const ymd = s(bucket.starting_at).slice(0, 10);
        for (const it of (Array.isArray(bucket.results) ? bucket.results : [])) {
          const usd = num(it.amount) / 100;   // cents → USD
          total += usd;
          days[ymd] = (days[ymd] || 0) + usd;
          const m = s(it.model) || s(it.description) || it.cost_type || 'overig';
          byModel[m] = (byModel[m] || 0) + usd;
        }
      }
      if (d.has_more && d.next_page) page = d.next_page; else break;
    }
  } catch (e) { ok = false; err = 'network'; }
  return normalize('anthropic', 'Anthropic (Claude)', ok, err, total, days, byModel, eurPerUsd);
}

/* ---- OpenAI Costs ----------------------------------------------------------- */
// results[].amount.value = USD (dollars), amount.currency = 'usd'.
async function fetchOpenAICost(env, from, to, eurPerUsd) {
  const key = s(env && env.OPENAI_ADMIN_KEY);
  if (!key) return { provider: 'openai', label: 'OpenAI (ChatGPT)', configured: false, hint: 'OPENAI_ADMIN_KEY (sk-admin-…, scope api.usage.read) ontbreekt' };
  const startUnix = Math.floor(Date.parse(from + 'T00:00:00Z') / 1000);
  const endUnix = Math.floor(Date.parse(addDaysYmd(to, 1) + 'T00:00:00Z') / 1000);
  const days = {}; const byModel = {};
  let total = 0; let page = ''; let ok = true; let err = '';
  try {
    for (let guard = 0; guard < 40; guard++) {
      const qs = new URLSearchParams();
      qs.set('start_time', String(startUnix)); qs.set('end_time', String(endUnix)); qs.set('bucket_width', '1d');
      qs.append('group_by', 'line_item'); qs.set('limit', '31');
      if (page) qs.set('page', page);
      const r = await fetch('https://api.openai.com/v1/organization/costs?' + qs.toString(), {
        headers: { Authorization: 'Bearer ' + key },
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) { ok = false; err = s((d && d.error && d.error.message) || ('http_' + (r && r.status))); break; }
      for (const bucket of (Array.isArray(d.data) ? d.data : [])) {
        const ymd = new Date(num(bucket.start_time) * 1000).toISOString().slice(0, 10);
        for (const it of (Array.isArray(bucket.results) ? bucket.results : [])) {
          const usd = (it.amount && it.amount.value != null) ? num(it.amount.value) : num(it.amount);
          total += usd;
          days[ymd] = (days[ymd] || 0) + usd;
          const m = s(it.line_item) || 'overig';
          byModel[m] = (byModel[m] || 0) + usd;
        }
      }
      if (d.has_more && d.next_page) page = d.next_page; else break;
    }
  } catch (e) { ok = false; err = 'network'; }
  return normalize('openai', 'OpenAI (ChatGPT)', ok, err, total, days, byModel, eurPerUsd);
}

/* ---- Google Cloud Billing (BigQuery-export) --------------------------------
 * Echte Gemini-kost zit niet achter een per-key endpoint; ze staat in de Cloud
 * Billing BigQuery-export. We authenticeren met een service-account (JWT→OAuth2)
 * en queryen de export-tabel. Vereist twee secrets:
 *   GCP_BILLING_SA_KEY    = volledige service-account JSON (string)
 *   GCP_BILLING_BQ_TABLE  = volledige tabel 'project.dataset.gcp_billing_export_v1_...'
 * Bedragen in de export staan in de billing-munt (currency-kolom); EUR wordt
 * as-is gebruikt, USD via de koers omgezet. Fail-soft zonder secrets.
 * -------------------------------------------------------------------------- */
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
function b64urlStr(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64urlBytes(bytes) { let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function pemToDer(pem) { const b = s(pem).replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, ''); const raw = atob(b); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out.buffer; }
async function gcpAccessToken(sa, scope) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64urlStr(JSON.stringify({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now }));
  const signingInput = head + '.' + claim;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const jwt = signingInput + '.' + b64urlBytes(new Uint8Array(sig));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt) });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || !d.access_token) throw new Error(s((d && d.error_description) || (d && d.error) || ('token_http_' + (r && r.status))));
  return d.access_token;
}
async function fetchGoogleCost(env, from, to, eurPerUsd) {
  const rawKey = s(env && env.GCP_BILLING_SA_KEY);
  const table = s(env && env.GCP_BILLING_BQ_TABLE);
  if (!rawKey || !table) return { provider: 'google', label: 'Google (Gemini)', configured: false, hint: 'GCP_BILLING_SA_KEY (service-account JSON) en/of GCP_BILLING_BQ_TABLE ontbreekt. Vereist Cloud Billing BigQuery-export.' };
  if (!YMD_RE.test(from) || !YMD_RE.test(to)) return { provider: 'google', label: 'Google (Gemini)', configured: true, ok: false, error: 'ongeldige_periode', total_usd: 0, total_eur: 0, days: [], byModel: [] };
  let sa; try { sa = JSON.parse(rawKey); } catch (e) { return { provider: 'google', label: 'Google (Gemini)', configured: true, ok: false, error: 'sa_json_ongeldig', total_usd: 0, total_eur: 0, days: [], byModel: [] }; }
  if (!sa.client_email || !sa.private_key || !sa.project_id) return { provider: 'google', label: 'Google (Gemini)', configured: true, ok: false, error: 'sa_json_onvolledig', total_usd: 0, total_eur: 0, days: [], byModel: [] };
  const safeTable = table.replace(/[`;]/g, '');   // tabelnaam komt uit secret, maar dubbel afgeschermd
  const days = {}; const byModel = {}; let total = 0; let cur = 'USD'; let ok = true; let err = '';
  try {
    const token = await gcpAccessToken(sa, 'https://www.googleapis.com/auth/bigquery.readonly');
    const sql = "SELECT FORMAT_TIMESTAMP('%Y-%m-%d', usage_start_time) AS day, "
      + "COALESCE(sku.description, service.description, 'overig') AS item, ANY_VALUE(currency) AS currency, "
      + "SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net "
      + "FROM `" + safeTable + "` "
      + "WHERE usage_start_time >= TIMESTAMP('" + from + " 00:00:00') "
      + "AND usage_start_time < TIMESTAMP(DATE_ADD(DATE('" + to + "'), INTERVAL 1 DAY)) "
      + "AND (LOWER(service.description) LIKE '%generative language%' OR LOWER(service.description) LIKE '%vertex%' OR LOWER(sku.description) LIKE '%gemini%') "
      + "GROUP BY day, item ORDER BY day";
    const r = await fetch('https://bigquery.googleapis.com/bigquery/v2/projects/' + encodeURIComponent(sa.project_id) + '/queries', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify({ query: sql, useLegacySql: false, timeoutMs: 30000 }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d) { ok = false; err = s((d && d.error && d.error.message) || ('http_' + (r && r.status))); }
    else {
      const fields = (d.schema && Array.isArray(d.schema.fields)) ? d.schema.fields.map((f) => f.name) : ['day', 'item', 'currency', 'net'];
      for (const row of (Array.isArray(d.rows) ? d.rows : [])) {
        const cells = row.f || []; const rec = {}; fields.forEach((nm, i) => { rec[nm] = cells[i] ? cells[i].v : null; });
        cur = s(rec.currency) || cur;
        const amt = num(rec.net);
        const usd = (cur.toUpperCase() === 'EUR') ? (amt / (eurPerUsd || 0.92)) : amt;   // alles als USD-equivalent → normalize zet terug naar EUR
        total += usd; days[s(rec.day)] = (days[s(rec.day)] || 0) + usd;
        const m = s(rec.item) || 'overig'; byModel[m] = (byModel[m] || 0) + usd;
      }
    }
  } catch (e) { ok = false; err = s(e && e.message) || 'network'; }
  return normalize('google', 'Google (Gemini)', ok, err, total, days, byModel, eurPerUsd);
}

function normalize(provider, label, ok, err, totalUsd, daysMap, byModelMap, eurPerUsd) {
  const days = Object.keys(daysMap).sort().map((date) => ({ date, usd: r4(daysMap[date]), eur: r2(daysMap[date] * eurPerUsd) }));
  const byModel = Object.keys(byModelMap).map((label2) => ({ label: label2, usd: r4(byModelMap[label2]), eur: r2(byModelMap[label2] * eurPerUsd) })).sort((a, b) => b.usd - a.usd).slice(0, 20);
  return { provider, label, configured: true, ok, error: ok ? '' : err, total_usd: r4(totalUsd), total_eur: r2(totalUsd * eurPerUsd), days, byModel };
}

/* ---- hoofd-ophaler ---------------------------------------------------------- */
export async function aiBillingFetch(env, opts) {
  const o = opts || {};
  const to = s(o.to) || new Date().toISOString().slice(0, 10);
  const from = s(o.from) || addDaysYmd(to, -29);
  let pricing = null; try { pricing = await aiPricing(env); } catch (e) { /* */ }
  const eurPerUsd = (pricing && num(pricing.eur_per_usd)) || 0.92;
  const [anthropic, openai, google] = await Promise.all([
    fetchAnthropicCost(env, from, to, eurPerUsd).catch(() => ({ provider: 'anthropic', label: 'Anthropic (Claude)', configured: false, hint: 'fout' })),
    fetchOpenAICost(env, from, to, eurPerUsd).catch(() => ({ provider: 'openai', label: 'OpenAI (ChatGPT)', configured: false, hint: 'fout' })),
    fetchGoogleCost(env, from, to, eurPerUsd).catch(() => ({ provider: 'google', label: 'Google (Gemini)', configured: false, hint: 'Vereist Google Cloud Billing (BigQuery-export). Geen per-key endpoint beschikbaar.' })),
  ]);
  const providers = [anthropic, openai, google];
  const total_eur = r2(providers.reduce((sum, p) => sum + (p.configured && p.ok ? num(p.total_eur) : 0), 0));
  const anyConfigured = providers.some((p) => p.configured);
  return { range: { from, to }, eur_per_usd: eurPerUsd, providers, total_eur, any_configured: anyConfigured };
}
