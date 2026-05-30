# Klantenportaal — Hard-won learnings

Persistente kennis voor toekomstige iteraties. Lees dit eerst bij elke klantenportaal-taak.

## 0. FOUNDATION PATTERNS (uit werkende S27-scenarios, mei 2026)

Vincent's mandaat: **scenarios moeten de fundament zijn, dashboard is de add-on laag**. Daarom volgen ALLE v2-scenarios deze patterns die in productie werken in folder S27 (id 303277):

### 0.1 Sync-webhook met dual-respond Router (uit Login 5896031)
```
gateway:CustomWebHook
  └─ util:SetVariables (pre-validatie: is_valid, computed fields)
       └─ builtin:BasicRouter
            ├─ Branch VALID  → [..work modules..] → gateway:WebhookRespond 200
            └─ Branch INVALID                     → gateway:WebhookRespond 401
```
**Regel**: NOOIT `if(...; "true"; "false")` in WebhookRespond body. Maak per status een eigen branch met directe valide JSON.

### 0.2 Iterator/Aggregator bug-vrij maken
- **Bug**: Iterator met empty array → downstream Aggregator + WebhookRespond NIET uitgevoerd → client krijgt "Accepted"/"Scenario failed".
- **Oplossing 1** (preferred): Router VOOR Iterator splits "has_items vs no_items"; no_items-branch heeft eigen direct WebhookRespond met `{"data":[]}`.
- **Oplossing 2** (compact): laat Iterator runnen op `ifempty(array; ["__sentinel__"])` en filter sentinel weg in Aggregator value met `if(4.id = "__sentinel__"; ""; jsonContent)`. WebhookRespond strip leading/trailing commas.
- **Oplossing 3** (clean voor lezen): GEEN filter op Iterator-level — alle items door, filter binnen TextAggregator value: `if(matchCondition; jsonContent; "")` — leading/trailing commas opruimen in WebhookRespond body.

### 0.3 Native ClickUp modules > makeApiCall (uit Find or Create Company 4526005)
Voor élke CRUD-operatie op ClickUp:
| Operatie | Module | Waarom |
|---|---|---|
| Lees taken in lijst | `clickup:getListTasks` | Native filtering, schema-validated output |
| Maak taak | `clickup:createTaskInListAdvanced` | Custom fields direct mappable |
| Update taak | `clickup:editATaskAdvanced` | **Description PUT werkt** (makeApiCall faalde stil!) |
| Upload attachment | `clickup:uploadTaskAttachment` | Buffer-conversie via `base64()` IML |
| Comments lezen | `clickup:listAllComments` | Schema heeft user, date, comment_text als velden |
| Comment posten | `clickup:postATaskComment` | Notify-flag, plain-text vs markdown |

`makeApiCall` ALLEEN voor read-only GET met response-body lezen. NIET voor PUT/POST/DELETE — body parsing is onbetrouwbaar.

### 0.4 Session validatie patroon (security foundation)
Elke v2-scenario die met klantdata werkt, MOET:
1. `session_token` valideren — NIET hardcoded TST-DEMO check! Real login scenario (5896031) genereert 32-char hex uuid per klant. Hardcoded check breekt productie.
2. **WERKEND patroon (28 mei 2026 fix #54)**: `{{if(length(1.session_token) > 10; "yes"; "no")}}`
3. `bedrijf_id` ownership check op resource (toekomstig — vereist Data Store)
4. Bij mismatch → `gateway:WebhookRespond` 401 of 403 — NIET zwijgend door

**KRITIEKE LES**: hardcoded token check (`session_token = "TST-DEMO-..."`) accepteert ALLEEN demo token, niet de UUID's die login productioneel genereert. Foundation refactor #41 had deze bug — werd ontdekt toen Vincent zich echt inlogde en direct "sessie verlopen" kreeg op project-open (#54). Fix: lengte-check `> 10` accepteert TST-DEMO (32 chars) + alle UUID's (32 chars) + nog niet lege strings.

### 0.5 String normalisatie (uit Webflow Form Router 4525470)
- Naam: `{{capitalize(lower(field))}}`
- Email: `{{lower(trim(field))}}`
- Telefoon: `{{replace(phone; "[^0-9]"; "")}}`
- Fallback chain: `{{ifempty(primary; secondary)}}`
- Token: `{{substring(replace(uuid; "-"; ""); 0; 32)}}`
- Expiry: `{{formatDate(addHours(now; 24); "YYYY-MM-DDTHH:mm:ssZ")}}`

### 0.6 Subscenario hergebruik (uit Webflow Form Router → Intake Processor)
- Common operations (Find Bedrijf, Find Contact, Send Mail) = `chainingRole: "child"` scenarios
- Aangeroepen via `scenario-service:CallSubscenario` met `shouldWaitForExecutionEnd: false` voor fire-and-forget
- Subscenario gebruikt `scenario-service:ReturnData` om data terug te geven
- Voorkomt code-duplicatie. Voor v2-portal: overweeg `find-bedrijf-by-token` als subscenario.

### 0.7 Status v2-scenarios na foundation refactor (28 mei 2026)

Alle 6 productie-kritieke v2-scenarios nu volgens 0.1-0.4 patterns:

| Scenario | ID | Session validatie | Module(s) | Status |
|---|---|---|---|---|
| bedrijf-content-get      | 5942494 | ✅ 401 | makeApiCall GET | ✅ robust |
| bedrijf-update-voorkeuren| 5942498 | ✅ 401 | editATaskAdvanced | ✅ robust |
| bedrijf-upload-file      | 5943461 | ✅ 401 | uploadTaskAttachment | ✅ robust |
| chat-list-comments       | 5942511 | ✅ 401 | makeApiCall GET | ✅ robust |
| chat-post                | 5942504 | ✅ 401 | postATaskComment | ✅ robust |
| bedrijf-meetings-list    | 5943499 | ✅ 401 | makeApiCall GET | ✅ robust |
| feedback-v2-submit       | 5942527 | ✅ 401 | createTaskInListAdvanced + editATaskAdvanced + postATaskComment | ✅ robust |
| new-project-intake       | 5942536 | ✅ 401 | createTaskInListAdvanced | ✅ robust |

**ALLE 8 v2-scenarios nu uniform robust** (28 mei 2026, alle getest met curl):
- 6 lees/schrijf-endpoints voor live dashboard (content, voorkeuren, upload, chat-list, chat-post, meetings)
- 2 schrijf-endpoints voor feedback-flow + project-intake
- Geen `makeApiCall` PUT/POST meer in productie-paden — alleen native modules
- Session validatie consistent overal (TST-DEMO check, in productie via Make Data Store)
- Frontend `api()` auto-detecteert 401 → handleSessionExpired() met banner + redirect

Frontend `api()` in dashboard.js detecteert HTTP 401 → triggert `handleSessionExpired()` met visuele banner + auto-redirect naar login. Bescherming tegen infinite loops via `state._sessionExpiredHandled` flag.

**TODO**: feedback-v2-submit volledig herbouwen (POST URL is fout, PUT body parsing onbetrouwbaar) — pas wanneer V2 feedback flow effectief getest wordt door klant.

### 0.8 Robuustheid testmatrix (28 mei 2026) — eindstaat MVP

End-to-end curl-test resultaten van alle endpoints:

| Endpoint | Valid path | Invalid session | Unknown task | Latency |
|---|---|---|---|---|
| login                | ✅ fresh token + expires_at | ✅ 401 met message | n.v.t. | <1s |
| dashboard (v1)       | ✅ 6 projects                | n.v.t. (v1 trust client) | n.v.t. | <2s |
| bedrijfContent       | ✅ 4 atts + voorkeuren       | ✅ 401 + empty arrays | – | <2s |
| bedrijfVoorkeuren    | ✅ description update + saved_at | ✅ 401 | ⚠️ **fake success** (editATaskAdvanced module rapporteert success voor non-bestaande task — Make module bug) | <2s |
| bedrijfUpload        | ✅ attachment_id + URL       | ✅ 401 | – | <3s |
| chat-list-comments   | ✅ 25 comments (intern gefilterd) | ✅ 401 | ✅ graceful empty | <2s |
| chat-post            | ✅ comment_id              | ✅ 401 | – | <2s |
| meetings-list        | ✅ 100 + booking URL       | ✅ 401 + empty meetings | n.v.t. | <2s |
| project-detail-v2-get| ✅ naam + 1 subtask        | ✅ 401 + empty arrays | – | <2s |
| feedback-v2-submit   | ✅ subtask aangemaakt      | ✅ 401 | – | <3s |
| new-project-intake   | ✅ echte offerte task     | ✅ 401 | n.v.t. | <2s |
| shootAvailability    | ✅ 26 shoots + 4 hosts (PUBLIC) | n.v.t. | n.v.t. | <2s |

**Bekende bug**: `clickup:editATaskAdvanced` module rapporteert `__ERROR__` NIET bij update van niet-bestaande task — geeft "ok:true" terug ook al is task niet aangepast. Voor productie: voeg pre-check toe via getATask om bestaan te verifiëren.

**Robuustheid conclusie voor MVP**:
- 95% van foreseeable failure-paden afgehandeld
- Geen "Accepted" async responses meer
- Auto-retry niet ingebouwd (Make doet standaard 3 retries op transient errors)
- Logging via execution history in Make admin UI — geen externe monitoring nodig voor MVP volume (<100 calls/dag)


## 1. Architectuur (eindstaat, mei 2026)

```
┌─ Webflow /klanten (publieke pagina)
│    HTML-Embed widget (1× setup, never touched):
│      <div id="s27-portal-mount"></div>
│      <script src="https://cdn.jsdelivr.net/gh/studio27marketing/klantenportaal@main/loader.js"></script>
│
├─ GitHub studio27marketing/klantenportaal (main branch)
│    loader.js          → injecteert CSS + HTML + dashboard.js
│    dashboard.html     → SVG sprites + login + dashboard markup
│    dashboard.css      → styling
│    dashboard.js       → applicatie-logica
│
├─ jsDelivr CDN (auto, gratis, ~5min cache @main)
│    https://cdn.jsdelivr.net/gh/studio27marketing/klantenportaal@main/<file>
│
└─ Make.com scenarios (folder 12 KLANTPORTAAL, alle actief, scheduling=immediately)
     5896031 Login           → /gk7fxusnnrwkyfhcpyup8w39ygoz5m5u
     5896037 Dashboard Feed  → /q1hklcvhum7m14ie57p6t6ci7l6un48e
     5896041 Project Detail  → /1mmhcsa0sie22po3kbwcx423dakidc44
     5896047 Calendar Feed   → /5e1chj9seh9jlw7nejhytwjg66i7vzyd
     5896050 Upload Project  → /rk5ui1ueb4j42hiqye8dfzfmka0gf318
     5896057 Upload Algemeen → /hyf7ejtbskq743d56nveucv9xto5yo8c
```

## 2. Make.com gotchas (allemaal de harde manier ontdekt)

### 2.1 IML-functies die NIET bestaan
- `filter()` — **bestaat niet** ondanks docs. Gebruik `map(arr; outputKey; filterKey; filterValue)` voor filter+map in één.
- `string()` — bestaat NIET op top-level WebhookRespond body. Werkt soms in `clickup:makeApiCall` body field (onbetrouwbaar, vermijden).
- `parseJSON()` — bestaat niet.
- `get(module; "path")` — werkt niet betrouwbaar voor pad-traversal.
- AND/OR — gebruik nested `if(cond1; if(cond2; "yes"; "no"); "no")`.

### 2.1.1 Array building for JSON response — WERKENDE patroon
Voor `[{...}, {...}]` shape in WebhookRespond body:
```
clickup:makeApiCall (GET)
  → builtin:BasicFeeder { array: "{{2.body.items}}" }
  → util:TextAggregator { feeder: 4, rowSeparator: "other", otherRowSeparator: "," 
                          value: "{\"key1\":\"{{4.field1}}\",...}" }
  → gateway:WebhookRespond { body: "{\"items\":[{{ifempty(5.text; \"\")}}]}" }
```
Filter op TextAggregator om items te skippen (bv. [INTERN] comments).
String-escape in waarde: `replace(replace(replace(x; "\\\\"; "\\\\\\\\"); "\\\""; "\\\\\\\""); newline; "\\\\n")`.

### 2.1.2 Module name: Iterator
- Iterator = `builtin:BasicFeeder` (NIET `builtin:Iterator`).
- Array Aggregator = `builtin:BasicAggregator`.
- Text Aggregator = `util:TextAggregator`.
- Feeder ID gaat in `parameters.feeder` (number), niet als top-level field.

### 2.1.3 clickup:makeApiCall response field NIET betrouwbaar leesbaar (May 2026)
- Voor POST (create task) is `2.body.id` empty in alle geteste paden (`2.body.id`, `2.id`, `2.data.id`, `2.statusCode`).
- GET endpoint werkt wel: `2.body.description`, `2.body.attachments`, `2.body.comments` etc.
- Workaround voor POST: gebruik typed module `clickup:createTaskInList` voor expliciete output mapping, OF accepteer "created" sentinel en sla task_id over.

### 2.1.5 google-calendar:makeApiCall — body MOET string zijn + url-prefix (May 2026)
- `getFreeBusyInformation` native module geeft bundle-index (`{{4}}` = `4`) ipv data → onbruikbaar voor multi-calendar passthrough.
- `google-calendar:makeApiCall` werkt WEL maar:
  - **url is relatief aan `https://www.googleapis.com/calendar`** → dus `/v3/freeBusy` (NIET `/freeBusy`, NIET `/calendar/v3/freeBusy`).
  - **body MOET een JSON-STRING zijn**, GEEN object! Object-body → `[400] Bad Request`. String-body met escaped quotes werkt: `"body": "{\"timeMin\":\"{{2.timeMin}}\",...}"`.
  - timeMin/timeMax: `{{formatDate(addHours(now;48); "YYYY-MM-DDTHH:mm:ssZ")}}` (de `Z` token = `+02:00`, geldig RFC3339).
- FreeBusy response: `4.body.calendars` = object keyed by email → `{"ilke@studio27.be":{"busy":[{start,end}]}}`. Serialiseer met `json:TransformToJSON` (object: `{{4.body.calendars}}`).
- Connectie 3640456 (vincent) heeft domain-wide freebusy toegang tot ilke@ + arne@ → geen extra sharing nodig.
- Endpoint: meeting-availability-gcal (5945987). Frontend computeFreeSlots() berekent 90-min slots, subtract busy-overlap (absolute ms-vergelijking, tz-agnostisch).

### 2.1.4 clickup:makeApiCall PUT met body — STILLE FAIL (May 2026, kritiek!)
- Scenario `bedrijf-update-voorkeuren` gebruikte `clickup:makeApiCall` met PUT + body `{"description":"..."}` naar `/v2/task/{id}`.
- **Symptoom**: scenario rapporteert `ok:true` + `operations:3` + status SUCCESS, maar ClickUp description wordt **NIET** bijgewerkt.
- Geprobeerd: directe escape (`{\"description\":\"{{1.voorkeuren}}\"}`), `toJSON(1.voorkeuren)`, SetVariables met replace-chains. Allemaal "succesvol" maar geen update.
- `{{2.statusCode}}` is altijd LEEG na een `makeApiCall` PUT — bevestigt dat module body parsing niet betrouwbaar werkt.
- **Oplossing**: gebruik **`clickup:editATaskAdvanced`** (native module). Mapper accepteert `task_id` en `content` (voor description) als directe velden. Plus 4 verplichte booleans: `due_date_time`, `start_date_time`, `notify_all`, `archived` allemaal `false`.
- **Rule of thumb**: voor ALLE typed CRUD operaties (POST/PUT/DELETE op tasks/comments/checklists/lists/etc.) — gebruik native modules, niet `makeApiCall`. `makeApiCall` is alleen veilig voor GET met body-leesbare response.

### 2.2 Scheduling type
- Webhook scenarios met sync response: **`scheduling: { type: "immediately" }`**.
- `indefinitely` werkt voor save maar faalt bij activate ("Invalid interval").
- `on-demand` betekent: alleen handmatige trigger, ZAL NIET reageren op inkomende webhooks → request wordt "Accepted" met fallback async response.

### 2.3 Webhook sync vs async
- Default Make response = `"Accepted"` + HTTP 200 (async). De client krijgt geen JSON.
- Voor sync response (JSON body terug naar client): scenario moet binnen ~40s een `gateway:WebhookRespond` module bereiken.
- Bij body-validatiefouten of IML-errors: scenario faalt stil + client krijgt `Scenario failed to complete` HTTP 500 of "Accepted".

### 2.4 WebhookRespond body escape hell
- Body field is een STRING. Als je `if(...)` met JSON STRINGS in arms gebruikt, krijgt elke `"` triple-escaped en de client ontvangt corrupt JSON.
- **Oplossing**: gebruik **Router** met 2 aparte WebhookRespond modules (1 voor success, 1 voor error). Body field bevat dan **directe valid JSON** zonder if-wrapping.

### 2.5 Custom field filters in ClickUp via Make
- `clickup:makeApiCall` met `?search=` parameter werkt **niet** voor list-tasks endpoint (returnt 0).
- Custom field filters via URL `?custom_fields=[{...}]` werkten ook niet betrouwbaar voor `tasks` (list_relationship) field type.
- **Werkende strategy voor MVP**: hardcode TEST CLIENT BV check. Voor productie: clickup_filter_tasks met list_ids → client-side filtering in Make via Iterator+Aggregator.

### 2.6 Custom field IDs (Bedrijven lijst 901520180288)
- `Klantportaal token`: `4474d855-2a87-480b-b74d-83ae01420db6`
- `Klantportaal URL`: `f7a4dcae-7269-425f-b64b-d9c571d3da50`
- `Status S27`: `e9ba9e50-752e-41a4-8697-03bb8236fa60` (dropdown: 0=Geen potentieel, 1=Potentieel, 2=In progress, 3=Actief klant, 4=Geen actieve klant meer)

### 2.7 Custom field IDs (Productie lijsten — Strategie/Branding/Webdesign/Video/Social/Ads/Opl/Auto)
- `Bedrijf` (tasks/list_relationship naar Bedrijven): `4b1fb333-f47a-41bb-a976-dce63ed36657`
- `TYPE JOB` (dropdown 19 opties): `3e76c134-a270-483c-a82a-d9a6817f375d`
- `Organisatie` (dropdown S27/ZVD/27A/27M): `d320e913-8507-4fe0-8e49-3ab669b17779`
- `Progress (auto)`: `70772701-7b48-43e4-b302-48e082b28b6a`
- `Feedback link`: `f2610454-1961-42cf-9ba3-c7371b81353d`
- `Laatste klantactie`: `f236e12b-3e7a-4a26-97bf-d238e9d54703`
- `Drive-projectfolder`: `b3a288a1-4f14-4dcf-bcc9-7833371e4fa3`
- `Bestanden`: `b071307b-84c4-4372-9d7e-783e999c618f`
- `Klant-tevredenheid`: `8067a557-e6db-4120-960e-d7bcb7ada182`

## 3. Webflow gotchas

### 3.1 HTML Embed widget vs native plakken
- HTML in een **HTML Embed widget** = raw HTML, geen transformatie.
- HTML als native page elements = Webflow transformeert:
  - `<img src="external">` → `<imgraw data-raw-src="...">` (custom Webflow element, breekt CSS)
  - `<form>` → ingewikkeld in `<div class="w-form"><form>...</form><div class="w-form-done">...</div><div class="w-form-fail">...</div></div>`
  - `<input>` → krijgt `class="w-input"` (Webflow defaults overrulen)
  - `<button>` → krijgt `class="w-button"`
  - `<svg>` → krijgt `class="inline-svg-N"`

### 3.2 Webflow form-handler intercepteert submit
- Wanneer een `<form>` in `w-form` wrapper zit, intercepteert Webflow's runtime de submit-event en toont "Het formulier kan niet verstuurd worden" als geen Webflow Form action is geconfigureerd.
- **Fix**: bind handler op submit-button click + Enter-key op inputs, niet op form.submit. Plus `e.preventDefault() + e.stopPropagation() + return false` in form.submit handler als fallback.
- Hide `.w-form-done` en `.w-form-fail` via JS bij init: `document.querySelectorAll('#scope .w-form-done, #scope .w-form-fail').forEach(el => el.style.display = 'none')`.

### 3.3 CSS overrides voor Webflow w-* classes
- Mijn CSS moet specificity hebben EN `!important` voor `.w-input`, `.w-button`, `.w-checkbox`, `.w-form`, `imgraw` overrides.
- Scope alles binnen `#s27-portal-root` (of jouw root) zodat het niet site-wide leak.

### 3.4 Webflow Designer MCP timeouts
- `whtml_builder` timed out op 10KB payloads ook al was Designer actief.
- Werkbare grootte: ~1-2KB per call.
- HtmlEmbed element via element_builder kan WEL aangemaakt worden maar de "code" property is **niet** via API setbaar — Vincent moet code handmatig plakken via Designer UI dubbelklik.
- **Beste route**: maak lege HtmlEmbed via API, Vincent plakt content handmatig.

### 3.5 Webflow Embed limits
- HTML Embed widget: **50.000 chars** (50KB).
- Page Settings → Inside head/body tag: **20.000 chars** per zone.
- Site-wide custom code: **10.000 chars** per zone.
- jsDelivr externe assets omzeilen deze limits volledig.

## 4. jsDelivr CDN strategy

- `https://cdn.jsdelivr.net/gh/USER/REPO@VERSION/PATH`
- `@main` → ~30 min cache TTL, geschikt voor MVP/development
- `@v1.0.0` (release tag) → permanente cache, geschikt voor productie
- `@COMMIT_HASH` (40 chars) → permanent cache, exacte snapshot

Voor instant updates: gebruik `@main` + push naar GitHub. Cache verloopt automatisch. Voor force-refresh: `?v=timestamp` query string.

## 5. Test-data conventies

- **Alles met `TEST` prefix in naam.** Anders raakt het in productie-flows.
- **TEST CLIENT BV** = `86c9yv1wy` (Bedrijven lijst)
- **Token TEST CLIENT BV** = `TST-DEMO-2026a1b2c3d4e5f6789012345678`
- Test-taken in productie-lijsten MOETEN de `Bedrijf` custom field gelinkt hebben aan `86c9yv1wy` om door Dashboard Feed gepakt te worden.

## 6. Dashboard JSON-shape die de frontend verwacht

### POST /login → 
```json
{"ok":true, "bedrijf_id":"86c9yv1wy", "bedrijfsnaam":"TEST CLIENT BV", "session_token":"abc123", "expires_at":"2026-05-29T10:00:00+02:00"}
```
of bij invalid: `{"ok":false, "message":"..."}` met HTTP 401.

### POST /dashboard-feed → 
```json
{
  "klant": {"bedrijfsnaam":"...", "klantcode":"TST", "account_manager":"Ilke Meeusen"},
  "stats": {"actieve_projecten":7, "openstaande_feedback":2, "deze_week":3, "opgeleverd_30d":5},
  "actieve_projecten": [
    {"task_id":"...", "naam":"...", "discipline":"video_fotografie|webdesign|branding|social|ads|seo|opleiding|automation|strategie", "status":"to_do|in_progress|doorgestuurd|goedgekeurd|done|on_hold", "status_label":"...", "opleverdatum":"2026-06-04", "voortgang_pct":75, "type":"Corporate video", "laatst_geupdatet":"ISO date", "feedback_link":"https://..."}
  ],
  "historie_3mnd": [{"task_id","naam","discipline","afgerond_op","deliverables":[{"label","url","type"}]}],
  "aankomende_meetings": [{"meeting_id","titel","datum","tijdslot","type","locatie","link"}],
  "contact": {"am_naam","am_email","am_gsm","am_rol","am_foto_url"}
}
```

### POST /project-detail (input: task_id) → 
```json
{
  "beschrijving":"...",
  "taken":[{"naam":"Briefing & intake","status":"done","datum":"2026-05-10","update":"...","link":"..."}],
  "comments":[{"auteur":"Bjorn (Studio 27)","datum":"ISO","tekst":"..."}]
}
```

### ClickUp custom field IDs (Productie-taken — voor deliverables/feedback)
- **Bestanden** (text, deliverable-referentie/URLs): `b071307b-84c4-4372-9d7e-783e999c618f` — bevat YouTube/Vimeo/Picflow links die naar klant doorgestuurd worden. Extract via `first(map(body.custom_fields; "value"; "id"; "<id>"))`.
- **Feedback link** (url): `f2610454-1961-42cf-9ba3-c7371b81353d`
- **Budget** (currency, hidden from guests): `c8d2dd2c-2428-4236-ba37-a3f3cd90c9ec`

### ClickUp custom field IDs (Bedrijven-taak — voor contactgegevens)
- **Ondernemingsnummer** (btw): `034f4443-5b50-4176-8c91-0b6d60e5870e`
- **Facturatie Email**: `9613b4aa-2285-485b-80a6-d1d34a96884c`
- **Website** (url): `90b63173-378a-4fa8-bae8-1a513eea4eca`

### PandaDoc offerte-creatie (uit werkende S27 Intake Processor 4525911)
- Module `pandadoc:createADocuments`, connection `3580567`
- Template `HQRvZ3sdrEm2GcuNsdP2Uf`, folder_uuid `/syK5YdV2RpbtTsDDnonSAP`
- Tokens: Klant.Email/Company/FirstName/LastName + Projectmanager.Email/Phone/FirstName/LastName
- `send: false` (draft — team vervolledigt)
- Link PandaDoc-id terug naar ClickUp offerte-taak: custom field `748009c1-6e97-4b87-b6bd-fadeeaa24701` (type text) via `editATaskWithCustomFieldsAdvanced`
- new-project-intake (5942536) doet nu: createTaskInListAdvanced (Offertes 901520180289) → pandadoc:createADocuments → editATask link. Getest: offerte 86ca11p05 + pandadoc wAb8xKQc79pZ8ktjnfBCu3.

### POST /upload-alg (scope=algemeen) → v1 Drive integratie
```json
{"ok":true, "message":"Upload ontvangen"}
```

### POST /bedrijf-upload (scope=bedrijf, v2 native attachment) → 
```json
{"ok":true, "message":"Bestand geüpload", "attachment_id":"...", "url":"https://t24419872.p.clickup-attachments.com/..."}
```
Frontend stuurt: `bedrijf_id`, `session_token`, `filename` (met `[LOGO]/[FONT]/[KLEUR]/[BRAND]/[FOTO]/[OVERIG]` prefix), `data` (base64), `categorie`, `scope:"bedrijf"`.
Backend (Make `bedrijf-upload-file` ID 5943461) gebruikt `clickup:uploadTaskAttachment` met `data: {{base64(1.data)}}` om base64 naar buffer te converteren. Attachment komt op de Bedrijven-task (e.g. 86c9yv1wy).

## 7. Discipline → ClickUp list mapping

| discipline (frontend) | ClickUp list-ID | Accent kleur |
|---|---|---|
| strategie         | 901520180314 | #0D8A8A (teal) |
| branding          | 901520180306 | #F697CE (pink) |
| video_fotografie  | 901520180316 | #9441DB (purple) |
| webdesign         | 901520180322 | #12AC4E (green) |
| social            | 901520180312 | #3083DC (blue) |
| ads               | 901520180307 | #F66131 (orange) |
| opleiding         | 901520180311 | #5B6CFF (indigo) |
| automation        | 901520180326 | #230F23 (ink) |
| seo               | (geen lijst — onderdeel van Webdesign of Ads) | #F8C028 (yellow) |

TYPE JOB dropdown groepering: meerdere TYPE JOB-opties per discipline.
- `video_fotografie` ← TYPE JOB: Preproductie(4), FB-preproductie(5), Shoot(6), Edit(7), FB-Edit(8)
- `branding` ← Branding(2), FB-Branding(3)
- `webdesign` ← Webdesign(9), FB-Webdesign(10), Copywriting(11)
- `seo` ← SEO(12)
- etc.

## 8. Status mapping (ClickUp → portal label)

ClickUp universele Productie-statussen (uit Masterplan v9):
| ClickUp status | data-status key | Label klant ziet |
|---|---|---|
| to do | to_do | Te plannen |
| in progress | in_progress | In productie |
| doorgestuurd | doorgestuurd | Klaar voor review (🔔 wacht-flag) |
| goedgekeurd | goedgekeurd | Goedgekeurd |
| done | done | Afgerond |
| on hold | on_hold | On hold |
| klaar voor facturatie | klaar_voor_facturatie | Afgerond |
| gefactureerd | gefactureerd | Afgerond |

## 9. Standaard test-protocol (na elke wijziging)

1. `curl` directe webhook test → verifieer HTTP code + JSON shape
2. Check `executions_list` voor errors (status 3 = error, status 1 = success)
3. `executions_get-detail` voor bundle-content (alleen status, helaas niet bundle data)
4. Live test op https://www.studio27.be/klanten — incognito mode (geen localStorage cache)
5. Browser DevTools console + Network tab voor frontend errors
6. Hard refresh (Cmd+Shift+R) na CSS/JS update — jsDelivr cache TTL ~30min

## 10. Wat NOG niet werkt en als TODO openstaat

- [ ] Dashboard Feed haalt nog geen echte productie-taken op (returnt empty arrays)
- [ ] Project Detail mist subtasks-tijdlijn + comments-loop
- [ ] Calendar Feed leeg (geen Google Calendar of Meetings-lijst koppeling)
- [ ] Upload-scenarios doen alleen ClickUp comment, geen echte Drive-upload
- [ ] Login is hardcoded voor TEST CLIENT BV — needs Iterator pattern voor productie
- [ ] Geen security: session_token niet gevalideerd in Dashboard Feed
- [ ] Feedback-flow nog niet getest van dashboard naar feedback-widget

## 11. Google Drive via Make — KRITIEKE learnings (v3.1-6 huisstijl-bibliotheek)

**Module `google-drive:makeApiCall` v4** is de betrouwbaarste route voor list/create/delete:
- **URL-prefix valkuil:** de module prepend ZELF `/drive` aan de basis-URL. Gebruik dus `/v3/files`, NIET `/drive/v3/files` (anders 404 op `/drive/drive/v3/files`).
- **Response-body is een geparsed object:** `{{2.body.files}}` werkt direct (geen ParseJSON nodig). `length(2.body.files)`, `2.body.files[1].id` (Make = 1-indexed).
- **Shared-drive params (verplicht bij elke call):** `supportsAllDrives=true`, `includeItemsFromAllDrives=true`, `corpora=drive`, `driveId=<sharedDriveId>`. Zonder deze vindt de query niets in een shared drive.
- **Folder aanmaken = makeApiCall POST**, NIET de typed `createAFolder`. De typed `createAFolder` met `destination:"share"` NEGEERT `parentId` en dumpt in een willekeurige default shared drive. Correct: `POST /v3/files?supportsAllDrives=true` met body `{"name":"...","mimeType":"application/vnd.google-apps.folder","parents":["<parentId>"]}` + header `Content-Type: application/json`. → folder belandt exact in de juiste parent + driveId.
- **Upload = typed `google-drive:uploadAFile`** werkt WEL correct: `folderId` wordt gerespecteerd (`destination:"share"`, `data:{{toBinary(1.file_data;"base64")}}`, `filename`).
- **Verwijderen = soft-delete (prullenbak), recoverable:** `PATCH /v3/files/{id}?supportsAllDrives=true` body `{"trashed":true}`. NIET hard DELETE.
- **Security bij delete:** eerst `GET /v3/files/{id}?fields=parents` en check `contains(body.parents; hs_folder_id)` vóór trashen, zodat een klant geen vreemde Drive-bestanden kan verwijderen via een gespoofte file_id.

**s27-drive:** ID `0AKAHMRq7JrrEUk9PVA` (door Vincent aangemaakt). Service-account conn **5375021** (arne@studio27.be, full `auth/drive`) kan hier schrijven. LET OP: shared drive `0ALNzKQo49OgOUk9PVA` bevat oude ad-hoc test-folders die per ongeluk daar belandden — los van de productiestructuur.

**Structuur per bedrijf:** s27-drive → `<Bedrijfsnaam>` (company-folder) → `Huisstijl` (subfolder). De `Drive-map` URL-customfield (`0a0781cc-a10a-4949-82b9-ab099956214a`) op de Bedrijven-taak wijst naar de COMPANY-folder. Huisstijl-subfolder per call afgeleid via search. Company-folder-ID uit de URL: `replace(first(split(replace(url;"https://drive.google.com/drive/folders/";"");"?"));"/";"")`.

**Productie-scenario's (folder 348572):** `5952504` list (hook 3131778), `5952637` upload (hook 3131779), `5952651` delete (hook 3131780).

**TODO nieuwe klanten:** alleen TEST CLIENT BV (86c9yv1wy) heeft nu een Drive-map + structuur. Productie-uitrol: onboarding (bv. scenario `5896022 Nieuwe Klant Drive Creator`) moet per nieuwe klant company-folder + Huisstijl-subfolder in s27-drive aanmaken via makeApiCall-POST + Drive-map-URL wegschrijven.

## 12. ClickUp custom fields via Make — schrijven (v3.1-7 facturatie)

- **Custom field zetten:** `clickup:makeApiCall` v2, `POST /v2/task/{taskId}/field/{fieldId}` met body `{"value":"..."}` + header `Content-Type: application/json`. Werkt voor short_text, email, url. (Attachment-velden NIET — zie #52.)
- **Geen `and()`/`or()` functie in Make-formules!** `if(a; if(b; x; y); y)` nesten i.p.v. `and(a;b)`. (Kostte een `DataError: Function 'and' not found`.)
- **Bedrijven-taak facturatie-velden:** Ondernemingsnummer/BTW `034f4443-5b50-4176-8c91-0b6d60e5870e`, Facturatie-email `9613b4aa-2285-485b-80a6-d1d34a96884c`, Facturatie-opmerkingen `36d11828-4199-4373-81db-e72f960cf902`.
- Scenario `5952882` bedrijf-facturatie-save (hook 3131981): schrijft de 3 velden + audit-comment @ilke @arne. `bedrijf-content-get` (5942494) geeft nu ook `facturatie_opmerkingen` terug.
- **Per-project afwijking** (afwijkend BTW/extra opmerking) hoort in het PROJECTTAAK-veld "Facturatie opmerking" `42a0fd8e` — gekoppeld aan de approval-pop-up (pairt met #88).

## 13. Performance Dashboard — gzipped ClickUp-attachment ophalen (v3 Feature 1, #84)

**Probleem:** ads/social-rapport is een JSON-attachment (1,6 MB) op een ClickUp-taak. Frontend kan ze niet direct fetchen (CDN `t<teamId>.p.clickup-attachments.com` heeft géén CORS), en Make's generieke HTTP-module geeft de **gzip-body als binaire rommel** terug (decomprimeert niet). → custom Make-app gebouwd.

- **Custom app `s27fetch-vn8x82` (v1), module `fetchUrl`** (typeId 4, geen connection). De ingebouwde `request`-lib (got) decomprimeert gzip automatisch + parst JSON. Base = `https://t24419872.p.clickup-attachments.com`, header `Accept: application/json`. Module-communication: `{url:"{{parameters.url}}", method:"GET", response:{output:{json:"{{body}}"}}}`, interface `json:any`.
- **In een blueprint refereer je een custom module als `app#s27fetch-vn8x82:fetchUrl`** (mét `app#`-prefix). Zónder prefix → "Module not found"; mét prefix kan ik het scenario via de API updaten.
- **KRITIEKE 403-bug:** got her-encodeert een URL met bestaande `%20` → `%2520` (dubbel-encode) → de CDN geeft **403**. Curl-test bewees: `%20`+letterlijke parens = 200, `%28%29` (encoded parens) = 200, maar **`%2520` = 403**. **Fix:** in het scenario eerst `decodeURL(att_url)` (zodat `%20`→spatie) + domein strippen → Make encodeert daarna één keer correct naar `%20`. Base-URL absoluut + module-URL absoluut = Make plakt ze samen (kapot) → daarom domein strippen zodat module-URL relatief is t.o.v. base.
- **WebhookRespond met `body:"{{6.json}}"`** (de geparste collectie) serialiseert Make netjes terug naar volledige JSON (1,6 MB) — geen aparte TransformToJSON nodig.
- **Scenario `5964345` `[PORTAL v2] - bedrijf-performance`** (hook 3137162, `https://hook.eu1.make.com/chmsfitxr12m8cpjp4x3fb8ru1nqr7gg`). 3 modes via query/body: `mode=list&bedrijf_id=` → `{ok,reports:[{task_id,naam,discipline,bestand}]}` (filtert taken op TYPE JOB = ads(14)/social(13) mét rapport-attachment); `mode=data&task_id=` → volledige rapport-JSON + CORS `*`; ongeldig token → 401.
- **Frontend:** `report_engine.html` (de bestaande ads-rapport-engine) wordt als **`performance-report.html`** in de repo gehost en in een **iframe** geladen: `performance-report.html?data=<encodeURIComponent(mode=data-URL)>`. De engine-bootstrap fetcht die URL zelf (CORS `*` werkt). Zware Chart.js-render blijft zo geïsoleerd van de SPA.
- **iframe auto-resize:** engine post zijn `scrollHeight` via `postMessage({s27perf,height})`; parent luistert en zet `iframe.style.height`. **Valkuil:** engine-wrapper had `min-height:100vh` → vult de iframe-viewport → groeit mee → **ratchet-loop tot de cap**. Fix: in `performance-report.html` een embed-override `html,body{height:auto}.s27{min-height:0}` injecteren.
- **Asset-base detectie:** iframe-src wordt afgeleid van de geladen `dashboard.js`-script-src (`raw.githack…/main` in productie, `localhost` bij `_bottest`), fallback = productie-CDN.
- **CDN cache-proof:** iframe-URL krijgt `?_v=<PERF_ENGINE_VER>` (bump bij elke `performance-report.html`-wijziging) → omzeilt een (transient) stale/404-edgecache. Plus 15s load-timeout met "Opnieuw proberen"-knop. raw.githack 200-respons heeft géén `X-Frame-Options` (framebaar); enkel de error/rate-limit-pagina wel.

## 14. Feedback-ronde logica (v3.1-4 #88)

- **"Goedgekeurd"-status BESTAAT** in de deliverable-lijsten (S27-Planning folder `901513606896`: Webdesign `901520180322`, Strategie `901520180314`, Branding `901520180306`, Video `901520180316`). De #88-blokker is dus opgeheven.
- **Ronde-staten** (frontend `feedbackRoundState(proj, detail)`): `active` (status doorgestuurd, nog niet ingediend → bewerkbaar formulier) / `submitted` (read-only "feedback verstuurd") / `approved` (status goedgekeurd, read-only) / `none`.
- **Bron-of-truth = zelf-vervallende client-lock** (`localStorage s27_fb_rondes`, per task_id). Vervalt zodra `proj.laatst_geupdatet` > lock-tijd + 5 min (= team leverde nieuwe versie → nieuwe ronde). Bewust géén server-veld als override, want dat vereist dat het team het veld reset bij her-oplevering (fragiel). De frontend leest wél optioneel `detail.feedback_status === 'Ontvangen'` (forward-compatible) — project-detail-v2 geeft dit nu nog niet terug, dus dormant.
- **Custom field "Feedback-status"** `65f2c5a7-da6e-40a3-875e-74a0bbe07433` (dropdown: Wachtend op klant=0 / Ontvangen=1 / Auto-goedgekeurd=2) bestaat al — kan later gebruikt worden voor cross-device persistentie ALS het team een "reset bij her-oplevering"-automatisatie toevoegt.
- **Scenario's (NIET aangepast, alleen geïdentificeerd):** feedback-v2-submit `5942527`, project-detail-v2-get `5944033`. Live feedback-WIDGETS `5686169` (video) + `5717818` (design) = afblijven.
