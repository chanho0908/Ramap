-- Apply additional manual category updates and removals.
UPDATE shops
SET menu_category_ids = ARRAY['mazesoba', 'tonkotsu']::TEXT[]
WHERE name = '코이라멘 서현점';

UPDATE shops
SET menu_category_ids = ARRAY['tonkotsu']::TEXT[]
WHERE name IN (
  '라멘트럭 상수본점',
  '류센소 연산점',
  '호시마츠라멘',
  '구루멘',
  '코이라멘 새롬점',
  '류센소 범어점',
  '요부코',
  '히메노라멘 울산업스퀘어점',
  '차슈멘연구소',
  '류센소 광주상무점',
  '류센소 동성로점',
  '오빈라멘 본점',
  '류센소'
);

UPDATE shops
SET menu_category_ids = ARRAY['tonkotsu', 'tori']::TEXT[]
WHERE name = '겐쇼심야라멘';

UPDATE shops
SET menu_category_ids = ARRAY['miso', 'tonkotsu']::TEXT[]
WHERE name = '호시마츠 첨단시리단길점';

UPDATE shops
SET menu_category_ids = ARRAY['miso', 'shoyu', 'tonkotsu']::TEXT[]
WHERE name = '류센소 본점';

UPDATE shops
SET menu_category_ids = ARRAY['shio', 'shoyu', 'tonkotsu', 'tori']::TEXT[]
WHERE name = '칸도라멘';

DELETE FROM shops
WHERE name IN (
  '단바쿠라멘',
  '만배식탁 광주전남대점',
  '울트라아멘',
  '산카쿠 광주본점',
  '히또시',
  '수림식당 수영점'
);
