-- Add menu classification fields to shops.
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS menu_category_ids TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_shops_menu_category_ids
  ON shops USING GIN (menu_category_ids);

COMMENT ON COLUMN shops.menu_category_ids IS 'Canonical ramen menu filter category IDs applied from actual menu verification.';
