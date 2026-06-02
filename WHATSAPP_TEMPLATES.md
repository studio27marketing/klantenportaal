# Studio 27 — WhatsApp Content-templates (Twilio)

> Aanmaken in **Twilio Console → Messaging → Content Template Builder** (of Content API). Taal **`nl`**, categorie **UTILITY** (transactioneel = betere aflevering, geen marketing-opt-in nodig — alle vijf zijn opvolging op een lopend project, dus UTILITY is correct en verdedigbaar). Na goedkeuring door Meta krijg je per template een **Content SID (`HX…`)** — geef me die vijf SID's en ik draad ze in de dispatcher + reminder-cron en zet alles in één keer live.
>
> Variabelen zijn `{{1}}`, `{{2}}`, … — de dispatcher vult ze via `ContentVariables` (JSON). De URL-knop wijst naar het portaal (statisch, werkt altijd). Toon (Studio 27): warm, Vlaams, je/jouw, speels maar zakelijk.

---

## 1. `s27_feedback_herinnering`  — review/goedkeuring herinneren
- **Categorie:** UTILITY · **Taal:** nl · **Type:** Call to action (1 URL-knop)
- **Body:**
  ```
  Hey {{1}} 👋 Bij Studio 27 staat *{{2}}* klaar voor jouw review. Geef je akkoord of je feedback via je portaal — dan gaan wij meteen verder. 🙌
  ```
- **Knop (URL):** tekst `Bekijk in portaal` → `https://www.studio27.be/klantenportaal`
- **Variabelen:** `{{1}}` = voornaam · `{{2}}` = projectnaam
- **Voorbeeld:** Hey Jan 👋 Bij Studio 27 staat *Bedrijfsvideo employer branding* klaar voor jouw review…

## 2. `s27_plan_moment`  — zelf een sessie/meeting inplannen
- **Categorie:** UTILITY · **Taal:** nl · **Type:** Call to action (1 URL-knop)
- **Body:**
  ```
  Hey {{1}}, voor *{{2}}* kan je nu zelf een moment kiezen met ons team. Geef je voorkeur door in je Studio 27-portaal — wij bevestigen met een agenda-uitnodiging. 📅
  ```
- **Knop (URL):** tekst `Plan je moment` → `https://www.studio27.be/klantenportaal`
- **Variabelen:** `{{1}}` = voornaam · `{{2}}` = sessie/taaknaam (bv. "Strategiesessie groei Q3")

## 3. `s27_oplevering_klaar`  — nieuwe oplevering staat online
- **Categorie:** UTILITY · **Taal:** nl · **Type:** Call to action (1 URL-knop)
- **Body:**
  ```
  Goed nieuws {{1}}! ✨ We hebben iets nieuws opgeleverd voor *{{2}}*. Bekijk het in je Studio 27-portaal en laat ons weten wat je ervan vindt.
  ```
- **Knop (URL):** tekst `Bekijk oplevering` → `https://www.studio27.be/klantenportaal`
- **Variabelen:** `{{1}}` = voornaam · `{{2}}` = projectnaam

## 4. `s27_meeting_bevestigd`  — afspraak bevestigd
- **Categorie:** UTILITY · **Taal:** nl · **Type:** Tekst (geen knop nodig)
- **Body:**
  ```
  Top {{1}}, je afspraak voor *{{2}}* staat genoteerd op {{3}}. Je krijgt ook een agenda-uitnodiging in je mailbox. Tot dan! 👋
  ```
- **Variabelen:** `{{1}}` = voornaam · `{{2}}` = onderwerp · `{{3}}` = datum + uur (bv. "di 9 juni om 14:00")

## 5. `s27_portaal_bericht`  — algemene portaal-melding / nieuw teambericht
- **Categorie:** UTILITY · **Taal:** nl · **Type:** Call to action (1 URL-knop)
- **Body:**
  ```
  Hey {{1}}, er is een update voor jou in je Studio 27-portaal: {{2}}. Bekijk het wanneer het jou past.
  ```
- **Knop (URL):** tekst `Open portaal` → `https://www.studio27.be/klantenportaal`
- **Variabelen:** `{{1}}` = voornaam · `{{2}}` = korte omschrijving (bv. "een nieuw bericht van Ilke")

---

## (Optioneel, later) `s27_opleiding_upsell` — MARKETING
Upsell mag niet als UTILITY (het is promotioneel) → aparte template, categorie **MARKETING**, en enkel sturen naar wie marketing-opt-in heeft. Body-voorstel:
```
Hey {{1}}, je hebt je opleidingstraject bij Studio 27 (bijna) afgerond 🎓. Zin in een volgende stap? We zetten graag een nieuwe sessie of workshop voor je klaar. Interesse?
```
Knop: `Bekijk opleidingen` → portaal. **Niet** nodig voor de eerste go-live.

---

## Wat ik doe zodra ik de 5 Content SID's heb
1. **Dispatcher (6002032) uitbreiden** met een Twilio-verzendtak: per `kind` de juiste template-SID + `ContentVariables` (voornaam/projectnaam/…), verzonden naar `to_gsm` via de Twilio-connectie `7860123`. E-mail-tak parallel (zelfde inhoud, eerst test naar `vincent@studio27.be`).
2. **Reminder-cron** `[PORTAL v2] feedback-reminder` (elke 2-3 dagen): ClickUp-query op taken `status=doorgestuurd` + `Feedback-status=Wachtend op klant` → per taak de contactpersoon → dispatcher met `kind=feedback_herinnering`. Stopt automatisch zodra goedgekeurd; respecteert "Geen" in Notificatie-voorkeur.
3. **Triggers** voor `plan_moment` / `oplevering_klaar` koppelen aan de bestaande status-events.
4. **Alles in één keer naar productie** — na jouw bevestiging.

> Default-kanaal blijft **WhatsApp** (zoals afgesproken); "Beide" stuurt ook e-mail; "E-mail" enkel mail; "Geen" stuurt niets. Per contactpersoon instelbaar via het veld **Notificatie-voorkeur** (`ad6f0803-…`).
