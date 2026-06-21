-- Fill remaining manually verified empty menu categories.
-- "시로" is normalized to shio, and "어패류" to niboshi_gyokai.

UPDATE shops
SET menu_category_ids = ARRAY['niboshi_gyokai', 'shio', 'shoyu', 'tonkotsu', 'tori']::TEXT[]
WHERE name = '라멘다이야'
  AND kakao_place_id = '715994079';

UPDATE shops
SET menu_category_ids = ARRAY['shoyu', 'tori']::TEXT[]
WHERE name LIKE '더라멘워%';

UPDATE shops
SET menu_category_ids = ARRAY['niboshi_gyokai', 'shoyu', 'tonkotsu']::TEXT[]
WHERE name = '류센소 김해점'
  AND kakao_place_id = '455908970';

UPDATE shops
SET menu_category_ids = ARRAY['aburasoba', 'miso']::TEXT[]
WHERE name = '마츠도 서울역점'
  AND kakao_place_id = '1174317839';

UPDATE shops
SET menu_category_ids = ARRAY['aburasoba', 'iekei', 'mazesoba']::TEXT[]
WHERE name LIKE '칸다소바%';

UPDATE shops
SET menu_category_ids = ARRAY['tomato']::TEXT[]
WHERE name LIKE '토마라멘%';

UPDATE shops
SET menu_category_ids = ARRAY['aburasoba', 'mazesoba', 'shoyu']::TEXT[]
WHERE name = '후타츠 쌍문'
  AND kakao_place_id = '556071148';

UPDATE shops
SET menu_category_ids = ARRAY['aburasoba', 'tonkotsu']::TEXT[]
WHERE name = '천하일면 전주완산점'
  AND kakao_place_id = '1787235665';
