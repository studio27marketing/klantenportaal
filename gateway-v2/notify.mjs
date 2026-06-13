/* =============================================================================
 * Gedeelde notificatie-dispatcher (Vincent 2026-06-13)
 * -----------------------------------------------------------------------------
 * Eén plek die een melding naar een contactpersoon stuurt via de kanalen die DIE
 * persoon koos (Notificatie-kanalen-labelsveld): push, e-mail (no-reply) en/of
 * WhatsApp (Twilio). Gebruikt door clickup-push.mjs (status/chat) en reminders.mjs.
 *
 * PILOT: e-mail + WhatsApp + push gaan ENKEL naar Vincent en naar de contacten van
 * Studio 27 — zo kunnen we de kanalen veilig testen zonder echte klanten te spammen.
 *
 * DEEP-LINKS: elke payload.url verwijst rechtstreeks naar de juiste plek in het
 * portaal (project, chat, …) zodat de ontvanger meteen op de juiste pagina landt.
 * Vorm: https://portaal.studio27.be/?p=<rootTaskId>[&tab=chat]
 * ============================================================================= */
import { mintGoogleToken, sendWhatsAppTwilio } from './handlers.mjs';
import { pushToEmail } from './push.mjs';

const str = (v) => String(v == null ? '' : v).trim();
// strikt e-mailformaat ZONDER control-chars: weert header-injectie (CR/LF in het To-veld) — review v88.
const EMAIL_RE = /^[^\s@<>"'\r\n]+@[^\s@<>"'\r\n]+\.[^\s@<>"'\r\n]+$/;
function safeEmail(e) { const v = str(e).toLowerCase(); return EMAIL_RE.test(v) ? v : ''; }

export const PORTAL_BASE = 'https://portaal.studio27.be';
// Deep-link-helper: bouw een directe portaal-URL naar een project (+ optioneel de chat-tab).
export function portalLink(rootTaskId, opts) {
  const id = encodeURIComponent(str(rootTaskId));
  if (!id) return PORTAL_BASE + '/';
  let u = PORTAL_BASE + '/?p=' + id;
  if (opts && opts.chat) u += '&tab=chat';
  return u;
}

/* ---- PILOT-poort: enkel Vincent + Studio 27 -------------------------------- */
const NOTIFY_PILOT_EMAILS = ['vincent@studio27.be'];
const NOTIFY_PILOT_BEDRIJVEN = ['86c8cz2uu']; // Studio 27 bedrijf-taak
export function isNotifyPilot(email, bedrijfId) {
  const e = str(email).toLowerCase();
  if (e && NOTIFY_PILOT_EMAILS.includes(e)) return true;
  // case-insensitief vergelijken (ClickUp-id's zijn lowercase, maar faal niet stil op een hoofdletter) — review v88
  if (bedrijfId && NOTIFY_PILOT_BEDRIJVEN.includes(str(bedrijfId).toLowerCase())) return true;
  return false;
}

/* ---- e-mail-melding vanuit "Studio 27" <no-reply@studio27.be> -------------- */
const GMAIL_SUBJECT = 'marketing@studio27.be';
async function sendNotifMail(env, to, payload) {
  // anti-header-injectie: alleen een schoon e-mailadres mag in het To-veld (review v88)
  const dest = safeEmail(to);
  if (!dest) return false;
  to = dest;
  try {
    const token = await mintGoogleToken(env, GMAIL_SUBJECT, 'https://www.googleapis.com/auth/gmail.send');
    const subj = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(str(payload.title) || 'Update van Studio 27')))}?=`;
    const raw = [
      `To: ${to}`,
      `From: "Studio 27" <no-reply@studio27.be>`,
      `Subject: ${subj}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      str(payload.body),
      '',
      payload.url ? `Open meteen in je portaal: ${payload.url}` : '',
      '',
      'Dit is een automatische melding van Studio 27 — antwoorden op deze mail worden niet gelezen.',
    ].filter((x) => x !== '').join('\r\n');
    const b64 = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: b64 }),
    });
    return r.ok;
  } catch (e) { return false; }
}

/* ---- één contact via z'n gekozen kanalen ----------------------------------
 * contact: { email, gsm, kanalen:[ 'push'|'email'|'whatsapp' ] }
 * payload: { title, body, url, tag, icon }
 * channelsDefault: kanalen als de contact er géén koos (default: ['push']).
 * Fail-soft per kanaal; geeft een telling per kanaal terug. */
export async function notifyContact(env, contact, payload, bedrijfId, channelsDefault) {
  const email = str(contact && contact.email).toLowerCase();
  if (!isNotifyPilot(email, bedrijfId)) return { skipped: 'not_pilot', push: 0, email: 0, whatsapp: 0 };
  let kanalen = (Array.isArray(contact.kanalen) && contact.kanalen.length) ? contact.kanalen : (channelsDefault || ['push']);
  kanalen = kanalen.map((k) => str(k).toLowerCase());
  const res = { push: 0, email: 0, whatsapp: 0 };

  if (kanalen.includes('push') && email) {
    try { const r = await pushToEmail(env, email, payload); res.push = (r && r.sent) || 0; } catch (e) { /* fail-soft */ }
  }
  if (kanalen.includes('email') && email) {
    try { if (await sendNotifMail(env, email, payload)) res.email = 1; } catch (e) { /* fail-soft */ }
  }
  if (kanalen.includes('whatsapp')) {
    const num = str(contact && contact.gsm);
    if (num) {
      const msg = `${str(payload.title)}\n\n${str(payload.body)}${payload.url ? '\n\n' + payload.url : ''}`;
      try { const w = await sendWhatsAppTwilio(env, num, msg); if (w && w.ok) res.whatsapp = 1; } catch (e) { /* fail-soft */ }
    }
  }
  return res;
}

// Meerdere contacten ineens (per bedrijf), fail-soft.
export async function notifyContacts(env, contacts, payload, bedrijfId, channelsDefault) {
  const out = { push: 0, email: 0, whatsapp: 0, recipients: 0 };
  for (const c of (contacts || [])) {
    const r = await notifyContact(env, c, payload, bedrijfId, channelsDefault);
    if (r && !r.skipped) { out.push += r.push; out.email += r.email; out.whatsapp += r.whatsapp; out.recipients++; }
  }
  return out;
}
