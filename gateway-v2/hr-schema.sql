-- HR-datastore (Cloudflare D1) — kandidaten + onboarding.
-- Vervangt ClickUp als bron-van-waarheid voor HR. Toegepast 2026-06-23.

CREATE TABLE IF NOT EXISTS candidates (
  id           TEXT PRIMARY KEY,           -- uuid (nieuwe intake) of clickup-id (import)
  naam         TEXT NOT NULL DEFAULT '',
  voornaam     TEXT NOT NULL DEFAULT '',
  achternaam   TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  telefoon     TEXT NOT NULL DEFAULT '',
  woonplaats   TEXT NOT NULL DEFAULT '',
  vacature     TEXT NOT NULL DEFAULT '',   -- functie waarvoor men solliciteerde
  vacature_id  TEXT NOT NULL DEFAULT '',
  type         TEXT NOT NULL DEFAULT '',   -- bv. spontaan
  bron         TEXT NOT NULL DEFAULT '',   -- herkomst: website / indeed / vdab / linkedin ...
  kanaal       TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'nieuw',  -- nieuw|screening|gesprek|assessment|aanbod|afgewezen|aangenomen
  status_raw   TEXT NOT NULL DEFAULT 'nieuw',
  spam         INTEGER NOT NULL DEFAULT 0,
  cv_url       TEXT NOT NULL DEFAULT '',
  cv_text      TEXT NOT NULL DEFAULT '',
  motivatie    TEXT NOT NULL DEFAULT '',
  ai_score     INTEGER,                    -- 0-100 (NULL = nog niet gescreend)
  ai_json      TEXT,                       -- volledige AI-beoordeling (samenvatting/sterktes/...)
  clickup_id   TEXT NOT NULL DEFAULT '',   -- oorspronkelijke ClickUp-task (dedup/herkomst)
  created_at   INTEGER NOT NULL DEFAULT 0, -- sollicitatiedatum (ms)
  updated_at   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cand_status  ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_cand_created ON candidates(created_at);
CREATE INDEX IF NOT EXISTS idx_cand_email   ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_cand_clickup ON candidates(clickup_id);
CREATE INDEX IF NOT EXISTS idx_cand_status_spam_created ON candidates(status, spam, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cand_vacature_created ON candidates(vacature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cand_vacature_id ON candidates(vacature_id);

CREATE TABLE IF NOT EXISTS onboarding_people (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT '',
  dept         TEXT NOT NULL DEFAULT '',
  start        TEXT NOT NULL DEFAULT '',
  buddy        TEXT NOT NULL DEFAULT '',
  candidate_id TEXT NOT NULL DEFAULT '',   -- link naar candidates.id (optioneel)
  created_at   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ob_people_candidate ON onboarding_people(candidate_id);

CREATE TABLE IF NOT EXISTS onboarding_state (
  person_id    TEXT NOT NULL,
  key          TEXT NOT NULL,
  done         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (person_id, key)
);
CREATE INDEX IF NOT EXISTS idx_ob_state_person ON onboarding_state(person_id);

-- Documenten per kandidaat (gegenereerde contracten/cases ...). Bytes in R2
-- (key hrdocs/<candidate_id>/<doc_id>/<naam>), hier de metadata + koppeling.
-- Het portaal is bron-van-waarheid: zo blijft elk gegenereerd document
-- downloadbaar/zichtbaar in het dossier i.p.v. een eenmalige browser-download.
CREATE TABLE IF NOT EXISTS candidate_docs (
  id           TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT '',   -- contract | case | cv | mailbijlage | other
  r2_key       TEXT NOT NULL DEFAULT '',
  filename     TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  size         INTEGER NOT NULL DEFAULT 0,
  mail_id      TEXT NOT NULL DEFAULT '',   -- koppeling naar candidate_mails.id (bij mailbijlagen)
  created_at   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_doc_cand ON candidate_docs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_doc_mail ON candidate_docs(mail_id);
CREATE INDEX IF NOT EXISTS idx_doc_cand_created ON candidate_docs(candidate_id, created_at DESC);

-- Mailverkeer per kandidaat (volledig in het portaal). Uitgaand wordt altijd
-- gelogd; inkomend wordt (met gmail.readonly) uit Gmail bijgehaald, idempotent
-- op gmail_id. Zo werkt de thread ook zonder Gmail-leestoegang.
CREATE TABLE IF NOT EXISTS candidate_mails (
  id           TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  direction    TEXT NOT NULL DEFAULT 'out', -- out | in
  from_addr    TEXT NOT NULL DEFAULT '',
  to_addr      TEXT NOT NULL DEFAULT '',
  subject      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  gmail_id     TEXT NOT NULL DEFAULT '',
  read         INTEGER NOT NULL DEFAULT 0,  -- inkomend: 0=nieuw/ongelezen, 1=gelezen (uitgaand=1)
  has_attach   INTEGER NOT NULL DEFAULT 0,  -- snelle indicator: had bijlage(n)
  created_at   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mail_cand ON candidate_mails(candidate_id);
CREATE INDEX IF NOT EXISTS idx_mail_unread ON candidate_mails(read, direction);
CREATE INDEX IF NOT EXISTS idx_mail_cand_created ON candidate_mails(candidate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mail_unread_created ON candidate_mails(direction, read, created_at DESC);
-- Eén inkomende mail per (kandidaat, gmail_id): voorkomt race-dubbels bij gelijktijdige sync.
-- Partieel (gmail_id!='') zodat uitgaande mails (gmail_id='') niet onderling botsen.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_gmail ON candidate_mails(candidate_id, gmail_id) WHERE gmail_id != '';

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
CREATE INDEX IF NOT EXISTS idx_hrtask_status_due ON hr_tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_hrtask_candidate ON hr_tasks(candidate_id, archived);
CREATE INDEX IF NOT EXISTS idx_hrtask_vacature ON hr_tasks(vacature_id, archived);
CREATE INDEX IF NOT EXISTS idx_hrtask_member ON hr_tasks(member_id, status);
CREATE INDEX IF NOT EXISTS idx_hrtask_active_due ON hr_tasks(archived, due_at);

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
