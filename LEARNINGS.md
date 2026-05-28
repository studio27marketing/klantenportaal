# Klantenportaal — Hard-won learnings

Persistente kennis voor toekomstige iteraties. Lees dit eerst bij elke klantenportaal-taak.

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
- AND/OR — gebruik nested `if(cond1; if(cond2; "yes"; "no"); "no")`.

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

### POST /upload-* → 
```json
{"ok":true, "message":"Upload ontvangen"}
```

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
