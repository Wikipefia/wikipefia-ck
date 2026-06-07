import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";

/**
 * GROUNDWORK for the FUTURE transcription service. No real transcription
 * happens in v1 — these functions only manage the status lifecycle and a
 * `libraryTranscriptions` row so the real service can be added later without
 * any schema migration churn.
 *
 * Lifecycle: none → pending → processing → completed | failed
 *
 * The future service will:
 *   - pick up `pending` transcriptions (e.g. via the `by_transcription_status`
 *     index on `libraryFiles`),
 *   - produce a markdown file, store it in Convex Storage,
 *   - call `setResult` (internal) with the `markdownStorageId` + final status.
 */

const statusValidator = v.union(
  v.literal("none"),
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed"),
);

/** The transcription row for a file (or null if none requested yet). */
export const get = query({
  args: { fileId: v.id("libraryFiles") },
  handler: async (ctx, { fileId }) => {
    return await ctx.db
      .query("libraryTranscriptions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .first();
  },
});

/**
 * Request a transcription: upsert the row to `pending` and flip the file's
 * `transcriptionStatus` to `pending`. (No work is performed yet — a future
 * service will observe this and do the real transcription.)
 */
export const requestTranscription = mutation({
  args: { fileId: v.id("libraryFiles") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (!file) throw new Error("File not found");

    const now = Date.now();
    const existing = await ctx.db
      .query("libraryTranscriptions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "pending",
        error: undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("libraryTranscriptions", {
        fileId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(fileId, { transcriptionStatus: "pending" });
    return { ok: true };
  },
});

/**
 * Internal: called by the FUTURE transcription service to record a result.
 * Stores the markdown blob's storage id + final status, and mirrors the status
 * onto the file row. Not used anywhere in v1.
 */
export const setResult = internalMutation({
  args: {
    fileId: v.id("libraryFiles"),
    status: statusValidator,
    markdownStorageId: v.optional(v.id("_storage")),
    model: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { fileId, status, markdownStorageId, model, error }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("libraryTranscriptions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status,
        markdownStorageId,
        model,
        error,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("libraryTranscriptions", {
        fileId,
        status,
        markdownStorageId,
        model,
        error,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(fileId, { transcriptionStatus: status });
    return { ok: true };
  },
});
