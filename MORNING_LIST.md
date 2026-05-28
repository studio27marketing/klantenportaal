# ☀️ Ochtendlijst — input/acties nodig van Vincent

_Laatst bijgewerkt: 29 mei 2026. Ik heb autonoom alles gedaan wat kon. Hieronder enkel wat écht extern geblokkeerd is (jouw beslissing, credentials, of een ClickUp-UI-actie die de API niet kan)._

---

## ✅ Deze sessie LIVE gezet + getest (geen actie nodig)
1. **AI Status Bot** — chatbubbel, beantwoordt projectvragen, escaleert (Ilke/Arne/Vincent). Live.
2. **Nieuw-project formulier in 3 stappen** — type → échte PandaDoc-prijsindicatie → offerte/gesprek óf direct bevestigen + opstart/shoot inplannen. Live.
3. **Auto-Status-Comments** — AI schrijft klant-comment bij statuswijziging (backend werkt, getest). Zie punt 2 hieronder.
4. **QA-sweep: 4 bugs gefixt** — mailto-verwijzingen weg (nu portaal-DM), project-view footer-positie, contactgegevens-knoppen verborgen in read-only (globale `[hidden]`-fix), `#s27p-check`-icoon toegevoegd.
5. **DM-pronoun** — "ziet het in **zijn/haar** planning" nu correct per persoon. (was: altijd "haar")

---

## 🔴 Écht geblokkeerd — jouw input/actie

### 1. PandaDoc-prijzen voor andere disciplines dan Adverteren
**Onderzocht:** er zijn géén per-discipline PandaDoc-templates. Het enige echte prijsblok dat bestaat is de **Adverteren**-sectie (opstart €500 / Google €300 / Meta €350 / Meta+Google €550). De "27 automations"-template is leeg ("Lorem ipsum €0").
→ Wil je echte prijzen tonen voor Webdesign/Branding/Social/SEO/Opleiding/Video in stap 2? Dan moet je in PandaDoc een **prijstabel (pricing table)** toevoegen per discipline (in een template). Geef me daarna het template-ID en ik koppel het in 2 min. Tot dan toont het portaal netjes "prijs op maat".

### 2. Auto-Status-Comments AAN zetten _(feature is klaar, enkel de schakelaar is van jou)_
De comments zijn **klant-zichtbaar**, dus dit is bewust jouw keuze. Webhook: `hook.eu1.make.com/ujqtpor1whyi9lb2wfkhq52b4ilaexyd`, body `{task_id, status}`.
→ Maak in ClickUp een automation op de klant-lijsten: _"when status changes → call webhook"_. (±2 min.) Of zeg het en ik bouw een Make 'Watch Tasks'-trigger — dan scope ik die eerst op een testlijst zodat er niks per ongeluk naar een echte klant gaat.

### 3. Performance Dashboard (jouw #1) — 3 dingen
**Onderzocht:** Metricool (per `bedrijf_id`) en SE Ranking (per `website_url`) zijn al generiek klaar. **GA4 niet:** de GA4-module heeft géén property-veld — de property zit vást aan de connectie, dus elke klant heeft een eigen GA4-connectie + scenario nodig. Ik kan geen Google-connecties aanmaken (vereist jouw login/OAuth).
→ Nodig:
- a) **Een ClickUp-veld** op Bedrijven om per klant te koppelen aan hun GA4-scenario (de API kan geen velden maken → jij in de UI), of bevestig dat ik per klant het bestaande GA4-scenario hard mag mappen.
- b) **Een echte testklant met data** + toestemming (TEST CLIENT BV is leeg).
- c) Welke **Google/Meta Ads**-rapportagescenario's ik mag koppelen.

### 4. Twilio-credentials voor WhatsApp-notificaties
Mail/portaal-notificaties werken; WhatsApp wacht op een Twilio-connectie in Make (SID + token + sender). Account aanmaken kan ik niet voor jou.

### 5. ClickUp custom fields aanmaken (UI — API kan dit niet)
Voor: `Notificatie-voorkeur` (mail/whatsapp/beide), `Health Score` (0-100), `Concurrenten` (domeinen). Zodra ze bestaan, koppel ik de opslag + de bijbehorende features.

### 6. Health Score & Capacity Planning — korte scope
Welke signalen wegen mee (omzet/feedback/reactietijd…)? Heb ik boekhoud-data nodig? Eén alinea volstaat en ik bouw een v1.

---

_Niets hierboven houdt het portaal tegen — alles wat live staat werkt volledig. Dit zijn enkel de volgende stappen die jouw beslissing of een externe sleutel vragen._
