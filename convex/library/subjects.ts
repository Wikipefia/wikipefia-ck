import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";

/**
 * Subjects available to categorize library files. The library does NOT manage
 * subjects — it only references existing `projects` rows of `type === "subject"`.
 */

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Bounded read: take(200) — there are far fewer subjects than that, but we
    // cap to stay within the "bounded collection" guideline.
    return await ctx.db
      .query("projects")
      .withIndex("by_type", (q) => q.eq("type", "subject"))
      .take(200);
  },
});

/**
 * Subjects with their denormalized file count — powers the home "shelf" of
 * subject cards. Includes subjects with zero files so they can still be opened
 * and uploaded into.
 */
export const listWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const subjects = await ctx.db
      .query("projects")
      .withIndex("by_type", (q) => q.eq("type", "subject"))
      .take(200);
    return await Promise.all(
      subjects.map(async (s) => {
        const stats = await ctx.db
          .query("librarySubjectStats")
          .withIndex("by_subject", (q) => q.eq("subjectId", s._id))
          .first();
        return {
          _id: s._id,
          slug: s.slug,
          name: s.name,
          description: s.description,
          fileCount: stats?.fileCount ?? 0,
        };
      }),
    );
  },
});

/** A single subject by id — for the subject detail page header. */
export const get = query({
  args: { subjectId: v.id("projects") },
  handler: async (ctx, { subjectId }) => {
    const subject = await ctx.db.get(subjectId);
    if (!subject || subject.type !== "subject") return null;
    return subject;
  },
});

/** Internal: resolve a subject by id (used by the ingest action for its slug). */
export const getByIdInternal = internalQuery({
  args: { subjectId: v.id("projects") },
  handler: async (ctx, { subjectId }) => {
    return await ctx.db.get(subjectId);
  },
});
