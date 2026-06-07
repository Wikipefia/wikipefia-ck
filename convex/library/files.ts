import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  query,
  mutation,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * Library file helpers. Mirrors the style of `convex/chat/files.ts`.
 *
 * The actual file bytes live in Convex Storage (`_storage`). A `libraryFiles`
 * row holds the storage id plus rich metadata. Tags live in the
 * `libraryFileTags` join table; ratings are aggregated denormally on the file
 * row (`ratingCount` / `ratingSum`) so the average is a cheap derived value.
 */

/** Shared validator for the document-type union (kept in sync with schema). */
export const documentTypeValidator = v.union(
  v.literal("lecture"),
  v.literal("textbook"),
  v.literal("exam"),
  v.literal("notes"),
  v.literal("article"),
  v.literal("presentation"),
  v.literal("other"),
);

/** Fetch a file's tags (bounded — a single file shouldn't have many tags). */
async function tagsForFile(
  ctx: QueryCtx,
  fileId: Id<"libraryFiles">,
): Promise<string[]> {
  const rows = await ctx.db
    .query("libraryFileTags")
    .withIndex("by_file", (q) => q.eq("fileId", fileId))
    .take(100);
  return rows.map((r) => r.tag);
}

/** Adjust the denormalized per-subject file counter by `delta` (±1). */
async function bumpSubjectCount(
  ctx: MutationCtx,
  subjectId: Id<"projects">,
  delta: number,
) {
  const stats = await ctx.db
    .query("librarySubjectStats")
    .withIndex("by_subject", (q) => q.eq("subjectId", subjectId))
    .first();
  if (stats) {
    await ctx.db.patch(stats._id, {
      fileCount: Math.max(0, stats.fileCount + delta),
    });
  } else if (delta > 0) {
    await ctx.db.insert("librarySubjectStats", { subjectId, fileCount: delta });
  }
}

/** Shape returned to the UI: the file doc + its tags + derived rating avg. */
function withRatingAvg(file: Doc<"libraryFiles">, tags: string[]) {
  return {
    ...file,
    tags,
    ratingAvg: file.ratingCount > 0 ? file.ratingSum / file.ratingCount : 0,
  };
}

/**
 * Insert a new file row plus its tag rows. Internal — called by the
 * `ingestFromUploadThing` action after the blob is stored in Convex Storage.
 */
export const create = internalMutation({
  args: {
    storageId: v.id("_storage"),
    subjectId: v.id("projects"),
    subjectSlug: v.string(),
    originalName: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    contentType: v.string(),
    size: v.number(),
    documentType: documentTypeValidator,
    language: v.optional(v.string()),
    year: v.optional(v.number()),
    authorName: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    pageCount: v.optional(v.number()),
    customFields: v.optional(v.record(v.string(), v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { tags, ...fileFields } = args;
    const fileId = await ctx.db.insert("libraryFiles", {
      ...fileFields,
      ratingCount: 0,
      ratingSum: 0,
      transcriptionStatus: "none",
    });

    // Insert tag rows, de-duplicated and normalized.
    const seen = new Set<string>();
    for (const raw of tags ?? []) {
      const tag = raw.trim().toLowerCase();
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      await ctx.db.insert("libraryFileTags", { fileId, tag });
    }

    await bumpSubjectCount(ctx, args.subjectId, 1);

    return fileId;
  },
});

/**
 * Paginated list of files, optionally filtered by subject. Each entry is
 * enriched with its tags and derived rating average.
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    subjectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { paginationOpts, subjectId }) => {
    const result = subjectId
      ? await ctx.db
          .query("libraryFiles")
          .withIndex("by_subject", (q) => q.eq("subjectId", subjectId))
          .order("desc")
          .paginate(paginationOpts)
      : await ctx.db.query("libraryFiles").order("desc").paginate(paginationOpts);

    const page = await Promise.all(
      result.page.map(async (file) =>
        withRatingAvg(file, await tagsForFile(ctx, file._id)),
      ),
    );

    return { ...result, page };
  },
});

/**
 * List files carrying a given tag. Bounded to 100 matches — for a tag with
 * more than that, the UI shows the first 100 (acceptable for v1; a paginated
 * variant can be added later).
 */
export const listByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, { tag }) => {
    const normalized = tag.trim().toLowerCase();
    const tagRows = await ctx.db
      .query("libraryFileTags")
      .withIndex("by_tag", (q) => q.eq("tag", normalized))
      .take(100); // CAP: at most 100 files per tag surfaced in v1.

    const files = await Promise.all(
      tagRows.map(async (row) => {
        const file = await ctx.db.get(row.fileId);
        if (!file) return null;
        return withRatingAvg(file, await tagsForFile(ctx, file._id));
      }),
    );

    return files.filter((f): f is NonNullable<typeof f> => f !== null);
  },
});

/** Full detail for a single file: doc + tags + transcription status. */
export const get = query({
  args: { fileId: v.id("libraryFiles") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (!file) return null;
    const tags = await tagsForFile(ctx, fileId);
    const transcription = await ctx.db
      .query("libraryTranscriptions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .first();
    return {
      ...withRatingAvg(file, tags),
      transcription,
    };
  },
});

/** Signed download URL for the stored blob. Null if the file is gone. */
export const getDownloadUrl = query({
  args: { fileId: v.id("libraryFiles") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (!file) return null;
    return await ctx.storage.getUrl(file.storageId);
  },
});

/**
 * Patch editable metadata fields. Does not touch storage, tags, or ratings.
 *
 * The editor sends the full editable set on every save, so a field is *cleared*
 * by sending an empty string (text) or `null` (numbers): we map those to
 * `undefined`, which removes the field via `ctx.db.patch`. A key that is absent
 * entirely is left unchanged.
 */
export const updateMetadata = mutation({
  args: {
    fileId: v.id("libraryFiles"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    documentType: v.optional(documentTypeValidator),
    language: v.optional(v.string()),
    year: v.optional(v.union(v.number(), v.null())),
    authorName: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    pageCount: v.optional(v.union(v.number(), v.null())),
    customFields: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, { fileId, ...patch }) => {
    const file = await ctx.db.get(fileId);
    if (!file) throw new Error("File not found");

    const updates: Record<string, unknown> = {};
    const setText = (key: string, value: string | undefined) => {
      if (value === undefined) return;
      const trimmed = value.trim();
      updates[key] = trimmed === "" ? undefined : trimmed;
    };
    const setNumber = (key: string, value: number | null | undefined) => {
      if (value === undefined) return;
      updates[key] = value === null || !Number.isFinite(value) ? undefined : value;
    };

    // Title is required — never cleared; falls back to the original filename.
    if (patch.title !== undefined) {
      updates.title = patch.title.trim() || file.originalName;
    }
    if (patch.documentType !== undefined) {
      updates.documentType = patch.documentType;
    }
    setText("description", patch.description);
    setText("language", patch.language);
    setText("authorName", patch.authorName);
    setText("sourceUrl", patch.sourceUrl);
    setNumber("year", patch.year);
    setNumber("pageCount", patch.pageCount);
    if (patch.customFields !== undefined) {
      updates.customFields = Object.keys(patch.customFields).length
        ? patch.customFields
        : undefined;
    }

    await ctx.db.patch(fileId, updates);
    return { ok: true };
  },
});

/**
 * Delete a file: removes the stored blob, the file doc, and cascades to its
 * comments, ratings, tags, and transcription row.
 */
export const remove = mutation({
  args: { fileId: v.id("libraryFiles") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (!file) return { ok: true };

    // Delete the permanent blob from Convex Storage.
    await ctx.storage.delete(file.storageId);

    // Cascade child rows in batches until each relation is fully drained, so
    // files with >500 comments/ratings/tags don't leave orphaned rows.
    await deleteAllByFile(ctx, "libraryComments", fileId);
    await deleteAllByFile(ctx, "libraryRatings", fileId);
    await deleteAllByFile(ctx, "libraryFileTags", fileId);
    await deleteAllByFile(ctx, "libraryTranscriptions", fileId);

    await bumpSubjectCount(ctx, file.subjectId, -1);

    await ctx.db.delete(fileId);
    return { ok: true };
  },
});

/** Delete every row of a `by_file`-indexed child table for a file, in batches. */
async function deleteAllByFile(
  ctx: MutationCtx,
  table:
    | "libraryComments"
    | "libraryRatings"
    | "libraryFileTags"
    | "libraryTranscriptions",
  fileId: Id<"libraryFiles">,
) {
  // Bounded per-batch; loops until the relation is empty. (For pathological
  // counts this could approach mutation limits — acceptable for v1; a scheduled
  // continuation would be the next step.)
  for (;;) {
    const batch = await ctx.db
      .query(table)
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .take(200);
    if (batch.length === 0) break;
    for (const row of batch) await ctx.db.delete(row._id);
    if (batch.length < 200) break;
  }
}
