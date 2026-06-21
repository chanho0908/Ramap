-- Add a UI visibility switch for shops.
--
-- Hidden shops stay in the database but are excluded from default map/search
-- rendering queries.

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_shops_is_visible
  ON shops(is_visible);

COMMENT ON COLUMN shops.is_visible IS 'Controls whether the shop is rendered in the UI while keeping the row in the database.';
