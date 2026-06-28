# Gateway D1-migratie — runbook (pass 1)

Begeleidt `gateway/worker.js`. Volledige analyse: [`../AUDIT_HUB_MIGRATION.md`](../AUDIT_HUB_MIGRATION.md).
Architectuur = **Optie A**: de in-repo gateway `s27-portal-gateway` krijgt D1-handlers achter een
feature-flag. De frontend (`dashboard.js`) blijft ongewijzigd: zelfde `GATEWAY_BASE`, zelfde endpoint-keys.

## Wat in deze commit zit
- **D1-leeshandlers** (klaar, achter de flag): `bedrijfContent`, `bedrijfBeheer:get_team`,
  `bedrijfBeheer:get_offertes`, `meetingsList`, `dashboard`.
- **Eigen-chat-handlers** (greenfield, D1-native): `chatList` (read), `chatPost` (write).
- **Scaffolding**: `maps.statusD1ToPortal`/`branchToDisc` (audit G2/G3), `util.msStr`/`util.iso`
  (datumformaten, G11), `getTeamMemberIds` (is_klant-cache), `d1Scoped` (scope-vangrail R3),
  en de dispatch in de hoofd-`fetch` — **NA** de geverifieerde claim, **VÓÓR** de Make-forward.
- Elke query scope't strikt op de Firebase-claim-id (`companies.id == clickup_id == claim`, 491/491).
  Body `bedrijf_id`/`task_id`/`room_id` worden nooit vertrouwd.

## Veiligheidsgarantie (waarom dit niets breekt)
`D1_ENDPOINTS = "[]"` (default) ⇒ de dispatch doet **niets**; elke request gaat 100% naar Make/ClickUp,
exact zoals vroeger. Een handler die `null` teruggeeft (bedrijf niet in D1) of een D1-fout gooit, **valt
terug op Make** (try/catch in de fetch). D1 kan de live-portal dus nooit breken.

## Deploy & flippen (acties voor jou — niets hiervan is gebeurd)
1. **Binding zetten**: `CRMDB → s27-crm-db (0c50db87-…)` staat al in `wrangler.toml`. Bij dashboard-deploy
   van deze worker wordt de binding meegenomen. (Met de lege flag is dat gedragsneutraal.)
2. **Deploy** de worker (gedragsneutraal zolang de flag leeg is).
3. **Pariteitstest** per endpoint vóór het flippen: zelfde request naar Make én naar D1, vergelijk de
   `data`-JSON op de testklant **ORISON `86c8cz2qb`** (en **Vorsselmans `86c8cz2y6`**). De frontend leest
   velden op exacte sleutel — elke drift blankt een tab stil.
4. **Veilige eerste flips** (data is gevuld, read-only):
   `D1_ENDPOINTS = '["meetingsList","bedrijfBeheer:get_team","bedrijfBeheer:get_offertes","bedrijfContent"]'`
   Per endpoint flippen, niet alles tegelijk. Rollback = key uit de lijst halen.
5. **Nog NIET flippen** (wachten op data/fase):
   - `dashboard` → tasks zijn nog offerte-stubs; wacht tot de 8 ClickUp-discipline-lijsten in `tasks`
     gesynct zijn (audit G4/P-tasks). `modules` staat bewust op `null` = alle tabs zichtbaar (geen regressie).
   - `chatList`/`chatPost` → `chat_messages` is leeg; flippen zou threads blanken (R10). Eerst beslissen:
     vers starten vs ClickUp-historie backfillen (audit P2).
   - `get_offertes` is **v4-only** (niet aangeroepen door de live `dashboard.js`) — flippen heeft pas
     effect zodra v4 live is.

## Bekende aandachtspunten
- `meetingsList`: geen Meet-URL-kolom in D1 (alleen `ff_url` Fireflies, intern) → `link:''`. `booking_url`
  alleen als je `MEETINGS_BOOKING_URL` zet.
- `bedrijfContent`/`get_team`: `mw` (medewerkers) is NULL voor alle bedrijven, `notif` (voorkeur) leeg →
  emit `''` (frontend tolereert). `rol`/`ondernemingsleider` hebben geen kolom.
- `get_offertes`: ~half van de offertes mist `bedrijf_id`; de fallback matcht op `bedrijf_naam`. `draft`
  wordt gedropt; status is de ruwe PandaDoc-lifecycle (plain string, geen Make-encoding).
- Schrijfacties (facturatie, bedrijfsgegevens, voorkeuren) zijn **nog niet** verlegd — die komen in P4 via
  `portal_overrides` (audit R1), zodat een ClickUp→D1-sync ze niet overschrijft.
