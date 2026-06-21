-- Add categories to all Hanchanghee Cheonha Ilmyeon shops, including names
-- with and without spacing.
UPDATE shops
SET menu_category_ids = (
  SELECT ARRAY(
    SELECT DISTINCT category
    FROM unnest(
      menu_category_ids || ARRAY['aburasoba', 'tonkotsu']::TEXT[]
    ) AS category
    ORDER BY category
  )
)
WHERE name LIKE '한창희천하일면%'
   OR name LIKE '한창희 천하일면%';
