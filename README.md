# Studio 27 platform

Eén centrale repo (de bron van waarheid) voor het volledige Studio 27 platform: alle
interne en externe portalen plus de gedeelde edge-worker. Gebouwd op de Director-stack:
Claude (logica), GitHub (versiebeheer en CI/CD), Cloudflare (Workers, D1, R2) en
Firebase (authenticatie).

## Mappenstructuur en wat live waar draait

| Map | App | Cloudflare-project | Domein |
| --- | --- | --- | --- |
| `portaal/` | Werkplek-hub (27CRM, 27Productie, 27HR, 27Finance) | Pages `s27-werkplek` | hub.studio27.be |
| `team/` | Teamportaal (medewerkers) | Pages `s27-teamportaal` | team.studio27.be |
| `v2/` | Klantenportaal (frontend, geserveerd door de worker) | via de worker (`gateway-v2`) | portaal.studio27.be |
| `v4/` | Klantenportaal v4-redesign | (in ontwikkeling) | |
| `hr/` | HR-portaal | Pages `s27-hr` | hr.studio27.be |
| `monitor/` | Monitoring-portaal | Pages `s27-monitor` | monitor.studio27.be |
| `gateway-v2/` | Gedeelde edge-worker (API, D1, R2, KV, cron) | Worker `s27-portal-gateway-v2` | s27-portal-gateway-v2.studio27marketing.workers.dev |
| `gateway/`, `team-gateway/` | Oudere worker-versies (legacy) | | |

## Backend (gateway-v2)

De worker is volledig standalone op Cloudflare: geen ClickUp-afhankelijkheid meer.

- **D1** `s27-crm-db` (binding `CRMDB`): CRM, Finance en Productie (bedrijven, contacten,
  offertes, projecten, taken, facturen, en de centrale `files`-tabel).
- **D1** `s27-hr-db` (binding `HRDB`): HR (kandidaten, dossiers, onboarding).
- **R2** `s27-portal-files` (binding `R2`): bestandsopslag (o.a. de bestandenmodule en
  video/feedback-bijlagen).
- **KV** (binding `KV`): rate-limiting, caches en lichte state.
- Secrets staan NOOIT in de code, maar als Cloudflare-secrets (`wrangler secret put ...`)
  en lokaal in `gateway-v2/.dev.vars` (niet in git).

## Werkwijze (Director-flow)

1. Werk per feature of taak in een eigen **branch** (meerdere mensen of AI-chats parallel,
   zonder elkaar te raken).
2. Open een **pull request**. Cloudflare Pages bouwt automatisch een **test-URL** per PR.
3. Controleer op de test-URL, dan **merge naar de productiebranch** = automatisch live.
4. De worker wordt gedeployed met `wrangler deploy` (of via een GitHub Action bij merge).

## Lokaal de worker deployen (tot de CI/CD-koppeling actief is)

```
cd gateway-v2
npx wrangler deploy
```

## Belangrijk

- Geheimen horen niet in deze repo. Zie `.gitignore`. Wat ooit per ongeluk gelekt is,
  moet geroteerd worden.
- De `files`-tabel in `CRMDB` is de centrale bestandenindex (bestandenmodule).
