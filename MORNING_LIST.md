# ☀️ Ochtendlijst — input/acties nodig van Vincent

_Laatst bijgewerkt: 29 mei 2026. Alles hieronder is geblokkeerd op iets dat ik niet zelf kan/mag doen. Zodra jij dit aanlevert, kan ik verder._

---

## ✅ Wat al LIVE staat (deze sessie, getest)
1. **AI Status Bot** — chatbubbel rechtsonder in het portaal. Beantwoordt projectvragen, escaleert automatisch naar de juiste persoon (Ilke=spoed, Arne=sales, Vincent=klacht) via een ClickUp-taak. Live + 6× getest.
2. **Nieuw-project formulier in 3 stappen** — (1) type+wens → (2) échte PandaDoc-prijsindicatie → (3) keuze: gedetailleerde offerte+gesprek óf direct bevestigen & opstart/shoot inplannen. Live + 2× volledig getest.
3. **Auto-Status-Comments** (backend) — AI schrijft automatisch een warme klant-comment bij statuswijziging. Werkt + getest (zie punt 2 hieronder voor de trigger).
4. Eerdere feedback: feedback-bestand-upload, contactpersoon-data uit gekoppelde taak, GSM-herhaling bij notificaties → alle live.

---

## 🔴 Nodig van jou

### 1. PandaDoc template-IDs per discipline  _(blokkeert: echte prijzen in nieuw-project stap 2)_
Ik heb alleen het **Adverteren**-template (`HQRvZ3sdrEm2GcuNsdP2Uf`). Voor de andere disciplines toont stap 2 nu een nette "prijs op maat"-fallback. Stuur me per discipline het PandaDoc-template-ID (of de template-naam, dan zoek ik het op):
- Webdesign, Branding/huisstijl, Social media, SEO+GEO, Opleiding, Video+Fotografie, AI & automatisatie.
→ Daarna tonen ALLE disciplines automatisch hun echte prijslijst.

### 2. ClickUp-automation voor Auto-Status-Comments  _(blokkeert: automatische klant-comments)_
De webhook werkt (`hook.eu1.make.com/ujqtpor1whyi9lb2wfkhq52b4ilaexyd`, body `{task_id, status}`).
**Jij beslist** of je dit aanzet (de comments zijn **klant-zichtbaar**!). Zo ja: maak in ClickUp een automation op de klant-lijsten: _"when status changes → call webhook"_ met task_id + nieuwe status in de body. Wil je dat ik dit als Make 'Watch Tasks'-trigger bouw i.p.v. ClickUp-automation? Zeg het en ik scope het eerst op een testlijst.

### 3. Performance Dashboard (jouw #1) — 3 beslissingen  _(blokkeert: de hele tab)_
Goed nieuws: Metricool (per `bedrijf_id`) en SE Ranking (per `website_url`) zijn al generiek aanroepbaar. **Maar:**
- a) **GA4 zit per klant hardcoded** in aparte scenario's (geen generieke "haal GA4 voor property X"-call). Keuze: (i) ik bouw één generiek GA4-scenario dat de property-ID uit het Bedrijven-veld leest, óf (ii) we mappen per klant het bestaande GA4-scenario. Wat heeft jouw voorkeur?
- b) **Een echte testklant met data** — TEST CLIENT BV heeft geen GA4/Metricool/Ads. Welke klant mag ik als testcase gebruiken (incl. toestemming)?
- c) **Google/Meta Ads** — welke rapportage-scenario's mag ik koppelen? (Ik zag `s4754589` e.a.)
→ Met a+b+c bouw ik de volledige tab met grafieken in Studio27-stijl.

### 4. Twilio WhatsApp-credentials  _(blokkeert: WhatsApp-notificaties, Feature 2A)_
De `whatsapp-notify`-scenario staat klaar als placeholder. Nodig: een Twilio-connection in Make (Account SID + Auth Token + WhatsApp-sender). Mail/portaal-notificaties werken al; enkel WhatsApp wacht hierop.

### 5. Goedkeuring nieuwe ClickUp custom fields  _(blokkeert: Features 2A/3/5)_
Ik wil deze velden op de **Bedrijven**-taak toevoegen (zeg OK, dan doe ik het):
- `Notificatie-voorkeur` (dropdown: mail/whatsapp/beide) — nu enkel in browser opgeslagen.
- `Health Score` (number 0-100) + `Health-notitie` (Feature 5).
- `Concurrenten` (tekst, domeinen) + `Trendscout-historie` (Feature 3).

### 6. Health Score & Capacity Planning — scope-input  _(Features 5 & 6, intern)_
- **Health Score**: welke signalen wegen mee (omzet, openstaande feedback, reactietijd, NPS…)? Heb ik boekhoud-data nodig en zo ja, waar?
- **Capacity Planning**: op basis waarvan voorspellen (team-uren in ClickUp, geplande shoots…)? Graag een korte definitie.

---

## 🟡 Kleine polish (mag ik zelf, lage prio)
- DM-bevestiging zegt _"…ziet het direct in **haar** planning"_ ook voor Arne/Vincent (mannelijk). Cosmetisch; fix ik bij volgende ronde.
- Een paar TEST-offertetaken + 1 escalatie-taak + 1 auto-comment aangemaakt tijdens het testen op TEST CLIENT BV (verwacht, mag weg wanneer je wil).
