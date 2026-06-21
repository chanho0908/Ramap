-- Apply manual ramen menu category updates from review.
--
-- Note: "시로" is treated as "시오" and stored as the canonical shio ID.

UPDATE shops
SET menu_category_ids = ARRAY['tonkotsu']::TEXT[]
WHERE name = '아타타카이라멘';

UPDATE shops
SET menu_category_ids = ARRAY[
  'aburasoba',
  'mazesoba',
  'shoyu',
  'tonkotsu',
  'tori'
]::TEXT[]
WHERE name = '멘야리 노원본점';

UPDATE shops
SET menu_category_ids = ARRAY['shio', 'shoyu']::TEXT[]
WHERE name = '멘쿄';

UPDATE shops
SET menu_category_ids = ARRAY[
  'aburasoba',
  'hiyashi',
  'shio',
  'shoyu',
  'tori'
]::TEXT[]
WHERE name LIKE '멘츠루%';

UPDATE shops
SET menu_category_ids = ARRAY['aburasoba', 'shio', 'shoyu', 'tori']::TEXT[]
WHERE name = '멘츠루 을지로점';

UPDATE shops
SET menu_category_ids = ARRAY['tori']::TEXT[]
WHERE name = '오레노라멘 롯데월드몰점';

UPDATE shops
SET menu_category_ids = ARRAY['tonkotsu']::TEXT[]
WHERE name = '라멘쨩';

UPDATE shops
SET menu_category_ids = ARRAY['hiyashi']::TEXT[]
WHERE name = '건담S';

UPDATE shops
SET menu_category_ids = ARRAY['aburasoba', 'tonkotsu']::TEXT[]
WHERE name LIKE '한창희천하일면%';

UPDATE shops
SET menu_category_ids = ARRAY['tori']::TEXT[]
WHERE name LIKE '라무라%';

UPDATE shops
SET menu_category_ids = ARRAY['mazesoba', 'tonkotsu']::TEXT[]
WHERE name = '멘노아지 성수점';

UPDATE shops
SET menu_category_ids = ARRAY['tsukemen']::TEXT[]
WHERE name = '토리코코로 공릉직영점';

UPDATE shops
SET menu_category_ids = ARRAY['tonkotsu']::TEXT[]
WHERE name = '햐쿠운';

UPDATE shops
SET menu_category_ids = ARRAY['mazesoba', 'miso', 'shio', 'shoyu']::TEXT[]
WHERE name = '토리코코로 별내본점';

UPDATE shops
SET menu_category_ids = ARRAY['hiyashi', 'tonkotsu']::TEXT[]
WHERE name = '친치쿠린 부산점';

UPDATE shops
SET menu_category_ids = ARRAY['tomato']::TEXT[]
WHERE name LIKE '태양의토마토라멘%';

UPDATE shops
SET menu_category_ids = ARRAY['iekei', 'mazesoba', 'tonkotsu']::TEXT[]
WHERE name = '칸다소바 신세계백화점 대구점'
  AND kakao_place_id = '74698886';

UPDATE shops
SET menu_category_ids = ARRAY['shoyu', 'tonkotsu']::TEXT[]
WHERE name = '라멘쿠우';

UPDATE shops
SET menu_category_ids = ARRAY['shio', 'shoyu', 'tori']::TEXT[]
WHERE name = '멘지'
   OR name LIKE '멘지 %';

UPDATE shops
SET menu_category_ids = (
  SELECT ARRAY(
    SELECT DISTINCT category
    FROM unnest(menu_category_ids || ARRAY['tonkotsu']::TEXT[]) AS category
    ORDER BY category
  )
)
WHERE name LIKE '코이라멘%';

UPDATE shops
SET menu_category_ids = ARRAY['iekei', 'tori']::TEXT[]
WHERE name = '니시카사이';

UPDATE shops
SET menu_category_ids = ARRAY['shio', 'shoyu']::TEXT[]
WHERE name = '이로치';

UPDATE shops
SET menu_category_ids = ARRAY['shio', 'shoyu', 'tsukemen']::TEXT[]
WHERE name = '소금제면소 용산점';

UPDATE shops
SET menu_category_ids = ARRAY['tonkotsu']::TEXT[]
WHERE name = '주오일심야라멘';

UPDATE shops
SET menu_category_ids = ARRAY[
  'aburasoba',
  'mazesoba',
  'niboshi_gyokai',
  'shoyu'
]::TEXT[]
WHERE name = '타치바나 신세계백화점 강남점'
  AND kakao_place_id = '901974761';

UPDATE shops
SET menu_category_ids = ARRAY['mazesoba']::TEXT[]
WHERE name LIKE '멘야하나비%';

UPDATE shops
SET menu_category_ids = ARRAY['shio', 'shoyu', 'tori']::TEXT[]
WHERE name = '시카메이';

UPDATE shops
SET menu_category_ids = ARRAY['iekei']::TEXT[]
WHERE name = '멘야카엔';

UPDATE shops
SET menu_category_ids = ARRAY['miso']::TEXT[]
WHERE name = '시시오';

DELETE FROM shops
WHERE name LIKE '마카나이%'
   OR name LIKE '오로지라멘%';
