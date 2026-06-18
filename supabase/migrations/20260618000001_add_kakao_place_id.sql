-- Add Kakao Place ID column to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS kakao_place_id VARCHAR(64);

-- Keep one row per Kakao Place when the ID is available.
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_kakao_place_id_unique
  ON shops(kakao_place_id)
  WHERE kakao_place_id IS NOT NULL;

COMMENT ON COLUMN shops.kakao_place_id IS 'Kakao Map place ID used to build https://place.map.kakao.com/{place_id}';
