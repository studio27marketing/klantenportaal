# Auth Upgrade Plan — Firebase Auth + Cloudflare Worker gateway

**Datum:** 2026-05-31
**Doel:** Echte, veilige toegang tot het klantenportaal met 2-stapsverificatie.
**Past op:** bestaande stack — widget op GitHub/CDN → Webflow `/klanten` → Make-webhooks → ClickUp.
**Lost op (uit [SECURITY_REVIEW.md](SECURITY_REVIEW.md)):** P0-1 (server vertrouwt client / IDOR), P0-2 (eeuwig token), P1-1 (geen rate limiting), P1-3 (CORS open). Verzacht P2-4 (token in localStorage).

---

## ✅ Vastgelegde keuzes (2026-05-31)

1. **Niet-Google login:** wachtwoordloze **magic link / e-mailcode**.
2. **2FA:** **verplicht voor iedereen** (TOTP bij eerste login).
3. **Accounts:** **alleen admin nodigt uit** (Ilke/Vincent koppelt aan bedrijf).
4. **Personen per klant:** **meerdere** toegestaan, elk met eigen 2FA.

> **Login-UX gevolg:** eerste keer = magic link openen + TOTP instellen. Daarna blijft de klant ingelogd (Firebase-sessie); link + code zijn alleen nodig bij de eerste login en periodieke herauth — **niet elk bezoek**.

---

## 0. Waarom dit, en niet "gewoon 2FA erop"

Vandaag log je in met **bedrijfsnaam + één gedeelde toegangscode per bedrijf** ([dashboard.html:43](dashboard.html#L43)). De Make-backend controleert die code, maar **vertrouwt daarna de client volledig**: de browser stuurt zelf `bedrijf_id` mee ([dashboard.js:393](dashboard.js#L393)) en de server gelooft dat blind. Dat is P0-1 in je review — de enige écht kritieke zorg.

> 2FA bovenop dit model is lippenstift: je beschermt een gedeeld geheim terwijl de deur erachter sowieso openstaat.

Echte veiligheid = **(1) per-persoon identiteit, (2) een backend die die identiteit verifieert, en pas dan (3) 2FA als tweede factor.** Dit plan levert alle drie tegelijk.

---

## 1. Doelarchitectuur

```
┌─────────────────────────── Browser (Webflow /klanten) ───────────────────────────┐
│  Widget (dashboard.js)  +  Firebase Auth SDK                                       │
│     1. Klant logt in: Google-knop  OF  e-mail (+ wachtwoord/magic link)            │
│     2. 2e factor: 6-cijfer TOTP-code (authenticator-app)                           │
│     3. Firebase geeft een ondertekende ID-token (JWT, 1u geldig)                   │
└───────────────┬───────────────────────────────────────────────────────────────────┘
                │  elke API-call:  Authorization: Bearer <JWT>
                ▼
┌─────────────────────── Cloudflare Worker = de POORT ───────────────────────────────┐
│  a. CORS/origin-allowlist (alleen studio27.be)                                     │
│  b. Rate limiting (per IP + per gebruiker)                                         │
│  c. Verifieert JWT-handtekening tegen Firebase (RS256 + issuer/audience check)     │
│  d. Leest bedrijf_id uit de GEVERIFIEERDE claims  ← niet uit de body!              │
│  e. Forward naar de juiste Make-webhook + header X-Gateway-Secret                  │
└───────────────┬─────────────────────────────────────────────────────────────────────┘
                │  server-to-server, met gedeeld geheim
                ▼
┌──────────────── Make-webhooks (jouw 30+ scenarios) ────────────────────────────────┐
│  Accepteren ALLEEN calls met geldig X-Gateway-Secret (anders 403).                 │
│  Vertrouwen bedrijf_id ALLEEN omdat het van de poort komt.  → P0-1 dicht.          │
└───────────────┬─────────────────────────────────────────────────────────────────────┘
                ▼
            ClickUp (Bedrijven-lijst, projecten, deliverables…)
```

**Kernprincipe:** de widget bewijst niets meer met een gedeeld geheim. De **Worker** is het beveiligingshart; Make vertrouwt alleen de Worker.

---

## 2. Identiteitsmodel: van bedrijfscode → accounts per persoon

| Vandaag | Straks |
|---|---|
| 1 gedeelde code per bedrijf | 1 account per persoon (e-mailgebaseerd) |
| Iedereen deelt dezelfde toegang | Per persoon intrekbaar, met 2FA per persoon |
| `bedrijf_id` door client gestuurd | `bedrijf_id` als **custom claim** in het account |
| Geen audit (wie deed wat) | Per gebruiker herleidbaar |

- Eén bedrijf kan **meerdere gebruikers** hebben (bv. zaakvoerder + marketing-medewerker).
- De koppeling **gebruiker → bedrijf_id** zit als Firebase *custom claim* op het account, gezet bij uitnodiging.
- Custom claims zet je met de Firebase Admin-rechten (service account). Praktisch: een klein **admin-scenario in Make** (of mini Cloud Function) dat de Identity-API aanroept met `{ uid, bedrijf_id }`. Dit draait alleen wanneer Ilke iemand uitnodigt — niet in de hot path.

---

## 3. Login-methodes — dit lost je "wisselend Google" op

Omdat je klanten **niet allemaal** een Google-account hebben, zet je twee methodes naast elkaar, beide via Firebase:

1. **Inloggen met Google** — voor wie Google/Workspace heeft (1 klik).
2. **E-mail-login** — voor de rest: **wachtwoordloze magic link / e-mailcode** (✅ gekozen — geen vergeten-wachtwoord-support, past bij het doel van minder support-uren).

Zelfde e-mail via Google én e-mail = automatisch hetzelfde account (account-linking aanzetten in Firebase: "one account per email address").

---

## 4. 2-stapsverificatie (MFA)

**Status: ✅ verplicht voor iedereen.**

- **Methode:** TOTP via authenticator-app (Google Authenticator, Authy, 1Password…). Open standaard, geen sms-kosten, werkt voor iedereen.
- **Enrollment:** bij eerste login → verplicht TOTP instellen (Firebase toont de QR/secret) → daarna bij elke login de 6-cijfer-code.
- **sms** als optionele backup-factor; **passkeys** als toekomstige upgrade.
- ⚠️ **Belangrijk:** Firebase MFA (TOTP/sms) vereist het aanzetten van **Identity Platform** in je Google Cloud-project (Firebase Auth "with Identity Platform"). Er is een ruime gratis tier, maar je moet het expliciet activeren én de actuele prijs checken vóór je live gaat met alle klanten.

---

## 5. De Cloudflare Worker (het beveiligingshart)

Eén Worker, gratis tier (ruim 100k requests/dag). Vervangt de directe browser→Make-calls. Per request:

1. **Origin-check** — alleen `https://www.studio27.be` / `https://studio27.be` (+ localhost voor dev).
2. **Rate limiting** — bv. 10/min per IP op gevoelige acties, ruimer op leesacties (KV of Durable Object als teller).
3. **JWT-verificatie** — Firebase ID-tokens zijn RS256-ondertekend. Worker haalt Google's publieke sleutels (JWKS, gecached), controleert handtekening + `iss = https://securetoken.google.com/<project-id>` + `aud = <project-id>` + `exp`. Bestaande library: `firebase-auth-cloudflare-workers`.
4. **bedrijf_id uit claims** — niet uit de request-body. Dit is wat P0-1 echt dicht maakt.
5. **Forward naar Make** — mapt het pad naar de juiste webhook uit [dashboard.js:7-30](dashboard.js#L7), voegt `X-Gateway-Secret` toe, en het geverifieerde `bedrijf_id`.
6. **Logging** — mismatch/afwijzing loggen (gratis observability die je review (P0-1 bonus) al vroeg).

> Optionele hardening (Fase 7): de Worker kan een **Firebase session-cookie** (httpOnly, `Domain=.studio27.be`) zetten i.p.v. tokens in localStorage → fixt P2-4 op cookie-niveau. Niet nodig voor v1.

---

## 6. Wijzigingen in Make

- **Elk scenario:** eerste module = filter `{{headers.x-gateway-secret}} == <SECRET>`, anders WebhookRespond 403. Daarmee kan niemand de webhooks nog direct aanroepen — alleen de poort.
- **`bedrijf_id`** komt voortaan van de gateway (vertrouwd), niet uit de body. De per-bedrijf `session_token`-check (de TST-DEMO-hardcode in de v2-scenarios) **vervalt** — identiteit is al geverifieerd vóór Make.
- **Login-scenario** (`ENDPOINTS.login`, Make `gk7fxu…`) wordt **overbodig**: inloggen gebeurt bij Firebase. Wel nieuw: een klein **invite/claim-scenario** (§2) om `bedrijf_id` als claim te zetten.
- ClickUp-Bedrijvenlijst blijft de bron voor `bedrijf_id`; alleen de "Klantportaal token"-velden zijn straks niet meer de sleutel tot toegang.

---

## 7. Wijzigingen in de widget (concreet, met regelnummers)

1. **Firebase SDK laden** — modular Web SDK via gstatic-CDN, dynamisch geïmporteerd in [dashboard.js](dashboard.js) (of als `<script type=module>` in [dashboard.html](dashboard.html)). Config (apiKey, authDomain, projectId) is **publiek by design** — geen secret.
2. **`handleLogin()` ([dashboard.js:313](dashboard.js#L313)) vervangen** door Firebase sign-in: Google-knop + e-mailveld → `signInWithPopup` / `signInWithEmailAndPassword` (of e-mail-link) → MFA-challenge afhandelen. De huidige bedrijfsnaam+token-velden ([dashboard.html:39-44](dashboard.html#L39)) verdwijnen.
3. **Sessie ([dashboard.js:251-286](dashboard.js#L251))** — geen eigen `session_token` meer opslaan. Firebase beheert de sessie; bij elke call haal je een vers ID-token via `await auth.currentUser.getIdToken()`. `loadSession/saveSession/clearSession` worden dunne wrappers rond `onAuthStateChanged` + logout.
4. **`api()` ([dashboard.js:179](dashboard.js#L179))** — richt op de **Worker-URL** i.p.v. direct Make, en voeg header toe:
   ```js
   headers: { 'Content-Type':'application/json',
              'Authorization': 'Bearer ' + await auth.currentUser.getIdToken() }
   ```
   `bedrijf_id`/`session_token` uit de payloads mogen blijven staan (worden genegeerd) of opgeruimd worden — de gateway is de bron van waarheid.
5. **401-handler (`handleSessionExpired` [dashboard.js:198](dashboard.js#L198))** blijft, maar triggert nu Firebase-herauth i.p.v. de oude login.
6. **Demo-mode** ([dashboard.js](dashboard.js), `state.demoMode`) behouden voor mock-data, maar zó dat demo nóóit langs de gateway echte data kan halen.
7. **Rollout-veilig:** bouw dit achter een vlag (`?auth=v2`) of op een **aparte Webflow-testpagina**, zodat het live portaal blijft werken tijdens de migratie.

---

## 8. GDPR / dataresidentie

- Firebase Auth / Identity Platform: kies waar mogelijk een **EU-regio**; verwerk minimale PII (alleen e-mail + naam).
- Google's verwerkersovereenkomst (DPA) zit in de Google Cloud-voorwaarden — vink/aanvaard die op je Cloud-account.
- Cloudflare: Worker verwerkt alleen het token in-transit; geen opslag van klantdata.

---

## 9. Volgorde van uitvoering (fasen)

| Fase | Wat | Resultaat |
|---|---|---|
| **0. Acuut** | Gedeeld `X-Gateway-Secret` + origin-check in Make (zonder Firebase) | P0-1 deels dicht terwijl je de rest bouwt |
| **1. GCP/Firebase** | Project koppelen, Auth aan, providers Google + e-mail, Identity Platform aan voor MFA, 1 testgebruiker | Werkende login + 2FA in isolatie |
| **2. Worker** | JWT-verificatie + rate limit + CORS + forward naar 1 endpoint (`dashboard`) als pilot | De poort werkt end-to-end voor 1 call |
| **3. Make** | Gateway-secret-check in alle scenarios, `bedrijf_id` uit gateway | Backend vertrouwt alleen de poort |
| **4. Widget** | Firebase SDK + nieuwe login + `api()` via gateway, achter `?auth=v2` | Volledige flow op testpagina |
| **5. MFA verplicht** | TOTP-enrollment afdwingen | Echte 2-stapsverificatie live |
| **6. Migratie** | Klantaccounts aanmaken/uitnodigen, oude bedrijfscode uitfaseren | Alle klanten over |
| **7. Hardening** | SRI + versie-pinning (P3-2), CSP (P2-4), session-cookie, monitoring | Productie-rijp |

---

## 10. Beslissingen — ✅ gemaakt (zie "Vastgelegde keuzes" bovenaan)

Magic link (wachtwoordloos) · 2FA verplicht · admin-only invite · meerdere personen per klant. Het ontwerp is daarmee beslissingscompleet; de bouw kan starten.

## 11. Toegang/info die ik nodig heb om te bouwen

- Je **Google Cloud project-id** (Firebase leeft daarin; Google AI Studio is hier níet relevant).
- Bereidheid een (gratis) **Cloudflare-account** te gebruiken voor de Worker.
- Wie de **Make-scenarios** mag aanpassen (jij/Ilke) — of dat ik het via de Make MCP voorbereid.

---

## 12. Wat we expliciet NIET doen

- Geen zelfgeschreven JWT-/crypto-code in de widget.
- Geen 2FA bouwen vóór de gateway + P0-1-fix er zijn.
- De gedeelde bedrijfscode niet "verbeteren" — **vervangen**.
- Geen sms-only MFA (kost geld + minder veilig dan TOTP/passkeys).
