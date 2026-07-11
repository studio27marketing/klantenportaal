/* =============================================================================
   Studio 27 Klantenportaal v2, CATALOGUS-DATA (offline) · GECUREERD AANBOD
   -----------------------------------------------------------------------------
   Klanten bestellen via de bestel-wizard (openOfferteWizard) ENKEL dit gecureerde
   aanbod · niet meer de volledige PandaDoc-prijslijst. Prijzen + omschrijvingen
   volgen de Studio 27-testofferte. Velden per product:
     sku, name, price (EUR), group (= tak), sub (subgroep), category,
     desc_html, popular, mand (verplicht/automatisch inbegrepen item).
   Verplichte items (mand:true) worden automatisch toegevoegd zodra de klant iets
   uit diezelfde tak kiest, en zijn niet handmatig te verwijderen
   (preproductie bij video, opstart-fee bij social & adverteren).
   "· per maand" in de naam = maandelijks, geen jaarcontract.
   De worker (offerteGenereren) herrekent prijzen sinds golf 3 ALTIJD server-side
   tegen de D1-prijslijst (offer_catalog): match eerst op sku (offer_catalog.sku,
   restpunt 27), daarna op genormaliseerde naam. Klant-prijzen uit deze payload
   worden nooit vertrouwd; items zonder catalogusrij gaan op het op-maat-pad.
   Geladen in index.html VOOR panels.js, zet window.S27_CATALOG.
   ============================================================================= */
window.S27_CATALOG = [

  /* ---------- 1. STRATEGIE (één sessie) ---------- */
  {"sku":"194777238317","name":"Kick-off strategiesessie","price":780.0,"group":"Strategie","sub":"","category":"Studio 27/Strategie","mand":false,"popular":true,
   "desc_html":"<ul><li>Strategiesessie van +/- 3u</li><li>We brengen je doelen, doelgroep en kanalen in kaart en vertalen ze naar een concreet actieplan</li><li>Extra opdrachten of uitlopen van de sessie in regie (uurtarief van €120)</li></ul>"},

  /* ---------- 2. BRANDING (logo + stylesheet) ---------- */
  {"sku":"194777563314","name":"Logo design","price":680.0,"group":"Branding","sub":"","category":"Studio 27/Branding","mand":false,"popular":true,
   "desc_html":"<ul><li>Live ontwerpsessie</li><li>1 concept</li><li>1 feedbackronde van max 1u</li><li>Export: kleurvarianten (kleur/wit/zwart) en vectorbestand</li></ul>"},
  {"sku":"194777604159","name":"Stylesheet","price":380.0,"group":"Branding","sub":"","category":"Studio 27/Branding","mand":false,"popular":false,
   "desc_html":"<ul><li>De visuele basisregels van je merk gebundeld in één document: kleuren, lettertypes en logogebruik</li><li>Zorgt dat al je communicatie er consistent en herkenbaar uitziet</li></ul>"},

  /* ---------- 3. VIDEO & FOTOGRAFIE ---------- */
  {"sku":"194950840766","name":"Preproductie","price":140.0,"group":"Video & fotografie","sub":"Preproductie","category":"Studio 27/Video","mand":true,"popular":false,
   "desc_html":"<ul><li>Interne briefing en voorbereiding van het benodigde materiaal</li><li>Verplicht en automatisch inbegrepen bij elke video- of fotoshoot</li></ul>"},
  {"sku":"194952703902","name":"Content creator / cameraman · halve dag","price":420.0,"group":"Video & fotografie","sub":"Shoot","category":"Studio 27/Video","mand":false,"popular":true,
   "desc_html":"<ul><li>Voor een halve dag rekenen we 4u inclusief verplaatsingstijd</li><li>Extra opdrachten of uitlopen van de shoot in regie (uurtarief)</li><li>Voor weekenddagen hanteren we een tarief van 120%</li><li>Beelden worden na oplevering niet standaard bewaard; bewaren kan na aankoop van een harde schijf. Het overzetten en colorgraden gebeurt in regie (uurtarief van €95)</li></ul>"},
  {"sku":"194952744556","name":"Content creator / cameraman · hele dag","price":620.0,"group":"Video & fotografie","sub":"Shoot","category":"Studio 27/Video","mand":false,"popular":false,
   "desc_html":"<ul><li>Voor een hele dag rekenen we 8u inclusief verplaatsingstijd</li><li>Extra opdrachten of uitlopen van de shoot in regie (uurtarief)</li><li>Voor weekenddagen hanteren we een tarief van 120%</li><li>Beelden worden na oplevering niet standaard bewaard; bewaren kan na aankoop van een harde schijf. Het overzetten en colorgraden gebeurt in regie (uurtarief van €95)</li></ul>"},
  {"sku":"194778353128","name":"Camerateam (2 personen) · halve dag","price":800.0,"group":"Video & fotografie","sub":"Shoot","category":"Studio 27/Video","mand":false,"popular":false,
   "desc_html":"<ul><li>Voor een halve dag rekenen we 4u inclusief verplaatsingstijd</li><li>Extra opdrachten of uitlopen van de shoot in regie (uurtarief)</li><li>Voor weekenddagen hanteren we een tarief van 120%</li><li>Beelden worden niet standaard bewaard; bewaren kan na aankoop van een harde schijf (overzetten + colorgraden in regie, €95/u)</li></ul>"},
  {"sku":"194778374783","name":"Camerateam (2 personen) · hele dag","price":1200.0,"group":"Video & fotografie","sub":"Shoot","category":"Studio 27/Video","mand":false,"popular":false,
   "desc_html":"<ul><li>Voor een hele dag rekenen we 8u inclusief verplaatsingstijd</li><li>Extra opdrachten of uitlopen van de shoot in regie (uurtarief)</li><li>Voor weekenddagen hanteren we een tarief van 120%</li><li>Beelden worden niet standaard bewaard; bewaren kan na aankoop van een harde schijf (overzetten + colorgraden in regie, €95/u)</li></ul>"},
  {"sku":"194952627803","name":"Camerateam (3 personen) · halve dag","price":1200.0,"group":"Video & fotografie","sub":"Shoot","category":"Studio 27/Video","mand":false,"popular":false,
   "desc_html":"<ul><li>Voor een halve dag rekenen we 4u inclusief verplaatsingstijd</li><li>Extra opdrachten of uitlopen van de shoot in regie (uurtarief)</li><li>Voor weekenddagen hanteren we een tarief van 120%</li><li>Beelden worden niet standaard bewaard; bewaren kan na aankoop van een harde schijf (overzetten + colorgraden in regie, €95/u)</li></ul>"},
  {"sku":"194952645361","name":"Camerateam (3 personen) · hele dag","price":1800.0,"group":"Video & fotografie","sub":"Shoot","category":"Studio 27/Video","mand":false,"popular":false,
   "desc_html":"<ul><li>Voor een hele dag rekenen we 8u inclusief verplaatsingstijd</li><li>Extra opdrachten of uitlopen van de shoot in regie (uurtarief)</li><li>Voor weekenddagen hanteren we een tarief van 120%</li><li>Beelden worden niet standaard bewaard; bewaren kan na aankoop van een harde schijf (overzetten + colorgraden in regie, €95/u)</li></ul>"},
  {"sku":"194955869887","name":"Montage +/- 30 seconden","price":420.0,"group":"Video & fotografie","sub":"Montage & nabewerking","category":"Studio 27/Video","mand":false,"popular":false,
   "desc_html":"<ul><li>Eén feedbackronde van 1 werkuur inbegrepen</li><li>Extra feedback in regie (uurtarief van €95)</li></ul>"},
  {"sku":"194957744567","name":"Nabewerking +/- 30 foto's","price":320.0,"group":"Video & fotografie","sub":"Montage & nabewerking","category":"Studio 27/Video","mand":false,"popular":false,
   "desc_html":"<ul><li>Professionele nabewerking (selectie, retouche en colorgrade) van ongeveer 30 foto's</li><li>Feedback in regie (uurtarief van €95)</li></ul>"},
  {"sku":"200744072342","name":"User generated content shoot","price":620.0,"group":"Video & fotografie","sub":"UGC-shoot","category":"Studio 27/Video","mand":false,"popular":false,
   "desc_html":"<div><p>We komen gedurende ongeveer 3u langs om professionele reels te creëren voor social media. We leveren 6 tot 8 reels op (afhankelijk van de complexiteit), met een lengte van 10 tot 30 seconden, geschikt voor:</p><ul><li>Organisch gebruik op social media</li><li>Social media advertenties</li></ul><p>De kilometervergoeding wordt achteraf berekend vanaf ons kantoor in Rijkevorsel.</p></div>"},
  {"sku":"194778428493","name":"Km-vergoeding","price":0.45,"group":"Video & fotografie","sub":"Verplaatsing","category":"Studio 27/Video","mand":false,"popular":false,
   "desc_html":"<p>0,45€ per kilometer voor de professioneel gereden kilometers vertrekkende van ons kantoor te Rijkevorsel. Dit item verrekenen we bij het versturen van de factuur.</p>"},

  /* ---------- 4. SEO & GEO (vervangt webdesign) ---------- */
  {"sku":"s27-seogeo-1","name":"SEO & GEO traject · Pakket 1 (2u/maand) · per maand","price":180.0,"group":"SEO & GEO","sub":"","category":"Studio 27/SEO & GEO","mand":false,"popular":false,
   "desc_html":"<div><p>Ideaal om te starten met je online vindbaarheid. We werken ongeveer 2 uur per maand (basistarief €95/u) aan:</p><ul><li>Technische SEO-check en quick wins</li><li>Zoekwoordenonderzoek voor je belangrijkste focuspagina</li><li>GEO-optimalisatie: Google-bedrijfsprofiel en lokale vermeldingen verzorgen zodat je ook in AI-zoekresultaten en lokaal opduikt</li><li>Korte maandelijkse opvolging</li></ul><p>Maandelijks, geen jaarcontract.</p></div>"},
  {"sku":"s27-seogeo-2","name":"SEO & GEO traject · Pakket 2 (4u/maand) · per maand","price":380.0,"group":"SEO & GEO","sub":"","category":"Studio 27/SEO & GEO","mand":false,"popular":true,
   "desc_html":"<div><p>Voor wie structureel wil groeien in zoekmachines. Ongeveer 4 uur per maand (basistarief €95/u):</p><ul><li>Alles uit pakket 1</li><li>Doorlopende content-optimalisatie van meerdere pagina's</li><li>Structured data en interne linkstructuur</li><li>Uitbreiding van het GEO-luik (AI- en lokale vindbaarheid)</li><li>Uitgebreide maandrapportage met posities en verkeer</li></ul><p>Maandelijks, geen jaarcontract.</p></div>"},
  {"sku":"s27-seogeo-3","name":"SEO & GEO traject · Pakket 3 (6u/maand) · per maand","price":620.0,"group":"SEO & GEO","sub":"","category":"Studio 27/SEO & GEO","mand":false,"popular":false,
   "desc_html":"<div><p>Het volledige traject voor maximale vindbaarheid. Ongeveer 6 uur per maand (basistarief €95/u):</p><ul><li>Proactieve SEO- én GEO-strategie</li><li>Nieuwe SEO-content en doorgedreven technische optimalisaties</li><li>Aanzet tot linkbuilding en autoriteitsopbouw</li><li>Maandelijkse strategische opvolging</li></ul><p>Maandelijks, geen jaarcontract.</p></div>"},

  /* ---------- 5. SOCIAL MEDIA ---------- */
  {"sku":"s27-social-opstart","name":"Social media beheer · opstart","price":280.0,"group":"Social media","sub":"Opstart","category":"Studio 27/Social media","mand":true,"popular":false,
   "desc_html":"<p>We brengen de nodige technische koppeling in orde en geven je toegang tot de socialmediaplanner Metricool. Eenmalig en verplicht bij de start van een social-mediatraject.</p>"},
  {"sku":"216390313630","name":"Beheer (4 posts) · per maand","price":320.0,"group":"Social media","sub":"Beheer","category":"Studio 27/Social media","mand":false,"popular":false,
   "desc_html":"<div><p>We werken met de planningstool Metricool en plannen altijd 1 à 2 maanden vooruit. Je bekijkt en geeft feedback op de klaargezette posts; per periode voorzien we standaard 1 feedbackronde. Gemiddeld 4 posts per maand. Contentcreatie is niet in dit budget inbegrepen.</p><p>Maandelijks, geen jaarcontract.</p></div>"},
  {"sku":"194885391941","name":"Beheer (8 posts) · per maand","price":480.0,"group":"Social media","sub":"Beheer","category":"Studio 27/Social media","mand":false,"popular":true,
   "desc_html":"<div><p>We werken met de planningstool Metricool en plannen altijd 1 à 2 maanden vooruit. Je bekijkt en geeft feedback op de klaargezette posts; per periode voorzien we standaard 1 feedbackronde. Gemiddeld 8 posts per maand. Contentcreatie is niet in dit budget inbegrepen.</p><p>Maandelijks, geen jaarcontract.</p></div>"},
  {"sku":"216389816536","name":"Beheer + shoot (8 posts) · per maand","price":680.0,"group":"Social media","sub":"Beheer","category":"Studio 27/Social media","mand":false,"popular":false,
   "desc_html":"<div><p>Elke 2 maanden komen we langs om content te maken van jouw bedrijf. We zijn gemiddeld 3u ter plaatse om trending user-generated video/foto-content te maken. Daarna verwerken we de content in leuke posts en plannen we alles in via Metricool (1 à 2 maanden vooruit, met 1 feedbackronde). Gemiddeld 8 posts per maand.</p><p>Maandelijks, geen jaarcontract.</p></div>"},
  {"sku":"s27-ugc-social","name":"User generated content shoot","price":620.0,"group":"Social media","sub":"Content","category":"Studio 27/Social media","mand":false,"popular":false,
   "desc_html":"<div><p>We komen gedurende ongeveer 3u langs om professionele reels te creëren voor social media. We leveren 6 tot 8 reels op (10 tot 30 sec), geschikt voor organisch gebruik én advertenties. De kilometervergoeding wordt achteraf berekend vanaf ons kantoor in Rijkevorsel.</p></div>"},
  {"sku":"s27-social-tool","name":"Social scheduling software · per maand","price":30.0,"group":"Social media","sub":"Tools","category":"Studio 27/Social media","mand":false,"popular":false,
   "desc_html":"<p>Abonnement op onze planningstool (Metricool) om je posts in te plannen, te publiceren en op te volgen. Maandelijks, geen jaarcontract.</p>"},

  /* ---------- 6. ADVERTEREN ---------- */
  {"sku":"216021146400","name":"Advertentiebeheer · opstart","price":500.0,"group":"Adverteren","sub":"Opstart","category":"Studio 27/Adverteren","mand":true,"popular":false,
   "desc_html":"<p>Technische koppeling, budgetbepaling, campagne-instellingen, doormeting en advertentie-template. Eenmalig en verplicht bij de start van een advertentietraject.</p>"},
  {"sku":"216021413973","name":"Advertentiebeheer (Google) · per maand","price":300.0,"group":"Adverteren","sub":"Beheer","category":"Studio 27/Adverteren","mand":false,"popular":false,
   "desc_html":"<p>Optimalisatie van je campagnes en maandelijkse rapportage. Maandelijks, geen jaarcontract.</p>"},
  {"sku":"216021323463","name":"Advertentiebeheer (Meta) · per maand","price":350.0,"group":"Adverteren","sub":"Beheer","category":"Studio 27/Adverteren","mand":false,"popular":true,
   "desc_html":"<p>Aanmaak van advertentiecampagnes, optimalisatie en maandelijkse rapportage. Maandelijks, geen jaarcontract.</p>"},
  {"sku":"216021462802","name":"Advertentiebeheer (Meta + Google) · per maand","price":550.0,"group":"Adverteren","sub":"Beheer","category":"Studio 27/Adverteren","mand":false,"popular":false,
   "desc_html":"<p>Aanmaak van nieuwe advertenties op basis van bestaande visuals, optimalisatie van campagnes over beide platformen en maandelijkse rapportage. Maandelijks, geen jaarcontract.</p>"}

];
