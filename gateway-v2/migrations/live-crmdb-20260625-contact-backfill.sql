-- Studio 27 werkplek - backfill contact links for production data.
-- Uses offerte.contact_id first, then companies.hoofd_contact as fallback.

UPDATE tasks
SET contact_id = (
  SELECT o.contact_id FROM offertes o
  WHERE o.id = tasks.offerte_id AND o.contact_id!=''
  LIMIT 1
)
WHERE contact_id='' AND offerte_id!=''
  AND EXISTS (SELECT 1 FROM offertes o WHERE o.id = tasks.offerte_id AND o.contact_id!='');

UPDATE projects
SET contact_id = (
  SELECT o.contact_id FROM offertes o
  WHERE o.id = projects.offerte_id AND o.contact_id!=''
  LIMIT 1
)
WHERE contact_id='' AND offerte_id!=''
  AND EXISTS (SELECT 1 FROM offertes o WHERE o.id = projects.offerte_id AND o.contact_id!='');

UPDATE tasks
SET contact_id = (
  SELECT c.hoofd_contact FROM companies c
  WHERE c.id = tasks.company_id AND c.hoofd_contact!=''
  LIMIT 1
)
WHERE contact_id='' AND company_id!=''
  AND EXISTS (SELECT 1 FROM companies c WHERE c.id = tasks.company_id AND c.hoofd_contact!='');

UPDATE projects
SET contact_id = (
  SELECT c.hoofd_contact FROM companies c
  WHERE c.id = projects.company_id AND c.hoofd_contact!=''
  LIMIT 1
)
WHERE contact_id='' AND company_id!=''
  AND EXISTS (SELECT 1 FROM companies c WHERE c.id = projects.company_id AND c.hoofd_contact!='');

INSERT OR IGNORE INTO entity_links(id, source_type, source_id, target_type, target_id, relation, sort, meta, created_at, updated_at)
SELECT 'rel_task_contact_' || id, 'task', id, 'contact', contact_id, 'contact', 0, '{}', created_at, updated_at
FROM tasks
WHERE contact_id!='';

INSERT OR IGNORE INTO entity_links(id, source_type, source_id, target_type, target_id, relation, sort, meta, created_at, updated_at)
SELECT 'rel_project_contact_' || id, 'project', id, 'contact', contact_id, 'contact', 0, '{}', created_at, updated_at
FROM projects
WHERE contact_id!='';
