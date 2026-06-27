---
name: ramap-add-shop-to-supabase
description: Use when the user runs /add-shop or asks to add a Kakao Map shop URL to the Ramap Supabase database using Supabase MCP. Handles Kakao Place lookup, existing-shop comparison, automatic insertion for new shops, and confirmation-gated updates for existing shops.
---

# Ramap Add Shop To Supabase

Codex adapter for adding or refreshing one Ramap Shop from a Kakao Map place URL.

The canonical, tool-neutral workflow lives in:

```text
wiki/operations/add-shop-to-supabase.md
```

Read that document completely before performing the task. Treat this Skill as a thin Codex trigger, not as the source of truth.

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

## Adapter Rules

1. Do not duplicate workflow details here. Update `wiki/operations/add-shop-to-supabase.md` first when behavior changes.
2. Use Supabase MCP for DB reads/writes when available.
3. Preserve the canonical behavior: new Shops are inserted without confirmation; existing Shops require confirmation before update.
4. Verify final DB state by re-querying Supabase.
