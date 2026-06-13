/* =============================================================================
 * AUTO-REMINDERS (WS-4, masterplan G2) — dagelijkse cron die klanten herinnert aan
 * openstaande KLANT-acties (feedback geven, input leveren, shoot inplannen).
 * -----------------------------------------------------------------------------
 * STATUS: PILOT (Vincent 12-06): KV `reminders:enabled`='1' staat AAN, maar de engine is
 * begrensd tot PILOT_BEDRIJVEN (enkel Studio 27). Veld-ID door Vincent aangeleverd —
 * Veld 'Auto-reminder' (37766dfb) staat op de PLANNING-FOLDER en is live geverifieerd
 * op alle 10 onderliggende lijsten (incl. Tickets).
 * Per taak: het team vinkt 'Auto-reminder' aan (opt-in per taak; default stilte).
 * Interval VAST op 3 dagen (Vincent 12-06: geen interval-veld per bedrijf gewenst).
 * Versturen: web-push eerst (PILOT-poort — bereikt nu enkel vincent@studio27.be; go-live
 * = §7.2-beslissing), daarna e-mail-fallback vanuit "Studio 27" <no-reply@studio27.be>
 * (gmail.send-scope staat sinds 11-06; no-reply moet als send-as-alias bestaan).
 * Idempotentie: KV `reminder:{bedrijfId}:{taskId}` (TTL 90 d) — max 1 reminder per interval.
 * Draait volledig in scheduled() → nul impact op het klant-request-pad. Fail-soft per bedrijf.
 * ============================================================================= */
import { cu, getCF, getRelationIds, FIELD, adminCompanies, fetchBedrijfTree, isAfgerondStatus, kanalenRead } from './handlers.mjs';
import { notifyContact, portalLink } from './notify.mjs';

const str = (v) => (v == null ? '' : String(v));

// MODEL (Vincent 11-06): reminders worden PER TAAK aangezet — checkbox-veld op de
// PLANNING-FOLDER (propageert naar alle planninglijsten incl. Tickets). Opt-in per taak:
// het team vinkt 'Auto-reminder' aan op precies de taken waar de klant aan zet is; een
// shoot die pas over 3 maanden speelt, krijgt het vinkje gewoon niet.
const REMINDER_FIELD_TAAK = '37766dfb-d243-4ae9-98e5-994ef642a272'; // checkbox 'Auto-reminder' op Planning-folder (geverifieerd 12-06: aanwezig op alle 10 lijsten)
const DEFAULT_INTERVAL_DAGEN = 3;     // VAST (Vincent 12-06: geen per-bedrijf-interval)
// PILOT: enkel deze bedrijven meenemen tot Vincent groen licht geeft (leeg = alle bedrijven)
const PILOT_BEDRIJVEN = ['86c8cz2uu']; // Studio 27

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

const INTERVAL_MS = DEFAULT_INTERVAL_DAGEN * 86400000;
function taakReminderAan(t) {
  const v = getCF(t, REMINDER_FIELD_TAAK);
  return v === true || str(v) === 'true';
}

// contacten van het bedrijf (e-mail + GSM + gekozen Notificatie-kanalen) voor de dispatcher.
async function contactObjects(env, bedrijfTaak) {
  const ids = getRelationIds(bedrijfTaak, FIELD.contact).slice(0, 8);
  const out = [];
  for (const id of ids) {
    try {
      const r = await cu.get(env, `/task/${id}`);
      if (!(r.ok && r.data)) continue;
      const em = str(getCF(r.data, FIELD.email)).trim().toLowerCase();
      if (!em) continue;
      out.push({ email: em, gsm: str(getCF(r.data, FIELD.gsm)).trim(), kanalen: kanalenRead(getCF(r.data, FIELD.notifKanalen)) });
    } catch (e) { /* contact overslaan */ }
  }
  return out;
}

export async function reminderEngine(env, ctx) {
  // noodrem 1: expliciete KV-schakelaar (nu UIT → engine doet niets)
  let enabled = '';
  try { enabled = str(await env.KV.get('reminders:enabled')); } catch (e) { enabled = ''; }
  if (enabled !== '1') return { skipped: 'disabled' };
  // noodrem 2: het taak-veld is nog niet geconfigureerd
  if (!REMINDER_FIELD_TAAK) return { skipped: 'fields_not_configured' };

  let companies = [];
  try {
    const r = await adminCompanies(env);
    companies = (r && r.body && Array.isArray(r.body.companies)) ? r.body.companies : [];
  } catch (e) { return { skipped: 'companies_failed' }; }
  // pilot-poort: tijdens de testfase enkel de pilot-bedrijven (Studio 27) verwerken
  if (PILOT_BEDRIJVEN.length) companies = companies.filter((c) => PILOT_BEDRIJVEN.includes(str(c && c.id).toLowerCase()));

  const now = Date.now();
  let verstuurd = 0;
  const BATCH = 5;
  for (let i = 0; i < companies.length; i += BATCH) {
    await Promise.all(companies.slice(i, i + BATCH).map(async (c) => {
      try {
        const br = await cu.get(env, `/task/${c.id}`);
        const bedrijfTaak = br.ok && br.data ? br.data : null;
        if (!bedrijfTaak) return;
        const intervalMs = INTERVAL_MS;
        const tree = await fetchBedrijfTree(env, c.id);
        // opt-in PER TAAK: enkel taken waar het team 'Auto-reminder' aanvinkte
        const kandidaten = tree.all.filter(taakReminderAan);
        if (!kandidaten.length) return;
        const contacts = await contactObjects(env, bedrijfTaak);
        if (!contacts.length) return;
        for (const t of kandidaten) {
          const actie = klantActie(t);
          if (!actie) continue;
          // dubbel vangnet: niet herinneren aan werk dat pas later start
          const startMs = Number(getCF(t, FIELD.startdatum)) || 0;
          if (startMs && startMs > now + 86400000) continue;
          const kvKey = `reminder:${c.id}:${t.id}`;
          let last = 0;
          try { const v = await env.KV.get(kvKey, 'json'); last = (v && v.last_sent_ms) || 0; } catch (e) { last = 0; }
          if (now - last < intervalMs) continue;
          const copy = COPY[actie];
          // deep-link rechtstreeks naar het project (de klant ziet de top-level taak)
          const rootId = str(t.top_level_parent) || str(t.parent) || str(t.id);
          const payload = {
            title: copy.title,
            body: copy.body(str(t.name).slice(0, 70)),
            url: portalLink(rootId),
            tag: `rem-${t.id}`,
          };
          // via de gedeelde dispatcher: per contact via z'n gekozen kanalen (default e-mail voor
          // een reminder). PILOT-gated (Vincent + Studio 27) in notify.mjs.
          let sent = 0;
          for (const ct of contacts) {
            const r = await notifyContact(env, ct, payload, c.id, ['email']);
            if (r && !r.skipped) sent += (r.push + r.email + r.whatsapp);
          }
          // pas markeren bij echte aflevering (anders loopt de teller terwijl niemand bereikt werd)
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
