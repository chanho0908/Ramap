---
name: ramap-add-shop-to-supabase
description: Use when the user runs /add-shop or asks to add a Kakao Map shop URL to the Ramap Supabase database using Supabase MCP. Handles Kakao Place lookup, existing-shop comparison, automatic insertion for new shops, and confirmation-gated updates for existing shops.
---

# Ramap Add Shop To Supabase

Use this skill to add or refresh one Ramap Shop from a Kakao Map place URL.

## Required Tools

- Supabase MCP tools, especially `list_projects`, `list_tables`, and `execute_sql`.
- Local Kakao REST API credentials when available for lookup fallback.

## Command

Primary slash command:

```text
/add-shop <kakao_place_url> [instagram_url] [menu keywords...]
```

Examples:

```text
/add-shop https://place.map.kakao.com/1248771383 https://www.instagram.com/mokoshiya 토리 마제소바
/add-shop https://place.map.kakao.com/329108859#menuInfo 시오 어패류
```

Natural language requests with the same information should follow the same workflow.

## Core Rules

1. Extract `kakao_place_id` from the Kakao Map URL. Strip fragments such as `#menuInfo`.
2. Re-fetch Kakao Place data before touching Supabase.
3. Query `public.shops` by `kakao_place_id` and normalized `kakao_place_url`.
4. If no existing Shop is found, insert immediately without asking the user for confirmation.
5. If an existing Shop is found, compare DB values with refreshed values.
6. Ask for confirmation only before updating an existing row.
7. Always verify the final database state with a follow-up Supabase query.

## References

Read only the references needed for the current task:

- `references/workflow.md`: end-to-end command parsing, lookup, compare, insert, update, and final response workflow.
- `references/shop-schema.md`: Supabase `public.shops` columns and SQL templates.
- `references/menu-category-mapping.md`: canonical Ramap menu category IDs and keyword mapping.

## User-Facing Responses

For an existing Shop:

```text
<name> 매장이 존재합니다.
```

If values changed, show a concise diff and ask:

```text
다음 정보가 변경되었습니다.

- address: <old> -> <new>
- phone: <old> -> <new>

수정하시겠습니까?
```

If values did not change:

```text
변경된 매장 정보가 없습니다.
```

For a new Shop, do not ask before insert. After verification:

```text
<name> 매장을 추가했습니다.

- Kakao Place ID: <id>
- 메뉴: <menu_category_ids>
- 검증: Supabase 재조회 완료
```
