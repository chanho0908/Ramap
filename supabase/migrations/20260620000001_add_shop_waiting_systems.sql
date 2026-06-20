-- Store which waiting system each Shop appears to use.
-- This table intentionally stores provider metadata only, never real-time queue state.

CREATE TABLE IF NOT EXISTS shop_waiting_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'unknown',
  provider_url TEXT,
  source_url TEXT,
  CONSTRAINT shop_waiting_systems_shop_id_unique UNIQUE (shop_id),
  CONSTRAINT shop_waiting_systems_provider_check
    CHECK (provider IN ('catchtable', 'tabling', 'syrup_friends', 'unknown'))
);

CREATE INDEX IF NOT EXISTS idx_shop_waiting_systems_provider
  ON shop_waiting_systems(provider);

ALTER TABLE shop_waiting_systems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on shop_waiting_systems" ON shop_waiting_systems;
CREATE POLICY "Allow public read access on shop_waiting_systems" ON shop_waiting_systems
  FOR SELECT
  USING (true);

GRANT SELECT ON shop_waiting_systems TO anon, authenticated;
GRANT ALL ON shop_waiting_systems TO service_role;

COMMENT ON TABLE shop_waiting_systems IS 'Waiting system provider metadata per Shop. Does not store real-time waiting data.';
COMMENT ON COLUMN shop_waiting_systems.provider IS 'Waiting system provider: catchtable, tabling, syrup_friends, or unknown.';
COMMENT ON COLUMN shop_waiting_systems.provider_url IS 'Detected provider URL, when available.';
COMMENT ON COLUMN shop_waiting_systems.source_url IS 'Source page URL used for provider identification.';
