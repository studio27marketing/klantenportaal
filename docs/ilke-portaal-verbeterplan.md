# Masterplan — Klantenportaal-verbeteringen

**Bron:** strategiesessie Vincent Verleije × Ilke Meeusen, 11 juni 2026 (transcript "overlopen S27") + bijhorende to-do-lijst.
**Doel van dit document:** één zelfstandige prompt die aan een AI-bouwagent kan worden meegegeven om alle besproken verbeteringen correct, snel en visueel-consistent in het bestaande klantenportaal uit te voeren.
**Status:** PLAN — nog niet gebouwd. De bouwagent voert dit gefaseerd uit, golf per golf, met expliciete verificatie en versie-bump per golf.

---

## 0. Hoe deze prompt te gebruiken (lees dit eerst, bouwagent)

1. Lees **§1 Kaders** volledig vóór je één regel code aanraakt. Dit zijn niet-onderhandelbare regels. Overtreed je er één, dan breek je een live productieportaal.
2. Werk **golf per golf** (§3). Elke golf is los releasebaar, bumpt `?v=` + service-worker, en mag geen bestaande functie breken.
3. Per feature staat in §4 exact: wat er al bestaat (→ uitbreiden, niet herbouwen), de frontend- en worker-ankers, de ClickUp-velden, de acceptatiecriteria en de snelheids-/risicobewaking.
4. **Regelnummers in dit document zijn benaderend** (de bestanden zijn grote monolieten en wijzigen continu). De **functienamen, endpoint-namen en ClickUp-veld-IDs zijn betrouwbaar.** Grep altijd op functienaam om de exacte plek te vinden vóór je edit.
5. Scommit gericht per feature. Frontend-only wijziging = géén `wrangler deploy`. Worker-wijziging = wél. Zie §6.
6. Items getagd **[CLICKUP-CONFIG]** of **[PROCES]** zijn géén code — die horen in §5 en worden door Vincent in ClickUp gezet. Bouw daar geen portaal-UI omheen tenzij expliciet vermeld.

---

## 1. Niet-onderhandelbare kaders

### 1.1 Architectuur (waar leeft wat)

| Laag | Locatie | Deploy | Belangrijkste bestanden |
|---|---|---|---|
| **Frontend** | `klantendashboard/v2/` → Cloudflare Pages `s27-portaal`, domein `portaal.studio27.be` | **git push = deploy** (branch `portal-v2-direct`) | `index.html`, `portal.js` (~191 KB, router/handlers/init), `panels.js` (~393 KB, ALLE UI-componenten), `data.js` (databridge), `api.js` (API+Firebase-auth), `styles.css` + `glass.css` + `tweaks.css` + `video-review.css`, `video-review.js`, `push.js`, `sw.js` |
| **Worker (gateway)** | `klantendashboard/gateway-v2/` → `s27-portal-gateway-v2.workers.dev` | **`wrangler deploy`** (door Vincent) | `worker.js` (~43 KB, routing/bootstrap/`scheduled()`), `handlers.mjs` (~322 KB, ALLE endpoints — monoliet), `push.mjs`, `clickup-push.mjs`, `videoreview.mjs`, `zipstream.mjs`, `wrangler.toml` |
| **Data** | ClickUp (CRM + projecten) + Cloudflare KV (`dcbe89a0…`) + R2 (`s27-portal-files`) + Google Drive (SA + DWD) | n.v.t. | **GEEN D1** |
| **Auth** | Firebase `studio27-cloud` (Google SSO + e-mail), worker verifieert token, scope-guard per bedrijf | n.v.t. | |

### 1.2 Harde constraints

- **GEEN Make.** Alles loopt via Cloudflare Worker + Firebase + ClickUp + KV + R2 + Google Drive/Gmail (SA met domain-wide delegation). Elk voorstel dat "een Make-scenario" suggereert is fout — herschrijf het als worker-logica (synchroon endpoint, `scheduled()` cron, of `/clickup/hook` webhook).
- **Reeds gebouwde functies elders blijven werken.** Zie §1.7 voor de lijst. Raak boot-pad, ads-/socials-rapportage, video-review, fotogalerij, shoot-planner, offerte-wizard, web-push en admin/staff-modus niet aan tenzij de feature het expliciet vraagt.
- **Snelheid eerst.** Het portaal is net door een portaal-brede snelheidsronde gegaan (v76). Nieuwe code mag het **boot-pad niet vertragen**: geen extra synchrone netwerkcalls bij opstart, lazy-load alles wat niet boven de vouw staat, hergebruik de bestaande SWR-cache (`withCache`, 60 s vers / tot 5 min stil verversen) en de `X-No-Cache`-bust-conventie na writes.
- **Visueel-first, minimum tekst.** Elke nieuwe klantweergave is primair visueel (iconen, kleurstaten, kaarten, mini-grafieken, pillen) met zo weinig mogelijk tekst. Geen tekstmuren. Eén heldere actie per scherm.
- **Simpele klant-UX.** De klant is een leek. Eén-klik-paden, geen jargon, geen ClickUp-interne termen, geen TYPE-JOB-nummers. Default-acties zichtbaar, randgevallen verborgen.
- **Visueel in lijn met het huidige portaal.** Gebruik uitsluitend de bestaande huisstijl-tokens en component-klassen (§1.6). Geen nieuwe kleuren, fonts of schaduwen introduceren.

### 1.3 Release-procedure (per golf)

1. Frontend-edits committen op `portal-v2-direct`.
2. **Bump `?v=NN`** in `v2/index.html` (alle ~5 CSS + ~9 JS-includes; huidige waarde **76**).
3. **Bump SW-cache** in `v2/sw.js`: `var CACHE = 's27-portaal-vNN'` (zelfde nummer).
4. Push → Cloudflare Pages bouwt automatisch.
5. Worker-edits? → Vincent draait `cd gateway-v2 && wrangler deploy`. **Lever Vincent een klikbaar/kopieerbaar commando + de exacte stappen** (hij is leek in CLI/console).
6. Verifieer op de **root** `https://portaal.studio27.be/` (niet op een `?v=`-oude URL); check DevTools Network dat het nieuwe versienummer laadt.

### 1.4 ClickUp custom-field gotcha (KRITIEK)

`PUT /task {custom_fields:[…]}` geeft **200 maar bewaart de waarden niet** (stil falen). Schrijf custom fields **altijd** via `POST /task/{id}/field/{fieldId}` (helper `cu.field(env, taskId, fieldId, value)`). Relatie-velden via `{ value: { add:[…], rem:[…] } }`. Dit geldt ook voor alle nieuwe velden in dit plan.

### 1.5 Scope-guard (SEC-2, fail-closed)

Elke ClickUp-read voor een klant wordt gescoped op het veld `bedrijf` (`4b1fb333-…`). Komt er 0 resultaat terug → **403 scope_mismatch**, nooit "alles tonen". Elke nieuwe klant-zichtbare read/write **moet** door dezelfde scope-poort. Staff/admin gebruikt `X-Act-As-Bedrijf` (enkel @studio27.be, server-side gevalideerd via `is_staff`-poort).

### 1.6 Huisstijl-tokens & herbruikbare componenten

Kleuren (CSS-vars in `styles.css`): `--s27-blue #3083DC`, `--s27-purple #9441DB`, `--s27-green #12AC4E`, `--s27-orange #F66131`, `--s27-yellow #F8C028`, `--s27-pink #F697CE`, `--s27-indigo #5B6B8C`. Inkt `--ink #230F23` … `--ink-4`. Papier `--paper`/`--paper-2`/`--paper-3`, lijn `--line`.
Glass (in `glass.css`): `--glass-fill`, `--glass-fill-strong`, `--glass-border`, `--glass-sh`, `--glass-sh-lg`, primaire CTA-gradient `--grad-bp` (blauw→paars), canvas `--glass-grad`.
Radii `--r-sm/md/lg/pill`, fonts `--font-display: Montserrat`, `--font-body: Nunito`, easing `--ease-out`.
Discipline→kleur/label/stamp staat in `DISC_BRIDGE` (`data.js`). Per-tak kleurklasse `.br-blue/.br-pink/.br-purple/.br-green/.br-orange/.br-yellow/.br-indigo`.
Herbruikbare klassen: `.card`, `.action-card`, `.btn-primary`, `.btn-branch`, `.pill-todo/-prog/-wait/-done`, `.modal` (overlay met `backdrop-filter`), de schermvullende "tunnel"-overlay (wizards), de sidebar liquid-glass `.sb-glass`. **Bouw nieuwe schermen met deze bouwstenen.**

### 1.7 "Uitbreiden, niet herbouwen" — wat bestaat al

Veel van wat in de sessie besproken werd, **staat al live**. Bouw eróp voort:

- **Contactknop met 3 ingangen (v76):** `goContact()` (`portal.js`) → "Nieuw project" (`openOfferteWizard()`), "Algemene vraag" (`contactVraagForm()` → endpoint `contactVraag`), "Website support" (`openWebTicket()` → `ticketCreate`/`ticketAttach`).
- **Ticketing (v64):** tickets → ClickUp-lijst **Tickets `901523697831`**, assignee Klaas, `typeJob=Support` (`a8e2a949-…`), `kanBeginnen=JA`, contact server-side gematcht. Tickets zijn al zichtbaar als discipline `support` in het projectenoverzicht (`PROJ_DISC_WHITELIST` bevat `support`), met per-ticket chat.
- **Offerte-wizard:** `openOfferteWizard()` → `owSubmit()` → worker `offerteGenereren()` met 4 acties (verzenden=PandaDoc silent-send + ondertekenlink in `offerteLink`-veld; akkoord=Arne-ping; meeting=planner; bellen=`directMessage`/Twilio).
- **Video & fotografie-rework (v70–75):** dakstructuur tak-tabs, onderdelen per TYPE JOB, shoot-flow, **video-review met feedbackronde-subtaken + feedback-lock**, **fotogalerij** (Drive, masonry+lightbox, goedkeuren/downloaden, échte streaming-zip).
- **Shoot-planner:** `shootContext()`/`shootSubmit()` (TYPE JOB 6, velden `startdatum`/`locatie`/`contentCreators`, Brussel-tijd, Google Calendar, VIDEO_POOL).
- **Web-push LIVE:** `push.mjs` (`pushToEmail`/`pushToEmailPilot`, KV `push:subs:{email}`), ClickUp-webhook → push (`clickup-push.mjs`, `/clickup/hook`, HMAC, `NOTIFY_STATUSES`, `resolveEmailsForTask`, idempotentie). **Let op: push is momenteel pilot-gated naar enkel `vincent@studio27.be`** (`pushToEmailPilot`) — zie §4 WS-3 voor de go-live-switch.
- **Cron bestaat al:** `wrangler.toml` heeft `crons = ["0 3 1 * *"]` (maandelijkse ads-snapshot) en een `scheduled()`-handler in `worker.js`. Reminder-cron = een **extra** cron-regel + tak in `scheduled()`.
- **Chat (3 soorten):** project-chat (`openProjectChat()` → `chatPost`, opgeslagen als ClickUp-comments met prefix `💬 [Klant: …]`), comms-chat (`commsChatList/Post`), direct-message (`directMessage`). Berichten = iOS-inbox.
- **Notificatie-voorkeur per contact:** veld `notifKanalen` (`1f10ca20-…`, labels whatsapp/email/push).
- **Facturatie-velden bestaan al op het bedrijf:** `facturatieEmail` (`9613b4aa-…`) en **`facturatieOpm` (`36d11828-…`)** — relevant voor to-do "facturatie-opmerking" (§4 WS-9).

### 1.8 ClickUp-referentie (geverifieerde IDs)

Lijsten: Bedrijven `901520180288`, Contactpersonen `901520180286`, Offertes `901520180289`, Meetings `901520180293`, Portaal-Inbox `901520180314`, **Tickets `901523697831`**, Video-lijst `901520180316`.
Kernvelden (`FIELD`-object in `handlers.mjs`): `bedrijf 4b1fb333`, `portaalToegang f0de5c6c`, `facturatieEmail 9613b4aa`, `facturatieOpm 36d11828`, `deliverablesRaw b071307b`, `feedbackLink f2610454`, `driveFolder b3a288a1`, `startdatum 7086dc88`, `locatie fcbb46ff`, `budget c8d2dd2c`, `contentCreators dbe74db2`, `typeJob 3e76c134`, `kanBeginnen e99f30c7` (JA = `a3800974-…`), `modules b8effbfe`. Contact: `voornaam 626a0441`, `achternaam 79cbda71`, `gsm 8cee9669`, `email d453a72f`, `notifKanalen 1f10ca20`.
**TYPE-JOB-ladder (orderindex → discipline):** 1 Strategie · 2 Branding / 3 FB-Branding · 4 Pre-productie / 5 FB-Pre / 6 Shoot / 7 Montage / 8 FB-Montage · 9 Webdesign / 10 FB-Web / 11 Copy / 17 Custom · 12 SEO · 13 Social · 14 Ads · 15 Automation · 16 Opleiding · 19 Support. (FB-types 3/5/8/10 = interne feedback, gefilterd uit de klantweergave.)

---

## 2. To-do → bestaand → te bouwen (overzicht)

| # | To-do (sessie) | Bestaat al | Te bouwen | Surface | Golf |
|---|---|---|---|---|---|
| 1 | Tickets/support-opvolglijst voor klant + chat | tickets zichtbaar als support-project + chat | dedicated "Mijn vragen/Support"-overzicht met status + chat + 1-klik | Frontend (+klein worker) | **G1** |
| 2 | Sales-reflex: ticket dat eigenlijk salesvraag is → offerte | nee | UI-hint klantzijde + routing/label workerzijde + reflex Klaas | Frontend + Worker + PROCES | **G1** |
| 3 | Chat-comment → toegewezen aan wie de taak doet (niet algemene mailbox) | chat = ClickUp-comments; webhook→push bestaat | assign-comment-to-assignee + notificatie naar die persoon | Worker | **G1** |
| 4 | Auto-reminders (shoots, input, feedback, goedkeuren) | web-push + cron-infra | reminder-engine (dagelijkse cron) | Worker (cron) + CLICKUP-CONFIG | **G2** |
| 5 | ClickUp-vinkje "auto-reminders aan?" + interval | nee | 2 ClickUp-velden + lezen in engine + toggle in portaal-instellingen | CLICKUP-CONFIG + Frontend | **G2** |
| 6 | Naamgeving taken — vaste policy + hoe klant het ziet | status-labels al genormaliseerd | display-normalisatie klantzijde + naming-policy-doc | Frontend + PROCES | **G2** |
| 7 | Webdesign/grafisch workflow duidelijk (feedbackrondes, input) | dakstructuur + video-feedback als blauwdruk | fasen-kaart + gefaseerde taken voor web/grafisch | Frontend + Worker + CLICKUP-CONFIG | **G3** |
| 8 | 2 taaktypes: +pagina's vs onepager | nee | 2 ClickUp-templates + portaalweergave | CLICKUP-CONFIG + Frontend | **G3** |
| 9 | 3 taken + opstartmeeting; volgende taak pas na feedback | feedbackronde-subtaken bestaan | progressieve taakcreatie (worker) + meeting-taak in plan-flow | Worker + CLICKUP-CONFIG | **G3** |
| 10 | Afbakenen: wanneer start een nieuw project? | veld `kanBeginnen` bestaat | definitie + trigger vastleggen (kanBeginnen=JA na opstartmeeting) | PROCES + Worker | **G3** |
| 11 | Social shoots met Danique inplannen (of cc) | shoot-planner + VIDEO_POOL | Danique aan social-shoot-pool/host toevoegen | Worker (config) | **G2** |
| 12 | Content→grafisch/webdesign handoff (briefing-tabel + reflex) | nee | briefing-tabel "wat is van toepassing" + ClickUp-vinkje "team op de hoogte" | CLICKUP-CONFIG + Frontend(admin) + PROCES | **G4** |
| 13 | Bugs-chat (idee Guus): team stuurt portaal-feedback door | chat-infra herbruikbaar | staff-only bugs-kanaal → ClickUp-lijst | Frontend(staff) + Worker | **G1** |
| 14 | Kader offerte in elke briefing | offerte-data bestaat | offerte-scope-blok in briefing-generator | PROCES/skill (+evt. portaal) | **G4** |
| 15 | Facturatie-opmerking veldje team ↔ Celien | veld `facturatieOpm` bestaat | veld tonen/bewerken in staff-view; nooit klant-zichtbaar | Frontend(staff) + Worker | **G2** |
| 16 | Recurring tasks socials & ads onder hoofdtaak | onderdelen-per-TYPE-JOB-weergave | nette weergave van terugkerende onderdelen + ClickUp recurring config | CLICKUP-CONFIG + Frontend | **G4** |
| 17 | "Mijn bestanden" = Drive-mapstructuur spiegelen + before/after 2026 | flat fotogalerij + huisstijl-map + zip | bestanden-module (disciplinemappen, zoeken, archief-deeplink) | Frontend + Worker + CLICKUP/Drive-config | **G5** |

---

## 3. Roadmap in golven

Elke golf is los releasebaar (eigen `?v=`-bump), laag-risico-eerst, en raakt het boot-pad zo min mogelijk.

- **Golf 1 — Support, sales-reflex, chat-routing & bugs-kanaal.** Grootste klantwaarde, bouwt rechtstreeks op v64/v76, weinig nieuw oppervlak. (#1, #2, #3, #13)
- **Golf 2 — Reminders, instellingen, naamgeving-display, facturatie-veld, Danique.** Cron-engine + kleine velden + display-normalisatie. (#4, #5, #6, #11, #15)
- **Golf 3 — Gefaseerde webdesign/grafisch-workflow + fasen-kaart.** Het zwaarste proces-stuk; fasen-kaart in projectdetail + progressieve taakcreatie + 2 types + branding/website-split + meeting-taak + project-startdefinitie. (#7, #8, #9, #10)
- **Golf 4 — Content-handoff, recurring socials/ads, kader-offerte-in-briefing.** Vooral ClickUp-config + admin-velden + briefing-generator. (#12, #14, #16)
- **Golf 5 — "Mijn bestanden" (Drive-spiegel).** Grootste nieuwe module; hangt af van een Drive-structuurbeslissing (§7). Apart en laatst, want zwaarst en meest onzeker. (#17)

> **Belangrijk:** §5 (ClickUp-config, Vincent) loopt **parallel** vanaf dag 1 — verschillende golven hebben nieuwe ClickUp-velden/templates nodig die Vincent vooraf moet aanmaken (de API kan niet altijd velden creëren).

---

## 4. Workstreams (detail)

> Template per workstream: **Doel · Klant-UX (visueel) · Bestaat al · Te bouwen (frontend) · Te bouwen (worker) · ClickUp · Acceptatie · Risico/snelheid.**

---

### GOLF 1

#### WS-1 — Support & ticket-opvolglijst voor de klant
**Doel.** De klant kan zijn website-support- en algemene vragen **opvolgen** (status + chat) op één plek, in plaats van ze "te versturen en dan gebeurt er niks" (transcript 02:34–06:07).

**Klant-UX (visueel).** Een eigen "Support"/"Mijn vragen"-ingang (bv. onder de Contact-pagina of als sectie op Home). Lijst van kaarten: per ticket een **statusbol + statuspil** ("Ontvangen / In behandeling / Opgelost"), het onderwerp, laatste-bericht-snippet en een **"Open chat"-knop**. Eén klik → ticketdetail met de bestaande projectchat. Geen ClickUp-termen, geen TYPE-JOB.

**Bestaat al.** Tickets komen al binnen via `openWebTicket()` → `ticketCreate` (lijst `901523697831`) en zijn zichtbaar als discipline `support` met chat via `openProjectChat()`. Wat ontbreekt: een **gerichte opvolglijst** met statusvertaling + 1-klik-ingang (nu moet de klant via het algemene projectenoverzicht zoeken).

**Te bouwen (frontend, `panels.js`/`portal.js`).**
- Nieuw paneel `panelSupport()` (kopieer het patroon van `projDienst()`/`projCardFlat()`): filtert projecten op `discId==='support'`, sorteert open-bovenaan, rendert per ticket een `.action-card .br-indigo` met statuspil (hergebruik `STATUS_MAP` uit `data.js`) + "Open chat".
- Route + nav-ingang: voeg `goSupport()` toe en hang de Contact-pagina-kaart "Website support" óók aan een "bekijk mijn vragen"-link, plus een telbadge "X open" op Home wanneer er open support-items zijn.
- Statusvertaling klantvriendelijk: map ruwe statussen → "Ontvangen / In behandeling / Wacht op jou / Opgelost". Hergebruik bestaande `STATUS_MAP`; voeg enkel support-specifieke labels toe waar nodig.

**Te bouwen (worker).** Niets nieuws nodig voor de lijst zelf (tickets zitten al in de dashboard-payload als support-projecten). Optioneel: voeg in de bestaande projecten-payload een `is_ticket`-vlag toe (afgeleid van lijst-ID `901523697831`) zodat de frontend support hard kan onderscheiden van andere support-discipline-taken.

**ClickUp.** Geen nieuwe velden. (Statussen op de Tickets-lijst moeten wel de klantvriendelijke mapping dekken — zie §5.)

**Acceptatie.** Klant maakt een website-supportticket → ziet het binnen 1 klik terug in "Support" met juiste status → kan chatten → status volgt mee bij teamupdate. Bestaande projectchat blijft 1-op-1 werken.

**Risico/snelheid.** Geen extra boot-call: hergebruik de reeds geladen projecten-data; filter client-side.

---

#### WS-2 — Sales-reflex (ticket vs. salesvraag)
**Doel.** Een "ticket" dat in werkelijkheid een **salesvraag** is (nieuwe website/offerte) wordt niet als gratis support afgehandeld, maar naar de offerte-flow geleid; échte defecten ("formulier kapot") blijven gratis support recht naar Klaas (transcript 06:14–08:23).

**Klant-UX (visueel).** In het support-formulier (`wtRender()`): bovenaan twee duidelijke keuze-tegels met icoon — **"Er is iets stuk / werkt niet meer"** (→ gratis support, huidige flow) versus **"Ik wil iets nieuws / een prijs"** (→ doorsturen naar de offerte-wizard `openOfferteWizard()`). Zo kiest de klant zelf de juiste rail; minimale tekst, twee iconen.

**Bestaat al.** Niets. `ticketCreate` stuurt nu álles naar Klaas (hardcoded assignee).

**Te bouwen (frontend).** Voeg de tweekeuze-stap toe vóór het ticketformulier. "Iets nieuws/prijs" → sluit ticketoverlay, open `openOfferteWizard()`. "Iets stuk" → huidige ticketflow.

**Te bouwen (worker, `ticketCreate` in `handlers.mjs`).** Vangnet voor wie tóch via support binnenkomt met een salessignaal: lichte heuristiek op onderwerp/omschrijving (`prijs`, `offerte`, `nieuw`, `hoeveel kost`, `extra pagina`…). Bij match: zet een label/comment `→ mogelijk verkoop` op het ticket en ping Arne (`directMessage`/comment met Arne als assignee), zodat Klaas de reflex niet hoeft te bewaken. **Geen** automatische conversie naar offerte (te risicovol) — enkel signaleren.

**ClickUp.** Optioneel label `verkoop-review` op de Tickets-lijst (§5). Geen verplicht nieuw veld.

**Acceptatie.** Klant die "nieuwe pagina, wat kost dat?" kiest, landt in de offerte-wizard, niet in een gratis ticket. Een defect-melding gaat ongehinderd naar Klaas. Een salesvraag die toch als ticket binnenkomt, krijgt een zichtbaar verkoop-signaal voor het team.

**Risico/snelheid.** Heuristiek is louter signalerend (geen blokkering), dus geen valse afwijzingen. Geen impact op boot.

---

#### WS-3a — Chat-comment routeren naar de juiste persoon
**Doel.** Wanneer een klant een chatbericht plaatst op een lopend project, wordt dat **toegewezen aan wie de taak uitvoert** (bv. Guus), zodat het niet in een algemene mailbox over het hoofd wordt gezien (transcript 17:31–19:56).

**Klant-UX.** Onzichtbaar voor de klant — puur correcte routing. (De klant blijft gewoon chatten zoals nu.)

**Bestaat al.** `chatPost` (`handlers.mjs`) schrijft het bericht als ClickUp-comment met prefix `💬 [Klant: …]`. De ClickUp-webhook → push (`clickup-push.mjs`) bestaat. Wat ontbreekt: de comment **assignen** aan de taak-assignee zodat díe persoon de ClickUp-notificatie krijgt.

**Te bouwen (worker).** In `chatPost`: bepaal de assignee van de (parent-)taak; post de ClickUp-comment met `assignee` gezet op die persoon (ClickUp `comment` ondersteunt `assignee`). Heeft de taak geen assignee, val terug op de discipline-verantwoordelijke (zoals `resolveActiveSocial()` al doet voor comms). Respecteer de bestaande echo-filter in `clickup-push.mjs` (bot-comments en `💬 [`/`[INTERN]`-prefixen pushen niet, zodat de klant zijn eigen bericht niet terugkrijgt).

**ClickUp.** Geen nieuw veld.

**Acceptatie.** Klant plaatst chatbericht op project → de taakuitvoerder krijgt een gerichte ClickUp-notificatie (assigned comment) → geen verlies in algemene mailbox. Team-reflex (PROCES, §5): bij werken aan een project eerst de parent-taakchat checken.

**Risico/snelheid.** Worker-only; geen frontend-impact.

---

#### WS-3b — Bugs-kanaal voor het team (idee Guus)
**Doel.** Eén kanaal waar het **team** alle portaal-bugs/feedback dropt, zodat het portaal gericht bijgewerkt kan worden (transcript 41:57–42:26).

**Klant-UX.** Niet klant-zichtbaar. **Staff-only** (zichtbaar wanneer `body.__staff`/`is_staff`).

**Bestaat al.** Volledige chat-infra (`chatPost`/comments) + staff-gating (admin-modus). Herbruikbaar.

**Te bouwen (frontend, staff).** Een discrete "🐞 Portaal-feedback"-knop in de staff-/admin-balk → mini-composer (1 tekstveld + optioneel screenshot-upload, hergebruik de bestaande multi-file-staging). Stuurt naar een vast worker-endpoint.

**Te bouwen (worker).** Endpoint `bugReport` dat een taak aanmaakt in een **vaste ClickUp-bugs-lijst** (ID door Vincent, §5), met melder (staff-email), pagina-URL/context en bijlagen (hergebruik `ticketAttach`-patroon naar R2/ClickUp). Geen bedrijf-scope nodig (staff-only).

**ClickUp.** Nieuwe lijst "Portaal — Bugs & Feedback" (Vincent, §5).

**Acceptatie.** Teamlid klikt 🐞, typt bug + screenshot → er verschijnt een taak in de bugs-lijst met context. Niet zichtbaar voor klanten.

**Risico/snelheid.** Volledig staff-gated; geen klant-boot-impact.

---

### GOLF 2

#### WS-4 — Auto-reminder-engine
**Doel.** De klant krijgt automatisch een herinnering voor openstaande **klant-acties** (shoot inplannen, input aanleveren, feedback geven, socials goedkeuren), elke X dagen, **zonder Make** (transcript 08:33–09:54).

**Klant-UX (visueel).** De reminder zelf = een korte push-notificatie (+ e-mail-fallback) met één duidelijke actie en deeplink naar het juiste scherm. In het portaal versterkt dit de bestaande "Voor jou te doen"-cockpit (geen nieuwe tekst nodig).

**Bestaat al.** Web-push (`push.mjs`), ClickUp→push-resolutie (`resolveEmailsForTask` in `clickup-push.mjs`), cron-infra (`scheduled()` in `worker.js`, `crons` in `wrangler.toml`), statusdetectie (`NOTIFY_STATUSES` = `['doorgestuurd','input gevraagd','feedback verwerkt','on hold']`, `STATUS_COPY`). **Push is pilot-gated naar enkel `vincent@`.**

**Te bouwen (worker — nieuw bestand `gateway-v2/reminders.mjs`, < 300 regels).**
1. **Extra cron** in `wrangler.toml`: `crons = ["0 3 1 * *", "0 7 * * *"]` (dagelijks 07:00 UTC ≈ 09:00 Brussel). In `scheduled()` route op basis van `event.cron` naar `adsSnapshotWrite()` (bestaand) of `reminderEngine()` (nieuw).
2. `reminderEngine(env, ctx)`: loop over bedrijven (`adminCompanies()`), in batches van 5, fail-soft per bedrijf.
3. Per bedrijf: lees config-velden (WS-5). Reminders uit → skip.
4. Kandidaten: open taken waar **de klant aan zet** = status ∈ {`doorgestuurd`, `input gevraagd`} **of** TYPE-JOB 6 (shoot) zonder due_date **of** social-post status `feedback`. **Onderdruk** taken waarvan de geplande startdatum nog ver in de toekomst ligt (transcript 09:39: een klant die pas over 2 maanden opstart, mag geen reminder elke 5 dagen krijgen) — gebruik `startdatum`/`kanBeginnen` als poort.
5. Per kandidaat: KV-state `reminder:{bedrijfId}:{taskId}` = `{last_sent_ms}`, TTL 90 d. Stuur enkel als `now - last_sent >= interval`.
6. Versturen via de **notificatievoorkeur** van het contact (`notifKanalen`): push als ingeschreven, anders e-mail (Gmail-send via SA/DWD — zelfde pad als `contactVraag`; vereist `gmail.send`-scope, zie afhankelijkheid). Payload via een `buildReminderPayload(task)` met actie-specifieke copy (feedback / input / shoot inplannen / goedkeuren) + deeplink.

**Go-live-switch (belangrijk).** Zolang `pushToEmailPilot` enkel `vincent@` toelaat, bereiken reminders geen klanten. Plan: (a) test de engine end-to-end in pilot; (b) schakel daarna over naar `pushToEmail` (alle ingeschreven contacten) **of** verbreed de pilot-allowlist gecontroleerd. Dit is een bewuste go-live-beslissing (§7).

**ClickUp.** Zie WS-5 (2 nieuwe velden op het bedrijf).

**Acceptatie.** Een bedrijf met reminders AAN en interval 4 → een taak "wacht op feedback" die 4 dagen stil ligt → klant krijgt één duidelijke push/mail met deeplink → `last_sent` geüpdatet → geen tweede reminder binnen het interval. Een bedrijf met start over 2 maanden krijgt niets. Bedrijf met reminders UIT krijgt niets.

**Risico/snelheid.** Draait volledig in `scheduled()` (buiten het klant-request-pad) → **nul impact op portaalsnelheid**. Fail-soft per bedrijf. Idempotent via KV.

---

#### WS-5 — ClickUp-vinkje "auto-reminders" + interval + portaaltoggle
**Doel.** Per bedrijf instelbaar of auto-reminders aanstaan en om de hoeveel dagen (transcript 09:19–09:38, default 3 of 5 dagen — zie §7 beslissing).

**Bestaat al.** Niets specifiek; het FIELD-patroon en de instellingen-/admin-UI bestaan wel.

**Te bouwen.**
- **[CLICKUP-CONFIG]** Twee nieuwe velden op de **Bedrijven-lijst** (Vincent, §5): `Auto-reminders aan?` (checkbox, default uit) en `Reminder-interval (dagen)` (number, default 4, bereik 1–30). Voeg hun IDs toe aan het `FIELD`-object in `handlers.mjs`.
- **(worker)** `readReminderConfig(bedrijfId)` leest beide velden (default uit / 4).
- **(frontend, staff of klant-instellingen)** Een eenvoudige toggle in de instellingen om dit te tonen/zetten. Schrijven **altijd** via `cu.field(...)` (§1.4). Default-gedrag: opt-in (uit), zodat niemand ongevraagd gespamd wordt.

**Acceptatie.** Toggle aan + interval 5 in ClickUp → engine respecteert het. Toggle uit → stilte.

**Risico/snelheid.** Eén extra veld-read in de cron (niet in het klantpad).

---

#### WS-6 — Taaknaamgeving: display-normalisatie + policy
**Doel.** Klanten zien **propere, consistente** taaknamen, ongeacht hoe het team intern noemt; en het team hanteert één vaste naamgevingspolicy (transcript 09:57–11:07). Vincent's eigen conclusie: vaste policy + (geen riskante live AI-hernoeming).

**Klant-UX (visueel).** De klant ziet nette projecttitels en discipline-/statuslabels — nooit interne prefixen, ronde-nummers of codes.

**Bestaat al.** Statussen worden al genormaliseerd via `STATUS_MAP` (`data.js`). Taaknámen worden nu nog **rauw** (`task.name`) getoond in `projCardFlat()` en de detail-kop.

**Te bouwen (frontend).**
- Eén helper `cleanTaakNaam(naam)` (in `data.js`) die interne ruis strip (bv. `^INTERN:`, `\s*-\s*feedback`, ronde-suffixen, dubbele spaties) en op een **whitelist/regels** werkt — voorzichtig, om geen context te verliezen. Toepassen in `projCardFlat()`, de detail-kop en de berichten-inbox.
- Geen wijziging aan de echte ClickUp-namen (veilig, omkeerbaar).

**[PROCES] Naamgevingspolicy.** Lever een korte policy-doc (§5) die per discipline het vaste naamformat vastlegt (bv. `{Discipline} — {korte omschrijving}`), zodat AI-gegenereerde én handmatige taken identiek ogen. **Geen** automatische bulk-hernoeming van bestaande taken (Vincent erkende het risico dat een taak per ongeluk verdwijnt); optioneel later een **gesuperviseerde** rename-tool die enkel vóórstelt, nooit autonoom wist.

**Acceptatie.** Een taak die intern `INTERN: Montage - feedback ronde 2` heet, toont bij de klant als `Montage`. Bestaande namen blijven in ClickUp ongewijzigd.

**Risico/snelheid.** Pure display-laag, client-side; geen netwerk- of boot-impact. Houd de regels conservatief (liever te weinig strippen dan context wegnemen).

---

#### WS-7 — Facturatie-opmerking (team ↔ Celien)
**Doel.** Een veld waarin het team facturatie-opmerkingen voor Celien kwijt kan (transcript 42:28–42:41).

**Klant-UX.** **Nooit klant-zichtbaar.** Staff/admin-only.

**Bestaat al.** Het veld **`facturatieOpm` (`36d11828-…`)** bestaat al op het bedrijf. Mogelijk volstaat het dit te **tonen/bewerken** in de staff-view.

**Te bouwen.** (frontend staff) Toon `facturatieOpm` als bewerkbaar tekstveld in de admin-/bedrijfsdetail-staffweergave; (worker) schrijf via `cu.field(...)`. Bevestig met Vincent of de opmerking op **bedrijfsniveau** volstaat of per-project/factuur moet (§7) — in dat laatste geval een analoog veld op de project- of offerte-lijst.

**Acceptatie.** Teamlid noteert "factuur splitsen over 2 vennootschappen" → zichtbaar voor Celien in ClickUp/staff-view → onzichtbaar voor de klant.

**Risico/snelheid.** Staff-gated; geen klantimpact.

---

#### WS-8 — Social shoots met Danique
**Doel.** Social shoots worden bij **Danique** ingepland (of cc bij volle planning) (transcript 38:22–26).

**Bestaat al.** Shoot-planner + `VIDEO_POOL` (4 content creators) + pool-toewijzing.

**Te bouwen (worker, config).** Voeg Danique toe aan de pool/host-set die voor **social** shoots geldt (onderscheid social-shoot van video-shoot via lijst/TYPE-JOB indien nodig). Bij volle agenda: cc-gedrag (notificatie naar backup) — hergebruik de bestaande availability-doorsnede.

**ClickUp.** Danique's ClickUp-member-ID (Vincent, §5).

**Acceptatie.** Een social-shoot-boeking valt op Danique's beschikbaarheid; bij vol → cc/backup.

**Risico/snelheid.** Config in bestaande planner; geen nieuwe paden.

---

### GOLF 3

#### WS-9 — Gefaseerde webdesign/grafisch-workflow + fasen-kaart
**Doel.** Een duidelijke, gefaseerde workflow voor webdesign én grafisch werk, met zichtbare feedbackrondes en "volgende fase pas na goedkeuring" — net als de video-montage-navigatie (transcript 30:52–38:22).

**Klant-UX (visueel).** In projectdetail een **fasen-kaart** (compacte dot/stappen-indicator): bv. webdesign → *Opstart → Ontwerp (1-2 pagina's) → Uitwerking → Oplevering*; video → *Pre-productie → Shoot → Montage → Nabewerking*. Per fase een statusbol, het feedbackronde-nummer, en — enkel voor de actieve fase — de actie (feedback geven / goedkeuren). Fase 2 wordt pas "open" getoond zodra fase 1 goedgekeurd is. Eén overzicht, één chat per project (transcript 34:53: "één chat per ding").

**Bestaat al.** `procesBlock(det, p)` (proces-overzicht) + `timelineSteps(p)` (fallback van 4 generieke fasen, **zonder** TYPE-JOB). Worker `buildProces(rootTask, descendants)` levert stappen maar **mist `type_job` per stap** → echte fase-indeling is nu onmogelijk. Video-feedback met ronde-subtaken bestaat (`feedbackV2`), maar de **ronde-teller is hardcoded op 1**.

**Te bouwen (worker, `handlers.mjs`).**
- **Additief:** voeg `type_job: tjNum` toe aan elk stap-object in `buildProces` (geen breaking change).
- **Ronde-teller fixen:** in `feedbackV2` het rondenummer afleiden uit het aantal bestaande FB-subtaken (i.p.v. hardcoded "ronde 1").
- **Progressieve taakcreatie (vervangt elk "Make-scenario"-idee):** bij een geslaagde feedback/goedkeuring (binnen `feedbackV2` of via `/clickup/hook` op statuswissel) en wanneer de huidige fase is goedgekeurd → maak de **volgende fase-taak** aan volgens het project-template, met guard "alleen als die nog niet bestaat". Zo verschijnen taken pas wanneer relevant (transcript 25:00–33:08, "geen placeholders").

**Te bouwen (frontend, `panels.js`).**
- `sideFasen(det, p)`: mapt de proces-stappen op de TYPE-JOB-ladder naar een visuele fasen-kaart (video: 4/6/7 + oplevering; web: 9→ontwerp/uitwerking + oplevering). Niet-gemapte disciplines vallen terug op `timelineSteps`. Render als compacte stappen-indicator boven de deliverables in de detail-zijbalk; toon ronde-teller per fase.

**[CLICKUP-CONFIG] / [PROCES].**
- **2 projecttypes** (WS-10): templates voor "Website (meerdere pagina's)" vs "Onepager".
- **3 taken + opstartmeeting:** template = hoofdtaak (parent) + opstartmeeting-taak + 3 fase-subtaken; meeting-taak hangt op de juiste "punten" (labels) zodat de klant er een melding van krijgt om in te plannen (transcript 31:19–32:13).
- **Branding vs Website:** houd het **aparte taken** (niet samenvoegen — "dat breekt", transcript 35:11–35:21), maar sta toe dat de opstartmeeting samen of apart gepland wordt (ideaal: eerst branding volledig → stylesheet/logo klaar → dan website-opstart, transcript 35:55–36:51). Eén chat-overzicht per project blijft.
- **Project-startdefinitie (WS-10 "afbakenen"):** definieer de trigger die een verkochte opdracht omzet in een actief portaalproject = **opstartmeeting gebeurd + `kanBeginnen=JA`**. De portaalweergave toont een project pas als "lopend" vanaf dat punt.

**Acceptatie.** Klant opent een webdesignproject → ziet een heldere fasen-kaart → geeft feedback op fase 1 → fase 2-taak verschijnt automatisch en wordt pas dan "open" getoond → ronde-teller klopt. Branding en website blijven aparte taken met één gedeelde chat.

**Risico/snelheid.** `buildProces`-uitbreiding is additief (oude frontend blijft werken). Progressieve creatie via worker/webhook → buiten klantpad. Test grondig op een niet-gekoppeld testproject (transcript noemt o.a. Ars Interiors / Sani / Van Geel als kandidaten — gebruik een **testbedrijf**, niet een echte klant).

---

### GOLF 4

#### WS-10 — Content → grafisch/webdesign handoff
**Doel.** Wanneer verkochte content (video/foto) daarna voor grafisch of webdesign gebruikt wordt, weet het juiste teamlid dat het door moet (transcript 38:28–41:47). Vincent: "eerste fase gewoon manueel — een vinkje."

**Klant-UX.** Niet klant-facing (intern). Wel: het "beeldje van bovenaf" (de offerte-scope, WS-13) maakt zichtbaar welke diensten bij dit project horen.

**Te bouwen.**
- **[CLICKUP-CONFIG]** Op de content-/projecttaak een checkbox-veld **"Team nog op de hoogte te houden?"** + (labels) welk team (socials / ads / webdesign). Voeg veld-ID toe aan `FIELD`.
- **[PROCES]** Reflex: het teamlid dat content oplevert, vinkt aan + stuurt door naar het andere team.
- **(frontend, staff/admin, optioneel)** Toon dit vinkje + de "wat is van toepassing"-tabel in de staff-projectweergave en in de briefing (WS-13).
- **[PROCES]** "Opkasten" van de contentlijst: schrap overbodige velden (Vincent, §5).

**Acceptatie.** Een videotaak met "gebruikt voor webdesign" aangevinkt → webdesign-team wordt gesignaleerd → geen losse content die blijft liggen.

**Risico/snelheid.** Eerste fase manueel/vinkje; geen automatisering die kan misgaan.

---

#### WS-11 — Recurring socials & ads onder hoofdtaak
**Doel.** Voor socials en ads worden de terugkerende taken automatisch aangemaakt onder een hoofdtaak en netjes getoond (to-do #1).

**Klant-UX (visueel).** Onder het socials-/ads-project een nette lijst van terugkerende onderdelen (per maand/periode) met statuspillen — geen rommelige losse taken. Sluit aan op de bestaande onderdelen-per-TYPE-JOB-weergave en de socials-planner.

**Te bouwen.**
- **[CLICKUP-CONFIG]** Recurring task-templates onder de socials-/ads-hoofdtaak (ClickUp recurring of een lichte worker-generator in `scheduled()` als ClickUp-recurring niet volstaat — **geen Make**).
- **(frontend)** Zorg dat de bestaande onderdelen-weergave de terugkerende kinderen groepeert en chronologisch toont; hergebruik `STATUS_MAP` en de socials-subnav.

**Acceptatie.** Een socials-hoofdtaak toont automatisch de maandelijkse onderdelen met juiste status; geen losse wildgroei.

**Risico/snelheid.** Vooral ClickUp-config; portaal toont bestaande data.

---

#### WS-13 — Kader offerte in elke briefing
**Doel.** Elke (project)briefing bevat het **offerte-kader**: wat is verkocht, welke diensten zijn aangevinkt, wat is de scope (transcript 38:44, 42:28).

**Bestaat al.** Offerte-data in ClickUp (Offertes-lijst) + de briefing-/voorbereiding-generator (skill `voorbereiding` / projectbriefing).

**Te bouwen.**
- **[PROCES/skill]** Voeg een vast "Offerte-kader"-blok toe aan de briefing-generator: verkochte diensten (aangevinkt), budget/scope, en de "wat is van toepassing"-tabel (WS-10). Dit is het "beeldje van bovenaf" dat toont welke andere deliverables er nog komen.
- **(optioneel, frontend staff)** Toon het offerte-kader in de staff-projectweergave.

**Acceptatie.** Elke nieuwe briefing opent met een helder offerte-kader; team ziet in één oogopslag de volledige verkochte scope.

**Risico/snelheid.** Buiten het klantportaal-runtimepad (generator/skill + optioneel staff-view).

---

### GOLF 5

#### WS-12 — "Mijn bestanden" (Drive-mapstructuur spiegelen)
**Doel.** De klant vindt al zijn opgeleverde bestanden terug in het portaal, in een spiegel van de Google Drive-mapstructuur (Strategie / Branding / Video Fotografie / Website / Socials / Adverteer), in S27-huisstijl, met zoeken op naam/datum, en een before/after-2026-split (transcript 20:34–30:50).

**Klant-UX (visueel).** Naast "Mijn werk" (= actieve projecten) een ingang **"Mijn bestanden"**. Tegels per discipline-map (kleur + icoon = `DISC_BRIDGE`). Klik → bestandsraster (icoon/thumbnail, naam, datum, grootte) met **zoeken op naam** en **filter op datum**, "Download" per bestand en "Alles downloaden" (zip). Plus een rustige **"Archief (voor 2026)"**-deeplink voor de oude, ongestructureerde map. Op project-/tak-pagina's een klein tipje "video uit het verleden raadplegen → naar Mijn bestanden".

**Bestaat al.** Flat Drive-listing per map (`fotoList`/`huisstijlList`), foto-CDN-thumbnails, signed proxy (`/fotostream`, `/videostream`), **streaming-zip** (`zipstream.mjs`), Drive-toegang via SA + DWD (`mintGoogleToken`, `GDRIVE_SUBJECT`, shared drive `0AKAHMRq7JrrEUk9PVA`), bedrijf-Drive-map in veld `driveFolder`, `driveEnsure()` maakt bedrijfsmap + Huisstijl-map.

**Kritieke beperking (read this).** De huidige Drive-integratie doet **geen recursieve maptraversal** — enkel een **flat listing per opgegeven map-ID**. Een volledige, automatische boomspiegel is dus niet "gratis". Twee haalbare wegen (beslissing §7):
- **(Aanbevolen) Bekende disciplinemappen, 1 niveau diep.** Per bedrijfsmap enumeren we de vaste set submappen (Strategie/Branding/Video Fotografie/Website/Socials/Adverteer) — een handvol Drive-calls, hard gecachet in KV (`drivemeta:{folderId}`, SWR zoals `vrmeta` 7 d). Binnen elke disciplinemap: flat bestandslijst (de bestaande `fotoList`-aanpak, uitgebreid naar alle mime-types). Past exact op Vincent's idee van een **nieuwe, gestructureerde Drive** met vaste mappen per bedrijf.
- **(Zwaarder) Generieke recursie.** Algemene boom-uitlezing met N+1 Drive-calls — alleen met agressieve caching en duidelijke diepte-limiet; meer risico op traagheid. Niet aanbevolen voor v1.

**Te bouwen (worker — uitbreiding `videoreview.mjs`/nieuw bestand).**
- `mijnBestandenTree(bedrijfId)`: resolve bedrijfsmap (`driveFolder`), enumereer de vaste disciplinemappen (1 niveau), cache in KV. Per disciplinemap een flat bestandslijst (alle mime-types, niet enkel images), met signed download-URL per bestand (HMAC, zoals foto's) en een zip-URL per map (hergebruik `zipstream.mjs`, mappen overslaan).
- Scope-guard: bedrijfsmap moet bij het ingelogde bedrijf horen (fail-closed). Geen rauwe Drive-IDs naar de client; enkel signed proxy-URLs.
- **Before/after-2026:** "Archief (voor 2026)" = één deeplink naar de oude Drive-map (geen poging om de oude rommel te spiegelen — transcript 24:08, "dat is een shitshow"). De nieuwe gestructureerde map = de gespiegelde weergave.

**Te bouwen (frontend, `panels.js`/`portal.js`).** `panelMijnBestanden()` + `openDisciplineMap()`: disciplinetegels → bestandsraster met zoek/filter/sorteer (client-side op de geladen meta), download + zip-knoppen in de toprij (consistent met de fotogalerij-polish van v75). Respecteer de lightbox/preload-patronen voor beeld.

**[CLICKUP/Drive-CONFIG] / [PROCES].** Nieuwe gestructureerde Drive-mapconventie per bedrijf (Vincent, §5). Bestaande klanten krijgen de structuur "vanaf nu" (transcript 26:36) — niet met terugwerkende kracht (oude = archief-deeplink). Overweeg een stagiair/jobstudent voor de opkuis van oude mappen (transcript 29:06 — buiten portaalscope).

**Video-embedding (open punt).** Drive-video's zijn **niet** publiek embedbaar op websites (header/vacature-video) zonder OAuth; binnen het portaal werken ze via de signed Range-proxy (`/videostream`). Advies: voor publieke website-video's Vimeo/YouTube blijven gebruiken; Drive enkel binnen het portaal. (Transcript 22:12–23:21 liet dit open.)

**Acceptatie.** Klant opent "Mijn bestanden" → ziet disciplinemappen in huisstijl → opent "Video Fotografie" → vindt zijn video's/foto's → zoekt op naam/datum → downloadt los of als zip → vindt oud materiaal via "Archief (voor 2026)". Laadt snel (KV-gecachet), spiegelt de nieuwe Drive-structuur.

**Risico/snelheid.** Drive-calls **hard cachen** (KV SWR), nooit synchroon in het boot-pad; lazy-load per disciplinemap pas bij openen. Begin met de aanbevolen 1-niveau-aanpak; generieke recursie enkel indien Vincent dat expliciet wil.

---

## 5. ClickUp- & procesconfiguratie (Vincent — parallel aan de bouw)

Deze items zijn **geen portaalcode**. De bouwagent levert per item de exacte instructies + (waar mogelijk) klikbare stappen; Vincent voert ze in ClickUp uit, want de API kan niet altijd velden/lijsten aanmaken.

1. **Reminder-velden** op Bedrijven-lijst: `Auto-reminders aan?` (checkbox), `Reminder-interval (dagen)` (number, default 4). → IDs doorgeven voor `FIELD`.
2. **Bugs-lijst** "Portaal — Bugs & Feedback" aanmaken → lijst-ID voor `bugReport`.
3. **Content-handoff-veld** "Team nog op de hoogte te houden?" (checkbox + team-labels) op de content-/projecttaken.
4. **Facturatie-opmerking**: bevestigen of `facturatieOpm` op bedrijfsniveau volstaat, of ook per project/factuur nodig (§7).
5. **Webdesign/grafisch-templates**: "Website (meerdere pagina's)" en "Onepager", elk = hoofdtaak + opstartmeeting-taak + 3 fase-subtaken, met de juiste TYPE-JOB per fase. Branding apart van website.
6. **Recurring socials/ads**: terugkerende onderdelen onder de hoofdtaak (ClickUp recurring).
7. **Tickets-statussen**: zorg dat de Tickets-lijst statussen heeft die op klantvriendelijke labels mappen (Ontvangen/In behandeling/Wacht op jou/Opgelost) + optioneel label `verkoop-review`.
8. **Naamgevingspolicy** (doc): vast naamformat per discipline.
9. **Danique**: ClickUp-member-ID voor de social-shoot-pool.
10. **Nieuwe Drive-mapconventie** per bedrijf (vaste disciplinemappen) + "vanaf nu"-afspraak; oude map = archief-deeplink.
11. **Gmail-send-scope** (`gmail.send`) toevoegen voor de SA/DWD in admin.google.com (nodig voor reminder-mailfallback en bestaande contactVraag-mail).
12. **Webhook-events**: bevestig dat `/clickup/hook` de events dekt die WS-3a/WS-9 nodig hebben (taskStatusUpdated, taskCommentPosted).

---

## 6. Verificatie & release-checklist (per golf)

1. **Lokaal/logisch nazicht** van de gewijzigde functies (grep op functienaam; geen aanname op regelnummer).
2. **Bestaande functies intact?** Loop de §1.7-lijst af: boot, ads/socials-rapportage, video-review, fotogalerij, shoot-planner, offerte-wizard, push, admin-modus. Niets gebroken.
3. **Scope-guard** op elke nieuwe klant-read/write (fail-closed) — getest met een testbedrijf.
4. **Custom fields** geschreven via `cu.field(...)`, nooit PUT (§1.4).
5. **Snelheid:** geen nieuwe synchrone call in het boot-pad; nieuwe data lazy + KV-gecachet.
6. **Visuele consistentie:** enkel bestaande tokens/componenten (§1.6); mobiel getest (inputs ≥16px tegen iOS-zoom).
7. **Versie-bump:** `?v=NN` (index.html) + `s27-portaal-vNN` (sw.js).
8. **Deploy:** frontend = push; worker = lever Vincent het exacte `wrangler deploy`-commando + stappen.
9. **Verifieer op root** `portaal.studio27.be/` dat de nieuwe versie laadt en de feature werkt (deel een screenshot/bewijs).
10. **Memory bijwerken** na elke golf (Studio 27-werkwijze): wat is live, welke `?v=`/worker-commit, openstaande punten.

---

## 7. Beslissingen om te bevestigen (defaults gekozen, Vincent kan bijsturen)

1. **Reminder-interval default:** voorstel **4 werkdagen** (tussen Vincent's 3 en 5), per bedrijf instelbaar; opt-in (default uit). Bevestigen of 3, 4 of 5.
2. **Push go-live:** reminders + chat-notificaties eerst in **pilot** (vincent@), daarna gecontroleerd ontgrendelen naar alle ingeschreven contacten. Akkoord met dit twee-staps-go-live?
3. **"Mijn bestanden" Drive-aanpak:** **aanbevolen = vaste disciplinemappen, 1 niveau diep, hard gecachet** (matcht de nieuwe-Drive-structuur), met "Archief (voor 2026)" als deeplink. Akkoord, of toch generieke recursie?
4. **AI-taakhernoeming:** **niet** live/autonoom (te riskant); wel display-normalisatie + naamgevingspolicy. Akkoord? (Optioneel later een gesuperviseerde voorstel-tool.)
5. **Facturatie-opmerking niveau:** bedrijfsniveau (`facturatieOpm` bestaat) — volstaat dat, of ook per project/factuur?
6. **Golf-volgorde/prioriteit:** voorgestelde volgorde G1→G5. Wil je een andere feature eerst (bv. "Mijn bestanden" vroeger, of reminders eerst)?

---

## 8. Buiten scope / expliciet niet

- **Geen Make** in welke vorm dan ook (harde constraint).
- **Geen** autonome bulk-hernoeming of -verwijdering van ClickUp-taken.
- **Geen** publieke Drive-video-embedding op websites (gebruik Vimeo/YouTube).
- **Geen** spiegeling van de oude (pre-2026) rommelmap — enkel een archief-deeplink.
- **Geen** wijziging aan ads-/socials-rapportage, video-review-engine, offerte-PandaDoc-keten of admin-boot-pad, tenzij een workstream het expliciet vraagt.
- **Niet-portaal** zaken uit het transcript (sollicitatie Marianne Gilson, Drive-opkuis door stagiair, persoonlijke planning) vallen buiten dit plan.

---

*Einde masterplan. Begin bij Golf 1. Bouw niets vóór §1 gelezen is. Bij twijfel over een beslissing uit §7: vraag Vincent, bouw niet op een aanname.*
