-- Studio 27 werkplek - HRDB structure update
-- Applied to s27-hr-db after live schema inspection on 2026-06-25.
-- Additive only: no destructive changes and no visual field type changes.

ALTER TABLE candidates ADD COLUMN vacature_id TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS hr_tasks (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  candidate_id  TEXT NOT NULL DEFAULT '',
  vacature_id   TEXT NOT NULL DEFAULT '',
  member_id     TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'hr',
  status        TEXT NOT NULL DEFAULT 'open',
  priority      TEXT NOT NULL DEFAULT '',
  due_at        INTEGER,
  completed_at  INTEGER,
  archived      INTEGER NOT NULL DEFAULT 0,
  archived_at   INTEGER,
  source_type   TEXT NOT NULL DEFAULT '',
  source_id     TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  created_by    TEXT NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hr_entity_links (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_hrel_unique ON hr_entity_links(source_type, source_id, target_type, target_id, relation);
CREATE INDEX IF NOT EXISTS idx_hrel_source ON hr_entity_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_hrel_target ON hr_entity_links(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_cand_status_spam_created ON candidates(status, spam, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cand_vacature_created ON candidates(vacature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cand_vacature_id ON candidates(vacature_id);

CREATE INDEX IF NOT EXISTS idx_mail_cand_created ON candidate_mails(candidate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mail_unread_created ON candidate_mails(direction, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_cand_created ON candidate_docs(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ob_people_candidate ON onboarding_people(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ob_state_person ON onboarding_state(person_id);

CREATE INDEX IF NOT EXISTS idx_hrtask_status_due ON hr_tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_hrtask_candidate ON hr_tasks(candidate_id, archived);
CREATE INDEX IF NOT EXISTS idx_hrtask_vacature ON hr_tasks(vacature_id, archived);
CREATE INDEX IF NOT EXISTS idx_hrtask_member ON hr_tasks(member_id, status);
CREATE INDEX IF NOT EXISTS idx_hrtask_active_due ON hr_tasks(archived, due_at);
