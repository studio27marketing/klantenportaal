# Ontbrekende data en kritische punten - Teamportaal

Datum: 2026-06-26

## 1. Doorlopende trajecten

1. De basisstructuur staat klaar via `company_subscriptions`.
2. Nog ontbrekend voor volledige precisie:
   - Gestructureerde advertentieplatformen per klant: Google Ads, Meta Ads, TikTok Ads, Snapchat Ads, LinkedIn Ads.
   - Nu worden Google en Meta afgeleid uit bestaande integratievelden. TikTok, Snapchat en LinkedIn hebben nog geen betrouwbare D1-kolommen.
   - E-mailmarketing heeft nog geen externe integratie-ID of pakkettype.
   - Context per abonnement moet inhoudelijk aangevuld worden, bijvoorbeeld `4 posts/maand`, `maandrapport + optimalisatie`, `2 nieuwsbrieven/kwartaal`.

## 2. Integraties

1. Behouden als echte D1-velden:
   - GA4 Property ID
   - GSC URL
   - Google Ads ID
   - Meta Ads ID
   - Metricool ID
   - Webflow Site ID
2. Niet meer als live-editveld tonen zolang er geen kolom bestaat:
   - Meta Business ID
   - TikTok Ads ID
   - Snapchat Ads ID
   - LinkedIn Ads ID
   - Website editor

## 3. Adressen

1. Bedrijven hebben nu alleen `locatie` als vrije tekst.
2. Voor Google Maps-suggesties ontbreken nog:
   - Google Maps Places API-key of Cloudflare Worker-proxy.
   - Velden voor straat, postcode, gemeente, land, place_id en formatted_address.
   - Keuze of adressen ook naar PandaDoc moeten. Dat pas koppelen na controle van de PandaDoc-templatevariabelen.

## 4. HR-login en veiligheid

1. HR had nog oude demo-login UI met hardcoded voorbeeldwaarde `welkom27`. Die waarde is uit de UI verwijderd. De fallback-login werkt nu alleen nog lokaal of via `file://` met `?preview=1`, niet op de live Pages-omgeving.
2. Gateway bevat hardcoded intake-keys voor `hr/apply` en `ops/generate`.
3. Live afdelingsroutes hebben nu een gedeelde route-guard:
   - Zonder geldige Firebase-sessie redirecten CRM, Finance, Productie en HR naar `/?next=...`.
   - `?preview=1` werkt niet meer als live bypass.
   - De afdelings-UI wordt verborgen tot auth bevestigd is, zodat seed-data niet zichtbaar flitst.
4. Kritisch advies:
   - Zet die keys in Cloudflare secrets.
   - Roteer ze als ze ooit live gebruikt zijn.
   - Verwijder preview-login later volledig als HR geen standalone lokale demo meer nodig heeft.

## 5. Mock- en template-data

1. CRM, Finance, Productie en HR hebben nog seed-data als fallback.
2. Voor deze wijziging is `Doorlopende trajecten` in live nu beschermd tegen demo-klanten vóór live data geladen is.
3. Nog open:
   - Finance-facturen, recurring-overzichten en rendementskaarten zijn nog niet volledig DB-backed.
   - HR bevat nog seed-vacatures, kandidaten en teamleden als lokale fallback.
   - CRM en HR geven nog console-warnings op verborgen template-inputs (`type=number/date` met `{{ ... }}` vóór DC-render). Niet blokkerend, wel op te ruimen.

## 6. Offerte-sync

1. Nieuwe CRM-offertes gaan naar D1 en PandaDoc, niet terug naar ClickUp.
2. Oudere offertes komen nog uit ClickUp tot aan de cutoff.
3. Mogelijke mismatch PandaDoc/ClickUp/CRM blijft dus verklaarbaar door de overgangsarchitectuur.
4. Geen PandaDoc-test of webhook-setup uitgevoerd, omdat dat externe acties zijn.

## 7. Bruidsparen

1. Bruidsparen bestaan visueel in CRM, maar zijn nog niet volledig als productiedatabank ingericht.
2. Nodig:
   - Definitieve relatie tussen bruidspaar, contactpersoon, offerte, meeting en productietaak.
   - Beslissing of bruidsparen als aparte entiteit blijven of als company/contact-paar voor 27 Moments worden gemodelleerd.
