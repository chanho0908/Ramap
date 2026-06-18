# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ramap (라맵) is a map-based ramen shop discovery platform for ramen enthusiasts (라오타). The project uses a Turborepo monorepo structure with Next.js 15 web app and Expo mobile app sharing common business logic through packages.

**Tech Stack:**
- Frontend: Next.js 15 (App Router) + Expo (React Native)
- Backend: Supabase (PostgreSQL, Storage, Realtime)
- Map: Kakao Map API (Korea), Google Maps API (Japan, planned)
- Monorepo: Turborepo + pnpm workspaces

## Critical: Agent Orchestration System

**⚠️ This repository uses an AI Agent orchestration system. You MUST follow these rules:**

1. **Read AGENTS.md first** - It contains the top-level orchestration policy
2. **Never work alone** - Delegate all tasks to specialized agents
3. **Follow the standard workflow** - Issue → Branch → Plan → Implement → Test → Commit → PR
4. **Always create feature branches** - Never commit directly to `develop` or `main`
5. **Use Korean for commit messages** - Type/scope in English, subject/body in Korean

### Agent Routing Table

| User Request | Agent | Path |
|-------------|-------|------|
| "찾아줘", "탐색", "어디에" | explore | `.codex/agents/tier1/explore.md` |
| "문서 작성", "README" | writer | `.codex/agents/tier1/writer.md` |
| "계획", "설계", "어떻게" | planner | `.codex/agents/tier2/planner.md` |
| "구현", "만들어", "추가" | implementer | `.codex/agents/tier2/implementer.md` |
| "테스트" | tester | `.codex/agents/tier2/tester.md` |
| "리뷰", "검토" | code-reviewer | `.codex/agents/tier2/code-reviewer.md` |
| "커밋" | committer | `.codex/agents/tier2/committer.md` |
| "PR", "Pull Request" | pr-creator | `.codex/agents/tier2/pr-creator.md` |

Canonical role prompts live under `.codex/agents/tier1/` and `.codex/agents/tier2/`.
Codex native adapters live in `.codex/agents/*.toml`, and Claude Code native project subagents live in `.claude/agents/*.md`.

**Workflow example:**
```bash
# 1. Create issue
gh issue create --title "feat(map): add shop markers"

# 2. Create feature branch
git checkout -b feature/42-add-shop-markers

# 3. planner → implementer → tester → code-reviewer → committer → pr-creator
# 4. User reviews and merges on GitHub
```

## Development Commands

### Install and Setup
```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with Supabase URL, keys, and Kakao Map API key
```

### Development
```bash
# Run web app (Next.js with Turbopack)
pnpm dev:web

# Run mobile app (Expo)
pnpm dev:mobile

# Run both apps
pnpm dev
```

### Build
```bash
# Build web app
pnpm build:web

# Build mobile app
pnpm build:mobile

# Build all apps
pnpm build
```

### Testing and Linting
```bash
# Type check across all packages
pnpm type-check

# Lint all code
pnpm lint

# Lint and auto-fix
pnpm lint:fix

# Format all code
pnpm format
```

### Supabase (Local Development)
```bash
# Start Supabase locally
supabase start

# Apply migrations
supabase db reset

# Access local Studio
# http://localhost:54323
```

### Clean
```bash
# Clean all build artifacts and node_modules
pnpm clean
```

## Architecture

### Monorepo Structure
```
Ramap/
├── apps/
│   ├── web/              # Next.js 15 (App Router)
│   └── mobile/           # Expo (React Native)
├── packages/
│   ├── shared/           # Shared business logic
│   │   ├── api/          # Supabase API functions
│   │   ├── types/        # TypeScript interfaces
│   │   └── utils/        # Utilities
│   └── ui/               # Shared UI components (optional)
├── supabase/
│   ├── migrations/       # Database schema
│   └── functions/        # Edge Functions
├── wiki/                 # Project knowledge base
│   ├── reference/        # Technical docs (domain-glossary, architecture)
│   └── operations/       # Workflows and procedures
├── .codex/agents/        # Canonical role docs and Codex native TOML adapters
└── .claude/agents/       # Claude Code native project subagents
```

### Domain Model

**Core Entities** (see `wiki/reference/domain-glossary.md` for official definitions):

- **Shop**: Ramen restaurant (id, name, address, location, description)
- **Review**: User review with rating (1-5), content, and photos
- **Checkin**: Visit record to a shop
- **User**: Optional user account (anonymous usage supported)
- **Location**: Geographic coordinates (lat, lng)

### Database Schema

The Supabase schema is defined in `supabase/migrations/20260616000001_init_schema.sql`:

- `shops` - Ramen shops with geolocation (indexed on lat/lng)
- `users` - Optional user accounts
- `reviews` - Reviews linked to shops (with photos array)
- `checkins` - Visit records

**Row Level Security (RLS):**
- Public read access on all tables
- Anonymous write access for reviews and checkins
- Authenticated users can update/delete their own content

### Shared Code Pattern

Business logic and types are centralized in `packages/shared/`:
- API functions use Supabase client
- TypeScript interfaces match database schema (snake_case → camelCase)
- Both web and mobile apps import from `@ramap/shared`

### Git Workflow

**Branch Strategy (Git Flow):**
- `main` - Production releases
- `develop` - Integration branch
- `feature/<issue-number>-<description>` - Feature work
- `fix/<issue-number>-<description>` - Bug fixes
- `hotfix/<issue-number>-<description>` - Urgent fixes

**Commit Convention:**
```
<type>(<scope>): <한국어 제목>

<한국어 본문>

Closes #<issue-number>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** feat, fix, docs, style, refactor, test, chore
**Scopes:** web, mobile, api, shared, map, review, auth, agents

## Key Reference Documents

### Essential Documentation
- `AGENTS.md` - AI orchestration policy (READ THIS FIRST)
- `README.md` - Project overview and setup
- `wiki/reference/domain-glossary.md` - Official terminology
- `wiki/operations/workflows.md` - Development workflow details

### Domain Terminology

**Always use official terms from `wiki/reference/domain-glossary.md`:**

✅ Use: `Shop`, `Review`, `Checkin`, `Location`
❌ Don't use: `Store`, `Restaurant`, `Visit`, `Rating`

**Naming Conventions:**
- API functions: `fetchShops()`, `createReview()`, `updateShop()`
- Components: `ShopCard`, `ReviewForm`, `MapView`, `CheckinButton`
- Files: `ShopCard.tsx`, `shop-utils.ts`, `fetchShops.test.ts`

## Environment Variables

**Web app (apps/web/.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_KAKAO_MAP_KEY=your-kakao-map-key
```

**Mobile app (apps/mobile/.env):**
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Current Development Phase

**Phase 1: Completed ✅**
- Monorepo setup
- Supabase schema
- Agent system

**Phase 2: Next (Map & Search)**
- Kakao Map API integration
- Shop markers on map
- Location-based search
- Shop detail pages

## Important Notes

1. **Never auto-merge PRs** - AI agents create Draft PRs only; humans must review and merge
2. **Get approval for git operations** - Explicit user approval required for commits and PRs (except explicit "커밋해줘" / "PR 만들어줘")
3. **Model-agnostic system** - The agent system works with Claude, GPT, Gemini, and all AI coding tools
4. **Korean commit messages** - Type and scope in English, subject and body in Korean
5. **Domain terminology** - Always reference `wiki/reference/domain-glossary.md` for official terms
