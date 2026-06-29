# Gateway D1-migratie — runbook

Begeleidt `gateway/worker.js`. Volledige analyse: [`../AUDIT_HUB_MIGRATION.md`](../AUDIT_HUB_MIGRATION.md).
Architectuur = **Optie A**: de in-repo gateway `s27-portal-gateway` krijgt D1-handlers achter een
feature-flag (`D1_ENDPOINTS`). De frontend (`dashboard.js`) blijft ongewijzigd: zelfde `GATEWAY_BASE`,
zelfde endpoint-keys. Bron = D1 `s27-crm-db` (`0c50db87-9a69-4cdc-9f43-4c1dc92dd801`), binding `CRMDB`.

## Wat in de repo zit (klaar)
**Reads** (gevalideerd tegen ORISON `86c8cz2qb` + Vorsselmans `86c8cz2y6`):
`bedrijfContent` · `bedrijfBeheer:get_team` · `bedrijfBeheer:get_offertes` · `meetingsList` · `dashboard`.
**Eigen chat** (greenfield, D1-native): `chatList` (read) · `chatPost` (write).
**Writes** (P4, schrijven + stempelen `portal_overrides` zodat de sync ze niet overschrijft):
`facturatieSave` · `bedrijfBeheer:update_bedrijf` · `bedrijfBeheer:update_contact` (IDOR-scoped op `bedrijf_id`).
**Scaffolding**: status/discipline-maps (G2/G3), datum-coercie (G11), `d1PortalWrite` (write+override-stamp,
mirror van de hub's `crmEntityUpdate`), scope-vangrail, is_klant-cache. Elke query scope't strikt op de
Firebase-claim-id (`companies.id == clickup_id == claim`, 491/491). Body-ids worden nooit vertrouwd.

## Veiligheidsgarantie
De dispatch zit **na** de geverifieerde claim en **vóór** de Make-forward, in `try/catch`. Bij élke D1-fout
of `null` (bedrijf niet in D1) **valt de gateway terug op Make/ClickUp** — D1 kan de live-portal niet breken.
`D1_ENDPOINTS = "[]"` = 100% Make, geen gedragsverandering.

## ⚠️ Go-live = via GitHub Actions (de agent kan zelf niet deployen)
In de sandbox is geen `wrangler`/token; deployen gebeurt via de CI-workflow
[`.github/workflows/deploy-gateway.yml`](../.github/workflows/deploy-gateway.yml). Eenmalig instellen:
1. Maak een Cloudflare API-token: **Account → Workers Scripts: Edit** + **Account → D1: Edit**
   (+ **Workers KV Storage: Edit** als je KV-rate-limiting houdt). Noteer ook je **account-id**.
2. Repo → Settings → Secrets and variables → Actions → voeg toe:
   `CLOUDFLARE_API_TOKEN` en `CLOUDFLARE_ACCOUNT_ID`.
3. **Pre-flight**: open de live worker `s27-portal-gateway` → Settings → Bindings. Staat er een
   KV-binding `KV`? Uncomment dan het `[[kv_namespaces]]`-blok in `wrangler.toml` met de namespace-id,
   anders is rate-limiting na deploy uit (de code valt netjes terug — niet gebroken). Worker-secrets
   (`GATEWAY_SECRET`, `ADMIN_SECRET`, `SA_*`) blijven behouden bij een deploy.
4. Tab **Actions** → "Deploy gateway" → **Run workflow** (branch `claude/hub-portaal-integration-sirpwu`),
   of push een wijziging onder `gateway/`.

Handmatige alternatieven: Cloudflare-dashboard (plak `worker.js`, zet binding `CRMDB` + var `D1_ENDPOINTS`),
of lokaal `cd gateway && npx wrangler deploy`.

**Huidige `wrangler.toml`-default live-set** (= "zet live", reads + tekstchat):
`["meetingsList","bedrijfBeheer:get_team","bedrijfBeheer:get_offertes","bedrijfContent","chatList","chatPost"]`

## Smoke-test direct na deploy (essentieel — frontend leest op exacte sleutel)
Log in als een klant die in D1 staat (bv. ORISON) en check per tab: meetings, offertes, bedrijfsgegevens/
contacten, en stuur een chatbericht (verschijnt het terug?). Bij twijfel: vergelijk de gateway-respons met
de oude Make-respons. **Rollback = key uit `D1_ENDPOINTS` halen** (geen redeploy van code nodig).

## Gefaseerd aanzetten (na de eerste live-set)
1. **Writes** → na een schrijf-smoke-test: voeg `facturatieSave`, `bedrijfBeheer:update_bedrijf`,
   `bedrijfBeheer:update_contact` toe. Ze muteren live data en stempelen `portal_overrides`
   (test: schrijf een veld → draai `crm/sync` → waarde moet overleven).
2. **dashboard** → pas aanzetten nadat taken in D1 staan (de 8 ClickUp-discipline-lijsten zijn nog niet
   gesynct; `tasks` zijn nu offerte-stubs). Zie de task-backfill (volgende stap).
3. **chat-bijlagen** (`chatAttachment`) → vereist een R2-mediaroute (bucket `s27-portal-files`). Tot dan
   blijft `chatAttachment` op Make; tekstchat werkt al via D1.
4. **bedrijfVoorkeuren** (vrije-tekst huisstijlvoorkeuren) → vereist een nieuwe kolom `companies.voorkeuren`
   (er is geen bestaande kolom). Nog niet verlegd.

## Bekende aandachtspunten
- `meetingsList`: geen Meet-URL in D1 (enkel `ff_url` Fireflies, intern) → `link:''`; `booking_url` alleen
  als je `MEETINGS_BOOKING_URL` zet.
- `bedrijfContent`/`get_team`: `mw` is NULL en `notif`/voorkeur leeg voor alle bedrijven → `''` (frontend
  tolereert). `rol`/`ondernemingsleider` hebben geen kolom.
- `get_offertes`: ~helft van de offertes mist `bedrijf_id`; fallback matcht op `bedrijf_naam`. `draft` gedropt.
- `update_contact`: enkel BESTAANDE contacten; nieuwe contacten + portaaltoegang blijven op ClickUp (een
  D1-native id zou de sync-identiteit breken, audit R12).
