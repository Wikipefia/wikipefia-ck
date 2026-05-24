# Wikipefia Chat

AI tutor app built on top of `@wikipefia/chat` — a reusable chat module — and Convex backend.

## Architecture

- **`@wikipefia/chat`** — UI components, hooks, types, widget→tool generation. Reusable in studio.
- **`apps/chat`** (this app) — Next.js 16, port 1488. Wires the chat package to Convex backend, configures models, system prompt, theming.
- **`/convex/convex/`** — Backend: schema, queries/mutations, agent action that calls OpenRouter via Vercel AI SDK in agent mode with tool-call streaming through `@convex-dev/agent`.

Each thread runs entirely on the Convex server. The client subscribes via Convex sync (`useUIMessages`) — no direct HTTP streaming. Closing a tab does NOT stop generation; multiple threads run concurrently.

**Identity:** v1 has no auth. Each browser gets a stable anonymous session id stored in localStorage; threads are scoped to that id. Auth can be added later if needed (the userId field is already wired through every Convex function).

## Setup

1. Install dependencies from monorepo root:
   ```bash
   pnpm install
   ```

2. **Bootstrap Convex** (first time only):
   ```bash
   pnpm convex:bootstrap
   ```
   This runs `npx convex dev --typecheck=disable` from inside the `convex/` package. It pushes the schema + the `@convex-dev/agent` component and regenerates `_generated/api.d.ts` to include `components.agent.*` and `internal.chat.*` references.

   The `--typecheck=disable` is required ONLY on the very first push, because TypeScript can't resolve the agent component types until the component is registered with the deployment (chicken-and-egg). After this first successful push, codegen produces the missing types, and all subsequent runs typecheck normally.

   Follow the CLI prompts to create or select a Convex deployment. This populates `.env.local` with `NEXT_PUBLIC_CONVEX_URL`.

3. **Subsequent Convex dev runs** (after bootstrap):
   ```bash
   pnpm convex:dev
   ```
   Watches your Convex source files, regenerates types on save, and pushes changes. Keep this running in a terminal alongside the Next.js dev server.

4. Set the OpenRouter API key in your Convex deployment:
   ```bash
   cd convex && npx convex env set OPENROUTER_API_KEY sk-or-...
   ```

5. Run the app:
   ```bash
   cd apps/chat && pnpm dev
   ```
   Visit http://localhost:1488.

   In a separate terminal, keep `pnpm convex:dev` running so backend changes auto-deploy.

## Required env vars

| Var | Where | Purpose |
| --- | ----- | ------- |
| `NEXT_PUBLIC_CONVEX_URL` | Next.js (`.env.local`) | Convex deployment URL |
| `OPENROUTER_API_KEY` | Convex (`npx convex env set`) | OpenRouter access for AI models |

## Smoke test

After `pnpm dev`:

1. Open http://localhost:1488 — anonymous session id auto-generated.
2. Type a message in the welcome composer → new thread created and assistant streams response.
3. Ask "Дай мне квиз про митохондрии" → Quiz widget renders, pick answers, submit → tutor explains.
4. Close the tab while assistant is generating → re-open the thread → message either completed or still streaming.
5. Open the same thread in a second tab (same browser) → both views are synchronized.

## Models

Edit `lib/models.ts` to add or remove OpenRouter-routed models. Each model declares image/PDF support; the UI gates incompatible files automatically.

## Notes

- localStorage session ID lives at key `wikipefia-chat:session-id`. Clearing it loses access to existing threads (they remain in Convex but are no longer reachable from this browser).
- Thread isolation is per-session (per-browser). Different browsers / private windows = different threads.
- When auth is added later, migrate by reading the existing session id and binding it to the user record.
