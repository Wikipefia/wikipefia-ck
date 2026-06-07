# Wikipefia Library

Upload and store files categorized by subject, each with extensive structured
metadata, comments + threaded replies, tags, and 1–5 ratings.

## How storage works

1. The client uploads the file to **UploadThing** (a temporary CDN).
2. UploadThing's `onUploadComplete` callback (server-side, in
   `app/api/uploadthing/core.ts`) calls the Convex action
   `api.library.ingest.ingestFromUploadThing`, which fetches the bytes and
   stores them permanently in **Convex Storage** (`_storage`).
3. The temporary UploadThing copy is then deleted.

So Convex Storage is the permanent home for every file; UploadThing is only a
transient hop during upload.

## Dev

```bash
# From the repo root, with Convex running (pnpm convex:dev):
pnpm --filter library dev
# → http://localhost:1700
```

## Env

- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL (shared, repo root `.env.local`).
- `UPLOADTHING_TOKEN` — UploadThing app token. Get one at
  https://uploadthing.com/dashboard → API Keys.

## Future: transcription service

The schema + `convex/library/transcriptions.ts` lay the groundwork for a future
service that attaches a markdown transcription to each file. No transcription
actually runs yet — "Request transcription" only flips the status to `pending`.
