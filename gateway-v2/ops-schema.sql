-- ===========================================================================
-- ops-schema.sql — uitbreiding van s27-crm-db (CRMDB) tot het VOLLEDIGE
-- operationele datamodel dat ClickUp vervangt. Drie lagen (platform-kern /
-- business-modules / verticale packs). Eén D1-DB voor cross-module joins.
-- Conventies: id TEXT PK (uuid/clickup-id), tijden INTEGER epoch-ms, geld REAL,
-- bool INTEGER 0/1, JSON in TEXT, org-enum S27|27A|27M|ZVD, clickup_id voor overgang.
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS.
-- ===========================================================================

-- ---- LAAG A: PLATFORM-KERN ------------------------------------------------

CREATE TABLE IF NOT EXISTS team_members (
  id            TEXT PRIMARY KEY,
  naam          TEXT NOT NULL DEFAULT '',
  voornaam      TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  functie       TEXT NOT NULL DEFAULT '',
  prole         TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'team',   -- admin|sales|accountmanager|team (toegangsrol)
  teams         TEXT NOT NULL DEFAULT '[]',     -- JSON: ['management'|'uitvoerend'|'ai']
  personas      TEXT NOT NULL DEFAULT '[]',     -- JSON (Productie persona's)
  org           TEXT NOT NULL DEFAULT 'S27',
  color         TEXT NOT NULL DEFAULT '',
  week_hours    INTEGER NOT NULL DEFAULT 40,
  reg           TEXT NOT NULL DEFAULT '{}',     -- JSON werkregeling per weekdag
  verlof_hours  INTEGER NOT NULL DEFAULT 0,
  jeugd_hours   INTEGER NOT NULL DEFAULT 0,
  feest_hours   INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1,
  clickup_member_id TEXT NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tm_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_tm_role  ON team_members(role);

CREATE TABLE IF NOT EXISTS ai_buttons (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT 'sparkles',
  model       TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  prompt      TEXT NOT NULL DEFAULT '',
  job_types   TEXT NOT NULL DEFAULT '[]',   -- waar de knop verschijnt
  views       TEXT NOT NULL DEFAULT '[]',
  assignees   TEXT NOT NULL DEFAULT '[]',
  statuses    TEXT NOT NULL DEFAULT '[]',
  vis_roles   TEXT NOT NULL DEFAULT '[]',
  vis_members TEXT NOT NULL DEFAULT '[]',
  enabled     INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ai_agents (
  id            TEXT PRIMARY KEY,
  naam          TEXT NOT NULL DEFAULT '',
  ic            TEXT NOT NULL DEFAULT '',
  model         TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  system_prompt TEXT NOT NULL DEFAULT '',
  tools         TEXT NOT NULL DEFAULT '[]',
  knoppen       TEXT NOT NULL DEFAULT '[]',
  docs          TEXT NOT NULL DEFAULT '[]',
  vis_roles     TEXT NOT NULL DEFAULT '[]',
  vis_members   TEXT NOT NULL DEFAULT '[]',
  created_at    INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL DEFAULT 0
);

-- Per-teamlid AI-geheugen (eigen, zelflerend, bekijkbaar door teamlid + admin).
CREATE TABLE IF NOT EXISTS ai_memory (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL DEFAULT '',     -- eigenaar (per-teamlid assistent)
  agent_id    TEXT NOT NULL DEFAULT '',     -- optioneel (agent-specifiek)
  bedrijf_id  TEXT NOT NULL DEFAULT '',     -- optioneel klant-context
  kind        TEXT NOT NULL DEFAULT 'note', -- note|fact|conversation|learning
  rol         TEXT NOT NULL DEFAULT '',     -- gebruiker|assistent|systeem
  tekst       TEXT NOT NULL DEFAULT '',
  bronnen     TEXT NOT NULL DEFAULT '[]',
  pinned      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_aimem_member ON ai_memory(member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_aimem_bedrijf ON ai_memory(bedrijf_id);

CREATE TABLE IF NOT EXISTS automations (
  id          TEXT PRIMARY KEY,
  naam        TEXT NOT NULL DEFAULT '',
  cat         TEXT NOT NULL DEFAULT '',
  descr       TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT 'workflow',
  status      TEXT NOT NULL DEFAULT 'ok',    -- ok|warn|error|paused
  throughput  TEXT NOT NULL DEFAULT '',
  last_run    INTEGER,
  make_scenario_id TEXT NOT NULL DEFAULT '',
  enabled     INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_auto_cat ON automations(cat);

CREATE TABLE IF NOT EXISTS integrations (
  id          TEXT PRIMARY KEY,
  naam        TEXT NOT NULL DEFAULT '',
  descr       TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT 'plug',
  kind        TEXT NOT NULL DEFAULT '',      -- pandadoc|fireflies|metricool|meta|gads|ga4|gsc|webflow|seranking|gmail|gcal|gdrive|...
  status      TEXT NOT NULL DEFAULT 'ok',
  config      TEXT NOT NULL DEFAULT '{}',
  org         TEXT NOT NULL DEFAULT '',
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS files (
  id           TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL DEFAULT '',     -- task|offerte|company|candidate|meeting|message|briefing
  entity_id    TEXT NOT NULL DEFAULT '',
  naam         TEXT NOT NULL DEFAULT '',
  r2_key       TEXT NOT NULL DEFAULT '',
  drive_url    TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  size         INTEGER NOT NULL DEFAULT 0,
  uploaded_by  TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS drive_folders (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL DEFAULT '',
  project_id  TEXT NOT NULL DEFAULT '',
  path        TEXT NOT NULL DEFAULT '',
  drive_url   TEXT NOT NULL DEFAULT '',
  drive_id    TEXT NOT NULL DEFAULT '',
  kind        TEXT NOT NULL DEFAULT 'klant', -- klant|project|module
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_drive_company ON drive_folders(company_id);

CREATE TABLE IF NOT EXISTS calendar_events (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL DEFAULT '',
  date        INTEGER,
  start       TEXT NOT NULL DEFAULT '',
  "end"       TEXT NOT NULL DEFAULT '',
  title       TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT '',
  loc         TEXT NOT NULL DEFAULT '',
  company_id  TEXT NOT NULL DEFAULT '',
  task_id     TEXT NOT NULL DEFAULT '',
  gcal_id     TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cal_member ON calendar_events(member_id, date);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL DEFAULT 'group', -- group|dm
  name        TEXT NOT NULL DEFAULT '',
  members     TEXT NOT NULL DEFAULT '[]',
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL DEFAULT '',
  from_member TEXT NOT NULL DEFAULT '',
  text        TEXT NOT NULL DEFAULT '',
  files       TEXT NOT NULL DEFAULT '[]',
  task_ref    TEXT NOT NULL DEFAULT '',
  ts          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chatmsg_room ON chat_messages(room_id, ts);
CREATE TABLE IF NOT EXISTS chat_reads (
  room_id       TEXT NOT NULL,
  member_id     TEXT NOT NULL,
  last_read_ts  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, member_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL DEFAULT '',
  kind        TEXT NOT NULL DEFAULT '',
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id   TEXT NOT NULL DEFAULT '',
  channels    TEXT NOT NULL DEFAULT '[]',
  read        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notif_member ON notifications(member_id, read);

CREATE TABLE IF NOT EXISTS settings_user (
  member_id   TEXT PRIMARY KEY,
  tone        TEXT NOT NULL DEFAULT '{}',
  notif       TEXT NOT NULL DEFAULT '{}',
  whatsapp    TEXT NOT NULL DEFAULT '',
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings_global (
  k           TEXT PRIMARY KEY,
  v           TEXT NOT NULL DEFAULT '{}',
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id   TEXT NOT NULL DEFAULT '',
  before      TEXT NOT NULL DEFAULT '',
  after       TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS entity_links (
  id           TEXT PRIMARY KEY,
  source_type  TEXT NOT NULL DEFAULT '',
  source_id    TEXT NOT NULL DEFAULT '',
  target_type  TEXT NOT NULL DEFAULT '',
  target_id    TEXT NOT NULL DEFAULT '',
  relation     TEXT NOT NULL DEFAULT 'related',
  sort         INTEGER NOT NULL DEFAULT 0,
  meta         TEXT NOT NULL DEFAULT '{}',
  created_at   INTEGER NOT NULL DEFAULT 0,
  updated_at   INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_el_unique ON entity_links(source_type, source_id, target_type, target_id, relation);
CREATE INDEX IF NOT EXISTS idx_el_source ON entity_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_el_target ON entity_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_el_relation ON entity_links(relation);

CREATE TABLE IF NOT EXISTS archive_batches (
  id          TEXT PRIMARY KEY,
  scope       TEXT NOT NULL DEFAULT '',
  reason      TEXT NOT NULL DEFAULT '',
  dry_run     INTEGER NOT NULL DEFAULT 1,
  filters     TEXT NOT NULL DEFAULT '{}',
  counts      TEXT NOT NULL DEFAULT '{}',
  created_by  TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_archives (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL DEFAULT '',
  r2_key       TEXT NOT NULL DEFAULT '',
  snapshot     TEXT NOT NULL DEFAULT '',
  created_by   TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_parch_project ON project_archives(project_id, created_at);

-- ---- LAAG B: BUSINESS-MODULES --------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  naam        TEXT NOT NULL DEFAULT '',
  company_id  TEXT NOT NULL DEFAULT '',
  contact_id  TEXT NOT NULL DEFAULT '',
  candidate_id TEXT NOT NULL DEFAULT '',
  vacature_id TEXT NOT NULL DEFAULT '',
  wedding_id  TEXT NOT NULL DEFAULT '',
  branch      TEXT NOT NULL DEFAULT '',
  org         TEXT NOT NULL DEFAULT 'S27',
  status      TEXT NOT NULL DEFAULT '',
  pm          TEXT NOT NULL DEFAULT '',
  budget      REAL NOT NULL DEFAULT 0,
  start       INTEGER,
  deadline    INTEGER,
  brief       TEXT NOT NULL DEFAULT '',
  pm_veld     TEXT NOT NULL DEFAULT '',
  offerte_id  TEXT NOT NULL DEFAULT '',
  briefing_id TEXT NOT NULL DEFAULT '',
  drive       TEXT NOT NULL DEFAULT '',
  clickup_id  TEXT NOT NULL DEFAULT '',
  archived    INTEGER NOT NULL DEFAULT 0,
  archived_at INTEGER,
  archived_by TEXT NOT NULL DEFAULT '',
  archive_reason TEXT NOT NULL DEFAULT '',
  archive_batch_id TEXT NOT NULL DEFAULT '',
  completed_at INTEGER,
  last_activity_at INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_proj_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_proj_branch ON projects(branch);
CREATE INDEX IF NOT EXISTS idx_proj_active_deadline ON projects(archived, deadline);
CREATE INDEX IF NOT EXISTS idx_proj_offerte ON projects(offerte_id);
CREATE INDEX IF NOT EXISTS idx_proj_contact ON projects(contact_id);
CREATE INDEX IF NOT EXISTS idx_proj_wedding ON projects(wedding_id);

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  company_id  TEXT NOT NULL DEFAULT '',
  contact_id  TEXT NOT NULL DEFAULT '',
  candidate_id TEXT NOT NULL DEFAULT '',
  vacature_id TEXT NOT NULL DEFAULT '',
  wedding_id  TEXT NOT NULL DEFAULT '',
  project_id  TEXT NOT NULL DEFAULT '',
  parent_id   TEXT NOT NULL DEFAULT '',     -- subtaak-relatie
  type_job    TEXT NOT NULL DEFAULT '',
  branch      TEXT NOT NULL DEFAULT '',
  org         TEXT NOT NULL DEFAULT 'S27',
  status      TEXT NOT NULL DEFAULT 'op-te-starten',
  priority    TEXT NOT NULL DEFAULT 'medium', -- low|medium|high
  pm          TEXT NOT NULL DEFAULT '',
  people      TEXT NOT NULL DEFAULT '[]',   -- toegewezen leden (+ join-tabel task_assignees)
  budget      REAL NOT NULL DEFAULT 0,
  regie       INTEGER NOT NULL DEFAULT 0,
  start       INTEGER,
  deadline    INTEGER,
  est_min     INTEGER NOT NULL DEFAULT 0,
  brief       TEXT NOT NULL DEFAULT '',
  rating      INTEGER NOT NULL DEFAULT 0,
  drive       TEXT NOT NULL DEFAULT '',
  is_ticket   INTEGER NOT NULL DEFAULT 0,
  is_autofb   INTEGER NOT NULL DEFAULT 0,
  fb_status   TEXT NOT NULL DEFAULT '',
  fb_link     TEXT NOT NULL DEFAULT '',
  pm_veld     TEXT NOT NULL DEFAULT '',
  track       INTEGER NOT NULL DEFAULT 0,
  metricool   TEXT NOT NULL DEFAULT '',
  posts       INTEGER NOT NULL DEFAULT 0,
  platform    TEXT NOT NULL DEFAULT '[]',
  metabiz     TEXT NOT NULL DEFAULT '',
  adspend     REAL NOT NULL DEFAULT 0,
  rap_start   INTEGER,
  rap_eind    INTEGER,
  offerte_id  TEXT NOT NULL DEFAULT '',
  briefing_id TEXT NOT NULL DEFAULT '',
  plan_start  INTEGER,                       -- weekplanner exacte start (ms)
  plan_end    INTEGER,
  clickup_id  TEXT NOT NULL DEFAULT '',
  archived    INTEGER NOT NULL DEFAULT 0,
  archived_at INTEGER,
  archived_by TEXT NOT NULL DEFAULT '',
  archive_reason TEXT NOT NULL DEFAULT '',
  archive_batch_id TEXT NOT NULL DEFAULT '',
  completed_at INTEGER,
  last_activity_at INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_task_status  ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_task_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_parent  ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_task_branch  ON tasks(branch);
CREATE INDEX IF NOT EXISTS idx_task_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_task_ticket  ON tasks(is_ticket);
CREATE INDEX IF NOT EXISTS idx_task_active_deadline ON tasks(archived, deadline);
CREATE INDEX IF NOT EXISTS idx_task_status_deadline ON tasks(status, deadline);
CREATE INDEX IF NOT EXISTS idx_task_branch_active_deadline ON tasks(branch, archived, deadline);
CREATE INDEX IF NOT EXISTS idx_task_branch_status_deadline ON tasks(branch, status, deadline);
CREATE INDEX IF NOT EXISTS idx_task_company_active ON tasks(company_id, archived);
CREATE INDEX IF NOT EXISTS idx_task_company_status_deadline ON tasks(company_id, status, deadline);
CREATE INDEX IF NOT EXISTS idx_task_project_active ON tasks(project_id, archived);
CREATE INDEX IF NOT EXISTS idx_task_project_parent_status ON tasks(project_id, parent_id, status);
CREATE INDEX IF NOT EXISTS idx_task_contact ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_task_wedding ON tasks(wedding_id);
CREATE INDEX IF NOT EXISTS idx_task_candidate ON tasks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_task_vacature ON tasks(vacature_id);
CREATE INDEX IF NOT EXISTS idx_task_offerte ON tasks(offerte_id);
CREATE INDEX IF NOT EXISTS idx_task_plan_window ON tasks(plan_start, plan_end);
CREATE INDEX IF NOT EXISTS idx_task_updated ON tasks(updated_at);

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id   TEXT NOT NULL,
  member_id TEXT NOT NULL,
  PRIMARY KEY (task_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_ta_member ON task_assignees(member_id);
CREATE INDEX IF NOT EXISTS idx_ta_member_task ON task_assignees(member_id, task_id);

CREATE TABLE IF NOT EXISTS task_comments (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL DEFAULT '',
  who         TEXT NOT NULL DEFAULT '',
  member_id   TEXT NOT NULL DEFAULT '',
  text        TEXT NOT NULL DEFAULT '',
  internal    INTEGER NOT NULL DEFAULT 1,    -- 0=klant, 1=intern
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tc_task ON task_comments(task_id, created_at);

CREATE TABLE IF NOT EXISTS task_time_entries (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL DEFAULT '',
  member_id   TEXT NOT NULL DEFAULT '',
  started_at  INTEGER,
  stopped_at  INTEGER,
  minutes     INTEGER NOT NULL DEFAULT 0,
  note        TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tte_task ON task_time_entries(task_id);

CREATE TABLE IF NOT EXISTS briefings (
  id          TEXT PRIMARY KEY,
  titel       TEXT NOT NULL DEFAULT '',
  type_job    TEXT NOT NULL DEFAULT '',
  offerte_id  TEXT NOT NULL DEFAULT '',
  bedrijf_id  TEXT NOT NULL DEFAULT '',
  contact_id  TEXT NOT NULL DEFAULT '',
  meeting_id  TEXT NOT NULL DEFAULT '',
  project_id  TEXT NOT NULL DEFAULT '',
  pm          TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'to do',
  subtaken    TEXT NOT NULL DEFAULT '[]',
  inhoud      TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_brief_bedrijf ON briefings(bedrijf_id);

CREATE TABLE IF NOT EXISTS task_templates (
  id          TEXT PRIMARY KEY,
  product     TEXT NOT NULL DEFAULT '',
  branch      TEXT NOT NULL DEFAULT '',
  pandadoc    TEXT NOT NULL DEFAULT '',
  org         TEXT NOT NULL DEFAULT 'S27',
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS template_subtasks (
  id          TEXT PRIMARY KEY,
  template_id TEXT NOT NULL DEFAULT '',
  name        TEXT NOT NULL DEFAULT '',
  type_job    TEXT NOT NULL DEFAULT '',
  pct         REAL,
  descr       TEXT NOT NULL DEFAULT '',
  sort        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tsub_tpl ON template_subtasks(template_id);

CREATE TABLE IF NOT EXISTS leaves (
  id            TEXT PRIMARY KEY,
  member_id     TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT '',
  from_date     INTEGER,
  to_date       INTEGER,
  status        TEXT NOT NULL DEFAULT 'pending',
  reason        TEXT NOT NULL DEFAULT '',
  requested_at  INTEGER,
  approved_by   TEXT NOT NULL DEFAULT '',
  clickup_task_id TEXT NOT NULL DEFAULT '',
  gcal_event_id TEXT NOT NULL DEFAULT '',
  est_min       INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_leave_member ON leaves(member_id, from_date);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leave_status_from ON leaves(status, from_date);
CREATE INDEX IF NOT EXISTS idx_leave_window ON leaves(from_date, to_date, member_id);

CREATE TABLE IF NOT EXISTS leave_balances (
  member_id   TEXT NOT NULL,
  year        INTEGER NOT NULL,
  vakantie_h  INTEGER NOT NULL DEFAULT 0,
  jeugd_h     INTEGER NOT NULL DEFAULT 0,
  feest_h     INTEGER NOT NULL DEFAULT 0,
  recup_h     INTEGER NOT NULL DEFAULT 0,
  opgenomen_h INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (member_id, year)
);

CREATE TABLE IF NOT EXISTS payroll_requests (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT '',
  from_date   INTEGER,
  to_date     INTEGER,
  status      TEXT NOT NULL DEFAULT 'pending',
  detail      TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS offerte_lines (
  id          TEXT PRIMARY KEY,
  offerte_id  TEXT NOT NULL DEFAULT '',
  discipline  TEXT NOT NULL DEFAULT '',
  omschrijving TEXT NOT NULL DEFAULT '',
  bedrag      REAL NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_offl_off ON offerte_lines(offerte_id);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL DEFAULT '',
  task_id     TEXT NOT NULL DEFAULT '',
  omschrijving TEXT NOT NULL DEFAULT '',
  bedrag      REAL NOT NULL DEFAULT 0,
  project_code TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_invl_inv ON invoice_lines(invoice_id);

-- ---- LAAG C: VERTICALE PACKS ---------------------------------------------

CREATE TABLE IF NOT EXISTS weddings (
  id          TEXT PRIMARY KEY,
  partner_a   TEXT NOT NULL DEFAULT '',
  partner_b   TEXT NOT NULL DEFAULT '',
  trouwdatum  INTEGER,
  maand       TEXT NOT NULL DEFAULT '',
  locatie     TEXT NOT NULL DEFAULT '',
  gasten      INTEGER NOT NULL DEFAULT 0,
  pakket      TEXT NOT NULL DEFAULT '',
  fotograaf   TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'offerte',
  budget      REAL NOT NULL DEFAULT 0,
  voorschot   INTEGER NOT NULL DEFAULT 0,
  social      TEXT NOT NULL DEFAULT '',
  company_id  TEXT NOT NULL DEFAULT '',
  contact_id  TEXT NOT NULL DEFAULT '',
  offerte_id  TEXT NOT NULL DEFAULT '',
  meeting_id  TEXT NOT NULL DEFAULT '',
  project_id  TEXT NOT NULL DEFAULT '',
  org         TEXT NOT NULL DEFAULT '27M',
  archived    INTEGER NOT NULL DEFAULT 0,
  archived_at INTEGER,
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wed_status ON weddings(status);
CREATE INDEX IF NOT EXISTS idx_wed_trouwdatum ON weddings(trouwdatum);
CREATE INDEX IF NOT EXISTS idx_wed_company ON weddings(company_id);
CREATE INDEX IF NOT EXISTS idx_wed_contact ON weddings(contact_id);
CREATE INDEX IF NOT EXISTS idx_wed_offerte ON weddings(offerte_id);
CREATE INDEX IF NOT EXISTS idx_wed_project ON weddings(project_id);
CREATE INDEX IF NOT EXISTS idx_wed_active_date ON weddings(archived, trouwdatum);

CREATE TABLE IF NOT EXISTS vacatures (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  dept        TEXT NOT NULL DEFAULT '',
  loc         TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT '',
  org         TEXT NOT NULL DEFAULT 'S27',
  status      TEXT NOT NULL DEFAULT 'Concept',
  days_open   INTEGER NOT NULL DEFAULT 0,
  platforms   TEXT NOT NULL DEFAULT '[]',
  views       INTEGER NOT NULL DEFAULT 0,
  webflow_id  TEXT NOT NULL DEFAULT '',
  beschrijving TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_vac_status_org ON vacatures(status, org);
CREATE INDEX IF NOT EXISTS idx_vac_webflow ON vacatures(webflow_id) WHERE webflow_id!='';

CREATE TABLE IF NOT EXISTS hosting_contracts (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL DEFAULT '',
  klant       TEXT NOT NULL DEFAULT '',
  plan        TEXT NOT NULL DEFAULT '',
  fee         REAL NOT NULL DEFAULT 0,
  renewal     INTEGER,
  status      TEXT NOT NULL DEFAULT 'actief',
  uptime      REAL NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS seo_trajecten (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL DEFAULT '',
  klant       TEXT NOT NULL DEFAULT '',
  owner       TEXT NOT NULL DEFAULT '',
  kind        TEXT NOT NULL DEFAULT 'SEO',
  task_id     TEXT NOT NULL DEFAULT '',
  metrics     TEXT NOT NULL DEFAULT '[]',
  health      TEXT NOT NULL DEFAULT 'ok',
  note        TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS social_klanten (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL DEFAULT '',
  klant        TEXT NOT NULL DEFAULT '',
  owner        TEXT NOT NULL DEFAULT '',
  task_id      TEXT NOT NULL DEFAULT '',
  target_posts INTEGER NOT NULL DEFAULT 12,
  created_at   INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS social_posts (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL DEFAULT '',
  month       INTEGER,
  day         INTEGER,
  caption     TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  platform    TEXT NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'draft',
  metricool_id TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_socpost_company ON social_posts(company_id);

-- Onboarding-config (beheerbaar i.p.v. hardcoded)
CREATE TABLE IF NOT EXISTS onboarding_phases (
  id    TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  icon  TEXT NOT NULL DEFAULT '',
  sort  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id        TEXT PRIMARY KEY,
  phase_id  TEXT NOT NULL DEFAULT '',
  label     TEXT NOT NULL DEFAULT '',
  owner     TEXT NOT NULL DEFAULT '',
  sort      INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS onboarding_gifts (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  icon  TEXT NOT NULL DEFAULT ''
);
