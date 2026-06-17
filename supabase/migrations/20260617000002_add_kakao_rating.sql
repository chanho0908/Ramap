-- Add kakao_rating column to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS kakao_rating DECIMAL(2, 1);

-- Add comment to document the column purpose
COMMENT ON COLUMN shops.kakao_rating IS 'Kakao Map official rating (0-5 scale, scraped from place detail page)';

-- Add check constraint to ensure rating is between 0 and 5
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'kakao_rating_range'
  ) THEN
    ALTER TABLE shops
      ADD CONSTRAINT kakao_rating_range CHECK (kakao_rating >= 0 AND kakao_rating <= 5);
  END IF;
END $$;
