# Klantenportaal — Modules aan/uit + eenvoudige accounttoekenning

**Doel (2 features in één go-live):**
1. **Modules per klant aan/uit** — bv. TEST CLIENT BV ziet géén Performance-tab omdat ze daar geen abonnement op hebben. Toggle vanuit **ClickUp** (één veld per bedrijf).
2. **Account toekennen = e-mail in ClickUp** — een teamlid voert een e-mailadres in op de Bedrijf-taak; wie met dat adres inlogt (Google/magic link) krijgt meteen toegang tot het dashboard van net dat bedrijf.

**Branch:** `portal-modules-access` (afgesplitst van `main`, niets gepusht). De frontend-helft is hier al gebouwd en lokaal geverifieerd.

> ⚠️ **Let op (niet van mij):** in de werkkopie staat een niet-gecommitte wijziging in `gateway/worker.js` — een `perfreport`-handler die het performance-rapport scoped ophaalt met de `bedrijf_id` uit het geverifieerde token. Die verscheen tijdens deze sessie (jij of een parallelle sessie) en is **ongemoeid gelaten**. Het is goed werk en sluit naadloos aan op Deel A §4 (endpoint-hardening) — commit het apart.

---

## Hoe het samenhangt (dataflow)

```
ClickUp Bedrijf-taak                Make (dashboard-feed)              Widget (dashboard.js)
┌─────────────────────────┐         ┌───────────────────────┐         ┌────────────────────────┐
│ Actieve portaal-modules │  ─────▶ │ leest het veld,        │ ─────▶ │ leest data.modules     │
│   ☑ Doorlopend          │  feed   │ bouwt JSON:            │  feed   │ verbergt tab + hubkaart│
│   ☐ Performance         │         │  "modules":{          │         │ van uitgezette modules │
│   ☑ Opleidingen         │         │    "performance":false│         │ (fail-safe: geen veld  │
│                         │         │    ...}                │         │  ⇒ alles zichtbaar)    │
│ Portaal-toegang (mails) │         └───────────────────────┘         └────────────────────────┘
│   jan@klant.be          │
└─────────────────────────┘                  Login + scoping verloopt via:
        ▲                                     Firebase-token → Cloudflare-gateway → bedrijf_id
        │                                     (gateway zet bedrijf_id server-side uit de token-claim)
   teamlid vult dit in
```

Eén bron van waarheid = de **Bedrijf-taak in ClickUp**. De widget is "dom": hij toont wat de feed zegt. Daardoor blijft de toggle voor het team één vinkje in ClickUp.

---

# DEEL A — Modules aan/uit per klant

## A1. Wat al klaar is (frontend, op branch)

In `dashboard.js`:
- `normaliseDashboard()` leest nu een optioneel `modules`-object uit de feed.
- `PORTAL_MODULES = ['performance','socials','ads','seo','opleidingen']` — de **schakelbare** modules. **(Doorlopend is opgesplitst in 3 tabs: Socials / Advertenties / SEO-GEO — zie A5.)** Kern-tabs (Start, Berichten, Projecten, Meetings, Huisstijl, Facturatie, Nieuw project, Instellingen) staan hier bewust niet in en zijn altijd zichtbaar.
- `moduleEnabled(key)` → `false` enkel als de feed `modules[key] === false`. **Geen `modules` in de feed ⇒ alles zichtbaar** (geen regressie voor bestaande klanten/demo).
- `applyModuleVisibility()` verbergt de nav-tab + verbergt een lege nav-groep + stuurt terug naar Start als je op een net-uitgezette tab stond.
- De hub-startkaarten (Performance/Doorlopend/Opleidingen) volgen dezelfde toggle.
- `switchTab()` heeft een **hard slot**: een uitgezette module openen kan niet (redirect naar Start).

**Lokaal geverifieerd** (demo met `modules:{performance:false}`): Performance-tab `display:none`, Performance-hubkaart verdwenen, Doorlopend/Opleidingen/Projecten en de nav-groep blijven intact.

Uitbreiden naar een nieuwe module = sleutel toevoegen aan `PORTAL_MODULES` + label in ClickUp + mapping in Make. Verder niets.

## A2. ClickUp-veld — ✅ AANGEMAAKT (01-06)

Op de lijst **Bedrijven** (`901520180288`, folder S27-CRM):

| Eigenschap | Waarde |
|---|---|
| **Veldnaam** | `Actieve portaal-modules` |
| **Field-ID** | `b8effbfe-c4d6-42fb-b8ac-bc7d48a71734` |
| **Type** | **labels** (multi-select) |

**Opties (option-ID's voor de Make-mapping):**
| Label | option-ID |
|---|---|
| Performance | `74c2e17b-faa8-482f-97c2-ecdc21962d91` |
| Socials | `c7255337-8ef8-4186-8766-5f7de709d1d3` |
| Ads | `c321b00c-d18f-444a-bd6d-db980f7c2b05` |
| Opleidingen | `5b7be1df-c838-4d59-8a38-794fa79c3adc` |

**Werking (allow-list = fail-closed, juist voor betaalde modules):** je vinkt aan wat de klant **wél** heeft.
- TEST CLIENT BV → Performance **niet** aanvinken → Performance-tab verdwijnt.
- Leeg veld = geen optionele modules → alle drie de tabs verborgen (kern-tabs blijven).

**Label → dashboard-tab** (de UI heeft één Doorlopend-tab voor social+ads+seo, geen aparte Socials/Ads-tab):
| ClickUp-label | dashboard-tab (`PORTAL_MODULES`-sleutel) |
|---|---|
| Performance | `performance` |
| Socials **of** Ads | `doorlopend` |
| Opleidingen | `opleidingen` |

De extra granulariteit (Socials apart van Ads) blijft beschikbaar voor later (bv. welke cijfers Performance toont, of een latere opsplitsing van de Doorlopend-tab). De frontend blijft ongewijzigd; Make vertaalt labels → tab-booleans.

## A3. Make dashboard-feed — ✅ LIVE + GEVERIFIEERD (01-06)

**Status:** scenario **5896037** stuurt nu een top-level `modules`-object mee. Live getest:
- TEST CLIENT BV (`86c9yv1wy`) → `{"performance":false,"doorlopend":true,"opleidingen":true}`
- TEST CLIENT 2 BV (`86ca23kjx`) → `{"performance":true,"doorlopend":true,"opleidingen":true}`

**Implementatie (additief, niets bestaands gewijzigd):** nieuwe modules vóór de project-feeder — `21` GET `/v2/task/{{1.bedrijf_id}}` (de Bedrijf-taak, met onerror→Resume zodat een fout de feed niet breekt), `22` zet `mods` = `join(...)` van de geselecteerde label-IDs, `24` zet `m_perf/m_door/m_opl` (tekst "true"/"false"). Module `13` (WebhookRespond) kreeg `,"modules":{...}` achter `contact`. **Leeg veld of API-fout ⇒ alle booleans "true"** (geen regressie voor bestaande klanten met leeg veld). ⚠️ Make kent **geen `or()`** → doorlopend = geneste `if` (Socials → true, anders Ads → true, anders false).

> Onderstaande was de oorspronkelijke spec; nu dus geïmplementeerd. Het **dashboard-feed**-scenario (de webhook achter `ENDPOINTS.dashboard`, intern scenario **5896037**) leest de Bedrijf-taak al. Voeg aan de **JSON-respons op het topniveau** een `modules`-object toe, afgeleid van het labels-veld `b8effbfe-…` (match bij voorkeur op **option-ID**, dat is stabieler dan de naam):

```json
"modules": {
  "performance": {{ if(contains(labelIds; "74c2e17b-faa8-482f-97c2-ecdc21962d91"); true; false) }},
  "doorlopend":  {{ if(or(contains(labelIds; "c7255337-8ef8-4186-8766-5f7de709d1d3"); contains(labelIds; "c321b00c-d18f-444a-bd6d-db980f7c2b05")); true; false) }},
  "opleidingen": {{ if(contains(labelIds; "5b7be1df-c838-4d59-8a38-794fa79c3adc"); true; false) }}
}
```

waarbij `labelIds` = de geselecteerde option-ID's van het veld *Actieve portaal-modules* als tekst (in Make: de array van het labels-veld `join`-en tot één string). `doorlopend` staat aan zodra **Socials óf Ads** is aangevinkt.

- **Allow-list** (aanbevolen, fail-closed): `contains(...) ? true : false` (zoals hierboven).
- **Deny-list** (leeg = alles aan): draai elke tak om → `contains(...) ? false : true`.

Niets anders in de feed wijzigt. De widget pakt `data.modules` automatisch op.

## A4. Beveiliging (defense-in-depth — aanrader, niet strikt nodig voor "onzichtbaar")

Tabs verbergen is **cosmetisch**: het endpoint blijft technisch bereikbaar. Voor een echte "paywall" moet ook de **data** geweigerd worden als de module uit staat:

- De **`perfreport`-handler** die al in `worker.js` staat (zie waarschuwing bovenaan) haalt het rapport scoped op met de `bedrijf_id` uit het token. Breid die uit met een check: als de Bedrijf-taak Performance niet in *Actieve portaal-modules* heeft → `403 module_off`.
- Idem voor het `performance`-Make-scenario (en later doorlopend/opleidingen): bovenaan het scenario de modules-check uit ClickUp; uit ⇒ lege/forbidden respons.

Voor de huidige vraag ("Performance niet zichtbaar voor Testclient") volstaat A1–A3. A4 is de stap die je zet zodra modules echt geld kosten.

## A5. Doorlopend opgesplitst in Socials / Ads / SEO-GEO — ✅ gebouwd (01-06)

De vroegere ene "Doorlopend"-tab is **3 losse tabs** geworden in de groep *Mijn werk*: **Socials**, **Advertenties**, **SEO/GEO**. Reden: per-module schakelbaar én duidelijker. Intern blijft de categorie `doorlopend` bestaan; één generieke renderer `renderDoorlopendDisc(tabKey, discipline)` filtert per discipline (`social`/`ads`/`seo`). Iconen `s27p-soc/ads/seo` bestonden al.

**Stand per laag:**
- **Frontend** ✅ — 3 tabs + 3 hub-kaarten + `PORTAL_MODULES` bijgewerkt. Lokaal geverifieerd: `modules:{socials:false}` ⇒ Socials-tab + hubkaart verborgen, Ads/SEO/Performance zichtbaar, en de Ads-tab toont enkel ads-projecten, de SEO-tab enkel seo-projecten.
- **Make** ✅ live — `modules` = `{performance, socials, ads, opleidingen}`. Geverifieerd: TEST CLIENT BV → `{performance:false, socials:true, ads:true, opleidingen:true}`.
- **SEO/GEO** ✅ — label **`SEO-GEO`** toegevoegd (option-ID `ef4d645f-002b-4a7d-bc76-3b2160eb72e6`); `m_seo` in Make (module 24) + `"seo"` in de response (module 13). Live geverifieerd: TEST CLIENT BV (zonder SEO-GEO-label) → `seo:false`, TEST CLIENT 2 BV → `seo:true`.

**Het volledige labels-veld `Actieve portaal-modules` (`b8effbfe-…`):** Performance `74c2e17b` · Socials `c7255337` · Ads `c321b00c` · Opleidingen `5b7be1df` · SEO-GEO `ef4d645f`. Feed-`modules` = `{performance, socials, ads, seo, opleidingen}`, alle 5 schakelbaar.

---

# DEEL B — Account aanmaken/toekennen via e-mail in ClickUp

## B — STATUS: ✅ GEBOUWD (01-06)

- **ClickUp-veld** `Portaal-toegang` (id `f0de5c6c-0eea-4809-8e40-145fc7359a3d`, type text) — aangemaakt. Vul per klant één of meer login-e-mails (komma-gescheiden).
- **Make `portal-provision`** (scenario **5994302**, hook `…hjmc9k1w…`) — LIVE + getest. Flow: webhook `{idToken}` → Firebase-tokenverificatie (identitytoolkit accounts:lookup) → `email` → ClickUp-query op `Portaal-toegang` (`=`) → `bedrijf_id` → live `/admin/link` zet de `bedrijf_id`-claim → respons `{ok,bedrijf_id,email}`. Geverifieerd: hardcoded `test.portal@studio27.be` → `bedrijf_id 86c9yv1wy` + `/admin/link` aangeroepen; ongeldig token → `ok:false` (nette afwijzing, geen verkeerd bedrijf).
- **Frontend-haak** (op branch) — `apiV2()` vangt `no_company_link` (403) → `tryProvision(token)` → bij succes `token(true)` (force-refresh claim) → herprobeert de call 1×. `auth.js token(force)` toegevoegd. `_provisionTried` voorkomt loops.
- **Geen gateway-redeploy** — gebruikt de al-live `/admin/link`.

**Activatie:** dit loopt over de **Firebase-login (auth-v2)**, die nog in pilot staat (default = oude gedeelde-code-login). B werkt dus zodra je via `?auth=v2` (of na de auth-v2-cutover) inlogt. **E2E-eindtest (door Vincent):** zet je eigen Google-adres in `Portaal-toegang` van een testbedrijf → log in via `?auth=v2` met Google → je belandt automatisch op dat dashboard. ⚠️ De `=`-lookup matcht exact één e-mail per veld; voor meerdere e-mails per bedrijf later naar `contains`/data-store.

## B0. Hoe login vandaag werkt

`auth.js` + de Cloudflare-gateway: de klant logt in bij **Firebase** (Google of magic link) + verplichte 2FA. De gateway verifieert het token en leest **`bedrijf_id` uit een custom claim** op het Firebase-account. Die claim wordt gezet via de gateway-route **`/admin/link`** (body `{email, bedrijf_id}`) — maar dat kan **pas nadat de klant één keer ingelogd heeft** (de claim hangt aan een bestaand account).

Dat is de enige hobbel voor jouw gewenste UX ("typ e-mail → ze loggen in → meteen toegang"): het account bestaat nog niet op het moment dat jij de e-mail invoert.

## B1. Aanbevolen: **JIT auto-koppeling** (just-in-time)

Zo wordt het exact wat je wil — teamlid typt enkel een e-mail in ClickUp:

1. **Teamlid:** voeg de e-mail toe aan het veld *Portaal-toegang* op de Bedrijf-taak (zie B2). That's it.
2. **Klant** logt de eerste keer in met dat adres (Google/magic link) + zet 2FA.
3. **Gateway:** token is geldig, maar nog géén `bedrijf_id`-claim → in plaats van te weigeren roept de gateway een nieuw **resolve-scenario** in Make aan met het **geverifieerde** e-mailadres.
4. **Make resolve:** zoekt in de lijst *Bedrijven* de taak waarvan *Portaal-toegang* dat adres bevat → geeft `bedrijf_id` (= task-ID) terug.
5. **Gateway** zet meteen de `bedrijf_id`-claim (zelfde service-account-pad als `/admin/link`, dat is al gebouwd) en verwerkt de request. **Volgende logins zijn instant** (claim gecached, geen ClickUp-lookup meer).
6. Geen match → nette 403 "nog niet gekoppeld, mail ilke@studio27.be".

**Voordeel:** volgorde maakt niet meer uit, nul handmatige link-actie, en module-wijzigingen blijven instant want die leest de feed elke sessie vers.
**Let op intrekken:** e-mail uit ClickUp halen blokkeert *nieuwe* logins; een al-gezette claim blijft tot je 'm wist. Voor "account volledig intrekken" → e-mail weg **en** claim wissen (kleine admin-route, te bouwen).

## B2. Wat JIJ in ClickUp doet (eenmalig)

Maak op de lijst **Bedrijven** een tweede custom field:

| Eigenschap | Waarde |
|---|---|
| **Veldnaam** | `Portaal-toegang (e-mails)` |
| **Type** | **Text** (zo kan je meerdere adressen kwijt, komma-gescheiden) |
| **Voorbeeld** | `jan@klant.be, sofie@klant.be` |

Daarna per klant: het/de e-mailadres(sen) invullen van wie toegang mag. Meerdere personen per bedrijf = meerdere adressen, elk met eigen login + eigen 2FA.

> Alternatief zonder nieuw veld: de bestaande **Contactpersonen** (die hebben al een Email-veld en hangen aan het bedrijf) als bron gebruiken. Nadeel: "is contactpersoon" ≠ "mag in het portaal". Een apart toegangsveld is explicieter en veiliger. Mijn aanbeveling: apart veld.

## B3. Wat in Make + gateway moet (door mij te bouwen)

- **Nieuw Make-scenario `portal-resolve`:** input = e-mail → zoekt Bedrijven op *Portaal-toegang* → output `{ bedrijf_id }` (of leeg). Klein, read-only.
- **Gateway-aanvulling** (in `worker.js`, naast de bestaande `/admin/link`): bij ontbrekende claim eenmalig `portal-resolve` aanroepen + claim zetten. De crypto/SA-helpers (`getGoogleAccessToken`, `accounts:update`) staan er al — het is ~30 regels erbij.

## B4. Eenvoudiger alternatief (zonder JIT-code, maar mét "1× inloggen eerst")

Als je B1 te veel vindt voor nu: hou `/admin/link` en maak 'm self-service via ClickUp. Het veld **`AI Bedrijven`** triggert al Make-automations (opties "Token Reset", "Ads-rapport genereren"). Voeg een optie **"Portaal-toegang activeren"** toe → Make leest *Portaal-toegang* + roept `/admin/link` aan voor elk adres. Werkt prima, maar de klant moet **eerst één keer ingelogd** hebben (anders 404 user_not_found). B1 lost dat op; B4 is de quick win.

---

# Go-live checklist (één keer live)

**Vooraf (geen impact op productie):**
1. [x] ✅ ClickUp: veld **`Actieve portaal-modules`** (Labels) aangemaakt — Deel A2.
2. [ ] ClickUp: veld **`Portaal-toegang (e-mails)`** (Text) aanmaken — Deel B2. (Voor Deel B.)
3. [~] Modules invullen: ✅ TEST CLIENT BV + TEST CLIENT 2 BV gezet. Resterende **echte** klanten: leeg = alles zichtbaar, dus enkel invullen wáár je iets wil verbergen.
4. [x] ✅ Make: `modules`-object in dashboard-feed (5896037) — **live + geverifieerd** (Deel A3).
5. [ ] Make: `portal-resolve`-scenario + gateway JIT-koppeling — Deel B3. (Door mij, Deel B.)
6. [ ] (Optioneel/aanrader) endpoint-hardening performance — Deel A4. (Door mij; bouwt op de bestaande `perfreport`-handler.)

**Live zetten (Deel A — resteert enkel de frontend):**
7. [ ] **Branch `portal-modules-access` mergen naar `main`** → CDN serveert de nieuwe `dashboard.js` (~1 min). Dít activeert de zichtbaarheid voor klanten. *(commit enkel `dashboard.js` + dit plan; laat de losse `worker.js`-wijziging erbuiten.)*
8. [ ] Rooktest live: TEST CLIENT BV (Performance-tab weg) en TEST CLIENT 2 BV (alles zichtbaar).
9. [ ] Later, samen met Deel B: `gateway/worker.js` (perfreport + JIT) committen + deployen.

**Huidige veilige tussentoestand:** de feed stuurt al `modules`, maar de **productie-`dashboard.js` op `main` negeert dat veld nog** (backward-compatible) → klanten zien nu niets veranderen. De zichtbaarheid "flipt" pas bij de merge (stap 7). Bestaande klanten hebben een leeg veld ⇒ alles blijft zichtbaar, dus de merge geeft geen regressie.

---

# Samengevat: wat moet JIJ zelf doen

1. **Twee ClickUp-velden aanmaken** op lijst *Bedrijven* (of mij laten doen via API):
   - `Actieve portaal-modules` — **Labels**, opties Performance/Doorlopend/Opleidingen.
   - `Portaal-toegang (e-mails)` — **Text**.
2. **Per klant invullen:** modules aanvinken + toegang-mail(s) invullen.
3. **Akkoord geven** dat ik (a) de Make-feed uitbreid, (b) `portal-resolve` + gateway-JIT bouw, (c) optioneel de endpoints hard.
4. **Resten uit eerdere sessie afronden:** Cloudflare-token roteren (zie auth-memo), en de niet-gecommitte `perfreport`-wijziging in `worker.js` apart committen.

De rest (frontend) staat klaar op de branch.
