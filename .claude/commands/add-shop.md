---
description: Add a Kakao Map shop URL to the Ramap Supabase database.
argument-hint: "<kakao_place_url> [instagram_url] [menu keywords...]"
---

Read `AGENTS.md` first, then follow the canonical workflow in `wiki/operations/add-shop-to-supabase.md`.

Use the user's arguments as the `/add-shop` input:

```text
$ARGUMENTS
```

Keep this Claude command as a thin adapter. If the add-shop behavior changes, update `wiki/operations/add-shop-to-supabase.md` first.
