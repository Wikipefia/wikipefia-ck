import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

/**
 * Tag management for library files. Tags live in the `libraryFileTags` join
 * table (the source of truth) — see schema for why we avoid an array field.
 * Tags are normalized (trimmed + lowercased) on write.
 */

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/** Add a tag to a file (no-op if it already has that tag). */
export const addTag = mutation({
  args: { fileId: v.id("libraryFiles"), tag: v.string() },
  handler: async (ctx, { fileId, tag }) => {
    const normalized = normalizeTag(tag);
    if (!normalized) throw new Error("Tag is empty");

    const file = await ctx.db.get(fileId);
    if (!file) throw new Error("File not found");

    // Exact (file, tag) lookup — correct regardless of how many tags the file
    // has (the old `take(100)` scan could miss matches past the first page).
    const existing = await ctx.db
      .query("libraryFileTags")
      .withIndex("by_file_and_tag", (q) =>
        q.eq("fileId", fileId).eq("tag", normalized),
      )
      .first();
    if (existing) return { ok: true }; // already tagged

    await ctx.db.insert("libraryFileTags", { fileId, tag: normalized });
    return { ok: true };
  },
});

/** Remove a tag from a file. Deletes every matching row (handles stray dupes). */
export const removeTag = mutation({
  args: { fileId: v.id("libraryFiles"), tag: v.string() },
  handler: async (ctx, { fileId, tag }) => {
    const normalized = normalizeTag(tag);
    const rows = await ctx.db
      .query("libraryFileTags")
      .withIndex("by_file_and_tag", (q) =>
        q.eq("fileId", fileId).eq("tag", normalized),
      )
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return { ok: true };
  },
});

/**
 * Distinct list of all tags in use, sorted. Bounded scan of the join table.
 * CAP: reads at most 500 tag rows — for v1 the tag vocabulary is small. If the
 * library grows large this should move to a denormalized tag-count table.
 */
export const listAllTags = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("libraryFileTags").take(500);
    const distinct = Array.from(new Set(rows.map((r) => r.tag)));
    distinct.sort();
    return distinct;
  },
});
