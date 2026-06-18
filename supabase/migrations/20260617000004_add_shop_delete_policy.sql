-- Add policies for shop management (INSERT, UPDATE, DELETE)
-- These are needed for admin operations like crawling and data cleanup

-- Allow anonymous/public insert on shops (for crawling scripts)
DROP POLICY IF EXISTS "Allow public insert on shops" ON shops;
CREATE POLICY "Allow public insert on shops" ON shops
  FOR INSERT WITH CHECK (true);

-- Allow anonymous/public update on shops (for crawling scripts)
DROP POLICY IF EXISTS "Allow public update on shops" ON shops;
CREATE POLICY "Allow public update on shops" ON shops
  FOR UPDATE USING (true);

-- Allow anonymous/public delete on shops (for data cleanup)
DROP POLICY IF EXISTS "Allow public delete on shops" ON shops;
CREATE POLICY "Allow public delete on shops" ON shops
  FOR DELETE USING (true);
