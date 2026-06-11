/* =============================================================================
 * AUTO-REMINDERS (WS-4, masterplan G2) — dagelijkse cron die klanten herinnert aan
 * openstaande KLANT-acties (feedback geven, input leveren, shoot inplannen).
 * -----------------------------------------------------------------------------
 * STATUS: SLAPEND OPGELEVERD. De engine draait pas wanneer ALLE drie waar zijn:
 *   1. KV-noodrem:  `reminders:enabled` = '1'   (nu: niet gezet → engine stopt direct)
 *   2. ClickUp-velden bestaan op de Bedrijven-lijst en hun IDs staan hieronder ingevuld:
 *        REMINDER_FIELD_AAN       (checkbox 'Auto-reminders aan?')
 *        REMINDER_FIELD_INTERVAL  (number   'Reminder-interval (dagen)', default 4)
 *      (custom fields kunnen niet via de API aangemaakt worden — Vincent maakt ze aan
 *       in ClickUp en de IDs worden hier ingevuld; tot dan stopt de engine eveneens.)
 *   3. Per bedrijf: het vinkje staat AAN (opt-in; default uit = stilte).
 * Versturen: web-push via de PILOT-poort (pushToEmailPilot — bereikt nu enkel
 * vincent@studio27.be). De go-live naar alle contacten is een bewuste beslissing
 * (§7.2 masterplan) en vergt het omzetten van pushToEmailPilot → pushToEmail.
 * E-mail-fallback komt pas zodra de gmail.send-scope geautoriseerd is (§5.11).
 * Idempotentie: KV `reminder:{bedrijfId}:{taskId}` (TTL 90 d) — max 1 reminder per interval.
 * Draait volledig in scheduled() → nul impact op het klant-request-pad. Fail-soft per bedrijf.
 * ============================================================================= */
import { cu, getCF, getRelationIds, FIELD, adminCompanies, fetchBedrijfTree, isAfgerondStatus } from './handlers.mjs';
import { pushToEmailPilot } from './push.mjs';

const str = (v) => (v == null ? '' : String(v));

// In te vullen zodra Vincent de velden aanmaakt (§5.1 masterplan):
const REMINDER_FIELD_AAN = '';        // checkbox 'Auto-reminders aan?' op Bedrijven-lijst
const REMINDER_FIELD_INTERVAL = '';   // number 'Reminder-interval (dagen)' op Bedrijven-lijst
const DEFAULT_INTERVAL_DAGEN = 4;

// Welke open taken vragen een klant-actie?
function klantActie(t) {
  if (isAfgerondStatus(t.status)) return null;
  const lbl = str(t.status && t.status.status).toLowerCase();
  if (lbl.includes('doorgestuur')) return 'feedback';
  if (lbl.includes('input')) return 'input';
  const tj = Number(getCF(t, FIELD.typeJob));
  if (tj === 6 && !(Number(t.due_date) > 0)) return 'shoot';
  return null;
}

const COPY = {
  feedback: { title: 'Feedback gevraagd 🎬', body: (n) => `"${n}" staat klaar voor jouw feedback — kijk je even mee?` },
  input: { title: 'We wachten op jouw input ✍️', body: (n) => `Voor "${n}" hebben we nog iets van jou nodig om verder te kunnen.` },
  shoot: { title: 'Shoot inplannen 📅', body: (n) => `"${n}" wacht op een datum — plan je shoot in een paar klikken in.` },
};

async function reminderConfig(env, bedrijfTaak) {
  if (!REMINDER_FIELD_AAN || !REMINDER_FIELD_INTERVAL) return { aan: false };
  const aan = getCF(bedrijfTaak, REMINDER_FIELD_AAN) === true || str(getCF(bedrijfTaak, REMINDER_FIELD_AAN)) === 'true';
  let interval = Math.round(Number(getCF(bedrijfTaak, REMINDER_FIELD_INTERVAL))) || DEFAULT_INTERVAL_DAGEN;
  if (interval < 1) interval = 1; if (interval > 30) interval = 30;
  return { aan, intervalMs: interval * 86400000 };
}

// contact-e-mails van het bedrijf (voor de push-poort)
async function contactEmails(env, bedrijfTaak) {
  const ids = getRelationIds(bedrijfTaak, FIELD.contact).slice(0, 8);
  const out = [];
  for (const id of ids) {
    try {
      const r = await cu.get(env, `/task/${id}`);
      const em = r.ok && r.data ? str(getCF(r.data, FIELD.email)).trim().toLowerCase() : '';
      if (em) out.push(em);
    } catch (e) { /* contact overslaan */ }
  }
  return out;
}

export async function reminderEngine(env, ctx) {
  // noodrem 1: expliciete KV-schakelaar (nu UIT → engine doet niets)
  let enabled = '';
  try { enabled = str(await env.KV.get('reminders:enabled')); } catch (e) { enabled = ''; }
  if (enabled !== '1') return { skipped: 'disabled' };
  // noodrem 2: velden nog niet geconfigureerd
  if (!REMINDER_FIELD_AAN || !REMINDER_FIELD_INTERVAL) return { skipped: 'fields_not_configured' };

  let companies = [];
  try {
    const r = await adminCompanies(env);
    companies = (r && r.body && Array.isArray(r.body.companies)) ? r.body.companies : [];
  } catch (e) { return { skipped: 'companies_failed' }; }

  const now = Date.now();
  let verstuurd = 0;
  const BATCH = 5;
  for (let i = 0; i < companies.length; i += BATCH) {
    await Promise.all(companies.slice(i, i + BATCH).map(async (c) => {
      try {
        const br = await cu.get(env, `/task/${c.id}`);
        const bedrijfTaak = br.ok && br.data ? br.data : null;
        if (!bedrijfTaak) return;
        const cfg = await reminderConfig(env, bedrijfTaak);
        if (!cfg.aan) return;                                       // opt-in: default stilte
        const tree = await fetchBedrijfTree(env, c.id);
        const emails = await contactEmails(env, bedrijfTaak);
        if (!emails.length) return;
        for (const t of tree.all) {
          const actie = klantActie(t);
          if (!actie) continue;
          // niet herinneren aan werk dat pas later start (startdatum in de toekomst)
          const startMs = Number(getCF(t, FIELD.startdatum)) || 0;
          if (startMs && startMs > now + 86400000) continue;
          const kvKey = `reminder:${c.id}:${t.id}`;
          let last = 0;
          try { const v = await env.KV.get(kvKey, 'json'); last = (v && v.last_sent_ms) || 0; } catch (e) { last = 0; }
          if (now - last < cfg.intervalMs) continue;
          const copy = COPY[actie];
          const payload = {
            title: copy.title,
            body: copy.body(str(t.name).slice(0, 70)),
            url: `https://portaal.studio27.be/?p=${str(t.parent || t.id)}`,
            tag: `rem-${t.id}`,
          };
          let sent = 0;
          for (const em of emails) {
            try { const r = await pushToEmailPilot(env, em, payload); sent += (r && r.sent) || 0; } catch (e) { /* kanaal-fail-soft */ }
          }
          // ook bij 0 afgeleverde pushes de timer zetten? NEE — pas markeren bij echte
          // aflevering, zodat klanten zonder push-inschrijving later (mail-fallback) alsnog
          // bereikt worden zonder dat de teller al loopt.
          if (sent > 0) {
            verstuurd++;
            try { await env.KV.put(kvKey, JSON.stringify({ last_sent_ms: now, actie }), { expirationTtl: 7776000 }); } catch (e) { /* volgende run opnieuw */ }
          }
        }
      } catch (e) { /* één bedrijf mag de run niet breken */ }
    }));
  }
  return { ok: true, verstuurd };
}
