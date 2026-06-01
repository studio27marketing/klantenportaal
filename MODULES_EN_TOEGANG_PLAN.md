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
- `PORTAL_MODULES = ['performance','doorlopend','opleidingen']` — de **schakelbare** modules. Kern-tabs (Start, Berichten, Projecten, Meetings, Huisstijl, Facturatie, Nieuw project, Instellingen) staan hier bewust niet in en zijn altijd zichtbaar.
- `moduleEnabled(key)` → `false` enkel als de feed `modules[key] === false`. **Geen `modules` in de feed ⇒ alles zichtbaar** (geen regressie voor bestaande klanten/demo).
- `applyModuleVisibility()` verbergt de nav-tab + verbergt een lege nav-groep + stuurt terug naar Start als je op een net-uitgezette tab stond.
- De hub-startkaarten (Performance/Doorlopend/Opleidingen) volgen dezelfde toggle.
- `switchTab()` heeft een **hard slot**: een uitgezette module openen kan niet (redirect naar Start).

**Lokaal geverifieerd** (demo met `modules:{performance:false}`): Performance-tab `display:none`, Performance-hubkaart verdwenen, Doorlopend/Opleidingen/Projecten en de nav-groep blijven intact.

Uitbreiden naar een nieuwe module = sleutel toevoegen aan `PORTAL_MODULES` + label in ClickUp + mapping in Make. Verder niets.

## A2. Wat JIJ in ClickUp doet (eenmalig)

Maak op de lijst **Bedrijven** (`901520180288`, folder S27-CRM) één custom field:

| Eigenschap | Waarde |
|---|---|
| **Veldnaam** | `Actieve portaal-modules` |
| **Type** | **Labels** (multi-select — je vinkt meerdere opties aan) |
| **Opties** | `Performance` · `Doorlopend` · `Opleidingen` |

**Werking (allow-list = fail-closed, juist voor betaalde modules):** je vinkt aan wat de klant **wél** heeft.
- TEST CLIENT BV → Performance **niet** aanvinken → Performance verdwijnt.
- Klant mét performance-abonnement → Performance **wel** aanvinken.
- Leeg veld = geen optionele modules → alle drie verborgen (kern-tabs blijven).

> Liever andersom (leeg = toon alles, en je vinkt aan wat je wil **verbergen**)? Dat kan: noem het veld `Portaal-modules verbergen` en draai in Make de formule om (zie A3). De frontend werkt voor beide modellen ongewijzigd.

> Je kan dit veld ook door mij laten aanmaken via de API — dan krijg je meteen de option-ID's die Make nodig heeft. Zeg maar.

## A3. Wat in Make moet (dashboard-feed scenario)

Het **dashboard-feed**-scenario (de webhook achter `ENDPOINTS.dashboard`, intern scenario **5896037**) leest de Bedrijf-taak al. Voeg aan de **JSON-respons op het topniveau** een `modules`-object toe:

```json
"modules": {
  "performance": {{ if(contains(labelsText; "Performance");  true; false) }},
  "doorlopend":  {{ if(contains(labelsText; "Doorlopend");   true; false) }},
  "opleidingen": {{ if(contains(labelsText; "Opleidingen");  true; false) }}
}
```

waarbij `labelsText` = de geselecteerde opties van het veld *Actieve portaal-modules* als tekst (in Make: de array van het Labels-veld `join`-en tot één string).

- **Allow-list** (aanbevolen): `contains(...) ? true : false` (zoals hierboven).
- **Deny-list** (leeg = alles aan): draai om → `contains(...) ? false : true`.

Niets anders in de feed wijzigt. De widget pakt `data.modules` automatisch op.

## A4. Beveiliging (defense-in-depth — aanrader, niet strikt nodig voor "onzichtbaar")

Tabs verbergen is **cosmetisch**: het endpoint blijft technisch bereikbaar. Voor een echte "paywall" moet ook de **data** geweigerd worden als de module uit staat:

- De **`perfreport`-handler** die al in `worker.js` staat (zie waarschuwing bovenaan) haalt het rapport scoped op met de `bedrijf_id` uit het token. Breid die uit met een check: als de Bedrijf-taak Performance niet in *Actieve portaal-modules* heeft → `403 module_off`.
- Idem voor het `performance`-Make-scenario (en later doorlopend/opleidingen): bovenaan het scenario de modules-check uit ClickUp; uit ⇒ lege/forbidden respons.

Voor de huidige vraag ("Performance niet zichtbaar voor Testclient") volstaat A1–A3. A4 is de stap die je zet zodra modules echt geld kosten.

---

# DEEL B — Account aanmaken/toekennen via e-mail in ClickUp

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
1. [ ] ClickUp: veld **`Actieve portaal-modules`** (Labels: Performance/Doorlopend/Opleidingen) aanmaken — Deel A2.
2. [ ] ClickUp: veld **`Portaal-toegang (e-mails)`** (Text) aanmaken — Deel B2.
3. [ ] Per actieve portaalklant: modules aanvinken + toegang-mails invullen. (Belangrijk: doe dit vóór stap 5, anders verdwijnt een module die je niet aanvinkte.)
4. [ ] Make: `modules`-object toevoegen aan dashboard-feed (5896037) — Deel A3. (Door mij.)
5. [ ] Make: `portal-resolve`-scenario + gateway JIT-koppeling — Deel B3. (Door mij.)
6. [ ] (Optioneel/aanrader) endpoint-hardening performance — Deel A4. (Door mij; bouwt op de bestaande `perfreport`-handler.)

**Live zetten:**
7. [ ] `gateway/worker.js` (perfreport + JIT) committen + deployen naar de Worker.
8. [ ] Branch `portal-modules-access` mergen naar `main` → CDN serveert de nieuwe `dashboard.js` (binnen ~1 min via cache-bust).
9. [ ] Rooktest met TEST CLIENT BV (Performance verborgen) en TEST CLIENT 2 BV (modules aan).

**Volgorde-logica:** de frontend toont alles tot de feed `modules` stuurt. Daardoor is mergen (stap 8) vóór de Make-wijziging (stap 4) risicoloos — er verandert pas iets zodra Make het map-object meelevert. Echte "flip" = stap 4.

---

# Samengevat: wat moet JIJ zelf doen

1. **Twee ClickUp-velden aanmaken** op lijst *Bedrijven* (of mij laten doen via API):
   - `Actieve portaal-modules` — **Labels**, opties Performance/Doorlopend/Opleidingen.
   - `Portaal-toegang (e-mails)` — **Text**.
2. **Per klant invullen:** modules aanvinken + toegang-mail(s) invullen.
3. **Akkoord geven** dat ik (a) de Make-feed uitbreid, (b) `portal-resolve` + gateway-JIT bouw, (c) optioneel de endpoints hard.
4. **Resten uit eerdere sessie afronden:** Cloudflare-token roteren (zie auth-memo), en de niet-gecommitte `perfreport`-wijziging in `worker.js` apart committen.

De rest (frontend) staat klaar op de branch.
