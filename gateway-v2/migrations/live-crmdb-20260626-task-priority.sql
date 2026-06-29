-- Additive migration: task priority for productielijsten.
-- Run once on CRMDB before deploying code that writes priority.

ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';
CREATE INDEX IF NOT EXISTS idx_task_priority ON tasks(priority);
