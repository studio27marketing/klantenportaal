# MAKE.COM BOUWGIDS — Studio27 Klantenportaal

> **LEES DIT EERST** bij élke nieuwe scenario-bouw of -aanpassing. Dit document bevat alle
> hard-won lessen over Make.com + ClickUp + Google Calendar + PandaDoc integraties.
> Bij context-reset: lees dit document + de TaskList op voordat je verder bouwt.

_Laatst bijgewerkt: 2026-05-28 (v3 scope-uitbreiding)_

---

## 0. IDENTIFIERS (constant)

```
Make teamId:            507999
Make orgId:             5772903
ClickUp connection-ID:  3602455  (clickup app v2, __IMTCONN__)
PandaDoc connection-ID: 3580567
Google connection-ID:   3640456  (vincent@studio27.be, calendar freebusy domain-toegang)
ClickUp workspace:      24419872

Make folders:
  346881 = "12 - KLANTPORTAAL"      (v1 scenarios — VERBODEN te wijzigen)
  348572 = "13 - KLANTPORTAAL v2"   (HIER alle nieuwe scenarios, prefix "[PORTAL v2] - ")
  303277 = "S27"                    (productie — VERBODEN, alleen lezen voor patroon)
```

### ClickUp lijst-IDs
```
Bedrijven        901520180288   (custom fields: token, btw, facturatie email, website, ...)
Contactpersonen  901520180286
Offertes         901520180289
Meetings         901520180293
Productie per discipline:
  strategie        901520180314
  branding         901520180306
  video_fotografie 901520180316
  webdesign        901520180322
  social           901520180312
  ads              901520180307
  (opleiding/automation/seo — valideer via clickup_get_workspace_hierarchy)
```

### ClickUp custom field-IDs
**Bedrijven-taak (901520180288):**
```
Klantportaal token   4474d855-2a87-480b-b74d-83ae01420db6   short_text
Klantportaal URL     f7a4dcae-7269-425f-b64b-d9c571d3da50   url
GA4 property-ID      e3e12841-2eee-48a0-b68e-6e35cec159ca   short_text
Google Ads ID        b1a52056-be3a-435a-95d6-1aa338bfc065   short_text
Meta Ads ID          1658c472-496c-480d-81bf-0c19e82d84df   short_text
Meta Business ID     c352892a-7cd9-4f17-9e81-4d3decdb0fad   short_text
TikTok Ads ID        35baf0a8-ec33-4f97-863e-301eb1b2815e   short_text
Snapchat Ads ID      856172ba-7c88-40ce-8c01-f51f9bc885a4   short_text
Metricool ID         40f6ccd2-b25e-4385-bbca-3bfdf602e542   short_text
Website              90b63173-378a-4fa8-bae8-1a513eea4eca   url
Facturatie Email     9613b4aa-2285-485b-80a6-d1d34a96884c   email
Ondernemingsnummer   034f4443-5b50-4176-8c91-0b6d60e5870e   short_text  (= btw)
Aantal medewerkers   e72680d9-9706-40b8-9e67-564bc21855d7   number
Contactpersonen      9127fbd0-1380-4309-ade1-88c6ba92d1e4   list_relationship (op Meetings-taak; op Bedrijven verifiëren)
```
**Productie-taak (planning):**
```
Bedrijf (koppeling)  4b1fb333-f47a-41bb-a976-dce63ed36657   tasks/list_relationship
TYPE JOB             3e76c134-a270-483c-a82a-d9a6817f375d   dropdown (Shoot=ceaa5d14-...)
Bestanden            b071307b-84c4-4372-9d7e-783e999c618f   text  (deliverable-URLs voor feedback!)
Feedback link        f2610454-1961-42cf-9ba3-c7371b81353d   url
Budget               c8d2dd2c-2428-4236-ba37-a3f3cd90c9ec   currency (hidden from guests)
```
**Offerte-taak:** PandaDoc-id link-veld `748009c1-6e97-4b87-b6bd-fadeeaa24701` (text)

---

## 1. GOUDEN REGELS (Vincent)

1. **S27-folder (303277) + v1-folder (346881) NOOIT wijzigen.** Draaien live. Alleen lezen voor patroon.
2. Alle nieuwe scenarios in folder **348572**, prefix `[PORTAL v2] - `.
3. **Inventariseer eerst** (scenarios_list) — bouw nooit dubbel.
4. **Test elk scenario met curl** vóór je de frontend wired.
5. Nieuwe ClickUp custom fields: **eerst Vincent vragen** (sommige door interne workflows gebruikt).
6. Documenteer elke nieuwe les hier.

---

## 2. HET SYNC-WEBHOOK PATROON (verplicht voor elk portaal-scenario)

```
gateway:CustomWebHook (hook=<id>, maxResults:1)
  └─ util:SetVariables  → is_valid + voorbewerkte velden
       └─ builtin:BasicRouter
            ├─ Branch VALID   (filter is_valid = "yes")  → werk-module(s) → WebhookRespond 200
            └─ Branch INVALID (filter is_valid != "yes")              → WebhookRespond 401
```

**Session-validatie (KRITISCH — hardcoded TST-DEMO brak productie in #54):**
```
is_valid = {{if(length(1.session_token) > 10; "yes"; "no")}}
```
Accepteert TST-DEMO (32) + alle echte login-UUID's (32 chars). Het login-scenario (5896031)
genereert `substring(replace(uuid;"-";"");0;32)` — dus elke productie-klant heeft een uniek 32-char token.

**Elke WebhookRespond ALTIJD:**
```
headers: [
  {key:"Content-Type", value:"application/json"},
  {key:"Access-Control-Allow-Origin", value:"*"}
]
status: "200" (of "401"/"500")
```

**Scheduling:** `{ "type": "immediately" }` — anders krijg je "Accepted" async ipv sync JSON.

---

## 3. IML-FUNCTIES — WAT WERKT / WAT NIET

| Nodig | Gebruik | Let op |
|---|---|---|
| Filter+map array | `map(arr; outKey; filterKey; filterVal)` | `filter()` BESTAAT NIET |
| Eerste element | `first(map(...))` | werkt; geen `[1]` inline indexing |
| Lege fallback | `ifempty(x; default)` | overal gebruiken |
| Lege array | `emptyarray` | voor BasicFeeder bij lege data |
| Custom field value | `first(map(body.custom_fields; "value"; "id"; "<field-id>"))` | dé manier om 1 veld te lezen |
| Object → JSON-string | `json:TransformToJSON` module (`object: {{x}}` → `.json`) | NIET `toJSON()` in body; TransformToJSON is betrouwbaar |
| Datum → unix ms | `formatDate(date; "x")` | |
| Datum → RFC3339 | `formatDate(date; "YYYY-MM-DDTHH:mm:ssZ")` | `Z`-token = `+02:00` |
| Datum UTC | `formatDate(d; "...; "UTC")` + literal Z erachter | |
| Tijd optellen | `addHours(now; 48)`, `addDays(now; 21)` | |
| Regex strip | `replace(txt; "/pattern/flags"; "")` | regex via `/.../`-syntax |

**JSON-escape in WebhookRespond body (tekst met quotes/newlines):**
```
{{replace(replace(replace(ifempty(X; ""); "\\"; "\\\\"); "\""; "\\\""); newline; "\\n")}}
```
Volgorde: backslash → quote → newline. ALTIJD doen voor vrije tekst (descriptions, comments, namen).

---

## 4. CLICKUP — NATIVE MODULES > makeApiCall

**Regel:** voor CRUD altijd native module. `makeApiCall` ENKEL voor GET (response lezen).

| Operatie | Module | Notitie |
|---|---|---|
| Taak lezen | `clickup:makeApiCall` GET `/v2/task/{id}` | body parse OK |
| Lijst-taken | `clickup:makeApiCall` GET `/v2/list/{id}/task?...` | query params: due_date_gt/lt (ms), include_closed, subtasks, order_by |
| Taak maken | `clickup:createTaskInListAdvanced` | custom_fields als `[{id, value}]`; tasks-field: `{value:{add:[id],rem:[]}}` |
| Taak updaten | `clickup:editATaskAdvanced` | velden: task_id, status, content (=description); + verplicht due_date_time/start_date_time/notify_all/archived = false |
| Custom field schrijven | `clickup:editATaskWithCustomFieldsAdvanced` | `custom_fields:[{key, type, value}]` |
| Attachment upload | `clickup:uploadTaskAttachment` | `data: {{base64(1.data)}}` (base64-string → buffer), map_or_select:"map" |
| Comment posten | `clickup:postATaskComment` | notify_all:true, map_or_select:"map" |
| Comments lezen | `clickup:makeApiCall` GET `/v2/task/{id}/comment` | comment_text veld |

**KRITISCHE BUG (#36):** `clickup:makeApiCall` PUT met body → **stille fail** (ok:true maar geen update).
`{{2.statusCode}}` blijft leeg. → Gebruik ALTIJD `editATaskAdvanced` voor updates.

**`editATaskAdvanced` edge case (#50):** rapporteert geen `__ERROR__` bij niet-bestaande task_id
(geeft "ok:true" terwijl niets gebeurt). Voor productie: pre-check via getATask.

---

## 5. GOOGLE CALENDAR — freebusy (#72, kritisch)

- **`getFreeBusyInformation` native module = ONBRUIKBAAR** voor multi-calendar (geeft bundle-index `4` ipv data).
- Gebruik `google-calendar:makeApiCall`:
  - URL = **`/v3/freeBusy`** (base is `https://www.googleapis.com/calendar`, dus NIET `/freeBusy` en NIET `/calendar/v3/freeBusy`).
  - **body MOET een JSON-STRING zijn**, GEEN object! Object → `[400] Bad Request`.
    ```
    "body": "{\"timeMin\":\"{{2.timeMin}}\",\"timeMax\":\"{{2.timeMax}}\",\"items\":[{\"id\":\"ilke@studio27.be\"},{\"id\":\"arne@studio27.be\"}]}"
    ```
  - Response: `4.body.calendars` = object keyed by email → `{"x@y.be":{"busy":[{start,end}]}}`.
    Serialiseer met `json:TransformToJSON` (`object: {{4.body.calendars}}`).
- Connection 3640456 (vincent) heeft domain-freebusy toegang tot ilke@ + arne@ — geen extra sharing nodig.
- Frontend rekent 90-min vrije slots: candidate-slots (10:00/14:00 lokaal) minus busy-overlap (absolute ms-vergelijking, tz-agnostisch), +48u vooruit, werkdagen.

---

## 6. PANDADOC — offerte aanmaken (#77)

```
Module:      pandadoc:createADocuments  (connection 3580567)
template:    HQRvZ3sdrEm2GcuNsdP2Uf
folder_uuid: /syK5YdV2RpbtTsDDnonSAP
send:        false   (draft — team vervolledigt)
tokens:      Klant.Email / Klant.Company / Klant.FirstName / Klant.LastName
             Projectmanager.Email / Projectmanager.Phone / Projectmanager.FirstName / Projectmanager.LastName
```
Daarna `clickup:editATaskWithCustomFieldsAdvanced` om `{{pandadoc.id}}` te schrijven naar
offerte-taak custom field `748009c1-6e97-4b87-b6bd-fadeeaa24701`.
Patroon-bron (NIET wijzigen): S27 scenario 4525911 "Intake & Offerte Processor".

---

## 7. ITERATOR / AGGREGATOR — bug-vrij

- Lege array door Iterator → downstream WebhookRespond wordt NIET bereikt → client krijgt "Accepted"/"failed".
- **Oplossing**: `BasicFeeder` met `array: {{ifempty(X; emptyarray)}}` + `util:TextAggregator`
  (`feeder:<feederId>`, `rowSeparator:"other"`, `otherRowSeparator:","`).
  Bouw per item een JSON-string in `value`; WebhookRespond wrapt in `[{{aggregator.text}}]`.
- Filter binnen Aggregator (niet op iterator-niveau) als je items wil overslaan, óf een
  Router VÓÓR de iterator als de hele set leeg kan zijn.

---

## 8. SUBSCENARIO / DATA HERGEBRUIK

- S27 data-scenarios (GA4, GSC, SE Ranking, Metricool, Ads) aanroepen via
  `mcp__91758163-..._scenarios_run` (of `scenario-service:CallSubscenario` binnen Make) —
  zo blijven ze onaangeraakt en behouden hun output-formaat.
- Booking-availability (5662991, PUBLIEK) levert `{shoots, shoots_27m, vakantie, hosts}` —
  al gebruikt in dashboard voor shoot- en meeting-slots.

---

## 9. ACTIEVE [PORTAL v2] SCENARIOS (folder 348572)

| Scenario | ID | Endpoint-hook | Status |
|---|---|---|---|
| login (v1 GLOBAL) | 5896031 | gk7fxus... | ✅ |
| dashboard-feed (v1) | 5896037 | q1hklcv... | ✅ |
| bedrijf-content-get | 5942494 | o1gvlndn... | ✅ (+ btw/email/website/blob-strip) |
| bedrijf-update-voorkeuren | 5942498 | fhenjvxv... | ✅ |
| bedrijf-upload-file | 5943461 | vdi231a5... | ✅ |
| chat-list-comments | 5942511 | a43sc5vj... | ✅ |
| chat-post | 5942504 | vi12objw... | ✅ |
| chat-attachment | 5945313 | fxaqt9wa... | ✅ (upload + comment) |
| bedrijf-meetings-list | 5943499 | 5vkfigdk... | ✅ |
| meeting-availability-gcal | 5945987 | s4tuw763... | ✅ (echte GCal freebusy) |
| project-detail-v2-get | 5944033 | tp6jpd91... | ✅ (+ deliverables/budget) |
| feedback-v2-submit | 5942527 | vpd7to9p... | ✅ |
| new-project-intake | 5942536 | kbomkclj... | ✅ (+ PandaDoc + offerte) |
| bedrijf-direct-message | 5944659 | s7g32st1... | ✅ (DM → Strategie-lijst) |
| bedrijf-update-contact | 5945339 | 459dayjd... | ✅ |
| whatsapp-notify | 5945382 | mymjcomq... | ⚠️ placeholder (Twilio nodig) |

---

## 11. AI-TEKSTGENERATIE — zonder nieuwe key (research 28/5)

Er bestaan al werkende AI-connecties in Make team 507999 — **GEEN nieuwe key nodig**:
```
5306534  My Anthropic Claude connection  (anthropic-claude)  ← gebruik voor klant-facing tekst
3626326  My Gemini AI connection         (gemini-ai...)       ← gebruikt door 4526005 in prod
3585829  openai-gpt-3 connection
```
**Module:** `ai-local-agent:RunLocalAIAgent` (app v0, type agent) — self-contained, geen agent-resource nodig.

### ⚠️ KRITIEK (28/5): zonder `defaultModel` → LEEG antwoord
Eerste bouw van ai-status-bot gaf `response = ""` (executie 220ms = te snel, géén LLM-call).
Oorzaak: mapper miste het model + config. De module roept pas een LLM aan als deze velden er zijn.
Bewezen werkende config (gespiegeld van prod-scenario 4526005 "Find or Create Company"):
```
parameters: { makeConnectionId: 3626326 }          ← Gemini-conn (prod-bewezen)
mapper: {
  defaultModel: "gemini-3.1-pro-preview",          ← VERPLICHT, anders leeg
  modelConfig: { "recursionLimit": 300, "iterationsFromHistoryCount": "6" },
  reasoningEffort: "low",                           ← low=snel, medium=prod-default
  outputType: "text",                               ← of "make-schema" → 4.jsonResponse
  systemPrompt: "<rol + regels>",
  message: "<de input/taak>",
  threadId: "<optioneel, vb portalbot-{bedrijf_id} voor geheugen>"
}
onerror: [ builtin:Resume met fallback-tekst ]      ← bot mag nooit hard falen
output: 4.response (tekst)  |  4.jsonResponse (bij outputType make-schema)
```
WebhookRespond body moet `4.response` triple-escapen (\\ → \" → newline→\\n) en frontend doet `decodeMakeString()`.
Anthropic-conn 5306534 werkt ook maar vereist een geldige Claude `defaultModel`-naam; Gemini 3626326 is veiligst (prod-bewezen).
Voor klant-comments/bot → escaleer naar mens via ESCALATE-marker als eerste regel (zie ai-status-bot 5946454).

**LIVE & GETEST (28/5): ai-status-bot 5946454** — hook `3uor4cy6vmhe77sh2uvujg9iufoewj3u`.
5 curl-cases + 1 browser-case groen: website-ETA, klacht→Vincent, spoed→Ilke, sales→Arne, wacht-op-klant→feedback-ETA, 401.
Escalatie-DM via directMessage (5944659) maakt ClickUp-taak (getest: 86ca12c8a → Vincent). CORS preflight OK.

## 12. PANDADOC PRIJSLIJST (voor offerte-stap kostprijs)

Geen catalog-module. Prijzen zitten in template/document pricing-tables. Uitlezen via:
```
pandadoc:makeApiCall  GET /public/v1/templates/HQRvZ3sdrEm2GcuNsdP2Uf/details
  (connection 3580567, geen extra header)
→ response.pricing of response.tables[].items[] met name/price/cost/qty/sku
```
Of `getADocument` voor een bestaand document (output.pricing.tables[].items[]).

## 13. CONTACTPERSOON-RESOLUTIE (Bedrijven → Contact-taak)

Bedrijven-taak heeft relationship-veld **"Contact"** `1bce8db8-717f-4e94-abdc-64feb241087c` (type tasks)
→ wijst naar een Contactpersoon-taak (lijst 901520180286). Die taak heeft:
```
Voornaam    626a0441-8824-4381-a89a-4639ac547e23   short_text
Achternaam  79cbda71-626b-424c-8f78-d0785c52126a   short_text
GSM         8cee9669-26f3-4380-b592-175c1c481c7c   short_text
Email       d453a72f-e08e-46bb-b82f-24c311fad13f   email
```
Resolutie in scenario: GET Bedrijven-task → `first(first(map(cf;"value";"id";"1bce8db8...")) ).id` = contact_task_id
→ tweede GET /v2/task/{contact_task_id} → lees bovenstaande velden (onerror Resume bij leeg/geen contact).
TEST CLIENT BV 86c9yv1wy → Contact = 86ca0f6um (Jan Janssens, jan.janssens@testclient.be).

## 14. SHOOT BOOKING (booking-widget Submit 5663001 — patroon, NIET wijzigen)

Het werkende systeem UPDATET een AL BESTAANDE shoot-taak (verwacht `taskId`). Shoot-lijst = 901520180316.
Payload-velden: taskId, datum, datumLeesbaar, startuur, duur, timeHours, aantalPersonen,
availableHostIds[], klantVoornaam, klantEmail, locatie, locatieStraat/Postcode/Gemeente, contactNaam, contactGsm, extraInfo.
Voor het portaal: bouw een eigen `[PORTAL v2] - shoot-request` die een NIEUWE shoot-taak in 901520180316
aanmaakt (createTaskInListAdvanced) met Bedrijf-koppeling + datum + details (klant kiest geen content creator).

## 15. GECORRIGEERDE LIJST-IDs (research 28/5)
```
Opleidingen  901520180311   (was foutief 313)
Automations  901520180326   (was foutief 310)
SEO          BESTAAT NIET als aparte lijst
Projectbriefings 901521997613
```

## 10. FRONTEND CONTRACT

- `api()` in dashboard.js detecteert HTTP 401 → `handleSessionExpired()` (banner + redirect login).
- `decodeMakeString()` decodeert `\n \r \t \" \\` uit WebhookRespond-bodies.
- Cache: sessionStorage met TTL (`readCache/writeCache`); performance 10min, health 1u, bot-history 8 msgs.
- Brand: Montserrat (display) + Nunito (body); kleuren paars #9441DB / oranje #F66131 / blauw #3083DC / groen #12AC4E.
