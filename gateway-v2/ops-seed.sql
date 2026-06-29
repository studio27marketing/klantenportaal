-- Seed: echt team (rollen/teams #17) + automatiseringen- en integraties-registry.
-- Idempotent (INSERT OR REPLACE op stabiele id). Tijd = nu in ms.

-- ---- TEAM (teams: management|uitvoerend|ai bepaalt paginatoegang) ---------
INSERT OR REPLACE INTO team_members (id,naam,voornaam,email,functie,prole,role,teams,org,color,week_hours,active,created_at,updated_at) VALUES
 ('tm_vincent','Vincent Verleije','Vincent','vincent@studio27.be','Zaakvoerder','strategie / AI','admin','["management","ai"]','S27','#2458EA',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_arne','Arne Goetschalckx','Arne','arne@studio27.be','Sales','sales','sales','["management"]','S27','#28AFF9',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_ilke','Ilke Meeusen','Ilke','ilke@studio27.be','Accountmanager','accounts / PM','accountmanager','["management"]','S27','#D1F24C',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_wout','Wout Goos','Wout','wout@studio27.be','Zaakvoerder ZVD','sales ZVD','sales','["management"]','ZVD','#0F2EA3',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_klaas','Klaas Vanhove','Klaas','klaas@studio27.be','Webdesign & development','webdesign / support','team','["uitvoerend"]','S27','#5E50C8',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_viktor','Viktor Hendrickx','Viktor','viktor@studio27.be','27 Moments & content','video / 27M','team','["uitvoerend"]','27M','#C99410',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_danique','Danique Bosch','Danique','danique@studio27.be','Content & creatie','social / content','team','["uitvoerend"]','S27','#E5484D',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_ines','Ines Permentiers','Ines','ines@studio27.be','Content & camera','video / foto','team','["uitvoerend"]','S27','#1D8A5B',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_bjorn','Bjorn Borgers','Bjorn','bjorn@studio27.be','Content & camera','video / foto','team','["uitvoerend"]','S27','#0EA5E9',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_guus','Guus Van den Heuvel','Guus','guus@studio27.be','Content & camera','video / foto','team','["uitvoerend"]','S27','#F97316',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_johanna','Johanna Augustyns','Johanna','johanna@studio27.be','Marketing','performance / marketing','team','["uitvoerend"]','S27','#A855F7',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_griet','Griet Beyens','Griet','griet@studio27.be','Uitvoering','copy / content','team','["uitvoerend"]','S27','#14B8A6',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
 ('tm_anouk','Anouk de Hoon','Anouk','anouk@studio27.be','Uitvoering','webdesign / content','team','["uitvoerend"]','S27','#EC4899',40,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);

-- ---- INTEGRATIES-registry (status wordt door health-check bijgewerkt) -----
INSERT OR REPLACE INTO integrations (id,naam,descr,icon,kind,status,enabled,created_at,updated_at) VALUES
 ('int_gmail','Gmail','Mailverkeer team (lezen + versturen) via service-account','mail','gmail','ok',1,0,0),
 ('int_gcal','Google Calendar','Agenda van alle teamleden','calendar','gcal','ok',1,0,0),
 ('int_gdrive','Google Drive','Projectmappen + bestanden','folder','gdrive','ok',1,0,0),
 ('int_pandadoc','PandaDoc','Offertes + status (draft/sent/viewed/completed)','file-signature','pandadoc','ok',1,0,0),
 ('int_fireflies','Fireflies','Meeting-transcripties → CRM','mic','fireflies','warn',1,0,0),
 ('int_meta','Meta Ads','Campagnes lezen + schrijven','megaphone','meta','ok',1,0,0),
 ('int_gads','Google Ads','Campagnes lezen + schrijven','megaphone','gads','ok',1,0,0),
 ('int_ga4','Google Analytics 4','Websiteprestaties','line-chart','ga4','ok',1,0,0),
 ('int_gsc','Google Search Console','Zoekprestaties','search','gsc','ok',1,0,0),
 ('int_seranking','SE Ranking','SEO + GEO data','trending-up','seranking','warn',1,0,0),
 ('int_metricool','Metricool','Social media planning','share-2','metricool','ok',1,0,0),
 ('int_webflow','Webflow','Websites + CMS (vacatures)','globe','webflow','ok',1,0,0),
 ('int_ai','AI-modellen','Claude, Gemini en ChatGPT','sparkles','ai','ok',1,0,0),
 ('int_firebase','Firebase','Login + identiteit team','shield','firebase','ok',1,0,0),
 ('int_clickup','ClickUp','Interim-spiegel tijdens overgang','check-square','clickup','ok',1,0,0);

-- ---- AUTOMATISERINGEN-registry (6 categorieën) ---------------------------
INSERT OR REPLACE INTO automations (id,naam,cat,descr,icon,status,throughput,make_scenario_id,enabled,sort,created_at,updated_at) VALUES
 ('au_fireflies','Fireflies → meeting + transcript','Sales & CRM','Nieuwe Fireflies-meeting wordt CRM-meeting met transcript + AI-recap','mic','warn','',' ',1,1,0,0),
 ('au_form_offerte','Websiteformulier → salesvraag → offerte','Sales & CRM','Contactaanvraag wordt AI-geclassificeerd; salesvraag → offerte-taak + juiste template','file-text','warn','',' ',1,2,0,0),
 ('au_pandadoc_sync','PandaDoc-status → portaal','Sales & CRM','Offertestatus (sent/viewed/completed) synct terug naar het portaal','file-signature','ok','',' ',1,3,0,0),
 ('au_won_taken','Offerte gewonnen → projecttaken','Productie','Bevestigde offerte genereert taken per discipline met budget + omschrijving','list-checks','warn','',' ',1,4,0,0),
 ('au_won_drive','Offerte gewonnen → Google Drive-mappen','Websites & hosting','Standaard mappenstructuur per klant/project automatisch aangemaakt','folder','warn','',' ',1,5,0,0),
 ('au_ticket','Ticketmail → taak voor Klaas','Productie','Mail naar ticket-adres maakt een taak in de ticketlijst','life-buoy','warn','','6132814',1,6,0,0),
 ('au_offerte_mail','Doorgestuurde klantmail → salesvraag','Sales & CRM','Mail naar offerte-adres wordt behandeld als nieuwe salesvraag','mail','warn','',' ',1,7,0,0),
 ('au_social','Social posts → Metricool','Social & ads','Goedgekeurde posts worden als concept naar Metricool gestuurd','share-2','ok','',' ',1,8,0,0),
 ('au_ads_report','Ads-rapportage','Social & ads','Maandelijkse Meta/Google-rapportage per klant','megaphone','ok','',' ',1,9,0,0),
 ('au_seo','SEO/GEO-data → trajecten','Social & ads','SE Ranking + GSC voeden de SEO-trajecten','trending-up','warn','',' ',1,10,0,0),
 ('au_sollicitatie','Sollicitatie → kandidaat','Werving & HR','Webformulier maakt kandidaat in de HR-pijplijn (+ CV)','user-plus','ok','','6120656',1,11,0,0),
 ('au_verlof_cal','Goedgekeurd verlof → agenda','HR & finance','Goedgekeurd verlof verschijnt in de teamagenda','calendar','ok','',' ',1,12,0,0),
 ('au_recurring','Recurring → maandfacturatie','HR & finance','Terugkerende contracten triggeren maandelijkse facturatie','receipt','warn','',' ',1,13,0,0),
 ('au_hosting','Hosting-verlenging','Websites & hosting','Verlengingsherinnering + uptime-monitoring per klant','server','ok','',' ',1,14,0,0);

-- ---- AI-KNOPPEN (defaults; admin past model/prompt/zichtbaarheid aan) -----
INSERT OR REPLACE INTO ai_buttons (id,label,icon,model,prompt,job_types,statuses,vis_roles,enabled,sort,created_at,updated_at) VALUES
 ('aib_update','Schrijf klant-update','mail','claude-sonnet-4-6','Schrijf een korte, warme klant-update in de tone of voice van Studio 27 over de stand van zaken van deze taak. Gebruik de meegegeven klant-, taak- en mailcontext.','[]','[]','[]',1,1,0,0),
 ('aib_brief','Genereer projectbriefing','file-text','claude-opus-4-8','Stel een heldere projectbriefing op uit de gekoppelde meeting(s), offerte en mailverkeer: doel, scope, deliverables per discipline, deadlines.','["Projectmanagement"]','[]','[]',1,2,0,0),
 ('aib_recap','Recap-mail uit meeting','mic','claude-sonnet-4-6','Schrijf een recap-mail op basis van het meeting-transcript: besproken punten, afspraken, volgende stappen.','[]','[]','[]',1,3,0,0),
 ('aib_caption','Social caption','share-2','gpt-4o','Schrijf een pakkende social caption in de tone of voice van de klant, met passende hashtags en een call-to-action.','["Social media"]','[]','[]',1,4,0,0),
 ('aib_ads','Ads-analyse + voorstel','megaphone','claude-sonnet-4-6','Analyseer de advertentiedata van deze klant en geef concrete optimalisatievoorstellen (budget, doelgroep, creatives).','["Adverteren"]','[]','[]',1,5,0,0),
 ('aib_seo','SEO-analyse','trending-up','gemini-2.5-pro','Vat de SEO/GEO-stand van deze klant samen (SE Ranking + GSC) en geef een prioriteitenlijst.','["SEO"]','[]','[]',1,6,0,0);
