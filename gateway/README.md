# Auth Gateway — deploy & config

De Cloudflare Worker die vóór de Make-webhooks staat. Verifieert het Firebase ID-token, voegt een **server-vertrouwd `bedrijf_id`** toe en stuurt door naar Make. Zie [../AUTH_UPGRADE_PLAN.md](../AUTH_UPGRADE_PLAN.md) §5.

> **Status:** code klaar, nog niet gedeployed/getest. De end-to-end test doen we samen zodra Firebase (studio27-cloud) live staat.

---

## Wat de gateway doet (contract)

- **Widget roept aan:** `POST https://<worker-url>/<endpoint>` met header `Authorization: Bearer <firebase-id-token>` en de gewone JSON-body.
  - `<endpoint>` = een sleutel uit `MAKE_ENDPOINTS` in [worker.js](worker.js), bv. `/dashboard`, `/projectDetailV2`, `/uploadAlg`.
- **Gateway → Make:** dezelfde body, maar met `bedrijf_id` overschreven door de waarde uit het geverifieerde token + header `X-Gateway-Secret`.
- **Responses:** `401` = token ontbreekt/ongeldig (widget logt automatisch uit), `403` = account niet aan bedrijf gekoppeld of foute origin, `429` = rate limit, `404` = onbekend endpoint.

---

## Deploy — Optie A: Cloudflare-dashboard (geen tools nodig)

1. Maak een **gratis Cloudflare-account** (één account voor heel Studio 27).
2. **Workers & Pages → Create → Worker** → geef hem een naam (bv. `s27-portal-gateway`) → **Deploy** (de hello-world).
3. **Edit code** → verwijder alles → plak de volledige inhoud van [worker.js](worker.js) → **Deploy**.
4. **Settings → Variables and Secrets**, voeg toe:
   | Naam | Type | Waarde |
   |---|---|---|
   | `PROJECT_ID` | Text | `studio27-cloud` |
   | `ALLOWED_ORIGINS` | Text | `https://www.studio27.be,https://studio27.be` |
   | `GATEWAY_SECRET` | **Secret** | genereer met `openssl rand -hex 32` (zelfde waarde gebruiken in Make) |
5. **(Aanbevolen) Rate limiting aanzetten:** Storage & Databases → **KV → Create namespace** (bv. `s27-gateway-kv`) → terug in de Worker: Settings → Bindings → **Add → KV namespace**, variabele-naam **exact** `KV`, koppel de namespace.
6. **(Aanbevolen) Custom domain:** Settings → Domains & Routes → voeg `api.studio27.be` toe (i.p.v. de `*.workers.dev`-URL). Netter en stabieler voor CORS/cookies later.

Noteer de uiteindelijke Worker-URL — die hebben we nodig in de widget (taak #7).

## Deploy — Optie B: Wrangler CLI

```bash
cd gateway
npx wrangler deploy
npx wrangler secret put GATEWAY_SECRET     # plak je openssl-secret
# KV: npx wrangler kv namespace create KV  → id in wrangler.toml plakken
```
`PROJECT_ID` en `ALLOWED_ORIGINS` staan al in [wrangler.toml](wrangler.toml).

---

## Make-kant (taak #4)

Elke scenario die via de gateway wordt aangeroepen krijgt als **eerste stap** een filter:

- `{{1.headers.x-gateway-secret}}` **==** de `GATEWAY_SECRET` → ga door.
- anders → Webhook Response `403 {"ok":false,"error":"forbidden"}`.

Vanaf dan vertrouwt Make `bedrijf_id` alleen omdat het van de gateway komt; de oude per-bedrijf `session_token`-check vervalt. (Ik bouw dit via de Make-koppeling.)

---

## Testplan

| # | Test | Verwacht | Wanneer |
|---|---|---|---|
| 1 | `OPTIONS /dashboard` met Origin `https://www.studio27.be` | `204` + CORS-headers | nu (na deploy) |
| 2 | `POST /dashboard` zónder Authorization | `401 missing_token` | nu |
| 3 | `POST /dashboard` met onzin-token | `401 invalid_token` | nu |
| 4 | `POST /dashboard` met geldig token zónder `bedrijf_id`-claim | `403 no_company_link` | na Firebase-setup |
| 5 | `POST /dashboard` met geldig, gekoppeld token | `200` + alleen dat bedrijf z'n data | samen, end-to-end |

Tests 1–3 kun je zelf met `curl` of de browser-console doen zodra de Worker live staat; 4–5 doen we samen na Firebase + de Make-aanpassingen.

---

## Veiligheidsnotities

- `GATEWAY_SECRET` is een **secret** — niet in code, niet in git. Bewaar 'm in Cloudflare (Secret) en in de Make-connectie/variabele. Roteren = nieuwe waarde op beide plekken.
- De gateway is de enige plek die `bedrijf_id` mag bepalen. Make mag dat veld nooit meer uit de browser-body vertrouwen.
- Token-verificatie controleert handtekening + `iss` + `aud` (`studio27-cloud`) + `exp`. Verkeerd `PROJECT_ID` = alles faalt met `401` (veilig).
