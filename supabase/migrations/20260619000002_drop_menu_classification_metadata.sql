-- Remove non-essential menu classification metadata columns.
ALTER TABLE shops
  DROP COLUMN IF EXISTS classification_source,
  DROP COLUMN IF EXISTS classification_notes,
  DROP COLUMN IF EXISTS classified_at;
