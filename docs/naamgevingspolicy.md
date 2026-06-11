# Naamgevingspolicy — ClickUp-taken (klant-zichtbaar)

**Doel:** klanten zien in het portaal altijd nette, consistente namen — of een taak nu door
een teamlid of door AI is aangemaakt. (Masterplan WS-6, sessie Vincent × Ilke 11-06-2026.)

## Het vaste format

**`{Wat} {onderwerp}` — kort, Nederlands, geen interne codes.**

| Discipline | Voorbeeld hoofdtaak | Voorbeeld subtaken |
|---|---|---|
| Video | `Bedrijfsvideo — najaarscampagne` | `Preproductie — draaiboek` · `Shoot 1 — kantoor` · `Montage bedrijfsvideo` · `Nabewerking foto's` |
| Webdesign | `Nieuwe website` / `Onepager` | `Ontwerp — homepage` · `Uitwerking — alle pagina's` |
| Branding | `Huisstijl-refresh` | `Logo — eerste voorstellen` |
| Social | `Socials — {maand}` | (recurring onderdelen per maand) |
| Support | `🛠️ {onderwerp ticket}` | — (automatisch via het portaal) |

## Regels

1. **Geen interne markeringen** in klant-zichtbare taken: geen `INTERN:`, geen `[codes]`,
   geen ronde-nummers in de hoofdnaam (rondes zijn subtaken: `Feedback ronde N - {klant}`
   — die maakt het portaal zelf aan).
2. **Bedrijfsnaam hoort niet verplicht in de naam** — het portaal scoped al per bedrijf.
   Suffixen zoals `- S27` mogen, maar zijn overbodig voor de klant.
3. **Eén taal:** Nederlands, sentence case, geen ALL CAPS.
4. **Interne taken** (niet voor de klant): prefix `INTERN: ` — het portaal verbergt die
   ruis automatisch in de weergave (display-normalisatie `cleanTaakNaam`, live sinds v79),
   maar gebruik voor écht interne taken bij voorkeur géén bedrijf-relatie of de FB-TYPE-JOBs
   (3/5/8/10), dan verschijnen ze sowieso niet.

## Wat het portaal automatisch opruimt (vangnet, géén excuus)

`cleanTaakNaam()` stript bij weergave: `INTERN:`-prefix, `[…]`-prefix tot 24 tekens,
`- feedback ronde N`-suffix, dubbele spaties. ClickUp-namen worden NOOIT automatisch
hernoemd (bewuste keuze — te riskant). Een gesuperviseerde rename-voorstel-tool kan later.
