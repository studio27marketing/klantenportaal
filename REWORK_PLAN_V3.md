# Studio 27 Klantenportaal — Rework V3 · Masterplan ("de kwant")

> Geschreven in de nacht van 1 → 2 juni 2026, autonoom, op basis van een volledige analyse van de bestaande code, de Make/ClickUp-backend, het Studio 27 Design System (de "bijbel"), het ads-rapport van Arne en de live staat van de twee testbedrijven.
>
> **Leeswijzer.** §1 = wat er vandaag staat. §2 = het design system als wet. §3 = de informatie-architectuur (de grote keuze). §4 = feature-per-feature spec (alle ~16 vragen). §5 = de *doemdenker* — elke bug/risico dat ik vooraf zie + mitigatie. §6 = bouwvolgorde (wat ik vannacht zelf doe vs. wat ik aan jou moet vragen). §7 = Make-scenario-plan. §8 = jouw actielijst voor morgenochtend.
>
> **Gouden regel die ik mezelf opleg:** ik raak **geen** live productie aan in de Make-map `S27` (303277) en ik push **niets** naar `main`. Al het werk staat op branch `portal-v3-rework` en in Make-map `13 - KLANTPORTAAL v2` (348572). Jij merget/activeert morgen pas na test.

---

## 0. Antwoord op je twee directe vragen

**"Zet eerst de Webflow MCP-connectie aan, geef mij de link."**
→ De Webflow MCP-connectie is **al actief en geautoriseerd** — zowel de Data-API (sites, pages, CMS, scripts, assets) als de Designer-API (elementen, styles, componenten, variabelen) zijn beschikbaar. Er is dus **geen extra autorisatie-link nodig**; ik kan rechtstreeks in Webflow werken. Wat ik wél van jou nodig heb vóór ik in Webflow schrijf is **bevestiging van de juiste `site_id`** (de tool weigert by design te gokken welke site/pagina). Ik heb de sitelijst opgevraagd en zet het resultaat in de eind-documentatie; jij hoeft enkel "ja, dat is de juiste site" te zeggen. Tot dan raak ik je live Webflow-site niet aan — het portaal wordt sowieso via een HTML-embed + `loader.js` ingeladen, dus ik kan alles bouwen en testen zonder één Webflow-element te wijzigen.

**"Alles in één GitHub-sessie of aparte URL's/pagina's?"**
→ **Aanbeveling: hou het in één codebase / één SPA-shell.** Het portaal is vandaag één widget (`dashboard.js` + `dashboard.css` + `dashboard.html`) die via `loader.js` in de Webflow-pagina `/klanten` wordt geladen. Dat is de juiste architectuur en die hou ik aan, om vier redenen: (1) één design-system-bron = makkelijker "1:1 met de bijbel" te houden; (2) een getabde SPA voelt sneller (geen page-reloads, gedeelde sessie/auth, instant tab-switch); (3) Firebase-auth + de Cloudflare-gateway gaan uit van één origin; (4) minder onderhoud. **Uitzondering (bewust):** de zware, data-geïnjecteerde **rapport-engines** (ads-rapport, performance-rapport) blijven aparte HTML-bestanden die in een `<iframe>` geladen worden. Dat is al zo en het is correct: ze zijn groot, cachen apart en mogen het SPA-geheugen niet vervuilen. Dus: **één SPA + geïframede rapport-engines.** Geen wildgroei aan losse pagina's.

---

## 1. Wat er vandaag staat (de nulmeting)

### 1.1 Architectuur (volledig in kaart)
```
Browser (Webflow /klanten, HTML-embed)
        │  loader.js  →  dashboard.css + dashboard.html + dashboard.js (+ auth.js)
        ▼
Firebase Auth (Google + magic-link + verplichte TOTP-2FA)  ── default sinds cutover 27cb079
        │  ID-token (JWT)
        ▼
Cloudflare Worker  s27-portal-gateway.studio27marketing.workers.dev
        │  verifieert JWT, leest bedrijf_id uit custom claim (niet uit body), voegt X-Gateway-Secret toe
        ▼
Make.com  PORTAL v2  (team 507999, map 13-KLANTPORTAAL v2 = 348572, 26 scenario's)
        ▼
ClickUp  27 FAMILY  (space 90159547188) — Bedrijven / Contactpersonen / 8 discipline-lijsten / Offertes / Meetings
```
- **Front-end** = SPA met tabs: Start · Berichten · *Mijn werk* (Projecten/Socials/Advertenties/SEO-GEO/Opleidingen/Performance) · *Plannen* (Meetings/Nieuw project) · *Mijn bedrijf* (Huisstijl & bestanden/Facturatie/Instellingen). `dashboard.js` is **~5.000 regels** en zeer volgroeid (zie functie-index in §1.3).
- **Auth-v2 is live default**; oude gedeelde-code-login enkel nog via `?auth=v1`. Multi-bedrijf-switcher werkt (één e-mail → meerdere bedrijven).
- **Per-klant modules** schakelen al via ClickUp-veld → dashboard-feed → frontend (`applyModuleVisibility`).

### 1.2 De endpoints (uit `dashboard.js` ENDPOINTS — volledige, geverifieerde URL's)
| key | scenario | webhook |
|---|---|---|
| login | 5896031 | `…/gk7fxusnnrwkyfhcpyup8w39ygoz5m5u` |
| dashboard | 5896037 | `…/q1hklcvhum7m14ie57p6t6ci7l6un48e` |
| bedrijfContent | 5942494 | `…/o1gvlndn934h2u77vug6k59xgt2qgz6g` |
| bedrijfVoorkeuren | 5942498 | `…/fhenjvxv47ldoea5k8h646ovn5gzvgnv` |
| bedrijfContact | 5945339 | `…/459dayjdq34xgkt9bcbv8g1nxd9r9ubs` |
| meetingsList | 5943499 | `…/5vkfigdkwwowpmhbmicsyddkjt5k18f5` |
| meetingAvailability | 5945987 | `…/s4tuw763p9x4dc7o8n1h9sm48vhs77rb` |
| projectDetailV2 | 5944033 | `…/tp6jpd91vyecsz693pj2hmdd1bs8pd5e` |
| chatPost / chatList | 5942504 / 5942511 | `…/vi12objw…` / `…/a43sc5vj…` |
| feedbackV2 | 5942527 | `…/vpd7to9pn8ritsih38s4apika49lg31o` |
| newProjectIntake | 5942536 | `…/kbomkcljmi9b2oyphmk938wb1qgwll1j` |
| directMessage | 5944659 | `…/s7g32st1esmxxarw0k35ej3j8hthdr2b` |
| aiStatusBot | 5946454 | `…/3uor4cy6vmhe77sh2uvujg9iufoewj3u` |
| pandadocPricelist | 5946435 | `…/uw2974b7b2yurygsgcn2i97x4lh9h86e` |
| shootAvailability | 566… | `…/c1aekp5r567tqvgvp4e2a4juu3npanap` |
| huisstijlList/Upload/Delete | 5952504/637/651 | `…/v3z3t67…` / `…/3eqyxbke…` / `…/irpo6iem…` |
| facturatieSave / projectFacturatieSave | 5952882 / — | `…/41635fjy…` / `…/cmqf97ej…` |
| performance | 5964345 | `…/chmsfitxr12m8cpjp4x3fb8ru1nqr7gg` |
| provision | 5994302 | `…/hjmc9k1w9ry027kom3rfiwci9pejub78` |
| gateway | — | `s27-portal-gateway.studio27marketing.workers.dev` |

### 1.3 Front-end functie-landkaart (zodat ik chirurgisch kan editen)
Auth/sessie: `handleLogin`(451) · `initAuthV2`(4917) · `buildV2LoginUI`(4872) · `api`(199)/`apiV2`(221) · `loadSession`(389)/`saveSession`(415)/`clearSession`(420) · `tryProvision`(291)/`provisionFetch`(274)/`loadCompaniesAndLink`(296) · `renderCompanySwitcher`(305)/`switchCompany`(321).
Modules/tabs: `DISCIPLINES`(116, **zonder kleuren!**) · `DISC_CATEGORY`(130) · `moduleEnabled`(1342)/`applyModuleVisibility`(1348) · `switchTab`(1363).
Render: `renderDashboard`(562) · `collectCockpitActions`(586)/`renderCockpitActions`(609) · `renderHubBody`(642)/`hubCard`(691) · `renderProjecten`(701) · `renderDoorlopendDisc`(1276) · `renderOpleidingen`(1306) · `renderPerformanceV2`(1561) · `renderBedrijfTab`(1740) · `renderFacturatieTab`(1969) · `renderNieuwTab`(2468)→`loadPricing`(2597) · `renderInstellingenTab`(3088) · `renderMeetingsTab`(3292).
Plannen/feedback: shoot-widget `renderProjectShootDays`(2947)/`loadProjectShootSlots`(2932) · meeting-slots `computeFreeSlots`(3413)/`renderMeetingSlots`(3446) · feedback `renderFeedbackV2Tab`(4205)/`submitFeedbackV2`(4342)/`parseDeliverablesRaw`(4238).
Tour/bot/cache: `TOUR_STEPS`(911)/`showWelcomeTour`(939) (gate: `localStorage 's27_tour_completed'`, regel 566) · `injectStatusBot`(4787)/`sendBotMessage`(4729)/`parseEscalation`(4647) · `forceCacheClearAndReload`(498) · notif `loadNotifPrefs`(3261)/`saveNotifPrefs`(3266)/`wirePasswordReset`(3234) · `TEAM_PHOTOS`(1208, incl. Ilke/Arne/Vincent webp).

### 1.4 ClickUp-datamodel (live geverifieerd vannacht)
- **Bedrijven** `901520180288` — relevante velden: Klantportaal token `4474d855…`, Portaal-toegang (e-mails, text) `f0de5c6c…`, **Actieve portaal-modules (labels, 10 opties!)** `b8effbfe…`, Aantal medewerkers (number) `e72680d9…`, Ondernemingsnummer `034f4443…`, Facturatie Email `9613b4aa…` / Opmerkingen `36d11828…`, Metricool ID `40f6ccd2…`, GA4 `e3e12841…`, Google/Meta/TikTok/Snapchat Ads ID's, Drive-map `0a0781cc…`, Contact (relatie) `1bce8db8…`, Meetings (relatie) `64868b3a…`, Offertes (relatie) `eb145449…`, **Presentatie (attachment)** `d61ed75a…`, Locatie `fcbb46ff…`, Status S27 `e9ba9e50…`.
- **Module-labels (option-IDs, nieuw uitgebreid naar 10):** Strategie `8218c9f6…` · Branding `bc054eb2…` · Video-en fotografie `3f28a417…` · Webdesign `6e3f0a32…` · Social media `c7255337…` · Online adverteren `c321b00c…` · Support `023ad5da…` · SEO-GEO `ef4d645f…` · Performance `74c2e17b…` · Opleidingen `5b7be1df…`.
- **Contactpersonen** `901520180286` — Voornaam `626a0441…`, Achternaam `79cbda71…`, Email `d453a72f…`, GSM `8cee9669…`. **(Géén "Notificatie-voorkeur"-veld — moet jij aanmaken, zie §8.)**
- **Discipline-lijsten** (folder S27-Planning `901513606896`): strategie `…314`, branding `…306`, video_fotografie `…316`, webdesign `…322`, social `…312`, ads `…307`, opleiding `…311`, automation `…326`. CRM: Offertes `…289`, Meetings `…293`, Projectbriefings `…613`.
- **Productie-taakvelden:** Bedrijf (relatie) `4b1fb333…`, TYPE JOB `3e76c134…`, Bestanden (deliverable-URLs, text) `b071307b…`, Feedback link (url) `f2610454…`, Feedback-status (dropdown) `65f2c5a7…`, Budget (verborgen voor gasten) `c8d2dd2c…`. Statussen: `to do → in progress → doorgestuurd → goedgekeurd → done` (+ on hold).
- **Twee testbedrijven (live geverifieerd):**
  - **TEST CLIENT BV** `86c9yv1wy` — 10 medewerkers; modules AAN = video/opleidingen/webdesign/strategie/ads/social, **UIT = performance, branding, support, seo** (→ perfecte test voor "locked"-teasers); Portaal-toegang = vincent@studio27.be + verleije.vincent@gmail.com; Meta Ads 228094339754985; heeft al een ads-JSON-bijlage + brand-SVG's. Contact: Jan Janssens `86ca0f6um`.
  - **TEST CLIENT 2 BV** `86ca23kjx` — 25 medewerkers; modules AAN = performance/social/ads/opleidingen/seo, **UIT = strategie/branding/video/webdesign/support**; Metricool 1234567; Contact: Sofie Vermeulen `86ca23knh`.

---

## 2. Het Design System als wet (de bijbel)

Bron van waarheid: `Studio 27 Design System (1).zip` → `colors_and_type.css` + `README.md` + 24 preview-kaarten + de echte **Montserrat- & Nunito-TTF's** (self-hosted variabele fonts). Ik neem de **volledige tokenset** 1:1 over in het portaal.

### 2.1 De canonieke tokens (worden de single source of truth in `dashboard.css`)
- **Merkpalet:** blauw `#3083DC` (primair) / `#1E5FA7` (hover) / `#E2EFFC` (tint) · paars `#9441DB` · groen `#12AC4E` · oranje `#F66131` · geel `#F8C028` · roze `#F697CE`.
- **Inkt (warm aubergine):** `#230F23 / #3A2A3A / #6B5B6B / #9E919E`. **Papier:** `#FFFFFF / #FAF7F2 / #F1EBE2`, lijn `#E7DFD3`.
- **Type:** Montserrat (display/UI, 700–900) + Nunito (body, 400–700). Display = **lowercase**, letter-spacing −0.035em. Eyebrow = uppercase Montserrat 700, tracking +0.06em.
- **Radii:** 6/10/16/24/36/pill 999. **Spacing:** 4-pt schaal (4…128). **Schaduw:** warm, *nooit blauw* (`rgba(35,15,35,…)`). **Motion:** `--ease-out cubic-bezier(.22,1,.36,1)`, `--ease-bounce cubic-bezier(.34,1.56,.64,1)`; duur 120/220/420ms.

### 2.2 DE KRITISCHE FIX — discipline→kleur (vandaag fout in het portaal)
De bijbel bindt **elke tak aan één kleur**. Het portaal heeft die binding vandaag **niet** (de `DISCIPLINES`-array op regel 116 heeft géén kleur; de hub-kaarten geven ad-hoc accenten door). Dit is exact wat je bedoelt met "de juiste kleuren voor de juiste dienstverlener". Canonieke mapping die ik vastleg:

| Tak | Kleur | Token |
|---|---|---|
| **Strategie** | blauw | `--s27-blue #3083DC` |
| **Branding** | roze | `--s27-pink #F697CE` |
| **Video- & fotografie** | paars | `--s27-purple #9441DB` |
| **Website & SEO/GEO** | groen | `--s27-green #12AC4E` |
| **Online adverteren** | oranje | `--s27-orange #F66131` |
| **Social media** | geel | `--s27-yellow #F8C028` |
| **Opleidingen** | (afgeleid) indigo/ink-accent — staat niet in de 6 takken; ik gebruik een neutrale ink-accent zodat het niet botst |
| **Strategie/Automation** | ink | (interne tak, zelden klant-zichtbaar) |

> ⚠️ Let op de subtiele dubbelzinnigheid: in de bijbel valt **SEO onder "Website en SEO" = groen**, maar het portaal heeft een **aparte SEO/GEO-tab** die vandaag geel gebruikt. Ik trek SEO/GEO naar **groen** (web-familie) conform de bijbel, en geef **Social media geel** (nu blauw in het portaal). Dit is de grootste zichtbare kleurcorrectie.

### 2.3 Wat ik verder 1:1 doortrek
Knoppen (pill, Montserrat 700, `--ease-bounce` op hover), de **loader/spinner** (vandaag een tekst "Laden…" → wordt een merkanimatie: roterende kwartcirkel-stempel in `--s27-blue`), tag-pills (uppercase Montserrat), statkaarten met gekleurde balk, hand-drawn underline-accent onder kop-woorden (de assets staan in de zip: `scribbles/onderstreping-*`). Fonts worden **self-hosted** geladen (zoals de bijbel; niet Google Fonts) zodat het in de Webflow-embed exact klopt en niet flikkert.

---

## 3. Informatie-architectuur — de grote keuze (modules + "locked" FOMO)

**Probleem dat je stelt:** volg de Studio 27-takkenstructuur (Strategie, Foto/video, Branding, Social, Webdesign, SEO/SEA, Adverteren, Opleidingen) als modules, en laat **subtiel zien wat een klant nog níét heeft** ("zodat ze het gevoel hebben dat ze iets missen").

**Beslissing:**
1. **De Start-pagina krijgt een "Onze diensten voor jou"-raster** met alle 8 takken als kaarten, gedreven door het ClickUp-veld *Actieve portaal-modules*:
   - **Actief** = kaart in takkleur, met live status ("2 lopend · 1 wacht op jou") en CTA → opent die tak.
   - **Niet actief** = dezelfde kaart maar *subtiel gedempt*: takkleur op 12% opacity, klein **slot-icoon**, één verleidelijke zin ("Sterke merken beginnen bij branding — ontdek wat we voor je kunnen betekenen") + een discrete **"Meer weten?"** die een voor-ingevuld bericht/offerte-intent opent. Geen harde paywall, geen pop-up: FOMO by design, niet irritant.
2. **De nav toont enkel actieve takken** als tab (locked takken leven alleen als teaser-kaart op Start). Zo blijft de nav rustig en voelt "meer" altijd binnen handbereik.
3. **Elke tak heeft tak-specifieke acties** (de kern van je vraag) — uitgewerkt in §4.

Dit is fail-closed compatibel met de bestaande `applyModuleVisibility` en breidt het van 5 → 8 takken uit. De dashboard-feed (5896037) moet de 8 booleans gaan emitten (nu 5).

---

## 4. Feature-per-feature spec (alle vragen, met aanpak + risico)

Legenda per feature: **Status** (bestaat al / deels / nieuw) · **Aanpak** · **Make/ClickUp** · **Risico**.

### 4.1 Dashboard-cockpit: te doen / afgerond / komt eraan + notificatiepaneel
- **Status:** deels — `collectCockpitActions`/`renderCockpitActions` bestaan al (verzamelen "wacht op jou"-acties).
- **Aanpak:** Start-tab herstructureren in drie horizonten: **(a) Voor jou te doen** (review/feedback/in te plannen/facturatie-actie), **(b) Loopt nu** (in productie), **(c) Recent afgerond**. Een **notificatie-belletje** in de topbar (badge = #onread) opent een paneel dat nieuwe deliverables, feedbackverzoeken en "plan-dit-in"-prompts toont; "gezien"-state in localStorage per `bedrijf_id` (zoals `loadConvSeen` al doet voor chat).
- **Make/ClickUp:** geen nieuw scenario nodig — de dashboard-feed bevat de projecten al; ik leid de cockpit-items client-side af. Optioneel later: server-side "ongelezen sinds"-stempel.
- **Risico:** dubbeltelling tussen cockpit en notificaties → één `collectCockpitActions` als enige bron, paneel = view erop.

### 4.2 WhatsApp-meldingen (testen + uitbreiden) — centrale dispatcher
- **Status:** placeholder — scenario `whatsapp-notify` 5945382 bestaat maar wacht op **Twilio** (jouw stap). E-mail-notificaties werken.
- **Aanpak (architectuur-conform [[studio27-make-clickup-architectuur]]):** één **`[PORTAL v2] notify-dispatcher`** met een **router**: input `{contact_id|bedrijf_id, kind, vars}` → leest *Notificatie-voorkeur* + GSM + e-mail van de contactpersoon → tak WhatsApp (Twilio) en/of tak e-mail. Eén trigger, fan-out in Make (geen extra ClickUp-automation-credits). Alle bestaande/komende meldingen (feedback-reminder, "plan dit in", deliverable-klaar) roepen deze dispatcher aan i.p.v. elk een eigen kanaal.
- **Make/ClickUp:** dispatcher nieuw in map 348572. Vereist ClickUp-veld **Notificatie-voorkeur** (mail/whatsapp/beide/geen) op Contactpersonen — **jij aanmaken** (API kan geen velden maken). WhatsApp-tak blijft inert tot Twilio-credentials er zijn; e-mail-tak werkt meteen.
- **Risico:** dubbele meldingen (mail + WhatsApp) → default **enkel WhatsApp** zoals je vroeg; "beide" is opt-in. Stille faal bij ontbrekend nummer → fallback naar e-mail + log.

### 4.3 Meerdere contactpersonen per bedrijf + switchen + beheren
- **Status:** deels — multi-**bedrijf**-switcher bestaat (één e-mail → meerdere bedrijven). Multi-**contact** binnen één bedrijf nog niet beheerbaar in de UI.
- **Aanpak:** in *Mijn bedrijf → Team* een lijst van contactpersonen (uit de Bedrijf→Contact-relatie), met **toevoegen / wijzigen / als klantverzorger markeren**. Een medewerker kan zo een collega toevoegen die meteen als contact in ClickUp verschijnt. Per bedrijf zie je wie eraan hangt. Eigenaars/ondernemingsleiders apart markeerbaar.
- **Make/ClickUp:** nieuw **`[PORTAL v2] contact-crud`** (create/update Contactpersoon-taak + link aan Bedrijf via relatieveld `1bce8db8…` met `value:{"add":[…]}`). Lees-kant zit al in bedrijfContent.
- **Risico:** een klant die zichzelf toegang geeft = security. **Mitigatie:** nieuwe contacten krijgen *geen* automatische portaaltoegang; toegang blijft via *Portaal-toegang* (e-mail) dat een teamlid zet — dat staat los van "contactpersoon zijn".

### 4.4 Bedrijfsinstellingen-pagina (ondernemingsleiders, bedrijfsgegevens, facturatie, #medewerkers)
- **Status:** deels — Bedrijf-tab + Facturatie-tab bestaan; #medewerkers-veld bestaat in ClickUp (BV=10, 2BV=25).
- **Aanpak:** *Mijn bedrijf* wordt de duidelijke hub met sub-secties: **Bedrijfsverhaal & huisstijl** · **Team & ondernemingsleiders** · **Bedrijfsgegevens** (ondernemingsnummer, #medewerkers — synct naar ClickUp) · **Facturatie** (algemeen + per project). #medewerkers schrijft terug naar `e72680d9…`.
- **Make/ClickUp:** uitbreiden `bedrijf-update-voorkeuren` (5942498) met de extra velden, of een dunne `bedrijf-update-gegevens`. 
- **Risico:** `editATaskAdvanced` "fake success" (LEARNINGS #50) → altijd `getATask`-precheck; number-veld als string schrijven (`"value":"25"`).

### 4.5 Per-tak gespecialiseerde acties
**Strategie** — upload presentatie (veld *Presentatie* `d61ed75a…` bestaat al!), zie/plan strategiesessie. Sessie inplannen op de **agenda van de assignee** (niet hardcoded Vincent): lees assignee → diens Google-agenda free/busy → toon slots (9–17, werkdagen) → bij keuze: **due date** op de taak + **Google Calendar-invite** naar de ingelogde contact + betrokkenen, locatie default Studio 27 (overschrijfbaar; lees `Locatie`-veld). Bij meerdere betrokkenen: **doorsnede** van alle agenda's.
**Branding** — trigger op taaknaam met "opstart"/"opstartmeeting" in to-do → zelfde plan-widget (Anouk/Griet als assignee → hun agenda). Voorkeur **fysiek bij Studio 27** subtiel als default tonen. Daarna feedbackflow (Pitchflow/Drive) → status "doorgestuurd" → bevestiging vereist; herinnering elke 2–3 dagen tot goedgekeurd.
**Video & fotografie** — shoot **of** opstart inplannen (pre-productie). **Per video goedkeuren**: meerdere links in één custom field → ik split ze (`parseDeliverablesRaw` doet dit al deels) en geef **per item** een goedkeur/feedback-knop. Feedback via Picflow/Drive/Vimeo (kanaalkeuze blijft). Reminders tot álles goedgekeurd is.
**Webdesign** — startmeeting met voorbereiding (HTML-template); herhaalbare fysieke meetings, initiatief vanuit S27 of klant. Generieke regel: **elke to-do-taak met "meeting" in de naam en zonder due date** → "plan hier een afspraak in"-prompt (geldt over alle lijsten). 
**Social** — recurring; Metricool-ID per klant (bestaat). Maandelijkse **input centraliseren** + vorige maanden herbekijken. Kwartaal-ophaling van Metricool-cijfers (credit-zuinig, 1×/kwartaal) i.p.v. per vraag.
**Adverteren** — maandelijks rapport (zie §4.9) + performance-dashboard. Initiatief meeting vanuit S27.
**Opleidingen** — klant plant opleiding zelf (her)in bij het juiste teamlid (assignee-agenda); bij **Done** → melding + **download van de documentatie** (ClickUp-attachments op de taak); overzicht van gevolgde opleidingen; subtiele **upsell** (geen lessen meer over / nieuwe opleiding) — handmatig pushbaar én subtiel-automatisch.

### 4.6 Self-service offerte / nieuw project (uitgebreider, takkenstructuur, directe prijs)
- **Status:** deels — `renderNieuwTab`/`loadPricing` + `pandadoc-pricelist` (5946435, geeft nu alle 7 categorieën) + `new-project-intake` (5942536) bestaan.
- **Aanpak:** stapsgewijze flow per tak (Strategie/Branding/Video/Web/SEO/Social/Ads/Opleiding), met **directe richtprijs** uit de PandaDoc-prijslijst (één prijslijst = jullie USP). Altijd het label **"Deze prijs is een richtprijs — wij kijken ze persoonlijk na"**. Offerte landt in ClickUp Offertes-lijst (`…289`) en de PandaDoc-concept wordt aangemaakt. Series → Arne; accountmanagement grote klanten → Ilke.
- **Make/ClickUp:** prijslijst is er; `new-project-intake` uitbreiden zodat **de gekozen items + aantallen + berekende prijs** worden vastgelegd (gap #2 uit [[studio27-klantportaal-offerte]]).
- **Risico:** onrealistische aanvragen (halve dag → 7000 foto's) → de "wij kijken na"-stap + interne taak met de ruwe keuzes; nooit auto-akkoord.

### 4.7 Facturatie per project (optioneel, geen meldingen)
- **Status:** deels — Facturatie-tab + per-project-rij bestaan.
- **Aanpak:** algemene gegevens als default; per project **optioneel** overschrijven (PO-nummer e.d.). Geen verplichting, **geen WhatsApp/mail-meldingen** (expliciet jouw wens). 2–3 dagen "venster" is louter informatief.
- **Risico:** klanten ervaren het als ruis → standaard ingeklapt, enkel zichtbaar wie het echt wil.

### 4.8 Instellingen (notificatievoorkeuren die echt werken, nummer wijzigen, per persoon)
- **Status:** deels — `loadNotifPrefs`/`saveNotifPrefs` bestaan maar zijn **localStorage-only** (niet persistent server-side).
- **Aanpak:** echte voorkeuren **per contactpersoon** (WhatsApp / e-mail / beide / **geen**), default **WhatsApp**; knop om **GSM/WhatsApp-nummer** te wijzigen. Slaat op naar de Contactpersoon-taak via de dispatcher-velden. Drie contacten, slechts één wil meldingen → kan. "Geen" + opslaan moet kunnen.
- **Wachtwoord reset:** onder Firebase-auth **obsoleet** (Google-login of magic-link → niets te resetten). Ik **verberg** de oude "toegangscode resetten" in auth-v2 en vervang door "Hoe log ik opnieuw in?" uitleg. 
- **"Jouw contactpersonen bij Studio 27"** (meervoud!): Ilke Meeusen — accountmanager · Arne Goetschalckx — vertegenwoordiger · Vincent Verleije — zaakvoerder, elk met foto (staan in `TEAM_PHOTOS`) + "stuur bericht" → komt in ClickUp (directMessage-scenario, per-persoon routing).
- **Cache/sessie:** `forceCacheClearAndReload` verhuist naar een onopvallende **"⚙ Geavanceerd"**-disclosure; blijft werken voor jouw tests; **redirect naar de juiste portaal-URL** na clear.
- **Make/ClickUp:** Notificatie-voorkeur-veld (jij aanmaken) + dispatcher.

### 4.9 Ads-rapport (Arne) — het belangrijkste
- **Status:** twee divergente implementaties. Arne's masterprompt (rijk: per-campagne, periode-vergelijking overal, leads/CPL, Google "conversies per type", interactieve optimalisatie, sticky-note, PDF) vs. de portal-engine (`ads-report-engine.html`: KPI-kaarten + enkele aggregatie-charts, ~30% van de spec).
- **Aanpak:** **één architectuur** — behoud de engine-ingestie (`buildDataset()` parse't de ruwe Make-JSON in de browser, `?data=URL`, iframe auto-height) en bouw de **render-laag** om naar Arne's sectiestructuur. Neem zijn **harde regels** over (terminologie: "Klikken" altijd link-clicks; Snapchat-swipes labelen als "Klikken"; platformnamen voluit; nooit rood in tabellen; geen Leads/CPL als er geen leads zijn; geen verzonnen ad-namen; periode-vergelijking als inklapbare grijze ▾ met groen/oranje/grijs). 
- **Brand-spanning (expliciet jouw input nodig, ik kies veilig):** Arne's masterprompt gebruikt Inter/Space Grotesk + ruwe platformkleuren; de **bijbel** zegt Montserrat/Nunito. Ik render het rapport-frame in **Montserrat/Nunito** (bijbel) en hou **platformkleuren voor data-encoding** in de **merk-variant** (Meta=blauw, TikTok=paars, Snapchat=geel, Google=oranje — uit [[studio27-huisstijl-tokens]]), met één constante om naar Arne's exacte platform-hex te switchen als hij dat wil. → **Vincent/Arne-beslissing in §8.**
- **Make/ClickUp:** de feeders `s_27_ads_21/22/23` bepalen of ad-level/multi-conversie/vorige-periode echt gevuld zijn; graceful-null houden.

### 4.10 Onboarding-tour (1× + "niet meer afspelen" + dynamischer)
- **Status:** speelt al **1×** (gate `s27_tour_completed`), maar is een statische modal-tour zonder expliciete opt-out-knop.
- **Aanpak:** expliciete knop **"De rondleiding niet meer tonen"**; dynamischer met **spotlight/zoom** op echte secties (overlay + `scrollIntoView` + een pulserende ring rond de target-tab, met `--ease-bounce`). Eén keer bij eerste login; daarna herstartbaar via de help-knop.
- **Risico:** spotlight op elementen die (door modules-uit) niet bestaan → stappen filteren op zichtbare tabs.

### 4.11 AI-chatbot met klaarstaande suggesties
- **Status:** `injectStatusBot`/`sendBotMessage` + `ai-status-bot` (5946454) live; escaleert naar Ilke/Arne/Vincent.
- **Aanpak:** **suggestiechips** klaarzetten (contextueel per tab: "Wanneer is mijn volgende meeting?", "Status van mijn website?", "Hoe geef ik feedback?") + onboarding-hulp. De bot kent de projecten al (`buildProjectenContext`).

---

## 5. De doemdenker — pre-mortem (elke bug die ik nú al zie)

> Jij vroeg me expliciet om als doemdenker élke mogelijke bug eruit te halen vóór de bouw. Dit is de lijst die mijn bouwvolgorde stuurt.

**A. Productie breken (hoogste prioriteit te vermijden)**
1. **Push naar `main` = live op de CDN.** → Ik werk op `portal-v3-rework`, push **niet** naar main. Jij merget na test. Loader serveert van `main`, dus zolang ik niet merge gebeurt er live niets.
2. **raw.githack/jsDelivr CDN-lag** (oude code blijft ~minuten hangen, óók met `?cb=`). → Niet relevant zolang ik niet naar main push; ná jouw merge: 2–5 min wachten vóór live-test, of versie-pinnen.
3. **Make-output van een live scenario wijzigen** breekt de live widget. → Ik bouw **nieuwe** scenario's in map 348572; bestaande feeds breid ik **additief** uit (extra velden achteraan de JSON), nooit bestaande sleutels hernoemen/verwijderen. Elke aangeraakte live-feed = **ROOD** in de eind-doc + blueprint-backup vooraf.

**B. Make-valkuilen (uit LEARNINGS, hard geleerd)**
4. **Geen `or()`/`and()`/`filter()` in Make.** → geneste `if`; filteren via `map(arr;out;key;val)`.
5. **`clickup:makeApiCall` PUT/POST = stille faal.** → enkel **native** modules voor CRUD; `makeApiCall` alleen voor GET.
6. **`editATaskAdvanced` fake-success op niet-bestaande task.** → altijd `getATask`-precheck.
7. **WebhookRespond moet `Content-Type: application/json` + CORS `*` + expliciete status zetten; scheduling = `immediately`.** Nooit `if(...;"true";"false")` in de body (drievoudige escaping → kapotte JSON) → router met één Respond per tak.
8. **Browser → Make met JSON-body kan niet** (preflight; Make beantwoordt OPTIONS niet; text/plain wordt niet geparset). → **`application/x-www-form-urlencoded`** (de form-urlencoded-bug die provisioning stil brak — commit 6875bad). Elke nieuwe browser→Make-call gebruikt form-urlencoded.
9. **ClickUp `custom_fields`-filter scopet niet betrouwbaar** (cross-client-lek!). → in elk feed-scenario **server-side scope-guard**: na ophalen elke taak droppen waar Bedrijf-veld ≠ bedrijf_id (zoals al gefixt in dashboard 5896037). Dit geldt voor **elke** nieuwe per-klant-query die ik bouw.
10. **Google Calendar freeBusy:** native module onbruikbaar voor multi-agenda; gebruik `google-calendar:makeApiCall` op `/v3/freeBusy`, body als **JSON-string**. Elke klant/teamlid heeft een eigen agenda — het scheduling-scenario moet de juiste agenda-id's van de assignees ophalen.
11. **GA4 heeft geen property-veld** (property hangt aan de connectie) → per klant eigen GA4-connectie/scenario; ik kan die niet aanmaken. Performance-GA4 blijft jouw stap; Metricool (4579451) + SE Ranking (4574434) zijn wél generiek.

**C. Front-end valkuilen**
12. **`dashboard.js` is 5.000 regels — parallelle edits botsen.** → ik edit sequentieel en getest, niet via parallelle agents op hetzelfde bestand.
13. **`[hidden]` wordt overschreven door `display:flex/grid`.** → `[hidden]{display:none!important}` borgen (staat er; ik verifieer bij nieuwe tabs).
14. **Modules-uit → tour/cockpit verwijzen naar niet-bestaande tabs.** → alles wat naar een tab wijst eerst `moduleEnabled()`-checken.
15. **innerHTML-XSS** (klantnamen, bestandsnamen, brand-kleuren als CSS). → `esc()` overal; brand-kleur valideren tegen `^#[0-9a-fA-F]{6}$` (doet `renderKleurInput` al); `escUrl()` voor bg-image.
16. **localStorage-keys per `bedrijf_id`** (anders lekt "gezien"-state tussen bedrijven bij de switcher). → keys altijd suffixen met bedrijf_id (zoals `loadConvSeen` al doet).

**D. Logica/UX**
17. **Per-video goedkeuring** met meerdere links in één veld: scheiding kan komma/newline/`;` zijn → robuuste splitter + dedupe.
18. **Scheduling buiten werktijd / over middag** → 9–17 hard clampen, lunchblok optioneel, geen slots in het verleden, rekening houden met feestdagen/vakantie (er is al een `vakantie`-bron in de booking-availability).
19. **Dubbele afspraken** als twee contacten tegelijk plannen → de due-date-write is de "lock"; na boeken slot direct verversen.
20. **Notificatie-spam** bij reminders → max 1 reminder per 2–3 dagen per taak, stoppen bij goedgekeurd, en respecteren "geen meldingen".

**E. Security (uit SECURITY_REVIEW)**
21. **P0-1 IDOR** (server vertrouwt client-bedrijf_id) → de gateway lost dit op (claim, niet body); bij cutover moeten de PORTAL-scenario's `X-Gateway-Secret` **vereisen**. Nieuwe scenario's bouw ik meteen met die check als optie.
22. **`/admin/link` = 501** tot SA-secrets gezet (jouw stap). **Twilio** ontbreekt (jouw stap). **Cloudflare-token roteren** (stond in chat).

---

## 6. Bouwvolgorde — wat ik vannacht zelf doe vs. wat ik aan jou moet vragen

**Ik bouw vannacht autonoom (veilig, op branch + sandbox), in deze volgorde:**
1. **Design-system-fundament** in `dashboard.css`/`dashboard.js`: alle tokens, discipline→kleur-map, fonts self-hosted, merk-spinner, knoppen/motion. *(grootste hefboom, raakt alles)*
2. **8-module-structuur + locked-teasers** op Start + nav, gedreven door het 10-optie ClickUp-veld.
3. **Dashboard-cockpit** (te doen/loopt/afgerond) + **notificatiepaneel**.
4. **Instellingen** herwerkt: notificatievoorkeuren-UI (per persoon, default WhatsApp, "geen" mogelijk) + nummer wijzigen + "jouw contactpersonen" (meervoud) + cache-control subtiel + wachtwoord-reset weg in auth-v2.
5. **Mijn bedrijf**: team/contact-beheer + bedrijfsgegevens (#medewerkers) + facturatie verfijnd.
6. **Scheduling-widget veralgemenen** (strategie/opstart/meeting) — frontend + Make-scenario in sandbox + Calendar.
7. **Feedback/per-video-goedkeuring + reminder-loop** — frontend + Make reminder-scenario (e-mail werkt, WhatsApp stub).
8. **Onboarding-tour** (opt-out + spotlight/zoom) + **AI-suggestiechips**.
9. **Ads-rapport-engine** richting Arne's structuur in merkstijl (zo ver als veilig vannacht haalbaar; anders een strak afgebakende eerste slag + plan).
10. **ClickUp-testdata** voor beide testbedrijven om alles te kunnen testen.
11. **Make notify-dispatcher** (router mail/WhatsApp) in sandbox.
12. **Eind-documentatie** (gedaan / uitdagingen / learnings / ROOD-scenario's / jouw actielijst).

**Wat ik NIET zonder jou kan (en dus voorbereid maar niet activeer):**
- **Twilio-connectie** (SID/token/sender) voor WhatsApp → ik bouw de tak, hij blijft inert.
- **ClickUp-velden aanmaken** (API kan dat niet): `Notificatie-voorkeur` (Contactpersonen), evt. `Ondernemingsleider` (boolean). Ik lever de exacte veldspec.
- **`/admin/link` activeren** (Firebase SA-secrets) + **Cloudflare-token roteren**.
- **GA4-connecties per klant** voor performance.
- **Webflow `site_id` bevestigen** voordat ik in Webflow zelf schrijf (niet nodig voor de embed).
- **Live activeren / mergen naar main** — bewust aan jou na test.

---

## 7. Make-scenario-plan (map 13 - KLANTPORTAAL v2 = 348572)

| Nieuw/wijziging | Naam | Doel | Activatie |
|---|---|---|---|
| **NIEUW** | `[PORTAL v2] notify-dispatcher` | router: voorkeur → WhatsApp(Twilio)/e-mail | inert tot Twilio |
| **NIEUW** | `[PORTAL v2] feedback-reminder` (cron) | elke 2–3 dagen onbevestigde "doorgestuurd"-taken → dispatcher | uit tot jij groen geeft (ROOD als ik test-activeer) |
| **NIEUW** | `[PORTAL v2] schedule-plan` | assignee-agenda free/busy → slots; bij boeking due-date + GCal-invite | bouw + test op testdata |
| **NIEUW** | `[PORTAL v2] contact-crud` | contactpersoon toevoegen/wijzigen + linken aan bedrijf | veilig (alleen testbedrijven) |
| **WIJZIG (additief)** | dashboard-feed 5896037 | emit 8 module-booleans i.p.v. 5 | **ROOD** — live feed; blueprint-backup eerst, enkel velden toevoegen |
| **WIJZIG (additief)** | new-project-intake 5942536 | gekozen items+aantallen+prijs vastleggen | veilig (schrijft naar Offertes) |
| **HERGEBRUIK** | pandadoc-pricelist 5946435, performance 5964345, ai-status-bot 5946454, meeting-availability 5945987, shoot-availability | ongewijzigd | — |

**Spelregel:** elke wijziging aan een live feed → eerst `scenarios_get` (blueprint-backup in `ads-rapportage/`-stijl), enkel **toevoegen**, nooit bestaande output-sleutels veranderen, en in de eind-doc **ROOD** markeren met "verifieer dit eerst".

---

## 8. Jouw actielijst voor morgenochtend (kort, concreet)

**Eerst verifiëren (ROOD — kan live zijn):** elk scenario dat ik in de eind-doc rood markeer (vooral als ik de dashboard-feed 5896037 additief heb uitgebreid). Ik documenteer per scenario wat ik wijzigde + hoe terugdraaien.

**Aanleveren zodat ik (of de volgende sessie) kan afwerken:**
1. **Twilio** voor WhatsApp: Account SID + Auth Token + afzender-nummer (of de Make-WhatsApp/Twilio-connectie aanmaken).
2. **ClickUp-velden aanmaken** (UI): op *Contactpersonen* een dropdown **Notificatie-voorkeur** = {WhatsApp, E-mail, Beide, Geen}; optioneel op *Bedrijven* een boolean/labels **Ondernemingsleider** of een 2e contact-relatie. (Ik lever exacte naam/opties.)
3. **Firebase Service-Account** → 3 Cloudflare-secrets (`ADMIN_SECRET`, `SA_CLIENT_EMAIL`, `SA_PRIVATE_KEY`) zodat `/admin/link` van 501 → live gaat; **roteer** de eerder gedeelde Cloudflare-token.
4. **Webflow `site_id`** bevestigen (ik geef je de sitelijst) als je wil dat ik rechtstreeks in Webflow elementen wijzig.
5. **Ads-rapport brand-keuze:** platformkleuren in merkpalet (mijn default) of Arne's exacte platform-hex? 
6. **GA4** per klant: welke klanten + connecties mogen aan het performance-dashboard.

---

*Einde masterplan. De uitvoering en de uiteindelijke "wat-heb-ik-gedaan"-log staan in `WERK_LOG_V3.md` (zie aldaar voor de ROOD-gemarkeerde scenario's en het testverslag).*
