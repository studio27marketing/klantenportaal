/* =============================================================================
 * AUTO-REMINDERS (WS-4, masterplan G2) — dagelijkse cron die klanten herinnert aan
 * openstaande KLANT-acties (feedback geven, input leveren, shoot inplannen).
 * -----------------------------------------------------------------------------
 * STATUS: SLAPEND OPGELEVERD. De engine draait pas wanneer ALLE drie waar zijn:
 *   1. KV-noodrem:  `reminders:enabled` = '1'   (nu: niet gezet → engine stopt direct)
 *   2. Het taak-veld bestaat: checkbox 'Auto-reminder' op de PLANNING-FOLDER (Vincent
 *      maakt aan — velden kunnen niet via de API; ID invullen in REMINDER_FIELD_TAAK).
 *   3. Per taak: het team vinkt 'Auto-reminder' aan (opt-in per taak; default stilte).
 * Interval per bedrijf via optioneel veld (REMINDER_FIELD_INTERVAL), anders 4 dagen.
 * Versturen: web-push eerst (PILOT-poort — bereikt nu enkel vincent@studio27.be; go-live
 * = §7.2-beslissing), daarna e-mail-fallback vanuit "Studio 27" <no-reply@studio27.be>
 * (gmail.send-scope staat sinds 11-06; no-reply moet als send-as-alias bestaan).
 * Idempotentie: KV `reminder:{bedrijfId}:{taskId}` (TTL 90 d) — max 1 reminder per interval.
 * Draait volledig in scheduled() → nul impact op het klant-request-pad. Fail-soft per bedrijf.
 * ============================================================================= */
import { cu, getCF, getRelationIds, FIELD, adminCompanies, fetchBedrijfTree, isAfgerondStatus, mintGoogleToken } from './handlers.mjs';
import { pushToEmailPilot } from './push.mjs';

const str = (v) => (v == null ? '' : String(v));

// MODEL (Vincent 11-06): reminders worden PER TAAK aangezet — checkbox-veld op de
// PLANNING-FOLDER (propageert naar alle planninglijsten incl. Tickets). Opt-in per taak:
// het team vinkt 'Auto-reminder' aan op precies de taken waar de klant aan zet is; een
// shoot die pas over 3 maanden speelt, krijgt het vinkje gewoon niet. Het interval blijft
// per bedrijf instelbaar (optioneel veld op de Bedrijven-lijst; ontbreekt het, dan 4 dagen).
const REMINDER_FIELD_TAAK = '';       // checkbox 'Auto-reminder' op de Planning-FOLDER (Vincent maakt aan → ID hier)
const REMINDER_FIELD_INTERVAL = '';   // optioneel: number 'Reminder-interval (dagen)' op Bedrijven-lijst
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

function bedrijfInterval(bedrijfTaak) {
  let interval = REMINDER_FIELD_INTERVAL
    ? (Math.round(Number(getCF(bedrijfTaak, REMINDER_FIELD_INTERVAL))) || DEFAULT_INTERVAL_DAGEN)
    : DEFAULT_INTERVAL_DAGEN;
  if (interval < 1) interval = 1; if (interval > 30) interval = 30;
  return interval * 86400000;
}
function taakReminderAan(t) {
  const v = getCF(t, REMINDER_FIELD_TAAK);
  return v === true || str(v) === 'true';
}

// e-mail-fallback: contacten zonder push-inschrijving krijgen de reminder per mail vanuit
// "Studio 27" <no-reply@studio27.be> (vereist send-as-alias op de geïmpersoneerde mailbox).
const GMAIL_SUBJECT = 'marketing@studio27.be';
async function sendReminderMail(env, to, payload) {
  try {
    const token = await mintGoogleToken(env, GMAIL_SUBJECT, 'https://www.googleapis.com/auth/gmail.send');
    const subj = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(payload.title)))}?=`;
    const raw = [
      `To: ${to}`,
      `From: "Studio 27" <no-reply@studio27.be>`,
      `Subject: ${subj}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      payload.body,
      '',
      `Open je portaal: ${payload.url}`,
      '',
      'Dit is een automatische herinnering van Studio 27 — antwoorden op deze mail worden niet gelezen.',
    ].join('\r\n');
    const b64 = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: b64 }),
    });
    return r.ok;
  } catch (e) { return false; }
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
  // noodrem 2: het taak-veld is nog niet geconfigureerd
  if (!REMINDER_FIELD_TAAK) return { skipped: 'fields_not_configured' };

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
        const intervalMs = bedrijfInterval(bedrijfTaak);
        const tree = await fetchBedrijfTree(env, c.id);
        // opt-in PER TAAK: enkel taken waar het team 'Auto-reminder' aanvinkte
        const kandidaten = tree.all.filter(taakReminderAan);
        if (!kandidaten.length) return;
        const emails = await contactEmails(env, bedrijfTaak);
        if (!emails.length) return;
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
          const payload = {
            title: copy.title,
            body: copy.body(str(t.name).slice(0, 70)),
            url: `https://portaal.studio27.be/?p=${str(t.parent || t.id)}`,
            tag: `rem-${t.id}`,
          };
          let sent = 0;
          for (const em of emails) {
            let viaPush = 0;
            try { const r = await pushToEmailPilot(env, em, payload); viaPush = (r && r.sent) || 0; } catch (e) { viaPush = 0; }
            if (viaPush) { sent += viaPush; continue; }
            // geen push-inschrijving (of pilot-gate) -> mail-fallback via no-reply
            try { if (await sendReminderMail(env, em, payload)) sent++; } catch (e) { /* kanaal-fail-soft */ }
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
