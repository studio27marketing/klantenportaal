-- Studio 27 werkplek - CRMDB structure update
-- Applied to s27-crm-db after live schema inspection on 2026-06-25.
-- Additive only: no destructive changes and no visual field type changes.

ALTER TABLE tasks ADD COLUMN contact_id TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN candidate_id TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN vacature_id TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN wedding_id TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN archived_at INTEGER;
ALTER TABLE tasks ADD COLUMN archived_by TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN archive_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN archive_batch_id TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN completed_at INTEGER;
ALTER TABLE tasks ADD COLUMN last_activity_at INTEGER NOT NULL DEFAULT 0;

ALTER TABLE projects ADD COLUMN contact_id TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN candidate_id TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN vacature_id TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN wedding_id TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN archived_at INTEGER;
ALTER TABLE projects ADD COLUMN archived_by TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN archive_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN archive_batch_id TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN completed_at INTEGER;
ALTER TABLE projects ADD COLUMN last_activity_at INTEGER NOT NULL DEFAULT 0;

ALTER TABLE weddings ADD COLUMN project_id TEXT NOT NULL DEFAULT '';
ALTER TABLE weddings ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE weddings ADD COLUMN archived_at INTEGER;

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

CREATE INDEX IF NOT EXISTS idx_tm_active_naam ON team_members(active, naam);
CREATE INDEX IF NOT EXISTS idx_tm_active_clickup ON team_members(active, clickup_member_id);

CREATE INDEX IF NOT EXISTS idx_comp_hoofd_contact ON companies(hoofd_contact);
CREATE INDEX IF NOT EXISTS idx_cont_bedrijf_voornaam ON contacts(bedrijf_id, voornaam);
CREATE INDEX IF NOT EXISTS idx_cont_lower_email ON contacts(lower(email));

CREATE INDEX IF NOT EXISTS idx_off_contact ON offertes(contact_id);
CREATE INDEX IF NOT EXISTS idx_off_meeting ON offertes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_off_cat_created ON offertes(status_cat, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_off_bedrijf_created ON offertes(bedrijf_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_off_panda ON offertes(panda_id) WHERE panda_id!='';
CREATE INDEX IF NOT EXISTS idx_off_code ON offertes(code) WHERE code!='';

CREATE INDEX IF NOT EXISTS idx_meet_contact ON meetings(contact_id);
CREATE INDEX IF NOT EXISTS idx_meet_bedrijf_datum ON meetings(bedrijf_id, datum DESC);

CREATE INDEX IF NOT EXISTS idx_proj_active_deadline ON projects(archived, deadline);
CREATE INDEX IF NOT EXISTS idx_proj_company_active ON projects(company_id, archived);
CREATE INDEX IF NOT EXISTS idx_proj_offerte ON projects(offerte_id);
CREATE INDEX IF NOT EXISTS idx_proj_contact ON projects(contact_id);
CREATE INDEX IF NOT EXISTS idx_proj_wedding ON projects(wedding_id);
CREATE INDEX IF NOT EXISTS idx_proj_updated ON projects(updated_at);

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
CREATE INDEX IF NOT EXISTS idx_task_pm ON tasks(pm);
CREATE INDEX IF NOT EXISTS idx_task_org ON tasks(org);
CREATE INDEX IF NOT EXISTS idx_task_plan_window ON tasks(plan_start, plan_end);
CREATE INDEX IF NOT EXISTS idx_task_updated ON tasks(updated_at);

CREATE INDEX IF NOT EXISTS idx_ta_member_task ON task_assignees(member_id, task_id);

CREATE INDEX IF NOT EXISTS idx_wed_trouwdatum ON weddings(trouwdatum);
CREATE INDEX IF NOT EXISTS idx_wed_company ON weddings(company_id);
CREATE INDEX IF NOT EXISTS idx_wed_contact ON weddings(contact_id);
CREATE INDEX IF NOT EXISTS idx_wed_offerte ON weddings(offerte_id);
CREATE INDEX IF NOT EXISTS idx_wed_project ON weddings(project_id);
CREATE INDEX IF NOT EXISTS idx_wed_active_date ON weddings(archived, trouwdatum);

CREATE INDEX IF NOT EXISTS idx_vac_status_org ON vacatures(status, org);
CREATE INDEX IF NOT EXISTS idx_vac_webflow ON vacatures(webflow_id) WHERE webflow_id!='';

CREATE INDEX IF NOT EXISTS idx_leave_status_from ON leaves(status, from_date);
CREATE INDEX IF NOT EXISTS idx_leave_window ON leaves(from_date, to_date, member_id);

CREATE INDEX IF NOT EXISTS idx_inv_status_date ON invoices(status, inv_date DESC);
CREATE INDEX IF NOT EXISTS idx_rec_active_mrr ON recurring(active, mrr DESC);

UPDATE tasks
SET last_activity_at = CASE WHEN updated_at > 0 THEN updated_at ELSE created_at END
WHERE last_activity_at = 0;

UPDATE projects
SET last_activity_at = CASE WHEN updated_at > 0 THEN updated_at ELSE created_at END
WHERE last_activity_at = 0;

UPDATE tasks
SET completed_at = CASE WHEN updated_at > 0 THEN updated_at ELSE created_at END
WHERE completed_at IS NULL AND status IN ('done','klaar-voor-facturatie','gefactureerd');

INSERT OR IGNORE INTO task_assignees(task_id, member_id)
SELECT t.id, m.id
FROM tasks t
JOIN json_each(CASE WHEN json_valid(t.people) THEN t.people ELSE '[]' END) p
JOIN team_members m
  ON lower(m.naam)=lower(p.value)
  OR lower(m.voornaam)=lower(p.value)
  OR lower(m.email)=lower(p.value)
WHERE t.id!='' AND m.id!='';

INSERT OR IGNORE INTO entity_links(id, source_type, source_id, target_type, target_id, relation, sort, meta, created_at, updated_at)
SELECT 'rel_task_project_' || id, 'task', id, 'project', project_id, 'belongs_to', 0, '{}', created_at, updated_at
FROM tasks
WHERE project_id!='';

INSERT OR IGNORE INTO entity_links(id, source_type, source_id, target_type, target_id, relation, sort, meta, created_at, updated_at)
SELECT 'rel_task_company_' || id, 'task', id, 'company', company_id, 'for', 0, '{}', created_at, updated_at
FROM tasks
WHERE company_id!='';

INSERT OR IGNORE INTO entity_links(id, source_type, source_id, target_type, target_id, relation, sort, meta, created_at, updated_at)
SELECT 'rel_task_offerte_' || id, 'task', id, 'offerte', offerte_id, 'related', 0, '{}', created_at, updated_at
FROM tasks
WHERE offerte_id!='';

INSERT OR IGNORE INTO entity_links(id, source_type, source_id, target_type, target_id, relation, sort, meta, created_at, updated_at)
SELECT 'rel_project_company_' || id, 'project', id, 'company', company_id, 'for', 0, '{}', created_at, updated_at
FROM projects
WHERE company_id!='';

INSERT OR IGNORE INTO entity_links(id, source_type, source_id, target_type, target_id, relation, sort, meta, created_at, updated_at)
SELECT 'rel_project_offerte_' || id, 'project', id, 'offerte', offerte_id, 'generated_from', 0, '{}', created_at, updated_at
FROM projects
WHERE offerte_id!='';
