-- Add instagram_url column to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(255);

-- Add comment to document the column purpose
COMMENT ON COLUMN shops.instagram_url IS 'Instagram profile URL for the shop (optional, used for social media integration)';
