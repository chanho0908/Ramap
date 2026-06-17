-- Rename description column to kakao_place_url
-- This column stores the Kakao Map place URL for each shop

-- Rename the column when migrating from the initial schema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'shops'
      AND column_name = 'description'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'shops'
      AND column_name = 'kakao_place_url'
  ) THEN
    ALTER TABLE shops RENAME COLUMN description TO kakao_place_url;
  END IF;
END $$;

-- Add comment to document the column purpose
COMMENT ON COLUMN shops.kakao_place_url IS 'Kakao Map place URL (format: https://place.map.kakao.com/{place_id})';
