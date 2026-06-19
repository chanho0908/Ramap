-- Remove tantanmen from the menu filter categories.
UPDATE shops
SET menu_category_ids = array_remove(menu_category_ids, 'tantanmen')
WHERE menu_category_ids @> ARRAY['tantanmen']::TEXT[];
