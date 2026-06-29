# Portaalstructuur audit - 2026-06-25

## Live uitgevoerd

1. CRMDB structuur uitgebreid voor productie en cross-module relaties:
   - `tasks`: `contact_id`, `candidate_id`, `vacature_id`, `wedding_id`, archiefvelden, `completed_at`, `last_activity_at`.
   - `projects`: dezelfde relatie- en archiefvelden.
   - `weddings`: `project_id` en archiefvelden.
   - Nieuwe tabellen: `entity_links`, `archive_batches`, `project_archives`.
   - Extra indexen op status, deadline, branch, project, klant, contact, planning, vacatures en bruidsparen.

2. HRDB structuur uitgebreid:
   - `candidates.vacature_id`.
   - Nieuwe tabellen: `hr_tasks`, `hr_entity_links`.
   - Extra indexen op kandidaatstatus, vacature, mails, documenten, onboarding en HR-taken.

3. Productiedata verrijkt:
   - Taken met klantlink: 190 van 219.
   - Taken met contactlink na backfill: 184 van 219.
   - Projecten met klantlink: 93 van 107.
   - Projecten met contactlink na backfill: 92 van 107.
   - `entity_links`: 1104 relationele links.

4. Backend geoptimaliseerd:
   - `prodData` laadt standaard alleen actieve taken met `limit`, `offset` en `paging`.
   - `prodTaskDelete` is nu soft-archive in plaats van harde delete.
   - Nieuwe en aangepaste taken synchroniseren `task_assignees`.
   - Taakupdates leggen relaties vast naar klant, contact, offerte, bruidspaar, kandidaat en vacature.

5. Menubalk en navigatie:
   - `global-search.js` linkt niet meer naar oude `.dc.html`-bestanden, maar naar `/crm/`, `/hr/`, `/finance/`, `/productie/`.
   - Nieuwe gedeelde shell-bridge: `portaal/shared/portal-shell.js`.
   - De shell-bridge bewaart terugkeercontext bij modulewissels en personaliseert `team-chat` en `agenda-panel` met de ingelogde gebruiker.

## Live deploys

1. Gateway Worker:
   - Worker: `s27-portal-gateway-v2`.
   - Version ID: `8242b946-9866-4e39-ad89-0d2cf503b12c`.
   - URL: https://s27-portal-gateway-v2.studio27marketing.workers.dev

2. Werkplek Pages:
   - Project: `s27-werkplek`.
   - Laatste preview: https://894b0bd1.s27-werkplek.pages.dev
   - Productiebranch: `main`.

## Ontbrekende gegevens

1. Bruidsparen:
   - `weddings` is nog leeg.
   - Nodig: bron waar partner A, partner B, trouwdatum, locatie, gasten, pakket, fotograaf, voorschot en status staan.
   - Beste bron vermoedelijk: 27 Moments offertes of Webflow intake, maar de exacte veldmapping ontbreekt nog.

2. Productietaken zonder contact:
   - 35 taken hebben nog geen `contact_id`.
   - Oorzaak: geen offerte-contact en geen hoofdcontact op het gekoppelde bedrijf.
   - Nodig: hoofdcontacten aanvullen bij de betreffende bedrijven of taakcontact expliciet kiezen.

3. Projecten zonder contact:
   - 15 projecten hebben nog geen `contact_id`.
   - Zelfde oorzaak als hierboven.

4. Vacatures:
   - D1-tabel `vacatures` bestaat, maar is leeg.
   - De live HR-vacatureflows gebruiken Webflow als bron.
   - Beslissing nodig: Webflow blijft bron met D1 als cache, of D1 wordt de echte bron.

5. Kandidaten naar vacatures:
   - 35 kandidaten staan in HRDB.
   - 0 kandidaten hebben `vacature_id`, omdat er nog geen genormaliseerde vacaturelijst in D1 staat.

6. HR-taken:
   - `hr_tasks` bestaat nu, maar is leeg.
   - Nodig: bepalen welke HR-acties als taak moeten ontstaan, bijvoorbeeld screening, gesprek plannen, case sturen, referentie checken, contract.

7. Task assignees:
   - `task_assignees` bestaat en wordt vanaf nu gevuld bij taakupdates.
   - Huidige live taken hebben geen assignees omdat `tasks.people` in de live productiedata leeg is.

8. Notificaties en agenda-events:
   - Tabellen bestaan, maar zijn nog niet breed gevuld.
   - De menubalk kan ze tonen, maar de centrale notificatiebron moet nog geconsolideerd worden.

## Template-data en risico's

1. `portaal/productie/index.html` bevat nog demo-data in `buildData()`.
   - Live auth overschrijft dit met `prodData`, maar preview en fallback tonen nog voorbeeldklanten.
   - Dit is aanvaardbaar voor preview, maar niet als bron voor echte data.

2. Productietemplates staan nog hardcoded in `TASK_TEMPLATES` in `teamportaal.mjs`.
   - De tabellen `task_templates` en `template_subtasks` bestaan, maar taakgeneratie leest die nog niet.
   - Volgende stap: templates uit D1 laden en alleen fallbacken naar hardcoded defaults.

3. Vacaturetemplates komen uit Webflow.
   - Foute Webflow-templatevelden kunnen niet alleen via D1 hersteld worden.

4. Projectdocumentatie bevat historische credentials of sleutelwaarden in platte tekst.
   - Deze waarden niet hergebruiken.
   - Roteer alles wat effectief een API-key, token, secret of webhook-secret is.

## Bronnen

1. Cloudflare D1 foreign keys:
   - https://developers.cloudflare.com/d1/sql-api/foreign-keys/

2. Cloudflare D1 migrations:
   - https://developers.cloudflare.com/d1/reference/migrations/

3. Cloudflare D1 limits:
   - https://developers.cloudflare.com/d1/platform/limits/

4. Cloudflare D1 indexes:
   - https://developers.cloudflare.com/d1/best-practices/use-indexes/
