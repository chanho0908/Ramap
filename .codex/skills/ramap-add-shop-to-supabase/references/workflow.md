# Workflow

## 1. Parse Input

Accept either `/add-shop` or a natural language request.

Extract:

- Kakao Map URL
- `kakao_place_id`
- optional Instagram URL
- optional menu keywords

Normalize Kakao URLs to:

```text
https://place.map.kakao.com/<place_id>
```

Support:

- `http://place.map.kakao.com/<place_id>`
- `https://place.map.kakao.com/<place_id>`
- URLs with fragments such as `#menuInfo`

## 2. Resolve Menu Categories

Read `menu-category-mapping.md` when menu keywords are present.

If all keywords map cleanly, use the canonical IDs.

If a menu keyword is ambiguous or unknown, do not invent a category. Ask the user to clarify before writing the database.

## 3. Refresh Kakao Place Data

Preferred lookup order:

1. Use Kakao Local keyword search when local `KAKAO_REST_API_KEY` is available.
2. Fetch the Kakao Place HTML and parse meta tags:
   - `og:title` or `twitter:title` for name
   - `og:description` or `twitter:description` for address
   - `twitter:image` static map query parameter `m=<lng>,<lat>` for coordinates

Capture:

- `name`
- `address`
- `lat`
- `lng`
- `phone` when available
- `kakao_place_id`
- normalized `kakao_place_url`

If name, address, or coordinates cannot be resolved, stop and ask for the missing data.

## 4. Find Existing Shop

Use Supabase MCP `execute_sql`:

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

## 5. Existing-Shop Flow

When a row exists, say:

```text
<name> 매장이 존재합니다.
```

Compare existing values against refreshed/user-provided values:

- `name`
- `address`
- `lat`
- `lng`
- `phone`
- `kakao_place_url`
- `instagram_url`
- `menu_category_ids`
- `is_visible`

Ignore tiny coordinate precision differences below `0.000001`.

If no values changed:

```text
변경된 매장 정보가 없습니다.
```

If values changed, show the diff and ask:

```text
수정하시겠습니까?
```

Do not update until the user confirms.

## 6. New-Shop Flow

When no row exists, insert immediately without asking the user.

Use `on conflict (kakao_place_id)` as a safety guard, but this path should only run after the existing-shop lookup returns no row.

Required values:

- `name`
- `address`
- `lat`
- `lng`
- `kakao_place_id`
- `kakao_place_url`

Optional values:

- `phone`
- `instagram_url`
- `menu_category_ids`

Set `is_visible` to `true`.

## 7. Verification

After insert or confirmed update, query Supabase again:

```sql
select name, address, lat, lng, kakao_place_id, kakao_place_url,
       phone, instagram_url, menu_category_ids, is_visible
from public.shops
where kakao_place_id = '<place_id>';
```

Final response should briefly state:

- added or updated
- shop name
- Kakao Place ID
- menu category IDs
- verification completed
