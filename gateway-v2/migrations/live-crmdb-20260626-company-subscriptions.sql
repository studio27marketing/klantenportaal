-- Additive migration: structured recurring services per company.
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS company_subscriptions (
  id            TEXT PRIMARY KEY,
  bedrijf_id    TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT '',
  label         TEXT NOT NULL DEFAULT '',
  active        INTEGER NOT NULL DEFAULT 1,
  budget        REAL NOT NULL DEFAULT 0,
  budget_period TEXT NOT NULL DEFAULT 'maand',
  context       TEXT NOT NULL DEFAULT '',
  org           TEXT NOT NULL DEFAULT '',
  sort          INTEGER NOT NULL DEFAULT 0,
  source        TEXT NOT NULL DEFAULT 'portal',
  created_at    INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_csub_bedrijf ON company_subscriptions(bedrijf_id, active);
CREATE INDEX IF NOT EXISTS idx_csub_type ON company_subscriptions(type, active);
