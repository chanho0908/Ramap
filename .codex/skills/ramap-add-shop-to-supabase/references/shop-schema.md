# Shop Schema

Target project:

- Supabase project name: `ramap`
- Schema: `public`
- Table: `shops`

Required columns for insertion:

```text
name              varchar
address           text
lat               numeric
lng               numeric
kakao_place_id    varchar unique
kakao_place_url   text
```

Common optional columns:

```text
phone              varchar nullable
instagram_url      varchar nullable
menu_category_ids  text[] default '{}'
is_visible         boolean default true
updated_at         timestamptz default now()
```

## Insert Template

Use Supabase MCP `execute_sql`.

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

For `menu_category_ids`, use:

```sql
array['tori','mazesoba']::text[]
```

or:

```sql
'{}'::text[]
```

## Existing Update Template

Only run this after the user confirms an update for an existing row.

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
