---
authority: canonical
---

# Add Shop To Supabase

Kakao Map 매장 URL을 기준으로 Ramap Supabase 데이터베이스의 `public.shops`에 Shop을 추가하거나 기존 Shop 변경사항을 확인하는 공통 운영 절차입니다.

이 문서는 Claude Code, Codex, Cursor, Windsurf 등 특정 AI 도구에 의존하지 않는 기준 문서입니다. 도구별 Skill, command, subagent adapter는 이 문서를 참조하는 얇은 어댑터로만 유지합니다.

## 트리거

슬래시 커맨드:

```text
/add-shop <kakao_place_url> [instagram_url] [menu keywords...]
```

예시:

```text
/add-shop https://place.map.kakao.com/1248771383 https://www.instagram.com/mokoshiya 토리 마제소바
/add-shop https://place.map.kakao.com/329108859#menuInfo 시오 어패류
```

자연어로 “이 카카오맵 주소를 데이터베이스에 추가해줘”처럼 요청해도 같은 절차를 따릅니다.

## 입력 파싱

추출 항목:

- Kakao Map URL
- `kakao_place_id`
- 선택 입력: Instagram URL
- 선택 입력: 메뉴 키워드

Kakao URL은 다음 형태로 정규화합니다.

```text
https://place.map.kakao.com/<place_id>
```

지원 형태:

- `http://place.map.kakao.com/<place_id>`
- `https://place.map.kakao.com/<place_id>`
- `https://place.map.kakao.com/<place_id>#menuInfo`

## 메뉴 카테고리 매핑

Ramap canonical `menu_category_ids`:

| ID | Label | Keywords |
| --- | --- | --- |
| `shoyu` | 쇼유 | 쇼유, 간장 |
| `shio` | 시오 | 시오, 시오라멘, 소금라멘, 쿠로시오 |
| `miso` | 미소 | 미소, 된장 |
| `tonkotsu` | 돈코츠 | 돈코츠, 돈코쓰, 돼지뼈 |
| `tori` | 토리 | 토리, 닭, 치킨, 토리파이탄, 토리빠이탄, 닭백탕 |
| `tsukemen` | 츠케멘 | 츠케멘, 쯔케멘 |
| `mazesoba` | 마제소바 | 마제소바, 마제, 비빔 |
| `aburasoba` | 아부라소바 | 아부라소바, 아부라, 유소바 |
| `niboshi_gyokai` | 니보시/어패류 | 니보시, 멸치, 어패, 어패류, 교카이, 카츠오, 가다랑어 |
| `iekei` | 이에케 | 이에케, 이에케이, 요코하마 |
| `chukasoba` | 츄카소바 | 츄카소바, 중화소바 |
| `tomato` | 토마토라멘 | 토마토, 토마토라멘 |

규칙:

- 사용자 입력 순서를 가능한 유지합니다.
- 중복 ID는 제거합니다.
- 알 수 없는 메뉴 단어는 임의 ID로 저장하지 않습니다.
- 메뉴 키워드가 애매하거나 매핑되지 않으면 DB 쓰기 전에 사용자에게 확인합니다.

## Kakao Place 재조회

DB를 쓰기 전에 Kakao Place 정보를 다시 조회합니다.

우선순위:

1. 로컬 `KAKAO_REST_API_KEY`가 있으면 Kakao Local keyword search 사용
2. Kakao Place HTML meta 태그 파싱

HTML meta fallback에서 추출할 값:

- `og:title` 또는 `twitter:title`: `name`
- `og:description` 또는 `twitter:description`: `address`
- `twitter:image`의 static map query `m=<lng>,<lat>`: `lng`, `lat`

필수 값:

- `name`
- `address`
- `lat`
- `lng`
- `kakao_place_id`
- `kakao_place_url`

필수 값 중 하나라도 확인할 수 없으면 멈추고 사용자에게 누락 값을 요청합니다.

## Supabase 테이블

대상:

- Project: `ramap`
- Schema: `public`
- Table: `shops`

삽입 필수 컬럼:

```text
name              varchar
address           text
lat               numeric
lng               numeric
kakao_place_id    varchar unique
kakao_place_url   text
```

주요 선택 컬럼:

```text
phone              varchar nullable
instagram_url      varchar nullable
menu_category_ids  text[] default '{}'
is_visible         boolean default true
updated_at         timestamptz default now()
```

## 기존 Shop 조회

Supabase MCP 또는 동등한 DB 접근 도구로 조회합니다.

```sql
select id, name, address, lat, lng, kakao_place_id, kakao_place_url,
       phone, instagram_url, menu_category_ids, is_visible
from public.shops
where kakao_place_id = '<place_id>'
   or kakao_place_url in (
     'https://place.map.kakao.com/<place_id>',
     'http://place.map.kakao.com/<place_id>'
   );
```

## 기존 Shop이 있는 경우

먼저 사용자에게 알립니다.

```text
<name> 매장이 존재합니다.
```

기존 DB 값과 재조회/사용자 입력 값을 비교합니다.

비교 대상:

- `name`
- `address`
- `lat`
- `lng`
- `phone`
- `kakao_place_url`
- `instagram_url`
- `menu_category_ids`
- `is_visible`

좌표는 `0.000001` 미만 차이는 무시합니다.

변경 사항이 없으면:

```text
변경된 매장 정보가 없습니다.
```

변경 사항이 있으면 diff를 보여주고 확인을 받습니다.

```text
다음 정보가 변경되었습니다.

- address: <old> -> <new>
- phone: <old> -> <new>

수정하시겠습니까?
```

사용자가 승인하기 전에는 기존 row를 수정하지 않습니다.

## 기존 Shop이 없는 경우

사용자에게 추가 여부를 묻지 않고 즉시 추가합니다.

`on conflict (kakao_place_id)`는 안전장치로 사용하되, 이 경로는 기존 Shop 조회 결과가 없을 때만 실행합니다.

```sql
insert into public.shops (
  name,
  address,
  lat,
  lng,
  kakao_place_url,
  kakao_place_id,
  phone,
  instagram_url,
  menu_category_ids,
  is_visible,
  updated_at
)
values (
  '<name>',
  '<address>',
  <lat>,
  <lng>,
  'https://place.map.kakao.com/<place_id>',
  '<place_id>',
  <phone_or_null>,
  <instagram_url_or_null>,
  <menu_category_ids_array>,
  true,
  now()
)
on conflict (kakao_place_id) do update set
  name = excluded.name,
  address = excluded.address,
  lat = excluded.lat,
  lng = excluded.lng,
  kakao_place_url = excluded.kakao_place_url,
  phone = excluded.phone,
  instagram_url = excluded.instagram_url,
  menu_category_ids = excluded.menu_category_ids,
  is_visible = excluded.is_visible,
  updated_at = now()
returning id, name, address, lat, lng, kakao_place_id, kakao_place_url,
          phone, instagram_url, menu_category_ids, is_visible;
```

`menu_category_ids` 예시:

```sql
array['tori','mazesoba']::text[]
```

메뉴가 없으면:

```sql
'{}'::text[]
```

## 승인된 기존 Shop 수정

사용자가 기존 Shop 수정을 승인한 경우에만 실행합니다.

```sql
update public.shops
set
  name = '<name>',
  address = '<address>',
  lat = <lat>,
  lng = <lng>,
  kakao_place_url = 'https://place.map.kakao.com/<place_id>',
  phone = <phone_or_null>,
  instagram_url = <instagram_url_or_null>,
  menu_category_ids = <menu_category_ids_array>,
  is_visible = true,
  updated_at = now()
where kakao_place_id = '<place_id>'
returning id, name, address, lat, lng, kakao_place_id, kakao_place_url,
          phone, instagram_url, menu_category_ids, is_visible;
```

## 검증

추가 또는 승인된 수정 후 반드시 재조회합니다.

```sql
select name, address, lat, lng, kakao_place_id, kakao_place_url,
       phone, instagram_url, menu_category_ids, is_visible
from public.shops
where kakao_place_id = '<place_id>';
```

최종 응답에는 다음만 간결히 포함합니다.

- 추가 또는 수정 여부
- Shop 이름
- Kakao Place ID
- 메뉴 카테고리 ID
- Supabase 재조회 검증 완료 여부
