# Ochtendoverzicht — Auth v2 (A + B)

**Uitgevoerd in de nacht van 31 mei. Alles staat op branch `auth-v2-integration` — lokaal, NIET gepusht, productie volledig ongemoeid** (de loader serveert `@main`; daar is niets veranderd).

Bekijken/testen:
```
cd klantendashboard
git checkout auth-v2-integration   # als je nog niet op deze branch staat
git show --stat HEAD               # wat er gewijzigd is
```

---

## ✅ A — Firebase-login + gateway in de widget (code klaar)

In `dashboard.js` zit nu een **`AUTH_V2`-vlag** (`?auth=v2` in de URL, of `localStorage.s27_auth_v2='1'`). Staat die aan, dan:
- login = **Firebase** (Google + wachtwoordloze magic link + **verplichte TOTP-2FA**), UI in portaalstijl in het bestaande loginscherm;
- elke `api()`-call loopt via de **gateway** met je Firebase-token (de gateway zet `bedrijf_id` server-side → niet vervalsbaar);
- uitloggen = Firebase-signout.

Staat de vlag **uit** (standaard), dan verandert er **niets** — je huidige portaal met de gedeelde toegangscode werkt exact zoals nu. De integratie is volledig additief en geïsoleerd.

Nieuwe bestanden: `auth.js` (de bewezen loginmodule) en `portal-v2-local.html` (lokale testpagina voor de geïntegreerde widget).

### A testen (≈5 min, lokaal — niets aan productie):
```
cd klantendashboard
python3 -m http.server 8000
```
→ open **http://localhost:8000/portal-v2-local.html**
→ inloggen (Google of e-maillink) → 2FA → je hoort het **echte dashboard van bedrijf `86c9yv1wy`** te zien (je testaccount is al gekoppeld).

> **Niet door mij getest**: de login zelf vereist jouw interactie + 2FA-app, dat kan ik niet automatisch. Maar exact diezelfde auth-flow is gisteren al bewezen via `auth-v2-test.html`, en de gateway + dashboard-call zijn end-to-end getest. Het risico zit dus enkel in de *bedrading* in `dashboard.js`, die ik syntactisch heb gevalideerd. Zie je in de console iets raars, stuur het door.

---

## ✅ B — Beheer-endpoint om klanten te koppelen (gebouwd + live, inert)

Op de gateway staat nu **`POST /admin/link`**: gegeven een admin-secret + `{email, bedrijf_id}` zet het de `bedrijf_id`-claim op dat account. Daarmee kan Ilke straks zelf klanten koppelen i.p.v. handmatig Cloud Shell.

Nu antwoordt het `501 admin_not_configured` — het mist een **Firebase service-account**. Dat is het enige wat ik niet kon doen (geen toegang tot je GCP-console).

### B activeren — jouw checklist (≈5 min):
1. GCP-console → **IAM & Admin → Service Accounts → Create** (project `studio27-cloud`), naam bv. `portal-admin`.
2. Rol: **Firebase Authentication Admin**.
3. Bij de service-account → **Keys → Add key → JSON** → downloaden. Daarin staan `client_email` en `private_key`.
4. Cloudflare → Worker `s27-portal-gateway` → **Settings → Variables and Secrets** → 3 **secrets** toevoegen:
   - `ADMIN_SECRET` — zelf kiezen (`openssl rand -hex 32`)
   - `SA_CLIENT_EMAIL` — de `client_email` uit de JSON
   - `SA_PRIVATE_KEY` — de volledige `private_key` uit de JSON (inclusief `-----BEGIN PRIVATE KEY-----`)
5. Testen:
   ```
   curl -X POST https://s27-portal-gateway.studio27marketing.workers.dev/admin/link \
     -H "X-Admin-Secret: <jouw ADMIN_SECRET>" -H "Content-Type: application/json" \
     -d '{"email":"klant@bedrijf.be","bedrijf_id":"86c9yv1wy"}'
   ```

> **Tot B geactiveerd is** blijft het Cloud Shell-commando (identitytoolkit `accounts:update`) je werkende manier om accounts te koppelen — je zit dus nergens vast.

---

## Nog te doen — later, samen (de cutover):
1. A testen → branch mergen naar `main`.
2. Productie omschakelen: de `AUTH_V2`-vlag standaard aanzetten (of `?auth=v2` op de Webflow-pagina).
3. In Make: `X-Gateway-Secret` vereisen in de PORTAL-scenario's (sluit de directe omzeiling = P0-1 helemaal dicht) + `ALLOWED_ORIGINS` in de Worker terug naar **enkel** studio27.be (localhost eruit).
4. Klanten migreren: accounts aanmaken/uitnodigen + koppelen, oude gedeelde code uitfaseren.

## Losse punten
- ⚠️ **Roteer je Cloudflare API-token** (het stond in de chat). De Worker draait; voor een volgende deploy vraag ik je gewoon een vers token.
- Het `GATEWAY_SECRET` staat lokaal in `gateway/.dev.vars` (gitignored) en als secret in Cloudflare — niet in git.
- Niets gepusht, niets aan productie gewijzigd.
