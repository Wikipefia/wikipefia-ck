# Wikipefia Admin

Internal management console for the Wikipefia project. Next.js app on port `2486`,
built on the shared Convex backend (`@wikipefia/convex`).

## Sections

- **Overview** — project health: counts by type, config integrity summary, repos
  that need attention.
- **Subjects** — register / edit / delete projects (subjects, teachers, system).
  Backed by `api.projects.{create,update,remove}`.
- **Repositories** — sync content repos from GitHub (`api.github.{discoverRepos,
  syncProject}`) and validate each repo's `config.json` against the canonical Zod
  schemas in `@wikipefia/mdx-compiler/schemas` (see `lib/config-integrity.ts`).
- **Moderation** — placeholder (next iteration).
- **AI** — placeholder. Will manage usage stats, API keys, service on/off switches,
  and prompt overrides via the Convex `settings` table.

## Develop

```bash
pnpm --filter admin dev      # http://localhost:2486
pnpm --filter admin build
pnpm --filter admin lint
```

Requires `NEXT_PUBLIC_CONVEX_URL` (shared `.env.local`). Repo discovery/sync also
needs the `GITHUB_APP_*` vars set on the Convex deployment. There is no auth yet
(matches studio/chat); a gate can be added later.
