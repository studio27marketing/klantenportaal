-- CRM + Finance datastore (Cloudflare D1) — gedeelde ruggengraat voor 27CRM en 27Finance.
-- Vervangt stilaan ClickUp als bron-van-waarheid voor de commerciële + financiële data.
-- Binding: env.CRMDB (zie wrangler.toml). Edge-lokaal (WEUR).
-- Eenmalige import + uurlijkse sync uit de 4 ClickUp-offertelijsten (S27/27M/27A/ZVD)
-- + Bedrijven (901520180288) + Contactpersonen (901520180286) + Meetings (901520180293).

-- ---- BEDRIJVEN / KLANTEN -------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id            TEXT PRIMARY KEY,            -- ClickUp task-id (901520180288) of uuid
  naam          TEXT NOT NULL DEFAULT '',
  org           TEXT NOT NULL DEFAULT '',    -- hoofdmerk: S27|27A|ZVD|27M
  kaart         TEXT NOT NULL DEFAULT '',    -- klant | potentieel | intern (afgeleid)
  status_s27    TEXT NOT NULL DEFAULT '',    -- klantfase per merk
  status_zvd    TEXT NOT NULL DEFAULT '',
  status_27a    TEXT NOT NULL DEFAULT '',
  pm            TEXT NOT NULL DEFAULT '',    -- projectmanager (naam)
  type_job      TEXT NOT NULL DEFAULT '',    -- hoofddiscipline(s)
  website       TEXT NOT NULL DEFAULT '',
  locatie       TEXT NOT NULL DEFAULT '',
  kbo           TEXT NOT NULL DEFAULT '',    -- ondernemingsnummer/btw
  mw            INTEGER,                      -- aantal medewerkers
  fact_email    TEXT NOT NULL DEFAULT '',
  fact_opm      TEXT NOT NULL DEFAULT '',
  drive         TEXT NOT NULL DEFAULT '',    -- Drive-map-url
  hoofd_contact TEXT NOT NULL DEFAULT '',    -- contact-id van hoofdcontact
  ga4           TEXT NOT NULL DEFAULT '',
  gsc           TEXT NOT NULL DEFAULT '',
  gads          TEXT NOT NULL DEFAULT '',
  meta_ads      TEXT NOT NULL DEFAULT '',
  metricool     TEXT NOT NULL DEFAULT '',
  webflow       TEXT NOT NULL DEFAULT '',
  portaal_url   TEXT NOT NULL DEFAULT '',
  portaal_token TEXT NOT NULL DEFAULT '',
  portaal_modules TEXT NOT NULL DEFAULT '',
  portal_overrides TEXT NOT NULL DEFAULT '',
  belangrijk    INTEGER NOT NULL DEFAULT 0,
  clickup_id    TEXT NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_comp_org  ON companies(org);
CREATE INDEX IF NOT EXISTS idx_comp_naam ON companies(naam);
CREATE INDEX IF NOT EXISTS idx_comp_hoofd_contact ON companies(hoofd_contact);

-- ---- CONTACTPERSONEN -----------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id          TEXT PRIMARY KEY,              -- ClickUp task-id (901520180286)
  voornaam    TEXT NOT NULL DEFAULT '',
  achternaam  TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  gsm         TEXT NOT NULL DEFAULT '',
  bedrijf_id  TEXT NOT NULL DEFAULT '',
  notif       TEXT NOT NULL DEFAULT '',      -- WhatsApp|E-mail|Beide|Geen
  kanalen     TEXT NOT NULL DEFAULT '',      -- JSON-array labels
  portal_overrides TEXT NOT NULL DEFAULT '',
  clickup_id  TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cont_bedrijf ON contacts(bedrijf_id);
CREATE INDEX IF NOT EXISTS idx_cont_email   ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_cont_bedrijf_voornaam ON contacts(bedrijf_id, voornaam);
CREATE INDEX IF NOT EXISTS idx_cont_lower_email ON contacts(lower(email));

-- ---- OFFERTES (de spil van CRM + Finance) --------------------------------
CREATE TABLE IF NOT EXISTS offertes (
  id          TEXT PRIMARY KEY,              -- ClickUp task-id (4 offertelijsten)
  titel       TEXT NOT NULL DEFAULT '',
  onderneming TEXT NOT NULL DEFAULT '',      -- S27|27M|27A|ZVD (afgeleid uit de lijst)
  status      TEXT NOT NULL DEFAULT '',      -- ClickUp workflow-status: draft/sent/viewed/expired/completed/declined/archived
  status_cat  TEXT NOT NULL DEFAULT 'open',  -- open|won|lost|archived (afgeleid)
  bedrijf_id  TEXT NOT NULL DEFAULT '',
  bedrijf_naam TEXT NOT NULL DEFAULT '',
  contact_id  TEXT NOT NULL DEFAULT '',
  contact_naam TEXT NOT NULL DEFAULT '',
  meeting_id  TEXT NOT NULL DEFAULT '',
  briefing_id TEXT NOT NULL DEFAULT '',
  owner       TEXT NOT NULL DEFAULT '',      -- account manager / uitbrenger (naam)
  budget      REAL NOT NULL DEFAULT 0,       -- totaalbedrag EUR (veld c8d2dd2c)
  disc        TEXT NOT NULL DEFAULT '',      -- JSON {discipline: bedrag}
  panda_id    TEXT NOT NULL DEFAULT '',
  panda_link  TEXT NOT NULL DEFAULT '',
  code        TEXT NOT NULL DEFAULT '',      -- unieke code / offertenummer
  verval      INTEGER,                        -- vervaldatum (ms)
  doorzet     TEXT NOT NULL DEFAULT '',      -- interne PM-handoff: Naar PM|Done
  opstart     INTEGER NOT NULL DEFAULT 0,    -- post-win opstart afgevinkt
  verzonden_door TEXT NOT NULL DEFAULT '',
  vd_override INTEGER NOT NULL DEFAULT 0,
  brief       TEXT NOT NULL DEFAULT '',
  portal_overrides TEXT NOT NULL DEFAULT '',
  clickup_id  TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0,    -- aanmaakdatum offerte (ms)
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_off_status  ON offertes(status);
CREATE INDEX IF NOT EXISTS idx_off_cat     ON offertes(status_cat);
CREATE INDEX IF NOT EXISTS idx_off_org     ON offertes(onderneming);
CREATE INDEX IF NOT EXISTS idx_off_bedrijf ON offertes(bedrijf_id);
CREATE INDEX IF NOT EXISTS idx_off_created ON offertes(created_at);
CREATE INDEX IF NOT EXISTS idx_off_contact ON offertes(contact_id);
CREATE INDEX IF NOT EXISTS idx_off_meeting ON offertes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_off_cat_created ON offertes(status_cat, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_off_bedrijf_created ON offertes(bedrijf_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_off_panda ON offertes(panda_id) WHERE panda_id!='';
CREATE INDEX IF NOT EXISTS idx_off_code ON offertes(code) WHERE code!='';

-- ---- MEETINGS ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
  id          TEXT PRIMARY KEY,              -- ClickUp task-id (901520180293)
  titel       TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT '',      -- SALES|PROJECT|INTERN
  org         TEXT NOT NULL DEFAULT '',      -- S27|27A|27M|ZVD
  datum       INTEGER,                        -- ms
  status      TEXT NOT NULL DEFAULT '',      -- klaar|niet klaar
  bedrijf_id  TEXT NOT NULL DEFAULT '',
  contact_id  TEXT NOT NULL DEFAULT '',
  ff          TEXT NOT NULL DEFAULT '',      -- Fireflies transcript-id
  ff_url      TEXT NOT NULL DEFAULT '',
  samenvatting TEXT NOT NULL DEFAULT '',
  portal_overrides TEXT NOT NULL DEFAULT '',
  clickup_id  TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_meet_bedrijf ON meetings(bedrijf_id);
CREATE INDEX IF NOT EXISTS idx_meet_datum   ON meetings(datum);
CREATE INDEX IF NOT EXISTS idx_meet_contact ON meetings(contact_id);
CREATE INDEX IF NOT EXISTS idx_meet_bedrijf_datum ON meetings(bedrijf_id, datum DESC);

-- ---- FACTUREN (Finance — voorgesteld; nog geen ClickUp-bron) -------------
CREATE TABLE IF NOT EXISTS invoices (
  id          TEXT PRIMARY KEY,              -- uuid
  nr          TEXT NOT NULL DEFAULT '',      -- factuurnummer
  bedrijf_id  TEXT NOT NULL DEFAULT '',
  bedrijf_naam TEXT NOT NULL DEFAULT '',
  offerte_id  TEXT NOT NULL DEFAULT '',
  amount      REAL NOT NULL DEFAULT 0,       -- EUR
  inv_date    INTEGER,                        -- factuurdatum (ms)
  due_date    INTEGER,                        -- vervaldatum (ms)
  status      TEXT NOT NULL DEFAULT 'concept', -- concept|verzonden|betaald|vervallen
  note        TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'manueel', -- manueel|afgeleid|boekhouding
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_inv_status  ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_inv_bedrijf ON invoices(bedrijf_id);
CREATE INDEX IF NOT EXISTS idx_inv_status_date ON invoices(status, inv_date DESC);

-- ---- RECURRING (terugkerende contracten / MRR) ---------------------------
CREATE TABLE IF NOT EXISTS recurring (
  id          TEXT PRIMARY KEY,
  bedrijf_id  TEXT NOT NULL DEFAULT '',
  client      TEXT NOT NULL DEFAULT '',
  brand       TEXT NOT NULL DEFAULT '',      -- S27|27A|ZVD|27M
  type        TEXT NOT NULL DEFAULT '',      -- Hosting|Social media|Adverteren|...
  mrr         REAL NOT NULL DEFAULT 0,       -- maandbedrag EUR
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rec_active_mrr ON recurring(active, mrr DESC);

-- ---- COMPANY SUBSCRIPTIONS (lopende abonnementen per bedrijf) -------------
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id            TEXT PRIMARY KEY,
  bedrijf_id    TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT '',      -- seo|ads|email|social|hosting|automation|...
  label         TEXT NOT NULL DEFAULT '',
  active        INTEGER NOT NULL DEFAULT 1,
  budget        REAL NOT NULL DEFAULT 0,
  budget_period TEXT NOT NULL DEFAULT 'maand', -- maand|kwartaal
  context       TEXT NOT NULL DEFAULT '',      -- bv. 4 posts / maand, GEO inbegrepen
  org           TEXT NOT NULL DEFAULT '',      -- S27|27A|ZVD|27M
  sort          INTEGER NOT NULL DEFAULT 0,
  source        TEXT NOT NULL DEFAULT 'portal',
  created_at    INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_csub_bedrijf ON company_subscriptions(bedrijf_id, active);
CREATE INDEX IF NOT EXISTS idx_csub_type ON company_subscriptions(type, active);

-- ---- SYNC-META (laatste import-tijdstippen per bron) ---------------------
CREATE TABLE IF NOT EXISTS sync_meta (
  k           TEXT PRIMARY KEY,
  v           TEXT NOT NULL DEFAULT '',
  updated_at  INTEGER NOT NULL DEFAULT 0
);
