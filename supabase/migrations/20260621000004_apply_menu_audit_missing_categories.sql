-- Apply missing menu categories found by the menu category audit.
-- Existing extra/manual categories are preserved; this only fills categories
-- that the menu scan found but the DB did not have.

UPDATE shops
SET menu_category_ids = ARRAY['hiyashi', 'miso', 'shoyu', 'tonkotsu']::TEXT[]
WHERE name = '건담S'
  AND kakao_place_id = '1143437766';

UPDATE shops
SET menu_category_ids = ARRAY['miso', 'shio', 'shoyu', 'tonkotsu']::TEXT[]
WHERE name = '라멘집아저씨'
  AND kakao_place_id = '1924164536';

UPDATE shops
SET menu_category_ids = ARRAY['aburasoba', 'miso', 'tonkotsu', 'tori']::TEXT[]
WHERE name = '멘야연 라멘하우스'
  AND kakao_place_id = '726497550';

UPDATE shops
SET menu_category_ids = ARRAY[
  'aburasoba',
  'hiyashi',
  'shio',
  'shoyu',
  'tori',
  'tsukemen'
]::TEXT[]
WHERE name = '멘츠루 수원점'
  AND kakao_place_id = '1351770461';

UPDATE shops
SET menu_category_ids = ARRAY[
  'aburasoba',
  'hiyashi',
  'shio',
  'shoyu',
  'tori',
  'tsukemen'
]::TEXT[]
WHERE name = '멘츠루 신사점'
  AND kakao_place_id = '643708043';

UPDATE shops
SET menu_category_ids = ARRAY['insta', 'shio', 'shoyu', 'tonkotsu']::TEXT[]
WHERE name = '부타노맥스'
  AND kakao_place_id = '1616903182';

UPDATE shops
SET menu_category_ids = ARRAY['tomato', 'tori']::TEXT[]
WHERE name = '태양의토마토라멘 한티역점'
  AND kakao_place_id = '196306566';

UPDATE shops
SET menu_category_ids = ARRAY['tonkotsu', 'tori']::TEXT[]
WHERE name = '햐쿠운'
  AND kakao_place_id = '1436804201';
