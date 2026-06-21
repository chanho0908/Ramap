-- Fill missing Kakao Map URLs from Kakao Place IDs.
UPDATE shops
SET kakao_place_url = 'https://place.map.kakao.com/' || kakao_place_id
WHERE (kakao_place_url IS NULL OR kakao_place_url = '')
  AND kakao_place_id IS NOT NULL
  AND kakao_place_id <> '';
