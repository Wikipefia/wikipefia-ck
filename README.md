# Wikipefia Monorepo

Monorepo for Wikipefia apps, shared packages, and Convex backend.

## Structure

```txt
apps/
  portal/       Public portal
  studio/       Content editing tool
  chat/         AI tutor chat
convex/         Convex backend
packages/
  chat/         Reusable chat module
  mdx-renderer/ Shared MDX renderer/components
  mdx-compiler/ Shared MDX compiler/validator
  eslint-config/
  typescript-config/
  ui/
```

## Apps

### `apps/portal`

Main public portal.

- Next.js app, port `2288`
- renders compiled MDX content
- supports localized content/routes
- pulls content sources from `apps/portal/content-sources.json`
- generates compiled content, route maps, and search indexes during build

```bash
pnpm --filter portal dev
pnpm --filter portal build:local
pnpm --filter portal content:pull
pnpm --filter portal content:compile
pnpm --filter portal content:validate
```

### `apps/studio`

Content editing tool for subject/system/teacher content.

- Next.js app, port `1986`
- MDX editor with live preview
- uses shared MDX compiler and renderer
- uses Convex for app state

```bash
pnpm --filter studio dev
pnpm --filter studio build
pnpm --filter studio lint
pnpm --filter studio format
```

### `apps/chat`

AI tutor chat app.

- Next.js app, port `1488`
- uses `@wikipefia/chat`
- stores chat state in Convex
- uses OpenRouter through Convex actions

```bash
pnpm --filter chat dev
pnpm --filter chat check-types
pnpm --filter chat build
```

More details: `apps/chat/README.md`.

## Backend

### `convex`

Shared Convex backend.

- exports generated API as `@wikipefia/convex/api`
- contains project functions for Studio
- contains chat threads/messages/files and agent actions for Chat

```bash
pnpm convex:bootstrap  # first setup
pnpm convex:dev        # local dev
pnpm convex:deploy
pnpm convex:codegen
```

Set chat model credentials in Convex:

```bash
cd convex
npx convex env set OPENROUTER_API_KEY sk-or-...
```

## Packages

### `@wikipefia/mdx-renderer`

Shared MDX rendering package.

- component registry
- MDX components
- typography helpers
- theme tokens
- component labels/metadata

Used by Portal, Studio previews, and Chat widgets.

### `@wikipefia/mdx-compiler`

Shared MDX compiler and validator.

- content schemas
- MDX validation
- MDX compilation
- component contract checks
- `wikipefia-mdx` CLI

Used by Portal content builds and Studio.

### `@wikipefia/chat`

Reusable chat package.

- React chat UI
- hooks
- modes and prompt fragments
- widget/tool helpers
- Convex transport

Used by `apps/chat` and Convex chat actions.

### Tooling

- `@repo/eslint-config` - shared ESLint config
- `@repo/typescript-config` - shared TypeScript config

## Local Setup

```bash
pnpm install
```

Run everything:

```bash
pnpm dev
```

Run one app:

```bash
pnpm --filter portal dev
pnpm --filter studio dev
pnpm --filter chat dev
```

Ports:

| App | URL |
| --- | --- |
| Portal | `http://localhost:2288` |
| Studio | `http://localhost:1986` |
| Chat | `http://localhost:1488` |

## Root Commands

```bash
pnpm build
pnpm lint
pnpm check-types
pnpm format
pnpm convex:dev
```

## Env Vars

| Var | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Studio, Chat | Convex deployment URL |
| `OPENROUTER_API_KEY` | Convex | Set with `npx convex env set` |

Common local env files:

- `.env.local`
- `apps/*/.env.local`
- `convex/.env.local`

## Content Build

Portal content is generated from external content repos:

1. `content:pull` pulls repos from `apps/portal/content-sources.json`
2. `content:compile` validates and compiles MDX
3. output goes to `apps/portal/.content-build`

Generated content/build folders are not source of truth.
