# Studio 27 Klantenportaal — Werk-log V3 (nacht 1 → 2 juni 2026)

> Dit is het "wat-heb-ik-gedaan"-document dat je vroeg. Het hoort bij `REWORK_PLAN_V3.md` (het volledige masterplan). Hieronder: wat ik concreet heb gebouwd + geverifieerd, de uitdagingen, wat anders liep dan verwacht (zodat we sneller worden), de **ROOD-gemarkeerde** dingen, en jouw actielijst.

## 🔴 UPDATE 2 juni — brand-overhaul + GO-LIVE (na jouw feedback)
Je gaf feedback dat de UI te oppervlakkig was (afgeleide iconen i.p.v. echte merkstempels, takken enkel op de home) en zei "zet alles in 1 keer live". Dat is nu gebeurd:

**✅ LIVE op `main` (CDN), commit `99b24a0`:**
- **Echte merk-stempels** uit het design system vervangen de generieke lijn-iconen — Strategie (blauw), Branding (roze hart), Video & fotografie (paarse lens), Webdesign + SEO (groene check), Online adverteren (oranje), Social media (geel). Self-hosted in `/assets/`. Géén afgeleide iconen meer.
- **Website-look**: lowercase taklabels, rondere kaarten (28px), scribble-onderlijning op accent-woorden, bounce-knoppen, mini-stempels in de nav.
- **Takken in de nav**: "Mijn werk"-dropdown toont nu alle 8 takken als eigen knop (niet enkel op de home) + Performance + Alle projecten; vergrendelde takken worden verborgen.
- **Inplannen doorgetrokken over alle takken** (commit `3178c62`): `taskScheduleType()` herkent te-plannen strategiesessies/opstartmeetings/meeting-taken (keyword + discipline) → cockpit toont "Plan je strategiesessie/opstartmeeting/afspraak", project-detail toont een inplan-blok met merk-CTA (opstart: voorkeur fysiek bij Studio 27). Shoot-flow ongewijzigd. *Echte assignee-agenda free/busy + auto Google Calendar-invite = backend-vervolgstap (nu: voorstel-moment → team bevestigt + nodigt uit).*
- **Per-video goedkeuring bestond al** (geverifieerd): `parseDeliverablesRaw` splitst meerdere links → elk eigen ✅/💬-knop + kanaal/tekst/upload, submit pas als alles beantwoord is.
- **Ads-rapport (`performance-report.html`) — Arne's terminologie-bijbel toegepast** (live, getest met echte data): Snapchat-swipes heten nu overal **"Klikken"** (nooit "Swipes/Swipe-ups/per swipe"); **"Gem. CTR/CPC" → "CTR/CPC"**; platformnamen **voluit** (Meta Ads / TikTok Ads / Snapchat Ads / Google Ads); de gele "interpretatie"-callout in de data-sectie geneutraliseerd; methodologie-voetnoot herschreven; trend-kleuren al conform (oranje i.p.v. rood, besteding neutraal, CPC omlaag = groen). Normalisatie geldt voor élke databron (raw + gecachet).
- **Ads-rapport STRUCTUREEL uitgebreid** (live, commit `5c804ef`, getest met echte data): nieuwe sectie **"Campagnes per platform"** (één tabel per kanaal in Arne's kolomvolgorde — Campagne · Status · Spend · [Leads · CPL] · CPM · CTR · CPC; **leads/CPL** verschijnen enkel bij leadcampagnes (conversions>0); **status-pills** Actief/Gepauzeerd/Beëindigd; geen rood) + sectie **"Optimalisatie & advies"** (data-gedreven aanbevelingen met prioriteit Hoog/Middel/Laag + "Waarom:"-paragraaf die met het hardste cijfer opent; Hoog = oranje, niet rood). Alles in merkstijl. Geverifieerd: 4 platformtabellen, 9 campagnes, 2 optimalisaties, 0 errors.
- **Nog open in het ads-rapport (data-pipeline-afhankelijk, niet puur frontend):** per-campagne **evolutiegrafieken** + **periode-vergelijking-per-campagne** + Google **"conversies per type"** + adset/ad-accordions. Die vereisen dat `buildDataset` (of de Make ads-scenario's `s_27_ads_21/22/23`) per-campagne dagdata (`dag_*_campaign`), vorige-periode-per-campagne (`vorige_periode_*_campaign`) en adset/ad-niveau **exposet** — de huidige opgeschoonde data heeft enkel campagne-totalen. Dat is een data-laag-build, niet enkel render.
- *(raw.githack-CDN heeft ~2-5 min lag; GitHub-raw is meteen vers — geverifieerd HTTP 200 op de assets.)*

**🔴 LIVE Make-wijziging (geverifieerd, additief) — scenario `5896037` "Dashboard Feed":**
- Je gaf akkoord (3a) om de feed uit te breiden naar **8 module-booleans**. Gedaan, **additief** (4 nieuwe sleutels: strategie/branding/video_fotografie/webdesign), bestaande sleutels onaangeroerd.
- **Geverifieerd via curl op beide testbedrijven:** BV → `{…strategie:true, branding:false, video_fotografie:true, webdesign:true, seo:false, performance:false…}` (exact = ClickUp-veld); 2BV → strategie/branding/video/webdesign:false, rest:true (exact). Valide JSON, 6 projecten teruggegeven.
- **Rollback klaar:** `MAKE_BACKUPS/5896037_dashboardfeed_before_v3.json` bevat de originele module 24 + 13 — terugzetten = die 2 fragmenten herstellen via `scenarios_update`.
- → **Verifieer dit als eerste** in jouw test: log in als testbedrijf en check dat de juiste takken locked/actief zijn. Werkt het niet zoals verwacht, gebruik de rollback.

**🔴 Notify-dispatcher GEBOUWD + WhatsApp-verzending GETEST (scenario `6002032`, ACTIEF):** `[PORTAL v2] notify-dispatcher`, map 348572, hook `ada8k6ss2o91qpjpkrvgkp6rbv7jxano`. Flow: webhook{contact_id,kind,project,onderwerp,datum} → ClickUp getATask → leest Notificatie-voorkeur+GSM+e-mail+voornaam → bepaalt kanaal + **ContentSid per `kind`** (de 5 approved templates) + bouwt **ContentVariables** JSON → **WebhookRespond** (routing-beslissing) → **HTTP POST naar Twilio Content API** (Basic Auth; Auth Token enkel in Make, NIET in git). Execution **status SUCCESS** — bereikt Twilio met juiste template + variabelen, geen auth-/validatiefout. Curl-getest: feedback_herinnering → Jan → template `HXaf3d…`, send_whatsapp:yes. **Geleerd:** Make-IML heeft géén `chr()` (bouw JSON met template-strings `{"1":"{{..}}"}`); native Twilio-module kan géén Content-templates (enkel `to`+`body`) → daarom HTTP Content API; `http`-module vereist `followAllRedirects` als `followRedirect:true`. **⚠️ Voor échte aflevering:** het opgegeven afzendernummer **+1 555 979 1498** is geen geldige WhatsApp-sender → vervang in module 7 (`From`) door je echte Twilio WhatsApp-sender (of sandbox `whatsapp:+14155238886`) en test naar je eigen gsm. Chatbot-suggestiechips ook verrijkt.

**WhatsApp-dispatcher — connecties gevonden, klaar om af te werken:** je hebt zowel een **Twilio** (`7860123`) als een **WhatsApp Business Cloud x S27** (`5770466`) connectie. Het ClickUp-veld **Notificatie-voorkeur** (`ad6f0803-857b-451c-96cb-fdd15b70cc5b`: WhatsApp `2fd124e0…` / E-mail `e7534000…` / Beide `9041d265…` / Geen `249174c9…`) bestaat. **Echte blokkering** voor live-sturen is niet de connectie maar een **Meta-goedgekeurde WhatsApp-template** (verplicht voor business-initiated berichten) + de keuze welke events een melding triggeren. Dispatcher-spec staat in REWORK_PLAN_V3 §4.2; ik bouw 'm zodra de template er is.

---

## 🟢 / 🔴 Status van de eerste nacht (vóór deze update)
De onderstaande log beschrijft de eerste, volledig veilige nacht (branch, niets live). Sindsdien is bovenstaande live gezet.

---

## 1. Wat ik gebouwd + geverifieerd heb (branch `portal-v3-rework`)

Alles is lokaal getest met de echte widget (`portal-local.html?demo=1&auth=v1`) op `localhost:8779`, met screenshots en DOM-checks. `node --check` groen.

### ✅ A. Design system 1:1 met de bijbel
- De `:root` van `dashboard.css` bleek **al** grotendeels te kloppen (blauw `#3083DC`, paars, groen, oranje, geel, roze, inkt, papier, Montserrat + Nunito). Goed nieuws — minder werk dan verwacht.
- **De échte fout die ik vond + fixte:** er was **geen canonieke tak→kleur-binding**. Ik heb `DISC_COLOR` toegevoegd (`dashboard.js`) als enige bron van waarheid, conform `colors_and_type.css`:
  **Strategie = blauw · Branding = roze · Video & fotografie = paars · Website & SEO/GEO = groen · Online adverteren = oranje · Social media = geel.**
- Dit corrigeert twee zichtbare afwijkingen: **SEO/GEO** stond op geel → nu **groen** (web-familie, zoals de bijbel); **Social** stond op blauw → nu **geel**.

### ✅ B. "Onze diensten voor jou"-hub: 8 takken + subtiele locked-teasers (de FOMO-strategie)
- De Start-pagina toont nu alle **8 klant-takken** als kaarten in hun bijbel-kleur (`renderDienstenGrid`).
- **Actieve tak** = kaart in takkleur + live telling ("3 lopend") + deeplink naar die tab.
- **Niet-actieve tak** = exact wat je vroeg: een *subtiele* teaser (gestreepte rand, gedempt icoon, badge "Nog niet actief", verleidelijke zin, en op hover een "Meer weten? →" die een vrijblijvend interesse-bericht opent). FOMO by design, niet irritant. Geverifieerd: de locked-kaart is duidelijk maar zacht onderscheiden van de actieve kaarten.
- **Slim gemaakt zonder backend-afhankelijkheid:** `disciplineState()` gebruikt eerst de expliciete module-vlag uit de feed; ontbreekt die, dan *inferentie* (heeft de klant projecten in die tak?). → werkt **nu al** correct, en wordt **exact** zodra de feed alle 8 vlaggen stuurt (zie §4 ROOD-keuze).
- De ClickUp-velden zijn er klaar voor: het veld *Actieve portaal-modules* is intussen uitgebreid naar **10 opties** (Strategie, Branding, Video-en fotografie, Webdesign, Social media, Online adverteren, Support, SEO-GEO, Performance, Opleidingen). Beide testbedrijven hebben **complementaire** sets → ideaal om locked vs. actief te testen.

### ✅ C. "Jouw contactpersonen bij Studio 27" (meervoud!)
- `renderContact` is herschreven naar de vaste **trio**: **Ilke Meeusen — Accountmanager**, **Arne Goetschalckx — Vertegenwoordiger**, **Vincent Verleije — Zaakvoerder**, elk met foto (uit `TEAM_PHOTOS`) en een "Bericht <voornaam>"-knop die via het bestaande `directMessage`-scenario in ClickUp landt. (Arne's rol stond verkeerd als "Zaakvoerder" → nu "Vertegenwoordiger", ook in de DM-ontvangerlijst.)
- Geverifieerd met screenshot: drie kaarten, juiste rollen, foto's laden.

### ✅ D. Onboarding-tour: 1× + expliciete opt-out + dynamischer
- De tour speelde **al** maar 1× (gate `localStorage 's27_tour_completed'`). Toegevoegd: een expliciete knop **"De rondleiding niet meer tonen"** op elke stap, die de tour permanent uitzet (ook bij handmatig heropenen).
- **Dynamischer gemaakt** zoals gevraagd: elke stap heeft nu een **spotlight** — een pulserende blauwe ring rond het echte nav-element (bv. "Mijn werk") dat boven de gedimde overlay "uitlicht", plus `scrollIntoView`. Geverifieerd met screenshot (de "Mijn werk"-groep licht op).

### ✅ E. Instellingen-polish
- **Wachtwoord-reset**: nu conditioneel — onder auth-v2 (Firebase, de live default) verdwijnt de "toegangscode resetten" en komt er een correcte uitleg ("je logt in met Google/e-maillink + 2FA, niets te resetten"). Onder `?auth=v1` blijft de oude reset (vangnet). Geverifieerd: in v1-demo toont de oude knop, in v2 de Firebase-uitleg.
- **Cache/sessie subtieler**: de prominente "Cache wissen"-knop is nu een discrete **tekstlink** in de hint ("Zie je een oude versie? *Cache wissen & vers herladen*"). Blijft volledig werken voor jouw tests; herlaadt naar de juiste portaal-URL. Geverifieerd met screenshot.
- **Contactpersonen** in Instellingen tonen nu óók de **trio** (i.p.v. één account manager), consistent met de Start-pagina.

### ✅ F. Het masterplan zelf (`REWORK_PLAN_V3.md`)
- Volledige feature-per-feature spec van **alle ~16 vragen**, mijn architectuurkeuzes, en — zoals je vroeg — een **doemdenker-premortem** met elke bug/risico dat ik vooraf zie (Make-valkuilen, CORS/form-urlencoded, ClickUp scope-lek, calendar freeBusy, XSS, dubbele meldingen, …) + de mitigatie per stuk.

**Git:** branch `portal-v3-rework`, commit `354b786`. Niet gepusht. `main`/CDN ongewijzigd.

---

## 2. Architectuurbeslissingen (jouw open vragen beantwoord)

1. **Webflow MCP-link?** → **Geen link nodig: de connectie is al actief** (Data + Designer API). Vóór ik rechtstreeks in Webflow schrijf heb ik enkel jouw "ja" op de **site_id** nodig. Die heb ik gevonden: **"Opfrissing Studio 27" = `6836e01bc97620980f99aab1`** (`www.studio27.be` — de CDN-host in het portaal matcht dit ID, dus dit is zeker de juiste site). Het portaal-embed zelf vereist geen Webflow-wijziging.
2. **Eén GitHub-sessie of losse pagina's?** → **Eén SPA-shell** (huidige opzet) + de **rapport-engines in een iframe** (ads/performance). Reden: één design-bron, snelste UX, gedeelde auth/gateway, minst onderhoud. Volledige onderbouwing in het masterplan §0.
3. **Modules + "ze missen iets"** → opgelost via de Diensten-hub met locked-teasers (hierboven §1-B).

---

## 3. Uitdagingen + wat anders liep dan verwacht (zodat we sneller worden)

- **Meeviel:** het design system was al ~95% in lijn — de echte gap was puur de tak→kleur-binding, niet de tokens. Volgende keer: eerst de `:root` diffen tegen `colors_and_type.css` (5 min) i.p.v. een grote CSS-herwerking aannemen.
- **Meeviel:** héél veel features die je vroeg bestaan al in een vorm (shoot-scheduling-widget, prijslijst/offerte-flow, facturatie-tab, notif-prefs, cockpit "te doen", per-deliverable parsing). De rework is dus vooral *uitbreiden + op één lijn brengen*, niet herbouwen. Dat is goed nieuws voor de planning.
- **Tegenviel / verrassing:** het ClickUp-veld *Actieve portaal-modules* was sinds de laatste notitie stilletjes uitgebreid van 5 → **10 opties** (alle takken). De frontend kende er nog maar 5. → De datalaag liep dus vóór op de frontend; ik heb de frontend bijgetrokken (8 takken) met een inferentie-fallback zodat het werkt vóór én na een feed-update.
- **Technische val (bevestigd uit LEARNINGS, niet zelf ingelopen):** de `Explore`-subagent heeft een strikte prompt-lengtelimiet (faalde 2× op "Prompt is too long"). Les: subagent-prompts kort houden of zelf grep'en. De 271 KB `dashboard.js` heb ik daarom met gerichte `grep`/`sed` in kaart gebracht i.p.v. volledig in te lezen — sneller en goedkoper.
- **MCP-stabiliteit:** de ClickUp- en Webflow-connectoren gaven af en toe een time-out / een 163 KB-respons. Les: zware list-calls (sites, scenario's) via `jq`/python uit het opgeslagen tool-resultaat filteren i.p.v. in context trekken.
- **`state` is module-scoped**, niet op `window` — handig voor veiligheid, maar je kan in een preview niet snel interne state injecteren om edge-cases te testen. Voor diepere visuele tests zou een `?test`-hook die `window.S27test = {state, render}` exposet handig zijn (optioneel).

---

## 4. 🔴 De enige "zou je live kunnen zetten"-keuze (NIET door mij gedaan)

Eén backend-wijziging zou mijn locked-teasers **exact** maken voor de echte testklanten (i.p.v. de inferentie-fallback): de **dashboard-feed `5896037`** laten emitten met **alle 8 module-booleans** i.p.v. 5.

- **Status: NIET uitgevoerd.** Ik heb dit bewust *niet* gedaan omdat het een **live feed** is en ik niets aan productie wilde raken zonder jouw test. De frontend werkt prima zonder (inferentie).
- **Als je het wil:** het is een **additieve** wijziging (extra sleutels in het `modules`-object: `strategie, branding, video_fotografie, webdesign`), backward-compatible (ontbrekende sleutel ⇒ frontend toont actief, geen regressie). Volg exact het bestaande patroon in dat scenario (`m_*` SetVariables die de geselecteerde label-IDs joinen → tekst `true`/`false`). De label-option-IDs:
  - Strategie `8218c9f6-f12c-4eee-b1eb-10d1fb541ecf` · Branding `bc054eb2-7088-4642-9dcb-fed35296bdb2` · Video-en fotografie `3f28a417-3ea9-4859-a3d7-14fb2d151e8e` · Webdesign `6e3f0a32-fdc5-4f96-81bc-468ea3ed1922` · Social media `c7255337-8ef8-4186-8766-5f7de709d1d3` · Online adverteren `c321b00c-d18f-444a-bd6d-db980f7c2b05` · SEO-GEO `ef4d645f-002b-4a7d-bc76-3b2160eb72e6` · Performance `74c2e17b-faa8-482f-97c2-ecdc21962d91` · Opleidingen `5b7be1df-c838-4d59-8a38-794fa79c3adc` · Support `023ad5da-20e6-45e5-ae93-10b276f6f0dc`.
  - **Vóór wijzigen: `scenarios_get 5896037` → blueprint backuppen** (in `ads-rapportage/`-stijl). Enkel velden *toevoegen*, nooit bestaande sleutels hernoemen.
  - Frontend-mapping: feed-sleutel `socials` ↔ tak `social`, `opleidingen` ↔ `opleiding` (al afgehandeld in `DISCIPLINE_HUB`).

> Dit is de **enige** ROOD-kandidaat in het hele traject, en hij draait dus **nog niet**. Niets om terug te draaien.

---

## 5. Wat er nog te bouwen valt (precies gespecifieerd in het masterplan)

Deze heb ik **niet** vannacht gebouwd — bewust, omdat ze elk een backend nodig hebben die op jou wacht (Twilio, ClickUp-velden, Calendar-connecties) en half-werk de samenhang zou breken. Het masterplan §4 bevat de volledige spec per stuk:

- **Notificatie-dispatcher** (1 centrale router → WhatsApp/e-mail per voorkeur) — wacht op **Twilio**.
- **Reminder-cron** (elke 2-3 dagen onbevestigde "doorgestuurd"-taken).
- **Scheduling-widget veralgemenen** (strategiesessie / opstart / "meeting"-keyword) op de **assignee-agenda**, 9-17, due-date + Google Calendar-invite, locatie default Studio 27. (De shoot-widget is de bestaande basis.)
- **Per-video goedkeuring** (meerdere links in één veld → per item goed/feedback) + reminders per voorkeurskanaal.
- **Instellingen**: notificatievoorkeuren die echt persisteren (per persoon, default WhatsApp, "geen" mogelijk), GSM wijzigen; **wachtwoord-reset verbergen** onder auth-v2; **cache/sessie-knoppen** subtieler.
- **Mijn bedrijf**: contactpersonen + ondernemingsleiders beheren, #medewerkers → ClickUp, facturatie per project (optioneel, geen meldingen).
- **Social**: Metricool-input maandelijks centraliseren + kwartaal-ophaling.
- **Opleidingen**: zelf herinplannen + bij "Done" documentatie downloaden + overzicht + subtiele upsell.
- **AI-chatbot**: contextuele suggestiechips per tab.
- **Ads-rapport** (Arne's prioriteit): engine-ingestie behouden, render-laag naar Arne's structuur (per-campagne, periode-vergelijking, leads/CPL, "conversies per type", data-gedreven optimalisatie, terminologie-regels) in merkstijl. **Belangrijk:** Arne's masterprompt gebruikt Inter/Space Grotesk + ruwe platformkleuren; de bijbel zegt Montserrat/Nunito. Ik render het rapport in merkstijl met platformkleuren in het merkpalet (Meta=blauw, TikTok=paars, Snapchat=geel, Google=oranje), met één constante om naar Arne's exacte hex te switchen → **jouw/Arne's keuze (§6).**

---

## 6. Jouw actielijst voor morgenochtend

**Testen (alles veilig, niets draait live van mij):**
1. `git checkout portal-v3-rework` in `klantendashboard/`, dan lokaal: `python3 -m http.server 8779` → open `http://localhost:8779/portal-local.html?demo=1&auth=v1`. Bekijk de Start-hub (8 takken + kleuren), de contactpersonen-trio, en de tour (wis evt. `localStorage 's27_tour_completed'` om hem opnieuw te zien). Bevalt het → mergen naar `main` (dan pas live op de CDN; reken ~2-5 min raw.githack-lag).

**Aanleveren zodat de volgende sessie kan afwerken (uit het masterplan §8):**
2. **Twilio** (SID + token + sender) voor WhatsApp.
3. **ClickUp-veld** *Notificatie-voorkeur* op Contactpersonen ({WhatsApp, E-mail, Beide, Geen}) — API kan geen velden maken.
4. **Firebase SA** → 3 Cloudflare-secrets (`ADMIN_SECRET`, `SA_CLIENT_EMAIL`, `SA_PRIVATE_KEY`) zodat `/admin/link` van 501 → live; en **roteer** de eerder in chat gedeelde Cloudflare-token.
5. **Webflow site_id** bevestigen: `6836e01bc97620980f99aab1` (www.studio27.be) — als je wil dat ik rechtstreeks in Webflow werk.
6. **Ads-rapport:** platformkleuren in merkpalet (mijn default) of Arne's exacte hex?
7. **GA4** per klant voor performance: welke klanten + connecties.
8. **(Optioneel) Feed-extensie** §4 — of laat de inferentie-fallback staan; beide werken.

---

## 7. Bestanden in deze oplevering
- `REWORK_PLAN_V3.md` — het volledige masterplan + premortem.
- `WERK_LOG_V3.md` — dit document.
- `dashboard.js` / `dashboard.css` — de V3-frontend (branch `portal-v3-rework`, commit `354b786`).

*Geen Make-scenario gewijzigd. Geen ClickUp-data gewijzigd. Niets naar main gepusht. Slaap zacht — er staat niets te branden. 🌙*
